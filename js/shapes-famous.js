// Curves with a name: the ones from the mathematics books that the Curves tab
// did not have yet, and a few figures made of circles. Each is a formula; a
// new one is a few lines in CURVES.

import { drawnShape, RAD } from './shape-kit.js';

const TAU = Math.PI * 2;
/** The curve fn(t) from t0 to t1 as a line of many short pieces. */
const strand = (fn, t0, t1, samples = 240) => Array.from({ length: samples + 1 }, (_, i) => fn(t0 + ((t1 - t0) * i) / samples));
const polar = (r, t0, t1, samples = 240) => strand((t) => [r(t) * Math.cos(t), r(t) * Math.sin(t)], t0, t1, samples);
const circle = (cx, cy, r) => strand((t) => [cx + r * Math.cos(t), cy + r * Math.sin(t)], 0, TAU, 72);
const arc = (cx, cy, r, a0, a1) => strand((t) => [cx + r * Math.cos(t * RAD), cy + r * Math.sin(t * RAD)], a0, a1, 48);
const picture = (...polys) => ({ polys, dots: [] });

function eulerSpiral() {
  // x = the sum of cos(s^2), y = the sum of sin(s^2): worked out step by step from the middle outwards
  const half = [[0, 0]];
  const step = 0.01;
  for (let s = step / 2; s < 4; s += step) {
    const [x, y] = half[half.length - 1];
    half.push([x + Math.cos(s * s) * step, y + Math.sin(s * s) * step]);
  }
  const thin = half.filter((_, i) => i % 3 === 0);
  return [...thin.slice(1).reverse().map(([x, y]) => [-x, -y]), ...thin];
}

function reuleaux(sides) {
  // a coin of constant width: every side is an arc around the corner opposite to it
  const corner = (i) => [Math.cos((90 + (360 * i) / sides) * RAD), Math.sin((90 + (360 * i) / sides) * RAD)];
  const out = [];
  for (let i = 0; i < sides; i++) {
    const [cx, cy] = corner(i + (sides + 1) / 2);
    const [ax, ay] = corner(i);
    const [bx, by] = corner(i + 1);
    const radius = Math.hypot(ax - cx, ay - cy);
    const a0 = Math.atan2(ay - cy, ax - cx);
    let a1 = Math.atan2(by - cy, bx - cx);
    if (a1 < a0) a1 += TAU;
    for (let k = i ? 1 : 0; k <= 16; k++) out.push([cx + radius * Math.cos(a0 + ((a1 - a0) * k) / 16), cy + radius * Math.sin(a0 + ((a1 - a0) * k) / 16)]);
  }
  return out;
}

function flowerOfLife() {
  // nineteen circles of one size, each through the middles of its neighbours, in a ring
  const polys = [circle(0, 0, 3)];
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (Math.abs(q + r) > 2) continue;
      polys.push(circle(q + r / 2, (r * Math.sqrt(3)) / 2, 1));
    }
  }
  return { polys, dots: [] };
}

// [id, name, the drawing, search words, extra fields]
const CURVES = [
  ['witch-of-agnesi', 'Witch of Agnesi', () => picture(strand((t) => [t, 3 / (1 + t * t)], -3.6, 3.6)), 'bell hill bump'],
  ['strophoid', 'Strophoid', () => picture(strand((t) => [(t * t - 1) / (t * t + 1), (t * (t * t - 1)) / (t * t + 1)], -2.3, 2.3)), 'loop knot ribbon'],
  ['catenary', 'Catenary', () => picture(strand((t) => [t, Math.cosh(t)], -1.9, 1.9)), 'hanging chain rope arch u'],
  ['involute', 'Involute', () => picture(circle(0, 0, 1), strand((t) => [Math.cos(t) + t * Math.sin(t), Math.sin(t) - t * Math.cos(t)], 0, 3 * Math.PI)), 'unwinding string spiral gear tooth'],
  ['hyperbolic-spiral', 'Hyperbolic spiral', () => picture(polar((t) => 1 / t, 0.7, 6 * Math.PI, 360)), 'reciprocal spiral inward'],
  ['euler-spiral', 'Euler spiral', () => picture(eulerSpiral()), 'clothoid cornu double spiral road bend'],
  ['kappa-curve', 'Kappa curve', () => picture(strand((t) => [(Math.cos(t) * Math.cos(t)) / Math.sin(t), Math.cos(t)], 0.3, Math.PI - 0.3), strand((t) => [(Math.cos(t) * Math.cos(t)) / Math.sin(t), Math.cos(t)], Math.PI + 0.3, TAU - 0.3)), 'gutschoven cross'],
  ['trisectrix', 'Trisectrix', () => picture(polar((t) => 0.5 * (4 * Math.cos(t) - 1 / Math.cos(t)), -1.25, 1.25)), 'maclaurin loop angle in three'],
  ['serpentine-curve', 'Serpentine curve', () => picture(strand((t) => [t, (2.4 * t) / (1 + t * t)], -4.2, 4.2)), 'snake s newton'],
  ['pear-curve', 'Pear curve', () => picture(strand((t) => [0.75 * Math.cos(t) * (1 + Math.sin(t)), 1 + Math.sin(t)], -Math.PI / 2, 1.5 * Math.PI)), 'piriform drop teardrop'],
  ['bean-curve', 'Bean curve', () => picture(polar((t) => Math.sin(t) ** 3 + Math.cos(t) ** 3, 0, Math.PI)), 'kidney'],
  ['dumbbell-curve', 'Dumbbell curve', () => picture(strand((t) => [Math.cos(t), Math.cos(t) * Math.cos(t) * Math.sin(t)], 0, TAU)), 'bow tie barbell'],
  ['bifolium', 'Bifolium', () => picture(polar((t) => 4 * Math.sin(t) * Math.cos(t) * Math.cos(t), 0, Math.PI)), 'two leaves double leaf'],
  ['durer-folium', 'D\u00FCrer folium', () => picture(polar((t) => Math.sin(t / 2), 0, 2 * TAU, 360)), 'durer leaf loop inside loop'],
  ['cornoid', 'Cornoid', () => picture(strand((t) => [Math.cos(t) * (1 - 2 * Math.sin(t) * Math.sin(t)), Math.sin(t) * (1 + 2 * Math.cos(t) * Math.cos(t))], 0, TAU)), 'horns'],
  ['semicubical-parabola', 'Semicubical parabola', () => picture(strand((t) => [t * t, t * t * t], -1.25, 1.25)), 'neile cusp spike'],
  ['cubic-curve', 'Cubic curve', () => picture(strand((t) => [t, 1.6 * (t * t * t - t)], -1.45, 1.45)), 'x cubed s bend graph'],
  ['sinc-wave', 'Sinc wave', () => picture(strand((t) => [t, 7 * (t === 0 ? 1 : Math.sin(t) / t)], -16, 16, 320)), 'sine over x pulse signal'],
  ['freeth-nephroid', 'Freeth nephroid', () => picture(polar((t) => 1 + 2 * Math.sin(t / 2), 0, 2 * TAU, 360)), 'loop inside loop'],
  ['cayley-sextic', 'Cayley sextic', () => picture(polar((t) => 4 * Math.cos(t / 3) ** 3, 0, 3 * Math.PI, 300)), 'loop inside heart'],
  ['reuleaux-pentagon', 'Reuleaux pentagon', () => picture(reuleaux(5)), 'constant width coin rounded five'],
  ['reuleaux-heptagon', 'Reuleaux heptagon', () => picture(reuleaux(7)), 'constant width coin rounded seven fifty pence'],
  ['arbelos', 'Arbelos', () => picture(arc(0, 0, 1, 0, 180), arc(-0.4, 0, 0.6, 0, 180), arc(0.6, 0, 0.4, 0, 180)), 'three half circles shoemaker knife archimedes'],
  ['salinon', 'Salinon', () => picture(arc(0, 0, 1, 0, 180), arc(-0.7, 0, 0.3, 0, 180), arc(0.7, 0, 0.3, 0, 180), arc(0, 0, 0.4, 180, 360)), 'four half circles salt cellar archimedes'],
  ['seed-of-life', 'Seed of life', () => picture(circle(0, 0, 1), ...Array.from({ length: 6 }, (_, i) => circle(Math.cos(i * 60 * RAD), Math.sin(i * 60 * RAD), 1))), 'seven circles flower sacred'],
  ['flower-of-life', 'Flower of life', flowerOfLife, 'nineteen circles sacred pattern', { count: 290 }],
  ['trochoid', 'Trochoid', () => picture(strand((t) => [t - 1.7 * Math.sin(t), -1.7 * Math.cos(t)], -Math.PI, 5 * Math.PI, 300)), 'loops rolling wheel cycloid with loops'],
  ['pursuit-spirals', 'Pursuit spirals', () => picture(
    [[1, 1], [-1, 1], [-1, -1], [1, -1], [1, 1]],
    ...Array.from({ length: 4 }, (_, k) => strand((t) => [Math.SQRT2 * Math.exp(-t) * Math.cos(t + (45 + 90 * k) * RAD), Math.SQRT2 * Math.exp(-t) * Math.sin(t + (45 + 90 * k) * RAD)], 0, 3.4, 120)),
  ), 'four mice chase whirl square'],
  ['sine-and-cosine', 'Sine and cosine waves', () => picture(strand((t) => [t, Math.sin(t)], 0, 3 * Math.PI), strand((t) => [t, Math.cos(t)], 0, 3 * Math.PI)), 'two waves crossing graph'],
  ['exponential-curve', 'Exponential curve', () => picture(strand((t) => [t, Math.exp(t)], -3, 1.5)), 'growth rising e to the x graph'],
  ['logarithm-curve', 'Logarithm curve', () => picture(strand((t) => [t, Math.log(t)], 0.04, 5)), 'log slowing graph'],
  ['pythagoras-squares', 'Pythagoras squares', () => picture(
    [[0, 0], [4, 0], [0, 3], [0, 0]], [[0, 0], [4, 0], [4, -4], [0, -4], [0, 0]], [[0, 0], [0, 3], [-3, 3], [-3, 0], [0, 0]], [[4, 0], [7, 4], [3, 7], [0, 3]],
  ), 'right triangle theorem three squares'],
];

export const FAMOUS_SHAPES = CURVES.map(([id, name, draw, tags, extra]) => drawnShape({
  id, name, cat: 'curves', sub: 'Famous curves', draw, tags: `${tags} mathematics maths curve`, ...extra,
}));
