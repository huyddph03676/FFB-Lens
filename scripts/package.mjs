import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { zipSync } from 'fflate';

const root = resolve('dist');
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
const files = {};

async function addDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await addDirectory(absolute);
    else if (entry.isFile()) files[relative(root, absolute).replaceAll('\\', '/')] = new Uint8Array(await readFile(absolute));
  }
}

await addDirectory(root);
const outputDirectory = resolve('release');
await mkdir(outputDirectory, { recursive: true });
const output = join(outputDirectory, `ffb-lens-${manifest.version}.zip`);
await writeFile(output, zipSync(files, { level: 6 }));
process.stdout.write(`${output}\n`);
