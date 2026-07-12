import { describe, expect, it } from 'vitest';
import { estimateLoadDistanceFromPose, loadProximityLabel } from '../loadDistanceEstimation';
import type { PosePoint } from '../../types/pose';
import { POSE } from '../poseGeometry';

function lm(x: number, y: number, v = 0.9): PosePoint {
  return { x, y, visibility: v };
}

describe('estimateLoadDistanceFromPose', () => {
  it('estima distância maior quando punhos afastados do tronco', () => {
    const base = Array.from({ length: 33 }, () => lm(0.5, 0.5));
    base[POSE.leftShoulder] = lm(0.4, 0.35);
    base[POSE.rightShoulder] = lm(0.6, 0.35);
    base[POSE.leftHip] = lm(0.42, 0.55);
    base[POSE.rightHip] = lm(0.58, 0.55);
    base[POSE.rightWrist] = lm(0.75, 0.5);
    base[POSE.leftWrist] = lm(0.7, 0.5);

    const near = [...base];
    near[POSE.rightWrist] = lm(0.51, 0.5);
    near[POSE.leftWrist] = lm(0.49, 0.5);

    const farEst = estimateLoadDistanceFromPose({
      landmarks: base,
      videoWidth: 1280,
      videoHeight: 720,
    });
    const nearEst = estimateLoadDistanceFromPose({
      landmarks: near,
      videoWidth: 1280,
      videoHeight: 720,
    });

    expect(farEst).not.toBeNull();
    expect(nearEst).not.toBeNull();
    expect(farEst!.distanceCm).toBeGreaterThan(nearEst!.distanceCm);
  });
});

describe('loadProximityLabel', () => {
  it('rotula proximidade', () => {
    expect(loadProximityLabel(20)).toBe('proxima');
    expect(loadProximityLabel(50)).toBe('distante');
  });
});
