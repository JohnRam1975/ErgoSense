/**
 * Geração automática de AEP (Análise Ergonomica Preliminar) — apoio técnico.
 * NÃO substitui laudo legal. Requer validação por ergonomista habilitado.
 */
import type { Analysis } from '../types';
import type { ErgoSenseIndices } from '../utils/ergoIndices';
import type { SamplingConfidenceResult } from '../utils/samplingConfidence';
import type { AssessmentTraceability } from './assessmentTraceability';
import type { ErgonomicMethodResult } from '../methods/types';
import { contextLabel } from '../data/activityProfiles';
import { nr17StatusLabel } from '../utils/nr17';
import { ergoIndexBandLabel } from '../config/ergoMethodology';

export interface AepActionItem {
  id: string;
  priority: 'imediata' | 'curto_prazo' | 'medio_prazo';
  description: string;
  responsible: string;
  deadline: string;
  normReference: string;
}

export interface AepDocument {
  version: string;
  type: 'AEP';
  title: string;
  traceability: AssessmentTraceability;
  samplingConfidence: SamplingConfidenceResult;
  indices: ErgoSenseIndices;
  /** 1. Caracterização */
  activityCharacterization: string;
  /** 2. Posto de trabalho */
  workstationDescription: string;
  /** 3. Tarefa */
  taskDescription: string;
  /** 4. Riscos */
  identifiedRisks: string[];
  /** 5. Quantitativa */
  quantitativeAssessment: string;
  /** 6. Qualitativa */
  qualitativeAssessment: string;
  /** 7. Plano de ação */
  actionPlan: AepActionItem[];
  /** 8. Cronograma resumido */
  scheduleSummary: string;
  /** Métodos aplicados */
  methodsApplied: ErgonomicMethodResult[];
  disclaimer: string;
  generatedAt: string;
}

function priorityFromRisk(risk: string): AepActionItem['priority'] {
  if (risk === 'critico' || risk === 'alto') return 'imediata';
  if (risk === 'medio') return 'curto_prazo';
  return 'medio_prazo';
}

function deadlineFromPriority(p: AepActionItem['priority']): string {
  const d = new Date();
  if (p === 'imediata') d.setDate(d.getDate() + 7);
  else if (p === 'curto_prazo') d.setDate(d.getDate() + 30);
  else d.setDate(d.getDate() + 90);
  return d.toLocaleDateString('pt-BR');
}

export function buildAepDocument(params: {
  analysis: Analysis;
  traceability: AssessmentTraceability;
  indices: ErgoSenseIndices;
  samplingConfidence: SamplingConfidenceResult;
  methods?: ErgonomicMethodResult[];
}): AepDocument {
  const { analysis, traceability, indices, samplingConfidence, methods = [] } = params;
  const nr17 = analysis.nr17Report;
  const ctx = analysis.activityContext ? contextLabel(analysis.activityContext) : 'Geral';

  const identifiedRisks =
    nr17?.regionsMostAffected.length
      ? nr17.regionsMostAffected.map((r) => `Exposição ergonômica: ${r}`)
      : nr17?.items
          .filter((i) => i.status !== 'conforme' && i.id !== 'contexto')
          .map((i) => `${i.titulo} — ${nr17StatusLabel(i.status)}`) ?? [];

  if (analysis.loadEffort) {
    identifiedRisks.push(
      `Movimentação manual: ${analysis.loadEffort.weightKg} kg a ${analysis.loadEffort.distanceCm} cm (índice ${analysis.loadEffort.indiceEsforco})`,
    );
  }

  const niosh = methods.find((m) => m.methodId === 'niosh');
  const quantitativeParts = [
    `IERE: ${indices.riskIndex} (${ergoIndexBandLabel(indices.riskBand)})`,
    `IEE: ${indices.exposureIndex} (${ergoIndexBandLabel(indices.exposureBand)})`,
    `IECI: ${indices.internalConformityIndex} (${ergoIndexBandLabel(indices.conformityBand)})`,
    `RULA: ${analysis.rula} · REBA: ${analysis.reba}`,
  ];
  if (niosh?.outputs?.RWL != null) {
    quantitativeParts.push(`NIOSH RWL: ${niosh.outputs.RWL} kg · LI: ${niosh.outputs.LI}`);
  }

  const actionPlan: AepActionItem[] = (nr17?.recommendations ?? []).slice(0, 8).map((rec, i) => ({
    id: `aep-act-${i + 1}`,
    priority: priorityFromRisk(analysis.risk),
    description: `${rec.title}: ${rec.detail}`,
    responsible: 'Ergonomista / SESMT',
    deadline: deadlineFromPriority(priorityFromRisk(analysis.risk)),
    normReference: 'NR-17 · Anexo II',
  }));

  return {
    version: '1.0',
    type: 'AEP',
    title: `AEP — ${analysis.collaboratorName} · ${analysis.activity}`,
    traceability,
    samplingConfidence,
    indices,
    activityCharacterization: `Colaborador ${analysis.collaboratorName}, setor ${analysis.setor}, contexto ${ctx}, atividade "${analysis.activity}". Amostragem: ${samplingConfidence.actualSecs}s (${samplingConfidence.label}).`,
    workstationDescription: analysis.workstation
      ? `Distância visual ${analysis.workstation.telaDistanciaCm} cm · Iluminação ${analysis.workstation.lux} lux · Monitor ${analysis.workstation.telaAltura}.`
      : `Posto de trabalho em ambiente ${ctx}. Avaliação postural por visão computacional.`,
    taskDescription: analysis.notes?.trim()
      ? analysis.notes
      : `Tarefa observada: ${analysis.activity}. Duração monitorada: ${analysis.recordingSecs ?? 0}s.`,
    identifiedRisks,
    quantitativeAssessment: quantitativeParts.join(' · '),
    qualitativeAssessment: nr17?.summary ?? `Classificação de risco: ${analysis.risk}.`,
    actionPlan,
    scheduleSummary: actionPlan.length
      ? `${actionPlan.filter((a) => a.priority === 'imediata').length} ação(ões) imediata(s), ${actionPlan.filter((a) => a.priority === 'curto_prazo').length} curto prazo.`
      : 'Nenhuma ação corretiva prioritária identificada na triagem.',
    methodsApplied: methods,
    disclaimer:
      'Documento de apoio à AEP gerado automaticamente pelo ErgoSense. Não possui validade legal sem revisão, assinatura e registro profissional do ergonomista responsável.',
    generatedAt: new Date().toISOString(),
  };
}
