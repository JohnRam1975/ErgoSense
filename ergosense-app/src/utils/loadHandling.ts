/**
 * Análise biomecânica de movimentação manual de cargas.
 *
 * Princípio central (NR-17 / NIOSH Lifting Equation):
 *   Esforço real ≠ Peso da carga isolado.
 *   Esforço real = f(Peso, Distância ao tronco, Postura, Tempo de exposição, Frequência)
 *
 * Quanto maior a distância da carga ao corpo, maior o momento de força
 * sobre a coluna lombar — uma carga leve distante pode igualar o esforço
 * de uma carga pesada próxima ao corpo.
 */

import type { JointAngles, RiskLevel } from '../types';
import type {
  HandlingMode,
  LoadFrequency,
  LoadParams,
  LoadRecommendation,
  LoadRiskResult,
} from '../types/loadAssessment';

export type {
  GripType,
  HandlingMode,
  LoadFrequency,
  LoadParams,
  LoadRecommendation,
  LoadRiskResult,
} from '../types/loadAssessment';

export {
  DEFAULT_LOAD_MANUAL_INPUT,
  buildLoadAssessmentSnapshot,
  frequencyFromRepetitions,
  normalizeLoadParams,
  resolveLoadDistanceCm,
} from '../types/loadAssessment';
export type {
  DistanceSource,
  LoadAssessmentManualInput,
  LoadAssessmentSnapshot,
  LoadDistanceEstimate,
} from '../types/loadAssessment';

// ─── Parâmetros da Equação NIOSH simplificada ───────────────────────────────

/** Peso-limite de referência (kg) para posição ideal (próximo ao corpo) */
export const NIOSH_LC = 23;

/** Distâncias de referência (cm) — horizontal ao centro do corpo */
export const LOAD_DISTANCE_OPTIMAL_CM = 25;
export const LOAD_DISTANCE_FAR_CM = 63;

// ─── Helpers ────────────────────────────────────────────────────────────────

function frequencyFactor(f: LoadFrequency): number {
  // > 6×/min = 1.0 capacidade; esporádico = 1.0; frequente = 0.85; contínuo = 0.75
  switch (f) {
    case 'continuo': return 1 / 0.75;   // penalidade 33%
    case 'frequente': return 1 / 0.85;  // penalidade 18%
    case 'esporadico': return 1.0;
  }
}

function distanceFactor(distanceCm: number): number {
  if (distanceCm <= 0) return 1.0;
  // HM = 25 / H  (Horizontal Multiplier NIOSH)
  const hm = Math.min(1.0, LOAD_DISTANCE_OPTIMAL_CM / Math.max(distanceCm, 1));
  return 1 / Math.max(hm, 0.1);
}

function postureFactor(lombar: number): number {
  // Penalidade exponencial para inclinação do tronco
  if (lombar <= 0) return 1.0;
  if (lombar < 10) return 1.1;
  if (lombar < 20) return 1.35;
  if (lombar < 30) return 1.65;
  if (lombar < 45) return 2.1;
  return 2.8; // inclinação > 45° triplica o esforço lombar
}

/** Momento de força lombar estimado (N·m) — modelo simplificado de braço de alavanca */
function estimateMoment(weightKg: number, distanceCm: number, lombarDeg: number): number {
  if (weightKg <= 0) return 0;
  const distM = Math.max(distanceCm, LOAD_DISTANCE_OPTIMAL_CM) / 100;
  // Força gravitacional × distância horizontal + componente de flexão
  const baseForce = weightKg * 9.81;
  const horizontalArm = distM * Math.cos((lombarDeg * Math.PI) / 180);
  const verticalArm = distM * Math.sin((lombarDeg * Math.PI) / 180);
  return Math.round((baseForce * (horizontalArm + verticalArm * 0.3)) * 10) / 10;
}

/** Peso-limite recomendado para a distância observada (NIOSH simplificado) */
function recommendedWeightLimit(distanceCm: number, lombar: number, frequency: LoadFrequency): number {
  const hm = Math.min(1.0, LOAD_DISTANCE_OPTIMAL_CM / Math.max(distanceCm || LOAD_DISTANCE_OPTIMAL_CM, 1));
  const vm = lombar > 30 ? 0.6 : lombar > 20 ? 0.75 : lombar > 10 ? 0.87 : 1.0;
  const fm = frequency === 'continuo' ? 0.75 : frequency === 'frequente' ? 0.85 : 1.0;
  return Math.round(NIOSH_LC * hm * vm * fm * 10) / 10;
}

// ─── Engine principal ────────────────────────────────────────────────────────

export function analyzeLoadHandling(
  params: LoadParams,
  angles: JointAngles,
): LoadRiskResult {
  const {
    weightKg,
    distanceCm,
    heightCm: _heightCm,
    frequency,
    handlingMode,
    exposureSecs,
    trunkTwist,
    displacementWithLoad,
    gripType,
    repetitionsPerMinute,
  } = params;
  const lombar = angles.lombar ?? 0;
  const ombroD = angles.ombroD ?? 0;
  const quadril = angles.quadril ?? 0;

  const fDist = distanceFactor(distanceCm);
  const fFreq = frequencyFactor(frequency);
  const fPost = postureFactor(lombar);

  const pesoLimiteKg = recommendedWeightLimit(distanceCm, lombar, frequency);
  const momentoNm = estimateMoment(weightKg || pesoLimiteKg, distanceCm, lombar);

  // Utilização: quanto do limite NIOSH está sendo consumido
  const utilizacaoPct = weightKg > 0 && pesoLimiteKg > 0
    ? Math.round((weightKg / pesoLimiteKg) * 100)
    : 0;

  // Score integrado 0-100
  let score = 0;

  // Componente postura (40% do score)
  if (lombar > 30) score += 40;
  else if (lombar > 20) score += 28;
  else if (lombar > 10) score += 16;

  // Componente distância (30% do score)
  if (distanceCm > 0) {
    if (distanceCm > 60) score += 30;
    else if (distanceCm > 45) score += 20;
    else if (distanceCm > 30) score += 12;
    else if (distanceCm > LOAD_DISTANCE_OPTIMAL_CM) score += 5;
  }

  // Componente peso×distância (20% do score)
  if (weightKg > 0 && distanceCm > 0) {
    if (utilizacaoPct > 150) score += 20;
    else if (utilizacaoPct > 120) score += 15;
    else if (utilizacaoPct > 100) score += 10;
    else if (utilizacaoPct > 80) score += 5;
  } else if (weightKg > NIOSH_LC) {
    // peso declarado sem distância
    const excesso = weightKg - NIOSH_LC;
    score += Math.min(20, Math.round(excesso * 1.2));
  }

  // Componente tempo (10% do score)
  if (exposureSecs >= 1800) score += 10;
  else if (exposureSecs >= 900) score += 7;
  else if (exposureSecs >= 300) score += 4;

  // Componente ombro elevado
  if (ombroD > 90) score += 8;

  // Componente quadril
  if (quadril > 0 && quadril <= 85) score += 6;

  if (trunkTwist) score += 8;
  if (displacementWithLoad) score += 6;
  if (gripType === 'ruim' || gripType === 'pinca') score += 5;
  else if (gripType === 'regular') score += 2;
  if (repetitionsPerMinute > 6) score += 4;

  // Modo de manuseio protege
  if (handlingMode === 'ajuda_mecanica') score = Math.round(score * 0.5);
  if (handlingMode === 'dois_trabalhadores') score = Math.round(score * 0.65);

  score = Math.min(100, Math.max(0, score));

  // Classificação de risco
  let risk: RiskLevel;
  if (score >= 70) risk = 'critico';
  else if (score >= 50) risk = 'alto';
  else if (score >= 30) risk = 'medio';
  else risk = 'baixo';

  // Justificativa técnica
  const justificativa: string[] = [];

  if (distanceCm > 0) {
    if (distanceCm > LOAD_DISTANCE_OPTIMAL_CM) {
      justificativa.push(
        `Distância da carga ao tronco: ${distanceCm} cm (limite seguro: ≤${LOAD_DISTANCE_OPTIMAL_CM} cm). ` +
        `Fator de carga real aumentado em ${Math.round((fDist - 1) * 100)}% em relação à posição ideal.`
      );
    } else {
      justificativa.push(`Distância da carga ao tronco adequada (${distanceCm} cm ≤ ${LOAD_DISTANCE_OPTIMAL_CM} cm).`);
    }
  }

  if (lombar > 0) {
    justificativa.push(
      `Inclinação do tronco: ${lombar}°. ` +
      (lombar >= 30
        ? `Inclinação crítica — aumenta a carga lombar em até ${Math.round((fPost - 1) * 100)}% acima da posição neutra.`
        : lombar >= 20
          ? `Inclinação moderada — sobrecarga de ${Math.round((fPost - 1) * 100)}% sobre a coluna lombar.`
          : `Inclinação baixa com sobrecarga adicional de ${Math.round((fPost - 1) * 100)}%.`)
    );
  }

  if (weightKg > 0 && pesoLimiteKg > 0) {
    justificativa.push(
      `Peso-limite recomendado para esta distância e postura: ${pesoLimiteKg} kg (NIOSH). ` +
      `Carga declarada: ${weightKg} kg — ${utilizacaoPct > 100 ? `EXCEDE em ${utilizacaoPct - 100}%` : `dentro do limite (${utilizacaoPct}% utilizado)`}.`
    );
  }

  if (momentoNm > 0) {
    justificativa.push(
      `Momento estimado na coluna lombar: ${momentoNm} N·m. ` +
      (momentoNm > 200 ? 'Nível crítico de compressão discal.' : momentoNm > 100 ? 'Nível de sobrecarga moderada.' : 'Nível aceitável.')
    );
  }

  if (frequency !== 'esporadico') {
    justificativa.push(
      `Frequência ${frequency === 'continuo' ? 'contínua' : 'frequente'}: penalidade de ${Math.round((fFreq - 1) * 100)}% sobre a capacidade de carregamento seguro.`
    );
  }

  if (exposureSecs > 0) {
    const m = Math.floor(exposureSecs / 60);
    const s = exposureSecs % 60;
    const tempo = m > 0 ? `${m} min ${s} s` : `${s} s`;
    justificativa.push(`Tempo de exposição observado: ${tempo}. ${exposureSecs >= 900 ? 'Exposição prolongada — aumenta o risco de lesão por acúmulo de fadiga muscular.' : 'Dentro da janela observada.'}`);
  }

  if (handlingMode === 'ajuda_mecanica') {
    justificativa.push('Uso de auxílio mecânico reduz significativamente o risco biomecânico.');
  } else   if (handlingMode === 'dois_trabalhadores') {
    justificativa.push('Tarefa com dois trabalhadores distribui a carga — risco individual reduzido.');
  }

  if (trunkTwist) {
    justificativa.push('Torção do tronco durante o manuseio — aumenta cisalhamento discal.');
  }
  if (displacementWithLoad) {
    justificativa.push('Deslocamento com carga nas mãos — priorize reduzir distância e usar auxílio mecânico.');
  }
  if (gripType === 'ruim' || gripType === 'pinca') {
    justificativa.push('Pega inadequada — risco de lesão em punho e antebraço.');
  }

  const factorsFound: string[] = [];
  if (distanceCm > LOAD_DISTANCE_OPTIMAL_CM) factorsFound.push('carga_distante');
  if (utilizacaoPct > 100) factorsFound.push('peso_excedido');
  if (lombar >= 20) factorsFound.push('tronco_inclinado');
  if (trunkTwist) factorsFound.push('torsao_tronco');
  if (displacementWithLoad) factorsFound.push('deslocamento_com_carga');
  if (exposureSecs >= 900) factorsFound.push('exposicao_prolongada');
  if (repetitionsPerMinute >= 1) factorsFound.push('repeticao_elevada');

  // Recomendações
  const recomendacoes: LoadRecommendation[] = [];

  if (distanceCm > LOAD_DISTANCE_OPTIMAL_CM) {
    recomendacoes.push({
      id: 'aproximar-carga',
      prioridade: distanceCm > 45 ? 'alta' : 'media',
      titulo: 'Aproximar a carga do corpo',
      detalhe: `Reduza a distância de ${distanceCm} cm para ≤${LOAD_DISTANCE_OPTIMAL_CM} cm. A cada 10 cm extras, o esforço lombar aumenta em ~20%.`,
    });
  }

  if (utilizacaoPct > 100 && weightKg > 0) {
    const excesso = Math.round((weightKg - pesoLimiteKg) * 10) / 10;
    recomendacoes.push({
      id: 'reduzir-peso',
      prioridade: 'alta',
      titulo: 'Reduzir o peso da carga',
      detalhe: `Carga de ${weightKg} kg excede o limite seguro em ${excesso} kg para esta distância e postura. Divida a carga ou utilize carrinho.`,
    });
  }

  if (lombar >= 20) {
    recomendacoes.push({
      id: 'postura-carga',
      prioridade: lombar >= 30 ? 'alta' : 'media',
      titulo: 'Corrigir postura ao levantar',
      detalhe: `Tronco inclinado ${lombar}° — mantenha coluna ereta, use os joelhos para descer e suba com as pernas. Nunca curve o tronco com carga.`,
    });
  }

  if (frequency === 'continuo') {
    recomendacoes.push({
      id: 'reduzir-frequencia',
      prioridade: 'alta',
      titulo: 'Reduzir a frequência / introduzir rodízio',
      detalhe: 'Atividade contínua de movimentação de cargas. Implante rodízio de funções a cada 30 min e pausas de recuperação.',
    });
  } else if (frequency === 'frequente') {
    recomendacoes.push({
      id: 'pausas-frequente',
      prioridade: 'media',
      titulo: 'Inserir micro-pausas',
      detalhe: 'A cada 20 min de movimentação, faça 5 min de pausa com alongamento da cadeia posterior.',
    });
  }

  if (exposureSecs >= 900) {
    recomendacoes.push({
      id: 'limitar-exposicao',
      prioridade: exposureSecs >= 1800 ? 'alta' : 'media',
      titulo: 'Limitar o tempo de exposição',
      detalhe: `Exposição acumulada elevada. NR-17: alterne tarefas e evite mais de 15–20 min contínuos em movimentação de carga sem pausa.`,
    });
  }

  if (handlingMode === 'individual' && (weightKg > 20 || utilizacaoPct > 120)) {
    recomendacoes.push({
      id: 'eliminar-manual',
      prioridade: 'alta',
      titulo: 'Eliminar o transporte manual — utilizar auxílio mecânico',
      detalhe: `Carga de ${weightKg || '?'} kg em transporte individual. Utilize carrinho, paleteira, talha ou ponte rolante. NR-17 prioriza a eliminação do esforço manual.`,
    });
  }

  if (handlingMode === 'individual' && weightKg > 15 && utilizacaoPct > 100) {
    recomendacoes.push({
      id: 'dois-trabalhadores',
      prioridade: 'media',
      titulo: 'Realizar com dois trabalhadores',
      detalhe: `Quando o auxílio mecânico não estiver disponível, realize com dois trabalhadores para distribuir a carga e reduzir o risco individual.`,
    });
  }

  if (ombroD > 90) {
    recomendacoes.push({
      id: 'altura-carga',
      prioridade: 'alta',
      titulo: 'Ajustar a altura de origem/destino da carga',
      detalhe:
        'Braco elevado acima de 90 graus durante o manuseio. Ajuste a altura da superficie entre cintura e ombro (zona de conforto).',
    });
  }

  if (displacementWithLoad) {
    recomendacoes.push({
      id: 'evitar-deslocamento-carga',
      prioridade: 'alta',
      titulo: 'Evitar deslocamento com carga nas mãos',
      detalhe:
        'Transporte manual horizontal ou vertical detectado. Posicione a carga próximo ao destino, use carrinho ou paleteira e minimize a distância percorrida.',
    });
  }

  if (recomendacoes.length === 0 && risk === 'baixo') {
    recomendacoes.push({
      id: 'carga-ok',
      prioridade: 'media',
      titulo: 'Movimentação de carga dentro dos limites',
      detalhe: 'Continue monitorando. Mantenha técnica correta: coluna neutra, carga próxima ao corpo, ativação de quadríceps ao levantar.',
    });
  }

  if (trunkTwist) {
    recomendacoes.push({
      id: 'evitar-torcao',
      prioridade: 'alta',
      titulo: 'Evitar torção de tronco',
      detalhe: 'Gire os pés antes de mover a carga; mantenha ombros e quadril alinhados ao objeto.',
    });
  }

  return {
    momentoNm,
    pesoLimiteKg,
    utilizacaoPct,
    fatorDistancia: Math.round(fDist * 100) / 100,
    fatorFrequencia: Math.round(fFreq * 100) / 100,
    fatorPostura: Math.round(fPost * 100) / 100,
    score,
    risk,
    justificativa,
    recomendacoes,
    distanceCmUsed: distanceCm,
    heightCmUsed: _heightCm,
    factorsFound,
  };
}

/** Integra o score de carga com o score postural (peso combinado) */
export function combinedErgonomicScore(
  postureScore: number,
  loadResult: LoadRiskResult | null,
): number {
  if (!loadResult || loadResult.score === 0) return postureScore;
  // Carga domina se score for maior; média ponderada 60/40
  const combined = postureScore * 0.55 + loadResult.score * 0.45;
  return Math.min(100, Math.round(combined));
}

/** Rótulos para frequência */
export function loadFrequencyLabel(f: LoadFrequency): string {
  const map: Record<LoadFrequency, string> = {
    esporadico: 'Esporádico (< 1×/min)',
    frequente: 'Frequente (1–6×/min)',
    continuo: 'Contínuo (> 6×/min)',
  };
  return map[f];
}

/** Rótulos para modo de manuseio */
export function handlingModeLabel(m: HandlingMode): string {
  const map: Record<HandlingMode, string> = {
    individual: 'Individual (sem auxílio)',
    dois_trabalhadores: 'Dois trabalhadores',
    ajuda_mecanica: 'Auxílio mecânico (carrinho, talha, etc.)',
  };
  return map[m];
}
