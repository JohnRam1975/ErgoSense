import type { RiskLevel } from './index';

export type MatrixType = 'PROB_SEV_5X5' | 'PROB_SEV_3X3';

export interface CriteriaScaleItem {
  value: number;
  label: string;
  description: string;
}

export interface CriteriaThreshold {
  level: RiskLevel;
  minScore: number;
  maxScore: number;
  acceptable: boolean;
  label: string;
  color: string;
}

export interface CriteriaConfig {
  matrixType: MatrixType;
  scoreMethod: 'PRODUCT' | 'SUM';
  scaleMin: number;
  scaleMax: number;
  nr01Reference: string;
  probability: CriteriaScaleItem[];
  severity: CriteriaScaleItem[];
  thresholds: CriteriaThreshold[];
  acceptability: {
    acceptableLevels: RiskLevel[];
    requiresImmediateAction: RiskLevel[];
    requiresActionPlanFrom: RiskLevel;
  };
  cellOverrides: Record<string, { level?: RiskLevel; acceptable?: boolean; score?: number }> | null;
}

export interface CriteriaMatrixCell {
  probability: number;
  severity: number;
  score: number;
  level: RiskLevel;
  acceptable: boolean;
  probabilityLabel: string;
  severityLabel: string;
  levelLabel?: string;
}

export interface ActiveCriteria {
  methodologyId: string | null;
  versionId: string | null;
  versionNumber: number;
  name: string;
  description: string;
  matrixType: MatrixType;
  config: CriteriaConfig;
  matrix: CriteriaMatrixCell[];
  activatedAt: string | null;
  isDefault: boolean;
}

export interface RiskMethodology {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  matrixType: MatrixType;
  activeVersionId: string | null;
  activeVersionNumber: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CriteriaVersion {
  id: string;
  methodologyId: string;
  versionNumber: number;
  status: 'rascunho' | 'ativa' | 'obsoleta';
  notes: string;
  config: CriteriaConfig;
  documentation: CriteriaDocumentation | null;
  createdByName: string | null;
  createdAt: string;
  activatedAt: string | null;
}

export interface CriteriaDocumentation {
  generatedAt: string;
  nr01Reference: string;
  methodologyName: string | null;
  versionNumber: number | null;
  matrixType: MatrixType;
  markdown: string;
  probability: CriteriaScaleItem[];
  severity: CriteriaScaleItem[];
  thresholds: CriteriaThreshold[];
  acceptability: CriteriaConfig['acceptability'];
  matrix: CriteriaMatrixCell[];
}

export interface CriteriaAuditEntry {
  id: string;
  tenantId: string;
  methodologyId: string | null;
  versionId: string | null;
  action: string;
  details: Record<string, unknown>;
  userId: string | null;
  userName: string | null;
  ip: string | null;
  createdAt: string;
}

export interface RiskEvaluation {
  probability: number;
  severity: number;
  score: number;
  level: RiskLevel;
  criticality: RiskLevel;
  acceptable: boolean;
  probabilityLabel: string;
  severityLabel: string;
  levelLabel: string;
  matrixType: MatrixType;
  methodologyId: number | null;
  versionId: number | null;
  versionNumber: number;
  methodologyName: string;
}

export const CRITERIA_ACTION_LABELS: Record<string, string> = {
  METODOLOGIA_PADRAO_CRIADA: 'Metodologia padrão criada',
  METODOLOGIA_CRIADA: 'Metodologia criada',
  VERSAO_CRIADA: 'Versão criada',
  VERSAO_ATIVADA: 'Versão ativada',
};

export function criteriaLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'critico':
      return 'var(--red)';
    case 'alto':
      return '#f97316';
    case 'medio':
      return 'var(--amber)';
    default:
      return 'var(--green)';
  }
}
