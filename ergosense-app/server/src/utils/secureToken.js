/**
 * Tokens opacos — geração e hash SHA-256 (ativação, reset de senha, etc.)
 */
import crypto from 'crypto';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
