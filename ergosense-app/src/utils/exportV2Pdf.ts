import { jsPDF } from 'jspdf';
import type { Analysis } from '../types';
import type { ErgonomicMethodResult } from '../methods/types';
import { ERGONOMIC_CRITERIA_VERSION } from '../config/ergonomicCriteriaMaster';
import { riskLabel } from './ergonomics';
import {
  A4_TOP_FIRST,
  addDocumentFooter,
  drawContentRule,
  drawPageHeader,
  drawTable,
  getA4Sizes,
  sectionTitle,
  wrapTextJustified,
  wrapTextLeft,
} from './pdfA4Layout';

function riskColor(classification: string): [number, number, number] {
  if (classification === 'critico') return [200, 40, 40];
  if (classification === 'alto') return [220, 100, 30];
  if (classification === 'atencao') return [200, 140, 0];
  return [40, 140, 60];
}

function dedupeRecommendations(methods: ErgonomicMethodResult[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of methods) {
    for (const r of m.recommendation) {
      const t = r.trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  return out.slice(0, 12);
}

function priorityMethods(methods: ErgonomicMethodResult[]): ErgonomicMethodResult[] {
  const order = ['critico', 'alto', 'atencao', 'aceitavel'];
  return [...methods].sort(
    (a, b) => order.indexOf(a.classification) - order.indexOf(b.classification),
  );
}

export function exportV2MethodsPdf(analysis: Analysis, companyName: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const v2 = analysis.v2Report;
  const methods = v2?.methods ?? [];
  const pageHeader = `${companyName} · ${analysis.collaboratorName} · ${analysis.date}`;
  const onNewPage = () => {};
  const { centerX } = getA4Sizes(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 168, 0);
  doc.text('ErgoSense', centerX, A4_TOP_FIRST, { align: 'center' });
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text('Laudo Ergonômico Integrado V2', centerX, A4_TOP_FIRST + 9, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Multi-método · Margens 2 cm · A4', centerX, A4_TOP_FIRST + 15, { align: 'center' });

  let y = drawContentRule(doc, A4_TOP_FIRST + 22);

  y = wrapTextLeft(doc, `Empresa: ${companyName}`, y, 11, onNewPage);
  y = wrapTextLeft(doc, `Colaborador: ${analysis.collaboratorName}`, y, 11, onNewPage);
  y = wrapTextLeft(doc, `Setor: ${analysis.setor} · ${analysis.activity}`, y, 11, onNewPage);
  y = wrapTextLeft(doc, `Data: ${analysis.date} ${analysis.time}`, y, 11, onNewPage);
  y = wrapTextLeft(doc, `Critérios: ${ERGONOMIC_CRITERIA_VERSION}`, y, 10, onNewPage);

  y = sectionTitle(doc, 'Resumo executivo', y, onNewPage);
  y = drawTable(
    doc,
    [
      { key: 'indicador', title: 'Indicador', widthMm: 55 },
      { key: 'valor', title: 'Resultado', widthMm: 115 },
    ],
    [
      { indicador: 'Score', valor: `${analysis.score}/100 (${riskLabel(analysis.risk)})` },
      { indicador: 'RULA / REBA', valor: `${analysis.rula} / ${analysis.reba}` },
      { indicador: 'Métodos', valor: String(methods.length) },
      { indicador: 'Postura', valor: v2?.posture?.mode ?? '—' },
    ],
    y,
    onNewPage,
  );

  if (v2?.aiReport) {
    y = sectionTitle(doc, 'Diagnóstico IA', y, onNewPage);
    y = wrapTextJustified(doc, v2.aiReport.diagnostico, y, 11, onNewPage);
    y = wrapTextLeft(doc, 'Conclusão técnica', y, 10, onNewPage);
    y = wrapTextJustified(doc, v2.aiReport.conclusaoTecnica, y, 11, onNewPage);
  }

  y = sectionTitle(doc, 'Resultados por método', y, onNewPage);
  y = drawTable(
    doc,
    [
      { key: 'metodo', title: 'Método', widthMm: 48 },
      { key: 'pontuacao', title: 'Pontuação', widthMm: 22 },
      { key: 'situacao', title: 'Classificação', widthMm: 40 },
      { key: 'norma', title: 'Norma', widthMm: 60 },
    ],
    priorityMethods(methods).map((m) => ({
      metodo: m.methodName,
      pontuacao: String(m.score),
      situacao: m.classificationLabel,
      norma:
        m.normReference.length > 35 ? `${m.normReference.slice(0, 33)}…` : m.normReference,
    })),
    y,
    onNewPage,
  );

  const critical = methods.filter((m) => m.classification === 'critico' || m.classification === 'alto');
  if (critical.length > 0) {
    y = sectionTitle(doc, 'Pontos críticos', y, onNewPage);
    for (const m of critical.slice(0, 8)) {
      const [r, g, b] = riskColor(m.classification);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(r, g, b);
      y = wrapTextLeft(doc, `${m.methodName} — ${m.classificationLabel}`, y, 10, onNewPage);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      if (m.recommendation[0]) {
        y = wrapTextJustified(doc, m.recommendation[0], y, 10, onNewPage);
      }
    }
    doc.setTextColor(40, 40, 40);
  }

  const recs = dedupeRecommendations(methods);
  if (recs.length > 0 || (v2?.aiReport?.planoAcao?.length ?? 0) > 0) {
    y = sectionTitle(doc, 'Recomendações', y, onNewPage);
    recs.forEach((rec, i) => {
      y = wrapTextJustified(doc, `${i + 1}. ${rec}`, y, 10, onNewPage);
    });
    for (const item of v2?.aiReport?.planoAcao ?? []) {
      y = wrapTextLeft(
        doc,
        `${item.prazo}: ${item.acao} (${item.responsavel})`,
        y,
        10,
        onNewPage,
      );
    }
  }

  wrapTextJustified(
    doc,
    'Revisão humana por ergonomista habilitado obrigatória para uso legal.',
    y + 4,
    8,
    onNewPage,
  );

  const total = doc.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    drawPageHeader(doc, pageHeader);
  }

  addDocumentFooter(doc, `ErgoSense V2 · ${ERGONOMIC_CRITERIA_VERSION}`);

  doc.save(`ErgoSense-V2-${analysis.collaboratorName.replace(/\s+/g, '_')}.pdf`);
}
