export type VideoRecordingFormat = 'mp4' | 'webm';

export interface VideoRecordingPayload {
  data: string;
  mimeType: string;
  format: VideoRecordingFormat;
  durationSecs?: number;
  sizeBytes?: number;
}

export function pickVideoMimeType(): string {
  const types = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  if (typeof MediaRecorder !== 'undefined') {
    return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
  }
  return '';
}

export function formatFromMimeType(mimeType: string): VideoRecordingFormat {
  return mimeType.toLowerCase().includes('mp4') ? 'mp4' : 'webm';
}

function stripDataUrlPrefix(dataUrlOrBase64: string): string {
  const idx = dataUrlOrBase64.indexOf('base64,');
  return idx >= 0 ? dataUrlOrBase64.slice(idx + 7) : dataUrlOrBase64;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(stripDataUrlPrefix(result));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler vídeo'));
    reader.readAsDataURL(blob);
  });
}

export async function blobToVideoRecording(
  blob: Blob,
  durationSecs?: number,
): Promise<VideoRecordingPayload> {
  const mimeType = blob.type || 'video/webm';
  return {
    data: await blobToBase64(blob),
    mimeType,
    format: formatFromMimeType(mimeType),
    durationSecs,
    sizeBytes: blob.size,
  };
}

export async function fileToVideoRecording(
  file: File,
  durationSecs?: number,
): Promise<VideoRecordingPayload> {
  return blobToVideoRecording(file, durationSecs ?? undefined);
}

export function createLocalVideoUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeLocalVideoUrl(url?: string | null) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}
