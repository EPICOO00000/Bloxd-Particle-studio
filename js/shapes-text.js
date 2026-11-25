// Letters, numbers and signs, drawn with single strokes so they read well as
// dots. Every glyph sits on the same lines: y = 0 is the baseline and y = 10 the
// top of a capital, which become -1 and 1 in the shape. Small letters are 6.5
// high and their tails reach down to -3.2, which is below the box every other
// shape fits in: that way words line up on one line. See shape-kit.js for the
// drawing language.

import { drawnShape, parsePath, placeDrawing } from './shape-kit.js';

export const LETTERS = {
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

export const DIGITS = {
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

// [id, name, sign, drawing, heading]
const SIGNS = [
  ['exclaim', 'Exclamation mark', '!', 'M0,10 L0,3.2 D0,0.5', 'Signs'],
  ['question', 'Question mark', '?', 'A3,7.2 2.8 160 -50 Q3,3.8 3,3 D3,0.5', 'Signs'],
  ['hash', 'Hash', '#', 'M2,0 L3,10 M5,0 L6,10 M0.5,3.3 L7,3.3 M1,6.7 L7.5,6.7', 'Signs'],
  ['at', 'At sign', '@', 'A5,5 1.8 0 360 M6.8,6.8 L6.8,4.33 A8.18,4.33 1.38 180 360 A5,5 4.6 -8 300', 'Signs'],
  ['and', 'And sign', '&', 'M7,0 L2.2,6.2 C1,7.8 1.6,10 3.2,10 C4.8,10 5.2,8 3.8,6.6 L1.6,4.6 C-0.6,2.8 0.4,0 3,0 C5,0 6.4,1.8 7,4.6', 'Signs'],
  ['percent', 'Percent', '%', 'M7,10 L1,0 O1.8,8.2 1.7 O6.2,1.8 1.7', 'Maths'],
  ['dollar', 'Dollar', '$', 'A3.25,7 2 20 270 A3.25,3 2 90 -160 M3.25,10 L3.25,0', 'Money'],
  ['euro', 'Euro', '€', 'E4.5,5 4,5 50 310 M0,6.2 L5.2,6.2 M0,3.8 L5.2,3.8', 'Money'],
  ['equals', 'Equals', '=', 'M0,6.8 L7,6.8 M0,3.2 L7,3.2', 'Maths'],
  ['divide', 'Divide', '÷', 'M0,5 L7,5 D3.5,8 D3.5,2', 'Maths'],
];

// The bowl of a, b, d, g, p and q is one arc that meets the stem at two places.
const BOWL_LEFT = 'A3.25,3.25 3.25 26.8 333.2'; // for a stem on the right, at x = 6.15
const BOWL_RIGHT = 'A2.9,3.25 3.25 153.2 -153.2'; // for a stem on the left, at x = 0

export const SMALL = {
  a: `M6.15,6.5 L6.15,0 N ${BOWL_LEFT}`,
  b: `M0,10 L0,0 N ${BOWL_RIGHT}`,
  c: 'A3.25,3.25 3.25 45 315',
  d: `M6.15,10 L6.15,0 N ${BOWL_LEFT}`,
  e: 'M0,3.25 L6.5,3.25 A3.25,3.25 3.25 0 320',
  f: 'A3.6,8.1 1.9 30 180 L1.7,0 M0,6.5 L4.2,6.5',
  g: `M6.15,6.5 L6.15,-0.6 A3.55,-0.6 2.6 0 -150 N ${BOWL_LEFT}`,
  h: 'M0,10 L0,0 M0,3.6 A2.9,3.6 2.9 180 0 L5.8,0',
  i: 'M0,6.5 L0,0 D0,8.8',
  j: 'M2.6,6.5 L2.6,-0.9 A0.3,-0.9 2.3 0 -130 D2.6,8.8',
  k: 'M0,10 L0,0 M5,6.5 L0,2.6 M1.9,4.082 L5.4,0',
  l: 'M0,10 L0,1.6 A1.6,1.6 1.6 180 270',
  m: 'M0,6.5 L0,0 M0,4.1 A2.4,4.1 2.4 180 0 L4.8,0 M4.8,4.1 A7.2,4.1 2.4 180 0 L9.6,0',
  n: 'M0,6.5 L0,0 M0,3.6 A2.9,3.6 2.9 180 0 L5.8,0',
  o: 'E3.25,3.25 3.25,3.25 90 450',
  p: `M0,6.5 L0,-3.2 N ${BOWL_RIGHT}`,
  q: `M6.15,6.5 L6.15,-3.2 N ${BOWL_LEFT}`,
  r: 'M0,6.5 L0,0 M0,3.9 A2.6,3.9 2.6 180 50',
  s: 'E2.6,4.875 2.6,1.625 20 270 E2.6,1.625 2.6,1.625 90 -160',
  t: 'M1.7,9 L1.7,1.7 A3.4,1.7 1.7 180 290 M0,6.5 L4.4,6.5',
  u: 'M0,6.5 L0,2.9 A2.9,2.9 2.9 180 360 L5.8,6.5 M5.8,2.9 L5.8,0',
  v: 'M0,6.5 L2.8,0 L5.6,6.5',
  w: 'M0,6.5 L1.9,0 L3.8,5 L5.7,0 L7.6,6.5',
  x: 'M0,0 L5.2,6.5 M0,6.5 L5.2,0',
  y: 'M0,6.5 L2.919,0 M5.8,6.5 L1.5,-3.2',
  z: 'M0,6.5 L5.2,6.5 L0,0 L5.2,0',
};

// [id, name, sign, drawing, extra search words]
const GREEK = [
  ['alpha', 'Alpha', 'α', 'M6.4,6.5 C5.4,2 4.4,0 2.9,0 C1.2,0 0,1.4 0,3.25 C0,5.1 1.2,6.5 2.9,6.5 C4.4,6.5 5.4,4.5 6.4,0'],
  ['beta', 'Beta', 'β', 'M0,-3 L0,7.7 A2.3,7.7 2.3 180 -90 A2.3,2.7 2.7 90 -148.412'],
  ['gamma', 'Gamma', 'γ', 'M0,6.5 L2.9,-0.6 L5.8,6.5 E2.9,-1.9 0.9,1.3 90 450'],
  ['delta', 'Delta', 'δ', 'E3,3 3,3 50 410 C3.4,6.4 1.4,7.6 1.6,8.8 C1.8,10 3.6,10.2 5.2,9.4'],
  ['epsilon', 'Epsilon', 'ε', 'E3,4.875 2.9,1.625 30 270 E3,1.625 2.9,1.625 90 330'],
  ['zeta', 'Zeta', 'ζ', 'M0.6,10 L5,10 C1.5,7.5 0,5 0,3 C0,0.8 2,0.4 3.6,0 C5.2,-0.4 5.2,-2.4 3.4,-3'],
  ['eta', 'Eta', 'η', 'M0,6.5 L0,0 M0,3.6 A2.9,3.6 2.9 180 0 L5.8,-3.2'],
  ['theta', 'Theta', 'θ', 'E2.9,5 2.9,5 90 450 M0,5 L5.8,5'],
  ['lambda', 'Lambda', 'λ', 'M0,10 Q1.4,10 2.4,7.5 L5.6,0 M2.912,6.3 L0,0'],
  ['mu', 'Mu', 'μ', 'M0,6.5 L0,-3.2 M0,2.9 A2.9,2.9 2.9 180 360 L5.8,6.5 M5.8,2.9 L5.8,0', 'micro'],
  ['xi', 'Xi', 'ξ', 'M0.8,10 L5,10 C2,9.6 0.6,8.6 0.6,7.4 C0.6,6.2 2.2,5.6 4.4,5.6 C1.6,5.4 0,4.2 0,2.6 C0,0.9 2,0.3 3.6,0 C5.2,-0.3 5.2,-2.4 3.4,-3'],
  ['pi', 'Pi', 'π', 'M0,6.5 L7,6.5 M1.8,6.5 L1.8,0 M5,6.5 L5,1.2 A6.2,1.2 1.2 180 270', 'maths circle'],
  ['rho', 'Rho', 'ρ', 'M0,-3.2 L0,3.25 A2.9,3.25 2.9 180 -180'],
  ['sigma', 'Sigma', 'σ', 'E2.9,2.9 2.9,2.9 90 450 M2.9,5.8 L7,5.8'],
  ['tau', 'Tau', 'τ', 'M0,6.5 L6,6.5 M3,6.5 L3,1.4 A4.4,1.4 1.4 180 290'],
  ['phi', 'Phi', 'φ', 'E3.1,3.25 3.1,3.25 90 450 M3.1,9 L3.1,-3.2'],
  ['psi', 'Psi', 'ψ', 'M0,6.5 L0,3.6 A3,3.6 3 180 360 L6,6.5 M3,9 L3,-3.2'],
  ['omega', 'Omega', 'ω', 'M1.4,6.5 C-0.6,4.5 -0.4,0 2,0 C3.2,0 3.8,1.4 3.8,3.4 C3.8,1.4 4.4,0 5.6,0 C8,0 8.2,4.5 6.2,6.5'],
  ['cap-gamma', 'Capital gamma', 'Γ', 'M0,0 L0,10 L5.6,10'],
  ['cap-delta', 'Capital delta', 'Δ', 'M0,0 L3.6,10 L7.2,0 Z', 'change'],
  ['cap-lambda', 'Capital lambda', 'Λ', 'M0,0 L3.6,10 L7.2,0'],
  ['cap-xi', 'Capital xi', 'Ξ', 'M0,10 L6.4,10 M1,5 L5.4,5 M0,0 L6.4,0'],
  ['cap-sigma', 'Capital sigma', 'Σ', 'M6.4,10 L0,10 L3.6,5 L0,0 L6.4,0', 'sum maths'],
  ['cap-omega', 'Capital omega', 'Ω', 'M0,0 L2.46,0 L2.46,1.55 A3.9,5.5 4.2 250 -70 L5.34,0 L7.8,0', 'ohm end'],
  ['cap-theta', 'Capital theta', 'Θ', 'E3.75,5 3.75,5 90 450 M1.6,5 L5.9,5'],
  ['cap-pi', 'Capital pi', 'Π', 'M-0.6,10 L7,10 M0.6,10 L0.6,0 M5.8,10 L5.8,0', 'product maths'],
  ['cap-phi', 'Capital phi', 'Φ', 'E3.75,5 3.75,3.3 90 450 M3.75,10 L3.75,0'],
  ['cap-psi', 'Capital psi', 'Ψ', 'M0,10 L0,6.6 A3.3,6.6 3.3 180 360 L6.6,10 M3.3,10 L3.3,0'],
];

// Old Germanic letters, the Elder Futhark (those that are not just a line, a
// cross, an arrow or a diamond) and two Anglo-Saxon ones. [name, drawing]
const RUNES = [
  ['Fehu', 'M0,0 L0,10 M0,6.5 L4,10 M0,3 L4,6.5'],
  ['Uruz', 'M0,0 L0,10 L4.5,6.5 L4.5,0'],
  ['Thurisaz', 'M0,0 L0,10 M0,7.5 L3.5,5 L0,2.5'],
  ['Ansuz', 'M0,0 L0,10 L4,7 M0,6.5 L4,3.5'],
  ['Raido', 'M0,0 L0,10 L4,7.5 L0,5 L4.5,0'],
  ['Wunjo', 'M0,0 L0,10 L4,7.5 L0,5'],
  ['Hagalaz', 'M0,0 L0,10 M5,0 L5,10 M0,6.5 L5,3.5'],
  ['Nauthiz', 'M2.5,0 L2.5,10 M0,6.5 L5,3.5'],
  ['Jera', 'M3.2,9.5 L0,6.5 L3.2,3.5 M2.8,6.5 L6,3.5 L2.8,0.5'],
  ['Eihwaz', 'M-0.2,2.4 L2.2,0 L2.2,10 L4.6,7.6'],
  ['Perthro', 'M5,10 L2.6,7.6 L0,10 L0,0 L2.6,2.4 L5,0'],
  ['Algiz', 'M3,0 L3,10 M0,10 L3,5.5 L6,10'],
  ['Sowilo', 'M4,10 L0,6.5 L4,3.5 L0,0'],
  ['Berkanan', 'M0,0 L0,10 L4,7.5 L0,5 L4,2.5 L0,0'],
  ['Mannaz', 'M0,0 L0,10 L6,5 M6,0 L6,10 L0,5'],
  ['Laguz', 'M0,0 L0,10 L4,6.5'],
  ['Dagaz', 'M0,0 L0,10 L6,0 L6,10 L0,0'],
  ['Othala', 'M6.4,6.6 L3.2,10 L0,6.6 L6.2,0 M6.4,6.6 L0.2,0'],
  ['Gar', 'M0,0 L7,10 M0,10 L7,0 M3.5,8.7 L6.09,5 L3.5,1.3 L0.91,5 Z'],
  ['Os', 'M0,0 L0,10 L3,7.6 L4.6,9.4 M0,6 L3,3.6 L4.6,5.4'],
];

// [id, name, sign, drawing, heading, extra search words]
const MORE_SIGNS = [
  ['brackets', 'Round brackets', '( )', 'M-2,10 B-2,0 0.3 |', 'Signs', 'parentheses'],
  ['square-brackets', 'Square brackets', '[ ]', 'M-1.6,10 L-3.4,10 L-3.4,0 L-1.6,0 |', 'Signs'],
  ['curly-brackets', 'Curly brackets', '{ }', 'M-1.4,10 C-2.6,10 -2.6,9 -2.6,8 L-2.6,6.4 C-2.6,5.6 -3,5 -3.8,5 C-3,5 -2.6,4.4 -2.6,3.6 L-2.6,2 C-2.6,1 -2.6,0 -1.4,0 |', 'Signs', 'braces'],
  ['angle-brackets', 'Angle brackets', '< >', 'M-1.4,9 L-4,5 L-1.4,1 |', 'Signs', 'less greater than'],
  ['copyright', 'Copyright sign', '©', 'O0,5 5 A0,5 2.6 50 310', 'Signs'],
  ['registered', 'Registered sign', '®', 'O0,5 5 M-1.6,2.2 L-1.6,7.8 L0.2,7.8 A0.2,6.3 1.5 90 -90 L-1.6,4.8 M0.2,4.8 L2,2.2', 'Signs', 'trademark'],
  ['paragraph', 'Paragraph sign', '¶', 'M2.8,0 L2.8,10 L5.2,10 L5.2,0 N A2.8,7.3 2.7 90 270', 'Signs', 'pilcrow'],
  ['pound', 'Pound', '£', 'A3.6,7.6 2.4 20 180 L1.2,2.6 Q1.2,0.8 0,0 L6,0 M0,5 L4,5', 'Money', 'money sterling'],
  ['yen', 'Yen', '¥', 'M0,10 L3.2,5 L6.4,10 M3.2,5 L3.2,0 M0.8,4 L5.6,4 M0.8,2 L5.6,2', 'Money', 'money yuan'],
  ['cent', 'Cent', '¢', 'A3.4,5 3.2 50 310 M3.4,9.6 L3.4,0.4', 'Money', 'money'],
  ['rupee', 'Rupee', '₹', 'M0,10 L6,10 M0,7.4 L6,7.4 M1.6,10 A1.6,7.4 2.6 90 -90 L0,4.8 L4.6,0', 'Money', 'money'],
  ['bitcoin', 'Bitcoin', '₿', 'M0,1.2 L0,8.8 L3,8.8 A3,6.9 1.9 90 -90 L0,5 M3,5 L3.4,5 A3.4,3.1 1.9 90 -90 L0,1.2 M1.2,8.8 L1.2,10 M3,8.8 L3,10 M1.2,1.2 L1.2,0 M3,1.2 L3,0', 'Money', 'money crypto'],
  ['won', 'Won', '₩', 'M0,10 L1.8,0 L4,7 L6.2,0 L8,10 M-0.6,6.2 L8.6,6.2 M-0.6,4 L8.6,4', 'Money', 'money'],
  ['plus-minus', 'Plus or minus', '±', 'M0,6.5 L6,6.5 M3,9.5 L3,3.5 M0,1 L6,1', 'Maths'],
  ['not-equal', 'Not equal', '≠', 'M0,6.8 L7,6.8 M0,3.2 L7,3.2 M5,9.4 L2,0.6', 'Maths'],
  ['approx', 'About equal', '≈', 'M0,6 C1.2,8 2.4,8 3.5,6.6 C4.6,5.2 5.8,5.2 7,7.2 M0,2.8 C1.2,4.8 2.4,4.8 3.5,3.4 C4.6,2 5.8,2 7,4', 'Maths', 'approximately'],
  ['less-equal', 'Less or equal', '≤', 'M6.4,9.4 L0,6 L6.4,2.6 M0,0.6 L6.4,0.6', 'Maths'],
  ['greater-equal', 'Greater or equal', '≥', 'M0,9.4 L6.4,6 L0,2.6 M0,0.6 L6.4,0.6', 'Maths'],
  ['root', 'Square root', '√', 'M0,4.4 L1.4,5.2 L3.2,0 L5.6,10 L9.4,10', 'Maths'],
  ['integral', 'Integral', '∫', 'A5,8.2 1.6 30 180 L3.4,1.6 A1.8,1.6 1.6 0 -150', 'Maths'],
  ['angle', 'Angle sign', '∠', 'M7,7 L0,0 L8,0 A0,0 3.4 0 45', 'Maths'],
  ['squared', 'X squared', 'x²', 'M0,0 L5,6.5 M0,6.5 L5,0 N A7.4,8.6 1.2 160 -40 L6.2,6.6 L8.8,6.6', 'Maths', 'power'],
  ['half', 'One half', '½', 'M0.6,8.6 L1.8,10 L1.8,5.6 M6.6,10 L1.6,0 N A6.6,3.2 1.4 160 -40 L5.2,0 L8.2,0', 'Maths', 'fraction'],
  ['quarter', 'One quarter', '¼', 'M0.6,8.6 L1.8,10 L1.8,5.6 M6.6,10 L1.6,0 M7.4,0 L7.4,4.4 L5,1.4 L8.8,1.4', 'Maths', 'fraction'],
  ['three-quarters', 'Three quarters', '¾', 'M0.5,10 L2.5,10 L1.3,8.2 A1.3,6.9 1.3 90 -150 M7,10 L2,0 M7.8,0 L7.8,4.4 L5.4,1.4 L9.2,1.4', 'Maths', 'fraction'],
  ['tally', 'Tally marks', '卌', 'M0,0 L0,8 M2,0 L2,8 M4,0 L4,8 M6,0 L6,8 M-1.4,1.6 L7.4,6.4', 'Maths', 'count five score'],
];

// The numbers of a digital clock: seven bars, lit or not. a is the top bar,
// then clockwise b, c, d, e, f, and g is the one in the middle.
export const BARS = {
  a: 'M0.6,10 L4.4,10', b: 'M5,9.4 L5,5.6', c: 'M5,4.4 L5,0.6', d: 'M0.6,0 L4.4,0', e: 'M0,0.6 L0,4.4', f: 'M0,5.6 L0,9.4', g: 'M0.6,5 L4.4,5',
};
const DIGITAL = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];

// ---------------------------------------------------------------- accents
//
// A letter with an accent is the plain letter with a mark above it (or, for the
// cedilla, below it). A small letter has room for the mark inside the box. On a
// capital the mark stands above the box (`rise`), so that É lines up with E.

const tidy = (v) => Number(v.toFixed(3));
export const MARKS = {
  grave: (x, y) => `M${tidy(x + 0.9)},${y} L${tidy(x - 0.9)},${tidy(y + 1.9)}`,
  acute: (x, y) => `M${tidy(x - 0.9)},${y} L${tidy(x + 0.9)},${tidy(y + 1.9)}`,
  circ: (x, y) => `M${tidy(x - 1.5)},${y} L${x},${tidy(y + 1.7)} L${tidy(x + 1.5)},${y}`,
  tilde: (x, y) => `M${tidy(x - 1.9)},${tidy(y + 0.4)} C${tidy(x - 1.3)},${tidy(y + 1.9)} ${tidy(x - 0.5)},${tidy(y + 1.7)} ${x},${tidy(y + 0.95)} C${tidy(x + 0.5)},${tidy(y + 0.2)} ${tidy(x + 1.3)},${y} ${tidy(x + 1.9)},${tidy(y + 1.5)}`,
  uml: (x, y) => `D${tidy(x - 1.2)},${tidy(y + 0.9)} D${tidy(x + 1.2)},${tidy(y + 0.9)}`,
  ring: (x, y) => `O${x},${tidy(y + 1.05)} 0.95`,
  cedil: (x) => `M${x},0 L${x},-0.9 Q${tidy(x + 1.25)},-1.3 ${tidy(x + 0.75)},-2.3 Q${tidy(x + 0.25)},-3 ${tidy(x - 0.85)},-2.7`,
};
// search words; the mark that leans back has none of its own, because its usual name would
// answer to "small letter g" (its id still ends in "grave")
const MARK_WORDS = {
  grave: 'accent', acute: 'acute accent', circ: 'circumflex accent hat', tilde: 'tilde accent wave',
  uml: 'umlaut diaeresis dots accent', ring: 'ring accent', cedil: 'cedilla accent',
};
// where the mark sits, left to right
const MIDDLE = { a: 3.5, c: 4, e: 2.9, i: 2, n: 3.25, o: 3.75, u: 3.25 };
const MIDDLE_SMALL = { a: 3.1, c: 3.25, e: 3.25, i: 0, n: 2.9, o: 3.25, u: 2.9 };

// [letter, mark, small sign, capital sign]; the ids are the names these have in HTML (small-eacute, letter-eacute)
const ACCENTED = [
  ['a', 'grave', 'à', 'À'], ['a', 'acute', 'á', 'Á'], ['a', 'circ', 'â', 'Â'], ['a', 'tilde', 'ã', 'Ã'], ['a', 'uml', 'ä', 'Ä'], ['a', 'ring', 'å', 'Å'],
  ['c', 'cedil', 'ç', 'Ç'],
  ['e', 'grave', 'è', 'È'], ['e', 'acute', 'é', 'É'], ['e', 'circ', 'ê', 'Ê'], ['e', 'uml', 'ë', 'Ë'],
  ['i', 'grave', 'ì', 'Ì'], ['i', 'acute', 'í', 'Í'], ['i', 'circ', 'î', 'Î'], ['i', 'uml', 'ï', 'Ï'],
  ['n', 'tilde', 'ñ', 'Ñ'],
  ['o', 'grave', 'ò', 'Ò'], ['o', 'acute', 'ó', 'Ó'], ['o', 'circ', 'ô', 'Ô'], ['o', 'tilde', 'õ', 'Õ'], ['o', 'uml', 'ö', 'Ö'],
  ['u', 'grave', 'ù', 'Ù'], ['u', 'acute', 'ú', 'Ú'], ['u', 'circ', 'û', 'Û'], ['u', 'uml', 'ü', 'Ü'],
];

function accented(letter, mark, small) {
  const plain = small ? (letter === 'i' ? 'M0,6.5 L0,0' : SMALL[letter]) : LETTERS[letter.toUpperCase()]; // an i loses its dot
  const x = (small ? MIDDLE_SMALL : MIDDLE)[letter];
  return `${plain} N ${mark === 'cedil' ? MARKS.cedil(x) : MARKS[mark](x, small ? 7.7 : 11)}`;
}

// Letters that are two in one, or struck through. [id, name, sign, drawing, search words]
const JOINED_CAPITALS = [
  ['aelig', 'Letter Æ', 'Æ', 'M0,0 L4,10 L8.4,10 M4,10 L4,0 L8.4,0 M2,5 L7.6,5', 'ae ash nordic'],
  ['oelig', 'Letter Œ', 'Œ', 'E4.4,5 4.4,5 90 270 L8.8,0 M4.4,0 L4.4,10 L8.8,10 M4.4,5 L7.8,5', 'oe french'],
  ['oslash', 'Letter Ø', 'Ø', 'E3.75,5 3.75,5 90 450 M0.6,0 L6.9,10', 'slashed o nordic'],
];
/** Every capital letter by its sign, the ones with an accent too ("É", "Ç", "Ñ"): for writing words. */
export const CAPITALS = {
  ...LETTERS,
  ...Object.fromEntries(ACCENTED.map(([letter, mark, , capital]) => [capital, accented(letter, mark, false)])),
  ...Object.fromEntries(JOINED_CAPITALS.map(([, , capital, d]) => [capital, d])),
};
const JOINED_SMALL = [
  ['aelig', 'Small letter æ', 'æ', 'M4.75,6.5 L4.75,0 N E2.5,3.25 2.5,3.25 25.84 334.16 N M4.75,3.25 L9.5,3.25 E7,3.25 2.5,3.25 0 154.16 N E7,3.25 2.5,3.25 205.84 320', 'ae ash nordic'],
  ['oelig', 'Small letter œ', 'œ', 'E2.6,3.25 2.6,3.25 90 450 M5.2,3.25 L9.6,3.25 E7,3.25 2.6,3.25 0 147.8 N E7,3.25 2.6,3.25 212.2 320', 'oe french'],
  ['oslash', 'Small letter ø', 'ø', 'E3.25,3.25 3.25,3.25 90 450 M0.5,-0.3 L6,6.8', 'slashed o nordic'],
  ['szlig', 'Small letter ß', 'ß', 'M0,0 L0,7.7 A2.3,7.7 2.3 180 -90 A2.3,2.7 2.7 90 -148.4', 'ss sharp s eszett deutsch'],
];

// ---------------------------------------------------------------- more numbers and signs

// Roman numerals, the way a clock face has them: with a bar above and below.
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function roman(numeral) {
  let x = 0;
  let d = '';
  for (const ch of numeral) {
    if (ch === 'I') d += `M${x},0 L${x},10 `;
    else if (ch === 'V') d += `M${x},10 L${tidy(x + 2)},0 L${tidy(x + 4)},10 `;
    else d += `M${x},0 L${tidy(x + 4)},10 M${x},10 L${tidy(x + 4)},0 `;
    x = tidy(x + (ch === 'I' ? 1.4 : 5.4));
  }
  const end = tidy(x - 1.4 + 0.8);
  return `${d}M-0.8,10 L${end},10 M-0.8,0 L${end},0`;
}

// The six faces of a dice: where the spots are, on a 3 by 3 grid.
const SPOTS = ['', '5', '37', '357', '1379', '13579', '134679'];
const DICE_FACE = 'M-3.4,5 L3.4,5 Q5,5 5,3.4 L5,-3.4 Q5,-5 3.4,-5 L-3.4,-5 Q-5,-5 -5,-3.4 L-5,3.4 Q-5,5 -3.4,5 Z';
const diceFace = (n) => `${DICE_FACE} ${[...SPOTS[n]].map((k) => `D${((k - 1) % 3 - 1) * 2.6},${(1 - Math.floor((k - 1) / 3)) * 2.6}`).join(' ')}`;

const STOP = 'O0,0.6 0.6';
const COMMA = 'O0,0.6 0.6 M0.6,0.6 Q0.7,-1.1 -0.6,-2';

// [id, name, sign, drawing, search words, extra fields]. The comma and the semicolon hang below the line.
const PUNCTUATION = [
  ['stop', 'Full stop', '.', STOP, 'period dot point', { count: 12, min: 4 }],
  ['comma', 'Comma', ',', COMMA, 'pause', { count: 16, min: 6, drop: 0.42 }],
  ['colon', 'Colon', ':', `${STOP} O0,5.4 0.6`, 'two dots time', { count: 16, min: 6 }],
  ['semicolon', 'Semicolon', ';', `${COMMA} O0,5.4 0.6`, 'dot comma', { count: 22, min: 8, drop: 0.42 }],
  ['ellipsis', 'Ellipsis', '…', `${STOP} O2.8,0.6 0.6 O5.6,0.6 0.6`, 'three dots wait', { count: 21, min: 9 }],
  ['apostrophe', 'Apostrophe', '\'', 'M0,10 L0,7.2', 'single quote', { count: 12, min: 3 }],
  ['quotes', 'Quotation marks', '"', 'M0,10 L0,7.2 M1.9,10 L1.9,7.2', 'double quote speech', { count: 14, min: 4 }],
  ['guillemet-left', 'Left guillemet', '«', 'M2.6,7.2 L0,4.4 L2.6,1.6 M5.6,7.2 L3,4.4 L5.6,1.6', 'french quotes angle'],
  ['guillemet-right', 'Right guillemet', '»', 'M0,7.2 L2.6,4.4 L0,1.6 M3,7.2 L5.6,4.4 L3,1.6', 'french quotes angle'],
  ['hyphen', 'Hyphen', '-', 'M0,4 L3.4,4', 'dash minus', { count: 12, min: 3 }],
  ['underscore', 'Underscore', '_', 'M0,0 L6,0', 'underline low line', { count: 14, min: 3 }],
  ['slash', 'Slash', '/', 'M0,0 L4.6,10', 'stroke divide or'],
  ['backslash', 'Backslash', '\\', 'M0,10 L4.6,0', 'reverse stroke'],
  ['asterisk', 'Asterisk', '*', 'M0,5.4 L0,9.6 M-1.82,6.45 L1.82,8.55 M-1.82,8.55 L1.82,6.45', 'star times note'],
  ['tilde', 'Tilde', '~', 'M0,4.4 C1,6.4 2.2,6.2 3.2,5 C4.2,3.8 5.4,3.6 6.4,5.6', 'wave about'],
  ['degree', 'Degree sign', '°', 'O0,8.6 1.4', 'temperature angle celsius'],
  ['exclaim-turned', 'Upside-down exclamation mark', '¡', 'M0,0 L0,6.8 D0,9.5', 'spanish inverted'],
  ['question-turned', 'Upside-down question mark', '¿', 'A3,2.8 2.8 340 130 Q3,6.2 3,7 D3,9.5', 'spanish inverted'],
];

// [id, name, sign, drawing, search words]
const MORE_MATHS = [
  ['less', 'Less than', '<', 'M5.6,8.6 L0,5 L5.6,1.4', 'smaller compare'],
  ['greater', 'Greater than', '>', 'M0,8.6 L5.6,5 L0,1.4', 'bigger more compare'],
  ['third', 'One third', '⅓', 'M0.6,8.6 L1.8,10 L1.8,5.6 M6.6,10 L1.6,0 M6,4.4 L8,4.4 L6.8,2.6 A6.8,1.3 1.3 90 -150', 'fraction'],
  ['two-thirds', 'Two thirds', '⅔', 'A1.4,8.6 1.4 160 -40 L0,5.6 L3,5.6 M6.6,10 L1.6,0 M6,4.4 L8,4.4 L6.8,2.6 A6.8,1.3 1.3 90 -150', 'fraction'],
];

/** Centre the glyph left-right; keep the baseline and cap height where they are. `d` is the text of a drawing, a drawing, or a function that makes one. */
export function glyph(d) {
  const drawing = typeof d === 'string' ? parsePath(d) : typeof d === 'function' ? d() : d;
  let x0 = Infinity;
  let x1 = -Infinity;
  for (const [x] of [...drawing.polys.flat(), ...drawing.dots]) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
  }
  return placeDrawing(drawing, { x: -(x0 + x1) / 10, y: -1, size: 1 / 5 });
}

export const text = (id, name, cat, sign, d, extra = {}) => drawnShape({
  id, name, cat, label: sign, tags: sign, draw: () => glyph(d), box: false, spacing: 0.12, ...extra,
});

/** Small letters hang below the box by this much (the tails of g, j, p, q and y). */
export const DROP = 0.64;
/** The accent of a capital letter stands above the box by this much. */
export const RISE = 0.6;

export const TEXT_SHAPES = [
  ...Object.entries(LETTERS).map(([ch, d]) => text(`letter-${ch.toLowerCase()}`, `Letter ${ch}`, 'letters', ch, d, { sub: 'Capital letters' })),
  ...Object.entries(SMALL).map(([ch, d]) => text(`small-${ch}`, `Small letter ${ch}`, 'letters', ch, d, {
    sub: 'Small letters', tags: `${ch} lowercase little`, drop: DROP,
  })),
  ...GREEK.map(([id, name, sign, d, words]) => text(`greek-${id}`, name, 'letters', sign, d, {
    sub: 'Greek letters', tags: `${sign} greek letter${words ? ` ${words}` : ''}`, drop: id.startsWith('cap-') ? 0 : DROP,
  })),
  ...RUNES.map(([name, d]) => text(`rune-${name.toLowerCase()}`, `${name} rune`, 'letters', name, d, {
    sub: 'Runes', tags: 'runes viking magic futhark letter',
  })),
  ...Object.entries(DIGITS).map(([ch, d]) => text(`digit-${ch}`, `Number ${ch}`, 'numbers', ch, d, { sub: 'Numbers' })),
  ...DIGITAL.map((bars, n) => text(`digital-${n}`, `Digital ${n}`, 'numbers', String(n), [...bars].map((b) => BARS[b]).join(' '), {
    sub: 'Digital numbers', tags: `${n} clock display led seven segment`,
  })),
  ...SIGNS.map(([id, name, sign, d, sub]) => text(`sign-${id}`, name, 'numbers', sign, d, { sub })),
  ...MORE_SIGNS.map(([id, name, sign, d, sub, words]) => text(`sign-${id}`, name, 'numbers', sign, d, {
    sub, tags: `${sign}${words ? ` ${words}` : ''}`,
  })),
  // added when the library grew to 1,624 shapes
  ...ACCENTED.map(([letter, mark, , sign]) => text(`letter-${letter}${mark}`, `Letter ${sign}`, 'letters', sign, accented(letter, mark, false), {
    sub: 'Accented capitals', tags: `${sign} ${letter} ${MARK_WORDS[mark]}`, ...(mark === 'cedil' ? { drop: DROP } : { rise: RISE }),
  })),
  ...JOINED_CAPITALS.map(([id, name, sign, d, words]) => text(`letter-${id}`, name, 'letters', sign, d, { sub: 'Accented capitals', tags: `${sign} ${words}` })),
  ...ACCENTED.map(([letter, mark, sign]) => text(`small-${letter}${mark}`, `Small letter ${sign}`, 'letters', sign, accented(letter, mark, true), {
    sub: 'Accented small letters', tags: `${sign} ${letter} ${MARK_WORDS[mark]} lowercase little`, drop: DROP,
  })),
  ...JOINED_SMALL.map(([id, name, sign, d, words]) => text(`small-${id}`, name, 'letters', sign, d, {
    sub: 'Accented small letters', tags: `${sign} ${words} lowercase little`, drop: DROP,
  })),
  ...ROMAN.map((numeral, i) => text(`roman-${i + 1}`, `Roman ${i + 1}`, 'numbers', numeral, roman(numeral), {
    sub: 'Roman numerals', tags: `${numeral} ${i + 1} numeral clock latin`,
  })),
  ...[1, 2, 3, 4, 5, 6].map((n) => drawnShape({
    id: `dice-${n}`, name: `Dice face ${n}`, cat: 'numbers', sub: 'Dice', draw: diceFace(n), tags: `${n} die spots pips game roll`,
  })),
  ...PUNCTUATION.map(([id, name, sign, d, words, extra]) => text(`sign-${id}`, name, 'numbers', sign, d, {
    sub: 'Punctuation', tags: `${sign} ${words}`, ...extra,
  })),
  ...MORE_MATHS.map(([id, name, sign, d, words]) => text(`sign-${id}`, name, 'numbers', sign, d, { sub: 'Maths', tags: `${sign} ${words}` })),
];
