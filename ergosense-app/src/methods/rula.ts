/**
 * RULA — Rapid Upper Limb Assessment (McAtamney & Corlett, 1993)
 * Tabelas oficiais A/B + matriz final + modificadores de carga/força/músculo
 */
import { classifyRula, METHOD_NORM_REFERENCES } from '../config/ergonomicCriteriaMaster';
import type { JointAngles } from '../types';
import type { LoadParams } from '../types/loadAssessment';
import type { ErgonomicMethodResult } from './types';
import type { RiskBand } from '../config/ergonomicCriteriaMaster';

function scoreUpperArm(deg: number, abducted: boolean, raised: boolean): number {
  let s: number;
  if (deg < 20) s = 1;
  else if (deg < 45) s = 2;
  else if (deg < 90) s = 3;
  else if (deg < 135) s = 4;
  else s = 5;
  if (raised) s = Math.min(6, s + 1);
  if (abducted) s = Math.min(6, s + 1);
  return s;
}

function scoreForearm(deg: number): number {
  if (deg >= 60 && deg <= 100) return 1;
  return 2;
}

function scoreWristFromAngle(maoD: number): number {
  const flexion = Math.abs(180 - maoD);
  if (flexion < 15) return 1;
  if (flexion <= 30) return 2;
  return 3;
}

function scoreNeck(deg: number, twisted: boolean): number {
  let s: number;
  if (deg < 10) s = 1;
  else if (deg < 20) s = 2;
  else if (deg < 45) s = 3;
  else s = 4;
  if (twisted) s = Math.min(6, s + 1);
  return s;
}

function scoreTrunk(deg: number, twisted: boolean): number {
  let s: number;
  if (deg < 5) s = 1;
  else if (deg < 20) s = 2;
  else if (deg < 60) s = 3;
  else if (deg < 90) s = 4;
  else s = 5;
  if (twisted) s = Math.min(6, s + 1);
  return s;
}

function scoreLegs(sitting: boolean, knee: number): number {
  if (!sitting) return 1;
  if (knee >= 90 && knee <= 120) return 1;
  return 2;
}

function muscleUseModifier(loadParams?: LoadParams | null): number {
  if (!loadParams?.weightKg) return 0;
  if (loadParams.weightKg >= 10) return 1;
  if (loadParams.weightKg >= 4) return 1;
  return 0;
}

function forceLoadModifier(loadParams?: LoadParams | null): number {
  if (!loadParams?.weightKg) return 0;
  if (loadParams.weightKg >= 20) return 2;
  if (loadParams.weightKg >= 10) return 1;
  if (loadParams.weightKg >= 2) return 1;
  return 0;
}

const RULA_TABLE_A: number[][] = [
  [1, 2, 3, 3],
  [2, 2, 3, 4],
  [2, 3, 3, 4],
  [3, 3, 4, 4],
  [3, 4, 4, 5],
  [4, 4, 4, 5],
  [4, 4, 5, 5],
  [5, 5, 5, 6],
];

const RULA_TABLE_B: number[][] = [
  [1, 2, 3, 3],
  [2, 2, 3, 4],
  [3, 3, 3, 4],
  [3, 4, 4, 5],
  [4, 4, 4, 5],
  [4, 4, 5, 5],
  [5, 5, 5, 6],
  [5, 5, 6, 6],
];

const RULA_FINAL: number[][] = [
  [1, 2, 3, 3, 4, 5, 5],
  [2, 2, 3, 4, 4, 5, 5],
  [3, 3, 3, 4, 4, 5, 6],
  [3, 4, 4, 4, 5, 6, 6],
  [4, 4, 4, 5, 5, 6, 7],
  [4, 4, 5, 5, 6, 6, 7],
  [5, 5, 5, 6, 6, 7, 7],
  [5, 5, 6, 6, 7, 7, 7],
];

function clampIdx(n: number, max: number): number {
  return Math.min(Math.max(n - 1, 0), max);
}

export function calculateRula(
  angles: JointAngles,
  sitting = false,
  loadParams?: LoadParams | null,
): ErgonomicMethodResult {
  const abducted = (angles.ombroE ?? angles.ombroD) >= 45 && Math.abs(angles.ombroD - (angles.ombroE ?? angles.ombroD)) > 15;
  const raised = angles.ombroD >= 90;
  const twisted = angles.dorso >= 15;

  const arm = scoreUpperArm(angles.ombroD, abducted, raised);
  const fore = scoreForearm(angles.cotovelo);
  const wrist = scoreWristFromAngle(angles.maoD);
  const wristTwist = angles.maoD >= 170 || angles.maoD <= 130 ? 0 : 1;
  const neck = scoreNeck(angles.pescoco, twisted);
  const trunk = scoreTrunk(angles.lombar, twisted);
  const legs = scoreLegs(sitting, angles.joelhoD || 110);

  const muscleMod = muscleUseModifier(loadParams);
  const forceMod = forceLoadModifier(loadParams);

  const wristScore = Math.min(6, wrist + wristTwist);
  const scoreA = Math.min(7, RULA_TABLE_A[clampIdx(arm, 7)][clampIdx(fore, 3)] + muscleMod + forceMod);
  const scoreB = Math.min(7, RULA_TABLE_B[clampIdx(neck, 7)][clampIdx(trunk, 3)] + forceMod);
  const final = RULA_FINAL[clampIdx(scoreA, 7)][clampIdx(scoreB, 6)];

  const label = classifyRula(final);
  let classification: RiskBand = 'aceitavel';
  if (final >= 7) classification = 'critico';
  else if (final >= 5) classification = 'alto';
  else if (final >= 3) classification = 'atencao';

  const rec: string[] = [];
  if (arm >= 4) rec.push('Reduza elevação/abdução do braço — mantenha abaixo de 90°.');
  if (trunk >= 3) rec.push('Corrija inclinação/torção do tronco — aproxime-se do encosto ou da carga.');
  if (neck >= 3) rec.push('Neutro cervical — ajuste altura do monitor ou ferramenta.');
  if (wristScore >= 2) rec.push('Reduza desvio/flexão de punho — apoio neutro.');
  if (forceMod >= 1) rec.push('Reduza força ou peso manipulado (modificador RULA carga).');
  if (rec.length === 0) rec.push('Postura superior dentro dos limites RULA aceitáveis.');

  return {
    methodId: 'rula',
    methodName: 'RULA',
    score: final,
    classification,
    classificationLabel: label,
    inputs: {
      braco: arm,
      antebraco: fore,
      punho: wristScore,
      pescoço: neck,
      tronco: trunk,
      pernas: legs,
      musculo: muscleMod,
      forca: forceMod,
    },
    outputs: { grupoA: scoreA, grupoB: scoreB, pontuacaoFinal: final },
    normReference: METHOD_NORM_REFERENCES.rula,
    recommendation: rec,
  };
}
