/**
 * REBA — Rapid Entire Body Assessment (Hignett & McAtamney, 2000)
 * Grupos A/B oficiais + modificadores de carga, preensão e atividade
 */
import { classifyReba, METHOD_NORM_REFERENCES } from '../config/ergonomicCriteriaMaster';
import type { JointAngles } from '../types';
import type { LoadParams } from '../types/loadAssessment';
import type { ErgonomicMethodResult } from './types';
import type { RiskBand } from '../config/ergonomicCriteriaMaster';

function trunkScore(lombar: number, twisted: boolean): number {
  let s: number;
  if (lombar < 5) s = 1;
  else if (lombar < 20) s = 2;
  else if (lombar < 60) s = 3;
  else if (lombar < 90) s = 4;
  else s = 5;
  if (twisted) s = Math.min(5, s + 1);
  return s;
}

function neckScore(pescoco: number, extended: boolean): number {
  let s: number;
  if (pescoco < 10) s = 1;
  else if (pescoco < 20) s = 2;
  else s = 3;
  if (extended) s = Math.min(3, s + 1);
  return s;
}

function legScore(joelho: number, standing: boolean, kneeBent: boolean): number {
  if (!standing) return 1;
  if (kneeBent && joelho < 120) return 2;
  if (joelho >= 150) return 1;
  if (joelho >= 90) return 2;
  return 3;
}

function armScore(ombro: number, abducted: boolean): number {
  let s: number;
  if (ombro < 20) s = 1;
  else if (ombro < 60) s = 2;
  else if (ombro < 90) s = 3;
  else if (ombro < 120) s = 4;
  else s = 5;
  if (abducted) s = Math.min(5, s + 1);
  return s;
}

function loadScore(loadParams?: LoadParams | null): number {
  const w = loadParams?.weightKg ?? 0;
  if (w <= 0) return 0;
  if (w < 5) return 0;
  if (w <= 10) return 1;
  if (w <= 20) return 2;
  return 3;
}

function gripScore(loadParams?: LoadParams | null, maoD = 140): number {
  if (loadParams?.gripType === 'ruim' || loadParams?.gripType === 'pinca') return 2;
  if (loadParams?.gripType === 'regular') return 1;
  if (maoD >= 155 || maoD <= 120) return 1;
  return 0;
}

function activityScore(repeticao: number): number {
  if (repeticao >= 10) return 3;
  if (repeticao >= 6) return 2;
  if (repeticao >= 3) return 1;
  return 0;
}

const REBA_TABLE_A: number[][] = [
  [1, 2, 2, 3, 4],
  [1, 2, 3, 4, 4],
  [2, 3, 4, 4, 5],
  [3, 3, 4, 5, 5],
  [4, 4, 4, 5, 5],
  [5, 5, 5, 6, 6],
  [6, 6, 6, 7, 7],
  [7, 7, 7, 8, 8],
];

const REBA_TABLE_B: number[][] = [
  [1, 2, 2],
  [1, 2, 3],
  [2, 3, 3],
  [3, 4, 4],
  [4, 4, 4],
  [5, 5, 5],
  [6, 6, 6],
  [7, 7, 7],
];

const REBA_FINAL: number[][] = [
  [1, 1, 1, 2, 3, 3, 4],
  [1, 2, 2, 3, 4, 4, 5],
  [2, 2, 3, 4, 4, 5, 6],
  [2, 3, 3, 4, 5, 6, 7],
  [3, 3, 4, 5, 6, 7, 8],
  [4, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 9],
  [5, 6, 7, 8, 9, 10, 11],
  [6, 7, 8, 9, 10, 11, 12],
  [7, 8, 9, 10, 11, 12, 13],
  [8, 9, 10, 11, 12, 13, 14],
  [9, 10, 11, 12, 13, 14, 15],
];

function idx(n: number, max: number): number {
  return Math.min(Math.max(n - 1, 0), max);
}

export function calculateReba(
  angles: JointAngles,
  standing = true,
  loadParams?: LoadParams | null,
): ErgonomicMethodResult {
  const twisted = angles.dorso >= 15;
  const abducted = (angles.ombroE ?? 0) >= 45;
  const kneeBent = (angles.joelhoD ?? 110) < 120;

  const trunk = trunkScore(angles.lombar, twisted);
  const neck = neckScore(angles.pescoco, angles.pescoco > 25);
  const legs = legScore(angles.joelhoD || 110, standing, kneeBent);
  const arm = armScore(angles.ombroD, abducted);
  const load = loadScore(loadParams);
  const coupling = gripScore(loadParams, angles.maoD);
  const activity = activityScore(angles.repeticao);

  const groupA = Math.min(12, REBA_TABLE_A[idx(trunk, 7)][idx(neck, 4)] + load);
  const groupB = Math.min(12, REBA_TABLE_B[idx(arm, 7)][idx(coupling, 2)] + legs + activity);
  const final = REBA_FINAL[idx(Math.min(groupA, 12), 11)][idx(Math.min(groupB, 12), 6)];

  const label = classifyReba(final);
  let classification: RiskBand = 'aceitavel';
  if (final >= 11) classification = 'critico';
  else if (final >= 8) classification = 'alto';
  else if (final >= 4) classification = 'atencao';

  const rec: string[] = [];
  if (trunk >= 3) rec.push('Reduza flexão/torção do tronco durante a tarefa.');
  if (arm >= 4) rec.push('Evite trabalho com braços acima da linha dos ombros.');
  if (load >= 2) rec.push('Reduza peso manipulado ou use auxílio mecânico (REBA carga).');
  if (coupling >= 2) rec.push('Melhore preensão — empunhadura inadequada aumenta risco REBA.');
  if (final >= 8) rec.push('Intervenção ergonômica prioritária — revisar posto e pausas.');
  if (rec.length === 0) rec.push('REBA indica risco corporal baixo a moderado.');

  return {
    methodId: 'reba',
    methodName: 'REBA',
    score: final,
    classification,
    classificationLabel: label,
    inputs: { tronco: trunk, pescoço: neck, pernas: legs, braco: arm, carga: load, preensao: coupling, atividade: activity },
    outputs: { grupoA: groupA, grupoB: groupB, pontuacaoFinal: final },
    normReference: METHOD_NORM_REFERENCES.reba,
    recommendation: rec,
  };
}
