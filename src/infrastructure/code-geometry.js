/** Geometry shared by the canvas preview/JPG and vector PDF adapters. */
export function barcodeRects(value, item, encoder = globalThis.JsBarcode) {
  if (!encoder) throw new Error('Gerador Code128 local não carregado.');
  const encoded = {};
  encoder(encoded, value, { format: 'CODE128', displayValue: false, margin: 0 });
  const bits = encoded.encodings.map(part => part.data).join('');
  const unit = item.width / (bits.length + 20); // 10-module quiet zones
  const rectangles = [];
  for (let i = 0; i < bits.length;) {
    if (bits[i] !== '1') { i++; continue; }
    let end = i + 1; while (bits[end] === '1') end++;
    rectangles.push({ x: item.x + (i + 10) * unit, y: item.y, w: (end - i) * unit, h: item.height }); i = end;
  }
  return rectangles;
}
export function qrRects(item, encoder = globalThis.qrcode) {
  if (!item.value) return [];
  if (!encoder) throw new Error('Gerador QR local não carregado.');
  const qr = encoder(0, 'M');
  // Explicit UTF-8 byte encoding, including non-Latin characters.
  const bytes = new TextEncoder().encode(item.value);
  qr.addData(String.fromCharCode(...bytes), 'Byte'); qr.make();
  const count = qr.getModuleCount(), unit = item.width / (count + 8);
  const rectangles = [];
  for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) {
    if (qr.isDark(y, x)) rectangles.push({ x: item.x + (x + 4) * unit, y: item.y + (y + 4) * unit, w: unit, h: unit });
  }
  return rectangles;
}
