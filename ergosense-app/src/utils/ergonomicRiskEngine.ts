/**
 * Motor unificado de risco ergonômico — postura + carga + exposição.
 */

import type { ActivityContext } from '../data/activityProfiles';
import type { JointAngles, RiskLevel } from '../types';
import type { LoadParams, LoadRiskResult } from '../types/loadAssessment';
import type { WorkstationMetrics } from '../types/workstation';
import { riskFromScore, scoreFromAngles, riskLabel } from './ergonomics';
import { calculateReba } from '../methods/reba';
import { calculateRula } from '../methods/rula';
import { analyzeLoadHandling, combinedErgonomicScore } from './loadHandling';

export interface ErgonomicEvaluationInput {
  angles: JointAngles;
  workstation?: WorkstationMetrics | null;
  activityContext?: ActivityContext | null;
  loadParams?: LoadParams | null;
}

export interface ErgonomicEvaluationResult {
  postureScore: number;
  loadResult: LoadRiskResult | null;
  combinedScore: number;
  risk: RiskLevel;
  rula: number;
  reba: number;
  primaryFactors: string[];
}

export function evaluateErgonomicSession(input: ErgonomicEvaluationInput): ErgonomicEvaluationResult {
  const { angles, workstation, activityContext, loadParams } = input;
  const postureScore = scoreFromAngles(angles, workstation, activityContext);
  const loadResult = loadParams ? analyzeLoadHandling(loadParams, angles) : null;
  const combinedScore = loadResult
    ? combinedErgonomicScore(postureScore, loadResult)
    : postureScore;
  const risk = riskFromScore(combinedScore);

  const primaryFactors: string[] = [];
  if (angles.lombar >= 20) primaryFactors.push('tronco_inclinado');
  if (angles.ombroD >= 90) primaryFactors.push('ombro_elevado');
  if (angles.repeticao >= 6) primaryFactors.push('repeticao');
  if (loadResult) {
    primaryFactors.push(...loadResult.factorsFound);
  }

  return {
    postureScore,
    loadResult,
    combinedScore,
    risk,
    rula: calculateRula(angles).score,
    reba: calculateReba(angles).score,
    primaryFactors: [...new Set(primaryFactors)],
  };
}

export function riskLevelLabelPt(risk: RiskLevel): string {
  if (risk === 'critico') return 'Risco crítico';
  return `${riskLabel(risk)} risco`;
}
