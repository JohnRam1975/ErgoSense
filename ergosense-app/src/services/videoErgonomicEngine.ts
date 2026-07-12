/**
 * Motor de Análise Ergonômica Inteligente por Vídeo
 * Agregação temporal · Timeline · Heatmap · RULA/REBA/OWAS/NR-17 · NIOSH
 */
import { ERGOSENSE_POSE_MODEL, ERGOSENSE_VISION_STACK } from '../config/ergoMethodology';
import { calculateOwas } from '../methods/owas';
import { calculateReba } from '../methods/reba';
import { calculateRula } from '../methods/rula';
import { nioshFromSession } from '../methods/nioshRnle';
import { runSessionMethods } from '../methods/runSessionMethods';
import type { MethodSessionInput } from '../methods/types';
import { classifyPostureFromAngles } from '../vision/enhancedPose';
import type { JointAngles, RiskLevel } from '../types';
import type {
  BodyRegionExposure,
  BodyRegionId,
  ErgoHeatmapLevel,
  ErgoTimelineEvent,
  LoadLiftEvent,
  RepetitiveMovementAnalysis,
  VideoErgoExecutiveMetrics,
  VideoErgoScores,
  VideoErgonomicReport,
} from '../types/videoErgo';
import { assessPostureRisks, ERGONOMIC_LIMITS } from '../utils/ergonomics';
import { generateVideoErgoRecommendations } from './videoErgoRecommendations';
import { analyzeWorkJourney, estimateLoadDistanceFromObjects, journeyTimelineMessages } from '../vision/journeyAnalyzer';
import { isLoadObject, nearestLoadToPoint } from '../vision/yoloDetector';
import { POSE } from '../utils/poseGeometry';
import type { VideoFrameSample } from './videoAnalysis';

const REGION_MAP: { id: BodyRegionId; label: string; check: (a: JointAngles, risks: ReturnType<typeof assessPostureRisks>) => boolean }[] = [
  { id: 'pescoco', label: 'Pescoço', check: (a, r) => r.pescoco || a.pescoco >= ERGONOMIC_LIMITS.pescoco.risk },
  { id: 'tronco', label: 'Tronco', check: (a, r) => r.dorso || a.dorso >= ERGONOMIC_LIMITS.dorso.risk },
  { id: 'lombar', label: 'Coluna lombar', check: (a, r) => r.lombar || a.lombar >= ERGONOMIC_LIMITS.lombar.risk },
  { id: 'ombroD', label: 'Ombro direito', check: (a, r) => r.ombroD || a.ombroD >= ERGONOMIC_LIMITS.ombro.risk },
  { id: 'ombroE', label: 'Ombro esquerdo', check: (_, r) => r.ombroE },
  { id: 'bracoD', label: 'Braço direito', check: (a) => a.ombroD >= 60 },
  { id: 'bracoE', label: 'Braço esquerdo', check: (a) => (a.ombroE ?? 0) >= 60 },
  { id: 'punhoD', label: 'Punho direito', check: (_, r) => r.maoD },
  { id: 'punhoE', label: 'Punho esquerdo', check: (_, r) => r.maoE },
  { id: 'quadril', label: 'Quadril', check: (_, r) => r.quadril },
  { id: 'joelhoD', label: 'Joelho direito', check: (_, r) => r.joelhoD },
  { id: 'joelhoE', label: 'Joelho esquerdo', check: (_, r) => r.joelhoE },
  { id: 'tornozeloD', label: 'Tornozelo direito', check: (_, r) => r.tornozeloD },
  { id: 'tornozeloE', label: 'Tornozelo esquerdo', check: (_, r) => r.tornozeloE },
];

function formatTimeLabel(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function levelFromPct(pct: number): ErgoHeatmapLevel {
  if (pct >= 40) return 'critico';
  if (pct >= 25) return 'risco';
  if (pct >= 10) return 'atencao';
  return 'seguro';
}

function regionIssue(id: BodyRegionId, angles: JointAngles): string {
  switch (id) {
    case 'pescoco':
      return angles.pescoco >= ERGONOMIC_LIMITS.pescoco.critical ? 'Flexão cervical excessiva' : 'Inclinação cervical';
    case 'lombar':
      return angles.lombar >= ERGONOMIC_LIMITS.lombar.critical ? 'Flexão lombar crítica' : 'Inclinação lombar';
    case 'tronco':
      return 'Inclinação/torção do tronco';
    case 'ombroD':
    case 'ombroE':
    case 'bracoD':
    case 'bracoE':
      return 'Elevação ou alcance excessivo do braço';
    case 'punhoD':
    case 'punhoE':
      return 'Desvio ou flexão de punho';
    case 'quadril':
      return 'Postura inadequada do quadril';
    case 'joelhoD':
    case 'joelhoE':
      return angles.joelhoD < 100 ? 'Agachamento prolongado' : 'Joelho hiperextendido';
    default:
      return 'Postura inadequada';
  }
}

function computeExposure(frames: VideoFrameSample[]): BodyRegionExposure[] {
  const n = frames.length || 1;
  const avgAngles = averageAngles(frames);

  return REGION_MAP.map(({ id, label, check }) => {
    let riskCount = 0;
    for (const f of frames) {
      const risks = assessPostureRisks(f.angles);
      if (check(f.angles, risks)) riskCount++;
    }
    const exposurePct = Math.round((riskCount / n) * 100);
    return {
      regionId: id,
      label,
      exposurePct,
      adequatePct: 100 - exposurePct,
      level: levelFromPct(exposurePct),
      primaryIssue: exposurePct >= 10 ? regionIssue(id, avgAngles) : undefined,
    };
  });
}

function averageAngles(frames: VideoFrameSample[]): JointAngles {
  if (frames.length === 0) {
    return { lombar: 0, dorso: 0, ombroD: 0, pescoco: 0, cotovelo: 90, maoD: 140, quadril: 95, joelhoD: 110, tornozeloD: 95, repeticao: 0 };
  }
  const sum = frames.reduce(
    (acc, f) => ({
      lombar: acc.lombar + f.angles.lombar,
      dorso: acc.dorso + f.angles.dorso,
      ombroD: acc.ombroD + f.angles.ombroD,
      pescoco: acc.pescoco + f.angles.pescoco,
      cotovelo: acc.cotovelo + f.angles.cotovelo,
      maoD: acc.maoD + f.angles.maoD,
      quadril: acc.quadril + f.angles.quadril,
      joelhoD: acc.joelhoD + f.angles.joelhoD,
      tornozeloD: acc.tornozeloD + f.angles.tornozeloD,
      repeticao: acc.repeticao + f.angles.repeticao,
    }),
    { lombar: 0, dorso: 0, ombroD: 0, pescoco: 0, cotovelo: 0, maoD: 0, quadril: 0, joelhoD: 0, tornozeloD: 0, repeticao: 0 },
  );
  const n = frames.length;
  return {
    lombar: Math.round(sum.lombar / n),
    dorso: Math.round(sum.dorso / n),
    ombroD: Math.round(sum.ombroD / n),
    pescoco: Math.round(sum.pescoco / n),
    cotovelo: Math.round(sum.cotovelo / n),
    maoD: Math.round(sum.maoD / n),
    quadril: Math.round(sum.quadril / n),
    joelhoD: Math.round(sum.joelhoD / n),
    tornozeloD: Math.round(sum.tornozeloD / n),
    repeticao: Math.round(sum.repeticao / n),
  };
}

function worstAngles(frames: VideoFrameSample[]): JointAngles {
  return frames.reduce(
    (w, f) => ({
      ...f.angles,
      lombar: Math.max(w.lombar, f.angles.lombar),
      dorso: Math.max(w.dorso, f.angles.dorso),
      ombroD: Math.max(w.ombroD, f.angles.ombroD),
      pescoco: Math.max(w.pescoco, f.angles.pescoco),
      repeticao: Math.max(w.repeticao, f.angles.repeticao),
    }),
    frames[0]?.angles ?? { lombar: 0, dorso: 0, ombroD: 0, pescoco: 0, cotovelo: 90, maoD: 140, quadril: 95, joelhoD: 110, tornozeloD: 95, repeticao: 0 },
  );
}

function buildTimeline(frames: VideoFrameSample[]): ErgoTimelineEvent[] {
  const events: ErgoTimelineEvent[] = [];
  let prevRisk = false;
  let lastRepAlert = -99999;

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const risks = assessPostureRisks(f.angles);
    const inRisk = Object.entries(risks).some(([k, v]) => v && !k.startsWith('tela') && k !== 'luz' && k !== 'filtroAzul');

    if (inRisk && !prevRisk) {
      const region = REGION_MAP.find(({ check }) => check(f.angles, risks));
      const severity: RiskLevel =
        f.angles.lombar >= 30 || f.angles.ombroD >= 120 ? 'critico' : f.angles.lombar >= 20 ? 'alto' : 'medio';
      events.push({
        timestampMs: f.timestampMs,
        timeLabel: formatTimeLabel(f.timestampMs),
        type: 'postura',
        severity,
        message: region ? `${region.label}: postura inadequada detectada` : 'Postura inadequada detectada',
        region: region?.id,
      });
    } else if (!inRisk && prevRisk) {
      events.push({
        timestampMs: f.timestampMs,
        timeLabel: formatTimeLabel(f.timestampMs),
        type: 'correcao',
        severity: 'baixo',
        message: 'Postura corrigida',
      });
    }
    prevRisk = inRisk;

    if (f.angles.repeticao >= 8 && f.timestampMs - lastRepAlert > 15000) {
      lastRepAlert = f.timestampMs;
      const repSeverity: RiskLevel = f.angles.repeticao >= 12 ? 'critico' : f.angles.repeticao >= 8 ? 'alto' : 'medio';
      events.push({
        timestampMs: f.timestampMs,
        timeLabel: formatTimeLabel(f.timestampMs),
        type: 'repeticao',
        severity: repSeverity,
        message: `Movimento repetitivo ${repSeverity === 'critico' ? 'crítico' : 'elevado'} (~${f.angles.repeticao}/min)`,
      });
    }

    if (f.angles.lombar >= 35 && i > 0) {
      const prev = frames[i - 1].angles.lombar;
      if (prev < 20 && f.angles.lombar - prev > 15) {
        events.push({
          timestampMs: f.timestampMs,
          timeLabel: formatTimeLabel(f.timestampMs),
          type: 'carga',
          severity: 'alto',
          message: 'Levantamento inadequado — flexão lombar súbita',
          region: 'lombar',
        });
      }
    }
  }

  return events.slice(0, 50);
}

function analyzeRepetitiveMovement(frames: VideoFrameSample[], durationSecs: number): RepetitiveMovementAnalysis {
  const maxRep = Math.max(...frames.map((f) => f.angles.repeticao), 0);
  const avgRep = frames.length ? frames.reduce((s, f) => s + f.angles.repeticao, 0) / frames.length : 0;
  const mpm = Math.round(maxRep || avgRep);
  const cycleCount = Math.round(mpm * (durationSecs / 60));

  let frequencyClass: RiskLevel = 'baixo';
  let classificationLabel = 'Baixo risco';
  if (mpm >= 12) {
    frequencyClass = 'critico';
    classificationLabel = 'Crítico';
  } else if (mpm >= 8) {
    frequencyClass = 'alto';
    classificationLabel = 'Alto risco';
  } else if (mpm >= 5) {
    frequencyClass = 'medio';
    classificationLabel = 'Médio risco';
  }

  const shoulderFrames = frames.filter((f) => f.angles.ombroD >= 60).length;
  const wristFrames = frames.filter((f) => f.angles.maoD >= ERGONOMIC_LIMITS.mao.risk).length;
  const dominantRegion =
    shoulderFrames > wristFrames ? 'Ombros/braços' : wristFrames > 0 ? 'Punhos' : 'Tronco';

  return { movementsPerMinute: mpm, cycleCount, frequencyClass, classificationLabel, dominantRegion };
}

function detectLoadLifts(frames: VideoFrameSample[], weightKg?: number): LoadLiftEvent[] {
  const lifts: LoadLiftEvent[] = [];
  const w = weightKg ?? 15;

  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1];
    const cur = frames[i];
    const delta = cur.angles.lombar - prev.angles.lombar;
    const loadObj = cur.objects?.find(isLoadObject) ?? nearestLoadToPoint(cur.objects ?? [], { x: 0.5, y: 0.5 });
    const hasYoloLoad = !!loadObj;
    const lumbarLift = delta > 15 && cur.angles.lombar >= 25;

    if (!lumbarLift && !hasYoloLoad) continue;

    let distanceCm = 40;
    if (cur.landmarks?.length) {
      const lh = cur.landmarks[POSE.leftHip];
      const rh = cur.landmarks[POSE.rightHip];
      const trunk = lh && rh ? { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 } : { x: 0.5, y: 0.55 };
      const shoulderW = cur.landmarks[POSE.leftShoulder] && cur.landmarks[POSE.rightShoulder]
        ? Math.abs(cur.landmarks[POSE.leftShoulder].x - cur.landmarks[POSE.rightShoulder].x)
        : 0.15;
      distanceCm = estimateLoadDistanceFromObjects(cur.objects, trunk, shoulderW);
    }

    const niosh = nioshFromSession(
      {
        weightKg: w,
        distanceCm,
        heightCm: 75 - Math.min(30, cur.angles.lombar),
        distanceSource: 'vision',
        frequency: 'esporadico',
        handlingMode: 'individual',
        exposureSecs: 30,
        estimatedTaskMinutes: 10,
        repetitionsPerMinute: 1,
        gripType: 'regular',
        trunkTwist: cur.angles.dorso >= 15,
        displacementWithLoad: true,
      },
      cur.angles,
      75 + Math.min(40, cur.angles.lombar),
    );
    const li = niosh ? Number(niosh.outputs.LI ?? 1.5) : 1.5;
    lifts.push({
      timestampMs: cur.timestampMs,
      timeLabel: formatTimeLabel(cur.timestampMs),
      estimatedWeightKg: w,
      distanceFromBodyCm: distanceCm,
      liftHeightCm: Math.round(75 + cur.angles.lombar * 0.8),
      nioshLi: li,
      riskLevel: li > 3 ? 'critico' : li > 2 ? 'alto' : li > 1 ? 'medio' : 'baixo',
    });
  }
  return lifts.slice(0, 20);
}

function computeScores(worst: JointAngles, exposure: BodyRegionExposure[], baseInput: MethodSessionInput): VideoErgoScores {
  const sitting = classifyPostureFromAngles(worst).mode === 'sentado';
  const rula = calculateRula(worst, sitting, baseInput.loadParams);
  const reba = calculateReba(worst, !sitting, baseInput.loadParams);
  const owas = calculateOwas(worst, baseInput.loadParams?.weightKg ?? 0, sitting);

  const criticalRegions = exposure.filter((e) => e.level === 'critico' || e.level === 'risco');
  const nr17Gaps = criticalRegions.map((e) => `${e.label}: ${e.exposurePct}% exposição`);
  const compliancePct = Math.max(0, Math.round(100 - criticalRegions.reduce((s, e) => s + e.exposurePct, 0) / Math.max(1, criticalRegions.length)));

  const avgExposure = exposure.reduce((s, e) => s + e.exposurePct, 0) / Math.max(1, exposure.length);
  const ergonomicIndex = Math.max(0, Math.round(100 - avgExposure * 0.8 - rula.score * 2));
  const safetyScore = Math.max(0, Math.round(100 - reba.score * 3 - avgExposure * 0.5));

  const rulaAction =
    rula.score >= 7 ? 'Ação imediata' : rula.score >= 5 ? 'Mudança em breve' : rula.score >= 3 ? 'Investigar' : 'Aceitável';

  return {
    rula: { score: rula.score, actionLevel: rulaAction, justification: rula.recommendation[0] ?? 'Postura avaliada conforme RULA' },
    reba: { score: reba.score, riskLevel: reba.classificationLabel },
    owas: { class: owas.score, label: owas.classificationLabel },
    nr17: { compliant: compliancePct >= 70, compliancePct, gaps: nr17Gaps.slice(0, 6) },
    ergonomicIndex,
    safetyScore,
  };
}

function buildExecutiveMetrics(scores: VideoErgoScores, exposure: BodyRegionExposure[]): VideoErgoExecutiveMetrics {
  const riskRanking = [...exposure]
    .filter((e) => e.exposurePct > 0)
    .sort((a, b) => b.exposurePct - a.exposurePct)
    .slice(0, 5)
    .map((e) => ({ label: e.label, score: e.exposurePct, pct: e.exposurePct }));

  return {
    ergonomicIndex: scores.ergonomicIndex,
    safetyScore: scores.safetyScore,
    nr17CompliancePct: scores.nr17.compliancePct,
    riskRanking,
    trend: scores.ergonomicIndex >= 70 ? 'melhorando' : scores.ergonomicIndex >= 50 ? 'estavel' : 'piorando',
  };
}

export interface VideoErgoAnalysisInput {
  frames: VideoFrameSample[];
  baseInput: Omit<MethodSessionInput, 'angles'>;
  source?: VideoErgonomicReport['source'];
  captureThumbnail?: string;
}

export function analyzeVideoErgonomicSession(input: VideoErgoAnalysisInput): VideoErgonomicReport {
  const { frames, baseInput, source = 'upload', captureThumbnail } = input;

  if (frames.length === 0) {
    const emptyAngles: JointAngles = {
      lombar: 0, dorso: 0, ombroD: 0, pescoco: 0, cotovelo: 90, maoD: 140, quadril: 95, joelhoD: 110, tornozeloD: 95, repeticao: 0,
    };
    const methods = runSessionMethods({ ...baseInput, angles: emptyAngles }).methods;
    const scores: VideoErgoScores = {
      rula: { score: 1, actionLevel: 'Aceitável', justification: 'Sem frames' },
      reba: { score: 1, riskLevel: 'Baixo' },
      owas: { class: 1, label: 'Normal' },
      nr17: { compliant: true, compliancePct: 100, gaps: [] },
      ergonomicIndex: 100,
      safetyScore: 100,
    };
    return {
      version: '1.0.0',
      source,
      processedAt: new Date().toISOString(),
      frameCount: 0,
      durationSecs: 0,
      samplesPerSec: 0,
      frames: [],
      worstAngles: emptyAngles,
      exposureByRegion: [],
      timeline: [],
      repetitiveMovement: { movementsPerMinute: 0, cycleCount: 0, frequencyClass: 'baixo', classificationLabel: 'Baixo risco', dominantRegion: '—' },
      loadLifts: [],
      journey: analyzeWorkJourney([]),
      scores,
      methods,
      recommendations: [],
      executive: { ergonomicIndex: 100, safetyScore: 100, nr17CompliancePct: 100, riskRanking: [], trend: 'estavel' },
      postureModes: {},
      captureThumbnail,
      modelVersion: ERGOSENSE_POSE_MODEL,
    };
  }

  const durationSecs =
    frames.length > 1 ? (frames[frames.length - 1].timestampMs - frames[0].timestampMs) / 1000 : 1;
  const worst = worstAngles(frames);
  const exposure = computeExposure(frames);
  const timeline = buildTimeline(frames);
  const repetitiveMovement = analyzeRepetitiveMovement(frames, durationSecs);
  const loadLifts = detectLoadLifts(frames, baseInput.loadParams?.weightKg);
  const journey = analyzeWorkJourney(frames);

  const methods = runSessionMethods({
    ...baseInput,
    angles: worst,
    videoFrameCount: frames.length,
    exposureSecs: durationSecs,
  }).methods;

  const scores = computeScores(worst, exposure, { ...baseInput, angles: worst });
  const recommendations = generateVideoErgoRecommendations(exposure, scores, repetitiveMovement, loadLifts);
  const executive = buildExecutiveMetrics(scores, exposure);

  const postureModes: Record<string, number> = {};
  for (const f of frames) {
    const mode = classifyPostureFromAngles(f.angles).mode;
    postureModes[mode] = (postureModes[mode] ?? 0) + 1;
  }

  for (const msg of journeyTimelineMessages(journey).slice(0, 3)) {
    timeline.push({
      timestampMs: frames[0]?.timestampMs ?? 0,
      timeLabel: formatTimeLabel(frames[0]?.timestampMs ?? 0),
      type: 'postura',
      severity: 'medio',
      message: `Jornada: ${msg}`,
    });
  }

  return {
    version: '2.0.0',
    source,
    processedAt: new Date().toISOString(),
    frameCount: frames.length,
    durationSecs: Math.round(durationSecs),
    samplesPerSec: frames.length / Math.max(1, durationSecs),
    frames,
    worstAngles: worst,
    exposureByRegion: exposure,
    timeline,
    repetitiveMovement,
    loadLifts,
    journey,
    scores,
    methods,
    recommendations,
    executive,
    postureModes,
    captureThumbnail,
    modelVersion: `${ERGOSENSE_VISION_STACK} · ${ERGOSENSE_POSE_MODEL}`,
  };
}

export { formatTimeLabel, levelFromPct };
