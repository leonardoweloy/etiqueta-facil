/** Sequential identifiers are domain values, independent of rendering. */
export const MAX_BATCH = 500;
export const defaultBatch = () => ({ mode: 'quantity', start: 124, quantity: 1, end: 124, prefix: 'INV-', digits: 6 });
export class LabelBatch {
  constructor(data = defaultBatch()) {
    const { mode, start, quantity, end, prefix, digits } = data;
    if (!['quantity', 'range'].includes(mode)) throw new Error('Modo de lote inválido.');
    if (!Number.isSafeInteger(start) || start < 0) throw new Error('Início deve ser um inteiro não negativo seguro.');
    if (typeof prefix !== 'string' || prefix.length > 24 || !/^[\x20-\x7e]*$/.test(prefix)) throw new Error('Prefixo: até 24 caracteres ASCII imprimíveis (Code128).');
    if (!Number.isInteger(digits) || digits < 1 || digits > 16) throw new Error('Zeros à esquerda: informe de 1 a 16 dígitos.');
    if (mode === 'range' && (!Number.isSafeInteger(end) || end < start)) throw new Error('Fim deve ser inteiro e maior ou igual ao início.');
    if (mode === 'quantity' && (!Number.isInteger(quantity) || quantity < 1)) throw new Error('Quantidade deve ser um inteiro positivo.');
    const count = mode === 'range' ? end - start + 1 : quantity;
    if (count > MAX_BATCH) throw new Error('O lote permite no máximo ' + MAX_BATCH + ' etiquetas.');
    if (!Number.isSafeInteger(start + (count - 1))) throw new Error('O fim do lote excede o limite de inteiro seguro.');
    this.data = { mode, start, quantity, end, prefix, digits }; this.count = count;
  }
  identifier(offset = 0) {
    if (!Number.isInteger(offset) || offset < 0 || offset >= this.count) throw new Error('Índice do lote inválido.');
    return this.data.prefix + String(this.data.start + offset).padStart(this.data.digits, '0');
  }
  snapshot() { return { ...this.data }; }
}
export function materializeLabel(snapshot, identifier) {
  return { ...snapshot, items: snapshot.items.map(item => item.type === 'barcode' ? { ...item, value: identifier } : { ...item }) };
}
