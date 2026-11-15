// The files the app is made of, and a fingerprint of them. The single-file
// build stores the fingerprint, so a test can tell when START-HERE.html is
// older than the sources (run `npm run build` to refresh it).
//
// Also the versions that index.html asks for its files by. A web server lets a
// browser keep files for some minutes (GitHub Pages: ten). After an update, a
// reload then gets the new page but runs it with the old scripts it kept: a
// new button that does nothing, or a tool that is not there. So every script
// and the style sheet carry a version in their address ("js/app.js?v=1a2b3c4d",
// made from what is in the file): a file that changed has a new address and is
// fetched, one that did not is still taken from the browser's store.
// (The pictures keep their plain addresses: one that is changed can show as
// the old one for those minutes, which breaks nothing.)
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

/** The scripts and the style sheet, each with a version made from what is in it: [['css/style.css', '1a2b3c4d'], ...] */
export function fileVersions(root) {
  return sourceFiles(root).filter((file) => /\.(js|css)$/.test(file)).map((file) => {
    const text = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
    return [file, crypto.createHash('sha256').update(text).digest('hex').slice(0, 8)];
  });
}

// the three places in index.html where versions are written
const MAP = /(<script type="importmap" id="versions">\r?\n)[\s\S]*?(<\/script>)/;
const SHEET = /(<link rel="stylesheet" href="css\/style\.css)(?:\?v=[0-9a-f]*)?(">)/;
const MINE = /(\bvar mine = ')[0-9a-f]*(';)/;

/**
 * index.html with versions written into it: the address of every script (an
 * import map: the scripts name each other without versions, the browser adds
 * them), the address of the style sheet, and the version of the whole site.
 */
export function pageWith(html, versions, site) {
  for (const place of [MAP, SHEET, MINE]) if (!place.test(html)) throw new Error(`index.html has no place for the versions: ${place}`);
  const scripts = versions.filter(([file]) => file.endsWith('.js'));
  const sheet = versions.find(([file]) => file === 'css/style.css');
  const map = `{"imports": {\n${scripts.map(([file, v]) => `  "./${file}": "./${file}?v=${v}"`).join(',\n')}\n}}\n`;
  return html
    .replace(MAP, (all, before, after) => before + map + after)
    .replace(SHEET, (all, before, after) => `${before}?v=${sheet ? sheet[1] : ''}${after}`)
    .replace(MINE, (all, before, after) => before + site + after);
}

/** The version of the whole site: it changes when anything in it does. The page asks for it to know that it is the newest. */
export function siteVersion(root) {
  const hash = crypto.createHash('sha256');
  for (const file of sourceFiles(root)) {
    let data = fs.readFileSync(path.join(root, file));
    if (!file.endsWith('.png')) data = Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'));
    // (the page without the versions that are written into it: they would count themselves)
    if (file === 'index.html') data = Buffer.from(pageWith(data.toString('utf8'), [], ''));
    hash.update(`${file}\0${data.length}\0`).update(data);
  }
  return hash.digest('hex').slice(0, 12);
}

/** Write the versions into index.html, and the version of the site into version.txt. Returns the files that changed. */
export function stamp(root) {
  const changed = [];
  const put = (file, text) => {
    const at = path.join(root, file);
    if (fs.existsSync(at) && fs.readFileSync(at, 'utf8') === text) return;
    fs.writeFileSync(at, text);
    changed.push(file);
  };
  const site = siteVersion(root);
  put('index.html', pageWith(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), fileVersions(root), site));
  put('version.txt', `${site}\n`);
  return changed;
}
