/**
 * Módulo 10 — Análise de vídeo multi-frame
 * Integrado ao motor videoErgonomicEngine para análise temporal completa.
 */
import type { JointAngles } from '../types';
import type { PosePoint } from '../types/pose';
import type { DetectedObject } from '../vision/objectDetection';
import { classifyPostureFromAngles } from '../vision/enhancedPose';
import type { ErgonomicMethodResult } from '../methods/types';
import { runSessionMethods } from '../methods/runSessionMethods';
import type { MethodSessionInput } from '../methods/types';
import { analyzeVideoErgonomicSession } from './videoErgonomicEngine';
import type { VideoErgonomicReport } from '../types/videoErgo';

export interface VideoFrameSample {
  timestampMs: number;
  angles: JointAngles;
  /** Landmarks normalizados do trabalhador principal */
  landmarks?: PosePoint[];
  personId?: number;
  personCount?: number;
  objects?: DetectedObject[];
}

export interface VideoAnalysisSummary {
  frameCount: number;
  durationSecs: number;
  worstAngles: JointAngles;
  repetitionEstimate: number;
  exposureRiskSecs: number;
  methods: ErgonomicMethodResult[];
  postureModes: Record<string, number>;
  /** Relatório completo quando disponível */
  ergonomicReport?: VideoErgonomicReport;
}

export function extractFramesFromVideoMetadata(
  durationSecs: number,
  samplesPerSec = 1,
): number {
  return Math.max(1, Math.floor(durationSecs * samplesPerSec));
}

export function analyzeVideoFrames(
  frames: VideoFrameSample[],
  baseInput: Omit<MethodSessionInput, 'angles'>,
): VideoAnalysisSummary {
  if (frames.length === 0) {
    const empty: JointAngles = {
      lombar: 0, dorso: 0, ombroD: 0, pescoco: 0, cotovelo: 90, maoD: 140, quadril: 95, joelhoD: 110, tornozeloD: 95, repeticao: 0,
    };
    return {
      frameCount: 0,
      durationSecs: 0,
      worstAngles: empty,
      repetitionEstimate: 0,
      exposureRiskSecs: 0,
      methods: [],
      postureModes: {},
    };
  }

  const worst = frames.reduce((w, f) => ({
    ...f.angles,
    lombar: Math.max(w.lombar, f.angles.lombar),
    ombroD: Math.max(w.ombroD, f.angles.ombroD),
    pescoco: Math.max(w.pescoco, f.angles.pescoco),
    repeticao: Math.max(w.repeticao, f.angles.repeticao),
  }), frames[0].angles);

  const postureModes: Record<string, number> = {};
  for (const f of frames) {
    const p = classifyPostureFromAngles(f.angles).mode;
    postureModes[p] = (postureModes[p] ?? 0) + 1;
  }

  const durationSecs =
    frames.length > 1
      ? (frames[frames.length - 1].timestampMs - frames[0].timestampMs) / 1000
      : 1;

  const methods = runSessionMethods({ ...baseInput, angles: worst }).methods;

  const ergonomicReport = analyzeVideoErgonomicSession({ frames, baseInput, source: 'upload' });

  return {
    frameCount: frames.length,
    durationSecs,
    worstAngles: worst,
    repetitionEstimate: worst.repeticao * Math.max(1, durationSecs / 60),
    exposureRiskSecs: frames.filter((f) => f.angles.lombar >= 20).length * (durationSecs / frames.length),
    methods,
    postureModes,
    ergonomicReport,
  };
}
