/**
 * Estima distância horizontal carga–tronco e altura da carga a partir de landmarks MediaPipe.
 * Usa largura dos ombros como escala de referência (~42 cm adulto médio).
 */

import type { PosePoint } from '../types/pose';
import { POSE, isVisible, midpoint } from './poseGeometry';
import type { LoadDistanceEstimate } from '../types/loadAssessment';
import { dist2d, normToCm } from './loadDistanceMath';

export interface LoadDistanceEstimationInput {
  landmarks: PosePoint[];
  videoWidth: number;
  videoHeight: number;
}

export function estimateLoadDistanceFromPose(input: LoadDistanceEstimationInput): LoadDistanceEstimate | null {
  const { landmarks } = input;
  const ls = landmarks[POSE.leftShoulder];
  const rs = landmarks[POSE.rightShoulder];
  const lh = landmarks[POSE.leftHip];
  const rh = landmarks[POSE.rightHip];
  const rw = landmarks[POSE.rightWrist];
  const lw = landmarks[POSE.leftWrist];

  const vis = (p: PosePoint | undefined) => !!p && (p.visibility ?? 0) >= 0.2;
  if (!vis(ls) || !vis(rs)) return null;

  const shoulderMid = midpoint(ls, rs);
  const hipMid = vis(lh) && vis(rh) ? midpoint(lh, rh) : shoulderMid;
  const shoulderWidthNorm = dist2d(ls, rs);
  if (shoulderWidthNorm < 0.06) return null;

  const hands: PosePoint[] = [];
  const li = landmarks[POSE.leftIndex];
  const ri = landmarks[POSE.rightIndex];
  if (vis(li)) hands.push(li);
  if (vis(ri)) hands.push(ri);
  if (isVisible(rw)) hands.push(rw);
  if (isVisible(lw)) hands.push(lw);
  if (!hands.length) return null;

  const trunkX = shoulderMid.x;
  const handMid = hands.reduce((best, p) =>
    Math.abs(p.x - trunkX) > Math.abs(best.x - trunkX) ? p : best,
  );

  const horizontalNorm = Math.abs(handMid.x - trunkX);
  const distanceCm = Math.max(0, normToCm(horizontalNorm, shoulderWidthNorm));

  const heightNorm = hipMid.y - handMid.y;
  const heightCm = Math.max(0, normToCm(Math.abs(heightNorm), shoulderWidthNorm));

  const visScores = [ls, rs, ...hands].map((p) => p.visibility ?? 0);
  const confidence = Math.min(1, visScores.reduce((a, b) => a + b, 0) / visScores.length);

  return {
    distanceCm,
    heightCm,
    confidence: Math.round(confidence * 100) / 100,
    source: 'vision',
    sampledAt: new Date().toISOString(),
  };
}

export function loadProximityLabel(distanceCm: number): 'proxima' | 'moderada' | 'distante' | 'desconhecida' {
  if (distanceCm <= 0) return 'desconhecida';
  if (distanceCm <= 25) return 'proxima';
  if (distanceCm <= 40) return 'moderada';
  return 'distante';
}
