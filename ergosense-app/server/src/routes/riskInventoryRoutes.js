/**

 * Inventário de Riscos — NR-01 §1.5.7.3.2 / GRO

 */

import { requirePermission } from '../auth/rbac.js';

import { sanitizePlainText } from '../auth/sanitize.js';

import { query } from '../db.js';

import {

  isValidRiskType,

  RISK_TYPES,

} from '../riskInventoryUtils.js';

import { evaluateForTenant, getActiveCriteria } from '../services/riskCriteriaService.js';

import { logGroHistory } from '../services/groHistory.js';

import { refreshPgrFromInventory } from '../services/riskIntegrationHub.js';

import {

  buildNr015732Compliance,

  loadRiskLinks,

  parseEvidencias,

  syncMandatoryLinks,

  validateNr015732Payload,

} from '../services/riskInventoryLinks.js';

import {

  mapRiskOrgFields,

  ORG_RISK_SELECT_FIELDS,

  ORG_RISK_SELECT_JOINS,

  resolveOrgForRisk,

} from '../services/orgUtils.js';



function mapEvidenceJson(raw) {

  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw || '[]') : [];

  return list.map((e) => ({

    type: e.tipo ?? e.type ?? 'DOCUMENTO',

    description: e.descricao ?? e.description ?? '',

    reference: e.referencia ?? e.reference ?? '',

    hash: e.hash ?? undefined,

    createdAt: e.createdAt ?? undefined,

  }));

}



function mapRiskRow(row, links = []) {

  return {

    id: String(row.id),

    tenantId: row.tenant_id,

    type: row.tipo,

    sectorId: row.setor_id ? String(row.setor_id) : null,

    sectorName: row.setor_nome ?? null,

    collaboratorId: row.colaborador_id ? String(row.colaborador_id) : null,

    collaboratorName: row.colaborador_nome ?? null,

    ...mapRiskOrgFields(row),

    generatingSource: row.fonte_geradora,

    hazard: row.perigo,

    consequence: row.consequencia,

    probability: row.probabilidade,

    severity: row.severidade,

    riskScore: row.score_risco,

    riskLevel: row.nivel_risco,

    acceptable: row.aceitavel ?? null,

    criteriaMethodologyId: row.criterio_metodologia_id ? String(row.criterio_metodologia_id) : null,

    criteriaVersionId: row.criterio_versao_id ? String(row.criterio_versao_id) : null,

    exposureDuration: row.exposicao_duracao ?? '',

    exposureFrequency: row.exposicao_frequencia ?? '',

    exposureIntensity: row.exposicao_intensidade ?? '',

    exposedWorkersCount: row.numero_trabalhadores_expostos ?? 1,

    homogeneousExposureGroup: row.grupo_homogeneo_exposicao ?? '',

    existingMeasures: row.medidas_existentes ?? '',

    controlMeasures: row.medidas_controle ?? '',

    evidences: mapEvidenceJson(row.evidencias_json),

    analysisId: row.analise_id ? String(row.analise_id) : null,

    aetProcessId: row.aet_processo_id ? String(row.aet_processo_id) : null,

    pgrVersionId: row.pgr_versao_id ? String(row.pgr_versao_id) : null,

    responsible: row.responsavel ?? '',

    reviewDate: row.data_revisao ? row.data_revisao.toISOString().slice(0, 10) : null,

    status: row.status,

    groStage: row.etapa_gro ?? 'IDENTIFICACAO',

    originModule: row.origem_modulo ?? null,

    originEntityId: row.origem_entidade_id ? String(row.origem_entidade_id) : null,

    links,

    createdAt: row.created_at,

    updatedAt: row.updated_at,

  };

}



const SELECT_BASE = `

  SELECT r.*, s.nome AS setor_nome, c.nome AS colaborador_nome,

         ${ORG_RISK_SELECT_FIELDS}

  FROM inventario_riscos r

  LEFT JOIN setores s ON s.id = r.setor_id

  LEFT JOIN colaboradores c ON c.id = r.colaborador_id

  ${ORG_RISK_SELECT_JOINS}

`;



async function parseRiskPayload(tenantId, body) {

  const tipo = String(body?.type ?? body?.tipo ?? '').toUpperCase();

  const probability = Number(body?.probability ?? body?.probabilidade);

  const severity = Number(body?.severity ?? body?.severidade);

  const evaluation = await evaluateForTenant(tenantId, probability, severity);



  if (!isValidRiskType(tipo)) {

    return { error: `Tipo inválido. Use: ${RISK_TYPES.join(', ')}` };

  }

  if (!evaluation) {

    const active = await getActiveCriteria(tenantId);

    return {

      error: `Probabilidade e severidade devem ser inteiros de ${active.config.scaleMin} a ${active.config.scaleMax}`,

    };

  }

  const score = evaluation.score;

  const nivel = evaluation.level;



  const fonte = sanitizePlainText(body?.generatingSource ?? body?.fonteGeradora, 2000);

  const perigo = sanitizePlainText(body?.hazard ?? body?.perigo, 2000);

  const consequencia = sanitizePlainText(body?.consequence ?? body?.consequencia, 2000);



  if (!fonte || !perigo || !consequencia) {

    return { error: 'Fonte geradora, perigo e consequência são obrigatórios' };

  }



  const evidencias = parseEvidencias(body?.evidences ?? body?.evidencias);

  const numeroTrabalhadores = Number(body?.exposedWorkersCount ?? body?.numeroTrabalhadoresExpostos ?? 1);



  return {

    tipo,

    probability,

    severity,

    score,

    nivel,

    acceptable: evaluation.acceptable,

    criteriaMethodologyId: evaluation.methodologyId,

    criteriaVersionId: evaluation.versionId,

    fonte,

    perigo,

    consequencia,

    exposicaoDuracao: sanitizePlainText(body?.exposureDuration ?? body?.exposicaoDuracao, 512),

    exposicaoFrequencia: sanitizePlainText(body?.exposureFrequency ?? body?.exposicaoFrequencia, 512),

    exposicaoIntensidade: sanitizePlainText(body?.exposureIntensity ?? body?.exposicaoIntensidade, 512),

    numeroTrabalhadoresExpostos: Number.isFinite(numeroTrabalhadores) ? Math.max(0, Math.floor(numeroTrabalhadores)) : 1,

    grupoHomogeneoExposicao: sanitizePlainText(

      body?.homogeneousExposureGroup ?? body?.grupoHomogeneoExposicao,

      512,

    ),

    medidasExistentes: sanitizePlainText(body?.existingMeasures ?? body?.medidasExistentes, 4000),

    medidas: sanitizePlainText(body?.controlMeasures ?? body?.medidasControle, 4000),

    evidencias,

    analiseId: body?.analysisId ?? body?.analiseId ? Number(body.analysisId ?? body.analiseId) : null,

    aetProcessoId: body?.aetProcessId ?? body?.aetProcessoId ? Number(body.aetProcessId ?? body.aetProcessoId) : null,

    responsavel: sanitizePlainText(body?.responsible ?? body?.responsavel, 255),

    reviewDate: body?.reviewDate ?? body?.dataRevisao ?? null,

    sectorId: body?.sectorId ? Number(body.sectorId) : null,

    collaboratorId: body?.collaboratorId ? Number(body.collaboratorId) : null,

    workPostId: body?.workPostId ? Number(body.workPostId) : null,

    activityId: body?.activityId ? Number(body.activityId) : null,

    functionId: body?.functionId ? Number(body.functionId) : null,

    unitId: body?.unitId ? Number(body.unitId) : null,

    status: ['ativo', 'revisao', 'arquivado'].includes(body?.status) ? body.status : 'ativo',

  };

}



async function resolveSectorId(tenantId, sectorId, sectorName) {

  if (sectorId) {

    const { rows } = await query(

      `SELECT id FROM setores WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,

      [sectorId, tenantId],

    );

    return rows[0]?.id ?? null;

  }

  if (sectorName) {

    const name = sanitizePlainText(sectorName, 128);

    const { rows } = await query(

      `SELECT id FROM setores WHERE tenant_id = $1 AND nome = $2 AND deleted_at IS NULL LIMIT 1`,

      [tenantId, name],

    );

    return rows[0]?.id ?? null;

  }

  return null;

}



async function fetchRiskFull(tenantId, id) {

  const { rows } = await query(

    `${SELECT_BASE} WHERE r.id = $1 AND r.tenant_id = $2 AND r.deleted_at IS NULL`,

    [id, tenantId],

  );

  if (!rows[0]) return null;

  const links = await loadRiskLinks(query, tenantId, id);

  return mapRiskRow(rows[0], links);

}



export function registerRiskInventoryRoutes(app, { resolveOperationalTenant }) {

  app.get('/api/risk-inventory/summary', requirePermission('risk-inventory:read'), async (req, res) => {

    const tenantId = await resolveOperationalTenant(req, res, 'Inventário de Riscos');

    if (!tenantId) return;



    const { rows: totals } = await query(

      `SELECT

         COUNT(*)::int AS total,

         COUNT(*) FILTER (WHERE nivel_risco = 'critico')::int AS critico,

         COUNT(*) FILTER (WHERE nivel_risco = 'alto')::int AS alto,

         COUNT(*) FILTER (WHERE nivel_risco = 'medio')::int AS medio,

         COUNT(*) FILTER (WHERE nivel_risco = 'baixo')::int AS baixo,

         COUNT(*) FILTER (WHERE data_revisao IS NOT NULL AND data_revisao < CURRENT_DATE)::int AS revisao_vencida,

         COUNT(*) FILTER (WHERE data_revisao IS NOT NULL AND data_revisao <= CURRENT_DATE + INTERVAL '30 days')::int AS revisao_30d,

         COUNT(*) FILTER (WHERE

           exposicao_duracao IS NOT NULL AND exposicao_frequencia IS NOT NULL AND exposicao_intensidade IS NOT NULL

           AND grupo_homogeneo_exposicao IS NOT NULL AND jsonb_array_length(evidencias_json) > 0

         )::int AS nr015732_completo

       FROM inventario_riscos

       WHERE tenant_id = $1 AND deleted_at IS NULL`,

      [tenantId],

    );



    const { rows: byType } = await query(

      `SELECT tipo, COUNT(*)::int AS count

       FROM inventario_riscos

       WHERE tenant_id = $1 AND deleted_at IS NULL

       GROUP BY tipo ORDER BY tipo`,

      [tenantId],

    );



    const { rows: matrix } = await query(

      `SELECT severidade, probabilidade, COUNT(*)::int AS count

       FROM inventario_riscos

       WHERE tenant_id = $1 AND deleted_at IS NULL

       GROUP BY severidade, probabilidade`,

      [tenantId],

    );



    const t = totals[0] ?? {};

    const activeCriteria = await getActiveCriteria(tenantId);

    res.json({

      total: t.total ?? 0,

      byLevel: {

        critico: t.critico ?? 0,

        alto: t.alto ?? 0,

        medio: t.medio ?? 0,

        baixo: t.baixo ?? 0,

      },

      overdueReviews: t.revisao_vencida ?? 0,

      reviewsDue30Days: t.revisao_30d ?? 0,

      nr015732Complete: t.nr015732_completo ?? 0,

      byType: Object.fromEntries(byType.map((r) => [r.tipo, r.count])),

      matrix: matrix.map((r) => ({

        severity: r.severidade,

        probability: r.probabilidade,

        count: r.count,

        score: r.severidade * r.probabilidade,

      })),

      activeCriteria: {

        methodologyId: activeCriteria.methodologyId ? String(activeCriteria.methodologyId) : null,

        versionId: activeCriteria.versionId ? String(activeCriteria.versionId) : null,

        versionNumber: activeCriteria.versionNumber,

        name: activeCriteria.name,

        matrixType: activeCriteria.matrixType,

      },

    });

  });



  app.get('/api/risk-inventory', requirePermission('risk-inventory:read'), async (req, res) => {

    const tenantId = await resolveOperationalTenant(req, res, 'Inventário de Riscos');

    if (!tenantId) return;



    const tipo = req.query.type?.toString().toUpperCase();

    const nivel = req.query.level?.toString().toLowerCase();

    const params = [tenantId];

    let where = 'r.tenant_id = $1 AND r.deleted_at IS NULL';



    if (tipo && isValidRiskType(tipo)) {

      params.push(tipo);

      where += ` AND r.tipo = $${params.length}`;

    }

    if (nivel && ['critico', 'alto', 'medio', 'baixo'].includes(nivel)) {

      params.push(nivel);

      where += ` AND r.nivel_risco = $${params.length}`;

    }



    const { rows } = await query(

      `${SELECT_BASE} WHERE ${where} ORDER BY r.score_risco DESC, r.updated_at DESC`,

      params,

    );



    const items = await Promise.all(

      rows.map(async (row) => {

        const links = await loadRiskLinks(query, tenantId, row.id);

        return mapRiskRow(row, links);

      }),

    );

    res.json(items);

  });



  app.get('/api/risk-inventory/:id', requirePermission('risk-inventory:read'), async (req, res) => {

    const tenantId = await resolveOperationalTenant(req, res, 'Inventário de Riscos');

    if (!tenantId) return;

    const id = Number(req.params.id);

    if (!id) return res.status(400).json({ error: 'ID inválido' });



    const item = await fetchRiskFull(tenantId, id);

    if (!item) return res.status(404).json({ error: 'Risco não encontrado' });

    res.json(item);

  });



  app.get('/api/risk-inventory/:id/compliance', requirePermission('risk-inventory:read'), async (req, res) => {

    const tenantId = await resolveOperationalTenant(req, res, 'Inventário de Riscos');

    if (!tenantId) return;

    const id = Number(req.params.id);

    if (!id) return res.status(400).json({ error: 'ID inválido' });



    const { rows } = await query(

      `${SELECT_BASE} WHERE r.id = $1 AND r.tenant_id = $2 AND r.deleted_at IS NULL`,

      [id, tenantId],

    );

    if (!rows.length) return res.status(404).json({ error: 'Risco não encontrado' });



    const links = await loadRiskLinks(query, tenantId, id);

    const compliance = await buildNr015732Compliance(query, tenantId, rows[0], links);

    res.json({ riskId: String(id), ...compliance, links });

  });



  app.get('/api/risk-inventory/:id/links', requirePermission('risk-inventory:read'), async (req, res) => {

    const tenantId = await resolveOperationalTenant(req, res, 'Inventário de Riscos');

    if (!tenantId) return;

    const id = Number(req.params.id);

    if (!id) return res.status(400).json({ error: 'ID inválido' });



    const exists = await query(

      `SELECT id FROM inventario_riscos WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,

      [id, tenantId],

    );

    if (!exists.rows.length) return res.status(404).json({ error: 'Risco não encontrado' });



    const links = await loadRiskLinks(query, tenantId, id);

    res.json({ riskId: String(id), links });

  });



  app.post('/api/risk-inventory', requirePermission('risk-inventory:create'), async (req, res) => {

    const tenantId = await resolveOperationalTenant(req, res, 'Inventário de Riscos');

    if (!tenantId) return;



    const parsed = await parseRiskPayload(tenantId, req.body);

    if (parsed.error) return res.status(400).json({ error: parsed.error });



    const validationErrors = validateNr015732Payload(parsed, {

      analiseId: parsed.analiseId,

      aetProcessoId: parsed.aetProcessoId,

    });

    if (validationErrors.length) {

      return res.status(400).json({ error: validationErrors.join('; '), details: validationErrors });

    }



    const setorId = await resolveSectorId(tenantId, parsed.sectorId, req.body?.sectorName);

    let colaboradorId = null;

    if (parsed.collaboratorId) {

      const { rows } = await query(

        `SELECT id FROM colaboradores WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,

        [parsed.collaboratorId, tenantId],

      );

      colaboradorId = rows[0]?.id ?? null;

    }



    const org = await resolveOrgForRisk(query, tenantId, {

      postoId: parsed.workPostId,

      collaboratorId: colaboradorId,

      sectorId: setorId,

      functionId: parsed.functionId,

      activityId: parsed.activityId,

      unitId: parsed.unitId,

    });



    const reviewDate = parsed.reviewDate ? String(parsed.reviewDate).slice(0, 10) : null;



    const { rows } = await query(

      `INSERT INTO inventario_riscos (

         tenant_id, tipo, setor_id, colaborador_id,

         unidade_id, funcao_id, atividade_id, posto_trabalho_id,

         fonte_geradora, perigo, consequencia,

         probabilidade, severidade, score_risco, nivel_risco,

         exposicao_duracao, exposicao_frequencia, exposicao_intensidade,

         numero_trabalhadores_expostos, grupo_homogeneo_exposicao,

         medidas_existentes, medidas_controle, evidencias_json,

         analise_id, aet_processo_id,

         responsavel, data_revisao, status,

         origem_modulo, origem_entidade_id,

         criterio_metodologia_id, criterio_versao_id, aceitavel

       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,'MANUAL',$29,$30,$31,$32)

       RETURNING id`,

      [

        tenantId,

        parsed.tipo,

        org?.sectorId ? Number(org.sectorId) : setorId,

        colaboradorId,

        org?.unitId ? Number(org.unitId) : null,

        org?.functionId ? Number(org.functionId) : null,

        org?.activityId ? Number(org.activityId) : null,

        org?.workPostId ? Number(org.workPostId) : null,

        parsed.fonte,

        parsed.perigo,

        parsed.consequencia,

        parsed.probability,

        parsed.severity,

        parsed.score,

        parsed.nivel,

        parsed.exposicaoDuracao,

        parsed.exposicaoFrequencia,

        parsed.exposicaoIntensidade,

        parsed.numeroTrabalhadoresExpostos,

        parsed.grupoHomogeneoExposicao,

        parsed.medidasExistentes || null,

        parsed.medidas || null,

        JSON.stringify(parsed.evidencias),

        parsed.analiseId,

        parsed.aetProcessoId,

        parsed.responsavel || null,

        reviewDate,

        parsed.status,

        null,

        parsed.criteriaMethodologyId,

        parsed.criteriaVersionId,

        parsed.acceptable,

      ],

    );



    const riskId = rows[0].id;



    await query(

      `UPDATE inventario_riscos SET origem_entidade_id = id WHERE id = $1 AND tenant_id = $2`,

      [riskId, tenantId],

    );



    await syncMandatoryLinks(null, {

      tenantId,

      riskId,

      tipo: parsed.tipo,

      analiseId: parsed.analiseId,

      aetProcessoId: parsed.aetProcessoId,

      groStage: 'IDENTIFICACAO',

      user: req.user,

    });



    await logGroHistory({

      tenantId,

      riskId,

      stage: 'IDENTIFICACAO',

      action: 'RISCO_IDENTIFICADO',

      user: req.user,

      details: { hazard: parsed.perigo, type: parsed.tipo, nr015732: true },

    });



    try {

      await refreshPgrFromInventory(tenantId, req.user);

    } catch (e) {

      console.warn('refreshPgrFromInventory:', e.message);

    }



    const item = await fetchRiskFull(tenantId, riskId);

    res.status(201).json(item);

  });



  app.put('/api/risk-inventory/:id', requirePermission('risk-inventory:update'), async (req, res) => {

    const tenantId = await resolveOperationalTenant(req, res, 'Inventário de Riscos');

    if (!tenantId) return;

    const id = Number(req.params.id);

    if (!id) return res.status(400).json({ error: 'ID inválido' });



    const existing = await query(

      `SELECT id, etapa_gro, analise_id, aet_processo_id FROM inventario_riscos

       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,

      [id, tenantId],

    );

    if (!existing.rows.length) return res.status(404).json({ error: 'Risco não encontrado' });



    const parsed = await parseRiskPayload(tenantId, req.body);

    if (parsed.error) return res.status(400).json({ error: parsed.error });



    const analiseId = parsed.analiseId ?? existing.rows[0].analise_id;

    const aetProcessoId = parsed.aetProcessoId ?? existing.rows[0].aet_processo_id;



    const validationErrors = validateNr015732Payload(parsed, { analiseId, aetProcessoId });

    if (validationErrors.length) {

      return res.status(400).json({ error: validationErrors.join('; '), details: validationErrors });

    }



    const setorId = await resolveSectorId(tenantId, parsed.sectorId, req.body?.sectorName);

    let colaboradorId = null;

    if (parsed.collaboratorId) {

      const { rows } = await query(

        `SELECT id FROM colaboradores WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,

        [parsed.collaboratorId, tenantId],

      );

      colaboradorId = rows[0]?.id ?? null;

    }



    const org = await resolveOrgForRisk(query, tenantId, {

      postoId: parsed.workPostId,

      collaboratorId: colaboradorId,

      sectorId: setorId,

      functionId: parsed.functionId,

      activityId: parsed.activityId,

      unitId: parsed.unitId,

    });



    const reviewDate = parsed.reviewDate ? String(parsed.reviewDate).slice(0, 10) : null;



    await query(

      `UPDATE inventario_riscos SET

         tipo = $1, setor_id = $2, colaborador_id = $3,

         unidade_id = $4, funcao_id = $5, atividade_id = $6, posto_trabalho_id = $7,

         fonte_geradora = $8, perigo = $9, consequencia = $10,

         probabilidade = $11, severidade = $12, score_risco = $13, nivel_risco = $14,

         exposicao_duracao = $15, exposicao_frequencia = $16, exposicao_intensidade = $17,

         numero_trabalhadores_expostos = $18, grupo_homogeneo_exposicao = $19,

         medidas_existentes = $20, medidas_controle = $21, evidencias_json = $22,

         analise_id = $23, aet_processo_id = $24,

         responsavel = $25, data_revisao = $26, status = $27,

         criterio_metodologia_id = $28, criterio_versao_id = $29, aceitavel = $30,

         updated_at = NOW()

       WHERE id = $31 AND tenant_id = $32`,

      [

        parsed.tipo,

        org?.sectorId ? Number(org.sectorId) : setorId,

        colaboradorId,

        org?.unitId ? Number(org.unitId) : null,

        org?.functionId ? Number(org.functionId) : null,

        org?.activityId ? Number(org.activityId) : null,

        org?.workPostId ? Number(org.workPostId) : null,

        parsed.fonte,

        parsed.perigo,

        parsed.consequencia,

        parsed.probability,

        parsed.severity,

        parsed.score,

        parsed.nivel,

        parsed.exposicaoDuracao,

        parsed.exposicaoFrequencia,

        parsed.exposicaoIntensidade,

        parsed.numeroTrabalhadoresExpostos,

        parsed.grupoHomogeneoExposicao,

        parsed.medidasExistentes || null,

        parsed.medidas || null,

        JSON.stringify(parsed.evidencias),

        analiseId,

        aetProcessoId,

        parsed.responsavel || null,

        reviewDate,

        parsed.status,

        parsed.criteriaMethodologyId,

        parsed.criteriaVersionId,

        parsed.acceptable,

        id,

        tenantId,

      ],

    );



    await syncMandatoryLinks(null, {

      tenantId,

      riskId: id,

      tipo: parsed.tipo,

      analiseId,

      aetProcessoId,

      groStage: existing.rows[0].etapa_gro ?? 'IDENTIFICACAO',

      user: req.user,

    });



    try {

      await refreshPgrFromInventory(tenantId, req.user);

    } catch (e) {

      console.warn('refreshPgrFromInventory:', e.message);

    }



    const item = await fetchRiskFull(tenantId, id);

    res.json(item);

  });



  app.delete('/api/risk-inventory/:id', requirePermission('risk-inventory:delete'), async (req, res) => {

    const tenantId = await resolveOperationalTenant(req, res, 'Inventário de Riscos');

    if (!tenantId) return;

    const id = Number(req.params.id);

    if (!id) return res.status(400).json({ error: 'ID inválido' });



    const { rows } = await query(

      `UPDATE inventario_riscos SET deleted_at = NOW(), updated_at = NOW()

       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL

       RETURNING id`,

      [id, tenantId],

    );

    if (!rows.length) return res.status(404).json({ error: 'Risco não encontrado' });

    res.json({ ok: true, id: String(rows[0].id) });

  });

}


