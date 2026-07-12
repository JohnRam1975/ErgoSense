/**
 * Probes compatíveis com Kubernetes:
 * - /health/live  → liveness (processo vivo)
 * - /health/ready → readiness (dependências)
 * - /health       → status agregado
 */
import { Router } from 'express';
import { config } from './config/env.js';

async function checkDatabase(pool) {
  const start = Date.now();
  await pool.query('SELECT 1');
  return { ok: true, latencyMs: Date.now() - start };
}

async function checkRedis(redisClient) {
  if (!redisClient) {
    return { ok: true, skipped: true, reason: 'redis_not_configured' };
  }
  const start = Date.now();
  const pong = await redisClient.ping();
  return { ok: pong === 'PONG', latencyMs: Date.now() - start };
}

export function createHealthRouter({ pool, redisClient = null }) {
  const router = Router();

  router.get('/health/live', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      service: config.observability.serviceName,
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/health/ready', async (_req, res) => {
    const checks = { database: { ok: false }, redis: { ok: false } };
    let ready = true;

    try {
      checks.database = await checkDatabase(pool);
    } catch (err) {
      checks.database = { ok: false, error: err.message };
      ready = false;
    }

    try {
      checks.redis = await checkRedis(redisClient);
      if (checks.redis.skipped) {
        checks.redis.ok = true;
      } else if (!checks.redis.ok) {
        ready = false;
      }
    } catch (err) {
      checks.redis = { ok: false, error: err.message };
      if (config.redis.enabled) ready = false;
      else checks.redis = { ok: true, skipped: true };
    }

    res.status(ready ? 200 : 503).json({
      status: ready ? 'READY' : 'NOT_READY',
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/health', async (_req, res) => {
    let dbOk = false;
    let redisOk = true;

    try {
      await checkDatabase(pool);
      dbOk = true;
    } catch {
      dbOk = false;
    }

    if (config.redis.enabled && redisClient) {
      try {
        const r = await checkRedis(redisClient);
        redisOk = r.ok;
      } catch {
        redisOk = false;
      }
    }

    const ok = dbOk && redisOk;
    res.status(ok ? 200 : 503).json({
      ok,
      service: config.observability.serviceName,
      version: process.env.APP_VERSION ?? '1.0.0',
      database: dbOk ? 'up' : 'down',
      redis: config.redis.enabled ? (redisOk ? 'up' : 'down') : 'skipped',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
