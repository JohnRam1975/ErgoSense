/**
 * Módulo 1 — Visão computacional avançada
 * MediaPipe (ativo) + interfaces MoveNet/BlazePose/TensorFlow
 */
import type { JointAngles } from '../types';
import type { PosePoint } from '../types/pose';

export type PostureMode = 'sentado' | 'em_pe' | 'agachamento' | 'indefinido';

export interface EnhancedPoseMetrics {
  flexaoTronco: number;
  inclinacaoCervical: number;
  elevacaoBracoD: number;
  elevacaoBracoE: number;
  flexaoJoelhoD: number;
  torsaoTroncoEst: number;
}

export interface PostureClassification {
  mode: PostureMode;
  metrics: EnhancedPoseMetrics;
  confidence: number;
  engines: ('mediapipe' | 'movenet' | 'blazepose')[];
}

export const VISION_ENGINES = {
  mediapipe: { id: 'mediapipe', label: 'MediaPipe Pose Full (multi-pessoa)', active: true },
  yolo: { id: 'yolo', label: 'YOLOv8n ONNX — detecção de cargas', active: true },
  movenet: { id: 'movenet', label: 'MoveNet (TFLite mobile)', active: false },
  blazepose: { id: 'blazepose', label: 'BlazePose', active: false },
  tensorflow: { id: 'tensorflow', label: 'TensorFlow.js', active: false },
} as const;

export function classifyPostureFromAngles(angles: JointAngles): PostureClassification {
  const joelho = angles.joelhoD || 110;
  const quadril = angles.quadril || 95;
  let mode: PostureMode = 'em_pe';
  if (joelho < 100 && quadril < 95) mode = 'agachamento';
  else if (joelho >= 90 && joelho <= 130 && angles.lombar < 25) mode = 'sentado';
  else if (joelho > 150) mode = 'em_pe';

  const metrics: EnhancedPoseMetrics = {
    flexaoTronco: angles.lombar,
    inclinacaoCervical: angles.pescoco,
    elevacaoBracoD: angles.ombroD,
    elevacaoBracoE: angles.ombroE ?? angles.ombroD,
    flexaoJoelhoD: joelho,
    torsaoTroncoEst: Math.abs((angles.dorso ?? 0) - angles.lombar),
  };

  return {
    mode,
    metrics,
    confidence: 0.85,
    engines: ['mediapipe'],
  };
}

export function estimateTrunkTwistFromLandmarks(landmarks: PosePoint[]): number {
  if (landmarks.length < 25) return 0;
  const ls = landmarks[11];
  const rs = landmarks[12];
  const lh = landmarks[23];
  const rh = landmarks[24];
  if (!ls || !rs || !lh || !rh) return 0;
  const shoulderMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  const dx = shoulderMid.x - hipMid.x;
  return Math.min(90, Math.round(Math.abs(dx) * 120));
}
