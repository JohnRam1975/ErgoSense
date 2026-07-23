/**
 * Factory Express — exportável para Supertest (sem listen).
 */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pool, query } from './db.js';
import { config } from './config/env.js';
import { createHealthRouter } from './health.js';
import { metricsMiddleware, metricsHandler } from './metrics.js';
import { securityMiddleware } from './middleware/security.js';
import { authenticate, metricsAuth } from './middleware/authenticate.js';
import { globalRateLimit, loginRateLimit, publicFormRateLimit } from './middleware/rateLimit.js';
import { getRedisClient } from './redis.js';
import { registerAuthRoutes } from './routes/authRoutes.js';
import { registerRiskInventoryRoutes } from './routes/riskInventoryRoutes.js';
import { registerGroRoutes } from './routes/groRoutes.js';
import { registerPgrRoutes } from './routes/pgrRoutes.js';
import { registerPsicoRoutes } from './routes/psicoRoutes.js';
import { registerAetRoutes } from './routes/aetRoutes.js';
import { registerSstRoutes } from './routes/sstRoutes.js';
import { registerEsocialRoutes } from './routes/esocialRoutes.js';
import { registerComplianceRoutes } from './routes/complianceRoutes.js';
import { registerOrgRoutes } from './routes/orgRoutes.js';
import { registerDenunciaRoutes } from './routes/denunciaRoutes.js';
import { registerRiskCriteriaRoutes } from './routes/riskCriteriaRoutes.js';
import { registerSystemRoutes } from './routes/systemRoutes.js';
import { registerAiExpertRoutes } from './routes/aiExpertRoutes.js';
import { resolveOperationalTenant } from './middleware/resolveOperationalTenant.js';
import { registerCoreRoutes } from './routes/coreRoutes.js';
import { registerTenantRoutes } from './routes/tenantRoutes.js';
import { listTenantMetadata } from './services/tenantService.js';
import { enforceTenantAccess, getRequestedTenantId } from './middleware/tenantGuard.js';
import { tracingMiddleware } from './middleware/tracing.js';
import { dashboardCacheMiddleware } from './middleware/dashboardCache.js';
import { cacheInvalidationMiddleware } from './middleware/cacheInvalidation.js';
import { registerMfaRoutes } from './routes/mfaRoutes.js';
import { registerOpenApiRoutes } from './routes/openapiRoutes.js';
import { registerTenantOnboardingRoutes } from './routes/tenantOnboardingRoutes.js';
import {
  SUPPORT_DURATIONS,
  assertTenantAdmin,
  clientIp,
  getTenantSupportRow,
  logSupportAudit,
  mapSupportStatus,
} from './supportAuth.js';

const PUBLIC_API_PATHS = new Set([
  '/api/health',
  '/api/health/live',
  '/api/health/ready',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/mfa/verify',
  '/api/auth/activate-account',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/openapi.json',
  '/api/docs',
]);

export function normalizeApiPath(req) {
  const p = req.path || '';
  if (p.startsWith('/api/')) return p;
  return `/api${p.startsWith('/') ? '' : '/'}${p}`;
}

export function isPublicApiRoute(req) {
  const path = normalizeApiPath(req);
  if (PUBLIC_API_PATHS.has(path)) return true;
  if (path === '/api/access-requests' && req.method === 'POST') return true;
  if (path === '/api/public/tenant-request' && req.method === 'POST') return true;
  if (path === '/api/public/plans' && req.method === 'GET') return true;
  if (path === '/api/public/support-contact' && (req.method === 'GET' || req.method === 'POST')) return true;
  if (path === '/api/auth/activate-account/preview' && req.method === 'GET') return true;
  if (path === '/api/auth/reset-password/preview' && req.method === 'GET') return true;
  if (path.startsWith('/api/denuncias/public')) return true;
  if (path.startsWith('/api/psico/public/')) return true;
  return false;
}

/**
 * @param {{ extendedHealth?: boolean }} [options]
 */
export async function createApp(options = {}) {
  const app = express();

  if (config.security.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(securityMiddleware);
  app.use(tracingMiddleware);
  app.use(metricsMiddleware);
  app.use(cookieParser());
  app.use(
    cors({
      origin:
        config.security.corsOrigins === '*'
          ? true
          : config.security.corsOrigins.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(globalRateLimit);
  app.use(express.json({ limit: '25mb', type: ['application/json', 'application/json; charset=utf-8'] }));
  app.use((_req, res, next) => {
    const json = res.json.bind(res);
    res.json = (body) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return json(body);
    };
    next();
  });

  app.get('/', (_req, res) => {
    res.json({
      service: 'ErgoSense API',
      message: 'Esta é a API. Abra o aplicativo em http://localhost:5173',
      health: '/api/health',
    });
  });

  app.get('/api/health', async (_req, res) => {
    try {
      await query('SELECT 1');
      res.json({ ok: true, database: config.db.database });
    } catch (err) {
      res.status(503).json({ ok: false, error: err.message });
    }
  });

  app.get('/metrics', metricsAuth, metricsHandler);

  registerAuthRoutes(app, { loginRateLimit });
  registerMfaRoutes(app);
  registerOpenApiRoutes(app);
  registerTenantOnboardingRoutes(app);

  app.use('/api', (req, res, next) => {
    if (isPublicApiRoute(req)) return next();
    return authenticate(req, res, next);
  });

  app.use('/api', dashboardCacheMiddleware());
  app.use('/api', cacheInvalidationMiddleware());

  registerTenantRoutes(app, { publicFormRateLimit });
  registerCoreRoutes(app, { resolveOperationalTenant, publicFormRateLimit });
  registerRiskInventoryRoutes(app, { resolveOperationalTenant });
  registerGroRoutes(app, { resolveOperationalTenant });
  registerPgrRoutes(app, { resolveOperationalTenant });
  registerPsicoRoutes(app, { resolveOperationalTenant });
  registerAetRoutes(app, { resolveOperationalTenant });
  registerSstRoutes(app, { resolveOperationalTenant });
  registerEsocialRoutes(app, { resolveOperationalTenant });
  registerComplianceRoutes(app, { resolveOperationalTenant });
  registerOrgRoutes(app, { resolveOperationalTenant });
  registerDenunciaRoutes(app, { resolveOperationalTenant });
  registerRiskCriteriaRoutes(app, { resolveOperationalTenant });
  registerSystemRoutes(app);
  registerAiExpertRoutes(app, { resolveOperationalTenant });

  app.get('/api/admin/support/active', async (req, res) => {
    const user = req.user;
    if (user?.role !== 'ADMIN_GLOBAL') {
      return res.status(403).json({ error: 'Acesso restrito ao administrador global.' });
    }
    const all = await listTenantMetadata();
    res.json(all.filter((t) => t.supportActive));
  });

  app.get('/api/support/status', async (req, res) => {
    const requested = getRequestedTenantId(req);
    const tenantId = enforceTenantAccess(req, res, requested);
    if (!tenantId) return;
    const row = await getTenantSupportRow(tenantId);
    if (!row) return res.status(404).json({ error: 'Tenant não encontrado' });
    const { rows: uc } = await query(
      `SELECT COUNT(*)::int AS c FROM usuarios WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    res.json(mapSupportStatus(row, uc[0]?.c ?? 0));
  });

  app.post('/api/support/authorize', async (req, res) => {
    const tenantId = req.body?.tenantId?.toString() ?? '';
    const duration = req.body?.duration?.toString() ?? '';
    const reason = req.body?.reason?.toString()?.trim() || null;
    const hours = SUPPORT_DURATIONS[duration];
    if (!tenantId || !hours) {
      return res.status(400).json({ error: 'Informe tenantId e duration (1h, 24h ou 7d)' });
    }
    const user = await assertTenantAdmin(req, res, tenantId);
    if (!user) return;

    const row = await getTenantSupportRow(tenantId);
    if (!row) return res.status(404).json({ error: 'Tenant não encontrado' });

    const ip = clientIp(req);
    const starts = new Date();
    const expires = new Date(starts.getTime() + hours * 3600 * 1000);

    await query(
      `UPDATE tenants SET
         suporte_autorizado = TRUE,
         suporte_inicio_em = $2,
         suporte_expira_em = $3,
         suporte_autorizado_por = $4,
         suporte_autorizado_ip = $5,
         suporte_motivo = $6,
         updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenantId, starts, expires, user.name || user.email, ip, reason],
    );

    const label = duration === '1h' ? '1 hora' : duration === '24h' ? '24 horas' : '7 dias';
    await logSupportAudit({
      tenantId,
      tenantNome: row.nome,
      usuarioAutorizador: user.name || user.email,
      acao: 'SUPORTE_AUTORIZADO',
      ip,
      observacao: `Prazo: ${label}${reason ? ` — ${reason}` : ''}`,
    });

    const updated = await getTenantSupportRow(tenantId);
    const { rows: uc } = await query(
      `SELECT COUNT(*)::int AS c FROM usuarios WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    res.json(mapSupportStatus(updated, uc[0]?.c ?? 0));
  });

  app.post('/api/support/revoke', async (req, res) => {
    const tenantId = req.body?.tenantId?.toString() ?? '';
    if (!tenantId) return res.status(400).json({ error: 'tenantId obrigatório' });
    const user = await assertTenantAdmin(req, res, tenantId);
    if (!user) return;

    const row = await getTenantSupportRow(tenantId);
    if (!row) return res.status(404).json({ error: 'Tenant não encontrado' });

    await query(
      `UPDATE tenants SET
         suporte_autorizado = FALSE,
         suporte_inicio_em = NULL,
         suporte_expira_em = NULL,
         updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenantId],
    );

    await logSupportAudit({
      tenantId,
      tenantNome: row.nome,
      usuarioAutorizador: user.name || user.email,
      acao: 'SUPORTE_REVOGADO',
      ip: clientIp(req),
    });

    res.json({ ok: true });
  });

  app.get('/api/support/audit', async (req, res) => {
    const requested = getRequestedTenantId(req);
    const tenantId = enforceTenantAccess(req, res, requested);
    if (!tenantId) return;
    const user = req.user;
    const isGlobal = user.role === 'ADMIN_GLOBAL';
    const isOwnTenantAdmin = user.role === 'ADMIN_EMPRESA' && user.tenantId === tenantId;
    if (!isGlobal && !isOwnTenantAdmin) {
      return res.status(403).json({ error: 'Sem permissão para ver o histórico.' });
    }
    const { rows } = await query(
      `SELECT id, tenant_id, tenant_nome, usuario_autorizador, usuario_global, acao, modulo,
              data_hora, ip, observacao
       FROM auditoria_suporte WHERE tenant_id = $1 ORDER BY data_hora DESC LIMIT 100`,
      [tenantId],
    );
    res.json(
      rows.map((r) => ({
        id: String(r.id),
        tenantId: r.tenant_id,
        tenantName: r.tenant_nome,
        authorizedBy: r.usuario_autorizador,
        globalUser: r.usuario_global,
        action: r.acao,
        module: r.modulo,
        at: r.data_hora,
        ip: r.ip,
        note: r.observacao,
      })),
    );
  });

  app.use((err, req, res, _next) => {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'unhandled_error',
        path: req.path,
        error: err.message,
        stack: err.stack ?? null,
        trace_id: req.traceId ?? null,
      }),
    );
    if (res.headersSent) return;
    const status = err.status ?? err.statusCode ?? 500;
    res.status(status).json({
      success: false,
      message: status >= 500 ? 'Erro interno do servidor' : err.message || 'Requisição inválida',
      ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { detail: err.message } : {}),
    });
  });

  if (options.extendedHealth) {
    const redisClient = await getRedisClient();
    app.use(createHealthRouter({ pool, redisClient }));
  }

  return app;
}
