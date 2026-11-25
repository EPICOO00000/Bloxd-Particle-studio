// More solids, worked out from their corners: the Archimedean solids that
// were still missing, their duals (the Catalan solids), star solids and
// compounds, pieces cut from bigger solids, a geodesic ball, three shadows of
// four-dimensional solids, and letters and numbers with depth.
//
// A solid is a list of corners; its edges are found from them (the corners
// that are nearest to each other, or the sides of its faces), so nothing here
// is a table of edges typed by hand.

import { wire, drawingNet, mapNet, joinNets, wireNet, netPoints } from './shape-kit.js';
import { LETTERS, DIGITS, glyph } from './shapes-text.js';

const PHI = (1 + Math.sqrt(5)) / 2;
const SQ2 = Math.SQRT2;
const TRIB = 1.8392867552141612; // the tribonacci constant: t^3 = t^2 + t + 1 (the snub cube is made of it)

// ---------------------------------------------------------------- corners

const close = (a, b) => Math.abs(a - b) < 1e-7;
const same = (p, q) => p.every((v, i) => close(v, q[i]));
const unique = (points) => points.filter((p, i) => points.findIndex((q) => same(p, q)) === i);
/** A point with every choice of sign for its coordinates that are not 0. */
const signed = (p) => p.reduce((all, v) => (v === 0 ? all.map((q) => [...q, 0]) : all.flatMap((q) => [[...q, v], [...q, -v]])), [[]]);
/** The three turns of a point: (x, y, z), (z, x, y), (y, z, x). */
const turns = ([x, y, z]) => [[x, y, z], [z, x, y], [y, z, x]];
const swaps = ([x, y, z]) => [[y, x, z], [x, z, y], [z, y, x]];
const allOrders = (p) => unique([...turns(p), ...swaps(p)]);
const each = (points, fn) => unique(points.flatMap(fn));
const dist = (p, q) => Math.hypot(...p.map((v, i) => v - q[i]));
const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const minus = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((c) => c / l);
};

const CUBE = signed([1, 1, 1]);
const DODECA = unique([...CUBE, ...each(signed([0, 1 / PHI, PHI]), turns)]);
const ICOSA = each(signed([0, 1, PHI]), turns);
const CUBOCTA = each(signed([1, 1, 0]), allOrders);
const ICOSIDODECA = unique([...each(signed([0, 0, PHI]), allOrders), ...each(signed([0.5, PHI / 2, (PHI * PHI) / 2]), turns)]);
const RHOMBICOSI = unique([...each(signed([1, 1, PHI ** 3]), turns), ...each(signed([PHI * PHI, PHI, 2 * PHI]), turns), ...each(signed([2 + PHI, 0, PHI * PHI]), turns)]);
const evenMinus = (points) => points.filter((p) => p.filter((v) => v < 0).length % 2 === 0);
const oddMinus = (points) => points.filter((p) => p.filter((v) => v < 0).length % 2 === 1);
const SNUB_CUBE = unique([...oddMinus(signed([1, 1 / TRIB, TRIB])).flatMap(turns), ...evenMinus(signed([1, 1 / TRIB, TRIB])).flatMap(swaps)]);

// ---------------------------------------------------------------- edges and faces

/** The pairs of corners that are a given distance apart: `rank` 0 is the shortest distance there is, 1 the next one, ... */
function pairsAt(points, rank = 0, metric = dist) {
  const lengths = [];
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) lengths.push(metric(points[i], points[j]));
  const levels = [];
  for (const l of lengths.sort((a, b) => a - b)) if (!levels.length || l - levels[levels.length - 1] > 1e-6) levels.push(l);
  const want = levels[rank];
  const out = [];
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) if (Math.abs(metric(points[i], points[j]) - want) < 1e-6) out.push([i, j]);
  return out;
}

/** The faces of a solid without dents, from its corners: [{ normal, far, corners: [index, ...] in order round the face }, ...]. */
function facesOf(points) {
  const faces = new Map();
  const n = points.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        let normal = cross(minus(points[j], points[i]), minus(points[k], points[i]));
        if (Math.hypot(...normal) < 1e-9) continue;
        normal = unit(normal);
        let far = dot(normal, points[i]);
        if (far < 0) {
          normal = normal.map((c) => -c);
          far = -far;
        }
        // a face: no corner lies beyond its plane
        if (points.some((p) => dot(normal, p) - far > 1e-7)) continue;
        const on = [];
        for (let m = 0; m < n; m++) if (Math.abs(dot(normal, points[m]) - far) < 1e-7) on.push(m);
        const key = on.join(',');
        if (faces.has(key)) continue;
        // in order round the middle of the face
        const middle = on.reduce((sum, m) => sum.map((c, a) => c + points[m][a] / on.length), [0, 0, 0]);
        const u = unit(minus(points[on[0]], middle));
        const v = cross(normal, u);
        const angle = (m) => Math.atan2(dot(minus(points[m], middle), v), dot(minus(points[m], middle), u));
        faces.set(key, { normal, far, corners: on.slice().sort((a, b) => angle(a) - angle(b)) });
      }
    }
  }
  return [...faces.values()];
}

/** The dual of a solid: a corner for every face (on the same side, at 1 / its distance), and an edge wherever two faces meet. */
function dual(points) {
  const faces = facesOf(points);
  const corners = faces.map(({ normal, far }) => normal.map((c) => c / far));
  const owner = new Map();
  const edges = [];
  faces.forEach(({ corners: ring }, f) => {
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (owner.has(key)) edges.push([owner.get(key), f]);
      else owner.set(key, f);
    });
  });
  return [corners, edges];
}

/** Corners and edges made to fit the box: the farthest corner is 1 from the middle. `up` turns the solid so that this direction points up. */
function fitted([points, edges], up = null) {
  let turnedPoints = points;
  if (up) {
    const y = unit(up);
    const x = unit(cross(Math.abs(y[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1], y));
    const z = cross(x, y);
    turnedPoints = points.map((p) => [dot(p, x), dot(p, y), dot(p, z)]);
  }
  const reach = Math.max(...turnedPoints.map((p) => Math.hypot(...p)));
  return [turnedPoints.map((p) => p.map((c) => c / reach)), edges];
}

const lazy = (make) => {
  let value;
  return () => (value === undefined ? (value = make()) : value);
};

function solid(id, name, tags, make, sub = 'Polyhedra') {
  const model = lazy(() => fitted(make()));
  const shape = { id, name, cat: 'solid', sub, group: 'solid', tags, gen: (n) => wire(model()[0], model()[1], n) };
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => model()[0].length });
  Object.defineProperty(shape, 'count', { enumerable: true, get: () => Math.max(shape.min, Math.min(300, model()[0].length + 2 * model()[1].length + (model()[1].length < 40 ? model()[1].length : 0))) });
  return shape;
}

const nearest = (points) => [points, pairsAt(points)];
const duals = (points) => dual(points);

// ---------------------------------------------------------------- pieces of bigger solids

/** The corners on one side of the middle, looking along `axis`: the highest `rows` rows of corners. */
function cap(points, axis, rows) {
  const y = unit(axis);
  const heights = [];
  for (const h of points.map((p) => dot(p, y)).sort((a, b) => b - a)) if (!heights.length || heights[heights.length - 1] - h > 1e-6) heights.push(h);
  const lowest = heights[rows - 1];
  const kept = points.filter((p) => dot(p, y) > lowest - 1e-6);
  // (so that the piece stands on its wide face, in the middle of the box)
  const middle = (heights[0] + lowest) / 2;
  return kept.map((p) => minus(p, y.map((c) => c * middle)));
}
const standing = (points, axis) => fitted(nearest(points), axis);

// ---------------------------------------------------------------- a geodesic ball

function geodesic() {
  const faces = facesOf(ICOSA);
  const corners = ICOSA.map(unit);
  const edges = [];
  const middles = new Map();
  const middle = (a, b) => {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (!middles.has(key)) {
      middles.set(key, corners.length);
      corners.push(unit(corners[a].map((c, i) => c + corners[b][i])));
      edges.push([a, middles.get(key)], [middles.get(key), b]);
    }
    return middles.get(key);
  };
  for (const { corners: [a, b, c] } of faces) {
    const ab = middle(a, b);
    const bc = middle(b, c);
    const ca = middle(c, a);
    edges.push([ab, bc], [bc, ca], [ca, ab]);
  }
  return [corners, edges];
}

// ---------------------------------------------------------------- shadows of solids with four dimensions

/** A solid of four dimensions seen in three: what is further away in the fourth direction looks smaller. */
function shadow(points4) {
  const reach = Math.max(...points4.map((p) => Math.hypot(...p)));
  const dist4 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2], p[3] - q[3]);
  const edges = pairsAt(points4, 0, dist4);
  return [points4.map(([x, y, z, w]) => [x, y, z].map((c) => c / (2.4 - w / reach))), edges];
}
const signed4 = (p) => p.reduce((all, v) => (v === 0 ? all.map((q) => [...q, 0]) : all.flatMap((q) => [[...q, v], [...q, -v]])), [[]]);
const orders4 = (p) => {
  const out = [];
  const walk = (rest, taken) => {
    if (!rest.length) out.push(taken);
    rest.forEach((v, i) => walk([...rest.slice(0, i), ...rest.slice(i + 1)], [...taken, v]));
  };
  walk(p, []);
  return out.filter((q, i) => out.findIndex((r) => r.every((v, k) => v === q[k])) === i);
};
// (turned a little, so that no two corners hide each other)
const tilt4 = (points) => points.map(([x, y, z, w]) => {
  const c = Math.cos(0.5);
  const s = Math.sin(0.5);
  return [x * c - w * s, y, z, x * s + w * c];
});

// ---------------------------------------------------------------- the solids

const SOLIDS = [
  solid('truncated-dodecahedron', 'Truncated dodecahedron', 'archimedean triangles decagons 32 faces', () => nearest(unique([
    ...each(signed([0, 1 / PHI, 2 + PHI]), turns), ...each(signed([1 / PHI, PHI, 2 * PHI]), turns), ...each(signed([PHI, 2, PHI + 1]), turns),
  ]))),
  solid('rhombicuboctahedron', 'Rhombi-cuboctahedron', 'rhombicuboctahedron archimedean squares triangles 26 faces', () => nearest(each(signed([1, 1, 1 + SQ2]), allOrders))),
  solid('truncated-cuboctahedron', 'Truncated cuboctahedron', 'great rhombicuboctahedron archimedean squares hexagons octagons', () => nearest(each(signed([1, 1 + SQ2, 1 + 2 * SQ2]), allOrders))),
  solid('snub-cube', 'Snub cube', 'archimedean twisted triangles squares 38 faces', () => nearest(SNUB_CUBE)),
  solid('rhombicosidodecahedron', 'Rhomb-icosidodecahedron', 'rhombicosidodecahedron archimedean squares triangles pentagons 62 faces', () => nearest(RHOMBICOSI)),
  solid('triakis-tetrahedron', 'Triakis tetrahedron', 'catalan dual spiked 12 faces', () => duals(evenMinus(each(signed([1, 1, 3]), allOrders)))),
  solid('triakis-octahedron', 'Triakis octahedron', 'catalan dual spiked 24 faces', () => duals(each(signed([SQ2 - 1, 1, 1]), allOrders))),
  solid('tetrakis-hexahedron', 'Tetrakis hexahedron', 'catalan dual cube with pyramids 24 faces', () => duals(each(signed([0, 1, 2]), allOrders))),
  solid('deltoidal-icositetrahedron', 'Deltoidal icosi-tetrahedron', 'icositetrahedron catalan dual kites 24 faces', () => duals(each(signed([1, 1, 1 + SQ2]), allOrders))),
  solid('disdyakis-dodecahedron', 'Disdyakis dodecahedron', 'catalan dual triangles 48 faces', () => duals(each(signed([1, 1 + SQ2, 1 + 2 * SQ2]), allOrders))),
  solid('pentagonal-icositetrahedron', 'Pentagonal icosi-tetrahedron', 'icositetrahedron catalan dual pentagons 24 faces twisted', () => duals(SNUB_CUBE)),
  solid('rhombic-triacontahedron', 'Rhombic triacontahedron', 'catalan dual diamonds 30 faces dice', () => duals(ICOSIDODECA)),
  solid('triakis-icosahedron', 'Triakis icosahedron', 'catalan dual spiked 60 faces', () => duals(unique([
    ...each(signed([0, 1 / PHI, 2 + PHI]), turns), ...each(signed([1 / PHI, PHI, 2 * PHI]), turns), ...each(signed([PHI, 2, PHI + 1]), turns),
  ]))),
  solid('pentakis-dodecahedron', 'Pentakis dodecahedron', 'catalan dual spiked 60 faces ball', () => duals(unique([
    ...each(signed([0, 1, 3 * PHI]), turns), ...each(signed([1, 2 + PHI, 2 * PHI]), turns), ...each(signed([PHI, 2, 2 * PHI + 1]), turns),
  ]))),
  solid('deltoidal-hexecontahedron', 'Deltoidal hexecontahedron', 'catalan dual kites 60 faces', () => duals(RHOMBICOSI)),
  solid('small-stellated-dodecahedron', 'Small stellated dodecahedron', 'star solid kepler spikes pentagrams', () => [ICOSA, pairsAt(ICOSA, 1)]),
  solid('great-stellated-dodecahedron', 'Great stellated dodecahedron', 'star solid kepler spikes pentagrams', () => [DODECA, pairsAt(DODECA, 3)]),
  solid('five-cubes', 'Five cubes in one', 'compound of five cubes star solid', () => [DODECA, pairsAt(DODECA, 1)]),
  solid('ten-tetrahedra', 'Ten tetrahedra in one', 'compound of ten tetrahedra star solid', () => [DODECA, pairsAt(DODECA, 2)]),
  solid('dodecahedron-icosahedron', 'Dodecahedron and icosahedron', 'compound dual pair star solid', () => {
    // each is as big as it has to be for their edges to cross in the middle
    const half = (points) => {
      const [a, b] = pairsAt(points)[0];
      return Math.hypot(...points[a].map((c, i) => (c + points[b][i]) / 2));
    };
    const scale = half(DODECA) / half(ICOSA);
    const corners = [...DODECA, ...ICOSA.map((p) => p.map((c) => c * scale))];
    return [corners, [...pairsAt(DODECA), ...pairsAt(ICOSA).map(([a, b]) => [a + DODECA.length, b + DODECA.length])]];
  }),
  solid('geodesic-ball', 'Geodesic ball', 'sphere of triangles dome golf climbing frame', geodesic),
  solid('triangular-cupola', 'Triangular cupola', 'johnson solid half cuboctahedron roof', () => standing(cap(CUBOCTA, [1, 1, 1], 2), [1, 1, 1])),
  solid('pentagonal-cupola', 'Pentagonal cupola', 'johnson solid roof dome', () => standing(cap(RHOMBICOSI, [0, PHI, 1], 2), [0, PHI, 1])),
  solid('pentagonal-rotunda', 'Pentagonal rotunda', 'johnson solid half icosidodecahedron dome', () => standing(cap(ICOSIDODECA, [0, PHI, 1], 3), [0, PHI, 1])),
  solid('pentachoron', 'Shadow of a 5-cell', 'four dimensions 4d simplex pentachoron hyper pyramid', () => shadow([
    [1, 1, 1, -1 / Math.sqrt(5)], [1, -1, -1, -1 / Math.sqrt(5)], [-1, 1, -1, -1 / Math.sqrt(5)], [-1, -1, 1, -1 / Math.sqrt(5)], [0, 0, 0, 4 / Math.sqrt(5)],
  ])),
  solid('hexadecachoron', 'Shadow of a 16-cell', 'four dimensions 4d hyper octahedron cross', () => shadow(tilt4(orders4([1, 0, 0, 0]).flatMap(signed4)))),
  solid('icositetrachoron', 'Shadow of a 24-cell', 'four dimensions 4d hyper diamond', () => shadow(tilt4(orders4([1, 1, 0, 0]).flatMap(signed4).filter((p, i, all) => all.findIndex((q) => q.every((v, k) => v === p[k])) === i)))),
];

// ---------------------------------------------------------------- letters and numbers with depth

const DEEP = 0.24;

function deep(d) {
  const net = lazy(() => {
    const front = drawingNet(glyph(d), (x, y) => [x, y, DEEP]);
    const back = mapNet(front, ([x, y]) => [x, y, -DEEP]);
    const ties = wireNet([...front.nodes, ...back.nodes], front.nodes.map((_, i) => [i, i + front.nodes.length]));
    return joinNets(front, back, ties);
  });
  return net;
}

const deepSign = (id, name, sign, d, words) => {
  const net = deep(d);
  const shape = { id, name, cat: 'solid', sub: 'Letters in 3D', group: 'solid', tags: `${sign} ${words} thick block depth extruded`, gen: (n) => netPoints(net(), n) };
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => net().nodes.length });
  Object.defineProperty(shape, 'count', { enumerable: true, get: () => Math.max(net().nodes.length + 8, Math.min(200, Math.round(net().lens.reduce((sum, l) => sum + l, 0) / 0.11))) });
  return shape;
};

const deepLetters = [
  ...Object.entries(LETTERS).map(([letter, d]) => deepSign(`letter3d-${letter.toLowerCase()}`, `3D letter ${letter}`, letter, d, 'letter capital')),
  ...Object.entries(DIGITS).map(([digit, d]) => deepSign(`number3d-${digit}`, `3D number ${digit}`, digit, d, 'number digit')),
];

export const SOLID2_SHAPES = [...SOLIDS, ...deepLetters];
