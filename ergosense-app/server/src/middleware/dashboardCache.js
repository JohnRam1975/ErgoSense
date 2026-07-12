/**
 * Cache HTTP para dashboards, relatórios e estatísticas (GET).
 */
import { cacheService } from '../services/cache/CacheService.js';
import { apiResponse, CACHE_TTL } from '../services/cache/cacheKeys.js';
import { resolveTenantId } from './tenantGuard.js';
import { config } from '../config/env.js';

const CACHEABLE_PATTERNS = [
  /\/dashboard$/,
  /\/dashboard\//,
  /\/stats$/,
  /\/statistics$/,
  /\/relatorio/,
  /\/report/,
  /\/indicadores$/,
  /\/metrics-summary$/,
];

function isCacheablePath(path) {
  return CACHEABLE_PATTERNS.some((re) => re.test(path));
}

function resolveTtl(path) {
  if (path.includes('/report') || path.includes('/relatorio')) return CACHE_TTL.report;
  if (path.includes('/stats') || path.includes('/indicadores')) return CACHE_TTL.stats;
  return CACHE_TTL.dashboard;
}

export function dashboardCacheMiddleware() {
  return async (req, res, next) => {
    if (!config.cache.enabled || req.method !== 'GET') return next();
    if (!isCacheablePath(req.path)) return next();
    if (!req.user) return next();

    const tenantId = resolveTenantId(req, req.query?.tenantId ?? req.headers[config.tenancy.headerTenantId]);
    if (!tenantId) return next();

    const key = apiResponse(tenantId, req.path, req.query);
    try {
      const cached = await cacheService.get(key);
      if (cached) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', key.slice(0, 64));
        return res.json(cached);
      }
    } catch {
      /* proceed without cache */
    }

    const origJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400 && body != null) {
        const ttl = resolveTtl(req.path);
        void cacheService.set(key, body, ttl);
        res.set('X-Cache', 'MISS');
      }
      return origJson(body);
    };
    next();
  };
}
