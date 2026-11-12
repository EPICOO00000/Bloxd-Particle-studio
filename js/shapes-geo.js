// Shapes made from formulas: more basic outlines, 3D frames and surfaces,
// curves and ready-made effects. The tools they use are in shape-kit.js.

import {
  TAU, GOLDEN, RAD, P, apportion, resample, curve, ring, flatRing, memo, ease, scatter,
  makeNet, wireNet, netPoints, spreadPoints, pathPoints, fillPoints, lathe, ringStack, drawnShape,
} from './shape-kit.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const equal = (parts, n) => apportion(Array(parts).fill(1), n);
const flat = (pts) => pts.map(([x, y]) => [x, y, 0]);

/**
 * A closed flat curve t -> [x, y] as a drawing. Drawn shapes get a particle
 * wherever the curve crosses itself, with the rest spread evenly in between.
 */
function loopDrawing(fn, samples) {
  const poly = Array.from({ length: samples }, (_, i) => fn(i / samples));
  poly.push(poly[0]);
  return { polys: [poly], dots: [] };
}

/** The Heart's outline; t runs from 0 to 1 around it. */
function heartAt(t) {
  const a = t * TAU;
  return [
    Math.sin(a) ** 3,
    (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a) + 2.5) / 16,
  ];
}

/** Corners of a star, first point up. */
function starOutline(points, inner, radius = 1) {
  return Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? radius * inner : radius;
    return [Math.sin((Math.PI * i) / points) * r, Math.cos((Math.PI * i) / points) * r];
  });
}

// ---------------------------------------------------------------- basic

const HALF_CIRCLE = (() => {
  const arc = Array.from({ length: 61 }, (_, i) => [-Math.cos((Math.PI * i) / 60), Math.sin((Math.PI * i) / 60) - 0.5, 0]);
  return makeNet([arc[0], arc[60]], [arc, [arc[60], arc[0]]]);
})();

const netGrid = memo((cells) => {
  const at = (i) => -1 + (2 * i) / cells;
  const id = (x, y) => y * (cells + 1) + x;
  const verts = [];
  const edges = [];
  for (let y = 0; y <= cells; y++) {
    for (let x = 0; x <= cells; x++) {
      verts.push([at(x), -at(y), 0]);
      if (x < cells) edges.push([id(x, y), id(x + 1, y)]);
      if (y < cells) edges.push([id(x, y), id(x, y + 1)]);
    }
  }
  return wireNet(verts, edges);
});

const HEART_OUTLINE = Array.from({ length: 240 }, (_, i) => heartAt(i / 240));

const BASIC = [
  {
    id: 'rectangle', name: 'Rectangle', count: 44, min: 4,
    params: [P('height', 'Height', 0.1, 1, 0.05, 0.6)],
    gen: (n, p) => pathPoints(flat([[-1, p.height], [1, p.height], [1, -p.height], [-1, -p.height]]), n, true),
  },
  {
    id: 'rounded', name: 'Rounded square', count: 44, min: 8,
    params: [P('radius', 'Corner', 0.1, 1, 0.05, 0.45)],
    gen: (n, p) => {
      const r = p.radius;
      const c = 1 - r;
      const poly = [[0, 1, 0]];
      for (const [cx, cy, from] of [[c, c, 90], [c, -c, 0], [-c, -c, -90], [-c, c, 180]]) {
        for (let i = 0; i <= 15; i++) {
          const a = (from - i * 6) * RAD;
          poly.push([cx + r * Math.cos(a), cy + r * Math.sin(a), 0]);
        }
      }
      return resample(poly, n, true);
    },
  },
  {
    id: 'diamond', name: 'Diamond', count: 36, min: 4,
    params: [P('width', 'Width', 0.2, 1, 0.05, 0.6)],
    gen: (n, p) => pathPoints(flat([[0, 1], [p.width, 0], [0, -1], [-p.width, 0]]), n, true),
  },
  {
    id: 'oval', name: 'Oval', count: 36, min: 4,
    params: [P('height', 'Height', 0.2, 0.95, 0.05, 0.6)],
    gen: (n, p) => curve((t) => [Math.sin(t * TAU), p.height * Math.cos(t * TAU), 0], n, true, 360),
  },
  {
    id: 'semicircle', name: 'Half circle', count: 40, min: 4,
    gen: (n) => netPoints(HALF_CIRCLE, n),
  },
  {
    id: 'sector', name: 'Pie slice', count: 40, min: 3,
    params: [P('angle', 'Angle', 20, 340, 5, 90)],
    gen: (n, p) => {
      const half = (p.angle * RAD) / 2;
      const steps = Math.max(4, Math.ceil(p.angle / 6));
      const drop = (1 + Math.min(0, Math.cos(half))) / 2; // keeps the slice in the middle of its box
      const arc = Array.from({ length: steps + 1 }, (_, i) => {
        const a = -half + (2 * half * i) / steps;
        return [Math.sin(a), Math.cos(a) - drop, 0];
      });
      const tip = [0, -drop, 0];
      return netPoints(makeNet([tip, arc[0], arc[steps]], [[tip, arc[0]], arc, [arc[steps], tip]]), n);
    },
  },
  {
    id: 'rings2', name: 'Double circle', count: 56, min: 6,
    params: [P('inner', 'Inner size', 0.2, 0.9, 0.05, 0.6)],
    gen: (n, p) => {
      const [outer, inner] = apportion([1, p.inner], n);
      return [...flatRing(outer, 1), ...flatRing(inner, p.inner, Math.PI / Math.max(1, inner))];
    },
  },
  {
    id: 'target', name: 'Target', count: 61, min: 4,
    params: [P('rings', 'Rings', 2, 6, 1, 3)],
    gen: (n, p) => {
      const k = Math.round(p.rings);
      const radii = Array.from({ length: k }, (_, j) => (j + 1) / k);
      const per = apportion(radii, n - 1);
      return [[0, 0, 0], ...per.flatMap((count, j) => flatRing(count, radii[j], j % 2 ? Math.PI / Math.max(1, count) : 0))];
    },
  },
  {
    id: 'righttri', name: 'Right triangle', count: 36, min: 3,
    gen: (n) => pathPoints(flat([[-1, 1], [1, -1], [-1, -1]]), n, true),
  },
  {
    id: 'frame', name: 'Double square', count: 56, min: 8,
    params: [P('inner', 'Inner size', 0.2, 0.9, 0.05, 0.6)],
    gen: (n, p) => {
      const square = (s) => flat([[-s, s], [s, s], [s, -s], [-s, -s]]);
      const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4]];
      return netPoints(wireNet([...square(1), ...square(p.inner)], edges), n);
    },
  },
  {
    id: 'zigzag', name: 'Zigzag', count: 40, min: 3,
    params: [P('teeth', 'Zigzags', 1, 12, 1, 3), P('height', 'Height', 0.1, 1, 0.05, 0.5)],
    gen: (n, p) => {
      const k = Math.round(p.teeth);
      return pathPoints(Array.from({ length: 2 * k + 1 }, (_, j) => [-1 + j / k, j % 2 ? p.height : -p.height, 0]), n);
    },
  },
  {
    id: 'squarewave', name: 'Square wave', count: 50, min: 5,
    params: [P('teeth', 'Steps', 1, 8, 1, 3), P('height', 'Height', 0.1, 1, 0.05, 0.5)],
    gen: (n, p) => {
      const k = Math.round(p.teeth);
      const w = 2 / k;
      const h = p.height;
      const verts = [];
      for (let i = 0; i < k; i++) {
        const x = -1 + i * w;
        verts.push([x, -h, 0], [x, h, 0], [x + w / 2, h, 0], [x + w / 2, -h, 0]);
      }
      verts.push([1, -h, 0]);
      return pathPoints(verts, n);
    },
  },
  {
    id: 'squarespiral', name: 'Square spiral', count: 60, min: 5,
    params: [P('turns', 'Turns', 1, 6, 1, 3)],
    gen: (n, p) => {
      const verts = [[0, 0]];
      let x = 0;
      let y = 0;
      for (let i = 0; i < Math.round(p.turns) * 4; i++) {
        const len = Math.floor(i / 2) + 1;
        x += [1, 0, -1, 0][i % 4] * len;
        y += [0, 1, 0, -1][i % 4] * len;
        verts.push([x, y]);
      }
      const xs = verts.map((v) => v[0]);
      const ys = verts.map((v) => v[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const half = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
      return pathPoints(verts.map(([vx, vy]) => [(vx - cx) / half, (vy - cy) / half, 0]), n);
    },
  },
  {
    id: 'stadium', name: 'Pill', count: 44, min: 6,
    params: [P('height', 'Thickness', 0.2, 0.9, 0.05, 0.5)],
    gen: (n, p) => {
      const r = p.height;
      const c = 1 - r;
      const poly = [[0, r, 0]];
      for (let i = 0; i <= 30; i++) poly.push([c + r * Math.cos((90 - i * 6) * RAD), r * Math.sin((90 - i * 6) * RAD), 0]);
      for (let i = 0; i <= 30; i++) poly.push([-c + r * Math.cos((270 - i * 6) * RAD), r * Math.sin((270 - i * 6) * RAD), 0]);
      return resample(poly, n, true);
    },
  },
  {
    id: 'thickplus', name: 'Plus outline', count: 60, min: 12,
    params: [P('arm', 'Thickness', 0.15, 0.8, 0.05, 0.35)],
    gen: (n, p) => {
      const a = p.arm;
      return pathPoints(flat([
        [-a, 1], [a, 1], [a, a], [1, a], [1, -a], [a, -a], [a, -1], [-a, -1], [-a, -a], [-1, -a], [-1, a], [-a, a],
      ]), n, true);
    },
  },
  {
    id: 'net', name: 'Net', count: 64, min: 16,
    params: [P('cells', 'Squares', 2, 8, 1, 3)],
    gen: (n, p) => netPoints(netGrid(Math.round(p.cells)), n),
  },
  {
    id: 'fill-polygon', name: 'Filled polygon', count: 61, min: 6,
    params: [P('sides', 'Sides', 3, 12, 1, 6)],
    gen: (n, p) => {
      const k = Math.round(p.sides);
      return fillPoints([Array.from({ length: k }, (_, i) => [Math.sin((TAU * i) / k), Math.cos((TAU * i) / k)])], n);
    },
  },
  {
    id: 'fill-star', name: 'Filled star', count: 60, min: 10,
    params: [P('points', 'Points', 4, 10, 1, 5), P('inner', 'Inner size', 0.2, 0.8, 0.05, 0.45)],
    gen: (n, p) => fillPoints([starOutline(Math.round(p.points), p.inner)], n),
  },
  {
    id: 'fill-heart', name: 'Filled heart', count: 60, min: 8,
    gen: (n) => fillPoints([HEART_OUTLINE], n),
  },
  {
    id: 'fill-ring', name: 'Filled ring', count: 72, min: 8,
    params: [P('inner', 'Inner size', 0.1, 0.9, 0.05, 0.5)],
    gen: (n, p) => {
      const a = p.inner;
      const gap = Math.sqrt((Math.PI * (1 - a * a)) / n);
      const rings = Math.max(2, Math.round((1 - a) / gap) + 1);
      const radii = Array.from({ length: rings }, (_, j) => a + ((1 - a) * j) / (rings - 1));
      return apportion(radii, n).flatMap((count, j) => flatRing(count, radii[j], j % 2 ? Math.PI / Math.max(1, count) : 0));
    },
  },
];

// ---------------------------------------------------------------- 3D

const PHI = (1 + Math.sqrt(5)) / 2;
const span = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Centre the corners and scale them to touch the -1..1 box. */
function boxFit(verts) {
  const mid = [0, 1, 2].map((k) => (Math.min(...verts.map((v) => v[k])) + Math.max(...verts.map((v) => v[k]))) / 2);
  const moved = verts.map((v) => v.map((c, k) => c - mid[k]));
  const size = Math.max(...moved.flat().map(Math.abs));
  return moved.map((v) => v.map((c) => c / size));
}

/** Edges of a regular solid: every pair of corners at the shortest distance. */
function shortEdges(verts) {
  let best = Infinity;
  for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) best = Math.min(best, span(verts[i], verts[j]));
  const edges = [];
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) if (span(verts[i], verts[j]) < best * 1.01) edges.push([i, j]);
  }
  return edges;
}

const solidNet = (verts) => {
  const fitted = boxFit(verts);
  return wireNet(fitted, shortEdges(fitted));
};

const CUBE_CORNERS = [];
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) CUBE_CORNERS.push([x, y, z]);
const AXES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const TETRA = solidNet([[0, 1, 0], ...[90, 210, 330].map((a) => [
  (Math.cos(a * RAD) * Math.sqrt(8)) / 3, -1 / 3, (Math.sin(a * RAD) * Math.sqrt(8)) / 3,
])]);

const OCTA = solidNet(AXES);

const DODECA = (() => {
  const v = CUBE_CORNERS.map((c) => c.slice());
  for (const a of [-1, 1]) for (const b of [-1, 1]) v.push([0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [a * PHI, 0, b / PHI]);
  return solidNet(v);
})();

const ICOSA_CORNERS = [];
for (const a of [-1, 1]) for (const b of [-1, 1]) ICOSA_CORNERS.push([0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b]);
const ICOSA = solidNet(ICOSA_CORNERS);

// A football is an icosahedron with every corner cut off a third of the way along its edges.
const FOOTBALL = solidNet(shortEdges(ICOSA_CORNERS).flatMap(([i, j]) => {
  const a = ICOSA_CORNERS[i];
  const b = ICOSA_CORNERS[j];
  return [a.map((c, k) => c + (b[k] - c) / 3), a.map((c, k) => c + ((b[k] - c) * 2) / 3)];
}));

const around = (k, radius, y, turn = 0) => Array.from({ length: k }, (_, i) => {
  const a = (TAU * (i + turn)) / k;
  return [radius * Math.sin(a), y, radius * Math.cos(a)];
});

const prismNet = memo((k) => {
  const edges = [];
  for (let i = 0; i < k; i++) edges.push([i, (i + 1) % k], [k + i, k + ((i + 1) % k)], [i, k + i]);
  return wireNet([...around(k, 1, 0.85), ...around(k, 1, -0.85)], edges);
});

const crystalNet = memo((k) => {
  const edges = [];
  for (let i = 0; i < k; i++) edges.push([0, 2 + i], [1, 2 + i], [2 + i, 2 + ((i + 1) % k)]);
  return wireNet([[0, 1, 0], [0, -1, 0], ...around(k, 0.7, 0)], edges);
});

const gemNet = memo((k) => {
  // 0 = the point at the bottom, then the flat top, then the wide edge half a step round
  const edges = [];
  for (let i = 0; i < k; i++) {
    const top = 1 + i;
    const topNext = 1 + ((i + 1) % k);
    const rim = k + 1 + i;
    edges.push([top, topNext], [rim, k + 1 + ((i + 1) % k)], [top, rim], [topNext, rim], [rim, 0]);
  }
  return wireNet([[0, -0.65, 0], ...around(k, 0.52, 0.65), ...around(k, 1, 0.3, 0.5)], edges);
});

// A star that is thick in the middle: every corner of the outline is joined to
// a peak on the front and one on the back.
const star3dNet = memo((points, depth) => {
  const outline = starOutline(points, 0.45);
  const m = outline.length;
  const edges = [];
  for (let i = 0; i < m; i++) edges.push([i, (i + 1) % m], [i, m], [i, m + 1]);
  return wireNet([...outline.map(([x, y]) => [x, y, 0]), [0, 0, depth], [0, 0, -depth]], edges);
});

const TESSERACT = (() => {
  const verts = [...CUBE_CORNERS, ...CUBE_CORNERS.map((c) => c.map((v) => v / 2))];
  const edges = [];
  for (let i = 0; i < 8; i++) {
    for (const bit of [1, 2, 4]) if (!(i & bit)) edges.push([i, i | bit], [8 + i, 8 + (i | bit)]);
    edges.push([i, 8 + i]);
  }
  return wireNet(verts, edges);
})();

const square3 = (s, y) => [[-s, y, -s], [s, y, -s], [s, y, s], [-s, y, s]];

const steppedNet = memo((k) => {
  const verts = [];
  const edges = [];
  for (let t = 0; t < k; t++) {
    const base = verts.length;
    verts.push(...square3(1 - t / k, -1 + (2 * t) / k), ...square3(1 - t / k, -1 + (2 * (t + 1)) / k));
    for (let i = 0; i < 4; i++) edges.push([base + i, base + ((i + 1) % 4)], [base + 4 + i, base + 4 + ((i + 1) % 4)], [base + i, base + 4 + i]);
  }
  return wireNet(verts, edges);
});

const HUT = (() => {
  const edges = [];
  for (let i = 0; i < 4; i++) edges.push([i, (i + 1) % 4], [4 + i, 4 + ((i + 1) % 4)], [i, 4 + i], [4 + i, 8]);
  return wireNet([...square3(0.85, -1), ...square3(0.85, 0.1), [0, 1, 0]], edges);
})();

const starBlock = memo((points, inner) => {
  const outline = starOutline(points, inner);
  const m = outline.length;
  const edges = [];
  for (let i = 0; i < m; i++) edges.push([i, (i + 1) % m], [m + i, m + ((i + 1) % m)], [i, m + i]);
  return wireNet([...outline.map(([x, y]) => [x, y, 0.35]), ...outline.map(([x, y]) => [x, y, -0.35])], edges);
});

const globeNet = memo((lines) => {
  const lats = [45, 0, -45];
  const longs = lines * 2;
  const at = (lat, lon) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD)];
  const arc = (lat0, lon0, lat1, lon1, steps) => Array.from({ length: steps + 1 }, (_, i) => (
    at(lat0 + ((lat1 - lat0) * i) / steps, lon0 + ((lon1 - lon0) * i) / steps)));
  const nodes = [[0, 1, 0], [0, -1, 0]];
  const chains = [];
  const stops = [90, ...lats, -90];
  for (let k = 0; k < longs; k++) {
    const lon = (360 * k) / longs;
    for (const lat of lats) {
      nodes.push(at(lat, lon));
      chains.push(arc(lat, lon, lat, lon + 360 / longs, Math.max(2, Math.ceil(30 / lines))));
    }
    for (let i = 0; i < 4; i++) chains.push(arc(stops[i], lon, stops[i + 1], lon, 6));
  }
  return makeNet(nodes, chains);
});

const VASE = [[0, 0.42], [0.3, 0.9], [0.74, 0.34], [1, 0.62]];

const GOBLET = (() => {
  const side = [[0, 0.55], [0.04, 0.55], [0.11, 0.09], [0.5, 0.09], [0.72, 0.58], [1, 0.72]];
  const profile = [[0, -1]];
  for (let i = 0; i <= 80; i++) profile.push([ease(side, i / 80), -1 + (2 * i) / 80]);
  return profile;
})();

const SAUCER = (() => {
  const profile = [];
  for (let i = 0; i <= 14; i++) profile.push([0.42 * Math.cos((90 - i * 5.5) * RAD), 0.08 + 0.42 * Math.sin((90 - i * 5.5) * RAD)]);
  profile.push([1, -0.04], [0.45, -0.28], [0, -0.3]);
  return profile;
})();

const SOLID = [
  { id: 'tetrahedron', name: 'Tetrahedron', count: 46, min: 4, gen: (n) => netPoints(TETRA, n) },
  { id: 'octahedron', name: 'Octahedron', count: 66, min: 6, gen: (n) => netPoints(OCTA, n) },
  { id: 'dodecahedron', name: 'Dodecahedron', count: 110, min: 20, gen: (n) => netPoints(DODECA, n) },
  { id: 'icosahedron', name: 'Icosahedron', count: 102, min: 12, gen: (n) => netPoints(ICOSA, n) },
  { id: 'football', name: 'Football', count: 150, min: 60, tags: 'soccer ball', gen: (n) => netPoints(FOOTBALL, n) },
  {
    id: 'prism', name: 'Prism', count: 84, min: 12,
    params: [P('sides', 'Sides', 3, 10, 1, 6)],
    gen: (n, p) => netPoints(prismNet(Math.round(p.sides)), n),
  },
  {
    id: 'crystal', name: 'Crystal', count: 74, min: 8,
    params: [P('sides', 'Sides', 3, 10, 1, 6)],
    gen: (n, p) => spreadPoints(crystalNet(Math.round(p.sides)), n),
  },
  {
    id: 'gem', name: 'Gem', count: 120, min: 17, tags: 'diamond jewel',
    params: [P('sides', 'Sides', 5, 10, 1, 8)],
    gen: (n, p) => spreadPoints(gemNet(Math.round(p.sides)), n),
  },
  {
    id: 'star3d', name: '3D star', count: 112, min: 12,
    params: [P('points', 'Points', 4, 8, 1, 5), P('depth', 'Depth', 0.1, 0.8, 0.05, 0.4)],
    gen: (n, p) => spreadPoints(star3dNet(Math.round(p.points), p.depth), n),
  },
  { id: 'tesseract', name: 'Cube in a cube', count: 112, min: 16, tags: 'tesseract hypercube', gen: (n) => netPoints(TESSERACT, n) },
  {
    id: 'stepped', name: 'Step pyramid', count: 120, min: 24,
    params: [P('steps', 'Steps', 2, 5, 1, 3)],
    gen: (n, p) => netPoints(steppedNet(Math.round(p.steps)), n),
  },
  { id: 'hut', name: 'Hut', count: 81, min: 9, tags: 'house', gen: (n) => netPoints(HUT, n) },
  {
    id: 'starprism', name: 'Star block', count: 100, min: 20,
    params: [P('points', 'Points', 4, 8, 1, 5), P('inner', 'Inner size', 0.3, 0.8, 0.05, 0.45)],
    gen: (n, p) => netPoints(starBlock(Math.round(p.points), p.inner), n),
  },
  {
    id: 'globe', name: 'Globe', count: 138, min: 26,
    params: [P('lines', 'Lines', 2, 8, 1, 4)],
    gen: (n, p) => netPoints(globeNet(Math.round(p.lines)), n),
  },
  {
    id: 'ringsphere', name: 'Ring ball', count: 90, min: 8,
    params: [P('rings', 'Rings', 3, 12, 1, 7)],
    gen: (n, p) => {
      const k = Math.round(p.rings);
      return ringStack(Array.from({ length: k }, (_, j) => {
        const lat = (-90 + (180 * (j + 0.5)) / k) * RAD;
        return [Math.cos(lat), Math.sin(lat)];
      }), n);
    },
  },
  {
    id: 'ball', name: 'Filled ball', count: 110, min: 8,
    gen: (n) => Array.from({ length: n }, (_, i) => {
      const r = Math.cbrt(scatter(i, 0));
      const y = 1 - 2 * scatter(i, 1);
      const a = TAU * scatter(i, 2);
      const w = Math.sqrt(1 - y * y) * r;
      return [Math.cos(a) * w, y * r, Math.sin(a) * w];
    }),
  },
  {
    id: 'capsule', name: 'Capsule', count: 90, min: 8,
    params: [P('radius', 'Thickness', 0.2, 0.9, 0.05, 0.45)],
    gen: (n, p) => {
      const r = p.radius;
      const c = 1 - r;
      const profile = [];
      for (let i = 0; i <= 15; i++) profile.push([r * Math.cos((90 - i * 6) * RAD), c + r * Math.sin((90 - i * 6) * RAD)]);
      for (let i = 0; i <= 15; i++) profile.push([r * Math.cos(-i * 6 * RAD), -c + r * Math.sin(-i * 6 * RAD)]);
      return lathe(profile, n);
    },
  },
  {
    id: 'hourglass', name: 'Hourglass', count: 84, min: 8,
    params: [P('rings', 'Rings', 3, 13, 1, 7)],
    gen: (n, p) => {
      const k = Math.round(p.rings);
      return ringStack(Array.from({ length: k }, (_, j) => {
        const y = -1 + (2 * j) / (k - 1);
        return [0.12 + 0.88 * Math.abs(y), y];
      }), n);
    },
  },
  {
    id: 'vase', name: 'Vase', count: 96, min: 8,
    params: [P('rings', 'Rings', 5, 16, 1, 10)],
    gen: (n, p) => {
      const k = Math.round(p.rings);
      return ringStack(Array.from({ length: k }, (_, j) => [ease(VASE, j / (k - 1)), -1 + (2 * j) / (k - 1)]), n);
    },
  },
  { id: 'goblet', name: 'Goblet', count: 110, min: 12, tags: 'cup glass', gen: (n) => lathe(GOBLET, n, 0.2) },
  { id: 'saucer', name: 'Flying saucer', count: 100, min: 10, tags: 'ufo', gen: (n) => lathe(SAUCER, n) },
];

// ---------------------------------------------------------------- curves

const roseNet = memo((petals, width) => {
  const chains = [];
  for (let i = 0; i < petals; i++) {
    const chain = [];
    for (let s = 0; s <= 40; s++) {
      const u = -1 + s / 20;
      const r = Math.cos((u * Math.PI) / 2);
      const a = (TAU * i) / petals + (u * width * Math.PI) / petals;
      chain.push([Math.sin(a) * r, Math.cos(a) * r, 0]);
    }
    chain[0] = [0, 0, 0];
    chain[40] = [0, 0, 0];
    chains.push(chain);
  }
  return makeNet([[0, 0, 0]], chains);
});

const petalNet = memo((k) => {
  const at = (s) => [
    ((k + 1) * Math.sin(s) - Math.sin((k + 1) * s)) / (k + 2),
    ((k + 1) * Math.cos(s) - Math.cos((k + 1) * s)) / (k + 2),
    0,
  ];
  const nodes = [];
  const chains = [];
  for (let i = 0; i < k; i++) {
    nodes.push(at((TAU * i) / k));
    chains.push(Array.from({ length: 49 }, (_, j) => at((TAU * (i + j / 48)) / k)));
  }
  return makeNet(nodes, chains);
});

const bounceNet = memo((k) => {
  // every bounce is 0.62 times as high as the one before; its width follows the square root, like a real ball
  const heights = Array.from({ length: k }, (_, i) => 0.62 ** i);
  const total = heights.reduce((s, h) => s + Math.sqrt(h), 0);
  const nodes = [];
  const chains = [];
  let x = -1;
  for (let i = 0; i < k; i++) {
    const w = (2 * Math.sqrt(heights[i])) / total;
    const arch = Array.from({ length: 33 }, (_, j) => [x + (w * j) / 32, -0.8 + 6.4 * heights[i] * (j / 32) * (1 - j / 32), 0]);
    nodes.push(arch[0]);
    chains.push(arch);
    x += w;
    if (i === k - 1) nodes.push(arch[32]);
  }
  return makeNet(nodes, chains);
});

const dnaNet = memo((turns) => {
  const rungs = Math.round(turns * 5) + 1;
  const at = (u, side) => {
    const a = u * turns * TAU + side * Math.PI;
    return [0.5 * Math.cos(a), -1 + 2 * u, 0.5 * Math.sin(a)];
  };
  const strand = (u0, u1, side) => Array.from({ length: 9 }, (_, j) => at(u0 + ((u1 - u0) * j) / 8, side));
  const nodes = [];
  const chains = [];
  for (let i = 0; i < rungs; i++) {
    const u = i / (rungs - 1);
    nodes.push(at(u, 0), at(u, 1));
    chains.push([at(u, 0), at(u, 1)]);
    if (i) chains.push(strand((i - 1) / (rungs - 1), u, 0), strand((i - 1) / (rungs - 1), u, 1));
  }
  return makeNet(nodes, chains);
});

// The strip has one edge that runs round twice; the rungs cross from the edge to itself.
const MOBIUS = (() => {
  const rungs = 16;
  const edge = (u) => {
    const w = 0.72 + 0.28 * Math.cos(u / 2);
    return [w * Math.cos(u), 0.28 * Math.sin(u / 2), w * Math.sin(u)];
  };
  const nodes = [];
  const chains = [];
  for (let i = 0; i < 2 * rungs; i++) {
    nodes.push(edge((TAU * i) / rungs));
    chains.push(Array.from({ length: 5 }, (_, j) => edge((TAU * (i + j / 4)) / rungs)));
  }
  for (let i = 0; i < rungs; i++) chains.push([edge((TAU * i) / rungs), edge((TAU * i) / rungs + TAU)]);
  return makeNet(nodes, chains);
})();

const CURVES = [
  {
    id: 'rose', name: 'Rose', count: 61, min: 7,
    params: [P('petals', 'Petals', 3, 12, 1, 5), P('width', 'Petal width', 0.3, 1, 0.05, 0.6)],
    gen: (n, p) => spreadPoints(roseNet(Math.round(p.petals), p.width), n),
  },
  drawnShape({
    id: 'lissajous', name: 'Lissajous', cat: 'curves', box: false, count: 110,
    params: [P('a', 'Loops across', 1, 6, 1, 3), P('b', 'Loops up', 1, 6, 1, 2)],
    draw: (p) => {
      const g = gcd(Math.round(p.a), Math.round(p.b));
      const a = Math.round(p.a) / g;
      const b = Math.round(p.b) / g;
      // the quarter-turn shift has to go on a side with an odd number, or the curve runs back over itself
      return loopDrawing((t) => (b % 2
        ? [Math.cos(b * t * TAU), Math.sin(a * t * TAU)]
        : [Math.sin(b * t * TAU), Math.cos(a * t * TAU)]), 96 * Math.max(a, b));
    },
  }),
  drawnShape({
    id: 'spirograph', name: 'Spirograph', cat: 'curves', box: false, count: 100,
    params: [P('points', 'Points', 3, 12, 1, 7), P('skip', 'Skip', 1, 5, 1, 3), P('pen', 'Pen', 0.2, 1.6, 0.05, 0.8)],
    draw: (p) => {
      let big = Math.round(p.points);
      let small = Math.round(p.skip);
      if (big === small) small = 1;
      else {
        const g = gcd(big, small);
        big /= g;
        small /= g;
      }
      const d = p.pen * small;
      const k = (big - small) / small;
      const size = Math.abs(big - small) + d;
      return loopDrawing((t) => {
        const s = t * TAU * small;
        return [((big - small) * Math.sin(s) - d * Math.sin(k * s)) / size, ((big - small) * Math.cos(s) + d * Math.cos(k * s)) / size];
      }, Math.max(240, 48 * big));
    },
  }),
  {
    id: 'petalring', name: 'Petal ring', count: 64, min: 6, tags: 'cardioid clover',
    params: [P('petals', 'Petals', 1, 10, 1, 4)],
    gen: (n, p) => netPoints(petalNet(Math.round(p.petals)), n),
  },
  {
    id: 'wavyring', name: 'Wavy circle', count: 64, min: 8,
    params: [P('waves', 'Waves', 3, 16, 1, 8), P('depth', 'Depth', 0.05, 0.6, 0.05, 0.25)],
    gen: (n, p) => {
      const k = Math.round(p.waves);
      return curve((t) => {
        const r = 1 - (p.depth * (1 - Math.cos(k * t * TAU))) / 2;
        return [Math.sin(t * TAU) * r, Math.cos(t * TAU) * r, 0];
      }, n, true, 60 * k);
    },
  },
  {
    id: 'shellspiral', name: 'Shell spiral', count: 60, min: 6,
    params: [P('turns', 'Turns', 1, 5, 0.5, 3)],
    gen: (n, p) => curve((t) => {
      const r = 0.03 ** (1 - t);
      return [Math.sin(t * p.turns * TAU) * r, Math.cos(t * p.turns * TAU) * r, 0];
    }, n),
  },
  {
    id: 'spiralarms', name: 'Spiral arms', count: 72, min: 6,
    params: [P('arms', 'Arms', 2, 6, 1, 3), P('turns', 'Turns', 0.25, 2.5, 0.25, 0.75)],
    gen: (n, p) => {
      const k = Math.round(p.arms);
      return equal(k, n).flatMap((count, i) => curve((t) => {
        const a = (TAU * i) / k + t * p.turns * TAU;
        return [Math.sin(a) * (0.1 + 0.9 * t), Math.cos(a) * (0.1 + 0.9 * t), 0];
      }, count, false, 200));
    },
  },
  {
    id: 'bounce', name: 'Bounce path', count: 60, min: 6,
    params: [P('bounces', 'Bounces', 1, 6, 1, 3)],
    gen: (n, p) => spreadPoints(bounceNet(Math.round(p.bounces)), n),
  },
  drawnShape({
    id: 'trefoil', name: 'Trefoil', cat: 'curves', box: false, count: 80, tags: 'knot celtic',
    draw: () => loopDrawing((t) => [
      (Math.sin(t * TAU) + 2 * Math.sin(2 * t * TAU)) / 3,
      (Math.cos(t * TAU) - 2 * Math.cos(2 * t * TAU)) / 3 + 0.15,
    ], 360),
  }),
  {
    id: 'torusknot', name: 'Torus knot', group: 'solid', count: 100, min: 10,
    params: [P('p', 'Loops', 2, 7, 1, 2), P('q', 'Twists', 3, 12, 1, 3)],
    gen: (n, v) => {
      const g = gcd(Math.round(v.p), Math.round(v.q));
      const a = Math.round(v.p) / g;
      const b = Math.round(v.q) / g;
      return curve((t) => {
        const w = 0.65 + 0.35 * Math.cos(b * t * TAU);
        return [w * Math.sin(a * t * TAU), w * Math.cos(a * t * TAU), 0.35 * Math.sin(b * t * TAU)];
      }, n, true, 120 * Math.max(a, b));
    },
  },
  {
    id: 'globespiral', name: 'Globe spiral', group: 'solid', count: 90, min: 8,
    params: [P('turns', 'Turns', 2, 12, 0.5, 6)],
    gen: (n, p) => curve((t) => {
      const lat = Math.PI * (0.5 - t);
      return [Math.cos(lat) * Math.cos(t * p.turns * TAU), Math.sin(lat), Math.cos(lat) * Math.sin(t * p.turns * TAU)];
    }, n, false, 100 * Math.ceil(p.turns)),
  },
  {
    id: 'ballseam', name: 'Ball seam', group: 'solid', count: 64, min: 8, tags: 'tennis baseball',
    gen: (n) => curve((t) => {
      const a = t * TAU;
      return [0.6 * Math.cos(a) + 0.4 * Math.cos(3 * a), 2 * Math.sqrt(0.24) * Math.sin(2 * a), 0.6 * Math.sin(a) - 0.4 * Math.sin(3 * a)];
    }, n, true, 480),
  },
  {
    id: 'dna', name: 'DNA', group: 'solid', count: 110, min: 22,
    params: [P('turns', 'Turns', 1, 4, 0.5, 2)],
    gen: (n, p) => netPoints(dnaNet(p.turns), n),
  },
  {
    id: 'strands', name: 'Twin helix', group: 'solid', count: 80, min: 6,
    params: [P('strands', 'Strands', 2, 6, 1, 2), P('turns', 'Turns', 0.5, 5, 0.5, 2)],
    gen: (n, p) => {
      const k = Math.round(p.strands);
      return equal(k, n).flatMap((count, i) => Array.from({ length: count }, (_, j) => {
        const t = count > 1 ? j / (count - 1) : 0.5;
        const a = t * p.turns * TAU + (TAU * i) / k;
        return [Math.cos(a), -1 + 2 * t, Math.sin(a)];
      }));
    },
  },
  {
    id: 'slinky', name: 'Slinky', group: 'solid', count: 120, min: 12,
    params: [P('coils', 'Coils', 4, 24, 1, 8)],
    gen: (n, p) => {
      const k = Math.round(p.coils);
      return curve((t) => {
        const f = Math.PI * (1 - t);
        const w = 0.75 + 0.25 * Math.cos(t * k * TAU);
        return [w * Math.cos(f), w * Math.sin(f) - 0.5, 0.25 * Math.sin(t * k * TAU)];
      }, n, false, 40 * k);
    },
  },
  {
    id: 'springring', name: 'Spring ring', group: 'solid', count: 120, min: 12,
    params: [P('coils', 'Coils', 4, 30, 1, 9)],
    gen: (n, p) => {
      const k = Math.round(p.coils);
      return curve((t) => {
        const w = 0.72 + 0.28 * Math.cos(t * k * TAU);
        return [w * Math.cos(t * TAU), 0.28 * Math.sin(t * k * TAU), w * Math.sin(t * TAU)];
      }, n, true, 40 * k);
    },
  },
  { id: 'mobius', name: 'Möbius strip', group: 'solid', count: 128, min: 32, tags: 'mobius twist', gen: (n) => netPoints(MOBIUS, n) },
];

// ---------------------------------------------------------------- effects

const portalNet = memo((k) => {
  const circle = Array.from({ length: 61 }, (_, j) => [Math.sin((TAU * j) / 60), Math.cos((TAU * j) / 60), 0]);
  circle[60] = circle[0];
  const nodes = [circle[0]];
  const chains = [circle];
  for (let i = 0; i < k; i++) {
    const arm = Array.from({ length: 41 }, (_, j) => {
      const a = (TAU * i) / k + (j / 40) * 0.8 * TAU;
      return [Math.sin(a) * (0.12 + 0.017 * j), Math.cos(a) * (0.12 + 0.017 * j), 0];
    });
    nodes.push(arm[0], arm[40]);
    chains.push(arm);
  }
  return makeNet(nodes, chains);
});

const fountainNet = memo((k, spread) => {
  const base = [0, -1, 0];
  const nodes = [base];
  const chains = [];
  for (let i = 0; i < k; i++) {
    const stream = Array.from({ length: 41 }, (_, j) => {
      const u = j / 40;
      return [Math.cos((TAU * i) / k) * spread * u, -1 + 8 * u * (1 - u), Math.sin((TAU * i) / k) * spread * u];
    });
    stream[0] = base;
    nodes.push(stream[40]);
    chains.push(stream);
  }
  return makeNet(nodes, chains);
});

const GYRO = (() => {
  const chains = [];
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      if (dot(AXES[i], AXES[j]) !== 0) continue;
      chains.push(Array.from({ length: 16 }, (_, s) => {
        const f = (Math.PI * s) / 30;
        return [0, 1, 2].map((c) => AXES[i][c] * Math.cos(f) + AXES[j][c] * Math.sin(f));
      }));
    }
  }
  return makeNet(AXES, chains);
})();

const FLAME = Array.from({ length: 81 }, (_, i) => [0.6 * Math.sin(Math.PI * (i / 80) ** 0.7) ** 0.9, -1 + i / 40]);

const cageNet = memo((k) => {
  const at = (i, y) => [Math.cos((TAU * i) / k), y, Math.sin((TAU * i) / k)];
  const nodes = [];
  const chains = [];
  for (let i = 0; i < k; i++) {
    nodes.push(at(i, 1), at(i, -1));
    chains.push([at(i, 1), at(i, -1)]);
    for (const y of [1, -1]) chains.push(Array.from({ length: 9 }, (_, j) => at(i + j / 8, y)));
  }
  return makeNet(nodes, chains);
});

const crownNet = memo((k, h) => {
  // f counts corners: even ones are down, odd ones are up
  const at = (f) => [Math.cos((Math.PI * f) / k), -h + 2 * h * (1 - Math.abs(1 - (f % 2))), Math.sin((Math.PI * f) / k)];
  const nodes = [];
  const chains = [];
  for (let j = 0; j < 2 * k; j++) {
    nodes.push(at(j));
    chains.push(Array.from({ length: 7 }, (_, s) => at(j + s / 6)));
  }
  return makeNet(nodes, chains);
});

const coneNet = memo((k) => {
  const top = [0, 1, 0];
  const at = (i) => [Math.cos((TAU * i) / k), -1, Math.sin((TAU * i) / k)];
  const nodes = [top];
  const chains = [];
  for (let i = 0; i < k; i++) {
    nodes.push(at(i));
    chains.push([top, at(i)], Array.from({ length: 9 }, (_, j) => at(i + j / 8)));
  }
  return makeNet(nodes, chains);
});

const stairsNet = memo((k, turns) => {
  const nodes = [];
  const chains = [];
  let below = null;
  for (let i = 0; i < k; i++) {
    const t = i / (k - 1);
    const a = t * turns * TAU;
    const pole = [0, -1 + 2 * t, 0];
    const outer = [Math.cos(a), -1 + 2 * t, Math.sin(a)];
    nodes.push(pole, outer);
    chains.push([pole, outer]);
    if (below) chains.push([below, pole]);
    below = pole;
  }
  return makeNet(nodes, chains);
});

const EFFECTS = [
  {
    id: 'smoke', name: 'Smoke', group: 'solid', count: 90, min: 8,
    gen: (n) => Array.from({ length: n }, (_, i) => {
      const t = scatter(i, 0);
      const w = (0.15 + 0.85 * t ** 1.3) * Math.sqrt(scatter(i, 1));
      return [Math.cos(TAU * scatter(i, 2)) * w, -1 + 2 * t, Math.sin(TAU * scatter(i, 2)) * w];
    }),
  },
  {
    id: 'firework', name: 'Firework', group: 'solid', count: 96, min: 8,
    params: [P('rays', 'Rays', 6, 40, 1, 16), P('inner', 'Inner size', 0, 0.8, 0.05, 0.25)],
    gen: (n, p) => {
      const k = Math.round(p.rays);
      return equal(k, n).flatMap((count, i) => {
        const y = 1 - (2 * (i + 0.5)) / k;
        const w = Math.sqrt(1 - y * y);
        return Array.from({ length: count }, (_, j) => {
          const r = p.inner + ((1 - p.inner) * (j + 1)) / count;
          return [Math.cos(i * GOLDEN) * w * r, y * r, Math.sin(i * GOLDEN) * w * r];
        });
      });
    },
  },
  {
    id: 'fountain', name: 'Fountain', group: 'solid', count: 96, min: 9,
    params: [P('streams', 'Streams', 3, 16, 1, 8), P('spread', 'Width', 0.2, 1, 0.05, 0.7)],
    gen: (n, p) => spreadPoints(fountainNet(Math.round(p.streams), p.spread), n),
  },
  {
    id: 'galaxy', name: 'Galaxy', group: 'solid', count: 120, min: 12,
    params: [P('arms', 'Arms', 2, 6, 1, 3), P('twist', 'Twist', 0.2, 2, 0.1, 0.8)],
    gen: (n, p) => {
      const k = Math.round(p.arms);
      return Array.from({ length: n }, (_, i) => {
        const r = 0.06 + 0.94 * scatter(i, 0);
        const a = (TAU * (i % k)) / k + p.twist * TAU * r + (scatter(i, 1) - 0.5) * (1 - r / 2);
        return [Math.cos(a) * r, (scatter(i, 2) - 0.5) * 0.3 * (1 - r), Math.sin(a) * r];
      });
    },
  },
  {
    id: 'whirlpool', name: 'Whirlpool', group: 'solid', count: 90, min: 8,
    params: [P('arms', 'Arms', 2, 6, 1, 3), P('turns', 'Turns', 0.5, 3, 0.25, 1.25)],
    gen: (n, p) => {
      const k = Math.round(p.arms);
      return equal(k, n).flatMap((count, i) => curve((t) => {
        const a = (TAU * i) / k + t * p.turns * TAU;
        return [Math.cos(a) * (1 - 0.92 * t), 0.3 - 0.9 * t * t, Math.sin(a) * (1 - 0.92 * t)];
      }, count, false, 200));
    },
  },
  {
    id: 'portal', name: 'Portal', group: 'flat', count: 90, min: 8,
    params: [P('arms', 'Swirls', 2, 6, 1, 3)],
    gen: (n, p) => netPoints(portalNet(Math.round(p.arms)), n),
  },
  { id: 'halo', name: 'Halo', group: 'solid', count: 32, min: 3, gen: (n) => ring(n, 1, 0) },
  {
    id: 'ripple', name: 'Ripple', group: 'solid', count: 72, min: 6,
    params: [P('rings', 'Rings', 2, 6, 1, 3)],
    gen: (n, p) => {
      const k = Math.round(p.rings);
      return ringStack(Array.from({ length: k }, (_, j) => [(j + 1) / k, 0]), n);
    },
  },
  {
    id: 'cyclone', name: 'Cyclone', group: 'solid', count: 96, min: 8,
    params: [P('strands', 'Strands', 2, 5, 1, 3), P('turns', 'Turns', 0.5, 5, 0.5, 2)],
    gen: (n, p) => {
      const k = Math.round(p.strands);
      return equal(k, n).flatMap((count, i) => curve((t) => {
        const a = (TAU * i) / k + t * p.turns * TAU;
        return [Math.cos(a) * (0.12 + 0.88 * t), -1 + 2 * t, Math.sin(a) * (0.12 + 0.88 * t)];
      }, count, false, 200));
    },
  },
  { id: 'gyro', name: 'Orbit rings', group: 'solid', count: 90, min: 6, tags: 'gyroscope', gen: (n) => netPoints(GYRO, n) },
  {
    id: 'scatter', name: 'Scatter', group: 'solid', count: 80, min: 8, tags: 'random cloud snow',
    gen: (n) => Array.from({ length: n }, (_, i) => [0, 1, 2].map((axis) => 2 * scatter(i, axis) - 1)),
  },
  { id: 'flame3d', name: '3D flame', group: 'solid', count: 90, min: 8, tags: 'fire', gen: (n) => lathe(FLAME, n) },
  {
    id: 'comet', name: 'Comet', group: 'solid', count: 100, min: 10, tags: 'meteor',
    gen: (n) => {
      const head = Math.round(n * 0.4);
      return Array.from({ length: n }, (_, i) => {
        let along; // along the flight path, which runs from the bottom left corner to the top right
        let across;
        let depth;
        if (i < head) {
          const y = 1 - (2 * (i + 0.5)) / head;
          const w = Math.sqrt(1 - y * y);
          along = 0.87 + 0.38 * Math.cos(i * GOLDEN) * w;
          across = 0.38 * y;
          depth = 0.38 * Math.sin(i * GOLDEN) * w;
        } else {
          const t = scatter(i - head, 0) ** 0.8;
          const w = 0.34 * (1 - t) * Math.sqrt(scatter(i - head, 1));
          along = 0.7 - 2.1 * t;
          across = Math.cos(TAU * scatter(i - head, 2)) * w;
          depth = Math.sin(TAU * scatter(i - head, 2)) * w;
        }
        return [(along - across) * Math.SQRT1_2, (along + across) * Math.SQRT1_2, depth];
      });
    },
  },
  {
    id: 'pillar', name: 'Light pillar', group: 'solid', count: 100, min: 12, tags: 'beam',
    params: [P('turns', 'Turns', 1, 8, 0.5, 3)],
    gen: (n, p) => {
      const [outer, inner, a, b] = apportion([5, 3, 6, 6], n);
      const strand = (count, phase) => Array.from({ length: count }, (_, j) => {
        const t = (j + 0.5) / count;
        return [0.25 * Math.cos(phase + t * p.turns * TAU), -1 + 2 * t, 0.25 * Math.sin(phase + t * p.turns * TAU)];
      });
      return [...ring(outer, 1, -1), ...ring(inner, 0.6, -1, Math.PI / Math.max(1, inner)), ...strand(a, 0), ...strand(b, Math.PI)];
    },
  },
  {
    id: 'cage', name: 'Cage', group: 'solid', count: 96, min: 16,
    params: [P('bars', 'Bars', 3, 16, 1, 8)],
    gen: (n, p) => netPoints(cageNet(Math.round(p.bars)), n),
  },
  {
    id: 'crownring', name: 'Crown ring', group: 'solid', count: 80, min: 16,
    params: [P('spikes', 'Spikes', 3, 16, 1, 8), P('height', 'Height', 0.1, 1, 0.05, 0.4)],
    gen: (n, p) => netPoints(crownNet(Math.round(p.spikes), p.height), n),
  },
  {
    id: 'wavehalo', name: 'Wave ring', group: 'solid', count: 64, min: 8,
    params: [P('waves', 'Waves', 2, 12, 1, 4), P('height', 'Height', 0.1, 1, 0.05, 0.35)],
    gen: (n, p) => {
      const k = Math.round(p.waves);
      return curve((t) => [Math.cos(t * TAU), p.height * Math.sin(k * t * TAU), Math.sin(t * TAU)], n, true, 60 * k);
    },
  },
  {
    id: 'spotlight', name: 'Light cone', group: 'solid', count: 90, min: 9, tags: 'spotlight',
    params: [P('rays', 'Rays', 3, 16, 1, 8)],
    gen: (n, p) => spreadPoints(coneNet(Math.round(p.rays)), n),
  },
  {
    id: 'stairs', name: 'Spiral stairs', group: 'solid', count: 84, min: 28,
    params: [P('steps', 'Steps', 6, 30, 1, 14), P('turns', 'Turns', 0.5, 3, 0.25, 1)],
    gen: (n, p) => netPoints(stairsNet(Math.round(p.steps), p.turns), n),
  },
  {
    id: 'heart3d', name: 'Puffy heart', group: 'solid', count: 110, min: 12,
    gen: (n) => {
      const slices = Array.from({ length: 5 }, (_, j) => {
        const lat = (-90 + 36 * (j + 0.5)) * RAD;
        return [Math.cos(lat), 0.5 * Math.sin(lat)];
      });
      return apportion(slices.map(([size]) => size), n).flatMap((count, j) => curve((t) => {
        const [x, y] = heartAt(t + j * 0.1);
        return [x * slices[j][0], y * slices[j][0], slices[j][1]];
      }, count, true, 240));
    },
  },
  {
    id: 'orbs', name: 'Orbs', group: 'solid', count: 100, min: 10,
    params: [P('orbs', 'Orbs', 2, 8, 1, 5)],
    gen: (n, p) => {
      const k = Math.round(p.orbs);
      return equal(k, n).flatMap((count, i) => Array.from({ length: count }, (_, j) => {
        const y = 1 - (2 * (j + 0.5)) / count;
        const w = 0.22 * Math.sqrt(1 - y * y);
        return [0.78 * Math.cos((TAU * i) / k) + Math.cos(j * GOLDEN) * w, 0.22 * y, 0.78 * Math.sin((TAU * i) / k) + Math.sin(j * GOLDEN) * w];
      }));
    },
  },
];

const tag = (cat, group, list) => list.map((s) => {
  s.cat = cat;
  if (!s.group) s.group = group;
  return s;
});

export const GEO_SHAPES = [
  ...tag('basic', 'flat', BASIC),
  ...tag('solid', 'solid', SOLID),
  ...tag('curves', 'flat', CURVES),
  ...tag('effects', 'solid', EFFECTS),
];
