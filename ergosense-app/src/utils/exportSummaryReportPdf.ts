import { jsPDF } from 'jspdf';
import type { Analysis, ReportType } from '../types';
import { riskLabel } from './ergonomics';
import {
  A4_TOP_FIRST,
  addDocumentFooter,
  ensureSpace,
  getA4Sizes,
  sectionTitle,
  wrapTextLeft,
} from './pdfA4Layout';

function safeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function downloadPdfBlob(doc: jsPDF, filename: string): void {
  try {
    doc.save(filename);
    return;
  } catch {
    /* fallback */
  }
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function typeTitle(type: ReportType): string {
  if (type === 'colab') return 'Relatorio por Colaborador';
  if (type === 'setor') return 'Relatorio por Setor';
  return 'Relatorio NR-17 Consolidado';
}

/** PDF resumo local a partir das análises filtradas (tipo + período). */
export function exportAnalysesSummaryPdf(
  analyses: Analysis[],
  type: ReportType,
  opts: { companyName: string; periodLabel: string; evaluatorName?: string },
): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { marginLeft } = getA4Sizes(doc);
  const title = typeTitle(type);
  const onNewPage = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, marginLeft, 22);
  };

  let y = A4_TOP_FIRST;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, marginLeft, y);
  y += 8;
  y = wrapTextLeft(doc, `${opts.companyName} · ${opts.periodLabel}`, y, 10, onNewPage);
  y = sectionTitle(doc, 'Escopo', y, onNewPage);
  y = wrapTextLeft(doc, `Analises incluidas: ${analyses.length}`, y, 10, onNewPage);
  if (opts.evaluatorName) {
    y = wrapTextLeft(doc, `Avaliador: ${opts.evaluatorName}`, y, 10, onNewPage);
  }

  if (type === 'setor') {
    const bySector = new Map<string, Analysis[]>();
    for (const a of analyses) {
      const list = bySector.get(a.setor) ?? [];
      list.push(a);
      bySector.set(a.setor, list);
    }
    for (const [setor, items] of [...bySector.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      y = ensureSpace(doc, y, 28, onNewPage);
      y = sectionTitle(doc, setor, y, onNewPage);
      const avg = Math.round(items.reduce((s, a) => s + a.score, 0) / items.length);
      const worst = items.reduce((w, a) => (a.score > w.score ? a : w), items[0]);
      y = wrapTextLeft(
        doc,
        `${items.length} analise(s) · score medio ${avg} · pior: ${worst.collaboratorName} (${riskLabel(worst.risk)})`,
        y,
        10,
        onNewPage,
      );
      for (const a of items.slice(0, 12)) {
        y = wrapTextLeft(
          doc,
          `${a.date} ${a.time} · ${a.collaboratorName} · score ${a.score} · ${riskLabel(a.risk)} · RULA ${a.rula}/REBA ${a.reba}`,
          y,
          9,
          onNewPage,
        );
      }
    }
  } else if (type === 'colab') {
    const byColab = new Map<string, Analysis[]>();
    for (const a of analyses) {
      const key = a.collaboratorId || a.collaboratorName;
      const list = byColab.get(key) ?? [];
      list.push(a);
      byColab.set(key, list);
    }
    for (const [, items] of byColab) {
      const name = items[0].collaboratorName;
      y = ensureSpace(doc, y, 28, onNewPage);
      y = sectionTitle(doc, name, y, onNewPage);
      y = wrapTextLeft(doc, `Setor: ${items[0].setor} · ${items.length} avaliacao(oes)`, y, 10, onNewPage);
      for (const a of items) {
        y = wrapTextLeft(
          doc,
          `${a.date} ${a.time} · ${a.activity} · score ${a.score} · ${riskLabel(a.risk)}`,
          y,
          9,
          onNewPage,
        );
      }
    }
  } else {
    y = sectionTitle(doc, 'Analises', y, onNewPage);
    for (const a of analyses) {
      y = ensureSpace(doc, y, 14, onNewPage);
      y = wrapTextLeft(
        doc,
        `${a.collaboratorName} · ${a.setor} · ${a.date} ${a.time} · ${a.activity} · score ${a.score} · ${riskLabel(a.risk)} · RULA ${a.rula} · REBA ${a.reba}`,
        y,
        9,
        onNewPage,
      );
    }
  }

  addDocumentFooter(doc, 'ErgoSense — relatorio consolidado');
  const filename = `ErgoSense_${safeFilename(title)}_${safeFilename(opts.companyName)}.pdf`;
  downloadPdfBlob(doc, filename);
  return filename;
}
