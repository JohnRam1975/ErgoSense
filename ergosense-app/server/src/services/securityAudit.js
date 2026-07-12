/**
 * Logs de segurança e auditoria de acessos
 */
import { query } from '../db.js';
import { clientIp } from '../supportAuth.js';

export async function logSecurityEvent({
  eventType,
  userId = null,
  tenantId = null,
  email = null,
  req = null,
  statusCode = null,
  details = null,
}) {
  try {
    const ip = req ? clientIp(req) : null;
    const userAgent = req?.headers?.['user-agent']?.toString().slice(0, 512) ?? null;
    const path = req?.path ?? req?.originalUrl ?? null;
    const method = req?.method ?? null;

    await query(
      `INSERT INTO security_audit_log
         (event_type, user_id, tenant_id, email, ip, user_agent, path, method, status_code, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        eventType,
        userId,
        tenantId,
        email,
        ip,
        userAgent,
        path,
        method,
        statusCode,
        details ? JSON.stringify(details) : null,
      ],
    );
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', msg: 'security_audit_failed', error: err.message }));
  }
}

export async function recordLoginAttempt(email, success, req) {
  try {
    await query(
      `INSERT INTO login_attempts (email, ip, success) VALUES ($1, $2, $3)`,
      [email, clientIp(req), success],
    );
  } catch {
    /* best effort */
  }
}

export async function countRecentFailedLogins(email, windowMinutes = 15) {
  try {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS c FROM login_attempts
       WHERE email = $1 AND success = FALSE
         AND created_at > NOW() - ($2 || ' minutes')::interval`,
      [email, windowMinutes],
    );
    return rows[0]?.c ?? 0;
  } catch {
    return 0;
  }
}
