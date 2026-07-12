/**
 * TenantService — gestão multi-tenant SaaS
 */
import { pool, query } from '../db.js';
import { sanitizePlainText, sanitizeEmail } from '../auth/sanitize.js';
import { validatePassword } from '../auth/password.js';
import { mapTenant, slugify } from '../mappers/coreMappers.js';
import {
  PLATFORM_TENANT,
  isSupportActive,
  logSupportAudit,
} from '../supportAuth.js';

export async function listTenantsForUser(user) {
  if (user.role === 'ADMIN_GLOBAL') {
    return listTenantMetadata();
  }
  const { rows } = await query(
    `SELECT tenant_id AS id, nome AS name, industria AS industry, schema_name AS schema,
            icone AS icon, cor AS color, ativo AS active,
            (SELECT COUNT(*)::int FROM colaboradores c WHERE c.tenant_id = t.tenant_id AND c.deleted_at IS NULL) AS employees
     FROM tenants t WHERE deleted_at IS NULL AND tenant_id = $1`,
    [user.tenantId],
  );
  return rows.map(mapTenant);
}

export async function listTenantMetadata() {
  await query(
    `UPDATE tenants SET suporte_autorizado = FALSE, updated_at = NOW()
     WHERE suporte_autorizado = TRUE AND suporte_expira_em IS NOT NULL AND suporte_expira_em <= NOW()`,
  );
  const expired = await query(
    `SELECT tenant_id, nome FROM tenants
     WHERE suporte_autorizado = FALSE AND suporte_expira_em IS NOT NULL
       AND suporte_expira_em <= NOW() AND updated_at > NOW() - INTERVAL '5 seconds'`,
  );
  for (const r of expired.rows) {
    await logSupportAudit({
      tenantId: r.tenant_id,
      tenantNome: r.nome,
      acao: 'SUPORTE_EXPIRADO',
      observacao: 'Expiração automática executada.',
    });
  }
  const { rows } = await query(
    `SELECT t.tenant_id, t.nome, t.plano, t.ativo, t.industria, t.icone, t.cor,
            t.suporte_autorizado, t.suporte_inicio_em, t.suporte_expira_em, t.suporte_autorizado_por,
            (SELECT COUNT(*)::int FROM usuarios u WHERE u.tenant_id = t.tenant_id AND u.deleted_at IS NULL) AS user_count,
            (SELECT COUNT(*)::int FROM colaboradores c WHERE c.tenant_id = t.tenant_id AND c.deleted_at IS NULL) AS employees,
            (SELECT COALESCE(SUM(LENGTH(f.imagem_base64)), 0)::bigint FROM fotos_analise f WHERE f.tenant_id = t.tenant_id) AS storage_bytes
     FROM tenants t
     WHERE t.deleted_at IS NULL AND t.tenant_id != $1
     ORDER BY t.nome`,
    [PLATFORM_TENANT],
  );
  return rows.map((r) => ({
    id: r.tenant_id,
    name: r.nome,
    industry: r.industria ?? '',
    icon: r.icone ?? '🏢',
    color: r.cor ?? 'neutral',
    active: r.ativo,
    plan: r.plano ?? 'Standard',
    userCount: r.user_count ?? 0,
    employees: r.employees ?? 0,
    storageMb: Math.round(Number(r.storage_bytes ?? 0) / (1024 * 1024)),
    supportActive: isSupportActive(r),
    supportStartsAt: r.suporte_inicio_em,
    supportExpiresAt: r.suporte_expira_em,
    supportAuthorizedBy: r.suporte_autorizado_por,
  }));
}

export async function createTenant(body) {
  const {
    nome,
    industria,
    tenantId: rawTenantId,
    adminNome,
    adminEmail,
    adminPassword,
    icone = '🏢',
    cor = 'amber',
  } = body;

  const pwdCheck = validatePassword(adminPassword);
  if (!pwdCheck.ok) {
    const err = new Error(pwdCheck.error);
    err.status = 400;
    throw err;
  }

  let tenantId = (rawTenantId?.trim() || slugify(nome)).slice(0, 48);
  if (!tenantId) tenantId = `empresa_${Date.now()}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query(`SELECT 1 FROM tenants WHERE tenant_id = $1`, [tenantId]);
    if (exists.rows.length) {
      tenantId = `${tenantId}_${Date.now().toString(36).slice(-4)}`;
    }

    const email = sanitizeEmail(adminEmail);
    const emailUsed = await client.query(
      `SELECT 1 FROM usuarios WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );
    if (emailUsed.rows.length) {
      const err = new Error('E-mail do administrador já cadastrado');
      err.status = 409;
      throw err;
    }

    await client.query(
      `INSERT INTO tenants (tenant_id, nome, industria, icone, cor, ativo)
       VALUES ($1, $2, $3, $4, $5, TRUE)`,
      [tenantId, sanitizePlainText(nome, 200), sanitizePlainText(industria, 120), icone, cor],
    );

    await client.query(
      `INSERT INTO usuarios (tenant_id, email, senha_hash, nome, perfil, cargo, ativo)
       VALUES ($1, $2, crypt($3, gen_salt('bf', 10)), $4, 'ADMIN_EMPRESA', 'Administrador', TRUE)`,
      [tenantId, email, adminPassword, sanitizePlainText(adminNome, 200)],
    );

    await client.query(
      `INSERT INTO setores (tenant_id, nome) VALUES ($1, 'Geral'), ($1, 'Operações'), ($1, 'Administrativo')`,
      [tenantId],
    );

    await client.query('COMMIT');
    return {
      tenant: mapTenant({
        id: tenantId,
        name: nome.trim(),
        industry: industria.trim(),
        schema: null,
        icon: icone,
        color: cor,
        active: true,
        employees: 0,
      }),
      adminEmail: email,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
