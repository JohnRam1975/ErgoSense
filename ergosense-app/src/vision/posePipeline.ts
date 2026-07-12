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

export async function getPoseLandmarker(useFullModel = true): Promise<PoseLandmarker> {
  if (sharedLandmarker) return sharedLandmarker;

  const vision = await FilesetResolver.forVisionTasks(VISION_CONFIG.pose.wasmCdn);
  const modelAssetPath = useFullModel ? VISION_CONFIG.pose.modelUrl : VISION_CONFIG.pose.liteModelUrl;

  try {
    sharedLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: VISION_CONFIG.pose.maxPoses,
      minPoseDetectionConfidence: VISION_CONFIG.pose.minDetectionConfidence,
      minPosePresenceConfidence: VISION_CONFIG.pose.minDetectionConfidence,
      minTrackingConfidence: VISION_CONFIG.pose.minTrackingConfidence,
    });
  } catch {
    sharedLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numPoses: VISION_CONFIG.pose.maxPoses,
      minPoseDetectionConfidence: VISION_CONFIG.pose.minDetectionConfidence,
      minPosePresenceConfidence: VISION_CONFIG.pose.minDetectionConfidence,
      minTrackingConfidence: VISION_CONFIG.pose.minTrackingConfidence,
    });
  }
  return sharedLandmarker;
}

export function disposePoseLandmarker() {
  sharedLandmarker?.close();
  sharedLandmarker = null;
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

  reset() {
    this.tracker.reset();
    this.smoother.reset();
    this.repCounter.reset();
    this.frameId = 0;
  }

  async processVideoFrame(
    video: HTMLVideoElement,
    timestampMs: number,
    detectObjects = true,
  ): Promise<ProcessedVisionFrame | null> {
    const landmarker = await getPoseLandmarker();
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
