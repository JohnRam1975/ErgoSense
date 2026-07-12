import { describe, expect, it } from 'vitest';
import { analyzeLoadHandling } from '../loadHandling';
import { normalizeLoadParams, DEFAULT_LOAD_MANUAL_INPUT } from '../../types/loadAssessment';
import type { JointAngles } from '../../types';

const baseAngles: JointAngles = {
  lombar: 25,
  dorso: 20,
  ombroD: 85,
  pescoco: 10,
  cotovelo: 90,
  maoD: 15,
  quadril: 100,
  joelhoD: 95,
  tornozeloD: 90,
  repeticao: 2,
};

describe('analyzeLoadHandling', () => {
  it('aumenta risco quando carga pesada está distante do corpo', () => {
    const params = {
      weightKg: 30,
      distanceCm: 20,
      heightCm: 40,
      distanceSource: 'manual' as const,
      frequency: 'esporadico' as const,
      handlingMode: 'individual' as const,
      exposureSecs: 120,
      estimatedTaskMinutes: 15,
      repetitionsPerMinute: 0,
      gripType: 'boa' as const,
      trunkTwist: false,
      displacementWithLoad: false,
    };
    const near = analyzeLoadHandling(params, baseAngles);
    const far = analyzeLoadHandling({ ...params, distanceCm: 55 }, baseAngles);
    expect(far.score).toBeGreaterThan(near.score);
    expect(far.factorsFound).toContain('carga_distante');
  });

  it('reduz risco com dois trabalhadores', () => {
    const params = normalizeLoadParams({
      ...DEFAULT_LOAD_MANUAL_INPUT,
      enabled: true,
      weightKg: 40,
      distanceCmManual: 35,
    });
    if (!params) throw new Error('params expected');
    const individual = analyzeLoadHandling({ ...params, handlingMode: 'individual' }, baseAngles);
    const duo = analyzeLoadHandling({ ...params, handlingMode: 'dois_trabalhadores' }, baseAngles);
    expect(duo.score).toBeLessThan(individual.score);
  });
});
