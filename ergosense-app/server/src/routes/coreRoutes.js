/**
 * Rotas core — setores, colaboradores, análises, relatórios
 */
import { query } from '../db.js';
import { sanitizePlainText } from '../auth/sanitize.js';
import { requirePermission } from '../auth/rbac.js';
import { repairPortugueseText } from '../textEncoding.js';
import { ensureEmpresaUnidade } from '../services/orgUtils.js';
import {
  listCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
} from '../services/collaboratorService.js';
import {
  listAnalyses,
  createAnalysis,
  deleteAnalysis,
  getAnalysisVideo,
  listReports,
} from '../services/analysisService.js';
import { validateBody } from '../validation/validateRequest.js';
import { collaboratorSchema, sectorSchema, accessRequestSchema, analysisSchema, contactSupportSchema } from '../validation/schemas.js';
import { apiSuccess, apiCreated, apiError } from '../utils/apiResponse.js';
import { sanitizeEmail } from '../auth/sanitize.js';
import { createSupportContact } from '../services/contactSupportService.js';
import { config } from '../config/env.js';
import { clientIp } from '../supportAuth.js';

export function registerCoreRoutes(app, { resolveOperationalTenant, publicFormRateLimit }) {
  app.get('/api/sectors', requirePermission('sectors:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Setores');
    if (!tenantId) return;
    await ensureEmpresaUnidade(query, tenantId);
    const { rows } = await query(
      `SELECT s.id, s.nome, s.unidade_id, u.nome AS unidade_nome
       FROM setores s
       LEFT JOIN unidades u ON u.id = s.unidade_id
       WHERE s.tenant_id = $1 AND s.deleted_at IS NULL ORDER BY s.nome`,
      [tenantId],
    );
    return apiSuccess(
      res,
      rows.map((r) => ({
        id: String(r.id),
        name: repairPortugueseText(r.nome),
        unitId: r.unidade_id ? String(r.unidade_id) : null,
        unitName: r.unidade_nome ? repairPortugueseText(r.unidade_nome) : null,
      })),
    );
  });

  app.post('/api/sectors', requirePermission('sectors:create'), validateBody(sectorSchema), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Setores');
    if (!tenantId) return;
    const { nome } = req.validatedBody;
    const safeNome = sanitizePlainText(nome, 120);
    const { unidade } = await ensureEmpresaUnidade(query, tenantId);
    const { rows } = await query(
      `INSERT INTO setores (tenant_id, unidade_id, nome) VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, nome) DO UPDATE SET unidade_id = COALESCE(setores.unidade_id, EXCLUDED.unidade_id), updated_at = NOW()
       RETURNING id, nome, unidade_id`,
      [tenantId, unidade.id, safeNome],
    );
    if (!rows.length) {
      const existing = await query(
        `SELECT id, nome FROM setores WHERE tenant_id = $1 AND nome = $2 LIMIT 1`,
        [tenantId, safeNome],
      );
      return apiSuccess(res, { id: String(existing.rows[0].id), name: existing.rows[0].nome });
    }
    return apiCreated(res, { id: String(rows[0].id), name: rows[0].nome });
  });

  app.post('/api/access-requests', publicFormRateLimit, validateBody(accessRequestSchema), async (req, res) => {
    const { nome, email, funcao, matricula, tenantId } = req.validatedBody;
    const { rows } = await query(
      `INSERT INTO solicitacoes_acesso (tenant_id, nome, email, funcao, matricula, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDENTE')
       RETURNING id, status, created_at`,
      [
        tenantId ?? null,
        sanitizePlainText(nome, 200),
        sanitizeEmail(email),
        sanitizePlainText(funcao, 120),
        sanitizePlainText(matricula, 64),
      ],
    );
    return apiCreated(res, rows[0]);
  });

  app.get('/api/public/support-contact', (_req, res) => {
    return apiSuccess(res, {
      supportEmail: config.support.contactEmail,
      subjects: [
        'Dúvida sobre o produto',
        'Problema de acesso / login',
        'Solicitação comercial',
        'LGPD / privacidade',
        'Outro',
      ],
    });
  });

  app.post(
    '/api/public/support-contact',
    publicFormRateLimit,
    validateBody(contactSupportSchema),
    async (req, res) => {
      try {
        const result = await createSupportContact(req.validatedBody, {
          ip: clientIp(req),
          userAgent: req.headers['user-agent']?.toString()?.slice(0, 512) ?? null,
        });
        return apiCreated(
          res,
          result,
          `Mensagem enviada ao suporte (${result.supportEmail}). Protocolo: ${result.protocolo}`,
        );
      } catch (err) {
        return apiError(res, err.message, err.status ?? 500);
      }
    },
  );
  app.get('/api/collaborators', requirePermission('collaborators:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Colaboradores');
    if (!tenantId) return;
    const data = await listCollaborators(tenantId);
    return apiSuccess(res, data);
  });

  app.post(
    '/api/collaborators',
    requirePermission('collaborators:create'),
    validateBody(collaboratorSchema),
    async (req, res) => {
      const tenantId = await resolveOperationalTenant(req, res, 'Colaboradores');
      if (!tenantId) return;
      try {
        const collab = await createCollaborator(tenantId, req.validatedBody);
        return apiCreated(res, collab);
      } catch (err) {
        return apiError(res, err.message, err.status ?? 500);
      }
    },
  );

  app.put(
    '/api/collaborators/:id',
    requirePermission('collaborators:update'),
    validateBody(collaboratorSchema),
    async (req, res) => {
      const id = Number(req.params.id);
      const tenantId = await resolveOperationalTenant(req, res, 'Colaboradores');
      if (!tenantId) return;
      try {
        const collab = await updateCollaborator(tenantId, id, req.validatedBody);
        if (!collab) return apiError(res, 'Colaborador não encontrado', 404);
        return apiSuccess(res, collab);
      } catch (err) {
        return apiError(res, err.message, err.status ?? 500);
      }
    },
  );

  app.delete(
    '/api/collaborators/:id',
    requirePermission('collaborators:delete'),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return apiError(res, 'ID inválido', 400);
      const tenantId = await resolveOperationalTenant(req, res, 'Colaboradores');
      if (!tenantId) return;
      try {
        const result = await deleteCollaborator(tenantId, id);
        if (!result) return apiError(res, 'Colaborador não encontrado', 404);
        return apiSuccess(res, result, 'Colaborador excluído');
      } catch (err) {
        return apiError(res, err.message, err.status ?? 500);
      }
    },
  );

  app.get('/api/analyses', requirePermission('analyses:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Análises');
    if (!tenantId) return;
    const data = await listAnalyses(tenantId);
    return apiSuccess(res, data);
  });

  app.post(
    '/api/analyses',
    requirePermission('analyses:create'),
    validateBody(analysisSchema),
    async (req, res) => {
      const tenantId = await resolveOperationalTenant(req, res, 'Análises');
      if (!tenantId) return;
      try {
        const result = await createAnalysis(tenantId, { ...req.body, ...req.validatedBody }, req.user);
        return apiCreated(res, result);
      } catch (err) {
        console.error(JSON.stringify({ level: 'error', msg: 'create_analysis_failed', error: err.message }));
        return apiError(res, err.message, err.status ?? 500);
      }
    },
  );

  app.delete('/api/analyses/:id', requirePermission('analyses:delete'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Análises');
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (!id) return apiError(res, 'ID inválido', 400);
    const deleted = await deleteAnalysis(tenantId, id);
    if (!deleted) return apiError(res, 'Análise não encontrada', 404);
    return apiSuccess(res, { id: String(id) }, 'Análise removida');
  });

  app.get('/api/analyses/:id/video', requirePermission('analyses:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Análises');
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (!id) return apiError(res, 'ID inválido', 400);

    try {
      const video = await getAnalysisVideo(tenantId, id);
      if (!video) return apiError(res, 'Gravação não encontrada', 404);

      const ext = video.formato || (video.mimeType.includes('mp4') ? 'mp4' : 'webm');
      res.setHeader('Content-Type', video.mimeType);
      res.setHeader('Content-Length', video.buffer.length);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('Content-Disposition', `inline; filename="analise-${id}.${ext}"`);
      if (video.duracaoSeg != null) res.setHeader('X-Video-Duration-Secs', String(video.duracaoSeg));
      return res.send(video.buffer);
    } catch (err) {
      return apiError(res, err.message, 500);
    }
  });

  app.get('/api/reports', requirePermission('reports:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Relatórios');
    if (!tenantId) return;
    const data = await listReports(tenantId);
    return apiSuccess(res, data);
  });
}
