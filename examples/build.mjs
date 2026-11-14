// Makes js/examples-data.js: the scenes behind the Examples button of the
// studio. Also writes examples/dragon.json (the dragon as a scene file).
//
//   node examples/build.mjs
//
// The campfire and the portal are put together the way a user would do it in
// the studio: objects, groups, keys with colours and sizes, Repeat, a mirror
// copy and the ready-made moves. The dragon comes from examples/dragon.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createObject, sanitizeScene } from '../js/scene.js';
import { groupNodes, mirrorNodes } from '../js/edits.js';
import { applyMove } from '../js/moves.js';
import { buildDragon, dragonFile } from './dragon.mjs';

/** A scene under construction. Objects are found by their name. */
function builder() {
  let objects = [];
  const called = (name) => objects.find((o) => o.name === name);
  const ids = (names) => names.map((name) => called(name).id);
  const must = (result) => {
    if (result.error || result.ok === false) throw new Error(result.error || result.message);
    if (result.objects) objects = result.objects;
    return result;
  };
  return {
    add: (shape, settings) => objects.push(createObject(shape, settings)),
    called,
    /** Put the named things into a new group. */
    group: (name, names, settings = {}) => {
      const made = must(groupNodes(objects, ids(names), name));
      Object.assign(objects.find((o) => o.id === made.id), settings);
    },
    mirror: (name, axis) => must(mirrorNodes(objects, ids([name]), axis)),
    move: (name, move, settings, at = 0) => must(applyMove(objects, called(name).id, move, settings, at)),
    /** The finished scene, with ids that are the same every time. */
    scene: (prefix) => {
      const fresh = new Map(objects.map((o, i) => [o.id, `${prefix}-${i + 1}`]));
      const renamed = objects.map((o) => ({ ...o, id: fresh.get(o.id), parent: o.parent ? fresh.get(o.parent) : null }));
      return { app: 'bloxd-particle-studio', version: 1, objects: sanitizeScene({ objects: renamed }).objects };
    },
  };
}

const key = (t, change) => ({ t, rot: [0, 0, 0], scale: [1, 1, 1], ease: 'linear', ...change });

/** A fire on top of the code block: flames that change colour and shrink as they rise, sparks and smoke, again and again. */
function campfire() {
  const b = builder();
  // Everything ends 4.7 seconds after the click, the stones as well as the last
  // flame, spark and puff of smoke: World Code starts the scene again at that
  // moment, so the fire goes on without a hole.
  const SHOW = 2.82; // the lifetime of what stays all the time: 4.7 seconds
  const still = { life: SHOW, texture: 'square_particle' };
  b.add('circle', { ...still, name: 'Stones', count: 9, pos: [0.5, 1.12, 0.5], rot: [90, 0, 0], scale: [1.25, 1.25, 1.25], color: '#7d879c', color2: '#4a5263', size: 0.42 });
  [[0, '#8b5a2b'], [60, '#74481f'], [120, '#8b5a2b']].forEach(([turn, color], i) => {
    b.add('line', { ...still, name: `Log ${i + 1}`, count: 6, pos: [0.5, 1.2 + i * 0.07, 0.5], rot: [0, turn, 12], scale: [0.85, 0.85, 0.85], color, size: 0.34 });
  });
  b.add('disc', { ...still, name: 'Glow', count: 7, pos: [0.5, 1.3, 0.5], rot: [90, 0, 0], scale: [0.5, 0.5, 0.5], texture: 'glint', color: '#ff8a1e', color2: '#ffd24a', size: 0.9, blend: 2 });
  // Flames: every key gives them another colour, the last one a smaller size too
  b.add('disc', {
    name: 'Flames', count: 6, pos: [0.5, 1.45, 0.5], rot: [90, 0, 0], scale: [0.55, 0.55, 0.55], texture: 'square_particle',
    color: '#ffe14a', size: 0.5, size2: 0.62, life: 0.51, fade: true, repeat: 9, every: 0.48, // 8 x 0.48 + 0.85 s
    keys: [
      key(0.4, { pos: [0.5, 2.1, 0.5], rot: [90, 0, 0], scale: [0.4, 0.4, 0.4], color: '#ff9a1e' }),
      key(0.85, { pos: [0.5, 2.75, 0.5], rot: [90, 0, 0], scale: [0.12, 0.12, 0.12], color: '#e23a12', size: 0.28, size2: 0.36 }),
    ],
  });
  b.add('circle', {
    name: 'Flame tips', count: 3, pos: [0.5, 1.6, 0.5], rot: [90, 40, 0], scale: [0.22, 0.22, 0.22], texture: 'square_particle',
    color: '#fff3a6', size: 0.34, life: 0.42, fade: true, start: 0.16, repeat: 9, every: 0.48, // 0.16 + 8 x 0.48 + 0.7 s
    keys: [key(0.7, { pos: [0.5, 2.95, 0.5], rot: [90, 40, 0], scale: [0.05, 0.05, 0.05], color: '#ff7a1a', ease: 'out' })],
  });
  // Sparks and smoke fly by themselves (Motion): one particle each, however long the way
  b.add('disc', {
    name: 'Sparks', count: 4, pos: [0.5, 1.7, 0.5], rot: [90, 0, 0], scale: [0.35, 0.35, 0.35], texture: 'glint',
    color: '#ffd24a', color2: '#ff5a1e', size: 0.22, life: 0.84, fade: true, blend: 2, move: [0, 2.1, 0], spread: 0.7, gravity: -0.6,
    start: 0.3, repeat: 6, every: 0.6, // 0.3 + 5 x 0.6 + 1.4 s
  });
  b.add('disc', {
    name: 'Smoke', count: 4, pos: [0.5, 2.7, 0.5], rot: [90, 0, 0], scale: [0.3, 0.3, 0.3], texture: 'square_particle',
    color: '#59606e', color2: '#2f343f', size: 0.32, size2: 0.55, life: 1.5, fade: true, fadeIn: true, move: [0.25, 1, 0.1], spread: 0.3, expand: 0.3,
    start: 0.6, repeat: 3, every: 0.8, // 0.6 + 2 x 0.8 + 2.5 s
  });
  b.group('Fireplace', ['Stones', 'Log 1', 'Log 2', 'Log 3', 'Glow'], { open: false });
  b.group('Fire', ['Flames', 'Flame tips', 'Sparks', 'Smoke']);
  b.group('Campfire', ['Fireplace', 'Fire']);
  return b.scene('campfire');
}

/** A gate between two pillars: a ring that pulses, sparks that orbit it and dust that is pulled in. */
function portal() {
  const b = builder();
  const SHOW = 3.6;
  const MIDDLE = [0.5, 3.4, 0.5];
  const stone = { life: SHOW, texture: 'square_particle', color: '#6d5a8c', color2: '#463a5e', size: 0.5 };
  // one pillar and its top are built, the other side is a mirror copy
  b.add('line', { ...stone, name: 'Pillar', count: 6, pos: [-2.4, 2.75, 0.5], rot: [0, 0, 90], scale: [1.75, 1.75, 1.75] });
  b.add('diamond', { ...stone, name: 'Crystal', count: 8, pos: [-2.4, 5, 0.5], scale: [0.4, 0.55, 0.4], texture: 'glint', color: '#b98cff', color2: '#47c8ff', size: 0.34, blend: 2 });
  b.group('Left pillar', ['Pillar', 'Crystal'], { open: false });
  b.mirror('Left pillar', 0);
  // the gate itself
  b.add('circle', { name: 'Ring', count: 24, pos: MIDDLE, scale: [2, 2, 2], texture: 'soul_0', color: '#a855ff', color2: '#47c8ff', size: 0.5, life: SHOW, fadeIn: true });
  b.move('Ring', 'pulse', { seconds: 2, times: 3, amount: 10 });
  b.add('disc', { name: 'Inside', count: 19, pos: MIDDLE, scale: [1.5, 1.5, 1.5], texture: 'square_particle', color: '#2a1447', color2: '#4b2a85', size: 0.7, size2: 0.9, life: SHOW, fadeIn: true });
  b.add('circle', {
    name: 'Dust', count: 10, pos: MIDDLE, rot: [0, 0, 18], scale: [2.6, 2.6, 2.6], texture: 'glint', color: '#e6d4ff', color2: '#7a5cff', size: 0.2, blend: 2,
    life: 0.6, fade: true, fadeIn: true, expand: -2.3, start: 0.4, repeat: 9, every: 0.6,
  });
  // a spark that circles the ring: Orbit puts it into a group that turns. Its mirror copy circles the other way.
  b.add('point', { name: 'Spark', pos: [MIDDLE[0] + 2.75, MIDDLE[1], MIDDLE[2]], texture: 'glint', color: '#ffd24a', size: 0.5, blend: 2, life: 0.6 });
  b.move('Spark', 'orbit', { seconds: 5.5, times: 1, wide: 5.5, axis: 2 });
  b.called('Spark orbit').name = 'Right spark';
  b.mirror('Right spark', 0);
  b.called('Left spark').pos[2] -= 0.01; // (a hair in front, so the two do not hide each other where they cross)
  b.group('Gate', ['Ring', 'Inside', 'Dust', 'Right spark', 'Left spark']);
  b.group('Portal', ['Left pillar', 'Right pillar', 'Gate']);
  return b.scene('portal');
}

export function buildExamples() {
  return [
    {
      id: 'dragon', name: 'Dragon',
      about: 'Glides in from far away and breathes fire. 76 objects in folders, 10 seconds, 3 code blocks.',
      scene: { app: 'bloxd-particle-studio', version: 1, objects: buildDragon().objects },
    },
    {
      id: 'campfire', name: 'Campfire',
      about: 'Flames change colour and shrink as they rise. Made with Repeat and with keys that set colour and size.',
      scene: campfire(),
    },
    {
      id: 'portal', name: 'Portal',
      about: 'A ring that pulses, sparks that orbit it, dust that is pulled in. Made with groups, a mirror copy and ready-made moves.',
      scene: portal(),
    },
  ];
}

/** js/examples-data.js as text. */
export function examplesFile() {
  const lines = buildExamples().map((example) => {
    const { scene, ...head } = example;
    const objects = scene.objects.map((o) => JSON.stringify(o)).join(',\n');
    return `${JSON.stringify(head).slice(0, -1)},"scene":{"app":"bloxd-particle-studio","version":1,"objects":[\n${objects}\n]}}`;
  });
  return `// Made by examples/build.mjs: the scenes behind the Examples button. Do not edit by hand.\nexport const EXAMPLES = [\n${lines.join(',\n')},\n];\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.writeFileSync(path.join(here, '../js/examples-data.js'), examplesFile());
  fs.writeFileSync(path.join(here, 'dragon.json'), dragonFile());
  console.log('Wrote js/examples-data.js and examples/dragon.json');
}
