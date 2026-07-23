import { jsPDF } from 'jspdf';
import type { Analysis } from '../types';
import { contextLabel, DEFAULT_ACTIVITY_CONTEXT } from '../data/activityProfiles';
import { buildNr17SessionReport, nr17StatusLabel } from './nr17';
import { riskLabel } from './ergonomics';
import {
  A4_TOP_FIRST,
  addDocumentFooter,
  downloadPdfBlob,
  drawContentRule,
  drawNr17ChecklistItem,
  drawPageHeader,
  drawTable,
  ensureSpace,
  getA4Sizes,
  imageXForWidth,
  pdfSafeFilename,
  sectionTitle,
  wrapTextJustified,
  wrapTextLeft,
} from './pdfA4Layout';

function compressImageForPdf(
  dataUrl: string,
  maxWidth = 900,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas indisponivel'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.72), width, height });
    };
    img.onerror = () => reject(new Error('falha ao carregar imagem'));
    img.src = dataUrl;
  });
}

export function exportCaptureImage(analysis: Analysis): string | null {
  if (!analysis.captureImage) return null;
  const filename = `ErgoSense_Captura_${pdfSafeFilename(analysis.collaboratorName)}_${analysis.date.replace(/\//g, '-')}.jpg`;
  const link = document.createElement('a');
  link.href = analysis.captureImage;
  link.download = filename;
  link.click();
  return filename;
}

function nr17ReportParams(analysis: Analysis) {
  const ctx = analysis.activityContext ?? DEFAULT_ACTIVITY_CONTEXT;
  return {
    angles: analysis.angles,
    workstation: analysis.workstation,
    sessionDurationSecs: analysis.recordingSecs ?? 0,
    sampleCount: analysis.sessionSampleCount ?? 0,
    maxRiskStreakSecs: analysis.maxRiskStreakSecs ?? 0,
    totalRiskSecs: analysis.totalRiskSecs ?? 0,
    activityContext: ctx,
    activity: analysis.activity,
    loadResult: analysis.loadResult ?? analysis.loadAssessment?.result ?? null,
    loadEffort: analysis.loadEffort ?? analysis.loadAssessment?.effort ?? null,
  };
}

export function analysisWithNr17Report(analysis: Analysis): Analysis {
  const effort = analysis.loadEffort ?? analysis.loadAssessment?.effort ?? null;
  const missing =
    !analysis.nr17Report ||
    !analysis.nr17Report.ergoIndices ||
    (effort && !analysis.nr17Report.items.some((i) => i.id === 'peso-distancia-indice'));
  if (!missing) return analysis;
  const nioshLi = analysis.v2Report?.methods.find((m) => m.methodId === 'niosh')?.outputs?.LI;
  return {
    ...analysis,
    nr17Report: buildNr17SessionReport({
      ...nr17ReportParams(analysis),
      rula: analysis.rula,
      reba: analysis.reba,
      nioshLi: nioshLi != null ? Number(nioshLi) : null,
    }),
  };
}

export interface PdfExportOptions {
  companyName?: string;
  evaluatorName?: string;
  evaluatorRole?: string;
  includeSignatureBlock?: boolean;
}

function drawErgoIndicesSummary(
  doc: jsPDF,
  indices: import('./ergoIndices').ErgoSenseIndices,
  sampling: import('./samplingConfidence').SamplingConfidenceResult | undefined,
  y: number,
  onNewPage: () => void,
): number {
  const { marginLeft } = getA4Sizes(doc);
  let cy = ensureSpace(doc, y, 40, onNewPage);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(35, 35, 35);
  doc.text('Índices ErgoSense (metodologia proprietária — apoio AEP/AET)', marginLeft, cy);
  cy += 8;

  const rows = [
    ['IERE — Risco Ergonômico', String(indices.riskIndex)],
    ['IEE — Exposição', String(indices.exposureIndex)],
    ['IECI — Conformidade Interna', String(indices.internalConformityIndex)],
  ];
  cy = drawTable(
    doc,
    [
      { key: 'k', title: 'Índice', widthMm: 90 },
      { key: 'v', title: 'Valor (0–100)', widthMm: 80 },
    ],
    rows.map(([k, v]) => ({ k, v })),
    cy,
    onNewPage,
  );

  if (sampling) {
    cy = wrapTextLeft(doc, `Confiabilidade estatística: ${sampling.label}`, cy, 10, onNewPage);
    cy = wrapTextJustified(doc, sampling.description, cy, 9, onNewPage);
  }

  cy = wrapTextJustified(
    doc,
    `Fórmula IERE: ${indices.formulas.riskIndex.formula}. Não representa percentual legal oficial NR-17.`,
    cy,
    8,
    onNewPage,
  );
  doc.setTextColor(40, 40, 40);
  return cy + 4;
}

export async function exportAnalysisPdf(
  analysis: Analysis,
  options: PdfExportOptions = {},
): Promise<string> {
  const full = analysisWithNr17Report(analysis);
  const nr17 = full.nr17Report!;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { pageW, contentW, centerX } = getA4Sizes(doc);
  const company = options.companyName ?? 'Empresa';
  const pageHeader = `${company} · ${full.collaboratorName} · ${full.date}`;
  /** Só reserva A4_TOP_NEXT; cabeçalho é aplicado uma vez ao final (evita texto duplicado). */
  const onNewPage = () => {};

  // Página 1 — capa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 168, 0);
  doc.text('ErgoSense', centerX, A4_TOP_FIRST, { align: 'center' });
  doc.setFontSize(13);
  doc.setTextColor(35, 35, 35);
  doc.text('Laudo Ergonômico — Apoio AEP/AET', centerX, A4_TOP_FIRST + 9, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Avaliação ergonômica · Margens 2 cm · Formato A4', centerX, A4_TOP_FIRST + 15, {
    align: 'center',
  });

  let y = drawContentRule(doc, A4_TOP_FIRST + 22);

  y = wrapTextLeft(doc, `Empresa: ${company}`, y, 11, onNewPage);
  y = wrapTextLeft(doc, `Colaborador: ${full.collaboratorName}`, y, 11, onNewPage);
  y = wrapTextLeft(doc, `Setor: ${full.setor}`, y, 11, onNewPage);
  const ctx = full.activityContext ? contextLabel(full.activityContext) : 'Geral';
  y = wrapTextLeft(doc, `Atividade: ${full.activity}`, y, 11, onNewPage);
  y = wrapTextLeft(doc, `Ambiente: ${ctx}`, y, 11, onNewPage);
  y = wrapTextLeft(doc, `Data: ${full.date} às ${full.time}`, y, 11, onNewPage);
  y = wrapTextLeft(
    doc,
    `Duração: ${Math.floor((full.recordingSecs ?? 0) / 60)} min ${(full.recordingSecs ?? 0) % 60} s · ${nr17.sampleCount} amostras`,
    y,
    10,
    onNewPage,
  );

  y = drawErgoIndicesSummary(doc, nr17.ergoIndices, nr17.samplingConfidence, y + 4, onNewPage);
  y = wrapTextLeft(doc, `Situação checklist: ${nr17StatusLabel(nr17.overallStatus)} · Tempo em risco: ${nr17.riskTimePct}%`, y, 10, onNewPage);

  y = sectionTitle(doc, 'Resumo da avaliação', y, onNewPage);
  y = drawTable(
    doc,
    [
      { key: 'k', title: 'Indicador', widthMm: 55 },
      { key: 'v', title: 'Resultado', widthMm: 115 },
    ],
    [
      { k: 'Score ergonômico', v: `${full.score}/100 (${riskLabel(full.risk)})` },
      { k: 'RULA', v: String(full.rula) },
      { k: 'REBA', v: String(full.reba) },
      { k: 'Situação geral', v: nr17StatusLabel(nr17.overallStatus) },
    ],
    y,
    onNewPage,
  );
  y = wrapTextJustified(doc, nr17.summary, y, 11, onNewPage);

  if (full.captureImage) {
    y = sectionTitle(doc, 'Registro visual da sessão', y, onNewPage);
    try {
      const img = await compressImageForPdf(full.captureImage);
      const maxImgH = 80;
      let drawW = contentW;
      let drawH = (img.height / img.width) * drawW;
      if (drawH > maxImgH) {
        drawH = maxImgH;
        drawW = (img.width / img.height) * drawH;
      }
      y = ensureSpace(doc, y, drawH + 12, onNewPage);
      doc.addImage(img.dataUrl, 'JPEG', imageXForWidth(pageW, drawW), y, drawW, drawH);
      y += drawH + 10;
    } catch {
      y = wrapTextLeft(doc, '(Imagem não incorporada.)', y, 9, onNewPage);
    }
  }

  if (full.v2Report?.methods) {
    const niosh = full.v2Report.methods.find((m) => m.methodId === 'niosh');
    if (niosh?.outputs) {
      y = sectionTitle(doc, 'NIOSH RNLE — multiplicadores', y, onNewPage);
      y = drawTable(
        doc,
        [
          { key: 'k', title: 'Fator', widthMm: 40 },
          { key: 'v', title: 'Valor', widthMm: 130 },
        ],
        [
          { k: 'HM', v: String(niosh.outputs.HM ?? '—') },
          { k: 'VM', v: String(niosh.outputs.VM ?? '—') },
          { k: 'DM', v: String(niosh.outputs.DM ?? '—') },
          { k: 'AM', v: String(niosh.outputs.AM ?? '—') },
          { k: 'FM', v: String(niosh.outputs.FM ?? '—') },
          { k: 'CM', v: String(niosh.outputs.CM ?? '—') },
          { k: 'RWL', v: `${niosh.outputs.RWL} kg` },
          { k: 'LI', v: String(niosh.outputs.LI) },
          { k: 'Classificação', v: niosh.classificationLabel },
        ],
        y,
        onNewPage,
      );
    }
  }

  if (full.traceability) {
    y = sectionTitle(doc, 'Rastreabilidade técnica', y, onNewPage);
    y = wrapTextLeft(doc, `Engine: ErgoSense ${full.traceability.engineVersion}`, y, 9, onNewPage);
    y = wrapTextLeft(doc, `Modelo IA: ${full.traceability.poseModel}`, y, 9, onNewPage);
    y = wrapTextLeft(doc, `Critérios: v${full.traceability.criteriaVersion} · Base normativa: ${full.traceability.normBaseDate}`, y, 9, onNewPage);
    y = wrapTextLeft(doc, `Avaliador: ${full.traceability.userName} (${full.traceability.userEmail})`, y, 9, onNewPage);
  }

  const le = full.loadEffort ?? full.loadAssessment?.effort;
  if (le) {
    y = sectionTitle(doc, 'Peso × distância da carga', y, onNewPage);
    y = drawTable(
      doc,
      [
        { key: 'k', title: 'Parâmetro', widthMm: 55 },
        { key: 'v', title: 'Valor', widthMm: 115 },
      ],
      [
        { k: 'Peso', v: `${le.weightKg} kg` },
        { k: 'Distância ao tronco', v: `${le.distanceCm} cm` },
        { k: 'Índice', v: String(le.indiceEsforco) },
        { k: 'Risco', v: riskLabel(le.risk) },
      ],
      y,
      onNewPage,
    );
    y = wrapTextJustified(doc, le.recomendacao, y, 10, onNewPage);
  } else if (full.loadResult) {
    const lr = full.loadResult;
    y = sectionTitle(doc, 'Movimentação de cargas', y, onNewPage);
    y = drawTable(
      doc,
      [
        { key: 'k', title: 'Parâmetro', widthMm: 55 },
        { key: 'v', title: 'Valor', widthMm: 115 },
      ],
      [
        { k: 'Distância ao tronco', v: `${lr.distanceCmUsed} cm` },
        { k: 'Limite NIOSH (postura atual)', v: `${lr.pesoLimiteKg} kg` },
        { k: 'Utilização do limite', v: `${lr.utilizacaoPct}%` },
        { k: 'Classificação', v: riskLabel(lr.risk) },
      ],
      y,
      onNewPage,
    );
    y += 2;
    y = sectionTitle(doc, 'Análise técnica da carga', y, onNewPage);
    for (const line of lr.justificativa) {
      y = wrapTextJustified(doc, line, y, 10, onNewPage);
      y += 3;
    }
    if (lr.recomendacoes.length > 0) {
      y = sectionTitle(doc, 'Recomendações de carga', y, onNewPage);
      for (const rec of lr.recomendacoes.slice(0, 5)) {
        y = wrapTextLeft(doc, `${rec.titulo} (${rec.prioridade})`, y, 10, onNewPage);
        y = wrapTextJustified(doc, rec.detalhe, y, 9, onNewPage);
        y += 2;
      }
    }
  }

  // Checklist — resumo em tabela (colunas curtas, sem texto longo)
  y = sectionTitle(doc, 'Checklist NR-17 — visão geral', y, onNewPage);
  y = drawTable(
    doc,
    [
      { key: 'item', title: 'Item', widthMm: 95 },
      { key: 'sit', title: 'Situação', widthMm: 35 },
      { key: 'ref', title: 'Referência', widthMm: 40 },
    ],
    nr17.items.map((item) => ({
      item: item.titulo,
      sit: nr17StatusLabel(item.status),
      ref: item.referencia,
    })),
    y,
    onNewPage,
  );

  // Detalhamento — um bloco por item (paginação correta em todas as folhas)
  y = sectionTitle(doc, 'Detalhamento técnico por item', y, onNewPage);
  for (const item of nr17.items) {
    y = drawNr17ChecklistItem(
      doc,
      {
        titulo: item.titulo,
        status: nr17StatusLabel(item.status),
        referencia: item.referencia,
        detalhe: item.detalhe,
      },
      y,
      onNewPage,
    );
  }

  if (nr17.recommendations.length > 0) {
    y = sectionTitle(doc, 'Correções recomendadas', y, onNewPage);
    nr17.recommendations.forEach((rec, i) => {
      y = wrapTextLeft(doc, `${i + 1}. ${rec.title}`, y, 10, onNewPage);
      y = wrapTextJustified(doc, rec.detail, y, 10, onNewPage);
    });
  }

  if (options.includeSignatureBlock !== false) {
    y = sectionTitle(doc, 'Responsável pela avaliação', y, onNewPage);
    const { marginLeft } = getA4Sizes(doc);
    doc.setDrawColor(200, 200, 200);
    doc.line(marginLeft, y + 10, marginLeft + 70, y + 10);
    y += 18;
    y = wrapTextLeft(
      doc,
      options.evaluatorName ? `Nome: ${options.evaluatorName}` : 'Nome: _________________________________________',
      y,
      10,
      onNewPage,
    );
    y = wrapTextLeft(
      doc,
      options.evaluatorRole ? `Função: ${options.evaluatorRole}` : 'Função: Ergonomista / SESMT',
      y,
      10,
      onNewPage,
    );
    y = wrapTextLeft(doc, `Data: ${full.date}`, y, 10, onNewPage);
    y = wrapTextLeft(doc, `Empresa: ${company}`, y, 10, onNewPage);
  }

  wrapTextJustified(
    doc,
    'Documento de apoio à gestão de SST. Revisão por profissional habilitado obrigatória para fins legais.',
    y + 4,
    8,
    onNewPage,
  );

  // Cabeçalho em TODAS as páginas exceto a primeira
  const total = doc.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    drawPageHeader(doc, pageHeader);
  }

  addDocumentFooter(doc, 'ErgoSense · NR-17 · Uso corporativo');

  const filename = `ErgoSense_NR17_${pdfSafeFilename(full.collaboratorName)}_${full.date.replace(/\//g, '-')}.pdf`;
  downloadPdfBlob(doc, filename);
  return filename;
}
