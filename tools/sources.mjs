// The files the app is made of, and a fingerprint of them. The single-file
// build stores the fingerprint, so a test can tell when START-HERE.html is
// older than the sources (run `npm run build` to refresh it).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIRS = [['js', '.js'], ['css', '.css'], ['vendor', '.js'], ['textures', '.png']];

export function sourceFiles(root) {
  const files = ['index.html'];
  const walk = (dir, ext) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel, ext);
      else if (entry.name.endsWith(ext)) files.push(rel);
    }
  };
  for (const [dir, ext] of DIRS) walk(dir, ext);
  return files.sort();
}

export function sourceHash(root) {
  const hash = crypto.createHash('sha256');
  for (const file of sourceFiles(root)) {
    let data = fs.readFileSync(path.join(root, file));
    // text files: the same fingerprint whether git checks them out with LF or CRLF
    if (!file.endsWith('.png')) data = Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'));
    hash.update(`${file}\0${data.length}\0`).update(data);
  }
  return hash.digest('hex').slice(0, 16);
}
