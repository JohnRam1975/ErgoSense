/**
 * Módulo 2B — ARCore / ARKit / WebXR depth (±2 cm quando disponível)
 */
import { createDistanceMeasurement, type DistanceMeasurement, type DistanceTarget } from './distanceTypes';

export type ArSupport = 'webxr' | 'arcore' | 'arkit' | 'none';

export async function detectArSupport(): Promise<ArSupport> {
  if (typeof navigator !== 'undefined' && 'xr' in navigator) {
    try {
      const xr = navigator.xr as { isSessionSupported?: (m: string) => Promise<boolean> };
      if (xr?.isSessionSupported && (await xr.isSessionSupported('immersive-ar'))) {
        return 'webxr';
      }
    } catch {
      /* ignore */
    }
  }
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Android/i.test(ua)) return 'arcore';
  if (/iPhone|iPad/i.test(ua)) return 'arkit';
  return 'none';
}

export function measureWithArFallback(
  target: DistanceTarget,
  monocularCm: number,
  arCm?: number,
): DistanceMeasurement {
  if (arCm && arCm > 0) {
    return createDistanceMeasurement(target, arCm, 'ar', 0.92);
  }
  return createDistanceMeasurement(target, monocularCm, monocularCm > 0 ? 'hybrid' : 'estimate', 0.65);
}
