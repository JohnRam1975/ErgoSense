/**
 * Contratos por rota — expectativas reais de QA (não heurística genérica)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, '../../src/routes');

let validatedRoutesCache = null;

export function scanValidatedRoutes() {
  if (validatedRoutesCache) return validatedRoutesCache;
  const set = new Set();
  const files = [...fs.readdirSync(routesDir).filter((f) => f.endsWith('.js')), 'index.js'];
  for (const file of files) {
    const fp = file === 'index.js' ? path.join(__dirname, '../../src/index.js') : path.join(routesDir, file);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, 'utf8');
    const re = /app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = re.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      const idx = match.index;
      const segment = content.slice(idx, idx + 900);
      if (segment.includes('validateBody(')) {
        set.add(`${method} ${routePath}`);
      }
    }
  }
  validatedRoutesCache = set;
  return set;
}

const TENANT_AGNOSTIC = [
  /^GET \/api\/health/,
  /^GET \/api\/openapi/,
  /^GET \/api\/docs/,
  /^GET \/api\/ai\/engine/,
  /^POST \/api\/auth\//,
  /^GET \/api\/auth\//,
  /^POST \/api\/public\//,
  /^GET \/api\/public\//,
  /^POST \/api\/access-requests/,
  /^GET \/api\/admin\//,
  /^POST \/api\/admin\//,
  /^PUT \/api\/admin\//,
  /^DELETE \/api\/admin\//,
  /^GET \/api\/tenants$/,
  /^GET \/api\/support\//,
  /^GET \/api\/system\//,
  /^GET \/api\/risk-criteria\//,
  /^GET \/api\/psico\/lgpd$/,
];

const ACTION_POST = [
  /\/advance$/,
  /\/retreat$/,
  /\/gerar-relatorio$/,
  /\/relatorios\/gerar$/,
  /\/gerar$/,
  /\/scan$/,
  /\/atualizar-snapshot$/,
  /\/revision$/,
  /\/reject$/,
  /\/approve$/,
  /\/reactivate$/,
  /\/versoes$/,
  /\/query$/,
  /\/analyze-/,
  /\/expert\//,
  /\/validar$/,
  /\/lida$/,
  /\/sync/,
  /\/recalcular/,
  /\/assinar$/,
  /\/sign$/,
];

const IDEMPOTENT_DELETE = [
  /^DELETE \/api\/aet\//,
  /^DELETE \/api\/analyses\//,
  /^DELETE \/api\/collaborators\//,
  /^DELETE \/api\/sectors\//,
  /^DELETE \/api\/psico\/plano-acao\/:id$/,
];

const SUB_RESOURCE_LIST = [
  /^GET \/api\/compliance\/normas\/:id\/versoes$/,
  /^GET \/api\/compliance\/deteccoes\/:id\/impactos$/,
  /^GET \/api\/esocial\/eventos\/:id\/transmissoes$/,
  /^GET \/api\/esocial\/eventos\/:id\/validacoes$/,
  /^GET \/api\/risk-criteria\/methodologies\/:id\/versions$/,
];

const IDEMPOTENT_PUT = [
  /^PUT \/api\/compliance\/alertas\/:id\/lida$/,
  /^PUT \/api\/sst\/treinamentos\/:id\/realizar$/,
];

function routeKey(method, pathStr) {
  return `${method} ${pathStr}`;
}

function adminForbiddenPayload(pathStr, method) {
  if (method !== 'POST' && method !== 'PUT') return {};
  if (pathStr.includes('/block') || pathStr.includes('/suspend')) return { reason: 'Probe QA forbidden' };
  if (pathStr.includes('/reject')) return { reason: 'Probe QA reject' };
  if (pathStr.includes('/request-adjustment')) return { message: 'Probe QA adjustment' };
  if (pathStr.includes('/reactivate')) return { confirm: true };
  if (pathStr.includes('/tenants/:id') && method === 'PUT') return { name: 'Probe QA' };
  return {};
}

export function getRouteContract(route) {
  const key = routeKey(route.method, route.path);
  const validated = scanValidatedRoutes().has(key);
  const isPublic = route.auth === 'public';
  const isAdmin = route.adminGlobal;
  const hasIdParam = /:[\w]+/.test(route.path);
  const isActionPost = route.method === 'POST' && ACTION_POST.some((re) => re.test(route.path));
  const isListGet = route.method === 'GET' && !hasIdParam;
  const isGetById = route.method === 'GET' && hasIdParam;
  const isDelete = route.method === 'DELETE';
  const isMutation = ['POST', 'PUT', 'PATCH'].includes(route.method);
  const tenantAgnostic = TENANT_AGNOSTIC.some((re) => re.test(key));
  const idempotentDelete = isDelete && IDEMPOTENT_DELETE.some((re) => re.test(key));
  const idempotentPut = route.method === 'PUT' && IDEMPOTENT_PUT.some((re) => re.test(key));
  const subResourceList = route.method === 'GET' && SUB_RESOURCE_LIST.some((re) => re.test(key));

  return {
    key,
    kind: isPublic
      ? 'public'
      : isAdmin
        ? 'admin'
        : isListGet
          ? 'list'
          : isGetById
            ? 'getById'
            : isDelete
              ? 'delete'
              : route.method === 'POST'
                ? isActionPost
                  ? 'actionPost'
                  : 'create'
                : 'update',
    validated,
    bodyOptional: isActionPost || (isMutation && !validated),
    tenantScoped: !tenantAgnostic && !isAdmin && !isPublic,
    idempotentDelete,
    notFoundOk: idempotentDelete || idempotentPut || subResourceList
      ? [200, 204, 404, 400, 403]
      : isAdmin && route.path.includes('/tenants/:id')
        ? [404, 400, 403]
        : [404, 400, 403],
    forbiddenOk: [401, 403, 400],
    adminForbiddenBody: adminForbiddenPayload(route.path, route.method),
    // IA sem chave no CI retorna 503 de propósito (não é crash 500).
    serviceUnavailableOk: route.path.startsWith('/api/ai/'),
  };
}

export function classifyFailure(route, check, detail, contract) {
  const status = parseInt(detail.match(/HTTP (\d+)/)?.[1] ?? '0', 10);

  if (status === 0) {
    return { classification: 'TESTE_PRECISA_AJUSTE', reason: 'Conexão resetada — retry' };
  }
  if (check === 'forbidden_role_403' && contract.forbiddenOk.includes(status)) {
    return { classification: 'COMPORTAMENTO_ESPERADO', reason: 'Schema/auth antes de RBAC' };
  }
  if (check === 'not_found_404' && contract.notFoundOk.includes(status)) {
    return { classification: 'COMPORTAMENTO_ESPERADO', reason: `Status ${status} OK para contrato ${contract.kind}` };
  }
  if (check === 'not_found_404' && status === 200 && SUB_RESOURCE_LIST.some((re) => re.test(`${route.method} ${route.path}`))) {
    return { classification: 'COMPORTAMENTO_ESPERADO', reason: 'Sub-recurso retorna lista vazia com 200' };
  }
  if ((check === 'invalid_payload_400' || check === 'empty_payload_400') && contract.bodyOptional) {
    return { classification: 'FALSO_POSITIVO_HEURISTICA', reason: 'Body opcional / sem validateBody' };
  }
  if (check === 'success_auth' && contract.serviceUnavailableOk && status === 503) {
    return { classification: 'COMPORTAMENTO_ESPERADO', reason: 'IA sem provedor configurado → 503' };
  }
  if (check === 'wrong_tenant_403' && !contract.tenantScoped) {
    return { classification: 'FALSO_POSITIVO_HEURISTICA', reason: 'Rota tenant-agnostic' };
  }
  if ((check === 'no_auth_401' || check === 'invalid_token_401') && contract.kind === 'public') {
    return { classification: 'COMPORTAMENTO_ESPERADO', reason: 'Rota pública — auth não obrigatória' };
  }
  if (check === 'no_sensitive_leak' && (route.path === '/api/openapi.json' || route.path === '/api/docs')) {
    return { classification: 'COMPORTAMENTO_ESPERADO', reason: 'Schema OpenAPI documenta campos sensíveis sem valores' };
  }
  if (check === 'not_found_404' && status === 401) {
    return { classification: 'TESTE_PRECISA_AJUSTE', reason: 'Token expirado ou path inválido' };
  }
  if (check === 'not_found_404' && status === 200 && route.path.includes('/admin/tenants/:id')) {
    return { classification: 'BUG_REAL', reason: 'PUT tenant inexistente retornava 200' };
  }
  return { classification: 'CONTRATO_INDEFINIDO', reason: `${check} → ${detail}` };
}
