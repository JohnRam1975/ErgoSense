import type { WorkstationMetrics } from './workstation';
import type { Nr17SessionReport } from '../utils/nr17';
import type { ActivityContext } from '../data/activityProfiles';
import type {
  LoadAssessmentManualInput,
  LoadAssessmentSnapshot,
  LoadDistanceEstimate,
  LoadParams,
  LoadRiskResult,
} from './loadAssessment';
export type {
  DistanceSource,
  GripType,
  LoadAssessmentManualInput,
  LoadAssessmentSnapshot,
  LoadDistanceEstimate,
  LoadFrequency,
  HandlingMode,
  LoadParams,
  LoadRecommendation,
  LoadRiskResult,
} from './loadAssessment';

export type RiskLevel = 'critico' | 'alto' | 'medio' | 'baixo';

export type ScreenId =
  | 'splash'
  | 'login'
  | 'request-access'
  | 'request-access-autonomo'
  | 'activate-account'
  | 'contact-support'
  | 'admin-tenant-requests'
  | 'admin-tenant-request-detail'
  | 'admin-tenants-active'
  | 'admin-tenants-blocked'
  | 'admin-tenants-expired'
  | 'admin-access-control'
  | 'admin-tenant-detail'
  | 'register-company'
  | 'global-admin'
  | 'support-access'
  | 'company'
  | 'dashboard'
  | 'collabs'
  | 'new-collab'
  | 'sectors'
  | 'new-analysis'
  | 'camera'
  | 'result'
  | 'history'
  | 'reports'
  | 'settings'
  | 'sync'
  | 'v2-dashboard'
  | 'v2-methods'
  | 'v2-video'
  | 'v2-environmental'
  | 'v2-roadmap'
  | 'v2-audit'
  | 'psicossocial-dashboard'
  | 'psicossocial-fatores'
  | 'psicossocial-questionarios'
  | 'psicossocial-matriz'
  | 'psicossocial-plano'
  | 'psicossocial-conformidade'
  | 'psicossocial-ia'
  | 'denuncia-dashboard'
  | 'denuncia-lista'
  | 'denuncia-nova'
  | 'denuncia-detalhe'
  | 'criterios-dashboard'
  | 'criterios-config'
  | 'criterios-historico'
  | 'criterios-documentacao'
  | 'inventario-dashboard'
  | 'inventario-lista'
  | 'inventario-form'
  | 'inventario-matriz'
  | 'gro-dashboard'
  | 'gro-workflow'
  | 'gro-plano'
  | 'gro-indicadores'
  | 'gro-historico'
  | 'gro-relatorios'
  | 'pgr-dashboard'
  | 'pgr-versoes'
  | 'pgr-detalhe'
  | 'pgr-historico'
  | 'aet-dashboard'
  | 'aet-workflow'
  | 'aet-detalhe'
  | 'aet-cadastros'
  | 'aet-relatorio'
  | 'sst-dashboard'
  | 'sst-apr'
  | 'sst-epi-epc'
  | 'sst-inspecoes'
  | 'sst-auditorias'
  | 'sst-nc-capa'
  | 'sst-treinamentos'
  | 'sst-relatorios'
  | 'esocial-dashboard'
  | 'esocial-s2210'
  | 'esocial-s2220'
  | 'esocial-s2240'
  | 'esocial-historico'
  | 'esocial-config'
  | 'compliance-dashboard'
  | 'compliance-normas'
  | 'compliance-alertas'
  | 'compliance-validacao'
  | 'compliance-relatorios'
  | 'compliance-fontes'
  | 'compliance-adequacao'
  | 'org-structure';

export type AnalysisMode = 'complete' | 'offline';
export type ReportType = 'NR17' | 'colab' | 'setor';

export interface Company {
  id: string;
  name: string;
  industry: string;
  schema?: string;
  employees?: number;
  icon: string;
  color: 'amber' | 'cyan' | 'green' | 'neutral';
  active?: boolean;
}

export interface Collaborator {
  id: string;
  name: string;
  matricula: string;
  cargo: string;
  setor: string;
  turno: string;
  birthDate?: string;
  notes?: string;
  consent: boolean;
  consentDate?: string;
  risk: RiskLevel;
  icon: string;
  iconBg: string;
  /** Módulo 12 — antropometria */
  heightCm?: number;
  weightKg?: number;
  sex?: 'M' | 'F';
  age?: number;
}

export interface JointAngles {
  lombar: number;
  dorso: number;
  ombroD: number;
  ombroE?: number;
  pescoco: number;
  cotovelo: number;
  cotoveloE?: number;
  maoD: number;
  maoE?: number;
  quadril: number;
  joelhoD: number;
  joelhoE?: number;
  tornozeloD: number;
  tornozeloE?: number;
  repeticao: number;
}

export type { Nr17SessionReport } from '../utils/nr17';
export type { ActivityContext } from '../data/activityProfiles';

export interface Analysis {
  id: string;
  collaboratorId: string;
  collaboratorName: string;
  setor: string;
  activity: string;
  /** Ambiente de trabalho (escritório, campo, construção, etc.) */
  activityContext?: ActivityContext;
  notes?: string;
  date: string;
  time: string;
  score: number;
  risk: RiskLevel;
  rula: number;
  reba: number;
  angles: JointAngles;
  mode: AnalysisMode;
  synced: boolean;
  icon: string;
  iconBg: string;
  captureImage?: string;
  hasVideoRecording?: boolean;
  localVideoUrl?: string;
  videoFormat?: 'mp4' | 'webm';
  videoMimeType?: string;
  recordingSecs?: number;
  workstation?: WorkstationMetrics;
  /** Pacote completo de avaliação de carga (preferencial) */
  loadAssessment?: LoadAssessmentSnapshot;
  /** Parâmetros normalizados do motor de carga */
  loadParams?: LoadParams;
  /** Resultado biomecânico de carga */
  loadResult?: LoadRiskResult;
  /** Última estimativa visual (distância/altura) */
  loadEstimate?: LoadDistanceEstimate;
  /** Entrada manual do avaliador */
  loadManual?: LoadAssessmentManualInput;
  /** Índice peso×distância (motor simplificado) */
  loadEffort?: import('../utils/calculateErgonomicLoadRisk').LoadEffortResult;
  /** Tempo máximo seguido em postura de risco durante a sessão */
  maxRiskStreakSecs?: number;
  totalRiskSecs?: number;
  /** Relatório de conformidade NR-17 gerado ao fim da sessão */
  nr17Report?: Nr17SessionReport;
  sessionSampleCount?: number;
  /** Relatório V2 — todos os métodos ergonômicos */
  v2Report?: import('../methods/types').V2SessionReport;
  environmental?: import('../services/environmental').EnvironmentalInput;
  /** Rastreabilidade técnica */
  traceability?: import('../services/assessmentTraceability').AssessmentTraceability;
  /** Log de auditoria da avaliação */
  assessmentAuditLog?: import('../services/assessmentAuditLog').AssessmentAuditLog;
  /** AEP gerada automaticamente */
  aepDocument?: import('../services/aepDocument').AepDocument;
  /** AET assistida (rascunho) */
  aetDocument?: import('../services/aetDocument').AetDocument;
  /** Confiança da detecção corporal por articulação */
  poseConfidence?: import('../utils/poseConfidence').JointConfidenceMap;
}

export interface Report {
  id: string;
  title: string;
  subtitle: string;
  size: string;
  status: 'ready' | 'generating';
  progress?: number;
  type: ReportType;
  analysisId?: string;
}

export interface AppSettings {
  captureQuality: string;
  aiEngine: string;
  skeletonOverlay: boolean;
  soundAlerts: boolean;
  autoSync: boolean;
  wifiOnly: boolean;
}

export interface UserSession {
  email: string;
  name: string;
  role: string;
  roleCode?: string;
  company: string;
  location: string;
  tenantId?: string;
}

export interface AppState {
  session: UserSession | null;
  selectedCompanyId: string;
  collaborators: Collaborator[];
  analyses: Analysis[];
  reports: Report[];
  settings: AppSettings;
  analysisMode: AnalysisMode;
  reportType: ReportType;
  currentAnalysisId: string | null;
}
