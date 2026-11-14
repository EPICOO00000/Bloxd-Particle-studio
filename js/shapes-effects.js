// More effects: magic circles (flat, to lay on the ground or stand up), rings
// and shields, the elements, and small things that float in the air. The tools
// they use are in shape-kit.js.

import {
  TAU, RAD, P, apportion, curve, ring, memo, scatter, dice, netPoints, pathPoints, lathe,
  parsePath, placeDrawing, joinDrawings, fitDrawing, drawingNet, drawnShape, spin, around, scallop,
  joinNets, mapNet, fitNet, sketch, mix, netPart, smooth, ballPoints,
} from './shape-kit.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const equal = (parts, n) => apportion(Array(parts).fill(1), n);

// ---------------------------------------------------------------- magic circles

/** A star drawn in one go: every corner is joined to the one `skip` further around. */
function starPath(k, r, skip) {
  const g = gcd(k, skip);
  let d = '';
  for (let c = 0; c < g; c++) {
    d += `M${around(0, 0, r, 90 + (360 * c) / k)} `;
    for (let j = 1; j < k / g; j++) d += `L${around(0, 0, r, 90 + (360 * (c + j * skip)) / k)} `;
    d += 'Z ';
  }
  return d;
}

/** Small marks set around a circle, each turned to face outwards. */
function marksAround(marks, count, r) {
  return joinDrawings(...Array.from({ length: count }, (_, i) => {
    const deg = 90 - (360 * i) / count;
    return placeDrawing(parsePath(marks[i % marks.length]), { x: r * Math.cos(deg * RAD), y: r * Math.sin(deg * RAD), turn: deg - 90 });
  }));
}

const RUNE_MARKS = [
  'M0,-0.5 L0,0.5 M0,0.5 L0.4,0.1',
  'M-0.35,0.5 L0,-0.5 L0.35,0.5',
  'M-0.35,-0.5 L0.35,0.5 M-0.35,0.5 L0.35,-0.5',
  'M-0.3,0.5 L0.3,0 L-0.3,-0.5',
  'M-0.35,0 L0,0.5 L0.35,0 L0,-0.5 Z',
  'M0,-0.5 L0,0.5 M-0.35,0.15 L0.35,0.15',
];

const seal = (id, name, draw, extra = {}) => drawnShape({ id, name, cat: 'effects', sub: 'Magic circles', draw, ...extra });

const CIRCLES = [
  seal('magic-circle', 'Magic circle', (p) => {
    const k = Math.round(p.points);
    return `O0,0 5 O0,0 4.2 ${starPath(k, 4.2, k < 7 ? 2 : 3)} O0,0 1.2`;
  }, { params: [P('points', 'Points', 5, 9, 1, 5)], tags: 'spell rune star summon' }),
  seal('rune-circle', 'Rune circle', () => joinDrawings(parsePath('O0,0 5 O0,0 3.5 O0,0 1.6 D0,0'), marksAround(RUNE_MARKS, 12, 4.25)), {
    tags: 'spell magic letters ring',
  }),
  seal('summoning-circle', 'Summoning circle', () => {
    let d = `O0,0 4.4 ${starPath(5, 4.4, 2)} O0,0 1`;
    for (let i = 0; i < 5; i++) d += ` D${around(0, 0, 5.2, 90 + 72 * i)}`;
    return d;
  }, { tags: 'pentagram spell magic demon ritual' }),
  seal('hexagram-seal', 'Hexagram seal', () => {
    let d = `O0,0 5 O0,0 4.4 ${starPath(6, 4.4, 2)} O0,0 1.4`;
    for (let i = 0; i < 6; i++) d += ` D${around(0, 0, 3.2, 60 * i)}`;
    return d;
  }, { tags: 'star magic circle solomon' }),
  seal('alchemy-circle', 'Alchemy circle', 'O0,0 5 M0,5 L-4.33,-2.5 L4.33,-2.5 Z M-2.01,-2.5 L-2.01,1.52 L2.01,1.52 L2.01,-2.5 O0,-0.49 1.5', {
    tags: 'transmutation magic stone triangle square',
  }),
  seal('clock-circle', 'Clock circle', () => {
    let d = 'O0,0 5 M0,0 L0,3.5 M0,0 L2.3,-1.3 D0,0';
    for (let i = 0; i < 12; i++) d += ` M${around(0, 0, i % 3 ? 4.3 : 3.9, 30 * i)} L${around(0, 0, 4.7, 30 * i)}`;
    return d;
  }, { tags: 'time magic watch dial' }),
  seal('sun-seal', 'Sun seal', () => {
    let d = `M${around(0, 0, 5, 90)}`;
    for (let i = 1; i < 24; i++) d += ` L${around(0, 0, i % 2 ? 3.7 : 5, 90 + 15 * i)}`;
    return `${d} Z O0,0 2.9 O0,0 1.1`;
  }, { tags: 'magic circle rays day light' }),
  seal('moon-seal', 'Moon seal', 'O0,0 5 A-0.5,0 3.1 50 310 A1.155,0 2.399 278.1 81.9 Z D2.4,1.7 D3.3,-0.5 D2.3,-2.6 D1.3,0.2', {
    tags: 'magic circle night crescent stars',
  }),
  seal('eye-seal', 'Eye seal', 'O0,0 5 M-3.9,0 B3.9,0 -0.5 B-3.9,0 -0.5 O0,0 1.5 D0,0 M0,2.5 L0,3.7 M-1.9,2.1 L-2.7,3.1 M1.9,2.1 L2.7,3.1 M0,-2.5 L0,-3.7 M-1.9,-2.1 L-2.7,-3.1 M1.9,-2.1 L2.7,-3.1', {
    tags: 'magic circle all seeing watch',
  }),
  seal('compass-rose', 'Compass rose', () => {
    let d = 'O0,0 5 ';
    d += `M${around(0, 0, 4.4, 90)}`;
    for (let i = 1; i < 8; i++) d += ` L${around(0, 0, i % 2 ? 1.2 : 4.4, 90 + 45 * i)}`;
    d += ' Z';
    for (let i = 0; i < 4; i++) d += ` M${around(0, 0, 1.7, 45 + 90 * i)} L${around(0, 0, 3.4, 45 + 90 * i)}`;
    return d;
  }, { tags: 'north map direction wind' }),
  seal('octagram-seal', 'Octagram seal', () => `O0,0 5 ${starPath(8, 5, 2)} O0,0 2.5 D0,0`, { tags: 'magic circle star eight squares' }),
  seal('triangle-seal', 'Triangle seal', 'O0,0 5 M0,5 L-4.33,-2.5 L4.33,-2.5 Z M-2.165,1.25 L2.165,1.25 L0,-2.5 Z D0,2.6 D-2.2,-1.3 D2.2,-1.3', {
    tags: 'magic circle triforce',
  }),
  seal('flower-seal', 'Flower seal', () => {
    let d = 'O0,0 5';
    for (let i = 0; i < 6; i++) d += ` M0,0 B${around(0, 0, 5, 90 + 60 * i)} 0.268 B0,0 0.268`;
    return d;
  }, { tags: 'magic circle rosette petals hexafoil' }),
  seal('teleport-pad', 'Teleport pad', () => joinDrawings(parsePath('O0,0 5 O0,0 4.2 D0,0'), spin('M-1.1,3.3 L0,2.2 L1.1,3.3 M-1.1,2 L0,0.9 L1.1,2', 4)), {
    tags: 'warp portal arrows spawn',
  }),
  seal('mandala', 'Mandala', (p) => {
    const k = Math.round(p.petals);
    return joinDrawings(
      parsePath(`O0,0 5 ${scallop(0, 0, 3.5, k, 0.8)} O0,0 0.9`),
      placeDrawing(parsePath(scallop(0, 0, 1.9, k, 0.8)), { turn: 180 / k }),
    );
  }, { params: [P('petals', 'Petals', 6, 12, 1, 8)], tags: 'flower lotus magic circle' }),
];

// ---------------------------------------------------------------- rings and shields

const crossedRings = memo((tilt) => {
  const s = sketch();
  for (const lean of [1, -1]) {
    for (const half of [0, 1]) {
      s.run(Array.from({ length: 31 }, (_, i) => {
        const a = -Math.PI / 2 + Math.PI * (half + i / 30);
        return [Math.cos(a) * Math.cos(tilt * RAD), lean * Math.cos(a) * Math.sin(tilt * RAD), Math.sin(a)];
      }));
    }
  }
  return s.net();
});

const auraNet = memo((k, width) => {
  const s = sketch();
  for (let i = 0; i < k; i++) {
    s.run(Array.from({ length: 31 }, (_, q) => {
      const f = (Math.PI * q) / 30;
      return [width * Math.sin(f) * Math.cos((TAU * i) / k), -Math.cos(f), width * Math.sin(f) * Math.sin((TAU * i) / k)];
    }));
  }
  return s.net();
});

// A wall of six-sided cells, bent around whoever stands behind it.
const FORCE_FIELD = (() => {
  const s = sketch();
  const drawn = new Set();
  const key = (p) => p.map((v) => Math.round(v * 1e3)).join(',');
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4 - (row % 2); col++) {
      const cx = Math.sqrt(3) * (col + (row % 2) / 2);
      const cy = 1.5 * row;
      const cell = Array.from({ length: 6 }, (_, i) => [cx + Math.cos((TAU * (i + 0.5)) / 6), cy + Math.sin((TAU * (i + 0.5)) / 6), 0]);
      cell.forEach((p, i) => {
        const q = cell[(i + 1) % 6];
        const edge = [key(p), key(q)].sort().join('|');
        if (drawn.has(edge)) return;
        drawn.add(edge);
        s.line(p, q);
      });
    }
  }
  const flat = fitNet(s.net());
  return fitNet(mapNet(flat, ([x, y]) => [Math.sin(x * 1.0), y, Math.cos(x * 1.0)]));
})();

const RINGS = [
  {
    id: 'ring-tower', name: 'Ring tower', count: 100, min: 6, tags: 'stack rings column',
    params: [P('rings', 'Rings', 2, 10, 1, 5)],
    gen: (n, p) => {
      const k = Math.round(p.rings);
      return equal(k, n).flatMap((count, j) => ring(count, 1, -1 + (2 * j) / (k - 1), j % 2 ? Math.PI / Math.max(1, count) : 0));
    },
  },
  {
    id: 'crossed-rings', name: 'Crossed rings', count: 80, min: 6, tags: 'x halo aura',
    params: [P('tilt', 'Tilt', 10, 80, 5, 35)],
    gen: (n, p) => netPoints(crossedRings(p.tilt), n),
  },
  {
    id: 'saw-ring', name: 'Saw ring', count: 72, min: 24, tags: 'teeth blade spikes gear',
    params: [P('teeth', 'Teeth', 6, 24, 1, 12), P('depth', 'Depth', 0.1, 0.6, 0.05, 0.3)],
    gen: (n, p) => {
      const k = Math.round(p.teeth);
      return pathPoints(Array.from({ length: 2 * k }, (_, i) => {
        const r = i % 2 ? 1 - p.depth : 1;
        return [r * Math.cos((Math.PI * i) / k), 0, r * Math.sin((Math.PI * i) / k)];
      }), n, true);
    },
  },
  {
    id: 'solar-system', name: 'Solar system', count: 110, min: 20, tags: 'planets orbits sun space',
    gen: (n) => mix(n, [
      { weight: 1.6, gen: (k) => ballPoints(k, 0.17) },
      ...[0.45, 0.72, 1].flatMap((r, i) => {
        const a = 0.9 + i * 2.3;
        return [
          { weight: 2.2 * r, gen: (k) => ring(k, r, 0, a + Math.PI / Math.max(1, k)) },
          { fixed: 4, weight: 0, gen: (k) => ballPoints(k, 0.07, [r * Math.cos(a), 0, r * Math.sin(a)]) },
        ];
      }),
    ]),
  },
  {
    id: 'aura', name: 'Aura', count: 96, min: 10, tags: 'glow body shield lines',
    params: [P('lines', 'Lines', 3, 12, 1, 8), P('width', 'Width', 0.3, 1, 0.05, 0.6)],
    gen: (n, p) => netPoints(auraNet(Math.round(p.lines), p.width), n),
  },
  { id: 'force-field', name: 'Force field', count: 130, min: 46, tags: 'shield wall honeycomb barrier hexagons', gen: (n) => netPoints(FORCE_FIELD, n) },
  {
    id: 'tunnel', name: 'Tunnel', count: 110, min: 10, tags: 'warp wormhole rings',
    params: [P('rings', 'Rings', 3, 10, 1, 6)],
    gen: (n, p) => {
      const k = Math.round(p.rings);
      const radius = (j) => 1 - (0.66 * j) / (k - 1);
      return apportion(Array.from({ length: k }, (_, j) => radius(j)), n).flatMap((count, j) => Array.from({ length: count }, (_, i) => {
        const a = (TAU * (i + (j % 2) / 2)) / count;
        return [radius(j) * Math.cos(a), radius(j) * Math.sin(a), 1 - (2 * j) / (k - 1)];
      }));
    },
  },
  {
    id: 'gimbal', name: 'Gimbal', count: 96, min: 10, tags: 'gyroscope nested rings',
    gen: (n) => mix(n, [
      { weight: 1, gen: (k) => Array.from({ length: k }, (_, i) => [Math.cos((TAU * i) / k), Math.sin((TAU * i) / k), 0]) },
      { weight: 0.78, gen: (k) => Array.from({ length: k }, (_, i) => [0, 0.78 * Math.cos((TAU * (i + 0.5)) / k), 0.78 * Math.sin((TAU * (i + 0.5)) / k)]) },
      { weight: 0.56, gen: (k) => Array.from({ length: k }, (_, i) => [0.56 * Math.cos((TAU * (i + 0.25)) / k), 0, 0.56 * Math.sin((TAU * (i + 0.25)) / k)]) },
      { fixed: 1, weight: 0, gen: () => [[0, 0, 0]] },
    ]),
  },
  {
    id: 'atom3d', name: '3D atom', count: 110, min: 16, tags: 'energy orbit nucleus science',
    gen: (n) => mix(n, [
      { weight: 1.2, gen: (k) => ballPoints(k, 0.16) },
      ...[0, 1, 2].map((i) => ({
        weight: 2,
        gen: (k) => Array.from({ length: k }, (_, j) => {
          // a circle that lies back by 62 degrees, turned to one of three sides
          const [c, s] = [Math.cos((TAU * i) / 3 + 0.5), Math.sin((TAU * i) / 3 + 0.5)];
          const a = (TAU * (j + i / 3)) / k;
          const [u, v, w] = [Math.cos(a), Math.sin(a) * Math.cos(62 * RAD), Math.sin(a) * Math.sin(62 * RAD)];
          return [u * c - v * s, u * s + v * c, w];
        }),
      })),
    ]),
  },
];

// ---------------------------------------------------------------- elements

const boltNet = memo((seed) => {
  const rnd = dice(seed * 7 + 3);
  const s = sketch();
  const steps = 7;
  const main = Array.from({ length: steps + 1 }, (_, j) => {
    const end = j === 0 || j === steps;
    return [end ? 0 : (rnd() - 0.5) * 0.9, 1 - (2 * j) / steps, end ? 0 : (rnd() - 0.5) * 0.5];
  });
  s.path(main);
  for (const start of [2, 4]) {
    let p = main[start];
    const side = p[0] > 0 ? 1 : -1;
    for (let j = 0; j < (start === 2 ? 3 : 2); j++) {
      const q = [p[0] + side * (0.2 + 0.2 * rnd()), p[1] - 0.2 - 0.15 * rnd(), p[2] + (rnd() - 0.5) * 0.3];
      s.line(p, q);
      p = q;
    }
  }
  return fitNet(s.net());
});

const ICE = (() => {
  const s = sketch();
  const spike = (cx, cz, base, tip) => {
    const foot = [0, 1, 2].map((i) => [cx + base * Math.cos((TAU * i) / 3 + cx * 5), -1, cz + base * Math.sin((TAU * i) / 3 + cx * 5)]);
    s.path(foot, true);
    foot.forEach((p) => s.line(p, tip));
  };
  spike(0, 0, 0.2, [0.05, 1, 0]);
  const rnd = dice(5);
  for (let i = 0; i < 6; i++) {
    const a = (TAU * i) / 6 + 0.4;
    const lean = 0.55 + 0.4 * rnd();
    spike(0.42 * Math.cos(a), 0.42 * Math.sin(a), 0.13, [lean * Math.cos(a), -0.2 + 0.7 * rnd(), lean * Math.sin(a)]);
  }
  return s.net();
})();

const WIND = (() => {
  const streak = (d, y, z, size, flip) => mapNet(drawingNet(fitDrawing(parsePath(d))), ([u, v]) => [u * size - 0.05, y + (flip ? -v : v) * size, z]);
  return joinNets(
    streak('M-6,0 L2.4,0 A2.4,1.4 1.4 -90 180', 0.42, -0.3, 0.92, false),
    streak('M-5,0 L3.4,0 A3.4,-1.1 1.1 90 -150', -0.12, 0.3, 0.8, false),
    streak('M-3,0 L1.6,0 A1.6,-0.9 0.9 90 -120', -0.62, -0.05, 0.5, false),
  );
})();

const clamp = (profile) => profile.map(([r, y]) => [Math.max(0, Math.min(1, r)), Math.max(-1, Math.min(1, y))]);
const MUSHROOM_CLOUD = clamp(smooth([[0.5, -1], [0.3, -0.92], [0.2, -0.65], [0.2, 0.05], [0.34, 0.2], [0.8, 0.26], [1, 0.48], [0.88, 0.78], [0.5, 0.96], [0, 1]], 6));

const CRACKS = (() => {
  const s = sketch();
  const rnd = dice(21);
  for (let i = 0; i < 5; i++) {
    let a = (TAU * i) / 5 + 0.3 * rnd();
    let p = [0, 0, 0];
    for (let j = 1; j <= 4; j++) {
      a += rnd() - 0.5;
      const q = [p[0] + 0.25 * Math.cos(a), 0, p[2] + 0.25 * Math.sin(a)];
      s.line(p, q);
      if (j === 2) {
        const b = a + (rnd() < 0.5 ? 0.9 : -0.9);
        s.line(q, [q[0] + 0.18 * Math.cos(b), 0, q[2] + 0.18 * Math.sin(b)]);
      }
      p = q;
    }
  }
  return fitNet(s.net());
})();

const BIG_WAVE = (() => {
  const box = [0, 3.2, 5.2];
  const side = fitDrawing(parsePath('M-5,0 C-2.4,0.1 -0.6,1.6 0.6,4 C1.6,6 3.6,6.6 5,5 C3.8,5.4 3,4.6 2.8,3.4 C2.6,2 3.4,0.6 5,0'), box);
  const depths = [-0.8, -0.4, 0, 0.4, 0.8];
  const s = sketch();
  for (const z of depths) s.add(drawingNet(side, (x, y) => [x, y, z]));
  const lip = [5 / box[2], (5 - box[1]) / box[2]];
  for (let i = 1; i < depths.length; i++) s.line([...lip, depths[i - 1]], [...lip, depths[i]]); // the crest
  return s.net();
})();

const VOLCANO = [[1, -1], [0.62, -0.5], [0.36, -0.05], [0.26, 0.15]];
const lavaArc = (i) => (t) => {
  const a = (TAU * i) / 5 + 0.4;
  const u = 0.08 + 0.92 * t;
  return [0.72 * u * Math.cos(a), 0.15 + 3.2 * u * (1 - u) - 0.5 * u, 0.72 * u * Math.sin(a)];
};

const FIRE = Array.from({ length: 41 }, (_, i) => [0.5 * Math.sin(Math.PI * (i / 40) ** 0.7) ** 0.9, -0.85 + 1.85 * (i / 40)]);
const LOGS = (() => {
  const s = sketch();
  for (let i = 0; i < 5; i++) {
    const a = (TAU * i) / 5 + 0.2;
    s.line([0.2 * Math.cos(a), -0.88, 0.2 * Math.sin(a)], [0.95 * Math.cos(a), -1, 0.95 * Math.sin(a)]);
  }
  return s.net();
})();

const ELEMENTS = [
  {
    id: 'lightning-strike', name: 'Lightning strike', count: 80, min: 14, tags: 'bolt thunder storm zap',
    params: [P('seed', 'Variant', 1, 9, 1, 3)],
    gen: (n, p) => netPoints(boltNet(Math.round(p.seed)), n),
  },
  {
    id: 'rain', name: 'Rain', count: 80, min: 8, tags: 'drops storm weather water',
    params: [P('drops', 'Drops', 6, 30, 1, 16)],
    gen: (n, p) => equal(Math.round(p.drops), n).flatMap((count, i) => Array.from({ length: count }, (_, j) => {
      const t = count > 1 ? j / (count - 1) : 0.5;
      return [-0.95 + 1.8 * scatter(i, 0) + 0.1 * t, -0.55 + 1.55 * scatter(i, 1) - 0.42 * t, -0.95 + 1.9 * scatter(i, 2)];
    })),
  },
  {
    id: 'water-surface', name: 'Water surface', count: 100, min: 9, tags: 'sea wave sheet lake',
    params: [P('height', 'Wave height', 0.05, 0.5, 0.05, 0.2)],
    gen: (n, p) => {
      const rows = Math.max(1, Math.round(Math.sqrt(n)));
      return equal(rows, n).flatMap((count, r) => Array.from({ length: count }, (_, i) => {
        const x = count > 1 ? -1 + (2 * i) / (count - 1) : 0;
        const z = rows > 1 ? -1 + (2 * r) / (rows - 1) : 0;
        return [x, p.height * Math.sin(3 * x + 0.6) * Math.cos(2.4 * z), z];
      }));
    },
  },
  { id: 'ice-spikes', name: 'Ice spikes', count: 112, min: 28, tags: 'crystal cluster frost shards', gen: (n) => netPoints(ICE, n) },
  {
    id: 'meteor-shower', name: 'Meteor shower', count: 90, min: 8, tags: 'shooting stars comets falling',
    params: [P('meteors', 'Meteors', 3, 9, 1, 5)],
    gen: (n, p) => equal(Math.round(p.meteors), n).flatMap((count, i) => {
      const head = [-0.9 + 1.4 * scatter(i, 0), -0.95 + 1.3 * scatter(i, 1), -0.85 + 1.7 * scatter(i, 2)];
      const length = 0.5 + 0.3 * scatter(i + 3, 0);
      return Array.from({ length: count }, (_, j) => {
        const t = (j / Math.max(1, count - 1)) ** 1.6 * length;
        return [head[0] + 0.62 * t, head[1] + 0.75 * t, head[2] - 0.1 * t];
      });
    }),
  },
  { id: 'wind-gust', name: 'Wind gust', count: 84, min: 9, tags: 'air blow breeze swirl', gen: (n) => netPoints(WIND, n) },
  {
    id: 'mushroom-cloud', name: 'Mushroom cloud', count: 120, min: 12, tags: 'explosion blast bomb nuke',
    gen: (n) => mix(n, [{ weight: 9, gen: (k) => lathe(MUSHROOM_CLOUD, k, 0.25) }, { weight: 1.3, gen: (k) => ring(k, 0.96, -0.98) }]),
  },
  { id: 'cracks', name: 'Cracks', count: 90, min: 26, tags: 'ground earth break quake', gen: (n) => netPoints(CRACKS, n) },
  {
    id: 'waterfall', name: 'Waterfall', count: 110, min: 12, tags: 'water river fall foam',
    gen: (n) => mix(n, [
      {
        weight: 7,
        gen: (k) => equal(7, k).flatMap((count, c) => Array.from({ length: count }, (_, j) => [
          -0.6 + 0.2 * c, 1 - (1.7 * (j + (c % 2) / 2)) / count, 0.08 * Math.sin(c * 2.1),
        ])),
      },
      {
        weight: 3,
        gen: (k) => Array.from({ length: k }, (_, i) => {
          const a = TAU * scatter(i, 0);
          const r = 0.25 + 0.7 * Math.sqrt(scatter(i, 1));
          return [r * Math.cos(a), -0.72 - 0.26 * scatter(i, 2), 0.3 + 0.55 * r * Math.sin(a)];
        }),
      },
    ]),
  },
  { id: 'big-wave', name: 'Big wave', count: 120, min: 15, tags: 'tsunami sea surf water', gen: (n) => netPoints(BIG_WAVE, n) },
  {
    id: 'volcano', name: 'Volcano', count: 110, min: 16, tags: 'lava eruption mountain fire',
    gen: (n) => mix(n, [
      { weight: 6, gen: (k) => lathe(VOLCANO, k) },
      ...Array.from({ length: 5 }, (_, i) => ({ weight: 0.9, gen: (k) => curve(lavaArc(i), k, false, 60) })),
    ]),
  },
  {
    id: 'campfire', name: 'Campfire', count: 100, min: 16, tags: 'fire logs camp bonfire',
    gen: (n) => mix(n, [{ weight: 5, gen: (k) => lathe(FIRE, k) }, netPart(LOGS, 2)]),
  },
  {
    id: 'aurora', name: 'Aurora', count: 110, min: 10, tags: 'northern lights curtain sky',
    gen: (n) => {
      const cols = Math.max(2, Math.round(n / 5));
      return equal(cols, n).flatMap((count, c) => {
        const u = c / (cols - 1);
        const top = 0.55 + 0.4 * Math.sin(u * 9 + 1);
        return Array.from({ length: count }, (_, j) => [-1 + 2 * u, top - 1.1 * (j / Math.max(1, count)) ** 1.3, 0.5 * Math.sin(u * 2.2 * TAU) * (0.4 + 0.6 * u)]);
      });
    },
  },
];

// ---------------------------------------------------------------- floating things

/** Small flat pictures floating in the air: `places` are [x, y, z, size, turn in degrees]. */
function floaters(d, places) {
  const glyph = drawingNet(fitDrawing(typeof d === 'string' ? parsePath(d) : d));
  return joinNets(...places.map(([x, y, z, size, turn = 0]) => {
    const [c, t] = [Math.cos(turn * RAD), Math.sin(turn * RAD)];
    return mapNet(glyph, ([u, v]) => [x + (u * c - v * t) * size, y + (u * t + v * c) * size, z]);
  }));
}

const SIX = [[-0.62, 0.55, 0.3, 0.3], [0.5, 0.62, -0.4, 0.34], [-0.1, 0.05, 0.6, 0.24], [0.68, -0.15, 0.2, 0.2], [-0.6, -0.5, -0.5, 0.36], [0.25, -0.66, -0.1, 0.28]];
const EIGHT = [
  [-0.7, 0.68, -0.2, 0.22], [0, 0.7, 0.5, 0.26], [0.7, 0.5, -0.5, 0.24], [-0.35, 0.1, 0.4, 0.28],
  [0.4, -0.05, 0.1, 0.22], [-0.68, -0.55, 0.2, 0.26], [0.1, -0.68, -0.4, 0.28], [0.72, -0.62, 0.5, 0.2],
];
const mirrored = (places) => places.map(([x, y, z, size]) => [-x, y, -z, size]);
const turned = (places, turns) => places.map((p, i) => [...p.slice(0, 4), turns[i % turns.length]]);

const HEART = {
  polys: [Array.from({ length: 97 }, (_, i) => {
    const a = (TAU * (i % 96)) / 96;
    return [Math.sin(a) ** 3, (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16];
  })],
  dots: [],
};
const STAR = `M${Array.from({ length: 10 }, (_, i) => around(0, 0, i % 2 ? 0.42 : 1, 90 + 36 * i)).join(' L')} Z`;
const SPARKLE = `M${Array.from({ length: 8 }, (_, i) => around(0, 0, i % 2 ? 0.22 : (i % 4 ? 0.62 : 1), 90 + 45 * i)).join(' L')} Z`;

const HEARTS = floaters(HEART, SIX);
const STARS = floaters(STAR, mirrored(SIX).slice(0, 5));
const SPARKLES = floaters(SPARKLE, [[-0.6, 0.5, 0.3, 0.36], [0.55, 0.55, -0.4, 0.28], [0.05, -0.1, 0.5, 0.42], [-0.62, -0.6, -0.3, 0.26], [0.6, -0.62, 0.1, 0.32]]);
const SPARKLE_DOTS = [[-0.1, 0.8, -0.2], [0.85, 0, 0.4], [-0.9, -0.05, 0.1], [0, -0.85, -0.5], [0.3, 0.3, -0.6], [-0.35, -0.35, 0.6]];
const BUBBLES = floaters('O0,0 1', EIGHT.map(([x, y, z, size], i) => [x, y, z, size * (i % 3 ? 0.75 : 1.1)]));
const NOTES = floaters('E-1.2,1.3 1.8,1.3 0 360 M0.6,1.3 L0.6,10 C2.2,8.6 4.4,7.6 3.4,4.6', turned(SIX.slice(0, 5), [-12, 10, 0, 18, -8]));
const SNOW = floaters('M0,-1 L0,1 M-0.866,-0.5 L0.866,0.5 M-0.866,0.5 L0.866,-0.5', mirrored(EIGHT).slice(0, 6));
const SNOW_DOTS = [[0.1, 0.25, -0.7], [-0.9, 0.2, 0.3], [0.85, -0.3, -0.2], [-0.2, -0.3, 0.7], [0.45, 0.9, 0.2], [-0.45, -0.9, -0.3], [0.9, 0.85, -0.6], [-0.9, -0.9, 0.5]];
const ZZZ = floaters('M-1,1 L1,1 L-1,-1 L1,-1', [[-0.72, -0.72, 0.15, 0.17], [-0.18, -0.18, 0, 0.25], [0.56, 0.56, -0.15, 0.34]]);
const ARROWS = floaters('M0,-1 L0,1 M-0.62,0.38 L0,1 L0.62,0.38', [
  [-0.7, 0.3, 0.3, 0.3], [-0.3, -0.5, -0.4, 0.4], [0.05, 0.5, 0.5, 0.42], [0.42, -0.35, 0, 0.3], [0.76, 0.25, -0.5, 0.36], [-0.72, -0.72, 0.6, 0.22],
]);
const PLUSES = floaters('M0,-1 L0,1 M-1,0 L1,0', EIGHT.slice(0, 7));
const LEAVES = floaters('M0,-1 Q0.75,0 0,1 Q-0.75,0 0,-1 M0,-1 L0,0.5', turned(mirrored(SIX), [25, -40, 70, -15, 110, -70]));
const SPARKS = floaters('M0.3,1 L-0.3,0.25 L0.3,-0.1 L-0.2,-1', turned(SIX, [0, 35, -30, 80, -60, 20]));
const BIRDS = floaters('M-1,0 Q-0.55,1.4 0,0 Q0.55,1.4 1,0', [
  [-0.6, 0.6, -0.2, 0.34, 6], [0.5, 0.66, 0.4, 0.3, -6], [-0.05, 0.1, 0.5, 0.4, 0], [0.62, -0.3, -0.4, 0.3, 8], [-0.6, -0.5, 0.2, 0.36, -4],
]);
const DIZZY = floaters(STAR, Array.from({ length: 5 }, (_, i) => [0.78 * Math.cos((TAU * i) / 5 + 0.3), 0, 0.78 * Math.sin((TAU * i) / 5 + 0.3), 0.2]));

const dotsPart = (dots) => ({ fixed: dots.length, weight: 0, gen: (k) => dots.slice(0, k) });

const FLOATING = [
  { id: 'floating-hearts', name: 'Floating hearts', count: 110, min: 24, tags: 'love cloud charm', gen: (n) => netPoints(HEARTS, n) },
  { id: 'floating-stars', name: 'Floating stars', count: 100, min: 50, tags: 'cloud night twinkle', gen: (n) => netPoints(STARS, n) },
  {
    id: 'sparkle-cloud', name: 'Sparkle cloud', count: 96, min: 46, tags: 'twinkle shine glitter magic',
    gen: (n) => mix(n, [netPart(SPARKLES, 1), dotsPart(SPARKLE_DOTS)]),
  },
  { id: 'bubbles', name: 'Bubbles', count: 96, min: 8, tags: 'soap water air circles', gen: (n) => netPoints(BUBBLES, n) },
  { id: 'floating-notes', name: 'Floating notes', count: 100, min: 20, tags: 'music song sound', gen: (n) => netPoints(NOTES, n) },
  {
    id: 'confetti', name: 'Confetti', count: 96, min: 12, tags: 'party celebrate streamers',
    params: [P('pieces', 'Pieces', 8, 40, 1, 24)],
    gen: (n, p) => equal(Math.round(p.pieces), n).flatMap((count, i) => {
      const at = [-0.82 + 1.64 * scatter(i, 0), -0.82 + 1.64 * scatter(i, 1), -0.82 + 1.64 * scatter(i, 2)];
      const [a, b] = [TAU * scatter(i + 7, 0), Math.PI * scatter(i + 7, 1)];
      const dir = [Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b)];
      return Array.from({ length: count }, (_, j) => at.map((c, k) => c + dir[k] * 0.16 * (count > 1 ? (2 * j) / (count - 1) - 1 : 0)));
    }),
  },
  {
    id: 'falling-snow', name: 'Falling snow', count: 92, min: 50, tags: 'snowflakes winter flakes',
    gen: (n) => mix(n, [netPart(SNOW, 1), dotsPart(SNOW_DOTS)]),
  },
  { id: 'zzz', name: 'Zzz', count: 60, min: 12, tags: 'sleep snore tired', gen: (n) => netPoints(ZZZ, n) },
  {
    id: 'dizzy-stars', name: 'Dizzy stars', count: 110, min: 55, tags: 'stun knocked out ring',
    gen: (n) => mix(n, [netPart(DIZZY, 4), { weight: 1, gen: (k) => ring(k, 0.78, 0, 0.3 + Math.PI / 5) }]),
  },
  { id: 'rising-arrows', name: 'Rising arrows', count: 84, min: 24, tags: 'level up buff boost', gen: (n) => netPoints(ARROWS, n) },
  { id: 'healing-pluses', name: 'Healing pluses', count: 91, min: 35, tags: 'heal health regen plus', gen: (n) => netPoints(PLUSES, n) },
  { id: 'falling-leaves', name: 'Falling leaves', count: 100, min: 18, tags: 'autumn fall wind', gen: (n) => netPoints(LEAVES, n) },
  { id: 'sparks', name: 'Sparks', count: 72, min: 24, tags: 'electric zap static shock', gen: (n) => netPoints(SPARKS, n) },
  { id: 'bird-flock', name: 'Flock of birds', count: 80, min: 25, tags: 'gulls sky flying', gen: (n) => netPoints(BIRDS, n) },
];

const under = (sub, list) => list.map((s) => Object.assign(s, { cat: 'effects', group: 'solid', sub }));

export const EFFECT_SHAPES = [
  ...CIRCLES,
  ...under('Rings and shields', RINGS),
  ...under('Elements', ELEMENTS),
  ...under('Floating things', FLOATING),
];
