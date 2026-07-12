/**
 * Logs estruturados SIEM-ready (ELK, Splunk, Datadog).
 */
import { config } from '../config/env.js';

export function emitSiemEvent(eventType, fields = {}) {
  const entry = {
    '@timestamp': new Date().toISOString(),
    service: config.observability.serviceName,
    env: config.nodeEnv,
    event_type: eventType,
    ...fields,
  };
  console.log(JSON.stringify(entry));
}

export function emitAuditTrail({ action, userId, tenantId, module, resource, details, req }) {
  emitSiemEvent('audit_trail', {
    action,
    user_id: userId ?? null,
    tenant_id: tenantId ?? null,
    module: module ?? null,
    resource: resource ?? null,
    ip: req?.ip ?? null,
    path: req?.path ?? null,
    method: req?.method ?? null,
    user_agent: req?.headers?.['user-agent']?.slice(0, 256) ?? null,
    details: details ?? null,
  });
}

export function emitAiAudit({ action, tenantId, userId, provider, tokens, req }) {
  emitSiemEvent('ai_audit', {
    action,
    tenant_id: tenantId,
    user_id: userId,
    provider,
    tokens,
    ip: req?.ip ?? null,
  });
}

export function emitSecurityEvent({ eventType, userId, tenantId, email, statusCode, req, details }) {
  emitSiemEvent('security', {
    security_event: eventType,
    user_id: userId ?? null,
    tenant_id: tenantId ?? null,
    email: email ?? null,
    status_code: statusCode ?? null,
    ip: req?.ip ?? null,
    path: req?.path ?? null,
    details: details ?? null,
  });
}
