/** AET — Análise Ergonômica do Trabalho (NR-17) */

export type AetStage =
  | 'CARACTERIZACAO'
  | 'POSTO_MOBILIARIO'
  | 'METODOS_POSTURAIS'
  | 'METODOS_CARGA'
  | 'VIBRACAO'
  | 'TELEATENDIMENTO'
  | 'ORGANIZACAO'
  | 'CONSOLIDACAO'
  | 'REVISAO'
  | 'ASSINADO';

export type AetStatus = 'RASCUNHO' | 'EM_ANDAMENTO' | 'EM_REVISAO' | 'ASSINADO' | 'ARQUIVADO';

export type AetVersionStatus =
  | 'RASCUNHO'
  | 'EM_REVISAO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADO'
  | 'OBSOLETO';

export type AetSignatureType =
  | 'ELABORADOR'
  | 'RESPONSAVEL_TECNICO'
  | 'ERGONOMISTA'
  | 'REPRESENTANTE_LEGAL'
  | 'SESMT'
  | 'CIPA';

export type AetApprovalStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

export type AetIntegrationModule = 'INVENTARIO' | 'GRO' | 'PGR' | 'PSICOSSOCIAL';

export const AET_STATUS_LABELS: Record<AetVersionStatus, string> = {
  RASCUNHO: 'Rascunho',
  EM_REVISAO: 'Em revisão',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  APROVADO: 'Aprovado',
  OBSOLETO: 'Obsoleto',
};

export const AET_SIGNATURE_LABELS: Record<AetSignatureType, string> = {
  ELABORADOR: 'Elaborador',
  RESPONSAVEL_TECNICO: 'Responsável técnico (CREA)',
  ERGONOMISTA: 'Ergonomista',
  REPRESENTANTE_LEGAL: 'Representante legal',
  SESMT: 'SESMT',
  CIPA: 'CIPA',
};

export function aetActionLabel(action: string): string {
  const map: Record<string, string> = {
    PROCESSO_CRIADO: 'Processo criado',
    VERSAO_CRIADA: 'Versão criada',
    SNAPSHOT_ATUALIZADO: 'Snapshot atualizado',
    RELATORIO_VERSAO_GERADO: 'Relatório gerado',
    ENVIADO_APROVACAO: 'Enviado para aprovação',
    VERSAO_APROVADA: 'Versão aprovada',
    VERSAO_REJEITADA: 'Versão rejeitada',
    ASSINATURA_REGISTRADA: 'Assinatura registrada',
    AET_FINALIZADA: 'AET finalizada',
    RESPONSAVEL_TECNICO_ATUALIZADO: 'RT atualizado',
    AET_ASSINADA: 'AET assinada',
    RELATORIO_GERADO: 'Relatório gerado',
  };
  return map[action] ?? action;
}

export interface AetApproval {
  id: string;
  versionId: string;
  approverName: string;
  approverRole: string;
  approverEmail: string;
  status: AetApprovalStatus;
  decidedAt: string | null;
  notes: string;
}

export interface AetSignature {
  id: string;
  versionId: string;
  type: AetSignatureType;
  name: string;
  role: string;
  document: string;
  statement: string;
  documentHash: string;
  signedAt: string;
}

export interface AetIntegration {
  id: string;
  processId: string;
  versionId: string | null;
  module: AetIntegrationModule;
  entityId: string;
  reference: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AetVersionDetail {
  id: string;
  processId: string;
  number: string;
  sequential: number;
  status: AetVersionStatus;
  snapshot: Record<string, unknown>;
  report: AetNormativeReport | null;
  documentHash: string;
  preparedBy: string;
  reviewedBy: string;
  preparedAt: string | null;
  reviewedAt: string | null;
  nextReviewAt: string | null;
  reviewReason: string;
  notes: string;
  technicalResponsible: string;
  technicalResponsibleCrea: string;
  technicalResponsibleArt: string;
  approvals: AetApproval[];
  signatures: AetSignature[];
  createdAt?: string;
  updatedAt?: string;
}


export type Nr17Compliance = 'conforme' | 'parcial' | 'nao_conforme' | 'nao_avaliado';

export const AET_STAGE_LABELS: Record<AetStage, string> = {
  CARACTERIZACAO: 'Caracterização',
  POSTO_MOBILIARIO: 'Posto · Mobiliário',
  METODOS_POSTURAIS: 'RULA · REBA · OWAS',
  METODOS_CARGA: 'NIOSH',
  VIBRACAO: 'Vibração',
  TELEATENDIMENTO: 'Teleatendimento',
  ORGANIZACAO: 'Organização do trabalho',
  CONSOLIDACAO: 'Consolidação',
  REVISAO: 'Revisão',
  ASSINADO: 'Assinado',
};

export interface AetFurniture {
  id: string;
  type: string;
  description: string;
  brand: string;
  model: string;
  sectorId: string | null;
  sectorName?: string;
  nr17Compliance: Nr17Compliance;
  notes: string;
}

export interface AetEquipment {
  id: string;
  type: string;
  identification: string;
  description: string;
  manufacturer: string;
  emitsVibration: boolean;
  sectorId: string | null;
  sectorName?: string;
  nr17Compliance: Nr17Compliance;
  notes: string;
}

export interface AetMethodsResult {
  rula?: { score: number; classificationLabel?: string; norma?: string; source?: string };
  reba?: { score: number; classificationLabel?: string; norma?: string; source?: string };
  owas?: { owasClass: number; classificationLabel?: string; norma?: string; source?: string };
  niosh?: { rwl?: number; liftingIndex?: number; norma?: string; source?: string };
  angles?: Record<string, number>;
}

export interface AetVibrationResult {
  a8Equivalente: number;
  nivel: 'aceitavel' | 'zona_acao' | 'acima_limite';
  norma: string;
  recomendacao: string;
}

export interface AetChecklistResult {
  scorePct: number;
  nivel: 'conforme' | 'parcial' | 'nao_conforme';
  norma: string;
  recomendacao: string;
  itens?: Array<{ key: string; label: string; valor: number }>;
}

export interface AetProcess {
  id: string;
  title: string;
  collaboratorId: string | null;
  collaboratorName?: string;
  sectorId: string | null;
  sectorName?: string;
  analysisId: string | null;
  status: AetStatus;
  stage: AetStage;
  stageLabel: string;
  characterization: Record<string, unknown>;
  wholeBodyVibration: AetVibrationResult & Record<string, unknown>;
  handArmVibration: AetVibrationResult & Record<string, unknown>;
  telework: AetChecklistResult & Record<string, unknown>;
  workOrganization: AetChecklistResult & Record<string, unknown>;
  methods: AetMethodsResult;
  furnitureIds: string[];
  equipmentIds: string[];
  furniture?: AetFurniture[];
  equipment?: AetEquipment[];
  report: AetNormativeReport | null;
  actionPlan: Array<{ description: string; responsible?: string; deadline?: string }>;
  ergonomistName: string;
  ergonomistRegistry: string;
  signedAt: string | null;
  activeVersionId: string | null;
  technicalResponsible: string;
  technicalResponsibleCrea: string;
  technicalResponsibleArt: string;
  unitId: string | null;
  workstationId: string | null;
  jobRoleId: string | null;
  psicoCampaignId: string | null;
  inventoryRiskId: string | null;
  documentHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface AetDashboard {
  totalProcesses: number;
  signed: number;
  inProgress: number;
  inReview: number;
  furnitureCount: number;
  equipmentCount: number;
  recentProcesses: AetProcess[];
  stages: Array<{ stage: AetStage; label: string }>;
}

export interface AetNormativeReport {
  version: string;
  type: string;
  title: string;
  processId: string;
  versionNumber?: string | null;
  sections: Array<{ id: string; title: string; norma: string; content: unknown }>;
  responsavelTecnico?: { nome: string; crea: string; art: string };
  signatures: Record<string, string | null>;
  documentHash?: string | null;
  integrations?: Record<string, unknown> | null;
  disclaimer: string;
  generatedAt: string;
}

export interface AetHistoryEntry {
  id: string;
  processId: string | null;
  versionId: string | null;
  action: string;
  stage: AetStage | null;
  userName: string | null;
  createdAt: string;
}

export const TELEATENDIMENTO_ITENS = [
  { key: 'headset_ajustavel', label: 'Headset ajustável e confortável' },
  { key: 'monitor_altura', label: 'Monitor na altura dos olhos' },
  { key: 'cadeira_regulavel', label: 'Cadeira com regulagem e apoio lombar' },
  { key: 'pausas_programadas', label: 'Pausas programadas (NR-17 17.6.3)' },
  { key: 'iluminacao_adequada', label: 'Iluminação sem reflexos' },
  { key: 'scripts_rotacao', label: 'Rodízio de tarefas' },
  { key: 'treinamento_postural', label: 'Treinamento ergonômico' },
  { key: 'suporte_psicossocial', label: 'Canal de suporte psicossocial' },
];

export const ORGANIZACAO_ITENS = [
  { key: 'ritmo_trabalho', label: 'Ritmo de trabalho adequado' },
  { key: 'pausas', label: 'Pausas para descanso' },
  { key: 'turnos', label: 'Organização de turnos' },
  { key: 'monotonia', label: 'Variedade de tarefas' },
  { key: 'metas', label: 'Metas realistas' },
  { key: 'autonomia', label: 'Autonomia no ritmo' },
  { key: 'comunicacao', label: 'Comunicação clara' },
  { key: 'capacitacao', label: 'Capacitação adequada' },
];

export const MOBILIARIO_TIPOS = ['cadeira', 'mesa', 'monitor', 'apoio_pes', 'teclado', 'mouse', 'headset', 'outro'];
export const EQUIPAMENTO_TIPOS = ['ferramenta', 'maquina', 'veiculo', 'computador', 'headset', 'outro'];
