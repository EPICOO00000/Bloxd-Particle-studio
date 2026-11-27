// Pixel creatures for the Pixel art tab: invaders, heroes and starfighters,
// each put together from a few parts (see shape-mix.js for how the parts are
// dealt out). A part is written as the left half of its rows, the last sign
// of a row being the middle column: '#' is a particle, '.' is none.

import { sprite, half } from './shapes-pixel.js';
import { deal } from './shape-mix.js';

const words = (...parts) => parts.filter(Boolean).join(' ');

/** Rows without the empty ones at the top and at the bottom. */
function trimmed(rows) {
  const used = rows.map((row) => row.includes('#'));
  return rows.slice(used.indexOf(true), used.lastIndexOf(true) + 1);
}

/** The rows with some squares emptied: `holes` is a list of [row, column]. */
const carved = (rows, holes) => rows.map((row, r) => [...row].map((sign, c) => (holes.some(([hr, hc]) => hr === r && hc === c) ? '.' : sign)).join(''));

/** Two blocks of rows side by side. */
const beside = (leftRows, rightRows) => leftRows.map((row, r) => row + rightRows[r]);

/**
 * The sprites of a family: `make(variants, number)` gives { id, name, rows, tags }, the rows being left halves.
 * Every row of a member must be as wide as `wide`.
 */
function spriteFamily({ sub, sizes, first, count, wide, make }) {
  return deal({ sizes, first, count, where: sub }).map((variants, k) => {
    const { id, name, rows, tags } = make(variants, k + 1);
    const bad = rows.find((row) => row.length !== wide || /[^#.]/.test(row));
    if (bad !== undefined) throw new Error(`${name}: the row "${bad}" is not ${wide} signs of # and .`);
    return Object.defineProperty(sprite(sub, id, name, half(trimmed(rows).join('/')), tags), 'variants', { value: variants });
  });
}

// ---------------------------------------------------------------- invaders
//
// 11 wide. A head of four rows: in its two middle rows the columns from the third on are filled, so that eyes can
// be cut out of them.

const INVADER_TOPS = [
  ['antennas', ['.#....', '..#...']],
  ['straight antennas', ['..#...', '..#...']],
  ['', []],
  ['ball antenna', ['....##', '.....#']],
  ['spikes', ['..#.#.']],
];

const INVADER_HEADS = [
  ['round', ['..####', '.#####', '######', '######']],
  ['square', ['.#####', '.#####', '.#####', '.#####']],
  ['crab claws', ['..####', '######', '######', '#.####']],
  ['dome', ['...###', '..####', '.#####', '######']],
  ['narrow', ['..####', '..####', '..####', '..####']],
  ['gem', ['...###', '.#####', '######', '.#####']],
  ['ears', ['#.####', '######', '######', '.#####']],
];

// squares cut out of the head: [row, column]
const INVADER_EYES = [
  ['small eyes', [[1, 3]]],
  ['wide eyes', [[1, 3], [1, 4]]],
  ['tall eyes', [[1, 3], [2, 3]]],
  ['one eye cyclops', [[1, 4], [1, 5]]],
  ['one big eye cyclops', [[1, 4], [1, 5], [2, 4]]],
  ['angry eyes', [[1, 3], [2, 4]]],
  ['eyes mouth', [[1, 3], [2, 5]]],
  ['goggles', [[1, 3], [1, 4], [2, 3], [2, 4]]],
];

const INVADER_LEGS = [
  ['squid legs', ['..#.#.', '.#.#.#']],
  ['spread legs', ['..#...', '.#....']],
  ['claws', ['..#...', '...##.']],
  ['two legs', ['...#..', '...#..']],
  ['thick legs', ['..##..', '..##..']],
  ['feet', ['...#..', '..##..']],
  ['tentacles', ['.#.#.#', '.#.#.#']],
  ['wavy tentacles', ['.#.#.#', '#.#.#.']],
  ['stand', ['.....#', '...###']],
];

const invaders = spriteFamily({
  sub: 'Pixel invaders', count: 280, wide: 6, sizes: [INVADER_TOPS.length, INVADER_HEADS.length, INVADER_EYES.length, INVADER_LEGS.length],
  make: ([top, head, eyes, legs], k) => ({
    id: `invader-${k}`, name: `Pixel invader ${k}`,
    tags: words('alien space monster arcade game creature', INVADER_TOPS[top][0], INVADER_HEADS[head][0], INVADER_EYES[eyes][0], INVADER_LEGS[legs][0]),
    rows: [...INVADER_TOPS[top][1], ...carved(INVADER_HEADS[head][1], INVADER_EYES[eyes][1]), ...INVADER_LEGS[legs][1]],
  }),
});

// ---------------------------------------------------------------- heroes
//
// 9 wide: a hat, a head five wide, a body with arms, legs.

const HERO_HATS = [
  ['', []],
  ['wizard hat', ['....#', '...##', '.####']],
  ['crown king queen', ['..#.#', '..###']],
  ['horned helmet viking', ['.#...', '.####']],
  ['top hat', ['..###', '..###', '.####']],
  ['spiky hair', ['..#.#']],
  ['halo angel', ['..###', '.....']],
  ['long ears bunny', ['..#..', '..#..']],
  ['crest helmet knight', ['....#', '..###']],
];

const HERO_FACES = [
  ['', ['..###', '..#.#', '..###']],
  ['visor', ['..###', '..#..', '..###']],
  ['one eye', ['..###', '..##.', '..###']],
  ['open mouth', ['..###', '..#.#', '..##.']],
  ['beard', ['..###', '..#.#', '..###', '...##']],
];

const HERO_BODIES = [
  ['arms down', ['.####', '.#.##', '.#.##', '...##']],
  ['arms out', ['.####', '#..##', '...##', '...##']],
  ['arms wide', ['#####', '...##', '...##', '...##']],
  ['robe', ['.####', '.#.##', '..###', '..###']],
  ['armour broad', ['#####', '#.###', '..###', '...##']],
  ['cape', ['.####', '#####', '#####', '#..##']],
  ['hands on hips', ['.####', '#..##', '.#.##', '...##']],
  ['slim', ['..###', '..###', '...##', '...##']],
];

const HERO_LEGS = [
  ['standing', ['...#.', '...#.']],
  ['wide stance', ['...#.', '..#..']],
  ['boots', ['...#.', '..##.']],
  ['skirt', ['..###', '.####']],
  ['legs together', ['...##', '...##']],
  ['long legs', ['...#.', '...#.', '..##.']],
  ['floating ghost', ['...##', '....#']],
];

const heroes = spriteFamily({
  sub: 'Pixel heroes', count: 280, wide: 5, sizes: [HERO_HATS.length, HERO_FACES.length, HERO_BODIES.length, HERO_LEGS.length],
  make: ([hat, face, body, legs], k) => ({
    id: `hero-${k}`, name: `Pixel hero ${k}`,
    tags: words('person character figure player adventurer people', HERO_HATS[hat][0], HERO_FACES[face][0], HERO_BODIES[body][0], HERO_LEGS[legs][0]),
    rows: [...HERO_HATS[hat][1], ...HERO_FACES[face][1], ...HERO_BODIES[body][1], ...HERO_LEGS[legs][1]],
  }),
});

// ---------------------------------------------------------------- starfighters
//
// 11 wide, seen from above and flying upwards: a nose, then five rows of wing (four columns) beside the hull (the
// two middle columns of the half), then the engines.

const FIGHTER_NOSES = [
  ['pointed nose', ['.....#', '.....#']],
  ['wide nose', ['.....#', '....##']],
  ['blunt nose', ['....##']],
  ['twin prongs', ['....#.', '....#.']],
  ['needle nose', ['.....#', '.....#', '.....#']],
];

const FIGHTER_HULLS = [
  ['', ['##', '##', '##', '##', '##']],
  ['window', ['##', '#.', '##', '##', '##']],
  ['long window', ['##', '#.', '#.', '##', '##']],
  ['two windows', ['##', '#.', '##', '#.', '##']],
  ['hollow', ['##', '#.', '#.', '#.', '##']],
  ['slot', ['##', '##', '##', '#.', '#.']],
  ['thin neck', ['.#', '.#', '##', '##', '##']],
];

const FIGHTER_WINGS = [
  ['delta wings', ['....', '...#', '..##', '.###', '####']],
  ['swept wings', ['....', '...#', '..##', '.##.', '##..']],
  ['straight wings', ['....', '....', '####', '####', '....']],
  ['forward wings', ['#...', '##..', '.##.', '..##', '...#']],
  ['stub wings', ['....', '....', '..##', '..##', '....']],
  ['pods', ['....', '.#..', '.###', '.#..', '.#..']],
  ['double wings', ['....', '.###', '....', '.###', '....']],
  ['bat wings', ['...#', '..##', '.###', '####', '#.#.']],
];

const FIGHTER_ENGINES = [
  ['', []],
  ['flame', ['.....#']],
  ['twin flames', ['....#.']],
  ['exhaust', ['....##', '.....#']],
  ['long twin flames', ['....#.', '....#.']],
  ['three nozzles', ['...#.#']],
  ['big flame', ['....##', '....##', '.....#']],
  ['tail fins', ['...###', '...#.#']],
  ['trail', ['.....#', '......', '.....#']],
];

const fighters = spriteFamily({
  sub: 'Pixel starfighters', count: 280, wide: 6, sizes: [FIGHTER_NOSES.length, FIGHTER_HULLS.length, FIGHTER_WINGS.length, FIGHTER_ENGINES.length],
  make: ([nose, hull, wings, engine], k) => ({
    id: `starfighter-${k}`, name: `Pixel starfighter ${k}`,
    tags: words('spaceship ship space shooter jet plane arcade game', FIGHTER_NOSES[nose][0], FIGHTER_HULLS[hull][0], FIGHTER_WINGS[wings][0], FIGHTER_ENGINES[engine][0]),
    rows: [...FIGHTER_NOSES[nose][1], ...beside(FIGHTER_WINGS[wings][1], FIGHTER_HULLS[hull][1]), ...FIGHTER_ENGINES[engine][1]],
  }),
});

export const SPRITE_SHAPES = [...invaders, ...heroes, ...fighters];
export const SPRITE_HEADINGS = ['Pixel invaders', 'Pixel heroes', 'Pixel starfighters'];
