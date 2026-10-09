import { CanvasRenderer } from './canvas-renderer.js';
import { barcodeRects, qrRects } from './code-geometry.js';
export function rasterSize(label) {
 const scale=Math.min(200/25.4,384/label.width);
 const width=Math.round(label.width*scale),height=Math.round(label.height*scale);
 if(height<1||height>1600)throw Error('Etiqueta muito alta para PD01 (máximo 1600 linhas).');
 return {width,height,scale:width/label.width};
}
export function packRaster({data,width,height}) {
 if(width<1||width>384||data.length!==width*height*4)throw Error('Raster inválido.');
 const rows=[];const offset=Math.floor((384-width)/2);
 for(let y=0;y<height;y++) {const row=new Uint8Array(48);for(let x=0;x<width;x++){
  const i=(y*width+x)*4,alpha=data[i+3]/255;
  const luminance=(0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2])*alpha+255*(1-alpha);
  if(luminance<160)row[(x+offset)>>3]|=1<<((x+offset)%8);
 }rows.push(row);}return rows;
}
export async function renderRaster(label,document=globalThis.document) {
 const {width,height,scale}=rasterSize(label);
 for(const item of label.items){
  const rects=item.type==='barcode'?barcodeRects(item.value,item):item.type==='qr'?qrRects(item):[];
  if(rects.some(r=>r.w*scale<(item.type==='qr'?2:1)))throw Error('Código pequeno demais para a PD01. Aumente a largura do código ou reduza seu conteúdo.');
 }
 const renderer=new CanvasRenderer();
 for(const item of label.items.filter(item=>item.type==='image')) {const image=new Image();image.src=item.src;await image.decode();renderer.images.set(item.src,image);}
 await document.fonts?.ready;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 renderer.draw(canvas,label);return packRaster(canvas.getContext('2d').getImageData(0,0,width,height));
}
