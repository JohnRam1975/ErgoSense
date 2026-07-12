/**
 * Metodologia ErgoSense — índices proprietários de apoio à AEP/AET.
 * NÃO substituem laudo legal; não representam percentual oficial NR-17.
 */

export const ERGOSENSE_ENGINE_VERSION = '4.0.0';
export const ERGOSENSE_POSE_MODEL = 'MediaPipe Pose Landmarker Full — multi-pessoa (até 4)';
export const ERGOSENSE_VISION_STACK = 'YOLOv8n ONNX + MediaPipe Multi-Pose + Rastreamento Temporal';
export const ERGOSENSE_YOLO_MODEL = 'YOLOv8n ONNX (COCO→ErgoSense)';
export const ERGOSENSE_NORM_BASE_DATE = '2026-06-11';

export type ErgoIndexBand = 'baixo' | 'moderado' | 'alto' | 'critico';

export const ERGO_INDEX_BANDS: Record<
  ErgoIndexBand,
  { min: number; max: number; label: string; color: string }
> = {
  baixo: { min: 80, max: 100, label: 'Baixo risco', color: '#00e676' },
  moderado: { min: 60, max: 79, label: 'Moderado', color: '#ffc107' },
  alto: { min: 40, max: 59, label: 'Alto', color: '#ff9800' },
  critico: { min: 0, max: 39, label: 'Crítico', color: '#ff3d3d' },
};

export function classifyErgoIndex(value: number): ErgoIndexBand {
  const v = Math.round(Math.max(0, Math.min(100, value)));
  if (v >= 80) return 'baixo';
  if (v >= 60) return 'moderado';
  if (v >= 40) return 'alto';
  return 'critico';
}

export function ergoIndexBandLabel(band: ErgoIndexBand): string {
  return ERGO_INDEX_BANDS[band].label;
}

/** Fórmulas documentadas — exibidas em laudos e UI */
export const ERGO_INDEX_FORMULAS = {
  riskIndex: {
    name: 'Índice ErgoSense de Risco Ergonômico (IERE)',
    formula:
      'IERE = 100 − (0,35×S_post + 0,25×T_risco + 0,20×N_nc + 0,20×P_carga)',
    variables: {
      S_post: 'Score postural 0–100 (média RULA/REBA normalizada)',
      T_risco: 'Percentual da sessão em postura de risco (0–100)',
      N_nc: 'Itens checklist em não conformidade × 8',
      P_carga: 'Penalidade carga: min(40, LI×10) ou índice peso×distância/5',
    },
    reference: 'ErgoSense Engine 3.1 — modelo composto NR-17 Anexo II + RNLE NIOSH',
  },
  exposureIndex: {
    name: 'Índice ErgoSense de Exposição (IEE)',
    formula: 'IEE = 100 − (0,40×T_risco + 0,30×E_estática + 0,30×E_carga)',
    variables: {
      T_risco: 'Tempo em postura de risco / duração × 100',
      E_estática: 'min(100, streak_máx_seg / limite_crítico × 100)',
      E_carga: 'Exposição por LI ou índice esforço normalizado 0–100',
    },
    reference: 'ErgoSense Engine 3.1 — exposição ocupacional (ISO 11226 princípios)',
  },
  internalConformityIndex: {
    name: 'Índice ErgoSense de Conformidade Interna (IECI)',
    formula:
      'IECI = 100 − (S_ergo + 8×N_nc + 4×N_at + floor(T_risco/5) + P_carga)',
    variables: {
      S_ergo: 'Score ergonômico postural 0–100',
      N_nc: 'Itens não conformes no checklist',
      N_at: 'Itens em atenção',
      T_risco: 'Tempo em risco (%)',
      P_carga: 'Penalidades de movimentação manual',
    },
    reference:
      'Checklist interno alinhado à NR-17 — NÃO é percentual legal oficial. Validação por ergonomista obrigatória.',
  },
} as const;

export const NORM_REGISTRY = [
  { id: 'nr17', name: 'NR-17', year: 2022, scope: 'Ergonomia — condições de trabalho' },
  { id: 'iso11226', name: 'ISO 11226', year: 2000, scope: 'Posturas estáticas — tempos máximos' },
  { id: 'iso11228-1', name: 'ISO 11228-1', year: 2021, scope: 'MMH — levantamento e transporte' },
  { id: 'iso11228-2', name: 'ISO 11228-2', year: 2021, scope: 'MMH — empurrar e puxar' },
  { id: 'iso11228-3', name: 'ISO 11228-3', year: 2021, scope: 'MMH — transporte manual' },
  { id: 'niosh', name: 'NIOSH RNLE', year: 2021, scope: 'Equação de levantamento revisada' },
  { id: 'rula', name: 'RULA', year: 1993, scope: 'Rapid Upper Limb Assessment' },
  { id: 'reba', name: 'REBA', year: 2000, scope: 'Rapid Entire Body Assessment' },
  { id: 'owas', name: 'OWAS', year: 1977, scope: 'Ovako Working Posture Analysis' },
  { id: 'ocra', name: 'OCRA', year: 2007, scope: 'Occupational Repetitive Actions' },
  { id: 'rosa', name: 'ROSA', year: 2012, scope: 'Rapid Office Strain Assessment' },
  { id: 'kim', name: 'KIM', year: 2013, scope: 'Key Indicator Method — MMH' },
] as const;
