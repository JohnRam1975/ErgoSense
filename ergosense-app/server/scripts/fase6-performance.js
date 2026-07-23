/**
 * Fase 6 — Desempenho: limites com usuários concorrentes + recursos.
 * Uso: node scripts/fase6-performance.js
 *
 * Níveis: 10 / 50 / 100 / 250 / 500 VUs
 * Cada VU mantém sessão (health + dashboard autenticado) durante HOLD_MS.
 * Amostra CPU/RAM (docker stats), conexões Postgres e heap do Node.
 */
import 'dotenv/config';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Agent, setGlobalDispatcher } from 'undici';

// Pool HTTP do harness: default do Undici (~10) não sustenta 500 VUs no mesmo origin.
setGlobalDispatcher(
  new Agent({
    connections: 600,
    pipelining: 1,
    connectTimeout: 30_000,
    bodyTimeout: 60_000,
    headersTimeout: 60_000,
    keepAliveTimeout: 30_000,
  }),
);

const BASE = process.env.AUDIT_API_URL || process.env.API_URL || 'http://127.0.0.1:8090';
const TENANT = process.env.AUDIT_TENANT || 'acme';
const EMAIL = process.env.AUDIT_EMAIL || 'auditor@ergosense.test';
const PASS = process.env.AUDIT_PASS || 'AuditTest!2026';
const ADMIN_EMAIL = process.env.E2E_GLOBAL_EMAIL || 'ergosense@dejohn.com.br';
const ADMIN_PASS = process.env.E2E_GLOBAL_PASSWORD || '@Ergo!2026/Adm';

const LEVELS = (process.env.FASE6_LEVELS || '10,50,100,250,500')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);
const HOLD_MS = Number(process.env.FASE6_HOLD_MS || 20000);
const THINK_MS = Number(process.env.FASE6_THINK_MS || 50);
const SAMPLE_EVERY_MS = 2500;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../../../docs/audit/fase6');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runCmd(commandLine) {
  const r = spawnSync(commandLine, {
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    ok: r.status === 0,
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
  };
}

function parseMemToMiB(s) {
  // "119.3MiB" | "1.2GiB" | "512KiB"
  const m = String(s).match(/([\d.]+)\s*([KMGT]i?B)/i);
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2].toUpperCase();
  if (u.startsWith('G')) return n * 1024;
  if (u.startsWith('K')) return n / 1024;
  return n;
}

function sampleDockerStats() {
  const r = runCmd('docker stats --no-stream --format "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}"');
  if (!r.ok) return { error: r.stderr || 'docker stats failed', containers: [] };
  const containers = [];
  for (const line of r.stdout.split(/\r?\n/).filter(Boolean)) {
    const [name, cpu, memUsage, memPerc] = line.split('|');
    const memPart = (memUsage || '').split('/')[0]?.trim() || '';
    containers.push({
      name,
      cpuPct: Number(String(cpu).replace('%', '')) || 0,
      memMiB: parseMemToMiB(memPart),
      memPct: Number(String(memPerc).replace('%', '')) || 0,
      memUsageRaw: memUsage,
    });
  }
  return { at: new Date().toISOString(), containers };
}

function sampleDb() {
  const q = (sql) => {
    const r = runCmd(`docker exec ergosense-db psql -U postgres -d ergosense -t -A -c "${sql}"`);
    if (!r.ok) return null;
    return Number(r.stdout.split(/\r?\n/)[0]);
  };
  return {
    at: new Date().toISOString(),
    connections: q("SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database()"),
    active: q("SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database() AND state = 'active'"),
    waiting: q("SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type IS NOT NULL"),
    dbBytes: q('SELECT pg_database_size(current_database())'),
  };
}

function sampleHeapViaContainer() {
  const r = runCmd('docker exec ergosense-backend node -p "JSON.stringify(process.memoryUsage())"');
  if (!r.ok) return { error: r.stderr || r.stdout || 'heap sample failed' };
  try {
    const m = JSON.parse(r.stdout);
    return {
      at: new Date().toISOString(),
      rssMiB: Math.round(m.rss / 1024 / 1024),
      heapUsedMiB: Math.round(m.heapUsed / 1024 / 1024),
      heapTotalMiB: Math.round(m.heapTotal / 1024 / 1024),
    };
  } catch {
    return { error: 'heap parse failed', raw: r.stdout };
  }
}

async function login() {
  for (const [email, password] of [
    [EMAIL, PASS],
    [ADMIN_EMAIL, ADMIN_PASS],
  ]) {
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 429) {
        await sleep(2000 * (i + 1));
        continue;
      }
      if (!res.ok) break;
      const body = await res.json();
      const token = body.accessToken ?? body.data?.accessToken;
      if (token) return token;
    }
  }
  throw new Error('Login falhou');
}

async function oneRequest(path, token) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return { ok: res.ok, status: res.status, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - start, error: err.message };
  }
}

/** Um usuário virtual: loop de sessão até deadline */
async function virtualUser(token, deadline, paths) {
  const results = [];
  while (Date.now() < deadline) {
    for (const p of paths) {
      if (Date.now() >= deadline) break;
      results.push(await oneRequest(p, p.includes('/api/health') ? null : token));
      if (THINK_MS > 0) await sleep(THINK_MS);
    }
  }
  return results;
}

function summarizeLatencies(results) {
  const n = results.length;
  if (!n) {
    return { n: 0, ok: 0, fail: 0, avg: 0, p50: 0, p95: 0, p99: 0, max: 0, rps: 0, byStatus: {} };
  }
  const ok = results.filter((r) => r.ok).length;
  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const byStatus = {};
  for (const r of results) {
    const k = String(r.status);
    byStatus[k] = (byStatus[k] || 0) + 1;
  }
  const pct = (p) => latencies[Math.min(latencies.length - 1, Math.floor(n * p))] ?? 0;
  return {
    n,
    ok,
    fail: n - ok,
    okPct: Math.round((ok / n) * 1000) / 10,
    avg: Math.round(latencies.reduce((a, b) => a + b, 0) / n),
    p50: pct(0.5),
    p95: pct(0.95),
    p99: pct(0.99),
    max: latencies.at(-1) ?? 0,
    byStatus,
    errors: results.filter((r) => !r.ok).slice(0, 5),
  };
}

function pickContainer(stats, name) {
  return stats.containers?.find((c) => c.name === name) || null;
}

function maxOf(samples, pick) {
  let m = null;
  for (const s of samples) {
    const v = pick(s);
    if (v == null || Number.isNaN(v)) continue;
    if (m == null || v > m) m = v;
  }
  return m;
}

async function runLevel(vus, token, baselineHeap) {
  console.log(`\n=== ${vus} usuários · hold ${HOLD_MS}ms ===`);
  const paths = ['/api/health', `/api/psico/dashboard?tenantId=${TENANT}`];
  const samples = [];
  const sampling = { stop: false };

  const sampler = (async () => {
    while (!sampling.stop) {
      const docker = sampleDockerStats();
      const db = sampleDb();
      const heap = sampleHeapViaContainer();
      samples.push({
        at: new Date().toISOString(),
        docker,
        db,
        heap,
        backend: pickContainer(docker, 'ergosense-backend'),
        postgres: pickContainer(docker, 'ergosense-db'),
        redis: pickContainer(docker, 'ergosense-cache'),
      });
      await sleep(SAMPLE_EVERY_MS);
    }
  })();

  const deadline = Date.now() + HOLD_MS;
  const wallStart = Date.now();
  const userResults = await Promise.all(
    Array.from({ length: vus }, () => virtualUser(token, deadline, paths)),
  );
  const wallMs = Date.now() - wallStart;
  sampling.stop = true;
  await sampler;

  const flat = userResults.flat();
  const stats = summarizeLatencies(flat);
  stats.rps = wallMs > 0 ? Math.round((flat.length / wallMs) * 1000) : 0;
  stats.vus = vus;
  stats.holdMs = HOLD_MS;
  stats.wallMs = wallMs;

  const backendCpuMax = maxOf(samples, (s) => s.backend?.cpuPct);
  const backendMemMax = maxOf(samples, (s) => s.backend?.memMiB);
  const dbCpuMax = maxOf(samples, (s) => s.postgres?.cpuPct);
  const dbMemMax = maxOf(samples, (s) => s.postgres?.memMiB);
  const dbConnMax = maxOf(samples, (s) => s.db?.connections);
  const dbActiveMax = maxOf(samples, (s) => s.db?.active);
  const heapMax = maxOf(samples, (s) => s.heap?.heapUsedMiB);
  const heapEnd = samples.at(-1)?.heap?.heapUsedMiB ?? null;

  const level = {
    vus,
    http: stats,
    resources: {
      backendCpuMaxPct: backendCpuMax,
      backendMemMaxMiB: backendMemMax,
      dbCpuMaxPct: dbCpuMax,
      dbMemMaxMiB: dbMemMax,
      dbConnectionsMax: dbConnMax,
      dbActiveMax: dbActiveMax,
      heapUsedMaxMiB: heapMax,
      heapUsedEndMiB: heapEnd,
      heapDeltaFromBaselineMiB:
        baselineHeap != null && heapEnd != null ? heapEnd - baselineHeap : null,
    },
    samples,
  };

  console.log(
    JSON.stringify(
      {
        vus,
        okPct: stats.okPct,
        rps: stats.rps,
        p95: stats.p95,
        backendCpuMax,
        backendMemMax,
        dbConnMax,
        heapEnd,
      },
      null,
      2,
    ),
  );
  return level;
}

function detectBottlenecks(levels) {
  const findings = [];
  for (const lvl of levels) {
    const { vus, http, resources: r } = lvl;
    if (http.okPct < 95) {
      findings.push({
        sev: 'ALTO',
        vus,
        area: 'Disponibilidade',
        detail: `OK ${http.okPct}% em ${vus} VUs (status: ${JSON.stringify(http.byStatus)})`,
      });
    }
    if (http.p95 > 3000) {
      findings.push({
        sev: 'MÉDIO',
        vus,
        area: 'Latência',
        detail: `p95=${http.p95}ms em ${vus} VUs`,
      });
    }
    if ((r.backendCpuMaxPct ?? 0) > 85) {
      findings.push({
        sev: 'ALTO',
        vus,
        area: 'CPU API',
        detail: `CPU backend pico ${r.backendCpuMaxPct}%`,
      });
    }
    if ((r.dbActiveMax ?? 0) > 40) {
      findings.push({
        sev: 'MÉDIO',
        vus,
        area: 'Banco',
        detail: `Queries active pico ${r.dbActiveMax} (conn=${r.dbConnectionsMax})`,
      });
    }
    if ((r.dbConnectionsMax ?? 0) > 80) {
      findings.push({
        sev: 'ALTO',
        vus,
        area: 'Pool DB',
        detail: `Conexões Postgres pico ${r.dbConnectionsMax}`,
      });
    }
  }

  // Vazamento: heap sobe monotônico e não retorna após cooldown
  const heaps = levels.map((l) => l.resources.heapUsedEndMiB).filter((x) => x != null);
  if (heaps.length >= 3) {
    let mono = true;
    for (let i = 1; i < heaps.length; i++) {
      if (heaps[i] + 2 < heaps[i - 1]) mono = false; // permite pequena variação
    }
    const growth = heaps.at(-1) - heaps[0];
    if (mono && growth >= 30) {
      findings.push({
        sev: 'MÉDIO',
        vus: levels.at(-1).vus,
        area: 'Vazamento?',
        detail: `Heap Node subiu ${growth} MiB de forma monotônica (${heaps[0]} → ${heaps.at(-1)} MiB)`,
      });
    }
  }

  // Gargalo dominante: onde a degradação começa
  const firstBad = levels.find((l) => l.http.okPct < 99 || l.http.p95 > 2000);
  if (firstBad) {
    const r = firstBad.resources;
    let dominant = 'API (latência)';
    if ((r.backendCpuMaxPct ?? 0) >= (r.dbCpuMaxPct ?? 0) && (r.backendCpuMaxPct ?? 0) > 60) {
      dominant = 'CPU do backend';
    } else if ((r.dbActiveMax ?? 0) > 20 || (r.dbCpuMaxPct ?? 0) > 50) {
      dominant = 'Postgres';
    } else if (firstBad.http.byStatus?.['504'] || firstBad.http.byStatus?.['0']) {
      dominant = 'Proxy/conexões (504/reset)';
    }
    findings.push({
      sev: 'INFO',
      vus: firstBad.vus,
      area: 'Gargalo',
      detail: `Degradação relevante a partir de ${firstBad.vus} VUs — dominante: ${dominant}`,
    });
  }

  return findings;
}

async function main() {
  console.log('\n=== FASE 6 — DESEMPENHO ErgoSense ===\n');
  console.log(`BASE=${BASE} HOLD_MS=${HOLD_MS} LEVELS=${LEVELS.join(',')}`);

  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!health?.ok) {
    console.error('API indisponível');
    process.exit(2);
  }

  const token = await login();
  console.log('Login OK');

  const baselineStats = sampleDockerStats();
  const baselineDb = sampleDb();
  const baselineHeap = sampleHeapViaContainer();
  console.log('Baseline', { heap: baselineHeap, db: baselineDb });

  const levels = [];
  for (const vus of LEVELS) {
    const lvl = await runLevel(vus, token, baselineHeap.heapUsedMiB);
    levels.push(lvl);
    // Cooldown + amostra pós-nível (para vazamento)
    await sleep(5000);
    const coolHeap = sampleHeapViaContainer();
    lvl.resources.heapAfterCooldownMiB = coolHeap.heapUsedMiB ?? null;
  }

  // Cooldown final longo para ver se heap retorna
  console.log('\n=== Cooldown 15s (checagem de vazamento) ===');
  await sleep(15000);
  const finalHeap = sampleHeapViaContainer();
  const finalStats = sampleDockerStats();
  const finalDb = sampleDb();

  const findings = detectBottlenecks(levels);
  const limitVu = levels.find((l) => l.http.okPct < 95)?.vus
    ?? levels.find((l) => l.http.p95 > 5000)?.vus
    ?? null;

  const report = {
    generatedAt: new Date().toISOString(),
    target: BASE,
    holdMs: HOLD_MS,
    thinkMs: THINK_MS,
    levels: LEVELS,
    baseline: {
      docker: baselineStats,
      db: baselineDb,
      heap: baselineHeap,
    },
    results: levels.map((l) => ({
      vus: l.vus,
      http: l.http,
      resources: l.resources,
      // keep last 3 samples only in summary file size
      sampleCount: l.samples.length,
    })),
    final: {
      heap: finalHeap,
      docker: finalStats,
      db: finalDb,
    },
    findings,
    limitEstimate: {
      softLimitVus: levels.find((l) => l.http.p95 > 2000 || l.http.okPct < 99)?.vus ?? null,
      hardLimitVus: limitVu,
      note:
        limitVu != null
          ? `Sistema degrada de forma clara a partir de ~${limitVu} usuários concorrentes sustentados`
          : 'Até 500 VUs sustentados sem ruptura (<95% OK) neste ambiente local',
    },
    leakCheck: {
      baselineHeapMiB: baselineHeap.heapUsedMiB ?? null,
      finalHeapMiB: finalHeap.heapUsedMiB ?? null,
      deltaMiB:
        baselineHeap.heapUsedMiB != null && finalHeap.heapUsedMiB != null
          ? finalHeap.heapUsedMiB - baselineHeap.heapUsedMiB
          : null,
      suspected:
        baselineHeap.heapUsedMiB != null
        && finalHeap.heapUsedMiB != null
        && finalHeap.heapUsedMiB - baselineHeap.heapUsedMiB >= 40,
    },
  };

  // Full detail (with samples) separate
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'fase6-performance.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(outDir, 'fase6-performance-raw.json'),
    JSON.stringify({ ...report, results: levels }, null, 2),
  );

  console.log('\n=== RESUMO FASE 6 ===');
  console.log(JSON.stringify({
    limitEstimate: report.limitEstimate,
    leakCheck: report.leakCheck,
    findings,
    perLevel: report.results.map((r) => ({
      vus: r.vus,
      okPct: r.http.okPct,
      rps: r.http.rps,
      p95: r.http.p95,
      cpu: r.resources.backendCpuMaxPct,
      mem: r.resources.backendMemMaxMiB,
      dbConn: r.resources.dbConnectionsMax,
      heap: r.resources.heapUsedEndMiB,
    })),
  }, null, 2));

  const hardFail = levels.some((l) => l.http.okPct < 50);
  process.exit(hardFail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
