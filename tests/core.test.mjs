// Unit tests for the parts that must be exactly right: the shapes, the maths and
// the generated Bloxd code (which is executed here against a fake `api`).
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import * as THREE from '../vendor/three.module.min.js';
import { SHAPES, CATEGORIES, shapePoints, defaultParams, searchShapes, MAX_COUNT } from '../js/shapes.js';
import {
  TEXTURES, PLACEHOLDER_TEXTURES, HIDDEN_TEXELS, createObject, sanitizeScene, objectPoints, rotationMatrix,
  computeParticles, sceneDuration, LIFE_PER_SECOND, hexToRgb, rgbToHex, localPoints, posedPoints, poseAtTime, GHOST,
  createGroup, isGroup, sceneTree, stillPoints, MAX_DEPTH,
} from '../js/scene.js';
import {
  planOf, piecesOf, poseAt, keyAt, markAt, spanOf, staySeconds, isPlain, EASES, MAX_KEYS, MIN_KEY_GAP, MAX_START, SWITCH,
  MAX_REPEAT, MIN_EVERY, lookAt, viewMatrix, poseOfView,
} from '../js/motion.js';
import { generateCode, LIMITS, PRECISIONS } from '../js/codegen.js';
import { createParticle, frameAge } from './babylon-sim.mjs';
import { sourceFiles, sourceHash } from '../tools/sources.mjs';
import { dragonFile } from '../examples/dragon.mjs';
import { examplesFile } from '../examples/build.mjs';
import { EXAMPLES } from '../js/examples-data.js';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// ---------------------------------------------------------------- shapes

// Shapes marked `tidy` (Filled square, Filled cube, Donut) pick the nearest count that fits their pattern.

test('there are 224 shapes, each made of dozens of particles, in nine tabs', () => {
  assert.equal(SHAPES.length, 224);
  assert.equal(new Set(SHAPES.map((s) => s.id)).size, SHAPES.length, 'duplicate shape id');
  assert.equal(new Set(SHAPES.map((s) => s.name)).size, SHAPES.length, 'duplicate shape name');
  const tabs = CATEGORIES.map((c) => c.id);
  assert.equal(tabs.length, 9);
  for (const tab of tabs) assert.ok(SHAPES.some((s) => s.cat === tab), `tab ${tab} is empty`);
  // the picker shows the shapes tab by tab, in this order
  assert.deepEqual([...new Set(SHAPES.map((s) => s.cat))], tabs);
  for (const s of SHAPES) {
    assert.match(s.id, /^[a-z0-9-]+$/, `id ${s.id}`);
    assert.ok(tabs.includes(s.cat), `${s.id} tab ${s.cat}`);
    assert.ok(s.group === 'flat' || s.group === 'solid', `${s.id} group ${s.group}`);
    assert.ok(Number.isInteger(s.count) && s.count >= 12 && s.count <= 300, `${s.id} default count ${s.count}`);
    assert.ok(Number.isInteger(s.min) && s.min >= 1 && s.min <= s.count, `${s.id} min ${s.min}`);
    for (const p of s.params || []) {
      assert.ok(p.min < p.max && p.step > 0 && p.default >= p.min && p.default <= p.max, `${s.id} slider ${p.key}`);
    }
  }
});

test('every shape gives the requested number of distinct, finite points', () => {
  for (const s of SHAPES) {
    for (const n of [s.min, s.count, 37, 120, MAX_COUNT]) {
      const want = Math.max(s.min, n);
      const pts = shapePoints(s.id, want, defaultParams(s.id));
      if (s.tidy) assert.ok(pts.length >= 4, `${s.id} n=${want}`);
      else assert.equal(pts.length, want, `${s.id} n=${want}`);
      for (const p of pts) {
        assert.equal(p.length, 3);
        for (const v of p) assert.ok(Number.isFinite(v) && Math.abs(v) <= 1.0001, `${s.id} n=${want} value ${v}`);
        if (s.group === 'flat') assert.equal(p[2], 0, `${s.id} is flat but has depth`);
      }
    }
    // no two particles on the same spot at the default count
    const pts = shapePoints(s.id, s.count, defaultParams(s.id));
    const seen = new Set(pts.map((p) => p.map((v) => v.toFixed(5)).join(',')));
    assert.equal(seen.size, pts.length, `${s.id} has overlapping particles`);
  }
});

test('shape sliders stay valid across their whole range', () => {
  for (const s of SHAPES) {
    const sets = [];
    for (const p of s.params || []) {
      for (const v of [p.min, p.max, (p.min + p.max) / 2]) sets.push([`${p.key}=${v}`, { ...defaultParams(s.id), [p.key]: v }]);
    }
    if ((s.params || []).length > 1) {
      sets.push(['all at their lowest', Object.fromEntries(s.params.map((p) => [p.key, p.min]))]);
      sets.push(['all at their highest', Object.fromEntries(s.params.map((p) => [p.key, p.max]))]);
    }
    for (const [what, params] of sets) {
      for (const n of [s.count, MAX_COUNT]) {
        const pts = shapePoints(s.id, n, params);
        assert.ok(pts.length >= 3, `${s.id} ${what}`);
        for (const q of pts) for (const c of q) assert.ok(Number.isFinite(c) && Math.abs(c) <= 1.0001, `${s.id} ${what}: ${c}`);
      }
    }
  }
});

// Saved scenes and exported code only stay the same if the first 24 shapes keep
// giving exactly the points they gave before the library grew. These fingerprints
// were taken from that version: every slider at both ends, five particle counts.
const FIRST_SHAPES = {
  line: 'e1f1d363', circle: 'd8d09acb', disc: '2cda8dfd', arc: '679d365a', square: 'c33621e0', grid: '826b5d49',
  triangle: '68d2d495', polygon: '02e66b7c', star: 'e6fc1091', heart: '54224b6f', cross: '86339717', rays: 'd1816a1b',
  spiral: '17802333', wave: '4b99e6e9', sphere: '27a01572', dome: '4b651e3b', cube: 'ef9b75db', lattice: 'b08d1393',
  cylinder: '253d681c', cone: '07deedf0', pyramid: 'e315c0c1', torus: 'acf3f893', helix: '080604ec', tornado: '5b96d1b2',
};

function fingerprint(shape) {
  let hash = 2166136261;
  const eat = (text) => {
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  };
  const sets = [defaultParams(shape.id)];
  for (const p of shape.params || []) for (const v of [p.min, p.max]) sets.push({ ...defaultParams(shape.id), [p.key]: v });
  for (const params of sets) {
    for (const n of [shape.min, shape.count, 37, 120, 600]) {
      const pts = shapePoints(shape.id, n, params);
      eat(`${pts.length}:`);
      for (const p of pts) eat(`${p.map((v) => (Math.round(v * 1e6) / 1e6 || 0).toFixed(6)).join(',')};`);
    }
  }
  return hash.toString(16).padStart(8, '0');
}

test('the first 24 shapes are exactly what they were', () => {
  for (const [id, expected] of Object.entries(FIRST_SHAPES)) {
    const shape = SHAPES.find((s) => s.id === id);
    assert.ok(shape, `${id} is gone`);
    assert.equal(fingerprint(shape), expected, `${id} gives different points than before: old scenes would change`);
  }
});

test('letters and pictures have no clumps of particles', () => {
  const drawn = SHAPES.filter((s) => ['letters', 'numbers', 'symbols', 'nature', 'things'].includes(s.cat));
  assert.equal(drawn.length, 121);
  for (const s of drawn) {
    const pts = shapePoints(s.id, s.count, defaultParams(s.id));
    const nearest = pts.map((p, i) => Math.min(...pts.map((q, j) => (i === j ? Infinity : Math.hypot(p[0] - q[0], p[1] - q[1])))));
    const usual = nearest.slice().sort((a, b) => a - b)[nearest.length >> 1];
    assert.ok(Math.min(...nearest) >= 0.5 * usual, `${s.id}: two particles ${Math.min(...nearest).toFixed(3)} apart, the usual gap is ${usual.toFixed(3)}`);
  }
});

test('the search box finds shapes by name, sign and other words', () => {
  const ids = (text) => searchShapes(text).map((s) => s.id);
  assert.deepEqual(ids(''), []);
  assert.deepEqual(ids('   '), []);
  assert.deepEqual(ids('no such shape'), []);
  assert.equal(ids('a')[0], 'letter-a');
  assert.equal(ids('7')[0], 'digit-7');
  assert.deepEqual(ids('?'), ['sign-question']);
  assert.equal(ids('STAR')[0], 'star');
  assert.ok(ids('star').includes('pentagram'), 'search words count');
  assert.deepEqual(ids('heart'), ['heart', 'fill-heart', 'heart3d']);
  assert.deepEqual(ids('  music   note '), ['note', 'notes']);
  assert.equal(ids('letter').length, 26);
  assert.equal(ids('nature').length, SHAPES.filter((s) => s.cat === 'nature').length);
  assert.ok(ids('x').length < 10, 'one letter only matches the start of a word');
  // every shape can be found by its own name, and comes first
  for (const s of SHAPES) assert.equal(ids(s.name)[0], s.id, `searching "${s.name}"`);
});

test('the README lists every shape', () => {
  const readme = fs.readFileSync(new URL('README.md', root), 'utf8');
  assert.ok(readme.includes(`one of the ${SHAPES.length} shapes`), 'the number of shapes in "Make something"');
  assert.ok(readme.includes(`There are ${SHAPES.length} shapes in nine tabs`), 'the number of shapes under "Shapes"');
  for (const c of CATEGORIES) {
    const list = SHAPES.filter((s) => s.cat === c.id);
    const row = readme.split('\n').find((line) => line.startsWith(`| ${c.name} | `));
    assert.ok(row, `the table has no row for ${c.name}`);
    const [, , count, names] = row.split('|').map((cell) => cell.trim());
    assert.equal(Number(count), list.length, `how many shapes the ${c.name} tab has`);
    if (c.id === 'letters') assert.equal(names, 'A to Z');
    else if (c.id === 'numbers') {
      assert.ok(names.startsWith('0 to 9'));
      for (const s of list.filter((x) => x.id.startsWith('sign-'))) assert.ok(names.includes(s.label), `${s.name} is missing`);
    } else assert.deepEqual(names.split(', '), list.map((s) => s.name), `the ${c.name} row`);
  }
  const withSliders = SHAPES.filter((s) => (s.params || []).length > 0).length;
  assert.ok(readme.includes(`${withSliders} of them\nhave settings of their own`), `${withSliders} shapes have sliders of their own`);
});

test('junk shape input falls back safely', () => {
  assert.deepEqual(shapePoints('point', 99), [[0, 0, 0]]);
  assert.deepEqual(shapePoints('nope', 5), [[0, 0, 0]]);
  assert.equal(shapePoints('circle', NaN).length, 36);
  assert.equal(shapePoints('circle', 1e9).length, MAX_COUNT);
  assert.equal(shapePoints('star', 50, { points: 'x', inner: -5 }).length, 50);
});

// ---------------------------------------------------------------- maths

test('rotation matches THREE.Euler XYZ (the gizmo and the export agree)', () => {
  for (const [x, y, z] of [[0, 0, 0], [90, 0, 0], [0, 90, 0], [0, 0, 90], [33, -71, 128], [-200, 15, 359]]) {
    const m = rotationMatrix(x, y, z);
    const e = new THREE.Euler(THREE.MathUtils.degToRad(x), THREE.MathUtils.degToRad(y), THREE.MathUtils.degToRad(z), 'XYZ');
    const v = new THREE.Vector3(0.3, -1.2, 2.5).applyEuler(e);
    const mine = [0, 1, 2].map((r) => m[r * 3] * 0.3 + m[r * 3 + 1] * -1.2 + m[r * 3 + 2] * 2.5);
    assert.ok(near(mine[0], v.x, 1e-6) && near(mine[1], v.y, 1e-6) && near(mine[2], v.z, 1e-6), `${x},${y},${z}`);
  }
});

test('object points equal a THREE object transform with Z flipped', () => {
  const obj = createObject('star', { pos: [2, 3.5, -4], rot: [20, 40, 60], scale: [1.5, 0.5, 2] });
  const o3 = new THREE.Object3D();
  o3.position.set(2, 3.5, 4); // view space: z flipped
  o3.rotation.set(...obj.rot.map(THREE.MathUtils.degToRad), 'XYZ');
  o3.scale.set(...obj.scale);
  o3.updateMatrixWorld(true);
  const local = shapePoints('star', obj.count, obj.params);
  objectPoints(obj).forEach((p, i) => {
    const v = new THREE.Vector3(...local[i]).applyMatrix4(o3.matrixWorld);
    assert.ok(near(p[0], v.x, 1e-6) && near(p[1], v.y, 1e-6) && near(p[2], -v.z, 1e-6));
  });
});

test('a single particle sits exactly at its position', () => {
  const obj = createObject('point', { pos: [1.25, 2, -3.5], rot: [45, 45, 45], scale: [3, 3, 3] });
  assert.deepEqual(objectPoints(obj), [[1.25, 2, -3.5]]);
});

test('colour helpers round-trip', () => {
  assert.deepEqual(hexToRgb('#ff8000'), [255, 128, 0]);
  assert.equal(rgbToHex([255, 128, 0]), '#ff8000');
  assert.equal(rgbToHex([300, -5, 15.6]), '#ff0010');
});

test('loading repairs broken scenes', () => {
  const scene = sanitizeScene({
    objects: [
      { shape: 'circle', count: 1e9, pos: ['a', 2, null], color: 'red', texture: 'nope', size: -4, life: 0, blend: 9 },
      { id: 'same', shape: 'weird' }, { id: 'same' }, null,
    ],
  });
  assert.equal(scene.objects.length, 4);
  const [a, b, c] = scene.objects;
  assert.equal(a.count, 600);
  assert.deepEqual(a.pos, [0.5, 2, 0.5]);
  assert.equal(a.color, '#ffd24a');
  assert.equal(a.texture, 'glint');
  assert.equal(a.size, 0.01);
  assert.equal(a.life, 0.05);
  assert.equal(a.blend, 1);
  assert.equal(b.shape, 'point');
  assert.notEqual(b.id, c.id);
  assert.deepEqual(sanitizeScene(null).objects, []);
  assert.deepEqual(sanitizeScene(JSON.parse(JSON.stringify(scene))), scene, 'sanitize is stable');
});

test('preview: still picture, motion, fade and end of life', () => {
  const obj = createObject('circle', { life: 6, move: [0, 1, 0], gravity: -2, fade: true, color2: '#000000', size2: 0.6 });
  const still = computeParticles([obj]);
  assert.equal(still.length, obj.count);
  const pts = objectPoints(obj);
  still.forEach((p, i) => {
    assert.deepEqual(p.pos, pts[i]);
    assert.equal(p.alpha, 1);
    assert.ok(p.size >= 0.3 && p.size <= 0.6);
    assert.ok(p.rgb[0] >= 0 && p.rgb[0] <= 255);
  });
  const t = 2; // real seconds
  const age = t * LIFE_PER_SECOND;
  const moved = computeParticles([obj], t);
  assert.ok(near(moved[0].pos[1], pts[0][1] + age - age * age, 1e-9));
  assert.ok(near(moved[0].pos[0], pts[0][0]));
  const late = computeParticles([obj], (6 * 0.9) / LIFE_PER_SECOND);
  assert.ok(near(late[0].alpha, 0.5, 1e-9), 'half faded at 90% of the lifetime');
  assert.equal(computeParticles([obj], 6 / LIFE_PER_SECOND + 0.01).length, 0);
  assert.ok(near(sceneDuration([obj]), 10));
  assert.equal(computeParticles([{ ...obj, hidden: true }]).length, 0);
  assert.deepEqual(computeParticles([obj]), still, 'preview is deterministic');
});

// ---------------------------------------------------------------- textures

test('every official texture name has an image file', () => {
  assert.equal(TEXTURES.length, 13);
  for (const name of TEXTURES) {
    const png = fs.readFileSync(new URL(`textures/${name}.png`, root));
    assert.equal(png.subarray(1, 4).toString(), 'PNG', name);
  }
  for (const name of PLACEHOLDER_TEXTURES) assert.ok(TEXTURES.includes(name));
});

/** Minimal PNG reader (8-bit, not interlaced): returns { width, height, rgba }. */
function readPng(buffer) {
  let at = 8;
  let header = null;
  const idat = [];
  let palette = null;
  let trns = null;
  while (at < buffer.length) {
    const length = buffer.readUInt32BE(at);
    const type = buffer.toString('latin1', at + 4, at + 8);
    const body = buffer.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') header = { width: body.readUInt32BE(0), height: body.readUInt32BE(4), depth: body[8], color: body[9], interlace: body[12] };
    else if (type === 'IDAT') idat.push(body);
    else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') trns = body;
    at += 12 + length;
  }
  assert.equal(header.depth, 8);
  assert.equal(header.interlace, 0);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[header.color];
  const { width, height } = header;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y ? out[(y - 1) * stride + x] : 0;
      const c = y && x >= channels ? out[(y - 1) * stride + x - channels] : 0;
      let predicted = 0;
      if (filter === 1) predicted = a;
      else if (filter === 2) predicted = b;
      else if (filter === 3) predicted = (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        predicted = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = (v + predicted) & 255;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const px = out.subarray(i * channels, (i + 1) * channels);
    let r, g, b, alpha = 255;
    if (header.color === 0) [r, g, b] = [px[0], px[0], px[0]];
    else if (header.color === 2) [r, g, b] = px;
    else if (header.color === 3) { [r, g, b] = palette.subarray(px[0] * 3, px[0] * 3 + 3); alpha = trns && px[0] < trns.length ? trns[px[0]] : 255; }
    else if (header.color === 4) [r, g, b, alpha] = [px[0], px[0], px[0], px[1]];
    else [r, g, b, alpha] = px;
    rgba.set([r, g, b, alpha], i * 4);
  }
  return { width, height, rgba };
}

test('the texture files are what the preview assumes', () => {
  const hidden = {};
  for (const name of TEXTURES) {
    const { width, height, rgba } = readPng(fs.readFileSync(new URL(`textures/${name}.png`, root)));
    assert.ok(width <= 64 && height <= 64 && width >= 4 && height >= 4, `${name} is ${width}x${height}`);
    let solid = 0;
    for (let i = 0; i < width * height; i++) {
      const [r, g, b, a] = rgba.subarray(i * 4, i * 4 + 4);
      // the preview treats a texel as either solid or see-through
      assert.ok(a === 0 || a === 255, `${name} has a half see-through texel`);
      if (a === 255) solid++;
      else if (r || g || b) (hidden[name] ||= []).push([i % width, Math.floor(i / width), r, g, b]);
    }
    assert.ok(solid >= 4, `${name} is empty`);
  }
  // colours hiding under see-through texels (shown by blend mode 0) are all listed
  assert.deepEqual(hidden, HIDDEN_TEXELS);
});

// ---------------------------------------------------------------- generated code

const KNOWN_KEYS = new Set([
  'texture', 'minLifeTime', 'maxLifeTime', 'minEmitPower', 'maxEmitPower', 'minSize', 'maxSize', 'gravity',
  'velocityGradients', 'colorGradients', 'blendMode', 'dir1', 'dir2', 'pos1', 'pos2', 'manualEmitCount', 'hideDist',
]);
const REQUIRED = [...KNOWN_KEYS].filter((k) => k !== 'hideDist');
const isVec = (v, n = 3) => Array.isArray(v) && v.length === n && v.every(Number.isFinite);

/** Check one call the way the game client reads it. */
function checkCall(o) {
  for (const k of Object.keys(o)) assert.ok(KNOWN_KEYS.has(k), `unknown option key ${k}`);
  for (const k of REQUIRED) assert.ok(k in o, `missing ${k}`);
  assert.ok(TEXTURES.includes(o.texture), `texture ${o.texture}`);
  for (const k of ['pos1', 'pos2', 'dir1', 'dir2', 'gravity']) assert.ok(isVec(o[k]), `${k} ${JSON.stringify(o[k])}`);
  assert.deepEqual(o.pos1, o.pos2, 'one exact point');
  for (const k of ['minLifeTime', 'maxLifeTime', 'minEmitPower', 'maxEmitPower', 'minSize', 'maxSize']) {
    assert.ok(Number.isFinite(o[k]) && o[k] >= 0, `${k} ${o[k]}`);
  }
  assert.ok(o.minLifeTime <= o.maxLifeTime && o.minSize <= o.maxSize && o.minEmitPower <= o.maxEmitPower);
  assert.ok(o.minLifeTime > 0 && o.minSize > 0);
  assert.equal(o.manualEmitCount, 1);
  assert.ok([0, 1, 2, 3, 4].includes(o.blendMode));
  assert.ok(Array.isArray(o.colorGradients) && o.colorGradients.length >= 1);
  let last = -1;
  for (const g of o.colorGradients) {
    assert.deepEqual(Object.keys(g).sort(), ['maxColor', 'minColor', 'timeFraction']);
    assert.ok(g.timeFraction > last && g.timeFraction >= 0 && g.timeFraction <= 1);
    last = g.timeFraction;
    for (const c of [g.minColor, g.maxColor]) {
      assert.ok(isVec(c, 4), JSON.stringify(c));
      assert.ok(c.slice(0, 3).every((v) => Number.isInteger(v) && v >= 0 && v <= 255) && c[3] >= 0 && c[3] <= 1);
    }
  }
  assert.equal(o.colorGradients[0].timeFraction, 0);
  assert.ok(Array.isArray(o.velocityGradients) && o.velocityGradients.length >= 1);
  last = -1;
  for (const g of o.velocityGradients) {
    assert.deepEqual(Object.keys(g).sort(), ['factor', 'factor2', 'timeFraction']);
    assert.ok(g.timeFraction > last && g.timeFraction >= 0 && g.timeFraction <= 1);
    last = g.timeFraction;
    assert.ok(g.factor >= 0 && g.factor <= 1 && g.factor === g.factor2, `speed factor ${g.factor}`);
  }
  assert.equal(o.velocityGradients[0].timeFraction, 0);
  if ('hideDist' in o) assert.ok(o.hideDist > 0);
}

/** Run a part the way a code block runs it and collect the calls. */
function runPart(code, thisPos) {
  const calls = [];
  const sandbox = { thisPos, api: { playParticleEffect: (o) => calls.push(JSON.parse(JSON.stringify(o))) } };
  vm.runInNewContext(code, sandbox, { timeout: 5000 });
  return calls;
}

function checkLimits(part, label) {
  assert.ok(part.chars <= LIMITS.chars, `${label}: ${part.chars} characters`);
  assert.ok(part.lines <= LIMITS.lines, `${label}: ${part.lines} lines`);
  assert.equal(part.chars, part.code.length);
  assert.equal(part.lines, part.code.split('\n').length);
  for (const line of part.code.split('\n')) assert.ok(line.length <= LIMITS.width, `${label}: line of ${line.length}: ${line}`);
  assert.ok(/^[\x20-\x7e\n]*$/.test(part.code), `${label}: only plain ASCII`);
  assert.ok(!/[ \t]$/m.test(part.code), `${label}: trailing spaces`);
}

/** All parts of an export, run from stacked code blocks, compared with the scene. */
function verifyExport(objects, options = {}) {
  const result = generateCode(objects, options);
  const q = options.precision || 100;
  const base = [10, 20, -30];
  const calls = [];
  result.parts.forEach((part, i) => {
    checkLimits(part, `part ${i + 1}/${result.parts.length}`);
    const got = runPart(part.code, [base[0], base[1] + i, base[2]]); // block i is stacked i blocks higher
    assert.equal(got.length, part.particles, `part ${i + 1} particle count`);
    calls.push(...got);
  });
  const expected = objects.filter((o) => !o.hidden).flatMap((o) => objectPoints(o).map((p) => ({ p, o })));
  assert.equal(calls.length, expected.length);
  assert.equal(result.particles, expected.length);
  calls.forEach(checkCall);
  for (const c of calls) assert.deepEqual(c.velocityGradients, [{ timeFraction: 0, factor: 1, factor2: 1 }]);
  // positions: same multiset (objects with one style are merged, order inside a style is kept)
  const key = (p) => p.map((v, k) => Math.round((v - base[k]) * q)).join(',');
  const want = new Map();
  for (const { p } of expected) {
    const k = p.map((v) => Math.round(v * q) + 0).join(',');
    want.set(k, (want.get(k) || 0) + 1);
  }
  for (const c of calls) {
    const k = key(c.pos1);
    assert.ok(want.get(k) > 0, `unexpected particle at ${c.pos1}`);
    want.set(k, want.get(k) - 1);
    for (let j = 0; j < 3; j++) assert.ok(near(c.pos1[j] - base[j], Math.round((c.pos1[j] - base[j]) * q) / q, 1e-9));
  }
  return { result, calls };
}

test('one particle: the smallest export is correct and complete', () => {
  const obj = createObject('point', { pos: [0.5, 1.5, 0.5], texture: 'heart', color: '#ff0080', size: 0.5, life: 3 });
  const { result, calls } = verifyExport([obj]);
  assert.equal(result.parts.length, 1);
  assert.deepEqual(calls[0], {
    dir1: [0, 1, 0], dir2: [0, 1, 0], minEmitPower: 0, maxEmitPower: 0, minLifeTime: 3, maxLifeTime: 3,
    minSize: 0.5, maxSize: 0.5, manualEmitCount: 1, gravity: [0, 0, 0], blendMode: 1,
    velocityGradients: [{ timeFraction: 0, factor: 1, factor2: 1 }],
    texture: 'heart',
    colorGradients: [{ timeFraction: 0, minColor: [255, 0, 128, 1], maxColor: [255, 0, 128, 1] }],
    pos1: [10.5, 21.5, -29.5], pos2: [10.5, 21.5, -29.5],
  });
  assert.ok(result.parts[0].code.includes('thisPos'));
  assert.ok(near(result.seconds, 5));
});

test('every texture and every shape exports correctly', () => {
  const objects = SHAPES.map((s, i) => createObject(s.id, {
    pos: [i % 5 * 3 - 6, 1 + Math.floor(i / 5) * 3, (i % 3) * 2.5 - 2],
    rot: [i * 17, i * 31, i * 7],
    scale: [1 + (i % 3) * 0.5, 1, 0.75],
    texture: TEXTURES[i % TEXTURES.length],
    color: rgbToHex([i * 10, 255 - i * 9, (i * 53) % 256]),
  }));
  for (const t of TEXTURES) objects.push(createObject('point', { texture: t, pos: [TEXTURES.indexOf(t), 9, 0] }));
  const { calls } = verifyExport(objects);
  assert.deepEqual(new Set(calls.map((c) => c.texture)), new Set(TEXTURES));
});

test('every option reaches the game call', () => {
  const a = createObject('circle', {
    pos: [0.5, 2, 0.5], texture: 'soul_0', color: '#102030', color2: '#f0e0d0', size: 0.2, size2: 0.9, life: 2.5,
    fade: true, blend: 2, move: [1, 2, -3], spread: 0.5, gravity: -9.8,
  });
  const b = createObject('sphere', { pos: [4, 2, 1], expand: 1.5, move: [0, 1, 0], spread: 0.25, life: 1 });
  const c = createObject('heart', { hidden: true });
  const { calls, result } = verifyExport([a, b, c], { hideDist: 64 });
  assert.equal(result.groups, 2);
  const ca = calls.filter((x) => x.texture === 'soul_0');
  assert.equal(ca.length, a.count);
  for (const x of ca) {
    assert.deepEqual(x.dir1, [0.5, 1.5, -3.5]);
    assert.deepEqual(x.dir2, [1.5, 2.5, -2.5]);
    assert.deepEqual([x.minEmitPower, x.maxEmitPower, x.minLifeTime, x.maxLifeTime], [1, 1, 2.5, 2.5]);
    assert.deepEqual([x.minSize, x.maxSize, x.blendMode, x.hideDist], [0.2, 0.9, 2, 64]);
    assert.deepEqual(x.gravity, [0, -9.8, 0]);
    // Two colours and a fade: the game would pick a new random colour at every
    // gradient step, so the code picks one colour per particle and keeps it.
    assert.deepEqual(x.colorGradients.map((g) => [g.timeFraction, g.minColor[3]]), [[0, 1], [0.8, 1], [1, 0]]);
    const rgb = x.colorGradients[0].minColor.slice(0, 3);
    for (const g of x.colorGradients) {
      assert.deepEqual(g.minColor, g.maxColor);
      assert.deepEqual(g.minColor.slice(0, 3), rgb);
    }
    const k = (rgb[0] - 16) / (240 - 16); // how far between the two colours
    assert.ok(k >= 0 && k <= 1);
    assert.ok(near(rgb[1], 32 + (224 - 32) * k, 1) && near(rgb[2], 48 + (208 - 48) * k, 1), `${rgb} is not between the two colours`);
  }
  assert.ok(new Set(ca.map((x) => x.colorGradients[0].minColor.join())).size > 5, 'particles get different colours');
  // expanding sphere: every particle flies away from the centre, speed grows with distance
  const cb = calls.filter((x) => x.texture === 'glint');
  assert.equal(cb.length, b.count);
  for (const x of cb) {
    const off = [x.pos1[0] - 10 - 4, x.pos1[1] - 20 - 2, x.pos1[2] + 30 - 1];
    assert.ok(near(Math.hypot(...off), 1, 0.02), 'on the unit sphere');
    for (let j = 0; j < 3; j++) {
      const mid = (x.dir1[j] + x.dir2[j]) / 2;
      assert.ok(near(mid, off[j] * 1.5 + (j === 1 ? 1 : 0), 1e-6));
      assert.ok(near(x.dir2[j] - x.dir1[j], 0.5, 1e-9));
    }
    assert.deepEqual([x.minEmitPower, x.maxEmitPower], [1, 1]);
  }
});

test('two colours without a fade are left to the game to mix', () => {
  const obj = createObject('circle', { color: '#102030', color2: '#f0e0d0' });
  const { calls, result } = verifyExport([obj]);
  for (const x of calls) {
    assert.deepEqual(x.colorGradients, [{ timeFraction: 0, minColor: [16, 32, 48, 1], maxColor: [240, 224, 208, 1] }]);
  }
  assert.ok(!result.parts[0].code.includes('Math.random'), 'no extra code when it is not needed');
  // one colour with a fade needs no extra code either
  const faded = verifyExport([createObject('circle', { fade: true })]);
  assert.ok(!faded.result.parts[0].code.includes('Math.random'));
  assert.deepEqual(faded.calls[0].colorGradients.map((g) => g.minColor[3]), [1, 1, 0]);
});

test('objects that look the same share one call', () => {
  const objects = [0, 1, 2, 3].map((i) => createObject('circle', { pos: [i * 3, 1, 0] }));
  objects.push(createObject('circle', { pos: [0, 5, 0], color: '#00ff00' }));
  const { result } = verifyExport(objects);
  assert.equal(result.groups, 2);
  assert.equal((result.parts[0].code.match(/^P\(/gm) || []).length, 2);
});

test('a scene too big for one code block is split into stacked blocks', () => {
  const objects = [];
  for (let i = 0; i < 12; i++) {
    objects.push(createObject('sphere', {
      count: 400, pos: [i * 3.37 - 20, 2.11 + i, i * -1.93], scale: [3.3, 3.3, 3.3], rot: [i * 11, i * 23, 0],
      color: i % 2 ? '#ff0000' : '#00aaff', life: 6 + (i % 3),
    }));
  }
  const { result } = verifyExport(objects);
  assert.ok(result.parts.length >= 3, `${result.parts.length} parts`);
  assert.equal(result.particles, 4800);
  result.parts.forEach((p, i) => {
    assert.ok(p.code.includes(`code block ${i + 1} of ${result.parts.length}`), 'header names the part');
    assert.equal(p.code.includes(`thisPos[1] - ${i}`), i > 0);
    if (i < result.parts.length - 1) assert.ok(p.chars > LIMITS.chars * 0.9, `part ${i + 1} is filled (${p.chars})`);
  });
  // coarser positions make the code smaller
  const small = verifyExport(objects, { precision: 10 }).result;
  assert.ok(small.parts.length < result.parts.length);
});

test('precisions', () => {
  const obj = createObject('helix', { pos: [0.333, 1.777, -2.049], scale: [1.234, 2.5, 0.77] });
  for (const { scale } of PRECISIONS) verifyExport([obj], { precision: scale });
});

test('an empty scene still gives valid code', () => {
  const { result, calls } = verifyExport([]);
  assert.equal(calls.length, 0);
  assert.equal(result.parts.length, 1);
});

test('World Code version redraws on a timer at a fixed world position', () => {
  const objects = [createObject('circle', { pos: [0.5, 1.5, 0.5], life: 3 }), createObject('point', { pos: [1, 2, 3], life: 3 })];
  const result = generateCode(objects, { target: 'world', worldPos: [100, 50, -200] });
  assert.equal(result.parts.length, 1);
  const code = result.parts[0].code;
  assert.ok(!code.includes('thisPos'));
  for (const line of code.split('\n')) assert.ok(line.length <= LIMITS.width, line);
  const calls = [];
  const sandbox = { api: { playParticleEffect: (o) => calls.push(JSON.parse(JSON.stringify(o))) } };
  vm.runInNewContext(code, sandbox);
  assert.equal(typeof sandbox.tick, 'function', 'defines the tick callback');
  assert.equal(calls.length, 0, 'nothing is drawn before the first tick');
  sandbox.tick(50);
  assert.equal(calls.length, 37);
  calls.forEach(checkCall);
  assert.deepEqual(calls[36].pos1, [101, 52, -197]);
  for (let i = 0; i < 99; i++) sandbox.tick(50); // 4.95 s later: the 5 s pause is not over
  assert.equal(calls.length, 37);
  sandbox.tick(50);
  assert.equal(calls.length, 74, 'redrawn after PS_EVERY ms');
  assert.equal(Object.keys(sandbox).filter((k) => !['api', 'tick'].includes(k)).length, 0, 'no other globals leak');
});

test('generated code is stable (same scene, same code)', () => {
  const objects = [createObject('star', { id: 'fixed' })];
  assert.equal(generateCode(objects).parts[0].code, generateCode(objects).parts[0].code);
});

// ---------------------------------------------------------------- time

const key = (t, o = {}) => ({ t, pos: [0.5, 2, 0.5], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth', ...o });
/** A scene object that went through loading, as the app has them. */
const timed = (o) => sanitizeScene({ objects: [createObject(o.shape || 'circle', { id: 'x', count: 12, pos: [0.5, 2, 0.5], ...o })] }).objects[0];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('time: an object is where its keys say, and travels between them', () => {
  const obj = timed({
    start: 2, life: 3, pos: [0, 1, 0],
    keys: [key(1, { pos: [4, 1, 0], ease: 'linear' }), key(2, { pos: [4, 5, 0], rot: [0, 0, 90], scale: [2, 2, 2] }), key(4, { pos: [0, 5, 0], rot: [0, 0, 90], scale: [2, 2, 2], ease: 'jump' })],
  });
  assert.deepEqual(poseAt(obj, 0).pos, [0, 1, 0]);
  assert.deepEqual(poseAt(obj, 0.5).pos, [2, 1, 0], 'steady: half the way after half the time');
  assert.deepEqual(poseAt(obj, 1).pos, [4, 1, 0]);
  const mid = poseAt(obj, 1.5); // smooth: half the way in the middle, and turned half
  assert.ok(near(mid.pos[1], 3) && near(mid.rot[2], 45, 1e-9) && near(mid.scale[0], 1.5));
  assert.ok(poseAt(obj, 1.25).pos[1] < 2, 'smooth starts slowly');
  assert.deepEqual(poseAt(obj, 3.9).pos, [4, 5, 0], 'a jump stays put until its time');
  assert.deepEqual(poseAt(obj, 4).pos, [0, 5, 0]);
  assert.deepEqual(poseAt(obj, 99).pos, [0, 5, 0]);
  // the eases
  const at = (ease, f) => poseAt(timed({ pos: [0, 0, 0], keys: [key(1, { pos: [1, 0, 0], ease })] }), f).pos[0];
  assert.deepEqual(EASES.map((e) => e.id), ['smooth', 'linear', 'in', 'out', 'jump']);
  assert.ok(near(at('linear', 0.25), 0.25) && near(at('in', 0.5), 0.25) && near(at('out', 0.5), 0.75) && near(at('smooth', 0.25), 0.125));
  // it is there from its start until its lifetime or its last key, whichever is later
  assert.deepEqual(spanOf(obj), { start: 2, end: 2 + 3 / LIFE_PER_SECOND });
  assert.deepEqual(spanOf({ ...obj, life: 0.6 }), { start: 2, end: 6 });
  assert.ok(near(sceneDuration([obj, createObject('point', { life: 1.2 })]), 7));
  assert.deepEqual(poseAtTime(obj, 0).pos, [0, 1, 0], 'before it appears: where it starts');
  assert.deepEqual(poseAtTime(obj, 3).pos, [4, 1, 0]);
  assert.deepEqual(poseAtTime(obj, 50).pos, [0, 5, 0], 'after it is gone: where it ended');
  // which key is under the time marker
  assert.equal(keyAt(obj, 2), 'start');
  assert.equal(keyAt(obj, 3), 0);
  assert.equal(keyAt(obj, 4.003), 1);
  assert.equal(keyAt(obj, 3.5), null);
  assert.equal(keyAt(createObject('circle'), 0), null, 'no keys: nothing to be on');
  // the short way round, or by the angles as written
  const turn = (spin) => poseAt(timed({ rot: [0, 0, 0], spin, keys: [key(1, { rot: [0, 0, 270], ease: 'linear' })] }), 0.5).rot[2];
  assert.ok(near(turn(false), -45, 1e-9) && near(turn(true), 135, 1e-9));
});

test('time: what a change of place changes depends on where the time marker is', () => {
  // appears at 2 s, stays 10 s, keys 1 s and 2 s after it appeared
  const obj = timed({ shape: 'heart', start: 2, keys: [key(1, { pos: [3, 2, 0] }), key(2, { pos: [3, 5, 0] })] });
  const at = (time, o = obj) => markAt(o, time);
  assert.deepEqual(at(0, createObject('circle')), { at: 'object' }, 'no keys: the object itself');
  assert.deepEqual(at(7, createObject('circle', { start: 3 })), { at: 'object' }, 'at any time');
  assert.deepEqual(at(0), { at: 'start' }, 'not there yet: where it starts');
  assert.deepEqual(at(2), { at: 'start' });
  assert.deepEqual(at(2.09), { at: 'start' }, 'too close to the start for a key of its own');
  assert.deepEqual(at(2.5), { at: 'between' }, 'a change here makes a key');
  assert.deepEqual(at(3), { at: 'key', index: 0 });
  assert.deepEqual(at(2.95), { at: 'key', index: 0 }, 'just before a key counts as on it');
  assert.deepEqual(at(3.05), { at: 'key', index: 0 }, 'and just after it');
  assert.deepEqual(at(3.5), { at: 'between' });
  assert.deepEqual(at(4), { at: 'key', index: 1 });
  assert.deepEqual(at(8), { at: 'between' }, 'after its last key it is still there');
  assert.deepEqual(at(12), { at: 'between' }, 'the moment it goes');
  assert.deepEqual(at(12.5), { at: 'last', index: 1 }, 'gone: the key it ended on');
  // wherever a key could not be made, the marker counts as on something else
  for (let time = 0; time <= 13; time += 0.01) {
    const mark = at(time);
    if (mark.at !== 'between') continue;
    const t = time - obj.start;
    assert.ok(t >= MIN_KEY_GAP - 1e-9 && obj.keys.every((k) => Math.abs(k.t - t) >= MIN_KEY_GAP - 1e-9), `a key fits at ${time.toFixed(2)} s`);
  }
  // an object that ends on its last key
  const short = timed({ shape: 'heart', life: 0.6, keys: [key(3, { pos: [1, 1, 1] })] });
  assert.deepEqual(markAt(short, 3), { at: 'key', index: 0 });
  assert.deepEqual(markAt(short, 3.05), { at: 'key', index: 0 });
  assert.deepEqual(markAt(short, 5), { at: 'last', index: 0 });
  // all the keys it can have
  const full = timed({ shape: 'heart', keys: Array.from({ length: MAX_KEYS }, (_, i) => key(1 + i, { pos: [i, 0, 0] })) });
  assert.deepEqual(markAt(full, 1.5), { at: 'full' });
  assert.deepEqual(markAt(full, 2), { at: 'key', index: 1 });
});

test('time: a turn that cannot be cut finely enough says what would help', () => {
  const turn = (o, t, rot) => planOf(timed({ shape: 'heart', ...o, keys: [key(t, { rot, scale: o.scale || [1, 1, 1] })] }));
  const fine = turn({}, 2, [0, 0, 90]);
  assert.equal(fine.rough, '');
  assert.ok(fine.pieces.length >= 3, 'a turn is flown as several straight stretches');
  // a big shape, a full turn, 0.4 seconds: there is no time for enough stretches
  assert.equal(turn({ scale: [3, 3, 3], spin: true }, 0.4, [0, 360, 0]).rough, 'quick');
  // a huge shape, two full turns, plenty of time: more stretches than one move may have
  const big = turn({ scale: [30, 30, 30], spin: true }, 60, [0, 720, 0]);
  assert.equal(big.rough, 'big');
  // a key halfway does help there
  const halves = planOf(timed({ shape: 'heart', scale: [30, 30, 30], spin: true, keys: [key(30, { rot: [0, 360, 0], scale: [30, 30, 30], ease: 'linear' }), key(60, { rot: [0, 720, 0], scale: [30, 30, 30], ease: 'linear' })] }));
  assert.equal(halves.rough, '');
  assert.ok(halves.pieces.length > big.pieces.length);
  // and more time helps the quick one
  assert.equal(turn({ scale: [3, 3, 3], spin: true }, 4, [0, 360, 0]).rough, '');
  // moving or resizing without a turn never needs stretches
  assert.equal(planOf(timed({ shape: 'heart', keys: [key(0.1, { pos: [50, 2, 0.5], scale: [20, 20, 20] })] })).rough, '');
});

test('time: loading keeps timing and repairs what is broken', () => {
  const [a, b, c] = sanitizeScene({
    objects: [
      {
        shape: 'circle', start: -3, fadeIn: 1, spin: 'yes',
        keys: [
          { t: 2, pos: [1, 2, 3], rot: [0, 90, 0], scale: [2, 2, 2], ease: 'nope' },
          { t: 0.5, pos: ['x', 1, 1] }, { t: 0.55 }, { t: 0.04 }, { t: 'soon' }, null, 7,
          { t: 2.05, ease: 'jump' }, { t: 9, ease: 'out', scale: [1e9, 1, 1] },
        ],
      },
      { shape: 'point', start: 1e9, keys: [{ t: 1, pos: [1, 1, 1], rot: [9, 9, 9], scale: [5, 5, 5] }] },
      { shape: 'circle', keys: Array.from({ length: 40 }, (_, i) => ({ t: 1 + i })) },
    ],
  }).objects;
  assert.equal(a.start, 0);
  assert.equal(a.fadeIn, true);
  assert.equal(a.spin, true);
  assert.deepEqual(a.keys.map((k) => k.t), [0.5, 2, 9], 'in order of time; keys too close to the start or to another are dropped');
  assert.deepEqual(a.keys[0], { t: 0.5, pos: [0.5, 1, 1], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth' });
  assert.equal(a.keys[1].ease, 'smooth');
  assert.deepEqual([a.keys[2].ease, a.keys[2].scale], ['out', [100, 1, 1]]);
  assert.equal(b.start, MAX_START);
  assert.deepEqual([b.keys[0].pos, b.keys[0].rot, b.keys[0].scale], [[1, 1, 1], [0, 0, 0], [1, 1, 1]], 'a single particle only moves');
  assert.equal(c.keys.length, MAX_KEYS);
  assert.ok(MIN_KEY_GAP > 0);
  const scene = { version: 1, objects: [a, b, c] };
  assert.deepEqual(sanitizeScene(JSON.parse(JSON.stringify(scene))), scene, 'sanitize is stable');
  // a scene from before there was timing loads as it was
  const old = createObject('heart', { id: 'old' });
  for (const k of ['start', 'fadeIn', 'keys', 'spin']) delete old[k];
  const loaded = sanitizeScene({ objects: [old] }).objects[0];
  assert.deepEqual(loaded, createObject('heart', { id: 'old' }));
  assert.ok(isPlain(loaded) && !isPlain(a) && !isPlain({ ...loaded, start: 1 }) && !isPlain({ ...loaded, fadeIn: true }));
});

test('time: scenes without timing export exactly the code they always did', () => {
  // Fingerprints of the code this scene gave before timing existed.
  const scene = () => SHAPES.slice(0, 40).map((sh, i) => createObject(sh.id, {
    id: `o${i}`, pos: [i % 5 * 3 - 6, 1 + Math.floor(i / 5) * 3, (i % 3) * 2.5 - 2], rot: [i * 17, i * 31, i * 7],
    scale: [1 + (i % 3) * 0.5, 1, 0.75], texture: TEXTURES[i % TEXTURES.length], color: rgbToHex([i * 10 % 256, 255 - i * 6, (i * 53) % 256]),
    fade: i % 4 === 0, color2: i % 5 === 0 ? '#ffffff' : null, size2: i % 6 === 0 ? 0.8 : null, blend: i % 5,
    move: i % 7 === 0 ? [1, 2, -3] : [0, 0, 0], spread: i % 9 === 0 ? 0.5 : 0, expand: i % 11 === 0 ? 1.5 : 0,
    gravity: i % 13 === 0 ? -9.8 : 0, life: 1 + (i % 8), hidden: i % 17 === 0,
  }));
  const print = (options) => {
    const r = generateCode(scene(), options);
    return [r.parts.length, r.particles, crypto.createHash('sha1').update(r.parts.map((part) => part.code).join('\n@@\n')).digest('hex').slice(0, 16)];
  };
  assert.deepEqual(print({}), [3, 1868, '228c903837f0f9c8']);
  assert.deepEqual(print({ precision: 10, hideDist: 64 }), [2, 1868, '2ca637cebb26e16d']);
  assert.deepEqual(print({ target: 'world', worldPos: [100, 50, -200] }), [1, 1868, 'c05ff232be85a28e']);
  // and the preview of such a scene is the old one too: the picture at the click is the still picture
  const still = computeParticles(scene());
  const first = computeParticles(scene(), 0);
  assert.equal(first.length, still.length);
  still.forEach((p, i) => assert.ok(dist(p.pos, first[i].pos) < 1e-12 && p.alpha === first[i].alpha));
});

const ORIGIN = [10, 20, -30];

/** Run every part of an export the way stacked code blocks run, and collect the calls. */
function runExport(objects, options = {}) {
  const result = generateCode(objects, options);
  const calls = [];
  result.parts.forEach((part, i) => {
    checkLimits(part, `part ${i + 1}/${result.parts.length}`);
    const got = runPart(part.code, [ORIGIN[0], ORIGIN[1] + i, ORIGIN[2]]);
    assert.equal(got.length, part.particles, `part ${i + 1} particle count`);
    calls.push(...got);
  });
  calls.forEach(checkCall);
  assert.equal(calls.length, result.particles);
  return { result, calls };
}

/** How much of a particle of the stand-in engine is seen (0 to 1), the way its blend mode draws it. */
function strength(particle, call) {
  if (call.blendMode !== 0) return particle.color[3];
  const full = Math.max(1, ...call.colorGradients.map((g) => Math.max(...g.minColor.slice(0, 3)))); // mode 0 ignores alpha
  return (Math.max(...particle.color.slice(0, 3)) * 255) / full;
}

/**
 * Export one object with timing, play the code in the stand-in for the game's
 * particle engine (tests/babylon-sim.mjs) and compare what is seen, frame by
 * frame, with what the keys say. `steps(frame, age)` gives the length of each
 * frame as particle age (default: a steady frame rate).
 */
function playInEngine(obj, { fps = 60, steps = null, exported = null } = {}) {
  const { result, calls } = exported || runExport([obj]);
  const plan = planOf(obj);
  const points = localPoints(obj);
  const K = plan.pieces.length;
  assert.equal(calls.length, points.length * K, 'one particle per point and piece');
  const h = frameAge(fps);
  const ages = [0];
  while (ages[ages.length - 1] < plan.a1 + 0.1) {
    const a = ages[ages.length - 1];
    ages.push(a + (steps ? steps(ages.length, a) : h));
  }
  const flies = obj.move.some((v) => v) || obj.expand || obj.gravity || obj.spread;
  const fades = obj.fade || obj.fadeIn;
  const end = obj.start + (plan.a1 - plan.a0) / LIFE_PER_SECOND;
  const placed = new Map(); // the whole shape at a time, worked out once
  const place = (time, i) => {
    const t = Math.round(Math.min(Math.max(time, obj.start), end - 1e-6) * 1e7) / 1e7;
    if (!placed.has(t)) placed.set(t, posedPoints(obj, poseAtTime(obj, t)).map((p) => p.map((v, j) => v + ORIGIN[j])));
    return placed.get(t)[i];
  };
  const stat = { result, calls, pieces: K, off: 0, restOff: 0, fastest: 0, gaps: 0, doubles: 0, early: 0, late: 0, seenFrames: 0 };
  for (const c of calls) stat.fastest = Math.max(stat.fastest, Math.hypot(...c.dir1) * c.maxEmitPower);
  points.forEach((l, i) => {
    const seen = new Array(ages.length).fill(0);
    for (let k = 0; k < K; k++) {
      const call = calls[i * K + k];
      const p = createParticle(call, () => 0.5);
      for (let f = 0; f < ages.length; f++) {
        if (f > 0 && !p.update(ages[f] - ages[f - 1])) break;
        const s = strength(p, call);
        seen[f] += s;
        if (s <= 0.5 || flies) continue;
        // against the keys (a jump may show a blink early or late: take the nearer side)
        const t = p.age / LIFE_PER_SECOND;
        const d = Math.min(dist(p.position, place(t - 0.002, i)), dist(p.position, place(t + 0.002, i)));
        stat.off = Math.max(stat.off, d);
        if (dist(place(t - 0.1, i), place(t + 0.1, i)) < 1e-9) stat.restOff = Math.max(stat.restOff, d);
      }
    }
    ages.forEach((a, f) => {
      if (a < plan.a0 - SWITCH - 1e-9) stat.early = Math.max(stat.early, seen[f]);
      else if (a >= plan.a1 + (ages[f] - ages[f - 1] || h)) stat.late = Math.max(stat.late, seen[f]);
      else if (a >= plan.a0 + 1e-6 && a < plan.a1 - 1e-6 && !fades) {
        stat.seenFrames++;
        if (seen[f] < 0.999) stat.gaps++;
        if (seen[f] > 1.001) stat.doubles++;
      }
    });
  });
  return stat;
}

const TIMED_CASES = {
  'appears later': { start: 2 },
  'appears later, flies off': { start: 1.5, move: [1, 2, 0], gravity: -3, expand: 0.5 },
  'moves and stays': { keys: [key(2.05, { pos: [0.5, 5, 0.5] })] },
  'waits, moves, stays': { start: 1, keys: [key(1.03), key(2.11, { pos: [3.5, 5, 0.5] })] },
  'steady': { start: 1, keys: [key(1.03), key(2.11, { pos: [3.5, 5, 0.5], ease: 'linear' })] },
  'speeds up': { start: 1, keys: [key(1.03), key(2.11, { pos: [3.5, 5, 0.5], ease: 'in' })] },
  'slows down': { start: 1, keys: [key(1.03), key(2.11, { pos: [3.5, 5, 0.5], ease: 'out' })] },
  'slows down, unseen before': { start: 1, life: 0.6, keys: [key(1.03, { pos: [3.5, 5, 0.5], ease: 'out' })] },
  'a path': {
    start: 1,
    keys: [key(1.03, { pos: [0.5, 5, 0.5], ease: 'linear' }), key(2.11, { pos: [4, 5, 0.5] }), key(3.07, { pos: [4, 2, 0.5], ease: 'linear' })],
  },
  'jumps': { keys: [key(1.03, { pos: [0.5, 5, 0.5], ease: 'jump' }), key(2.57, { pos: [4, 5, 0.5], ease: 'jump' })] },
  // times that fall exactly on frames at 60, 30 and 20 frames per second
  'on the beat': { start: 1, keys: [key(1, { pos: [0.5, 5, 0.5], ease: 'jump' }), key(2, { pos: [4, 5, 0.5], rot: [0, 0, 90] }), key(3, { pos: [4, 2, 0.5], ease: 'linear' })] },
  'grows': { keys: [key(2.05, { scale: [2, 2, 2] })] },
  'turns': { start: 1, keys: [key(2.05, { rot: [0, 90, 0] })] },
  'turns and moves': { keys: [key(3.03, { rot: [0, 180, 0], pos: [3, 3, 0.5], ease: 'linear' })] },
  'a full turn': { start: 0.7, spin: true, life: 2.4, keys: [key(4.01, { rot: [0, 0, 360], ease: 'linear' })] },
  'a cube tumbles': {
    shape: 'cube', count: 30, rot: [10, 20, 30], scale: [1.5, 1, 0.5],
    keys: [key(2.05, { rot: [100, -40, 75], scale: [1, 2, 1], pos: [2, 3, -1] })],
  },
  'one particle': { shape: 'point', keys: [key(1.03, { pos: [3, 2, 0.5] }), key(2.11, { pos: [3, 5, 0.5], ease: 'jump' })] },
  'moves, then scatters': { spread: 1, gravity: -2, keys: [key(1.53, { pos: [0.5, 6, 0.5], ease: 'out' })] },
};

test('time: exported code plays as the keys say, at any frame rate and in any blend mode', () => {
  for (const [name, fields] of Object.entries(TIMED_CASES)) {
    for (const [blend, rates] of [[1, [144, 60, 30, 20, 12]], [2, [60, 20]], [0, [60]], [3, [30]]]) {
      const obj = timed({ ...fields, blend });
      for (const fps of rates) {
        const label = `${name}, blend ${blend}, ${fps} fps`;
        const s = playInEngine(obj, { fps });
        assert.equal(s.early, 0, `${label}: seen before its time`);
        assert.equal(s.late, 0, `${label}: seen after its time`);
        assert.ok(s.seenFrames > 0, label);
        // exactly one particle shows every point of the shape at every moment
        assert.equal(s.gaps, 0, `${label}: a point was not shown in ${s.gaps} frames`);
        assert.ok(s.doubles <= s.pieces * 12, `${label}: a point was shown twice in ${s.doubles} frames`);
        // standing still: exact. On the way: on the path, at most one frame ahead,
        // and a turn within the 0.06 block a path of straight stretches is allowed.
        assert.ok(s.restOff <= 0.011, `${label}: ${s.restOff.toFixed(4)} off while standing`);
        // (Seen standing before a "Slow down" move, it cannot be at full speed at once: half a SWITCH behind.)
        const ahead = s.fastest * frameAge(fps);
        const behind = name === 'slows down' ? (s.fastest * SWITCH) / 2 : 0;
        assert.ok(s.off <= 0.065 + ahead * 1.02 + behind, `${label}: ${s.off.toFixed(3)} off the path (one frame is ${ahead.toFixed(3)})`);
      }
    }
  }
});

test('time: a frame that takes very long never leaves a gap, and nothing ends in the wrong place', () => {
  const cases = ['appears later', 'waits, moves, stays', 'steady', 'slows down', 'a path', 'jumps', 'turns', 'a full turn'];
  for (const name of cases) {
    for (const blend of [1, 2]) {
      const obj = timed({ ...TIMED_CASES[name], blend, count: 5 });
      const plan = planOf(obj);
      const exported = runExport([obj]);
      for (const long of blend === 1 ? [0.03, 0.09, 0.6] : [0.3]) { // 50 ms to 1 s, the longest step the engine takes
        for (let at = 0; at < plan.a1; at += plan.a1 / 13) {
          const h = frameAge(60);
          const s = playInEngine(obj, { exported, steps: (f, age) => (age <= at && age + h > at ? long : h) });
          const label = `${name}, blend ${blend}, a ${Math.round(long / 0.0006)} ms frame at ${(at / LIFE_PER_SECOND).toFixed(2)} s`;
          assert.equal(s.gaps, 0, `${label}: a point was not shown in ${s.gaps} frames`);
          assert.equal(s.early + s.late, 0, `${label}: seen outside its time`);
          assert.ok(s.restOff <= 0.011, `${label}: ${s.restOff.toFixed(4)} off while standing`);
        }
      }
    }
  }
});

test('time: fades in and out, also while it moves', () => {
  const obj = timed({ start: 1, life: 3, fade: true, fadeIn: true, keys: [key(2.5, { pos: [3, 2, 0.5], rot: [0, 0, 180] })] });
  const plan = planOf(obj);
  const life = plan.a1 - plan.a0;
  assert.ok(plan.pieces.length >= 4);
  for (const blend of [1, 2, 0]) {
    for (const fps of [60, 30, 20]) {
      const o = { ...obj, blend };
      const { calls } = runExport([o]);
      const K = plan.pieces.length;
      const h = frameAge(fps);
      const mine = calls.slice(0, K).map((c) => ({ c, p: createParticle(c, () => 0.5) }));
      for (let f = 1; f * h < plan.a1 + 0.1; f++) {
        let seen = 0;
        for (const { c, p } of mine) if (p.update(h)) seen += strength(p, c);
        const a = f * h;
        const want = a < plan.a0 || a >= plan.a1 ? 0 : Math.min(1, (a - plan.a0) / (0.2 * life), (plan.a1 - a) / (0.2 * life));
        // never fainter than the fade says; for a moment (one piece handing over
        // to the next) it may show double
        assert.ok(seen >= want - 0.08 - (2 * h) / (0.2 * life), `blend ${blend}, ${fps} fps, age ${a.toFixed(2)}: ${seen.toFixed(2)} seen, ${want.toFixed(2)} wanted`);
        assert.ok(seen <= 2 * want + 0.08 + (2 * h) / (0.2 * life), `blend ${blend}, ${fps} fps, age ${a.toFixed(2)}: ${seen.toFixed(2)} seen, ${want.toFixed(2)} wanted`);
      }
    }
  }
  // blend mode 0 ignores alpha: the code darkens the colour instead and leaves alpha alone
  const { calls } = runExport([{ ...obj, blend: 0, color: '#ff8040' }]);
  for (const c of calls) {
    assert.ok(c.colorGradients.every((g) => g.minColor[3] === 1));
    assert.ok(c.colorGradients.some((g) => g.minColor.slice(0, 3).join() === '0,0,0'), 'black while unseen');
  }
});

test('time: every point keeps one colour and one size through all its pieces', () => {
  const obj = timed({
    color: '#102030', color2: '#f0e0d0', size: 0.2, size2: 0.9, texture: 'soul_0', start: 0.5,
    keys: [key(1, { rot: [0, 0, 90] }), key(2, { pos: [3, 2, 0.5], ease: 'jump' })],
  });
  const { calls, result } = runExport([obj], { hideDist: 48 });
  const K = piecesOf(obj);
  assert.ok(K >= 4);
  assert.equal(result.particles, obj.count * K);
  const colours = new Set();
  for (let i = 0; i < obj.count; i++) {
    const mine = calls.slice(i * K, (i + 1) * K);
    const rgb = mine[0].colorGradients[0].minColor.slice(0, 3);
    colours.add(rgb.join());
    const k = (rgb[0] - 16) / (240 - 16);
    assert.ok(k >= 0 && k <= 1 && near(rgb[1], 32 + 192 * k, 1) && near(rgb[2], 48 + 160 * k, 1), `${rgb} is not between the two colours`);
    for (const c of mine) {
      for (const g of c.colorGradients) assert.deepEqual([g.minColor.slice(0, 3), g.maxColor.slice(0, 3)], [rgb, rgb]);
      assert.equal(c.minSize, c.maxSize);
      assert.equal(c.minSize, mine[0].minSize);
      assert.ok(c.minSize >= 0.2 && c.minSize <= 0.9);
      assert.deepEqual([c.texture, c.blendMode, c.hideDist, c.manualEmitCount], ['soul_0', 1, 48, 1]);
    }
  }
  assert.ok(colours.size > 5, 'points get different colours');
  assert.ok(new Set(calls.map((c) => c.minSize)).size > 5, 'points get different sizes');
});

test('time: plain and timed objects share a scene; World Code waits for the whole show', () => {
  const plain = createObject('circle', { id: 'p', pos: [0.5, 1.5, 0.5], life: 3, color: '#00ff00' });
  const late = timed({ shape: 'heart', count: 20, start: 4, life: 1.2, color: '#ff0000' });
  const mover = timed({ shape: 'point', color: '#0000ff', keys: [key(9, { pos: [5, 2, 0.5] })] });
  const { result, calls } = runExport([plain, late, mover, { ...late, id: 'h', hidden: true }]);
  assert.equal(result.particles, plain.count + 20 + 2);
  assert.ok(near(result.seconds, 10), 'until the last object is gone');
  const of = (rgb) => calls.filter((c) => c.colorGradients[0].minColor.slice(0, 3).join() === rgb);
  // the plain object is written the short way, its particles are there from the start
  assert.equal(of('0,255,0').length, plain.count);
  for (const c of of('0,255,0')) assert.deepEqual([c.colorGradients.length, c.minLifeTime], [1, 3]);
  // the late one waits unseen, then is there for its lifetime
  for (const c of of('255,0,0')) {
    assert.equal(c.minLifeTime, 3.6);
    assert.deepEqual(c.colorGradients.map((g) => g.minColor[3]), [0, 0, 1]);
    assert.ok(near(c.colorGradients[2].timeFraction, 2.4 / 3.6, 2e-6) && c.colorGradients[2].timeFraction <= 2.4 / 3.6);
    assert.ok(c.colorGradients[1].timeFraction < c.colorGradients[2].timeFraction);
  }
  const code = result.parts[0].code;
  assert.ok(/^P\(/m.test(code) && /^T\(/m.test(code));
  // only plain objects: no helper for timing in the code; only timed ones: none for plain
  assert.ok(!generateCode([plain]).parts[0].code.includes('const T ='));
  assert.ok(!generateCode([late]).parts[0].code.includes('const P ='));
  // World Code redraws when everything is over
  const world = generateCode([plain, late, mover], { target: 'world' });
  assert.ok(world.parts[0].code.includes('const PS_EVERY = 10000'));
  const drawn = [];
  const sandbox = { api: { playParticleEffect: (o) => drawn.push(o) } };
  vm.runInNewContext(world.parts[0].code, sandbox);
  sandbox.tick(50);
  assert.equal(drawn.length, result.particles);
  assert.equal(Object.keys(sandbox).filter((k) => !['api', 'tick'].includes(k)).length, 0, 'no other globals leak');
});

test('time: a big object with many keys is split so that every code block fits', () => {
  const keys = Array.from({ length: MAX_KEYS }, (_, i) => key(1 + i * 1.5, {
    pos: [i % 2 ? 4 : -4, 2 + i, i], rot: [i * 97, i * 55, i * 140], scale: [4, 4, 4], ease: i % 3 === 0 ? 'linear' : 'smooth',
  }));
  const obj = timed({ shape: 'sphere', count: 600, scale: [4, 4, 4], keys, spin: true });
  const K = piecesOf(obj);
  assert.ok(K > 60, `${K} pieces`);
  const { result, calls } = runExport([obj]);
  assert.ok(result.parts.length > 3);
  assert.equal(result.particles, 600 * K);
  assert.equal(calls.length, 600 * K);
  // every point of the shape got every piece exactly once
  const lifetimes = new Map();
  for (const c of calls) lifetimes.set(c.minLifeTime, (lifetimes.get(c.minLifeTime) || 0) + 1);
  assert.equal(lifetimes.size, K);
  for (const n of lifetimes.values()) assert.equal(n, 600);
  result.parts.forEach((part, i) => assert.ok(part.code.includes(`code block ${i + 1} of ${result.parts.length}`)));
  // coarser positions and World Code work too
  runExport([obj], { precision: 10 });
  assert.equal(generateCode([obj], { target: 'world' }).parts.length, 1);
});

test('time: the preview shows what the exported code does', () => {
  for (const name of ['waits, moves, stays', 'a path', 'turns and moves', 'a full turn', 'jumps', 'appears later, flies off']) {
    const obj = timed({ ...TIMED_CASES[name], spread: 0 });
    const { calls } = runExport([obj]);
    const K = piecesOf(obj);
    const h = frameAge(240); // small steps: the preview has no frames
    const engine = calls.map((c) => ({ c, p: createParticle(c, () => 0.5), alive: true }));
    const total = spanOf(obj).end * LIFE_PER_SECOND;
    let checked = 0;
    for (let f = 1; f * h < total + 0.05; f++) {
      for (const e of engine) e.alive = e.alive && e.p.update(h);
      if (f % 31) continue;
      const shown = computeParticles([obj], (f * h) / LIFE_PER_SECOND);
      const inGame = engine.filter((e) => e.alive && e.p.color[3] > 0.5);
      if (Math.abs(inGame.length - shown.length) > 0) continue; // the very frame of a hand-over
      for (const p of shown) {
        const twin = engine.filter((e, j) => Math.floor(j / K) === p.index && e.alive && e.p.color[3] > 0.5)[0];
        assert.ok(twin, `${name}: point ${p.index} is not in the game at frame ${f}`);
        const d = dist(p.pos.map((v, j) => v + ORIGIN[j]), twin.p.position);
        // the game is up to one frame ahead, and its pull lags half a frame behind
        const step = Math.hypot(...twin.c.dir1) * h;
        const pull = 0.5 * Math.abs(obj.gravity) * f * h * h;
        assert.ok(d < 0.012 + 1.1 * step + pull, `${name}: preview and game are ${d.toFixed(3)} apart at frame ${f}`);
        checked++;
      }
    }
    assert.ok(checked > obj.count * 20, `${name}: ${checked} comparisons`);
  }
  // while editing, an object that is not there is drawn see-through where it starts or ended
  const obj = timed({ start: 2, life: 1.2, keys: [key(1, { pos: [5, 2, 0.5] })] });
  assert.equal(computeParticles([obj], 1).length, 0);
  const before = computeParticles([obj], 1, { ghosts: true });
  assert.equal(before.length, obj.count);
  assert.ok(before.every((p) => p.ghost && p.alpha === GHOST));
  assert.ok(dist(before[0].pos, objectPoints(obj)[0]) < 1e-12);
  const after = computeParticles([obj], 60, { ghosts: true });
  assert.ok(near(after[0].pos[0] - before[0].pos[0], 4.5), 'after it is gone: at its last key');
  const during = computeParticles([obj], 2.5, { ghosts: true });
  assert.ok(during.every((p) => !p.ghost && p.alpha === 1));
});

// ---------------------------------------------------------------- groups, repeats, colours and sizes at keys

const scene = (...objects) => sanitizeScene({ objects }).objects;
const groupAt = (o = {}) => createGroup({ id: 'g', name: 'Group', pos: [0.5, 4, 0.5], ...o });
const gkey = (t, o = {}) => ({ t, pos: [0.5, 4, 0.5], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth', ...o });
const inGroup = (o = {}) => createObject(o.shape || 'circle', { id: 'ring', name: 'Ring', count: 8, pos: [3, 0, 0], life: 3, parent: 'g', ...o });
const ckey = (t, o = {}) => ({ t, pos: [3, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth', ...o });

/**
 * Where point `l` of an object is at a time, worked out by three.js with a
 * hierarchy of its own (and Z flipped at the end): the yardstick for groups.
 * lineage: one play of the object, from sceneTree().playsOf().
 */
function byThree(leaf, lineage, time, l) {
  const chain = [...lineage.ancestors].reverse().concat([{ node: leaf, start: lineage.start }]);
  const top = new THREE.Object3D();
  let parent = top;
  for (const { node, start } of chain) {
    const pose = poseAt(node, time - start);
    const o = new THREE.Object3D();
    o.position.set(pose.pos[0], pose.pos[1], -pose.pos[2]);
    o.rotation.set(...pose.rot.map((v) => (v * Math.PI) / 180), 'XYZ');
    o.scale.set(...pose.scale);
    parent.add(o);
    parent = o;
  }
  top.updateMatrixWorld(true);
  const v = new THREE.Vector3(...l).applyMatrix4(parent.matrixWorld);
  return [v.x, v.y, -v.z];
}

/**
 * Export a scene, play the code in the stand-in for the game's engine and
 * compare every object with timing, frame by frame, with where three.js says
 * it is. Returns one record per such object.
 */
function playScene(objects, { fps = 60, options = {} } = {}) {
  const tree = sceneTree(objects);
  const { result, calls } = runExport(objects, options);
  const timedLeaves = tree.leaves().filter((o) => !tree.plain(o));
  const piecesIn = (leaf) => tree.playsOf(leaf).reduce((n, lineage) => n + planOf(leaf, lineage).pieces.length, 0);
  // (what follows counts on every object being one T(...) in the code: point after point, each with all its pieces)
  assert.equal(result.parts.reduce((n, part) => n + (part.code.match(/^T\(/gm) || []).length, 0), timedLeaves.length);
  // objects without timing come first in the code, then the others in the order of the list
  let at = calls.length - timedLeaves.reduce((n, leaf) => n + localPoints(leaf).length * piecesIn(leaf), 0);
  const h = frameAge(fps);
  return timedLeaves.map((leaf) => {
    const plays = tree.playsOf(leaf);
    const plans = plays.map((lineage) => planOf(leaf, lineage));
    // the code lists the pieces of all plays the other way round
    const order = plans.flatMap((plan, n) => plan.pieces.map((piece) => ({ piece, n }))).reverse();
    const K = order.length;
    const points = localPoints(leaf);
    const mine = calls.slice(at, at + points.length * K);
    at += points.length * K;
    const flies = leaf.move.some((v) => v) || leaf.spread > 0 || leaf.expand !== 0 || leaf.gravity !== 0;
    const flightFrom = leaf.keys.length ? leaf.keys[leaf.keys.length - 1].t : 0;
    const stat = { name: leaf.name, leaf, plays, plans, calls: mine, pieces: K, off: 0, offAt: 0, fastest: 0, gaps: 0, doubles: 0, early: 0, late: 0, frames: 0 };
    for (const c of mine) stat.fastest = Math.max(stat.fastest, Math.hypot(...c.dir1) * c.maxEmitPower);
    const end = Math.max(...plans.map((plan) => plan.a1));
    points.forEach((l, i) => {
      const engine = mine.slice(i * K, (i + 1) * K).map((c, k) => ({ c, p: createParticle(c, () => 0.5), n: order[k].n }));
      for (let f = 1; f * h < end + 0.1; f++) {
        const age = f * h;
        let seen = 0;
        for (const e of engine) {
          if (!e.p.update(h)) continue;
          const s = strength(e.p, e.c);
          seen += s;
          if (s <= 0.5) continue;
          const lineage = plays[e.n];
          const t = Math.min(e.p.age / LIFE_PER_SECOND, lineage.start + staySeconds(leaf) - 1e-6);
          if (flies && t - lineage.start >= flightFrom - 1e-9) continue; // free flight has a test of its own
          const d = Math.min(...[-0.002, 0.002].map((dt) => dist(e.p.position, byThree(leaf, lineage, t + dt, l).map((v, j) => v + ORIGIN[j]))));
          if (d > stat.off) { stat.off = d; stat.offAt = t; }
        }
        const inside = plans.filter((plan) => age >= plan.a0 + 1e-6 && age < plan.a1 - 1e-6).length;
        if (!plans.some((plan) => age >= plan.a0 - SWITCH - 1e-9 && age < plan.a1 + h)) stat[age < plans[0].a0 ? 'early' : 'late'] = Math.max(stat.early, seen);
        else if (inside && !leaf.fade && !leaf.fadeIn) {
          stat.frames++;
          if (seen < inside - 0.001) stat.gaps++;
          if (seen > inside + 0.001) stat.doubles++;
        }
      }
    });
    stat.result = result;
    return stat;
  });
}

test('groups: an object in a group that stands still is written where the group puts it', () => {
  const objects = scene(
    groupAt({ pos: [2, 3, -4], rot: [20, 35, -50], scale: [2, 1, 0.5] }),
    createGroup({ id: 'inner', parent: 'g', pos: [1, 0, 2], rot: [0, 90, 10], scale: [1, 1.5, 1] }),
    inGroup({ parent: 'inner', shape: 'star', count: 20, pos: [0.5, -1, 0.25], rot: [15, 0, 70], scale: [1, 2, 1], move: [1, 2, -0.5], expand: 0.5 }),
    inGroup({ id: 'dot', shape: 'point', parent: 'g', pos: [1, 1, 1] }),
  );
  const tree = sceneTree(objects);
  const [, , star, dot] = objects;
  assert.ok(tree.plain(star) && tree.plain(dot), 'no timing anywhere: the short way of writing');
  const { result, calls } = runExport(objects);
  assert.ok(!result.parts[0].code.includes('const T ='), 'no helper for timing');
  assert.equal(result.particles, 21);
  const play = tree.playsOf(star)[0];
  const want = localPoints(star).map((l) => byThree(star, play, 0, l));
  stillPoints(tree, star).forEach((p, i) => assert.ok(dist(p, want[i]) < 1e-9, `point ${i}`));
  const mine = calls.filter((c) => c.minEmitPower === 1);
  assert.equal(mine.length, 20);
  // Move points the way the groups are turned (and is as big as they are); Grow leaves the middle of the shape
  const centre = byThree(star, play, 0, [0, 0, 0]);
  const ahead = byThree(star, play, 0, [0, 0, 0]).map((v, j) => byThree({ ...star, pos: star.pos.map((x, k) => x + star.move[k]) }, play, 0, [0, 0, 0])[j] - v);
  mine.forEach((c, i) => {
    const p = c.pos1.map((v, j) => v - ORIGIN[j]);
    assert.ok(dist(p, want[i]) < 0.009, `particle ${i} is ${dist(p, want[i]).toFixed(4)} off`); // (2 decimals in the code)
    const dir = ahead.map((v, j) => v + (p[j] - centre[j]) * 0.5);
    assert.ok(dist(c.dir1, dir) < 0.01 && dist(c.dir2, dir) < 0.01, `particle ${i} flies ${c.dir1}, wanted ${dir.map((v) => v.toFixed(3))}`);
  });
  const single = calls.find((c) => c.minEmitPower === 0);
  assert.ok(dist(single.pos1.map((v, j) => v - ORIGIN[j]), byThree(dot, tree.playsOf(dot)[0], 0, [0, 0, 0])) < 0.009);
  // the still picture and the picture at the click are the same, as without groups
  const still = computeParticles(objects);
  const first = computeParticles(objects, 0);
  assert.equal(still.length, 21);
  still.forEach((p, i) => assert.ok(dist(p.pos, first[i].pos) < 1e-9 && p.alpha === first[i].alpha));
  // a hidden group hides what is in it
  objects[0].hidden = true;
  assert.equal(computeParticles(objects).length, 0);
  assert.equal(generateCode(objects).particles, 0);
});

const GROUP_CASES = {
  // name: [objects, how far off the true path a point may be (blocks, on top of one frame of travel)]
  'object with keys in a group that stands still': [() => [groupAt({ rot: [0, 30, 20], scale: [2, 1, 1] }), inGroup({ keys: [ckey(2, { pos: [3, 2, 0], rot: [0, 0, 90] })] })], 0.08],
  'group slides steadily': [() => [groupAt({ keys: [gkey(3, { pos: [6.5, 4, 0.5], ease: 'linear' })] }), inGroup()], 0.02],
  'group slides smoothly': [() => [groupAt({ keys: [gkey(3, { pos: [6.5, 4, 0.5] })] }), inGroup()], 0.02],
  'group turns': [() => [groupAt({ keys: [gkey(3, { rot: [0, 0, 90] })] }), inGroup()], 0.065],
  'group turns, the object is far out': [() => [groupAt({ keys: [gkey(3, { rot: [0, 0, 90], ease: 'linear' })] }), inGroup({ pos: [20, 0, 0] })], 0.23],
  'group slides steadily, object turns smoothly': [() => [groupAt({ keys: [gkey(3, { pos: [6.5, 4, 0.5], ease: 'linear' })] }), inGroup({ keys: [ckey(3, { rot: [0, 0, 120] })] })], 0.065],
  'both have keys at different times': [() => [
    groupAt({ keys: [gkey(1.5, { pos: [3.5, 4, 0.5], ease: 'out' }), gkey(2.9, { pos: [3.5, 6, 0.5], rot: [0, 90, 0], ease: 'in' })] }),
    inGroup({ keys: [ckey(1, { pos: [3, 1, 0] }), ckey(2.2, { pos: [1, 1, 0], scale: [2, 2, 2], ease: 'linear' })] }),
  ], 0.08],
  'group jumps': [() => [groupAt({ keys: [gkey(1, { pos: [3.5, 4, 0.5], ease: 'jump' }), gkey(2, { pos: [3.5, 7, 0.5], ease: 'linear' })] }), inGroup()], 0.02],
  'group makes a full turn': [() => [groupAt({ spin: true, keys: [gkey(4, { rot: [0, 360, 0], ease: 'linear' })] }), inGroup({ life: 2.4 })], 0.065],
  'group appears later, the object later still': [() => [groupAt({ start: 1, keys: [gkey(2, { pos: [4.5, 4, 0.5], rot: [0, 0, 45] })] }), inGroup({ start: 0.5, life: 1.8 })], 0.065],
  'one particle in a group that turns': [() => [groupAt({ keys: [gkey(2, { rot: [0, 180, 0], ease: 'linear' })] }), inGroup({ shape: 'point', pos: [4, 0, 0], life: 1.8 })], 0.065],
  'mirrored group turns': [() => [groupAt({ scale: [-1, 1, 1], keys: [gkey(2, { scale: [-1, 1, 1], rot: [0, 0, 60] })] }), inGroup()], 0.065],
  'a wing in a body that glides': [() => [
    createGroup({ id: 'body', pos: [0, 30, 70], keys: [{ t: 5, pos: [0, 27.5, 62], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'linear' }] }),
    createGroup({ id: 'g', parent: 'body', pos: [2.5, 6, 0], rot: [0, 0, -6], keys: [
      { t: 3.2, pos: [2.5, 6, 0], rot: [0, 0, 10], scale: [1, 1, 1], ease: 'smooth' }, { t: 5, pos: [2.5, 6, 0], rot: [0, 0, -8], scale: [1, 1, 1], ease: 'linear' }] }),
    inGroup({ shape: 'line', count: 11, pos: [18, 2, -3], scale: [19, 19, 19] }),
  ], 0.42],
};

test('groups: objects in groups that move are where the groups put them, at any frame rate', () => {
  for (const [name, [make, slack]] of Object.entries(GROUP_CASES)) {
    for (const fps of [60, 30, 20]) {
      const objects = scene(...make());
      const stats = playScene(objects, { fps });
      assert.equal(stats.length, 1, name);
      const [s] = stats;
      const label = `${name}, ${fps} fps`;
      assert.equal(s.early, 0, `${label}: seen before its time`);
      assert.equal(s.late, 0, `${label}: seen after its time`);
      assert.ok(s.frames > 0, label);
      assert.equal(s.gaps, 0, `${label}: a point was not shown in ${s.gaps} frames`);
      assert.ok(s.doubles <= s.pieces * 12, `${label}: a point was shown twice in ${s.doubles} frames`);
      const ahead = s.fastest * frameAge(fps);
      assert.ok(s.off <= slack + ahead * 1.05, `${label}: ${s.off.toFixed(3)} off the path at ${s.offAt.toFixed(2)} s (one frame is ${ahead.toFixed(3)})`);
      for (const plan of s.plans) assert.equal(plan.rough, '', label);
    }
  }
  // what it costs: steady moves inside steady moves are as cheap as one move
  const pieces = (name) => playScene(scene(...GROUP_CASES[name][0]()))[0].pieces;
  assert.equal(pieces('group slides steadily'), 2, 'one stretch, then it rests');
  assert.equal(pieces('group jumps'), 3);
  const wing = scene(...GROUP_CASES['a wing in a body that glides'][0]());
  const mixed = playScene(wing)[0];
  assert.ok(mixed.plans[0].mixed, 'two paces at once are noticed');
  wing[1].keys[0].ease = 'linear';
  const steady = playScene(wing)[0];
  assert.ok(!steady.plans[0].mixed && steady.pieces < mixed.pieces, `${steady.pieces} pieces when all is steady, ${mixed.pieces} when not`);
});

/** A random number source that gives the same numbers every time. */
function dice(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One to three groups in each other and an object in the innermost, all with keys thrown by the dice. */
function wildScene(seed) {
  const r = dice(seed);
  const pick = (list) => list[Math.floor(r() * list.length)];
  const num = (lo, hi) => Number((lo + (hi - lo) * r()).toFixed(2));
  const pose = (far) => {
    const k = num(0.4, 2.5);
    return {
      pos: [num(-far, far), num(-far, far), num(-far, far)],
      rot: r() < 0.4 ? [0, 0, 0] : [0, 0, 0].map(() => Math.round(num(-180, 180))),
      scale: r() < 0.6 ? [1, 1, 1] : r() < 0.5 ? [k, k, k] : [num(0.4, 2.5), num(0.4, 2.5), num(0.4, 2.5)],
    };
  };
  const keys = (far) => {
    const out = [];
    let t = 0;
    for (let i = Math.floor(r() * 4); i > 0; i--) {
      t += num(0.3, 2.2);
      const to = pose(far);
      if (r() < 0.35 && out.length) to.rot = out[out.length - 1].rot; // often it only slides
      out.push({ t: Number(t.toFixed(2)), ...to, ease: pick(EASES).id });
    }
    return out;
  };
  const objects = [];
  let parent = null;
  for (let d = 1 + Math.floor(r() * 3); d > 0; d--) {
    const id = `g${d}`;
    objects.push(createGroup({ id, parent, ...pose(6), keys: keys(6), start: r() < 0.3 ? num(0, 1.5) : 0, spin: r() < 0.2 }));
    parent = id;
  }
  objects.push(createObject(pick(['circle', 'line', 'cube', 'point', 'star']), {
    id: 'leaf', name: `scene ${seed}`, parent, count: 6, ...pose(4), keys: keys(4), life: num(0.6, 3.6), start: r() < 0.3 ? num(0, 1.5) : 0, spin: r() < 0.2,
  }));
  return scene(...objects);
}

test('groups: whatever the groups and the keys, every point is shown, and on its path', () => {
  let pieces = 0;
  let split = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const objects = wildScene(seed);
    const tree = sceneTree(objects);
    const leaf = objects[objects.length - 1];
    const [play] = tree.playsOf(leaf);
    const plan = planOf(leaf, play);
    const points = localPoints(leaf);
    const { result, calls } = runExport(objects);
    assert.equal(calls.length, points.length * plan.pieces.length, `scene ${seed}`);
    pieces += plan.pieces.length;
    if ((result.parts[0].code.match(/^T\(/gm) || []).length > 1 || result.parts.length > 1) split++;
    for (const fps of seed % 2 ? [60] : [20]) {
      const h = frameAge(fps);
      // (an object with many pieces is written as several T(...), so the order of the particles says nothing here:
      //  as many must be seen as the shape has points, and each of them at one of the places the points should be)
      const engine = calls.map((c) => ({ c, p: createParticle(c, () => 0.5), alive: true, step: Math.hypot(...c.dir1) * c.maxEmitPower * h }));
      for (let f = 1; f * h < plan.a1 + 0.05; f++) {
        const age = f * h;
        let seen = 0;
        const shown = [];
        for (const e of engine) {
          e.alive = e.alive && e.p.update(h);
          if (!e.alive) continue;
          seen += e.p.color[3];
          if (e.p.color[3] > 0.5) shown.push(e);
        }
        const label = `scene ${seed}, ${fps} fps, ${(age / LIFE_PER_SECOND).toFixed(2)} s`;
        if (age < plan.a0 - SWITCH || age >= plan.a1 + h) { assert.equal(seen, 0, `${label}: seen outside its time`); continue; }
        if (age > plan.a0 + 1e-6 && age < plan.a1 - 1e-6) assert.ok(seen > points.length - 0.001, `${label}: ${seen.toFixed(2)} of ${points.length} points are shown`);
        const t = Math.min(age / LIFE_PER_SECOND, play.start + staySeconds(leaf) - 1e-6);
        const places = [-0.002, 0.002].flatMap((dt) => points.map((l) => byThree(leaf, play, t + dt, l).map((v, j) => v + ORIGIN[j])));
        // A path of straight stretches may leave the true one by 0.05 blocks, or by 1% of how far the shape
        // reaches from the middle of what turns it: the object itself or one of its groups.
        const middles = [{ node: leaf, start: play.start }, ...play.ancestors].map(({ node, start }, k) => (
          byThree(node, { start, ancestors: play.ancestors.slice(k) }, t, [0, 0, 0]).map((v, j) => v + ORIGIN[j])));
        const reach = Math.max(...middles.map((m) => Math.max(...places.map((place) => dist(place, m)))));
        for (const e of shown) {
          const off = Math.min(...places.map((want) => dist(want, e.p.position)));
          const slack = 0.015 + Math.max(0.05, 0.0105 * reach) + e.step * 1.05 + (plan.rough ? 1.5 : 0);
          assert.ok(off <= slack, `${label}: ${off.toFixed(3)} off its path (one frame is ${e.step.toFixed(3)}, it reaches ${reach.toFixed(1)})`);
        }
      }
    }
  }
  assert.ok(split >= 1, 'one scene at least takes more than one statement');
  assert.ok(pieces / 40 < 20, `${(pieces / 40).toFixed(1)} particles for a point on average`);
});

test('groups: what flies free is let go where its group is, the way the group points', () => {
  // a group that turns half round in 3 seconds lets a small ring go every half second
  const objects = scene(
    groupAt({ keys: [gkey(3, { rot: [0, 0, 180], ease: 'linear' })] }),
    inGroup({ scale: [0.3, 0.3, 0.3], move: [2, 0, 0], life: 0.6, repeat: 5, every: 0.5 }),
  );
  const [s] = playScene(objects);
  assert.equal(s.plays.length, 5);
  assert.equal(s.pieces, 5, 'one piece for each play');
  const points = localPoints(s.leaf);
  const h = frameAge(60);
  points.forEach((l, i) => {
    s.calls.slice(i * 5, (i + 1) * 5).reverse().forEach((c, n) => {
      const lineage = s.plays[n];
      const turned = (30 * n * Math.PI) / 180; // how far the group has turned when this play starts
      const from = byThree(s.leaf, lineage, lineage.start, l).map((v, j) => v + ORIGIN[j]);
      const way = [2 * Math.cos(turned), 2 * Math.sin(turned), 0];
      const p = createParticle(c, () => 0.5);
      let checked = 0;
      for (let f = 1; p.update(h); f++) {
        const flown = Math.max(0, p.age - lineage.start * LIFE_PER_SECOND);
        if (p.color[3] < 0.5) { assert.ok(flown <= h + 1e-9, 'unseen only before it is let go'); continue; }
        const want = from.map((v, j) => v + way[j] * flown);
        assert.ok(dist(p.position, want) < 0.012 + 2 * h, `play ${n}, point ${i}: ${dist(p.position, want).toFixed(3)} off after ${flown.toFixed(2)}`);
        checked++;
      }
      assert.ok(checked > 50);
    });
  });
  // the preview shows the same
  const shown = computeParticles(objects, 1.25); // plays 2 and 3 are in the air (started at 1 and 0.5... and 1)
  assert.equal(shown.length, 2 * points.length);
});

test('groups: loading keeps groups and repairs what is broken', () => {
  const raw = {
    objects: [
      { id: 'a', shape: 'group', parent: 'b', name: 'A', pos: [1, 2, 3], rot: [0, 90, 0], open: false, repeat: 99, every: 0, texture: 'heart',
        keys: [{ t: 1, pos: [0, 0, 0], rot: [0, 45, 0], scale: [2, 2, 2], color: '#ff0000', size: 3 }] },
      { id: 'b', shape: 'group', parent: 'a' },
      { id: 'c', shape: 'circle', parent: 'nope', repeat: 2.6, every: 0.01,
        keys: [{ t: 1, color: '#FF0000', color2: 'bad', size: 99, size2: 0.5 }, { t: 2, size: 'x', color2: '#00ff00' }] },
      { id: 'd', shape: 'circle', parent: 'c' },
      { id: 'e', shape: 'circle', parent: 'e' },
      { id: 'f', shape: 'point', parent: 'b', keys: [{ t: 1, pos: [1, 1, 1], color: '#123456' }] },
    ],
  };
  const { objects } = sanitizeScene(raw);
  const [a, b, c, d, e, f] = objects;
  assert.ok(isGroup(a) && isGroup(b));
  assert.deepEqual(Object.keys(a).sort(), ['every', 'hidden', 'id', 'keys', 'name', 'open', 'parent', 'pos', 'repeat', 'rot', 'scale', 'shape', 'spin', 'start'].sort());
  assert.deepEqual([a.name, a.pos, a.rot, a.open, a.repeat, a.every], ['A', [1, 2, 3], [0, 90, 0], false, MAX_REPEAT, MIN_EVERY]);
  assert.deepEqual(a.keys, [{ t: 1, pos: [0, 0, 0], rot: [0, 45, 0], scale: [2, 2, 2], ease: 'smooth' }], 'a group has no look');
  assert.deepEqual([a.parent, b.parent].sort(), ['a', null].sort(), 'two groups in each other: one comes out');
  assert.deepEqual([c.parent, d.parent, e.parent, f.parent], [null, null, null, 'b']);
  assert.deepEqual([c.repeat, c.every, d.repeat, d.every], [3, MIN_EVERY, 1, 0.5]);
  assert.deepEqual(c.keys.map((k) => [k.color, k.color2, k.size, k.size2]), [['#ff0000', null, 50, 0.5], [undefined, undefined, undefined, undefined]]);
  assert.equal(f.keys[0].color, '#123456');
  assert.deepEqual(sanitizeScene(JSON.parse(JSON.stringify({ objects }))).objects, objects, 'sanitize is stable');
  // groups in groups: only so deep
  const deep = Array.from({ length: 14 }, (_, i) => ({ id: `g${i}`, shape: 'group', parent: i ? `g${i - 1}` : null }));
  const tree = sceneTree(sanitizeScene({ objects: [...deep, { id: 'leaf', shape: 'point', parent: 'g13' }] }).objects);
  for (const node of tree.byId.values()) assert.ok(tree.chainOf(node).length <= MAX_DEPTH, `${node.id} is ${tree.chainOf(node).length} deep`);
  // a pose survives the trip through a matrix (what moving in and out of groups relies on)
  for (const pose of [{ pos: [1, -2, 3], rot: [20, -35, 110], scale: [2, 0.5, 3] }, { pos: [0, 0, 0], rot: [0, 90, 0], scale: [-1, 1, 1] }, { pos: [4, 5, 6], rot: [-170, 10, 5], scale: [1, -2, 1] }]) {
    const back = poseOfView(viewMatrix(pose));
    const m1 = viewMatrix(pose);
    const m2 = viewMatrix(back);
    assert.ok(m1.every((v, i) => near(v, m2[i], 1e-9)), `${JSON.stringify(pose)} came back as ${JSON.stringify(back)}`);
  }
});

test('groups: the tree knows who is in what, and when everything happens', () => {
  const objects = scene(
    createGroup({ id: 'top', start: 1, repeat: 2, every: 10, open: false }),
    createGroup({ id: 'mid', parent: 'top', start: 0.5, keys: [gkey(4)] }),
    createObject('circle', { id: 'x', parent: 'mid', start: 2, life: 0.6, repeat: 3, every: 0.25 }),
    createObject('circle', { id: 'y', parent: 'top', life: 1.2 }),
    createObject('circle', { id: 'z', start: 3, life: 0.6 }),
  );
  const tree = sceneTree(objects);
  const [top, mid, x, y, z] = objects;
  assert.deepEqual(tree.chainOf(x).map((g) => g.id), ['mid', 'top']);
  assert.deepEqual(tree.childrenOf(top).map((o) => o.id), ['mid', 'y']);
  assert.deepEqual(tree.insideOf(top).map((o) => o.id), ['mid', 'x', 'y']);
  assert.deepEqual(tree.leavesOf(top).map((o) => o.id), ['x', 'y']);
  assert.deepEqual(tree.rows().map((r) => [r.node.id, r.depth]), [['top', 0], ['mid', 1], ['x', 2], ['y', 1], ['z', 0]]);
  assert.deepEqual(tree.rows(true).map((r) => r.node.id), ['top', 'z'], 'a closed group keeps its rows to itself');
  // x: its group starts at 1.5; it appears 2 s later, three times, and stays 1 s each time
  assert.deepEqual(tree.span(x), { start: 3.5, end: 5 }, 'the first time round');
  assert.deepEqual(tree.playsOf(x).map((play) => play.start), [3.5, 3.75, 4, 13.5, 13.75, 14]);
  assert.deepEqual(tree.playsOf(x)[4].ancestors.map((g) => [g.node.id, g.start]), [['mid', 11.5], ['top', 11]]);
  assert.equal(tree.lastEnd(x), 15);
  assert.deepEqual(tree.span(mid), { start: 1.5, end: 5.5 }, 'a group lasts until its last key, if nothing in it lasts longer');
  assert.deepEqual(tree.span(top), { start: 1, end: 1 + 4.5 + 10 }, 'with all its plays');
  assert.deepEqual(tree.ownSpan(x), { start: 2, end: 3.5 });
  assert.equal(tree.originOf(x), 1.5);
  assert.equal(sceneDuration(objects), 15, 'until the last particle is gone');
  assert.ok(!tree.plain(y) && tree.plain({ ...z, start: 0 }) && !tree.plain(z));
  // the pose of a group at a time, and what the time marker points at in a group
  assert.deepEqual(tree.poseOf(mid, 1.5 + 2).pos, [0.5, 4, 0.5].map((v) => v / 2));
  assert.deepEqual(markAt(mid, 4 + 0.5, tree.ownSpan(mid)), { at: 'key', index: 0 });
  assert.deepEqual(markAt(mid, 2, tree.ownSpan(mid)), { at: 'between' });
  assert.deepEqual(markAt(mid, 99, tree.ownSpan(mid)), { at: 'last', index: 0 });
  // hidden: the object itself or a group around it
  mid.hidden = true;
  assert.deepEqual(tree.leaves().map((o) => o.id), ['y', 'z']);
});

test('repeat: an object, or a whole group, is played several times', () => {
  const lone = scene(createObject('circle', { id: 'r', name: 'Ring', count: 8, life: 0.6, start: 0.2, repeat: 4, every: 0.7, keys: [key(0.8, { pos: [0.5, 4, 0.5] })] }));
  assert.ok(!isPlain(lone[0]));
  assert.ok(near(sceneDuration(lone), 0.2 + 3 * 0.7 + 1));
  for (const fps of [60, 20]) {
    const [s] = playScene(lone, { fps });
    assert.equal(s.plays.length, 4);
    assert.equal(s.result.particles, 8 * 4 * piecesOf({ ...lone[0], repeat: 1 }));
    assert.deepEqual([s.early, s.late, s.gaps], [0, 0, 0], `${fps} fps`);
    assert.ok(s.off <= 0.012 + s.fastest * frameAge(fps) * 1.05, `${fps} fps: ${s.off.toFixed(3)} off`);
  }
  // 0.7 s apart and 1 s long: for 0.3 s two plays are seen at once
  const count = (t) => computeParticles(lone, t).length;
  assert.deepEqual([count(0.1), count(0.5), count(1.0), count(1.25), count(2.4), count(3.25), count(3.4)], [0, 8, 16, 8, 16, 8, 0]);
  // a group that repeats plays everything in it again, keys and all
  const whole = scene(
    groupAt({ repeat: 3, every: 1, keys: [gkey(0.9, { pos: [3, 4, 0.5], ease: 'linear' })] }),
    inGroup({ pos: [0, 0, 0], start: 0.2, life: 0.3 }),
    inGroup({ id: 'p', shape: 'point', pos: [0, 1, 0], life: 0.3, repeat: 2, every: 0.25 }),
  );
  const stats = playScene(whole);
  assert.deepEqual(stats.map((s) => s.plays.map((play) => play.start)), [[0.2, 1.2, 2.2], [0, 0.25, 1, 1.25, 2, 2.25]]);
  for (const s of stats) {
    assert.deepEqual([s.early, s.late, s.gaps], [0, 0, 0], s.name);
    assert.ok(s.off <= 0.012 + s.fastest * frameAge(60) * 1.05, `${s.name}: ${s.off.toFixed(3)} off`);
  }
  assert.ok(near(sceneDuration(whole), 2.75));
  // World Code waits for all of it
  assert.ok(generateCode(whole, { target: 'world' }).parts[0].code.includes('const PS_EVERY = 2750'));
});

/** The colour (0 to 255) and visibility of a particle of the stand-in engine. */
const rgbOf = (p) => p.color.slice(0, 3).map((v) => v * 255);

test('keys can change the colour and the particle size', () => {
  const flame = () => createObject('circle', {
    id: 'f', name: 'Flame', count: 6, pos: [0.5, 2, 0.5], life: 2.4, color: '#ffe000', size: 0.4,
    keys: [key(1, { color: '#ff8000' }), key(2, { pos: [0.5, 4, 0.5], color: '#ff0000', size: 1.6, ease: 'linear' }), key(3), key(3.5, { color: '#404040', size: 0.2, ease: 'jump' })],
  });
  const [obj] = scene(flame());
  // a key without a colour keeps the one before it; the change happens on the way to the key
  assert.deepEqual(lookAt(obj, 0).c1, [255, 224, 0]);
  assert.deepEqual(lookAt(obj, 0.5).c1, [255, 176, 0], 'half-way of a smooth change');
  assert.deepEqual(lookAt(obj, 1.5).c1, [255, 64, 0]);
  assert.deepEqual([lookAt(obj, 2.5).c1, lookAt(obj, 3.4).c1, lookAt(obj, 3.5).c1], [[255, 0, 0], [255, 0, 0], [64, 64, 64]]);
  assert.deepEqual([lookAt(obj, 0.99).lo, lookAt(obj, 1.5).lo, lookAt(obj, 2.2).lo, lookAt(obj, 3.6).lo], [0.4, 1, 1.6, 0.2]);

  for (const fps of [60, 30, 20, 12]) {
    const [s] = playScene([obj], { fps });
    const label = `${fps} fps`;
    assert.deepEqual([s.early, s.late], [0, 0], label);
    assert.equal(s.gaps, 0, `${label}: a point was not shown in ${s.gaps} frames`);
    assert.ok(s.off <= 0.012 + s.fastest * frameAge(fps) * 1.05, `${label}: ${s.off.toFixed(3)} off the path`);
    // every particle that is seen has the colour and the size of that moment (or of the frame before: it may be one late)
    const h = frameAge(fps);
    const frame = h / LIFE_PER_SECOND;
    const K = s.pieces;
    const engine = s.calls.slice(0, K).map((c) => ({ c, p: createParticle(c, () => 0.5) }));
    let checked = 0;
    for (let f = 1; f * h < s.plans[0].a1 + 0.05; f++) {
      const t = (f * h) / LIFE_PER_SECOND;
      for (const { c, p } of engine) {
        if (!p.update(h) || p.color[3] < 0.999) continue;
        const wants = [lookAt(obj, t), lookAt(obj, t - frame)];
        // the size goes in steps: never further from the true size than a quarter, and exact while it rests
        assert.equal(c.minSize, c.maxSize);
        assert.ok(wants.some((want) => c.minSize / want.lo < 1.26 && want.lo / c.minSize < 1.26), `${label}: size ${c.minSize} at ${t.toFixed(2)} s, wanted ${wants[0].lo.toFixed(2)}`);
        const resting = t < 1 - frame || (t > 2 + frame && t < 3.5 - frame) || t > 3.5 + 2 * frame;
        if (resting) assert.ok(near(c.minSize, wants[0].lo, 1e-9), `${label}: size ${c.minSize} at ${t.toFixed(2)} s, wanted ${wants[0].lo}`);
        // the colour: exact while a piece lasts; a short piece (here: the steps of the size) has the colour of its middle
        const stepping = t > 1 - frame && t < 2 + frame;
        const moments = stepping ? Array.from({ length: 21 }, (_, k) => t + (k - 10) * 0.01) : [t, t - frame];
        const off = Math.min(...moments.map((at) => Math.max(...rgbOf(p).map((v, j) => Math.abs(v - lookAt(obj, at).c1[j])))));
        assert.ok(off < 6, `${label}: colour ${rgbOf(p).map(Math.round)} at ${t.toFixed(2)} s, wanted ${wants[0].c1.map(Math.round)}`);
        checked++;
      }
    }
    assert.ok(checked > 3 / frame, `${label}: ${checked} looks`);
  }
  // a colour that changes over a long stretch is one particle: it cannot be switched on by a last stop, so it
  // takes a short ramp, like a fade. From 20 frames a second up nothing is missing; a slower device may show a
  // point faintly for one frame when one piece takes over from another.
  const [slow] = scene(createObject('circle', {
    id: 's', name: 'Slow', count: 5, pos: [0.5, 2, 0.5], life: 0.6, color: '#ffe000', start: 0.5,
    keys: [key(1, { pos: [4, 2, 0.5], color: '#ff0000', ease: 'linear' }), key(2, { pos: [4, 5, 0.5], color: '#0000ff', ease: 'linear' }), key(3, { color: '#00ff00' })],
  }));
  assert.equal(piecesOf(slow), 3, 'one particle for each stretch, whatever the colours do');
  for (const fps of [144, 60, 30, 20]) assert.equal(playScene([slow], { fps })[0].gaps, 0, `${fps} fps`);
  const at12 = playScene([slow], { fps: 12 })[0];
  assert.ok(at12.gaps <= 2 * slow.count, `12 fps: a point was not shown in ${at12.gaps} frames`);
  {
    // a frame that takes a whole second: afterwards a point is fully there again within half a second
    const { calls } = runExport([slow]);
    const h = frameAge(60);
    for (let stall = 0.05; stall < 2; stall += 0.11) {
      const mine = calls.slice(0, 3).map((c) => ({ c, p: createParticle(c, () => 0.5), alive: true }));
      let age = 0;
      let faintUntil = 0;
      while (age < 2.2) {
        const step = age <= stall && age + h > stall ? 0.6 : h;
        age += step;
        let seen = 0;
        for (const e of mine) {
          e.alive = e.alive && e.p.update(step);
          if (e.alive) seen += strength(e.p, e.c);
        }
        if (age > 0.3 + 1e-6 && age < 2.1 - 1e-6 && seen < 0.999 && age > stall + 0.6) faintUntil = age;
      }
      assert.ok(faintUntil <= stall + 0.6 + 0.3 + 1e-6, `a long frame at ${stall.toFixed(2)}: faint until ${faintUntil.toFixed(2)}`);
    }
  }

  // what it costs: a change of size is flown in steps
  const sizes = new Set(runExport([obj]).calls.map((c) => c.minSize));
  assert.ok(sizes.size >= 6 && sizes.size <= 12, `${sizes.size} sizes`);
  const steady = { ...obj, keys: obj.keys.map(({ size, size2, ...k }) => k) };
  assert.ok(piecesOf(steady) < piecesOf(obj), 'without sizes it takes fewer pieces');
  assert.equal(piecesOf(steady), piecesOf({ ...obj, keys: obj.keys.map(({ size, size2, color, color2, ...k }) => k) }) + 1, 'colours cost nothing, but a colour that jumps starts a piece');

  // two colours: every point keeps its share of the way between them, whatever the colours become
  const [two] = scene({ ...flame(), color2: '#00e0ff', keys: [key(1, { color: '#ff0000', color2: '#0000ff' }), key(2, { pos: [0.5, 4, 0.5], color: '#ffffff', color2: '#000000' })] });
  const { calls, result } = runExport([two]);
  assert.ok(result.parts[0].code.includes('i || 0'), 'the helper for colours that change');
  const K = piecesOf(two);
  const shares = new Set();
  for (let i = 0; i < two.count; i++) {
    const mine = calls.slice(i * K, (i + 1) * K).map((c) => ({ c, p: createParticle(c, () => 0.5) }));
    const h = frameAge(60);
    let share = null;
    for (let f = 1; f * h < 2.3; f++) {
      const t = (f * h) / LIFE_PER_SECOND;
      for (const { p } of mine) {
        if (!p.update(h) || p.color[3] < 0.999) continue;
        const { c1, c2 } = lookAt(two, t);
        const [r, g, b] = rgbOf(p);
        // (red is 255 in every first colour and 0 in every second one: it shows the share of a point)
        const k = (255 - r) / 255;
        if (share === null) share = k;
        assert.ok(Math.abs(k - share) < 0.01, `point ${i}: share ${k.toFixed(3)} at ${t.toFixed(2)} s, was ${share.toFixed(3)}`);
        // (a change that does not run steadily is written as four straight stretches: up to 8 of 255 off)
        assert.ok(near(g, c1[1] + (c2[1] - c1[1]) * share, 10), `point ${i}: green ${g.toFixed(0)} at ${t.toFixed(2)} s`);
        assert.ok(near(b, c1[2] + (c2[2] - c1[2]) * share, 10), `point ${i}: blue ${b.toFixed(0)} at ${t.toFixed(2)} s`);
      }
    }
    shares.add(share.toFixed(2));
  }
  assert.ok(shares.size > 3, 'points get different colours');

  // random sizes: a point keeps its share of the range too
  const [range] = scene({ ...flame(), size: 0.3, size2: 0.6, keys: [key(1.5, { size: 1, size2: 2 })] });
  const ranged = runExport([range]);
  const steps = planOf(range).pieces.map((piece) => piece.size).reverse(); // (the code lists the last piece first)
  assert.deepEqual(steps[0], [1, 2], 'at the key: the sizes of the key');
  assert.ok(steps[steps.length - 1][0] > 0.3 && steps[steps.length - 1][0] < 0.375, 'the first step is near the size it starts with');
  const sharesOfSize = new Set();
  for (let i = 0; i < range.count; i++) {
    const mine = ranged.calls.slice(i * steps.length, (i + 1) * steps.length);
    const share = mine[0].minSize - 1;
    assert.ok(share >= 0 && share <= 1);
    mine.forEach((c, k) => assert.ok(near(c.minSize, steps[k][0] + (steps[k][1] - steps[k][0]) * share, 1e-9), `point ${i}, step ${k}: ${c.minSize}`));
    sharesOfSize.add(share.toFixed(3));
  }
  assert.ok(sharesOfSize.size > 3, 'points get different sizes');

  // blend mode 0 ignores alpha: there the code darkens the colour instead, also a colour that changes
  const normal = runExport([slow]).calls;
  const glow = runExport(scene({ ...slow, blend: 0 })).calls;
  assert.equal(glow.length, normal.length);
  let dark = 0;
  glow.forEach((c, n) => {
    assert.equal(c.colorGradients.length, normal[n].colorGradients.length);
    c.colorGradients.forEach((g, k) => {
      const [r, gr, b, a] = normal[n].colorGradients[k].minColor;
      assert.deepEqual(g.minColor.map((v) => Number(v.toFixed(3))), [r * a, gr * a, b * a, 1].map((v) => Number(v.toFixed(3))));
      assert.equal(g.timeFraction, normal[n].colorGradients[k].timeFraction);
      if (a === 0) dark++;
    });
  });
  assert.ok(dark >= 2 * slow.count * 3, 'black while unseen');
  // scenes without such keys are written exactly as before
  const plainCode = generateCode([timed({ keys: [key(1, { pos: [3, 2, 0.5] })] })]).parts[0].code;
  assert.ok(!plainCode.includes('i || 0') && !plainCode.includes('const K ='));
});

test('groups, repeats and looks: the preview shows what the exported code does', () => {
  const ringAt = (o) => createObject('circle', { id: 'ring', name: 'Ring', count: 8, pos: [0.5, 2, 0.5], life: 3, color: '#ffe000', ...o });
  const cases = {
    'colour keys while it moves and turns': [ringAt({ keys: [key(1.5, { pos: [3, 2, 0.5], rot: [0, 0, 120], color: '#ff0000' }), key(2.5, { pos: [3, 4, 0.5], rot: [0, 0, 120], color: '#0000ff', ease: 'linear' })] })],
    'size keys while it moves': [ringAt({ size: 0.3, keys: [key(1.5, { pos: [3, 2, 0.5], size: 1.2 }), key(2.5, { pos: [3, 4, 0.5], size: 0.6, ease: 'in' })] })],
    'colour keys, then free flight': [ringAt({ move: [0, 1, 0], life: 2.4, keys: [key(1, { pos: [0.5, 3, 0.5], color: '#ff0000' })] })],
    'repeats': [ringAt({ life: 0.6, repeat: 3, every: 0.5, start: 0.2, keys: [key(0.8, { pos: [0.5, 4, 0.5] })] })],
    'a group that repeats': [groupAt({ pos: [0.5, 2, 0.5], repeat: 3, every: 1, keys: [key(0.9, { pos: [3, 2, 0.5], ease: 'linear' })] }), ringAt({ parent: 'g', pos: [0, 0, 0], life: 0.48 })],
    'let go by a group that turns': [groupAt({ keys: [gkey(3, { rot: [0, 0, 180], ease: 'linear' })] }), ringAt({ parent: 'g', pos: [3, 0, 0], move: [2, 0, 0], life: 0.6, repeat: 5, every: 0.5, scale: [0.3, 0.3, 0.3] })],
    'with and without timing in one group': [groupAt({ rot: [0, 45, 0], scale: [2, 2, 2] }), ringAt({ parent: 'g', pos: [1, 0, 0], id: 'a' }), ringAt({ parent: 'g', pos: [-1, 0, 0], id: 'b', start: 1 })],
    'looks in a group that moves': [
      groupAt({ pos: [0.5, 3, 0.5], keys: [key(3, { pos: [4, 3, 0.5], ease: 'linear' })] }),
      ringAt({ parent: 'g', pos: [0, 0, 0], size: 0.3, keys: [key(1, { pos: [0, 0, 0], color: '#ff0000', size: 0.9 }), key(2, { pos: [0, 1, 0], color: '#0000ff', ease: 'jump' })] }),
    ],
  };
  for (const [name, list] of Object.entries(cases)) {
    for (const fps of [60, 20]) {
      const objects = scene(...list);
      const label = `${name}, ${fps} fps`;
      const { calls } = runExport(objects);
      const h = frameAge(fps);
      const engine = calls.map((c) => ({ c, p: createParticle(c, () => 0.5), alive: true }));
      const total = sceneDuration(objects);
      let frames = 0;
      for (let f = 1; (f * h) / LIFE_PER_SECOND < total + 0.2; f++) {
        for (const e of engine) e.alive = e.alive && e.p.update(h);
        const time = (f * h) / LIFE_PER_SECOND;
        const inGame = engine.filter((e) => e.alive && e.p.color[3] > 0.5);
        if (time > total + 0.05) { assert.equal(inGame.length, 0, `${label}: particles are left at ${time.toFixed(2)} s`); continue; }
        if (f % 5) continue;
        const shown = computeParticles(objects, time).filter((p) => p.alpha > 0.5);
        if (shown.length !== inGame.length) continue; // the very frame of a hand-over
        frames++;
        const free = inGame.slice();
        for (const p of shown) {
          const want = p.pos.map((v, j) => v + ORIGIN[j]);
          let best = 0;
          free.forEach((e, k) => { if (dist(want, e.p.position) < dist(want, free[best].p.position)) best = k; });
          const [twin] = free.splice(best, 1);
          const step = Math.hypot(...twin.c.dir1) * twin.c.maxEmitPower * h;
          assert.ok(dist(want, twin.p.position) < 0.012 + step * 1.1, `${label}: preview and game are ${dist(want, twin.p.position).toFixed(3)} apart at ${time.toFixed(2)} s`);
          assert.ok(near(p.size, twin.p.size, 1e-9), `${label}: size ${p.size} in the preview, ${twin.p.size} in the game at ${time.toFixed(2)} s`);
          assert.ok(Math.max(...p.rgb.map((v, j) => Math.abs(v - twin.p.color[j] * 255))) < 9, `${label}: colour at ${time.toFixed(2)} s`);
        }
      }
      assert.ok(frames > (fps === 60 ? 20 : 4), `${label}: ${frames} frames compared`);
    }
  }
  // while editing, what is not there is drawn see-through where its groups have it at that time
  const objects = scene(groupAt({ keys: [gkey(2, { pos: [4.5, 4, 0.5], ease: 'linear' })] }), inGroup({ start: 1, life: 0.6 }));
  const [, leaf] = objects;
  const play = sceneTree(objects).playsOf(leaf)[0];
  assert.equal(computeParticles(objects, 0.5).length, 0);
  const before = computeParticles(objects, 0.5, { ghosts: true });
  assert.ok(before.every((p) => p.ghost && p.alpha === GHOST) && before.length === leaf.count);
  assert.ok(dist(before[0].pos, byThree(leaf, play, 1, localPoints(leaf)[0])) < 1e-9, 'before: where it will appear');
  const after = computeParticles(objects, 5, { ghosts: true });
  assert.ok(dist(after[0].pos, byThree(leaf, play, 2, localPoints(leaf)[0])) < 1e-9, 'after: where it was last');
});

// ---------------------------------------------------------------- the example scene

/** The same "random" numbers on every run. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const middle = (points) => points.reduce((sum, p) => sum.map((v, i) => v + p[i] / points.length), [0, 0, 0]);

test('the dragon example is up to date, and its code plays the way the studio shows it', () => {
  const text = fs.readFileSync(new URL('examples/dragon.json', root), 'utf8');
  assert.equal(text, dragonFile(), 'examples/dragon.json is out of date: run "node examples/build.mjs"');
  const file = JSON.parse(text);
  const all = sanitizeScene(file).objects;
  assert.deepEqual(all, file.objects, 'the studio changes the file when it opens it');
  // its parts are in folders: groups that do nothing themselves, so every part can be played on its own below
  const folders = all.filter(isGroup);
  assert.deepEqual(folders.map((g) => g.name), ['Dragon', 'Body', 'Tail', 'Legs', 'Right wing', 'Left wing', 'Head', 'Fire']);
  for (const g of folders) assert.ok(!g.keys.length && g.start === 0 && g.repeat === 1 && String(g.rot) === '0,0,0' && String(g.scale) === '1,1,1', g.name);
  const objects = all.filter((o) => !isGroup(o));
  assert.ok(objects.every((o) => o.parent));
  for (const obj of objects) assert.equal(planOf(obj).rough, '', `${obj.name} turns too far too quickly`);

  // the whole scene fits its code blocks, and the README gives its real size
  const { result } = runExport(all);
  const readme = fs.readFileSync(new URL('README.md', root), 'utf8').replace(/\s+/g, ' ');
  for (const words of [
    `${objects.length} ordinary objects`,
    `${folders.length} folders`,
    `${result.particles.toLocaleString('en-US')} particles`,
    `${result.parts.length} stacked code blocks`,
    `${sceneDuration(all)} seconds`,
  ]) assert.ok(readme.includes(words), `README: "${words}"`);

  // object by object: the exported code, played in the stand-in for the game's
  // particle engine, against what Play shows in the studio
  for (const fps of [60, 30]) {
    const h = frameAge(fps);
    for (const obj of objects) {
      const label = `${obj.name}, ${fps} fps`;
      const { calls } = runExport([obj]);
      const K = piecesOf(obj);
      assert.equal(calls.length, localPoints(obj).length * K, label);
      const random = seeded(obj.count + calls.length);
      const engine = calls.map((c) => ({ p: createParticle(c, random), alive: true }));
      const { start, end } = spanOf(obj);
      const scatters = obj.spread > 0 || obj.expand !== 0 || obj.gravity !== 0;
      const step = Math.max(...calls.map((c) => Math.hypot(...c.dir1) * c.maxEmitPower)) * h; // its fastest particle, one frame
      let checked = 0;
      for (let f = 1; (f * h) / LIFE_PER_SECOND < end + 0.3; f++) {
        for (const e of engine) e.alive = e.alive && e.p.update(h);
        const t = (f * h) / LIFE_PER_SECOND;
        const inGame = engine.filter((e) => e.alive && e.p.color[3] > 0);
        if (t < start - 0.06 || t > end + 0.06) {
          assert.equal(inGame.length, 0, `${label}: seen at ${t.toFixed(2)} s, outside its time`);
          continue;
        }
        const shown = computeParticles([obj], t).map((p) => ({ ...p, pos: p.pos.map((v, j) => v + ORIGIN[j]) }));
        if (scatters) {
          // every particle picks its own way: compare how many there are and where the cloud is
          if (t < start + 0.1 || t > start + (end - start) * 0.75) continue;
          assert.equal(inGame.length, shown.length, `${label}: particles at ${t.toFixed(2)} s`);
          const apart = dist(middle(inGame.map((e) => e.p.position)), middle(shown.map((p) => p.pos)));
          assert.ok(apart < 2 + step, `${label}: the cloud is ${apart.toFixed(2)} blocks from where the studio shows it at ${t.toFixed(2)} s`);
          checked++;
          continue;
        }
        for (const p of shown) {
          if (p.alpha < 0.75) continue; // fading in or out
          const mine = engine.filter((e, j) => Math.floor(j / K) === p.index && e.alive && e.p.color[3] > 0.25);
          assert.ok(mine.length, `${label}: point ${p.index} is missing at ${t.toFixed(2)} s`);
          const d = Math.min(...mine.map((e) => dist(p.pos, e.p.position)));
          // the game may be one frame ahead; a turn is flown as straight stretches
          assert.ok(d <= 0.065 + step * 1.02, `${label}: point ${p.index} is ${d.toFixed(3)} blocks off at ${t.toFixed(2)} s`);
          checked++;
        }
      }
      assert.ok(checked > 10, `${label}: ${checked} comparisons`);
      assert.ok(engine.every((e) => !e.alive), `${label}: particles are left after the end`);
    }
  }
});

test('the examples are up to date, fit their code blocks and play the way the studio shows them', () => {
  assert.equal(fs.readFileSync(new URL('js/examples-data.js', root), 'utf8'), examplesFile(), 'js/examples-data.js is out of date: run "node examples/build.mjs"');
  assert.deepEqual(EXAMPLES.map((e) => e.name), ['Dragon', 'Campfire', 'Portal']);
  const readme = fs.readFileSync(new URL('README.md', root), 'utf8').replace(/\s+/g, ' ');
  for (const example of EXAMPLES) {
    const objects = sanitizeScene(example.scene).objects;
    assert.deepEqual(objects, example.scene.objects, `${example.name}: the studio changes it when it opens it`);
    assert.ok(example.about.length > 20 && example.about.length < 130, `${example.name}: a line of words for the menu`);
    const tree = sceneTree(objects);
    for (const leaf of tree.leaves()) for (const play of tree.playsOf(leaf)) assert.equal(planOf(leaf, play).rough, '', `${example.name}: ${leaf.name} cuts corners`);
    const { result, calls } = runExport(objects);
    const total = sceneDuration(objects);
    if (example.id !== 'dragon') {
      assert.equal(result.parts.length, 1, `${example.name} fits one code block`);
      assert.ok(result.particles <= 400, `${example.name}: ${result.particles} particles`);
      assert.ok(readme.includes(`${example.name} (${result.particles} particles, ${Number(total.toFixed(1))} seconds, one code block)`), `README: ${example.name} (${result.particles} particles, ${Number(total.toFixed(1))} seconds, one code block)`);
    }
    // the whole scene in the stand-in for the game against the preview: as many particles, in the same places
    const h = frameAge(30);
    const random = seeded(calls.length);
    const engine = calls.map((c) => ({ c, p: createParticle(c, random), alive: true }));
    const flies = objects.some((o) => o.spread > 0); // (those pick their own way: only where the whole cloud is can be compared)
    let frames = 0;
    let equal = 0;
    for (let f = 1; (f * h) / LIFE_PER_SECOND < total + 0.3; f++) {
      for (const e of engine) e.alive = e.alive && e.p.update(h);
      const time = (f * h) / LIFE_PER_SECOND;
      const inGame = engine.filter((e) => e.alive && e.p.color[3] > 0.5);
      if (time > total + 0.1) { assert.equal(inGame.length, 0, `${example.name}: particles are left at ${time.toFixed(2)} s`); continue; }
      if (f % 4 !== 1) continue;
      const drawn = computeParticles(objects, time);
      const shown = drawn.filter((p) => p.alpha > 0.5);
      frames++;
      // (the game may be a frame ahead of the preview, which matters for what is just fading in or out;
      //  and where one piece takes over from the next, an object can show twice for a frame)
      const least = drawn.filter((p) => p.alpha > 0.75).length;
      const most = drawn.filter((p) => p.alpha > 0.25).length;
      const slack = Math.max(8, shown.length * 0.08);
      assert.ok(inGame.length >= least - slack && inGame.length <= most + slack, `${example.name}: ${inGame.length} particles in the game, ${least} to ${most} in the preview at ${time.toFixed(2)} s`);
      if (shown.length !== inGame.length || !shown.length) continue; // something is just fading in, or it is the very frame of a hand-over
      equal++;
      const apart = dist(middle(inGame.map((e) => e.p.position)), middle(shown.map((p) => p.pos.map((v, j) => v + ORIGIN[j]))));
      assert.ok(apart < (flies ? 0.5 : 0.08), `${example.name}: the picture is ${apart.toFixed(3)} blocks off at ${time.toFixed(2)} s`);
      if (flies || shown.length > 150) continue;
      const free = inGame.slice();
      for (const p of shown) {
        const want = p.pos.map((v, j) => v + ORIGIN[j]);
        let best = 0;
        free.forEach((e, k) => { if (dist(want, e.p.position) < dist(want, free[best].p.position)) best = k; });
        const [twin] = free.splice(best, 1);
        const step = Math.hypot(...twin.c.dir1) * twin.c.maxEmitPower * h;
        assert.ok(dist(want, twin.p.position) < 0.012 + step * 1.1, `${example.name}: a particle is ${dist(want, twin.p.position).toFixed(3)} off at ${time.toFixed(2)} s`);
      }
    }
    assert.ok(frames > 30 && equal > frames * 0.5, `${example.name}: ${equal} of ${frames} frames compared`);
    assert.ok(engine.every((e) => !e.alive), `${example.name}: particles are left after the end`);
  }
});

// ---------------------------------------------------------------- single-file build

test('the page fits together: every import exists, and so does every element the code asks for', () => {
  const dir = new URL('js/', root);
  const source = Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => [f, fs.readFileSync(new URL(f, dir), 'utf8')]));
  const exportsOf = (src) => {
    const names = new Set();
    for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:const|let|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
    for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
      for (const part of m[1].split(',')) if (part.trim()) names.add(part.trim().split(/\s+as\s+/).pop());
    }
    return names;
  };
  let imports = 0;
  for (const [file, src] of Object.entries(source)) {
    for (const m of src.matchAll(/^import\s*\{([^}]*)\}\s*from\s*'\.\/([\w.-]+)'/gm)) {
      assert.ok(source[m[2]], `${file} imports ./${m[2]}, which is not there`);
      const have = exportsOf(source[m[2]]);
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0];
        if (!name) continue;
        imports++;
        assert.ok(have.has(name), `${file} imports "${name}" from ${m[2]}, which does not export it`);
      }
    }
  }
  assert.ok(imports > 60, `${imports} imports checked`);
  const html = fs.readFileSync(new URL('index.html', root), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  let asked = 0;
  for (const file of ['app.js', 'timeline.js', 'ui.js']) {
    for (const m of source[file].matchAll(/(?:\$|querySelector)\('#([\w-]+)'\)/g)) {
      asked++;
      assert.ok(ids.has(m[1]), `${file} asks for #${m[1]}, which index.html does not have`);
    }
  }
  assert.ok(asked > 60, `${asked} elements checked`);
  // the timeline's name column has one width, known to the script and the style sheet
  const css = fs.readFileSync(new URL('css/style.css', root), 'utf8');
  assert.equal(Number(/const NAMES = (\d+);/.exec(source['timeline.js'])[1]), Number(/--names: (\d+)px/.exec(css)[1]));
  // the big parts are shut in the page as it comes (so nothing shows and goes away while it loads),
  // and each has the button that opens it, which the script knows
  for (const id of ['left', 'cat-add', 'cat-scene', 'inspector', 'timeline']) {
    assert.match(html, new RegExp(`<(?:aside|section)[^>]*\\sid="${id}"[^>]*\\shidden[\\s>]`), `#${id} is shut in index.html`);
  }
  const panels = [...source['app.js'].matchAll(/\{ id: '(\w+)', key: '(\d)', el: '#([\w-]+)', button: '#([\w-]+)'/g)];
  assert.deepEqual(panels.map((m) => m[1]), ['add', 'scene', 'settings', 'timeline']);
  for (const [, id, key, el, button] of panels) {
    assert.ok(ids.has(el) && ids.has(button), `the ${id} panel and its button are in the page`);
    assert.match(html, new RegExp(`<button id="${button}" class="dock" aria-pressed="false"[^>]*\\(${key}\\)"`), `the ${id} button starts unpressed and names its key`);
  }
});

test('START-HERE.html is built from the current sources', () => {
  const dir = fileURLToPath(root);
  const html = fs.readFileSync(new URL('START-HERE.html', root), 'utf8');
  const built = /<meta name="bps-sources" content="([0-9a-f]+)">/.exec(html);
  assert.ok(built, 'START-HERE.html has no source fingerprint');
  assert.equal(built[1], sourceHash(dir), 'START-HERE.html is out of date: run "npm run build"');
  // nothing in it may point at a separate file: it has to work on its own
  assert.ok(!/<script[^>]+src=|<link[^>]+href="(?!data:)/.test(html), 'still loads a separate file');
  for (const file of sourceFiles(dir).filter((f) => f.endsWith('.png'))) {
    const data = fs.readFileSync(new URL(file, root)).toString('base64');
    assert.ok(html.includes(data), `${file} is not inside START-HERE.html`);
  }
});
