// Ready-made moves: a few keys worked out for you. A move starts from the place
// the object has at the time marker and replaces what it did after that moment.
// Like everything in edits.js this works on the plain list of objects.

import { MAX_KEYS, MIN_KEY_GAP, LIFE_PER_SECOND } from './motion.js';
import { isGroup, createGroup, sceneTree, MAX_DEPTH } from './scene.js';
import { beginAt, keptKeys, uniqueName, MAX_OBJECTS } from './edits.js';

const round = (v, digits = 3) => Number(Number(v).toFixed(digits)) + 0;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const AXES = ['X', 'Y', 'Z'];

/** The settings a move can have. Every move has `seconds` (one go) and most have `times` (how many goes). */
const FIELDS = {
  angle: { label: 'Angle', unit: 'degrees', min: 1, max: 180, step: 5 },
  amount: { label: 'Bigger by', unit: '%', min: 5, max: 500, step: 5 },
  height: { label: 'Height', unit: 'blocks', min: 0.05, max: 100, step: 0.25 },
  reach: { label: 'How far', unit: 'blocks', min: 0.02, max: 20, step: 0.05 },
  wide: { label: 'Circle', unit: 'blocks wide', min: 0.2, max: 400, step: 0.5 },
};

const withAngle = (rot, axis, degrees) => rot.map((v, k) => (k === axis ? round(v + degrees, 2) : v));
const lifted = (pos, by) => [pos[0], round(pos[1] + by), pos[2]];
const WAYS = [[1, 0.4, 0], [-0.3, 1, 0.5], [0.6, -0.5, -1], [-1, 0.2, 0.6], [0.4, 0.9, -0.7]].map((v) => v.map((x) => x / Math.hypot(...v)));

/**
 * The moves. `keys(ref, o, go)`: the keys of one go as [{ at (part of the go, 0 to 1), ...what changes, ease }],
 * `ref` being the place it starts from. `after`: keys that follow the last go. `once`: it has no "how often".
 * `whole`: one key does all the goes. `shaped`: it turns or resizes, which a single particle does not show.
 */
export const MOVES = [
  {
    id: 'flap', name: 'Flap', about: 'Swings out and back, like a wing. A group swings about its pivot.',
    seconds: 0.8, times: 3, shaped: true, fields: { angle: 35, axis: 2 },
    keys: (ref, o) => [
      { at: 0.5, rot: withAngle(ref.rot, o.axis, o.angle), ease: 'smooth' },
      { at: 1, rot: ref.rot, ease: 'smooth' },
    ],
  },
  {
    id: 'pulse', name: 'Pulse', about: 'Grows and shrinks back, like a heartbeat.',
    seconds: 0.8, times: 3, shaped: true, fields: { amount: 30 },
    keys: (ref, o) => [
      { at: 0.5, scale: ref.scale.map((v) => round(v * (1 + o.amount / 100), 4)), ease: 'smooth' },
      { at: 1, scale: ref.scale, ease: 'smooth' },
    ],
  },
  {
    id: 'spin', name: 'Spin', about: 'Turns round and round at a steady pace.',
    seconds: 2, times: 2, maxTimes: 50, whole: true, shaped: true, fields: { axis: 1 },
    keys: (ref, o) => [{ at: 1, rot: withAngle(ref.rot, o.axis, 360 * o.times), ease: 'linear' }],
    then: (node) => { node.spin = true; },
  },
  {
    id: 'orbit', name: 'Orbit', about: 'Circles around a point next to it. This puts it in a group that turns; move the pivot of that group to move the middle of the circle.',
    seconds: 3, times: 2, maxTimes: 50, fields: { wide: 4, axis: 1 },
  },
  {
    id: 'shake', name: 'Shake', about: 'Trembles on the spot.',
    seconds: 0.2, times: 4, fields: { reach: 0.15 },
    keys: (ref, o, go) => [1, -1].map((side, n) => ({
      at: (n + 1) / 2, pos: ref.pos.map((v, k) => round(v + side * o.reach * WAYS[go % WAYS.length][k])), ease: 'linear',
    })),
    after: (ref, o) => [{ dt: o.seconds / 2, pos: ref.pos, ease: 'linear' }],
  },
  {
    id: 'bounce', name: 'Bounce', about: 'Jumps up and falls back.',
    seconds: 0.8, times: 3, fields: { height: 1 },
    keys: (ref, o) => [
      { at: 0.5, pos: lifted(ref.pos, o.height), ease: 'out' },
      { at: 1, pos: ref.pos, ease: 'in' },
    ],
  },
  {
    id: 'float', name: 'Float', about: 'Drifts gently up and down.',
    seconds: 2.4, times: 2, fields: { height: 0.4 },
    keys: (ref, o) => [
      { at: 0.5, pos: lifted(ref.pos, o.height), ease: 'smooth' },
      { at: 1, pos: ref.pos, ease: 'smooth' },
    ],
  },
  {
    id: 'rise', name: 'Rise and fade', about: 'Drifts up and fades away, like smoke. With Repeat (under Time) it keeps coming.',
    seconds: 2, once: true, leaf: true, fields: { height: 3 },
    keys: (ref, o) => [{ at: 1, pos: lifted(ref.pos, o.height), ease: 'out' }],
    then: (node, o, t0) => {
      node.fade = true;
      node.life = round(clamp((t0 + o.seconds) * LIFE_PER_SECOND, 0.05, 1000), 4); // gone when it is up
    },
  },
];

export const MOVE_BY_ID = Object.fromEntries(MOVES.map((m) => [m.id, m]));

/** The settings of a move as the page shows them: [{ key, label, unit, min, max, step, value, options? }]. */
export function moveFields(move) {
  // (keys are 0.1 seconds apart at least, and a go has two of them)
  const least = move.once || move.whole || !move.keys ? 0.1 : 0.2;
  const out = [{ key: 'seconds', label: move.once ? 'Takes' : move.id === 'spin' ? 'One turn takes' : move.id === 'orbit' ? 'One round takes' : 'One go takes', unit: 'seconds', min: least, max: 600, step: 0.1, value: move.seconds }];
  if (!move.once) out.push({ key: 'times', label: move.id === 'spin' ? 'Turns' : move.id === 'orbit' ? 'Rounds' : 'How often', unit: 'times', min: 1, max: move.maxTimes || 6, step: 1, value: move.times });
  for (const [key, value] of Object.entries(move.fields)) {
    if (key === 'axis') out.push({ key, label: 'Around', options: AXES.map((name, id) => ({ id, name })), value });
    else out.push({ key, ...FIELDS[key], value });
  }
  return out;
}

/** The settings with everything in range. */
function settingsOf(move, raw = {}) {
  const o = {};
  for (const f of moveFields(move)) {
    const v = Number(raw[f.key]);
    if (f.options) o[f.key] = f.options.some((x) => x.id === v) && raw[f.key] !== undefined ? v : f.value;
    else o[f.key] = Number.isFinite(v) && raw[f.key] !== undefined && raw[f.key] !== '' ? clamp(v, f.min, f.max) : f.value;
  }
  if (o.times !== undefined) o.times = Math.round(o.times);
  if (o.times === undefined) o.times = 1;
  return o;
}

/** How often a move fits into the keys a node has left when it begins `at` seconds after the node starts. */
export function mostTimes(node, move, at = 0) {
  if (!move.keys) return move.maxTimes; // Orbit: the keys are those of a new group
  const o = settingsOf(move);
  const ref = { pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] };
  const perGo = move.keys(ref, o, 0).length;
  const extra = move.after ? move.after(ref, o).length : 0;
  const free = MAX_KEYS - keptKeys(node, at) - extra;
  if (move.once || move.whole) return free >= perGo ? move.maxTimes || 1 : 0;
  return Math.max(0, Math.min(move.maxTimes || 6, Math.floor(free / perGo)));
}

/**
 * Give a node a ready-made move, starting `at` seconds after it starts.
 * Returns { ok, message, objects } (objects: the list, which Orbit adds a group to).
 */
export function applyMove(objects, id, moveId, raw = {}, at = 0) {
  const move = MOVE_BY_ID[moveId];
  const node = objects.find((o) => o.id === id);
  if (!move || !node) return { ok: false, message: 'Select an object first.', objects };
  if (move.leaf && isGroup(node)) return { ok: false, message: `${move.name} is for objects, not for groups: a group cannot fade.`, objects };
  if (move.shaped && node.shape === 'point') {
    return { ok: false, message: `${move.name} turns or resizes a shape, and a single particle looks the same from every side. Try Bounce, Float, Shake or Orbit.`, objects };
  }
  const o = settingsOf(move, raw);
  if (move.id === 'orbit') return orbit(objects, node, o, at);

  const most = mostTimes(node, move, at);
  if (o.times > most) {
    return {
      ok: false, objects,
      message: most > 0
        ? `Only ${most} time${most === 1 ? '' : 's'} fit: an object can have ${MAX_KEYS} keys. For more, use Repeat under Time.`
        : `${node.name} has no keys left for this (an object can have ${MAX_KEYS}). Start the move earlier or remove keys.`,
    };
  }
  const { t0, ref } = beginAt(node, at);
  const hold = { pos: ref.pos.slice(), rot: ref.rot.slice(), scale: ref.scale.slice() };
  const push = (t, change) => node.keys.push({ t: round(t), ...hold, ...JSON.parse(JSON.stringify(change)) });
  let t = t0;
  if (move.whole) {
    // one key for all the goes
    for (const { at: part, ...change } of move.keys(ref, o, 0)) push(t0 + part * o.seconds * o.times, change);
  } else {
    for (let go = 0; go < o.times; go++) {
      for (const { at: part, ...change } of move.keys(ref, o, go)) push(t + part * o.seconds, change);
      t += o.seconds;
    }
    for (const { dt, ...change } of move.after ? move.after(ref, o) : []) push(t += dt, change);
  }
  if (move.then) move.then(node, o, t0);
  return { ok: true, objects, message: `${move.name}: ${node.name} now has ${node.keys.length} key${node.keys.length === 1 ? '' : 's'}.` };
}

/** Orbit: the node goes into a new group that turns about a point next to it. */
function orbit(objects, node, o, at) {
  const tree = sceneTree(objects);
  if (objects.length >= MAX_OBJECTS) return { ok: false, objects, message: `A scene can hold ${MAX_OBJECTS} objects and groups.` };
  const below = Math.max(0, ...tree.insideOf(node).map((n) => tree.chainOf(n).length)) - tree.chainOf(node).length;
  if (tree.chainOf(node).length + 1 + Math.max(0, below) > MAX_DEPTH) return { ok: false, objects, message: `Groups can only be ${MAX_DEPTH} deep.` };
  // the middle of the circle: beside it, or below it for a circle that stands upright around X
  const off = o.axis === 0 ? [0, o.wide / 2, 0] : [o.wide / 2, 0, 0];
  const centre = node.pos.map((v, k) => round(v - off[k]));
  const t0 = at >= MIN_KEY_GAP ? round(at) : 0;
  const turn = [0, 0, 0].map((v, k) => (k === o.axis ? 360 * o.times : 0));
  const still = { pos: centre, rot: [0, 0, 0], scale: [1, 1, 1] };
  const group = createGroup({
    name: uniqueName(objects, `${node.name} orbit`.slice(0, 40)), parent: node.parent, pos: centre, start: node.start, spin: true,
    keys: [
      ...(t0 > 0 ? [{ t: t0, ...still, ease: 'linear' }] : []),
      { t: round(t0 + o.seconds * o.times), ...still, rot: turn, ease: 'linear' },
    ],
  });
  for (const p of [node, ...node.keys]) p.pos = p.pos.map((v, k) => round(v - centre[k]));
  node.start = 0;
  node.parent = group.id;
  // it has to last until the last round is over
  if (!isGroup(node)) node.life = round(Math.max(node.life, (t0 + o.seconds * o.times) * LIFE_PER_SECOND), 4);
  const out = objects.slice();
  out.splice(out.indexOf(node), 0, group);
  return {
    ok: true, objects: out, group: group.id,
    message: `${node.name} now circles in the group "${group.name}". To move the middle of the circle, select that group and move its pivot.`,
  };
}
