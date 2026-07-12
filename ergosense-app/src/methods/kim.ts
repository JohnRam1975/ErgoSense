import { KIM_SCORE_BANDS, METHOD_NORM_REFERENCES } from '../config/ergonomicCriteriaMaster';
import type { ErgonomicMethodResult } from './types';
import type { RiskBand } from '../config/ergonomicCriteriaMaster';

export type KimMode = 'levantar' | 'segurar' | 'carregar' | 'empurrar' | 'puxar';

export interface KimInput {
  mode: KimMode;
  weightKg: number;
  frequencyPerHour: number;
  distanceM: number;
  postureScore: number;
  /** 1-5 postura ruim */
  postureFactor?: number;
}

function classifyKim(score: number): { band: RiskBand; label: string } {
  if (score <= KIM_SCORE_BANDS.baixo.max) return { band: 'aceitavel', label: 'Baixo risco' };
  if (score <= KIM_SCORE_BANDS.moderado.max) return { band: 'atencao', label: 'Moderado' };
  if (score <= KIM_SCORE_BANDS.alto.max) return { band: 'alto', label: 'Alto' };
  return { band: 'critico', label: 'Muito alto' };
}

export function calculateKim(input: KimInput): ErgonomicMethodResult {
  const pf = input.postureFactor ?? Math.min(5, Math.ceil(input.postureScore / 20));
  const wf = input.weightKg <= 5 ? 1 : input.weightKg <= 15 ? 2 : input.weightKg <= 30 ? 3 : 4;
  const ff = input.frequencyPerHour <= 60 ? 1 : input.frequencyPerHour <= 300 ? 2 : 3;
  const df = input.distanceM <= 2 ? 1 : input.distanceM <= 10 ? 2 : 3;
  const modeBonus = input.mode === 'empurrar' || input.mode === 'puxar' ? 0.85 : 1;

  const score = Math.round((wf * 8 + ff * 6 + df * 5 + pf * 7) * modeBonus);

  const { band, label } = classifyKim(score);
  const rec: string[] = [];
  if (score >= 50) rec.push('KIM indica risco muito alto — eliminar transporte manual.');
  else if (score >= 25) rec.push('Reduzir frequência, peso e distância de deslocamento.');
  else rec.push('Carga e frequência dentro de faixa KIM aceitável.');

  return {
    methodId: `kim-${input.mode}`,
    methodName: `KIM (${input.mode})`,
    score,
    classification: band,
    classificationLabel: label,
    inputs: {
      pesoKg: input.weightKg,
      frequenciaH: input.frequencyPerHour,
      distanciaM: input.distanceM,
      postura: pf,
    },
    outputs: { pontuacao: score },
    normReference: METHOD_NORM_REFERENCES.kim,
    recommendation: rec,
  };
}

export function kimFromLoad(
  mode: KimMode,
  weightKg: number,
  distanceCm: number,
  frequency: 'esporadico' | 'frequente' | 'continuo',
  postureScore: number,
): ErgonomicMethodResult | null {
  if (weightKg <= 0) return null;
  const freqH =
    frequency === 'continuo' ? 400 : frequency === 'frequente' ? 180 : 30;
  return calculateKim({
    mode,
    weightKg,
    frequencyPerHour: freqH,
    distanceM: distanceCm / 100,
    postureScore,
  });
}
