import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import JSZip from 'jszip';

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

async function packageExtension(extDir, outFile) {
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
}

const root = new URL('..', import.meta.url).pathname;

await packageExtension(
  join(root, 'chrome-extension'),
  join(root, 'private-pin-chrome-extension.zip')
);

await packageExtension(
  join(root, 'firefox-extension'),
  join(root, 'private-pin-firefox-extension.zip')
);
