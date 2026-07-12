import type { JointAngles, RiskLevel } from '../types';
import type { WorkstationMetrics } from '../types/workstation';
import type { ActivityContext } from '../data/activityProfiles';
import { profileForContext } from '../data/activityProfiles';
import { POSTURE_DURATION_LIMITS } from './postureDuration';

/** Limiares baseados em RULA/REBA/NR17 — regiões com potencial de lesão ocupacional */
export const ERGONOMIC_LIMITS = {
  lombar: { risk: 20, critical: 30 },
  dorso: { risk: 25, critical: 35 },
  pescoco: { risk: 20, critical: 25 },
  ombro: { risk: 90, critical: 120 },
  cotovelo: { min: 60, max: 100 },
  mao: { risk: 150, critical: 165 },
  quadril: { risk: 85, critical: 70 },
  joelho: { min: 75, max: 170 },
  tornozelo: { min: 75, max: 115 },
  repeticao: { risk: 5 },
  tela: { distMin: 50, distMax: 75, luxMin: 300, luxMax: 750, azulMax: 50 },
} as const;

export type PostureRiskFlags = {
  lombar: boolean;
  dorso: boolean;
  pescoco: boolean;
  ombroD: boolean;
  ombroE: boolean;
  cotoveloD: boolean;
  cotoveloE: boolean;
  maoD: boolean;
  maoE: boolean;
  quadril: boolean;
  joelhoD: boolean;
  joelhoE: boolean;
  tornozeloD: boolean;
  tornozeloE: boolean;
  repeticao: boolean;
  telaDistancia: boolean;
  telaAltura: boolean;
  luz: boolean;
  filtroAzul: boolean;
};

export type ErgonomicRecommendation = {
  id: string;
  icon: string;
  title: string;
  detail: string;
  priority: 'alta' | 'media';
};

/** Identifica regiões corporais e do posto em risco ergonômico */
export function assessPostureRisks(
  angles: JointAngles,
  workstation?: WorkstationMetrics | null,
  activityContext?: ActivityContext | null,
): PostureRiskFlags {
  const profile = activityContext ? profileForContext(activityContext) : null;
  const assessVisual = profile?.assessVisualDisplay ?? false;
  const ombroE = angles.ombroE ?? 0;
  const cotoveloE = angles.cotoveloE ?? 0;
  const maoE = angles.maoE ?? 0;
  const joelhoE = angles.joelhoE ?? 0;
  const tornozeloE = angles.tornozeloE ?? 0;
  const ws = workstation;

  return {
    lombar: angles.lombar >= ERGONOMIC_LIMITS.lombar.risk,
    dorso: angles.dorso >= ERGONOMIC_LIMITS.dorso.risk,
    pescoco: angles.pescoco >= ERGONOMIC_LIMITS.pescoco.risk,
    ombroD: angles.ombroD >= ERGONOMIC_LIMITS.ombro.risk,
    ombroE: ombroE >= ERGONOMIC_LIMITS.ombro.risk,
    cotoveloD: angles.cotovelo < ERGONOMIC_LIMITS.cotovelo.min || angles.cotovelo > ERGONOMIC_LIMITS.cotovelo.max,
    cotoveloE: cotoveloE > 0 && (cotoveloE < ERGONOMIC_LIMITS.cotovelo.min || cotoveloE > ERGONOMIC_LIMITS.cotovelo.max),
    maoD: angles.maoD >= ERGONOMIC_LIMITS.mao.risk,
    maoE: maoE >= ERGONOMIC_LIMITS.mao.risk,
    quadril: angles.quadril > 0 && angles.quadril <= ERGONOMIC_LIMITS.quadril.risk,
    joelhoD:
      angles.joelhoD > 0 &&
      (angles.joelhoD < ERGONOMIC_LIMITS.joelho.min || angles.joelhoD > ERGONOMIC_LIMITS.joelho.max),
    joelhoE:
      joelhoE > 0 && (joelhoE < ERGONOMIC_LIMITS.joelho.min || joelhoE > ERGONOMIC_LIMITS.joelho.max),
    tornozeloD:
      angles.tornozeloD > 0 &&
      (angles.tornozeloD < ERGONOMIC_LIMITS.tornozelo.min || angles.tornozeloD > ERGONOMIC_LIMITS.tornozelo.max),
    tornozeloE:
      tornozeloE > 0 &&
      (tornozeloE < ERGONOMIC_LIMITS.tornozelo.min || tornozeloE > ERGONOMIC_LIMITS.tornozelo.max),
    repeticao: angles.repeticao >= ERGONOMIC_LIMITS.repeticao.risk,
    telaDistancia: assessVisual && ws
      ? ws.telaDistanciaCm < ERGONOMIC_LIMITS.tela.distMin || ws.telaDistanciaCm > ERGONOMIC_LIMITS.tela.distMax
      : false,
    telaAltura: assessVisual && ws ? ws.telaAltura !== 'ideal' : false,
    luz: ws ? ws.nivelLuz !== 'adequado' : false,
    filtroAzul: assessVisual && ws ? ws.filtroTela === 'sem_filtro' || ws.indiceAzul >= ERGONOMIC_LIMITS.tela.azulMax : false,
  };
}

export function hasPostureRisk(risks: PostureRiskFlags): boolean {
  return Object.values(risks).some(Boolean);
}

export function countPostureRisks(
  angles: JointAngles,
  workstation?: WorkstationMetrics | null,
  activityContext?: ActivityContext | null,
): number {
  return Object.values(assessPostureRisks(angles, workstation, activityContext)).filter(Boolean).length;
}

/** Mensagens de alerta por região em risco */
export function postureRiskAlerts(
  angles: JointAngles,
  workstation?: WorkstationMetrics | null,
  activityContext?: ActivityContext | null,
): { id: string; label: string }[] {
  const r = assessPostureRisks(angles, workstation, activityContext);
  const alerts: { id: string; label: string }[] = [];
  if (r.lombar) alerts.push({ id: 'lombar', label: 'Coluna lombar — risco de hérnia e dor crônica' });
  if (r.dorso) alerts.push({ id: 'dorso', label: 'Dorso curvado — sobrecarga torácica e dorsalgia' });
  if (r.pescoco) alerts.push({ id: 'pescoco', label: 'Pescoço inclinado — tensão cervical e LER' });
  if (r.ombroD) alerts.push({ id: 'ombroD', label: 'Ombro direito elevado — tendinite e bursite' });
  if (r.ombroE) alerts.push({ id: 'ombroE', label: 'Ombro esquerdo elevado — tendinite e bursite' });
  if (r.maoD) alerts.push({ id: 'maoD', label: 'Mão direita — desvio de punho e túnel do carpo' });
  if (r.maoE) alerts.push({ id: 'maoE', label: 'Mão esquerda — desvio de punho e túnel do carpo' });
  if (r.quadril) alerts.push({ id: 'quadril', label: 'Quadril flexionado — sobrecarga e rigidez' });
  if (r.joelhoD) alerts.push({ id: 'joelhoD', label: 'Joelho direito — lesão meniscal e ligamentos' });
  if (r.joelhoE) alerts.push({ id: 'joelhoE', label: 'Joelho esquerdo — lesão meniscal e ligamentos' });
  if (r.tornozeloD) alerts.push({ id: 'tornozeloD', label: 'Tornozelo direito — tendinite e fascite' });
  if (r.tornozeloE) alerts.push({ id: 'tornozeloE', label: 'Tornozelo esquerdo — tendinite e fascite' });
  if (r.cotoveloD) alerts.push({ id: 'cotoveloD', label: 'Cotovelo direito — epicondilite' });
  if (r.cotoveloE) alerts.push({ id: 'cotoveloE', label: 'Cotovelo esquerdo — epicondilite' });
  if (r.repeticao) alerts.push({ id: 'repeticao', label: 'Movimento repetitivo — risco de LER/DORT' });
  if (r.telaDistancia) alerts.push({ id: 'tela', label: 'Distância da tela inadequada (ideal: 50–70 cm)' });
  if (r.telaAltura) alerts.push({ id: 'telaAlt', label: 'Altura do monitor fora do nível dos olhos' });
  if (r.luz) alerts.push({ id: 'luz', label: 'Iluminação inadequada — fadiga visual' });
  if (r.filtroAzul) alerts.push({ id: 'filtro', label: 'Excesso de luz azul — ative filtro noturno' });
  return alerts;
}

/** Sugestões de correção personalizadas */
export function generateRecommendations(
  angles: JointAngles,
  workstation?: WorkstationMetrics | null,
  durationSecs?: number,
  activityContext?: ActivityContext | null,
): ErgonomicRecommendation[] {
  const profile = activityContext ? profileForContext(activityContext) : null;
  const assessVisual = profile?.assessVisualDisplay ?? false;
  const r = assessPostureRisks(angles, workstation, activityContext);
  const list: ErgonomicRecommendation[] = [];

  if (r.lombar) {
    list.push({
      id: 'fix-lombar',
      icon: '🦴',
      title: 'Corrigir inclinação lombar',
      detail: profile?.fieldOrPhysical
        ? 'Reduza flexão da coluna: aproxime carga do corpo, use ajudas mecânicas e alterne tarefas.'
        : 'Ajuste a cadeira e aproxime o tronco do encosto. Mantenha a curva lombar apoiada.',
      priority: 'alta',
    });
  }
  if (r.dorso) {
    list.push({
      id: 'fix-dorso',
      icon: '📐',
      title: 'Endireitar o dorso (tórax)',
      detail: 'Abra o peito, recue os ombros e evite cifose. O topo da cabeça deve alinhar-se à coluna.',
      priority: 'alta',
    });
  }
  if (r.pescoco) {
    list.push({
      id: 'fix-pescoco',
      icon: '🧑',
      title: 'Neutro no pescoço',
      detail: 'Eleve o monitor para que o olhar caia 15–20° abaixo da horizontal. Evite inclinar a cabeça.',
      priority: 'alta',
    });
  }
  if (r.ombroD || r.ombroE) {
    list.push({
      id: 'fix-ombro',
      icon: '💪',
      title: 'Relaxar os ombros',
      detail: 'Mantenha os braços ao lado do corpo. Use apoio para antebraços e ajuste altura da mesa.',
      priority: 'alta',
    });
  }
  if (r.maoD || r.maoE) {
    list.push({
      id: 'fix-mao',
      icon: '✋',
      title: 'Posição neutra das mãos',
      detail: 'Punhos retos ao teclado. Use teclado inclinado negativo e mouse ergonômico.',
      priority: 'alta',
    });
  }
  if (r.quadril) {
    list.push({
      id: 'fix-quadril',
      icon: '🦵',
      title: 'Ajustar flexão do quadril',
      detail: profile?.fieldOrPhysical
        ? 'Evite agachamento prolongado e torções com carga. Alterne posturas e use ajudas mecânicas.'
        : 'Evite agachar ou sentar com quadril muito fechado por longos períodos. Alterne posturas a cada 20–30 min.',
      priority: 'alta',
    });
  }
  if (r.joelhoD || r.joelhoE) {
    list.push({
      id: 'fix-joelho',
      icon: '🦿',
      title: 'Proteger os joelhos',
      detail: 'Evite flexão extrema ou joelhos travados. Mantenha ângulo ~90–120° ao sentar.',
      priority: 'alta',
    });
  }
  if (r.tornozeloD || r.tornozeloE) {
    list.push({
      id: 'fix-tornozelo',
      icon: '👣',
      title: 'Posição dos tornozelos',
      detail: 'Apoie os pés no chão. Evite ficar na ponta dos pés ou com tornozelos muito flexionados.',
      priority: 'media',
    });
  }
  if (r.cotoveloD || r.cotoveloE) {
    list.push({
      id: 'fix-cotovelo',
      icon: '🦾',
      title: 'Cotovelos a ~90°',
      detail: 'Ajuste a altura da cadeira para cotovelos na altura da mesa, formando ângulo de 90–100°.',
      priority: 'media',
    });
  }
  if (assessVisual && r.telaDistancia && workstation) {
    const d = workstation.telaDistanciaCm;
    list.push({
      id: 'fix-dist',
      icon: '🖥️',
      title: d < 50 ? 'Afaste-se da tela' : 'Aproxime-se da tela',
      detail: `Distância atual ~${d} cm. NR-17 recomenda 50–70 cm entre os olhos e o monitor.`,
      priority: 'alta',
    });
  }
  if (assessVisual && r.telaAltura && workstation) {
    list.push({
      id: 'fix-alt',
      icon: '📺',
      title: workstation.telaAltura === 'baixa' ? 'Elevar o monitor' : 'Baixar o monitor',
      detail: 'O topo da tela deve estar na altura dos olhos ou até 5 cm abaixo.',
      priority: 'alta',
    });
  }
  if (r.luz && workstation) {
    list.push({
      id: 'fix-luz',
      icon: '💡',
      title: workstation.nivelLuz === 'baixo' ? 'Aumentar iluminação' : 'Reduzir reflexos e brilho',
      detail: `Luz estimada ~${workstation.lux} lux. Ideal para escritório: 300–500 lux sem reflexo na tela.`,
      priority: 'media',
    });
  }
  if (assessVisual && r.filtroAzul && workstation) {
    list.push({
      id: 'fix-filtro',
      icon: '🌙',
      title: 'Ativar filtro de luz azul',
      detail: `Índice azul ${workstation.indiceAzul}%. Ative modo noturno, Night Shift ou filtro ≥30% no sistema.`,
      priority: 'media',
    });
  }
  if (r.repeticao) {
    list.push({
      id: 'fix-rep',
      icon: '⏱️',
      title: 'Pausas para movimentos repetitivos',
      detail: 'A cada 30 min, faça pausa de 2–3 min: alongue punhos, ombros e pescoço.',
      priority: 'media',
    });
  }
  if (durationSecs !== undefined && durationSecs >= POSTURE_DURATION_LIMITS.atencaoSecs) {
    const m = Math.floor(durationSecs / 60);
    const s = durationSecs % 60;
    const t = m > 0 ? `${m} min ${s} s` : `${s} segundos`;
    list.unshift({
      id: 'fix-tempo',
      icon: '⏱️',
      title: 'Tempo excessivo na mesma postura',
      detail: `Você manteve postura de risco por ${t}. Levante-se, alongue e mude de posição agora (NR-17: máx. 3–5 min estático).`,
      priority: durationSecs >= POSTURE_DURATION_LIMITS.criticoSecs ? 'alta' : 'media',
    });
  }
  if (profile?.id === 'motorista' && (r.lombar || r.pescoco)) {
    list.push({
      id: 'fix-motorista',
      icon: '🚛',
      title: 'Ajuste da cabine / assento',
      detail: 'Regule assento, encosto lombar e espelhos. Faça pausas a cada 2 h para alongamento.',
      priority: 'alta',
    });
  }
  if (list.length === 0) {
    list.push({
      id: 'ok',
      icon: '✅',
      title: 'Postura e posto adequados',
      detail: 'Continue monitorando. Faça micro-pausas a cada hora.',
      priority: 'media',
    });
  }
  return list;
}

export function riskHudColor(atRisk: boolean, safeColor: string): string {
  return atRisk ? 'var(--red)' : safeColor;
}

export function scoreFromAngles(
  angles: JointAngles,
  workstation?: WorkstationMetrics | null,
  activityContext?: ActivityContext | null,
): number {
  let score = 0;
  if (angles.lombar > 30) score += 28;
  else if (angles.lombar > 20) score += 18;
  else if (angles.lombar > 10) score += 8;

  if (angles.dorso > 35) score += 18;
  else if (angles.dorso > 25) score += 10;

  if (angles.ombroD > 120) score += 22;
  else if (angles.ombroD > 90) score += 14;
  else if (angles.ombroD > 60) score += 6;

  if (angles.pescoco > 25) score += 10;
  else if (angles.pescoco > 15) score += 5;

  if (angles.cotovelo < 60 || angles.cotovelo > 100) score += 6;
  if (angles.maoD >= ERGONOMIC_LIMITS.mao.risk) score += 8;
  if ((angles.maoE ?? 0) >= ERGONOMIC_LIMITS.mao.risk) score += 8;
  if (angles.quadril > 0 && angles.quadril <= ERGONOMIC_LIMITS.quadril.risk) score += 10;
  if (angles.joelhoD > 0 && (angles.joelhoD < ERGONOMIC_LIMITS.joelho.min || angles.joelhoD > ERGONOMIC_LIMITS.joelho.max))
    score += 8;
  if (
    (angles.tornozeloD ?? 0) > 0 &&
    (angles.tornozeloD < ERGONOMIC_LIMITS.tornozelo.min || angles.tornozeloD > ERGONOMIC_LIMITS.tornozelo.max)
  )
    score += 6;

  score += Math.min(angles.repeticao * 2, 12);

  const r = assessPostureRisks(angles, workstation, activityContext);
  const assessVisual = activityContext ? profileForContext(activityContext).assessVisualDisplay : false;
  if (assessVisual && (r.telaDistancia || r.telaAltura)) score += 8;
  if (r.luz) score += 6;
  if (assessVisual && r.filtroAzul) score += 5;

  return Math.min(Math.max(score, 5), 99);
}

export function riskFromScore(score: number): RiskLevel {
  if (score >= 75) return 'critico';
  if (score >= 55) return 'alto';
  if (score >= 35) return 'medio';
  return 'baixo';
}

export function rulaFromAngles(angles: JointAngles): number {
  let rula = 1;
  if (angles.ombroD > 90) rula += 2;
  else if (angles.ombroD > 60) rula += 1;
  if (angles.cotovelo < 60 || angles.cotovelo > 100) rula += 1;
  if (angles.pescoco > 20) rula += 1;
  if (angles.lombar > 20) rula += 2;
  return Math.min(rula, 7);
}

export function rebaFromAngles(angles: JointAngles): number {
  let reba = 1;
  if (angles.lombar > 30) reba += 4;
  else if (angles.lombar > 20) reba += 2;
  if (angles.ombroD > 120) reba += 3;
  else if (angles.ombroD > 90) reba += 2;
  if (angles.pescoco > 25) reba += 1;
  reba += Math.min(Math.floor(angles.repeticao / 3), 3);
  return Math.min(reba, 15);
}

export function simulateLiveAngles(base: JointAngles, tick: number): JointAngles {
  const wave = (n: number, amp: number) => n + Math.sin(tick * 0.4) * amp;
  return {
    lombar: Math.round(wave(base.lombar, 3)),
    dorso: Math.round(wave(base.dorso ?? 28, 4)),
    ombroD: Math.round(wave(base.ombroD, 5)),
    pescoco: Math.round(wave(base.pescoco, 2)),
    cotovelo: Math.round(wave(base.cotovelo, 4)),
    maoD: Math.round(wave(base.maoD ?? 140, 6)),
    quadril: Math.round(wave(base.quadril ?? 95, 5)),
    joelhoD: Math.round(wave(base.joelhoD ?? 110, 8)),
    tornozeloD: Math.round(wave(base.tornozeloD ?? 95, 6)),
    repeticao: base.repeticao,
  };
}

export function riskLabel(risk: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    critico: 'Crítico',
    alto: 'Alto',
    medio: 'Médio',
    baixo: 'Baixo',
  };
  return map[risk];
}

export function riskBadgeClass(risk: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    critico: 'bc',
    alto: 'bh',
    medio: 'bm',
    baixo: 'bl',
  };
  return map[risk];
}

export function formatDateBR(d = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatTimeBR(d = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDateShortBR(d = new Date()): string {
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
