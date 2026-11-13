// Makes examples/dragon.json: a dragon 76 blocks wide that glides towards the
// code block with its wings wide open, throws its head back, opens its jaws
// and blasts fire at the ground in front of the block.
//
//   node examples/dragon.mjs
//
// The scene only uses what the studio offers: its shapes (arcs, lines, zigzags,
// a ball of rings, a diamond, smoke clouds ...), colours, the Motion settings
// and timeline keys. Every part is an ordinary object that can be selected
// and changed in the studio after "Open".
//
// Lengths are in blocks. This file works in the space the 3D view shows: x to
// the right, y up, z towards the viewer. The dragon looks along +z, at the
// code block. Bloxd's z runs the other way, so z is flipped when the objects
// are written out.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeScene, computeParticles } from '../js/scene.js';
import { LIFE_PER_SECOND } from '../js/motion.js';

// ---------------------------------------------------------------- settings

const SECONDS = 10;            // how long the dragon is there
const REAR = 3.2;              // the head is all the way back and the wings all the way up
const BLAST = 3.65;            // the jaws are open: the fire starts
const START = [0, 30, -70];    // the middle of the dragon at the click (the code block is at 0, 0, 0)
const GLIDE = [0, -0.5, 1.6];  // blocks per second
const FIRE_SPEED = 30;         // blocks per second
const FIRE_PUFFS = 9;
const FIRE_EVERY = 0.33;       // seconds between two puffs
const FIRE_LANDS = [-15, -7];  // z at which the first and the last puff come down: 15 to 7 blocks before the block
const FIRE_ENDS = 0.25;        // a puff is gone when its middle is this much of its length above the ground
const GROUND = 1;              // the height of the top of the code block

// ---------------------------------------------------------------- vectors

const RAD = Math.PI / 180;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => mul(a, 1 / (len(a) || 1));
const mid = (a, b) => mul(add(a, b), 0.5);
/** The part of `v` that is square to the unit vector `axis`. */
const across = (v, axis) => sub(v, mul(axis, dot(v, axis)));

// 3 x 3 matrices, row by row. The columns are where the x, y and z axes go.
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const axes = (ex, ey, ez) => [ex[0], ey[0], ez[0], ex[1], ey[1], ez[1], ex[2], ey[2], ez[2]];
const mmul = (a, b) => I3.map((_, i) => {
  const r = i - (i % 3);
  const c = i % 3;
  return a[r] * b[c] + a[r + 1] * b[c + 3] + a[r + 2] * b[c + 6];
});
const turn = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
/** A turn of `deg` degrees about an axis. */
function about(axis, deg) {
  const [x, y, z] = norm(axis);
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  const k = 1 - c;
  return [
    c + x * x * k, x * y * k - z * s, x * z * k + y * s,
    y * x * k + z * s, c + y * y * k, y * z * k - x * s,
    z * x * k - y * s, z * y * k + x * s, c + z * z * k,
  ];
}
/** The three angles of the studio's Rotation boxes (degrees, turned in the order X, Y, Z). */
function anglesOf(m) {
  const free = Math.abs(m[2]) < 0.9999999;
  const x = free ? Math.atan2(-m[5], m[8]) : Math.atan2(m[7], m[4]);
  const y = Math.asin(Math.max(-1, Math.min(1, m[2])));
  const z = free ? Math.atan2(-m[1], m[0]) : 0;
  return [x / RAD, y / RAD, z / RAD];
}
/** Axes with x along `ex` and y as close to `ey` as it can be. */
function frame(ex, ey) {
  const x = norm(ex);
  let y = across(ey, x);
  if (len(y) < 1e-6) y = across(Math.abs(x[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], x);
  y = norm(y);
  return axes(x, y, cross(x, y));
}

// ---------------------------------------------------------------- parts
// A part is a shape of the studio before it is put into the world:
// { shape, count, params, o: its middle, R: its axes, scale }.

/** `count` particles in a straight row from a to b. */
function line(a, b, count) {
  const half = len(sub(b, a)) / 2;
  return { shape: 'line', count, params: {}, o: mid(a, b), R: frame(sub(b, a), [0, 1, 0]), scale: [half, half, half] };
}

/** `count` particles on a bow from a to b whose middle sits `sag` blocks to the side `towards`. */
function bow(a, b, towards, sag, count) {
  const half = len(sub(b, a)) / 2;
  const R = frame(sub(b, a), towards);
  const up = [R[1], R[4], R[7]];
  // the studio's Arc has an Angle slider that moves in steps of 5 degrees
  const angle = Math.min(330, Math.max(30, Math.round((4 * Math.atan(sag / half)) / RAD / 5) * 5));
  const a2 = (angle / 2) * RAD;
  const r = half / Math.sin(a2); // the ends stay where they are; the sag follows the slider
  return { shape: 'arc', count, params: { angle }, o: sub(mid(a, b), mul(up, r * Math.cos(a2))), R, scale: [r, r, r] };
}

/** A zigzag that stands on the line from a to b, with `teeth` points that are `height` blocks long and point to the side `towards`. */
function teeth(a, b, towards, height, count, n) {
  const half = len(sub(b, a)) / 2;
  const R = frame(sub(b, a), towards);
  const up = [R[1], R[4], R[7]];
  return {
    shape: 'zigzag', count, params: { teeth: n, height: 0.5 },
    o: add(mid(a, b), mul(up, height / 2)), R, scale: [half, height, half],
  };
}

/** Any shape: its middle, where its x and y axes point and how big it is along its own axes. */
function shape(id, o, ex, ey, scale, count, params = {}) {
  return { shape: id, count, params, o, R: frame(ex, ey), scale };
}

const tidy = (v, digits) => Number(v.toFixed(digits)) + 0; // "+ 0" turns -0 into 0

/** Position, rotation and size of a part whose group stands at `at` ({ R, p }: world = p + R * own place). */
function poseOf(part, at) {
  const o = add(at.p, turn(at.R, part.o));
  return {
    pos: [tidy(o[0], 2), tidy(o[1], 2), tidy(-o[2], 2)], // Bloxd looks the other way along z
    rot: anglesOf(mmul(at.R, part.R)).map((v) => tidy(v, 1)),
    scale: part.scale.map((v) => tidy(v, 3)),
  };
}

/** Blocks per second (view space) as the studio's Move setting. */
const moveOf = (v) => [v[0], v[1], -v[2]].map((x) => tidy(x / LIFE_PER_SECOND, 2));
const lifeOf = (seconds) => tidy(seconds * LIFE_PER_SECOND, 3);

// ---------------------------------------------------------------- looks

const SQUARE = 'square_particle';
const LOOKS = {
  scales: { color: '#d0241c', color2: '#8a0f18', size: 2.2, size2: 2.8 },
  neck: { color: '#d0241c', color2: '#8a0f18', size: 1.9, size2: 2.4 },
  limb: { color: '#c41f1c', color2: '#8a0f18', size: 1.5, size2: 1.9 },
  tailThick: { color: '#c41f1c', color2: '#8a0f18', size: 2.0, size2: 2.4 },
  tailMiddle: { color: '#c41f1c', color2: '#8a0f18', size: 1.5, size2: 1.8 },
  tailThin: { color: '#c41f1c', color2: '#8a0f18', size: 1.0, size2: 1.3 },
  belly: { color: '#ffb52e', color2: '#f08a24', size: 1.4, size2: 1.7 },
  gold: { color: '#ffd24a', color2: '#ffb030', size: 1.0, size2: 1.2 },
  spikes: { color: '#ffc83a', color2: '#ff8a26', size: 1.0, size2: 1.2 },
  claws: { color: '#ffe9a8', size: 0.8 },
  wingBone: { color: '#e2331f', color2: '#a3141b', size: 1.4, size2: 1.8 },
  wingEdge: { color: '#ff8a26', color2: '#e04a1c', size: 1.1, size2: 1.3 },
  skull: { color: '#d0241c', color2: '#8a0f18', size: 1.8, size2: 2.3 },
  horns: { color: '#ffd24a', color2: '#ffb030', size: 1.2, size2: 1.5 },
  fangs: { color: '#fff7e0', size: 1 },
  eyes: { texture: 'glint', color: '#fff36b', size: 4.6 },
  fire: { color: '#ff7417', color2: '#dd2a12', size: 2.2, size2: 4 },
  fireCore: { color: '#fff27a', color2: '#ffc22e', size: 1.6, size2: 2.8 },
  fireMouth: { texture: 'glint', color: '#fffbd0', color2: '#ffd84a', size: 3, size2: 4.2 },
  fireGround: { color: '#ffb22a', color2: '#e23a12', size: 2, size2: 3.6 },
};

// ---------------------------------------------------------------- the dragon

export function buildDragon() {
  const middleAt = (t) => add(START, mul(GLIDE, t));
  /** A group that turns about `pivot`: `angle(t)` degrees about `axis`. */
  const turning = (pivot, axis, angle) => (t) => {
    const R = about(axis, angle(t));
    return { R, p: add(middleAt(t), sub(pivot, turn(R, pivot))) };
  };

  // -- when what moves. Each list: [seconds, value, how it gets there].
  const valueAt = (list) => (t) => (list.find((k) => Math.abs(k[0] - t) < 1e-6) || list[list.length - 1])[1];
  const wingBeat = [[0, -6], [REAR, 10, 'smooth'], [SECONDS, -8, 'linear']]; // degrees the tips are lifted
  const tailSway = [[0, -9], [SECONDS, 9, 'linear']];

  const SHOULDER = [2.5, 6, 0];
  const TAIL = [0, -6, -9];
  // the head: `f` blocks forward along the snout, `u` up, `s` to the side, from where the neck ends
  const NECK_END = [0, 20.5, 11];
  const SNOUT_DOWN = 46; // degrees the snout points below level while the dragon glides
  const HEAD = 1.3; // the size of the head
  const fwd = [0, -Math.sin(SNOUT_DOWN * RAD), Math.cos(SNOUT_DOWN * RAD)];
  const up = [0, Math.cos(SNOUT_DOWN * RAD), Math.sin(SNOUT_DOWN * RAD)];
  const H = (f, u, s = 0) => add(NECK_END, mul(add(add(mul(fwd, f), mul(up, u)), [s, 0, 0]), HEAD));
  const HINGE = H(2.5, -1);
  const MOUTH = H(8.5, -2.2);

  const groupsFor = (headDown, headEnd) => {
    const headUp = 15;
    const lift = [[0, 0], [REAR, headUp, 'linear'], [BLAST, headDown, 'in'], [SECONDS, headEnd, 'linear']];
    const open = [[0, 0], [REAR, 4, 'linear'], [BLAST, 32, 'in'], [SECONDS, 32, 'linear']]; // degrees the jaw hangs open
    const head = turning(NECK_END, [1, 0, 0], (t) => -valueAt(lift)(t));
    return {
      body: { at: (t) => ({ R: I3, p: middleAt(t) }), keys: [] },
      tail: { at: turning(TAIL, [0, 1, 0], valueAt(tailSway)), keys: tailSway.slice(1) },
      wingRight: { at: turning(SHOULDER, [0, 0, 1], valueAt(wingBeat)), keys: wingBeat.slice(1) },
      wingLeft: { at: turning([-SHOULDER[0], SHOULDER[1], SHOULDER[2]], [0, 0, 1], (t) => -valueAt(wingBeat)(t)), keys: wingBeat.slice(1) },
      head: { at: head, keys: lift.slice(1) },
      jaw: {
        at: (t) => {
          const h = head(t);
          const J = about([1, 0, 0], valueAt(open)(t));
          return { R: mmul(h.R, J), p: add(h.p, turn(h.R, sub(HINGE, turn(J, HINGE)))) };
        },
        keys: lift.slice(1),
      },
    };
  };

  /** A part as a finished studio object. */
  let made = 0;
  const objectOf = (groups, name, group, look, part) => {
    const g = groups[group];
    return {
      id: `dragon-${++made}`, name, shape: part.shape, count: part.count, params: part.params,
      ...poseOf(part, g.at(0)),
      keys: g.keys.map(([t, , ease]) => ({ t, ease, ...poseOf(part, g.at(t)) })),
      texture: SQUARE, blend: 1, ...LOOKS[look],
      life: lifeOf(SECONDS), fade: true, move: moveOf(GLIDE),
    };
  };

  // -- the parts: [name, group, look, part]
  const parts = [];
  const put = (name, group, look, part) => parts.push([name, group, look, part]);
  const sides = (fn) => { fn(1, 'right'); fn(-1, 'left'); };
  const X = (p, side) => [p[0] * side, p[1], p[2]];

  // body: a ball of rings that lies along the line from the hips to the chest
  const CHEST = [0, 2, 3.5];
  const HIPS = [0, -5.5, -6.5];
  put('Chest and belly', 'body', 'scales', shape('ringsphere', mid(CHEST, HIPS), [1, 0, 0], sub(CHEST, HIPS), [4.6, 8.6, 4.2], 64, { rings: 6 }));
  put('Belly plates', 'body', 'belly', bow([0, 4.5, 6.6], [0, -8.5, -3], [0, -1, 1], 2.2, 9));

  // neck: a long bend up and a short one over the top
  const NECK_TOP = [0, 21.5, 6.5];
  put('Neck', 'body', 'neck', bow([0, 6.5, 3.2], NECK_TOP, [0, 0.2, -1], 2.4, 9));
  put('Neck, top', 'body', 'neck', bow(NECK_TOP, add(NECK_END, [0, 0.4, -0.6]), [0, 1, 0.5], 1, 3));
  put('Throat', 'body', 'belly', bow([0, 5, 6.4], [0, 18, 9.6], [0, 0.2, -1], 2.2, 9));
  put('Neck spikes', 'body', 'spikes', teeth([0, 8.5, 0.4], [0, 20.5, 3.6], [0, 0.27, -1], 2.4, 16, 5));
  put('Back spikes', 'body', 'spikes', teeth([0, 6.3, -1.2], [0, -2.5, -9.8], [0, 1, -0.75], 2.4, 13, 4));

  // tail: three bends, thinner and thinner, and a blade at the end
  const T1 = [1.5, -14.5, -14.5];
  const T2 = [8, -19, -10.5];
  const T3 = [14.5, -16.5, -3.5];
  put('Tail, thick', 'tail', 'tailThick', bow(TAIL, T1, [-0.2, -0.3, -1], 1.6, 6));
  put('Tail, middle', 'tail', 'tailMiddle', bow(T1, T2, [0, -1, -0.6], 2.4, 7));
  put('Tail, thin', 'tail', 'tailThin', bow(T2, T3, [0.6, -1, 0.3], 1.6, 8));
  const tip = norm(sub(T3, T2));
  put('Tail blade', 'tail', 'spikes', shape('diamond', add(T3, mul(tip, 2.6)), cross(tip, [0, 0, 1]), tip, [3, 3, 3], 12, { width: 0.6 }));

  // legs and arms
  sides((s, side) => {
    const hip = X([3.4, -5.5, -5.5], s);
    const knee = X([5.8, -8.5, 0], s);
    const ankle = X([5.4, -13, -4], s);
    const foot = X([5.8, -15.5, -0.5], s);
    put(`Thigh, ${side}`, 'body', 'limb', line(hip, knee, 4));
    put(`Shin, ${side}`, 'body', 'limb', line(knee, ankle, 4));
    put(`Foot, ${side}`, 'body', 'limb', line(ankle, foot, 3));
    put(`Claws, ${side} foot`, 'body', 'claws', teeth(add(foot, [-1.8 * s, 0, 0.4]), add(foot, [1.8 * s, 0, 0.4]), [0, -0.6, 1], 3, 10, 2));
    const shoulder = X([3.6, 1, 4.6], s);
    const elbow = X([6.4, -3, 3.4], s);
    const wrist = X([5.8, -4.6, 7.8], s);
    put(`Upper arm, ${side}`, 'body', 'limb', line(shoulder, elbow, 4));
    put(`Forearm, ${side}`, 'body', 'limb', line(elbow, wrist, 4));
    put(`Claws, ${side} hand`, 'body', 'claws', teeth(add(wrist, [-1.6 * s, 0, 0.2]), add(wrist, [1.6 * s, 0, 0.2]), [0, -0.75, 1], 2.8, 10, 2));
  });

  // wings: an arm, four fingers and the edge of the skin that hangs between them
  sides((s, side) => {
    const g = s > 0 ? 'wingRight' : 'wingLeft';
    const shoulder = X(SHOULDER, s);
    const wrist = X([16.5, 20, -3], s);
    const tips = [[38, 17, -8], [36.5, 3.5, -10.5], [28, -7, -11.5], [16, -11.5, -10]].map((p) => X(p, s));
    const back = X([3, -4, -7], s); // where the skin meets the body
    put(`Wing arm, ${side}`, g, 'wingBone', bow(shoulder, wrist, [s, -1, -0.4], 2.6, 11));
    put(`Wing claw, ${side}`, g, 'gold', bow(wrist, add(wrist, [-1.5 * s, 3.4, 2.6]), [s, 0.3, 0], 0.8, 4));
    tips.forEach((t, i) => {
      const outwards = i === 0 ? [0, 1, 0] : sub(mid(wrist, t), mid(shoulder, back));
      put(`Wing finger ${i + 1}, ${side}`, g, 'wingBone', bow(wrist, t, outwards, i === 0 ? 1.8 : 1.2, [11, 13, 14, 15][i]));
    });
    const edge = [...tips, back];
    for (let i = 0; i < edge.length - 1; i++) {
      const [a, b] = [edge[i], edge[i + 1]];
      put(`Wing edge ${i + 1}, ${side}`, g, 'wingEdge', bow(a, b, sub(wrist, mid(a, b)), 2.6, 7));
    }
  });

  // head
  put('Skull', 'head', 'skull', bow(H(-1, 1.6), H(13, 0.5), up, 1.8 * HEAD, 10));
  put('Upper jaw', 'head', 'fangs', teeth(H(2.5, -0.6, -3.4), H(2.5, -0.6, 3.4), fwd, 11 * HEAD, 17, 1));
  put('Brow', 'head', 'skull', teeth(H(2, 3, -4), H(2, 3, 4), sub(H(6.5, 1.2), H(2, 3)), len(sub(H(6.5, 1.2), H(2, 3))), 7, 1));
  put('Eyes', 'head', 'eyes', line(H(5, 1.4, -2.4), H(5, 1.4, 2.4), 2));
  // both horns are one bow that sits on the back of the skull
  const hornsUp = norm(sub(H(-8, 9.5), H(0.2, 2.2)));
  const hornsSize = 6.2 * HEAD;
  put('Horns', 'head', 'horns', shape('arc', add(H(0.2, 2.2), mul(hornsUp, hornsSize)), [1, 0, 0], mul(hornsUp, -1), [hornsSize, hornsSize, hornsSize], 17, { angle: 215 }));
  put('Lower jaw', 'jaw', 'fangs', teeth(H(2.5, -1.5, -3.1), H(2.5, -1.5, 3.1), fwd, 10 * HEAD, 15, 1));
  put('Chin', 'jaw', 'skull', bow(H(2.5, -2.4), H(12, -1.8), mul(up, -1), 1.1 * HEAD, 6));

  // -- the fire. It leaves the mouth along the snout, so the head is aimed first.
  /** Where the mouth is and where it points at a time, exactly as the studio moves the head. */
  const mouthAt = (groups, t) => {
    const marker = { ...objectOf(groups, 'marker', 'head', 'skull', line(MOUTH, add(MOUTH, fwd), 2)), id: 'marker' };
    const [a, b] = computeParticles(sanitizeScene({ objects: [marker] }).objects, t).map((p) => [p.pos[0], p.pos[1], -p.pos[2]]);
    return { from: a, dir: norm(sub(b, a)) };
  };
  /** How far it is from the mouth to the ground along the snout, and where that is. */
  const reachAt = (groups, t) => {
    const { from, dir } = mouthAt(groups, t);
    const reach = (from[1] - GROUND) / -dir[1];
    return { from, dir, reach, lands: add(from, mul(dir, reach)) };
  };
  const puffTimes = Array.from({ length: FIRE_PUFFS }, (_, i) => tidy(BLAST + 0.02 + i * FIRE_EVERY, 2));
  /** The value between lo and hi at which fn turns from above zero to below it. */
  const solve = (fn, lo, hi) => {
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (fn(m) > 0) lo = m; else hi = m;
    }
    return tidy((lo + hi) / 2, 2);
  };
  // lifting the head throws the fire further
  let headDown = 0;
  let headEnd = 0;
  for (let round = 0; round < 3; round++) {
    headDown = solve((v) => FIRE_LANDS[0] - reachAt(groupsFor(v, headEnd), puffTimes[0]).lands[2], -25, 25);
    headEnd = solve((v) => FIRE_LANDS[1] - reachAt(groupsFor(headDown, v), puffTimes[FIRE_PUFFS - 1]).lands[2], -25, 40);
  }
  const groups = groupsFor(headDown, headEnd);

  made = 0;
  const objects = parts.map(([name, group, look, part]) => objectOf(groups, name, group, look, part));

  const still = { R: I3, p: [0, 0, 0] };
  const fire = (name, look, part, timing) => objects.push({
    id: `dragon-${++made}`, name, shape: part.shape, count: part.count, params: part.params, ...poseOf(part, still),
    keys: [], texture: SQUARE, blend: 1, fade: true, ...LOOKS[look], ...timing,
  });
  // a glow that sits in the open mouth for as long as the fire comes out
  {
    const first = mouthAt(groups, BLAST);
    const last = mouthAt(groups, SECONDS - 0.01);
    const stays = puffTimes[FIRE_PUFFS - 1] + 0.5 - BLAST;
    const size = 1.7 * HEAD;
    fire('Fire in the mouth', 'fireMouth', shape('ball', add(first.from, mul(first.dir, -1.5 * HEAD)), [1, 0, 0], [0, 1, 0], [size, size, size], 10),
      { start: BLAST, life: lifeOf(stays), move: moveOf(mul(sub(last.from, first.from), 1 / (SECONDS - 0.01 - BLAST))) });
  }
  // each puff: a wide red and orange cloud with a narrow bright one inside it.
  // They grow on the way and fade in the last fifth of their time (FIRE_ENDS).
  const speed = FIRE_SPEED / LIFE_PER_SECOND;
  puffTimes.forEach((t, i) => {
    const { from, dir, reach, lands } = reachAt(groups, t);
    const side = cross(dir, [1, 0, 0]);
    const puff = (name, look, half, width, count, spread, expand) => {
      const life = tidy((reach - half - FIRE_ENDS * 2 * half) / speed, 3);
      fire(name, look, shape('smoke', add(from, mul(dir, half)), side, dir, [width, half, width], count),
        { start: t, life, move: moveOf(mul(dir, FIRE_SPEED)), spread, expand });
      return life / LIFE_PER_SECOND;
    };
    const seconds = puff(`Fire ${i + 1}`, 'fire', 5.5, 2.2, 20, 3, 2);
    puff(`Fire ${i + 1}, core`, 'fireCore', 4.8, 1.1, 10, 1.5, 1.5);
    // every other puff sets the ground on fire where it comes down
    if (i % 2 === 0) {
      fire(`Fire on the ground ${i / 2 + 1}`, 'fireGround', shape('disc', [lands[0], GROUND + 0.5, lands[2]], [1, 0, 0], [0, 0, -1], [2.5, 2.5, 1], 14),
        { start: tidy(t + seconds * 0.8, 2), life: lifeOf(1.4), move: moveOf([0, 1.5, 0]), spread: 1.5, expand: 3 });
    }
  });

  return { objects: sanitizeScene({ objects }).objects, headDown, headEnd };
}

// ---------------------------------------------------------------- the file

/** The scene file as text: one object on each line. */
export function dragonFile() {
  const { objects } = buildDragon();
  return `{"app":"bloxd-particle-studio","version":1,"objects":[\n${objects.map((o) => JSON.stringify(o)).join(',\n')}\n]}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = fileURLToPath(new URL('dragon.json', import.meta.url));
  fs.writeFileSync(file, dragonFile());
  console.log(`Wrote ${path.relative(process.cwd(), file)}`);
}
