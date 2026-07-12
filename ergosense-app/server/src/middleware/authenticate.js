/**
 * Autenticação JWT — elimina confiança em headers X-ErgoSense-*
 */
import { verifyAccessToken, loadUserForToken } from '../auth/jwt.js';
import { config } from '../config/env.js';
import { logSecurityEvent } from '../services/securityAudit.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    await logSecurityEvent({
      eventType: 'AUTH_MISSING',
      req,
      statusCode: 401,
      details: { reason: 'no_bearer_token' },
    });
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const token = authHeader.slice(7).trim();
  try {
    const payload = verifyAccessToken(token);
    const user = await loadUserForToken(Number(payload.sub));
    if (!user || user.email !== payload.email || user.role !== payload.role) {
      await logSecurityEvent({
        eventType: 'AUTH_INVALID',
        email: payload.email,
        req,
        statusCode: 401,
        details: { reason: 'user_mismatch' },
      });
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (err) {
    await logSecurityEvent({
      eventType: 'AUTH_INVALID',
      req,
      statusCode: 401,
      details: { reason: err.name ?? 'verify_failed' },
    });
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

/** Autenticação opcional para rotas híbridas */
export async function authenticateOptional(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  return authenticate(req, res, next);
}

export function metricsAuth(req, res, next) {
  const token = config.observability.metricsToken;
  if (!token && config.nodeEnv !== 'production') return next();
  if (!token) {
    return res.status(401).json({ error: 'Metrics authentication required' });
  }

  const auth = req.headers.authorization;
  const queryToken = req.query.token?.toString();
  if (auth === `Bearer ${token}` || queryToken === token) {
    return next();
  }
  return res.status(401).json({ error: 'Metrics authentication required' });
}
