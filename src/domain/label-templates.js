import { Label } from './label.js';

/** Catálogo de bases editáveis. A UI só conhece os metadados públicos. */
const templates = [
  {
    id: 'inventory-standard', name: 'Inventário padrão', description: '58 × 35 mm · identificação e código de barras',
    width: 58, height: 35, margin: 2,
    items: [
      { type: 'text', text: 'PATRIMÔNIO', x: 3, y: 3, size: 3, weight: 'bold' },
      { type: 'text', text: 'Monitor', x: 3, y: 9, size: 2.5, weight: 'normal' },
      { type: 'text', text: 'Responsável: TI', x: 3, y: 14, size: 2, weight: 'normal' },
      { type: 'barcode', x: 3, y: 21, width: 52, height: 8 },
    ],
  },
  {
    id: 'compact-20mm', name: 'Compacto 20 mm', description: '20 × 40 mm · base estreita para fita de 20 mm',
    width: 20, height: 40, margin: 1,
    items: [
      { type: 'text', text: 'INVENTÁRIO', x: 1, y: 2, size: 1.7, weight: 'bold' },
      { type: 'text', text: 'Monitor', x: 1, y: 7, size: 2, weight: 'normal' },
      { type: 'text', text: 'Resp.: TI', x: 1, y: 12, size: 1.7, weight: 'normal' },
      { type: 'qr', value: '', x: 4, y: 20, width: 12 },
    ],
  },
  {
    id: 'asset-horizontal-58mm', name: 'Patrimônio horizontal 58 mm', description: '58 × 30 mm · logo à esquerda, informações ao centro e QR opcional',
    width: 58, height: 30, margin: 1,
    items: [
      { type: 'text', text: 'WADS.DEV', x: 2, y: 6, size: 2.2, weight: 'bold' },
      { type: 'text', text: 'Monitor', x: 18, y: 3, size: 2.5, weight: 'bold' },
      { type: 'text', text: 'Responsável', x: 18, y: 8, size: 1.8, weight: 'normal' },
      { type: 'qr', value: '', x: 44, y: 2, width: 12 },
      { type: 'barcode', x: 2, y: 19, width: 54, height: 7 },
    ],
  },
];
const horizontal = templates.find(template => template.id === 'asset-horizontal-58mm');
templates.push({ ...horizontal, id: 'asset-horizontal-csv', name: 'Patrimônio horizontal CSV', description: '58 × 30 mm · equipamento e identificador do CSV (ou coluna1 / coluna2)', items: horizontal.items.map(item => item.type === 'text' && item.text === 'Monitor' ? { ...item, text: '{{coluna1}}' } : item.type === 'text' && item.text === 'Responsável' ? { ...item, text: '{{coluna2}}' } : item.type === 'barcode' ? { ...item, value: '{{coluna2}}' } : { ...item }) });

export function labelTemplateCatalog() {
  return templates.map(({ id, name, description, width, height }) => ({ id, name, description, width, height }));
}

/** Cria outro agregado validado e preserva configurações de impressão/lote. */
export function labelFromTemplate(id, current) {
  const template = templates.find(candidate => candidate.id === id);
  if (!template) throw new RangeError('Modelo de etiqueta não encontrado.');
  const { width, height, margin, items } = template;
  return new Label({ width, height, margin, items, dpi: current.dpi, batch: current.batch, batchMode: current.batchMode, csv: current.csv });
}
