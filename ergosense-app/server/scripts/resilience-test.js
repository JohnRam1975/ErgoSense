/**
 * Teste de resiliência — DB indisponível, liveness, recuperação
 */
import 'dotenv/config';
import pg from 'pg';
import { createHealthRouter } from '../src/health.js';
import express from 'express';
import http from 'http';

const BASE = process.env.AUDIT_API_URL || 'http://localhost:3001';

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function testLiveApi() {
  const live = await fetchJson('/health/live');
  const ready = await fetchJson('/health/ready');
  const health = await fetchJson('/health');
  return { live, ready, health };
}

async function testDbDownSimulation() {
  const badPool = new pg.Pool({
    host: '127.0.0.1',
    port: 59999,
    database: 'invalid',
    user: 'x',
    password: 'x',
    connectionTimeoutMillis: 2000,
  });
  const app = express();
  app.use(createHealthRouter({ pool: badPool, redisClient: null }));

  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, async () => {
      const port = server.address().port;
      try {
        const res = await fetch(`http://127.0.0.1:${port}/health/ready`);
        const body = await res.json();
        resolve({ status: res.status, body });
      } catch (err) {
        resolve({ error: err.message });
      } finally {
        server.close();
        await badPool.end().catch(() => {});
      }
    });
  });
}

async function testSlowNetwork() {
  const start = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    await fetch(`${BASE}/api/health`, { signal: controller.signal });
    return { ok: true, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, ms: Date.now() - start, error: err.message };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  console.log('\n=== RESILIENCE TEST ===\n');

  console.log('1) API live/ready/health (dependências reais)');
  const api = await testLiveApi();
  console.log(JSON.stringify(api, null, 2));

  console.log('\n2) Simulação DB indisponível (pool inválido local)');
  const dbDown = await testDbDownSimulation();
  console.log(JSON.stringify(dbDown, null, 2));
  const dbOk = dbDown.status === 503 && dbDown.body?.checks?.database?.ok === false;
  console.log(dbOk ? '✓ Readiness retorna 503 quando DB down' : '✗ Falha simulação DB');

  console.log('\n3) Latência health (rede local)');
  const slow = await testSlowNetwork();
  console.log(JSON.stringify(slow, null, 2));

  console.log('\n4) Recuperação — segunda chamada health');
  const recovery = await fetchJson('/health');
  console.log(JSON.stringify(recovery, null, 2));
  const recovered = recovery.status === 200 && (recovery.body?.ok ?? recovery.body?.status);
  console.log(recovered ? '✓ API recuperada após testes' : '✗ API não respondeu OK');

  process.exit(dbOk && recovered ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
