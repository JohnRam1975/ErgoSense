/**
 * AET assistida — documento pré-preenchido para validação do ergonomista.
 */
import type { AepDocument } from './aepDocument';

export interface ProfessionalSignature {
  ergonomistName: string;
  professionalRegistry: string;
  signatureDate: string;
  company: string;
  digitalSignatureHash?: string;
}

export interface AetDocument {
  version: string;
  type: 'AET';
  title: string;
  /** Herda conteúdo estruturado da AEP */
  aep: AepDocument;
  /** Fotos e evidências */
  photos: { label: string; present: boolean }[];
  /** Métodos com referência normativa */
  methodsSummary: { method: string; result: string; reference: string }[];
  /** Conclusões pré-preenchidas */
  preliminaryConclusions: string[];
  /** Plano de ação (cópia da AEP) */
  actionPlanRef: string;
  /** Bloco de validação profissional */
  validation: {
    status: 'pendente' | 'validado';
    signature?: ProfessionalSignature;
    validationNotes?: string;
  };
  disclaimer: string;
  generatedAt: string;
}

export function buildAetDocument(
  aep: AepDocument,
  analysis: { captureImage?: string; v2Report?: { methods: { methodName: string; classificationLabel: string; normReference: string }[] } },
): AetDocument {
  const methods = analysis.v2Report?.methods ?? aep.methodsApplied;

  return {
    version: '1.0',
    type: 'AET',
    title: aep.title.replace('AEP', 'AET'),
    aep,
    photos: [
      { label: 'Imagem original com esqueleto', present: !!analysis.captureImage },
      { label: 'Registro processado IA', present: !!analysis.captureImage },
    ],
    methodsSummary: methods.map((m) => ({
      method: m.methodName,
      result: m.classificationLabel,
      reference: m.normReference,
    })),
    preliminaryConclusions: [
      aep.qualitativeAssessment,
      `Índice de risco ErgoSense (IERE): ${aep.indices.riskIndex} — ${aep.indices.riskBand}.`,
      `Confiabilidade estatística: ${aep.samplingConfidence.label}.`,
      'Conclusão definitiva sujeita à validação presencial e complementação in loco pelo ergonomista.',
    ],
    actionPlanRef: aep.scheduleSummary,
    validation: { status: 'pendente' },
    disclaimer:
      'AET assistida — rascunho técnico. O ergonomista deve validar, complementar e assinar para fins de conformidade legal (NR-17, PGR, LTCAT quando aplicável).',
    generatedAt: new Date().toISOString(),
  };
}
