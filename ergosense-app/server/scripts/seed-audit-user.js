/**
 * Seed usuário dedicado para auditoria automatizada
 */
import 'dotenv/config';
import { query } from '../src/db.js';

const AUDIT_EMAIL = process.env.AUDIT_EMAIL ?? 'auditor@ergosense.test';
const AUDIT_PASS = process.env.AUDIT_PASS ?? 'AuditTest!2026';
const TENANT = process.env.AUDIT_TENANT ?? 'acme';

async function main() {
  await query(
    `INSERT INTO tenants (tenant_id, nome, industria, icone, cor, ativo)
     VALUES ($1, 'Acme QA', 'Testes', '🏢', 'cyan', TRUE)
     ON CONFLICT (tenant_id) DO UPDATE SET ativo = TRUE, deleted_at = NULL, updated_at = NOW()`,
    [TENANT],
  );

  const { rows: existing } = await query(`SELECT id FROM usuarios WHERE email = $1`, [AUDIT_EMAIL]);

  if (existing.length) {
    await query(
      `UPDATE usuarios SET senha_hash = crypt($1, gen_salt('bf', 10)), ativo = TRUE, perfil = 'ERGONOMISTA',
         tenant_id = $3, deleted_at = NULL, updated_at = NOW() WHERE email = $2`,
      [AUDIT_PASS, AUDIT_EMAIL, TENANT],
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
