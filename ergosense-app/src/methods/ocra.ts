import { METHOD_NORM_REFERENCES, OCRA_INDEX_BANDS } from '../config/ergonomicCriteriaMaster';
import type { ErgonomicMethodResult } from './types';
import type { RiskBand } from '../config/ergonomicCriteriaMaster';

export interface OcraChecklistInput {
  repetitionsPerMin: number;
  forceLevel: 1 | 2 | 3 | 4;
  postureBadPct: number;
  extraCyclesPct: number;
  lackRecovery: boolean;
}

export function calculateOcra(input: OcraChecklistInput): ErgonomicMethodResult {
  const fr = Math.min(3, input.repetitionsPerMin / 20);
  const ff = input.forceLevel * 0.5;
  const fp = (input.postureBadPct / 100) * 2;
  const fe = input.extraCyclesPct / 50;
  const frg = input.lackRecovery ? 0.5 : 0;
  const index = Math.round((fr + ff + fp + fe + frg) * 100) / 100;

  let classification: RiskBand = 'aceitavel';
  let label = 'Aceitável';
  if (index > OCRA_INDEX_BANDS.alto.min) {
    classification = 'alto';
    label = 'Alto risco';
  } else if (index >= OCRA_INDEX_BANDS.atencao.min) {
    classification = 'atencao';
    label = 'Atenção';
  }

  const rec: string[] = [];
  if (index > 3.5) rec.push('OCRA alto — rodízio, pausas e redução de repetitividade.');
  else if (index > 2.2) rec.push('Monitorar exposição e melhorar posturas de pega.');
  else rec.push('Exposição OCRA dentro de limites aceitáveis.');

  return {
    methodId: 'ocra',
    methodName: 'OCRA',
    score: index,
    classification,
    classificationLabel: label,
    inputs: { ...input } as Record<string, number | string | boolean>,
    outputs: { indice: index },
    normReference: METHOD_NORM_REFERENCES.ocra,
    recommendation: rec,
  };
}

export function ocraFromAngles(repeticao: number, lombar: number, ombro: number): ErgonomicMethodResult {
  const postureBad = lombar > 20 || ombro > 90 ? 40 : lombar > 10 ? 20 : 5;
  return calculateOcra({
    repetitionsPerMin: repeticao * 2,
    forceLevel: ombro > 90 ? 3 : 2,
    postureBadPct: postureBad,
    extraCyclesPct: repeticao > 5 ? 15 : 0,
    lackRecovery: repeticao >= 8,
  });
}
