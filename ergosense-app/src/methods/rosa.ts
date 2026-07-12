import { METHOD_NORM_REFERENCES, ROSA_BANDS } from '../config/ergonomicCriteriaMaster';
import type { ErgonomicMethodResult } from './types';
import type { RiskBand } from '../config/ergonomicCriteriaMaster';

export interface RosaChecklistInput {
  chairScore: number;
  monitorScore: number;
  phonePeripheralsScore: number;
  mouseKeyboardScore: number;
}

export function calculateRosa(input: RosaChecklistInput): ErgonomicMethodResult {
  const total =
    input.chairScore +
    input.monitorScore +
    input.phonePeripheralsScore +
    input.mouseKeyboardScore;
  const avg = Math.round((total / 4) * 10) / 10;

  let classification: RiskBand = 'aceitavel';
  let label = 'Aceitável';
  if (avg >= ROSA_BANDS.intervencao.min) {
    classification = 'alto';
    label = 'Intervenção necessária';
  } else if (avg >= ROSA_BANDS.atencao.min) {
    classification = 'atencao';
    label = 'Atenção';
  }

  const rec: string[] = [];
  if (input.monitorScore >= 4) rec.push('Ajustar altura e distância do monitor (50–70 cm, topo na altura dos olhos).');
  if (input.chairScore >= 4) rec.push('Ajustar cadeira: apoio lombar, braços e pés no chão.');
  if (rec.length === 0) rec.push('Posto de escritório ROSA adequado.');

  return {
    methodId: 'rosa',
    methodName: 'ROSA',
    score: avg,
    classification,
    classificationLabel: label,
    inputs: { ...input },
    outputs: { pontuacaoMedia: avg },
    normReference: METHOD_NORM_REFERENCES.rosa,
    recommendation: rec,
  };
}

export function rosaFromWorkstation(ws: {
  telaDistanciaCm: number;
  telaAltura: string;
  nivelLuz: string;
}): ErgonomicMethodResult {
  const distOk = ws.telaDistanciaCm >= 50 && ws.telaDistanciaCm <= 70;
  const monitor = distOk && ws.telaAltura === 'ideal' ? 2 : ws.telaAltura === 'ideal' ? 3 : 4;
  const chair = 2;
  const peripherals = 2;
  const mk = 2;
  return calculateRosa({
    chairScore: chair,
    monitorScore: monitor,
    phonePeripheralsScore: peripherals,
    mouseKeyboardScore: mk,
  });
}
