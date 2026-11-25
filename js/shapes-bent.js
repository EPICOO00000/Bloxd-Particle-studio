// Words that do not stand in a straight line: on an arch, in a valley, on a
// wave, round a circle, written downwards, and (in 3D) around a ring, like the
// writing on a turning sign. The words are written with phrase() of
// shapes-vocab.js and then bent; a new word is one more entry in BENT.

import { drawnShape, placeDrawing, joinDrawings } from './shape-kit.js';
import { phrase, slug, countFor, noteBreaks } from './shapes-vocab.js';

// The words that are bent. (Their straight versions are in the Words tab.)
const BENT = `
  WELCOME HELLO GAME_OVER YOU_WIN YOU_LOSE LEVEL_UP HAPPY_BIRTHDAY MERRY_CHRISTMAS HAPPY_NEW_YEAR HAPPY_HALLOWEEN HAPPY_EASTER
  CONGRATU|LATIONS THANK_YOU GOOD_LUCK HAVE_FUN GOOD_GAME WELL_DONE VICTORY WINNER CHAM|PION FINISH START CHECK|POINT SPAWN LOBBY SHOP
  ARENA PARKOUR DANGER WARNING KEEP_OUT NO_ENTRY SECRET TREASURE BOSS_FIGHT FINAL_BOSS SAFE_ZONE PVP_ZONE TEAM_RED TEAM_BLUE RED_WINS
  BLUE_WINS NEW_RECORD HIGH_SCORE TRY_AGAIN PLAY_AGAIN THE_END COMING_SOON I_LOVE_YOU BEST_FRIENDS GOOD_MORNING GOOD_NIGHT GOODBYE
  SEE_YOU_SOON WELCOME_BACK ENJOY PARTY HALLO|WEEN SUMMER WINTER BLOXD FINAL_ROUND GET_READY THIS_WAY EXIT ENTER HOME BASE CASTLE
  KINGDOM VILLAGE MARKET SCHOOL STADIUM RACE MAZE QUEST MISSION LEGEND HERO MAGIC DREAM LOVE PEACE
  BONJOUR BIENVENUE MERCI JOYEUX_ANNIVER|SAIRE JOYEUX_NOËL BONNE_ANNÉE FÉLICI|TATIONS BRAVO HOLA BIEN|VENIDO GRACIAS FELIZ_CUMPLE|AÑOS
  FELIZ_NAVIDAD HALLO WILL|KOMMEN DANKE CIAO BENVE|NUTO GRAZIE OLÁ OBRIGADO
`.trim().split(/\s+/).map((entry) => noteBreaks(entry.replace(/_/g, ' ')));

const letters = (text) => [...text].filter((ch) => ch !== ' ').length;

// ---------------------------------------------------------------- bending a drawing

/** The drawing with every stroke cut into short pieces, so that a straight stroke can follow a curve. */
function inPieces(drawing, most = 0.8) {
  return {
    polys: drawing.polys.map((poly) => poly.flatMap((point, i) => {
      if (!i) return [point];
      const [ax, ay] = poly[i - 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(point[0] - ax, point[1] - ay) / most));
      return Array.from({ length: steps }, (_, k) => [ax + ((point[0] - ax) * (k + 1)) / steps, ay + ((point[1] - ay) * (k + 1)) / steps]);
    })),
    dots: drawing.dots,
  };
}

const mapped = (drawing, at) => ({ polys: drawing.polys.map((poly) => poly.map(at)), dots: drawing.dots.map(at) });

function span(drawing) {
  let x0 = Infinity;
  let x1 = -Infinity;
  for (const [x] of [...drawing.polys.flat(), ...drawing.dots]) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
  }
  return [x0, x1];
}

/** The word on an arch: its letters stand on a circle and lean outward. `turn` is how much of a circle the word takes, in degrees. */
function arched(text, turn) {
  const drawing = inPieces(phrase(text));
  const [x0, x1] = span(drawing);
  const radius = (x1 - x0) / ((turn * Math.PI) / 180);
  return mapped(drawing, ([x, y]) => {
    const a = (x - (x0 + x1) / 2) / radius;
    return [(radius + y) * Math.sin(a), (radius + y) * Math.cos(a)];
  });
}

/** The word in a valley: its letters stand inside a circle, and their tops lean together. */
function hollow(text, turn) {
  const drawing = inPieces(phrase(text));
  const [x0, x1] = span(drawing);
  const radius = Math.max(34, (x1 - x0) / ((turn * Math.PI) / 180));
  return mapped(drawing, ([x, y]) => {
    const a = (x - (x0 + x1) / 2) / radius;
    return [(radius - y) * Math.sin(a), -(radius - y) * Math.cos(a)];
  });
}

/** The word on a wave: the letters stay upright and go up and down. */
function wavy(text) {
  const drawing = inPieces(phrase(text));
  const [x0, x1] = span(drawing);
  const waves = x1 - x0 > 70 ? 2 : 1;
  return mapped(drawing, ([x, y]) => [x, y + 3.6 * Math.sin((2 * Math.PI * waves * (x - x0)) / (x1 - x0))]);
}

/** The word written downwards, letter under letter. */
function downwards(text) {
  const parts = [];
  [...text].forEach((ch, i) => {
    if (ch === ' ') return;
    const drawing = phrase(ch);
    const [x0, x1] = span(drawing);
    parts.push(placeDrawing(drawing, { x: -(x0 + x1) / 2, y: -13 * i }));
  });
  return joinDrawings(...parts);
}

// ---------------------------------------------------------------- the shapes

const word = (kind, text, how, sub, more, draw, extra = {}) => drawnShape({
  id: `${kind}-word-${slug(text)}`, name: `The word${text.includes(' ') ? 's' : ''} ${text} ${how}`, cat: 'words', sub, label: text,
  tags: `${text} text writing bent ${more}`, draw, count: Math.min(300, Math.round(countFor(text) * 1.15)), ...extra,
});

const arches = BENT.filter((text) => letters(text) >= 4).map((text) => word('arch', text, 'on an arch', 'Words on an arch', 'arc curved bow rainbow over a door',
  () => arched(text, Math.min(170, 26 + 10 * letters(text)))));

const valleys = BENT.filter((text) => letters(text) >= 5).map((text) => word('valley', text, 'in a valley', 'Words in a valley', 'arc curved bowl smile under',
  () => hollow(text, Math.min(110, 16 + 7 * letters(text)))));

const waves = BENT.filter((text) => letters(text) >= 5).map((text) => word('wavy', text, 'on a wave', 'Words on a wave', 'wavy up and down flag sea',
  () => wavy(text)));

const circles = BENT.filter((text) => letters(text) >= 13).map((text) => word('circle', text, 'round a circle', 'Words round a circle', 'ring seal coin stamp all around',
  () => arched(text, 318)));

const columns = BENT.filter((text) => !text.includes(' ') && letters(text) >= 3 && letters(text) <= 8).map((text) => word('down', text, 'written downwards', 'Words written downwards',
  'vertical column banner top to bottom tall', () => downwards(text)));

// In 3D: the word goes around a ring, as on a turning sign. The flat drawing is fitted to the box first (x from -1 to 1),
// and then rolled up: x becomes the angle. The letters keep their proportions, as tall on the ring as they are wide,
// unless that would be taller than the box.
const AROUND = 0.94; // of the ring: the rest is the gap between the end of the word and its beginning
const RADIUS = 0.97;
const rings = BENT.filter((text) => letters(text) >= 6).map((text) => {
  const drawing = () => inPieces(phrase(text));
  let scale = null;
  const upright = () => {
    if (scale === null) {
      const points = [...drawing().polys.flat(), ...drawing().dots];
      const wide = Math.max(...points.map((p) => p[0])) - Math.min(...points.map((p) => p[0]));
      const high = Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1]));
      // (fitted to the box the drawing is 2 wide, and its top is high / wide above the middle)
      scale = Math.min(Math.PI * AROUND * RADIUS, 0.99 / (high / wide));
    }
    return scale;
  };
  return word('ring', text, 'around a ring', 'Words around a ring', 'cylinder turning sign carousel marquee 3d all around', drawing, {
    cat: 'solid', group: 'solid', lift: (x, y) => [RADIUS * Math.sin(x * Math.PI * AROUND), y * upright(), RADIUS * Math.cos(x * Math.PI * AROUND)],
  });
});

export const BENT_SHAPES = [...arches, ...valleys, ...waves, ...circles, ...columns, ...rings];
