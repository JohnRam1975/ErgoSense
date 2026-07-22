/**
 * Remove tenants/usuários de demonstração (Vale, Gerdau, etc.).
 * Idempotente — seguro rodar em todo boot se PURGE_DEMO_TENANTS=true.
 */
import 'dotenv/config';
import { query, pool } from '../src/db.js';

const DEMO_TENANTS = ['vale', 'gerdau', 'porto', 'usiminas'];
const DEMO_EMAILS = [
  'lucas@vale.com.br',
  'admin@vale.com.br',
  'admin@ergosense.com.br',
];

async function main() {
  const enabled = String(process.env.PURGE_DEMO_TENANTS ?? 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('[purge-demo] skipped (PURGE_DEMO_TENANTS=false)');
    return;
  }

  const emails = await query(
    `UPDATE usuarios SET ativo = FALSE, updated_at = NOW()
     WHERE email = ANY($1::text[])
     RETURNING email`,
    [DEMO_EMAILS],
  );
  console.log(`[purge-demo] deactivated users: ${emails.rows.map((r) => r.email).join(', ') || '(none)'}`);

  // Soft-delete se coluna existir; senão hard-delete do tenant row após limpar FKs leves
  const cols = await query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = 'tenants' AND column_name = 'deleted_at'`,
  );
  if (cols.rows.length) {
    const r = await query(
      `UPDATE tenants SET deleted_at = COALESCE(deleted_at, NOW()), ativo = FALSE, updated_at = NOW()
       WHERE tenant_id = ANY($1::text[])
       RETURNING tenant_id`,
      [DEMO_TENANTS],
    );
    console.log(`[purge-demo] soft-deleted tenants: ${r.rows.map((x) => x.tenant_id).join(', ') || '(none)'}`);
  } else {
    const r = await query(
      `UPDATE tenants SET ativo = FALSE, updated_at = NOW()
       WHERE tenant_id = ANY($1::text[])
       RETURNING tenant_id`,
      [DEMO_TENANTS],
    );
    console.log(`[purge-demo] deactivated tenants: ${r.rows.map((x) => x.tenant_id).join(', ') || '(none)'}`);
  }
}

main()
  .catch((err) => {
    console.error('[purge-demo] failed', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
