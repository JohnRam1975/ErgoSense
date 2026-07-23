/**
 * Migration runner — ordem determinística com schema_migrations
 *
 * Uso:
 *   node scripts/migrate-runner.js              # aplica pendentes
 *   node scripts/migrate-runner.js --status      # lista aplicadas / pendentes
 *   node scripts/migrate-runner.js --down 1      # reverte N migrações (requer down SQL ou aborta)
 *
 * Rollback seguro em produção: preferir restore do backup pré-deploy (infra/scripts).
 * --down só executa se existir docs/database/migrations/down/<name>.sql e não for backup_only.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = __dirname;
const BASE_SCHEMA = join(__dirname, '../../../docs/database/postgresql-schema-full.sql');
const DOWN_DIR = join(__dirname, '../../../docs/database/migrations/down');

export const ORDERED_MIGRATIONS = [
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
  'migrate-contato-suporte.js',
  'migrate-password-reset.js',
];

function parseArgs(argv) {
  const args = { status: false, down: 0 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--status') args.status = true;
    if (argv[i] === '--down') {
      args.down = Math.max(1, Number(argv[i + 1]) || 1);
      i++;
    }
  }
  return args;
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(128) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    ALTER TABLE schema_migrations
      ADD COLUMN IF NOT EXISTS rollback_mode VARCHAR(32),
      ADD COLUMN IF NOT EXISTS rolled_back_at TIMESTAMPTZ
  `);
}

/** Aplica schema base se o banco estiver vazio (CI / Postgres alpine sem initdb seed). */
async function ensureBaseSchema(client) {
  const { rows } = await client.query(`SELECT to_regclass('public.usuarios') AS rel`);
  if (rows[0]?.rel) return;
  if (!existsSync(BASE_SCHEMA)) {
    throw new Error(`Schema base não encontrado: ${BASE_SCHEMA}`);
  }
  console.log('RUN: postgresql-schema-full.sql (base)');
  const sql = readFileSync(BASE_SCHEMA, 'utf8');
  await client.query(sql);
  console.log('OK: postgresql-schema-full.sql');
}

async function isApplied(client, name) {
  const { rows } = await client.query(
    `SELECT 1 FROM schema_migrations WHERE name = $1 AND rolled_back_at IS NULL`,
    [name],
  );
  return rows.length > 0;
}

async function markApplied(client, name) {
  await client.query(
    `INSERT INTO schema_migrations (name, rollback_mode)
     VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET applied_at = NOW(), rolled_back_at = NULL, rollback_mode = EXCLUDED.rollback_mode`,
    [name, downModeFor(name)],
  );
}

function downSqlPath(name) {
  const base = name.replace(/\.js$/, '');
  return join(DOWN_DIR, `${base}.sql`);
}

function downModeFor(name) {
  const path = downSqlPath(name);
  if (!existsSync(path)) return 'backup_only';
  const body = readFileSync(path, 'utf8');
  if (/ROLLBACK_MODE:\s*backup_only/i.test(body)) return 'backup_only';
  return 'sql';
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

async function listStatus(client) {
  const { rows } = await client.query(
    `SELECT name, applied_at, rollback_mode, rolled_back_at
     FROM schema_migrations
     ORDER BY applied_at ASC, id ASC`,
  );
  const applied = new Set(rows.filter((r) => !r.rolled_back_at).map((r) => r.name));
  console.log('\n=== MIGRATION STATUS ===\n');
  for (const name of ORDERED_MIGRATIONS) {
    const mode = downModeFor(name);
    const state = applied.has(name) ? 'APPLIED' : 'PENDING';
    console.log(`${state.padEnd(8)}  down=${mode.padEnd(12)}  ${name}`);
  }
  console.log(`\nAplicadas ativas: ${applied.size} / ${ORDERED_MIGRATIONS.length}`);
}

async function runDown(client, count) {
  if (process.env.ALLOW_DESTRUCTIVE_ROLLBACK !== 'true') {
    throw new Error(
      'Rollback SQL bloqueado. Defina ALLOW_DESTRUCTIVE_ROLLBACK=true ou use infra/scripts/db-restore (recomendado em produção).',
    );
  }

  const { rows } = await client.query(
    `SELECT name FROM schema_migrations
     WHERE rolled_back_at IS NULL
     ORDER BY applied_at DESC, id DESC
     LIMIT $1`,
    [count],
  );

  if (!rows.length) {
    console.log('Nenhuma migration ativa para reverter.');
    return;
  }

  for (const { name } of rows) {
    const mode = downModeFor(name);
    if (mode !== 'sql') {
      throw new Error(
        `Migration ${name} é rollback_mode=${mode}. Use restore do backup pré-deploy (infra/scripts/db-restore).`,
      );
    }
    const path = downSqlPath(name);
    const sql = readFileSync(path, 'utf8');
    console.log(`DOWN: ${name}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(`UPDATE schema_migrations SET rolled_back_at = NOW() WHERE name = $1`, [name]);
      await client.query('COMMIT');
      console.log(`OK DOWN: ${name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }
}

async function runUp(client) {
  const available = new Set(readdirSync(SCRIPTS_DIR).filter((f) => f.startsWith('migrate-') && f.endsWith('.js')));

  await ensureBaseSchema(client);

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
}

async function main() {
  const args = parseArgs(process.argv);
  const client = await pool.connect();

  try {
    await ensureMigrationTable(client);

    if (args.status) {
      await listStatus(client);
      return;
    }
    if (args.down > 0) {
      await runDown(client, args.down);
      return;
    }
    await runUp(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
