// More flat shapes that are worked out rather than drawn, added when the
// library grew to 3,624 shapes: basic outlines, filled shapes, lines, flat and
// 3D curves, tilings, borders and fractals. The tools are in shape-kit.js.

import {
  TAU, RAD, P, memo, curve, pathPoints, fillPoints, fitBox, dice, smooth,
  parsePath, joinDrawings, placeDrawing, fitDrawing, drawnShape, arcPoly, around, scallop, stamp, fix,
} from './shape-kit.js';
import { loop } from './shapes-curves.js';

const HEART = 'M0,7.4 C1,10 5,10 5,6.6 C5,3.6 1.6,1.6 0,0 |'; // 10 wide, 9.3 high, its tip at 0,0
const heartAt = (x, y, size) => [x, y - 4.65 * size, size];
const polygon = (cx, cy, r, k, first = 90) => `M${Array.from({ length: k }, (_, i) => around(cx, cy, r, first + (360 * i) / k)).join(' L')} Z`;
const star = (cx, cy, out, inn, k = 5, first = 90) => `M${Array.from({ length: 2 * k }, (_, i) => around(cx, cy, i % 2 ? inn : out, first + (180 * i) / k)).join(' L')} Z`;
const picture = (polys, dots = []) => ({ polys, dots });
const put = (cat, group, sub, list) => list.map((s) => Object.assign(s, { cat, group, sub }));
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
/** A gear wheel as a drawing text: `teeth` teeth between the radii `inn` and `out`, the first one turned by `first` degrees. */
function gear(cx, cy, out, inn, teeth, first = 0) {
  const step = 360 / teeth;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = first + i * step;
    pts.push(around(cx, cy, inn, a - step * 0.27), around(cx, cy, out, a - step * 0.16), around(cx, cy, out, a + step * 0.16), around(cx, cy, inn, a + step * 0.27));
  }
  return `M${pts.join(' L')} Z`;
}

// ---------------------------------------------------------------- basic: outlines

const basic = (sub, id, name, draw, extra = {}) => drawnShape({ id, name, cat: 'basic', sub, draw, ...extra });

/** A square with a wavy edge, like a postage stamp. */
function stampEdge() {
  const pts = [];
  for (const [x0, y0, dx, dy] of [[-4, 4, 1, 0], [4, 4, 0, -1], [4, -4, -1, 0], [-4, -4, 0, 1]]) {
    for (let i = 1; i <= 5; i++) pts.push([x0 + 1.6 * i * dx, y0 + 1.6 * i * dy]);
  }
  return `M-4,4 ${pts.map(([x, y]) => `B${fix(x)},${fix(y)} -0.7`).join(' ')}`;
}

const ARCH = 'M-3.5,-5 L-3.5,1.5 A0,1.5 3.5 180 0 L3.5,-5 Z';
const QUARTER = 'M-4,-4 L4,-4 A-4,-4 8 0 90 Z';

const OUTLINES = [
  basic('More outlines', 'quarter-circle', 'Quarter circle', QUARTER, { tags: 'quadrant corner fan slice' }),
  basic('More outlines', 'arch-shape', 'Arch shape', ARCH, { tags: 'door window tunnel gate round top' }),
  basic('More outlines', 'pointed-arch', 'Pointed arch', 'M-3.5,-5 L-3.5,0.4 Q-3.2,3.4 0,5.4 Q3.2,3.4 3.5,0.4 L3.5,-5 Z', { tags: 'gothic church window door' }),
  basic('More outlines', 'tag-shape', 'Tag shape', 'M-5,0 L-2,3 L5,3 L5,-3 L-2,-3 Z O-2.4,0 0.7', { tags: 'label price sale gift' }),
  basic('More outlines', 'pennant', 'Pennant', 'M-5,3 L5,3 L2.6,0 L5,-3 L-5,-3 Z', { tags: 'flag ribbon swallowtail streamer' }),
  basic('More outlines', 'plaque', 'Plaque', 'M-3,5 L3,5 A5,5 2 180 270 L5,-3 A5,-5 2 90 180 L-3,-5 A-5,-5 2 0 90 L-5,3 A-5,5 2 270 360 Z', { tags: 'frame label sign scooped corners badge' }),
  basic('More outlines', 'funnel-shape', 'Funnel shape', 'M-5,4.4 L5,4.4 L1.1,-0.6 L1.1,-5 L-1.1,-5 L-1.1,-0.6 Z', { tags: 'filter pour cone' }),
  basic('More outlines', 'barrel-shape', 'Barrel shape', 'M-3,5 L3,5 Q5.4,0 3,-5 L-3,-5 Q-5.4,0 -3,5 Z', { tags: 'bulge keg cask rounded sides' }),
  basic('More outlines', 'curved-square', 'Curved square', 'M-5,5 Q0,2.6 5,5 Q2.6,0 5,-5 Q0,-2.6 -5,-5 Q-2.6,0 -5,5 Z', { tags: 'pinched concave pillow cushion star' }),
  basic('More outlines', 'stamp-shape', 'Stamp shape', stampEdge, { tags: 'postage wavy edge scalloped square cookie' }),
  basic('Shapes in shapes', 'circle-in-hexagon', 'Circle in a hexagon', () => `${polygon(0, 0, 5, 6, 0)} O0,0 2.6`, { tags: 'nut bolt ring' }),
  basic('Shapes in shapes', 'star-in-pentagon', 'Star in a pentagon', () => {
    const v = Array.from({ length: 5 }, (_, i) => around(0, 0, 5, 90 + 72 * i));
    return `${polygon(0, 0, 5, 5)} M${v[0]} L${v[2]} L${v[4]} L${v[1]} L${v[3]} Z`;
  }, { tags: 'pentagram five diagonals' }),
  basic('Shapes in shapes', 'star-in-hexagon', 'Star in a hexagon', () => `${polygon(0, 0, 5, 6)} ${polygon(0, 0, 5, 3)} ${polygon(0, 0, 5, 3, 270)}`, { tags: 'hexagram six two triangles' }),
  basic('Shapes in shapes', 'flat-cube', 'Flat cube', () => `${polygon(0, 0, 5, 6)} M0,0 L${around(0, 0, 5, 30)} M0,0 L${around(0, 0, 5, 150)} M0,0 L${around(0, 0, 5, 270)}`, {
    tags: 'box block isometric hexagon drawing',
  }),
  basic('Shapes in shapes', 'heart-in-square', 'Heart in a square', () => joinDrawings(parsePath('M-5,-5 L5,-5 L5,5 L-5,5 Z'), stamp(HEART, [heartAt(0, 0, 0.62)])), { tags: 'love tile card box' }),
  basic('Shapes in shapes', 'star-in-square', 'Star in a square', () => `M-5,-5 L5,-5 L5,5 L-5,5 Z ${star(0, -0.3, 3.9, 1.6)}`, { tags: 'tile box badge favourite' }),
  basic('Shapes in shapes', 'four-circles', 'Four circles', 'O-2.2,2.2 2.8 O2.2,2.2 2.8 O-2.2,-2.2 2.8 O2.2,-2.2 2.8', { tags: 'rings overlap clover venn' }),
  basic('Shapes in shapes', 'pie-chart', 'Pie chart', () => `O0,0 5 M0,0 L0,5 M0,0 L${around(0, 0, 5, -30)} M0,0 L${around(0, 0, 5, 200)}`, { tags: 'graph slices share data parts' }),
  basic('Shapes in shapes', 'four-squares', 'Four squares', 'M-5,-5 L5,-5 L5,5 L-5,5 Z M0,-5 L0,5 M-5,0 L5,0', { tags: 'window grid quarters panes' }),
  basic('Shapes in shapes', 'two-squares', 'Two squares', 'M-5,-1 L1,-1 L1,5 L-5,5 Z M-1,-5 L5,-5 L5,1 L-1,1 Z', { tags: 'overlap copy layers' }),
  basic('Shapes in shapes', 'split-triangle', 'Split triangle', 'M0,5 L4.3301,-2.5 L-4.3301,-2.5 Z M0,5 L0,-2.5 M4.3301,-2.5 L-2.165,1.25 M-4.3301,-2.5 L2.165,1.25', { tags: 'medians centre six parts' }),
  basic('Lines', 'number-line', 'Number line', () => `M-6,0 L6,0 M-5.2,0.8 L-6,0 L-5.2,-0.8 M5.2,0.8 L6,0 L5.2,-0.8 ${[-4, -2, 0, 2, 4].map((x) => `M${x},${x ? 1 : 1.7} L${x},${x ? -1 : -1.7}`).join(' ')}`, {
    tags: 'axis scale ticks maths measure count',
  }),
  basic('Lines', 's-curve', 'S curve', 'M-5,-3 C0,-3 0,3 5,3', { tags: 'ease bend swoosh slide' }),
  basic('Lines', 'line-fan', 'Line fan', () => [30, 50, 70, 90, 110, 130, 150].map((a) => `M0,0 L${around(0, 0, 9, a)}`).join(' '), { tags: 'spread beams rays corner sunrise' }),
  basic('Lines', 'looping-line', 'Looping line', 'M-5,-2 C-1,-2 2.4,-1.6 2.4,1 C2.4,3.6 -2.4,3.6 -2.4,1 C-2.4,-1.6 1,-2 5,-2', { tags: 'loop the loop curl flight path' }),
];

// ---------------------------------------------------------------- basic: filled shapes
//
// A drawing filled with particles in tidy rows. Every closed stroke is an
// outline; an outline inside another one is a hole in it.

function filled(id, name, d, tags, count = 90) {
  let outlines = null;
  const get = () => {
    if (!outlines) outlines = fitDrawing(parsePath(typeof d === 'function' ? d() : d)).polys;
    return outlines;
  };
  return { id: `fill-${id}`, name: `Filled ${name}`, count, min: 8, tags, gen: (n) => fillPoints(get(), n) };
}

const FILLED = [
  filled('right-triangle', 'right triangle', 'M-4.5,-4 L4.5,-4 L-4.5,4.5 Z', 'corner ramp slope wedge', 60),
  filled('parallelogram', 'parallelogram', 'M-5,-2.6 L2.4,-2.6 L5,2.6 L-2.4,2.6 Z', 'slanted leaning rectangle', 60),
  filled('chevron', 'chevron', 'M-5,1 L0,5 L5,1 L5,-2.6 L0,1.4 L-5,-2.6 Z', 'arrow rank stripe up', 60),
  filled('shield', 'shield', 'M-4,5 L4,5 L4,0 C4,-2.6 2,-4.2 0,-5 C-2,-4.2 -4,-2.6 -4,0 Z', 'defend guard crest badge', 70),
  filled('leaf', 'leaf', 'M0,5 C4,3 4,-2 0,-5 C-4,-2 -4,3 0,5 Z', 'lens eye petal almond', 60),
  filled('speech-bubble', 'speech bubble', 'M-4,4 L4,4 Q5,4 5,3 L5,-1 Q5,-2 4,-2 L-0.5,-2 L-3,-5 L-2.6,-2 L-4,-2 Q-5,-2 -5,-1 L-5,3 Q-5,4 -4,4 Z', 'talk chat say message', 70),
  filled('keyhole', 'keyhole', 'M-1.2,0.6 L-2.4,-5 L2.4,-5 L1.2,0.6 A0,2.4 2.2 -55 235 Z', 'lock door secret', 60),
  filled('gear', 'gear', () => `${gear(0, 0, 5, 3.9, 8)} O0,0 1.7`, 'cog wheel settings machine', 100),
  filled('burst', 'burst', () => star(0, 0, 5, 3.3, 12), 'spiky bang pow explosion sticker', 90),
  filled('arch', 'arch', ARCH, 'door window tunnel gate', 70),
  filled('quarter-circle', 'quarter circle', QUARTER, 'quadrant corner fan slice', 60),
  filled('kite', 'kite', 'M0,5 L3.4,1.6 L0,-5 L-3.4,1.6 Z', 'diamond deltoid', 50),
  filled('bow-tie', 'bow tie', 'M-4.5,4 L0,0.7 L4.5,4 L4.5,-4 L0,-0.7 L-4.5,-4 Z', 'hourglass two triangles ribbon', 60),
  filled('frame', 'frame', 'M-5,-5 L5,-5 L5,5 L-5,5 Z M-2.8,-2.8 L2.8,-2.8 L2.8,2.8 L-2.8,2.8 Z', 'square ring border hollow box', 96),
  filled('crown', 'crown', 'M-5,-3.5 L5,-3.5 L5,4 L2.5,0.5 L0,4.5 L-2.5,0.5 L-5,4 Z', 'king queen royal', 70),
  filled('cross', 'cross', 'M-1.3,5 L1.3,5 L1.3,2 L4,2 L4,-0.6 L1.3,-0.6 L1.3,-5 L-1.3,-5 L-1.3,-0.6 L-4,-0.6 L-4,2 L-1.3,2 Z', 'church grave holy', 60),
  filled('x', 'X', 'M-5,3.4 L-3.4,5 L0,1.6 L3.4,5 L5,3.4 L1.6,0 L5,-3.4 L3.4,-5 L0,-1.6 L-3.4,-5 L-5,-3.4 L-1.6,0 Z', 'wrong no cancel close times', 70),
  filled('spade', 'spade', 'M0,5 C2,3 4.8,1 4.8,-1.2 C4.8,-3 3.4,-3.8 2.3,-3.8 C1.5,-3.8 0.9,-3.4 0.5,-2.8 L1.6,-5 L-1.6,-5 L-0.5,-2.8 C-0.9,-3.4 -1.5,-3.8 -2.3,-3.8 C-3.4,-3.8 -4.8,-3 -4.8,-1.2 C-4.8,1 -2,3 0,5 Z', 'card suit', 70),
  filled('smiley', 'smiley', 'O0,0 5 N E-1.8,1.5 0.8,1.1 0 360 N E1.8,1.5 0.8,1.1 0 360 M-3,-0.8 Q0,-4.8 3,-0.8 Q0,-2.4 -3,-0.8 Z', 'happy face smile emoji', 120),
  filled('skull', 'skull', 'M0,5 C3.6,5 4.6,2.6 4.6,0.6 C4.6,-1 3.8,-2 2.8,-2.4 L2.8,-4.6 L-2.8,-4.6 L-2.8,-2.4 C-3.8,-2 -4.6,-1 -4.6,0.6 C-4.6,2.6 -3.6,5 0,5 Z O-1.9,0.5 1.25 O1.9,0.5 1.25 M0,-0.9 L0.7,-2.2 L-0.7,-2.2 Z', 'death danger pirate bones', 120),
  filled('ghost', 'ghost', 'M-4,-4.6 L-4,1 A0,1 4 180 0 L4,-4.6 L2.667,-3.2 L1.333,-4.6 L0,-3.2 L-1.333,-4.6 L-2.667,-3.2 Z N E-1.5,1.4 0.85,1.2 0 360 N E1.5,1.4 0.85,1.2 0 360', 'halloween spooky boo', 110),
  filled('bat', 'bat', 'M0,2.2 L0.9,3.6 L1.4,2.3 C2.6,3.4 4,3.8 5,3.4 Q5.2,1.2 4.4,-0.4 Q3.6,0.8 2.6,-1.6 Q1.9,-0.2 1,-2.2 L0,-3.4 |', 'halloween vampire night wings', 100),
  filled('cat', 'cat head', 'M-4,4.6 L-2.2,2.6 C-1,3.2 1,3.2 2.2,2.6 L4,4.6 L4.2,0 C4.2,-3 2.4,-4.4 0,-4.4 C-2.4,-4.4 -4.2,-3 -4.2,0 Z N E-1.7,0 0.85,1 0 360 N E1.7,0 0.85,1 0 360', 'kitten pet face ears', 110),
  filled('eye', 'eye', 'M-5,0 Q0,4.8 5,0 Q0,-4.8 -5,0 Z O0,0 2.1 O0,0 0.9', 'look see watch vision', 100),
  filled('fish', 'fish', 'M-5,0 C-3,3.4 1,3 2.6,0.6 L5,2.8 L5,-2.8 L2.6,-0.6 C1,-3 -3,-3.4 -5,0 Z O-2.8,0.6 0.7', 'sea swim tail', 90),
  filled('tree', 'tree', 'M0,5 L2.6,2 L1.4,2 L3.6,-1 L2.2,-1 L4.6,-3.6 L0.8,-3.6 L0.8,-5 L-0.8,-5 L-0.8,-3.6 L-4.6,-3.6 L-2.2,-1 L-3.6,-1 L-1.4,2 L-2.6,2 Z', 'pine fir christmas forest', 90),
  filled('paw', 'paw', 'M0,0.4 C2.2,0.4 3.6,-1.4 3.6,-2.8 C3.6,-4.2 2.2,-4.6 0,-3.8 C-2.2,-4.6 -3.6,-4.2 -3.6,-2.8 C-3.6,-1.4 -2.2,0.4 0,0.4 Z N E-3.6,1.6 1,1.4 0 360 N E-1.3,3.4 1,1.5 0 360 N E1.3,3.4 1,1.5 0 360 N E3.6,1.6 1,1.4 0 360', 'dog cat print animal track', 90),
  filled('mushroom', 'mushroom', 'M-5,0 C-5,6.6 5,6.6 5,0 L1.4,0 L1.8,-5 L-1.8,-5 L-1.4,0 Z O-2.2,2 0.9 O1.6,2.8 0.9', 'toadstool fungus spots', 100),
  filled('castle', 'castle', 'M-5,-5 L-5,5 L-3.6,5 L-3.6,3.6 L-2.2,3.6 L-2.2,5 L-0.7,5 L-0.7,3.6 L0.7,3.6 L0.7,5 L2.2,5 L2.2,3.6 L3.6,3.6 L3.6,5 L5,5 L5,-5 L1.4,-5 L1.4,-2 A0,-2 1.4 0 180 L-1.4,-5 Z', 'tower wall fort gate battlements', 110),
  filled('pumpkin', 'pumpkin', 'N E0,-0.4 5,4.2 0 360 M-0.6,3.8 L0.6,3.8 L0.6,5 L-0.6,5 Z M-3,0.2 L-1,0.2 L-2,1.9 Z M3,0.2 L1,0.2 L2,1.9 Z M-3.2,-1.4 L-2,-1.4 L-1.2,-2.2 L-0.4,-1.4 L0.4,-1.4 L1.2,-2.2 L2,-1.4 L3.2,-1.4 L2,-3.4 L-2,-3.4 Z', 'halloween jack lantern face', 120),
  filled('flame', 'flame', 'M0,5 C0.4,2.6 3.6,1.2 3.6,-1.8 C3.6,-3.8 2,-5 0,-5 C-2,-5 -3.6,-3.8 -3.6,-1.8 C-3.6,-0.6 -3,0.4 -2.2,1.2 C-2,0.2 -1.6,-0.4 -1,-0.6 C-1.2,1.6 -0.6,3.6 0,5 Z', 'fire burn hot torch', 70),
];

// ---------------------------------------------------------------- curves

const flatCurve = (id, name, draw, extra = {}) => drawnShape({ id, name, cat: 'curves', sub: 'More flat curves', draw, ...extra });
/** An open flat curve t -> [x, y] between t0 and t1. */
const strand = (fn, t0, t1, samples = 240) => Array.from({ length: samples + 1 }, (_, i) => fn(t0 + ((t1 - t0) * i) / samples));

/** The parts of a line of points that are inside the box of half-size `reach`, cut off cleanly at its edge. */
function inside(pts, reach) {
  const ok = ([x, y]) => Math.abs(x) <= reach && Math.abs(y) <= reach && Number.isFinite(x) && Number.isFinite(y);
  const edge = (a, b) => { // from a (inside) towards b (outside): the point on the edge of the box
    let [lo, hi] = [0, 1];
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (ok([a[0] + (b[0] - a[0]) * mid, a[1] + (b[1] - a[1]) * mid])) lo = mid;
      else hi = mid;
    }
    return [a[0] + (b[0] - a[0]) * lo, a[1] + (b[1] - a[1]) * lo];
  };
  const out = [];
  let cur = [];
  pts.forEach((p, i) => {
    if (ok(p)) {
      if (!cur.length && i > 0 && pts[i - 1].every(Number.isFinite)) cur.push(edge(p, pts[i - 1]));
      cur.push(p);
    } else if (cur.length) {
      if (p.every(Number.isFinite)) cur.push(edge(cur[cur.length - 1], p));
      if (cur.length > 1) out.push(cur);
      cur = [];
    }
  });
  if (cur.length > 1) out.push(cur);
  return out;
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function devilsCurve() {
  // y^2 (y^2 - 96) = x^2 (x^2 - 100), written as r^2 = (96 s^2 - 100 c^2) / (s^2 - c^2)
  const r = (a) => Math.sqrt(Math.max(0, (96 * Math.sin(a) ** 2 - 100 * Math.cos(a) ** 2) / (Math.sin(a) ** 2 - Math.cos(a) ** 2)));
  const start = Math.atan(Math.sqrt(100 / 96));
  const top = strand((a) => [r(a) * Math.cos(a), r(a) * Math.sin(a)], start, Math.PI - start, 120);
  top[0] = [0, 0];
  top[top.length - 1] = [0, 0];
  let [lo, hi] = [0, Math.PI / 4 - 1e-6]; // where the side branch reaches the edge of the picture
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (r(mid) < 17) lo = mid;
    else hi = mid;
  }
  const side = strand((a) => [r(a) * Math.cos(a), r(a) * Math.sin(a)], -lo, lo, 80);
  return picture([top, top.map(([x, y]) => [x, -y]), side, side.map(([x, y]) => [-x, y])]);
}

/** A smooth doodle through points that look random but are the same every time. */
function scribble() {
  const next = dice(41);
  const pts = Array.from({ length: 14 }, (_, i) => {
    const a = i * 2.4 + next() * 1.2;
    const r = 0.35 + 0.65 * next();
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  return picture([smooth(pts, 10)]);
}

function rootSpiral() {
  const polys = [];
  const rim = [[1, 0]];
  let angle = 0;
  for (let k = 1; k <= 16; k++) {
    angle += Math.atan(1 / Math.sqrt(k));
    rim.push([Math.sqrt(k + 1) * Math.cos(angle), Math.sqrt(k + 1) * Math.sin(angle)]);
  }
  polys.push(rim);
  for (const p of rim) polys.push([[0, 0], p]);
  return picture(polys);
}

const FLAT_CURVES = [
  flatCurve('cissoid', 'Cissoid', () => picture([strand((t) => [(2 * t ** 3) / (1 + t * t), (2 * t * t) / (1 + t * t)], -1.9, 1.9)]), { tags: 'cusp point ivy horn diocles', count: 60 }),
  flatCurve('conchoid', 'Conchoid', () => picture([
    ...inside(strand((a) => [1 + 2 * Math.cos(a), Math.tan(a) + 2 * Math.sin(a)], -1.45, 1.45, 400), 3.4),
    ...inside(strand((a) => [1 - 2 * Math.cos(a), Math.tan(a) - 2 * Math.sin(a)], -1.45, 1.45, 400), 3.4),
  ]), { tags: 'shell loop branch nicomedes', count: 90 }),
  flatCurve('folium', 'Folium', () => picture(inside(strand((a) => {
    const r = (3 * Math.sin(a) * Math.cos(a)) / (Math.sin(a) ** 3 + Math.cos(a) ** 3);
    return [r * Math.cos(a), r * Math.sin(a)];
  }, -Math.PI / 4 + 0.05, (3 * Math.PI) / 4 - 0.05, 600), 2.6)), { tags: 'leaf loop knot descartes ribbon', count: 80 }),
  flatCurve('lituus', 'Lituus', () => picture([strand((a) => [Math.cos(a) / Math.sqrt(a), Math.sin(a) / Math.sqrt(a)], 0.14, 7 * Math.PI, 600)]), { tags: 'spiral crook staff tail trumpet', count: 80 }),
  flatCurve('tractrix', 'Tractrix', () => picture([strand((t) => [t - Math.tanh(t), 1 / Math.cosh(t)], -3.4, 3.4)]), { tags: 'spike peak tent pull horn', count: 60 }),
  flatCurve('bicorn', 'Bicorn', () => loop((t) => {
    const a = t * TAU;
    return [Math.sin(a), (Math.cos(a) ** 2 * (2 + Math.cos(a))) / (3 + Math.sin(a) ** 2)];
  }), { tags: 'cocked hat two horns moon', count: 60 }),
  flatCurve('tschirnhausen', 'Tschirnhausen cubic', () => picture([strand((t) => [1 - 3 * t * t, t * (3 - t * t)], -2.25, 2.25)]), { tags: 'alpha loop ribbon fish awareness', count: 70 }),
  flatCurve('devil-curve', 'Devil curve', devilsCurve, { tags: 'diabolo figure eight motor cross', count: 120 }),
  flatCurve('cochleoid', 'Cochleoid', () => picture([strand((a) => (Math.abs(a) < 1e-9 ? [1, 0] : [(Math.sin(a) * Math.cos(a)) / a, (Math.sin(a) * Math.sin(a)) / a]), -3 * Math.PI, 3 * Math.PI, 720)]), {
    tags: 'snail loops shell nested', count: 90,
  }),
  flatCurve('tangent-curve', 'Tangent curve', () => picture([-1, 0, 1].flatMap((k) => inside(strand((x) => [x + k * Math.PI, Math.tan(x)], -1.5, 1.5, 300), 5))), {
    tags: 'tan graph trigonometry branches', count: 80,
  }),
  flatCurve('standing-wave', 'Standing wave', (p) => {
    const k = Math.round(p.loops);
    return picture([1, -1].map((side) => strand((x) => [x, side * 0.9 * Math.sin((k * Math.PI * x) / 6)], 0, 6, 60 * k)));
  }, { params: [P('loops', 'Loops', 1, 6, 1, 3)], tags: 'string vibration nodes sound lens chain', count: 80 }),
  flatCurve('epispiral', 'Epispiral', (p) => {
    const k = Math.round(p.arms);
    return picture(Array.from({ length: k % 2 ? k : 2 * k }, (_, i) => {
      const mid = ((k % 2 ? 2 : 1) * Math.PI * i) / k;
      return strand((a) => [Math.cos(mid + a) / Math.cos(k * a), Math.sin(mid + a) / Math.cos(k * a)], -Math.acos(1 / 3) / k, Math.acos(1 / 3) / k, 40);
    }));
  }, { params: [P('arms', 'Arms', 2, 6, 1, 3)], tags: 'star branches hyperbolas flower', count: 96 }),
  flatCurve('root-spiral', 'Root spiral', rootSpiral, { tags: 'theodorus triangles square roots snail pythagoras fan', count: 130 }),
  flatCurve('magnetic-field', 'Magnetic field', () => {
    const arcs = [0.7, 1.7, 3.4].flatMap((c) => {
      const reach = Math.atan2(1, c) / RAD; // the angle at which the circle around (c, 0) passes the poles
      return [1, -1].map((side) => arcPoly(side * c, 0, Math.hypot(c, 1), Math.hypot(c, 1), 180 - reach, -180 + reach).map(([x, y]) => [side > 0 ? x : 2 * side * c - x, y]));
    });
    return picture([rect(-0.4, -1, 0.4, 1), [[0, 1], [0, 3.2]], [[0, -1], [0, -3.2]], ...arcs]);
  }, { tags: 'magnet lines poles dipole physics force', count: 120 }),
  flatCurve('ellipse-flower', 'Ellipse flower', (p) => {
    const k = Math.round(p.ovals);
    return picture(Array.from({ length: k }, (_, i) => arcPoly(0, 0, 1, 0.36, 0, 360).map(([x, y]) => {
      const [c, s] = [Math.cos((Math.PI * i) / k), Math.sin((Math.PI * i) / k)];
      return [x * c - y * s, x * s + y * c];
    })));
  }, { params: [P('ovals', 'Ovals', 2, 6, 1, 4)], tags: 'atom orbits petals rosette', count: 120 }),
  flatCurve('circle-spiral', 'Circle spiral', () => picture(Array.from({ length: 12 }, (_, i) => {
    const r = 0.5 * 1.21 ** i;
    return arcPoly(r * Math.cos(i * 0.72), r * Math.sin(i * 0.72), 0.3 * r, 0.3 * r, 0, 360);
  })), { tags: 'bubbles growing swirl beads snail', count: 130 }),
  flatCurve('fourier-wave', 'Fourier wave', (p) => picture([strand((x) => {
    let y = 0;
    for (let k = 0; k < Math.round(p.terms); k++) y += Math.sin((2 * k + 1) * x) / (2 * k + 1);
    return [x, y];
  }, 0, 2 * TAU, 480)]), { params: [P('terms', 'Terms', 1, 5, 1, 3)], tags: 'square wave harmonics ripple signal sum', count: 100 }),
  flatCurve('woven-rose', 'Woven rose', (p) => {
    const g = gcd(Math.round(p.up), Math.round(p.down));
    const [up, down] = [Math.round(p.up) / g, Math.round(p.down) / g];
    const turns = (up * down) % 2 ? down / 2 : down; // how many times round before the curve closes
    return loop((t) => {
      const a = t * turns * TAU;
      const r = Math.cos((up * a) / down);
      return [r * Math.cos(a), r * Math.sin(a)];
    }, 360 * down);
  }, { params: [P('up', 'Petals', 1, 7, 1, 5), P('down', 'Weave', 2, 4, 1, 3)], tags: 'rose overlapping petals rosette flower rational', count: 130 }),
  flatCurve('scribble', 'Scribble', scribble, { tags: 'doodle messy tangle squiggle scrawl', count: 110 }),
];

// ---------------------------------------------------------------- curves in 3D

/** A path through space worked out step by step: where a point goes when it is pushed along by `flow`. */
function orbit(flow, start, dt, skip, steps) {
  let p = start;
  const add = (a, b, f) => a.map((v, i) => v + b[i] * f);
  const out = [];
  for (let i = 0; i < skip + steps; i++) {
    const k1 = flow(p);
    const k2 = flow(add(p, k1, dt / 2));
    const k3 = flow(add(p, k2, dt / 2));
    const k4 = flow(add(p, k3, dt));
    p = p.map((v, c) => v + (dt * (k1[c] + 2 * k2[c] + 2 * k3[c] + k4[c])) / 6);
    if (i >= skip) out.push(p);
  }
  // centred and fitted in the box
  const lo = [0, 1, 2].map((c) => Math.min(...out.map((q) => q[c])));
  const hi = [0, 1, 2].map((c) => Math.max(...out.map((q) => q[c])));
  const half = Math.max(...hi.map((v, c) => v - lo[c])) / 2;
  return out.map((q) => q.map((v, c) => (v - (lo[c] + hi[c]) / 2) / (half * 1.001)));
}
const lazy = (make) => {
  let made = null;
  return () => (made ||= make());
};

const ROSSLER = lazy(() => orbit(([x, y, z]) => [-y - z, x + 0.2 * y, 0.2 + z * (x - 5.7)], [1, 1, 0], 0.02, 3000, 1500).map(([x, y, z]) => [x, z, y]));
const AIZAWA = lazy(() => orbit(([x, y, z]) => [
  (z - 0.7) * x - 3.5 * y, 3.5 * x + (z - 0.7) * y, 0.6 + 0.95 * z - z ** 3 / 3 - (x * x + y * y) * (1 + 0.25 * z) + 0.1 * z * x ** 3,
], [0.1, 0, 0], 0.01, 2000, 1500).map(([x, y, z]) => [x, z, y]));
const THOMAS = lazy(() => orbit(([x, y, z]) => [Math.sin(y) - 0.208186 * x, Math.sin(z) - 0.208186 * y, Math.sin(x) - 0.208186 * z], [1.1, 1.1, -0.01], 0.05, 2000, 900));

const split = (parts, n) => Array.from({ length: parts }, (_, i) => Math.floor(n / parts) + (i < n % parts ? 1 : 0));

const SPACE_CURVES = [
  {
    id: 'plait3d', name: 'Plait', count: 120, min: 18, tags: 'braid hair rope three strands woven pigtail',
    params: [P('turns', 'Turns', 1, 4, 1, 2)],
    gen: (n, p) => split(3, n).flatMap((k, i) => curve((t) => {
      const a = Math.round(p.turns) * TAU * t + (TAU * i) / 3;
      return [0.4 * Math.sin(a), 1 - 2 * t, 0.12 * Math.sin(2 * a)];
    }, k, false, 600)),
  },
  {
    id: 'chain3d', name: '3D chain', count: 120, min: 24, tags: 'links metal anchor prison necklace',
    params: [P('links', 'Links', 3, 9, 1, 5)],
    gen: (n, p) => {
      const k = Math.round(p.links);
      const step = 2 / (k + 0.44);
      return split(k, n).flatMap((count, i) => curve((t) => {
        const x = (i - (k - 1) / 2) * step + 0.72 * step * Math.cos(t * TAU);
        const across = 0.45 * step * Math.sin(t * TAU);
        return i % 2 ? [x, 0, across] : [x, across, 0];
      }, count, true, 240));
    },
  },
  { id: 'rossler', name: 'Rössler attractor', count: 150, min: 30, tags: 'chaos spiral band strange physics', gen: (n) => pathPoints(ROSSLER(), n) },
  { id: 'aizawa', name: 'Aizawa attractor', count: 160, min: 30, tags: 'chaos ball tube strange apple', gen: (n) => pathPoints(AIZAWA(), n) },
  { id: 'thomas', name: 'Thomas attractor', count: 160, min: 30, tags: 'chaos tangle strange loops cube', gen: (n) => pathPoints(THOMAS(), n) },
  {
    id: 'solomon-link', name: 'Solomon link', count: 120, min: 16, tags: 'two rings linked twice knot double woven',
    gen: (n) => split(2, n).flatMap((k, i) => curve((t) => {
      const a = t * TAU;
      const r = 0.69 + 0.3 * Math.cos(2 * a + i * Math.PI);
      return [r * Math.cos(a), 0.3 * Math.sin(2 * a + i * Math.PI), r * Math.sin(a)];
    }, k, true, 480)),
  },
];

// ---------------------------------------------------------------- patterns: tilings

const pattern = (sub, id, name, draw, extra = {}) => drawnShape({ id, name, cat: 'patterns', sub, draw, ...extra });

/** The part of a rectangle that is inside the window from (0, 0) to (w, h), as an outline; null if nothing is. */
function window(x0, y0, x1, y1, w, h) {
  const [a, b, c, d] = [Math.max(0, x0), Math.max(0, y0), Math.min(w, x1), Math.min(h, y1)];
  return c - a > 1e-9 && d - b > 1e-9 ? rect(a, b, c, d) : null;
}

function herringbone() {
  const polys = [];
  for (let m = -6; m <= 8; m++) {
    for (let n = -5; n <= 5; n++) {
      const [x, y] = [m + 2 * n, m - 2 * n];
      polys.push(window(x, y, x + 1, y + 2, 6, 6), window(x + 1, y, x + 3, y + 1, 6, 6));
    }
  }
  return picture(polys.filter(Boolean));
}

function hopscotch() {
  const polys = [];
  for (let m = -3; m <= 5; m++) {
    for (let n = -3; n <= 5; n++) {
      const [x, y] = [2 * m - n, m + 2 * n];
      polys.push(window(x, y, x + 2, y + 2, 7, 7), window(x + 2, y, x + 3, y + 1, 7, 7));
    }
  }
  return picture(polys.filter(Boolean));
}

function cairo() {
  const a = (Math.sqrt(3) - 1) / 2;
  const polys = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const [cx, cy] = [i + 0.5, j + 0.5];
      if ((i + j) % 2) polys.push([[i, j + 1], [cx, cy + a], [i + 1, j + 1]], [[cx, cy + a], [cx, cy - a]], [[i, j], [cx, cy - a], [i + 1, j]]);
      else polys.push([[i, j], [cx - a, cy], [i, j + 1]], [[cx - a, cy], [cx + a, cy]], [[i + 1, j], [cx + a, cy], [i + 1, j + 1]]);
    }
  }
  return picture(polys);
}

function snubSquare() {
  const gap = (1 + Math.sqrt(3)) / 2;
  const r = Math.SQRT1_2;
  const at = (cx, cy, deg) => [cx + r * Math.cos(deg * RAD), cy + r * Math.sin(deg * RAD)];
  const polys = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const [cx, cy] = [i * gap, j * gap];
      const first = (i + j) % 2 ? 75 : 15;
      polys.push([0, 1, 2, 3, 4].map((k) => at(cx, cy, first + 90 * k)));
      if ((i + j) % 2) continue;
      // the side of a triangle between this square and each neighbour that is there
      [[1, 0, 285, 255], [0, 1, 15, 345], [-1, 0, 105, 75], [0, -1, 195, 165]].forEach(([di, dj, mine, theirs]) => {
        if (i + di >= 0 && i + di < 4 && j + dj >= 0 && j + dj < 4) polys.push([at(cx, cy, mine), at(cx + di * gap, cy + dj * gap, theirs)]);
      });
    }
  }
  return picture(polys);
}

/** Penrose's tiling with two kinds of diamond, made by cutting triangles up again and again. */
function penrose(rounds) {
  const phi = (1 + Math.sqrt(5)) / 2;
  const mixed = (a, b) => [a[0] + (b[0] - a[0]) / phi, a[1] + (b[1] - a[1]) / phi];
  let tris = Array.from({ length: 10 }, (_, i) => {
    const b = [Math.cos(((2 * i - 1) * Math.PI) / 10), Math.sin(((2 * i - 1) * Math.PI) / 10)];
    const c = [Math.cos(((2 * i + 1) * Math.PI) / 10), Math.sin(((2 * i + 1) * Math.PI) / 10)];
    return i % 2 ? [0, [0, 0], b, c] : [0, [0, 0], c, b];
  });
  for (let round = 0; round < rounds; round++) {
    tris = tris.flatMap(([kind, a, b, c]) => {
      if (kind === 0) {
        const p = mixed(a, b);
        return [[0, c, p, b], [1, p, c, a]];
      }
      const q = mixed(b, a);
      const s = mixed(b, c);
      return [[1, s, c, a], [1, q, s, b], [0, s, q, a]];
    });
  }
  const seen = new Set();
  const polys = [];
  for (const [, a, b, c] of tris) {
    for (const [p, q] of [[a, b], [a, c]]) {
      const key = [p, q].map(([x, y]) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)}`).sort().join(' ');
      if (seen.has(key)) continue;
      seen.add(key);
      polys.push([p, q]);
    }
  }
  return picture(polys);
}

/** Cells around scattered points: every spot belongs to the point it is nearest to. */
function cobblestones() {
  const next = dice(23);
  let seeds = Array.from({ length: 13 }, () => [2 * next() - 1, 2 * next() - 1]);
  const cellOf = (i) => {
    let cell = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    seeds.forEach((other, j) => {
      if (j === i || cell.length < 3) return;
      // keep the side of the middle line between the two points that is nearer to this one
      const [mx, my] = [(seeds[i][0] + other[0]) / 2, (seeds[i][1] + other[1]) / 2];
      const [nx, ny] = [other[0] - seeds[i][0], other[1] - seeds[i][1]];
      const side = ([x, y]) => (x - mx) * nx + (y - my) * ny;
      const cut = [];
      cell.forEach((p, k) => {
        const q = cell[(k + 1) % cell.length];
        const [sp, sq] = [side(p), side(q)];
        if (sp <= 0) cut.push(p);
        if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) cut.push([p[0] + ((q[0] - p[0]) * sp) / (sp - sq), p[1] + ((q[1] - p[1]) * sp) / (sp - sq)]);
      });
      cell = cut;
    });
    return cell;
  };
  // two rounds of moving every point to the middle of its cell make the cells more even
  for (let round = 0; round < 2; round++) {
    seeds = seeds.map((_, i) => {
      const cell = cellOf(i);
      return [cell.reduce((s, p) => s + p[0], 0) / cell.length, cell.reduce((s, p) => s + p[1], 0) / cell.length];
    });
  }
  return picture(seeds.map((_, i) => {
    const cell = cellOf(i);
    return [...cell, cell[0]];
  }));
}

function asanoha() {
  const seen = new Set();
  const polys = [];
  const line = (p, q) => {
    const key = [p, q].map(([x, y]) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)}`).sort().join(' ');
    if (seen.has(key)) return;
    seen.add(key);
    polys.push([p, q]);
  };
  const at = (i, j) => [i + j / 2, (j * Math.sqrt(3)) / 2];
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      for (const tri of [[at(i, j), at(i + 1, j), at(i, j + 1)], [at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]]) {
        const mid = [(tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3];
        if (Math.hypot(...mid) > 0.6) continue; // the six triangles around the middle: one leaf
        tri.forEach((p, k) => {
          line(p, tri[(k + 1) % 3]);
          line(p, mid);
        });
      }
    }
  }
  return picture(polys);
}

const CROSS_STITCH = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
const TETROMINOES = ['aabbcd', 'abbccd', 'aeffcd', 'eeffgd', 'ehgggi', 'hhhiii'];

function tetrominoes() {
  const polys = [rect(0, 0, 6, 6)];
  const at = (x, y) => (TETROMINOES[y] || '')[x];
  // a wall wherever two squares side by side belong to different blocks; walls in one line are joined into one stroke
  for (let y = 1; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      if (at(x, y - 1) === at(x, y)) continue;
      const from = x;
      while (x + 1 < 6 && at(x + 1, y - 1) !== at(x + 1, y)) x++;
      polys.push([[from, 6 - y], [x + 1, 6 - y]]);
    }
  }
  for (let x = 1; x < 6; x++) {
    for (let y = 0; y < 6; y++) {
      if (at(x - 1, y) === at(x, y)) continue;
      const from = y;
      while (y + 1 < 6 && at(x - 1, y + 1) !== at(x, y + 1)) y++;
      polys.push([[x, 6 - from], [x, 6 - y - 1]]);
    }
  }
  return picture(polys);
}

function contours() {
  const ring = (k) => {
    const size = 1 + 0.9 * k;
    return Array.from({ length: 121 }, (_, i) => {
      const a = (TAU * (i % 120)) / 120;
      const r = size * (1 + 0.1 * Math.sin(2 * a + 0.5 * k) + 0.05 * Math.sin(3 * a - 0.8 * k));
      return [r * Math.cos(a), 0.8 * r * Math.sin(a)];
    });
  };
  return picture([0, 1, 2, 3, 4].map(ring), [[0.1, 0]]);
}

function perspectiveGrid() {
  const lines = [0.7, 1.8, 3.6, 6]; // how far below the horizon the lines across the floor are
  const polys = [[[-5, 1], [5, 1]], arcPoly(0, 1, 2, 2, 0, 180), ...lines.map((depth) => [[-5, 1 - depth], [5, 1 - depth]])];
  for (let k = -3; k <= 3; k++) {
    // towards the vanishing point in the middle of the horizon: from the bottom edge (or the side) up to the first line
    const x = 3.2 * k;
    const t = k ? Math.min(1, 5 / Math.abs(x)) : 1;
    polys.push([[(x * lines[0]) / 6, 1 - lines[0]], [x * t, 1 - 6 * t]]);
  }
  return picture(polys);
}

const CIRCUIT = 'M-1.5,-1.5 L1.5,-1.5 L1.5,1.5 L-1.5,1.5 Z '
  + 'M-1.5,0.8 L-2.6,0.8 L-3.6,1.8 L-3.6,3.6 O-3.6,4.2 0.6 M-1.5,-0.8 L-3,-0.8 L-3.8,-1.6 O-4.4,-1.6 0.6 '
  + 'M1.5,0.8 L3,0.8 L3.8,1.6 O4.4,1.6 0.6 M1.5,-0.8 L2.6,-0.8 L3.6,-1.8 L3.6,-3.6 O3.6,-4.2 0.6 '
  + 'M-0.8,1.5 L-0.8,2.6 L-1.8,3.6 L-1.8,3.9 O-1.8,4.5 0.6 M0.8,1.5 L0.8,3.2 L1.6,4 L3.4,4 O4,4 0.6 '
  + 'M-0.8,-1.5 L-0.8,-3.2 L-1.6,-4 L-3.4,-4 O-4,-4 0.6 M0.8,-1.5 L0.8,-2.6 L1.8,-3.6 L1.8,-3.9 O1.8,-4.5 0.6';

const TILINGS = [
  pattern('Tilings', 'herringbone', 'Herringbone', herringbone, { tags: 'bricks parquet floor zigzag wood paving' }),
  pattern('Tilings', 'cairo-tiling', 'Cairo tiling', cairo, { tags: 'pentagons five sides paving street' }),
  pattern('Tilings', 'snub-square', 'Snub square tiling', snubSquare, { tags: 'squares triangles mosaic tiles' }),
  pattern('Tilings', 'penrose', 'Penrose tiling', (p) => penrose(Math.round(p.rounds)), { params: [P('rounds', 'Rounds', 1, 3, 1, 2)], tags: 'diamonds rhombus star never repeats quasicrystal' }),
  pattern('Tilings', 'cobblestones', 'Cobblestones', cobblestones, { box: false, tags: 'voronoi cells stones cracked mud giraffe scales paving' }),
  pattern('Tilings', 'star-cross', 'Star and cross tiling', () => [-1, 0, 1].flatMap((i) => [-1, 0, 1].map((j) => star(4 * i, 4 * j, 2, 1.5307, 8, 0))).join(' '), {
    tags: 'eight point stars islamic moroccan tiles mosaic',
  }),
  pattern('Tilings', 'asanoha', 'Asanoha', asanoha, { tags: 'hemp leaf japan stars triangles kimono' }),
  pattern('Tilings', 'circuit-board', 'Circuit board', CIRCUIT, { tags: 'chip electronics traces tech computer wires' }),
  pattern('Tilings', 'jigsaw', 'Jigsaw pattern', 'M-5,-5 L5,-5 L5,5 L-5,5 Z M0,5 L0,3.2 B0,1.8 -2.414 L0,0 L0,-1.8 B0,-3.2 2.414 L0,-5 M-5,0 L-3.2,0 B-1.8,0 -2.414 L0,0 L1.8,0 B3.2,0 2.414 L5,0', {
    tags: 'puzzle pieces fit game',
  }),
  pattern('Tilings', 'cross-stitch', 'Cross stitch', () => picture(CROSS_STITCH.flatMap((row, r) => [...row].flatMap((cell, c) => (cell === '#'
    ? [[[c - 0.36, -r - 0.36], [c + 0.36, -r + 0.36]], [[c - 0.36, -r + 0.36], [c + 0.36, -r - 0.36]]] : [])))), { tags: 'embroidery heart sewing stitches craft x' }),
  pattern('Tilings', 'perspective-grid', 'Perspective grid', perspectiveGrid, { tags: 'floor horizon retro synthwave vanishing point sunset road' }),
  pattern('Tilings', 'contour-lines', 'Contour lines', contours, { tags: 'map hill height rings wood grain tree topographic' }),
  pattern('Tilings', 'crossing-ripples', 'Crossing ripples', 'O-1.75,0 1 O-1.75,0 2 O-1.75,0 3 O-1.75,0 4 O1.75,0 1 O1.75,0 2 O1.75,0 3 O1.75,0 4', { tags: 'interference waves two drops pond circles' }),
  pattern('Tilings', 'tetrominoes', 'Tetromino tiling', tetrominoes, { tags: 'blocks tetris pieces packed puzzle' }),
  pattern('Tilings', 'hopscotch', 'Hopscotch tiling', hopscotch, { tags: 'big and small squares pythagoras floor tiles' }),
  pattern('Tilings', 'checker-plate', 'Checker plate', () => picture(Array.from({ length: 25 }, (_, i) => {
    const [x, y, lean] = [i % 5, Math.floor(i / 5), (i % 5 + Math.floor(i / 5)) % 2 ? 1 : -1];
    return [[x - 0.3, y - 0.3 * lean], [x + 0.3, y + 0.3 * lean]];
  })), { tags: 'metal floor tread dashes steel plate grip' }),
  pattern('Tilings', 'quatrefoil-pattern', 'Quatrefoil pattern', () => [-1.4, 1.4].flatMap((x) => [-1.4, 1.4].map((y) => scallop(x, y, 1, 4, 1))).join(' '), {
    tags: 'moroccan clover lattice gothic trellis',
  }),
  pattern('Tilings', 'rosette-tiling', 'Rosette tiling', () => {
    const corner = (deg) => around(0, 0, 2, deg);
    const outer = (deg, side) => { // the far corners of the square that stands on one side of the hexagon
      const a = deg * RAD;
      const [nx, ny] = [Math.cos((deg + 30) * RAD), Math.sin((deg + 30) * RAD)];
      return `${fix(2 * Math.cos(a + (side * Math.PI) / 3) + 2 * nx)},${fix(2 * Math.sin(a + (side * Math.PI) / 3) + 2 * ny)}`;
    };
    let d = polygon(0, 0, 2, 6, 0);
    for (let k = 0; k < 6; k++) {
      d += ` M${corner(60 * k)} L${outer(60 * k, 0)} L${outer(60 * k, 1)} L${corner(60 * k + 60)} M${outer(60 * k, 1)} L${outer(60 * k + 60, 0)}`;
    }
    return d;
  }, { tags: 'hexagon squares triangles flower twelve sides mosaic' }),
];

// ---------------------------------------------------------------- patterns: borders

/** The same unit `times` times in a row, `step` apart. */
const row = (unit, times, step) => stamp(unit, Array.from({ length: times }, (_, i) => [i * step, 0]));
const border = (id, name, draw, extra = {}) => pattern('Borders', id, name, draw, extra);

const DRIPS = [2.6, 1.3, 3.4, 1.9, 2.9, 1.5, 3.1];
const BARS = [0, 0.5, 0.9, 1.7, 2.1, 2.9, 3.3, 3.7, 4.6, 5, 5.9, 6.3, 7.1, 7.5, 8.3, 8.8, 9.2, 10];
const BOOKS = [[0.9, 4.2], [0.7, 3.4], [1.1, 4.8], [0.8, 3.8], [0.6, 4.4], [1, 3.2], [0.9, 4.6], [0.7, 4]];
const LEVELS = [1.2, 2.6, 3.8, 2.2, 4.6, 3.2, 1.8, 3.6, 2.8, 4.2, 2, 1];

const BORDERS = [
  border('wave-border', 'Wave border', (p) => row('M0,0 L4,0 M0,0 Q2.4,0.2 3,2 Q3.3,3.4 2.2,3.4 Q1.3,3.4 1.5,2.5 Q1.7,2 2.2,2.3', Math.round(p.waves), 4), {
    params: [P('waves', 'Waves', 2, 6, 1, 4)], tags: 'running scroll greek sea curl surf',
  }),
  border('rope-border', 'Rope border', (p) => {
    const k = Math.round(p.twists);
    return joinDrawings(parsePath(`M0,1 L${2 * k},1 M0,-1 L${2 * k},-1`), row('M0,-1 C0.8,-1 1.2,1 2,1', k, 2));
  }, { params: [P('twists', 'Twists', 3, 9, 1, 6)], tags: 'twist cord cable nautical string' }),
  border('chevron-border', 'Chevron border', (p) => row('M0,1.2 L1.2,0 L0,-1.2', Math.round(p.arrows), 1.3), {
    params: [P('arrows', 'Arrows', 2, 9, 1, 5)], tags: 'arrows direction conveyor speed fast forward',
  }),
  border('barbed-wire', 'Barbed wire', (p) => {
    const k = Math.round(p.barbs);
    return joinDrawings(parsePath(`M0,0 L${3 * k},0`), row('M1.1,0.7 L1.9,-0.7 M1.1,-0.7 L1.9,0.7', k, 3));
  }, { params: [P('barbs', 'Barbs', 2, 7, 1, 4)], tags: 'fence spikes prison sharp wire' }),
  border('zipper', 'Zipper', (p) => {
    const k = Math.round(p.teeth);
    return joinDrawings(
      parsePath(`M0,1 L${k},1 M0,-1 L${k},-1 M${k},1 L${k + 0.9},0.5 L${k + 0.9},-0.5 L${k},-1 O${k + 1.5},0 0.6`),
      row('M0.25,1 L0.25,0.1 M0.75,-1 L0.75,-0.1', k, 1),
    );
  }, { params: [P('teeth', 'Teeth', 4, 12, 1, 8)], tags: 'zip fastener clothes jacket bag' }),
  border('film-strip', 'Film strip', (p) => {
    const k = Math.round(p.frames);
    return joinDrawings(
      parsePath(`M0,2.4 L${3.2 * k},2.4 L${3.2 * k},-2.4 L0,-2.4 Z`),
      row('M0.4,1.3 L2.8,1.3 L2.8,-1.3 L0.4,-1.3 Z D0.8,1.85 D2.4,1.85 D0.8,-1.85 D2.4,-1.85', k, 3.2),
    );
  }, { params: [P('frames', 'Frames', 2, 5, 1, 3)], tags: 'movie cinema camera reel video' }),
  border('barcode', 'Barcode', () => BARS.map((x, i) => `M${x},${i < 2 || i > BARS.length - 3 || i === 8 || i === 9 ? -0.8 : 0} L${x},5`).join(' '), {
    tags: 'scan shop product label price code',
  }),
  border('drip-border', 'Drip border', (p) => {
    const k = Math.round(p.drips);
    // down one side of each drip, round its end, and up the other side
    return `M0,0 L${2 * k},0 M0,0 ${Array.from({ length: k }, (_, i) => {
      const low = -DRIPS[i % DRIPS.length];
      return `Q${2 * i},-0.7 ${2 * i + 0.55},-0.7 L${2 * i + 0.55},${low} B${2 * i + 1.45},${low} 1 L${2 * i + 1.45},-0.7 Q${2 * i + 2},-0.7 ${2 * i + 2},0`;
    }).join(' ')}`;
  }, { params: [P('drips', 'Drips', 2, 7, 1, 5)], tags: 'paint slime blood melting dripping wet honey ooze' }),
  border('grass-border', 'Grass border', (p) => {
    const k = Math.round(p.tufts);
    return joinDrawings(parsePath(`M-1.2,0 L${fix(2.4 * k - 1.2)},0`), row('M0,0 Q-0.1,1.4 -0.9,2 M0,0 Q0.1,1.8 0,3 M0,0 Q0.2,1.2 1,1.7', k, 2.4));
  }, { params: [P('tufts', 'Tufts', 2, 6, 1, 4)], tags: 'lawn meadow ground field green tufts blades' }),
  border('flame-border', 'Flame border', (p) => {
    const k = Math.round(p.flames);
    return joinDrawings(parsePath(`M0,0 L${fix(2.4 * k)},0`), row('M0,0 C-0.5,1.2 0.9,1.8 0.6,3.4 C1.5,2.8 1.7,2.2 1.6,1.6 C1.9,1.9 2,2.2 2,2.5 C2.5,1.7 2.6,0.8 2.4,0', k, 2.4));
  }, { params: [P('flames', 'Flames', 2, 6, 1, 3)], tags: 'fire burning hot wall row' }),
  border('skyline', 'City skyline', 'M0,0 L0,2 L1,2 L1,3.4 L2,3.4 L2,1.4 L2.8,1.4 L2.8,4.4 L3.2,5.2 L3.6,4.4 L3.6,2.4 L4.6,2.4 L4.6,3.8 L5.4,3.8 L5.4,1.8 L6.4,1.8 L6.4,3 L7.2,3 L7.2,0 Z D1.5,2.6 D1.5,1.6 D5,3 D5,2 D3.2,3.4 D3.2,2.4', {
    tags: 'buildings town skyscrapers night horizon',
  }),
  border('bead-string', 'Bead string', (p) => row('O0,0 0.9 O1.35,0 0.45', Math.round(p.beads), 2.7), {
    params: [P('beads', 'Beads', 2, 7, 1, 4)], tags: 'necklace pearls garland balls big small',
  }),
  border('fairy-lights', 'Fairy lights', (p) => {
    const k = Math.round(p.bulbs);
    const wide = 1.7 * k + 0.6;
    return `M0,0 Q${fix(wide / 2)},-2.6 ${fix(wide)},0 ${Array.from({ length: k }, (_, i) => {
      const x = 0.3 + 1.7 * (i + 0.5);
      const y = -5.2 * (x / wide) * (1 - x / wide); // how far the wire sags there
      return `M${fix(x)},${fix(y)} L${fix(x)},${fix(y - 0.45)} O${fix(x)},${fix(y - 0.95)} 0.5`;
    }).join(' ')}`;
  }, { params: [P('bulbs', 'Bulbs', 3, 8, 1, 5)], tags: 'string lights christmas party bulbs garland festoon' }),
  border('paw-trail', 'Paw trail', (p) => stamp('O0,0 0.55 O-0.62,0.75 0.26 O0,1.05 0.26 O0.62,0.75 0.26', Array.from({ length: Math.round(p.prints) }, (_, i) => [2.2 * i, i % 2 ? -0.8 : 0.8, 1, i % 2 ? -100 : -80])), {
    params: [P('prints', 'Prints', 3, 8, 1, 5)], tags: 'tracks footprints animal dog cat walk',
  }),
  border('arch-border', 'Arch border', (p) => {
    const k = Math.round(p.arches);
    return joinDrawings(parsePath(`M0,0 L${2 * k},0 M0,3.6 L${2 * k},3.6 M${2 * k},0 L${2 * k},3.6`), row('M0,3.6 L0,0 M0,2 A1,2 1 180 0', k, 2));
  }, { params: [P('arches', 'Arches', 2, 7, 1, 4)], tags: 'arches columns aqueduct bridge roman viaduct' }),
  border('flower-border', 'Flower border', (p) => row(`${scallop(0, 0, 1, 5, 1)} O0,0 0.4`, Math.round(p.flowers), 3), {
    params: [P('flowers', 'Flowers', 2, 6, 1, 4)], tags: 'daisies garland spring floral row',
  }),
  border('pipeline', 'Pipeline', (p) => {
    const k = Math.round(p.joints);
    const joint = (x) => `M${x - 0.3},1.5 L${x + 0.3},1.5 L${x + 0.3},1 L${x + 0.3},-1 L${x + 0.3},-1.5 L${x - 0.3},-1.5 L${x - 0.3},-1 L${x - 0.3},1 Z`;
    let d = '';
    for (let i = 0; i <= k; i++) {
      d += `${joint(4 * i)} `;
      if (i < k) d += `M${4 * i + 0.3},1 L${4 * i + 3.7},1 M${4 * i + 0.3},-1 L${4 * i + 3.7},-1 `;
    }
    return d;
  }, { params: [P('joints', 'Pieces', 1, 4, 1, 2)], tags: 'pipe tube plumbing water oil drain sewer' }),
  border('books-row', 'Row of books', () => {
    let x = 0;
    const d = BOOKS.map(([wide, high]) => {
      const book = `M${fix(x)},0 L${fix(x)},${high} L${fix(x + wide)},${high} L${fix(x + wide)},0 M${fix(x)},${fix(high - 0.7)} L${fix(x + wide)},${fix(high - 0.7)}`;
      x += wide;
      return book;
    }).join(' ');
    return `${d} M-0.5,0 L${fix(x + 0.5)},0`;
  }, { tags: 'library shelf spines read school' }),
  border('gear-train', 'Gear train', () => `${gear(0, 0, 2, 1.5, 8)} O0,0 0.5 ${gear(3.2, 0, 1.2, 0.8, 5, 36)} O3.2,0 0.3 ${gear(6, 0, 1.6, 1.15, 6, 30)} O6,0 0.4`, {
    tags: 'cogs wheels machine clockwork engine',
  }),
  border('growing-circles', 'Growing circles', () => {
    let x = 0;
    return [0.3, 0.5, 0.75, 1.05, 1.4, 1.8].map((r) => {
      x += r;
      const d = `O${fix(x)},0 ${r}`;
      x += r;
      return d;
    }).join(' ');
  }, { tags: 'grow size scale bubbles bigger loading' }),
  border('sound-bars', 'Sound bars', () => LEVELS.map((level, i) => `M${i},${-level} L${i},${level}`).join(' '), { tags: 'music equalizer audio volume levels voice spectrum' }),
];

// ---------------------------------------------------------------- patterns: fractals

/** A path drawn by a turtle that follows rewriting rules: F and G go forward, + and - turn. */
function turtle(axiom, rules, rounds, turn) {
  let text = axiom;
  for (let i = 0; i < rounds; i++) text = [...text].map((ch) => rules[ch] || ch).join('');
  let [x, y, heading] = [0, 0, 0];
  const pts = [[0, 0]];
  for (const ch of text) {
    if (ch === '+') heading += turn;
    else if (ch === '-') heading -= turn;
    else if (ch === 'F' || ch === 'G' || ch === 'A' || ch === 'B') {
      x += Math.cos(heading * RAD);
      y += Math.sin(heading * RAD);
      pts.push([x, y]);
    }
  }
  return pts;
}
/** The middles of the steps of a path: a path that touches itself at its corners does not touch itself there. */
const middles = (pts) => pts.slice(1).map((p, i) => [(p[0] + pts[i][0]) / 2, (p[1] + pts[i][1]) / 2]);

const GOSPER = memo((rounds) => fitBox(turtle('A', { A: 'A-B--B+A++AA+B-', B: '+A-BB--B-A++A+B' }, rounds, 60)));
const SQUARE_CURVE = memo((rounds) => fitBox(turtle('F+XF+F+XF', { X: 'XF-F+F-XF+F+XF-F+F-X' }, rounds, 90).slice(0, -1)));
const KOCH_ISLAND = memo((rounds) => fitBox(turtle('F-F-F-F', { F: 'F-F+F+FF-F-F+F' }, rounds, 90).slice(0, -1)));
const TERDRAGON = memo((rounds) => fitBox(middles(turtle('F', { F: 'F+F-F' }, rounds, 120))));
const ANTIFLAKE = memo((rounds) => turtle('F++F++F', { F: 'F+F--F+F' }, rounds, 60).slice(0, -1));

function fibonacciWord(steps) {
  let [a, b] = ['1', '0'];
  while (b.length < steps) [a, b] = [b, b + a];
  let [x, y, dx, dy] = [0, 0, 0, 1];
  const pts = [[0, 0]];
  for (let k = 1; k <= steps; k++) {
    x += dx;
    y += dy;
    pts.push([x, y]);
    if (b[k - 1] === '0') [dx, dy] = k % 2 ? [dy, -dx] : [-dy, dx];
  }
  return fitBox(pts);
}
const WORD_PATH = memo((steps) => fibonacciWord(steps));

function zOrder(order) {
  const size = 2 ** order;
  const pts = [];
  for (let d = 0; d < size * size; d++) {
    let [x, y] = [0, 0];
    for (let bit = 0; bit < order; bit++) {
      x |= ((d >> (2 * bit)) & 1) << bit;
      y |= ((d >> (2 * bit + 1)) & 1) << bit;
    }
    pts.push([x, -y]);
  }
  return fitBox(pts);
}
const Z_PATH = memo(zOrder);

function pythagorasTree(depth) {
  const polys = [];
  const grow = (a, b, level) => { // a square standing on the side from a to b
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const c = [b[0] - dy, b[1] + dx];
    const d = [a[0] - dy, a[1] + dx];
    polys.push([a, b, c, d, a]);
    if (level >= depth) return;
    const top = [d[0] + (dx - dy) / 2, d[1] + (dy + dx) / 2]; // the point of the roof
    grow(d, top, level + 1);
    grow(top, c, level + 1);
  };
  grow([-0.5, 0], [0.5, 0], 0);
  return picture(polys);
}

function cornerSquares(depth) {
  const polys = [];
  const add = (x, y, half, level, from) => {
    polys.push(rect(x - half, y - half, x + half, y + half));
    if (level >= depth) return;
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      if (from && sx === -from[0] && sy === -from[1]) continue; // not back towards the square it grew from
      add(x + sx * half, y + sy * half, half / 2, level + 1, [sx, sy]);
    }
  };
  add(0, 0, 1, 0, null);
  return picture(polys);
}

function starFractal(depth) {
  let d = '';
  const add = (x, y, r, level) => {
    d += `${star(x, y, r, r * 0.4)} `;
    if (level >= depth) return;
    for (let k = 0; k < 5; k++) add(x + 1.42 * r * Math.cos((90 + 72 * k) * RAD), y + 1.42 * r * Math.sin((90 + 72 * k) * RAD), r * 0.42, level + 1);
  };
  add(0, 0, 1, 0);
  return d;
}

function bush(depth) {
  // a plant grown by the rule F -> FF+[+F-F-F]-[-F+F+F]
  let text = 'F';
  for (let i = 0; i < depth; i++) text = [...text].map((ch) => (ch === 'F' ? 'FF+[+F-F-F]-[-F+F+F]' : ch)).join('');
  const polys = [];
  const stack = [];
  let [x, y, heading] = [0, 0, 90];
  let cur = [[0, 0]];
  for (const ch of text) {
    if (ch === 'F') {
      x += Math.cos(heading * RAD);
      y += Math.sin(heading * RAD);
      cur.push([x, y]);
    } else if (ch === '+') heading += 22.5;
    else if (ch === '-') heading -= 22.5;
    else if (ch === '[') {
      stack.push([x, y, heading, cur]);
      cur = [[x, y]];
    } else {
      if (cur.length > 1) polys.push(cur);
      [x, y, heading, cur] = stack.pop();
    }
  }
  polys.push(cur);
  return picture(polys);
}

/** A round maze: rings of rooms around the middle, with one way through. */
function roundMaze() {
  const next = dice(5);
  const rings = 4;
  const rooms = (ring) => (ring < 2 ? 8 : 16); // the outer rings have twice as many rooms
  const key = (ring, i) => `${ring},${((i % rooms(ring)) + rooms(ring)) % rooms(ring)}`;
  const open = new Set(); // walls knocked through: "ring,i,in" is the inner wall of a room, "ring,i,side" the wall after it
  const seen = new Set([key(0, 0)]);
  const stack = [[0, 0]];
  while (stack.length) {
    const [ring, i] = stack[stack.length - 1];
    const ways = [];
    ways.push([ring, i + 1, `${key(ring, i)},side`], [ring, i - 1, `${key(ring, i - 1)},side`]);
    if (ring > 0) ways.push([ring - 1, rooms(ring) === rooms(ring - 1) ? i : Math.floor(i / 2), `${key(ring, i)},in`]);
    if (ring < rings - 1) {
      if (rooms(ring + 1) === rooms(ring)) ways.push([ring + 1, i, `${key(ring + 1, i)},in`]);
      else ways.push([ring + 1, 2 * i, `${key(ring + 1, 2 * i)},in`], [ring + 1, 2 * i + 1, `${key(ring + 1, 2 * i + 1)},in`]);
    }
    const free = ways.filter(([r, j]) => !seen.has(key(r, j)));
    if (!free.length) {
      stack.pop();
      continue;
    }
    const [r, j, wall] = free[Math.floor(next() * free.length)];
    open.add(wall);
    seen.add(key(r, j));
    stack.push([r, ((j % rooms(r)) + rooms(r)) % rooms(r)]);
  }
  const polys = [];
  const arc = (radius, from, to) => arcPoly(0, 0, radius, radius, from, to);
  for (let ring = 0; ring < rings; ring++) {
    const count = rooms(ring);
    const step = 360 / count;
    for (let i = 0; i < count; i++) {
      if (ring > 0 && !open.has(`${key(ring, i)},in`)) polys.push(arc(ring + 1, i * step, (i + 1) * step));
      if (!open.has(`${key(ring, i)},side`)) {
        const a = (i + 1) * step * RAD;
        polys.push([[(ring + 1) * Math.cos(a), (ring + 1) * Math.sin(a)], [(ring + 2) * Math.cos(a), (ring + 2) * Math.sin(a)]]);
      }
    }
  }
  polys.push(arc(1, 0, 360), arc(rings + 1, 8, 352)); // the room in the middle, and the outer wall with its door
  return picture(polys);
}

/** The dots of a fractal that is made of `copies` smaller ones of itself, `shrink` times as small, `rounds` deep. */
function flake(places, shrink, rounds) {
  let pts = [[0, 0]];
  let size = 1;
  for (let i = 0; i < rounds; i++) {
    size *= shrink;
    pts = pts.flatMap(([x, y]) => places.map(([px, py]) => [x + px * (size / shrink), y + py * (size / shrink)]));
  }
  return fitBox(pts);
}
const HEXAFLAKE = [[0, 0], ...Array.from({ length: 6 }, (_, k) => [(2 / 3) * Math.cos((60 * k + 30) * RAD), (2 / 3) * Math.sin((60 * k + 30) * RAD)])];
const PENTAFLAKE = Array.from({ length: 5 }, (_, k) => [0.618 * Math.cos((72 * k + 90) * RAD), 0.618 * Math.sin((72 * k + 90) * RAD)]);
const DUST = [[-2 / 3, -2 / 3], [2 / 3, -2 / 3], [-2 / 3, 2 / 3], [2 / 3, 2 / 3]];
const roundsFor = (n, copies, most) => Math.max(1, Math.min(most, Math.floor(Math.log(n + 0.5) / Math.log(copies))));

/** The dots of a grid that are in the Mandelbrot set (or in the Julia set of `seed`), about n of them. */
function escapeSet(n, box, inSet) {
  const [x0, x1, y0, y1] = box;
  let step = Math.sqrt(((x1 - x0) * (y1 - y0) * 0.3) / n);
  let pts = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    pts = [];
    const cols = Math.max(2, Math.round((x1 - x0) / step));
    const rows = Math.max(2, Math.round((y1 - y0) / step));
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const [x, y] = [x0 + ((i + 0.5) * (x1 - x0)) / cols, y1 - ((j + 0.5) * (y1 - y0)) / rows];
        if (inSet(x, y)) pts.push([x, y]);
      }
    }
    if (Math.abs(pts.length - n) <= Math.max(2, n * 0.06)) break;
    step *= Math.sqrt(Math.max(1, pts.length) / n);
  }
  return fitBox(pts);
}
const stays = (zx, zy, cx, cy) => {
  let [x, y] = [zx, zy];
  for (let i = 0; i < 80; i++) {
    [x, y] = [x * x - y * y + cx, 2 * x * y + cy];
    if (x * x + y * y > 4) return false;
  }
  return true;
};

const FRACTALS = [
  pattern('Fractals', 'koch-antisnowflake', 'Koch antisnowflake', (p) => picture([[...ANTIFLAKE(Math.round(p.depth)), ANTIFLAKE(Math.round(p.depth))[0]]]), {
    params: [P('depth', 'Depth', 1, 3, 1, 2)], tags: 'fractal triangles inward propeller pinwheel',
  }),
  {
    id: 'gosper-curve', name: 'Gosper curve', count: 140, min: 8, tags: 'fractal flowsnake hexagon path island',
    params: [P('depth', 'Depth', 1, 3, 1, 2)],
    gen: (n, p) => pathPoints(GOSPER(Math.round(p.depth)), n),
  },
  {
    id: 'sierpinski-curve', name: 'Sierpinski curve', count: 140, min: 12, tags: 'fractal square snowflake loop cross',
    params: [P('depth', 'Depth', 1, 3, 1, 2)],
    gen: (n, p) => pathPoints(SQUARE_CURVE(Math.round(p.depth)), n, true),
  },
  {
    id: 'koch-island', name: 'Koch island', count: 128, min: 32, tags: 'fractal square snowflake quadratic jagged coast',
    params: [P('depth', 'Depth', 1, 2, 1, 1)],
    gen: (n, p) => pathPoints(KOCH_ISLAND(Math.round(p.depth)), n, true),
  },
  {
    id: 'terdragon', name: 'Terdragon', count: 140, min: 9, tags: 'fractal dragon triangles fold',
    params: [P('folds', 'Folds', 2, 5, 1, 4)],
    gen: (n, p) => pathPoints(TERDRAGON(Math.round(p.folds)), n),
  },
  {
    id: 'fibonacci-word', name: 'Fibonacci word fractal', count: 144, min: 12, tags: 'fractal path steps golden zigzag',
    params: [P('steps', 'Steps', 34, 233, 1, 89)],
    gen: (n, p) => pathPoints(WORD_PATH(Math.round(p.steps)), n),
  },
  {
    id: 'z-order', name: 'Z-order curve', count: 76, min: 16, tags: 'fractal zigzag morton path',
    params: [P('order', 'Order', 1, 3, 1, 2)],
    gen: (n, p) => pathPoints(Z_PATH(Math.round(p.order)), n),
  },
  pattern('Fractals', 'pythagoras-tree', 'Pythagoras tree', (p) => pythagorasTree(Math.round(p.depth)), { params: [P('depth', 'Depth', 1, 4, 1, 3)], tags: 'fractal squares branches broccoli' }),
  pattern('Fractals', 'corner-squares', 'Corner squares', (p) => cornerSquares(Math.round(p.depth)), { params: [P('depth', 'Depth', 1, 3, 1, 1)], tags: 'fractal t-square nested boxes' }),
  pattern('Fractals', 'star-fractal', 'Star fractal', (p) => starFractal(Math.round(p.depth)), { params: [P('depth', 'Depth', 1, 2, 1, 1)], tags: 'stars on stars tips nested' }),
  pattern('Fractals', 'fractal-bush', 'Fractal bush', (p) => bush(Math.round(p.depth)), { params: [P('depth', 'Depth', 1, 3, 1, 2)], tags: 'plant weed seaweed branches grow shrub', count: 140 }),
  pattern('Fractals', 'round-maze', 'Round maze', roundMaze, { tags: 'labyrinth circle rings puzzle path', count: 140 }),
  { id: 'hexaflake', name: 'Hexaflake', count: 49, min: 7, tidy: true, tags: 'fractal hexagons snowflake dots flower', gen: (n) => flake(HEXAFLAKE, 1 / 3, roundsFor(n, 7, 3)) },
  { id: 'pentaflake', name: 'Pentaflake', count: 125, min: 5, tidy: true, tags: 'fractal pentagons stars dots five', gen: (n) => flake(PENTAFLAKE, 0.382, roundsFor(n, 5, 3)) },
  { id: 'cantor-dust', name: 'Cantor dust', count: 64, min: 4, tidy: true, tags: 'fractal squares corners dots four', gen: (n) => flake(DUST, 1 / 3, roundsFor(n, 4, 4)) },
  {
    id: 'mandelbrot', name: 'Mandelbrot set', count: 160, min: 24, tidy: true, tags: 'fractal famous bug beetle apple man maths',
    gen: (n) => escapeSet(Math.max(24, n), [-2.05, 0.55, -1.15, 1.15], (x, y) => stays(0, 0, x, y)),
  },
  {
    id: 'julia-set', name: 'Julia set', count: 160, min: 24, tidy: true, tags: 'fractal basilica lobes bubbles maths',
    gen: (n) => escapeSet(Math.max(24, n), [-1.65, 1.65, -0.9, 0.9], (x, y) => stays(x, y, -1, 0)),
  },
];

// ---------------------------------------------------------------- a progress bar (Symbols)

const PROGRESS = [
  drawnShape({
    id: 'progress-bar', name: 'Progress bar', cat: 'symbols', sub: 'Signs', tags: 'loading health meter level percent power',
    params: [P('done', 'Done', 0, 10, 1, 6)],
    draw: (p) => `M0,0 L10.6,0 L10.6,2 L0,2 Z ${Array.from({ length: Math.round(p.done) }, (_, i) => `M${fix(i + 0.8)},0.5 L${fix(i + 0.8)},1.5`).join(' ')}`,
  }),
];

export const FORM_SHAPES = [
  ...OUTLINES,
  ...put('basic', 'flat', 'More filled shapes', FILLED),
  ...FLAT_CURVES,
  ...put('curves', 'solid', 'More curves in 3D', SPACE_CURVES),
  ...TILINGS,
  ...BORDERS,
  ...FRACTALS.map((s) => (s.cat ? s : Object.assign(s, { cat: 'patterns', group: 'flat', sub: 'Fractals' }))),
  ...PROGRESS,
];
