/**
 * Auditoria onboarding — SIEM + security_audit_log
 */
import { logSecurityEvent } from './securityAudit.js';
import { emitSiemEvent } from './enterpriseAudit.js';

export async function auditOnboarding(eventType, { req, userId, tenantId, requestId, protocolo, details }) {
  emitSiemEvent('tenant_onboarding', {
    event: eventType,
    user_id: userId ?? null,
    tenant_id: tenantId ?? null,
    request_id: requestId ?? null,
    protocolo: protocolo ?? null,
    details: details ?? null,
  });

  await logSecurityEvent({
    eventType,
    userId,
    tenantId,
    req,
    statusCode: 200,
    details: { requestId, protocolo, ...details },
  });
}
