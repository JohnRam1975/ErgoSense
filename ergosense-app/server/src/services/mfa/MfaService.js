/**
 * MFA TOTP — setup, verificação e QR Code.
 */
import crypto from 'crypto';
import { generateSecret, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { query } from '../../db.js';
import { config } from '../../config/env.js';
import { emitSecurityEvent } from '../enterpriseAudit.js';

const APP_NAME = 'ErgoSensePro';

function encryptSecret(plain) {
  const key = crypto.createHash('sha256').update(config.mfa.encryptionKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function decryptSecret(stored) {
  if (!stored) return null;
  const [ivHex, tagHex, dataHex] = stored.split(':');
  const key = crypto.createHash('sha256').update(config.mfa.encryptionKey).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(dataHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}

export async function getMfaStatus(userId) {
  const { rows } = await query(
    `SELECT mfa_enabled FROM usuarios WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  return { enabled: rows[0]?.mfa_enabled === true };
}

export async function setupMfa(userId, email) {
  const secret = generateSecret();
  const otpauth = generateURI({ issuer: APP_NAME, label: email, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  await query(
    `UPDATE usuarios SET mfa_secret_encrypted = $2, mfa_enabled = FALSE, updated_at = NOW() WHERE id = $1`,
    [userId, encryptSecret(secret)],
  );

  return { secret, otpauthUrl: otpauth, qrDataUrl };
}

export async function enableMfa(userId, token, req) {
  const { rows } = await query(
    `SELECT mfa_secret_encrypted FROM usuarios WHERE id = $1`,
    [userId],
  );
  const secret = decryptSecret(rows[0]?.mfa_secret_encrypted);
  if (!secret || !(await verify({ token, secret }))) {
    emitSecurityEvent({ eventType: 'MFA_ENABLE_FAILED', userId, req, statusCode: 400 });
    return { ok: false, error: 'Código inválido' };
  }

  const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
  await query(
    `UPDATE usuarios SET mfa_enabled = TRUE, mfa_backup_codes = $2, updated_at = NOW() WHERE id = $1`,
    [userId, JSON.stringify(backupCodes)],
  );

  emitSecurityEvent({ eventType: 'MFA_ENABLED', userId, req, statusCode: 200 });
  return { ok: true, backupCodes };
}

export async function disableMfa(userId, token, req) {
  const valid = await verifyMfaToken(userId, token);
  if (!valid) {
    emitSecurityEvent({ eventType: 'MFA_DISABLE_FAILED', userId, req, statusCode: 400 });
    return { ok: false, error: 'Código inválido' };
  }
  await query(
    `UPDATE usuarios SET mfa_enabled = FALSE, mfa_secret_encrypted = NULL, mfa_backup_codes = NULL, updated_at = NOW() WHERE id = $1`,
    [userId],
  );
  emitSecurityEvent({ eventType: 'MFA_DISABLED', userId, req, statusCode: 200 });
  return { ok: true };
}

export async function verifyMfaToken(userId, token) {
  const { rows } = await query(
    `SELECT mfa_secret_encrypted, mfa_backup_codes FROM usuarios WHERE id = $1 AND mfa_enabled = TRUE`,
    [userId],
  );
  if (!rows.length) return false;

  const secret = decryptSecret(rows[0].mfa_secret_encrypted);
  if (secret && (await verify({ token, secret }))) return true;

  const codes = rows[0].mfa_backup_codes ?? [];
  const idx = codes.indexOf(token);
  if (idx >= 0) {
    codes.splice(idx, 1);
    await query(`UPDATE usuarios SET mfa_backup_codes = $2 WHERE id = $1`, [userId, JSON.stringify(codes)]);
    return true;
  }
  return false;
}

export async function userRequiresMfa(userId) {
  const { rows } = await query(
    `SELECT mfa_enabled FROM usuarios WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  return rows[0]?.mfa_enabled === true;
}

export function createMfaPendingToken(userId) {
  const payload = { sub: userId, purpose: 'mfa_pending', exp: Math.floor(Date.now() / 1000) + 300 };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', config.mfa.pendingSecret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyMfaPendingToken(token) {
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', config.mfa.pendingSecret).update(data).digest('base64url');
  if (sig !== expected) return null;
  const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (payload.purpose !== 'mfa_pending') return null;
  return payload.sub;
}
