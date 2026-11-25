// Things to say something with: words in thick outline letters, speech bubbles
// with a word in them, the keys of a keyboard and a mouse (for "press E"
// signs), and arrows for every direction.

import { drawnShape, parsePath, placeDrawing, joinDrawings, fitDrawing, drawingNet, spreadPoints, apportion, fix } from './shape-kit.js';
import { LETTERS, SMALL, DIGITS, glyph, DROP } from './shapes-text.js';
import { outline } from './shapes-words.js';
import { phrase, slug } from './shapes-vocab.js';
import { minis, pictureOf } from './shapes-combos.js';

const lazy = (make) => {
  let value;
  return () => (value === undefined ? (value = make()) : value);
};

// ---------------------------------------------------------------- words in outline letters

// The letters stand further apart than in a plain word: each one is thick, and their outlines must not touch.
const WIDE_GAP = 3.6;
function spaced(word) {
  let x = 0;
  const parts = [];
  for (const ch of word) {
    const drawing = parsePath(ch === 'I' ? 'M0,0 L0,10' : LETTERS[ch]);
    const xs = drawing.polys.flat().map((p) => p[0]);
    const x0 = Math.min(...xs);
    parts.push(placeDrawing(drawing, { x: x - x0 }));
    x += Math.max(...xs) - x0 + WIDE_GAP;
  }
  return joinDrawings(...parts);
}

const BUBBLE = `
  WIN GG GO STOP START FINISH SHOP LOOT LOBBY BOSS EXIT ENTER OPEN HOME BASE ARENA PVP VIP LOVE WOW BOOM POW YES NO OK HI BYE HELLO
  WELCOME DANGER LEVEL BONUS GAME OVER PLAY SCORE TEAM KING QUEEN FREE SALE HOT MAX TOP END GIFT BLOXD SECRET QUEST GOAL JUMP RUN UP
  DOWN EPIC COOL NICE PARTY MAGIC HERO LEGEND SUPER MEGA BRAVO YAY OOPS LUCKY SAFE RACE MAZE FIRE ICE STAR MOON SUN GOLD GEMS COINS CASH XP
`.trim().split(/\s+/);

const bubbleWords = BUBBLE.map((word) => drawnShape({
  id: `outline-word-${slug(word)}`, name: `The word ${word} in outline letters`, cat: 'words', sub: 'Words in outline letters', label: word,
  tags: `${word} text writing hollow bubble thick big bold sign`, draw: () => outline(spaced(word)), count: Math.min(300, 40 + 46 * word.length),
}));

// ---------------------------------------------------------------- a frame with something inside
//
// The frame and what is inside it get the same gap between particles: each its share by the length of its lines.

function framed(id, name, cat, sub, tags, frame, picture, room) {
  const net = lazy(() => drawingNet(typeof frame === 'string' ? parsePath(frame) : frame));
  const length = lazy(() => net().lens.reduce((sum, l) => sum + l, 0));
  // `room` is [middle x, middle y, half width, half height] of the space inside; the picture is as big as fits
  const place = lazy(() => {
    const [cx, cy, wide, high] = room;
    const size = Math.min(wide, high * picture.aspect());
    return [cx, cy, size];
  });
  const shape = {
    id, name, cat, sub, group: 'flat', tags,
    gen: (n) => {
      const [cx, cy, size] = place();
      const fixed = [net().nodes.length, picture.corners()];
      let counts = apportion([length(), picture.length() * size], n);
      if (n < fixed[0] + fixed[1]) counts = apportion(fixed, n);
      else if (counts[0] < fixed[0]) counts = [fixed[0], n - fixed[0]];
      else if (counts[1] < fixed[1]) counts = [n - fixed[1], fixed[1]];
      const around = counts[0] < fixed[0] ? net().nodes.slice(0, counts[0]) : spreadPoints(net(), counts[0]);
      return [...around.map(([x, y]) => [x, y, 0]), ...picture.points(counts[1]).map(([x, y]) => [cx + x * size, cy + y * size, 0])];
    },
  };
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => net().nodes.length + picture.corners() });
  Object.defineProperty(shape, 'count', {
    enumerable: true, get: () => Math.max(shape.min + 8, Math.min(240, Math.round((length() + picture.length() * place()[2]) / 0.1))),
  });
  return shape;
}

// A drawing as a picture for framed(): pictureOf() of shapes-combos.js, and how many times wider than high it is.
// (pictureOf takes a drawing, not a function: the drawing is made the first time it is needed)
const lazyPicture = (make) => {
  const drawing = lazy(make);
  const inner = lazy(() => pictureOf(drawing()));
  return {
    corners: () => inner().corners(), length: () => inner().length(), points: (k) => inner().points(k),
    aspect: lazy(() => {
      const d = drawing();
      const points = [...d.polys.flat(), ...d.dots];
      const wide = Math.max(...points.map((p) => p[0])) - Math.min(...points.map((p) => p[0]));
      const high = Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1]));
      // a tall picture (an exclamation mark) is fitted by its height: its box is as wide as it is high
      return Math.max(1, wide / Math.max(high, 1e-6));
    }),
  };
};

// ---------------------------------------------------------------- speech bubbles

const SPEECH = 'M-0.88,0.82 L0.88,0.82 Q1,0.82 1,0.7 L1,-0.28 Q1,-0.4 0.88,-0.4 L-0.1,-0.4 L-0.52,-0.92 L-0.46,-0.4 L-0.88,-0.4 Q-1,-0.4 -1,-0.28 L-1,0.7 Q-1,0.82 -0.88,0.82 Z';
const SPEECH_ROOM = [0, 0.21, 0.74, 0.36];
const SAID = ['!', '?', '?!', '...', 'HI', 'HEY', 'BYE', 'GG', 'OK', 'NO', 'YES', 'LOL', 'WOW', 'HELP', 'ZZZ', 'YAY', 'OOPS', 'HMM', 'NICE', 'GO!', 'BOO', 'NOPE'];
const speechWords = SAID.map((text) => framed(
  `speech-${slug(text.replace(/\.\.\./, 'dots')) || 'x'}`, `Speech bubble saying ${text}`, 'symbols', 'Speech bubbles',
  `${text} talk say chat message comic balloon npc`, SPEECH, lazyPicture(() => phrase(text)), SPEECH_ROOM,
));
const SAID_PICTURES = ['hearts', 'stars', 'notes', 'skulls', 'bolts', 'drops', 'flames', 'coins', 'gems', 'keys', 'crowns', 'swords'];
const speechPictures = SAID_PICTURES.map((id) => {
  const mini = minis.find((m) => m.id === id);
  return framed(`speech-${id}`, `Speech bubble with a ${mini.one}`, 'symbols', 'Speech bubbles', `${mini.one} ${mini.tags} talk say chat thinking comic balloon npc quest`,
    SPEECH, { ...mini, aspect: () => 1 }, SPEECH_ROOM);
});

// ---------------------------------------------------------------- keys and a mouse

const KEY = 'M-0.8,1 L0.8,1 Q1,1 1,0.8 L1,-0.8 Q1,-1 0.8,-1 L-0.8,-1 Q-1,-1 -1,-0.8 L-1,0.8 Q-1,1 -0.8,1 Z';
const cap = (x, y, size, inside, room = 0.5) => joinDrawings(
  placeDrawing(parsePath(KEY), { x, y, size }),
  placeDrawing(fitDrawing(typeof inside === 'string' ? parsePath(inside) : inside), { x, y, size: size * room }),
);
const letterKey = (x, y, size, ch) => cap(x, y, size, ch === 'I' ? 'M0,0 L0,10' : LETTERS[ch]);
const ARROW_UP = 'M0,-4 L0,4 M-3,1 L0,4 L3,1';
const arrowKey = (x, y, size, turn) => cap(x, y, size, placeDrawing(parsePath(ARROW_UP), { turn }));
/** A wide key with a word on it. */
const wideKey = (word, wide) => joinDrawings(
  parsePath(`M${fix(-wide + 0.2)},1 L${fix(wide - 0.2)},1 Q${wide},1 ${wide},0.8 L${wide},-0.8 Q${wide},-1 ${fix(wide - 0.2)},-1 L${fix(-wide + 0.2)},-1 Q${-wide},-1 ${-wide},-0.8 L${-wide},0.8 Q${-wide},1 ${fix(-wide + 0.2)},1 Z`),
  placeDrawing(fitDrawing(phrase(word)), { size: Math.min(wide * 0.72, 0.5 * word.length * 0.62) }),
);
const MOUSE = 'M-0.6,0.4 L-0.6,-0.5 A0,-0.5 0.6 180 360 L0.6,0.4 A0,0.4 0.6 0 180 M-0.6,0.3 L0.6,0.3 M0,1 L0,0.3';
const click = (side) => `${MOUSE} M${0.5 * side},1.15 L${0.62 * side},1.4 M${0.78 * side},0.95 L${1.02 * side},1.1 M${0.86 * side},0.62 L${1.12 * side},0.62`;

// [id, name, drawing, search words]
const KEYS = [
  ['wasd', 'WASD keys', () => joinDrawings(letterKey(0, 1.1, 1, 'W'), letterKey(-2.2, -1.1, 1, 'A'), letterKey(0, -1.1, 1, 'S'), letterKey(2.2, -1.1, 1, 'D')), 'move walk controls'],
  ['arrow-keys', 'Arrow keys', () => joinDrawings(arrowKey(0, 1.1, 1, 0), arrowKey(-2.2, -1.1, 1, 90), arrowKey(0, -1.1, 1, 180), arrowKey(2.2, -1.1, 1, -90)), 'move cursor controls up down left right'],
  ['space-bar', 'Space bar', () => wideKey('SPACE', 3.4), 'jump key long'],
  ['shift-key', 'Shift key', () => wideKey('SHIFT', 2.2), 'sneak run crouch'],
  ['ctrl-key', 'Ctrl key', () => wideKey('CTRL', 1.8), 'control sprint'],
  ['esc-key', 'Esc key', () => wideKey('ESC', 1.5), 'escape menu leave'],
  ['tab-key', 'Tab key', () => wideKey('TAB', 1.5), 'list players'],
  ['enter-key', 'Enter key', () => wideKey('ENTER', 2.2), 'return chat confirm'],
  ['e-key', 'E key', () => letterKey(0, 0, 1, 'E'), 'use interact inventory press'],
  ['f-key', 'F key', () => letterKey(0, 0, 1, 'F'), 'use interact press'],
  ['q-key', 'Q key', () => letterKey(0, 0, 1, 'Q'), 'drop press'],
  ['mouse', 'Computer mouse', () => parsePath(MOUSE), 'click pointer device'],
  ['mouse-left', 'Left click', () => parsePath(click(-1)), 'mouse button hit break attack'],
  ['mouse-right', 'Right click', () => parsePath(click(1)), 'mouse button place use'],
];
const keys = KEYS.map(([id, name, draw, more]) => drawnShape({
  id: `key-${id}`, name, cat: 'symbols', sub: 'Keys and mouse', draw, spacing: 0.06, tags: `${more} keyboard key button press tutorial how to play`,
}));

// ---------------------------------------------------------------- arrows for every direction

// [part of the id, how the name starts, the arrow pointing up, search words]
const ARROWS = [
  ['thin', 'Arrow', 'M0,-5 L0,5 M-3.4,1.6 L0,5 L3.4,1.6', 'pointer line'],
  ['block', 'Block arrow', 'M-1.6,-5 L1.6,-5 L1.6,0.6 L3.8,0.6 L0,5 L-3.8,0.6 L-1.6,0.6 Z', 'thick big wide'],
  ['triangle', 'Triangle', 'M0,4.4 L4.6,-3.6 L-4.6,-3.6 Z', 'play button pointer wedge'],
  ['chevron', 'Chevron', 'M-4.4,-1.8 L0,2.6 L4.4,-1.8', 'angle bracket caret'],
  ['double-chevron', 'Double chevron', 'M-4.4,-3.6 L0,0.8 L4.4,-3.6 M-4.4,0 L0,4.4 L4.4,0', 'fast forward two angles'],
];
// [part of the id, how the name ends, degrees to turn the arrow from pointing up (anticlockwise), search words]
const WAYS = [
  ['up', 'pointing up', 0, 'north top above'], ['up-right', 'pointing up and right', -45, 'north east diagonal'], ['right', 'pointing right', -90, 'east next forward'],
  ['down-right', 'pointing down and right', -135, 'south east diagonal'], ['down', 'pointing down', 180, 'south bottom below'],
  ['down-left', 'pointing down and left', 135, 'south west diagonal'], ['left', 'pointing left', 90, 'west back previous'], ['up-left', 'pointing up and left', 45, 'north west diagonal'],
];
const arrows = ARROWS.flatMap(([id, word, d, more]) => WAYS.map(([way, how, turn, where]) => drawnShape({
  id: `arrow-${id}-${way}`, name: `${word} ${how}`, cat: 'symbols', sub: 'Arrows', draw: d, turn,
  tags: `${way.replace('-', ' ')} ${where} ${more} direction this way sign`,
})));

// ---------------------------------------------------------------- slanted letters and numbers
//
// The stroke letters leaning to the right, and a little narrower: the foot of a letter stays where it is.

function slanted(d) {
  const { polys, dots } = glyph(d);
  // (a capital stands on y = -1; what is higher goes further right)
  const at = ([x, y]) => [0.82 * x + 0.2 * (y + 1) - 0.2, y];
  return { polys: polys.map((poly) => poly.map(at)), dots: dots.map(at) };
}
const slantedSign = (id, name, cat, sub, d, tags, extra = {}) => drawnShape({ id, name, cat, sub, tags, draw: () => slanted(d), box: false, spacing: 0.12, ...extra });

const slantedShapes = [
  ...Object.entries(LETTERS).map(([ch, d]) => slantedSign(`slanted-letter-${ch.toLowerCase()}`, `Slanted letter ${ch}`, 'letters', 'Slanted letters', d, `${ch} italic leaning capital`)),
  ...Object.entries(SMALL).map(([ch, d]) => slantedSign(`slanted-small-${ch}`, `Slanted small letter ${ch}`, 'letters', 'Slanted letters', d, `${ch} italic leaning lowercase little`, { drop: DROP })),
  ...Object.entries(DIGITS).map(([ch, d]) => slantedSign(`slanted-digit-${ch}`, `Slanted number ${ch}`, 'numbers', 'Slanted numbers', d, `${ch} italic leaning`)),
];

export const LABEL_SHAPES = [...bubbleWords, ...speechWords, ...speechPictures, ...keys, ...arrows, ...slantedShapes];
