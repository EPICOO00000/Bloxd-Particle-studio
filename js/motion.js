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
function eulerOf(m) {
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
 */
export function markAt(obj, time) {
  const keys = keysOf(obj);
  if (!keys.length) return { at: 'object' };
  const { start, end } = spanOf(obj);
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

/** Visibility of one piece over its whole life, as a curve. */
function visibilityCurve(piece, plan) {
  const { show, end } = piece;
  const life = plan.a1 - plan.a0;
  const marks = [];
  if (plan.fadeIn) marks.push(plan.a0 + FADE_IN_END * life);
  if (plan.fadeOut) marks.push(plan.a0 + FADE_START * life);
  const bends = marks.filter((m) => m > show + EPS && m < end - EPS);
  const first = envelope(plan, show);
  const last = envelope(plan, end);
  if (!bends.length && first === last) {
    // the same all its life: switched on at once, by a last stop
    return show > TINY ? [[0, 0], [show - TINY, 0], [show, first]] : [[0, first]];
  }
  const stops = [];
  if (show <= TINY) stops.push([0, first]);
  else if (first === 0) stops.push([0, 0], [show, 0]); // fades in from nothing: no switch needed
  else stops.push([0, 0], [show - Math.min(SWITCH, show), 0], [show, first]);
  for (const m of bends) stops.push([m, envelope(plan, m)]);
  stops.push([end, last]);
  return guard(tidy(stops));
}

const signature = (obj) => JSON.stringify([
  obj.shape === 'point', startOf(obj), obj.life, !!obj.fade, !!obj.fadeIn, obj.blend, !!obj.spin,
  obj.pos, obj.rot, obj.scale, obj.move, obj.spread, obj.expand, obj.gravity,
  keysOf(obj).map((k) => [k.t, k.pos, k.rot, k.scale, k.ease]),
]);

const plans = new WeakMap();

/**
 * Everything the particles of an object do, in terms the game understands.
 *
 * returns {
 *   a0, a1  : age at which the object appears and is gone
 *   rough   : '' when every turn could be cut finely enough. Else what would help:
 *             'quick' (a turn needs more time) or 'big' (a turn needs a key halfway)
 *   pieces  : [{
 *     show, end : age from which it is seen, and at which it dies (its lifetime)
 *     P         : 3x4 matrix, point of the shape -> where the particle is made
 *     V         : 3x4 matrix, point of the shape -> its direction; null: stands still
 *     g, ref    : free flight only: the pull on it (a vector), counted from age `ref`
 *     spread    : random extra speed on every axis (plus or minus)
 *     speed     : curve of its velocity factor (never above 1)
 *     visible   : curve of its visibility
 *   }]
 * }
 * A particle of a piece is at  P*l + (V*l) * U + g * W  where l is its point of
 * the shape and [U, W] = curveIntegrals(speed, age, ref).
 */
export function planOf(obj) {
  const key = signature(obj);
  const known = plans.get(obj);
  if (known && known.key === key) return known.plan;
  const plan = buildPlan(obj);
  plans.set(obj, { key, plan });
  return plan;
}

function buildPlan(obj) {
  const point = obj.shape === 'point';
  const spin = !!obj.spin;
  const a0 = startOf(obj) * LIFE_PER_SECOND;
  const a1 = a0 + staySeconds(obj) * LIFE_PER_SECOND;
  const plan = { a0, a1, fadeIn: !!obj.fadeIn, fadeOut: !!obj.fade, rough: '', pieces: [] };

  // stretches of time: nothing moves ('hold'), travel to a key ('move'), free flight ('fly')
  const poses = [basePose(obj), ...keysOf(obj)];
  const stretches = [];
  let at = a0;
  for (let i = 1; i < poses.length; i++) {
    const to = Math.min(a1, a0 + poses[i].t * LIFE_PER_SECOND);
    const same = samePose(poses[i - 1], poses[i], point, spin);
    if (poses[i].ease === 'jump' || same || to - at < 1e-6) {
      stretches.push({ kind: 'hold', from: at, to, pose: poses[i - 1], jump: !same });
    } else {
      stretches.push({ kind: 'move', from: at, to, a: poses[i - 1], b: poses[i], ease: poses[i].ease });
    }
    at = to;
  }
  const last = poses[poses.length - 1];
  const flies = obj.move.some((v) => v !== 0) || obj.spread > 0 || obj.expand !== 0 || obj.gravity !== 0;
  if (a1 - at > 1e-6 || !stretches.length) {
    stretches.push({ kind: flies ? 'fly' : 'hold', from: at, to: a1, pose: last, jump: false });
  }

  // Walk through the stretches. `since` is the age from which the next piece
  // has to show the object. `rest` is set after a move: from there on the
  // object stands at an exact place, which a piece of its own shows (a particle
  // that has travelled is only about where it should be on a slow device).
  let since = a0;
  let rest = null;
  const still = (pose, show, end) => plan.pieces.push({
    show, end, P: matrixOfPose(pose), V: null, g: null, ref: 0, spread: 0, speed: [[0, 1]],
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
        if (s.to - since > 1e-6) still(s.pose, since, s.to);
        since = s.to;
      }
      continue;
    }
    endRest(s.from);
    if (s.kind === 'fly') {
      const m = matrixOfPose(s.pose);
      // direction = move + expand * (place - centre), pull = gravity
      const V = m.map((v, i) => (i % 4 === 3 ? obj.move[(i - 3) / 4] : v * obj.expand));
      const late = s.from > TINY; // it waits, then sets off at once
      plan.pieces.push({
        show: since, end: a1, P: m, V, g: obj.gravity !== 0 ? [0, obj.gravity, 0] : null, spread: obj.spread,
        ref: late ? s.from : 0,
        speed: late ? [[0, 0], [s.from - TINY, 0], [s.from, 1]] : [[0, 1]],
      });
      since = a1;
      continue;
    }
    // a move
    const seen = since < s.from - EPS; // it is seen standing still before it sets off
    const curve = easeCurve(s.ease, s.from, s.to, seen);

    // From birth to the start of the move. A steady speed is switched on at
    // once. A curve that starts fast and slows down is reached by a run-up
    // nobody sees; `before` is how far that carries.
    const lead = [];
    let before = 0;
    if (s.from > TINY) {
      lead.push([0, 0]);
      if (s.ease === 'linear') lead.push([s.from - TINY, 0]);
      else if (curve[0][1] > 0) {
        const run = Math.min(RUNUP, s.from);
        if (run < s.from - TINY) lead.push([s.from - run, 0]);
        before = (curve[0][1] * run) / 2;
      }
    }
    const speed = tidy([...lead, ...curve]);

    // A turn is flown as straight stretches ("chords"). How many depends on the
    // size of the shape: the corners may be about 0.05 block off the true arc,
    // but no less than 1% and no more than 4% of its size.
    const turn = point ? 0 : spin ? Math.hypot(...sub(s.b.rot, s.a.rot)) : angleBetween(s.a.rot, s.b.rot);
    let chords = 1;
    let bulge = 1;
    if (turn > 0.01) {
      const size = 1.2 * Math.max(...s.a.scale.map(Math.abs), ...s.b.scale.map(Math.abs));
      const slack = Math.max(0.01, Math.min(0.04, 0.05 / Math.max(size, 1e-6)));
      const wanted = Math.ceil(turn / ((4 * Math.sqrt(slack)) / RAD) - 1e-9);
      const fastest = Math.max(...curve.map((stop) => stop[1])); // share of the way per age
      const inTime = Math.floor(1 / (fastest * MIN_CHORD_AGE) + 1e-9); // as many as there is time for
      chords = Math.max(1, Math.min(wanted, MAX_CHORDS, inTime));
      if (chords < wanted && plan.rough !== 'quick') plan.rough = inTime < Math.min(wanted, MAX_CHORDS) ? 'quick' : 'big';
      // Corners sit a little outside the arc, so that the stretches between
      // them run as far inside it as the corners are outside.
      bulge = 2 / (1 + Math.cos((Math.min(turn / chords, 120) * RAD) / 2));
    }
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
    rest = s.b;
  }
  endRest(a1);
  if (a1 - since > 1e-6 || !plan.pieces.length) still(last, since, a1);

  for (const piece of plan.pieces) {
    piece.visible = visibilityCurve(piece, plan);
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

/**
 * What a plan shows at an age: the pieces that can be seen, each with
 * u, w (see planOf) and how visible it is. Used by the preview.
 */
export function piecesAt(plan, age) {
  const out = [];
  for (const piece of plan.pieces) {
    if (age >= piece.end || age < piece.show - SWITCH) continue;
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

/** How many particles the game needs for every point of the shape. */
export const piecesOf = (obj) => planOf(obj).pieces.length;

/** An object the code generator can write the old, short way: no timing at all. */
export const isPlain = (obj) => !(obj.start > 0) && !obj.fadeIn && !keysOf(obj).length;
