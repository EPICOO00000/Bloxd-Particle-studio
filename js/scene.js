// Scene model + particle maths. Pure (no DOM, no three.js) so Node can test it.
//
// Coordinates
//   Bloxd space : what the game uses. [0,0,0] is the code block's corner
//                 (thisPos), so every position is "blocks away from the block".
//   View space  : what three.js draws. Bloxd is left-handed and three.js is
//                 right-handed, so view = [x, y, -z]. Flipping Z keeps the scene
//                 from coming out mirrored in the game.

import { shapePoints, SHAPE_BY_ID, defaultParams } from './shapes.js';
import {
  LIFE_PER_SECOND, FADE_START, rotationMatrix, MAX_KEYS, MIN_KEY_GAP, MAX_START, MAX_REPEAT, MIN_EVERY, isEase,
  planOf, piecesAt, spanOf, staySeconds, poseAt, restPose, applyMatrix, isPlain,
  viewMatrix, mulAffine, flipZ, inBloxd, lineageMatrix, tintAt,
} from './motion.js';

export { LIFE_PER_SECOND, FADE_START, rotationMatrix };

/** Every `texture` string of the Bloxd Code API (docs: Particles). */
export const TEXTURES = [
  'arrow', 'bubble', 'critical_hit', 'drift', 'effect_5', 'fishingFishSilhouette',
  'generic_2', 'glint', 'heart', 'scary_face', 'soul_0', 'square_particle', 'z-particle',
];
/** Textures whose preview image is a hand-drawn stand-in (see textures/README.md). */
export const PLACEHOLDER_TEXTURES = ['fishingFishSilhouette'];

/**
 * Texels of the game's PNGs that are fully transparent but not black, as
 * [x, y, r, g, b]. Blend mode 0 ignores alpha, so the game still adds them; the
 * preview does the same. (A browser canvas forgets such colours, hence the list.
 * tests/core.test.mjs checks it against the PNG files.)
 */
export const HIDDEN_TEXELS = {
  generic_2: [[4, 3, 255, 255, 255], [5, 3, 255, 255, 255], [4, 5, 255, 255, 255], [5, 5, 255, 255, 255]],
};

/** ParticleSystemBlendMode of the Code API. */
export const BLEND_MODES = [
  { id: 1, name: 'Normal' },
  { id: 2, name: 'Glow (additive)' },
  { id: 0, name: 'Glow, ignores alpha' },
  { id: 3, name: 'Multiply (darken)' },
  { id: 4, name: 'Multiply + add' },
];

export const DEFAULTS = {
  shape: 'point',
  count: 1,
  params: {},
  pos: [0.5, 1.5, 0.5],
  rot: [0, 0, 0],
  scale: [1, 1, 1],
  texture: 'glint',
  color: '#ffd24a',
  color2: null,
  size: 0.3,
  size2: null,
  life: 6,
  fade: false,
  blend: 1,
  move: [0, 0, 0],
  spread: 0,
  expand: 0,
  gravity: 0,
  hidden: false,
  // time (js/motion.js)
  start: 0, // seconds after the click until it appears
  fadeIn: false,
  keys: [], // [{ t, pos, rot, scale, ease }]: where it is `t` seconds after it appeared
  spin: false, // turn by the angles as written (full turns) instead of the short way round
  // groups and repeats
  parent: null, // id of the group it is in. Then pos, rot, scale and start count from that group.
  repeat: 1, // how many times it is played
  every: 0.5, // seconds from one play to the next
};

/** `shape` of a group: no particles of its own, it holds other objects (and groups). */
export const GROUP = 'group';
export const isGroup = (obj) => !!obj && obj.shape === GROUP;
/** Groups can sit in groups this many deep. */
export const MAX_DEPTH = 8;
/** One object is played this many times at most, however its groups repeat. */
export const MAX_PLAYS = 400;

let idCounter = 0;
export const newId = () => `o${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/** A new object with every field present. */
export function createObject(shape = 'point', overrides = {}) {
  const def = SHAPE_BY_ID[shape];
  const obj = {
    ...structuredCloneSafe(DEFAULTS),
    shape,
    name: def ? def.name : 'Particle',
    count: def ? def.count : 1,
    params: defaultParams(shape),
    ...structuredCloneSafe(overrides),
  };
  obj.id = overrides.id || newId();
  return obj;
}

const structuredCloneSafe = (v) => JSON.parse(JSON.stringify(v));

/**
 * A new group. Its place is the point it turns about (its pivot), and the
 * objects in it are placed from there.
 */
export function createGroup(overrides = {}) {
  return {
    id: overrides.id || newId(),
    name: 'Group',
    shape: GROUP,
    pos: [0, 0, 0],
    rot: [0, 0, 0],
    scale: [1, 1, 1],
    hidden: false,
    start: 0,
    keys: [],
    spin: false,
    parent: null,
    repeat: 1,
    every: 0.5,
    open: true, // its rows are shown in the scene list and on the timeline
    ...structuredCloneSafe({ ...overrides, id: undefined }),
  };
}

const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback);
const vec3 = (v, fallback) => (Array.isArray(v) && v.length === 3 ? v.map((x, i) => num(x, fallback[i])) : fallback.slice());
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const hex = (v, fallback) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback);

/** Repair anything loaded from storage or a file so the app can trust it. */
export function sanitizeObject(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  if (o.shape === GROUP) return sanitizeGroup(o);
  const shape = o.shape === 'point' || SHAPE_BY_ID[o.shape] ? o.shape : 'point';
  const def = SHAPE_BY_ID[shape];
  const out = createObject(shape, { id: typeof o.id === 'string' ? o.id : undefined });
  out.name = typeof o.name === 'string' && o.name.trim() ? o.name.slice(0, 40) : out.name;
  out.count = def ? clamp(Math.round(num(o.count, def.count)), def.min, 600) : 1;
  if (def && o.params && typeof o.params === 'object') {
    for (const p of def.params || []) out.params[p.key] = clamp(num(o.params[p.key], p.default), p.min, p.max);
  }
  out.pos = vec3(o.pos, DEFAULTS.pos).map((v) => clamp(v, -500, 500));
  out.rot = vec3(o.rot, DEFAULTS.rot);
  out.scale = vec3(o.scale, DEFAULTS.scale).map((v) => clamp(v, -100, 100));
  out.texture = TEXTURES.includes(o.texture) ? o.texture : DEFAULTS.texture;
  out.color = hex(o.color, DEFAULTS.color);
  out.color2 = hex(o.color2, null);
  out.size = clamp(num(o.size, DEFAULTS.size), 0.01, 50);
  out.size2 = o.size2 === null || o.size2 === undefined ? null : clamp(num(o.size2, out.size), 0.01, 50);
  out.life = clamp(num(o.life, DEFAULTS.life), 0.05, 1000);
  out.fade = !!o.fade;
  out.blend = BLEND_MODES.some((b) => b.id === Number(o.blend)) ? Number(o.blend) : 1;
  out.move = vec3(o.move, DEFAULTS.move).map((v) => clamp(v, -100, 100));
  out.spread = clamp(num(o.spread, 0), 0, 100);
  out.expand = clamp(num(o.expand, 0), -100, 100);
  out.gravity = clamp(num(o.gravity, 0), -500, 500);
  out.hidden = !!o.hidden;
  out.start = clamp(num(o.start, 0), 0, MAX_START);
  out.fadeIn = !!o.fadeIn;
  out.spin = !!o.spin;
  out.keys = sanitizeKeys(o.keys, out);
  Object.assign(out, sanitizeFamily(o));
  return out;
}

/** The fields objects and groups share: the group it is in, and how often it is played. */
function sanitizeFamily(o) {
  return {
    parent: typeof o.parent === 'string' && o.parent ? o.parent : null,
    repeat: clamp(Math.round(num(o.repeat, 1)), 1, MAX_REPEAT),
    every: Math.round(clamp(num(o.every, DEFAULTS.every), MIN_EVERY, 600) * 1000) / 1000,
  };
}

function sanitizeGroup(o) {
  const out = createGroup({ id: typeof o.id === 'string' ? o.id : undefined });
  out.name = typeof o.name === 'string' && o.name.trim() ? o.name.slice(0, 40) : out.name;
  out.pos = vec3(o.pos, out.pos).map((v) => clamp(v, -500, 500));
  out.rot = vec3(o.rot, out.rot);
  out.scale = vec3(o.scale, out.scale).map((v) => clamp(v, -100, 100));
  out.hidden = !!o.hidden;
  out.start = clamp(num(o.start, 0), 0, MAX_START);
  out.spin = !!o.spin;
  out.keys = sanitizeKeys(o.keys, out);
  Object.assign(out, sanitizeFamily(o));
  out.open = o.open !== false;
  return out;
}

/** Keys in order of time, far enough apart, with every field present. */
export function sanitizeKeys(raw, obj) {
  const list = (Array.isArray(raw) ? raw : [])
    .filter((k) => k && typeof k === 'object' && Number.isFinite(Number(k.t)) && k.t !== null && k.t !== '')
    .map((k) => {
      const key = {
        t: Math.round(clamp(Number(k.t), 0, 6000) * 1000) / 1000,
        pos: vec3(k.pos, obj.pos).map((v) => clamp(v, -500, 500)),
        rot: obj.shape === 'point' ? obj.rot.slice() : vec3(k.rot, obj.rot),
        scale: obj.shape === 'point' ? obj.scale.slice() : vec3(k.scale, obj.scale).map((v) => clamp(v, -100, 100)),
        ease: isEase(k.ease) ? k.ease : 'smooth',
      };
      if (obj.shape === GROUP) return key;
      // a key may also give the object another colour or particle size from there on
      if (hex(k.color, null)) {
        key.color = hex(k.color, null);
        key.color2 = hex(k.color2, null);
      }
      if (typeof k.size === 'number' && Number.isFinite(k.size)) {
        key.size = clamp(k.size, 0.01, 50);
        key.size2 = typeof k.size2 === 'number' && Number.isFinite(k.size2) ? clamp(k.size2, 0.01, 50) : null;
      }
      return key;
    })
    .sort((a, b) => a.t - b.t);
  const keys = [];
  let last = 0;
  for (const k of list) {
    if (keys.length >= MAX_KEYS) break;
    if (k.t < last + MIN_KEY_GAP - 1e-9) continue; // too close to the start or to the key before
    keys.push(k);
    last = k.t;
  }
  return keys;
}

export function sanitizeScene(raw) {
  const list = raw && Array.isArray(raw.objects) ? raw.objects : [];
  const seen = new Set();
  const objects = list.slice(0, 500).map(sanitizeObject);
  for (const o of objects) {
    while (seen.has(o.id)) o.id = newId();
    seen.add(o.id);
  }
  // an object can only be in a group that is there, and never in itself
  const byId = new Map(objects.map((o) => [o.id, o]));
  for (const o of objects) if (!isGroup(byId.get(o.parent)) || o.parent === o.id) o.parent = null;
  for (const o of objects) {
    const met = new Set([o.id]);
    for (let p = o, depth = 0; p.parent; depth++) {
      p = byId.get(p.parent);
      if (met.has(p.id) || depth >= MAX_DEPTH) { o.parent = null; break; }
      met.add(p.id);
    }
  }
  return { version: 1, objects };
}

export const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const rgbToHex = (rgb) => '#' + rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

export const toView = (p) => [p[0], p[1], -p[2]];
export const toBloxd = toView; // the flip is its own inverse

/** Shape points before the object's transform. */
export function localPoints(obj) {
  return isGroup(obj) ? [] : shapePoints(obj.shape, obj.count, obj.params);
}

/** Where each particle of an object is when the object stands at a pose ({ pos, rot, scale }), in Bloxd space. */
export function posedPoints(obj, pose) {
  const m = rotationMatrix(pose.rot[0], pose.rot[1], pose.rot[2]);
  const [sx, sy, sz] = pose.scale;
  const [px, py, pz] = toView(pose.pos);
  return localPoints(obj).map(([lx, ly, lz]) => {
    const x = lx * sx, y = ly * sy, z = lz * sz;
    return toBloxd([
      px + m[0] * x + m[1] * y + m[2] * z,
      py + m[3] * x + m[4] * y + m[5] * z,
      pz + m[6] * x + m[7] * y + m[8] * z,
    ]);
  });
}

/** Where each particle of an object that is in no group spawns, in Bloxd space. */
export const objectPoints = (obj) => posedPoints(obj, obj);

export const isMoving = (obj) => obj.move.some((v) => v !== 0) || obj.spread > 0 || obj.expand !== 0;

// ---------------------------------------------------------------- groups and repeats

const boxes = new Map();
/** Two opposite corners of the box the points of a shape fit in. */
function localBox(obj) {
  const key = `${obj.shape}|${obj.count}|${JSON.stringify(obj.params)}`;
  let box = boxes.get(key);
  if (!box) {
    const points = localPoints(obj);
    box = [[0, 1, 2].map((i) => Math.min(...points.map((l) => l[i]))), [0, 1, 2].map((i) => Math.max(...points.map((l) => l[i])))];
    if (boxes.size > 2000) boxes.clear();
    boxes.set(key, box);
  }
  return box;
}

const repeatOf = (node) => (node.repeat > 1 ? Math.round(node.repeat) : 1);
const everyOf = (node) => (node.every > 0 ? node.every : 0);
const startOf = (node) => (node.start > 0 ? node.start : 0);

/**
 * Who is in which group, and when everything happens. Made fresh from the list
 * of objects whenever it is needed (it is cheap), so it is never out of date.
 *
 * Times are seconds after the click on the code block. A node in a group
 * counts its `start` from the moment the group starts; a node that repeats is
 * played `repeat` times, `every` seconds apart. Where a time is asked for
 * without saying which play, it is the first one.
 */
export function sceneTree(objects) {
  const byId = new Map(objects.map((o) => [o.id, o]));
  const kids = new Map([[null, []]]);
  for (const o of objects) {
    const parent = isGroup(byId.get(o.parent)) && o.parent !== o.id ? o.parent : null;
    if (!kids.has(parent)) kids.set(parent, []);
    kids.get(parent).push(o);
  }
  const parentOf = (node) => (isGroup(byId.get(node.parent)) && node.parent !== node.id ? byId.get(node.parent) : null);
  /** The groups around a node, nearest first. */
  const chainOf = (node) => {
    const out = [];
    for (let p = parentOf(node); p && out.length <= MAX_DEPTH && !out.includes(p); p = parentOf(p)) out.push(p);
    return out;
  };
  const childrenOf = (node) => kids.get(node ? node.id : null) || [];
  /** Everything in a group, at any depth (not the group itself). */
  const insideOf = (node) => childrenOf(node).flatMap((child) => [child, ...insideOf(child)]);
  const leavesOf = (node) => (isGroup(node) ? insideOf(node).filter((n) => !isGroup(n)) : [node]);
  const isHidden = (node) => !!node.hidden || chainOf(node).some((g) => g.hidden);

  const lengths = new Map();
  /**
   * Seconds from the start of a node until all its plays are over. A group
   * lasts as long as what is in it, or until its own last key if that is later.
   */
  const lengthOf = (node) => {
    if (!lengths.has(node)) {
      lengths.set(node, 0); // (should a list ever hold a loop, it ends here)
      const lastKey = node.keys && node.keys.length ? node.keys[node.keys.length - 1].t : 0;
      const once = isGroup(node)
        ? Math.max(lastKey, ...childrenOf(node).map((child) => startOf(child) + lengthOf(child)))
        : staySeconds(node);
      lengths.set(node, once + (repeatOf(node) - 1) * everyOf(node));
    }
    return lengths.get(node);
  };
  /** Seconds one play of a node takes. */
  const onceOf = (node) => lengthOf(node) - (repeatOf(node) - 1) * everyOf(node);
  /** The second at which the group around a node starts (0 for a node in no group). */
  const originOf = (node) => chainOf(node).reduce((sum, g) => sum + startOf(g), 0);
  /**
   * First and last second a node is there, with everything in it and all its
   * plays. (If a group around it repeats, this is the first time round.)
   */
  const span = (node) => {
    const start = originOf(node) + startOf(node);
    return { start, end: start + lengthOf(node) };
  };
  /** The same seen from the group around it: what `markAt` and the keys count from. */
  const ownSpan = (node) => ({ start: startOf(node), end: startOf(node) + lengthOf(node) });

  /** The groups around a node with the second each of them starts: [{ node, start }], nearest first. */
  const ancestorsOf = (node) => {
    const chain = chainOf(node);
    let at = 0;
    const starts = new Array(chain.length);
    for (let k = chain.length - 1; k >= 0; k--) {
      at += startOf(chain[k]);
      starts[k] = at;
    }
    return chain.map((g, k) => ({ node: g, start: starts[k] }));
  };

  /**
   * Every play of an object: [{ start, ancestors, box }], ready for planOf().
   * Each group around it that repeats plays it again.
   */
  const playsOf = (leaf) => {
    const chain = [leaf, ...chainOf(leaf)];
    let plays = [{ at: 0, starts: [] }];
    for (let k = chain.length - 1; k >= 0; k--) {
      const node = chain[k];
      const next = [];
      for (const play of plays) {
        for (let i = 0; i < repeatOf(node) && next.length < MAX_PLAYS; i++) {
          const start = play.at + startOf(node) + i * everyOf(node);
          next.push({ at: start, starts: [start, ...play.starts] });
        }
      }
      plays = next;
    }
    const box = chain.length > 1 && leaf.shape !== 'point' && !isGroup(leaf) ? localBox(leaf) : undefined;
    return plays.map(({ starts }) => ({
      start: starts[0], box,
      ancestors: chain.slice(1).map((node, k) => ({ node, start: starts[k + 1] })),
    }));
  };

  /**
   * The play a time on the timeline belongs to: the one that started last, or
   * the first one while none has started. Works for groups too.
   */
  const playAt = (node, time) => latestPlay(playsOf(node), time);

  /** The second the very last play of an object is over, counting the repeats of the groups around it. */
  const lastEnd = (leaf) => {
    const chain = [leaf, ...chainOf(leaf)];
    if (chain.reduce((n, node) => n * repeatOf(node), 1) > MAX_PLAYS) {
      return Math.max(...playsOf(leaf).map((play) => play.start)) + staySeconds(leaf); // (not all of them are played)
    }
    return chain.reduce((sum, node) => sum + startOf(node) + (repeatOf(node) - 1) * everyOf(node), 0) + staySeconds(leaf);
  };

  /** Where a node is at a time, seen from the group around it: { pos, rot, scale }. */
  const poseOf = (node, time) => poseAt(node, time - originOf(node) - startOf(node));
  /** The groups around a node as one view matrix, at a time. */
  const aroundOf = (node, time) => lineageMatrix(ancestorsOf(node), time);
  /** A node as a view matrix at a time: a point of it -> where it is in the scene (view space). */
  const matrixOf = (node, time) => mulAffine(aroundOf(node, time), viewMatrix(poseOf(node, time)));

  /** An object the code generator can write the short way: neither it nor a group around it has any timing. */
  const plain = (leaf) => isPlain(leaf) && chainOf(leaf).every((g) => !(g.start > 0) && !g.keys.length && !(g.repeat > 1));

  /** Rows for a list, groups before what is in them: [{ node, depth }]. `folded`: leave out what closed groups hold. */
  const rows = (folded = false) => {
    const out = [];
    const walk = (node, depth) => {
      out.push({ node, depth });
      if (isGroup(node) && !(folded && node.open === false)) for (const child of childrenOf(node)) walk(child, depth + 1);
    };
    for (const node of childrenOf(null)) walk(node, 0);
    return out;
  };

  return {
    byId, parentOf, chainOf, childrenOf, insideOf, leavesOf, isHidden, lengthOf, onceOf, originOf, span, ownSpan,
    ancestorsOf, playsOf, playAt, lastEnd, poseOf, aroundOf, matrixOf, plain, rows,
    /** The objects that make particles and are not hidden, in the order of the list. */
    leaves: () => objects.filter((o) => !isGroup(o) && !isHidden(o)),
  };
}

/** Of some plays the one that started last before a time, or the first one while none has started. */
function latestPlay(plays, time) {
  let best = plays[0];
  for (const play of plays) if (play.start <= time + 1e-9 && play.start >= best.start) best = play;
  return best;
}

/** Where each particle of an object is when it and its groups stand where they start (the still picture). */
export function stillPoints(tree, obj) {
  const m = flipZ(mulAffine(tree.aroundOf(obj, -Infinity), viewMatrix(obj)));
  return localPoints(obj).map((l) => applyMatrix(m, l));
}

/** The Move setting of an object as the game needs it: turned and sized the way its groups are where they start. */
export function stillMove(tree, obj) {
  const around = inBloxd(tree.aroundOf(obj, -Infinity));
  return [0, 4, 8].map((r) => around[r] * obj.move[0] + around[r + 1] * obj.move[1] + around[r + 2] * obj.move[2]);
}

/** Small deterministic random generator so previews do not flicker. */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hashString = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** How visible an object is drawn while it is not there (see `ghosts` below). */
export const GHOST = 0.3;

/**
 * The particles to draw.
 *   time === null : the still picture, every object at its first place
 *   a number      : what the game shows `time` real seconds after the click
 * options.ghosts (with a number): for editing. An object that is not there at
 * that time is drawn see-through where it starts (or where it ended), and no
 * object is fainter than that, so everything can still be picked.
 * Returns [{ id, index, pos (Bloxd), size, rgb, alpha, texture, blend, ghost? }].
 */
export function computeParticles(objects, time = null, options = {}) {
  const out = [];
  const tree = sceneTree(objects);
  for (const obj of objects) {
    if (isGroup(obj) || tree.isHidden(obj)) continue;
    const local = localPoints(obj);
    const c1 = hexToRgb(obj.color);
    const c2 = obj.color2 ? hexToRgb(obj.color2) : c1;
    const plain = tree.plain(obj);
    const add = (i, pos, size, rgb, visible, ghost) => {
      // Blend mode 0 ignores alpha in the game. An object with timing is hidden
      // there by darkening its colour instead (black adds nothing).
      const darken = obj.blend === 0 && (ghost || !plain);
      const alpha = options.ghosts && time !== null ? Math.max(visible, GHOST) : visible;
      const item = {
        id: obj.id, index: i, pos, size, rgb: darken ? rgb.map((v) => v * alpha) : rgb, alpha,
        texture: obj.texture, blend: obj.blend,
      };
      if (ghost) item.ghost = true;
      out.push(item);
    };
    /** The whole shape standing still at a matrix, in the look it starts with. */
    const standing = (m, ghost) => {
      const rnd = seeded(hashString(obj.id));
      for (let i = 0; i < local.length; i++) {
        const mix = rnd(), sizeMix = rnd();
        rnd(); rnd(); rnd();
        const size = obj.size2 === null ? obj.size : obj.size + (obj.size2 - obj.size) * sizeMix;
        add(i, applyMatrix(m, local[i]), size, c1.map((v, k) => v + (c2[k] - v) * mix), ghost ? GHOST : 1, ghost);
      }
    };
    if (time === null) {
      standing(flipZ(mulAffine(tree.aroundOf(obj, -Infinity), viewMatrix(obj))), false);
      continue;
    }
    const age = time * LIFE_PER_SECOND;
    const plays = tree.playsOf(obj);
    let seen = false;
    plays.forEach((lineage, n) => {
      const plan = planOf(obj, lineage);
      const shown = piecesAt(plan, age);
      if (!shown.length) return;
      seen = true;
      // every play picks its own colours, sizes and ways, as the game does
      const rnd = seeded(hashString(obj.id) + n * 7919);
      for (let i = 0; i < local.length; i++) {
        const mix = rnd(), sizeMix = rnd(), jx = rnd(), jy = rnd(), jz = rnd();
        for (const { piece, u, w, visible } of shown) {
          const pos = applyMatrix(piece.P, local[i]);
          if (piece.V && u !== 0) {
            const dir = applyMatrix(piece.V, local[i]);
            const jitter = [jx, jy, jz];
            for (let k = 0; k < 3; k++) pos[k] += (dir[k] + (jitter[k] * 2 - 1) * piece.spread) * u;
          }
          if (piece.g && w !== 0) for (let k = 0; k < 3; k++) pos[k] += piece.g[k] * w;
          const size = piece.size
            ? piece.size[0] + (piece.size[1] - piece.size[0]) * sizeMix
            : obj.size2 === null ? obj.size : obj.size + (obj.size2 - obj.size) * sizeMix;
          const [a, b] = piece.tint ? tintAt(piece.tint, age) : [c1, c2];
          add(i, pos, size, a.map((v, k) => v + (b[k] - v) * mix), visible, false);
        }
      }
    });
    if (seen || !options.ghosts) continue;
    // not there at this time: see-through where its latest play ended, or where it starts while none has begun
    const play = latestPlay(plays, time);
    const gone = time >= play.start + staySeconds(obj);
    const around = lineageMatrix(play.ancestors, gone ? play.start + staySeconds(obj) : play.start);
    standing(flipZ(mulAffine(around, viewMatrix(restPose(obj, gone)))), true);
  }
  return out;
}

/** How long the whole scene stays on screen, in real seconds. */
export function sceneDuration(objects) {
  const tree = sceneTree(objects);
  let end = 0;
  for (const o of tree.leaves()) end = Math.max(end, tree.lastEnd(o));
  return end;
}

/** Where an object that is in no group is at a time on the timeline, as { pos, rot, scale }. */
export function poseAtTime(obj, time) {
  const { start, end } = spanOf(obj);
  if (time <= start) return restPose(obj, false);
  if (time >= end) return restPose(obj, true);
  return poseAt(obj, time - start);
}
