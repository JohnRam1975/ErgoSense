/**
 * Rotas onboarding — tenant requests, admin tenants, ativação
 */
import { isGlobalAdmin } from '../auth/rbac.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../validation/validateRequest.js';
import {
  tenantRequestPublicSchema,
  activateAccountSchema,
  tenantRejectSchema,
  tenantAdjustSchema,
  tenantBlockSchema,
  tenantReactivateSchema,
  tenantUpdateSchema,
} from '../validation/schemas.js';
import { requireNumericId } from '../utils/parseId.js';
import { apiSuccess, apiCreated, apiError } from '../utils/apiResponse.js';
import { publicFormRateLimit, criticalApiRateLimit } from '../middleware/rateLimit.js';
import {
  createTenantRequest,
  listTenantRequests,
  getTenantRequestById,
  approveTenantRequest,
  rejectTenantRequest,
  requestAdjustment,
  listAdminTenants,
  getAdminTenant,
  updateAdminTenant,
  blockTenant,
  reactivateTenant,
  suspendTenant,
} from '../services/tenantRequestService.js';
import { activateAccount, getActivationPreview } from '../services/activationService.js';
import { listPlans } from '../services/planService.js';
import { config } from '../config/env.js';

function requireGlobalAdmin(req, res) {
  if (req.user?.role !== 'ADMIN_GLOBAL') {
    apiError(res, 'Acesso restrito ao administrador global.', 403);
    return false;
  }
  return true;
}

export function registerTenantOnboardingRoutes(app) {
  app.post(
    '/api/public/tenant-request',
    publicFormRateLimit,
    validateBody(tenantRequestPublicSchema),
    async (req, res) => {
      try {
        const result = await createTenantRequest(req.validatedBody, req);
        return apiCreated(res, result, `Solicitação registrada. Protocolo: ${result.protocolo}`);
      } catch (err) {
        return apiError(res, err.message, err.status ?? 500);
      }
    },
  );

  app.get('/api/public/plans', async (_req, res) => {
    const plans = await listPlans();
    return apiSuccess(res, plans);
  });

  app.get('/api/auth/activate-account/preview', async (req, res) => {
    const token = req.query.token?.toString();
    if (!token) return apiError(res, 'Token obrigatório', 400);
    const preview = await getActivationPreview(token);
    if (!preview) return apiError(res, 'Token inválido ou expirado', 404);
    return apiSuccess(res, preview);
  });

  app.post(
    '/api/auth/activate-account',
    criticalApiRateLimit,
    validateBody(activateAccountSchema),
    async (req, res) => {
      try {
        const result = await activateAccount({ ...req.validatedBody, req });
        return apiSuccess(res, result, 'Conta ativada com sucesso');
      } catch (err) {
        return apiError(res, err.message, err.status ?? 500);
      }
    },
  );

  app.get('/api/admin/tenant-requests', authenticate, async (req, res) => {
    if (!requireGlobalAdmin(req, res)) return;
    const data = await listTenantRequests({
      status: req.query.status?.toString(),
      search: req.query.search?.toString(),
      from: req.query.from?.toString(),
      to: req.query.to?.toString(),
    });
    return apiSuccess(res, data);
  });

  app.get('/api/admin/tenant-requests/:id', authenticate, async (req, res) => {
    if (!requireGlobalAdmin(req, res)) return;
    const id = requireNumericId(req, res);
    if (id === null) return;
    const item = await getTenantRequestById(id);
    if (!item) return apiError(res, 'Solicitação não encontrada', 404);
    return apiSuccess(res, item);
  });

  app.post('/api/admin/tenant-requests/:id/approve', authenticate, async (req, res) => {
    if (!requireGlobalAdmin(req, res)) return;
    const id = requireNumericId(req, res);
    if (id === null) return;
    try {
      const result = await approveTenantRequest(id, req.user, req, {
        note: req.body?.note,
        appBaseUrl: config.public?.appUrl,
      });
      return apiSuccess(res, result, 'Empresa aprovada e tenant criado');
    } catch (err) {
      return apiError(res, err.message, err.status ?? 500);
    }
  });

  app.post('/api/admin/tenant-requests/:id/reject', authenticate, validateBody(tenantRejectSchema), async (req, res) => {
    if (!requireGlobalAdmin(req, res)) return;
    const id = requireNumericId(req, res);
    if (id === null) return;
    try {
      const result = await rejectTenantRequest(id, req.user, req, req.validatedBody);
      return apiSuccess(res, result, 'Solicitação rejeitada');
    } catch (err) {
      return apiError(res, err.message, err.status ?? 500);
    }
  });

  app.post('/api/admin/tenant-requests/:id/request-adjustment', authenticate, validateBody(tenantAdjustSchema), async (req, res) => {
    if (!requireGlobalAdmin(req, res)) return;
    const id = requireNumericId(req, res);
    if (id === null) return;
    try {
      const result = await requestAdjustment(id, req.user, req, req.validatedBody);
      return apiSuccess(res, result, 'Ajuste solicitado');
    } catch (err) {
      return apiError(res, err.message, err.status ?? 500);
    }
  });

  app.post('/api/admin/tenant-requests/:id/block', authenticate, validateBody(tenantBlockSchema), async (req, res) => {
    if (!requireGlobalAdmin(req, res)) return;
    const id = requireNumericId(req, res);
    if (id === null) return;
    const item = await getTenantRequestById(id);
    if (!item) return apiError(res, 'Solicitação não encontrada', 404);
    if (item.tenantId) {
      try {
        const result = await blockTenant(item.tenantId, req.user, req, req.validatedBody);
        return apiSuccess(res, result, 'Empresa bloqueada');
      } catch (err) {
        return apiError(res, err.message, err.status ?? 500);
      }
    }
    return apiError(res, 'Solicitação ainda não possui tenant', 400);
  });

  app.get('/api/admin/tenants', authenticate, async (req, res) => {
    if (!requireGlobalAdmin(req, res)) return;
    const filter = req.query.filter?.toString() ?? 'all';
    const data = await listAdminTenants(filter);
    return apiSuccess(res, data);
  });

  app.get('/api/admin/tenants/:id', authenticate, async (req, res) => {
    if (!requireGlobalAdmin(req, res)) return;
    const item = await getAdminTenant(req.params.id);
    if (!item) return apiError(res, 'Empresa não encontrada', 404);
    return apiSuccess(res, item);
  });

  app.put('/api/admin/tenants/:id', authenticate, validateBody(tenantUpdateSchema), async (req, res) => {
    if (!requireGlobalAdmin(req, res)) return;
    try {
      const result = await updateAdminTenant(req.params.id, req.validatedBody, req.user, req);
      return apiSuccess(res, result, 'Empresa atualizada');
    } catch (err) {
      return apiError(res, err.message, err.status ?? 500);
    }
  });

  app.post('/api/admin/tenants/:id/block', authenticate, validateBody(tenantBlockSchema), async (req, res) => {
    if (!requireGlobalAdmin(req, res)) return;
    try {
      const result = await blockTenant(req.params.id, req.user, req, req.validatedBody);
      return apiSuccess(res, result, 'Empresa bloqueada');
    } catch (err) {
      return apiError(res, err.message, err.status ?? 500);
    }
  });

  app.post('/api/admin/tenants/:id/suspend', authenticate, validateBody(tenantBlockSchema), async (req, res) => {
    if (!requireGlobalAdmin(req, res)) return;
    try {
      const result = await suspendTenant(req.params.id, req.user, req, req.validatedBody);
      return apiSuccess(res, result, 'Empresa suspensa');
    } catch (err) {
      return apiError(res, err.message, err.status ?? 500);
    }
  });

  app.post('/api/admin/tenants/:id/reactivate', authenticate, validateBody(tenantReactivateSchema), async (req, res) => {
    if (!requireGlobalAdmin(req, res)) return;
    try {
      const result = await reactivateTenant(req.params.id, req.user, req);
      return apiSuccess(res, result, 'Empresa reativada');
    } catch (err) {
      return apiError(res, err.message, err.status ?? 500);
    }
  });
}
