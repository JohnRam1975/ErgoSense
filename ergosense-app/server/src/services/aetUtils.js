import { query } from '../db.js';
import { historyDetailsJson, historyUserId, historyUserName } from '../utils/historyLog.js';

export const AET_STAGES = [
  'CARACTERIZACAO',
  'POSTO_MOBILIARIO',
  'METODOS_POSTURAIS',
  'METODOS_CARGA',
  'VIBRACAO',
  'TELEATENDIMENTO',
  'ORGANIZACAO',
  'CONSOLIDACAO',
  'REVISAO',
  'ASSINADO',
];

export const AET_STAGE_LABELS = {
  CARACTERIZACAO: 'Caracterização',
  POSTO_MOBILIARIO: 'Posto · Mobiliário · Equipamentos',
  METODOS_POSTURAIS: 'Métodos posturais (RULA · REBA · OWAS)',
  METODOS_CARGA: 'Carga manual (NIOSH)',
  VIBRACAO: 'Vibração',
  TELEATENDIMENTO: 'Teleatendimento',
  ORGANIZACAO: 'Organização do trabalho',
  CONSOLIDACAO: 'Consolidação AET',
  REVISAO: 'Revisão',
  ASSINADO: 'Assinado',
};

export function nextAetStage(current) {
  const i = AET_STAGES.indexOf(current);
  return i >= 0 && i < AET_STAGES.length - 1 ? AET_STAGES[i + 1] : null;
}

export function prevAetStage(current) {
  const i = AET_STAGES.indexOf(current);
  return i > 0 ? AET_STAGES[i - 1] : null;
}

export async function logAetHistory({ tenantId, processoId, action, stage = null, user = null, details = null, versionId = null }) {
  await query(
    `INSERT INTO aet_historico (tenant_id, processo_id, versao_id, acao, etapa, usuario_id, usuario_nome, detalhes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      tenantId,
      processoId,
      versionId,
      action,
      stage,
      historyUserId(user),
      historyUserName(user),
      historyDetailsJson(details),
    ],
  );
}

export function mapAetHistoryRow(row) {
  return {
    id: String(row.id),
    processId: row.processo_id ? String(row.processo_id) : null,
    versionId: row.versao_id ? String(row.versao_id) : null,
    action: row.acao,
    stage: row.etapa,
    userId: row.usuario_id ? String(row.usuario_id) : null,
    userName: row.usuario_nome,
    details: row.detalhes,
    createdAt: row.created_at,
  };
}

export function mapMobiliario(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    sectorId: row.setor_id ? String(row.setor_id) : null,
    type: row.tipo,
    description: row.descricao,
    brand: row.marca ?? '',
    model: row.modelo ?? '',
    adjustments: row.regulagens_json ?? {},
    nr17Compliance: row.conformidade_nr17,
    notes: row.observacoes ?? '',
    active: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEquipamento(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    sectorId: row.setor_id ? String(row.setor_id) : null,
    type: row.tipo,
    identification: row.identificacao,
    description: row.descricao ?? '',
    manufacturer: row.fabricante ?? '',
    emitsVibration: row.emite_vibracao ?? false,
    maintenanceDate: row.manutencao_em ? row.manutencao_em.toISOString().slice(0, 10) : null,
    nr17Compliance: row.conformidade_nr17,
    notes: row.observacoes ?? '',
    active: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProcesso(row, extras = {}) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    title: row.titulo,
    collaboratorId: row.colaborador_id ? String(row.colaborador_id) : null,
    sectorId: row.setor_id ? String(row.setor_id) : null,
    analysisId: row.analise_id ? String(row.analise_id) : null,
    status: row.status,
    stage: row.etapa_atual,
    stageLabel: AET_STAGE_LABELS[row.etapa_atual] ?? row.etapa_atual,
    characterization: row.caracterizacao_json ?? {},
    wholeBodyVibration: row.vibracao_corpo_json ?? {},
    handArmVibration: row.vibracao_maos_json ?? {},
    telework: row.teleatendimento_json ?? {},
    workOrganization: row.organizacao_json ?? {},
    methods: row.metodos_json ?? {},
    furnitureIds: (row.mobiliario_ids ?? []).map(String),
    equipmentIds: (row.equipamento_ids ?? []).map(String),
    report: row.relatorio_json,
    actionPlan: row.plano_acao_json ?? [],
    preparedBy: row.elaborado_por ?? '',
    reviewedBy: row.revisado_por ?? '',
    ergonomistName: row.ergonomista_nome ?? '',
    ergonomistRegistry: row.ergonomista_registro ?? '',
    signedAt: row.assinado_em,
    activeVersionId: row.versao_ativa_id ? String(row.versao_ativa_id) : null,
    technicalResponsible: row.responsavel_tecnico_nome ?? '',
    technicalResponsibleCrea: row.responsavel_tecnico_crea ?? '',
    technicalResponsibleArt: row.responsavel_tecnico_art ?? '',
    unitId: row.unidade_id ? String(row.unidade_id) : null,
    workstationId: row.posto_trabalho_id ? String(row.posto_trabalho_id) : null,
    jobRoleId: row.funcao_id ? String(row.funcao_id) : null,
    psicoCampaignId: row.psico_campanha_id ? String(row.psico_campanha_id) : null,
    inventoryRiskId: row.inventario_risco_id ? String(row.inventario_risco_id) : null,
    documentHash: row.hash_documento ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extras,
  };
}
