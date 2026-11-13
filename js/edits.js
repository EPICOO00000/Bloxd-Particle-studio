// Changes to the list of objects that involve more than one of them: groups,
// copies, mirror images, stretching time, keys from one object to another.
// Everything here works on the plain list (no page, no 3D view), so the tests
// can run it. The functions change the objects they are given and return the
// list in its new order; app.js keeps what was there before for Undo.

import {
  viewMatrix, mulAffine, poseOfView, poseAt, applyMatrix, rotationMatrix, IDENTITY,
  MAX_KEYS, MIN_KEY_GAP, MAX_START, MIN_EVERY, keyHasColor, keyHasSize,
} from './motion.js';
import { isGroup, createGroup, sceneTree, newId, localPoints, MAX_DEPTH } from './scene.js';

/** A scene holds this many objects and groups at most (more are dropped when a file is opened). */
export const MAX_OBJECTS = 500;

const round = (v, digits = 3) => Number(Number(v).toFixed(digits)) + 0; // (+ 0: never -0)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const clone = (v) => JSON.parse(JSON.stringify(v));
const startOf = (node) => (node.start > 0 ? node.start : 0);
const posesOf = (node) => [node, ...node.keys];

/** A name no other object has: "Ring", "Ring 2", "Ring 3" ... */
export function uniqueName(objects, base) {
  const names = new Set(objects.map((o) => o.name));
  if (!names.has(base)) return base;
  const stem = base.replace(/ \d+$/, '');
  for (let i = 2; ; i++) if (!names.has(`${stem} ${i}`)) return `${stem} ${i}`.slice(0, 40);
}

/** Of some chosen objects, those that are not inside another chosen one, in the order of the list. */
export function topNodes(objects, ids) {
  const tree = sceneTree(objects);
  const chosen = new Set(ids);
  return objects.filter((o) => chosen.has(o.id) && !tree.chainOf(o).some((g) => chosen.has(g.id)));
}

/** A node with everything in it. */
const withInside = (tree, node) => [node, ...tree.insideOf(node)];

/** The inverse of a 3x4 matrix, or null when it squashes everything flat. */
export function invAffine(m) {
  const [a, b, c, , d, e, f, , g, h, i] = m;
  const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  const r = [A, c * h - b * i, b * f - c * e, B, a * i - c * g, c * d - a * f, C, b * g - a * h, a * e - b * d].map((v) => v / det);
  const t = [m[3], m[7], m[11]];
  return [
    r[0], r[1], r[2], -(r[0] * t[0] + r[1] * t[1] + r[2] * t[2]),
    r[3], r[4], r[5], -(r[3] * t[0] + r[4] * t[1] + r[5] * t[2]),
    r[6], r[7], r[8], -(r[6] * t[0] + r[7] * t[1] + r[8] * t[2]),
  ];
}

const tidyPose = (pose) => ({
  pos: pose.pos.map((v) => round(clamp(v, -500, 500))),
  rot: pose.rot.map((v) => round(v, 2)),
  scale: pose.scale.map((v) => round(clamp(v, -100, 100), 4)),
});

/**
 * Put a node into another frame: every place it has (where it starts and each
 * key) becomes `m` times that place. `m` is a view-space matrix.
 */
function rebase(node, m) {
  const poses = posesOf(node);
  const pure = [0, 1, 2, 4, 5, 6, 8, 9, 10].every((k, n) => Math.abs(m[k] - (n % 4 === 0 ? 1 : 0)) < 1e-9);
  if (pure) { // only slid: the angles stay as they were typed
    for (const p of poses) p.pos = [p.pos[0] + m[3], p.pos[1] + m[7], p.pos[2] - m[11]].map((v) => round(clamp(v, -500, 500)));
    return;
  }
  if (node.shape === 'point') { // a single particle has a place and nothing else
    for (const p of poses) {
      const v = applyMatrix(m, [p.pos[0], p.pos[1], -p.pos[2]]);
      p.pos = [v[0], v[1], -v[2]].map((x) => round(clamp(x, -500, 500)));
    }
    return;
  }
  const typed = poses.map((p) => p.rot.slice());
  const out = poses.map((p) => poseOfView(mulAffine(m, viewMatrix(p))));
  if (node.spin) {
    // full turns are in the angles as typed: keep the differences where that gives the same turn
    for (let i = 1; i < out.length; i++) {
      const kept = out[0].rot.map((v, k) => v + typed[i][k] - typed[0][k]);
      const a = rotationMatrix(...kept);
      const b = rotationMatrix(...out[i].rot);
      if (a.every((v, k) => Math.abs(v - b[k]) < 1e-6)) out[i].rot = kept;
    }
  }
  poses.forEach((p, i) => Object.assign(p, tidyPose(out[i])));
}

/** How many groups deep the things in a node sit, counted from the node (0 for an object or an empty group). */
function depthBelow(tree, node) {
  const own = tree.chainOf(node).length;
  return Math.max(0, ...tree.insideOf(node).map((n) => tree.chainOf(n).length - own));
}

/** Every point of a node (with what is in it) as its group sees it, where everything starts. */
function pointsIn(tree, node) {
  const out = [];
  const walk = (n, around) => {
    const m = mulAffine(around, viewMatrix(n));
    if (!isGroup(n)) for (const l of n.shape === 'point' ? [[0, 0, 0]] : localPoints(n)) out.push(applyMatrix(m, l));
    else if (!tree.childrenOf(n).length) out.push([m[3], m[7], m[11]]);
    else for (const child of tree.childrenOf(n)) walk(child, m);
  };
  walk(node, IDENTITY);
  return out.map(([x, y, z]) => [x, y, -z]);
}

/** The list with some nodes (each with what is in it) taken out and put back in one run at a place. */
function regroup(objects, moving, anchor, lead = []) {
  const set = new Set(moving);
  const out = [];
  for (const o of objects) {
    if (o === anchor.before) out.push(...lead, ...moving);
    if (!set.has(o)) out.push(o);
    if (o === anchor.after) out.push(...lead, ...moving);
  }
  if (!anchor.before && !anchor.after) out.push(...lead, ...moving);
  return out;
}

/** Take objects (with all that is in them) out of the scene. */
export function removeNodes(objects, ids) {
  const tree = sceneTree(objects);
  const gone = new Set(topNodes(objects, ids).flatMap((n) => withInside(tree, n)));
  return objects.filter((o) => !gone.has(o));
}

/**
 * Move objects into a group (or out of all groups with `groupId` null). They
 * stay where they are at the start, and they start at the same moment as before.
 * Returns { objects } or { error }.
 */
export function moveInto(objects, ids, groupId) {
  const tree = sceneTree(objects);
  const target = groupId ? tree.byId.get(groupId) : null;
  if (groupId && !isGroup(target)) return { error: 'That group is not there any more.' };
  const tops = topNodes(objects, ids).filter((n) => tree.parentOf(n) !== target);
  if (!tops.length) return { objects };
  const levels = target ? tree.chainOf(target).length + 1 : 0;
  let inverse = IDENTITY;
  let origin = 0;
  if (target) {
    if (tops.some((n) => n === target || tree.chainOf(target).includes(n))) return { error: 'A group cannot be put into itself.' };
    if (tops.some((n) => levels + depthBelow(tree, n) > MAX_DEPTH)) return { error: `Groups can only be ${MAX_DEPTH} deep.` };
    inverse = invAffine(mulAffine(tree.aroundOf(target, -Infinity), viewMatrix(target)));
    if (!inverse) return { error: `${target.name} is squashed flat (a size of 0). Give it a size first.` };
    origin = tree.originOf(target) + startOf(target);
  }
  const moving = tops.flatMap((n) => withInside(tree, n));
  for (const node of tops) {
    rebase(node, mulAffine(inverse, tree.aroundOf(node, -Infinity)));
    node.start = round(clamp(tree.originOf(node) + startOf(node) - origin, 0, MAX_START));
    node.parent = target ? target.id : null;
  }
  // listed last in the group (or last of all)
  const inside = new Set(target ? withInside(tree, target) : []);
  const last = objects.filter((o) => inside.has(o) && !moving.includes(o)).pop();
  return { objects: regroup(objects, moving, target ? { after: last } : {}) };
}

/**
 * Put objects into a new group. The group takes the place of the first of them
 * in the list, and its pivot (the point it turns about) is the middle of them.
 * Returns { objects, id } or { error }.
 */
export function groupNodes(objects, ids, name = 'Group') {
  let tree = sceneTree(objects);
  const tops = topNodes(objects, ids);
  if (!tops.length) return { error: 'Select the objects for the group first.' };
  if (objects.length >= MAX_OBJECTS) return { error: `A scene can hold ${MAX_OBJECTS} objects and groups.` };
  const parent = tree.parentOf(tops[0]);
  const levels = parent ? tree.chainOf(parent).length + 1 : 0;
  if (tops.some((n) => levels + 1 + depthBelow(tree, n) > MAX_DEPTH)) return { error: `Groups can only be ${MAX_DEPTH} deep.` };
  const first = tops[0];
  // those from somewhere else come to where the first one is
  const moved = moveInto(objects, tops.filter((n) => tree.parentOf(n) !== parent).map((n) => n.id), parent ? parent.id : null);
  if (moved.error) return moved;
  tree = sceneTree(moved.objects);
  const points = tops.flatMap((n) => pointsIn(tree, n));
  const pivot = [0, 1, 2].map((k) => round((Math.min(...points.map((p) => p[k])) + Math.max(...points.map((p) => p[k]))) / 2, 2));
  const group = createGroup({ name: uniqueName(objects, name), parent: parent ? parent.id : null, pos: pivot });
  const moving = tops.flatMap((n) => withInside(tree, n));
  for (const node of tops) {
    for (const p of posesOf(node)) p.pos = p.pos.map((v, k) => round(v - pivot[k]));
    node.parent = group.id;
  }
  return { objects: regroup(moved.objects, moving, { before: first }, [group]), id: group.id };
}

/**
 * Take a group apart: what was in it stays where it is at the start and goes
 * to the group around it. What the group itself did (its keys, its repeats) is gone.
 * Returns { objects, ids } (ids: what was in it).
 */
export function ungroup(objects, id) {
  const tree = sceneTree(objects);
  const group = tree.byId.get(id);
  if (!isGroup(group)) return { objects, ids: [] };
  const parent = tree.parentOf(group);
  const children = tree.childrenOf(group);
  const m = viewMatrix(group);
  for (const child of children) {
    rebase(child, m);
    child.start = round(clamp(startOf(child) + startOf(group), 0, MAX_START));
    child.parent = parent ? parent.id : null;
    if (group.hidden) child.hidden = true;
  }
  return { objects: objects.filter((o) => o !== group), ids: children.map((c) => c.id) };
}

/** Copies of nodes with all that is in them, each right after its original. Returns { objects, ids, copies } or { error }. */
function copyNodes(objects, ids) {
  const tree = sceneTree(objects);
  const tops = topNodes(objects, ids);
  const sets = tops.map((n) => withInside(tree, n));
  if (objects.length + sets.reduce((n, s) => n + s.length, 0) > MAX_OBJECTS) return { error: `A scene can hold ${MAX_OBJECTS} objects and groups.` };
  let out = objects.slice();
  const copies = [];
  for (const set of sets) {
    const fresh = new Map(set.map((n) => [n.id, newId()]));
    const made = set.map((n) => ({ ...clone(n), id: fresh.get(n.id), parent: fresh.get(n.parent) || n.parent }));
    made[0].name = uniqueName(out, made[0].name);
    const last = Math.max(...set.map((n) => out.indexOf(n)));
    out = [...out.slice(0, last + 1), ...made, ...out.slice(last + 1)];
    copies.push(made[0]);
  }
  return { objects: out, ids: copies.map((c) => c.id), copies };
}

/** Copies next to the originals (one block along X). Returns { objects, ids } or { error }. */
export function duplicateNodes(objects, ids, shift = [1, 0, 0]) {
  const result = copyNodes(objects, ids);
  if (result.error) return result;
  for (const copy of result.copies) for (const p of posesOf(copy)) p.pos = p.pos.map((v, k) => round(clamp(v + shift[k], -500, 500)));
  return { objects: result.objects, ids: result.ids };
}

/** The words for the two sides of each mirror: across X, Y and Z. */
const SIDES = [
  [['left', 'right'], ['Left', 'Right'], ['LEFT', 'RIGHT']],
  [['top', 'bottom'], ['Top', 'Bottom'], ['upper', 'lower'], ['Upper', 'Lower']],
  [['front', 'back'], ['Front', 'Back']],
];
/** "Left wing" -> "Right wing" for a mirror across X; a name without a side stays. */
function otherSide(name, axis) {
  for (const [a, b] of SIDES[axis]) {
    const hit = new RegExp(`\\b(${a}|${b})\\b`).exec(name);
    if (hit) return name.replace(hit[0], hit[0] === a ? b : a);
  }
  return name;
}

/**
 * Mirror copies: a twin of each object on the other side. `axis`: 0 left and
 * right (X), 1 up and down (Y), 2 front and back (Z). The mirror stands in the
 * middle of the group the object is in (the group's pivot). Outside a group it
 * stands in the middle of the code block; up and down there turns the copy
 * upside down where it is.
 * Returns { objects, ids } or { error }.
 */
export function mirrorNodes(objects, ids, axis = 0) {
  const tree = sceneTree(objects);
  const result = copyNodes(objects, ids);
  if (result.error) return result;
  const originals = topNodes(objects, ids);
  result.copies.forEach((copy, n) => {
    const original = originals[n];
    const at = tree.parentOf(original) ? 0 : axis === 1 ? original.pos[1] : 0.5;
    for (const p of posesOf(copy)) {
      p.pos = p.pos.map((v, k) => (k === axis ? round(clamp(2 * at - v, -500, 500)) : v));
      if (copy.shape === 'point') continue;
      p.rot = p.rot.map((v, k) => (k === axis ? v : round(-v, 2)));
      p.scale = p.scale.map((v, k) => (k === axis ? -v + 0 : v));
    }
    if (copy.move) copy.move = copy.move.map((v, k) => (k === axis ? -v + 0 : v));
    const named = otherSide(original.name, axis);
    copy.name = named === original.name ? copy.name : uniqueName(result.objects.filter((o) => o !== copy), named);
  });
  return { objects: result.objects, ids: result.ids };
}

/**
 * Make everything some nodes do take `factor` times as long: the same show,
 * slower (above 1) or faster (below 1). With `ids` null the whole scene; a
 * chosen node still starts at the moment it did. What flies (Move, Scatter,
 * Grow, Gravity) is slowed down or sped up to match, so it flies the same way.
 * Returns the factor that was used: keys cannot come closer than 0.1 seconds.
 */
export function stretchNodes(objects, ids, factor) {
  const tree = sceneTree(objects);
  const tops = ids ? new Set(topNodes(objects, ids)) : null;
  const nodes = tops ? [...new Set([...tops].flatMap((n) => withInside(tree, n)))] : objects;
  let lo = 1e-3;
  let hi = 1e3;
  for (const node of nodes) {
    let before = 0;
    for (const key of node.keys) {
      lo = Math.max(lo, (MIN_KEY_GAP + 0.001) / (key.t - before));
      before = key.t;
    }
    if (before > 0) hi = Math.min(hi, 6000 / before);
    if (!isGroup(node)) {
      lo = Math.max(lo, 0.05 / node.life);
      hi = Math.min(hi, 1000 / node.life);
    }
    if (startOf(node) > 0 && !(tops && tops.has(node))) hi = Math.min(hi, MAX_START / node.start);
  }
  const f = Number.isFinite(factor) && factor > 0 && lo <= hi ? clamp(factor, lo, hi) : 1;
  if (Math.abs(f - 1) < 1e-9) return 1;
  for (const node of nodes) {
    if (!(tops && tops.has(node))) node.start = round(clamp(startOf(node) * f, 0, MAX_START));
    for (const key of node.keys) key.t = round(key.t * f);
    node.every = round(clamp(node.every * f, MIN_EVERY, 600));
    if (isGroup(node)) continue;
    node.life = round(clamp(node.life * f, 0.05, 1000), 4);
    node.move = node.move.map((v) => round(clamp(v / f, -100, 100), 4));
    node.spread = round(clamp(node.spread / f, 0, 100), 4);
    node.expand = round(clamp(node.expand / f, -100, 100), 4);
    node.gravity = round(clamp(node.gravity / (f * f), -500, 500), 4);
  }
  return f;
}

/**
 * Get a node ready for a move that begins `at` seconds after it starts: its
 * later keys go, and a key is put there to hold the place it has by then.
 * Returns { t0, ref, kept }: when the move begins, the place it begins from
 * and how many keys the node has left.
 */
export function beginAt(node, at) {
  let t0 = at >= MIN_KEY_GAP ? round(at) : 0;
  const near = node.keys.find((k) => Math.abs(k.t - t0) < MIN_KEY_GAP - 1e-9);
  if (near) t0 = near.t;
  const ref = tidyPose(poseAt(node, t0));
  const next = node.keys.find((k) => k.t > t0 + 1e-9);
  node.keys = node.keys.filter((k) => k.t <= t0 + 1e-9);
  if (t0 > 0 && !near) node.keys.push({ t: t0, ...clone(ref), ease: next ? next.ease : 'linear' });
  return { t0, ref, kept: node.keys.length };
}

/** How many keys a node keeps when a move begins `at` seconds after it starts (see beginAt). */
export function keptKeys(node, at) {
  const probe = { keys: clone(node.keys), pos: node.pos, rot: node.rot, scale: node.scale, spin: node.spin };
  return beginAt(probe, at).kept;
}

/** Remember what a node does (its keys), to give it to another one. null when it has no keys. */
export function copyKeys(node) {
  if (!node || !node.keys.length) return null;
  return {
    name: node.name, spin: !!node.spin, base: clone({ pos: node.pos, rot: node.rot, scale: node.scale }), keys: clone(node.keys),
  };
}

/**
 * Give a node the keys remembered by copyKeys(): the same moves, turns and
 * changes of size, but starting from the place the node has `at` seconds after
 * it starts. Its keys after that moment are replaced.
 * Returns { ok, message }.
 */
export function pasteKeys(node, clip, at = 0) {
  if (!clip || !clip.keys.length) return { ok: false, message: 'No keys copied yet. Select an object that moves and press Copy keys.' };
  const kept = keptKeys(node, at);
  if (kept + clip.keys.length > MAX_KEYS) {
    return { ok: false, message: `That would make ${kept + clip.keys.length} keys. An object can have ${MAX_KEYS}: paste earlier, or remove keys first.` };
  }
  const { t0, ref } = beginAt(node, at);
  const point = node.shape === 'point';
  const leaf = !isGroup(node);
  for (const key of clip.keys) {
    const made = {
      t: round(t0 + key.t),
      ...tidyPose({
        pos: ref.pos.map((v, k) => v + key.pos[k] - clip.base.pos[k]),
        rot: point ? ref.rot : ref.rot.map((v, k) => v + key.rot[k] - clip.base.rot[k]),
        scale: point ? ref.scale : ref.scale.map((v, k) => (Math.abs(clip.base.scale[k]) > 1e-9 ? (v * key.scale[k]) / clip.base.scale[k] : v)),
      }),
      ease: key.ease,
    };
    if (leaf && keyHasColor(key)) Object.assign(made, { color: key.color, color2: key.color2 || null });
    if (leaf && keyHasSize(key)) Object.assign(made, { size: key.size, size2: key.size2 ?? null });
    node.keys.push(made);
  }
  if (clip.spin && !point) node.spin = true;
  return { ok: true, message: `${clip.keys.length} key${clip.keys.length === 1 ? '' : 's'} of ${clip.name} pasted.` };
}

/**
 * Move the pivot of a group (the point it turns about and is resized from)
 * without moving what is in it. `pos`: the new pivot, as the group around it sees it.
 * Returns false when the group is squashed flat and has no way back.
 */
export function movePivot(objects, id, pos) {
  const tree = sceneTree(objects);
  const group = tree.byId.get(id);
  if (!isGroup(group)) return false;
  const before = viewMatrix(group);
  const to = pos.map((v) => round(clamp(v, -500, 500)));
  const shift = to.map((v, k) => v - group.pos[k]);
  const moved = { ...group, pos: to };
  const inverse = invAffine(viewMatrix(moved));
  if (!inverse) return false;
  group.pos = to;
  for (const key of group.keys) key.pos = key.pos.map((v, k) => round(clamp(v + shift[k], -500, 500)));
  const m = mulAffine(inverse, before);
  for (const child of tree.childrenOf(group)) rebase(child, m);
  return true;
}
