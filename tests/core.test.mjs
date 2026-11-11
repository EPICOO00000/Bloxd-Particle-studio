// Unit tests for the parts that must be exactly right: the shapes, the maths and
// the generated Bloxd code (which is executed here against a fake `api`).
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import zlib from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
import { SHAPES, shapePoints, defaultParams, MAX_COUNT } from '../js/shapes.js';
import {
  TEXTURES, PLACEHOLDER_TEXTURES, HIDDEN_TEXELS, createObject, sanitizeScene, objectPoints, rotationMatrix,
  computeParticles, sceneDuration, LIFE_PER_SECOND, hexToRgb, rgbToHex,
} from '../js/scene.js';
import { generateCode, LIMITS, PRECISIONS } from '../js/codegen.js';
import { sourceFiles, sourceHash } from '../tools/sources.mjs';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// ---------------------------------------------------------------- shapes

const OWN_COUNT = new Set(['grid', 'lattice', 'torus']); // these pick the nearest tidy count

test('there are at least 20 shapes, each made of dozens of particles', () => {
  assert.ok(SHAPES.length >= 20, `only ${SHAPES.length} shapes`);
  assert.equal(new Set(SHAPES.map((s) => s.id)).size, SHAPES.length, 'duplicate shape id');
  for (const s of SHAPES) assert.ok(s.count >= 12, `${s.id} default count ${s.count}`);
});

test('every shape gives the requested number of distinct, finite points', () => {
  for (const s of SHAPES) {
    for (const n of [s.min, s.count, 37, 120, MAX_COUNT]) {
      const want = Math.max(s.min, n);
      const pts = shapePoints(s.id, want, defaultParams(s.id));
      if (OWN_COUNT.has(s.id)) assert.ok(pts.length >= 4, `${s.id} n=${want}`);
      else assert.equal(pts.length, want, `${s.id} n=${want}`);
      for (const p of pts) {
        assert.equal(p.length, 3);
        for (const v of p) assert.ok(Number.isFinite(v) && Math.abs(v) <= 1.0001, `${s.id} n=${want} value ${v}`);
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
    for (const p of s.params || []) {
      for (const v of [p.min, p.max, (p.min + p.max) / 2]) {
        const pts = shapePoints(s.id, s.count, { ...defaultParams(s.id), [p.key]: v });
        assert.ok(pts.length >= 3, `${s.id} ${p.key}=${v}`);
        for (const q of pts) for (const c of q) assert.ok(Number.isFinite(c), `${s.id} ${p.key}=${v}`);
      }
    }
  }
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
  assert.deepEqual(o.velocityGradients, [{ timeFraction: 0, factor: 1, factor2: 1 }]);
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

// ---------------------------------------------------------------- single-file build

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
