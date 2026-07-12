import { useEffect, useRef } from 'react';
import type { LoadDistanceEstimate } from '../types/loadAssessment';
import type { PosePoint } from '../types/pose';
import type { ScreenPoint } from '../utils/measureLoadDistance';
import { trackLoadDistance, type LoadDistanceTrackResult } from '../utils/trackLoadDistance';

export interface LoadDistanceTrackerInput {
  enabled: boolean;
  landmarks: PosePoint[] | null;
  containerWidth: number;
  containerHeight: number;
  videoWidth: number;
  videoHeight: number;
  loadObjectTap: ScreenPoint | null;
  calibration: { realCm: number; pxSize: number } | null;
  estimate: LoadDistanceEstimate | null;
  mirrored?: boolean;
}

export function useLoadDistanceTracker(
  input: LoadDistanceTrackerInput,
  onTrack: (result: LoadDistanceTrackResult | null) => void,
) {
  const onTrackRef = useRef(onTrack);
  onTrackRef.current = onTrack;

  const inputRef = useRef(input);
  inputRef.current = input;

  useEffect(() => {
    if (!input.enabled || input.containerWidth <= 0 || input.containerHeight <= 0) {
      onTrackRef.current(null);
      return;
    }

    let active = true;

    const tick = () => {
      if (!active) return;
      const cur = inputRef.current;
      const result = trackLoadDistance(cur.landmarks, {
        containerWidth: cur.containerWidth,
        containerHeight: cur.containerHeight,
        videoWidth: cur.videoWidth,
        videoHeight: cur.videoHeight,
        loadObjectTap: cur.loadObjectTap,
        calibration: cur.calibration,
        mirrored: cur.mirrored ?? true,
        estimate: cur.estimate,
      });
      onTrackRef.current(result);
    };

    tick();
    const id = window.setInterval(tick, 320);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [
    input.enabled,
    input.containerWidth,
    input.containerHeight,
    input.videoWidth,
    input.videoHeight,
    input.loadObjectTap,
    input.calibration,
    input.mirrored,
  ]);
}
