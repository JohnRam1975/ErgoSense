/**
 * Cálculo de risco — matriz probabilidade × severidade (NR-01 / GRO)
 * Avaliação centralizada via critérios configuráveis (§1.5.4.4.2.2)
 */
import { DEFAULT_CRITERIA_CONFIG } from './riskCriteriaDefaults.js';

export const RISK_TYPES = ['FISICO', 'QUIMICO', 'BIOLOGICO', 'ERGONOMICO', 'ACIDENTE', 'PSICOSSOCIAL'];

export const RISK_LEVELS = ['baixo', 'medio', 'alto', 'critico'];

export function normalizeCriteriaConfig(raw) {
  const base = raw && typeof raw === 'object' ? raw : {};
  const defaults = DEFAULT_CRITERIA_CONFIG;
  return {
    matrixType: base.matrixType ?? defaults.matrixType,
    scoreMethod: base.scoreMethod ?? defaults.scoreMethod,
    scaleMin: Number(base.scaleMin ?? defaults.scaleMin),
    scaleMax: Number(base.scaleMax ?? defaults.scaleMax),
    nr01Reference: base.nr01Reference ?? defaults.nr01Reference,
    probability: Array.isArray(base.probability) && base.probability.length ? base.probability : defaults.probability,
    severity: Array.isArray(base.severity) && base.severity.length ? base.severity : defaults.severity,
    thresholds: Array.isArray(base.thresholds) && base.thresholds.length ? base.thresholds : defaults.thresholds,
    acceptability: { ...defaults.acceptability, ...(base.acceptability ?? {}) },
    cellOverrides: base.cellOverrides ?? null,
  };
}

export function isValidScaleValue(config, value) {
  const cfg = normalizeCriteriaConfig(config);
  const n = Number(value);
  if (!Number.isInteger(n)) return false;
  return n >= cfg.scaleMin && n <= cfg.scaleMax;
}

export function computeRiskScore(probability, severity, config = DEFAULT_CRITERIA_CONFIG) {
  const cfg = normalizeCriteriaConfig(config);
  const prob = Number(probability);
  const sev = Number(severity);
  if (!isValidScaleValue(cfg, prob) || !isValidScaleValue(cfg, sev)) return null;

  const cellKey = `${prob}-${sev}`;
  if (cfg.cellOverrides?.[cellKey]?.score != null) {
    return Number(cfg.cellOverrides[cellKey].score);
  }

  if (cfg.scoreMethod === 'SUM') return prob + sev;
  return prob * sev;
}

function resolveThreshold(config, score) {
  const cfg = normalizeCriteriaConfig(config);
  const sorted = [...cfg.thresholds].sort((a, b) => a.minScore - b.minScore);
  for (const t of sorted) {
    if (score >= t.minScore && score <= t.maxScore) return t;
  }
  if (score < sorted[0].minScore) return sorted[0];
  return sorted[sorted.length - 1];
}

export function evaluateWithCriteria(probability, severity, config = DEFAULT_CRITERIA_CONFIG) {
  const cfg = normalizeCriteriaConfig(config);
  const prob = Number(probability);
  const sev = Number(severity);
  const score = computeRiskScore(prob, sev, cfg);
  if (score == null) return null;

  const cellKey = `${prob}-${sev}`;
  const override = cfg.cellOverrides?.[cellKey];

  let level = override?.level ?? resolveThreshold(cfg, score).level;
  let acceptable = override?.acceptable;

  if (acceptable == null) {
    const threshold = cfg.thresholds.find((t) => t.level === level);
    acceptable = threshold?.acceptable ?? !['alto', 'critico'].includes(level);
  }

  if (cfg.acceptability?.acceptableLevels?.length) {
    acceptable = cfg.acceptability.acceptableLevels.includes(level);
  }

  const probMeta = cfg.probability.find((p) => p.value === prob);
  const sevMeta = cfg.severity.find((s) => s.value === sev);
  const levelMeta = cfg.thresholds.find((t) => t.level === level);

  return {
    probability: prob,
    severity: sev,
    score,
    level,
    criticality: level,
    acceptable: Boolean(acceptable),
    probabilityLabel: probMeta?.label ?? String(prob),
    severityLabel: sevMeta?.label ?? String(sev),
    levelLabel: levelMeta?.label ?? level,
    matrixType: cfg.matrixType,
  };
}

export function computeRiskLevel(probability, severity, config = DEFAULT_CRITERIA_CONFIG) {
  return evaluateWithCriteria(probability, severity, config)?.level ?? null;
}

export function isValidRiskType(tipo) {
  return RISK_TYPES.includes(String(tipo ?? '').toUpperCase());
}

export function buildMatrixGrid(config = DEFAULT_CRITERIA_CONFIG) {
  const cfg = normalizeCriteriaConfig(config);
  const grid = [];
  for (const p of cfg.probability) {
    for (const s of cfg.severity) {
      const ev = evaluateWithCriteria(p.value, s.value, cfg);
      grid.push({
        probability: p.value,
        severity: s.value,
        score: ev.score,
        level: ev.level,
        acceptable: ev.acceptable,
        probabilityLabel: p.label,
        severityLabel: s.label,
        levelLabel: ev.levelLabel,
      });
    }
  }
  return grid;
}
