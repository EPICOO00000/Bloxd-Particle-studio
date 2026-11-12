// Letters, numbers and signs, drawn with single strokes so they read well as
// dots. Every glyph sits on the same lines: y = 0 is the baseline and y = 10 the
// top of a capital, which become -1 and 1 in the shape. See shape-kit.js for
// the drawing language.

import { drawnShape, parsePath, placeDrawing } from './shape-kit.js';

const LETTERS = {
  A: 'M0,0 L3.5,10 L7,0 M1.4,4 L5.6,4',
  B: 'M0,0 L0,10 L3,10 A3,7.5 2.5 90 -90 L0,5 M3,5 L3.5,5 A3.5,2.5 2.5 90 -90 L0,0',
  C: 'E4,5 4,5 50 310',
  D: 'M0,0 L0,10 L2,10 E2,5 4.5,5 90 -90 L0,0',
  E: 'M6,10 L0,10 L0,0 L6,0 M0,5 L4.5,5',
  F: 'M6,10 L0,10 L0,0 M0,5 L4.5,5',
  G: 'E4,5 4,5 50 315 L6.83,4.6 L4,4.6',
  H: 'M0,0 L0,10 M6.5,0 L6.5,10 M0,5 L6.5,5',
  I: 'M0,0 L4,0 M0,10 L4,10 M2,0 L2,10',
  J: 'M1.5,10 L5,10 L5,2.5 A2.5,2.5 2.5 0 -180',
  K: 'M0,0 L0,10 M6,10 L0,4 M2,6 L6,0',
  L: 'M0,10 L0,0 L5.5,0',
  M: 'M0,0 L0,10 L4,3 L8,10 L8,0',
  N: 'M0,0 L0,10 L6.5,0 L6.5,10',
  O: 'E3.75,5 3.75,5 90 450',
  P: 'M0,0 L0,10 L3,10 A3,7.25 2.75 90 -90 L0,4.5',
  Q: 'E3.75,5 3.75,5 90 450 M4.6,2.6 L7.2,0',
  R: 'M0,0 L0,10 L3,10 A3,7.25 2.75 90 -90 L0,4.5 M3,4.5 L6,0',
  S: 'A3.25,7.5 2.5 20 270 A3.25,2.5 2.5 90 -160',
  T: 'M0,10 L7,10 M3.5,10 L3.5,0',
  U: 'M0,10 L0,3.25 A3.25,3.25 3.25 180 360 L6.5,10',
  V: 'M0,10 L3.5,0 L7,10',
  W: 'M0,10 L2,0 L4.5,7 L7,0 L9,10',
  X: 'M0,0 L6.5,10 M0,10 L6.5,0',
  Y: 'M0,10 L3.5,5 L7,10 M3.5,5 L3.5,0',
  Z: 'M0,10 L6.5,10 L0,0 L6.5,0',
};

const DIGITS = {
  0: 'E3,5 3,5 90 450',
  1: 'M0.5,7.5 L3,10 L3,0 M0.5,0 L5.5,0',
  2: 'A3,7 3 160 -45 L0,0 L6,0',
  3: 'A3,7.5 2.5 150 -90 A3,2.5 2.5 90 -150',
  4: 'M4.5,0 L4.5,10 L0,3 L6.5,3',
  5: 'M5.5,10 L0.8,10 L0.63,5.21 A2.9,3.1 3.1 137 -150',
  6: 'M4.8,10 Q0,9.5 0,3 A3,3 3 180 540',
  7: 'M0,10 L6,10 L2,0',
  8: 'A3,7.6 2.4 -90 270 A3,2.6 2.6 90 450',
  9: 'M1.2,0 Q6,0.5 6,7 A3,7 3 0 360',
};

// [id, name, sign, drawing]
const SIGNS = [
  ['exclaim', 'Exclamation mark', '!', 'M0,10 L0,3.2 D0,0.5'],
  ['question', 'Question mark', '?', 'A3,7.2 2.8 160 -50 Q3,3.8 3,3 D3,0.5'],
  ['hash', 'Hash', '#', 'M2,0 L3,10 M5,0 L6,10 M0.5,3.3 L7,3.3 M1,6.7 L7.5,6.7'],
  ['at', 'At sign', '@', 'A5,5 1.8 0 360 M6.8,6.8 L6.8,4.33 A8.18,4.33 1.38 180 360 A5,5 4.6 -8 300'],
  ['and', 'And sign', '&', 'M7,0 L2.2,6.2 C1,7.8 1.6,10 3.2,10 C4.8,10 5.2,8 3.8,6.6 L1.6,4.6 C-0.6,2.8 0.4,0 3,0 C5,0 6.4,1.8 7,4.6'],
  ['percent', 'Percent', '%', 'M7,10 L1,0 O1.8,8.2 1.7 O6.2,1.8 1.7'],
  ['dollar', 'Dollar', '$', 'A3.25,7 2 20 270 A3.25,3 2 90 -160 M3.25,10 L3.25,0'],
  ['euro', 'Euro', '€', 'E4.5,5 4,5 50 310 M0,6.2 L5.2,6.2 M0,3.8 L5.2,3.8'],
  ['equals', 'Equals', '=', 'M0,6.8 L7,6.8 M0,3.2 L7,3.2'],
  ['divide', 'Divide', '÷', 'M0,5 L7,5 D3.5,8 D3.5,2'],
];

/** Centre the glyph left-right; keep the baseline and cap height where they are. */
function glyph(d) {
  const drawing = parsePath(d);
  let x0 = Infinity;
  let x1 = -Infinity;
  for (const [x] of [...drawing.polys.flat(), ...drawing.dots]) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
  }
  return placeDrawing(drawing, { x: -(x0 + x1) / 10, y: -1, size: 1 / 5 });
}

const text = (id, name, cat, sign, d) => drawnShape({
  id, name, cat, label: sign, tags: sign, draw: () => glyph(d), box: false, spacing: 0.12,
});

export const TEXT_SHAPES = [
  ...Object.entries(LETTERS).map(([ch, d]) => text(`letter-${ch.toLowerCase()}`, `Letter ${ch}`, 'letters', ch, d)),
  ...Object.entries(DIGITS).map(([ch, d]) => text(`digit-${ch}`, `Number ${ch}`, 'numbers', ch, d)),
  ...SIGNS.map(([id, name, sign, d]) => text(`sign-${id}`, name, 'numbers', sign, d)),
];
