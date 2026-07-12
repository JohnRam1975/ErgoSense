import type { RiskLevel } from './index';
import type { ErgonomicMethodResult } from '../methods/types';
import type { JointAngles } from './index';
import type { VideoFrameSample } from '../services/videoAnalysis';

export type ErgoHeatmapLevel = 'seguro' | 'atencao' | 'risco' | 'critico';

export type BodyRegionId =
  | 'cabeca'
  | 'pescoco'
  | 'ombroD'
  | 'ombroE'
  | 'tronco'
  | 'lombar'
  | 'bracoD'
  | 'bracoE'
  | 'punhoD'
  | 'punhoE'
  | 'quadril'
  | 'joelhoD'
  | 'joelhoE'
  | 'tornozeloD'
  | 'tornozeloE';

export interface BodyRegionExposure {
  regionId: BodyRegionId;
  label: string;
  exposurePct: number;
  adequatePct: number;
  level: ErgoHeatmapLevel;
  primaryIssue?: string;
}

export interface ErgoTimelineEvent {
  timestampMs: number;
  timeLabel: string;
  type: 'risco' | 'correcao' | 'repeticao' | 'carga' | 'postura';
  severity: RiskLevel;
  message: string;
  region?: BodyRegionId;
}

export interface RepetitiveMovementAnalysis {
  movementsPerMinute: number;
  cycleCount: number;
  frequencyClass: RiskLevel;
  classificationLabel: string;
  dominantRegion: string;
}

export interface LoadLiftEvent {
  timestampMs: number;
  timeLabel: string;
  estimatedWeightKg: number;
  distanceFromBodyCm: number;
  liftHeightCm: number;
  nioshLi: number;
  riskLevel: RiskLevel;
}

export interface VideoErgoScores {
  rula: { score: number; actionLevel: string; justification: string };
  reba: { score: number; riskLevel: string };
  owas: { class: number; label: string };
  nr17: { compliant: boolean; compliancePct: number; gaps: string[] };
  ergonomicIndex: number;
  safetyScore: number;
}

export interface VideoErgoRecommendation {
  problema: string;
  causaProvavel: string;
  impacto: string;
  nivelRisco: RiskLevel;
  acaoCorretiva: string;
  prioridade: 'alta' | 'media' | 'baixa';
  beneficioEsperado: string;
}

export interface VideoErgoExecutiveMetrics {
  ergonomicIndex: number;
  safetyScore: number;
  nr17CompliancePct: number;
  riskRanking: { label: string; score: number; pct: number }[];
  trend: 'melhorando' | 'estavel' | 'piorando';
}

import type { JourneyAnalysis } from '../vision/journeyAnalyzer';

export interface VideoErgonomicReport {
  version: string;
  source: 'live' | 'upload' | 'offline_sync';
  processedAt: string;
  frameCount: number;
  durationSecs: number;
  samplesPerSec: number;
  frames: VideoFrameSample[];
  worstAngles: JointAngles;
  exposureByRegion: BodyRegionExposure[];
  timeline: ErgoTimelineEvent[];
  repetitiveMovement: RepetitiveMovementAnalysis;
  loadLifts: LoadLiftEvent[];
  journey?: JourneyAnalysis;
  scores: VideoErgoScores;
  methods: ErgonomicMethodResult[];
  recommendations: VideoErgoRecommendation[];
  executive: VideoErgoExecutiveMetrics;
  postureModes: Record<string, number>;
  captureThumbnail?: string;
  modelVersion: string;
}

export interface VideoAnalysisProgress {
  phase: 'idle' | 'loading_model' | 'extracting' | 'analyzing' | 'complete' | 'error';
  progressPct: number;
  framesProcessed: number;
  totalFrames: number;
  message: string;
}

export interface MlFeedbackEntry {
  id: string;
  analysisId: string;
  region: BodyRegionId;
  predictedLevel: ErgoHeatmapLevel;
  correctedLevel: ErgoHeatmapLevel;
  ergonomistNotes?: string;
  createdAt: string;
}
