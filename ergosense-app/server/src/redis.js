/**
 * Cliente Redis opcional — sessões, cache, filas, rate limit distribuído.
 */
import { config } from './config/env.js';

let client = null;

export async function getRedisClient() {
  if (!config.redis.enabled || !config.redis.url) return null;
  if (client) return client;

  try {
    const { default: Redis } = await import('ioredis');
    client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      enableReadyCheck: true,
    });
    await client.connect();
    client.on('error', (err) => {
      console.error(JSON.stringify({ level: 'error', msg: 'redis_error', error: err.message }));
    });
    console.log(JSON.stringify({ level: 'info', msg: 'redis_connected' }));
    return client;
  } catch (err) {
    console.warn(JSON.stringify({ level: 'warn', msg: 'redis_unavailable', error: err.message }));
    return null;
  }
}

export async function closeRedis() {
  if (client) {
    await client.quit();
    client = null;
  }
}
