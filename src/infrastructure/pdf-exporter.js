import { barcodeRects, qrRects } from './code-geometry.js';
/** Browser-local PDF port: page size in mm; text and codes never use canvas. */
export class PdfExporter {
  constructor({ pdf = () => globalThis.jspdf?.jsPDF, barcode, qr } = {}) {
    this.pdf = pdf; this.barcode = barcode; this.qr = qr;
  }
  async export(labels) {
    const first = labels[0];
    if (!first) throw new Error('Lote vazio.');
    const Pdf = this.pdf();
    if (!Pdf) throw new Error('Gerador PDF local não carregado.');
    const orientation = first.width > first.height ? 'landscape' : 'portrait';
    const doc = new Pdf({ unit: 'mm', format: [first.width, first.height], orientation, compress: true });
    for (let page = 0; page < labels.length; page++) {
      const state = labels[page];
      if (page) doc.addPage([state.width, state.height], orientation);
      doc.setFillColor(0); doc.setTextColor(0);
      for (const item of state.items) {
        if (item.type === 'text') {
          doc.setFont('helvetica', item.weight); doc.setFontSize(item.size * 72 / 25.4);
          doc.text(item.text.split('\n'), item.x, item.y, { baseline: 'top', lineHeightFactor: 1.2 });
        } else if (item.type === 'image') {
          const properties = doc.getImageProperties(item.src);
          doc.addImage(item.src, properties.fileType, item.x, item.y, item.width, item.width * properties.height / properties.width);
        } else {
          const rectangles = item.type === 'barcode' ? barcodeRects(item.value, item, this.barcode) : qrRects(item, this.qr);
          for (const r of rectangles) doc.rect(r.x, r.y, r.w, r.h, 'F');
          if (item.type === 'barcode') {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(2 * 72 / 25.4);
            doc.text(item.value, item.x + item.width / 2, item.y + item.height + 0.5, { baseline: 'top', align: 'center' });
          }
        }
      }
      // Yield to the browser between pages; limits keep work/memory bounded.
      if (page % 20 === 19) await new Promise(resolve => setTimeout(resolve, 0));
    }
    return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
  }
}
