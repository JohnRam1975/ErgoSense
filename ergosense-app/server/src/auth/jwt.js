/**
 * JWT — Access Token (curto) + Refresh Token (longo, hash no DB)
 */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query } from '../db.js';

const ACCESS_TTL_SEC = config.jwt.accessTtlSec;
const REFRESH_TTL_SEC = config.jwt.refreshTtlSec;

export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
      type: 'access',
    },
    config.jwt.accessSecret,
    { expiresIn: ACCESS_TTL_SEC, issuer: 'ergosense-api', audience: 'ergosense-app' },
  );
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, config.jwt.accessSecret, {
    issuer: 'ergosense-api',
    audience: 'ergosense-app',
  });
  if (payload.type !== 'access') throw new Error('invalid_token_type');
  return payload;
}

export function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      type: 'refresh',
      jti: crypto.randomUUID(),
    },
    config.jwt.refreshSecret,
    { expiresIn: REFRESH_TTL_SEC, issuer: 'ergosense-api', audience: 'ergosense-app' },
  );
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, config.jwt.refreshSecret, {
    issuer: 'ergosense-api',
    audience: 'ergosense-app',
  });
  if (payload.type !== 'refresh') throw new Error('invalid_token_type');
  return payload;
}

export async function storeRefreshToken(userId, rawToken, meta = {}) {
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, expiresAt, meta.ip ?? null, meta.userAgent ?? null],
  );
  return expiresAt;
}

export async function revokeRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
}

export async function revokeAllUserRefreshTokens(userId) {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}

export async function isRefreshTokenValid(rawToken) {
  const tokenHash = hashToken(rawToken);
  const { rows } = await query(
    `SELECT id, user_id, expires_at FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function loadUserForToken(userId) {
  const { rows } = await query(
    `SELECT u.id, u.tenant_id, u.email, u.nome, u.perfil, u.cargo, u.localizacao, t.nome AS tenant_nome
     FROM usuarios u
     JOIN tenants t ON t.tenant_id = u.tenant_id
     WHERE u.id = $1 AND u.ativo = TRUE AND u.deleted_at IS NULL`,
    [userId],
  );
  if (!rows.length) return null;
  const u = rows[0];
  return {
    id: u.id,
    email: u.email,
    name: u.nome,
    role: u.perfil,
    company: u.tenant_nome,
    location: u.localizacao ?? '',
    tenantId: u.tenant_id,
  };
}

export function mapUserResponse(user) {
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    company: user.company,
    location: user.location,
    tenantId: user.tenantId,
  };
}

export { ACCESS_TTL_SEC, REFRESH_TTL_SEC };
