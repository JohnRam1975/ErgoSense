/**
 * Rastreia objeto/carga na câmera e mede distância horizontal até o tronco.
 * Prioridade: toque do usuário → dedos/punhos mais afastados do corpo → estimativa da pose.
 */

import type { LoadDistanceEstimate } from '../types/loadAssessment';
import type { PosePoint } from '../types/pose';
import { POSE, midpoint } from './poseGeometry';
import {
  type MeasureDistanceInput,
  type ScreenPoint,
  landmarkToContainer,
  pxPerCm,
  trunkCenterFromLandmarks,
} from './measureLoadDistance';
import { REF_SHOULDER_WIDTH_CM, dist2d, normToCm } from './loadDistanceMath';

const LOAD_VISIBILITY = 0.2;

export type LoadTrackMethod =
  | 'tap'
  | 'hands'
  | 'calibration'
  | 'shoulder_scale'
  | 'vision_estimate';

export interface LoadDistanceTrackResult {
  distanceCm: number;
  trunk: ScreenPoint;
  load: ScreenPoint;
  method: LoadTrackMethod;
  confidence: number;
}

function isLoadVisible(p: PosePoint | undefined): p is PosePoint {
  return !!p && (p.visibility ?? 0) >= LOAD_VISIBILITY;
}

function resolveVideoSize(videoW: number, videoH: number, cw: number, ch: number): { videoWidth: number; videoHeight: number } {
  if (videoW > 0 && videoH > 0) return { videoWidth: videoW, videoHeight: videoH };
  return { videoWidth: Math.max(cw, 640), videoHeight: Math.max(ch, 480) };
}

/** Ponto da carga: toque ou rastreio automático das mãos/objeto */
export function detectLoadScreenPoint(
  landmarks: PosePoint[],
  input: MeasureDistanceInput,
  trunkLandmark: PosePoint,
): ScreenPoint | null {
  if (input.loadObjectTap) return input.loadObjectTap;

  const ls = landmarks[POSE.leftShoulder];
  const rs = landmarks[POSE.rightShoulder];
  if (!isLoadVisible(ls) || !isLoadVisible(rs)) return null;

  const trunkX = trunkLandmark.x;
  const mirrored = input.mirrored ?? true;
  const { videoWidth, videoHeight } = resolveVideoSize(
    input.videoWidth,
    input.videoHeight,
    input.containerWidth,
    input.containerHeight,
  );

  type Candidate = { p: PosePoint; priority: number };
  const candidates: Candidate[] = [];
  const add = (idx: number, priority: number) => {
    const p = landmarks[idx];
    if (isLoadVisible(p)) candidates.push({ p, priority });
  };

  add(POSE.leftIndex, 4);
  add(POSE.rightIndex, 4);
  add(POSE.leftWrist, 3);
  add(POSE.rightWrist, 3);
  add(POSE.leftThumb, 2);
  add(POSE.rightThumb, 2);
  add(POSE.leftPinky, 1);
  add(POSE.rightPinky, 1);

  if (!candidates.length) return null;

  let best = candidates[0];
  let bestScore = -1;
  for (const c of candidates) {
    const horiz = Math.abs(c.p.x - trunkX);
    const score = horiz * c.priority * (c.p.visibility ?? 0.5);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return landmarkToContainer(
    best.p,
    videoWidth,
    videoHeight,
    input.containerWidth,
    input.containerHeight,
    mirrored,
  );
}

function trunkLandmarkPoint(landmarks: PosePoint[]): PosePoint | null {
  const ls = landmarks[POSE.leftShoulder];
  const rs = landmarks[POSE.rightShoulder];
  const lh = landmarks[POSE.leftHip];
  const rh = landmarks[POSE.rightHip];

  if (isLoadVisible(ls) && isLoadVisible(rs) && isLoadVisible(lh) && isLoadVisible(rh)) {
    return midpoint(midpoint(ls, rs), midpoint(lh, rh));
  }
  if (isLoadVisible(ls) && isLoadVisible(rs)) {
    return midpoint(ls, rs);
  }
  return null;
}

function horizontalDistanceCm(
  landmarks: PosePoint[],
  trunkLm: PosePoint,
  loadLm: PosePoint,
): number {
  const ls = landmarks[POSE.leftShoulder];
  const rs = landmarks[POSE.rightShoulder];
  if (!isLoadVisible(ls) || !isLoadVisible(rs)) return 0;
  const shoulderWidthNorm = dist2d(ls, rs);
  const horizNorm = Math.abs(loadLm.x - trunkLm.x);
  return normToCm(horizNorm, shoulderWidthNorm, 1);
}

function screenDistanceCm(
  trunk: ScreenPoint,
  load: ScreenPoint,
  landmarks: PosePoint[],
  input: MeasureDistanceInput,
): number {
  const cw = input.containerWidth;
  const ch = input.containerHeight;
  const ax = trunk.x * cw;
  const ay = trunk.y * ch;
  const bx = load.x * cw;
  const by = load.y * ch;
  const distancePx = Math.hypot(ax - bx, ay - by);

  const cal = input.calibration;
  if (cal && cal.realCm > 0 && cal.pxSize > 0) {
    return Math.max(1, Math.round(distancePx / pxPerCm(cal)));
  }

  const ls = landmarks[POSE.leftShoulder];
  const rs = landmarks[POSE.rightShoulder];
  if (!isLoadVisible(ls) || !isLoadVisible(rs)) return 0;

  const mirrored = input.mirrored ?? true;
  const { videoWidth, videoHeight } = resolveVideoSize(
    input.videoWidth,
    input.videoHeight,
    cw,
    ch,
  );
  const lsS = landmarkToContainer(ls, videoWidth, videoHeight, cw, ch, mirrored);
  const rsS = landmarkToContainer(rs, videoWidth, videoHeight, cw, ch, mirrored);
  const shoulderPx = Math.hypot((lsS.x - rsS.x) * cw, (lsS.y - rsS.y) * ch);
  if (shoulderPx < 8) return 0;
  const cmPerPx = REF_SHOULDER_WIDTH_CM / shoulderPx;
  return Math.max(1, Math.round(distancePx * cmPerPx));
}

/**
 * Mede e rastreia distância carga ↔ tronco no frame atual.
 */
export function trackLoadDistance(
  landmarks: PosePoint[] | null | undefined,
  input: Omit<MeasureDistanceInput, 'landmarks'> & { estimate?: LoadDistanceEstimate | null },
): LoadDistanceTrackResult | null {
  const { containerWidth: cw, containerHeight: ch, estimate } = input;
  if (!landmarks?.length || cw <= 0 || ch <= 0) return null;

  const { videoWidth, videoHeight } = resolveVideoSize(input.videoWidth, input.videoHeight, cw, ch);
  const measureInput: MeasureDistanceInput = {
    ...input,
    landmarks,
    videoWidth,
    videoHeight,
  };

  const trunkLm = trunkLandmarkPoint(landmarks);
  if (!trunkLm) {
    if (estimate && estimate.distanceCm > 0 && estimate.confidence >= 0.25) {
      const trunk = trunkCenterFromLandmarks(landmarks, measureInput);
      if (!trunk) return null;
      return {
        distanceCm: estimate.distanceCm,
        trunk,
        load: { x: trunk.x + 0.08, y: trunk.y },
        method: 'vision_estimate',
        confidence: estimate.confidence,
      };
    }
    return null;
  }

  const trunk =
    trunkCenterFromLandmarks(landmarks, measureInput) ??
    landmarkToContainer(trunkLm, videoWidth, videoHeight, cw, ch, input.mirrored ?? true);

  const load = detectLoadScreenPoint(landmarks, measureInput, trunkLm);
  if (!load) {
    if (estimate && estimate.distanceCm > 0) {
      return {
        distanceCm: estimate.distanceCm,
        trunk,
        load: { x: Math.min(0.95, trunk.x + 0.12), y: trunk.y },
        method: 'vision_estimate',
        confidence: estimate.confidence,
      };
    }
    return null;
  }

  const loadLmForHoriz = input.loadObjectTap
    ? null
    : (() => {
        const ls = landmarks[POSE.leftShoulder];
        const rs = landmarks[POSE.rightShoulder];
        if (!isLoadVisible(ls) || !isLoadVisible(rs)) return null;
        const trunkX = trunkLm.x;
        const candidates: PosePoint[] = [];
        for (const idx of [
          POSE.leftIndex,
          POSE.rightIndex,
          POSE.leftWrist,
          POSE.rightWrist,
        ]) {
          const p = landmarks[idx];
          if (isLoadVisible(p)) candidates.push(p);
        }
        if (!candidates.length) return null;
        return candidates.reduce((best, p) =>
          Math.abs(p.x - trunkX) > Math.abs(best.x - trunkX) ? p : best,
        );
      })();

  let distanceCm = loadLmForHoriz
    ? horizontalDistanceCm(landmarks, trunkLm, loadLmForHoriz)
    : screenDistanceCm(trunk, load, landmarks, measureInput);

  if (distanceCm <= 0 && estimate && estimate.distanceCm > 0) {
    distanceCm = estimate.distanceCm;
  }

  if (distanceCm <= 0) return null;

  const method: LoadTrackMethod = input.loadObjectTap
    ? input.calibration
      ? 'calibration'
      : 'tap'
    : input.calibration
      ? 'calibration'
      : loadLmForHoriz
        ? 'hands'
        : 'shoulder_scale';

  const vis = [landmarks[POSE.leftShoulder], landmarks[POSE.rightShoulder]]
    .filter(isLoadVisible)
    .map((p) => p.visibility ?? 0.5);
  const confidence =
    estimate?.confidence ??
    Math.min(1, vis.reduce((a, b) => a + b, 0) / Math.max(1, vis.length));

  return {
    distanceCm,
    trunk,
    load,
    method,
    confidence: Math.round(confidence * 100) / 100,
  };
}
