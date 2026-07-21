/**
 * Smoke de endpoints por tag — auth, status HTTP, ausência de 500
 * Uso: node scripts/endpoint-smoke.js [--tag=Psicossocial]
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { materializePath, scanAllRoutes } from './lib/routeScanner.js';
import { getRouteContract } from './lib/routeContracts.js';

const BASE = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
const TENANT = process.env.AUDIT_TENANT ?? 'vale';
const EMAIL = process.env.AUDIT_EMAIL ?? 'lucas@vale.com.br';
const PASS = process.env.AUDIT_PASS ?? 'ergo1234';
const GLOBAL_EMAIL = process.env.E2E_GLOBAL_EMAIL ?? 'ergosense@dejohn.com.br';
const GLOBAL_PASS = process.env.E2E_GLOBAL_PASSWORD ?? '@Ergo!2026/Adm';

const tagFilter = process.argv.find((a) => a.startsWith('--tag='))?.split('=')[1];

const results = { passed: [], failed: [], skipped: [], byTag: {} };

function record(tag, name, ok, detail = '') {
  const entry = { tag, name, detail };
  results.byTag[tag] ??= { passed: 0, failed: 0, skipped: 0 };
  if (ok === 'skip') {
    results.skipped.push(entry);
    results.byTag[tag].skipped++;
  } else if (ok) {
    results.passed.push(entry);
    results.byTag[tag].passed++;
  } else {
    results.failed.push(entry);
    results.byTag[tag].failed++;
  }
}

async function login(email, password, retries = 5) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
      continue;
    }
    if (!res.ok) return null;
    return body.accessToken ?? body.data?.accessToken;
  }
  return null;
}

async function request(method, path, { token, body } = {}) {
  const url = path.includes('?') ? `${BASE}${path}` : `${BASE}${path}${method === 'GET' ? `?tenantId=${TENANT}` : ''}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const start = Date.now();
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, ms: Date.now() - start, json };
  } catch (err) {
    return { status: 0, ms: Date.now() - start, error: err.message };
  }
}

async function main() {
  console.log(`\n=== ENDPOINT SMOKE → ${BASE} ===\n`);

  try {
    await fetch(`${BASE}/api/health`);
  } catch {
    console.error('API indisponível. Inicie o servidor.');
    process.exit(2);
  }

  const token = await login(EMAIL, PASS);
  const adminToken = await login(GLOBAL_EMAIL, GLOBAL_PASS);
  const activeToken = token ?? adminToken;
  if (!activeToken) {
    console.error('Login falhou (ergonomista e admin). Aguarde rate limit ou verifique credenciais.');
    process.exit(2);
  }
  if (!token) console.warn('⚠ Usando token admin global — login ergonomista indisponível');

  let routes = scanAllRoutes();
  if (tagFilter) routes = routes.filter((r) => r.tag === tagFilter);

  for (const route of routes) {
    const name = `${route.method} ${route.path}`;
    const pathReady = materializePath(route.path, TENANT);

    if (route.auth === 'public') {
      if (route.method === 'GET') {
        const r = await request('GET', pathReady);
        const ok = r.status > 0 && r.status < 500;
        record(route.tag, `${name} [public GET]`, ok, `HTTP ${r.status}`);
      } else if (route.method === 'POST') {
        const r = await request('POST', pathReady, { body: {} });
        const ok = r.status >= 400 && r.status < 500;
        record(route.tag, `${name} [public POST empty→4xx]`, ok, `HTTP ${r.status}`);
      } else {
        record(route.tag, name, 'skip', 'método público não smokeado');
      }
      continue;
    }

    // Protegido — sem auth → 401
    const noAuth = await request(route.method, pathReady);
    const authOk = noAuth.status === 401;
    record(route.tag, `${name} [sem auth→401]`, authOk, `HTTP ${noAuth.status}`);

    const useToken = route.adminGlobal ? (adminToken ?? activeToken) : (token ?? activeToken);
    if (!useToken) {
      record(route.tag, `${name} [autenticado]`, 'skip', 'token admin ausente');
      continue;
    }

    if (route.method === 'GET') {
      const r = await request('GET', pathReady, { token: useToken });
      const ok = r.status > 0 && r.status < 500;
      record(route.tag, `${name} [auth GET <500]`, ok, `HTTP ${r.status} ${r.ms}ms`);
    } else if (route.method === 'POST') {
      const contract = getRouteContract(route);
      const r = await request('POST', pathReady, { token: useToken, body: {} });
      // Ações sem body (advance, gerar, scan…) podem retornar 2xx/4xx; creates validados devem ser 4xx.
      const ok = contract.bodyOptional
        ? r.status > 0 && r.status < 500
        : r.status >= 400 && r.status < 500;
      record(
        route.tag,
        `${name} [auth POST empty→${contract.bodyOptional ? '<500' : '4xx'}]`,
        ok,
        `HTTP ${r.status}`,
      );
    } else if (route.method === 'DELETE') {
      const r = await request('DELETE', pathReady, { token: useToken });
      const ok = r.status > 0 && r.status < 500;
      record(route.tag, `${name} [auth DELETE <500]`, ok, `HTTP ${r.status}`);
    } else {
      record(route.tag, name, 'skip', `${route.method} não smokeado`);
    }
  }

  const total = results.passed.length + results.failed.length + results.skipped.length;
  const coverage = total ? Math.round((results.passed.length / total) * 100) : 0;

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    totals: {
      endpoints: routes.length,
      passed: results.passed.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      smokeCoveragePct: coverage,
    },
    byTag: results.byTag,
    failures: results.failed.slice(0, 100),
  };

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.join(__dirname, '../../../docs/audit/endpoints');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'endpoint-smoke-results.json'), JSON.stringify(report, null, 2));

  console.log(`\nPassou: ${results.passed.length} | Falhou: ${results.failed.length} | Skip: ${results.skipped.length}`);
  console.log(`Cobertura smoke: ${coverage}%`);
  if (results.failed.length) {
    console.log('\nFalhas (primeiras 10):');
    for (const f of results.failed.slice(0, 10)) console.log(`  ✗ [${f.tag}] ${f.name} — ${f.detail}`);
  }

  process.exit(results.failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
