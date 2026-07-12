import { useEffect, useRef, useState, type RefObject } from 'react';
import type { JointAngles } from '../types';
import type { PoseFrame, PosePoint } from '../types/pose';
import { RepetitionCounter, computeJointAngles, landmarkToScreenPercent } from '../utils/poseGeometry';
import { getPoseLandmarker } from '../vision/posePipeline';
import { MultiPersonPoseTracker } from '../vision/poseTracker';
import { LandmarkSmoother } from '../vision/temporalSmoother';
import { VISION_CONFIG } from '../vision/config';

export type PoseStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UsePoseDetectionOptions {
  enabled: boolean;
  mirrored?: boolean;
  onAngles?: (angles: JointAngles) => void;
  onPersonCount?: (count: number) => void;
}

export function usePoseDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  containerRef: RefObject<HTMLElement | null>,
  { enabled, mirrored = true, onAngles, onPersonCount }: UsePoseDetectionOptions,
) {
  const [status, setStatus] = useState<PoseStatus>('idle');
  const [poseFrame, setPoseFrame] = useState<PoseFrame | null>(null);
  const [tracking, setTracking] = useState(false);
  const [personCount, setPersonCount] = useState(0);
  const [error, setError] = useState('');
  const landmarkerRef = useRef<Awaited<ReturnType<typeof getPoseLandmarker>> | null>(null);
  const trackerRef = useRef(new MultiPersonPoseTracker());
  const smootherRef = useRef(new LandmarkSmoother());
  const rafRef = useRef<number>(0);
  const repCounterRef = useRef(new RepetitionCounter());
  const onAnglesRef = useRef(onAngles);
  const onPersonCountRef = useRef(onPersonCount);
  onAnglesRef.current = onAngles;
  onPersonCountRef.current = onPersonCount;

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      setPoseFrame(null);
      setTracking(false);
      setPersonCount(0);
      return;
    }

    let active = true;
    const tracker = trackerRef.current;
    const smoother = smootherRef.current;
    const repCounter = repCounterRef.current;
    setStatus('loading');
    setError('');

    getPoseLandmarker(true)
      .then((landmarker) => {
        if (!active) return;
        landmarkerRef.current = landmarker;
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Falha ao carregar IA de pose');
        setStatus('error');
      });

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      const landmarker = landmarkerRef.current;
      landmarkerRef.current = null;
      landmarker?.close?.();
      tracker.reset();
      smoother.reset();
      repCounter.reset();
    };
  }, [enabled]);

  useEffect(() => {
    if (status !== 'ready' || !enabled) return;

    const detect = () => {
      const video = videoRef.current;
      const container = containerRef.current;
      const landmarker = landmarkerRef.current;

      if (!video || !container || !landmarker || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const result = landmarker.detectForVideo(video, performance.now());
        const allRaw: PosePoint[][] = (result.landmarks ?? []).map((raw) =>
          raw.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 0 })),
        );

        if (allRaw.length) {
          const tracks = trackerRef.current.update(allRaw);
          const primary = tracks[0];
          const landmarks = smootherRef.current.smooth(primary.landmarks);

          const cw = container.clientWidth;
          const ch = container.clientHeight;
          const screen = landmarks.map((p) => {
            const pct = landmarkToScreenPercent(p, video.videoWidth, video.videoHeight, cw, ch, mirrored);
            return { x: pct.x, y: pct.y, visibility: p.visibility };
          });

          setPoseFrame({ landmarks, screen });
          setPersonCount(tracks.length);
          onPersonCountRef.current?.(tracks.length);

          const angles = computeJointAngles(landmarks);
          if (angles) {
            setTracking(true);
            repCounterRef.current.tick(angles.ombroD);
            const full: JointAngles = {
              ...angles,
              repeticao: repCounterRef.current.ratePerMinute(),
            };
            onAnglesRef.current?.(full);
          } else {
            setTracking(false);
          }
        } else {
          setPoseFrame(null);
          setTracking(false);
          setPersonCount(0);
        }
      } catch {
        /* frame skip */
      }

      rafRef.current = requestAnimationFrame(detect);
    };

    rafRef.current = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, enabled, videoRef, containerRef, mirrored]);

  return { status, poseFrame, error, tracking, personCount, maxPoses: VISION_CONFIG.pose.maxPoses };
}
