/**
 * Matriz de endpoints v2 — baseada em contrato por rota
 * Uso: node scripts/endpoint-matrix.js [--tag=Admin]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { materializePath, scanAllRoutes } from './lib/routeScanner.js';
import { getRouteContract, classifyFailure } from './lib/routeContracts.js';
import {
  BASE,
  TENANT,
  OTHER_TENANT,
  AUDIT_EMAIL,
  AUDIT_PASS,
  GLOBAL_EMAIL,
  GLOBAL_PASS,
  LEGACY_EMAIL,
  LEGACY_PASS,
  login,
  request,
  hasSensitiveLeak,
  schemaOk,
  sleep,
} from './lib/auditHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../../../docs/audit/endpoints');

const tagFilter = process.argv.find((a) => a.startsWith('--tag='))?.split('=')[1];
const partialTag = process.argv.find((a) => a.startsWith('--partial='))?.split('=')[1];
const mergeOnly = process.argv.includes('--merge-only');
const limitArg = process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? Number(limitArg) : 0;

function invalidPayload() {
  return { __invalid: true, nested: { bad: null } };
}

function record(matrix, route, check, ok, detail, contract, classification = null) {
  const key = `${route.method} ${route.path}`;
  matrix.routes[key] ??= {
    method: route.method,
    path: route.path,
    tag: route.tag,
    contractKind: contract.kind,
    checks: {},
  };
  matrix.routes[key].checks[check] = { ok, detail, classification };
  if (ok === true) matrix.summary.passed++;
  else matrix.summary.failed++;
  matrix.summary.actionable++;
}

async function ensureTokens(state) {
  if (!state.tenantToken) state.tenantToken = (await login(AUDIT_EMAIL, AUDIT_PASS)) ?? (await login(LEGACY_EMAIL, LEGACY_PASS));
  if (!state.adminToken) state.adminToken = await login(GLOBAL_EMAIL, GLOBAL_PASS);
  return state;
}

async function refreshIf401(state, status) {
  if (status !== 401) return state;
  state.tenantToken = (await login(AUDIT_EMAIL, AUDIT_PASS)) ?? (await login(LEGACY_EMAIL, LEGACY_PASS));
  state.adminToken = await login(GLOBAL_EMAIL, GLOBAL_PASS);
  return state;
}

async function waitForApi(maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const r = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (r.ok) return true;
    } catch {
      /* retry */
    }
    await sleep(2000);
  }
  return false;
}

async function recoverIfDown(state) {
  const ok = await waitForApi(30000);
  if (ok) await ensureTokens(state);
  return ok;
}

function writeReports(matrix, classified) {
  const actionable = matrix.summary.actionable;
  matrix.summary.coveragePct = actionable ? Math.round((matrix.summary.passed / actionable) * 100) : 0;
  matrix.summary.realFailures = classified.filter((c) => c.classification === 'BUG_REAL').length;

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'endpoint-matrix.json'), JSON.stringify(matrix, null, 2));
  fs.writeFileSync(path.join(outDir, 'endpoint-matrix-classifications.json'), JSON.stringify(classified, null, 2));

  let md = `# Matriz de Endpoints v2 (contrato) — ErgoSensePro\n\nGerado: ${matrix.generatedAt}\n\n`;
  md += `| Métrica | Valor |\n|---------|------:|\n`;
  md += `| Rotas | ${matrix.summary.total} |\n`;
  md += `| Checks acionáveis | ${actionable} |\n`;
  md += `| Passou | ${matrix.summary.passed} |\n`;
  md += `| Falhou | ${matrix.summary.failed} |\n`;
  md += `| Skips (checks N/A) | ${matrix.summary.skipped} |\n`;
  md += `| **Cobertura acionável** | **${matrix.summary.coveragePct}%** |\n`;
  md += `| Bugs reais | ${matrix.summary.realFailures} |\n\n`;

  md += `## Classificação das falhas\n\n| Tipo | Qtd |\n|------|----:|\n`;
  for (const [k, v] of Object.entries(matrix.classifications).sort((a, b) => b[1] - a[1])) {
    md += `| ${k} | ${v} |\n`;
  }

  md += `\n## Falhas BUG_REAL / CONTRATO_INDEFINIDO\n\n`;
  for (const f of classified.filter((c) => ['BUG_REAL', 'CONTRATO_INDEFINIDO'].includes(c.classification)).slice(0, 40)) {
    md += `- \`${f.method} ${f.path}\` **${f.check}** — ${f.detail} — _${f.classification}_: ${f.reason}\n`;
  }

  fs.writeFileSync(path.join(outDir, 'ENDPOINT-MATRIX-2026-07-01.md'), md);
  return matrix;
}

function reconcileMatrix(matrix, classified) {
  const autoPass = new Set(['COMPORTAMENTO_ESPERADO', 'FALSO_POSITIVO_HEURISTICA']);
  matrix.classifications = {};
  for (const f of classified) {
    matrix.classifications[f.classification] = (matrix.classifications[f.classification] ?? 0) + 1;
    if (!autoPass.has(f.classification)) continue;
    const key = `${f.method} ${f.path}`;
    const check = matrix.routes[key]?.checks[f.check];
    if (check?.ok !== true) {
      check.ok = true;
      check.reclassified = f.classification;
      matrix.summary.passed++;
      matrix.summary.failed--;
    }
  }
  matrix.summary.effectiveFailed = classified.filter(
    (f) => !autoPass.has(f.classification) && f.classification !== 'TESTE_PRECISA_AJUSTE',
  ).length;
  return matrix;
}

function classifyMatrix(matrix) {
  const classified = [];
  matrix.classifications = {};
  for (const r of Object.values(matrix.routes)) {
    const route = {
      method: r.method,
      path: r.path,
      auth: r.path.includes('/public') || r.path === '/api/health' ? 'public' : 'bearer',
      adminGlobal: r.path.startsWith('/api/admin/'),
      tag: r.tag,
    };
    const contract = getRouteContract(route);
    for (const [check, result] of Object.entries(r.checks)) {
      if (result.ok !== true) {
        const c = classifyFailure(route, check, result.detail, contract);
        result.classification = c.classification;
        classified.push({ method: r.method, path: r.path, check, detail: result.detail, ...c });
        matrix.classifications[c.classification] = (matrix.classifications[c.classification] ?? 0) + 1;
      }
    }
  }
  return classified;
}

function mergePartials() {
  const partialDir = path.join(outDir, 'partials');
  if (!fs.existsSync(partialDir)) {
    console.error('Nenhum partial encontrado em', partialDir);
    process.exit(2);
  }
  const files = fs.readdirSync(partialDir).filter((f) => f.endsWith('.json'));
  const merged = {
    generatedAt: new Date().toISOString(),
    version: 'v2-contract-batch',
    base: BASE,
    routes: {},
    classifications: {},
    summary: { total: 0, passed: 0, failed: 0, actionable: 0, skipped: 0 },
    batches: files.map((f) => f.replace('.json', '')),
  };
  for (const file of files) {
    const part = JSON.parse(fs.readFileSync(path.join(partialDir, file), 'utf8'));
    Object.assign(merged.routes, part.routes);
    merged.summary.passed += part.summary.passed;
    merged.summary.failed += part.summary.failed;
    merged.summary.actionable += part.summary.actionable;
    merged.summary.skipped += part.summary.skipped;
  }
  merged.summary.total = Object.keys(merged.routes).length;
  const classified = classifyMatrix(merged);
  reconcileMatrix(merged, classified);
  writeReports(merged, classified);
  console.log(`\nMatriz v2 (batch merge): ${merged.summary.passed}/${merged.summary.actionable} (${merged.summary.coveragePct}%)`);
  console.log(`Classificações:`, merged.classifications);
  process.exit(merged.summary.realFailures > 0 ? 1 : merged.summary.coveragePct < 85 && merged.summary.failed > 0 ? 1 : 0);
}

async function main() {
  if (mergeOnly) {
    mergePartials();
    return;
  }

  console.log(`\n=== ENDPOINT MATRIX v2 (contrato) → ${BASE} ===\n`);

  try {
    await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
  } catch (err) {
    console.error('API indisponível:', err.message);
    process.exit(2);
  }

  const state = { tenantToken: null, adminToken: null };
  await ensureTokens(state);
  if (!state.tenantToken && !state.adminToken) {
    console.error('Login falhou');
    process.exit(2);
  }

  let routes = scanAllRoutes();
  if (tagFilter) routes = routes.filter((r) => r.tag === tagFilter);
  if (limit > 0) routes = routes.slice(0, limit);

  const matrix = {
    generatedAt: new Date().toISOString(),
    version: 'v2-contract',
    base: BASE,
    routes: {},
    classifications: {},
    summary: { total: routes.length, passed: 0, failed: 0, actionable: 0, skipped: 0 },
  };

  let routeIndex = 0;
  for (const route of routes) {
    routeIndex++;
    if (routeIndex % 20 === 0) {
      const ok = await waitForApi(15000);
      if (!ok) console.warn('⚠ API lenta/indisponível — aguardando...');
      await ensureTokens(state);
    }

    const contract = getRouteContract(route);
    const pathReady = materializePath(route.path, TENANT);
    const pathNotFound = materializePath(route.path, TENANT, { notFound: true });
    console.log(`→ [${contract.kind}] ${route.method} ${route.path}`);

    if (route.auth === 'public') {
      if (route.method === 'GET') {
        const r = await request('GET', pathReady, { tenantId: false, retries: 2 });
        record(matrix, route, 'success_auth', r.status > 0 && r.status < 500, `HTTP ${r.status}`, contract);
        record(matrix, route, 'schema_valid', schemaOk(r.json, r.status), `HTTP ${r.status}`, contract);
        record(matrix, route, 'no_sensitive_leak', !hasSensitiveLeak(r.text, route.path), 'OK', contract);
      } else if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
        const body = contract.validated ? invalidPayload() : {};
        const r = await request(route.method, pathReady, { body, tenantId: false, retries: 2 });
        if (contract.validated) {
          record(matrix, route, 'invalid_payload_400', r.status >= 400 && r.status < 500, `HTTP ${r.status}`, contract);
        } else {
          record(matrix, route, 'success_auth', r.status > 0 && r.status < 500, `HTTP ${r.status}`, contract);
          record(matrix, route, 'schema_valid', schemaOk(r.json, r.status), `HTTP ${r.status}`, contract);
        }
        record(matrix, route, 'no_sensitive_leak', !hasSensitiveLeak(r.text, route.path), 'OK', contract);
      }
      matrix.summary.skipped += 7;
      continue;
    }

    // Auth obrigatório
    let noAuth = await request(route.method, pathReady, { tenantId: route.adminGlobal ? false : TENANT, retries: 3 });
    if (noAuth.status === 0) await recoverIfDown(state);
    record(matrix, route, 'no_auth_401', noAuth.status === 401, `HTTP ${noAuth.status}`, contract);

    let badTok = await request(route.method, pathReady, {
      token: 'invalid.jwt.token',
      tenantId: route.adminGlobal ? false : TENANT,
      retries: 2,
    });
    record(matrix, route, 'invalid_token_401', badTok.status === 401, `HTTP ${badTok.status}`, contract);

    if (route.adminGlobal) {
      await ensureTokens(state);
      const body = Object.keys(contract.adminForbiddenBody).length ? contract.adminForbiddenBody : {};
      let tenantOnAdmin = await request(route.method, pathReady, {
        token: state.tenantToken,
        body: ['POST', 'PUT', 'PATCH'].includes(route.method) ? body : undefined,
        tenantId: false,
        retries: 2,
      });
      const forbiddenOk = contract.forbiddenOk.includes(tenantOnAdmin.status);
      record(matrix, route, 'forbidden_role_403', forbiddenOk, `HTTP ${tenantOnAdmin.status}`, contract);
    } else if (contract.tenantScoped && route.method === 'GET') {
      const cross = await request('GET', materializePath(route.path, OTHER_TENANT), {
        token: state.tenantToken,
        tenantId: OTHER_TENANT,
        retries: 2,
      });
      record(matrix, route, 'wrong_tenant_403', cross.status === 403 || cross.status === 401, `HTTP ${cross.status}`, contract);
    } else {
      matrix.summary.skipped++;
    }

    if (/:[\w]+/.test(route.path)) {
      await ensureTokens(state);
      const useToken = route.adminGlobal ? state.adminToken : state.tenantToken;
      let nf = await request(route.method, pathNotFound, {
        token: useToken,
        tenantId: route.adminGlobal ? false : TENANT,
        body: route.method === 'PUT' && route.adminGlobal ? { name: 'Probe' } : undefined,
        retries: 3,
      });
      await refreshIf401(state, nf.status);
      if (nf.status === 401) {
        nf = await request(route.method, pathNotFound, {
          token: route.adminGlobal ? state.adminToken : state.tenantToken,
          tenantId: route.adminGlobal ? false : TENANT,
          body: route.method === 'PUT' && route.adminGlobal ? { name: 'Probe' } : undefined,
          retries: 2,
        });
      }
      const nfOk = contract.notFoundOk.includes(nf.status);
      record(matrix, route, 'not_found_404', nfOk, `HTTP ${nf.status}`, contract);
    }

    if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
      await ensureTokens(state);
      const useToken = route.adminGlobal ? state.adminToken : state.tenantToken;
      if (contract.validated) {
        const inv = await request(route.method, pathReady, {
          token: useToken,
          body: invalidPayload(),
          tenantId: route.adminGlobal ? false : TENANT,
          retries: 2,
        });
        record(matrix, route, 'invalid_payload_400', inv.status >= 400 && inv.status < 500, `HTTP ${inv.status}`, contract);
      }
      if (!contract.bodyOptional) {
        const empty = await request(route.method, pathReady, {
          token: useToken,
          body: {},
          tenantId: route.adminGlobal ? false : TENANT,
          retries: 2,
        });
        record(matrix, route, 'empty_payload_400', empty.status >= 400 && empty.status < 500, `HTTP ${empty.status}`, contract);
      } else {
        matrix.summary.skipped++;
      }
    }

    await ensureTokens(state);
    const useToken = route.adminGlobal ? state.adminToken : state.tenantToken;
    let authed = await request(route.method, pathReady, {
      token: useToken,
      tenantId: route.adminGlobal ? false : TENANT,
      retries: 3,
    });
    await refreshIf401(state, authed.status);
    if (authed.status === 401) {
      authed = await request(route.method, pathReady, {
        token: route.adminGlobal ? state.adminToken : state.tenantToken,
        tenantId: route.adminGlobal ? false : TENANT,
        retries: 2,
      });
    }
    record(matrix, route, 'success_auth', authed.status > 0 && authed.status < 500, `HTTP ${authed.status} ${authed.ms}ms`, contract);
    record(matrix, route, 'schema_valid', authed.status === 0 ? false : schemaOk(authed.json, authed.status), `HTTP ${authed.status}`, contract);
    record(matrix, route, 'no_sensitive_leak', !hasSensitiveLeak(authed.text, route.path), 'OK', contract);

    await sleep(80);
  }

  const classified = classifyMatrix(matrix);
  reconcileMatrix(matrix, classified);

  if (partialTag) {
    const partialDir = path.join(outDir, 'partials');
    fs.mkdirSync(partialDir, { recursive: true });
    const safeName = partialTag.replace(/[^\w-]+/g, '_');
    fs.writeFileSync(path.join(partialDir, `${safeName}.json`), JSON.stringify(matrix, null, 2));
    const pct = matrix.summary.actionable
      ? Math.round((matrix.summary.passed / matrix.summary.actionable) * 100)
      : 0;
    console.log(`\nPartial [${partialTag}]: ${matrix.summary.passed}/${matrix.summary.actionable} (${pct}%)`);
    return;
  }

  writeReports(matrix, classified);
  console.log(`\nMatriz v2: ${matrix.summary.passed}/${matrix.summary.actionable} acionáveis (${matrix.summary.coveragePct}%)`);
  console.log(`Classificações:`, matrix.classifications);
  const realFailures = classified.filter((c) => c.classification === 'BUG_REAL').length;
  const hardFails = matrix.summary.failed;
  process.exit(realFailures > 0 ? 1 : matrix.summary.coveragePct < 85 && hardFails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
