// Tests for js/share.js: share links. The yardsticks:
//   - a link opens as exactly the scene it was made from, whatever is in it;
//   - a link that was made once keeps opening as the same scene for ever
//     (two links written down here are opened by every later version);
//   - a link can be made by anyone, so nothing it holds can harm the studio.
// (The Share window and what the page does with a link that arrives are tried
// in a browser, see the README; here only that the page has what they need.)
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { createObject, createGroup, sanitizeScene, isGroup, DEFAULTS } from '../js/scene.js';
import { SHAPES } from '../js/shapes.js';
import { DEFORMERS, newDeformer, MAX_POINTS } from '../js/deform.js';
import { formPoints } from '../js/forms.js';
import { NODE_TYPES, NODE_EXAMPLES, exampleGraph, createNode, sanitizeGraph, sanitizeCode, outsOf } from '../js/nodes.js';
import { generateCode } from '../js/codegen.js';
import { EXAMPLES } from '../js/examples-data.js';
import {
  HOME, MARK, CHAT_CHARS, MAX_UNFOLDED, MAX_LINK, MAX_LOAD, OBJECT_V1, GROUP_V1, KEY_V1, EXPORT_V1, SHARE_ERRORS, ShareError,
  shareData, packScene, unpackScene, unpackObjects, sharedPacked, sceneText, loadOf, tooHeavy, payloadOf, baseOf, makeLink, readLink,
  exportOptions, canDeflate,
} from '../js/share.js';

const root = new URL('../', import.meta.url);
const clone = (v) => JSON.parse(JSON.stringify(v));
const key = (t, o = {}) => ({ t, pos: [0.5, 2, 0.5], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth', ...o });
const scene = (...objects) => sanitizeScene({ objects }).objects;
const base64url = (bytes) => Buffer.from(bytes).toString('base64url');
/** The payload of a link somebody made by hand: any JSON, deflated. */
const forged = (packed) => `z${base64url(zlib.deflateRawSync(Buffer.from(typeof packed === 'string' ? packed : JSON.stringify(packed))))}`;
const plainly = (packed) => `j${base64url(Buffer.from(typeof packed === 'string' ? packed : JSON.stringify(packed)))}`;

/** What a link stands for, opened again. */
const through = async (data, options) => readLink(payloadOf((await makeLink(data, options)).url));
/** The kind of the ShareError a payload is refused with (anything else that is thrown fails the test). */
async function refusal(payload) {
  try {
    await readLink(payload);
  } catch (err) {
    assert.ok(err instanceof ShareError, `a ShareError, not ${err && err.name}: ${err && err.message}`);
    assert.ok(SHARE_ERRORS[err.kind], `a kind there are words for: ${err.kind}`);
    return err.kind;
  }
  return 'opened';
}

/** Is everything `expected` says in `actual`? (What a later version adds to an object does not count.) */
function holds(actual, expected, path = 'scene') {
  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `${path} is a list`);
    assert.equal(actual.length, expected.length, `${path}: how many`);
    expected.forEach((v, i) => holds(actual[i], v, `${path}[${i}]`));
  } else if (expected && typeof expected === 'object') {
    assert.ok(actual && typeof actual === 'object', `${path} is there`);
    for (const [name, v] of Object.entries(expected)) holds(actual[name], v, `${path}.${name}`);
  } else assert.equal(actual, expected, path);
}

// ---------------------------------------------------------------- scenes to share

const turning = (n) => Array.from({ length: n }, (_, i) => key(0.5 + i * 0.5, { pos: [i % 3, 2 + (i % 2), i % 5], rot: [i * 70, i * 110, i * 50], scale: [1 + (i % 2), 1, 1] }));

/** A picture of nodes with every kind of node in it, wired in a row. */
function everyNode() {
  const nodes = NODE_TYPES.map((type, i) => createNode(type.id, (i % 6) * 300, Math.floor(i / 6) * 220));
  const wires = [];
  nodes.forEach((node, i) => {
    const next = nodes[i + 1];
    if (next && !NODE_TYPES[i + 1].event) wires.push({ from: node.id, out: outsOf(NODE_TYPES[i])[0].id, to: next.id });
  });
  return sanitizeGraph({ nodes, wires });
}

/** Scenes of every kind: [name, { objects, export, code }]. */
function scenes() {
  const list = EXAMPLES.map((ex) => [`the example ${ex.name}`, { objects: clone(ex.scene.objects) }]);
  list.push(['the scene a first visit starts with', { objects: [
    createObject('circle', { name: 'Ring', pos: [0.5, 1.35, 0.5], rot: [90, 0, 0], scale: [1.4, 1.4, 1.4], count: 40, texture: 'glint', color: '#ffc531', size: 0.35 }),
    createObject('heart', { name: 'Heart', pos: [0.5, 3.1, 0.5], scale: [0.9, 0.9, 0.9], count: 34, texture: 'heart', color: '#ff4d7a' }),
  ] }]);
  list.push(['one particle with nothing changed', { objects: [createObject('point')] }]);
  list.push(['every setting away from where it starts', { objects: [
    createGroup({ id: 'g', name: 'Outer', pos: [1, 2, 3], rot: [10, 20, 30], scale: [2, 2, 2], hidden: true, start: 1.5, spin: true, repeat: 3, every: 0.4, open: false,
      keys: [key(1, { pos: [1, 4, 3], rot: [0, 90, 0], scale: [1, 1, 1], ease: 'out' }), key(2, { pos: [1, 2, 3], rot: [10, 20, 30], scale: [2, 2, 2] })] }),
    createGroup({ id: 'h', name: 'Group', parent: 'g' }),
    createObject('star', { id: 'a', name: 'Tip', parent: 'h', count: 20, params: { points: 7, inner: 0.3 }, pos: [0.5, 2, 0.5], rot: [1, 2, 3], scale: [0.5, 2, 1],
      texture: 'heart', color: '#ff0000', color2: '#00ff00', size: 0.5, size2: 0.9, life: 2.5, fade: true, fadeIn: true, blend: 2, start: 0.5,
      move: [0, 1, -1], spread: 0.2, expand: 0.5, gravity: -2, hidden: true, spin: true, repeat: 4, every: 0.25,
      keys: [
        key(1, { rot: [1, 2, 3], scale: [0.5, 2, 1] }), // (all as the object has it)
        key(2, { pos: [3, 2, 0.5], rot: [0, 0, 45], scale: [2, 2, 2], color: '#0000ff', color2: '#ffffff', size: 0.4, size2: 0.6, ease: 'in', form: { shape: 'heart', count: 16 } }),
        key(3, { color: '#123456', size: 0.2, ease: 'jump', form: { shape: 'own:cloud', points: [[0, 0, 0], [1, 1, 1]], deform: [newDeformer('twist')] } }),
      ] }),
    createObject('point', { id: 'p', name: 'Spark', pos: [2, 2, 2], texture: 'bubble', color: '#abcdef', size: 1.5, keys: [key(1, { pos: [2, 5, 2] })] }),
  ] }]);
  list.push(['shapes of the Shape Studio', { objects: [
    createObject('cube', { id: 'c', count: 24, deform: DEFORMERS.slice(0, 12).map((def) => newDeformer(def.id)) }),
    createObject('own:path', { id: 'l', count: 9, path: { nodes: [[-1, 0, 0], [0, 1, 0], [1, 0, 0]], closed: true, smooth: true, mode: 'fill' }, deform: [newDeformer('mirror'), { ...newDeformer('pull'), on: false }] }),
    createObject('own:path', { id: 'l2', count: 30, path: { nodes: [[0, 0, 0], [0.3333, 1.25, -0.5]], closed: false, smooth: false, mode: 'spin' } }),
    createObject('own:cloud', { id: 'q', points: Array.from({ length: 200 }, (_, i) => [Math.round(Math.cos(i) * 2e4) / 1e4, Math.round(Math.sin(i * 1.7) * 2e4) / 1e4, (i % 7) / 8]) }),
  ] }]);
  // (as many of them as a link opens: see MAX_LOAD in js/share.js)
  list.push(['one of every 105th shape of the library', { objects: SHAPES.filter((_, i) => i % 105 === 0).map((def, i) => createObject(def.id, { pos: [i % 9, 2, Math.floor(i / 9)] })) }]);
  list.push(['groups in groups, eight deep', { objects: [
    ...Array.from({ length: 8 }, (_, i) => createGroup({ id: `g${i}`, name: `Level ${i}`, parent: i ? `g${i - 1}` : null, pos: [i, 0, 0] })),
    createObject('circle', { id: 'in', parent: 'g7' }), createObject('circle', { id: 'out' }),
  ] }]);
  list.push(['names and code with signs of every kind', {
    objects: [createObject('point', { name: 'Étoile ✨ 星 "quoted" <b> & \\' }), createGroup({ name: '  spaces  ' })],
    code: { graph: sanitizeGraph(null), own: '// héllo ✨ 星\nconst s = "a\\tb" + `${1 + 1}` // </script>\n\tonPlayerJump = (id) => psPlay(api.getPosition(id))\n', lang: 'ts' },
  }]);
  list.push(['the export window set another way', { objects: [createObject('circle')], export: { target: 'world', precision: 10, hideDist: 48, worldPos: [10, 64, -30.5] } }]);
  list.push(['every kind of node', { objects: [createObject('circle')], code: { graph: everyNode(), own: '', lang: 'js' } }]);
  for (const ex of NODE_EXAMPLES) list.push([`the nodes of "${ex.name}"`, { objects: [createObject('circle')], code: { graph: exampleGraph(ex), own: '// mine', lang: 'js' } }]);
  return list;
}

// ---------------------------------------------------------------- there and back

test('share: a link opens as exactly the scene it was made from', async () => {
  const all = scenes();
  assert.ok(all.length >= 15);
  for (const [name, data] of all) {
    const want = shareData(data);
    const made = await makeLink(data);
    const back = await readLink(payloadOf(made.url));
    assert.equal(sceneText(back), sceneText(want), name);
    assert.equal(made.objects, want.objects.length, name);
    assert.equal(made.code, !!want.code, name);
    // and it is what the saved file of the scene loads as: the same objects, in the same order, field by field
    const file = sanitizeScene(clone({ objects: data.objects })).objects;
    assert.deepEqual(back.objects.map((o) => ({ ...o, id: 0, parent: 0 })), file.map((o) => ({ ...o, id: 0, parent: 0 })), name);
    // every object has a new id of its own, and what was in a group is in that group
    const ids = new Set(back.objects.map((o) => o.id));
    assert.equal(ids.size, back.objects.length, `${name}: ids of their own`);
    for (const o of want.objects) assert.ok(!ids.has(o.id), `${name}: new ids`);
    back.objects.forEach((o, i) => {
      const was = want.objects[i].parent;
      assert.equal(o.parent === null ? -1 : back.objects.findIndex((g) => g.id === o.parent), was === null ? -1 : want.objects.findIndex((g) => g.id === was), `${name}: object ${i} is where it was`);
      if (o.parent !== null) assert.ok(isGroup(back.objects.find((g) => g.id === o.parent)));
    });
    // the same code comes out of it
    assert.equal(generateCode(back.objects).parts.map((p) => p.code).join('\n'), generateCode(want.objects).parts.map((p) => p.code).join('\n'), `${name}: the exported code`);
  }
  // opened twice, a link gives two scenes that share no id (nor do their nodes)
  const twice = { objects: [createGroup({ id: 'g' }), createObject('circle', { id: 'a', parent: 'g' })], code: { graph: exampleGraph(NODE_EXAMPLES[0]), own: '', lang: 'js' } };
  const payload = payloadOf((await makeLink(twice)).url);
  const [first, second] = [await readLink(payload), await readLink(payload)];
  assert.equal(sceneText(first), sceneText(second));
  for (const [x, y] of [[first.objects, second.objects], [first.code.graph.nodes, second.code.graph.nodes]]) {
    assert.ok(x.length > 1 && x.every((one) => !y.some((other) => other.id === one.id)));
  }
  // the scene something is made from is not touched
  const data = { objects: scene(createObject('circle', { id: 'a' })), export: { target: 'world' }, code: null };
  const before = JSON.stringify(data);
  await makeLink(data);
  assert.equal(JSON.stringify(data), before);
});

test('share: the Code window travels with the scene, or stays behind', async () => {
  const graph = exampleGraph(NODE_EXAMPLES.find((ex) => ex.id === 'wand'));
  const data = { objects: [createObject('circle')], code: { graph, own: '// mine', lang: 'ts' } };
  const back = await through(data);
  assert.deepEqual(back.code.graph.nodes.map((n) => [n.type, n.x, n.y, n.values]), graph.nodes.map((n) => [n.type, n.x, n.y, n.values]));
  // the wires join the same nodes, which have new ids
  const place = (g, id) => g.nodes.findIndex((n) => n.id === id);
  assert.deepEqual(back.code.graph.wires.map((w) => [place(back.code.graph, w.from), w.out, place(back.code.graph, w.to)]),
    graph.wires.map((w) => [place(graph, w.from), w.out, place(graph, w.to)]));
  assert.ok(back.code.graph.nodes.every((n) => !graph.nodes.some((old) => old.id === n.id)));
  assert.deepEqual([back.code.own, back.code.lang], ['// mine', 'ts']);
  // left out when asked: the link is shorter, and whoever opens it keeps their own Code window (code: null)
  const [withIt, without] = [await makeLink(data), await makeLink(data, { withCode: false })];
  assert.ok(without.chars < withIt.chars - 100, `${without.chars} against ${withIt.chars}`);
  assert.deepEqual([withIt.code, without.code], [true, false]);
  assert.equal((await readLink(payloadOf(without.url))).code, null);
  // an empty Code window is nothing to send: the language alone is not
  for (const code of [null, undefined, { graph: sanitizeGraph(null), own: '', lang: 'ts' }]) assert.equal((await through({ objects: [createObject('circle')], code })).code, null);
  // nodes without code, and code without nodes
  assert.deepEqual((await through({ objects: [createObject('circle')], code: { graph, own: '', lang: 'js' } })).code.own, '');
  assert.equal((await through({ objects: [createObject('circle')], code: { graph: sanitizeGraph(null), own: 'x', lang: 'js' } })).code.graph.nodes.length, 0);
});

// ---------------------------------------------------------------- what a link looks like

test('share: a link is made of signs every chat lets through, and it is short', async () => {
  const lengths = {};
  for (const [name, data] of scenes()) {
    const made = await makeLink(data);
    assert.match(made.url, /^https:\/\/epicoo00000\.github\.io\/Bloxd-Particle-studio\/#s=z[A-Za-z0-9_-]+$/, name);
    assert.equal(made.chars, made.url.length);
    assert.ok(made.deflated);
    lengths[name] = made.chars;
    // any inflate reads what is in it: it is plain deflate, and in it the packed scene as JSON
    const packed = JSON.parse(zlib.inflateRawSync(Buffer.from(payloadOf(made.url).slice(1), 'base64url')).toString('utf8'));
    assert.equal(packed.v, 1, name);
    assert.ok(!packed.full, `${name}: the short way`);
    assert.deepEqual(packed, sharedPacked(shareData(data)));
    // no ids travel: an object is its place in the list
    assert.ok(packed.objects.every((o) => !('id' in o) && (o.parent === undefined || Number.isInteger(o.parent))), name);
    // and it is much shorter than the scene with nothing left out
    const all = `${HOME}${MARK}${forged(packScene(shareData(data), { full: true }))}`.length;
    assert.ok(made.chars < all * 0.92, `${name}: ${made.chars} against ${all} with nothing left out`);
  }
  // how long: a first scene fits a chat message many times over, the examples as the README says
  assert.ok(lengths['the scene a first visit starts with'] < 300, `${lengths['the scene a first visit starts with']}`);
  assert.ok(lengths['one particle with nothing changed'] < 90);
  assert.ok(lengths['the example Campfire'] < CHAT_CHARS / 2 && lengths['the example Portal'] < CHAT_CHARS / 2);
  assert.ok(lengths['the example Dragon'] > CHAT_CHARS, 'the dragon is too long for one chat message: the window says so');
  const readme = fs.readFileSync(new URL('README.md', root), 'utf8').replace(/\s+/g, ' ');
  const said = /The Portal example makes a link of about ([\d,]+) characters, the Campfire about ([\d,]+) and the Dragon about ([\d,]+)\./.exec(readme);
  assert.ok(said, 'the README says how long the links of the examples are');
  ['Portal', 'Campfire', 'Dragon'].forEach((name, i) => {
    const told = Number(said[i + 1].replace(/,/g, ''));
    const real = lengths[`the example ${name}`];
    assert.ok(Math.abs(told - real) <= real * 0.03, `the README says ${told} for the ${name}, it is ${real}`);
  });
  // the address in front is the one that is asked for
  const made = await makeLink({ objects: [createObject('point')] }, { base: 'http://localhost:8080/' });
  assert.ok(made.url.startsWith('http://localhost:8080/#s=z'));
});

test('share: where the link is in an address, and which address a link starts with', () => {
  for (const [text, want] of [
    ['#s=zabc', 'zabc'], ['https://x.y/z/#s=zab-_c', 'zab-_c'], ['s=zabc', 'zabc'],
    ['#s=zabc.', 'zabc'], ['#s=zabc)', 'zabc'], ['#s=zabc&utm_source=chat', 'zabc'], ['#s=zabc?fbclid=1', 'zabc'], ['#s=zabc%20', 'zabc'],
    ['#tab=2&s=zabc', 'zabc'], ['#s=', ''],
    ['', null], ['#', null], ['#timeline', null], ['#as=zabc', null], ['#x&ss=1', null], [null, null], [undefined, null],
    // (only what is after the "#" counts: an "s=" in the address before it is something else)
    ['https://x.y/?s=zabc', null], ['https://x.y/?s=zabc#top', null],
  ]) assert.equal(payloadOf(text), want, String(text));
  // the address of the page, without what is after "?" and "#"
  assert.equal(baseOf({ protocol: 'https:', origin: 'https://epicoo00000.github.io', pathname: '/Bloxd-Particle-studio/', search: '?x=1', hash: '#s=zabc' }),
    'https://epicoo00000.github.io/Bloxd-Particle-studio/');
  assert.equal(baseOf({ protocol: 'http:', origin: 'http://localhost:8080', pathname: '/index.html' }), 'http://localhost:8080/index.html');
  assert.equal(baseOf({ protocol: 'https:', origin: 'https://my.domain', pathname: '/' }), 'https://my.domain/');
  // a copy opened from a file has no address anybody else could open: its links lead to the studio on the web
  for (const location of [{ protocol: 'file:', origin: 'null', pathname: '/C:/Users/me/START-HERE.html' }, { protocol: 'about:', origin: 'null', pathname: 'blank' }, null, undefined]) {
    assert.equal(baseOf(location), HOME);
  }
  assert.equal(HOME, 'https://epicoo00000.github.io/Bloxd-Particle-studio/');
  assert.equal(MARK, '#s=');
});

// ---------------------------------------------------------------- for ever

// Two links as this version made them. Every later version has to open them as the scenes written under them:
// somebody posted them somewhere.
const GOLDEN_Z = 'https://epicoo00000.github.io/Bloxd-Particle-studio/#s=zXVRBjts4EPyK0bkkQI-HouzJDoHsJbkkpzkssAfHB47UsrgjkwRJjccx9JM8IPuO_UleErRoaZS9sclmdVV1kxd4BlUguMd_qEoR1O4CVh8JFPxt7AEQYqs9h4fgeg8I3nFWgRLLPUJwCdROYClQ7BGe6Jwx0og65W5-y73PuaQj47o-wcCn5EknUCUCPVM4gxLrzYCXmUBMOgBC5XqbQEmB4HXQxwjqAt4Zy-zfIxhrKfDlcpgIiPUWJYr1ds_XOxdAwZumEUIIuO5I3hKCN1mz-UYMsc1Lyet7hM40BErydqNrApVCTwiPHdkalEQ4umcaJRajwugD6ZovSwR68drWV9RD0M8mnUHdSByFpesB4362E_JvdrIXaSyTVZWzpslYgRsOY6U7piFRonw12lhYyGfxTbPQukFoXDiym5PjLTGx2fLibmH5MAyjQjOT9ToQpwmcJugv44FZZ74TnUQvqQ9L_NbUNV1xlh2v-kdadHwzA3_MBzVlxrsLPBn2FtLJREZ0Myv9YuI4i9oe2JVCimG_LOJOVnmd2tdC93OdT0Gf7CpnssDUsj3W1cSCdjcFjqM8NXyXY56yzkWqJw7x6BxfzdHR8ehAY7oOhv8zqTrX169UypnKQ55wnEd9NzZ8rL7eoljLLd6IdSG3rzy4Q_TiHU_XBZIOB0qg4ORCxzV8oMpEw14VYuwCfWL71OYPzEkP-f0KvNvgTSn2AxNj9gsToOpM9QS4EXgn8AKPfUoMCcEc2vFp76ByrqvdyQKW5TUtUuVsHcd5PrUOFJCu2pzuO30GvJOCQS8cVmwBnSnOH9BVPMTWNGkRN7rif0tB59wTIPQ-88jDxb05mUBX_8bPB4vRsbyWnMFMFdzertr__u06t_r5_cdX6-xDp88UvvRHv_qwemvqd6sPf6585O232pv1gdKDiyYZZ_n0HSBwo4ph-AU';
const EXPECT_Z = {
  objects: [
    { name: 'Wing', shape: 'group', pos: [1, 2, 3], rot: [0, 30, 0], scale: [1, 1, 1], hidden: false, start: 0, spin: false, parent: null, repeat: 3, every: 0.4, open: true,
      keys: [{ t: 1, pos: [1, 4, 3], rot: [0, 90, 0], scale: [1, 1, 1], ease: 'out' }] },
    { shape: 'star', count: 20, params: { points: 7, inner: 0.3 }, pos: [0.5, 2, 0.5], rot: [0, 0, 0], scale: [1, 1, 1], texture: 'glint', color: '#ff0000', color2: '#00ff00',
      size: 0.5, size2: 0.9, life: 2.5, fade: true, blend: 2, move: [0, 1, 0], spread: 0.2, expand: 0.5, gravity: -2, hidden: false, start: 0.5, fadeIn: true, spin: true,
      parent: 0, repeat: 1, every: 0.5, name: 'Tip',
      keys: [
        { t: 1, pos: [0.5, 2, 0.5], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth' },
        { t: 2, pos: [3, 2, 0.5], rot: [0, 0, 45], scale: [2, 2, 2], ease: 'in', color: '#0000ff', color2: null, size: 0.4, size2: null, form: { shape: 'heart', count: 16, params: {} } },
      ] },
    { shape: 'point', count: 1, params: {}, pos: [2, 2, 2], rot: [0, 0, 0], scale: [1, 1, 1], texture: 'heart', color: '#ffd24a', color2: null, size: 0.3, size2: null, life: 6,
      fade: false, blend: 1, move: [0, 0, 0], spread: 0, expand: 0, gravity: 0, hidden: true, start: 0, fadeIn: false, keys: [], spin: false, parent: null, repeat: 1, every: 0.5,
      name: 'Particle' },
    { shape: 'cube', count: 24, params: {}, pos: [0.5, 1.5, 0.5], rot: [0, 0, 0], scale: [1, 1, 1], texture: 'glint', color: '#ffd24a', color2: null, size: 0.3, size2: null,
      life: 6, fade: false, blend: 1, move: [0, 0, 0], spread: 0, expand: 0, gravity: 0, hidden: false, start: 0, fadeIn: false, keys: [], spin: false, parent: null, repeat: 1,
      every: 0.5, name: 'Cube', deform: [{ kind: 'twist', on: true, axis: 1, angle: 120 }] },
    { shape: 'own:path', count: 9, params: {}, pos: [0.5, 1.5, 0.5], size: 0.3, life: 6, name: 'Drawn shape',
      path: { nodes: [[-1, 0, 0], [0, 1, 0], [1, 0, 0]], closed: true, smooth: true, mode: 'fill' } },
    { shape: 'own:cloud', count: 3, params: {}, pos: [0.5, 1.5, 0.5], color: '#ffd24a', name: 'Points', points: [[0, 0, 0], [0.5, 0.25, -0.125], [1, 0, 0]] },
  ],
  export: { target: 'world', precision: 10, hideDist: 48, worldPos: [10, 64, -30] },
  code: {
    nodes: [
      { type: 'click', x: 40, y: 60, values: { button: 'right' } },
      { type: 'cooldown', x: 330, y: 60, values: { seconds: 2, who: 'each' } },
      { type: 'play', x: 620, y: 40, values: { place: 'eyes', pos: [0, 0, 0], shift: [0, 0, 0], facing: 'look', upright: true } },
    ],
    wires: [[0, 'out', 1], [1, 'out', 2]],
    own: '// héllo ✨\nonPlayerJump = (id) => psPlay(api.getPosition(id))',
    lang: 'ts',
  },
};
// (the second one is as a browser makes it that cannot deflate: a circle of 12 and one particle, with nothing else said)
const GOLDEN_J = 'https://epicoo00000.github.io/Bloxd-Particle-studio/#s=jeyJ2IjoxLCJvYmplY3RzIjpbeyJzaGFwZSI6ImNpcmNsZSIsImNvdW50IjoxMiwibmFtZSI6IkNpcmNsZSJ9LHt9XX0';
const EXPECT_J = {
  objects: [
    { shape: 'circle', count: 12, params: {}, pos: [0.5, 1.5, 0.5], rot: [0, 0, 0], scale: [1, 1, 1], texture: 'glint', color: '#ffd24a', color2: null, size: 0.3, size2: null,
      life: 6, fade: false, blend: 1, move: [0, 0, 0], spread: 0, expand: 0, gravity: 0, hidden: false, start: 0, fadeIn: false, keys: [], spin: false, parent: null, repeat: 1,
      every: 0.5, name: 'Circle' },
    { shape: 'point', count: 1, params: {}, pos: [0.5, 1.5, 0.5], rot: [0, 0, 0], scale: [1, 1, 1], texture: 'glint', color: '#ffd24a', color2: null, size: 0.3, size2: null,
      life: 6, fade: false, blend: 1, move: [0, 0, 0], spread: 0, expand: 0, gravity: 0, hidden: false, start: 0, fadeIn: false, keys: [], spin: false, parent: null, repeat: 1,
      every: 0.5, name: 'Particle' },
  ],
  export: { target: 'block', precision: 100, hideDist: 0, worldPos: [0, 0, 0] },
  code: null,
};

test('share: links that were made once open as the same scenes for ever', async () => {
  for (const [link, expected] of [[GOLDEN_Z, EXPECT_Z], [GOLDEN_J, EXPECT_J]]) {
    const back = await readLink(payloadOf(link));
    holds(JSON.parse(sceneText(back)), expected);
    assert.equal(back.objects.length, expected.objects.length);
  }
  // What a link leaves out is written down once and never changed (js/share.js says why). If a default of the
  // studio changes one day, these tables stay as they are: change them, and every link ever posted opens as
  // another scene. A new way of packing gets a new number in `v`.
  assert.deepEqual(OBJECT_V1, {
    shape: 'point', name: 'Particle', count: 1, params: {}, pos: [0.5, 1.5, 0.5], rot: [0, 0, 0], scale: [1, 1, 1],
    texture: 'glint', color: '#ffd24a', color2: null, size: 0.3, size2: null, life: 6, fade: false, blend: 1,
    move: [0, 0, 0], spread: 0, expand: 0, gravity: 0, hidden: false, start: 0, fadeIn: false, keys: [], spin: false,
    parent: null, repeat: 1, every: 0.5,
  });
  assert.deepEqual(GROUP_V1, {
    name: 'Group', pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], hidden: false, start: 0, keys: [], spin: false,
    parent: null, repeat: 1, every: 0.5, open: true,
  });
  assert.deepEqual(KEY_V1, { ease: 'smooth', color2: null, size2: null });
  assert.deepEqual(EXPORT_V1, { target: 'block', precision: 100, hideDist: 0, worldPos: [0, 0, 0] });
  for (const table of [OBJECT_V1, GROUP_V1, KEY_V1, EXPORT_V1]) assert.ok(Object.isFrozen(table));
  // Nothing is left for the defaults of the day: what is handed on has every field of the tables written out,
  // and every key its place, turn, size and ease.
  const raw = unpackObjects([{}, { shape: 'group' }, { shape: 'star', count: 5, pos: [1, 2, 3], keys: [{ t: 1 }, { t: 2, color: '#ff0000', size: 1 }] }]);
  assert.deepEqual(Object.keys(OBJECT_V1).filter((name) => !(name in raw[0])), []);
  assert.deepEqual(Object.keys(GROUP_V1).filter((name) => !(name in raw[1])), []);
  assert.deepEqual(raw[2].keys, [
    { pos: [1, 2, 3], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth', t: 1 },
    { pos: [1, 2, 3], rot: [0, 0, 0], scale: [1, 1, 1], ease: 'smooth', t: 2, color: '#ff0000', size: 1, color2: null, size2: null },
  ]);
  // (today the tables are what a new object has anyway: that is what makes links short, and nothing else hangs on it)
  for (const name of Object.keys(DEFAULTS)) assert.ok(name in OBJECT_V1, `${name} has a place in the table`);
  // a link with nothing left out is read as well (what a scene gets that does not come back the same the short way)
  const data = shareData({ objects: [createGroup({ id: 'g' }), createObject('star', { id: 'a', parent: 'g', keys: [key(1)] })], code: { graph: everyNode(), own: 'x', lang: 'ts' } });
  assert.equal(sceneText(unpackScene(clone(packScene(data, { full: true })))), sceneText(data));
  // when the short way does not give the scene back, the link is made with nothing left out, and never with another scene in it
  const faulty = (d, options) => (options.full ? packScene(d, options) : { v: 1, objects: packScene(d).objects.slice(1) });
  assert.ok(sharedPacked(data, faulty).full);
  assert.ok(!sharedPacked(data).full);
  assert.throws(() => sharedPacked(data, () => ({ v: 1, objects: [] })), ShareError);
});

test('share: a browser that cannot deflate makes longer links, and every browser reads those', async () => {
  const data = { objects: clone(EXAMPLES.find((ex) => ex.id === 'portal').scene.objects) };
  assert.ok(canDeflate(), 'this Node can');
  const [short, plain] = [await makeLink(data), await makeLink(data, { plain: true })];
  assert.match(plain.url, /#s=j[A-Za-z0-9_-]+$/);
  assert.deepEqual([short.deflated, plain.deflated], [true, false]);
  assert.ok(plain.chars > short.chars * 2);
  assert.equal(sceneText(await readLink(payloadOf(plain.url))), sceneText(shareData(data)));
  // the same without the tools of the browser: links are made the plain way, and a deflated one says what is the matter
  const tools = [globalThis.CompressionStream, globalThis.DecompressionStream];
  try {
    globalThis.CompressionStream = undefined;
    globalThis.DecompressionStream = undefined;
    assert.ok(!canDeflate());
    const made = await makeLink(data);
    assert.equal(made.url, plain.url);
    assert.equal(sceneText(await readLink(payloadOf(made.url))), sceneText(shareData(data)));
    assert.equal(await refusal(payloadOf(short.url)), 'browser');
  } finally {
    [globalThis.CompressionStream, globalThis.DecompressionStream] = tools;
  }
  assert.equal(sceneText(await readLink(payloadOf(short.url))), sceneText(shareData(data)));
});

// ---------------------------------------------------------------- links nobody should have made

test('share: a link that is cut off, changed or made up is refused, with words for whoever opened it', async () => {
  const made = await makeLink({ objects: [createObject('circle', { count: 12, color: '#ff0000' }), createObject('point', { pos: [1, 2, 3] })] });
  const payload = payloadOf(made.url);
  assert.equal(await refusal(payload), 'opened');
  // cut off anywhere: never a scene, never anything but "broken"
  for (let length = 0; length < payload.length; length++) assert.equal(await refusal(payload.slice(0, length)), 'broken', `cut after ${length} signs`);
  const plain = payloadOf((await makeLink({ objects: [createObject('circle')] }, { plain: true })).url);
  for (let length = 0; length < plain.length; length++) assert.equal(await refusal(plain.slice(0, length)), 'broken', `the plain one cut after ${length} signs`);
  // something added, or one sign changed: refused or opened, but nothing else is ever thrown
  for (const more of ['A', 'AAAA', 'zzzzzzzz', payload]) assert.ok(['broken', 'opened'].includes(await refusal(payload + more)), more.slice(0, 8));
  let opened = 0;
  for (let i = 1; i < payload.length; i++) {
    const result = await refusal(`${payload.slice(0, i)}${payload[i] === 'A' ? 'B' : 'A'}${payload.slice(i + 1)}`);
    assert.ok(['broken', 'opened', 'newer', 'heavy'].includes(result), `sign ${i} changed: ${result}`);
    if (result === 'opened') opened++;
  }
  assert.ok(opened < payload.length / 4, `${opened} of ${payload.length} changes still open`);
  // nonsense of every kind
  for (const bad of ['', 'z', 'j', 'zhello', 'z!!!!', 'j%7B%7D', 'z AAAA', 'zAAAA=', 'Zabc', '1abc', '_abc', forged('not JSON'), forged('{"v":1,'), plainly('{"v":1'), plainly(Buffer.from([0xff, 0xfe, 0x00])),
    forged(null), forged(5), forged('"text"'), forged([]), forged([1, 2]), forged({}), forged({ v: 0, objects: [] }), forged({ v: '1', objects: [] }), forged({ v: 1 }),
    forged({ v: 1, objects: 5 }), forged({ v: 1, objects: 'x' }), forged({ v: 1, objects: {} }), forged({ v: 1, full: { objects: 5 } }), forged({ v: 1.5, objects: [] })]) {
    assert.equal(await refusal(bad), 'broken', bad.slice(0, 30));
  }
  // a link of a later kind is told apart: the studio is asked to load itself anew
  for (const later of ['aabc', 'qxyz', 'y', forged({ v: 2, objects: [] }), plainly({ v: 99 })]) assert.equal(await refusal(later), 'newer', later.slice(0, 20));
  // an empty scene is opened by readLink (the page says that there is nothing in it)
  assert.deepEqual((await readLink(forged({ v: 1, objects: [] }))).objects, []);
  // nesting without end is no way to break it either: refused, or opened as what is left of it, and nothing else is thrown
  const deep = `${'['.repeat(200000)}${']'.repeat(200000)}`;
  assert.deepEqual((await readLink(forged(`{"v":1,"objects":${deep}}`))).objects.map((o) => o.shape), ['point']);
  for (const where of ['"pos":D', '"pos":[D,D,D]', '"params":{"radius":D}', '"shape":"star","count":D', '"keys":[{"t":D}]', '"keys":[{"t":1,"form":{"shape":"own:cloud","points":D}}]', '"name":D',
    '"shape":"own:path","path":{"nodes":D}', '"shape":"circle","deform":[{"kind":"twist","angle":D}]', '"parent":D', '"repeat":D']) {
    assert.ok(['broken', 'opened'].includes(await refusal(forged(`{"v":1,"objects":[{${where.split('D').join(deep)}}]}`))), where);
  }
  assert.ok(['broken', 'opened'].includes(await refusal(forged(`{"v":1,"objects":[{}],"code":{"nodes":[["message",0,0,{"text":${deep}}]],"own":${deep}},"export":{"worldPos":[${deep},0,0]}}`))));
  // every kind of refusal has words that say what to do, and that nothing was changed
  for (const kind of ['broken', 'newer', 'big', 'heavy', 'browser', 'empty']) assert.match(SHARE_ERRORS[kind], /^This share link .*Nothing was changed\.$|^The scene of this share link .*Nothing was changed\.$|^This browser .*Nothing was changed\.$/, kind);
});

test('share: a link cannot hold more than a scene can be', async () => {
  // a short link that unfolds into megabytes is stopped while it unfolds
  const bomb = forged(`{"v":1,"objects":[],"pad":"${'a'.repeat(MAX_UNFOLDED + 1000)}"}`);
  assert.ok(bomb.length < 12000, `${bomb.length} signs`);
  assert.equal(await refusal(bomb), 'big');
  assert.equal(await refusal(forged(`{"v":1,"objects":[],"pad":"${'a'.repeat(100000)}"}`)), 'opened', 'under the limit it is read');
  // and one that is long to begin with is not looked into
  assert.equal(await refusal(`j${'A'.repeat(MAX_LINK)}`), 'big');
  assert.equal(await refusal(plainly(`{"v":1,"objects":[],"pad":"${'a'.repeat(700000)}"}`)), 'opened');
  // whatever is in it is repaired like a file that is opened: 10,000 objects, numbers out of all bounds, the wrong kinds of thing
  const wild = await readLink(forged({ v: 1, objects: [
    { shape: 'circle', count: 1e9, size: -5, life: 1e99, pos: [1e9, 'x', null], repeat: -7, every: -1, color: 'red', blend: 77, keys: 'none', parent: 99, params: { radius: 1e12 } },
    { shape: 'no such shape', name: 5, repeat: 1e6, keys: [5, null, { t: 'soon' }, { t: 1, pos: 'far', form: { shape: 'own:cloud', points: 'many' } }] },
    { shape: 'group', parent: 2 }, { shape: 'group', parent: 4 }, { shape: 'group', parent: 3 }, // (in itself; in each other)
    5, null, 'text', [1, 2],
    ...Array.from({ length: 10000 }, () => ({})),
  ] }));
  assert.equal(wild.objects.length, 500);
  assert.deepEqual(wild.objects, sanitizeScene({ objects: clone(wild.objects) }).objects, 'nothing a file could not hold');
  const [a, b] = wild.objects;
  assert.deepEqual([a.count, a.size, a.life, a.pos, a.repeat, a.color, a.blend, a.keys, a.parent], [600, 0.01, 1000, [500, 1.5, 0.5], 1, '#ffd24a', 1, [], null]);
  assert.deepEqual([b.shape, b.name, b.repeat, b.keys.length], ['point', 'Particle', 60, 1]);
  for (const g of wild.objects.slice(2, 5)) assert.ok(g.parent === null || g.parent !== g.id);
  // a field called __proto__ is a field like any other: it reaches nothing
  const sly = await readLink(forged('{"v":1,"objects":[{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"keys":[{"t":1,"__proto__":{"polluted":true}}]}],"export":{"__proto__":{"polluted":true}},"__proto__":{"polluted":true}}'));
  assert.equal(sly.objects.length, 1);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf(sly.objects[0]), Object.prototype);
  assert.equal(sly.objects[0].polluted, undefined);
  // the Code window of a link is repaired too: kinds of node there are, wires between nodes that are there, texts cut
  const code = (await readLink(forged({ v: 1, objects: [{}], code: {
    nodes: [['jump', 0, 0, {}], ['no such node', 0, 0, {}], 5, ['play', 1e9, 'x', { place: 'nowhere', pos: 'x' }], ['message', 0, 0, { text: 'x'.repeat(5000) }]],
    wires: [[0, 'out', 3], [0, 'out', 99], [0, 'nope', 3], ['a', 'out', 3], [3, 'out', 0], 7, [0, 'out', 4]],
    own: 'y'.repeat(300000), ts: 'yes',
  } }))).code;
  assert.deepEqual(code, sanitizeCode(clone(code)));
  assert.deepEqual(code.graph.nodes.map((n) => n.type), ['jump', 'play', 'message']);
  assert.equal(code.graph.nodes[2].values.text.length, 300);
  assert.equal(code.own.length, 200000);
  assert.equal(code.lang, 'ts');
  // (the list of nodes is read by its places after the junk is taken out: the wires that are left join nodes that are there)
  assert.ok(code.graph.wires.every((w) => code.graph.nodes.some((n) => n.id === w.from) && code.graph.nodes.some((n) => n.id === w.to)));
  // the settings of the export window: only what they can be
  assert.deepEqual((await readLink(forged({ v: 1, objects: [{}], export: { target: 'moon', precision: -1, hideDist: 1e9, worldPos: [1, 'x', 3] } }))).export,
    { target: 'block', precision: 100, hideDist: 1000, worldPos: [0, 0, 0] });
  assert.deepEqual(exportOptions('junk'), EXPORT_V1);
});

test('share: a scene far bigger than the game could play is not opened from a link', async () => {
  // how much the scenes that are there are: far below what is let in
  const loads = Object.fromEntries(EXAMPLES.map((ex) => [ex.id, loadOf(sanitizeScene(ex.scene).objects)]));
  assert.deepEqual(loads.dragon, { particles: 1489, plans: 141 });
  for (const [id, load] of Object.entries(loads)) {
    assert.ok(load.particles * 15 < MAX_LOAD.particles && load.plans * 15 < MAX_LOAD.plans, `${id}: ${JSON.stringify(load)}`);
    // (a count that is quick, and close to what the game makes)
    const real = generateCode(sanitizeScene(EXAMPLES.find((ex) => ex.id === id).scene).objects).particles;
    assert.ok(load.particles > real * 0.6 && load.particles < real * 1.6, `${id}: counted ${load.particles}, the game makes ${real}`);
  }
  assert.deepEqual(MAX_LOAD, { particles: 30000, plans: 3000 });
  // the count: points, times plays, times the stretches of the way; the keys and the repeats of the groups around count
  const load = (...objects) => loadOf(scene(...objects));
  assert.deepEqual(load(createObject('circle', { count: 40 })), { particles: 40, plans: 1 });
  assert.deepEqual(load(createObject('point', { repeat: 5, keys: [key(1), key(2)] })), { particles: 15, plans: 15 });
  assert.deepEqual(load(createGroup({ id: 'g', repeat: 3, keys: [key(1)] }), createObject('circle', { count: 10, parent: 'g', repeat: 2, keys: [key(1)] })), { particles: 180, plans: 18 });
  // (an object is played 400 times at most, however its groups repeat)
  assert.deepEqual(load(createGroup({ id: 'g', repeat: 60 }), createObject('point', { parent: 'g', repeat: 60 })), { particles: 400, plans: 400 });
  // the biggest shape it ever is counts: a key can make it a bigger one, deformers can add points
  assert.equal(load(createObject('circle', { count: 10, keys: [key(1, { form: { shape: 'star', count: 50 } })] })).particles, 100);
  const doubled = createObject('circle', { count: 10, deform: [newDeformer('mirror'), newDeformer('repeat')] });
  assert.equal(load(doubled).particles, formPoints(scene(doubled)[0]).length);
  assert.ok(load(doubled).particles > 10 && load(doubled).particles <= MAX_POINTS);
  // what a troll would send: short links, scenes without end
  const trolls = {
    'a ball of 600, played 60 times, with 12 keys': [createObject('sphere', { count: 600, repeat: 60, every: 0.05, keys: turning(12) })],
    '500 balls of 600': Array.from({ length: 500 }, () => createObject('sphere', { count: 600 })),
    'one particle, played 400 times along winding ways': [
      ...[4, 5, 4].map((repeat, i) => createGroup({ id: `g${i}`, parent: i ? `g${i - 1}` : null, repeat, every: 0.2, keys: turning(12) })),
      createObject('point', { parent: 'g2', repeat: 5, keys: turning(12) }),
    ],
    '300 particles in groups eight deep, each with 12 keys': [
      ...Array.from({ length: 8 }, (_, i) => createGroup({ id: `g${i}`, parent: i ? `g${i - 1}` : null, keys: turning(12) })),
      ...Array.from({ length: 300 }, () => createObject('point', { parent: 'g7' })),
    ],
    // (shapes with deformers are counted for real, but only as many as a scene ever has: after that each counts as the most it can be)
    '500 shapes that each say they are small': Array.from({ length: 500 }, (_, i) => createObject('circle', { count: 2, deform: [{ ...newDeformer('inflate'), amount: i / 1000 }], repeat: 2 })),
  };
  for (const [name, objects] of Object.entries(trolls)) {
    assert.ok(tooHeavy(scene(...objects)), name);
    const made = await makeLink({ objects });
    assert.ok(made.heavy, `${name}: the Share window does not offer such a link`);
    assert.ok(made.chars < 12000, `${name}: a link of ${made.chars} signs`);
    assert.equal(await refusal(payloadOf(made.url)), 'heavy', name);
  }
  // honest scenes, also big ones, are let in
  const honest = {
    'the dragon five times': Array.from({ length: 5 }, () => clone(EXAMPLES.find((ex) => ex.id === 'dragon').scene.objects)).flat().map((o, i) => ({ ...o, id: `${o.id}-${Math.floor(i / 84)}`, parent: o.parent ? `${o.parent}-${Math.floor(i / 84)}` : null })),
    '200 sparkles that each come 5 times and fly up': Array.from({ length: 200 }, (_, i) => createObject('point', { pos: [i % 20, 1, Math.floor(i / 20)], repeat: 5, keys: [key(1, { pos: [i % 20, 3, Math.floor(i / 20)] })] })),
    '40 shapes with deformers, each played 10 times': Array.from({ length: 40 }, (_, i) => createObject('star', { count: 20, deform: [newDeformer('twist'), { ...newDeformer('mirror'), offset: i / 100 }], repeat: 10 })),
    'a morph between two big shapes': [createObject('sphere', { count: 600, keys: [key(1), key(2, { form: { shape: 'cube', count: 600 } }), key(3, { form: { shape: 'heart', count: 400 } })] })],
  };
  for (const [name, objects] of Object.entries(honest)) {
    assert.ok(!tooHeavy(scene(...objects)), `${name}: ${JSON.stringify(loadOf(scene(...objects)))}`);
    assert.equal(await refusal(payloadOf((await makeLink({ objects })).url)), 'opened', name);
  }
});

// ---------------------------------------------------------------- the page

test('the page: Share has a button in sight, its window has what the script asks for, and a link asks nothing', () => {
  const html = fs.readFileSync(new URL('index.html', root), 'utf8');
  const app = fs.readFileSync(new URL('js/app.js', root), 'utf8');
  const ui = fs.readFileSync(new URL('js/share-ui.js', root), 'utf8');
  const readme = fs.readFileSync(new URL('README.md', root), 'utf8');
  // the button: in the top bar, next to Save, and it says what it does
  const bar = /<header class="topbar">([\s\S]*?)<\/header>/.exec(html)[1];
  assert.match(bar, /<button id="save"[^>]*>Save<\/button>\s*<button id="share" title="Share: [^"]+">Share<\/button>/);
  assert.ok(app.includes("$('#share').onclick = () => { share.show();"));
  // everything the script of the Share window asks the page for is in the page
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const asked = [...ui.matchAll(/\$\('#([\w-]+)'\)/g)].map((m) => m[1]);
  assert.ok(asked.length >= 7, `${asked.length} elements asked for`);
  for (const id of asked) assert.ok(ids.has(id), `#${id} is in the page`);
  assert.match(html, /<dialog id="share-dialog"[^>]*aria-labelledby="[\w-]+"/);
  // A link asks nothing: its scene is one more of My scenes, and the scene that was open stays there. (There
  // was a question once, "open the shared scene, or keep mine?": with My scenes nothing is replaced any more.)
  assert.ok(!/shared-(dialog|open|save|keep)/.test(html + ui + app), 'the question is gone from the page and from the scripts');
  assert.ok(!/\bask\(|\basking\b/.test(ui) && !app.includes('share.ask'));
  assert.match(html, /For whoever opens it, it is one more scene in My scenes\. Nothing of theirs is replaced\./);
  // while a window is open the keys of the page are not for the scene behind it
  assert.ok(app.includes("if (document.querySelector('dialog[open]')) return;"));
  // a scene from a link is stored only once the studio has worked it out (see `trial` in js/app.js) ...
  assert.match(app, /function store\(\) \{\n {2}if \(trial\) return;/);
  assert.match(app, /function endTrial\(failed\) \{[\s\S]*?if \(!kept\) \{\n {4}back\(\);[\s\S]*?\n {2}store\(\);/);
  // ... a link is looked at when the page starts and when it is put into the address later ...
  assert.ok(app.includes('let arrived = await share.arrival();'));
  assert.ok(app.includes("window.addEventListener('hashchange', async () => sharedArrived(await share.arrival()));"));
  // ... the same link a second time opens the scene it made the first time, instead of making one more ...
  assert.match(app, /const twin = sharedTwin\(arrived\.scene\);\n {2}if \(twin && openEntry\(twin\)\) \{\n {4}share\.forget\(\);/);
  assert.match(app, /const twin = sharedTwin\(arrived\.scene\);\n {4}if \(twin && openEntry\(twin, true\)\) \{\n {6}share\.forget\(\);/);
  // ... and when My scenes is full the link is not opened, and the address is clean again
  assert.match(app, /if \(!roomForScene\(\)\) \{\n {4}share\.forget\(\);\n {4}return;\n {2}\}\n {2}takeShared\(arrived\.scene\);/);
  // the scene of a link is a scene of its own (the one that was open is left as it is), and the scene it was
  // made of is remembered, so that the same link is known the next time
  assert.match(app, /function takeShared\(scene, quiet = false\) \{\n {2}const left = leaveScene\(\);\n {2}const back = hold\(\);\n {2}trial = \{ spent: 0, quiet, back, left \};\n[^\n]*\n {2}beginScene\('Shared scene', scene, \{ link: linkMark\(scene\), quiet \}\);/);
  // ... and one after the other: a second link waits until the first one is through its trial
  assert.match(app, /async function sharedArrived\(arrived, starting = false\) \{\n {2}if \(!arrived\) return;\n {2}if \(trial\) \{\n[^\n]*\n {4}setTimeout\(\(\) => sharedArrived\(arrived, starting\), 300\);\n {4}return;/);
  // the Share window is shut when another scene is opened: the link in it was for the one before
  assert.match(app, /function settle\(\) \{\n[^\n]*\n[^\n]*\n {2}if \(share\) share\.hide\(\);/);
  for (const opener of ['function beginScene(', 'function openEntry(', 'function deleteEntry(', 'function catchUp(']) {
    const at = app.indexOf(opener);
    assert.ok(at > 0 && /\n {2,6}settle\(\);/.test(app.slice(at, app.indexOf('\n}\n', at))), `${opener} settles the page`);
  }
  // the address is cleared with the browser's own history (in js/app.js `history` is the list of steps for Undo)
  assert.ok(ui.includes('window.history.replaceState('));
  assert.ok(!/[^.\w]history\.replaceState\(/.test(app));
  // nothing a link brings is ever written into the page as HTML, or run
  for (const [name, source] of [['js/app.js', app], ['js/share-ui.js', ui], ['js/share.js', fs.readFileSync(new URL('js/share.js', root), 'utf8')]]) {
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/.test(source), name);
  }
  // the README: the section, its picture, and the files
  assert.match(readme, /^### Share a link$/m);
  assert.ok(readme.includes('(docs/share.png)') && fs.statSync(new URL('docs/share.png', root)).size > 10000);
  for (const file of ['js/share.js', 'js/share-ui.js', 'tests/share.test.mjs']) assert.ok(readme.includes(`| \`${file}\` | `), `the README lists ${file}`);
  assert.ok(readme.replace(/\s+/g, ' ').includes(`One Discord message holds ${CHAT_CHARS.toLocaleString('en')}`));
});
