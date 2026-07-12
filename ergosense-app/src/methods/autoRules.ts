import { AUTO_RULES } from '../config/ergonomicCriteriaMaster';
import type { JointAngles } from '../types';
import type { ErgonomicMethodResult } from './types';
import type { RiskBand } from '../config/ergonomicCriteriaMaster';

export function evaluateAutoRules(
  angles: JointAngles,
  opts?: { weightKg?: number; distanceCm?: number; staticMins?: number; armAboveSecs?: number },
): ErgonomicMethodResult {
  const triggers: string[] = [];
  let severity = 0;

  if (angles.lombar >= AUTO_RULES.tronco_graus.critico) {
    triggers.push('Tronco > 90° — crítico');
    severity += 3;
  } else if (angles.lombar >= AUTO_RULES.tronco_graus.alto) {
    triggers.push('Tronco > 60° — alto');
    severity += 2;
  }

  if (angles.pescoco >= AUTO_RULES.pescoco_graus.critico) {
    triggers.push('Pescoço > 45° — crítico');
    severity += 3;
  } else if (angles.pescoco >= AUTO_RULES.pescoco_graus.atencao) {
    triggers.push('Pescoço > 20° — atenção');
    severity += 1;
  }

  if ((opts?.armAboveSecs ?? 0) >= AUTO_RULES.braco_acima_ombro_critico_secs) {
    triggers.push('Braço acima do ombro > 30 s');
    severity += 3;
  }

  if (angles.joelhoD >= AUTO_RULES.joelho_flexao_critico_graus) {
    triggers.push('Joelho > 90° flexão prolongada');
    severity += 2;
  }

  if ((opts?.distanceCm ?? 0) > AUTO_RULES.distancia_carga_corpo_penalidade_cm) {
    triggers.push('Distância carga-corpo > 40 cm');
    severity += 2;
  }

  if ((opts?.weightKg ?? 0) >= AUTO_RULES.carga_dispara_niosh_homem_kg) {
    triggers.push('Carga dispara avaliação NIOSH obrigatória');
    severity += 1;
  }

  if ((opts?.staticMins ?? 0) >= AUTO_RULES.postura_estatica_alerta_min) {
    triggers.push('Postura estática > 60 min');
    severity += 2;
  }

  let classification: RiskBand = 'aceitavel';
  if (severity >= 5) classification = 'critico';
  else if (severity >= 3) classification = 'alto';
  else if (severity >= 1) classification = 'atencao';

  return {
    methodId: 'auto_rules',
    methodName: 'Regras automáticas NR-17 / ISO',
    score: severity,
    classification,
    classificationLabel: triggers.length ? `${triggers.length} alerta(s)` : 'Sem alertas',
    inputs: {
      lombar: angles.lombar,
      pescoco: angles.pescoco,
      distanciaCm: opts?.distanceCm ?? 0,
      pesoKg: opts?.weightKg ?? 0,
    },
    outputs: { alertas: triggers.length },
    normReference: 'NR-17 / ISO 11226 / ISO 11228',
    recommendation: triggers.length ? triggers : ['Nenhuma regra automática crítica disparada.'],
  };
}
