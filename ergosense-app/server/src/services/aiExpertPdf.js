/**
 * Geração de PDF estruturado para documentos do AI Expert.
 */
import PDFDocument from 'pdfkit';

export function generateStructuredPdf({ title, subtitle, sections = [], disclaimer }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(0.5);
    if (subtitle) {
      doc.fontSize(11).font('Helvetica').fillColor('#444444').text(subtitle, { align: 'center' });
      doc.fillColor('#000000');
    }
    doc.moveDown(1);

    if (disclaimer) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666666').text(disclaimer, { align: 'justify' });
      doc.fillColor('#000000');
      doc.moveDown(1);
    }

    for (const section of sections) {
      if (section.title) {
        doc.fontSize(13).font('Helvetica-Bold').text(section.title);
        doc.moveDown(0.3);
      }
      const body = typeof section.content === 'string' ? section.content : JSON.stringify(section.content, null, 2);
      doc.fontSize(10).font('Helvetica').text(body || '—', { align: 'justify' });
      doc.moveDown(0.8);

      if (doc.y > 720) {
        doc.addPage();
      }
    }

    doc.end();
  });
}

export async function buildPdfResponse({ title, sections, disclaimer }) {
  const buffer = await generateStructuredPdf({ title, sections, disclaimer });
  return {
    mimeType: 'application/pdf',
    filename: `${title.replace(/[^\w\-]+/g, '_').slice(0, 60)}.pdf`,
    base64: buffer.toString('base64'),
    sizeBytes: buffer.length,
  };
}
