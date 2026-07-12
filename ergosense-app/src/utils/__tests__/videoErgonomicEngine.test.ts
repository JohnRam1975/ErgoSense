import { describe, it, expect } from 'vitest';
import { analyzeVideoErgonomicSession } from '../../services/videoErgonomicEngine';
import type { VideoFrameSample } from '../../services/videoAnalysis';

function frame(ts: number, overrides: Partial<VideoFrameSample['angles']> = {}): VideoFrameSample {
  return {
    timestampMs: ts,
    angles: {
      lombar: 10,
      dorso: 8,
      ombroD: 45,
      pescoco: 12,
      cotovelo: 90,
      maoD: 140,
      quadril: 95,
      joelhoD: 110,
      tornozeloD: 95,
      repeticao: 2,
      ...overrides,
    },
  };
}

describe('videoErgonomicEngine', () => {
  it('calculates exposure percentages for risky frames', () => {
    const frames = [
      frame(0, { lombar: 25 }),
      frame(1000, { lombar: 25 }),
      frame(2000, { lombar: 5 }),
      frame(3000, { lombar: 5 }),
    ];
    const report = analyzeVideoErgonomicSession({ frames, baseInput: {} });
    const lombar = report.exposureByRegion.find((e) => e.regionId === 'lombar');
    expect(lombar?.exposurePct).toBe(50);
  });

  it('generates timeline events for posture changes', () => {
    const frames = [
      frame(0, { lombar: 5 }),
      frame(1000, { lombar: 28 }),
      frame(2000, { lombar: 28 }),
      frame(3000, { lombar: 5 }),
    ];
    const report = analyzeVideoErgonomicSession({ frames, baseInput: {} });
    expect(report.timeline.some((e) => e.type === 'postura')).toBe(true);
    expect(report.timeline.some((e) => e.type === 'correcao')).toBe(true);
  });

  it('computes RULA/REBA/OWAS scores', () => {
    const frames = Array.from({ length: 10 }, (_, i) => frame(i * 1000, { lombar: 30, ombroD: 100 }));
    const report = analyzeVideoErgonomicSession({ frames, baseInput: {} });
    expect(report.scores.rula.score).toBeGreaterThan(0);
    expect(report.scores.reba.score).toBeGreaterThan(0);
    expect(report.executive.ergonomicIndex).toBeLessThanOrEqual(100);
  });

  it('detects repetitive movement risk', () => {
    const frames = Array.from({ length: 5 }, (_, i) => frame(i * 1000, { repeticao: 10 }));
    const report = analyzeVideoErgonomicSession({ frames, baseInput: {} });
    expect(['alto', 'critico', 'medio']).toContain(report.repetitiveMovement.frequencyClass);
  });

  it('segments work journey phases', () => {
    const frames = [
      frame(0, { lombar: 5, repeticao: 0 }),
      frame(2000, { lombar: 35, repeticao: 4 }),
      frame(4000, { lombar: 40, repeticao: 5 }),
      frame(6000, { lombar: 8, repeticao: 0 }),
    ];
    const report = analyzeVideoErgonomicSession({ frames, baseInput: {} });
    expect(report.journey).toBeDefined();
    expect(report.journey!.phases.length).toBeGreaterThan(0);
  });
});
