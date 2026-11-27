// The Items tab: swords, potions, keys, shields, gems, wands, axes and crowns,
// each kind put together from a few parts (see shape-mix.js for how the parts
// are dealt out). One unit of a drawing is roughly the gap between two
// particles, or a little more.

import {
  family, edgeOf as edge, mirrored, joined, resized, at, path, closed, circle, oval, arc, dot, box, bow, bowTo, wavy, zigzag, add, mid, polar, ringOf, ball,
  star, heart, sparkle, diamond, roundedBox, left, beyond,
} from './shape-mix.js';

const words = (...parts) => parts.filter(Boolean).join(' ');

// ---------------------------------------------------------------- swords
//
// Drawn upright, the guard at the height 4, the blade above it and the grip
// below; shown slanting. Blade, guard, grip, pommel.

const GUARDS = [
  ['', path([-3, 4], [3, 4])],
  ['curved guard', bow([-3.2, 4.9], [3.2, 4.9], -0.28)],
  ['winged guard', path([-3, 5.2], [0, 4], [3, 5.2])],
  ['ball guard', `${path([-2.4, 4], [2.4, 4])} ${oval(3.2, 4, 0.8, 0.8, 180)} ${oval(-3.2, 4, 0.8, 0.8, 0)}`],
  ['drooping guard', bow([-3.2, 3.1], [3.2, 3.1], 0.28)],
  ['basket guard', path([-3, 5.4], [-3, 4], [3, 4], [3, 5.4])],
  ['double guard', `${path([-3, 4], [3, 4])} ${path([-2, 3], [2, 3])} ${path([0, 4], [0, 3])}`],
  ['crossed guard', `${path([-3, 4], [3, 4])} ${path([3, 3.1], [3, 4.9])} ${path([-3, 3.1], [-3, 4.9])}`],
  ['diamond guard', closed([-3, 4], [0, 5.1], [3, 4], [0, 2.9])],
];

const BLADES = [
  ['straight', (g) => path(g.top(-1.1), [-1.1, 16.5], [0, 19], [1.1, 16.5], g.top(1.1))],
  ['broad wide', (g) => path(g.top(-1.6), [-1.6, 15.2], [0, 18.2], [1.6, 15.2], g.top(1.6))],
  ['rapier thin', (g) => path(g.top(0), [0, 20])],
  ['scimitar curved sabre', (g) => `M${at(...g.top(-1))} Q${at(-1.6, 12)} ${at(3, 18.6)} M${at(...g.top(1.1))} Q${at(1.6, 11)} ${at(3.4, 14.6)} L${at(3, 18.6)}`],
  ['wavy flame blade', (g) => `${wavy(g.top(-1.1), [-1.1, 15.9], 4, 0.4)} ${path([-1.1, 15.9], [0, 18.8], [1.1, 15.9])} ${wavy(g.top(1.1), [1.1, 15.9], 4, 0.4)}`],
  ['leaf blade', (g) => `M${at(...g.top(-0.8))} C${at(-0.8, 9)} ${at(-2.7, 14)} ${at(0, 19)} M${at(...g.top(0.8))} C${at(0.8, 9)} ${at(2.7, 14)} ${at(0, 19)}`],
  ['cleaver falchion', (g) => path(g.top(-0.9), [-0.9, 17.8], [2.4, 15.2], g.top(0.9))],
  ['saw toothed', (g) => path(g.top(-1.1), [-1.1, 16.5], [0, 19], ...zigzag([1.1, 16.5], g.top(1.1), 5, 0.8))],
  ['great sword', (g) => `${path(g.top(-1.3), [-1.3, 16.2], [0, 19], [1.3, 16.2], g.top(1.3))} ${path(add(g.top(0), 0, 1.3), [0, 15.8])}`],
  ['dagger short knife', (g) => path(g.top(-1.3), [-1.3, 9.6], [0, 13], [1.3, 9.6], g.top(1.3))],
  ['crystal tip', (g) => path(g.top(-0.8), [-0.8, 13.6], [-1.9, 15.6], [0, 19.5], [1.9, 15.6], [0.8, 13.6], g.top(0.8))],
];

// [search words, how long, how many bands]
const GRIPS = [['', 3.2, 0], ['wrapped grip', 3.2, 2], ['long grip two handed', 4.8, 0], ['long wrapped grip', 4.8, 3]];

// What ends a handle, hanging from the height y. Wands and axes end the same way.
const ENDS = [
  (y) => oval(0, y - 0.9, 0.9, 0.9, 90),
  (y) => diamond(0, y - 1, 0.9, 1),
  (y) => path([-1.1, y], [1.1, y]),
  (y) => bow([-1.2, y - 0.9], [1.2, y - 0.9], 0.75),
  () => '',
  (y) => box(-0.8, y - 1.6, 0.8, y),
  (y) => `${path([0, y], [-0.9, y - 1.7])} ${path([0, y], [0.9, y - 1.7])}`,
];

const swords = family({
  cat: 'items', count: 250, spacing: 0.1, turn: -45, sizes: [BLADES.length, GUARDS.length, GRIPS.length, ENDS.length],
  make: ([blade, guard, grip, pommel], k) => ({
    id: `sword-${k}`, name: `Sword ${k}`, sub: 'Swords',
    tags: words('weapon blade knight fight', BLADES[blade][0], GUARDS[guard][0], GRIPS[grip][0]),
    draw: () => {
      const g = edge(GUARDS[guard][1]);
      const [, long, bands] = GRIPS[grip];
      const [, from] = g.bottom(0);
      const ties = Array.from({ length: bands }, (_, i) => path([-0.7, from - (long * (i + 1)) / (bands + 1)], [0.7, from - (long * (i + 1)) / (bands + 1)]));
      return [g.d, BLADES[blade][1](g), path([0, from], [0, from - long]), ...ties, ENDS[pommel](from - long)].join(' ');
    },
  }),
});

// ---------------------------------------------------------------- potions
//
// A bottle with its mouth at the height 5. Bottle, what closes it, what is in it, what is on it.
// [search words, outline, half the width of the mouth, the middle of its belly, a high and a low level of the drink]

const BOTTLES = [
  ['round flask', 'M0.9,5 L0.9,3.086 E0,-0.4 3.6 3.6 75.52 -255.52 L-0.9,5', 0.9, -0.6, 0.8, -1.6],
  ['cone flask', path([0.9, 5], [0.9, 3.2], [3.8, -3.6], [-3.8, -3.6], [-0.9, 3.2], [-0.9, 5]), 0.9, -1.7, -0.2, -2.2],
  ['vial tube', `${path([2.4, 5], [2.4, -1.6])} ${bowTo([-2.4, -1.6], 1)} L-2.4,5`, 2.4, -1, 1.6, -1],
  ['square bottle', path([0.9, 5], [0.9, 2.6], [3.2, 2.6], [3.2, -3.6], [-3.2, -3.6], [-3.2, 2.6], [-0.9, 2.6], [-0.9, 5]), 0.9, -0.5, 1, -1.6],
  ['drop bottle', 'M0.9,5 L0.9,3.4 C0.9,1.6 3.6,0.6 3.6,-1.2 E0,-1.2 3.6 2.7 0 -180 C-3.6,0.6 -0.9,1.6 -0.9,3.4 L-0.9,5', 0.9, -1.2, 0.4, -1.8],
  ['crystal bottle', path([0.9, 5], [0.9, 3.2], [3.6, 0], [0, -3.9], [-3.6, 0], [-0.9, 3.2], [-0.9, 5]), 0.9, -0.3, 1.2, -1.2],
  ['jar', 'M0.9,5 L0.9,3.382 E0,0 3.5 3.5 75.1 -53.13 L-2.1,-2.8 E0,0 3.5 3.5 233.13 104.9 L-0.9,5', 0.9, 0, 1.2, -1.2],
];

const STOPPERS = [
  ['cork', (n) => `${path([-n, 5], [n, 5])} ${path([-n, 5], [-n, 6.3], [n, 6.3], [n, 5])}`],
  ['open fizzing', (n) => `${path([-n - 0.8, 5], [n + 0.8, 5])} ${dot(0.4, 6.3)} ${dot(-0.5, 7.5)}`],
  ['stopper', (n) => `${path([-n, 5], [n, 5])} ${path([0, 5], [0, 5.6])} ${oval(0, 6.6, 1, 1, 270)}`],
  ['lid', (n) => box(-n - 0.8, 5, n + 0.8, 6)],
  ['steam smoke', (n) => `${path([-n, 5], [n, 5])} ${wavy([0, 5.9], [0, 8.7], 3, 0.4)}`],
];

// (bottle outline, middle of the belly, high level, low level) => what is drawn
const DRINKS = [
  ['full', (b, c, hi) => path(left(b.right(hi)), b.right(hi))],
  ['bubbles', (b, c, hi) => `${path(left(b.right(hi)), b.right(hi))} ${dot(-0.9, hi - 1)} ${dot(0.8, hi - 1.9)}`],
  ['sloshing', (b, c, hi) => wavy(left(b.right(hi)), b.right(hi), 4, 0.35)],
  ['label', (b, c) => box(-1.3, c - 0.8, 1.3, c + 0.8)],
  ['love heart', (b, c) => heart(0, c - 0.1, 1.5)],
  ['star magic', (b, c) => star(0, c, 5, 1.6, 0.8)],
  ['empty', () => ''],
  ['fizzy bubbles', (b, c) => `${dot(-0.9, c - 0.6)} ${dot(0.7, c + 0.3)} ${dot(-0.1, c + 1.3)}`],
  ['two layers', (b, c, hi, lo) => `${path(left(b.right(hi)), b.right(hi))} ${path(left(b.right(lo)), b.right(lo))}`],
];

// (bottle outline, half the width of the mouth, middle of the belly) => [what is drawn on the right and mirrored, what stands in the middle]
const TRIMS = [
  ['', () => [[], []]],
  ['tag', (b) => [[], [ball(b.right(4.1), add(b.right(4.1), 2.3, 0.3), 0.7)]]],
  ['handles jug', (b) => [[bow(b.right(4), b.right(2.2), 1)], []]],
  ['sparkles shining', () => [[], [sparkle(4.6, 4.4), sparkle(-4.2, 3.9)]]],
  ['shelf', (b) => [[], [path([-3.4, b.bottom(0)[1] - 0.9], [3.4, b.bottom(0)[1] - 0.9])]]],
  ['band', (b, n) => [[], [path([-n - 0.7, 4], [n + 0.7, 4])]]],
  ['drops spilling', (b) => [[], [dot(b.right(3.9)[0] + 1.2, 3.9), dot(b.right(1.6)[0] + 1.3, 1.6)]]],
  ['glowing', (b, n, c) => [[1.1, 0, -1.1].map((dy) => path(add(b.right(c + dy), 0.9, 0), add(b.right(c + dy), dy ? 2 : 2.5, 0))), []]],
];

const potions = family({
  cat: 'items', count: 280, spacing: 0.1, sizes: [BOTTLES.length, STOPPERS.length, DRINKS.length, TRIMS.length],
  make: ([bottle, stopper, drink, trim], k) => ({
    id: `potion-${k}`, name: `Potion ${k}`, sub: 'Potions',
    tags: words('bottle flask magic drink brew elixir', BOTTLES[bottle][0], STOPPERS[stopper][0], DRINKS[drink][0], TRIMS[trim][0]),
    draw: () => {
      const [, line, mouth, belly, high, low] = BOTTLES[bottle];
      const b = edge(line);
      const [sides, middle] = TRIMS[trim][1](b, mouth, belly);
      return mirrored([sides], [line, STOPPERS[stopper][1](mouth), DRINKS[drink][1](b, belly, high, low), middle]);
    },
  }),
});

// ---------------------------------------------------------------- keys
//
// Drawn upright, the bow (what you hold) at the top and the bit (what turns the lock) at the bottom; shown slanting.
// [search words, outline, where the shaft starts, the middle of the bow]

const BOWS = [
  ['ring', oval(0, 6, 2.6, 2.6, 270), 3.4, 6],
  ['diamond', closed([0, 3], [3, 6], [0, 9], [-3, 6]), 3, 6],
  ['square', box(-2.3, 3.4, 2.3, 8), 3.4, 5.7],
  ['hexagon', closed(...ringOf((a) => polar(0, 6, 2.7, a + 180), 60)), 3.3, 6],
  ['heart love', `${path([0, 3], [-3.4, 6.8])} ${bowTo([0, 8], 0.9)} ${bowTo([3.4, 6.8], 0.9)} Z`, 3, 5.9],
  ['oval', oval(0, 6, 3.2, 2.3, 270), 3.7, 6],
  ['cog gear', closed(...ringOf((a) => polar(0, 6, Math.round((a - 90) / 22.5) % 2 ? 2 : 2.8, a + 180), 22.5)), 3.2, 6],
];

const HOLES = [
  (y) => circle(0, y, 1.1),
  () => '',
  (y) => dot(0, y),
  (y) => diamond(0, y, 1.1),
  (y) => sparkle(0, y, 1.1),
];

const BITS = [
  path([0, -4.4], [2.2, -4.4], [2.2, -7], [0, -7]),
  `${path([0, -4.4], [2, -4.4])} ${path([0, -5.7], [1.3, -5.7])} ${path([0, -7], [2, -7])}`,
  path([0, -4.4], [2.2, -4.4], [2.2, -5.3], [1.2, -5.3], [1.2, -6.1], [2.2, -6.1], [2.2, -7], [0, -7]),
  path([0, -5.6], [2, -5.6], [2, -7], [0, -7]),
  path([0, -4.4], [1.2, -4.4], [1.2, -5.7], [2.4, -5.7], [2.4, -7], [0, -7]),
  path([0, -5], [2, -5], [2, -7], [-2, -7], [-2, -5.9], [0, -5.9]),
  path([0, -4.4], [2.2, -5.7], [0, -7]),
  path([0, -3.8], [1.8, -4.6], [0, -5.4], [1.8, -6.2], [0, -7]),
  `${path([0, -5.6], [2.2, -5.6])} ${path([2.2, -4.4], [2.2, -6.8])}`,
];

// (where the shaft starts) => the shaft and what is on it
const SHAFTS = [
  (y) => path([0, y], [0, -7]),
  (y) => `${path([0, y], [0, -7])} ${path([-0.8, 1.5], [0.8, 1.5])}`,
  (y) => `${path([0, y], [0, -7])} ${path([-0.8, 2], [0.8, 2])} ${path([-0.8, 0.9], [0.8, 0.9])}`,
  (y) => `${path([0, y], [0, 2.1])} ${oval(0, 1.3, 0.8, 0.8, 90)} ${path([0, 0.5], [0, -7])}`,
  (y) => `${path([0, y], [0, 2.2])} ${diamond(0, 1.3, 0.9)} ${path([0, 0.4], [0, -7])}`,
  (y) => `${path([0, y], [0, -7])} ${path([-1.3, y - 1], [1.3, y - 1])}`,
  (y) => `${path([0, y], [0, 2.1])} ${box(-0.8, 0.5, 0.8, 2.1)} ${path([0, 0.5], [0, -7])}`,
  (y) => `${path([0, y], [0, -7])} ${path([-0.8, 1.5], [0.8, 1.5])} ${path([-0.8, -1.5], [0.8, -1.5])}`,
];

const keys = family({
  cat: 'items', count: 280, spacing: 0.1, turn: 45, sizes: [BOWS.length, HOLES.length, BITS.length, SHAFTS.length],
  make: ([bowOf, hole, bit, shaft], k) => ({
    id: `key-${k}`, name: `Key ${k}`, sub: 'Keys',
    tags: words('lock open door chest unlock', BOWS[bowOf][0]),
    draw: () => {
      const [, line, from, middle] = BOWS[bowOf];
      return [line, HOLES[hole](middle), SHAFTS[shaft](from), BITS[bit]].join(' ');
    },
  }),
});

// ---------------------------------------------------------------- shields
//
// Shape, what is painted on it (within 1.9 of its middle), its rim, and what is behind or beside it.

const SHIELDS = [
  ['heater', 'M-4.4,5 L4.4,5 L4.4,0.6 Q4.4,-3.4 0,-5.6 Q-4.4,-3.4 -4.4,0.6 Z'],
  ['round buckler', circle(0, 0, 5)],
  ['kite', 'M-3.9,5.2 L3.9,5.2 Q4.3,-1 0,-6.2 Q-4.3,-1 -3.9,5.2 Z'],
  ['tower', roundedBox(0, 0, 3.9, 5.3, 0.9)],
  ['peaked', 'M-4.4,4.5 L0,5.7 L4.4,4.5 L4.4,0.2 Q4.2,-3.6 0,-5.6 Q-4.2,-3.6 -4.4,0.2 Z'],
  ['pointed', closed([-4.3, 5], [4.3, 5], [4.3, -1.4], [0, -5.6], [-4.3, -1.4])],
  ['oval', oval(0, 0, 4.1, 5.6)],
];

const EMBLEMS = [
  ['cross', `${path([0, 2.1], [0, -1.5])} ${path([-1.6, 0.6], [1.6, 0.6])}`],
  ['star', star(0, 0.3, 5, 1.9, 0.85)],
  ['heart love', heart(0, 0.2, 1.7)],
  ['chevrons', `${path([-1.7, 0.3], [0, 1.9], [1.7, 0.3])} ${path([-1.7, -1.3], [0, 0.3], [1.7, -1.3])}`],
  ['boss circle', `${circle(0, 0.3, 1.6)} ${dot(0, 0.3)}`],
  ['diamond', diamond(0, 0.3, 1.5, 1.9)],
  ['lightning bolt', path([0.8, 2.2], [-0.9, 0.2], [0.7, 0.2], [-0.8, -1.8])],
  ['moon crescent', `M0.5,2.1 ${bowTo([0.5, -1.5], -1)} ${bowTo([0.5, 2.1], 0.45)}`],
  ['crown', closed([-1.7, -0.9], [-1.7, 1.5], [-0.8, 0.4], [0, 1.7], [0.8, 0.4], [1.7, 1.5], [1.7, -0.9])],
];

// (outline) => a drawing or its text
const RIMS = [
  ['', () => ''],
  ['rim', (s) => resized(s.d, [0, 0], 0.76)],
  ['band', (s) => path(left(s.right(3.3)), s.right(3.3))],
  ['studs rivets', (s) => `${dot(s.right(3.6)[0] - 1.1, 3.6)} ${dot(1.1 - s.right(3.6)[0], 3.6)} ${dot(0, s.bottom(0)[1] + 1.7)}`],
  ['stripes', (s) => [-2.9, -4].map((y) => path(left(s.right(y)), s.right(y))).join(' ')],
];

// (outline) => [what is drawn on the right and mirrored, what stands in the middle]
const BESIDE = [
  ['', () => [[], []]],
  ['crossed swords', (s) => {
    // the swords are behind the shield: what shows of them starts a little way off its edge
    const [ux, uy] = polar(0, 0, 1, -52);
    const tip = add(s.out(52), 0.9 * ux, -0.9 * uy);
    const hilt = add(s.out(-52), 0.9 * ux, 0.9 * uy);
    const guard = add(hilt, 1.1 * ux, 1.1 * uy);
    return [[path(tip, add(tip, 2.2 * ux, -2.2 * uy)), path(hilt, add(hilt, 2.6 * ux, 2.6 * uy)), path(add(guard, -0.9 * uy, 0.9 * ux), add(guard, 0.9 * uy, -0.9 * ux))], []];
  }],
  ['crown', (s) => {
    const y = s.top(0)[1] + 0.9;
    return [[], [closed([-1.8, y], [-1.8, y + 1.8], [-0.9, y + 0.9], [0, y + 2.1], [0.9, y + 0.9], [1.8, y + 1.8], [1.8, y])]];
  }],
  ['banner ribbon', (s) => {
    const y = s.bottom(0)[1] - 1;
    return [[], [closed([-4.6, y], [4.6, y], [3.8, y - 0.8], [4.6, y - 1.6], [-4.6, y - 1.6], [-3.8, y - 0.8])]];
  }],
  ['wings', (s) => [[path(s.right(2.6), add(s.right(2.6), 2.8, 1.6)), path(s.right(1.2), add(s.right(1.2), 3, 0.9)), path(s.right(-0.2), add(s.right(-0.2), 2.6, 0.2))], []]],
  ['spikes', (s) => [[path(s.right(1.6), [s.right(0.6)[0] + 1.9, 0.6], s.right(-0.4))], []]],
  ['star', (s) => [[], [star(0, s.top(0)[1] + 2.2, 5, 1.3, 0.55)]]],
  ['laurel wreath', () => [[arc(0, 0, 7.3, 340, 285), ...[330, 312, 294].map((a) => path(polar(0, 0, 7.3, a), polar(0, 0, 8.4, a + 6)))], []]],
];

const shields = family({
  cat: 'items', count: 280, spacing: 0.1, sizes: [SHIELDS.length, EMBLEMS.length, RIMS.length, BESIDE.length], first: [0, 0, 1, 1],
  make: ([shape, emblem, rim, beside], k) => ({
    id: `shield-${k}`, name: `Shield ${k}`, sub: 'Shields',
    tags: words('armour armor knight guard defend coat of arms', SHIELDS[shape][0], EMBLEMS[emblem][0], RIMS[rim][0], BESIDE[beside][0]),
    draw: () => {
      const s = edge(SHIELDS[shape][1]);
      const [sides, middle] = BESIDE[beside][1](s);
      return joined(mirrored([sides], [s.d, EMBLEMS[emblem][1], middle]), RIMS[rim][1](s));
    },
  }),
});

// ---------------------------------------------------------------- gems
//
// A cut (its corners), the facets inside, how it shines, and what it is set in.

const CUTS = [
  ['brilliant', [[-2.7, 3.4], [2.7, 3.4], [5, 0.9], [0, -5], [-5, 0.9]]],
  ['emerald cut', [[-2.2, 5], [2.2, 5], [3.8, 3.4], [3.8, -3.4], [2.2, -5], [-2.2, -5], [-3.8, -3.4], [-3.8, 3.4]]],
  ['hexagon', ringOf((a) => polar(0, 0, 4.8, a), 60)],
  ['square princess', [[0, 5], [5, 0], [0, -5], [-5, 0]]],
  ['triangle trillion', [[0, 5], [4.9, -3.5], [-4.9, -3.5]]],
  ['shard crystal', [[0, 6], [2.5, 3.2], [2.5, -3.2], [0, -6], [-2.5, -3.2], [-2.5, 3.2]]],
  ['kite', [[0, 5.2], [3.5, 1.7], [0, -5.6], [-3.5, 1.7]]],
  ['round octagon', ringOf((a) => polar(0, 0, 4.8, a + 22.5), 45)],
  ['baguette', [[-2.7, 4.8], [2.7, 4.8], [2.7, -4.8], [-2.7, -4.8]]],
];
const shrunk = (corners, c, by) => corners.map((p) => mid(c, p, by));
const next = (corners, i) => corners[(i + 1) % corners.length];

// (corners, middle) => what is drawn inside
const FACETS = [
  ['', () => ''],
  ['step cut', (p, c) => `${closed(...shrunk(p, c, 0.5))} ${p.map((a) => path(a, mid(c, a, 0.5))).join(' ')}`],
  ['table', (p, c) => closed(...shrunk(p, c, 0.5))],
  ['pie facets', (p, c) => p.map((a) => path(a, c)).join(' ')],
  ['star cut', (p, c) => closed(...p.flatMap((a, i) => [a, mid(c, mid(a, next(p, i)), 0.45)]))],
  ['double step', (p, c) => `${closed(...shrunk(p, c, 0.68))} ${closed(...shrunk(p, c, 0.36))} ${p.map((a) => path(a, mid(c, a, 0.68))).join(' ')}`],
  ['inner pie', (p, c) => `${closed(...shrunk(p, c, 0.55))} ${p.map((a) => path(mid(c, a, 0.55), c)).join(' ')}`],
  ['cross facets', (p, c) => p.map((a, i) => path(mid(a, next(p, i)), c)).join(' ')],
];

const SHINES = [
  ['', () => ''],
  ['sparkle shining', (p, c) => sparkle(...beyond(p, c, 45, 1.7), 0.8)],
  ['two sparkles', (p, c) => `${sparkle(...beyond(p, c, 45, 1.7), 0.8)} ${sparkle(...beyond(p, c, 135, 1.5), 0.6)}`],
  ['rays glint', (p, c) => [30, 45, 60].map((a) => path(beyond(p, c, a, 0.9), beyond(p, c, a, a === 45 ? 2.6 : 2.1))).join(' ')],
  ['twinkle', (p, c) => [1.1, 2.3, 3.5].map((more) => dot(...beyond(p, c, 45, more))).join(' ')],
];

// (top, bottom, corners, middle) => what it is set in
const SETTINGS = [
  ['', () => ''],
  ['pendant necklace', (top) => `${ball([0, top], [0, top + 1.3], 0.8)} ${path([0, top + 2.1], [-2.3, top + 4.7])} ${path([0, top + 2.1], [2.3, top + 4.7])}`],
  ['ring', (top, bottom) => circle(0, bottom - 3.7, 2.7)],
  ['stand pedestal', (top, bottom) => closed([-1.5, bottom - 1], [1.5, bottom - 1], [2.7, bottom - 2.8], [-2.7, bottom - 2.8])],
  ['shadow floating', (top, bottom) => oval(0, bottom - 1.6, 2.7, 0.6)],
  ['small gems', (top, bottom, p, c) => `${diamond(...beyond(p, c, 300, 1.9), 0.9)} ${diamond(...beyond(p, c, 240, 1.9), 0.9)}`],
  ['cushion', (top, bottom) => bow([-3.4, bottom - 0.9], [3.4, bottom - 0.9], -0.3)],
];

const gems = family({
  cat: 'items', count: 280, spacing: 0.1, sizes: [CUTS.length, FACETS.length, SHINES.length, SETTINGS.length], first: [0, 1, 1, 0],
  make: ([cut, facet, shine, setting], k) => ({
    id: `gem-${k}`, name: `Gem ${k}`, sub: 'Gems',
    tags: words('jewel diamond crystal treasure ruby', CUTS[cut][0], FACETS[facet][0], SHINES[shine][0], SETTINGS[setting][0]),
    draw: () => {
      const p = CUTS[cut][1];
      const c = [0, p.reduce((sum, corner) => sum + corner[1], 0) / p.length];
      const line = edge(closed(...p));
      return [line.d, FACETS[facet][1](p, c), SHINES[shine][1](p, c), SETTINGS[setting][1](line.top(0)[1], line.bottom(0)[1], p, c)].join(' ');
    },
  }),
});

// ---------------------------------------------------------------- wands
//
// Drawn upright and shown slanting: the stick from -5 up to its head, which sits around the height 7.4.
// [name, search words, the head, where the stick ends]

const WAND_HEADS = [
  ['Star wand', 'fairy', star(0, 7.3, 5, 2.5, 1.1), 6.2],
  ['Orb staff', 'ball crystal wizard', `${oval(0, 7.2, 2, 2, 270)} ${dot(0, 7.2)}`, 5.2],
  ['Crystal wand', 'gem diamond', diamond(0, 7.5, 1.7, 2.5), 5],
  ['Moon wand', 'crescent night', `M0,5.2 ${bowTo([0, 9.8], 1)} ${bowTo([0, 5.2], -0.45)}`, 5.2],
  ['Heart wand', 'love', heart(0, 7.2, 2), 5.2],
  ['Crook staff', 'spiral curl shepherd wizard', `M0,5 L0,7.6 ${bowTo([3, 7.6], 1)} ${bowTo([1, 7.6], 1)} ${bowTo([2.4, 7.6], 1)}`, 5],
  ['Flame wand', 'fire torch', 'M0,5.2 C2.6,6.2 1.6,8 0,10 C-1.6,8 -2.6,6.2 0,5.2', 5.2],
  ['Trident', 'fork sea', `${path([-2, 9.6], [-2, 6.6], [2, 6.6], [2, 9.6])} ${path([0, 6.6], [0, 10])}`, 6.6],
  ['Sun staff', 'light rays', `${oval(0, 7.4, 1.4, 1.4, 270)} ${[18, 90, 162, 234, 306].map((a) => path(polar(0, 7.4, 2.2, a), polar(0, 7.4, 3.1, a))).join(' ')}`, 6],
];

// (where the stick ends) => the stick
const STICKS = [
  ['', (y) => path([0, -5], [0, y])],
  ['bands', (y) => `${path([0, -5], [0, y])} ${path([-0.8, 2.4], [0.8, 2.4])} ${path([-0.8, 1.2], [0.8, 1.2])}`],
  ['twisted', (y) => wavy([0, -5], [0, y], 6, 0.3)],
  ['handle grip', (y) => `${path([0, -5], [0, -4.3])} ${box(-0.6, -4.3, 0.6, -0.8)} ${path([0, -0.8], [0, y])}`],
  ['crooked branch', (y) => path([0, -5], [0.5, -2.6], [-0.4, -0.2], [0.5, 2.2], [0, y])],
];

const MAGIC = [
  ['', ''],
  ['sparkle', sparkle(4.6, 8.8, 0.8)],
  ['two sparkles', `${sparkle(4.6, 8.8, 0.8)} ${sparkle(-4.4, 5.6, 0.6)}`],
  ['stardust dots', `${dot(-3.8, 9.8)} ${dot(-4.9, 8.1)} ${dot(-5.3, 6.2)}`],
  ['magic trail', wavy([3.8, 9], [6.6, 11.4], 3, 0.4)],
  ['rays', [50, 90, 130].map((a) => path(polar(0, 7.4, 4, a), polar(0, 7.4, 5.2, a))).join(' ')],
  ['halo ring', circle(0, 7.4, 4.4)],
  ['little diamonds', `${diamond(4.5, 9.3, 0.8)} ${diamond(-4.3, 6, 0.8)}`],
];

const wands = family({
  cat: 'items', count: 280, spacing: 0.1, turn: -45, sizes: [WAND_HEADS.length, STICKS.length, MAGIC.length, ENDS.length], first: [0, 0, 1, 4],
  make: ([head, stick, magic, end], k) => {
    const [name, more, top, from] = WAND_HEADS[head];
    const n = Math.floor((k - 1) / WAND_HEADS.length) + 1;
    return {
      id: `${name.toLowerCase().replace(/ /g, '-')}-${n}`, name: `${name} ${n}`, sub: 'Wands and staffs',
      tags: words('wand staff magic wizard witch spell', more, STICKS[stick][0], MAGIC[magic][0]),
      draw: () => [top, STICKS[stick][1](from), MAGIC[magic][1], ENDS[end](-5)].join(' '),
    };
  },
});

// ---------------------------------------------------------------- axes and hammers
//
// Drawn upright and shown slanting: the handle from -6 up, the head around the height 5.
// [name, search words, the head, where the handle ends, the top of it all]

const AXE_HEADS = [
  ['Axe', 'hatchet chop', `M0,6.4 L2.6,7.8 ${bowTo([2.6, 2.2], 0.35)} L0,3.6`, 7.2, 7.2],
  ['Double axe', 'battle axe two blades', `M0,6.4 L2.6,7.8 ${bowTo([2.6, 2.2], 0.35)} L0,3.6 L-2.6,2.2 ${bowTo([-2.6, 7.8], 0.35)} Z`, 7.2, 7.2],
  ['Hammer', 'war hammer smith', box(-2.6, 3.6, 2.6, 6.6), 3.6, 6.6],
  ['Mallet', 'wooden hammer', roundedBox(0, 5.2, 2.9, 1.7, 0.8), 3.5, 6.9],
  ['Pickaxe', 'pick mine dig', 'M-4.4,3.4 Q0,7.6 4.4,3.4', 5.5, 5.5],
  ['Mace', 'morning star spiked ball', `${oval(0, 6, 2, 2, 270)} ${[18, 162, 234, 306].map((a) => path(polar(0, 6, 2, a), polar(0, 6, 3.1, a))).join(' ')}`, 4, 8],
  ['Scythe', 'sickle reaper', `M0,6.6 Q4.6,7.8 6.4,3 L0,5`, 6.6, 6.6],
  ['Spear', 'lance halberd', closed([0, 9.4], [1.6, 6.4], [0, 5], [-1.6, 6.4]), 5, 9.4],
  ['Club', 'bat cudgel', roundedBox(0, 5.7, 1.5, 2.5, 1.2), 3.2, 8.2],
];

// (where the handle ends) => the handle
const HANDLES = [
  ['', (y) => path([0, -6], [0, y])],
  ['bands', (y) => `${path([0, -6], [0, y])} ${path([-0.8, -0.4], [0.8, -0.4])} ${path([-0.8, -1.6], [0.8, -1.6])}`],
  ['wrapped grip', (y) => `${path([0, -6], [0, y])} ${[-3, -4, -5].map((height) => path([-0.8, height], [0.8, height])).join(' ')}`],
  ['strap loop', (y) => `${path([0, -6], [0, y])} ${bow([0, -5.2], [0, -3], -1)}`],
  ['thick handle', (y) => `${path([0, -6], [0, -5.3])} ${box(-0.6, -5.3, 0.6, -1.6)} ${path([0, -1.6], [0, y])}`],
];

// (the top of the head) => what else there is
const AXE_EXTRAS = [
  ['', () => ''],
  ['spike', (top) => path([0, top], [0, top + 1.9])],
  ['ball top', (top) => ball([0, top], [0, top + 1.4], 0.8)],
  ['ribbon', () => wavy([0, 2.2], [-2.6, 0.2], 2, 0.3)],
  ['pennant flag', () => closed([0, 2.6], [-2.6, 1.8], [0, 1])],
  ['sparkle', () => sparkle(-4.4, 8.6, 0.8)],
  ['swing lines', () => `${bow([-4, 9], [-6, 5.6], 0.25)} ${bow([-5.2, 10], [-7.4, 6.4], 0.25)}`],
  ['diamond top', (top) => diamond(0, top + 1, 0.8, 1)],
];

const axes = family({
  cat: 'items', count: 280, spacing: 0.1, turn: -45, sizes: [AXE_HEADS.length, HANDLES.length, AXE_EXTRAS.length, ENDS.length], first: [0, 0, 1, 2],
  make: ([head, handle, extra, end], k) => {
    const [name, more, top, from, peak] = AXE_HEADS[head];
    const n = Math.floor((k - 1) / AXE_HEADS.length) + 1;
    return {
      id: `${name.toLowerCase().replace(/ /g, '-')}-${n}`, name: `${name} ${n}`, sub: 'Axes and hammers',
      tags: words('weapon tool fight', more, HANDLES[handle][0], AXE_EXTRAS[extra][0]),
      draw: () => [top, HANDLES[handle][1](from), AXE_EXTRAS[extra][1](peak), ENDS[end](-6)].join(' '),
    };
  },
});

// ---------------------------------------------------------------- crowns
//
// The points stand on a band whose top is at the height -2.
// [search words, the outline from the left end of the band over the points to its right end, half the width of the band, the tips]

const POINTS = [
  ['three points', path([-5, -2], [-5, 3.6], [-2.5, 0.6], [0, 4.6], [2.5, 0.6], [5, 3.6], [5, -2]), 5, [[-5, 3.6], [0, 4.6], [5, 3.6]]],
  ['five points', path([-5, -2], [-5, 3.2], [-3.6, 0.8], [-2.3, 3.8], [-1.1, 0.8], [0, 4.6], [1.1, 0.8], [2.3, 3.8], [3.6, 0.8], [5, 3.2], [5, -2]), 5, [[-5, 3.2], [-2.3, 3.8], [0, 4.6], [2.3, 3.8], [5, 3.2]]],
  ['battlements castle', path([-5, -2], [-5, 3], [-3, 3], [-3, 1.2], [-1, 1.2], [-1, 3], [1, 3], [1, 1.2], [3, 1.2], [3, 3], [5, 3], [5, -2]), 5, [[-4, 3], [0, 3], [4, 3]]],
  ['round lobes', `M-5,-2 L-5,1.4 ${bowTo([-1.67, 1.4], 0.9)} ${bowTo([1.67, 1.4], 0.9)} ${bowTo([5, 1.4], 0.9)} L5,-2`, 5, [[-3.33, 2.9], [0, 2.9], [3.33, 2.9]]],
  ['flared', path([-4, -2], [-5.6, 3.6], [-2.6, 1], [0, 4.6], [2.6, 1], [5.6, 3.6], [4, -2]), 4, [[-5.6, 3.6], [0, 4.6], [5.6, 3.6]]],
  ['tall middle king', path([-5, -2], [-5, 2.4], [-2.8, 0.8], [0, 6], [2.8, 0.8], [5, 2.4], [5, -2]), 5, [[-5, 2.4], [0, 6], [5, 2.4]]],
  ['tiara princess', 'M-5,-2 Q-4,2.4 0,4.6 Q4,2.4 5,-2', 5, [[0, 4.6]]],
  ['spikes', path([-5, -2], ...zigzag([-5, 0.6], [5, 0.6], 5, 3.4), [5, -2]), 5, [[-4, 4], [-2, 4], [0, 4], [2, 4], [4, 4]]],
  ['dome', `M-5,-2 L-5,1 ${bowTo([5, 1], 0.7)} L5,-2`, 5, [[0, 4.5]]],
];

// (half the width) => the band
const BANDS = [
  ['', (w) => box(-w, -3.6, w, -2)],
  ['jewel band', (w) => `${box(-w, -3.6, w, -2)} ${dot(0, -2.8)} ${dot(w / 2, -2.8)} ${dot(-w / 2, -2.8)}`],
  ['fur band', (w) => roundedBox(0, -2.9, w + 0.9, 0.9, 0.9)],
  ['thin', (w) => path([-w, -2], [w, -2])],
  ['double band', (w) => `${box(-w, -3.2, w, -2)} ${path([0.9 - w, -4.2], [w - 0.9, -4.2])}`],
];

// (tips) => jewels
const JEWELS = [
  ['', () => ''],
  ['pearls', (tips) => tips.map(([x, y]) => ball([x, y], [x, y + 1.1], 0.6)).join(' ')],
  ['diamond', () => diamond(0, -0.6, 0.8)],
  ['three jewels', () => `${dot(0, -0.6)} ${dot(2.6, -0.6)} ${dot(-2.6, -0.6)}`],
  ['heart', () => heart(0, -0.5, 0.85)],
  ['cross', (tips) => {
    const [x, y] = tips[tips.length >> 1];
    return `${path([x, y], [x, y + 2.4])} ${path([x - 0.9, y + 1.5], [x + 0.9, y + 1.5])}`;
  }],
  ['zigzag', () => path(...zigzag([-3, -1.2], [3, -1.2], 4, 0.9))],
];

const CROWN_EXTRAS = [
  ['', ''],
  ['sparkles', `${sparkle(6.8, 6.4)} ${sparkle(-6.8, 6.4)}`],
  ['shining', sparkle(6.9, 6.2, 1)],
  ['cushion pillow', roundedBox(0, -6.2, 5.4, 1, 1)],
  ['rays', mirrored([path([6.6, 1.2], [8, 1.6]), path([6.6, 0], [8.2, 0]), path([6.6, -1.2], [8, -1.6])], [])],
  ['stars', `${star(3.8, 7.4, 5, 1.2, 0.5)} ${star(-3.8, 7.4, 5, 1.2, 0.5)}`],
  ['underlined', bow([-4.6, -5.4], [4.6, -5.4], -0.25)],
  ['twinkle', mirrored([dot(7, 2.6), dot(6.8, -0.6)], [])],
];

const crowns = family({
  cat: 'items', count: 280, spacing: 0.1, sizes: [POINTS.length, BANDS.length, JEWELS.length, CROWN_EXTRAS.length], first: [0, 0, 1, 0],
  make: ([points, band, jewel, extra], k) => ({
    id: `crown-${k}`, name: `Crown ${k}`, sub: 'Crowns',
    tags: words('king queen royal prince gold', POINTS[points][0], BANDS[band][0], JEWELS[jewel][0], CROWN_EXTRAS[extra][0]),
    draw: () => {
      const [, line, wide, tips] = POINTS[points];
      return joined(line, BANDS[band][1](wide), JEWELS[jewel][1](tips), CROWN_EXTRAS[extra][1]);
    },
  }),
});

export const ITEM_SHAPES = [...swords, ...potions, ...keys, ...shields, ...gems, ...wands, ...axes, ...crowns];
export const ITEM_HEADINGS = ['Swords', 'Potions', 'Keys', 'Shields', 'Gems', 'Wands and staffs', 'Axes and hammers', 'Crowns'];
