import { METHOD_NORM_REFERENCES, OWAS_CLASS_LABELS } from '../config/ergonomicCriteriaMaster';
import type { JointAngles } from '../types';
import type { ErgonomicMethodResult } from './types';
import type { RiskBand } from '../config/ergonomicCriteriaMaster';
import { lookupOwasCategory, type OwasArm, type OwasBack, type OwasLeg, type OwasLoad } from './owasTable';

/** OWAS — costas 1-4, braços 1-3, pernas 1-4, carga 0-3 (tabela completa 144 combinações) */
function backCode(lombar: number, dorso: number): OwasBack {
  if (dorso >= 20 && lombar >= 20) return 3;
  if (dorso >= 15) return 3;
  if (lombar < 10) return 1;
  if (lombar < 30) return 2;
  if (lombar < 60) return 3;
  return 4;
}

function armCode(ombroD: number, ombroE?: number): OwasArm {
  const max = Math.max(ombroD, ombroE ?? 0);
  if (max < 45) return 1;
  if (max < 90) return 2;
  return 3;
}

function legCode(joelho: number, quadril: number, sitting: boolean): OwasLeg {
  if (sitting || joelho < 130) return 1;
  if (joelho > 150) return 2;
  if (quadril < 90) return 4;
  if (joelho >= 90 && joelho <= 120) return 2;
  return 3;
}

function loadCode(weightKg: number): OwasLoad {
  if (weightKg <= 0) return 0;
  if (weightKg < 10) return 1;
  if (weightKg < 20) return 2;
  return 3;
}

export function calculateOwas(angles: JointAngles, weightKg = 0, sitting = false): ErgonomicMethodResult {
  const back = backCode(angles.lombar, angles.dorso);
  const arm = armCode(angles.ombroD, angles.ombroE);
  const leg = legCode(angles.joelhoD || 110, angles.quadril || 95, sitting);
  const load = loadCode(weightKg);

  const owasClass = lookupOwasCategory(back, arm, leg, load);

  const classification: RiskBand =
    owasClass === 1 ? 'aceitavel' : owasClass === 2 ? 'atencao' : owasClass === 3 ? 'alto' : 'critico';

  const rec: string[] = [];
  if (owasClass >= 3) rec.push('Corrigir postura de costas e braços imediatamente.');
  if (load >= 2) rec.push('Reduzir peso ou usar auxílio mecânico.');
  if (leg === 4) rec.push('Evitar posturas unilaterais ou ajoelhadas prolongadas.');
  if (rec.length === 0) rec.push('Postura OWAS aceitável para a tarefa observada.');

  return {
    methodId: 'owas',
    methodName: 'OWAS',
    score: owasClass,
    classification,
    classificationLabel: OWAS_CLASS_LABELS[owasClass],
    inputs: { costas: back, bracos: arm, pernas: leg, carga: load },
    outputs: { classe: owasClass, combinacao: `${back}-${arm}-${leg}-${load}` },
    normReference: METHOD_NORM_REFERENCES.owas,
    recommendation: rec,
  };
}
