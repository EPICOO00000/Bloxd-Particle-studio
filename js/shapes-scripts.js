// Letters of other alphabets, added when the library grew to 3,624 shapes:
// the rest of the Greek alphabet, more Latin letters with marks (Polish,
// Czech, Turkish, Hungarian, Romanian, Icelandic...), Cyrillic, the Japanese
// kana, some kanji, Korean and Hebrew letters.
//
// They are drawn like the letters in shapes-text.js: single strokes, y = 0 is
// the line the letters stand on and y = 10 the top of a capital. A stroke that
// ends on another one ends exactly on it, or stays well clear of it.

import { parsePath, placeDrawing, joinDrawings } from './shape-kit.js';
import { LETTERS, SMALL, DIGITS, MARKS, text, DROP, RISE } from './shapes-text.js';

const tidy = (v) => Number(v.toFixed(3));

// ---------------------------------------------------------------- Greek

// [id, name, sign, drawing, hangs below the line]
const GREEK_SMALL = [
  ['iota', 'Iota', 'ι', 'M0,6.5 L0,1.6 A1.6,1.6 1.6 180 290'],
  ['kappa', 'Kappa', 'κ', 'M0,6.5 L0,0 M4.6,6.5 L1.75,4.084 L0,2.6 M1.75,4.084 L5,0'],
  ['nu', 'Nu', 'ν', 'M0,6.5 L2.6,0 Q5.4,3 5,6.5'],
  ['omicron', 'Omicron', 'ο', SMALL.o],
  ['upsilon', 'Upsilon', 'υ', 'M0,6.5 L0,2.9 A2.9,2.9 2.9 180 360 L5.8,6.5'],
  ['chi', 'Chi', 'χ', 'M0,6.5 L5.6,-3.2 M5.6,6.5 L0,-3.2'],
  ['final-sigma', 'Final sigma', 'ς', 'E3.4,3.6 3.4,2.9 40 180 C0,1 5,1.8 5,-0.4 C5,-1.8 3.6,-2.6 2.2,-2.4'],
];
// the capitals that look like Latin ones: [id, name, sign, the Latin letter]
const GREEK_CAPITALS = [
  ['alpha', 'Α', 'A'], ['beta', 'Β', 'B'], ['epsilon', 'Ε', 'E'], ['zeta', 'Ζ', 'Z'], ['eta', 'Η', 'H'], ['iota', 'Ι', 'I'], ['kappa', 'Κ', 'K'],
  ['mu', 'Μ', 'M'], ['nu', 'Ν', 'N'], ['omicron', 'Ο', 'O'], ['rho', 'Ρ', 'P'], ['tau', 'Τ', 'T'], ['upsilon', 'Υ', 'Y'], ['chi', 'Χ', 'X'],
];

// ---------------------------------------------------------------- Latin letters with more marks

// A mark above a letter: x is the middle of the letter, y where the mark begins.
const ABOVE = {
  caron: (x, y) => `M${tidy(x - 1.5)},${tidy(y + 1.7)} L${x},${y} L${tidy(x + 1.5)},${tidy(y + 1.7)}`,
  breve: (x, y) => `M${tidy(x - 1.5)},${tidy(y + 1.7)} Q${x},${tidy(y - 0.5)} ${tidy(x + 1.5)},${tidy(y + 1.7)}`,
  dot: (x, y) => `D${x},${tidy(y + 0.9)}`,
  dblac: (x, y) => `M${tidy(x - 1.4)},${y} L${tidy(x - 0.3)},${tidy(y + 1.9)} M${tidy(x + 0.4)},${y} L${tidy(x + 1.5)},${tidy(y + 1.9)}`,
  acute: MARKS.acute, ring: MARKS.ring, uml: MARKS.uml,
};
/** The little tail of ą and ę: it starts at (x, y), on the letter. */
const ogonek = (x, y) => `M${x},${y} Q${tidy(x - 1.25)},${tidy(y - 1.3)} ${tidy(x - 0.65)},${tidy(y - 2.3)} Q${tidy(x - 0.05)},${tidy(y - 3)} ${tidy(x + 1.1)},${tidy(y - 2.6)}`;
/** The comma under ș and ț. */
const commaBelow = (x) => `M${tidy(x + 0.2)},-1.2 Q${tidy(x + 0.4)},-2.4 ${tidy(x - 0.6)},-3`;

const MID = { A: 3.5, C: 4, D: 3, E: 2.9, G: 4, I: 2, N: 3.25, O: 3.75, R: 2.9, S: 3.25, T: 3.5, U: 3.25, Y: 3.5, Z: 3.25 };
const MID_SMALL = { a: 3.1, c: 3.1, e: 3.25, g: 3.2, n: 2.9, o: 3.25, r: 1.9, s: 2.6, u: 2.9, y: 2.9, z: 2.6 };
const WORDS = {
  caron: 'caron hacek accent', acute: 'acute accent', ogonek: 'ogonek tail accent', dot: 'dot accent', stroke: 'stroke bar slash',
  breve: 'breve accent', cedil: 'cedilla accent', comma: 'comma accent', dblac: 'double acute accent', ring: 'ring accent',
  uml: 'umlaut diaeresis dots accent',
};
const above = (letter, mark) => `${LETTERS[letter]} N ${ABOVE[mark](MID[letter], 11)}`;
const aboveSmall = (letter, mark) => `${SMALL[letter]} N ${ABOVE[mark](MID_SMALL[letter], 7.7)}`;

// [id, capital sign, small sign, mark, capital drawing, small drawing, languages, what the capital needs, what the small one needs]
const UP = { rise: RISE };
const DOWN = { drop: DROP };
const MARKED = [
  ['ccaron', 'Č', 'č', 'caron', above('C', 'caron'), aboveSmall('c', 'caron'), 'czech slovak croatian', UP],
  ['dcaron', 'Ď', 'ď', 'caron', above('D', 'caron'), `${SMALL.d} M7.7,10 L7.3,8`, 'czech slovak', UP],
  ['ecaron', 'Ě', 'ě', 'caron', above('E', 'caron'), aboveSmall('e', 'caron'), 'czech', UP],
  ['ncaron', 'Ň', 'ň', 'caron', above('N', 'caron'), aboveSmall('n', 'caron'), 'czech slovak', UP],
  ['rcaron', 'Ř', 'ř', 'caron', above('R', 'caron'), aboveSmall('r', 'caron'), 'czech', UP],
  ['scaron', 'Š', 'š', 'caron', above('S', 'caron'), aboveSmall('s', 'caron'), 'czech slovak croatian', UP],
  ['tcaron', 'Ť', 'ť', 'caron', above('T', 'caron'), `${SMALL.t} M3.7,10 L3.3,8.2`, 'czech slovak', UP],
  ['zcaron', 'Ž', 'ž', 'caron', above('Z', 'caron'), aboveSmall('z', 'caron'), 'czech slovak croatian', UP],
  ['cacute', 'Ć', 'ć', 'acute', above('C', 'acute'), aboveSmall('c', 'acute'), 'polish croatian', UP],
  ['nacute', 'Ń', 'ń', 'acute', above('N', 'acute'), aboveSmall('n', 'acute'), 'polish', UP],
  ['sacute', 'Ś', 'ś', 'acute', above('S', 'acute'), aboveSmall('s', 'acute'), 'polish', UP],
  ['zacute', 'Ź', 'ź', 'acute', above('Z', 'acute'), aboveSmall('z', 'acute'), 'polish', UP],
  ['yacute', 'Ý', 'ý', 'acute', above('Y', 'acute'), aboveSmall('y', 'acute'), 'czech icelandic', UP],
  ['aogon', 'Ą', 'ą', 'ogonek', `${LETTERS.A} ${ogonek(7, 0)}`, `${SMALL.a} ${ogonek(6.15, 0)}`, 'polish', DOWN],
  ['eogon', 'Ę', 'ę', 'ogonek', `${LETTERS.E} ${ogonek(6, 0)}`, `${SMALL.e} N ${ogonek(4.875, 0.435)}`, 'polish', DOWN],
  ['zdot', 'Ż', 'ż', 'dot', above('Z', 'dot'), aboveSmall('z', 'dot'), 'polish', UP],
  ['lstrok', 'Ł', 'ł', 'stroke', `${LETTERS.L} M-1.4,3.7 L2,6.5`, `${SMALL.l} M-1.3,4.4 L1.3,6.6`, 'polish'],
  ['dstrok', 'Đ', 'đ', 'stroke', `${LETTERS.D} M-1.4,5 L2.4,5`, `${SMALL.d} M4.6,8.4 L7.7,8.4`, 'croatian vietnamese'],
  ['gbreve', 'Ğ', 'ğ', 'breve', above('G', 'breve'), aboveSmall('g', 'breve'), 'turkish', UP],
  ['abreve', 'Ă', 'ă', 'breve', above('A', 'breve'), aboveSmall('a', 'breve'), 'romanian', UP],
  ['scedil', 'Ş', 'ş', 'cedil', `${LETTERS.S} N ${MARKS.cedil(3.25)}`, `${SMALL.s} N ${MARKS.cedil(2.6)}`, 'turkish', DOWN],
  ['tcomma', 'Ț', 'ț', 'comma', `${LETTERS.T} N ${commaBelow(3.5)}`, `${SMALL.t} N ${commaBelow(3.4)}`, 'romanian', DOWN],
  ['odblac', 'Ő', 'ő', 'dblac', above('O', 'dblac'), aboveSmall('o', 'dblac'), 'hungarian', UP],
  ['udblac', 'Ű', 'ű', 'dblac', above('U', 'dblac'), aboveSmall('u', 'dblac'), 'hungarian', UP],
  ['uring', 'Ů', 'ů', 'ring', above('U', 'ring'), aboveSmall('u', 'ring'), 'czech', UP],
  ['yuml', 'Ÿ', 'ÿ', 'uml', above('Y', 'uml'), aboveSmall('y', 'uml'), 'french', UP],
];
// [id, name, sign, drawing, search words, extra fields]
const MORE_CAPITALS = [
  ['idot', 'Letter İ', 'İ', above('I', 'dot'), 'i dot accent turkish', UP],
  ['thorn', 'Letter Þ', 'Þ', 'M0,0 L0,10 M0,7.6 L3,7.6 A3,5.1 2.5 90 -90 L0,2.6', 'th icelandic old english'],
];
const MORE_SMALL = [
  ['inodot', 'Small letter ı', 'ı', 'M0,6.5 L0,0', 'i dotless turkish'],
  ['thorn', 'Small letter þ', 'þ', 'M0,10 L0,-3.2 N A2.9,3.25 3.25 153.2 -153.2', 'th icelandic old english'],
  ['eth', 'Small letter ð', 'ð', 'E3.1,3.1 3.1,3.1 90 450 M5.404,5.174 C4.8,7.2 3.4,8.8 1.4,9.8 M2,7.4 L5,9.6', 'th icelandic old english'],
];

// ---------------------------------------------------------------- Cyrillic

const E_DOTS = MARKS.uml(2.9, 11);
const CYR_I = 'M0,10 L0,0 L6.5,10 L6.5,0';
/** A small Cyrillic letter that is its capital, made smaller: `more` is drawn on top, full size. */
const little = (d, more = '') => () => joinDrawings(placeDrawing(parsePath(d), { size: 0.65 }), parsePath(more));

// [id, capital, small, drawing of the capital, drawing of the small one (left out: the capital, smaller), fields of the capital]
// (г is "he", its Ukrainian name: an id that starts a word with g would answer to the search "small letter g")
const CYRILLIC = [
  ['a', 'А', 'а', LETTERS.A, SMALL.a],
  ['be', 'Б', 'б', 'M5.6,10 L0,10 L0,0 L3,0 A3,2.75 2.75 -90 90 L0,5.5', 'E3,3 3,3 90 450 M0.218,4.124 C0.3,7.4 1.6,9.2 5.6,10'],
  ['ve', 'В', 'в', LETTERS.B],
  ['he', 'Г', 'г', 'M0,0 L0,10 L5.6,10'],
  ['de', 'Д', 'д', 'M0,0 L0,1.6 L1.2,1.6 L6.4,1.6 L7.6,1.6 L7.6,0 M1.2,1.6 Q2.6,5 2.8,10 L6.4,10 L6.4,1.6'],
  ['ye', 'Е', 'е', LETTERS.E, SMALL.e],
  ['yo', 'Ё', 'ё', `${LETTERS.E} N ${E_DOTS}`, `${SMALL.e} N ${MARKS.uml(3.25, 7.7)}`, UP],
  ['zhe', 'Ж', 'ж', 'M3.6,0 L3.6,5 L3.6,10 M0,10 L3.6,5 L0,0 M7.2,10 L3.6,5 L7.2,0'],
  ['ze', 'З', 'з', DIGITS[3], 'A2,4.875 1.625 150 -45 L2.2,3.25 L3.149,2.774 A2,1.625 1.625 45 -150'],
  ['i', 'И', 'и', CYR_I],
  ['short-i', 'Й', 'й', `${CYR_I} N ${ABOVE.breve(3.25, 11)}`, little(CYR_I, ABOVE.breve(2.11, 7.7)), UP],
  ['ka', 'К', 'к', LETTERS.K],
  ['el', 'Л', 'л', 'M0,0 C1.4,0 1.8,1.4 2,3.4 L2.6,10 L6.6,10 L6.6,0'],
  ['em', 'М', 'м', LETTERS.M],
  ['en', 'Н', 'н', LETTERS.H],
  ['o', 'О', 'о', LETTERS.O, SMALL.o],
  ['pe', 'П', 'п', 'M0,0 L0,10 L6.4,10 L6.4,0'],
  ['er', 'Р', 'р', LETTERS.P, SMALL.p],
  ['es', 'С', 'с', LETTERS.C, SMALL.c],
  ['te', 'Т', 'т', LETTERS.T],
  ['u', 'У', 'у', 'M0,10 L3.53,3.4 M6.6,10 L3.53,3.4 L2.6,1.4 Q1.8,0 0.4,0.2', SMALL.y],
  ['ef', 'Ф', 'ф', 'M3.6,10 L3.6,0 N E3.6,5.4 3.6,2.8 90 450', 'M3.2,10 L3.2,-3.2 N E3.2,3.25 3.2,3.25 90 450'],
  ['kha', 'Х', 'х', LETTERS.X, SMALL.x],
  ['tse', 'Ц', 'ц', 'M0,10 L0,1.4 L6.2,1.4 L7.4,1.4 L7.4,0 M6.2,10 L6.2,1.4'],
  ['che', 'Ч', 'ч', 'M0,10 L0,6.6 Q0,4.6 2.2,4.6 L6,4.6 M6,10 L6,4.6 L6,0'],
  ['sha', 'Ш', 'ш', 'M0,10 L0,0 L4,0 L8,0 L8,10 M4,10 L4,0'],
  ['shcha', 'Щ', 'щ', 'M0,10 L0,1.4 L3.9,1.4 L7.8,1.4 L9,1.4 L9,0 M3.9,10 L3.9,1.4 M7.8,10 L7.8,1.4'],
  ['hard-sign', 'Ъ', 'ъ', 'M0,10 L1.8,10 L1.8,5.2 L1.8,0 L4.6,0 A4.6,2.6 2.6 -90 90 L1.8,5.2'],
  ['yery', 'Ы', 'ы', 'M0,10 L0,5.2 L0,0 L2.4,0 A2.4,2.6 2.6 -90 90 L0,5.2 M7.4,10 L7.4,0'],
  ['soft-sign', 'Ь', 'ь', 'M0,10 L0,5.2 L0,0 L3,0 A3,2.6 2.6 -90 90 L0,5.2'],
  ['e', 'Э', 'э', 'E3,5 4,5 130 -130 M2.6,5 L7,5'],
  ['yu', 'Ю', 'ю', 'M0,0 L0,5 L0,10 M0,5 L2.4,5 N E5.6,5 3.2,5 90 450'],
  ['ya', 'Я', 'я', 'M6,0 L6,4.5 L6,10 L3,10 A3,7.25 2.75 90 270 L6,4.5 M3,4.5 L0,0'],
  // the four more of the Ukrainian alphabet
  ['he-upturn', 'Ґ', 'ґ', 'M0,0 L0,8.6 L5.4,8.6 L5.4,10'],
  ['ukrainian-ye', 'Є', 'є', 'E4,5 4,5 50 310 M0,5 L4.6,5'],
  ['ukrainian-i', 'І', 'і', LETTERS.I, SMALL.i],
  ['yi', 'Ї', 'ї', `${LETTERS.I} N ${MARKS.uml(2, 11)}`, `M0,6.5 L0,0 ${MARKS.uml(0, 7.7)}`, UP],
];

// ---------------------------------------------------------------- Japanese kana

// [sound, drawing]: the 46 basic signs of each kind, in their usual order
const KATAKANA = [
  ['a', 'ア', 'M0.6,9 L8,9 Q7,6.6 4.6,5.6 M4.2,7.2 Q4.2,2.4 1,0'],
  ['i', 'イ', 'M7.6,10 L4.4,7.6 L0.4,4.6 M4.4,7.6 L4.4,0'],
  ['u', 'ウ', 'M4.2,10 L4.2,8 M0.6,5 L0.6,8 L4.2,8 L8,8 Q8,3 3,0'],
  ['e', 'エ', 'M1,9 L4.3,9 L7.6,9 M4.3,9 L4.3,1 M0,1 L4.3,1 L8.6,1'],
  ['o', 'オ', 'M0.4,7 L5.6,7 L8.6,7 M5.6,10 L5.6,7 L5.6,1.2 Q5.6,0 4,0.4 M5.6,7 Q3.6,4.6 0.4,2'],
  ['ka', 'カ', 'M0.6,7 L7.8,7 L7.4,1.4 Q7.3,0 5.6,0.4 M4.2,10 Q4.2,3.4 0.6,0'],
  ['ki', 'キ', 'M0.6,7.2 L7.6,8.2 M0.2,3.8 L8.4,5 M3.2,10 L5,0'],
  ['ku', 'ク', 'M3.6,10 L2.565,8.6 L0.2,5.4 M2.565,8.6 L7.8,8.6 Q7.4,3 2.2,0'],
  ['ke', 'ケ', 'M3,10 L1.544,7.4 L0.2,5 M1.544,7.4 L5.6,7.4 L8.6,7.4 M5.6,7.4 Q5.6,2.4 2.6,0'],
  ['ko', 'コ', 'M0.6,8.6 L7.6,8.6 L7.6,0.8 L0.4,0.8'],
  ['sa', 'サ', 'M0,7 L8.6,7 M2.4,10 L2.4,4 M6.2,10 L6.2,4.6 Q6.2,1.4 3,0'],
  ['shi', 'シ', 'M1.2,9.4 L2.8,8.2 M0.2,6.4 L1.8,5.2 M1,0 Q5.6,1 8.2,7'],
  ['su', 'ス', 'M1,9 L7.4,9 L4.2,5 L0.2,0 M4.2,5 L8.4,0'],
  ['se', 'セ', 'M0,5.6 L8.2,7 L6.4,4.4 M3.2,10 L3.2,1.4 Q3.2,0.4 4.4,0.4 L8.4,0.4'],
  ['so', 'ソ', 'M1,9.6 L2.6,6.6 M8,9.8 Q7.4,3.4 2,0'],
  ['ta', 'タ', 'M3.6,10 L2.565,8.6 L0.2,5.4 M2.565,8.6 L7.8,8.6 Q7.6,5.6 6.2,3.7 Q4.8,1.6 2.2,0 M2.4,5.6 L6.2,3.7'],
  ['chi', 'チ', 'M7.6,10 L4.6,9 L1.6,8 M0.2,5.6 L8.6,5.6 M4.6,9 L4.6,4 Q4.6,1.2 1.6,0'],
  ['tsu', 'ツ', 'M1,9.2 L2.2,6.6 M4.2,9.6 L5.2,7 M8.6,9.6 Q7.6,3 2,0'],
  ['te', 'テ', 'M1.6,9.4 L7,9.4 M0.2,6.2 L4.6,6.2 L8.6,6.2 M4.6,6.2 Q4.6,2 1.6,0'],
  ['to', 'ト', 'M2.4,10 L2.4,6.4 L2.4,0 M2.4,6.4 L7.6,3.6'],
  ['na', 'ナ', 'M0.2,6.4 L8.6,6.4 M4.6,10 L4.6,4.6 Q4.6,1.6 1.4,0'],
  ['ni', 'ニ', 'M1.4,8 L7.2,8 M0.2,1.2 L8.6,1.2'],
  ['nu', 'ヌ', 'M1,9 L7.4,9 L0.2,0 M2,6 L7.8,1.2'],
  ['ne', 'ネ', 'M4.4,10 L4.4,8.8 M1,7.6 L7.4,7.6 L4.4,5.433 L0.2,2.4 M4.4,5.433 L4.4,0 M5.8,4.4 L8.6,2.8'],
  ['no', 'ノ', 'M7.6,10 Q6.6,3.4 0.6,0'],
  ['ha', 'ハ', 'M3,8.6 Q2.6,3.4 0.2,0.6 M5.6,8.6 Q6.4,3.6 8.6,0.6'],
  ['hi', 'ヒ', 'M7.6,6.8 L1.2,5.4 M1.2,10 L1.2,5.4 L1.2,1.4 Q1.2,0.4 2.6,0.4 L8.2,0.4'],
  ['fu', 'フ', 'M0.6,9 L8,9 Q7.4,3 2,0'],
  ['he', 'ヘ', 'M0.2,3.4 L3.4,7.4 L8.8,2'],
  ['ho', 'ホ', 'M0.4,7.2 L8.4,7.2 M4.4,10 L4.4,0.8 Q4.4,0 3.2,0.3 M2.4,5 L0.6,1.6 M6.4,5 L8.2,1.6'],
  ['ma', 'マ', 'M0.4,9 L8.2,9 L4.4,4 M3,5.72 L4.4,4 L5.8,2.28'],
  ['mi', 'ミ', 'M1.6,9.4 L6.8,8 M2,6 L6.4,4.8 M0.8,2.6 L7.6,0.4'],
  ['mu', 'ム', 'M4.4,10 L0.4,1.4 L7.204,2.208 M5.8,4.8 L7.204,2.208 L8.4,0'],
  ['me', 'メ', 'M7.4,10 Q6.4,3.6 0.6,0 M2.2,7 L7,2.4'],
  ['mo', 'モ', 'M1.2,8.6 L4,8.6 L7.4,8.6 M0.2,5.4 L8.4,5.4 M4,8.6 L4,1.4 Q4,0.4 5.2,0.4 L8.4,0.4'],
  ['ya', 'ヤ', 'M0.2,6 L8.4,7.6 L6.2,4.6 M3,10 L5,0'],
  ['yu', 'ユ', 'M1.4,8 L6.4,8 L6.4,1 M0,1 L6.4,1 L8.6,1'],
  ['yo', 'ヨ', 'M0.8,9 L7.4,9 L7.4,4.8 L7.4,0.6 L0.6,0.6 M1.4,4.8 L7.4,4.8'],
  ['ra', 'ラ', 'M1.6,9.6 L7,9.6 M0.4,6.6 L8,6.6 Q7.6,2.4 2.4,0'],
  ['ri', 'リ', 'M1.6,9.6 L1.6,4 M7,10 L7,5 Q7,1.6 3,0'],
  ['ru', 'ル', 'M2.6,9.6 Q2.6,3 0.2,0.4 M5.4,10 L5.4,0.6 Q7.6,1.4 8.8,4'],
  ['re', 'レ', 'M1.2,10 L1.2,0.4 Q5.6,1.4 8.4,5.6'],
  ['ro', 'ロ', 'M0.8,8.6 L7.8,8.6 L7.8,0.8 L0.8,0.8 Z'],
  ['wa', 'ワ', 'M0.8,5.6 L0.8,9 L8,9 Q7.6,3 2.6,0'],
  ['wo', 'ヲ', 'M0.6,9 L8,9 Q8,7 7.2,5.6 Q6.2,2.6 2,0 M0.8,5.6 L7.2,5.6'],
  ['n', 'ン', 'M1,9 L3,7.4 M0.8,0 Q5.6,1 8.4,6.6'],
];

const HIRAGANA = [
  ['a', 'あ', 'M1,7.6 L7.6,7.6 M3.9,10 C3.5,6.4 3.7,3.2 4.4,0.6 M6.2,5.8 C4.6,1.8 2.2,0.4 1.2,1.6 C0,3.2 2.6,5.6 5.4,5.2 C8,4.8 8.8,2.2 6.4,0.4'],
  ['i', 'い', 'M1.4,8.8 C1,4.8 1.6,1.6 3.2,1 L4,2.4 M6.8,8.2 C7.8,6.6 8.4,4.8 8.4,3'],
  ['u', 'う', 'M3,9.6 L6,8.8 M1.6,6 C4.6,7.8 7.4,6.8 7.2,4.2 C7,2.2 5.4,0.8 3.2,0'],
  ['e', 'え', 'M3.2,9.6 L5.8,8.8 M1.6,6.6 L6.6,6.6 L3.8,3.5 L1,0.4 M3.8,3.5 C5.2,3.5 5,0.4 6.4,0.4 L8.6,0.6'],
  ['o', 'お', 'M0.8,7.4 L6,7.4 M3.2,10 L3.2,2 C3.2,0.2 1.4,0.6 1.2,2 C1,4 4.6,5.6 6.6,4.6 C8.6,3.6 7.6,0.4 5,0.4 M7,8.8 L8.4,7.4'],
  ['ka', 'か', 'M0.6,7 L5.6,7 C6.8,7 6.6,3.4 5.8,1.4 C5.6,0.6 4.8,0.6 4,1.2 M3.6,10 C3.2,6 2.4,3 0.6,0.4 M7.4,8.4 L8.8,6'],
  ['ki', 'き', 'M1.2,8 L6.8,8.8 M0.8,5.6 L7.4,6.4 M3.6,10 L6.2,3.6 C3,3.8 1.4,2.6 2.2,1.4 C2.8,0.4 4.6,0.2 6.4,0.4'],
  ['ku', 'く', 'M6.4,10 L1.6,5.2 L6.6,0'],
  ['ke', 'け', 'M1.2,9.6 C0.8,6 1,3 1.4,0.4 M4,6.8 L8.6,6.8 M6.6,10 L6.6,4 C6.6,2 5.6,0.6 4.2,0'],
  ['ko', 'こ', 'M2,8.4 L7,8.4 M1.4,3 C1.4,0.8 3.6,0.4 7.6,0.8'],
  ['sa', 'さ', 'M1,7 L7.6,7.8 M3.6,10 L6.4,3.6 C3,3.8 1.6,2.6 2.4,1.4 C3,0.4 4.8,0.2 6.6,0.4'],
  ['shi', 'し', 'M2,10 L2,3 C2,0 5.6,-0.2 8.2,3.2'],
  ['su', 'す', 'M0.4,7.4 L8.6,7.4 M5,10 L5,4.2 C3.6,5.8 2.2,4.8 2.6,3.6 C3,2.6 4.4,3.4 5,4.2 C5.2,2.6 4.4,1 3,0'],
  ['se', 'せ', 'M0.4,6 L8.6,6.6 M6.4,9.6 L6.4,4.4 C6.4,3.4 5.8,3.2 5,3.6 M2.6,9.2 L2.6,1.6 C2.6,0.4 4,0.4 7.6,0.6'],
  ['so', 'そ', 'M2,9.4 L6.8,9.4 L1,5.8 L8.4,6 C7,4 4.2,3.8 4.2,2.2 C4.2,0.8 5.6,0.2 7.2,0'],
  ['ta', 'た', 'M0.8,7.6 L5.2,7.6 M3.4,10 C3,6 2.2,3 0.6,0.4 M5.6,5 L8.4,5 M5.2,2.4 C5.2,0.6 6.6,0.4 8.6,0.6'],
  ['chi', 'ち', 'M0.8,7.6 L6.8,7.6 M3.8,10 L2.2,4.2 C4.4,5.6 7.8,5.4 7.8,3 C7.8,1.2 5.6,0.2 3,0'],
  ['tsu', 'つ', 'M0.4,6.6 C4,8.6 8.6,7.8 8.4,4.6 C8.2,2 5.6,0.6 2.6,0.2'],
  ['te', 'て', 'M0.6,8.6 L8.4,8.8 C6.4,7 3.2,5.6 3.4,3.2 C3.6,1.4 5.4,0.4 7.6,0.2'],
  ['to', 'と', 'M2.6,10 L3.4,5.4 M7.6,8 Q5,7 3.4,5.4 C1.8,3.8 1.2,2 2.2,1 C3.2,0 5.6,0.2 7.8,0.6'],
  ['na', 'な', 'M0.6,7.6 L4.8,7.6 M3,10 L1,4.4 M6.6,9.2 L8.2,7.8 M6.4,6.4 L6.4,2.6 C6.4,0.2 3.4,0 3.2,1.6 C3,3 5.6,3.2 8.4,0.6'],
  ['ni', 'に', 'M1.2,9.6 C0.8,6 1,3 1.4,0.4 M4.4,7.4 L8,7.4 M4.2,3 C4.2,1 5.8,0.6 8.4,0.8'],
  ['nu', 'ぬ', 'M2,8.4 L4.2,3 M5.6,9 C5,5.4 3,1.6 1.4,2.2 C0,2.8 0.6,6.6 4,7 C6.8,7.3 8.4,5.6 8.2,3.4 C8,1.2 5.8,0.2 5.2,1.4 C4.8,2.4 6.6,2.4 8.6,0.8'],
  ['ne', 'ね', 'M2.2,10 L2.2,0 M0.4,7 L3.6,7.6 L0.6,2.4 C2.6,3.2 5,7.6 7.2,6.4 C8.6,5.4 8.4,2.2 7.4,1.2 C6.4,0.2 5,0.4 5,1.4 C5,2.4 6.6,2.4 8.6,0.8'],
  ['no', 'の', 'M4.7,6.8 C4.3,4 3,1.2 1.6,1.6 C0.2,2 0.4,6 3.6,7.4 C6.4,8.6 8.6,6.6 8.4,4 C8.2,1.6 6.4,0.4 4.6,0.2'],
  ['ha', 'は', 'M1.2,9.6 C0.8,6 1,3 1.4,0.4 M4,7.2 L8.6,7.2 M6.4,9.8 L6.4,2.6 C6.4,0.2 3.6,0 3.4,1.6 C3.2,3 5.8,3.2 8.6,0.8'],
  ['hi', 'ひ', 'M0.6,8.2 L3,8.6 C1.6,5 1,1 3.6,0.6 C6.2,0.2 7,4 6.4,8.6 C7.2,8.2 8,7.2 8.8,6.6'],
  ['fu', 'ふ', 'M3.6,9.8 L5.6,8.8 M4.8,7 C3.6,5.4 6.6,3.4 5.4,1.4 C4.8,0.4 3.6,0.4 2.6,1.2 M1.8,3.6 L0.4,1.2 M7,4.6 L8.6,2'],
  ['he', 'へ', 'M0.2,3.4 Q2.4,7 3.4,7.2 Q5,6.2 8.8,2'],
  ['ho', 'ほ', 'M1.2,9.6 C0.8,6 1,3 1.4,0.4 M4,8.6 L6.4,8.6 L8.4,8.6 M4,5.8 L8.6,5.8 M6.4,8.6 L6.4,2.6 C6.4,0.2 3.6,0 3.4,1.6 C3.2,3 5.8,3.2 8.6,0.8'],
  ['ma', 'ま', 'M1,8 L7.6,8 M1.4,5.4 L7.2,5.4 M4.4,10 L4.4,2.4 C4.4,0 1.4,0 1.2,1.6 C1,3 4,3.2 8,0.6'],
  ['mi', 'み', 'M1.6,8.8 L5,8.8 L1.2,2.2 C0.6,0.8 2.6,0.6 4.6,2.4 C6,3.6 7.4,5 8.6,5.6 M6.8,7 C6.8,4 6,1.6 4.4,0'],
  ['mu', 'む', 'M0.6,7.4 L5.4,7.4 M3,10 L3,4.2 C1.4,6 0.2,4.8 0.6,3.6 C1,2.6 2.2,3.6 3,4.2 L3,2 C3,0.4 5,0.2 7,0.4 L7.4,2.6 M7,8.4 L8.6,6.6'],
  ['me', 'め', 'M2,8.4 L4.2,3 M5.6,9 C5,5.4 3,1.6 1.4,2.2 C0,2.8 0.6,6.6 4,7 C6.8,7.3 8.4,5.6 8.2,3.4 C8,1.6 6.6,0.6 5,0.2'],
  ['mo', 'も', 'M4.4,10 L4,2.6 C4,0.4 7.4,0 7.6,2.8 M1,7 L7,7 M1,4.4 L7,4.4'],
  ['ya', 'や', 'M0.4,5.6 C3,7.6 8,8.6 8.4,6 C8.6,4.4 6.6,3.8 5.4,4.4 M5.6,9.8 L6.6,8.4 M2.8,9.6 L5.4,0'],
  ['yu', 'ゆ', 'M1.4,8.6 C1,5.6 1.2,3.4 1.6,1.6 C3,3 3.4,7.6 6,7.6 C8.6,7.6 9,4 7,2.6 C6,1.9 5,2.2 3.8,3.4 M5.4,9.8 C5.6,6 5,2.6 3.4,0'],
  ['yo', 'よ', 'M5,7 L8,7 M5,10 L5,7 L5,2.4 C5,0 2,0 1.8,1.6 C1.6,3 4.6,3.2 8.6,0.6'],
  ['ra', 'ら', 'M3,9.8 L5.4,8.8 M2.2,7.2 L1.8,3.2 C4,5 8,5 8,2.8 C8,1 5.6,0.2 3,0'],
  ['ri', 'り', 'M2,9.4 C1.6,7 1.8,5 2.6,3.6 M6.6,9.8 C7.2,6.6 6.8,2.6 3.6,0'],
  ['ru', 'る', 'M1.6,9.2 L6.8,9.2 L1.4,4.6 C3.6,4.6 8,5.6 8,3 C8,0.6 4.6,-0.2 3.4,1 C2.6,1.8 3.6,2.8 4.8,2.2'],
  ['re', 'れ', 'M2.2,10 L2.2,0 M0.4,7 L3.6,7.6 L0.6,2.4 C2.6,3.2 4.8,7.6 6.4,6.6 C7.4,6 6.4,1.2 6.8,0.8 C7.2,0.4 8,1.2 8.8,2.2'],
  ['ro', 'ろ', 'M1.6,9.2 L6.8,9.2 L1.4,4.6 C3.6,4.6 8,5.6 8,3 C8,1 5.6,0.2 3,0'],
  ['wa', 'わ', 'M2.2,10 L2.2,0 M0.4,7 L3.6,7.6 L0.6,2.4 C2.6,3.2 5,7.4 7.2,6.4 C9,5.4 8,1 4.6,0.2'],
  ['wo', 'を', 'M1,8 L6.6,8 M4,10 L2,5.4 C3.2,5.6 4.6,5.8 5,4.4 M7.6,6.2 C4.4,5.4 2.4,3.4 2.6,1.8 C2.8,0.4 5,0.2 7.6,0.4'],
  ['n', 'ん', 'M5,10 L0.8,0.4 C3,1 4,5 4.8,3.6 C5.4,2.8 5,0.6 6.2,0.4 C7.2,0.2 8.2,1.6 8.8,3'],
];

// ---------------------------------------------------------------- kanji

// Characters with few strokes, shared by Japanese and Chinese. [id, sign, meaning, drawing, more search words]
const KANJI = [
  ['one', '一', 'one', 'M0.4,5 L9.2,5', 'number'],
  ['two', '二', 'two', 'M1.8,7.6 L7.8,7.6 M0.4,1.6 L9.2,1.6', 'number'],
  ['three', '三', 'three', 'M1.2,8.8 L8.4,8.8 M2.2,5.2 L7.4,5.2 M0.4,1.2 L9.2,1.2', 'number'],
  ['four', '四', 'four', 'M0.8,8.6 L3.6,8.6 L6,8.6 L8.8,8.6 L8.8,3.2 L8.8,0.8 L0.8,0.8 Z M3.6,8.6 Q3.6,4.6 1.9,3.2 M6,8.6 L6,4.2 Q6,3.2 7,3.2 L8.8,3.2', 'number'],
  ['five', '五', 'five', 'M1,9 L4.6,9 L8.6,9 M4.6,9 L3.4,0.8 M1.6,5 L7.2,5 L7.2,0.8 M0.4,0.8 L3.4,0.8 L7.2,0.8 L9.4,0.8', 'number'],
  ['six', '六', 'six', 'M4.8,10 L4.8,8.2 M0.4,6.8 L9.2,6.8 M3.4,4.6 L1,0.6 M6.2,4.6 L8.6,0.6', 'number'],
  ['seven', '七', 'seven', 'M0.4,5.2 L9.2,6.8 M4.2,10 L4.2,2 Q4.2,0.6 5.6,0.6 L9.2,0.6 L9.2,2.2', 'number'],
  ['eight', '八', 'eight', 'M3.6,8.6 Q3,3.6 0.4,0.8 M5.6,8.6 Q6.4,3.6 9.2,0.8', 'number'],
  ['nine', '九', 'nine', 'M0.6,6.6 L6.6,6.6 L6.6,2 Q6.6,0.6 8,0.6 L9.4,0.6 L9.4,2.2 M3.6,10 Q3.6,3.6 0.4,0.6', 'number'],
  ['ten', '十', 'ten', 'M0.4,5.6 L9.2,5.6 M4.8,10 L4.8,0', 'number'],
  ['hundred', '百', 'hundred', 'M0.4,9.4 L4.8,9.4 L9.2,9.4 M4.8,9.4 L3.8,7.2 M1.8,7.2 L3.8,7.2 L7.8,7.2 L7.8,3.9 L7.8,0.6 L1.8,0.6 L1.8,3.9 Z M1.8,3.9 L7.8,3.9', 'number'],
  ['thousand', '千', 'thousand', 'M7.6,9.8 L4.8,8.97 L2.2,8.2 M0.4,5.4 L9.2,5.4 M4.8,8.97 L4.8,0', 'number'],
  ['ten-thousand', '万', 'ten thousand', 'M0.4,9 L4,9 L9.2,9 M4,9 Q3.9,6.8 3.4,5.6 Q2.4,2.4 0.6,0.4 M3.4,5.6 L7.6,5.6 L7.2,1.4 Q7.1,0.4 5.6,0.6', 'number'],
  ['yen', '円', 'yen', 'M0.8,0 L0.8,4.6 L0.8,9 L4.8,9 L8.8,9 L8.8,4.6 L8.8,1 Q8.8,0 7.4,0.2 M4.8,9 L4.8,4.6 M0.8,4.6 L4.8,4.6 L8.8,4.6', 'money circle'],
  ['sun', '日', 'sun', 'M1.8,9.4 L7.8,9.4 L7.8,4.9 L7.8,0.4 L1.8,0.4 L1.8,4.9 Z M1.8,4.9 L7.8,4.9', 'day'],
  ['moon', '月', 'moon', 'M2.2,9.4 L8,9.4 L8,6.6 L8,3.8 L8,1.2 Q8,0.2 6.6,0.4 M2.2,9.4 L2.2,6.6 L2.2,3.8 L2.2,3.4 Q2.2,1.2 0.6,0.2 M2.2,6.6 L8,6.6 M2.2,3.8 L8,3.8', 'month'],
  ['fire', '火', 'fire', 'M4.8,10 L4.8,5.6 Q4.2,2.2 0.4,0.4 M4.8,5.6 Q5.6,2.2 9.2,0.4 M1.6,7.6 L2.8,5.4 M8,7.8 L6.6,5.6', 'flame'],
  ['water', '水', 'water', 'M4.8,10 L4.8,5.4 L4.8,1.2 Q4.8,0.2 3.4,0.6 M0.6,6.6 L3.4,6.6 L0.4,1.4 M8.4,8.2 L4.8,5.4 L9.2,0.8'],
  ['tree', '木', 'tree', 'M0.4,6.6 L4.8,6.6 L9.2,6.6 M4.8,10 L4.8,6.6 L4.8,0 M4.8,6.6 Q3.4,3.4 0.4,1.6 M4.8,6.6 Q6.2,3.4 9.2,1.6', 'wood'],
  ['gold', '金', 'gold', 'M4.8,10 L0.4,6.4 M4.8,10 L9.2,6.4 M2.8,6 L6.8,6 M1.8,3.6 L7.8,3.6 M4.8,6 L4.8,0.4 M0.4,0.4 L4.8,0.4 L9.2,0.4 M2.6,2.8 L3.2,1.4 M7,2.8 L6.4,1.4', 'money metal'],
  ['earth', '土', 'earth', 'M1.6,6 L8,6 M4.8,9.8 L4.8,0.6 M0.4,0.6 L4.8,0.6 L9.2,0.6', 'soil ground'],
  ['mountain', '山', 'mountain', 'M4.8,10 L4.8,0.8 M1,6.4 L1,0.8 L4.8,0.8 L8.6,0.8 L8.6,6.4'],
  ['river', '川', 'river', 'M1.6,9.6 Q1.6,3.6 0.4,0.6 M4.8,9 L4.8,1.6 M8.4,9.8 L8.4,0'],
  ['field', '田', 'field', 'M1,9 L4.8,9 L8.6,9 L8.6,4.9 L8.6,0.8 L4.8,0.8 L1,0.8 L1,4.9 Z M4.8,9 L4.8,0.8 M1,4.9 L8.6,4.9', 'rice'],
  ['stone', '石', 'stone', 'M0.4,9 L4.4,9 L9.2,9 M4.4,9 Q3.6,5 0.4,2.6 M3.6,4.6 L8.6,4.6 L8.6,0.6 L3.6,0.6 Z', 'rock'],
  ['person', '人', 'person', 'M4.6,10 Q4.6,8 4.4,6.8 Q3.6,2.8 0.4,0.4 M4.4,6.8 Q5.6,2.6 9.2,0.4', 'human people'],
  ['mouth', '口', 'mouth', 'M1.4,8.4 L8.2,8.4 L8.2,1.4 L1.4,1.4 Z'],
  ['big', '大', 'big', 'M0.4,6.4 L4.8,6.4 L9.2,6.4 M4.8,10 L4.8,6.4 Q4.2,2.6 0.4,0.4 M4.8,6.4 Q5.8,2.6 9.2,0.4', 'large'],
  ['little', '小', 'little', 'M4.8,10 L4.8,1.2 Q4.8,0.2 3.4,0.6 M2.4,6.6 Q1.8,3.6 0.4,2 M7.2,6.6 Q7.8,3.6 9.2,2', 'tiny'],
  ['middle', '中', 'middle', 'M1,7.6 L4.8,7.6 L8.6,7.6 L8.6,3 L4.8,3 L1,3 Z M4.8,10 L4.8,0', 'centre inside'],
  ['up', '上', 'up', 'M4.4,10 L4.4,5.6 L4.4,0.8 M4.4,5.6 L8.4,5.6 M0.4,0.8 L4.4,0.8 L9.2,0.8', 'above top'],
  ['down', '下', 'down', 'M0.4,9.2 L4.4,9.2 L9.2,9.2 M4.4,9.2 L4.4,6 L4.4,0 M4.4,6 L7.6,4', 'below under'],
  ['left', '左', 'left', 'M0.4,7 L9.2,7 M4.6,10 Q4,4 0.4,0.6 M4.4,3.8 L6.4,3.8 L8.8,3.8 M6.4,3.8 L6.4,0.6 M3.6,0.6 L6.4,0.6 L9.4,0.6'],
  ['right', '右', 'right', 'M0.4,7 L9.2,7 M4.6,10 Q4,4.6 0.4,1.6 M4.4,4.4 L8.8,4.4 L8.8,0.6 L4.4,0.6 Z'],
  ['heaven', '天', 'heaven', 'M1.2,9 L4.8,9 L8.4,9 M0.4,5.8 L4.8,5.8 L9.2,5.8 M4.8,9 L4.8,5.8 Q4.2,2.4 0.4,0.4 M4.8,5.8 Q5.8,2.4 9.2,0.4', 'sky'],
  ['king', '王', 'king', 'M1,9 L4.8,9 L8.6,9 M1.8,5 L7.8,5 M0.4,0.8 L4.8,0.8 L9.2,0.8 M4.8,9 L4.8,0.8'],
  ['power', '力', 'power', 'M0.6,6.6 L7.6,6.6 L7.2,1.6 Q7.1,0.4 5.4,0.6 M4.2,10 Q4,3.6 0.6,0.4', 'strength force'],
  ['heart', '心', 'heart', 'M1.6,5 L0.4,2 M3,6.6 L3,2 Q3,0.4 4.6,0.4 L6.6,0.4 Q7.6,0.4 7.6,2 M5,8.4 L6,6.4 M8,6.6 L9.2,4', 'mind spirit'],
  ['hand', '手', 'hand', 'M7.4,9.8 L4.9,9.2 L2.4,8.6 M1.2,6.4 L8.4,6.4 M0.4,4 L9.2,4 M4.9,9.2 L4.8,1.2 Q4.8,0.2 3.4,0.6'],
  ['eye', '目', 'eye', 'M2.2,9.6 L7.4,9.6 L7.4,6.5 L7.4,3.5 L7.4,0.4 L2.2,0.4 L2.2,3.5 L2.2,6.5 Z M2.2,6.5 L7.4,6.5 M2.2,3.5 L7.4,3.5'],
  ['woman', '女', 'woman', 'M4.2,10 L2,4.6 L7.8,0.4 M6.8,8.4 Q5.6,3 0.8,0.4 M0.4,6.4 L9.2,6.4'],
  ['child', '子', 'child', 'M1.6,9 L7.8,9 L4.8,6.4 L4.8,1.2 Q4.8,0.2 3.2,0.6 M0.4,5 L9.2,5'],
  ['dog', '犬', 'dog', 'M0.4,6.4 L4.8,6.4 L9.2,6.4 M4.8,10 L4.8,6.4 Q4.2,2.6 0.4,0.4 M4.8,6.4 Q5.8,2.6 9.2,0.4 M7.2,9.6 L8.4,8.2'],
  ['sword', '刀', 'sword', 'M1,8.8 L4.4,8.8 L7.8,8.8 L7.4,1.6 Q7.3,0.4 5.6,0.6 M4.4,8.8 Q4,3.6 0.6,0.4', 'katana blade'],
  ['bow', '弓', 'bow', 'M1.6,9.2 L7.4,9.2 L7.4,6.6 L1.8,6.6 L1.4,3.8 L7.8,3.8 L7.4,1.4 Q7.3,0.2 5.6,0.4', 'archery'],
  ['light', '光', 'light', 'M4.8,10 L4.8,6 M1.6,9 L2.8,7.2 M8,9.2 L6.8,7.2 M0.4,6 L3.6,6 L4.8,6 L6,6 L9.2,6 M3.6,6 Q3.4,2.4 0.4,0.4 M6,6 L6,1.6 Q6,0.4 7.4,0.4 L9.2,0.4 L9.2,2', 'shine ray'],
  ['book', '本', 'book', 'M0.4,6.6 L4.8,6.6 L9.2,6.6 M4.8,10 L4.8,6.6 L4.8,2 L4.8,0 M4.8,6.6 Q3.4,3.6 0.4,2 M4.8,6.6 Q6.2,3.6 9.2,2 M3,2 L4.8,2 L6.6,2', 'origin japan'],
];

// ---------------------------------------------------------------- Korean

// The letters of hangul: consonants, then vowels. [name, sign, drawing]
const HANGUL = [
  ['giyeok', 'ㄱ', 'M0.6,8.8 L7.2,8.8 L7.2,0.6'],
  ['nieun', 'ㄴ', 'M0.8,9.4 L0.8,1.2 L7.6,1.2'],
  ['digeut', 'ㄷ', 'M7.4,8.8 L0.8,8.8 L0.8,1.2 L7.6,1.2'],
  ['rieul', 'ㄹ', 'M0.8,9 L7.2,9 L7.2,5.1 L0.8,5.1 L0.8,1.2 L7.6,1.2'],
  ['mieum', 'ㅁ', 'M0.8,9 L7.2,9 L7.2,1.2 L0.8,1.2 Z'],
  ['bieup', 'ㅂ', 'M0.8,9.6 L0.8,5.6 L0.8,1.2 L7.2,1.2 L7.2,5.6 L7.2,9.6 M0.8,5.6 L7.2,5.6'],
  ['siot', 'ㅅ', 'M0.4,1 L4,9.4 L7.6,1'],
  ['ieung', 'ㅇ', 'O4,5.2 3.8'],
  ['jieut', 'ㅈ', 'M0.6,9 L4,9 L7.4,9 M0.4,1 L4,9 L7.6,1'],
  ['chieut', 'ㅊ', 'M2.6,9.8 L5.4,9.8 M0.6,7.8 L4,7.8 L7.4,7.8 M0.4,0.8 L4,7.8 L7.6,0.8'],
  ['kieuk', 'ㅋ', 'M0.6,8.8 L7.2,8.8 L7.2,5 L7.2,0.6 M0.8,5 L7.2,5'],
  ['tieut', 'ㅌ', 'M7.4,8.8 L0.8,8.8 L0.8,5 L0.8,1.2 L7.6,1.2 M0.8,5 L7,5'],
  ['pieup', 'ㅍ', 'M0.4,9 L2.6,9 L5.4,9 L7.6,9 M0.4,1.2 L2.6,1.2 L5.4,1.2 L7.6,1.2 M2.6,9 L2.6,1.2 M5.4,9 L5.4,1.2'],
  ['hieut', 'ㅎ', 'M2.6,9.8 L5.4,9.8 M0.6,7.6 L7.4,7.6 N O4,3.2 2.9'],
  ['double giyeok', 'ㄲ', 'M0.2,8.8 L3.6,8.8 L3.6,0.6 M5,8.8 L8.4,8.8 L8.4,0.6'],
  ['double digeut', 'ㄸ', 'M3.6,8.8 L0.2,8.8 L0.2,1.2 L3.8,1.2 M8.4,8.8 L5,8.8 L5,1.2 L8.6,1.2'],
  ['double bieup', 'ㅃ', 'M0.2,9.6 L0.2,5.6 L0.2,1.2 L3.6,1.2 L3.6,5.6 L3.6,9.6 M0.2,5.6 L3.6,5.6 M5,9.6 L5,5.6 L5,1.2 L8.4,1.2 L8.4,5.6 L8.4,9.6 M5,5.6 L8.4,5.6'],
  ['double siot', 'ㅆ', 'M0,1 L2.1,9.4 L4.2,1 M4.8,1 L6.9,9.4 L9,1'],
  ['double jieut', 'ㅉ', 'M0.1,9 L2.1,9 L4.1,9 M0,1 L2.1,9 L4.2,1 M4.9,9 L6.9,9 L8.9,9 M4.8,1 L6.9,9 L9,1'],
  ['a', 'ㅏ', 'M3,10 L3,5 L3,0 M3,5 L6.4,5'],
  ['ya', 'ㅑ', 'M3,10 L3,6.6 L3,3.4 L3,0 M3,6.6 L6.4,6.6 M3,3.4 L6.4,3.4'],
  ['eo', 'ㅓ', 'M5,10 L5,5 L5,0 M5,5 L1.6,5'],
  ['yeo', 'ㅕ', 'M5,10 L5,6.6 L5,3.4 L5,0 M5,6.6 L1.6,6.6 M5,3.4 L1.6,3.4'],
  ['o', 'ㅗ', 'M0.4,1.6 L4,1.6 L7.6,1.6 M4,1.6 L4,6.4'],
  ['yo', 'ㅛ', 'M0.4,1.6 L2.6,1.6 L5.4,1.6 L7.6,1.6 M2.6,1.6 L2.6,6.4 M5.4,1.6 L5.4,6.4'],
  ['u', 'ㅜ', 'M0.4,7 L4,7 L7.6,7 M4,7 L4,1.6'],
  ['yu', 'ㅠ', 'M0.4,7 L2.6,7 L5.4,7 L7.6,7 M2.6,7 L2.6,1.6 M5.4,7 L5.4,1.6'],
  ['eu', 'ㅡ', 'M0.4,5 L7.6,5'],
  ['i', 'ㅣ', 'M0,10 L0,0'],
  ['ae', 'ㅐ', 'M2.6,10 L2.6,5 L2.6,0 M2.6,5 L5.6,5 M5.6,10 L5.6,5 L5.6,0'],
  ['yae', 'ㅒ', 'M2.6,10 L2.6,6.6 L2.6,3.4 L2.6,0 M2.6,6.6 L5.6,6.6 M2.6,3.4 L5.6,3.4 M5.6,10 L5.6,6.6 L5.6,3.4 L5.6,0'],
  ['e', 'ㅔ', 'M0.8,5 L3.6,5 M3.6,10 L3.6,5 L3.6,0 M6.4,10 L6.4,0'],
  ['ye', 'ㅖ', 'M0.8,6.6 L3.6,6.6 M0.8,3.4 L3.6,3.4 M3.6,10 L3.6,6.6 L3.6,3.4 L3.6,0 M6.4,10 L6.4,0'],
  ['wa', 'ㅘ', 'M0,1.2 L2.4,1.2 L4.8,1.2 M2.4,1.2 L2.4,5.4 M6.4,10 L6.4,5.4 L6.4,0 M6.4,5.4 L8.8,5.4'],
  ['wae', 'ㅙ', 'M0,1.2 L2.2,1.2 L4.4,1.2 M2.2,1.2 L2.2,5.4 M5.8,10 L5.8,5.4 L5.8,0 M5.8,5.4 L8.2,5.4 M8.2,10 L8.2,5.4 L8.2,0'],
  ['oe', 'ㅚ', 'M0,1.2 L2.8,1.2 L5.6,1.2 M2.8,1.2 L2.8,5.4 M7.4,10 L7.4,0'],
  ['wo', 'ㅝ', 'M0,6.6 L2.4,6.6 L4.8,6.6 M2.4,6.6 L2.4,2 M6.8,10 L6.8,3.6 L6.8,0 M6.8,3.6 L4.4,3.6'],
  ['we', 'ㅞ', 'M0,6.6 L2,6.6 L4,6.6 M2,6.6 L2,2 M6,10 L6,3.6 L6,0 M6,3.6 L3.8,3.6 M8.4,10 L8.4,0'],
  ['wi', 'ㅟ', 'M0,6.6 L2.8,6.6 L5.6,6.6 M2.8,6.6 L2.8,2 M7.4,10 L7.4,0'],
  ['ui', 'ㅢ', 'M0,3.6 L5.6,3.6 M7.4,10 L7.4,0'],
];

// ---------------------------------------------------------------- Hebrew

// [name, sign, drawing, extra fields]: the 22 letters, then the five that have another form at the end of a word
const TALL = { rise: 0.5 };
const HEBREW = [
  ['alef', 'א', 'M0.8,9.4 L2.84,6.76 L5.56,3.24 L7.6,0.6 M6.8,9.6 L5.56,3.24 M2.84,6.76 L1.4,0.6'],
  ['bet', 'ב', 'M0.8,9.2 L5.6,9.2 Q6.8,9.2 6.8,8 L6.8,0.8 M0.4,0.8 L6.8,0.8 L8.2,0.8'],
  ['gimel', 'ג', 'M2.2,9.2 L4.4,9.2 Q5.4,9.2 5.4,8 L5.4,3.4 L5.4,0.6 M5.4,3.4 L1.6,0.6'],
  ['dalet', 'ד', 'M0.4,9.2 L6.4,9.2 L8,9.2 M6.4,9.2 L6.4,0.6'],
  ['he', 'ה', 'M0.6,9.2 L6,9.2 Q7.2,9.2 7.2,8 L7.2,0.6 M1.6,6 L1.6,0.6'],
  ['vav', 'ו', 'M2.4,9.4 L4.2,9.4 L4.2,0.6'],
  ['zayin', 'ז', 'M2,9.4 L4.1,9.1 L6.2,8.8 M4.1,9.1 L4.1,0.6'],
  ['het', 'ח', 'M1,0.6 L1,9.2 L6.2,9.2 Q7.4,9.2 7.4,8 L7.4,0.6'],
  ['tet', 'ט', 'M1,9.4 L1,2 Q1,0.6 2.4,0.6 L6,0.6 Q7.6,0.6 7.6,2.2 L7.6,7.6 Q7.6,9.4 6,9.4 Q4.4,9.4 4.4,7.4'],
  ['yod', 'י', 'M3.2,9.4 L5,9.4 L5,5.6'],
  ['kaf', 'כ', 'M1,9.2 L5.4,9.2 Q7.4,9.2 7.4,7 L7.4,3 Q7.4,0.8 5.4,0.8 L1,0.8'],
  ['lamed', 'ל', 'M1.6,12.4 L1.6,8.6 L6.6,8.6 Q7.4,8.6 7.2,7.4 Q6.6,3.6 3,0.6', TALL],
  ['mem', 'מ', 'M0.8,0.6 L2.2,8.2 M1.2,9.6 L2.2,8.2 Q4.2,9.8 6.2,9.2 Q7.6,8.6 7.6,7 L7.6,0.8 L3.4,0.8'],
  ['nun', 'נ', 'M2.6,9.2 L4.6,9.2 Q5.6,9.2 5.6,8 L5.6,0.8 L1.6,0.8'],
  ['samekh', 'ס', 'M0.6,9.2 L1.6,9.2 L6,9.2 Q7.6,9.2 7.6,7 L7.6,3.6 Q7.6,0.6 4.6,0.6 Q1.6,0.6 1.6,3.6 L1.6,9.2'],
  ['ayin', 'ע', 'M7,9.4 L7,5.4 Q6.9,2.2 3.9,1.4 Q2.4,1 0.8,0.6 M2,9.4 L3.9,1.4'],
  ['pe', 'פ', 'M3.8,5.4 L1.2,5.4 L1.2,9.2 L5.4,9.2 Q7.4,9.2 7.4,7 L7.4,3 Q7.4,0.8 5.4,0.8 L1,0.8'],
  ['tsadi', 'צ', 'M1.4,9.4 L4.37,4.67 L6.8,0.8 L1,0.8 M7,9.4 L6.6,7.4 L4.37,4.67'],
  ['qof', 'ק', 'M0.8,9.2 L6,9.2 Q7.4,9.2 7.4,7.6 Q7.4,4.6 4,3 M1.8,6 L1.8,-2.6', DOWN],
  ['resh', 'ר', 'M0.8,9.2 L5.6,9.2 Q7,9.2 7,7.8 L7,0.6'],
  ['shin', 'ש', 'M1,9.4 L1,2.2 Q1,0.8 2.6,0.8 L4.4,0.8 L6.2,0.8 Q7.8,0.8 7.8,2.2 L7.8,9.4 M4.4,9.4 L4.4,0.8'],
  ['tav', 'ת', 'M0.6,0.6 L2.2,0.6 L2.2,9.2 L6,9.2 Q7.4,9.2 7.4,7.8 L7.4,0.6'],
  ['final kaf', 'ך', 'M0.8,9.2 L6.4,9.2 L6.4,-2.6', DOWN],
  ['final mem', 'ם', 'M0.6,9.2 L1.4,9.2 L6,9.2 Q7.4,9.2 7.4,7.8 L7.4,0.8 L1.4,0.8 L1.4,9.2'],
  ['final nun', 'ן', 'M3,9.4 L4.4,9.4 L4.4,-2.6', DOWN],
  ['final pe', 'ף', 'M3.8,5.4 L1.2,5.4 L1.2,9.2 L5.4,9.2 Q7.4,9.2 7.4,7 L7.4,-2.6', DOWN],
  ['final tsadi', 'ץ', 'M1.4,9.4 L4,5 M6.8,9.4 L6.4,7.4 L4,5 L4,-2.6', DOWN],
];

// ---------------------------------------------------------------- the shapes

const letter = (id, name, sign, d, extra) => text(id, name, 'letters', sign, d, extra);

export const SCRIPT_SHAPES = [
  ...GREEK_SMALL.map(([id, name, sign, d]) => letter(`greek-${id}`, name, sign, d, { sub: 'Greek letters', tags: `${sign} greek letter`, drop: DROP })),
  ...GREEK_CAPITALS.map(([id, sign, latin]) => letter(`greek-cap-${id}`, `Capital ${id}`, sign, LETTERS[latin], {
    sub: 'Greek letters', tags: `${sign} greek letter`,
  })),
  ...MARKED.map(([id, sign, , mark, d, , where, needs = {}]) => letter(`letter-${id}`, `Letter ${sign}`, sign, d, {
    sub: 'Accented capitals', tags: `${sign} ${id[0]} ${WORDS[mark]} ${where}`, ...needs,
  })),
  ...MORE_CAPITALS.map(([id, name, sign, d, words, needs = {}]) => letter(`letter-${id}`, name, sign, d, { sub: 'Accented capitals', tags: `${sign} ${words}`, ...needs })),
  ...MARKED.map(([id, , sign, mark, , d, where]) => letter(`small-${id}`, `Small letter ${sign}`, sign, d, {
    sub: 'Accented small letters', tags: `${sign} ${id[0]} ${WORDS[mark]} ${where} lowercase little`, drop: DROP,
  })),
  ...MORE_SMALL.map(([id, name, sign, d, words]) => letter(`small-${id}`, name, sign, d, {
    sub: 'Accented small letters', tags: `${sign} ${words} lowercase little`, drop: DROP,
  })),
  ...CYRILLIC.map(([id, sign, , d, , needs = {}]) => letter(`cyrillic-${id}`, `Cyrillic ${sign}`, sign, d, {
    sub: 'Cyrillic capitals', tags: `${sign} russian ukrainian azbuka`, ...needs,
  })),
  ...CYRILLIC.map(([id, capital, sign, d, own]) => letter(`cyrillic-small-${id}`, `Cyrillic small ${sign}`, sign, own || little(d), {
    sub: 'Cyrillic small letters', tags: `${sign} russian ukrainian azbuka lowercase little`, drop: DROP,
  })),
  ...HIRAGANA.map(([sound, sign, d]) => letter(`hiragana-${sound}`, `Hiragana ${sound}`, sign, d, { sub: 'Hiragana', tags: `${sign} ${sound} japanese kana` })),
  ...KATAKANA.map(([sound, sign, d]) => letter(`katakana-${sound}`, `Katakana ${sound}`, sign, d, { sub: 'Katakana', tags: `${sign} ${sound} japanese kana` })),
  ...KANJI.map(([id, sign, meaning, d, words]) => letter(`kanji-${id}`, `Kanji ${meaning}`, sign, d, {
    sub: 'Kanji', tags: `${sign} japanese chinese character hanzi${words ? ` ${words}` : ''}`,
  })),
  ...HANGUL.map(([name, sign, d]) => letter(`hangul-${name.replace(' ', '-')}`, `Hangul ${name}`, sign, d, { sub: 'Hangul', tags: `${sign} korean jamo` })),
  ...HEBREW.map(([name, sign, d, needs = {}]) => letter(`hebrew-${name.replace(' ', '-')}`, `Hebrew ${name}`, sign, d, {
    sub: 'Hebrew letters', tags: `${sign} alefbet`, ...needs,
  })),
];
