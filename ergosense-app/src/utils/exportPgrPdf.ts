/**
 * Exportação PDF do PGR — dados reais do snapshot persistido
 */
import { jsPDF } from 'jspdf';
import {
  A4_BOTTOM,
  A4_FOOTER_Y,
  A4_MARGIN,
  A4_TOP_FIRST,
  breakPage,
  ensureSpace,
  getA4Sizes,
  pdfSafeText,
  wrapTextLeft,
} from './pdfA4Layout';
import type { PgrProgram, PgrVersionDetail } from '../types/pgr';
import { PGR_SIGNATURE_LABELS, PGR_STATUS_LABELS } from '../types/pgr';

function drawHeader(doc: jsPDF, title: string, version: string) {
  const { marginLeft, contentW, pageW } = getA4Sizes(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(pdfSafeText(title), marginLeft, 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Versão ${version}`, pageW - marginLeft, 12, { align: 'right' });
  doc.setDrawColor(200);
  doc.line(marginLeft, 16, marginLeft + contentW, 16);
}

function drawFooter(doc: jsPDF, pageNum: number) {
  const { marginLeft, contentW } = getA4Sizes(doc);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`ErgoSensePro — PGR NR-01 · Página ${pageNum}`, marginLeft + contentW / 2, A4_FOOTER_Y, {
    align: 'center',
  });
  doc.setTextColor(0);
}

export function exportPgrPdf(program: PgrProgram, version: PgrVersionDetail): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const snap = version.snapshot;
  let pageNum = 1;
  let y = A4_TOP_FIRST;

  const onNewPage = () => {
    drawFooter(doc, pageNum);
    pageNum += 1;
    drawHeader(doc, program.title, version.number);
  };

  drawHeader(doc, program.title, version.number);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PROGRAMA DE GERENCIAMENTO DE RISCOS', A4_MARGIN, y);
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  y = wrapTextLeft(doc, snap.empresa.nome, y, 12) + 2;
  y = wrapTextLeft(doc, `Indústria: ${snap.empresa.industria || '-'}`, y, 10) + 2;
  y = wrapTextLeft(doc, `Norma: ${snap.norma}`, y, 10) + 2;
  y = wrapTextLeft(doc, `Status: ${PGR_STATUS_LABELS[version.status]}`, y, 10) + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  y = ensureSpace(doc, y, 10, onNewPage);
  doc.text('1. RESPONSÁVEIS', A4_MARGIN, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = wrapTextLeft(doc, `Responsável técnico: ${program.technicalResponsible || '-'}`, y) + 1;
  y = wrapTextLeft(doc, `Representante legal: ${program.legalResponsible || '-'}`, y) + 1;
  y = wrapTextLeft(doc, `Elaborado por: ${version.preparedBy || '-'}`, y) + 1;
  y = wrapTextLeft(doc, `Data elaboração: ${version.preparedAt || '-'} · Próxima revisão: ${version.nextReviewAt || '-'}`, y) + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  y = ensureSpace(doc, y, 10, onNewPage);
  doc.text('2. INVENTÁRIO DE RISCOS', A4_MARGIN, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (!snap.inventarioRiscos.length) {
    y = wrapTextLeft(doc, 'Nenhum risco cadastrado no inventário.', y) + 4;
  } else {
    for (const r of snap.inventarioRiscos) {
      const block = `[${r.tipo}] ${r.perigo} — ${r.nivel.toUpperCase()} (P${r.probabilidade}×S${r.severidade}=${r.score}) · ${r.setor || 'Sem setor'}. Fonte: ${r.fonteGeradora}. Consequência: ${r.consequencia}. Controles: ${r.medidasControle || '-'}`;
      y = wrapTextLeft(doc, block, y, 9, onNewPage) + 2;
    }
  }

  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  y = ensureSpace(doc, y, 10, onNewPage);
  doc.text('3. PLANO DE AÇÃO', A4_MARGIN, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (!snap.planoAcao.length) {
    y = wrapTextLeft(doc, 'Nenhuma ação cadastrada.', y) + 4;
  } else {
    for (const a of snap.planoAcao) {
      const line = `${a.tipoControle}: ${a.descricao} — Risco: ${a.riscoPerigo}. Resp.: ${a.responsavel || '-'}. Prazo: ${a.prazo || '-'}. Status: ${a.status}`;
      y = wrapTextLeft(doc, line, y, 9, onNewPage) + 2;
    }
  }

  if (snap.indicadores?.length) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    y = ensureSpace(doc, y, 10, onNewPage);
    doc.text('4. INDICADORES DE MONITORAMENTO', A4_MARGIN, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const i of snap.indicadores) {
      y = wrapTextLeft(
        doc,
        `${i.nome} (${i.tipo}): meta ${i.meta ?? '-'} ${i.unidade || ''} · atual ${i.valorAtual ?? '-'}`,
        y,
        9,
        onNewPage,
      ) + 2;
    }
  }

  y += 4;
  if (y > A4_BOTTOM - 40) y = breakPage(doc, onNewPage);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('5. ASSINATURAS', A4_MARGIN, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (!version.signatures.length) {
    y = wrapTextLeft(doc, 'Sem assinaturas registradas.', y) + 4;
  } else {
    for (const s of version.signatures) {
      y = wrapTextLeft(
        doc,
        `${PGR_SIGNATURE_LABELS[s.type]}: ${s.name} — ${s.role || '-'} — ${new Date(s.signedAt).toLocaleString('pt-BR')}`,
        y,
        9,
        onNewPage,
      ) + 1;
    }
  }

  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(100);
  wrapTextLeft(
    doc,
    `Documento gerado em ${new Date(snap.generatedAt).toLocaleString('pt-BR')} · ErgoSensePro · Controle de versão ${version.number}`,
    y,
    8,
  );

  drawFooter(doc, pageNum);

  const slug = snap.empresa.nome.replace(/\W+/g, '-').slice(0, 30);
  doc.save(`PGR-${slug}-v${version.number}.pdf`);
}
