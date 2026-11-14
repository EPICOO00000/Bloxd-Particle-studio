// More curves: flat ones first, then curves that run through 3D. The tools
// they use are in shape-kit.js.

import {
  TAU, P, apportion, curve, memo, makeNet, netPoints, pathPoints, resample, drawnShape,
} from './shape-kit.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** A closed flat curve t -> [x, y] (t from 0 to 1) as a drawing. */
function loop(fn, samples = 360) {
  const poly = Array.from({ length: samples }, (_, i) => fn(i / samples));
  poly.push(poly[0]);
  return { polys: [poly], dots: [] };
}

/** An open one. */
const strand = (fn, samples = 240) => Array.from({ length: samples + 1 }, (_, i) => fn(i / samples));
const lines = (...polys) => ({ polys, dots: [] });

// A flat curve is a drawing: it is centred and fitted by itself, and it gets a
// particle at every corner and wherever it crosses itself.
const flatCurve = (id, name, draw, extra = {}) => drawnShape({ id, name, cat: 'curves', sub: 'More flat curves', draw, ...extra });

/** The S of an Euler spiral: it curls up tighter and tighter at both ends. */
function clothoid(reach) {
  const steps = 400;
  const half = [[0, 0]];
  let x = 0;
  let y = 0;
  for (let i = 1; i <= steps; i++) {
    const s = (reach * (i - 0.5)) / steps;
    x += (Math.cos(s * s) * reach) / steps;
    y += (Math.sin(s * s) * reach) / steps;
    half.push([x, y]);
  }
  return [...half.slice(1).reverse().map(([px, py]) => [-px, -py]), ...half];
}

/** A cog: `teeth` flat-topped teeth around a hub with a hole. */
function gear(teeth) {
  const outline = [];
  const step = TAU / teeth;
  for (let i = 0; i < teeth; i++) {
    for (const [f, r] of [[-0.3, 0.76], [-0.19, 1], [0.19, 1], [0.3, 0.76]]) {
      outline.push([Math.sin((i + f) * step) * r, Math.cos((i + f) * step) * r]);
    }
  }
  outline.push(outline[0]);
  const hole = Array.from({ length: 48 }, (_, i) => [Math.sin((TAU * i) / 48) * 0.34, Math.cos((TAU * i) / 48) * 0.34]);
  hole.push(hole[0]);
  return lines(outline, hole);
}

const FLAT = [
  flatCurve('limacon', 'Limaçon', (p) => loop((t) => {
    const r = 1 - p.loop + Math.cos(t * TAU);
    return [r * Math.sin(t * TAU), r * Math.cos(t * TAU)];
  }), { params: [P('loop', 'Inner loop', 0.2, 0.8, 0.05, 0.5)], tags: 'limacon snail loop', count: 64 }),
  flatCurve('astroid', 'Astroid', (p) => {
    const k = Math.round(p.points);
    return loop((t) => [
      (k - 1) * Math.sin(t * TAU) - Math.sin((k - 1) * t * TAU),
      (k - 1) * Math.cos(t * TAU) + Math.cos((k - 1) * t * TAU),
    ], 60 * k);
  }, { params: [P('points', 'Points', 3, 8, 1, 4)], tags: 'hypocycloid deltoid star curve', count: 56 }),
  flatCurve('butterfly-curve', 'Butterfly curve', () => loop((t) => {
    const a = t * TAU;
    const r = Math.exp(Math.sin(a)) - 2 * Math.cos(4 * a);
    return [r * Math.cos(a), r * Math.sin(a)];
  }, 720), { tags: 'wings', count: 120 }),
  flatCurve('fermat-spiral', 'Fermat spiral', (p) => lines(strand((t) => {
    const s = 2 * t - 1;
    const a = Math.abs(s) * p.turns * TAU;
    const r = Math.sign(s) * Math.sqrt(Math.abs(s));
    return [r * Math.cos(a), r * Math.sin(a)];
  }, 480)), { params: [P('turns', 'Turns', 1, 4, 0.5, 1.5)], tags: 'double two arms', count: 70 }),
  flatCurve('double-spiral', 'Double spiral', (p) => lines(clothoid(p.curl)), {
    params: [P('curl', 'Curl', 2, 4, 0.25, 3)], tags: 'clothoid euler scroll s', count: 70,
  }),
  flatCurve('harmonograph', 'Harmonograph', () => lines(strand((t) => {
    const s = t * 4 * TAU;
    const fade = Math.exp(-1.9 * t);
    return [Math.sin(s + 1.2) * fade, Math.sin(1.5 * s) * fade];
  }, 900)), { tags: 'pendulum fading lissajous', count: 120 }),
  flatCurve('loop-wave', 'Loop wave', (p) => {
    const k = Math.round(p.loops);
    return lines(strand((t) => {
      const s = (t * (k + 1) - 0.5) * TAU;
      return [0.42 * s - 1.1 * Math.sin(s), -Math.cos(s)];
    }, 80 * (k + 1)));
  }, { params: [P('loops', 'Loops', 2, 6, 1, 3)], tags: 'trochoid curl coil cord', count: 76 }),
  flatCurve('heartbeat', 'Heartbeat', 'M-5,0 L-2.4,0 L-1.8,0.7 L-1.2,0 L-0.6,0 L-0.2,-1 L0.5,4 L1.2,-1.8 L1.6,0 L2.2,0 L2.9,1 L3.6,0 L5,0', {
    tags: 'pulse ecg life line', count: 60,
  }),
  flatCurve('bell-curve', 'Bell curve', () => lines(strand((t) => [6 * t - 3, 2.6 * Math.exp(-((6 * t - 3) ** 2) / 1.6)])), {
    tags: 'hill hump normal gauss', count: 44,
  }),
  flatCurve('parabola', 'Parabola', () => lines(strand((t) => [2 * t - 1, 2 * (2 * t - 1) ** 2])), { tags: 'u bowl', count: 40 }),
  flatCurve('hyperbola', 'Hyperbola', () => lines(
    strand((t) => [Math.cosh(2.6 * t - 1.3) - 0.45, Math.sinh(2.6 * t - 1.3)]),
    strand((t) => [0.45 - Math.cosh(2.6 * t - 1.3), Math.sinh(2.6 * t - 1.3)]),
  ), { tags: 'two branches', count: 56 }),
  flatCurve('fading-wave', 'Fading wave', (p) => lines(strand((t) => [t, 0.5 * Math.exp(-3 * t) * Math.sin(Math.round(p.waves) * t * TAU)], 480)), {
    params: [P('waves', 'Waves', 2, 8, 1, 4)], tags: 'damped echo', count: 64,
  }),
  flatCurve('wave-packet', 'Wave packet', (p) => lines(strand((t) => [
    t, 0.5 * Math.exp(-(((t - 0.5) / 0.26) ** 2)) * Math.cos(Math.round(p.waves) * (t - 0.5) * TAU),
  ], 600)), { params: [P('waves', 'Waves', 3, 12, 1, 5)], tags: 'pulse burst signal', count: 72 }),
  flatCurve('string-art', 'String art', (p) => {
    const k = Math.round(p.lines);
    return lines(...Array.from({ length: k + 1 }, (_, i) => [[i / k, 0], [0, 1 - i / k]]));
  }, { params: [P('lines', 'Lines', 4, 12, 1, 8)], tags: 'threads net corner' }),
  flatCurve('fish-curve', 'Fish curve', () => loop((t) => [
    Math.cos(t * TAU) - (Math.sin(t * TAU) ** 2) / Math.SQRT2, Math.cos(t * TAU) * Math.sin(t * TAU),
  ]), { count: 56 }),
  flatCurve('star-knot', 'Star knot', (p) => {
    const k = 2 * Math.round((p.loops - 1) / 2) + 1; // an even number would not close
    return loop((t) => {
      const r = 1 + 0.45 * Math.cos(k * t * TAU);
      return [r * Math.sin(2 * t * TAU), r * Math.cos(2 * t * TAU)];
    }, 120 * k);
  }, { params: [P('loops', 'Loops', 5, 9, 2, 5)], tags: 'cinquefoil celtic knot', count: 110 }),
  flatCurve('peanut-curve', 'Peanut curve', (p) => loop((t) => {
    const a = t * TAU;
    const w = p.waist;
    const r = Math.sqrt(w * w * Math.cos(2 * a) + Math.sqrt(1 - (w ** 4) * Math.sin(2 * a) ** 2));
    return [r * Math.cos(a), r * Math.sin(a)];
  }), { params: [P('waist', 'Waist', 0.6, 0.98, 0.02, 0.94)], tags: 'cassini oval dumbbell', count: 52 }),
  flatCurve('polygon-spiral', 'Polygon spiral', (p) => {
    const sides = Math.round(p.sides);
    const corners = Math.round(sides * p.turns);
    return lines(Array.from({ length: corners + 1 }, (_, j) => {
      const r = (j + 1) / (corners + 1);
      return [Math.sin((TAU * j) / sides) * r, Math.cos((TAU * j) / sides) * r];
    }));
  }, { params: [P('sides', 'Sides', 3, 8, 1, 6), P('turns', 'Turns', 2, 6, 0.5, 4)], tags: 'hexagon triangle' }),
  flatCurve('whirl', 'Whirl', (p) => {
    const sides = Math.round(p.sides);
    let ring = Array.from({ length: sides }, (_, i) => [Math.sin((TAU * (i + 0.5)) / sides), -Math.cos((TAU * (i + 0.5)) / sides)]);
    const polys = [];
    for (let level = 0; level < Math.round(p.levels); level++) {
      polys.push([...ring, ring[0]]);
      ring = ring.map((v, i) => {
        const w = ring[(i + 1) % sides];
        return [v[0] + (w[0] - v[0]) * p.twist, v[1] + (w[1] - v[1]) * p.twist];
      });
    }
    return lines(...polys);
  }, {
    params: [P('sides', 'Sides', 3, 6, 1, 4), P('levels', 'Levels', 3, 9, 1, 5), P('twist', 'Twist', 0.1, 0.5, 0.05, 0.2)],
    tags: 'nested twisted squares pursuit',
  }),
  flatCurve('gear', 'Gear', (p) => gear(Math.round(p.teeth)), { params: [P('teeth', 'Teeth', 6, 16, 1, 10)], tags: 'cog wheel machine settings' }),
  flatCurve('wavy-spiral', 'Wavy spiral', (p) => lines(strand((t) => {
    const a = t * p.turns * TAU;
    const r = (0.08 + 0.92 * t) * (1 + 0.1 * Math.sin(8 * a));
    return [r * Math.sin(a), r * Math.cos(a)];
  }, 900)), { params: [P('turns', 'Turns', 2, 5, 0.5, 3)], tags: 'frilly ripple', count: 110 }),
  flatCurve('circle-flower', 'Circle flower', (p) => {
    const k = Math.round(p.circles);
    // every circle starts at the middle, so they all share that one particle
    return lines(...Array.from({ length: k }, (_, i) => {
      const a = (TAU * i) / k;
      const circle = Array.from({ length: 72 }, (_, j) => [Math.sin(a) - Math.sin(a + (TAU * j) / 72), Math.cos(a) - Math.cos(a + (TAU * j) / 72)]);
      circle[0] = [0, 0];
      return [...circle, [0, 0]];
    }));
  }, { params: [P('circles', 'Circles', 3, 8, 1, 6)], tags: 'rosette rings seed of life', count: 120 }),
];

// ---------------------------------------------------------------- curves in 3D

const VIVIANI = (() => {
  const half = (sign) => Array.from({ length: 121 }, (_, i) => {
    const t = (Math.PI * i) / 120;
    return [Math.cos(2 * t), sign * Math.sin(t), sign * Math.sin(2 * t)];
  });
  const node = [1, 0, 0];
  const chains = [half(1), half(-1)];
  for (const c of chains) {
    c[0] = node;
    c[120] = node;
  }
  return makeNet([node], chains);
})();

const LORENZ = (() => {
  let [x, y, z] = [0.1, 0, 0];
  const dt = 0.004;
  const path = [];
  for (let i = 0; i < 3900; i++) {
    const dx = 10 * (y - x);
    const dy = x * (28 - z) - y;
    const dz = x * y - (8 / 3) * z;
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    if (i >= 1500) path.push([x, z, y]); // the wings face the front
  }
  const lo = [0, 1, 2].map((c) => Math.min(...path.map((p) => p[c])));
  const hi = [0, 1, 2].map((c) => Math.max(...path.map((p) => p[c])));
  const half = Math.max(...[0, 1, 2].map((c) => hi[c] - lo[c])) / 2;
  return path.map((p) => p.map((v, c) => (v - (lo[c] + hi[c]) / 2) / half));
})();

/** Corner number `index` of the Hilbert curve that fills a cube of 2^bits points a side. */
function hilbertCorner(index, bits) {
  const X = [0, 0, 0];
  for (let i = 0; i < 3 * bits; i++) {
    if ((index >> (3 * bits - 1 - i)) & 1) X[i % 3] |= 1 << (bits - 1 - Math.floor(i / 3));
  }
  let t = X[2] >> 1;
  for (let i = 2; i > 0; i--) X[i] ^= X[i - 1];
  X[0] ^= t;
  for (let Q = 2; Q !== 1 << bits; Q <<= 1) {
    const mask = Q - 1;
    for (let i = 2; i >= 0; i--) {
      if (X[i] & Q) X[0] ^= mask;
      else {
        t = (X[0] ^ X[i]) & mask;
        X[0] ^= t;
        X[i] ^= t;
      }
    }
  }
  return X;
}

const HILBERT3 = Array.from({ length: 64 }, (_, i) => hilbertCorner(i, 2).map((v) => -1 + (2 * v) / 3));

const wovenTube = memo((k, rows) => {
  const at = (row, f) => [Math.cos((TAU * f) / (2 * k)), -1 + (2 * row) / rows, Math.sin((TAU * f) / (2 * k))];
  const nodes = [];
  const chains = [];
  for (let row = 0; row <= rows; row++) {
    for (let i = 0; i < k; i++) {
      const f = 2 * i + row;
      nodes.push(at(row, f));
      if (row === rows) continue;
      for (const lean of [1, -1]) chains.push(Array.from({ length: 5 }, (_, s) => at(row + s / 4, f + (lean * s) / 4)));
    }
  }
  return makeNet(nodes, chains);
});

const SPACE = [
  { id: 'viviani', name: 'Viviani curve', count: 70, min: 7, tags: 'figure eight ball', gen: (n) => netPoints(VIVIANI, n) },
  {
    id: 'eight-knot', name: 'Figure-eight knot', count: 110, min: 16,
    gen: (n) => curve((t) => {
      const r = (2 + Math.cos(2 * t * TAU)) / 3;
      return [r * Math.sin(3 * t * TAU), r * Math.cos(3 * t * TAU), 0.45 * Math.sin(4 * t * TAU)];
    }, n, true, 720),
  },
  {
    id: 'lissajous3d', name: '3D Lissajous', count: 120, min: 12,
    params: [P('a', 'Loops across', 1, 5, 1, 2), P('b', 'Loops up', 1, 5, 1, 3), P('c', 'Loops deep', 1, 5, 1, 5)],
    gen: (n, p) => {
      const g = gcd(gcd(Math.round(p.a), Math.round(p.b)), Math.round(p.c));
      const [a, b, c] = [p.a, p.b, p.c].map((v) => Math.round(v) / g);
      return curve((t) => [Math.sin(a * t * TAU), Math.sin(b * t * TAU + 0.7), Math.sin(c * t * TAU + 1.9)], n, true, 240 * Math.max(a, b, c));
    },
  },
  {
    id: 'borromean', name: 'Borromean rings', count: 96, min: 12, tags: 'three linked ovals',
    gen: (n) => apportion([1, 1, 1], n).flatMap((count, i) => curve((t) => {
      const oval = [Math.cos(t * TAU), 0.56 * Math.sin(t * TAU), 0];
      return [oval[i % 3], oval[(i + 2) % 3], oval[(i + 1) % 3]];
    }, count, true, 240)),
  },
  {
    id: 'linked-rings', name: 'Linked rings', count: 72, min: 8, tags: 'chain links',
    params: [P('rings', 'Rings', 2, 6, 1, 2)],
    gen: (n, p) => {
      const k = Math.round(p.rings);
      const r = 1 / (1 + (k - 1) * 0.68); // each ring reaches a third of the way into the next
      return apportion(Array(k).fill(1), n).flatMap((count, i) => Array.from({ length: count }, (_, j) => {
        const a = (TAU * (j + 0.5)) / count;
        const x = -1 + r + i * 1.36 * r + r * Math.cos(a);
        return i % 2 ? [x, 0, r * Math.sin(a)] : [x, r * Math.sin(a), 0];
      }));
    },
  },
  { id: 'lorenz', name: 'Lorenz attractor', count: 150, min: 24, tags: 'chaos butterfly', gen: (n) => resample(LORENZ, n) },
  {
    id: 'square-helix', name: 'Square helix', count: 90, min: 9,
    params: [P('turns', 'Turns', 1, 6, 0.5, 3)],
    gen: (n, p) => {
      const corners = Math.round(p.turns * 4);
      const at = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
      return pathPoints(Array.from({ length: corners + 1 }, (_, j) => [at[j % 4][0], -1 + (2 * j) / corners, at[j % 4][1]]), n);
    },
  },
  {
    id: 'hourglass-spiral', name: 'Hourglass spiral', count: 100, min: 10,
    params: [P('turns', 'Turns', 3, 10, 0.5, 6)],
    gen: (n, p) => curve((t) => {
      const r = 0.12 + 0.88 * Math.abs(2 * t - 1);
      return [r * Math.cos(t * p.turns * TAU), -1 + 2 * t, r * Math.sin(t * p.turns * TAU)];
    }, n, false, 120 * Math.ceil(p.turns)),
  },
  { id: 'hilbert3d', name: '3D Hilbert curve', count: 127, min: 64, tags: 'cube maze path', gen: (n) => pathPoints(HILBERT3, n) },
  {
    id: 'woven-tube', name: 'Woven tube', count: 105, min: 25, tags: 'lattice basket diamond net',
    params: [P('strands', 'Strands', 3, 10, 1, 5), P('rows', 'Rows', 2, 10, 1, 4)],
    gen: (n, p) => netPoints(wovenTube(Math.round(p.strands), Math.round(p.rows)), n),
  },
];

for (const s of SPACE) Object.assign(s, { cat: 'curves', group: 'solid', sub: 'More curves in 3D' });

export const CURVE_SHAPES = [...FLAT, ...SPACE];
