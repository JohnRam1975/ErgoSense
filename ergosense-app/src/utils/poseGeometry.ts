import type { JointAngles } from '../types';
import type { PosePoint } from '../types/pose';

/** Índices MediaPipe Pose (33 landmarks) */
export const POSE = {
  nose: 0,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftPinky: 17,
  rightPinky: 18,
  leftIndex: 19,
  rightIndex: 20,
  leftThumb: 21,
  rightThumb: 22,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

/** Articulações desenhadas no overlay (evita poluir com pontos da face) */
export const KEY_JOINTS = [
  POSE.nose,
  POSE.leftEar,
  POSE.rightEar,
  POSE.leftShoulder,
  POSE.rightShoulder,
  POSE.leftElbow,
  POSE.rightElbow,
  POSE.leftWrist,
  POSE.rightWrist,
  POSE.leftPinky,
  POSE.rightPinky,
  POSE.leftIndex,
  POSE.rightIndex,
  POSE.leftThumb,
  POSE.rightThumb,
  POSE.leftHip,
  POSE.rightHip,
  POSE.leftKnee,
  POSE.rightKnee,
  POSE.leftAnkle,
  POSE.rightAnkle,
] as const;

/** Esqueleto simplificado na câmera — sem dedos nem malha facial */
export const MINIMAL_KEY_JOINTS = [
  POSE.nose,
  POSE.leftShoulder,
  POSE.rightShoulder,
  POSE.leftElbow,
  POSE.rightElbow,
  POSE.leftWrist,
  POSE.rightWrist,
  POSE.leftHip,
  POSE.rightHip,
  POSE.leftKnee,
  POSE.rightKnee,
  POSE.leftAnkle,
  POSE.rightAnkle,
] as const;

export const MINIMAL_SKELETON_CONNECTIONS: [number, number][] = [
  [POSE.leftShoulder, POSE.rightShoulder],
  [POSE.leftShoulder, POSE.leftElbow],
  [POSE.leftElbow, POSE.leftWrist],
  [POSE.rightShoulder, POSE.rightElbow],
  [POSE.rightElbow, POSE.rightWrist],
  [POSE.leftShoulder, POSE.leftHip],
  [POSE.rightShoulder, POSE.rightHip],
  [POSE.leftHip, POSE.leftKnee],
  [POSE.leftKnee, POSE.leftAnkle],
  [POSE.rightHip, POSE.rightKnee],
  [POSE.rightKnee, POSE.rightAnkle],
];

export const HAND_CONNECTIONS: [number, number][] = [
  [POSE.leftWrist, POSE.leftPinky],
  [POSE.leftWrist, POSE.leftIndex],
  [POSE.leftWrist, POSE.leftThumb],
  [POSE.leftPinky, POSE.leftIndex],
  [POSE.rightWrist, POSE.rightPinky],
  [POSE.rightWrist, POSE.rightIndex],
  [POSE.rightWrist, POSE.rightThumb],
  [POSE.rightPinky, POSE.rightIndex],
];

export const POSE_CONNECTIONS: [number, number][] = [
  [POSE.leftShoulder, POSE.rightShoulder],
  [POSE.leftShoulder, POSE.leftElbow],
  [POSE.leftElbow, POSE.leftWrist],
  [POSE.rightShoulder, POSE.rightElbow],
  [POSE.rightElbow, POSE.rightWrist],
  [POSE.leftShoulder, POSE.leftHip],
  [POSE.rightShoulder, POSE.rightHip],
  [POSE.leftHip, POSE.rightHip],
  [POSE.leftHip, POSE.leftKnee],
  [POSE.leftKnee, POSE.leftAnkle],
  [POSE.rightHip, POSE.rightKnee],
  [POSE.rightKnee, POSE.rightAnkle],
];

/** Cabeça / pescoço */
export const FACE_CONNECTIONS: [number, number][] = [
  [POSE.leftEar, POSE.nose],
  [POSE.rightEar, POSE.nose],
  [POSE.leftEar, POSE.rightEar],
];

/** Cores do overlay: verde = postura conforme NR-17; vermelho = risco de lesão */
export const SK_COLORS = {
  safe: '#00E676',
  safeGlow: 'rgba(0,230,118,0.45)',
  critical: '#FF3D3D',
  riskGlow: 'rgba(255,61,61,0.55)',
  /** Legado — preferir safe/critical no overlay */
  limb: '#00E676',
  limbGlow: 'rgba(0,230,118,0.45)',
  spine: '#00E676',
  spineGlow: 'rgba(0,230,118,0.45)',
  neck: '#00E676',
  neckGlow: 'rgba(0,230,118,0.45)',
  jointMajor: '#00E676',
  jointLimb: '#00E676',
  jointHead: '#00E676',
} as const;

const MIN_VISIBILITY = 0.35;

export function isVisible(p: PosePoint | undefined): p is PosePoint {
  return !!p && p.visibility >= MIN_VISIBILITY;
}

export function midpoint(a: PosePoint, b: PosePoint): PosePoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    visibility: Math.min(a.visibility, b.visibility),
  };
}

/** Converte landmark normalizado → posição % no container (object-fit: cover + espelho) */
export function landmarkToScreenPercent(
  lm: PosePoint,
  videoW: number,
  videoH: number,
  containerW: number,
  containerH: number,
  mirrored: boolean,
): { x: number; y: number } {
  const x = lm.x;
  const y = lm.y;

  const scale = Math.max(containerW / videoW, containerH / videoH);
  const renderedW = videoW * scale;
  const renderedH = videoH * scale;
  const offsetX = (containerW - renderedW) / 2;
  const offsetY = (containerH - renderedH) / 2;

  let px = x * renderedW + offsetX;
  const py = y * renderedH + offsetY;

  if (mirrored) px = containerW - px;

  return {
    x: (px / containerW) * 100,
    y: (py / containerH) * 100,
  };
}

function angleFromVertical(from: PosePoint, to: PosePoint): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.round(Math.abs((Math.atan2(dx, -dy) * 180) / Math.PI));
}

function angleAtJoint(a: PosePoint, b: PosePoint, c: PosePoint): number {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const dot = bax * bcx + bay * bcy;
  const mag = Math.hypot(bax, bay) * Math.hypot(bcx, bcy);
  if (mag === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / mag));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

export function computeJointAngles(lm: PosePoint[]): JointAngles | null {
  const ls = lm[POSE.leftShoulder];
  const rs = lm[POSE.rightShoulder];
  const re = lm[POSE.rightElbow];
  const rw = lm[POSE.rightWrist];
  const le = lm[POSE.leftElbow];
  const lw = lm[POSE.leftWrist];
  const lh = lm[POSE.leftHip];
  const rh = lm[POSE.rightHip];
  const lk = lm[POSE.leftKnee];
  const rk = lm[POSE.rightKnee];
  const la = lm[POSE.leftAnkle];
  const ra = lm[POSE.rightAnkle];
  const lfi = lm[POSE.leftFootIndex];
  const rfi = lm[POSE.rightFootIndex];
  const nose = lm[POSE.nose];
  const leEar = lm[POSE.leftEar];
  const reEar = lm[POSE.rightEar];

  if (!isVisible(ls) || !isVisible(rs) || !isVisible(lh) || !isVisible(rh)) return null;

  const shoulderMid = midpoint(ls, rs);
  const hipMid = midpoint(lh, rh);

  const lombar = angleFromVertical(hipMid, shoulderMid);

  let ombroD = 0;
  if (isVisible(re)) {
    ombroD = angleAtJoint(hipMid, rs, re);
  }

  let ombroE = 0;
  if (isVisible(le)) {
    ombroE = angleAtJoint(hipMid, ls, le);
  }

  let cotovelo = 0;
  if (isVisible(re) && isVisible(rw)) {
    cotovelo = angleAtJoint(rs, re, rw);
  }

  let cotoveloE = 0;
  if (isVisible(le) && isVisible(lw)) {
    cotoveloE = angleAtJoint(ls, le, lw);
  }

  const headCenter = headCenterFromLandmarks(nose, leEar, reEar);
  let pescoco = 0;
  if (headCenter) {
    pescoco = angleFromVertical(shoulderMid, headCenter);
  }

  let dorso = 0;
  if (headCenter) {
    dorso = angleAtJoint(hipMid, shoulderMid, headCenter);
  }

  let maoD = 0;
  const ri = lm[POSE.rightIndex];
  if (isVisible(re) && isVisible(rw) && isVisible(ri)) {
    maoD = angleAtJoint(re, rw, ri);
  }

  let maoE = 0;
  const li = lm[POSE.leftIndex];
  if (isVisible(le) && isVisible(lw) && isVisible(li)) {
    maoE = angleAtJoint(le, lw, li);
  }

  let joelhoD = 0;
  if (isVisible(rh) && isVisible(rk) && isVisible(ra)) {
    joelhoD = angleAtJoint(rh, rk, ra);
  }

  let joelhoE = 0;
  if (isVisible(lh) && isVisible(lk) && isVisible(la)) {
    joelhoE = angleAtJoint(lh, lk, la);
  }

  let tornozeloD = 0;
  if (isVisible(rk) && isVisible(ra)) {
    const foot = isVisible(rfi) ? rfi : ra;
    tornozeloD = angleAtJoint(rk, ra, foot);
  }

  let tornozeloE = 0;
  if (isVisible(lk) && isVisible(la)) {
    const foot = isVisible(lfi) ? lfi : la;
    tornozeloE = angleAtJoint(lk, la, foot);
  }

  let quadrilD = 0;
  if (isVisible(ls) && isVisible(lh) && isVisible(lk)) {
    quadrilD = angleAtJoint(ls, lh, lk);
  }

  let quadrilE = 0;
  if (isVisible(rs) && isVisible(rh) && isVisible(rk)) {
    quadrilE = angleAtJoint(rs, rh, rk);
  }

  const quadril =
    quadrilD > 0 && quadrilE > 0 ? Math.round((quadrilD + quadrilE) / 2) : Math.max(quadrilD, quadrilE);

  return {
    lombar,
    dorso,
    ombroD,
    ombroE,
    pescoco,
    cotovelo,
    cotoveloE,
    maoD,
    maoE,
    quadril,
    joelhoD,
    joelhoE,
    tornozeloD,
    tornozeloE,
    repeticao: 0,
  };
}

/** Valores iniciais — sem pose detectada (não usar dados de demonstração na câmera) */
export const EMPTY_JOINT_ANGLES: JointAngles = {
  lombar: 0,
  dorso: 0,
  ombroD: 0,
  pescoco: 0,
  cotovelo: 0,
  maoD: 0,
  quadril: 0,
  joelhoD: 0,
  tornozeloD: 0,
  repeticao: 0,
};

/** Centro da cabeça para linha do pescoço */
export function headCenterFromLandmarks(
  nose: PosePoint | undefined,
  leftEar: PosePoint | undefined,
  rightEar: PosePoint | undefined,
): PosePoint | null {
  if (isVisible(nose) && isVisible(leftEar) && isVisible(rightEar)) {
    const earMid = midpoint(leftEar, rightEar);
    return {
      x: (nose.x + earMid.x) / 2,
      y: (nose.y + earMid.y) / 2,
      visibility: Math.min(nose.visibility, leftEar.visibility, rightEar.visibility),
    };
  }
  if (isVisible(nose)) return nose;
  if (isVisible(leftEar) && isVisible(rightEar)) return midpoint(leftEar, rightEar);
  return null;
}

/** Conta ciclos de movimento do ombro direito em janela de 60 s */
export class RepetitionCounter {
  private events: number[] = [];
  private lastSide: 'above' | 'below' | null = null;
  private readonly threshold = 95;

  tick(ombroD: number, now = Date.now()) {
    const side: 'above' | 'below' = ombroD >= this.threshold ? 'above' : 'below';
    if (this.lastSide && side !== this.lastSide && this.lastSide === 'below') {
      this.events.push(now);
    }
    this.lastSide = side;
    const cutoff = now - 60_000;
    this.events = this.events.filter((t) => t >= cutoff);
  }

  ratePerMinute(): number {
    return this.events.length;
  }

  reset() {
    this.events = [];
    this.lastSide = null;
  }
}
