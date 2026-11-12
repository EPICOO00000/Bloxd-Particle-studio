// Pictures drawn with strokes: symbols, nature and things. Each one is a short
// drawing in the language described in shape-kit.js ("drawings"), in whatever
// units suit the picture — it is centred and scaled to fit by itself.

import { P, RAD, drawnShape, parsePath, placeDrawing, joinDrawings } from './shape-kit.js';

/** A drawing repeated `times` around the middle, the first copy turned by `first` degrees. */
const spin = (d, times, first = 0) => joinDrawings(
  ...Array.from({ length: times }, (_, i) => placeDrawing(parsePath(d), { turn: first + (360 * i) / times })),
);

const fix = (v) => Number(v.toFixed(4));
const around = (cx, cy, r, deg) => `${fix(cx + r * Math.cos(deg * RAD))},${fix(cy + r * Math.sin(deg * RAD))}`;

/** A closed ring of `k` arcs (bulge 1 = half circles), like the edge of a flower. */
function scallop(cx, cy, r, k, bulge) {
  let d = `M${around(cx, cy, r, 90)}`;
  for (let i = 1; i <= k; i++) d += ` B${around(cx, cy, r, 90 + (360 * i) / k)} ${bulge}`;
  return d;
}

// [id, name, drawing, extra fields]
const SYMBOLS = [
  ['arrow', 'Arrow', 'M0,0 L0,10 M-3.5,6.5 L0,10 L3.5,6.5'],
  ['arrow-double', 'Double arrow', 'M0,0 L5,0 M2.8,2.2 L5,0 L2.8,-2.2 |'],
  ['arrow-turn', 'Turn arrow', 'A0,0 4.5 55 -240 M-2.87,1.58 L-2.25,3.897 L-4.57,4.52', { tags: 'refresh redo circle' }],
  ['chevrons', 'Chevrons', 'M-5,3.6 L-1.4,0 L-5,-3.6 M-1.8,3.6 L1.8,0 L-1.8,-3.6 M1.4,3.6 L5,0 L1.4,-3.6', { tags: 'fast forward arrows' }],
  ['check', 'Tick', 'M-4,0 L-1,-3 L5,4', { tags: 'check mark yes' }],
  ['xmark', 'X mark', 'M-4,-4 L4,4 M-4,4 L4,-4', { tags: 'no wrong close cross' }],
  ['noentry', 'No sign', 'O0,0 5 M-3.7157,3.3457 L3.7157,-3.3457', { tags: 'forbidden ban stop' }],
  ['peace', 'Peace sign', 'O0,0 5 M0,5 L0,-5 M-3.3457,-3.7157 L0,0 L3.3457,-3.7157'],
  ['yinyang', 'Yin yang', 'O0,0 5 M0,5 B0,0 1 B0,-5 -1 D0,2.5 D0,-2.5'],
  ['smiley', 'Smiley', 'O0,0 5 D-1.8,1.5 D1.8,1.5 A0,0.3 3 215 325', { tags: 'happy face smile' }],
  ['sadface', 'Sad face', 'O0,0 5 D-1.8,1.5 D1.8,1.5 A0,-4.3 3 55 125', { tags: 'unhappy frown' }],
  ['skull', 'Skull', 'A0,6 4 90 -40 L2.2,2.6 L2.2,0 L0,0 O1.6,5.6 1 M0.75,0 L0.75,1.6 | M0,4.2 L0.55,3.2 L-0.55,3.2 Z', { tags: 'death danger pirate' }],
  ['lightning', 'Lightning', 'M-0.5,10 L3,10 L0.8,6 L3.5,6 L-2,0 L-0.5,4.4 L-3,4.4 Z', { tags: 'bolt thunder electric zap' }],
  ['note', 'Music note', 'E-1.2,1.3 1.8,1.3 0 360 M0.6,1.3 L0.6,10 C2.2,8.6 4.4,7.6 3.4,4.6', { tags: 'song sound' }],
  ['notes', 'Double note', 'E-3.2,1.2 1.6,1.2 0 360 M-1.6,1.2 L-1.6,9 L4.2,10 L4.2,2.2 E2.6,2.2 1.6,1.2 0 -360 M-1.6,7.6 L4.2,8.6', { tags: 'music song sound' }],
  ['infinity', 'Infinity', 'M0,0 C2,3.2 5,3.2 5,0 C5,-3.2 2,-3.2 0,0 C-2,3.2 -5,3.2 -5,0 C-5,-3.2 -2,-3.2 0,0', { tags: 'forever loop eight' }],
  ['spade', 'Spade', 'M0,10 C1.2,7.6 4.6,5.8 4.6,3.6 C4.6,1.2 1.4,1 0,3 M0,1.7 L1.9,0 L0,0 | M0,3 L0,1.7', { tags: 'cards' }],
  ['club', 'Club', 'M0,1.8 L1.9,0 L0,0 O2.6,4.2 2 | O0,7.7 2 M0,4.7 L0,1.8', { tags: 'cards clover' }],
  ['pentagram', 'Pentagram', 'M0,5 L-2.939,-4.045 L4.755,1.545 L-4.755,1.545 L2.939,-4.045 Z', { tags: 'star lines magic' }],
  ['hexagram', 'Hexagram', 'M0,5 L-4.33,-2.5 L4.33,-2.5 Z M0,-5 L4.33,2.5 L-4.33,2.5 Z', { tags: 'star six triangles' }],
  ['crosshair', 'Crosshair', 'O0,0 3.5 M0,2 L0,5 M0,-2 L0,-5 M2,0 L5,0 M-2,0 L-5,0 D0,0', { tags: 'aim target scope' }],
  ['warning', 'Warning sign', 'M0,9 L-5.2,0 L5.2,0 Z M0,6.4 L0,3 D0,1.5', { tags: 'danger alert caution' }],
  ['atom', 'Atom', () => joinDrawings(spin('E0,0 5,1.8 0 360', 3), parsePath('D0,0')), { tags: 'science' }],
  ['eye', 'Eye', 'M-5,0 B5,0 -0.45 B-5,0 -0.45 O0,0 1.9 D0,0', { tags: 'look see' }],
  ['speech', 'Speech bubble', 'M-3,8 L3,8 B5,6 -0.4142 L5,3 B3,1 -0.4142 L-1,1 L-3.5,-1.5 L-2.6,1 L-3,1 B-5,3 -0.4142 L-5,6 B-3,8 -0.4142 Z D-2,4.5 D0,4.5 D2,4.5', { tags: 'chat talk message' }],
];

const NATURE = [
  ['sun', 'Sun', (p) => joinDrawings(parsePath('O0,0 2.6'), spin('M0,3.7 L0,5', Math.round(p.rays))), { params: [P('rays', 'Rays', 4, 16, 1, 8)] }],
  ['moon', 'Moon', 'A0,0 5 50 310 A2.669,0 3.869 278.1 81.9 Z', { tags: 'crescent night' }],
  ['cloud', 'Cloud', 'M-3.4,0 L3.4,0 B3.8,3.1 0.9 B0.8,5 0.8 B-2.9,3.6 0.85 B-3.4,0 0.9 Z'],
  ['raindrop', 'Drop', 'M0,10 C0.6,7.5 3.6,5.5 3.6,3.2 A0,3.2 3.6 0 -180 C-3.6,5.5 -0.6,7.5 0,10', { tags: 'water rain tear blood' }],
  ['snowflake', 'Snowflake', () => spin('M0,0 L0,5 M0,3.3 L1.3,4.5 M0,3.3 L-1.3,4.5 M0,1.8 L0.9,2.6 M0,1.8 L-0.9,2.6', 6), { tags: 'snow ice winter' }],
  ['flame', 'Flame', 'M0,0 C3.4,0 4.8,2.6 3.4,5 C2.6,6.4 1,7.6 0.8,10 C-1.6,8.4 -4.4,5.6 -3.8,2.8 C-3.4,0.8 -1.8,0 0,0 M0,1.2 C1.4,1.2 2,2.4 1.2,3.6 C0.8,4.2 0.3,4.8 0.3,5.8 C-0.8,5 -1.9,3.6 -1.6,2.4 C-1.4,1.6 -0.8,1.2 0,1.2', { tags: 'fire burn' }],
  ['leaf', 'Leaf', 'M0,0 B0,10 0.5 M0,2.5 L1.6,4.1 M0,4.5 L1.6,6.1 M0,6.5 L1.1,7.6 | M0,-1.6 L0,8.5', { turn: -30 }],
  ['tree', 'Tree', 'M0.9,0 L0.9,3 B3.7,5 0.75 B2.3,8.4 0.75 A0,7.8 2.377 14.6 90 | M-0.9,0 L0.9,0'],
  ['pine', 'Pine tree', 'M0,10 L2.2,7 L1.2,7 L3.2,4.2 L1.8,4.2 L4.2,1.4 L0.8,1.4 L0.8,0 L0,0 |', { tags: 'christmas fir' }],
  ['flower', 'Flower', (p) => {
    const k = Math.round(p.petals);
    // the stalk starts at the lowest point of the petals: a corner if their number is even, the middle of one if odd
    const low = k % 2 ? 2.1 * (Math.cos(Math.PI / k) + Math.sin(Math.PI / k)) : 2.1;
    return `${scallop(0, 7, 2.1, k, 1)} O0,7 1 M0,${fix(7 - low)} L0,-1 M0,0.6 Q2.4,0.4 3,2.4 Q0.8,2.4 0,0.6`;
  }, { params: [P('petals', 'Petals', 4, 10, 1, 6)], tags: 'daisy' }],
  ['tulip', 'Tulip', 'M0,9.8 L1.25,7.8 L2.5,9.6 C2.9,7 2,5 0,5 M0,0.8 C1.6,1.4 2.9,3.2 3.3,5.4 C1.7,4.8 0.5,3.6 0,2.4 | M0,5 L0,0', { tags: 'flower' }],
  ['clover', 'Clover', (p) => {
    const k = Math.round(p.leaves);
    const leaf = 'M0,0 C-0.2,1.3 -2,2.3 -1.9,3.7 C-1.8,5 -0.5,5 0,4 C0.5,5 1.8,5 1.9,3.7 C2,2.3 0.2,1.3 0,0';
    return joinDrawings(spin(leaf, k, k % 2 ? 0 : 180 / k), parsePath('M0,0 Q0.2,-3 1.2,-5.2'));
  }, { params: [P('leaves', 'Leaves', 3, 5, 1, 4)], tags: 'luck shamrock' }],
  ['mushroom', 'Mushroom', 'M-5,4.5 L5,4.5 E0,4.5 5,4.5 0 180 Z M-1.4,4.5 L-1.7,0.6 Q0,-0.4 1.7,0.6 L1.4,4.5 O-2.2,6.4 0.8 O1.6,7 0.9'],
  ['cactus', 'Cactus', 'M-1.2,0 L-1.2,3.2 L-3.2,3.2 B-3.9,3.9 -0.4142 L-3.9,6.4 B-2.7,6.4 -1 L-2.7,4.4 L-1.2,4.4 L-1.2,8.8 B1.2,8.8 -1 L1.2,5.6 L2.7,5.6 L2.7,7.4 B3.9,7.4 -1 L3.9,5.1 B3.2,4.4 -0.4142 L1.2,4.4 L1.2,0 Z', { tags: 'desert' }],
  ['mountain', 'Mountains', 'M-5,0 L-1,7 L1,3.5 L2.7,5 L5,0 Z M-2,5.25 L-1.3,4.6 L-0.8,5.3 L-0.3,4.6 L0,5.25', { tags: 'hill peak' }],
  ['rainbow', 'Rainbow', (p) => {
    const k = Math.round(p.bands);
    const step = Math.min(1.2, 3.2 / (k - 1));
    return Array.from({ length: k }, (_, i) => `A0,0 ${fix(5 - i * step)} 0 180`).join(' N ');
  }, { params: [P('bands', 'Bands', 2, 5, 1, 3)] }],
  ['fish', 'Fish', 'M5,2.4 C1,-3.6 -5,-2.6 -5,0 C-5,2.6 1,3.6 5,-2.4 Z D-3.2,0.5'],
  ['bird', 'Bird', 'M-5,1 Q-2.6,4.4 0,1.4 Q2.6,4.4 5,1', { tags: 'gull fly' }],
  ['butterfly', 'Butterfly', 'M0,6.2 C1.6,9.2 5.2,9.8 5,7 C4.9,5.6 2.2,5.6 0,5 M0,4.4 C2.4,4 4.4,3.4 4,1.6 C3.6,0 1,0.6 0,3 M0,7 Q0.4,9 1.6,9.8 | M0,7 L0,2.2'],
  ['cat', 'Cat', 'A0,4.2 4.2 90 70 L3.8,10.4 L3.64,6.3 A0,4.2 4.2 30 -90 D1.6,5.3 M0.5,3.9 L0,3.3 M0,2.7 Q0.7,1.9 1.5,2.6 M2.2,3.5 L5.2,4.1 M2.2,2.9 L5.2,2.5 | M-0.5,3.9 L0.5,3.9 M0,3.3 L0,2.7', { tags: 'kitten face pet' }],
  ['paw', 'Paw print', 'O1.3,7.6 1.15 O3.4,5.3 1.15 | E0,2.6 2.6,2.2 90 450', { tags: 'dog cat animal foot' }],
  ['rabbit', 'Rabbit', 'A0,3.2 3.2 -90 42 C3.4,8.4 3.4,11.8 2.1,11.8 C0.8,11.8 0.2,9 0.6,6.343 A0,3.2 3.2 79.2 90 D1.2,3.9 M0,2.1 Q0.6,1.3 1.3,1.9 | M0,2.8 L0,2.1', { tags: 'bunny easter face' }],
  ['web', 'Spider web', (p) => {
    const spokes = Math.round(p.spokes);
    const rings = Math.round(p.rings);
    let d = '';
    for (let i = 0; i < spokes; i++) d += `M0,0 L${around(0, 0, 5, 90 + (360 * i) / spokes)} `;
    for (let j = 1; j <= rings; j++) d += `${scallop(0, 0, (5 * j) / rings, spokes, -0.15)} `;
    return d;
  }, { params: [P('spokes', 'Threads', 5, 12, 1, 8), P('rings', 'Rings', 1, 4, 1, 3)], tags: 'cobweb halloween' }],
  ['bat', 'Bat', 'M0,3.8 L0.8,5.4 L1.3,3.8 Q3.2,6.6 6,6.8 Q5,4.4 5.4,2.2 Q4.2,2.8 3.4,1.3 Q2.6,2.6 1.6,2 Q1.2,0.8 0,0 |', { tags: 'halloween vampire' }],
  ['planet', 'Planet', 'O0,0 3 E0,0 5.4,1.5 120.05 419.95', { turn: 20, tags: 'saturn space ring' }],
];

const THINGS = [
  ['house', 'House', 'M0,0 L3.6,0 L3.6,5 M0,9.4 L4.6,5 L0,5 M0.9,0 L0.9,2.6 L0,2.6 |', { tags: 'home building' }],
  ['castle', 'Castle', 'M0,6.6 L0.6,6.6 L0.6,5.8 L1.8,5.8 L1.8,6.6 L3,6.6 L3,9.4 L3.6,9.4 L3.6,8.6 L4.4,8.6 L4.4,9.4 L5,9.4 L5,0 L0,0 M1.2,0 L1.2,2.2 A0,2.2 1.2 0 90 |', { tags: 'tower fort' }],
  ['key', 'Key', 'O-2.8,0 2.2 M-0.6,0 L5,0 L5,-2 M3.2,0 L3.2,-1.5'],
  ['lock', 'Padlock', 'M0,0 L3.4,0 L3.4,5.4 L0,5.4 M2.2,5.4 L2.2,7.6 A0,7.6 2.2 0 90 | O0,3.2 0.75 M0,2.45 L0,1.3', { tags: 'lock locked' }],
  ['sword', 'Sword', 'M0.7,3 L0.7,8.6 L0,10 M0,3 L2.6,3 | M0,3 L0,1 O0,0.4 0.6', { tags: 'weapon blade' }],
  ['shield', 'Shield', 'M0,9 L4,9 L4,5 C4,2.6 2,0.9 0,0 M0,5.6 L2.2,5.6 | M0,7.6 L0,2.4', { tags: 'armor defend' }],
  ['crown', 'Crown', 'M0,0 L4.6,0 L5,5.6 L2.6,3 L0,6.6 M0,1.2 L4.686,1.2 |', { tags: 'king queen royal' }],
  ['flag', 'Flag', 'M-4,0 L-4,10 C-1.4,11.2 1.4,8.4 4.4,9.6 L4.4,4.8 C1.4,3.6 -1.4,6.4 -4,5.2'],
  ['bell', 'Bell', 'M0,9 L0.6,9 C2,9 2.6,7 2.8,4.6 C3,2.8 3.6,2 4.6,1.4 L0,1.4 M0.6,9 A0,9 0.6 0 90 M1.1,1.4 A0,1.4 1.1 0 -90 |', { tags: 'ring alarm' }],
  ['gift', 'Gift', 'M0,0 L4,0 L4,5.6 M0,5.6 L4.6,5.6 L4.6,7.2 L0,7.2 C1.6,7.9 3.5,7.6 3.6,8.6 C3.8,10.2 0.6,9.8 0,7.2 | M0,0 L0,7.2', { tags: 'present box christmas birthday' }],
  ['balloon', 'Balloon', 'E0,6.2 3.2,3.8 -90 270 M0,2.4 L-0.5,1.7 L0.5,1.7 Z M0,1.7 C1,0.8 -1,-0.4 0,-1.6', { tags: 'party birthday' }],
  ['trophy', 'Trophy', 'M0,10 L2.8,10 L2.8,6.8 E0,6.8 2.8,2.6 0 -79 L0.5,1.8 L2.4,1.8 L2.4,0 L0,0 M2.8,9.2 C5,9.2 5,6.9 2.8,7.1 |', { tags: 'cup win prize' }],
  ['jewel', 'Jewel', 'M0,9 L3,9 L5,6 L0,0 M0,6 L5,6 M0,9 L1.7,6 L3,9 M1.7,6 L0,0 |', { tags: 'diamond gem' }],
  ['rocket', 'Rocket', 'M0,10 C1,9 1.8,7.4 1.8,5.6 L1.8,2.2 L0,2.2 M1.8,4.4 L3.8,2.2 L3.8,0.6 L1.8,2.2 M1,2.2 Q1,0.8 0,-0.4 | O0,6 0.9', { tags: 'space ship' }],
  ['boat', 'Sailing boat', 'M-5,2.6 L5,2.6 L3.4,0 L-3.4,0 Z M0,2.6 L0,10 L4,3.6 L0,3.6 M-0.7,9 L-3.8,3.6 L-0.7,3.6 Z', { tags: 'ship sail' }],
  ['anchor', 'Anchor', 'A0,4 4 270 345 M4.5,1.6 L3.864,2.965 L2.64,2.1 M0,6.6 L2.4,6.6 | O0,9 1 M0,8 L0,0', { tags: 'ship sea' }],
  ['umbrella', 'Umbrella', 'A0,5 5 0 180 B-1.67,5 -0.5 B1.67,5 -0.5 B5,5 -0.5 M0,5.835 L0,1.2 B-1.8,1.2 -1', { tags: 'rain' }],
  ['bulb', 'Light bulb', 'A0,6.4 3.4 90 -60 L1.4,2.4 L1.4,0.6 L0,0.6 M0,2.4 L1.4,2.4 M0,1.5 L1.4,1.5 | M-1,5.4 L-0.4,6.6 L0,5.4 L0.4,6.6 L1,5.4', { tags: 'idea lamp' }],
  ['candle', 'Candle', 'M0,0 L3,0 M1.6,0 L1.6,5.6 L0,5.6 M0,10 C0.4,9 1.5,8.4 1.5,7.6 A0,7.6 1.5 0 -90 | M0,5.6 L0,6.1', { tags: 'light flame' }],
  ['potion', 'Potion', 'A0,3.6 3.6 -90 6 A0,3.6 3.6 6 70 L1.231,9 L1.9,9 L1.9,10 L0,10 M0,3.976 L3.58,3.976 | D-1,2.2 D0.8,1.4 D0.4,2.8', { tags: 'bottle flask magic' }],
  ['pickaxe', 'Pickaxe', 'A0,3 6.6 50 130 A0,-8.21 16.81 104.62 90 A0,-8.21 16.81 90 75.38 Z M0,8.6 L0,0', { turn: -40, tags: 'mine tool dig' }],
  ['hammer', 'Hammer', 'M0,0 L0.55,0 L0.55,6.4 L3.6,6.4 L3.6,9.6 L0,9.6 |', { tags: 'tool build' }],
  ['bow', 'Bow and arrow', 'M0.5,10 B0.5,0 -0.55 M0.5,10 L-1.6,5 L0.5,0 M-1.6,5 L5.6,5 M4.4,5.9 L5.6,5 L4.4,4.1', { tags: 'weapon archer' }],
  ['apple', 'Apple', 'M0,7.4 C1,8.6 4.4,8.8 4.4,5 C4.4,2 2.4,0 1,0 C0.6,0 0.3,0.3 0,0.3 | M0,7.4 L0.3,9.4 C1.2,10.6 2.8,10.6 3.6,9.6 C2.6,8.8 1.2,8.8 0.3,9.4', { tags: 'fruit food' }],
  ['ghost', 'Ghost', 'M-3.6,0.9 L-3.6,6.4 A0,6.4 3.6 180 0 L3.6,0.9 B1.2,0.9 -0.7 B-1.2,0.9 -0.7 B-3.6,0.9 -0.7 N E-1.3,6.4 0.6,0.9 90 450 N E1.3,6.4 0.6,0.9 90 450', { tags: 'halloween spooky' }],
];

const pictures = (cat, list) => list.map(([id, name, draw, extra = {}]) => drawnShape({ id, name, cat, draw, ...extra }));

export const ICON_SHAPES = [
  ...pictures('symbols', SYMBOLS),
  ...pictures('nature', NATURE),
  ...pictures('things', THINGS),
];
