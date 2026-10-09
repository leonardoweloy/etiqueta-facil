import { barcodeRects, qrRects } from './code-geometry.js';
/** Draws label DTOs without owning editor state or canvas dimensions. */
export class CanvasRenderer {
  constructor() {
    this.images = new Map();
  }

  /** Cache image sources; notify the caller when a new image is ready. */
  load(items, onload = () => {}) {
    for (const item of items) {
      if (item.type !== 'image' || this.images.has(item.src)) continue;
      const image = new Image();
      this.images.set(item.src, image);
      image.onload = onload;
      image.src = item.src;
    }
  }

  draw(canvas, state, { preview = false, selected = -1 } = {}) {
    const scale = canvas.width / state.width;
    const context = canvas.getContext('2d');
    const boxes = [];

    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    state.items.forEach((item, index) => {
      const box = bounds(item, context, scale, this.images);
      boxes.push(box);
      context.fillStyle = '#000';
      context.textBaseline = 'top';

      if (item.type === 'text') {
        context.font = font(item, scale);
        item.text.split('\n').forEach((line, lineIndex) => {
          context.fillText(line, item.x * scale,
            (item.y + lineIndex * item.size * 1.2) * scale);
        });
      } else if (item.type === 'barcode' || item.type === 'qr') {
        const rects = item.type === 'barcode' ? barcodeRects(item.value, item) : qrRects(item);
        for (const r of rects) context.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
        if (item.type === 'barcode') {
          context.font = font({ weight: 'normal', size: 2 }, scale);
          const width = context.measureText(item.value).width;
          context.fillText(item.value, (item.x + item.width / 2) * scale - width / 2, (item.y + item.height + 0.5) * scale);
        }
      } else {
        const image = this.images.get(item.src);
        if (image?.complete && image.naturalWidth) {
          context.drawImage(image, item.x * scale, item.y * scale,
            box.w * scale, box.h * scale);
        }
      }

      if (preview && index === selected) {
        context.strokeStyle = '#2a9473';
        context.lineWidth = 1;
        context.setLineDash([4, 3]);
        context.strokeRect(box.x * scale - 2, box.y * scale - 2,
          box.w * scale + 4, box.h * scale + 4);
        context.setLineDash([]);
      }
    });

    if (preview) {
      const margin = state.margin * scale;
      context.strokeStyle = '#bad1c2';
      context.lineWidth = 1;
      context.setLineDash([3, 4]);
      context.strokeRect(margin, margin,
        canvas.width - 2 * margin, canvas.height - 2 * margin);
      context.setLineDash([]);
    }

    return boxes;
  }
}

function font(item, scale) {
  return item.weight + ' ' + item.size * scale + 'px Arial';
}

function bounds(item, context, scale, images) {
  if (item.type === 'barcode' || item.type === 'qr') return { x: item.x, y: item.y, w: item.width, h: item.type === 'barcode' ? item.height + 3 : item.width };
  if (item.type === 'image') {
    const image = images.get(item.src);
    return {
      x: item.x,
      y: item.y,
      w: item.width,
      h: image?.naturalWidth
        ? item.width * image.naturalHeight / image.naturalWidth
        : item.width,
    };
  }

  context.font = font(item, scale);
  const lines = item.text.split('\n');
  return {
    x: item.x,
    y: item.y,
    w: Math.max(0, ...lines.map(line => context.measureText(line).width / scale)),
    h: lines.length * item.size * 1.2,
  };
}
