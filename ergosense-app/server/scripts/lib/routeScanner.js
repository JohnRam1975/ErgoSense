/**
 * Inventário de rotas Express — scan estático de routes/*.js + index.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, '../../src/routes');
const indexPath = path.join(__dirname, '../../src/index.js');

const PUBLIC_EXACT = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/mfa/verify',
  '/api/auth/activate-account',
  '/api/openapi.json',
  '/api/docs',
]);

export function isPublicRoute(method, routePath) {
  if (PUBLIC_EXACT.has(routePath)) return true;
  if (routePath.startsWith('/api/public/')) return true;
  if (routePath === '/api/access-requests' && method === 'post') return true;
  if (routePath === '/api/auth/activate-account/preview' && method === 'get') return true;
  if (routePath.startsWith('/api/denuncias/public')) return true;
  if (routePath.startsWith('/api/psico/public/')) return true;
  return false;
}

export function inferTag(routePath) {
  const segment = routePath.split('/')[2] ?? 'core';
  const map = {
    auth: 'Autenticação',
    admin: 'Admin',
    public: 'Público',
    tenant: 'Tenants',
    collaborators: 'Core',
    analyses: 'Core',
    psico: 'Psicossocial',
    denuncias: 'Denúncias',
    gro: 'GRO',
    pgr: 'PGR',
    aet: 'AET',
    sst: 'SST',
    esocial: 'eSocial',
    compliance: 'Compliance',
    org: 'Organização',
    risk: 'Inventário de Riscos',
    criteria: 'Critérios',
    ai: 'IA Expert',
    mfa: 'MFA',
    support: 'Suporte',
    openapi: 'Sistema',
    docs: 'Sistema',
    health: 'Sistema',
    access: 'Core',
  };
  return map[segment] ?? segment;
}

function scanFile(content, sourceFile) {
  const items = [];
  const regex = /app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toLowerCase();
    const routePath = match[2];
    if (!routePath.startsWith('/api/')) continue;
    items.push({
      method: method.toUpperCase(),
      path: routePath,
      sourceFile,
      tag: inferTag(routePath),
      auth: isPublicRoute(method, routePath) ? 'public' : 'bearer',
      adminGlobal: routePath.startsWith('/api/admin/'),
    });
  }
  return items;
}

export function scanAllRoutes() {
  const items = [];
  for (const file of fs.readdirSync(routesDir).filter((f) => f.endsWith('.js'))) {
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    items.push(...scanFile(content, `routes/${file}`));
  }
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  items.push(...scanFile(indexContent, 'index.js'));
  return items.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

export function materializePath(routePath, tenantId = 'acme', { notFound = false } = {}) {
  const numericId = notFound ? '999999999' : '1';
  const fakeCode = notFound ? 'ZZZ_NOT_FOUND' : 'SMOKE_CODE';
  const fakeToken = notFound ? 'invalid-not-found-token' : 'smoke-token-invalid';
  const fakeJob = notFound ? 'invalid-job' : 'smoke-job';

  return routePath.replace(/:(\w+)/g, (_, name) => {
    const lower = name.toLowerCase();
    if (lower === 'tenantid') return tenantId;
    if (lower.includes('token')) return fakeToken;
    if (lower === 'code' || lower === 'codigo' || lower === 'jobtype') return fakeJob;
    if (lower.endsWith('id') || lower === 'id' || lower === 'tid') return numericId;
    return numericId;
  });
}
