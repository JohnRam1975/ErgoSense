import { describe, expect, it } from 'vitest';
import { evaluateErgonomicSession } from '../ergonomicRiskEngine';
import { normalizeLoadParams, DEFAULT_LOAD_MANUAL_INPUT } from '../../types/loadAssessment';
import type { JointAngles } from '../../types';

const angles: JointAngles = {
  lombar: 35,
  dorso: 30,
  ombroD: 110,
  pescoco: 20,
  cotovelo: 70,
  maoD: 20,
  quadril: 90,
  joelhoD: 80,
  tornozeloD: 85,
  repeticao: 8,
};

describe('evaluateErgonomicSession', () => {
  it('classifica risco crítico com postura e carga severas', () => {
    const loadParams = normalizeLoadParams({
      ...DEFAULT_LOAD_MANUAL_INPUT,
      enabled: true,
      weightKg: 50,
      measuredDistanceCm: 60,
      trunkTwist: true,
      displacementWithLoad: true,
      exposureMinutes: 30,
    })!;
    const result = evaluateErgonomicSession({
      angles,
      activityContext: 'campo',
      loadParams,
    });
    expect(result.combinedScore).toBeGreaterThanOrEqual(50);
    expect(['alto', 'critico']).toContain(result.risk);
    expect(result.loadResult).not.toBeNull();
  });

  it('mantém apenas score postural sem carga', () => {
    const result = evaluateErgonomicSession({ angles, activityContext: 'escritorio' });
    expect(result.loadResult).toBeNull();
    expect(result.combinedScore).toBe(result.postureScore);
  });
});
