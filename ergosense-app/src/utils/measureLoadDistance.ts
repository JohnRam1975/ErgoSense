/**
 * Mede distância tronco ↔ carga (pose MediaPipe + toque na tela + calibração px/cm).
 */

import type { PosePoint } from '../types/pose';
import { POSE, isVisible, midpoint } from './poseGeometry';

export interface ScreenPoint {
  /** 0–1 relativo ao container da câmera */
  x: number;
  y: number;
}

export interface DistanceCalibration {
  realCm: number;
  pxSize: number;
}

export interface MeasureDistanceInput {
  landmarks: PosePoint[];
  containerWidth: number;
  containerHeight: number;
  videoWidth: number;
  videoHeight: number;
  loadObjectTap?: ScreenPoint | null;
  calibration?: DistanceCalibration | null;
  mirrored?: boolean;
}

const REF_SHOULDER_WIDTH_CM = 42;

export function landmarkToContainer(
  p: PosePoint,
  videoW: number,
  videoH: number,
  cw: number,
  ch: number,
  mirrored: boolean,
): ScreenPoint {
  const x = mirrored ? 1 - p.x : p.x;
  const scale = Math.max(cw / videoW, ch / videoH);
  const dw = videoW * scale;
  const dh = videoH * scale;
  const ox = (cw - dw) / 2;
  const oy = (ch - dh) / 2;
  return {
    x: (x * videoW * scale + ox) / cw,
    y: (p.y * videoH * scale + oy) / ch,
  };
}

function distPx(a: ScreenPoint, b: ScreenPoint, cw: number, ch: number): number {
  const ax = a.x * cw;
  const ay = a.y * ch;
  const bx = b.x * cw;
  const by = b.y * ch;
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

export function trunkCenterFromLandmarks(
  landmarks: PosePoint[],
  input: Omit<MeasureDistanceInput, 'loadObjectTap' | 'calibration'>,
): ScreenPoint | null {
  const ls = landmarks[POSE.leftShoulder];
  const rs = landmarks[POSE.rightShoulder];
  const lh = landmarks[POSE.leftHip];
  const rh = landmarks[POSE.rightHip];
  if (!isVisible(ls) || !isVisible(rs)) return null;

  const shoulderMid = midpoint(ls, rs);
  const trunkLm =
    isVisible(lh) && isVisible(rh)
      ? midpoint(shoulderMid, midpoint(lh, rh))
      : shoulderMid;
  return landmarkToContainer(
    trunkLm,
    input.videoWidth,
    input.videoHeight,
    input.containerWidth,
    input.containerHeight,
    input.mirrored ?? true,
  );
}

export function loadCenterFromInput(
  landmarks: PosePoint[],
  input: MeasureDistanceInput,
): ScreenPoint | null {
  if (input.loadObjectTap) return input.loadObjectTap;

  const rw = landmarks[POSE.rightWrist];
  const lw = landmarks[POSE.leftWrist];
  const wrists: PosePoint[] = [];
  if (isVisible(rw)) wrists.push(rw);
  if (isVisible(lw)) wrists.push(lw);
  if (!wrists.length) return null;

  const wMid = wrists.length === 1 ? wrists[0] : midpoint(wrists[0], wrists[1]);
  return landmarkToContainer(
    wMid,
    input.videoWidth,
    input.videoHeight,
    input.containerWidth,
    input.containerHeight,
    input.mirrored ?? true,
  );
}

export function pxPerCm(calibration: DistanceCalibration): number {
  if (calibration.realCm <= 0 || calibration.pxSize <= 0) return 0;
  return calibration.pxSize / calibration.realCm;
}

export function measureDistanceCm(input: MeasureDistanceInput): {
  distanceCm: number;
  distancePx: number;
  trunk: ScreenPoint;
  load: ScreenPoint;
  method: 'calibration' | 'shoulder_scale' | 'manual_required';
} | null {
  const { landmarks, containerWidth: cw, containerHeight: ch } = input;
  if (!landmarks?.length || cw <= 0 || ch <= 0) return null;

  const trunk = trunkCenterFromLandmarks(landmarks, input);
  const load = loadCenterFromInput(landmarks, input);
  if (!trunk || !load) return null;

  const distancePx = distPx(trunk, load, cw, ch);

  const cal = input.calibration;
  if (cal && cal.realCm > 0 && cal.pxSize > 0) {
    const ppc = pxPerCm(cal);
    return {
      distanceCm: Math.round(distancePx / ppc),
      distancePx,
      trunk,
      load,
      method: 'calibration',
    };
  }

  const ls = landmarks[POSE.leftShoulder];
  const rs = landmarks[POSE.rightShoulder];
  if (isVisible(ls) && isVisible(rs)) {
    const lsS = landmarkToContainer(ls, input.videoWidth, input.videoHeight, cw, ch, input.mirrored ?? true);
    const rsS = landmarkToContainer(rs, input.videoWidth, input.videoHeight, cw, ch, input.mirrored ?? true);
    const shoulderPx = distPx(lsS, rsS, cw, ch);
    if (shoulderPx > 10) {
      const cmPerPx = REF_SHOULDER_WIDTH_CM / shoulderPx;
      return {
        distanceCm: Math.max(1, Math.round(distancePx * cmPerPx)),
        distancePx,
        trunk,
        load,
        method: 'shoulder_scale',
      };
    }
  }

  return null;
}
