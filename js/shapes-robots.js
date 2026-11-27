// The Robots tab: robots put together from a head, a face, something on the
// head, a body with something on its chest, arms, and what they move on (see
// shape-mix.js for how the parts are dealt out). Each heading is one way of
// moving. A robot is about 18 units high: the head from 2.9 to 7.9, the body
// from -3.2 to 2, and what it stands on down to about -7.2.

import {
  family, edgeOf as edge, mirrored, path, closed, circle, dot, box, bow, bowTo, zigzag, add, ball, roundedBox,
} from './shape-mix.js';

// ---------------------------------------------------------------- heads
//
// [search words, outline, height of the eyes, height of the mouth]

const HEADS = [
  ['square head', box(-3.2, 2.9, 3.2, 7.9), 6, 4.2],
  ['round head dome', `${path([3.2, 5.6], [3.2, 2.9], [-3.2, 2.9], [-3.2, 5.6])} ${bowTo([3.2, 5.6], 0.8125)}`, 5.8, 4.1],
  ['wide head', closed([-3.7, 7.9], [3.7, 7.9], [2.6, 2.9], [-2.6, 2.9]), 6, 4.2],
  ['rounded head', roundedBox(0, 5.4, 3.5, 2.5, 1.3), 6, 4.2],
  ['eight sided head', closed([-2.4, 7.9], [2.4, 7.9], [3.4, 6.9], [3.4, 3.9], [2.4, 2.9], [-2.4, 2.9], [-3.4, 3.9], [-3.4, 6.9]), 6, 4.2],
];

// ---------------------------------------------------------------- faces
//
// (height of the eyes, height of the mouth) => [what is drawn on the right and mirrored, what stands in the middle]

const FACES = [
  ['square eyes', (e, m) => [[box(0.7, e - 0.55, 1.8, e + 0.55)], [path([-1.5, m], [1.5, m])]]],
  ['round eyes teeth', (e, m) => [[circle(1.3, e, 0.85), dot(1.3, e)], [path(...zigzag([-1.8, m + 0.3], [1.8, m + 0.3], 3, -0.6))]]],
  ['visor', (e, m) => [[], [roundedBox(0, e, 2.1, 0.6, 0.6), path([-0.9, m], [0.9, m])]]],
  ['one eye lens camera', (e, m) => [[], [circle(0, e + 0.1, 1.1), dot(0, e + 0.1), path([-1.2, m], [1.2, m])]]],
  ['dot eyes smile happy', (e, m) => [[dot(1.3, e)], [bow([-1.5, m + 0.3], [1.5, m + 0.3], -0.45)]]],
  ['screen eyes speaker', (e, m) => [[box(0.5, e - 0.45, 2, e + 0.45)], [box(-1.2, m - 0.45, 1.2, m + 0.45)]]],
  ['angry eyes grille', (e, m) => [[path([0.6, e - 0.3], [2, e + 0.5]), path([0.9, m - 0.4], [0.9, m + 0.8])], [path([-1.7, m + 0.2], [1.7, m + 0.2]), path([0, m - 0.4], [0, m + 0.8])]]],
];

// ---------------------------------------------------------------- on the head
//
// (head) => [what is drawn on the right and mirrored, what stands in the middle]

const ANTENNAS = [
  ['', () => [[], []]],
  ['antenna', (h) => [[], [ball(h.top(0), add(h.top(0), 0, 2.1), 0.8)]]],
  ['two antennas', (h) => [[ball(h.top(1.6), add(h.top(1.6), 0.7, 2), 0.8)], []]],
  ['lightning antenna zigzag', (h) => [[], [path(h.top(0), add(h.top(0), 0.7, 0.9), add(h.top(0), -0.7, 1.6), add(h.top(0), 0, 2.5))]]],
  ['dish radar', (h) => [[], [path(h.top(0), add(h.top(0), 0, 1.2)), bow(add(h.top(0), -1.4, 2.4), add(h.top(0), 1.4, 2.4), -0.857)]]],
  ['aerial', (h) => [[], [path(h.top(0), add(h.top(0), 0, 1.5)), path(add(h.top(0), -1.4, 1.5), add(h.top(0), 1.4, 1.5))]]],
  ['ear bolts', (h) => [[path(h.right(5.4), add(h.right(5.4), 1.1, 0)), path(add(h.right(5.4), 1.1, -0.9), add(h.right(5.4), 1.1, 0.9))], []]],
  ['siren light', (h) => [[], [bow(h.top(-1.2), h.top(1.2), 1)]]],
  ['rabbit ear antenna', (h) => [[path(h.top(0), add(h.top(0), 1.7, 2.2))], []]],
];

// ---------------------------------------------------------------- bodies
//
// [search words, outline, what is on the chest]: eleven of them.

const CHESTS = {
  none: ['', ''],
  panel: ['panel', box(-1.6, -1.7, 1.6, 0.6)],
  core: ['core reactor', `${circle(0, -0.6, 1.3)} ${dot(0, -0.6)}`],
  lights: ['lights buttons', `${dot(-1.3, 0.2)} ${dot(0, 0.2)} ${dot(1.3, 0.2)} ${path([-1.5, -1.3], [1.5, -1.3])}`],
  grille: ['grille vents', [0.5, -0.6, -1.7].map((y) => path([-1.5, y], [1.5, y])).join(' ')],
  bolt: ['lightning bolt power', path([0.6, 1], [-0.7, -0.5], [0.5, -0.5], [-0.6, -2.2])],
};
const TORSOS = {
  box: ['', box(-3.5, -3.2, 3.5, 2)],
  strong: ['strong shoulders', closed([-4, 2], [4, 2], [2.8, -3.2], [-2.8, -3.2])],
  bell: ['', closed([-2.8, 2], [2.8, 2], [4, -3.2], [-4, -3.2])],
  rounded: ['', roundedBox(0, -0.6, 3.6, 2.6, 1.2)],
};
const BODIES = [
  ['box', 'none'], ['strong', 'panel'], ['bell', 'core'], ['rounded', 'lights'], ['box', 'grille'], ['strong', 'bolt'],
  ['bell', 'none'], ['rounded', 'panel'], ['box', 'core'], ['strong', 'lights'], ['bell', 'grille'],
];

// ---------------------------------------------------------------- arms
//
// (body) => what is drawn on the right and mirrored

const claw = (hand, dx, dy) => path(add(hand, dx * 0.9 - dy * 0.5, dy * 0.9 + dx * 0.5), hand, add(hand, dx * 0.9 + dy * 0.5, dy * 0.9 - dx * 0.5));

const ARMS = [
  ['claw arms pincers', (b) => { const s = b.right(0.9); return `${path(s, add(s, 2.1, 0), add(s, 2.1, -2.4))} ${claw(add(s, 2.1, -2.4), 0, -1)}`; }],
  ['arms up raised', (b) => { const s = b.right(0.9); return `${path(s, add(s, 2, 1.5))} ${claw(add(s, 2, 1.5), 0.8, 0.6)}`; }],
  ['ball hands', (b) => { const s = b.right(0.9); return ball(s, add(s, 2.5, 0), 0.8); }],
  ['no arms', () => ''],
];

// ---------------------------------------------------------------- what a robot moves on
//
// Two of each kind: [search words, what is drawn on the right and mirrored, what stands in the middle]

const BASES = {
  walking: [
    ['legs feet', [path([1.5, -3.2], [1.5, -7.2], [3.1, -7.2])], []],
    ['boots', [path([0.8, -3.2], [0.8, -7.2], [3, -7.2], [3, -6.2], [2, -6.2], [2, -3.2])], []],
  ],
  rolling: [
    ['two wheels', [path([2, -3.2], [2, -4.1]), circle(2, -5.6, 1.5), dot(2, -5.6)], []],
    ['one wheel ball', [], [path([0, -3.2], [0, -4.1]), circle(0, -6, 1.9), circle(0, -6, 0.8)]],
  ],
  hovering: [
    ['jets flames rocket', [path([0.7, -4.1], [1.7, -6.3], [2.7, -4.1])], []],
    ['rings floating', [], [bow([-2.8, -4.3], [2.8, -4.3], -0.3), bow([-1.9, -5.9], [1.9, -5.9], -0.3), bow([-1, -7.2], [1, -7.2], -0.3)]],
  ],
  tank: [
    ['track', [dot(2.7, -5.7)], [path([0, -3.2], [0, -4.2]), roundedBox(0, -5.7, 4.2, 1.5, 1.5), dot(0, -5.7)]],
    ['tracks', [dot(2.2, -5.7)], [path([0, -3.2], [0, -4.2]), closed([-4.4, -4.2], [4.4, -4.2], [3.2, -7.2], [-3.2, -7.2]), dot(0, -5.7)]],
  ],
};

// [id, name, heading, search words, how many, which variants number 1 has]
const KINDS = [
  ['walking', 'Walking robot', 'Walking robots', 'legs', 280, [0, 0, 1, 0, 0]],
  ['rolling', 'Rolling robot', 'Rolling robots', 'wheels', 280, [2, 3, 4, 5, 3]],
  ['hovering', 'Hovering robot', 'Hovering robots', 'flying drone', 280, [4, 5, 7, 9, 6]],
  ['tank', 'Tank robot', 'Tank robots', 'tracks crawler', 280, [1, 2, 2, 3, 1]],
];

function robots([kind, name, sub, more, count, first]) {
  return family({
    cat: 'robots', count, first, spacing: 0.1, sizes: [HEADS.length, FACES.length, ANTENNAS.length, BODIES.length, 8],
    make: ([head, face, antenna, body, limbs], k) => {
      const [headWords, headLine, eyes, mouth] = HEADS[head];
      const [torso, chest] = BODIES[body];
      const arms = ARMS[limbs % 4];
      const base = BASES[kind][limbs >> 2];
      return {
        id: `${kind}-robot-${k}`, name: `${name} ${k}`, sub,
        tags: ['robot machine bot android droid', more, headWords, FACES[face][0], ANTENNAS[antenna][0], TORSOS[torso][0], CHESTS[chest][0], arms[0], base[0]].filter(Boolean).join(' '),
        draw: () => {
          const [faceSides, faceMiddle] = FACES[face][1](eyes, mouth);
          const [antennaSides, antennaMiddle] = ANTENNAS[antenna][1](edge(headLine));
          return mirrored(
            [faceSides, antennaSides, arms[1](edge(TORSOS[torso][1])), base[1]],
            [headLine, path([0, 2.9], [0, 2]), TORSOS[torso][1], CHESTS[chest][1], faceMiddle, antennaMiddle, base[2]],
          );
        },
      };
    },
  });
}

export const ROBOT_SHAPES = KINDS.flatMap(robots);
export const ROBOT_HEADINGS = KINDS.map((kind) => kind[2]);
