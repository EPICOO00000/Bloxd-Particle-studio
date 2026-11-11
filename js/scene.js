// Scene model + particle maths. Pure (no DOM, no three.js) so Node can test it.
//
// Coordinates
//   Bloxd space : what the game uses. [0,0,0] is the code block's corner
//                 (thisPos), so every position is "blocks away from the block".
//   View space  : what three.js draws. Bloxd is left-handed and three.js is
//                 right-handed, so view = [x, y, -z]. Flipping Z keeps the scene
//                 from coming out mirrored in the game.

import { shapePoints, SHAPE_BY_ID, defaultParams } from './shapes.js';

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

/**
 * The game advances particle time by 0.01 per frame at 60 fps (Babylon's default
 * updateSpeed), so 1 unit of minLifeTime/maxLifeTime lasts about 1/0.6 seconds.
 */
export const LIFE_PER_SECOND = 0.6;

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
  return out;
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

const RAD = Math.PI / 180;

/** 3x3 rotation matrix (row-major), same convention as THREE.Euler order 'XYZ'. */
export function rotationMatrix(rx, ry, rz) {
  const a = Math.cos(rx * RAD), b = Math.sin(rx * RAD);
  const c = Math.cos(ry * RAD), d = Math.sin(ry * RAD);
  const e = Math.cos(rz * RAD), f = Math.sin(rz * RAD);
  return [
    c * e, -c * f, d,
    a * f + b * e * d, a * e - b * f * d, -b * c,
    b * f - a * e * d, b * e + a * f * d, a * c,
  ];
}

export const toView = (p) => [p[0], p[1], -p[2]];
export const toBloxd = toView; // the flip is its own inverse

/** Shape points before the object's transform. */
export function localPoints(obj) {
  return shapePoints(obj.shape, obj.count, obj.params);
}

/** Where each particle of an object spawns, in Bloxd space. */
export function objectPoints(obj) {
  const m = rotationMatrix(obj.rot[0], obj.rot[1], obj.rot[2]);
  const [sx, sy, sz] = obj.scale;
  const [px, py, pz] = toView(obj.pos);
  return localPoints(obj).map(([lx, ly, lz]) => {
    const x = lx * sx, y = ly * sy, z = lz * sz;
    return toBloxd([
      px + m[0] * x + m[1] * y + m[2] * z,
      py + m[3] * x + m[4] * y + m[5] * z,
      pz + m[6] * x + m[7] * y + m[8] * z,
    ]);
  });
}

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

/**
 * The particles to draw. time === null gives the still "editing" picture;
 * a number plays the effect `time` real seconds after the code block was clicked.
 * Returns [{ id, index, pos (Bloxd), size, rgb, alpha, texture, blend }].
 */
export function computeParticles(objects, time = null) {
  const out = [];
  for (const obj of objects) {
    if (obj.hidden) continue;
    const points = objectPoints(obj);
    const rnd = seeded(hashString(obj.id));
    const c1 = hexToRgb(obj.color);
    const c2 = obj.color2 ? hexToRgb(obj.color2) : c1;
    const age = time === null ? 0 : time * LIFE_PER_SECOND;
    for (let i = 0; i < points.length; i++) {
      const mix = rnd(), sizeMix = rnd(), jx = rnd(), jy = rnd(), jz = rnd();
      if (age >= obj.life) continue;
      const p = points[i];
      const pos = p.slice();
      if (age > 0) {
        const jitter = [jx, jy, jz];
        for (let k = 0; k < 3; k++) {
          const v = obj.move[k] + (jitter[k] * 2 - 1) * obj.spread + (p[k] - obj.pos[k]) * obj.expand;
          pos[k] += v * age;
        }
        pos[1] += 0.5 * obj.gravity * age * age;
      }
      const fraction = age / obj.life;
      out.push({
        id: obj.id,
        index: i,
        pos,
        size: obj.size2 === null ? obj.size : obj.size + (obj.size2 - obj.size) * sizeMix,
        rgb: c1.map((v, k) => v + (c2[k] - v) * mix),
        alpha: obj.fade && fraction > FADE_START ? 1 - (fraction - FADE_START) / (1 - FADE_START) : 1,
        texture: obj.texture,
        blend: obj.blend,
      });
    }
  }
  return out;
}

/** Fade-out starts at this fraction of the lifetime. */
export const FADE_START = 0.8;

/** How long the whole scene stays on screen, in real seconds. */
export function sceneDuration(objects) {
  let life = 0;
  for (const o of objects) if (!o.hidden) life = Math.max(life, o.life);
  return life / LIFE_PER_SECOND;
}
