/**
 * Recuperação de senha — e-mail validado → token → redefinição (uso único).
 */
import { pool, query } from '../db.js';
import { validatePassword } from '../auth/password.js';
import { sanitizeEmail } from '../auth/sanitize.js';
import { revokeAllUserRefreshTokens } from '../auth/jwt.js';
import { config } from '../config/env.js';
import { sendPasswordResetEmail } from './emailNotificationService.js';
import { logSecurityEvent } from './securityAudit.js';
import { sessionService } from './session/SessionService.js';
import { generateToken, hashToken } from '../utils/secureToken.js';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

function buildResetUrl(token) {
  const base = config.public.appUrl || 'http://localhost:5173';
  return `${base.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

async function findActiveUserByEmail(email) {
  const { rows } = await query(
    `SELECT u.id, u.tenant_id, u.email, u.nome, u.pendente_ativacao,
            t.bloqueado, t.status_conta
     FROM usuarios u
     LEFT JOIN tenants t ON t.tenant_id = u.tenant_id
     WHERE u.email = $1 AND u.ativo = TRUE AND u.deleted_at IS NULL
     LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
}

/**
 * Valida e-mail cadastrado e gera token de redefinição.
 * Retorna o token em claro para o fluxo in-app (nova senha + confirmação).
 */
export async function requestPasswordReset({ email: rawEmail, req }) {
  const email = sanitizeEmail(rawEmail);
  if (!email || !email.includes('@')) {
    const err = new Error('Informe um e-mail válido');
    err.status = 400;
    throw err;
  }

  const user = await findActiveUserByEmail(email);

  if (!user || user.pendente_ativacao) {
    await logSecurityEvent({
      eventType: 'PASSWORD_RESET_REQUESTED',
      email,
      req,
      statusCode: 404,
      details: { matched: false },
    });
    const err = new Error('E-mail não cadastrado ou conta inativa');
    err.status = 404;
    throw err;
  }

  if (user.bloqueado || ['BLOQUEADO', 'SUSPENSO', 'EXPIRADO', 'INATIVO'].includes(user.status_conta)) {
    await logSecurityEvent({
      eventType: 'PASSWORD_RESET_REQUESTED',
      email,
      tenantId: user.tenant_id,
      userId: user.id,
      req,
      statusCode: 403,
      details: { matched: true, blocked: true },
    });
    const err = new Error('Conta bloqueada. Contate o suporte.');
    err.status = 403;
    throw err;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [user.id],
  );

  await query(
    `INSERT INTO password_reset_tokens (user_id, tenant_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [user.id, user.tenant_id, hashToken(token), expiresAt],
  );

  const resetUrl = buildResetUrl(token);
  const sent = await sendPasswordResetEmail({
    to: user.email,
    name: user.nome,
    resetUrl,
    expiresAt,
  });

  await logSecurityEvent({
    eventType: 'PASSWORD_RESET_REQUESTED',
    email: user.email,
    tenantId: user.tenant_id,
    userId: user.id,
    req,
    statusCode: 200,
    details: { matched: true, delivery: sent.mode },
  });

  return {
    email: user.email,
    name: user.nome,
    token,
    expiresAt,
    message: 'E-mail verificado. Informe a nova senha e confirme com o token.',
    delivery: sent.mode,
    resetUrl,
  };
}

async function loadResetToken(rawToken) {
  const { rows } = await query(
    `SELECT r.*, u.email, u.nome, u.ativo, u.deleted_at, u.pendente_ativacao
     FROM password_reset_tokens r
     JOIN usuarios u ON u.id = r.user_id
     WHERE r.token_hash = $1 AND r.used_at IS NULL AND r.expires_at > NOW()
     LIMIT 1`,
    [hashToken(rawToken)],
  );
  const row = rows[0];
  if (!row || !row.ativo || row.deleted_at || row.pendente_ativacao) return null;
  return row;
}

export async function getPasswordResetPreview(rawToken) {
  const row = await loadResetToken(rawToken);
  if (!row) return null;
  return {
    email: row.email,
    name: row.nome,
    expiresAt: row.expires_at,
  };
}

export async function resetPassword({ token, password, confirmPassword, req }) {
  if (password !== confirmPassword) {
    const err = new Error('Senhas não conferem');
    err.status = 400;
    throw err;
  }

  const pwdCheck = validatePassword(password);
  if (!pwdCheck.ok) {
    const err = new Error(pwdCheck.error);
    err.status = 400;
    throw err;
  }

  const row = await loadResetToken(token);
  if (!row) {
    const err = new Error('Token de redefinição inválido ou expirado');
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE usuarios SET
         senha_hash = crypt($2, gen_salt('bf', 10)),
         updated_at = NOW()
       WHERE id = $1`,
      [row.user_id, password],
    );

    await client.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [row.id]);

    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL AND id <> $2`,
      [row.user_id, row.id],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await revokeAllUserRefreshTokens(row.user_id);
  try {
    await sessionService.destroyAllForUser(row.user_id);
  } catch {
    /* sessions optional */
  }

  await logSecurityEvent({
    eventType: 'PASSWORD_RESET_COMPLETED',
    email: row.email,
    tenantId: row.tenant_id,
    userId: row.user_id,
    req,
    statusCode: 200,
  });

  return { ok: true, email: row.email };
}
