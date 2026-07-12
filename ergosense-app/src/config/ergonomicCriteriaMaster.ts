/**
 * Critérios ergonômicos mestres — espelho de docs/Ferramentas Ergonômicas.txt
 * Versionar alterações; cada laudo deve registrar ergonomicCriteriaVersion.
 */

export const ERGONOMIC_CRITERIA_VERSION = '2026-05-28';

export type RiskBand = 'aceitavel' | 'atencao' | 'alto' | 'critico';

export const NIOSH_LI_BANDS = {
  aceitavel: { max: 1.0, label: 'Aceitável' },
  atencao: { min: 1.01, max: 2.99, label: 'Moderado' },
  alto: { min: 3.0, max: 4.99, label: 'Alto' },
  critico: { min: 5.0, label: 'Crítico' },
} as const;

export const NIOSH_HORIZONTAL_DISTANCE_CM = {
  ideal: { max: 25 },
  aceitavel: { min: 26, max: 40 },
  critica: { min: 41 },
} as const;

/** Orientação NR-17 — limites orientativos de peso (condições ideais) */
export const NR17_WEIGHT_LIMITS_KG = {
  homem_adulto: 23,
  mulher_adulta: 20,
  adolescente_homem: 20,
  adolescente_mulher: 15,
} as const;

export const RULA_BANDS: { max: number; label: string }[] = [
  { max: 2, label: 'Aceitável' },
  { max: 4, label: 'Investigar' },
  { max: 6, label: 'Corrigir em breve' },
  { max: 99, label: 'Correção imediata' },
];

export const REBA_BANDS: { max: number; label: string }[] = [
  { max: 1, label: 'Desprezível' },
  { max: 3, label: 'Baixo' },
  { max: 7, label: 'Médio' },
  { max: 10, label: 'Alto' },
  { max: 15, label: 'Muito alto' },
];

export const OWAS_CLASS_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Aceitável',
  2: 'Revisão futura',
  3: 'Correção rápida',
  4: 'Correção imediata',
};

export const ROSA_BANDS = {
  aceitavel: { max: 2 },
  atencao: { min: 3, max: 4 },
  intervencao: { min: 5 },
} as const;

export const OCRA_INDEX_BANDS = {
  aceitavel: { max: 2.2 },
  atencao: { min: 2.3, max: 3.5 },
  alto: { min: 3.51 },
} as const;

export const QEC_EXPOSURE_PCT = {
  baixa: { max: 39 },
  moderada: { min: 40, max: 50 },
  alta: { min: 51, max: 70 },
  muito_alta: { min: 71 },
} as const;

export const KIM_SCORE_BANDS = {
  baixo: { max: 9 },
  moderado: { min: 10, max: 24 },
  alto: { min: 25, max: 49 },
  muito_alto: { min: 50 },
} as const;

export const STRAIN_INDEX_BANDS = {
  seguro: { max: 2.99 },
  atencao: { min: 3, max: 5 },
  provavel: { min: 5.01, max: 7 },
  alto: { min: 7.01 },
} as const;

export const REVISED_STRAIN_INDEX = {
  aceitavel: { max: 9 },
  atencao: { min: 10, max: 20 },
  critico: { min: 21 },
} as const;

export const NASA_TLX_BANDS = {
  baixa: { max: 29 },
  moderada: { min: 30, max: 49 },
  alta: { min: 50, max: 69 },
  muito_alta: { min: 70 },
} as const;

/** Regras automáticas pose + carga (IA) */
export const AUTO_RULES = {
  tronco_graus: { alto: 60, critico: 90 },
  pescoco_graus: { atencao: 20, critico: 45 },
  braco_acima_ombro_critico_secs: 30,
  joelho_flexao_critico_graus: 90,
  distancia_carga_corpo_penalidade_cm: 40,
  frequencia_levantamento_penalidade_por_min: 15,
  postura_estatica_alerta_min: 60,
  carga_dispara_niosh_homem_kg: NR17_WEIGHT_LIMITS_KG.homem_adulto,
  carga_dispara_niosh_mulher_kg: NR17_WEIGHT_LIMITS_KG.mulher_adulta,
} as const;

export const NHO06_IBUTG_CELSIUS = {
  trabalho_leve: { aceitavel_max: 30 },
  trabalho_moderado: { aceitavel_max: 26.7 },
  trabalho_pesado: { aceitavel_max: 25 },
} as const;

/** NR-15 — níveis de ruído e tempo máximo */
export const NR15_NOISE = [
  { dbA: 85, maxHours: 8 },
  { dbA: 90, maxHours: 4 },
  { dbA: 95, maxHours: 2 },
  { dbA: 100, maxHours: 1 },
  { dbA: 105, maxMinutes: 30 },
] as const;

export const NHO11_LUX = {
  escritorio_min: 500,
  industrial_min: 300,
  industrial_max: 1000,
} as const;

export const METHOD_NORM_REFERENCES: Record<string, string> = {
  niosh: 'NIOSH RNLE 2021 / NR-17 item 17.5',
  rula: 'RULA — McAtamney & Corlett',
  reba: 'REBA — Hignett & McAtamney',
  owas: 'OWAS — Karhu et al.',
  rosa: 'ROSA — Sonne et al.',
  ocra: 'OCRA — Grupo OCRA',
  qec: 'QEC — Stock et al.',
  kim: 'KIM — Steinberg',
  strain_index: 'Moore & Garg Strain Index',
  rsi: 'Revised Strain Index',
  tlv_hal: 'ACGIH TLV HAL',
  nasa_tlx: 'NASA Task Load Index',
  hse_it: 'HSE Management Standards',
  peso_distancia: 'ErgoSense — índice peso × distância (complementar RNLE)',
};

export function classifyNioshLi(li: number): RiskBand {
  if (li <= NIOSH_LI_BANDS.aceitavel.max) return 'aceitavel';
  if (li <= NIOSH_LI_BANDS.atencao.max) return 'atencao';
  if (li < NIOSH_LI_BANDS.critico.min) return 'alto';
  return 'critico';
}

export function classifyRula(score: number): string {
  if (score <= 2) return RULA_BANDS[0].label;
  if (score <= 4) return RULA_BANDS[1].label;
  if (score <= 6) return RULA_BANDS[2].label;
  return RULA_BANDS[3].label;
}

export function classifyReba(score: number): string {
  for (const band of REBA_BANDS) {
    if (score <= band.max) return band.label;
  }
  return REBA_BANDS[REBA_BANDS.length - 1].label;
}
