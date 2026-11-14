// More basic shapes and the patterns: outlines, shapes inside shapes, filled
// shapes, lines, tilings, borders and fractals. All of them are flat. The tools
// they use are in shape-kit.js.

import {
  TAU, RAD, P, apportion, curve, flatRing, memo, makeNet, wireNet, netPoints, spreadPoints, pathPoints,
  fillPoints, drawnShape, arcPoly, parsePath, fitDrawing, fitBox, dice,
} from './shape-kit.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const flat = (pts) => pts.map(([x, y]) => [x, y, 0]);
const fix = (v) => Number(v.toFixed(4));
const last = (list) => list[list.length - 1];

/** Arc as points in the XY plane; angles in degrees, 0 = right, anticlockwise. */
const arc3 = (cx, cy, r, a0, a1) => arcPoly(cx, cy, r, r, a0, a1).map(([x, y]) => [x, y, 0]);

/** The Heart's outline; t runs from 0 to 1 around it. */
const heartAt = (t) => {
  const a = t * TAU;
  return [Math.sin(a) ** 3, (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a) + 2.5) / 16];
};

/** The closed outlines of a drawing, fitted to the box: what fillPoints wants. */
const outlinesOf = (d) => fitDrawing(parsePath(d)).polys;

// ---------------------------------------------------------------- more outlines

const REULEAUX = (() => {
  const r = 2 / Math.sqrt(3);
  const v = [0, 1, 2].map((k) => [r * Math.sin((k * TAU) / 3), r * Math.cos((k * TAU) / 3) - (r - 1), 0]);
  const chains = [0, 1, 2].map((k) => {
    const c = v[k];
    const a = v[(k + 1) % 3];
    const b = v[(k + 2) % 3];
    const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
    let a1 = Math.atan2(b[1] - c[1], b[0] - c[0]);
    while (a1 - a0 > Math.PI) a1 -= TAU;
    while (a1 - a0 < -Math.PI) a1 += TAU;
    const arc = Array.from({ length: 21 }, (_, i) => {
      const t = a0 + ((a1 - a0) * i) / 20;
      return [c[0] + 2 * Math.cos(t), c[1] + 2 * Math.sin(t), 0];
    });
    arc[0] = a;
    arc[20] = b;
    return arc;
  });
  return makeNet(v, chains);
})();

const KEYHOLE = (() => {
  const arc = arc3(0, 0.4, 0.6, -50, 230);
  const a = arc[0];
  const b = last(arc);
  const right = [0.5, -1, 0];
  const left = [-0.5, -1, 0];
  return makeNet([a, b, right, left], [arc, [a, right], [right, left], [left, b]]);
})();

const wheelNet = memo((k) => {
  const hub = [0, 0, 0];
  const nodes = [hub];
  const chains = [];
  for (let i = 0; i < k; i++) {
    const arc = arc3(0, 0, 1, 90 - (360 * i) / k, 90 - (360 * (i + 1)) / k);
    nodes.push(arc[0]);
    chains.push([hub, arc[0]], arc);
  }
  return makeNet(nodes, chains);
});

const OUTLINES = [
  {
    id: 'trapezoid', name: 'Trapezoid', count: 44, min: 4,
    params: [P('top', 'Top width', 0.1, 0.9, 0.05, 0.5)],
    gen: (n, p) => pathPoints(flat([[-p.top, 0.6], [p.top, 0.6], [1, -0.6], [-1, -0.6]]), n, true),
  },
  {
    id: 'parallelogram', name: 'Parallelogram', count: 44, min: 4,
    params: [P('slant', 'Slant', 0.1, 0.9, 0.05, 0.4)],
    gen: (n, p) => pathPoints(flat([[-1 + p.slant, 0.6], [1, 0.6], [1 - p.slant, -0.6], [-1, -0.6]]), n, true),
  },
  {
    id: 'egg', name: 'Egg', count: 40, min: 6, tags: 'oval easter',
    gen: (n) => curve((t) => [0.74 * Math.sin(t * TAU) * (1 - 0.2 * Math.cos(t * TAU)), Math.cos(t * TAU), 0], n, true, 360),
  },
  {
    id: 'lens', name: 'Lens', count: 40, min: 4, tags: 'eye almond leaf vesica',
    params: [P('width', 'Width', 0.2, 0.9, 0.05, 0.5)],
    gen: (n, p) => {
      const w = p.width;
      const c = (w * w - 1) / (2 * w);
      const reach = Math.asin(1 / (w - c)) / RAD;
      const right = arc3(c, 0, w - c, reach, -reach);
      right[0] = [0, 1, 0];
      right[right.length - 1] = [0, -1, 0];
      return netPoints(makeNet([right[0], last(right)], [right, right.map(([x, y]) => [-x, y, 0])]), n);
    },
  },
  {
    id: 'squircle', name: 'Squircle', count: 44, min: 8, tags: 'rounded square superellipse',
    params: [P('power', 'Squareness', 2.5, 10, 0.5, 4)],
    gen: (n, p) => curve((t) => {
      const c = Math.cos(t * TAU);
      const s = Math.sin(t * TAU);
      return [Math.sign(s) * Math.abs(s) ** (2 / p.power), Math.sign(c) * Math.abs(c) ** (2 / p.power), 0];
    }, n, true, 720),
  },
  { id: 'reuleaux', name: 'Rounded triangle', count: 42, min: 6, tags: 'reuleaux guitar pick', gen: (n) => netPoints(REULEAUX, n) },
  {
    id: 'lshape', name: 'L shape', count: 48, min: 6, tags: 'corner block',
    params: [P('arm', 'Thickness', 0.3, 1.2, 0.05, 0.8)],
    gen: (n, p) => {
      const a = p.arm;
      return pathPoints(flat([[-1, 1], [-1 + a, 1], [-1 + a, -1 + a], [1, -1 + a], [1, -1], [-1, -1]]), n, true);
    },
  },
  {
    id: 'tshape', name: 'T shape', count: 48, min: 8, tags: 'block',
    params: [P('arm', 'Thickness', 0.3, 1, 0.05, 0.7)],
    gen: (n, p) => {
      const a = p.arm;
      return pathPoints(flat([[-1, 1], [1, 1], [1, 1 - a], [a / 2, 1 - a], [a / 2, -1], [-a / 2, -1], [-a / 2, 1 - a], [-1, 1 - a]]), n, true);
    },
  },
  {
    id: 'ushape', name: 'U shape', count: 56, min: 8, tags: 'block magnet',
    params: [P('arm', 'Thickness', 0.3, 0.8, 0.05, 0.6)],
    gen: (n, p) => {
      const a = p.arm;
      return pathPoints(flat([[-1, 1], [-1 + a, 1], [-1 + a, -1 + a], [1 - a, -1 + a], [1 - a, 1], [1, 1], [1, -1], [-1, -1]]), n, true);
    },
  },
  {
    id: 'arrowhead', name: 'Arrowhead', count: 40, min: 4, tags: 'dart pointer kite',
    params: [P('notch', 'Notch', 0.1, 1.2, 0.05, 0.6)],
    gen: (n, p) => pathPoints(flat([[0, 1], [0.85, -1], [0, -1 + p.notch], [-0.85, -1]]), n, true),
  },
  {
    id: 'arcband', name: 'Arc band', count: 60, min: 8, tags: 'rainbow arch thick curve',
    params: [P('angle', 'Angle', 30, 330, 5, 180), P('inner', 'Inner size', 0.2, 0.9, 0.05, 0.6)],
    gen: (n, p) => {
      const half = p.angle / 2;
      const low = Math.min(p.inner * Math.cos(half * RAD), Math.cos(half * RAD));
      const dy = -(1 + low) / 2; // keeps the band in the middle of its box
      const outer = arc3(0, dy, 1, 90 + half, 90 - half);
      const inner = arc3(0, dy, p.inner, 90 + half, 90 - half);
      return netPoints(makeNet(
        [outer[0], last(outer), inner[0], last(inner)],
        [outer, inner, [outer[0], inner[0]], [last(outer), last(inner)]]), n);
    },
  },
  {
    id: 'corners', name: 'Corner marks', count: 44, min: 12, tags: 'frame viewfinder camera focus',
    params: [P('size', 'Length', 0.2, 0.9, 0.05, 0.5)],
    gen: (n, p) => {
      const verts = [];
      const edges = [];
      for (const sx of [-1, 1]) {
        for (const sy of [1, -1]) {
          const b = verts.length;
          verts.push([sx, sy, 0], [sx * (1 - p.size), sy, 0], [sx, sy * (1 - p.size), 0]);
          edges.push([b, b + 1], [b, b + 2]);
        }
      }
      return netPoints(wireNet(verts, edges), n);
    },
  },
  {
    id: 'dashed-circle', name: 'Dashed circle', count: 48, min: 12, tags: 'broken ring',
    params: [P('dashes', 'Dashes', 3, 16, 1, 6), P('gap', 'Gap', 0.1, 0.7, 0.05, 0.4)],
    gen: (n, p) => {
      const k = Math.round(p.dashes);
      const span = (360 / k) * (1 - p.gap);
      const nodes = [];
      const chains = [];
      for (let i = 0; i < k; i++) {
        const mid = 90 - (360 * i) / k;
        const arc = arc3(0, 0, 1, mid + span / 2, mid - span / 2);
        nodes.push(arc[0], last(arc));
        chains.push(arc);
      }
      return netPoints(makeNet(nodes, chains), n);
    },
  },
  { id: 'keyhole', name: 'Keyhole', count: 44, min: 8, tags: 'lock', gen: (n) => netPoints(KEYHOLE, n) },
  {
    id: 'banner', name: 'Banner', count: 48, min: 6, tags: 'ribbon label',
    gen: (n) => pathPoints(flat([[-1, 0.45], [1, 0.45], [0.72, 0], [1, -0.45], [-1, -0.45], [-0.72, 0]]), n, true),
  },
  {
    id: 'splat', name: 'Splat', count: 60, min: 10, tags: 'blob paint splash ink',
    gen: (n) => curve((t) => {
      const a = t * TAU;
      const r = 0.62 + 0.2 * Math.sin(5 * a + 0.6) + 0.12 * Math.sin(8 * a + 2) + 0.06 * Math.sin(13 * a);
      return [r * Math.sin(a), r * Math.cos(a), 0];
    }, n, true, 720),
  },
  {
    id: 'jagged', name: 'Jagged burst', count: 60, min: 12, tags: 'pow bang boom explosion comic',
    params: [P('points', 'Points', 6, 16, 1, 10)],
    gen: (n, p) => {
      const k = Math.round(p.points);
      return pathPoints(Array.from({ length: 2 * k }, (_, i) => {
        const r = i % 2 ? 0.5 : (i / 2) % 2 ? 0.74 : 1;
        return [r * Math.sin((Math.PI * i) / k), r * Math.cos((Math.PI * i) / k), 0];
      }), n, true);
    },
  },
  {
    id: 'compass-star', name: 'Compass star', count: 64, min: 16, tags: 'north rose wind eight points',
    gen: (n) => pathPoints(Array.from({ length: 16 }, (_, i) => {
      const r = i % 2 ? 0.24 : i % 4 ? 0.58 : 1;
      return [r * Math.sin((Math.PI * i) / 8), r * Math.cos((Math.PI * i) / 8), 0];
    }), n, true),
  },
  drawnShape({
    id: 'star-polygon', name: 'Star polygon', cat: 'basic', box: false, tags: 'heptagram octagram lines',
    params: [P('points', 'Points', 5, 12, 1, 7), P('skip', 'Skip', 2, 5, 1, 3)],
    draw: (p) => {
      const k = Math.round(p.points);
      const step = Math.round(p.skip) % k || 1;
      const g = gcd(k, step);
      const at = (i) => [Math.sin((TAU * i) / k), Math.cos((TAU * i) / k)];
      const polys = [];
      for (let s = 0; s < g; s++) {
        const poly = Array.from({ length: k / g }, (_, j) => at((s + j * step) % k));
        if (poly.length > 2) poly.push(poly[0]);
        polys.push(poly);
      }
      return { polys, dots: [] };
    },
  }),
  {
    id: 'wheel', name: 'Wheel', count: 72, min: 9, tags: 'spokes pie chart',
    params: [P('spokes', 'Spokes', 3, 16, 1, 8)],
    gen: (n, p) => spreadPoints(wheelNet(Math.round(p.spokes)), n),
  },
];

// ---------------------------------------------------------------- shapes in shapes

const inside = (id, name, draw, extra = {}) => drawnShape({ id, name, cat: 'basic', sub: 'Shapes in shapes', draw, ...extra });

const NESTED = [
  inside('crossed-square', 'Crossed square', 'M-5,-5 L5,-5 L5,5 L-5,5 Z M-5,-5 L5,5 M-5,5 L5,-5', { tags: 'box x crate' }),
  inside('circle-in-square', 'Circle in a square', 'M-5,-5 L5,-5 L5,5 L-5,5 Z O0,0 3.9'),
  inside('square-in-circle', 'Square in a circle', 'O0,0 5 M3.5355,3.5355 L3.5355,-3.5355 L-3.5355,-3.5355 L-3.5355,3.5355 Z'),
  inside('triangle-in-circle', 'Triangle in a circle', 'O0,0 5 M0,5 L4.3301,-2.5 L-4.3301,-2.5 Z'),
  inside('star-in-circle', 'Star in a circle', (p) => {
    const k = Math.round(p.points);
    let d = 'O0,0 5';
    for (let i = 0; i < 2 * k; i++) {
      const r = i % 2 ? 2.25 : 5;
      d += ` ${i ? 'L' : 'M'}${fix(r * Math.sin((Math.PI * i) / k))},${fix(r * Math.cos((Math.PI * i) / k))}`;
    }
    return `${d} Z`;
  }, { params: [P('points', 'Points', 5, 10, 1, 5)], box: [0, 0, 5] }),
  inside('two-circles', 'Two circles', (p) => {
    const r = 5 / (2 - p.overlap);
    const d = fix(r * (1 - p.overlap));
    return `O${-d},0 ${fix(r)} O${d},0 ${fix(r)}`;
  }, { params: [P('overlap', 'Overlap', 0.1, 0.9, 0.05, 0.4)], tags: 'venn', box: [0, 0, 5] }),
  inside('three-circles', 'Three circles', 'O0,2.3 3.3 O-2,-1.15 3.3 O2,-1.15 3.3', { tags: 'venn trefoil' }),
  inside('five-rings', 'Five rings', 'O-6.6,1.5 3 O0,1.5 3 O6.6,1.5 3 O-3.3,-1.5 3 O3.3,-1.5 3', { tags: 'games sport circles' }),
  {
    id: 'nested-polygons', name: 'Nested polygons', sub: 'Shapes in shapes', count: 84, min: 18, tags: 'hexagons squares rings',
    params: [P('sides', 'Sides', 3, 8, 1, 6), P('rings', 'Rings', 2, 5, 1, 3)],
    gen: (n, p) => {
      const k = Math.round(p.sides);
      const rings = Math.round(p.rings);
      const verts = [];
      const edges = [];
      for (let j = 0; j < rings; j++) {
        const b = verts.length;
        for (let i = 0; i < k; i++) {
          verts.push([((j + 1) / rings) * Math.sin((TAU * i) / k), ((j + 1) / rings) * Math.cos((TAU * i) / k), 0]);
          edges.push([b + i, b + ((i + 1) % k)]);
        }
      }
      return netPoints(wireNet(verts, edges), n);
    },
  },
  {
    id: 'nested-hearts', name: 'Nested hearts', sub: 'Shapes in shapes', count: 80, min: 12, tags: 'love',
    gen: (n) => apportion([1, 0.66, 0.33], n).flatMap((count, j) => curve((t) => {
      const [x, y] = heartAt(t);
      return [x * (1 - j / 3), y * (1 - j / 3), 0];
    }, count, true, 240)),
  },
];

// ---------------------------------------------------------------- more filled shapes

const MOON = (() => {
  const outer = arcPoly(0, 0, 1, 1, 50, 310);
  const inner = arcPoly(0.5338, 0, 0.7738, 0.7738, 278.1, 81.9);
  return [[...outer, ...inner].map(([x, y]) => [x + 0.18, y])];
})();

const FILLED = [
  {
    id: 'fill-rectangle', name: 'Filled rectangle', count: 60, min: 6,
    params: [P('height', 'Height', 0.1, 1, 0.05, 0.6)],
    gen: (n, p) => fillPoints([[[-1, p.height], [1, p.height], [1, -p.height], [-1, -p.height]]], n),
  },
  {
    id: 'fill-diamond', name: 'Filled diamond', count: 60, min: 6,
    params: [P('width', 'Width', 0.2, 1, 0.05, 0.6)],
    gen: (n, p) => fillPoints([[[0, 1], [p.width, 0], [0, -1], [-p.width, 0]]], n),
  },
  {
    id: 'fill-oval', name: 'Filled oval', count: 60, min: 6,
    params: [P('height', 'Height', 0.2, 0.95, 0.05, 0.6)],
    gen: (n, p) => fillPoints([Array.from({ length: 72 }, (_, i) => [Math.sin((TAU * i) / 72), p.height * Math.cos((TAU * i) / 72)])], n),
  },
  {
    id: 'fill-semicircle', name: 'Filled half circle', count: 60, min: 6,
    gen: (n) => fillPoints([Array.from({ length: 61 }, (_, i) => [-Math.cos((Math.PI * i) / 60), Math.sin((Math.PI * i) / 60) - 0.5])], n),
  },
  {
    id: 'fill-sector', name: 'Filled pie slice', count: 60, min: 6, tags: 'pizza wedge',
    params: [P('angle', 'Angle', 20, 340, 5, 90)],
    gen: (n, p) => {
      const half = (p.angle * RAD) / 2;
      const steps = Math.max(4, Math.ceil(p.angle / 6));
      const drop = (1 + Math.min(0, Math.cos(half))) / 2;
      const outline = [[0, -drop]];
      for (let i = 0; i <= steps; i++) {
        const a = -half + (2 * half * i) / steps;
        outline.push([Math.sin(a), Math.cos(a) - drop]);
      }
      return fillPoints([outline], n);
    },
  },
  {
    id: 'fill-plus', name: 'Filled plus', count: 65, min: 9, tags: 'cross heal',
    params: [P('arm', 'Thickness', 0.15, 0.8, 0.05, 0.35)],
    gen: (n, p) => {
      const a = p.arm;
      return fillPoints([[[-a, 1], [a, 1], [a, a], [1, a], [1, -a], [a, -a], [a, -1], [-a, -1], [-a, -a], [-1, -a], [-1, a], [-a, a]]], n);
    },
  },
  { id: 'fill-moon', name: 'Filled moon', count: 60, min: 8, tags: 'crescent night', gen: (n) => fillPoints(MOON, n) },
  {
    id: 'fill-drop', name: 'Filled drop', count: 60, min: 8, tags: 'water rain tear blood',
    gen: (n) => fillPoints(outlinesOf('M0,10 C0.6,7.5 3.6,5.5 3.6,3.2 A0,3.2 3.6 0 -180 C-3.6,5.5 -0.6,7.5 0,10'), n),
  },
  {
    id: 'fill-arrow', name: 'Filled arrow', count: 60, min: 8,
    gen: (n) => fillPoints([[[0, 1], [0.9, 0.1], [0.4, 0.1], [0.4, -1], [-0.4, -1], [-0.4, 0.1], [-0.9, 0.1]]], n),
  },
  {
    id: 'fill-cloud', name: 'Filled cloud', count: 70, min: 8,
    gen: (n) => fillPoints(outlinesOf('M-3.4,0 L3.4,0 B3.8,3.1 0.9 B0.8,5 0.8 B-2.9,3.6 0.85 B-3.4,0 0.9 Z'), n),
  },
  {
    id: 'fill-lightning', name: 'Filled lightning', count: 60, min: 8, tags: 'bolt thunder electric zap',
    gen: (n) => fillPoints(outlinesOf('M-0.5,10 L3,10 L0.8,6 L3.5,6 L-2,0 L-0.5,4.4 L-3,4.4 Z'), n),
  },
  {
    id: 'dot-triangle', name: 'Dot triangle', count: 45, min: 6, tidy: true, tags: 'filled triangle pins',
    gen: (n) => {
      const k = Math.max(3, Math.round((Math.sqrt(8 * n + 1) - 1) / 2));
      const step = 2 / (k - 1);
      const high = (step * Math.sqrt(3)) / 2;
      const out = [];
      for (let r = 0; r < k; r++) {
        for (let i = 0; i <= r; i++) out.push([(i - r / 2) * step, (((k - 1) / 2) - r) * high, 0]);
      }
      return out;
    },
  },
  {
    id: 'dot-hexagon', name: 'Dot hexagon', count: 61, min: 7, tidy: true, tags: 'filled hexagon honeycomb',
    gen: (n) => {
      const k = Math.max(1, Math.round((Math.sqrt(12 * n - 3) - 3) / 6));
      const out = [];
      for (let r = -k; r <= k; r++) {
        for (let q = -k; q <= k; q++) {
          if (Math.abs(q + r) <= k) out.push([(q + r / 2) / k, (-r * Math.sqrt(3)) / 2 / k, 0]);
        }
      }
      return out;
    },
  },
  {
    id: 'flat-scatter', name: 'Flat scatter', count: 60, min: 8, tags: 'random dots sprinkle confetti',
    gen: (n) => Array.from({ length: n }, (_, i) => [2 * ((0.5 + (i + 1) * 0.7548776662466927) % 1) - 1, 2 * ((0.5 + (i + 1) * 0.5698402909980532) % 1) - 1, 0]),
  },
];

// ---------------------------------------------------------------- lines

const LINES = [
  {
    id: 'dashed-line', name: 'Dashed line', count: 32, min: 8, tags: 'broken dotted',
    params: [P('dashes', 'Dashes', 2, 10, 1, 4), P('gap', 'Gap', 0.1, 0.7, 0.05, 0.4)],
    gen: (n, p) => {
      const k = Math.round(p.dashes);
      const period = 2 / (k - p.gap);
      const verts = [];
      const edges = [];
      for (let i = 0; i < k; i++) {
        verts.push([-1 + i * period, 0, 0], [-1 + (i + 1 - p.gap) * period, 0, 0]);
        edges.push([2 * i, 2 * i + 1]);
      }
      return netPoints(wireNet(verts, edges), n);
    },
  },
  {
    id: 'angle', name: 'Angle', count: 32, min: 3, tags: 'corner two lines',
    params: [P('angle', 'Angle', 10, 170, 5, 60)],
    gen: (n, p) => netPoints(wireNet(fitBox([[0, 0], [1, 0], [Math.cos(p.angle * RAD), Math.sin(p.angle * RAD)]]), [[0, 1], [0, 2]]), n),
  },
  {
    id: 'steps', name: 'Steps', count: 48, min: 9, tags: 'stairs staircase',
    params: [P('steps', 'Steps', 2, 10, 1, 4)],
    gen: (n, p) => {
      const k = Math.round(p.steps);
      const verts = [[-1, -1, 0]];
      for (let i = 0; i < k; i++) verts.push([-1 + (2 * i) / k, -1 + (2 * (i + 1)) / k, 0], [-1 + (2 * (i + 1)) / k, -1 + (2 * (i + 1)) / k, 0]);
      return pathPoints(verts, n);
    },
  },
  {
    id: 'sawtooth', name: 'Sawtooth', count: 56, min: 9, tags: 'saw teeth wave',
    params: [P('teeth', 'Teeth', 1, 10, 1, 4), P('height', 'Height', 0.1, 1, 0.05, 0.5)],
    gen: (n, p) => {
      const k = Math.round(p.teeth);
      const verts = [[-1, -p.height, 0]];
      for (let i = 1; i <= k; i++) verts.push([-1 + (2 * i) / k, p.height, 0], [-1 + (2 * i) / k, -p.height, 0]);
      return pathPoints(verts, n);
    },
  },
];

// ---------------------------------------------------------------- patterns: tilings

const pattern = (sub, id, name, draw, extra = {}) => drawnShape({ id, name, cat: 'patterns', sub, draw, ...extra });
const picture = (polys) => ({ polys, dots: [] });

/** A straight line through the -1..1 square: `offset` from the middle, turned by `angle` degrees. */
export function across(offset, angle) {
  const dx = Math.cos(angle * RAD);
  const dy = Math.sin(angle * RAD);
  const ox = -dy * offset;
  const oy = dx * offset;
  let t0 = -Infinity;
  let t1 = Infinity;
  for (const [o, d] of [[ox, dx], [oy, dy]]) {
    if (Math.abs(d) < 1e-9) {
      if (Math.abs(o) > 1) return null;
    } else {
      const a = (-1 - o) / d;
      const b = (1 - o) / d;
      t0 = Math.max(t0, Math.min(a, b));
      t1 = Math.min(t1, Math.max(a, b));
    }
  }
  return t1 - t0 > 0.05 ? [[ox + dx * t0, oy + dy * t0, 0], [ox + dx * t1, oy + dy * t1, 0]] : null;
}

const TILINGS = [
  pattern('Tilings', 'honeycomb', 'Honeycomb', (p) => {
    const k = Math.round(p.cells);
    const polys = [];
    for (let r = 0; r < k; r++) {
      for (let c = 0; c < k - (r % 2); c++) {
        const cx = Math.sqrt(3) * (c + (r % 2) / 2);
        const cy = 1.5 * r;
        const hex = Array.from({ length: 6 }, (_, i) => [cx + Math.sin((TAU * i) / 6), cy + Math.cos((TAU * i) / 6)]);
        hex.push(hex[0]);
        polys.push(hex);
      }
    }
    return picture(polys);
  }, { params: [P('cells', 'Cells across', 2, 5, 1, 3)], tags: 'hexagons bees tiles' }),
  pattern('Tilings', 'bricks', 'Brick wall', (p) => {
    const rows = Math.round(p.rows);
    const polys = [[[0, 0], [0, rows]], [[6, 0], [6, rows]]];
    for (let j = 0; j <= rows; j++) polys.push([[0, j], [6, j]]);
    for (let j = 0; j < rows; j++) for (let x = j % 2 ? 1 : 2; x < 6; x += 2) polys.push([[x, j], [x, j + 1]]);
    return picture(polys);
  }, { params: [P('rows', 'Rows', 2, 6, 1, 4)], tags: 'bricks tiles stones' }),
  pattern('Tilings', 'triangle-grid', 'Triangle grid', (p) => {
    const k = Math.round(p.rows);
    const h = Math.sqrt(3) / 2;
    const polys = [];
    for (let i = 0; i < k; i++) {
      polys.push([[i / 2, i * h], [k - i / 2, i * h]], [[i, 0], [(k + i) / 2, (k - i) * h]], [[k - i, 0], [(k - i) / 2, (k - i) * h]]);
    }
    return picture(polys);
  }, { params: [P('rows', 'Rows', 2, 6, 1, 3)], tags: 'triangles tiles triforce' }),
  pattern('Tilings', 'diamond-grid', 'Diamond grid', (p) => {
    const k = Math.round(p.lines);
    const polys = [[[0, 0], [k, 0], [k, k], [0, k], [0, 0]]];
    for (let d = 1; d < 2 * k; d++) {
      polys.push(d <= k ? [[0, d], [d, 0]] : [[d - k, k], [k, d - k]]);
      polys.push(d <= k ? [[0, k - d], [d, k]] : [[d - k, 0], [k, 2 * k - d]]);
    }
    return picture(polys);
  }, { params: [P('lines', 'Lines', 2, 6, 1, 3)], tags: 'lattice trellis crosshatch fence' }),
  pattern('Tilings', 'fish-scales', 'Fish scales', (p) => {
    const rows = Math.round(p.rows);
    const polys = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < 4 - (j % 2); i++) polys.push(arcPoly(2 * i + 1 + (j % 2), -j, 1, 1, 180, 360));
    }
    return picture(polys);
  }, { params: [P('rows', 'Rows', 2, 6, 1, 4)], tags: 'scallops roof tiles dragon mermaid' }),
  pattern('Tilings', 'wave-lines', 'Wave lines', (p) => {
    const k = Math.round(p.lines);
    const wide = Math.max(2, (k - 1) * 1.1);
    return picture(Array.from({ length: k }, (_, j) => Array.from({ length: 97 }, (__, i) => [
      (wide * i) / 96, j + 0.3 * Math.sin((p.waves * TAU * i) / 96),
    ])));
  }, { params: [P('lines', 'Lines', 2, 7, 1, 4), P('waves', 'Waves', 1, 4, 0.5, 2)], tags: 'water sea ripples' }),
  {
    id: 'checkerboard', name: 'Checkerboard', sub: 'Tilings', count: 72, min: 32, tidy: true, tags: 'chess squares checks',
    params: [P('squares', 'Squares', 2, 6, 1, 4)],
    gen: (n, p) => {
      const k = Math.round(p.squares);
      const cells = Math.ceil((k * k) / 2);
      const m = Math.max(2, Math.floor(Math.sqrt(n / cells)));
      const out = [];
      for (let y = 0; y < k; y++) {
        for (let x = 0; x < k; x++) {
          if ((x + y) % 2) continue;
          for (let j = 0; j < m; j++) {
            for (let i = 0; i < m; i++) out.push([-1 + (2 * (x + (i + 0.5) / m)) / k, 1 - (2 * (y + (j + 0.5) / m)) / k, 0]);
          }
        }
      }
      return out;
    },
  },
  {
    id: 'stripes', name: 'Stripes', sub: 'Tilings', count: 70, min: 10, tags: 'lines bars hatch',
    params: [P('lines', 'Lines', 2, 9, 1, 5), P('tilt', 'Tilt', -45, 45, 5, 0)],
    gen: (n, p) => {
      const k = Math.round(p.lines);
      const reach = Math.abs(Math.cos(p.tilt * RAD)) + Math.abs(Math.sin(p.tilt * RAD));
      const verts = [];
      const edges = [];
      for (let i = 0; i < k; i++) {
        const line = across(((2 * i + 1) / k - 1) * reach, p.tilt);
        if (!line) continue;
        edges.push([verts.length, verts.length + 1]);
        verts.push(...line);
      }
      return netPoints(wireNet(verts, edges), n);
    },
  },
  {
    id: 'chevron-pattern', name: 'Chevron pattern', sub: 'Tilings', count: 96, min: 28, tags: 'zigzags herringbone',
    params: [P('rows', 'Rows', 2, 6, 1, 4), P('teeth', 'Zigzags', 1, 6, 1, 3)],
    gen: (n, p) => {
      const rows = Math.round(p.rows);
      const k = Math.round(p.teeth);
      const gap = 2 / (rows - 0.1);
      const verts = [];
      const edges = [];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i <= 2 * k; i++) {
          if (i) edges.push([verts.length - 1, verts.length]);
          verts.push([-1 + i / k, -1 + j * gap + (i % 2 ? 0.9 * gap : 0), 0]);
        }
      }
      return netPoints(wireNet(verts, edges), n);
    },
  },
  {
    id: 'plus-pattern', name: 'Plus pattern', sub: 'Tilings', count: 81, min: 45, tags: 'crosses grid',
    params: [P('across', 'Across', 2, 5, 1, 3)],
    gen: (n, p) => {
      const k = Math.round(p.across);
      const arm = 0.64 / k;
      const verts = [];
      const edges = [];
      for (let y = 0; y < k; y++) {
        for (let x = 0; x < k; x++) {
          const b = verts.length;
          const cx = -1 + (2 * x + 1) / k;
          const cy = 1 - (2 * y + 1) / k;
          verts.push([cx, cy, 0], [cx + arm, cy, 0], [cx - arm, cy, 0], [cx, cy + arm, 0], [cx, cy - arm, 0]);
          edges.push([b, b + 1], [b, b + 2], [b, b + 3], [b, b + 4]);
        }
      }
      return netPoints(wireNet(verts, edges), n);
    },
  },
  {
    id: 'circle-pattern', name: 'Circle pattern', sub: 'Tilings', count: 90, min: 27, tags: 'rings bubbles dots grid',
    params: [P('across', 'Across', 2, 5, 1, 3)],
    gen: (n, p) => {
      const k = Math.round(p.across);
      return apportion(Array(k * k).fill(1), n).flatMap((count, c) => flatRing(count, 0.72 / k).map(([x, y]) => [
        x - 1 + (2 * (c % k) + 1) / k, y + 1 - (2 * Math.floor(c / k) + 1) / k, 0,
      ]));
    },
  },
  {
    id: 'weave', name: 'Basket weave', sub: 'Tilings', count: 108, min: 54, tags: 'woven mat parquet',
    params: [P('cells', 'Squares', 2, 5, 1, 3)],
    gen: (n, p) => {
      const k = Math.round(p.cells);
      const verts = [];
      const edges = [];
      for (let y = 0; y < k; y++) {
        for (let x = 0; x < k; x++) {
          for (let i = 0; i < 3; i++) {
            const u = (0.2 + 0.3 * i) * (2 / k);
            const from = 0.12 * (2 / k);
            const to = 0.88 * (2 / k);
            const x0 = -1 + (2 * x) / k;
            const y0 = -1 + (2 * y) / k;
            edges.push([verts.length, verts.length + 1]);
            if ((x + y) % 2) verts.push([x0 + u, y0 + from, 0], [x0 + u, y0 + to, 0]);
            else verts.push([x0 + from, y0 + u, 0], [x0 + to, y0 + u, 0]);
          }
        }
      }
      return netPoints(wireNet(verts, edges), n);
    },
  },
  pattern('Tilings', 'truchet', 'Truchet arcs', (p) => {
    const k = Math.round(p.cells);
    const next = dice(p.seed);
    const polys = [];
    for (let y = 0; y < k; y++) {
      for (let x = 0; x < k; x++) {
        if (next() < 0.5) polys.push(arcPoly(x, y + 1, 0.5, 0.5, 270, 360), arcPoly(x + 1, y, 0.5, 0.5, 90, 180));
        else polys.push(arcPoly(x + 1, y + 1, 0.5, 0.5, 180, 270), arcPoly(x, y, 0.5, 0.5, 0, 90));
      }
    }
    return picture(polys);
  }, { params: [P('cells', 'Squares', 2, 6, 1, 4), P('seed', 'Pattern', 1, 30, 1, 3)], tags: 'tiles curls random maze' }),
];

// ---------------------------------------------------------------- patterns: borders

const sag = (x) => 0.35 * (x * x - 1);

const BORDERS = [
  pattern('Borders', 'greek-key', 'Greek key', (p) => {
    const k = Math.round(p.units);
    const polys = [[[0, 0], [5 * k - 1, 0]]];
    for (let i = 0; i < k; i++) {
      const x = 5 * i;
      polys.push([[x, 0], [x, 4], [x + 4, 4], [x + 4, 1.3], [x + 1.4, 1.3], [x + 1.4, 2.7], [x + 2.7, 2.7]]);
    }
    return picture(polys);
  }, { params: [P('units', 'Repeats', 1, 5, 1, 3)], tags: 'meander border greece' }),
  pattern('Borders', 'chain-border', 'Chain border', (p) => picture(Array.from({ length: Math.round(p.links) }, (_, i) => (
    arcPoly(2.2 * i, 0, 1.5, 1, 90, 450)))), { params: [P('links', 'Links', 2, 7, 1, 4)], tags: 'links rings ovals' }),
  pattern('Borders', 'braid', 'Braid', (p) => {
    const k = Math.round(p.strands);
    return picture(Array.from({ length: k }, (_, s) => Array.from({ length: 161 }, (__, i) => [
      (6 * i) / 160, Math.sin((p.twists * TAU * i) / 160 + (TAU * s) / k),
    ])));
  }, { params: [P('strands', 'Strands', 2, 3, 1, 3), P('twists', 'Twists', 1, 4, 0.5, 2)], tags: 'plait rope twist hair' }),
  pattern('Borders', 'scallop-border', 'Scallop border', (p) => {
    const k = Math.round(p.scallops);
    return picture([[[0, 0], [2 * k, 0]], ...Array.from({ length: k }, (_, i) => arcPoly(2 * i + 1, 0, 1, 1, 180, 360))]);
  }, { params: [P('scallops', 'Scallops', 2, 9, 1, 5)], tags: 'lace edge curtain bumps' }),
  pattern('Borders', 'bunting', 'Bunting', (p) => {
    const k = Math.round(p.flags);
    const wide = 2 / k;
    const xs = new Set(Array.from({ length: 41 }, (_, i) => fix(-1 + i / 20)));
    const flags = [];
    for (let i = 0; i < k; i++) {
      const a = fix(-1 + (i + 0.12) * wide);
      const b = fix(-1 + (i + 0.88) * wide);
      xs.add(a).add(b);
      flags.push([[a, sag(a)], [(a + b) / 2, sag((a + b) / 2) - 0.72 * wide], [b, sag(b)]]);
    }
    return picture([[...xs].sort((u, v) => u - v).map((x) => [x, sag(x)]), ...flags]);
  }, { params: [P('flags', 'Flags', 3, 9, 1, 5)], tags: 'party flags garland pennants' }),
  pattern('Borders', 'fence', 'Fence', (p) => {
    const k = Math.round(p.posts);
    const polys = [[[-1.2, 1.6], [2 * k - 0.8, 1.6]], [[-1.2, 4.6], [2 * k - 0.8, 4.6]]];
    for (let i = 0; i < k; i++) polys.push([[2 * i - 0.5, 0], [2 * i - 0.5, 6], [2 * i, 7.2], [2 * i + 0.5, 6], [2 * i + 0.5, 0]]);
    return picture(polys);
  }, { params: [P('posts', 'Posts', 3, 8, 1, 5)], tags: 'pickets garden gate' }),
  pattern('Borders', 'vine', 'Vine', (p) => {
    const k = Math.round(p.leaves);
    const stem = (x) => 0.22 * Math.sin((Math.PI * k * (x + 1)) / 2);
    const xs = new Set(Array.from({ length: 81 }, (_, i) => fix(-1 + i / 40)));
    const leaves = [];
    for (let i = 0; i < k; i++) {
      const x = fix(-1 + (2 * i + 1) / k);
      const up = i % 2 ? -1 : 1;
      xs.add(x);
      const leaf = [];
      for (const side of [1, -1]) {
        for (let s = 0; s <= 10; s++) {
          const u = side > 0 ? s / 10 : 1 - s / 10;
          const out = 0.5 * u;
          const off = side * 0.13 * Math.sin(Math.PI * u);
          leaf.push([x + 0.45 * out + 0.89 * off, stem(x) + up * (0.89 * out - 0.45 * off)]);
        }
      }
      leaves.push(leaf);
    }
    return picture([[...xs].sort((u, v) => u - v).map((x) => [x, stem(x)]), ...leaves]);
  }, { params: [P('leaves', 'Leaves', 2, 8, 1, 4)], tags: 'ivy plant garland leaves branch' }),
];

// ---------------------------------------------------------------- patterns: fractals

function sierpinski(a, b, c, depth, polys) {
  if (!depth) {
    polys.push([a, b, c, a]);
    return;
  }
  const mid = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
  sierpinski(a, mid(a, b), mid(a, c), depth - 1, polys);
  sierpinski(mid(a, b), b, mid(b, c), depth - 1, polys);
  sierpinski(mid(a, c), mid(b, c), c, depth - 1, polys);
}

const kochVerts = memo((depth) => {
  let verts = [90, 210, 330].map((a) => [Math.cos(a * RAD), Math.sin(a * RAD)]);
  for (let d = 0; d < depth; d++) {
    const next = [];
    verts.forEach((a, i) => {
      const b = verts[(i + 1) % verts.length];
      const dx = (b[0] - a[0]) / 3;
      const dy = (b[1] - a[1]) / 3;
      // the corners run anticlockwise, so the bump goes to the right of the way we walk: outwards
      next.push(a, [a[0] + dx, a[1] + dy], [a[0] + 1.5 * dx + (Math.sqrt(3) / 2) * dy, a[1] + 1.5 * dy - (Math.sqrt(3) / 2) * dx], [a[0] + 2 * dx, a[1] + 2 * dy]);
    });
    verts = next;
  }
  return flat(verts);
});

const dragonVerts = memo((folds) => {
  let x = 0;
  let y = 0;
  let dx = 1;
  let dy = 0;
  const mids = [];
  for (let i = 1; i <= 2 ** folds; i++) {
    mids.push([x + dx / 2, y + dy / 2]);
    x += dx;
    y += dy;
    [dx, dy] = (((i & -i) << 1) & i) ? [dy, -dx] : [-dy, dx];
  }
  return fitBox(mids);
});

const hilbertVerts = memo((order) => {
  const size = 2 ** order;
  const verts = [];
  for (let d = 0; d < size * size; d++) {
    let x = 0;
    let y = 0;
    let t = d;
    for (let s = 1; s < size; s *= 2) {
      const rx = 1 & (t >> 1);
      const ry = 1 & (t ^ rx);
      if (!ry) {
        if (rx) {
          x = s - 1 - x;
          y = s - 1 - y;
        }
        [x, y] = [y, x];
      }
      x += s * rx;
      y += s * ry;
      t >>= 2;
    }
    verts.push([-1 + (2 * x) / (size - 1), -1 + (2 * y) / (size - 1), 0]);
  }
  return verts;
});

const treeNet = memo((depth, angle) => {
  const verts = [[0, 0]];
  const edges = [];
  const grow = (from, x, y, turn, len, left) => {
    const nx = x + len * Math.sin(turn * RAD);
    const ny = y + len * Math.cos(turn * RAD);
    verts.push([nx, ny]);
    const me = verts.length - 1;
    edges.push([from, me]);
    if (left > 0) {
      grow(me, nx, ny, turn - angle, len * 0.72, left - 1);
      grow(me, nx, ny, turn + angle, len * 0.72, left - 1);
    }
  };
  grow(0, 0, 0, 0, 1, depth);
  return wireNet(fitBox(verts), edges);
});

const hTreeNet = memo((depth) => {
  const verts = [[0, 0]];
  const edges = [];
  const grow = (centre, dx, dy, len, left) => {
    const [x, y] = verts[centre];
    for (const side of [1, -1]) {
      verts.push([x + side * dx * len, y + side * dy * len]);
      const end = verts.length - 1;
      edges.push([centre, end]);
      if (left > 1) grow(end, -dy, dx, len / Math.SQRT2, left - 1);
    }
  };
  grow(0, 1, 0, 1, depth);
  return wireNet(fitBox(verts), edges);
});

const PACKING = (() => {
  const circle = (cx, cy, r, turn) => {
    const pts = arcPoly(cx, cy, r, r, turn, turn + 360).map(([x, y]) => [x, y, 0]);
    pts[pts.length - 1] = pts[0];
    return pts;
  };
  const big = 1 / (1 + 2 / Math.sqrt(3));
  const small = 0.224;
  const chains = [circle(0, 0, 1, 60)];
  for (const a of [90, 210, 330]) {
    chains.push(circle((1 - big) * Math.cos(a * RAD), (1 - big) * Math.sin(a * RAD), big, a + 180));
    chains.push(circle((1 - small) * Math.cos((a + 60) * RAD), (1 - small) * Math.sin((a + 60) * RAD), small, a + 240));
  }
  return makeNet(chains.map((c) => c[0]), chains);
})();

/** Is the square (x, y) of a 3 x 3 x ... board part of the fractal? `keep` judges one pair of digits. */
function inFractal(x, y, depth, keep) {
  for (let d = 0; d < depth; d++) {
    if (!keep(x % 3, y % 3)) return false;
    x = Math.floor(x / 3);
    y = Math.floor(y / 3);
  }
  return true;
}

function dotFractal(depth, keep) {
  const size = 3 ** depth;
  const out = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inFractal(x, y, depth, keep)) out.push([-1 + (2 * x + 1) / size, 1 - (2 * y + 1) / size, 0]);
    }
  }
  return out;
}

function mazeWalls(size, seed) {
  const next = dice(seed);
  const seen = Array.from({ length: size }, () => Array(size).fill(false));
  const open = new Set(); // walls that were knocked through: "x,y,h" is the floor of (x, y), "x,y,v" its right side
  const stack = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [x, y] = last(stack);
    const ways = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => (
      x + dx >= 0 && y + dy >= 0 && x + dx < size && y + dy < size && !seen[y + dy][x + dx]));
    if (!ways.length) {
      stack.pop();
      continue;
    }
    const [dx, dy] = ways[Math.floor(next() * ways.length)];
    open.add(dx ? `${Math.min(x, x + dx)},${y},v` : `${x},${Math.min(y, y + dy)},h`);
    seen[y + dy][x + dx] = true;
    stack.push([x + dx, y + dy]);
  }
  const polys = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (y === 0 && x > 0) polys.push([[x, 0], [x + 1, 0]]); // the way in is the first square of the bottom row
      if (x === 0) polys.push([[0, y], [0, y + 1]]);
      if (!open.has(`${x},${y},v`)) polys.push([[x + 1, y], [x + 1, y + 1]]);
      if (!open.has(`${x},${y},h`) && !(y === size - 1 && x === size - 1)) polys.push([[x, y + 1], [x + 1, y + 1]]); // the way out is at the top right
    }
  }
  return picture(polys);
}

const FRACTALS = [
  pattern('Fractals', 'sierpinski', 'Sierpinski triangle', (p) => {
    const polys = [];
    sierpinski([-1, -0.866], [1, -0.866], [0, 0.866], Math.round(p.depth), polys);
    return picture(polys);
  }, { params: [P('depth', 'Depth', 1, 4, 1, 3)], tags: 'fractal triforce triangles' }),
  {
    id: 'koch', name: 'Koch snowflake', sub: 'Fractals', count: 96, min: 12, tags: 'fractal snow star',
    params: [P('depth', 'Depth', 1, 4, 1, 2)],
    gen: (n, p) => pathPoints(kochVerts(Math.round(p.depth)), n, true),
  },
  {
    id: 'carpet', name: 'Sierpinski carpet', sub: 'Fractals', count: 64, min: 8, tidy: true, tags: 'fractal squares holes',
    gen: (n) => dotFractal(n >= 512 ? 3 : n >= 64 ? 2 : 1, (a, b) => !(a === 1 && b === 1)),
  },
  {
    id: 'cross-fractal', name: 'Cross fractal', sub: 'Fractals', count: 125, min: 25, tidy: true, tags: 'vicsek plus snowflake',
    gen: (n) => dotFractal(n >= 125 ? 3 : 2, (a, b) => a === 1 || b === 1),
  },
  {
    id: 'dragon-curve', name: 'Dragon curve', sub: 'Fractals', count: 128, min: 12, tags: 'fractal fold paper',
    params: [P('folds', 'Folds', 3, 9, 1, 7)],
    gen: (n, p) => pathPoints(dragonVerts(Math.round(p.folds)), n),
  },
  {
    id: 'hilbert', name: 'Hilbert curve', sub: 'Fractals', count: 127, min: 16, tags: 'fractal maze path',
    params: [P('order', 'Order', 2, 4, 1, 3)],
    gen: (n, p) => pathPoints(hilbertVerts(Math.round(p.order)), n),
  },
  {
    id: 'fractal-tree', name: 'Fractal tree', sub: 'Fractals', count: 110, min: 32, tags: 'branches twigs',
    params: [P('depth', 'Depth', 2, 6, 1, 4), P('angle', 'Angle', 10, 60, 5, 25)],
    gen: (n, p) => netPoints(treeNet(Math.round(p.depth), p.angle), n),
  },
  {
    id: 'h-tree', name: 'H tree', sub: 'Fractals', count: 126, min: 63, tags: 'fractal letters',
    params: [P('depth', 'Depth', 2, 7, 1, 5)],
    gen: (n, p) => netPoints(hTreeNet(Math.round(p.depth)), n),
  },
  {
    id: 'fractal-fern', name: 'Fractal fern', sub: 'Fractals', count: 150, min: 20, tags: 'barnsley leaf plant',
    gen: (n) => {
      const next = dice(7);
      const out = [];
      let x = 0;
      let y = 0;
      for (let i = 0; i < n + 20; i++) {
        const r = next();
        if (r < 0.01) [x, y] = [0, 0.16 * y];
        else if (r < 0.86) [x, y] = [0.85 * x + 0.04 * y, -0.04 * x + 0.85 * y + 1.6];
        else if (r < 0.93) [x, y] = [0.2 * x - 0.26 * y, 0.23 * x + 0.22 * y + 1.6];
        else [x, y] = [-0.15 * x + 0.28 * y, 0.26 * x + 0.24 * y + 0.44];
        if (i >= 20) out.push([x * 0.2 - 0.05, y * 0.2 - 1, 0]);
      }
      return out;
    },
  },
  { id: 'circle-packing', name: 'Circle packing', sub: 'Fractals', count: 130, min: 14, tags: 'apollonian gasket bubbles', gen: (n) => spreadPoints(PACKING, n) },
  pattern('Fractals', 'maze', 'Maze', (p) => mazeWalls(Math.round(p.size), p.seed), {
    params: [P('size', 'Size', 3, 8, 1, 5), P('seed', 'Maze', 1, 30, 1, 1)], tags: 'labyrinth puzzle walls',
  }),
];

const tag = (cat, sub, list) => list.map((s) => {
  if (!s.cat) s.cat = cat;
  if (!s.group) s.group = 'flat';
  if (!s.sub) s.sub = sub;
  return s;
});

export const FLAT_SHAPES = [
  ...tag('basic', 'More outlines', OUTLINES),
  ...tag('basic', 'Shapes in shapes', NESTED),
  ...tag('basic', 'More filled shapes', FILLED),
  ...tag('basic', 'Lines', LINES),
  ...tag('patterns', 'Tilings', TILINGS),
  ...tag('patterns', 'Borders', BORDERS),
  ...tag('patterns', 'Fractals', FRACTALS),
];
