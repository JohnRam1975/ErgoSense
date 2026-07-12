/**
 * Critérios de Avaliação de Riscos — NR-01 §1.5.4.4.2.2
 */
import { requirePermission } from '../auth/rbac.js';
import { sanitizePlainText } from '../auth/sanitize.js';
import { clientIp } from '../supportAuth.js';
import {
  activateVersion,
  createMethodology,
  createVersion,
  evaluateForTenant,
  getActiveCriteria,
  getActiveDocumentation,
  listAuditTrail,
  listMethodologies,
  listVersions,
} from '../services/riskCriteriaService.js';
import { buildMatrixGrid, normalizeCriteriaConfig } from '../riskInventoryUtils.js';
import { MATRIX_TYPE_PRESETS } from '../riskCriteriaDefaults.js';

export function registerRiskCriteriaRoutes(app, { resolveOperationalTenant }) {
  app.get('/api/risk-criteria/active', requirePermission('risk-criteria:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Critérios de Risco');
    if (!tenantId) return;
    const active = await getActiveCriteria(tenantId);
    res.json({
      methodologyId: active.methodologyId ? String(active.methodologyId) : null,
      versionId: active.versionId ? String(active.versionId) : null,
      versionNumber: active.versionNumber,
      name: active.name,
      description: active.description ?? '',
      matrixType: active.matrixType,
      config: active.config,
      matrix: buildMatrixGrid(active.config),
      activatedAt: active.activatedAt,
      isDefault: active.isDefault ?? false,
    });
  });

  app.get('/api/risk-criteria/documentation', requirePermission('risk-criteria:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Critérios de Risco');
    if (!tenantId) return;
    res.json(await getActiveDocumentation(tenantId));
  });

  app.get('/api/risk-criteria/methodologies', requirePermission('risk-criteria:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Critérios de Risco');
    if (!tenantId) return;
    res.json(await listMethodologies(tenantId));
  });

  app.post('/api/risk-criteria/methodologies', requirePermission('risk-criteria:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Critérios de Risco');
    if (!tenantId) return;
    try {
      const result = await createMethodology(tenantId, req.body, req.user, clientIp(req));
      res.status(201).json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/risk-criteria/methodologies/:id/versions', requirePermission('risk-criteria:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Critérios de Risco');
    if (!tenantId) return;
    const methodologyId = Number(req.params.id);
    if (!methodologyId) return res.status(400).json({ error: 'ID inválido' });
    res.json(await listVersions(tenantId, methodologyId));
  });

  app.post('/api/risk-criteria/methodologies/:id/versions', requirePermission('risk-criteria:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Critérios de Risco');
    if (!tenantId) return;
    const methodologyId = Number(req.params.id);
    if (!methodologyId) return res.status(400).json({ error: 'ID inválido' });
    try {
      const result = await createVersion(tenantId, methodologyId, req.body, req.user, clientIp(req));
      res.status(201).json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post(
    '/api/risk-criteria/methodologies/:id/activate/:versionId',
    requirePermission('risk-criteria:write'),
    async (req, res) => {
      const tenantId = await resolveOperationalTenant(req, res, 'Critérios de Risco');
      if (!tenantId) return;
      const methodologyId = Number(req.params.id);
      const versionId = Number(req.params.versionId);
      if (!methodologyId || !versionId) return res.status(400).json({ error: 'ID inválido' });
      try {
        res.json(await activateVersion(tenantId, methodologyId, versionId, req.user, clientIp(req)));
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    },
  );

  app.post('/api/risk-criteria/evaluate', requirePermission('risk-criteria:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Critérios de Risco');
    if (!tenantId) return;
    const prob = Number(req.body?.probability ?? req.body?.probabilidade);
    const sev = Number(req.body?.severity ?? req.body?.severidade);
    const evaluation = await evaluateForTenant(tenantId, prob, sev);
    if (!evaluation) {
      return res.status(400).json({ error: 'Probabilidade e severidade inválidas para a metodologia vigente' });
    }
    res.json(evaluation);
  });

  app.get('/api/risk-criteria/audit', requirePermission('risk-criteria:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Critérios de Risco');
    if (!tenantId) return;
    const methodologyId = req.query.methodologyId ? Number(req.query.methodologyId) : null;
    const limit = Math.min(200, Number(req.query.limit) || 100);
    res.json(await listAuditTrail(tenantId, { limit, methodologyId }));
  });

  app.get('/api/risk-criteria/presets', requirePermission('risk-criteria:read'), async (_req, res) => {
    res.json(
      Object.entries(MATRIX_TYPE_PRESETS).map(([key, config]) => ({
        matrixType: key,
        label: key === 'PROB_SEV_5X5' ? 'Matriz 5×5 NR-01' : 'Matriz 3×3 simplificada',
        config: normalizeCriteriaConfig(config),
      })),
    );
  });
}
