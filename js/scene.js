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
  LIFE_PER_SECOND, FADE_START, rotationMatrix, MAX_KEYS, MIN_KEY_GAP, MAX_START, isEase,
  planOf, piecesAt, spanOf, poseAt, restPose, applyMatrix, isPlain,
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
};

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

const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback);
const vec3 = (v, fallback) => (Array.isArray(v) && v.length === 3 ? v.map((x, i) => num(x, fallback[i])) : fallback.slice());
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const hex = (v, fallback) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback);

/** Repair anything loaded from storage or a file so the app can trust it. */
export function sanitizeObject(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
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
  return out;
}

/** Keys in order of time, far enough apart, with every field present. */
export function sanitizeKeys(raw, obj) {
  const list = (Array.isArray(raw) ? raw : [])
    .filter((k) => k && typeof k === 'object' && Number.isFinite(Number(k.t)) && k.t !== null && k.t !== '')
    .map((k) => ({
      t: Math.round(clamp(Number(k.t), 0, 6000) * 1000) / 1000,
      pos: vec3(k.pos, obj.pos).map((v) => clamp(v, -500, 500)),
      rot: obj.shape === 'point' ? obj.rot.slice() : vec3(k.rot, obj.rot),
      scale: obj.shape === 'point' ? obj.scale.slice() : vec3(k.scale, obj.scale).map((v) => clamp(v, -100, 100)),
      ease: isEase(k.ease) ? k.ease : 'smooth',
    }))
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
  return { version: 1, objects };
}

export const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const rgbToHex = (rgb) => '#' + rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

export const toView = (p) => [p[0], p[1], -p[2]];
export const toBloxd = toView; // the flip is its own inverse

/** Shape points before the object's transform. */
export function localPoints(obj) {
  return shapePoints(obj.shape, obj.count, obj.params);
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

/** Where each particle of an object spawns, in Bloxd space. */
export const objectPoints = (obj) => posedPoints(obj, obj);

export const isMoving = (obj) => obj.move.some((v) => v !== 0) || obj.spread > 0 || obj.expand !== 0;

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
  for (const obj of objects) {
    if (obj.hidden) continue;
    let shown = null; // the pieces of its plan that are seen now
    let pose = null; // or: the place it simply stands at
    let ghost = false;
    if (time === null) pose = obj;
    else {
      const plan = planOf(obj);
      const age = time * LIFE_PER_SECOND;
      shown = piecesAt(plan, age);
      if (!shown.length) {
        if (!options.ghosts) continue;
        pose = restPose(obj, age >= plan.a1);
        ghost = true;
      }
    }
    const local = localPoints(obj);
    const fixed = pose ? posedPoints(obj, pose) : null;
    const rnd = seeded(hashString(obj.id));
    const c1 = hexToRgb(obj.color);
    const c2 = obj.color2 ? hexToRgb(obj.color2) : c1;
    // Blend mode 0 ignores alpha in the game. An object with timing is hidden
    // there by darkening its colour instead (black adds nothing).
    const darken = obj.blend === 0 && (ghost || !isPlain(obj));
    for (let i = 0; i < local.length; i++) {
      const mix = rnd(), sizeMix = rnd(), jx = rnd(), jy = rnd(), jz = rnd();
      const size = obj.size2 === null ? obj.size : obj.size + (obj.size2 - obj.size) * sizeMix;
      const rgb = c1.map((v, k) => v + (c2[k] - v) * mix);
      const add = (pos, visible) => {
        const alpha = options.ghosts && time !== null ? Math.max(visible, GHOST) : visible;
        const item = {
          id: obj.id, index: i, pos, size, rgb: darken ? rgb.map((v) => v * alpha) : rgb, alpha,
          texture: obj.texture, blend: obj.blend,
        };
        if (ghost) item.ghost = true;
        out.push(item);
      };
      if (fixed) {
        add(fixed[i], ghost ? GHOST : 1);
        continue;
      }
      for (const { piece, u, w, visible } of shown) {
        const pos = applyMatrix(piece.P, local[i]);
        if (piece.V && u !== 0) {
          const dir = applyMatrix(piece.V, local[i]);
          const jitter = [jx, jy, jz];
          for (let k = 0; k < 3; k++) pos[k] += (dir[k] + (jitter[k] * 2 - 1) * piece.spread) * u;
        }
        if (piece.g && w !== 0) for (let k = 0; k < 3; k++) pos[k] += piece.g[k] * w;
        add(pos, visible);
      }
    }
  }
  return out;
}

/** How long the whole scene stays on screen, in real seconds. */
export function sceneDuration(objects) {
  let end = 0;
  for (const o of objects) if (!o.hidden) end = Math.max(end, spanOf(o).end);
  return end;
}

/** Where an object is at a time on the timeline, as { pos, rot, scale }. */
export function poseAtTime(obj, time) {
  const { start, end } = spanOf(obj);
  if (time <= start) return restPose(obj, false);
  if (time >= end) return restPose(obj, true);
  return poseAt(obj, time - start);
}
