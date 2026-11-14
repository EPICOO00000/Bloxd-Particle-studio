// More 3D shapes: frames with corners, round things, buildings, things and
// plants and animals. The tools they use are in shape-kit.js.

import {
  TAU, GOLDEN, P, apportion, curve, memo, dice, makeNet, wireNet, netPoints, lathe, ringStack,
  parsePath, placeDrawing, fitDrawing, drawingNet, spin,
  joinNets, mapNet, fitNet, sketch, mix, netPart, smooth, ballPoints, blobPoints,
} from './shape-kit.js';

// ---------------------------------------------------------------- tools

/** A point on a ring around the Y axis. */
const ringPt = (r, y, a) => [r * Math.cos(a), y, r * Math.sin(a)];

/** k points on a ring around the Y axis. */
const polyRing = (k, r, y, turn = 0) => Array.from({ length: k }, (_, i) => ringPt(r, y, turn + (TAU * i) / k));

/** Adds a round ring with k corners to a sketch and returns the corners. */
function hoop(s, r, y, k, turn = 0) {
  const at = (f) => ringPt(r, y, turn + (TAU * f) / k);
  for (let i = 0; i < k; i++) s.run(Array.from({ length: 7 }, (_, j) => at(i + j / 6)));
  return Array.from({ length: k }, (_, i) => at(i));
}

const square = (h, y) => [[-h, y, -h], [h, y, -h], [h, y, h], [-h, y, h]];
const corner = (i, w = 1, h = w, d = w) => [i & 1 ? w : -w, i & 2 ? h : -h, i & 4 ? d : -d];
const CUBE_EDGES = [];
for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) CUBE_EDGES.push([i, i | bit]);

/** Pairs of corners that are `length` apart: the edges of a regular solid. */
function edgesOf(verts, length) {
  const out = [];
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      if (Math.abs(Math.hypot(...verts[i].map((v, c) => v - verts[j][c])) - length) < length * 0.02) out.push([i, j]);
    }
  }
  return out;
}

/** The 12 corners of an icosahedron on the unit ball, one of them on top. */
const ICOSA = (() => {
  const v = [[0, 1, 0], [0, -1, 0]];
  const h = 1 / Math.sqrt(5);
  for (let i = 0; i < 5; i++) v.push(ringPt(2 * h, h, (TAU * i) / 5), ringPt(2 * h, -h, (TAU * (i + 0.5)) / 5));
  return v;
})();
const ICOSA_EDGES = edgesOf(ICOSA, 1.05146);

/** A flat drawing given thickness: the outline in front and behind, joined at every corner. */
function slab(d, depth) {
  const drawing = fitDrawing(typeof d === 'string' ? parsePath(d) : d);
  const front = drawingNet(drawing, (x, y) => [x, y, depth]);
  const back = drawingNet(drawing, (x, y) => [x, y, -depth]);
  return makeNet([...front.nodes, ...back.nodes], [...front.chains, ...back.chains, ...front.nodes.map((p, i) => [p, back.nodes[i]])]);
}

const unit = (v) => {
  const len = Math.hypot(...v) || 1;
  return v.map((c) => c / len);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// ---------------------------------------------------------------- more solids

const boxNet = memo((w, h, d) => wireNet(Array.from({ length: 8 }, (_, i) => corner(i, w, h, d)), CUBE_EDGES));

const CUBOCTA = (() => {
  const verts = [];
  for (let c = 0; c < 3; c++) {
    for (const a of [1, -1]) {
      for (const b of [1, -1]) {
        const p = [0, 0, 0];
        p[(c + 1) % 3] = a;
        p[(c + 2) % 3] = b;
        verts.push(p);
      }
    }
  }
  return wireNet(verts, edgesOf(verts, Math.SQRT2));
})();

// Two tetrahedrons through each other: their edges cross in the middle of every side of a cube.
const STAR_OCTA = (() => {
  const s = sketch();
  for (let c = 0; c < 3; c++) {
    for (const side of [1, -1]) {
      const mid = [0, 0, 0];
      mid[c] = side;
      for (const a of [1, -1]) {
        for (const b of [1, -1]) {
          const p = [0, 0, 0];
          p[c] = side;
          p[(c + 1) % 3] = a;
          p[(c + 2) % 3] = b;
          s.line(mid, p);
        }
      }
    }
  }
  return s.net();
})();

const SPIKY = (() => {
  const s = sketch();
  for (const [a, b] of ICOSA_EDGES) s.line(ICOSA[a].map((v) => v / 2), ICOSA[b].map((v) => v / 2));
  for (const v of ICOSA) s.line(v.map((c) => c / 2), v);
  return s.net();
})();

const twistedPrism = memo((k) => {
  const top = polyRing(k, 1, 0.72);
  const bottom = polyRing(k, 1, -0.72, Math.PI / k);
  const s = sketch().path(top, true).path(bottom, true);
  top.forEach((p, i) => s.line(p, bottom[i]).line(p, bottom[(i + k - 1) % k]));
  return s.net();
});

const doublePyramid = memo((k) => {
  const ring = polyRing(k, 1, 0, Math.PI / 2);
  const s = sketch().path(ring, true);
  ring.forEach((p) => s.line(p, [0, 1, 0]).line(p, [0, -1, 0]));
  return s.net();
});

const cutPyramid = memo((k, size) => {
  const bottom = polyRing(k, 1, -0.75, Math.PI / 2 + Math.PI / k);
  const top = polyRing(k, size, 0.75, Math.PI / 2 + Math.PI / k);
  const s = sketch().path(bottom, true).path(top, true);
  bottom.forEach((p, i) => s.line(p, top[i]));
  return s.net();
});

const WEDGE = wireNet(
  [[-1, -0.6, -0.6], [1, -0.6, -0.6], [1, -0.6, 0.6], [-1, -0.6, 0.6], [1, 0.6, -0.6], [1, 0.6, 0.6]],
  [[0, 1], [1, 2], [2, 3], [3, 0], [1, 4], [2, 5], [4, 5], [0, 4], [3, 5]],
);

const PLUS3D = (() => {
  const s = sketch();
  const a = 1 / 3;
  const ring = [[a, a], [a, -a], [-a, -a], [-a, a]];
  for (let c = 0; c < 3; c++) {
    const pt = (x, y, z) => {
      const p = [0, 0, 0];
      p[c] = x;
      p[(c + 1) % 3] = y;
      p[(c + 2) % 3] = z;
      return p;
    };
    for (const [y, z] of ring) s.line(pt(-a, y, z), pt(a, y, z));
    for (const side of [1, -1]) {
      ring.forEach(([y, z], i) => {
        const [y2, z2] = ring[(i + 1) % 4];
        s.line(pt(side * a, y, z), pt(side, y, z)).line(pt(side, y, z), pt(side, y2, z2));
      });
    }
  }
  return s.net();
})();

const twistedTower = memo((levels, twist) => {
  const s = sketch();
  let below = null;
  for (let j = 0; j <= levels; j++) {
    const ring = polyRing(4, 0.88, -1 + (2 * j) / levels, Math.PI / 4 + (twist * Math.PI * j) / (180 * levels));
    s.path(ring, true);
    if (below) ring.forEach((p, i) => s.line(below[i], p));
    below = ring;
  }
  return s.net();
});

const CORNER_BOX = (() => {
  const s = sketch();
  for (let i = 0; i < 8; i++) {
    const p = corner(i);
    for (let c = 0; c < 3; c++) {
      const q = p.slice();
      q[c] /= 2;
      s.line(p, q);
    }
  }
  return s.net();
})();

const DIAMOND_CUBE = (() => {
  const s = sketch();
  for (const [a, b] of CUBE_EDGES) s.line(corner(a), corner(b));
  const tips = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const [a, b] of edgesOf(tips, Math.SQRT2)) s.line(tips[a], tips[b]);
  return s.net();
})();

const HEART_BLOCK = slab({
  polys: [Array.from({ length: 121 }, (_, i) => {
    const a = (TAU * (i % 120)) / 120;
    return [Math.sin(a) ** 3, (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16];
  })],
  dots: [],
}, 0.3);
const ARROW_BLOCK = slab('M0,10 L4.4,5.4 L1.8,5.4 L1.8,0 L-1.8,0 L-1.8,5.4 L-4.4,5.4 Z', 0.24);
const BOLT_BLOCK = slab('M-0.5,10 L3,10 L0.8,6 L3.5,6 L-2,0 L-0.5,4.4 L-3,4.4 Z', 0.2);

const SOLIDS = [
  {
    id: 'cuboid', name: 'Cuboid', count: 68, min: 8, tags: 'box brick block slab',
    params: [P('w', 'Width', 0.1, 1, 0.05, 1), P('h', 'Height', 0.1, 1, 0.05, 0.6), P('d', 'Depth', 0.1, 1, 0.05, 0.45)],
    gen: (n, p) => netPoints(boxNet(p.w, p.h, p.d), n),
  },
  { id: 'cuboctahedron', name: 'Cuboctahedron', count: 108, min: 12, gen: (n) => netPoints(CUBOCTA, n) },
  { id: 'star-octahedron', name: 'Star octahedron', count: 110, min: 14, tags: 'stella two tetrahedrons merkaba', gen: (n) => netPoints(STAR_OCTA, n) },
  { id: 'spiky-ball', name: 'Spiky ball', count: 108, min: 24, tags: 'mine virus urchin spikes', gen: (n) => netPoints(SPIKY, n) },
  {
    id: 'antiprism', name: 'Twisted prism', count: 110, min: 10, tags: 'antiprism',
    params: [P('sides', 'Sides', 3, 8, 1, 5)],
    gen: (n, p) => netPoints(twistedPrism(Math.round(p.sides)), n),
  },
  {
    id: 'bipyramid', name: 'Double pyramid', count: 67, min: 7, tags: 'bipyramid',
    params: [P('sides', 'Sides', 3, 8, 1, 5)],
    gen: (n, p) => netPoints(doublePyramid(Math.round(p.sides)), n),
  },
  {
    id: 'frustum', name: 'Cut pyramid', count: 68, min: 8, tags: 'frustum truncated',
    params: [P('sides', 'Sides', 3, 8, 1, 4), P('top', 'Top', 0.2, 0.9, 0.05, 0.5)],
    gen: (n, p) => netPoints(cutPyramid(Math.round(p.sides), p.top), n),
  },
  { id: 'wedge', name: 'Wedge', count: 60, min: 6, tags: 'ramp slope', gen: (n) => netPoints(WEDGE, n) },
  { id: 'plus3d', name: '3D plus', count: 152, min: 32, tags: 'cross jack', gen: (n) => netPoints(PLUS3D, n) },
  {
    id: 'twisted-tower', name: 'Twisted tower', count: 128, min: 20,
    params: [P('levels', 'Levels', 2, 8, 1, 4), P('twist', 'Twist', 0, 180, 5, 90)],
    gen: (n, p) => netPoints(twistedTower(Math.round(p.levels), p.twist), n),
  },
  { id: 'corner-box', name: 'Corner box', count: 80, min: 32, tags: 'selection bounds frame brackets', gen: (n) => netPoints(CORNER_BOX, n) },
  { id: 'diamond-cube', name: 'Diamond in a cube', count: 100, min: 14, tags: 'octahedron', gen: (n) => netPoints(DIAMOND_CUBE, n) },
  { id: 'heart-block', name: 'Heart block', count: 100, min: 8, tags: '3d thick love', gen: (n) => netPoints(HEART_BLOCK, n) },
  { id: 'arrow-block', name: '3D arrow', count: 110, min: 14, tags: 'pointer marker thick', gen: (n) => netPoints(ARROW_BLOCK, n) },
  { id: 'bolt-block', name: '3D lightning', count: 110, min: 14, tags: 'bolt thunder thick', gen: (n) => netPoints(BOLT_BLOCK, n) },
];

// ---------------------------------------------------------------- round things

const BOWL = (() => {
  const s = sketch();
  const k = 8;
  const at = (f, dip) => ringPt(Math.cos(dip), -Math.sin(dip), (TAU * f) / k); // on a ball, `dip` radians below its middle
  const dips = [0, 0.7, 1.265];
  dips.forEach((dip, j) => {
    for (let i = 0; i < k; i++) {
      s.run(Array.from({ length: 7 }, (_, q) => at(i + q / 6, dip)));
      if (j + 1 < dips.length) s.run(Array.from({ length: 7 }, (_, q) => at(i, dip + ((dips[j + 1] - dip) * q) / 6)));
    }
  });
  return fitNet(s.net());
})();

const tubeNet = memo((hole) => {
  const s = sketch();
  const k = 6;
  const rings = [1, hole].map((r) => [0.7, -0.7].map((y) => hoop(s, r, y, k)));
  for (let i = 0; i < k; i++) {
    s.line(rings[0][0][i], rings[0][1][i]).line(rings[1][0][i], rings[1][1][i]);
    s.line(rings[0][0][i], rings[1][0][i]).line(rings[0][1][i], rings[1][1][i]);
  }
  return s.net();
});

const BARREL = (() => {
  const s = sketch();
  const k = 8;
  const wide = (y) => 0.64 + 0.24 * Math.cos((y / 0.9) * (Math.PI / 2));
  const levels = [-0.9, -0.4, 0.4, 0.9];
  for (const y of levels) hoop(s, wide(y), y, k);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j + 1 < levels.length; j++) {
      s.run(Array.from({ length: 7 }, (_, q) => {
        const y = levels[j] + ((levels[j + 1] - levels[j]) * q) / 6;
        return ringPt(wide(y), y, (TAU * i) / k);
      }));
    }
  }
  return s.net();
})();

const EGG = Array.from({ length: 61 }, (_, i) => {
  const a = (Math.PI * i) / 60;
  return [0.72 * Math.sin(a) * (1 + 0.2 * Math.cos(a)), -Math.cos(a)];
});
const DROP = Array.from({ length: 61 }, (_, i) => {
  const a = (Math.PI * i) / 60;
  return [0.86 * Math.sin(a) * Math.cos(a / 2), -Math.cos(a)];
});
const RUGBY = Array.from({ length: 61 }, (_, i) => {
  const a = (Math.PI * i) / 60;
  return [0.6 * Math.sin(a) ** 1.25, Math.cos(a)];
});
const BEEHIVE = [[0.8, -0.9], [0.93, -0.55], [0.9, -0.2], [0.78, 0.15], [0.58, 0.48], [0.32, 0.78], [0, 1]];
const CLOUD = [[-0.5, -0.08, 0, 0.42], [0, 0.1, 0, 0.55], [0.5, -0.05, 0, 0.45], [0.15, -0.2, 0.3, 0.4], [-0.2, -0.15, -0.3, 0.38]];

/** A ring around the Y axis, tipped over to the side by `tilt` radians. */
const tiltedRing = (n, r, tilt, turn = 0) => Array.from({ length: n }, (_, i) => {
  const a = turn + (TAU * i) / n;
  return [r * Math.cos(a) * Math.cos(tilt), r * Math.cos(a) * Math.sin(tilt), r * Math.sin(a)];
});

const ROUND = [
  {
    id: 'ellipsoid', name: 'Ellipsoid', count: 100, min: 8, tags: 'oval ball squashed stretched',
    params: [P('w', 'Width', 0.2, 1, 0.05, 1), P('h', 'Height', 0.2, 1, 0.05, 0.55)],
    gen: (n, p) => lathe(Array.from({ length: 61 }, (_, i) => [p.w * Math.sin((Math.PI * i) / 60), p.h * Math.cos((Math.PI * i) / 60)]), n),
  },
  { id: 'egg3d', name: '3D egg', count: 96, min: 8, tags: 'easter', gen: (n) => lathe(EGG, n) },
  { id: 'drop3d', name: '3D drop', count: 90, min: 8, tags: 'water tear rain', gen: (n) => lathe(DROP, n) },
  { id: 'bowl', name: 'Bowl', count: 100, min: 24, tags: 'dish cup', gen: (n) => netPoints(BOWL, n) },
  {
    id: 'tube', name: 'Tube', count: 120, min: 24, tags: 'pipe hollow cylinder',
    params: [P('hole', 'Hole', 0.3, 0.85, 0.05, 0.6)],
    gen: (n, p) => netPoints(tubeNet(p.hole), n),
  },
  { id: 'barrel', name: 'Barrel', count: 130, min: 32, tags: 'keg cask', gen: (n) => netPoints(BARREL, n) },
  { id: 'rugby-ball', name: 'Rugby ball', count: 96, min: 8, tags: 'american football lemon', gen: (n) => lathe(RUGBY, n).map(([x, y, z]) => [y, x, z]) },
  { id: 'beehive', name: 'Beehive', count: 90, min: 12, tags: 'hive bee', gen: (n) => ringStack(BEEHIVE, n) },
  {
    id: 'ringed-planet', name: 'Ringed planet', count: 110, min: 16, tags: 'saturn space',
    gen: (n) => mix(n, [
      { weight: 4, gen: (k) => ballPoints(k, 0.44) },
      { weight: 2.6, gen: (k) => tiltedRing(k, 0.78, 0.4) },
      { weight: 3.4, gen: (k) => tiltedRing(k, 1, 0.4, 0.1) },
    ]),
  },
  { id: 'cloud3d', name: '3D cloud', count: 110, min: 12, tags: 'puffy sky', gen: (n) => blobPoints(CLOUD, n) },
];

// ---------------------------------------------------------------- buildings

const HOUSE = (() => {
  const s = sketch();
  const [w, d, y0, y1, y2] = [0.8, 0.62, -1, 0.15, 0.95];
  // the door stands on the middle piece of the front edge
  s.path([[-w, y0, d], [-0.22, y0, d], [0.22, y0, d], [w, y0, d], [w, y0, -d], [-w, y0, -d]], true);
  for (const x of [-w, w]) for (const z of [-d, d]) s.line([x, y0, z], [x, y1, z]);
  s.path([[-w, y1, d], [w, y1, d], [w, y1, -d], [-w, y1, -d]], true);
  for (const z of [-d, d]) s.path([[-w, y1, z], [0, y2, z], [w, y1, z]]);
  s.line([0, y2, d], [0, y2, -d]);
  s.path([[-0.22, y0, d], [-0.22, -0.4, d], [0.22, -0.4, d], [0.22, y0, d]]);
  return s.net();
})();

const TOWER = (() => {
  const s = sketch();
  const k = 6;
  const r = 0.62;
  const at = (f, y) => ringPt(r, y, (TAU * f) / k);
  const arc = (f0, f1, y) => Array.from({ length: 5 }, (_, q) => at(f0 + ((f1 - f0) * q) / 4, y));
  const base = hoop(s, r, -1, k);
  for (let i = 0; i < k; i++) {
    // the battlements: up, along, down, along
    s.line(at(i, 0.62), at(i, 1)).run(arc(i, i + 0.5, 1)).line(at(i + 0.5, 1), at(i + 0.5, 0.62)).run(arc(i + 0.5, i + 1, 0.62));
    s.line(base[i], at(i, 0.62));
  }
  return s.net();
})();

const CASTLE = (() => {
  const s = sketch();
  const [a, b, wall, top] = [0.4, 1, -0.2, 0.4]; // a tower reaches from a to b; walls and towers are this high
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const at = (x, y, z) => [sx * x, y, sz * z];
      const ring = [[a, a], [b, a], [b, b], [a, b]];
      for (const y of [-1, top]) s.path(ring.map(([x, z]) => at(x, y, z)), true);
      ring.forEach(([x, z], i) => {
        if (i === 0) s.path([at(x, -1, z), at(x, wall, z), at(x, top, z)]); // the walls end on this edge
        else s.line(at(x, -1, z), at(x, top, z));
        s.line(at(x, top, z), at((a + b) / 2, top + 0.45, (a + b) / 2));
      });
    }
  }
  for (const y of [-1, wall]) s.path([[a, y, a], [-a, y, a], [-a, y, -a], [a, y, -a]], true);
  return fitNet(s.net());
})();

const ARCH = slab('M-10,-10 L-10,0 A0,0 10 180 0 L10,-10 L5.5,-10 L5.5,0 A0,0 5.5 0 180 L-5.5,-10 Z', 0.3);

const BRIDGE = (() => {
  const s = sketch();
  const [zd, xt, deck, top, foot] = [0.28, 0.5, -0.35, 0.75, -0.85];
  const cable = (u) => deck + 0.12 + (top - deck - 0.12) * u * u; // u from -1 (one tower) to 1 (the other)
  for (const z of [zd, -zd]) {
    s.path([[-1, deck, z], [-xt, deck, z], [xt, deck, z], [1, deck, z]]);
    for (const x of [-xt, xt]) s.path([[x, foot, z], [x, deck, z], [x, top, z]]);
    s.line([-1, deck, z], [-xt, top, z]).line([xt, top, z], [1, deck, z]);
    s.run(Array.from({ length: 25 }, (_, i) => [(-1 + i / 12) * xt, cable(-1 + i / 12), z]));
    for (const u of [-0.6, -0.2, 0.2, 0.6]) s.loose([[u * xt, cable(u), z], [u * xt, deck, z]]);
  }
  for (const x of [-1, -xt, xt, 1]) s.line([x, deck, zd], [x, deck, -zd]);
  for (const x of [-xt, xt]) s.line([x, top, zd], [x, top, -zd]);
  return fitNet(s.net());
})();

const TEMPLE = (() => {
  const s = sketch();
  const [w, d, y0, y1, y2] = [1, 0.55, -0.75, 0.3, 0.8];
  const xs = [-w, -w / 3, w / 3, w];
  for (const y of [y0, y1]) {
    for (const z of [d, -d]) s.path(xs.map((x) => [x, y, z]));
    for (const x of [-w, w]) s.line([x, y, d], [x, y, -d]);
  }
  for (const z of [d, -d]) {
    for (const x of xs) s.line([x, y0, z], [x, y1, z]);
    s.path([[-w, y1, z], [0, y2, z], [w, y1, z]]);
  }
  s.line([0, y2, d], [0, y2, -d]);
  return fitNet(s.net());
})();

const LIGHTHOUSE = (() => {
  const s = sketch();
  const k = 6;
  const base = hoop(s, 0.5, -1, k);
  const band = hoop(s, 0.4, -0.35, k);
  const neck = hoop(s, 0.3, 0.3, k);
  const lamp = hoop(s, 0.24, 0.64, k);
  hoop(s, 0.47, 0.3, k, Math.PI / k); // the walkway around the lamp
  for (let i = 0; i < k; i++) s.line(base[i], band[i]).line(band[i], neck[i]).line(neck[i], lamp[i]).line(lamp[i], [0, 1, 0]);
  return s.net();
})();

const WINDMILL = (() => {
  const s = sketch();
  const k = 6;
  const base = hoop(s, 0.42, -1, k);
  const top = hoop(s, 0.24, 0.2, k);
  for (let i = 0; i < k; i++) s.line(base[i], top[i]).line(top[i], [0, 0.48, 0]);
  const sails = placeDrawing(spin('M0,0 L0,7.5 M0,2.5 L1.8,2.5 L1.8,7.5 L0,7.5', 4, 45), { size: 0.125 });
  s.add(drawingNet(sails, (x, y) => [x, y + 0.25, 0.5]));
  return fitNet(s.net());
})();

const TIPI = (() => {
  const s = sketch();
  const knot = [0, 0.7, 0];
  for (const p of hoop(s, 0.9, -1, 8)) s.line(p, knot).line(knot, [-0.17 * p[0], 1, -0.17 * p[2]]); // the poles cross and stick out
  return s.net();
})();

const IGLOO = (() => {
  const s = sketch();
  const k = 8;
  const R = 0.85;
  const back = -0.12;
  const at = (lat, f) => [R * Math.cos(lat) * Math.cos((TAU * f) / k), R * Math.sin(lat), back + R * Math.cos(lat) * Math.sin((TAU * f) / k)];
  const lats = [0, 0.6, 1.1, Math.PI / 2];
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < k; i++) {
      s.run(Array.from({ length: 5 }, (_, q) => at(lats[j], i + q / 4)));
      s.run(Array.from({ length: 5 }, (_, q) => at(lats[j] + ((lats[j + 1] - lats[j]) * q) / 4, i)));
    }
  }
  // the way in: an arch in front, joined to the dome by three lines
  const door = Array.from({ length: 13 }, (_, q) => [0.3 * Math.cos((Math.PI * q) / 12), 0.3 * Math.sin((Math.PI * q) / 12), 1]);
  s.run(door.slice(0, 7)).run(door.slice(6));
  for (const p of [door[0], door[6], door[12]]) s.loose([[p[0], p[1], back + Math.sqrt(R * R - p[0] * p[0] - p[1] * p[1]) + 0.04], p]);
  return fitNet(s.net());
})();

const OBELISK = (() => {
  const s = sketch();
  const [plinth, lid, foot, neck] = [square(0.42, -1), square(0.42, -0.84), square(0.26, -0.84), square(0.17, 0.72)];
  s.path(plinth, true).path(lid, true).path(foot, true).path(neck, true);
  for (let i = 0; i < 4; i++) s.line(plinth[i], lid[i]).line(foot[i], neck[i]).line(neck[i], [0, 1, 0]);
  return s.net();
})();

const staircase = memo((k) => {
  const s = sketch();
  const side = (z) => {
    const pts = [[-1, -1, z]];
    for (let i = 0; i < k; i++) pts.push([-1 + (2 * i) / k, -1 + (2 * (i + 1)) / k, z], [-1 + (2 * (i + 1)) / k, -1 + (2 * (i + 1)) / k, z]);
    return pts;
  };
  const [a, b] = [side(0.5), side(-0.5)];
  s.path(a).path(b);
  a.forEach((p, i) => s.line(p, b[i]));
  for (const z of [0.5, -0.5]) s.path([[1, 1, z], [1, -1, z], [-1, -1, z]]);
  s.line([1, -1, 0.5], [1, -1, -0.5]);
  return s.net();
});

// Half a ball made of triangles: every edge of an icosahedron cut in two and pushed out to the ball.
const GEODESIC = (() => {
  const verts = ICOSA.map((v) => v.slice());
  const mids = new Map();
  const mid = (a, b) => {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (!mids.has(key)) mids.set(key, verts.push(unit(verts[a].map((v, c) => v + verts[b][c]))) - 1);
    return mids.get(key);
  };
  const edges = [];
  const linked = (a, b) => ICOSA_EDGES.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
  for (const [a, b] of ICOSA_EDGES) edges.push([a, mid(a, b)], [mid(a, b), b]);
  for (let a = 0; a < 12; a++) {
    for (let b = a + 1; b < 12; b++) {
      for (let c = b + 1; c < 12; c++) {
        if (linked(a, b) && linked(b, c) && linked(a, c)) edges.push([mid(a, b), mid(b, c)], [mid(b, c), mid(a, c)], [mid(a, c), mid(a, b)]);
      }
    }
  }
  const s = sketch();
  for (const [a, b] of edges) if (verts[a][1] > -1e-6 && verts[b][1] > -1e-6) s.line(verts[a], verts[b]);
  return fitNet(s.net());
})();

const ONION = smooth([[0.42, -1], [0.46, -0.82], [0.7, -0.62], [0.82, -0.3], [0.72, 0.02], [0.46, 0.26], [0.22, 0.44], [0.08, 0.62], [0.03, 0.8], [0, 1]], 8);

const BUILDINGS = [
  { id: 'house3d', name: '3D house', count: 120, min: 14, tags: 'home building', gen: (n) => netPoints(HOUSE, n) },
  { id: 'round-tower', name: 'Round tower', count: 110, min: 30, tags: 'castle battlements turret', gen: (n) => netPoints(TOWER, n) },
  { id: 'castle3d', name: '3D castle', count: 190, min: 40, tags: 'fort towers walls', gen: (n) => netPoints(CASTLE, n) },
  { id: 'arch3d', name: 'Arch', count: 110, min: 8, tags: 'gate door portal', gen: (n) => netPoints(ARCH, n) },
  { id: 'bridge', name: 'Bridge', count: 150, min: 16, tags: 'suspension cables', gen: (n) => netPoints(BRIDGE, n) },
  { id: 'temple', name: 'Temple', count: 130, min: 18, tags: 'greek columns pillars', gen: (n) => netPoints(TEMPLE, n) },
  { id: 'lighthouse3d', name: '3D lighthouse', count: 120, min: 31, tags: 'sea tower lamp', gen: (n) => netPoints(LIGHTHOUSE, n) },
  { id: 'windmill3d', name: '3D windmill', count: 130, min: 30, tags: 'mill sails', gen: (n) => netPoints(WINDMILL, n) },
  { id: 'tipi', name: 'Tipi', count: 84, min: 17, tags: 'tent teepee camp', gen: (n) => netPoints(TIPI, n) },
  { id: 'igloo', name: 'Igloo', count: 130, min: 28, tags: 'ice snow house dome', gen: (n) => netPoints(IGLOO, n) },
  { id: 'obelisk', name: 'Obelisk', count: 96, min: 17, tags: 'monument pillar needle', gen: (n) => netPoints(OBELISK, n) },
  {
    id: 'staircase', name: 'Staircase', count: 96, min: 24, tags: 'stairs steps',
    params: [P('steps', 'Steps', 3, 8, 1, 5)],
    gen: (n, p) => netPoints(staircase(Math.round(p.steps)), n),
  },
  { id: 'geodesic', name: 'Geodesic dome', count: 130, min: 26, tags: 'triangles', gen: (n) => netPoints(GEODESIC, n) },
  { id: 'onion-dome', name: 'Onion dome', count: 100, min: 10, tags: 'palace roof spire', gen: (n) => lathe(ONION, n, 0.12) },
];

// ---------------------------------------------------------------- things

const CHEST = (() => {
  const s = sketch();
  const [w, d, y0, y1, r] = [1, 0.6, -0.8, 0, 0.6];
  for (const y of [y0, y1]) s.path([[-w, y, d], [w, y, d], [w, y, -d], [-w, y, -d]], true);
  for (const x of [-w, w]) {
    for (const z of [-d, d]) s.line([x, y0, z], [x, y1, z]);
    const lid = Array.from({ length: 19 }, (_, i) => [x, y1 + r * Math.sin((Math.PI * i) / 18), d * Math.cos((Math.PI * i) / 18)]);
    s.run(lid.slice(0, 10)).run(lid.slice(9));
  }
  s.line([-w, y1 + r, 0], [w, y1 + r, 0]);
  s.path([[-0.11, -0.08, d], [0.11, -0.08, d], [0.11, -0.32, d], [-0.11, -0.32, d]], true); // the lock
  return fitNet(s.net());
})();

const TABLE = (() => {
  const s = sketch();
  const [w, d, y1, y0] = [1, 0.6, 0.35, -0.8];
  for (const x of [-w, w]) {
    s.path([[x, y1, -d], [x, y1, -0.2], [x, y1, 0.2], [x, y1, d]]);
    for (const z of [-d, d]) s.line([x, y1, z], [x, y0, z]);
  }
  for (const z of [-d, -0.2, 0.2, d]) s.line([-w, y1, z], [w, y1, z]);
  return fitNet(s.net());
})();

const CHAIR = (() => {
  const s = sketch();
  const h = 0.5;
  s.path([[-h, 0, h], [h, 0, h], [h, 0, -h], [-h, 0, -h]], true);
  for (const x of [-h, h]) {
    s.line([x, 0, h], [x, -1, h]);
    s.path([[x, -1, -h], [x, 0, -h], [x, 0.5, -h], [x, 1, -h]]);
  }
  for (const y of [0.5, 1]) s.line([-h, y, -h], [h, y, -h]);
  return s.net();
})();

const LANTERN = (() => {
  const s = sketch();
  const [lo, hi, tip] = [square(0.42, -0.85), square(0.42, 0.2), [0, 0.56, 0]];
  s.path(lo, true).path(hi, true);
  for (let i = 0; i < 4; i++) s.line(lo[i], hi[i]).line(hi[i], tip);
  s.run(Array.from({ length: 25 }, (_, i) => [0.22 * Math.sin((TAU * i) / 24), 0.78 - 0.22 * Math.cos((TAU * i) / 24), 0])); // the ring it hangs from
  s.path([[0, -0.64, 0], [0.13, -0.44, 0], [0, -0.14, 0], [-0.13, -0.44, 0]], true); // the flame
  return s.net();
})();

const MUG = (() => {
  const s = sketch();
  const k = 6;
  const [r, cx, y0, y1, grip] = [0.62, -0.2, -0.75, 0.75, 0.36];
  const at = (f, y) => [cx + r * Math.cos((TAU * f) / k), y, r * Math.sin((TAU * f) / k)];
  for (const y of [y0, y1]) for (let i = 0; i < k; i++) s.run(Array.from({ length: 7 }, (_, q) => at(i + q / 6, y)));
  s.path([at(0, y0), at(0, -grip), at(0, grip), at(0, y1)]); // the handle is on this side
  for (let i = 1; i < k; i++) s.line(at(i, y0), at(i, y1));
  s.run(Array.from({ length: 19 }, (_, q) => [cx + r + 0.5 * Math.sin((Math.PI * q) / 18), grip * Math.cos((Math.PI * q) / 18), 0]));
  return s.net();
})();

const BOTTLE = [[0, -1], [0.4, -1], ...smooth([[0.42, -0.9], [0.42, 0.05], [0.36, 0.3], [0.16, 0.52], [0.14, 0.8], [0.19, 0.84], [0.19, 0.95], [0.12, 0.99]], 6)];
const SPINNING_TOP = [[0, -1], [0.08, -0.9], [0.3, -0.55], [0.7, -0.15], [0.86, 0.08], [0.8, 0.22], [0.4, 0.3], [0.1, 0.34], [0.09, 0.95], [0, 1]];
const BELL = smooth([[0.07, 0.98], [0.07, 0.86], [0.2, 0.8], [0.36, 0.62], [0.42, 0.3], [0.46, -0.1], [0.56, -0.5], [0.86, -0.86]], 8);
const PIN = [[0, -1], [0.3, -1], ...smooth([[0.38, -0.62], [0.4, -0.3], [0.3, 0.05], [0.17, 0.3], [0.16, 0.45], [0.24, 0.68], [0.2, 0.9], [0.06, 1]], 8)];

const BALLOON3D = (() => {
  const s = sketch();
  const k = 8;
  const [wide, yWide, mouth, yMouth] = [0.78, 0.38, 0.2, -0.42];
  const upper = (t) => [wide * Math.sin((Math.PI / 2) * t), yWide + (1 - yWide) * Math.cos((Math.PI / 2) * t)];
  const lower = (t) => [mouth + (wide - mouth) * (1 - t ** 1.8), yWide - (yWide - yMouth) * t];
  for (let i = 0; i < k; i++) {
    const a = (TAU * i) / k;
    s.run(Array.from({ length: 9 }, (_, q) => ringPt(...upper(q / 8), a)));
    s.run(Array.from({ length: 9 }, (_, q) => ringPt(...lower(q / 8), a)));
  }
  hoop(s, wide, yWide, k);
  const neck = hoop(s, mouth, yMouth, k);
  const [lo, hi] = [square(0.17, -1), square(0.17, -0.74)];
  s.path(lo, true).path(hi, true);
  for (let i = 0; i < 4; i++) s.line(lo[i], hi[i]);
  // the ropes: the basket's corners hang from the mouth of the balloon
  for (const p of hi) s.line(p, neck.reduce((best, q) => (Math.hypot(q[0] - p[0], q[2] - p[2]) < Math.hypot(best[0] - p[0], best[2] - p[2]) ? q : best)));
  return s.net();
})();

const ROCKET_BODY = [[0, 1], [0.13, 0.82], [0.23, 0.6], [0.3, 0.34], [0.32, 0.06], [0.32, -0.22], [0.32, -0.5], [0.26, -0.72]];
const ROCKET_FINS = (() => {
  const s = sketch();
  for (let i = 0; i < 3; i++) {
    const a = (TAU * i) / 3 + 0.5;
    s.path([ringPt(0.34, -0.2, a), ringPt(0.8, -0.84, a), ringPt(0.8, -1, a), ringPt(0.3, -0.72, a)]);
  }
  return s.net();
})();

// The cone of an ice cream: a waffle of crossing lines from the tip up to the rim.
const WAFFLE = (() => {
  const s = sketch();
  const k = 6;
  const rows = 3;
  const at = (row, f) => ringPt(0.5 * ((row + 1) / (rows + 1)), -1 + 1.1 * ((row + 1) / (rows + 1)), (TAU * f) / (2 * k));
  for (let row = 0; row <= rows; row++) {
    for (let i = 0; i < k; i++) {
      const f = 2 * i + row;
      if (row === 0) s.line([0, -1, 0], at(0, f));
      if (row < rows) for (const lean of [1, -1]) s.run(Array.from({ length: 4 }, (_, q) => at(row + q / 3, f + (lean * q) / 3)));
      else s.run(Array.from({ length: 5 }, (_, q) => at(row, f + q / 2))); // the rim
    }
  }
  return s.net();
})();

const GIFT3D = (() => {
  const s = sketch();
  const [h, y0, y1] = [0.8, -1, 0.42];
  const mid = [0, y1, 0];
  for (const y of [y0, y1]) s.path([[-h, y, h], [0, y, h], [h, y, h], [h, y, 0], [h, y, -h], [0, y, -h], [-h, y, -h], [-h, y, 0]], true);
  for (const x of [-h, h]) for (const z of [-h, h]) s.line([x, y0, z], [x, y1, z]);
  for (const [x, z] of [[0, h], [h, 0], [0, -h], [-h, 0]]) s.line([x, y0, z], [x, y1, z]).line([x, y1, z], mid); // the ribbon
  for (const side of [1, -1]) { // the bow
    s.run(Array.from({ length: 25 }, (_, i) => {
      const f = (TAU * i) / 24;
      const along = 0.3 * (1 - Math.cos(f));
      const across = 0.15 * Math.sin(f);
      return [side * (0.82 * along - 0.57 * across), y1 + 0.57 * along + 0.82 * across, 0];
    }));
  }
  return s.net();
})();

const DICE = (() => {
  const s = sketch();
  const h = 0.86;
  for (const [a, b] of CUBE_EDGES) s.line(corner(a, h), corner(b, h));
  const spots = [
    [[0, 0]],
    [[-1, -1], [1, 1]],
    [[-1, -1], [0, 0], [1, 1]],
    [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]],
    [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
  ];
  // [axis, side, spots]: opposite sides add up to seven
  for (const [axis, side, count] of [[2, 1, 5], [2, -1, 2], [1, 1, 3], [1, -1, 4], [0, -1, 6], [0, 1, 1]]) {
    for (const [u, v] of spots[count - 1]) {
      const p = [0, 0, 0];
      p[axis] = side * h;
      p[(axis + 1) % 3] = u * 0.44;
      p[(axis + 2) % 3] = v * 0.44;
      s.node(p);
    }
  }
  return s.net();
})();

const DRUM = (() => {
  const s = sketch();
  const k = 8;
  const top = hoop(s, 0.9, 0.55, k);
  const bottom = hoop(s, 0.9, -0.55, k, Math.PI / k);
  top.forEach((p, i) => s.line(p, bottom[i]).line(p, bottom[(i + k - 1) % k]));
  return s.net();
})();

/** A pointed hat: a wide brim and a cone that leans over at the top. */
function wizardHat(n) {
  const rings = [[1, -0.8, 0], [0.76, -0.79, 0]];
  for (let j = 0; j < 8; j++) rings.push([0.52 * (1 - j / 8), -0.76 + (1.7 * j) / 8, 0.3 * (j / 8) ** 2]);
  const per = apportion(rings.map((r) => r[0]), Math.max(0, n - 1));
  const out = [[0.3, 0.96, 0]];
  rings.forEach(([r, y, x], j) => {
    for (let i = 0; i < per[j]; i++) {
      const a = (TAU * (i + (j % 2) / 2)) / per[j];
      out.push([x + r * Math.cos(a), y, r * Math.sin(a)]);
    }
  });
  return out.slice(0, n);
}

const TOP_HAT = (() => {
  const s = sketch();
  const k = 8;
  hoop(s, 1, -0.7, k, Math.PI / k);
  const [foot, band, top] = [hoop(s, 0.6, -0.7, k), hoop(s, 0.6, -0.38, k), hoop(s, 0.62, 0.7, k)];
  for (let i = 0; i < k; i++) s.line(foot[i], band[i]).line(band[i], top[i]);
  return s.net();
})();

const UMBRELLA3D = (() => {
  const s = sketch();
  const k = 8;
  const [edge, top] = [0.18, 0.75];
  for (let i = 0; i < k; i++) {
    s.run(Array.from({ length: 9 }, (_, q) => ringPt(Math.sin((Math.PI * q) / 16), edge + (top - edge) * Math.cos((Math.PI * q) / 16), (TAU * i) / k)));
    s.run(Array.from({ length: 9 }, (_, q) => { // the edge sags in between two ribs
      const sag = Math.sin((Math.PI * q) / 8);
      return ringPt(1 - 0.08 * sag, edge + 0.07 * sag, (TAU * (i + q / 8)) / k);
    }));
  }
  s.run([[0, top, 0], [0, -0.7, 0], ...Array.from({ length: 12 }, (_, q) => [0.16 - 0.16 * Math.cos((Math.PI * (q + 1)) / 12), -0.7 - 0.16 * Math.sin((Math.PI * (q + 1)) / 12), 0])]);
  return fitNet(s.net());
})();

const CAULDRON = [[0, -0.8], ...smooth([[0.3, -0.78], [0.7, -0.6], [0.93, -0.25], [0.9, 0.1], [0.76, 0.3], [0.86, 0.4]], 8)];
const CAULDRON_LEGS = [0, 1, 2].flatMap((i) => [ringPt(0.57, -0.84, (TAU * i) / 3 + 0.5), ringPt(0.62, -1, (TAU * i) / 3 + 0.5)]);
const CAULDRON_BUBBLES = [[0.2, 0.62, 0.1], [-0.25, 0.76, -0.1], [0.05, 0.92, 0], [-0.08, 0.56, 0.22], [0.32, 0.98, -0.05]];

const GEM_RING = (() => {
  const s = sketch();
  const base = [0, 0.2, 0];
  s.run(Array.from({ length: 49 }, (_, i) => [0.6 * Math.sin((TAU * i) / 48), -0.4 + 0.6 * Math.cos((TAU * i) / 48), 0])); // the band stands up
  const [girdle, table] = [polyRing(6, 0.36, 0.62), polyRing(6, 0.2, 0.8)];
  s.path(girdle, true).path(table, true);
  girdle.forEach((p, i) => s.line(base, p).line(p, table[i]));
  return s.net();
})();

const PLANE3D = (() => {
  const s = sketch();
  s.path([[1, 0, 0], [0.3, 0, 0], [-0.15, 0, 0], [-0.72, 0, 0], [-1, 0, 0]]);
  for (const z of [1, -1]) {
    s.path([[0.3, 0, 0], [-0.1, 0, z], [-0.34, 0, z], [-0.15, 0, 0]]);
    s.path([[-0.72, 0, 0], [-0.9, 0, 0.4 * z], [-1, 0, 0.4 * z], [-1, 0, 0]]);
  }
  s.path([[-0.72, 0, 0], [-0.94, 0.42, 0], [-1, 0.42, 0], [-1, 0, 0]]);
  const [c, t] = [Math.cos(0.7), Math.sin(0.7)]; // it banks, so that the wings show from the front
  return fitNet(mapNet(s.net(), ([x, y, z]) => [x, y * c + z * t, z * c - y * t]));
})();

const SNOWMAN = [[0, -0.52, 0, 0.48], [0, 0.12, 0, 0.34], [0, 0.62, 0, 0.24]];
const SNOWMAN_ARMS = sketch().line([0.3, 0.2, 0], [0.8, 0.5, 0]).line([-0.3, 0.2, 0], [-0.8, 0.5, 0]).net();

const THINGS = [
  { id: 'chest3d', name: 'Treasure chest', count: 120, min: 14, tags: 'box loot', gen: (n) => netPoints(CHEST, n) },
  { id: 'table', name: 'Table', count: 100, min: 12, tags: 'desk furniture', gen: (n) => netPoints(TABLE, n) },
  { id: 'chair', name: 'Chair', count: 84, min: 12, tags: 'seat furniture', gen: (n) => netPoints(CHAIR, n) },
  { id: 'lantern', name: 'Lantern', count: 100, min: 13, tags: 'lamp light', gen: (n) => netPoints(LANTERN, n) },
  { id: 'mug', name: 'Mug', count: 120, min: 14, tags: 'cup coffee tea', gen: (n) => netPoints(MUG, n) },
  { id: 'bottle3d', name: 'Bottle', count: 100, min: 10, tags: 'glass drink', gen: (n) => lathe(BOTTLE, n, 0.15) },
  { id: 'spinning-top', name: 'Spinning top', count: 100, min: 10, tags: 'toy', gen: (n) => lathe(SPINNING_TOP, n, 0.12) },
  {
    id: 'bell3d', name: '3D bell', count: 100, min: 10, tags: 'ring christmas',
    gen: (n) => mix(n, [{ weight: 1, gen: (k) => lathe(BELL, k, 0.1) }, { fixed: 1, weight: 0, gen: () => [[0, -1, 0]] }]),
  },
  { id: 'hot-air-balloon', name: 'Hot air balloon', count: 140, min: 25, tags: 'fly basket', gen: (n) => netPoints(BALLOON3D, n) },
  {
    id: 'rocket3d', name: '3D rocket', count: 110, min: 20, tags: 'space ship',
    gen: (n) => mix(n, [{ fixed: 1, weight: 3, gen: (k) => ringStack(ROCKET_BODY, k) }, netPart(ROCKET_FINS, 1.2)]),
  },
  {
    id: 'ice-cream3d', name: '3D ice cream', count: 110, min: 28, tags: 'cone scoop sweet',
    gen: (n) => mix(n, [netPart(WAFFLE, 1), { weight: 1.6, gen: (k) => ballPoints(k, 0.5, [0, 0.45, 0], -0.62) }]),
  },
  { id: 'gift3d', name: '3D gift', count: 130, min: 17, tags: 'present box ribbon bow', gen: (n) => netPoints(GIFT3D, n) },
  { id: 'dice', name: 'Dice', count: 89, min: 29, tags: 'die cube game', gen: (n) => netPoints(DICE, n) },
  { id: 'drum', name: 'Drum', count: 96, min: 16, tags: 'music', gen: (n) => netPoints(DRUM, n) },
  { id: 'wizard-hat3d', name: '3D wizard hat', count: 110, min: 12, tags: 'witch magic cone', gen: (n) => wizardHat(n) },
  { id: 'top-hat3d', name: '3D top hat', count: 120, min: 32, tags: 'magician', gen: (n) => netPoints(TOP_HAT, n) },
  { id: 'umbrella3d', name: '3D umbrella', count: 96, min: 10, tags: 'rain parasol', gen: (n) => netPoints(UMBRELLA3D, n) },
  {
    id: 'cauldron', name: 'Cauldron', count: 110, min: 16, tags: 'pot witch potion brew',
    gen: (n) => mix(n, [
      { weight: 1, gen: (k) => lathe(CAULDRON, k) },
      { fixed: 6, weight: 0, gen: (k) => CAULDRON_LEGS.slice(0, k) },
      { fixed: 5, weight: 0, gen: (k) => CAULDRON_BUBBLES.slice(0, k) },
    ]),
  },
  { id: 'gem-ring', name: 'Diamond ring', count: 90, min: 13, tags: 'jewel wedding', gen: (n) => netPoints(GEM_RING, n) },
  { id: 'plane3d', name: '3D airplane', count: 90, min: 15, tags: 'plane aeroplane jet', gen: (n) => netPoints(PLANE3D, n) },
  { id: 'bowling-pin', name: 'Bowling pin', count: 100, min: 10, tags: 'skittle game', gen: (n) => lathe(PIN, n, 0.1) },
  {
    id: 'snowman3d', name: '3D snowman', count: 110, min: 12, tags: 'snow winter christmas',
    gen: (n) => mix(n, [{ weight: 12, gen: (k) => blobPoints(SNOWMAN, k) }, netPart(SNOWMAN_ARMS, 1)]),
  },
];

// ---------------------------------------------------------------- plants and animals

const PINE3D = [[0.14, -1], [0.14, -0.86], [0.8, -0.72], [0.52, -0.45], [0.62, -0.2], [0.36, 0.07], [0.44, 0.3], [0.2, 0.58], [0, 0.95]];
const MUSHROOM3D = [...smooth([[0, 0.95], [0.4, 0.88], [0.75, 0.62], [0.97, 0.22], [0.9, 0.05]], 8), [0.55, 0.02], [0.22, 0], [0.2, -0.5], [0.27, -0.92], [0, -1]];
const APPLE3D = smooth([[0.02, 0.42], [0.18, 0.6], [0.5, 0.7], [0.86, 0.46], [0.96, 0.02], [0.82, -0.48], [0.48, -0.8], [0.16, -0.82], [0.02, -0.72]], 8);
const APPLE_STALK = [[0.02, 0.56, 0], [0.05, 0.72, 0], [0.1, 0.88, 0], [0.24, 0.8, 0], [0.38, 0.84, 0]];

const FLOWER3D = (() => {
  const s = sketch();
  const heart = [0, 0.35, 0];
  const loop = (from, out, side, length, width) => Array.from({ length: 25 }, (_, q) => {
    const f = (TAU * q) / 24;
    return from.map((c, j) => c + out[j] * (length / 2) * (1 - Math.cos(f)) + side[j] * (width / 2) * Math.sin(f));
  });
  for (let i = 0; i < 6; i++) {
    const a = (TAU * i) / 6;
    s.run(loop(heart, [Math.cos(a) * 0.9, 0.44, Math.sin(a) * 0.9], [-Math.sin(a), 0, Math.cos(a)], 0.95, 0.5));
  }
  s.path([heart, [0, -0.5, 0], [0, -1, 0]]);
  s.run(loop([0, -0.5, 0], [0.86, 0.5, 0], [0, 0, 1], 0.6, 0.26)); // a leaf
  return fitNet(s.net());
})();

const PUMPKIN3D = (() => {
  const s = sketch();
  for (let i = 0; i < 8; i++) {
    s.run(Array.from({ length: 21 }, (_, q) => ringPt(Math.sin((Math.PI * q) / 20), -0.12 + 0.62 * Math.cos((Math.PI * q) / 20), (TAU * i) / 8)));
  }
  s.run(smooth([[0, 0.5, 0], [0.04, 0.72, 0], [0.2, 0.9, 0]], 4));
  return fitNet(s.net());
})();

/** A shell: rings along a spiral that get smaller towards the middle. */
const SHELL_RINGS = (() => {
  const rings = Array.from({ length: 14 }, (_, j) => {
    const turn = 0.2 + j * 0.5;
    const reach = 0.7 * 0.9 ** j;
    return { x: reach * Math.cos(turn), y: reach * Math.sin(turn), out: [Math.cos(turn), Math.sin(turn)], r: reach * 0.55 };
  });
  // centred and made as big as fits
  const ends = rings.flatMap((ring) => [1, -1].map((side) => [ring.x + side * ring.out[0] * ring.r, ring.y + side * ring.out[1] * ring.r]));
  const lo = [0, 1].map((c) => Math.min(...ends.map((p) => p[c])));
  const hi = [0, 1].map((c) => Math.max(...ends.map((p) => p[c])));
  const half = Math.max(hi[0] - lo[0], hi[1] - lo[1]) / 2;
  return rings.map((ring) => ({ ...ring, x: (ring.x - (lo[0] + hi[0]) / 2) / half, y: (ring.y - (lo[1] + hi[1]) / 2) / half, r: ring.r / half }));
})();

function shell(n) {
  const per = apportion(SHELL_RINGS.map((ring) => ring.r), n);
  return SHELL_RINGS.flatMap((ring, j) => Array.from({ length: per[j] }, (_, i) => {
    const a = (TAU * (i + (j % 2) / 2)) / per[j];
    return [ring.x + ring.out[0] * ring.r * Math.cos(a), ring.y + ring.out[1] * ring.r * Math.cos(a), ring.r * Math.sin(a)];
  }));
}

const BUTTERFLY3D = (() => {
  const box = [0, 5, 5.2];
  const wing = 'M0,6.2 C1.6,9.2 5.2,9.8 5,7 C4.9,5.6 2.2,5.6 0,5 M0,4.4 C2.4,4 4.4,3.4 4,1.6 C3.6,0 1,0.6 0,3 M0,7 Q0.4,9 1.6,9.8';
  const fold = 0.6; // the wings are half way up
  const right = drawingNet(fitDrawing(parsePath(`${wing} M0,7 L0,2.2`), box), (x, y) => [x * Math.cos(fold), y, x * Math.sin(fold)]);
  const left = drawingNet(fitDrawing(parsePath(wing), box), (x, y) => [-x * Math.cos(fold), y, x * Math.sin(fold)]);
  return fitNet(joinNets(right, left));
})();

const jellyArm = (i) => (t) => {
  const a = (TAU * i) / 6 + 0.3;
  const r = 0.42 + 0.09 * Math.sin(t * 7 + i * 1.7);
  return [r * Math.cos(a), 0.26 - 1.26 * t, r * Math.sin(a)];
};

const CACTUS3D = [
  ...Array.from({ length: 10 }, (_, i) => [0, -0.76 + 0.168 * i, 0, 0.24]),
  [0.36, -0.2, 0, 0.15], [0.52, -0.2, 0, 0.15], [0.68, -0.16, 0, 0.15], [0.74, -0.02, 0, 0.15], [0.74, 0.14, 0, 0.15], [0.74, 0.3, 0, 0.15], [0.74, 0.44, 0, 0.15],
  [-0.36, 0.06, 0, 0.14], [-0.52, 0.06, 0, 0.14], [-0.66, 0.1, 0, 0.14], [-0.72, 0.24, 0, 0.14], [-0.72, 0.4, 0, 0.14], [-0.72, 0.56, 0, 0.14], [-0.72, 0.7, 0, 0.14],
];

const PALM3D = (() => {
  const s = sketch();
  const top = [0.12, 0.42, 0];
  s.run(smooth([[-0.2, -1, 0], [-0.12, -0.5, 0], [0.02, 0, 0], top], 6));
  for (let i = 0; i < 7; i++) {
    const a = (TAU * i) / 7 + 0.2;
    s.run(Array.from({ length: 13 }, (_, q) => {
      const t = q / 12;
      return [top[0] + 0.86 * t * Math.cos(a), top[1] + 0.9 * t - 1.1 * t * t, top[2] + 0.86 * t * Math.sin(a)];
    }));
  }
  s.node([0.22, 0.3, 0.1], [0.02, 0.3, -0.1]); // coconuts
  return fitNet(s.net());
})();

const SPIDER_BODY = [[0, 0, -0.28, 0.3], [0, -0.02, 0.14, 0.19]];
const SPIDER_LEGS = (() => {
  const s = sketch();
  for (const side of [1, -1]) {
    for (let j = 0; j < 4; j++) {
      const z = 0.2 - 0.13 * j;
      s.path([[side * 0.16, 0, z], [side * 0.52, 0.42, z * 2.2], [side * 0.98, -0.45, z * 3.6]]);
    }
  }
  return s.net();
})();

const GRASS = (() => {
  const s = sketch();
  const rnd = dice(7);
  for (let i = 0; i < 11; i++) {
    const a = (TAU * i) / 11 + rnd();
    const reach = 0.3 + 0.6 * rnd();
    const height = 0.9 + rnd();
    s.run(Array.from({ length: 11 }, (_, q) => {
      const t = q / 10;
      const r = 0.12 + reach * t * t;
      return [r * Math.cos(a), -1 + height * (2 * t - t * t), r * Math.sin(a)];
    }));
  }
  return fitNet(s.net());
})();

const BARE_TREE = (() => {
  const s = sketch();
  const grow = (from, dir, length, level) => {
    const to = from.map((c, j) => c + dir[j] * length);
    s.line(from, to);
    if (!level) return;
    const u = unit(cross(dir, Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
    const v = cross(dir, u);
    for (let i = 0; i < 3; i++) {
      const a = (TAU * i) / 3 + level * 0.9;
      grow(to, unit(dir.map((c, j) => c * Math.cos(0.62) + (u[j] * Math.cos(a) + v[j] * Math.sin(a)) * Math.sin(0.62))), length * 0.68, level - 1);
    }
  };
  grow([0, -1, 0], [0, 1, 0], 0.75, 3);
  return fitNet(s.net());
})();

const LIVING = [
  {
    id: 'tree3d', name: '3D tree', count: 100, min: 10, tags: 'plant wood',
    gen: (n) => mix(n, [
      { weight: 8, gen: (k) => ballPoints(k, 0.62, [0, 0.38, 0]) },
      { weight: 1, gen: (k) => Array.from({ length: k }, (_, i) => [0, -1 + (0.8 * (i + 0.5)) / k, 0]) },
    ]),
  },
  { id: 'pine3d', name: '3D pine tree', count: 110, min: 12, tags: 'christmas fir', gen: (n) => ringStack(PINE3D, n) },
  { id: 'mushroom3d', name: '3D mushroom', count: 110, min: 10, tags: 'toadstool', gen: (n) => lathe(MUSHROOM3D, n, 0.1) },
  { id: 'flower3d', name: '3D flower', count: 100, min: 8, tags: 'daisy plant petals', gen: (n) => netPoints(FLOWER3D, n) },
  { id: 'pumpkin3d', name: '3D pumpkin', count: 100, min: 8, tags: 'halloween', gen: (n) => netPoints(PUMPKIN3D, n) },
  {
    id: 'apple3d', name: '3D apple', count: 110, min: 12, tags: 'fruit',
    gen: (n) => mix(n, [{ weight: 1, gen: (k) => lathe(APPLE3D, k, 0.08) }, { fixed: 5, weight: 0, gen: (k) => APPLE_STALK.slice(0, k) }]),
  },
  { id: 'sea-shell', name: 'Sea shell', count: 120, min: 28, tags: 'snail nautilus spiral horn', gen: (n) => shell(n) },
  { id: 'butterfly3d', name: '3D butterfly', count: 110, min: 12, tags: 'wings insect', gen: (n) => netPoints(BUTTERFLY3D, n) },
  {
    id: 'jellyfish3d', name: '3D jellyfish', count: 110, min: 14, tags: 'sea tentacles',
    gen: (n) => mix(n, [
      { weight: 6, gen: (k) => ballPoints(k, 0.72, [0, 0.28, 0], 0, 1) },
      ...Array.from({ length: 6 }, (_, i) => ({ weight: 1.5, gen: (k) => curve(jellyArm(i), k, false, 60) })),
    ]),
  },
  { id: 'cactus3d', name: '3D cactus', count: 120, min: 12, tags: 'desert plant', gen: (n) => blobPoints(CACTUS3D, n) },
  { id: 'palm3d', name: '3D palm tree', count: 84, min: 11, tags: 'beach island coconut', gen: (n) => netPoints(PALM3D, n) },
  {
    id: 'spider3d', name: '3D spider', count: 100, min: 26, tags: 'bug legs halloween',
    gen: (n) => mix(n, [{ weight: 3, gen: (k) => blobPoints(SPIDER_BODY, k) }, netPart(SPIDER_LEGS, 5)]),
  },
  { id: 'grass', name: 'Grass tuft', count: 100, min: 22, tags: 'blades plant', gen: (n) => netPoints(GRASS, n) },
  { id: 'bare-tree', name: 'Bare tree', count: 130, min: 41, tags: 'branches winter dead fractal', gen: (n) => netPoints(BARE_TREE, n) },
];

const under = (sub, list) => list.map((s) => Object.assign(s, { cat: 'solid', group: 'solid', sub }));

export const SOLID_SHAPES = [
  ...under('More solids', SOLIDS),
  ...under('Round things', ROUND),
  ...under('Buildings', BUILDINGS),
  ...under('Things', THINGS),
  ...under('Plants and animals', LIVING),
];
