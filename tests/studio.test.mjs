// Tests for the Shape Studio (js/deform.js, js/forms.js), Morph (js/morph.js and
// the plans of js/motion.js) and the Code window (js/nodes.js). The exported
// code is run here against a fake `api`, and morphs are played in the copy of
// the game's particle engine (tests/babylon-sim.mjs).
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { shapePoints, SHAPES, SHAPE_BY_ID } from '../js/shapes.js';
import {
  createObject, createGroup, sanitizeScene, computeParticles, sceneDuration, sceneTree, stillPoints, localPoints, LIFE_PER_SECOND,
} from '../js/scene.js';
import { planOf, formsOf, formAt, MAX_KEYS } from '../js/motion.js';
import { generateCode, LIMITS, UNTYPED_API, UNTYPED_API_LINES } from '../js/codegen.js';
import {
  DEFORMERS, DEFORMER_BY_ID, MAX_DEFORMERS, MAX_POINTS, newDeformer, applyDeformers, sanitizeDeform, handlesOf, dragHandle, measure,
} from '../js/deform.js';
import { formPoints, formBox, formReach, formKey, formName, sanitizeForm, cloudOf, isShaped, PATH, CLOUD, MAX_NODES as MAX_CORNERS } from '../js/forms.js';
import { matchPoints } from '../js/morph.js';
import { morphNodes, joinNodes, bakeForm, copyKeys, pasteKeys, duplicateNodes, mirrorNodes, arrayNodes, MORPH_WAIT, MORPH_TIME } from '../js/edits.js';
import {
  NODE_TYPES, NODE_BY_ID, NODE_EXAMPLES, CATS, PLACES, FACINGS, MAX_NODES, outsOf, createNode, sanitizeGraph, sanitizeCode, compileGraph,
  worldCode, exampleGraph,
} from '../js/nodes.js';
import { createParticle, frameAge } from './babylon-sim.mjs';

const root = new URL('..', import.meta.url);
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const scene = (...objects) => sanitizeScene({ objects }).objects;
const key = (t, o = {}) => ({ t, pos: [0.5, 2, 0.5], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth', ...o });
const one = (o) => scene(createObject(o.shape || 'circle', { id: 'x', count: 12, pos: [0.5, 2, 0.5], ...o }));
const circle = (n = 40) => shapePoints('circle', n, {});
const cube = (n = 60) => shapePoints('cube', n, {});
const tool = (kind, more = {}, points = circle()) => ({ ...newDeformer(kind, points), ...more });

// ---------------------------------------------------------------- Shape Studio: the tools

/** Tools that can give another number of points. */
const RECOUNTS = ['snap', 'mirror', 'repeat', 'thin', 'fill'];

test('shape studio: every tool changes a shape, keeps it sound and can be switched off', () => {
  assert.equal(DEFORMERS.length, 22);
  assert.equal(new Set(DEFORMERS.map((d) => d.id)).size, DEFORMERS.length, 'no two tools have the same id');
  assert.equal(new Set(DEFORMERS.map((d) => d.name)).size, DEFORMERS.length, 'or the same name');
  for (const def of DEFORMERS) {
    assert.ok(def.about.length > 20 && def.group, `${def.id} says what it does`);
    for (const f of def.fields) {
      assert.ok(['number', 'choice', 'vec'].includes(f.kind), `${def.id}.${f.key}`);
      if (f.kind === 'number') {
        assert.ok(f.min < f.max && f.step > 0 && f.value >= f.min && f.value <= f.max, `${def.id}.${f.key} starts inside its limits`);
        assert.ok(f.slide[0] >= f.min && f.slide[1] <= f.max && f.slide[0] < f.slide[1], `${def.id}.${f.key}: the slider is a part of the range`);
      }
    }
    for (const [what, points] of [['a ring', circle()], ['a cube', cube()], ['one point', [[0, 0, 0]]], ['a line', [[-1, 0, 0], [0, 0, 0], [1, 0, 0]]]]) {
      const made = newDeformer(def.id, points);
      assert.deepEqual(sanitizeDeform([made]), [made], `${def.id} on ${what}: what is made is what loading keeps`);
      const out = applyDeformers(points, [made]);
      assert.ok(out.length >= 1 && out.length <= MAX_POINTS, `${def.id} on ${what}: ${out.length} points`);
      assert.ok(out.every((p) => p.length === 3 && p.every((v) => Number.isFinite(v) && Math.abs(v) <= 50)), `${def.id} on ${what}: finite`);
      if (!RECOUNTS.includes(def.id)) assert.equal(out.length, points.length, `${def.id} on ${what} keeps the number of points`);
      // switched off, it does nothing; and it never changes the points it is given
      assert.deepEqual(applyDeformers(points, [{ ...made, on: false }]), points.map((p) => p.slice()));
    }
    // every slider at both ends: still sound
    for (const f of def.fields.filter((x) => x.kind === 'number')) {
      for (const v of [f.min, f.max]) {
        const out = applyDeformers(cube(), [tool(def.id, { [f.key]: v }, cube())]);
        assert.ok(out.length >= 1 && out.every((p) => p.every(Number.isFinite)), `${def.id} with ${f.key}=${v}`);
      }
    }
  }
  // a new drag point, cage or bulge leaves the shape as it is until its dots are dragged; the others show at once
  const moved = (kind) => applyDeformers(circle(), [tool(kind)]).some((p, i) => dist(p, circle()[i] || [9, 9, 9]) > 1e-6);
  assert.deepEqual(DEFORMERS.filter((d) => !moved(d.id)).map((d) => d.id), ['pull', 'cage', 'round', 'flatten', 'swirl', 'ripple', 'shift']);
  // (a flat ring is round and flat already, and Swirl, Ripple need more than a ring: on a cube they show)
  for (const kind of ['round', 'flatten', 'swirl', 'ripple']) {
    assert.ok(applyDeformers(cube(), [tool(kind, {}, cube())]).some((p, i) => dist(p, cube()[i]) > 1e-3), `${kind} changes a cube`);
  }
});

test('shape studio: the tools do what their names say', () => {
  const ring = circle(40);
  const apply = (points, ...list) => applyDeformers(points, list);
  // Inflate: every point that far further from the middle
  for (const p of apply(ring, tool('inflate', { amount: 0.5 }))) assert.ok(near(Math.hypot(...p), 1.5, 1e-9));
  // Make round: a cube becomes a ball
  const ball = apply(cube(), tool('round', { amount: 1 }, cube()));
  const radius = measure(cube()).radius;
  for (const p of ball) assert.ok(near(Math.hypot(...p), radius, 1e-9));
  // Twist about Y by half a turn in all: the bottom a quarter turn one way, the top a quarter turn the other, the middle stays
  const column = [[1, -1, 0], [1, 0, 0], [1, 1, 0], [-1, -1, 0], [-1, 0, 0], [-1, 1, 0]];
  const twisted = apply(column, tool('twist', { axis: 1, angle: 180 }, column));
  assert.ok(dist(twisted[1], [1, 0, 0]) < 1e-9, 'the middle stays');
  assert.ok(dist(twisted[0], [0, -1, 1]) < 1e-9, `the bottom is a quarter turn round: ${twisted[0]}`);
  assert.ok(dist(twisted[2], [0, 1, -1]) < 1e-9, `the top went the other way: ${twisted[2]}`);
  assert.ok(dist(twisted[3], [0, -1, -1]) < 1e-9 && dist(twisted[5], [0, 1, 1]) < 1e-9, 'and the other side with them');
  // Bend by 360 degrees: a line becomes a ring, and its two ends meet
  const line = Array.from({ length: 21 }, (_, i) => [-1 + i / 10, 0, 0]);
  const rolled = apply(line, tool('bend', { axis: 0, angle: 360 }, line));
  assert.ok(dist(rolled[0], rolled[20]) < 1e-9, 'the ends meet');
  const centre = measure(rolled).centre;
  const radii = rolled.map((p) => dist(p, centre));
  assert.ok(Math.max(...radii) - Math.min(...radii) < 1e-9 && near(radii[0], 2 / (2 * Math.PI), 1e-9), 'on a circle as long as the line was');
  // Taper: at 1 the top is a point, the bottom twice as wide
  const box = [[1, 1, 1], [-1, 1, -1], [1, -1, 1], [-1, -1, -1]];
  const cone = apply(box, tool('taper', { axis: 1, amount: 1 }, box));
  assert.deepEqual(cone.map((p) => p.map((v) => Math.round(v * 1e6) / 1e6 + 0)), [[0, 1, 0], [0, 1, 0], [2, -1, 2], [-2, -1, -2]]);
  // Lean: the top goes right by as much as it is above the middle
  assert.deepEqual(apply(box, tool('lean', { way: 0, amount: 0.5 }, box))[0], [1.5, 1, 1]);
  // Squash and stretch keeps the volume: twice as long, thinner by the root of 2
  const long = apply(box, tool('squash', { axis: 1, amount: 2 }, box))[0];
  assert.ok(near(long[1], 2) && near(long[0], Math.SQRT1_2, 1e-12) && near(long[2], Math.SQRT1_2, 1e-12));
  // Flatten
  assert.ok(apply(cube(), tool('flatten', { axis: 2, amount: 1 }, cube())).every((p) => Math.abs(p[2]) < 1e-12));
  // Mirror: twice the points, without those on the mirror itself
  const half = [[0, 1, 0], [0.5, 0, 0], [1, -1, 0]];
  assert.deepEqual(apply(half, tool('mirror', { axis: 0, offset: 0 }, half)), [[0, 1, 0], [0.5, 0, 0], [1, -1, 0], [-0.5, 0, 0], [-1, -1, 0]]);
  // Repeat: a row of copies, a ring of copies
  assert.equal(apply(half, tool('repeat', { layout: 0, count: 4, step: [0, 0, 1] }, half)).length, 12);
  const wheel = apply([[1, 0, 0]], tool('repeat', { layout: 1, count: 4, axis: 1, arc: 360 }, [[1, 0, 0]]));
  assert.equal(wheel.length, 4);
  for (const p of wheel) assert.ok(near(Math.hypot(p[0], p[2]), 1, 1e-12) && near(p[1], 0));
  assert.ok(dist(wheel[2], [-1, 0, 0]) < 1e-12, 'the third of four is opposite the first');
  // Thin out keeps a share, evenly; Fill in adds one between every two neighbours
  assert.equal(apply(ring, tool('thin', { keep: 25 })).length, 10);
  const filled = apply(line, tool('fill', { times: 1 }, line));
  assert.equal(filled.length, 41);
  assert.ok(dist(filled[1], [-0.95, 0, 0]) < 1e-12);
  // Snap to a grid: on the grid, and no two on the same spot
  const snapped = apply(ring, tool('snap', { step: 0.5 }));
  assert.ok(snapped.every((p) => p.every((v) => near(v / 0.5, Math.round(v / 0.5), 1e-9))));
  assert.equal(new Set(snapped.map(String)).size, snapped.length);
  // Scatter and Wobble are the same every time (the preview does not flicker), and another try is another shape
  for (const kind of ['jitter', 'noise']) {
    assert.deepEqual(apply(ring, tool(kind)), apply(ring, tool(kind)), `${kind} is steady`);
    assert.notDeepEqual(apply(ring, tool(kind, { seed: 1 })), apply(ring, tool(kind, { seed: 2 })), `${kind}: another try differs`);
  }
  // tools work one after the other, in the order of the list
  const a = apply(box, tool('taper', { amount: 1 }, box), tool('lean', { amount: 1 }, box));
  const b = apply(box, tool('lean', { amount: 1 }, box), tool('taper', { amount: 1 }, box));
  assert.notDeepEqual(a, b);
  // a shape never has more than 600 points, and a list never more than 12 tools
  assert.equal(apply(circle(300), tool('repeat', { count: 24 })).length, MAX_POINTS);
  assert.equal(sanitizeDeform(new Array(40).fill({ kind: 'twist' })).length, MAX_DEFORMERS);
  // junk is repaired or dropped
  assert.deepEqual(sanitizeDeform([{ kind: 'twist', axis: 9, angle: 'x' }, { kind: 'nope' }, null, 7]), [{ kind: 'twist', on: true, axis: 1, angle: 120 }]);
  assert.deepEqual(sanitizeDeform('junk'), []);
  assert.equal(sanitizeDeform([{ kind: 'inflate', amount: 1e9 }])[0].amount, 5);
});

test('shape studio: drag points, cages and bulges follow their dots', () => {
  const ring = circle(40);
  // a drag point grabs the top of the shape; dragged, that point goes exactly where the dot is
  const list = [newDeformer('pull', ring)];
  assert.deepEqual(list[0].at, [0, 1, 0]);
  assert.deepEqual(handlesOf(ring, list, 0).map((hd) => [hd.id, hd.at, !!hd.minor]), [['to', [0, 1, 0], false], ['at', [0, 1, 0], true]]);
  assert.equal(dragHandle(ring, list, 0, 'to', [0.4, 2, 0.3]), true);
  const pulled = applyDeformers(ring, list);
  const top = ring.findIndex((p) => dist(p, [0, 1, 0]) < 1e-9);
  assert.ok(top >= 0 && dist(pulled[top], [0.4, 2, 0.3]) < 1e-9, 'the grabbed point is where the dot is');
  const bottom = ring.findIndex((p) => dist(p, [0, -1, 0]) < 1e-9);
  assert.ok(dist(pulled[bottom], ring[bottom]) < 1e-12, 'what is out of reach stays');
  const moved = pulled.filter((p, i) => dist(p, ring[i]) > 1e-9).length;
  assert.ok(moved > 3 && moved < ring.length - 3, `${moved} of ${ring.length} points come along`);
  // moving where it grabs keeps what it has pulled so far
  dragHandle(ring, list, 0, 'at', [0.1, 1, 0]);
  assert.deepEqual(list[0].to.map((v) => Math.round(v * 1000) / 1000), [0.5, 2, 0.3]);
  // a cage: with its corners where they are, nothing changes; a corner dragged takes the nearest point with it
  const solid = cube(60);
  const cage = [newDeformer('cage', solid)];
  assert.deepEqual(applyDeformers(solid, cage), solid.map((p) => p.slice()));
  const corners = handlesOf(solid, cage, 0);
  assert.equal(corners.length, 8);
  assert.deepEqual(corners[7].at, [1, 1, 1]);
  dragHandle(solid, cage, 0, 'c7', [2, 1.5, 1]);
  assert.deepEqual(handlesOf(solid, cage, 0)[7].at, [2, 1.5, 1], 'the dot is where it was dragged to');
  const leaned = applyDeformers(solid, cage);
  const corner = solid.findIndex((p) => dist(p, [1, 1, 1]) < 1e-9);
  const opposite = solid.findIndex((p) => dist(p, [-1, -1, -1]) < 1e-9);
  assert.ok(corner >= 0 && dist(leaned[corner], [2, 1.5, 1]) < 1e-9, 'the corner of the shape follows the corner of the cage');
  assert.ok(dist(leaned[opposite], [-1, -1, -1]) < 1e-12, 'the opposite corner stays');
  // a flat shape gets a cage with some depth, so its corners can be told apart
  assert.deepEqual(handlesOf(ring, [newDeformer('cage', ring)], 0).map((hd) => hd.at[2]), [-0.5, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5]);
  // a bulge pushes away from its middle, a pinch pulls in
  const bulge = [tool('bulge', { at: [0, 0, 0], radius: 3, amount: 0.5 })];
  assert.ok(applyDeformers(ring, bulge).every((p) => Math.hypot(...p) > 1.2));
  assert.ok(applyDeformers(ring, [{ ...bulge[0], amount: -0.5 }]).every((p) => Math.hypot(...p) < 0.8));
  // the dots of a tool are where the tools before it have put the shape
  const two = [tool('inflate', { amount: 1 }), newDeformer('pull', applyDeformers(ring, [tool('inflate', { amount: 1 })]))];
  assert.deepEqual(handlesOf(ring, two, 1)[0].at, [0, 2, 0]);
  // tools without dots have none, and a drag of a dot that is not there changes nothing
  assert.deepEqual(handlesOf(ring, [tool('twist')], 0), []);
  assert.equal(dragHandle(ring, [tool('twist')], 0, 'to', [1, 1, 1]), false);
  assert.equal(dragHandle(ring, list, 0, 'to', [NaN, 0, 0]), false);
  assert.deepEqual(DEFORMERS.filter((d) => d.handles).map((d) => d.id), ['pull', 'cage', 'bulge']);
});

// ---------------------------------------------------------------- Shape Studio: drawn lines and loose points

const path = (nodes, more = {}) => ({ shape: PATH, count: 9, params: {}, path: { nodes, closed: false, smooth: false, mode: 'line', ...more } });

test('shape studio: a drawn line: along it, closed, smooth, filled, spun; and loose points', () => {
  // along the line: evenly spread, from the first corner to the last
  const zig = path([[-1, 0, 0], [0, 0, 0], [0, 1, 0]]);
  const pts = formPoints(zig);
  assert.equal(pts.length, 9);
  assert.deepEqual(pts[0], [-1, 0, 0]);
  assert.deepEqual(pts[8], [0, 1, 0]);
  assert.deepEqual(pts[4], [0, 0, 0], 'the middle one is on the corner');
  for (let i = 1; i < 9; i++) assert.ok(near(dist(pts[i], pts[i - 1]), 0.25, 1e-9));
  // closed: around and back, no particle twice on the first corner
  const square = [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]];
  const loop = formPoints(path(square, { closed: true }));
  assert.equal(loop.length, 9);
  assert.equal(new Set(loop.map(String)).size, 9);
  assert.ok(loop.every((p) => Math.max(Math.abs(p[0]), Math.abs(p[1])) > 1 - 1e-9), 'all on the outline');
  // smooth: a curve that still goes through every corner
  const curve = formPoints({ ...path(square, { closed: true, smooth: true }), count: 240 });
  for (const corner of square) assert.ok(Math.min(...curve.map((p) => dist(p, corner))) < 0.03, `the curve passes ${corner}`);
  assert.ok(curve.some((p) => Math.max(Math.abs(p[0]), Math.abs(p[1])) > 1.05), 'and bulges out between them');
  // filled: the particles are inside, and spread over the inside
  const inside = formPoints({ ...path(square, { closed: true, mode: 'fill' }), count: 100 });
  assert.equal(inside.length, 100);
  assert.ok(inside.every((p) => Math.abs(p[0]) <= 1 + 1e-9 && Math.abs(p[1]) <= 1 + 1e-9 && Math.abs(p[2]) < 1e-9));
  assert.ok(inside.filter((p) => Math.abs(p[0]) < 0.5 && Math.abs(p[1]) < 0.5).length > 15, 'also in the middle');
  // a filled line that is tilted in space is filled in its own plane
  const tilted = formPoints({ ...path(square.map(([x, y]) => [x, y, x]), { closed: true, mode: 'fill' }), count: 60 });
  assert.ok(tilted.every((p) => Math.abs(p[2] - p[0]) < 1e-9));
  // an open line has no inside: the particles stay on it
  assert.deepEqual(formPoints(path(square, { mode: 'fill' })), formPoints(path(square)));
  // spun around the upright line through its pivot: every particle as far from that line as the outline is there
  const vase = formPoints({ ...path([[0.5, -1, 0], [1, 0, 0], [0.25, 1, 0]], { mode: 'spin' }), count: 200 });
  assert.equal(vase.length, 200);
  for (const p of vase) {
    const want = p[1] < 0 ? 1 + p[1] * 0.5 : 1 - p[1] * 0.75;
    assert.ok(near(Math.hypot(p[0], p[2]), want, 1e-9), `radius at height ${p[1]}`);
  }
  assert.ok(Math.min(...vase.map((p) => p[2])) < -0.5 && Math.max(...vase.map((p) => p[2])) > 0.5, 'all the way round');
  // one corner is one particle; names
  assert.deepEqual(formPoints(path([[1, 2, 3]])), [[1, 2, 3]]);
  assert.equal(formName(zig), 'Drawn line');
  assert.equal(formName(path(square, { closed: true })), 'Drawn shape');
  assert.equal(formName(cloudOf([[0, 0, 0]])), 'Points');
  assert.equal(formName({ shape: 'heart' }), 'Heart');
  // loose points are what they are
  const cloud = cloudOf([[0, 0, 0], [1, 2, 3], [0.123456, 0, 0]]);
  assert.deepEqual(cloud, { shape: CLOUD, count: 3, params: {}, points: [[0, 0, 0], [1, 2, 3], [0.1235, 0, 0]] });
  assert.deepEqual(formPoints(cloud), cloud.points);
  assert.equal(cloudOf(new Array(700).fill([0, 0, 0])).points.length, MAX_POINTS);
  // the points of a form are kept for the next time, and cannot be changed by who gets them
  assert.equal(formPoints(zig), formPoints(path([[-1, 0, 0], [0, 0, 0], [0, 1, 0]])));
  assert.ok(Object.isFrozen(formPoints(zig)) && Object.isFrozen(formPoints(zig)[0]));
  assert.ok(!Object.isFrozen(cloud.points[0]), 'the points of the object itself can still be moved');
  // two forms have the same key exactly when they are the same
  assert.equal(formKey(zig), formKey(JSON.parse(JSON.stringify(zig))));
  assert.notEqual(formKey(zig), formKey(path([[-1, 0, 0], [0, 0, 0], [0, 1.001, 0]])));
  assert.notEqual(formKey(zig), formKey({ ...zig, deform: [tool('twist')] }));
  assert.notEqual(formKey({ ...zig, deform: [tool('twist')] }), formKey({ ...zig, deform: [tool('twist', { angle: 121 })] }));
  // the box and the reach of a form: a shape of the library reaches 1, a shaped one as far as it goes
  assert.equal(formReach({ shape: 'circle', count: 12, params: {} }), 1);
  assert.equal(formReach({ shape: 'circle', count: 12, params: {}, deform: [tool('inflate', { amount: 2 })] }), 3);
  assert.deepEqual(formBox(path(square, { closed: true })), [[-1, -1, 0], [1, 1, 0]]);
  // loading: junk is repaired, what cannot be used is no form
  assert.equal(sanitizeForm({ shape: PATH, path: { nodes: [] } }), null);
  assert.equal(sanitizeForm({ shape: CLOUD, points: 'x' }), null);
  assert.equal(sanitizeForm({ shape: 'no-such-shape' }), null);
  assert.equal(sanitizeForm(null), null);
  assert.deepEqual(sanitizeForm({ shape: PATH, count: 9999, path: { nodes: [[0, 0, 0], ['a', 1, 2], [1e9, 0, 0]], closed: 1, mode: 'zzz' } }),
    { shape: PATH, count: 600, params: {}, path: { nodes: [[0, 0, 0], [50, 0, 0]], closed: true, smooth: false, mode: 'line' } });
  assert.equal(sanitizeForm({ shape: PATH, path: { nodes: new Array(500).fill([0, 0, 0]) } }).path.nodes.length, MAX_CORNERS);
  assert.deepEqual(sanitizeForm({ shape: 'circle', count: 3.4, params: { junk: 1 }, deform: [{ kind: 'twist' }] }),
    { shape: 'circle', count: 3, params: {}, deform: [{ kind: 'twist', on: true, axis: 1, angle: 120 }] });
});

// ---------------------------------------------------------------- running exported code

const ORIGIN = [10, 20, -30];

function checkCode(part, label) {
  assert.ok(part.chars <= LIMITS.chars, `${label}: ${part.chars} characters`);
  assert.ok(part.lines <= LIMITS.lines, `${label}: ${part.lines} lines`);
  for (const line of part.code.split('\n')) assert.ok(line.length <= LIMITS.width, `${label}: a line of ${line.length}: ${line}`);
  assert.ok(/^[\x20-\x7e\n]*$/.test(part.code), `${label}: only plain ASCII`);
  assert.ok(!/[ \t]$/m.test(part.code), `${label}: trailing spaces`);
}

/** Run every part of an export the way stacked code blocks run, and collect the calls. */
function runExport(objects, options = {}) {
  const result = generateCode(objects, options);
  const calls = [];
  result.parts.forEach((part, i) => {
    checkCode(part, `part ${i + 1}`);
    const got = [];
    vm.runInNewContext(part.code, { thisPos: [ORIGIN[0], ORIGIN[1] + i, ORIGIN[2]], api: { playParticleEffect: (o) => got.push(JSON.parse(JSON.stringify(o))) } }, { timeout: 5000 });
    assert.equal(got.length, part.particles, `part ${i + 1}: the number of particles it says`);
    calls.push(...got);
  });
  assert.equal(calls.length, result.particles);
  for (const c of calls) {
    assert.deepEqual(c.pos1, c.pos2);
    assert.ok([...c.pos1, ...c.dir1, ...c.dir2, c.minLifeTime, c.minSize].every(Number.isFinite), 'every number is a number');
    assert.equal(c.manualEmitCount, 1);
    let last = -1;
    for (const g of c.colorGradients) { assert.ok(g.timeFraction > last && g.timeFraction <= 1); last = g.timeFraction; }
    assert.equal(c.colorGradients[0].timeFraction, 0);
    for (const g of c.velocityGradients) assert.ok(g.factor >= 0 && g.factor <= 1 && g.factor === g.factor2);
  }
  return { result, calls };
}

test('shape studio: shaped objects load, are shown and are exported where they stand; old scenes stay as they were', () => {
  const pos = [2, 3, -1];
  const shaped = scene(
    createObject('square', { id: 'a', count: 24, pos, rot: [20, 30, 40], scale: [1.5, 1, 2], deform: [tool('twist'), tool('inflate'), tool('mirror')] }),
    createObject(PATH, { id: 'b', count: 15, pos: [0.5, 2, 0.5], path: { nodes: [[-1, 0, 0], [0, 1, 0], [1, 0, 0.5]], smooth: true } }),
    createObject(CLOUD, { id: 'c', pos: [-2, 1, 0], points: [[0, 0, 0], [0.5, 0.5, 0], [1, 0, -1]] }),
  );
  assert.deepEqual(shaped.map((o) => o.name), ['Square', 'Drawn line', 'Points']);
  assert.deepEqual(shaped.map((o) => localPoints(o).length), [46, 15, 3]);
  assert.equal(shaped[2].count, 3, 'loose points count themselves');
  // loading it again changes nothing
  assert.deepEqual(scene(...JSON.parse(JSON.stringify(shaped))), shaped);
  // the preview shows the deformed points, placed, turned and sized
  const shown = computeParticles(shaped, null);
  assert.equal(shown.length, 64);
  const twisted = applyDeformers(shapePoints('square', 24, {}), shaped[0].deform);
  assert.deepEqual(localPoints(shaped[0]).map((p) => p.slice()), twisted);
  // the exported code puts every particle where the preview shows it
  const { calls, result } = runExport(shaped);
  assert.equal(calls.length, 64);
  const want = shown.map((p) => p.pos.map((v, k) => Math.round((v + ORIGIN[k]) * 100) / 100).join());
  const got = calls.map((c) => c.pos1.map((v) => Math.round(v * 100) / 100).join());
  assert.deepEqual(got.slice().sort(), want.slice().sort());
  assert.ok(!result.parts[0].code.includes('const T ='), 'no timing: written the short way');
  // in a group, with keys, as part of an array: a shaped object is an object like any other
  const moving = scene(
    createGroup({ id: 'g', pos: [0.5, 4, 0.5], keys: [key(2, { pos: [0.5, 4, 0.5], rot: [0, 90, 0] })] }),
    createObject('circle', { id: 'a', count: 12, pos: [3, 0, 0], parent: 'g', life: 1.8, deform: [tool('inflate', { amount: 2 })] }),
  );
  const far = computeParticles(moving, 1.5).map((p) => Math.hypot(p.pos[0] - 0.5, p.pos[2] - 0.5));
  assert.ok(Math.max(...far) > 5.5, 'the inflated ring reaches further from the pivot of its group');
  runExport(moving);
  // a shape that reaches further is turned in finer steps: its corners stay as close to the arc
  const turn = (deform) => planOf(scene(createObject('circle', { id: 't', count: 8, pos: [0, 0, 0], deform, keys: [key(3, { pos: [0, 0, 0], rot: [0, 0, 170] })] }))[0]).pieces.length;
  assert.ok(turn([tool('inflate', { amount: 4 })]) > turn(undefined), 'more stretches for a bigger shape');
  // an object without any of this has none of the new fields, so old files and old code stay as they were
  const plain = scene(createObject('heart', { id: 'h' }))[0];
  for (const field of ['deform', 'path', 'points']) assert.ok(!(field in plain), `no ${field} on a plain object`);
  assert.equal(isShaped(plain), false);
  // junk falls back safely: a line without corners is a single particle, a broken tool is dropped
  const junk = scene({ shape: PATH, path: { nodes: 'x' } }, { shape: 'circle', deform: [{ kind: 'zzz' }, 5] }, { shape: CLOUD, points: [] });
  assert.deepEqual(junk.map((o) => [o.shape, 'deform' in o]), [['point', false], ['circle', false], ['point', false]]);
});

test('shape studio: every shape of the library is what it was, in objects and in files from before', () => {
  // a drawn line and loose points have ids no shape of the library can have (the library has a picture called "cloud")
  for (const id of [PATH, CLOUD]) assert.ok(!/^[a-z0-9-]+$/.test(id) && !SHAPE_BY_ID[id], `"${id}" is not an id of the library`);
  for (const def of SHAPES) assert.match(def.id, /^[a-z0-9-]+$/, `the id of ${def.name}`);
  assert.ok(SHAPE_BY_ID.cloud && SHAPE_BY_ID.line, 'the library has a cloud and a line');
  assert.equal(SHAPES.length, 3190);
  let points = 0;
  for (const def of SHAPES) {
    // as a file from before the Shape Studio has it: the shape, how many, and nothing about tools, lines or points
    const [obj] = scene({ id: 'x', shape: def.id, count: def.count, pos: [1, 2, 3] });
    assert.equal(obj.shape, def.id, `${def.id} is still ${def.id}`);
    assert.equal(obj.count, def.count);
    assert.equal(obj.name, def.name);
    for (const field of ['deform', 'path', 'points']) assert.ok(!(field in obj), `${def.id}: no ${field}`);
    assert.equal(localPoints(obj), shapePoints(def.id, def.count, obj.params), `${def.id}: the very points of the library`);
    points += localPoints(obj).length;
  }
  assert.ok(points > 100000, `${points} points`);
  // the cloud of the library, by name: 30 particles in the outline of a cloud, not loose points
  const [cloud] = scene({ shape: 'cloud', count: 30 });
  assert.deepEqual([cloud.name, cloud.count, localPoints(cloud).length, 'points' in cloud], ['Cloud', 30, 30, false]);
  const { calls } = runExport([cloud]);
  assert.equal(calls.length, 30);
  // an object as a file from before has it loads to exactly what it loaded to then: the fields it has, in their order
  const old = { id: 'o', name: 'Heart', shape: 'heart', count: 40, params: {}, pos: [0.5, 2, 0.5], rot: [0, 0, 0], scale: [1, 1, 1], texture: 'glint', color: '#ffd24a',
    color2: null, size: 0.3, size2: null, life: 6, fade: false, blend: 1, move: [0, 0, 0], spread: 0, expand: 0, gravity: 0, hidden: false, start: 0, fadeIn: false,
    keys: [{ t: 1, pos: [3, 2, 0.5], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth' }], spin: false, parent: null, repeat: 1, every: 0.5 };
  const [loaded] = scene(old);
  assert.deepEqual(Object.keys(loaded).sort(), Object.keys(old).sort());
  assert.deepEqual(loaded, old);
});

// ---------------------------------------------------------------- morph: who becomes whom

test('morph: every particle gets a partner, on short ways that do not cross', () => {
  const shapes = {
    ring: circle(24), star: shapePoints('star', 40, {}), heart: shapePoints('heart', 24, {}), cube: cube(30),
    few: shapePoints('triangle', 12, {}), dot: [[0, 0, 0]], wide: circle(40), ball: shapePoints('sphere', 30, {}),
  };
  const cost = (a, b, pairs) => pairs.reduce((sum, [i, j]) => sum + dist(a[i], b[j]) ** 2, 0);
  const cases = [['ring', 'heart'], ['ring', 'star'], ['star', 'ring'], ['cube', 'few'], ['few', 'cube'], ['dot', 'ring'], ['ring', 'dot'], ['heart', 'heart'],
    ['wide', 'star'], ['cube', 'ball']];
  for (const [from, to] of cases) {
    const a = shapes[from];
    const b = shapes[to];
    const m = matchPoints(a, b);
    const label = `${from} to ${to}`;
    assert.equal(m.kind, a.length === b.length ? null : a.length > b.length ? 'out' : 'in', label);
    const all = [...m.stay, ...m.extra];
    // every particle of the bigger shape exactly once, every particle of the smaller one at least once
    const firsts = all.map((p) => p[0]).sort((x, y) => x - y);
    const seconds = all.map((p) => p[1]).sort((x, y) => x - y);
    assert.equal(all.length, Math.max(a.length, b.length), label);
    assert.deepEqual([...new Set(firsts)], a.map((_, i) => i), `${label}: every particle of the first shape`);
    assert.deepEqual([...new Set(seconds)], b.map((_, i) => i), `${label}: every particle of the second shape`);
    // the ones that stay: one for each particle of the smaller shape, each of both shapes at most once
    assert.equal(m.stay.length, Math.min(a.length, b.length), label);
    assert.equal(new Set(m.stay.map((p) => p[0])).size, m.stay.length, label);
    assert.equal(new Set(m.stay.map((p) => p[1])).size, m.stay.length, label);
    // the extra ones are shared out evenly: no particle of the smaller shape has two more than another
    const share = new Map();
    for (const [i, j] of all) share.set(a.length <= b.length ? i : j, (share.get(a.length <= b.length ? i : j) || 0) + 1);
    assert.ok(Math.max(...share.values()) - Math.min(...share.values()) <= 1, `${label}: shared out evenly`);
    // no two ways cross: swapping the ends of any two would not make them shorter
    for (let x = 0; x < all.length; x++) {
      for (let y = x + 1; y < all.length; y++) {
        const now = dist(a[all[x][0]], b[all[x][1]]) ** 2 + dist(a[all[y][0]], b[all[y][1]]) ** 2;
        const swapped = dist(a[all[x][0]], b[all[y][1]]) ** 2 + dist(a[all[y][0]], b[all[x][1]]) ** 2;
        if (a.length >= b.length ? all[x][1] !== all[y][1] : all[x][0] !== all[y][0]) assert.ok(now <= swapped + 1e-9, `${label}: ways ${x} and ${y} cross`);
      }
    }
    if (a.length === b.length && from !== to) {
      // never longer than taking the particles by their numbers ...
      const byNumbers = a.map((_, i) => [i, i]);
      assert.ok(cost(a, b, m.stay) <= cost(a, b, byNumbers) + 1e-9, `${label}: not longer than by the numbers`);
      // ... and the order a shape lists its particles in does not decide how it looks:
      // with the second shape listed backwards the ways are as short, and far shorter than by the numbers
      const back = b.slice().reverse();
      const again = matchPoints(a, back).stay;
      assert.ok(cost(a, back, again) < cost(a, back, byNumbers) * 0.5, `${label}, listed backwards: far shorter than by the numbers`);
      assert.ok(cost(a, back, again) < cost(a, b, m.stay) * 1.2 + 1e-9, `${label}, listed backwards: as short as before`);
    }
    // the same shapes, the same partners
    assert.deepEqual(matchPoints(a.map((p) => p.slice()), b.map((p) => p.slice())), m, `${label}: steady`);
  }
  // a shape onto itself: nothing moves
  assert.deepEqual(matchPoints(shapes.ring, shapes.ring).stay, shapes.ring.map((_, i) => [i, i]));
  // where the shapes stand does not matter, only how they are laid out
  const moved = shapes.heart.map((p) => [p[0] + 30, p[1] - 7, p[2] + 2]);
  assert.deepEqual(matchPoints(shapes.ring, moved), matchPoints(shapes.ring, shapes.heart));
  // the same shape with other tools: every particle keeps its number
  const turned = shapes.ring.map((p) => [-p[0], -p[1], p[2]]);
  assert.deepEqual(matchPoints(shapes.ring, turned, true).stay, shapes.ring.map((_, i) => [i, i]));
  assert.notDeepEqual(matchPoints(shapes.ring, turned, false).stay, shapes.ring.map((_, i) => [i, i]));
});

// ---------------------------------------------------------------- morph: the plan, the preview and the game

const STAR = { shape: 'star', count: 20 };

test('morph: a key can change the shape, and every particle flies straight to its new place', () => {
  const [obj] = one({ keys: [key(1), key(2, { pos: [3.5, 2, 0.5], rot: [0, 0, 30], form: STAR })] });
  assert.deepEqual(obj.keys[1].form, { shape: 'star', count: 20, params: { points: 5, inner: 0.45 } });
  assert.equal(obj.keys[0].form, undefined);
  // the forms it has: the one it starts with, kept by a key that sets none, then the star
  const forms = formsOf(obj);
  assert.deepEqual(forms.map((f) => f.shape), ['circle', 'circle', 'star']);
  assert.equal(formAt(obj, 1.99).shape, 'circle', 'on the way to the key it still has the old one');
  assert.equal(formAt(obj, 2).shape, 'star');
  assert.equal(formsOf(one({ keys: [key(1)] })[0]), null, 'no key changes the shape');
  // before: the ring. After: the star, where the key says. In between: straight lines.
  const ring = computeParticles([obj], 0.5).map((p) => p.pos);
  assert.equal(ring.length, 12);
  const star = computeParticles([obj], 2.5).map((p) => p.pos);
  assert.equal(star.length, 20);
  const want = computeParticles(scene(createObject('star', { count: 20, pos: [3.5, 2, 0.5], rot: [0, 0, 30] })), null).map((p) => p.pos);
  for (const p of want) assert.ok(Math.min(...star.map((q) => dist(p, q))) < 1e-9, 'every point of the star has its particle');
  const at = (t) => computeParticles([obj], t);
  const [a, b, c] = [at(1.2), at(1.5), at(1.8)];
  assert.equal(b.length, 20, 'in between: as many as the bigger shape');
  for (let i = 0; i < b.length; i++) {
    // (smooth: slow at both ends, so the middle of the time is the middle of the way)
    const straight = dist(a[i].pos, c[i].pos) - dist(a[i].pos, b[i].pos) - dist(b[i].pos, c[i].pos);
    assert.ok(Math.abs(straight) < 1e-9, `particle ${i} flies a straight line`);
  }
  // 12 stay what they are, 8 come in: unseen at the start of the change, there at the end
  const alphas = (list) => list.map((p) => Math.round(p.alpha * 100) / 100).sort((x, y) => x - y);
  assert.deepEqual(alphas(b), [...new Array(8).fill(0.5), ...new Array(12).fill(1)]);
  assert.ok(alphas(at(1.95)).every((v) => v > 0.9));
  // the plan: two parts while it changes (those that stay, those that come in), and both stay on afterwards
  const plan = planOf(obj);
  assert.deepEqual(plan.pieces.map((p) => [p.set, p.pts.length, p.P.length, p.V ? p.V.length : 0, p.fade ? p.fade[0] : '']),
    [['m2', 12, 21, 21, ''], ['m2in', 8, 21, 21, 'in'], ['m2', 12, 21, 0, ''], ['m2in', 8, 21, 0, '']]);
  assert.ok(plan.pieces.every((p) => p.pts[0].length === 6), 'rows of six numbers: where it starts, which way it goes');
  // fewer particles in the new shape: the ones that are too many fly into others and fade away
  const [less] = one({ count: 30, keys: [key(1), key(2, { form: { shape: 'square', count: 12 } })] });
  assert.deepEqual(planOf(less).pieces.map((p) => [p.set, p.pts.length, p.fade ? p.fade[0] : '']), [['m2', 12, ''], ['m2out', 18, 'out'], ['m2', 12, '']]);
  assert.equal(computeParticles([less], 0.5).length, 30);
  assert.deepEqual(alphas(computeParticles([less], 1.5)), [...new Array(18).fill(0.5), ...new Array(12).fill(1)]);
  assert.equal(computeParticles([less], 2.5).length, 12);
  // a jump: the new shape is there at once, nothing flies
  const [jump] = one({ keys: [key(1, { form: STAR, ease: 'jump' })] });
  assert.ok(planOf(jump).pieces.every((p) => !p.V));
  assert.deepEqual([0.99, 1.01].map((t) => computeParticles([jump], t).length), [12, 20]);
  // the same shape with other tools at the key: every particle keeps its number, so a twist twists
  const [bent] = one({ shape: 'square', count: 16, keys: [key(2, { form: { shape: 'square', count: 16, deform: [tool('lean', { amount: 1 })] } })] });
  const lean = computeParticles([bent], 3).map((p) => p.pos);
  const upright = computeParticles([bent], 0).map((p) => p.pos);
  assert.equal(planOf(bent).pieces[0].pts.length, 16);
  for (let i = 0; i < 16; i++) assert.ok(near(lean[i][0] - upright[i][0], upright[i][1] - 2, 1e-9), 'each point leans by its own height');
  // another shape with as many particles: partners by the shortest ways, not by their numbers. (A heart that
  // stands on its head: by their numbers every particle would cross to the other side.)
  const [flip] = one({ count: 24, keys: [key(2, { rot: [0, 0, 180], form: { shape: 'heart', count: 24 } })] });
  const rows = planOf(flip).pieces[0].pts;
  assert.equal(rows.length, 24);
  const flown = rows.reduce((n, r) => n + r[3] ** 2 + r[4] ** 2 + r[5] ** 2, 0);
  const starts = computeParticles([flip], 0).map((p) => p.pos);
  const ends = computeParticles(scene(createObject('heart', { count: 24, pos: [0.5, 2, 0.5], rot: [0, 0, 180] })), null).map((p) => p.pos);
  const byNumber = starts.reduce((n, p, i) => n + dist(p, ends[i]) ** 2, 0);
  assert.ok(flown < byNumber * 0.25, `the ways: ${flown.toFixed(2)} (by their numbers ${byNumber.toFixed(2)})`);
  for (const p of ends) assert.ok(Math.min(...computeParticles([flip], 3).map((q) => dist(p, q.pos))) < 1e-9, 'and still every point of the heart has its particle');
  // a key whose form is the one it has already changes nothing, and costs nothing
  const [same] = one({ keys: [key(2, { pos: [3, 2, 0.5], form: { shape: 'circle', count: 12 } })] });
  const [none] = one({ keys: [key(2, { pos: [3, 2, 0.5] })] });
  assert.deepEqual(planOf(same).pieces.map((p) => [p.show, p.end, p.P]), planOf(none).pieces.map((p) => [p.show, p.end, p.P]));
  // while it is gone, an object whose keys changed its shape is drawn in the shape it ended with
  assert.equal(computeParticles([obj], 60, { ghosts: true }).length, 20);
  assert.equal(computeParticles([obj], 60).length, 0);
  // loading: a key keeps a sound form, loses a broken one; a single particle and a group have none
  const loaded = scene(
    createObject('circle', { id: 'a', keys: [key(1, { form: { shape: 'nope' } }), key(2, { form: { shape: CLOUD, points: [[0, 0, 0], [1, 1, 1]] } })] }),
    createObject('point', { id: 'b', keys: [key(1, { form: STAR })] }),
    createGroup({ id: 'g', keys: [key(1, { form: STAR })] }),
  );
  assert.deepEqual(loaded.map((o) => o.keys.map((k) => (k.form ? k.form.shape : ''))), [['', CLOUD], [''], ['']]);
});

/** How much of a particle of the copy of the engine is seen (0 to 1), the way its blend mode draws it. */
function strength(particle, call) {
  if (call.blendMode !== 0) return particle.color[3];
  const full = Math.max(1, ...call.colorGradients.map((g) => Math.max(...g.minColor.slice(0, 3)))); // mode 0 ignores alpha
  return (Math.max(...particle.color.slice(0, 3)) * 255) / full;
}

/**
 * Export a scene, play the code in the copy of the game's particle engine and
 * compare what is seen, moment by moment, with what the studio shows.
 */
function playAndCompare(objects, { fps = 60, every = 1 } = {}) {
  const { result, calls } = runExport(objects);
  const h = frameAge(fps);
  const engine = calls.map((c) => ({ c, p: createParticle(c, () => 0.5), alive: true }));
  const total = sceneDuration(objects) * LIFE_PER_SECOND;
  // how many times a particle takes over from another: the moments at which pieces of a plan begin, but for the first
  const tree = sceneTree(objects);
  let handovers = 0;
  for (const leaf of tree.leaves()) {
    for (const play of tree.playsOf(leaf)) handovers += new Set(planOf(leaf, play).pieces.map((p) => p.show.toFixed(6))).size - 1;
  }
  const stat = {
    handovers, result, particles: calls.length, off: 0, offAt: 0, checked: 0, miscount: 0, moments: 0, gap: 0, gapAt: 0, twice: 0, doubles: 0, drift: 0 };
  for (let f = 1; f * h < total + 0.05; f++) {
    for (const e of engine) e.alive = e.alive && e.p.update(h);
    if (f % every) continue;
    const t = (f * h) / LIFE_PER_SECOND;
    const shown = computeParticles(objects, t);
    const inGame = engine.filter((e) => e.alive && strength(e.p, e.c) > 0);
    stat.moments++;
    // how much is seen in all (what fades counts by how visible it is): too little is a gap, too much is something shown twice
    const sum = (list) => list.reduce((n, v) => n + v, 0);
    const more = sum(inGame.map((e) => strength(e.p, e.c))) - sum(shown.map((p) => p.alpha));
    if (-more > stat.gap) { stat.gap = -more; stat.gapAt = t; }
    stat.twice = Math.max(stat.twice, more);
    if (more > 0.5) stat.doubles++; // (for a moment, when one particle takes over from another, both are there)
    else stat.drift = Math.max(stat.drift, Math.abs(more));
    const solid = shown.filter((p) => p.alpha > 0.5);
    if (solid.length !== inGame.filter((e) => strength(e.p, e.c) > 0.5).length) { stat.miscount++; continue; } // the very frame of a hand-over
    for (const p of solid) {
      const at = p.pos.map((v, j) => v + ORIGIN[j]);
      let best = Infinity;
      let twin = null;
      for (const e of inGame) { const d = dist(at, e.p.position); if (d < best) { best = d; twin = e; } }
      // (the game is up to one frame ahead of the preview, which has no frames, and its pull lags half a frame behind)
      const off = best - 1.1 * Math.hypot(...twin.c.dir1) * h - 0.5 * Math.abs(twin.c.gravity[1]) * f * h * h;
      if (off > stat.off) { stat.off = off; stat.offAt = t; }
      stat.checked++;
    }
  }
  return stat;
}

const MORPHS = {
  'more particles': { keys: [key(1), key(2, { pos: [3.5, 2, 0.5], form: STAR })] },
  'fewer particles': { count: 30, keys: [key(1), key(2, { pos: [3.5, 3, 0.5], form: { shape: 'square', count: 12 } })] },
  'as many, at a steady pace': { count: 24, keys: [key(1.5, { form: { shape: 'heart', count: 24 }, ease: 'linear' })] },
  'at once, slowing down, turned and bigger': { count: 24, keys: [key(1.5, { form: { shape: 'heart', count: 24 }, ease: 'out', rot: [0, 90, 0], scale: [2, 2, 2] })] },
  'then moves on, then changes again': {
    keys: [key(1, { form: STAR }), key(2, { pos: [3, 4, 1], rot: [0, 0, 90] }), key(3, { form: { shape: 'cube', count: 30 }, ease: 'in' })],
  },
  'with a jump': { keys: [key(1, { form: STAR, ease: 'jump' }), key(2, { pos: [3, 2, 0.5] })] },
  'with another colour and size': { keys: [key(1.5, { form: STAR, color: '#ff0000', size: 0.8 })] },
  'while it fades in and out': { fade: true, fadeIn: true, life: 3, keys: [key(1), key(3, { form: STAR })] },
  'a tool that changes at the key': {
    count: 30, shape: 'square',
    keys: [key(2, { form: { shape: 'square', count: 30, deform: [{ kind: 'twist', axis: 1, angle: 180 }, { kind: 'inflate', amount: 0.5 }] } })],
  },
  'starts late, then flies off and falls': { start: 1, move: [0, 1, 0], gravity: -2, keys: [key(1, { form: STAR })] },
  'flies apart when it has changed': { expand: 0.5, life: 1.5, keys: [key(1, { pos: [2, 3, 0.5], rot: [0, 0, 45], form: STAR })] },
  'into a drawn line, in blend mode 0': { blend: 0, keys: [key(1.5, { form: { shape: PATH, count: 18, path: { nodes: [[-1, 0, 0], [0, 1, 1], [1, 0, 0]], smooth: true } } })] },
};

/**
 * What the comparison has to show, by the measure of the tests for keys
 * without a morph (tests/core.test.mjs): every particle where the studio shows
 * it, nothing missing at any moment, and what fades as visible as the studio
 * shows it.
 */
function checkPlay(s, label, { fps, count, soft = false, reach = 0.012 }) {
  assert.ok(s.checked > count * 60 * (fps / 60) * 0.5, `${label}: ${s.checked} comparisons`);
  assert.ok(s.off < reach, `${label}: ${s.off.toFixed(4)} blocks off at ${s.offAt.toFixed(2)} s`);
  // In the frame in which one particle takes over from another, both can be there: a frame or two each time.
  assert.ok(s.miscount <= 3 * s.handovers, `${label}: ${s.miscount} of ${s.moments} moments with another number of particles (${s.handovers} times one takes over)`);
  assert.ok(s.doubles <= 3 * s.handovers && s.twice <= s.particles, `${label}: shown twice in ${s.doubles} frames (${s.handovers} times one takes over)`);
  // Nothing is ever missing, and what fades is as visible as the studio shows it. (Below 20 frames a second a
  // shape that fades, or changes its colour or size, can be faint for the one frame in which one particle takes
  // over from another: so it is without a morph too.)
  if (soft && fps < 20) return;
  assert.ok(s.gap < 0.05, `${label}: ${s.gap.toFixed(2)} particles are missing at ${s.gapAt.toFixed(3)} s`);
  assert.ok(s.drift < 0.05, `${label}: what fades is ${s.drift.toFixed(3)} of a particle more or less visible than shown`);
}

test('morph: the exported code plays in the copy of the engine the way the studio shows it, at any frame rate', () => {
  for (const [name, fields] of Object.entries(MORPHS)) {
    const objects = one(fields);
    const soft = !!(fields.fade || fields.fadeIn || fields.keys.some((k) => k.color || k.size));
    for (const fps of [144, 60, 30, 20, 12]) {
      checkPlay(playAndCompare(objects, { fps }), `${name} at ${fps} fps`, { fps, count: Math.min(objects[0].count, 12), soft });
    }
  }
});

const inGroup = (o = {}) => createObject('circle', { id: 'c', count: 12, pos: [3, 0, 0], parent: 'g', life: 3, ...o });
const ckey = (t, o = {}) => ({ t, pos: [3, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth', ...o });
const gkey = (t, o = {}) => ({ t, pos: [0.5, 4, 0.5], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth', ...o });

test('morph: in groups that stand, turn, move and repeat', () => {
  const cases = {
    'a group that stands, turned and twice the size': scene(
      createGroup({ id: 'g', pos: [0.5, 4, 0.5], rot: [0, 30, 0], scale: [2, 2, 2] }),
      inGroup({ keys: [ckey(1), ckey(2, { pos: [1, 1, 0], form: STAR })] })),
    'a group that turns': scene(
      createGroup({ id: 'g', pos: [0.5, 4, 0.5], keys: [gkey(3, { rot: [0, 180, 0], ease: 'linear' })] }),
      inGroup({ keys: [ckey(1), ckey(2, { pos: [3, 1, 0], form: STAR })] })),
    'a group that reaches a key in the middle of the change': scene(
      createGroup({ id: 'g', pos: [0.5, 4, 0.5], keys: [gkey(1.5, { pos: [4, 4, 0.5] }), gkey(3, { pos: [4, 8, 0.5], rot: [0, 0, 90] })] }),
      inGroup({ count: 30, keys: [ckey(1), ckey(2.5, { form: { shape: 'heart', count: 14 }, color: '#00ff00' })] })),
    'a group that is played twice': scene(
      createGroup({ id: 'g', pos: [0.5, 4, 0.5], repeat: 2, every: 2.5, keys: [gkey(2, { pos: [3, 4, 0.5] })] }),
      inGroup({ life: 1.2, keys: [ckey(1.5, { form: STAR })] })),
  };
  for (const [name, objects] of Object.entries(cases)) {
    const tree = sceneTree(objects);
    const leaf = objects.find((o) => o.id === 'c');
    const plan = planOf(leaf, tree.playsOf(leaf)[0]);
    assert.equal(plan.rough, '', `${name}: every stretch could be cut finely enough`);
    // (what a group moves flies its curves in straight stretches, at most 0.06 block off them: so it is without a morph too)
    for (const fps of [144, 60, 20]) checkPlay(playAndCompare(objects, { fps }), `${name} at ${fps} fps`, { fps, count: 12, reach: 0.065 });
  }
  // in a group that turns, the change is flown in several straight stretches, so it follows the turn
  const turning = cases['a group that turns'];
  const leaf = turning.find((o) => o.id === 'c');
  const pieces = planOf(leaf, sceneTree(turning).playsOf(leaf)[0]).pieces;
  assert.ok(pieces.filter((p) => p.set === 'm2' && p.V).length >= 3, 'several stretches for the ones that stay');
  assert.ok(pieces.filter((p) => p.set === 'm2in').every((p) => p.fade && near(p.fade[1], 0.6) && near(p.fade[2], 1.2)), 'one fade over all of them');
});

test('morph: it fits the limits of a code block, and scenes without one export the code they always did', () => {
  // the helper only learns about rows when a key changes a shape
  const plain = generateCode(one({ keys: [key(2, { pos: [3, 2, 0.5] })] })).parts[0].code;
  assert.ok(!plain.includes('const N ='), 'no morph: the helper is the one it always was');
  assert.ok(plain.includes('for (let i = 0; i < d.length; i += 3) {'));
  const morph = generateCode(one(MORPHS['more particles'])).parts[0].code;
  assert.ok(morph.includes('const N = s[0][1].length / 3 - 1') && morph.includes('for (let i = 0; i < d.length; i += N) {'));
  // one T(...) for those that stay and one for those that come in; the shape it ends with is not written a second time
  assert.equal((morph.match(/^T\(/gm) || []).length, 2);
  // a morph that goes on to move writes the points of the new shape once more, for the moves
  assert.equal((generateCode(one(MORPHS['then moves on, then changes again'])).parts[0].code.match(/^T\(/gm) || []).length, 5);
  // big shapes: split over code blocks like everything else, every part within the limits (checked by runExport)
  const big = one({ count: 600, keys: [key(1), key(2, { form: { shape: 'heart', count: 600 } }), key(3, { form: { shape: 'star', count: 560 } })] });
  const { result, calls } = runExport(big);
  assert.ok(result.parts.length > 1, `${result.parts.length} code blocks`);
  assert.equal(calls.length, result.particles);
  // the number of particles the game makes: every row once for each piece it has
  const plan = planOf(big[0]);
  assert.equal(result.particles, plan.pieces.reduce((n, p) => n + p.pts.length, 0));
  // World Code and the function take a morph too
  for (const target of ['world', 'function']) {
    const code = generateCode(one(MORPHS['fewer particles']), { target }).parts[0].code;
    assert.ok(code.includes('const N ='), target);
  }
});

// ---------------------------------------------------------------- the edits: Morph, Join, loose points

test('edits: Morph gives the first shape keys for it and takes the second away, in groups too', () => {
  const pair = () => scene(
    createObject('circle', { id: 'a', name: 'Ring', count: 12, pos: [0.5, 2, 0.5], color: '#ff0000', life: 1.2 }),
    createObject('star', { id: 'b', name: 'Star', count: 20, pos: [3, 3, 0.5], rot: [0, 0, 45], scale: [2, 2, 2], color: '#00ff00', size: 0.6 }),
  );
  let objects = pair();
  const done = morphNodes(objects, ['a', 'b']);
  assert.deepEqual([done.objects.length, done.ids, done.from, done.to], [1, ['a'], MORPH_WAIT, MORPH_WAIT + MORPH_TIME]);
  const a = scene(...done.objects)[0];
  assert.deepEqual(a.keys.map((k) => [k.t, k.pos, k.rot, k.scale, k.form ? k.form.shape : '', k.color || '', k.size || 0]), [
    [1, [0.5, 2, 0.5], [0, 0, 0], [1, 1, 1], '', '', 0],
    [2.5, [3, 3, 0.5], [0, 0, 45], [2, 2, 2], 'star', '#00ff00', 0.6],
  ]);
  // it lasts long enough to be seen as what it has become
  assert.ok(sceneDuration([a]) >= 2.5 + 1.9, `${sceneDuration([a])} seconds`);
  // when it is over, the particles are where the second shape stood
  const star = computeParticles([pair()[1]], null).map((p) => p.pos);
  const after = computeParticles([a], 3).map((p) => p.pos);
  assert.equal(after.length, 20);
  for (const p of star) assert.ok(Math.min(...after.map((q) => dist(p, q))) < 1e-6);
  assert.ok(computeParticles([a], 3).every((p) => p.rgb[1] > 250 && p.rgb[0] < 5 && near(p.size, 0.6)), 'in its colour and its size');
  // the other way round, with other times, and without a wait (one key only)
  objects = pair();
  const back = morphNodes(objects, ['b', 'a'], { wait: 0, time: 0.4 });
  assert.deepEqual([back.objects[0].id, back.objects[0].keys.length, back.from, back.to], ['b', 1, 0, 0.4]);
  // after keys it has already: the morph comes after the last of them
  objects = pair();
  objects[0].keys = [key(2, { pos: [0.5, 5, 0.5] })];
  const later = morphNodes(objects, ['a', 'b'], { wait: 0.5, time: 1 });
  assert.deepEqual(later.objects[0].keys.map((k) => k.t), [2, 2.5, 3.5]);
  assert.deepEqual(later.objects[0].keys[1].pos, [0.5, 5, 0.5], 'it waits where its last key left it');
  // in groups: the first one ends where the second one stood in the scene
  const grouped = () => scene(
    createGroup({ id: 'g', pos: [5, 1, -2], rot: [0, 90, 0], scale: [2, 2, 2] }),
    createObject('circle', { id: 'a', count: 12, pos: [1, 0, 0], parent: 'g' }),
    createGroup({ id: 'h', pos: [-3, 2, 1], rot: [0, 0, 30] }),
    createObject('heart', { id: 'b', count: 14, pos: [0, 1, 0], rot: [10, 20, 0], parent: 'h' }),
  );
  const stood = stillPoints(sceneTree(grouped()), grouped()[3]);
  const merged = scene(...morphNodes(grouped(), ['a', 'b']).objects);
  assert.deepEqual(merged.map((o) => o.id), ['g', 'a', 'h']);
  const ends = computeParticles(merged, 4).map((p) => p.pos);
  assert.equal(ends.length, 14);
  for (const p of stood) assert.ok(Math.min(...ends.map((q) => dist(p, q))) < 0.01, 'where the second one stood');
  // a single particle can change into a shape, and a shape into a single particle
  const dotted = scene(createObject('point', { id: 'a', pos: [0.5, 2, 0.5] }), createObject('star', { id: 'b', count: 20, pos: [2, 2, 0.5] }));
  const burst = scene(...morphNodes(dotted, ['a', 'b']).objects)[0];
  assert.deepEqual([burst.shape, burst.points, burst.keys[1].form.shape], [CLOUD, [[0, 0, 0]], 'star']);
  assert.deepEqual([0.5, 1.75, 3].map((t) => computeParticles([burst], t).length), [1, 20, 20]);
  const inward = scene(...morphNodes(scene(...JSON.parse(JSON.stringify(dotted))), ['b', 'a']).objects)[0];
  assert.deepEqual([0.5, 3].map((t) => computeParticles([inward], t).length), [20, 1]);
  // what cannot be done says why, and changes nothing
  const before = JSON.stringify(pair());
  objects = pair();
  for (const ids of [['a'], ['a', 'a'], ['a', 'zzz'], ['a', 'b', 'a']]) assert.match(morphNodes(objects, ids).error, /Morph turns one shape into another/);
  assert.match(morphNodes(scene(createGroup({ id: 'g' }), ...pair()), ['g', 'a']).error, /group cannot be morphed/);
  objects[0].keys = Array.from({ length: MAX_KEYS - 1 }, (_, i) => key(1 + i));
  const full = JSON.stringify(objects);
  assert.match(morphNodes(objects, ['a', 'b']).error, /11 keys already/);
  assert.equal(JSON.stringify(objects), full);
  assert.equal(JSON.stringify(pair()), before);
  // Copy keys takes a morph along
  const clip = copyKeys(a);
  const other = scene(createObject('square', { id: 'o', count: 16, pos: [0, 0, 0] }))[0];
  assert.equal(pasteKeys(other, clip, 0).ok, true);
  assert.deepEqual(other.keys.map((k) => (k.form ? k.form.shape : '')), ['', 'star']);
});

test('edits: Join and "Turn into loose points" keep every particle where it is', () => {
  const objects = scene(
    createGroup({ id: 'g', pos: [1, 2, 3], rot: [0, 45, 0], scale: [2, 1, 1] }),
    createObject('circle', { id: 'a', count: 12, pos: [0.5, 2, 0.5], rot: [30, 0, 0], scale: [2, 2, 2], parent: 'g', color: '#123456' }),
    createObject('star', { id: 'b', count: 20, pos: [3, 3, 0.5], rot: [0, 0, 45], deform: [tool('twist')] }),
    createObject('point', { id: 'c', pos: [-1, 0, 0] }),
  );
  const before = computeParticles(objects, null).map((p) => p.pos);
  const done = joinNodes(objects, ['a', 'b', 'c']);
  assert.deepEqual([done.objects.map((o) => o.id), done.ids, done.left], [['g', 'a'], ['a'], 0]);
  const joined = scene(...done.objects);
  assert.deepEqual([joined[1].shape, joined[1].count, joined[1].color, joined[1].parent], [CLOUD, 33, '#123456', 'g']);
  const after = computeParticles(joined, null).map((p) => p.pos);
  assert.equal(after.length, before.length);
  // (the points are written with four decimals, in the frame of the first shape: here that is sized 2 in a group sized 2)
  before.forEach((p, i) => assert.ok(dist(p, after[i]) < 4e-4, `particle ${i} moved by ${dist(p, after[i])}`));
  // A key of the first shape that changed its shape: the key stays, with its place and its time, but what was
  // joined stays joined (or all that was joined would turn into the one shape of that key).
  const keyed = scene(
    createObject('circle', { id: 'a', count: 12, pos: [0.5, 2, 0.5], keys: [key(1, { pos: [4, 2, 0.5], form: { shape: 'star', count: 20 } })] }),
    createObject('heart', { id: 'b', count: 10, pos: [3, 3, 0.5] }),
  );
  const kept = scene(...joinNodes(keyed, ['a', 'b']).objects);
  assert.deepEqual(kept[0].keys.map((k) => [k.t, k.pos, 'form' in k]), [[1, [4, 2, 0.5], false]]);
  assert.equal(computeParticles(kept, 3).length, 22, 'all of them, after the key too');
  // more points than a shape can hold: the rest is left out, and the count says so
  const many = scene(...[0, 1, 2].map((n) => createObject('circle', { id: `m${n}`, count: 250, pos: [n, 2, 0] })));
  const cut = joinNodes(many, ['m0', 'm1', 'm2']);
  assert.deepEqual([cut.left, cut.objects[0].points.length], [150, MAX_POINTS]);
  // what cannot be joined
  assert.match(joinNodes(objects, ['a']).error, /two or more shapes/);
  assert.match(joinNodes(scene(createGroup({ id: 'g' }), createObject('circle', { id: 'a' })), ['g', 'a']).error, /no groups/);
  // loose points: the shape with its sliders and its tools worked in
  const [shape] = scene(createObject('star', { id: 's', count: 20, params: { points: 7 }, deform: [tool('twist'), tool('inflate')] }));
  const points = localPoints(shape).map((p) => p.slice());
  bakeForm(shape);
  assert.deepEqual([shape.shape, shape.count, shape.params, 'deform' in shape], [CLOUD, 20, {}, false]);
  localPoints(shape).forEach((p, i) => assert.ok(dist(p, points[i]) < 1e-4));
  // the form of a key can be worked in as well
  const form = { shape: 'circle', count: 8, params: {}, deform: [tool('inflate', { amount: 1 })] };
  bakeForm(form);
  assert.equal(form.shape, CLOUD);
  assert.ok(form.points.every((p) => near(Math.hypot(...p), 2, 1e-3)));
});

test('edits: what the Shape Studio and Morph make is saved as it is, and copies have forms of their own', () => {
  const make = () => scene(
    createObject(PATH, { id: 'p', count: 9, pos: [0.5, 2, 0.5], path: { nodes: [[-1, 0, 0], [0, 1, 0], [1, 0, 0]] }, deform: [tool('pull', { to: [0, 2, 0] })],
      keys: [key(1, { form: { shape: CLOUD, points: [[0, 0, 0], [1, 1, 1]], deform: [tool('twist')] } })] }),
    createObject(CLOUD, { id: 'c', pos: [3.333333, 2.1234567, 0.5], rot: [10.123456, 0, 45], color: '#00ff00', size: 0.6, points: [[0, 0, 0], [0.5, 0.5, 0], [1, 0, 0]] }),
    createObject('heart', { id: 'h', count: 14, pos: [-2, 2, 0.5], deform: [tool('inflate')] }),
    createObject('point', { id: 'dot', pos: [0, 5, 0] }),
  );
  // what an edit leaves is what loading the saved file gives: to the letter, so nothing changes by saving and loading
  const saved = (objects) => assert.equal(JSON.stringify(scene(...JSON.parse(JSON.stringify(objects)))), JSON.stringify(objects));
  for (const pair of [['p', 'c'], ['c', 'h'], ['h', 'p'], ['dot', 'h'], ['h', 'dot']]) saved(morphNodes(make(), pair).objects);
  saved(joinNodes(make(), ['p', 'c', 'h', 'dot']).objects);
  const baked = make();
  bakeForm(baked[0]);
  bakeForm(baked[0].keys[0].form);
  bakeForm(baked[2]);
  saved(baked);
  // copies: the same form, and nothing of it shared with what they were copied from (or a corner dragged in one would move in both)
  const shared = (a, b) => (!a || !b || typeof a !== 'object' || typeof b !== 'object' ? 0 : a === b ? 1 : Object.keys(a).reduce((n, k) => n + shared(a[k], b[k]), 0));
  for (const [name, run] of Object.entries({
    duplicate: (o) => duplicateNodes(o, ['p', 'c', 'h']),
    mirror: (o) => mirrorNodes(o, ['p', 'c', 'h'], 0),
    array: (o) => arrayNodes(o, ['p', 'c', 'h'], { kind: 'row', count: 3, step: [2, 0, 0] }),
  })) {
    const out = run(make()).objects;
    saved(out);
    const leaves = out.filter((o) => o.shape !== 'group');
    for (const id of ['p', 'c', 'h']) {
      const first = leaves.find((o) => o.id === id);
      const copies = leaves.filter((o) => o !== first && formKey(o) === formKey(first));
      assert.equal(copies.length, name === 'array' ? 2 : 1, `${name}: the copies of ${id} have its form`);
      for (const copy of copies) {
        assert.equal(shared(first, copy), 0, `${name}: a copy of ${id} shares nothing with it`);
        assert.deepEqual(copy.keys.map((k) => (k.form ? formKey(k.form) : '')), first.keys.map((k) => (k.form ? formKey(k.form) : '')), `${name}: and the forms of its keys`);
      }
    }
  }
});

// ---------------------------------------------------------------- Code: the scene as a function

/** Run World Code against a stand-in for the game. Returns what it did and the callbacks it set. */
function runWorld(code, { players = ['p1', 'p2'], facing = [0, 0, 1], held = 'Stick', crouching = true, kind = 'Pig', positions = {} } = {}) {
  const game = { now: 100000, particles: [], calls: [], players };
  const fake = {
    playParticleEffect: (o) => { game.particles.push(JSON.parse(JSON.stringify(o))); },
    now: () => game.now,
    getPlayerIds: () => game.players.slice(),
    getPosition: (id) => positions[id] || [100, 50, 100],
    getPlayerFacingInfo: () => ({ camPos: [100, 51.6, 100], dir: facing, angleDir: { theta: 0, phi: 0 }, moveHeading: 0 }),
    getPlayerTargetInfo: () => ({ position: [104, 49, 104], normal: [0, 1, 0], adjacent: [104, 50, 104] }),
    getHeldItem: () => (held ? { name: held, amount: 1 } : null),
    getEntityName: (id) => `name of ${id}`,
    getEntityType: () => kind,
    isPlayerCrouching: () => crouching,
  };
  const api = new Proxy(fake, {
    get: (target, name) => target[name] || ((...args) => { game.calls.push([name, ...args]); return undefined; }),
  });
  const sandbox = { api };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { timeout: 5000 });
  game.sandbox = sandbox;
  /** Let seconds pass, tick by tick (20 a second, as in the game). */
  game.wait = (seconds) => {
    for (let i = 0; i < Math.round(seconds * 20); i++) {
      game.now += 50;
      if (typeof sandbox.tick === 'function') sandbox.tick(50);
    }
  };
  return game;
}

/** A picture of nodes: [[kind, values], ...] and wires [[from, output, to], ...] by their place in that list. */
function build(list, wires) {
  const nodes = list.map(([type, values], i) => createNode(type, i * 300, 0, values));
  return sanitizeGraph({ nodes, wires: wires.map(([from, out, to]) => ({ from: nodes[from].id, out, to: nodes[to].id })) });
}

const SHOW = () => scene(
  createObject('circle', { id: 'a', count: 6, pos: [0.5, 2, 3.5], move: [0, 0, 2], spread: 0.5, gravity: -1 }),
  createObject('star', { id: 'b', count: 10, pos: [0.5, 2, 0.5], color2: '#00ff00', keys: [key(1, { pos: [0.5, 2, 4.5], form: { shape: 'heart', count: 12 } })] }),
  createObject('cube', { id: 'c', count: 12, pos: [2.5, 1, 0.5], expand: 1, fade: true, color2: '#0000ff' }),
);

test('code: the scene as a function plays as built at a place, and turned the way it is told', () => {
  const objects = SHOW();
  const made = generateCode(objects, { target: 'function' });
  assert.equal(made.parts.length, 1, 'never split');
  const code = made.parts[0].code;
  assert.match(code, /^\/\/ Bloxd Particle Studio: \d+ particles\.\n\/\/ psPlay\(pos, facing\) plays them\./);
  for (const line of code.split('\n')) assert.ok(line.length <= LIMITS.width, `a line of ${line.length}: ${line}`);
  assert.ok(/^[\x20-\x7e\n]*$/.test(code));
  // (the colours of two of the shapes are picked by luck: every run here gets the same luck)
  const game = (got) => {
    const luck = Object.create(Math);
    let n = 0;
    luck.random = () => ((n++ * 0.618034) % 1);
    return { Math: luck, api: { playParticleEffect: (o) => got.push(JSON.parse(JSON.stringify(o))) } };
  };
  const play = (pos, facing) => {
    const got = [];
    vm.runInNewContext(`${code}\npsPlay(${JSON.stringify(pos)}, ${JSON.stringify(facing)})`, game(got));
    return got;
  };
  // what a code block at [10, 20, 30] plays is what the function plays at the middle of that block's floor
  const block = [];
  vm.runInNewContext(generateCode(objects).parts[0].code, { thisPos: [10, 20, 30], ...game(block) });
  const built = play([10.5, 20, 30.5]);
  assert.equal(built.length, made.particles);
  assert.equal(built.length, block.length);
  const strip = (c) => ({ ...c, pos1: 0, pos2: 0, dir1: 0, dir2: 0 });
  built.forEach((c, i) => {
    assert.ok(dist(c.pos1, block[i].pos1) < 1e-9 && dist(c.dir1, block[i].dir1) < 1e-9 && dist(c.dir2, block[i].dir2) < 1e-9, `particle ${i}`);
    assert.deepEqual(strip(c), strip(block[i]));
  });
  assert.deepEqual(play([10.5, 20, 30.5], [0, 0, 5]).map((c) => c.pos1), built.map((c) => c.pos1), 'facing +Z is as built, however long the arrow');
  assert.deepEqual(play([10.5, 20, 30.5], [0, 0, 0]).map((c) => c.pos1), built.map((c) => c.pos1), 'no direction at all: as built');
  // turned: a true turn about the middle of the floor that takes +Z to where it is told
  const mid = (c) => c.dir1.map((v, j) => (v + c.dir2[j]) / 2);
  const centre = [10.5, 20, 30.5];
  const from = built.map((c) => c.pos1.map((v, j) => v - centre[j]));
  for (const facing of [[1, 0, 0], [-1, 0, 0], [0, 0, -1], [1, 0, 1], [0, 1, 0], [1, 2, -3], [0.2, -5, 0.1]]) {
    const turned = play(centre, facing);
    const to = turned.map((c) => c.pos1.map((v, j) => v - centre[j]));
    const n = Math.hypot(...facing);
    const ahead = facing.map((v) => v / n);
    // lengths and angles are kept (a turn, not a squash) ...
    for (let i = 0; i < from.length; i += 5) {
      for (let k = i + 1; k < from.length; k += 7) assert.ok(near(dist(from[i], from[k]), dist(to[i], to[k]), 1e-9), `facing ${facing}: distances kept`);
      assert.ok(near(Math.hypot(...mid(built[i])), Math.hypot(...mid(turned[i])), 1e-9), 'speeds kept');
    }
    // ... nothing is mirrored: a corner of three particles keeps its handedness ...
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const hand = (p) => cross(p[0], p[7]).reduce((sum, v, j) => sum + v * p[20][j], 0);
    assert.ok(near(hand(from), hand(to), 1e-6) && Math.abs(hand(from)) > 0.1, `facing ${facing}: not mirrored`);
    // ... and what was straight ahead (+Z) points where it was told: seen along that way, every particle is as far ahead as it was along Z
    from.forEach((p, i) => assert.ok(near(p[2], to[i].reduce((sum, v, j) => sum + v * ahead[j], 0), 1e-9), `facing ${facing}: particle ${i}`));
    // the way they fly turns with them; the pull of gravity stays straight down
    assert.ok(near(mid(turned[0]).reduce((sum, v, j) => sum + v * ahead[j], 0), 2, 1e-9), 'the ring still flies ahead');
    assert.deepEqual(turned.map((c) => c.gravity), built.map((c) => c.gravity));
    // the scatter around the way is as wide as it was
    assert.ok(near(turned[0].dir2[1] - turned[0].dir1[1], 1, 1e-9));
  }
  // facing along the ground keeps up up
  const east = play(centre, [1, 0, 0]);
  east.forEach((c, i) => assert.ok(near(c.pos1[1], built[i].pos1[1], 1e-9)));
  assert.ok(near(east[0].pos1[0] - centre[0], built[0].pos1[2] - centre[2], 1e-9), 'what was ahead is now to the east');
  // another name for the function; a name that is no name falls back
  assert.match(generateCode(objects, { target: 'function', name: 'boom' }).parts[0].code, /^const boom = \(pos, facing\) => \{$/m);
  assert.match(generateCode(objects, { target: 'function', name: 'a b; c' }).parts[0].code, /^const psPlay = /m);
  // an empty scene is a function that does nothing
  assert.deepEqual(runWorld(`${generateCode([], { target: 'function' }).parts[0].code}\npsPlay([0, 0, 0])`).particles, []);
});

// ---------------------------------------------------------------- Code: nodes

/**
 * A picture with every event. The first five are each followed by a chain of
 * all the other kinds of node. The others are followed by a "Play the
 * particles" that the event can serve, and then by one that asks for
 * something the event does not know. All the places and all the ways to turn
 * come up. Every "Play the particles" is moved up by 1000 blocks more than
 * the one before it, so that the particles tell which of them played.
 */
function everyNode() {
  const nodes = [];
  const wires = [];
  const rest = NODE_TYPES.filter((t) => !t.event);
  // an "If" for each of the first five events (join, click, use, chat, jump), each one true in the stand-in for the game
  const tests = [{ test: 'chance', chance: 100 }, { test: 'type', kind: 'Pig' }, { test: 'holds', item: 'Stick' },
    { test: 'near', place: 'fixed', pos: [100, 50, 103], far: 5 }, { test: 'crouch' }];
  let plays = 0;
  const used = new Map();
  /** Of a list, one that an event can serve (or cannot): the one that came up least so far. */
  const pick = (list, gives, served = true) => {
    const fits = list.filter((x) => x.needs.every((need) => gives.includes(need)) === served);
    fits.sort((a, b) => (used.get(a) || 0) - (used.get(b) || 0) || list.indexOf(b) - list.indexOf(a));
    if (fits.length) used.set(fits[0], (used.get(fits[0]) || 0) + 1);
    return fits[0];
  };
  NODE_TYPES.filter((t) => t.event).forEach((ev, row) => {
    const first = createNode(ev.id, 0, row * 300);
    nodes.push(first);
    let prev = first;
    let out = 'out';
    const add = (t, values) => {
      const node = createNode(t.id, nodes.length * 10, row * 300, values);
      nodes.push(node);
      wires.push({ from: prev.id, out, to: node.id });
      prev = node;
      out = outsOf(t)[0].id;
    };
    const { gives } = ev.event;
    const play = (served) => {
      const place = pick(PLACES, gives, served) || pick(PLACES, gives);
      const facing = (served || place.needs.every((need) => gives.includes(need)) ? pick(FACINGS, gives, served) : null) || pick(FACINGS, gives);
      return { place: place.id, facing: facing.id, shift: [0, 1000 * ++plays, 0], upright: plays % 2 === 0, pos: [7, 8, 9] };
    };
    if (row < 5) {
      for (const t of rest) {
        add(t, t.id === 'if' ? tests[row] : t.id === 'play' ? play(true)
          : t.id === 'wait' ? { seconds: 0.2 } : t.id === 'repeat' ? { times: 2, gap: row % 2 ? 0.1 : 0 } : t.id === 'cooldown' ? { seconds: 0.1, who: row % 2 ? 'each' : 'all' } : {});
      }
    } else {
      add(NODE_BY_ID.play, play(true));
      add(NODE_BY_ID.play, play(false));
    }
  });
  return sanitizeGraph({ nodes, wires });
}
/** Which "Play the particles" of everyNode() a particle of the stand-in game came from: its number, from 1. */
const playOf = (particle) => Math.floor((particle.pos1[1] + 500) / 1000);

const EVENT_ARGS = {
  onPlayerJoin: ['p1', false],
  onPlayerClick: ['p1', true, 1, 2, 3, 'Dirt', 'm1'],
  onPlayerAltAction: ['p1', 1, 2, 3, 'Dirt', 'm1'],
  onPlayerChat: ['p1', '!fx', 'all'],
  onPlayerJump: ['p1'],
  onPlayerDamagingMob: ['p1', 'm1', 5, 'Stick'],
  onPlayerKilledMob: ['p1', 'm1', 5, 'Stick'],
  onPlayerDamagingOtherPlayer: ['p1', 'p2', 5, 'Stick'],
  onPlayerKilledOtherPlayer: ['p1', 'p2', 5, 'Stick'],
  onMobDamagingPlayer: ['m1', 'p1', 5, 'Claws'],
  onBlockStand: ['p1', 1, 2, 3, 'Dirt'],
  onPlayerThrowableHitTerrain: ['p1', 'Snowball', 'e1'],
  onPlayerFinishChargingItem: ['p1', true, 'Bow', 1.2],
};

test('code: every kind of node makes World Code that runs against a stand-in for the game', () => {
  assert.equal(NODE_TYPES.length, 26);
  assert.equal(new Set(NODE_TYPES.map((t) => t.id)).size, NODE_TYPES.length);
  assert.equal(new Set(NODE_TYPES.map((t) => t.name)).size, NODE_TYPES.length);
  const cats = CATS.map((c) => c.id);
  assert.deepEqual(cats, ['event', 'loop', 'logic', 'particles', 'action']);
  assert.equal(new Set(CATS.map((c) => c.colour)).size, CATS.length, 'every kind has a colour of its own');
  for (const t of NODE_TYPES) {
    assert.ok(cats.includes(t.cat) && t.about.length > 15, `${t.id} has a kind and says what it does`);
    assert.equal(!!t.event, t.cat === 'event', `${t.id}: events are the nodes that start a run`);
    assert.equal(typeof t.run === 'function', !t.event, `${t.id}`);
    assert.ok(outsOf(t).length >= 1 && new Set(outsOf(t).map((o) => o.id)).size === outsOf(t).length);
    for (const f of t.fields) assert.ok(['number', 'choice', 'text', 'check', 'vec', 'code'].includes(f.kind), `${t.id}.${f.key}`);
  }
  // every callback the events use is one the game has (CALLBACKS.md of the Bloxd docs), each used by one kind of event
  const callbacks = NODE_TYPES.filter((t) => t.event && t.event.callback).map((t) => t.event.callback);
  assert.deepEqual(callbacks.filter((name) => name !== 'tick').sort(), Object.keys(EVENT_ARGS).sort());
  assert.equal(new Set(callbacks).size, callbacks.length);

  const graph = everyNode();
  assert.ok(graph.nodes.length <= MAX_NODES && new Set(graph.nodes.map((n) => n.type)).size === NODE_TYPES.length, 'every kind of node is in the picture');
  const made = worldCode(SHOW(), { graph, own: '', lang: 'js' });
  assert.equal(made.file, 'index.js');
  assert.equal(made.chars, made.code.length);
  assert.deepEqual(made.idle, []);
  assert.ok(/^[\x20-\x7e\n]*$/.test(made.code), 'only plain ASCII');
  // the parts, in their order: the particles, the helpers, what the nodes say
  const order = ['const psPlay = (pos, facing) => {', '// ---- helpers', '// ---- what the nodes say'].map((mark) => made.code.indexOf(mark));
  assert.ok(order[0] > 0 && order[0] < order[1] && order[1] < order[2]);
  const game = runWorld(made.code);
  // every callback is set, and runs without an error
  for (const [name, args] of Object.entries(EVENT_ARGS)) {
    assert.equal(typeof game.sandbox[name], 'function', `${name} is set`);
    game.sandbox[name](...args);
  }
  assert.equal(typeof game.sandbox.tick, 'function');
  game.wait(4);
  assert.equal(game.particles.length % made.particles, 0, 'always the whole scene');
  for (const p of game.particles) assert.ok([...p.pos1, ...p.dir1, ...p.dir2].every(Number.isFinite), 'every place is a place');
  // Which "Play the particles" played? Every one that knows where and which way; the others say what they miss:
  // a run that starts with "Every" has no player, a jump is about no mob and no block.
  const players = graph.nodes.filter((n) => n.type === 'play');
  assert.equal(players.length, 25);
  const warned = new Set(made.warnings.map((w) => w.node));
  const played = new Set(game.particles.map(playOf));
  players.forEach((node, i) => {
    const what = `"Play the particles" number ${i + 1} (${node.values.place}, turned ${node.values.facing})`;
    assert.equal(played.has(i + 1), !warned.has(node.id), `${what} ${warned.has(node.id) ? 'has a warning and yet played' : 'did not play'}`);
  });
  assert.deepEqual([played.size, warned.size], [15, 10], 'the fifteen that can, play; the ten that cannot, say what they miss');
  for (const w of made.warnings) assert.match(w.text, /^"[^"]+" does not know which (player to use|mob or player it is about|block)/);
  // all the places and all the ways to turn were among those that played
  const ran = players.filter((n) => !warned.has(n.id));
  assert.deepEqual([...new Set(ran.map((n) => n.values.place))].sort(), PLACES.map((x) => x.id).sort());
  assert.deepEqual([...new Set(ran.map((n) => n.values.facing))].sort(), FACINGS.map((x) => x.id).sort());
  // the other things nodes do reached the game too
  const used = new Set(game.calls.map((c) => c[0]));
  for (const name of ['sendMessage', 'playSound', 'applyImpulse', 'applyHealthChange', 'broadcastMessage']) assert.ok(used.has(name), `api.${name} was called`);
  assert.ok(game.calls.some((c) => c[0] === 'sendMessage' && c[2] === 'Hello name of p1!'), '{player} became the name');
});

test('code: events start runs, loops and logic steer them, and the particles play where the nodes say', () => {
  const objects = scene(createObject('point', { id: 'a', pos: [0.5, 0, 0.5] }), createObject('point', { id: 'b', pos: [0.5, 0, 2.5] }));
  const world = (list, wires, options) => runWorld(worldCode(objects, { graph: build(list, wires), own: '', lang: 'js' }).code, options);
  const places = (game) => game.particles.filter((_, i) => i % 2 === 0).map((p) => p.pos1.map((v) => Math.round(v * 1000) / 1000));
  const positions = { p1: [10, 5, 10], p2: [20, 5, 20], m1: [14, 5, 10] };

  // at the player: the middle of the floor of the studio's block is where the player stands
  let game = world([['join', {}], ['play', { place: 'player' }]], [[0, 'out', 1]], { positions });
  game.sandbox.onPlayerJoin('p2');
  assert.deepEqual(places(game), [[20, 5, 20]]);
  assert.deepEqual(game.particles[1].pos1, [20, 5, 22], 'the second particle is two blocks ahead, as built');
  // moved by, at a fixed place, at what the event is about, on the block it is about, where the player looks, in front of the eyes
  const at = (values, name = 'onPlayerClick', args = ['p1', false, 3, 4, 5, 'Dirt', 'm1']) => {
    const g = world([[{ onPlayerClick: 'click', onPlayerJump: 'jump' }[name], {}], ['play', values]], [[0, 'out', 1]], { positions });
    g.sandbox[name](...args);
    return places(g);
  };
  assert.deepEqual(at({ place: 'player', shift: [1, 2, -3] }), [[11, 7, 7]]);
  assert.deepEqual(at({ place: 'fixed', pos: [7, 8, 9] }), [[7, 8, 9]]);
  assert.deepEqual(at({ place: 'target' }), [[14, 5, 10]]);
  assert.deepEqual(at({ place: 'spot' }), [[3.5, 5, 5.5]], 'on top of the block that was clicked');
  assert.deepEqual(at({ place: 'look' }), [[104.5, 50, 104.5]], 'on top of the block the player looks at');
  assert.deepEqual(at({ place: 'eyes' }), [[100, 51.6, 102]], 'two blocks in front of the eyes');
  // a click into the air has no block and nothing it is about: nothing plays, nothing breaks
  assert.deepEqual(at({ place: 'spot' }, 'onPlayerClick', ['p1', false, undefined, undefined, undefined, 'Air', null]), []);
  assert.deepEqual(at({ place: 'target' }, 'onPlayerClick', ['p1', false, undefined, undefined, undefined, 'Air', null]), []);
  // turned the way the player looks: the second particle, two blocks ahead as built, is two blocks along the look
  const second = (values, facing) => {
    const g = world([['jump', {}], ['play', { place: 'player', ...values }]], [[0, 'out', 1]], { positions, facing });
    g.sandbox.onPlayerJump('p1');
    return g.particles[1].pos1.map((v, j) => Math.round((v - positions.p1[j]) * 1000) / 1000);
  };
  assert.deepEqual(second({ facing: 'look', upright: true }, [1, 0, 0]), [2, 0, 0]);
  assert.deepEqual(second({ facing: 'look', upright: true }, [0.6, -0.8, 0]), [2, 0, 0], 'upright: looking down does not tip the scene');
  assert.deepEqual(second({ facing: 'look', upright: false }, [0.6, -0.8, 0]), [1.2, -1.6, 0], 'not upright: it tips');
  assert.deepEqual(second({ facing: 'none' }, [1, 0, 0]), [0, 0, 2]);
  game = world([['hitMob', {}], ['play', { place: 'player', facing: 'toTarget' }]], [[0, 'out', 1]], { positions });
  game.sandbox.onPlayerDamagingMob('p1', 'm1');
  assert.deepEqual(game.particles[1].pos1, [12, 5, 10], 'from the player towards the mob');
  const spun = second({ facing: 'random' }, [0, 0, 1]);
  assert.ok(near(Math.hypot(spun[0], spun[2]), 2, 1e-3) && spun[1] === 0, 'a random way round, upright');

  // which click
  for (const [button, alt, runs] of [['any', true, 1], ['any', false, 1], ['left', false, 1], ['left', true, 0], ['right', true, 1], ['right', false, 0]]) {
    game = world([['click', { button }], ['play', {}]], [[0, 'out', 1]]);
    game.sandbox.onPlayerClick('p1', alt, 1, 2, 3, 'Dirt', null);
    assert.equal(game.particles.length, runs * 2, `${button}, alt ${alt}`);
  }
  // chat: which messages, and whether they are hidden
  for (const [match, said, runs] of [['is', '!fx', 1], ['is', '!fx now', 0], ['starts', '!fx now', 1], ['starts', 'do !fx', 0], ['has', 'do !fx', 1], ['has', 'hello', 0], ['any', 'hello', 1]]) {
    game = world([['chat', { match, text: '!fx', hide: true }], ['play', {}]], [[0, 'out', 1]]);
    const answer = game.sandbox.onPlayerChat('p1', said);
    assert.equal(game.particles.length, runs * 2, `${match} "${said}"`);
    assert.equal(answer, runs ? false : undefined, 'hidden when it ran, shown when it did not');
  }
  game = world([['chat', { match: 'is', text: '!fx', hide: false }], ['play', {}]], [[0, 'out', 1]]);
  assert.equal(game.sandbox.onPlayerChat('p1', '!fx'), undefined, 'not hidden');
  // "uses something" and "stands on": at most once in the time, counted for each player
  game = world([['use', { gap: 0.5 }], ['play', {}]], [[0, 'out', 1]]);
  for (let i = 0; i < 5; i++) game.sandbox.onPlayerAltAction('p1', 1, 2, 3, 'Dirt', null);
  game.sandbox.onPlayerAltAction('p2', 1, 2, 3, 'Dirt', null);
  assert.equal(game.particles.length, 4, 'once for p1, once for p2');
  game.wait(0.6);
  game.sandbox.onPlayerAltAction('p1', 1, 2, 3, 'Dirt', null);
  assert.equal(game.particles.length, 6);
  game = world([['stand', { block: 'Gold Block', gap: 1 }], ['play', {}]], [[0, 'out', 1]]);
  game.sandbox.onBlockStand('p1', 1, 2, 3, 'Dirt');
  game.sandbox.onBlockStand('p1', 1, 2, 3, 'Gold Block');
  game.sandbox.onBlockStand('p1', 1, 2, 3, 'Gold Block');
  assert.equal(game.particles.length, 2);
  // thrown things and charged items by name
  game = world([['lands', { item: 'Snowball' }], ['play', { place: 'target' }]], [[0, 'out', 1]], { positions: { e1: [1, 2, 3] } });
  game.sandbox.onPlayerThrowableHitTerrain('p1', 'Arrow', 'e1');
  game.sandbox.onPlayerThrowableHitTerrain('p1', 'Snowball', 'e1');
  assert.deepEqual(places(game), [[1, 2, 3]], 'where it landed');
  game = world([['charged', { item: '' }], ['play', {}]], [[0, 'out', 1]]);
  game.sandbox.onPlayerFinishChargingItem('p1', false, 'Bow', 1);
  game.sandbox.onPlayerFinishChargingItem('p1', true, 'Bow', 1);
  assert.equal(game.particles.length, 2, 'only when it was let go for real');
  // Every, with For each player; and what comes after the loop runs once
  game = world([['every', { seconds: 1 }], ['forEach', {}], ['play', {}], ['message', { text: 'tick', to: 'all' }]], [[0, 'out', 1], [1, 'each', 2], [1, 'done', 3]], { positions });
  game.wait(0.05);
  assert.deepEqual(places(game), [[10, 5, 10], [20, 5, 20]], 'at once (with the first tick), for both players');
  game.wait(0.95);
  assert.equal(game.particles.length, 4, 'then not before a whole second is over');
  game.wait(0.05);
  assert.equal(game.particles.length, 8, 'but then');
  game.wait(2);
  assert.deepEqual(places(game), [[10, 5, 10], [20, 5, 20], [10, 5, 10], [20, 5, 20], [10, 5, 10], [20, 5, 20], [10, 5, 10], [20, 5, 20]], 'and again after 2 and 3 seconds');
  assert.equal(game.calls.filter((c) => c[0] === 'broadcastMessage').length, 4, 'what comes after the loop runs once each time');
  // two of them keep their own time
  game = world([['every', { seconds: 1 }], ['message', { text: 'fast', to: 'all' }], ['every', { seconds: 2.5 }], ['message', { text: 'slow', to: 'all' }]], [[0, 'out', 1], [2, 'out', 3]]);
  game.wait(5.9);
  assert.deepEqual(['fast', 'slow'].map((said) => game.calls.filter((c) => c[1] === said).length), [6, 3], 'at 0, 1, 2, 3, 4, 5 and at 0, 2.5, 5 seconds');
  // When the world starts runs once, right away
  game = world([['start', {}], ['play', { place: 'fixed', pos: [1, 2, 3] }]], [[0, 'out', 1]]);
  assert.deepEqual(places(game), [[1, 2, 3]]);
  // Wait, and Repeat with a pause
  game = world([['jump', {}], ['wait', { seconds: 1 }], ['play', {}]], [[0, 'out', 1], [1, 'out', 2]]);
  game.sandbox.onPlayerJump('p1');
  game.wait(0.9);
  assert.equal(game.particles.length, 0, 'not yet');
  game.wait(0.2);
  assert.equal(game.particles.length, 2);
  game = world([['jump', {}], ['repeat', { times: 3, gap: 1 }], ['play', {}], ['message', { text: 'done' }]], [[0, 'out', 1], [1, 'each', 2], [1, 'done', 3]]);
  game.sandbox.onPlayerJump('p1');
  const seen = [];
  for (let i = 0; i < 4; i++) { game.wait(i ? 1 : 0.06); seen.push([game.particles.length / 2, game.calls.filter((c) => c[0] === 'sendMessage').length]); }
  assert.deepEqual(seen, [[1, 0], [2, 0], [3, 0], [3, 1]], 'one at once, one a second, then the message');
  game = world([['jump', {}], ['repeat', { times: 4, gap: 0 }], ['play', {}]], [[0, 'out', 1], [1, 'each', 2]]);
  game.sandbox.onPlayerJump('p1');
  assert.equal(game.particles.length, 8, 'without a pause: all at once');
  // If: both ways out
  const iff = (values, options) => {
    const g = world([['jump', {}], ['if', values], ['play', {}], ['message', { text: 'no' }]], [[0, 'out', 1], [1, 'yes', 2], [1, 'no', 3]], options);
    g.sandbox.onPlayerJump('p1');
    return g.particles.length ? 'yes' : g.calls.some((c) => c[0] === 'sendMessage') ? 'no' : 'nothing';
  };
  assert.equal(iff({ test: 'chance', chance: 100 }), 'yes');
  assert.equal(iff({ test: 'chance', chance: 0 }), 'no');
  assert.equal(iff({ test: 'crouch' }, { crouching: true }), 'yes');
  assert.equal(iff({ test: 'crouch' }, { crouching: false }), 'no');
  assert.equal(iff({ test: 'holds', item: 'Stick' }, { held: 'Stick' }), 'yes');
  assert.equal(iff({ test: 'holds', item: 'Stick' }, { held: 'Apple' }), 'no');
  assert.equal(iff({ test: 'holds', item: 'Stick' }, { held: null }), 'no', 'empty hands');
  assert.equal(iff({ test: 'near', place: 'fixed', pos: [100, 50, 103], far: 5 }), 'yes');
  assert.equal(iff({ test: 'near', place: 'fixed', pos: [100, 50, 110], far: 5 }), 'no');
  // Not too often, for each player or for everyone together
  for (const [who, runs] of [['each', 2], ['all', 1]]) {
    game = world([['jump', {}], ['cooldown', { seconds: 2, who }], ['play', {}]], [[0, 'out', 1], [1, 'out', 2]]);
    for (const id of ['p1', 'p1', 'p2', 'p2']) game.sandbox.onPlayerJump(id);
    assert.equal(game.particles.length, runs * 2, who);
    game.wait(2.1);
    game.sandbox.onPlayerJump('p1');
    assert.equal(game.particles.length, runs * 2 + 2);
  }
  // one output can run several nodes, from the top of the picture down
  const fan = sanitizeGraph({
    nodes: [createNode('jump', 0, 0), createNode('message', 300, 200, { text: 'second' }), createNode('message', 300, 0, { text: 'first' })],
    wires: [],
  });
  fan.wires = [{ from: fan.nodes[0].id, out: 'out', to: fan.nodes[1].id }, { from: fan.nodes[0].id, out: 'out', to: fan.nodes[2].id }];
  game = runWorld(worldCode(objects, { graph: fan, own: '', lang: 'js' }).code);
  game.sandbox.onPlayerJump('p1');
  assert.deepEqual(game.calls.map((c) => c[2]), ['first', 'second']);
  // Run your own code: its lines are in the code as they were typed, and can use the player of the run
  game = world([['jump', {}], ['code', { code: 'const twice = (v) => v * 2\napi.sendMessage(playerId, "four is " + twice(2))' }]], [[0, 'out', 1]]);
  game.sandbox.onPlayerJump('p1');
  assert.deepEqual(game.calls, [['sendMessage', 'p1', 'four is 4']]);
  // Push and Change health
  game = world([['hitMob', {}], ['push', { who: 'target', way: 'ahead', power: 10 }], ['health', { who: 'player', amount: 3.6 }]], [[0, 'out', 1], [1, 'out', 2]], { facing: [0, 0.6, 0.8] });
  game.sandbox.onPlayerDamagingMob('p1', 'm1');
  assert.deepEqual(game.calls, [['applyImpulse', 'm1', 0, 6, 8], ['applyHealthChange', 'p1', 4]]);
});

test('code: what a run does not know is said on the node, and nodes no event leads to do nothing', () => {
  const objects = scene(createObject('point', { id: 'a' }));
  // "Every" has no player: a node that needs one says so, names the cure, and is left out of the code
  let graph = build([['every', { seconds: 1 }], ['play', { place: 'player' }], ['message', { text: 'still here', to: 'all' }]], [[0, 'out', 1], [1, 'out', 2]]);
  let made = worldCode(objects, { graph, own: '', lang: 'js' });
  assert.deepEqual(made.warnings, [{ node: graph.nodes[1].id, text: '"Play the particles" does not know which player to use: this run has none. Put "For each player" before it.' }]);
  let game = runWorld(made.code);
  game.wait(2.05);
  assert.equal(game.particles.length, 0);
  assert.deepEqual(game.calls, new Array(3).fill(['broadcastMessage', 'still here']), 'what comes after it still runs');
  // with "For each player" in between it knows, and says nothing
  graph = build([['every', {}], ['forEach', {}], ['play', { place: 'player' }]], [[0, 'out', 1], [1, 'each', 2]]);
  assert.deepEqual(worldCode(objects, { graph, own: '', lang: 'js' }).warnings, []);
  // ... but not after the loop is done
  graph = build([['every', {}], ['forEach', {}], ['play', { place: 'player' }]], [[0, 'out', 1], [1, 'done', 2]]);
  assert.equal(worldCode(objects, { graph, own: '', lang: 'js' }).warnings.length, 1);
  // an event that is about no mob and no block
  graph = build([['jump', {}], ['play', { place: 'target' }], ['play', { place: 'spot' }], ['play', { place: 'player', facing: 'toTarget' }]], [[0, 'out', 1], [1, 'out', 2], [2, 'out', 3]]);
  made = worldCode(objects, { graph, own: '', lang: 'js' });
  assert.deepEqual(made.warnings.map((w) => w.text.replace(/^"Play the particles" does not know /, '')), [
    'which mob or player it is about: the event this run starts with does not say.',
    'which block: the event this run starts with does not say.',
    'which mob or player it is about: the event this run starts with does not say.',
  ]);
  // a fixed place, a random turn and a message to everyone need no player
  graph = build([['start', {}], ['play', { place: 'fixed', facing: 'random' }], ['message', { text: 'hi', to: 'all' }]], [[0, 'out', 1], [1, 'out', 2]]);
  assert.deepEqual(worldCode(objects, { graph, own: '', lang: 'js' }).warnings, []);
  // nodes that no event leads to are named, and are not in the code
  graph = build([['jump', {}], ['play', {}], ['message', { text: 'never' }], ['wait', {}]], [[0, 'out', 1], [2, 'out', 3]]);
  made = worldCode(objects, { graph, own: '', lang: 'js' });
  assert.deepEqual(made.idle, [graph.nodes[2].id, graph.nodes[3].id]);
  assert.ok(!made.code.includes('never'));
  // wires that go round in a circle: said, and the code still ends
  graph = build([['jump', {}], ['wait', { seconds: 0.1 }], ['play', {}]], [[0, 'out', 1], [1, 'out', 2], [2, 'out', 1]]);
  made = worldCode(objects, { graph, own: '', lang: 'js' });
  assert.match(made.warnings[0].text, /go round in a circle/);
  game = runWorld(made.code);
  game.sandbox.onPlayerJump('p1');
  game.wait(1);
  assert.equal(game.particles.length, 1, 'once round, then it stops');
  // an empty picture: just the particles, ready for code of your own
  made = worldCode(objects, { graph: sanitizeGraph(null), own: '', lang: 'js' });
  assert.ok(!made.code.includes('// ---- what the nodes say') && made.code.includes('const psPlay ='));
  assert.deepEqual(Object.keys(runWorld(made.code).sandbox), ['api']);
});

const OWN = `// my own code
let jumps = 0
function hello(name) { return 'hi ' + name }
tick = (ms) => { globalThis.ownTicks = (globalThis.ownTicks || 0) + 1 }
onPlayerJump = (playerId) => {
  jumps++
  api.sendMessage(playerId, hello(playerId) + ' ' + jumps)
  psPlay(api.getPosition(playerId), [1, 0, 0])
}
onPlayerChat = (playerId, text) => (text === 'secret' ? false : undefined)
onPlayerLeave = (playerId) => { api.broadcastMessage('bye') }`;

test('code: your own code goes in as it was typed, and its callbacks still run next to the nodes', () => {
  const objects = scene(createObject('point', { id: 'a' }));
  const nodes = [createNode('jump', 0, 0), createNode('message', 300, 0, { text: 'node', to: 'all' }), createNode('chat', 0, 300, { match: 'is', text: '!fx', hide: true }),
    createNode('wait', 300, 300, { seconds: 1 }), createNode('message', 600, 300, { text: 'later', to: 'all' })];
  const graph = sanitizeGraph({ nodes, wires: [[0, 1], [2, 3], [3, 4]].map(([a, b]) => ({ from: nodes[a].id, out: 'out', to: nodes[b].id })) });
  const made = worldCode(objects, { graph, own: `${OWN}\n\n\n`, lang: 'js' });
  // as it was typed, between the helpers and what the nodes say
  assert.ok(made.code.includes(`\n// ---- your own code\n${OWN}\n\n// ---- what the nodes say\n`));
  assert.ok(made.code.indexOf('// ---- helpers') < made.code.indexOf('// ---- your own code'));
  const game = runWorld(made.code);
  // a callback both use: the nodes first, then your own
  game.sandbox.onPlayerJump('p1');
  assert.deepEqual(game.calls, [['broadcastMessage', 'node'], ['sendMessage', 'p1', 'hi p1 1']]);
  assert.equal(game.particles.length, 1, 'and your own code can play the particles');
  // what your own callback gives back is kept, unless a node hides the message
  assert.equal(game.sandbox.onPlayerChat('p1', 'secret'), false);
  assert.equal(game.sandbox.onPlayerChat('p1', 'hello'), undefined);
  assert.equal(game.sandbox.onPlayerChat('p1', '!fx'), false);
  // the tick of the nodes (for Wait) and your own tick both run
  game.wait(1.1);
  assert.equal(game.sandbox.ownTicks, 22);
  assert.deepEqual(game.calls[game.calls.length - 1], ['broadcastMessage', 'later']);
  // a callback only you use is left alone
  assert.ok(!made.code.includes('psOwnOnPlayerLeave'));
  game.sandbox.onPlayerLeave('p1');
  assert.deepEqual(game.calls[game.calls.length - 1], ['broadcastMessage', 'bye']);
  // a callback written as a function is found too; a mention that sets nothing is not, nor one in a comment
  const compiled = (own) => compileGraph(graph, { own }).lines.join('\n');
  for (const own of ['function onPlayerJump(playerId) {}', 'onPlayerJump=(id)=>{}', 'let a = 1; onPlayerJump = () => a++ // onPlayerChat = later']) {
    assert.ok(compiled(own).includes('const psOwnOnPlayerJump = '), own);
    assert.ok(!compiled(own).includes('psOwnOnPlayerChat'), own);
  }
  for (const own of ['// onPlayerJump = soon', '/* onPlayerJump = (id) => {}\n   tick = () => {} */', 'if (onPlayerJump == null) {}', 'x.onPlayerJump = 1', 'const myonPlayerJump = 1',
    'const f = (onPlayerJump) => 1']) {
    assert.ok(!compiled(own).includes('psOwn'), own);
  }
  // should your own code only look as if it set a callback, nothing breaks when the event comes
  const sly = runWorld(worldCode(objects, { graph, own: 'const note = "onPlayerJump = soon"', lang: 'js' }).code);
  sly.sandbox.onPlayerJump('p1');
  assert.deepEqual(sly.calls, [['broadcastMessage', 'node']]);
  // only your own code, no nodes: it is all there is after the particles
  const alone = worldCode(objects, { graph: sanitizeGraph(null), own: OWN, lang: 'js' });
  assert.ok(alone.code.endsWith(`// ---- your own code\n${OWN}`));
  const solo = runWorld(alone.code);
  solo.sandbox.onPlayerJump('p9');
  assert.equal(solo.particles.length, 1);
});

/**
 * What the game gives World Code, for the TypeScript compiler. Two pictures of
 * it, because the game's own types are not published:
 *   LOOSE  : everything can be anything
 *   STRICT : written from the game's documentation (API_REFERENCE.md and
 *            CALLBACKS.md of github.com/Bloxdy/code-api), as strict as such
 *            types can be: ids that are not just any text, places that are
 *            exactly three numbers, lists of the names there are, a held item
 *            that can be missing, callbacks with their parameters, and no
 *            setting left out that the documentation does not call optional.
 * What the studio writes has to be fine with both.
 */
const GAME_LOOSE = `declare const api: any;
declare let tick: any, onPlayerJoin: any, onPlayerLeave: any, onPlayerClick: any, onPlayerAltAction: any, onPlayerChat: any, onPlayerJump: any,
  onPlayerDamagingMob: any, onPlayerKilledMob: any, onPlayerDamagingOtherPlayer: any, onPlayerKilledOtherPlayer: any,
  onMobDamagingPlayer: any, onBlockStand: any, onPlayerThrowableHitTerrain: any, onPlayerFinishChargingItem: any;`;
const GAME_STRICT = `
type PlayerId = string & { __player?: never };
type EntityId = string & { __entity?: never };
type LifeformId = EntityId;
type MobId = EntityId;
type BlockName = 'Air' | 'Dirt' | 'Stone';
type EntityType = 'Player' | 'Pig' | 'Cow' | 'Draugr Zombie';
type ItemName = 'Stick' | 'Bow' | 'Snowball';
type Vec3 = [number, number, number];
type CustomTextStyling = (string | { str: string; style?: { color?: string } })[];
interface InvenItem { name: ItemName; amount: number; attributes?: object }
interface Gradient { timeFraction: number; minColor: [number, number, number, number]; maxColor: [number, number, number, number] }
interface TempParticleSystemOpts {
  dir1: Vec3; dir2: Vec3; pos1: Vec3; pos2: Vec3; texture: 'glint' | 'heart' | 'bubble';
  minLifeTime: number; maxLifeTime: number; minEmitPower: number; maxEmitPower: number; minSize: number; maxSize: number;
  manualEmitCount: number; gravity: Vec3; colorGradients: Gradient[];
  velocityGradients: { timeFraction: number; factor: number; factor2: number }[]; blendMode: 0 | 1 | 2 | 3; hideDist?: number;
}
interface ParticlePresetOpts { presetId: string; pos1: Vec3; pos2: Vec3 }
declare const api: {
  now(): number;
  getPosition(entityId: EntityId): Vec3;
  playParticleEffect(opts: TempParticleSystemOpts | ParticlePresetOpts, clientPredictedBy?: EntityId): void;
  getPlayerFacingInfo(playerId: PlayerId): { camPos: Vec3; dir: Vec3; angleDir: { theta: number; phi: number }; moveHeading: number };
  broadcastMessage(message: string | CustomTextStyling, style?: { fontWeight?: number | string; color?: string }): void;
  applyImpulse(eId: EntityId, xImpulse: number, yImpulse: number, zImpulse: number): void;
  sendMessage(playerId: PlayerId, message: string | CustomTextStyling, style?: { fontWeight?: number | string; color?: string }): void;
  playSound(playerId: PlayerId, soundName: 'levelUp' | 'pop', volume: number, rate: number,
    posSettings: { playerIdOrPos: EntityId | number[]; maxHearDist?: number; refDistance?: number }): void;
  isPlayerCrouching(playerId: PlayerId): boolean;
  getPlayerTargetInfo(playerId: PlayerId): { position: Vec3; normal: Vec3; adjacent: Vec3 } | null;
  getPlayerIds(): PlayerId[];
  getHeldItem(playerId: PlayerId): InvenItem | null;
  getEntityType(entityId: EntityId): EntityType;
  getEntityName(entityId: EntityId): string;
  broadcastSound(soundName: 'levelUp' | 'pop', volume: number, rate: number, posSettings: { playerIdOrPos: EntityId | number[] }, exceptPlayerId: PlayerId): void;
  applyHealthChange(lifeformId: LifeformId, changeAmount: number, whoDidDamage: LifeformId | { lifeformId: LifeformId; withItem: string },
    broadcastLifeformHurt: boolean): boolean;
};
declare let tick: (ms: number) => void;
declare let onPlayerJoin: (playerId: PlayerId, fromGameReset: boolean) => void;
declare let onPlayerLeave: (playerId: PlayerId, serverIsShuttingDown: boolean) => void;
declare let onPlayerClick: (playerId: PlayerId, wasAltClick: boolean, x: number, y: number, z: number, blockName: BlockName, targetEId: EntityId | null) => void;
declare let onPlayerAltAction: (playerId: PlayerId, x: number, y: number, z: number, block: BlockName, targetEId: EntityId | null) => void;
declare let onPlayerChat: (playerId: PlayerId, chatMessage: string, channelName: string) => boolean | null | string | CustomTextStyling | void;
declare let onPlayerJump: (playerId: PlayerId) => void;
declare let onPlayerDamagingMob: (playerId: PlayerId, mobId: MobId, damageDealt: number, withItem: string, damageInfo: object) => 'preventDamage' | number | void;
declare let onPlayerKilledMob: (playerId: PlayerId, mobId: MobId, damageDealt: number, withItem: string) => 'preventDrop' | void;
declare let onPlayerDamagingOtherPlayer: (attackingPlayer: PlayerId, damagedPlayer: PlayerId, damageDealt: number, withItem: string, bodyPartHit: string,
  damagerDbId: string) => 'preventDamage' | number | void;
declare let onPlayerKilledOtherPlayer: (attackingPlayer: PlayerId, killedPlayer: PlayerId, damageDealt: number, withItem: string) => 'keepInventory' | void;
declare let onMobDamagingPlayer: (attackingMob: MobId, damagedPlayer: PlayerId, damageDealt: number, withItem: string, damageInfo: object) => 'preventDamage' | number | void;
declare let onBlockStand: (playerId: PlayerId, x: number, y: number, z: number, blockName: BlockName) => void;
declare let onPlayerThrowableHitTerrain: (playerId: PlayerId, throwableName: string, thrownEntityId: EntityId) => void;
declare let onPlayerFinishChargingItem: (playerId: PlayerId, used: boolean, itemName: string, duration: number) => void;
`;
/** Settings of the compiler that are stricter than "strict". (Not the ones about names nobody uses: a loop can need no player.) */
const STRICTER = { noImplicitReturns: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noFallthroughCasesInSwitch: true, noImplicitOverride: true };

test('code: with the language set to TypeScript, what comes out is strict TypeScript', async (t) => {
  const objects = SHOW();
  const graph = everyNode();
  const own = `// typed code of my own
interface Score { name: string; jumps: number }
const scores: Record<string, Score> = {}
function hello(name: string): string { return 'hi ' + name }
tick = (ms: number): void => { if (ms > 1000) api.broadcastMessage(hello('x')) }
onPlayerJump = (playerId: any): void => {
  const mine = scores[playerId] || (scores[playerId] = { name: playerId, jumps: 0 })
  mine.jumps++
  psPlay(api.getPosition(playerId), [1, 0, 0])
}
onPlayerChat = (playerId: any, said: string): boolean | undefined => (said.length > 100 ? false : undefined)`;
  const typed = worldCode(objects, { graph, own, lang: 'ts' });
  assert.equal(typed.file, 'index.ts');
  assert.match(typed.code, /^\/\/ World Code \(F8\), TypeScript: rename index\.js to index\.ts first\./);
  assert.ok(typed.code.includes('const psPlay = (pos: number[], facing?: number[] | null) => {'));
  assert.ok(typed.code.includes(`\n${own}\n`), 'your own code is not touched');
  // "Run your own code" nodes are not touched either: no types are written into what was typed
  assert.ok(typed.code.includes('api.broadcastMessage("It works!")'));
  // What the studio wrote asks the game through a name without a type, so that no type of the game's holds it up;
  // only what the user typed says `api`.
  assert.ok(typed.code.indexOf(UNTYPED_API_LINES.join('\n')) < typed.code.indexOf('const psPlay = '), 'the name is made before it is used');
  const studios = typed.code.replace(`\n${own}\n`, '\n').split('\n').filter((line) => !/^\s*\/\//.test(line) && !line.includes('api.broadcastMessage("It works!")'));
  assert.deepEqual(studios.filter((line) => /(^|[^\w$.])api\./.test(line)), []);
  assert.ok(studios.filter((line) => line.includes(`${UNTYPED_API}.`)).length > 20);
  // without the types it is, to the letter, the JavaScript version
  const plain = worldCode(objects, { graph, own: 'OWN', lang: 'js' });
  assert.ok(!plain.code.includes(UNTYPED_API), 'JavaScript has no use for that name');
  const untyped = worldCode(objects, { graph, own: 'OWN', lang: 'ts' }).code
    .replace(', TypeScript: rename index.js to index.ts first', '')
    .replace(`${UNTYPED_API_LINES.join('\n')}\n`, '').split(`${UNTYPED_API}.`).join('api.')
    .replace('(pos: number[], facing?: number[] | null)', '(pos, facing)')
    .replace(/: any\[\]/g, '').replace(/\??: any/g, '')
    .replace('(seconds: number, run: () => void)', '(seconds, run)').replace('(key: string, seconds: number)', '(key, seconds)');
  assert.equal(untyped, plain.code);
  // Texts of the user's are texts: what looks like code in them stays as it was typed
  const said = 'type api.now() or (x) => y, it\'s "fine"';
  const texts = worldCode(objects, { graph: build([['chat', { text: said }], ['message', { text: said, to: 'all' }]], [[0, 'out', 1]]), own: '', lang: 'ts' }).code;
  assert.equal(texts.split(JSON.stringify(said)).length - 1, 2, 'in the test of the event and in the message');
  assert.ok(texts.includes(`${UNTYPED_API}.broadcastMessage(${JSON.stringify(said)})`));

  let ts;
  try { ts = (await import('typescript')).default; } catch { t.skip('the TypeScript compiler is not installed: run npm install'); return; }
  const check = (code, game = GAME_LOOSE, more = {}) => {
    const files = { 'index.ts': code, 'game.d.ts': game };
    const options = { strict: true, noEmit: true, target: ts.ScriptTarget.ES2020, lib: ['lib.es2020.d.ts'], ...more };
    const host = ts.createCompilerHost(options);
    const { readFile, fileExists, getSourceFile } = host;
    host.readFile = (name) => (files[name] !== undefined ? files[name] : readFile.call(host, name));
    host.fileExists = (name) => files[name] !== undefined || fileExists.call(host, name);
    host.getSourceFile = (name, version) => (files[name] !== undefined ? ts.createSourceFile(name, files[name], version) : getSourceFile.call(host, name, version));
    return ts.getPreEmitDiagnostics(ts.createProgram(Object.keys(files), options, host)).map((d) => {
      const line = d.file ? d.file.getLineAndCharacterOfPosition(d.start).line : 0;
      return `${d.file ? d.file.fileName : ''} line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}\n    ${d.file ? d.file.text.split('\n')[line] : ''}`;
    });
  };
  /**
   * No complaint: with either picture of the game, with the usual strict settings and with stricter ones.
   * (`quick`: with the stricter ones only. What they let through, the usual ones do too.)
   */
  const fine = (code, what, quick = false) => {
    for (const [game, name] of [[GAME_LOOSE, 'a loose'], [GAME_STRICT, 'a strict']]) {
      for (const [more, how] of [[{}, 'strict'], [STRICTER, 'stricter than strict']].slice(quick ? 1 : 0)) {
        assert.deepEqual(check(code, game, more), [], `${what}: against ${name} picture of the game, ${how}`);
      }
    }
  };
  // the strict picture is strict: code that asks the game the way the studio does, but through `api`, is refused
  for (const line of ['api.applyHealthChange("p1", 4)', 'api.playSound("p1", "levelUp", 1, 1)', 'const far: number = api.getPosition("p1")[5]', 'api.getHeldItem("p1").name',
    'if (api.getEntityType("m1") === "Zombie") {}', 'api.playParticleEffect({ texture: "glint", pos1: [1, 2, 3].map((v) => v) })']) {
    assert.ok(check(line, GAME_STRICT).length > 0, `refused by the strict picture: ${line}`);
    assert.deepEqual(check(line.split('api.').join(`${UNTYPED_API}.`).replace(/^/, `${UNTYPED_API_LINES.join('\n')}\n`), GAME_STRICT, STRICTER), [], `but not through ${UNTYPED_API}: ${line}`);
  }
  fine(typed.code, 'every kind of node, with code of your own');
  // every example, and every way the scene can be written (colours that mix, sizes, fades, a morph, timing or none)
  for (const ex of NODE_EXAMPLES) {
    const code = worldCode(objects, { graph: exampleGraph(ex), own: '', lang: 'ts' }).code;
    fine(code, ex.name);
    // (the examples leave no name unused either)
    assert.deepEqual(check(code, GAME_STRICT, { ...STRICTER, noUnusedLocals: true }), [], ex.name);
  }
  const looks = [
    [createObject('point', { id: 'a' })],
    [createObject('circle', { id: 'a', count: 5, blend: 0, start: 1, color2: '#ffffff', size2: 1, keys: [key(1, { color: '#ff0000', size: 2 })] })],
    [createObject('circle', { id: 'a', count: 5, start: 1 }), createObject('circle', { id: 'b', count: 5, start: 2, keys: [key(1, { pos: [3, 3, 3] })] })],
    [createObject('circle', { id: 'a', count: 5, fade: true, expand: 1 })],
    // helpers that are called with and without their last settings: one shape flies apart and one does not,
    // one is hidden by darkening (blend mode 0) and one is not
    [createObject('circle', { id: 'a', count: 5, expand: 1 }), createObject('circle', { id: 'b', count: 5 })],
    [createObject('circle', { id: 'a', count: 5, start: 1 }), createObject('circle', { id: 'b', count: 5, start: 1, blend: 0 })],
    [],
  ];
  for (const list of looks) fine(worldCode(scene(...list), { graph: sanitizeGraph(null), own: '', lang: 'ts' }).code, JSON.stringify(list).slice(0, 80));
  // every place and every way to turn, every test of "If" and every action, after every event (three events to a picture)
  {
    const events = NODE_TYPES.filter((type) => type.event);
    let plays = 0;
    for (let from = 0; from < events.length; from += 3) {
      const nodes = [];
      const wires = [];
      events.slice(from, from + 3).forEach((ev, row) => {
        let prev = createNode(ev.id, 0, row * 300);
        nodes.push(prev);
        let out = 'out';
        const add = (id, values) => {
          const node = createNode(id, nodes.length * 10, row * 300, values);
          nodes.push(node);
          wires.push({ from: prev.id, out, to: node.id });
          prev = node;
          out = outsOf(NODE_BY_ID[id])[0].id;
        };
        if (!ev.event.gives.includes('player')) add('forEach', {});
        // (names the strict picture of the game does not have)
        for (const test of NODE_BY_ID.if.fields.find((f) => f.key === 'test').options) add('if', { test: test.id, kind: 'Zombie', item: 'Golden Sword' });
        for (const place of PLACES) for (const facing of FACINGS) add('play', { place: place.id, facing: facing.id, upright: nodes.length % 2 === 0, shift: [0, nodes.length % 3, 0] });
        for (const id of ['sound', 'push', 'health', 'message', 'cooldown', 'repeat', 'wait']) add(id, id === 'repeat' ? { gap: 0.5 } : {});
      });
      assert.ok(nodes.length <= MAX_NODES, `${nodes.length} nodes`);
      const all = worldCode(objects, { graph: sanitizeGraph({ nodes, wires }), own: '', lang: 'ts' });
      plays += all.code.split('psPlay(').length - 1;
      fine(all.code, `every place, turn, test and action after ${events.slice(from, from + 3).map((ev) => ev.name).join(', ')}`, true);
    }
    assert.ok(plays > 150, `${plays} times "Play the particles"`);
  }
  // the compiler does look: a mistake in your own code is found
  assert.equal(check(`${typed.code}\nconst wrong: number = 'text'`).length, 1);
  assert.equal(check(`${typed.code}\napi.sendMessage(5, "hi")`, GAME_STRICT).length, 1, 'and your own code is checked against the types of the game');
  // A callback your own code wrote as a function, which the nodes use too: TypeScript does not let such a name be
  // set anew, the game does. What the nodes add says so, and both run.
  {
    const jump = build([['jump', {}], ['message', { text: 'node', to: 'all' }]], [[0, 'out', 1]]);
    const mine = 'function onPlayerJump(playerId: string): void { api.broadcastMessage("mine " + playerId) }';
    const made = worldCode(objects, { graph: jump, own: mine, lang: 'ts' }).code;
    assert.ok(made.includes('// @ts-ignore (your own code wrote this one as a function: both run)\nonPlayerJump = (playerId: any, ...more: any) => {'));
    assert.deepEqual(check(made, 'declare const api: any;', STRICTER), []);
    assert.ok(check(made.replace(/^\/\/ @ts-ignore.*\n/m, ''), 'declare const api: any;').length > 0, 'without that line the compiler refuses it');
    const game = runWorld(ts.transpileModule(made, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText);
    game.sandbox.onPlayerJump('p1');
    assert.deepEqual(game.calls, [['broadcastMessage', 'node'], ['broadcastMessage', 'mine p1']]);
    // (a callback that was set, not declared, needs no such line)
    assert.ok(!typed.code.includes('@ts-ignore'));
  }
  // and compiled to JavaScript it does what the JavaScript version does
  const compiled = ts.transpileModule(typed.code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const [a, b] = [runWorld(compiled), runWorld(worldCode(objects, { graph, own: OWN, lang: 'js' }).code)];
  for (const g of [a, b]) { g.sandbox.onPlayerClick('p1', true, 1, 2, 3, 'Dirt', 'm1'); g.wait(3); }
  assert.ok(a.particles.length > 0);
  assert.equal(a.particles.length, b.particles.length);
});

test('code: pictures of nodes load safely, and the examples are sound', () => {
  // junk gives an empty picture
  for (const raw of [null, 5, 'x', [], {}, { nodes: 'x', wires: 7 }]) assert.deepEqual(sanitizeGraph(raw), { nodes: [], wires: [] });
  const a = createNode('jump', 10, 20);
  const b = createNode('play', 300.4, 20, { place: 'nowhere', pos: ['x', 2, 1e12], shift: 'junk', facing: 'look', upright: 'yes' });
  const c = createNode('if', 600, 20, { test: 'holds', item: 5, chance: 1e9 });
  assert.equal(createNode('no-such-node'), null);
  const graph = sanitizeGraph({
    nodes: [a, b, c, { type: 'zzz' }, null, { ...a }, { type: 'wait', x: 'far', y: null, values: 'junk' }],
    wires: [
      { from: a.id, out: 'out', to: b.id }, { from: a.id, out: 'out', to: b.id }, // twice the same
      { from: b.id, out: 'out', to: a.id }, // into an event
      { from: a.id, out: 'nope', to: c.id }, // an output it does not have
      { from: c.id, out: 'yes', to: c.id }, // onto itself
      { from: 'gone', out: 'out', to: b.id }, { from: b.id, out: 'out', to: 'gone' }, null, 7,
      { from: c.id, out: 'no', to: b.id },
    ],
  });
  assert.deepEqual(graph.nodes.map((n) => n.type), ['jump', 'play', 'if', 'jump', 'wait']);
  assert.equal(new Set(graph.nodes.map((n) => n.id)).size, 5, 'a node with an id that is taken gets a new one');
  assert.deepEqual(graph.wires, [{ from: a.id, out: 'out', to: b.id }, { from: c.id, out: 'no', to: b.id }]);
  assert.deepEqual(graph.nodes[1], { id: b.id, type: 'play', x: 300, y: 20, values: { place: 'player', pos: [0, 2, 100000], shift: [0, 0, 0], facing: 'look', upright: true } });
  assert.deepEqual([graph.nodes[2].values.item, graph.nodes[2].values.chance], ['Stick', 100]);
  assert.deepEqual([graph.nodes[4].x, graph.nodes[4].y, graph.nodes[4].values], [0, 0, { seconds: 1 }]);
  // loading what was saved changes nothing
  assert.deepEqual(sanitizeGraph(JSON.parse(JSON.stringify(graph))), graph);
  // at most so many nodes; your own code and the language are kept
  assert.equal(sanitizeGraph({ nodes: new Array(500).fill({ type: 'wait' }) }).nodes.length, MAX_NODES);
  assert.deepEqual(sanitizeCode(null), { graph: { nodes: [], wires: [] }, own: '', lang: 'js' });
  assert.deepEqual(sanitizeCode({ graph, own: 'x = 1', lang: 'ts' }), { graph, own: 'x = 1', lang: 'ts' });
  assert.equal(sanitizeCode({ lang: 'python', own: 7 }).lang, 'js');
  // a scene file from before the Code window has no picture, and one with a picture keeps it
  assert.deepEqual(sanitizeCode(undefined).graph.nodes, []);
  // text typed into a node cannot break out of the code: it is written as a string
  const sly = createNode('message', 0, 0, { text: '"); api.kickPlayer(playerId); ("', to: 'all' });
  const ev = createNode('join', 0, 0);
  const made = worldCode([], { graph: sanitizeGraph({ nodes: [ev, sly], wires: [{ from: ev.id, out: 'out', to: sly.id }] }), own: '', lang: 'js' });
  const game = runWorld(made.code);
  game.sandbox.onPlayerJoin('p1');
  assert.deepEqual(game.calls, [['broadcastMessage', '"); api.kickPlayer(playerId); ("']]);

  // the examples: every one is sound, says nothing, uses every node it has, and plays
  assert.ok(NODE_EXAMPLES.length >= 4);
  assert.equal(new Set(NODE_EXAMPLES.map((e) => e.id)).size, NODE_EXAMPLES.length);
  const objects = scene(createObject('circle', { id: 'a', count: 4 }));
  for (const ex of NODE_EXAMPLES) {
    const g = exampleGraph(ex);
    assert.deepEqual([g.nodes.length, g.wires.length], [ex.nodes.length, ex.wires.length], `${ex.id}: nothing was dropped`);
    g.nodes.forEach((n, i) => assert.deepEqual(n.values, { ...n.values, ...ex.nodes[i][3] }, `${ex.id}: the values of node ${i} are ones the node takes`));
    const out = worldCode(objects, { graph: g, own: '', lang: 'js' });
    assert.deepEqual([out.warnings, out.idle], [[], []], ex.id);
    assert.ok(ex.name.length > 5 && ex.about.length > 20);
    const world = runWorld(out.code);
    for (const [name, args] of Object.entries(EVENT_ARGS)) if (typeof world.sandbox[name] === 'function') world.sandbox[name](...args);
    world.wait(5);
    assert.ok(world.particles.length >= 4, `${ex.id} plays the scene`);
    // no two nodes of an example lie on top of each other
    for (const [i, n] of g.nodes.entries()) for (const m of g.nodes.slice(i + 1)) assert.ok(Math.abs(n.x - m.x) >= 280 || Math.abs(n.y - m.y) >= 200, `${ex.id}: nodes overlap`);
  }
  // a new picture of the same example has ids of its own
  const [x, y] = [exampleGraph(NODE_EXAMPLES[0]), exampleGraph(NODE_EXAMPLES[0])];
  assert.ok(x.nodes.every((n, i) => n.id !== y.nodes[i].id));
});

// ---------------------------------------------------------------- the page

test('the page: Shape Studio, Morph and Code have buttons that are always in sight, and the Code window finds its elements', () => {
  const html = fs.readFileSync(new URL('index.html', root), 'utf8');
  const app = fs.readFileSync(new URL('js/app.js', root), 'utf8');
  const readme = fs.readFileSync(new URL('README.md', root), 'utf8');
  const bar = /<header class="topbar">([\s\S]*?)<\/header>/.exec(html)[1];
  for (const [id, label, letter, opens] of [['studio', 'Shape Studio', 'S', 'studioTool'], ['morph', 'Morph', 'M', 'morphTool'], ['code', 'Code', 'C', 'codeTool']]) {
    assert.match(bar, new RegExp(`<button id="${id}" title="[^"]*\\(${letter}\\)">${label}</button>`), `${label} is in the top bar and names its key`);
    assert.ok(app.includes(`$('#${id}').onclick = () => { ${opens}();`), `the ${label} button is wired`);
    assert.ok(app.includes(`else if (key === '${letter.toLowerCase()}') ${opens}();`), `and so is the key ${letter}`);
    assert.match(app, new RegExp(`\\['${letter}', '`), `the key ${letter} is in the list of keys of the page`);
    assert.match(readme, new RegExp(`^\\| ${letter} \\| ${label === 'Morph' ? 'Morph' : label}: `, 'm'), `and in the one of the README`);
  }
  // pressed with the wrong things selected, the tools in the settings say what to select; else they open the settings first
  for (const [name, says] of [['studioTool', /Select one shape first/], ['morphTool', /Ctrl\+click the shape it turns into/]]) {
    const body = new RegExp(`\\nfunction ${name}\\(\\) \\{([\\s\\S]*?)\\n\\}`).exec(app)[1];
    assert.match(body, says);
    assert.ok(body.indexOf("showPanel('settings', true)") > -1 && body.indexOf("showPanel('settings', true)") < body.indexOf('showCategory('));
  }
  // the README names every tool of the Shape Studio and every kind of node
  for (const def of DEFORMERS) assert.ok(readme.includes(`| ${def.name} | `), `the README lists the tool ${def.name}`);
  for (const cat of CATS) assert.ok(readme.includes(`| ${cat.name} | `), `the README lists the ${cat.name} nodes`);
  // and every kind of node by its name (the events share their start: "When a player joins, clicks, ...")
  const told = readme.slice(readme.indexOf('### Code: when and where it plays'), readme.indexOf('**Export options**')).toLowerCase();
  assert.ok(told.length > 2000);
  for (const type of NODE_TYPES) {
    const words = type.name.replace(/^When (a player|a mob|something thrown|the world) /, '').replace(/^When a player$/, '').toLowerCase();
    assert.ok(told.includes(words), `the README tells of the node "${type.name}" (looked for "${words}")`);
  }
  // its pictures are there, and each has words for who cannot see it
  const pictures = [...readme.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  for (const name of ['docs/studio.png', 'docs/morph.png', 'docs/code.png']) assert.ok(pictures.some((m) => m[2] === name), `the README shows ${name}`);
  for (const [, words, file] of pictures) {
    assert.ok(words.length > 30, `${file} is described`);
    assert.ok(fs.statSync(new URL(file, root)).size > 10000, `${file} is there`);
  }
  // everything the scripts of the Code window and of the new tools ask the page for is in the page
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const ui = fs.readFileSync(new URL('js/code-ui.js', root), 'utf8');
  let asked = 0;
  for (const m of ui.matchAll(/\$\('#([\w-]+)'\)/g)) {
    asked++;
    assert.ok(ids.has(m[1]), `code-ui.js asks for #${m[1]}, which index.html does not have`);
  }
  assert.ok(asked > 30, `${asked} elements checked`);
  for (const pane of ['nodes', 'own', 'result']) {
    assert.ok(ids.has(`code-pane-${pane}`), `the ${pane} part of the Code window`);
    assert.match(html, new RegExp(`<button type="button" data-tab="${pane}"`));
  }
  // the scene file and the browser's store keep the picture of nodes and your own code
  assert.match(app, /sky: state\.sky, snap: state\.snap, code: state\.code,/);
  assert.match(app, /state\.code = sanitizeCode\(raw\.code\);/);
  // while the Code window is open the keys of the page are its own
  assert.ok(app.includes("if ($('#export-dialog').open || $('#code-dialog').open) return;"));
  // the look that was asked for: a dark canvas with dots, cards with a coloured heading, red Run wires and square ports
  const css = fs.readFileSync(new URL('css/style.css', root), 'utf8');
  assert.match(css, /\.code-canvas \{[^}]*radial-gradient\(circle, #[0-9a-f]{6}/);
  assert.match(css, /\.node-head \{[^}]*background: var\(--c\)/);
  assert.match(css, /\.wire \{[^}]*stroke: #ff4d4d/);
  assert.match(css, /\.port \{[^}]*border-radius: 3px; background: #ff4d4d/);
});
