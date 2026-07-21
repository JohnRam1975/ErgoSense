/** Configuração central — modelos de visão computacional ErgoSense */

export const VISION_CONFIG = {
  pose: {
    /** MediaPipe Pose Landmarker — suporte multi-pessoa */
    modelUrl:
      'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
    liteModelUrl:
      'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    wasmCdn: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    maxPoses: 4,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  },
  yolo: {
    /** YOLOv8n ONNX — COCO 80 classes */
    modelUrl:
      'https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.onnx',
    inputSize: 640,
    confidenceThreshold: 0.35,
    iouThreshold: 0.45,
    wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/',
  },
  temporal: {
    landmarkSmoothAlpha: 0.38,
    trackerMaxDistance: 0.12,
    trackerMaxLostFrames: 8,
  },
} as const;

export const ERGOSENSE_VISION_STACK = 'ErgoSense Vision 4.0 — MediaPipe Multi-Pose + YOLOv8n ONNX';
