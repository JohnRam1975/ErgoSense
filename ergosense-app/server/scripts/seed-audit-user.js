/**
 * Seed usuário dedicado para auditoria automatizada
 */
import 'dotenv/config';
import { query } from '../src/db.js';

const AUDIT_EMAIL = process.env.AUDIT_EMAIL ?? 'auditor@ergosense.test';
const AUDIT_PASS = process.env.AUDIT_PASS ?? 'AuditTest!2026';
const TENANT = process.env.AUDIT_TENANT ?? 'vale';

async function main() {
  const { rows: tenants } = await query(`SELECT tenant_id FROM tenants WHERE tenant_id = $1`, [TENANT]);
  if (!tenants.length) {
    console.error(`Tenant ${TENANT} não encontrado`);
    process.exit(1);
  }

  const { rows: existing } = await query(`SELECT id FROM usuarios WHERE email = $1`, [AUDIT_EMAIL]);

  if (existing.length) {
    await query(
      `UPDATE usuarios SET senha_hash = crypt($1, gen_salt('bf', 10)), ativo = TRUE, perfil = 'ERGONOMISTA', deleted_at = NULL WHERE email = $2`,
      [AUDIT_PASS, AUDIT_EMAIL],
    );
    console.log(`✓ Auditor atualizado: ${AUDIT_EMAIL}`);
  } else {
    await query(
      `INSERT INTO usuarios (tenant_id, email, nome, senha_hash, perfil, cargo, ativo)
       VALUES ($1, $2, 'Auditor QA', crypt($3, gen_salt('bf', 10)), 'ERGONOMISTA', 'Auditor QA', TRUE)`,
      [TENANT, AUDIT_EMAIL, AUDIT_PASS],
    );
    console.log(`✓ Auditor criado: ${AUDIT_EMAIL}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
