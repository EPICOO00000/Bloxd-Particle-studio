// Builds START-HERE.html: the whole studio in one file (code, styles and
// pictures inside), which works when opened straight from a folder, offline.
// Run with: npm run build   (needs `npm install` once, for esbuild)
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceFiles, sourceHash } from './sources.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const bundle = await build({
  entryPoints: [path.join(root, 'js/app.js')],
  bundle: true,
  write: false,
  format: 'iife',
  minify: true,
  target: 'es2020',
  legalComments: 'none', // the notices are added below instead
});
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

// every picture as a data URL
const assets = {};
for (const file of sourceFiles(root).filter((f) => f.endsWith('.png'))) {
  assets[file] = `data:image/png;base64,${fs.readFileSync(path.join(root, file)).toString('base64')}`;
}

const notices = [
  'Bloxd Particle Studio. Unofficial fan tool, not affiliated with Bloxd.',
  'Code: Apache License 2.0 (see LICENSE). Particle textures and the code block texture belong to Bloxd (see textures/README.md).',
  '',
  'Includes three.js:',
  read('vendor/LICENSE-three.txt').trim(),
].join('\n').replace(/--/g, '- -');

// Function replacements: minified code can contain $& and friends, which a
// replacement string would expand.
const swap = (html, find, replacement) => {
  if (!html.includes(find)) throw new Error(`index.html no longer contains: ${find}`);
  return html.split(find).join(replacement);
};
let html = read('index.html').replace(/\r\n/g, '\n');
html = swap(html, 'textures/glint.png', assets['textures/glint.png']);
html = swap(html, '<link rel="stylesheet" href="css/style.css">', `<style>\n${read('css/style.css')}</style>`);
html = swap(html, '<meta charset="utf-8">', `<meta charset="utf-8">\n<!--\n${notices}\n-->\n<meta name="bps-sources" content="${sourceHash(root)}">`);
html = swap(html, '<script type="module" src="js/app.js"></script>',
  `<script>window.BPS_ASSETS=${JSON.stringify(assets)}</script>\n<script>${js}</script>`);

fs.writeFileSync(path.join(root, 'START-HERE.html'), html);
console.log(`START-HERE.html: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${Object.keys(assets).length} pictures inside`);
