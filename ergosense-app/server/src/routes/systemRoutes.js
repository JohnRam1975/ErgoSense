/**
 * Endpoints de sistema — status operacional (sem expor segredos).
 */
import { requirePermission } from '../auth/rbac.js';
import { getServiceStatus } from '../services/AIProviderService.js';

export function registerSystemRoutes(app) {
  app.get('/api/system/ai-status', requirePermission('ai:read'), (_req, res) => {
    res.json(getServiceStatus());
  });
}
