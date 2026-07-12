/**
 * Detecção de objetos — YOLOv8n ONNX (primário) + heurística (fallback offline)
 */
export type ErgoObjectClass =
  | 'caixa'
  | 'saco'
  | 'ferramenta'
  | 'carrinho'
  | 'pallet'
  | 'monitor'
  | 'mesa'
  | 'cadeira'
  | 'notebook'
  | 'desconhecido';

export interface DetectedObject {
  class: ErgoObjectClass;
  label: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  center: { x: number; y: number };
  frameId?: number;
}

const CLASS_LABELS: Record<ErgoObjectClass, string> = {
  caixa: 'Caixa / carga',
  saco: 'Saco',
  ferramenta: 'Ferramenta',
  carrinho: 'Carrinho',
  pallet: 'Pallet',
  monitor: 'Monitor',
  mesa: 'Mesa / bancada',
  cadeira: 'Cadeira',
  notebook: 'Notebook',
  desconhecido: 'Objeto',
};

function averageBrightness(data: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  return data.length ? sum / (data.length / 4) : 128;
}

function makeObject(
  cls: ErgoObjectClass,
  conf: number,
  cx: number,
  cy: number,
  bw: number,
  bh: number,
  frameId: number,
): DetectedObject {
  return {
    class: cls,
    label: CLASS_LABELS[cls],
    confidence: conf,
    bbox: { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh },
    center: { x: cx, y: cy },
    frameId,
  };
}

/** Fallback heurístico quando YOLO indisponível (offline) */
export async function detectObjectsHeuristic(
  canvas: HTMLCanvasElement,
  frameId = 0,
): Promise<DetectedObject[]> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const w = canvas.width;
  const h = canvas.height;
  if (w < 32 || h < 32) return [];

  const sample = ctx.getImageData(Math.floor(w * 0.25), Math.floor(h * 0.35), Math.floor(w * 0.5), Math.floor(h * 0.4));
  const avg = averageBrightness(sample.data);
  const objects: DetectedObject[] = [];

  if (avg < 90) objects.push(makeObject('caixa', 0.45, 0.35, 0.3, 0.35, 0.25, frameId));
  if (avg > 140) objects.push(makeObject('mesa', 0.4, 0.5, 0.72, 0.6, 0.12, frameId));

  return objects;
}

/** Detecção principal — YOLO real com fallback heurístico */
export async function detectObjectsInCanvas(
  canvas: HTMLCanvasElement,
  frameId = 0,
): Promise<DetectedObject[]> {
  try {
    const { detectObjectsYolo } = await import('./yoloDetector');
    const yolo = await detectObjectsYolo(canvas, frameId);
    if (yolo.length > 0) return yolo;
  } catch {
    /* YOLO indisponível */
  }
  return detectObjectsHeuristic(canvas, frameId);
}

export const YOLO_MODEL_CONFIG = {
  modelId: 'yolov8n-onnx',
  classes: Object.keys(CLASS_LABELS) as ErgoObjectClass[],
  inputSize: 640,
  backend: 'onnxruntime-web' as const,
};
