/**
 * Rate limiting — Redis (distribuído) ou memória (fallback)
 */
import { config } from '../config/env.js';
import { getRedisClient } from '../redis.js';
import { apiError } from '../utils/apiResponse.js';

const memoryBuckets = new Map();

function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;
  return ip ?? 'unknown';
}

function shouldSkipDev() {
  return config.nodeEnv === 'development' && config.security.rateLimitSkipDev;
}

async function redisIncrement(key, windowMs, max) {
  const redis = await getRedisClient();
  if (!redis) return null;

  const redisKey = `rl:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.pexpire(redisKey, windowMs);
  }
  return count > max;
}

function memoryIncrement(key, windowMs, max) {
  const now = Date.now();
  let bucket = memoryBuckets.get(key);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
    memoryBuckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count > max;
}

export function createRateLimiter({ windowMs, max, keyPrefix = 'global', skip }) {
  return async (req, res, next) => {
    if (skip?.(req)) return next();

    const tenantHeader = req.headers[config.tenancy.headerTenantId];
    const tenantPart = tenantHeader ? `:t:${tenantHeader}` : '';
    const key = `${keyPrefix}:${clientKey(req)}${tenantPart}`;
    let exceeded = false;

    try {
      exceeded = await redisIncrement(key, windowMs, max);
      if (exceeded === null) {
        exceeded = memoryIncrement(key, windowMs, max);
      }
    } catch {
      exceeded = memoryIncrement(key, windowMs, max);
    }

    if (exceeded) {
      return apiError(res, 'Limite de requisições excedido. Tente novamente em instantes.', 429);
    }
    next();
  };
}

export const globalRateLimit = createRateLimiter({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  keyPrefix: 'api',
  skip: (req) =>
    shouldSkipDev() ||
    req.path.startsWith('/health') ||
    req.path === '/api/health' ||
    req.path === '/',
});

export const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: config.security.loginRateLimitMax,
  keyPrefix: 'login',
  skip: () => shouldSkipDev(),
});

export const publicFormRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'public',
});

export const criticalApiRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: config.security.criticalRateLimitMax,
  keyPrefix: 'critical',
  skip: () => shouldSkipDev(),
});
