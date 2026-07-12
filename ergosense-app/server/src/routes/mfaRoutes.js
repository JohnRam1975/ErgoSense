/**
 * Rotas MFA — TOTP setup, enable, disable, verify no login
 */
import { authenticate } from '../middleware/authenticate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { config } from '../config/env.js';
import { apiError, apiSuccess } from '../utils/apiResponse.js';
import {
  createMfaPendingToken,
  disableMfa,
  enableMfa,
  getMfaStatus,
  setupMfa,
  verifyMfaPendingToken,
  verifyMfaToken,
} from '../services/mfa/MfaService.js';
import {
  ACCESS_TTL_SEC,
  generateCsrfToken,
  loadUserForToken,
  mapUserResponse,
  signAccessToken,
  signRefreshToken,
  storeRefreshToken,
} from '../auth/jwt.js';
import { setRefreshCookie, setCsrfCookie } from '../middleware/csrf.js';
import { logSecurityEvent } from '../services/securityAudit.js';
import { sessionService } from '../services/session/SessionService.js';
import { clientIp } from '../supportAuth.js';

export function registerMfaRoutes(app) {
  if (!config.mfa.enabled) return;

  app.get('/api/auth/mfa/status', authenticate, async (req, res) => {
    const status = await getMfaStatus(req.user.id);
    res.json(status);
  });

  app.post('/api/auth/mfa/setup', authenticate, csrfProtection, async (req, res) => {
    try {
      const data = await setupMfa(req.user.id, req.user.email);
      res.json({ success: true, ...data });
    } catch (err) {
      return apiError(res, err.message, 500);
    }
  });

  app.post('/api/auth/mfa/enable', authenticate, csrfProtection, async (req, res) => {
    const token = req.body?.token?.toString()?.trim();
    if (!token) return apiError(res, 'Informe o código TOTP', 400);
    const result = await enableMfa(req.user.id, token, req);
    if (!result.ok) return apiError(res, result.error, 400);
    return apiSuccess(res, { backupCodes: result.backupCodes }, 'MFA ativado');
  });

  app.post('/api/auth/mfa/disable', authenticate, csrfProtection, async (req, res) => {
    const token = req.body?.token?.toString()?.trim();
    if (!token) return apiError(res, 'Informe o código TOTP', 400);
    const result = await disableMfa(req.user.id, token, req);
    if (!result.ok) return apiError(res, result.error, 400);
    return apiSuccess(res, null, 'MFA desativado');
  });

  app.post('/api/auth/mfa/verify', async (req, res) => {
    const pendingToken = req.body?.mfaToken?.toString();
    const code = req.body?.code?.toString()?.trim();
    if (!pendingToken || !code) return apiError(res, 'Token MFA e código são obrigatórios', 400);

    const userId = verifyMfaPendingToken(pendingToken);
    if (!userId) return apiError(res, 'Sessão MFA expirada. Faça login novamente.', 401);

    const valid = await verifyMfaToken(Number(userId), code);
    if (!valid) {
      await logSecurityEvent({ eventType: 'MFA_VERIFY_FAILED', userId: Number(userId), req, statusCode: 401 });
      return apiError(res, 'Código inválido', 401);
    }

    const user = await loadUserForToken(Number(userId));
    if (!user) return apiError(res, 'Usuário inválido', 401);

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const csrfToken = generateCsrfToken();
    const sessionId = await sessionService.create(user.id, { ip: clientIp(req) });

    await storeRefreshToken(user.id, refreshToken, {
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
    });

    setRefreshCookie(res, refreshToken);
    setCsrfCookie(res, csrfToken);

    await logSecurityEvent({
      eventType: 'LOGIN_SUCCESS_MFA',
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      req,
      statusCode: 200,
      details: { sessionId },
    });

    res.json({
      success: true,
      user: mapUserResponse(user),
      accessToken,
      expiresIn: ACCESS_TTL_SEC,
      csrfToken,
      sessionId,
    });
  });
}
