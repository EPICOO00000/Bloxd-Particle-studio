// Bloxd Particle Studio: share links. Pure functions (no DOM); the window that
// shows a link, and the question a link asks when it is opened, are in
// js/share-ui.js.
//
// A scene travels in the link itself, after the "#". Nothing is uploaded and
// no server is needed, so it works on any host that only hands out files.
// (What is after the "#" is not even sent to the host when the link is opened.)
//
//   link    = <address of the studio>#s=<letter><payload>
//   letter  = 'z': the payload is the packed scene as JSON, deflated, in base64url
//             'j': the same, not deflated (made by a browser that cannot deflate)
//   packed  = see packScene() below: { v: 1, objects, export, code }
//
// LINKS ARE FOR EVER. Somebody posts one and it is clicked years later. So what
// a link says must never depend on what the studio's defaults are on the day it
// is opened: the values a link leaves out are the ones in the tables below, and
// those tables are never changed. A new way of packing gets a new number in `v`
// (and unpackScene() keeps reading the old ones).

import { sanitizeScene, newId, MAX_PLAYS, MAX_DEPTH } from './scene.js';
import { sanitizeCode, newNodeId } from './nodes.js';
import { formPoints, formKey } from './forms.js';
import { MAX_POINTS } from './deform.js';

/** Where the studio is on the web: for a link made in a copy that was opened from a file. */
export const HOME = 'https://epicoo00000.github.io/Bloxd-Particle-studio/';
/** A link starts with the address of the studio, then this, then the scene. */
export const MARK = '#s=';
/** One message in Discord holds this many characters: a longer link cannot be pasted there in one piece. */
export const CHAT_CHARS = 2000;
/** The packed scene of a link is at most this long once it is unfolded (a real one is a hundred times shorter). */
export const MAX_UNFOLDED = 4000000;
/** A link is at most this long (a real one of this length could not be passed on anyway). */
export const MAX_LINK = 1000000;
/**
 * How much a scene from a link can be (see loadOf). A link can be made by
 * anyone, and a short one can hold a scene of millions of particles, or one
 * that is played thousands of times along winding ways: no browser gets
 * through those. The biggest example, the dragon, is 1,500 particles and 140
 * plans; whatever the game can play is far below these.
 */
export const MAX_LOAD = Object.freeze({ particles: 30000, plans: 3000 });

// ---------------------------------------------------------------- version 1: what a link leaves out

/** What an object has where a link says nothing. NEVER CHANGE THIS (see the top of the file). */
export const OBJECT_V1 = Object.freeze({
  shape: 'point', name: 'Particle', count: 1, params: {}, pos: [0.5, 1.5, 0.5], rot: [0, 0, 0], scale: [1, 1, 1],
  texture: 'glint', color: '#ffd24a', color2: null, size: 0.3, size2: null, life: 6, fade: false, blend: 1,
  move: [0, 0, 0], spread: 0, expand: 0, gravity: 0, hidden: false, start: 0, fadeIn: false, keys: [], spin: false,
  parent: null, repeat: 1, every: 0.5,
});
/** The same for a group. NEVER CHANGE THIS. */
export const GROUP_V1 = Object.freeze({
  name: 'Group', pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], hidden: false, start: 0, keys: [], spin: false,
  parent: null, repeat: 1, every: 0.5, open: true,
});
/**
 * The same for a key. Its place, turn and size are those of its object where
 * the link says nothing; a key with a colour or a size has no second one.
 * NEVER CHANGE THIS.
 */
export const KEY_V1 = Object.freeze({ ease: 'smooth', color2: null, size2: null });
/** The same for the settings of the export window. NEVER CHANGE THIS. */
export const EXPORT_V1 = Object.freeze({ target: 'block', precision: 100, hideDist: 0, worldPos: [0, 0, 0] });

const GROUP = 'group';
const clone = (v) => JSON.parse(JSON.stringify(v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// ---------------------------------------------------------------- packing

function packKey(key, obj) {
  const out = {};
  for (const [name, value] of Object.entries(key)) {
    if ((name === 'pos' || name === 'rot' || name === 'scale') && same(value, obj[name])) continue;
    if (name in KEY_V1 && same(value, KEY_V1[name])) continue;
    out[name] = value;
  }
  return out;
}

/** Objects without what the tables say anyway. An object has no id: it is its place in the list, and `parent` is such a place. */
function packObjects(objects) {
  const place = new Map(objects.map((o, i) => [o.id, i]));
  return objects.map((o) => {
    const table = o.shape === GROUP ? GROUP_V1 : OBJECT_V1;
    const out = {};
    for (const [name, value] of Object.entries(o)) {
      if (name === 'id') continue;
      if (name === 'parent') {
        if (place.has(value)) out.parent = place.get(value);
      } else if (name === 'keys') {
        if (value.length) out.keys = value.map((key) => packKey(key, o));
      } else if (!(name in table) || !same(value, table[name])) out[name] = value;
    }
    return out;
  });
}

/** The Code window. A node is [kind, x, y, values]; a wire is [from, output, to], with nodes by their place in the list. */
function packCode(code) {
  const { graph, own, lang } = code;
  if (!graph.nodes.length && !own) return null;
  const place = new Map(graph.nodes.map((n, i) => [n.id, i]));
  const out = {};
  if (graph.nodes.length) {
    out.nodes = graph.nodes.map((n) => [n.type, n.x, n.y, n.values]);
    out.wires = graph.wires.map((w) => [place.get(w.from), w.out, place.get(w.to)]);
  }
  if (own) out.own = own;
  if (lang === 'ts') out.ts = 1;
  return out;
}

function packExport(options) {
  const out = {};
  for (const name of Object.keys(EXPORT_V1)) {
    if (options && name in options && !same(options[name], EXPORT_V1[name])) out[name] = options[name];
  }
  return Object.keys(out).length ? out : null;
}

/** The settings of the export window that a file or a link carries, with every one present. */
export function exportOptions(raw) {
  const o = isObject(raw) ? raw : {};
  const out = clone(EXPORT_V1);
  if (o.target === 'world' || o.target === 'block') out.target = o.target;
  if (Number.isFinite(o.precision) && o.precision > 0) out.precision = o.precision;
  if (Number.isFinite(o.hideDist) && o.hideDist >= 0) out.hideDist = Math.min(1000, o.hideDist);
  if (Array.isArray(o.worldPos) && o.worldPos.length === 3 && o.worldPos.every((v) => Number.isFinite(v))) out.worldPos = o.worldPos.slice();
  return out;
}

/**
 * What a link carries, made ready: exactly what the saved file of it would
 * load as. { objects, export, code }; `code` is null when the Code window is
 * empty (or is to be left out).
 */
export function shareData(data, { withCode = true } = {}) {
  const code = sanitizeCode(data && data.code);
  return {
    objects: sanitizeScene({ objects: clone((data && data.objects) || []) }).objects,
    export: exportOptions(data && data.export),
    code: withCode && (code.graph.nodes.length || code.own) ? code : null,
  };
}

/**
 * A scene as a link carries it (version 1).
 *   full : nothing is left out (see sharedPacked: for a scene that does not come back the same the short way)
 */
export function packScene(data, { full = false } = {}) {
  if (full) return { v: 1, full: { objects: data.objects, export: data.export, code: data.code } };
  const out = { v: 1, objects: packObjects(data.objects) };
  const options = packExport(data.export);
  if (options) out.export = options;
  const code = data.code ? packCode(data.code) : null;
  if (code) out.code = code;
  return out;
}

// ---------------------------------------------------------------- unpacking

/** Thrown for a link that cannot be opened. `kind`: 'broken', 'newer', 'big', 'heavy' or 'browser'. */
export class ShareError extends Error {
  constructor(kind, message = kind) {
    super(message);
    this.name = 'ShareError';
    this.kind = kind;
  }
}

/** What to tell somebody whose link could not be opened. */
export const SHARE_ERRORS = {
  broken: 'This share link is damaged or cut off, so its scene could not be opened. Ask for the link again, or for the scene as a file. Nothing was changed.',
  newer: 'This share link was made with a newer version of the studio. Reload the page (Ctrl+F5) to get that version. Nothing was changed.',
  big: 'This share link holds more than the studio opens from a link. Ask for the scene as a file. Nothing was changed.',
  heavy: 'The scene of this share link is far bigger than the studio opens from a link. Ask for it as a file. Nothing was changed.',
  browser: 'This browser is too old to open share links. Open the link in another browser, or ask for the scene as a file. Nothing was changed.',
  empty: 'This share link holds an empty scene. Nothing was changed.',
};

/**
 * The objects of a packed scene with everything written out that the link left
 * out: what is handed to sanitizeScene(). Every field of the tables is in every
 * object, so nothing is left for the defaults of the day to decide.
 */
export function unpackObjects(list) {
  if (!Array.isArray(list)) throw new ShareError('broken');
  const rows = list.slice(0, 500).map((raw) => (isObject(raw) ? raw : {}));
  const ids = rows.map(() => newId());
  return rows.map((raw, i) => {
    const group = raw.shape === GROUP;
    // (spread, not Object.assign: a link is not to be trusted, and a field called __proto__ stays a field)
    const o = { ...clone(group ? GROUP_V1 : OBJECT_V1), ...raw, id: ids[i] };
    o.parent = Number.isInteger(raw.parent) && raw.parent >= 0 && raw.parent < rows.length && raw.parent !== i ? ids[raw.parent] : null;
    o.keys = (Array.isArray(raw.keys) ? raw.keys : []).filter(isObject).map((key) => {
      const out = { pos: o.pos, rot: o.rot, scale: o.scale, ease: KEY_V1.ease, ...key };
      if ('color' in key && !('color2' in key)) out.color2 = KEY_V1.color2;
      if ('size' in key && !('size2' in key)) out.size2 = KEY_V1.size2;
      return out;
    });
    return o;
  });
}

function unpackCode(raw) {
  if (!isObject(raw)) return null;
  const rows = (Array.isArray(raw.nodes) ? raw.nodes : []).filter(Array.isArray);
  const ids = rows.map(() => newNodeId());
  const at = (n) => (Number.isInteger(n) && n >= 0 && n < ids.length ? ids[n] : null);
  return {
    graph: {
      nodes: rows.map(([type, x, y, values], i) => ({ id: ids[i], type, x, y, values })),
      wires: (Array.isArray(raw.wires) ? raw.wires : []).filter(Array.isArray).map(([from, out, to]) => ({ from: at(from), out, to: at(to) })),
    },
    own: raw.own,
    lang: raw.ts ? 'ts' : 'js',
  };
}

/**
 * The scene a packed one stands for, repaired like anything that is loaded:
 * { objects, export, code }. `code` is null when the link carries none (then
 * the Code window of whoever opens it stays as it is). Every object and node
 * gets a new id.
 */
export function unpackScene(packed) {
  if (!isObject(packed)) throw new ShareError('broken');
  if (packed.v !== 1) throw new ShareError(Number.isInteger(packed.v) && packed.v > 1 ? 'newer' : 'broken');
  let raw;
  if (isObject(packed.full)) {
    if (!Array.isArray(packed.full.objects)) throw new ShareError('broken');
    raw = { objects: packed.full.objects, export: packed.full.export, code: isObject(packed.full.code) ? packed.full.code : null };
  } else {
    raw = { objects: unpackObjects(packed.objects), export: { ...clone(EXPORT_V1), ...(isObject(packed.export) ? packed.export : {}) }, code: unpackCode(packed.code) };
  }
  const code = raw.code ? sanitizeCode(raw.code) : null;
  return {
    objects: sanitizeScene({ objects: raw.objects }).objects,
    export: exportOptions(raw.export),
    code: code && (code.graph.nodes.length || code.own) ? code : null,
  };
}

/**
 * A scene with its ids taken out, as text: two scenes with the same text are
 * the same scene. (Ids are made anew whenever a link is opened; an object is
 * known by its place in the list.)
 */
export function sceneText(data) {
  const place = new Map(data.objects.map((o, i) => [o.id, i]));
  const objects = data.objects.map((o) => ({ ...o, id: null, parent: o.parent === null ? null : place.get(o.parent) }));
  let code = null;
  if (data.code) {
    const at = new Map(data.code.graph.nodes.map((n, i) => [n.id, i]));
    code = {
      nodes: data.code.graph.nodes.map((n) => ({ ...n, id: null })),
      wires: data.code.graph.wires.map((w) => [at.get(w.from), w.out, at.get(w.to)]),
      own: data.code.own,
      lang: data.code.lang,
    };
  }
  return JSON.stringify({ objects, export: data.export, code });
}

/**
 * The packed scene a link is given: the short way, when that comes back as
 * exactly the scene it was made of, and else with nothing left out. So a link
 * never opens as another scene than the one it was made from.
 */
export function sharedPacked(data, pack = packScene) {
  const want = sceneText(data);
  for (const full of [false, true]) {
    const packed = pack(data, { full });
    try {
      if (sceneText(unpackScene(clone(packed))) === want) return packed;
    } catch { /* then the next way */ }
  }
  throw new ShareError('broken', 'this scene cannot be put into a link');
}

// ---------------------------------------------------------------- how much a scene is

/**
 * How much a scene is, counted quickly (the real numbers need the plan of
 * every play of every object, and that is the work a link must not be able to
 * ask for without end):
 *   particles : for every object the points of its biggest shape, times how
 *               often it is played, times the stretches of its way (one more
 *               than its keys and those of the groups around it)
 *   plans     : the same without the points: the ways the studio works out
 */
export function loadOf(objects) {
  const byId = new Map(objects.map((o) => [o.id, o]));
  const sizes = new Map(); // the points of a shape with deformers, worked out once for all that are alike
  const pointsOf = (form) => {
    if (form.shape === 'point') return 1;
    if (!form.deform || !form.deform.length) return form.count;
    const key = formKey(form);
    // (deformers can add points: counted for real, but not for more shapes than any scene has)
    if (!sizes.has(key)) sizes.set(key, sizes.size < 300 ? formPoints(form).length : MAX_POINTS);
    return sizes.get(key);
  };
  const load = { particles: 0, plans: 0 };
  for (const o of objects) {
    if (o.shape === GROUP) continue;
    let plays = 1;
    let keys = 0;
    for (let p = o, depth = 0; p && depth <= MAX_DEPTH; p = byId.get(p.parent), depth++) {
      plays *= p.repeat;
      keys += p.keys.length;
    }
    const ways = Math.min(MAX_PLAYS, plays) * (1 + keys);
    load.plans += ways;
    load.particles += ways * Math.max(pointsOf(o), ...o.keys.map((key) => (key.form ? pointsOf(key.form) : 0)));
    if (load.particles > 1e9) break;
  }
  return load;
}

/** Is a scene more than the studio opens from a link? */
export function tooHeavy(objects) {
  const load = loadOf(objects);
  return load.particles > MAX_LOAD.particles || load.plans > MAX_LOAD.plans;
}

// ---------------------------------------------------------------- text and bytes

const ALPHABET = /^[A-Za-z0-9_-]*$/;

function toBase64Url(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  if (!ALPHABET.test(text) || text.length % 4 === 1) throw new ShareError('broken');
  let binary;
  try {
    binary = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4));
  } catch {
    throw new ShareError('broken');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Can this browser deflate and inflate? (Chrome and Edge since 2022, Firefox and Safari since 2023.) */
export const canDeflate = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function' && typeof Blob === 'function';

async function readAll(stream, limit) {
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      reader.cancel().catch(() => {});
      throw new ShareError('big');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.length; }
  return out;
}

const deflate = (bytes) => readAll(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')), Infinity);

/** Unfolds deflated bytes, and stops when more comes out than a scene can be (a link is not to be trusted). */
async function inflate(bytes, limit) {
  try {
    return await readAll(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')), limit);
  } catch (err) {
    throw err instanceof ShareError ? err : new ShareError('broken');
  }
}

// ---------------------------------------------------------------- links

/**
 * The payload of a link in the text after a "#" (or in a whole link): the
 * letters after "s=" up to the first sign that cannot be part of it, so that a
 * full stop or a "&..." somebody's chat hung on the end does no harm. Null
 * when there is no share link in it.
 */
export function payloadOf(text) {
  const hash = String(text || '');
  const from = hash.indexOf('#') >= 0 ? hash.slice(hash.indexOf('#') + 1) : hash;
  const found = /(?:^|&)s=([A-Za-z0-9_-]*)/.exec(from);
  return found ? found[1] : null;
}

/**
 * The address a link starts with: the page itself, without what is after "?"
 * and "#". A copy opened from a file has no address anybody else could open,
 * so its links lead to the studio on the web.
 */
export function baseOf(location) {
  if (!location || !/^https?:$/.test(location.protocol)) return HOME;
  return `${location.origin}${location.pathname}`;
}

/**
 * The link for a scene.
 *   data    : { objects, export, code } (as in a saved file; it is repaired first)
 *   options : { base (the address of the studio), withCode, plain (do not deflate) }
 * returns { url, chars, objects, code (the Code window is in it), deflated,
 *           heavy (the scene is more than the studio opens from a link: see MAX_LOAD) }
 */
export async function makeLink(data, { base = HOME, withCode = true, plain = false } = {}) {
  const ready = shareData(data, { withCode });
  const bytes = new TextEncoder().encode(JSON.stringify(sharedPacked(ready)));
  const deflated = !plain && canDeflate();
  const payload = deflated ? `z${toBase64Url(await deflate(bytes))}` : `j${toBase64Url(bytes)}`;
  const url = `${base}${MARK}${payload}`;
  return { url, chars: url.length, objects: ready.objects.length, code: !!ready.code, deflated, heavy: tooHeavy(ready.objects) };
}

/**
 * The scene of a link: { objects, export, code } (see unpackScene), from the
 * payload of the link (see payloadOf). Throws a ShareError when it cannot be
 * opened; never anything else, whatever the link holds.
 */
export async function readLink(payload) {
  const text = String(payload || '');
  if (text.length > MAX_LINK) throw new ShareError('big');
  if (!text.length || !ALPHABET.test(text)) throw new ShareError('broken');
  const letter = text[0];
  // (a letter this version does not know: a later way of writing links)
  if (letter !== 'z' && letter !== 'j') throw new ShareError(/[a-z]/.test(letter) ? 'newer' : 'broken');
  let bytes = fromBase64Url(text.slice(1));
  if (letter === 'z') {
    if (!canDeflate()) throw new ShareError('browser');
    bytes = await inflate(bytes, MAX_UNFOLDED);
  } else if (bytes.length > MAX_UNFOLDED) throw new ShareError('big');
  let packed;
  try {
    packed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new ShareError('broken');
  }
  let scene;
  try {
    scene = unpackScene(packed);
  } catch (err) {
    throw err instanceof ShareError ? err : new ShareError('broken');
  }
  if (tooHeavy(scene.objects)) throw new ShareError('heavy');
  return scene;
}
