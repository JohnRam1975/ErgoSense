import { query } from './db.js';

export const PLATFORM_TENANT = 'ergosense';
export const SUPPORT_DURATIONS = { '1h': 1, '24h': 24, '7d': 168 };

export function getAuthenticatedUser(req) {
  return req.user ?? null;
}

export function clientIp(req) {
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export async function expireSupportIfNeeded(tenantId) {
  const row = await query(
    `SELECT tenant_id, nome, suporte_autorizado, suporte_expira_em
     FROM tenants WHERE tenant_id = $1 AND suporte_autorizado = TRUE
       AND suporte_expira_em IS NOT NULL AND suporte_expira_em <= NOW()`,
    [tenantId],
  );
  if (!row.rows.length) return;

  await query(
    `UPDATE tenants SET suporte_autorizado = FALSE, updated_at = NOW() WHERE tenant_id = $1`,
    [tenantId],
  );

  await logSupportAudit({
    tenantId,
    tenantNome: row.rows[0].nome,
    acao: 'SUPORTE_EXPIRADO',
    observacao: 'Expiração automática executada.',
  });
}

export async function getTenantSupportRow(tenantId) {
  await expireSupportIfNeeded(tenantId);
  const { rows } = await query(
    `SELECT tenant_id, nome, plano, ativo, suporte_autorizado, suporte_inicio_em,
            suporte_expira_em, suporte_autorizado_por, suporte_motivo
     FROM tenants WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );
  return rows[0] ?? null;
}

export function isSupportActive(row) {
  if (!row?.suporte_autorizado) return false;
  if (!row.suporte_expira_em) return false;
  return new Date(row.suporte_expira_em) > new Date();
}

/**
 * Valida acesso operacional com isolamento multi-tenant.
 * Usuários não-globais: apenas seu tenantId (ignora parâmetro se diferente).
 */
export async function assertGlobalOperationalAccess(req, res, requestedTenantId, modulo = 'Dados operacionais') {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Autenticação necessária' });
    return false;
  }

  if (user.role !== 'ADMIN_GLOBAL') {
    if (requestedTenantId && requestedTenantId !== user.tenantId) {
      res.status(403).json({ error: 'Acesso restrito ao seu tenant.' });
      return false;
    }
    return true;
  }

  const tenantId = requestedTenantId || user.tenantId;
  if (tenantId === PLATFORM_TENANT) {
    res.status(403).json({ error: 'Acesso não autorizado pelo administrador da empresa.' });
    return false;
  }

  const row = await getTenantSupportRow(tenantId);
  if (!isSupportActive(row)) {
    res.status(403).json({ error: 'Acesso não autorizado pelo administrador da empresa.' });
    return false;
  }

  await logSupportAudit({
    tenantId,
    tenantNome: row.nome,
    usuarioGlobal: user.name || user.email,
    acao: 'SUPORTE_ACESSO',
    modulo,
    ip: clientIp(req),
  });
  return true;
}

export async function assertTenantAdmin(req, res, tenantId) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Autenticação necessária',
      error: 'Autenticação necessária',
    });
    return null;
  }
  const allowed = user.role === 'ADMIN_EMPRESA' || user.role === 'ADMIN_GLOBAL';
  if (!allowed) {
    const msg =
      'Apenas o administrador da empresa (perfil ADMIN_EMPRESA) pode autorizar ou revogar o suporte da plataforma.';
    res.status(403).json({ success: false, message: msg, error: msg });
    return null;
  }
  if (user.role === 'ADMIN_EMPRESA' && user.tenantId !== tenantId) {
    const msg = 'Acesso restrito ao seu tenant.';
    res.status(403).json({ success: false, message: msg, error: msg });
    return null;
  }
  return user;
}

export async function logSupportAudit({
  tenantId,
  tenantNome,
  usuarioAutorizador,
  usuarioGlobal,
  acao,
  modulo,
  ip,
  observacao,
}) {
  await query(
    `INSERT INTO auditoria_suporte
       (tenant_id, tenant_nome, usuario_autorizador, usuario_global, acao, modulo, ip, observacao)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      tenantId,
      tenantNome ?? null,
      usuarioAutorizador ?? null,
      usuarioGlobal ?? null,
      acao,
      modulo ?? null,
      ip ?? null,
      observacao ?? null,
    ],
  );
}

export function mapSupportStatus(row, userCount = 0) {
  const active = isSupportActive(row);
  return {
    tenantId: row.tenant_id,
    tenantName: row.nome,
    plan: row.plano ?? 'Standard',
    active: row.ativo,
    userCount,
    supportAuthorized: active,
    supportStartsAt: row.suporte_inicio_em ? new Date(row.suporte_inicio_em).toISOString() : null,
    supportExpiresAt: row.suporte_expira_em ? new Date(row.suporte_expira_em).toISOString() : null,
    authorizedBy: row.suporte_autorizado_por ?? null,
    reason: row.suporte_motivo ?? null,
  };
}
