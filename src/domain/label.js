import { LabelBatch, defaultBatch } from './batch.js';
import { CsvLabelBatch, defaultCsvBatch } from './csv-batch.js';
/** Domínio puro: não depende de DOM, Canvas ou armazenamento. */
export class Millimeters {
  constructor(value, min = 0, max = 300) {
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new RangeError('Medida em milímetros fora do intervalo permitido.');
    }
    this.value = value;
    Object.freeze(this);
  }
}

export class PrintResolution {
  constructor(value) {
    if (![203, 300, 600].includes(value)) throw new RangeError('Resolução inválida.');
    this.value = value;
    Object.freeze(this);
  }
  pixels(mm) { return Math.round(mm / 25.4 * this.value); }
}

function validateItem(item) {
  if (!item || !['text', 'image', 'barcode', 'qr'].includes(item.type)) throw new Error('Elemento inválido.');
  new Millimeters(item.x, -300, 300); new Millimeters(item.y, -300, 300);
  if (item.type === 'text') {
    new Millimeters(item.size, 1, 50);
    if (typeof item.text !== 'string' || !['normal', 'bold'].includes(item.weight)) {
      throw new Error('Texto inválido.');
    }
  } else if (item.type === 'barcode' || item.type === 'qr') {
    if (item.type === 'barcode' && item.value !== undefined && typeof item.value !== 'string') throw new Error('Conteúdo Code128 deve ser texto.');
    new Millimeters(item.width, 5);
    if (item.type === 'barcode') new Millimeters(item.height, 3, 100);
    if (item.type === 'qr' && (typeof item.value !== 'string' || new TextEncoder().encode(item.value).length > 500)) throw new Error('QR aceita até 500 bytes UTF-8. Campo vazio não gera QR.');
  } else {
    new Millimeters(item.width, 1);
    if (typeof item.src !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(item.src)) {
      throw new Error('Imagem inválida.');
    }
  }
  return structuredClone(item);
}

/** Etiqueta é a raiz do agregado; alterações passam por suas operações. */
export class Label {
  #data;
  constructor(data) {
    new Millimeters(data.width, 5); new Millimeters(data.height, 5);
    new Millimeters(data.margin, 0, 30); new PrintResolution(data.dpi);
    if (data.margin * 2 >= Math.min(data.width, data.height)) throw new RangeError('Margem excessiva.');
    if (data.batchMode && !['sequential', 'csv'].includes(data.batchMode)) throw new Error('Modo de lote inválido.');
    if (!Array.isArray(data.items)) throw new Error('Elementos inválidos.');
    this.#data = { width: data.width, height: data.height, margin: data.margin,
      dpi: data.dpi, batchMode: data.batchMode ?? 'sequential', csv: new CsvLabelBatch(data.csv ?? defaultCsvBatch()).snapshot(), batch: new LabelBatch(data.batch ?? defaultBatch()).snapshot(), items: data.items.map(validateItem) };
  }
  snapshot() { return structuredClone(this.#data); }
  configure(patch) {
    const next = { ...this.snapshot(), ...patch };
    next.margin = Math.min(next.margin, (Math.min(next.width, next.height) - 1) / 2);
    this.#data = new Label(next).snapshot();
  }
  useTape(width) {
    if (![20, 58].includes(width)) throw new RangeError('Perfil de fita inválido.');
    this.configure({ width, height: width === 20 ? 40 : 35, margin: Math.min(this.#data.margin, 2) });
  }
  add(item) { this.#data.items.push(validateItem(item)); return this.#data.items.length - 1; }
  update(index, patch) {
    this.#require(index);
    this.#data.items[index] = validateItem({ ...this.#data.items[index], ...patch });
  }
  remove(index) { this.#require(index); this.#data.items.splice(index, 1); }
  move(index, x, y) {
    const round = value => Math.round(value * 10) / 10;
    this.update(index, { x: round(Math.max(-300, Math.min(300, x))),
      y: round(Math.max(-300, Math.min(300, y))) });
  }
  #require(index) {
    if (!Number.isInteger(index) || !this.#data.items[index]) throw new RangeError('Elemento não encontrado.');
  }
}

export function defaultLabel() {
  return new Label({ width: 58, height: 35, margin: 2, dpi: 203, items: [
    { type: 'text', text: 'PATRIMÔNIO', x: 5, y: 5, size: 3, weight: 'bold' },
    { type: 'text', text: 'NOTEBOOK · TI', x: 5, y: 12, size: 2.5, weight: 'normal' },
    { type: 'text', text: 'INV-000124', x: 5, y: 20, size: 4, weight: 'bold' },
    { type: 'text', text: 'WADS.DEV  /  2026', x: 5, y: 28, size: 1.8, weight: 'normal' }
  ] });
}
