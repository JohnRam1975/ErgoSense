/** Psicossocial — NR-01 / Guia MTE / LGPD */

export type PsicoRiskLevel = 'critico' | 'alto' | 'medio' | 'baixo';

export type PsicoQuestionnaireType = 'COPSOQ_III' | 'HSE' | 'BURNOUT' | 'CLIMA';

export type PsicoActionStatus = 'aberto' | 'andamento' | 'concluido' | 'atrasado' | 'cancelado';

export type PsicoConformityStatus = 'atendido' | 'parcial' | 'pendente';

export interface PsicoMteFactor {
  codigo: string;
  nome: string;
  avaliado: boolean;
  setorId: string | null;
  setor: string;
  probabilidade: number | null;
  severidade: number | null;
  score: number;
  nivel: PsicoRiskLevel;
  observacoes: string;
  avaliadoEm: string | null;
}

export interface PsicoMatrizItem {
  codigo: string;
  nome: string;
  setor: string;
  sev: number;
  prob: number;
  score: number;
  nivel: PsicoRiskLevel;
}

export interface PsicoActionPlan {
  id: string;
  tenantId: string;
  fatorCodigo: string | null;
  description: string;
  responsible: string;
  dueDate: string | null;
  status: PsicoActionStatus;
  priority: PsicoRiskLevel;
  createdAt?: string;
  updatedAt?: string;
}

export interface PsicoAlert {
  id: string;
  severity: PsicoRiskLevel | 'info';
  title: string;
  message: string;
  sourceType: string | null;
  sourceId: string | null;
  read: boolean;
  createdAt: string;
}

export interface PsicoTrendPoint {
  type: PsicoQuestionnaireType;
  period: string;
  avgScore: number | null;
  sampleSize: number;
}

export interface PsicoDashboardTrend {
  type: PsicoQuestionnaireType;
  label: string;
  value: number;
  period: string;
  riskLevel: PsicoRiskLevel | null;
}

export interface PsicoDashboard {
  factorsAssessed: number;
  factorsTotal: number;
  criticalCount: number;
  highPriorityFactors: PsicoMteFactor[];
  conformityPct: number;
  actionPlan: { total: number; open: number; completed: number };
  alerts: PsicoAlert[];
  trends: PsicoDashboardTrend[];
  questionnaires: Array<{
    type: PsicoQuestionnaireType;
    responses: number;
    avgScore: number | null;
  }>;
  lgpd: {
    anonymousDefault: boolean;
    consentRequired: boolean;
    consentText: string;
    retentionMonths: number;
  };
}

export interface PsicoConformityRequirement {
  id: string;
  norma: string;
  requisito: string;
  status: PsicoConformityStatus;
}

export interface PsicoConformity {
  conformidade: number;
  requirements: PsicoConformityRequirement[];
  stats: {
    atendidos: number;
    parciais: number;
    pendentes: number;
    avaliados: number;
    criticos: number;
  };
}

export interface PsicoHistoryEntry {
  id: string;
  tenantId: string;
  action: string;
  userId: string | null;
  userName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface PsicoIndicator {
  id: string;
  questionnaireType: PsicoQuestionnaireType;
  key: string;
  label: string | null;
  value: number;
  riskLevel: PsicoRiskLevel | null;
  period: string;
  sampleSize: number;
  sectorId: string | null;
}

export interface PsicoSubmitResult {
  id: string;
  type: PsicoQuestionnaireType;
  scoreGlobal: number;
  riskLevel: PsicoRiskLevel;
  dimensions: Array<{ key: string; nome: string; score: number }>;
  lgpd: { anonymous: boolean; consentRecorded: boolean };
  message?: string;
}

export interface PsicoCampanha {
  id: string;
  type: PsicoQuestionnaireType;
  title: string;
  sectorId: string | null;
  sectorName: string | null;
  anonymous: boolean;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
  responses: number;
  consentText: string;
  hasPublicLink: boolean;
}

export interface PsicoCampanhaCreated extends PsicoCampanha {
  accessToken: string;
  publicLink: string;
}

export interface PsicoPublicFormMeta {
  campaignId: string;
  type: PsicoQuestionnaireType;
  title: string;
  companyName: string;
  sectorName: string | null;
  consentText: string;
  anonymous: boolean;
}

export const PSICO_QUESTIONNAIRE_LABELS: Record<PsicoQuestionnaireType, string> = {
  COPSOQ_III: 'COPSOQ-III',
  HSE: 'HSE Std.',
  BURNOUT: 'Burnout (CBI)',
  CLIMA: 'Clima Organizacional',
};

export const LGPD_CONSENT_TEXT =
  'Autorizo o tratamento dos dados desta pesquisa psicossocial de forma agregada e anônima, ' +
  'exclusivamente para gestão de riscos ocupacionais (NR-01), conforme a LGPD (Lei 13.709/2018). ' +
  'Não serão coletados dados que permitam identificação individual quando o modo anônimo estiver ativo.';
