// Shape library: every shape is a list of points ("dozens of small particles").
// Pure functions, no dependencies — also used by the Node tests.
//
// Local coordinates: shapes fit in about [-1, 1] on each axis (2 blocks across at
// scale 1). Flat shapes lie in the XY plane (standing up, facing the camera).

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lerp = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** n points evenly spaced (by length) along a polyline. */
export function resample(poly, n, closed = false) {
  if (n <= 0 || !poly.length) return [];
  const pts = closed ? [...poly, poly[0]] : poly;
  if (n === 1 || pts.length === 1) return [pts[0].slice()];
  const seg = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = dist(pts[i], pts[i + 1]);
    seg.push(l);
    total += l;
  }
  const step = total / (closed ? n : n - 1);
  const out = [];
  let si = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const d = Math.min(k * step, total);
    while (si < seg.length - 1 && acc + seg[si] < d - 1e-9) acc += seg[si++];
    const t = seg[si] > 0 ? (d - acc) / seg[si] : 0;
    out.push(lerp(pts[si], pts[si + 1], Math.min(1, Math.max(0, t))));
  }
  return out;
}

/** Share `total` items between weights (largest remainder), exact sum. */
function apportion(weights, total) {
  const sum = weights.reduce((s, w) => s + w, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  const left = total - out.reduce((s, x) => s + x, 0);
  raw
    .map((r, i) => [r - Math.floor(r), i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .slice(0, left)
    .forEach(([, i]) => out[i]++);
  return out;
}

/** Wireframe: every corner once, the rest spread evenly along the edges. */
function wire(verts, edges, n) {
  if (n <= verts.length) return verts.slice(0, Math.max(1, n)).map((v) => v.slice());
  const lens = edges.map(([a, b]) => dist(verts[a], verts[b]));
  const k = apportion(lens, n - verts.length);
  const out = verts.map((v) => v.slice());
  edges.forEach(([a, b], i) => {
    for (let j = 1; j <= k[i]; j++) out.push(lerp(verts[a], verts[b], j / (k[i] + 1)));
  });
  return out;
}

const loopEdges = (count) => Array.from({ length: count }, (_, i) => [i, (i + 1) % count]);

function polygon(sides, n, radius = 1, inner = null) {
  const verts = [];
  const count = inner ? sides * 2 : sides;
  for (let i = 0; i < count; i++) {
    const r = inner && i % 2 ? radius * inner : radius;
    const a = (TAU * i) / count;
    verts.push([Math.sin(a) * r, Math.cos(a) * r, 0]);
  }
  return wire(verts, loopEdges(count), n);
}

function curve(fn, n, closed = false, samples = 600) {
  const poly = [];
  const last = closed ? samples : samples + 1;
  for (let i = 0; i < last; i++) poly.push(fn(i / samples));
  return resample(poly, n, closed);
}

function ring(n, radius, y, phase = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (TAU * i) / n;
    out.push([Math.cos(a) * radius, y, Math.sin(a) * radius]);
  }
  return out;
}

const P = (key, label, min, max, step, def) => ({ key, label, min, max, step, default: def });

/**
 * id, name, group ('flat' | 'solid'), count (default), min (fewest useful
 * particles), params (extra sliders), gen(n, params) -> [[x, y, z], ...]
 */
export const SHAPES = [
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
    id: 'grid', name: 'Filled square', group: 'flat', count: 49, min: 4,
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
    id: 'lattice', name: 'Filled cube', group: 'solid', count: 64, min: 8,
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
    id: 'torus', name: 'Donut', group: 'solid', count: 96, min: 9,
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

export const SHAPE_BY_ID = Object.fromEntries(SHAPES.map((s) => [s.id, s]));

/** Default values of a shape's extra sliders. */
export function defaultParams(shapeId) {
  const shape = SHAPE_BY_ID[shapeId];
  const out = {};
  for (const p of (shape && shape.params) || []) out[p.key] = p.default;
  return out;
}

/** Points of a shape. 'point' (a single particle) is the trivial shape. */
export function shapePoints(shapeId, count, params = {}) {
  if (shapeId === 'point') return [[0, 0, 0]];
  const shape = SHAPE_BY_ID[shapeId];
  if (!shape) return [[0, 0, 0]];
  const n = Math.max(shape.min, Math.min(MAX_COUNT, Math.round(Number(count) || shape.count)));
  const full = { ...defaultParams(shapeId) };
  for (const p of shape.params || []) {
    const v = Number(params[p.key]);
    if (Number.isFinite(v)) full[p.key] = Math.min(p.max, Math.max(p.min, v));
  }
  return shape.gen(n, full);
}

export const MAX_COUNT = 600;
