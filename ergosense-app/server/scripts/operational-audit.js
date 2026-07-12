/**
 * Auditoria operacional — smoke, segurança, DB, carga leve
 * Uso: node scripts/operational-audit.js
 */
import 'dotenv/config';

const BASE = process.env.AUDIT_API_URL || 'http://localhost:3001';
const TENANT = process.env.AUDIT_TENANT || 'vale';
const EMAIL = process.env.AUDIT_EMAIL || 'lucas@vale.com.br';
const PASS = process.env.AUDIT_PASS || 'ergo1234';

const results = { passed: [], failed: [], warnings: [], metrics: {} };

function pass(name, detail = '') {
  results.passed.push({ name, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.failed.push({ name, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}
function warn(name, detail = '') {
  results.warnings.push({ name, detail });
  console.warn(`⚠ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function req(path, opts = {}) {
  const url = `${BASE}${path}`;
  const start = Date.now();
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(opts.headers || {}),
    },
  });
  const ms = Date.now() - start;
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, ms, body, headers: res.headers };
}

async function login() {
  const { status, body, ms } = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (status !== 200 || !body?.accessToken) {
    fail('Login operacional', `HTTP ${status} (${ms}ms)`);
    return null;
  }
  pass('Login operacional', `${ms}ms`);
  return body.accessToken;
}

async function phaseHealth() {
  const h = await req('/api/health');
  if (h.status === 200 && h.body?.ok) pass('Health API', `${h.ms}ms`);
  else fail('Health API', `HTTP ${h.status}`);
  results.metrics.healthMs = h.ms;
}

async function phaseAuth(token) {
  const noAuth = await req(`/api/collaborators?tenantId=${TENANT}`);
  if (noAuth.status === 401) pass('Proteção JWT — sem token retorna 401');
  else fail('Proteção JWT', `Esperado 401, recebeu ${noAuth.status}`);

  const withAuth = await req(`/api/collaborators?tenantId=${TENANT}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (withAuth.status === 200) pass('GET /api/collaborators autenticado', `${withAuth.ms}ms`);
  else fail('GET /api/collaborators', `HTTP ${withAuth.status}`);

  const wrongTenant = await req('/api/collaborators?tenantId=outro-tenant-fake', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if ([403, 404].includes(wrongTenant.status)) pass('IDOR tenant — bloqueio cross-tenant', `HTTP ${wrongTenant.status}`);
  else warn('IDOR tenant', `HTTP ${wrongTenant.status} — revisar tenantGuard`);
}

async function phaseSecurity(token) {
  const invalidEmail = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'not-valid-email', password: 'x' }),
  });
  if (invalidEmail.status === 400) pass('Login inválido — retorna 400', `HTTP ${invalidEmail.status}`);
  else if (invalidEmail.status === 401) pass('Login inválido — rejeitado', `HTTP ${invalidEmail.status}`);
  else fail('Login inválido', `HTTP ${invalidEmail.status} (esperado 400)`);

  const sqli = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: "admin@test.com'; DROP TABLE usuarios;--", password: 'x' }),
  });
  if ([400, 401].includes(sqli.status)) pass('SQL injection login — rejeitado', `HTTP ${sqli.status}`);
  else fail('SQL injection login', `HTTP ${sqli.status}`);

  const xssPayload = '<script>alert(1)</script>';
  const psico = await req(`/api/psico/campanhas?tenantId=${TENANT}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ type: 'COPSOQ_III', title: xssPayload, anonymous: true, tenantId: TENANT }),
  });
  if ([201, 400].includes(psico.status)) {
    const title = psico.body?.title ?? psico.body?.data?.title ?? '';
    if (title.includes('<script>')) fail('XSS sanitização campanha', 'script não escapado na resposta');
    else pass('XSS sanitização campanha', `HTTP ${psico.status}`);
  } else if (psico.status === 403) warn('XSS campanha', 'sem permissão psico:write neste usuário');
  else fail('POST campanha', `HTTP ${psico.status}`);
}

async function phaseBruteForceLogin() {
  const brute = [];
  for (let i = 0; i < 6; i++) {
    brute.push(req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: 'wrong' }) }));
  }
  const bruteRes = await Promise.all(brute);
  const rateLimited = bruteRes.some((r) => r.status === 429);
  if (rateLimited) pass('Rate limit login — ativo após tentativas');
  else warn('Rate limit login', '429 não observado em 6 tentativas rápidas');
  await new Promise((r) => setTimeout(r, 1500));
}

async function phasePublic() {
  const fake = await req('/api/psico/public/form/invalidtoken123');
  if ([404, 400].includes(fake.status)) pass('Form público — token inválido rejeitado', `HTTP ${fake.status}`);
  else fail('Form público token inválido', `HTTP ${fake.status}`);

  const denuncia = await req('/api/denuncias/public/status?tenantId=fake&protocol=X&accessToken=Y');
  if (denuncia.status === 404 || denuncia.status === 400) pass('Denúncia pública status — lookup seguro');
  else warn('Denúncia pública', `HTTP ${denuncia.status}`);
}

async function phaseModules(token) {
  const endpoints = [
    [`/api/psico/dashboard?tenantId=${TENANT}`, 'Psicossocial dashboard'],
    [`/api/gro/dashboard?tenantId=${TENANT}`, 'GRO dashboard'],
    [`/api/pgr/program?tenantId=${TENANT}`, 'PGR program'],
    [`/api/aet/dashboard?tenantId=${TENANT}`, 'AET dashboard'],
    [`/api/risk-inventory/summary?tenantId=${TENANT}`, 'Inventário summary'],
    [`/api/compliance/dashboard?tenantId=${TENANT}`, 'Compliance dashboard'],
    [`/api/denuncias/dashboard?tenantId=${TENANT}`, 'Denúncia dashboard'],
    [`/api/sst/dashboard?tenantId=${TENANT}`, 'SST dashboard'],
    [`/api/esocial/dashboard?tenantId=${TENANT}`, 'eSocial dashboard'],
    [`/api/org/tree?tenantId=${TENANT}`, 'Org tree'],
  ];
  const latencies = [];
  for (const [path, label] of endpoints) {
    const r = await req(path, { headers: { Authorization: `Bearer ${token}` } });
    latencies.push(r.ms);
    if (r.status === 200) pass(`Módulo ${label}`, `${r.ms}ms`);
    else if (r.status === 403) warn(`Módulo ${label}`, '403 — permissão');
    else fail(`Módulo ${label}`, `HTTP ${r.status}`);
    await new Promise((res) => setTimeout(res, 50));
  }
  results.metrics.avgModuleMs = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  results.metrics.maxModuleMs = Math.max(...latencies);
}

async function phaseLoad(token) {
  const path = `/api/psico/dashboard?tenantId=${TENANT}`;
  const levels = [10, 50];
  for (const n of levels) {
    const start = Date.now();
    const jobs = Array.from({ length: n }, () =>
      req(path, { headers: { Authorization: `Bearer ${token}` } }),
    );
    const res = await Promise.all(jobs);
    const totalMs = Date.now() - start;
    const ok = res.filter((r) => r.status === 200).length;
    const avg = Math.round(res.reduce((a, r) => a + r.ms, 0) / n);
    results.metrics[`load${n}Ok`] = ok;
    results.metrics[`load${n}AvgMs`] = avg;
    results.metrics[`load${n}TotalMs`] = totalMs;
    if (ok >= n * 0.95) pass(`Carga ${n} req simultâneas`, `${ok}/${n} OK, avg ${avg}ms, total ${totalMs}ms`);
    else fail(`Carga ${n} req`, `${ok}/${n} OK`);
  }
}

async function phaseDatabase() {
  try {
    const { pool } = await import('../src/db.js');
    const client = await pool.connect();
    try {
      const orphans = await client.query(`
        SELECT COUNT(*)::int AS n FROM psico_respostas r
        LEFT JOIN psico_campanhas c ON c.id = r.campanha_id
        WHERE r.campanha_id IS NOT NULL AND c.id IS NULL
      `);
      if (orphans.rows[0].n === 0) pass('DB integridade — psico_respostas sem órfãos');
      else fail('DB órfãos psico_respostas', `${orphans.rows[0].n} registros`);

      const dupUsers = await client.query(`
        SELECT email, tenant_id, COUNT(*) FROM usuarios
        WHERE deleted_at IS NULL GROUP BY email, tenant_id HAVING COUNT(*) > 1 LIMIT 5
      `);
      if (dupUsers.rows.length === 0) pass('DB — sem usuários duplicados por tenant');
      else warn('DB usuários duplicados', `${dupUsers.rows.length} grupos`);

      const migrations = await client.query(`SELECT COUNT(*)::int AS n FROM schema_migrations`);
      pass('DB migrations aplicadas', `${migrations.rows[0].n} registros`);

      const idx = await client.query(`
        SELECT COUNT(*)::int AS n FROM pg_indexes
        WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
      `);
      pass('DB índices customizados', `${idx.rows[0].n} índices idx_*`);
    } finally {
      client.release();
      await pool.end();
    }
  } catch (e) {
    fail('DB conexão/análise', e.message);
  }
}

async function main() {
  console.log('\n=== AUDITORIA OPERACIONAL ErgoSensePro ===\n');
  console.log(`API: ${BASE} | Tenant: ${TENANT}\n`);

  await phaseHealth();
  const token = await login();
  if (!token) {
    console.log('\nAbortando fases dependentes de auth (API offline ou credenciais inválidas)\n');
  } else {
    await phaseAuth(token);
    await phaseSecurity(token);
    await phasePublic();
    await phaseModules(token);
    await phaseLoad(token);
    await phaseBruteForceLogin();
  }
  await phasePublic();
  await phaseDatabase();

  const total = results.passed.length + results.failed.length;
  const score = total ? Math.round((results.passed.length / total) * 100) : 0;
  console.log('\n=== RESUMO ===');
  console.log(`Passou: ${results.passed.length} | Falhou: ${results.failed.length} | Avisos: ${results.warnings.length}`);
  console.log(`Score smoke: ${score}/100`);
  console.log(JSON.stringify({ results, metrics: results.metrics }, null, 2));
  process.exit(results.failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
