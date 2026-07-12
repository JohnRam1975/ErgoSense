/**
 * NIOSH Revised Lifting Equation (RNLE) — RWL e LI
 * Multiplicadores HM, VM, DM, AM, FM, CM — tabela FM expandida (NIOSH 2021)
 */
import { classifyNioshLi, METHOD_NORM_REFERENCES, NIOSH_LI_BANDS } from '../config/ergonomicCriteriaMaster';
import type { LoadParams } from '../types/loadAssessment';
import type { JointAngles } from '../types';
import type { ErgonomicMethodResult } from './types';

const LC_KG = 23;

function hm(hCm: number): number {
  const h = Math.max(15, Math.min(63, hCm));
  return 25 / h;
}

function vm(vCm: number): number {
  const v = Math.max(0, Math.min(175, vCm));
  if (v <= 75) return 1 - 0.003 * Math.abs(v - 75);
  if (v <= 140) return 0.78;
  return 0.78 - 0.002 * (v - 140);
}

function dm(dCm: number): number {
  const d = Math.max(25, Math.min(175, dCm));
  return 0.82 + 4.5 / d;
}

function am(angleDeg: number): number {
  const a = Math.min(135, Math.max(0, angleDeg));
  if (a <= 30) return 1;
  if (a <= 60) return 0.87;
  if (a <= 90) return 0.71;
  if (a <= 120) return 0.56;
  return 0.0;
}

/** Tabela FM NIOSH — frequência × duração × altura vertical */
function fm(freqPerMin: number, vCm: number, durationHours: number): number {
  const f = Math.max(0.2, freqPerMin);
  const vBand = vCm < 75 ? 'below' : vCm <= 140 ? 'mid' : 'above';
  const dur = durationHours >= 8 ? '8h' : durationHours >= 2 ? '2h' : durationHours >= 1 ? '1h' : 'short';

  const table: Record<string, Record<string, number>> = {
    short: { below: 1.0, mid: 1.0, above: 1.0 },
    '1h': { below: 0.94, mid: 0.94, above: 0.91 },
    '2h': { below: 0.91, mid: 0.88, above: 0.84 },
    '8h': { below: 0.84, mid: 0.78, above: 0.72 },
  };

  const base = table[dur][vBand];

  if (f <= 0.2) return base;
  if (f <= 1) return base * 0.94;
  if (f <= 3) return base * 0.88;
  if (f <= 6) return base * 0.75;
  if (f <= 9) return base * 0.62;
  return base * 0.52;
}

function cm(coupling: string): number {
  if (coupling === 'bom') return 1;
  if (coupling === 'regular') return 0.95;
  return 0.9;
}

export interface NioshRnleInput {
  weightKg: number;
  horizontalCm: number;
  verticalOriginCm: number;
  verticalDestCm: number;
  asymmetryDeg: number;
  frequencyPerMin: number;
  coupling?: 'bom' | 'regular' | 'ruim';
  durationHours?: number;
}

export function calculateNioshRnle(input: NioshRnleInput): ErgonomicMethodResult {
  const H = input.horizontalCm;
  const V = (input.verticalOriginCm + input.verticalDestCm) / 2;
  const D = Math.abs(input.verticalDestCm - input.verticalOriginCm) || 25;
  const A = input.asymmetryDeg;
  const F = input.frequencyPerMin;
  const C = input.coupling ?? 'regular';
  const duration = input.durationHours ?? 8;

  const HM = hm(H);
  const VM = vm(V);
  const DM = dm(D);
  const AM = am(A);
  const FM = fm(F, V, duration);
  const CM = cm(C);

  const rwl = Math.round(LC_KG * HM * VM * DM * AM * FM * CM * 10) / 10;
  const li = rwl > 0 ? Math.round((input.weightKg / rwl) * 100) / 100 : 0;
  const classification = classifyNioshLi(li);
  const label =
    classification === 'aceitavel'
      ? NIOSH_LI_BANDS.aceitavel.label
      : classification === 'atencao'
        ? NIOSH_LI_BANDS.atencao.label
        : classification === 'alto'
          ? NIOSH_LI_BANDS.alto.label
          : NIOSH_LI_BANDS.critico.label;

  const rec: string[] = [];
  if (li > 3) rec.push('LI crítico — reduzir peso, aproximar carga ou usar auxílio mecânico.');
  else if (li > 1) rec.push('LI acima de 1 — revisar distância horizontal, altura de pega e frequência.');
  else rec.push('Carga dentro do limite recomendado pela equação NIOSH.');

  return {
    methodId: 'niosh',
    methodName: 'NIOSH RNLE',
    score: li,
    classification,
    classificationLabel: label,
    inputs: { H, V, D, A, F, pesoKg: input.weightKg, duracaoH: duration },
    outputs: { RWL: rwl, LI: li, HM, VM, DM, AM, FM, CM },
    normReference: METHOD_NORM_REFERENCES.niosh,
    recommendation: rec,
  };
}

export function nioshFromSession(
  loadParams: LoadParams | null | undefined,
  angles: JointAngles,
  verticalDestCm?: number,
): ErgonomicMethodResult | null {
  if (!loadParams?.weightKg) return null;
  const h = loadParams.distanceCm || 30;
  const vOrigin = loadParams.heightCm || 75;
  const vDest = verticalDestCm ?? vOrigin + (angles.lombar > 25 ? 20 : 0);
  const freq =
    loadParams.repetitionsPerMinute ??
    (loadParams.frequency === 'continuo'
      ? 8
      : loadParams.frequency === 'frequente'
        ? 4
        : 0.5);
  const coupling =
    loadParams.gripType === 'boa'
      ? 'bom'
      : loadParams.gripType === 'ruim' || loadParams.gripType === 'pinca'
        ? 'ruim'
        : 'regular';

  const durationHours = Math.min(8, (loadParams.estimatedTaskMinutes ?? 60) / 60);

  return calculateNioshRnle({
    weightKg: loadParams.weightKg,
    horizontalCm: h,
    verticalOriginCm: vOrigin,
    verticalDestCm: vDest,
    asymmetryDeg: loadParams.trunkTwist ? 45 : angles.lombar > 20 ? Math.min(45, angles.lombar) : 0,
    frequencyPerMin: freq,
    coupling,
    durationHours,
  });
}
