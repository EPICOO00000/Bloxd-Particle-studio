// Tests for js/edits.js and js/moves.js: groups, copies, mirror images,
// stretching time, keys from one object to another, and the ready-made moves.
// The yardstick is the picture: where computeParticles() puts every particle.
// (That the game shows the same picture is the business of core.test.mjs.)
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import { createObject, createGroup, sanitizeScene, computeParticles, sceneTree, sceneDuration, isGroup } from '../js/scene.js';
import { spanOf, poseAt, MAX_KEYS, MIN_KEY_GAP } from '../js/motion.js';
import {
  groupNodes, ungroup, moveInto, duplicateNodes, mirrorNodes, stretchNodes, copyKeys, pasteKeys, movePivot, removeNodes,
  topNodes, uniqueName, invAffine, MAX_OBJECTS,
} from '../js/edits.js';
import { MOVES, MOVE_BY_ID, applyMove, mostTimes, moveFields } from '../js/moves.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
const key = (t, o = {}) => ({ t, pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth', ...o });
const scene = (...objects) => sanitizeScene({ objects }).objects;
const byId = (objects, id) => objects.find((o) => o.id === id);
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

/** Where every particle is: { 'id:index': [x, y, z] }. `time` null: the still picture. */
function picture(objects, time = null) {
  const out = {};
  for (const p of computeParticles(objects, time)) if (p.alpha > 0) out[`${p.id}:${p.index}`] = p.pos;
  return out;
}

/** Two pictures show the same thing. `map`: where a particle of the first should be in the second. */
function same(a, b, label, slack = 0.004, map = (pos) => pos, rename = (name) => name) {
  const names = Object.keys(a);
  if (rename('x:0') === 'x:0') assert.equal(Object.keys(b).length, names.length, `${label}: particles`);
  for (const name of names) {
    const there = b[rename(name)];
    assert.ok(there, `${label}: ${rename(name)} is missing`);
    const off = dist(map(a[name]), there);
    assert.ok(off <= slack, `${label}: ${name} is ${off.toFixed(4)} blocks off`);
  }
}

const TIMES = [null, 0.4, 1.1, 1.9, 2.6];

function someScene() {
  return scene(
    createObject('circle', { id: 'ring', name: 'Ring', count: 8, pos: [3, 2, 1], rot: [0, 30, 0], scale: [1.5, 1.5, 1.5] }),
    createObject('line', { id: 'line', name: 'Line', count: 5, pos: [-1, 4, 2], life: 1.2, keys: [key(1, { pos: [1, 5, 2], rot: [0, 0, 90] }), key(2.5, { pos: [1, 5, -2], scale: [2, 2, 2], ease: 'linear' })] }),
    createObject('point', { id: 'dot', name: 'Dot', pos: [0, 1, 0], start: 0.5 }),
    createObject('star', { id: 'star', name: 'Star', count: 10, pos: [6, 1, 0] }),
  );
}

test('edits: a group is made around what is selected, and nothing moves', () => {
  const objects = someScene();
  const before = TIMES.map((t) => picture(objects, t));
  assert.ok(before.every((shown) => Object.keys(shown).length > 5));
  const made = groupNodes(objects, ['dot', 'ring', 'line']);
  assert.ok(!made.error, made.error);
  const group = byId(made.objects, made.id);
  assert.ok(isGroup(group));
  assert.equal(group.name, 'Group');
  assert.deepEqual(made.objects.map((o) => o.id), [made.id, 'ring', 'line', 'dot', 'star'], 'the group is listed where the first one was, with them after it');
  for (const id of ['ring', 'line', 'dot']) assert.equal(byId(made.objects, id).parent, made.id);
  assert.equal(byId(made.objects, 'star').parent, null);
  assert.deepEqual(sanitizeScene({ objects: clone(made.objects) }).objects, made.objects, 'the result is a scene the studio would load as it is');
  TIMES.forEach((t, i) => same(before[i], picture(made.objects, t), `at ${t}`));
  // the pivot is the middle of what is in it (at the start)
  const points = Object.entries(before[0]).filter(([name]) => !name.startsWith('star')).map(([, pos]) => pos);
  const middle = [0, 1, 2].map((k) => (Math.min(...points.map((p) => p[k])) + Math.max(...points.map((p) => p[k]))) / 2);
  assert.ok(dist(group.pos, middle) < 0.01, `pivot ${group.pos}, middle ${middle.map((v) => v.toFixed(2))}`);

  // a second group gets a name of its own; a group can be grouped
  const outer = groupNodes(made.objects, [made.id, 'star'], 'Group');
  assert.equal(byId(outer.objects, outer.id).name, 'Group 2');
  assert.equal(byId(outer.objects, made.id).parent, outer.id);
  TIMES.forEach((t, i) => same(before[i], picture(outer.objects, t), `two deep, at ${t}`));

  // taking them apart again gives back what there was
  const flat = ungroup(ungroup(outer.objects, outer.id).objects, made.id);
  assert.deepEqual(flat.ids, ['ring', 'line', 'dot']);
  assert.ok(flat.objects.every((o) => !isGroup(o) && o.parent === null));
  TIMES.forEach((t, i) => same(before[i], picture(flat.objects, t), `apart again, at ${t}`));
  const first = someScene();
  for (const o of flat.objects) {
    const was = byId(first, o.id);
    assert.ok(dist(o.pos, was.pos) < 0.003 && o.start === was.start, `${o.name} is back where it was`);
  }
  assert.ok(groupNodes(objects, []).error, 'nothing selected');
});

test('edits: objects from different groups come together where the first one is', () => {
  const objects = scene(
    createGroup({ id: 'a', name: 'A', pos: [2, 1, 0], rot: [0, 45, 0], scale: [2, 2, 2], start: 1 }),
    createObject('circle', { id: 'in-a', count: 6, parent: 'a', pos: [1, 0, 0], start: 0.5, keys: [key(1, { pos: [1, 2, 0], rot: [90, 0, 0] })] }),
    createGroup({ id: 'b', name: 'B', pos: [-3, 2, 4], rot: [30, 0, 0] }),
    createObject('line', { id: 'in-b', count: 4, parent: 'b', pos: [0, 1, 0], start: 2 }),
    createObject('star', { id: 'free', count: 10, pos: [5, 5, 5], start: 3 }),
  );
  const times = [null, 1.7, 2.2, 2.8, 3.4];
  const before = times.map((t) => picture(objects, t));
  assert.ok(before.every((shown) => Object.keys(shown).length > 5));
  const made = groupNodes(objects, ['in-a', 'in-b', 'free']);
  assert.ok(!made.error, made.error);
  const group = byId(made.objects, made.id);
  assert.equal(group.parent, 'a', 'the new group is where the first of them was');
  for (const id of ['in-a', 'in-b', 'free']) assert.equal(byId(made.objects, id).parent, made.id);
  times.forEach((t, i) => same(before[i], picture(made.objects, t), `at ${t}`, 0.006));
  // everything still starts at the moment it did
  const tree = sceneTree(made.objects);
  assert.deepEqual(['in-a', 'in-b', 'free'].map((id) => Number(tree.span(byId(made.objects, id)).start.toFixed(3))), [1.5, 2, 3]);
});

test('edits: moving into a group and out again keeps the place and the moment', () => {
  const start = () => scene(
    createGroup({ id: 'g', name: 'Turned', pos: [2, 1, 0], rot: [20, 40, 60], scale: [2, 2, 2], start: 1.5 }),
    createObject('circle', { id: 'kid', count: 6, parent: 'g', pos: [1, 0, 0] }),
    createGroup({ id: 'inner', parent: 'g', pos: [0, 3, 0] }),
    createObject('heart', { id: 'x', name: 'X', count: 12, pos: [4, 3, -2], rot: [10, 0, 0], start: 2, keys: [key(1, { pos: [4, 6, -2], rot: [10, 0, 120] })] }),
    createObject('point', { id: 'p', pos: [1, 1, 1], start: 2.5, keys: [key(1, { pos: [2, 1, 1] })] }),
  );
  const objects = start();
  const times = [null, 1.7, 2.2, 2.8, 3.4];
  const before = times.map((t) => picture(objects, t));
  assert.ok(before.every((shown) => Object.keys(shown).length > 5));
  const into = moveInto(objects, ['x', 'p'], 'inner');
  assert.ok(!into.error, into.error);
  assert.deepEqual(into.objects.map((o) => o.id), ['g', 'kid', 'inner', 'x', 'p']);
  assert.equal(byId(into.objects, 'x').parent, 'inner');
  assert.equal(byId(into.objects, 'x').start, 0.5, 'it starts when it did: 2 s, half a second after its group');
  assert.equal(byId(into.objects, 'p').start, 1);
  times.forEach((t, i) => same(before[i], picture(into.objects, t), `inside, at ${t}`, 0.006));
  assert.deepEqual(sanitizeScene({ objects: clone(into.objects) }).objects, into.objects);

  const out = moveInto(into.objects, ['x', 'p'], null);
  assert.deepEqual(out.objects.map((o) => o.id), ['g', 'kid', 'inner', 'x', 'p']);
  times.forEach((t, i) => same(before[i], picture(out.objects, t), `out again, at ${t}`, 0.006));
  const was = start();
  for (const id of ['x', 'p']) {
    const o = byId(out.objects, id);
    assert.equal(o.parent, null);
    assert.equal(o.start, byId(was, id).start);
    assert.ok(dist(o.pos, byId(was, id).pos) < 0.004, `${id} is back at ${o.pos}`);
  }

  // an object that would start before its new group starts with it
  const early = moveInto(start(), ['kid'], null);
  assert.equal(byId(early.objects, 'kid').start, 1.5);
  const late = scene(createGroup({ id: 'late', start: 5 }), createObject('circle', { id: 'c', start: 1 }));
  assert.equal(byId(moveInto(late, ['c'], 'late').objects, 'c').start, 0);

  // what cannot be done says why and changes nothing
  const fresh = start();
  const copy = clone(fresh);
  assert.match(moveInto(fresh, ['g'], 'inner').error, /into itself/);
  assert.match(moveInto(fresh, ['g'], 'g').error, /into itself/);
  assert.match(moveInto(fresh, ['x'], 'nowhere').error, /not there/);
  const flat = scene(createGroup({ id: 'flat', scale: [1, 0, 1] }), createObject('circle', { id: 'c' }));
  assert.match(moveInto(flat, ['c'], 'flat').error, /squashed flat/);
  assert.deepEqual(fresh, copy);
  assert.equal(invAffine([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]), null);

  // groups only go so deep
  let deep = scene(createObject('circle', { id: 'c' }));
  let made = { objects: deep, id: 'c' };
  let levels = 0;
  for (; levels < 12; levels++) {
    const next = groupNodes(made.objects, [made.id]);
    if (next.error) { assert.match(next.error, /deep/); break; }
    made = next;
  }
  assert.equal(levels, 8);
  assert.deepEqual(sanitizeScene({ objects: clone(made.objects) }).objects, made.objects, 'as deep as the studio loads');
});

test('edits: a copy has everything the original has, under new names', () => {
  const objects = scene(
    createGroup({ id: 'g', name: 'Wing', pos: [2, 3, 0], keys: [key(1, { pos: [2, 3, 0], rot: [0, 0, 30] })] }),
    createObject('line', { id: 'bone', name: 'Bone', count: 5, parent: 'g', pos: [1, 0, 0] }),
    createGroup({ id: 'tip', name: 'Tip', parent: 'g', pos: [2, 0, 0] }),
    createObject('star', { id: 'claw', name: 'Claw', count: 10, parent: 'tip' }),
    createObject('circle', { id: 'ring', name: 'Ring', count: 6, pos: [0, 5, 0] }),
  );
  const made = duplicateNodes(objects, ['g', 'claw', 'ring']); // (the claw is in the wing: it is not copied twice)
  assert.equal(made.objects.length, 10);
  assert.equal(made.ids.length, 2);
  const [wing2, ring2] = made.ids.map((id) => byId(made.objects, id));
  assert.equal(wing2.name, 'Wing 2');
  assert.equal(ring2.name, 'Ring 2');
  assert.equal(new Set(made.objects.map((o) => o.id)).size, 10, 'every id is new');
  // right after the originals, with the same insides
  assert.deepEqual(made.objects.map((o) => o.name), ['Wing', 'Bone', 'Tip', 'Claw', 'Wing 2', 'Bone', 'Tip', 'Claw', 'Ring', 'Ring 2']);
  const tree = sceneTree(made.objects);
  assert.deepEqual(tree.insideOf(wing2).map((o) => o.name), ['Bone', 'Tip', 'Claw']);
  assert.ok(tree.insideOf(wing2).every((o) => !['bone', 'tip', 'claw'].includes(o.id)));
  // one block along X, at every moment
  for (const t of TIMES) {
    const now = picture(made.objects, t);
    const twin = Object.fromEntries(tree.insideOf(byId(made.objects, 'g')).map((o, i) => [o.id, tree.insideOf(wing2)[i].id]));
    twin.ring = ring2.id;
    same(picture(objects, t), now, `at ${t}`, 0.004, (pos) => [pos[0] + 1, pos[1], pos[2]], (name) => `${twin[name.split(':')[0]]}:${name.split(':')[1]}`);
  }
  assert.equal(duplicateNodes(made.objects, [wing2.id]).objects.find((o) => o.name === 'Wing 3').name, 'Wing 3');
  assert.equal(uniqueName([{ name: 'A 2' }], 'A 2'), 'A 3');

  // a scene holds 500 objects
  const many = Array.from({ length: MAX_OBJECTS - 1 }, (_, i) => createObject('point', { id: `p${i}` }));
  assert.equal(duplicateNodes(many, ['p0']).objects.length, MAX_OBJECTS);
  assert.match(duplicateNodes(duplicateNodes(many, ['p0']).objects, ['p1']).error, /500/);
  assert.match(groupNodes(duplicateNodes(many, ['p0']).objects, ['p1']).error, /500/);

  // taking things out takes what is in them
  assert.deepEqual(removeNodes(objects, ['tip', 'ring']).map((o) => o.id), ['g', 'bone']);
  assert.deepEqual(topNodes(objects, ['claw', 'tip', 'ring']).map((o) => o.id), ['tip', 'ring']);
});

test('edits: a mirror copy is the same thing on the other side, at every moment', () => {
  const flip = (axis, at) => (pos) => pos.map((v, k) => (k === axis ? 2 * at - v : v));
  const renamed = (map) => (name) => `${map[name.split(':')[0]]}:${name.split(':')[1]}`;
  // an object that is in no group: the mirror stands in the middle of the code block
  const free = scene(createObject('arrow', {
    id: 'a', name: 'Left arm', count: 12, pos: [3, 2, 1], rot: [20, 30, 40], scale: [1, 2, 1.5], life: 2.4, move: [1, 0.5, -0.25],
    keys: [key(0.8, { pos: [4, 3, 1], rot: [20, 30, 130], scale: [1, 1, 1] }), key(1.6, { pos: [4, 3, 3], rot: [60, -30, 130], ease: 'in' })],
  }));
  for (const axis of [0, 2]) {
    const made = mirrorNodes(clone(free), ['a'], axis);
    assert.equal(made.objects.length, 2);
    const twin = byId(made.objects, made.ids[0]);
    assert.equal(twin.name, axis === 0 ? 'Right arm' : 'Left arm 2');
    assert.ok(twin.scale[axis] < 0, 'a mirror image has one size the other way round');
    for (const t of [null, 0.3, 0.8, 1.2, 1.6, 2.1, 3.5]) {
      same(picture(free, t), picture(made.objects, t), `axis ${axis}, at ${t}`, 0.004, flip(axis, 0.5), renamed({ a: twin.id }));
    }
    assert.deepEqual(sanitizeScene({ objects: clone(made.objects) }).objects, made.objects);
  }
  // up and down, outside a group: upside down where it is
  const top = clone(free);
  top[0].name = 'Upper jaw';
  const down = mirrorNodes(top, ['a'], 1);
  assert.equal(byId(down.objects, down.ids[0]).name, 'Lower jaw');
  same(picture(free), picture(down.objects), 'upside down', 0.004, flip(1, 2), renamed({ a: down.ids[0] }));

  // in a group: the mirror stands in the group's pivot, and turns with the group
  const grouped = scene(
    createGroup({ id: 'body', name: 'Body', pos: [3, 2, 1], keys: [key(2, { pos: [3, 4, 1] })] }),
    createObject('line', {
      id: 'wing', name: 'Wing left', count: 7, parent: 'body', pos: [2, 0.5, 0], rot: [0, 0, 20], spin: true,
      keys: [key(1, { pos: [2, 0.5, 0], rot: [0, 360, 20], ease: 'linear' }), key(2, { pos: [3, 1, 0], rot: [0, 360, -40] })],
    }),
    createObject('point', { id: 'eye', parent: 'body', pos: [0.5, 1, 0.25], keys: [key(1.5, { pos: [1, 1, 0.25] })] }),
  );
  const pair = mirrorNodes(clone(grouped), ['wing', 'eye'], 0);
  assert.deepEqual(pair.objects.map((o) => o.name), ['Body', 'Wing left', 'Wing right', 'Particle', 'Particle 2']);
  const body = (t) => 3 + 0 * t; // the group only goes up: its pivot stays at x = 3
  for (const t of [null, 0.5, 1, 1.5, 2.5]) {
    same(picture(grouped, t), picture(pair.objects, t), `in a group, at ${t}`, 0.004, flip(0, body(t)), renamed({ wing: pair.ids[0], eye: pair.ids[1] }));
  }
  assert.equal(byId(pair.objects, pair.ids[0]).parent, 'body');

  // a whole group: what is in it is mirrored with it, also what flies off
  const whole = scene(
    createGroup({ id: 'g', name: 'Fin on the LEFT', pos: [4, 3, 0], rot: [0, 0, 15], keys: [key(1.5, { pos: [4, 3, 0], rot: [0, 40, -30] })] }),
    createObject('zigzag', { id: 'z', count: 12, parent: 'g', pos: [1, 0, 0.5], keys: [key(1, { pos: [1, 1, 0.5], rot: [30, 0, 0] })] }),
    createObject('circle', { id: 'puff', count: 6, parent: 'g', pos: [0, 1, 0], life: 1.2, move: [2, 1, 0], expand: 0.5, start: 0.5 }),
  );
  const twin = mirrorNodes(clone(whole), ['g'], 0);
  assert.equal(twin.objects.length, 6);
  assert.equal(byId(twin.objects, twin.ids[0]).name, 'Fin on the RIGHT');
  const inside = sceneTree(twin.objects).insideOf(byId(twin.objects, twin.ids[0]));
  for (const t of [null, 0.4, 0.9, 1.4, 2.2]) {
    same(picture(whole, t), picture(twin.objects, t), `a whole group, at ${t}`, 0.004, flip(0, 0.5), renamed({ z: inside[0].id, puff: inside[1].id }));
  }
});

test('edits: stretching makes the same show slower or faster', () => {
  const start = () => scene(
    createGroup({ id: 'g', pos: [1, 1, 1], start: 0.5, repeat: 2, every: 3, keys: [key(2, { pos: [3, 1, 1], rot: [0, 90, 0] })] }),
    createObject('circle', { id: 'ring', count: 6, parent: 'g', pos: [1, 0, 0], life: 1.5, start: 0.25, keys: [key(0.5, { pos: [1, 2, 0] }), key(1.5, { pos: [0, 2, 0], ease: 'out' })] }),
    createObject('star', { id: 'spark', count: 10, pos: [0, 3, 0], life: 1.2, start: 1, move: [1, 2, 0], expand: 1.5, gravity: -3, fade: true, repeat: 3, every: 0.4 }),
  );
  const shown = (objects, t) => computeParticles(objects, t).map((p) => [p.id, ...p.pos.map((v) => v.toFixed(2)), p.alpha.toFixed(1)].join(' ')).sort();
  const before = start();
  for (const factor of [2, 0.5, 1.37]) {
    const objects = start();
    assert.equal(stretchNodes(objects, null, factor), factor);
    assert.ok(Math.abs(sceneDuration(objects) - sceneDuration(before) * factor) < 0.01, `${factor}: the show lasts ${sceneDuration(objects)} s`);
    let compared = 0;
    // (a particle is switched on a moment before its time, and that moment is not stretched: stay clear of the starts)
    const tree = sceneTree(before);
    const starts = tree.leaves().flatMap((o) => tree.playsOf(o).map((play) => play.start));
    for (let t = 0.13; t < sceneDuration(before); t += 0.31) {
      if (starts.some((s) => Math.abs(s - t) < 0.08)) continue;
      const was = computeParticles(before, t).filter((p) => p.alpha > 0.05);
      const now = computeParticles(objects, t * factor).filter((p) => p.alpha > 0.05);
      assert.equal(now.length, was.length, `${factor}: particles at ${t.toFixed(2)} s`);
      was.forEach((p, i) => {
        assert.ok(dist(p.pos, now[i].pos) < 0.03, `${factor}: ${p.id} ${p.index} is ${dist(p.pos, now[i].pos).toFixed(3)} off at ${t.toFixed(2)} s`);
        assert.ok(Math.abs(p.alpha - now[i].alpha) < 0.08);
        compared++;
      });
    }
    assert.ok(compared > 150, `${compared} particles compared`);
    assert.deepEqual(sanitizeScene({ objects: clone(objects) }).objects, objects);
  }
  assert.ok(shown(before, 1.5).length > 0);

  // one object: it still starts when it did, the others are left alone
  const one = start();
  assert.equal(stretchNodes(one, ['g'], 2), 2);
  assert.equal(byId(one, 'g').start, 0.5);
  assert.equal(byId(one, 'g').every, 6);
  assert.equal(byId(one, 'ring').start, 0.5, 'what is in it starts later within it');
  assert.deepEqual(byId(one, 'ring').keys.map((k) => k.t), [1, 3]);
  assert.deepEqual(byId(one, 'spark'), byId(before, 'spark'));

  // keys cannot come closer than 0.1 s: the stretch stops there and says how far it got
  const tight = start();
  const got = stretchNodes(tight, null, 0.01);
  assert.ok(got > 0.2 && got < 0.21, `stopped at ${got}`);
  for (const o of tight) o.keys.forEach((k, i) => assert.ok(k.t - (i ? o.keys[i - 1].t : 0) >= MIN_KEY_GAP - 1e-9));
  assert.deepEqual(sanitizeScene({ objects: clone(tight) }).objects, tight);
  assert.equal(stretchNodes(start(), null, NaN), 1);
  assert.equal(stretchNodes(start(), null, -2), 1);
  assert.ok(stretchNodes(start(), null, 1e9) < 1000);
});

test('edits: the keys of one object can be given to another', () => {
  const source = createObject('circle', {
    id: 's', name: 'Leader', pos: [1, 1, 1], rot: [0, 0, 10], scale: [2, 2, 2], spin: true,
    keys: [key(0.5, { pos: [3, 1, 1], rot: [0, 0, 100], scale: [4, 4, 4], ease: 'out', color: '#ff0000' }), key(1.5, { pos: [3, 2, 1], rot: [0, 360, 100], scale: [2, 2, 2], ease: 'linear', size: 1, size2: 2 })],
  });
  const [s] = scene(source);
  const clip = copyKeys(s);
  assert.equal(copyKeys(createObject('circle')), null);
  s.keys.length = 0; // (the copy does not hang on the original)
  assert.equal(clip.keys.length, 2);

  // onto an object without keys: the same change, from where that one is
  const [a] = scene(createObject('heart', { id: 'a', pos: [-5, 0, 2], rot: [90, 0, 0], scale: [1, 0.5, 3] }));
  const pasted = pasteKeys(a, clip, 0);
  assert.ok(pasted.ok, pasted.message);
  assert.match(pasted.message, /2 keys of Leader/);
  assert.deepEqual(a.keys.map((k) => [k.t, k.pos, k.rot, k.scale, k.ease]), [
    [0.5, [-3, 0, 2], [90, 0, 90], [2, 1, 6], 'out'],
    [1.5, [-3, 1, 2], [90, 360, 90], [1, 0.5, 3], 'linear'],
  ]);
  assert.equal(a.keys[0].color, '#ff0000');
  assert.deepEqual([a.keys[1].size, a.keys[1].size2], [1, 2]);
  assert.equal(a.spin, true, 'full turns need the angles as typed');
  assert.deepEqual(sanitizeScene({ objects: [clone(a)] }).objects[0], a);

  // at a later moment: what it did before stays, what it did after is replaced
  const [b] = scene(createObject('circle', { id: 'b', pos: [0, 0, 0], keys: [key(0.5, { pos: [0, 1, 0] }), key(1.5, { pos: [0, 3, 0], ease: 'linear' }), key(4, { pos: [9, 9, 9] })] }));
  assert.ok(pasteKeys(b, clip, 1).ok);
  assert.deepEqual(b.keys.map((k) => k.t), [0.5, 1, 1.5, 2.5]);
  assert.deepEqual(b.keys[1].pos, [0, 2, 0], 'a key holds the place it had by then');
  assert.deepEqual(b.keys[2].pos, [2, 2, 0]);
  assert.deepEqual(b.keys[3].pos, [2, 3, 0]);
  // close to a key: it begins at that key
  const [c] = scene(createObject('circle', { id: 'c', pos: [0, 0, 0], keys: [key(0.5, { pos: [0, 1, 0] })] }));
  assert.ok(pasteKeys(c, clip, 0.45).ok);
  assert.deepEqual(c.keys.map((k) => k.t), [0.5, 1, 2]);

  // a group takes the moves and leaves the colours; a single particle only moves
  const [g] = scene(createGroup({ id: 'g', pos: [1, 1, 1] }));
  assert.ok(pasteKeys(g, clip, 0).ok);
  assert.ok(!('color' in g.keys[0]) && !('size' in g.keys[1]));
  assert.deepEqual(g.keys[0].scale, [2, 2, 2]);
  const [p] = scene(createObject('point', { id: 'p', pos: [0, 0, 0] }));
  assert.ok(pasteKeys(p, clip, 0).ok);
  assert.deepEqual([p.keys[1].pos, p.keys[1].rot, p.keys[1].scale, p.spin], [[2, 1, 0], [0, 0, 0], [1, 1, 1], false]);

  // too many keys: nothing changes
  const [full] = scene(createObject('circle', { id: 'f', keys: Array.from({ length: 11 }, (_, i) => key(0.5 + i * 0.5, { pos: [i, 0, 0] })) }));
  const was = clone(full);
  const no = pasteKeys(full, clip, 5.5);
  assert.ok(!no.ok);
  assert.match(no.message, /13 keys/);
  assert.deepEqual(full, was);
  assert.ok(!pasteKeys(full, null, 0).ok);
});

test('edits: the pivot of a group moves without the things in it', () => {
  const objects = scene(
    createGroup({ id: 'g', pos: [2, 1, 0], rot: [0, 30, 0], scale: [2, 2, 2], keys: [key(1, { pos: [2, 3, 0], rot: [0, 30, 0], scale: [2, 2, 2] })] }),
    createObject('line', { id: 'bone', count: 5, parent: 'g', pos: [1, 0, 0], keys: [key(1, { pos: [1, 1, 0] })] }),
    createGroup({ id: 'tip', parent: 'g', pos: [2, 0, 0], rot: [0, 0, 45] }),
    createObject('star', { id: 'claw', count: 10, parent: 'tip' }),
  );
  const before = TIMES.map((t) => picture(objects, t));
  assert.ok(movePivot(objects, 'g', [4, 1, -1]));
  assert.deepEqual(objects[0].pos, [4, 1, -1]);
  assert.deepEqual(objects[0].keys[0].pos, [4, 3, -1], 'its keys go along');
  assert.deepEqual(objects[0].rot, [0, 30, 0]);
  // the group only slides: the picture stays the same all the time
  TIMES.forEach((t, i) => same(before[i], picture(objects, t), `at ${t}`, 0.006));
  assert.ok(!movePivot(objects, 'bone', [0, 0, 0]), 'only groups have a pivot');
  // now it turns about the new point
  objects[0].keys[0].rot = [0, 120, 0];
  const turned = picture(objects, 1.2);
  const far = Object.values(turned).map((pos) => dist(pos, [4, 3, -1]));
  const still = Object.values(picture(objects, null)).map((pos) => dist(pos, [4, 1, -1]));
  assert.ok(Math.abs(Math.max(...far) - Math.max(...still)) < 1.5, 'as far from the pivot as before the turn');
});

test('moves: every ready-made move gives keys the studio keeps, from where the object is', () => {
  const fresh = () => scene(createObject('circle', { id: 'o', name: 'Ring', count: 8, pos: [2, 3, 1], rot: [10, 20, 30], scale: [1, 2, 1], life: 1.2 }));
  assert.deepEqual(MOVES.map((m) => m.name), ['Flap', 'Pulse', 'Spin', 'Orbit', 'Shake', 'Bounce', 'Float', 'Rise and fade']);
  for (const move of MOVES) {
    const fields = moveFields(move);
    assert.equal(fields[0].key, 'seconds');
    assert.ok(fields.every((f) => f.label && (f.options || (f.min <= f.value && f.value <= f.max))), move.name);
    const done = applyMove(fresh(), 'o', move.id);
    assert.ok(done.ok, `${move.name}: ${done.message}`);
    const o = byId(done.objects, 'o');
    const node = move.id === 'orbit' ? byId(done.objects, done.group) : o;
    assert.ok(node.keys.length >= 1 && node.keys.length <= MAX_KEYS, `${move.name}: ${node.keys.length} keys`);
    node.keys.forEach((k, i) => assert.ok(k.t - (i ? node.keys[i - 1].t : 0) >= MIN_KEY_GAP - 1e-9, `${move.name}: keys too close`));
    assert.deepEqual(sanitizeScene({ objects: clone(done.objects) }).objects, done.objects, `${move.name}: the studio would change it on loading`);
    assert.ok(done.message.length > 10);
  }
  const keysOf = (id, settings) => byId(applyMove(fresh(), 'o', id, settings).objects, 'o').keys;

  // back and forth: it ends where it began
  let keys = keysOf('flap', { seconds: 1, times: 2, angle: 40, axis: 2 });
  assert.deepEqual(keys.map((k) => [k.t, k.rot, k.ease]), [[0.5, [10, 20, 70], 'smooth'], [1, [10, 20, 30], 'smooth'], [1.5, [10, 20, 70], 'smooth'], [2, [10, 20, 30], 'smooth']]);
  assert.ok(keys.every((k) => String(k.pos) === '2,3,1' && String(k.scale) === '1,2,1'));
  keys = keysOf('pulse', { seconds: 0.4, times: 1, amount: 50 });
  assert.deepEqual(keys.map((k) => [k.t, k.scale]), [[0.2, [1.5, 3, 1.5]], [0.4, [1, 2, 1]]]);
  keys = keysOf('bounce', { seconds: 1, times: 1, height: 2 });
  assert.deepEqual(keys.map((k) => [k.t, k.pos, k.ease]), [[0.5, [2, 5, 1], 'out'], [1, [2, 3, 1], 'in']]);
  keys = keysOf('float', { times: 3 });
  assert.equal(keys.length, 6);
  assert.deepEqual(keys[5].pos, [2, 3, 1]);
  keys = keysOf('shake', { seconds: 0.2, times: 3, reach: 0.5 });
  assert.equal(keys.length, 7);
  assert.deepEqual(keys.map((k) => k.t), [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
  assert.deepEqual(keys[6].pos, [2, 3, 1], 'back in its place at the end');
  keys.slice(0, 6).forEach((k) => assert.ok(Math.abs(dist(k.pos, [2, 3, 1]) - 0.5) < 0.002, 'half a block from its place'));

  // spin: one key for all the turns
  const spun = byId(applyMove(fresh(), 'o', 'spin', { seconds: 2, times: 3, axis: 1 }).objects, 'o');
  assert.deepEqual(spun.keys.map((k) => [k.t, k.rot, k.ease]), [[6, [10, 1100, 30], 'linear']]);
  assert.equal(spun.spin, true);
  assert.ok(dist(poseAt(spun, 1).rot, [10, 200, 30]) < 1e-9, 'half a turn after a second');

  // rise and fade: up, and gone when it is up
  const risen = byId(applyMove(fresh(), 'o', 'rise', { seconds: 3, height: 5 }).objects, 'o');
  assert.deepEqual(risen.keys.map((k) => [k.t, k.pos, k.ease]), [[3, [2, 8, 1], 'out']]);
  assert.equal(risen.fade, true);
  assert.deepEqual(spanOf(risen), { start: 0, end: 3 });

  // orbit: a group that turns, with the object a radius away from its pivot
  const done = applyMove(fresh(), 'o', 'orbit', { seconds: 2, times: 2, wide: 6, axis: 1 });
  const group = byId(done.objects, done.group);
  const o = byId(done.objects, 'o');
  assert.deepEqual(done.objects.map((x) => x.id), [done.group, 'o']);
  assert.equal(group.name, 'Ring orbit');
  assert.deepEqual([group.pos, o.pos, o.parent, group.spin], [[-1, 3, 1], [3, 0, 0], group.id, true]);
  assert.deepEqual(group.keys.map((k) => [k.t, k.rot]), [[4, [0, 720, 0]]]);
  assert.ok(spanOf(o).end >= 4 - 1e-9, 'it lasts until the last round is over');
  same(picture(fresh()), picture(done.objects), 'the picture at the start stays');
  const middleAt = (t) => {
    const pts = Object.values(picture(done.objects, t));
    return [0, 1, 2].map((k) => pts.reduce((sum, pos) => sum + pos[k], 0) / pts.length);
  };
  for (const t of [0.3, 1, 1.7, 2.4, 3.9]) {
    const m = middleAt(t);
    // (a circle is flown as straight stretches: up to 0.05 blocks off)
    assert.ok(Math.abs(dist(m, [-1, 3, 1]) - 3) < 0.07 && Math.abs(m[1] - 3) < 0.02, `at ${t} s it is ${dist(m, [-1, 3, 1]).toFixed(2)} from the middle`);
  }
  assert.ok(dist(middleAt(1), [-4, 3, 1]) < 0.07, 'half a round after a second');
  assert.ok(dist(middleAt(0.5), middleAt(2.5)) < 0.07, 'a round takes two seconds');
});

test('moves: a move starts at the time marker and knows what fits', () => {
  const fresh = () => scene(createObject('circle', { id: 'o', name: 'Ring', pos: [0, 2, 0], life: 1.2, keys: [key(1, { pos: [2, 2, 0], ease: 'linear' }), key(2, { pos: [2, 4, 0] }), key(3, { pos: [9, 9, 9] })] }));
  // at 1.5 s: what it did before stays, a key holds the place, the rest is replaced
  let done = applyMove(fresh(), 'o', 'bounce', { seconds: 1, times: 2, height: 1 }, 1.5);
  let o = byId(done.objects, 'o');
  assert.deepEqual(o.keys.map((k) => [k.t, k.pos]), [[1, [2, 2, 0]], [1.5, [2, 3, 0]], [2, [2, 4, 0]], [2.5, [2, 3, 0]], [3, [2, 4, 0]], [3.5, [2, 3, 0]]]);
  // on a key: it begins there
  done = applyMove(fresh(), 'o', 'spin', { seconds: 1, times: 1, axis: 0 }, 2.03);
  o = byId(done.objects, 'o');
  assert.deepEqual(o.keys.map((k) => [k.t, k.rot]), [[1, [0, 0, 0]], [2, [0, 0, 0]], [3, [360, 0, 0]]]);
  // orbit from a later moment: the group waits until then
  done = applyMove(fresh(), 'o', 'orbit', { seconds: 1, times: 1 }, 2);
  assert.deepEqual(byId(done.objects, done.group).keys.map((k) => [k.t, k.rot]), [[2, [0, 0, 0]], [3, [0, 360, 0]]]);

  // how often it fits: twelve keys at most
  const [ring] = fresh();
  assert.equal(mostTimes(ring, MOVE_BY_ID.flap, 0), 6);
  assert.equal(mostTimes(ring, MOVE_BY_ID.flap, 3), 4, 'three keys are kept');
  assert.equal(mostTimes(ring, MOVE_BY_ID.flap, 2.5), 4, 'two keys are kept and one holds the place');
  assert.equal(mostTimes(ring, MOVE_BY_ID.shake, 0), 5);
  assert.equal(mostTimes(ring, MOVE_BY_ID.spin, 3), 50);
  assert.equal(mostTimes(ring, MOVE_BY_ID.rise, 3), 1);
  const was = fresh();
  const no = applyMove(was, 'o', 'flap', { times: 6 }, 3);
  assert.ok(!no.ok);
  assert.match(no.message, /Only 4 times fit/);
  assert.deepEqual(was, fresh(), 'nothing changed');
  const [full] = scene(createObject('circle', { id: 'f', keys: Array.from({ length: 12 }, (_, i) => key(0.5 + i * 0.5, { pos: [i, 0, 0] })) }));
  assert.equal(mostTimes(full, MOVE_BY_ID.spin, 6), 0);
  assert.match(applyMove([full], 'f', 'spin', {}, 6).message, /no keys left/);
  assert.equal(mostTimes(full, MOVE_BY_ID.spin, 0), 50, 'from the start all its keys are replaced');

  // settings out of range are brought back, nonsense gets the usual value
  o = byId(applyMove(fresh(), 'o', 'pulse', { seconds: 0.01, times: 99, amount: 'x' }).objects, 'o');
  assert.deepEqual(o.keys.map((k) => k.t), [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2]);
  assert.deepEqual(o.keys[0].scale, [1.3, 1.3, 1.3]);

  // what makes no sense says so
  assert.match(applyMove(scene(createObject('point', { id: 'p' })), 'p', 'flap').message, /single particle/);
  assert.ok(applyMove(scene(createObject('point', { id: 'p' })), 'p', 'bounce').ok);
  assert.match(applyMove(scene(createGroup({ id: 'g' })), 'g', 'rise').message, /not for groups/);
  assert.ok(applyMove(scene(createGroup({ id: 'g' })), 'g', 'flap').ok);
  assert.ok(!applyMove(fresh(), 'nobody', 'flap').ok);
  assert.ok(!applyMove(fresh(), 'o', 'dance').ok);
});
