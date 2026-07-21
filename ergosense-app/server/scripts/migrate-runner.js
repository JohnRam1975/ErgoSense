/**
 * Migration runner — ordem determinística com schema_migrations
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = __dirname;

const ORDERED_MIGRATIONS = [
  'migrate-security.js',
  'migrate-load-assessment.js',
  'migrate-load-effort.js',
  'migrate-support-access.js',
  'migrate-v2-modules.js',
  'migrate-risk-inventory.js',
  'migrate-gro-cycle.js',
  'migrate-pgr.js',
  'migrate-psicossocial.js',
  'migrate-aet.js',
  'migrate-sst.js',
  'migrate-esocial.js',
  'migrate-esocial-transmissions.js',
  'migrate-compliance.js',
  'migrate-risk-integration.js',
  'migrate-org-structure.js',
  'migrate-aet-corporate.js',
  'migrate-compliance-intelligence.js',
  'migrate-inventario-nr01.js',
  'migrate-denuncia.js',
  'migrate-gro-criterios.js',
  'migrate-analise-video.js',
  'migrate-storage-external.js',
  'migrate-performance-indexes.js',
  'migrate-psico-campanha-links.js',
  'migrate-enterprise.js',
  'migrate-tenant-onboarding.js',
  'migrate-autonomo-cadastro.js',
  'migrate-autonomo-senha.js',
];

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(128) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function isApplied(client, name) {
  const { rows } = await client.query(`SELECT 1 FROM schema_migrations WHERE name = $1`, [name]);
  return rows.length > 0;
}

async function markApplied(client, name) {
  await client.query(`INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name]);
}

async function runMigration(name) {
  const path = join(SCRIPTS_DIR, name);
  const result = spawnSync(process.execPath, [path], {
    stdio: 'inherit',
    cwd: join(SCRIPTS_DIR, '..'),
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`Migration falhou: ${name}`);
  }
}

async function main() {
  const available = new Set(readdirSync(SCRIPTS_DIR).filter((f) => f.startsWith('migrate-') && f.endsWith('.js')));
  const client = await pool.connect();

  try {
    await ensureMigrationTable(client);

    for (const name of ORDERED_MIGRATIONS) {
      if (!available.has(name)) {
        console.warn(`SKIP (arquivo ausente): ${name}`);
        continue;
      }
      if (await isApplied(client, name)) {
        console.log(`SKIP (já aplicada): ${name}`);
        continue;
      }

      console.log(`RUN: ${name}`);
      await runMigration(name);
      await markApplied(client, name);
      console.log(`OK: ${name}`);
    }

    console.log('Migration runner: concluído');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
