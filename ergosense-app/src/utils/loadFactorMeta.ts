import type { LoadRecommendation, LoadRiskResult } from '../types/loadAssessment';

export interface LoadFactorMeta {
  id: string;
  label: string;
  description: string;
  recommendationId?: string;
}

export const LOAD_FACTOR_CATALOG: Record<string, LoadFactorMeta> = {
  carga_distante: {
    id: 'carga_distante',
    label: 'Carga distante',
    description:
      'A carga está além da distância segura ao tronco (>25 cm). O momento lombar aumenta ~20% a cada 10 cm extras (NIOSH / NR-17).',
    recommendationId: 'aproximar-carga',
  },
  peso_excedido: {
    id: 'peso_excedido',
    label: 'Peso excedido',
    description:
      'O peso informado supera o limite recomendado (RWL/NIOSH) para a distância e postura observadas. Divida a carga ou use auxílio mecânico.',
    recommendationId: 'reduzir-peso',
  },
  deslocamento_com_carga: {
    id: 'deslocamento_com_carga',
    label: 'Deslocamento com carga',
    description:
      'Há transporte horizontal ou vertical com carga nas mãos. Priorize carrinho, paleteira ou reduza a distância percorrida.',
    recommendationId: 'evitar-deslocamento-carga',
  },
  tronco_inclinado: {
    id: 'tronco_inclinado',
    label: 'Tronco inclinado',
    description: 'Inclinação lombar elevada durante o manuseio — risco de sobrecarga discal.',
    recommendationId: 'postura-carga',
  },
  torsao_tronco: {
    id: 'torsao_tronco',
    label: 'Torção do tronco',
    description: 'Rotação do tronco com carga — aumenta cisalhamento na coluna.',
    recommendationId: 'evitar-torcao',
  },
  exposicao_prolongada: {
    id: 'exposicao_prolongada',
    label: 'Exposição prolongada',
    description: 'Tempo de exposição à movimentação manual acima de 15 min na sessão observada.',
    recommendationId: 'limitar-exposicao',
  },
  repeticao_elevada: {
    id: 'repeticao_elevada',
    label: 'Repetição elevada',
    description: 'Frequência de levantamentos/transportes por minuto acima do limite confortável.',
    recommendationId: 'reduzir-frequencia',
  },
};

export function factorLabel(factorId: string): string {
  return LOAD_FACTOR_CATALOG[factorId]?.label ?? factorId.replace(/_/g, ' ');
}

export function factorDetail(
  factorId: string,
  loadResult?: LoadRiskResult | null,
): { label: string; description: string; recommendation?: LoadRecommendation } {
  const meta = LOAD_FACTOR_CATALOG[factorId];
  const label = meta?.label ?? factorId.replace(/_/g, ' ');
  let description = meta?.description ?? 'Fator de risco identificado na movimentação manual.';

  const rec = loadResult?.recomendacoes.find(
    (r) => r.id === meta?.recommendationId,
  );

  if (rec) {
    description = rec.detalhe;
  } else if (factorId === 'carga_distante' && loadResult) {
    description = `Distância medida: ${loadResult.distanceCmUsed} cm. ${description}`;
  } else if (factorId === 'peso_excedido' && loadResult) {
    description = `Utilização do limite: ${loadResult.utilizacaoPct}%. Limite NIOSH: ${loadResult.pesoLimiteKg} kg.`;
  }

  return { label, description, recommendation: rec };
}
