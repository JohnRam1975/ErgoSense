import { describe, expect, it } from 'vitest';
import { POSE } from '../poseGeometry';
import type { PosePoint } from '../../types/pose';
import { trackLoadDistance } from '../trackLoadDistance';

function lm(x: number, y: number, v = 0.9): PosePoint {
  return { x, y, visibility: v };
}

function baseLandmarks(): PosePoint[] {
  const arr = Array.from({ length: 33 }, () => lm(0.5, 0.5, 0));
  arr[POSE.leftShoulder] = lm(0.35, 0.35);
  arr[POSE.rightShoulder] = lm(0.65, 0.35);
  arr[POSE.leftHip] = lm(0.4, 0.6);
  arr[POSE.rightHip] = lm(0.6, 0.6);
  arr[POSE.leftWrist] = lm(0.2, 0.45);
  arr[POSE.rightWrist] = lm(0.75, 0.5);
  return arr;
}

describe('trackLoadDistance', () => {
  it('mede distância com mãos visíveis', () => {
    const result = trackLoadDistance(baseLandmarks(), {
      containerWidth: 360,
      containerHeight: 640,
      videoWidth: 640,
      videoHeight: 480,
      mirrored: false,
    });
    expect(result).not.toBeNull();
    expect(result!.distanceCm).toBeGreaterThan(0);
    expect(result!.method).toBe('hands');
  });

  it('usa toque na tela como centro da carga', () => {
    const result = trackLoadDistance(baseLandmarks(), {
      containerWidth: 360,
      containerHeight: 640,
      videoWidth: 640,
      videoHeight: 480,
      loadObjectTap: { x: 0.15, y: 0.5 },
      mirrored: false,
    });
    expect(result?.method).toBe('tap');
    expect(result?.distanceCm).toBeGreaterThan(0);
  });
});
