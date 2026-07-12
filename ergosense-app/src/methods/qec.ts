import { METHOD_NORM_REFERENCES, QEC_EXPOSURE_PCT } from '../config/ergonomicCriteriaMaster';
import type { ErgonomicMethodResult } from './types';
import type { RiskBand } from '../config/ergonomicCriteriaMaster';

export interface QecInput {
  backExposurePct: number;
  shoulderExposurePct: number;
  wristExposurePct: number;
  neckExposurePct: number;
}

export function calculateQec(input: QecInput): ErgonomicMethodResult {
  const exposure = Math.round(
    (input.backExposurePct +
      input.shoulderExposurePct +
      input.wristExposurePct +
      input.neckExposurePct) /
      4,
  );

  let classification: RiskBand = 'aceitavel';
  let label = 'Baixa';
  if (exposure > QEC_EXPOSURE_PCT.muito_alta.min) {
    classification = 'critico';
    label = 'Muito alta';
  } else if (exposure > QEC_EXPOSURE_PCT.alta.min) {
    classification = 'alto';
    label = 'Alta';
  } else if (exposure > QEC_EXPOSURE_PCT.moderada.min) {
    classification = 'atencao';
    label = 'Moderada';
  }

  return {
    methodId: 'qec',
    methodName: 'QEC',
    score: exposure,
    classification,
    classificationLabel: label,
    inputs: { ...input },
    outputs: { exposicaoPct: exposure },
    normReference: METHOD_NORM_REFERENCES.qec,
    recommendation:
      exposure > 50
        ? ['QEC indica exposição elevada — revisar posto e pausas.']
        : ['Exposição QEC em faixa aceitável.'],
  };
}
