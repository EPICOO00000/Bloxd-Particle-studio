// Items in 3D, put together from drawings. A drawing is written like the flat
// ones (see shape-kit.js), in a box of about 20 units, and then
//
//   turned   spun around the upright axis: a bottle, a goblet, a lantern
//   thick    given a front and a back: an axe blade, a key
//   plate    laid on a plane or on a curved surface: the face of a shield
//
// The parts of an item are nets (corners, and the strokes between them); they
// are joined into one, and the particles are shared out along its strokes.

import { RAD, parsePath, placeDrawing, fitDrawing, drawingNet, makeNet, mapNet, joinNets, fitNet, netPoints, spreadPoints } from './shape-kit.js';
import { deal } from './shape-mix.js';

const UNIT = 10; // a drawing is written about 20 units wide; the kit joins its strokes in a box of 2
const asDrawing = (d) => (typeof d === 'string' ? parsePath(d) : d);
const flatNet = (drawing) => drawingNet(placeDrawing(drawing, { size: 1 / UNIT }));
const nearest = (nodes, [x, y]) => nodes.reduce((best, p) => (Math.hypot(p[0] - x, p[1] - y) < Math.hypot(best[0] - x, best[1] - y) ? p : best));

const STEP = 0.4; // a stroke that is laid on a curved surface is cut into pieces no longer than this, so that it follows the surface
const inPieces = (chain) => chain.flatMap((p, i) => {
  if (!i) return [p];
  const from = chain[i - 1];
  const pieces = Math.ceil((Math.hypot(p[0] - from[0], p[1] - from[1]) * UNIT) / STEP);
  return Array.from({ length: pieces }, (_, k) => (k === pieces - 1 ? p : [from[0] + ((p[0] - from[0]) * (k + 1)) / pieces, from[1] + ((p[1] - from[1]) * (k + 1)) / pieces]));
});

/**
 * A flat drawing in space: `lift(x, y)` says where a point of it goes. Strokes
 * that meet or cross are joined first, as in a flat shape.
 */
export function plate(d, lift = null) {
  const flat = flatNet(asDrawing(d));
  if (!lift) return mapNet(flat, ([x, y]) => [x * UNIT, y * UNIT, 0]);
  return mapNet(makeNet(flat.nodes, flat.chains.map(inPieces)), ([x, y]) => lift(x * UNIT, y * UNIT));
}

/**
 * Corners nearer to one another than `reach` become one corner: two particles
 * that close are seen as one blob. The strokes that ended at a corner that is
 * gone now end at the one it became.
 */
export function weld(net, reach) {
  const key = (p) => p.join(',');
  const kept = [];
  const became = new Map();
  for (const p of net.nodes) {
    const near = kept.find((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < reach);
    if (near) became.set(key(p), near);
    else kept.push(p);
  }
  if (!became.size) return net;
  const chains = [];
  for (const chain of net.chains) {
    const ends = [became.get(key(chain[0])), became.get(key(chain[chain.length - 1]))];
    if (!ends[0] && !ends[1]) {
      chains.push(chain);
      continue;
    }
    const moved = chain.slice();
    if (ends[0]) moved[0] = ends[0];
    if (ends[1]) moved[moved.length - 1] = ends[1];
    const [from, to] = [moved[0], moved[moved.length - 1]];
    const length = moved.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - moved[i - 1][0], p[1] - moved[i - 1][1], p[2] - moved[i - 1][2]) : 0), 0);
    if (from === to && length < 2 * reach) continue; // a stroke between two corners that are now one
    chains.push(moved);
  }
  return makeNet(kept, chains);
}
const TIGHT = 0.52; // of the usual gap: two particles nearer than this are one too many

/** The points as one row of numbers (x, y, z, x, y, z, ...): quick to run through. */
const inRow = (pts) => {
  const row = new Float64Array(3 * pts.length);
  pts.forEach((p, i) => row.set(p, 3 * i));
  return row;
};

/**
 * How far the nearest of the points in `row` is from the point `p` (`skip`: where in the row `p` itself is,
 * when it is one of them). Squares pick out the ones that can be the nearest, and only their distance is
 * worked out. That gives what working out every distance gives, to the last digit, in a fraction of the
 * time: with 600 particles there are 360,000 pairs.
 */
function leastGap(p, row, skip = -1) {
  const [x, y, z] = p;
  let square = Infinity;
  for (let j = 0; j < row.length; j += 3) {
    if (j === skip) continue;
    const d = (x - row[j]) * (x - row[j]) + (y - row[j + 1]) * (y - row[j + 1]) + (z - row[j + 2]) * (z - row[j + 2]);
    if (d < square) square = d;
  }
  const near = square * (1 + 1e-9); // (a square is right to 15 digits: none that could be the nearest is left out)
  let least = Infinity;
  for (let j = 0; j < row.length; j += 3) {
    if (j === skip) continue;
    const d = (x - row[j]) * (x - row[j]) + (y - row[j + 1]) * (y - row[j + 1]) + (z - row[j + 2]) * (z - row[j + 2]);
    if (d <= near) least = Math.min(least, Math.hypot(x - row[j], y - row[j + 1], z - row[j + 2]));
  }
  return least;
}

/**
 * Can one of the points from `fixed` on be nearer to another point than TIGHT times the usual gap? A quick
 * look with squares, each pair once. It says yes a hair too early rather than too late (squares are right
 * to 15 digits, the hair is the ninth), so a no is sure: nearly every time that is the answer, and the
 * slower look at the gaps themselves is not needed.
 */
function mayBeTight(pts, fixed) {
  const row = inRow(pts);
  const square = new Float64Array(pts.length).fill(Infinity);
  for (let i = 0; i < pts.length; i++) {
    const [x, y, z] = [row[3 * i], row[3 * i + 1], row[3 * i + 2]];
    let mine = square[i];
    for (let j = i + 1; j < pts.length; j++) {
      const d = (x - row[3 * j]) * (x - row[3 * j]) + (y - row[3 * j + 1]) * (y - row[3 * j + 1]) + (z - row[3 * j + 2]) * (z - row[3 * j + 2]);
      if (d < mine) mine = d;
      if (d < square[j]) square[j] = d;
    }
    square[i] = mine;
  }
  const limit = TIGHT * TIGHT * Float64Array.from(square).sort()[pts.length >> 1] * (1 + 1e-9);
  for (let i = fixed; i < pts.length; i++) if (square[i] <= limit) return true;
  return false;
}

/**
 * n particles on a net, as `spreadPoints` shares them out, and then a last
 * look: where two are still side by side (two strokes that run close to one
 * another), one of them goes where there is the most room on the strokes.
 */
export function evenPoints(net, n) {
  const pts = spreadPoints(net, n);
  const fixed = net.nodes.length;
  if (n <= fixed + 1 || !mayBeTight(pts, fixed)) return pts;
  let spare = null;
  for (let turn = 0; turn < 16; turn++) {
    let row = inRow(pts);
    const nearest = pts.map((p, i) => leastGap(p, row, 3 * i));
    const limit = TIGHT * nearest.slice().sort((a, b) => a - b)[pts.length >> 1];
    let out = -1;
    for (let i = fixed; i < pts.length; i++) if (nearest[i] < limit && (out < 0 || nearest[i] < nearest[out])) out = i;
    if (out < 0) break;
    spare = spare || netPoints(net, Math.max(2 * n, n + 60)).slice(fixed);
    pts.splice(out, 1);
    row = inRow(pts);
    let best = null;
    let room = -1;
    for (const p of spare) {
      const least = leastGap(p, row);
      if (least > room) [room, best] = [least, p];
    }
    pts.push(best);
  }
  return pts;
}

const CLOSE = 0.6; // of the gap between two particles: corners nearer than this are welded
const lengthOf = (net) => net.lens.reduce((sum, l) => sum + l, 0);
const welded = (net, spacing, most) => weld(net, CLOSE * Math.max(spacing, lengthOf(net) / most));

/**
 * A profile spun around the upright axis. In the drawing, x is how far from the
 * axis and y the height. It is drawn `sides` times around the axis, and every
 * lone dot ("D x y") of the drawing becomes a ring through that point.
 *   sides   how many times the profile is drawn (4: front, back and both sides)
 *   first   degrees: where the first one stands
 *   round   false = the rings run straight from one profile to the next (a tower with corners)
 *   deep    the depth as a part of the width (a blade: 0.3)
 */
export function turned(d, { sides = 4, first = 0, round = true, deep = 1 } = {}) {
  const drawing = asDrawing(d);
  const flat = flatNet(drawing);
  // the rings: one through every dot that is off the axis (two dots on one corner are one ring)
  const marks = [...new Set(drawing.dots.filter(([x]) => x > 1e-6).map(([x, y]) => nearest(flat.nodes, [x / UNIT, y / UNIT])))];
  const step = 360 / sides;
  const at = (turn) => {
    const [c, s] = [Math.cos((first + turn * step) * RAD), Math.sin((first + turn * step) * RAD) * deep];
    return ([x, y]) => [x * UNIT * c, y * UNIT, x * UNIT * s];
  };
  const nets = [];
  for (let i = 0; i < sides; i++) {
    // a stroke along the axis is the same stroke in every copy: once is enough
    const chains = i ? flat.chains.filter((chain) => chain.some(([x]) => Math.abs(x) > 1e-6)) : flat.chains;
    nets.push(makeNet(flat.nodes.map(at(i)), chains.map((chain) => chain.map(at(i)))));
  }
  const hoops = [];
  const bits = round ? Math.max(4, Math.round(32 / sides)) : 1;
  for (const mark of marks) {
    for (let i = 0; i < sides; i++) {
      // (the two ends are corners of the profiles, to the last digit)
      hoops.push(Array.from({ length: bits + 1 }, (_, b) => (b === bits ? at((i + 1) % sides)(mark) : at(i + b / bits)(mark))));
    }
  }
  return joinNets(...nets, makeNet([], hoops));
}

/**
 * A flat drawing given thickness: the drawing in front and behind, `depth` to
 * each side, joined at every corner. A lone dot ("D x y") on a stroke is one
 * more place where the two are joined.
 */
export function thick(d, depth) {
  const flat = flatNet(asDrawing(d));
  const at = (z) => ([x, y]) => [x * UNIT, y * UNIT, z];
  return joinNets(mapNet(flat, at(depth)), mapNet(flat, at(-depth)), makeNet([], flat.nodes.map((p) => [at(depth)(p), at(-depth)(p)])));
}

/** Straight strokes in space: each is a row of corners. */
export const lines = (...rows) => {
  const chains = rows.flatMap((row) => row.slice(1).map((p, i) => [row[i], p]));
  return joinNets(makeNet(rows.flat(), chains));
};

/** A net moved, turned and resized: `turn` is [axis, degrees] with the axis 'x', 'y' or 'z'. */
export function moved(net, { to = [0, 0, 0], turn = null, size = 1 } = {}) {
  const [axis, deg] = turn || ['y', 0];
  const [c, s] = [Math.cos(deg * RAD), Math.sin(deg * RAD)];
  const spin = ([x, y, z]) => (axis === 'x' ? [x, y * c - z * s, y * s + z * c] : axis === 'z' ? [x * c - y * s, x * s + y * c, z] : [x * c + z * s, y, -x * s + z * c]);
  return mapNet(net, (p) => spin(p).map((v, i) => v * size + to[i]));
}

// The nets of the shapes that were used last. A net takes some 20 kB and is made in a millisecond, and
// there are thousands of these shapes: kept for good, the nets of all that were ever looked at in the
// picker would stay in the memory of the page. What a shape measures of its net once (its usual number
// of particles) it does keep.
const NETS_KEPT = 24;
const nets = new Map();
function kept(key, make) {
  let net = nets.get(key);
  if (net) nets.delete(key); // (it goes back in as the newest)
  else {
    net = make();
    if (nets.size >= NETS_KEPT) nets.delete(nets.keys().next().value);
  }
  nets.set(key, net);
  return net;
}

/**
 * A shape in 3D from a net. `build` gives the net, or a list of nets, when the
 * shape is used; it is centred and fills the box. The usual number of
 * particles comes from the length of its strokes.
 */
export function solidShape({ id, name, cat, sub, tags, build, spacing = 0.13, most = 160 }) {
  const made = () => kept(made, () => {
    const parts = build();
    return welded(fitNet(Array.isArray(parts) ? joinNets(...parts.filter(Boolean)) : parts), spacing, most);
  });
  let measured = null;
  const measure = () => {
    if (!measured) {
      const least = Math.max(8, made().nodes.length);
      measured = { min: least, count: Math.max(least + 8, Math.min(most, Math.round(lengthOf(made()) / spacing))) };
    }
    return measured;
  };
  const shape = { id, name, cat, group: 'solid', gen: (n) => evenPoints(made(), n) };
  if (tags) shape.tags = tags;
  if (sub) shape.sub = sub;
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => measure().min });
  Object.defineProperty(shape, 'count', { enumerable: true, get: () => measure().count });
  return shape;
}

/**
 * A family of shapes in 3D: like `family` in shape-mix.js, but `make` gives
 * { id, name, sub, tags, build } and `build` the nets of a member.
 */
export function solidFamily({ cat, sizes, first = [], count, make, spacing, most }) {
  return deal({ sizes, first, count, where: cat }).map((variants, k) => Object.defineProperty(
    solidShape({ cat, spacing, most, ...make(variants, k + 1) }),
    'variants',
    { value: variants },
  ));
}

/**
 * A flat shape from a drawing, like `drawnShape` in shape-kit.js, with corners
 * that are too near to one another welded. `draw` gives the drawing when the
 * shape is used.
 */
export function flatShape({ id, name, cat, sub, tags, draw, turn = 0, spacing = 0.1, most = 140 }) {
  const made = () => kept(made, () => {
    const drawing = asDrawing(draw());
    return welded(drawingNet(fitDrawing(turn ? placeDrawing(drawing, { turn }) : drawing)), spacing, most);
  });
  let measured = null;
  const measure = () => {
    if (!measured) {
      const least = Math.max(8, made().nodes.length);
      // a lone dot takes a particle and has no length: the strokes keep theirs
      const spot = (p) => p.map((v) => Math.round(v * 1e6)).join(',');
      const ends = new Set(made().chains.flatMap((chain) => [spot(chain[0]), spot(chain[chain.length - 1])]));
      const dots = made().nodes.filter((p) => !ends.has(spot(p))).length;
      measured = { min: least, count: Math.max(least + 8, Math.min(most, Math.round(lengthOf(made()) / spacing) + dots)) };
    }
    return measured;
  };
  const shape = { id, name, cat, group: 'flat', gen: (n) => evenPoints(made(), n) };
  if (tags) shape.tags = tags;
  if (sub) shape.sub = sub;
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => measure().min });
  Object.defineProperty(shape, 'count', { enumerable: true, get: () => measure().count });
  return shape;
}

/** A family of flat shapes: `make` gives { id, name, sub, tags, draw } and `draw` the drawing of a member. */
export function flatFamily({ cat, sizes, first = [], count, make, spacing, most, turn }) {
  return deal({ sizes, first, count, where: cat }).map((variants, k) => Object.defineProperty(
    flatShape({ cat, spacing, most, turn, ...make(variants, k + 1) }),
    'variants',
    { value: variants },
  ));
}
