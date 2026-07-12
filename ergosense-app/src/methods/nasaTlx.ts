import { METHOD_NORM_REFERENCES, NASA_TLX_BANDS } from '../config/ergonomicCriteriaMaster';
import type { ErgonomicMethodResult } from './types';
import type { RiskBand } from '../config/ergonomicCriteriaMaster';

export interface NasaTlxInput {
  mental: number;
  physical: number;
  temporal: number;
  performance: number;
  effort: number;
  frustration: number;
}

export function calculateNasaTlx(input: NasaTlxInput): ErgonomicMethodResult {
  const raw =
    input.mental +
    input.physical +
    input.temporal +
    (100 - input.performance) +
    input.effort +
    input.frustration;
  const score = Math.round(raw / 6);

  let classification: RiskBand = 'aceitavel';
  let label = 'Baixa carga';
  if (score >= NASA_TLX_BANDS.muito_alta.min) {
    classification = 'critico';
    label = 'Muito alta';
  } else if (score >= NASA_TLX_BANDS.alta.min) {
    classification = 'alto';
    label = 'Alta';
  } else if (score >= NASA_TLX_BANDS.moderada.min) {
    classification = 'atencao';
    label = 'Moderada';
  }

  return {
    methodId: 'nasa_tlx',
    methodName: 'NASA TLX',
    score,
    classification,
    classificationLabel: label,
    inputs: { ...input },
    outputs: { workload: score },
    normReference: METHOD_NORM_REFERENCES.nasa_tlx,
    recommendation:
      score >= 50
        ? ['Carga mental elevada — revisar ritmo, pausas e demandas cognitivas.']
        : ['Carga mental NASA TLX aceitável.'],
  };
}
