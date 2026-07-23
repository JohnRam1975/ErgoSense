/**
 * Modelo de dados — avaliação ergonômica com movimentação manual de cargas.
 * Etapa 2: entradas manuais, estimativa visual, parâmetros do motor e snapshot persistido.
 */

/** Frequência da tarefa (alinhada à NIOSH / NR-17) */
export type LoadFrequency = 'esporadico' | 'frequente' | 'continuo';

/** Modo de manuseio da carga */
export type HandlingMode = 'individual' | 'dois_trabalhadores' | 'ajuda_mecanica';

/** Tipo de preensão informado pelo avaliador */
export type GripType = 'boa' | 'regular' | 'ruim' | 'pinca' | 'gancho' | 'desconhecida';

/** Origem da distância horizontal carga–tronco */
export type DistanceSource = 'none' | 'manual' | 'vision' | 'hybrid';

/** Entrada manual na tela de nova avaliação / dock da câmera */
export interface LoadAssessmentManualInput {
  /** Se falso, a análise é só postural (sem motor de carga) */
  enabled: boolean;
  /** Peso declarado (kg). 0 = não informado */
  weightKg: number;
  /** Tempo estimado total da tarefa (minutos) */
  estimatedTaskMinutes: number;
  /** Tempo de exposição à movimentação manual nesta sessão (minutos) */
  exposureMinutes: number;
  /** Repetições por minuto (RPM) */
  repetitionsPerMinute: number;
  /** Frequência explícita; se omitida, derivada de repetitionsPerMinute */
  frequency?: LoadFrequency;
  gripType: GripType;
  /** Há torção do tronco durante o manuseio */
  trunkTwist: boolean;
  /** Há deslocamento horizontal/vertical com carga nas mãos */
  displacementWithLoad: boolean;
  handlingMode: HandlingMode;
  /**
   * @deprecated Apenas leitura de payloads antigos — UI usa measuredDistanceCm.
   * Remover após migração completa dos dados persistidos.
   */
  distanceCmManual?: number;
  /** Altura da carga em relação ao quadril (cm). 0 = usar visão */
  heightCmManual: number;
  /** Observações específicas da movimentação de carga */
  loadNotes?: string;
  /** Descrição do objeto/carga (opcional) */
  objectDescription?: string;
  /** Calibração: tamanho real da referência (cm) */
  calibrationRealCm?: number;
  /** Calibração: tamanho da referência na imagem (px) */
  calibrationPx?: number;
  /** Toque na tela — centro da carga (0–1) */
  loadObjectTap?: { x: number; y: number };
  /** Distância medida e confirmada (cm) */
  measuredDistanceCm?: number;
  /** Resultado índice peso×distância */
  effortResult?: import('../utils/calculateErgonomicLoadRisk').LoadEffortResult;
}

/** Estimativa em tempo real a partir da pose (Etapa 4) */
export interface LoadDistanceEstimate {
  distanceCm: number;
  heightCm: number;
  confidence: number;
  source: Extract<DistanceSource, 'vision' | 'hybrid'>;
  sampledAt: string;
}

/**
 * Parâmetros normalizados consumidos por `analyzeLoadHandling`.
 * Compatível com o motor existente + campos extras para Etapas 5–6.
 */
export interface LoadParams {
  weightKg: number;
  distanceCm: number;
  heightCm: number;
  distanceSource: DistanceSource;
  frequency: LoadFrequency;
  handlingMode: HandlingMode;
  exposureSecs: number;
  estimatedTaskMinutes: number;
  repetitionsPerMinute: number;
  gripType: GripType;
  trunkTwist: boolean;
  displacementWithLoad: boolean;
  visionConfidence?: number;
}

export interface LoadRecommendation {
  id: string;
  prioridade: 'alta' | 'media';
  titulo: string;
  detalhe: string;
}

/** Resultado do motor biomecânico de carga */
export interface LoadRiskResult {
  momentoNm: number;
  pesoLimiteKg: number;
  utilizacaoPct: number;
  fatorDistancia: number;
  fatorFrequencia: number;
  fatorPostura: number;
  score: number;
  risk: 'critico' | 'alto' | 'medio' | 'baixo';
  justificativa: string[];
  recomendacoes: LoadRecommendation[];
  /** Distância efetivamente usada no cálculo */
  distanceCmUsed: number;
  heightCmUsed: number;
  /** Principais fatores (ex.: peso×distância, torção) — UI e relatório */
  factorsFound: string[];
}

/** Pacote persistido em análise / API */
export interface LoadAssessmentSnapshot {
  manual: LoadAssessmentManualInput;
  estimate?: LoadDistanceEstimate;
  params?: LoadParams;
  result?: LoadRiskResult;
  effort?: import('../utils/calculateErgonomicLoadRisk').LoadEffortResult;
}

export const DEFAULT_LOAD_MANUAL_INPUT: LoadAssessmentManualInput = {
  enabled: false,
  weightKg: 0,
  estimatedTaskMinutes: 0,
  exposureMinutes: 0,
  repetitionsPerMinute: 0,
  gripType: 'desconhecida',
  trunkTwist: false,
  displacementWithLoad: false,
  handlingMode: 'individual',
  distanceCmManual: 0,
  heightCmManual: 0,
  loadNotes: '',
  objectDescription: '',
  calibrationRealCm: 0,
  calibrationPx: 0,
};

/** Deriva frequência a partir de RPM (limiares NR-17 / NIOSH simplificados) */
export function frequencyFromRepetitions(rpm: number): LoadFrequency {
  if (rpm > 6) return 'continuo';
  if (rpm >= 1) return 'frequente';
  return 'esporadico';
}

/** Resolve distância efetiva: medição na câmera (sessão) > visão em tempo real > 0 */
export function resolveLoadDistanceCm(
  manual: LoadAssessmentManualInput,
  estimate?: LoadDistanceEstimate | null,
): { distanceCm: number; heightCm: number; source: DistanceSource; visionConfidence?: number } {
  const measured = (manual.measuredDistanceCm ?? 0) > 0 ? manual.measuredDistanceCm! : 0;
  const manualHeight = manual.heightCmManual > 0 ? manual.heightCmManual : 0;
  const visionDist = estimate && estimate.confidence >= 0.35 ? estimate.distanceCm : 0;
  const visionHeight = estimate && estimate.confidence >= 0.35 ? estimate.heightCm : 0;

  if (measured > 0 && visionDist > 0) {
    return {
      distanceCm: Math.round((measured + visionDist) / 2),
      heightCm: manualHeight > 0 ? manualHeight : visionHeight,
      source: 'hybrid',
      visionConfidence: estimate?.confidence,
    };
  }
  if (measured > 0) {
    return { distanceCm: measured, heightCm: manualHeight, source: 'vision' };
  }
  if (visionDist > 0) {
    return {
      distanceCm: visionDist,
      heightCm: visionHeight,
      source: 'vision',
      visionConfidence: estimate?.confidence,
    };
  }
  return { distanceCm: 0, heightCm: manualHeight || visionHeight, source: 'none' };
}

/**
 * Converte entrada manual + estimativa opcional em parâmetros do motor.
 * @param sessionExposureSecs — duração real da gravação (sobrescreve exposureMinutes se maior)
 */
export function normalizeLoadParams(
  manual: LoadAssessmentManualInput,
  estimate?: LoadDistanceEstimate | null,
  sessionExposureSecs?: number,
): LoadParams | null {
  if (!manual.enabled) return null;

  const { distanceCm, heightCm, source, visionConfidence } = resolveLoadDistanceCm(manual, estimate);
  const frequency = manual.frequency ?? frequencyFromRepetitions(manual.repetitionsPerMinute);
  const exposureFromManual = Math.max(0, Math.round(manual.exposureMinutes * 60));
  const exposureSecs = Math.max(exposureFromManual, sessionExposureSecs ?? 0);

  return {
    weightKg: Math.max(0, manual.weightKg),
    distanceCm,
    heightCm,
    distanceSource: source,
    frequency,
    handlingMode: manual.handlingMode,
    exposureSecs,
    estimatedTaskMinutes: Math.max(1, manual.estimatedTaskMinutes),
    repetitionsPerMinute: Math.max(0, manual.repetitionsPerMinute),
    gripType: manual.gripType,
    trunkTwist: manual.trunkTwist,
    displacementWithLoad: manual.displacementWithLoad,
    visionConfidence,
  };
}

export function buildLoadAssessmentSnapshot(
  manual: LoadAssessmentManualInput,
  params: LoadParams | null,
  result?: LoadRiskResult,
  estimate?: LoadDistanceEstimate,
  effort?: import('../utils/calculateErgonomicLoadRisk').LoadEffortResult,
): LoadAssessmentSnapshot | undefined {
  if (!manual.enabled) return undefined;
  const hasDistance =
    (manual.measuredDistanceCm ?? 0) > 0 ||
    (estimate?.distanceCm ?? 0) > 0 ||
    (params?.distanceCm ?? 0) > 0 ||
    !!effort;
  if (!params && !effort && !hasDistance) return undefined;
  return { manual, estimate, params: params ?? undefined, result, effort };
}
