// Tests for js/library.js: My scenes, the scenes the browser keeps. The
// yardsticks:
//   - what was put in comes out again, whatever the browser's store does
//     (it may be full, refuse everything, or be written by another tab);
//   - the one scene a visitor had before there was a list is never lost;
//   - nothing that is read back from the store is trusted: not a name, not a
//     picture, not an id.
// (The My scenes window and what the page does when a scene is opened or left
// are tried in a browser, see the README; here only that the page has what
// they need.)
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createObject, createGroup, sanitizeScene } from '../js/scene.js';
import { sanitizeCode } from '../js/nodes.js';
import { EXAMPLES } from '../js/examples-data.js';
import {
  SCENE_KEY, LAST_KEY, OPEN_KEY, OLD_KEY, ADOPTED_KEY, MAX_SCENES, MAX_NAME, MAX_THUMB,
  cleanName, cleanThumb, fileNameOf, isAutoName, nameOfFile, markOf, whenText, createLibrary, browserStores,
} from '../js/library.js';

const root = new URL('../', import.meta.url);
const clone = (v) => JSON.parse(JSON.stringify(v));
const PICTURE = `data:image/jpeg;base64,${'QUJD'.repeat(40)}`;

/**
 * A store like the browser's localStorage. `room`: how many characters it
 * holds (keys and texts together); `locked`: it refuses everything, as in a
 * private window of some browsers.
 */
function fakeStorage({ room = Infinity, locked = false } = {}) {
  const map = new Map();
  const used = () => [...map].reduce((sum, [k, v]) => sum + k.length + v.length, 0);
  const storage = {
    room, locked, writes: 0,
    frozen: false, // it can be read, and nothing in it can be changed any more
    get length() { if (storage.locked) throw new Error('denied'); return map.size; },
    key(i) { if (storage.locked) throw new Error('denied'); return [...map.keys()][i] ?? null; },
    getItem(key) { if (storage.locked) throw new Error('denied'); return map.has(key) ? map.get(key) : null; },
    setItem(key, value) {
      if (storage.locked || storage.frozen) throw new Error('denied');
      const text = String(value);
      const after = used() - (map.has(key) ? key.length + map.get(key).length : 0) + key.length + text.length;
      if (after > storage.room) throw new Error('QuotaExceededError');
      storage.writes++;
      map.set(key, text);
    },
    removeItem(key) { if (storage.locked || storage.frozen) throw new Error('denied'); map.delete(key); },
    map,
  };
  return storage;
}

/** A clock that goes on by a second every time it is asked. */
const clock = (start = Date.UTC(2026, 10, 21, 12)) => { let t = start; return () => (t += 1000); };

/** A library on fresh stores: { library, local, session }. */
function fresh(options = {}) {
  const local = options.local || fakeStorage(options);
  const session = options.session || fakeStorage();
  return { library: createLibrary({ local, session, now: options.now || clock() }), local, session };
}

/** A scene as the page stores it. */
const record = (name, objects = [createObject('ring')], more = {}) => ({
  app: 'bloxd-particle-studio', version: 1, name, objects: clone(objects),
  export: { target: 'block', precision: 100, hideDist: 0, worldPos: [0, 0, 0] }, sky: false, snap: false, code: sanitizeCode(null),
  named: false, created: 1, updated: 1, thumb: '', link: '', ...more,
});

// ---------------------------------------------------------------- names, pictures, days

test('a name is one short line, whatever was typed or stored', () => {
  assert.equal(cleanName('  My   first\tone  '), 'My first one');
  assert.equal(cleanName('line\nbreak\r\nand\u2028more\u0000'), 'line break and more');
  assert.equal(cleanName('x'.repeat(100)).length, MAX_NAME);
  assert.equal(cleanName(`${'x'.repeat(MAX_NAME - 1)}   yz`), 'x'.repeat(MAX_NAME - 1), 'cut at the limit, and no space is left at the end');
  for (const nothing of ['', '   ', '\n\t', null, undefined, 7, {}, ['a'], true]) assert.equal(cleanName(nothing), '', JSON.stringify(nothing));
  // (letters of any language and signs stay as they are: a name is only ever shown as text)
  assert.equal(cleanName('Été <b>🔥</b> "x"'), 'Été <b>🔥</b> "x"');
});

test('a picture is a small image as a data URL, and nothing else', () => {
  for (const kind of ['jpeg', 'png', 'webp']) assert.equal(cleanThumb(`data:image/${kind};base64,AAAA`), `data:image/${kind};base64,AAAA`);
  assert.equal(cleanThumb(PICTURE), PICTURE);
  assert.equal(cleanThumb('data:image/png;base64,AAA='), 'data:image/png;base64,AAA=');
  const refused = [
    '', 'x', 'https://example.com/a.png', '//example.com/a.png', 'javascript:alert(1)', 'data:text/html;base64,AAAA',
    'data:image/svg+xml;base64,AAAA', 'data:image/png,AAAA', 'data:image/png;base64,', 'data:image/png;base64,AA AA',
    'data:image/png;base64,AAAA" onerror="alert(1)', ' data:image/png;base64,AAAA', 'data:image/png;base64,AAAA\n', 'DATA:image/png;base64,AAAA',
    `data:image/png;base64,${'A'.repeat(MAX_THUMB)}`, null, undefined, 7, {}, [PICTURE],
  ];
  for (const raw of refused) assert.equal(cleanThumb(raw), '', String(raw).slice(0, 50));
  assert.equal(cleanThumb(`data:image/png;base64,${'A'.repeat(MAX_THUMB - 22)}`).length, MAX_THUMB, 'up to the limit it is taken');
});

test('a scene is saved under its name, without the signs a file name cannot have', () => {
  assert.equal(fileNameOf('Fire ring'), 'Fire ring.json');
  assert.equal(fileNameOf('Fire: ring / v2?'), 'Fire ring v2.json');
  assert.equal(fileNameOf('a\\b/c:d*e?f"g<h>i|j'), 'a b c d e f g h i j.json');
  assert.equal(fileNameOf('  .hidden. '), 'hidden.json');
  for (const nothing of ['', '...', ' . ', '///', '?', null, undefined, 5]) assert.equal(fileNameOf(nothing), 'particle-scene.json', String(nothing));
  assert.ok(fileNameOf('x'.repeat(300)).length <= MAX_NAME + 5);
  assert.ok(!/[\\/:*?"<>|\u0000-\u001f]/.test(fileNameOf('a\u0001b\nc/../../etc')), 'no way out of the folder');
});

test('a file brings its name: the one inside, or else what the file is called', () => {
  assert.equal(nameOfFile({ name: 'Castle' }, 'whatever.json'), 'Castle');
  assert.equal(nameOfFile({}, 'My castle.json'), 'My castle');
  assert.equal(nameOfFile({}, 'My castle (3).json'), 'My castle', 'without the number a browser adds to a second download');
  assert.equal(nameOfFile({}, 'My castle (3) (1).json'), 'My castle');
  assert.equal(nameOfFile({}, 'tower.v2.json'), 'tower.v2');
  assert.equal(nameOfFile({ name: '  Two   words ' }, 'x.json'), 'Two words');
  // a name the studio gave by itself says nothing: then the file's name counts, and when that says nothing either, there is none
  assert.equal(nameOfFile({ name: 'Scene 3' }, 'Fire.json'), 'Fire');
  for (const [inside, outside] of [['Scene 3', 'Scene 3.json'], [undefined, 'particle-scene.json'], [undefined, 'particle-scene (2) (1).json'], ['scene', 'Particle-Scene.JSON'], [7, ''], [undefined, undefined]]) {
    assert.equal(nameOfFile({ name: inside }, outside), '', `${inside} / ${outside}`);
  }
  for (const raw of [null, undefined, 'text', 5, [1]]) assert.equal(nameOfFile(raw, 'Fire.json'), 'Fire');
  assert.ok(isAutoName('Scene') && isAutoName('Scene 12') && isAutoName(' scene  4 '));
  assert.ok(!isAutoName('Scene one') && !isAutoName('My scene 2') && !isAutoName('Scenes') && !isAutoName(''));
  assert.equal(nameOfFile({ name: 'x'.repeat(90) }, 'a.json').length, MAX_NAME);
});

test('"today", "yesterday", "5 days ago", then the day', () => {
  const now = new Date(2026, 10, 21, 15, 30).getTime();
  assert.equal(whenText(now, now), 'today');
  assert.equal(whenText(new Date(2026, 10, 21, 0, 0, 1).getTime(), now), 'today');
  assert.equal(whenText(new Date(2026, 10, 20, 23, 59, 59).getTime(), now), 'yesterday', 'a minute before midnight was yesterday');
  assert.equal(whenText(new Date(2026, 10, 20, 0, 0).getTime(), now), 'yesterday');
  assert.equal(whenText(new Date(2026, 10, 19, 23, 0).getTime(), now), '2 days ago');
  assert.equal(whenText(new Date(2026, 10, 16, 8, 0).getTime(), now), '5 days ago');
  assert.equal(whenText(new Date(2026, 9, 23, 8, 0).getTime(), now), '29 days ago');
  assert.equal(whenText(new Date(2026, 9, 22, 8, 0).getTime(), now), 'Oct 22, 2026');
  assert.equal(whenText(new Date(2025, 0, 3, 8, 0).getTime(), now), 'Jan 3, 2025');
  // (a clock that was set back: never "in the future")
  assert.equal(whenText(new Date(2026, 10, 25).getTime(), now), 'today');
  for (const none of [0, -5, NaN, Infinity, undefined, null, '5']) assert.equal(whenText(none, now), '', String(none));
});

test('the mark of a text is the same for the same text, and another one for another text', () => {
  assert.equal(markOf('abc'), markOf('abc'));
  assert.match(markOf(''), /^[a-z0-9]{2,20}$/);
  const texts = ['', 'a', 'b', 'ab', 'ba', 'abc', 'abd', 'a'.repeat(1000), `${'a'.repeat(999)}b`, `b${'a'.repeat(999)}`];
  for (const example of EXAMPLES) texts.push(JSON.stringify(example.scene), JSON.stringify(example.scene).replace('1', '2'));
  assert.equal(new Set(texts.map(markOf)).size, texts.length);
  for (const text of texts) assert.ok(markOf(text).length <= 20, 'short enough to be kept whole');
});

// ---------------------------------------------------------------- scenes go in and come out

test('a scene that is kept comes back as it was, and the list knows it', () => {
  const { library, local } = fresh();
  assert.deepEqual(library.list(), []);
  assert.equal(library.pointer(), null);
  const id = library.newId();
  const fire = record('Fire', [createGroup({ id: 'g' }), createObject('ring', { parent: 'g' }), createObject('point', { parent: 'g' })], { updated: 50, created: 40, thumb: PICTURE, named: true });
  assert.equal(library.write(id, fire), true);
  assert.deepEqual(library.read(id), fire);
  assert.deepEqual(library.list(), [{ id, name: 'Fire', created: 40, updated: 50, count: 2, thumb: PICTURE, named: true, link: '' }], 'the group is not counted as an object');
  assert.deepEqual([...local.map.keys()], [`${SCENE_KEY}${id}`], 'one entry of its own, and no list beside it');
  // written again: the same entry
  library.write(id, { ...fire, name: 'Fire 2' });
  assert.equal(library.list().length, 1);
  assert.equal(library.list()[0].name, 'Fire 2');
  library.remove(id);
  assert.equal(library.read(id), null);
  assert.deepEqual(library.list(), []);
  assert.equal(local.map.size, 0);
  library.remove(id); // (a second time does no harm)
});

test('every example, kept and read back, is the scene it was', () => {
  const { library } = fresh();
  for (const example of EXAMPLES) {
    const objects = sanitizeScene(clone(example.scene)).objects;
    const id = library.newId();
    assert.ok(library.write(id, record(example.name, objects, { thumb: PICTURE, link: 'abc', named: true })));
    // (what the list adds to a saved file does not get in the way of reading it as a scene)
    assert.deepEqual(sanitizeScene(library.read(id)).objects, objects, example.name);
    assert.deepEqual(sanitizeCode(library.read(id).code), sanitizeCode(null));
  }
  assert.deepEqual(library.list().map((entry) => entry.name).sort(), EXAMPLES.map((example) => example.name).sort());
});

test('the list: the scene changed last comes first', () => {
  const { library } = fresh();
  const ids = ['Old', 'Newest', 'Middle', 'Twin a', 'Twin b'].map(() => library.newId());
  library.write(ids[0], record('Old', undefined, { updated: 100, created: 100 }));
  library.write(ids[1], record('Newest', undefined, { updated: 900, created: 50 }));
  library.write(ids[2], record('Middle', undefined, { updated: 500, created: 500 }));
  library.write(ids[3], record('Twin a', undefined, { updated: 300, created: 10 }));
  library.write(ids[4], record('Twin b', undefined, { updated: 300, created: 20 }));
  assert.deepEqual(library.list().map((entry) => entry.name), ['Newest', 'Middle', 'Twin b', 'Twin a', 'Old']);
  // without a time (an entry somebody wrote by hand) it is last, and the order is the same every time
  library.write(library.newId(), record('No time', undefined, { updated: 'yesterday', created: null }));
  assert.equal(library.list().at(-1).name, 'No time');
  assert.deepEqual(library.list().at(-1).updated, 0);
  assert.deepEqual(library.list(), library.list());
});

test('ids: every one is new, and nothing but an id is taken for one', () => {
  const { library, local } = fresh({ now: () => 1000 }); // (a clock that stands still: ids differ all the same)
  const ids = new Set();
  for (let i = 0; i < 500; i++) ids.add(library.newId());
  assert.equal(ids.size, 500);
  for (const id of ids) assert.match(id, /^[a-z0-9]{6,40}$/);
  const scene = record('x');
  for (const bad of ['', 'A', 'a b', 'a.b', '../x', 'a/b', '__proto__', 'x'.repeat(41), null, undefined, 5, {}, ['a']]) {
    assert.equal(library.write(bad, scene), false, String(bad));
    assert.equal(library.read(bad), null, String(bad));
    library.remove(bad);
    library.point(bad);
  }
  assert.equal(local.map.size, 0, 'nothing was written under any of them');
  // and only a scene is written: something with a list of objects
  for (const bad of [null, undefined, 'text', 5, [], {}, { objects: 'many' }, { objects: null }]) assert.equal(library.write(library.newId(), bad), false, JSON.stringify(bad));
  assert.equal(local.map.size, 0);
});

test('what else is in the store is neither listed nor touched', () => {
  const { library, local } = fresh();
  const others = {
    'bloxd-particle-studio.ui': '{"cat-add":true}',
    'some-other-app': '{"objects":[]}',
    [`${SCENE_KEY}`]: JSON.stringify(record('no id')),
    [`${SCENE_KEY}Not An Id`]: JSON.stringify(record('bad id')),
    [`${SCENE_KEY}broken`]: '{"objects":[',
    [`${SCENE_KEY}empty`]: '',
    [`${SCENE_KEY}text`]: '"just a text"',
    [`${SCENE_KEY}list`]: '[1,2,3]',
    [`${SCENE_KEY}null`]: 'null',
    [`${SCENE_KEY}noobjects`]: '{"name":"x"}',
    [`x${SCENE_KEY}abc`]: JSON.stringify(record('other prefix')),
  };
  for (const [key, text] of Object.entries(others)) local.setItem(key, text);
  assert.deepEqual(library.list(), []);
  for (const id of ['broken', 'empty', 'text', 'list', 'null', 'noobjects']) assert.equal(library.read(id), null, id);
  assert.equal(library.pointer(), null);
  assert.equal(library.nameFor('Scene', { numbered: true }), 'Scene 1');
  const id = library.newId();
  library.write(id, record('Mine'));
  assert.deepEqual(library.list().map((entry) => entry.name), ['Mine']);
  library.remove(id);
  // deleting something that is no id deletes nothing
  for (const bad of ['', 'Not An Id', '../x']) library.remove(bad);
  // (an entry that cannot be read may be a scene of a later studio: it stays where it is)
  for (const [key, text] of Object.entries(others)) assert.equal(local.getItem(key), text, key);
});

test('nothing that is read back from the store is trusted', () => {
  const { library, local } = fresh();
  local.setItem(`${SCENE_KEY}evil`, JSON.stringify({
    name: `<img src=x onerror=alert(1)>\n${'y'.repeat(200)}`, objects: [{ shape: 'group' }, null, 5, 'x', { shape: 'ring' }, {}],
    thumb: 'javascript:alert(1)', updated: '<script>', created: {}, named: 'yes', link: 'x'.repeat(500),
  }));
  local.setItem(`${SCENE_KEY}svg`, JSON.stringify({ name: 7, objects: [], thumb: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', updated: 5 }));
  local.setItem(`${SCENE_KEY}huge`, JSON.stringify({ name: 'Huge', objects: [], thumb: `data:image/png;base64,${'A'.repeat(MAX_THUMB)}`, updated: 4 }));
  const [svg, huge, evil] = library.list();
  assert.deepEqual(svg, { id: 'svg', name: 'Scene', created: 0, updated: 5, count: 0, thumb: '', named: false, link: '' });
  assert.equal(huge.thumb, '', 'a picture that is too big is not shown');
  assert.equal(evil.name.length, MAX_NAME);
  assert.ok(!evil.name.includes('\n'));
  assert.equal(evil.thumb, '');
  assert.equal(evil.updated, 0);
  assert.equal(evil.created, 0);
  assert.equal(evil.named, false);
  assert.equal(evil.link.length, 20);
  assert.equal(evil.count, 2, 'only what is an object, and no group, is counted');
});

// ---------------------------------------------------------------- names

test('a name the studio gives is one no other scene has', () => {
  const { library } = fresh();
  assert.equal(library.nameFor('Scene', { numbered: true }), 'Scene 1');
  assert.equal(library.nameFor('Dragon'), 'Dragon');
  assert.equal(library.nameFor(''), 'Scene');
  assert.equal(library.nameFor('  Two   words '), 'Two words');
  const ids = {};
  for (const name of ['Scene 1', 'Scene 2', 'Scene 4', 'Dragon', 'dragon 2', 'Shared scene']) { ids[name] = library.newId(); library.write(ids[name], record(name)); }
  assert.equal(library.nameFor('Scene', { numbered: true }), 'Scene 3', 'the first number that is free');
  assert.equal(library.nameFor('Dragon'), 'Dragon 3', 'capital letters make no difference');
  assert.equal(library.nameFor('DRAGON'), 'DRAGON 3');
  assert.equal(library.nameFor('Shared scene'), 'Shared scene 2');
  assert.equal(library.nameFor('Campfire'), 'Campfire');
  // the scene the name is for is not in its own way
  assert.equal(library.nameFor('Dragon', { except: ids.Dragon }), 'Dragon');
  assert.equal(library.nameFor('Scene 4', { except: ids['Scene 4'] }), 'Scene 4');
  // a long name makes room for its number
  const long = 'x'.repeat(MAX_NAME);
  library.write(library.newId(), record(long));
  assert.equal(library.nameFor(long), `${'x'.repeat(MAX_NAME - 2)} 2`);
  assert.equal(library.nameFor(long).length, MAX_NAME);
  // many scenes of one name
  for (let n = 3; n <= 12; n++) library.write(library.newId(), record(`Dragon ${n}`));
  assert.equal(library.nameFor('Dragon'), 'Dragon 13');
});

test('a scene gets another name, and keeps everything else', () => {
  const { library } = fresh();
  const id = library.newId();
  const before = record('Scene 1', [createObject('heart')], { thumb: PICTURE, updated: 77, created: 70 });
  library.write(id, before);
  assert.equal(library.rename(id, '  My   heart '), 'My heart');
  assert.deepEqual(library.read(id), { ...before, name: 'My heart', named: true }, 'only the name is another one: not even the time it was changed');
  // nothing typed: the name stays
  for (const nothing of ['', '   ', null, undefined, 5]) assert.equal(library.rename(id, nothing), 'My heart');
  assert.equal(library.read(id).name, 'My heart');
  assert.equal(library.rename(id, 'x'.repeat(99)).length, MAX_NAME);
  // two scenes may have the same name when somebody wants that
  const other = library.newId();
  library.write(other, record('Other'));
  assert.equal(library.rename(other, 'My heart'), 'My heart');
  // a scene that is not there
  assert.equal(library.rename('nosuchscene', 'x'), null);
  assert.equal(library.read('nosuchscene'), null);
});

test('a copy is a scene of its own', () => {
  const { library } = fresh();
  const id = library.newId();
  const original = record('Fire', [createObject('ring'), createObject('point')], { thumb: PICTURE, updated: 5, created: 5, link: 'abc' });
  library.write(id, original);
  const copy = library.duplicate(id);
  assert.ok(copy && copy !== id);
  const made = library.read(copy);
  assert.equal(made.name, 'Fire copy');
  assert.equal(made.named, true, 'a copy is somebody\'s work: it is kept');
  assert.equal(made.link, '', 'and it is not the scene a link brought');
  assert.deepEqual(made.objects, original.objects);
  assert.equal(made.thumb, PICTURE);
  assert.ok(made.updated > original.updated && made.created === made.updated, 'made now');
  assert.deepEqual(library.list().map((entry) => entry.name), ['Fire copy', 'Fire'], 'and it is first in the list');
  assert.deepEqual(library.read(id), original, 'the original is untouched');
  // changing the copy does not change the original
  library.write(copy, { ...made, objects: [] });
  assert.equal(library.read(id).objects.length, 2);
  assert.equal(library.read(library.duplicate(id)).name, 'Fire copy 2');
  assert.equal(library.read(library.duplicate(copy)).name, 'Fire copy copy');
  assert.equal(library.duplicate('nosuchscene'), null);
});

test('the list holds 200 scenes, and says so before it is full', () => {
  const { library } = fresh();
  assert.equal(MAX_SCENES, 200);
  let last = '';
  for (let i = 0; i < MAX_SCENES - 1; i++) { last = library.newId(); library.write(last, record(`Scene ${i + 1}`, [])); }
  assert.equal(library.hasRoom(), true);
  const copy = library.duplicate(last);
  assert.ok(copy);
  assert.equal(library.list().length, MAX_SCENES);
  assert.equal(library.hasRoom(), false);
  assert.equal(library.duplicate(last), null, 'no copy when it is full');
  assert.equal(library.list().length, MAX_SCENES);
  // a scene that is there can still be written (and so can the one that is open)
  assert.equal(library.write(last, record('Changed', [])), true);
  library.remove(copy);
  assert.equal(library.hasRoom(), true);
});

// ---------------------------------------------------------------- which scene is open

test('the page opens the scene this tab had, else the one worked on last, else the newest', () => {
  const local = fakeStorage();
  const now = clock();
  const tabA = fakeStorage();
  const a = createLibrary({ local, session: tabA, now });
  const [one, two, three] = [a.newId(), a.newId(), a.newId()];
  a.write(one, record('One', undefined, { updated: 10 }));
  a.write(two, record('Two', undefined, { updated: 30 }));
  a.write(three, record('Three', undefined, { updated: 20 }));
  assert.equal(a.pointer(), two, 'nothing was pointed at: the one changed last');
  a.point(one);
  assert.equal(a.pointer(), one);
  assert.equal(local.getItem(LAST_KEY), one);
  assert.equal(tabA.getItem(OPEN_KEY), one);
  // a second tab starts with the scene worked on last, then goes its own way
  const tabB = fakeStorage();
  const b = createLibrary({ local, session: tabB, now });
  assert.equal(b.pointer(), one);
  b.point(three);
  assert.equal(b.pointer(), three);
  assert.equal(a.pointer(), one, 'the first tab still has its own scene: a reload brings it back');
  // a third tab: the one worked on last, by whichever tab
  assert.equal(createLibrary({ local, session: fakeStorage(), now }).pointer(), three);
  // the same tab after a reload (its own store is still there)
  assert.equal(createLibrary({ local, session: tabA, now }).pointer(), one);
  // the scene of a tab was deleted in another tab: the one worked on last, and when that is gone too, the newest
  b.remove(one);
  assert.equal(a.pointer(), three);
  b.remove(three);
  assert.equal(a.pointer(), two);
  assert.equal(b.pointer(), two);
  b.remove(two);
  assert.equal(a.pointer(), null);
  // a pointer that is no id, or points at something that is no scene
  local.setItem(LAST_KEY, '../../x');
  tabA.setItem(OPEN_KEY, '{"a":1}');
  assert.equal(a.pointer(), null);
  local.setItem(`${SCENE_KEY}junk`, 'not json');
  local.setItem(LAST_KEY, 'junk');
  assert.equal(a.pointer(), null);
});

test('two tabs: what one writes the other reads, and neither needs a list', () => {
  const local = fakeStorage();
  const now = clock();
  const a = createLibrary({ local, session: fakeStorage(), now });
  const b = createLibrary({ local, session: fakeStorage(), now });
  const mine = a.newId();
  const yours = b.newId();
  assert.notEqual(mine, yours);
  a.write(mine, record('From a', undefined, { updated: 1 }));
  b.write(yours, record('From b', undefined, { updated: 2 }));
  assert.deepEqual(a.list().map((entry) => entry.name), ['From b', 'From a']);
  assert.deepEqual(b.list(), a.list());
  b.rename(mine, 'Renamed by b');
  assert.equal(a.read(mine).name, 'Renamed by b');
  a.remove(yours);
  assert.equal(b.read(yours), null);
  assert.equal(b.list().length, 1);
  // names given at the same moment in two tabs do not clash more than once
  assert.equal(a.nameFor('Scene', { numbered: true }), 'Scene 1');
  a.write(a.newId(), record('Scene 1'));
  assert.equal(b.nameFor('Scene', { numbered: true }), 'Scene 2');
});

// ---------------------------------------------------------------- the scene from before there was a list

test('the one scene a visitor had before becomes Scene 1 of the list', () => {
  const { library, local } = fresh();
  assert.equal(library.adopt(), null, 'nothing there: nothing happens');
  assert.equal(local.map.size, 0);
  // what the studio stored before there was a list: a saved file, without a name
  const old = { app: 'bloxd-particle-studio', version: 1, objects: sanitizeScene(clone(EXAMPLES[0].scene)).objects, export: { target: 'world', precision: 10, hideDist: 30, worldPos: [1, 2, 3] }, sky: true, snap: true, code: { ...sanitizeCode(null), own: '// mine' } };
  local.setItem(OLD_KEY, JSON.stringify(old));
  const id = library.adopt();
  assert.ok(id);
  const { name, named, created, updated, ...rest } = library.read(id);
  assert.deepEqual(rest, old, 'everything it held is there');
  assert.equal(name, 'Scene 1');
  assert.equal(named, false);
  assert.ok(created > 0 && created === updated);
  assert.equal(local.getItem(OLD_KEY), null, 'and the old place is empty');
  assert.equal(library.pointer(), id, 'it is the scene the page opens');
  assert.equal(library.adopt(), null, 'a second time: nothing');
  assert.equal(library.list().length, 1);
});

test('an old copy of the page in another tab keeps writing to the old place: nothing is taken twice, and nothing is lost', () => {
  const { library, local } = fresh();
  const first = JSON.stringify({ objects: [createObject('ring', { id: 'a' })] });
  const second = JSON.stringify({ objects: [createObject('ring', { id: 'a' }), createObject('heart', { id: 'b' })] });
  local.setItem(OLD_KEY, first);
  const one = library.adopt();
  assert.ok(one);
  // the old page writes the same scene again (it stores on every click)
  local.setItem(OLD_KEY, first);
  assert.equal(library.adopt(), null);
  assert.equal(library.list().length, 1);
  assert.equal(local.getItem(OLD_KEY), null);
  // ... then somebody goes on working there: that is another scene, and it is kept as one more
  local.setItem(OLD_KEY, second);
  const two = library.adopt();
  assert.ok(two && two !== one);
  assert.deepEqual(library.list().map((entry) => [entry.name, entry.count]), [['Scene 2', 2], ['Scene 1', 1]]);
  local.setItem(OLD_KEY, second);
  assert.equal(library.adopt(), null);
  assert.equal(library.list().length, 2);
  // the scene that was adopted was changed in the meantime (or deleted): the old text is still not taken again
  library.write(one, { ...library.read(one), objects: [] });
  library.remove(two);
  local.setItem(OLD_KEY, second);
  assert.equal(library.adopt(), null);
  assert.equal(library.list().length, 1);
  assert.equal(local.getItem(ADOPTED_KEY), markOf(second));
});

test('the old place holds something that is no scene: it is emptied, and the list stays as it is', () => {
  for (const junk of ['', 'not json', 'null', '5', '"text"', '[1,2]', '{}', '{"objects":"many"}', '{"objects":null}']) {
    const { library, local } = fresh();
    local.setItem(OLD_KEY, junk);
    assert.equal(library.adopt(), null, junk);
    assert.equal(local.getItem(OLD_KEY), null, junk);
    assert.deepEqual(library.list(), [], junk);
  }
  // an empty scene is a scene (somebody pressed New before they left)
  const { library, local } = fresh();
  local.setItem(OLD_KEY, '{"objects":[]}');
  assert.ok(library.adopt());
  assert.equal(library.list()[0].count, 0);
});

test('the old scene is adopted into a store that is nearly full, or stays where it is', () => {
  const old = JSON.stringify({ objects: sanitizeScene(clone(EXAMPLES[0].scene)).objects });
  // room for the scene once, and a little more: its old place has to be emptied to make room for the new one
  {
    const local = fakeStorage({ room: old.length + 400 });
    local.setItem(OLD_KEY, old);
    const library = createLibrary({ local, session: fakeStorage(), now: clock() });
    const id = library.adopt();
    assert.ok(id);
    assert.equal(local.getItem(OLD_KEY), null);
    assert.ok(local.getItem(`${SCENE_KEY}${id}`), 'the browser has it in its new place');
    assert.equal(library.safe(), true);
  }
  // no room at all for the little more the new entry needs: the scene is in the list for this visit, and still in its old place for the next
  {
    const local = fakeStorage({ room: OLD_KEY.length + old.length + 10 });
    local.setItem(OLD_KEY, old);
    const library = createLibrary({ local, session: fakeStorage(), now: clock() });
    const id = library.adopt();
    assert.ok(id);
    assert.deepEqual(sanitizeScene(library.read(id)).objects, JSON.parse(old).objects, 'it can be worked on');
    assert.equal(local.getItem(OLD_KEY), old, 'and nothing is lost when the page is closed');
    assert.equal(local.getItem(`${SCENE_KEY}${id}`), null);
    // the next visit tries again, and makes no second scene of it once there is room
    local.room = Infinity;
    const next = createLibrary({ local, session: fakeStorage(), now: clock() });
    assert.ok(next.adopt());
    assert.equal(next.list().length, 1);
    assert.equal(local.getItem(OLD_KEY), null);
  }
  // a list that is full: the old scene waits in its old place
  {
    const { library, local } = fresh();
    for (let i = 0; i < MAX_SCENES; i++) library.write(library.newId(), record(`Scene ${i + 1}`, []));
    local.setItem(OLD_KEY, old);
    assert.equal(library.adopt(), null);
    assert.equal(local.getItem(OLD_KEY), old);
    library.remove(library.list()[0].id);
    assert.ok(library.adopt());
    assert.equal(local.getItem(OLD_KEY), null);
  }
});

// ---------------------------------------------------------------- a browser that keeps nothing, or is full

test('a browser that refuses to store anything: everything works until the page is closed', () => {
  for (const [what, stores] of [
    ['stores that throw', { local: fakeStorage({ locked: true }), session: fakeStorage({ locked: true }) }],
    ['no stores at all', { local: null, session: null }],
    ['nothing handed over', undefined],
  ]) {
    const library = createLibrary(stores ? { ...stores, now: clock() } : undefined);
    assert.equal(library.persistent(), false, what);
    assert.equal(library.adopt(), null, what);
    assert.deepEqual(library.list(), [], what);
    assert.equal(library.pointer(), null, what);
    const id = library.newId();
    assert.equal(library.write(id, record('Kept in memory', undefined, { updated: 9 })), false, `${what}: write says that the browser does not have it`);
    assert.equal(library.read(id).name, 'Kept in memory', what);
    assert.deepEqual(library.list().map((entry) => entry.name), ['Kept in memory'], what);
    library.point(id);
    assert.equal(library.pointer(), id, what);
    assert.equal(library.rename(id, 'Another name'), 'Another name', what);
    const copy = library.duplicate(id);
    assert.equal(library.read(copy).name, 'Another name copy', what);
    assert.equal(library.list().length, 2, what);
    assert.equal(library.nameFor('Another name'), 'Another name 2', what);
    library.remove(id);
    assert.equal(library.read(id), null, what);
    assert.equal(library.list().length, 1, what);
    assert.equal(library.safe(), false, what);
  }
});

test('a store that is full: the browser keeps the last scene that fitted, and the page keeps the newer one', () => {
  const small = record('Small', [createObject('ring')], { updated: 1 });
  const big = record('Small', Array.from({ length: 30 }, () => createObject('ring')), { updated: 2 });
  const local = fakeStorage({ room: JSON.stringify(small).length + 600 });
  const { library } = fresh({ local });
  assert.equal(library.persistent(), true);
  const id = library.newId();
  assert.equal(library.write(id, small), true);
  assert.equal(library.safe(), true);
  // it grows beyond what fits
  assert.equal(library.write(id, big), false);
  assert.equal(library.safe(), false);
  assert.equal(library.read(id).objects.length, 30, 'the page works with the newer one');
  assert.equal(library.list()[0].count, 30);
  assert.equal(JSON.parse(local.getItem(`${SCENE_KEY}${id}`)).objects.length, 1, 'the browser still has the one that fitted: a closed page loses the last changes, not the scene');
  assert.equal(library.persistent(), true, 'full is not the same as refusing everything');
  // it is made smaller again: it fits, and all is well
  assert.equal(library.write(id, small), true);
  assert.equal(library.safe(), true);
  assert.equal(JSON.parse(local.getItem(`${SCENE_KEY}${id}`)).objects.length, 1);
  // a second scene that does not fit is in the list all the same ...
  const other = library.newId();
  assert.equal(library.write(other, { ...big, name: 'Other' }), false);
  assert.deepEqual(library.list().map((entry) => entry.name), ['Other', 'Small']);
  assert.equal(local.getItem(`${SCENE_KEY}${other}`), null);
  // ... and once a scene is deleted there is room: what waited is with the browser now
  const filler = library.newId();
  local.room = Infinity;
  library.write(filler, record('Filler', [], { updated: 0 }));
  assert.equal(library.safe(), false, 'writing something else does not write what waits');
  library.remove(filler);
  assert.equal(library.safe(), true);
  assert.equal(JSON.parse(local.getItem(`${SCENE_KEY}${other}`)).name, 'Other');
});

test('a scene that only the page has can be deleted and written again without a trace', () => {
  const local = fakeStorage({ room: 300 });
  const { library } = fresh({ local });
  const id = library.newId();
  assert.equal(library.write(id, record('Too big for this store', Array.from({ length: 5 }, () => createObject('ring')))), false);
  assert.equal(library.read(id).name, 'Too big for this store');
  library.remove(id);
  assert.equal(library.read(id), null);
  assert.deepEqual(library.list(), []);
  assert.equal(library.safe(), true, 'nothing waits any more');
  assert.equal(local.map.size, 0);
});

test('a store that lets nothing go any more: what was deleted stays deleted for the page', () => {
  const { library, local } = fresh();
  const [one, two] = [library.newId(), library.newId()];
  library.write(one, record('One', undefined, { updated: 2 }));
  library.write(two, record('Two', undefined, { updated: 1 }));
  library.point(one);
  local.frozen = true;
  library.remove(one);
  assert.equal(library.read(one), null);
  assert.deepEqual(library.list().map((entry) => entry.name), ['Two']);
  assert.equal(library.pointer(), two, 'the page does not open what was deleted');
  assert.ok(local.getItem(`${SCENE_KEY}${one}`), '(the browser still has it: it could not be taken out)');
  // written again, it is there again (in memory, as the store takes nothing)
  assert.equal(library.write(one, record('One again', undefined, { updated: 3 })), false);
  assert.equal(library.read(one).name, 'One again');
  assert.deepEqual(library.list().map((entry) => entry.name), ['One again', 'Two']);
  // and when the store works again, deleting takes it out for good
  local.frozen = false;
  library.remove(one);
  assert.equal(local.getItem(`${SCENE_KEY}${one}`), null);
  assert.deepEqual(library.list().map((entry) => entry.name), ['Two']);
});

test('the stores of the page: missing or forbidden ones are null, and the library works without them', () => {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    globalThis.window = { localStorage: fakeStorage(), sessionStorage: undefined };
    const stores = browserStores();
    assert.ok(stores.local && stores.session === null);
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: Object.defineProperties({}, {
        localStorage: { get() { throw new Error('SecurityError'); } },
        sessionStorage: { get() { throw new Error('SecurityError'); } },
      }),
    });
    assert.deepEqual(browserStores(), { local: null, session: null });
    assert.equal(createLibrary(browserStores()).persistent(), false);
  } finally {
    if (had) Object.defineProperty(globalThis, 'window', had);
    else delete globalThis.window;
  }
});

// ---------------------------------------------------------------- the page

test('the page: My scenes has a button in sight, and its window has what the scripts ask for', () => {
  const html = fs.readFileSync(new URL('index.html', root), 'utf8');
  const css = fs.readFileSync(new URL('css/style.css', root), 'utf8');
  const app = fs.readFileSync(new URL('js/app.js', root), 'utf8');
  const ui = fs.readFileSync(new URL('js/library-ui.js', root), 'utf8');
  const lib = fs.readFileSync(new URL('js/library.js', root), 'utf8');
  const readme = fs.readFileSync(new URL('README.md', root), 'utf8');
  // the button: in the top bar, before New, and it says what it does (in a narrow window with one word)
  const bar = /<header class="topbar">([\s\S]*?)<\/header>/.exec(html)[1];
  assert.match(bar, /<button id="scenes" title="My scenes: [^"]+"><span class="long">My scenes<\/span><span class="short">Scenes<\/span><\/button>\s*<button id="new" title="[^"]*My scenes[^"]*">New<\/button>/);
  assert.match(css, /\.topbar \.short \{ display: none; \}/);
  assert.match(css, /#scenes \.long \{ display: none; \}\s*#scenes \.short \{ display: inline; \}/);
  assert.ok(app.includes("$('#scenes').onclick = () => { endTrialNow(); stopPlaying(); scenesWindow.show();"));
  // the window, and everything its script asks the page for
  assert.match(html, /<dialog id="scenes-dialog"[^>]*aria-labelledby="scenes-title"/);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const asked = [...ui.matchAll(/\$\('#([\w-]+)'\)/g)].map((m) => m[1]);
  assert.ok(asked.length >= 3, `${asked.length} elements asked for`);
  for (const id of [...asked, 'scenes-title', 'scene-name']) assert.ok(ids.has(id), `#${id} is in the page`);
  // every class the cards are made of has its look
  for (const name of ['scene-grid', 'scene-card', 'scene-pic', 'scene-name', 'scene-meta', 'scene-tools', 'scene-new']) {
    assert.ok(css.includes(`.${name}`), `.${name} is in the style sheet`);
    if (name !== 'scene-grid') assert.ok(ui.includes(name), `${name} is used by the window`);
  }
  // names and pictures come from the browser's store, which other pages of the site can write: they are only ever
  // put into the page as text and as the address of an image, never as HTML, and nothing of them is run
  for (const [name, source] of [['js/library.js', lib], ['js/library-ui.js', ui]]) {
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|setAttribute\('on|\.srcdoc/.test(source), name);
  }
  assert.ok(lib.includes("const PICTURE = /^data:image\\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;"), 'only a small picture is a picture (no SVG, which can hold scripts)');
  // the scene the page starts with comes out of My scenes, after the scene from before there was a list is in it ...
  assert.match(app, /function loadStored\(\) \{\n {2}try \{\n {4}library\.adopt\(\);[^\n]*\n {4}const id = library\.pointer\(\);/);
  assert.ok(!app.includes('bloxd-particle-studio.v1') && !/localStorage/.test(app), 'the page itself does not write to the store any more: js/library.js does');
  // ... every change goes to the entry of the scene that is open, with its name and its picture ...
  assert.match(app, /const kept = library\.write\(current\.id, \{\n {4}\.\.\.fileData\(\), named: current\.named, created: current\.created, updated: current\.updated, thumb: current\.thumb, link: current\.link,\n {2}\}\);/);
  assert.match(app, /name: current\.name, objects: state\.objects,/);
  // ... a tab that was left behind does not put its old copy over what another tab made of the scene: with
  // nothing new of its own it writes nothing, and with something new its scene becomes one of its own ...
  assert.match(app, /const moved = current\.seen !== null && \(!there \|\| stampOf\(there\) !== current\.seen\);\n {2}if \(moved && !changed\) \{\n {4}library\.point\(current\.id\);\n {4}return;\n {2}\}\n {2}if \(moved && there\) \{\n {4}const was = current\.name;\n {4}Object\.assign\(current, \{ id: library\.newId\(\), name: library\.nameFor\(was\),/);
  assert.ok(app.includes("window.addEventListener('focus', catchUp);"));
  // ... and New, Open, an example and a share link each leave the scene that is open where it is, in My scenes
  for (const maker of ['function newScene() {', 'async function openFile(file) {', 'function openExample(example) {', 'function takeShared(scene, quiet = false) {']) {
    const at = app.indexOf(maker);
    assert.ok(at > 0, maker);
    const body = app.slice(at, app.indexOf('\n}\n', at));
    assert.match(body, /const left = leaveScene\(\);[\s\S]*beginScene\(/, maker);
  }
  // (a scene nobody worked on is not kept; one that another tab has worked on in the meantime is)
  assert.match(app, /function leaveScene\(\) \{\n {2}endTrialNow\(\);\n {2}stopPlaying\(\);\n {2}if \(nobodys\(\)\) \{\n[^\n]*\n {4}const there = library\.read\(current\.id\);\n {4}if \(there && stampOf\(there\) === current\.seen\) library\.remove\(current\.id\);\n {4}return '';\n {2}\}\n {2}keepScene\(\);/);
  // what there is to say while the window is open is said in the window: a toast lies under it, where nobody reads it
  assert.match(app, /function notice\(message, kind = ''\) \{\n {2}if \(!scenesWindow \|\| !scenesWindow\.say\(message, kind\)\) toast\(message, kind\);\n\}/);
  assert.match(ui, /say\(text, kind = ''\) \{\n {6}if \(!dialog\.open && !opening\) return false;\n {6}said = \{ text, kind \};/);
  for (const words of ['My scenes is full: it holds ${MAX_SCENES} scenes.', 'This scene could not be opened:', 'was changed in another tab. Here it is as it is now.', 'was changed in another tab. What you have here is kept as', "'This shared scene is open already.'"]) {
    const line = app.split('\n').find((text) => text.includes(words));
    assert.ok(line && /^\s*notice\(/.test(line), words);
  }
  // a saved file is called what the scene is called
  assert.ok(app.includes("const saveFile = () => download(fileNameOf(current.name), JSON.stringify(fileData(), null, 1), 'application/json');"));
  // the README: the section, its picture, and the files
  assert.match(readme, /^### My scenes$/m);
  assert.ok(readme.includes('(docs/scenes.png)') && fs.statSync(new URL('docs/scenes.png', root)).size > 10000);
  for (const file of ['js/library.js', 'js/library-ui.js', 'tests/library.test.mjs']) assert.ok(readme.includes(`| \`${file}\` | `), `the README lists ${file}`);
  assert.ok(readme.includes(`${MAX_SCENES} scenes`), 'the README says how many scenes are kept');
});
