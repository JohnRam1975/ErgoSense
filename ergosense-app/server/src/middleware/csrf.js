/**
 * CSRF — proteção para endpoints que usam cookies (refresh token)
 */
import { config } from '../config/env.js';

export function csrfProtection(req, res, next) {
  if (!config.security.csrfEnabled) return next();

  const cookieToken = req.cookies?.[config.security.csrfCookieName];
  const headerToken = req.headers['x-csrf-token']?.toString();

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF token inválido' });
  }
  next();
}

export function setCsrfCookie(res, token) {
  res.cookie(config.security.csrfCookieName, token, {
    httpOnly: false,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: config.jwt.refreshTtlSec * 1000,
    path: '/',
  });
}

export function setRefreshCookie(res, refreshToken) {
  res.cookie(config.security.refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: config.jwt.refreshTtlSec * 1000,
    path: '/api/auth',
  });
}

export function clearAuthCookies(res) {
  res.clearCookie(config.security.refreshCookieName, { path: '/api/auth' });
  res.clearCookie(config.security.csrfCookieName, { path: '/' });
}
