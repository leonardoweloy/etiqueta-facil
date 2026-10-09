import { MAX_BATCH } from './batch.js';
export const defaultCsvBatch = () => ({ data: '', separator: 'auto', header: false });
const fail = (line, message) => { throw new Error('Linha ' + line + ': ' + message); };
function records(data, separator) {
  const result = []; let row = [], value = '', quoted = false, closed = false, line = 1, start = 1;
  const field = () => { row.push(value); value = ''; closed = false; };
  const record = () => { field(); if (row.some(cell => cell.trim() !== '')) result.push({ values: row, line: start }); row = []; start = line; };
  for (let i = 0; i < data.length; i++) {
    const ch = data[i];
    if (quoted) {
      if (ch === '"') { if (data[i + 1] === '"') { value += '"'; i++; } else { quoted = false; closed = true; } }
      else if (ch === '\r' || ch === '\n') { if (ch === '\r' && data[i + 1] === '\n') i++; value += '\n'; line++; }
      else value += ch;
    } else if (ch === separator) field();
    else if (ch === '\r' || ch === '\n') { if (ch === '\r' && data[i + 1] === '\n') i++; line++; record(); }
    else if (ch === '"') { if (value || closed) fail(line, 'aspas em campo não delimitado.'); quoted = true; }
    else { if (closed) fail(line, 'caractere após fechamento de aspas.'); value += ch; }
  }
  if (quoted) fail(start, 'campo entre aspas não foi fechado.');
  record(); return result;
}
function detect(data) {
  let quoted = false; const counts = { ';': 0, ',': 0, '	': 0 };
  for (let i = 0; i < data.length; i++) {
    const ch = data[i];
    if (ch === '"') { if (quoted && data[i + 1] === '"') i++; else quoted = !quoted; }
    else if (!quoted && (ch === '\r' || ch === '\n')) { if (Object.values(counts).some(Boolean)) break; }
    else if (!quoted && Object.hasOwn(counts, ch)) counts[ch]++;
  }
  return Object.keys(counts).sort((a,b) => counts[b] - counts[a])[0];
}
export function parseCsv(data, { separator = 'auto', header = false } = {}) {
  if (typeof data !== 'string' || typeof header !== 'boolean') throw new Error('Configuração CSV inválida.');
  if (!['auto',';',',','	'].includes(separator)) throw new Error('Separador CSV inválido.');
  if (data.length > 1000000) throw new Error('CSV excede limite de 1 milhão de caracteres.');
  data = data.replace(/^﻿/, ''); const actual = separator === 'auto' ? detect(data) : separator;
  const parsed = records(data, actual); const first = parsed[0];
  const headers = header && first ? parsed.shift().values.map(value => value.trim()) : [];
  const width = first?.values.length ?? 0;
  const names = new Set();
  headers.forEach((name, index) => {
    if (!name || /[{}]/.test(name)) fail(first.line, 'cabeçalho vazio ou inválido.');
    if (names.has(name)) fail(first.line, 'cabeçalho duplicado: ' + name); names.add(name);
    if (/^coluna[1-9]\d*$/.test(name) && name !== 'coluna' + (index + 1)) fail(first.line, 'cabeçalho conflita com variável posicional: ' + name);
  });
  for (const record of parsed) if (record.values.length !== width) fail(record.line, 'esperadas ' + width + ' colunas; encontradas ' + record.values.length + '.');
  if (parsed.length > MAX_BATCH) throw new Error('CSV permite no máximo ' + MAX_BATCH + ' etiquetas.');
  const columns = [...new Set([...Array.from({length:width},(_,i)=>'coluna'+(i+1)), ...headers])];
  return { separator: actual, headers, rows: parsed.map(row=>row.values), lineNumbers: parsed.map(row=>row.line), columns };
}
export function resolveCsvTemplate(template, variables, lineNumber = 1) {
  if (typeof template !== 'string') fail(lineNumber, 'conteúdo deve ser texto.');
  if (template.replace(/{{\s*([^{}]+?)\s*}}/g, '').includes('{{') || template.replace(/{{\s*([^{}]+?)\s*}}/g, '').includes('}}')) fail(lineNumber, 'variável inválida ou não resolvida.');
  const result = template.replace(/{{\s*([^{}]+?)\s*}}/g, (_, name) => {
    if (!Object.hasOwn(variables, name)) fail(lineNumber, 'variável ausente: {{' + name + '}}');
    return variables[name];
  });
  return result;
}
/** Collection de linhas textuais e materialização de DTOs, sem dependências browser. */
export class CsvLabelBatch {
  constructor(config = defaultCsvBatch()) {
    this.config = { ...defaultCsvBatch(), ...config };
    Object.assign(this, parseCsv(this.config.data, this.config)); this.count = this.rows.length;
  }
  snapshot() { return { ...this.config }; }
  materialize(snapshot, index = 0) {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) throw new Error('Selecione uma linha CSV válida; importe dados antes de exportar.');
    const variables = Object.create(null), line = this.lineNumbers[index];
    this.rows[index].forEach((value,i) => { variables['coluna'+(i+1)] = value; if (this.headers[i]) variables[this.headers[i]] = value; });
    const dto = structuredClone(snapshot);
    dto.items = dto.items.map(item => {
      if (!['text','barcode','qr'].includes(item.type)) return item;
      const key = item.type === 'text' ? 'text' : 'value';
      const value = resolveCsvTemplate(item[key] ?? '', variables, line);
      if (item.type === 'barcode' && (!value || !/^[ -~]+$/.test(value))) fail(line, 'Code128 exige conteúdo não vazio e caracteres ASCII imprimíveis.');
      if (item.type === 'qr' && new TextEncoder().encode(value).length > 500) fail(line, 'QR aceita até 500 bytes UTF-8.');
      return { ...item, [key]: value };
    }); return dto;
  }
  materializeAll(snapshot) { if (!this.count) this.materialize(snapshot); return this.rows.map((_,i)=>this.materialize(snapshot,i)); }
}
