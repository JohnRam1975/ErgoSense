/**
 * Integridade de banco — constraints, órfãos, org tree idempotente
 * Uso: node scripts/db-integrity-test.js
 */
import 'dotenv/config';
import pg from 'pg';
import { ensureEmpresaUnidade, buildOrgTree } from '../src/services/orgUtils.js';

const DATABASE_URL = process.env.DATABASE_URL;
const pool = DATABASE_URL
  ? new pg.Pool({ connectionString: DATABASE_URL })
  : new pg.Pool({
      host: process.env.PGHOST ?? 'localhost',
      port: Number(process.env.PGPORT ?? 5433),
      database: process.env.PGDATABASE ?? 'ergosense',
      user: process.env.PGUSER ?? 'ergosense',
      password: process.env.PGPASSWORD ?? 'ergosense',
    });

const results = { passed: [], failed: [], warnings: [] };

function pass(n, d = '') {
  results.passed.push({ n, d });
  console.log(`✓ ${n}${d ? ` — ${d}` : ''}`);
}
function fail(n, d = '') {
  results.failed.push({ n, d });
  console.error(`✗ ${n}${d ? ` — ${d}` : ''}`);
}
function warn(n, d = '') {
  results.warnings.push({ n, d });
  console.warn(`⚠ ${n}${d ? ` — ${d}` : ''}`);
}

async function q(sql, params = []) {
  return pool.query(sql, params);
}

async function main() {
  console.log('\n=== DB INTEGRITY TEST ===\n');

  try {
    await q('SELECT 1');
    pass('Conexão PostgreSQL');
  } catch (err) {
    fail('Conexão PostgreSQL', err.message);
    process.exit(2);
  }

  // Constraints empresas
  {
    const { rows } = await q(`
      SELECT conname FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'empresas' AND c.contype = 'u'
    `);
    if (rows.some((r) => r.conname.includes('tenant'))) pass('UNIQUE empresas.tenant_id existe');
    else warn('UNIQUE empresas.tenant_id', 'constraint não encontrada por nome');
  }

  // Órfãos colaboradores → tenant
  {
    const { rows } = await q(`
      SELECT COUNT(*)::int AS n FROM colaboradores c
      LEFT JOIN tenants t ON t.tenant_id = c.tenant_id AND t.deleted_at IS NULL
      WHERE t.tenant_id IS NULL AND c.deleted_at IS NULL
    `);
    if (rows[0].n === 0) pass('Colaboradores sem tenant órfão');
    else warn('Colaboradores órfãos', `${rows[0].n} registros`);
  }

  // ensureEmpresaUnidade idempotente (race fix)
  {
    const { rows: tenants } = await q(
      `SELECT tenant_id FROM tenants WHERE deleted_at IS NULL ORDER BY created_at DESC NULLS LAST LIMIT 1`,
    );
    if (!tenants.length) {
      warn('ensureEmpresaUnidade concorrente', 'nenhum tenant para testar');
    } else {
      const tid = tenants[0].tenant_id;
      await Promise.all([
        ensureEmpresaUnidade(q, tid),
        ensureEmpresaUnidade(q, tid),
        ensureEmpresaUnidade(q, tid),
      ]);
      const { rows: emp } = await q(
        `SELECT COUNT(*)::int AS n FROM empresas WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tid],
      );
      if (emp[0].n === 1) pass('ensureEmpresaUnidade concorrente → 1 empresa', tid);
      else fail('ensureEmpresaUnidade concorrente', `${emp[0].n} empresas para ${tid}`);

      await buildOrgTree(tid);
      pass('buildOrgTree após ensure', tid);
    }
  }

  // Migrations table
  {
    const tables = await q(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      AND tablename IN ('tenants','usuarios','tenant_requests','activation_tokens','empresas','unidades')
    `);
    const names = tables.rows.map((r) => r.tablename);
    const required = ['tenants', 'usuarios', 'tenant_requests', 'empresas'];
    const missing = required.filter((t) => !names.includes(t));
    if (!missing.length) pass('Tabelas core onboarding presentes');
    else fail('Tabelas core', `faltam: ${missing.join(', ')}`);
  }

  // Índices performance
  {
    const { rows } = await q(`
      SELECT COUNT(*)::int AS n FROM pg_indexes
      WHERE schemaname = 'public' AND indexname LIKE '%tenant%'
    `);
    if (rows[0].n >= 5) pass('Índices tenant', `${rows[0].n} índices`);
    else warn('Índices tenant', `apenas ${rows[0].n}`);
  }

  await pool.end();

  console.log(`\nPassou: ${results.passed.length} | Falhou: ${results.failed.length} | Avisos: ${results.warnings.length}`);
  process.exit(results.failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
