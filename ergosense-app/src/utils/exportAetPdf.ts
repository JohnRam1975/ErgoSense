/**
 * Exportação PDF — Relatório normativo AET corporativo (NR-17 · NR-01)
 */
import { jsPDF } from 'jspdf';
import {
  A4_MARGIN,
  A4_FOOTER_Y,
  A4_TOP_FIRST,
  ensureSpace,
  getA4Sizes,
  pdfSafeText,
  wrapTextLeft,
} from './pdfA4Layout';
import type { AetNormativeReport, AetProcess, AetVersionDetail } from '../types/aet';
import { AET_SIGNATURE_LABELS, AET_STAGE_LABELS, AET_STATUS_LABELS } from '../types/aet';

function drawHeader(doc: jsPDF, title: string, version?: string) {
  const { marginLeft, contentW, pageW } = getA4Sizes(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(pdfSafeText(title), marginLeft, 12);
  doc.setFont('helvetica', 'normal');
  doc.text(version ? `Versão ${version}` : 'AET — NR-17', pageW - marginLeft, 12, { align: 'right' });
  doc.setDrawColor(200);
  doc.line(marginLeft, 16, marginLeft + contentW, 16);
}

function drawFooter(doc: jsPDF, pageNum: number, hash?: string) {
  const { marginLeft, contentW } = getA4Sizes(doc);
  doc.setFontSize(8);
  doc.setTextColor(120);
  const hashLine = hash ? ` · SHA-256: ${hash.slice(0, 16)}…` : '';
  doc.text(`ErgoSense — AET Corporativo NR-17 · Página ${pageNum}${hashLine}`, marginLeft + contentW / 2, A4_FOOTER_Y, {
    align: 'center',
  });
  doc.setTextColor(0);
}

function contentToText(content: unknown): string {
  if (content == null) return '—';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === 'object' ? JSON.stringify(c) : String(c))).join('\n');
  return JSON.stringify(content, null, 2).slice(0, 1200);
}

export function buildAetPdf(process: AetProcess, report: AetNormativeReport, version?: AetVersionDetail): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let pageNum = 1;
  let y = A4_TOP_FIRST;
  const versionNum = version?.number ?? report.versionNumber ?? undefined;
  const docHash = version?.documentHash ?? report.documentHash ?? process.documentHash ?? undefined;

  const onNewPage = () => {
    drawFooter(doc, pageNum, docHash);
    pageNum += 1;
    drawHeader(doc, process.title, versionNum);
    y = 24;
  };

  drawHeader(doc, process.title, versionNum);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ANÁLISE ERGONÔMICA DO TRABALHO', A4_MARGIN, y);
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  y = wrapTextLeft(doc, process.title, y, 12) + 2;
  if (versionNum) {
    y = wrapTextLeft(doc, `Versão documental: ${versionNum} · Status: ${version ? AET_STATUS_LABELS[version.status] : process.status}`, y, 10) + 2;
  }
  y = wrapTextLeft(doc, `Etapa técnica: ${AET_STAGE_LABELS[process.stage]} · Processo: ${process.status}`, y, 10) + 4;

  const rt = report.responsavelTecnico ?? {
    nome: process.technicalResponsible,
    crea: process.technicalResponsibleCrea,
    art: process.technicalResponsibleArt,
  };
  if (rt.nome || rt.crea) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    y = ensureSpace(doc, y, 12, onNewPage);
    doc.text('RESPONSÁVEL TÉCNICO', A4_MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y = wrapTextLeft(doc, `Nome: ${rt.nome || '—'}`, y, 10) + 1;
    y = wrapTextLeft(doc, `Registro CREA: ${rt.crea || '—'} · ART: ${rt.art || '—'}`, y, 10) + 4;
  }

  if (version?.signatures?.length || process.ergonomistName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    y = ensureSpace(doc, y, 12, onNewPage);
    doc.text('ASSINATURAS', A4_MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (version?.signatures?.length) {
      for (const s of version.signatures) {
        y = ensureSpace(doc, y, 8, onNewPage);
        y = wrapTextLeft(
          doc,
          `${AET_SIGNATURE_LABELS[s.type]}: ${s.name} — ${s.role || '—'} · Doc: ${s.document || '—'} · ${new Date(s.signedAt).toLocaleString('pt-BR')}`,
          y,
          8,
        ) + 1;
      }
    } else if (process.ergonomistName) {
      y = wrapTextLeft(
        doc,
        `Ergonomista: ${process.ergonomistName} — ${process.ergonomistRegistry} · ${process.signedAt ? new Date(process.signedAt).toLocaleString('pt-BR') : '—'}`,
        y,
        10,
      ) + 4;
    }
    y += 2;
  }

  if (report.integrations || version?.snapshot?.integracoes) {
    const integ = (report.integrations ?? version?.snapshot?.integracoes) as Record<string, unknown>;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    y = ensureSpace(doc, y, 12, onNewPage);
    doc.text('RASTREABILIDADE NR-01', A4_MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const inv = integ.inventario as { perigo?: string; nivel?: string } | null;
    if (inv) y = wrapTextLeft(doc, `Inventário: ${inv.perigo ?? '—'} (${inv.nivel ?? '—'})`, y, 8) + 1;
    const pgr = integ.pgr as { numero?: string; status?: string } | null;
    if (pgr) y = wrapTextLeft(doc, `PGR: ${pgr.numero ?? '—'} · ${pgr.status ?? '—'}`, y, 8) + 1;
    const gro = integ.gro as Array<{ descricao?: string }> | undefined;
    if (gro?.length) y = wrapTextLeft(doc, `GRO: ${gro.length} plano(s) vinculado(s)`, y, 8) + 1;
    const psico = integ.psicossocial as Array<{ fatorCodigo?: string }> | undefined;
    if (psico?.length) y = wrapTextLeft(doc, `Psicossocial: ${psico.length} fator(es) MTE no setor`, y, 8) + 1;
    y += 4;
  }

  for (const section of report.sections) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    y = ensureSpace(doc, y, 14, onNewPage);
    doc.text(`${section.id}. ${section.title}`, A4_MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100);
    y = wrapTextLeft(doc, section.norma, y, 8) + 2;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const text = contentToText(section.content);
    for (const line of text.split('\n').slice(0, 30)) {
      y = ensureSpace(doc, y, 5, onNewPage);
      y = wrapTextLeft(doc, line, y, 4.5) + 1;
    }
    y += 4;
  }

  y = ensureSpace(doc, y, 20, onNewPage);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  wrapTextLeft(doc, report.disclaimer, y, 4);
  if (docHash) {
    y += 12;
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    wrapTextLeft(doc, `Hash de integridade (SHA-256): ${docHash}`, y, 4);
  }

  drawFooter(doc, pageNum, docHash);
  return doc;
}

export function exportAetPdf(process: AetProcess, report: AetNormativeReport, version?: AetVersionDetail): void {
  const versionNum = version?.number ?? report.versionNumber ?? undefined;
  buildAetPdf(process, report, version).save(`AET-${versionNum ?? process.id}-${Date.now()}.pdf`);
}
