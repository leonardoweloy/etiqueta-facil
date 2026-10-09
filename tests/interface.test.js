import test from 'node:test';
import assert from 'node:assert/strict';
import JsBarcode from 'jsbarcode';
import qrcode from 'qrcode-generator';
import { withDpi } from '../src/infrastructure/jpeg-exporter.js';

test('metadados JFIF são inseridos e atualizados', () => {
  const original = new Uint8Array([255,216,255,217]);
  const jpg = withDpi(original, 300);
  assert.equal(jpg[13], 1); assert.equal(jpg[14]*256+jpg[15],300);
  const updated = withDpi(jpg, 203);
  assert.equal(updated.length,jpg.length); assert.equal(updated[14]*256+updated[15],203);
});
test('interface inicializa, troca fita e adiciona texto pelos casos de uso', async () => {
  const nodes = new Map();
  const context = { fillRect(){}, fillText(){}, strokeRect(){}, setLineDash(){},
    measureText: text => ({width:text.length*10}) };
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { value:'', style:{}, classList:{toggle(){}}, clientWidth:800,
      listeners:{}, addEventListener(type, callback){this.listeners[type]=callback;}, replaceChildren(){}, getContext:()=>context, checkValidity:()=>true });
    return nodes.get(id);
  }
  globalThis.document={getElementById:node,createElement:()=>({})};
  const storage=new Map();
  globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  globalThis.window={addEventListener(){}};globalThis.JsBarcode=JsBarcode;globalThis.qrcode=qrcode;
  try {
    await import('../app.js');
    assert.match(node('dimensions').textContent,/58 × 35/);
    node('preset').value='20'; node('preset').onchange();
    assert.match(node('dimensions').textContent,/20 × 40/);
    node('addText').onclick();
    assert.equal(JSON.parse(storage.get('etiqueta-project')).items.length,5);
    node('batchQuantity').value='3';node('batchQuantity').listeners.change();
    assert.equal(JSON.parse(storage.get('etiqueta-project')).batch.quantity,3);
    node('addBarcode').onclick(); assert.equal(JSON.parse(storage.get('etiqueta-project')).items.at(-1).type,'barcode');
    node('addQr').onclick();node('qrValue').value='https://example.test';node('qrValue').listeners.change();
    assert.equal(JSON.parse(storage.get('etiqueta-project')).items.at(-1).value,'https://example.test');
    node('batchQuantity').value='501';node('batchQuantity').listeners.change();
    assert.match(node('message').textContent,/500/);assert.equal(JSON.parse(storage.get('etiqueta-project')).batch.quantity,3);
    node('real').onclick(); assert.ok(node('canvas').style.width.endsWith('px'));
  } finally {
    delete globalThis.document;delete globalThis.localStorage;delete globalThis.window;delete globalThis.JsBarcode;delete globalThis.qrcode;
  }
});
