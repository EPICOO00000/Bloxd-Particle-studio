// Shape library: every shape is a list of points ("dozens of small particles").
// Pure functions, no dependencies — also used by the Node tests.
//
// Local coordinates: shapes fit in about [-1, 1] on each axis (2 blocks across at
// scale 1). Flat shapes lie in the XY plane (standing up, facing the camera).
//
// This file holds the first 24 shapes and puts the whole library together:
//   shape-kit.js     the geometry tools every shape is built from
//   shapes-geo.js    shapes made from formulas (basic, 3D, curves, effects)
//   shapes-text.js   letters, numbers and signs
//   shapes-icons.js  pictures drawn with strokes (symbols, nature, things)

import {
  TAU, GOLDEN, P, resample, apportion, wire, loopEdges, polygon, curve, ring,
} from './shape-kit.js';
import { GEO_SHAPES } from './shapes-geo.js';
import { TEXT_SHAPES } from './shapes-text.js';
import { ICON_SHAPES } from './shapes-icons.js';

export { resample };

/** The tabs of the shape picker, in order. */
export const CATEGORIES = [
  { id: 'basic', name: 'Basic' },
  { id: 'solid', name: '3D' },
  { id: 'letters', name: 'Letters' },
  { id: 'numbers', name: 'Numbers' },
  { id: 'symbols', name: 'Symbols' },
  { id: 'nature', name: 'Nature' },
  { id: 'things', name: 'Things' },
  { id: 'curves', name: 'Curves' },
  { id: 'effects', name: 'Effects' },
];

/**
 * id, name, group ('flat' | 'solid': how the picker draws its little picture),
 * cat (tab of the picker), count (default), min (fewest useful particles),
 * params (extra sliders), gen(n, params) -> [[x, y, z], ...]
 * Optional: label (short name under the picture), tags (extra search words),
 * tidy (the shape rounds "How many" to a count that fits its pattern).
 */
const FIRST_SHAPES = [
  {
    id: 'line', name: 'Line', group: 'flat', count: 16, min: 2,
    gen: (n) => resample([[-1, 0, 0], [1, 0, 0]], n),
  },
  {
    id: 'circle', name: 'Circle', group: 'flat', count: 36, min: 3,
    gen: (n) => polygon(n, n),
  },
  {
    id: 'disc', name: 'Disc', group: 'flat', count: 70, min: 4,
    gen: (n) => Array.from({ length: n }, (_, i) => {
      const r = Math.sqrt((i + 0.5) / n);
      return [Math.cos(i * GOLDEN) * r, Math.sin(i * GOLDEN) * r, 0];
    }),
  },
  {
    id: 'arc', name: 'Arc', group: 'flat', count: 24, min: 3,
    params: [P('angle', 'Angle', 30, 330, 5, 180)],
    gen: (n, p) => {
      const half = ((p.angle * Math.PI) / 180) / 2;
      return Array.from({ length: n }, (_, i) => {
        const a = n > 1 ? -half + (2 * half * i) / (n - 1) : 0;
        return [Math.sin(a), Math.cos(a), 0];
      });
    },
  },
  {
    id: 'square', name: 'Square', group: 'flat', count: 40, min: 4,
    gen: (n) => wire([[-1, 1, 0], [1, 1, 0], [1, -1, 0], [-1, -1, 0]], loopEdges(4), n),
  },
  {
    id: 'grid', name: 'Filled square', group: 'flat', count: 49, min: 4, tidy: true,
    gen: (n) => {
      const k = Math.max(2, Math.round(Math.sqrt(n)));
      const out = [];
      for (let y = 0; y < k; y++) {
        for (let x = 0; x < k; x++) out.push([-1 + (2 * x) / (k - 1), 1 - (2 * y) / (k - 1), 0]);
      }
      return out;
    },
  },
  {
    id: 'triangle', name: 'Triangle', group: 'flat', count: 30, min: 3,
    gen: (n) => polygon(3, n),
  },
  {
    id: 'polygon', name: 'Polygon', group: 'flat', count: 36, min: 5,
    params: [P('sides', 'Sides', 5, 12, 1, 6)],
    gen: (n, p) => polygon(Math.round(p.sides), n),
  },
  {
    id: 'star', name: 'Star', group: 'flat', count: 50, min: 10,
    params: [P('points', 'Points', 4, 10, 1, 5), P('inner', 'Inner size', 0.2, 0.8, 0.05, 0.45)],
    gen: (n, p) => polygon(Math.round(p.points), n, 1, p.inner),
  },
  {
    id: 'heart', name: 'Heart', group: 'flat', count: 44, min: 8,
    gen: (n) => curve((t) => {
      const a = t * TAU;
      const x = 16 * Math.sin(a) ** 3;
      const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
      return [x / 16, (y + 2.5) / 16, 0];
    }, n, true),
  },
  {
    id: 'cross', name: 'Plus', group: 'flat', count: 25, min: 5,
    gen: (n) => wire(
      [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]],
      [[0, 1], [0, 2], [0, 3], [0, 4]], n),
  },
  {
    id: 'rays', name: 'Rays', group: 'flat', count: 48, min: 8,
    params: [P('rays', 'Rays', 3, 16, 1, 8), P('inner', 'Inner size', 0, 0.8, 0.05, 0.3)],
    gen: (n, p) => {
      const count = Math.round(p.rays);
      const verts = [];
      const edges = [];
      for (let i = 0; i < count; i++) {
        const a = (TAU * i) / count;
        verts.push([Math.sin(a) * p.inner, Math.cos(a) * p.inner, 0], [Math.sin(a), Math.cos(a), 0]);
        edges.push([i * 2, i * 2 + 1]);
      }
      return wire(verts, edges, n);
    },
  },
  {
    id: 'spiral', name: 'Spiral', group: 'flat', count: 60, min: 6,
    params: [P('turns', 'Turns', 1, 6, 0.5, 3)],
    gen: (n, p) => curve((t) => {
      const a = t * p.turns * TAU;
      return [Math.sin(a) * t, Math.cos(a) * t, 0];
    }, n),
  },
  {
    id: 'wave', name: 'Wave', group: 'flat', count: 40, min: 6,
    params: [P('waves', 'Waves', 0.5, 5, 0.5, 2), P('height', 'Height', 0.1, 1, 0.05, 0.4)],
    gen: (n, p) => curve((t) => [-1 + 2 * t, Math.sin(t * p.waves * TAU) * p.height, 0], n),
  },
  {
    id: 'sphere', name: 'Sphere', group: 'solid', count: 90, min: 6,
    gen: (n) => Array.from({ length: n }, (_, i) => {
      const y = 1 - (2 * (i + 0.5)) / n;
      const r = Math.sqrt(1 - y * y);
      return [Math.cos(i * GOLDEN) * r, y, Math.sin(i * GOLDEN) * r];
    }),
  },
  {
    id: 'dome', name: 'Dome', group: 'solid', count: 60, min: 6,
    gen: (n) => Array.from({ length: n }, (_, i) => {
      const y = (i + 0.5) / n;
      const r = Math.sqrt(1 - y * y);
      return [Math.cos(i * GOLDEN) * r, y, Math.sin(i * GOLDEN) * r];
    }),
  },
  {
    id: 'cube', name: 'Cube', group: 'solid', count: 68, min: 8,
    gen: (n) => {
      const v = [];
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
      const e = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      return wire(v, e, n);
    },
  },
  {
    id: 'lattice', name: 'Filled cube', group: 'solid', count: 64, min: 8, tidy: true,
    gen: (n) => {
      const k = Math.max(2, Math.round(Math.cbrt(n)));
      const at = (i) => -1 + (2 * i) / (k - 1);
      const out = [];
      for (let y = 0; y < k; y++) for (let z = 0; z < k; z++) for (let x = 0; x < k; x++) out.push([at(x), at(y), at(z)]);
      return out;
    },
  },
  {
    id: 'cylinder', name: 'Cylinder', group: 'solid', count: 80, min: 6,
    params: [P('rings', 'Rings', 2, 10, 1, 4)],
    gen: (n, p) => {
      const rings = Math.max(2, Math.round(p.rings));
      const per = apportion(Array(rings).fill(1), n);
      return per.flatMap((count, j) => ring(count, 1, -1 + (2 * j) / (rings - 1), j % 2 ? Math.PI / Math.max(1, count) : 0));
    },
  },
  {
    id: 'cone', name: 'Cone', group: 'solid', count: 60, min: 5,
    params: [P('rings', 'Rings', 1, 10, 1, 4)],
    gen: (n, p) => {
      const rings = Math.max(1, Math.round(p.rings));
      const radius = Array.from({ length: rings }, (_, j) => 1 - j / rings);
      const per = apportion(radius, n - 1);
      const out = per.flatMap((count, j) => ring(count, radius[j], -1 + (2 * j) / rings, j % 2 ? Math.PI / Math.max(1, count) : 0));
      out.push([0, 1, 0]);
      return out;
    },
  },
  {
    id: 'pyramid', name: 'Pyramid', group: 'solid', count: 53, min: 5,
    gen: (n) => wire(
      [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [0, 1, 0]],
      [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4]], n),
  },
  {
    id: 'torus', name: 'Donut', group: 'solid', count: 96, min: 9, tidy: true,
    params: [P('tube', 'Thickness', 0.1, 0.5, 0.05, 0.3)],
    gen: (n, p) => {
      const r = p.tube;
      const R = 1 - r;
      const nv = Math.max(3, Math.round(Math.sqrt((n * r) / R)));
      const nu = Math.max(3, Math.round(n / nv));
      const out = [];
      for (let u = 0; u < nu; u++) {
        for (let v = 0; v < nv; v++) {
          const a = (TAU * u) / nu;
          const b = (TAU * (v + (u % 2) / 2)) / nv;
          const d = R + r * Math.cos(b);
          out.push([Math.cos(a) * d, r * Math.sin(b), Math.sin(a) * d]);
        }
      }
      return out;
    },
  },
  {
    id: 'helix', name: 'Helix', group: 'solid', count: 60, min: 6,
    params: [P('turns', 'Turns', 1, 8, 0.5, 3)],
    gen: (n, p) => Array.from({ length: n }, (_, i) => {
      const t = n > 1 ? i / (n - 1) : 0;
      const a = t * p.turns * TAU;
      return [Math.cos(a), -1 + 2 * t, Math.sin(a)];
    }),
  },
  {
    id: 'tornado', name: 'Tornado', group: 'solid', count: 70, min: 6,
    params: [P('turns', 'Turns', 1, 8, 0.5, 4)],
    gen: (n, p) => curve((t) => {
      const a = t * p.turns * TAU;
      const r = 0.12 + 0.88 * t;
      return [Math.cos(a) * r, -1 + 2 * t, Math.sin(a) * r];
    }, n),
  },
];

// Other words people type when they look for one of the first shapes.
const SEARCH_WORDS = {
  circle: 'ring round', disc: 'filled circle dot', arc: 'curve bow', square: 'box', grid: 'filled square dots',
  polygon: 'hexagon pentagon octagon', cross: 'cross add', rays: 'burst sunburst', spiral: 'swirl', wave: 'sine',
  sphere: 'ball round', dome: 'half ball', cube: 'box block', lattice: 'filled cube grid', cylinder: 'tube pipe',
  torus: 'donut ring', helix: 'spring coil', tornado: 'twister funnel',
};

for (const s of FIRST_SHAPES) {
  s.cat = s.group === 'solid' ? 'solid' : 'basic';
  if (SEARCH_WORDS[s.id]) s.tags = SEARCH_WORDS[s.id];
}

/** Every shape, grouped by tab in the order of CATEGORIES. */
export const SHAPES = (() => {
  const all = [...FIRST_SHAPES, ...GEO_SHAPES, ...TEXT_SHAPES, ...ICON_SHAPES];
  return CATEGORIES.flatMap((c) => all.filter((s) => s.cat === c.id));
})();

export const SHAPE_BY_ID = Object.fromEntries(SHAPES.map((s) => [s.id, s]));

const TAB_NAME = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name.toLowerCase()]));

/** Default values of a shape's extra sliders. */
export function defaultParams(shapeId) {
  const shape = SHAPE_BY_ID[shapeId];
  const out = {};
  for (const p of (shape && shape.params) || []) out[p.key] = p.default;
  return out;
}

/**
 * Shapes that match what was typed into the search box, best match first.
 * Every word has to appear in the name, the sign ("A", "7", "?"), the search
 * words or the name of the tab.
 */
export function searchShapes(text) {
  const words = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const typed = words.join(' ');
  const found = [];
  SHAPES.forEach((s, order) => {
    const name = s.name.toLowerCase();
    const label = (s.label || '').toLowerCase();
    const all = `${name} ${label} ${(s.tags || '').toLowerCase()} ${TAB_NAME[s.cat]} ${s.id}`;
    const parts = all.split(/[\s-]+/);
    // a single letter has to start a word, or "a" would find nearly everything
    if (!words.every((w) => (w.length > 1 ? all.includes(w) : parts.some((x) => x.startsWith(w))))) return;
    let rank = 5;
    if (label === typed || name === typed) rank = 0;
    else if (name.startsWith(typed)) rank = 1;
    else if (name.split(' ').some((w) => w.startsWith(typed))) rank = 2;
    else if (name.includes(typed)) rank = 3;
    else if (parts.some((w) => w.startsWith(typed))) rank = 4;
    found.push([rank, order, s]);
  });
  return found.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((f) => f[2]);
}

export const MAX_COUNT = 600;

// The same shape is asked for again and again (every frame while playing), so
// the last results are kept. They are frozen: callers get the list to read.
const recent = new Map();
const RECENT_MAX = 300;

/** Points of a shape. 'point' (a single particle) is the trivial shape. */
export function shapePoints(shapeId, count, params = {}) {
  if (shapeId === 'point') return [[0, 0, 0]];
  const shape = SHAPE_BY_ID[shapeId];
  if (!shape) return [[0, 0, 0]];
  const n = Math.max(shape.min, Math.min(MAX_COUNT, Math.round(Number(count) || shape.count)));
  const full = { ...defaultParams(shapeId) };
  let key = `${shapeId}|${n}`;
  for (const p of shape.params || []) {
    const v = Number(params[p.key]);
    if (Number.isFinite(v)) full[p.key] = Math.min(p.max, Math.max(p.min, v));
    key += `|${full[p.key]}`;
  }
  let points = recent.get(key);
  if (!points) {
    points = shape.gen(n, full);
    for (const p of points) Object.freeze(p);
    Object.freeze(points);
    recent.set(key, points);
    if (recent.size > RECENT_MAX) recent.delete(recent.keys().next().value);
  }
  return points;
}
