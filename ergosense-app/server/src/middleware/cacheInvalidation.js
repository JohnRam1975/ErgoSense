/**
 * Invalidação automática de cache por tenant em mutações.
 */
import { cacheService } from '../services/cache/CacheService.js';
import { tenantPattern } from '../services/cache/cacheKeys.js';
import { resolveTenantId } from './tenantGuard.js';
import { config } from '../config/env.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function cacheInvalidationMiddleware() {
  return (req, res, next) => {
    if (!config.cache.enabled || !MUTATION_METHODS.has(req.method)) return next();
    if (!req.user) return next();

    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const tenantId = resolveTenantId(req, req.query?.tenantId ?? req.body?.tenantId);
      if (!tenantId) return;
      void cacheService.invalidatePattern(tenantPattern(tenantId));
    });
    next();
  };
}
