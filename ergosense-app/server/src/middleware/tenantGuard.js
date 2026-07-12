/**
 * Isolamento multi-tenant — tenantId sempre do JWT, nunca spoofável
 */
import { PLATFORM_TENANT } from '../supportAuth.js';
import { isGlobalAdmin } from '../auth/rbac.js';
import { logSecurityEvent } from '../services/securityAudit.js';

/**
 * Resolve tenant efetivo para a operação.
 * Usuários normais: sempre req.user.tenantId (ignora query/body).
 * ADMIN_GLOBAL: query/body permitido apenas com suporte ativo (validado em assertGlobalOperationalAccess).
 */
export function resolveTenantId(req, requestedTenantId) {
  const user = req.user;
  if (!user) return null;

  if (!isGlobalAdmin(user)) {
    return user.tenantId;
  }

  return requestedTenantId || user.tenantId;
}

export function enforceTenantAccess(req, res, requestedTenantId) {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Autenticação necessária' });
    return null;
  }

  const effectiveTenant = resolveTenantId(req, requestedTenantId);

  if (!isGlobalAdmin(user) && effectiveTenant !== user.tenantId) {
    logSecurityEvent({
      eventType: 'TENANT_VIOLATION',
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      req,
      statusCode: 403,
      details: { requested: requestedTenantId, effective: effectiveTenant },
    });
    res.status(403).json({ error: 'Acesso restrito ao seu tenant.' });
    return null;
  }

  if (effectiveTenant === PLATFORM_TENANT && isGlobalAdmin(user)) {
    res.status(403).json({ error: 'Acesso não autorizado.' });
    return null;
  }

  return effectiveTenant;
}

export function getRequestedTenantId(req) {
  return (
    req.query.tenantId?.toString() ||
    req.body?.tenantId?.toString() ||
    req.params?.tenantId?.toString() ||
    null
  );
}
