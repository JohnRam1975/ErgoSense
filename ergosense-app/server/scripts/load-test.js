/**
 * Teste de carga — 100 / 500 / 1000 requisições concorrentes
 * Uso: node scripts/load-test.js
 */
import 'dotenv/config';

const BASE = process.env.AUDIT_API_URL || 'http://localhost:3001';
const TENANT = process.env.AUDIT_TENANT || 'vale';
const EMAIL = process.env.AUDIT_EMAIL || 'lucas@vale.com.br';
const PASS = process.env.AUDIT_PASS || 'ergo1234';
const ADMIN_EMAIL = process.env.E2E_GLOBAL_EMAIL || 'admin@ergosense.com.br';
const ADMIN_PASS = process.env.E2E_GLOBAL_PASSWORD || 'admin1234';

const LEVELS = [100, 500, 1000];

async function login() {
  for (const [email, password] of [[EMAIL, PASS], [ADMIN_EMAIL, ADMIN_PASS]]) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.status === 429) continue;
    if (!res.ok) continue;
    const body = await res.json();
    return body.accessToken ?? body.data?.accessToken;
  }
  throw new Error('Login falhou (rate limit ou credenciais)');
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

async function runLevel(n, path, token) {
  const start = Date.now();
  const results = await Promise.all(Array.from({ length: n }, () => oneRequest(path, token)));
  const totalMs = Date.now() - start;
  const ok = results.filter((r) => r.ok).length;
  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / n);
  const p95 = latencies[Math.floor(n * 0.95)] ?? latencies.at(-1);
  const max = latencies.at(-1) ?? 0;
  const errors = results.filter((r) => !r.ok).slice(0, 5);
  return { n, ok, fail: n - ok, totalMs, avg, p95, max, throughput: Math.round((n / totalMs) * 1000), errors };
}

async function main() {
  console.log('\n=== LOAD TEST ErgoSensePro ===\n');
  const token = await login();
  console.log('Login OK\n');

  const summary = [];

  for (const n of LEVELS) {
    console.log(`--- ${n} requisições simultâneas → GET /api/health ---`);
    const health = await runLevel(n, '/api/health', null);
    console.log(JSON.stringify(health, null, 2));
    summary.push({ target: 'health', ...health });

    await new Promise((r) => setTimeout(r, 2000));

    console.log(`--- ${n} requisições simultâneas → GET /api/psico/dashboard ---`);
    const dash = await runLevel(n, `/api/psico/dashboard?tenantId=${TENANT}`, token);
    console.log(JSON.stringify(dash, null, 2));
    summary.push({ target: 'psico-dashboard', ...dash });

    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log('\n=== STRESS (ramp até falha) ===\n');
  let stressN = 200;
  let brokeAt = null;
  while (stressN <= 3000) {
    const r = await runLevel(stressN, '/api/health', null);
    console.log(`stress n=${stressN}: ok=${r.ok}/${stressN} avg=${r.avg}ms`);
    if (r.ok < stressN * 0.9) {
      brokeAt = { n: stressN, ...r };
      break;
    }
    stressN += 200;
    await new Promise((res) => setTimeout(res, 2000));
  }

  console.log('\n=== RESUMO ===');
  console.log(JSON.stringify({ summary, brokeAt }, null, 2));
  process.exit(brokeAt && brokeAt.ok < brokeAt.n * 0.5 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
