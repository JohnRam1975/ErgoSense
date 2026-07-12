/**
 * Layout A4 — margens 2 cm, paginação segura (sem sobreposição de texto).
 */
import type { jsPDF } from 'jspdf';

export const A4_MARGIN = 20;
export const A4_TOP_FIRST = 25;
/** Início do conteúdo em páginas 2+ (abaixo do cabeçalho) */
export const A4_TOP_NEXT = 34;
export const A4_BOTTOM = 268;
export const A4_FOOTER_Y = 282;

const TABLE_FONT = 9;
const TABLE_LINE_MM = 5.2;

export function getA4Sizes(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - A4_MARGIN * 2;
  const centerX = pageW / 2;
  return { pageW, pageH, contentW, centerX, marginLeft: A4_MARGIN };
}

export function pdfSafeText(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u2600-\u27BF]/g, '')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>=')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u00B7/g, ' | ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function bodyLineHeight(fontSize: number): number {
  return Math.max(5.2, fontSize * 0.55);
}

export type PageBreakHandler = () => void;

/** Nova página + cabeçalho opcional; retorna Y inicial seguro */
export function breakPage(doc: jsPDF, onNewPage?: PageBreakHandler): number {
  doc.addPage();
  onNewPage?.();
  return A4_TOP_NEXT;
}

export function ensureSpace(
  doc: jsPDF,
  y: number,
  neededMm: number,
  onNewPage?: PageBreakHandler,
): number {
  if (y + neededMm > A4_BOTTOM) {
    return breakPage(doc, onNewPage);
  }
  return y;
}

export function wrapTextLeft(
  doc: jsPDF,
  text: string,
  y: number,
  fontSize = 10,
  onNewPage?: PageBreakHandler,
): number {
  const { marginLeft, contentW } = getA4Sizes(doc);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  const lh = bodyLineHeight(fontSize);
  const lines = doc.splitTextToSize(pdfSafeText(text) || '-', contentW) as string[];
  let cy = ensureSpace(doc, y, lines.length * lh + 2, onNewPage);

  for (let i = 0; i < lines.length; i++) {
    if (cy + lh > A4_BOTTOM) {
      cy = breakPage(doc, onNewPage);
    }
    doc.text(lines[i], marginLeft, cy, { align: 'left', maxWidth: contentW });
    cy += lh;
  }
  return cy + 3;
}

/** Largura mínima (mm) para justificar uma linha — evita espaçamento entre letras do jsPDF */
function lineFillsWidth(doc: jsPDF, line: string, targetMm: number): boolean {
  return doc.getTextWidth(line) >= targetMm * 0.82;
}

export function wrapTextJustified(
  doc: jsPDF,
  text: string,
  y: number,
  fontSize = 11,
  onNewPage?: PageBreakHandler,
): number {
  const { marginLeft, contentW } = getA4Sizes(doc);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  const lh = bodyLineHeight(fontSize);
  const safe = pdfSafeText(text);
  if (!safe) return y;

  const allLines = doc.splitTextToSize(safe, contentW) as string[];
  let cy = y;

  for (let li = 0; li < allLines.length; li++) {
    if (cy + lh > A4_BOTTOM) {
      cy = breakPage(doc, onNewPage);
    }
    const line = allLines[li];
    const isLast = li === allLines.length - 1;
    // jsPDF com align:'justify' estica a última linha do bloco → letras separadas
    const useJustify = !isLast && allLines.length > 1 && lineFillsWidth(doc, line, contentW);

    doc.text(line, marginLeft, cy, {
      align: useJustify ? 'justify' : 'left',
      maxWidth: contentW,
    });
    cy += lh;
  }
  return cy + 4;
}

export function sectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  onNewPage?: PageBreakHandler,
): number {
  const cy = ensureSpace(doc, y, 16, onNewPage);
  const { marginLeft, contentW } = getA4Sizes(doc);
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(230, 230, 230);
  doc.rect(marginLeft, cy - 1, contentW, 11, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(pdfSafeText(title), marginLeft + 2, cy + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  return cy + 14;
}

export function drawContentRule(
  doc: jsPDF,
  y: number,
  color: [number, number, number] = [255, 168, 0],
): number {
  const { marginLeft, contentW } = getA4Sizes(doc);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, marginLeft + contentW, y);
  return y + 10;
}

export function drawPageHeader(doc: jsPDF, line: string): void {
  const { marginLeft, contentW, centerX } = getA4Sizes(doc);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const headerLines = doc.splitTextToSize(pdfSafeText(line), contentW) as string[];
  let hy = 10;
  headerLines.forEach((ln) => {
    doc.text(ln, centerX, hy, { align: 'center', maxWidth: contentW });
    hy += 4;
  });
  doc.setDrawColor(220, 220, 220);
  doc.line(marginLeft, 22, marginLeft + contentW, 22);
  doc.setTextColor(40, 40, 40);
}

export function addDocumentFooter(doc: jsPDF, footerText: string): void {
  const { centerX, contentW, marginLeft } = getA4Sizes(doc);
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(220, 220, 220);
    doc.line(marginLeft, A4_FOOTER_Y - 5, marginLeft + contentW, A4_FOOTER_Y - 5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(pdfSafeText(footerText), centerX, A4_FOOTER_Y, {
      align: 'center',
      maxWidth: contentW,
    });
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${p} de ${total}`, centerX, A4_FOOTER_Y + 4, { align: 'center' });
    doc.setTextColor(40, 40, 40);
  }
}

export function imageXForWidth(pageW: number, drawW: number): number {
  return (pageW - drawW) / 2;
}

export type TableColumn = { key: string; title: string; widthMm: number };

function measureRowHeight(
  doc: jsPDF,
  columns: TableColumn[],
  row: Record<string, string>,
): number {
  let maxLines = 1;
  columns.forEach((col) => {
    const w = col.widthMm - 3;
    const lines = doc.splitTextToSize(pdfSafeText(row[col.key] ?? ''), w) as string[];
    maxLines = Math.max(maxLines, lines.length);
  });
  return 6 + maxLines * TABLE_LINE_MM;
}

export function drawTable(
  doc: jsPDF,
  columns: TableColumn[],
  rows: Record<string, string>[],
  startY: number,
  onNewPage?: PageBreakHandler,
): number {
  const { marginLeft, contentW } = getA4Sizes(doc);
  const colStarts: number[] = [];
  let x = marginLeft;
  columns.forEach((c) => {
    colStarts.push(x);
    x += c.widthMm;
  });

  const headerH = 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(TABLE_FONT);

  const drawHeader = (atY: number): number => {
    doc.setFillColor(240, 240, 240);
    doc.rect(marginLeft, atY - 2, contentW, headerH, 'F');
    columns.forEach((col, i) => {
      doc.text(col.title, colStarts[i] + 2, atY + 5);
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(TABLE_FONT);
    return atY + headerH + 2;
  };

  let y = ensureSpace(doc, startY, headerH + 8, onNewPage);
  y = drawHeader(y);

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const rowH = measureRowHeight(doc, columns, row);

    if (y + rowH > A4_BOTTOM) {
      y = breakPage(doc, onNewPage);
      y = drawHeader(y);
    }

    if (r % 2 === 1) {
      doc.setFillColor(252, 252, 252);
      doc.rect(marginLeft, y, contentW, rowH, 'F');
    }

    const cellLines = columns.map((col) => {
      const w = col.widthMm - 3;
      return doc.splitTextToSize(pdfSafeText(row[col.key] ?? ''), w) as string[];
    });

    const textY = y + 4;
    columns.forEach((_col, i) => {
      cellLines[i].forEach((line, li) => {
        doc.text(line, colStarts[i] + 2, textY + li * TABLE_LINE_MM);
      });
    });

    y += rowH;
    doc.setDrawColor(235, 235, 235);
    doc.line(marginLeft, y, marginLeft + contentW, y);
    y += 1;
  }

  return y + 5;
}

/** Item NR-17 em bloco único (sem tabela) — evita sobreposição em textos longos */
export function drawNr17ChecklistItem(
  doc: jsPDF,
  item: { titulo: string; status: string; referencia: string; detalhe: string },
  y: number,
  onNewPage?: PageBreakHandler,
): number {
  let cy = ensureSpace(doc, y, 20, onNewPage);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(35, 35, 35);
  cy = wrapTextLeft(doc, `${item.titulo} — ${item.status}`, cy, 10, onNewPage);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  cy = wrapTextLeft(doc, item.referencia, cy, 8, onNewPage);
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  cy = wrapTextJustified(doc, item.detalhe, cy, 10, onNewPage);
  return cy + 6;
}

/** Compatibilidade com exportadores antigos */
export const A4_TOP = A4_TOP_FIRST;
export function ensurePageSpace(
  doc: jsPDF,
  y: number,
  neededMm: number,
  onNewPage?: PageBreakHandler,
): number {
  return ensureSpace(doc, y, neededMm, onNewPage);
}
