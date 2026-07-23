/**
 * Rótulos de nível de risco (matriz / badges) — compartilhado entre módulos NR-01.
 */
import type { RiskLevel } from '../types';

export type RiskNivelCode = RiskLevel | 'critico' | 'alto' | 'medio' | 'baixo';

/** Rótulo em caixa alta para badges de matriz (inventário, psico, etc.). */
export function riskNivelLabelUpper(n: RiskNivelCode): string {
  return n === 'critico' ? 'CRÍTICO' : n === 'alto' ? 'ALTO' : n === 'medio' ? 'MÉDIO' : 'BAIXO';
}
