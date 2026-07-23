import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@mediapipe/tasks-vision', () => {
  class FakeLandmarker {
    closed = false;
    close() {
      this.closed = true;
    }
    detectForVideo() {
      if (this.closed) throw new Error('closed');
      return { landmarks: [] };
    }
  }
  return {
    FilesetResolver: {
      forVisionTasks: vi.fn(async () => ({})),
    },
    PoseLandmarker: {
      createFromOptions: vi.fn(async () => new FakeLandmarker()),
    },
  };
});

describe('posePipeline landmarker refcount', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('não devolve instância fechada após release total', async () => {
    const mod = await import('../posePipeline');
    const a = await mod.getPoseLandmarker(true);
    const b = await mod.getPoseLandmarker(true);
    expect(a).toBe(b);
    expect(mod.getPoseLandmarkerRefCount()).toBe(2);

    mod.releasePoseLandmarker();
    expect(mod.getPoseLandmarkerRefCount()).toBe(1);
    expect((a as { closed?: boolean }).closed).toBeFalsy();

    mod.releasePoseLandmarker();
    expect(mod.getPoseLandmarkerRefCount()).toBe(0);
    expect((a as { closed?: boolean }).closed).toBe(true);

    const c = await mod.getPoseLandmarker(true);
    expect(c).not.toBe(a);
    expect((c as { closed?: boolean }).closed).toBeFalsy();
    mod.releasePoseLandmarker();
  });
});
