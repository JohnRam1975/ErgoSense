/**
 * ErgoSense AI Expert — rotas REST
 */
import { requirePermission } from '../auth/rbac.js';
import { isProviderConfigured } from '../config/aiConfig.js';
import { listAiExpertAudit, mapAiExpertAuditRow } from '../services/aiExpertAudit.js';
import {
  analyzeErgonomicData,
  analyzePsicossocial,
  askExpert,
  expertRecommendations,
  expertRiskAnalysis,
  generateAET,
  generateAuditReport,
  generateComplianceReport,
  generateExecutiveReport,
  generatePGR,
  generateRiskInventory,
  generateTechnicalReport,
  generateWorkInstruction,
  proposeControlMeasures,
  runVirtualAudit,
} from '../services/AIExpertService.js';
import { listSpecialists, runSpecialist } from '../services/aiEngine/index.js';
import { publishJob, QUEUES } from '../services/queue/QueueService.js';
import { criticalApiRateLimit } from '../middleware/rateLimit.js';

function aiUnavailable(res) {
  return res.status(503).json({
    error: 'Serviço de IA não configurado.',
    hint: 'Configure AI_PROVIDER e a chave correspondente no .env do servidor.',
  });
}

function parseBody(req) {
  return {
    prompt: req.body?.prompt,
    modules: req.body?.modules,
    entityRefs: req.body?.entityRefs ?? {},
    options: req.body?.options ?? {},
  };
}

function handleExpertError(res, err, action) {
  console.error(`[AI Expert] ${action}:`, err);
  const msg = err?.message ?? 'Erro interno no serviço de IA.';
  const isTimeout = /timeout|timed out|ETIMEDOUT|AbortError/i.test(msg);
  res.status(isTimeout ? 504 : 400).json({ error: msg });
}

export function registerAiExpertRoutes(app, { resolveOperationalTenant }) {
  app.get('/api/ai/expert/history', requirePermission('ai:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await listAiExpertAudit(tenantId, limit);
    res.json(rows.map(mapAiExpertAuditRow));
  });

  app.post('/api/ai/expert/query', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      const { prompt, modules, entityRefs } = parseBody(req);
      const result = await askExpert(tenantId, req.user, { prompt, modules, entityRefs });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/analyze-ergonomics', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      const body = parseBody(req);
      res.json(await analyzeErgonomicData(tenantId, req.user, body));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/control-measures', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      const body = parseBody(req);
      res.json(await proposeControlMeasures(tenantId, req.user, body));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/aet', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      const body = parseBody(req);
      res.json(await generateAET(tenantId, req.user, body));
    } catch (err) {
      handleExpertError(res, err, 'GERAR_AET');
    }
  });

  app.post('/api/ai/expert/work-instruction', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      const body = parseBody(req);
      res.json(await generateWorkInstruction(tenantId, req.user, {
        ...body,
        aetSummary: req.body?.aetSummary,
      }));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/risk-inventory', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      const body = parseBody(req);
      res.json(await generateRiskInventory(tenantId, req.user, body));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/pgr', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      const body = parseBody(req);
      res.json(await generatePGR(tenantId, req.user, body));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/reports/executive', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      res.json(await generateExecutiveReport(tenantId, req.user, parseBody(req)));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/reports/technical', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      res.json(await generateTechnicalReport(tenantId, req.user, parseBody(req)));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/reports/audit', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      res.json(await generateAuditReport(tenantId, req.user, parseBody(req)));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/reports/compliance', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      res.json(await generateComplianceReport(tenantId, req.user, parseBody(req)));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/psicossocial', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      res.json(await analyzePsicossocial(tenantId, req.user, parseBody(req)));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/virtual-audit', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      res.json(await runVirtualAudit(tenantId, req.user, parseBody(req)));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/recommendations', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      res.json(await expertRecommendations(tenantId, req.user, parseBody(req)));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/ai/expert/risk-analysis', requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Expert');
    if (!tenantId) return;
    try {
      res.json(await expertRiskAnalysis(tenantId, req.user, parseBody(req)));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/ai/engine/specialists', requirePermission('ai:read'), (_req, res) => {
    res.json(listSpecialists());
  });

  app.post('/api/ai/engine/run', criticalApiRateLimit, requirePermission('ai:query'), async (req, res) => {
    if (!isProviderConfigured()) return aiUnavailable(res);
    const tenantId = await resolveOperationalTenant(req, res, 'AI Engine');
    if (!tenantId) return;
    const specialistId = req.body?.specialistId?.toString();
    const action = req.body?.action?.toString() ?? 'analyze';
    if (!specialistId) return res.status(400).json({ error: 'specialistId é obrigatório' });
    try {
      res.json(
        await runSpecialist({
          specialistId,
          tenantId,
          userId: req.user.id,
          action,
          params: req.body?.params ?? {},
          req,
        }),
      );
    } catch (err) {
      handleExpertError(res, err, 'engine/run');
    }
  });

  app.post('/api/ai/engine/queue/:jobType', criticalApiRateLimit, requirePermission('ai:query'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AI Engine Queue');
    if (!tenantId) return;
    const map = {
      aet: QUEUES.AI.GERAR_AET,
      pgr: QUEUES.AI.GERAR_PGR,
      gro: QUEUES.AI.GERAR_GRO,
      relatorio: QUEUES.AI.GERAR_RELATORIO,
      plano: QUEUES.AI.GERAR_PLANO_ACAO,
    };
    const queue = map[req.params.jobType];
    if (!queue) return res.status(400).json({ error: 'jobType inválido' });
    const result = await publishJob(queue, {
      tenantId,
      userId: req.user.id,
      params: req.body ?? {},
      requestedAt: new Date().toISOString(),
    });
    res.status(202).json(result);
  });
}
