export type ComplianceEventType = 'NOVA_NORMA' | 'REVISAO' | 'REVOGACAO' | 'RETIFICACAO' | 'ORIGINAL';

export type ComplianceDetectionStatus = 'PENDENTE_VALIDACAO' | 'APROVADA' | 'REJEITADA';

export type ComplianceNormStatus = 'VIGENTE' | 'REVOGADA' | 'SUSPENSA';

export type ComplianceSourceCode = 'MTE' | 'DOU' | 'FUNDACENTRO' | 'ESOCIAL';

export interface ComplianceHistoryEntry {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string | null;
  userName?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface ComplianceDashboard {
  pendingValidation: number;
  approved: number;
  rejected: number;
  unreadAlerts: number;
  criticalAlerts: number;
  vigenteNorms: number;
  revokedNorms: number;
  pendingTasks?: number;
  lastScan: string | null;
  humanValidationRequired: boolean;
  autoApplyDisabled: boolean;
  recentHistory?: ComplianceHistoryEntry[];
}

export interface ComplianceFonte {
  id: string;
  code: ComplianceSourceCode;
  name: string;
  monitorUrl: string;
  active: boolean;
  intervalHours: number;
  lastScan: string | null;
  lastStatus: string | null;
}

export interface ComplianceNormaVersao {
  id: string;
  normId: string;
  versionNumber: string;
  sequence: number;
  changeType: ComplianceEventType;
  summary: string;
  fullText?: string;
  publishedAt: string;
  effectiveAt?: string;
  douReference?: string;
  validated: boolean;
  validatedBy?: string;
  validatedAt?: string;
  createdAt: string;
}

export interface ComplianceNorma {
  id: string;
  code: string;
  title: string;
  agency: string;
  source: ComplianceSourceCode;
  area?: string;
  status: ComplianceNormStatus;
  impactedModules: string[];
  currentVersion?: {
    number: string;
    changeType?: ComplianceEventType;
    publishedAt?: string;
    validated?: boolean;
  } | null;
  updatedAt: string;
}

export interface ComplianceDeteccao {
  id: string;
  source: ComplianceSourceCode;
  eventType: ComplianceEventType;
  normId?: string | null;
  normCode: string;
  title: string;
  summary: string;
  originUrl?: string;
  publishedAt?: string;
  status: ComplianceDetectionStatus;
  impactLevel: string;
  affectedModules: string[];
  detectedAt: string;
}

export interface ComplianceAlerta {
  id: string;
  detectionId?: string | null;
  severity: string;
  title: string;
  message: string;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface ComplianceImpacto {
  id: string;
  detectionId: string;
  module: string;
  impactDescription: string;
  recommendedAction: string;
  deadlineDays: number;
  legalRisk: string;
}

export interface ComplianceValidacao {
  id: string;
  detectionId: string;
  decision: string;
  validatorName: string;
  validatorRole?: string;
  justification: string;
  applyRules: boolean;
  createdAt: string;
}

export interface ComplianceReportSummary {
  id: string;
  type?: string;
  title: string;
  generatedBy?: string;
  createdAt: string;
}

export interface ComplianceReport extends ComplianceReportSummary {
  generatedAt: string;
  disclaimer: string;
  dashboard: ComplianceDashboard;
  pendingDetections: ComplianceDeteccao[];
  norms: ComplianceNorma[];
  legalImpacts: (ComplianceImpacto & { detectionTitle?: string })[];
  policy: {
    humanValidationRequired: boolean;
    autoApplyRules: boolean;
    sources: string[];
  };
}

export interface ComplianceScanResult {
  scannedSources: number;
  newDetections: number;
  message?: string;
}

export interface ComplianceValidationResult {
  status: ComplianceDetectionStatus;
  autoApplyExecuted: boolean;
  flaggedModules?: string[];
  notice?: string;
}

export interface ComplianceSystemImpact {
  id: string;
  detectionId: string;
  module: string;
  component: string;
  description: string;
  severity: string;
  systemAction: string;
  requiresUpdate: boolean;
}

export interface ComplianceClientImpact {
  id: string;
  detectionId: string;
  clientProfile: string;
  description: string;
  urgency: string;
  suggestedCommunication: string;
}

export interface ComplianceDetectionImpacts {
  legal: ComplianceImpacto[];
  system: ComplianceSystemImpact[];
  clients: ComplianceClientImpact[];
}

export interface ComplianceAdequationTask {
  id: string;
  detectionId: string | null;
  title: string;
  description: string;
  module: string;
  responsible: string;
  deadline: string | null;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  priority: string;
  origin: string;
}

export interface ComplianceSchedule {
  tenantId: string;
  active: boolean;
  intervalHours: number;
  lastRun: string | null;
  nextRun: string | null;
  lastResult: string | null;
}

export interface ComplianceScanRun {
  id: string;
  type: string;
  detected: number;
  duplicates: number;
  status: string;
  durationMs: number;
  startedAt: string;
}

export interface ComplianceVersionCompare {
  normId: string;
  from: { id: string; versionNumber: string; changeType: string };
  to: { id: string; versionNumber: string; changeType: string; validatedBy?: string };
  diff: {
    summary: string;
    stats: { added: number; removed: number; unchanged: number };
    added: string[];
    removed: string[];
  };
}
