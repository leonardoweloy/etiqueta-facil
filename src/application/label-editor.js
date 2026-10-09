import { Label, defaultLabel } from '../domain/label.js';
import { LabelBatch, materializeLabel } from '../domain/batch.js';
import { labelTemplateCatalog, labelFromTemplate } from '../domain/label-templates.js';

/** Portas injetadas: repository load/save; exporter export(snapshot). */
export class LabelEditor {
  constructor({ repository, exporter, pdfExporter, onPersistenceError = () => {} }) {
    this.repository = repository;
    this.exporter = exporter;
    this.pdfExporter = pdfExporter;
    this.onPersistenceError = onPersistenceError;
    try {
      const saved = repository.load();
      this.label = saved ? new Label(saved) : defaultLabel();
    } catch { this.label = defaultLabel(); }
  }
  snapshot() { return this.label.snapshot(); }
  save() {
    try { this.repository.save(this.snapshot()); }
    catch (error) { this.onPersistenceError(error); }
  }
  configure(patch) { this.label.configure(patch); this.save(); }
  selectTape(width) { this.label.useTape(width); this.save(); }
  templates() { return labelTemplateCatalog(); }
  applyTemplate(id) { this.label = labelFromTemplate(id, this.snapshot()); this.save(); }
  clearElements() { this.label.configure({ items: [] }); this.save(); }
  updateElement(index, patch) { this.label.update(index, patch); this.save(); }
  moveElement(index, x, y) { this.label.move(index, x, y); }
  removeElement(index) { this.label.remove(index); this.save(); }
  addText() {
    const { margin } = this.snapshot();
    const index = this.label.add({ type: 'text', text: 'Novo texto', x: margin, y: margin,
      size: 2.5, weight: 'normal' });
    this.save(); return index;
  }
  addImage(src) {
    const { margin, width } = this.snapshot();
    const index = this.label.add({ type: 'image', src, x: margin, y: margin,
      width: Math.min(15, width - 2 * margin) });
    this.save(); return index;
  }
  configureBatch(patch) { this.configure({ batch: { ...this.snapshot().batch, ...patch } }); }
  preview() { const state = this.snapshot(); return materializeLabel(state, new LabelBatch(state.batch).identifier()); }
  addCode(type) {
    const state = this.snapshot();
    const item = type === 'barcode'
      ? { type, x: state.margin, y: state.margin, width: Math.min(40, state.width - 2 * state.margin), height: 8 }
      : { type: 'qr', value: '', x: state.margin, y: state.margin, width: Math.min(15, state.width - 2 * state.margin) };
    const index = this.label.add(item); this.save(); return index;
  }
  exportJpeg() { return this.exporter.export(this.preview()); }
  exportPdf() {
    const state = this.snapshot(), batch = new LabelBatch(state.batch);
    return this.pdfExporter.export(Array.from({ length: batch.count }, (_, index) => materializeLabel(state, batch.identifier(index))));
  }
}
