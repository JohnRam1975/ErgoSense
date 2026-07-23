import { query } from '../db.js';
import { historyDetailsJson, historyUserId, historyUserName } from '../utils/historyLog.js';

export async function logSstHistory({ tenantId, entityType, entityId, action, user = null, details = null }) {
  await query(
    `INSERT INTO sst_historico (tenant_id, entidade_tipo, entidade_id, acao, usuario_id, usuario_nome, detalhes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      tenantId,
      entityType,
      entityId ?? null,
      action,
      historyUserId(user),
      historyUserName(user),
      historyDetailsJson(details),
    ],
  );
}

export function mapApr(r) {
  return {
    id: String(r.id), title: r.titulo, sectorId: r.setor_id ? String(r.setor_id) : null,
    sectorName: r.setor_nome, collaboratorId: r.colaborador_id ? String(r.colaborador_id) : null,
    riskId: r.inventario_risco_id ? String(r.inventario_risco_id) : null,
    activity: r.atividade ?? '', workplace: r.local_trabalho ?? '',
    steps: r.etapas_json ?? [], risks: r.riscos_json ?? [], measures: r.medidas_json ?? [],
    status: r.status, preparedBy: r.elaborado_por ?? '', approvedAt: r.aprovado_em, validUntil: r.validade_em ? r.validade_em.toISOString().slice(0, 10) : null,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export function mapEpi(r) {
  return {
    id: String(r.id), ca: r.ca ?? '', type: r.tipo, description: r.descricao, manufacturer: r.fabricante ?? '',
    caExpiry: r.validade_ca ? r.validade_ca.toISOString().slice(0, 10) : null,
    riskId: r.inventario_risco_id ? String(r.inventario_risco_id) : null,
    groPlanId: r.gro_plano_acao_id ? String(r.gro_plano_acao_id) : null,
    active: r.ativo, notes: r.observacoes ?? '', createdAt: r.created_at,
  };
}

export function mapEpc(r) {
  return {
    id: String(r.id), type: r.tipo, description: r.descricao, location: r.localizacao ?? '',
    sectorId: r.setor_id ? String(r.setor_id) : null, riskId: r.inventario_risco_id ? String(r.inventario_risco_id) : null,
    status: r.status, maintenanceDate: r.manutencao_em ? r.manutencao_em.toISOString().slice(0, 10) : null,
    compliance: r.conformidade, notes: r.observacoes ?? '',
  };
}

export function mapInspecao(r) {
  return {
    id: String(r.id), title: r.titulo, type: r.tipo, sectorId: r.setor_id ? String(r.setor_id) : null,
    riskId: r.inventario_risco_id ? String(r.inventario_risco_id) : null,
    scheduledDate: r.data_programada ? r.data_programada.toISOString().slice(0, 10) : null,
    performedDate: r.data_realizada ? r.data_realizada.toISOString().slice(0, 10) : null,
    checklist: r.checklist_json ?? [], result: r.resultado, responsible: r.responsavel ?? '',
    status: r.status, notes: r.observacoes ?? '',
  };
}

export function mapAuditoria(r) {
  return {
    id: String(r.id), title: r.titulo, scope: r.escopo ?? '', standard: r.norma_referencia ?? '',
    startDate: r.data_inicio ? r.data_inicio.toISOString().slice(0, 10) : null,
    endDate: r.data_fim ? r.data_fim.toISOString().slice(0, 10) : null,
    auditors: r.auditores ?? '', findings: r.achados_json ?? [], status: r.status,
  };
}

export function mapNc(r) {
  return {
    id: String(r.id), title: r.titulo, description: r.descricao,
    originType: r.origem_tipo, originId: r.origem_id ? String(r.origem_id) : null,
    riskId: r.inventario_risco_id ? String(r.inventario_risco_id) : null,
    severity: r.severidade, status: r.status,
    identifiedAt: r.data_identificacao ? r.data_identificacao.toISOString().slice(0, 10) : null,
    responsible: r.responsavel ?? '', dueDate: r.prazo ? r.prazo.toISOString().slice(0, 10) : null,
  };
}

export function mapCapa(r) {
  return {
    id: String(r.id), ncId: r.nc_id ? String(r.nc_id) : null, riskId: r.inventario_risco_id ? String(r.inventario_risco_id) : null,
    groPlanId: r.gro_plano_acao_id ? String(r.gro_plano_acao_id) : null,
    type: r.tipo, description: r.descricao, rootCause: r.causa_raiz ?? '', action: r.acao ?? '',
    responsible: r.responsavel ?? '', dueDate: r.prazo ? r.prazo.toISOString().slice(0, 10) : null,
    status: r.status, evidence: r.evidencia ?? '', completedAt: r.data_conclusao ? r.data_conclusao.toISOString().slice(0, 10) : null,
  };
}

export function mapTreinamento(r) {
  return {
    id: String(r.id), title: r.titulo, type: r.tipo, content: r.conteudo ?? '',
    hours: r.carga_horaria != null ? Number(r.carga_horaria) : null,
    scheduledDate: r.data_programada ? r.data_programada.toISOString().slice(0, 10) : null,
    performedDate: r.data_realizada ? r.data_realizada.toISOString().slice(0, 10) : null,
    instructor: r.instrutor ?? '', riskId: r.inventario_risco_id ? String(r.inventario_risco_id) : null,
    status: r.status, participants: r.participantes ?? 0,
  };
}

export async function buildSstDashboard(tenantId) {
  const counts = async (table, extra = '') => {
    const { rows } = await query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE tenant_id = $1 AND deleted_at IS NULL ${extra}`, [tenantId]);
    return rows[0]?.n ?? 0;
  };
  const ncAbertas = await query(
    `SELECT COUNT(*)::int AS n FROM sst_nao_conformidades WHERE tenant_id = $1 AND deleted_at IS NULL AND status NOT IN ('fechada')`, [tenantId],
  );
  const capaAbertas = await query(
    `SELECT COUNT(*)::int AS n FROM sst_capa WHERE tenant_id = $1 AND deleted_at IS NULL AND status NOT IN ('concluido','verificado','cancelado')`, [tenantId],
  );
  const epiVencidos = await query(
    `SELECT COUNT(*)::int AS n FROM sst_epi WHERE tenant_id = $1 AND deleted_at IS NULL AND validade_ca IS NOT NULL AND validade_ca < CURRENT_DATE`, [tenantId],
  );
  return {
    apr: await counts('sst_apr'),
    epi: await counts('sst_epi'),
    epc: await counts('sst_epc'),
    inspecoes: await counts('sst_inspecoes'),
    auditorias: await counts('sst_auditorias'),
    naoConformidades: await counts('sst_nao_conformidades'),
    ncAbertas: ncAbertas.rows[0]?.n ?? 0,
    capa: await counts('sst_capa'),
    capaAbertas: capaAbertas.rows[0]?.n ?? 0,
    treinamentos: await counts('sst_treinamentos'),
    epiCaVencidos: epiVencidos.rows[0]?.n ?? 0,
  };
}

export async function buildSstIntegracao(tenantId) {
  const { rows: linkedRisks } = await query(
    `SELECT COUNT(DISTINCT inventario_risco_id)::int AS n FROM (
       SELECT inventario_risco_id FROM sst_apr WHERE tenant_id = $1 AND inventario_risco_id IS NOT NULL AND deleted_at IS NULL
       UNION SELECT inventario_risco_id FROM sst_epi WHERE tenant_id = $1 AND inventario_risco_id IS NOT NULL AND deleted_at IS NULL
       UNION SELECT inventario_risco_id FROM sst_epc WHERE tenant_id = $1 AND inventario_risco_id IS NOT NULL AND deleted_at IS NULL
       UNION SELECT inventario_risco_id FROM sst_nao_conformidades WHERE tenant_id = $1 AND inventario_risco_id IS NOT NULL AND deleted_at IS NULL
       UNION SELECT inventario_risco_id FROM sst_capa WHERE tenant_id = $1 AND inventario_risco_id IS NOT NULL AND deleted_at IS NULL
     ) x`, [tenantId],
  );
  const { rows: groLinked } = await query(
    `SELECT COUNT(*)::int AS n FROM sst_capa WHERE tenant_id = $1 AND gro_plano_acao_id IS NOT NULL AND deleted_at IS NULL`, [tenantId],
  );
  return { risksLinked: linkedRisks[0]?.n ?? 0, capaGroLinked: groLinked[0]?.n ?? 0 };
}

export async function buildSstReport(tenantId) {
  const dash = await buildSstDashboard(tenantId);
  const integracao = await buildSstIntegracao(tenantId);
  const { rows: ncRecentes } = await query(
    `SELECT id, titulo, severidade, status, data_identificacao FROM sst_nao_conformidades
     WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY data_identificacao DESC LIMIT 10`, [tenantId],
  );
  const { rows: capaRecentes } = await query(
    `SELECT id, descricao, tipo, status, prazo FROM sst_capa
     WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10`, [tenantId],
  );
  return {
    generatedAt: new Date().toISOString(),
    type: 'SST_INTEGRADO',
    title: 'Relatório SST — Inventário · PGR · GRO',
    dashboard: dash,
    integracao,
    naoConformidadesRecentes: ncRecentes.map(mapNc),
    capaRecentes: capaRecentes.map(mapCapa),
    normas: ['NR-01', 'NR-06 (EPI)', 'NR-09 (APR)', 'ISO 45001'],
  };
}
