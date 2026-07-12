import { describe, expect, it } from 'vitest';
import { calculateRula } from '../../methods/rula';
import { calculateReba } from '../../methods/reba';
import { calculateNioshRnle } from '../../methods/nioshRnle';
import { calculateOwas } from '../../methods/owas';
import { runSessionMethods } from '../../methods/runSessionMethods';
import { EMPTY_JOINT_ANGLES } from '../poseGeometry';

describe('RULA oficial', () => {
  it('retorna score 1-7', () => {
    const r = calculateRula({ ...EMPTY_JOINT_ANGLES, lombar: 5, ombroD: 30 });
    expect(r.score).toBeGreaterThanOrEqual(1);
    expect(r.score).toBeLessThanOrEqual(7);
  });
});

describe('REBA oficial', () => {
  it('retorna score 1-15', () => {
    const r = calculateReba({ ...EMPTY_JOINT_ANGLES, lombar: 40, ombroD: 100 });
    expect(r.score).toBeGreaterThanOrEqual(1);
    expect(r.score).toBeLessThanOrEqual(15);
  });
});

describe('NIOSH RNLE', () => {
  it('calcula LI e RWL', () => {
    const r = calculateNioshRnle({
      weightKg: 20,
      horizontalCm: 30,
      verticalOriginCm: 75,
      verticalDestCm: 75,
      asymmetryDeg: 0,
      frequencyPerMin: 1,
    });
    expect(r.outputs.LI).toBeGreaterThan(0);
    expect(r.outputs.RWL).toBeGreaterThan(0);
  });
});

describe('OWAS', () => {
  it('classe 1-4', () => {
    const r = calculateOwas({ ...EMPTY_JOINT_ANGLES, lombar: 5 }, 5);
    expect(r.score).toBeGreaterThanOrEqual(1);
    expect(r.score).toBeLessThanOrEqual(4);
  });
});

describe('runSessionMethods', () => {
  it('executa pacote V2 com múltiplos métodos', () => {
    const report = runSessionMethods({
      angles: { ...EMPTY_JOINT_ANGLES, lombar: 25, ombroD: 95, repeticao: 6 },
      loadParams: {
        weightKg: 15,
        distanceCm: 35,
        heightCm: 80,
        frequency: 'frequente',
        handlingMode: 'individual',
        exposureSecs: 300,
        trunkTwist: false,
        displacementWithLoad: false,
        gripType: 'regular',
        repetitionsPerMinute: 4,
        distanceSource: 'vision',
        estimatedTaskMinutes: 30,
      },
    });
    expect(report.methods.length).toBeGreaterThan(10);
    expect(report.aiReport).toBeDefined();
  });
});
