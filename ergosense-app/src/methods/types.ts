import type { RiskBand } from '../config/ergonomicCriteriaMaster';
import type { JointAngles } from '../types';
import type { LoadParams } from '../types/loadAssessment';
import type { WorkstationMetrics } from '../types/workstation';
import type { AnthropometryProfile } from '../services/anthropometry';
import type { EnvironmentalInput } from '../services/environmental';
import type { RosaChecklistInput } from './rosa';
import type { OcraChecklistInput } from './ocra';
import type { QecInput } from './qec';
import type { NasaTlxInput } from './nasaTlx';
import type { DistanceMeasurement } from '../vision/distanceTypes';
import type { DetectedObject } from '../vision/objectDetection';
import type { PostureClassification } from '../vision/enhancedPose';

export interface ErgonomicMethodResult {
  methodId: string;
  methodName: string;
  score: number;
  classification: RiskBand;
  classificationLabel: string;
  inputs: Record<string, number | string | boolean>;
  outputs: Record<string, number | string>;
  normReference: string;
  recommendation: string[];
}

export interface MethodSessionInput {
  angles: JointAngles;
  loadParams?: LoadParams | null;
  workstation?: WorkstationMetrics | null;
  anthropometry?: AnthropometryProfile | null;
  environmental?: EnvironmentalInput | null;
  rosa?: RosaChecklistInput | null;
  ocra?: OcraChecklistInput | null;
  qec?: QecInput | null;
  nasaTlx?: NasaTlxInput | null;
  distances?: DistanceMeasurement[];
  objects?: DetectedObject[];
  posture?: PostureClassification | null;
  sex?: 'M' | 'F';
  videoFrameCount?: number;
  exposureSecs?: number;
}

export interface V2SessionReport {
  version: string;
  criteriaVersion: string;
  computedAt: string;
  methods: ErgonomicMethodResult[];
  posture: PostureClassification | null;
  aiReport?: import('../services/aiErgonomist').AiErgonomistReport;
  videoSummary?: import('../services/videoAnalysis').VideoAnalysisSummary;
  videoErgonomicReport?: import('../types/videoErgo').VideoErgonomicReport;
}
