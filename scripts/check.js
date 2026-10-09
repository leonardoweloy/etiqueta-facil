import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = directory + '/' + entry.name;
    if (entry.isDirectory() && entry.name !== 'vendor') files.push(...await collect(path));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path);
  }
  return files;
}
for (const path of ['app.js', ...await collect('src'), ...await collect('tests'), 'scripts/check.js']) {
  const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Sintaxe validada: apresentação, domínio, aplicação, infraestrutura e testes.');
