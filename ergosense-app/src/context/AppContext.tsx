import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { StoredState, NewAnalysisDraft } from './contextTypes';
import type {
  Analysis,
  AnalysisMode,
  AppSettings,
  Collaborator,
  Company,
  JointAngles,
  LoadAssessmentManualInput,
  LoadAssessmentSnapshot,
  Report,
  ReportType,
  RiskLevel,
  ScreenId,
  UserSession,
} from '../types';
import { repairPortugueseText } from '../utils/textEncoding';
import { fetchTenantDataBundle } from './hooks/fetchTenantDataBundle';
import { applyTenantDataBundle } from './hooks/applyTenantDataBundle';
import { useCollaboratorActions } from './hooks/useCollaboratorActions';
import { useAetActions } from './hooks/useAetActions';
import {
  apiAuthorizeSupport,
  apiGetSupportAudit,
  apiGetSupportStatus,
  apiGetTenantMetadata,
  apiGetTenants,
  apiLogin,
  apiLogout,
  apiMfaVerify,
  type ApiLoginSuccess,
  apiRegisterCompany,
  apiRestoreSession,
  apiRevokeSupport,
  apiSaveAnalysis,
  apiDeleteAnalysis,
  apiDeleteRiskInventory,
  apiGetRiskInventory,
  apiGetRiskInventorySummary,
  apiSaveRiskInventory,
  apiGetDenunciaDashboard,
  apiGetDenuncias,
  apiGetDenuncia,
  apiCreateDenuncia,
  apiUpdateDenunciaStatus,
  apiAddDenunciaTreatment,
  apiAddDenunciaEvidence,
  apiIntegrateDenuncia,
  apiConcludeDenuncia,
  apiGetActiveCriteria,
  apiGetCriteriaDocumentation,
  apiFetchCriteriaMethodologies,
  apiCreateCriteriaMethodology,
  apiActivateCriteriaVersion,
  apiFetchCriteriaAudit,
  apiGetGroDashboard,
  apiGetGroWorkflow,
  apiAdvanceGroWorkflow,
  apiCompleteGroReview,
  apiGetGroActionPlans,
  apiSaveGroActionPlan,
  apiDeleteGroActionPlan,
  apiGetGroIndicators,
  apiSaveGroIndicator,
  apiDeleteGroIndicator,
  apiGetGroHistory,
  apiGetGroReports,
  apiGenerateGroReport,
  apiGetPgrProgram,
  apiUpdatePgrProgram,
  apiGetPgrVersions,
  apiGetPgrVersion,
  apiGeneratePgrVersion,
  apiRefreshPgrVersion,
  apiSubmitPgrApproval,
  apiApprovePgrVersion,
  apiRejectPgrVersion,
  apiSignPgrVersion,
  apiStartPgrRevision,
  apiGetPgrHistory,
  apiGetPsicoDashboard,
  apiGetPsicoFatores,
  apiGetPsicoMatriz,
  apiGetPsicoConformidade,
  apiGetPsicoPlanoAcao,
  apiGetPsicoHistorico,
  apiGetPsicoTendencias,
  apiSavePsicoFator,
  apiSavePsicoPlanoAcao,
  apiDeletePsicoPlanoAcao,
  apiSubmitPsicoResposta,
  apiMarkPsicoAlertRead,
  apiGetAetDashboard,
  apiGetAetProcessos,
  apiGetAetProcesso,
  apiAdvanceAetStage,
  apiSaveAetVibracaoCorpo,
  apiSaveAetVibracaoMaos,
  apiSaveAetTeleatendimento,
  apiSaveAetOrganizacao,
  apiSaveAetMetodos,
  apiGenerateAetReport,
  apiSignAet,
  apiGetAetMobiliario,
  apiSaveAetMobiliario,
  apiGetAetEquipamentos,
  apiSaveAetEquipamento,
  apiGetAetHistorico,
  apiUpdateAetTechnicalResponsible,
  apiGetAetVersions,
  apiCreateAetVersion,
  apiGetAetVersion,
  apiRefreshAetVersionSnapshot,
  apiGenerateAetVersionReport,
  apiSubmitAetApproval,
  apiApproveAetVersion,
  apiRejectAetVersion,
  apiSignAetVersion,
  apiStartAetRevision,
  apiGetAetIntegrations,
  apiGetSstDashboard,
  apiGetSstApr,
  apiCreateSstApr,
  apiGetSstEpi,
  apiCreateSstEpi,
  apiGetSstEpc,
  apiCreateSstEpc,
  apiGetSstInspecoes,
  apiCreateSstInspecao,
  apiGetSstAuditorias,
  apiCreateSstAuditoria,
  apiGetSstNc,
  apiCreateSstNc,
  apiGetSstCapa,
  apiCreateSstCapa,
  apiGetSstTreinamentos,
  apiCreateSstTreinamento,
  apiGenerateSstReport,
  apiGetEsocialDashboard,
  apiGetEsocialConfig,
  apiUpdateEsocialConfig,
  apiGetEsocialEventos,
  apiCreateEsocialEvento,
  apiValidateEsocialEvento,
  apiSignEsocialEvento,
  apiPrepareEsocialEnvio,
  apiGetEsocialXml,
  apiGetEsocialHistorico,
  apiTransmitEsocialEvento,
  apiResendEsocialEvento,
  apiConsultEsocialStatus,
  apiGetComplianceDashboard,
  apiGetComplianceFontes,
  apiUpdateComplianceFonte,
  apiRunComplianceScan,
  apiGetComplianceNormas,
  apiGetComplianceNormaVersoes,
  apiGetComplianceDeteccoes,
  apiGetComplianceImpactos,
  apiValidateComplianceDetection,
  apiGetComplianceAlertas,
  apiMarkComplianceAlertRead,
  apiGenerateComplianceReport,
  apiGetComplianceRelatorios,
  apiCompareComplianceNormVersions,
  apiGetComplianceSchedule,
  apiUpdateComplianceSchedule,
  apiGetComplianceTasks,
  apiUpdateComplianceTask,
  apiGetOrgTree,
  apiCreateOrgUnit,
  apiCreateOrgSector,
  apiCreateOrgFunction,
  apiCreateOrgActivity,
  apiCreateOrgWorkPost,
  apiDeleteOrgEntity,
  apiSubmitAccessRequest,
  isApiAvailable,
  type SupportAuditEntry,
  type SupportStatus,
  type TenantMetadata,
} from '../api/client';
import { setApiAuthSession } from '../api/authHeaders';
import {
  EMPTY_RISK_FORM,
  type RiskInventoryFormData,
  type RiskInventoryItem,
  type RiskInventorySummary,
} from '../types/riskInventory';
import {
  EMPTY_DENUNCIA_FORM,
  type DenunciaDashboard,
  type DenunciaFormData,
  type DenunciaItem,
} from '../types/denuncia';
import type {
  ActiveCriteria,
  CriteriaAuditEntry,
  CriteriaDocumentation,
  RiskMethodology,
} from '../types/riskCriteria';
import {
  EMPTY_ACTION_PLAN_FORM,
  EMPTY_INDICATOR_FORM,
  type GroActionPlan,
  type GroActionPlanForm,
  type GroDashboard,
  type GroHistoryEntry,
  type GroIndicator,
  type GroIndicatorForm,
  type GroReportType,
  type GroReportSummary,
  type GroWorkflow,
} from '../types/gro';
import type {
  PgrHistoryEntry,
  PgrProgram,
  PgrSignatureType,
  PgrVersionDetail,
  PgrVersionSummary,
} from '../types/pgr';
import type {
  PsicoActionPlan,
  PsicoConformity,
  PsicoDashboard,
  PsicoHistoryEntry,
  PsicoMatrizItem,
  PsicoMteFactor,
  PsicoQuestionnaireType,
  PsicoSubmitResult,
  PsicoTrendPoint,
} from '../types/psicossocial';
import type {
  AetDashboard,
  AetEquipment,
  AetFurniture,
  AetHistoryEntry,
  AetIntegration,
  AetNormativeReport,
  AetProcess,
  AetSignatureType,
  AetVersionDetail,
} from '../types/aet';
import type {
  SstApr,
  SstAuditoria,
  SstCapa,
  SstDashboard,
  SstEpi,
  SstEpc,
  SstInspecao,
  SstNc,
  SstReport,
  SstTreinamento,
} from '../types/sst';
import type {
  EsocialConfig,
  EsocialDashboard,
  EsocialEvent,
  EsocialEventType,
  EsocialHistoryEntry,
} from '../types/esocial';
import type {
  ComplianceAlerta,
  ComplianceAdequationTask,
  ComplianceClientImpact,
  ComplianceDashboard,
  ComplianceDeteccao,
  ComplianceFonte,
  ComplianceImpacto,
  ComplianceNorma,
  ComplianceNormaVersao,
  ComplianceReportSummary,
  ComplianceSchedule,
  ComplianceSystemImpact,
  ComplianceVersionCompare,
} from '../types/compliance';
import type { OrgEntityLevel, OrgTree } from '../types/org';
import { exportAetPdf } from '../utils/exportAetPdf';
import { exportSstPdf } from '../utils/exportSstPdf';
import { downloadEsocialXmlFromString } from '../services/esocialExport';
import { exportPgrPdf } from '../utils/exportPgrPdf';
import { buildNr17SessionReport } from '../utils/nr17';
import { blobToVideoRecording, createLocalVideoUrl } from '../utils/videoRecording';
import { exportAnalysisPdf, analysisWithNr17Report, exportCaptureImage } from '../utils/exportNr17Pdf';
import {
  COMPANIES,
  DEFAULT_ANALYSES,
  DEFAULT_COLLABORATORS,
  DEFAULT_REPORTS,
  DEFAULT_SETTINGS,
} from '../data/constants';
import { DEFAULT_ACTIVITY_CONTEXT } from '../data/activityProfiles';
import {
  formatDateBR,
  formatTimeBR,
} from '../utils/ergonomics';
import { evaluateErgonomicSession } from '../utils/ergonomicRiskEngine';
import { scoreFromEffortRisk } from '../utils/calculateErgonomicLoadRisk';
import {
  buildLoadAssessmentSnapshot,
  DEFAULT_LOAD_MANUAL_INPUT,
  normalizeLoadParams,
} from '../utils/loadHandling';
import { canExportFullPdf, planTierFromName, type PlanTier } from '../plan/planFeatures';
import { EMPTY_JOINT_ANGLES } from '../utils/poseGeometry';
import { DEFAULT_WORKSTATION, type WorkstationMetrics } from '../types/workstation';
import { runSessionMethods } from '../methods/runSessionMethods';
import { buildAnthropometry } from '../services/anthropometry';
import { logAnalysisAudit } from '../services/auditLog';
import { buildAssessmentTraceability } from '../services/assessmentTraceability';
import { buildAssessmentAuditLog } from '../services/assessmentAuditLog';
import { buildAepDocument } from '../services/aepDocument';
import { buildAetDocument } from '../services/aetDocument';
import { createDistanceMeasurement } from '../vision/distanceTypes';
import { measureWithArFallback } from '../vision/arDistance';

const STORAGE_KEY = 'ergosense-app-v1';

export type AnalysisDraftPatch = Omit<Partial<NewAnalysisDraft>, 'loadAssessment'> & {
  loadAssessment?: {
    manual?: Partial<LoadAssessmentManualInput>;
    estimate?: import('../types/loadAssessment').LoadDistanceEstimate;
  };
};

interface ModalState {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: (() => void) | null;
}

interface AppContextValue {
  screen: ScreenId;
  session: UserSession | null;
  selectedCompanyId: string;
  selectedCompany: Company;
  companies: Company[];
  dbConnected: boolean;
  sectors: string[];
  collaborators: Collaborator[];
  analyses: Analysis[];
  reports: Report[];
  settings: AppSettings;
  analysisMode: AnalysisMode;
  reportType: ReportType;
  currentAnalysisId: string | null;
  currentAnalysis: Analysis | null;
  menuOpen: boolean;
  toast: { msg: string; type: '' | 'success' | 'info' | 'warn' } | null;
  modal: ModalState;
  analysisDraft: NewAnalysisDraft;
  pendingSync: number;
  liveAngles: JointAngles;
  liveWorkstation: WorkstationMetrics;
  go: (id: ScreenId, opts?: { instant?: boolean }) => void;
  openMenu: () => void;
  closeMenu: () => void;
  showToast: (msg: string, type?: '' | 'success' | 'info' | 'warn') => void;
  showModal: (title: string, body: string, confirmLabel: string, onConfirm?: () => void) => void;
  closeModal: () => void;
  login: (
    email: string,
    password: string,
  ) => Promise<false | true | { mfaRequired: true; mfaToken: string; email: string; name: string }>;
  verifyMfaLogin: (mfaToken: string, code: string) => Promise<boolean>;
  submitAccessRequest: (data: { nome: string; email: string; funcao: string; matricula: string }) => Promise<boolean>;
  registerCompany: (data: {
    nome: string;
    industria: string;
    adminNome: string;
    adminEmail: string;
    adminPassword: string;
  }) => Promise<boolean>;
  refreshCollaborators: () => Promise<void>;
  refreshCompanies: () => Promise<void>;
  isGlobalAdmin: boolean;
  isTenantAdmin: boolean;
  tenantMetadata: TenantMetadata[];
  supportStatus: SupportStatus | null;
  supportAudit: SupportAuditEntry[];
  refreshSupportStatus: () => Promise<void>;
  refreshSupportAudit: () => Promise<void>;
  authorizeSupport: (duration: '1h' | '24h' | '7d', reason?: string) => Promise<boolean>;
  revokeSupport: () => Promise<boolean>;
  accessTenantWithSupport: (tenantId: string) => Promise<boolean>;
  globalSupportMode: boolean;
  screenInstant: boolean;
  exitGlobalSupport: () => void;
  logout: () => void;
  selectCompany: (id: string) => void;
  saveCollaborator: (data: Omit<Collaborator, 'id' | 'risk' | 'icon' | 'iconBg'> & { id?: string }) => void;
  setAnalysisDraft: (patch: AnalysisDraftPatch) => void;
  setAnalysisMode: (mode: AnalysisMode) => void;
  setReportType: (type: ReportType) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateSession: (patch: Partial<UserSession>) => void;
  openAnalysis: (id: string) => void;
  deleteAnalysis: (id: string) => void;
  captureAnalysis: (
    angles: JointAngles,
    workstation?: WorkstationMetrics,
    captureImage?: string,
    recordingSecs?: number,
    postureDuration?: { maxRiskStreakSecs: number; totalRiskSecs: number },
    sessionMeta?: {
      nr17Report?: import('../utils/nr17').Nr17SessionReport;
      sessionSampleCount?: number;
      autoGenerateReport?: boolean;
      measuredDistanceCm?: number;
    },
    videoBlob?: Blob | null,
  ) => void;
  captureVideoAnalysis: (
    videoReport: import('../types/videoErgo').VideoErgonomicReport,
    collaboratorId: string,
    source: 'live' | 'upload' | 'offline_sync',
    videoBlob?: Blob | null,
  ) => void;
  setLiveWorkstation: (m: WorkstationMetrics) => void;
  startSync: () => void;
  generateReport: () => void;
  exportCurrentAnalysisPdf: () => void;
  applyLoadEffortToCurrentAnalysis: (
    effort: import('../utils/calculateErgonomicLoadRisk').LoadEffortResult,
    weightKg: number,
    distanceCm: number,
  ) => void;
  exportCurrentCaptureImage: () => void;
  exportReportPdf: (reportId: string) => void;
  offerPdfDownload: boolean;
  clearPdfDownloadOffer: () => void;
  resultDetailsRevealed: boolean;
  revealResultDetails: () => void;
  setLiveAngles: (angles: JointAngles) => void;
  planTier: PlanTier;
  canExportPdf: boolean;
  getStats: () => {
    totalMonth: number;
    evaluated: number;
    critical: number;
    sectors: number;
    riskDistribution: Record<RiskLevel, { count: number; pct: number }>;
  };
  riskInventory: RiskInventoryItem[];
  riskInventorySummary: RiskInventorySummary | null;
  riskInventoryDraft: RiskInventoryFormData & { id?: string };
  setRiskInventoryDraft: (patch: Partial<RiskInventoryFormData & { id?: string }>) => void;
  refreshRiskInventory: () => Promise<void>;
  openRiskForm: (item?: RiskInventoryItem) => void;
  saveRiskInventory: () => Promise<void>;
  deleteRiskInventory: (id: string) => void;
  denunciaDashboard: DenunciaDashboard | null;
  denuncias: DenunciaItem[];
  denunciaDetail: DenunciaItem | null;
  denunciaDraft: DenunciaFormData;
  setDenunciaDraft: (patch: Partial<DenunciaFormData>) => void;
  refreshDenuncias: () => Promise<void>;
  submitDenuncia: () => Promise<DenunciaItem | null>;
  openDenunciaDetail: (id: string) => Promise<void>;
  updateDenunciaStatus: (status: DenunciaItem['status']) => Promise<void>;
  addDenunciaTreatment: (description: string) => Promise<void>;
  addDenunciaEvidence: (description: string) => Promise<void>;
  integrateDenuncia: () => Promise<void>;
  concludeDenuncia: (conclusion: string) => Promise<void>;
  activeCriteria: ActiveCriteria | null;
  riskCriteriaMethodologies: RiskMethodology[];
  criteriaDocumentation: CriteriaDocumentation | null;
  criteriaAuditTrail: CriteriaAuditEntry[];
  refreshRiskCriteria: () => Promise<void>;
  createRiskMethodology: (data: { name: string; matrixType: string; activate?: boolean }) => Promise<void>;
  activateCriteriaVersion: (methodologyId: string, versionId: string) => Promise<void>;
  groDashboard: GroDashboard | null;
  groWorkflow: GroWorkflow | null;
  groActionPlans: GroActionPlan[];
  groIndicators: GroIndicator[];
  groHistory: GroHistoryEntry[];
  groReports: GroReportSummary[];
  groActionPlanDraft: GroActionPlanForm | null;
  groIndicatorDraft: GroIndicatorForm | null;
  setGroActionPlanDraft: (draft: GroActionPlanForm | null) => void;
  setGroIndicatorDraft: (draft: GroIndicatorForm | null) => void;
  refreshGroData: () => Promise<void>;
  openGroActionPlanForm: (item?: GroActionPlan) => void;
  openGroIndicatorForm: (item?: GroIndicator) => void;
  saveGroActionPlan: () => Promise<void>;
  deleteGroActionPlan: (id: string) => void;
  saveGroIndicator: () => Promise<void>;
  deleteGroIndicator: (id: string) => void;
  advanceGroWorkflow: (riskId: string) => Promise<void>;
  completeGroReview: (riskId: string) => Promise<void>;
  generateGroReport: (type: GroReportType) => Promise<void>;
  pgrProgram: PgrProgram | null;
  pgrVersions: PgrVersionSummary[];
  pgrVersionDetail: PgrVersionDetail | null;
  pgrHistory: PgrHistoryEntry[];
  refreshPgrData: () => Promise<void>;
  updatePgrProgram: (patch: Partial<Pick<PgrProgram, 'title' | 'description' | 'technicalResponsible' | 'legalResponsible'>>) => void;
  generatePgrVersion: () => Promise<void>;
  openPgrVersion: (id: string) => Promise<void>;
  refreshPgrVersion: (id: string) => Promise<void>;
  submitPgrApproval: (versionId: string, approverName: string, approverRole?: string) => Promise<void>;
  approvePgrVersion: (versionId: string) => Promise<void>;
  rejectPgrVersion: (versionId: string) => Promise<void>;
  signPgrVersion: (versionId: string, type: PgrSignatureType, name: string, role?: string) => Promise<void>;
  startPgrRevision: (versionId: string) => Promise<void>;
  downloadPgrPdf: () => void;
  psicoDashboard: PsicoDashboard | null;
  psicoFatores: PsicoMteFactor[];
  psicoMatriz: PsicoMatrizItem[];
  psicoConformity: PsicoConformity | null;
  psicoActionPlans: PsicoActionPlan[];
  psicoHistory: PsicoHistoryEntry[];
  psicoTrends: PsicoTrendPoint[];
  refreshPsicoData: () => Promise<void>;
  savePsicoFator: (
    codigo: string,
    data: { probabilidade: number; severidade: number; setorId?: string; observacoes?: string },
  ) => Promise<void>;
  submitPsicoQuestionnaire: (
    type: PsicoQuestionnaireType,
    answers: Record<string, number>,
    consent: boolean,
  ) => Promise<PsicoSubmitResult | null>;
  savePsicoActionPlan: (data: Partial<PsicoActionPlan> & { id?: string }) => Promise<void>;
  updatePsicoActionStatus: (id: string, status: PsicoActionPlan['status']) => Promise<void>;
  deletePsicoActionPlan: (id: string) => Promise<void>;
  markPsicoAlertRead: (id: string) => Promise<void>;
  aetDashboard: AetDashboard | null;
  aetProcesses: AetProcess[];
  aetProcessDetail: AetProcess | null;
  aetFurniture: AetFurniture[];
  aetEquipment: AetEquipment[];
  aetReport: AetNormativeReport | null;
  refreshAetData: () => Promise<void>;
  createAetProcess: (title: string) => Promise<boolean>;
  openAetProcess: (id: string) => Promise<void>;
  advanceAetStage: () => Promise<void>;
  saveAetVibracaoCorpo: (data: { aceleracaoMs2: number; horasExposicao: number }) => Promise<void>;
  saveAetVibracaoMaos: (data: { aceleracaoMs2: number; horasExposicao: number }) => Promise<void>;
  saveAetTeleatendimento: (answers: Record<string, number>) => Promise<void>;
  saveAetOrganizacao: (answers: Record<string, number>) => Promise<void>;
  saveAetMetodos: (methods: Record<string, unknown>, importAnalysisId?: string) => Promise<void>;
  saveAetFurniture: (data: Partial<AetFurniture>) => Promise<void>;
  saveAetEquipment: (data: Partial<AetEquipment>) => Promise<void>;
  generateAetReport: () => Promise<void>;
  signAet: (name: string, registry: string) => Promise<void>;
  downloadAetPdf: () => void;
  aetVersionDetail: AetVersionDetail | null;
  aetVersions: AetVersionDetail[];
  aetHistory: AetHistoryEntry[];
  aetIntegrations: AetIntegration[];
  refreshAetVersion: (versionId: string) => Promise<void>;
  createAetVersion: () => Promise<void>;
  refreshAetVersionSnapshot: () => Promise<void>;
  generateAetVersionReport: () => Promise<void>;
  submitAetApproval: (approverName: string, approverRole?: string) => Promise<void>;
  approveAetVersion: () => Promise<void>;
  rejectAetVersion: (notes?: string) => Promise<void>;
  signAetVersion: (type: AetSignatureType, name: string, role?: string, document?: string) => Promise<void>;
  startAetRevision: () => Promise<void>;
  saveAetTechnicalResponsible: (data: Record<string, string>) => Promise<void>;
  sstDashboard: SstDashboard | null;
  sstApr: SstApr[];
  sstEpi: SstEpi[];
  sstEpc: SstEpc[];
  sstInspecoes: SstInspecao[];
  sstAuditorias: SstAuditoria[];
  sstNc: SstNc[];
  sstCapa: SstCapa[];
  sstTreinamentos: SstTreinamento[];
  sstReport: SstReport | null;
  refreshSstData: () => Promise<void>;
  createSstApr: (data: Partial<SstApr>) => Promise<void>;
  createSstEpi: (data: Partial<SstEpi>) => Promise<void>;
  createSstEpc: (data: Partial<SstEpc>) => Promise<void>;
  createSstInspecao: (title: string) => Promise<void>;
  createSstAuditoria: (title: string) => Promise<void>;
  createSstNc: (data: { description: string; title?: string; severity?: string; riskId?: string }) => Promise<void>;
  createSstCapa: (data: { description: string; ncId?: string; riskId?: string; syncGro?: boolean }) => Promise<void>;
  createSstTreinamento: (title: string) => Promise<void>;
  generateSstReport: () => Promise<void>;
  downloadSstPdf: () => void;
  esocialDashboard: EsocialDashboard | null;
  esocialConfig: EsocialConfig | null;
  esocialEventos: EsocialEvent[];
  esocialHistory: EsocialHistoryEntry[];
  refreshEsocialData: () => Promise<void>;
  createEsocialEvent: (data: { eventType: EsocialEventType; payload?: Record<string, unknown>; collaboratorId?: string; analysisId?: string; riskId?: string }) => Promise<void>;
  validateEsocialEvent: (id: string) => Promise<void>;
  signEsocialEvent: (id: string) => Promise<void>;
  downloadEsocialXml: (id: string) => Promise<void>;
  prepareEsocialEnvio: (id: string) => Promise<void>;
  transmitEsocialEvent: (id: string) => Promise<void>;
  resendEsocialEvent: (id: string) => Promise<void>;
  consultEsocialStatus: (id: string) => Promise<void>;
  updateEsocialConfig: (data: Partial<EsocialConfig>) => Promise<void>;
  complianceDashboard: ComplianceDashboard | null;
  complianceFontes: ComplianceFonte[];
  complianceNormas: ComplianceNorma[];
  complianceNormaVersoes: ComplianceNormaVersao[];
  complianceDeteccoes: ComplianceDeteccao[];
  complianceAlertas: ComplianceAlerta[];
  complianceImpactos: ComplianceImpacto[];
  complianceSystemImpacts: ComplianceSystemImpact[];
  complianceClientImpacts: ComplianceClientImpact[];
  complianceTasks: ComplianceAdequationTask[];
  complianceSchedule: ComplianceSchedule | null;
  complianceVersionCompare: ComplianceVersionCompare | null;
  complianceReports: ComplianceReportSummary[];
  refreshComplianceData: () => Promise<void>;
  orgTree: OrgTree | null;
  refreshOrgData: () => Promise<void>;
  createOrgEntity: (level: OrgEntityLevel, parentId: string, name: string) => Promise<boolean>;
  deleteOrgEntity: (level: OrgEntityLevel, id: string) => Promise<boolean>;
  runComplianceScan: (sources?: string[]) => Promise<void>;
  updateComplianceFonte: (code: string, data: { active?: boolean; intervalHours?: number }) => Promise<void>;
  loadNormaVersoes: (normId: string) => Promise<void>;
  compareNormVersions: (normId: string, fromId: string, toId: string) => Promise<void>;
  loadDetectionImpactos: (detectionId: string) => Promise<void>;
  validateComplianceDetection: (id: string, decision: 'APROVAR' | 'REJEITAR' | 'SOLICITAR_REVISAO', justification: string) => Promise<void>;
  updateComplianceTask: (id: string, patch: { status?: string; responsible?: string }) => Promise<void>;
  updateComplianceSchedule: (data: { active?: boolean; intervalHours?: number }) => Promise<void>;
  markComplianceAlertRead: (id: string) => Promise<void>;
  generateComplianceReport: () => Promise<void>;
  downloadComplianceReport: () => Promise<void>;
}

const defaultDraft: NewAnalysisDraft = {
  collaboratorId: '1',
  setor: 'Beneficiamento',
  activityContext: DEFAULT_ACTIVITY_CONTEXT,
  activity: 'Operação de britagem',
  notes: '',
  loadAssessment: {
    manual: { ...DEFAULT_LOAD_MANUAL_INPUT },
  },
};

function repairCollaborator(c: Collaborator): Collaborator {
  return {
    ...c,
    name: repairPortugueseText(c.name),
    setor: repairPortugueseText(c.setor),
    cargo: repairPortugueseText(c.cargo),
    turno: repairPortugueseText(c.turno),
  };
}

function repairAnalysis(a: Analysis): Analysis {
  const manual = a.loadManual ?? a.loadAssessment?.manual;
  const safeManual = manual
    ? { ...DEFAULT_LOAD_MANUAL_INPUT, ...manual }
    : undefined;
  return {
    ...a,
    collaboratorName: repairPortugueseText(a.collaboratorName),
    setor: repairPortugueseText(a.setor),
    activity: repairPortugueseText(a.activity),
    angles: a.angles ?? EMPTY_JOINT_ANGLES,
    loadManual: safeManual,
    loadAssessment: a.loadAssessment
      ? {
          ...a.loadAssessment,
          manual: safeManual ?? { ...DEFAULT_LOAD_MANUAL_INPUT },
        }
      : safeManual
        ? { manual: safeManual }
        : undefined,
  };
}

function repairStoredState(state: StoredState): StoredState {
  return {
    ...state,
    collaborators: state.collaborators.map(repairCollaborator),
    analyses: state.analyses.map(repairAnalysis),
  };
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredState;
      return repairStoredState(parsed);
    }
  } catch {
    /* ignore */
  }
  return repairStoredState({
    session: null,
    selectedCompanyId: 'vale',
    collaborators: DEFAULT_COLLABORATORS,
    analyses: DEFAULT_ANALYSES,
    reports: DEFAULT_REPORTS,
    settings: DEFAULT_SETTINGS,
    analysisMode: 'complete',
    reportType: 'NR17',
  });
}

function persist(state: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function profileLabel(perfil: string): string {
  const map: Record<string, string> = {
    ERGONOMISTA: 'Ergonomista Sênior',
    ADMIN_EMPRESA: 'Administrador',
    ADMIN_GLOBAL: 'Administrador Global',
    SUPERVISOR: 'Supervisor',
    OPERADOR: 'Operador',
  };
  return map[perfil] ?? perfil;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredState>(loadState);
  const [screen, setScreen] = useState<ScreenId>('splash');
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<AppContextValue['toast']>(null);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    title: '',
    body: '',
    confirmLabel: 'Confirmar',
    onConfirm: null,
  });
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [offerPdfDownload, setOfferPdfDownload] = useState(false);
  const [resultDetailsRevealed, setResultDetailsRevealed] = useState(false);
  const [analysisDraft, setDraft] = useState<NewAnalysisDraft>(() => ({
    ...defaultDraft,
    activityContext: defaultDraft.activityContext ?? DEFAULT_ACTIVITY_CONTEXT,
  }));
  const [liveAngles, setLiveAngles] = useState<JointAngles>(EMPTY_JOINT_ANGLES);
  const [liveWorkstation, setLiveWorkstation] = useState<WorkstationMetrics>(DEFAULT_WORKSTATION);
  const [companies, setCompanies] = useState<Company[]>(COMPANIES);
  const [dbConnected, setDbConnected] = useState(false);
  const [sectors, setSectors] = useState<string[]>([]);
  const [tenantMetadata, setTenantMetadata] = useState<TenantMetadata[]>([]);
  const [supportStatus, setSupportStatus] = useState<SupportStatus | null>(null);
  const [supportAudit, setSupportAudit] = useState<SupportAuditEntry[]>([]);
  const [globalSupportMode, setGlobalSupportMode] = useState(false);
  const [screenInstant, setScreenInstant] = useState(false);
  const [riskInventory, setRiskInventory] = useState<RiskInventoryItem[]>([]);
  const [riskInventorySummary, setRiskInventorySummary] = useState<RiskInventorySummary | null>(null);
  const [riskInventoryDraft, setRiskInventoryDraftState] = useState<RiskInventoryFormData & { id?: string }>(
    EMPTY_RISK_FORM,
  );
  const [groDashboard, setGroDashboard] = useState<GroDashboard | null>(null);
  const [groWorkflow, setGroWorkflow] = useState<GroWorkflow | null>(null);
  const [groActionPlans, setGroActionPlans] = useState<GroActionPlan[]>([]);
  const [groIndicators, setGroIndicators] = useState<GroIndicator[]>([]);
  const [groHistory, setGroHistory] = useState<GroHistoryEntry[]>([]);
  const [groReports, setGroReports] = useState<GroReportSummary[]>([]);
  const [groActionPlanDraft, setGroActionPlanDraftState] = useState<GroActionPlanForm | null>(null);
  const [groIndicatorDraft, setGroIndicatorDraftState] = useState<GroIndicatorForm | null>(null);
  const [pgrProgram, setPgrProgram] = useState<PgrProgram | null>(null);
  const [pgrVersions, setPgrVersions] = useState<PgrVersionSummary[]>([]);
  const [pgrVersionDetail, setPgrVersionDetail] = useState<PgrVersionDetail | null>(null);
  const [pgrHistory, setPgrHistory] = useState<PgrHistoryEntry[]>([]);
  const [psicoDashboard, setPsicoDashboard] = useState<PsicoDashboard | null>(null);
  const [psicoFatores, setPsicoFatores] = useState<PsicoMteFactor[]>([]);
  const [psicoMatriz, setPsicoMatriz] = useState<PsicoMatrizItem[]>([]);
  const [psicoConformity, setPsicoConformity] = useState<PsicoConformity | null>(null);
  const [psicoActionPlans, setPsicoActionPlans] = useState<PsicoActionPlan[]>([]);
  const [psicoHistory, setPsicoHistory] = useState<PsicoHistoryEntry[]>([]);
  const [psicoTrends, setPsicoTrends] = useState<PsicoTrendPoint[]>([]);
  const [denunciaDashboard, setDenunciaDashboard] = useState<DenunciaDashboard | null>(null);
  const [denuncias, setDenuncias] = useState<DenunciaItem[]>([]);
  const [denunciaDetail, setDenunciaDetail] = useState<DenunciaItem | null>(null);
  const [denunciaDraft, setDenunciaDraftState] = useState<DenunciaFormData>(EMPTY_DENUNCIA_FORM);
  const [activeCriteria, setActiveCriteria] = useState<ActiveCriteria | null>(null);
  const [riskCriteriaMethodologies, setRiskCriteriaMethodologies] = useState<RiskMethodology[]>([]);
  const [criteriaDocumentation, setCriteriaDocumentation] = useState<CriteriaDocumentation | null>(null);
  const [criteriaAuditTrail, setCriteriaAuditTrail] = useState<CriteriaAuditEntry[]>([]);
  const [aetDashboard, setAetDashboard] = useState<AetDashboard | null>(null);
  const [aetProcesses, setAetProcesses] = useState<AetProcess[]>([]);
  const e2eStateRef = useRef({
    screen: 'splash' as ScreenId,
    stored,
    denuncias,
    pgrVersions,
    aetProcesses,
    setDraft,
  });
  e2eStateRef.current = { screen, stored, denuncias, pgrVersions, aetProcesses, setDraft };
  const [aetProcessDetail, setAetProcessDetail] = useState<AetProcess | null>(null);
  const [aetFurniture, setAetFurniture] = useState<AetFurniture[]>([]);
  const [aetEquipment, setAetEquipment] = useState<AetEquipment[]>([]);
  const [aetReport, setAetReport] = useState<AetNormativeReport | null>(null);
  const [aetVersionDetail, setAetVersionDetail] = useState<AetVersionDetail | null>(null);
  const [aetVersions, setAetVersions] = useState<AetVersionDetail[]>([]);
  const [aetHistory, setAetHistory] = useState<AetHistoryEntry[]>([]);
  const [aetIntegrations, setAetIntegrations] = useState<AetIntegration[]>([]);
  const [sstDashboard, setSstDashboard] = useState<SstDashboard | null>(null);
  const [sstApr, setSstApr] = useState<SstApr[]>([]);
  const [sstEpi, setSstEpi] = useState<SstEpi[]>([]);
  const [sstEpc, setSstEpc] = useState<SstEpc[]>([]);
  const [sstInspecoes, setSstInspecoes] = useState<SstInspecao[]>([]);
  const [sstAuditorias, setSstAuditorias] = useState<SstAuditoria[]>([]);
  const [sstNc, setSstNc] = useState<SstNc[]>([]);
  const [sstCapa, setSstCapa] = useState<SstCapa[]>([]);
  const [sstTreinamentos, setSstTreinamentos] = useState<SstTreinamento[]>([]);
  const [sstReport, setSstReport] = useState<SstReport | null>(null);
  const [esocialDashboard, setEsocialDashboard] = useState<EsocialDashboard | null>(null);
  const [esocialConfig, setEsocialConfig] = useState<EsocialConfig | null>(null);
  const [esocialEventos, setEsocialEventos] = useState<EsocialEvent[]>([]);
  const [esocialHistory, setEsocialHistory] = useState<EsocialHistoryEntry[]>([]);
  const [complianceDashboard, setComplianceDashboard] = useState<ComplianceDashboard | null>(null);
  const [complianceFontes, setComplianceFontes] = useState<ComplianceFonte[]>([]);
  const [complianceNormas, setComplianceNormas] = useState<ComplianceNorma[]>([]);
  const [complianceNormaVersoes, setComplianceNormaVersoes] = useState<ComplianceNormaVersao[]>([]);
  const [complianceDeteccoes, setComplianceDeteccoes] = useState<ComplianceDeteccao[]>([]);
  const [complianceAlertas, setComplianceAlertas] = useState<ComplianceAlerta[]>([]);
  const [complianceImpactos, setComplianceImpactos] = useState<ComplianceImpacto[]>([]);
  const [complianceSystemImpacts, setComplianceSystemImpacts] = useState<ComplianceSystemImpact[]>([]);
  const [complianceClientImpacts, setComplianceClientImpacts] = useState<ComplianceClientImpact[]>([]);
  const [complianceTasks, setComplianceTasks] = useState<ComplianceAdequationTask[]>([]);
  const [complianceSchedule, setComplianceSchedule] = useState<ComplianceSchedule | null>(null);
  const [complianceVersionCompare, setComplianceVersionCompare] = useState<ComplianceVersionCompare | null>(null);
  const [complianceReports, setComplianceReports] = useState<ComplianceReportSummary[]>([]);
  const [orgTree, setOrgTree] = useState<OrgTree | null>(null);

  useEffect(() => {
    setApiAuthSession(stored.session);
  }, [stored.session]);

  useEffect(() => {
    if (dbConnected && stored.session) {
      void apiRestoreSession();
    }
  }, [dbConnected, stored.session]);

  useEffect(() => {
    persist(stored);
  }, [stored]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === stored.selectedCompanyId) ?? companies[0] ?? COMPANIES[0],
    [companies, stored.selectedCompanyId],
  );

  const currentAnalysis = useMemo(
    () => stored.analyses.find((a) => a.id === currentAnalysisId) ?? null,
    [stored.analyses, currentAnalysisId],
  );

  const pendingSync = useMemo(
    () => stored.analyses.filter((a) => !a.synced).length,
    [stored.analyses],
  );

  const showToast = useCallback((msg: string, type: '' | 'success' | 'info' | 'warn' = '') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const loadTenantData = useCallback(
    async (tenantId: string) => {
      if (!dbConnected) return;
      try {
        const bundle = await fetchTenantDataBundle(tenantId);
        applyTenantDataBundle(
          bundle,
          {
            setRiskInventory,
            setRiskInventorySummary,
            setGroDashboard,
            setGroWorkflow,
            setGroActionPlans,
            setGroIndicators,
            setGroHistory,
            setGroReports,
            setPgrProgram,
            setPgrVersions,
            setPgrHistory,
            setPsicoDashboard,
            setPsicoFatores,
            setPsicoMatriz,
            setPsicoConformity,
            setPsicoActionPlans,
            setPsicoHistory,
            setPsicoTrends,
            setDenunciaDashboard,
            setDenuncias,
            setActiveCriteria,
            setRiskCriteriaMethodologies,
            setCriteriaDocumentation,
            setCriteriaAuditTrail,
            setAetDashboard,
            setAetProcesses,
            setAetFurniture,
            setAetEquipment,
            setSstDashboard,
            setSstApr,
            setSstEpi,
            setSstEpc,
            setSstInspecoes,
            setSstAuditorias,
            setSstNc,
            setSstCapa,
            setSstTreinamentos,
            setEsocialDashboard,
            setEsocialConfig,
            setEsocialEventos,
            setEsocialHistory,
            setComplianceDashboard,
            setComplianceFontes,
            setComplianceNormas,
            setComplianceDeteccoes,
            setComplianceAlertas,
            setComplianceReports,
            setOrgTree,
            setStored,
            setSectors,
            setDraft,
          },
          { repairCollaborator, repairAnalysis },
        );
      } catch (err) {
        console.error('loadTenantData', err);
        showToast('Erro ao carregar dados do PostgreSQL', 'warn');
      }
    },
    [dbConnected, showToast],
  );

  const refreshCollaborators = useCallback(async () => {
    await loadTenantData(stored.selectedCompanyId);
  }, [loadTenantData, stored.selectedCompanyId]);

  const refreshCompanies = useCallback(async () => {
    if (!dbConnected) return;
    try {
      if (stored.session?.roleCode === 'ADMIN_GLOBAL') {
        const meta = await apiGetTenantMetadata();
        setTenantMetadata(meta);
        setCompanies(
          meta.map((t) => ({
            id: t.id,
            name: t.name,
            industry: t.industry,
            icon: t.icon,
            color: t.color as Company['color'],
            active: t.active,
            employees: t.employees,
          })),
        );
      } else {
        const tenants = await apiGetTenants();
        if (tenants.length) setCompanies(tenants as Company[]);
      }
    } catch (err) {
      console.error('refreshCompanies', err);
    }
  }, [dbConnected, stored.session?.roleCode]);

  const isGlobalAdmin = stored.session?.roleCode === 'ADMIN_GLOBAL';
  const isTenantAdmin = stored.session?.roleCode === 'ADMIN_EMPRESA';

  const refreshSupportStatus = useCallback(async () => {
    const tid = stored.session?.tenantId ?? stored.selectedCompanyId;
    if (!dbConnected || !tid || tid === 'ergosense') return;
    try {
      setSupportStatus(await apiGetSupportStatus(tid));
    } catch (err) {
      console.error('refreshSupportStatus', err);
    }
  }, [dbConnected, stored.session?.tenantId, stored.selectedCompanyId]);

  const refreshSupportAudit = useCallback(async () => {
    const tid = stored.session?.tenantId ?? stored.selectedCompanyId;
    if (!dbConnected || !tid) return;
    try {
      setSupportAudit(await apiGetSupportAudit(tid));
    } catch (err) {
      console.error('refreshSupportAudit', err);
    }
  }, [dbConnected, stored.session?.tenantId, stored.selectedCompanyId]);

  const authorizeSupport = useCallback(
    async (duration: '1h' | '24h' | '7d', reason?: string) => {
      const tid = stored.session?.tenantId ?? stored.selectedCompanyId;
      if (!dbConnected || !tid) return false;
      try {
        const status = await apiAuthorizeSupport(tid, duration, reason);
        setSupportStatus(status);
        showToast('Suporte da plataforma autorizado', 'success');
        await refreshSupportAudit();
        return true;
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao autorizar suporte', 'warn');
        return false;
      }
    },
    [dbConnected, refreshSupportAudit, showToast, stored.selectedCompanyId, stored.session?.tenantId],
  );

  const revokeSupport = useCallback(async () => {
    const tid = stored.session?.tenantId ?? stored.selectedCompanyId;
    if (!dbConnected || !tid) return false;
    try {
      await apiRevokeSupport(tid);
      await refreshSupportStatus();
      await refreshSupportAudit();
      showToast('Acesso de suporte revogado', 'success');
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao revogar', 'warn');
      return false;
    }
  }, [dbConnected, refreshSupportAudit, refreshSupportStatus, showToast, stored.selectedCompanyId, stored.session?.tenantId]);

  useEffect(() => {
    void (async () => {
      const ok = await isApiAvailable();
      setDbConnected(ok);
      if (!ok) return;
      try {
        const tenants = await apiGetTenants();
        if (tenants.length) setCompanies(tenants as Company[]);
      } catch (err) {
        console.error('bootstrap tenants', err);
      }
    })();
  }, []);

  const go = useCallback((id: ScreenId, opts?: { instant?: boolean }) => {
    if (opts?.instant) {
      setScreenInstant(true);
      window.setTimeout(() => setScreenInstant(false), 80);
    }
    setScreen(id);
    setMenuOpen(false);
  }, []);

  const showModal = useCallback(
    (title: string, body: string, confirmLabel: string, onConfirm?: () => void) => {
      setModal({ open: true, title, body, confirmLabel, onConfirm: onConfirm ?? null });
    },
    [],
  );

  const closeModal = useCallback(() => {
    setModal((m) => ({ ...m, open: false }));
  }, []);

  const finalizeApiLogin = useCallback(
    async (user: {
      email: string;
      name: string;
      role: string;
      company: string;
      location: string;
      tenantId: string;
    }) => {
      const isAdminGlobal = user.role === 'ADMIN_GLOBAL';
      setStored((s) => ({
        ...s,
        session: {
          email: user.email,
          name: user.name,
          role: profileLabel(user.role),
          roleCode: user.role,
          company: user.company,
          location: user.location,
          tenantId: user.tenantId,
        },
        selectedCompanyId: isAdminGlobal ? s.selectedCompanyId : user.tenantId,
      }));
      setApiAuthSession({
        email: user.email,
        name: user.name,
        role: profileLabel(user.role),
        roleCode: user.role,
        company: user.company,
        location: user.location,
        tenantId: user.tenantId,
      });
      if (isAdminGlobal) {
        await refreshCompanies();
        go('global-admin');
      } else {
        await loadTenantData(user.tenantId);
        go('dashboard');
      }
    },
    [go, loadTenantData, refreshCompanies],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      if (!email.includes('@') || password.length < 8) {
        showToast('Credenciais inválidas', 'warn');
        return false;
      }
      if (dbConnected) {
        try {
          const result = await apiLogin(email, password);
          if ('mfaRequired' in result && result.mfaRequired) {
            return {
              mfaRequired: true as const,
              mfaToken: result.mfaToken,
              email: result.user.email,
              name: result.user.name,
            };
          }
          const success = result as ApiLoginSuccess;
          await finalizeApiLogin(success.user);
          return true;
        } catch {
          showToast('Credenciais inválidas', 'warn');
          return false;
        }
      }
      const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      setStored((s) => ({
        ...s,
        session: {
          email,
          name: name || 'Lucas Andrade',
          role: 'Ergonomista Sênior',
          company: 'Vale S.A.',
          location: 'Carajás',
        },
      }));
      go('company');
      return true;
    },
    [dbConnected, finalizeApiLogin, go, showToast],
  );

  const verifyMfaLogin = useCallback(
    async (mfaToken: string, code: string) => {
      if (!mfaToken || code.trim().length < 6) {
        showToast('Informe o código MFA', 'warn');
        return false;
      }
      try {
        const { user } = await apiMfaVerify(mfaToken, code.trim());
        await finalizeApiLogin(user);
        return true;
      } catch {
        showToast('Código MFA inválido', 'warn');
        return false;
      }
    },
    [finalizeApiLogin, showToast],
  );

  const registerCompany = useCallback(
    async (data: {
      nome: string;
      industria: string;
      adminNome: string;
      adminEmail: string;
      adminPassword: string;
    }) => {
      if (!dbConnected) {
        showToast('Servidor indisponível — inicie a API', 'warn');
        return false;
      }
      try {
        const { tenant } = await apiRegisterCompany(data);
        await refreshCompanies();
        showToast(`Empresa "${tenant.name}" cadastrada! Admin: ${data.adminEmail}`, 'success');
        return true;
      } catch (err) {
        console.error('registerCompany', err);
        showToast(err instanceof Error ? err.message : 'Erro ao cadastrar empresa', 'warn');
        return false;
      }
    },
    [dbConnected, refreshCompanies, showToast],
  );

  const submitAccessRequest = useCallback(
    async (data: { nome: string; email: string; funcao: string; matricula: string }) => {
      if (dbConnected) {
        try {
          await apiSubmitAccessRequest(data);
          return true;
        } catch (err) {
          console.error('submitAccessRequest', err);
          showToast('Erro ao enviar solicitação', 'warn');
          return false;
        }
      }
      return true;
    },
    [dbConnected, showToast],
  );

  const logout = useCallback(() => {
    if (dbConnected) void apiLogout();
    setApiAuthSession(null);
    setGlobalSupportMode(false);
    setRiskInventory([]);
    setRiskInventorySummary(null);
    setGroDashboard(null);
    setGroWorkflow(null);
    setGroActionPlans([]);
    setGroIndicators([]);
    setGroHistory([]);
    setGroReports([]);
    setPgrProgram(null);
    setPgrVersions([]);
    setPgrVersionDetail(null);
    setPgrHistory([]);
    setStored((s) => ({ ...s, session: null }));
    setSupportStatus(null);
    setSupportAudit([]);
    go('splash');
  }, [dbConnected, go]);

  const exitGlobalSupport = useCallback(() => {
    setGlobalSupportMode(false);
    go('global-admin', { instant: true });
    void refreshCompanies();
  }, [go, refreshCompanies]);

  const accessTenantWithSupport = useCallback(
    async (id: string) => {
      if (!isGlobalAdmin) {
        setStored((s) => ({ ...s, selectedCompanyId: id }));
        const company = companies.find((c) => c.id === id) ?? COMPANIES.find((c) => c.id === id);
        showToast(`${company?.name ?? 'Empresa'} selecionada`, 'success');
        await loadTenantData(id);
        go('dashboard');
        return true;
      }
      const meta = tenantMetadata.find((t) => t.id === id);
      if (!meta?.supportActive) {
        showToast('Acesso não autorizado pelo administrador da empresa.', 'warn');
        return false;
      }
      setStored((s) => ({ ...s, selectedCompanyId: id }));
      try {
        await loadTenantData(id);
        setGlobalSupportMode(true);
        go('dashboard', { instant: true });
        showToast(`Suporte: ${meta.name}`, 'info');
        return true;
      } catch {
        showToast('Erro ao carregar ambiente do tenant', 'warn');
        return false;
      }
    },
    [companies, go, isGlobalAdmin, loadTenantData, showToast, tenantMetadata],
  );

  const selectCompany = useCallback(
    (id: string) => {
      if (isGlobalAdmin) {
        void accessTenantWithSupport(id);
        return;
      }
      setStored((s) => ({ ...s, selectedCompanyId: id }));
      const company = companies.find((c) => c.id === id) ?? COMPANIES.find((c) => c.id === id);
      showToast(`${company?.name ?? 'Empresa'} selecionada`, 'success');
      void loadTenantData(id);
      go('dashboard');
    },
    [accessTenantWithSupport, companies, go, isGlobalAdmin, loadTenantData, showToast],
  );

  const saveCollaborator = useCollaboratorActions({
    dbConnected,
    selectedCompanyId: stored.selectedCompanyId,
    setStored,
    go,
    showToast,
    loadTenantData,
  });

  const captureAnalysis = useCallback(
    (
      angles: JointAngles,
      workstation?: WorkstationMetrics,
      captureImage?: string,
      recordingSecs?: number,
      postureDuration?: { maxRiskStreakSecs: number; totalRiskSecs: number },
    sessionMeta?: {
      nr17Report?: ReturnType<typeof buildNr17SessionReport>;
      sessionSampleCount?: number;
      autoGenerateReport?: boolean;
      /** Distância final da câmera (ref da sessão) */
      measuredDistanceCm?: number;
    },
    videoBlob?: Blob | null,
    ) => {
      const collab = stored.collaborators.find((c) => c.id === analysisDraft.collaboratorId);
      if (!collab) {
        showToast('Selecione um colaborador', 'warn');
        return;
      }

      const ws = workstation ?? liveWorkstation;
      const ctx = analysisDraft.activityContext;
      const estimate = analysisDraft.loadAssessment?.estimate;
      const manualInput = {
        ...DEFAULT_LOAD_MANUAL_INPUT,
        ...analysisDraft.loadAssessment?.manual,
      };
      const effortFromManual = manualInput.effortResult;

      if ((!manualInput.measuredDistanceCm || manualInput.measuredDistanceCm <= 0) && effortFromManual?.distanceCm) {
        manualInput.measuredDistanceCm = effortFromManual.distanceCm;
      }
      if ((!manualInput.measuredDistanceCm || manualInput.measuredDistanceCm <= 0) && sessionMeta?.measuredDistanceCm) {
        manualInput.measuredDistanceCm = sessionMeta.measuredDistanceCm;
      }
      if ((!manualInput.measuredDistanceCm || manualInput.measuredDistanceCm <= 0) && estimate?.distanceCm) {
        manualInput.measuredDistanceCm = estimate.distanceCm;
      }

      const loadParams =
        normalizeLoadParams(manualInput, estimate, recordingSecs) ?? undefined;
      const evaluation = evaluateErgonomicSession({
        angles,
        workstation: ws,
        activityContext: ctx,
        loadParams: loadParams ?? null,
      });
      const { loadResult, combinedScore: postureScore, risk: postureRisk, rula, reba } = evaluation;
      const effort = effortFromManual;
      let score = postureScore;
      let risk = postureRisk;
      if (effort && manualInput.enabled) {
        score = scoreFromEffortRisk(effort.risk);
        risk = effort.risk;
      }
      const loadAssessment: LoadAssessmentSnapshot | undefined = buildLoadAssessmentSnapshot(
        manualInput,
        loadParams ?? null,
        loadResult ?? undefined,
        estimate,
        effort,
      );

      const anthropometry =
        collab.heightCm && collab.weightKg
          ? buildAnthropometry(collab.heightCm, collab.weightKg, collab.sex ?? 'M', collab.age ?? 30)
          : null;

      const distances = [];
      if (loadParams?.distanceCm) {
        distances.push(
          measureWithArFallback('carga', loadParams.distanceCm, sessionMeta?.measuredDistanceCm),
        );
      }
      if (ws?.telaDistanciaCm) {
        distances.push(createDistanceMeasurement('monitor', ws.telaDistanciaCm, 'monocular', 0.7));
      }

      const v2Report = runSessionMethods({
        angles,
        loadParams: loadParams ?? null,
        workstation: ws,
        anthropometry,
        environmental: analysisDraft.environmental,
        exposureSecs: recordingSecs,
        distances,
        sex: collab.sex ?? 'M',
        videoFrameCount: sessionMeta?.sessionSampleCount,
      });

      const nioshMethod = v2Report.methods.find((m) => m.methodId === 'niosh');
      const nioshLi = nioshMethod?.outputs?.LI != null ? Number(nioshMethod.outputs.LI) : null;

      const nr17Report =
        sessionMeta?.nr17Report ??
        buildNr17SessionReport({
          angles,
          workstation: ws,
          sessionDurationSecs: recordingSecs ?? 0,
          sampleCount: sessionMeta?.sessionSampleCount ?? 0,
          maxRiskStreakSecs: postureDuration?.maxRiskStreakSecs ?? 0,
          totalRiskSecs: postureDuration?.totalRiskSecs ?? 0,
          activityContext: ctx,
          activity: analysisDraft.activity,
          loadResult: loadResult ?? null,
          loadEffort: effort ?? null,
          rula,
          reba,
          nioshLi,
        });

      const company = COMPANIES.find((c) => c.id === stored.selectedCompanyId);
      const traceability = buildAssessmentTraceability({
        session: stored.session,
        companyId: stored.selectedCompanyId,
        companyName: company?.name ?? stored.session?.company ?? '—',
        setor: analysisDraft.setor,
        atividade: analysisDraft.activity,
        activityContext: ctx,
        date: formatDateBR(),
        time: formatTimeBR(),
      });

      const assessmentAuditLog = buildAssessmentAuditLog({
        traceability,
        durationSecs: recordingSecs ?? 0,
        sampleCount: sessionMeta?.sessionSampleCount ?? 0,
        angles,
        workstation: ws,
        environmental: analysisDraft.environmental,
        loadParams: loadParams ?? null,
        loadEffort: effort ?? null,
        captureImage,
      });

      const aepDocument = buildAepDocument({
        analysis: {
          id: '',
          collaboratorId: collab.id,
          collaboratorName: collab.name,
          setor: analysisDraft.setor,
          activity: analysisDraft.activity,
          activityContext: ctx,
          date: formatDateBR(),
          time: formatTimeBR(),
          score,
          risk,
          rula,
          reba,
          angles,
          mode: stored.analysisMode,
          synced: false,
          icon: collab.icon,
          iconBg: collab.iconBg,
          nr17Report,
          recordingSecs,
          workstation: ws,
          loadEffort: effort,
          v2Report,
        },
        traceability,
        indices: nr17Report.ergoIndices,
        samplingConfidence: nr17Report.samplingConfidence,
        methods: v2Report.methods,
      });

      const aetDocument = buildAetDocument(aepDocument, { captureImage, v2Report });

      const localVideoUrl = videoBlob ? createLocalVideoUrl(videoBlob) : undefined;

      const analysis: Analysis = {
        id: `a-${Date.now()}`,
        collaboratorId: collab.id,
        collaboratorName: collab.name,
        setor: analysisDraft.setor,
        activity: analysisDraft.activity,
        activityContext: ctx,
        notes: analysisDraft.notes,
        date: formatDateBR(),
        time: formatTimeBR(),
        score,
        risk,
        rula,
        reba,
        angles,
        workstation: ws,
        loadAssessment,
        loadParams,
        loadResult: loadResult ?? undefined,
        loadEstimate: estimate,
        loadManual: manualInput,
        loadEffort: effort,
        mode: stored.analysisMode,
        synced: stored.analysisMode === 'complete',
        icon: collab.icon,
        iconBg: collab.iconBg,
        captureImage,
        hasVideoRecording: Boolean(videoBlob),
        localVideoUrl,
        videoFormat: videoBlob?.type?.includes('mp4') ? 'mp4' : videoBlob ? 'webm' : undefined,
        recordingSecs,
        maxRiskStreakSecs: postureDuration?.maxRiskStreakSecs,
        totalRiskSecs: postureDuration?.totalRiskSecs,
        nr17Report,
        sessionSampleCount: sessionMeta?.sessionSampleCount,
        v2Report,
        environmental: analysisDraft.environmental,
        traceability,
        assessmentAuditLog,
        aepDocument,
        aetDocument,
      };

      logAnalysisAudit(stored.session?.email ?? 'local', stored.selectedCompanyId, analysis.id, 'create');

      const newReport: Report | null =
        sessionMeta?.autoGenerateReport !== false
          ? {
              id: `r-${Date.now()}`,
              title: `NR-17 · ${collab.name}`,
              subtitle: `${formatDateBR()} · IECI ${nr17Report.ergoIndices.internalConformityIndex} · ${nr17Report.overallStatus === 'conforme' ? 'Conforme' : nr17Report.overallStatus === 'atencao' ? 'Atenção' : 'Não conforme'}`,
              size: '2.1 MB',
              status: 'ready',
              type: 'NR17',
              analysisId: analysis.id,
            }
          : null;

      setStored((s) => ({
        ...s,
        analyses: [analysis, ...s.analyses],
        collaborators: s.collaborators.map((c) =>
          c.id === collab.id ? { ...c, risk } : c,
        ),
        reports: newReport ? [newReport, ...s.reports] : s.reports,
      }));
      setCurrentAnalysisId(analysis.id);
      setResultDetailsRevealed(false);

      if (newReport) {
        showToast('Sessão concluída · visualize o resultado', 'success');
      } else {
        showToast('Captura processada · Analisando postura...', 'info');
      }
      setTimeout(() => go('result'), 600);

      if (dbConnected) {
        void (async () => {
          try {
            const videoRecording = videoBlob
              ? await blobToVideoRecording(videoBlob, recordingSecs)
              : undefined;
            const { id } = await apiSaveAnalysis(stored.selectedCompanyId, {
              ...analysis,
              collaboratorName: collab.name,
              reportId: newReport?.id,
              videoRecording,
            });
            setStored((s) => ({
              ...s,
              analyses: s.analyses.map((a) =>
                a.id === analysis.id ? { ...a, id, synced: true } : a,
              ),
            }));
            setCurrentAnalysisId(id);
          } catch (err) {
            console.error('apiSaveAnalysis', err);
          }
        })();
      }
    },
    [analysisDraft, dbConnected, go, showToast, stored.analysisMode, stored.collaborators, stored.selectedCompanyId, stored.session, liveWorkstation],
  );

  const captureVideoAnalysis = useCallback(
    (
      videoReport: import('../types/videoErgo').VideoErgonomicReport,
      collaboratorId: string,
      source: 'live' | 'upload' | 'offline_sync',
      videoBlob?: Blob | null,
    ) => {
      const collab = stored.collaborators.find((c) => c.id === collaboratorId);
      if (!collab) {
        showToast('Colaborador não encontrado', 'warn');
        return;
      }

      const angles = videoReport.worstAngles;
      const ws = liveWorkstation;
      const ctx = analysisDraft.activityContext;
      const loadParams = normalizeLoadParams(analysisDraft.loadAssessment?.manual, analysisDraft.loadAssessment?.estimate) ?? undefined;

      const evaluation = evaluateErgonomicSession({
        angles,
        workstation: ws,
        activityContext: ctx,
        loadParams: loadParams ?? null,
      });
      const { loadResult, combinedScore, risk, rula, reba } = evaluation;

      const v2Report = runSessionMethods({
        angles,
        loadParams: loadParams ?? null,
        workstation: ws,
        exposureSecs: videoReport.durationSecs,
        videoFrameCount: videoReport.frameCount,
      });

      v2Report.videoErgonomicReport = videoReport;
      v2Report.videoSummary = {
        frameCount: videoReport.frameCount,
        durationSecs: videoReport.durationSecs,
        worstAngles: angles,
        repetitionEstimate: videoReport.repetitiveMovement.movementsPerMinute,
        exposureRiskSecs: videoReport.exposureByRegion.reduce((s, e) => s + (e.exposurePct / 100) * videoReport.durationSecs, 0),
        methods: videoReport.methods.slice(0, 8),
        postureModes: videoReport.postureModes,
      };

      const nioshMethod = videoReport.methods.find((m) => m.methodId === 'niosh');
      const nioshLi = nioshMethod?.outputs?.LI != null ? Number(nioshMethod.outputs.LI) : null;

      const nr17Report = buildNr17SessionReport({
        angles,
        workstation: ws,
        sessionDurationSecs: videoReport.durationSecs,
        sampleCount: videoReport.frameCount,
        maxRiskStreakSecs: 0,
        totalRiskSecs: Math.round(videoReport.exposureByRegion.reduce((s, e) => s + (e.exposurePct / 100) * videoReport.durationSecs, 0)),
        activityContext: ctx,
        activity: analysisDraft.activity || 'Análise por vídeo',
        loadResult: loadResult ?? null,
        loadEffort: null,
        rula,
        reba,
        nioshLi,
      });

      const company = COMPANIES.find((c) => c.id === stored.selectedCompanyId);
      const traceability = buildAssessmentTraceability({
        session: stored.session,
        companyId: stored.selectedCompanyId,
        companyName: company?.name ?? stored.session?.company ?? '—',
        setor: collab.setor,
        atividade: analysisDraft.activity || 'Análise por vídeo',
        activityContext: ctx,
        date: formatDateBR(),
        time: formatTimeBR(),
      });

      const analysis: Analysis = {
        id: `a-vid-${Date.now()}`,
        collaboratorId: collab.id,
        collaboratorName: collab.name,
        setor: collab.setor,
        activity: analysisDraft.activity || 'Análise ergonômica por vídeo',
        activityContext: ctx,
        notes: `Fonte: ${source} · ${videoReport.frameCount} frames · Modelo: ${videoReport.modelVersion}`,
        date: formatDateBR(),
        time: formatTimeBR(),
        score: combinedScore,
        risk,
        rula,
        reba,
        angles,
        workstation: ws,
        loadParams,
        loadResult: loadResult ?? undefined,
        mode: stored.analysisMode,
        synced: false,
        icon: collab.icon,
        iconBg: collab.iconBg,
        captureImage: videoReport.captureThumbnail,
        hasVideoRecording: Boolean(videoBlob),
        localVideoUrl: videoBlob ? createLocalVideoUrl(videoBlob) : undefined,
        videoFormat: videoBlob?.type?.includes('mp4') ? 'mp4' : videoBlob ? 'webm' : undefined,
        recordingSecs: videoReport.durationSecs,
        nr17Report,
        sessionSampleCount: videoReport.frameCount,
        v2Report,
        traceability,
      };

      const newReport: Report = {
        id: `r-vid-${Date.now()}`,
        title: `Vídeo · ${collab.name}`,
        subtitle: `${formatDateBR()} · IE ${videoReport.executive.ergonomicIndex} · NR-17 ${videoReport.executive.nr17CompliancePct}%`,
        size: '3.2 MB',
        status: 'ready',
        type: 'NR17',
        analysisId: analysis.id,
      };

      setStored((s) => ({
        ...s,
        analyses: [analysis, ...s.analyses],
        collaborators: s.collaborators.map((c) => (c.id === collab.id ? { ...c, risk } : c)),
        reports: [newReport, ...s.reports],
      }));
      setCurrentAnalysisId(analysis.id);
      showToast('Análise por vídeo salva', 'success');

      if (dbConnected) {
        void (async () => {
          try {
            const videoRecording = videoBlob
              ? await blobToVideoRecording(videoBlob, videoReport.durationSecs)
              : undefined;
            const { id } = await apiSaveAnalysis(stored.selectedCompanyId, {
              ...analysis,
              collaboratorName: collab.name,
              reportId: newReport.id,
              v2Report,
              videoRecording,
            });
            setStored((s) => ({
              ...s,
              analyses: s.analyses.map((a) => (a.id === analysis.id ? { ...a, id, synced: true } : a)),
            }));
            setCurrentAnalysisId(id);
          } catch (err) {
            console.error('apiSaveAnalysis video', err);
          }
        })();
      }
    },
    [analysisDraft, dbConnected, liveWorkstation, showToast, stored.collaborators, stored.analysisMode, stored.selectedCompanyId, stored.session],
  );

  const startSync = useCallback(() => {
    const count = stored.analyses.filter((a) => !a.synced).length;
    if (count === 0) {
      showToast('Nada para sincronizar', 'info');
      return;
    }
    showToast(`Sincronizando ${count} análises...`, 'info');
    setTimeout(() => {
      setStored((s) => ({
        ...s,
        analyses: s.analyses.map((a) => ({ ...a, synced: true })),
      }));
      showToast('Sincronização concluída!', 'success');
    }, 3000);
  }, [showToast, stored.analyses]);

  const planTier = useMemo((): PlanTier => {
    const meta = tenantMetadata.find((t) => t.id === stored.selectedCompanyId);
    return planTierFromName(meta?.plan);
  }, [tenantMetadata, stored.selectedCompanyId]);

  const canExportPdf = canExportFullPdf(planTier);

  const exportCurrentAnalysisPdf = useCallback(() => {
    const analysis = currentAnalysis;
    if (!analysis) {
      showToast('Nenhuma análise disponível para exportar', 'warn');
      return;
    }
    if (!canExportPdf) {
      showToast('Exportação PDF completa disponível no plano Profissional', 'warn');
      return;
    }
    void (async () => {
      try {
        const filename = await exportAnalysisPdf(analysisWithNr17Report(analysis), {
          companyName: selectedCompany.name,
          evaluatorName: stored.session?.name,
          evaluatorRole: stored.session?.role,
          includeSignatureBlock: true,
        });
        showToast(`Relatório PDF baixado: ${filename}`, 'success');
        setOfferPdfDownload(false);
      } catch (err) {
        console.error('exportCurrentAnalysisPdf', err);
        showToast('Erro ao exportar PDF', 'warn');
      }
    })();
  }, [canExportPdf, currentAnalysis, selectedCompany.name, showToast, stored.session]);

  const applyLoadEffortToCurrentAnalysis = useCallback(
    (
      effort: import('../utils/calculateErgonomicLoadRisk').LoadEffortResult,
      weightKg: number,
      distanceCm: number,
    ) => {
      if (!currentAnalysisId) return;
      setStored((s) => {
        const target = s.analyses.find((a) => a.id === currentAnalysisId);
        if (!target) return s;
        const baseManual = target.loadManual ?? target.loadAssessment?.manual ?? DEFAULT_LOAD_MANUAL_INPUT;
        const manual = {
          ...baseManual,
          enabled: true,
          weightKg,
          measuredDistanceCm: distanceCm,
          effortResult: effort,
        };
        const loadAssessment = buildLoadAssessmentSnapshot(
          manual,
          target.loadParams ?? target.loadAssessment?.params ?? null,
          target.loadResult ?? target.loadAssessment?.result,
          target.loadEstimate ?? target.loadAssessment?.estimate,
          effort,
        );
        const nr17Report = buildNr17SessionReport({
          angles: target.angles,
          workstation: target.workstation,
          sessionDurationSecs: target.recordingSecs ?? 0,
          sampleCount: target.sessionSampleCount ?? 0,
          maxRiskStreakSecs: target.maxRiskStreakSecs ?? 0,
          totalRiskSecs: target.totalRiskSecs ?? 0,
          activityContext: target.activityContext ?? 'campo',
          activity: target.activity,
          loadResult: target.loadResult ?? target.loadAssessment?.result ?? null,
          loadEffort: effort,
          rula: target.rula,
          reba: target.reba,
        });
        const patched: Analysis = {
          ...target,
          loadEffort: effort,
          loadManual: manual,
          loadAssessment,
          score: scoreFromEffortRisk(effort.risk),
          risk: effort.risk,
          nr17Report,
        };
        return {
          ...s,
          analyses: s.analyses.map((a) => (a.id === currentAnalysisId ? patched : a)),
          collaborators: s.collaborators.map((c) =>
            c.id === target.collaboratorId ? { ...c, risk: effort.risk } : c,
          ),
        };
      });
      showToast('Relatório atualizado com peso e distância', 'success');
    },
    [currentAnalysisId, showToast],
  );

  const exportCurrentCaptureImage = useCallback(() => {
    const analysis = currentAnalysis;
    if (!analysis?.captureImage) {
      showToast('Nenhuma imagem capturada nesta análise', 'warn');
      return;
    }
    const filename = exportCaptureImage(analysis);
    if (filename) showToast(`Imagem exportada: ${filename}`, 'success');
  }, [currentAnalysis, showToast]);

  const generateReport = useCallback(() => {
    exportCurrentAnalysisPdf();
  }, [exportCurrentAnalysisPdf]);

  const clearPdfDownloadOffer = useCallback(() => setOfferPdfDownload(false), []);

  const exportReportPdf = useCallback(
    (reportId: string) => {
      const report = stored.reports.find((r) => r.id === reportId);
      if (!report) {
        showToast('Relatório não encontrado', 'warn');
        return;
      }
      const analysis = report.analysisId
        ? stored.analyses.find((a) => a.id === report.analysisId)
        : stored.analyses.find((a) => a.nr17Report) ?? stored.analyses[0];
      if (!analysis) {
        showToast('Análise vinculada não encontrada', 'warn');
        return;
      }
      if (!canExportPdf) {
        showToast('Exportação PDF disponível no plano Profissional', 'warn');
        return;
      }
      void (async () => {
        try {
          const filename = await exportAnalysisPdf(analysisWithNr17Report(analysis), {
            companyName: selectedCompany.name,
            evaluatorName: stored.session?.name,
            evaluatorRole: stored.session?.role,
          });
          showToast(`PDF baixado: ${filename}`, 'success');
        } catch (err) {
          console.error('exportReportPdf', err);
          showToast('Erro ao exportar PDF', 'warn');
        }
      })();
    },
    [canExportPdf, selectedCompany.name, showToast, stored.reports, stored.analyses, stored.session],
  );

  const deleteAnalysis = useCallback(
    (id: string) => {
      const analysis = stored.analyses.find((a) => a.id === id);
      if (!analysis) {
        showToast('Análise não encontrada', 'warn');
        return;
      }
      showModal(
        'Excluir análise',
        `Deseja excluir a análise de ${analysis.setor} (${analysis.date} · ${analysis.time})? Esta ação não pode ser desfeita.`,
        'Excluir',
        () => {
          setStored((s) => ({
            ...s,
            analyses: s.analyses.filter((a) => a.id !== id),
            reports: s.reports.filter((r) => r.analysisId !== id),
          }));
          if (currentAnalysisId === id) {
            setCurrentAnalysisId(null);
            setResultDetailsRevealed(false);
            go('history');
          }
          showToast('Análise excluída', 'success');
          if (dbConnected && /^\d+$/.test(id)) {
            void apiDeleteAnalysis(stored.selectedCompanyId, id).catch((err) => {
              console.error('deleteAnalysis', err);
              showToast('Erro ao excluir no servidor', 'warn');
            });
          }
        },
      );
    },
    [currentAnalysisId, dbConnected, go, showModal, showToast, stored.analyses, stored.selectedCompanyId],
  );

  const setRiskInventoryDraft = useCallback((patch: Partial<RiskInventoryFormData & { id?: string }>) => {
    setRiskInventoryDraftState((d) => ({ ...d, ...patch }));
  }, []);

  const refreshRiskInventory = useCallback(async () => {
    const tenantId = stored.selectedCompanyId;
    if (!dbConnected || !tenantId) return;
    try {
      const [risks, summary] = await Promise.all([
        apiGetRiskInventory(tenantId),
        apiGetRiskInventorySummary(tenantId),
      ]);
      setRiskInventory(risks);
      setRiskInventorySummary(summary);
    } catch (err) {
      console.error('refreshRiskInventory', err);
      showToast('Erro ao carregar inventário de riscos', 'warn');
    }
  }, [dbConnected, showToast, stored.selectedCompanyId]);

  const openRiskForm = useCallback(
    (item?: RiskInventoryItem) => {
      if (item) {
        setRiskInventoryDraftState({
          id: item.id,
          type: item.type,
          sectorName: item.sectorName ?? '',
          collaboratorId: item.collaboratorId ?? '',
          workPostId: item.workPostId ?? '',
          generatingSource: item.generatingSource,
          hazard: item.hazard,
          consequence: item.consequence,
          probability: item.probability,
          severity: item.severity,
          exposureDuration: item.exposureDuration ?? '',
          exposureFrequency: item.exposureFrequency ?? 'Contínua / diária',
          exposureIntensity: item.exposureIntensity ?? '',
          exposedWorkersCount: item.exposedWorkersCount ?? 1,
          homogeneousExposureGroup: item.homogeneousExposureGroup ?? '',
          existingMeasures: item.existingMeasures ?? '',
          controlMeasures: item.controlMeasures,
          evidences: item.evidences ?? [],
          analysisId: item.analysisId ?? '',
          aetProcessId: item.aetProcessId ?? '',
          responsible: item.responsible,
          reviewDate: item.reviewDate ?? '',
          status: item.status,
        });
      } else {
        setRiskInventoryDraftState({ ...EMPTY_RISK_FORM });
      }
      go('inventario-form');
    },
    [go],
  );

  const saveRiskInventory = useCallback(async () => {
    if (!dbConnected) {
      showToast('API indisponível', 'warn');
      return;
    }
    const tenantId = stored.selectedCompanyId;
    try {
      const saved = await apiSaveRiskInventory(tenantId, riskInventoryDraft);
      await refreshRiskInventory();
      showToast(riskInventoryDraft.id ? 'Risco atualizado' : 'Risco cadastrado', 'success');
      setRiskInventoryDraftState({ ...EMPTY_RISK_FORM });
      go('inventario-lista');
      void saved;
    } catch (err) {
      console.error('saveRiskInventory', err);
      showToast(err instanceof Error ? err.message : 'Erro ao salvar risco', 'warn');
    }
  }, [dbConnected, go, refreshRiskInventory, riskInventoryDraft, showToast, stored.selectedCompanyId]);

  const deleteRiskInventory = useCallback(
    (id: string) => {
      showModal('Excluir risco', 'Remover este item do inventário NR-01?', 'Excluir', () => {
        void (async () => {
          if (!dbConnected) return;
          try {
            await apiDeleteRiskInventory(stored.selectedCompanyId, id);
            await refreshRiskInventory();
            showToast('Risco excluído', 'success');
          } catch (err) {
            console.error('deleteRiskInventory', err);
            showToast('Erro ao excluir risco', 'warn');
          }
        })();
      });
    },
    [dbConnected, refreshRiskInventory, showModal, showToast, stored.selectedCompanyId],
  );

  const setDenunciaDraft = useCallback((patch: Partial<DenunciaFormData>) => {
    setDenunciaDraftState((d) => ({ ...d, ...patch }));
  }, []);

  const refreshDenuncias = useCallback(async () => {
    const tenantId = stored.selectedCompanyId;
    if (!dbConnected || !tenantId) return;
    try {
      const [dash, list] = await Promise.all([
        apiGetDenunciaDashboard(tenantId),
        apiGetDenuncias(tenantId),
      ]);
      setDenunciaDashboard(dash);
      setDenuncias(list);
    } catch (err) {
      console.error('refreshDenuncias', err);
    }
  }, [dbConnected, stored.selectedCompanyId]);

  const refreshRiskCriteria = useCallback(async () => {
    const tenantId = stored.selectedCompanyId;
    if (!dbConnected || !tenantId) return;
    try {
      const [active, methods, doc, audit] = await Promise.all([
        apiGetActiveCriteria(tenantId),
        apiFetchCriteriaMethodologies(tenantId),
        apiGetCriteriaDocumentation(tenantId),
        apiFetchCriteriaAudit(tenantId),
      ]);
      setActiveCriteria(active);
      setRiskCriteriaMethodologies(methods);
      setCriteriaDocumentation(doc);
      setCriteriaAuditTrail(audit);
    } catch (err) {
      console.error('refreshRiskCriteria', err);
    }
  }, [dbConnected, stored.selectedCompanyId]);

  const createRiskMethodology = useCallback(
    async (data: { name: string; matrixType: string; activate?: boolean }) => {
      const tenantId = stored.selectedCompanyId;
      if (!dbConnected || !tenantId) return;
      await apiCreateCriteriaMethodology(tenantId, data);
      await refreshRiskCriteria();
    },
    [dbConnected, refreshRiskCriteria, stored.selectedCompanyId],
  );

  const activateCriteriaVersion = useCallback(
    async (methodologyId: string, versionId: string) => {
      const tenantId = stored.selectedCompanyId;
      if (!dbConnected || !tenantId) return;
      await apiActivateCriteriaVersion(tenantId, methodologyId, versionId);
      await refreshRiskCriteria();
      await refreshRiskInventory();
    },
    [dbConnected, refreshRiskCriteria, refreshRiskInventory, stored.selectedCompanyId],
  );

  const submitDenuncia = useCallback(async () => {
    if (!dbConnected) {
      showToast('API indisponível', 'warn');
      return null;
    }
    const tenantId = stored.selectedCompanyId;
    try {
      const created = await apiCreateDenuncia(tenantId, denunciaDraft);
      await refreshDenuncias();
      showToast(`Denúncia registrada — ${created.protocol}`, 'success');
      setDenunciaDraftState({ ...EMPTY_DENUNCIA_FORM });
      return created;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao registrar denúncia', 'warn');
      return null;
    }
  }, [dbConnected, denunciaDraft, refreshDenuncias, showToast, stored.selectedCompanyId]);

  const openDenunciaDetail = useCallback(
    async (id: string) => {
      if (!dbConnected) return;
      try {
        const detail = await apiGetDenuncia(stored.selectedCompanyId, id);
        setDenunciaDetail(detail);
        go('denuncia-detalhe');
      } catch (err) {
        showToast('Erro ao carregar denúncia', 'warn');
        console.error('openDenunciaDetail', err);
      }
    },
    [dbConnected, go, showToast, stored.selectedCompanyId],
  );

  const updateDenunciaStatus = useCallback(
    async (status: DenunciaItem['status']) => {
      if (!denunciaDetail || !dbConnected) return;
      try {
        const updated = await apiUpdateDenunciaStatus(stored.selectedCompanyId, denunciaDetail.id, status);
        setDenunciaDetail(updated);
        await refreshDenuncias();
        showToast('Status atualizado', 'success');
      } catch {
        showToast('Erro ao atualizar status', 'warn');
      }
    },
    [dbConnected, denunciaDetail, refreshDenuncias, showToast, stored.selectedCompanyId],
  );

  const addDenunciaTreatment = useCallback(
    async (description: string) => {
      if (!denunciaDetail || !description.trim()) return;
      try {
        const updated = await apiAddDenunciaTreatment(stored.selectedCompanyId, denunciaDetail.id, {
          type: 'INVESTIGACAO',
          description: description.trim(),
        });
        setDenunciaDetail(updated);
        showToast('Tratativa registrada', 'success');
      } catch {
        showToast('Erro ao registrar tratativa', 'warn');
      }
    },
    [denunciaDetail, showToast, stored.selectedCompanyId],
  );

  const addDenunciaEvidence = useCallback(
    async (description: string) => {
      if (!denunciaDetail || !description.trim()) return;
      try {
        const updated = await apiAddDenunciaEvidence(stored.selectedCompanyId, denunciaDetail.id, {
          description: description.trim(),
        });
        setDenunciaDetail(updated);
        showToast('Evidência registrada', 'success');
      } catch {
        showToast('Erro ao registrar evidência', 'warn');
      }
    },
    [denunciaDetail, showToast, stored.selectedCompanyId],
  );

  const integrateDenuncia = useCallback(async () => {
    if (!denunciaDetail) return;
    try {
      const { denuncia } = await apiIntegrateDenuncia(stored.selectedCompanyId, denunciaDetail.id);
      setDenunciaDetail(denuncia);
      await refreshDenuncias();
      await refreshRiskInventory();
      showToast('Integrado ao Inventário · GRO · PGR · Psicossocial', 'success');
    } catch {
      showToast('Erro na integração NR-01', 'warn');
    }
  }, [denunciaDetail, refreshDenuncias, refreshRiskInventory, showToast, stored.selectedCompanyId]);

  const concludeDenuncia = useCallback(
    async (conclusion: string) => {
      if (!denunciaDetail) return;
      try {
        const updated = await apiConcludeDenuncia(stored.selectedCompanyId, denunciaDetail.id, conclusion);
        setDenunciaDetail(updated);
        await refreshDenuncias();
        showToast('Denúncia concluída', 'success');
      } catch {
        showToast('Erro ao concluir', 'warn');
      }
    },
    [denunciaDetail, refreshDenuncias, showToast, stored.selectedCompanyId],
  );

  const setGroActionPlanDraft = useCallback((draft: GroActionPlanForm | null) => {
    setGroActionPlanDraftState(draft);
  }, []);

  const setGroIndicatorDraft = useCallback((draft: GroIndicatorForm | null) => {
    setGroIndicatorDraftState(draft);
  }, []);

  const refreshGroData = useCallback(async () => {
    const tenantId = stored.selectedCompanyId;
    if (!dbConnected || !tenantId) return;
    try {
      const [dash, wf, plans, inds, hist, reps, riskSum] = await Promise.all([
        apiGetGroDashboard(tenantId),
        apiGetGroWorkflow(tenantId),
        apiGetGroActionPlans(tenantId),
        apiGetGroIndicators(tenantId),
        apiGetGroHistory(tenantId),
        apiGetGroReports(tenantId),
        apiGetRiskInventorySummary(tenantId).catch(() => null),
      ]);
      setGroDashboard(dash);
      setGroWorkflow(wf);
      setGroActionPlans(plans);
      setGroIndicators(inds);
      setGroHistory(hist);
      setGroReports(reps);
      if (riskSum) setRiskInventorySummary(riskSum);
      const risks = await apiGetRiskInventory(tenantId);
      setRiskInventory(risks);
    } catch (err) {
      console.error('refreshGroData', err);
      showToast('Erro ao carregar dados GRO', 'warn');
    }
  }, [dbConnected, showToast, stored.selectedCompanyId]);

  const openGroActionPlanForm = useCallback((item?: GroActionPlan) => {
    if (item) {
      setGroActionPlanDraftState({
        id: item.id,
        riskId: item.riskId,
        description: item.description,
        controlType: item.controlType,
        responsible: item.responsible,
        dueDate: item.dueDate ?? '',
        status: item.status,
        evidence: item.evidence,
      });
    } else {
      setGroActionPlanDraftState({ ...EMPTY_ACTION_PLAN_FORM, riskId: riskInventory[0]?.id ?? '' });
    }
  }, [riskInventory]);

  const openGroIndicatorForm = useCallback((item?: GroIndicator) => {
    if (item) {
      setGroIndicatorDraftState({
        id: item.id,
        riskId: item.riskId ?? '',
        name: item.name,
        type: item.type,
        target: item.target != null ? String(item.target) : '',
        currentValue: item.currentValue != null ? String(item.currentValue) : '',
        unit: item.unit,
        frequency: item.frequency,
        lastMeasurement: item.lastMeasurement ?? '',
        nextMeasurement: item.nextMeasurement ?? '',
        notes: item.notes,
      });
    } else {
      setGroIndicatorDraftState({ ...EMPTY_INDICATOR_FORM, riskId: riskInventory[0]?.id ?? '' });
    }
  }, [riskInventory]);

  const saveGroActionPlan = useCallback(async () => {
    if (!groActionPlanDraft || !dbConnected) return;
    if (!groActionPlanDraft.riskId || !groActionPlanDraft.description.trim()) {
      showToast('Informe risco e descrição', 'warn');
      return;
    }
    try {
      await apiSaveGroActionPlan(stored.selectedCompanyId, groActionPlanDraft);
      await refreshGroData();
      setGroActionPlanDraftState(null);
      showToast('Ação salva', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar', 'warn');
    }
  }, [dbConnected, groActionPlanDraft, refreshGroData, showToast, stored.selectedCompanyId]);

  const deleteGroActionPlan = useCallback(
    (id: string) => {
      showModal('Excluir ação', 'Remover esta ação do plano GRO?', 'Excluir', () => {
        void (async () => {
          try {
            await apiDeleteGroActionPlan(stored.selectedCompanyId, id);
            await refreshGroData();
            showToast('Ação excluída', 'success');
          } catch {
            showToast('Erro ao excluir', 'warn');
          }
        })();
      });
    },
    [refreshGroData, showModal, showToast, stored.selectedCompanyId],
  );

  const saveGroIndicator = useCallback(async () => {
    if (!groIndicatorDraft || !dbConnected) return;
    if (!groIndicatorDraft.name.trim()) {
      showToast('Informe o nome do indicador', 'warn');
      return;
    }
    try {
      await apiSaveGroIndicator(stored.selectedCompanyId, groIndicatorDraft);
      await refreshGroData();
      setGroIndicatorDraftState(null);
      showToast('Indicador salvo', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar', 'warn');
    }
  }, [dbConnected, groIndicatorDraft, refreshGroData, showToast, stored.selectedCompanyId]);

  const deleteGroIndicator = useCallback(
    (id: string) => {
      showModal('Excluir indicador', 'Remover este indicador?', 'Excluir', () => {
        void (async () => {
          try {
            await apiDeleteGroIndicator(stored.selectedCompanyId, id);
            await refreshGroData();
            showToast('Indicador excluído', 'success');
          } catch {
            showToast('Erro ao excluir', 'warn');
          }
        })();
      });
    },
    [refreshGroData, showModal, showToast, stored.selectedCompanyId],
  );

  const advanceGroWorkflow = useCallback(
    async (riskId: string) => {
      if (!dbConnected) return;
      try {
        const res = await apiAdvanceGroWorkflow(stored.selectedCompanyId, riskId);
        await refreshGroData();
        showToast(`Etapa: ${res.label}`, 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Não foi possível avançar', 'warn');
      }
    },
    [dbConnected, refreshGroData, showToast, stored.selectedCompanyId],
  );

  const completeGroReview = useCallback(
    async (riskId: string) => {
      if (!dbConnected) return;
      try {
        await apiCompleteGroReview(stored.selectedCompanyId, riskId);
        await refreshGroData();
        showToast('Revisão concluída — retorno ao monitoramento', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro na revisão', 'warn');
      }
    },
    [dbConnected, refreshGroData, showToast, stored.selectedCompanyId],
  );

  const generateGroReport = useCallback(
    async (type: GroReportType) => {
      if (!dbConnected) return;
      try {
        await apiGenerateGroReport(stored.selectedCompanyId, type);
        await refreshGroData();
        showToast('Relatório GRO gerado', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao gerar relatório', 'warn');
      }
    },
    [dbConnected, refreshGroData, showToast, stored.selectedCompanyId],
  );

  const refreshPgrData = useCallback(async () => {
    const tenantId = stored.selectedCompanyId;
    if (!dbConnected || !tenantId) return;
    try {
      const [prog, vers, hist] = await Promise.all([
        apiGetPgrProgram(tenantId),
        apiGetPgrVersions(tenantId),
        apiGetPgrHistory(tenantId),
      ]);
      setPgrProgram(prog);
      setPgrVersions(vers);
      setPgrHistory(hist);
    } catch (err) {
      console.error('refreshPgrData', err);
      showToast('Erro ao carregar PGR', 'warn');
    }
  }, [dbConnected, showToast, stored.selectedCompanyId]);

  const refreshPsicoData = useCallback(async () => {
    const tenantId = stored.selectedCompanyId;
    if (!dbConnected || !tenantId) return;
    try {
      const [dash, fat, mat, conf, plans, hist, trends] = await Promise.all([
        apiGetPsicoDashboard(tenantId),
        apiGetPsicoFatores(tenantId),
        apiGetPsicoMatriz(tenantId),
        apiGetPsicoConformidade(tenantId),
        apiGetPsicoPlanoAcao(tenantId),
        apiGetPsicoHistorico(tenantId),
        apiGetPsicoTendencias(tenantId),
      ]);
      setPsicoDashboard(dash);
      setPsicoFatores(fat);
      setPsicoMatriz(mat);
      setPsicoConformity(conf);
      setPsicoActionPlans(plans);
      setPsicoHistory(hist);
      setPsicoTrends(trends);
    } catch (err) {
      console.error('refreshPsicoData', err);
      showToast('Erro ao carregar psicossocial', 'warn');
    }
  }, [dbConnected, showToast, stored.selectedCompanyId]);

  const savePsicoFator = useCallback(
    async (
      codigo: string,
      data: { probabilidade: number; severidade: number; setorId?: string; observacoes?: string },
    ) => {
      if (!dbConnected) {
        showToast('Conecte ao PostgreSQL', 'warn');
        return;
      }
      try {
        await apiSavePsicoFator(stored.selectedCompanyId, codigo, data);
        await refreshPsicoData();
        showToast('Fator avaliado', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao salvar fator', 'warn');
      }
    },
    [dbConnected, refreshPsicoData, showToast, stored.selectedCompanyId],
  );

  const submitPsicoQuestionnaire = useCallback(
    async (type: PsicoQuestionnaireType, answers: Record<string, number>, consent: boolean) => {
      if (!dbConnected) {
        showToast('Conecte ao PostgreSQL', 'warn');
        return null;
      }
      if (!consent) {
        showToast('Consentimento LGPD obrigatório', 'warn');
        return null;
      }
      try {
        const result = await apiSubmitPsicoResposta(stored.selectedCompanyId, {
          type,
          answers,
          consentimentoLgpd: true,
          anonymous: true,
        });
        await refreshPsicoData();
        showToast('Resposta registrada (anonimizada)', 'success');
        return result;
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao enviar questionário', 'warn');
        return null;
      }
    },
    [dbConnected, refreshPsicoData, showToast, stored.selectedCompanyId],
  );

  const savePsicoActionPlan = useCallback(
    async (data: Partial<PsicoActionPlan> & { id?: string }) => {
      if (!dbConnected) {
        showToast('Conecte ao PostgreSQL', 'warn');
        return;
      }
      try {
        await apiSavePsicoPlanoAcao(stored.selectedCompanyId, data);
        await refreshPsicoData();
        showToast('Plano atualizado', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao salvar ação', 'warn');
      }
    },
    [dbConnected, refreshPsicoData, showToast, stored.selectedCompanyId],
  );

  const updatePsicoActionStatus = useCallback(
    async (id: string, status: PsicoActionPlan['status']) => {
      await savePsicoActionPlan({ id, status });
    },
    [savePsicoActionPlan],
  );

  const deletePsicoActionPlan = useCallback(
    async (id: string) => {
      if (!dbConnected) return;
      try {
        await apiDeletePsicoPlanoAcao(stored.selectedCompanyId, id);
        await refreshPsicoData();
        showToast('Ação removida', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao excluir', 'warn');
      }
    },
    [dbConnected, refreshPsicoData, showToast, stored.selectedCompanyId],
  );

  const markPsicoAlertRead = useCallback(
    async (id: string) => {
      if (!dbConnected) return;
      try {
        await apiMarkPsicoAlertRead(stored.selectedCompanyId, id);
        await refreshPsicoData();
      } catch {
        showToast('Erro ao marcar alerta', 'warn');
      }
    },
    [dbConnected, refreshPsicoData, showToast, stored.selectedCompanyId],
  );

  const refreshAetData = useCallback(async () => {
    const tenantId = stored.selectedCompanyId;
    if (!dbConnected || !tenantId) return;
    try {
      const [dash, procs, mob, eq] = await Promise.all([
        apiGetAetDashboard(tenantId),
        apiGetAetProcessos(tenantId),
        apiGetAetMobiliario(tenantId),
        apiGetAetEquipamentos(tenantId),
      ]);
      setAetDashboard(dash);
      setAetProcesses(procs);
      setAetFurniture(mob);
      setAetEquipment(eq);
    } catch (err) {
      console.error('refreshAetData', err);
    }
  }, [dbConnected, stored.selectedCompanyId]);

  const openAetProcess = useCallback(
    async (id: string) => {
      if (!dbConnected) return;
      try {
        const [detail, versions, history, integrations] = await Promise.all([
          apiGetAetProcesso(stored.selectedCompanyId, id),
          apiGetAetVersions(stored.selectedCompanyId, id).catch(() => [] as AetVersionDetail[]),
          apiGetAetHistorico(stored.selectedCompanyId, id).catch(() => [] as AetHistoryEntry[]),
          apiGetAetIntegrations(stored.selectedCompanyId, id).catch(() => [] as AetIntegration[]),
        ]);
        setAetProcessDetail(detail);
        setAetReport(detail.report);
        setAetVersions(versions);
        setAetHistory(history);
        setAetIntegrations(integrations);
        const active = versions.find((v) => v.id === detail.activeVersionId) ?? versions[0] ?? null;
        setAetVersionDetail(active);
        if (active?.report) setAetReport(active.report);
      } catch {
        showToast('Erro ao carregar AET', 'warn');
      }
    },
    [dbConnected, showToast, stored.selectedCompanyId],
  );

  const { createAetProcess } = useAetActions({
    dbConnected,
    setDbConnected,
    stored,
    showToast,
    refreshAetData,
    setAetProcessDetail,
  });

  const advanceAetStage = useCallback(async () => {
    if (!aetProcessDetail || !dbConnected) return;
    try {
      const p = await apiAdvanceAetStage(stored.selectedCompanyId, aetProcessDetail.id);
      setAetProcessDetail(p);
      await refreshAetData();
      showToast('Etapa avançada', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro', 'warn');
    }
  }, [aetProcessDetail, dbConnected, refreshAetData, showToast, stored.selectedCompanyId]);

  const saveAetVibracaoCorpo = useCallback(
    async (data: { aceleracaoMs2: number; horasExposicao: number }) => {
      if (!aetProcessDetail || !dbConnected) return;
      const p = await apiSaveAetVibracaoCorpo(stored.selectedCompanyId, aetProcessDetail.id, data);
      setAetProcessDetail(p);
      showToast('Vibração corpo inteiro salva', 'success');
    },
    [aetProcessDetail, dbConnected, showToast, stored.selectedCompanyId],
  );

  const saveAetVibracaoMaos = useCallback(
    async (data: { aceleracaoMs2: number; horasExposicao: number }) => {
      if (!aetProcessDetail || !dbConnected) return;
      const p = await apiSaveAetVibracaoMaos(stored.selectedCompanyId, aetProcessDetail.id, data);
      setAetProcessDetail(p);
      showToast('Vibração mãos-braços salva', 'success');
    },
    [aetProcessDetail, dbConnected, showToast, stored.selectedCompanyId],
  );

  const saveAetTeleatendimento = useCallback(
    async (answers: Record<string, number>) => {
      if (!aetProcessDetail || !dbConnected) return;
      const p = await apiSaveAetTeleatendimento(stored.selectedCompanyId, aetProcessDetail.id, answers);
      setAetProcessDetail(p);
      showToast('Teleatendimento salvo', 'success');
    },
    [aetProcessDetail, dbConnected, showToast, stored.selectedCompanyId],
  );

  const saveAetOrganizacao = useCallback(
    async (answers: Record<string, number>) => {
      if (!aetProcessDetail || !dbConnected) return;
      const p = await apiSaveAetOrganizacao(stored.selectedCompanyId, aetProcessDetail.id, answers);
      setAetProcessDetail(p);
      showToast('Organização do trabalho salva', 'success');
    },
    [aetProcessDetail, dbConnected, showToast, stored.selectedCompanyId],
  );

  const saveAetMetodos = useCallback(
    async (methods: Record<string, unknown>, importAnalysisId?: string) => {
      if (!aetProcessDetail || !dbConnected) return;
      const p = await apiSaveAetMetodos(stored.selectedCompanyId, aetProcessDetail.id, methods, importAnalysisId);
      setAetProcessDetail(p);
      showToast('Métodos ergonômicos atualizados', 'success');
    },
    [aetProcessDetail, dbConnected, showToast, stored.selectedCompanyId],
  );

  const saveAetFurniture = useCallback(
    async (data: Partial<AetFurniture>) => {
      if (!dbConnected) return;
      await apiSaveAetMobiliario(stored.selectedCompanyId, data);
      await refreshAetData();
      showToast('Mobiliário cadastrado', 'success');
    },
    [dbConnected, refreshAetData, showToast, stored.selectedCompanyId],
  );

  const saveAetEquipment = useCallback(
    async (data: Partial<AetEquipment>) => {
      if (!dbConnected) return;
      await apiSaveAetEquipamento(stored.selectedCompanyId, data);
      await refreshAetData();
      showToast('Equipamento cadastrado', 'success');
    },
    [dbConnected, refreshAetData, showToast, stored.selectedCompanyId],
  );

  const generateAetReport = useCallback(async () => {
    if (!aetProcessDetail || !dbConnected) return;
    try {
      const report = await apiGenerateAetReport(stored.selectedCompanyId, aetProcessDetail.id);
      setAetReport(report);
      setAetProcessDetail((p) => (p ? { ...p, report } : p));
      showToast('Relatório normativo gerado', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao gerar relatório', 'warn');
    }
  }, [aetProcessDetail, dbConnected, showToast, stored.selectedCompanyId]);

  const signAet = useCallback(
    async (name: string, registry: string) => {
      if (!aetProcessDetail || !dbConnected) return;
      try {
        const p = await apiSignAet(stored.selectedCompanyId, aetProcessDetail.id, name, registry);
        setAetProcessDetail(p);
        await refreshAetData();
        showToast('AET assinada', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro na assinatura', 'warn');
      }
    },
    [aetProcessDetail, dbConnected, refreshAetData, showToast, stored.selectedCompanyId],
  );

  const downloadAetPdf = useCallback(() => {
    if (!aetProcessDetail || !aetReport) {
      showToast('Gere o relatório primeiro', 'warn');
      return;
    }
    exportAetPdf(aetProcessDetail, aetReport, aetVersionDetail ?? undefined);
    showToast('PDF AET exportado', 'success');
  }, [aetProcessDetail, aetReport, aetVersionDetail, showToast]);

  const refreshAetVersion = useCallback(
    async (versionId: string) => {
      if (!stored.selectedCompanyId || !dbConnected) return;
      const v = await apiGetAetVersion(stored.selectedCompanyId, versionId);
      setAetVersionDetail(v);
      if (v.report) setAetReport(v.report);
      if (aetProcessDetail) {
        const [versions, history, integrations] = await Promise.all([
          apiGetAetVersions(stored.selectedCompanyId, aetProcessDetail.id),
          apiGetAetHistorico(stored.selectedCompanyId, aetProcessDetail.id),
          apiGetAetIntegrations(stored.selectedCompanyId, aetProcessDetail.id),
        ]);
        setAetVersions(versions);
        setAetHistory(history);
        setAetIntegrations(integrations);
      }
    },
    [aetProcessDetail, dbConnected, stored.selectedCompanyId],
  );

  const createAetVersionCorp = useCallback(async () => {
    if (!aetProcessDetail || !dbConnected) return;
    try {
      const v = await apiCreateAetVersion(stored.selectedCompanyId, aetProcessDetail.id, {
        technicalResponsible: aetProcessDetail.technicalResponsible,
        technicalResponsibleCrea: aetProcessDetail.technicalResponsibleCrea,
        technicalResponsibleArt: aetProcessDetail.technicalResponsibleArt,
      });
      setAetVersionDetail(v);
      await refreshAetVersion(v.id);
      showToast(`Versão ${v.number} criada`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar versão', 'warn');
    }
  }, [aetProcessDetail, dbConnected, refreshAetVersion, showToast, stored.selectedCompanyId]);

  const refreshAetVersionSnapshot = useCallback(async () => {
    if (!aetVersionDetail || !dbConnected) return;
    try {
      await apiRefreshAetVersionSnapshot(stored.selectedCompanyId, aetVersionDetail.id);
      await refreshAetVersion(aetVersionDetail.id);
      showToast('Snapshot atualizado', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro', 'warn');
    }
  }, [aetVersionDetail, dbConnected, refreshAetVersion, showToast, stored.selectedCompanyId]);

  const generateAetVersionReport = useCallback(async () => {
    if (!aetVersionDetail || !dbConnected) return;
    try {
      const report = await apiGenerateAetVersionReport(stored.selectedCompanyId, aetVersionDetail.id);
      setAetReport(report);
      await refreshAetVersion(aetVersionDetail.id);
      showToast('Relatório corporativo gerado', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro', 'warn');
    }
  }, [aetVersionDetail, dbConnected, refreshAetVersion, showToast, stored.selectedCompanyId]);

  const submitAetApproval = useCallback(
    async (approverName: string, approverRole?: string) => {
      if (!aetVersionDetail || !dbConnected) return;
      try {
        await apiSubmitAetApproval(stored.selectedCompanyId, aetVersionDetail.id, approverName, approverRole);
        await refreshAetVersion(aetVersionDetail.id);
        showToast('Enviado para aprovação', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro', 'warn');
      }
    },
    [aetVersionDetail, dbConnected, refreshAetVersion, showToast, stored.selectedCompanyId],
  );

  const approveAetVersion = useCallback(async () => {
    if (!aetVersionDetail || !dbConnected) return;
    try {
      await apiApproveAetVersion(stored.selectedCompanyId, aetVersionDetail.id);
      await refreshAetVersion(aetVersionDetail.id);
      if (aetProcessDetail) await openAetProcess(aetProcessDetail.id);
      showToast('Versão aprovada — integração NR-01 executada', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro', 'warn');
    }
  }, [aetProcessDetail, aetVersionDetail, dbConnected, openAetProcess, refreshAetVersion, showToast, stored.selectedCompanyId]);

  const rejectAetVersion = useCallback(
    async (notes?: string) => {
      if (!aetVersionDetail || !dbConnected) return;
      try {
        await apiRejectAetVersion(stored.selectedCompanyId, aetVersionDetail.id, notes);
        await refreshAetVersion(aetVersionDetail.id);
        showToast('Versão rejeitada', 'warn');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro', 'warn');
      }
    },
    [aetVersionDetail, dbConnected, refreshAetVersion, showToast, stored.selectedCompanyId],
  );

  const signAetVersion = useCallback(
    async (type: AetSignatureType, name: string, role?: string, document?: string) => {
      if (!aetVersionDetail || !dbConnected) return;
      try {
        await apiSignAetVersion(stored.selectedCompanyId, aetVersionDetail.id, type, name, role, document);
        await refreshAetVersion(aetVersionDetail.id);
        if (aetProcessDetail) {
          const detail = await apiGetAetProcesso(stored.selectedCompanyId, aetProcessDetail.id);
          setAetProcessDetail(detail);
        }
        showToast('Assinatura registrada', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro', 'warn');
      }
    },
    [aetProcessDetail, aetVersionDetail, dbConnected, refreshAetVersion, showToast, stored.selectedCompanyId],
  );

  const startAetRevision = useCallback(async () => {
    if (!aetVersionDetail || !dbConnected) return;
    try {
      const v = await apiStartAetRevision(stored.selectedCompanyId, aetVersionDetail.id);
      setAetVersionDetail(v);
      await refreshAetVersion(v.id);
      showToast(`Revisão ${v.number} iniciada`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro', 'warn');
    }
  }, [aetVersionDetail, dbConnected, refreshAetVersion, showToast, stored.selectedCompanyId]);

  const saveAetTechnicalResponsible = useCallback(
    async (data: Record<string, string>) => {
      if (!aetProcessDetail || !dbConnected) return;
      try {
        const p = await apiUpdateAetTechnicalResponsible(stored.selectedCompanyId, aetProcessDetail.id, data);
        setAetProcessDetail(p);
        showToast('Responsável técnico atualizado', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro', 'warn');
      }
    },
    [aetProcessDetail, dbConnected, showToast, stored.selectedCompanyId],
  );

  const refreshSstData = useCallback(async () => {
    const tenantId = stored.selectedCompanyId;
    if (!dbConnected || !tenantId) return;
    try {
      const [dash, apr, epi, epc, ins, aud, nc, capa, trein] = await Promise.all([
        apiGetSstDashboard(tenantId), apiGetSstApr(tenantId), apiGetSstEpi(tenantId), apiGetSstEpc(tenantId),
        apiGetSstInspecoes(tenantId), apiGetSstAuditorias(tenantId), apiGetSstNc(tenantId),
        apiGetSstCapa(tenantId), apiGetSstTreinamentos(tenantId),
      ]);
      setSstDashboard(dash);
      setSstApr(apr);
      setSstEpi(epi);
      setSstEpc(epc);
      setSstInspecoes(ins);
      setSstAuditorias(aud);
      setSstNc(nc);
      setSstCapa(capa);
      setSstTreinamentos(trein);
    } catch (err) {
      console.error('refreshSstData', err);
    }
  }, [dbConnected, stored.selectedCompanyId]);

  const createSstApr = useCallback(async (data: Partial<SstApr>) => {
    if (!dbConnected) return;
    await apiCreateSstApr(stored.selectedCompanyId, data);
    await refreshSstData();
    showToast('APR registrada', 'success');
  }, [dbConnected, refreshSstData, showToast, stored.selectedCompanyId]);

  const createSstEpi = useCallback(async (data: Partial<SstEpi>) => {
    if (!dbConnected) return;
    await apiCreateSstEpi(stored.selectedCompanyId, data);
    await refreshSstData();
    showToast('EPI cadastrado', 'success');
  }, [dbConnected, refreshSstData, showToast, stored.selectedCompanyId]);

  const createSstEpc = useCallback(async (data: Partial<SstEpc>) => {
    if (!dbConnected) return;
    await apiCreateSstEpc(stored.selectedCompanyId, data);
    await refreshSstData();
    showToast('EPC cadastrado', 'success');
  }, [dbConnected, refreshSstData, showToast, stored.selectedCompanyId]);

  const createSstInspecao = useCallback(async (title: string) => {
    if (!dbConnected || !title.trim()) return;
    await apiCreateSstInspecao(stored.selectedCompanyId, title.trim());
    await refreshSstData();
    showToast('Inspeção programada', 'success');
  }, [dbConnected, refreshSstData, showToast, stored.selectedCompanyId]);

  const createSstAuditoria = useCallback(async (title: string) => {
    if (!dbConnected || !title.trim()) return;
    await apiCreateSstAuditoria(stored.selectedCompanyId, title.trim());
    await refreshSstData();
    showToast('Auditoria planejada', 'success');
  }, [dbConnected, refreshSstData, showToast, stored.selectedCompanyId]);

  const createSstNc = useCallback(async (data: { description: string; title?: string; severity?: string; riskId?: string }) => {
    if (!dbConnected) return;
    await apiCreateSstNc(stored.selectedCompanyId, data);
    await refreshSstData();
    showToast('NC registrada', 'success');
  }, [dbConnected, refreshSstData, showToast, stored.selectedCompanyId]);

  const createSstCapa = useCallback(async (data: { description: string; ncId?: string; riskId?: string; syncGro?: boolean }) => {
    if (!dbConnected) return;
    await apiCreateSstCapa(stored.selectedCompanyId, data);
    await refreshSstData();
    showToast('CAPA criada' + (data.syncGro ? ' e sincronizada GRO' : ''), 'success');
  }, [dbConnected, refreshSstData, showToast, stored.selectedCompanyId]);

  const createSstTreinamento = useCallback(async (title: string) => {
    if (!dbConnected || !title.trim()) return;
    await apiCreateSstTreinamento(stored.selectedCompanyId, title.trim());
    await refreshSstData();
    showToast('Treinamento programado', 'success');
  }, [dbConnected, refreshSstData, showToast, stored.selectedCompanyId]);

  const generateSstReport = useCallback(async () => {
    if (!dbConnected) return;
    try {
      const report = await apiGenerateSstReport(stored.selectedCompanyId);
      setSstReport(report);
      showToast('Relatório SST gerado', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro', 'warn');
    }
  }, [dbConnected, showToast, stored.selectedCompanyId]);

  const downloadSstPdf = useCallback(() => {
    if (!sstReport) { showToast('Gere o relatório primeiro', 'warn'); return; }
    exportSstPdf(sstReport);
    showToast('PDF SST exportado', 'success');
  }, [sstReport, showToast]);

  const refreshEsocialData = useCallback(async () => {
    const tenantId = stored.selectedCompanyId;
    if (!dbConnected || !tenantId) return;
    try {
      const [dash, cfg, ev, hist] = await Promise.all([
        apiGetEsocialDashboard(tenantId),
        apiGetEsocialConfig(tenantId),
        apiGetEsocialEventos(tenantId),
        apiGetEsocialHistorico(tenantId),
      ]);
      setEsocialDashboard(dash);
      setEsocialConfig(cfg);
      setEsocialEventos(ev);
      setEsocialHistory(hist);
    } catch (err) {
      console.error('refreshEsocialData', err);
    }
  }, [dbConnected, stored.selectedCompanyId]);

  const createEsocialEvent = useCallback(async (data: {
    eventType: EsocialEventType;
    payload?: Record<string, unknown>;
    collaboratorId?: string;
    analysisId?: string;
    riskId?: string;
  }) => {
    if (!dbConnected) return;
    await apiCreateEsocialEvento(stored.selectedCompanyId, data);
    await refreshEsocialData();
    showToast(`Evento ${data.eventType} criado`, 'success');
  }, [dbConnected, refreshEsocialData, showToast, stored.selectedCompanyId]);

  const validateEsocialEvent = useCallback(async (id: string) => {
    if (!dbConnected) return;
    try {
      const r = await apiValidateEsocialEvento(stored.selectedCompanyId, id);
      await refreshEsocialData();
      showToast(r.valid ? 'Evento validado' : 'Validação com erros', r.valid ? 'success' : 'warn');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro na validação', 'warn');
    }
  }, [dbConnected, refreshEsocialData, showToast, stored.selectedCompanyId]);

  const signEsocialEvent = useCallback(async (id: string) => {
    if (!dbConnected) return;
    try {
      const name = stored.session?.name ?? 'Responsável técnico';
      await apiSignEsocialEvento(stored.selectedCompanyId, id, { name, type: 'EMITENTE' });
      await refreshEsocialData();
      showToast('Evento assinado (ICP-Brasil pendente no certificado)', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro na assinatura', 'warn');
    }
  }, [dbConnected, refreshEsocialData, showToast, stored.selectedCompanyId, stored.session?.name]);

  const downloadEsocialXml = useCallback(async (id: string) => {
    if (!dbConnected) return;
    try {
      const { xml, eventType, eventId } = await apiGetEsocialXml(stored.selectedCompanyId, id);
      downloadEsocialXmlFromString(xml, eventType, eventId);
      showToast('XML exportado', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao exportar XML', 'warn');
    }
  }, [dbConnected, showToast, stored.selectedCompanyId]);

  const prepareEsocialEnvio = useCallback(async (id: string) => {
    if (!dbConnected) return;
    try {
      const r = await apiPrepareEsocialEnvio(stored.selectedCompanyId, id);
      await refreshEsocialData();
      showToast(`Lote ${r.loteId} preparado para gov.br`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao preparar envio', 'warn');
    }
  }, [dbConnected, refreshEsocialData, showToast, stored.selectedCompanyId]);

  const transmitEsocialEvent = useCallback(async (id: string) => {
    if (!dbConnected || !stored.selectedCompanyId) { showToast('PostgreSQL offline', 'warn'); return; }
    try {
      const r = await apiTransmitEsocialEvento(stored.selectedCompanyId, id);
      await refreshEsocialData();
      showToast(r.eventStatus === 'ACEITO' ? 'Evento aceito pelo gov.br' : `Transmissão: ${r.eventStatus}`, r.eventStatus === 'REJEITADO' ? 'warn' : 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro na transmissão', 'warn');
    }
  }, [dbConnected, refreshEsocialData, showToast, stored.selectedCompanyId]);

  const resendEsocialEvent = useCallback(async (id: string) => {
    if (!dbConnected || !stored.selectedCompanyId) { showToast('PostgreSQL offline', 'warn'); return; }
    try {
      const r = await apiResendEsocialEvento(stored.selectedCompanyId, id);
      await refreshEsocialData();
      showToast(`Reenvio: ${r.eventStatus}`, r.eventStatus === 'ACEITO' ? 'success' : 'warn');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro no reenvio', 'warn');
    }
  }, [dbConnected, refreshEsocialData, showToast, stored.selectedCompanyId]);

  const consultEsocialStatus = useCallback(async (id: string) => {
    if (!dbConnected || !stored.selectedCompanyId) { showToast('PostgreSQL offline', 'warn'); return; }
    try {
      const r = await apiConsultEsocialStatus(stored.selectedCompanyId, id);
      await refreshEsocialData();
      showToast(`Status: ${r.status}${r.message ? ` — ${r.message}` : ''}`, r.status === 'ACEITO' ? 'success' : 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao consultar status', 'warn');
    }
  }, [dbConnected, refreshEsocialData, showToast, stored.selectedCompanyId]);

  const updateEsocialConfig = useCallback(async (data: Partial<EsocialConfig>) => {
    if (!dbConnected) return;
    try {
      const cfg = await apiUpdateEsocialConfig(stored.selectedCompanyId, data);
      setEsocialConfig(cfg);
      await refreshEsocialData();
      showToast('Configuração eSocial salva', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar', 'warn');
    }
  }, [dbConnected, refreshEsocialData, showToast, stored.selectedCompanyId]);

  const updatePgrProgram = useCallback(
    (patch: Partial<Pick<PgrProgram, 'title' | 'description' | 'technicalResponsible' | 'legalResponsible'>>) => {
      setPgrProgram((p) => (p ? { ...p, ...patch } : p));
      if (!dbConnected) return;
      void (async () => {
        try {
          const updated = await apiUpdatePgrProgram(stored.selectedCompanyId, {
            ...pgrProgram,
            ...patch,
          });
          setPgrProgram(updated);
        } catch {
          showToast('Erro ao salvar programa PGR', 'warn');
        }
      })();
    },
    [dbConnected, pgrProgram, showToast, stored.selectedCompanyId],
  );

  const generatePgrVersion = useCallback(async () => {
    if (!dbConnected) return;
    try {
      const v = await apiGeneratePgrVersion(stored.selectedCompanyId);
      await refreshPgrData();
      setPgrVersionDetail(v);
      showToast(`PGR v${v.number} gerado com snapshot automático`, 'success');
      go('pgr-detalhe');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao gerar versão', 'warn');
    }
  }, [dbConnected, go, refreshPgrData, showToast, stored.selectedCompanyId]);

  const openPgrVersion = useCallback(
    async (id: string) => {
      if (!dbConnected) return;
      try {
        const detail = await apiGetPgrVersion(stored.selectedCompanyId, id);
        setPgrVersionDetail(detail);
        go('pgr-detalhe');
      } catch {
        showToast('Erro ao carregar versão', 'warn');
      }
    },
    [dbConnected, go, showToast, stored.selectedCompanyId],
  );

  const refreshPgrVersion = useCallback(
    async (id: string) => {
      if (!dbConnected) return;
      try {
        const detail = await apiRefreshPgrVersion(stored.selectedCompanyId, id);
        setPgrVersionDetail(detail);
        await refreshPgrData();
        showToast('Snapshot atualizado com dados atuais', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao atualizar', 'warn');
      }
    },
    [dbConnected, refreshPgrData, showToast, stored.selectedCompanyId],
  );

  const submitPgrApproval = useCallback(
    async (versionId: string, approverName: string, approverRole?: string) => {
      if (!dbConnected) return;
      try {
        const detail = await apiSubmitPgrApproval(stored.selectedCompanyId, versionId, {
          approverName,
          approverRole,
        });
        setPgrVersionDetail(detail);
        await refreshPgrData();
        showToast('Enviado para aprovação', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro', 'warn');
      }
    },
    [dbConnected, refreshPgrData, showToast, stored.selectedCompanyId],
  );

  const approvePgrVersion = useCallback(
    async (versionId: string) => {
      if (!dbConnected) return;
      try {
        const detail = await apiApprovePgrVersion(stored.selectedCompanyId, versionId);
        setPgrVersionDetail(detail);
        await refreshPgrData();
        showToast('Versão aprovada', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro', 'warn');
      }
    },
    [dbConnected, refreshPgrData, showToast, stored.selectedCompanyId],
  );

  const rejectPgrVersion = useCallback(
    async (versionId: string) => {
      if (!dbConnected) return;
      try {
        const detail = await apiRejectPgrVersion(stored.selectedCompanyId, versionId);
        setPgrVersionDetail(detail);
        await refreshPgrData();
        showToast('Versão rejeitada — em revisão', 'warn');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro', 'warn');
      }
    },
    [dbConnected, refreshPgrData, showToast, stored.selectedCompanyId],
  );

  const signPgrVersion = useCallback(
    async (versionId: string, type: PgrSignatureType, name: string, role?: string) => {
      if (!dbConnected) return;
      try {
        await apiSignPgrVersion(stored.selectedCompanyId, versionId, { type, name, role });
        const detail = await apiGetPgrVersion(stored.selectedCompanyId, versionId);
        setPgrVersionDetail(detail);
        await refreshPgrData();
        showToast('Assinatura registrada', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro', 'warn');
      }
    },
    [dbConnected, refreshPgrData, showToast, stored.selectedCompanyId],
  );

  const startPgrRevision = useCallback(
    async (versionId: string) => {
      if (!dbConnected) return;
      try {
        const detail = await apiStartPgrRevision(stored.selectedCompanyId, versionId);
        setPgrVersionDetail(detail);
        await refreshPgrData();
        showToast(`Revisão iniciada — v${detail.number}`, 'success');
        go('pgr-detalhe');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro', 'warn');
      }
    },
    [dbConnected, go, refreshPgrData, showToast, stored.selectedCompanyId],
  );

  const downloadPgrPdf = useCallback(() => {
    if (!pgrProgram || !pgrVersionDetail) {
      showToast('Carregue uma versão do PGR', 'warn');
      return;
    }
    exportPgrPdf(pgrProgram, pgrVersionDetail);
    showToast('PDF do PGR gerado', 'success');
  }, [pgrProgram, pgrVersionDetail, showToast]);

  const getStats = useCallback(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthAnalyses = stored.analyses.filter((a) => {
      const [, m, y] = a.date.split('/').map(Number);
      return m - 1 === month && y === year;
    });
    const total = monthAnalyses.length || stored.analyses.length;
    const critical = stored.analyses.filter((a) => a.risk === 'critico').length;
    const sectors = new Set(stored.analyses.map((a) => a.setor)).size;
    const evaluated = stored.collaborators.length;
    const dist: Record<RiskLevel, { count: number; pct: number }> = {
      critico: { count: 0, pct: 0 },
      alto: { count: 0, pct: 0 },
      medio: { count: 0, pct: 0 },
      baixo: { count: 0, pct: 0 },
    };
    stored.analyses.forEach((a) => {
      dist[a.risk].count++;
    });
    const totalA = stored.analyses.length || 1;
    (Object.keys(dist) as RiskLevel[]).forEach((k) => {
      dist[k].pct = Math.round((dist[k].count / totalA) * 100);
    });
    return { totalMonth: total, evaluated, critical, sectors, riskDistribution: dist };
  }, [stored.analyses, stored.collaborators]);

  const refreshComplianceData = useCallback(async () => {
    if (!dbConnected || !stored.selectedCompanyId) return;
    const tenantId = stored.selectedCompanyId;
    try {
      const [dash, fontes, normas, det, alert, reps, tasks, schedule] = await Promise.all([
        apiGetComplianceDashboard(tenantId),
        apiGetComplianceFontes(tenantId),
        apiGetComplianceNormas(tenantId),
        apiGetComplianceDeteccoes(tenantId),
        apiGetComplianceAlertas(tenantId),
        apiGetComplianceRelatorios(tenantId),
        apiGetComplianceTasks(tenantId).catch(() => [] as ComplianceAdequationTask[]),
        apiGetComplianceSchedule(tenantId).catch(() => null),
      ]);
      setComplianceDashboard(dash);
      setComplianceFontes(fontes);
      setComplianceNormas(normas);
      setComplianceDeteccoes(det);
      setComplianceAlertas(alert);
      setComplianceReports(reps);
      setComplianceTasks(tasks);
      setComplianceSchedule(schedule);
    } catch (err) {
      console.error('refreshComplianceData', err);
    }
  }, [dbConnected, stored.selectedCompanyId]);

  const runComplianceScan = useCallback(async (sources?: string[]) => {
    if (!dbConnected || !stored.selectedCompanyId) { showToast('PostgreSQL offline', 'warn'); return; }
    try {
      const r = await apiRunComplianceScan(stored.selectedCompanyId, sources);
      await refreshComplianceData();
      showToast(`${r.newDetections} nova(s) detecção(ões) — validação humana necessária`, r.newDetections ? 'warn' : 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro na varredura', 'warn');
    }
  }, [dbConnected, refreshComplianceData, showToast, stored.selectedCompanyId]);

  const updateComplianceFonte = useCallback(async (code: string, data: { active?: boolean; intervalHours?: number }) => {
    if (!dbConnected || !stored.selectedCompanyId) return;
    try {
      await apiUpdateComplianceFonte(stored.selectedCompanyId, code, data);
      await refreshComplianceData();
      showToast('Fonte atualizada', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro', 'warn');
    }
  }, [dbConnected, refreshComplianceData, showToast, stored.selectedCompanyId]);

  const loadNormaVersoes = useCallback(async (normId: string) => {
    if (!dbConnected || !stored.selectedCompanyId) return;
    try {
      const vers = await apiGetComplianceNormaVersoes(stored.selectedCompanyId, normId);
      setComplianceNormaVersoes(vers);
    } catch (err) {
      console.error('loadNormaVersoes', err);
    }
  }, [dbConnected, stored.selectedCompanyId]);

  const compareNormVersions = useCallback(async (normId: string, fromId: string, toId: string) => {
    if (!dbConnected || !stored.selectedCompanyId) return;
    try {
      const cmp = await apiCompareComplianceNormVersions(stored.selectedCompanyId, normId, fromId, toId);
      setComplianceVersionCompare(cmp);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro na comparação', 'warn');
    }
  }, [dbConnected, showToast, stored.selectedCompanyId]);

  const loadDetectionImpactos = useCallback(async (detectionId: string) => {
    if (!dbConnected || !stored.selectedCompanyId) return;
    try {
      const imps = await apiGetComplianceImpactos(stored.selectedCompanyId, detectionId);
      setComplianceImpactos(imps.legal);
      setComplianceSystemImpacts(imps.system);
      setComplianceClientImpacts(imps.clients);
    } catch (err) {
      console.error('loadDetectionImpactos', err);
    }
  }, [dbConnected, stored.selectedCompanyId]);

  const validateComplianceDetection = useCallback(async (id: string, decision: 'APROVAR' | 'REJEITAR' | 'SOLICITAR_REVISAO', justification: string) => {
    if (!dbConnected || !stored.selectedCompanyId) { showToast('PostgreSQL offline', 'warn'); return; }
    if (!justification.trim()) { showToast('Informe a justificativa', 'warn'); return; }
    try {
      const r = await apiValidateComplianceDetection(stored.selectedCompanyId, id, {
        decision,
        justification,
        validatorName: stored.session?.name,
        applyRules: false,
      });
      await refreshComplianceData();
      showToast(
        decision === 'APROVAR' ? 'Detecção aprovada — catálogo atualizado (sem auto-aplicação)' :
        decision === 'REJEITAR' ? 'Detecção rejeitada' : 'Revisão solicitada',
        decision === 'APROVAR' ? 'success' : 'warn',
      );
      if (r.notice) showToast(r.notice, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro na validação', 'warn');
    }
  }, [dbConnected, refreshComplianceData, showToast, stored.selectedCompanyId, stored.session?.name]);

  const updateComplianceTask = useCallback(async (id: string, patch: { status?: string; responsible?: string }) => {
    if (!dbConnected || !stored.selectedCompanyId) return;
    try {
      await apiUpdateComplianceTask(stored.selectedCompanyId, id, patch);
      await refreshComplianceData();
      showToast('Tarefa atualizada', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro', 'warn');
    }
  }, [dbConnected, refreshComplianceData, showToast, stored.selectedCompanyId]);

  const updateComplianceScheduleCtx = useCallback(async (data: { active?: boolean; intervalHours?: number }) => {
    if (!dbConnected || !stored.selectedCompanyId) return;
    try {
      const s = await apiUpdateComplianceSchedule(stored.selectedCompanyId, data);
      setComplianceSchedule(s);
      showToast('Agendamento atualizado', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro', 'warn');
    }
  }, [dbConnected, showToast, stored.selectedCompanyId]);

  const markComplianceAlertRead = useCallback(async (id: string) => {
    if (!dbConnected || !stored.selectedCompanyId) return;
    try {
      await apiMarkComplianceAlertRead(stored.selectedCompanyId, id);
      await refreshComplianceData();
    } catch (err) {
      console.error('markComplianceAlertRead', err);
    }
  }, [dbConnected, refreshComplianceData, stored.selectedCompanyId]);

  const generateComplianceReport = useCallback(async () => {
    if (!dbConnected || !stored.selectedCompanyId) { showToast('PostgreSQL offline', 'warn'); return; }
    try {
      await apiGenerateComplianceReport(stored.selectedCompanyId);
      await refreshComplianceData();
      showToast('Relatório gerado', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao gerar relatório', 'warn');
    }
  }, [dbConnected, refreshComplianceData, showToast, stored.selectedCompanyId]);

  const downloadComplianceReport = useCallback(async () => {
    if (!dbConnected || !stored.selectedCompanyId) { showToast('PostgreSQL offline', 'warn'); return; }
    try {
      const report = await apiGenerateComplianceReport(stored.selectedCompanyId);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await refreshComplianceData();
      showToast('Relatório exportado', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro na exportação', 'warn');
    }
  }, [dbConnected, refreshComplianceData, showToast, stored.selectedCompanyId]);

  const refreshOrgData = useCallback(async () => {
    if (!dbConnected || !stored.selectedCompanyId) return;
    try {
      const tree = await apiGetOrgTree(stored.selectedCompanyId);
      setOrgTree(tree);
      setSectors(
        tree.units.flatMap((u) => u.sectors.map((s) => s.name)),
      );
    } catch (err) {
      console.error('refreshOrgData', err);
      showToast('Erro ao carregar estrutura organizacional', 'warn');
    }
  }, [dbConnected, showToast, stored.selectedCompanyId]);

  const createOrgEntity = useCallback(
    async (level: OrgEntityLevel, parentId: string, name: string) => {
      if (!dbConnected || !stored.selectedCompanyId) {
        showToast('PostgreSQL offline', 'warn');
        return false;
      }
      try {
        const tid = stored.selectedCompanyId;
        if (level === 'unidade') await apiCreateOrgUnit(tid, { name });
        else if (level === 'setor') await apiCreateOrgSector(tid, { name, unitId: parentId });
        else if (level === 'funcao') await apiCreateOrgFunction(tid, { name, sectorId: parentId });
        else if (level === 'atividade') await apiCreateOrgActivity(tid, { name, functionId: parentId });
        else if (level === 'posto') await apiCreateOrgWorkPost(tid, { name, activityId: parentId });
        await refreshOrgData();
        await loadTenantData(tid);
        showToast(`${name} cadastrado`, 'success');
        return true;
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao cadastrar', 'warn');
        return false;
      }
    },
    [dbConnected, loadTenantData, refreshOrgData, showToast, stored.selectedCompanyId],
  );

  const deleteOrgEntity = useCallback(
    async (level: OrgEntityLevel, id: string) => {
      if (!dbConnected || !stored.selectedCompanyId) return false;
      try {
        await apiDeleteOrgEntity(stored.selectedCompanyId, level, id);
        await refreshOrgData();
        showToast('Removido', 'success');
        return true;
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao remover', 'warn');
        return false;
      }
    },
    [dbConnected, refreshOrgData, showToast, stored.selectedCompanyId],
  );

  const value: AppContextValue = {
    screen,
    session: stored.session,
    selectedCompanyId: stored.selectedCompanyId,
    selectedCompany,
    companies,
    dbConnected,
    sectors,
    collaborators: stored.collaborators,
    analyses: stored.analyses,
    reports: stored.reports,
    settings: stored.settings,
    analysisMode: stored.analysisMode,
    reportType: stored.reportType,
    currentAnalysisId,
    currentAnalysis,
    menuOpen,
    toast,
    modal,
    analysisDraft,
    pendingSync,
    liveAngles,
    liveWorkstation,
    go,
    openMenu: () => setMenuOpen(true),
    closeMenu: () => setMenuOpen(false),
    showToast,
    showModal,
    closeModal,
    login,
    verifyMfaLogin,
    submitAccessRequest,
    registerCompany,
    refreshCollaborators,
    refreshCompanies,
    isGlobalAdmin,
    isTenantAdmin,
    tenantMetadata,
    supportStatus,
    supportAudit,
    refreshSupportStatus,
    refreshSupportAudit,
    authorizeSupport,
    revokeSupport,
    accessTenantWithSupport,
    globalSupportMode,
    screenInstant,
    exitGlobalSupport,
    logout,
    selectCompany,
    saveCollaborator,
    setAnalysisDraft: (patch) =>
      setDraft((d) => {
        const baseManual = {
          ...DEFAULT_LOAD_MANUAL_INPUT,
          ...d.loadAssessment?.manual,
        };
        const baseEstimate = d.loadAssessment?.estimate;
        const la = patch.loadAssessment;
        return {
          ...d,
          ...patch,
          loadAssessment: la
            ? {
                manual: { ...baseManual, ...(la.manual ?? {}) },
                estimate: la.estimate !== undefined ? la.estimate : baseEstimate,
              }
            : { manual: baseManual, estimate: baseEstimate },
        };
      }),
    setAnalysisMode: (mode) => setStored((s) => ({ ...s, analysisMode: mode })),
    setReportType: (type) => setStored((s) => ({ ...s, reportType: type })),
    updateSettings: (patch) => setStored((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    updateSession: (patch) => {
      setStored((s) => {
        if (!s.session) return s;
        const session = { ...s.session, ...patch };
        setApiAuthSession(session);
        return { ...s, session };
      });
    },
    openAnalysis: (id) => {
      setCurrentAnalysisId(id);
      setResultDetailsRevealed(true);
      go('result');
    },
    deleteAnalysis,
    resultDetailsRevealed,
    revealResultDetails: () => setResultDetailsRevealed(true),
    captureAnalysis,
    captureVideoAnalysis,
    startSync,
    generateReport,
    exportCurrentAnalysisPdf,
    applyLoadEffortToCurrentAnalysis,
    exportCurrentCaptureImage,
    exportReportPdf,
    offerPdfDownload,
    clearPdfDownloadOffer,
    setLiveAngles,
    setLiveWorkstation,
    planTier,
    canExportPdf,
    getStats,
    riskInventory,
    riskInventorySummary,
    riskInventoryDraft,
    setRiskInventoryDraft,
    refreshRiskInventory,
    openRiskForm,
    saveRiskInventory,
    deleteRiskInventory,
    denunciaDashboard,
    denuncias,
    denunciaDetail,
    denunciaDraft,
    setDenunciaDraft,
    refreshDenuncias,
    submitDenuncia,
    openDenunciaDetail,
    updateDenunciaStatus,
    addDenunciaTreatment,
    addDenunciaEvidence,
    integrateDenuncia,
    concludeDenuncia,
    activeCriteria,
    riskCriteriaMethodologies,
    criteriaDocumentation,
    criteriaAuditTrail,
    refreshRiskCriteria,
    createRiskMethodology,
    activateCriteriaVersion,
    groDashboard,
    groWorkflow,
    groActionPlans,
    groIndicators,
    groHistory,
    groReports,
    groActionPlanDraft,
    groIndicatorDraft,
    setGroActionPlanDraft,
    setGroIndicatorDraft,
    refreshGroData,
    openGroActionPlanForm,
    openGroIndicatorForm,
    saveGroActionPlan,
    deleteGroActionPlan,
    saveGroIndicator,
    deleteGroIndicator,
    advanceGroWorkflow,
    completeGroReview,
    generateGroReport,
    pgrProgram,
    pgrVersions,
    pgrVersionDetail,
    pgrHistory,
    refreshPgrData,
    updatePgrProgram,
    generatePgrVersion,
    openPgrVersion,
    refreshPgrVersion,
    submitPgrApproval,
    approvePgrVersion,
    rejectPgrVersion,
    signPgrVersion,
    startPgrRevision,
    downloadPgrPdf,
    psicoDashboard,
    psicoFatores,
    psicoMatriz,
    psicoConformity,
    psicoActionPlans,
    psicoHistory,
    psicoTrends,
    refreshPsicoData,
    savePsicoFator,
    submitPsicoQuestionnaire,
    savePsicoActionPlan,
    updatePsicoActionStatus,
    deletePsicoActionPlan,
    markPsicoAlertRead,
    aetDashboard,
    aetProcesses,
    aetProcessDetail,
    aetFurniture,
    aetEquipment,
    aetReport,
    refreshAetData,
    createAetProcess,
    openAetProcess,
    advanceAetStage,
    saveAetVibracaoCorpo,
    saveAetVibracaoMaos,
    saveAetTeleatendimento,
    saveAetOrganizacao,
    saveAetMetodos,
    saveAetFurniture,
    saveAetEquipment,
    generateAetReport,
    signAet,
    downloadAetPdf,
    aetVersionDetail,
    aetVersions,
    aetHistory,
    aetIntegrations,
    refreshAetVersion,
    createAetVersion: createAetVersionCorp,
    refreshAetVersionSnapshot,
    generateAetVersionReport,
    submitAetApproval,
    approveAetVersion,
    rejectAetVersion,
    signAetVersion,
    startAetRevision,
    saveAetTechnicalResponsible,
    sstDashboard,
    sstApr,
    sstEpi,
    sstEpc,
    sstInspecoes,
    sstAuditorias,
    sstNc,
    sstCapa,
    sstTreinamentos,
    sstReport,
    refreshSstData,
    createSstApr,
    createSstEpi,
    createSstEpc,
    createSstInspecao,
    createSstAuditoria,
    createSstNc,
    createSstCapa,
    createSstTreinamento,
    generateSstReport,
    downloadSstPdf,
    esocialDashboard,
    esocialConfig,
    esocialEventos,
    esocialHistory,
    refreshEsocialData,
    createEsocialEvent,
    validateEsocialEvent,
    signEsocialEvent,
    downloadEsocialXml,
    prepareEsocialEnvio,
    transmitEsocialEvent,
    resendEsocialEvent,
    consultEsocialStatus,
    updateEsocialConfig,
    complianceDashboard,
    complianceFontes,
    complianceNormas,
    complianceNormaVersoes,
    complianceDeteccoes,
    complianceAlertas,
    complianceImpactos,
    complianceSystemImpacts,
    complianceClientImpacts,
    complianceTasks,
    complianceSchedule,
    complianceVersionCompare,
    complianceReports,
    refreshComplianceData,
    runComplianceScan,
    updateComplianceFonte,
    loadNormaVersoes,
    compareNormVersions,
    loadDetectionImpactos,
    validateComplianceDetection,
    updateComplianceTask,
    updateComplianceSchedule: updateComplianceScheduleCtx,
    markComplianceAlertRead,
    generateComplianceReport,
    downloadComplianceReport,
    orgTree,
    refreshOrgData,
    createOrgEntity,
    deleteOrgEntity,
  };

  useEffect(() => {
    if (!import.meta.env.DEV && import.meta.env.VITE_E2E !== 'true') return;

    window.__ERGOSENSE_E2E__ = {
      go,
      getScreen: () => e2eStateRef.current.screen,
      openRiskForm: () => openRiskForm(),
      openDenunciaDetail,
      openPgrVersion,
      openAetProcess,
      openAnalysis: (id: string) => {
        setCurrentAnalysisId(id);
        setResultDetailsRevealed(true);
        go('result');
      },
      prepareCamera: () => {
        const { stored: s, setDraft: patchDraft } = e2eStateRef.current;
        const collab = s.collaborators[0];
        if (collab) {
          patchDraft((d) => ({
            ...d,
            collaboratorId: collab.id,
            setor: collab.setor ?? d.setor,
          }));
        }
      },
      refreshLists: async () => {
        await Promise.all([refreshDenuncias(), refreshPgrData(), refreshAetData()]);
      },
      getFirstIds: () => {
        const { denuncias: d, pgrVersions: p, aetProcesses: a, stored: s } = e2eStateRef.current;
        return {
          denuncia: d[0]?.id ?? null,
          pgr: p[0]?.id ?? null,
          aet: a[0]?.id ?? null,
          analysis: s.analyses[0]?.id ?? null,
        };
      },
    };

    return () => {
      delete window.__ERGOSENSE_E2E__;
    };
  }, [go, openRiskForm, openDenunciaDetail, openPgrVersion, openAetProcess, refreshDenuncias, refreshPgrData, refreshAetData]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook exportado junto ao provider
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
