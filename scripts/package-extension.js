import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import JSZip from 'jszip';

const extDir = new URL('../chrome-extension/', import.meta.url).pathname;
const outFile = new URL('../private-pin-chrome-extension.zip', import.meta.url).pathname;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

const files = await walk(extDir);
const zip = new JSZip();

for (const file of files) {
  const relativePath = relative(extDir, file);
  const content = await readFile(file);
  zip.file(relativePath, content);
}

const buffer = await zip.generateAsync({ type: 'nodebuffer' });
await writeFile(outFile, buffer);
console.log(`Created ${outFile} (${buffer.length} bytes)`);
