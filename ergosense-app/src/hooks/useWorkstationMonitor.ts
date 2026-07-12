import { useEffect, useRef, useState, type RefObject } from 'react';
import type { JointAngles } from '../types';
import { DEFAULT_WORKSTATION, type WorkstationMetrics } from '../types/workstation';
import { buildWorkstationMetrics } from '../utils/workstationAnalysis';
import type { PosePoint } from '../types/pose';

export function useWorkstationMonitor(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  landmarks: PosePoint[] | null,
  angles: JointAngles | null,
) {
  const [metrics, setMetrics] = useState<WorkstationMetrics>(DEFAULT_WORKSTATION);
  const lastRun = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      const now = performance.now();
      if (now - lastRun.current < 800) return;
      lastRun.current = now;

      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || !landmarks?.length || !angles) return;

      setMetrics(buildWorkstationMetrics(video, landmarks, angles));
    };

    const id = setInterval(tick, 900);
    tick();
    return () => clearInterval(id);
  }, [enabled, videoRef, landmarks, angles]);

  return metrics;
}
