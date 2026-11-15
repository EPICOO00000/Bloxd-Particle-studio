// The last shapes that are worked out rather than drawn, added when the library
// grew to 1,624 shapes: more basic shapes, patterns, curves, effects and 3D
// things. The tools they use are in shape-kit.js.

import {
  TAU, RAD, GOLDEN, P, apportion, curve, ring, scatter, netPoints, pathPoints, lathe, ringStack,
  parsePath, joinDrawings, drawnShape, arcPoly, spin, around, scallop, stamp, mix, ballPoints, blobPoints, fillPoints,
} from './shape-kit.js';
import { across } from './shapes-flat.js';
import { loop } from './shapes-curves.js';
import { floaters } from './shapes-effects.js';

const HEART = 'M0,7.4 C1,10 5,10 5,6.6 C5,3.6 1.6,1.6 0,0 |'; // 10 wide, 9.3 high, its tip at 0,0
const heartAt = (x, y, size) => [x, y - 4.65 * size, size];
const star = (cx, cy, out, inn, k = 5, first = 90) => `M${Array.from({ length: 2 * k }, (_, i) => around(cx, cy, i % 2 ? inn : out, first + (180 * i) / k)).join(' L')} Z`;
const picture = (polys, dots = []) => ({ polys, dots });
const circle = (cx, cy, r) => arcPoly(cx, cy, r, r, 0, 360);
const equal = (parts, n) => apportion(Array(parts).fill(1), n);
const some = (k, make) => (k > 0 ? make(k) : []);
const put = (cat, group, sub, list) => list.map((s) => Object.assign(s, { cat, group, sub }));

// ---------------------------------------------------------------- basic

const basic = (sub, id, name, draw, extra = {}) => drawnShape({ id, name, cat: 'basic', sub, draw, ...extra });

/** `k` copies of a drawing (one unit big) in a ring, with a little air between them. */
function ringOf(d, k, fill) {
  const size = fill * 2 * 3.8 * Math.sin(Math.PI / k);
  return stamp(d, Array.from({ length: k }, (_, i) => [3.8 * Math.sin((TAU * i) / k), 3.8 * Math.cos((TAU * i) / k), size]));
}

function turningSquares(count) {
  let sq = [[-5, -5], [5, -5], [5, 5], [-5, 5]];
  const polys = [];
  for (let i = 0; i < count; i++) {
    polys.push([...sq, sq[0]]);
    sq = sq.map(([x, y], j) => [x + 0.2 * (sq[(j + 1) % 4][0] - x), y + 0.2 * (sq[(j + 1) % 4][1] - y)]);
  }
  return picture(polys);
}

const BASIC = [
  basic('More outlines', 'chevron', 'Chevron', 'M-5,1 L0,5 L5,1 L5,-2.6 L0,1.4 L-5,-2.6 Z', { tags: 'arrow v rank stripe up' }),
  basic('More outlines', 'kite-shape', 'Kite shape', 'M0,5 L3.4,1.6 L0,-5 L-3.4,1.6 Z', { tags: 'diamond deltoid' }),
  basic('More outlines', 'two-triangles', 'Two triangles', 'M-4,5 L4,5 L0,0 L-4,-5 L4,-5 L0,0 Z', { tags: 'hourglass bow tie bowtie sand timer' }),
  basic('More outlines', 'quatrefoil', 'Quatrefoil', () => scallop(0, 0, 3.2, 4, 1), { tags: 'four leaf clover flower lobes' }),
  basic('More outlines', 'bitten-circle', 'Bitten circle', (p) => `M0,0 L${around(0, 0, 5, p.mouth / 2)} A0,0 5 ${p.mouth / 2} ${360 - p.mouth / 2} Z`, {
    params: [P('mouth', 'Mouth', 20, 120, 5, 60)], box: [0, 0, 5], tags: 'pac man chomp eat pie',
  }),
  basic('More outlines', 'house-shape', 'House shape', 'M-4,-5 L4,-5 L4,0.6 L0,5 L-4,0.6 Z', { tags: 'home pentagon hut' }),
  basic('Shapes in shapes', 'circle-in-triangle', 'Circle in a triangle', 'M0,5 L4.3301,-2.5 L-4.3301,-2.5 Z O0,0 1.9'),
  basic('Shapes in shapes', 'nested-stars', 'Nested stars', () => `${star(0, 0, 5, 2.25)} ${star(0, 0, 2.5, 1.1)}`, { tags: 'star in a star double' }),
  basic('Shapes in shapes', 'diamond-in-square', 'Diamond in a square', 'M-5,-5 L5,-5 L5,5 L-5,5 Z M0,5 L5,0 L0,-5 L-5,0 Z', { tags: 'rhombus box tile' }),
  basic('Shapes in shapes', 'turning-squares', 'Turning squares', (p) => turningSquares(Math.round(p.squares)), {
    params: [P('squares', 'Squares', 2, 8, 1, 4)], tags: 'spiral nested twist whirl',
  }),
  basic('Shapes in shapes', 'heart-in-circle', 'Heart in a circle', `${HEART} O0,4.6 6.6`, { tags: 'love badge button' }),
  basic('Shapes in shapes', 'triangle-in-triangle', 'Triangle in a triangle', 'M0,5 L4.3301,-2.5 L-4.3301,-2.5 Z M2.165,1.25 L-2.165,1.25 L0,-2.5 Z', { tags: 'triforce three' }),
  basic('Shapes in shapes', 'ring-of-circles', 'Ring of circles', (p) => ringOf('O0,0 1', Math.round(p.circles), 0.4), {
    params: [P('circles', 'Circles', 3, 16, 1, 8)], tags: 'beads chain necklace dots',
  }),
  basic('Shapes in shapes', 'ring-of-stars', 'Ring of stars', (p) => ringOf(star(0, 0, 1, 0.42), Math.round(p.stars), 0.45), {
    params: [P('stars', 'Stars', 3, 12, 1, 6)], tags: 'flag europe circle crown',
  }),
];

const EGG = Array.from({ length: 72 }, (_, i) => [0.74 * Math.sin((TAU * i) / 72) * (1 - 0.2 * Math.cos((TAU * i) / 72)), Math.cos((TAU * i) / 72)]);
const PILL = [...arcPoly(0.5, 0, 0.5, 0.5, -90, 90), ...arcPoly(-0.5, 0, 0.5, 0.5, 90, 270)];

const FILLED = [
  { id: 'fill-egg', name: 'Filled egg', count: 60, min: 8, tags: 'oval easter', gen: (n) => fillPoints([EGG], n) },
  {
    id: 'fill-trapezoid', name: 'Filled trapezoid', count: 60, min: 6,
    params: [P('top', 'Top width', 0.1, 0.9, 0.05, 0.5)],
    gen: (n, p) => fillPoints([[[-p.top, 0.6], [p.top, 0.6], [1, -0.6], [-1, -0.6]]], n),
  },
  {
    id: 'fill-flower', name: 'Filled flower', count: 80, min: 8, tags: 'petals daisy blossom',
    params: [P('petals', 'Petals', 3, 10, 1, 5)],
    gen: (n, p) => fillPoints([Array.from({ length: 180 }, (_, i) => {
      const a = (TAU * i) / 180;
      const r = 0.62 + 0.38 * Math.cos(Math.round(p.petals) * a);
      return [r * Math.sin(a), r * Math.cos(a)];
    })], n),
  },
  { id: 'fill-pill', name: 'Filled pill', count: 60, min: 6, tags: 'capsule stadium', gen: (n) => fillPoints([PILL], n) },
  { id: 'fill-house', name: 'Filled house', count: 60, min: 6, tags: 'home pentagon', gen: (n) => fillPoints([[[-0.8, -1], [0.8, -1], [0.8, 0.12], [0, 1], [-0.8, 0.12]]], n) },
];

const LINES = [
  {
    id: 'double-line', name: 'Double line', count: 40, min: 4, tags: 'parallel rails equals two',
    params: [P('gap', 'Gap', 0.1, 1, 0.05, 0.3)],
    gen: (n, p) => equal(2, n).flatMap((k, i) => some(k, () => pathPoints([[-1, (i ? -1 : 1) * p.gap, 0], [1, (i ? -1 : 1) * p.gap, 0]], k))),
  },
  {
    id: 'bumps', name: 'Bumps', count: 48, min: 5, tags: 'arches humps hills half circles',
    params: [P('bumps', 'Bumps', 1, 8, 1, 3)],
    gen: (n, p) => {
      const k = Math.round(p.bumps);
      return pathPoints(Array.from({ length: k }, (_, i) => arcPoly(-1 + (2 * i + 1) / k, -0.5 / k, 1 / k, 1 / k, 180, 0)).flat().map(([x, y]) => [x, y, 0]), n);
    },
  },
];

// ---------------------------------------------------------------- patterns

const pattern = (sub, id, name, draw, extra = {}) => drawnShape({ id, name, cat: 'patterns', sub, draw, ...extra });

/** Rows of things, every other row moved half a step: [x, y] of each. */
const brickRows = (step) => [1, 0, -1].flatMap((row) => (row ? [-1, 0, 1] : [-0.5, 0.5]).map((col) => [col * step, row * step]));

function goldenSpiral() {
  const squares = [[0, 0, 1], [1, 0, 1], [0, 1, 2], [-3, 0, 3], [-3, -5, 5], [2, -5, 8]];
  const arcs = [[1, 1, 1, 180], [1, 1, 1, 270], [0, 1, 2, 0], [0, 0, 3, 90], [2, 0, 5, 180], [2, 3, 8, 270]];
  return picture([
    ...squares.map(([x, y, s]) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]),
    arcs.flatMap(([cx, cy, r, a], i) => arcPoly(cx, cy, r, r, a, a + 90).slice(i ? 1 : 0)),
  ]);
}

/** The Peano curve through a board of 3^order squares a side. */
function peano(order) {
  let pts = [[0, 0]];
  for (let o = 0; o < order; o++) {
    const size = 3 ** o;
    const next = [];
    for (let i = 0; i < 9; i++) {
      const col = Math.floor(i / 3);
      const row = col % 2 ? 2 - (i % 3) : i % 3;
      for (const [x, y] of pts) next.push([col * size + (row % 2 ? size - 1 - x : x), row * size + (col % 2 ? size - 1 - y : y)]);
    }
    pts = next;
  }
  const half = (3 ** order - 1) / 2;
  return pts.map(([x, y]) => [x / half - 1, y / half - 1, 0]);
}

function cantor(depth) {
  const polys = [];
  for (let level = 0; level <= depth; level++) {
    let bars = [[0, 1]];
    for (let i = 0; i < level; i++) bars = bars.flatMap(([a, b]) => [[a, a + (b - a) / 3], [b - (b - a) / 3, b]]);
    for (const [a, b] of bars) polys.push([[a, -level * 0.16], [b, -level * 0.16]]);
  }
  return picture(polys);
}

const PATTERNS = [
  pattern('Tilings', 'octagon-tiling', 'Octagon tiling', (p) => {
    const t = Math.tan(Math.PI / 8);
    const octagon = [[1, t], [t, 1], [-t, 1], [-1, t], [-1, -t], [-t, -1], [t, -1], [1, -t], [1, t]];
    const k = Math.round(p.size);
    return picture(Array.from({ length: k * k }, (_, i) => octagon.map(([x, y]) => [x + 2 * (i % k), y + 2 * Math.floor(i / k)])));
  }, { params: [P('size', 'Size', 2, 4, 1, 3)], tags: 'octagons squares tiles floor' }),
  pattern('Tilings', 'tumbling-blocks', 'Tumbling blocks', () => {
    const polys = [];
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 3 - (j % 2); i++) {
        const [cx, cy] = [Math.sqrt(3) * (i + 0.5 * (j % 2)), 1.5 * j];
        const v = Array.from({ length: 7 }, (_, q) => [cx + Math.cos((30 + 60 * q) * RAD), cy + Math.sin((30 + 60 * q) * RAD)]);
        polys.push(v, [v[0], [cx, cy], v[2]], [[cx, cy], v[4]]);
      }
    }
    return picture(polys);
  }, { tags: 'cubes boxes 3d isometric rhombus tiles' }),
  pattern('Tilings', 'kagome', 'Kagome', () => picture([0, 60, 120].flatMap((angle) => (
    [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((offset) => across(offset, angle)).filter(Boolean)))), { box: false, tags: 'triangles hexagons stars weave japan basket' }),
  pattern('Tilings', 'plaid', 'Plaid', () => picture([-0.62, -0.38, 0.38, 0.62].flatMap((v) => [[[v, -1], [v, 1]], [[-1, v], [1, v]]])), {
    box: false, tags: 'tartan check cloth lines hash',
  }),
  pattern('Tilings', 'heart-pattern', 'Heart pattern', () => stamp(HEART, brickRows(7).map(([x, y]) => heartAt(x, y, 0.5))), { tags: 'hearts love wallpaper valentine' }),
  pattern('Tilings', 'star-pattern', 'Star pattern', () => brickRows(6.4).map(([x, y]) => star(x, y, 2.5, 1.05)).join(' '), { tags: 'stars night wallpaper flag' }),
  pattern('Borders', 'diamond-border', 'Diamond border', (p) => {
    const k = Math.round(p.diamonds);
    return picture([1.3, -1.3].map((h) => Array.from({ length: 2 * k + 1 }, (_, i) => [i, i % 2 ? h : 0])));
  }, { params: [P('diamonds', 'Diamonds', 2, 8, 1, 5)], tags: 'rhombus row harlequin' }),
  pattern('Borders', 'heart-border', 'Heart border', (p) => stamp(HEART, Array.from({ length: Math.round(p.hearts) }, (_, i) => [12 * i, 0])), {
    params: [P('hearts', 'Hearts', 2, 6, 1, 4)], tags: 'row of hearts love lives health',
  }),
  pattern('Borders', 'star-border', 'Star border', (p) => Array.from({ length: Math.round(p.stars) }, (_, i) => star(2.4 * i, 0, 1, 0.42)).join(' '), {
    params: [P('stars', 'Stars', 2, 7, 1, 5)], tags: 'row of stars rating review rank',
  }),
  pattern('Borders', 'battlements', 'Battlements', (p) => {
    const k = Math.round(p.teeth);
    const wall = [[0, 0]];
    for (let i = 0; i < k; i++) wall.push([2 * i, 1.6], [2 * i + 1, 1.6], ...(i < k - 1 ? [[2 * i + 1, 0.8], [2 * i + 2, 0.8]] : []));
    return picture([[...wall, [2 * k - 1, 0], [0, 0]]]);
  }, { params: [P('teeth', 'Teeth', 2, 7, 1, 4)], tags: 'castle wall crenel tower top' }),
  pattern('Borders', 'railway-track', 'Railway track', (p) => {
    const k = Math.round(p.sleepers);
    return picture([[[0, 1], [2 * k, 1]], [[0, -1], [2 * k, -1]], ...Array.from({ length: k }, (_, i) => [[2 * i + 1, 1.5], [2 * i + 1, -1.5]])]);
  }, { params: [P('sleepers', 'Sleepers', 3, 9, 1, 6)], tags: 'rails train ladder line' }),
  pattern('Fractals', 'golden-spiral', 'Golden spiral', goldenSpiral, { tags: 'fibonacci squares rectangle shell ratio' }),
  {
    id: 'peano', name: 'Peano curve', cat: 'patterns', group: 'flat', sub: 'Fractals', count: 161, min: 9, tags: 'fractal maze path snake',
    params: [P('order', 'Order', 1, 3, 1, 2)],
    gen: (n, p) => pathPoints(peano(Math.round(p.order)), n),
  },
  pattern('Fractals', 'cantor-set', 'Cantor set', (p) => cantor(Math.round(p.depth)), { params: [P('depth', 'Depth', 2, 4, 1, 3)], tags: 'fractal dust bars thirds comb', count: 96 }),
];

// ---------------------------------------------------------------- curves

const flatCurve = (id, name, draw, extra = {}) => drawnShape({ id, name, cat: 'curves', sub: 'More flat curves', draw, ...extra });

const FLAT_CURVES = [
  flatCurve('lemniscate', 'Lemniscate', () => loop((t) => {
    const [s, c] = [Math.sin(t * TAU), Math.cos(t * TAU)];
    return [c / (1 + s * s), (s * c) / (1 + s * s)];
  }), { tags: 'infinity figure eight loop', count: 60 }),
  flatCurve('cycloid', 'Cycloid', (p) => picture([Array.from({ length: 241 }, (_, i) => {
    const a = (Math.round(p.arches) * TAU * i) / 240;
    return [a - Math.sin(a), 1 - Math.cos(a)];
  })]), { params: [P('arches', 'Arches', 1, 5, 1, 3)], tags: 'rolling wheel arches bounce', count: 64 }),
  flatCurve('epicycloid', 'Epicycloid', (p) => {
    const k = Math.round(p.cusps);
    return loop((t) => [(k + 1) * Math.sin(t * TAU) - Math.sin((k + 1) * t * TAU), (k + 1) * Math.cos(t * TAU) - Math.cos((k + 1) * t * TAU)], 720);
  }, { params: [P('cusps', 'Cusps', 1, 8, 1, 3)], tags: 'cardioid nephroid flower rolling' }),
  flatCurve('hypocycloid', 'Hypocycloid', (p) => {
    const k = Math.round(p.cusps);
    return loop((t) => [(k - 1) * Math.sin(t * TAU) - Math.sin((k - 1) * t * TAU), (k - 1) * Math.cos(t * TAU) + Math.cos((k - 1) * t * TAU)], 720);
  }, { params: [P('cusps', 'Cusps', 3, 8, 1, 3)], tags: 'deltoid star curved triangle rolling' }),
  flatCurve('supershape', 'Supershape', (p) => loop((t) => {
    const a = (Math.round(p.points) * t * TAU) / 4;
    const r = (Math.abs(Math.cos(a)) ** 1.7 + Math.abs(Math.sin(a)) ** 1.7) ** (-1 / p.round);
    return [r * Math.sin(t * TAU), r * Math.cos(t * TAU)];
  }, 720), { params: [P('points', 'Points', 2, 12, 1, 5), P('round', 'Roundness', 0.1, 1, 0.05, 0.2)], tags: 'superformula starfish rounded star' }),
];

const GRANNY = (() => {
  const at = (t) => [
    -22 * Math.cos(t) - 128 * Math.sin(t) - 44 * Math.cos(3 * t) - 78 * Math.sin(3 * t),
    -10 * Math.cos(2 * t) - 27 * Math.sin(2 * t) + 38 * Math.cos(4 * t) + 46 * Math.sin(4 * t),
    70 * Math.cos(3 * t) - 40 * Math.sin(3 * t),
  ];
  const reach = Math.max(...Array.from({ length: 720 }, (_, i) => Math.max(...at((TAU * i) / 720).map(Math.abs))));
  return (t) => at(t * TAU).map((v) => v / (reach * 1.001));
})();

// The start is moved a little so that no two particles meet where a curve crosses itself.
const OFF = 0.0137;

const SPACE_CURVES = [
  {
    id: 'clelia', name: 'Clelia curve', count: 120, min: 16, tags: 'ball flower rose sphere petals',
    params: [P('petals', 'Loops', 2, 6, 1, 3)],
    gen: (n, p) => curve((t) => {
      const a = (t + OFF) * TAU;
      return [Math.sin(a) * Math.cos(Math.round(p.petals) * a), Math.cos(a), Math.sin(a) * Math.sin(Math.round(p.petals) * a)];
    }, n, true, 1440),
  },
  {
    id: 'yarn-ball', name: 'Ball of yarn', count: 160, min: 30, tags: 'wool string wound sphere cat toy',
    params: [P('wraps', 'Wraps', 2, 10, 1, 4)],
    gen: (n, p) => curve((t) => {
      const [u, v] = [Math.round(p.wraps) * TAU * (t + OFF), TAU * (t + OFF)];
      const [x, y, z] = [Math.cos(u), -Math.sin(u) * 0.82, Math.sin(u) * 0.57];
      return [x * Math.cos(v) + z * Math.sin(v), y, z * Math.cos(v) - x * Math.sin(v)];
    }, n, true, 2400),
  },
  { id: 'granny-knot', name: 'Granny knot', count: 130, min: 20, tags: 'rope tie loops', gen: (n) => curve(GRANNY, n, true, 1440) },
];

// ---------------------------------------------------------------- effects

const seal = (id, name, draw, extra = {}) => drawnShape({ id, name, cat: 'effects', sub: 'Magic circles', draw, ...extra });
const RINGS = 'O0,0 5 O0,0 4.3';
const ticks = (from, to, count) => Array.from({ length: count }, (_, i) => `M${around(0, 0, from, (360 * i) / count)} L${around(0, 0, to, (360 * i) / count)}`).join(' ');

const SEALS = [
  seal('triskelion-seal', 'Triskelion seal', () => picture([circle(0, 0, 5), ...[0, 120, 240].map((turn) => Array.from({ length: 41 }, (_, i) => {
    const a = (turn + 7.5 * i) * RAD;
    return [0.105 * i * Math.cos(a), 0.105 * i * Math.sin(a)];
  }))]), { tags: 'spiral three arms celtic swirl' }),
  seal('frost-seal', 'Frost seal', () => joinDrawings(parsePath(RINGS), spin('M0,0 L0,3.7 M0,2.1 L0.9,3 M0,2.1 L-0.9,3 M0,1.1 L0.6,1.7 M0,1.1 L-0.6,1.7', 6)), {
    tags: 'ice snowflake freeze winter cold spell',
  }),
  seal('love-seal', 'Love seal', () => joinDrawings(parsePath(`${RINGS} ${Array.from({ length: 8 }, (_, i) => `D${around(0, 0, 3.6, 22.5 + 45 * i)}`).join(' ')}`), stamp(HEART, [heartAt(0, 0, 0.5)])), {
    tags: 'heart charm spell valentine',
  }),
  seal('healing-circle', 'Healing circle', () => joinDrawings(
    parsePath(`${RINGS} M-0.8,2.6 L0.8,2.6 L0.8,0.8 L2.6,0.8 L2.6,-0.8 L0.8,-0.8 L0.8,-2.6 L-0.8,-2.6 L-0.8,-0.8 L-2.6,-0.8 L-2.6,0.8 L-0.8,0.8 Z`),
    stamp('M-0.5,0 L0.5,0 M0,-0.5 L0,0.5', [[2.33, 2.33], [-2.33, 2.33], [2.33, -2.33], [-2.33, -2.33]]),
  ), { tags: 'heal health plus cross regen medic spell' }),
  seal('radar', 'Radar', 'O0,0 5 O0,0 3.3 O0,0 1.6 M-5,0 L5,0 M0,-5 L0,5 M0,0 L2.5,4.33 D-2.4,1.3 D1.2,-2.6 D-3.4,-2.2', { tags: 'scan sweep sonar detect map blips' }),
  seal('storm-seal', 'Storm seal', `${RINGS} M-0.45,3 L1.65,3 L0.33,0.6 L1.95,0.6 L-1.35,-3 L-0.45,-0.36 L-1.95,-0.36 Z`, { tags: 'lightning bolt thunder electric spell' }),
  seal('fire-seal', 'Fire seal', `${RINGS} M0,-3.2 C-2.6,-3.2 -3,-0.4 -1.6,1.2 C-1.4,0.2 -0.8,-0.2 -0.6,0.4 C-0.4,1.6 0.2,2.4 0.2,3.4 C1.6,2.4 3,0.4 2.4,-1.2 C2,-2.4 1.2,-3.2 0,-3.2 M0,-2.5 C-1,-2.5 -1.2,-1.3 0,-0.1 C1.2,-1.3 1,-2.5 0,-2.5`, {
    tags: 'flame burn heat spell',
  }),
  seal('tech-ring', 'Tech ring', () => `N A0,0 5 10 110 N A0,0 5 130 230 N A0,0 5 250 350 O0,0 4 N A0,0 3 15 75 N A0,0 3 105 165 N A0,0 3 195 255 N A0,0 3 285 345 O0,0 1 D0,0 ${ticks(4.3, 4.7, 12)}`, {
    tags: 'sci-fi hud scanner robot future loading',
  }),
];

const SPIKES = Array.from({ length: 14 }, (_, i) => {
  const y = 1 - (2 * i + 1) / 14;
  const r = Math.sqrt(1 - y * y);
  return [r * Math.cos(i * GOLDEN), y, r * Math.sin(i * GOLDEN), 0.7 + 0.29 * scatter(i, 0)];
});
const CLOUD = [[-0.5, 0.5, 0, 0.38], [0, 0.58, 0, 0.4], [0.5, 0.5, 0, 0.38], [0.15, 0.44, 0.28, 0.32], [-0.2, 0.46, -0.28, 0.32]];
const BOLT = [[0.1, 0.1, 0], [-0.2, -0.32, 0], [0.12, -0.38, 0], [-0.15, -0.98, 0]];

const FIELDS = [
  {
    id: 'ring-cone', name: 'Ring cone', count: 100, min: 8, tags: 'tractor beam ufo abduct funnel rings',
    params: [P('rings', 'Rings', 3, 10, 1, 6)],
    gen: (n, p) => {
      const k = Math.round(p.rings);
      return ringStack(Array.from({ length: k + 1 }, (_, j) => [j / k, 1 - (2 * j) / k]), n);
    },
  },
];

const ELEMENTS = [
  {
    id: 'explosion', name: 'Explosion', count: 120, min: 30, tags: 'boom blast burst bang tnt',
    gen: (n) => mix(n, [
      { weight: 2, gen: (k) => ballPoints(k, 0.3) },
      {
        weight: 5,
        gen: (k) => equal(SPIKES.length, k).flatMap((count, i) => Array.from({ length: count }, (_, j) => {
          const r = 0.45 + ((SPIKES[i][3] - 0.45) * (j + 1)) / count;
          return SPIKES[i].slice(0, 3).map((v) => v * r);
        })),
      },
    ]),
  },
  {
    id: 'fire-ring', name: 'Ring of fire', count: 120, min: 30, tags: 'flames wall burn circle',
    params: [P('flames', 'Flames', 5, 16, 1, 9)],
    gen: (n, p) => curve((t) => {
      const tongue = 1 - Math.abs(Math.sin(Math.round(p.flames) * Math.PI * t)) ** 0.6;
      return [Math.cos(t * TAU), -0.6 + 1.2 * tongue * (0.55 + 0.45 * Math.sin(TAU * (3 * t + 0.2)) ** 2), Math.sin(t * TAU)];
    }, n, true, 2880),
  },
  {
    id: 'black-hole', name: 'Black hole', count: 130, min: 20, tags: 'space void disc jets gravity',
    gen: (n) => mix(n, [
      { weight: 3, gen: (k) => ring(k, 0.34, 0) },
      {
        weight: 6,
        gen: (k) => Array.from({ length: k }, (_, j) => {
          const r = Math.sqrt(0.2 + (0.8 * (j + 0.5)) / k);
          return [r * Math.cos(j * GOLDEN), 0.04 * Math.sin(3 * j * GOLDEN), r * Math.sin(j * GOLDEN)];
        }),
      },
      { weight: 2, gen: (k) => Array.from({ length: k }, (_, j) => [0, (j % 2 ? -1 : 1) * (0.45 + (0.53 * (Math.floor(j / 2) + 0.5)) / Math.ceil(k / 2)), 0]) },
    ]),
  },
  {
    id: 'crown-splash', name: 'Crown splash', count: 110, min: 30, tags: 'water crown drop puddle jump',
    params: [P('arcs', 'Arcs', 5, 12, 1, 8)],
    gen: (n, p) => {
      const k = Math.round(p.arcs);
      const dir = (i) => [Math.cos((TAU * i) / k), Math.sin((TAU * i) / k)];
      return mix(n, [
        { fixed: k, weight: 0, gen: (m) => Array.from({ length: m }, (_, i) => [0.97 * dir(i)[0], 0.97, 0.97 * dir(i)[1]]) },
        {
          weight: 6,
          gen: (m) => equal(k, m).flatMap((count, i) => Array.from({ length: count }, (_, j) => {
            const s = (j + 0.5) / count;
            return [dir(i)[0] * (0.25 + 0.7 * s), -1 + 1.8 * Math.sin((s * Math.PI) / 2), dir(i)[1] * (0.25 + 0.7 * s)];
          })),
        },
        { weight: 1, gen: (m) => ring(m, 0.2, -1) },
        { weight: 2, gen: (m) => ring(m, 0.62, -1, 0.3) },
      ]);
    },
  },
  {
    id: 'thunder-cloud', name: 'Thunder cloud', count: 120, min: 16, tags: 'storm lightning bolt rain weather',
    gen: (n) => mix(n, [{ weight: 7, gen: (k) => blobPoints(CLOUD, k) }, { weight: 2, gen: (k) => some(k, () => pathPoints(BOLT, k)) }]),
  },
];

const SIX = [[-0.6, 0.6, -0.3, 0.3], [0.55, 0.5, 0.4, 0.34], [0.05, 0.1, -0.6, 0.26], [-0.66, -0.2, 0.3, 0.22], [0.62, -0.5, -0.4, 0.34], [-0.2, -0.68, 0.2, 0.28]];
const SEVEN = [[-0.62, 0.62, 0.2, 0.2], [0.1, 0.66, -0.5, 0.16], [0.64, 0.3, 0.4, 0.22], [-0.2, 0.05, 0.6, 0.14], [-0.66, -0.4, -0.4, 0.2], [0.3, -0.36, -0.2, 0.2], [0.62, -0.68, 0.3, 0.16]];
const THREE = [[-0.62, -0.3, 0.2, 0.34, 12], [0, 0.3, -0.2, 0.5, 0], [0.62, -0.3, 0.1, 0.34, -12]];
const turned = (places, turns) => places.map((p, i) => [...p.slice(0, 4), turns[i % turns.length]]);
const floating = (id, name, net, count, tags) => ({ id, name, count, min: net.nodes.length, tags, gen: (n) => netPoints(net, n) });

const FLOATING = [
  floating('floating-diamonds', 'Floating diamonds', floaters('M0,1 L0.62,0.2 L0,-1 L-0.62,0.2 Z M-0.62,0.2 L0.62,0.2', SIX), 100, 'gems jewels crystals loot treasure'),
  floating('question-marks', 'Question marks', floaters('M-0.55,0.45 C-0.55,1.15 0.55,1.15 0.55,0.45 C0.55,-0.05 0,0 0,-0.45 M0,-0.85 L0,-1', THREE), 60, 'confused puzzled what quest ask'),
  floating('exclamation-marks', 'Exclamation marks', floaters('M0,1 L0,-0.35 M0,-0.8 L0,-1', THREE), 45, 'alert warning surprise danger shock'),
  floating('coin-shower', 'Coin shower', floaters('O0,0 1 M0,-0.5 L0,0.5', SIX.map(([x, y, z, size]) => [x, y, z, size * 0.8])), 96, 'money gold rich reward loot coins'),
  floating('floating-flames', 'Floating flames', floaters('M0,1 C0.2,0.4 0.7,0 0.7,-0.4 C0.7,-0.8 0.35,-1 0,-1 C-0.35,-1 -0.7,-0.8 -0.7,-0.4 C-0.7,0 -0.2,0.4 0,1', SIX.map(([x, y, z, size]) => [-x, y, -z, size])), 90, 'wisps fire spirits souls candles drops'),
  floating('shards', 'Shards', floaters('M-0.6,-0.8 L0.9,-0.3 L-0.3,1 Z', turned(SEVEN, [0, 70, 150, 40, 200, 110, 290])), 84, 'glass broken shatter triangles ice pieces'),
  floating('floating-squares', 'Floating squares', floaters('M-1,-1 L1,-1 L1,1 L-1,1 Z', SEVEN.map(([x, y, z, size], i) => [x, y, z, size * (i % 2 ? 0.7 : 1.1)])), 84, 'pixels blocks digital glitch cubes'),
];

// ---------------------------------------------------------------- 3D things

/** Part of a ball's outline as a profile for lathe: 0 degrees is its bottom, 180 its top. */
const ballArc = (cy, r, a0, a1, steps = 14) => Array.from({ length: steps + 1 }, (_, i) => {
  const a = (a0 + ((a1 - a0) * i) / steps) * RAD;
  return [r * Math.sin(a), cy - r * Math.cos(a)];
});
/** Half a ring standing up in the XY plane, as a path. */
const hoop = (cx, cy, rx, ry, a0, a1) => arcPoly(cx, cy, rx, ry, a0, a1).map(([x, y]) => [x, y, 0]);
const turnedPart = (weight, profile, floor = 0) => ({ weight, gen: (k) => lathe(profile, k, floor) });
const pathPart = (weight, path) => ({ weight, gen: (k) => some(k, () => pathPoints(path, k)) });

const PAWN = [[0, -1], [0.5, -1], [0.56, -0.86], [0.36, -0.72], [0.2, -0.3], [0.16, 0.1], [0.34, 0.16], [0.34, 0.24], ...ballArc(0.62, 0.38, 25, 180)];
const BULB = [[0, -1], [0.14, -1], [0.3, -0.9], [0.3, -0.5], ...ballArc(0.3, 0.7, 35, 180)];
const FLASK = [...ballArc(-0.4, 0.6, 0, 155), [0.22, 0.3], [0.22, 0.82], [0.32, 0.88], [0.32, 0.96], [0.18, 1]];
const BALLOON = [...ballArc(0.28, 0.72, 180, 60), [0.06, -0.6], [0.1, -0.66], [0, -0.68], [0, -1]];
const CAKE = [[0.95, -1], [0.95, -0.7], [0.95, -0.4], [0.62, -0.3], [0.62, -0.05], [0.62, 0.2], [0.32, 0.3], [0.32, 0.5], [0.32, 0.7], [0, 0.82], [0, 1]];
const FLAME = Array.from({ length: 25 }, (_, i) => [0.3 * Math.sin((Math.PI * i) / 24) * Math.cos((Math.PI * i) / 48), 0.72 - 0.27 * Math.cos((Math.PI * i) / 24)]);
const PEAR = [[0, -1], [0.3, -0.96], [0.52, -0.8], [0.62, -0.5], [0.58, -0.2], [0.44, 0.1], [0.36, 0.36], [0.3, 0.6], [0.16, 0.76], [0, 0.8], [0, 1]];
const COLUMN = [[0, -1], [0.6, -1], [0.6, -0.88], [0.42, -0.84], [0.4, 0.8], [0.44, 0.84], [0.6, 0.88], [0.6, 1], [0, 1]];
const SOMBRERO = [[1, -0.3], [0.9, -0.42], [0.5, -0.5], [0.36, -0.44], [0.34, 0], [0.24, 0.36], [0, 0.48]];

const THINGS = [
  { id: 'pawn3d', name: '3D chess pawn', count: 100, min: 10, tags: 'game piece board', gen: (n) => lathe(PAWN, n, 0.1) },
  { id: 'bulb3d', name: '3D light bulb', count: 100, min: 10, tags: 'lamp idea glow', gen: (n) => lathe(BULB, n, 0.1) },
  { id: 'flask3d', name: 'Potion flask', count: 100, min: 10, tags: 'bottle magic brew science round', gen: (n) => lathe(FLASK, n, 0.1) },
  { id: 'balloon3d', name: '3D balloon', count: 100, min: 10, tags: 'party birthday float air', gen: (n) => lathe(BALLOON, n, 0.08) },
  { id: 'cake3d', name: '3D cake', count: 120, min: 12, tags: 'birthday wedding tiers party candle', gen: (n) => ringStack(CAKE, n) },
  {
    id: 'lamp3d', name: 'Table lamp', count: 100, min: 12, tags: 'light shade desk bedside',
    gen: (n) => mix(n, [turnedPart(1, [[0, -1], [0.42, -1], [0.42, -0.9], [0.07, -0.84], [0.07, 0.1]], 0.12), turnedPart(3, [[0.78, 0], [0.42, 0.9]])]),
  },
  {
    id: 'bucket3d', name: '3D bucket', count: 100, min: 12, tags: 'pail water sand beach',
    gen: (n) => mix(n, [turnedPart(5, [[0, -1], [0.56, -1], [0.8, 0.3]]), pathPart(1, hoop(0, 0.3, 0.8, 0.69, 0, 180))]),
  },
  {
    id: 'candle3d', name: '3D candle', count: 100, min: 12, tags: 'flame light wax birthday',
    gen: (n) => mix(n, [turnedPart(4, [[0, -1], [0.34, -1], [0.34, 0.3], [0.03, 0.3], [0.03, 0.44]], 0.1), turnedPart(1, FLAME, 0.1)]),
  },
  {
    id: 'bomb3d', name: '3D bomb', count: 110, min: 12, tags: 'explode fuse tnt boom round',
    gen: (n) => mix(n, [
      { weight: 9, gen: (k) => ballPoints(k, 0.73, [0, -0.26, 0]) },
      turnedPart(1, [[0.2, 0.44], [0.2, 0.62], [0, 0.62]]),
      pathPart(1, [[0, 0.64, 0], [0.05, 0.8, 0], [0.18, 0.93, 0], [0.36, 0.99, 0]]),
    ]),
  },
  {
    id: 'lollipop3d', name: '3D lollipop', count: 90, min: 10, tags: 'candy sweet stick sucker',
    gen: (n) => mix(n, [{ weight: 6, gen: (k) => ballPoints(k, 0.49, [0, 0.5, 0]) }, pathPart(1, [[0, -0.04, 0], [0, -1, 0]])]),
  },
  {
    id: 'teacup3d', name: '3D teacup', count: 120, min: 14, tags: 'cup saucer tea coffee drink',
    gen: (n) => mix(n, [
      turnedPart(4, [[0.24, -0.5], [0.3, -0.38], [0.6, -0.1], [0.72, 0.2], [0.74, 0.5]]),
      turnedPart(3, [[0, -0.52], [0.6, -0.52], [0.99, -0.4]]),
      pathPart(1, hoop(0.74, 0.12, 0.24, 0.24, 90, -90)),
    ]),
  },
  {
    id: 'bauble3d', name: '3D bauble', count: 110, min: 12, tags: 'christmas tree ball ornament decoration',
    gen: (n) => mix(n, [
      { weight: 9, gen: (k) => ballPoints(k, 0.79, [0, -0.2, 0]) },
      turnedPart(1, [[0.16, 0.58], [0.16, 0.74], [0, 0.74]]),
      { weight: 1, gen: (k) => Array.from({ length: k }, (_, j) => [0.12 * Math.cos((TAU * j) / k), 0.87 + 0.12 * Math.sin((TAU * j) / k), 0]) },
    ]),
  },
  { id: 'sombrero3d', name: '3D sombrero', count: 110, min: 10, tags: 'hat mexico wide brim', gen: (n) => lathe(SOMBRERO, n) },
];

const GROWN = [
  { id: 'pear3d', name: '3D pear', count: 100, min: 10, tags: 'fruit food', gen: (n) => lathe(PEAR, n, 0.06) },
];

const BUILT = [
  { id: 'column3d', name: 'Column', count: 110, min: 12, tags: 'pillar temple greek roman post', gen: (n) => lathe(COLUMN, n) },
];

export const EXTRA_SHAPES = [
  ...BASIC,
  ...put('basic', 'flat', 'More filled shapes', FILLED),
  ...put('basic', 'flat', 'Lines', LINES),
  ...PATTERNS,
  ...FLAT_CURVES,
  ...put('curves', 'solid', 'More curves in 3D', SPACE_CURVES),
  ...SEALS,
  ...put('effects', 'solid', 'Rings and shields', FIELDS),
  ...put('effects', 'solid', 'Elements', ELEMENTS),
  ...put('effects', 'solid', 'Floating things', FLOATING),
  ...put('solid', 'solid', 'Buildings', BUILT),
  ...put('solid', 'solid', 'Things', THINGS),
  ...put('solid', 'solid', 'Plants and animals', GROWN),
];
