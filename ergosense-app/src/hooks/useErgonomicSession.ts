import { useCallback, useEffect, useRef } from 'react';
import type { JointAngles } from '../types';
import type { WorkstationMetrics } from '../types/workstation';
import { aggregateSessionAngles, aggregateSessionWorkstation } from '../utils/nr17';

/** Acumula amostras de ângulos e posto durante a sessão de leitura */
export function useErgonomicSession(
  enabled: boolean,
  angles: JointAngles,
  workstation: WorkstationMetrics,
  anglesLive: boolean,
) {
  const angleSamplesRef = useRef<JointAngles[]>([]);
  const wsSamplesRef = useRef<WorkstationMetrics[]>([]);

  useEffect(() => {
    if (!enabled) {
      angleSamplesRef.current = [];
      wsSamplesRef.current = [];
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !anglesLive) return;
    const id = setInterval(() => {
      angleSamplesRef.current.push({ ...angles });
      wsSamplesRef.current.push({ ...workstation });
    }, 1000);
    return () => clearInterval(id);
  }, [enabled, anglesLive, angles, workstation]);

  const reset = useCallback(() => {
    angleSamplesRef.current = [];
    wsSamplesRef.current = [];
  }, []);

  const aggregate = useCallback(() => {
    const samples = angleSamplesRef.current;
    return {
      angles: aggregateSessionAngles(samples),
      workstation: aggregateSessionWorkstation(wsSamplesRef.current),
      sampleCount: samples.length,
    };
  }, []);

  return {
    reset,
    aggregate,
    sampleCount: angleSamplesRef.current.length,
  };
}
