/**
 * Análise de jornada de trabalho — segmentação temporal de fases
 * Combina pose + detecção YOLO + dinâmica lombar
 */
import type { VideoFrameSample } from '../services/videoAnalysis';
import { POSE } from '../utils/poseGeometry';
import { isLoadObject } from './yoloDetector';
import type { DetectedObject } from './objectDetection';

export type JourneyPhaseType =
  | 'repouso'
  | 'preparacao'
  | 'pega'
  | 'transporte'
  | 'posicionamento'
  | 'liberacao';

export interface JourneyPhase {
  phase: JourneyPhaseType;
  startMs: number;
  endMs: number;
  durationSecs: number;
  avgLumbarDeg: number;
  loadDetected: boolean;
  personCount: number;
}

export interface JourneyAnalysis {
  phases: JourneyPhase[];
  totalDurationSecs: number;
  activeWorkSecs: number;
  loadHandlingSecs: number;
  restSecs: number;
  phaseTransitions: number;
  dominantPhase: JourneyPhaseType;
  multiPersonFrames: number;
  loadObjectFrames: number;
}

const PHASE_LABELS: Record<JourneyPhaseType, string> = {
  repouso: 'Repouso / pausa',
  preparacao: 'Preparação',
  pega: 'Pega da carga',
  transporte: 'Transporte',
  posicionamento: 'Posicionamento',
  liberacao: 'Liberação / depósito',
};

export function journeyPhaseLabel(phase: JourneyPhaseType): string {
  return PHASE_LABELS[phase];
}

function wristLoadProximity(frame: VideoFrameSample): boolean {
  const objects = frame.objects?.filter(isLoadObject) ?? [];
  if (!objects.length) return false;
  const wrists = frame.landmarks;
  if (!wrists?.length) return frame.angles.lombar >= 25;
  const rw = wrists[POSE.rightWrist];
  const lw = wrists[POSE.leftWrist];
  if (!rw && !lw) return false;
  for (const obj of objects) {
    for (const w of [rw, lw]) {
      if (!w) continue;
      if (Math.hypot(w.x - obj.center.x, w.y - obj.center.y) < 0.18) return true;
    }
  }
  return false;
}

function classifyFramePhase(frame: VideoFrameSample, prev?: VideoFrameSample): JourneyPhaseType {
  const lumbar = frame.angles.lombar;
  const rep = frame.angles.repeticao;
  const hasLoad = wristLoadProximity(frame);
  const moving =
    prev != null ? Math.abs(lumbar - prev.angles.lombar) > 4 || Math.abs(frame.angles.ombroD - prev.angles.ombroD) > 8 : false;

  if (rep < 1 && lumbar < 12 && !hasLoad && !moving) return 'repouso';
  if (hasLoad && lumbar >= 30 && moving) return 'transporte';
  if (hasLoad && lumbar >= 20) return 'pega';
  if (lumbar >= 35 && moving) return 'posicionamento';
  if (hasLoad && lumbar < 20) return 'liberacao';
  if (moving || rep >= 2) return 'preparacao';
  return 'repouso';
}

export function analyzeWorkJourney(frames: VideoFrameSample[]): JourneyAnalysis {
  if (frames.length === 0) {
    return {
      phases: [],
      totalDurationSecs: 0,
      activeWorkSecs: 0,
      loadHandlingSecs: 0,
      restSecs: 0,
      phaseTransitions: 0,
      dominantPhase: 'repouso',
      multiPersonFrames: 0,
      loadObjectFrames: 0,
    };
  }

  const rawPhases: JourneyPhase[] = [];
  let current: JourneyPhaseType = classifyFramePhase(frames[0]);
  let startIdx = 0;
  let transitions = 0;
  let multiPerson = 0;
  let loadFrames = 0;

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if ((f.personCount ?? 1) > 1) multiPerson++;
    if (f.objects?.some(isLoadObject)) loadFrames++;

    const phase = classifyFramePhase(f, frames[i - 1]);
    if (phase !== current || i === frames.length - 1) {
      const endIdx = phase !== current ? i - 1 : i;
      const slice = frames.slice(startIdx, endIdx + 1);
      const startMs = frames[startIdx].timestampMs;
      const endMs = frames[endIdx].timestampMs;
      const durationSecs = Math.max(0.1, (endMs - startMs) / 1000);
      rawPhases.push({
        phase: current,
        startMs,
        endMs,
        durationSecs,
        avgLumbarDeg: Math.round(slice.reduce((s, x) => s + x.angles.lombar, 0) / slice.length),
        loadDetected: slice.some((x) => wristLoadProximity(x)),
        personCount: Math.max(...slice.map((x) => x.personCount ?? 1)),
      });
      if (phase !== current) {
        transitions++;
        current = phase;
        startIdx = i;
      }
    }
  }

  const totalDurationSecs =
    frames.length > 1
      ? (frames[frames.length - 1].timestampMs - frames[0].timestampMs) / 1000
      : 0.1;

  const restSecs = rawPhases.filter((p) => p.phase === 'repouso').reduce((s, p) => s + p.durationSecs, 0);
  const loadHandlingSecs = rawPhases
    .filter((p) => ['pega', 'transporte', 'posicionamento', 'liberacao'].includes(p.phase))
    .reduce((s, p) => s + p.durationSecs, 0);
  const activeWorkSecs = totalDurationSecs - restSecs;

  const phaseTotals = new Map<JourneyPhaseType, number>();
  for (const p of rawPhases) {
    phaseTotals.set(p.phase, (phaseTotals.get(p.phase) ?? 0) + p.durationSecs);
  }
  let dominantPhase: JourneyPhaseType = 'repouso';
  let maxT = 0;
  for (const [ph, t] of phaseTotals) {
    if (t > maxT) {
      maxT = t;
      dominantPhase = ph;
    }
  }

  return {
    phases: rawPhases,
    totalDurationSecs: Math.round(totalDurationSecs * 10) / 10,
    activeWorkSecs: Math.round(activeWorkSecs * 10) / 10,
    loadHandlingSecs: Math.round(loadHandlingSecs * 10) / 10,
    restSecs: Math.round(restSecs * 10) / 10,
    phaseTransitions: transitions,
    dominantPhase,
    multiPersonFrames: multiPerson,
    loadObjectFrames: loadFrames,
  };
}

export function journeyTimelineMessages(journey: JourneyAnalysis): string[] {
  return journey.phases.slice(0, 12).map(
    (p) => `${journeyPhaseLabel(p.phase)} (${Math.round(p.durationSecs)}s) — lombar média ${p.avgLumbarDeg}°`,
  );
}

export function estimateLoadDistanceFromObjects(
  objects: DetectedObject[] | undefined,
  trunkCenter: { x: number; y: number },
  shoulderWidthNorm: number,
): number {
  const load = objects?.find(isLoadObject);
  if (!load) return 35;
  const distNorm = Math.hypot(load.center.x - trunkCenter.x, load.center.y - trunkCenter.y);
  const scaleCm = shoulderWidthNorm > 0.05 ? 42 / shoulderWidthNorm : 600;
  return Math.round(Math.max(15, Math.min(80, distNorm * scaleCm)));
}
