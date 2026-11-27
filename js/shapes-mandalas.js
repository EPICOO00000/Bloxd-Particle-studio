// The Mandalas tab: snow crystals, flowers and rosettes, each put together
// from a few parts that are repeated around the middle (see shape-mix.js for
// how the parts are dealt out). One unit of a drawing is roughly the gap
// between two particles, so no stroke is much shorter than two units.
// (The older snowflakes and mandalas, "Snowflake 1" and "Mandala 1" and so
// on, are in shapes-ornaments.js: these have names of their own.)

import { spin, scallop } from './shape-kit.js';
import {
  family, edgeOf as edge, mirrored, joined, at, path, closed, circle, oval, dot, bow, bowTo, polar, ringOf, star, diamond,
} from './shape-mix.js';

const words = (...parts) => parts.filter(Boolean).join(' ');
const ray = (r, deg) => polar(0, 0, r, deg);
/** The same thing `times` around the middle: `each(angle, i)` gives its text. */
const around = (times, each, first = 90) => Array.from({ length: times }, (_, i) => each(first + (360 * i) / times, i)).join(' ');
/** A leaf from one end to the other. */
const leaf = (from, to, round = 0.5) => `${bow(from, to, round)} ${bowTo(from, round)}`;

// ---------------------------------------------------------------- snowflakes
//
// One arm is drawn pointing up, 8 long, and repeated six times. Halfway between two arms there is a second, shorter
// arm. What grows on an arm keeps to its outer half (4.2 and more from the middle), and the second arms keep to the
// inner half (up to 4), so the two never meet.

const branch = (d, l) => path([0, d], [0.866 * l, d + 0.5 * l]);
// what is drawn on the right of the arm and mirrored
const BRANCHES = [
  ['two branches', [branch(4.4, 2.2), branch(6.2, 2.2)]],
  ['big branches', [branch(4.6, 2.8)]],
  ['high branches', [branch(6.2, 2.4)]],
  ['plain spokes', []],
  ['plates', [path([0, 4.4], [1.3, 5.7], [0, 7])]],
  ['bars', [path([0, 4.8], [1.5, 4.8]), path([0, 6.4], [1.1, 6.4])]],
  ['barbs', [path([1.4, 4.2], [0, 5.4]), path([1.4, 5.8], [0, 7])]],
  ['branch and bar', [branch(4.4, 2.2), path([0, 6.6], [1.1, 6.6])]],
  ['web', [path([0, 5.6], ray(4.85, 60))]],
];

// [search words, what is drawn on the right and mirrored, what stands in the middle]
const TIPS = [
  ['', [], []],
  ['forked tips', [path([0, 8], [0.9, 9.2])], []],
  ['diamond tips', [], [diamond(0, 8.9, 0.8, 0.9)]],
  ['ball tips', [], [oval(0, 8.7, 0.7, 0.7, 270)]],
  ['arrow tips', [], [closed([-0.8, 8], [0, 9.3], [0.8, 8])]],
  ['flat tips', [], [path([-0.8, 8], [0.8, 8])]],
  ['trident tips', [path([0, 8], [1, 8.9])], [path([0, 8], [0, 9.4])]],
];

// [search words, where the arms start, where the second arms start, what is in the middle]
const HEARTS = [
  ['', 0, 2, ''],
  ['hexagon', 0, 1.73, closed(...ringOf((a) => ray(2, a), 60))],
  ['ring', 1.8, 1.8, `${circle(0, 0, 1.8)} ${dot(0, 0)}`],
  ['open', 1.6, 2, dot(0, 0)],
  ['plate', 2, 2.31, closed(...ringOf((a) => ray(2.31, a + 30), 60))],
];

// the second arm, drawn pointing up: (where it starts) => what is drawn
const SECOND = [
  ['', () => ''],
  ['short spokes', (s) => path([0, s], [0, 3])],
  ['long spokes', (s) => path([0, s], [0, 4])],
  ['spokes and dots', (s) => `${path([0, s], [0, 3])} ${dot(0, 4.1)}`],
  ['dots', () => dot(0, 3.2)],
  ['two dots', () => `${dot(0, 3)} ${dot(0, 4)}`],
  ['forked spokes', (s) => (s > 2.2 ? mirrored([path([0, s], [0.75, s + 0.7])], []) : mirrored([path([0, 2.9], [0.75, 3.6])], [path([0, s], [0, 2.9])]))],
  ['small bars', () => path([-0.9, 3.4], [0.9, 3.4])],
];

const snowflakes = family({
  cat: 'mandalas', count: 280, spacing: 0.1, sizes: [BRANCHES.length, TIPS.length, HEARTS.length, SECOND.length], first: [0, 0, 1, 0],
  make: ([branches, tip, heart, second], k) => ({
    id: `snow-crystal-${k}`, name: `Snow crystal ${k}`, sub: 'Snow crystals',
    tags: words('snowflake ice winter frost christmas six', BRANCHES[branches][0], TIPS[tip][0], HEARTS[heart][0], SECOND[second][0]),
    draw: () => {
      const [, from, inner, middle] = HEARTS[heart];
      const arm = mirrored([BRANCHES[branches][1], TIPS[tip][1]], [path([0, from], [0, 8]), TIPS[tip][2]]);
      const between = SECOND[second][1](inner);
      return joined(spin(arm, 6), middle, between && spin(between, 6, 30));
    },
  }),
});

// ---------------------------------------------------------------- flowers
//
// Seen from above: one outline that runs around all the petals, from the dip between two petals (3.2 from the
// middle) out to a tip (8) and back. A petal is written as the corners of its right half: [how far from the middle,
// how far round from the middle of the petal (1 = the dip between two petals)].

const PETALS = [
  ['pointed petals', [[3.9, 0.72], [5.8, 0.6], [8, 0]]],
  ['round petals', [[4.2, 0.84], [5.6, 0.84], [7, 0.62], [7.8, 0.3], [8, 0]]],
  ['heart petals', [[4.2, 0.84], [5.8, 0.84], [7.4, 0.62], [8, 0.3], [7.2, 0]]],
  ['square petals', [[4.2, 0.84], [7.2, 0.8], [7.8, 0.45], [7.8, 0]]],
  ['thin petals daisy', [[4.4, 0.5], [7.4, 0.42], [8, 0]]],
  ['tulip petals', [[4.6, 0.82], [6.2, 0.55], [7, 0.5], [8, 0]]],
  ['split petals', [[4.2, 0.84], [6.6, 0.8], [8, 0.5], [6.8, 0]]],
];
const HOW_MANY = [5, 6, 8, 7, 4];

/** The outline around `n` petals; `dip` is how far from the middle two petals meet, `first` where a petal points. */
function petalRing(corners, n, first = 90, dip = 3.2) {
  if (corners[corners.length - 1][1] !== 0) throw new Error('A petal ends on its middle line');
  const sector = 180 / n;
  const points = [];
  for (let i = 0; i < n; i++) {
    const axis = first + i * 2 * sector;
    points.push(ray(dip, axis - sector));
    for (const [r, f] of corners) points.push(ray(r, axis - f * sector));
    for (const [r, f] of corners.slice(0, -1).reverse()) points.push(ray(r, axis + f * sector));
  }
  return closed(...points);
}

const MIDDLES = [
  ['', circle(0, 0, 2.2)],
  ['eye', `${circle(0, 0, 2.2)} ${dot(0, 0)}`],
  ['double middle', `${circle(0, 0, 2.3)} ${circle(0, 0, 1.1)}`],
  ['seeds sunflower', `${circle(0, 0, 2.4)} ${dot(0, 0)} ${around(6, (a) => dot(...ray(1.3, a)))}`],
  ['spiral middle', `M-0.8,0 ${bowTo([0.8, 0], 1)} ${bowTo([-1.8, 0], 1)} ${bowTo([2, 0], 1)}`],
  ['star middle', star(0, 0, 5, 2.3, 1.1)],
  ['hexagon middle', closed(...ringOf((a) => ray(2.3, a), 60))],
  ['flower middle', scallop(0, 0, 1.9, 6, 0.4)],
  ['cross middle', `${circle(0, 0, 2.3)} ${path([-1.3, 0], [1.3, 0])} ${path([0, -1.3], [0, 1.3])}`],
];

// [search words, (how many petals, the outline) => what else there is, does a petal point down (a stem starts there)]
const AROUND = [
  ['', () => ''],
  ['dew drops', (n) => around(n, (a) => dot(...ray(9.2, a)))],
  ['pollen dots', (n) => around(n, (a) => dot(...ray(8.6, a)), 90 + 180 / n)],
  ['two leaves', () => `${leaf(ray(8.9, 215), ray(11.6, 215))} ${leaf(ray(8.9, 325), ray(11.6, 325))}`],
  ['four leaves', () => around(4, (a) => leaf(ray(8.9, a), ray(11.4, a)), 45)],
  ['stem leaves', (n, line) => {
    const [, y] = line.bottom(0);
    return `${path([0, y], [0, -15.5])} ${leaf([0, -12.6], [3.6, -11.3], 0.35)} ${leaf([0, -14], [-3.6, -12.7], 0.35)}`;
  }, true],
  ['flower pot', (n, line) => {
    const [, y] = line.bottom(0);
    return `${path([0, y], [0, -11.4])} ${closed([-2.6, -11.4], [2.6, -11.4], [1.8, -14.6], [-1.8, -14.6])}`;
  }, true],
  ['stem grass meadow', (n, line) => {
    const [, y] = line.bottom(0);
    const blades = Array.from({ length: 9 }, (_, i) => [-5 + 1.25 * i, i % 2 ? -13.2 : -15]);
    return `${path([0, y], [0, -15])} ${path(...blades)}`;
  }, true],
];

const flowers = family({
  cat: 'mandalas', count: 280, spacing: 0.1, sizes: [PETALS.length, HOW_MANY.length, MIDDLES.length, AROUND.length], first: [0, 0, 1, 0],
  make: ([petal, many, middle, extra], k) => ({
    id: `flower-${k}`, name: `Flower ${k}`, sub: 'Flowers',
    tags: words('blossom bloom petals garden plant daisy', PETALS[petal][0], `${HOW_MANY[many]} petals`, MIDDLES[middle][0], AROUND[extra][0]),
    draw: () => {
      const line = edge(petalRing(PETALS[petal][1], HOW_MANY[many], AROUND[extra][2] ? 270 : 90));
      return joined(line.d, MIDDLES[middle][1], AROUND[extra][1](HOW_MANY[many], line));
    },
  }),
});

// ---------------------------------------------------------------- mandalas
//
// A rim that runs all the way round holds a mandala together. Inside it there is a ring of things (from 3.4 to
// 5.6 from the middle) and a middle (up to 2.4). No rim comes nearer the middle than 7, so the three never touch.

const fewer = (m) => (m === 8 ? 4 : m);
/** A closed line through `k` points round the middle that bows from one to the next (more than 0 = towards the middle). */
const bowed = (k, r, round, first = 90) => {
  const points = Array.from({ length: k }, (_, i) => ray(r, first + (360 * i) / k));
  return `M${at(...points[0])} ${points.map((_, i) => bowTo(points[(i + 1) % k], typeof round === 'function' ? round(i) : round)).join(' ')}`;
};

// (how many times, inner edge, outer edge) => what stands in the ring
const RINGS = [
  ['zigzag star', (m, a, b) => closed(...Array.from({ length: 2 * m }, (_, i) => ray(i % 2 ? a + 0.5 : b, 90 + (180 * i) / m)))],
  ['spokes rays', (m, a, b) => around(m, (t) => path(ray(a, t), ray(b, t)))],
  ['dots beads', (m, a, b) => `${around(m, (t) => dot(...ray(a + 0.4, t)))} ${around(m, (t) => dot(...ray(b - 0.4, t)), 90 + 180 / m)}`],
  ['bubbles circles', (m, a, b) => {
    const r = (a + b) / 2;
    return around(m, (t) => circle(...ray(r, t), Math.min((b - a) / 2, (Math.PI * r) / m - 0.5)));
  }],
  ['diamonds', (m, a, b) => {
    const r = (a + b) / 2;
    const side = (Math.min(1, (Math.PI * r) / m - 0.5) / r) * (180 / Math.PI);
    return around(m, (t) => closed(ray(a, t), ray(r, t + side), ray(b, t), ray(r, t - side)));
  }],
  ['waves', (m, a, b) => {
    const r = (a + b) / 2;
    return bowed(2 * m, r, (i) => (i % 2 ? 1 : -1) * Math.min(0.8, (b - a) / (2 * r * Math.sin(Math.PI / (2 * m)))));
  }],
  ['ring', (m, a, b) => circle(0, 0, (a + b) / 2)],
  ['chevrons arrows', (m, a, b) => around(m, (t) => path(ray(a, t - 90 / m), ray(b, t), ray(a, t + 90 / m)))],
  ['leaves petals', (m, a, b) => around(m, (t) => leaf(ray(a, t), ray(b, t), 0.42))],
];

// (how many times the rim repeats, how many times the ring inside it does) => the rim: one line all the way round
const RIMS = [
  ['circle rim', () => circle(0, 0, 9)],
  ['scalloped rim', (k) => bowed(k, 8, -0.6)],
  ['spiked rim', (k) => bowed(k, 9, 0.3)],
  ['zigzag rim', (k) => closed(...Array.from({ length: 2 * k }, (_, i) => ray(i % 2 ? 7.6 : 9, 90 + (180 * i) / k)))],
  ['polygon rim', (k, m) => closed(...ringOf((t) => ray(m === 4 ? 9.6 : 9, t), 360 / m))],
  ['wavy rim', (k) => bowed(2 * k, 8.2, (i) => (i % 2 ? 1 : -1) * (k > 10 ? 0.7 : 0.5))],
  ['sun rays rim', (k) => `${circle(0, 0, 7.4)} ${around(k, (t) => path(ray(7.4, t), ray(9.4, t)))}`],
  ['beaded rim', (k) => `${circle(0, 0, 8)} ${around(k, (t) => dot(...ray(9.3, t)))}`],
];

// (how many times the ring around it repeats) => what stands in the middle
const CORES = [
  ['star', (k) => star(0, 0, fewer(k), 2.4, 1.2)],
  ['flower', (k) => petalRing([[2, 0.55], [2.4, 0]], fewer(k), 90, 1.1)],
  ['wheel', (k) => `${circle(0, 0, 2.4)} ${around(fewer(k), (t) => path([0, 0], ray(2.4, t)))}`],
  ['target', () => `${circle(0, 0, 2.4)} ${circle(0, 0, 1.1)}`],
  ['polygon', (k) => `${closed(...ringOf((t) => ray(2.4, t), 360 / k))} ${dot(0, 0)}`],
  ['leaves', (k) => around(fewer(k), (t) => leaf(ray(0.9, t), ray(2.4, t), 0.42))],
  ['dots', (k) => `${dot(0, 0)} ${around(k, (t) => dot(...ray(1.9, t)))}`],
];

// [how many times the ring repeats, how many times the rim]
const TIMES = [[6, 12], [8, 8], [5, 10], [7, 14], [4, 12]];

const mandalas = family({
  cat: 'mandalas', count: 280, spacing: 0.1, sizes: [TIMES.length, CORES.length, RINGS.length, RIMS.length], first: [0, 0, 0, 2],
  make: ([times, core, ring, rim], k) => ({
    id: `rosette-${k}`, name: `Rosette ${k}`, sub: 'Rosettes',
    tags: words('mandala ornament round kaleidoscope magic circle rune spell', `${TIMES[times][0]} fold`, CORES[core][0], RINGS[ring][0], RIMS[rim][0]),
    draw: () => [CORES[core][1](TIMES[times][0]), RINGS[ring][1](TIMES[times][0], 3.4, 5.6), RIMS[rim][1](TIMES[times][1], TIMES[times][0])].join(' '),
  }),
});

export const MANDALA_SHAPES = [...snowflakes, ...flowers, ...mandalas];
export const MANDALA_HEADINGS = ['Snow crystals', 'Flowers', 'Rosettes'];
