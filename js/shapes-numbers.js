// Two thousand more for the Numbers tab: every number up to 999, big round
// numbers, percentages, rankings, prices, numbers on a badge, results, times
// tables, tally marks, and more digital, circled and Roman numbers, dice and
// clock times. All of it is written with the stroke numbers of shapes-text.js
// (see wordDrawing in shapes-words.js), so a new family is a few lines here.

import { drawnShape, parsePath, placeDrawing, joinDrawings, fitDrawing, RAD, fix } from './shape-kit.js';
import { BARS } from './shapes-text.js';
import { written, writtenSmall, sign, SMALL_DIGITS } from './shapes-count.js';
import { wordDrawing } from './shapes-words.js';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// ---------------------------------------------------------------- numbers in words (for the search)

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
/** A number up to 999 in words: "forty two", "three hundred". */
export function inWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
  return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${inWords(n % 100)}` : ''}`;
}

// ---------------------------------------------------------------- every number up to 999

// (10 to 31, the tens, 100 and 1000 are in shapes-count.js.) A number of three
// digits is found by typing it; only the numbers below 100 and the round
// hundreds are found by their words as well.
// Two digits are written like 10 to 31. Three digits are smaller, and so are written the way small numbers are
// (see SMALL_DIGITS in shapes-count.js); so are 48 and 84, where the two rings of the usual 8 come out a hair apart.
const HAD = new Set([...range(10, 31), 40, 50, 60, 70, 80, 90, 100]);
const upTo999 = range(32, 999).filter((n) => !HAD.has(n)).map((n) => drawnShape({
  id: `number-${n}`, name: `Number ${n}`, cat: 'numbers', sub: 'Numbers up to 999', label: String(n),
  tags: `${n} ${n < 100 || n % 100 === 0 ? `${inWords(n)} ` : ''}count`,
  draw: () => (n > 99 || n === 48 || n === 84 ? writtenSmall : written)(String(n)), count: Math.min(140, 32 * String(n).length),
}));

// ---------------------------------------------------------------- big numbers

// [what is written, part of the id, search words]. From ten thousand on the digits stand in threes.
const BIG = [
  ['1500', '1500', 'fifteen hundred'], ['2000', '2000', 'two thousand'], ['2500', '2500', 'twenty five hundred'], ['3000', '3000', 'three thousand'],
  ['4000', '4000', 'four thousand'], ['5000', '5000', 'five thousand'], ['6000', '6000', 'six thousand'], ['7000', '7000', 'seven thousand'],
  ['7500', '7500', 'seventy five hundred'], ['8000', '8000', 'eight thousand'], ['9000', '9000', 'nine thousand'], ['9999', '9999', 'all nines most'],
  ['10 000', '10000', 'ten thousand'], ['20 000', '20000', 'twenty thousand'], ['25 000', '25000', 'twenty five thousand'], ['50 000', '50000', 'fifty thousand'],
  ['100 000', '100000', 'hundred thousand'], ['1 000 000', '1000000', 'million'],
  ...range(2020, 2035).map((year) => [String(year), String(year), 'year date']),
  ['1K', '1k', 'one thousand kilo'], ['2K', '2k', 'two thousand kilo'], ['5K', '5k', 'five thousand kilo'], ['10K', '10k', 'ten thousand kilo'],
  ['50K', '50k', 'fifty thousand kilo'], ['100K', '100k', 'hundred thousand kilo'], ['1M', '1m', 'one million mega'], ['10M', '10m', 'ten million mega'],
];
const big = BIG.map(([what, id, more]) => drawnShape({
  id: `number-${id}`, name: `Number ${what.replace(/ /g, '')}`, cat: 'numbers', sub: 'Big numbers', label: what, tags: `${what.replace(/ /g, '')} ${more} count`,
  draw: () => writtenSmall(what), count: Math.min(170, 26 * what.replace(/ /g, '').length + 20),
}));

// ---------------------------------------------------------------- percentages, places, scores, prices

// (50% and 100% are in shapes-count.js, under Scores.)
const percentages = range(0, 100).filter((n) => n !== 50 && n !== 100).map((n) => drawnShape({
  id: `percent-${n}`, name: `${n} percent`, cat: 'numbers', sub: 'Percentages', label: `${n}%`, tags: `${n}% ${inWords(n)} per cent loading progress sale part`,
  draw: () => writtenSmall(`${n}%`), count: Math.min(140, 30 * (String(n).length + 1)),
}));

const ending = (n) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
// (1st, 2nd and 3rd are in shapes-count.js, under Scores.)
const places = range(4, 100).map((n) => drawnShape({
  id: `place-${n}`, name: `${n}${ending(n)} place`, cat: 'numbers', sub: 'Rankings', label: `${n}${ending(n)}`, tags: `${n}${ending(n)} ${n} rank position podium order`,
  draw: () => writtenSmall(`${n}${ending(n)}`), count: Math.min(140, 28 * (String(n).length + 2)),
}));

const PLUS = [4, 6, 7, 8, 9, 15, 20, 30, 40, 60, 70, 75, 80, 90, 150, 200, 250, 300, 400, 500, 750, 1000, 2000, 5000];
const MINUS = [2, 3, 4, 15, 20, 25, 30, 40, 50, 75, 100, 200, 500, 1000];
const TIMES = [4, 6, 7, 8, 9, 20, 25, 50, 100];
const popup = (id, name, what, more) => drawnShape({
  id: `score-${id}`, name, cat: 'numbers', sub: 'Scores', label: what, tags: `${what} ${more}`,
  draw: () => writtenSmall(what), count: Math.min(140, Math.max(60, 28 * what.length)),
});
const popups = [
  ...PLUS.map((n) => popup(`plus-${n}`, `Plus ${n}`, `+${n}`, 'points bonus gain heal')),
  ...MINUS.map((n) => popup(`minus-${n}`, `Minus ${n}`, `\u2212${n}`, `-${n} points lose damage`)),
  ...TIMES.map((n) => popup(`times-${n}`, `Times ${n}`, `\u00D7${n}`, `x${n} multiplier combo`)),
];

// [sign, name of one, name of several, drawing of the sign]
const MONEY = [
  ['$', 'dollar', 'dollars', 'A3.25,7 2 20 270 A3.25,3 2 90 -160 M3.25,10 L3.25,0'],
  ['\u20AC', 'euro', 'euros', 'E4.5,5 4,5 50 310 M0,6.2 L5.2,6.2 M0,3.8 L5.2,3.8'],
  ['\u00A3', 'pound', 'pounds', 'A3.6,7.6 2.4 20 180 L1.2,2.6 Q1.2,0.8 0,0 L6,0 M0,5 L4,5'],
];
const AMOUNTS = [1, 2, 5, 10, 20, 25, 50, 75, 100, 200, 250, 500, 1000];
const prices = MONEY.flatMap(([moneySign, one, several, d]) => AMOUNTS.map((n) => drawnShape({
  id: `price-${n}-${several}`, name: `${n} ${n === 1 ? one : several}`, cat: 'numbers', sub: 'Prices', label: `${moneySign}${n}`,
  tags: `${moneySign}${n} ${n} ${several} money price cost shop buy sell`,
  draw: () => wordDrawing(`${moneySign}${n}`, (ch) => (ch === moneySign ? d : SMALL_DIGITS[ch] || sign(ch))),
  count: Math.min(140, 30 * (String(n).length + 1)),
})));

// ---------------------------------------------------------------- digital numbers and a digital clock

const DIGITAL = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];
const PITCH = 7.2; // from one digit to the next: a digit is 5 wide

/** Numbers of seven bars side by side; ":" is the two dots of a clock. */
function display(what) {
  let x = 0;
  const parts = [];
  for (const ch of what) {
    if (ch === ':') {
      parts.push(parsePath(`D${fix(x + 0.4)},3 D${fix(x + 0.4)},7`));
      x += 3;
    } else {
      parts.push(placeDrawing(parsePath([...DIGITAL[ch]].map((bar) => BARS[bar]).join(' ')), { x }));
      x += PITCH;
    }
  }
  return joinDrawings(...parts);
}

const two = (n) => String(n).padStart(2, '0');
const digitals = range(0, 99).map((n) => drawnShape({
  id: `digital-${two(n)}`, name: `Digital ${two(n)}`, cat: 'numbers', sub: 'Digital numbers', label: two(n), spacing: 0.12,
  tags: `${two(n)} ${n} clock display led seven segment score board`, draw: () => display(two(n)),
}));

const digitalTimes = range(0, 95).map((k) => {
  const time = `${two(Math.floor(k / 4))}:${two((k % 4) * 15)}`;
  return drawnShape({
    id: `digital-time-${time.replace(':', '')}`, name: `Digital clock ${time}`, cat: 'numbers', sub: 'Digital clock', label: time, spacing: 0.06,
    tags: `${time} time hour alarm display led seven segment${k === 0 ? ' midnight' : ''}${k === 48 ? ' noon midday' : ''}`, draw: () => display(time),
  });
});

// ---------------------------------------------------------------- more clock times: quarter past, half past, quarter to

function clockAt(hour, minute) {
  let d = 'O0,0 1';
  for (let k = 0; k < 12; k++) d += ` D${fix(0.8 * Math.sin(k * 30 * RAD))},${fix(0.8 * Math.cos(k * 30 * RAD))}`;
  const long = minute * 6;
  const short = (hour % 12) * 30 + minute / 2;
  d += ` M0,0 L${fix(0.64 * Math.sin(long * RAD))},${fix(0.64 * Math.cos(long * RAD))}`;
  d += ` M0,0 L${fix(0.42 * Math.sin(short * RAD))},${fix(0.42 * Math.cos(short * RAD))}`;
  return d;
}
const PART = { 15: 'quarter past', 30: 'half past', 45: 'quarter to' };
const clocks = range(1, 12).flatMap((hour) => [15, 30, 45].map((minute) => drawnShape({
  id: `clock-${hour}-${minute}`, name: `Clock at ${hour}:${minute}`, cat: 'numbers', sub: 'Clock times', label: `${hour}:${minute}`, box: false,
  draw: clockAt(hour, minute), tags: `${hour}:${minute} ${PART[minute]} ${inWords(minute === 45 ? (hour % 12) + 1 : hour)} time hour hands`,
})));

// ---------------------------------------------------------------- Roman numbers from 21 on

// A letter of a Roman number: [drawing from x = 0, its width]. As on a clock face, a bar runs above and below.
const ROMAN_LETTER = {
  I: ['M0,0 L0,10', 0], V: ['M0,10 L2,0 L4,10', 4], X: ['M0,0 L4,10 M0,10 L4,0', 4], L: ['M0,10 L0,0 L3.6,0', 3.6],
  C: ['E2.6,5 2.6,4 55 305', 4.1], D: ['M0,0 L0,10 M0,8.8 L1,8.8 E1,5 2.8,3.8 90 -90 L0,1.2', 3.8], M: ['M0,0 L0,10 L2.6,4 L5.2,10 L5.2,0', 5.2],
};
const ROMAN_VALUES = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function romanNumeral(n) {
  let out = '';
  let left = n;
  for (const [value, letters] of ROMAN_VALUES) {
    while (left >= value) {
      out += letters;
      left -= value;
    }
  }
  return out;
}
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
const romans = [...range(21, 100), 500, 1000].map((n) => drawnShape({
  id: `roman-${n}`, name: `Roman ${n}`, cat: 'numbers', sub: 'Roman numerals', label: romanNumeral(n), draw: () => roman(romanNumeral(n)), spacing: 0.12,
  tags: `${romanNumeral(n)} ${n} ${n <= 100 ? inWords(n) : n === 500 ? 'five hundred' : 'thousand'} numeral latin`,
}));

// ---------------------------------------------------------------- numbers in a ring and on a badge

const small = (n, size) => placeDrawing(fitDrawing(writtenSmall(String(n))), { size });

const circled = range(21, 99).map((n) => drawnShape({
  id: `circled-${n}`, name: `Circled ${n}`, cat: 'numbers', sub: 'Circled numbers', box: false, tags: `${n} ring round badge level stage checkpoint`,
  draw: () => joinDrawings(parsePath('O0,0 1'), small(n, 0.6)),
}));

const corners = (k, radius, first) => Array.from({ length: k }, (_, i) => `${fix(radius * Math.cos((first + (360 * i) / k) * RAD))},${fix(radius * Math.sin((first + (360 * i) / k) * RAD))}`);
const STAR = `M${Array.from({ length: 10 }, (_, i) => `${fix((i % 2 ? 0.68 : 1) * Math.cos((90 + 36 * i) * RAD))},${fix((i % 2 ? 0.68 : 1) * Math.sin((90 + 36 * i) * RAD))}`).join(' L')} Z`;
// [part of the id, how the name ends, the frame, size of one digit, size of two, how far up the number stands, search words]
const FRAMES = [
  ['square', 'in a square', 'M-1,-1 L1,-1 L1,1 L-1,1 Z', 0.56, 0.66, 0, 'box tile block'],
  ['diamond', 'in a diamond', 'M0,1 L1,0 L0,-1 L-1,0 Z', 0.46, 0.44, 0, 'rhombus sign'],
  ['hexagon', 'in a hexagon', `M${corners(6, 1, 90).join(' L')} Z`, 0.48, 0.56, 0, 'six sides tile'],
  ['star', 'in a star', STAR, 0.4, 0.42, -0.03, 'award sheriff'],
  ['shield', 'on a shield', 'M-0.86,1 L0.86,1 L0.86,0 Q0.86,-0.62 0,-1 Q-0.86,-0.62 -0.86,0 Z', 0.44, 0.52, 0.16, 'crest team guard'],
];
const badges = FRAMES.flatMap(([id, how, frame, one, twoDigits, up, more]) => range(1, 20).map((n) => drawnShape({
  id: `badge-${id}-${n}`, name: `Number ${n} ${how}`, cat: 'numbers', sub: 'Number badges', box: false,
  tags: `${n} ${inWords(n)} badge level stage team player ${more}`,
  draw: () => joinDrawings(parsePath(frame), placeDrawing(small(n, n > 9 ? twoDigits : one), { y: up })),
})));

// ---------------------------------------------------------------- results, times tables, binary numbers

const withDash = (what) => {
  // the dash of a result is short, and stands between the numbers
  const [left, right] = what.split('-');
  const a = writtenSmall(left);
  const b = placeDrawing(writtenSmall(right), { x: 6 + 1.9 + 3 + 1.9 });
  return joinDrawings(a, parsePath('M7.9,5 L10.9,5'), b);
};
const results = range(0, 6).flatMap((a) => range(0, 6).map((b) => drawnShape({
  id: `result-${a}-${b}`, name: `Score ${a} to ${b}`, cat: 'numbers', sub: 'Results', label: `${a}-${b}`, tags: `${a}-${b} ${a}:${b} result match goals board${a === b ? ' draw tie' : ''}`,
  draw: () => withDash(`${a}-${b}`), count: 84,
})));

const EQUALS = 'M0,6.6 L5,6.6 M0,3.4 L5,3.4';
const sum = (what) => wordDrawing(what, (ch) => (ch === '=' ? EQUALS : SMALL_DIGITS[ch] || sign(ch)));
const tables = range(1, 10).flatMap((a) => range(1, 10).map((b) => {
  const what = `${a}\u00D7${b}=${a * b}`;
  return drawnShape({
    id: `times-${a}x${b}`, name: `${a} times ${b} is ${a * b}`, cat: 'numbers', sub: 'Times tables', label: what,
    tags: `${a}x${b} ${a * b} multiply multiplication table maths school sum`, draw: () => sum(what), count: Math.min(190, 24 * what.length),
  });
}));

const binaries = range(0, 15).map((n) => {
  const bits = n.toString(2).padStart(4, '0');
  return drawnShape({
    id: `binary-${n}`, name: `Binary ${n}`, cat: 'numbers', sub: 'Binary numbers', label: bits, tags: `${bits} ${n} ${inWords(n)} bits computer zero one code`,
    draw: () => written(bits), count: 110,
  });
});

// ---------------------------------------------------------------- tally marks and pairs of dice

function tally(n) {
  let d = '';
  let x = 0;
  for (let done = 0; done < n; done += 5) {
    const marks = Math.min(4, n - done);
    for (let k = 0; k < marks; k++) d += `M${fix(x + k * 2)},0 L${fix(x + k * 2)},8 `;
    if (n - done >= 5) d += `M${fix(x - 1.4)},1.6 L${fix(x + 7.4)},6.4 `;
    x += 11.6;
  }
  return d.trim();
}
const tallies = range(1, 20).map((n) => drawnShape({
  id: `tally-${n}`, name: `Tally of ${n}`, cat: 'numbers', sub: 'Tally marks', draw: tally(n), tags: `${n} ${inWords(n)} count marks strokes score days prison`,
  count: Math.max(16, Math.min(150, 9 * n + 8)),
}));

const SPOTS = ['', '5', '37', '357', '1379', '13579', '134679']; // the places on a 3 by 3 grid
const FACE = 'M-3.4,5 L3.4,5 Q5,5 5,3.4 L5,-3.4 Q5,-5 3.4,-5 L-3.4,-5 Q-5,-5 -5,-3.4 L-5,3.4 Q-5,5 -3.4,5 Z';
const face = (n, cx) => placeDrawing(parsePath(`${FACE} ${[...SPOTS[n]].map((k) => `D${(((k - 1) % 3) - 1) * 2.6},${(1 - Math.floor((k - 1) / 3)) * 2.6}`).join(' ')}`), { x: cx });
const dicePairs = range(1, 6).flatMap((a) => range(a, 6).map((b) => drawnShape({
  id: `dice-${a}-${b}`, name: `Dice ${a} and ${b}`, cat: 'numbers', sub: 'Dice', draw: () => joinDrawings(face(a, -5.9), face(b, 5.9)),
  tags: `${a} ${b} ${a + b} two dice pair spots pips game roll${a === b ? ' double' : ''}`,
})));

export const NUMBER_SHAPES = [
  ...upTo999, ...big, ...percentages, ...places, ...popups, ...prices, ...digitals, ...digitalTimes, ...clocks, ...romans, ...circled, ...badges,
  ...results, ...tables, ...binaries, ...tallies, ...dicePairs,
];
