/**
 * CI — migrations + constraints + seed auditor
 */
import 'dotenv/config';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/db.js';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const results = [];

function pass(name, detail = '') {
  results.push({ ok: true, name, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ ok: false, name, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log('\n=== MIGRATIONS CI TEST ===\n');

  try {
    execSync('node scripts/migrate-runner.js', { stdio: 'pipe', cwd: path.join(serverDir, '..') });
    pass('migrate:all');
  } catch (err) {
    fail('migrate:all', String(err.message).slice(0, 150));
  }

  try {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS n FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'`,
    );
    pass('Foreign keys', String(rows[0]?.n ?? 0));
  } catch (err) {
    fail('Foreign keys', err.message);
  }

  try {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS n FROM usuarios u LEFT JOIN tenants t ON t.tenant_id = u.tenant_id WHERE t.tenant_id IS NULL AND u.deleted_at IS NULL`,
    );
    if ((rows[0]?.n ?? 0) === 0) pass('Integridade multi-tenant');
    else fail('Órfãos tenant', String(rows[0].n));
  } catch (err) {
    fail('Multi-tenant', err.message);
  }

  try {
    execSync('node scripts/seed-audit-user.js', { stdio: 'pipe', cwd: path.join(serverDir, '..') });
    pass('Seed auditor');
  } catch (err) {
    fail('Seed auditor', String(err.message).slice(0, 150));
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nPassou: ${results.length - failed} | Falhou: ${failed}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
