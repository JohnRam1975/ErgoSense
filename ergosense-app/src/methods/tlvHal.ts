import { METHOD_NORM_REFERENCES } from '../config/ergonomicCriteriaMaster';
import type { ErgonomicMethodResult } from './types';
import type { RiskBand } from '../config/ergonomicCriteriaMaster';

export interface TlvHalInput {
  forceKg: number;
  halPerHour: number;
  dutyCyclePct: number;
}

/** TLV HAL ACGIH — comparação força × HAL */
export function calculateTlvHal(input: TlvHalInput): ErgonomicMethodResult {
  const normalized = (input.forceKg * input.halPerHour) / Math.max(input.dutyCyclePct, 10);
  const tlvRef = 3.6;
  const ratio = Math.round((normalized / tlvRef) * 100) / 100;

  let classification: RiskBand = 'aceitavel';
  let label = 'Abaixo do TLV';
  if (ratio > 1.5) {
    classification = 'critico';
    label = 'Acima do TLV';
  } else if (ratio > 1.0) {
    classification = 'alto';
    label = 'No limite TLV';
  } else if (ratio > 0.75) {
    classification = 'atencao';
    label = 'Aproximando TLV';
  }

  return {
    methodId: 'tlv_hal',
    methodName: 'TLV HAL',
    score: ratio,
    classification,
    classificationLabel: label,
    inputs: { ...input },
    outputs: { ratioTLV: ratio, referencia: tlvRef },
    normReference: METHOD_NORM_REFERENCES.tlv_hal,
    recommendation:
      ratio > 1
        ? ['Força × HAL acima do TLV — reduzir frequência ou força de preensão.']
        : ['Exposição de força dentro do TLV HAL.'],
  };
}
