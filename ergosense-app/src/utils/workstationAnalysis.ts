import type { JointAngles } from '../types';
import type { WorkstationMetrics } from '../types/workstation';
import type { PosePoint } from '../types/pose';
import { POSE, isVisible } from './poseGeometry';

const REF_SHOULDER_FRAC = 0.34;
const REF_DISTANCE_CM = 58;

/** Estima distância olhos–tela pela largura dos ombros no frame */
export function estimateScreenDistanceCm(landmarks: PosePoint[]): number {
  const ls = landmarks[POSE.leftShoulder];
  const rs = landmarks[POSE.rightShoulder];
  if (!isVisible(ls) || !isVisible(rs)) return 60;
  const shoulderFrac = Math.hypot(rs.x - ls.x, rs.y - ls.y);
  const cm = REF_DISTANCE_CM * (REF_SHOULDER_FRAC / Math.max(shoulderFrac, 0.1));
  return Math.round(Math.min(120, Math.max(30, cm)));
}

/** Altura da tela: usa inclinação do pescoço e posição da cabeça (NR-17) */
export function assessScreenHeight(angles: Pick<JointAngles, 'pescoco'>, landmarks: PosePoint[]): WorkstationMetrics['telaAltura'] {
  const nose = landmarks[POSE.nose];
  const ls = landmarks[POSE.leftShoulder];
  const rs = landmarks[POSE.rightShoulder];
  if (!isVisible(nose) || !isVisible(ls) || !isVisible(rs)) {
    if (angles.pescoco >= 28) return 'baixa';
    if (angles.pescoco <= 8) return 'alta';
    return 'ideal';
  }
  const shoulderY = (ls.y + rs.y) / 2;
  const headDrop = nose.y - shoulderY;
  if (angles.pescoco >= 25 || headDrop > 0.12) return 'baixa';
  if (angles.pescoco <= 10 && headDrop < 0.02) return 'alta';
  return 'ideal';
}

/** Analisa brilho do ambiente a partir do frame da câmera */
export function analyzeAmbientLight(video: HTMLVideoElement): { lux: number; nivel: WorkstationMetrics['nivelLuz'] } {
  const canvas = document.createElement('canvas');
  const w = 160;
  const h = 90;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || video.videoWidth === 0) return { lux: 300, nivel: 'adequado' };

  ctx.drawImage(video, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  const avg = sum / (w * h);
  const lux = Math.round(avg * 4.2);
  let nivel: WorkstationMetrics['nivelLuz'] = 'adequado';
  if (lux < 280) nivel = 'baixo';
  else if (lux > 750) nivel = 'alto';
  return { lux, nivel };
}

/** Mede dominância de azul na metade superior (região típica do monitor) */
export function analyzeScreenBlueFilter(video: HTMLVideoElement): { indiceAzul: number; filtro: WorkstationMetrics['filtroTela'] } {
  const canvas = document.createElement('canvas');
  const w = 120;
  const h = 80;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || video.videoWidth === 0) return { indiceAzul: 40, filtro: 'parcial' };

  const sx = 0;
  const sy = 0;
  const sw = video.videoWidth;
  const sh = Math.floor(video.videoHeight * 0.55);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  let blue = 0;
  let warm = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const bright = r + g + b;
    if (bright < 60) continue;
    n++;
    blue += b / Math.max(1, bright);
    warm += r / Math.max(1, bright);
  }
  if (n === 0) return { indiceAzul: 30, filtro: 'parcial' };

  const blueRatio = blue / n;
  const warmRatio = warm / n;
  const indiceAzul = Math.round(Math.min(100, Math.max(0, (blueRatio - warmRatio + 0.15) * 120)));

  let filtro: WorkstationMetrics['filtroTela'] = 'parcial';
  if (indiceAzul >= 52) filtro = 'sem_filtro';
  else if (indiceAzul <= 28) filtro = 'adequado';

  return { indiceAzul, filtro };
}

export function buildWorkstationMetrics(
  video: HTMLVideoElement,
  landmarks: PosePoint[],
  angles: JointAngles,
): WorkstationMetrics {
  const { lux, nivel } = analyzeAmbientLight(video);
  const { indiceAzul, filtro } = analyzeScreenBlueFilter(video);
  return {
    telaDistanciaCm: estimateScreenDistanceCm(landmarks),
    telaAltura: assessScreenHeight(angles, landmarks),
    lux,
    nivelLuz: nivel,
    indiceAzul,
    filtroTela: filtro,
  };
}
