import type { Analysis } from '../types';
import { riskLabel } from './ergonomics';

export function buildAnalysisShareText(analysis: Analysis, companyName: string): string {
  const status = analysis.nr17Report
    ? analysis.nr17Report.overallStatus === 'conforme'
      ? 'Conforme'
      : analysis.nr17Report.overallStatus === 'atencao'
        ? 'Atenção'
        : 'Não conforme'
    : riskLabel(analysis.risk);
  return [
    `ErgoSense — Resultado da análise`,
    `Empresa: ${companyName}`,
    `Colaborador: ${analysis.collaboratorName}`,
    `Setor: ${analysis.setor}`,
    `Atividade: ${analysis.activity}`,
    `Data: ${analysis.date} ${analysis.time}`,
    `Score: ${analysis.score} · Risco: ${riskLabel(analysis.risk)} · NR-17: ${status}`,
    `RULA ${analysis.rula} · REBA ${analysis.reba}`,
  ].join('\n');
}

/** Compartilha via Web Share, com fallback mailto / WhatsApp / clipboard. */
export async function shareAnalysisResult(
  analysis: Analysis,
  companyName: string,
): Promise<'shared' | 'mailto' | 'whatsapp' | 'clipboard'> {
  const text = buildAnalysisShareText(analysis, companyName);
  const title = `Análise ergonômica — ${analysis.collaboratorName}`;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
    }
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  try {
    window.open(wa, '_blank', 'noopener,noreferrer');
    return 'whatsapp';
  } catch {
    /* continue */
  }

  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
  window.location.href = mailto;

  try {
    await navigator.clipboard.writeText(text);
    return 'clipboard';
  } catch {
    return 'mailto';
  }
}
