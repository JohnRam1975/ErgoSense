/**
 * Montagem de contexto operacional do tenant para o AI Expert.
 */
import { query } from '../db.js';
import { buildPgrSnapshot } from './pgrSnapshot.js';
import { buildOrgTree } from './orgUtils.js';
import { buildSstReport } from './sstUtils.js';
import { buildComplianceDashboard } from './complianceUtils.js';
import { getActiveCriteria } from './riskCriteriaService.js';

const CONTEXT_MODULES = [
  'inventario',
  'gro',
  'pgr',
  'aet',
  'analises',
  'psicossocial',
  'sst',
  'compliance',
  'org',
  'historico',
  'denuncias',
];

function stripHeavyFields(obj, depth = 0) {
  if (obj == null || depth > 8) return obj;
  if (Array.isArray(obj)) return obj.slice(0, 50).map((v) => stripHeavyFields(v, depth + 1));
  if (typeof obj !== 'object') {
    if (typeof obj === 'string' && obj.length > 4000) return `${obj.slice(0, 4000)}…[truncado]`;
    return obj;
  }
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (/base64|imagem|video|blob|foto/i.test(k)) continue;
    out[k] = stripHeavyFields(v, depth + 1);
  }
  return out;
}

async function loadAnalysisById(tenantId, analysisId) {
  const id = Number(analysisId);
  if (!Number.isFinite(id)) return null;
  const { rows } = await query(
    `SELECT a.id, a.atividade, a.data_analise, a.hora_analise, a.observacoes,
            s.nome AS setor, c.nome AS colaborador,
            r.score, r.risk_level, r.rula, r.reba, r.angulos_json, r.workstation_json,
            r.nr17_report_json, r.recomendacoes_json, r.load_result_json
     FROM analises a
     JOIN colaboradores c ON c.id = a.colaborador_id
     LEFT JOIN setores s ON s.id = a.setor_id
     LEFT JOIN resultados_ia r ON r.analise_id = a.id
     WHERE a.tenant_id = $1 AND a.id = $2 AND a.deleted_at IS NULL`,
    [tenantId, id],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return stripHeavyFields({
    id: String(r.id),
    colaborador: r.colaborador,
    setor: r.setor,
    atividade: r.atividade,
    observacoes: r.observacoes,
    data: r.data_analise,
    score: r.score,
    riskLevel: r.risk_level,
    rula: r.rula,
    reba: r.reba,
    angulos: r.angulos_json,
    workstation: r.workstation_json,
    nr17: r.nr17_report_json,
    recomendacoes: r.recomendacoes_json,
    loadResult: r.load_result_json,
  });
}

async function loadAnalysesSummary(tenantId, limit = 25) {
  const { rows } = await query(
    `SELECT a.id, a.atividade, a.data_analise, a.hora_analise, a.duracao_gravacao,
            a.max_risk_streak_secs, a.total_risk_secs, s.nome AS setor, c.nome AS colaborador,
            r.score, r.risk_level, r.rula, r.reba, r.angulos_json, r.workstation_json,
            r.nr17_report_json, r.recomendacoes_json,
            r.load_params_json, r.load_result_json, r.load_effort_json
     FROM analises a
     JOIN colaboradores c ON c.id = a.colaborador_id
     LEFT JOIN setores s ON s.id = a.setor_id
     LEFT JOIN resultados_ia r ON r.analise_id = a.id
     WHERE a.tenant_id = $1 AND a.deleted_at IS NULL
     ORDER BY a.data_analise DESC, a.hora_analise DESC
     LIMIT $2`,
    [tenantId, limit],
  );
  return rows.map((r) =>
    stripHeavyFields({
      id: String(r.id),
      colaborador: r.colaborador,
      setor: r.setor,
      atividade: r.atividade,
      data: r.data_analise,
      score: r.score,
      riskLevel: r.risk_level,
      rula: r.rula,
      reba: r.reba,
      angulos: r.angulos_json,
      workstation: r.workstation_json,
      nr17: r.nr17_report_json,
      recomendacoes: r.recomendacoes_json,
      loadParams: r.load_params_json,
      loadResult: r.load_result_json,
      loadEffort: r.load_effort_json,
      duracaoGravacao: r.duracao_gravacao,
      maxRiskStreakSecs: r.max_risk_streak_secs,
      totalRiskSecs: r.total_risk_secs,
    }),
  );
}

async function loadAetSummary(tenantId) {
  const { rows } = await query(
    `SELECT p.id, p.titulo, p.status, p.etapa_atual, p.setor_id, s.nome AS setor,
            v.numero, v.numero_sequencial, v.status AS versao_status, v.snapshot_json
     FROM aet_processos p
     LEFT JOIN setores s ON s.id = p.setor_id
     LEFT JOIN LATERAL (
       SELECT numero, numero_sequencial, status, snapshot_json
       FROM aet_versoes WHERE processo_id = p.id ORDER BY numero_sequencial DESC LIMIT 1
     ) v ON TRUE
     WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
     ORDER BY p.updated_at DESC LIMIT 15`,
    [tenantId],
  );
  return rows.map((r) =>
    stripHeavyFields({
      id: String(r.id),
      titulo: r.titulo,
      status: r.status,
      etapa: r.etapa_atual,
      setor: r.setor,
      versao: r.numero,
      versaoSequencial: r.numero_sequencial,
      versaoStatus: r.versao_status,
      snapshot: r.snapshot_json,
    }),
  );
}

async function loadPsicoSummary(tenantId) {
  const { rows: fatores } = await query(
    `SELECT f.fator_codigo, f.probabilidade, f.severidade, f.score, f.nivel_risco, f.observacoes,
            s.nome AS setor
     FROM psico_fatores_mte f
     LEFT JOIN setores s ON s.id = f.setor_id
     WHERE f.tenant_id = $1
     ORDER BY f.score DESC NULLS LAST`,
    [tenantId],
  );
  const { rows: indicadores } = await query(
    `SELECT tipo_questionario, indicador_key, indicador_label, valor, nivel_risco, amostra_n
     FROM psico_indicadores WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 30`,
    [tenantId],
  );
  const { rows: planos } = await query(
    `SELECT descricao, responsavel, prazo, status, prioridade, fator_codigo
     FROM psico_plano_acao WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY prazo NULLS LAST LIMIT 20`,
    [tenantId],
  );
  return {
    fatores: fatores.map(stripHeavyFields),
    indicadores: indicadores.map(stripHeavyFields),
    planos: planos.map(stripHeavyFields),
  };
}

async function loadDenunciasSummary(tenantId) {
  const { rows } = await query(
    `SELECT d.id, d.protocolo, d.tipo, d.status, d.gravidade, s.nome AS setor_nome, d.created_at
     FROM denuncias d
     LEFT JOIN setores s ON s.id = d.setor_id
     WHERE d.tenant_id = $1 AND d.deleted_at IS NULL
     ORDER BY d.created_at DESC LIMIT 15`,
    [tenantId],
  );
  return rows.map((r) =>
    stripHeavyFields({
      id: String(r.id),
      protocolo: r.protocolo,
      tipo: r.tipo,
      status: r.status,
      gravidade: r.gravidade,
      setor: r.setor_nome,
      createdAt: r.created_at,
    }),
  );
}

async function loadOrganizationalMemory(tenantId) {
  const histories = {};

  const tables = [
    { key: 'gro', sql: `SELECT acao, usuario_nome, detalhes, created_at FROM gro_historico WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 15` },
    { key: 'pgr', sql: `SELECT acao, usuario_nome, detalhes, created_at FROM pgr_historico WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 15` },
    { key: 'psico', sql: `SELECT acao, usuario_nome, detalhes, created_at FROM psico_historico WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 15` },
    { key: 'sst', sql: `SELECT acao, usuario_nome, detalhes, created_at FROM sst_historico WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 15` },
    { key: 'compliance', sql: `SELECT acao, usuario_nome, detalhes, created_at FROM compliance_historico WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 15` },
    { key: 'aet', sql: `SELECT acao, usuario_nome, detalhes, created_at FROM aet_historico WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 15` },
  ];

  for (const t of tables) {
    try {
      const { rows } = await query(t.sql, [tenantId]);
      histories[t.key] = rows.map(stripHeavyFields);
    } catch {
      histories[t.key] = [];
    }
  }

  let acidentes = [];
  try {
    const result = await query(
      `SELECT id, titulo, severidade, status, data_ocorrencia
       FROM sst_nao_conformidades
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY data_identificacao DESC LIMIT 10`,
      [tenantId],
    );
    acidentes = result.rows;
  } catch {
    acidentes = [];
  }

  return {
    historicoModulos: histories,
    naoConformidadesRecentes: acidentes.map(stripHeavyFields),
  };
}

function normalizeModules(modules) {
  if (!modules?.length || modules.includes('all')) return [...CONTEXT_MODULES];
  return modules.filter((m) => CONTEXT_MODULES.includes(m));
}

async function safeContextLoad(label, loader) {
  try {
    return await loader();
  } catch (err) {
    console.error(`[AI Expert] falha ao carregar contexto "${label}":`, err.message);
    return null;
  }
}

/**
 * Agrega dados operacionais do tenant para alimentar o AI Expert.
 */
export async function assembleTenantContext(tenantId, { modules = ['all'], entityRefs = {} } = {}) {
  const selected = normalizeModules(modules);
  const dataSources = [];
  const context = { tenantId, generatedAt: new Date().toISOString(), entityRefs };

  if (selected.includes('org')) {
    context.organizacao = await safeContextLoad('org', () => buildOrgTree(tenantId));
    dataSources.push('Estrutura organizacional');
  }

  if (selected.includes('pgr') || selected.includes('gro') || selected.includes('inventario')) {
    context.pgrSnapshot = await safeContextLoad('pgr', () => buildPgrSnapshot(tenantId));
    dataSources.push('Inventário de riscos', 'GRO', 'PGR');
  }

  if (selected.includes('criterios') || selected.includes('inventario')) {
    context.criteriosRisco = await safeContextLoad('criterios', () => getActiveCriteria(tenantId));
    dataSources.push('Critérios de avaliação NR-01');
  }

  if (selected.includes('analises')) {
    context.analisesErgonomicas = await safeContextLoad('analises', () =>
      loadAnalysesSummary(tenantId, entityRefs.analysisId ? 1 : 25),
    );
    if (entityRefs.analysisId) {
      const focused = await safeContextLoad('analiseFoco', () =>
        loadAnalysisById(tenantId, entityRefs.analysisId),
      );
      if (focused) context.analiseFoco = focused;
    }
    dataSources.push('Análises ergonômicas', 'RULA', 'REBA', 'NIOSH');
  }

  if (selected.includes('aet')) {
    context.aet = await safeContextLoad('aet', () => loadAetSummary(tenantId));
    dataSources.push('AET');
  }

  if (selected.includes('psicossocial')) {
    context.psicossocial = await safeContextLoad('psicossocial', () => loadPsicoSummary(tenantId));
    dataSources.push('Psicossocial', 'Questionários MTE');
  }

  if (selected.includes('sst')) {
    context.sst = await safeContextLoad('sst', () => buildSstReport(tenantId));
    dataSources.push('Inspeções', 'Auditorias', 'NC', 'CAPA');
  }

  if (selected.includes('compliance')) {
    context.compliance = await safeContextLoad('compliance', () => buildComplianceDashboard(tenantId));
    dataSources.push('Compliance NR-01/NR-17/eSocial');
  }

  if (selected.includes('denuncias')) {
    context.denuncias = await safeContextLoad('denuncias', () => loadDenunciasSummary(tenantId));
    dataSources.push('Canal de denúncias');
  }

  if (selected.includes('historico')) {
    context.memoriaOrganizacional = await safeContextLoad('historico', () =>
      loadOrganizationalMemory(tenantId),
    );
    dataSources.push('Histórico organizacional', 'Ações corretivas');
  }

  return {
    context: stripHeavyFields(context),
    dataSources: [...new Set(dataSources)],
  };
}

export { CONTEXT_MODULES };
