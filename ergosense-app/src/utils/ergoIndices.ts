import {
  classifyErgoIndex,
  ERGO_INDEX_FORMULAS,
  type ErgoIndexBand,
} from '../config/ergoMethodology';
import type { Nr17ComplianceItem } from './nr17';
import type { LoadEffortResult } from './calculateErgonomicLoadRisk';
import type { LoadRiskResult } from './loadHandling';
import { POSTURE_DURATION_LIMITS } from './postureDuration';

export interface ErgoSenseIndices {
  riskIndex: number;
  exposureIndex: number;
  internalConformityIndex: number;
  riskBand: ErgoIndexBand;
  exposureBand: ErgoIndexBand;
  conformityBand: ErgoIndexBand;
  formulas: typeof ERGO_INDEX_FORMULAS;
  computedAt: string;
}

function clamp100(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)));
}

function loadPenalty(
  loadResult?: LoadRiskResult | null,
  loadEffort?: LoadEffortResult | null,
  nioshLi?: number | null,
): number {
  if (loadEffort) return Math.min(40, Math.floor(loadEffort.indiceEsforco / 5));
  if (nioshLi != null && Number.isFinite(nioshLi)) return Math.min(40, Math.round(nioshLi * 10));
  if (loadResult) return Math.min(40, Math.floor(loadResult.score * 0.25));
  return 0;
}

function loadExposure(
  loadResult?: LoadRiskResult | null,
  loadEffort?: LoadEffortResult | null,
  nioshLi?: number | null,
): number {
  if (loadEffort) return Math.min(100, Math.floor(loadEffort.indiceEsforco / 2));
  if (nioshLi != null && Number.isFinite(nioshLi)) return Math.min(100, Math.round(nioshLi * 25));
  return loadResult ? Math.min(100, loadResult.utilizacaoPct ?? loadResult.score) : 0;
}

/** Calcula os três índices ErgoSense com rastreabilidade de fórmula */
export function calculateErgoSenseIndices(params: {
  ergoScore: number;
  rula: number;
  reba: number;
  riskTimePct: number;
  maxRiskStreakSecs: number;
  items: Nr17ComplianceItem[];
  loadResult?: LoadRiskResult | null;
  loadEffort?: LoadEffortResult | null;
  nioshLi?: number | null;
}): ErgoSenseIndices {
  const { ergoScore, rula, reba, riskTimePct, maxRiskStreakSecs, items, loadResult, loadEffort, nioshLi } =
    params;

  const scorable = items.filter((i) => i.id !== 'contexto');
  const nNc = scorable.filter((i) => i.status === 'nao_conforme').length;
  const nAt = scorable.filter((i) => i.status === 'atencao').length;
  const pCarga = loadPenalty(loadResult, loadEffort, nioshLi);

  const sPost = Math.round((rula / 7) * 50 + (reba / 15) * 50);

  const riskIndex = clamp100(
    100 - (0.35 * sPost + 0.25 * riskTimePct + 0.2 * nNc * 8 + 0.2 * pCarga),
  );

  const eStatica = Math.min(
    100,
    Math.round((maxRiskStreakSecs / POSTURE_DURATION_LIMITS.criticoSecs) * 100),
  );
  const eCarga = loadExposure(loadResult, loadEffort, nioshLi);
  const exposureIndex = clamp100(100 - (0.4 * riskTimePct + 0.3 * eStatica + 0.3 * eCarga));

  const internalConformityIndex = clamp100(
    100 - (ergoScore + nNc * 8 + nAt * 4 + Math.floor(riskTimePct / 5) + pCarga),
  );

  return {
    riskIndex,
    exposureIndex,
    internalConformityIndex,
    riskBand: classifyErgoIndex(riskIndex),
    exposureBand: classifyErgoIndex(exposureIndex),
    conformityBand: classifyErgoIndex(internalConformityIndex),
    formulas: ERGO_INDEX_FORMULAS,
    computedAt: new Date().toISOString(),
  };
}
