/**
 * Log de auditoria completo por avaliação — evidências técnicas rastreáveis.
 */
import type { JointAngles } from '../types';
import type { WorkstationMetrics } from '../types/workstation';
import type { LoadParams } from '../types/loadAssessment';
import type { LoadEffortResult } from '../utils/calculateErgonomicLoadRisk';
import type { JointConfidenceMap } from '../utils/poseConfidence';
import type { EnvironmentalInput } from './environmental';
import type { AssessmentTraceability } from './assessmentTraceability';

export interface AssessmentAuditLog {
  id: string;
  traceability: AssessmentTraceability;
  durationSecs: number;
  sampleCount: number;
  angles: JointAngles;
  workstation?: WorkstationMetrics;
  environmental?: EnvironmentalInput;
  loadParams?: LoadParams | null;
  loadEffort?: LoadEffortResult | null;
  weightKg?: number;
  distanceCm?: number;
  lux?: number;
  temperatureC?: number;
  noiseDbA?: number;
  captureImagePresent: boolean;
  videoUsed: boolean;
  poseConfidence?: JointConfidenceMap;
  algorithmSteps: string[];
}

export function buildAssessmentAuditLog(params: {
  traceability: AssessmentTraceability;
  durationSecs: number;
  sampleCount: number;
  angles: JointAngles;
  workstation?: WorkstationMetrics;
  environmental?: EnvironmentalInput;
  loadParams?: LoadParams | null;
  loadEffort?: LoadEffortResult | null;
  captureImage?: string;
  videoUsed?: boolean;
  poseConfidence?: JointConfidenceMap;
}): AssessmentAuditLog {
  const steps: string[] = [
    `Captura iniciada — ${params.durationSecs}s, ${params.sampleCount} amostras @ ~1 Hz`,
    `Ângulos agregados: lombar ${params.angles.lombar}°, pescoço ${params.angles.pescoco}°, ombro D ${params.angles.ombroD}°`,
  ];
  if (params.workstation) {
    steps.push(
      `Posto: tela ${params.workstation.telaDistanciaCm} cm, lux ${params.workstation.lux}, azul ${params.workstation.indiceAzul}%`,
    );
  }
  if (params.environmental) {
    steps.push(
      `Ambiente: lux ${params.environmental.lux ?? '—'}, IBUTG ${params.environmental.ibutgCelsius ?? '—'}°C, ruído ${params.environmental.noiseDbA ?? '—'} dB(A)`,
    );
  }
  if (params.loadEffort) {
    steps.push(
      `Carga: ${params.loadEffort.weightKg} kg a ${params.loadEffort.distanceCm} cm — índice ${params.loadEffort.indiceEsforco}`,
    );
  }
  if (params.poseConfidence) {
    steps.push(`Confiança IA pose: ${params.poseConfidence.overall}% (limiar 80%)`);
  }

  return {
    id: `audit-${Date.now()}`,
    traceability: params.traceability,
    durationSecs: params.durationSecs,
    sampleCount: params.sampleCount,
    angles: params.angles,
    workstation: params.workstation,
    environmental: params.environmental,
    loadParams: params.loadParams,
    loadEffort: params.loadEffort,
    weightKg: params.loadEffort?.weightKg ?? params.loadParams?.weightKg,
    distanceCm: params.loadEffort?.distanceCm ?? params.loadParams?.distanceCm,
    lux: params.workstation?.lux ?? params.environmental?.lux,
    temperatureC: params.environmental?.ibutgCelsius,
    noiseDbA: params.environmental?.noiseDbA,
    captureImagePresent: !!params.captureImage,
    videoUsed: params.videoUsed ?? false,
    poseConfidence: params.poseConfidence,
    algorithmSteps: steps,
  };
}
