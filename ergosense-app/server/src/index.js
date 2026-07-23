import cluster from 'node:cluster';
import os from 'node:os';
import { config, assertProductionSecrets } from './config/env.js';
import { pool } from './db.js';
import { validateAiConfig } from './config/aiConfig.js';
import { createApp } from './app.js';
import { getRedisClient, closeRedis } from './redis.js';
import { getStorageStatus } from './services/storageService.js';
import { initQueueWorkers, registerDefaultWorkers, closeQueue } from './services/queue/QueueService.js';
import { startComplianceScheduler, stopComplianceScheduler } from './services/complianceScheduler.js';

const PORT = config.port;
const LISTEN_BACKLOG = Number(process.env.LISTEN_BACKLOG || 2048);
const configuredWorkers = Number(process.env.API_WORKERS || 0);
const cpuCount = os.cpus()?.length || 2;
/** 1 = processo único; >1 = cluster. Default: min(4, CPUs) em produção. */
const workerCount =
  configuredWorkers > 0
    ? configuredWorkers
    : config.nodeEnv === 'production'
      ? Math.max(1, Math.min(4, cpuCount))
      : 1;

async function bootstrap({ enableBackgroundJobs }) {
  assertProductionSecrets(config);
  validateAiConfig();

  const app = await createApp({ extendedHealth: true });

  if (enableBackgroundJobs) {
    registerDefaultWorkers();
    await initQueueWorkers();
    startComplianceScheduler();
  }

  const redisClient = await getRedisClient();

  const server = app.listen({ port: PORT, host: '0.0.0.0', backlog: LISTEN_BACKLOG }, () => {
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'server_started',
        port: PORT,
        backlog: LISTEN_BACKLOG,
        worker: cluster.isWorker ? cluster.worker?.id : 'primary-single',
        workers: workerCount,
        env: config.nodeEnv,
        database: `${config.db.database}@${config.db.host}:${config.db.port}`,
        redis: config.redis.enabled ? (redisClient ? 'up' : 'down') : 'disabled',
        storage: getStorageStatus(),
        backgroundJobs: enableBackgroundJobs,
      }),
    );
  });

  // Evita derrubar keep-alive sob carga (nginx keepalive_timeout 65).
  server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS || 65_000);
  server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS || 66_000);
  server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS || 0) || 0;

  // Mais conexões simultâneas sob burst (opcional via MAX_CONNECTIONS).
  const maxConn = Number(process.env.MAX_CONNECTIONS || 0);
  if (maxConn > 0) server.maxConnections = maxConn;

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'port_in_use',
          port: PORT,
          hint: `Porta ${PORT} em uso. Feche a outra instância: netstat -ano | findstr :${PORT}  →  taskkill /PID <pid> /F`,
        }),
      );
      process.exit(1);
    }
    throw err;
  });

  const shutdown = async (signal) => {
    console.log(JSON.stringify({ level: 'info', msg: 'shutdown', signal, worker: cluster.worker?.id }));
    if (enableBackgroundJobs) stopComplianceScheduler();
    server.close();
    await pool.end();
    await closeRedis();
    if (enableBackgroundJobs) await closeQueue();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

function startCluster() {
  if (cluster.isPrimary && workerCount > 1) {
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'cluster_primary',
        workers: workerCount,
        cpus: cpuCount,
      }),
    );
    for (let i = 0; i < workerCount; i++) {
      cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'worker_exit',
          workerId: worker.id,
          code,
          signal,
        }),
      );
      cluster.fork();
    });
    return;
  }

  // Jobs de fundo só no worker 1 (ou processo único) para não duplicar schedulers.
  const enableBackgroundJobs = !cluster.isWorker || cluster.worker?.id === 1;
  bootstrap({ enableBackgroundJobs }).catch((err) => {
    console.error(JSON.stringify({ level: 'fatal', msg: 'bootstrap_failed', error: err.message }));
    process.exit(1);
  });
}

startCluster();
