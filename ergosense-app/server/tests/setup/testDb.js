/**

 * Setup DB para testes de integração — Testcontainers ou Postgres local (ergosense).

 * Nunca apaga o banco inteiro; usa prefixo tenant `itest-*` para isolamento lógico.

 */

import { execSync } from 'child_process';

import fs from 'fs';

import path from 'path';

import { fileURLToPath } from 'url';

import { PostgreSqlContainer } from '@testcontainers/postgresql';

import { reconfigurePool, closePool, query } from '../../src/db.js';

import { createApp } from '../../src/app.js';

import { seedIntegrationFixtures, cleanupIntegrationFixtures } from '../fixtures/tenants.js';



const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const baseSchemaPath = path.join(serverRoot, '../../docs/database/postgresql-schema.sql');



let container = null;

let app = null;

let dbReady = false;

let skipReason = '';

let setupPromise = null;

let teardownRegistered = false;



/** @deprecated use isIntegrationReady() + guardIntegration(t) após setupIntegration() */

export function skipIntegration() {

  return dbReady ? false : skipReason || 'Banco indisponível para integração';

}



export function isIntegrationReady() {

  return dbReady;

}



export function integrationSkipReason() {

  return skipReason || 'Banco indisponível para integração';

}



export function getApp() {

  if (!app) throw new Error('App não inicializado — chame setupIntegration()');

  return app;

}



function syncPgEnv(config) {

  process.env.PGHOST = String(config.host);

  process.env.PGPORT = String(config.port);

  process.env.PGDATABASE = String(config.database);

  process.env.PGUSER = String(config.user);

  process.env.PGPASSWORD = String(config.password ?? '');

}



async function tryConnect(config) {

  syncPgEnv(config);

  await reconfigurePool({ ...config, max: 5 });

  await query('SELECT 1');

}



async function ensureBaseSchema() {

  const { rows } = await query(`SELECT to_regclass('public.tenants') AS t`);

  if (rows[0]?.t) return;



  if (!fs.existsSync(baseSchemaPath)) {

    throw new Error(`Schema base não encontrado: ${baseSchemaPath}`);

  }



  await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  const sql = fs.readFileSync(baseSchemaPath, 'utf8');

  await query(sql);

}



async function ensureLegacyColumns() {

  await query(`

    ALTER TABLE usuarios

      ADD COLUMN IF NOT EXISTS cargo VARCHAR(255),

      ADD COLUMN IF NOT EXISTS localizacao VARCHAR(255);

  `);

}



async function runMigrations() {

  execSync('node scripts/migrate-runner.js', {

    cwd: serverRoot,

    stdio: 'pipe',

    env: { ...process.env },

  });

  await reconfigurePool({

    host: process.env.PGHOST,

    port: Number(process.env.PGPORT),

    database: process.env.PGDATABASE,

    user: process.env.PGUSER,

    password: process.env.PGPASSWORD,

    max: 5,

  });

}



function registerProcessTeardown() {

  if (teardownRegistered) return;

  teardownRegistered = true;

  process.on('beforeExit', () => {

    teardownIntegration().catch(() => {});

  });

}



async function doSetup() {

  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  process.env.MFA_ENABLED = process.env.MFA_ENABLED ?? 'false';

  process.env.RATE_LIMIT_SKIP_DEV = 'true';

  process.env.CACHE_ENABLED = 'true';



  const useContainer = process.env.INTEGRATION_USE_TESTCONTAINERS === '1';

  let dbConfig;



  if (useContainer) {

    container = await new PostgreSqlContainer('postgres:17-alpine').start();

    dbConfig = {

      host: container.getHost(),

      port: container.getMappedPort(5432),

      database: container.getDatabase(),

      user: container.getUsername(),

      password: container.getPassword(),

    };

  } else {

    dbConfig = {

      host: process.env.PGHOST || 'localhost',

      port: Number(process.env.PGPORT || 5433),

      database: process.env.PGDATABASE || 'ergosense',

      user: process.env.PGUSER || 'postgres',

      password: process.env.PGPASSWORD || '',

    };

  }



  await tryConnect(dbConfig);

  await ensureBaseSchema();

  await ensureLegacyColumns();

  await runMigrations();

  await seedIntegrationFixtures();

  app = await createApp();

  dbReady = true;

  registerProcessTeardown();

}



export async function setupIntegration() {

  if (dbReady) return;

  if (!setupPromise) {

    setupPromise = doSetup().catch((err) => {

      skipReason = err.message;

      dbReady = false;

      console.warn('[integration] skip:', skipReason);

      setupPromise = null;

    });

  }

  await setupPromise;

}



export async function teardownIntegration() {

  if (dbReady) {

    await cleanupIntegrationFixtures().catch(() => {});

  }

  app = null;

  dbReady = false;

  setupPromise = null;

  await closePool().catch(() => {});

  if (container) {

    await container.stop().catch(() => {});

    container = null;

  }

}


