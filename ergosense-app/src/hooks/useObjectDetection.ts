import { useCallback, useRef, useState } from 'react';
import { detectObjectsInCanvas, type DetectedObject } from '../vision/objectDetection';

/** Módulo 3 — detecção de objetos em canvas de vídeo */
export function useObjectDetection() {
  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const [loading, setLoading] = useState(false);
  const frameRef = useRef(0);

  const detect = useCallback(async (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return [];
    setLoading(true);
    try {
      frameRef.current += 1;
      const found = await detectObjectsInCanvas(canvas, frameRef.current);
      setObjects(found);
      return found;
    } finally {
      setLoading(false);
    }
  }, []);

  return { objects, loading, detect };
}
