import { useEffect, useRef, useState } from 'react';
import type { LoadDistanceEstimate } from '../types/loadAssessment';
import type { PosePoint } from '../types/pose';
import { estimateLoadDistanceFromPose } from '../utils/loadDistanceEstimation';

export function useLoadAssessment(
  enabled: boolean,
  landmarks: PosePoint[] | null,
  videoWidth: number,
  videoHeight: number,
) {
  const [estimate, setEstimate] = useState<LoadDistanceEstimate | null>(null);
  const lastRun = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setEstimate(null);
      return;
    }

    const tick = () => {
      const now = performance.now();
      if (now - lastRun.current < 280) return;
      lastRun.current = now;

      if (!landmarks?.length) return;
      const vw = videoWidth > 0 ? videoWidth : 640;
      const vh = videoHeight > 0 ? videoHeight : 480;
      const next = estimateLoadDistanceFromPose({ landmarks, videoWidth: vw, videoHeight: vh });
      if (next) setEstimate(next);
    };

    const id = setInterval(tick, 300);
    tick();
    return () => clearInterval(id);
  }, [enabled, landmarks, videoWidth, videoHeight]);

  return estimate;
}
