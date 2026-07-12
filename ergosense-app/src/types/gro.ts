/** Ciclo GRO — NR-01 */

export type GroStage =
  | 'IDENTIFICACAO'
  | 'AVALIACAO'
  | 'CONTROLE'
  | 'MONITORAMENTO'
  | 'REVISAO';

export type GroControlType =
  | 'ELIMINACAO'
  | 'SUBSTITUICAO'
  | 'ENGENHARIA'
  | 'ADMINISTRATIVA'
  | 'EPI';

export type GroActionStatus = 'aberto' | 'andamento' | 'concluido' | 'atrasado' | 'cancelado';

export type GroIndicatorType = 'LEADING' | 'LAGGING';

export type GroReportType =
  | 'CICLO_COMPLETO'
  | 'INVENTARIO'
  | 'PLANO_ACAO'
  | 'INDICADORES'
  | 'DOSSIE_GRO';

export const GRO_STAGES: GroStage[] = [
  'IDENTIFICACAO',
  'AVALIACAO',
  'CONTROLE',
  'MONITORAMENTO',
  'REVISAO',
];

export const GRO_STAGE_LABELS: Record<GroStage, string> = {
  IDENTIFICACAO: 'Identificação',
  AVALIACAO: 'Avaliação',
  CONTROLE: 'Controle',
  MONITORAMENTO: 'Monitoramento',
  REVISAO: 'Revisão',
};

export const GRO_CONTROL_LABELS: Record<GroControlType, string> = {
  ELIMINACAO: 'Eliminação',
  SUBSTITUICAO: 'Substituição',
  ENGENHARIA: 'Engenharia',
  ADMINISTRATIVA: 'Administrativa',
  EPI: 'EPI',
};

export interface GroDashboard {
  totalRisks: number;
  maturityPct: number;
  byStage: Array<{ stage: GroStage; label: string; count: number }>;
  actionPlan: { total: number; open: number; completed: number; overdue: number };
  indicators: { total: number };
  overdueReviews: number;
}

export interface GroWorkflowItem {
  id: string;
  hazard: string;
  type: string;
  riskLevel: string;
  stage: GroStage;
  riskScore: number;
  sectorName: string | null;
  reviewDate: string | null;
}

export interface GroWorkflow {
  stages: Array<{ stage: GroStage; label: string; items: GroWorkflowItem[] }>;
}

export interface GroActionPlan {
  id: string;
  tenantId: string;
  riskId: string;
  riskHazard: string | null;
  description: string;
  controlType: GroControlType;
  responsible: string;
  dueDate: string | null;
  status: GroActionStatus;
  evidence: string;
  completedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GroIndicator {
  id: string;
  tenantId: string;
  riskId: string | null;
  riskHazard: string | null;
  name: string;
  type: GroIndicatorType;
  target: number | null;
  currentValue: number | null;
  unit: string;
  frequency: string;
  lastMeasurement: string | null;
  nextMeasurement: string | null;
  notes: string;
  onTarget: boolean | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GroHistoryEntry {
  id: string;
  tenantId: string;
  riskId: string | null;
  actionPlanId: string | null;
  indicatorId: string | null;
  stage: GroStage | null;
  action: string;
  userId: string | null;
  userName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  riskHazard: string | null;
}

export interface GroReportSummary {
  id: string;
  tenantId: string;
  type: GroReportType;
  title: string;
  generatedBy: string;
  createdAt: string;
}

export interface GroReport extends GroReportSummary {
  content: Record<string, unknown>;
}

export interface GroActionPlanForm {
  id?: string;
  riskId: string;
  description: string;
  controlType: GroControlType;
  responsible: string;
  dueDate: string;
  status: GroActionStatus;
  evidence: string;
}

export interface GroIndicatorForm {
  id?: string;
  riskId: string;
  name: string;
  type: GroIndicatorType;
  target: string;
  currentValue: string;
  unit: string;
  frequency: string;
  lastMeasurement: string;
  nextMeasurement: string;
  notes: string;
}

export const EMPTY_ACTION_PLAN_FORM: GroActionPlanForm = {
  riskId: '',
  description: '',
  controlType: 'ENGENHARIA',
  responsible: '',
  dueDate: '',
  status: 'aberto',
  evidence: '',
};

export const EMPTY_INDICATOR_FORM: GroIndicatorForm = {
  riskId: '',
  name: '',
  type: 'LEADING',
  target: '',
  currentValue: '',
  unit: '',
  frequency: 'mensal',
  lastMeasurement: '',
  nextMeasurement: '',
  notes: '',
};

export function groActionLabel(action: string): string {
  const map: Record<string, string> = {
    RISCO_IDENTIFICADO: 'Risco identificado',
    ETAPA_AVANCADA: 'Etapa avançada',
    ETAPA_REVERTIDA: 'Etapa revertida',
    REVISAO_CONCLUIDA: 'Revisão concluída',
    PLANO_CRIADO: 'Plano de ação criado',
    PLANO_ATUALIZADO: 'Plano atualizado',
    PLANO_EXCLUIDO: 'Plano excluído',
    INDICADOR_CRIADO: 'Indicador criado',
    INDICADOR_ATUALIZADO: 'Indicador atualizado',
    INDICADOR_EXCLUIDO: 'Indicador excluído',
    RELATORIO_GERADO: 'Relatório gerado',
  };
  return map[action] ?? action;
}
