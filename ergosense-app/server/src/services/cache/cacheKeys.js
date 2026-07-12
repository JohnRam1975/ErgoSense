/**
 * Chaves de cache Redis — namespace ergosense:{tenantId}:{domain}:{hash}
 */
import crypto from 'crypto';

const PREFIX = 'ergosense';

function hashQuery(query = {}) {
  const sorted = Object.keys(query)
    .sort()
    .map((k) => `${k}=${query[k]}`)
    .join('&');
  if (!sorted) return 'default';
  return crypto.createHash('sha1').update(sorted).digest('hex').slice(0, 12);
}

export function tenantPattern(tenantId) {
  return `${PREFIX}:${tenantId}:*`;
}

export function dashboard(tenantId, module, query = {}) {
  return `${PREFIX}:${tenantId}:dash:${module}:${hashQuery(query)}`;
}

export function report(tenantId, reportType, query = {}) {
  return `${PREFIX}:${tenantId}:report:${reportType}:${hashQuery(query)}`;
}

export function stats(tenantId, statKey, query = {}) {
  return `${PREFIX}:${tenantId}:stats:${statKey}:${hashQuery(query)}`;
}

export function apiResponse(tenantId, path, query = {}) {
  const normalized = String(path).replace(/\/\d+/g, '/:id').slice(0, 120);
  return `${PREFIX}:${tenantId}:api:${normalized}:${hashQuery(query)}`;
}

export function heavyQuery(tenantId, queryName, params = {}) {
  return `${PREFIX}:${tenantId}:query:${queryName}:${hashQuery(params)}`;
}

export const CACHE_TTL = {
  dashboard: 60,
  report: 300,
  stats: 120,
  heavyQuery: 180,
};
