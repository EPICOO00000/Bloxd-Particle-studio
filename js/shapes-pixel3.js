// Still more pixel art, all of it put together from parts: several hundred
// words in the arcade letters (one or two lines), the numbers from 10 to 99,
// and faces made from a set of eyes and a set of mouths.

import { sprite, PIXEL_LETTERS, PIXEL_NUMBERS, FACES as FACES_1, CREATURES } from './shapes-pixel.js';
import { PIXEL_WORD_TEXTS, FACES as FACES_2 } from './shapes-pixel2.js';
import { VOCAB_LISTS } from './shapes-vocab.js';

// ---------------------------------------------------------------- words

const FONT = Object.fromEntries([...PIXEL_LETTERS, ...PIXEL_NUMBERS].map(([, , text, , sign]) => [sign, text.split('/')]));

/** One line in the arcade letters: the letters side by side, one empty column between them. */
const line = (word) => Array.from({ length: 7 }, (_, row) => [...word].map((ch) => FONT[ch][row]).join('.'));

/** A word, or two words one above the other, as a picture. */
function written(text) {
  const lines = text.split(' ').map(line);
  const wide = Math.max(...lines.map((rows) => rows[0].length));
  // (a shorter line stands in the middle)
  const centred = lines.map((rows) => {
    const left = Math.floor((wide - rows[0].length) / 2);
    return rows.map((row) => '.'.repeat(left) + row + '.'.repeat(wide - row.length - left));
  });
  return centred.map((rows) => rows.join('/')).join(`/${'.'.repeat(wide)}/${'.'.repeat(wide)}/`);
}
const dots = (picture) => [...picture].filter((ch) => ch === '#').length;

const plain = (entry) => entry.replace(/\|/g, '');
const single = [...VOCAB_LISTS.GAME, ...VOCAB_LISTS.THINGS]
  .map(plain).filter((word) => /^[A-Z]{2,8}$/.test(word));
const TWO_LINES = [
  'GAME OVER', 'YOU WIN', 'YOU LOSE', 'LEVEL UP', 'TRY AGAIN', 'NEW GAME', 'HIGH SCORE', 'GOOD LUCK', 'HAVE FUN', 'WELL DONE', 'THE END', 'GET READY',
  'BOSS FIGHT', 'FINAL BOSS', 'SAFE ZONE', 'TEAM RED', 'TEAM BLUE', 'RED WINS', 'BLUE WINS', 'PLAY AGAIN', 'NEW RECORD', 'BEST TIME', 'TIME UP',
  'GOOD JOB', 'NICE TRY', 'SO CLOSE', 'POWER UP', 'SPEED UP', 'GAME ON', 'YOUR TURN', 'NEXT LEVEL', 'THIS WAY', 'KEEP OUT', 'NO ENTRY', 'FOR SALE',
  'SOLD OUT', 'THANK YOU', 'GOOD GAME', 'SEE YOU', 'YOU DIED', 'WAVE 1', 'WAVE 2', 'WAVE 3', 'LEVEL 1', 'LEVEL 2', 'LEVEL 3', 'ROUND 1', 'ROUND 2',
  'ROUND 3', 'PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4', 'STAGE 1', 'STAGE 2', 'STAGE 3', 'WORLD 1', 'WORLD 2', 'WORLD 3',
];

// Colours, ranks and roles: what a team or a player is called.
const TEAM_WORDS = [
  'RED', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PURPLE', 'PINK', 'BLACK', 'WHITE', 'GRAY', 'BROWN', 'CYAN', 'SILVER', 'BRONZE', 'ADMIN', 'MOD', 'OWNER',
  'STAFF', 'BUILDER', 'HELPER', 'MEMBER', 'GUEST', 'PLAYER', 'FRIEND', 'ENEMY', 'LEADER', 'CAPTAIN', 'KNIGHT', 'WIZARD', 'NINJA', 'PIRATE', 'ROBOT',
  'ZOMBIE', 'GHOST', 'DRAGON', 'MONSTER', 'ALIEN', 'HUNTER', 'MINER', 'FARMER', 'POLICE', 'THIEF', 'SPY', 'SOLO', 'DUO', 'SQUAD',
];

const had = new Set(PIXEL_WORD_TEXTS);
const words = [];
for (const text of [...single, ...TEAM_WORDS, ...TWO_LINES]) {
  if (had.has(text)) continue;
  had.add(text);
  const picture = written(text);
  if (dots(picture) > 300) continue; // (more than a shape is given when it is added)
  words.push(sprite('Pixel words', `word-${text.toLowerCase().replace(/ /g, '-')}`, `Pixel word${text.includes(' ') ? 's' : ''} ${text}`, picture,
    'text writing font arcade sign label', text));
}

// ---------------------------------------------------------------- numbers

const numbers = [...Array.from({ length: 90 }, (_, i) => i + 10), 100, 1000].map((n) => sprite('Pixel numbers', `number-${n}`, `Pixel number ${n}`,
  line(String(n)).join('/'), 'font text arcade count score', String(n)));

// ---------------------------------------------------------------- faces
//
// A face is 11 dots wide and 11 high, and filled: the eyes and the mouth are the dots that are left out.
// The eyes are rows 2 to 4, the mouth is rows 6 to 8.

const FULL = '###########';
// [part of the id, the word in the name, rows 2 to 4, search words]
const EYES = [
  ['plain', 'plain', [FULL, '###.###.###', '###.###.###'], 'calm'],
  ['wide', 'wide-eyed', [FULL, '##..###..##', '##..###..##'], 'big eyes staring'],
  ['happy', 'happy', [FULL, '###.###.###', '##.#.#.#.##'], 'glad eyes smiling'],
  ['sleepy', 'sleepy', [FULL, FULL, '##...#...##'], 'eyes closed tired'],
  ['winking', 'winking', [FULL, '###.#######', '###.##...##'], 'wink one eye'],
  ['angry', 'angry', ['##.#####.##', '###.###.###', '###.###.###'], 'mad brows'],
  ['worried', 'worried', ['####.#.####', '###.###.###', '###.###.###'], 'afraid brows nervous'],
  ['dizzy', 'dizzy', ['##.#.#.#.##', '###.###.###', '##.#.#.#.##'], 'crossed eyes knocked out'],
  ['cool', 'cool', [FULL, '#....#....#', '##...#...##'], 'sunglasses shades'],
];
// [part of the id, the word in the name, rows 6 to 8, search words]
const MOUTHS = [
  ['smile', 'smile', ['##.#####.##', '###.....###', FULL], 'happy glad'],
  ['laugh', 'laugh', ['##.......##', '###.....###', '####...####'], 'lol open mouth happy'],
  ['straight', 'straight face', [FULL, '###.....###', FULL], 'neutral meh'],
  ['frown', 'frown', ['###.....###', '##.#####.##', FULL], 'sad unhappy'],
  ['oh', 'oh', ['####...####', '####...####', FULL], 'surprised shock wow'],
  ['tiny', 'tiny mouth', [FULL, '#####.#####', FULL], 'quiet shy small'],
  ['smirk', 'smirk', ['#######.###', '###....####', FULL], 'sly half smile'],
  ['grimace', 'grimace', [FULL, '##.#.#.#.##', FULL], 'teeth nervous awkward zigzag'],
  ['tongue', 'tongue out', ['##.#####.##', '###.....###', '#####..####'], 'silly cheeky playful'],
  ['grin', 'toothy grin', ['##.......##', '##.#.#.#.##', '###.....###'], 'teeth big smile'],
];

const there = new Set([
  ...FACES_1.map(([, , picture]) => picture),
  ...FACES_2.map(([, , picture]) => picture),
  ...CREATURES.filter(([id]) => id === 'smiley').map(([, , picture]) => picture),
]);
const faces = [];
for (const [eyeId, eyeWord, eyeRows, eyeTags] of EYES) {
  for (const [mouthId, mouthWord, mouthRows, mouthTags] of MOUTHS) {
    const picture = ['...#####...', '.#########.', ...eyeRows, FULL, ...mouthRows, '.#########.', '...#####...'].join('/');
    if (there.has(picture)) continue; // (drawn by hand before)
    faces.push(sprite('Faces', `face-${eyeId}-${mouthId}`, `Pixel ${eyeWord} ${mouthWord}`, picture, `face emote emoji smiley head ${eyeTags} ${mouthTags}`));
  }
}

export const PIXEL3_SHAPES = [...words, ...numbers, ...faces];


