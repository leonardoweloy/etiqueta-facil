import { LabelEditor } from './src/application/label-editor.js';
import { CanvasRenderer } from './src/infrastructure/canvas-renderer.js';
import { JpegExporter } from './src/infrastructure/jpeg-exporter.js';
import { LocalStorageLabelRepository, ScreenCalibrationStore } from './src/infrastructure/local-storage-repository.js';
'use strict';
const $=id=>document.getElementById(id);
const renderer = new CanvasRenderer();
const calibration = new ScreenCalibrationStore(localStorage);
const editor = new LabelEditor({ repository: new LocalStorageLabelRepository(localStorage),
  exporter: new JpegExporter(renderer),
  onPersistenceError: () => message('Armazenamento local cheio. Exporte seu JPG antes de fechar.') });
let state = editor.snapshot(), selected = 0, real = false, screenScale = calibration.load(), boxes = [], drag = null;
function message(text) { $('message').textContent = text; }
function refreshState() { state = editor.snapshot(); }
function persist() { editor.save(); refreshState(); }
function loadImages() { renderer.load(state.items, render); }
function draw(canvas, preview) { boxes = renderer.draw(canvas, state, { preview, selected }); }
function execute(action) {
  try { const result = action(); refreshState(); return result; }
  catch (error) { message(error.message); return undefined; }
}
function render(){const canvas=$('canvas');const scale=real?screenScale:Math.min(Math.max(120,$('workspace').clientWidth-100)/state.width,280/state.height,12);canvas.width=Math.round(state.width*8);canvas.height=Math.round(state.height*8);canvas.style.width=state.width*scale+'px';canvas.style.height=state.height*scale+'px';draw(canvas,true);$('widthRuler').textContent=state.width+' mm';$('heightRuler').textContent=state.height+' mm';$('dimensions').textContent=state.width+' × '+state.height+' mm · margem '+state.margin+' mm';$('pixels').textContent=Math.round(state.width/25.4*state.dpi)+' × '+Math.round(state.height/25.4*state.dpi)+' px · '+state.dpi+' DPI';$('calibrationBar').style.width=50*screenScale+'px';$('fit').classList.toggle('active',!real);$('real').classList.toggle('active',real);}
function sync(){for(const key of ['width','height','margin','dpi'])$(key).value=state[key];$('preset').value=[20,58].includes(state.width)?String(state.width):'custom';$('elements').replaceChildren(...state.items.map((item,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+(item.type==='text'?item.text.slice(0,30)||'Texto vazio':'Imagem');return o;}));selected=Math.min(selected,state.items.length-1);$('elements').value=selected;const item=state.items[selected];for(const id of ['text','size','weight','x','y','imageWidth','remove'])$(id).disabled=!item;$('textFields').hidden=item?.type==='image';$('imageFields').hidden=item?.type!=='image';if(item){$('x').value=item.x;$('y').value=item.y;if(item.type==='text'){for(const key of ['text','size','weight'])$(key).value=item[key];}else $('imageWidth').value=item.width;}loadImages();render();}
for(const key of ['width','height','margin','dpi'])$(key).addEventListener('change',()=>{let n=Number($(key).value);if(!Number.isFinite(n)||!$(key).checkValidity()){sync();return;}execute(()=>editor.configure({[key]:n}));sync();});
$('preset').onchange=()=>{if($('preset').value!=='custom'){execute(()=>editor.selectTape(Number($('preset').value)));sync();}};
$('saveProfile').onclick=()=>{persist();message('Medidas e conteúdo salvos como padrão neste navegador.');};
$('elements').onchange=()=>{selected=Number($('elements').value);sync();};
for(const key of ['text','size','weight','x','y','imageWidth'])$(key).addEventListener('input',()=>{const item=state.items[selected];if(!item)return;const field=key==='imageWidth'?'width':key;const numeric=['size','x','y','imageWidth'].includes(key);if(numeric&&!$(key).checkValidity())return;execute(()=>editor.updateElement(selected,{[field]:numeric?Number($(key).value):$(key).value}));render();});
$('addText').onclick=()=>{selected=execute(()=>editor.addText())??selected;sync();};
$('remove').onclick=()=>{execute(()=>editor.removeElement(selected));sync();};
$('addLogo').onclick=()=>$('file').click();$('file').onchange=()=>{const file=$('file').files[0];if(!file)return;if(file.size>2*1024*1024){message('Use uma imagem de até 2 MB.');return;}const reader=new FileReader();reader.onload=()=>{selected=execute(()=>editor.addImage(reader.result))??selected;sync();};reader.readAsDataURL(file);$('file').value='';};
$('fit').onclick=()=>{real=false;render();};$('real').onclick=()=>{real=true;render();};
$('calibrate').onclick=()=>{const measured=Number($('measured').value);if(!$('measured').checkValidity())return;screenScale=50*screenScale/measured;try{calibration.save(screenScale);}catch{}real=true;render();message('Tela calibrada. Recalibre se mudar de monitor ou alterar o zoom.');};
$('resetCalibration').onclick=()=>{screenScale=96/25.4;try{calibration.reset();}catch{}render();};
function point(event){const rect=$('canvas').getBoundingClientRect();return{x:(event.clientX-rect.left)/rect.width*state.width,y:(event.clientY-rect.top)/rect.height*state.height};}
$('canvas').onpointerdown=event=>{const p=point(event);for(let i=boxes.length-1;i>=0;i--){const b=boxes[i];if(p.x>=b.x-1&&p.x<=b.x+b.w+1&&p.y>=b.y-1&&p.y<=b.y+b.h+1){selected=i;drag={dx:p.x-state.items[i].x,dy:p.y-state.items[i].y};$('canvas').setPointerCapture(event.pointerId);sync();break;}}};
$('canvas').onpointermove=event=>{if(!drag)return;const p=point(event),item=state.items[selected];execute(()=>editor.moveElement(selected,p.x-drag.dx,p.y-drag.dy));$('x').value=state.items[selected].x;$('y').value=state.items[selected].y;render();};
function stopDrag(){if(drag){drag=null;persist();}}$('canvas').onpointerup=stopDrag;$('canvas').onpointercancel=stopDrag;
$('export').onclick=async()=>{try{const blob=await editor.exportJpeg();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='etiqueta-'+state.width+'x'+state.height+'mm-'+state.dpi+'dpi.jpg';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);render();message('JPG exportado sem guias de edição. Confira o tamanho no software de impressão.');}catch(error){message('Não foi possível exportar: '+error.message);}};
window.addEventListener('resize',render);sync();
