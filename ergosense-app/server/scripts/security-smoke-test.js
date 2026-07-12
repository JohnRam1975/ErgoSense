/**
 * Smoke test HTTP — valida correções da auditoria PRODUCTION-AUDIT-2026-06-05
 * Uso: node scripts/security-smoke-test.js
 * Requer API em execução (PORT ou 3001) e credenciais de seed.
 */
const BASE = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
const TEST_EMAIL = process.env.TEST_EMAIL ?? 'lucas@vale.com.br';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'ergo1234';
const OTHER_TENANT = process.env.OTHER_TENANT ?? 'gerdau';

const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`  ✅ ${name}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`  ❌ ${name}: ${detail}`);
}

async function fetchJson(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
}

async function main() {
  console.log(`\nErgoSense Security Smoke Test → ${BASE}\n`);

  try {
    await fetchJson('/api/health');
  } catch (err) {
    console.error(`API indisponível em ${BASE}. Inicie o servidor antes.\n`, err.message);
    process.exit(2);
  }

  // 1. Sem auth → 401
  {
    const { res } = await fetchJson('/api/collaborators?tenantId=vale');
    if (res.status === 401) pass('GET /api/collaborators sem auth → 401');
    else fail('GET /api/collaborators sem auth → 401', `status ${res.status}`);
  }

  // 2. Header spoof → 401 (auditoria crítica)
  {
    const { res } = await fetchJson('/api/collaborators?tenantId=vale', {
      headers: {
        'X-ErgoSense-Email': 'lucas@vale.com.br',
        'X-ErgoSense-Role': 'ADMIN_EMPRESA',
        'X-ErgoSense-Tenant': 'vale',
      },
    });
    if (res.status === 401) pass('Spoof X-ErgoSense-* → 401');
    else fail('Spoof X-ErgoSense-* → 401', `status ${res.status}`);
  }

  // 3. GET /api/tenants sem auth → 401
  {
    const { res } = await fetchJson('/api/tenants');
    if (res.status === 401) pass('GET /api/tenants sem auth → 401');
    else fail('GET /api/tenants sem auth → 401', `status ${res.status}`);
  }

  // 3b. POST /api/tenants sem auth → 401 (não é mais público)
  {
    const { res } = await fetchJson('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Test', industria: 'X', adminNome: 'A', adminEmail: 'a@b.com', adminPassword: 'Abcdef12' }),
    });
    if (res.status === 401) pass('POST /api/tenants sem auth → 401');
    else fail('POST /api/tenants sem auth → 401', `status ${res.status}`);
  }

  // 4. Login retorna JWT
  let accessToken = null;
  {
    const { res, body } = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    if (res.status === 200 && body?.accessToken) {
      pass('Login retorna accessToken JWT');
      accessToken = body.accessToken;
    } else {
      fail('Login retorna accessToken JWT', `status ${res.status} body=${JSON.stringify(body)}`);
    }
  }

  if (!accessToken) {
    console.log('\nInterrompido — login falhou.\n');
    process.exit(1);
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // 5. Com JWT → 200 no próprio tenant
  {
    const { res } = await fetchJson('/api/collaborators?tenantId=vale', { headers: authHeaders });
    if (res.status === 200) pass('JWT válido → GET colaboradores 200');
    else fail('JWT válido → GET colaboradores 200', `status ${res.status}`);
  }

  // 6. IDOR cross-tenant → 403
  {
    const { res } = await fetchJson(`/api/collaborators?tenantId=${OTHER_TENANT}`, { headers: authHeaders });
    if (res.status === 403) pass('Cross-tenant IDOR → 403');
    else fail('Cross-tenant IDOR → 403', `status ${res.status}`);
  }

  // 7. SQL injection no login → 401
  {
    const { res } = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "' OR 1=1--", password: 'x' }),
    });
    if (res.status === 401 || res.status === 400) pass('SQL injection login → rejeitado');
    else fail('SQL injection login → rejeitado', `status ${res.status}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} testes OK\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
