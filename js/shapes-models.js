// More 3D shapes, added when the library grew to 3,624 shapes: things, plants
// and animals. Round things are turned on a lathe, the ones with corners are
// built from lines, and a few are flat drawings given thickness.

import { TAU, RAD, lathe, ring, mix, pathPoints, arcPoly, ballPoints, blobPoints, sketch, smooth } from './shape-kit.js';
import { wire, box, circle, cutLine, slab, tube, some, ringPt, X, Y, Z } from './shapes-space.js';

/** Part of a ball's outline as a profile for lathe: 0 degrees is its bottom, 180 its top. */
const ballArc = (cy, r, a0, a1, steps = 14) => Array.from({ length: steps + 1 }, (_, i) => {
  const a = (a0 + ((a1 - a0) * i) / steps) * RAD;
  return [r * Math.sin(a), cy - r * Math.cos(a)];
});
const hoop = (cx, cy, rx, ry, a0, a1) => arcPoly(cx, cy, rx, ry, a0, a1).map(([x, y]) => [x, y, 0]);
const turnedPart = (weight, profile, floor = 0.08) => ({ weight, gen: (k) => lathe(profile, k, floor) });
const pathPart = (weight, path, closed = false) => ({ weight, gen: (k) => some(k, () => pathPoints(path, k, closed)) });
const ballPart = (weight, r, centre, from = -1, to = 1) => ({ weight, gen: (k) => ballPoints(k, r, centre, from, to) });
const ringPart = (weight, r, y) => ({ weight, gen: (k) => ring(k, r, y) });
const blobPart = (weight, balls) => ({ weight, gen: (k) => blobPoints(balls, k) });
const tubePart = (weight, axis, wide, rings) => ({ weight, gen: (k) => some(k, () => tube(axis, wide, k, rings)) });
const turned = (id, name, profile, tags, count = 100) => ({ id, name, count, min: 10, tags, gen: (n) => lathe(profile, n, 0.08) });
const built = (id, name, parts, tags, count = 110) => ({ id, name, count, min: 16, tags, gen: (n) => mix(n, parts) });
const thick = (id, name, d, depth, tags) => wire(id, name, () => slab(d, depth), tags);

// ---------------------------------------------------------------- things

const FOOT = [[0, -1], [0.52, -1], [0.58, -0.86], [0.38, -0.74]]; // the foot that the chess pieces share

function bed() {
  const s = box(sketch(), -1, 0, -0.6, 1, 0.3, 0.6);
  box(s, -0.9, 0.3, -0.42, -0.45, 0.42, 0.42); // the pillow
  s.path([[-1, 0.3, -0.6], [-1, 0.9, -0.6], [-1, 0.9, 0.6], [-1, 0.3, 0.6]]); // the headboard
  s.path([[1, 0.3, -0.6], [1, 0.55, -0.6], [1, 0.55, 0.6], [1, 0.3, 0.6]]);
  for (const x of [-1, 1]) for (const z of [-0.6, 0.6]) s.line([x, 0, z], [x, -0.25, z]); // the legs
  return s;
}

function bookshelf() {
  const s = sketch();
  const levels = [-1, -0.34, 0.33, 1];
  for (const x of [-0.6, 0.6]) for (const z of [-0.22, 0.22]) cutLine(s, ...levels.map((y) => [x, y, z]));
  for (const y of levels) s.path([[-0.6, y, -0.22], [0.6, y, -0.22], [0.6, y, 0.22], [-0.6, y, 0.22]], true);
  // a few books standing on the shelves
  for (const [x, y, h] of [[-0.42, -1, 0.5], [-0.26, -1, 0.42], [0.3, -0.34, 0.5], [0.14, -0.34, 0.4], [-0.1, 0.33, 0.5]]) s.line([x, y + 0.1, 0.22], [x, y + h, 0.22]);
  return s;
}

function stepLadder() {
  const s = sketch();
  const front = (x, t) => [x, -1 + 2 * t, 0.5 * (1 - t)];
  for (const x of [-0.35, 0.35]) {
    cutLine(s, ...[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => front(x, t)));
    s.line(front(x, 1), [x, -1, -0.5]);
  }
  for (const t of [0.2, 0.4, 0.6, 0.8, 1]) s.line(front(-0.35, t), front(0.35, t));
  return s;
}

function mineCart() {
  const s = sketch();
  const top = [[-0.9, 0.5, -0.5], [0.9, 0.5, -0.5], [0.9, 0.5, 0.5], [-0.9, 0.5, 0.5]];
  const low = [[-0.6, -0.3, -0.5], [0.6, -0.3, -0.5], [0.6, -0.3, 0.5], [-0.6, -0.3, 0.5]];
  s.path(top, true).path(low, true);
  top.forEach((p, i) => s.line(p, low[i]));
  for (const x of [-0.4, 0.4]) for (const z of [-0.5, 0.5]) circle(s, [x, -0.62, z], 0.26, X, Y);
  return s;
}

function rowingBoat() {
  const s = sketch();
  const ribs = [[-1, 0.3, 0.36, -0.15], [-0.4, 0.22, 0.5, -0.3], [0.3, 0.25, 0.42, -0.28]]; // [x, height of the edge, half the width, height of the keel]
  const bow = [1, 0.42, 0];
  for (const side of [1, -1]) s.path([...ribs.map(([x, y, w]) => [x, y, side * w]), bow]);
  s.path([...ribs.map(([x, , , keel]) => [x, keel, 0]), bow]);
  for (const [x, y, w, keel] of ribs) s.line([x, y, w], [x, keel, 0]).line([x, keel, 0], [x, y, -w]);
  return s.line([-1, 0.3, 0.36], [-1, 0.3, -0.36]).line([-0.4, 0.22, 0.5], [-0.4, 0.22, -0.5]); // the stern and a bench
}

function openBook() {
  const s = sketch();
  for (const side of [1, -1]) {
    s.path([[0, 0, -0.7], [side, 0.28, -0.7], [side, 0.28, 0.7], [0, 0, 0.7]]);
    for (const z of [-0.7, 0.7]) s.run(Array.from({ length: 9 }, (_, i) => [(side * i) / 8, (0.28 * i) / 8 + 0.2 * Math.sin((Math.PI * i) / 8), z])); // the pages
  }
  return s.line([0, 0, -0.7], [0, 0, 0.7]);
}

function hammer() {
  const s = box(sketch(), -0.09, -1, -0.09, 0.09, 0.45, 0.09);
  return box(s, -0.55, 0.45, -0.2, 0.55, 0.9, 0.2);
}

function crate() {
  const s = box(sketch(), -1, -1, -1, 1, 1, 1);
  return s.line([-1, -1, 1], [1, 1, 1]).line([1, -1, 1], [1, 1, -1]).line([1, -1, -1], [-1, 1, -1]).line([-1, -1, -1], [-1, 1, 1]); // a board across each side
}

function signpost() {
  const s = sketch();
  s.line([0, -1, 0], [0, 1, 0]);
  s.path([[-0.2, 0.45, 0.06], [0.6, 0.45, 0.06], [0.86, 0.62, 0.06], [0.6, 0.8, 0.06], [-0.2, 0.8, 0.06]], true); // one board points to the right
  return s.path([[-0.06, -0.1, 0.2], [-0.06, -0.1, -0.6], [-0.06, 0.07, -0.86], [-0.06, 0.24, -0.6], [-0.06, 0.24, 0.2]], true); // and one to the back
}

function flag() {
  const s = sketch();
  cutLine(s, [0, -1, 0], [0, 0.2, 0], [0, 1, 0]);
  const wave = (y) => Array.from({ length: 13 }, (_, i) => [(1.2 * i) / 12, y, i % 12 ? 0.14 * Math.sin((TAU * i) / 12) : 0]);
  s.run(wave(1)).run(wave(0.2)).line([1.2, 1, 0], [1.2, 0.2, 0]);
  circle(s, [0, -1, 0], 0.3, X, Z);
  return s;
}

function goal() {
  const s = sketch();
  const xs = [-1, -0.5, 0, 0.5, 1];
  cutLine(s, ...xs.map((x) => [x, 0.8, 0.35])); // the bar
  cutLine(s, ...xs.map((x) => [x, 0, -0.4])); // the back of the net, on the ground
  for (const x of xs) s.line([x, 0.8, 0.35], [x, 0, -0.4]);
  for (const x of [-1, 1]) s.line([x, 0, 0.35], [x, 0.8, 0.35]).line([x, 0, 0.35], [x, 0, -0.4]);
  return s;
}

function swing() {
  const s = sketch();
  cutLine(s, [-0.9, 1, 0], [-0.3, 1, 0], [0.3, 1, 0], [0.9, 1, 0]);
  for (const x of [-0.9, 0.9]) for (const z of [-0.55, 0.55]) s.line([x, 1, 0], [x, -1, z]);
  for (const x of [-0.3, 0.3]) s.line([x, 1, 0], [x, -0.45, 0]);
  return s.line([-0.3, -0.45, 0], [0.3, -0.45, 0]);
}

function satellite() {
  const s = box(sketch(), -0.25, -0.3, -0.25, 0.25, 0.3, 0.25);
  for (const side of [1, -1]) {
    // a solar panel on each side, in two halves
    const xs = [0.45, 0.825, 1.2].map((x) => side * x);
    s.line([side * 0.25, 0, 0], [xs[0], 0, 0]);
    cutLine(s, [xs[0], 0.3, 0], [xs[0], 0, 0], [xs[0], -0.3, 0]);
    for (const y of [0.3, -0.3]) cutLine(s, ...xs.map((x) => [x, y, 0]));
    for (const x of xs.slice(1)) s.line([x, 0.3, 0], [x, -0.3, 0]);
  }
  // and a dish on top
  s.line([0, 0.3, 0], [0, 0.5, 0]);
  for (const p of circle(s, [0, 0.66, 0], 0.24, X, Z)) s.line(p, [0, 0.5, 0]);
  return s;
}

function robot() {
  const s = box(sketch(), -0.3, 0.45, -0.25, 0.3, 0.95, 0.25);
  box(s, -0.45, -0.4, -0.25, 0.45, 0.33, 0.25);
  s.line([0, 0.33, 0], [0, 0.45, 0]).line([0, 0.95, 0], [0, 1.15, 0]);
  for (const side of [1, -1]) {
    s.path([[side * 0.45, 0.2, 0], [side * 0.75, 0.1, 0], [side * 0.75, -0.35, 0]]);
    s.path([[side * 0.2, -0.4, 0], [side * 0.2, -1, 0], [side * 0.2, -1, 0.3]]);
    s.node([side * 0.13, 0.72, 0.25]); // an eye
  }
  return s;
}

const THINGS = [
  turned('rook3d', '3D chess rook', [...FOOT, [0.34, 0.3], [0.52, 0.42], [0.52, 0.95], [0.36, 0.95], [0.36, 0.7], [0, 0.7]], 'castle tower game piece board'),
  turned('bishop3d', '3D chess bishop', [...FOOT, [0.2, -0.1], [0.16, 0.14], [0.32, 0.2], [0.2, 0.28], ...ballArc(0.5, 0.3, 40, 165), [0.08, 0.84], [0.1, 0.92], [0, 1]], 'game piece board mitre'),
  built('queen3d', '3D chess queen', [
    turnedPart(9, [...FOOT, [0.2, -0.1], [0.16, 0.3], [0.34, 0.36], [0.24, 0.44], [0.5, 0.8], [0.22, 0.7], [0, 0.74]]), ballPart(1, 0.11, [0, 0.88, 0]),
  ], 'game piece board crown', 100),
  built('king3d', '3D chess king', [
    turnedPart(12, [...FOOT, [0.22, -0.1], [0.18, 0.3], [0.36, 0.36], [0.26, 0.44], [0.4, 0.72], [0, 0.72]]),
    pathPart(1, [[0, 0.76, 0], [0, 1, 0]]), pathPart(0.4, [[-0.13, 0.9, 0], [-0.05, 0.9, 0]]), pathPart(0.4, [[0.05, 0.9, 0], [0.13, 0.9, 0]]),
  ], 'game piece board cross checkmate', 100),
  turned('wine-glass3d', '3D wine glass', [[0, -1], [0.46, -1], [0.07, -0.92], [0.07, -0.1], [0.3, 0.06], [0.46, 0.3], [0.5, 0.6], [0.42, 1]], 'drink goblet toast cheers stem'),
  built('trophy3d', '3D trophy', [
    turnedPart(8, [[0, -1], [0.46, -1], [0.46, -0.8], [0.12, -0.72], [0.1, -0.3], [0.36, -0.1], [0.56, 0.3], [0.62, 1]]),
    pathPart(1, hoop(0.6, 0.5, 0.36, 0.3, -90, 90)), pathPart(1, hoop(-0.6, 0.5, 0.36, 0.3, 270, 90)),
  ], 'cup winner prize award champion gold'),
  turned('funnel3d', '3D funnel', [[0.1, -1], [0.1, -0.2], [0.9, 0.7], [0.9, 0.82]], 'pour kitchen filter cone spout'),
  turned('traffic-cone3d', '3D traffic cone', [[0.78, -1], [0.78, -0.88], [0.5, -0.88], [0.12, 0.96], [0, 0.96]], 'road works pylon safety marker'),
  built('bone3d', '3D bone', [
    blobPart(8, [[-0.72, 0.17, 0, 0.2], [-0.72, -0.17, 0, 0.2], [0.72, 0.17, 0, 0.2], [0.72, -0.17, 0, 0.2]]), tubePart(3, (t) => [-0.6 + 1.2 * t, 0], () => 0.12, 9),
  ], 'dog skeleton treat halloween'),
  { id: 'dumbbell3d', name: '3D dumbbell', count: 140, min: 16, tags: 'weights gym lift strong fitness', gen: (n) => tube((t) => [-0.95 + 1.9 * t, 0], (t) => (t < 0.27 || t > 0.73 ? 0.5 : 0.1), n, 19) },
  thick('key3d', '3D key', 'O-3,0 2 M-1,0 L5,0 L5,-1.7 M3.3,0 L3.3,-1.3', 0.16, 'unlock door lock secret thick'),
  thick('puzzle3d', '3D puzzle piece', 'M-3,-3 L-1,-3 C-1.8,-4.6 1.8,-4.6 1,-3 L3,-3 L3,-1 C4.6,-1.8 4.6,1.8 3,1 L3,3 L1,3 C1.8,1.4 -1.8,1.4 -1,3 L-3,3 L-3,1 C-1.4,1.8 -1.4,-1.8 -3,-1 Z', 0.2, 'jigsaw game fit thick'),
  thick('sword3d', '3D sword', 'M0,10 L0.9,8.6 L0.9,2 L2.4,2 L2.4,1.2 L0.5,1.2 L0.5,-1.2 L-0.5,-1.2 L-0.5,1.2 L-2.4,1.2 L-2.4,2 L-0.9,2 L-0.9,8.6 Z', 0.12, 'blade knight fight thick'),
  thick('shield3d', '3D shield', 'M0,5 L4,3.8 L4,0 C4,-2.6 2,-4.2 0,-5 C-2,-4.2 -4,-2.6 -4,0 L-4,3.8 Z', 0.16, 'knight guard defend armour thick'),
  thick('note3d', '3D music note', 'O-1.6,-3 1.5 M-0.1,-3 L-0.1,5 L3,4 L3,2.4 L-0.1,3.4', 0.18, 'song quaver sound thick'),
  thick('podium3d', '3D podium', 'M-4.5,0 L-4.5,2.2 L-1.5,2.2 L-1.5,3.6 L1.5,3.6 L1.5,1.4 L4.5,1.4 L4.5,0 Z', 0.34, 'winners first second third medal steps race'),
  thick('car3d', '3D car', 'M-5,0 L-5,1.6 L-3.2,1.9 L-2,3.4 L1.6,3.4 L3,1.9 L5,1.6 L5,0 Z O-3,0 0.9 O3,0 0.9', 0.42, 'auto drive vehicle wheels road'),
  wire('bed3d', '3D bed', bed, 'sleep bedroom pillow spawn night'),
  wire('bookshelf3d', '3D bookshelf', bookshelf, 'books library shelves cupboard'),
  wire('step-ladder3d', '3D step ladder', stepLadder, 'climb steps rungs tool'),
  wire('mine-cart3d', '3D mine cart', mineCart, 'minecart wagon rail ore trolley'),
  wire('boat3d', '3D boat', rowingBoat, 'rowing dinghy canoe hull sail sea'),
  wire('open-book3d', '3D open book', openBook, 'read pages spell story library'),
  wire('hammer3d', '3D hammer', hammer, 'tool build mallet hit thor'),
  wire('crate3d', '3D crate', crate, 'wooden box cargo loot supply', { count: 150 }),
  wire('signpost3d', '3D signpost', signpost, 'directions way arrows road sign'),
  wire('flag3d', '3D flag', flag, 'pole banner wave capture checkpoint'),
  wire('goal3d', '3D goal', goal, 'football soccer net posts score'),
  wire('swing3d', '3D swing', swing, 'playground park seat ropes'),
  wire('satellite3d', '3D satellite', satellite, 'space orbit solar panels dish'),
  wire('robot3d', '3D robot', robot, 'android machine bot mech'),
  built('telescope3d', '3D telescope', [
    tubePart(6, (t) => [-0.7 + 1.4 * t, 0.2 + 0.6 * t], (t) => 0.1 + 0.1 * t, 9),
    ...[0.3, 2.4, 4.5].map((a) => pathPart(1, [ringPt(0.08, 0.4, a), ringPt(0.6, -1, a)])),
  ], 'stars astronomy tripod look space'),
];

// ---------------------------------------------------------------- plants and animals

const CALYX = Array.from({ length: 10 }, (_, i) => ringPt(i % 2 ? 0.2 : 0.56, 0.72, (TAU * i) / 10));
const BUNCH = [
  [-0.54, 0.35, 0.1], [-0.18, 0.35, -0.12], [0.18, 0.35, 0.12], [0.54, 0.35, -0.1],
  [-0.36, 0, -0.1], [0, 0, 0.12], [0.36, 0, -0.08], [-0.18, -0.35, 0.08], [0.18, -0.35, -0.06], [0, -0.7, 0],
].map((p) => [...p, 0.25]);
const WORM = Array.from({ length: 6 }, (_, i) => [-0.78 + 0.29 * i, -0.6 + 0.32 * Math.sin((Math.PI * i) / 5), 0, i === 5 ? 0.26 : 0.2]);

function tulip() {
  const s = sketch();
  cutLine(s, [0, -1, 0], [0, -0.5, 0], [0, 0.1, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (TAU * i) / 6;
    const between = ringPt(0.4, 0.66, a + TAU / 12);
    s.run(smooth([[0, 0.1, 0], ringPt(0.36, 0.3, a), ringPt(0.42, 0.62, a), ringPt(0.32, 1, a)], 5));
    s.line(ringPt(0.32, 1, a), between).line(between, ringPt(0.32, 1, (TAU * (i + 1)) / 6));
  }
  for (const side of [1, -1]) s.run(smooth([[0, -0.5, 0], [side * 0.3, -0.2, 0], [side * 0.5, 0.25, 0]], 5));
  return s;
}

function bamboo() {
  const s = sketch();
  const stalks = [[-0.4, 0.1, 1.5], [0, -0.1, 2], [0.42, 0.06, 1.72]].map(([x, z, tall]) => {
    const parts = Math.round(tall / 0.5);
    const joints = Array.from({ length: parts + 1 }, (_, i) => [x, -1 + (tall * i) / parts, z]);
    cutLine(s, ...joints);
    for (const p of joints.slice(1, -1)) circle(s, p, 0.09, X, Z);
    return joints;
  });
  const leaf = ([x, y, z], dx) => s.line([x, y, z], [x + dx, y + 0.3, z]);
  leaf(stalks[1][3], 0.34);
  leaf(stalks[2][2], 0.32);
  leaf(stalks[0][2], -0.3);
  return s;
}

const LIVING = [
  built('carrot3d', '3D carrot', [
    turnedPart(7, [[0, -1], [0.12, -0.6], [0.3, 0.1], [0.36, 0.42], [0.2, 0.52], [0, 0.52]], 0.06),
    pathPart(1, smooth([[0.05, 0.56, 0], [0.1, 0.8, 0], [0.34, 0.98, 0]], 5)), pathPart(1, smooth([[-0.05, 0.56, 0], [-0.12, 0.82, 0], [-0.36, 0.96, 0]], 5)), pathPart(1, [[0, 0.58, 0.05], [0, 1, 0.1]]),
  ], 'vegetable root rabbit orange food', 100),
  built('strawberry3d', '3D strawberry', [
    turnedPart(8, [[0, -1], [0.3, -0.7], [0.6, -0.1], [0.7, 0.3], [0.55, 0.6], [0.2, 0.7], [0, 0.7]], 0.06), pathPart(2, CALYX, true), pathPart(0.5, [[0, 0.78, 0], [0.06, 1, 0]]),
  ], 'fruit berry red sweet food'),
  built('cherries3d', '3D cherries', [
    ballPart(4, 0.36, [-0.45, -0.62, 0]), ballPart(4, 0.36, [0.45, -0.62, 0.12]),
    pathPart(1, smooth([[-0.45, -0.24, 0], [-0.3, 0.4, 0], [0.08, 0.9, 0]], 6)), pathPart(1, smooth([[0.45, -0.24, 0.12], [0.36, 0.4, 0.06], [0.14, 0.88, 0]], 6)),
    pathPart(1, smooth([[0.18, 0.92, 0], [0.5, 0.96, 0], [0.8, 0.8, 0], [0.5, 0.72, 0], [0.22, 0.86, 0]], 5)),
  ], 'fruit pair stalk red sweet food'),
  built('grapes3d', '3D grapes', [blobPart(14, BUNCH), pathPart(1, [[0, 0.64, 0], [0.06, 0.98, 0]])], 'fruit bunch vine wine purple food', 150),
  wire('tulip3d', '3D tulip', tulip, 'flower spring petals cup garden'),
  wire('bamboo3d', '3D bamboo', bamboo, 'stalks cane panda jungle plant'),
  built('stump3d', '3D tree stump', [turnedPart(7, [[0.8, -1], [0.56, -0.74], [0.5, 0.3]]), ringPart(1.6, 0.34, 0.3), ringPart(0.8, 0.17, 0.3)], 'wood log cut rings forest seat'),
  { id: 'snake3d', name: '3D snake', count: 130, min: 20, tags: 'serpent reptile slither worm', gen: (n) => tube((t) => [-0.8 + 1.6 * t, 0.4 * Math.sin(TAU * 1.5 * t)], (t) => (t > 0.9 ? 0.17 : 0.03 + 0.1 * Math.min(1, 5 * t)), n, 30) },
  built('caterpillar3d', '3D caterpillar', [
    blobPart(12, WORM), pathPart(0.5, [[0.72, -0.34, 0.08], [0.86, -0.06, 0.14]]), pathPart(0.5, [[0.72, -0.34, -0.08], [0.86, -0.06, -0.14]]),
  ], 'bug worm grub larva crawl', 130),
  thick('fish3d', '3D fish', 'M-5,0 C-3,2.6 1,2.6 3,0.4 L5,2 L5,-2 L3,-0.4 C1,-2.6 -3,-2.6 -5,0 Z', 0.16, 'sea swim water pet thick'),
  thick('leaf3d', '3D leaf', 'M0,-5 C4,-3 4,2 0,5 C-4,2 -4,-3 0,-5 M0,-5 L0,5', 0.12, 'plant tree green autumn thick'),
];

const under = (sub, list) => list.map((s) => Object.assign(s, { cat: 'solid', group: 'solid', sub }));

export const MODEL_SHAPES = [...under('Things', THINGS), ...under('Plants and animals', LIVING)];
