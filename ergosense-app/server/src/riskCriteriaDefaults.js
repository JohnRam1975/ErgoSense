/**
 * Configuração padrão NR-01 §1.5.4.4.2.2 — matriz 5×5 probabilidade × severidade
 */
export const DEFAULT_CRITERIA_CONFIG = {
  matrixType: 'PROB_SEV_5X5',
  scoreMethod: 'PRODUCT',
  scaleMin: 1,
  scaleMax: 5,
  nr01Reference: 'NR-01 §1.5.4.4.2.2',
  probability: [
    { value: 1, label: 'Remota', description: 'Improvável ou nunca ocorreu na organização' },
    { value: 2, label: 'Baixa', description: 'Ocorrência esporádica, histórico limitado' },
    { value: 3, label: 'Média', description: 'Ocorrência ocasional, possível repetição' },
    { value: 4, label: 'Alta', description: 'Ocorrência frequente ou previsível' },
    { value: 5, label: 'Muito alta', description: 'Quase certa ou recorrente' },
  ],
  severity: [
    { value: 1, label: 'Insignificante', description: 'Sem lesão ou impacto perceptível' },
    { value: 2, label: 'Leve', description: 'Primeiros socorros, sem afastamento' },
    { value: 3, label: 'Moderada', description: 'Lesão reversível ou afastamento curto' },
    { value: 4, label: 'Grave', description: 'Lesão irreversível ou afastamento prolongado' },
    { value: 5, label: 'Muito grave', description: 'Fatalidade ou incapacidade permanente' },
  ],
  thresholds: [
    { level: 'baixo', minScore: 1, maxScore: 4, acceptable: true, label: 'Baixo', color: '#22c55e' },
    { level: 'medio', minScore: 5, maxScore: 9, acceptable: true, label: 'Médio', color: '#eab308' },
    { level: 'alto', minScore: 10, maxScore: 15, acceptable: false, label: 'Alto', color: '#f97316' },
    { level: 'critico', minScore: 16, maxScore: 25, acceptable: false, label: 'Crítico', color: '#ef4444' },
  ],
  acceptability: {
    acceptableLevels: ['baixo', 'medio'],
    requiresImmediateAction: ['critico'],
    requiresActionPlanFrom: 'alto',
  },
  cellOverrides: null,
};

export const ALTERNATIVE_3X3_CONFIG = {
  matrixType: 'PROB_SEV_3X3',
  scoreMethod: 'PRODUCT',
  scaleMin: 1,
  scaleMax: 3,
  nr01Reference: 'NR-01 §1.5.4.4.2.2',
  probability: [
    { value: 1, label: 'Baixa', description: 'Improvável' },
    { value: 2, label: 'Média', description: 'Possível' },
    { value: 3, label: 'Alta', description: 'Provável' },
  ],
  severity: [
    { value: 1, label: 'Leve', description: 'Impacto mínimo' },
    { value: 2, label: 'Moderada', description: 'Impacto significativo' },
    { value: 3, label: 'Grave', description: 'Impacto severo' },
  ],
  thresholds: [
    { level: 'baixo', minScore: 1, maxScore: 2, acceptable: true, label: 'Baixo', color: '#22c55e' },
    { level: 'medio', minScore: 3, maxScore: 4, acceptable: true, label: 'Médio', color: '#eab308' },
    { level: 'alto', minScore: 5, maxScore: 6, acceptable: false, label: 'Alto', color: '#f97316' },
    { level: 'critico', minScore: 7, maxScore: 9, acceptable: false, label: 'Crítico', color: '#ef4444' },
  ],
  acceptability: {
    acceptableLevels: ['baixo', 'medio'],
    requiresImmediateAction: ['critico'],
    requiresActionPlanFrom: 'alto',
  },
  cellOverrides: null,
};

export const MATRIX_TYPE_PRESETS = {
  PROB_SEV_5X5: DEFAULT_CRITERIA_CONFIG,
  PROB_SEV_3X3: ALTERNATIVE_3X3_CONFIG,
};
