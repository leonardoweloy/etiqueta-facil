import test from 'node:test';
import assert from 'node:assert/strict';
import { Label, defaultLabel, Millimeters, PrintResolution } from '../src/domain/label.js';
import { LabelEditor } from '../src/application/label-editor.js';

test('objetos de valor rejeitam medidas e DPI inválidos', () => {
  for (const value of [NaN, Infinity, -1, 301]) assert.throws(() => new Millimeters(value));
  assert.throws(() => new PrintResolution(72));
  assert.equal(new PrintResolution(203).pixels(58), 464);
});
test('agregado protege seu estado contra mutações externas', () => {
  const label = defaultLabel(); const snapshot = label.snapshot();
  snapshot.items[0].text = 'alterado';
  assert.equal(label.snapshot().items[0].text, 'PATRIMÔNIO');
});
test('presets 20 e 58 mm e margem ao redimensionar', () => {
  const label = defaultLabel(); label.useTape(20);
  assert.equal(label.snapshot().width, 20); assert.equal(label.snapshot().height, 40);
  label.useTape(58); assert.equal(label.snapshot().height, 35);
  label.configure({ margin: 10, width: 5 }); assert.equal(label.snapshot().margin, 2);
});
test('alteração inválida não corrompe o agregado', () => {
  const label = defaultLabel(); const before = label.snapshot();
  assert.throws(() => label.configure({ dpi: 100 }));
  assert.throws(() => label.update(0, { size: 0 }));
  assert.throws(() => label.remove(-1));
  assert.deepEqual(label.snapshot(), before);
});
test('movimento limita coordenadas e mantém precisão decimal', () => {
  const label = defaultLabel(); label.move(0, -5, 99);
  assert.equal(label.snapshot().items[0].x, 0); assert.equal(label.snapshot().items[0].y, 34);
  label.move(0, 3.1415, 4.25); assert.equal(label.snapshot().items[0].x, 3.1);
});
test('dados persistidos inválidos retornam ao padrão', () => {
  const editor = new LabelEditor({ repository: { load: () => ({ width: 58 }), save() {} } });
  assert.equal(editor.snapshot().items.length, 4);
});
test('casos de uso salvam e exportam por portas injetadas', async () => {
  let saved, exported;
  const editor = new LabelEditor({ repository: { load: () => null, save: value => saved = value },
    exporter: { export: async value => { exported = value; return 'jpg'; } } });
  editor.selectTape(20); const index = editor.addText();
  editor.updateElement(index, { text: 'TESTE' });
  assert.equal(saved.items[index].text, 'TESTE');
  assert.equal(await editor.exportJpeg(), 'jpg'); assert.equal(exported.width, 20);
  editor.removeElement(index); assert.equal(editor.snapshot().items.length, 4);
});
test('falha de armazenamento é comunicada sem perder edição', () => {
  let notified = false;
  const editor = new LabelEditor({ repository: { load: () => null, save() { throw Error('quota'); } },
    onPersistenceError: () => notified = true });
  editor.configure({ height: 50 }); assert.equal(editor.snapshot().height, 50); assert.ok(notified);
});
test('imagens aceitam apenas fontes raster locais', () => {
  const data = defaultLabel().snapshot();
  data.items = [{ type: 'image', src: 'https://example.com/image.jpg', x: 0, y: 0, width: 5 }];
  assert.throws(() => new Label(data));
});
