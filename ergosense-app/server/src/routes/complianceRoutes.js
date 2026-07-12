/**
 * Compliance Intelligence Engine — MTE · DOU · Fundacentro · eSocial
 */
import { requirePermission } from '../auth/rbac.js';
import { sanitizePlainText } from '../auth/sanitize.js';
import { query } from '../db.js';
import { markAlertRead, runComplianceScan, seedComplianceCatalog, updateAdequationTask, validateDetection } from '../services/complianceMonitor.js';
import { compareNormVersions } from '../services/complianceDiff.js';
import {
  mapAdequationTask,
  mapClientImpact,
  mapSystemImpact,
} from '../services/complianceImpactEngine.js';
import {
  getComplianceSchedule,
  mapScanRun,
  updateComplianceSchedule,
} from '../services/complianceScheduler.js';
import {
  buildComplianceDashboard,
  buildComplianceReport,
  logComplianceHistory,
  mapAlerta,
  mapDeteccao,
  mapFonte,
  mapImpacto,
  mapNorma,
  mapValidacao,
  mapVersao,
} from '../services/complianceUtils.js';

export function registerComplianceRoutes(app, { resolveOperationalTenant }) {
  app.get('/api/compliance/dashboard', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const dash = await buildComplianceDashboard(tenantId);
    const { rows: hist } = await query(`SELECT * FROM compliance_historico WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 15`, [tenantId]);
    res.json({
      ...dash,
      recentHistory: hist.map((h) => ({ id: String(h.id), action: h.acao, entityType: h.entidade_tipo, userName: h.usuario_nome, createdAt: h.created_at })),
    });
  });

  app.get('/api/compliance/fontes', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    await seedComplianceCatalog(tenantId, req.user);
    const { rows } = await query(`SELECT * FROM compliance_fontes WHERE tenant_id = $1 ORDER BY codigo`, [tenantId]);
    res.json(rows.map(mapFonte));
  });

  app.put('/api/compliance/fontes/:code', requirePermission('compliance:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const code = req.params.code?.toUpperCase();
    const { rows } = await query(
      `UPDATE compliance_fontes SET ativo = COALESCE($3, ativo), intervalo_horas = COALESCE($4, intervalo_horas), updated_at = NOW()
       WHERE tenant_id = $1 AND codigo = $2 RETURNING *`,
      [tenantId, code, req.body?.active ?? null, req.body?.intervalHours ?? null],
    );
    if (!rows.length) return res.status(404).json({ error: 'Fonte não encontrada' });
    res.json(mapFonte(rows[0]));
  });

  app.post('/api/compliance/scan', requirePermission('compliance:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const result = await runComplianceScan(tenantId, req.user, { fontes: req.body?.sources });
    res.json({ ...result, message: 'Varredura concluída — alterações pendentes de validação humana' });
  });

  app.get('/api/compliance/normas', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT n.*, v.numero_versao, v.tipo_alteracao, v.data_publicacao AS ver_pub, v.validada
       FROM compliance_normas n LEFT JOIN compliance_norma_versoes v ON v.id = n.versao_atual_id
       WHERE n.tenant_id = $1 AND n.deleted_at IS NULL ORDER BY n.codigo`, [tenantId],
    );
    res.json(rows.map((r) => mapNorma(r, r.numero_versao ? { number: r.numero_versao, changeType: r.tipo_alteracao, publishedAt: r.ver_pub, validated: r.validada } : null)));
  });

  app.get('/api/compliance/normas/:id/versoes', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT * FROM compliance_norma_versoes WHERE tenant_id = $1 AND norma_id = $2 ORDER BY numero_sequencial DESC`, [tenantId, Number(req.params.id)],
    );
    res.json(rows.map(mapVersao));
  });

  app.get('/api/compliance/normas/:id/versoes/compare', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const fromId = Number(req.query.from);
    const toId = Number(req.query.to);
    if (!fromId || !toId) return res.status(400).json({ error: 'Informe from e to (ids de versão)' });
    const result = await compareNormVersions(tenantId, Number(req.params.id), fromId, toId);
    if (!result) return res.status(404).json({ error: 'Versões não encontradas' });
    res.json(result);
  });

  app.get('/api/compliance/deteccoes', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const status = req.query.status?.toString();
    const params = [tenantId];
    let sql = `SELECT * FROM compliance_deteccoes WHERE tenant_id = $1`;
    if (status) { sql += ` AND status = $2`; params.push(status); }
    sql += ` ORDER BY detectado_em DESC LIMIT 100`;
    const { rows } = await query(sql, params);
    res.json(rows.map(mapDeteccao));
  });

  app.get('/api/compliance/deteccoes/:id/impactos', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const { rows } = await query(`SELECT * FROM compliance_impactos WHERE tenant_id = $1 AND deteccao_id = $2`, [tenantId, id]);
    const { rows: sys } = await query(`SELECT * FROM compliance_impacto_sistema WHERE tenant_id = $1 AND deteccao_id = $2`, [tenantId, id]);
    const { rows: cli } = await query(`SELECT * FROM compliance_impacto_clientes WHERE tenant_id = $1 AND deteccao_id = $2`, [tenantId, id]);
    res.json({
      legal: rows.map(mapImpacto),
      system: sys.map(mapSystemImpact),
      clients: cli.map(mapClientImpact),
    });
  });

  app.post('/api/compliance/deteccoes/:id/validar', requirePermission('compliance:validate'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    try {
      const result = await validateDetection(tenantId, Number(req.params.id), {
        decision: req.body?.decision ?? 'APROVAR',
        justification: sanitizePlainText(req.body?.justification ?? '', 2000),
        validatorName: sanitizePlainText(req.body?.validatorName ?? req.user?.name ?? 'Validador', 255),
        validatorRole: req.body?.validatorRole ? sanitizePlainText(req.body.validatorRole, 255) : null,
        applyRules: req.body?.applyRules === true,
      }, req.user);
      if (!result) return res.status(404).json({ error: 'Detecção não encontrada' });
      res.json({ ...result, notice: 'Regras do motor ErgoSense NÃO foram alteradas automaticamente.' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/compliance/alertas', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const unread = req.query.unread === '1';
    let sql = `SELECT * FROM compliance_alertas WHERE tenant_id = $1`;
    if (unread) sql += ` AND lido = FALSE`;
    sql += ` ORDER BY created_at DESC LIMIT 50`;
    const { rows } = await query(sql, [tenantId]);
    res.json(rows.map(mapAlerta));
  });

  app.put('/api/compliance/alertas/:id/lida', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    await markAlertRead(tenantId, Number(req.params.id));
    res.json({ ok: true });
  });

  app.get('/api/compliance/historico', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const { rows } = await query(`SELECT * FROM compliance_historico WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`, [tenantId, limit]);
    res.json(rows.map((h) => ({ id: String(h.id), action: h.acao, entityType: h.entidade_tipo, entityId: h.entidade_id ? String(h.entidade_id) : null, userName: h.usuario_nome, details: h.detalhes, createdAt: h.created_at })));
  });

  app.get('/api/compliance/validacoes', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const { rows } = await query(`SELECT * FROM compliance_validacoes WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`, [tenantId]);
    res.json(rows.map(mapValidacao));
  });

  app.post('/api/compliance/relatorios/gerar', requirePermission('compliance:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const report = await buildComplianceReport(tenantId);
    const { rows } = await query(
      `INSERT INTO compliance_relatorios (tenant_id, titulo, conteudo_json, gerado_por) VALUES ($1,$2,$3,$4) RETURNING id`,
      [tenantId, report.title, JSON.stringify(report), req.user?.name ?? ''],
    );
    await logComplianceHistory({ tenantId, entityType: 'RELATORIO', entityId: rows[0].id, action: 'RELATORIO_GERADO', user: req.user });
    res.json({ ...report, id: String(rows[0].id) });
  });

  app.get('/api/compliance/relatorios', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const { rows } = await query(`SELECT id, tipo, titulo, gerado_por, created_at FROM compliance_relatorios WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20`, [tenantId]);
    res.json(rows.map((r) => ({ id: String(r.id), type: r.tipo, title: r.titulo, generatedBy: r.gerado_por, createdAt: r.created_at })));
  });

  app.get('/api/compliance/agendamento', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    res.json(await getComplianceSchedule(tenantId));
  });

  app.put('/api/compliance/agendamento', requirePermission('compliance:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const schedule = await updateComplianceSchedule(tenantId, {
      active: req.body?.active,
      intervalHours: req.body?.intervalHours,
    });
    await logComplianceHistory({ tenantId, entityType: 'AGENDAMENTO', action: 'AGENDAMENTO_ATUALIZADO', user: req.user, details: schedule });
    res.json(schedule);
  });

  app.get('/api/compliance/varreduras', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const { rows } = await query(
      `SELECT * FROM compliance_varreduras WHERE tenant_id = $1 ORDER BY iniciada_em DESC LIMIT $2`,
      [tenantId, limit],
    );
    res.json(rows.map(mapScanRun));
  });

  app.get('/api/compliance/tarefas', requirePermission('compliance:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    const status = req.query.status?.toString();
    const params = [tenantId];
    let sql = `SELECT * FROM compliance_adequacao_tarefas WHERE tenant_id = $1`;
    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    }
    sql += ` ORDER BY prazo NULLS LAST, created_at DESC LIMIT 100`;
    const { rows } = await query(sql, params);
    res.json(rows.map(mapAdequationTask));
  });

  app.put('/api/compliance/tarefas/:id', requirePermission('compliance:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Compliance');
    if (!tenantId) return;
    try {
      const row = await updateAdequationTask(
        tenantId,
        Number(req.params.id),
        {
          status: req.body?.status,
          responsible: sanitizePlainText(req.body?.responsible, 255),
          description: sanitizePlainText(req.body?.description, 4000),
        },
        req.user,
      );
      if (!row) return res.status(404).json({ error: 'Tarefa não encontrada' });
      res.json(mapAdequationTask(row));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
}
