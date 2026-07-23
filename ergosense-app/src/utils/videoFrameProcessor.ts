/**
 * Processamento frame-a-frame — MediaPipe multi-pose + YOLO + rastreamento temporal
 */
import type { VideoAnalysisProgress } from '../types/videoErgo';
import type { VideoFrameSample } from '../services/videoAnalysis';
import { VisionPipeline, ERGOSENSE_VISION_STACK } from '../vision/posePipeline';
import { disposeYoloSession } from '../vision/yoloDetector';

export { ERGOSENSE_VISION_STACK };

export interface VideoProcessOptions {
  samplesPerSec?: number;
  maxDurationSecs?: number;
  detectObjects?: boolean;
  onProgress?: (progress: VideoAnalysisProgress) => void;
  signal?: AbortSignal;
}

const pipeline = new VisionPipeline();

function loadVideoSource(source: File | Blob | string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => {
      reject(new Error('Falha ao carregar vídeo'));
    };

    if (source instanceof File || source instanceof Blob) {
      video.src = URL.createObjectURL(source);
    } else {
      video.src = source;
    }
  });
}

function releaseVideoElement(video: HTMLVideoElement | null, revokeBlob: boolean) {
  if (!video) return;
  if (revokeBlob && video.src.startsWith('blob:')) {
    URL.revokeObjectURL(video.src);
  }
  video.removeAttribute('src');
  video.load();
}

function captureThumbnail(video: HTMLVideoElement, timeMs: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(320, video.videoWidth || 320);
    canvas.height = Math.round(canvas.width * ((video.videoHeight || 240) / (video.videoWidth || 320)));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(undefined);
      return;
    }

    const onSeeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
      video.removeEventListener('seeked', onSeeked);
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = Math.min(timeMs / 1000, video.duration - 0.01);
  });
}

function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - timeSec) < 0.05) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = timeSec;
  });
}

export async function processVideoFile(
  source: File | Blob,
  options: VideoProcessOptions = {},
): Promise<{ frames: VideoFrameSample[]; durationSecs: number; thumbnail?: string }> {
  const { samplesPerSec = 2, maxDurationSecs = 600, detectObjects = true, onProgress, signal } = options;

  onProgress?.({
    phase: 'loading_model',
    progressPct: 5,
    framesProcessed: 0,
    totalFrames: 0,
    message: 'Carregando MediaPipe + YOLO...',
  });

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  pipeline.reset();
  let video: HTMLVideoElement | null = null;

  try {
    video = await loadVideoSource(source);

    const durationSecs = Math.min(video.duration || 0, maxDurationSecs);
    const intervalSec = 1 / samplesPerSec;
    const totalFrames = Math.max(1, Math.floor(durationSecs * samplesPerSec));
    const frames: VideoFrameSample[] = [];

    onProgress?.({
      phase: 'extracting',
      progressPct: 10,
      framesProcessed: 0,
      totalFrames,
      message: `Extraindo ${totalFrames} frames (multi-pose + YOLO)...`,
    });

    const thumbnail = await captureThumbnail(video, 0);

    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      const timeSec = i * intervalSec;
      if (timeSec >= durationSecs) break;

      await seekVideo(video, timeSec);

      const processed = await pipeline.processVideoFrame(video, timeSec * 1000, detectObjects);
      if (processed) {
        frames.push({
          timestampMs: processed.timestampMs,
          angles: processed.angles,
          landmarks: processed.landmarks,
          personId: processed.personId,
          personCount: processed.personCount,
          objects: processed.objects,
        });
      }

      onProgress?.({
        phase: 'extracting',
        progressPct: 10 + Math.round((i / totalFrames) * 80),
        framesProcessed: i + 1,
        totalFrames,
        message: `Frame ${i + 1}/${totalFrames} · ${processed?.personCount ?? 0} pessoa(s)`,
      });

      await new Promise((r) => setTimeout(r, 0));
    }

    onProgress?.({
      phase: 'complete',
      progressPct: 100,
      framesProcessed: frames.length,
      totalFrames,
      message: `${frames.length} frames · ${ERGOSENSE_VISION_STACK}`,
    });

    return { frames, durationSecs, thumbnail };
  } finally {
    releaseVideoElement(video, source instanceof File || source instanceof Blob);
    pipeline.release();
  }
}

export function disposeVideoProcessor() {
  pipeline.release();
  pipeline.reset();
  disposeYoloSession();
}
