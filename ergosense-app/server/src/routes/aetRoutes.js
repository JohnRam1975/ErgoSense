/**
 * AET — APIs REST (NR-17 · RULA · REBA · OWAS · NIOSH · Vibração)
 */
import { requirePermission } from '../auth/rbac.js';
import { sanitizePlainText } from '../auth/sanitize.js';
import { query } from '../db.js';
import { buildAetNormativeReport } from '../services/aetReport.js';
import {
  AET_STAGES,
  logAetHistory,
  mapAetHistoryRow,
  mapEquipamento,
  mapMobiliario,
  mapProcesso,
  nextAetStage,
  prevAetStage,
} from '../services/aetUtils.js';
import {
  evaluateOrganizacaoTrabalho,
  evaluateTeleatendimento,
  evaluateVibracaoCorpoInteiro,
  evaluateVibracaoMaosBracos,
} from '../services/vibrationScoring.js';
import { integrateFromAet } from '../services/riskIntegrationHub.js';
import {
  approveAetVersion,
  createAetVersion,
  generateAetVersionReport,
  getVersionFull,
  listAetIntegrations,
  listAetVersions,
  refreshAetVersionSnapshot,
  rejectAetVersion,
  signAetVersion,
  startAetRevision,
  submitAetApproval,
  updateAetTechnicalResponsible,
} from '../services/aetCorporateService.js';
import { validateBody } from '../validation/validateRequest.js';
import { createAetProcessoSchema } from '../validation/schemas.js';

async function getProcessoOr404(tenantId, id) {
  const { rows } = await query(
    `SELECT * FROM aet_processos WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [id, tenantId],
  );
  return rows[0] ?? null;
}

async function loadFurnitureForProcess(tenantId, ids) {
  if (!ids?.length) return [];
  const { rows } = await query(
    `SELECT * FROM aet_mobiliario WHERE tenant_id = $1 AND id = ANY($2::bigint[]) AND deleted_at IS NULL`,
    [tenantId, ids],
  );
  return rows.map(mapMobiliario);
}

async function loadEquipmentForProcess(tenantId, ids) {
  if (!ids?.length) return [];
  const { rows } = await query(
    `SELECT * FROM aet_equipamentos WHERE tenant_id = $1 AND id = ANY($2::bigint[]) AND deleted_at IS NULL`,
    [tenantId, ids],
  );
  return rows.map(mapEquipamento);
}

async function importMethodsFromAnalysis(tenantId, analysisId) {
  const { rows } = await query(
    `SELECT r.rula, r.reba, r.angulos_json, r.nr17_report_json
     FROM resultados_ia r
     WHERE r.analise_id = $1 AND r.tenant_id = $2`,
    [analysisId, tenantId],
  );
  if (!rows[0]) return null;

  let v2 = null;
  try {
    const v2Res = await query(
      `SELECT v2_report_json FROM analises WHERE id = $1 AND tenant_id = $2`,
      [analysisId, tenantId],
    );
    v2 = v2Res.rows[0]?.v2_report_json ?? null;
  } catch {
    // Coluna v2_report_json ausente — execute migrate-v2-modules.js se necessário
  }

  const methods = {};
  if (rows[0].rula != null) {
    methods.rula = { score: rows[0].rula, source: 'analise_ia', norma: 'RULA McAtamney 1993' };
  }
  if (rows[0].reba != null) {
    methods.reba = { score: rows[0].reba, source: 'analise_ia', norma: 'REBA Hignett 2000' };
  }
  if (v2?.methods) {
    for (const m of v2.methods) {
      if (m.methodId === 'owas') methods.owas = { owasClass: m.score, classificationLabel: m.classificationLabel, source: 'v2', norma: 'OWAS Karhu 1977' };
      if (m.methodId === 'niosh') methods.niosh = { rwl: m.outputs?.RWL, liftingIndex: m.outputs?.LI, source: 'v2', norma: 'NIOSH RNLE 1991' };
      if (m.methodId === 'rula' && !methods.rula) methods.rula = { score: m.score, classificationLabel: m.classificationLabel, source: 'v2' };
      if (m.methodId === 'reba' && !methods.reba) methods.reba = { score: m.score, classificationLabel: m.classificationLabel, source: 'v2' };
    }
  }
  methods.angles = rows[0].angulos_json;
  return methods;
}

async function buildDashboard(tenantId) {
  const { rows: stats } = await query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'ASSINADO')::int AS assinados,
       COUNT(*) FILTER (WHERE status IN ('RASCUNHO','EM_ANDAMENTO'))::int AS andamento,
       COUNT(*) FILTER (WHERE etapa_atual = 'REVISAO')::int AS revisao
     FROM aet_processos WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );
  const { rows: mob } = await query(
    `SELECT COUNT(*)::int AS n FROM aet_mobiliario WHERE tenant_id = $1 AND deleted_at IS NULL AND ativo = TRUE`,
    [tenantId],
  );
  const { rows: eq } = await query(
    `SELECT COUNT(*)::int AS n FROM aet_equipamentos WHERE tenant_id = $1 AND deleted_at IS NULL AND ativo = TRUE`,
    [tenantId],
  );
  const { rows: recent } = await query(
    `SELECT id, titulo, status, etapa_atual, updated_at FROM aet_processos
     WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 5`,
    [tenantId],
  );
  return {
    totalProcesses: stats[0]?.total ?? 0,
    signed: stats[0]?.assinados ?? 0,
    inProgress: stats[0]?.andamento ?? 0,
    inReview: stats[0]?.revisao ?? 0,
    furnitureCount: mob[0]?.n ?? 0,
    equipmentCount: eq[0]?.n ?? 0,
    recentProcesses: recent.map((r) => mapProcesso(r)),
    stages: AET_STAGES.map((s) => ({ stage: s, label: mapProcesso({ etapa_atual: s }).stageLabel })),
  };
}

export function registerAetRoutes(app, { resolveOperationalTenant }) {
  app.get('/api/aet/dashboard', requirePermission('aet:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    res.json(await buildDashboard(tenantId));
  });

  app.get('/api/aet/processos', requirePermission('aet:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT p.*, c.nome AS colaborador_nome, s.nome AS setor_nome
       FROM aet_processos p
       LEFT JOIN colaboradores c ON c.id = p.colaborador_id
       LEFT JOIN setores s ON s.id = p.setor_id
       WHERE p.tenant_id = $1 AND p.deleted_at IS NULL ORDER BY p.updated_at DESC`,
      [tenantId],
    );
    res.json(rows.map((r) => mapProcesso(r, { collaboratorName: r.colaborador_nome, sectorName: r.setor_nome })));
  });

  app.get('/api/aet/processos/:id', requirePermission('aet:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const row = await getProcessoOr404(tenantId, Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Processo AET não encontrado' });
    const furniture = await loadFurnitureForProcess(tenantId, row.mobiliario_ids);
    const equipment = await loadEquipmentForProcess(tenantId, row.equipamento_ids);
    res.json(mapProcesso(row, { furniture, equipment }));
  });

  app.post('/api/aet/processos', requirePermission('aet:write'), validateBody(createAetProcessoSchema), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const body = req.validatedBody;
    const titulo = sanitizePlainText(body.title, 512);
    const { rows } = await query(
      `INSERT INTO aet_processos (tenant_id, titulo, colaborador_id, setor_id, analise_id, elaborado_por, caracterizacao_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        tenantId,
        titulo,
        body.collaboratorId != null ? Number(body.collaboratorId) : null,
        body.sectorId != null ? Number(body.sectorId) : null,
        body.analysisId != null ? Number(body.analysisId) : null,
        sanitizePlainText(body.preparedBy ?? req.user?.name ?? '', 255),
        JSON.stringify(body.characterization ?? {}),
      ],
    );
    await logAetHistory({ tenantId, processoId: rows[0].id, action: 'PROCESSO_CRIADO', stage: 'CARACTERIZACAO', user: req.user });
    if (body.analysisId) {
      try {
        const methods = await importMethodsFromAnalysis(tenantId, Number(body.analysisId));
        if (methods) {
          await query(`UPDATE aet_processos SET metodos_json = $1 WHERE id = $2`, [JSON.stringify(methods), rows[0].id]);
        }
      } catch (err) {
        console.warn('importMethodsFromAnalysis:', err.message);
      }
    }
    res.status(201).json(mapProcesso(rows[0]));
  });

  app.put('/api/aet/processos/:id', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const existing = await getProcessoOr404(tenantId, id);
    if (!existing) return res.status(404).json({ error: 'Processo não encontrado' });

    const { rows } = await query(
      `UPDATE aet_processos SET
         titulo = COALESCE($3, titulo),
         colaborador_id = COALESCE($4, colaborador_id),
         setor_id = COALESCE($5, setor_id),
         caracterizacao_json = COALESCE($6, caracterizacao_json),
         mobiliario_ids = COALESCE($7, mobiliario_ids),
         equipamento_ids = COALESCE($8, equipamento_ids),
         plano_acao_json = COALESCE($9, plano_acao_json),
         updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [
        id,
        tenantId,
        req.body?.title ? sanitizePlainText(req.body.title, 512) : null,
        req.body?.collaboratorId != null ? Number(req.body.collaboratorId) : null,
        req.body?.sectorId != null ? Number(req.body.sectorId) : null,
        req.body?.characterization ? JSON.stringify(req.body.characterization) : null,
        req.body?.furnitureIds ? req.body.furnitureIds.map(Number) : null,
        req.body?.equipmentIds ? req.body.equipmentIds.map(Number) : null,
        req.body?.actionPlan ? JSON.stringify(req.body.actionPlan) : null,
      ],
    );
    await logAetHistory({ tenantId, processoId: id, action: 'PROCESSO_ATUALIZADO', user: req.user });
    res.json(mapProcesso(rows[0]));
  });

  app.post('/api/aet/processos/:id/advance', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const row = await getProcessoOr404(tenantId, id);
    if (!row) return res.status(404).json({ error: 'Processo não encontrado' });
    const next = nextAetStage(row.etapa_atual);
    if (!next) return res.status(400).json({ error: 'Processo já na etapa final' });
    const status = next === 'ASSINADO' ? 'ASSINADO' : 'EM_ANDAMENTO';
    const { rows } = await query(
      `UPDATE aet_processos SET etapa_atual = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [next, status, id],
    );
    await logAetHistory({ tenantId, processoId: id, action: 'ETAPA_AVANCO', stage: next, user: req.user });
    res.json(mapProcesso(rows[0]));
  });

  app.post('/api/aet/processos/:id/retreat', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const row = await getProcessoOr404(tenantId, id);
    if (!row) return res.status(404).json({ error: 'Processo não encontrado' });
    const prev = prevAetStage(row.etapa_atual);
    if (!prev) return res.status(400).json({ error: 'Já na primeira etapa' });
    const { rows } = await query(
      `UPDATE aet_processos SET etapa_atual = $1, status = 'EM_ANDAMENTO', updated_at = NOW() WHERE id = $2 RETURNING *`,
      [prev, id],
    );
    await logAetHistory({ tenantId, processoId: id, action: 'ETAPA_RETORNO', stage: prev, user: req.user });
    res.json(mapProcesso(rows[0]));
  });

  app.put('/api/aet/processos/:id/vibracao-corpo', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (!(await getProcessoOr404(tenantId, id))) return res.status(404).json({ error: 'Processo não encontrado' });
    let result;
    try {
      result = evaluateVibracaoCorpoInteiro(req.body ?? {});
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    const { rows } = await query(
      `UPDATE aet_processos SET vibracao_corpo_json = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [JSON.stringify(result), id],
    );
    await logAetHistory({ tenantId, processoId: id, action: 'VIBRACAO_CORPO_AVALIADA', user: req.user, details: { a8: result.a8Equivalente } });
    res.json(mapProcesso(rows[0]));
  });

  app.put('/api/aet/processos/:id/vibracao-maos', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (!(await getProcessoOr404(tenantId, id))) return res.status(404).json({ error: 'Processo não encontrado' });
    let result;
    try {
      result = evaluateVibracaoMaosBracos(req.body ?? {});
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    const { rows } = await query(
      `UPDATE aet_processos SET vibracao_maos_json = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [JSON.stringify(result), id],
    );
    await logAetHistory({ tenantId, processoId: id, action: 'VIBRACAO_MAOS_AVALIADA', user: req.user });
    res.json(mapProcesso(rows[0]));
  });

  app.put('/api/aet/processos/:id/teleatendimento', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (!(await getProcessoOr404(tenantId, id))) return res.status(404).json({ error: 'Processo não encontrado' });
    const result = evaluateTeleatendimento(req.body?.answers ?? req.body ?? {});
    const { rows } = await query(
      `UPDATE aet_processos SET teleatendimento_json = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [JSON.stringify(result), id],
    );
    await logAetHistory({ tenantId, processoId: id, action: 'TELEATENDIMENTO_AVALIADO', user: req.user });
    res.json(mapProcesso(rows[0]));
  });

  app.put('/api/aet/processos/:id/organizacao', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (!(await getProcessoOr404(tenantId, id))) return res.status(404).json({ error: 'Processo não encontrado' });
    const result = evaluateOrganizacaoTrabalho(req.body?.answers ?? req.body ?? {});
    const { rows } = await query(
      `UPDATE aet_processos SET organizacao_json = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [JSON.stringify(result), id],
    );
    await logAetHistory({ tenantId, processoId: id, action: 'ORGANIZACAO_AVALIADA', user: req.user });
    res.json(mapProcesso(rows[0]));
  });

  app.put('/api/aet/processos/:id/metodos', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const row = await getProcessoOr404(tenantId, id);
    if (!row) return res.status(404).json({ error: 'Processo não encontrado' });

    let methods = row.metodos_json ?? {};
    if (req.body?.importAnalysisId) {
      const imported = await importMethodsFromAnalysis(tenantId, Number(req.body.importAnalysisId));
      if (imported) methods = { ...methods, ...imported };
    }
    if (req.body?.methods) {
      methods = { ...methods, ...req.body.methods };
    }
    const { rows } = await query(
      `UPDATE aet_processos SET metodos_json = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [JSON.stringify(methods), id],
    );
    await logAetHistory({ tenantId, processoId: id, action: 'METODOS_ATUALIZADOS', user: req.user });
    res.json(mapProcesso(rows[0]));
  });

  app.post('/api/aet/processos/:id/gerar-relatorio', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const row = await getProcessoOr404(tenantId, id);
    if (!row) return res.status(404).json({ error: 'Processo não encontrado' });
    const proc = mapProcesso(row);
    const furniture = await loadFurnitureForProcess(tenantId, row.mobiliario_ids);
    const equipment = await loadEquipmentForProcess(tenantId, row.equipamento_ids);
    const report = buildAetNormativeReport(proc, { furniture, equipment });
    await query(`UPDATE aet_processos SET relatorio_json = $1, updated_at = NOW() WHERE id = $2`, [JSON.stringify(report), id]);
    await logAetHistory({ tenantId, processoId: id, action: 'RELATORIO_GERADO', user: req.user });
    try {
      await integrateFromAet(null, tenantId, id, req.user);
    } catch (e) {
      console.warn('integrateFromAet:', e.message);
    }
    res.json(report);
  });

  app.post('/api/aet/processos/:id/assinar', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (!(await getProcessoOr404(tenantId, id))) return res.status(404).json({ error: 'Processo não encontrado' });
    const nome = sanitizePlainText(req.body?.ergonomistName ?? '', 255);
    const registro = sanitizePlainText(req.body?.ergonomistRegistry ?? '', 128);
    if (!nome || !registro) return res.status(400).json({ error: 'Nome e registro profissional obrigatórios' });
    const { rows } = await query(
      `UPDATE aet_processos SET
         ergonomista_nome = $1, ergonomista_registro = $2, assinado_em = NOW(),
         status = 'ASSINADO', etapa_atual = 'ASSINADO', revisado_por = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [nome, registro, sanitizePlainText(req.body?.reviewedBy ?? nome, 255), id],
    );
    await logAetHistory({ tenantId, processoId: id, action: 'AET_ASSINADA', stage: 'ASSINADO', user: req.user, details: { nome, registro } });
    try {
      await integrateFromAet(null, tenantId, id, req.user);
    } catch (e) {
      console.warn('integrateFromAet:', e.message);
    }
    res.json(mapProcesso(rows[0]));
  });

  app.get('/api/aet/mobiliario', requirePermission('aet:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT m.*, s.nome AS setor_nome FROM aet_mobiliario m
       LEFT JOIN setores s ON s.id = m.setor_id
       WHERE m.tenant_id = $1 AND m.deleted_at IS NULL ORDER BY m.descricao`,
      [tenantId],
    );
    res.json(rows.map((r) => ({ ...mapMobiliario(r), sectorName: r.setor_nome })));
  });

  app.post('/api/aet/mobiliario', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const descricao = sanitizePlainText(req.body?.description ?? '', 512);
    if (!descricao) return res.status(400).json({ error: 'description obrigatório' });
    const { rows } = await query(
      `INSERT INTO aet_mobiliario (tenant_id, setor_id, tipo, descricao, marca, modelo, regulagens_json, conformidade_nr17, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        tenantId,
        req.body?.sectorId ? Number(req.body.sectorId) : null,
        sanitizePlainText(req.body?.type ?? 'cadeira', 64),
        descricao,
        sanitizePlainText(req.body?.brand ?? '', 128),
        sanitizePlainText(req.body?.model ?? '', 128),
        JSON.stringify(req.body?.adjustments ?? {}),
        req.body?.nr17Compliance ?? 'nao_avaliado',
        sanitizePlainText(req.body?.notes ?? '', 2000),
      ],
    );
    res.status(201).json(mapMobiliario(rows[0]));
  });

  app.put('/api/aet/mobiliario/:id', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const { rows } = await query(
      `UPDATE aet_mobiliario SET
         descricao = COALESCE($3, descricao), tipo = COALESCE($4, tipo),
         marca = COALESCE($5, marca), modelo = COALESCE($6, modelo),
         conformidade_nr17 = COALESCE($7, conformidade_nr17), observacoes = COALESCE($8, observacoes),
         updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING *`,
      [
        Number(req.params.id),
        tenantId,
        req.body?.description ? sanitizePlainText(req.body.description, 512) : null,
        req.body?.type ? sanitizePlainText(req.body.type, 64) : null,
        req.body?.brand != null ? sanitizePlainText(req.body.brand, 128) : null,
        req.body?.model != null ? sanitizePlainText(req.body.model, 128) : null,
        req.body?.nr17Compliance ?? null,
        req.body?.notes != null ? sanitizePlainText(req.body.notes, 2000) : null,
      ],
    );
    if (!rows.length) return res.status(404).json({ error: 'Mobiliário não encontrado' });
    res.json(mapMobiliario(rows[0]));
  });

  app.delete('/api/aet/mobiliario/:id', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    await query(`UPDATE aet_mobiliario SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`, [Number(req.params.id), tenantId]);
    res.json({ ok: true });
  });

  app.get('/api/aet/equipamentos', requirePermission('aet:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT e.*, s.nome AS setor_nome FROM aet_equipamentos e
       LEFT JOIN setores s ON s.id = e.setor_id WHERE e.tenant_id = $1 AND e.deleted_at IS NULL ORDER BY e.identificacao`,
      [tenantId],
    );
    res.json(rows.map((r) => ({ ...mapEquipamento(r), sectorName: r.setor_nome })));
  });

  app.post('/api/aet/equipamentos', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const ident = sanitizePlainText(req.body?.identification ?? '', 128);
    if (!ident) return res.status(400).json({ error: 'identification obrigatório' });
    const { rows } = await query(
      `INSERT INTO aet_equipamentos (tenant_id, setor_id, tipo, identificacao, descricao, fabricante, emite_vibracao, manutencao_em, conformidade_nr17, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        tenantId,
        req.body?.sectorId ? Number(req.body.sectorId) : null,
        sanitizePlainText(req.body?.type ?? 'ferramenta', 64),
        ident,
        sanitizePlainText(req.body?.description ?? '', 2000),
        sanitizePlainText(req.body?.manufacturer ?? '', 128),
        req.body?.emitsVibration === true,
        req.body?.maintenanceDate ?? null,
        req.body?.nr17Compliance ?? 'nao_avaliado',
        sanitizePlainText(req.body?.notes ?? '', 2000),
      ],
    );
    res.status(201).json(mapEquipamento(rows[0]));
  });

  app.put('/api/aet/equipamentos/:id', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const { rows } = await query(
      `UPDATE aet_equipamentos SET
         identificacao = COALESCE($3, identificacao), tipo = COALESCE($4, tipo),
         descricao = COALESCE($5, descricao), emite_vibracao = COALESCE($6, emite_vibracao),
         conformidade_nr17 = COALESCE($7, conformidade_nr17), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING *`,
      [
        Number(req.params.id),
        tenantId,
        req.body?.identification ? sanitizePlainText(req.body.identification, 128) : null,
        req.body?.type ? sanitizePlainText(req.body.type, 64) : null,
        req.body?.description != null ? sanitizePlainText(req.body.description, 2000) : null,
        req.body?.emitsVibration != null ? req.body.emitsVibration : null,
        req.body?.nr17Compliance ?? null,
      ],
    );
    if (!rows.length) return res.status(404).json({ error: 'Equipamento não encontrado' });
    res.json(mapEquipamento(rows[0]));
  });

  app.delete('/api/aet/equipamentos/:id', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    await query(`UPDATE aet_equipamentos SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`, [Number(req.params.id), tenantId]);
    res.json({ ok: true });
  });

  app.get('/api/aet/historico', requirePermission('aet:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const processId = req.query.processId ? Number(req.query.processId) : null;
    const versionId = req.query.versionId ? Number(req.query.versionId) : null;
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const params = [tenantId, limit];
    let sql = `SELECT * FROM aet_historico WHERE tenant_id = $1`;
    if (processId) {
      sql += ` AND processo_id = $${params.length + 1}`;
      params.push(processId);
    }
    if (versionId) {
      sql += ` AND versao_id = $${params.length + 1}`;
      params.push(versionId);
    }
    sql += ` ORDER BY created_at DESC LIMIT $2`;
    const { rows } = await query(sql, params);
    res.json(rows.map(mapAetHistoryRow));
  });

  // ——— AET Corporativo: versionamento · aprovação · assinaturas ———

  app.put('/api/aet/processos/:id/responsavel-tecnico', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (!(await getProcessoOr404(tenantId, id))) return res.status(404).json({ error: 'Processo não encontrado' });
    await updateAetTechnicalResponsible(
      tenantId,
      id,
      {
        technicalResponsible: sanitizePlainText(req.body?.technicalResponsible, 255),
        technicalResponsibleCrea: sanitizePlainText(req.body?.technicalResponsibleCrea, 64),
        technicalResponsibleArt: sanitizePlainText(req.body?.technicalResponsibleArt, 64),
        unitId: req.body?.unitId,
        workstationId: req.body?.workstationId,
        jobRoleId: req.body?.jobRoleId,
        psicoCampaignId: req.body?.psicoCampaignId,
      },
      req.user,
    );
    const row = await getProcessoOr404(tenantId, id);
    res.json(mapProcesso(row));
  });

  app.get('/api/aet/processos/:id/versoes', requirePermission('aet:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (!(await getProcessoOr404(tenantId, id))) return res.status(404).json({ error: 'Processo não encontrado' });
    res.json(await listAetVersions(tenantId, id));
  });

  app.post('/api/aet/processos/:id/versoes', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (!(await getProcessoOr404(tenantId, id))) return res.status(404).json({ error: 'Processo não encontrado' });
    try {
      const version = await createAetVersion(tenantId, id, req.user, {
        reviewReason: sanitizePlainText(req.body?.reviewReason, 2000),
        nextReviewAt: req.body?.nextReviewAt,
        notes: sanitizePlainText(req.body?.notes, 4000),
        technicalResponsible: sanitizePlainText(req.body?.technicalResponsible, 255),
        technicalResponsibleCrea: sanitizePlainText(req.body?.technicalResponsibleCrea, 64),
        technicalResponsibleArt: sanitizePlainText(req.body?.technicalResponsibleArt, 64),
      });
      res.status(201).json(version);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/aet/versoes/:id', requirePermission('aet:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const version = await getVersionFull(tenantId, Number(req.params.id));
    if (!version) return res.status(404).json({ error: 'Versão não encontrada' });
    res.json(version);
  });

  app.post('/api/aet/versoes/:id/atualizar-snapshot', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    try {
      res.json(await refreshAetVersionSnapshot(tenantId, Number(req.params.id), req.user));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/aet/versoes/:id/gerar-relatorio', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    try {
      const report = await generateAetVersionReport(tenantId, Number(req.params.id), req.user);
      res.json(report);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/aet/versoes/:id/submit-approval', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const approverName = sanitizePlainText(req.body?.approverName, 255);
    if (!approverName) return res.status(400).json({ error: 'Informe o aprovador' });
    try {
      res.json(
        await submitAetApproval(tenantId, Number(req.params.id), req.user, {
          approverName,
          approverRole: sanitizePlainText(req.body?.approverRole, 255),
          approverEmail: req.body?.approverEmail,
        }),
      );
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/aet/versoes/:id/approve', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    try {
      res.json(await approveAetVersion(tenantId, Number(req.params.id), req.user, sanitizePlainText(req.body?.notes, 2000)));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/aet/versoes/:id/reject', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    try {
      res.json(await rejectAetVersion(tenantId, Number(req.params.id), req.user, sanitizePlainText(req.body?.notes, 2000) || 'Rejeitado'));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/aet/versoes/:id/sign', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const tipo = String(req.body?.type ?? '').toUpperCase();
    const nome = sanitizePlainText(req.body?.name, 255);
    if (!nome) return res.status(400).json({ error: 'Informe type e name' });
    try {
      const sig = await signAetVersion(tenantId, Number(req.params.id), req.user, {
        type: tipo,
        name: nome,
        role: sanitizePlainText(req.body?.role, 255),
        document: sanitizePlainText(req.body?.document, 64),
        statement: sanitizePlainText(req.body?.statement, 2000),
      });
      res.status(201).json(sig);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/aet/versoes/:id/revision', requirePermission('aet:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    try {
      res.status(201).json(
        await startAetRevision(tenantId, Number(req.params.id), req.user, {
          reviewReason: sanitizePlainText(req.body?.reviewReason, 2000),
          nextReviewAt: req.body?.nextReviewAt,
        }),
      );
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/aet/processos/:id/integracoes', requirePermission('aet:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'AET');
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (!(await getProcessoOr404(tenantId, id))) return res.status(404).json({ error: 'Processo não encontrado' });
    res.json(await listAetIntegrations(tenantId, id));
  });
}
