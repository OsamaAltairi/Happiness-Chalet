import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(projectRoot, 'dist');
const files = ['index.html', 'admin.html', 'admin.js', 'manifest.json', 'robots.txt', 'sw.js'];
const directories = ['css', 'js', 'images'];

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

for (const file of files) {
    fs.copyFileSync(path.join(projectRoot, file), path.join(outputDirectory, file));
}

for (const directory of directories) {
    fs.cpSync(path.join(projectRoot, directory), path.join(outputDirectory, directory), { recursive: true });
}

console.log(`Cloudflare Pages assets prepared in ${outputDirectory}`);
