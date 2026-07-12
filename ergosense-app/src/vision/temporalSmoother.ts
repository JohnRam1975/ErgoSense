import type { PosePoint } from '../types/pose';
import { VISION_CONFIG } from './config';

/** Suavização temporal One-Euro simplificada (EMA adaptativa por velocidade) */
export class LandmarkSmoother {
  private prev: PosePoint[] | null = null;
  private prevTime = 0;

  reset() {
    this.prev = null;
    this.prevTime = 0;
  }

  smooth(landmarks: PosePoint[], timestampMs = performance.now()): PosePoint[] {
    if (!this.prev || this.prev.length !== landmarks.length) {
      this.prev = landmarks.map((p) => ({ ...p }));
      this.prevTime = timestampMs;
      return landmarks;
    }

    const dt = Math.max(1, timestampMs - this.prevTime);
    this.prevTime = timestampMs;

    const smoothed = landmarks.map((p, i) => {
      const pv = this.prev![i];
      const speed = Math.hypot(p.x - pv.x, p.y - pv.y) / dt;
      const alpha = Math.min(0.85, VISION_CONFIG.temporal.landmarkSmoothAlpha + speed * 0.15);
      return {
        x: alpha * p.x + (1 - alpha) * pv.x,
        y: alpha * p.y + (1 - alpha) * pv.y,
        visibility: p.visibility,
      };
    });

    this.prev = smoothed.map((p) => ({ ...p }));
    return smoothed;
  }
}

/** Suavização de série temporal de ângulos articulares */
export class AngleSmoother {
  private prev: Record<string, number> | null = null;

  smooth(angles: Record<string, number>, alpha = 0.4): Record<string, number> {
    if (!this.prev) {
      this.prev = { ...angles };
      return angles;
    }
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(angles)) {
      const p = this.prev[k] ?? v;
      out[k] = Math.round(alpha * v + (1 - alpha) * p);
    }
    this.prev = out;
    return out;
  }
}
