/**
 * Rotas de autenticação — login, refresh, logout
 */
import { config } from '../config/env.js';
import { query } from '../db.js';
import {
  ACCESS_TTL_SEC,
  generateCsrfToken,
  isRefreshTokenValid,
  loadUserForToken,
  mapUserResponse,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  signAccessToken,
  signRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
} from '../auth/jwt.js';
import { validatePassword } from '../auth/password.js';
import { sanitizeEmail } from '../auth/sanitize.js';
import { validateBody } from '../validation/validateRequest.js';
import { loginSchema } from '../validation/schemas.js';
import { apiError, apiSuccess } from '../utils/apiResponse.js';
import { csrfProtection, clearAuthCookies, setCsrfCookie, setRefreshCookie } from '../middleware/csrf.js';
import { authenticate } from '../middleware/authenticate.js';
import { countRecentFailedLogins, logSecurityEvent, recordLoginAttempt } from '../services/securityAudit.js';
import { clientIp } from '../supportAuth.js';
import {
  createMfaPendingToken,
  userRequiresMfa,
} from '../services/mfa/MfaService.js';
import { sessionService } from '../services/session/SessionService.js';
import { emitSecurityEvent } from '../services/enterpriseAudit.js';

const MAX_FAILED_LOGINS = 10;

export function registerAuthRoutes(app, { loginRateLimit }) {
  app.post('/api/auth/login', loginRateLimit, validateBody(loginSchema), async (req, res) => {
    try {
    const { email: rawEmail, password } = req.validatedBody;
    const email = sanitizeEmail(rawEmail);

    const failed = await countRecentFailedLogins(email);
    if (failed >= MAX_FAILED_LOGINS) {
      await logSecurityEvent({
        eventType: 'LOGIN_LOCKED',
        email,
        req,
        statusCode: 429,
      });
      return apiError(res, 'Conta temporariamente bloqueada. Tente novamente em 15 minutos.', 429);
    }

    const { rows } = await query(
      `SELECT u.id, u.tenant_id, u.email, u.nome, u.perfil, u.cargo, u.localizacao,
              u.pendente_ativacao,
              t.nome AS tenant_nome, t.bloqueado, t.status_conta, t.bloqueado_motivo
       FROM usuarios u
       JOIN tenants t ON t.tenant_id = u.tenant_id
       WHERE u.email = $1 AND u.senha_hash = crypt($2, u.senha_hash) AND u.ativo = TRUE AND u.deleted_at IS NULL
       LIMIT 1`,
      [email, password],
    );

    if (!rows.length) {
      await recordLoginAttempt(email, false, req);
      await logSecurityEvent({
        eventType: 'LOGIN_FAILED',
        email,
        req,
        statusCode: 401,
      });
      return apiError(res, 'Credenciais inválidas', 401);
    }

    const u = rows[0];

    if (u.pendente_ativacao) {
      return apiError(res, 'Conta pendente de ativação. Acesse o link enviado por e-mail.', 403);
    }

    if (u.bloqueado || ['BLOQUEADO', 'SUSPENSO', 'EXPIRADO'].includes(u.status_conta)) {
      await logSecurityEvent({
        eventType: 'LOGIN_TENANT_BLOCKED',
        email,
        tenantId: u.tenant_id,
        req,
        statusCode: 403,
        details: { status: u.status_conta, reason: u.bloqueado_motivo },
      });
      return apiError(res, 'Acesso da empresa suspenso ou bloqueado. Contate o suporte.', 403);
    }
    await query('UPDATE usuarios SET ultimo_login = NOW(), updated_at = NOW() WHERE id = $1', [u.id]);
    await recordLoginAttempt(email, true, req);

    const user = {
      id: u.id,
      email: u.email,
      name: u.nome,
      role: u.perfil,
      company: u.tenant_nome,
      location: u.localizacao ?? '',
      tenantId: u.tenant_id,
    };

    if (config.mfa.enabled && (await userRequiresMfa(user.id))) {
      const mfaToken = createMfaPendingToken(user.id);
      await logSecurityEvent({
        eventType: 'LOGIN_MFA_REQUIRED',
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        req,
        statusCode: 200,
      });
      return res.json({
        success: true,
        mfaRequired: true,
        mfaToken,
        user: { email: user.email, name: user.name },
      });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const csrfToken = generateCsrfToken();

    await storeRefreshToken(user.id, refreshToken, {
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
    });

    const sessionId = await sessionService.create(user.id, { ip: clientIp(req) });

    setRefreshCookie(res, refreshToken);
    setCsrfCookie(res, csrfToken);

    await logSecurityEvent({
      eventType: 'LOGIN_SUCCESS',
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      req,
      statusCode: 200,
      details: { sessionId },
    });
    emitSecurityEvent({
      eventType: 'LOGIN_SUCCESS',
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      statusCode: 200,
      req,
    });

    res.json({
      success: true,
      user: mapUserResponse(user),
      accessToken,
      expiresIn: ACCESS_TTL_SEC,
      csrfToken,
    });
    } catch (err) {
      console.error(JSON.stringify({ level: 'error', msg: 'login_failed', error: err.message }));
      return apiError(res, 'Erro ao processar login', 500);
    }
  });

  app.post('/api/auth/refresh', csrfProtection, async (req, res) => {
    const rawRefresh = req.cookies?.[config.security.refreshCookieName];
    if (!rawRefresh) {
      return res.status(401).json({ error: 'Refresh token ausente' });
    }

    try {
      const payload = verifyRefreshToken(rawRefresh);
      const stored = await isRefreshTokenValid(rawRefresh);
      if (!stored || stored.user_id !== Number(payload.sub)) {
        return res.status(401).json({ error: 'Refresh token inválido' });
      }

      const user = await loadUserForToken(stored.user_id);
      if (!user || user.email !== payload.email) {
        return res.status(401).json({ error: 'Usuário inválido' });
      }

      await revokeRefreshToken(rawRefresh);

      const accessToken = signAccessToken(user);
      const newRefresh = signRefreshToken(user);
      const csrfToken = generateCsrfToken();

      await storeRefreshToken(user.id, newRefresh, {
        ip: clientIp(req),
        userAgent: req.headers['user-agent'],
      });

      setRefreshCookie(res, newRefresh);
      setCsrfCookie(res, csrfToken);

      await logSecurityEvent({
        eventType: 'TOKEN_REFRESH',
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        req,
        statusCode: 200,
      });

      res.json({
        user: mapUserResponse(user),
        accessToken,
        expiresIn: ACCESS_TTL_SEC,
        csrfToken,
      });
    } catch {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
    }
  });

  app.post('/api/auth/logout', authenticate, csrfProtection, async (req, res) => {
    const rawRefresh = req.cookies?.[config.security.refreshCookieName];
    if (rawRefresh) {
      await revokeRefreshToken(rawRefresh);
    }
    if (req.user?.id) {
      await sessionService.destroyAllForUser(req.user.id);
      await logSecurityEvent({
        eventType: 'LOGOUT',
        userId: req.user.id,
        tenantId: req.user.tenantId,
        email: req.user.email,
        req,
        statusCode: 200,
      });
      emitSecurityEvent({
        eventType: 'LOGOUT',
        userId: req.user.id,
        tenantId: req.user.tenantId,
        email: req.user.email,
        statusCode: 200,
        req,
      });
    }
    clearAuthCookies(res);
    return apiSuccess(res, null, 'Logout realizado');
  });
}

export { validatePassword };
