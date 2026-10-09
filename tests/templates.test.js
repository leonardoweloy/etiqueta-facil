import test from 'node:test';
import assert from 'node:assert/strict';
import { LabelEditor } from '../src/application/label-editor.js';
import { labelTemplateCatalog, labelFromTemplate } from '../src/domain/label-templates.js';
import { defaultLabel } from '../src/domain/label.js';
import { CanvasRenderer } from '../src/infrastructure/canvas-renderer.js';

const makeEditor = () => new LabelEditor({ repository: { load: () => null, save() {} } });
test('catálogo contém três bases independentes, válidas e editáveis', () => {
  const catalog = labelTemplateCatalog(); assert.equal(catalog.length, 4);
  catalog[0].name = 'modificado'; assert.notEqual(labelTemplateCatalog()[0].name, 'modificado');
  for (const template of catalog) {
    const label = labelFromTemplate(template.id, defaultLabel().snapshot());
    const state = label.snapshot(); assert.equal(state.width, template.width); assert.equal(state.height, template.height);
    for (const item of state.items) {
      assert.ok(item.x >= state.margin && item.y >= state.margin);
      if (item.width) assert.ok(item.x + item.width <= state.width - state.margin);
      if (item.type === 'qr') assert.ok(item.y + item.width <= state.height - state.margin);
      if (item.type === 'barcode') assert.ok(item.y + item.height + 3 <= state.height - state.margin);
    }
    label.update(0, { text: 'Editado' }); assert.equal(label.snapshot().items[0].text, 'Editado');
    assert.notEqual(labelFromTemplate(template.id, state).snapshot().items[0].text, 'Editado');
  }
});
test('aplicação preserva DPI/lote e rejeita modelo desconhecido sem perder estado', () => {
  const editor = makeEditor(); editor.configure({ dpi: 600 }); editor.configureBatch({ start: 20, quantity: 4, prefix: 'PAT-' });
  const before = editor.snapshot(); editor.applyTemplate('asset-horizontal-58mm'); const state = editor.snapshot();
  assert.equal(state.dpi, 600); assert.deepEqual(state.batch, before.batch); assert.equal(state.height, 30);
  assert.equal(state.items[0].text, 'WADS.DEV'); assert.equal(state.items.some(item => item.type === 'image'), false);
  assert.equal(state.items.find(item => item.type === 'qr').value, '');
  assert.throws(() => editor.applyTemplate('inexistente')); assert.deepEqual(editor.snapshot(), state);
});
test('excluir último elemento, adicionar depois e limpar preservam configurações', () => {
  const editor = makeEditor(); const before = editor.snapshot();
  while (editor.snapshot().items.length) editor.removeElement(0);
  assert.deepEqual(editor.snapshot().items, []); assert.equal(editor.addText(), 0);
  editor.updateElement(0, { text: 'Recomeço' }); assert.equal(editor.snapshot().items[0].text, 'Recomeço');
  editor.clearElements(); assert.deepEqual(editor.snapshot(), { ...before, items: [] });
  assert.equal(editor.addCode('qr'), 0);
});
test('QR vazio tem placeholder apenas na prévia, nunca na exportação', () => {
  const calls = []; const context = { fillRect(){}, fillText(text){ calls.push(text); }, strokeRect(){}, setLineDash(){}, measureText(){ return { width: 1 }; } };
  const canvas = { width: 464, height: 240, getContext: () => context };
  const renderer = new CanvasRenderer(); const state = { width: 58, height: 30, margin: 1, items: [{ type: 'qr', value: '', width: 12, x: 44, y: 2 }] };
  renderer.draw(canvas, state, { preview: true }); assert.deepEqual(calls, ['QR opcional']);
  calls.length = 0; renderer.draw(canvas, state); assert.deepEqual(calls, []);
});
