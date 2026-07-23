/**
 * Pipeline unificado de visão — pose multi-pessoa + YOLO + rastreamento temporal
 */
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PosePoint } from '../types/pose';
import type { JointAngles } from '../types';
import { computeJointAngles, RepetitionCounter } from '../utils/poseGeometry';
import { VISION_CONFIG, ERGOSENSE_VISION_STACK } from './config';
import { detectObjectsInCanvas, type DetectedObject } from './objectDetection';
import { MultiPersonPoseTracker } from './poseTracker';
import { LandmarkSmoother } from './temporalSmoother';

export { ERGOSENSE_VISION_STACK };

let sharedLandmarker: PoseLandmarker | null = null;
let sharedLandmarkerPromise: Promise<PoseLandmarker> | null = null;
/** Quantos consumidores ativos (câmera / vídeo) — só fecha quando zera */
let landmarkerRefCount = 0;

async function createPoseLandmarker(useFullModel: boolean): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(VISION_CONFIG.pose.wasmCdn);
  const modelAssetPath = useFullModel ? VISION_CONFIG.pose.modelUrl : VISION_CONFIG.pose.liteModelUrl;
  const common = {
    runningMode: 'VIDEO' as const,
    numPoses: VISION_CONFIG.pose.maxPoses,
    minPoseDetectionConfidence: VISION_CONFIG.pose.minDetectionConfidence,
    minPosePresenceConfidence: VISION_CONFIG.pose.minDetectionConfidence,
    minTrackingConfidence: VISION_CONFIG.pose.minTrackingConfidence,
  };

  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath, delegate: 'GPU' },
      ...common,
    });
  } catch {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath, delegate: 'CPU' },
      ...common,
    });
  }
}

/**
 * Adquire landmarker compartilhado (refcount).
 * Sempre parear com {@link releasePoseLandmarker} no cleanup.
 */
export async function getPoseLandmarker(useFullModel = true): Promise<PoseLandmarker> {
  landmarkerRefCount += 1;

  if (sharedLandmarker) return sharedLandmarker;

  if (!sharedLandmarkerPromise) {
    sharedLandmarkerPromise = createPoseLandmarker(useFullModel)
      .then((lm) => {
        sharedLandmarker = lm;
        return lm;
      })
      .catch((err) => {
        sharedLandmarkerPromise = null;
        throw err;
      })
      .finally(() => {
        /* promise slot limpo após settle; instância fica em sharedLandmarker */
        sharedLandmarkerPromise = null;
      });
  }

  try {
    return await sharedLandmarkerPromise;
  } catch (err) {
    landmarkerRefCount = Math.max(0, landmarkerRefCount - 1);
    throw err;
  }
}

/** Libera um consumidor; fecha o modelo só quando ninguém mais usa. */
export function releasePoseLandmarker() {
  landmarkerRefCount = Math.max(0, landmarkerRefCount - 1);
  if (landmarkerRefCount === 0) {
    disposePoseLandmarker();
  }
}

/** Força dispose (ex.: fim do processador de vídeo offline). */
export function disposePoseLandmarker() {
  try {
    sharedLandmarker?.close();
  } catch {
    /* already closed */
  }
  sharedLandmarker = null;
  sharedLandmarkerPromise = null;
  landmarkerRefCount = 0;
}

/** Testes / diagnóstico */
export function getPoseLandmarkerRefCount() {
  return landmarkerRefCount;
}

export interface ProcessedVisionFrame {
  timestampMs: number;
  angles: JointAngles;
  landmarks: PosePoint[];
  personId: number;
  personCount: number;
  objects: DetectedObject[];
  allPersons: { id: number; landmarks: PosePoint[]; angles: JointAngles | null }[];
}

export class VisionPipeline {
  private tracker = new MultiPersonPoseTracker();
  private smoother = new LandmarkSmoother();
  private repCounter = new RepetitionCounter();
  private frameId = 0;
  private acquired = false;

  reset() {
    this.tracker.reset();
    this.smoother.reset();
    this.repCounter.reset();
    this.frameId = 0;
  }

  async acquire() {
    if (this.acquired) return;
    await getPoseLandmarker();
    this.acquired = true;
  }

  release() {
    if (!this.acquired) return;
    this.acquired = false;
    releasePoseLandmarker();
  }

  async processVideoFrame(
    video: HTMLVideoElement,
    timestampMs: number,
    detectObjects = true,
  ): Promise<ProcessedVisionFrame | null> {
    await this.acquire();
    const landmarker = sharedLandmarker;
    if (!landmarker) return null;

    const result = landmarker.detectForVideo(video, timestampMs);

    const allRaw: PosePoint[][] = (result.landmarks ?? []).map((raw) =>
      raw.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 0 })),
    );

    if (!allRaw.length) return null;

    const tracks = this.tracker.update(allRaw);
    const primary = tracks[0];
    if (!primary) return null;

    const smoothed = this.smoother.smooth(primary.landmarks, timestampMs);
    const angles = computeJointAngles(smoothed);
    if (!angles) return null;

    this.repCounter.tick(angles.ombroD);
    const fullAngles: JointAngles = { ...angles, repeticao: this.repCounter.ratePerMinute() };

    let objects: DetectedObject[] = [];
    if (detectObjects && video.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      objects = await detectObjectsInCanvas(canvas, this.frameId++);
    }

    const allPersons = tracks.map((t) => {
      const sm = t.id === primary.id ? smoothed : t.landmarks;
      return { id: t.id, landmarks: sm, angles: computeJointAngles(sm) };
    });

    return {
      timestampMs,
      angles: fullAngles,
      landmarks: smoothed,
      personId: primary.id,
      personCount: tracks.length,
      objects,
      allPersons,
    };
  }
}
