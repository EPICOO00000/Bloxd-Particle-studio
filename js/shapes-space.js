// More 3D shapes, added when the library grew to 3,624 shapes: solids with
// corners, round things and buildings. The tools are in shape-kit.js; the ones
// at the top of this file are also used by shapes-models.js and shapes-magic.js.

import {
  TAU, RAD, P, apportion, memo, dice, makeNet, wireNet, netPoints, parsePath, fitDrawing, drawingNet, fitNet, sketch,
} from './shape-kit.js';

// ---------------------------------------------------------------- tools

/** A point on a ring around the Y axis. */
export const ringPt = (r, y, a) => [r * Math.cos(a), y, r * Math.sin(a)];
/** k points on a ring around the Y axis. */
export const polyRing = (k, r, y, turn = 0) => Array.from({ length: k }, (_, i) => ringPt(r, y, turn + (TAU * i) / k));
export const equal = (parts, n) => apportion(Array(parts).fill(1), n);
export const some = (k, make) => (k > 0 ? make(k) : []);
/** A value that is worked out the first time it is asked for. */
export const lazy = (make) => {
  let made = null;
  return () => (made ||= make());
};

export const X = [1, 0, 0];
export const Y = [0, 1, 0];
export const Z = [0, 0, 1];

/** Adds a box to a sketch: from the corner (x0, y0, z0) to the corner (x1, y1, z1). */
export function box(s, x0, y0, z0, x1, y1, z1) {
  const c = (i) => [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0];
  for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) s.line(c(i), c(i | bit));
  return s;
}

/**
 * Adds a circle to a sketch as `k` arcs: around `centre`, in the plane of the
 * two directions u and v. Returns the k corners between the arcs, so that other
 * lines can start there. `turn` (in turns of 1/k) moves the first corner.
 */
export function circle(s, centre, r, u, v, k = 4, turn = 0) {
  const at = (f) => {
    const a = (TAU * (f + turn)) / k;
    return centre.map((c, i) => c + r * (Math.cos(a) * u[i] + Math.sin(a) * v[i]));
  };
  for (let i = 0; i < k; i++) s.run(Array.from({ length: 7 }, (_, j) => at(i + j / 6)));
  return Array.from({ length: k }, (_, i) => at(i));
}

/** A straight line in a sketch, cut at the given points so that other lines can meet it there. */
export const cutLine = (s, ...pts) => s.path(pts);

/** A flat drawing given thickness: the outline in front and behind, joined at every corner. */
export function slab(d, depth) {
  const drawing = fitDrawing(typeof d === 'string' ? parsePath(d) : d);
  const front = drawingNet(drawing, (x, y) => [x, y, depth]);
  const back = drawingNet(drawing, (x, y) => [x, y, -depth]);
  return makeNet([...front.nodes, ...back.nodes], [...front.chains, ...back.chains, ...front.nodes.map((p, i) => [p, back.nodes[i]])]);
}

/**
 * A shape made of lines in space. `build` returns a net or a sketch (for a
 * shape with sliders: from their values, in order). It is built the first time
 * the shape is used, and centred and fitted in the box unless `fit` is false.
 * Without `count`, the usual number of particles comes from the length of the lines.
 */
export function wire(id, name, build, tags, { count, params, fit = true } = {}) {
  const keys = (params || []).map((p) => p.key);
  const netFor = memo((...values) => {
    const made = build(...values);
    const net = typeof made.net === 'function' ? made.net() : made;
    return fit ? fitNet(net) : net;
  });
  const usual = lazy(() => {
    const net = netFor(...(params || []).map((p) => p.default));
    const least = Math.max(8, net.nodes.length);
    const length = net.lens.reduce((sum, l) => sum + l, 0);
    return { min: least, count: count ?? Math.max(least + 8, Math.min(150, Math.round(length / 0.16))) };
  });
  const shape = { id, name, tags, gen: (n, p) => netPoints(netFor(...keys.map((k) => p[k])), n) };
  if (params) shape.params = params;
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => usual().min });
  Object.defineProperty(shape, 'count', { enumerable: true, get: () => usual().count });
  return shape;
}

/**
 * Rings of particles along a bent line in the XY plane, like a hose:
 * `axis(t)` is the middle of the hose and `wide(t)` how thick it is there
 * (t from 0 to 1).
 */
export function tube(axis, wide, n, rings) {
  const at = Array.from({ length: rings }, (_, j) => j / (rings - 1));
  const per = apportion(at.map((t) => Math.max(0.03, wide(t))), n);
  return at.flatMap((t, j) => {
    const [x, y] = axis(t);
    const [ax, ay] = axis(Math.min(1, t + 0.01));
    const [bx, by] = axis(Math.max(0, t - 0.01));
    const len = Math.hypot(ax - bx, ay - by) || 1;
    const [nx, ny] = [-(ay - by) / len, (ax - bx) / len]; // across the hose, in the plane of the drawing
    const r = wide(t);
    return Array.from({ length: per[j] }, (_, i) => {
      const a = (TAU * (i + (j % 2) / 2)) / per[j];
      return [x + r * Math.cos(a) * nx, y + r * Math.cos(a) * ny, r * Math.sin(a)];
    });
  });
}

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

/** Every way of giving the parts of v that are not 0 a sign. */
function signsOf(v) {
  let out = [[]];
  for (const c of v) out = out.flatMap((head) => (c === 0 ? [[...head, 0]] : [[...head, c], [...head, -c]]));
  return out;
}
const ORDERS = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1], [2, 1, 0], [1, 0, 2]]; // the first three only turn the parts round
/** All the corners that come from (a, b, c) by changing signs and swapping the parts (`turnsOnly`: by turning them round only). */
function corners(v, turnsOnly = false) {
  const seen = new Set();
  return ORDERS.slice(0, turnsOnly ? 3 : 6).flatMap((order) => signsOf(order.map((i) => v[i]))).filter((p) => {
    const key = p.map((c) => Math.round(c * 1e6)).join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The same corners, turned so that the direction `up` points up. */
function stand(verts, up) {
  const len = Math.hypot(...up);
  const e2 = up.map((c) => c / len);
  const side = Math.abs(e2[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const raw = cross(side, e2);
  const e1 = raw.map((c) => c / Math.hypot(...raw));
  const e3 = cross(e1, e2);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return verts.map((v) => [dot(v, e1), dot(v, e2), dot(v, e3)]);
}

/** A solid whose edges are all the same length, from its corners. */
const regular = (verts, edge) => () => wireNet(verts, edgesOf(verts, edge));

// ---------------------------------------------------------------- more solids

const PHI = (1 + Math.sqrt(5)) / 2;

/** The 12 corners of an icosahedron on the unit ball, one of them on top. */
const ICOSA = (() => {
  const v = [[0, 1, 0], [0, -1, 0]];
  const h = 1 / Math.sqrt(5);
  for (let i = 0; i < 5; i++) v.push(ringPt(2 * h, h, (TAU * i) / 5), ringPt(2 * h, -h, (TAU * (i + 0.5)) / 5));
  return v;
})();

function tenSided() {
  // two points and a zigzag belt of ten corners; the belt is just high enough for the ten kites to be flat
  const belt = (1 - Math.cos(36 * RAD)) / (1 + Math.cos(36 * RAD));
  const up = polyRing(5, 0.72, belt);
  const down = polyRing(5, 0.72, -belt, Math.PI / 5);
  const s = sketch();
  for (let i = 0; i < 5; i++) s.line([0, 1, 0], up[i]).line([0, -1, 0], down[i]).line(up[i], down[i]).line(down[i], up[(i + 1) % 5]);
  return s;
}

function tetraInCube() {
  const s = sketch();
  for (const [a, b] of CUBE_EDGES) s.line(corner(a), corner(b));
  const four = [0, 3, 5, 6].map((i) => corner(i)); // every second corner of the cube
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) s.line(four[i], four[j]);
  return s;
}

function cubeAndOctahedron() {
  // the edges of the two cross each other in the middle, so each one is drawn as two halves that meet there
  const s = sketch();
  const halves = (a, b) => {
    const mid = a.map((v, i) => (v + b[i]) / 2);
    s.line(a, mid).line(mid, b);
  };
  for (const [a, b] of CUBE_EDGES) halves(corner(a), corner(b));
  const tips = corners([2, 0, 0]);
  for (const [a, b] of edgesOf(tips, 2 * Math.SQRT2)) halves(tips[a], tips[b]);
  return s;
}

function ballInCube() {
  const s = box(sketch(), -1, -1, -1, 1, 1, 1);
  circle(s, [0, 0, 0], 1, X, Y);
  circle(s, [0, 0, 0], 1, Y, Z);
  circle(s, [0, 0, 0], 1, Z, X);
  return s;
}

function sierpinskiPyramid(depth) {
  const s = sketch();
  const grow = (verts, level) => {
    if (level === 0) {
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) s.line(verts[i], verts[j]);
      return;
    }
    // four smaller pyramids, one in each corner
    for (const v of verts) grow(verts.map((w) => w.map((c, k) => (c + v[k]) / 2)), level - 1);
  };
  grow([[0, 1, 0], ...polyRing(3, Math.sqrt(8 / 9), -1 / 3, Math.PI / 2)], depth);
  return s;
}

function crystalCluster() {
  const s = sketch();
  // [where it stands (x, z), how thick, how long, how far it leans (degrees), towards where (degrees)]
  for (const [x, z, thick, long, lean, side] of [[0, 0, 0.2, 1.8, 0, 0], [0.2, 0.06, 0.14, 1.25, 34, 15], [-0.18, 0.1, 0.13, 1.05, 32, 190]]) {
    const [cl, sl, cs, ss] = [Math.cos(lean * RAD), Math.sin(lean * RAD), Math.cos(side * RAD), Math.sin(side * RAD)];
    const place = ([px, py, pz]) => {
      const along = px * cs + pz * ss;
      const across = -px * ss + pz * cs;
      const out = along * cl + py * sl;
      return [x + out * cs - across * ss, py * cl - along * sl, z + out * ss + across * cs];
    };
    const foot = polyRing(6, thick, 0).map(place);
    const shoulder = polyRing(6, thick, long * 0.8).map(place);
    const tip = place([0, long, 0]);
    s.path(shoulder, true);
    shoulder.forEach((p, i) => s.line(foot[i], p).line(p, tip));
  }
  return s;
}

const CRESCENT = 'N A0,0 5 60 300 A3.2,0 4.3863 260.817 99.183 Z';

const SOLIDS = [
  wire('truncated-tetrahedron', 'Truncated tetrahedron', regular(stand(corners([1, 1, 3]).filter((v) => v.filter((c) => c < 0).length % 2 === 0), [1, 1, 1]), Math.sqrt(8)), 'cut corners pyramid hexagons triangles solid'),
  wire('truncated-octahedron', 'Truncated octahedron', regular(corners([0, 1, 2]), Math.SQRT2), 'cut corners hexagons squares solid fills space'),
  wire('truncated-cube', 'Truncated cube', regular(corners([Math.SQRT2 - 1, 1, 1]), 2 * (Math.SQRT2 - 1)), 'cut corners octagons triangles solid block'),
  wire('rhombic-dodecahedron', 'Rhombic dodecahedron', regular([...corners([1, 1, 1]), ...corners([2, 0, 0])], Math.sqrt(3)), 'twelve diamonds garnet crystal solid'),
  wire('icosidodecahedron', 'Icosidodecahedron', regular([...corners([0, 0, PHI]), ...corners([0.5, PHI / 2, (PHI * PHI) / 2], true)], 1), 'pentagons triangles thirty corners solid ball', { count: 150 }),
  wire('ten-sided-dice', 'Ten-sided dice', tenSided, 'd10 die kites game roll trapezohedron'),
  wire('tetrahedron-in-cube', 'Tetrahedron in a cube', tetraInCube, 'pyramid inside box diagonals'),
  wire('cube-and-octahedron', 'Cube and octahedron', cubeAndOctahedron, 'two solids through each other compound star'),
  wire('ball-in-cube', 'Ball in a cube', ballInCube, 'sphere inside box rings globe'),
  wire('sierpinski-pyramid', 'Sierpinski pyramid', (depth) => sierpinskiPyramid(Math.round(depth)), 'fractal tetrahedron triangles tetrix', { params: [P('depth', 'Depth', 1, 2, 1, 1)], count: 100 }),
  wire('slanted-box', 'Slanted box', (lean) => wireNet(Array.from({ length: 8 }, (_, i) => {
    const [x, y, z] = corner(i, 1, 0.7, 0.6);
    return [x + lean * y, y, z];
  }), CUBE_EDGES), 'leaning skew parallelogram pushed over', { params: [P('lean', 'Lean', 0.1, 1.5, 0.05, 0.7)], count: 80 }),
  wire('cupola', 'Cupola', regular([...polyRing(8, 1, 0, Math.PI / 8), ...polyRing(4, Math.SQRT1_2 * 2 * Math.sin(Math.PI / 8), Math.SQRT1_2 * 2 * Math.sin(Math.PI / 8), Math.PI / 4)], 2 * Math.sin(Math.PI / 8)), 'roof octagon square top solid'),
  wire('crystal-cluster3d', '3D crystal cluster', crystalCluster, 'gems quartz spikes ore cave minerals'),
  wire('moon-block', 'Moon block', () => slab(CRESCENT, 0.25), '3d thick crescent night'),
];

// ---------------------------------------------------------------- round things

const HORN = (t) => {
  const a = (-70 + 230 * t) * RAD;
  return [0.6 * Math.cos(a), 0.6 * Math.sin(a)];
};

/** A pipe with a bend: up, round the corner, and along. */
function pipeBend(t) {
  const d = t * 2.435;
  if (d < 0.85) return [-0.6, -0.95 + d];
  if (d < 1.635) {
    const a = Math.PI - (d - 0.85) / 0.5;
    return [-0.1 + 0.5 * Math.cos(a), -0.1 + 0.5 * Math.sin(a)];
  }
  return [-0.1 + (d - 1.635), 0.4];
}

function saddle() {
  const s = sketch();
  const at = (x, z) => [x, 0.55 * (x * x - z * z), z];
  const stops = [-1, -0.5, 0, 0.5, 1];
  for (const a of stops) {
    for (let i = 0; i + 1 < stops.length; i++) {
      const piece = (fn) => Array.from({ length: 5 }, (_, j) => fn(stops[i] + ((stops[i + 1] - stops[i]) * j) / 4));
      s.run(piece((t) => at(t, a))).run(piece((t) => at(a, t)));
    }
  }
  return s;
}

function boulder() {
  const next = dice(11);
  const verts = ICOSA.map((v) => {
    const r = 0.7 + 0.3 * next();
    return [v[0] * r, v[1] * r * 0.72, v[2] * r];
  });
  return wireNet(verts, edgesOf(ICOSA, 1.05146));
}

const ROUND = [
  { id: 'horn3d', name: '3D horn', count: 130, min: 14, tags: 'viking drinking cornucopia tusk trumpet', gen: (n) => tube(HORN, (t) => 0.015 + 0.36 * (1 - t) ** 0.85, n, 15) },
  { id: 'pipe-bend', name: 'Pipe bend', count: 140, min: 14, tags: 'elbow tube plumbing drain corner', gen: (n) => tube(pipeBend, (t) => (t < 0.02 || t > 0.98 ? 0.36 : 0.28), n, 15) },
  wire('saddle', 'Saddle surface', saddle, 'curved sheet crisp chip pringle bent grid'),
  wire('boulder', 'Boulder', boulder, 'rock stone low poly asteroid lump'),
];

// ---------------------------------------------------------------- buildings

const square = (h, y) => [[-h, y, -h], [h, y, -h], [h, y, h], [-h, y, h]];

function pagoda() {
  const s = sketch();
  s.path(square(0.45, -1), true);
  square(0.45, -1).forEach((p, i) => s.line(p, square(0.45, -0.55)[i]));
  // three roofs, each one wider than the top of the roof below it
  [[0.8, 0.3], [0.6, 0.2], [0.4, 0]].forEach(([eave, top], tier) => {
    const y = -0.55 + 0.5 * tier;
    s.path(square(eave, y), true);
    square(eave, y).forEach((p, i) => s.line(p, top ? square(top, y + 0.5)[i] : [0, y + 0.5, 0]));
  });
  return s.line([0, 0.95, 0], [0, 1.2, 0]);
}

function skyscraper() {
  const s = sketch();
  box(s, -0.42, -1, -0.42, 0.42, 0.2, 0.42);
  box(s, -0.3, 0.2, -0.3, 0.3, 0.62, 0.3);
  box(s, -0.16, 0.62, -0.16, 0.16, 0.84, 0.16);
  return s.line([0, 0.84, 0], [0, 1.12, 0]);
}

function church() {
  const s = sketch();
  // the nave: back wall, the long edges and the ridge of the roof
  s.path([[-0.4, 0, -1], [0.4, 0, -1], [0.4, 0.5, -1], [0, 0.85, -1], [-0.4, 0.5, -1]], true).line([-0.4, 0.5, -1], [0.4, 0.5, -1]);
  for (const x of [-0.4, 0.4]) s.line([x, 0, -1], [x, 0, 0.3]).line([x, 0.5, -1], [x, 0.5, 0.3]).line([x, 0, 0.3], [x, 0.5, 0.3]).line([x, 0.5, 0.3], [x * 0.75, 0.5, 0.3]);
  s.line([0, 0.85, -1], [0, 0.85, 0.3]);
  cutLine(s, [-0.4, 0, 0.3], [-0.3, 0, 0.3], [0.3, 0, 0.3], [0.4, 0, 0.3]);
  // the tower in front of it, with a pointed roof and a cross
  for (const x of [-0.3, 0.3]) {
    cutLine(s, [x, 0, 0.3], [x, 0.5, 0.3], [x, 1.1, 0.3]);
    s.line([x, 0, 0.9], [x, 1.1, 0.9]).line([x, 0, 0.3], [x, 0, 0.9]).line([x, 1.1, 0.3], [x, 1.1, 0.9]);
    for (const z of [0.3, 0.9]) s.line([x, 1.1, z], [0, 1.75, 0.6]);
  }
  s.line([-0.3, 0, 0.9], [0.3, 0, 0.9]).line([-0.3, 1.1, 0.9], [0.3, 1.1, 0.9]).line([-0.3, 1.1, 0.3], [0.3, 1.1, 0.3]);
  cutLine(s, [0, 1.75, 0.6], [0, 1.95, 0.6], [0, 2.1, 0.6]);
  return cutLine(s, [-0.12, 1.95, 0.6], [0, 1.95, 0.6], [0.12, 1.95, 0.6]);
}

function barn() {
  const s = sketch();
  const roof = [[-0.7, 0.6], [-0.45, 0.95], [0, 1.12], [0.45, 0.95], [0.7, 0.6]];
  for (const z of [-0.5, 0.5]) {
    s.path(roof.map(([x, y]) => [x, y, z]));
    for (const x of [-0.7, 0.7]) s.line([x, 0, z], [x, 0.6, z]);
    s.line([-0.7, 0.6, z], [0.7, 0.6, z]);
  }
  for (const [x, y] of [[-0.7, 0], [0.7, 0], ...roof]) s.line([x, y, -0.5], [x, y, 0.5]);
  s.line([-0.7, 0, -0.5], [0.7, 0, -0.5]);
  // the front, with a big door and its two crossed boards
  cutLine(s, [-0.7, 0, 0.5], [-0.25, 0, 0.5], [0.25, 0, 0.5], [0.7, 0, 0.5]);
  s.path([[-0.25, 0, 0.5], [-0.25, 0.45, 0.5], [0.25, 0.45, 0.5], [0.25, 0, 0.5]]);
  for (const [x, y] of [[-0.25, 0], [0.25, 0], [-0.25, 0.45], [0.25, 0.45]]) s.line([x, y, 0.5], [0, 0.225, 0.5]);
  return s;
}

function tent() {
  const s = sketch();
  for (const z of [-0.6, 0.6]) s.line([-0.6, 0, z], [0, 0.8, z]).line([0, 0.8, z], [0.6, 0, z]).line([0, 0.8, z], [0, 0, z * 1.5]); // and a rope to a peg
  for (const [x, y] of [[-0.6, 0], [0.6, 0], [0, 0.8]]) s.line([x, y, -0.6], [x, y, 0.6]);
  s.line([-0.6, 0, -0.6], [0.6, 0, -0.6]);
  cutLine(s, [-0.6, 0, 0.6], [0, 0, 0.6], [0.6, 0, 0.6]);
  return s.line([0, 0.8, 0.6], [0, 0, 0.6]); // the way in
}

function well() {
  const s = sketch();
  const low = circle(s, [0, -1, 0], 0.55, X, Z, 6);
  const high = circle(s, [0, -0.35, 0], 0.55, X, Z, 6);
  low.forEach((p, i) => s.line(p, high[i]));
  // two posts, a bar with the rope, and a little roof
  for (const x of [-0.55, 0.55]) {
    cutLine(s, [x, -0.35, 0], [x, 0.2, 0], [x, 0.95, 0]);
    for (const z of [-0.4, 0.4]) s.line([x * 1.4, 0.95, 0], [x * 1.4, 0.55, z]);
  }
  cutLine(s, [-0.77, 0.95, 0], [-0.55, 0.95, 0], [0.55, 0.95, 0], [0.77, 0.95, 0]);
  for (const z of [-0.4, 0.4]) s.line([-0.77, 0.55, z], [0.77, 0.55, z]);
  cutLine(s, [-0.55, 0.2, 0], [0, 0.2, 0], [0.55, 0.2, 0]);
  return s.line([0, 0.2, 0], [0, -0.6, 0]);
}

function stoneCircle() {
  const s = sketch();
  for (let i = 0; i < 6; i++) {
    const a = (TAU * i) / 6;
    const [left, right] = [ringPt(0.85, 0, a - 0.24), ringPt(0.85, 0, a + 0.24)];
    s.path([left, [left[0], 0.6, left[2]], [right[0], 0.6, right[2]], right]);
  }
  return box(s, -0.2, 0, -0.1, 0.2, 0.14, 0.1);
}

function waterTower() {
  const s = sketch();
  const low = circle(s, [0, 0.1, 0], 0.48, X, Z, 4, 0.5);
  const high = circle(s, [0, 0.6, 0], 0.48, X, Z, 4, 0.5);
  const brace = [];
  low.forEach((p, i) => {
    const foot = [Math.sign(p[0]) * 0.56, -1, Math.sign(p[2]) * 0.56];
    const half = foot.map((v, k) => (v + p[k]) / 2);
    brace.push(half);
    cutLine(s, foot, half, p);
    s.line(p, high[i]).line(high[i], [0, 0.9, 0]);
  });
  return s.path(brace, true).line([0, 0.9, 0], [0, 1.02, 0]);
}

function ferrisWheel() {
  const s = sketch();
  const hub = [0, 0.1, 0];
  for (const p of circle(s, hub, 0.8, X, Y, 8)) {
    s.line(hub, p);
    cutLine(s, [p[0], p[1], -0.13], p, [p[0], p[1], 0.13]); // a cabin
  }
  for (const z of [-0.26, 0.26]) {
    s.line(hub, [0, 0.1, z]).line([0, 0.1, z], [-0.45, -1, z]).line([0, 0.1, z], [0.45, -1, z]).line([-0.45, -1, z], [0.45, -1, z]);
  }
  return s;
}

function gazebo() {
  const s = sketch();
  const floor = polyRing(6, 0.75, -1);
  const rail = polyRing(6, 0.75, -0.55);
  const eave = polyRing(6, 0.75, 0.1);
  s.path(floor, true).path(eave, true).path(rail); // the rail leaves one side open: the way in
  for (let i = 0; i < 6; i++) cutLine(s, floor[i], rail[i], eave[i]).line(eave[i], [0, 0.75, 0]);
  return s.line([0, 0.75, 0], [0, 1, 0]);
}

function door() {
  const s = sketch();
  s.path([[-0.5, -1, 0], [-0.5, 1, 0], [0.5, 1, 0], [0.5, -1, 0]], true);
  // the door itself, standing open: `along` is how far from the hinges
  const at = (along, y) => [-0.5 + along * Math.cos(55 * RAD), y, along * Math.sin(55 * RAD)];
  s.path([at(0, 1), at(1, 1), at(1, -1), at(0, -1)]);
  s.path([at(0.16, 0.78), at(0.84, 0.78), at(0.84, -0.78), at(0.16, -0.78)], true);
  return s.node(at(0.72, 0));
}

function halfPipe() {
  const s = sketch();
  const arc = (cx, from, to) => Array.from({ length: 10 }, (_, i) => {
    const a = (from + ((to - from) * i) / 9) * RAD;
    return [cx + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)];
  });
  const [down, up] = [arc(-0.2, 180, 270), arc(0.2, 270, 360)];
  for (const z of [-0.45, 0.45]) {
    const lift = ([x, y]) => [x, y, z];
    s.path([[-0.7, 0.5], [-1, 0.5], [-1, -0.1], [1, -0.1], [1, 0.5], [0.7, 0.5]].map(lift));
    s.run(down.map(lift)).run(up.map(lift)).line(lift([-0.2, 0]), lift([0.2, 0]));
  }
  for (const [x, y] of [[-1, 0.5], [-0.7, 0.5], [-0.2, 0], [0.2, 0], [0.7, 0.5], [1, 0.5], [-1, -0.1], [1, -0.1]]) s.line([x, y, -0.45], [x, y, 0.45]);
  return s;
}

const BUILDINGS = [
  wire('pagoda3d', '3D pagoda', pagoda, 'temple tower japan china roofs tiers'),
  wire('skyscraper3d', '3D skyscraper', skyscraper, 'tall tower city office block empire'),
  wire('church3d', '3D church', church, 'chapel steeple cross tower wedding'),
  wire('barn3d', '3D barn', barn, 'farm shed stable hay roof'),
  wire('tent3d', '3D tent', tent, 'camping camp scouts shelter'),
  wire('wishing-well', 'Wishing well', well, 'water bucket rope roof village'),
  wire('stone-gate', 'Stone gate', () => slab('M-5,0 L-5,10 L5,10 L5,0 L2.6,0 L2.6,7.4 L-2.6,7.4 L-2.6,0 Z', 0.3), 'doorway dolmen trilithon ancient portal frame'),
  wire('stone-circle', 'Stone circle', stoneCircle, 'stonehenge standing stones ancient druid ring'),
  wire('water-tower3d', '3D water tower', waterTower, 'tank legs town farm'),
  wire('ferris-wheel3d', '3D Ferris wheel', ferrisWheel, 'big wheel fair ride funfair carnival'),
  wire('gazebo', 'Gazebo', gazebo, 'pavilion bandstand park garden summer house'),
  wire('door3d', '3D door', door, 'open doorway entrance exit room'),
  wire('half-pipe', 'Half pipe', halfPipe, 'skate ramp skateboard bmx park'),
];

const under = (sub, list) => list.map((s) => Object.assign(s, { cat: 'solid', group: 'solid', sub }));

export const SPACE_SHAPES = [
  ...under('More solids', SOLIDS),
  ...under('Round things', ROUND),
  ...under('Buildings', BUILDINGS),
];
