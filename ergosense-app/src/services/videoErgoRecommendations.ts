/**
 * Recomendações IA para análise ergonômica por vídeo
 */
import type {
  BodyRegionExposure,
  LoadLiftEvent,
  RepetitiveMovementAnalysis,
  VideoErgoRecommendation,
  VideoErgoScores,
} from '../types/videoErgo';

const REGION_ACTIONS: Record<string, { causa: string; acao: string; beneficio: string }> = {
  Pescoço: {
    causa: 'Monitor abaixo da linha dos olhos ou visualização prolongada para baixo',
    acao: 'Elevar monitor à altura dos olhos; pausas micro a cada 20 min',
    beneficio: 'Redução de tensão cervical e cefaleia ocupacional',
  },
  'Coluna lombar': {
    causa: 'Flexão lombar repetida ou carga distante do corpo',
    acao: 'Redesenhar posto; usar auxílio mecânico; técnica de levantamento seguro',
    beneficio: 'Prevenção de LER/DORT lombar conforme NR-17',
  },
  Tronco: {
    causa: 'Alcance excessivo ou torção sem apoio dos pés',
    acao: 'Aproximar materiais; rotacionar corpo em vez de torcer tronco',
    beneficio: 'Menor sobrecarga discal e muscular',
  },
  'Ombro direito': {
    causa: 'Trabalho acima da linha dos ombros ou alcance lateral',
    acao: 'Rebaixar ponto de trabalho; apoios para braços',
    beneficio: 'Redução de tendinopatias e síndrome do impacto',
  },
  'Ombro esquerdo': {
    causa: 'Assimetria postural ou carga unilateral',
    acao: 'Alternar tarefas; simetrizar posto de trabalho',
    beneficio: 'Equilíbrio muscular e menor fadiga',
  },
  'Punho direito': {
    causa: 'Desvio ulnar/radial ou flexão prolongada',
    acao: 'Teclado/mouse ergonômico; apoio de punho neutro',
    beneficio: 'Prevenção de túnel do carpo e tenossinovite',
  },
};

export function generateVideoErgoRecommendations(
  exposure: BodyRegionExposure[],
  scores: VideoErgoScores,
  repetitive: RepetitiveMovementAnalysis,
  loadLifts: LoadLiftEvent[],
): VideoErgoRecommendation[] {
  const recs: VideoErgoRecommendation[] = [];

  for (const e of exposure.filter((x) => x.level === 'critico' || x.level === 'risco').slice(0, 5)) {
    const template = REGION_ACTIONS[e.label] ?? {
      causa: 'Postura estática ou dinâmica inadequada',
      acao: 'Revisar layout do posto conforme NR-17',
      beneficio: 'Melhoria do conforto e produtividade',
    };
    recs.push({
      problema: e.primaryIssue ?? `${e.label} em postura inadequada ${e.exposurePct}% do tempo`,
      causaProvavel: template.causa,
      impacto: `Exposição ocupacional de ${e.exposurePct}% — risco de LER/DORT`,
      nivelRisco: e.level === 'critico' ? 'critico' : 'alto',
      acaoCorretiva: template.acao,
      prioridade: e.level === 'critico' ? 'alta' : 'media',
      beneficioEsperado: template.beneficio,
    });
  }

  if (repetitive.frequencyClass === 'alto' || repetitive.frequencyClass === 'critico') {
    recs.push({
      problema: `Movimentos repetitivos — ${repetitive.movementsPerMinute}/min (${repetitive.classificationLabel})`,
      causaProvavel: `Ciclos repetitivos em ${repetitive.dominantRegion}`,
      impacto: 'Fadiga muscular e risco de distúrbios osteomusculares (ISO 11228)',
      nivelRisco: repetitive.frequencyClass,
      acaoCorretiva: 'Rotacionar tarefas; pausas ativas; automatizar ou auxiliar mecanicamente',
      prioridade: 'alta',
      beneficioEsperado: 'Redução de ciclos/min e recuperação muscular',
    });
  }

  const criticalLifts = loadLifts.filter((l) => l.riskLevel === 'critico' || l.riskLevel === 'alto');
  if (criticalLifts.length > 0) {
    const avgLi = criticalLifts.reduce((s, l) => s + l.nioshLi, 0) / criticalLifts.length;
    recs.push({
      problema: `${criticalLifts.length} levantamento(s) com LI NIOSH elevado (média ${avgLi.toFixed(1)})`,
      causaProvavel: 'Carga distante do corpo e flexão lombar durante levantamento',
      impacto: 'Risco elevado de lesão lombar aguda',
      nivelRisco: avgLi > 3 ? 'critico' : 'alto',
      acaoCorretiva: 'Aproximar carga; reduzir peso; usar transpaleteira ou dois operadores',
      prioridade: 'alta',
      beneficioEsperado: 'LI NIOSH ≤ 1,0 conforme RNLE',
    });
  }

  if (scores.rula.score >= 5) {
    recs.push({
      problema: `RULA score ${scores.rula.score} — ${scores.rula.actionLevel}`,
      causaProvavel: scores.rula.justification,
      impacto: 'Postura de membros superiores e pescoço requer intervenção',
      nivelRisco: scores.rula.score >= 7 ? 'critico' : 'alto',
      acaoCorretiva: 'Implementar controles de engenharia e reorganização do trabalho',
      prioridade: scores.rula.score >= 7 ? 'alta' : 'media',
      beneficioEsperado: 'Score RULA ≤ 2 (postura aceitável)',
    });
  }

  if (!scores.nr17.compliant) {
    recs.push({
      problema: `Conformidade NR-17: ${scores.nr17.compliancePct}%`,
      causaProvavel: scores.nr17.gaps.slice(0, 2).join('; ') || 'Exposições posturais prolongadas',
      impacto: 'Não conformidade com condições de trabalho (NR-17)',
      nivelRisco: 'medio',
      acaoCorretiva: 'Elaborar AEP/AET; plano de ação com prazos e responsáveis',
      prioridade: 'media',
      beneficioEsperado: 'Conformidade legal e redução de acidentes/doenças ocupacionais',
    });
  }

  return recs.slice(0, 10);
}
