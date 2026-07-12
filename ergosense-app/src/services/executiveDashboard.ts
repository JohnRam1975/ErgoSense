/**
 * Módulo 14 — Dashboard executivo / BI
 */
import type { Analysis } from '../types';

export interface ExecutiveKpis {
  totalAvaliacoes: number;
  riscoAlto: number;
  riscoMedio: number;
  riscoBaixo: number;
  riscoCritico: number;
}

export interface RankingRow {
  name: string;
  count: number;
  avgScore: number;
  maxRisk: string;
}

export interface CorporateIntelligence {
  criticalAreas: RankingRow[];
  criticalActivities: RankingRow[];
  criticalFunctions: RankingRow[];
  exposedCollaborators: RankingRow[];
  injuryTrend: 'estavel' | 'subindo' | 'descendo';
  avgInjuryProbability: number;
  pendingActions: number;
  completedActions: number;
}

export interface ExecutiveDashboardData {
  kpis: ExecutiveKpis;
  rankingSetores: RankingRow[];
  rankingFuncoes: RankingRow[];
  rankingAtividades: RankingRow[];
  riskDistribution: { label: string; value: number }[];
  timeline: { date: string; count: number; avgScore: number }[];
  heatmap: { setor: string; atividade: string; score: number }[];
  intelligence: CorporateIntelligence;
  avgIere: number;
  avgIeci: number;
}

export function buildExecutiveDashboard(analyses: Analysis[]): ExecutiveDashboardData {
  const kpis: ExecutiveKpis = {
    totalAvaliacoes: analyses.length,
    riscoCritico: analyses.filter((a) => a.risk === 'critico').length,
    riscoAlto: analyses.filter((a) => a.risk === 'alto').length,
    riscoMedio: analyses.filter((a) => a.risk === 'medio').length,
    riscoBaixo: analyses.filter((a) => a.risk === 'baixo').length,
  };

  const byKey = (key: (a: Analysis) => string) => {
    const map = new Map<string, { count: number; sum: number; maxRisk: string }>();
    for (const a of analyses) {
      const k = key(a) || '—';
      const cur = map.get(k) ?? { count: 0, sum: 0, maxRisk: 'baixo' };
      cur.count++;
      cur.sum += a.score;
      const order = ['baixo', 'medio', 'alto', 'critico'];
      if (order.indexOf(a.risk) > order.indexOf(cur.maxRisk)) cur.maxRisk = a.risk;
      map.set(k, cur);
    }
    return [...map.entries()]
      .map(([name, v]) => ({
        name,
        count: v.count,
        avgScore: Math.round(v.sum / v.count),
        maxRisk: v.maxRisk,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  };

  const timelineMap = new Map<string, { count: number; sum: number }>();
  for (const a of analyses) {
    const t = timelineMap.get(a.date) ?? { count: 0, sum: 0 };
    t.count++;
    t.sum += a.score;
    timelineMap.set(a.date, t);
  }

  const heatmap = analyses.map((a) => ({
    setor: a.setor,
    atividade: a.activity,
    score: a.score,
  }));

  const iereValues = analyses
    .map((a) => a.nr17Report?.ergoIndices?.riskIndex)
    .filter((v): v is number => v != null);
  const ieciValues = analyses
    .map((a) => a.nr17Report?.ergoIndices?.internalConformityIndex)
    .filter((v): v is number => v != null);

  const avgIere = iereValues.length
    ? Math.round(iereValues.reduce((a, b) => a + b, 0) / iereValues.length)
    : 0;
  const avgIeci = ieciValues.length
    ? Math.round(ieciValues.reduce((a, b) => a + b, 0) / ieciValues.length)
    : 0;

  const criticalFilter = (rows: RankingRow[]) =>
    rows.filter((r) => r.maxRisk === 'alto' || r.maxRisk === 'critico').slice(0, 5);

  const timeline = [...timelineMap.entries()].map(([date, v]) => ({
    date,
    count: v.count,
    avgScore: Math.round(v.sum / v.count),
  }));

  let injuryTrend: CorporateIntelligence['injuryTrend'] = 'estavel';
  if (timeline.length >= 2) {
    const recent = timeline.slice(-3).reduce((s, t) => s + t.avgScore, 0) / Math.min(3, timeline.length);
    const older = timeline.slice(0, -3).reduce((s, t) => s + t.avgScore, 0) / Math.max(1, timeline.length - 3);
    if (recent > older + 5) injuryTrend = 'subindo';
    else if (recent < older - 5) injuryTrend = 'descendo';
  }

  const pendingActions = analyses.reduce(
    (s, a) => s + (a.aepDocument?.actionPlan.filter((p) => p.priority !== 'medio_prazo').length ?? 0),
    0,
  );

  return {
    kpis,
    rankingSetores: byKey((a) => a.setor),
    rankingFuncoes: byKey((a) => a.collaboratorName),
    rankingAtividades: byKey((a) => a.activity),
    riskDistribution: [
      { label: 'Baixo', value: kpis.riscoBaixo },
      { label: 'Médio', value: kpis.riscoMedio },
      { label: 'Alto', value: kpis.riscoAlto },
      { label: 'Crítico', value: kpis.riscoCritico },
    ],
    timeline,
    heatmap,
    avgIere,
    avgIeci,
    intelligence: {
      criticalAreas: criticalFilter(byKey((a) => a.setor)),
      criticalActivities: criticalFilter(byKey((a) => a.activity)),
      criticalFunctions: criticalFilter(byKey((a) => a.collaboratorName)),
      exposedCollaborators: byKey((a) => a.collaboratorName)
        .filter((r) => r.maxRisk === 'alto' || r.maxRisk === 'critico')
        .slice(0, 8),
      injuryTrend,
      avgInjuryProbability: Math.max(0, Math.round(100 - avgIere)),
      pendingActions,
      completedActions: 0,
    },
  };
}
