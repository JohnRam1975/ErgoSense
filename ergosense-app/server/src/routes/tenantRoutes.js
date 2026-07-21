/**
 * Rotas de tenants — SaaS multi-tenant
 */
import { isGlobalAdmin } from '../auth/rbac.js';
import { listTenantsForUser, createTenant } from '../services/tenantService.js';
import { validateBody } from '../validation/validateRequest.js';
import { createTenantSchema } from '../validation/schemas.js';
import { apiSuccess, apiCreated, apiError } from '../utils/apiResponse.js';

export function registerTenantRoutes(app, { publicFormRateLimit }) {
  app.get('/api/tenants', async (req, res) => {
    const user = req.user;
    if (!user) return apiError(res, 'Autenticação necessária', 401);
    const data = await listTenantsForUser(user);
    return apiSuccess(res, data);
  });

  app.post(
    '/api/tenants',
    publicFormRateLimit,
    validateBody(createTenantSchema),
    async (req, res) => {
      if (!isGlobalAdmin(req.user)) {
        return apiError(res, 'Apenas administrador global pode cadastrar empresas', 403);
      }
      try {
        const result = await createTenant(req.validatedBody);
        return apiCreated(res, result, 'Empresa cadastrada com sucesso');
      } catch (err) {
        return apiError(res, err.message, err.status ?? 500);
      }
    },
  );
}
