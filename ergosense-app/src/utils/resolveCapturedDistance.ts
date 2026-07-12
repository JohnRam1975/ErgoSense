import type { Analysis } from '../types';

/** Distância carga ↔ corpo registrada na sessão (câmera, cálculo ou estimativa). */
export function resolveCapturedDistanceCm(analysis: Analysis): number {
  const effort = analysis.loadEffort ?? analysis.loadAssessment?.effort;
  if (effort?.distanceCm && effort.distanceCm > 0) return effort.distanceCm;

  const manual = analysis.loadManual ?? analysis.loadAssessment?.manual;
  if (manual?.measuredDistanceCm && manual.measuredDistanceCm > 0) {
    return manual.measuredDistanceCm;
  }

  if (analysis.loadEstimate?.distanceCm && analysis.loadEstimate.distanceCm > 0) {
    return analysis.loadEstimate.distanceCm;
  }

  if (analysis.loadAssessment?.estimate?.distanceCm && analysis.loadAssessment.estimate.distanceCm > 0) {
    return analysis.loadAssessment.estimate.distanceCm;
  }

  if (analysis.loadParams?.distanceCm && analysis.loadParams.distanceCm > 0) {
    return analysis.loadParams.distanceCm;
  }

  if (analysis.loadResult?.distanceCmUsed && analysis.loadResult.distanceCmUsed > 0) {
    return analysis.loadResult.distanceCmUsed;
  }

  return 0;
}
