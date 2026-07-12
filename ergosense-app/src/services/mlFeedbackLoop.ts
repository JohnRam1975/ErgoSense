/**
 * Loop de feedback ML — aprendizado contínuo com correções de ergonomistas
 */
import type { ErgoHeatmapLevel, MlFeedbackEntry, BodyRegionId } from '../types/videoErgo';

const STORAGE_KEY = 'ergosense-ml-feedback-v1';
const MAX_ENTRIES = 500;

interface MlCalibration {
  region: BodyRegionId;
  adjustmentFactor: number;
  sampleCount: number;
}

function loadEntries(): MlFeedbackEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MlFeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: MlFeedbackEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

const LEVEL_ORDER: ErgoHeatmapLevel[] = ['seguro', 'atencao', 'risco', 'critico'];

function levelIndex(l: ErgoHeatmapLevel): number {
  return LEVEL_ORDER.indexOf(l);
}

export function submitMlFeedback(entry: Omit<MlFeedbackEntry, 'id' | 'createdAt'>): MlFeedbackEntry {
  const full: MlFeedbackEntry = {
    ...entry,
    id: `fb-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const entries = loadEntries();
  entries.push(full);
  saveEntries(entries);
  return full;
}

export function getMlFeedbackHistory(analysisId?: string): MlFeedbackEntry[] {
  const entries = loadEntries();
  return analysisId ? entries.filter((e) => e.analysisId === analysisId) : entries;
}

/** Calibra nível de risco com base em feedback histórico */
export function calibrateRiskLevel(
  region: BodyRegionId,
  predicted: ErgoHeatmapLevel,
): ErgoHeatmapLevel {
  const calibrations = computeCalibrations();
  const cal = calibrations.find((c) => c.region === region);
  if (!cal || cal.sampleCount < 3) return predicted;

  const idx = levelIndex(predicted);
  const adjusted = Math.round(idx + cal.adjustmentFactor);
  const clamped = Math.max(0, Math.min(LEVEL_ORDER.length - 1, adjusted));
  return LEVEL_ORDER[clamped];
}

export function computeCalibrations(): MlCalibration[] {
  const entries = loadEntries();
  const byRegion = new Map<BodyRegionId, { delta: number; count: number }>();

  for (const e of entries) {
    const delta = levelIndex(e.correctedLevel) - levelIndex(e.predictedLevel);
    const prev = byRegion.get(e.region) ?? { delta: 0, count: 0 };
    byRegion.set(e.region, { delta: prev.delta + delta, count: prev.count + 1 });
  }

  return [...byRegion.entries()].map(([region, { delta, count }]) => ({
    region,
    adjustmentFactor: delta / count,
    sampleCount: count,
  }));
}

export function getMlStats(): { totalFeedback: number; regionsCalibrated: number; lastUpdated?: string } {
  const entries = loadEntries();
  const calibrations = computeCalibrations().filter((c) => c.sampleCount >= 3);
  return {
    totalFeedback: entries.length,
    regionsCalibrated: calibrations.length,
    lastUpdated: entries[entries.length - 1]?.createdAt,
  };
}
