// Badges: a little picture or a letter inside a frame. "Heart in a circle",
// "Skull on a shield", "Letter A in a hexagon". The little pictures are the
// ones of the Combos tab (shapes-combos.js), the letters those of
// shapes-text.js; a new frame is one entry in FRAMES.

import { parsePath, drawingNet, spreadPoints, apportion, around } from './shape-kit.js';
import { LETTERS } from './shapes-text.js';
import { minis, pictureOf } from './shapes-combos.js';

const corners = (k, radius, first = 90) => Array.from({ length: k }, (_, i) => around(0, 0, radius, first + (360 * i) / k));
const STAR = `M${Array.from({ length: 10 }, (_, i) => around(0, 0, i % 2 ? 0.68 : 1, 90 + 36 * i)).join(' L')} Z`;

// [part of the id, how the name ends, the frame in the box from -1 to 1, how big the picture inside is, how far up it stands, search words,
//  the little picture that is this very frame (left out of it: that is a shape in a shape of the Basic tab)]
// In a diamond, a star and a triangle there is little room: only the simple pictures stand in those.
const FRAMES = [
  ['circle', 'in a circle', 'O0,0 1', 0.58, 0, 'round button coin token', 'circles'],
  ['square', 'in a square', 'M-1,-1 L1,-1 L1,1 L-1,1 Z', 0.64, 0, 'box tile block icon', 'squares'],
  ['shield', 'on a shield', 'M-0.86,1 L0.86,1 L0.86,0 Q0.86,-0.62 0,-1 Q-0.86,-0.62 -0.86,0 Z', 0.5, 0.2, 'crest team guard coat of arms', 'shields'],
  ['hexagon', 'in a hexagon', `M${corners(6, 1).join(' L')} Z`, 0.54, 0, 'six sides tile honeycomb', 'hexagons'],
  ['diamond', 'in a diamond', 'M0,1 L1,0 L0,-1 L-1,0 Z', 0.38, 0, 'rhombus sign', 'diamonds'],
  ['star', 'in a star', STAR, 0.38, -0.03, 'award sheriff', 'stars'],
  ['triangle', 'in a triangle', `M${corners(3, 1).join(' L')} Z`, 0.28, -0.1, 'warning sign caution', 'triangles'],
  ['medal', 'on a medal', 'O0,0 1 O0,0 0.82', 0.46, 0, 'double ring award prize seal', 'rings'],
];
const TIGHT = new Set(['diamond', 'star', 'triangle']);
// These were in the library before, in the Basic and the Symbols tab: they are not made a second time.
const THERE = new Set([
  'Heart in a circle', 'Star in a circle', 'Triangle in a circle', 'Square in a circle', 'Arrow in a circle', 'Heart in a square', 'Star in a square',
  'Diamond in a square', 'Circle in a square', 'Star in a hexagon', 'Circle in a hexagon', 'Circle in a triangle',
]);

const lazy = (make) => {
  let value;
  return () => (value === undefined ? (value = make()) : value);
};

function badge(id, name, cat, sub, tags, frame, picture, size, up, needs) {
  const net = lazy(() => drawingNet(parsePath(frame)));
  const length = lazy(() => net().lens.reduce((sum, l) => sum + l, 0));
  const shape = {
    id, name, cat, sub, group: 'flat', tags,
    gen: (n) => {
      const fixed = [net().nodes.length, picture.corners()];
      // the same gap between particles on the frame and on the picture: each gets its share by the length of its lines,
      // and never fewer than its corners while there are enough for both
      let counts = apportion([length(), picture.length() * size], n);
      if (n < fixed[0] + fixed[1]) counts = apportion(fixed, n);
      else if (counts[0] < fixed[0]) counts = [fixed[0], n - fixed[0]];
      else if (counts[1] < fixed[1]) counts = [n - fixed[1], fixed[1]];
      const around = counts[0] < fixed[0] ? net().nodes.slice(0, counts[0]) : spreadPoints(net(), counts[0]);
      return [...around.map(([x, y]) => [x, y, 0]), ...picture.points(counts[1]).map(([x, y]) => [x * size, y * size + up, 0])];
    },
  };
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => net().nodes.length + picture.corners() });
  Object.defineProperty(shape, 'count', {
    enumerable: true,
    get: () => Math.max(shape.min + 8, Math.min(190, Math.round((length() + picture.length() * size) / 0.105), Math.round(length() / 0.105) + needs * 3)),
  });
  return shape;
}

const capital = (text) => text[0].toUpperCase() + text.slice(1);

const pictureBadges = FRAMES.flatMap(([id, how, frame, size, up, words, same]) => minis
  .filter((mini) => mini.id !== same && !(TIGHT.has(id) && mini.needs > 12) && !THERE.has(`${capital(mini.one)} ${how}`))
  .map((mini) => badge(
    `badge-${id}-${mini.id}`, `${capital(mini.one)} ${how}`, 'symbols', 'Badges',
    `${mini.one} ${mini.tags} ${words} badge emblem logo team sign`, frame, mini, size, up, mini.needs,
  )));

const LETTER_FRAMES = ['circle', 'square', 'shield', 'hexagon', 'diamond'];
const letterBadges = FRAMES.filter(([id]) => LETTER_FRAMES.includes(id)).flatMap(([id, how, frame, size, up, words]) => Object.entries(LETTERS).map(([letter, d]) => badge(
  `badge-${id}-letter-${letter.toLowerCase()}`, `Letter ${letter} ${how}`, 'letters', 'Letter badges',
  `${letter} ${words} badge monogram initial team sign`, frame, pictureOf(d), size * 0.92, up, 14,
)));

export const BADGE_SHAPES = [...pictureBadges, ...letterBadges];
