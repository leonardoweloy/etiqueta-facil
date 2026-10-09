import test from 'node:test';
import assert from 'node:assert/strict';
import { CsvLabelBatch, parseCsv, resolveCsvTemplate } from '../src/domain/csv-batch.js';
import { LabelEditor } from '../src/application/label-editor.js';
import { PdfExporter } from '../src/infrastructure/pdf-exporter.js';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import qrcode from 'qrcode-generator';
test('CSV quoted escaped multiline CRLF delimiters and leading zeros',()=>{
 for(const sep of [';',',','\t']) { const p=parseCsv('nome'+sep+'id\r\n"Monitor'+sep+' TI"'+sep+'00001\r\n"Diz ""Olá""\r\nMundo"'+sep+'00002',{header:true}); assert.equal(p.rows[0][1],'00001');assert.equal(p.rows[1][0],'Diz "Olá"\nMundo');assert.deepEqual(p.lineNumbers,[2,3]); }
});
test('CSV rejects malformed quotes duplicates missing columns and excessive rows',()=>{
 for(const s of ['"ab','a"b','"a"b','a;b\n1'])assert.throws(()=>parseCsv(s));
 assert.throws(()=>parseCsv('a;a\n1;2',{header:true}),/duplicado/);assert.throws(()=>parseCsv('coluna2;id\n1;2',{header:true}),/conflita/);
 assert.equal(parseCsv(Array(500).fill('001').join('\n')).rows.length,500);assert.throws(()=>parseCsv(Array(501).fill('001').join('\n')),/500/);assert.equal(new CsvLabelBatch().count,0);
});
test('resolver mixing aliases missing malformed and literal data braces',()=>{
 assert.equal(resolveCsvTemplate('ID {{coluna1}} / {{ id }}',{coluna1:'001',id:'001'}),'ID 001 / 001');assert.equal(resolveCsvTemplate('{{id}}',{id:'{{literal}}'}),'{{literal}}');assert.throws(()=>resolveCsvTemplate('{{missing}}',{},4),/Linha 4/);assert.throws(()=>resolveCsvTemplate('{{id',{}),/inválida/);
});
function create(){let saved=null;const repository={load:()=>saved,save:state=>saved=structuredClone(state)};const outputs=[];const editor=new LabelEditor({repository,exporter:{export:s=>outputs.push(s)},pdfExporter:{export:s=>outputs.push(s)}});editor.configure({batchMode:'csv'});editor.configureCsv({data:'equipamento;identificador\nMonitor;000001\nNotebook;000002',header:true});editor.applyTemplate('asset-horizontal-csv');return {editor,repository,outputs};}
test('application selected JPG all PDF reload and atomic invalid CSV',()=>{
 const {editor,repository,outputs}=create();editor.selectRow(1);editor.exportJpeg();assert.equal(outputs[0].items[1].text,'Notebook');assert.equal(outputs[0].items[4].value,'000002');editor.exportPdf();assert.equal(outputs[1].length,2);const before=editor.snapshot();assert.throws(()=>editor.configureCsv({data:'a;a',header:true}));assert.deepEqual(editor.snapshot(),before);assert.equal(new LabelEditor({repository}).preview().items[4].value,'000001');editor.updateElement(4,{value:'{{equipamento}}'});editor.configureCsv({data:'equipamento;identificador\nMonitór;001'});assert.throws(()=>editor.exportPdf(),/Linha 2.*ASCII/);
});
test('real PDF CSV pages preserve physical mm dimensions',async()=>{
 const {editor}=create();editor.pdfExporter=new PdfExporter({pdf:()=>jsPDF,barcode:JsBarcode,qr:qrcode});const blob=await editor.exportPdf();const pdf=Buffer.from(await blob.arrayBuffer()).toString('latin1');assert.equal((pdf.match(/\/Type \/Page\b/g)||[]).length,2);for(const m of pdf.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)){assert.ok(Math.abs(Number(m[1])-58*72/25.4)<0.01);assert.ok(Math.abs(Number(m[2])-30*72/25.4)<0.01);}
});
