import pg from 'pg';
import { config } from './config/env.js';

const { Pool } = pg;

function buildPoolConfig(overrides = {}) {
  return {
    host: overrides.host ?? config.db.host,
    port: overrides.port ?? config.db.port,
    database: overrides.database ?? config.db.database,
    user: overrides.user ?? config.db.user,
    password: overrides.password ?? config.db.password,
    max: overrides.max ?? config.db.poolMax,
    idleTimeoutMillis: overrides.idleTimeoutMillis ?? config.db.poolIdleMs,
    client_encoding: 'UTF8',
  };
}

export let pool = new Pool(buildPoolConfig());

export async function query(text, params) {
  return pool.query(text, params);
}

/** Reconfigura pool (testes de integração / Testcontainers). */
export async function reconfigurePool(overrides = {}) {
  if (pool) {
    await pool.end().catch(() => {});
  }
  pool = new Pool(buildPoolConfig(overrides));
}

export async function closePool() {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
  }
}
