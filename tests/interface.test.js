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
  const windowListeners = {}; let confirmed = false;
  globalThis.window={addEventListener(type, callback){windowListeners[type]=callback;},confirm:()=>confirmed};globalThis.JsBarcode=JsBarcode;globalThis.qrcode=qrcode;
  try {
    await import('../app.js');
    assert.equal(window.etiquetaPrinterSource(false).length,1);
    assert.ok(window.etiquetaPrinterSource(true).length>=1);
    assert.match(node('dimensions').textContent,/58 × 35/);
    node('preset').value='20'; node('preset').onchange();
    assert.match(node('dimensions').textContent,/20 × 40/);
    node('addText').onclick();
    node('x').value='-3';node('x').listeners.input();
    assert.equal(JSON.parse(storage.get('etiqueta-project')).items.at(-1).x,-3);
    assert.equal(JSON.parse(storage.get('etiqueta-project')).items.length,5);
    node('batchQuantity').value='3';node('batchQuantity').listeners.change();
    assert.equal(JSON.parse(storage.get('etiqueta-project')).batch.quantity,3);
    node('addBarcode').onclick(); assert.equal(JSON.parse(storage.get('etiqueta-project')).items.at(-1).type,'barcode');
    node('addQr').onclick();node('qrValue').value='https://example.test';node('qrValue').listeners.change();
    assert.equal(JSON.parse(storage.get('etiqueta-project')).items.at(-1).value,'https://example.test');
    node('batchQuantity').value='501';node('batchQuantity').listeners.change();
    assert.match(node('message').textContent,/500/);assert.equal(JSON.parse(storage.get('etiqueta-project')).batch.quantity,3);
    node('real').onclick(); assert.ok(node('canvas').style.width.endsWith('px'));
    const saved = () => JSON.parse(storage.get('etiqueta-project'));
    const count = saved().items.length;
    const key = (target, name = 'Delete', extra = {}) => {
      let prevented = false;
      windowListeners.keydown({ key: name, target, preventDefault(){prevented=true;}, ...extra });
      return prevented;
    };
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      assert.equal(key({tagName}), false); assert.equal(saved().items.length, count);
    }
    assert.equal(key({isContentEditable:true}), false);
    assert.equal(key({closest:()=>({})}), false);
    assert.equal(key({}, 'Delete', {isComposing:true}), false);
    document.activeElement = {tagName:'INPUT'}; assert.equal(key({}), false); delete document.activeElement;
    assert.equal(key({}), true); assert.equal(saved().items.length, count-1);
    node('template').value = 'asset-horizontal-58mm'; node('template').onchange();
    node('applyTemplate').onclick(); assert.equal(saved().items.length, count-1);
    confirmed = true; node('applyTemplate').onclick();
    assert.equal(saved().height, 34); assert.equal(saved().items[0].text, 'WADS.DEV'); assert.equal(saved().batch.quantity, 3);
    assert.match(node('selectionName').textContent, /WADS.DEV/);
    confirmed = false; node('clearLabel').onclick(); assert.equal(saved().items.length,5);
    confirmed = true; node('clearLabel').onclick(); assert.equal(saved().items.length,0);
    assert.equal(node('previewRemove').disabled,true); assert.equal(node('remove').disabled,true);
    assert.match(node('selectionName').textContent,/Nenhum/); assert.equal(key({},'Backspace'),false);
    node('addText').onclick(); assert.equal(Number(node('elements').value),0); assert.equal(node('previewRemove').disabled,false);
    assert.equal(key({},'Backspace'),true); assert.equal(saved().items.length,0);
    node('addText').onclick(); node('previewRemove').onclick(); assert.equal(saved().items.length,0);
    node('addText').onclick(); node('remove').onclick(); assert.equal(saved().items.length,0);
    node('sourceMode').value='csv';node('sourceMode').listeners.change();assert.equal(node('export').disabled,true);assert.match(node('csvError').textContent,/importe/);
    node('csvData').value='equipamento;identificador;codigo\nMonitor;00001;00001\nNotebook;00002;00002';node('csvHeader').checked=true;node('csvSeparator').value='auto';node('importCsv').onclick();assert.equal(saved().csv.header,true);assert.match(node('csvCount').textContent,/2 etiquetas/);assert.match(node('csvColumns').textContent,/coluna2/);
    node('template').value='asset-horizontal-csv';node('template').onchange();node('applyTemplate').onclick();assert.equal(node('export').disabled,false);node('csvNext').onclick();assert.equal(node('csvPosition').textContent,'2 / 2');node('csvPrevious').onclick();assert.equal(node('csvPosition').textContent,'1 / 2');
    const csvBefore=saved().csv;node('csvData').value='a;a';node('importCsv').onclick();assert.match(node('message').textContent,/duplicado/);assert.deepEqual(saved().csv,csvBefore);
    node('elements').value='4';node('elements').onchange();assert.equal(node('qrValue').disabled,false);node('qrValue').value='{{missing}}';node('qrValue').listeners.change();assert.equal(node('export').disabled,true);assert.match(node('csvError').textContent,/Linha 2.*missing/);
  } finally {
    delete globalThis.document;delete globalThis.localStorage;delete globalThis.window;delete globalThis.JsBarcode;delete globalThis.qrcode;
  }
});
