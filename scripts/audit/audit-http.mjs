#!/usr/bin/env node
/** ErgoSense — auditoria HTTP com evidências reais */
const BASE = process.env.AUDIT_API_URL || 'http://localhost:13001';

const results = [];

function log(phase, test, status, evidence) {
  results.push({ phase, test, status, evidence: String(evidence).slice(0, 600) });
  const icon = { PASS: '✓', FAIL: '✗', WARN: '!', INFO: '·' }[status] || '?';
  console.log(`[${icon}] ${phase} | ${test}: ${evidence}`);
}

async function api(method, path, body, headers = {}) {
  const opts = { method, headers: { ...headers } };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts).catch((e) => ({
    ok: false,
    status: 0,
    statusText: e.message,
    headers: new Map(),
    json: async () => ({}),
    text: async () => e.message,
  }));
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { code: res.status, text, json, headers: res.headers };
}

const H_ERGO = {
  'X-ErgoSense-Email': 'lucas@vale.com.br',
  'X-ErgoSense-Role': 'ERGONOMISTA',
  'X-ErgoSense-Tenant': 'vale',
  'X-ErgoSense-Name': 'Lucas',
};
const H_FAKE_GLOBAL = {
  'X-ErgoSense-Email': 'attacker@evil.com',
  'X-ErgoSense-Role': 'ADMIN_GLOBAL',
  'X-ErgoSense-Tenant': 'ergosense',
  'X-ErgoSense-Name': 'Attacker',
};

console.log(`=== ERGOSENSE HTTP AUDIT — ${BASE} ===\n`);

// FASE 2 AUTH
let r = await api('POST', '/api/auth/login', { email: 'lucas@vale.com.br', password: 'ergo1234' });
log('AUTH', 'Login válido', r.code === 200 && r.json?.user?.tenantId ? 'PASS' : 'FAIL', `HTTP ${r.code} tenant=${r.json?.user?.tenantId}`);

r = await api('POST', '/api/auth/login', { email: 'lucas@vale.com.br', password: 'wrong' });
log('AUTH', 'Login inválido', r.code === 401 ? 'PASS' : 'FAIL', `HTTP ${r.code}`);

r = await api('POST', '/api/auth/login', { email: "' OR 1=1--", password: 'x' });
log('AUTH', 'SQLi no login', r.code === 401 ? 'PASS' : 'FAIL', `HTTP ${r.code}`);

r = await api('GET', '/api/collaborators?tenantId=vale');
log('AUTH', 'Sem headers → 401', r.code === 401 ? 'PASS' : 'FAIL', `HTTP ${r.code}`);

r = await api('GET', '/api/collaborators?tenantId=vale', null, {
  'X-ErgoSense-Email': 'spoof@attacker.com',
  'X-ErgoSense-Role': 'ERGONOMISTA',
  'X-ErgoSense-Tenant': 'vale',
});
log('AUTH', 'Spoof headers sem login', r.code === 200 ? 'FAIL' : 'PASS', `HTTP ${r.code} — auth é só header, sem JWT/sessão servidor`);

// Sem JWT/refresh
log('AUTH', 'JWT/Refresh token', 'FAIL', 'Não implementado — login retorna user JSON, cliente envia headers');

// FASE 3 AUTHZ
r = await api('GET', '/api/admin/support/active', null, H_ERGO);
log('AUTHZ', 'ERGONOMISTA → admin/support', r.code === 403 ? 'PASS' : 'FAIL', `HTTP ${r.code}`);

r = await api('GET', '/api/collaborators?tenantId=vale', null, H_FAKE_GLOBAL);
log('AUTHZ', 'ADMIN_GLOBAL sem suporte cross-tenant', r.code === 403 ? 'PASS' : 'FAIL', `HTTP ${r.code}`);

// FASE 4 MULTI-TENANT
r = await api('GET', '/api/collaborators?tenantId=vale', null, H_ERGO);
const valeCount = Array.isArray(r.json) ? r.json.length : -1;
r = await api('GET', '/api/collaborators?tenantId=acme', null, H_ERGO);
const acmeCount = Array.isArray(r.json) ? r.json.length : -1;
log(
  'MULTI-TENANT',
  'tenantId query ≠ header tenant',
  r.code === 200 && valeCount >= 0 ? 'FAIL' : 'PASS',
  `ERGONOMISTA vale pode pedir tenantId=acme HTTP ${r.code} (vale:${valeCount} acme:${acmeCount}) — sem bind header↔query`,
);

// IDOR update collaborator
r = await api('GET', '/api/collaborators?tenantId=vale', null, H_ERGO);
const firstId = r.json?.[0]?.id;
if (firstId) {
  r = await api('PUT', `/api/collaborators/${firstId}`, { tenantId: 'outro_tenant_fake', nome: 'Hacked', matricula: 'X' }, H_ERGO);
  log('MULTI-TENANT', 'PUT colaborador tenant errado', r.code === 404 || r.json?.matricula !== 'X' ? 'PASS' : 'FAIL', `HTTP ${r.code}`);
}

// FASE 8 SECURITY — públicos
r = await api('GET', '/api/tenants');
const tenantCount = Array.isArray(r.json) ? r.json.length : 0;
log('SECURITY', 'GET /api/tenants sem auth', r.code === 200 ? 'FAIL' : 'PASS', `HTTP ${r.code} expõe ${tenantCount} tenants`);

const auditEmail = `audit-${Date.now()}@test.local`;
r = await api('POST', '/api/tenants', {
  nome: 'Audit Corp',
  industria: 'Test',
  adminNome: 'Audit',
  adminEmail: auditEmail,
  adminPassword: 'test1234',
});
log('SECURITY', 'POST /api/tenants sem auth', r.code === 201 ? 'FAIL' : 'PASS', `HTTP ${r.code} — registro empresa aberto`);

r = await api('GET', '/api/support/status?tenantId=vale');
log('SECURITY', 'Support status público', r.code === 200 ? 'WARN' : 'PASS', `HTTP ${r.code} expõe suporte_autorizado`);

r = await api('GET', '/metrics');
log('SECURITY', '/metrics', r.code === 200 ? 'WARN' : 'PASS', `HTTP ${r.code} ${r.text.slice(0, 80)}`);

// Headers
r = await api('GET', '/api/health');
const h = r.headers;
const hdrOk = h.get('x-content-type-options') === 'nosniff' && h.get('x-frame-options') === 'DENY';
log('SECURITY', 'Security headers', hdrOk ? 'PASS' : 'WARN', `nosniff=${h.get('x-content-type-options')} frame=${h.get('x-frame-options')}`);

// SQLi query param
r = await api('GET', "/api/sectors?tenantId=vale';DROP TABLE tenants;--", null, H_ERGO);
log('SECURITY', 'SQLi tenantId', r.code !== 500 ? 'PASS' : 'FAIL', `HTTP ${r.code}`);

// XSS stored attempt via sector name
r = await api('POST', '/api/sectors', { tenantId: 'vale', nome: '<script>alert(1)</script>' }, H_ERGO);
log('SECURITY', 'XSS payload setor', r.code === 201 ? 'WARN' : 'INFO', `HTTP ${r.code} — sanitização no front, não no servidor`);

// Rate limit (non-health path)
let rl429 = 0;
for (let i = 0; i < 130; i++) {
  const rr = await api('GET', '/api/tenants');
  if (rr.code === 429) rl429++;
}
log('SECURITY', 'Rate limit /api/tenants', rl429 > 0 ? 'PASS' : 'WARN', `${rl429} respostas 429 em 130 reqs`);

// FASE 5 CRUD negativo
r = await api('POST', '/api/collaborators', { tenantId: 'vale', nome: '', matricula: '' }, H_ERGO);
log('CRUD', 'Create colab vazio', r.code === 400 ? 'PASS' : 'FAIL', `HTTP ${r.code}`);

r = await api('POST', '/api/analyses', { tenantId: 'vale', collaboratorId: 0 }, H_ERGO);
log('CRUD', 'Create análise inválida', r.code >= 400 ? 'PASS' : 'FAIL', `HTTP ${r.code}`);

r = await api('DELETE', '/api/analyses/999999?tenantId=vale', null, H_ERGO);
log('CRUD', 'Delete análise inexistente', r.code === 404 ? 'PASS' : 'WARN', `HTTP ${r.code}`);

// FASE 12 — métodos HTTP
r = await api('PATCH', '/api/collaborators/1', { nome: 'x' }, H_ERGO);
log('API', 'PATCH não suportado', r.code === 404 ? 'PASS' : 'WARN', `HTTP ${r.code}`);

// FASE 14 DR
r = await api('GET', '/health/live');
log('DR', 'Liveness', r.code === 200 ? 'PASS' : 'FAIL', `HTTP ${r.code}`);
r = await api('GET', '/health/ready');
log('DR', 'Readiness', r.code === 200 ? 'PASS' : 'FAIL', `HTTP ${r.code} ${r.text.slice(0, 100)}`);

// Summary
const summary = results.reduce((a, x) => {
  a[x.status] = (a[x.status] || 0) + 1;
  return a;
}, {});
console.log('\n=== SUMMARY ===', summary);

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'audit-http-results.json'), JSON.stringify({ base: BASE, at: new Date().toISOString(), results, summary }, null, 2));
