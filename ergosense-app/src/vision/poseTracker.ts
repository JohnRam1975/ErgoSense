import type { PosePoint } from '../types/pose';
import { POSE } from '../utils/poseGeometry';
import { VISION_CONFIG } from './config';

export interface TrackedPerson {
  id: number;
  landmarks: PosePoint[];
  confidence: number;
  lostFrames: number;
}

function hipCenter(landmarks: PosePoint[]): { x: number; y: number } {
  const lh = landmarks[POSE.leftHip];
  const rh = landmarks[POSE.rightHip];
  if (!lh || !rh) return { x: landmarks[0]?.x ?? 0.5, y: landmarks[0]?.y ?? 0.5 };
  return { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
}

function avgVisibility(landmarks: PosePoint[]): number {
  if (!landmarks.length) return 0;
  return landmarks.reduce((s, p) => s + p.visibility, 0) / landmarks.length;
}

/** Rastreamento multi-pessoa por proximidade de centro de quadril entre frames */
export class MultiPersonPoseTracker {
  private tracks: TrackedPerson[] = [];
  private nextId = 1;

  reset() {
    this.tracks = [];
    this.nextId = 1;
  }

  update(allLandmarks: PosePoint[][]): TrackedPerson[] {
    const maxDist = VISION_CONFIG.temporal.trackerMaxDistance;
    const maxLost = VISION_CONFIG.temporal.trackerMaxLostFrames;
    const used = new Set<number>();

    for (const track of this.tracks) {
      let bestIdx = -1;
      let bestDist = Infinity;
      const tc = hipCenter(track.landmarks);

      for (let i = 0; i < allLandmarks.length; i++) {
        if (used.has(i)) continue;
        const c = hipCenter(allLandmarks[i]);
        const d = Math.hypot(c.x - tc.x, c.y - tc.y);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0 && bestDist <= maxDist) {
        track.landmarks = allLandmarks[bestIdx];
        track.confidence = avgVisibility(track.landmarks);
        track.lostFrames = 0;
        used.add(bestIdx);
      } else {
        track.lostFrames += 1;
      }
    }

    this.tracks = this.tracks.filter((t) => t.lostFrames <= maxLost);

    for (let i = 0; i < allLandmarks.length; i++) {
      if (used.has(i)) continue;
      this.tracks.push({
        id: this.nextId++,
        landmarks: allLandmarks[i],
        confidence: avgVisibility(allLandmarks[i]),
        lostFrames: 0,
      });
    }

    return [...this.tracks].sort((a, b) => b.confidence - a.confidence);
  }

  getPrimary(): TrackedPerson | null {
    return this.tracks.sort((a, b) => b.confidence - a.confidence)[0] ?? null;
  }
}
