// Shape library: every shape is a list of points ("dozens of small particles").
// Pure functions, no dependencies — also used by the Node tests.
//
// Local coordinates: shapes fit in about [-1, 1] on each axis (2 blocks across at
// scale 1). Flat shapes lie in the XY plane (standing up, facing the camera).
//
// This file holds the first 24 shapes and puts the whole library together:
//   shape-kit.js      the geometry tools every shape is built from
//   shapes-geo.js     shapes made from formulas (basic, 3D, curves, effects)
//   shapes-text.js    letters, numbers and signs
//   shapes-icons.js   pictures drawn with strokes (symbols, nature, things)
// and, since the library grew to 924 shapes:
//   shapes-flat.js    more basic shapes, and patterns
//   shapes-solid.js   more 3D shapes
//   shapes-curves.js  more curves
//   shapes-effects.js more effects
//   shapes-signs.js   more symbols, and faces
//   shapes-living.js  more nature, and animals
//   shapes-stuff.js   food, more things, travel and costumes
//   shapes-pixel.js   pixel art
// and, since it grew to 1,624:
//   shapes-marks.js   still more symbols and faces
//   shapes-wild.js    still more nature and animals
//   shapes-goods.js   still more food, things, travel and costumes
//   shapes-extra.js   more basic shapes, 3D shapes, curves, patterns and effects
// (letters with accents, Roman numerals, dice and punctuation are in
// shapes-text.js, and the new pixel art is in shapes-pixel.js).
// and, since it grew to 3,190:
//   shapes-scripts.js  more letters: with accents, Greek, Cyrillic, hiragana, katakana, kanji, Hangul, Hebrew
//   shapes-words.js    words, outline letters, Morse, Braille, flag signals, Pigpen, Ogham, typed faces
//   shapes-count.js    bigger numbers, scores, dominoes, playing cards, clock times, more signs
//   shapes-pixel2.js   more pixel art
//   shapes-forms.js    more basic shapes, curves and patterns
//   shapes-space.js    more 3D solids and buildings, and the tools for 3D models made of lines
//   shapes-models.js   3D things, plants and animals
//   shapes-magic.js    more effects
//   shapes-emblems.js  more symbols and faces
//   shapes-outdoors.js more nature and animals
// and, since it grew to 13,190 (shapes that are put together from parts):
//   shapes-numbers.js   every number up to 999, percentages, rankings, prices, badges, a digital clock
//   shapes-vocab.js     the Words tab: lists of words, also in five other languages
//   shapes-names.js     the Names tab: first names
//   shapes-bent.js      words on an arch, on a wave, round a circle, around a ring
//   shapes-labels.js    words in outline letters, speech bubbles, keys, arrows, slanted letters
//   shapes-combos.js    the Combos tab: a little picture many times, in a formation
//   shapes-badges.js    a little picture or a letter in a frame
//   shapes-ornaments.js snowflakes, flowers, suns, mandalas, shields, frames, magic circles
//   shapes-solids2.js   more solids, found from their corners; letters with depth
//   shapes-famous.js    curves with a name
//   shapes-pixel3.js    more pixel art: words, numbers and faces
// and, since it grew to 23,190:
//   shapes-framed.js    the Framed tab and the Decorated tab: every picture in a frame, and with things around it
// and, since it grew to 33,190 (shapes that are put together by rule, each from a few parts):
//   shape-mix.js        the tools for these: writing strokes, and dealing the parts out so that no two shapes are alike
//   shapes-monsters.js  the Monsters tab
//   shapes-robots.js    the Robots tab
//   shapes-items.js     the Items tab: swords, potions, keys, shields, gems, wands, axes, crowns
//   shapes-cosmos.js    the Space tab: rockets, flying saucers, starships, planets, aliens
//   shapes-mandalas.js  the Mandalas tab: snow crystals, flowers, rosettes
//   shapes-buildings.js the Buildings tab: houses, castles, towers
//   shapes-sea.js       the Sea tab: fish, jellyfish, boats
//   shapes-sprites.js   pixel art: invaders, heroes, starfighters
//   shapes-spiro.js     curves: spirographs
// and, since it grew to 53,190 (game items, each kind as flat pictures and in 3D):
//   shape-build.js      the tools for things in 3D: a profile spun around an axis, a drawing given thickness or laid in space
//   shapes-loot3d.js    the 3D loot tab: potions, goblets, pots, barrels, chests, gems, crowns, game pieces, mushrooms, rings
//   shapes-gear3d.js    the 3D gear tab: swords, axes, hammers, shields, helmets, keys, staffs, lanterns, bombs, hats
//   shapes-loot.js      the Loot tab: goblets, pots, barrels, chests, game pieces, mushrooms, rings, coins, scrolls, spell books
//   shapes-gear.js      the Gear tab: helmets, lanterns, bombs, hats, bows, arrows, boots, armour, amulets, torches

import {
  TAU, GOLDEN, P, resample, apportion, wire, loopEdges, polygon, curve, ring,
} from './shape-kit.js';
import { GEO_SHAPES } from './shapes-geo.js';
import { TEXT_SHAPES } from './shapes-text.js';
import { ICON_SHAPES } from './shapes-icons.js';
import { FLAT_SHAPES } from './shapes-flat.js';
import { SOLID_SHAPES } from './shapes-solid.js';
import { CURVE_SHAPES } from './shapes-curves.js';
import { EFFECT_SHAPES } from './shapes-effects.js';
import { SIGN_SHAPES } from './shapes-signs.js';
import { LIVING_SHAPES } from './shapes-living.js';
import { STUFF_SHAPES } from './shapes-stuff.js';
import { PIXEL_SHAPES } from './shapes-pixel.js';
import { MARK_SHAPES } from './shapes-marks.js';
import { WILD_SHAPES } from './shapes-wild.js';
import { GOODS_SHAPES } from './shapes-goods.js';
import { EXTRA_SHAPES } from './shapes-extra.js';
import { SCRIPT_SHAPES } from './shapes-scripts.js';
import { WORD_SHAPES } from './shapes-words.js';
import { COUNT_SHAPES } from './shapes-count.js';
import { PIXEL2_SHAPES } from './shapes-pixel2.js';
import { FORM_SHAPES } from './shapes-forms.js';
import { SPACE_SHAPES } from './shapes-space.js';
import { MODEL_SHAPES } from './shapes-models.js';
import { MAGIC_SHAPES } from './shapes-magic.js';
import { EMBLEM_SHAPES } from './shapes-emblems.js';
import { OUTDOOR_SHAPES } from './shapes-outdoors.js';
import { NUMBER_SHAPES } from './shapes-numbers.js';
import { VOCAB_SHAPES, VOCAB_BREAKS } from './shapes-vocab.js';
import { NAME_SHAPES, NAME_HEADINGS } from './shapes-names.js';
import { COMBO_SHAPES, COMBO_HEADINGS } from './shapes-combos.js';
import { BADGE_SHAPES } from './shapes-badges.js';
import { BENT_SHAPES } from './shapes-bent.js';
import { PIXEL3_SHAPES } from './shapes-pixel3.js';
import { ORNAMENT_SHAPES } from './shapes-ornaments.js';
import { SOLID2_SHAPES } from './shapes-solids2.js';
import { FAMOUS_SHAPES } from './shapes-famous.js';
import { LABEL_SHAPES } from './shapes-labels.js';
import { framedShapes, FRAMED_HEADINGS, AROUND_HEADINGS } from './shapes-framed.js';
import { MONSTER_SHAPES, MONSTER_HEADINGS } from './shapes-monsters.js';
import { ROBOT_SHAPES, ROBOT_HEADINGS } from './shapes-robots.js';
import { ITEM_SHAPES, ITEM_HEADINGS } from './shapes-items.js';
import { COSMOS_SHAPES, COSMOS_HEADINGS } from './shapes-cosmos.js';
import { MANDALA_SHAPES, MANDALA_HEADINGS } from './shapes-mandalas.js';
import { BUILDING_SHAPES, BUILDING_HEADINGS } from './shapes-buildings.js';
import { SEA_SHAPES, SEA_HEADINGS } from './shapes-sea.js';
import { SPRITE_SHAPES, SPRITE_HEADINGS } from './shapes-sprites.js';
import { SPIRO_SHAPES, SPIRO_HEADINGS } from './shapes-spiro.js';
import { LOOT_SHAPES, LOOT_HEADINGS } from './shapes-loot.js';
import { GEAR_SHAPES, GEAR_HEADINGS } from './shapes-gear.js';
import { LOOT3D_SHAPES, LOOT3D_HEADINGS } from './shapes-loot3d.js';
import { GEAR3D_SHAPES, GEAR3D_HEADINGS } from './shapes-gear3d.js';

export { resample };

/**
 * The tabs of the shape picker, in order. `subs` are the headings inside a tab,
 * in order; shapes without a heading come first.
 */
export const CATEGORIES = [
  { id: 'basic', name: 'Basic', subs: ['More outlines', 'Shapes in shapes', 'More filled shapes', 'Lines'] },
  { id: 'solid', name: '3D', subs: ['More solids', 'Polyhedra', 'Round things', 'Buildings', 'Things', 'Plants and animals', 'Letters in 3D', 'Words around a ring'] },
  { id: 'letters', name: 'Letters', subs: ['Capital letters', 'Small letters', 'Outline letters', 'Accented capitals', 'Accented small letters', 'Greek letters', 'Cyrillic capitals', 'Cyrillic small letters', 'Hiragana', 'Katakana', 'Kanji', 'Hangul', 'Hebrew letters', 'Runes', 'Ogham', 'Morse code', 'Braille', 'Flag signals', 'Pigpen cipher', 'Slanted letters', 'Letter badges'] },
  { id: 'words', name: 'Words', subs: ['Game words', 'Signs and orders', 'Places', 'People and teams', 'Games and sports', 'Wishes and days', 'Words for things', 'Levels and rounds',
    'French words', 'Spanish words', 'German words', 'Italian words', 'Portuguese words',
    'Words in outline letters', 'Words on an arch', 'Words in a valley', 'Words on a wave', 'Words round a circle', 'Words written downwards'] },
  { id: 'names', name: 'Names', subs: NAME_HEADINGS },
  { id: 'numbers', name: 'Numbers', subs: ['Numbers', 'Bigger numbers', 'Numbers up to 999', 'Big numbers', 'Digital numbers', 'Digital clock', 'Outline numbers', 'Slanted numbers', 'Circled numbers', 'Number badges',
    'Roman numerals', 'Mayan numbers', 'Scores', 'Percentages', 'Rankings', 'Prices', 'Results', 'Times tables', 'Tally marks', 'Binary numbers', 'Dice', 'Dominoes',
    'Playing cards', 'Clock times', 'Signs', 'Punctuation', 'Money', 'Maths'] },
  { id: 'symbols', name: 'Symbols', subs: ['Arrows', 'Signs', 'Hearts and sparkles', 'Music', 'Star signs', 'People and body', 'Speech bubbles', 'Keys and mouse', 'Shields', 'Badges'] },
  { id: 'faces', name: 'Faces', subs: ['Smileys', 'Characters', 'Text faces'] },
  { id: 'nature', name: 'Nature', subs: ['Sky and weather', 'Suns', 'Snowflakes', 'Plants', 'Flowers', 'Land and sea'] },
  { id: 'animals', name: 'Animals', subs: ['Pets and farm', 'Wild animals', 'Birds', 'Sea animals', 'Bugs', 'Dinosaurs and dragons'] },
  { id: 'food', name: 'Food', subs: ['Fruit and vegetables', 'Meals', 'Sweets', 'Drinks'] },
  { id: 'things', name: 'Things', subs: ['Tools', 'Weapons', 'Treasure and magic', 'Games and sport', 'Music', 'Home', 'Party and holidays'] },
  { id: 'travel', name: 'Travel', subs: ['Vehicles', 'Buildings'] },
  { id: 'costume', name: 'Costume', subs: ['Wings', 'On the head', 'Clothes'] },
  { id: 'pixel', name: 'Pixel art', subs: ['Game items', 'Creatures', 'Faces', 'Nature and food', 'Signs and things', 'Pixel letters', 'Pixel small letters', 'Pixel numbers', 'Pixel words', ...SPRITE_HEADINGS] },
  { id: 'curves', name: 'Curves', subs: ['More flat curves', 'Famous curves', 'More curves in 3D', ...SPIRO_HEADINGS] },
  { id: 'patterns', name: 'Patterns', subs: ['Tilings', 'Borders', 'Frames', 'Fractals', 'Mandalas'] },
  { id: 'effects', name: 'Effects', subs: ['Magic circles', 'Rings and shields', 'Elements', 'Floating things'] },
  { id: 'combos', name: 'Combos', subs: COMBO_HEADINGS },
  { id: 'framed', name: 'Framed', subs: FRAMED_HEADINGS },
  { id: 'decorated', name: 'Decorated', subs: AROUND_HEADINGS },
  { id: 'monsters', name: 'Monsters', subs: MONSTER_HEADINGS },
  { id: 'robots', name: 'Robots', subs: ROBOT_HEADINGS },
  { id: 'items', name: 'Items', subs: ITEM_HEADINGS },
  { id: 'space', name: 'Space', subs: COSMOS_HEADINGS },
  { id: 'mandalas', name: 'Mandalas', subs: MANDALA_HEADINGS },
  { id: 'buildings', name: 'Buildings', subs: BUILDING_HEADINGS },
  { id: 'sea', name: 'Sea', subs: SEA_HEADINGS },
  { id: 'loot', name: 'Loot', subs: LOOT_HEADINGS },
  { id: 'gear', name: 'Gear', subs: GEAR_HEADINGS },
  { id: 'loot3d', name: '3D loot', subs: LOOT3D_HEADINGS },
  { id: 'gear3d', name: '3D gear', subs: GEAR3D_HEADINGS },
];

/**
 * id, name, group ('flat' | 'solid': how the picker draws its little picture),
 * cat (tab of the picker), count (default), min (fewest useful particles),
 * params (extra sliders), gen(n, params) -> [[x, y, z], ...]
 * Optional: label (short name under the picture), tags (extra search words),
 * tidy (the shape rounds "How many" to a count that fits its pattern),
 * sub (the heading it stands under in its tab), drop (how far it hangs below
 * the -1..1 box: the tails of g, j, p, q and y), rise (how far it stands above
 * the box: the accent of a capital letter).
 */
const FIRST_SHAPES = [
  {
    id: 'line', name: 'Line', group: 'flat', count: 16, min: 2,
    gen: (n) => resample([[-1, 0, 0], [1, 0, 0]], n),
  },
  {
    id: 'circle', name: 'Circle', group: 'flat', count: 36, min: 3,
    gen: (n) => polygon(n, n),
  },
  {
    id: 'disc', name: 'Disc', group: 'flat', count: 70, min: 4,
    gen: (n) => Array.from({ length: n }, (_, i) => {
      const r = Math.sqrt((i + 0.5) / n);
      return [Math.cos(i * GOLDEN) * r, Math.sin(i * GOLDEN) * r, 0];
    }),
  },
  {
    id: 'arc', name: 'Arc', group: 'flat', count: 24, min: 3,
    params: [P('angle', 'Angle', 30, 330, 5, 180)],
    gen: (n, p) => {
      const half = ((p.angle * Math.PI) / 180) / 2;
      return Array.from({ length: n }, (_, i) => {
        const a = n > 1 ? -half + (2 * half * i) / (n - 1) : 0;
        return [Math.sin(a), Math.cos(a), 0];
      });
    },
  },
  {
    id: 'square', name: 'Square', group: 'flat', count: 40, min: 4,
    gen: (n) => wire([[-1, 1, 0], [1, 1, 0], [1, -1, 0], [-1, -1, 0]], loopEdges(4), n),
  },
  {
    id: 'grid', name: 'Filled square', group: 'flat', count: 49, min: 4, tidy: true,
    gen: (n) => {
      const k = Math.max(2, Math.round(Math.sqrt(n)));
      const out = [];
      for (let y = 0; y < k; y++) {
        for (let x = 0; x < k; x++) out.push([-1 + (2 * x) / (k - 1), 1 - (2 * y) / (k - 1), 0]);
      }
      return out;
    },
  },
  {
    id: 'triangle', name: 'Triangle', group: 'flat', count: 30, min: 3,
    gen: (n) => polygon(3, n),
  },
  {
    id: 'polygon', name: 'Polygon', group: 'flat', count: 36, min: 5,
    params: [P('sides', 'Sides', 5, 12, 1, 6)],
    gen: (n, p) => polygon(Math.round(p.sides), n),
  },
  {
    id: 'star', name: 'Star', group: 'flat', count: 50, min: 10,
    params: [P('points', 'Points', 4, 10, 1, 5), P('inner', 'Inner size', 0.2, 0.8, 0.05, 0.45)],
    gen: (n, p) => polygon(Math.round(p.points), n, 1, p.inner),
  },
  {
    id: 'heart', name: 'Heart', group: 'flat', count: 44, min: 8,
    gen: (n) => curve((t) => {
      const a = t * TAU;
      const x = 16 * Math.sin(a) ** 3;
      const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
      return [x / 16, (y + 2.5) / 16, 0];
    }, n, true),
  },
  {
    id: 'cross', name: 'Plus', group: 'flat', count: 25, min: 5,
    gen: (n) => wire(
      [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]],
      [[0, 1], [0, 2], [0, 3], [0, 4]], n),
  },
  {
    id: 'rays', name: 'Rays', group: 'flat', count: 48, min: 8,
    params: [P('rays', 'Rays', 3, 16, 1, 8), P('inner', 'Inner size', 0, 0.8, 0.05, 0.3)],
    gen: (n, p) => {
      const count = Math.round(p.rays);
      const verts = [];
      const edges = [];
      for (let i = 0; i < count; i++) {
        const a = (TAU * i) / count;
        verts.push([Math.sin(a) * p.inner, Math.cos(a) * p.inner, 0], [Math.sin(a), Math.cos(a), 0]);
        edges.push([i * 2, i * 2 + 1]);
      }
      return wire(verts, edges, n);
    },
  },
  {
    id: 'spiral', name: 'Spiral', group: 'flat', count: 60, min: 6,
    params: [P('turns', 'Turns', 1, 6, 0.5, 3)],
    gen: (n, p) => curve((t) => {
      const a = t * p.turns * TAU;
      return [Math.sin(a) * t, Math.cos(a) * t, 0];
    }, n),
  },
  {
    id: 'wave', name: 'Wave', group: 'flat', count: 40, min: 6,
    params: [P('waves', 'Waves', 0.5, 5, 0.5, 2), P('height', 'Height', 0.1, 1, 0.05, 0.4)],
    gen: (n, p) => curve((t) => [-1 + 2 * t, Math.sin(t * p.waves * TAU) * p.height, 0], n),
  },
  {
    id: 'sphere', name: 'Sphere', group: 'solid', count: 90, min: 6,
    gen: (n) => Array.from({ length: n }, (_, i) => {
      const y = 1 - (2 * (i + 0.5)) / n;
      const r = Math.sqrt(1 - y * y);
      return [Math.cos(i * GOLDEN) * r, y, Math.sin(i * GOLDEN) * r];
    }),
  },
  {
    id: 'dome', name: 'Dome', group: 'solid', count: 60, min: 6,
    gen: (n) => Array.from({ length: n }, (_, i) => {
      const y = (i + 0.5) / n;
      const r = Math.sqrt(1 - y * y);
      return [Math.cos(i * GOLDEN) * r, y, Math.sin(i * GOLDEN) * r];
    }),
  },
  {
    id: 'cube', name: 'Cube', group: 'solid', count: 68, min: 8,
    gen: (n) => {
      const v = [];
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
      const e = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      return wire(v, e, n);
    },
  },
  {
    id: 'lattice', name: 'Filled cube', group: 'solid', count: 64, min: 8, tidy: true,
    gen: (n) => {
      const k = Math.max(2, Math.round(Math.cbrt(n)));
      const at = (i) => -1 + (2 * i) / (k - 1);
      const out = [];
      for (let y = 0; y < k; y++) for (let z = 0; z < k; z++) for (let x = 0; x < k; x++) out.push([at(x), at(y), at(z)]);
      return out;
    },
  },
  {
    id: 'cylinder', name: 'Cylinder', group: 'solid', count: 80, min: 6,
    params: [P('rings', 'Rings', 2, 10, 1, 4)],
    gen: (n, p) => {
      const rings = Math.max(2, Math.round(p.rings));
      const per = apportion(Array(rings).fill(1), n);
      return per.flatMap((count, j) => ring(count, 1, -1 + (2 * j) / (rings - 1), j % 2 ? Math.PI / Math.max(1, count) : 0));
    },
  },
  {
    id: 'cone', name: 'Cone', group: 'solid', count: 60, min: 5,
    params: [P('rings', 'Rings', 1, 10, 1, 4)],
    gen: (n, p) => {
      const rings = Math.max(1, Math.round(p.rings));
      const radius = Array.from({ length: rings }, (_, j) => 1 - j / rings);
      const per = apportion(radius, n - 1);
      const out = per.flatMap((count, j) => ring(count, radius[j], -1 + (2 * j) / rings, j % 2 ? Math.PI / Math.max(1, count) : 0));
      out.push([0, 1, 0]);
      return out;
    },
  },
  {
    id: 'pyramid', name: 'Pyramid', group: 'solid', count: 53, min: 5,
    gen: (n) => wire(
      [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [0, 1, 0]],
      [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4]], n),
  },
  {
    id: 'torus', name: 'Donut', group: 'solid', count: 96, min: 9, tidy: true,
    params: [P('tube', 'Thickness', 0.1, 0.5, 0.05, 0.3)],
    gen: (n, p) => {
      const r = p.tube;
      const R = 1 - r;
      const nv = Math.max(3, Math.round(Math.sqrt((n * r) / R)));
      const nu = Math.max(3, Math.round(n / nv));
      const out = [];
      for (let u = 0; u < nu; u++) {
        for (let v = 0; v < nv; v++) {
          const a = (TAU * u) / nu;
          const b = (TAU * (v + (u % 2) / 2)) / nv;
          const d = R + r * Math.cos(b);
          out.push([Math.cos(a) * d, r * Math.sin(b), Math.sin(a) * d]);
        }
      }
      return out;
    },
  },
  {
    id: 'helix', name: 'Helix', group: 'solid', count: 60, min: 6,
    params: [P('turns', 'Turns', 1, 8, 0.5, 3)],
    gen: (n, p) => Array.from({ length: n }, (_, i) => {
      const t = n > 1 ? i / (n - 1) : 0;
      const a = t * p.turns * TAU;
      return [Math.cos(a), -1 + 2 * t, Math.sin(a)];
    }),
  },
  {
    id: 'tornado', name: 'Tornado', group: 'solid', count: 70, min: 6,
    params: [P('turns', 'Turns', 1, 8, 0.5, 4)],
    gen: (n, p) => curve((t) => {
      const a = t * p.turns * TAU;
      const r = 0.12 + 0.88 * t;
      return [Math.cos(a) * r, -1 + 2 * t, Math.sin(a) * r];
    }, n),
  },
];

// Other words people type when they look for one of the first shapes.
const SEARCH_WORDS = {
  circle: 'ring round', disc: 'filled circle dot', arc: 'curve bow', square: 'box', grid: 'filled square dots',
  polygon: 'hexagon pentagon octagon', cross: 'cross add', rays: 'burst sunburst', spiral: 'swirl', wave: 'sine',
  sphere: 'ball round', dome: 'half ball', cube: 'box block', lattice: 'filled cube grid', cylinder: 'tube pipe',
  torus: 'donut ring', helix: 'spring coil', tornado: 'twister funnel',
};

for (const s of FIRST_SHAPES) {
  s.cat = s.group === 'solid' ? 'solid' : 'basic';
  if (SEARCH_WORDS[s.id]) s.tags = SEARCH_WORDS[s.id];
}

// Where the first pictures stand now that the tabs have headings: 'tab/Heading'
// -> ids. Some moved to a tab that did not exist when they were drawn.
const PLACES = {
  'symbols/Arrows': 'arrow arrow-double arrow-turn chevrons',
  'symbols/Signs': 'check xmark noentry peace yinyang lightning infinity spade club pentagram hexagram crosshair warning atom eye speech',
  'symbols/Music': 'note notes',
  'faces/Smileys': 'smiley sadface',
  'faces/Characters': 'skull',
  'nature/Sky and weather': 'sun moon cloud raindrop snowflake rainbow planet',
  'nature/Plants': 'leaf tree pine flower tulip clover mushroom cactus',
  'nature/Land and sea': 'flame mountain',
  'animals/Pets and farm': 'cat paw rabbit',
  'animals/Wild animals': 'bat',
  'animals/Birds': 'bird',
  'animals/Sea animals': 'fish',
  'animals/Bugs': 'butterfly web',
  'food/Fruit and vegetables': 'apple',
  'things/Tools': 'pickaxe hammer key lock anchor',
  'things/Weapons': 'sword shield bow',
  'things/Treasure and magic': 'crown jewel potion',
  'things/Games and sport': 'trophy flag',
  'things/Music': 'bell',
  'things/Home': 'umbrella bulb candle',
  'things/Party and holidays': 'gift balloon ghost',
  'travel/Vehicles': 'rocket boat',
  'travel/Buildings': 'house castle',
};

// The shapes that are put together by rule (see shape-mix.js). They are not pictures for the frames of shapes-framed.js.
const NEW_SHAPES = [
  ...MONSTER_SHAPES, ...ROBOT_SHAPES, ...ITEM_SHAPES, ...COSMOS_SHAPES, ...MANDALA_SHAPES, ...BUILDING_SHAPES, ...SEA_SHAPES,
  ...SPRITE_SHAPES, ...SPIRO_SHAPES,
  ...LOOT_SHAPES, ...GEAR_SHAPES, ...LOOT3D_SHAPES, ...GEAR3D_SHAPES,
];

/** Every shape, grouped by tab in the order of CATEGORIES, and by heading inside a tab. */
export const SHAPES = (() => {
  const drawn = [
    ...FIRST_SHAPES, ...GEO_SHAPES, ...TEXT_SHAPES, ...ICON_SHAPES,
    ...FLAT_SHAPES, ...SOLID_SHAPES, ...CURVE_SHAPES, ...EFFECT_SHAPES,
    ...SIGN_SHAPES, ...LIVING_SHAPES, ...STUFF_SHAPES, ...PIXEL_SHAPES,
    ...MARK_SHAPES, ...WILD_SHAPES, ...GOODS_SHAPES, ...EXTRA_SHAPES,
    ...SCRIPT_SHAPES, ...WORD_SHAPES, ...COUNT_SHAPES, ...PIXEL2_SHAPES, ...FORM_SHAPES, ...SPACE_SHAPES, ...MODEL_SHAPES, ...MAGIC_SHAPES, ...EMBLEM_SHAPES, ...OUTDOOR_SHAPES,
    ...NUMBER_SHAPES, ...VOCAB_SHAPES, ...NAME_SHAPES, ...COMBO_SHAPES, ...BADGE_SHAPES, ...BENT_SHAPES, ...PIXEL3_SHAPES, ...ORNAMENT_SHAPES, ...SOLID2_SHAPES, ...FAMOUS_SHAPES, ...LABEL_SHAPES,
  ];
  const byId = new Map(drawn.map((s) => [s.id, s]));
  for (const [place, ids] of Object.entries(PLACES)) {
    const [cat, sub] = place.split('/');
    for (const id of ids.split(' ')) Object.assign(byId.get(id), { cat, sub });
  }
  // (the pictures in frames are made from the pictures above, so they come once every picture is in its place)
  const all = [...drawn, ...framedShapes(drawn), ...NEW_SHAPES];
  return CATEGORIES.flatMap((c) => {
    const mine = all.filter((s) => s.cat === c.id);
    const stray = mine.find((s) => s.sub && !c.subs.includes(s.sub));
    if (stray) throw new Error(`Shape ${stray.id}: the ${c.name} tab has no heading "${stray.sub}"`);
    return [...mine.filter((s) => !s.sub), ...c.subs.flatMap((sub) => mine.filter((s) => s.sub === sub))];
  });
})();

export const SHAPE_BY_ID = Object.fromEntries(SHAPES.map((s) => [s.id, s]));

const TAB_NAME = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name.toLowerCase()]));

/** Default values of a shape's extra sliders. */
export function defaultParams(shapeId) {
  const shape = SHAPE_BY_ID[shapeId];
  const out = {};
  for (const p of (shape && shape.params) || []) out[p.key] = p.default;
  return out;
}

// ---- the search
//
// What the search looks at, shape by shape in the order of SHAPES: the name, the sign, and all the text
// of the shape (name, sign, search words, the name of its tab, its id) in small letters.
const lookup = [];
// A word of that text -> the shapes that have it (their places in SHAPES). The library has some ten
// thousand different words, a million in all: a search goes through the words, not through the shapes.
const partsOf = new Map();
// A heading -> the shapes that stand under it.
const underHeading = new Map();
const BETWEEN = /[\s-]/; // what stands between two words of a text

/** Writes down what the search needs, up to the shape at `upTo` (left out: all of them). */
function searchIndex(upTo = SHAPES.length) {
  for (let order = lookup.length; order < upTo; order++) {
    const s = SHAPES[order];
    const name = s.name.toLowerCase();
    const label = (s.label || '').toLowerCase();
    const all = `${name} ${label} ${(s.tags || '').toLowerCase()} ${TAB_NAME[s.cat]} ${s.id}`;
    const heading = (s.sub || '').toLowerCase();
    for (const part of all.split(/[\s-]+/)) {
      const list = partsOf.get(part);
      if (!list) partsOf.set(part, [order]);
      else if (list[list.length - 1] !== order) list.push(order);
    }
    if (heading) {
      if (underHeading.has(heading)) underHeading.get(heading).push(order);
      else underHeading.set(heading, [order]);
    }
    lookup.push({ name, label, all, heading });
  }
  return lookup;
}

/**
 * Gets the search ready, `some` shapes at a time. The page calls it again and again while it has nothing
 * else to do, so that the first letter typed is answered at once. True as long as there is more to do.
 */
export function prepareSearch(some = 2500) {
  searchIndex(Math.min(SHAPES.length, lookup.length + some));
  return lookup.length < SHAPES.length;
}

// Which shapes were met in the search that is running (a number per search, so that nothing has to be wiped).
let met = null;
let round = 0;

/** The shapes (their places) with a word that `fits`; `headings`: and those under a heading that fits. */
function shapesThat(fits, headings) {
  round++;
  const out = [];
  const take = (orders) => {
    for (const order of orders) {
      if (met[order] !== round) {
        met[order] = round;
        out.push(order);
      }
    }
  };
  for (const [part, orders] of partsOf) if (fits(part)) take(orders);
  if (headings) for (const [heading, orders] of underHeading) if (fits(heading)) take(orders);
  return out;
}

/** Of the shapes in `some`, those that are in `others` too. */
function inBoth(some, others) {
  round++;
  for (const order of others) met[order] = round;
  return some.filter((order) => met[order] === round);
}

// The words that were typed last, each with its shapes: while a name is typed, and when one name after
// another of a family is looked for, most of the words are the same again.
const WORDS_KEPT = 16;
const lately = new Map();

/** The shapes (their places) that one word of what was typed finds. */
function shapesWith(word) {
  let found = lately.get(word);
  if (found) return found;
  if (word.length === 1) {
    // a single letter has to start a word, or "a" would find nearly everything (and the headings do not count for it)
    found = shapesThat((part) => part.startsWith(word), false);
  } else if (!word.includes('-')) {
    found = shapesThat((text) => text.includes(word), true);
  } else {
    // A hyphen stands between two words of a shape ("t-rex", an id like "3d-sword-7"). Each piece of what
    // was typed is in one of them: only the shapes that have them all are looked at for the whole of it.
    const pieces = word.split('-').filter(Boolean);
    let some = pieces.length ? null : lookup.map((_, order) => order);
    for (const piece of pieces) {
      const having = shapesThat((text) => text.includes(piece), true);
      some = some ? inBoth(some, having) : having;
    }
    found = some.filter((order) => lookup[order].all.includes(word) || lookup[order].heading.includes(word));
  }
  if (lately.size >= WORDS_KEPT) lately.delete(lately.keys().next().value);
  lately.set(word, found);
  return found;
}

/** Does a word of `whole` begin with `text`? `between`: what stands between two words of it. */
function startsWord(whole, text, between) {
  for (let at = whole.indexOf(text); at >= 0; at = whole.indexOf(text, at + 1)) {
    if (at === 0 || between.test(whole[at - 1])) return true;
  }
  return false;
}

/**
 * Shapes that match what was typed into the search box, best match first.
 * Every word has to appear in the name, the sign ("A", "7", "?"), the search
 * words, the name of the tab or the heading the shape stands under.
 */
export function searchShapes(text) {
  const words = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const typed = words.join(' ');
  const index = searchIndex();
  if (!met) met = new Int32Array(SHAPES.length);
  // the shapes that have every word: the word that the fewest have first
  const lists = [...new Set(words)].map(shapesWith).sort((a, b) => a.length - b.length);
  let orders = lists[0];
  for (let i = 1; i < lists.length && orders.length; i++) orders = inBoth(orders, lists[i]);
  const oneWord = words.length === 1; // (more words than one are not the beginning of any single word)
  const found = orders.map((order) => {
    const x = index[order];
    // The shape of that very name comes first, and so does a sign ("A", "7", "GG"). A word under a picture that is
    // what was typed comes right after: "cat" finds the cat before the word CAT, and "win" the word WIN first of all
    // (the plain word before the same word on an arch or in pixels: the shorter name first).
    let rank = 5;
    if (x.name === typed || (x.label === typed && typed.length <= 2)) rank = 0;
    else if (x.label === typed) rank = 0.5 + Math.min(400, x.name.length) / 1000;
    else if (x.name.startsWith(typed)) rank = 1;
    else if (oneWord && startsWord(x.name, typed, / /)) rank = 2; // a word of the name begins with it
    else if (x.name.includes(typed)) rank = 3;
    else if (oneWord && !typed.includes('-') && startsWord(x.all, typed, BETWEEN)) rank = 4; // a word of its text does
    return [rank, order];
  });
  return found.sort((p, q) => p[0] - q[0] || p[1] - q[1]).map((f) => SHAPES[f[1]]);
}

// Where a long word under a picture may break. On a narrow button it then breaks there, with a
// hyphen ("Screw-driver"), and not wherever the line happens to end. Every word of 9 letters or more
// in a name needs a place here: the tests say which one is missing.
const BREAKS = new Map((
  'angel|fish angler|fish ankylo|saurus antisnow|flake arma|dillo arrow|head astro|naut attrac|tor auber|gine '
  + 'basket|ball battle|ments bino|culars bio|hazard blue|tooth book|shelf boome|rang borro|mean brief|case '
  + 'butter|fly calcu|lator capri|corn card|board cart|ridge cater|pillar chame|leon checker|board cheq|uered '
  + 'choco|late christ|mas clapper|board cobble|stones cochle|oid constel|lation control|ler croco|dile crois|sant '
  + 'cross|bones cross|hair cubocta|hedron dande|lion dodeca|hedron dragon|fly drum|stick ellip|soid epi|cycloid '
  + 'epi|spiral equal|iser excla|mation explo|sion feath|ered fibo|nacci fire|works flam|mable foot|baller '
  + 'foot|print full|screen ginger|bread gradu|ation grass|hopper grave|stone grim|acing hammer|head harmono|graph '
  + 'head|dress head|phones heart|beat heli|copter hepta|gram herring|bone hexa|flake honey|comb hop|scotch '
  + 'horse|shoe hour|glass humming|bird hurri|cane hyper|bola hypo|cycloid icosa|hedron icosidode|cahedron '
  + 'jelly|fish lemnis|cate light|house light|ning lissa|jous magni|fier magni|fying mandel|brot medi|tating '
  + 'metro|nome micro|phone milk|shake mistle|toe moun|tains mous|tache navi|gation obser|vatory octa|hedron '
  + 'para|chute parallelo|gram penta|flake penta|gram perspec|tive pine|apple propel|ler ptero|dactyl puffer|fish '
  + 'pytha|goras quatre|foil radi|ation rain|drops rect|angle recy|cling sagit|tarius sand|castle satel|lite '
  + 'scratch|ing screw|driver sier|pinski six|teenth skate|board skate|boarder sky|scraper snow|flake space|ship '
  + 'spark|ling spino|saurus spiro|graph squint|ing stair|case stalac|tites stego|saurus stop|watch straw|berry '
  + 'sub|marine succu|lent sum|moning sun|flower super|shape sur|prised suspen|sion sword|fish tele|scope '
  + 'tele|vision ter|dragon tetra|hedron tetro|mino thermo|meter tomb|stone tooth|brush trape|zoid tri|angles '
  + 'tricera|tops trilo|bite tri|quetra triske|lion trun|cated tschirn|hausen water|fall water|melon weight|lifter '
  + 'wheel|chair whirl|pool wrist|watch '
  // (the Combos tab: a little picture many times)
  + 'snow|flakes butter|flies mush|rooms umbrel|las '
  // (the polyhedra of shapes-solids2.js)
  + 'hexa|hedron delto|idal disdy|akis penta|gonal triaconta|hedron hexeconta|hedron stel|lated trian|gular tetra|hedra '
  // (the famous curves of shapes-famous.js)
  + 'hyper|bolic serpen|tine semi|cubical expo|nential loga|rithm stro|phoid trisec|trix '
  // (the pixel art of shapes-sprites.js)
  + 'star|fighter'
).split(' ').map((word) => [word.replace('|', ''), word.indexOf('|')]));

for (const [word, at] of VOCAB_BREAKS) if (!BREAKS.has(word)) BREAKS.set(word, at); // (the long words of the Words and Names tabs)

/** What stands under the picture of a shape: its sign or its name, with a soft hyphen where a long word may break. */
export function shapeCaption(shape) {
  return (shape.label || shape.name).replace(/\p{L}{9,}/gu, (word) => {
    const at = BREAKS.get(word.toLowerCase());
    return at ? `${word.slice(0, at)}\u00AD${word.slice(at)}` : word;
  });
}

export const MAX_COUNT = 600;

// The same shape is asked for again and again (every frame while playing), so
// the last results are kept. They are frozen: callers get the list to read.
const recent = new Map();
const RECENT_MAX = 300;

/** Points of a shape. 'point' (a single particle) is the trivial shape. */
export function shapePoints(shapeId, count, params = {}) {
  if (shapeId === 'point') return [[0, 0, 0]];
  const shape = SHAPE_BY_ID[shapeId];
  if (!shape) return [[0, 0, 0]];
  const n = Math.max(shape.min, Math.min(MAX_COUNT, Math.round(Number(count) || shape.count)));
  const full = { ...defaultParams(shapeId) };
  let key = `${shapeId}|${n}`;
  for (const p of shape.params || []) {
    const v = Number(params[p.key]);
    if (Number.isFinite(v)) full[p.key] = Math.min(p.max, Math.max(p.min, v));
    key += `|${full[p.key]}`;
  }
  let points = recent.get(key);
  if (!points) {
    points = shape.gen(n, full);
    for (const p of points) Object.freeze(p);
    Object.freeze(points);
    recent.set(key, points);
    if (recent.size > RECENT_MAX) recent.delete(recent.keys().next().value);
  }
  return points;
}
