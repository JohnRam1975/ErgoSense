import { useEffect, useState } from 'react';
import { detectArSupport, measureWithArFallback, type ArSupport } from '../vision/arDistance';
import type { DistanceMeasurement, DistanceTarget } from '../vision/distanceTypes';

/** Módulo 2B — AR distance com fallback monocular */
export function useArDistance(target: DistanceTarget, monocularCm: number) {
  const [arSupport, setArSupport] = useState<ArSupport>('none');
  const [measurement, setMeasurement] = useState<DistanceMeasurement | null>(null);

  useEffect(() => {
    void detectArSupport().then(setArSupport);
  }, []);

  useEffect(() => {
    if (monocularCm > 0) {
      setMeasurement(measureWithArFallback(target, monocularCm));
    }
  }, [target, monocularCm]);

  return { arSupport, measurement };
}
