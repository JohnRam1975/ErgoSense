import { jsPDF } from 'jspdf';
import { A4_MARGIN, A4_FOOTER_Y, A4_TOP_FIRST, ensureSpace, getA4Sizes, wrapTextLeft } from './pdfA4Layout';
import type { SstReport } from '../types/sst';

export function buildSstPdf(report: SstReport): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let pageNum = 1;
  let y = A4_TOP_FIRST;
  const onNewPage = () => {
    doc.setFontSize(8);
    doc.setTextColor(120);
    const { marginLeft, contentW } = getA4Sizes(doc);
    doc.text(`ErgoSense — SST · Página ${pageNum}`, marginLeft + contentW / 2, A4_FOOTER_Y, { align: 'center' });
    doc.setTextColor(0);
    pageNum += 1;
    y = 24;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RELATÓRIO SST INTEGRADO', A4_MARGIN, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = wrapTextLeft(doc, report.title, y, 12) + 2;
  y = wrapTextLeft(doc, `Gerado: ${new Date(report.generatedAt).toLocaleString('pt-BR')}`, y, 10) + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  y = ensureSpace(doc, y, 10, onNewPage);
  doc.text('1. RESUMO EXECUTIVO', A4_MARGIN, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const d = report.dashboard;
  const lines = [
    `APR: ${d.apr} · EPI: ${d.epi} · EPC: ${d.epc}`,
    `Inspeções: ${d.inspecoes} · Auditorias: ${d.auditorias}`,
    `NC abertas: ${d.ncAbertas}/${d.naoConformidades} · CAPA abertas: ${d.capaAbertas}/${d.capa}`,
    `Treinamentos: ${d.treinamentos} · EPI CA vencidos: ${d.epiCaVencidos}`,
    `Riscos vinculados (Inventário): ${report.integracao.risksLinked}`,
    `CAPA sincronizadas GRO: ${report.integracao.capaGroLinked}`,
  ];
  for (const line of lines) {
    y = wrapTextLeft(doc, line, y, 10) + 1;
  }
  y += 4;

  doc.setFont('helvetica', 'bold');
  y = ensureSpace(doc, y, 10, onNewPage);
  doc.text('2. INTEGRAÇÃO PGR / INVENTÁRIO', A4_MARGIN, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  y = wrapTextLeft(doc, 'Este relatório compõe o snapshot PGR (seção SST) e referencia o inventário de riscos NR-01.', y, 10) + 2;
  y = wrapTextLeft(doc, `Normas: ${report.normas.join(' · ')}`, y, 10) + 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  wrapTextLeft(doc, 'Documento gerado pelo ErgoSense. Validar com responsável técnico SST/SMS.', y, 4);
  return doc;
}

export function exportSstPdf(report: SstReport): void {
  buildSstPdf(report).save(`SST-${Date.now()}.pdf`);
}
