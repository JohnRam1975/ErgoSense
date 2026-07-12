/**
 * Motor principal: índice de esforço = peso (kg) × distância (cm).
 */

import { classifyEffortIndex } from '../config/loadRiskConfig';
import type { RiskLevel } from '../types';

export class LoadRiskValidationError extends Error {
  readonly field: 'weightKg' | 'distanceCm';

  constructor(message: string, field: 'weightKg' | 'distanceCm') {
    super(message);
    this.name = 'LoadRiskValidationError';
    this.field = field;
  }
}

export interface LoadEffortResult {
  weightKg: number;
  distanceCm: number;
  distanceM: number;
  indiceEsforco: number;
  risk: RiskLevel;
  recomendacao: string;
  calculatedAt: string;
}

export function validateLoadInputs(weightKg: number, distanceCm: number): void {
  if (weightKg === 0 || Number.isNaN(weightKg)) {
    throw new LoadRiskValidationError('Informe o peso da carga em kg (maior que zero).', 'weightKg');
  }
  if (weightKg < 0) {
    throw new LoadRiskValidationError('O peso não pode ser negativo.', 'weightKg');
  }
  if (distanceCm === 0 || Number.isNaN(distanceCm)) {
    throw new LoadRiskValidationError('Meça ou informe a distância da carga ao corpo.', 'distanceCm');
  }
  if (distanceCm < 0) {
    throw new LoadRiskValidationError('A distância não pode ser negativa.', 'distanceCm');
  }
}

export function recommendForLoadRisk(risk: RiskLevel): string {
  switch (risk) {
    case 'baixo':
      return 'Condição aceitável. Mantenha boas práticas de postura e técnica de levantamento.';
    case 'medio':
      return 'Avalie aproximar a carga ao corpo e reduzir o tempo de exposição à tarefa.';
    case 'alto':
      return 'A carga está distante do corpo para o peso informado. Aproxime a carga ao tronco, reduza o peso ou revise o método de trabalho.';
    case 'critico':
      return 'Não recomendado executar manualmente nessas condições. Use auxílio mecânico, divida a carga ou redesenhe a atividade.';
  }
}

/** Índice = peso × distância; classificação por faixas configuráveis */
export function calculateErgonomicLoadRisk(weightKg: number, distanceCm: number): LoadEffortResult {
  validateLoadInputs(weightKg, distanceCm);
  const w = Math.round(weightKg * 100) / 100;
  const d = Math.round(distanceCm * 10) / 10;
  const indiceEsforco = Math.round(w * d);
  const risk = classifyEffortIndex(indiceEsforco);
  return {
    weightKg: w,
    distanceCm: d,
    distanceM: Math.round((d / 100) * 1000) / 1000,
    indiceEsforco,
    risk,
    recomendacao: recommendForLoadRisk(risk),
    calculatedAt: new Date().toISOString(),
  };
}

export function effortReductionPct(currentIndex: number, newIndex: number): number {
  if (currentIndex <= 0) return 0;
  const reduction = ((currentIndex - newIndex) / currentIndex) * 100;
  return Math.max(0, Math.round(reduction));
}

export function simulateLoadImprovement(
  current: LoadEffortResult,
  newWeightKg: number,
  newDistanceCm: number,
): { result: LoadEffortResult; reductionPct: number } {
  const result = calculateErgonomicLoadRisk(newWeightKg, newDistanceCm);
  return {
    result,
    reductionPct: effortReductionPct(current.indiceEsforco, result.indiceEsforco),
  };
}

export function scoreFromEffortRisk(risk: RiskLevel): number {
  const map: Record<RiskLevel, number> = {
    baixo: 18,
    medio: 42,
    alto: 68,
    critico: 88,
  };
  return map[risk];
}

export function formatDistanceDisplay(distanceCm: number): string {
  const m = distanceCm / 100;
  return `${distanceCm} cm (${m.toFixed(2)} m)`;
}
