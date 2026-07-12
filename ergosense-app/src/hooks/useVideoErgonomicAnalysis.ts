import { useCallback, useRef, useState } from 'react';
import type { MethodSessionInput } from '../methods/types';
import type { VideoAnalysisProgress, VideoErgonomicReport } from '../types/videoErgo';
import { analyzeVideoErgonomicSession } from '../services/videoErgonomicEngine';
import type { VideoFrameSample } from '../services/videoAnalysis';
import { processVideoFile } from '../utils/videoFrameProcessor';

export type VideoCaptureMode = 'live' | 'upload' | 'offline_sync';

interface UseVideoErgonomicAnalysisOptions {
  baseInput: Omit<MethodSessionInput, 'angles'>;
}

export function useVideoErgonomicAnalysis({ baseInput }: UseVideoErgonomicAnalysisOptions) {
  const [progress, setProgress] = useState<VideoAnalysisProgress>({
    phase: 'idle',
    progressPct: 0,
    framesProcessed: 0,
    totalFrames: 0,
    message: '',
  });
  const [report, setReport] = useState<VideoErgonomicReport | null>(null);
  const [liveFrames, setLiveFrames] = useState<VideoFrameSample[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const liveIntervalRef = useRef<number>(0);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    setProgress((p) => ({ ...p, phase: 'idle', message: 'Cancelado' }));
  }, []);

  const analyzeFromFile = useCallback(
    async (file: File, mode: VideoCaptureMode = 'upload') => {
      abortRef.current = new AbortController();
      setReport(null);
      setProgress({ phase: 'loading_model', progressPct: 0, framesProcessed: 0, totalFrames: 0, message: 'Iniciando...' });

      try {
        const { frames, thumbnail } = await processVideoFile(file, {
          samplesPerSec: 2,
          onProgress: setProgress,
          signal: abortRef.current.signal,
        });

        setProgress((p) => ({ ...p, phase: 'analyzing', message: 'Analisando posturas...' }));

        const result = analyzeVideoErgonomicSession({
          frames,
          baseInput,
          source: mode,
          captureThumbnail: thumbnail,
        });

        setReport(result);
        setProgress({ phase: 'complete', progressPct: 100, framesProcessed: frames.length, totalFrames: frames.length, message: 'Análise concluída' });
        return result;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return null;
        const msg = err instanceof Error ? err.message : 'Erro na análise';
        setProgress({ phase: 'error', progressPct: 0, framesProcessed: 0, totalFrames: 0, message: msg });
        return null;
      }
    },
    [baseInput],
  );

  const analyzeFromFrames = useCallback(
    (frames: VideoFrameSample[], mode: VideoCaptureMode = 'live', thumbnail?: string) => {
      setProgress({ phase: 'analyzing', progressPct: 90, framesProcessed: frames.length, totalFrames: frames.length, message: 'Analisando...' });
      const result = analyzeVideoErgonomicSession({ frames, baseInput, source: mode, captureThumbnail: thumbnail });
      setReport(result);
      setProgress({ phase: 'complete', progressPct: 100, framesProcessed: frames.length, totalFrames: frames.length, message: 'Análise concluída' });
      return result;
    },
    [baseInput],
  );

  const startLiveCapture = useCallback(
    (sampleFn: () => VideoFrameSample | null, intervalMs = 500) => {
      setLiveFrames([]);
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = window.setInterval(() => {
        const sample = sampleFn();
        if (sample) setLiveFrames((prev) => [...prev, sample]);
      }, intervalMs);
    },
    [],
  );

  const stopLiveCapture = useCallback(
    (mode: VideoCaptureMode = 'live') => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = 0;
      }
      return analyzeFromFrames(liveFrames, mode);
    },
    [analyzeFromFrames, liveFrames],
  );

  const reset = useCallback(() => {
    cancel();
    setReport(null);
    setLiveFrames([]);
    setProgress({ phase: 'idle', progressPct: 0, framesProcessed: 0, totalFrames: 0, message: '' });
  }, [cancel]);

  return {
    progress,
    report,
    liveFrames,
    analyzeFromFile,
    analyzeFromFrames,
    startLiveCapture,
    stopLiveCapture,
    cancel,
    reset,
  };
}
