import test from 'node:test';
import assert from 'node:assert/strict';
import {packRaster,rasterSize} from '../src/infrastructure/pd01-raster.js';
import {frame,energyFrames,testFrames,Pd01Printer,PD01_SERVICE} from '../src/infrastructure/pd01-printer.js';
test('PD01 energy bounded big endian command order and no implicit maximum',()=>{
 assert.deepEqual(energyFrames('device'),[]);
 for(const [level,value] of [['light',0x3000],['medium',0x5000],['strong',0x7000]]){
 const commands=energyFrames(level);assert.deepEqual([...commands[0]], [...frame(0xaf,[value>>8,value&255])]);assert.deepEqual([...commands[1]],[...frame(0xbe,[1])]);
 const frames=testFrames(level);assert.deepEqual(frames.slice(2,4),commands);assert.equal(frames[4][2],0xa6);
 }
 assert.throws(()=>energyFrames('max'),/inválida/);
});
test('raster preserves scale centered LSB black and transparency',()=>{
 assert.equal(rasterSize({width:58,height:20}).width,384);
 assert.equal(rasterSize({width:20,height:20}).width,157);
 const rows=packRaster({width:2,height:1,data:Uint8Array.from([0,0,0,255,0,0,0,0])});
 assert.equal(rows[0][23],128);assert.equal(rows[0][24],0);
});
test('PD01 labels preflight atomicity limit progress and cancellation',async()=>{
 const {printer,sent}=setup();await printer.connect();
 await assert.rejects(()=>printer.printLabels(Array(21).fill({}),async()=>[]),/20/);assert.equal(sent.length,0);
 let count=0;await assert.rejects(()=>printer.printLabels([{},{}],async()=>{if(++count===2)throw Error('bad CSV');return [new Uint8Array(48)];}),/bad CSV/);assert.equal(sent.length,0);
 const progress=[];await printer.printLabels([{},{}],async()=>[new Uint8Array(48)],p=>progress.push(p));assert.equal(progress.at(-1).index,2);assert.equal(progress.at(-1).percent,100);
 const commands=sent.filter(b=>b[0]===0x51&&b[1]===0x78);
 assert.deepEqual(commands.map(b=>b[2]),[0xa3,0xa4,0xa6,0xa2,0xa2,0xbd,0xa1,0xa6,0xa3]);
 assert.equal(commands.filter(b=>b[2]===0xa1).length,1);
 assert.equal(commands.find(b=>b[2]===0xbd)[6],40);
 await assert.rejects(()=>printer.printLabels([{}],async()=>[new Uint8Array(48)],p=>{if(p.phase==='send')printer.cancel();}),/interrompido/);assert.equal(printer.busy,false);
});
test('PD01 checksum fixtures and sparse 384-dot test',()=>{
 assert.deepEqual([...frame(0xa4,[0x32])],[0x51,0x78,0xa4,0,1,0,0x32,0x9e,255]);
 const rows=testFrames().filter(f=>f[2]===0xa2);assert.equal(rows.length,96);assert.ok(rows.every(f=>f.length===56&&f[4]===48));assert.equal(rows[8][8]&1,1);
});
function setup(){const sent=[];let requested;const tx={properties:{writeWithoutResponse:true},writeValueWithoutResponse:async bytes=>sent.push(bytes)};const gatt={connected:false,connect:async()=>{gatt.connected=true;return {getPrimaryService:async uuid=>{assert.equal(uuid,PD01_SERVICE);return {getCharacteristic:async()=>tx};}};},disconnect:()=>{gatt.connected=false;}};const device={name:'PD01',gatt,addEventListener(){}};const printer=new Pd01Printer({bluetooth:{requestDevice:async opts=>{requested=opts;return device;}},delay:async()=>{}});return {printer,sent,requested:()=>requested};}
test('PD01 connects sends paced small chunks and disconnects',async()=>{const {printer,sent,requested}=setup();await printer.connect();assert.equal(printer.connected,true);assert.ok(requested().optionalServices.includes(PD01_SERVICE));await printer.printTest();assert.ok(sent.length>200);assert.ok(sent.every(b=>b.length<=20));assert.equal(printer.busy,false);printer.disconnect();assert.equal(printer.connected,false);await assert.rejects(()=>printer.printTest(),/Conecte/);});
test('PD01 cancellation busy guard and unsupported browser',async()=>{const {printer}=setup();await printer.connect();await assert.rejects(()=>printer.printTest(()=>printer.cancel()),/interrompido/);assert.equal(printer.busy,false);printer.busy=true;await assert.rejects(()=>printer.printTest(),/andamento/);await assert.rejects(()=>new Pd01Printer({bluetooth:null}).connect(),/Chrome/);});
