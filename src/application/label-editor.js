import { Label, defaultLabel } from '../domain/label.js';

/** Portas injetadas: repository load/save; exporter export(snapshot). */
export class LabelEditor {
  constructor({ repository, exporter, onPersistenceError = () => {} }) {
    this.repository = repository;
    this.exporter = exporter;
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
  exportJpeg() { return this.exporter.export(this.snapshot()); }
}
