import { useCallback, useEffect, useRef, useState } from 'react';

import { videoConstraintsForQuality } from '../utils/captureQuality';
import { pickVideoMimeType } from '../utils/videoRecording';

export type CameraStatus = 'idle' | 'loading' | 'ready' | 'recording' | 'paused' | 'error';

function pickMimeType() {
  return pickVideoMimeType();
}

export function useCamera(
  facingMode: 'user' | 'environment',
  onError?: (msg: string) => void,
  captureQuality = 'HD 720p',
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [status, setStatus] = useState<CameraStatus>('loading');
  const [error, setError] = useState('');

  const attachStream = useCallback(async (video: HTMLVideoElement, stream: MediaStream) => {
    video.srcObject = stream;
    video.muted = true;
    try {
      await video.play();
    } catch {
      /* autoplay policies — muted should work */
    }
  }, []);

  const setVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node && streamRef.current) {
        attachStream(node, streamRef.current);
      }
    },
    [attachStream],
  );

  const startRecorder = useCallback((stream: MediaStream) => {
    chunksRef.current = [];
    try {
      const mime = pickMimeType();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_000_000 })
        : new MediaRecorder(stream, { videoBitsPerSecond: 1_000_000 });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setStatus('recording');
    } catch {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError('');

    const primary = videoConstraintsForQuality(captureQuality, facingMode);
    const attempts: MediaStreamConstraints[] = [
      { video: primary, audio: false },
      { video: { facingMode: 'user', width: primary.width, height: primary.height }, audio: false },
      { video: { width: primary.width, height: primary.height }, audio: false },
      { video: true, audio: false },
    ];

    const start = async () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());

      for (const constraints of attempts) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) await attachStream(videoRef.current, stream);
          setStatus('ready');
          setError('');
          return;
        } catch (err) {
          if (constraints === attempts[attempts.length - 1]) {
            const msg =
              err instanceof Error
                ? err.message.includes('Permission')
                  ? 'Permissão de câmera negada. Clique no cadeado na barra de endereço e permita a câmera.'
                  : err.message
                : 'Câmera indisponível';
            setError(msg);
            setStatus('error');
            onError?.(msg);
          }
        }
      }
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Navegador não suporta câmera. Use Chrome ou Edge via localhost.');
      setStatus('error');
      return;
    }

    void start();

    return () => {
      active = false;
      recorderRef.current?.stop();
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode, captureQuality, attachStream, startRecorder, onError]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.82);
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recorderRef.current?.state === 'recording') return;
    startRecorder(stream);
  }, [startRecorder]);

  /** Pausa gravação — mantém preview; pode retomar com resumeRecording */
  const pauseRecording = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state !== 'recording') {
        setStatus('paused');
        resolve();
        return;
      }
      recorder.onstop = () => {
        recorderRef.current = null;
        setStatus('paused');
        resolve();
      };
      recorder.stop();
    });
  }, []);

  const resumeRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    startRecorder(stream);
  }, [startRecorder]);

  const stopRecording = useCallback((): Promise<{ image: string | null; videoBlob: Blob | null }> => {
    return new Promise((resolve) => {
      const image = captureFrame();
      const recorder = recorderRef.current;

      const finish = (videoBlob: Blob | null) => {
        recorderRef.current = null;
        setStatus('ready');
        resolve({ image, videoBlob });
      };

      if (!recorder || recorder.state === 'inactive') {
        finish(null);
        return;
      }

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'video/webm';
        const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: mime }) : null;
        chunksRef.current = [];
        finish(blob);
      };

      try {
        recorder.stop();
      } catch {
        finish(null);
      }
    });
  }, [captureFrame]);

  const hasPreview = status === 'ready' || status === 'recording' || status === 'paused';
  const isAnalyzing = status === 'recording';
  const isPaused = status === 'paused';

  return {
    setVideoNode,
    videoRef,
    status,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    hasPreview,
    isAnalyzing,
    isPaused,
  };
}
