// Time: when an object appears, how it travels between its keys and when it
// goes away. Pure maths (no DOM), shared by the preview and the code generator,
// so both always agree.
//
// How it reaches the game
//   A Bloxd particle cannot be told to do something later: everything it will
//   ever do is fixed in the one playParticleEffect call that makes it. Three
//   things in that call change over the particle's life, and they are enough:
//     - its colour and transparency (colorGradients): a particle can start
//       see-through, show up later and fade away again;
//     - its speed (velocityGradients): it can wait, travel and stop;
//     - its lifetime: when it is gone for good.
//   A particle only ever flies along one straight line. So a path with several
//   stretches is flown by several particles, one per stretch: each waits unseen
//   where its stretch starts, shows up when the one before it dies, flies its
//   stretch and dies in turn. Such a particle is called a "piece" here. A turn
//   is flown as a few short straight stretches.
//
//   Why not bend the line with the `gravity` option, which gives smooth arcs
//   with fewer pieces? Because the game moves a particle first and pulls its
//   direction afterwards, once per frame, so a pulled path depends on the frame
//   rate: tried here, a shape turning once a second swelled by 13% of its size
//   on a 30 fps device. Straight stretches look the same at every frame rate.
//
// The game's habits this file works around (see tests/babylon-sim.mjs)
//   A particle looks up its gradients once per frame and keeps the value of the
//   stop it left last. A frame that jumps a whole stretch between two stops
//   leaves the next stretch with a wrong start, and a slow device jumps short
//   stretches all the time. Two things are safe at every frame rate:
//     - a particle dies exactly when its lifetime is over;
//     - after its LAST stop a gradient has exactly that stop's value.
//   So a piece is switched on by a last stop: unseen, then at once fully there,
//   in the very frame in which the piece before it dies. The same goes for a
//   steady speed. Only what cannot end on a last stop (a fade, an eased speed)
//   uses ramps: long ones where nobody sees them (RUNUP), short ones followed
//   by extra stops where they are seen (SWITCH, GUARDS).
//   All pieces of one move share one speed curve, so whatever a slow device
//   does to it, it does to all of them alike and they still meet. And a
//   particle that has travelled is only about where it should be on a slow
//   device, so an object that stops is shown by a fresh piece that never moved.
//
// Units
//   seconds : what the timeline shows.
//   age     : the game's particle clock. It advances 0.01 per frame at 60 fps,
//             so 1 second is LIFE_PER_SECOND of age. minLifeTime and the
//             `life` of an object are ages.

export const LIFE_PER_SECOND = 0.6;

/** Fade-out starts at this fraction of the time an object is there. */
export const FADE_START = 0.8;
/** Fade-in ends at this fraction. */
export const FADE_IN_END = 0.2;

/** How an object travels to a key. */
export const EASES = [
  { id: 'smooth', name: 'Smooth' },
  { id: 'linear', name: 'Steady' },
  { id: 'in', name: 'Speed up' },
  { id: 'out', name: 'Slow down' },
  { id: 'jump', name: 'Jump' },
];
const EASE_IDS = EASES.map((e) => e.id);
export const isEase = (v) => EASE_IDS.includes(v);

export const MAX_KEYS = 12;
/** Keys of one object are at least this many seconds apart. */
export const MIN_KEY_GAP = 0.1;
/** Latest moment an object may appear, in seconds. */
export const MAX_START = 300;
/** An object or a group can be played again this many times at most. */
export const MAX_REPEAT = 60;
/** Two plays of a repeated object are at least this many seconds apart. */
export const MIN_EVERY = 0.05;

/** Age a sudden change takes when it cannot be done at once (see the top of the file). */
export const SWITCH = 0.03;
/** Age a particle takes to get up to speed while it is still unseen. */
const RUNUP = 0.3;
/** Extra stops this many SWITCHes after such a change. */
const GUARDS = [1, 3, 9, 21];
/** The stretch between the two stops of a change that happens at once (age). */
export const TINY = 1e-4;
/** A turn is cut into straight stretches; at most this many between two keys. */
export const MAX_CHORDS = 24;
/** A stretch lasts at least this long (age): one frame at 20 frames per second. */
const MIN_CHORD_AGE = 0.03;
const EPS = 1e-9;
const RAD = Math.PI / 180;

// ---------------------------------------------------------------- rotations

/** 3x3 rotation matrix (row-major), same convention as THREE.Euler order 'XYZ'. */
export function rotationMatrix(rx, ry, rz) {
  const a = Math.cos(rx * RAD), b = Math.sin(rx * RAD);
  const c = Math.cos(ry * RAD), d = Math.sin(ry * RAD);
  const e = Math.cos(rz * RAD), f = Math.sin(rz * RAD);
  return [
    c * e, -c * f, d,
    a * f + b * e * d, a * e - b * f * d, -b * c,
    b * f - a * e * d, b * e + a * f * d, a * c,
  ];
}

/** Quaternion [x, y, z, w] of Euler angles in degrees, order 'XYZ'. */
function quatOf([rx, ry, rz]) {
  const c1 = Math.cos((rx * RAD) / 2), s1 = Math.sin((rx * RAD) / 2);
  const c2 = Math.cos((ry * RAD) / 2), s2 = Math.sin((ry * RAD) / 2);
  const c3 = Math.cos((rz * RAD) / 2), s3 = Math.sin((rz * RAD) / 2);
  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3,
  ];
}

/** The short way round from one orientation to another. */
function slerp(a, b, t) {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const sign = dot < 0 ? -1 : 1;
  dot = Math.min(1, Math.abs(dot));
  let ka = 1 - t, kb = t;
  if (dot < 0.999999) {
    const angle = Math.acos(dot);
    ka = Math.sin((1 - t) * angle) / Math.sin(angle);
    kb = Math.sin(t * angle) / Math.sin(angle);
  }
  const q = a.map((v, i) => v * ka + b[i] * kb * sign);
  const len = Math.hypot(...q) || 1;
  return q.map((v) => v / len);
}

function matrixOfQuat([x, y, z, w]) {
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

/** Euler angles in degrees (order 'XYZ') of a rotation matrix. */
export function eulerOf(m) {
  const y = Math.asin(Math.max(-1, Math.min(1, m[2])));
  const free = Math.abs(m[2]) < 0.9999999;
  const x = free ? Math.atan2(-m[5], m[8]) : Math.atan2(m[7], m[4]);
  const z = free ? Math.atan2(-m[1], m[0]) : 0;
  return [x / RAD, y / RAD, z / RAD];
}

/** Product of two 3x3 matrices. */
const times = (a, b) => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
  const r = i - (i % 3), c = i % 3;
  return a[r] * b[c] + a[r + 1] * b[c + 3] + a[r + 2] * b[c + 6];
});
const transposed = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

/** The axis a rotation matrix turns about (unit vector; [0, 0, 0] if it does not turn). */
function axisOf(m) {
  const v = [m[7] - m[5], m[2] - m[6], m[3] - m[1]];
  const len = Math.hypot(...v);
  return len > 1e-9 ? v.map((x) => x / len) : [0, 0, 0];
}

/** Degrees between two orientations (0 to 180). */
function angleBetween(rotA, rotB) {
  const a = quatOf(rotA), b = quatOf(rotB);
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return (2 * Math.acos(Math.min(1, dot))) / RAD;
}

// ---------------------------------------------------------------- poses

const mix3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** Where an object is: { pos, rot, scale }. */
export const basePose = (obj) => ({ pos: obj.pos, rot: obj.rot, scale: obj.scale });
const keysOf = (obj) => (Array.isArray(obj.keys) ? obj.keys : []);
const startOf = (obj) => (obj.start > 0 ? obj.start : 0);

/** Seconds an object is there: its lifetime, or until its last key if that is later. */
export function staySeconds(obj) {
  const keys = keysOf(obj);
  return Math.max(obj.life / LIFE_PER_SECOND, keys.length ? keys[keys.length - 1].t : 0);
}

/** First and last second an object is there. */
export const spanOf = (obj) => ({ start: startOf(obj), end: startOf(obj) + staySeconds(obj) });

/** How far along the way to a key, for a fraction f of the time. */
export function easeProgress(ease, f) {
  if (f <= 0) return 0;
  if (f >= 1) return 1;
  switch (ease) {
    case 'linear': return f;
    case 'in': return f * f;
    case 'out': return 1 - (1 - f) * (1 - f);
    case 'jump': return 0;
    default: return f < 0.5 ? 2 * f * f : 1 - 2 * (1 - f) * (1 - f);
  }
}

/** The rotation matrix part-way between two poses. */
function rotationBetween(a, b, u, spin) {
  if (u <= 0) return rotationMatrix(...a.rot);
  if (u >= 1) return rotationMatrix(...b.rot);
  if (spin) return rotationMatrix(...mix3(a.rot, b.rot, u));
  return matrixOfQuat(slerp(quatOf(a.rot), quatOf(b.rot), u));
}

/** The pose part-way between two poses (u from 0 to 1). */
function poseBetween(a, b, u, spin) {
  if (u <= 0) return { pos: a.pos.slice(), rot: a.rot.slice(), scale: a.scale.slice() };
  if (u >= 1) return { pos: b.pos.slice(), rot: b.rot.slice(), scale: b.scale.slice() };
  return {
    pos: mix3(a.pos, b.pos, u),
    rot: spin ? mix3(a.rot, b.rot, u) : eulerOf(rotationBetween(a, b, u, false)),
    scale: mix3(a.scale, b.scale, u),
  };
}

/**
 * Where an object is `t` seconds after it appeared: at its place before the
 * first key, at the last key after it, and on the way in between.
 */
export function poseAt(obj, t) {
  const keys = keysOf(obj);
  let from = basePose(obj);
  let fromT = 0;
  for (const key of keys) {
    if (t < key.t) {
      const f = (t - fromT) / (key.t - fromT);
      return poseBetween(from, key, easeProgress(key.ease, f), !!obj.spin);
    }
    from = key;
    fromT = key.t;
  }
  return { pos: from.pos.slice(), rot: from.rot.slice(), scale: from.scale.slice() };
}

/** The key under a time on the timeline: 'start', an index into obj.keys, or null. */
export function keyAt(obj, time, tolerance = 0.005) {
  const keys = keysOf(obj);
  if (!keys.length) return null;
  const t = time - startOf(obj);
  if (Math.abs(t) <= tolerance) return 'start';
  const i = keys.findIndex((k) => Math.abs(k.t - t) <= tolerance);
  return i >= 0 ? i : null;
}

/** Closer to a key than this, a time counts as on it: no other key can be made there anyway. */
export const NEAR_KEY = MIN_KEY_GAP - 1e-6;

/**
 * What a time on the timeline points at for an object. It is also what a
 * change of the object's place at that time changes:
 *   { at: 'object' }        it has no keys: the object itself, whatever the time
 *   { at: 'start' }         where it starts (also while it is not there yet)
 *   { at: 'key', index }    one of its keys
 *   { at: 'last', index }   it is gone already: the key it ended on
 *   { at: 'between' }       between keys: a change makes a new key here
 *   { at: 'full' }          between keys, but it has all the keys it can have
 * `time` counts from the moment the group around it starts (the click, if it is
 * in none). `span` is given for a group, which has no lifetime of its own.
 */
export function markAt(obj, time, span = spanOf(obj)) {
  const keys = keysOf(obj);
  if (!keys.length) return { at: 'object' };
  const { start, end } = span;
  const here = keyAt(obj, time, NEAR_KEY);
  if (here === 'start' || time < start) return { at: 'start' };
  if (here !== null) return { at: 'key', index: here };
  if (time > end) return { at: 'last', index: keys.length - 1 };
  return { at: keys.length < MAX_KEYS ? 'between' : 'full' };
}

/**
 * A pose as a 3x4 matrix (12 numbers, row by row) that takes a point of the
 * shape to its place in Bloxd space. Rotation happens in view space, where Z is
 * flipped, which is why the third row is negated.
 */
function poseMatrix(m, scale, pos) {
  const [sx, sy, sz] = scale;
  return [
    m[0] * sx, m[1] * sy, m[2] * sz, pos[0],
    m[3] * sx, m[4] * sy, m[5] * sz, pos[1],
    -m[6] * sx, -m[7] * sy, -m[8] * sz, pos[2],
  ];
}

const matrixOfPose = (p) => poseMatrix(rotationMatrix(...p.rot), p.scale, p.pos);

function matrixBetween(a, b, u, spin) {
  if (u <= 0) return matrixOfPose(a);
  if (u >= 1) return matrixOfPose(b);
  return poseMatrix(rotationBetween(a, b, u, spin), mix3(a.scale, b.scale, u), mix3(a.pos, b.pos, u));
}

/** Apply a 3x4 matrix to a point. */
export const applyMatrix = (m, p) => [
  m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3],
  m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7],
  m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11],
];

/** a + b * k for matrices. */
const addScaled = (a, b, k) => a.map((v, i) => v + b[i] * k);
const sub = (a, b) => a.map((v, i) => v - b[i]);

function samePose(a, b, point, spin) {
  const near = (x, y) => x.every((v, i) => Math.abs(v - y[i]) < 1e-9);
  if (!near(a.pos, b.pos)) return false;
  if (point) return true; // a single particle has no size and no direction
  if (!near(a.scale, b.scale)) return false;
  return spin ? near(a.rot, b.rot) : angleBetween(a.rot, b.rot) < 1e-6;
}

// ---------------------------------------------------------------- curves over age

// A "curve" is a list of [age, value] stops, straight lines in between: exactly
// what the game's gradients are. Before the first stop it is 0, after the last
// one it keeps the last value.

/** Value of a curve at an age. */
export function curveAt(stops, age) {
  if (!stops.length || age < stops[0][0]) return 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const [a0, v0] = stops[i];
    const [a1, v1] = stops[i + 1];
    if (age <= a1) return a1 > a0 ? v0 + ((v1 - v0) * (age - a0)) / (a1 - a0) : v1;
  }
  return stops[stops.length - 1][1];
}

/**
 * Two integrals of a curve F from its first stop to `age`:
 * [ integral of F, integral of (s - ref) * F(s) ].
 * The first is how far a particle has come, the second how much its pull has
 * bent the way.
 */
export function curveIntegrals(stops, age, ref = 0) {
  let u = 0;
  let w = 0;
  for (let i = 0; i < stops.length; i++) {
    const [s0, f0] = stops[i];
    if (age <= s0) break;
    const last = i === stops.length - 1;
    const s1 = last ? age : Math.min(age, stops[i + 1][0]);
    const slope = last || stops[i + 1][0] <= s0 ? 0 : (stops[i + 1][1] - f0) / (stops[i + 1][0] - s0);
    const d = s1 - s0;
    const area = f0 * d + (slope * d * d) / 2;
    u += area;
    w += (f0 * d * d) / 2 + (slope * d * d * d) / 3 + (s0 - ref) * area;
  }
  return [u, w];
}

/** Drop stops that change nothing, keep ages rising. The first stop stays. */
function tidy(stops) {
  const out = [];
  for (const [age, value] of stops) {
    if (out.length && age <= out[out.length - 1][0] + EPS) out[out.length - 1][1] = value;
    else out.push([age, value]);
  }
  for (let i = out.length - 2; i > 0; i--) {
    const [a0, v0] = out[i - 1];
    const [a1, v1] = out[i];
    const [a2, v2] = out[i + 1];
    if (Math.abs(v0 + ((v2 - v0) * (a1 - a0)) / (a2 - a0) - v1) < 1e-12) out.splice(i, 1);
  }
  while (out.length > 1 && out[out.length - 1][1] === out[out.length - 2][1]) out.pop();
  return out;
}

/** Cut a curve off at an age. */
function cut(stops, age) {
  const out = stops.filter((stop) => stop[0] < age - EPS);
  out.push([age, curveAt(stops, age)]);
  return out;
}

/**
 * Stops shortly after every short ramp, with the value the curve has there
 * anyway. They change nothing unless a frame jumped the ramp: then the slip
 * ends at the next of them instead of lasting to the next real stop. A ramp
 * that ends on the last stop needs none.
 */
function guard(stops) {
  const out = [];
  for (let i = 0; i < stops.length; i++) {
    out.push(stops[i]);
    if (i === 0 || i === stops.length - 1) continue;
    const [a0, v0] = stops[i - 1];
    const [a1, v1] = stops[i];
    const [a2, v2] = stops[i + 1];
    if (a1 - a0 > SWITCH * 1.5 || a1 - a0 < TINY * 1.5 || v0 === v1) continue;
    for (const k of GUARDS) {
      const age = a1 + k * SWITCH;
      if (age > a2 - SWITCH / 2) break;
      out.push([age, v1 + ((v2 - v1) * (age - a1)) / (a2 - a1)]);
    }
  }
  return out;
}

// ---------------------------------------------------------------- the plan

/**
 * Speed of a move over its time, as a curve whose area is 1 (the whole way).
 * `seen`: the particle is seen standing still before the move. Then "Slow down"
 * cannot start at full speed out of nothing and gets a short ramp.
 */
function easeCurve(ease, from, to, seen) {
  const span = to - from;
  if (ease === 'linear') return [[from, 1 / span], [to, 1 / span]];
  const top = 2 / span;
  if (ease === 'in') return [[from, 0], [to, top]];
  if (ease === 'out') return seen ? [[from, 0], [from + Math.min(SWITCH, span / 4), top], [to, 0]] : [[from, top], [to, 0]];
  return [[from, 0], [(from + to) / 2, top], [to, 0]];
}

/** The age at which a move has come a fraction u of its way. */
function ageAtProgress(curve, u) {
  let lo = curve[0][0];
  let hi = curve[curve.length - 1][0];
  if (u <= 0) return lo;
  if (u >= 1) return hi;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (curveIntegrals(curve, mid)[0] < u) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** How visible an object is at an age, before pieces come into it (0 to 1). */
function envelope(plan, age) {
  const life = plan.a1 - plan.a0;
  let v = 1;
  if (plan.fadeIn) v = Math.min(v, (age - plan.a0) / (FADE_IN_END * life));
  if (plan.fadeOut) v = Math.min(v, (plan.a1 - age) / ((1 - FADE_START) * life));
  return Math.max(0, Math.min(1, v));
}

/**
 * Visibility of one piece over its whole life, as a curve. `tinted`: its colour
 * changes while it is seen, so its gradient has stops after the one that
 * switches it on, and that one cannot be the last.
 */
function visibilityCurve(piece, plan, tinted = false) {
  const { show, end } = piece;
  const life = plan.a1 - plan.a0;
  const marks = [];
  if (plan.fadeIn) marks.push(plan.a0 + FADE_IN_END * life);
  if (plan.fadeOut) marks.push(plan.a0 + FADE_START * life);
  const bends = marks.filter((m) => m > show + EPS && m < end - EPS);
  const first = envelope(plan, show);
  const last = envelope(plan, end);
  if (!bends.length && first === last && !tinted) {
    // the same all its life: switched on at once, by a last stop
    return show > TINY ? [[0, 0], [show - TINY, 0], [show, first]] : [[0, first]];
  }
  const stops = [];
  if (show <= TINY) stops.push([0, first]);
  else if (first === 0) stops.push([0, 0], [show, 0]); // fades in from nothing: no switch needed
  else stops.push([0, 0], [show - Math.min(tinted ? TINT_RAMP : SWITCH, show), 0], [show, first]);
  for (const m of bends) stops.push([m, envelope(plan, m)]);
  stops.push([end, last]);
  return guard(tidy(stops));
}

// ---------------------------------------------------------------- groups: poses inside poses
//
// An object can sit in a group, and a group in a group. Each has a pose of its
// own, seen from the one it sits in. Poses are put together in view space
// (where rotations happen) and flipped to Bloxd space at the end.

/** A pose as a 3x4 matrix in view space: a point of a node -> where it is in the node around it. */
const viewOf = (m, scale, pos) => [
  m[0] * scale[0], m[1] * scale[1], m[2] * scale[2], pos[0],
  m[3] * scale[0], m[4] * scale[1], m[5] * scale[2], pos[1],
  m[6] * scale[0], m[7] * scale[1], m[8] * scale[2], -pos[2],
];
export const viewMatrix = (pose) => viewOf(rotationMatrix(...pose.rot), pose.scale, pose.pos);
export const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

function viewBetween(a, b, u, spin) {
  if (u <= 0) return viewMatrix(a);
  if (u >= 1) return viewMatrix(b);
  return viewOf(rotationBetween(a, b, u, spin), mix3(a.scale, b.scale, u), mix3(a.pos, b.pos, u));
}

/** The 3x4 matrix that does b first, then a. */
export function mulAffine(a, b) {
  const out = new Array(12);
  for (let i = 0; i < 12; i += 4) {
    out[i] = a[i] * b[0] + a[i + 1] * b[4] + a[i + 2] * b[8];
    out[i + 1] = a[i] * b[1] + a[i + 1] * b[5] + a[i + 2] * b[9];
    out[i + 2] = a[i] * b[2] + a[i + 1] * b[6] + a[i + 2] * b[10];
    out[i + 3] = a[i] * b[3] + a[i + 1] * b[7] + a[i + 2] * b[11] + a[i + 3];
  }
  return out;
}

/** A view-space matrix whose results are flipped to Bloxd space (it still takes view-space points). */
export const flipZ = (m) => [m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], -m[8], -m[9], -m[10], -m[11]];

/** A view-space matrix as one that takes Bloxd-space points and gives Bloxd-space points. */
export const inBloxd = (m) => [m[0], m[1], -m[2], m[3], m[4], m[5], -m[6], m[7], -m[8], -m[9], m[10], -m[11]];

/** The pose a view matrix stands for (exact as long as nothing in it is sheared). */
export function poseOfView(m) {
  const col = (c) => [m[c], m[4 + c], m[8 + c]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (v, fallback) => {
    const len = Math.hypot(...v);
    return len > 1e-12 ? v.map((x) => x / len) : fallback;
  };
  const scale = [0, 1, 2].map((c) => Math.hypot(...col(c)));
  let x = unit(col(0), [1, 0, 0]);
  let y = col(1);
  y = unit(y.map((v, i) => v - x[i] * dot(x, y)), Math.abs(x[1]) < 0.9 ? unit(cross(cross(x, [0, 1, 0]), x), [0, 1, 0]) : [0, 0, 1]);
  let z = cross(x, y);
  // a mirror turns the three axes inside out: one of them (x) gets a negative size
  if (dot(z, col(2)) < 0 && scale[2] > 1e-12) {
    scale[0] = -scale[0];
    x = x.map((v) => -v);
    z = cross(x, y);
  }
  return { pos: [m[3], m[7], -m[11]], rot: eulerOf([x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]), scale };
}

/** Where the groups around a node put it at a time: all of them as one view matrix. `ancestors`: nearest first. */
export function lineageMatrix(ancestors, seconds) {
  let m = IDENTITY;
  for (const { node, start } of ancestors) m = mulAffine(viewMatrix(poseAt(node, seconds - start)), m);
  return m;
}

/**
 * What a node is doing `t` seconds after it started: holding pose `a` (nothing
 * changes, or it waits for a jump), or on its way from `a` to `b`.
 * `index`: the key it is heading for, -1 after the last one.
 */
function segmentAt(node, t) {
  const point = node.shape === 'point';
  const spin = !!node.spin;
  const keys = keysOf(node);
  let a = basePose(node);
  let from = 0;
  if (t >= 0) {
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (t < key.t) {
        const same = samePose(a, key, point, spin);
        const jumps = key.ease === 'jump';
        return { a, b: key, from, to: key.t, ease: key.ease, index, moving: !jumps && !same, jump: jumps && !same };
      }
      a = key;
      from = key.t;
    }
  }
  return { a, b: a, from, to: Infinity, ease: 'linear', index: -1, moving: false, jump: false };
}

const segmentMatrix = (seg, t, spin) => (seg.moving
  ? viewBetween(seg.a, seg.b, easeProgress(seg.ease, (t - seg.from) / (seg.to - seg.from)), spin)
  : viewMatrix(seg.a));

/** The pose a node keeps from second s0 to s1 after it started, or null if it changes in that time. */
function heldPose(node, s0, s1) {
  const poses = [basePose(node), ...keysOf(node)];
  const spin = !!node.spin;
  let held = poses[0];
  for (let i = 1; i < poses.length; i++) {
    const from = i > 1 ? poses[i - 1].t : 0;
    if (poses[i].t <= s0 + 1e-9) { held = poses[i]; continue; } // over before that time
    if (from >= s1 - 1e-9) break; // starts after it
    if (!samePose(poses[i - 1], poses[i], false, spin)) return null;
  }
  return held;
}

// ---------------------------------------------------------------- colours and sizes at keys
//
// A key can also give an object another colour or particle size. The colour
// changes on the way to the key (a colour gradient does that). A particle keeps
// its size all its life, so a change of size is shown in steps, by particles of
// their own.
//
// A piece whose colour changes while it is seen cannot be switched on by a last
// stop (its gradient goes on), so it is switched on by a short ramp, like a
// fade (TINT_RAMP: longer than a frame at 20 frames a second; on a slower
// device a point can be faint for one frame at a hand-over). That is why only
// pieces that last a while get a colour that changes (LONG_TINT); a short piece
// has the colour of its middle and stays safe at every frame rate, and a path
// with many short pieces changes colour from piece to piece.

const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const unset = (v) => v === null || v === undefined;

export const keyHasColor = (key) => typeof key.color === 'string';
export const keyHasSize = (key) => typeof key.size === 'number';
/** One of its keys changes how the object looks. */
export const hasLookKeys = (obj) => keysOf(obj).some((k) => keyHasColor(k) || keyHasSize(k));

/** How an object looks where it starts: { c1, c2 (colours), lo, hi (particle sizes) }. */
export function baseLook(obj) {
  const c1 = rgbOf(obj.color);
  const s2 = unset(obj.size2) ? obj.size : obj.size2;
  return { c1, c2: obj.color2 ? rgbOf(obj.color2) : c1, lo: Math.min(obj.size, s2), hi: Math.max(obj.size, s2) };
}

/**
 * The look of an object where it starts and at each of its keys. A key that
 * sets no colour keeps the colour of the key before it; the same for the size.
 * null when no key changes the look.
 */
export function looksOf(obj) {
  if (!hasLookKeys(obj)) return null;
  const out = [baseLook(obj)];
  for (const key of keysOf(obj)) {
    const look = { ...out[out.length - 1] };
    if (keyHasColor(key)) {
      look.c1 = rgbOf(key.color);
      look.c2 = key.color2 ? rgbOf(key.color2) : look.c1;
    }
    if (keyHasSize(key)) {
      const s2 = unset(key.size2) ? key.size : key.size2;
      look.lo = Math.min(key.size, s2);
      look.hi = Math.max(key.size, s2);
    }
    out.push(look);
  }
  return out;
}

/** The look `t` seconds after the object appeared. */
export function lookAt(obj, t, looks = looksOf(obj)) {
  if (!looks) return baseLook(obj);
  const keys = keysOf(obj);
  let fromT = 0;
  for (let i = 0; i < keys.length; i++) {
    if (t < keys[i].t) {
      const u = easeProgress(keys[i].ease, (t - fromT) / (keys[i].t - fromT));
      const a = looks[i];
      const b = looks[i + 1];
      if (u <= 0) return a;
      return { c1: mix3(a.c1, b.c1, u), c2: mix3(a.c2, b.c2, u), lo: a.lo + (b.lo - a.lo) * u, hi: a.hi + (b.hi - a.hi) * u };
    }
    fromT = keys[i].t;
  }
  return looks[looks.length - 1];
}

const sameColours = (a, b) => a.c1.every((v, i) => v === b.c1[i]) && a.c2.every((v, i) => v === b.c2[i]);
const sameSizes = (a, b) => a.lo === b.lo && a.hi === b.hi;

/** A change of size between two keys is shown in at most this many steps. */
const MAX_SIZE_STEPS = 8;
/** How many steps a change of size gets: one for every quarter it grows or shrinks. */
function sizeSteps(a, b) {
  const ratio = (x, y) => (x > 0 && y > 0 ? Math.max(x / y, y / x) : 1);
  const r = Math.max(ratio(a.lo, b.lo), ratio(a.hi, b.hi));
  return Math.max(1, Math.min(MAX_SIZE_STEPS, Math.ceil(Math.log(r) / Math.log(1.25) - 1e-9)));
}

/** The fraction of its time at which a move has come a fraction u of its way. */
function easeTime(ease, u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  switch (ease) {
    case 'linear': return u;
    case 'in': return Math.sqrt(u);
    case 'out': return 1 - Math.sqrt(1 - u);
    case 'jump': return 1;
    default: return u < 0.5 ? Math.sqrt(u / 2) : 1 - Math.sqrt((1 - u) / 2);
  }
}

/** The colours of a piece at an age: [c1, c2]. `tint`: [[age, c1, c2], ...] */
export function tintAt(tint, age) {
  if (age <= tint[0][0]) return [tint[0][1], tint[0][2]];
  for (let i = 1; i < tint.length; i++) {
    if (age <= tint[i][0]) {
      const u = (age - tint[i - 1][0]) / (tint[i][0] - tint[i - 1][0]);
      return [mix3(tint[i - 1][1], tint[i][1], u), mix3(tint[i - 1][2], tint[i][2], u)];
    }
  }
  const last = tint[tint.length - 1];
  return [last[1], last[2]];
}

/** A piece seen for less than this (age) keeps one colour: the one the object has at its middle. */
const LONG_TINT = 0.2;
/** The ramp that switches on a piece whose colour changes (age): 75 ms. */
const TINT_RAMP = SWITCH * 1.5;
/** After a piece with a changing colour is switched on, its stops are at most this far apart (age). */
const TINT_GAP = 0.3;

/** The size and the colours the object has while a piece is seen: { size, tint } (tint only if a key sets a colour). */
function lookOf(piece, plan, obj, looks) {
  const from = Math.max(piece.show, plan.a0);
  const to = piece.end;
  const seconds = (age) => (age - plan.a0) / LIFE_PER_SECOND;
  const look = (age) => lookAt(obj, seconds(age), looks);
  const middle = look((from + to) / 2);
  const size = [Number(middle.lo.toFixed(3)), Number(middle.hi.toFixed(3))];
  const keys = keysOf(obj);
  if (!keys.some(keyHasColor)) return { size };
  if (to - from < LONG_TINT) return { size, tint: [[from, middle.c1.map(Math.round), middle.c2.map(Math.round)]] };
  // Colour stops: both ends, every key in between, and a few more where the
  // change does not run steadily. (A colour that jumps starts a new piece.)
  const ages = [from, to];
  let before = plan.a0;
  keys.forEach((key, i) => {
    const at = plan.a0 + key.t * LIFE_PER_SECOND;
    if (key.ease !== 'jump' && key.ease !== 'linear' && !sameColours(looks[i], looks[i + 1])) {
      for (let k = 1; k < 4; k++) ages.push(before + ((at - before) * k) / 4);
    }
    ages.push(at);
    before = at;
  });
  const inside = ages.filter((age) => age > from + 1e-6 && age < to - 1e-6).sort((x, y) => x - y);
  const stops = [from, ...inside, to - 1e-7].map((age) => {
    const { c1, c2 } = look(Math.max(from, age));
    return [age === to - 1e-7 ? to : age, c1.map(Math.round), c2.map(Math.round)];
  });
  const same = (x, y) => String(x[1]) === String(y[1]) && String(x[2]) === String(y[2]);
  for (let i = stops.length - 2; i > 0; i--) {
    if (same(stops[i], stops[i - 1]) && same(stops[i], stops[i + 1])) stops.splice(i, 1);
  }
  while (stops.length > 1 && same(stops[stops.length - 1], stops[stops.length - 2])) stops.pop();
  return { size, tint: stops };
}

/**
 * The colour gradient of a piece whose colour changes, as the game needs it:
 * [[age, visibility, colour, second colour], ...]. Visibility and colour have
 * their stops at different moments, so every stop carries both. After the ramp
 * that switches the piece on come the extra stops that end a slip (see the top
 * of the file), and later ones are never far apart, so that a frame that took
 * very long leaves a point faint for a moment only.
 */
export function tintedStops(piece) {
  const ages = piece.visible.map((stop) => stop[0]);
  const add = (age) => {
    if (!ages.some((known) => Math.abs(known - age) < 1e-7)) ages.push(age);
  };
  for (const [age] of piece.tint) add(age);
  if (piece.show > TINY) {
    for (const k of GUARDS) {
      const age = piece.show + k * SWITCH;
      if (age > piece.end - SWITCH / 2) break;
      add(age);
    }
  }
  ages.sort((x, y) => x - y);
  const out = [];
  ages.forEach((age, i) => {
    const before = ages[i - 1];
    if (i > 0 && piece.show > TINY && before >= piece.show - 1e-9) {
      const parts = Math.ceil((age - before) / TINT_GAP - 1e-9);
      for (let k = 1; k < parts; k++) out.push(before + ((age - before) * k) / parts);
    }
    out.push(age);
  });
  return out.map((age) => [age, curveAt(piece.visible, age), ...tintAt(piece.tint, age)]);
}

// ---------------------------------------------------------------- the plan

const keySignature = (k) => [k.t, k.pos, k.rot, k.scale, k.ease, k.color, k.color2, k.size, k.size2];

const signature = (obj, lineage) => JSON.stringify([
  obj.shape === 'point', lineage ? lineage.start : startOf(obj), obj.life, !!obj.fade, !!obj.fadeIn, obj.blend, !!obj.spin,
  obj.pos, obj.rot, obj.scale, obj.move, obj.spread, obj.expand, obj.gravity,
  keysOf(obj).map(keySignature),
  hasLookKeys(obj) ? [obj.color, obj.color2, obj.size, obj.size2] : 0,
  lineage && lineage.ancestors && lineage.ancestors.length
    ? [lineage.box || 0, lineage.ancestors.map(({ node, start }) => [start, node.pos, node.rot, node.scale, !!node.spin, keysOf(node).map(keySignature)])]
    : 0,
]);

const plans = new WeakMap();

/**
 * Everything the particles of an object do, in terms the game understands.
 *
 * lineage : for an object in a group, or one that is played several times:
 *           { start     : the second at which this play of it starts
 *             ancestors : [{ node, start }] the groups around it, nearest first,
 *                         each with the second at which it starts
 *             box       : [[x, y, z], [x, y, z]] corners of the box its shape fits in }
 *           Without it the object stands alone and starts at its own `start`.
 *
 * returns {
 *   a0, a1  : age at which the object appears and is gone
 *   rough   : '' when every turn could be cut finely enough. Else what would help:
 *             'quick' (a turn needs more time) or 'big' (a turn needs a key halfway)
 *   mixed   : true when it and a group around it move at different paces at the
 *             same time, which takes extra particles
 *   pieces  : [{
 *     show, end : age from which it is seen, and at which it dies (its lifetime)
 *     P         : 3x4 matrix, point of the shape -> where the particle is made
 *     V         : 3x4 matrix, point of the shape -> its direction; null: stands still
 *     g, ref    : free flight only: the pull on it (a vector), counted from age `ref`
 *     spread    : random extra speed on every axis (plus or minus)
 *     speed     : curve of its velocity factor (never above 1)
 *     visible   : curve of its visibility
 *     size      : [smallest, largest] particle size, only when a key changes the look
 *     tint      : [[age, colour, second colour], ...], only when a key changes the colour
 *   }]
 * }
 * A particle of a piece is at  P*l + (V*l) * U + g * W  where l is its point of
 * the shape and [U, W] = curveIntegrals(speed, age, ref).
 */
export function planOf(obj, lineage = null) {
  const key = signature(obj, lineage);
  let known = plans.get(obj);
  if (!known) {
    known = new Map();
    plans.set(obj, known);
  }
  let plan = known.get(key);
  if (!plan) {
    if (known.size >= 1024) known.clear();
    plan = buildPlan(obj, lineage);
    known.set(key, plan);
  }
  return plan;
}

function buildPlan(obj, lineage) {
  const start = lineage ? lineage.start : startOf(obj);
  const stay = staySeconds(obj);
  const a0 = start * LIFE_PER_SECOND;
  const a1 = a0 + stay * LIFE_PER_SECOND;
  const ancestors = (lineage && lineage.ancestors) || [];
  const looks = looksOf(obj);
  if (!ancestors.length) return finish(ownPlan(obj, a0, a1, looks, 1), obj, looks);
  // The groups around it do not move while it is there: its own plan, put where they are.
  const held = ancestors.map((a) => heldPose(a.node, start - a.start, start - a.start + stay));
  if (held.every(Boolean)) {
    let around = IDENTITY;
    for (const pose of held) around = mulAffine(viewMatrix(pose), around);
    const reach = Math.max(...[0, 1, 2].map((c) => Math.hypot(around[c], around[4 + c], around[8 + c])));
    const plan = finish(ownPlan(obj, a0, a1, looks, reach), obj, looks);
    const c = inBloxd(around);
    const turn = [c[0], c[1], c[2], 0, c[4], c[5], c[6], 0, c[8], c[9], c[10], 0];
    for (const piece of plan.pieces) {
      piece.P = mulAffine(c, piece.P);
      if (piece.V) piece.V = mulAffine(turn, piece.V);
    }
    return plan;
  }
  return finish(chainPlan(obj, lineage, a0, a1, looks), obj, looks);
}

/** A point in time at which the piece before has to end and a new one starts, although nothing moves. */
const boundary = (at, m) => ({ kind: 'hold', from: at, to: at, m, jump: true });

/** The stretches of an object that stands alone (or in groups that do not move), from its own keys. */
function ownPlan(obj, a0, a1, looks, reach) {
  const point = obj.shape === 'point';
  const spin = !!obj.spin;
  const plan = { a0, a1, fadeIn: !!obj.fadeIn, fadeOut: !!obj.fade, rough: '', pieces: [] };

  // stretches of time: nothing moves ('hold'), travel to a key ('move'), free flight ('fly')
  const poses = [basePose(obj), ...keysOf(obj)];
  const stretches = [];
  let at = a0;
  for (let i = 1; i < poses.length; i++) {
    const to = Math.min(a1, a0 + poses[i].t * LIFE_PER_SECOND);
    const same = samePose(poses[i - 1], poses[i], point, spin);
    const jumps = poses[i].ease === 'jump';
    const m = matrixOfPose(poses[i - 1]);
    // the size changes on the way to this key: in steps, each shown by particles of its own
    const resized = !!looks && !jumps && to - at >= 1e-6 && !sameSizes(looks[i - 1], looks[i]);
    const steps = resized ? Math.max(1, Math.min(sizeSteps(looks[i - 1], looks[i]), Math.floor((to - at) / MIN_CHORD_AGE + 1e-9))) : 1;
    if (jumps || same || to - at < 1e-6) {
      if (resized) {
        stretches.push(boundary(at, m));
        let from = at;
        for (let k = 1; k <= steps; k++) {
          const end = k === steps ? to : at + (to - at) * easeTime(poses[i].ease, k / steps);
          if (end - from < 1e-6) continue;
          stretches.push({ kind: 'hold', from, to: end, m, jump: true });
          from = end;
        }
      } else {
        const relooks = jumps && !!looks && !(sameSizes(looks[i - 1], looks[i]) && sameColours(looks[i - 1], looks[i]));
        stretches.push({ kind: 'hold', from: at, to, m, jump: !same || relooks });
      }
    } else {
      if (resized) stretches.push(boundary(at, m));
      const s = { from: at, to, a: poses[i - 1], b: poses[i], ease: poses[i].ease, steps };
      stretches.push({
        kind: 'move', from: at, to, end: matrixOfPose(poses[i]), jump: false,
        prepare: (seen) => ownMove(s, seen, point, spin, plan, reach),
      });
    }
    at = to;
  }
  const last = matrixOfPose(poses[poses.length - 1]);
  const flies = obj.move.some((v) => v !== 0) || obj.spread > 0 || obj.expand !== 0 || obj.gravity !== 0;
  if (a1 - at > 1e-6 || !stretches.length) {
    if (flies) {
      // direction = move + expand * (place - centre), pull = gravity
      stretches.push({ kind: 'fly', from: at, to: a1, m: last, V: last.map((v, i) => (i % 4 === 3 ? obj.move[(i - 3) / 4] : v * obj.expand)) });
    } else stretches.push({ kind: 'hold', from: at, to: a1, m: last, jump: false });
  }
  emit(plan, stretches, obj, last);
  return plan;
}

/** How an object that stands alone flies one move: its speed curve and the straight stretches of its turn. */
function ownMove(s, seen, point, spin, plan, reach) {
  const curve = easeCurve(s.ease, s.from, s.to, seen);
  // A turn is flown as straight stretches ("chords"). How many depends on the
  // size of the shape: the corners may be about 0.05 block off the true arc,
  // but no less than 1% and no more than 4% of its size.
  const turn = point ? 0 : spin ? Math.hypot(...sub(s.b.rot, s.a.rot)) : angleBetween(s.a.rot, s.b.rot);
  const fastest = Math.max(...curve.map((stop) => stop[1])); // share of the way per age
  const inTime = Math.floor(1 / (fastest * MIN_CHORD_AGE) + 1e-9); // as many as there is time for
  let chords = 1;
  if (turn > 0.01) {
    const size = 1.2 * reach * Math.max(...s.a.scale.map(Math.abs), ...s.b.scale.map(Math.abs));
    const slack = Math.max(0.01, Math.min(0.04, 0.05 / Math.max(size, 1e-6)));
    const wanted = Math.ceil(turn / ((4 * Math.sqrt(slack)) / RAD) - 1e-9);
    chords = Math.max(1, Math.min(wanted, MAX_CHORDS, inTime));
    if (chords < wanted && plan.rough !== 'quick') plan.rough = inTime < Math.min(wanted, MAX_CHORDS) ? 'quick' : 'big';
  }
  // a change of size needs a stretch for each of its steps
  if (s.steps > chords) chords = Math.max(chords, Math.min(s.steps, MAX_CHORDS, Math.max(1, inTime)));
  // Corners sit a little outside the arc, so that the stretches between
  // them run as far inside it as the corners are outside.
  const bulge = turn > 0.01 ? 2 / (1 + Math.cos((Math.min(turn / chords, 120) * RAD) / 2)) : 1;
  const turned = (j) => rotationBetween(s.a, s.b, j / chords, spin);
  const corner = (j) => {
    const u = j / chords;
    if (j === 0 || j === chords || bulge === 1) return matrixBetween(s.a, s.b, u, spin);
    // "outside" is away from the axis it turns about; along the axis nothing changes
    const axis = axisOf(times(turned(j + 1), transposed(turned(j - 1))));
    const widen = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
      const r = Math.floor(i / 3), c = i % 3;
      return (r === c ? bulge : 0) - (bulge - 1) * axis[r] * axis[c];
    });
    return poseMatrix(times(widen, turned(j)), mix3(s.a.scale, s.b.scale, u), mix3(s.a.pos, s.b.pos, u));
  };
  return { curve, steady: s.ease === 'linear', chords, corner };
}

/**
 * Turns stretches into pieces.
 *   hold : { from, to, m, jump }   nothing moves; `jump`: at its end the piece that shows it has to end
 *   move : { from, to, end, jump, prepare(seen) -> { curve, steady, chords, corner(j) } }
 *   fly  : { from, to, m, V }
 * `m`, `end`, corners: 3x4 matrices (Bloxd space). `last`: where it is at the very end.
 */
function emit(plan, stretches, obj, last) {
  const { a0, a1 } = plan;
  // Walk through the stretches. `since` is the age from which the next piece
  // has to show the object. `rest` is set after a move: from there on the
  // object stands at an exact place, which a piece of its own shows (a particle
  // that has travelled is only about where it should be on a slow device).
  let since = a0;
  let rest = null;
  const still = (m, show, end) => plan.pieces.push({
    show, end, P: m, V: null, g: null, ref: 0, spread: 0, speed: [[0, 1]],
  });
  const endRest = (age) => {
    if (rest && age - since > 1e-6) {
      still(rest, since, age);
      since = age;
    }
    rest = null;
  };

  for (const s of stretches) {
    if (s.kind === 'hold') {
      if (s.jump) {
        rest = null;
        if (s.to - since > 1e-6) still(s.m, since, s.to);
        since = s.to;
      }
      continue;
    }
    endRest(s.from);
    if (s.kind === 'fly') {
      const late = s.from > TINY; // it waits, then sets off at once
      plan.pieces.push({
        show: since, end: a1, P: s.m, V: s.V, g: obj.gravity !== 0 ? [0, obj.gravity, 0] : null, spread: obj.spread,
        ref: late ? s.from : 0,
        speed: late ? [[0, 0], [s.from - TINY, 0], [s.from, 1]] : [[0, 1]],
      });
      since = a1;
      continue;
    }
    // a move
    const seen = since < s.from - EPS; // it is seen standing still before it sets off
    const { curve, steady, chords, corner } = s.prepare(seen);

    // From birth to the start of the move. A steady speed is switched on at
    // once. A curve that starts fast and slows down is reached by a run-up
    // nobody sees; `before` is how far that carries.
    const lead = [];
    let before = 0;
    if (s.from > TINY) {
      lead.push([0, 0]);
      if (steady) lead.push([s.from - TINY, 0]);
      else if (curve[0][1] > 0) {
        const run = Math.min(RUNUP, s.from);
        if (run < s.from - TINY) lead.push([s.from - run, 0]);
        before = (curve[0][1] * run) / 2;
      }
    }
    const speed = tidy([...lead, ...curve]);
    for (let j = 0; j < chords; j++) {
      const from = j === 0 ? s.from : ageAtProgress(curve, j / chords);
      const to = j === chords - 1 ? s.to : ageAtProgress(curve, (j + 1) / chords);
      // Every piece runs the whole speed curve of the move along its own
      // stretch, so it is on its way (unseen) before its turn comes.
      const m0 = corner(j);
      const V = sub(corner(j + 1), m0).map((v) => v * chords);
      plan.pieces.push({
        show: j === 0 ? since : from, end: to, P: addScaled(m0, V, -(before + j / chords)), V, g: null, ref: 0, spread: 0, speed,
      });
    }
    since = s.to;
    rest = s.jump ? null : s.end;
  }
  endRest(a1);
  if (a1 - since > 1e-6 || !plan.pieces.length) still(last, since, a1);
}

/** Visibility and speed curves of every piece as the game needs them; looks, if keys change them. */
function finish(plan, obj, looks) {
  for (const piece of plan.pieces) {
    const look = looks ? lookOf(piece, plan, obj, looks) : null;
    piece.visible = visibilityCurve(piece, plan, !!look && !!look.tint && look.tint.length > 1);
    if (look) Object.assign(piece, look);
    if (!piece.V) continue;
    // only as much of the speed curve as it lives to use, at most 1 (the
    // direction carries the rest), with the extra stops after sudden changes
    const used = tidy(cut(piece.speed, piece.end));
    const top = piece.g || piece.spread ? 1 : Math.max(...used.map((stop) => stop[1]));
    if (!(top > 0)) { piece.V = null; piece.speed = [[0, 1]]; continue; }
    piece.speed = guard(used.map(([age, f]) => [age, f / top]));
    piece.V = piece.V.map((v) => v * top);
  }
  return plan;
}

// ---------------------------------------------------------------- the plan of an object in groups that move
//
// The object and every group around it is a "track" with keys of its own. All
// key times of all tracks cut the time into intervals; within one, every track
// either holds still or is on its way to one key. Whatever moves in an
// interval is flown together, as straight stretches, by one set of pieces.
// Those share one speed curve. When two tracks move at different paces (one
// steadily, one speeding up) no curve fits both, so the interval is cut into
// as many stretches as it takes to stay close to the true path.

/** A speed curve cut to the ages A..B and scaled so that its area is 1. null when it gets nowhere in that time. */
function cutCurve(stops, A, B) {
  const out = [[A, curveAt(stops, A)]];
  for (const [age, value] of stops) if (age > A + EPS && age < B - EPS) out.push([age, value]);
  out.push([B, curveAt(stops, B)]);
  const area = curveIntegrals(out, B)[0];
  return area > 1e-9 ? out.map(([age, value]) => [age, value / area]) : null;
}

/** w of curve a and the rest of curve b. Both run over the same ages. */
function blendCurves(a, b, w) {
  const ages = [...new Set([...a, ...b].map((stop) => stop[0]))].sort((x, y) => x - y);
  return ages.map((age) => [age, w * curveAt(a, age) + (1 - w) * curveAt(b, age)]);
}

const steadyCurve = (curve) => curve.every((stop) => Math.abs(stop[1] - curve[0][1]) < 1e-9 * Math.abs(curve[0][1]));
const sameCurve = (a, b) => a.length === b.length && a.every((stop, i) => Math.abs(stop[0] - b[i][0]) < 1e-9 && Math.abs(stop[1] - b[i][1]) < 1e-9);

/** Seen standing still, a particle cannot be fast at once: the curve gets a short ramp at its start. */
function rampUp(curve) {
  const from = curve[0][0];
  const to = curve[curve.length - 1][0];
  const ramp = Math.min(SWITCH, (to - from) / 4);
  const out = [[from, 0], [from + ramp, curveAt(curve, from + ramp)], ...curve.filter((stop) => stop[0] > from + ramp + EPS)];
  const area = curveIntegrals(out, to)[0];
  return out.map(([age, value]) => [age, value / area]);
}

/** Numbers of stretches that are tried for an interval, in this order. */
const CHORD_LADDER = [1, 2, 3, 4, 6, 8, 12, 16, MAX_CHORDS];

function chainPlan(obj, lineage, a0, a1, looks) {
  const plan = { a0, a1, fadeIn: !!obj.fadeIn, fadeOut: !!obj.fade, rough: '', pieces: [] };
  const point = obj.shape === 'point';
  // the object itself first, then the groups around it from the inside out
  const tracks = [{ node: obj, start: lineage.start }, ...lineage.ancestors];
  const seconds = (age) => age / LIFE_PER_SECOND;
  const ageOf = (track, t) => (track.start + t) * LIFE_PER_SECOND;
  /** One track at an age: what `seg` says, or without it what its keys say (after a jump at that very moment). */
  const trackAt = (k, age, seg) => {
    const t = seconds(age) - tracks[k].start;
    return seg ? segmentMatrix(seg, t, !!tracks[k].node.spin) : viewMatrix(poseAt(tracks[k].node, t));
  };
  /** All tracks from number `first` up, put together (view space). */
  const chainAt = (age, segs, first = 0) => {
    let m = IDENTITY;
    for (let k = first; k < tracks.length; k++) m = mulAffine(trackAt(k, age, segs && segs[k]), m);
    return m;
  };

  const keys = keysOf(obj);
  const flies = obj.move.some((v) => v !== 0) || obj.spread > 0 || obj.expand !== 0 || obj.gravity !== 0;
  // from `until` on it flies free and no longer follows its groups
  const until = flies ? Math.min(a1, a0 + (keys.length ? keys[keys.length - 1].t : 0) * LIFE_PER_SECOND) : a1;

  // every moment at which a track starts or reaches a key
  const marks = [];
  for (const track of tracks) for (const t of [0, ...keysOf(track.node).map((k) => k.t)]) marks.push(ageOf(track, t));
  // moments at which the piece that shows the object has to end, although it may not move: its look changes there
  const cuts = [];
  if (looks) {
    let from = a0;
    keys.forEach((key, i) => {
      const to = Math.min(a1, a0 + key.t * LIFE_PER_SECOND);
      const resized = !sameSizes(looks[i], looks[i + 1]);
      if (key.ease === 'jump') {
        if (resized || !sameColours(looks[i], looks[i + 1])) cuts.push(to);
      } else if (resized && to - from >= 1e-6) {
        const steps = Math.max(1, Math.min(sizeSteps(looks[i], looks[i + 1]), Math.floor((to - from) / MIN_CHORD_AGE + 1e-9)));
        for (let k = 0; k <= steps; k++) cuts.push(k === steps ? to : from + (to - from) * easeTime(key.ease, k / steps));
      }
      from = to;
    });
    marks.push(...cuts);
  }
  const events = [a0];
  for (const age of marks.filter((m) => m > a0 + 1e-6 && m < until - 1e-6).sort((x, y) => x - y)) {
    if (age - events[events.length - 1] > 1e-6) events.push(age);
  }
  events.push(until);
  const isCut = (age) => cuts.some((c) => Math.abs(c - age) < 1e-6);

  const box = (lineage.box && !point) ? lineage.box : [[-1, -1, -1], [1, 1, 1]];
  const samples = point ? [[0, 0, 0]] : [0, 1, 2, 3, 4, 5, 6, 7].map((n) => [box[n & 1][0], box[(n >> 1) & 1][1], box[(n >> 2) & 1][2]]);

  const stretches = [];
  for (let e = 0; e < events.length - 1; e++) {
    const A = events[e];
    const B = events[e + 1];
    if (B - A < 1e-6) continue;
    const segs = tracks.map((track) => segmentAt(track.node, seconds((A + B) / 2) - track.start));
    // something jumps at the end of this interval, or the look needs a new piece there
    const jump = isCut(B) || tracks.some((track, k) => segs[k].jump && Math.abs(ageOf(track, segs[k].to) - B) < 1e-6);
    if (!segs.some((seg) => seg.moving)) {
      stretches.push({ kind: 'hold', from: A, to: B, m: flipZ(chainAt(A, segs)), jump });
      continue;
    }
    stretches.push({
      kind: 'move', from: A, to: B, end: flipZ(chainAt(B, segs)), jump,
      prepare: (seen) => {
        const at = (age) => flipZ(chainAt(age, segs));
        // the speed curves to choose from: the pace of every track that moves, then mixtures of them
        let curves = [];
        const add = (curve) => { if (curve && !curves.some((c) => sameCurve(c, curve))) curves.push(curve); };
        segs.forEach((seg, k) => {
          if (seg.moving) add(cutCurve(easeCurve(seg.ease, ageOf(tracks[k], seg.from), ageOf(tracks[k], seg.to), false), A, B));
        });
        const paces = curves.length;
        if (paces !== 1) add([[A, 1 / (B - A)], [B, 1 / (B - A)]]);
        if (paces > 1) {
          plan.mixed = true;
          for (const w of [0.5, 0.25, 0.75]) add(blendCurves(curves[0], curves[1], w));
          if (paces > 2) add(curves.slice(1, paces).reduce((sum, c, i) => blendCurves(sum, c, (i + 1) / (i + 2)), curves[0]));
        }
        if (seen) curves = curves.map((c) => (c[0][1] > 0 && !steadyCurve(c) ? rampUp(c) : c));

        // How far off the true path it may be: about 0.05 block, but no less than
        // 1% and no more than 4% of how far the shape reaches from the middle of
        // the outermost thing that moves.
        const top = segs.reduce((last, seg, k) => (seg.moving ? k : last), 0);
        let reach = 1e-6;
        for (const age of [A, B]) {
          const pivot = chainAt(age, segs, top);
          const m = chainAt(age, segs);
          for (const l of samples) {
            const p = applyMatrix(m, l);
            reach = Math.max(reach, Math.hypot(p[0] - pivot[3], p[1] - pivot[7], p[2] - pivot[11]));
          }
        }
        const allowed = Math.max(0.004, reach * Math.max(0.01, Math.min(0.04, 0.05 / reach)));

        /** n straight stretches along a curve: the corners, and how far off the true path they are at worst. */
        const measure = (curve, n) => {
          const plain = [];
          for (let j = 0; j <= n; j++) plain.push(at(j === 0 ? A : j === n ? B : ageAtProgress(curve, j / n)));
          const mids = [];
          for (let j = 0; j < n; j++) mids.push(at(ageAtProgress(curve, (j + 0.5) / n)));
          // Corners sit a little outside the bend, so that the stretches between
          // them run as far inside it as the corners are outside.
          const off = mids.map((m, j) => m.map((v, i) => v - (plain[j][i] + plain[j + 1][i]) / 2));
          const corner = plain.map((m, j) => (j === 0 || j === n ? m : m.map((v, i) => v + (off[j - 1][i] + off[j][i]) / 4)));
          let worst = 0;
          for (let j = 0; j < n; j++) {
            for (const f of [0.25, 0.5, 0.75]) {
              const truth = f === 0.5 ? mids[j] : at(ageAtProgress(curve, (j + f) / n));
              const diff = truth.map((v, i) => v - (corner[j][i] + (corner[j + 1][i] - corner[j][i]) * f));
              for (const l of samples) worst = Math.max(worst, Math.hypot(...applyMatrix(diff, l)));
            }
          }
          return { curve, n, corner, worst };
        };

        let best = null; // the fewest stretches that stay within `allowed`
        let fallback = null; // or, if none does, the closest
        for (const curve of curves) {
          const fastest = Math.max(...curve.map((stop) => stop[1]));
          const inTime = Math.max(1, Math.floor(1 / (fastest * MIN_CHORD_AGE) + 1e-9));
          const most = Math.min(MAX_CHORDS, inTime, best ? best.n - 1 : Infinity);
          let tried = 0;
          for (const n of [...CHORD_LADDER.filter((c) => c < most), most]) {
            if (n < 1) break;
            const m = measure(curve, n);
            if (m.worst <= allowed) {
              // the first rung that fits: maybe a number just below it fits too
              let fit = m;
              for (let lower = n - 1; lower > tried; lower--) {
                const t = measure(curve, lower);
                if (t.worst > allowed) break;
                fit = t;
              }
              best = fit;
              break;
            }
            tried = n;
            if (!best && (!fallback || m.worst < fallback.worst)) fallback = { ...m, short: inTime < MAX_CHORDS };
          }
        }
        const pick = best || fallback;
        if (!best && plan.rough !== 'quick') plan.rough = fallback.short ? 'quick' : 'big';
        return { curve: pick.curve, steady: steadyCurve(pick.curve), chords: pick.n, corner: (j) => pick.corner[j] };
      },
    });
  }

  const last = flipZ(chainAt(until)); // by the keys: after anything that jumps at that moment
  if (flies && (a1 - until > 1e-6 || !stretches.length)) {
    // it is let go where it is, the way its groups stand at that moment
    const around = inBloxd(chainAt(until, null, 1));
    const dir = [0, 4, 8].map((r) => around[r] * obj.move[0] + around[r + 1] * obj.move[1] + around[r + 2] * obj.move[2]);
    stretches.push({ kind: 'fly', from: until, to: a1, m: last, V: last.map((v, i) => (i % 4 === 3 ? dir[(i - 3) / 4] : v * obj.expand)) });
  }
  emit(plan, stretches, obj, last);
  return plan;
}

/**
 * What a plan shows at an age: the pieces that can be seen, each with
 * u, w (see planOf) and how visible it is. Used by the preview.
 */
export function piecesAt(plan, age) {
  const out = [];
  for (const piece of plan.pieces) {
    if (age >= piece.end || age < piece.show - TINT_RAMP) continue;
    const visible = curveAt(piece.visible, age);
    if (visible <= 0) continue;
    const [u, w] = piece.V || piece.g ? curveIntegrals(piece.speed, age, piece.ref) : [0, 0];
    out.push({ piece, u, w, visible });
  }
  return out;
}

/** Where an object is drawn while it is not there: before it appears, or after it is gone. */
export function restPose(obj, after) {
  const keys = keysOf(obj);
  return after && keys.length ? keys[keys.length - 1] : basePose(obj);
}

/** How many particles the game needs for every point of the shape (an object that stands alone, played once). */
export const piecesOf = (obj) => planOf(obj).pieces.length;

/** An object the code generator can write the old, short way: no timing at all. (Its groups are not looked at here.) */
export const isPlain = (obj) => !(obj.start > 0) && !obj.fadeIn && !keysOf(obj).length && !(obj.repeat > 1);
