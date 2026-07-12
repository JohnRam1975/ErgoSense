import type { PosePoint } from '../types/pose';

/** Índices MediaPipe Pose Landmarker (33 pontos) */
const JOINT_LANDMARKS: Record<string, number[]> = {
  pescoco: [0, 11, 12],
  ombroD: [12, 14],
  ombroE: [11, 13],
  cotoveloD: [14, 16],
  cotoveloE: [13, 15],
  quadril: [23, 24],
  joelhoD: [24, 26],
  joelhoE: [23, 25],
  tornozeloD: [26, 28],
  tornozeloE: [25, 27],
  lombar: [11, 23, 24],
  maoD: [16, 20],
  maoE: [15, 19],
};

export interface JointConfidenceMap {
  pescoco: number;
  ombroD: number;
  ombroE: number;
  cotoveloD: number;
  cotoveloE: number;
  quadril: number;
  joelhoD: number;
  joelhoE: number;
  tornozeloD: number;
  tornozeloE: number;
  lombar: number;
  maoD: number;
  maoE: number;
  overall: number;
  lowConfidenceJoints: string[];
  requiresRecapture: boolean;
}

const JOINT_LABELS: Record<string, string> = {
  pescoco: 'Pescoço',
  ombroD: 'Ombro direito',
  ombroE: 'Ombro esquerdo',
  cotoveloD: 'Cotovelo direito',
  cotoveloE: 'Cotovelo esquerdo',
  quadril: 'Quadril',
  joelhoD: 'Joelho direito',
  joelhoE: 'Joelho esquerdo',
  tornozeloD: 'Tornozelo direito',
  tornozeloE: 'Tornozelo esquerdo',
  lombar: 'Coluna lombar',
  maoD: 'Mão direita',
  maoE: 'Mão esquerda',
};

export const POSE_CONFIDENCE_THRESHOLD = 80;

export function jointConfidenceLabel(key: string): string {
  return JOINT_LABELS[key] ?? key;
}

export function computeJointConfidence(landmarks: PosePoint[] | null | undefined): JointConfidenceMap {
  const empty: JointConfidenceMap = {
    pescoco: 0,
    ombroD: 0,
    ombroE: 0,
    cotoveloD: 0,
    cotoveloE: 0,
    quadril: 0,
    joelhoD: 0,
    joelhoE: 0,
    tornozeloD: 0,
    tornozeloE: 0,
    lombar: 0,
    maoD: 0,
    maoE: 0,
    overall: 0,
    lowConfidenceJoints: [],
    requiresRecapture: true,
  };

  if (!landmarks?.length) return empty;

  const jointScores: Record<string, number> = {};
  for (const [joint, indices] of Object.entries(JOINT_LANDMARKS)) {
    const vis = indices
      .filter((i) => i < landmarks.length)
      .map((i) => landmarks[i].visibility ?? 0);
    jointScores[joint] =
      vis.length > 0 ? Math.round((vis.reduce((a, b) => a + b, 0) / vis.length) * 100) : 0;
  }

  const values = Object.values(jointScores);
  const overall = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const lowConfidenceJoints = Object.entries(jointScores)
    .filter(([, v]) => v < POSE_CONFIDENCE_THRESHOLD)
    .map(([k]) => jointConfidenceLabel(k));

  return {
    ...(jointScores as Omit<JointConfidenceMap, 'overall' | 'lowConfidenceJoints' | 'requiresRecapture'>),
    overall,
    lowConfidenceJoints,
    requiresRecapture: overall < POSE_CONFIDENCE_THRESHOLD || lowConfidenceJoints.length >= 3,
  };
}
