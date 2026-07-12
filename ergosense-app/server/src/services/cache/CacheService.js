/**
 * Cache distribuído Redis com fallback em memória (LRU).
 */
import { getRedisClient } from '../../redis.js';
import { config } from '../../config/env.js';
import { recordCacheHit, recordCacheMiss } from '../../metrics.js';

const memoryCache = new Map();
const MEMORY_MAX = 500;

function memoryGet(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key, value, ttlSec) {
  if (memoryCache.size >= MEMORY_MAX) {
    const first = memoryCache.keys().next().value;
    if (first) memoryCache.delete(first);
  }
  memoryCache.set(key, {
    value,
    expiresAt: ttlSec ? Date.now() + ttlSec * 1000 : null,
  });
}

function memoryDeletePattern(pattern) {
  const prefix = pattern.replace('*', '');
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
}

export class CacheService {
  async get(key) {
    if (!config.cache.enabled) return null;

    const redis = await getRedisClient();
    if (redis) {
      try {
        const raw = await redis.get(key);
        if (raw) {
          recordCacheHit();
          return JSON.parse(raw);
        }
        recordCacheMiss();
        return null;
      } catch {
        /* fallback memory */
      }
    }

    const mem = memoryGet(key);
    if (mem) recordCacheHit();
    else recordCacheMiss();
    return mem;
  }

  async set(key, value, ttlSec = 60) {
    if (!config.cache.enabled) return;

    const redis = await getRedisClient();
    if (redis) {
      try {
        const payload = JSON.stringify(value);
        if (ttlSec > 0) await redis.setex(key, ttlSec, payload);
        else await redis.set(key, payload);
        return;
      } catch {
        /* fallback */
      }
    }
    memorySet(key, value, ttlSec);
  }

  async del(key) {
    const redis = await getRedisClient();
    if (redis) {
      try {
        await redis.del(key);
      } catch {
        /* ignore */
      }
    }
    memoryCache.delete(key);
  }

  async invalidatePattern(pattern) {
    const redis = await getRedisClient();
    if (redis) {
      try {
        let cursor = '0';
        do {
          const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = next;
          if (keys.length) await redis.del(...keys);
        } while (cursor !== '0');
      } catch {
        /* fallback */
      }
    }
    memoryDeletePattern(pattern);
  }

  async getOrSet(key, ttlSec, loader) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const value = await loader();
    if (value !== undefined && value !== null) {
      await this.set(key, value, ttlSec);
    }
    return value;
  }
}

export const cacheService = new CacheService();
