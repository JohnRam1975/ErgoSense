import type { JointAngles } from '../types';
import type { WorkstationMetrics } from '../types/workstation';
import type { ActivityContext } from '../data/activityProfiles';
import { contextLabel, profileForContext } from '../data/activityProfiles';
import {
  assessPostureRisks,
  generateRecommendations,
  hasPostureRisk,
  scoreFromAngles,
  type PostureRiskFlags,
} from './ergonomics';
import { POSTURE_DURATION_LIMITS } from './postureDuration';
import type { LoadRiskResult } from './loadHandling';
import { LOAD_DISTANCE_OPTIMAL_CM } from './loadHandling';
import type { LoadEffortResult } from './calculateErgonomicLoadRisk';
import { riskLevelLabelPt } from './ergonomicRiskEngine';
import { calculateErgoSenseIndices, type ErgoSenseIndices } from './ergoIndices';
import { evaluateSamplingConfidence, type SamplingConfidenceResult } from './samplingConfidence';

/** Referência estatística para confiança da amostragem — não impõe limite de captura na câmera. */
export const ANALYSIS_SESSION_DURATION_SECS = 120;

export type Nr17ComplianceStatus = 'conforme' | 'atencao' | 'nao_conforme';

export type Nr17ComplianceItem = {
  id: string;
  referencia: string;
  titulo: string;
  status: Nr17ComplianceStatus;
  detalhe: string;
};

export type Nr17SessionReport = {
  generatedAt: string;
  sessionDurationSecs: number;
  sampleCount: number;
  /** @deprecated Use ergoIndices.internalConformityIndex — não é percentual legal NR-17 */
  complianceScore: number;
  /** Índices ErgoSense proprietários (apoio AEP/AET) */
  ergoIndices: ErgoSenseIndices;
  /** Confiabilidade estatística da amostragem */
  samplingConfidence: SamplingConfidenceResult;
  overallStatus: Nr17ComplianceStatus;
  riskTimePct: number;
  summary: string;
  items: Nr17ComplianceItem[];
  regionsMostAffected: string[];
  recommendations: ReturnType<typeof generateRecommendations>;
};

function mean(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round(n: number): number {
  return Math.round(n);
}

/** Média dos ângulos coletados durante a sessão (representa a postura habitual) */
export function aggregateSessionAngles(samples: JointAngles[]): JointAngles {
  if (!samples.length) {
    return {
      lombar: 0,
      dorso: 0,
      ombroD: 0,
      pescoco: 0,
      cotovelo: 0,
      maoD: 0,
      quadril: 0,
      joelhoD: 0,
      tornozeloD: 0,
      repeticao: 0,
    };
  }

  const avg = (fn: (a: JointAngles) => number) => round(mean(samples.map(fn)));

  return {
    lombar: avg((a) => a.lombar),
    dorso: avg((a) => a.dorso),
    ombroD: avg((a) => a.ombroD),
    ombroE: avg((a) => a.ombroE ?? 0),
    pescoco: avg((a) => a.pescoco),
    cotovelo: avg((a) => a.cotovelo),
    cotoveloE: avg((a) => a.cotoveloE ?? 0),
    maoD: avg((a) => a.maoD),
    maoE: avg((a) => a.maoE ?? 0),
    quadril: avg((a) => a.quadril),
    joelhoD: avg((a) => a.joelhoD),
    joelhoE: avg((a) => a.joelhoE ?? 0),
    tornozeloD: avg((a) => a.tornozeloD),
    tornozeloE: avg((a) => a.tornozeloE ?? 0),
    repeticao: Math.max(...samples.map((s) => s.repeticao ?? 0)),
  };
}

export function aggregateSessionWorkstation(samples: WorkstationMetrics[]): WorkstationMetrics | undefined {
  if (!samples.length) return undefined;
  const dist = round(mean(samples.map((s) => s.telaDistanciaCm)));
  const lux = round(mean(samples.map((s) => s.lux)));
  const azul = round(mean(samples.map((s) => s.indiceAzul)));

  const mode = <T extends string>(vals: T[]): T => {
    const counts = new Map<T, number>();
    vals.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };

  return {
    telaDistanciaCm: dist,
    telaAltura: mode(samples.map((s) => s.telaAltura)),
    lux,
    nivelLuz: mode(samples.map((s) => s.nivelLuz)),
    indiceAzul: azul,
    filtroTela: mode(samples.map((s) => s.filtroTela)),
  };
}

function statusFromRisk(atRisk: boolean, critical = false): Nr17ComplianceStatus {
  if (critical) return 'nao_conforme';
  if (atRisk) return 'atencao';
  return 'conforme';
}

function bodyRegionsFromRisks(r: PostureRiskFlags): string[] {
  const map: [keyof PostureRiskFlags, string][] = [
    ['lombar', 'Coluna lombar'],
    ['dorso', 'Dorso'],
    ['pescoco', 'Pescoço'],
    ['ombroD', 'Ombro direito'],
    ['ombroE', 'Ombro esquerdo'],
    ['cotoveloD', 'Cotovelo direito'],
    ['cotoveloE', 'Cotovelo esquerdo'],
    ['maoD', 'Mão direita'],
    ['maoE', 'Mão esquerda'],
    ['quadril', 'Quadril'],
    ['joelhoD', 'Joelho direito'],
    ['joelhoE', 'Joelho esquerdo'],
    ['repeticao', 'Movimentos repetitivos'],
  ];
  return map.filter(([k]) => r[k]).map(([, label]) => label);
}

/** Relatório de conformidade NR-17 com base na sessão de leitura ergonômica */
export function buildNr17SessionReport(params: {
  angles: JointAngles;
  workstation?: WorkstationMetrics | null;
  sessionDurationSecs: number;
  sampleCount: number;
  maxRiskStreakSecs: number;
  totalRiskSecs: number;
  activityContext?: ActivityContext | null;
  activity?: string;
  loadResult?: LoadRiskResult | null;
  loadEffort?: LoadEffortResult | null;
  nioshLi?: number | null;
  rula?: number;
  reba?: number;
}): Nr17SessionReport {
  const {
    angles,
    workstation,
    sessionDurationSecs,
    sampleCount,
    maxRiskStreakSecs,
    totalRiskSecs,
    activityContext,
    activity,
    loadResult,
    loadEffort,
  } = params;
  const profile = activityContext ? profileForContext(activityContext) : null;
  const assessVisual = profile?.assessVisualDisplay ?? false;
  const risks = assessPostureRisks(angles, workstation, activityContext);
  const riskTimePct =
    sessionDurationSecs > 0 ? Math.min(100, Math.round((totalRiskSecs / sessionDurationSecs) * 100)) : 0;

  const colunaCritica = risks.lombar || risks.dorso || risks.pescoco;
  const membrosSup = risks.ombroD || risks.ombroE || risks.cotoveloD || risks.cotoveloE || risks.maoD || risks.maoE;
  const membrosInf = risks.quadril || risks.joelhoD || risks.joelhoE || risks.tornozeloD || risks.tornozeloE;
  const tempoEstaticoCritico = maxRiskStreakSecs >= POSTURE_DURATION_LIMITS.criticoSecs;
  const tempoEstaticoAtencao =
    maxRiskStreakSecs >= POSTURE_DURATION_LIMITS.atencaoSecs || riskTimePct >= 25;

  const contextNote = profile
    ? `Contexto: ${profile.label}${activity ? ` · ${activity}` : ''}.`
    : '';

  const items: Nr17ComplianceItem[] = [
    {
      id: 'contexto',
      referencia: 'NR-17 · avaliação ergonômica',
      titulo: 'Tipo de atividade avaliada',
      status: 'conforme',
      detalhe: contextNote || 'Avaliação postural geral conforme NR-17.',
    },
    {
      id: 'postura-coluna',
      referencia: 'NR-17 · Anexo II (posturas)',
      titulo: 'Coluna vertebral (lombar, dorso e pescoço)',
      status: statusFromRisk(colunaCritica, risks.lombar && angles.lombar >= 30),
      detalhe: colunaCritica
        ? `Inclinações fora do neutro: lombar ${angles.lombar}°, dorso ${angles.dorso}°, pescoço ${angles.pescoco}°. ${profile?.fieldOrPhysical ? 'Revise técnicas de movimento e carga.' : 'Ajuste posto e mobiliário.'}`
        : 'Curvaturas dentro dos limites observados na sessão.',
    },
    {
      id: 'membros-superiores',
      referencia: 'NR-17 · 17.3.2 (mobiliário e equipamentos)',
      titulo: 'Membros superiores (ombros, cotovelos e punhos)',
      status: statusFromRisk(membrosSup),
      detalhe: membrosSup
        ? profile?.fieldOrPhysical
          ? 'Elevação de ombros, punho ou cotovelo em posição de esforço. Revise ferramentas, altura de trabalho e pausas.'
          : 'Elevação de ombros, flexão de cotovelo ou desvio de punho detectados. Use apoios e altura de mesa adequada.'
        : 'Braços e punhos em faixa ergonômica durante a leitura.',
    },
    {
      id: 'membros-inferiores',
      referencia: 'NR-17 · Anexo II (posturas)',
      titulo: profile?.sedentary && !profile.fieldOrPhysical ? 'Membros inferiores e assento' : 'Membros inferiores e base de apoio',
      status: statusFromRisk(membrosInf),
      detalhe: membrosInf
        ? profile?.fieldOrPhysical
          ? 'Quadril, joelhos ou tornozelos sobrecarregados — comum em campo, obra e montagem. Alterne posturas e use EPI.'
          : 'Quadril, joelhos ou tornozelos em posição de sobrecarga. Ajuste cadeira e apoio dos pés.'
        : profile?.fieldOrPhysical
          ? 'Postura de membros inferiores adequada para atividade em pé / deslocamento.'
          : 'Flexões compatíveis com a atividade observada.',
    },
  ];

  if (assessVisual) {
    items.push(
      {
        id: 'tela-distancia',
        referencia: 'NR-17 · condições de conforto (visual)',
        titulo: 'Distância olhos–tela (50–70 cm)',
        status: statusFromRisk(risks.telaDistancia),
        detalhe: workstation
          ? `Distância média ~${workstation.telaDistanciaCm} cm na sessão.`
          : 'Distância não avaliada.',
      },
      {
        id: 'tela-altura',
        referencia: 'NR-17 · mobiliário',
        titulo: 'Altura do monitor (nível dos olhos)',
        status: statusFromRisk(risks.telaAltura),
        detalhe: workstation
          ? `Monitor: ${workstation.telaAltura === 'ideal' ? 'adequado' : workstation.telaAltura === 'baixa' ? 'baixo' : 'alto'}.`
          : 'Altura do monitor não avaliada.',
      },
      {
        id: 'conforto-visual',
        referencia: 'NR-17 · conforto visual',
        titulo: 'Conforto visual (luz azul / filtro)',
        status: statusFromRisk(risks.filtroAzul),
        detalhe: workstation
          ? `Índice azul ~${workstation.indiceAzul}% · filtro ${workstation.filtroTela.replace('_', ' ')}.`
          : 'Filtro de tela não avaliado.',
      },
    );
  }

  items.push(
    {
      id: 'iluminacao',
      referencia: 'NR-17 · 17.3.3 (condições ambientais)',
      titulo: 'Iluminação do posto de trabalho',
      status: statusFromRisk(risks.luz),
      detalhe: workstation
        ? `Iluminação ~${workstation.lux} lux (${workstation.nivelLuz}). ${profile?.fieldOrPhysical ? 'Referência campo/industrial: adequada à tarefa, sem ofuscamento.' : 'Referência escritório: 300–500 lux.'}`
        : 'Iluminação não avaliada pela câmera.',
    },
    {
      id: 'tempo-estatico',
      referencia: 'NR-17 · 17.4.1 (organização do trabalho)',
      titulo: 'Tempo em postura estática de risco',
      status: statusFromRisk(tempoEstaticoAtencao, tempoEstaticoCritico),
      detalhe: `Máximo contínuo: ${formatSecs(maxRiskStreakSecs)} · ${riskTimePct}% da sessão em risco. NR-17: pausas e alternância de tarefas.`,
    },
    {
      id: 'mov-repetitivo',
      referencia: 'NR-17 · organização do trabalho',
      titulo: 'Movimentos repetitivos',
      status: statusFromRisk(risks.repeticao),
      detalhe: risks.repeticao
        ? 'Padrão repetitivo elevado — prever pausas e rodízio (montagem, solda, digitação, condução).'
        : 'Repetitividade dentro do observado na sessão.',
    },
  );

  if (profile?.id === 'motorista') {
    items.push({
      id: 'motorista-cabine',
      referencia: 'NR-17 · posturas prolongadas',
      titulo: 'Postura na cabine / assento veicular',
      status: statusFromRisk(risks.lombar || risks.pescoco || risks.quadril),
      detalhe: 'Avalie ajuste de assento, vibração e pausas durante jornada de condução.',
    });
  }

  if (profile?.fieldOrPhysical && profile.id !== 'motorista') {
    items.push({
      id: 'atividade-fisica',
      referencia: 'NR-17 · levantamento e postura',
      titulo: 'Esforço físico e posturas de campo',
      status: statusFromRisk(risks.lombar || risks.quadril || risks.joelhoD || risks.joelhoE),
      detalhe: 'Atividades de campo, obra, montagem ou industrial — priorize técnicas seguras e ajudas mecânicas.',
    });
  }

  if (loadEffort) {
    const crit = loadEffort.risk === 'critico' || loadEffort.risk === 'alto';
    const aten = loadEffort.risk === 'medio';
    items.push({
      id: 'peso-distancia-indice',
      referencia: 'ErgoSense · relação peso × distância',
      titulo: 'Distância da carga ao corpo e peso do objeto',
      status: crit ? 'nao_conforme' : aten ? 'atencao' : 'conforme',
      detalhe:
        `Peso da carga: ${loadEffort.weightKg} kg. ` +
        `Distância da carga ao corpo: ${loadEffort.distanceCm} cm (${loadEffort.distanceM} m). ` +
        `Índice de esforço (peso × distância): ${loadEffort.indiceEsforco}. ` +
        `Classificação: ${riskLevelLabelPt(loadEffort.risk)}. ${loadEffort.recomendacao}`,
    });
  }

  if (loadResult) {
    const cargaCritica = loadResult.risk === 'critico' || loadResult.risk === 'alto';
    const cargaAtencao = loadResult.risk === 'medio';
    items.push({
      id: 'movimentacao-carga',
      referencia: 'NR-17 · movimentação manual · NIOSH simplificado',
      titulo: 'Peso, distância da carga ao tronco e esforço lombar',
      status: cargaCritica ? 'nao_conforme' : cargaAtencao ? 'atencao' : 'conforme',
      detalhe:
        loadResult.justificativa.slice(0, 3).join(' ') ||
        `Score de carga ${loadResult.score}/100. Distância utilizada: ${loadResult.distanceCmUsed} cm (ideal ≤${LOAD_DISTANCE_OPTIMAL_CM} cm).`,
    });
  }

  const scorableItems = items.filter((i) => i.id !== 'contexto');
  const naoConformes = scorableItems.filter((i) => i.status === 'nao_conforme').length;
  const atencao = scorableItems.filter((i) => i.status === 'atencao').length;
  const ergoScore = scoreFromAngles(angles, workstation, activityContext);
  const ergoIndices = calculateErgoSenseIndices({
    ergoScore,
    rula: params.rula ?? 0,
    reba: params.reba ?? 0,
    riskTimePct,
    maxRiskStreakSecs,
    items,
    loadResult,
    loadEffort,
    nioshLi: params.nioshLi ?? null,
  });
  const samplingConfidence = evaluateSamplingConfidence(sessionDurationSecs, sampleCount);
  const complianceScore = ergoIndices.internalConformityIndex;

  let overallStatus: Nr17ComplianceStatus = 'conforme';
  if (naoConformes > 0 || riskTimePct >= 40 || tempoEstaticoCritico) overallStatus = 'nao_conforme';
  else if (atencao > 0 || hasPostureRisk(risks) || riskTimePct >= 15) overallStatus = 'atencao';

  const regionsMostAffected = bodyRegionsFromRisks(risks);
  const postureRecs = generateRecommendations(angles, workstation, maxRiskStreakSecs, activityContext);
  const loadRecs =
    loadResult?.recomendacoes.map((r) => ({
      id: r.id,
      icon: r.prioridade === 'alta' ? '⚠️' : '📦',
      title: r.titulo,
      detail: r.detalhe,
      priority: r.prioridade,
    })) ?? [];
  const recommendations = [...loadRecs, ...postureRecs];

  const ctxLabel = activityContext ? contextLabel(activityContext) : 'geral';
  const loadNote = loadEffort
    ? ` Carga: ${loadEffort.weightKg} kg a ${loadEffort.distanceCm} cm do corpo — índice ${loadEffort.indiceEsforco} (${riskLevelLabelPt(loadEffort.risk)}).`
    : loadResult
      ? ` Carga: risco ${loadResult.risk}, distância ${loadResult.distanceCmUsed} cm, limite NIOSH ${loadResult.pesoLimiteKg} kg.`
      : '';
  const summary =
    overallStatus === 'conforme'
      ? `Sessão de ${formatSecs(sessionDurationSecs)} (${ctxLabel}): postura compatível com NR-17 na maior parte do tempo.${loadNote}`
      : overallStatus === 'atencao'
        ? `Sessão ${ctxLabel}: atenção em ${regionsMostAffected.slice(0, 3).join(', ') || 'postura'}. Ajustes recomendados.${loadNote}`
        : `Sessão ${ctxLabel}: não conformidades ergonômicas — ação corretiva prioritária (NR-17).${loadNote}`;

  return {
    generatedAt: new Date().toISOString(),
    sessionDurationSecs,
    sampleCount,
    complianceScore,
    ergoIndices,
    samplingConfidence,
    overallStatus,
    riskTimePct,
    summary,
    items,
    regionsMostAffected,
    recommendations,
  };
}

function formatSecs(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

export function nr17StatusLabel(status: Nr17ComplianceStatus): string {
  const map: Record<Nr17ComplianceStatus, string> = {
    conforme: 'Conforme',
    atencao: 'Atenção',
    nao_conforme: 'Não conforme',
  };
  return map[status];
}

export function nr17StatusClass(status: Nr17ComplianceStatus): string {
  const map: Record<Nr17ComplianceStatus, string> = {
    conforme: 'nr17-ok',
    atencao: 'nr17-warn',
    nao_conforme: 'nr17-fail',
  };
  return map[status];
}
