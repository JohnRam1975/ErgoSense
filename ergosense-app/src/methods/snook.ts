import type { ErgonomicMethodResult } from './types';
import type { RiskBand } from '../config/ergonomicCriteriaMaster';

export interface SnookInput {
  weightKg: number;
  distanceCm: number;
  frequencyPerHour: number;
  sex: 'M' | 'F';
}

/** Snook & Ciriello — percentil populacional estimado */
export function calculateSnook(input: SnookInput): ErgonomicMethodResult {
  const baseCap = input.sex === 'M' ? 25 : 18;
  const distPenalty = Math.max(0, (input.distanceCm - 25) * 0.15);
  const freqPenalty = Math.max(0, (input.frequencyPerHour - 60) * 0.01);
  const capacity = baseCap - distPenalty - freqPenalty;
  const percentile = capacity > 0 ? Math.min(99, Math.round((capacity / input.weightKg) * 50)) : 10;

  let classification: RiskBand = 'aceitavel';
  let label = `Percentil ${percentile}%`;
  if (percentile < 10) {
    classification = 'critico';
    label = 'Abaixo do 10º percentil';
  } else if (percentile < 25) {
    classification = 'alto';
    label = 'Abaixo do 25º percentil';
  } else if (percentile < 50) {
    classification = 'atencao';
    label = 'Abaixo da mediana';
  }

  return {
    methodId: 'snook',
    methodName: 'Snook & Ciriello',
    score: percentile,
    classification,
    classificationLabel: label,
    inputs: { ...input },
    outputs: { percentil: percentile, capacidadeKg: Math.round(capacity * 10) / 10 },
    normReference: 'Snook & Ciriello — MMH tables',
    recommendation:
      percentile < 25
        ? ['Menos de 25% da população conseguiria executar — redesenhar tarefa.']
        : ['Capacidade compatível com percentil populacional.'],
  };
}
