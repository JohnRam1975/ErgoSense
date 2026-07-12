/**
 * Resolução de tenant operacional — JWT + suporte global auditado
 */
import { getRequestedTenantId } from './tenantGuard.js';
import { logSecurityEvent } from '../services/securityAudit.js';
import { assertGlobalOperationalAccess } from '../supportAuth.js';

export async function resolveOperationalTenant(req, res, moduleName) {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: 'Autenticação necessária', error: 'Autenticação necessária' });
    return null;
  }
  const requested = getRequestedTenantId(req) ?? user.tenantId;
  if (!requested) {
    res.status(400).json({ success: false, message: 'tenantId obrigatório', error: 'tenantId obrigatório' });
    return null;
  }
  if (user.role !== 'ADMIN_GLOBAL') {
    if (requested !== user.tenantId) {
      await logSecurityEvent({
        eventType: 'TENANT_VIOLATION',
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        req,
        statusCode: 403,
        details: { requested, module: moduleName },
      });
      res.status(403).json({
        success: false,
        message: 'Acesso restrito ao seu tenant.',
        error: 'Acesso restrito ao seu tenant.',
      });
      return null;
    }
    return user.tenantId;
  }
  if (!(await assertGlobalOperationalAccess(req, res, requested, moduleName))) return null;
  return requested;
}
