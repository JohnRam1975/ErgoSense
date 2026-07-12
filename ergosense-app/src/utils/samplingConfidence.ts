/**
 * Confiabilidade estatística da amostragem — baseada em duração e frequência de amostras.
 * Referência: princípios ISO 11226 (observação representativa) e boas práticas AEP.
 */

export type SamplingConfidenceLevel =
  | 'muito_baixa'
  | 'baixa'
  | 'media'
  | 'alta'
  | 'muito_alta';

export interface SamplingConfidenceResult {
  level: SamplingConfidenceLevel;
  label: string;
  description: string;
  /** Bloqueia geração de laudo formal */
  blocksFormalReport: boolean;
  /** Permite triagem com ressalva */
  allowsScreening: boolean;
  minRecommendedSecs: number;
  actualSecs: number;
  sampleCount: number;
  sampleRateHz: number;
}

const LEVEL_META: Record<
  SamplingConfidenceLevel,
  { label: string; description: string; blocks: boolean; allows: boolean }
> = {
  muito_baixa: {
    label: 'Muito baixa confiança',
    description: 'Amostragem < 30 s — insuficiente para qualquer laudo. Repita a captura.',
    blocks: true,
    allows: false,
  },
  baixa: {
    label: 'Baixa confiança',
    description: '30 s a 2 min — triagem preliminar apenas. Não substitui AEP completa.',
    blocks: false,
    allows: true,
  },
  media: {
    label: 'Média confiança',
    description: '2 a 5 min — adequado para triagem AEP em posto fixo.',
    blocks: false,
    allows: true,
  },
  alta: {
    label: 'Alta confiança',
    description: '5 a 15 min — amostra representativa para apoio à AET.',
    blocks: false,
    allows: true,
  },
  muito_alta: {
    label: 'Muito alta confiança',
    description: '> 15 min — alta representatividade estatística da tarefa observada.',
    blocks: false,
    allows: true,
  },
};

export function evaluateSamplingConfidence(
  durationSecs: number,
  sampleCount: number,
): SamplingConfidenceResult {
  const actualSecs = Math.max(0, durationSecs);
  const sampleRateHz =
    actualSecs > 0 && sampleCount > 0 ? Math.round((sampleCount / actualSecs) * 10) / 10 : 0;

  let level: SamplingConfidenceLevel;
  if (actualSecs < 30) level = 'muito_baixa';
  else if (actualSecs < 120) level = 'baixa';
  else if (actualSecs < 300) level = 'media';
  else if (actualSecs < 900) level = 'alta';
  else level = 'muito_alta';

  const meta = LEVEL_META[level];
  const minRecommendedSecs =
    level === 'muito_baixa'
      ? 30
      : level === 'baixa'
        ? 120
        : level === 'media'
          ? 300
          : level === 'alta'
            ? 900
            : 900;

  return {
    level,
    label: meta.label,
    description: meta.description,
    blocksFormalReport: meta.blocks,
    allowsScreening: meta.allows,
    minRecommendedSecs,
    actualSecs,
    sampleCount,
    sampleRateHz,
  };
}

export function samplingConfidenceShortLabel(level: SamplingConfidenceLevel): string {
  return LEVEL_META[level].label;
}
