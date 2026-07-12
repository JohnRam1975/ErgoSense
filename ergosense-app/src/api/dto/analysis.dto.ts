/**
 * DTOs HTTP — análises ergonômicas (client ↔ Express API).
 */

import type {
  ActivityContext,
  AnalysisMode,
  JointAngles,
  ReportType,
  RiskLevel,
} from '../../types';
import type {
  LoadAssessmentManualInput,
  LoadAssessmentSnapshot,
  LoadDistanceEstimate,
  LoadParams,
  LoadRiskResult,
} from '../../types/loadAssessment';
import type { WorkstationMetrics } from '../../types/workstation';
import type { Nr17SessionReport } from '../../utils/nr17';

/** Corpo POST /api/analyses */
export interface AnalysisCreateDto {
  tenantId: string;
  id?: string;
  collaboratorId: string;
  collaboratorName: string;
  setor: string;
  activity: string;
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
  synced?: boolean;
  captureImage?: string;
  videoRecording?: {
    data: string;
    mimeType: string;
    format: 'mp4' | 'webm';
    durationSecs?: number;
    sizeBytes?: number;
  };
  recordingSecs?: number;
  maxRiskStreakSecs?: number;
  totalRiskSecs?: number;
  sessionSampleCount?: number;
  workstation?: WorkstationMetrics;
  nr17Report?: Nr17SessionReport;
  reportId?: string;
  /** Legado — preferir loadAssessment */
  loadParams?: LoadParams;
  loadResult?: LoadRiskResult;
  loadEstimate?: LoadDistanceEstimate;
  loadManual?: LoadAssessmentManualInput;
  loadAssessment?: LoadAssessmentSnapshot;
  v2Report?: import('../../methods/types').V2SessionReport;
}

/** Resposta GET /api/analyses e POST (id) */
export interface AnalysisResponseDto {
  id: string;
  collaboratorId: string;
  collaboratorName: string;
  setor: string;
  activity: string;
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
  videoFormat?: 'mp4' | 'webm';
  videoMimeType?: string;
  recordingSecs?: number;
  maxRiskStreakSecs?: number;
  totalRiskSecs?: number;
  sessionSampleCount?: number;
  workstation?: WorkstationMetrics;
  nr17Report?: Nr17SessionReport;
  loadParams?: LoadParams;
  loadResult?: LoadRiskResult;
  loadEstimate?: LoadDistanceEstimate;
  loadManual?: LoadAssessmentManualInput;
  loadAssessment?: LoadAssessmentSnapshot;
}

export interface ReportResponseDto {
  id: string;
  title: string;
  subtitle: string;
  size: string;
  status: 'ready' | 'generating';
  type: ReportType;
  analysisId?: string;
}
