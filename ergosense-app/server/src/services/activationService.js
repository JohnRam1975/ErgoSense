/**
 * Ativação de conta — token, senha, MFA obrigatório
 */
import crypto from 'crypto';
import { pool, query } from '../db.js';
import { validatePassword } from '../auth/password.js';
import { sanitizeEmail } from '../auth/sanitize.js';
import { setupMfa, enableMfa } from './mfa/MfaService.js';
import { auditOnboarding } from './onboardingAudit.js';
import { config } from '../config/env.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateTempPassword() {
  return crypto.randomBytes(9).toString('base64url').slice(0, 12);
}

export async function createActivationToken(userId, tenantId, client = null, options = {}) {
  const q = client?.query.bind(client) ?? query;
  const token = generateToken();
  const passwordPreset = Boolean(options.passwordPreset);
  const tempPassword = passwordPreset ? null : generateTempPassword();
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  await q(
    `INSERT INTO activation_tokens (user_id, tenant_id, token_hash, temp_password, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tenantId, hashToken(token), tempPassword, expiresAt],
  );

  return { token, tempPassword, expiresAt, passwordPreset };
}

async function loadActivationToken(rawToken) {
  const { rows } = await query(
    `SELECT a.*, u.email, u.nome, u.pendente_ativacao, t.nome AS tenant_nome, t.status_conta
     FROM activation_tokens a
     JOIN usuarios u ON u.id = a.user_id
     JOIN tenants t ON t.tenant_id = a.tenant_id
     WHERE a.token_hash = $1 AND a.used_at IS NULL AND a.expires_at > NOW()
       AND u.deleted_at IS NULL`,
    [hashToken(rawToken)],
  );
  return rows[0] ?? null;
}

export async function getActivationPreview(rawToken) {
  const row = await loadActivationToken(rawToken);
  if (!row) return null;

  const mfa = await setupMfa(row.user_id, row.email);
  return {
    email: row.email,
    name: row.nome,
    companyName: row.tenant_nome,
    qrDataUrl: mfa.qrDataUrl,
    otpauthUrl: mfa.otpauthUrl,
    expiresAt: row.expires_at,
    passwordPreset: row.temp_password == null,
  };
}

export async function activateAccount({ token, password, confirmPassword, mfaCode, req }) {
  const row = await loadActivationToken(token);
  if (!row) {
    const err = new Error('Token de ativação inválido ou expirado');
    err.status = 400;
    throw err;
  }

  const passwordPreset = row.temp_password == null;
  let nextPassword = password;

  if (!passwordPreset) {
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
  } else if (password || confirmPassword) {
    if (password !== confirmPassword) {
      const err = new Error('Senhas não conferem');
      err.status = 400;
      throw err;
    }
    if (password) {
      const pwdCheck = validatePassword(password);
      if (!pwdCheck.ok) {
        const err = new Error(pwdCheck.error);
        err.status = 400;
        throw err;
      }
    }
  }

  const enableResult = await enableMfa(row.user_id, mfaCode, req);
  if (!enableResult.ok) {
    const err = new Error('Código MFA inválido');
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (passwordPreset && !nextPassword) {
      await client.query(
        `UPDATE usuarios SET
           pendente_ativacao = FALSE,
           ativado_em = NOW(),
           mfa_enabled = TRUE,
           ativo = TRUE,
           updated_at = NOW()
         WHERE id = $1`,
        [row.user_id],
      );
    } else {
      await client.query(
        `UPDATE usuarios SET
           senha_hash = crypt($2, gen_salt('bf', 10)),
           pendente_ativacao = FALSE,
           ativado_em = NOW(),
           mfa_enabled = TRUE,
           ativo = TRUE,
           updated_at = NOW()
         WHERE id = $1`,
        [row.user_id, nextPassword],
      );
    }

    // Ativa apenas o usuário (senha + MFA). O status da empresa permanece
    // PENDENTE_ATIVACAO até o admin global liberar o acesso pós-pagamento.

    await client.query(`UPDATE activation_tokens SET used_at = NOW() WHERE id = $1`, [row.id]);

    await client.query('COMMIT');

    await auditOnboarding('TENANT_ACCOUNT_ACTIVATED', {
      req,
      userId: row.user_id,
      tenantId: row.tenant_id,
      details: { email: row.email },
    });

    return { ok: true, email: row.email, tenantId: row.tenant_id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function buildActivationUrl(token, baseUrl) {
  const base = baseUrl || config.public?.appUrl || 'http://localhost:5173';
  return `${base.replace(/\/$/, '')}/activate-account?token=${token}`;
}

export { generateTempPassword };
