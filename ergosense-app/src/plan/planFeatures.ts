/**
 * Limites por plano — modo gratuito vs profissional.
 */

export type PlanTier = 'free' | 'standard' | 'professional' | 'enterprise';

export function planTierFromName(plan?: string | null): PlanTier {
  const p = (plan ?? '').toLowerCase();
  if (p.includes('enterprise') || p.includes('empresa')) return 'enterprise';
  if (p.includes('pro') || p.includes('profissional') || p.includes('premium')) return 'professional';
  if (p.includes('standard') || p.includes('padrao') || p.includes('padrão')) return 'standard';
  if (p.includes('free') || p.includes('gratuito') || p.includes('trial')) return 'free';
  return 'standard';
}

export const PLAN_LIMITS = {
  free: {
    maxHistoryVisible: 5,
    fullPdfExport: false,
    advancedHistoryFilters: false,
    unlimitedAnalyses: false,
    maxAnalysesPerMonth: 10,
    dashboardCompare: false,
  },
  standard: {
    maxHistoryVisible: 50,
    fullPdfExport: true,
    advancedHistoryFilters: true,
    unlimitedAnalyses: true,
    maxAnalysesPerMonth: 9999,
    dashboardCompare: false,
  },
  professional: {
    maxHistoryVisible: 9999,
    fullPdfExport: true,
    advancedHistoryFilters: true,
    unlimitedAnalyses: true,
    maxAnalysesPerMonth: 9999,
    dashboardCompare: true,
  },
  enterprise: {
    maxHistoryVisible: 9999,
    fullPdfExport: true,
    advancedHistoryFilters: true,
    unlimitedAnalyses: true,
    maxAnalysesPerMonth: 9999,
    dashboardCompare: true,
  },
} as const;

export function planLimits(tier: PlanTier) {
  return PLAN_LIMITS[tier];
}

export function canExportFullPdf(tier: PlanTier): boolean {
  return PLAN_LIMITS[tier].fullPdfExport;
}

export function canUseAdvancedHistory(tier: PlanTier): boolean {
  return PLAN_LIMITS[tier].advancedHistoryFilters;
}
