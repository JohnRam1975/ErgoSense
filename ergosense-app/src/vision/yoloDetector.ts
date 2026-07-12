/**
 * YOLOv8n — detecção real via ONNX Runtime Web
 * COCO 80 classes → classes ErgoSense (carga, mobiliário, EPI)
 */
import * as ort from 'onnxruntime-web';
import { VISION_CONFIG } from './config';
import type { DetectedObject, ErgoObjectClass } from './objectDetection';

const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog',
  'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella',
  'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite',
  'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle',
  'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich',
  'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
  'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
  'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

const COCO_TO_ERGO: Record<string, ErgoObjectClass> = {
  backpack: 'saco',
  handbag: 'saco',
  suitcase: 'caixa',
  bottle: 'caixa',
  bowl: 'caixa',
  'sports ball': 'caixa',
  chair: 'cadeira',
  couch: 'cadeira',
  'dining table': 'mesa',
  bed: 'mesa',
  tv: 'monitor',
  laptop: 'notebook',
  keyboard: 'ferramenta',
  scissors: 'ferramenta',
  'baseball bat': 'ferramenta',
  'tennis racket': 'ferramenta',
  truck: 'carrinho',
  car: 'carrinho',
};

let session: ort.InferenceSession | null = null;
let loading: Promise<ort.InferenceSession> | null = null;

async function getYoloSession(): Promise<ort.InferenceSession> {
  if (session) return session;
  if (loading) return loading;

  loading = (async () => {
    ort.env.wasm.wasmPaths = VISION_CONFIG.yolo.wasmPaths;
    session = await ort.InferenceSession.create(VISION_CONFIG.yolo.modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    return session;
  })();

  return loading;
}

function letterbox(
  canvas: HTMLCanvasElement,
  size: number,
): { tensor: ort.Tensor; scale: number; padX: number; padY: number } {
  const w = canvas.width;
  const h = canvas.height;
  const scale = Math.min(size / w, size / h);
  const nw = Math.round(w * scale);
  const nh = Math.round(h * scale);
  const padX = (size - nw) / 2;
  const padY = (size - nh) / 2;

  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const octx = off.getContext('2d')!;
  octx.fillStyle = '#114';
  octx.fillRect(0, 0, size, size);
  octx.drawImage(canvas, padX, padY, nw, nh);

  const { data } = octx.getImageData(0, 0, size, size);
  const float32 = new Float32Array(3 * size * size);
  for (let i = 0; i < size * size; i++) {
    float32[i] = data[i * 4] / 255;
    float32[i + size * size] = data[i * 4 + 1] / 255;
    float32[i + 2 * size * size] = data[i * 4 + 2] / 255;
  }

  return {
    tensor: new ort.Tensor('float32', float32, [1, 3, size, size]),
    scale,
    padX,
    padY,
  };
}

function iou(a: DetectedObject, b: DetectedObject): number {
  const ax2 = a.bbox.x + a.bbox.w;
  const ay2 = a.bbox.y + a.bbox.h;
  const bx2 = b.bbox.x + b.bbox.w;
  const by2 = b.bbox.y + b.bbox.h;
  const ix1 = Math.max(a.bbox.x, b.bbox.x);
  const iy1 = Math.max(a.bbox.y, b.bbox.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const union = a.bbox.w * a.bbox.h + b.bbox.w * b.bbox.h - inter;
  return union > 0 ? inter / union : 0;
}

function nms(boxes: DetectedObject[], threshold: number): DetectedObject[] {
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const kept: DetectedObject[] = [];
  for (const box of sorted) {
    if (kept.every((k) => iou(k, box) < threshold)) kept.push(box);
  }
  return kept;
}

function mapToErgoClass(cocoName: string): ErgoObjectClass | null {
  if (cocoName === 'person') return null;
  return COCO_TO_ERGO[cocoName] ?? 'desconhecido';
}

function parseYoloOutput(
  output: ort.Tensor,
  canvasW: number,
  canvasH: number,
  scale: number,
  padX: number,
  padY: number,
  frameId: number,
): DetectedObject[] {
  const data = output.data as Float32Array;
  const dims = output.dims;
  const numClasses = 80;
  const numBoxes = dims.length === 3 ? dims[2] : 8400;
  const channels = dims.length === 3 ? dims[1] : 84;
  void numClasses;

  const objects: DetectedObject[] = [];
  const threshold = VISION_CONFIG.yolo.confidenceThreshold;

  for (let i = 0; i < numBoxes; i++) {
    let cx: number;
    let cy: number;
    let w: number;
    let h: number;
    let bestClass = 0;
    let bestScore = 0;

    if (channels === 84) {
      cx = data[i];
      cy = data[numBoxes + i];
      w = data[2 * numBoxes + i];
      h = data[3 * numBoxes + i];
      for (let c = 0; c < numClasses; c++) {
        const score = data[(4 + c) * numBoxes + i];
        if (score > bestScore) {
          bestScore = score;
          bestClass = c;
        }
      }
    } else {
      continue;
    }

    if (bestScore < threshold) continue;

    const x1 = (cx - w / 2 - padX) / scale;
    const y1 = (cy - h / 2 - padY) / scale;
    const bw = w / scale;
    const bh = h / scale;

    const nx = Math.max(0, Math.min(1, x1 / canvasW));
    const ny = Math.max(0, Math.min(1, y1 / canvasH));
    const nw = Math.max(0, Math.min(1 - nx, bw / canvasW));
    const nh = Math.max(0, Math.min(1 - ny, bh / canvasH));

    const cocoName = COCO_CLASSES[bestClass] ?? 'object';
    const ergoClass = mapToErgoClass(cocoName);
    if (!ergoClass) continue;

    objects.push({
      class: ergoClass,
      label: `${ergoClass} (${cocoName})`,
      confidence: Math.round(bestScore * 1000) / 1000,
      bbox: { x: nx, y: ny, w: nw, h: nh },
      center: { x: nx + nw / 2, y: ny + nh / 2 },
      frameId,
    });
  }

  return nms(objects, VISION_CONFIG.yolo.iouThreshold);
}

export type YoloStatus = 'idle' | 'loading' | 'ready' | 'error';

let status: YoloStatus = 'idle';
let lastError = '';

export function getYoloStatus(): { status: YoloStatus; error: string } {
  return { status, error: lastError };
}

/** Detecção YOLO real — fallback silencioso se modelo indisponível */
export async function detectObjectsYolo(
  canvas: HTMLCanvasElement,
  frameId = 0,
): Promise<DetectedObject[]> {
  if (canvas.width < 32 || canvas.height < 32) return [];

  try {
    status = 'loading';
    const sess = await getYoloSession();
    status = 'ready';

    const { tensor, scale, padX, padY } = letterbox(canvas, VISION_CONFIG.yolo.inputSize);
    const inputName = sess.inputNames[0];
    const results = await sess.run({ [inputName]: tensor });
    const output = results[sess.outputNames[0]];
    return parseYoloOutput(output, canvas.width, canvas.height, scale, padX, padY, frameId);
  } catch (err) {
    status = 'error';
    lastError = err instanceof Error ? err.message : 'YOLO indisponível';
    return [];
  }
}

export function disposeYoloSession() {
  session = null;
  loading = null;
  status = 'idle';
}

/** Classes consideradas carga manual */
export const LOAD_OBJECT_CLASSES: ErgoObjectClass[] = ['caixa', 'saco', 'ferramenta', 'pallet'];

export function isLoadObject(obj: DetectedObject): boolean {
  return LOAD_OBJECT_CLASSES.includes(obj.class);
}

export function nearestLoadToPoint(
  objects: DetectedObject[],
  point: { x: number; y: number },
): DetectedObject | null {
  const loads = objects.filter(isLoadObject);
  if (!loads.length) return null;
  return loads.reduce((best, o) => {
    const d = Math.hypot(o.center.x - point.x, o.center.y - point.y);
    const bd = Math.hypot(best.center.x - point.x, best.center.y - point.y);
    return d < bd ? o : best;
  });
}
