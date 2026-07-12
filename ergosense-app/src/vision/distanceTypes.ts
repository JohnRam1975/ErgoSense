/**
 * Módulo 2 — Medição de distância (monocular, AR, híbrido)
 */
export type DistanceTarget = 'carga' | 'bancada' | 'monitor' | 'ferramenta';
export type DistanceMethod = 'hands' | 'tap' | 'monocular' | 'ar' | 'hybrid' | 'estimate';

export interface DistanceMeasurement {
  target: DistanceTarget;
  cm: number;
  meters: number;
  confidence: number;
  method: DistanceMethod;
  precisionCm: number;
  timestamp: number;
}

export function createDistanceMeasurement(
  target: DistanceTarget,
  cm: number,
  method: DistanceMethod,
  confidence = 0.75,
): DistanceMeasurement {
  const precisionCm = method === 'ar' ? 2 : method === 'hybrid' ? 3 : 5;
  return {
    target,
    cm: Math.round(cm * 10) / 10,
    meters: Math.round((cm / 100) * 1000) / 1000,
    confidence,
    method,
    precisionCm,
    timestamp: Date.now(),
  };
}

export function estimateBenchDistanceCm(shoulderWidthPx: number, objectOffsetPx: number): number {
  if (shoulderWidthPx <= 0) return 0;
  const scale = 42 / shoulderWidthPx;
  return Math.round(objectOffsetPx * scale * 10) / 10;
}

export function estimateMonitorDistanceCm(telaDistanciaCm: number): DistanceMeasurement | null {
  if (telaDistanciaCm <= 0) return null;
  return createDistanceMeasurement('monitor', telaDistanciaCm, 'monocular', 0.7);
}
