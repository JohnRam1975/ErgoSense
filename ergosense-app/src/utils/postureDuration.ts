import type { PostureRiskFlags } from './ergonomics';

/** Tempo máximo recomendado na mesma postura de risco (NR-17 / sobrecarga estática) */
export const POSTURE_DURATION_LIMITS = {
  atencaoSecs: 60,
  criticoSecs: 180,
  estaticoMaxSecs: 300,
} as const;

export type PostureDurationLevel = 'ok' | 'atencao' | 'critico';

export interface PostureDurationInfo {
  inRisk: boolean;
  streakSecs: number;
  totalRiskSecs: number;
  level: PostureDurationLevel;
  primaryRegions: string[];
  message: string;
}

const REGION_LABELS: Partial<Record<keyof PostureRiskFlags, string>> = {
  lombar: 'Lombar',
  dorso: 'Dorso',
  pescoco: 'Pescoço',
  ombroD: 'Ombro D',
  ombroE: 'Ombro E',
  cotoveloD: 'Cotovelo D',
  cotoveloE: 'Cotovelo E',
  maoD: 'Mão D',
  maoE: 'Mão E',
  quadril: 'Quadril',
  joelhoD: 'Joelho D',
  joelhoE: 'Joelho E',
  tornozeloD: 'Tornozelo D',
  tornozeloE: 'Tornozelo E',
  repeticao: 'Repetição',
  telaDistancia: 'Tela',
  telaAltura: 'Altura tela',
  luz: 'Iluminação',
  filtroAzul: 'Filtro azul',
};

const BODY_RISK_KEYS: (keyof PostureRiskFlags)[] = [
  'lombar',
  'dorso',
  'pescoco',
  'ombroD',
  'ombroE',
  'cotoveloD',
  'cotoveloE',
  'maoD',
  'maoE',
  'quadril',
  'joelhoD',
  'joelhoE',
  'tornozeloD',
  'tornozeloE',
  'repeticao',
];

function activeRegions(risks: PostureRiskFlags): string[] {
  return BODY_RISK_KEYS.filter((k) => risks[k]).map((k) => REGION_LABELS[k] ?? k);
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

function buildMessage(streakSecs: number, level: PostureDurationLevel, regions: string[]): string {
  const reg = regions.slice(0, 2).join(', ') || 'Postura';
  const t = formatDuration(streakSecs);
  if (level === 'critico') {
    return `${reg} em risco há ${t} — interrompa e corrija agora (lesão por postura estática)`;
  }
  if (level === 'atencao') {
    return `${reg} em risco há ${t} — ajuste a postura em breve`;
  }
  return 'Postura monitorada';
}

/** Rastreia tempo contínuo em postura de risco ergonômico */
export class PostureDurationTracker {
  private riskStart: number | null = null;
  private totalRiskSecs = 0;
  private lastTickMs = 0;
  private maxStreakSecs = 0;

  reset() {
    this.riskStart = null;
    this.totalRiskSecs = 0;
    this.lastTickMs = 0;
    this.maxStreakSecs = 0;
  }

  getMaxStreakSecs(): number {
    return this.maxStreakSecs;
  }

  getTotalRiskSecs(): number {
    return Math.floor(this.totalRiskSecs);
  }

  tick(risks: PostureRiskFlags, now = Date.now()): PostureDurationInfo {
    const inRisk = BODY_RISK_KEYS.some((k) => risks[k]);
    const dt = this.lastTickMs > 0 ? (now - this.lastTickMs) / 1000 : 0;
    this.lastTickMs = now;

    if (inRisk) {
      if (this.riskStart === null) this.riskStart = now;
      this.totalRiskSecs += dt;
    } else {
      this.riskStart = null;
    }

    const streakSecs = this.riskStart ? Math.floor((now - this.riskStart) / 1000) : 0;
    if (streakSecs > this.maxStreakSecs) this.maxStreakSecs = streakSecs;

    const regions = activeRegions(risks);
    let level: PostureDurationLevel = 'ok';
    if (streakSecs >= POSTURE_DURATION_LIMITS.criticoSecs) level = 'critico';
    else if (streakSecs >= POSTURE_DURATION_LIMITS.atencaoSecs) level = 'atencao';

    return {
      inRisk,
      streakSecs,
      totalRiskSecs: Math.floor(this.totalRiskSecs),
      level,
      primaryRegions: regions,
      message: inRisk ? buildMessage(streakSecs, level, regions) : 'Postura adequada',
    };
  }
}
