import { METHOD_NORM_REFERENCES, REVISED_STRAIN_INDEX, STRAIN_INDEX_BANDS } from '../config/ergonomicCriteriaMaster';
import type { ErgonomicMethodResult } from './types';
import type { RiskBand } from '../config/ergonomicCriteriaMaster';

export interface StrainIndexInput {
  intensity: number;
  effortsPerMin: number;
  durationHours: number;
  posture: number;
  speed: number;
  durationPerDayHours: number;
}

export function calculateStrainIndex(input: StrainIndexInput): ErgonomicMethodResult {
  const si =
    (input.intensity * input.effortsPerMin * input.durationHours * input.posture * input.speed) /
    input.durationPerDayHours;
  const rounded = Math.round(si * 100) / 100;

  let classification: RiskBand = 'aceitavel';
  let label = 'Seguro';
  if (rounded > STRAIN_INDEX_BANDS.alto.min) {
    classification = 'critico';
    label = 'Alto risco';
  } else if (rounded > STRAIN_INDEX_BANDS.provavel.min) {
    classification = 'alto';
    label = 'Provável risco';
  } else if (rounded > STRAIN_INDEX_BANDS.atencao.min) {
    classification = 'atencao';
    label = 'Atenção';
  }

  return {
    methodId: 'strain_index',
    methodName: 'Moore & Garg (Strain Index)',
    score: rounded,
    classification,
    classificationLabel: label,
    inputs: { ...input },
    outputs: { SI: rounded },
    normReference: METHOD_NORM_REFERENCES.strain_index,
    recommendation:
      rounded > 5
        ? ['Strain Index elevado — reduzir repetitividade e força.']
        : ['Membros superiores dentro de faixa Strain Index.'],
  };
}

export function calculateRevisedStrainIndex(score: number): ErgonomicMethodResult {
  let classification: RiskBand = 'aceitavel';
  let label = 'Aceitável';
  if (score >= REVISED_STRAIN_INDEX.critico.min) {
    classification = 'critico';
    label = 'Crítico';
  } else if (score >= REVISED_STRAIN_INDEX.atencao.min) {
    classification = 'atencao';
    label = 'Atenção';
  }

  return {
    methodId: 'rsi',
    methodName: 'Revised Strain Index',
    score,
    classification,
    classificationLabel: label,
    inputs: { score },
    outputs: { RSI: score },
    normReference: METHOD_NORM_REFERENCES.rsi,
    recommendation:
      score >= 21
        ? ['RSI crítico — intervenção imediata em membros superiores.']
        : ['RSI em faixa monitorável.'],
  };
}
