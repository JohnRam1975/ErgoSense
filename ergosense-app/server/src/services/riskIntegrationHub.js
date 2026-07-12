/**
 * Hub de integração NR-01 — Inventário · GRO · PGR · SST · AET · Psicossocial
 * Sincronização automática entre módulos existentes (sem novos conceitos).
 */
import { query as defaultQuery } from '../db.js';
import { evaluateForTenant } from './riskCriteriaService.js';
import { GRO_STAGES } from '../groUtils.js';
import { logGroHistory } from './groHistory.js';
import { logPgrHistory } from './pgrHistory.js';
import { buildPgrSnapshot } from './pgrSnapshot.js';
import { resolveOrgForRisk } from './orgUtils.js';
import { parseEvidencias, syncMandatoryLinks } from './riskInventoryLinks.js';

export const ORIGIN_MODULES = ['ANALISE', 'AET', 'PSICOSSOCIAL', 'INSPECAO', 'AUDITORIA', 'NC', 'MANUAL', 'DENUNCIA'];

const SEVERITY_TO_MATRIX = {
  critico: { probabilidade: 5, severidade: 5 },
  alto: { probabilidade: 4, severidade: 4 },
  medio: { probabilidade: 3, severidade: 3 },
  baixo: { probabilidade: 2, severidade: 2 },
};

function rulaToMatrix(rula) {
  if (rula >= 6) return { probabilidade: 4, severidade: 4 };
  if (rula >= 4) return { probabilidade: 3, severidade: 3 };
  return { probabilidade: 2, severidade: 2 };
}

function q(client) {
  return client?.query ? client.query.bind(client) : defaultQuery;
}

export function mapRiskLevelToMatrix(level, rula = null, reba = null) {
  const key = String(level ?? 'medio').toLowerCase();
  if (rula != null && Number.isFinite(Number(rula))) {
    return rulaToMatrix(Number(rula));
  }
  if (reba != null && Number(reba) >= 11) return SEVERITY_TO_MATRIX.alto;
  if (reba != null && Number(reba) >= 8) return SEVERITY_TO_MATRIX.medio;
  return SEVERITY_TO_MATRIX[key] ?? SEVERITY_TO_MATRIX.medio;
}

export function suggestGroStage(nivel, hasOpenPlan) {
  if (nivel === 'critico' || nivel === 'alto') return hasOpenPlan ? 'CONTROLE' : 'AVALIACAO';
  if (nivel === 'medio') return 'AVALIACAO';
  return 'IDENTIFICACAO';
}

export function needsCapa(nivel, origemModulo) {
  if (nivel === 'critico') return true;
  if (['INSPECAO', 'AUDITORIA', 'NC'].includes(origemModulo)) return true;
  return false;
}

async function findRiskByOrigin(runQuery, tenantId, origemModulo, origemEntidadeId) {
  const { rows } = await runQuery(
    `SELECT * FROM inventario_riscos
     WHERE tenant_id = $1 AND origem_modulo = $2 AND origem_entidade_id = $3 AND deleted_at IS NULL`,
    [tenantId, origemModulo, origemEntidadeId],
  );
  return rows[0] ?? null;
}

async function ensureGroActionPlan(runQuery, tenantId, riskId, descricao, responsavel, prazo, user, origemModulo) {
  const { rows: existing } = await runQuery(
    `SELECT id FROM gro_plano_acao
     WHERE tenant_id = $1 AND inventario_risco_id = $2 AND deleted_at IS NULL
       AND status NOT IN ('concluido','cancelado')
     LIMIT 1`,
    [tenantId, riskId],
  );
  if (existing.length) return existing[0].id;

  const tipoControle = origemModulo === 'INSPECAO' || origemModulo === 'AUDITORIA' ? 'ADMINISTRATIVA' : 'ENGENHARIA';
  const { rows } = await runQuery(
    `INSERT INTO gro_plano_acao (tenant_id, inventario_risco_id, descricao, tipo_controle, responsavel, prazo, status)
     VALUES ($1,$2,$3,$4,$5,$6,'aberto') RETURNING id`,
    [tenantId, riskId, descricao, tipoControle, responsavel ?? '', prazo ?? null],
  );
  await logGroHistory({
    tenantId,
    riskId,
    actionPlanId: rows[0].id,
    action: 'PLANO_CRIADO_INTEGRACAO',
    user,
    details: { origemModulo },
  });
  return rows[0].id;
}

async function ensureGroIndicator(runQuery, tenantId, riskId, nome, nivel, user) {
  const { rows: existing } = await runQuery(
    `SELECT id FROM gro_indicadores
     WHERE tenant_id = $1 AND inventario_risco_id = $2 AND nome = $3 AND deleted_at IS NULL`,
    [tenantId, riskId, nome],
  );
  const meta = nivel === 'critico' ? 0 : nivel === 'alto' ? 1 : 2;
  if (existing.length) {
    await runQuery(
      `UPDATE gro_indicadores SET valor_atual = $1, ultima_medicao = CURRENT_DATE, updated_at = NOW() WHERE id = $2`,
      [meta, existing[0].id],
    );
    return existing[0].id;
  }
  const { rows } = await runQuery(
    `INSERT INTO gro_indicadores (tenant_id, inventario_risco_id, nome, tipo, meta, valor_atual, unidade, frequencia, ultima_medicao, proxima_medicao)
     VALUES ($1,$2,$3,'LEADING',$4,$5,'ocorrencias','mensal',CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days') RETURNING id`,
    [tenantId, riskId, nome, meta, meta],
  );
  await logGroHistory({
    tenantId,
    riskId,
    indicatorId: rows[0].id,
    action: 'INDICADOR_CRIADO_INTEGRACAO',
    user,
  });
  return rows[0].id;
}

async function syncPgrDraft(runQuery, tenantId, user) {
  const { rows: draft } = await runQuery(
    `SELECT v.id, v.numero FROM pgr_versoes v
     JOIN pgr_programas p ON p.id = v.programa_id AND p.tenant_id = $1 AND p.deleted_at IS NULL
     WHERE v.tenant_id = $1 AND v.status IN ('RASCUNHO','EM_REVISAO')
     ORDER BY v.numero_sequencial DESC LIMIT 1`,
    [tenantId],
  );
  if (draft[0]) {
    const snapshot = await buildPgrSnapshot(tenantId);
    await runQuery(
      `UPDATE pgr_versoes SET snapshot_json = $1, requer_atualizacao = FALSE, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(snapshot), draft[0].id],
    );
    await logPgrHistory({
      tenantId,
      versionId: draft[0].id,
      action: 'SNAPSHOT_SINCRONIZADO_INTEGRACAO',
      user,
      details: { riscos: snapshot.inventarioRiscos?.length ?? 0 },
    });
    return { updated: true, versionId: draft[0].id, mode: 'draft_refresh' };
  }

  await runQuery(
    `UPDATE pgr_versoes SET requer_atualizacao = TRUE, updated_at = NOW()
     WHERE tenant_id = $1 AND status = 'APROVADO'
       AND id = (
         SELECT v.id FROM pgr_versoes v
         JOIN pgr_programas p ON p.id = v.programa_id AND p.tenant_id = $1
         WHERE v.status = 'APROVADO' ORDER BY v.numero_sequencial DESC LIMIT 1
       )`,
    [tenantId],
  );
  await logPgrHistory({
    tenantId,
    action: 'PGR_REQUER_NOVA_VERSAO',
    user,
    details: { motivo: 'Alteração no inventário sem rascunho ativo' },
  });
  return { updated: false, mode: 'flag_approved' };
}

async function ensureCapaChain(runQuery, tenantId, riskId, descricao, responsavel, prazo, ncId, user) {
  const { rows: openCapa } = await runQuery(
    `SELECT id FROM sst_capa WHERE tenant_id = $1 AND inventario_risco_id = $2 AND deleted_at IS NULL
       AND status NOT IN ('concluido','verificado','cancelado') LIMIT 1`,
    [tenantId, riskId],
  );
  if (openCapa.length) return openCapa[0].id;

  const { rows: planRows } = await runQuery(
    `SELECT id FROM gro_plano_acao WHERE tenant_id = $1 AND inventario_risco_id = $2 AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId, riskId],
  );
  const { rows: capaRows } = await runQuery(
    `INSERT INTO sst_capa (tenant_id, nc_id, inventario_risco_id, gro_plano_acao_id, tipo, descricao, acao, responsavel, prazo)
     VALUES ($1,$2,$3,$4,'CORRETIVA',$5,$5,$6,$7) RETURNING id`,
    [tenantId, ncId, riskId, planRows[0]?.id ?? null, descricao, responsavel ?? '', prazo ?? null],
  );
  return capaRows[0].id;
}

export async function propagateRiskIntegration(client, payload) {
  const runQuery = q(client);
  const {
    tenantId,
    user = null,
    origemModulo,
    origemEntidadeId,
    tipo,
    setorId = null,
    colaboradorId = null,
    fonteGeradora,
    perigo,
    consequencia,
    probabilidade,
    severidade,
    medidasControle = null,
    medidasExistentes = null,
    responsavel = null,
    reviewDate = null,
    exposicaoDuracao = null,
    exposicaoFrequencia = null,
    exposicaoIntensidade = null,
    numeroTrabalhadoresExpostos = 1,
    grupoHomogeneoExposicao = null,
    evidencias = null,
    analiseId = null,
    aetProcessoId = null,
    linkTable = null,
    createCapa = false,
    ncId = null,
    skipPgr = false,
  } = payload;

  const evidenciasJson = JSON.stringify(parseEvidencias(evidencias ?? []));

  if (!ORIGIN_MODULES.includes(origemModulo)) {
    throw new Error(`origemModulo inválido: ${origemModulo}`);
  }

  const prob = Number(probabilidade);
  const sev = Number(severidade);
  const evaluation = await evaluateForTenant(tenantId, prob, sev, runQuery);
  if (!evaluation) throw new Error('Matriz de risco inválida');
  const score = evaluation.score;
  const nivel = evaluation.level;
  const acceptable = evaluation.acceptable;
  const criteriaMethodologyId = evaluation.methodologyId;
  const criteriaVersionId = evaluation.versionId;

  const org = await resolveOrgForRisk(runQuery, tenantId, {
    postoId: payload.postoId ?? payload.workPostId,
    collaboratorId: colaboradorId,
    sectorId: setorId,
  });

  const existing = await findRiskByOrigin(runQuery, tenantId, origemModulo, origemEntidadeId);
  let riskId;
  let created = false;

  const resolvedAnaliseId = analiseId ?? (origemModulo === 'ANALISE' ? origemEntidadeId : null);
  const resolvedAetId = aetProcessoId ?? (origemModulo === 'AET' ? origemEntidadeId : null);

  if (existing) {
    await runQuery(
      `UPDATE inventario_riscos SET
         tipo = $1, setor_id = COALESCE($2, setor_id), colaborador_id = COALESCE($3, colaborador_id),
         unidade_id = COALESCE($4, unidade_id), funcao_id = COALESCE($5, funcao_id),
         atividade_id = COALESCE($6, atividade_id), posto_trabalho_id = COALESCE($7, posto_trabalho_id),
         fonte_geradora = $8, perigo = $9, consequencia = $10,
         probabilidade = $11, severidade = $12, score_risco = $13, nivel_risco = $14,
         exposicao_duracao = COALESCE($15, exposicao_duracao),
         exposicao_frequencia = COALESCE($16, exposicao_frequencia),
         exposicao_intensidade = COALESCE($17, exposicao_intensidade),
         numero_trabalhadores_expostos = COALESCE($18, numero_trabalhadores_expostos),
         grupo_homogeneo_exposicao = COALESCE($19, grupo_homogeneo_exposicao),
         medidas_existentes = COALESCE($20, medidas_existentes),
         medidas_controle = COALESCE($21, medidas_controle),
         evidencias_json = CASE WHEN $22::jsonb != '[]'::jsonb THEN $22::jsonb ELSE evidencias_json END,
         analise_id = COALESCE($23, analise_id),
         aet_processo_id = COALESCE($24, aet_processo_id),
         responsavel = COALESCE($25, responsavel),
         data_revisao = COALESCE($26, data_revisao),
         criterio_metodologia_id = $27, criterio_versao_id = $28, aceitavel = $29,
         status = 'ativo', updated_at = NOW()
       WHERE id = $30`,
      [
        tipo,
        org?.sectorId ? Number(org.sectorId) : setorId,
        colaboradorId,
        org?.unitId ? Number(org.unitId) : null,
        org?.functionId ? Number(org.functionId) : null,
        org?.activityId ? Number(org.activityId) : null,
        org?.workPostId ? Number(org.workPostId) : null,
        fonteGeradora, perigo, consequencia,
        prob, sev, score, nivel,
        exposicaoDuracao, exposicaoFrequencia, exposicaoIntensidade,
        numeroTrabalhadoresExpostos, grupoHomogeneoExposicao,
        medidasExistentes, medidasControle, evidenciasJson,
        resolvedAnaliseId, resolvedAetId,
        responsavel, reviewDate,
        criteriaMethodologyId, criteriaVersionId, acceptable,
        existing.id,
      ],
    );
    riskId = existing.id;
  } else {
    const { rows } = await runQuery(
      `INSERT INTO inventario_riscos (
         tenant_id, tipo, setor_id, colaborador_id,
         unidade_id, funcao_id, atividade_id, posto_trabalho_id,
         origem_modulo, origem_entidade_id,
         fonte_geradora, perigo, consequencia, probabilidade, severidade, score_risco, nivel_risco,
         criterio_metodologia_id, criterio_versao_id, aceitavel,
         exposicao_duracao, exposicao_frequencia, exposicao_intensidade,
         numero_trabalhadores_expostos, grupo_homogeneo_exposicao,
         medidas_existentes, medidas_controle, evidencias_json,
         analise_id, aet_processo_id,
         responsavel, data_revisao, status, etapa_gro
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,'ativo','IDENTIFICACAO') RETURNING id`,
      [
        tenantId,
        tipo,
        org?.sectorId ? Number(org.sectorId) : setorId,
        colaboradorId,
        org?.unitId ? Number(org.unitId) : null,
        org?.functionId ? Number(org.functionId) : null,
        org?.activityId ? Number(org.activityId) : null,
        org?.workPostId ? Number(org.workPostId) : null,
        origemModulo, origemEntidadeId,
        fonteGeradora, perigo, consequencia, prob, sev, score, nivel,
        criteriaMethodologyId, criteriaVersionId, acceptable,
        exposicaoDuracao ?? 'Não informada',
        exposicaoFrequencia ?? 'Não informada',
        exposicaoIntensidade ?? 'Não informada',
        numeroTrabalhadoresExpostos ?? 1,
        grupoHomogeneoExposicao ?? 'Grupo operacional',
        medidasExistentes, medidasControle, evidenciasJson,
        resolvedAnaliseId, resolvedAetId,
        responsavel, reviewDate,
      ],
    );
    riskId = rows[0].id;
    created = true;
  }

  const planDesc = medidasControle || `Plano de ação — ${perigo} (origem: ${origemModulo})`;
  let planId = null;
  if (nivel === 'critico' || nivel === 'alto' || createCapa || origemModulo === 'NC') {
    planId = await ensureGroActionPlan(runQuery, tenantId, riskId, planDesc, responsavel, reviewDate, user, origemModulo);
  }

  const groStage = suggestGroStage(nivel, Boolean(planId));
  await runQuery(`UPDATE inventario_riscos SET etapa_gro = $1, updated_at = NOW() WHERE id = $2`, [groStage, riskId]);

  await syncMandatoryLinks(client, {
    tenantId,
    riskId,
    tipo,
    analiseId: resolvedAnaliseId,
    aetProcessoId: resolvedAetId,
    groStage,
    user,
  });

  await ensureGroIndicator(runQuery, tenantId, riskId, `Monitoramento — ${origemModulo}`, nivel, user);

  let capaId = null;
  if (createCapa || needsCapa(nivel, origemModulo)) {
    capaId = await ensureCapaChain(runQuery, tenantId, riskId, planDesc, responsavel, reviewDate, ncId, user);
  }

  let pgrResult = null;
  if (!skipPgr) {
    pgrResult = await syncPgrDraft(runQuery, tenantId, user);
  }

  const allowedLinks = ['analises', 'aet_processos', 'psico_fatores_mte', 'psico_respostas', 'sst_inspecoes', 'sst_nao_conformidades'];
  if (linkTable && allowedLinks.includes(linkTable)) {
    await runQuery(
      `UPDATE ${linkTable} SET inventario_risco_id = $1 WHERE id = $2 AND tenant_id = $3`,
      [riskId, origemEntidadeId, tenantId],
    );
  }

  await logGroHistory({
    tenantId,
    riskId,
    actionPlanId: planId,
    stage: groStage,
    action: created ? 'INTEGRACAO_RISCO_CRIADO' : 'INTEGRACAO_RISCO_ATUALIZADO',
    user,
    details: { origemModulo, origemEntidadeId, nivel, groStage, planId, capaId, pgr: pgrResult },
  });

  return { riskId, created, nivel, groStage, planId, capaId, pgr: pgrResult };
}

export async function integrateFromAnalysis(client, tenantId, analiseId, analysis, user) {
  const runQuery = q(client);
  const { rows } = await runQuery(
    `SELECT r.rula, r.reba, r.risk_level, a.atividade, a.setor_id, a.colaborador_id
     FROM resultados_ia r JOIN analises a ON a.id = r.analise_id
     WHERE r.analise_id = $1 AND r.tenant_id = $2`,
    [analiseId, tenantId],
  );
  const row = rows[0];
  if (!row) return null;

  const matrix = mapRiskLevelToMatrix(row.risk_level ?? analysis.risk, row.rula, row.reba);
  const evaluation = await evaluateForTenant(tenantId, matrix.probabilidade, matrix.severidade, runQuery);
  const nivel = evaluation?.level ?? 'medio';
  if (nivel === 'baixo' && (row.rula ?? 99) <= 2 && (row.reba ?? 99) <= 4) return null;

  const review = new Date();
  review.setMonth(review.getMonth() + (nivel === 'critico' ? 1 : nivel === 'alto' ? 2 : 6));

  return propagateRiskIntegration(client, {
    tenantId,
    user,
    origemModulo: 'ANALISE',
    origemEntidadeId: analiseId,
    tipo: 'ERGONOMICO',
    setorId: row.setor_id,
    colaboradorId: row.colaborador_id,
    fonteGeradora: `Análise ergonômica — ${row.atividade ?? analysis.activity ?? 'atividade'}`,
    perigo: `Postura / esforço — RULA ${row.rula ?? '—'} · REBA ${row.reba ?? '—'}`,
    consequencia: 'Lesões musculoesqueléticas, fadiga, absenteísmo',
    probabilidade: matrix.probabilidade,
    severidade: matrix.severidade,
    exposicaoDuracao: 'Jornada / sessão analisada',
    exposicaoFrequencia: 'Diária ou conforme jornada',
    exposicaoIntensidade: `RULA ${row.rula ?? '—'} · REBA ${row.reba ?? '—'}`,
    numeroTrabalhadoresExpostos: 1,
    grupoHomogeneoExposicao: row.atividade ?? analysis.activity ?? 'Operadores expostos',
    medidasExistentes: analysis.nr17Report?.recommendations?.[0]?.text ?? 'Medidas do posto conforme análise',
    medidasControle: analysis.nr17Report?.recommendations?.[0]?.text ?? 'Revisar posto e pausas conforme NR-17',
    evidencias: [{ tipo: 'ANALISE_ERGONOMICA', referencia: String(analiseId), descricao: 'Análise postural integrada NR-17' }],
    analiseId,
    responsavel: user?.name ?? '',
    reviewDate: review.toISOString().slice(0, 10),
    linkTable: 'analises',
    createCapa: nivel === 'critico',
  });
}

export async function integrateFromAet(client, tenantId, processoId, user) {
  const runQuery = q(client);
  const { rows } = await runQuery(
    `SELECT * FROM aet_processos WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [processoId, tenantId],
  );
  const proc = rows[0];
  if (!proc) return null;

  const methods = proc.metodos_json ?? {};
  const matrix = mapRiskLevelToMatrix('medio', methods.rula?.score, methods.reba?.score);
  const report = proc.relatorio_json;
  if (report?.conclusao?.nivelRisco) {
    const m = mapRiskLevelToMatrix(report.conclusao.nivelRisco, methods.rula?.score, methods.reba?.score);
    matrix.probabilidade = m.probabilidade;
    matrix.severidade = m.severidade;
  }

  const aetEval = await evaluateForTenant(tenantId, matrix.probabilidade, matrix.severidade, runQuery);

  const result = await propagateRiskIntegration(client, {
    tenantId,
    user,
    origemModulo: 'AET',
    origemEntidadeId: processoId,
    tipo: 'ERGONOMICO',
    setorId: proc.setor_id,
    colaboradorId: proc.colaborador_id,
    postoId: proc.posto_trabalho_id,
    fonteGeradora: `AET — ${proc.titulo}`,
    perigo: report?.sections?.find?.((s) => s.id === '10')?.content?.conclusaoGeral
      ? `Condições ergonômicas — ${proc.titulo}`
      : report?.conclusao?.titulo ?? `Condições ergonômicas — ${proc.titulo}`,
    consequencia: report?.conclusao?.impacto ?? 'Agravamento de riscos ergonômicos (NR-17)',
    probabilidade: matrix.probabilidade,
    severidade: matrix.severidade,
    exposicaoDuracao: proc.teleatendimento_json?.jornada ?? 'Conforme jornada do posto AET',
    exposicaoFrequencia: proc.teleatendimento_json?.frequencia ?? 'Conforme rotina operacional',
    exposicaoIntensidade: `RULA ${methods.rula?.score ?? '—'} · REBA ${methods.reba?.score ?? '—'}`,
    numeroTrabalhadoresExpostos: proc.teleatendimento_json?.trabalhadores ?? 1,
    grupoHomogeneoExposicao: proc.titulo ?? 'Grupo AET',
    medidasExistentes: proc.plano_acao_json?.[0]?.descricao ?? report?.recomendacoes?.[0] ?? 'Medidas do laudo AET',
    medidasControle: proc.plano_acao_json?.[0]?.descricao ?? report?.recomendacoes?.[0] ?? 'Executar plano AET',
    evidencias: [{ tipo: 'AET', referencia: String(processoId), descricao: `AET ${proc.titulo}` }],
    aetProcessoId: processoId,
    responsavel: proc.responsavel_tecnico_nome ?? proc.elaborado_por ?? user?.name ?? '',
    linkTable: 'aet_processos',
    createCapa: aetEval?.level === 'critico',
  });

  return {
    inventarioRiscoId: result.riskId,
    groPlanoId: result.planId,
    pgrVersaoId: result.pgr?.versionId ?? null,
    nivel: result.nivel,
    groStage: result.groStage,
  };
}

export async function integrateFromPsicoFator(client, tenantId, fatorRow, user) {
  const { getMteFator } = await import('../data/mteFatores.js');
  const catalog = getMteFator(fatorRow.fator_codigo);
  if (!catalog) return null;

  return propagateRiskIntegration(client, {
    tenantId,
    user,
    origemModulo: 'PSICOSSOCIAL',
    origemEntidadeId: fatorRow.id,
    tipo: 'PSICOSSOCIAL',
    setorId: fatorRow.setor_id,
    fonteGeradora: `Fator psicossocial MTE — ${catalog.codigo}`,
    perigo: catalog.nome,
    consequencia: 'Estresse, adoecimento mental, turnover, absenteísmo',
    probabilidade: fatorRow.probabilidade,
    severidade: fatorRow.severidade,
    exposicaoDuracao: 'Jornada / rotina organizacional',
    exposicaoFrequencia: 'Contínua / diária',
    exposicaoIntensidade: `Prob ${fatorRow.probabilidade} × Sev ${fatorRow.severidade}`,
    numeroTrabalhadoresExpostos: 1,
    grupoHomogeneoExposicao: catalog.nome,
    medidasExistentes: fatorRow.observacoes || 'Medidas administrativas em vigor',
    medidasControle: fatorRow.observacoes || 'Plano psicossocial e medidas administrativas NR-01',
    evidencias: [{ tipo: 'PSICOSSOCIAL', referencia: catalog.codigo, descricao: catalog.nome }],
    responsavel: user?.name ?? '',
    linkTable: 'psico_fatores_mte',
    createCapa: fatorRow.nivel_risco === 'critico',
  });
}

export async function integrateFromPsicoResposta(client, tenantId, respostaId, row, user) {
  if (!row.nivel_risco || row.nivel_risco === 'baixo') return null;
  const matrix = mapRiskLevelToMatrix(row.nivel_risco);
  return propagateRiskIntegration(client, {
    tenantId,
    user,
    origemModulo: 'PSICOSSOCIAL',
    origemEntidadeId: respostaId,
    tipo: 'PSICOSSOCIAL',
    setorId: row.setor_id,
    fonteGeradora: `Questionário ${row.tipo_questionario}`,
    perigo: `Indicador psicossocial — score ${row.score_global}`,
    consequencia: 'Impacto na saúde mental e desempenho organizacional',
    probabilidade: matrix.probabilidade,
    severidade: matrix.severidade,
    medidasControle: 'Plano de ação psicossocial vinculado ao GRO',
    linkTable: 'psico_respostas',
    createCapa: row.nivel_risco === 'critico',
  });
}

export async function integrateFromInspecao(client, tenantId, inspecaoRow, ncId, user) {
  const matrix = mapRiskLevelToMatrix(inspecaoRow.resultado === 'nao_conforme' ? 'alto' : 'medio');
  return propagateRiskIntegration(client, {
    tenantId,
    user,
    origemModulo: 'INSPECAO',
    origemEntidadeId: inspecaoRow.id,
    tipo: 'ACIDENTE',
    setorId: inspecaoRow.setor_id,
    fonteGeradora: `Inspeção SST — ${inspecaoRow.titulo}`,
    perigo: inspecaoRow.titulo,
    consequencia: 'Não conformidade de segurança — acidente ou penalidade',
    probabilidade: matrix.probabilidade,
    severidade: matrix.severidade,
    medidasControle: 'CAPA corretiva vinculada à inspeção',
    responsavel: inspecaoRow.responsavel ?? user?.name ?? '',
    linkTable: 'sst_inspecoes',
    createCapa: true,
    ncId,
  });
}

export async function integrateFromNc(client, tenantId, ncRow, user) {
  const matrix = mapRiskLevelToMatrix(ncRow.severidade ?? 'medio');
  return propagateRiskIntegration(client, {
    tenantId,
    user,
    origemModulo: 'NC',
    origemEntidadeId: ncRow.id,
    tipo: ncRow.origem_tipo === 'INSPECAO' ? 'ACIDENTE' : 'ERGONOMICO',
    fonteGeradora: `NC — ${ncRow.origem_tipo ?? 'INTERNA'}`,
    perigo: ncRow.titulo,
    consequencia: ncRow.descricao,
    probabilidade: matrix.probabilidade,
    severidade: matrix.severidade,
    medidasControle: 'Tratamento via CAPA e plano GRO',
    responsavel: ncRow.responsavel ?? user?.name ?? '',
    reviewDate: ncRow.prazo ? String(ncRow.prazo).slice(0, 10) : null,
    linkTable: 'sst_nao_conformidades',
    createCapa: true,
    ncId: ncRow.id,
  });
}

export async function integrateFromAuditoriaFinding(client, tenantId, auditoriaId, finding, user) {
  const sev = finding.severity ?? finding.severidade ?? 'medio';
  const matrix = mapRiskLevelToMatrix(sev);
  return propagateRiskIntegration(client, {
    tenantId,
    user,
    origemModulo: 'AUDITORIA',
    origemEntidadeId: auditoriaId,
    tipo: 'ACIDENTE',
    fonteGeradora: `Auditoria — achado ${finding.id ?? finding.code ?? ''}`,
    perigo: finding.title ?? finding.titulo ?? finding.description ?? 'Achado de auditoria',
    consequencia: finding.description ?? finding.descricao ?? 'Não conformidade normativa',
    probabilidade: matrix.probabilidade,
    severidade: matrix.severidade,
    medidasControle: finding.action ?? finding.acao ?? 'Plano corretivo auditoria',
    responsavel: finding.responsible ?? user?.name ?? '',
    createCapa: sev === 'critico' || sev === 'alto',
  });
}

export async function integrateCapaToGro(tenantId, capaRow, user) {
  if (!capaRow.inventario_risco_id) return null;
  const planId = await ensureGroActionPlan(
    defaultQuery,
    tenantId,
    capaRow.inventario_risco_id,
    capaRow.descricao,
    capaRow.responsavel,
    capaRow.prazo,
    user,
    'NC',
  );
  await defaultQuery(`UPDATE sst_capa SET gro_plano_acao_id = $1 WHERE id = $2`, [planId, capaRow.id]);
  await logGroHistory({
    tenantId,
    riskId: capaRow.inventario_risco_id,
    actionPlanId: planId,
    action: 'PLANO_CRIADO_SST_CAPA',
    user,
    details: { capaId: capaRow.id },
  });
  return planId;
}

export async function integrateFromDenuncia(client, tenantId, denRow, user) {
  const runQuery = q(client);
  const { DENUNCIA_TIPO_LABELS, PSICO_FATOR_BY_TIPO } = await import('./denunciaService.js');
  const { getMteFator } = await import('../data/mteFatores.js');

  const matrix = mapRiskLevelToMatrix(denRow.gravidade ?? 'alto');
  const psicoEval = await evaluateForTenant(tenantId, matrix.probabilidade, matrix.severidade, runQuery);
  const psicoNivel = psicoEval?.level ?? 'alto';
  const tipoLabel = DENUNCIA_TIPO_LABELS[denRow.tipo] ?? denRow.tipo;
  const fatorCodigo = PSICO_FATOR_BY_TIPO[denRow.tipo] ?? 'F02';
  const catalog = getMteFator(fatorCodigo);

  let psicoFatorId = null;
  const { rows: existingFator } = await runQuery(
    `SELECT id FROM psico_fatores_mte WHERE tenant_id = $1 AND fator_codigo = $2 LIMIT 1`,
    [tenantId, fatorCodigo],
  );
  if (existingFator[0]) {
    psicoFatorId = existingFator[0].id;
    await runQuery(
      `UPDATE psico_fatores_mte SET
         setor_id = COALESCE($1, setor_id),
         probabilidade = GREATEST(COALESCE(probabilidade, 0), $2),
         severidade = GREATEST(COALESCE(severidade, 0), $3),
         score = GREATEST(COALESCE(score, 0), $4),
         nivel_risco = $5,
         observacoes = COALESCE(observacoes, '') || $6,
         avaliado_em = NOW(), updated_at = NOW()
       WHERE id = $7`,
      [
        denRow.setor_id,
        matrix.probabilidade,
        matrix.severidade,
        Math.min(100, matrix.probabilidade * matrix.severidade * 4),
        psicoNivel,
        `\n[Denúncia ${denRow.protocolo}]`,
        psicoFatorId,
      ],
    );
  } else {
    const score = Math.min(100, matrix.probabilidade * matrix.severidade * 4);
    const { rows: ins } = await runQuery(
      `INSERT INTO psico_fatores_mte (tenant_id, fator_codigo, setor_id, probabilidade, severidade, score, nivel_risco, observacoes, avaliado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING id`,
      [
        tenantId,
        fatorCodigo,
        denRow.setor_id,
        matrix.probabilidade,
        matrix.severidade,
        score,
        psicoNivel,
        `Denúncia ${denRow.protocolo} — ${tipoLabel}`,
      ],
    );
    psicoFatorId = ins[0].id;
  }

  await runQuery(
    `INSERT INTO psico_alertas (tenant_id, severidade, titulo, mensagem, tipo_origem, origem_id)
     VALUES ($1,$2,$3,$4,'DENUNCIA',$5)`,
    [
      tenantId,
      denRow.gravidade ?? 'alto',
      `Denúncia ${denRow.protocolo}`,
      `${tipoLabel} — protocolo em investigação (Canal Corporativo)`,
      denRow.id,
    ],
  );

  const integration = await propagateRiskIntegration(client, {
    tenantId,
    user,
    origemModulo: 'DENUNCIA',
    origemEntidadeId: denRow.id,
    tipo: 'PSICOSSOCIAL',
    setorId: denRow.setor_id,
    fonteGeradora: `Canal de Denúncia — ${denRow.protocolo}`,
    perigo: `${tipoLabel} — ${catalog?.nome ?? 'Fator psicossocial'}`,
    consequencia: 'Dano psíquico, assédio, turnover, passivo trabalhista e autuação MTE',
    probabilidade: matrix.probabilidade,
    severidade: matrix.severidade,
    exposicaoDuracao: 'Conforme relato / jornada',
    exposicaoFrequencia: denRow.data_ocorrencia ? 'Evento reportado' : 'Recorrente / não informada',
    exposicaoIntensidade: `Gravidade ${denRow.gravidade}`,
    numeroTrabalhadoresExpostos: 1,
    grupoHomogeneoExposicao: denRow.relato_local ?? `Denunciante — ${tipoLabel}`,
    medidasExistentes: 'Tratativa do canal de denúncia em andamento',
    medidasControle: 'Investigação, medidas cautelares e plano GRO/PGR',
    evidencias: [{ tipo: 'DENUNCIA', referencia: denRow.protocolo, descricao: denRow.descricao?.slice(0, 500) }],
    responsavel: denRow.investigador_nome ?? user?.name ?? 'Compliance',
    createCapa: denRow.gravidade === 'critico',
  });

  return {
    riskId: integration.riskId,
    planId: integration.planId,
    psicoFatorId,
    groStage: integration.groStage,
    pgr: integration.pgr,
  };
}

export async function refreshPgrFromInventory(tenantId, user) {
  return syncPgrDraft(defaultQuery, tenantId, user);
}
