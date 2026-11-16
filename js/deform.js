// Deformers: the tools of the Shape Studio that bend, twist, inflate and pull
// the points of a shape. Pure maths (no DOM), shared by the preview, the code
// generator and the tests.
//
// A shape has a list of them (`deform`), worked through in order on its points
// before the object is placed, turned and sized. Coordinates are the shape's
// own: about -1 to 1, Y up, a flat shape lies in the XY plane.
//
// Every deformer is a small record: { kind, on, ...settings }. What a kind does
// and which settings it has is written down once, in DEFORMERS below; the page
// builds its sliders from that list and the tests go through it too.
//
// Some deformers have handles: points in the 3D view that can be dragged (the
// tip of a drag point, the middle of a bulge, the corners of a cage).

/** A shape has at most this many deformers. */
export const MAX_DEFORMERS = 12;
/** A shape never has more points than this, whatever its deformers make of it. */
export const MAX_POINTS = 600;
/** No point is pushed further from the middle than this. */
const LIMIT = 50;

const RAD = Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const finite = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback);

export const AXES = [{ id: 0, name: 'X: left and right' }, { id: 1, name: 'Y: up and down' }, { id: 2, name: 'Z: front and back' }];

/** 1 in the middle, 0 from the edge on, smooth in between. */
const soft = (t) => (t >= 1 ? 0 : (1 - t * t) ** 2);

/** The box some points fit in, its middle, its sizes, and how far the points reach from the middle. */
export function measure(points) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let k = 0; k < 3; k++) {
      if (p[k] < lo[k]) lo[k] = p[k];
      if (p[k] > hi[k]) hi[k] = p[k];
    }
  }
  if (!points.length) return { lo: [0, 0, 0], hi: [0, 0, 0], centre: [0, 0, 0], size: [0, 0, 0], radius: 0 };
  const centre = lo.map((v, k) => (v + hi[k]) / 2);
  let radius = 0;
  for (const p of points) radius = Math.max(radius, Math.hypot(p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]));
  return { lo, hi, centre, size: hi.map((v, k) => v - lo[k]), radius };
}

/** How far along an axis a point is, from 0 (one end of the box) to 1 (the other); 0.5 where the shape has no size. */
const along = (p, axis, info) => (info.size[axis] > 1e-9 ? (p[axis] - info.lo[axis]) / info.size[axis] : 0.5);

/** The two axes that are not `axis`, in the order that keeps turns the right way round. */
const others = (axis) => [(axis + 1) % 3, (axis + 2) % 3];

/** A point turned about an axis through `centre` by an angle in radians. */
function turned(p, axis, centre, angle) {
  const [u, v] = others(axis);
  const c = Math.cos(angle), s = Math.sin(angle);
  const a = p[u] - centre[u], b = p[v] - centre[v];
  const out = p.slice();
  out[u] = centre[u] + a * c - b * s;
  out[v] = centre[v] + a * s + b * c;
  return out;
}

// a steady random number from 0 to 1 for a whole number (and a seed)
function rand(i, seed) {
  let h = Math.imul(i + 1, 374761393) ^ Math.imul(seed + 7, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const corner = (x, y, z, seed) => rand(Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791), seed);
/** Smooth random values from 0 to 1 over space: near places get near values. */
function noise(x, y, z, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
  const f = (t) => t * t * (3 - 2 * t);
  const tx = f(x - x0), ty = f(y - y0), tz = f(z - z0);
  let sum = 0;
  for (let n = 0; n < 8; n++) {
    const dx = n & 1, dy = (n >> 1) & 1, dz = (n >> 2) & 1;
    sum += corner(x0 + dx, y0 + dy, z0 + dz, seed) * (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty) * (dz ? tz : 1 - tz);
  }
  return sum;
}

/** Euler angles in degrees (order XYZ, as everywhere in the studio) as a 3x3 matrix, row by row. */
function matrixOf([rx, ry, rz]) {
  const a = Math.cos(rx * RAD), b = Math.sin(rx * RAD);
  const c = Math.cos(ry * RAD), d = Math.sin(ry * RAD);
  const e = Math.cos(rz * RAD), f = Math.sin(rz * RAD);
  return [c * e, -c * f, d, a * f + b * e * d, a * e - b * f * d, -b * c, b * f - a * e * d, b * e + a * f * d, a * c];
}

/** The box a cage stands around: the box of the points, half a block wide at least where they are flat. */
function cageBox(info) {
  const lo = info.lo.slice();
  const hi = info.hi.slice();
  for (let k = 0; k < 3; k++) {
    if (hi[k] - lo[k] < 0.2) {
      lo[k] = info.centre[k] - 0.5;
      hi[k] = info.centre[k] + 0.5;
    }
  }
  return { lo, hi };
}
const cageCorner = (box, n) => [n & 1 ? box.hi[0] : box.lo[0], n & 2 ? box.hi[1] : box.lo[1], n & 4 ? box.hi[2] : box.lo[2]];

// fields of a deformer, for the sliders of the page
// (`slide`: the part of its range the slider covers; the number box next to it takes all of it)
const num = (key, label, min, max, step, value, unit = '', slide = null) => ({ key, label, kind: 'number', min, max, step, value, unit, slide: slide || [min, max] });
const axis = (key, label, value) => ({ key, label, kind: 'choice', options: AXES, value });
const pick = (key, label, options, value) => ({ key, label, kind: 'choice', options, value });
const vec = (key, label, value, step = 0.1, min = -LIMIT, max = LIMIT) => ({ key, label, kind: 'vec', value, step, min, max });

/**
 * Every kind of deformer.
 *   id, name, about : what it is called and one line on what it does
 *   group           : the heading it stands under in the list of tools
 *   fields          : its settings (see num, axis, pick and vec above)
 *   apply(points, s, info) -> points : the deformed points (never the same list). `info`: measure(points)
 *   start(info)     : settings that depend on the shape when the deformer is added (optional)
 *   handles(s, info) -> [{ id, at, minor }] : points that can be dragged in the 3D view (optional)
 *   drag(s, id, at, info) : a handle was dragged to `at` (optional)
 */
export const DEFORMERS = [
  {
    id: 'pull', name: 'Drag point', group: 'Drag points',
    about: 'A point of the shape that you drag: the shape around it comes along, the further away the less.',
    fields: [
      vec('to', 'Dragged to', [0, 1.5, 0]),
      vec('at', 'Grabs at', [0, 1, 0]),
      num('radius', 'Reach', 0.05, 10, 0.05, 0.8, 'blocks', [0.05, 3]),
    ],
    start: (info) => {
      const top = [info.centre[0], info.hi[1], info.centre[2]];
      return { at: top, to: top.slice(), radius: Number(clamp(info.radius * 0.8, 0.3, 10).toFixed(2)) };
    },
    apply: (points, s) => {
      const d = [s.to[0] - s.at[0], s.to[1] - s.at[1], s.to[2] - s.at[2]];
      return points.map((p) => {
        const w = soft(Math.hypot(p[0] - s.at[0], p[1] - s.at[1], p[2] - s.at[2]) / s.radius);
        return [p[0] + d[0] * w, p[1] + d[1] * w, p[2] + d[2] * w];
      });
    },
    handles: (s) => [{ id: 'to', at: s.to.slice() }, { id: 'at', at: s.at.slice(), minor: true }],
    drag: (s, id, at) => {
      if (id === 'to') s.to = at.slice();
      else {
        // the place it grabs at moves, and what it has pulled so far stays as it is
        s.to = s.to.map((v, k) => v + at[k] - s.at[k]);
        s.at = at.slice();
      }
    },
  },
  {
    id: 'cage', name: 'Cage', group: 'Drag points',
    about: 'A box around the shape with eight corners to drag: the whole shape leans, widens and bends with them.',
    fields: [],
    start: () => ({ c: Array.from({ length: 8 }, () => [0, 0, 0]) }),
    apply: (points, s, info) => {
      const box = cageBox(info);
      return points.map((p) => {
        const t = [0, 1, 2].map((k) => (p[k] - box.lo[k]) / (box.hi[k] - box.lo[k]));
        const out = p.slice();
        for (let n = 0; n < 8; n++) {
          const w = (n & 1 ? t[0] : 1 - t[0]) * (n & 2 ? t[1] : 1 - t[1]) * (n & 4 ? t[2] : 1 - t[2]);
          for (let k = 0; k < 3; k++) out[k] += s.c[n][k] * w;
        }
        return out;
      });
    },
    handles: (s, info) => {
      const box = cageBox(info);
      return s.c.map((offset, n) => ({ id: `c${n}`, at: cageCorner(box, n).map((v, k) => v + offset[k]) }));
    },
    drag: (s, id, at, info) => {
      const n = Number(id.slice(1));
      if (!(n >= 0 && n < 8)) return;
      const from = cageCorner(cageBox(info), n);
      s.c[n] = at.map((v, k) => clamp(v - from[k], -LIMIT, LIMIT));
    },
  },
  {
    id: 'bulge', name: 'Bulge or pinch', group: 'Drag points',
    about: 'Pushes the shape away from a point you place (or, with a negative amount, pulls it in).',
    fields: [
      vec('at', 'Middle', [0, 0, 0]),
      num('radius', 'Reach', 0.05, 10, 0.05, 1, 'blocks', [0.05, 3]),
      num('amount', 'Amount', -1, 3, 0.05, 0.6),
    ],
    start: (info) => ({ at: info.centre.slice(), radius: Number(clamp(info.radius * 1.5, 0.3, 10).toFixed(2)) }),
    apply: (points, s) => points.map((p) => {
      const d = [p[0] - s.at[0], p[1] - s.at[1], p[2] - s.at[2]];
      const f = 1 + s.amount * soft(Math.hypot(...d) / s.radius);
      return [s.at[0] + d[0] * f, s.at[1] + d[1] * f, s.at[2] + d[2] * f];
    }),
    handles: (s) => [{ id: 'at', at: s.at.slice() }],
    drag: (s, id, at) => { s.at = at.slice(); },
  },
  {
    id: 'inflate', name: 'Inflate', group: 'Whole shape',
    about: 'Blows the shape up like a balloon: every point moves away from the middle by the same distance. Negative lets the air out.',
    fields: [num('amount', 'Amount', -3, 5, 0.05, 0.4, 'blocks', [-1, 2])],
    apply: (points, s, info) => points.map((p) => {
      const d = [p[0] - info.centre[0], p[1] - info.centre[1], p[2] - info.centre[2]];
      const len = Math.hypot(...d);
      if (len < 1e-9) return p.slice();
      const f = Math.max(0, len + s.amount) / len;
      return [info.centre[0] + d[0] * f, info.centre[1] + d[1] * f, info.centre[2] + d[2] * f];
    }),
  },
  {
    id: 'round', name: 'Make round', group: 'Whole shape',
    about: 'Moves every point towards a ball around the middle: at 1 the shape is a ball (a flat shape: a circle).',
    fields: [num('amount', 'Amount', 0, 1, 0.02, 0.6)],
    apply: (points, s, info) => points.map((p) => {
      const d = [p[0] - info.centre[0], p[1] - info.centre[1], p[2] - info.centre[2]];
      const len = Math.hypot(...d);
      if (len < 1e-9) return p.slice();
      const f = 1 + (info.radius / len - 1) * s.amount;
      return [info.centre[0] + d[0] * f, info.centre[1] + d[1] * f, info.centre[2] + d[2] * f];
    }),
  },
  {
    id: 'twist', name: 'Twist', group: 'Whole shape',
    about: 'Wrings the shape like a towel: one end turns one way, the other end the other way.',
    fields: [axis('axis', 'Around', 1), num('angle', 'Angle', -1080, 1080, 5, 120, 'degrees', [-360, 360])],
    apply: (points, s, info) => points.map((p) => turned(p, s.axis, info.centre, (along(p, s.axis, info) - 0.5) * s.angle * RAD)),
  },
  {
    id: 'bend', name: 'Bend', group: 'Whole shape',
    about: 'Bends the shape into an arc. 360 degrees rolls it into a full ring.',
    fields: [
      axis('axis', 'Its length', 0),
      pick('toward', 'Bends', [
        { id: 0, name: 'Up (a standing shape: sideways)' }, { id: 1, name: 'To the back' },
      ], 0),
      num('angle', 'Angle', -360, 360, 5, 90, 'degrees'),
    ],
    apply: (points, s, info) => {
      const a = s.axis;
      // the direction it bends in: up (Y), or front (Z); for a shape whose length is Y: sideways (X) or front (Z)
      const b = a === 1 ? (s.toward ? 2 : 0) : (s.toward ? (a === 2 ? 0 : 2) : 1);
      const length = info.size[a];
      const angle = s.angle * RAD;
      if (Math.abs(angle) < 1e-6 || length < 1e-9) return points.map((p) => p.slice());
      const rho = length / angle; // the radius of the arc
      return points.map((p) => {
        const x = p[a] - info.centre[a];
        const y = p[b] - info.centre[b];
        const t = x / rho;
        const out = p.slice();
        out[a] = info.centre[a] + Math.sin(t) * (rho - y);
        out[b] = info.centre[b] + rho - Math.cos(t) * (rho - y);
        return out;
      });
    },
  },
  {
    id: 'taper', name: 'Taper', group: 'Whole shape',
    about: 'Makes one end wide and the other end narrow, like a cone.',
    fields: [axis('axis', 'Along', 1), num('amount', 'Amount', -1, 1, 0.02, 0.6)],
    apply: (points, s, info) => {
      const [u, v] = others(s.axis);
      return points.map((p) => {
        const f = Math.max(0, 1 - s.amount * (along(p, s.axis, info) * 2 - 1));
        const out = p.slice();
        out[u] = info.centre[u] + (p[u] - info.centre[u]) * f;
        out[v] = info.centre[v] + (p[v] - info.centre[v]) * f;
        return out;
      });
    },
  },
  {
    id: 'lean', name: 'Lean', group: 'Whole shape',
    about: 'Pushes the top one way and the bottom the other way, like italic letters.',
    fields: [
      pick('way', 'Leans', [
        { id: 0, name: 'The top to the right' }, { id: 1, name: 'The top to the back' },
        { id: 2, name: 'The right side up' }, { id: 3, name: 'The right side to the back' },
      ], 0),
      num('amount', 'Amount', -3, 3, 0.05, 0.5, '', [-1.5, 1.5]),
    ],
    apply: (points, s, info) => {
      const [move, by] = [[0, 1], [2, 1], [1, 0], [2, 0]][s.way] || [0, 1];
      return points.map((p) => {
        const out = p.slice();
        out[move] += s.amount * (p[by] - info.centre[by]);
        return out;
      });
    },
  },
  {
    id: 'squash', name: 'Squash and stretch', group: 'Whole shape',
    about: 'Stretches the shape one way and makes it thinner the other ways (or squashes it and makes it fatter), like rubber.',
    fields: [axis('axis', 'Along', 1), num('amount', 'Length', 0.1, 5, 0.05, 1.6, 'times', [0.2, 3])],
    apply: (points, s, info) => {
      const [u, v] = others(s.axis);
      const thin = 1 / Math.sqrt(s.amount);
      return points.map((p) => {
        const out = p.slice();
        out[s.axis] = info.centre[s.axis] + (p[s.axis] - info.centre[s.axis]) * s.amount;
        out[u] = info.centre[u] + (p[u] - info.centre[u]) * thin;
        out[v] = info.centre[v] + (p[v] - info.centre[v]) * thin;
        return out;
      });
    },
  },
  {
    id: 'flatten', name: 'Flatten', group: 'Whole shape',
    about: 'Presses the shape flat, like a flower in a book.',
    fields: [axis('axis', 'Pressed along', 2), num('amount', 'Amount', 0, 1, 0.02, 1)],
    apply: (points, s, info) => points.map((p) => {
      const out = p.slice();
      out[s.axis] = info.centre[s.axis] + (p[s.axis] - info.centre[s.axis]) * (1 - s.amount);
      return out;
    }),
  },
  {
    id: 'swirl', name: 'Swirl', group: 'Whole shape',
    about: 'Turns the middle of the shape more than its edge, like water going down a drain.',
    fields: [axis('axis', 'Around', 2), num('angle', 'Angle', -1080, 1080, 5, 180, 'degrees', [-720, 720])],
    apply: (points, s, info) => {
      const [u, v] = others(s.axis);
      let reach = 0;
      for (const p of points) reach = Math.max(reach, Math.hypot(p[u] - info.centre[u], p[v] - info.centre[v]));
      if (reach < 1e-9) return points.map((p) => p.slice());
      return points.map((p) => {
        const r = Math.hypot(p[u] - info.centre[u], p[v] - info.centre[v]) / reach;
        return turned(p, s.axis, info.centre, s.angle * RAD * (1 - r) ** 2);
      });
    },
  },
  {
    id: 'wave', name: 'Wave', group: 'Waves and roughness',
    about: 'Lays the shape over waves that run along it.',
    fields: [
      axis('axis', 'Run along', 0),
      pick('push', 'Go', [{ id: 0, name: 'Up and down' }, { id: 1, name: 'To the front and back' }], 0),
      num('height', 'Height', 0, 5, 0.02, 0.25, 'blocks', [0, 1]),
      num('waves', 'How many', 0.25, 12, 0.25, 2),
      num('shift', 'Shift', 0, 360, 5, 0, 'degrees'),
    ],
    apply: (points, s, info) => {
      const b = s.axis === 1 ? (s.push ? 2 : 0) : (s.push ? (s.axis === 2 ? 0 : 2) : 1);
      return points.map((p) => {
        const out = p.slice();
        out[b] += s.height * Math.sin(along(p, s.axis, info) * s.waves * 2 * Math.PI + s.shift * RAD);
        return out;
      });
    },
  },
  {
    id: 'ripple', name: 'Ripple', group: 'Waves and roughness',
    about: 'Rings of waves that spread from the middle, like a stone thrown into a pond.',
    fields: [
      axis('axis', 'Waves go along', 2),
      num('height', 'Height', 0, 5, 0.02, 0.2, 'blocks', [0, 1]),
      num('waves', 'How many', 0.25, 12, 0.25, 2),
      num('shift', 'Shift', 0, 360, 5, 0, 'degrees'),
    ],
    apply: (points, s, info) => {
      const [u, v] = others(s.axis);
      let reach = 0;
      for (const p of points) reach = Math.max(reach, Math.hypot(p[u] - info.centre[u], p[v] - info.centre[v]));
      if (reach < 1e-9) return points.map((p) => p.slice());
      return points.map((p) => {
        const r = Math.hypot(p[u] - info.centre[u], p[v] - info.centre[v]) / reach;
        const out = p.slice();
        out[s.axis] += s.height * Math.sin(r * s.waves * 2 * Math.PI + s.shift * RAD);
        return out;
      });
    },
  },
  {
    id: 'noise', name: 'Wobble', group: 'Waves and roughness',
    about: 'Bumps and dents, as if the shape were drawn with a shaky hand. Neighbours wobble together.',
    fields: [
      num('amount', 'Amount', 0, 3, 0.01, 0.2, 'blocks', [0, 1]),
      num('size', 'Size of the bumps', 0.1, 5, 0.05, 0.8, 'blocks', [0.1, 2]),
      num('seed', 'Another try', 0, 99, 1, 0),
    ],
    apply: (points, s) => points.map((p) => p.map((v, k) => v + s.amount * 2 * (
      noise(p[0] / s.size + 31.7 * k, p[1] / s.size + 17.3 * k, p[2] / s.size + 5.1 * k, s.seed) - 0.5))),
  },
  {
    id: 'jitter', name: 'Scatter', group: 'Waves and roughness',
    about: 'Moves every point a little, each in its own direction: the shape gets fuzzy.',
    fields: [num('amount', 'Amount', 0, 3, 0.01, 0.1, 'blocks', [0, 1]), num('seed', 'Another try', 0, 99, 1, 0)],
    apply: (points, s) => points.map((p, i) => p.map((v, k) => v + s.amount * (rand(i * 3 + k, s.seed) * 2 - 1))),
  },
  {
    id: 'snap', name: 'Snap to a grid', group: 'Waves and roughness',
    about: 'Moves every point onto a grid, for a blocky, pixel look. Points that land on the same spot become one.',
    fields: [num('step', 'Grid', 0.05, 2, 0.05, 0.25, 'blocks')],
    apply: (points, s) => {
      const seen = new Set();
      const out = [];
      for (const p of points) {
        const q = p.map((v) => Math.round(v / s.step) * s.step + 0);
        const key = q.map((v) => Math.round(v / s.step)).join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(q);
      }
      return out;
    },
  },
  {
    id: 'mirror', name: 'Mirror', group: 'More of it',
    about: 'Adds the mirror image of the shape to it: draw half a butterfly and get the whole one.',
    fields: [axis('axis', 'Mirrored', 0), num('offset', 'Mirror at', -LIMIT, LIMIT, 0.05, 0, 'blocks', [-2, 2])],
    apply: (points, s) => {
      const out = points.map((p) => p.slice());
      for (const p of points) {
        if (Math.abs(p[s.axis] - s.offset) < 1e-6) continue; // on the mirror: it is its own image
        const q = p.slice();
        q[s.axis] = 2 * s.offset - p[s.axis];
        out.push(q);
      }
      return out;
    },
  },
  {
    id: 'repeat', name: 'Repeat', group: 'More of it',
    about: 'Copies of the shape inside the shape itself: in a row, or in a ring around its pivot.',
    fields: [
      pick('layout', 'In a', [{ id: 0, name: 'Row' }, { id: 1, name: 'Ring' }], 0),
      num('count', 'How many', 2, 24, 1, 3, 'in all'),
      vec('step', 'Step (row)', [0, 0, 0.5]),
      axis('axis', 'Around (ring)', 1),
      num('arc', 'Arc (ring)', 1, 360, 5, 360, 'degrees'),
    ],
    apply: (points, s) => {
      const count = Math.round(s.count);
      const out = [];
      for (let n = 0; n < count; n++) {
        if (s.layout === 1) {
          const angle = ((s.arc >= 359.999 ? 360 : s.arc) * RAD * n) / (s.arc >= 359.999 ? count : Math.max(1, count - 1));
          for (const p of points) out.push(turned(p, s.axis, [0, 0, 0], angle));
        } else for (const p of points) out.push([p[0] + s.step[0] * n, p[1] + s.step[1] * n, p[2] + s.step[2] * n]);
      }
      return out;
    },
  },
  {
    id: 'thin', name: 'Thin out', group: 'More of it',
    about: 'Keeps only some of the points, evenly: fewer particles for the same shape.',
    fields: [num('keep', 'Keep', 5, 100, 1, 50, 'percent')],
    apply: (points, s) => {
      const want = Math.max(1, Math.round((points.length * s.keep) / 100));
      if (want >= points.length) return points.map((p) => p.slice());
      return Array.from({ length: want }, (_, i) => points[Math.floor(((i + 0.5) * points.length) / want)].slice());
    },
  },
  {
    id: 'fill', name: 'Fill in', group: 'More of it',
    about: 'Puts a new point between every two neighbours: twice the particles along the same lines.',
    fields: [num('times', 'Times', 1, 3, 1, 1)],
    apply: (points, s) => {
      let list = points.map((p) => p.slice());
      for (let round = 0; round < Math.round(s.times) && list.length > 1; round++) {
        // neighbours are points that follow each other and are no further apart than most
        const gaps = [];
        for (let i = 1; i < list.length; i++) gaps.push(Math.hypot(list[i][0] - list[i - 1][0], list[i][1] - list[i - 1][1], list[i][2] - list[i - 1][2]));
        const usual = gaps.slice().sort((x, y) => x - y)[Math.floor(gaps.length / 2)];
        const out = [list[0]];
        for (let i = 1; i < list.length; i++) {
          if (gaps[i - 1] <= usual * 2.5 + 1e-9 && gaps[i - 1] > 1e-9) out.push(list[i].map((v, k) => (v + list[i - 1][k]) / 2));
          out.push(list[i]);
        }
        list = out;
      }
      return list;
    },
  },
  {
    id: 'shift', name: 'Move, turn, resize inside', group: 'More of it',
    about: 'Moves, turns and resizes the points before the next deformer: a Mirror or a Repeat after it then works from another place.',
    fields: [vec('move', 'Move', [0, 0, 0]), vec('turn', 'Turn', [0, 0, 0], 15, -3600, 3600), vec('size', 'Size', [1, 1, 1], 0.1, -20, 20)],
    apply: (points, s) => {
      const m = matrixOf(s.turn);
      return points.map((p) => {
        const x = p[0] * s.size[0], y = p[1] * s.size[1], z = p[2] * s.size[2];
        return [
          m[0] * x + m[1] * y + m[2] * z + s.move[0],
          m[3] * x + m[4] * y + m[5] * z + s.move[1],
          m[6] * x + m[7] * y + m[8] * z + s.move[2],
        ];
      });
    },
  },
];

export const DEFORMER_BY_ID = Object.fromEntries(DEFORMERS.map((d) => [d.id, d]));

/** A new deformer of a kind, with the settings it starts with for a shape of these points. */
export function newDeformer(kind, points = []) {
  const def = DEFORMER_BY_ID[kind];
  if (!def) return null;
  const made = { kind, on: true };
  for (const f of def.fields) made[f.key] = Array.isArray(f.value) ? f.value.slice() : f.value;
  if (def.start) Object.assign(made, def.start(measure(points)));
  // (numbers that come from the shape are cut to three decimals: they are shown, and saved)
  const cut = (v) => (Array.isArray(v) ? v.map(cut) : typeof v === 'number' ? Number(v.toFixed(3)) + 0 : v);
  for (const key of Object.keys(made)) made[key] = cut(made[key]);
  return sanitizeDeformer(made);
}

/** One deformer with every setting present and inside its limits, or null if its kind is unknown. */
function sanitizeDeformer(raw) {
  const def = raw && typeof raw === 'object' ? DEFORMER_BY_ID[raw.kind] : null;
  if (!def) return null;
  const out = { kind: def.id, on: raw.on !== false };
  for (const f of def.fields) {
    const v = raw[f.key];
    if (f.kind === 'number') out[f.key] = clamp(finite(v, f.value), f.min, f.max);
    else if (f.kind === 'choice') out[f.key] = f.options.some((o) => o.id === Number(v)) ? Number(v) : f.value;
    else out[f.key] = f.value.map((fallback, k) => clamp(finite(Array.isArray(v) ? v[k] : undefined, fallback), f.min, f.max));
  }
  if (def.id === 'cage') {
    out.c = Array.from({ length: 8 }, (_, n) => [0, 1, 2].map((k) => clamp(finite(Array.isArray(raw.c) && Array.isArray(raw.c[n]) ? raw.c[n][k] : 0, 0), -LIMIT, LIMIT)));
  }
  return out;
}

/** The deformers of a shape as loaded from a file, repaired: a list (maybe empty). */
export function sanitizeDeform(raw) {
  return (Array.isArray(raw) ? raw : []).map(sanitizeDeformer).filter(Boolean).slice(0, MAX_DEFORMERS);
}

/** No more than MAX_POINTS points: of too many, every so-manieth is kept. */
function capped(points) {
  if (points.length <= MAX_POINTS) return points;
  return Array.from({ length: MAX_POINTS }, (_, i) => points[Math.floor(((i + 0.5) * points.length) / MAX_POINTS)]);
}

const tidy = (points) => capped(points).map((p) => p.map((v) => (Number.isFinite(v) ? clamp(v, -LIMIT, LIMIT) + 0 : 0)));

/**
 * Points after a list of deformers. `until`: stop before the deformer with
 * that number (what a deformer is given to work on, for its handles).
 */
export function applyDeformers(points, list, until = Infinity) {
  let out = points;
  (list || []).forEach((s, n) => {
    const def = DEFORMER_BY_ID[s.kind];
    if (!def || s.on === false || n >= until || !out.length) return;
    out = tidy(def.apply(out, s, measure(out)));
  });
  return out === points ? points.map((p) => p.slice()) : out;
}

/** The handles of deformer number n of a list, where they are among the points of the shape: [{ id, at, minor }]. */
export function handlesOf(points, list, n) {
  const s = list[n];
  const def = s ? DEFORMER_BY_ID[s.kind] : null;
  if (!def || !def.handles) return [];
  return def.handles(s, measure(applyDeformers(points, list, n)));
}

/** A handle of deformer number n was dragged to `at`. Changes the deformer; false when it has no such handle. */
export function dragHandle(points, list, n, id, at) {
  const s = list[n];
  const def = s ? DEFORMER_BY_ID[s.kind] : null;
  if (!def || !def.drag || !at.every(Number.isFinite)) return false;
  def.drag(s, id, at.map((v) => clamp(v, -LIMIT, LIMIT)), measure(applyDeformers(points, list, n)));
  return true;
}
