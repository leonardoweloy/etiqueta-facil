/** Set JFIF density to pixels per inch, preserving the JPEG pixel data. */
export function withDpi(bytes, dpi) {
  for (let index = 2; index < bytes.length - 16; index++) {
    if (bytes[index] === 255 && bytes[index + 1] === 224 &&
        bytes[index + 4] === 74 && bytes[index + 5] === 70 &&
        bytes[index + 6] === 73 && bytes[index + 7] === 70) {
      bytes[index + 11] = 1;
      bytes[index + 12] = dpi >> 8;
      bytes[index + 13] = dpi & 255;
      bytes[index + 14] = dpi >> 8;
      bytes[index + 15] = dpi & 255;
      return bytes;
    }
  }

  const segment = new Uint8Array([
    255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1,
    dpi >> 8, dpi & 255, dpi >> 8, dpi & 255, 0, 0,
  ]);
  const result = new Uint8Array(bytes.length + segment.length);
  result.set(bytes.subarray(0, 2));
  result.set(segment, 2);
  result.set(bytes.subarray(2), 2 + segment.length);
  return result;
}

export class JpegExporter {
  constructor(renderer) {
    this.renderer = renderer;
  }

  /** Generate a JPEG Blob; downloading it is the caller's responsibility. */
  async export(state) {
    this.renderer.load(state.items);
    const sources = new Set(state.items
      .filter(item => item.type === 'image')
      .map(item => item.src));
    await Promise.all([...sources].map(source =>
      this.renderer.images.get(source).decode()));

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(state.width / 25.4 * state.dpi);
    canvas.height = Math.round(state.height / 25.4 * state.dpi);
    this.renderer.draw(canvas, state);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 1));
    if (!blob) throw new Error('Falha ao gerar JPG');
    const bytes = withDpi(new Uint8Array(await blob.arrayBuffer()), state.dpi);
    return new Blob([bytes], { type: 'image/jpeg' });
  }
}
