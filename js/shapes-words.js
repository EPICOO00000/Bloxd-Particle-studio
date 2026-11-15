// Whole words, outline letters and three ways to send a letter without writing
// it: Morse code, Braille and flag signals. Plus the faces people type in a
// chat. Everything here is made from the stroke letters of shapes-text.js or
// from a small table, so a new word is one more entry in WORDS.

import { drawnShape, parsePath, placeDrawing, joinDrawings, RAD, fix } from './shape-kit.js';
import { LETTERS, DIGITS } from './shapes-text.js';

const extent = (drawing) => {
  let x0 = Infinity;
  let x1 = -Infinity;
  for (const [x] of [...drawing.polys.flat(), ...drawing.dots]) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
  }
  return [x0, x1];
};

// ---------------------------------------------------------------- words

const GAP = 1.9; // between two letters, where a capital is 10 high

// An I between letters has no bars: they read as dots.
const plain = (ch) => (ch === 'I' ? 'M0,0 L0,10' : LETTERS[ch] || DIGITS[ch]);

/** A word as one drawing. `glyphOf` gives the drawing of a sign; left out, the word is in capital letters and numbers. */
export function wordDrawing(word, glyphOf = plain) {
  let x = 0;
  const parts = [];
  for (const ch of word) {
    if (ch === ' ') {
      x += 3.6;
      continue;
    }
    const drawing = parsePath(glyphOf(ch));
    const [x0, x1] = extent(drawing);
    parts.push(placeDrawing(drawing, { x: x - x0 }));
    x += x1 - x0 + GAP;
  }
  return joinDrawings(...parts);
}

// Words a map maker wants to hang in the air. The name is "The word WIN", the sign under the picture is the word.
const WORDS = [
  ['GG', 'good game well played'], ['WIN', 'victory won'], ['LOSE', 'lost defeat'], ['START', 'begin spawn'],
  ['FINISH', 'end line goal'], ['GO', 'start run'], ['STOP', 'halt wait'], ['READY', 'set prepare'],
  ['FIGHT', 'battle duel'], ['BOSS', 'enemy battle'], ['STORE', 'shop buy sell'], ['SPAWN', 'start respawn'],
  ['LOBBY', 'hub waiting room'], ['PVP', 'player versus player battle'], ['ZONE', 'safe area no fighting'], ['DANGER', 'warning careful'],
  ['EXIT', 'way out leave'], ['ENTER', 'way in door'], ['OPEN', 'door shop'], ['CLOSED', 'shut door shop'],
  ['LEVEL', 'stage floor'], ['BONUS', 'extra reward'], ['GAME', 'play'], ['OVER', 'game end'],
  ['PLAY', 'start game'], ['PAUSE', 'wait break'], ['SCORE', 'points'], ['TEAM', 'group squad'],
  ['VIP', 'very important member'], ['AFK', 'away from keyboard'], ['LOL', 'laugh funny'], ['WOW', 'amazing surprise'],
  ['OMG', 'surprise shock'], ['NOOB', 'beginner newbie'], ['PRO', 'expert skilled'], ['EZ', 'easy'],
  ['BOOM', 'explosion bang'], ['BANG', 'explosion shot'], ['POW', 'hit punch comic'], ['ZAP', 'electric shock comic'],
  ['HELLO', 'greeting welcome'], ['HI', 'hello greeting'], ['BYE', 'goodbye leave'], ['YES', 'agree right'],
  ['NO', 'refuse wrong'], ['OK', 'okay fine'], ['HELP', 'guide rules sos'], ['WELCOME', 'greeting hello'],
  ['THANKS', 'thank you'], ['SORRY', 'apology oops'], ['LOVE', 'like'], ['COOL', 'nice great'],
  ['NICE', 'good great'], ['EPIC', 'great legendary'], ['KING', 'ruler best'], ['QUEEN', 'ruler best'],
  ['HOME', 'house base'], ['BASE', 'camp home'], ['ARENA', 'battle ring'], ['PARKOUR', 'jump course obby'],
  ['JUMP', 'hop leap'], ['RUN', 'sprint fast'], ['UP', 'climb above'], ['DOWN', 'below fall'],
  ['LEFT', 'side turn'], ['RIGHT', 'side turn'], ['NEW', 'fresh update'], ['FREE', 'gift no cost'],
  ['SALE', 'cheap shop offer'], ['MAX', 'most full top'], ['HP', 'health points life'], ['KO', 'knock out'],
  ['VS', 'versus against'], ['TOP', 'best first'], ['END', 'finish over'], ['WINNER', 'champion first'],
  ['BLOXD', 'game name'], ['SECRET', 'hidden'], ['QUEST', 'mission task'], ['GOAL', 'target finish'],
];

const words = WORDS.map(([word, more]) => drawnShape({
  id: `word-${word.toLowerCase()}`, name: `The word ${word}`, cat: 'letters', sub: 'Words', label: word,
  tags: `${word} text writing ${more}`, draw: () => wordDrawing(word), count: Math.max(60, Math.min(160, 20 * word.length)),
}));

// ---------------------------------------------------------------- outline letters
//
// The line around a thick letter. It is worked out from the stroke letter: how
// far every spot is from the nearest stroke, and then the line where that is
// exactly `THICK`.

const THICK = 0.9;
const CELL = 0.3;

function outline(d) {
  const strokes = [];
  for (const poly of parsePath(d).polys) {
    for (let i = 1; i < poly.length; i++) strokes.push([poly[i - 1][0], poly[i - 1][1], poly[i][0], poly[i][1]]);
  }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [ax, ay, bx, by] of strokes) {
    x0 = Math.min(x0, ax, bx); x1 = Math.max(x1, ax, bx);
    y0 = Math.min(y0, ay, by); y1 = Math.max(y1, ay, by);
  }
  // the grid starts at an odd spot, so that none of its lines runs exactly along the edge of an upright or level stroke
  const ox = x0 - THICK - CELL - 0.137;
  const oy = y0 - THICK - CELL - 0.071;
  const nx = Math.ceil((x1 - x0 + 2 * THICK) / CELL) + 4;
  const ny = Math.ceil((y1 - y0 + 2 * THICK) / CELL) + 4;
  const distance = (px, py) => {
    let least = Infinity;
    for (const [ax, ay, bx, by] of strokes) {
      const dx = bx - ax;
      const dy = by - ay;
      const len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
      const m = Math.hypot(ax + t * dx - px, ay + t * dy - py);
      if (m < least) least = m;
    }
    return least;
  };
  const far = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) far[j * nx + i] = distance(ox + i * CELL, oy + j * CELL) - THICK;
  }
  // where the line crosses the side of a square of the grid: worked out once, so neighbours share the very same point
  const crossings = new Map();
  const cross = (i0, j0, i1, j1) => {
    const key = (j0 * nx + i0) * nx * ny + (j1 * nx + i1);
    if (!crossings.has(key)) {
      // halve the stretch until the spot is found: a straight guess is off where two edges run close together
      const inside = far[j0 * nx + i0] < 0;
      let lo = 0;
      let hi = 1;
      for (let k = 0; k < 16; k++) {
        const t = (lo + hi) / 2;
        if ((distance(ox + (i0 + (i1 - i0) * t) * CELL, oy + (j0 + (j1 - j0) * t) * CELL) < THICK) === inside) lo = t;
        else hi = t;
      }
      const t = (lo + hi) / 2;
      crossings.set(key, { x: ox + (i0 + (i1 - i0) * t) * CELL, y: oy + (j0 + (j1 - j0) * t) * CELL, next: [] });
    }
    return crossings.get(key);
  };
  const link = (p, q) => {
    p.next.push(q);
    q.next.push(p);
  };
  for (let j = 0; j + 1 < ny; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      const a = far[j * nx + i] < 0;
      const b = far[j * nx + i + 1] < 0;
      const c = far[(j + 1) * nx + i + 1] < 0;
      const e = far[(j + 1) * nx + i] < 0;
      const kind = (a ? 1 : 0) + (b ? 2 : 0) + (c ? 4 : 0) + (e ? 8 : 0);
      if (kind === 0 || kind === 15) continue;
      const bottom = () => cross(i, j, i + 1, j);
      const right = () => cross(i + 1, j, i + 1, j + 1);
      const top = () => cross(i, j + 1, i + 1, j + 1);
      const left = () => cross(i, j, i, j + 1);
      if (kind === 1 || kind === 14) link(left(), bottom());
      else if (kind === 2 || kind === 13) link(bottom(), right());
      else if (kind === 4 || kind === 11) link(right(), top());
      else if (kind === 8 || kind === 7) link(left(), top());
      else if (kind === 3 || kind === 12) link(left(), right());
      else if (kind === 6 || kind === 9) link(bottom(), top());
      else {
        // two corners inside, opposite each other: the middle of the square says which way they join
        const mid = (far[j * nx + i] + far[j * nx + i + 1] + far[(j + 1) * nx + i + 1] + far[(j + 1) * nx + i]) / 4 < 0;
        if ((kind === 5) === mid) {
          link(left(), top());
          link(bottom(), right());
        } else {
          link(left(), bottom());
          link(right(), top());
        }
      }
    }
  }
  const polys = [];
  const done = new Set();
  for (const start of crossings.values()) {
    if (done.has(start)) continue;
    const poly = [[start.x, start.y]];
    done.add(start);
    let prev = null;
    let at = start;
    for (;;) {
      const to = at.next.find((p) => p !== prev && (!done.has(p) || (p === start && poly.length > 2)));
      if (!to) break;
      poly.push([to.x, to.y]);
      if (to === start) break;
      done.add(to);
      prev = at;
      at = to;
    }
    const tidy = poly.length > 3 && sharpen(poly, distance);
    if (tidy) polys.push(tidy);
  }
  return { polys, dots: [] };
}

/**
 * Where two strokes meet, the outline has a sharp inner corner, and the grid cuts
 * it off with one or two short slanted pieces. This puts the corner back: the
 * lines on either side are carried on until they meet. Only bends that turn
 * away from the letter are corners; the round ends turn the other way.
 */
function sharpen(loop, distance) {
  const all = loop.slice(0, -1);
  let pts = all.filter((p, i) => {
    const q = all[(i + all.length - 1) % all.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > CELL * 0.2;
  });
  const n = pts.length;
  if (n < 5) return null; // a speck, not part of the letter
  const turnAt = (list, i) => {
    const a = list[(i + n - 1) % n];
    const b = list[i];
    const c = list[(i + 1) % n];
    return Math.atan2((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]), (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1])) / RAD;
  };
  // start on a straight stretch, so that no corner lies across the ends of the list
  let first = 0;
  let calm = Infinity;
  for (let i = 0; i < n; i++) {
    const m = Math.max(Math.abs(turnAt(pts, i)), Math.abs(turnAt(pts, (i + 1) % n)), Math.abs(turnAt(pts, (i + n - 1) % n)));
    if (m < calm) {
      calm = m;
      first = i;
    }
  }
  pts = [...pts.slice(first), ...pts.slice(0, first)];
  const len = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
  const inkLeft = distance(
    (pts[0][0] + pts[1][0]) / 2 - ((pts[1][1] - pts[0][1]) / len) * 0.12,
    (pts[0][1] + pts[1][1]) / 2 + ((pts[1][0] - pts[0][0]) / len) * 0.12,
  ) < THICK;
  const away = pts.map((_, i) => turnAt(pts, i) * (inkLeft ? -1 : 1)); // degrees the outline turns away from the letter
  const out = pts.slice();
  for (let i = 1; i < n - 1; i++) {
    if (away[i] < 15) continue;
    let j = i;
    let total = away[i];
    while (j - i < 2 && j + 2 < n && away[j + 1] >= 15) {
      j++;
      total += away[j];
    }
    if (j === i || total < 50) continue;
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[j];
    const e = pts[j + 1];
    const rx = b[0] - a[0], ry = b[1] - a[1], sx = c[0] - e[0], sy = c[1] - e[1];
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((e[0] - a[0]) * sy - (e[1] - a[1]) * sx) / den;
    const hit = [a[0] + t * rx, a[1] + t * ry];
    if (Math.hypot(hit[0] - (b[0] + c[0]) / 2, hit[1] - (b[1] + c[1]) / 2) > CELL * 3) continue;
    out[i] = hit;
    for (let k = i + 1; k <= j; k++) out[k] = null;
    i = j;
  }
  const kept = out.filter(Boolean);
  kept.push(kept[0]);
  return kept;
}

const hollow = (id, name, cat, sub, d, tags) => {
  const [x0, x1] = extent(parsePath(d));
  return drawnShape({ id, name, cat, sub, tags, draw: () => outline(d), box: [(x0 + x1) / 2, 5, 5 + THICK + 0.05] });
};

const outlines = [
  ...Object.entries(LETTERS).map(([ch, d]) => hollow(`outline-letter-${ch.toLowerCase()}`, `Outline letter ${ch}`, 'letters', 'Outline letters', d,
    `${ch} hollow bubble thick big bold`)),
  ...Object.entries(DIGITS).map(([ch, d]) => hollow(`outline-digit-${ch}`, `Outline number ${ch}`, 'numbers', 'Outline numbers', d,
    `${ch} hollow bubble thick big bold`)),
];

// ---------------------------------------------------------------- Morse code
//
// A dot is one particle and a dash three in a row, with a gap as wide as a
// dot between them. "How many" works in steps, as in pixel art: every particle
// becomes a block of 2 x 2 or 3 x 3. A long sign fills the box from side to
// side; a short one is drawn as if it were 7 dots wide, or the single dot of
// the E would be as big as the box.

const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
  N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
};

function morse(ch, code) {
  const at = []; // where the particles are, counted in dots from the left
  let x = 0;
  for (const sign of code) {
    for (let i = 0; i < (sign === '.' ? 1 : 3); i++) at.push(x + i);
    x += sign === '.' ? 2 : 4;
  }
  const wide = x - 1;
  const step = 2 / Math.max(wide, 7);
  const least = at.length * Math.ceil(Math.sqrt(12 / at.length)) ** 2; // 12 particles or more, in whole blocks
  return {
    id: `morse-${ch.toLowerCase()}`, name: `Morse ${ch}`, cat: 'letters', sub: 'Morse code', group: 'flat', tidy: true, count: least, min: least,
    tags: `${ch} code ${[...code].map((sign) => (sign === '.' ? 'dot' : 'dash')).join(' ')} telegraph signal beep`,
    gen: (n) => {
      const m = Math.max(1, Math.floor(Math.sqrt(n / at.length)));
      const out = [];
      for (const c of at) {
        for (let j = 0; j < m; j++) {
          for (let i = 0; i < m; i++) out.push([(c + (i + 0.5) / m - wide / 2) * step, ((j + 0.5) / m - 0.5) * step, 0]);
        }
      }
      return out;
    },
  };
}

const morseShapes = Object.entries(MORSE).sort(([a], [b]) => (/\d/.test(a) ? 1 : 0) - (/\d/.test(b) ? 1 : 0) || a.localeCompare(b))
  .map(([ch, code]) => morse(ch, code));

// ---------------------------------------------------------------- Braille
//
// Six places, two across and three down. A ring is a raised dot; a place that
// stays flat is a single particle, so the eye can tell which dots are raised.

const BRAILLE = {
  A: '1', B: '12', C: '14', D: '145', E: '15', F: '124', G: '1245', H: '125', I: '24', J: '245', K: '13', L: '123', M: '134',
  N: '1345', O: '135', P: '1234', Q: '12345', R: '1235', S: '234', T: '2345', U: '136', V: '1236', W: '2456', X: '1346', Y: '13456', Z: '1356',
};

const braille = (raised) => [1, 2, 3, 4, 5, 6].map((k) => {
  const x = k > 3 ? 1.5 : 0;
  const y = 3 - ((k - 1) % 3) * 1.5;
  return raised.includes(String(k)) ? `O${x},${y} 0.5` : `D${x},${y}`;
}).join(' ');

const brailleShapes = Object.entries(BRAILLE).map(([ch, raised]) => drawnShape({
  id: `braille-${ch.toLowerCase()}`, name: `Braille ${ch}`, cat: 'letters', sub: 'Braille', draw: braille(raised), box: [0.75, 1.5, 2.06],
  tags: `${ch} dots raised touch blind reading code`,
}));

// ---------------------------------------------------------------- flag signals
//
// Semaphore: a signaller holds two flags, and where they point is the letter.
// The directions are the way you see them, standing in front of the signaller.

const POINTS = { E: 0, NE: 45, N: 90, NW: 135, W: 180, SW: 225, S: 270, SE: 315 };
const SEMAPHORE = {
  A: 'S SW', B: 'S W', C: 'S NW', D: 'S N', E: 'S NE', F: 'S E', G: 'S SE', H: 'SW W', I: 'SW NW', J: 'N E', K: 'SW N', L: 'SW NE', M: 'SW E',
  N: 'SW SE', O: 'W NW', P: 'W N', Q: 'W NE', R: 'W E', S: 'W SE', T: 'NW N', U: 'NW NE', V: 'N SE', W: 'NE E', X: 'NE SE', Y: 'NW E', Z: 'SE E',
};
const SIGNALLER = 'O0,3.1 0.65 M0,2.45 L0,-1.2 M-1.3,1.7 L1.3,1.7 M-0.9,-3.6 L0,-1.2 L0.9,-3.6';
const REACH = 4.2; // from the shoulder to the tip of the stick
const FLAG = 1.5;

function semaphore(pair) {
  const [first, second] = pair.split(' ');
  const side = (name) => Math.sign(Math.round(Math.cos(POINTS[name] * RAD) * 10)); // -1 left, 1 right, 0 straight up or down
  // each flag is held on its own side; one that points straight up or down takes the side the other leaves free
  let a = side(first);
  let b = side(second);
  if (!a) a = b ? -b : -1;
  if (!b) b = a ? -a : 1;
  if (!side(first) && !side(second)) b = 1;
  let d = SIGNALLER;
  for (const [name, hand] of [[first, a], [second, b]]) {
    const ux = Math.cos(POINTS[name] * RAD);
    const uy = Math.sin(POINTS[name] * RAD);
    // the flag flies on the outer side of the stick: left of it for the right hand, right of it for the left hand
    const nx = -uy * hand;
    const ny = ux * hand;
    const sx = 1.3 * hand;
    const tip = [sx + ux * REACH, 1.7 + uy * REACH];
    const low = [tip[0] - ux * FLAG, tip[1] - uy * FLAG];
    const at = ([x, y]) => `${fix(x)},${fix(y)}`;
    d += ` M${sx},1.7 L${at(tip)} L${at([tip[0] + nx * FLAG, tip[1] + ny * FLAG])} L${at([low[0] + nx * FLAG, low[1] + ny * FLAG])} L${at(low)}`
      + ` L${at([tip[0] + nx * FLAG, tip[1] + ny * FLAG])}`;
  }
  return d;
}

const flagShapes = Object.entries(SEMAPHORE).map(([ch, pair]) => drawnShape({
  id: `flag-signal-${ch.toLowerCase()}`, name: `Flag signal ${ch}`, cat: 'letters', sub: 'Flag signals', draw: semaphore(pair), box: [0, 1.15, 5.6],
  tags: `${ch} semaphore flags signaller navy scouts code`,
}));

// ---------------------------------------------------------------- pigpen cipher
//
// A secret alphabet: every letter is drawn as the walls of its box. A to I sit
// in a noughts-and-crosses grid, J to R in the same grid with a dot, S to V in
// the four corners of a big X, and W to Z in the X with a dot.

const WALLS = { t: 'M0,10 L10,10', r: 'M10,10 L10,0', b: 'M10,0 L0,0', l: 'M0,0 L0,10' };
const GRID_CELLS = ['rb', 'lrb', 'lb', 'trb', 'trbl', 'tlb', 'tr', 'tlr', 'tl']; // A to I: which walls each box has
const X_CELLS = ['M0,9 L5,1 L10,9', 'M1,10 L9,5 L1,0', 'M9,10 L1,5 L9,0', 'M0,1 L5,9 L10,1']; // S to V: top, left, right, bottom
const X_DOTS = ['D5,6.6', 'D3.4,5', 'D6.6,5', 'D5,3.4'];

function pigpen(i) {
  if (i < 18) {
    // the walls as one stroke, in the order top, right, bottom, left, starting after the open side
    const walls = GRID_CELLS[i % 9];
    const order = 'trbl';
    const start = [...order].findIndex((w, k) => walls.includes(w) && !walls.includes(order[(k + 3) % 4]));
    const run = walls.length === 4 ? 'M0,10 L10,10 L10,0 L0,0 Z' : [...Array(4).keys()].map((k) => order[(Math.max(0, start) + k) % 4])
      .filter((w) => walls.includes(w)).map((w, k) => (k ? WALLS[w].replace(/^M\S+ /, '') : WALLS[w])).join(' ');
    return `${run}${i >= 9 ? ' D5,5' : ''}`;
  }
  return `${X_CELLS[(i - 18) % 4]}${i >= 22 ? ` ${X_DOTS[(i - 18) % 4]}` : ''}`;
}

const pigpenShapes = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((ch, i) => drawnShape({
  id: `pigpen-${ch.toLowerCase()}`, name: `Pigpen ${ch}`, cat: 'letters', sub: 'Pigpen cipher', draw: pigpen(i), box: [5, 5, 5.6],
  tags: `${ch} secret code cipher spy mason tic tac toe`,
}));

// ---------------------------------------------------------------- ogham
//
// The old Irish alphabet, cut along the edge of a standing stone and read from
// the bottom up: one to five strokes to the right of the stem, to the left of
// it, slanting across it, or short ones straight across (the vowels).

// [letter, its Irish name, family (0 right, 1 left, 2 slanting, 3 across), strokes]
const OGHAM = [
  ['B', 'beith', 0, 1], ['L', 'luis', 0, 2], ['F', 'fearn', 0, 3], ['S', 'sail', 0, 4], ['N', 'nion', 0, 5],
  ['H', 'uath', 1, 1], ['D', 'dair', 1, 2], ['T', 'tinne', 1, 3], ['C', 'coll', 1, 4], ['Q', 'ceirt', 1, 5],
  ['M', 'muin', 2, 1], ['G', 'gort', 2, 2], ['NG', 'ngeadal', 2, 3], ['Z', 'straif', 2, 4], ['R', 'ruis', 2, 5],
  ['A', 'ailm', 3, 1], ['O', 'onn', 3, 2], ['U', 'ur', 3, 3], ['E', 'eadhadh', 3, 4], ['I', 'iodhadh', 3, 5],
];
const OGHAM_STROKE = [(y) => `M0,${y} L4,${y}`, (y) => `M-4,${y} L0,${y}`, (y) => `M-3.6,${fix(y - 1.5)} L3.6,${fix(y + 1.5)}`, (y) => `M-1.7,${y} L1.7,${y}`];

const oghamShapes = OGHAM.map(([ch, irish, family, strokes]) => drawnShape({
  id: `ogham-${ch.toLowerCase()}`, name: `Ogham ${ch}`, cat: 'letters', sub: 'Ogham', box: [0, 0, 5.6],
  draw: `M0,-5 L0,5 ${Array.from({ length: strokes }, (_, k) => OGHAM_STROKE[family](fix((k - (strokes - 1) / 2) * 1.7))).join(' ')}`,
  tags: `${ch} ${irish} irish celtic old alphabet stone tree letter`,
}));

// ---------------------------------------------------------------- typed faces

const EYES = 'O0,7.4 0.75 O0,2.6 0.75'; // the colon
const SMILE = 'N A0,5 5.2 -55 55'; // )
const FROWN = 'N A8.4,5 5.2 125 235'; // (
const LINE = 'M6,1.5 L10,1.5'; // _ between two eyes that are 4 wide each

// [id, name, sign, drawing, search words]
const TYPED = [
  ['smile', 'Typed smile', ':)', `${EYES} ${SMILE}`, 'happy'],
  ['frown', 'Typed frown', ':(', `${EYES} ${FROWN}`, 'sad unhappy'],
  ['grin', 'Typed grin', ':D', `${EYES} M3.2,0.6 L3.2,9.4 L4.4,9.4 E4.4,5 4.2,4.4 90 -90 L3.2,0.6`, 'happy laugh big smile'],
  ['wink', 'Typed wink', ';)', `${EYES} M0.75,2.6 Q0.9,0.6 -0.6,-0.4 ${SMILE}`, 'joke flirt'],
  ['tongue', 'Typed tongue', ':P', `${EYES} M3.2,0.6 L3.2,9.4 L5,9.4 A5,6.9 2.5 90 -90 L3.2,4.4`, 'silly cheeky'],
  ['gasp', 'Typed gasp', ':O', `${EYES} E6.4,5 3.2,4.4 90 450`, 'surprised shock wow'],
  ['straight', 'Typed straight face', ':|', `${EYES} M4,0.6 L4,9.4`, 'neutral blank'],
  ['unsure', 'Typed unsure face', ':/', `${EYES} M3,0.6 L7,9.4`, 'hmm doubt'],
  ['cat-smile', 'Typed cat smile', ':3', `${EYES} A5.5,7.5 2.5 150 -90 A5.5,2.5 2.5 90 -150`, 'cute kitten'],
  ['heart', 'Typed heart', '<3', 'M5,8.6 L0,5 L5,1.4 N A9.5,7.5 2.5 150 -90 A9.5,2.5 2.5 90 -150', 'love like'],
  ['laugh', 'Typed laugh', 'XD', 'M0,0.6 L5.5,9.4 M0,9.4 L5.5,0.6 M8,0.6 L8,9.4 L9.2,9.4 E9.2,5 4.2,4.4 90 -90 L8,0.6', 'lol funny'],
  ['angry', 'Typed angry face', '>:(', `M-6.4,8.2 L-2.8,5 L-6.4,1.8 ${EYES} ${FROWN}`, 'mad cross'],
  ['cool', 'Typed cool face', 'B)', 'M0,0.6 L0,9.4 L2.2,9.4 A2.2,7.2 2.2 90 -90 L0,5 M2.2,5 L2.6,5 A2.6,2.8 2.2 90 -90 L0,0.6 N A3.6,5 5.2 -55 55', 'sunglasses shades'],
  ['happy-eyes', 'Typed happy eyes', '^_^', `M0,5.5 L2,8.5 L4,5.5 ${LINE} M12,5.5 L14,8.5 L16,5.5`, 'glad smile cute'],
  ['tears', 'Typed tears', 'T_T', `M0,8.5 L4,8.5 M2,8.5 L2,3 ${LINE} M12,8.5 L16,8.5 M14,8.5 L14,3`, 'crying sad'],
  ['flat', 'Typed flat face', '-_-', `M0,6 L4,6 ${LINE} M12,6 L16,6`, 'bored annoyed tired'],
  ['puzzled', 'Typed puzzled eyes', 'o_O', 'O2,4.6 1.6 M5.6,1.5 L9.2,1.5 O13.4,6 3', 'confused what huh'],
  ['squint', 'Typed squint', '>_<', `M0,8.5 L4,6 L0,3.5 ${LINE} M16,8.5 L12,6 L16,3.5`, 'ouch embarrassed'],
  ['uwu', 'Typed uwu', 'UwU', 'M0,9 L0,5.5 A2,5.5 2 180 360 L4,9 M6,6.5 L7,3.5 L8,5.8 L9,3.5 L10,6.5 M12,9 L12,5.5 A14,5.5 2 180 360 L16,9', 'cute happy'],
  ['owo', 'Typed owo', 'OwO', 'O2.4,6 2.4 M6.2,6.5 L7.2,3.6 L8.2,5.8 L9.2,3.6 L10.2,6.5 O14,6 2.4', 'curious cute'],
  ['knocked-out', 'Typed knocked out', 'x_x', `M0,8 L4,4 M0,4 L4,8 ${LINE} M12,8 L16,4 M12,4 L16,8`, 'dead dizzy ko'],
  ['money-eyes', 'Typed money eyes', '$_$', `A2,6.7 1.2 20 270 A2,4.3 1.2 90 -160 M2,8.7 L2,2.3 ${LINE} N A14,6.7 1.2 20 270 A14,4.3 1.2 90 -160 M14,8.7 L14,2.3`, 'rich greedy coins'],
  ['starry', 'Typed starry eyes', '*_*', `M2,3.9 L2,8.1 M0.18,4.95 L3.82,7.05 M0.18,7.05 L3.82,4.95 ${LINE} M14,3.9 L14,8.1 M12.18,4.95 L15.82,7.05 M12.18,7.05 L15.82,4.95`, 'amazed wow'],
  ['cheer', 'Typed cheer', '\\o/', 'M0,9.4 L3.4,3 O6.4,5.2 2 M12.8,9.4 L9.4,3', 'hooray arms up yay'],
];

const typed = TYPED.map(([id, name, sign, d, more]) => drawnShape({
  id: `typed-${id}`, name, cat: 'faces', sub: 'Text faces', label: sign, tags: `${sign} emoticon keyboard chat ${more}`, draw: d,
}));

export const WORD_SHAPES = [...words, ...outlines, ...morseShapes, ...brailleShapes, ...flagShapes, ...typed, ...pigpenShapes, ...oghamShapes];
