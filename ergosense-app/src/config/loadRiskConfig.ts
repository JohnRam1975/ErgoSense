import type { RiskLevel } from '../types';

/** Faixas do índice de esforço (pesoKg × distanciaCm) — ajustáveis */
export const LOAD_EFFORT_RISK_BANDS = {
  baixo: { min: 0, max: 300 },
  medio: { min: 301, max: 700 },
  alto: { min: 701, max: 1200 },
  critico: { min: 1201, max: Number.POSITIVE_INFINITY },
} as const;

export function classifyEffortIndex(indice: number): RiskLevel {
  if (indice <= LOAD_EFFORT_RISK_BANDS.baixo.max) return 'baixo';
  if (indice <= LOAD_EFFORT_RISK_BANDS.medio.max) return 'medio';
  if (indice <= LOAD_EFFORT_RISK_BANDS.alto.max) return 'alto';
  return 'critico';
}
