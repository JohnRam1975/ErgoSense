/**
 * Ciclo GRO — APIs REST (Identificação → Revisão)
 */
import { requirePermission } from '../auth/rbac.js';
import { sanitizePlainText } from '../auth/sanitize.js';
import { query } from '../db.js';
import {
  ACTION_STATUSES,
  computeGroMaturity,
  CONTROL_TYPES,
  GRO_STAGE_LABELS,
  GRO_STAGES,
  INDICATOR_TYPES,
  nextStage,
  prevStage,
  REPORT_TYPES,
  validateStageAdvance,
} from '../groUtils.js';
import { logGroHistory, mapHistoryRow } from '../services/groHistory.js';

function mapActionPlan(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    riskId: String(row.inventario_risco_id),
    riskHazard: row.risco_perigo ?? null,
    description: row.descricao,
    controlType: row.tipo_controle,
    responsible: row.responsavel ?? '',
    dueDate: row.prazo ? row.prazo.toISOString().slice(0, 10) : null,
    status: row.status,
    evidence: row.evidencia ?? '',
    completedAt: row.data_conclusao ? row.data_conclusao.toISOString().slice(0, 10) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapIndicator(row) {
  const meta = row.meta != null ? Number(row.meta) : null;
  const current = row.valor_atual != null ? Number(row.valor_atual) : null;
  let onTarget = null;
  if (meta != null && current != null) {
    onTarget = row.tipo === 'LAGGING' ? current <= meta : current >= meta;
  }
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    riskId: row.inventario_risco_id ? String(row.inventario_risco_id) : null,
    riskHazard: row.risco_perigo ?? null,
    name: row.nome,
    type: row.tipo,
    target: meta,
    currentValue: current,
    unit: row.unidade ?? '',
    frequency: row.frequencia,
    lastMeasurement: row.ultima_medicao ? row.ultima_medicao.toISOString().slice(0, 10) : null,
    nextMeasurement: row.proxima_medicao ? row.proxima_medicao.toISOString().slice(0, 10) : null,
    notes: row.observacoes ?? '',
    onTarget,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReport(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    type: row.tipo,
    title: row.titulo,
    content: row.conteudo_json,
    generatedBy: row.gerado_por,
    createdAt: row.created_at,
  };
}

async function getRiskOr404(tenantId, riskId) {
  const { rows } = await query(
    `SELECT id, perigo, etapa_gro FROM inventario_riscos
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [riskId, tenantId],
  );
  return rows[0] ?? null;
}

async function buildDashboardData(tenantId) {
  const { rows: stageRows } = await query(
    `SELECT etapa_gro, COUNT(*)::int AS count
     FROM inventario_riscos WHERE tenant_id = $1 AND deleted_at IS NULL
     GROUP BY etapa_gro`,
    [tenantId],
  );
  const byStage = Object.fromEntries(GRO_STAGES.map((s) => [s, 0]));
  let totalRisks = 0;
  for (const r of stageRows) {
    byStage[r.etapa_gro] = r.count;
    totalRisks += r.count;
  }

  const { rows: planStats } = await query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status IN ('aberto','andamento'))::int AS abertas,
       COUNT(*) FILTER (WHERE status = 'concluido')::int AS concluidas,
       COUNT(*) FILTER (WHERE status NOT IN ('concluido','cancelado') AND prazo < CURRENT_DATE)::int AS atrasadas
     FROM gro_plano_acao WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );

  const { rows: indStats } = await query(
    `SELECT COUNT(*)::int AS total FROM gro_indicadores WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );

  const { rows: revStats } = await query(
    `SELECT COUNT(*)::int AS vencidas
     FROM inventario_riscos
     WHERE tenant_id = $1 AND deleted_at IS NULL
       AND data_revisao IS NOT NULL AND data_revisao < CURRENT_DATE`,
    [tenantId],
  );

  const maturity = computeGroMaturity(byStage, totalRisks);

  return {
    totalRisks,
    maturityPct: maturity,
    byStage: GRO_STAGES.map((s) => ({
      stage: s,
      label: GRO_STAGE_LABELS[s],
      count: byStage[s] ?? 0,
    })),
    actionPlan: {
      total: planStats[0]?.total ?? 0,
      open: planStats[0]?.abertas ?? 0,
      completed: planStats[0]?.concluidas ?? 0,
      overdue: planStats[0]?.atrasadas ?? 0,
    },
    indicators: { total: indStats[0]?.total ?? 0 },
    overdueReviews: revStats[0]?.vencidas ?? 0,
  };
}

async function buildReportContent(tenantId, type) {
  const dashboard = await buildDashboardData(tenantId);

  const { rows: risks } = await query(
    `SELECT r.id, r.tipo, r.perigo, r.nivel_risco, r.etapa_gro, r.score_risco,
            r.fonte_geradora, r.exposicao_duracao, r.exposicao_frequencia, r.exposicao_intensidade,
            r.numero_trabalhadores_expostos, r.grupo_homogeneo_exposicao,
            r.medidas_existentes, r.medidas_controle, r.evidencias_json,
            r.analise_id, r.aet_processo_id, r.pgr_versao_id,
            s.nome AS setor, u.nome AS unidade, fn.nome AS funcao, atv.nome AS atividade, pt.nome AS posto
     FROM inventario_riscos r
     LEFT JOIN setores s ON s.id = r.setor_id
     LEFT JOIN unidades u ON u.id = r.unidade_id
     LEFT JOIN funcoes fn ON fn.id = r.funcao_id
     LEFT JOIN atividades atv ON atv.id = r.atividade_id
     LEFT JOIN postos_trabalho pt ON pt.id = r.posto_trabalho_id
     WHERE r.tenant_id = $1 AND r.deleted_at IS NULL ORDER BY r.score_risco DESC`,
    [tenantId],
  );

  const { rows: linkRows } = await query(
    `SELECT inventario_risco_id, modulo, entidade_id, rotulo FROM inventario_vinculos WHERE tenant_id = $1`,
    [tenantId],
  );
  const linksByRisk = new Map();
  for (const l of linkRows) {
    const key = String(l.inventario_risco_id);
    if (!linksByRisk.has(key)) linksByRisk.set(key, []);
    linksByRisk.get(key).push({ module: l.modulo, entityId: String(l.entidade_id), label: l.rotulo ?? l.modulo });
  }

  const { rows: plans } = await query(
    `SELECT p.*, r.perigo AS risco_perigo FROM gro_plano_acao p
     JOIN inventario_riscos r ON r.id = p.inventario_risco_id
     WHERE p.tenant_id = $1 AND p.deleted_at IS NULL ORDER BY p.prazo NULLS LAST`,
    [tenantId],
  );

  const { rows: indicators } = await query(
    `SELECT i.*, r.perigo AS risco_perigo FROM gro_indicadores i
     LEFT JOIN inventario_riscos r ON r.id = i.inventario_risco_id
     WHERE i.tenant_id = $1 AND i.deleted_at IS NULL`,
    [tenantId],
  );

  const { rows: history } = await query(
    `SELECT h.*, r.perigo AS risco_perigo FROM gro_historico h
     LEFT JOIN inventario_riscos r ON r.id = h.inventario_risco_id
     WHERE h.tenant_id = $1 ORDER BY h.created_at DESC LIMIT 50`,
    [tenantId],
  );

  const base = {
    generatedAt: new Date().toISOString(),
    norma: 'NR-01 / Portaria MTE 1.419/2024',
    dashboard,
    risks: risks.map((r) => ({
      id: String(r.id),
      type: r.tipo,
      hazard: r.perigo,
      level: r.nivel_risco,
      stage: r.etapa_gro,
      score: r.score_risco,
      sector: r.setor,
      unit: r.unidade,
      function: r.funcao,
      activity: r.atividade,
      workPost: r.posto,
      generatingSource: r.fonte_geradora,
      exposure: {
        duration: r.exposicao_duracao,
        frequency: r.exposicao_frequencia,
        intensity: r.exposicao_intensidade,
      },
      exposedWorkersCount: r.numero_trabalhadores_expostos,
      homogeneousExposureGroup: r.grupo_homogeneo_exposicao,
      existingMeasures: r.medidas_existentes,
      controlMeasures: r.medidas_controle,
      evidences: Array.isArray(r.evidencias_json) ? r.evidencias_json : [],
      links: linksByRisk.get(String(r.id)) ?? [],
      analysisId: r.analise_id ? String(r.analise_id) : null,
      aetProcessId: r.aet_processo_id ? String(r.aet_processo_id) : null,
      pgrVersionId: r.pgr_versao_id ? String(r.pgr_versao_id) : null,
    })),
  };

  if (type === 'INVENTARIO') return { ...base, section: 'inventario' };
  if (type === 'PLANO_ACAO') return { ...base, actionPlans: plans.map(mapActionPlan), section: 'plano_acao' };
  if (type === 'INDICADORES') return { ...base, indicators: indicators.map(mapIndicator), section: 'indicadores' };
  if (type === 'CICLO_COMPLETO' || type === 'DOSSIE_GRO') {
    return {
      ...base,
      actionPlans: plans.map(mapActionPlan),
      indicators: indicators.map(mapIndicator),
      recentHistory: history.map(mapHistoryRow),
      section: type === 'DOSSIE_GRO' ? 'dossie_gro' : 'ciclo_completo',
    };
  }
  return base;
}

export function registerGroRoutes(app, { resolveOperationalTenant }) {
  // ─── Dashboard ───
  app.get('/api/gro/dashboard', requirePermission('gro:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    res.json(await buildDashboardData(tenantId));
  });

  // ─── Workflow ───
  app.get('/api/gro/workflow', requirePermission('gro:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT r.id, r.perigo, r.tipo, r.nivel_risco, r.etapa_gro, r.score_risco,
              r.data_revisao, s.nome AS setor_nome, u.nome AS unidade_nome,
              fn.nome AS funcao_nome, atv.nome AS atividade_nome, pt.nome AS posto_nome
       FROM inventario_riscos r
       LEFT JOIN setores s ON s.id = r.setor_id
       LEFT JOIN unidades u ON u.id = r.unidade_id
       LEFT JOIN funcoes fn ON fn.id = r.funcao_id
       LEFT JOIN atividades atv ON atv.id = r.atividade_id
       LEFT JOIN postos_trabalho pt ON pt.id = r.posto_trabalho_id
       WHERE r.tenant_id = $1 AND r.deleted_at IS NULL
       ORDER BY r.etapa_gro, r.score_risco DESC`,
      [tenantId],
    );
    const pipeline = Object.fromEntries(GRO_STAGES.map((s) => [s, []]));
    for (const r of rows) {
      pipeline[r.etapa_gro]?.push({
        id: String(r.id),
        hazard: r.perigo,
        type: r.tipo,
        riskLevel: r.nivel_risco,
        stage: r.etapa_gro,
        riskScore: r.score_risco,
        sectorName: r.setor_nome,
        unitName: r.unidade_nome,
        functionName: r.funcao_nome,
        activityName: r.atividade_nome,
        workPostName: r.posto_nome,
        reviewDate: r.data_revisao ? r.data_revisao.toISOString().slice(0, 10) : null,
      });
    }
    res.json({ stages: GRO_STAGES.map((s) => ({ stage: s, label: GRO_STAGE_LABELS[s], items: pipeline[s] ?? [] })) });
  });

  app.post('/api/gro/workflow/:riskId/advance', requirePermission('gro:update'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const riskId = Number(req.params.riskId);
    const risk = await getRiskOr404(tenantId, riskId);
    if (!risk) return res.status(404).json({ error: 'Risco não encontrado' });

    const target = nextStage(risk.etapa_gro);
    if (!target) return res.status(400).json({ error: 'Risco já está na etapa final' });

    const validation = await validateStageAdvance(query, tenantId, riskId, risk.etapa_gro, target);
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    await query(
      `UPDATE inventario_riscos SET etapa_gro = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
      [target, riskId, tenantId],
    );

    await logGroHistory({
      tenantId,
      riskId,
      stage: target,
      action: 'ETAPA_AVANCADA',
      user: req.user,
      details: { from: risk.etapa_gro, to: target },
    });

    res.json({ ok: true, stage: target, label: GRO_STAGE_LABELS[target] });
  });

  app.post('/api/gro/workflow/:riskId/complete-review', requirePermission('gro:update'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const riskId = Number(req.params.riskId);
    const risk = await getRiskOr404(tenantId, riskId);
    if (!risk) return res.status(404).json({ error: 'Risco não encontrado' });
    if (risk.etapa_gro !== 'REVISAO') {
      return res.status(400).json({ error: 'Risco não está em revisão' });
    }

    const nextReview = req.body?.nextReviewDate?.toString()?.slice(0, 10) ?? null;
    const notes = sanitizePlainText(req.body?.notes, 2000);

    await query(
      `UPDATE inventario_riscos SET
         etapa_gro = 'MONITORAMENTO',
         data_revisao = COALESCE($1::date, CURRENT_DATE + INTERVAL '12 months'),
         updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`,
      [nextReview, riskId, tenantId],
    );

    await logGroHistory({
      tenantId,
      riskId,
      stage: 'MONITORAMENTO',
      action: 'REVISAO_CONCLUIDA',
      user: req.user,
      details: { nextReviewDate: nextReview, notes },
    });

    res.json({ ok: true, stage: 'MONITORAMENTO' });
  });

  app.post('/api/gro/workflow/:riskId/revert', requirePermission('gro:update'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const riskId = Number(req.params.riskId);
    const risk = await getRiskOr404(tenantId, riskId);
    if (!risk) return res.status(404).json({ error: 'Risco não encontrado' });

    const target = prevStage(risk.etapa_gro);
    if (!target) return res.status(400).json({ error: 'Risco já está na primeira etapa' });

    await query(
      `UPDATE inventario_riscos SET etapa_gro = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
      [target, riskId, tenantId],
    );

    await logGroHistory({
      tenantId,
      riskId,
      stage: target,
      action: 'ETAPA_REVERTIDA',
      user: req.user,
      details: { from: risk.etapa_gro, to: target },
    });

    res.json({ ok: true, stage: target, label: GRO_STAGE_LABELS[target] });
  });

  // ─── Plano de ação ───
  app.get('/api/gro/action-plans', requirePermission('gro:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const riskId = req.query.riskId ? Number(req.query.riskId) : null;
    const params = [tenantId];
    let where = 'p.tenant_id = $1 AND p.deleted_at IS NULL';
    if (riskId) {
      params.push(riskId);
      where += ` AND p.inventario_risco_id = $${params.length}`;
    }
    const { rows } = await query(
      `SELECT p.*, r.perigo AS risco_perigo FROM gro_plano_acao p
       JOIN inventario_riscos r ON r.id = p.inventario_risco_id
       WHERE ${where} ORDER BY p.prazo NULLS LAST, p.created_at DESC`,
      params,
    );
    res.json(rows.map(mapActionPlan));
  });

  app.post('/api/gro/action-plans', requirePermission('gro:create'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;

    const riskId = Number(req.body?.riskId);
    const descricao = sanitizePlainText(req.body?.description, 4000);
    const tipo = String(req.body?.controlType ?? '').toUpperCase();
    if (!riskId || !descricao || !CONTROL_TYPES.includes(tipo)) {
      return res.status(400).json({ error: 'Informe riskId, description e controlType válido' });
    }
    if (!(await getRiskOr404(tenantId, riskId))) {
      return res.status(404).json({ error: 'Risco não encontrado' });
    }

    const { rows } = await query(
      `INSERT INTO gro_plano_acao (tenant_id, inventario_risco_id, descricao, tipo_controle, responsavel, prazo, status, evidencia)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        tenantId,
        riskId,
        descricao,
        tipo,
        sanitizePlainText(req.body?.responsible, 255) || null,
        req.body?.dueDate?.slice(0, 10) || null,
        ACTION_STATUSES.includes(req.body?.status) ? req.body.status : 'aberto',
        sanitizePlainText(req.body?.evidence, 4000) || null,
      ],
    );

    await logGroHistory({
      tenantId,
      riskId,
      actionPlanId: rows[0].id,
      stage: 'CONTROLE',
      action: 'PLANO_CRIADO',
      user: req.user,
      details: { description: descricao, controlType: tipo },
    });

    const full = await query(
      `SELECT p.*, r.perigo AS risco_perigo FROM gro_plano_acao p
       JOIN inventario_riscos r ON r.id = p.inventario_risco_id WHERE p.id = $1`,
      [rows[0].id],
    );
    res.status(201).json(mapActionPlan(full.rows[0]));
  });

  app.put('/api/gro/action-plans/:id', requirePermission('gro:update'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const descricao = sanitizePlainText(req.body?.description, 4000);
    const tipo = String(req.body?.controlType ?? '').toUpperCase();
    const status = req.body?.status;
    if (!id || !descricao || !CONTROL_TYPES.includes(tipo)) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const { rows } = await query(
      `UPDATE gro_plano_acao SET
         descricao = $1, tipo_controle = $2, responsavel = $3, prazo = $4,
         status = $5, evidencia = $6,
         data_conclusao = CASE WHEN $5 = 'concluido' THEN COALESCE(data_conclusao, CURRENT_DATE) ELSE data_conclusao END,
         updated_at = NOW()
       WHERE id = $7 AND tenant_id = $8 AND deleted_at IS NULL
       RETURNING inventario_risco_id`,
      [
        descricao,
        tipo,
        sanitizePlainText(req.body?.responsible, 255) || null,
        req.body?.dueDate?.slice(0, 10) || null,
        ACTION_STATUSES.includes(status) ? status : 'aberto',
        sanitizePlainText(req.body?.evidence, 4000) || null,
        id,
        tenantId,
      ],
    );
    if (!rows.length) return res.status(404).json({ error: 'Ação não encontrada' });

    await logGroHistory({
      tenantId,
      riskId: rows[0].inventario_risco_id,
      actionPlanId: id,
      action: 'PLANO_ATUALIZADO',
      user: req.user,
      details: { status },
    });

    const full = await query(
      `SELECT p.*, r.perigo AS risco_perigo FROM gro_plano_acao p
       JOIN inventario_riscos r ON r.id = p.inventario_risco_id WHERE p.id = $1`,
      [id],
    );
    res.json(mapActionPlan(full.rows[0]));
  });

  app.delete('/api/gro/action-plans/:id', requirePermission('gro:delete'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const { rows } = await query(
      `UPDATE gro_plano_acao SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING inventario_risco_id`,
      [id, tenantId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Ação não encontrada' });

    await logGroHistory({
      tenantId,
      riskId: rows[0].inventario_risco_id,
      actionPlanId: id,
      action: 'PLANO_EXCLUIDO',
      user: req.user,
    });
    res.json({ ok: true });
  });

  // ─── Indicadores ───
  app.get('/api/gro/indicators', requirePermission('gro:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT i.*, r.perigo AS risco_perigo FROM gro_indicadores i
       LEFT JOIN inventario_riscos r ON r.id = i.inventario_risco_id
       WHERE i.tenant_id = $1 AND i.deleted_at IS NULL ORDER BY i.nome`,
      [tenantId],
    );
    res.json(rows.map(mapIndicator));
  });

  app.post('/api/gro/indicators', requirePermission('gro:create'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const nome = sanitizePlainText(req.body?.name, 255);
    const tipo = String(req.body?.type ?? '').toUpperCase();
    if (!nome || !INDICATOR_TYPES.includes(tipo)) {
      return res.status(400).json({ error: 'Informe name e type (LEADING/LAGGING)' });
    }
    const riskId = req.body?.riskId ? Number(req.body.riskId) : null;
    if (riskId && !(await getRiskOr404(tenantId, riskId))) {
      return res.status(404).json({ error: 'Risco não encontrado' });
    }

    const { rows } = await query(
      `INSERT INTO gro_indicadores (tenant_id, inventario_risco_id, nome, tipo, meta, valor_atual, unidade, frequencia, ultima_medicao, proxima_medicao, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        tenantId,
        riskId,
        nome,
        tipo,
        req.body?.target != null ? Number(req.body.target) : null,
        req.body?.currentValue != null ? Number(req.body.currentValue) : null,
        sanitizePlainText(req.body?.unit, 64) || null,
        sanitizePlainText(req.body?.frequency, 32) || 'mensal',
        req.body?.lastMeasurement?.slice(0, 10) || null,
        req.body?.nextMeasurement?.slice(0, 10) || null,
        sanitizePlainText(req.body?.notes, 2000) || null,
      ],
    );

    await logGroHistory({
      tenantId,
      riskId,
      indicatorId: rows[0].id,
      stage: 'MONITORAMENTO',
      action: 'INDICADOR_CRIADO',
      user: req.user,
      details: { name: nome },
    });

    const full = await query(
      `SELECT i.*, r.perigo AS risco_perigo FROM gro_indicadores i
       LEFT JOIN inventario_riscos r ON r.id = i.inventario_risco_id WHERE i.id = $1`,
      [rows[0].id],
    );
    res.status(201).json(mapIndicator(full.rows[0]));
  });

  app.put('/api/gro/indicators/:id', requirePermission('gro:update'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const nome = sanitizePlainText(req.body?.name, 255);
    const tipo = String(req.body?.type ?? '').toUpperCase();
    if (!id || !nome || !INDICATOR_TYPES.includes(tipo)) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const { rows } = await query(
      `UPDATE gro_indicadores SET
         nome = $1, tipo = $2, meta = $3, valor_atual = $4, unidade = $5,
         frequencia = $6, ultima_medicao = $7, proxima_medicao = $8, observacoes = $9,
         updated_at = NOW()
       WHERE id = $10 AND tenant_id = $11 AND deleted_at IS NULL
       RETURNING inventario_risco_id`,
      [
        nome,
        tipo,
        req.body?.target != null ? Number(req.body.target) : null,
        req.body?.currentValue != null ? Number(req.body.currentValue) : null,
        sanitizePlainText(req.body?.unit, 64) || null,
        sanitizePlainText(req.body?.frequency, 32) || 'mensal',
        req.body?.lastMeasurement?.slice(0, 10) || null,
        req.body?.nextMeasurement?.slice(0, 10) || null,
        sanitizePlainText(req.body?.notes, 2000) || null,
        id,
        tenantId,
      ],
    );
    if (!rows.length) return res.status(404).json({ error: 'Indicador não encontrado' });

    await logGroHistory({
      tenantId,
      riskId: rows[0].inventario_risco_id,
      indicatorId: id,
      action: 'INDICADOR_ATUALIZADO',
      user: req.user,
      details: { currentValue: req.body?.currentValue },
    });

    const full = await query(
      `SELECT i.*, r.perigo AS risco_perigo FROM gro_indicadores i
       LEFT JOIN inventario_riscos r ON r.id = i.inventario_risco_id WHERE i.id = $1`,
      [id],
    );
    res.json(mapIndicator(full.rows[0]));
  });

  app.delete('/api/gro/indicators/:id', requirePermission('gro:delete'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const { rows } = await query(
      `UPDATE gro_indicadores SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING inventario_risco_id`,
      [id, tenantId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Indicador não encontrado' });

    await logGroHistory({
      tenantId,
      riskId: rows[0].inventario_risco_id,
      indicatorId: id,
      action: 'INDICADOR_EXCLUIDO',
      user: req.user,
    });
    res.json({ ok: true });
  });

  // ─── Histórico ───
  app.get('/api/gro/history', requirePermission('gro:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const riskId = req.query.riskId ? Number(req.query.riskId) : null;
    const params = [tenantId, limit];
    let where = 'h.tenant_id = $1';
    if (riskId) {
      params.splice(1, 0, riskId);
      where += ` AND h.inventario_risco_id = $2`;
      params[2] = limit;
    }
    const { rows } = await query(
      `SELECT h.*, r.perigo AS risco_perigo FROM gro_historico h
       LEFT JOIN inventario_riscos r ON r.id = h.inventario_risco_id
       WHERE ${where} ORDER BY h.created_at DESC LIMIT $${params.length}`,
      params,
    );
    res.json(rows.map(mapHistoryRow));
  });

  // ─── Relatórios ───
  app.get('/api/gro/reports', requirePermission('gro:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT id, tenant_id, tipo, titulo, gerado_por, created_at
       FROM gro_relatorios WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [tenantId],
    );
    res.json(rows.map((r) => ({
      id: String(r.id),
      tenantId: r.tenant_id,
      type: r.tipo,
      title: r.titulo,
      generatedBy: r.gerado_por,
      createdAt: r.created_at,
    })));
  });

  app.get('/api/gro/reports/:id', requirePermission('gro:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT * FROM gro_relatorios WHERE id = $1 AND tenant_id = $2`,
      [Number(req.params.id), tenantId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Relatório não encontrado' });
    res.json(mapReport(rows[0]));
  });

  app.post('/api/gro/reports/generate', requirePermission('gro:create'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'GRO');
    if (!tenantId) return;
    const type = String(req.body?.type ?? 'DOSSIE_GRO').toUpperCase();
    if (!REPORT_TYPES.includes(type)) {
      return res.status(400).json({ error: `Tipo inválido. Use: ${REPORT_TYPES.join(', ')}` });
    }

    const content = await buildReportContent(tenantId, type);
    const titles = {
      CICLO_COMPLETO: 'Relatório do Ciclo GRO',
      INVENTARIO: 'Relatório de Inventário de Riscos',
      PLANO_ACAO: 'Relatório do Plano de Ação',
      INDICADORES: 'Relatório de Indicadores GRO',
      DOSSIE_GRO: 'Dossiê GRO — NR-01',
    };

    const { rows } = await query(
      `INSERT INTO gro_relatorios (tenant_id, tipo, titulo, conteudo_json, gerado_por)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [
        tenantId,
        type,
        titles[type] ?? 'Relatório GRO',
        JSON.stringify(content),
        req.user?.name || req.user?.email || 'Sistema',
      ],
    );

    await logGroHistory({
      tenantId,
      action: 'RELATORIO_GERADO',
      user: req.user,
      details: { type, reportId: rows[0].id },
    });

    const full = await query(`SELECT * FROM gro_relatorios WHERE id = $1`, [rows[0].id]);
    res.status(201).json(mapReport(full.rows[0]));
  });
}
