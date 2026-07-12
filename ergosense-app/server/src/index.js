import { config } from './config/env.js';
import { pool } from './db.js';
import { validateAiConfig } from './config/aiConfig.js';
import { createApp } from './app.js';
import { getRedisClient, closeRedis } from './redis.js';
import { getStorageStatus } from './services/storageService.js';
import { initQueueWorkers, registerDefaultWorkers, closeQueue } from './services/queue/QueueService.js';

const PORT = config.port;

async function bootstrap() {
  validateAiConfig();

  const app = await createApp({ extendedHealth: true });

  registerDefaultWorkers();
  await initQueueWorkers();

  const { startComplianceScheduler } = await import('./services/complianceScheduler.js');
  startComplianceScheduler();

  const redisClient = await getRedisClient();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'server_started',
        port: PORT,
        env: config.nodeEnv,
        database: `${config.db.database}@${config.db.host}:${config.db.port}`,
        redis: config.redis.enabled ? (redisClient ? 'up' : 'down') : 'disabled',
        storage: getStorageStatus(),
      }),
    );
  });

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
    console.log(JSON.stringify({ level: 'info', msg: 'shutdown', signal }));
    server.close();
    await pool.end();
    await closeRedis();
    await closeQueue();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error(JSON.stringify({ level: 'fatal', msg: 'bootstrap_failed', error: err.message }));
  process.exit(1);
});
