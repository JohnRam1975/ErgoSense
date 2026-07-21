/**
 * Exportação de relatórios — Análise Ergonômica por Vídeo
 * PDF · CSV (Excel) · RTF (Word)
 */
import { jsPDF } from 'jspdf';
import type { Analysis } from '../types';
import type { VideoErgonomicReport } from '../types/videoErgo';

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportVideoErgoPdf(analysis: Analysis, companyName: string) {
  const report = analysis.v2Report?.videoErgonomicReport;
  if (!report) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 15;

  doc.setFontSize(16);
  doc.text('ErgoSense — Análise Ergonômica por Vídeo', 15, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`${companyName} · ${analysis.collaboratorName} · ${analysis.date}`, 15, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('Dashboard Executivo', 15, y);
  y += 7;
  doc.setFontSize(10);
  doc.text(`Índice ergonômico: ${report.executive.ergonomicIndex}`, 15, y);
  y += 5;
  doc.text(`Score segurança: ${report.executive.safetyScore}`, 15, y);
  y += 5;
  doc.text(`Conformidade NR-17: ${report.executive.nr17CompliancePct}%`, 15, y);
  y += 5;
  doc.text(`Duração: ${report.durationSecs}s · ${report.frameCount} frames`, 15, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('Scores (RULA · REBA · OWAS)', 15, y);
  y += 7;
  doc.setFontSize(10);
  doc.text(`RULA: ${report.scores.rula.score} — ${report.scores.rula.actionLevel}`, 15, y);
  y += 5;
  doc.text(`REBA: ${report.scores.reba.score} — ${report.scores.reba.riskLevel}`, 15, y);
  y += 5;
  doc.text(`OWAS: Classe ${report.scores.owas.class}`, 15, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('Exposição por região corporal', 15, y);
  y += 7;
  doc.setFontSize(9);
  for (const e of report.exposureByRegion.filter((x) => x.exposurePct > 0).slice(0, 8)) {
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    doc.text(`${e.label}: ${e.exposurePct}% (${e.level})`, 15, y);
    y += 5;
  }
  y += 5;

  doc.setFontSize(12);
  doc.text('Timeline de eventos', 15, y);
  y += 7;
  doc.setFontSize(9);
  for (const ev of report.timeline.slice(0, 12)) {
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    doc.text(`${ev.timeLabel} — ${ev.message}`, 15, y);
    y += 5;
  }
  y += 5;

  doc.setFontSize(12);
  doc.text('Recomendações IA', 15, y);
  y += 7;
  doc.setFontSize(9);
  for (const rec of report.recommendations.slice(0, 5)) {
    if (y > 265) {
      doc.addPage();
      y = 15;
    }
    const lines = doc.splitTextToSize(`• ${rec.problema} → ${rec.acaoCorretiva}`, 180);
    doc.text(lines, 15, y);
    y += lines.length * 4 + 3;
  }

  doc.setFontSize(8);
  doc.text(`Modelo: ${report.modelVersion} · ${report.processedAt}`, 15, 285);

  doc.save(`ErgoSense-Video-${analysis.collaboratorName.replace(/\s+/g, '-')}.pdf`);
}

export function exportVideoErgoExcel(analysis: Analysis) {
  const report = analysis.v2Report?.videoErgonomicReport;
  if (!report) return;

  const rows: string[][] = [
    ['Campo', 'Valor'],
    ['Colaborador', analysis.collaboratorName],
    ['Setor', analysis.setor],
    ['Atividade', analysis.activity],
    ['Data', analysis.date],
    ['Duração (s)', String(report.durationSecs)],
    ['Frames', String(report.frameCount)],
    ['Índice ergonômico', String(report.executive.ergonomicIndex)],
    ['Score segurança', String(report.executive.safetyScore)],
    ['NR-17 %', String(report.executive.nr17CompliancePct)],
    ['RULA', String(report.scores.rula.score)],
    ['REBA', String(report.scores.reba.score)],
    ['OWAS', String(report.scores.owas.class)],
    ['Repetição/min', String(report.repetitiveMovement.movementsPerMinute)],
    [],
    ['Região', 'Exposição %', 'Nível'],
    ...report.exposureByRegion.map((e) => [e.label, String(e.exposurePct), e.level]),
    [],
    ['Horário', 'Evento'],
    ...report.timeline.map((ev) => [ev.timeLabel, ev.message]),
  ];

  const csv = rows.map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadBlob('\uFEFF' + csv, `ErgoSense-Video-${analysis.id}.csv`, 'text/csv;charset=utf-8');
}

export function exportVideoErgoWord(analysis: Analysis, companyName: string) {
  const report = analysis.v2Report?.videoErgonomicReport;
  if (!report) return;

  const exposureRows = report.exposureByRegion
    .filter((e) => e.exposurePct > 0)
    .map((e) => `<tr><td>${e.label}</td><td>${e.exposurePct}%</td><td>${e.level}</td></tr>`)
    .join('');

  const recs = report.recommendations
    .map(
      (r) =>
        `<p><b>${r.problema}</b><br/>Causa: ${r.causaProvavel}<br/>Ação: ${r.acaoCorretiva}<br/>Prioridade: ${r.prioridade}</p>`,
    )
    .join('');

  const rtf = `{\\rtf1\\ansi
{\\b ErgoSense — Análise Ergonômica por Vídeo}\\par
${companyName} · ${analysis.collaboratorName} · ${analysis.date}\\par\\par
Índice ergonômico: ${report.executive.ergonomicIndex}\\par
Score segurança: ${report.executive.safetyScore}\\par
NR-17: ${report.executive.nr17CompliancePct}%\\par
RULA: ${report.scores.rula.score} · REBA: ${report.scores.reba.score} · OWAS: ${report.scores.owas.class}\\par\\par
{\\b Recomendações}\\par
${report.recommendations.map((r) => `- ${r.problema}: ${r.acaoCorretiva}\\par`).join('')}
}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Vídeo ErgoSense</title></head><body>
<h1>Análise Ergonômica por Vídeo</h1>
<p>${companyName} · ${analysis.collaboratorName} · ${analysis.setor}</p>
<h2>Indicadores</h2>
<ul>
<li>Índice ergonômico: ${report.executive.ergonomicIndex}</li>
<li>Score segurança: ${report.executive.safetyScore}</li>
<li>NR-17: ${report.executive.nr17CompliancePct}%</li>
<li>RULA ${report.scores.rula.score} · REBA ${report.scores.reba.score} · OWAS ${report.scores.owas.class}</li>
</ul>
<h2>Exposição corporal</h2>
<table border="1"><tr><th>Região</th><th>%</th><th>Nível</th></tr>${exposureRows}</table>
<h2>Recomendações</h2>${recs}
<p><small>Modelo: ${report.modelVersion}</small></p>
</body></html>`;

  downloadBlob(rtf, `ErgoSense-Video-${analysis.id}.rtf`, 'application/rtf');
  downloadBlob(html, `ErgoSense-Video-${analysis.id}.html`, 'text/html;charset=utf-8');
}

export function getVideoReport(analysis: Analysis): VideoErgonomicReport | undefined {
  return analysis.v2Report?.videoErgonomicReport;
}
