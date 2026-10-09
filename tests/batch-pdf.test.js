import test from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import qrcode from 'qrcode-generator';
import { LabelBatch, materializeLabel } from '../src/domain/batch.js';
import { defaultLabel, Label } from '../src/domain/label.js';
import { PdfExporter } from '../src/infrastructure/pdf-exporter.js';
import { barcodeRects, qrRects } from '../src/infrastructure/code-geometry.js';

test('lotes inclusivos, prefixo e zeros sem truncar', () => {
  const batch = new LabelBatch({ mode:'range', start:98, end:100, prefix:'EQ-', digits:2 });
  assert.equal(batch.count,3); assert.equal(batch.identifier(2),'EQ-100');
  assert.equal(new LabelBatch().identifier(),'INV-000124');
});
test('lotes rejeitam limites, decimais, fim reverso e ASCII inválido', () => {
  const base = new LabelBatch().snapshot();
  for(const patch of [{quantity:501},{quantity:0},{start:1.5},{start:-1},{start:Number.MAX_SAFE_INTEGER,quantity:2},{mode:'range',end:1},{prefix:'á'},{digits:0}]) assert.throws(()=>new LabelBatch({...base,...patch}));
});
test('dados antigos preservados e QR opcional validado', () => {
  const state=defaultLabel().snapshot(); delete state.batch;
  const label=new Label(state); assert.equal(label.snapshot().items.length,4);
  label.add({type:'qr',value:'',x:0,y:0,width:10});
  assert.throws(()=>label.add({type:'qr',value:'a'.repeat(501),x:0,y:0,width:10}));
  assert.deepEqual(qrRects({value:''}),[]);
});
test('geometrias Code128 e QR são retângulos dentro do tamanho', () => {
  const item={x:2,y:3,width:40,height:8};
  const bars=barcodeRects('INV-000124',item,JsBarcode); assert.ok(bars.length>10);
  assert.ok(bars.every(r=>r.x>=2&&r.x+r.w<=42));
  const squares=qrRects({...item,value:'Olá 世界'},qrcode); assert.ok(squares.length>100);
  assert.ok(squares.every(r=>r.x>2&&r.y>3&&r.x+r.w<42&&r.y+r.h<43));
});
test('PDF real contém páginas mm, texto e vetores sem imagens para códigos',async()=>{
  for(const [width,height] of [[58,35],[20,40]]) {
    const state=defaultLabel().snapshot();state.width=width;state.height=height;
    state.items=[{type:'text',text:'PATRIMÔNIO',x:1,y:1,size:2,weight:'bold'},{type:'barcode',x:1,y:5,width:18,height:5},{type:'qr',value:'https://example.test',x:1,y:14,width:10}];
    const labels=[materializeLabel(state,'INV-000001'),materializeLabel(state,'INV-000002')];
    const blob=await new PdfExporter({pdf:()=>jsPDF,barcode:JsBarcode,qr:qrcode}).export(labels);
    const pdf=Buffer.from(await blob.arrayBuffer()).toString('latin1');
    assert.equal((pdf.match(/\/Type \/Page\b/g)||[]).length,2);
    const boxes=[...pdf.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)];assert.equal(boxes.length,2);
    for(const box of boxes){assert.ok(Math.abs(Number(box[1])-width*72/25.4)<0.01);assert.ok(Math.abs(Number(box[2])-height*72/25.4)<0.01);}
    assert.doesNotMatch(pdf,/\/Subtype \/Image/);assert.equal(blob.type,'application/pdf');
  }
});
