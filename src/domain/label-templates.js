import { Label } from './label.js';

/** Catálogo de bases editáveis. A UI só conhece os metadados públicos. */
const templates = [
  {
    id: 'inventory-standard', name: 'Inventário padrão', description: '58 × 35 mm · identificação e código de barras',
    width: 58, height: 35, margin: 0,
    items: [
      { type: 'text', text: 'PATRIMÔNIO', x: 0, y: 0, size: 3, weight: 'bold' },
      { type: 'text', text: 'Monitor', x: 0, y: 8, size: 2.5, weight: 'normal' },
      { type: 'text', text: 'Responsável: TI', x: 0, y: 14, size: 2, weight: 'normal' },
      { type: 'barcode', x: 0, y: 21, width: 58, height: 11 },
    ],
  },
  {
    id: 'compact-20mm', name: 'Compacto 20 mm', description: '20 × 40 mm · base estreita para fita de 20 mm',
    width: 20, height: 40, margin: 0,
    items: [
      { type: 'text', text: 'INVENTÁRIO', x: 0, y: 0, size: 1.7, weight: 'bold' },
      { type: 'text', text: 'Monitor', x: 0, y: 7, size: 2, weight: 'normal' },
      { type: 'text', text: 'Resp.: TI', x: 0, y: 14, size: 1.7, weight: 'normal' },
      { type: 'qr', value: '', x: 0, y: 20, width: 20 },
    ],
  },
  {
    id: 'asset-horizontal-58mm', name: 'Patrimônio horizontal 58 mm', description: '58 × 30 mm · logo à esquerda, informações ao centro e QR opcional',
    width: 58, height: 30, margin: 0,
    items: [
      { type: 'text', text: 'WADS.DEV', x: 0, y: 4, size: 2.2, weight: 'bold' },
      { type: 'text', text: 'Monitor', x: 17, y: 0, size: 2.5, weight: 'bold' },
      { type: 'text', text: 'Responsável', x: 17, y: 6, size: 1.8, weight: 'normal' },
      { type: 'qr', value: '', x: 44, y: 0, width: 14 },
      { type: 'barcode', x: 0, y: 19, width: 58, height: 8 },
    ],
  },
];
const horizontal = templates.find(template => template.id === 'asset-horizontal-58mm');
templates.push({ ...horizontal, id: 'asset-horizontal-csv', name: 'Patrimônio horizontal CSV', description: '58 × 30 mm · coluna1: equipamento · coluna2: número · coluna3: barcode e QR', items: horizontal.items.map(item => item.type === 'text' && item.text === 'Monitor' ? { ...item, text: '{{coluna1}}' } : item.type === 'text' && item.text === 'Responsável' ? { ...item, text: '{{coluna2}}' } : ['barcode', 'qr'].includes(item.type) ? { ...item, value: '{{coluna3}}' } : { ...item }) });

export function labelTemplateCatalog() {
  return templates.map(({ id, name, description, width, height }) => ({ id, name, description, width, height }));
}

/** Cria outro agregado validado e preserva configurações de impressão/lote. */
export function labelFromTemplate(id, current) {
  const template = templates.find(candidate => candidate.id === id);
  if (!template) throw new RangeError('Modelo de etiqueta não encontrado.');
  const { width, height, margin, items } = template;
  return new Label({ width, height, margin, items, dpi: current.dpi, batch: current.batch, batchMode: id === 'asset-horizontal-csv' ? 'csv' : current.batchMode, csv: current.csv });
}
