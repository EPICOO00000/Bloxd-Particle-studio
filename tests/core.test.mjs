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
import { SHAPES, CATEGORIES, shapePoints, defaultParams, searchShapes, shapeCaption, MAX_COUNT } from '../js/shapes.js';
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
import { applyMove } from '../js/moves.js';
import { createParticle, frameAge } from './babylon-sim.mjs';
import { sourceFiles, sourceHash } from '../tools/sources.mjs';
import { dragonFile } from '../examples/dragon.mjs';
import { examplesFile } from '../examples/build.mjs';
import { shapeList, shapeTable } from '../tools/shape-list.mjs';
import { EXAMPLES } from '../js/examples-data.js';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// ---------------------------------------------------------------- shapes

// Shapes marked `tidy` (Filled square, Filled cube, Donut, the pixel art) pick the nearest count that fits their pattern.

// A point of a shape stays in the box from -1 to 1. Only a letter with a tail (g, y) or a comma reaches below it, by
// its `drop`, and only a capital letter with an accent (É) stands above it, by its `rise`.
const inBox = (shape, point) => point.every((v, axis) => Number.isFinite(v)
  && v <= 1.0001 + (axis === 1 ? shape.rise || 0 : 0) && v >= -1.0001 - (axis === 1 ? shape.drop || 0 : 0));

test('there are 3190 shapes, each made of dozens of particles, in 16 tabs', () => {
  assert.equal(SHAPES.length, 3190);
  assert.equal(new Set(SHAPES.map((s) => s.id)).size, SHAPES.length, 'duplicate shape id');
  assert.equal(new Set(SHAPES.map((s) => s.name)).size, SHAPES.length, 'duplicate shape name');
  const tabs = CATEGORIES.map((c) => c.id);
  assert.equal(tabs.length, 16);
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
    if (s.drop !== undefined) assert.ok((s.cat === 'letters' || s.cat === 'numbers') && s.drop > 0 && s.drop < 1, `${s.id} drop ${s.drop}`);
    if (s.rise !== undefined) assert.ok(s.cat === 'letters' && s.rise > 0 && s.rise < 1, `${s.id} rise ${s.rise}`);
  }
});

test('inside a tab the shapes stand under its headings, in their order', () => {
  for (const tab of CATEGORIES) {
    const list = SHAPES.filter((s) => s.cat === tab.id);
    assert.equal(new Set(tab.subs).size, tab.subs.length, `tab ${tab.id} lists a heading twice`);
    for (const sub of tab.subs) assert.ok(list.some((s) => s.sub === sub), `tab ${tab.id} has nothing under "${sub}"`);
    for (const s of list) assert.ok(!s.sub || tab.subs.includes(s.sub), `${s.id} is under "${s.sub}", which tab ${tab.id} does not list`);
    // the shapes without a heading come first, then heading after heading: the picker relies on it
    const order = list.map((s) => (s.sub ? tab.subs.indexOf(s.sub) : -1));
    assert.deepEqual(order, order.slice().sort((a, b) => a - b), `tab ${tab.id} is not in the order of its headings`);
  }
  // the shapes there were before the headings are all still there
  for (const id of ['line', 'heart', 'letter-a', 'digit-7', 'sign-question', 'smiley', 'cat', 'apple', 'rocket', 'house', 'rose', 'smoke']) {
    assert.ok(SHAPES.some((s) => s.id === id), `${id} is gone`);
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
        assert.ok(inBox(s, p), `${s.id} n=${want} point ${p}`);
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
        for (const q of pts) assert.ok(inBox(s, q), `${s.id} ${what}: ${q}`);
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

// The same for the 200 shapes that came next, taken before the library grew to 924: "id:fingerprint".
const EARLIER_SHAPES = `
  rectangle:213a4a6e rounded:fab8a010 diamond:38c2b6db oval:5322e96a semicircle:448463c5 sector:9c49fea4 rings2:db25136d target:6bc5046f
  righttri:74629b01 frame:07ae9bf2 zigzag:b763a77d squarewave:eb0e3d8d squarespiral:da3f00b6 stadium:eeca373a thickplus:cdb0627d net:55c6dbae
  fill-polygon:9cac55f0 fill-star:d1ab920d fill-heart:ad5494a1 fill-ring:a5ccdef7 tetrahedron:ffa80890 octahedron:21ae543a dodecahedron:c2b68dec
  icosahedron:dec498fc football:83b8dbc5 prism:d22fae51 crystal:d0e4fa93 gem:8bd423ac star3d:0791504b tesseract:853d034f stepped:6bb935e9 hut:b4ae5a4a
  starprism:658cdca7 globe:b7477527 ringsphere:8042036d ball:3615d3c6 capsule:07730ff7 hourglass:880e83b1 vase:2f74bec8 goblet:d57214dd
  saucer:46a2c2af letter-a:27fd7c7b letter-b:2a94cf54 letter-c:426d54a0 letter-d:2a8d7cfe letter-e:d89fc794 letter-f:474f61b8 letter-g:4731887e
  letter-h:bbfe13ea letter-i:b5ac7e60 letter-j:7f29f09b letter-k:9d1b2216 letter-l:f2493a10 letter-m:4e52677f letter-n:5a8c9e08 letter-o:8483415f
  letter-p:c04999de letter-q:d767d238 letter-r:f9cd24ad letter-s:836d5d8a letter-t:9e597f89 letter-u:804739f9 letter-v:c2f46459 letter-w:ec8d91ef
  letter-x:5054d6e4 letter-y:9d2a89bd letter-z:73dac746 digit-0:d35eeb0c digit-1:06851f7e digit-2:7d3f36db digit-3:778f4236 digit-4:b5e06911
  digit-5:5993b133 digit-6:4c916ce6 digit-7:d869481d digit-8:c020721f digit-9:f1c29384 sign-exclaim:6649815d sign-question:85534ddb sign-hash:0022c924
  sign-at:612c5e9e sign-and:9fe89271 sign-percent:5d2cd128 sign-dollar:288230ca sign-euro:67634645 sign-equals:219c2613 sign-divide:f35e8aa6
  arrow:a134b2c8 arrow-double:a9b88aa1 arrow-turn:64f5353c chevrons:873e9e19 check:45e653b2 xmark:3796c797 noentry:733f1bf8 peace:9b8ad2cd
  yinyang:051c3469 smiley:49a8e60e sadface:d3185298 skull:9e0580cc lightning:b1366e6b note:1d948b4f notes:3b5e15cc infinity:7b6f98d9 spade:df6c40c1
  club:de66bec1 pentagram:0ab64cdd hexagram:cb51103f crosshair:606101b0 warning:2a09e07e atom:89ba7009 eye:75fadcde speech:6b4c699a sun:0fade60c
  moon:113fa1df cloud:aa43564e raindrop:fd4da2aa snowflake:c2fcd94d flame:f6d3a78f leaf:451f1674 tree:a2944dab pine:4257e21e flower:b19eb084
  tulip:e30fbb36 clover:e750ffdd mushroom:5ac70ef5 cactus:93c6bb8e mountain:b215dee2 rainbow:805f13ec fish:7b1978a1 bird:132bd969 butterfly:c2429a7c
  cat:f4b24521 paw:30b61219 rabbit:c733f794 web:719f5bed bat:fcfccffb planet:ad07622b house:dda6bf85 castle:a40b702d key:614b3d7a lock:a849e750
  sword:24e3b914 shield:f369b755 crown:4db61249 flag:467968c9 bell:82998f7a gift:f4ebc404 balloon:791809a5 trophy:b8edc36e jewel:006a947a
  rocket:c5d9f686 boat:5a2a89b1 anchor:ebb1237c umbrella:330da00b bulb:a69068e3 candle:4225d467 potion:e97fc3ad pickaxe:b13eb9a5 hammer:22e58b68
  bow:cbca0415 apple:4f0f82eb ghost:a30443f6 rose:3b870912 lissajous:b89f91c5 spirograph:a277860f petalring:b82835b3 wavyring:0b9989e4
  shellspiral:2f975a98 spiralarms:95b357dc bounce:fee85034 trefoil:c197a95f torusknot:7456ed51 globespiral:257ba2cc ballseam:d1e40f34 dna:dc790b10
  strands:2e5bdb39 slinky:dc2bf362 springring:3c670454 mobius:fdf35ef9 smoke:1307049f firework:e597e93d fountain:d0875b5f galaxy:ef870177
  whirlpool:1d3f6b7d portal:95efefe7 halo:90137f39 ripple:bc533bb5 cyclone:c209c50f gyro:72013b57 scatter:c0069fb9 flame3d:2e9fbdeb comet:6d5b59a9
  pillar:0a777837 cage:37a5a8c7 crownring:06c7d277 wavehalo:d9fb68b8 spotlight:e1bd0a63 stairs:768c591e heart3d:c9d0f4b5 orbs:c8bb8c05
`;

test('the 200 shapes added after them are exactly what they were too', () => {
  const pairs = EARLIER_SHAPES.trim().split(/\s+/).map((pair) => pair.split(':'));
  assert.equal(pairs.length, 200);
  for (const [id, expected] of pairs) {
    const shape = SHAPES.find((s) => s.id === id);
    assert.ok(shape, `${id} is gone`);
    assert.equal(fingerprint(shape), expected, `${id} gives different points than before: old scenes would change`);
  }
});

// And for the 700 shapes that came after those, taken before the library grew to 1624.
const LATER_SHAPES = `
  trapezoid:a165ff5a parallelogram:eb2c3adb egg:28eb6f73 lens:aab89a38 squircle:89439b50 reuleaux:17a1df2d lshape:dec93d70 tshape:a0f9e474
  ushape:e80f749f arrowhead:5aaf63d6 arcband:2f325be7 corners:0faefd26 dashed-circle:dd5679e6 keyhole:7ecde1bc banner:15f3da8a splat:f86ce009
  jagged:21f393fd compass-star:b58a48d4 star-polygon:eb2825f2 wheel:d9fe7348 crossed-square:2c468f57 circle-in-square:cd9613e8
  square-in-circle:64a7271e triangle-in-circle:1e4402c4 star-in-circle:c87e73e5 two-circles:72136d31 three-circles:cd41da21 five-rings:f19b4078
  nested-polygons:3ca51049 nested-hearts:a59473d6 fill-rectangle:b83a9d50 fill-diamond:5f30e5c2 fill-oval:4a70ae5c fill-semicircle:e3d4c8cb
  fill-sector:5134e8fa fill-plus:e8f8b602 fill-moon:7d33eda2 fill-drop:01b5a5af fill-arrow:3574a34d fill-cloud:13e390db fill-lightning:d68de98a
  dot-triangle:dcad9df4 dot-hexagon:891977f5 flat-scatter:e0f110c2 dashed-line:c287d7fe angle:ba26352e steps:38c74e09 sawtooth:d83b22c0
  cuboid:e723ae0e cuboctahedron:1cbf8b44 star-octahedron:e9780771 spiky-ball:ebff8095 antiprism:85ba14ce bipyramid:66b0a831 frustum:4a08f9ca
  wedge:9ad9231e plus3d:93ce8ea3 twisted-tower:f9792a93 corner-box:67003761 diamond-cube:e3af2b97 heart-block:d85be4a1 arrow-block:3e55936d
  bolt-block:fcb40da1 ellipsoid:87b0e8ad egg3d:eb1068d0 drop3d:571a3c47 bowl:31302f32 tube:19a32129 barrel:dc2af40f rugby-ball:af79a5b1
  beehive:b8f79fc2 ringed-planet:1f1af722 cloud3d:39c3e77b house3d:4632f9d6 round-tower:8e24b753 castle3d:0e000ad1 arch3d:a22147c2 bridge:994649e4
  temple:3e67d685 lighthouse3d:5a96631b windmill3d:8d05f2e4 tipi:a14de838 igloo:8b61a8db obelisk:75f9df59 staircase:4ffd3393 geodesic:f2af38b1
  onion-dome:866d6b58 chest3d:89a9e77a table:25408fa0 chair:cfd28bf5 lantern:8834a5c8 mug:ebc0bcb1 bottle3d:659e936b spinning-top:3d7b8b8d
  bell3d:11222ce7 hot-air-balloon:05a0a217 rocket3d:73ca8240 ice-cream3d:8123ccca gift3d:a9467a6d dice:6b63cf0c drum:63e440dc wizard-hat3d:cd7fc6cb
  top-hat3d:59ffd737 umbrella3d:9ee04258 cauldron:9911a6f0 gem-ring:d7373dce plane3d:d345982f bowling-pin:ecae1896 snowman3d:33f2eb7a tree3d:9bcee37e
  pine3d:68310131 mushroom3d:a5e10bcc flower3d:d21d1d96 pumpkin3d:123a1f84 apple3d:0d923b24 sea-shell:171189aa butterfly3d:cbb73081
  jellyfish3d:6528439f cactus3d:0fa5bc20 palm3d:549dc1c3 spider3d:4537f4c9 grass:f15ea169 bare-tree:f0314a78 small-a:2b12ab48 small-b:1a56ddec
  small-c:982e1621 small-d:0d3f5fe5 small-e:22678a3a small-f:fc1b911b small-g:208a45c7 small-h:4034458b small-i:b4313845 small-j:dedfd50b
  small-k:d7464a11 small-l:e1b2df20 small-m:4c82835d small-n:d6fa05ea small-o:8cf8183c small-p:e857d4da small-q:0925ad3e small-r:f8b672d7
  small-s:f52d5e5a small-t:b34a57aa small-u:1af09edf small-v:80973f63 small-w:bb694568 small-x:978d6d54 small-y:79aaede9 small-z:7a17deb4
  greek-alpha:d59d18cd greek-beta:ccfa56b2 greek-gamma:e00437da greek-delta:b7ee8720 greek-epsilon:adea779f greek-zeta:f88ede57 greek-eta:7af3ce6f
  greek-theta:391ef89c greek-lambda:b6ca214f greek-mu:13ccca3f greek-xi:41c3cd13 greek-pi:d2a0e022 greek-rho:d68ae54c greek-sigma:f6e5554d
  greek-tau:33aad719 greek-phi:7e9bc963 greek-psi:a8d17f67 greek-omega:f35deb7f greek-cap-gamma:a1dd5dc4 greek-cap-delta:72558b2d
  greek-cap-lambda:837c7be7 greek-cap-xi:59de235b greek-cap-sigma:1524b5fc greek-cap-omega:36e2450f rune-fehu:86cef8e2 rune-uruz:55e2c68d
  rune-thurisaz:1078e3fa rune-ansuz:31213bc1 rune-raido:e3673d79 rune-wunjo:769fa320 rune-hagalaz:1814e8fe rune-nauthiz:351894e6 rune-jera:1b828a61
  rune-eihwaz:1935f84a rune-perthro:f557660a rune-algiz:d638b790 rune-sowilo:b3f9d8b1 rune-berkanan:4fc0cb15 rune-mannaz:fc3dd606 rune-laguz:8224132a
  rune-dagaz:0d31b304 rune-othala:ad27732c rune-gar:ac5942c7 rune-os:1e65ae15 digital-0:e45f3278 digital-1:ca27f0e9 digital-2:2e1d6489
  digital-3:42252624 digital-4:2c80316a digital-5:84a62d55 digital-6:d8e62f18 digital-7:098813e7 digital-8:cb5ce65c digital-9:609601de
  sign-brackets:08e5d208 sign-square-brackets:35980d58 sign-curly-brackets:87ee079d sign-angle-brackets:0be6fc8c sign-copyright:a8fe6b68
  sign-registered:5622cddc sign-paragraph:bb443312 sign-pound:e141999d sign-yen:d0ef130c sign-cent:c1ea7054 sign-rupee:cab8b7e8 sign-bitcoin:4316305f
  sign-won:926d285c sign-plus-minus:7bc01b94 sign-not-equal:67e870a4 sign-approx:78961906 sign-less-equal:7eb3a995 sign-greater-equal:e2e904e8
  sign-root:ba0f0409 sign-integral:5b79e099 sign-angle:2550777c sign-squared:46e8eec8 sign-half:8d237008 sign-quarter:593b3026
  sign-three-quarters:b4eb8fb5 sign-tally:8c2b109b arrow-outline:81aa1149 arrow-curved:a7e9ecc6 arrow-uturn:f12527fc arrow-split:2d434888
  arrows-four:037539b4 arrows-swap:8e073acc arrows-cycle:f7e3e294 arrow-trend:f25fc6cf pointer:9f4f5e5a power:b981ac1a radiation:8e2ecbad
  signal:fc7403db play:7870b459 pause:12a932bc map-pin:9816e6ec female:04005ef0 male:291c08df ankh:084c7e4f star-crescent:31bdc228 battery:3cac1f16
  magnifier:dc537daf stop-sign:113ab09d bullseye:2b280aac info:165cff10 medical:4cb6ca1d speaker:d3fbf1ed checkbox:62a7a6e5 scales:4cd078b8
  heart-broken:bfcfeb32 heart-arrow:244909f6 hearts-two:4f73c9b6 heart-in-heart:968f7fa2 sparkle:746dd979 sparkles:4d7c7af0 shooting-star:5bb59c75
  note-quarter:efee3cfd note-sixteenth:061fb617 notes-three:c7ab3957 treble-clef:081da3e9 bass-clef:bc3e94fd aries:42e0ff63 taurus:d9b7054c
  gemini:c3ee151f cancer:876f8019 leo:82a51f16 virgo:1a2ecb8c libra:e5da07b2 scorpio:48fa0743 sagittarius:26e180cf capricorn:22cd286e
  aquarius:74b9061f pisces:ee903c3f person:a04706a3 person-cheer:c006ffd2 person-run:40751f6c lips:ab4129eb bone:95236bdf thumbs-up:c817c707
  hand:351d671c face-grin:253ee2ff face-wink:2bf85457 face-laugh:a55eeb1a face-surprised:19c99967 face-neutral:73ec41cd face-angry:64d6bbc3
  face-cry:6f455bd9 face-love:08e51c61 face-cool:e51d4a9e face-tongue:04ff8d71 face-sleep:c140005a face-unsure:750f3119 face-dizzy:c058116d
  face-star:5daedefc face-glasses:03c04541 face-scared:f6f1a91c face-moustache:ffb94542 face-angel:ab03afe2 face-devil:b5d5ef01 face-zip:df69fee7
  skull-bones:58a4bed4 alien:2d8b34b3 robot-face:fd223f27 pumpkin-face:d544e4f1 ninja:1599ae69 pirate-face:cd6e7328 clown:d2dc09ef
  mask-comedy:eb9efb85 mask-tragedy:ef1cd221 monster:18ff674e rain-cloud:c9302181 storm-cloud:370010cf snow-cloud:783265d9 twister:2abdf98b
  wind:509881f4 sunrise:c6d66b56 full-moon:0c0a35ee constellation:96612c4f raindrops:e2c69384 stars-three:87309a3b rose-flower:ed9a1410
  sunflower:51167cf1 wheat:3e7155c4 bamboo:b466bc52 sprout:e6293835 acorn:a7e7707d maple-leaf:10ee675f palm-tree:6d39bd9b apple-tree:72636b68
  grass-blades:e5b82074 sea-wave:c89090b8 waves:ae5ff8e1 island:3bb92c96 scallop-shell:5d1e3f00 dog:8aa054a5 pig:a63807c7 mouse:5226b78b cow:1023a6ee
  sheep:b92d4071 chick:2baa61fc duck:8ad6f2ed bear:b7a1eb6b panda:24fcef1b koala:9904a4f6 tiger:07f36b35 lion:c08febc5 fox:6ae9eea2 monkey:6bf54681
  elephant:ab4e21d8 deer:9e6a82ef frog:b91691a9 snake:6861b6da turtle:c21f2abf hedgehog:6bb3ed0c owl:a97e94a2 penguin:fed7a41b swan:d75cb042
  feather:d395ac02 whale:29d7e0e8 shark-fin:47427cef octopus:ddd0397e jellyfish:26940129 crab:c148b338 starfish:9d88bd3b fish-bones:ae4aadcb
  bee:25470c9d ladybird:5255af92 spider:fa5eed93 ant:da9f1eee dragonfly:e24e1544 snail:84ee484b caterpillar:ab80514c dinosaur:adafd5a7
  stegosaurus:7426b5c7 hatching-egg:50b390ff dragon-eye:91e7a114 sea-monster:14d6f16c pear:3b227613 cherries:5e3db2fb banana:ad6bc57b grapes:7e10f2a1
  strawberry:095c8ee7 watermelon:cd001662 pineapple:fda05328 carrot:493ebe0a pumpkin:306560a8 chili:7081f2b2 avocado:93ce2520 pizza:d70ec07f
  burger:7dfec1eb hot-dog:253ff000 fries:db68b0bb fried-egg:da07aca2 toast:9d096a4a cheese:bebb9e53 noodle-bowl:e1186cc4 fork-knife:db423b78
  ice-cream:f4948f1a lollipop:237ef61f candy:1a9a0242 sprinkle-donut:dae76a1c cupcake:a59e401a birthday-cake:c5251f5a cookie:be6a7a55 teacup:d6abc971
  juice:f9ad5598 cocktail:28e774f3 coffee-cup:868781d5 wrench:ec8a3ada screwdriver:e03cb0c5 saw:6a228deb shovel:c619244b magnet:c9303ff4
  paint-brush:42bf8586 scissors:97f26c44 ladder:46560e42 bucket:e388b5c2 trident:b327cd6b bomb:0292d3ab battle-axe:90cc100b throwing-star:dc6e7a1c
  magic-wand:977fd50f crystal-ball:360407bc open-book:37b6b88d coins:506ff8b9 money-bag:d553aa01 treasure-map:30a74597 basketball:2ad59a4b
  tennis-ball:80a59e45 medal:9f7ef4a8 chess-pawn:2d85056a playing-card:b271f10b game-controller:950502af puzzle-piece:94b16331 kite:0f05b17d
  skateboard:6dd01527 dumbbell:8652b0d0 guitar:9099373b trumpet:adda533a piano-keys:070d966e microphone:b5550c83 headphones:f29d4179 boombox:0efa7ce6
  clock:a09a41da door:7186e9fd window:15c7302a bed:da05f0cf lamp:e58bcd64 television:5a74bfce laptop:78f253b0 phone:feac7533 envelope:f34b35e4
  broom:f49dcf28 party-popper:2fa3660b bauble:baefd4fe snowman:827a2aa1 candy-cane:7a782da7 fireworks:505b9b75 easter-egg:8d74009c balloons:066ebf36
  car:3cdc1192 bus:5a73008c truck:6264a131 bicycle:cbbd8d03 train:47117000 airplane:138c6a50 helicopter:22df2ba2 ship:06217353 submarine:54f029f5
  ufo:9d81ef30 parachute:f175adef traffic-light:4807e024 ship-wheel:6bcd21b8 lighthouse:1532217a church:e3216c01 tent:08b70c6e windmill:b7699a57
  city:239b5b72 pyramids:58fcb522 barn:18380445 factory:53e6f00c castle-tower:44d2e4ce shop:162e06e9 torii-gate:3277bbf5 ferris-wheel:94f3a29c
  angel-wings:cd04f084 fairy-wings:281a6dff dragon-wings:6d06fbef top-hat:5f287a43 witch-hat:c92e557b party-hat:b1fd408d cap:8035cc0c
  cowboy-hat:90ba151a knight-helmet:836f369b horns:08f6baec cat-ears:03ad6ed6 pirate-hat:2a48b500 chef-hat:f90cca03 t-shirt:41b431ea dress:2d33c00b
  trousers:c15ed251 boot:ab2ef056 bow-tie:df02a100 glasses:28475305 mask:6471c863 cape:ae1b22bb mitten:0c3811e6 tie:e3c674a7 px-heart:c3a0066a
  px-heart-empty:989757f6 px-star:990fc847 px-coin:6ad2a442 px-gem:ef856a3f px-key:cfb2735b px-lock:1d5209d4 px-sword:4e848300 px-shield:4aebb508
  px-pickaxe:b4ff0d3d px-potion:e0a300d0 px-bomb:693f3800 px-chest:1ebf0d96 px-crown:f39aed95 px-trophy:604b65f7 px-flag:6763ebd0
  px-hourglass:7b3a7b4a px-controller:c33a0e9d px-block-t:d23f215d px-block-l:2e143335 px-block-s:61dc3a41 px-bone:c4a50fa4 px-smiley:cd980e61
  px-skull:1aac90ef px-ghost:da2344f8 px-alien:ece1ae51 px-slime:651741d0 px-robot:beb9b58a px-man:132e4ad6 px-cat:5ce9bb95 px-rabbit:f1f2ead5
  px-penguin:7f251060 px-bird:ccf083a8 px-fish:186e0d67 px-butterfly:2a4fd2d8 px-snake:f0b6b730 px-frog:0426bfa0 px-dino:72247c50 px-bat:fa7ccf93
  px-pumpkin:6915b00c px-snowman:b283a607 px-sun:d5aa0706 px-moon:7a0a1153 px-cloud:cfcb38ef px-bolt:795bfcc1 px-flame:3f12b368 px-drop:9644ea52
  px-snowflake:756d8dc3 px-tree:19d9b157 px-pine:aa76d505 px-cactus:5b043c13 px-flower:19ca8897 px-mushroom:5a71b0ed px-apple:cb4758c2
  px-cherry:80551c9b px-icecream:342cd32d px-arrow:df2a36c8 px-cursor:4e2f2b74 px-check:b1b1c7c7 px-cross:3f3002e3 px-question:41992df9
  px-note:b7843b49 px-warning:9947d1c2 px-speech:4a528309 px-house:20a77d91 px-castle:38397fa1 px-rocket:8d9b20a7 px-ufo:dee899b3
  px-spaceship:039f6ab2 px-car:0319658b limacon:592b6ccf astroid:7f3e184f butterfly-curve:c696ac8e fermat-spiral:e85307fb double-spiral:14119936
  harmonograph:5eec5ffa loop-wave:39abb960 heartbeat:2f3a47f6 bell-curve:f69ee1d5 parabola:188a20af hyperbola:aef33f57 fading-wave:94ca6df9
  wave-packet:799e4a82 string-art:078e3e4a fish-curve:a72d9933 star-knot:c7fed966 peanut-curve:964f1718 polygon-spiral:a6057196 whirl:1452dd8f
  gear:421711b5 wavy-spiral:cbc7af38 circle-flower:04dd7aea viviani:74502507 eight-knot:16fad5e8 lissajous3d:28693ec8 borromean:85eca4e0
  linked-rings:8194af06 lorenz:fd58a9e5 square-helix:f24a5db8 hourglass-spiral:6c430ae2 hilbert3d:e6790baa woven-tube:477c9c4a honeycomb:51caf9be
  bricks:cbe4e460 triangle-grid:be415fb6 diamond-grid:aeec147f fish-scales:357d4199 wave-lines:35165bc4 checkerboard:7b6d0dc8 stripes:779884a5
  chevron-pattern:deeb4330 plus-pattern:db8bb447 circle-pattern:fab98b13 weave:aa0eb09b truchet:ab9a777a greek-key:f19fcb39 chain-border:f2cccd2d
  braid:ad72b627 scallop-border:962245e5 bunting:70281560 fence:bc88204f vine:1379e60e sierpinski:e67e094c koch:ac266c2a carpet:e7b3205b
  cross-fractal:e62d761f dragon-curve:705917d0 hilbert:f35a18dc fractal-tree:3cfbe1d5 h-tree:1af32b3e fractal-fern:3391654a circle-packing:4c0eb76d
  maze:2b67a794 magic-circle:fbd88624 rune-circle:1be3b07c summoning-circle:9ef8cd26 hexagram-seal:45aaeb19 alchemy-circle:60a1e73b
  clock-circle:cb27bc60 sun-seal:ede79a1f moon-seal:c988f441 eye-seal:495e82ae compass-rose:ad5b5b9f octagram-seal:153b1cf4 triangle-seal:5ff358ee
  flower-seal:06eccf05 teleport-pad:e2739e33 mandala:cb0e391f ring-tower:954dddd3 crossed-rings:ea739cb9 saw-ring:b20bf109 solar-system:ee66fd73
  aura:0392598e force-field:d80a1b23 tunnel:8f88e307 gimbal:711ce843 atom3d:ce4760a7 lightning-strike:cadc6961 rain:53259186 water-surface:8c2b8059
  ice-spikes:8205ae1b meteor-shower:d2164464 wind-gust:41562666 mushroom-cloud:2ae315fb cracks:490dde37 waterfall:fef4c220 big-wave:5c963187
  volcano:a0a7f3e9 campfire:c0ab4b16 aurora:eaab9b8e floating-hearts:7a80fcf3 floating-stars:6b88eb97 sparkle-cloud:a9f5e4da bubbles:00351cf9
  floating-notes:5ba2d982 confetti:c4c98575 falling-snow:d3bcde64 zzz:839c50ab dizzy-stars:c8e2e662 rising-arrows:605cbcfc healing-pluses:79295d66
  falling-leaves:447488b0 sparks:f30c344c bird-flock:7333c993
`;

test('the 700 shapes added after those are exactly what they were as well', () => {
  const pairs = LATER_SHAPES.trim().split(/\s+/).map((pair) => pair.split(':'));
  assert.equal(pairs.length, 700);
  const before = new Set([...Object.keys(FIRST_SHAPES), ...EARLIER_SHAPES.trim().split(/\s+/).map((pair) => pair.split(':')[0])]);
  for (const [id, expected] of pairs) {
    assert.ok(!before.has(id), `${id} is listed twice`);
    const shape = SHAPES.find((s) => s.id === id);
    assert.ok(shape, `${id} is gone`);
    assert.equal(fingerprint(shape), expected, `${id} gives different points than before: old scenes would change`);
  }
});

// And for the 700 that came after those, taken before the library grew to 3190.
const LATEST_SHAPES = `
  chevron:32cba595 kite-shape:90b45632 two-triangles:da6bbd83 quatrefoil:cc143270 bitten-circle:f2d6d8d2 house-shape:24421ed5
  circle-in-triangle:9058dd8a nested-stars:6c77b3a9 diamond-in-square:c743b698 turning-squares:923ed2b5 heart-in-circle:3d30f91e
  triangle-in-triangle:11815e85 ring-of-circles:f741c3fc ring-of-stars:8452eadf fill-egg:78cacbe4 fill-trapezoid:f3486ee8 fill-flower:ed09e697
  fill-pill:2a069bea fill-house:e63076b9 double-line:319888e8 bumps:4511cd48 column3d:46ad170b pawn3d:03f77648 bulb3d:579df6b7 flask3d:b81cf1ac
  balloon3d:5a5f9002 cake3d:cab76ad8 lamp3d:16c6dd79 bucket3d:3411484a candle3d:c2dd03f1 bomb3d:64d0030e lollipop3d:756d585a teacup3d:ab691af6
  bauble3d:cb73013b sombrero3d:b300256a pear3d:86cd5565 letter-agrave:c87a128a letter-aacute:ae0440fa letter-acirc:16c2723a letter-atilde:0439f27b
  letter-auml:ac1f3ed5 letter-aring:f1c1af0e letter-ccedil:6a155a47 letter-egrave:1cb36ca2 letter-eacute:35f5b688 letter-ecirc:b2013201
  letter-euml:914374f5 letter-igrave:a46d7aba letter-iacute:bd51d694 letter-icirc:ca492909 letter-iuml:5d3eb862 letter-ntilde:71154474
  letter-ograve:7eef6284 letter-oacute:9ac31d22 letter-ocirc:e498d766 letter-otilde:17a8add5 letter-ouml:851b88dd letter-ugrave:23ac3a55
  letter-uacute:658d6575 letter-ucirc:50dcf334 letter-uuml:3851219f letter-aelig:7141e468 letter-oelig:751b25d1 letter-oslash:df3e4552
  small-agrave:9662254b small-aacute:58f8cf7b small-acirc:16dcfaa1 small-atilde:12beff2f small-auml:c8325b37 small-aring:a1e727f9
  small-ccedil:33f52aca small-egrave:34f2df22 small-eacute:ba473cb0 small-ecirc:5eef33fd small-euml:1da7c3d8 small-igrave:4c2bcac9
  small-iacute:477b4f3d small-icirc:7dd6f4aa small-iuml:9421c5a5 small-ntilde:4785bd81 small-ograve:ff7bbdab small-oacute:64b2d805
  small-ocirc:0cb20811 small-otilde:cd550982 small-ouml:cee82c0a small-ugrave:adf11f7f small-uacute:a0b5d6ef small-ucirc:48795e6c small-uuml:624fdc7d
  small-aelig:00c3f610 small-oelig:fc414733 small-oslash:2f45ab59 small-szlig:388e419b greek-cap-theta:07a08360 greek-cap-pi:5550fbc5
  greek-cap-phi:0d179669 greek-cap-psi:6a2bcf74 roman-1:5341e5e0 roman-2:bd245801 roman-3:4821824f roman-4:ac026b44 roman-5:30eb7f83 roman-6:5e672134
  roman-7:b55eeafa roman-8:33d35d8b roman-9:de9527cf roman-10:c83e532b roman-11:1454aa6f roman-12:6c6f49c9 dice-1:29b5f52f dice-2:41f644ce
  dice-3:85a0e8c3 dice-4:44fed15a dice-5:f0605fe8 dice-6:b43f597e sign-stop:7105b208 sign-comma:ef4c8a76 sign-colon:c75dfa15 sign-semicolon:e80fe233
  sign-ellipsis:2174afbb sign-apostrophe:1d9ffdb9 sign-quotes:f1c62ed1 sign-guillemet-left:1e2e5039 sign-guillemet-right:49084221 sign-hyphen:241183c7
  sign-underscore:8d096a0a sign-slash:fe80a440 sign-backslash:46e1d506 sign-asterisk:b8be133e sign-tilde:d2989e08 sign-degree:7129d8fd
  sign-exclaim-turned:d7a63586 sign-question-turned:9d344f9b sign-less:e537a9a6 sign-greater:ae8a05e3 sign-third:b49fb92d sign-two-thirds:6da24b74
  arrow-circle:8843857f arrow-zigzag:66ea03e5 arrow-loop:81329e48 arrows-in:0b881def arrow-download:a44fe9f0 fast-forward:531e1c1f
  arrow-return:c3f1eb45 arrow-spiral:52271962 arrow-merge:88d6d70b arrow-nav:ec7e64c5 arrow-wavy:8f634749 latin-cross:617126f5 sand-timer:361e564c
  chain:17cc3510 thought-bubble:3e142fd1 sliders:afe9b6ff exit-sign:dfc4f542 eye-closed:d7e60047 world:d2a21980 share:d37b861c quest-marker:5b6f828a
  help-sign:3290f3bf health-bar:3086f814 add-button:50f13895 triquetra:b46008f8 triskelion:d2ddabbc eye-horus:a3d59941 celtic-cross:d830e35e
  fleur-de-lis:ebbb139e heart-lock:515ed754 heart-pulse:c75b50f8 heart-plus:14a63176 heart-crown:bacdf62b heart-key:13c76806 star-double:dd800a57
  star-rating:65385896 flat-sign:232b213a sound-wave:1cc8a83c people-two:6994f877 family:96275c41 tooth:e991bde1 googly-eyes:85cbed9f
  face-kiss:0cfbc278 face-eyeroll:a892c23c face-mask:7cf5098d face-party:48142952 face-monocle:f5c413f2 face-blush:85e42070 face-pleading:6720f227
  face-sweat:582ed649 face-calm:263cd184 poo:2ed70392 face-cowboy:03c75c3f face-santa:8c7ffaf3 face-vampire:1325be82 face-zombie:3258bf6d
  face-king:e315b506 astronaut:c649a62d face-wizard:0cef3176 slime:5a96aa4b sun-cloud:200b5bc1 fog:1fa00eb0 rainbow-clouds:c2971707
  moon-stars:ef1a914a ice-crystal:45c7c29c icicles:27f34c39 sun-face:6af3866e moon-sleeping:176535d4 cloud-happy:e0b3642e thermometer:3ff012f0
  moon-cloud:9ec2f3ff falling-stars:75cfe6ae clouds:e114bd97 fern:d04ddb70 potted-plant:3770cc7b oak-leaf:bb1ebc04 cherry-blossom:c3191b1a
  tree-stump:bd62791b log:1201c616 holly:3bfbbbe1 dandelion:6e603942 cattail:ed4a7403 bush:709efb4c venus-flytrap:7d888f14 winter-tree:26774213
  leafy-branch:9b4f4a8a shamrock:8c9cadb7 volcano-eruption:bec8d2b4 iceberg:4d4ea57a cave:5ed29502 crystal-cluster:f947f19b peak:380e3821
  ripples:f08e5193 pearl-shell:658238df fireball:0afdaaa1 splash:c4fc3844 smoke-puffs:7a694f7d log-fire:af8d8d97 horse:5c86859c goat:3700a7c8
  rooster:c22b2933 llama:976423f7 sitting-cat:affdc761 fish-bowl:407b5934 horseshoe:f6b1c796 dog-house:903dbb86 turkey:725cc35f pet-bowl:e18bd822
  wolf:c7ce68d8 raccoon:d2808d27 hippo:547f7126 giraffe:eb6c2cc9 rhino:5583281f squirrel:92af8898 kangaroo:efae33a1 camel:f376bd12 crocodile:c5a35728
  gecko:f703316c moose:cf3a6a3c parrot:121721a8 flamingo:a6fdb1ae eagle:ed57be8a toucan:f43603d3 dove:44014ba4 seagull:25157992 nest:d63c4cf1
  bird-house:2168b025 bird-cage:35b53342 dolphin:adcc7187 shark:39ab9383 seahorse:1930cbee squid:32db1c3a lobster:4fb05905 seal:03a79bfd
  pufferfish:3041e563 manta-ray:2de2f9f0 narwhal:0150ac94 anglerfish:c9035454 beetle:e1b7fcd5 fly:2ca3b14a mosquito:dadad50b scorpion:3f3101ea
  moth:af9ff83c firefly:faee25d4 t-rex:ef8f7bad triceratops:1fddc50f pterodactyl:0ee2d987 dragon-head:e5d896f1 unicorn:39d2c0d6 phoenix:255f042a
  ammonite:11d112aa dragon-egg:e8bd704e orange-slice:e9848a01 lemon:a1bbdd61 kiwi:1160b387 corn:d2798467 broccoli:35b83889 tomato:0d22d277
  aubergine:dfb0ec83 onion:49ee2f6c bell-pepper:7f639474 radish:9c243a21 apple-core:b583c3ff peanut:e9ea2a73 sandwich:03d016a2 sushi-roll:34af18f3
  baguette:37cf7425 croissant:770f7a57 egg-cup:79e90bfa kebab:ab331448 popcorn:d5b90304 rice-ball:00f49f72 salt-shaker:446c856d cooking-pot:85ccb0ef
  frying-pan:77a90c03 honey-pot:680583d9 cake-slice:b3196106 pie:a4464734 ice-lolly:468b681b cotton-candy:93143431 gingerbread-man:b73caa0e
  jelly:471025c9 sundae:7b4ca0a2 gumball-machine:c971d672 soft-serve:34ada759 tiered-cake:2bcb604b milk-carton:68fe5903 water-bottle:9f2c4771
  bubble-tea:c4f31b95 milkshake:4ce97f64 hot-chocolate:ab1c4f74 kettle:fc85b7da baby-bottle:24da9baa jug:8dc70340 pencil:7fbb2f13 ruler:81705257
  palette:5fb96cfc paint-roller:58836efa fishing-rod:470d517e watering-can:81617b94 rake:a18513bd telescope:f813e95e binoculars:0823d229
  compass:20ebb095 fish-hook:922b6e45 test-tube:9b9f0738 plug:206aa279 toolbox:fa187d09 nut-bolt:c738aefc dagger:603c5f0c spear:e2ebf609
  crossed-swords:c1d85d9c war-hammer:e51c91cc scythe:bf7bbeed cannon:84515f2c katana:7c50d5f2 boomerang:4e9a4800 dynamite:f0c7c94e ray-gun:35d15fd4
  flail:e2b98ab2 jewel-ring:510370ac amulet:a6800b0b open-chest:419ddcef scroll:33b286df spell-book:4ebfceb7 bubbling-cauldron:76917db1
  magic-lamp:29f43905 magic-mirror:c034a038 emerald:c1d51e9d rabbit-hat:f52c0f4e safe:df567844 soccer-ball:a411b321 baseball-bat:6d49a601
  tennis-racket:58f627d0 golf-flag:642aa4bd bowling-ball:adf076ec dart:8ad6b21c whistle:084ec9f8 podium:f8276847 stopwatch:5b030320
  chess-king:765a5184 two-dice:40d4c864 joystick:d68146e8 arcade:1a58323e teddy-bear:7f8e5e9a beach-ball:aa1a17cb chequered-flag:13e0c507
  eight-ball:0bd43db8 violin:208ee17d snare-drum:762032f9 maracas:6e296a79 harp:c8224e17 electric-guitar:5abe8605 record-player:d2480bb3
  cassette:92c66d13 metronome:c22d57af lyre:e847e483 sofa:3f6e75c6 bathtub:651d2566 toilet:67559b19 tap:7170ab41 fridge:7c8e7b42
  picture-frame:88618e4c books:dcf13023 alarm-clock:42692b80 calendar:dd305f73 trash-can:28c4d9c8 toothbrush:e0ed5cbc backpack:f64d3cf2
  camera:561f27d0 floppy-disk:717a8728 coat-hanger:c4d33973 shopping-cart:b74e5582 cardboard-box:e7c10190 christmas-tree:47bad785 wreath:bc087727
  coffin:95b66d73 gravestone:91fa4c29 disco-ball:27fcba7b firework-rocket:82a66717 paper-lantern:79d53bf6 menorah:b9b8822a easter-basket:a6d1f33d
  clapperboard:fc6c4e97 ticket:541f4aff snow-globe:5a8b5abc scooter:54c32820 tractor:5a406fde race-car:53dcc1f9 tank:8589c1bf airship:fec5960b
  fighter-jet:fbce8cb5 paper-plane:0728661c satellite:6820c800 canoe:005563dd pirate-ship:7ca53935 cable-car:9c597ba7 sledge:560a7843
  mine-cart:63168399 steering-wheel:13d21f6a road:36c976ea signpost:db10f234 traffic-cone:1a4f04b9 suitcase:8be80865 lifebuoy:6ffdb386
  jetpack:4b9ddd53 unicycle:1653aed2 roller-skate:02f29d47 skyscraper:977f7d51 hospital:332a262d school:2765b6ac log-cabin:140aaf25
  tree-house:6380d040 mosque:b6fdf461 greek-temple:c7dd08fa pagoda:ebaccc2d eiffel-tower:2bdf2776 clock-tower:e2ff4d2b suspension-bridge:eb8f16ad
  well:facc7aad haunted-house:82e3ee3f circus-tent:6236720a carousel:0cb3f549 bench:de1b4b55 street-lamp:140d5b5d wind-turbine:3e15623c
  sandcastle:eadd4130 observatory:a304ccbf totem-pole:b13b93cc moai:e9b11aee water-tower:6362658d mine-entrance:b497bfb2 butterfly-wings:105e9ffb
  bee-wings:36fcf6da robot-wings:61053f25 ice-wings:c7ef0332 santa-hat:3cfbbfeb viking-helmet:0cdb8e23 beanie:53d5ec82 graduation-cap:6c279e36
  hard-hat:6e631711 sombrero:cf42d2cd jester-hat:930e151c antlers:a3089bd9 feather-headdress:6978cd66 tiara:e3c9ebbc propeller-cap:cfef5bce
  flower-crown:2bf42332 sock:e809ef87 shorts:f035e727 skirt:728a3bc1 sneaker:7cb1ae7e flip-flops:bedc37bb moustache:ce5ca5c5 wristwatch:a83a5ff3
  handbag:4fd7dafb apron:abd452f6 button:0a300957 devil-tail:244910ee eye-patch:9c2c8853 hoodie:20688d47 beard:aa1d395c px-axe:866ec10a
  px-hammer:4ccc524e px-shovel:0efa2ec5 px-bow:68ab6327 px-wand:44438e36 px-staff:03f91375 px-ring:befb3290 px-scroll:6e18b94c px-book:c18ce658
  px-torch:0d7067e1 px-bag:243250a3 px-helmet:a21f5c91 px-armor:6c2ae445 px-boot:baae0bd6 px-bucket:c85021a0 px-emerald:70cedc8d px-dynamite:d60ba360
  px-ladder:3e1cb5bd px-door:5bd9d612 px-anvil:3c1bcbf2 px-magnet:3b71a0d8 px-battery:9f70cdcf px-medal:1a4ed5f9 px-target:1f5f9f7f px-dice:bfd96147
  px-save:31aa3feb px-heart-half:c8980379 px-candle:36b93593 px-gift:35d1b26c px-balloon:933b4c74 px-bell:9d7b4255 px-anchor:70c68263
  px-umbrella:146489a4 px-pig:e1174b5c px-cow:628c4353 px-chicken:5ded5ec9 px-bee:3fff89ff px-spider:de4f724e px-octopus:1c407696 px-crab:b620521b
  px-turtle:dac5a1e0 px-snail:58e63b44 px-mouse:0b77e201 px-bear:8e341a6b px-fox:1f7be1fc px-owl:1830a2b8 px-whale:566c4771 px-duck:05203a8f
  px-ladybug:c24b9067 px-monster:088d4c7e px-muncher:56b57b26 px-sad:6885b491 px-wink:7b01e80d px-surprised:ed8305cc px-cool:3c22b3ad
  px-angry:4432b7e2 px-laugh:18ea761f px-dizzy:48d69128 px-pizza:49f05ccc px-burger:bfb5134e px-donut:c7e9a6a8 px-cake:57737339 px-candy:e4a75936
  px-lollipop:a8d0aac2 px-banana:5acb4d60 px-strawberry:aba1078f px-watermelon:02a2aa64 px-carrot:6d0bdfd6 px-cookie:6d5b1d2e px-drink:6d793b2a
  px-fries:6239c668 px-cheese:977ba40b px-popsicle:14b46282 px-bread:107da085 px-rainbow:1bde3c2d px-mountain:3d227eac px-leaf:91d188e0
  px-clover:a9ea0129 px-tulip:3b3b0a69 px-palm:9d8219b8 px-raincloud:e59c1390 px-volcano:811b6bfb px-easter-egg:9e21cef2 px-paw:f57b5444
  px-thumb:e3a1953b px-eye:66ff1fa8 px-magnifier:c702fbd9 px-gear:4b307e4d px-trash:0f55fc3e px-mail:27927c55 px-phone:c20005ae px-tv:9f3f3017
  px-computer:69bcd2b2 px-camera:e5d150b9 px-bulb:65018b41 px-clock:3997164e px-glasses:4c808213 px-tophat:327ff23d px-plane:c4f3cdb8 px-boat:79ee5a1e
  px-train:0e7976b7 px-bus:b5b9dbe8 px-truck:6196a229 px-tank:b2b7efb7 px-helicopter:f46bbe0b px-submarine:33a283e8 px-traffic:396e0658
  px-wifi:232508c6 px-speaker:3ec18b41 px-microphone:d918ddbc px-play:f54f3415 px-tent:0642a9d4 px-tombstone:a3dde5cc px-letter-a:a9eedfa7
  px-letter-b:d081e36e px-letter-c:1dd14814 px-letter-d:a3aacf92 px-letter-e:0ded64db px-letter-f:0a0955a3 px-letter-g:a1d316d5 px-letter-h:4df3c41a
  px-letter-i:712bab79 px-letter-j:ccd7bda8 px-letter-k:fedee3a6 px-letter-l:539720cb px-letter-m:d5b7515f px-letter-n:5d51ff0f px-letter-o:d4891e24
  px-letter-p:ccbbdbc9 px-letter-q:56698549 px-letter-r:44bb1104 px-letter-s:dd25469d px-letter-t:47cd55fd px-letter-u:8766f022 px-letter-v:667476f5
  px-letter-w:e784f67f px-letter-x:ad36eca0 px-letter-y:7fe8eede px-letter-z:9b32c7bc px-digit-0:3c04a976 px-digit-1:f727676b px-digit-2:7e6a2889
  px-digit-3:70b62e96 px-digit-4:9a1b1a0f px-digit-5:6322aae0 px-digit-6:3a7fb833 px-digit-7:6921bec9 px-digit-8:0c72d06a px-digit-9:8fafde44
  px-exclaim:518fe084 px-plus:497ab672 px-minus:f792bb4a px-equals:04f16c4e px-slash:97b65972 px-colon:85bc7b3e px-percent:7374e8d5 px-dollar:055b3a63
  px-hash:97a9742e lemniscate:70769205 cycloid:91051f3e epicycloid:74241b52 hypocycloid:49cd1c4e supershape:fe63beba clelia:e034ff67
  yarn-ball:6d1fbbd6 granny-knot:f0f0747a octagon-tiling:7560b9f7 tumbling-blocks:99ee264c kagome:919a8b2a plaid:dc3a4e8c heart-pattern:5011992e
  star-pattern:a91d49ea diamond-border:7197290b heart-border:6444c308 star-border:0a3543b4 battlements:25d6e55d railway-track:7c838feb
  golden-spiral:1e74f383 peano:49cabec2 cantor-set:b53d6a39 triskelion-seal:db58c725 frost-seal:20294254 love-seal:0000866f healing-circle:7e66674d
  radar:e4e84e92 storm-seal:f8589bbb fire-seal:97c54599 tech-ring:be8ec2e6 ring-cone:2cfbe438 explosion:1d3de77f fire-ring:ec72d152
  black-hole:8ac87aad crown-splash:61560d71 thunder-cloud:fb9c606f floating-diamonds:9a4c55f1 question-marks:01eaee7d exclamation-marks:7952739a
  coin-shower:a0d6e9aa floating-flames:73c8125c shards:ee48fe90 floating-squares:f3ec6745
`;

test('the 700 shapes added in the round after that are exactly what they were, like the others', () => {
  const pairs = LATEST_SHAPES.trim().split(/\s+/).map((pair) => pair.split(':'));
  assert.equal(pairs.length, 700);
  const before = new Set([...Object.keys(FIRST_SHAPES), ...[EARLIER_SHAPES, LATER_SHAPES].flatMap((list) => list.trim().split(/\s+/).map((pair) => pair.split(':')[0]))]);
  assert.equal(before.size, 924);
  for (const [id, expected] of pairs) {
    assert.ok(!before.has(id), `${id} is listed twice`);
    const shape = SHAPES.find((s) => s.id === id);
    assert.ok(shape, `${id} is gone`);
    assert.equal(fingerprint(shape), expected, `${id} gives different points than before: old scenes would change`);
  }
});

test('letters and pictures have no clumps of particles', () => {
  const tabs = ['letters', 'numbers', 'symbols', 'faces', 'nature', 'animals', 'food', 'things', 'travel', 'costume'];
  const drawn = SHAPES.filter((s) => tabs.includes(s.cat));
  assert.equal(drawn.length, 2036);
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
  // the shape of that very name first, then the others in the order of the tabs
  assert.equal(ids('heart')[0], 'heart');
  for (const id of ['fill-heart', 'heart-broken', 'px-heart', 'heart3d']) assert.ok(ids('heart').includes(id), `"heart" finds ${id}`);
  assert.equal(ids('  music   note ')[0], 'note');
  for (const id of ['notes', 'note-quarter', 'px-note']) assert.ok(ids('music note').includes(id), `"music note" finds ${id}`);
  assert.deepEqual(ids('letter').slice(0, 26), [...'abcdefghijklmnopqrstuvwxyz'].map((c) => `letter-${c}`));
  assert.ok(ids('letter').includes('small-g') && ids('letter').includes('envelope'), 'the name of the tab and search words count');
  assert.deepEqual(ids('small letter g'), ['small-g', 'px-small-g', 'small-gbreve']);
  // a letter with an accent is found by typing it, the capital first; so are the other signs
  assert.deepEqual(ids('é'), ['letter-eacute', 'small-eacute']);
  assert.deepEqual(ids('É'), ['letter-eacute', 'small-eacute']);
  assert.deepEqual(ids('ß'), ['small-szlig']);
  assert.deepEqual(ids('Ω'), ['greek-omega', 'greek-cap-omega']);
  assert.deepEqual(ids(';'), ['sign-semicolon', 'px-semicolon', 'typed-wink']);
  assert.deepEqual(ids('xii'), ['roman-12', 'roman-13']);
  assert.deepEqual(ids('6').slice(0, 3), ['digit-6', 'digital-6', 'px-digit-6']);
  for (const id of ['roman-6', 'dice-6', 'circled-6', 'card-6-hearts', 'domino-6-6', 'clock-6', 'morse-6']) assert.ok(ids('6').includes(id), `"6" finds ${id}`);
  // the name of a tab finds the tab; a heading finds what stands under it, wherever that is
  const tab = (id) => SHAPES.filter((s) => s.cat === id).map((s) => s.id);
  const under = (sub) => SHAPES.filter((s) => s.sub === sub).map((s) => s.id);
  assert.deepEqual(ids('pixel art'), tab('pixel'));
  assert.deepEqual(ids('nature'), [...tab('nature'), ...under('Nature and food')]);
  assert.deepEqual(ids('weapons'), under('Weapons'));
  assert.equal(under('Weapons').length, 18);
  for (const c of CATEGORIES) for (const sub of c.subs) for (const id of under(sub)) assert.ok(ids(sub).includes(id), `"${sub}" finds ${id}`);
  assert.ok(ids('x').length < 40 && ids('x')[0] === 'letter-x', 'one letter only matches the start of a word');
  // every shape can be found by its own name, and comes first
  for (const s of SHAPES) assert.equal(ids(s.name)[0], s.id, `searching "${s.name}"`);
});

test('a long word under a picture has a place to break', () => {
  const soft = '\u00AD';
  for (const s of SHAPES) {
    const caption = shapeCaption(s);
    assert.equal(caption.split(soft).join(''), s.label || s.name, `${s.id}: the caption is the sign or the name`);
    for (const word of caption.split(/[\s-]+/)) {
      const parts = word.split(soft);
      assert.ok(parts.length <= 2 && parts.every((part) => part.length >= 3 || parts.length === 1), `${s.id}: "${word}" breaks into ${parts.join(' + ')}`);
      // nine letters do not fit on a button of the narrowest panel: such a word names where it may break
      if (/^[A-Za-z]{9,}$/.test(parts.join(''))) assert.equal(parts.length, 2, `"${word}" (${s.id}) is long: give it a place to break in BREAKS in js/shapes.js`);
      assert.ok(parts.every((part) => part.length <= 9), `${s.id}: "${word}" has a part of more than 9 letters`);
    }
  }
  assert.equal(shapeCaption(SHAPES.find((s) => s.id === 'dodecahedron')), `Dodeca${soft}hedron`);
  assert.equal(shapeCaption(SHAPES.find((s) => s.id === 'px-microphone')), `Pixel micro${soft}phone`);
  assert.equal(shapeCaption(SHAPES.find((s) => s.id === 'letter-eacute')), 'É');
});

test('the README and docs/shapes.md list every shape', () => {
  const readme = fs.readFileSync(new URL('README.md', root), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(readme.includes(`one of the ${SHAPES.length} shapes`), 'the number of shapes in "Make something"');
  assert.ok(readme.includes(`There are ${SHAPES.length} shapes in ${CATEGORIES.length} tabs`), 'the number of shapes under "Shapes"');
  assert.ok(readme.includes(`[All ${SHAPES.length} shapes by name](docs/shapes.md)`), 'the number of shapes in the link to the list');
  // one row per tab: how many shapes, and how many under each heading
  for (const row of shapeTable().split('\n')) assert.ok(readme.includes(`${row}\n`), `the table of tabs wants this row ("node tools/shape-list.mjs" prints it): ${row}`);
  for (const tab of CATEGORIES) {
    const row = shapeTable().split('\n').find((line) => line.startsWith(`| ${tab.name} | `));
    assert.ok(row.startsWith(`| ${tab.name} | ${SHAPES.filter((s) => s.cat === tab.id).length} | `), `the ${tab.name} row`);
    for (const sub of tab.subs) assert.ok(row.includes(`${sub} ${SHAPES.filter((s) => s.cat === tab.id && s.sub === sub).length}`), `${sub} in the ${tab.name} row`);
  }
  const withSliders = SHAPES.filter((s) => (s.params || []).length > 0).length;
  assert.ok(readme.includes(`${withSliders} of them\nhave settings of their own`), `${withSliders} shapes have sliders of their own`);
  // every shape by name
  const list = fs.readFileSync(new URL('docs/shapes.md', root), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(list, shapeList(), 'docs/shapes.md is out of date: run "node tools/shape-list.mjs"');
  for (const s of SHAPES) assert.ok(list.includes(s.name), `${s.name} is missing`);
  assert.ok(readme.includes('(docs/shapes.md)'), 'the README links to the list');
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
  // Fingerprints of the code this scene gave before timing existed. It is made of the 40 shapes that came
  // first in the library then (the tabs have more shapes now, so they are named here).
  const forty = [...SHAPES.filter((s) => s.cat === 'basic').slice(0, 34).map((s) => s.id), 'sphere', 'dome', 'cube', 'lattice', 'cylinder', 'cone'];
  assert.equal(forty.join(' '), 'line circle disc arc square grid triangle polygon star heart cross rays spiral wave rectangle rounded diamond oval '
    + 'semicircle sector rings2 target righttri frame zigzag squarewave squarespiral stadium thickplus net fill-polygon fill-star fill-heart fill-ring '
    + 'sphere dome cube lattice cylinder cone');
  const scene = () => forty.map((shape, i) => createObject(shape, {
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

test('groups: a group that rises and fades is played by the game the way the studio shows it', () => {
  for (const fps of [60, 30, 20]) {
    const objects = scene(
      groupAt({ name: 'Ghost' }),
      inGroup({ life: 6 }),
      inGroup({ id: 'arm', name: 'Arm', shape: 'line', count: 5, pos: [1, 0, 0], keys: [ckey(1, { pos: [1, 1, 0], ease: 'linear' }), ckey(4, { pos: [4, 1, 0], ease: 'linear' })] }),
      createGroup({ id: 'hat', parent: 'g', pos: [0, 1, 0], rot: [0, 90, 0], start: 0.5 }),
      inGroup({ id: 'tip', name: 'Tip', shape: 'point', parent: 'hat', pos: [0, 1, 0], start: 0.25, life: 0.3 }),
      inGroup({ id: 'spark', name: 'Spark', shape: 'point', parent: 'hat', pos: [1, 0, 0], repeat: 3, every: 0.5, life: 0.6 }),
    );
    // Rise and fade on the group (tests/edits.test.mjs says what that does to each of them)
    assert.ok(applyMove(objects, 'g', 'rise', { seconds: 2, height: 3 }).ok);
    const stats = playScene(objects, { fps });
    assert.deepEqual(stats.map((s) => s.name), ['Ring', 'Arm', 'Tip', 'Spark']);
    for (const s of stats) {
      const label = `${s.name}, ${fps} fps`;
      const ahead = s.fastest * frameAge(fps);
      assert.equal(s.early, 0, `${label}: seen before its time`);
      assert.equal(s.late, 0, `${label}: seen after its time`);
      assert.ok(s.off <= 0.08 + ahead * 1.05, `${label}: ${s.off.toFixed(3)} off the path at ${s.offAt.toFixed(2)} s (one frame is ${ahead.toFixed(3)})`);
      for (const plan of s.plans) assert.equal(plan.rough, '', label);
    }
    // a point of the ring: all there for the first 80 % of the two seconds, then less and less, and gone when the group is up
    const [ring] = stats;
    const h = frameAge(fps);
    const engine = ring.calls.slice(0, ring.pieces).map((c) => ({ c, p: createParticle(c, () => 0.5) }));
    const frame = h / LIFE_PER_SECOND;
    let frames = 0;
    for (let f = 1; f * frame < 2.4; f++) {
      const t = f * frame;
      const seen = engine.reduce((sum, e) => sum + (e.p.update(h) ? strength(e.p, e.c) : 0), 0);
      if (t < 0.1) continue;
      const want = t <= 1.6 ? 1 : t >= 2 ? 0 : (2 - t) / 0.4;
      assert.ok(Math.abs(seen - want) <= frame / 0.4 + 0.03, `${fps} fps: after ${t.toFixed(2)} s the ring is seen ${seen.toFixed(2)}, wanted ${want.toFixed(2)}`);
      frames++;
    }
    assert.ok(frames > 40);
  }
});

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
    // each of these buttons has a little picture and a colour of its own, so that it is found at a glance
    assert.match(html, new RegExp(`<button id="${button}"[^>]*><svg class="dock-icon"[^>]*aria-hidden="true">.+?</svg>\\w+</button>`), `the ${id} button has its picture and its word`);
    assert.match(css, new RegExp(`#${button} \\{ --c: #[0-9a-f]{6}; --ink: #[0-9a-f]{6}; --edge: #[0-9a-f]{6}; --well: #[0-9a-f]{6}; --glow: #[0-9a-f]{6}; \\}`), `the ${id} button has its colours`);
  }
  const colours = panels.map(([, , , , button]) => new RegExp(`#${button} \\{ --c: (#[0-9a-f]{6})`).exec(css)[1]);
  assert.equal(new Set(colours).size, panels.length, 'no two of them have the same colour');
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
