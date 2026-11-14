// Ready-made moves: a few keys worked out for you. A move starts from the place
// the object has at the time marker and replaces what it did after that moment.
// Like everything in edits.js this works on the plain list of objects.

import { MAX_KEYS, MIN_KEY_GAP, LIFE_PER_SECOND, staySeconds } from './motion.js';
import { isGroup, createGroup, sceneTree, MAX_DEPTH } from './scene.js';
import { beginAt, endAt, keptKeys, uniqueName, MAX_OBJECTS } from './edits.js';

const round = (v, digits = 3) => Number(Number(v).toFixed(digits)) + 0;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const clone = (v) => JSON.parse(JSON.stringify(v));
const EPS = 1e-6;
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
 * `shaped`: it turns or resizes, which a single particle does not show. `fades`: when it is over the object is
 * gone. A group has no particles to fade, so there the objects in it do (fadeInside).
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
    id: 'spin', name: 'Spin', about: 'Turns round and round at a steady pace: one key for every full turn.',
    seconds: 2, times: 2, maxTimes: 12, shaped: true, fields: { axis: 1 },
    keys: (ref, o, go) => [{ at: 1, rot: withAngle(ref.rot, o.axis, 360 * (go + 1)), ease: 'linear' }],
    then: (node) => { node.spin = true; },
  },
  {
    id: 'orbit', name: 'Orbit', about: 'Circles around a point next to it. This puts it in a group that turns; move the pivot of that group to move the middle of the circle.',
    seconds: 3, times: 2, maxTimes: 10, fields: { wide: 4, axis: 1 },
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
    id: 'rise', name: 'Rise and fade', about: 'Drifts up and fades away, like smoke. With Repeat (under Time) it keeps coming. A group goes up as one, and the objects in it fade.',
    seconds: 2, once: true, fades: true, fields: { height: 3 },
    keys: (ref, o) => [{ at: 1, pos: lifted(ref.pos, o.height), ease: 'out' }],
    then: (node, o, t0) => {
      if (isGroup(node)) return; // (fadeInside sees to what is in it)
      node.fade = true;
      node.life = round(clamp((t0 + o.seconds) * LIFE_PER_SECOND, 0.05, 1000), 4); // gone when it is up
    },
  },
];

export const MOVE_BY_ID = Object.fromEntries(MOVES.map((m) => [m.id, m]));

/** The settings of a move as the page shows them: [{ key, label, unit, min, max, step, value, options? }]. */
export function moveFields(move) {
  // (keys are 0.1 seconds apart at least, and a go has two of them)
  const least = move.once || !move.keys || move.id === 'spin' ? 0.1 : 0.2;
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
  if (move.once) return free >= perGo ? 1 : 0;
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
  // (worked out before anything is changed, so that a "no" leaves everything as it was)
  const inside = move.fades && isGroup(node) ? fadeInside(objects, node, at, o.seconds) : null;
  if (inside && !inside.ok) return { ok: false, objects, message: inside.message };
  const { t0, ref } = beginAt(node, at);
  const hold = { pos: ref.pos.slice(), rot: ref.rot.slice(), scale: ref.scale.slice() };
  const push = (t, change) => node.keys.push({ t: round(t), ...hold, ...JSON.parse(JSON.stringify(change)) });
  let t = t0;
  for (let go = 0; go < o.times; go++) {
    for (const { at: part, ...change } of move.keys(ref, o, go)) push(t + part * o.seconds, change);
    t += o.seconds;
  }
  for (const { dt, ...change } of move.after ? move.after(ref, o) : []) push(t += dt, change);
  if (move.then) move.then(node, o, t0);
  const message = `${move.name}: ${node.name} now has ${node.keys.length} key${node.keys.length === 1 ? '' : 's'}.`;
  return { ok: true, objects, message: inside ? `${message} ${inside.apply()}` : message };
}

/**
 * A move that fades, on a group. A group has no particles, so it cannot fade:
 * the objects in it do, at any depth. This works out what each of them needs
 * so that nothing is left when the group is up, `seconds` after the move begins:
 *   - what is there when the move begins lasts until the group is up, however
 *     long it lasted before (as an object does that is given the move itself);
 *   - what appears on the way, or is played more than once, keeps the time it
 *     has, but is cut off when the group is up (the last time it is played);
 *   - what is over before the move begins, or only comes when the group is up,
 *     is not changed.
 * All of them get Fade out. What they did until then stays as it was.
 * Returns { ok: false, message } when nothing in the group can fade, else
 * { ok: true, apply() }: apply() makes the changes and returns a sentence about them.
 */
function fadeInside(objects, group, at, seconds) {
  const tree = sceneTree(objects);
  const leaves = tree.leavesOf(group);
  if (!leaves.length) return { ok: false, message: `There is nothing in ${group.name} to fade. Put objects into the group first.` };
  const t0 = beginAt({ ...group, keys: clone(group.keys) }, at).t0; // (a copy: nothing is changed yet)
  const end = round(t0 + seconds);
  const todo = [];
  let others = 0;
  for (const leaf of leaves) {
    // when it is played, on the clock of the group (the same every time the group is played)
    const starts = tree.playsOf(leaf).map((play) => play.start - (play.ancestors.find((a) => a.node === group) || { start: 0 }).start);
    const first = Math.min(...starts);
    const last = Math.max(...starts);
    const stay = staySeconds(leaf);
    const until = round(end - last);
    if (until < MIN_KEY_GAP || last + stay < t0 - EPS) {
      others++;
      continue;
    }
    const there = last - first < EPS && first <= t0 + EPS;
    todo.push({ leaf, stay: there ? until : Math.min(stay, until) });
  }
  if (!todo.length) {
    return { ok: false, message: `Nothing in ${group.name} is there between ${round(t0, 2)} and ${round(end, 2)} seconds. Move the time marker to a moment when you can see it, or make the move take longer.` };
  }
  return {
    ok: true,
    apply() {
      for (const { leaf, stay } of todo) {
        leaf.fade = true;
        if (Math.abs(stay - staySeconds(leaf)) < EPS) continue;
        endAt(leaf, stay);
        leaf.life = round(clamp(stay * LIFE_PER_SECOND, 0.05, 1000), 4);
      }
      const n = todo.length;
      const told = `${n} object${n === 1 ? '' : 's'} in it fade${n === 1 ? 's' : ''} away as it goes up.`;
      return others ? `${told} Not changed: ${others} that ${others === 1 ? 'is' : 'are'} over before it begins or come${others === 1 ? 's' : ''} after it.` : told;
    },
  };
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
  const still = { pos: centre, rot: [0, 0, 0], scale: [1, 1, 1] };
  // a key for every round (the angles are taken as typed: 360, 720 ...)
  const rounds = Array.from({ length: o.times }, (_, n) => ({
    t: round(t0 + o.seconds * (n + 1)), ...still, rot: [0, 0, 0].map((v, k) => (k === o.axis ? 360 * (n + 1) : 0)), ease: 'linear',
  }));
  const group = createGroup({
    name: uniqueName(objects, `${node.name} orbit`.slice(0, 40)), parent: node.parent, pos: centre, start: node.start, spin: true,
    keys: [...(t0 > 0 ? [{ t: t0, ...still, ease: 'linear' }] : []), ...rounds],
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
