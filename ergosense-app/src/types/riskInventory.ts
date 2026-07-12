import type { RiskLevel } from './index';

/** Tipos de risco — NR-01 / GRO */
export type RiskInventoryType =
  | 'FISICO'
  | 'QUIMICO'
  | 'BIOLOGICO'
  | 'ERGONOMICO'
  | 'ACIDENTE'
  | 'PSICOSSOCIAL';

export type RiskInventoryStatus = 'ativo' | 'revisao' | 'arquivado';

export type RiskInventoryLinkModule = 'ANALISE' | 'AET' | 'GRO' | 'PGR';

export interface RiskInventoryEvidence {
  type: string;
  description: string;
  reference: string;
  hash?: string;
  createdAt?: string;
}

export interface RiskInventoryLink {
  id?: string;
  module: RiskInventoryLinkModule;
  entityId: string;
  label: string;
  required?: boolean;
  createdAt?: string;
}

export interface RiskInventoryItem {
  id: string;
  tenantId: string;
  type: RiskInventoryType;
  sectorId: string | null;
  sectorName: string | null;
  collaboratorId: string | null;
  collaboratorName: string | null;
  unitId: string | null;
  unitName: string | null;
  functionId: string | null;
  functionName: string | null;
  activityId: string | null;
  activityName: string | null;
  workPostId: string | null;
  workPostName: string | null;
  orgChain?: import('./org').OrgChain | null;
  generatingSource: string;
  hazard: string;
  consequence: string;
  probability: number;
  severity: number;
  riskScore: number;
  riskLevel: RiskLevel;
  exposureDuration: string;
  exposureFrequency: string;
  exposureIntensity: string;
  exposedWorkersCount: number;
  homogeneousExposureGroup: string;
  existingMeasures: string;
  controlMeasures: string;
  evidences: RiskInventoryEvidence[];
  analysisId: string | null;
  aetProcessId: string | null;
  pgrVersionId: string | null;
  responsible: string;
  reviewDate: string | null;
  status: RiskInventoryStatus;
  groStage?: import('./gro').GroStage;
  originModule?: string | null;
  originEntityId?: string | null;
  links?: RiskInventoryLink[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RiskInventorySummary {
  total: number;
  byLevel: Record<RiskLevel, number>;
  overdueReviews: number;
  reviewsDue30Days: number;
  nr015732Complete?: number;
  byType: Partial<Record<RiskInventoryType, number>>;
  matrix: Array<{
    severity: number;
    probability: number;
    count: number;
    score: number;
  }>;
}

export interface RiskInventoryFormData {
  type: RiskInventoryType;
  sectorName: string;
  collaboratorId: string;
  workPostId: string;
  generatingSource: string;
  hazard: string;
  consequence: string;
  probability: number;
  severity: number;
  exposureDuration: string;
  exposureFrequency: string;
  exposureIntensity: string;
  exposedWorkersCount: number;
  homogeneousExposureGroup: string;
  existingMeasures: string;
  controlMeasures: string;
  evidences: RiskInventoryEvidence[];
  analysisId: string;
  aetProcessId: string;
  responsible: string;
  reviewDate: string;
  status: RiskInventoryStatus;
}

export const RISK_INVENTORY_TYPES: Array<{ value: RiskInventoryType; label: string; icon: string }> = [
  { value: 'FISICO', label: 'Físicos', icon: '🔊' },
  { value: 'QUIMICO', label: 'Químicos', icon: '☣️' },
  { value: 'BIOLOGICO', label: 'Biológicos', icon: '🦠' },
  { value: 'ERGONOMICO', label: 'Ergonômicos', icon: '🪑' },
  { value: 'ACIDENTE', label: 'Acidentes', icon: '⚠️' },
  { value: 'PSICOSSOCIAL', label: 'Psicossociais', icon: '🧠' },
];

export const EXPOSURE_FREQUENCY_OPTIONS = [
  'Contínua / diária',
  'Semanal',
  'Mensal',
  'Eventual / esporádica',
  'Sazonal',
];

export function computeClientRiskLevel(probability: number, severity: number): RiskLevel {
  const score = probability * severity;
  if (score >= 16) return 'critico';
  if (score >= 10) return 'alto';
  if (score >= 5) return 'medio';
  return 'baixo';
}

export function riskTypeLabel(type: RiskInventoryType): string {
  return RISK_INVENTORY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export const EMPTY_RISK_FORM: RiskInventoryFormData = {
  type: 'ERGONOMICO',
  sectorName: '',
  collaboratorId: '',
  workPostId: '',
  generatingSource: '',
  hazard: '',
  consequence: '',
  probability: 3,
  severity: 3,
  exposureDuration: '',
  exposureFrequency: 'Contínua / diária',
  exposureIntensity: '',
  exposedWorkersCount: 1,
  homogeneousExposureGroup: '',
  existingMeasures: '',
  controlMeasures: '',
  evidences: [],
  analysisId: '',
  aetProcessId: '',
  responsible: '',
  reviewDate: '',
  status: 'ativo',
};
