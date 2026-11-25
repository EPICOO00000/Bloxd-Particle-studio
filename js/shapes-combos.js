// Combos: one little picture many times, set out in a formation. "Ring of
// hearts", "Spiral of stars", "Sphere of skulls", "Heart made of stars".
//
// A little picture (MINIS) is drawn once, in the drawing language of
// shape-kit.js. A formation says where its copies stand, how big each one is
// and which way it faces. Every formation is made for every little picture,
// so a new picture is one line in MINIS and a new formation one entry in
// FLAT or SOLID.

import {
  parsePath, fitDrawing, drawingNet, spreadPoints, apportion, resample, scallop, P, RAD, TAU, around,
} from './shape-kit.js';

// ---------------------------------------------------------------- the little pictures

const polygon = (k, r, first = 90) => `M${Array.from({ length: k }, (_, i) => around(0, 0, r, first + (360 * i) / k)).join(' L')} Z`;
const star = (k, out, inn) => `M${Array.from({ length: 2 * k }, (_, i) => around(0, 0, i % 2 ? inn : out, 90 + (180 * i) / k)).join(' L')} Z`;
const rays = (k, from, to) => Array.from({ length: k }, (_, i) => `M${around(0, 0, from, (360 * i) / k)} L${around(0, 0, to, (360 * i) / k)}`).join(' ');

// [part of the id, one of them, many of them, the drawing, particles a copy needs to be read, extra search words, 'round' = it nests inside itself]
const MINIS = [
  ['hearts', 'heart', 'hearts', 'M0,-4.5 C-2,-2.5 -4.8,-0.5 -4.8,2 C-4.8,3.8 -3.5,4.8 -2.3,4.8 C-1.1,4.8 0,3.9 0,2.6 C0,3.9 1.1,4.8 2.3,4.8 C3.5,4.8 4.8,3.8 4.8,2 C4.8,-0.5 2,-2.5 0,-4.5', 12, 'love valentine', 'round'],
  ['stars', 'star', 'stars', star(5, 5, 2.1), 10, 'night sky award', 'round'],
  ['diamonds', 'diamond', 'diamonds', 'M0,5 L3.6,0 L0,-5 L-3.6,0 Z', 8, 'rhombus cards', 'round'],
  ['triangles', 'triangle', 'triangles', polygon(3, 5), 6, 'three corners', 'round'],
  ['squares', 'square', 'squares', 'M-4.5,-4.5 L4.5,-4.5 L4.5,4.5 L-4.5,4.5 Z', 8, 'boxes blocks', 'round'],
  ['circles', 'circle', 'circles', 'O0,0 5', 8, 'rings rounds dots', 'round'],
  ['hexagons', 'hexagon', 'hexagons', polygon(6, 5), 12, 'six sides honeycomb', 'round'],
  ['pluses', 'plus', 'pluses', 'M-5,0 L5,0 M0,-5 L0,5', 9, 'plus sign add heal health'],
  ['crosses', 'cross', 'crosses', 'M-4,-4 L4,4 M-4,4 L4,-4', 9, 'x marks wrong no'],
  ['ticks', 'tick', 'ticks', 'M-4.5,0 L-1.5,-3.5 L4.5,4', 6, 'check marks right yes done'],
  ['moons', 'moon', 'moons', 'A0,0 5 50 310 A3,0 3.836 273.1 86.9', 12, 'crescent night'],
  ['suns', 'sun', 'suns', `O0,0 2.6 ${rays(8, 3.7, 5)}`, 24, 'sunshine day summer'],
  ['clouds', 'cloud', 'clouds', 'M-3.6,-2.4 L3.6,-2.4 B4.4,0.2 0.85 B0.8,2.2 0.8 B-2.8,1.2 0.8 B-3.6,-2.4 0.85', 14, 'sky weather'],
  ['drops', 'drop', 'drops', 'M0,5 C-1,3 -3.4,0 -3.4,-1.8 A0,-1.8 3.4 180 360 C3.4,0 1,3 0,5', 10, 'water rain tears', 'round'],
  ['flames', 'flame', 'flames', 'M0.6,5 C-1,3.4 -3.4,1 -3.4,-1.6 A0,-1.6 3.4 180 360 C3.4,0 2.4,1 1.6,1.6 C1.8,3 1.4,4.2 0.6,5', 12, 'fire burn hot'],
  ['snowflakes', 'snowflake', 'snowflakes', 'M-5,0 L5,0 M-2.5,-4.33 L2.5,4.33 M-2.5,4.33 L2.5,-4.33', 13, 'snow winter ice cold frost'],
  ['bolts', 'lightning bolt', 'lightning bolts', 'M1,5 L-3,-0.5 L0,-0.5 L-1,-5 L3,0.5 L0,0.5 Z', 12, 'thunder electric zap energy flash'],
  ['leaves', 'leaf', 'leaves', 'M0,-5 C-4,-2 -4,3 0,5 C4,3 4,-2 0,-5 M0,-5 L0,2.6', 13, 'plant autumn green', 'round'],
  ['flowers', 'flower', 'flowers', `${scallop(0, 0, 3.6, 5, 1)} O0,0 1.3`, 22, 'bloom daisy spring garden'],
  ['trees', 'tree', 'trees', 'M0,5 L-4,-2 L4,-2 Z M0,-2 L0,-5', 10, 'pine fir forest christmas'],
  ['mushrooms', 'mushroom', 'mushrooms', 'M-5,0 A0,0 5 180 0 Z M-1.5,0 L-1.5,-4.5 L1.5,-4.5 L1.5,0', 16, 'toadstool fungus'],
  ['notes', 'music note', 'music notes', 'O-1.6,-3.4 1.6 M0,-3.4 L0,5 L3,3.5', 11, 'song melody sound'],
  ['arrows', 'arrow', 'arrows', 'M0,5 L-3.5,1.2 M0,5 L3.5,1.2 M0,5 L0,-5', 9, 'pointer direction way up'],
  ['sparkles', 'sparkle', 'sparkles', 'M0,5 Q0.8,0.8 5,0 Q0.8,-0.8 0,-5 Q-0.8,-0.8 -5,0 Q-0.8,0.8 0,5', 12, 'twinkle shine glitter magic', 'round'],
  ['bubbles', 'bubble', 'bubbles', 'O0,0 5 A0,0 3.3 110 165', 12, 'soap water foam'],
  ['rings', 'ring', 'rings', 'O0,0 5 O0,0 2.7', 18, 'donut hoops targets', 'round'],
  ['gems', 'gem', 'gems', 'M-2.5,4 L2.5,4 L5,1 L0,-5 L-5,1 Z M-5,1 L5,1', 13, 'jewels diamonds crystals treasure', 'round'],
  ['coins', 'coin', 'coins', 'O0,0 5 M0,2.6 L0,-2.6', 13, 'money gold cash reward'],
  ['crowns', 'crown', 'crowns', 'M-4.5,-3 L-4.5,2.5 L-2.2,0 L0,3.5 L2.2,0 L4.5,2.5 L4.5,-3 Z', 12, 'king queen royal winner'],
  ['shields', 'shield', 'shields', 'M-4,4.5 L4,4.5 L4,0 Q4,-3.4 0,-5 Q-4,-3.4 -4,0 Z', 12, 'armor defend guard protect', 'round'],
  ['swords', 'sword', 'swords', 'M0,5 L0,-2.5 M-2.5,-2.5 L2.5,-2.5 M0,-2.5 L0,-5', 10, 'blades daggers fight knight'],
  ['skulls', 'skull', 'skulls', 'M-2.05,-2 A0,1.2 3.8 237.4 -57.4 L2.05,-4.6 L-2.05,-4.6 Z D-1.4,1.4 D1.4,1.4', 16, 'death danger pirate bones poison'],
  ['ghosts', 'ghost', 'ghosts', 'M-3.5,-4.5 L-3.5,1.2 A0,1.2 3.5 180 0 L3.5,-4.5 L1.75,-3 L0,-4.5 L-1.75,-3 Z D-1.3,1.6 D1.3,1.6', 18, 'spooky halloween boo'],
  ['eyes', 'eye', 'eyes', 'M-5,0 Q0,4.4 5,0 Q0,-4.4 -5,0 O0,0 1.5', 16, 'look see watch'],
  ['smileys', 'smiley', 'smileys', 'O0,0 5 D-1.7,1.5 D1.7,1.5 A0,0 2.8 215 325', 18, 'happy faces smiles emoji'],
  ['fish', 'fish', 'fish', 'M-4.5,0 C-2.5,3.4 1.5,3.4 3,0 C1.5,-3.4 -2.5,-3.4 -4.5,0 M3,0 L5,2.2 L5,-2.2 Z D-2.6,0.6', 16, 'sea ocean swim school'],
  ['birds', 'bird', 'birds', 'M-5,1.5 C-3.5,3.5 -1.5,3 0,0.5 C1.5,3 3.5,3.5 5,1.5', 9, 'seagulls flying flock sky'],
  ['butterflies', 'butterfly', 'butterflies', 'M0,0 C-2,4.5 -5.5,4.5 -5,1.5 C-4.8,0.3 -2.5,0 0,0 C-2.5,0 -4.6,-1 -4,-3 C-3.4,-4.8 -1,-3.5 0,0 |', 22, 'insects wings spring'],
  ['paws', 'paw print', 'paw prints', 'O0,-1.6 2.2 O-3.2,1.2 1 O-1.1,3.5 1 O1.1,3.5 1 O3.2,1.2 1', 22, 'animal cat dog tracks'],
  ['balloons', 'balloon', 'balloons', 'E0,1.2 3.4,3.8 -90 270 M0,-2.6 L0,-5', 12, 'party birthday celebrate'],
  ['houses', 'house', 'houses', 'M-4,-5 L-4,0 L0,4.5 L4,0 L4,-5 Z', 10, 'homes village huts', 'round'],
  ['flags', 'flag', 'flags', 'M-3,-5 L-3,5 L4,2.5 L-3,0', 9, 'banners pennants goal'],
  ['rockets', 'rocket', 'rockets', 'M0,5 C3,2 3,-2 2,-3.5 L-2,-3.5 C-3,-2 -3,2 0,5 M-2,-3.5 L-3.6,-5 M2,-3.5 L3.6,-5', 16, 'space ships launch'],
  ['trophies', 'trophy', 'trophies', 'M-3,4.5 L3,4.5 L3,1.6 A0,1.6 3 0 -180 L-3,4.5 M0,-1.4 L0,-4.5 M-2.4,-4.5 L2.4,-4.5', 18, 'cups prizes winners'],
  // added for the seasons and the holidays: Halloween, Christmas, Easter, a birthday
  ['clovers', 'clover', 'clovers', `${scallop(0, 0.6, 3.3, 4, 1)} M0,-2.7 Q0.4,-4.2 1.6,-5`, 18, 'four-leaf lucky shamrock irish'],
  ['bats', 'bat', 'bats', 'M0,1.5 L1,3 L1.6,1.6 C2.6,2.6 4.2,2.6 5,1.4 C4.6,0 4.4,-1.2 4.6,-2.2 C3.8,-1.6 3,-1.6 2.4,-2.4 C1.8,-1.6 0.8,-2 0,-3.2 |', 22, 'halloween night vampire wings'],
  ['pumpkins', 'pumpkin', 'pumpkins', 'E0,-0.9 4.6,3.6 270 630 M0.1,3.5 Q0.3,4.4 1.3,5 D-1.6,-0.1 D1.6,-0.1 A0,-0.9 2.4 215 325', 18, 'halloween jack lantern autumn'],
  ['keys', 'key', 'keys', 'E-2.8,0 2.2,2.2 180 540 M-0.6,0 L5,0 L5,-1.9 M3.2,0 L3.2,-1.9', 13, 'unlock door secret treasure'],
  ['bells', 'bell', 'bells', 'M-4,-3 L4,-3 Q3,-2 3,1 A0,1 3 0 180 Q-3,-2 -4,-3 O0,-4.2 0.8', 15, 'ring christmas alarm jingle'],
  ['anchors', 'anchor', 'anchors', 'M0,3 L0,-5.5 M-2,1.8 L2,1.8 O0,4 1 M-4,-1.5 A0,-1.5 4 180 360', 16, 'ship sea sailor pirate harbour'],
  ['apples', 'apple', 'apples', 'M0,2.6 C-1.6,4 -4.6,3.2 -4.6,0 C-4.6,-3 -2.4,-5 0,-4 C2.4,-5 4.6,-3 4.6,0 C4.6,3.2 1.6,4 0,2.6 M0,2.6 Q0.2,4.2 1.4,5', 14, 'fruit food healthy teacher'],
  ['candies', 'sweet', 'sweets', 'O0,0 2.6 M-2.6,0 L-5,1.8 L-5,-1.8 Z M2.6,0 L5,1.8 L5,-1.8 Z', 16, 'candy candies bonbon treat sugar halloween'],
  ['eggs', 'egg', 'eggs', 'M0,5 C-2.6,5 -4,1.4 -4,-1 A0,-1 4 180 360 C4,1.4 2.6,5 0,5', 10, 'easter chick hatch', 'round'],
  ['locks', 'padlock', 'padlocks', 'M-3.6,-4.6 L3.6,-4.6 L3.6,0.6 L-3.6,0.6 Z M-2.2,0.6 L-2.2,2.4 A0,2.4 2.2 180 0 L2.2,0.6 D0,-2', 14, 'locked closed safe secure'],
  ['bombs', 'bomb', 'bombs', 'E-0.6,-1 3.8,3.8 270 630 M1.94,1.82 L3.2,3.2 Q3.6,4.6 5,4.6', 12, 'explode tnt boom danger'],
  ['potions', 'potion', 'potions', 'M-1,5 L-1,2.16 A0,-1.4 3.7 105.7 434.3 L1,5 M-1.6,5 L1.6,5', 14, 'flask bottle magic brew elixir'],
  ['hats', 'witch hat', 'witch hats', 'M-5,-3.6 L5,-3.6 M-3,-3.6 L0.6,5 L3,-3.6', 9, 'wizard pointed halloween magic'],
  ['ices', 'ice cream', 'ice creams', 'M-2.6,0.4 L0,-5 L2.6,0.4 A0,0.6 2.61 -4.4 184.4', 12, 'cone summer dessert sweet'],
  ['umbrellas', 'umbrella', 'umbrellas', 'M-5,0 A0,0 5 180 0 Z M0,0 L0,-4 A-1,-4 1 0 -180', 14, 'rain parasol weather'],
  ['cats', 'cat face', 'cat faces', 'O0,-0.8 3.8 M-3.3,1.1 L-3.8,4.6 L-1.2,2.8 M3.3,1.1 L3.8,4.6 L1.2,2.8 D-1.4,-0.4 D1.4,-0.4', 18, 'kitten pet kitty meow'],
  ['gifts', 'present', 'presents', 'M-4,-4.6 L4,-4.6 L4,0.8 L-4,0.8 Z M0,-4.6 L0,0.8 M0,0.8 L-2.6,3.4 L-3,1.4 Z M0,0.8 L2.6,3.4 L3,1.4 Z', 18, 'gift box christmas birthday surprise'],
  ['candles', 'candle', 'candles', 'M-1.6,-5 L1.6,-5 L1.6,1.4 L-1.6,1.4 Z M0,1.4 L0,2.6 C-1.4,3.6 -0.6,4.6 0,5.4 C0.6,4.6 1.4,3.6 0,2.6', 14, 'flame light birthday church'],
  ['snowmen', 'snowman', 'snowmen', 'O0,-2 3 O0,2.6 2 D-0.7,3 D0.7,3', 16, 'winter christmas frosty snow'],
  ['dice', 'dice', 'dice', 'M-4.5,-4.5 L4.5,-4.5 L4.5,4.5 L-4.5,4.5 Z D-2.2,2.2 D2.2,-2.2 D0,0 D-2.2,-2.2 D2.2,2.2', 13, 'die game luck roll five'],
  ['cactuses', 'cactus', 'cactuses', 'M-1.2,-5 L-1.2,3.4 A0,3.4 1.2 180 0 L1.2,-5 M-1.2,-0.6 L-3.4,-0.6 L-3.4,1.6 M1.2,0.6 L3.4,0.6 L3.4,2.8', 14, 'desert plant prickly western'],
  ['mountains', 'mountain', 'mountains', 'M-5,-3.4 L-1.4,3.4 L0.6,0 L2,2 L5,-3.4 Z', 8, 'peaks hills rocks alps'],
];

const lazy = (make) => {
  let value;
  return () => (value === undefined ? (value = make()) : value);
};

/**
 * A drawing as a little picture that can be put down many times: its corners,
 * the length of its lines (in the box from -1 to 1), and k particles of it.
 */
export function pictureOf(d) {
  const net = lazy(() => drawingNet(fitDrawing(typeof d === 'string' ? parsePath(d) : d)));
  return {
    corners: lazy(() => net().nodes.length),
    length: lazy(() => net().lens.reduce((sum, l) => sum + l, 0)),
    /** k particles of the picture in the box from -1 to 1; with fewer than it has corners, its first corners. */
    points: (k) => (k < net().nodes.length ? net().nodes.slice(0, Math.max(0, k)) : spreadPoints(net(), k)),
  };
}

export const minis = MINIS.map(([id, one, many, d, needs, tags, round]) => ({ id, one, many, needs, tags, round: round === 'round', ...pictureOf(d) }));

// ---------------------------------------------------------------- formations

const X = [1, 0, 0];
const Y = [0, 1, 0];
/** A copy standing in the flat picture: at x, y, this big, turned by so many degrees. */
const flat = (x, y, size, turn = 0) => {
  const c = Math.cos(turn * RAD);
  const s = Math.sin(turn * RAD);
  return { at: [x, y, 0], size, right: [c, s, 0], up: [-s, c, 0] };
};
/** A copy in space: `right` and `up` say which way the picture lies. */
const solid = (at, size, right, up) => ({ at, size, right, up });

const norm = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((c) => c / l);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Round a ring lying flat: a copy at this angle stands upright and faces outward. */
const facingOut = (angle, radius, y, size) => solid([radius * Math.cos(angle), y, radius * Math.sin(angle)], size, [Math.sin(angle), 0, -Math.cos(angle)], Y);

const PHI = (1 + Math.sqrt(5)) / 2;
const ICOSA = [[0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI], [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0], [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1]].map(norm);
const OCTA = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const ringSize = (m, most = 0.36) => Math.min(most, Math.sin(Math.PI / m) / (1.15 + Math.sin(Math.PI / m)));
const copies = (lo, hi, def) => P('copies', 'Copies', lo, hi, 1, def);

// Where the copies of a formation stand. [part of the id, name before "of ...", sliders, places(sliders, picture), search words, how many copies a picture
// that needs many particles gets at most (left out: as many as the slider says)]
const FLAT = [
  ['ring', 'Ring', [copies(3, 16, 8), P('out', 'Point outward', 0, 1, 1, 0)], (p) => {
    const size = ringSize(p.copies) / (p.out ? Math.SQRT2 : 1);
    const radius = 1 - size * (p.out ? Math.SQRT2 : 1);
    return Array.from({ length: p.copies }, (_, i) => {
      const a = 90 - (360 * i) / p.copies;
      return flat(radius * Math.cos(a * RAD), radius * Math.sin(a * RAD), size, p.out ? a - 90 : 0);
    });
  }, 'circle round wreath halo'],
  ['row', 'Row', [copies(2, 9, 5)], (p) => Array.from({ length: p.copies }, (_, i) => flat(-1 + (2 * i + 1) / p.copies, 0, Math.min(0.44, 0.88 / p.copies))), 'line side by side border'],
  ['column', 'Column', [copies(2, 9, 4)], (p) => Array.from({ length: p.copies }, (_, i) => flat(0, 1 - (2 * i + 1) / p.copies, Math.min(0.44, 0.88 / p.copies))), 'line stack upright tower'],
  ['arc', 'Arc', [copies(3, 11, 7)], (p) => {
    const size = Math.min(0.3, Math.sin(Math.PI / (2 * (p.copies - 1))) / (1.15 + Math.sin(Math.PI / (2 * (p.copies - 1)))));
    const radius = 1 - size;
    return Array.from({ length: p.copies }, (_, i) => {
      const a = 180 - (180 * i) / (p.copies - 1);
      return flat(radius * Math.cos(a * RAD), radius * Math.sin(a * RAD) - radius / 2, size);
    });
  }, 'bow rainbow arch bridge'],
  ['burst', 'Burst', [P('rays', 'Rays', 4, 8, 1, 6)], (p) => Array.from({ length: 2 * p.rays }, (_, i) => {
    const a = 90 - (360 * (i >> 1)) / p.rays;
    const [radius, size] = i % 2 ? [0.72, 0.19] : [0.3, 0.1];
    return flat(radius * Math.cos(a * RAD), radius * Math.sin(a * RAD), size, a - 90);
  }), 'explosion star shine pop'],
  ['spiral', 'Spiral', [copies(6, 12, 9)], (p) => Array.from({ length: p.copies }, (_, i) => {
    const t = i / (p.copies - 1);
    const a = 90 + 540 * t;
    const radius = 0.12 + 0.62 * t;
    return flat(radius * Math.cos(a * RAD), radius * Math.sin(a * RAD), 0.07 + 0.17 * t);
  }), 'swirl whirl growing'],
  ['grid', 'Grid', [P('across', 'Across', 2, 4, 1, 3)], (p) => Array.from({ length: p.across * p.across }, (_, i) => flat(
    -1 + (2 * (i % p.across) + 1) / p.across, 1 - (2 * Math.floor(i / p.across) + 1) / p.across, 0.82 / p.across,
  )), 'square pattern tiles wall', 9],
  ['cross', 'Cross', null, () => [flat(0, 0, 0.3), flat(0, 0.64, 0.3), flat(0.64, 0, 0.3), flat(0, -0.64, 0.3), flat(-0.64, 0, 0.3)], 'plus five'],
  ['pyramid', 'Pyramid', null, () => [flat(0, 0.64, 0.3), flat(-0.32, 0, 0.3), flat(0.32, 0, 0.3), flat(-0.64, -0.64, 0.3), flat(0, -0.64, 0.3), flat(0.64, -0.64, 0.3)], 'triangle pile heap six'],
  ['flock', 'Flock', null, () => [flat(0, 0.52, 0.24), flat(-0.36, 0, 0.24), flat(0.36, 0, 0.24), flat(-0.72, -0.52, 0.24), flat(0.72, -0.52, 0.24)], 'v formation flying wedge five'],
  ['wave', 'Wave', [copies(4, 9, 6)], (p) => Array.from({ length: p.copies }, (_, i) => flat(
    -1 + (2 * i + 1) / p.copies, 0.5 * Math.sin((TAU * i) / (p.copies - 1)), Math.min(0.3, 0.88 / p.copies),
  )), 'sine up and down ripple'],
  ['scatter', 'Scatter', null, () => [
    flat(-0.62, 0.55, 0.24, -15), flat(0.1, 0.68, 0.18, 10), flat(0.66, 0.42, 0.23, 20), flat(-0.2, 0.08, 0.2, -8),
    flat(0.34, -0.2, 0.16, 25), flat(-0.66, -0.45, 0.22, 12), flat(0.6, -0.66, 0.23, -20), flat(-0.08, -0.7, 0.17, 5),
  ], 'confetti random sprinkle shower'],
  ['trail', 'Trail', null, () => [flat(-0.89, -0.89, 0.08), flat(-0.66, -0.66, 0.12), flat(-0.35, -0.35, 0.16), flat(0.06, 0.06, 0.22), flat(0.63, 0.63, 0.32)], 'comet tail growing fading path'],
  ['pair', 'Pair', null, () => [flat(-0.5, 0, 0.46), flat(0.5, 0, 0.46)], 'two twins double couple'],
  ['trio', 'Trio', null, () => [flat(0, 0.5, 0.42), flat(-0.5, -0.42, 0.42), flat(0.5, -0.42, 0.42)], 'three triple triangle'],
];

const SOLID = [
  ['halo', 'Halo', [copies(3, 14, 8)], (p) => {
    const size = Math.min(0.34, 0.9 * Math.tan(Math.PI / p.copies) * 0.85);
    return Array.from({ length: p.copies }, (_, i) => facingOut((TAU * i) / p.copies, 0.9, 0, size));
  }, 'ring around aura crown carousel'],
  ['sphere', 'Sphere', null, (p, mini) => (mini.needs > 16 ? OCTA : ICOSA).map((dir) => {
    const flatUp = Math.abs(dir[1]) > 0.99; // at a pole the picture lies flat
    const up = norm(flatUp ? [0, 0, -dir[1]] : [-dir[0] * dir[1], 1 - dir[1] * dir[1], -dir[2] * dir[1]]);
    return solid(dir.map((c) => c * 0.86), mini.needs > 16 ? 0.4 : 0.3, norm(cross(up, dir)), up);
  }), 'ball globe planet all around'],
  ['helix', 'Helix', [copies(6, 14, 10)], (p) => Array.from({ length: p.copies }, (_, i) => facingOut((TAU * 2 * i) / p.copies, 0.78, -0.75 + (1.5 * i) / (p.copies - 1), 0.22)), 'spiral staircase rising twist coil'],
  ['tornado', 'Tornado', [copies(6, 14, 10)], (p) => Array.from({ length: p.copies }, (_, i) => {
    const t = i / (p.copies - 1);
    return facingOut(TAU * 2.5 * t, 0.25 + 0.55 * t, -0.86 + 1.62 * t, 0.1 + 0.14 * t);
  }), 'twister whirlwind funnel storm'],
  ['tower', 'Tower', [P('levels', 'Levels', 2, 4, 1, 3)], (p) => Array.from({ length: 4 * p.levels }, (_, i) => {
    const level = Math.floor(i / 4);
    const size = Math.min(0.3, 0.92 / p.levels);
    return facingOut((TAU * (i % 4)) / 4 + (level % 2 ? Math.PI / 4 : 0), 0.7, p.levels === 1 ? 0 : -1 + size + ((2 - 2 * size) * level) / (p.levels - 1), size);
  }), 'stack levels rings pillar', 8],
  ['cube', 'Cube', null, () => Array.from({ length: 8 }, (_, i) => solid([i & 1 ? 0.62 : -0.62, i & 2 ? 0.62 : -0.62, i & 4 ? 0.62 : -0.62], 0.3, X, Y)), 'box corners eight'],
  ['burst3d', 'Star burst', null, () => OCTA.map((dir) => solid(dir.map((c) => c * 0.64), 0.28, Math.abs(dir[0]) > 0.9 ? [0, 0, 1] : X, dir)), 'explosion six directions rays space'],
  ['tunnel', 'Tunnel', [copies(3, 7, 5)], (p) => Array.from({ length: p.copies }, (_, i) => {
    const t = i / (p.copies - 1);
    return solid([0, 0, 0.85 - 1.7 * t], 0.95 - 0.6 * t, X, Y);
  }), 'depth one behind the other gate portal'],
  ['twist', 'Twisting column', [copies(3, 8, 5)], (p) => Array.from({ length: p.copies }, (_, i) => {
    const turn = (Math.PI * i) / p.copies;
    return solid([0, 1 - (2 * i + 1) / p.copies, 0], Math.min(0.4, 0.86 / p.copies), [Math.cos(turn), 0, Math.sin(turn)], Y);
  }), 'stack turning spinning totem'],
  ['fountain', 'Fountain', null, () => Array.from({ length: 12 }, (_, i) => {
    const t = [0.35, 0.65, 0.95][i % 3];
    const a = (TAU * Math.floor(i / 3)) / 4;
    return facingOut(a, 0.8 * t, -0.75 + 1.5 * Math.sin(Math.PI * 0.9 * t), 0.1 + 0.12 * t);
  }), 'spray jets falling arcs', 8],
];

// ---------------------------------------------------------------- putting the copies down

/** n particles on the copies of a formation: the bigger a copy, the more it gets, and every copy keeps its corners while there are enough. */
function onPlaces(mini, places, n) {
  const corners = mini.corners();
  const each = Math.floor(n / places.length);
  let counts;
  if (each < corners) counts = apportion(places.map(() => 1), n);
  else counts = apportion(places.map((place) => place.size), n - corners * places.length).map((extra) => corners + extra);
  const out = [];
  places.forEach(({ at, size, right, up }, i) => {
    for (const [x, y] of mini.points(counts[i])) {
      out.push([at[0] + size * (x * right[0] + y * up[0]), at[1] + size * (x * right[1] + y * up[1]), at[2] + size * (x * right[2] + y * up[2])]);
    }
  });
  return out;
}

/** How many particles a formation gets when it is added: what a copy needs to be read, and more for a big copy. */
const wanted = (mini, places) => Math.round(places.reduce((sum, place) => sum + mini.needs * Math.max(1, place.size / 0.25), 0));

const defaults = (params) => Object.fromEntries((params || []).map((p) => [p.key, p.default]));
/** The sliders count in whole steps: whatever comes in is rounded. */
const whole = (p) => Object.fromEntries(Object.entries(p || {}).map(([key, value]) => [key, Math.round(value)]));

function formation(mini, group, [id, name, params, placesOf, words, most]) {
  // a picture that needs many particles stands in fewer copies, so that every copy can be read
  const sliders = params && params.map((p) => {
    if (p.key !== 'copies') return p;
    const room = Math.max(p.min, Math.min(p.max, Math.floor(280 / mini.needs)));
    return { ...p, default: Math.min(p.default, room) };
  });
  const places = placesOf(defaults(sliders), mini);
  const usual = places.length;
  const shape = {
    id: `${id}-of-${mini.id}`, name: `${name} of ${mini.many}`, cat: 'combos', sub: mini.many[0].toUpperCase() + mini.many.slice(1), group,
    count: Math.max(12, Math.min(300, wanted(mini, places))),
    tags: `${mini.one} ${mini.many} ${mini.tags} ${words} formation many several copies`,
    gen: group === 'flat'
      ? (n, p) => onPlaces(mini, placesOf(whole(p), mini), n).map(([x, y]) => [x, y, 0])
      : (n, p) => onPlaces(mini, placesOf(whole(p), mini), n),
  };
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => Math.min(shape.count, usual * Math.min(mini.corners(), mini.needs)) });
  if (sliders) shape.params = sliders;
  return most && wanted(mini, places) > 300 ? null : shape;
}

// Copies of one size, one inside the other: only for pictures that fit inside themselves.
function nested(mini) {
  const sizes = [0.97, 0.64, 0.31];
  const shape = {
    id: `nested-${mini.id}`, name: `${mini.many[0].toUpperCase()}${mini.many.slice(1)} in ${mini.many}`, cat: 'combos', sub: mini.many[0].toUpperCase() + mini.many.slice(1), group: 'flat',
    count: Math.max(30, Math.min(300, wanted(mini, sizes.map((size) => flat(0, 0, size))))),
    tags: `${mini.one} ${mini.many} ${mini.tags} nested inside one in the other target rings formation`,
    gen: (n) => onPlaces(mini, sizes.map((size) => flat(0, 0, size)), n).map(([x, y]) => [x, y, 0]),
  };
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => Math.min(shape.count, 3 * mini.corners()) });
  return shape;
}

// One big copy with small ones around it.
function withLittle(mini) {
  const places = [flat(0, 0, 0.44), ...Array.from({ length: 6 }, (_, i) => flat(0.8 * Math.cos((90 + 60 * i) * RAD), 0.8 * Math.sin((90 + 60 * i) * RAD), 0.16))];
  const shape = {
    id: `big-and-little-${mini.id}`, name: `Big ${mini.one} with little ${mini.many}`, cat: 'combos', sub: mini.many[0].toUpperCase() + mini.many.slice(1), group: 'flat',
    count: Math.max(40, Math.min(300, wanted(mini, places))),
    tags: `${mini.one} ${mini.many} ${mini.tags} big small around planet moons mother children formation`,
    gen: (n) => onPlaces(mini, places, n).map(([x, y]) => [x, y, 0]),
  };
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => Math.min(shape.count, 7 * mini.corners()) });
  return shape;
}

// ---------------------------------------------------------------- a big picture made of little ones

// The line the little pictures stand on: [part of the id, how the name starts, the drawing, search words]
const OUTLINES = [
  ['heart', 'Heart', MINIS[0][3], 'love valentine'],
  ['star', 'Star', star(5, 5, 2.2), 'award night'],
  ['circle', 'Circle', 'O0,0 5', 'ring round wreath'],
  ['square', 'Square', 'M-4.6,-4.6 L4.6,-4.6 L4.6,4.6 L-4.6,4.6 Z', 'frame box border'],
  ['triangle', 'Triangle', polygon(3, 5), 'three corners'],
  ['diamond', 'Diamond', 'M0,5 L4,0 L0,-5 L-4,0 Z', 'rhombus'],
  ['moon', 'Moon', 'A0,0 5 50 310 A3,0 3.836 273.1 86.9', 'crescent night'],
  ['plus', 'Plus', 'M-1.6,5 L1.6,5 L1.6,1.6 L5,1.6 L5,-1.6 L1.6,-1.6 L1.6,-5 L-1.6,-5 L-1.6,-1.6 L-5,-1.6 L-5,1.6 L-1.6,1.6 Z', 'cross health add'],
  ['hexagon', 'Hexagon', polygon(6, 5), 'six sides'],
];
const BUILDERS = ['hearts', 'stars', 'diamonds', 'triangles', 'squares', 'circles', 'pluses', 'drops', 'sparkles', 'leaves', 'moons', 'bolts', 'notes', 'snowflakes',
  'hexagons', 'crosses', 'flames', 'arrows', 'bubbles', 'eggs', 'gems', 'ticks'];

function madeOf([id, name, d, words], mini) {
  const line = lazy(() => {
    const { polys } = fitDrawing(parsePath(d));
    return polys.length === 1 ? polys[0] : polys.flat();
  });
  const places = (p) => {
    const length = line().slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - line()[i][0], point[1] - line()[i][1]), 0) * 0.84;
    const size = Math.min(0.16, length / p.copies / 2.3);
    // (the line is closed: its last point is its first, so the copies go once round)
    return resample(line().slice(0, -1).map(([x, y]) => [x * 0.84, y * 0.84, 0]), p.copies, true).map(([x, y]) => flat(x, y, size));
  };
  const sliders = [copies(8, 24, Math.max(8, Math.min(16, Math.floor(290 / mini.needs))))];
  const shape = {
    id: `${id}-made-of-${mini.id}`, name: `${name} made of ${mini.many}`, cat: 'combos', sub: 'Made of little shapes', group: 'flat', params: sliders,
    count: Math.max(40, Math.min(300, sliders[0].default * mini.needs)),
    tags: `${name.toLowerCase()} ${words} ${mini.one} ${mini.many} ${mini.tags} outline built from formation`,
    gen: (n, p) => onPlaces(mini, places(whole(p)), n).map(([x, y]) => [x, y, 0]),
  };
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => Math.min(shape.count, sliders[0].default * mini.corners()) });
  return shape;
}

// ---------------------------------------------------------------- the shapes

// These were in the library before, in other tabs (Basic and Effects): they are not made a second time.
const THERE = new Set(['nested-hearts', 'nested-stars', 'ring-of-circles', 'ring-of-stars', 'ring-of-swords', 'flock-of-birds']);

const byMini = minis.flatMap((mini) => [
  ...FLAT.map((entry) => formation(mini, 'flat', entry)),
  ...(mini.round ? [nested(mini)] : []),
  withLittle(mini),
  ...SOLID.map((entry) => formation(mini, 'solid', entry)),
].filter((shape) => shape && !THERE.has(shape.id)));

const built = OUTLINES.flatMap((outline) => BUILDERS.map((id) => madeOf(outline, minis.find((mini) => mini.id === id))));

/** The headings of the Combos tab: one for every little picture, then the big pictures made of little ones. */
export const COMBO_HEADINGS = [...minis.map((mini) => mini.many[0].toUpperCase() + mini.many.slice(1)), 'Made of little shapes'];

export const COMBO_SHAPES = [...byMini, ...built];
