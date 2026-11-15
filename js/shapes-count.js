// More for the Numbers tab: numbers of two digits and more, numbers in a ring,
// scores, the 28 dominoes, a deck of cards, the hours on a clock, Mayan
// numbers, and the signs that were still missing. Numbers and scores are
// written with the stroke letters of shapes-text.js (see wordDrawing).

import { drawnShape, parsePath, placeDrawing, joinDrawings, fitDrawing, RAD, fix } from './shape-kit.js';
import { LETTERS, DIGITS, SMALL, BARS, text } from './shapes-text.js';
import { wordDrawing } from './shapes-words.js';

// ---------------------------------------------------------------- numbers and scores

const SCORE_SIGNS = {
  '+': 'M0,5 L6,5 M3,2 L3,8',
  '\u2212': 'M0,5 L5,5',
  '\u00D7': 'M0.4,2.2 L5.6,7.8 M0.4,7.8 L5.6,2.2',
  '%': 'M7,10 L1,0 O1.8,8.2 1.7 O6.2,1.8 1.7',
  '#': 'M2,0 L3,10 M5,0 L6,10 M0.5,3.3 L7,3.3 M1,6.7 L7.5,6.7',
};
const sign = (ch) => DIGITS[ch] || SCORE_SIGNS[ch] || SMALL[ch] || LETTERS[ch];
const written = (what) => wordDrawing(what, sign);

// Written small (on a card, in a ring), four numbers are drawn another way. In the usual 3, 6, 8 and 9 two
// curves touch without crossing, and at a small size the particles on either side of that spot sit on top of each other.
const SMALL_DIGITS = {
  3: 'M0.4,10 L5.6,10 L2.6,6.2 A2.7,3.1 3.1 92 -150',
  6: 'O3,3 3 M0.88,5.12 Q1.6,8.6 4.8,10',
  8: 'M3,5.2 C6.4,7.4 5,10 3,10 C1,10 -0.4,7.4 3,5.2 C6.8,2.8 5.4,0 3,0 C0.6,0 -0.8,2.8 3,5.2',
  9: 'O3,7 3 M5.12,4.88 Q4.4,1.4 1.2,0',
};
const writtenSmall = (what) => wordDrawing(what, (ch) => SMALL_DIGITS[ch] || sign(ch));

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const TEENS = ['ten', 'eleven', 'twelve dozen', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const inWords = (n) => {
  if (n === 100) return 'hundred';
  if (n === 1000) return 'thousand';
  if (n < 20) return TEENS[n - 10];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
};

// 10 to 31 (every day of a month), then the tens, a hundred and a thousand
const BIGGER = [...Array.from({ length: 22 }, (_, i) => i + 10), 40, 50, 60, 70, 80, 90, 100, 1000];

const bigger = BIGGER.map((n) => drawnShape({
  id: `number-${n}`, name: `Number ${n}`, cat: 'numbers', sub: 'Bigger numbers', label: String(n), tags: `${n} ${inWords(n)} count`,
  draw: () => written(String(n)), count: Math.min(140, 32 * String(n).length),
}));

const circled = Array.from({ length: 20 }, (_, i) => i + 1).map((n) => drawnShape({
  id: `circled-${n}`, name: `Circled ${n}`, cat: 'numbers', sub: 'Circled numbers', box: false, tags: `${n} ring round badge level stage checkpoint`,
  draw: () => joinDrawings(parsePath('O0,0 1'), placeDrawing(fitDrawing(writtenSmall(String(n))), { size: n > 9 ? 0.6 : 0.5 })),
}));

// [id, name, what is written, search words]
const SCORES = [
  ['plus-1', 'Plus 1', '+1', 'one point bonus gain'], ['plus-2', 'Plus 2', '+2', 'two points bonus gain'],
  ['plus-3', 'Plus 3', '+3', 'three points bonus gain'], ['plus-5', 'Plus 5', '+5', 'five points bonus gain'],
  ['plus-10', 'Plus 10', '+10', 'ten points bonus gain'], ['plus-25', 'Plus 25', '+25', 'points bonus gain'],
  ['plus-50', 'Plus 50', '+50', 'fifty points bonus gain'], ['plus-100', 'Plus 100', '+100', 'hundred points bonus gain'],
  ['minus-1', 'Minus 1', '\u22121', '-1 one point lose damage'], ['minus-5', 'Minus 5', '\u22125', '-5 five points lose damage'],
  ['minus-10', 'Minus 10', '\u221210', '-10 ten points lose damage'],
  ['times-2', 'Times 2', '\u00D72', 'double multiplier combo'], ['times-3', 'Times 3', '\u00D73', 'triple multiplier combo'],
  ['times-5', 'Times 5', '\u00D75', 'multiplier combo'], ['times-10', 'Times 10', '\u00D710', 'multiplier combo'],
  ['first', 'First place', '1st', 'winner gold rank podium'], ['second', 'Second place', '2nd', 'silver rank podium'],
  ['third', 'Third place', '3rd', 'bronze rank podium'], ['number-one', 'Number one', '#1', 'best top first'],
  ['percent-50', 'Fifty percent', '50%', 'half sale'], ['percent-100', 'Hundred percent', '100%', 'full complete all'],
  ['one-up', 'One up', '1UP', 'extra life arcade'],
];

const scores = SCORES.map(([id, name, what, more]) => drawnShape({
  id: `score-${id}`, name, cat: 'numbers', sub: 'Scores', label: what, tags: `${what} ${more}`,
  draw: () => writtenSmall(what), count: Math.min(140, Math.max(60, 28 * what.length)),
}));

// ---------------------------------------------------------------- more Roman and digital numbers

// The letters of a Roman number, each [drawing from x = 0, its width], with a bar above and below as on a clock face.
const ROMAN_LETTER = { I: ['M0,0 L0,10', 0], V: ['M0,10 L2,0 L4,10', 4], X: ['M0,0 L4,10 M0,10 L4,0', 4] };
function roman(numeral) {
  let x = 0;
  const parts = [];
  for (const ch of numeral) {
    const [d, width] = ROMAN_LETTER[ch];
    parts.push(placeDrawing(parsePath(d), { x }));
    x += width + 1.4;
  }
  const end = x - 1.4 + 0.8;
  return joinDrawings(...parts, parsePath(`M-0.8,10 L${fix(end)},10 M-0.8,0 L${fix(end)},0`));
}

// [number, how it is written, the number in words]
const MORE_ROMAN = [
  [13, 'XIII', 'thirteen'], [14, 'XIV', 'fourteen'], [15, 'XV', 'fifteen'], [16, 'XVI', 'sixteen'],
  [17, 'XVII', 'seventeen'], [18, 'XVIII', 'eighteen'], [19, 'XIX', 'nineteen'], [20, 'XX', 'twenty'],
];
const romans = MORE_ROMAN.map(([n, numeral, words]) => drawnShape({
  id: `roman-${n}`, name: `Roman ${n}`, cat: 'numbers', sub: 'Roman numerals', label: numeral, draw: () => roman(numeral), spacing: 0.12,
  tags: `${numeral} ${n} ${words} numeral latin`,
}));

// The six letters that count on from 9 on a digital display (10 to 15 when counting in sixteens).
const DIGITAL_LETTERS = { A: 'abcefg', b: 'cdefg', C: 'adef', d: 'bcdeg', E: 'adefg', F: 'aefg' };
const digitals = Object.entries(DIGITAL_LETTERS).map(([ch, bars], i) => text(`digital-${ch.toLowerCase()}`, `Digital ${ch.toUpperCase()}`, 'numbers', ch, [...bars].map((b) => BARS[b]).join(' '), {
  sub: 'Digital numbers', tags: `${ch} ${10 + i} hex sixteen display led seven segment`,
}));

// ---------------------------------------------------------------- dominoes

const SPOTS = ['', '5', '37', '357', '1379', '13579', '134679']; // the places on a 3 by 3 grid, as on a dice
const TILE = 'M-8.6,5 L8.6,5 Q10,5 10,3.6 L10,-3.6 Q10,-5 8.6,-5 L-8.6,-5 Q-10,-5 -10,-3.6 L-10,3.6 Q-10,5 -8.6,5 Z M0,5 L0,-5';
const spots = (n, cx) => [...SPOTS[n]].map((k) => ` D${fix(cx + (((k - 1) % 3) - 1) * 2.5)},${fix((1 - Math.floor((k - 1) / 3)) * 2.5)}`).join('');

const dominoes = [];
for (let a = 0; a <= 6; a++) {
  for (let b = a; b <= 6; b++) {
    dominoes.push(drawnShape({
      id: `domino-${a}-${b}`, name: `Domino ${a}-${b}`, cat: 'numbers', sub: 'Dominoes', spacing: 0.1,
      draw: `${TILE}${spots(a, -5)}${spots(b, 5)}`, tags: `${a} ${b} tile spots pips game bones${a === b ? ' double' : ''}${a + b === 0 ? ' blank' : ''}`,
    }));
  }
}

// ---------------------------------------------------------------- playing cards

const CARD = 'M-5.6,10 L5.6,10 Q7,10 7,8.6 L7,-8.6 Q7,-10 5.6,-10 L-5.6,-10 Q-7,-10 -7,-8.6 L-7,8.6 Q-7,10 -5.6,10 Z';
// [name, sign, drawing in a box that is 10 high]
const SUITS = [
  ['spades', '\u2660', 'M0,4.8 C2,2.8 4.8,0.8 4.8,-1.4 C4.8,-3 3.6,-3.8 2.5,-3.8 C1.4,-3.8 0.9,-3 0,-2.2 C-0.9,-3 -1.4,-3.8 -2.5,-3.8 C-3.6,-3.8 -4.8,-3 -4.8,-1.4 C-4.8,0.8 -2,2.8 0,4.8 M0,-2.2 L0,-4.8 M-1.6,-4.8 L1.6,-4.8'],
  ['hearts', '\u2665', 'M0,-4.5 C-2,-2.5 -4.8,-0.5 -4.8,2 C-4.8,3.8 -3.5,4.8 -2.3,4.8 C-1.1,4.8 0,3.9 0,2.6 C0,3.9 1.1,4.8 2.3,4.8 C3.5,4.8 4.8,3.8 4.8,2 C4.8,-0.5 2,-2.5 0,-4.5'],
  ['diamonds', '\u2666', 'M0,5 L3.6,0 L0,-5 L-3.6,0 Z'],
  ['clubs', '\u2663', 'M-2.08,1.19 B2.08,1.19 -1.399 B0,-2.11 -1.649 B-2.08,1.19 -1.649 M0,-2.11 L0,-4.8 M-1.6,-4.8 L1.6,-4.8'],
];
// [part of the id, sign, how the name starts]
const RANKS = [
  ['ace', 'A', 'Ace'], ['2', '2', '2'], ['3', '3', '3'], ['4', '4', '4'], ['5', '5', '5'], ['6', '6', '6'], ['7', '7', '7'],
  ['8', '8', '8'], ['9', '9', '9'], ['10', '10', '10'], ['jack', 'J', 'Jack'], ['queen', 'Q', 'Queen'], ['king', 'K', 'King'],
];

const onCard = (...parts) => joinDrawings(parsePath(CARD), ...parts);
const cards = SUITS.flatMap(([suit, suitSign, d]) => RANKS.map(([rank, rankSign, word]) => drawnShape({
  id: `card-${rank}-${suit}`, name: `${word} of ${suit}`, cat: 'numbers', sub: 'Playing cards', label: `${rankSign}${suitSign}`, spacing: 0.1,
  tags: `${rankSign}${suitSign} ${rank} ${suit} deck poker game`,
  draw: () => onCard(placeDrawing(fitDrawing(writtenSmall(rankSign)), { y: 4.6, size: 3.2 }), placeDrawing(parsePath(d), { y: -4.5, size: 0.66 })),
})));
cards.push(
  drawnShape({
    id: 'card-joker', name: 'Joker card', cat: 'numbers', sub: 'Playing cards', spacing: 0.1, tags: 'jester wild deck poker game fool',
    draw: `${CARD} M-4,0 L-5,5 L-2,2.4 L0,7 L2,2.4 L5,5 L4,0 Z O-5,5.8 0.8 O0,7.8 0.8 O5,5.8 0.8 D-1.7,-2.6 D1.7,-2.6 N A0,-3.4 3 215 325`,
  }),
  drawnShape({
    id: 'card-back', name: 'Card back', cat: 'numbers', sub: 'Playing cards', tags: 'face down deck poker game hidden',
    draw: `${CARD} M-5,8 L5,8 L5,-8 L-5,-8 Z M-5,8 L5,-8 M5,8 L-5,-8 M0,8 L5,0 L0,-8 L-5,0 Z`,
  }),
);

// ---------------------------------------------------------------- the hours on a clock

function clock(hour) {
  let d = 'O0,0 1';
  for (let k = 0; k < 12; k++) d += ` D${fix(0.8 * Math.sin(k * 30 * RAD))},${fix(0.8 * Math.cos(k * 30 * RAD))}`;
  d += ' M0,0 L0,0.64';
  // at 12 the short hand is behind the long one
  if (hour % 12) d += ` M0,0 L${fix(0.42 * Math.sin(hour * 30 * RAD))},${fix(0.42 * Math.cos(hour * 30 * RAD))}`;
  return d;
}

const clocks = Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => drawnShape({
  id: `clock-${hour}`, name: `Clock at ${hour}`, cat: 'numbers', sub: 'Clock times', label: `${hour}:00`, box: false,
  draw: clock(hour), tags: `${hour} ${hour}:00 o'clock ${ONES[hour] || inWords(hour)} time hour hands${hour === 12 ? ' noon midnight' : ''}`,
}));

// ---------------------------------------------------------------- Mayan numbers
//
// A dot is one and a bar is five; the dots stand in a row on top of the bars.
// Nothing is a shell.

const SHELL = 'M-4.5,0 Q0,3.6 4.5,0 Q0,-3.6 -4.5,0 M-1.6,1.57 Q-0.9,0 -1.6,-1.57 M1.6,1.57 Q0.9,0 1.6,-1.57';

function mayan(n) {
  if (!n) return { d: SHELL, middle: 0 };
  const bars = Math.floor(n / 5);
  const dots = n % 5;
  let d = '';
  for (let i = 0; i < bars; i++) {
    const y = i * 2.2;
    d += `M-3.85,${fix(y + 0.65)} L3.85,${fix(y + 0.65)} A3.85,${fix(y)} 0.65 90 -90 L-3.85,${fix(y - 0.65)} A-3.85,${fix(y)} 0.65 270 90 `;
  }
  const row = bars ? (bars - 1) * 2.2 + 2.4 : 0;
  for (let k = 0; k < dots; k++) d += `O${fix((k - (dots - 1) / 2) * 2.5)},${fix(row)} 0.9 `;
  const low = bars ? -0.65 : -0.9;
  const high = dots ? row + 0.9 : (bars - 1) * 2.2 + 0.65;
  return { d, middle: (low + high) / 2 };
}

const mayans = Array.from({ length: 20 }, (_, n) => {
  const { d, middle } = mayan(n);
  return drawnShape({
    id: `mayan-${n}`, name: `Mayan ${n}`, cat: 'numbers', sub: 'Mayan numbers', draw: d, box: [0, middle, 4.7],
    tags: `${n} maya numeral dots bars ancient${n ? '' : ' zero shell'}`,
  });
});

// ---------------------------------------------------------------- more signs

// [id, name, sign, drawing, heading, search words]
const SIGNS = [
  ['per-mille', 'Per mille', '\u2030', 'M4.6,10 L0.8,0 O1.35,8.5 1.35 O4.6,1.5 1.35 O7.9,1.5 1.35', 'Maths', 'per thousand'],
  ['partial', 'Partial sign', '\u2202', 'M0.8,8.6 C1.2,9.4 2,10 3,10 C4.6,10 6,8.5 6,3 A3,3 3 0 -360', 'Maths', 'derivative curly d'],
  ['element', 'Element of', '\u2208', 'M6.4,8.6 L3.6,8.6 A3.6,5 3.6 90 270 L6.4,1.4 M0,5 L6.4,5', 'Maths', 'set member in'],
  ['empty-set', 'Empty set', '\u2205', 'O3.5,5 3.3 M0.6,0.4 L6.4,9.6', 'Maths', 'nothing null diameter'],
  ['therefore', 'Therefore sign', '\u2234', 'O3.5,7.4 1 O0.9,2.4 1 O6.1,2.4 1', 'Maths', 'three dots so'],
  ['proportional', 'Proportional to', '\u221D', 'M7,7.4 C4.4,7.4 3.6,2.6 1.8,2.6 C0.6,2.6 0,3.6 0,5 C0,6.4 0.6,7.4 1.8,7.4 C3.6,7.4 4.4,2.6 7,2.6', 'Maths', 'varies'],
  ['identical', 'Identical to', '\u2261', 'M0,7.8 L7,7.8 M0,5 L7,5 M0,2.2 L7,2.2', 'Maths', 'three lines same menu'],
  ['implies', 'Implies', '\u21D2', 'M0,6.3 L7.23,6.3 M0,3.7 L7.23,3.7 M4.6,8.8 L8.6,5 L4.6,1.2', 'Maths', 'double arrow then'],
  ['not', 'Not sign', '\u00AC', 'M0,6.2 L6.6,6.2 L6.6,3', 'Maths', 'negation logic'],
  ['celsius', 'Degrees Celsius', '\u00B0C', 'O1.2,8.7 1.2 E6.6,4.6 3.2,4.6 50 310', 'Maths', 'temperature heat'],
  ['fahrenheit', 'Degrees Fahrenheit', '\u00B0F', 'O1.2,8.7 1.2 M9,9.2 L4.2,9.2 L4.2,0 M4.2,4.9 L8,4.9', 'Maths', 'temperature heat'],
  ['fifth', 'One fifth', '\u2155', 'M0.6,8.6 L1.8,10 L1.8,5.6 M6.6,10 L1.6,0 M8.2,4.4 L6.2,4.4 L6.2,2.7 L7,2.7 A7,1.35 1.35 90 -150', 'Maths', 'fraction'],
  ['eighth', 'One eighth', '\u215B', 'M0.6,8.6 L1.8,10 L1.8,5.6 M6.6,10 L1.6,0 M7.2,2.4 C9,3.6 8.2,4.4 7.2,4.4 C6.2,4.4 5.4,3.6 7.2,2.4 C9.2,1.2 8.6,0 7.2,0 C5.8,0 5.2,1.2 7.2,2.4', 'Maths', 'fraction'],
  ['right-angle', 'Right angle', '\u221F', 'M0,9 L0,0 L8.4,0 M0,2.4 L2.4,2.4 L2.4,0', 'Maths', 'corner square ninety degrees'],
  ['double-dagger', 'Double dagger', '\u2021', 'M3,10 L3,0 M0.4,7.4 L5.6,7.4 M0.4,2.6 L5.6,2.6', 'Signs', 'footnote mark'],
  ['trademark', 'Trademark sign', '\u2122', 'M0,10 L3.6,10 M1.8,10 L1.8,5.4 M5,5.4 L5,10 L6.9,7 L8.8,10 L8.8,5.4', 'Signs', 'tm brand'],
  ['numero', 'Numero sign', '\u2116', 'M0,0 L0,10 L5,0 L5,10 O8.2,7.4 1.5 M6.7,4.4 L9.7,4.4', 'Signs', 'number no'],
  ['interrobang', 'Interrobang', '\u203D', 'A3,7.2 2.8 160 -50 L3,3.4 M3,10 L3,3.4 D3,0.5', 'Signs', 'question exclamation what'],
  ['reference', 'Reference mark', '\u203B', 'M0.6,1.6 L6.4,8.4 M0.6,8.4 L6.4,1.6 D3.5,8.6 D3.5,1.4 D0.5,5 D6.5,5', 'Signs', 'note kome'],
  ['ruble', 'Ruble', '\u20BD', 'M1.5,0 L1.5,10 L4,10 A4,7.25 2.75 90 -90 L0,4.5 M0,2.2 L4.6,2.2', 'Money', 'money rouble'],
  ['lira', 'Lira', '\u20BA', 'M2,10 L2,0 A2,4.6 4.6 -90 -10 M0,5.4 L5,7.6 M0,3.2 L5,5.4', 'Money', 'money'],
  ['shekel', 'Shekel', '\u20AA', 'M0,0 L0,10 L3.4,10 Q5,10 5,8.4 L5,3 M8,10 L8,0 L4.6,0 Q3,0 3,1.6 L3,7', 'Money', 'money'],
  ['naira', 'Naira', '\u20A6', 'M0.8,0 L0.8,10 L5.7,0 L5.7,10 M0,6.2 L6.5,6.2 M0,3.8 L6.5,3.8', 'Money', 'money'],
  ['peso', 'Peso', '\u20B1', 'M1,0 L1,10 L3.6,10 A3.6,7.25 2.75 90 -90 L1,4.5 M0,8.2 L7,8.2 M0,6.3 L7,6.3', 'Money', 'money'],
  ['franc', 'Franc', '\u20A3', 'M1.2,0 L1.2,10 L6.6,10 M1.2,5.4 L5.4,5.4 M0,2.6 L3.6,2.6', 'Money', 'money'],
  ['tugrik', 'Tugrik', '\u20AE', 'M0,10 L7,10 M3.5,10 L3.5,0 M1.2,5.2 L5.8,6.8 M1.2,3.2 L5.8,4.8', 'Money', 'money'],
  ['tenge', 'Tenge', '\u20B8', 'M0,10 L7,10 M0,7.6 L7,7.6 M3.5,7.6 L3.5,0', 'Money', 'money'],
  ['kip', 'Kip', '\u20AD', 'M1.2,0 L1.2,10 M6.6,10 L1.2,4 M3.2,6.222 L7,0 M0,5 L4.6,5', 'Money', 'money'],
  ['currency', 'Currency sign', '\u00A4', 'O3.5,5 2.4 M0.6,7.9 L1.8,6.7 M6.4,7.9 L5.2,6.7 M0.6,2.1 L1.8,3.3 M6.4,2.1 L5.2,3.3', 'Money', 'money coin any'],
];

const signs = SIGNS.map(([id, name, s, d, sub, more]) => text(`sign-${id}`, name, 'numbers', s, d, { sub, tags: `${s} ${more}` }));

export const COUNT_SHAPES = [...bigger, ...circled, ...scores, ...romans, ...digitals, ...dominoes, ...cards, ...clocks, ...mayans, ...signs];
