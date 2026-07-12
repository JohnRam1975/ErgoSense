import { useEffect, useRef, useState } from 'react';
import type { PostureRiskFlags } from '../utils/ergonomics';
import { PostureDurationTracker, type PostureDurationInfo } from '../utils/postureDuration';

const EMPTY: PostureDurationInfo = {
  inRisk: false,
  streakSecs: 0,
  totalRiskSecs: 0,
  level: 'ok',
  primaryRegions: [],
  message: 'Postura monitorada',
};

export function usePostureDuration(risks: PostureRiskFlags, enabled: boolean, paused = false) {
  const trackerRef = useRef(new PostureDurationTracker());
  const risksRef = useRef(risks);
  risksRef.current = risks;
  const [info, setInfo] = useState<PostureDurationInfo>(EMPTY);
  const prevLevelRef = useRef<PostureDurationInfo['level']>('ok');

  useEffect(() => {
    if (!enabled) {
      trackerRef.current.reset();
      setInfo(EMPTY);
      prevLevelRef.current = 'ok';
      return;
    }

    if (paused) return;

    const id = setInterval(() => {
      const next = trackerRef.current.tick(risksRef.current);
      setInfo(next);
      prevLevelRef.current = next.level;
    }, 1000);

    return () => clearInterval(id);
  }, [enabled, paused]);

  return {
    duration: info,
    maxStreakSecs: trackerRef.current.getMaxStreakSecs(),
    totalRiskSecs: trackerRef.current.getTotalRiskSecs(),
  };
}
