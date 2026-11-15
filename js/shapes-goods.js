// Still more food, things, travel and costumes, added when the library grew to
// 1,624 shapes. Each one is a short drawing in the language described in
// shape-kit.js ("drawings"), in whatever units suit the picture.

import { drawnShape, parsePath, joinDrawings, stamp, around, scallop, fix } from './shape-kit.js';

const HEART = 'M0,7.4 C1,10 5,10 5,6.6 C5,3.6 1.6,1.6 0,0 |';
const DROP = 'M0,10 C0.6,7.5 3.6,5.5 3.6,3.2 A0,3.2 3.6 0 -180 C-3.6,5.5 -0.6,7.5 0,10';

/** A star outline with `k` points around (cx, cy): `out` to the tips, `inn` to the corners between them. */
const star = (cx, cy, out, inn, k = 5, first = 90) => `M${Array.from({ length: 2 * k }, (_, i) => around(cx, cy, i % 2 ? inn : out, first + (180 * i) / k)).join(' L')} Z`;
/** The same drawing, turned. */
const tilted = (d, turn) => () => stamp(d, [[0, 0, 1, turn]]);
/** Short lines pointing away from (cx, cy), from `from` to `to`, at the given angles. */
const rays = (cx, cy, from, to, angles) => angles.map((a) => `M${around(cx, cy, from, a)} L${around(cx, cy, to, a)}`).join(' ');
/** A drawing with a small heart on it. */
const withHeart = (d, x, y, size) => () => joinDrawings(parsePath(d), stamp(HEART, [[x, y, size]]));

// [id, name, drawing, extra fields]
const FRUIT = [
  ['orange-slice', 'Orange slice', () => `M-5,1.6 L-4.2,1.6 L0,1.6 L4.2,1.6 L5,1.6 A0,1.6 5 0 -180 M4.2,1.6 A0,1.6 4.2 0 -180 ${rays(0, 1.6, 0, 4.2, [-30, -60, -90, -120, -150])}`, { tags: 'fruit citrus lemon lime wedge juice' }],
  ['lemon', 'Lemon', 'M-4.6,0 C-3.4,3.4 3.4,3.4 4.6,0 C3.4,-3.4 -3.4,-3.4 -4.6,0 M-4.6,0 L-5.4,0 M4.6,0 L5.4,0 M0.6,3.2 Q1.6,4.8 3.2,4.4 Q2.4,3 0.6,3.2 D-1.6,0.6 D0.4,-0.8 D1.8,0.8', { tags: 'fruit citrus sour yellow lime' }],
  ['kiwi', 'Kiwi', () => `E0,0 4.4,3.6 0 360 N E0,0 1.2,0.9 0 360 ${Array.from({ length: 10 }, (_, i) => `D${fix(2.5 * Math.cos(i * 0.6283))},${fix(2 * Math.sin(i * 0.6283))}`).join(' ')}`, { tags: 'fruit green slice seeds half' }],
  ['corn', 'Corn', 'M1.8,-3 L1.8,-1.6 L1.8,-0.2 L1.8,1.2 L1.8,2.6 C1.8,3.6 0.9,4.1 0,4.1 M1.8,-3 C3.4,-2.6 4.2,-0.6 3.8,1.6 C3.2,0.4 2.8,-1 1.8,-1.6 M0,2.6 L1.8,2.6 M0,1.2 L1.8,1.2 M0,-0.2 L1.8,-0.2 M0,-1.6 L1.8,-1.6 M0,-3.7 Q1.2,-3.6 1.8,-3 | M0,4.1 L0,2.6 L0,1.2 L0,-0.2 L0,-1.6 L0,-3.7', { tags: 'vegetable cob maize sweetcorn farm' }],
  ['broccoli', 'Broccoli', 'M-4.4,0.4 B-3.4,3 -0.8 B-1.2,4.4 -0.8 B1.2,4.4 -0.8 B3.4,3 -0.8 B4.4,0.4 -0.8 L1.2,-0.8 L1.2,-5 L-1.2,-5 L-1.2,-0.8 Z M-2.2,1.4 B0,1.8 -0.5 B2.2,1.4 -0.5', { tags: 'vegetable green tree healthy' }],
  ['tomato', 'Tomato', 'N E0,-0.6 4.4,3.8 0 360 M0,3.2 L-1.8,2 M0,3.2 L-0.8,1.4 M0,3.2 L0.8,1.4 M0,3.2 L1.8,2 M0,3.2 L0,4.6 M-3,0 Q-3,-2 -1.6,-3', { tags: 'vegetable fruit red salad ketchup' }],
  ['aubergine', 'Aubergine', 'M0,3.4 C0.6,3.4 1,3.15 1.275,2.75 C1.55,2.35 1.7,1.8 1.8,1.2 C2.2,-0.6 3.4,-1.4 3.4,-3 C3.4,-4.6 1.8,-5.4 0,-5.4 M1.275,2.75 L0.7,1.6 L0,2.6 | M0,3.4 L0,4.6 L0.8,5.2 M-2.2,-1.6 Q-2.6,-3 -1.6,-4', { tags: 'vegetable eggplant purple' }],
  ['onion', 'Onion', 'M0,4.6 C0.4,3.4 3.8,2.4 3.8,-0.8 C3.8,-3 2,-4.2 0,-4.2 M0,3 C0.6,2 2,1 2,-0.8 C2,-2.4 1,-3.4 0,-3.6 | M0,-4.7 L0,-5.4 M-1,-4.6 L-1.5,-5.3 M1,-4.6 L1.5,-5.3', { tags: 'vegetable bulb garlic cry layers' }],
  ['bell-pepper', 'Bell pepper', 'M0,2.6 C0.6,3.4 2.2,3.6 3,2.6 C4,1.2 3.6,-2 2.6,-3.6 C2,-4.4 0.8,-4.4 0,-3.6 M1.2,2.2 C1.6,0.6 1.5,-1.6 1.1,-3 | M0,2.6 L0,4 L1,4.6', { tags: 'vegetable capsicum paprika sweet' }],
  ['radish', 'Radish', 'M0,1.6 C2.4,1.6 3.2,0 3.2,-1.4 C3.2,-3.2 1.2,-4 0,-5.6 M0,1.6 L1.6,2.8 Q3.4,3 3.6,5 Q1.8,4.6 1.6,2.8 | M0,1.6 L0,3 Q-1,4.4 0,5.6 Q1,4.4 0,3 M-1.8,-0.6 Q-2,-2 -1,-3', { tags: 'vegetable turnip beet root' }],
  ['apple-core', 'Apple core', 'M0,3.2 C0.8,4 2.6,3.8 3.2,2.6 C1.6,2 0.8,1 0.8,0 C0.8,-1 1.6,-2.2 3,-2.8 C2.6,-4 1,-4.4 0,-3.8 | M0,3.2 L0,4.6 L0.6,5.2 D-0.25,0.2 D0.25,-0.4', { tags: 'fruit eaten bitten rubbish compost' }],
  ['peanut', 'Peanut', tilted('M0,5 C2,5 2.8,3.6 2.8,2.6 C2.8,1.2 1.6,0.8 1.6,0 C1.6,-0.8 3,-1.4 3,-2.8 C3,-4.2 1.8,-5 0,-5 | M-1,3.2 L0,3.6 M0.4,2.4 L1.4,2.8 M-1.4,-2.2 L-0.4,-1.8 M0.2,-3.2 L1.4,-2.8 M-0.6,0 L0.4,0.2', -35), { tags: 'nut shell snack monkey' }],
];

const MEALS = [
  ['sandwich', 'Sandwich', 'M-4.6,1.8 L-4.6,3 Q-4.6,3.8 -3.8,3.8 L0,3.8 L3.8,3.8 Q4.6,3.8 4.6,3 L4.6,1.8 Z M-5,0.8 Q-3.75,1.8 -2.5,0.8 Q-1.25,-0.2 0,0.8 Q1.25,1.8 2.5,0.8 Q3.75,-0.2 5,0.8 M-4.6,-0.6 L4.6,-0.6 M-4.6,-1.6 L4.6,-1.6 L4.6,-2.8 Q4.6,-3.6 3.8,-3.6 L-3.8,-3.6 Q-4.6,-3.6 -4.6,-2.8 Z M0,3.8 L0,5.2 O0,5.7 0.5', { tags: 'lunch bread toast snack' }],
  ['sushi-roll', 'Sushi roll', 'N E0,1.6 4,1.8 0 360 M-4,1.6 L-4,-2.4 M4,1.6 L4,-2.4 N E0,-2.4 4,1.8 180 360 O0,1.6 0.8 D-2.2,1.8 D2.2,1.8 D-1.2,0.6 D1.2,0.6 D-1,2.7 D1,2.7', { tags: 'japan maki rice fish seaweed' }],
  ['baguette', 'Baguette', tilted('M-4.4,-1 L4.4,-1 B4.4,1 1 L-4.4,1 B-4.4,-1 1 M-3,0.5 L-2.2,-0.5 M-1,0.5 L-0.2,-0.5 M1,0.5 L1.8,-0.5 M3,0.5 L3.8,-0.5', 35), { tags: 'bread loaf french bakery stick' }],
  ['croissant', 'Croissant', 'M-5,-2 B-3.325,1.037 -0.45 B0,2.05 -0.45 B3.325,1.037 -0.45 B5,-2 -0.45 M-5,-2 C-2.6,0.6 2.6,0.6 5,-2 M-3.325,1.037 L-2.762,-0.538 M0,2.05 L0,-0.05 M3.325,1.037 L2.762,-0.538', { tags: 'bread pastry french bakery breakfast' }],
  ['egg-cup', 'Egg cup', 'M-2.6,0.6 C-2.6,4.2 2.6,4.2 2.6,0.6 M-3,0.6 L-2.6,0.6 L2.6,0.6 L3,0.6 C3,-2 1.2,-2.6 0.6,-2.6 L0.6,-4 L2.2,-4 L2.2,-4.8 L-2.2,-4.8 L-2.2,-4 L-0.6,-4 L-0.6,-2.6 C-1.2,-2.6 -3,-2 -3,0.6 M-1.5,1.9 L-0.7,2.5 L0,1.8 L0.7,2.5 L1.5,1.9', { tags: 'boiled egg breakfast soft' }],
  ['kebab', 'Kebab', tilted('O-6.2,0 0.6 M-5.6,0 L-3.6,0 L-3.6,0.9 L-1.9,0.9 L-1.9,0 L-1.9,-0.9 L-3.6,-0.9 L-3.6,0 M-1.9,0 L-1.2,0 O-0.2,0 1 M0.8,0 L1.5,0 L1.5,0.9 L3.2,0.9 L3.2,0 L3.2,-0.9 L1.5,-0.9 L1.5,0 M3.2,0 L5.8,0', 40), { tags: 'meat skewer grill barbecue stick' }],
  ['popcorn', 'Popcorn', 'M-3.8,1 B-2.6,2.8 -0.8 B-0.8,3.8 -0.8 B1,3.8 -0.8 B2.8,2.6 -0.8 B3.8,1 -0.8 L3,-5 L1.5,-5 L0,-5 L-1.5,-5 L-3,-5 L-3.8,1 L-1.9,1 L0,1 L1.9,1 L3.8,1 M-1.9,1 L-1.5,-5 M0,1 L0,-5 M1.9,1 L1.5,-5 M-1.8,1.8 B0,2.2 -0.6 B1.8,1.8 -0.6', { tags: 'snack cinema movie film box' }],
  ['rice-ball', 'Rice ball', 'M0,4.4 C1.6,4.4 4.6,-1.4 4.6,-2.6 C4.6,-3.8 3.6,-4.2 2.4,-4.2 L1.6,-4.2 L-1.6,-4.2 L-2.4,-4.2 C-3.6,-4.2 -4.6,-3.8 -4.6,-2.6 C-4.6,-1.4 -1.6,4.4 0,4.4 M-1.6,-4.2 L-1.6,-1 L1.6,-1 L1.6,-4.2 D-1,1 D1,1.4 D0,2.6 D-2.6,-1.6 D2.6,-1.4', { tags: 'japan onigiri sushi seaweed snack' }],
  ['salt-shaker', 'Salt shaker', 'M-2.2,-5 L-2.6,1.4 L2.6,1.4 L2.2,-5 Z M-2.6,1.4 C-2.6,4.6 2.6,4.6 2.6,1.4 D-0.8,2.6 D0.8,2.6 D0,3.4 M1,-0.4 C0.4,0.4 -1,0.2 -1,-0.8 C-1,-1.8 1,-1.8 1,-2.8 C1,-3.8 -0.4,-4 -1,-3.2', { tags: 'pepper kitchen season spice table' }],
  ['cooking-pot', 'Cooking pot', 'M0,1 L4,1 L4.4,1 M4,1 L4,0 L4,-1.2 L4,-3 Q4,-4.4 2.6,-4.4 L0,-4.4 M4,0 L5.4,0 L5.4,-1.2 L4,-1.2 | M-4.4,1 Q0,3.8 4.4,1 M0,2.4 L0,2.9 O0,3.4 0.5', { tags: 'kitchen stew soup pan cook lid' }],
  ['frying-pan', 'Frying pan', 'O-1.4,0 3.6 M2.121,0.748 L5.6,0.6 B5.6,-0.6 -1 L2.121,-0.748 O-1.6,0.2 0.9 M-3.2,0.4 C-3.4,1.8 -1.6,2.4 -0.6,1.8 C0.6,1.4 0.6,0 0.2,-0.8 C-0.2,-1.8 -1.6,-2 -2.4,-1.4 C-3.2,-0.8 -3.2,-0.2 -3.2,0.4', { tags: 'kitchen cook egg breakfast skillet' }],
  ['honey-pot', 'Honey pot', 'M-2.6,2 C-4.8,1 -4.8,-4.4 -2,-4.6 L2,-4.6 C4.8,-4.4 4.8,1 2.6,2 M-3,2 L-2.6,2 L2.6,2 L3,2 L3,3.2 L-3,3.2 Z M-2.4,1.4 Q-1.8,0 -1,0.8 Q-0.2,1.6 0.4,0 Q1,-1.4 1.6,0.6 Q2,1.4 2.4,1.2', { tags: 'jar bee sweet jam bear' }],
];

const pie = () => `M-5,0${[1, 2, 3, 4, 5, 6, 7, 8].map((i) => ` B${fix(-5 + 1.25 * i)},0 -0.6`).join('')} L3.6,-2.6 L-3.6,-2.6 Z M-4.2,1 Q0,4.6 4.2,1 M-1.2,1.4 L-1.2,2 M0,1.4 L0,2.1 M1.2,1.4 L1.2,2`;

const SWEETS = [
  ['cake-slice', 'Cake slice', 'M-4.6,-3.6 L4.6,-3.6 L4.6,-1.7 L4.6,0.2 L-4.6,2.2 L-4.6,-0.7 Z M-4.6,-0.7 L4.6,-1.7 O-2.6,3.2 0.8 M-2.6,4 Q-2.2,5 -1.4,5.2 M-5.4,-4.4 L5.4,-4.4', { tags: 'dessert birthday piece cherry party' }],
  ['pie', 'Pie', pie, { tags: 'dessert bake apple pumpkin crust' }],
  ['ice-lolly', 'Ice lolly', 'M-2.4,-1.6 L-2.4,2.6 C-2.4,5.2 2.4,5.2 2.4,2.6 L2.4,-1.6 L0.6,-1.6 L-0.6,-1.6 Z M-0.6,-1.6 L-0.6,-4.4 B0.6,-4.4 1 L0.6,-1.6 M-1,-0.4 L-1,2.6 M1,-0.4 L1,2.6', { tags: 'popsicle ice cream summer frozen stick' }],
  ['cotton-candy', 'Cotton candy', () => `${scallop(0, 2, 3, 8, 0.7)} M-1.4,1.6 Q-1.2,3.4 0.4,3.2 Q1.6,3 1.4,1.8 M-1.2,-1.9 L1.2,-1.9 L0,-5.6 Z`, { tags: 'candy floss fair sweet sugar fluffy' }],
  ['gingerbread-man', 'Gingerbread man', 'M0,5 A0,3.2 1.8 90 -50 L3.8,1.6 B3.8,-0.2 -1 L1.4,-0.2 L1.4,-1.6 L2.9,-4 B1.2,-4.9 -1 L0,-2.2 D0.6,3.6 | M-0.8,2.6 Q0,1.9 0.8,2.6 D0,0.4 D0,-1', { tags: 'cookie biscuit christmas person bake' }],
  ['jelly', 'Jelly', 'M-4,-3 L-2.6,2.4 B-0.9,2.4 -0.7 B0.9,2.4 -0.7 B2.6,2.4 -0.7 L4,-3 L1.3,-3 L-1.3,-3 Z M-0.9,2.4 L-1.3,-3 M0.9,2.4 L1.3,-3 O0,4.4 0.7 M-5.4,-3.8 L5.4,-3.8 M4.8,1.6 Q5.4,0.6 4.8,-0.4 M-4.8,1.6 Q-5.4,0.6 -4.8,-0.4', { tags: 'dessert jello pudding wobble flan' }],
  ['sundae', 'Sundae', 'M0,1 L3.6,1 C3.6,-1.4 1.4,-2.4 0.5,-2.4 L0.5,-4.2 L2.2,-4.2 L2.2,-5 L0,-5 | M-3.6,1 B-1.2,2.2 -0.8 B1.2,2.2 -0.8 B3.6,1 -0.8 O0,4.5 0.7 M0,5.2 Q0.4,6 1.2,6.2', { tags: 'ice cream dessert glass cherry' }],
  ['gumball-machine', 'Gumball machine', 'O0,1.8 3.2 O-1.5,0.9 0.6 O0.3,0.4 0.6 O1.7,1.5 0.6 O-0.3,2.2 0.6 O1.1,3.2 0.6 M-1.6,-0.971 L-2.6,-4.2 M1.6,-0.971 L2.6,-4.2 M-3.2,-4.2 L-2.6,-4.2 L2.6,-4.2 L3.2,-4.2 L3.2,-5 L-3.2,-5 Z M-0.7,-2.2 L0.7,-2.2 L0.7,-3.2 L-0.7,-3.2 Z D0,5.7', { tags: 'candy sweets bubble gum balls coin' }],
  ['soft-serve', 'Soft ice cream', 'M3,-0.6 B2.4,1.2 0.6 B1.6,2.6 0.6 B0.6,3.8 0.6 L0,5.2 M3,-0.6 L0,-5.6 M1.8,-2.6 L-0.6,-0.6 | M-3,-0.6 L-0.6,-0.6 L0.6,-0.6 L3,-0.6 M-2.4,1.2 Q0,0.4 2.4,1.2 M-1.6,2.6 Q0,1.9 1.6,2.6 M-0.6,3.8 Q0,3.5 0.6,3.8', { tags: 'cone swirl whippy dessert summer' }],
  ['tiered-cake', 'Tiered cake', withHeart('M-4.2,-4.6 L4.2,-4.6 L4.2,-2.2 L3,-2.2 L3,0.2 L1.8,0.2 L1.8,2.6 L-1.8,2.6 L-1.8,0.2 L-3,0.2 L-3,-2.2 L-4.2,-2.2 Z M-3,-2.2 L3,-2.2 M-1.8,0.2 L1.8,0.2 D-2.8,-3.4 D-1.4,-3.4 D0,-3.4 D1.4,-3.4 D2.8,-3.4 D-1.6,-1 D0,-1 D1.6,-1 D-0.6,1.4 D0.6,1.4', 0, 3.3, 0.2), { tags: 'wedding party dessert layers celebration' }],
];

const DRINKS = [
  ['milk-carton', 'Milk carton', 'M-2.6,-5 L-2.6,-0.4 L-2.6,1.6 L2.6,1.6 L2.6,-0.4 L2.6,-5 Z M-2.6,1.6 L-1.6,3.6 L1.6,3.6 L2.6,1.6 M-1.6,3.6 L-1.6,4.6 L1.6,4.6 L1.6,3.6 M-2.6,-0.4 Q-1.3,0.6 0,-0.4 Q1.3,-1.4 2.6,-0.4', { tags: 'drink dairy juice box cow' }],
  ['water-bottle', 'Water bottle', 'M0,5.4 L0.8,5.4 L0.8,4.4 L0.8,3.6 C2,3.2 2.4,2.4 2.4,1.4 L2.4,0.6 L2.4,-2 L2.4,-4.2 Q2.4,-5 1.6,-5 L0,-5 M0,4.4 L0.8,4.4 M0,0.6 L2.4,0.6 M0,-2 L2.4,-2 | M-1.6,-0.8 Q-0.8,0 0,-0.8 Q0.8,-1.6 1.6,-0.8', { tags: 'drink plastic thirsty sport' }],
  ['bubble-tea', 'Bubble tea', 'M-3.4,1.6 L-2.8,1.6 L2.8,1.6 L3.4,1.6 C3.4,4 -3.4,4 -3.4,1.6 M-2.8,1.6 L-2,-5 L2,-5 L2.8,1.6 M-2.63,0.2 L2.63,0.2 M0.3,4 L1.1,6.2 L1.9,5.9 L1.1,3.7 D-1.2,-4.2 D0,-4.2 D1.2,-4.2 D-0.6,-3.3 D0.6,-3.3 D-1.4,-2.6 D1.4,-2.6 D0,-2.4', { tags: 'drink boba milk tea straw pearls' }],
  ['milkshake', 'Milkshake', 'M-2.6,1.4 B-0.867,1.4 -0.6 B0.867,1.4 -0.6 B2.6,1.4 -0.6 L1.8,-4.8 L-1.8,-4.8 Z M-2.19,-1.8 L2.19,-1.8 M-1.1,2.6 B1.1,2.6 -1 O0,4.9 0.6 M1.9,2.9 L3.2,5.4 L4.4,5.4', { tags: 'drink smoothie shake cream straw glass' }],
  ['hot-chocolate', 'Hot chocolate', withHeart('M-3,2 L-2,2 L-0.8,2 L0.2,2 L1.6,2 L3,2 L3,1 L3,-2.6 L3,-3.6 Q3,-4.6 2,-4.6 L-2,-4.6 Q-3,-4.6 -3,-3.6 Z M3,1 L4,1 Q5.2,1 5.2,-0.4 L5.2,-1.2 Q5.2,-2.6 4,-2.6 L3,-2.6 M-2,2 L-2,3 L-0.8,3 L-0.8,2 M0.2,2 L0.2,3.2 L1.6,3.2 L1.6,2 M-1.4,4 Q-2,4.8 -1.4,5.6 M1,4.2 Q0.4,5 1,5.8', 0, -2.6, 0.22), { tags: 'drink cocoa mug marshmallow warm winter' }],
  ['kettle', 'Kettle', 'M-3.4,-4.6 L3.4,-4.6 C4.6,-2.4 4,0.8 2.4,1.6 L-2.4,1.6 C-4,0.8 -4.6,-2.4 -3.4,-4.6 M-2.4,1.6 C-3.6,5.6 3.6,5.6 2.4,1.6 M-1.8,1.6 Q0,3 1.8,1.6 O0,3.3 0.5 M3.95,-0.975 L5.8,1.6 L5.2,2.1 L3.4,0.603', { tags: 'tea boil water kitchen hot pot' }],
  ['baby-bottle', 'Baby bottle', 'M0,-5 L1.4,-5 Q2,-5 2,-4.4 L2,1.6 L2.6,1.6 L2.6,2.6 L1.8,2.6 C1.8,4.2 0.6,4 0.5,4.8 L0.5,5.4 B0,5.9 0.414 M0,1.6 L2,1.6 M0,2.6 L1.8,2.6 | M-2,0 L-0.8,0 M-2,-1.4 L-1.2,-1.4 M-2,-2.8 L-0.8,-2.8', { tags: 'milk drink infant feed' }],
  ['jug', 'Jug', 'M-2.6,3.4 L-2.2,-4.6 L2.2,-4.6 L2.6,4.4 L-3.6,4.4 Z M2.52,2.6 C5,2.6 5,-2 2.316,-2 M-2.51,1.6 L2.476,1.6 O0,-1.4 1', { tags: 'drink pitcher lemonade water pour' }],
];

const TOOLS = [
  ['pencil', 'Pencil', tilted('M-5,-0.8 L-3.8,-0.8 L2.6,-0.8 L5,0 L2.6,0.8 L-3.8,0.8 L-5,0.8 Z M2.6,-0.8 L2.6,0.8 M-3.8,-0.8 L-3.8,0.8', 45), { tags: 'write draw school pen eraser' }],
  ['ruler', 'Ruler', () => stamp(`M-5,-1 L5,-1 L5,1 L-5,1 Z ${[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((x, i) => `M${x},1 L${x},${i % 2 ? 0.5 : 0.1}`).join(' ')}`, [[0, 0, 1, -30]]), { tags: 'measure school length maths' }],
  ['palette', 'Palette', 'E0,0 4.8,3.8 0 360 O2.4,-1.2 0.8 O-2.8,0.8 0.7 O-1.2,2.2 0.7 O1,2.4 0.7 O-2.2,-1.4 0.7', { tags: 'paint art colours artist draw' }],
  ['paint-roller', 'Paint roller', 'M-4,2.4 L3,2.4 L3,3.5 L3,4.6 L-4,4.6 Z M3,3.5 L4.6,3.5 L4.6,0.8 L0,0.8 L0,-1 M-0.7,-1 L0,-1 L0.7,-1 L0.7,-5 L-0.7,-5 Z', { tags: 'paint decorate wall colour tool' }],
  ['fishing-rod', 'Fishing rod', 'M-5,-4 L4,5 L4,-1.6 C4,-3 2.6,-3 2.6,-1.8 O-3,-2 0.9 O4,1.4 0.6', { tags: 'fish hook line reel catch' }],
  ['watering-can', 'Watering can', 'M-1.6,-4 L-1.743,-2 L-1.886,0 L-2,1.6 L3,1.6 L2.929,0.6 L2.671,-3 L2.6,-4 Z M-1.743,-2 L-4.8,1.6 L-4,2.6 L-1.886,0 M2.929,0.6 C5.2,0.6 5.2,-3 2.671,-3 D-5.6,2.8 D-5.9,1.6 D-5,3.6', { tags: 'garden water plants flowers grow' }],
  ['rake', 'Rake', 'M0,5 L0,-3 M-3,-3 L-2,-3 L-1,-3 L0,-3 L1,-3 L2,-3 L3,-3 M-3,-3 L-3,-4.8 M-2,-3 L-2,-4.8 M-1,-3 L-1,-4.8 M0,-3 L0,-4.8 M1,-3 L1,-4.8 M2,-3 L2,-4.8 M3,-3 L3,-4.8', { tags: 'garden leaves tool farm' }],
  ['telescope', 'Telescope', 'M-4.2,-0.2 L0.36,2.32 L3.4,4 L4.4,2 L1.2,0.64 L0.4,0.3 L-3.6,-1.4 Z M0.36,2.32 L1.2,0.64 M0.4,0.3 L-3.2,-4.9 M0.4,0.3 L0.4,-4.9 M0.4,0.3 L4,-4.9', { tags: 'stars space astronomy look spy' }],
  ['binoculars', 'Binoculars', 'M0.8,0.8 L0.8,-1.6 L0.5,-4.6 L4.2,-4.6 L3.8,-1.6 L3.8,0.8 L3.2,0.8 L3.2,3.6 L1.4,3.6 L1.4,0.8 Z M0.8,-1.6 L3.8,-1.6 | M-0.8,-0.4 L0.8,-0.4', { tags: 'look spy watch far explore' }],
  ['compass', 'Compass', 'O0,0 4.6 M0,3.4 L1.2,0 L0,-3.4 L-1.2,0 Z M-1.2,0 L1.2,0 M-4.6,0 L-3.6,0 M3.6,0 L4.6,0 D2.8,2.8 D-2.8,2.8 D2.8,-2.8 D-2.8,-2.8', { tags: 'north map direction explore navigate' }],
  ['fish-hook', 'Fish hook', 'O0,4.4 0.6 M0,3.8 L0,-2.4 C0,-5 3.4,-5 3.4,-2.2 L3.4,-0.6 L2.4,-1.8', { tags: 'fishing bait catch barb' }],
  ['test-tube', 'Test tube', tilted('M-1.8,4.6 L-1.2,4.6 L1.2,4.6 L1.8,4.6 M-1.2,4.6 L-1.2,0.4 L-1.2,-3.4 B1.2,-3.4 1 L1.2,0.4 L1.2,4.6 M-1.2,0.4 L1.2,0.4 D0.3,-1 D-0.3,-2.2 D0.2,-3.6', -30), { tags: 'science lab chemistry experiment potion' }],
  ['plug', 'Plug', 'M-2.4,0.6 L-1.6,0.6 L-0.8,0.6 L0.8,0.6 L1.6,0.6 L2.4,0.6 L2.4,-1.6 C2.4,-3 1,-3.6 0,-3.6 C-1,-3.6 -2.4,-3 -2.4,-1.6 Z M-1.6,0.6 L-1.6,3.4 L-0.8,3.4 L-0.8,0.6 M0.8,0.6 L0.8,3.4 L1.6,3.4 L1.6,0.6 M0,-3.6 L0,-4.4 C0,-5.6 -2,-5.6 -3.4,-5', { tags: 'electric power socket cable energy' }],
  ['toolbox', 'Toolbox', 'M-4.6,-3.6 L4.6,-3.6 L4.6,-0.4 L4.6,1.2 L1.8,1.2 L-1.8,1.2 L-4.6,1.2 L-4.6,-0.4 Z M-4.6,-0.4 L-0.7,-0.4 L0.7,-0.4 L4.6,-0.4 M-1.8,1.2 L-1.8,3 L1.8,3 L1.8,1.2 M-0.7,-0.4 L-0.7,-1.4 L0.7,-1.4 L0.7,-0.4', { tags: 'tools box repair fix kit' }],
  ['nut-bolt', 'Nut and bolt', () => `M-4,3 L-2.9,3 L-1.1,3 L0,3 L0,4.6 L-4,4.6 Z M-2.9,3 L-2.9,-4.6 L-1.1,-4.6 L-1.1,3 M-2.9,1.4 L-1.1,1.9 M-2.9,0.2 L-1.1,0.7 M-2.9,-1 L-1.1,-0.5 M-2.9,-2.2 L-1.1,-1.7 M-2.9,-3.4 L-1.1,-2.9 M${[0, 60, 120, 180, 240, 300].map((a) => around(3, -1.4, 1.9, a)).join(' L')} Z O3,-1.4 0.8`, { tags: 'screw metal fix build machine' }],
];

const cannon = () => joinDrawings(
  stamp('M-3.6,-1 L4,-0.8 L4,-1.2 L4.7,-1.2 L4.7,1.2 L4,1.2 L4,0.8 L-3.6,1 B-3.6,-1 1', [[0.4, 2.2, 1, 25]]),
  parsePath(`O-0.6,-2.4 2.4 O-0.6,-2.4 0.6 ${rays(-0.6, -2.4, 0.6, 2.4, [45, 135, 225, 315])} M-0.6,0 L-0.6,0.69 O3.4,-4.1 0.7 O5.3,-4.1 0.7`),
);

const WEAPONS = [
  ['dagger', 'Dagger', 'M-2.6,1 L-1.1,1 L1.1,1 L2.6,1 L2.6,1.8 L-2.6,1.8 Z M-1.1,1 L-1.1,-2.4 L0,-5.2 L1.1,-2.4 L1.1,1 M0,0.2 L0,-3.6 M-0.6,1.8 L-0.6,4.271 M0.6,1.8 L0.6,4.271 O0,4.8 0.8', { tags: 'knife blade weapon stab rogue' }],
  ['spear', 'Spear', tilted('M-6,0 L2.6,0 L3.6,1 L6.4,0 L3.6,-1 L2.6,0 M1.6,-0.5 L1.6,0.5 M0.9,-0.5 L0.9,0.5', 45), { tags: 'weapon lance javelin pike hunt' }],
  ['crossed-swords', 'Crossed swords', () => stamp('M0,-4.8 L0,-2.6 L0,6 M-1.5,-2.6 L0,-2.6 L1.5,-2.6 O0,-5.4 0.6', [[0, 0, 1, 40], [0, 0, 1, -40]]), { tags: 'weapon battle fight duel pvp war' }],
  ['war-hammer', 'War hammer', tilted('M-3.4,2 L-1.3,2 L0.8,2 L3.6,3.4 L0.8,4.8 L-3.4,4.8 Z M-1.3,2 L-1.3,-5.4 M-1.8,-3.3 L-0.8,-2.9 M-1.8,-4.3 L-0.8,-3.9', -20), { tags: 'weapon maul smash dwarf thor' }],
  ['scythe', 'Scythe', 'M-2.6,-5 L-0.589,-0.5 L1.198,3.5 L1.6,4.4 C-0.6,5.4 -3.8,4.4 -5.2,1.6 C-3,2 -1,2.8 1.198,3.5 M-0.589,-0.5 L-1.9,0.1', { tags: 'weapon reaper death harvest blade' }],
  ['cannon', 'Cannon', cannon, { tags: 'weapon pirate gun fire ball castle' }],
  ['katana', 'Katana', tilted('M-1.4,0.5 Q2.4,1.9 6.4,1.5 L5.6,0.6 Q2.6,0.6 -1.4,-0.5 M-1.4,-1.1 L-1.4,-0.5 L-1.4,0.5 L-1.4,1.1 M-1.4,0.5 L-5.6,0.5 L-5.6,-0.5 L-1.4,-0.5 M-5,0.5 L-4.2,-0.5 L-3.4,0.5 L-2.6,-0.5 L-1.8,0.5', 30), { tags: 'weapon sword samurai ninja blade japan' }],
  ['boomerang', 'Boomerang', 'M0,3.6 C1.6,3 4.4,-1 5.2,-3.2 C5.6,-4.4 4.2,-5 3.4,-4 C2.6,-2.6 1,-0.4 0,0.4 |', { tags: 'weapon throw return australia toy' }],
  ['dynamite', 'Dynamite', 'M-3,-4.6 L-1,-4.6 L1,-4.6 L3,-4.6 L3,2 L1,2 L0,2 L-1,2 L-3,2 Z M-1,-4.6 L-1,2 M1,-4.6 L1,2 M-3,-1.2 L3,-1.2 M0,2 C0,3.6 1.6,3.4 2,4.4 D2.7,5.1 D1.5,5.2 D2.9,4', { tags: 'tnt explosive bomb blast fuse' }],
  ['ray-gun', 'Ray gun', 'N E-1,1 2.6,1.6 0 360 O-1,1 0.6 M1.473,1.494 L2.4,1.4595 L3.2,1.4298 L4,1.4 L4,1 L4,0.6 L3.2,0.5702 L2.4,0.5405 L1.473,0.506 M2.4,1.4595 L2.4,0.5405 M3.2,1.4298 L3.2,0.5702 M4,1 L4.6,1 O5.3,1 0.7 M-2.528,-0.294 L-3.4,-4.4 L-1.4,-4.4 L-0.909,-2.4 L-0.459,-0.565 M0.3,-0.386 Q0.9,-2.4 -0.909,-2.4', { tags: 'weapon laser blaster space alien zap' }],
  ['flail', 'Flail', () => `M-5,-5 L-1.4,-1.4 D-0.7,-0.7 D0,0 D0.7,0.7 O2.6,2.6 1.8 ${rays(2.6, 2.6, 1.8, 2.9, [0, 45, 90, 135, 180, 270, 315])} M-4.6,-3.8 L-3.8,-4.6`, { tags: 'weapon morning star spiked ball chain knight' }],
];

const MAGIC = [
  ['jewel-ring', 'Jewel ring', 'O0,-1.4 3.2 O0,-1.4 2.4 M0,1.8 L1.5,3.2 L0.8,4.2 L-0.8,4.2 L-1.5,3.2 Z M-1.5,3.2 L1.5,3.2 M3.4,4.2 L3.4,5.4 M2.8,4.8 L4,4.8', { tags: 'jewel treasure diamond wedding gold' }],
  ['amulet', 'Amulet', 'M-4,5 C-3.6,-0.6 3.6,-0.6 4,5 M0,0.8 L1.8,-1.4 L0,-4.6 L-1.8,-1.4 Z M-1.8,-1.4 L1.8,-1.4', { tags: 'necklace pendant jewel charm treasure magic' }],
  ['open-chest', 'Open chest', 'M-4.4,-4.4 L-2.3,-4.4 L2.3,-4.4 L4.4,-4.4 L4.4,-0.6 L-4.4,-0.6 Z M-4.4,-0.6 L-4.4,1.4 C-4.4,4.4 4.4,4.4 4.4,1.4 L4.4,-0.6 M-3.2,-0.6 B-1.4,-0.6 -1 M-0.9,-0.6 B0.9,-0.6 -1 M1.4,-0.6 B3.2,-0.6 -1 M-0.9,-0.6 L-0.9,-2 L0.9,-2 L0.9,-0.6 D0,-1.3 M-2.3,-4.4 L-2.3,-0.6 M2.3,-4.4 L2.3,-0.6 D-2.2,1.6 D0,2.2 D2.2,1.6', { tags: 'treasure gold coins loot pirate box' }],
  ['scroll', 'Scroll', 'M-3.6,3.4 L-3,3.4 L3,3.4 L3.6,3.4 B3.6,4.6 1 L-3.6,4.6 B-3.6,3.4 1 M-3.6,-4.6 L3.6,-4.6 B3.6,-3.4 1 L3,-3.4 L-3,-3.4 L-3.6,-3.4 B-3.6,-4.6 1 M-3,3.4 L-3,-3.4 M3,3.4 L3,-3.4 M-1.8,1.8 L1.8,1.8 M-1.8,0.4 L1.8,0.4 M-1.8,-1 L1.8,-1 M-1.8,-2.2 L0.4,-2.2', { tags: 'paper spell quest letter parchment magic' }],
  ['spell-book', 'Spell book', () => `M-3.6,-4.6 L1.4,-4.6 L2.6,-4.6 L3.6,-4.6 L3.6,4.6 L-3.6,4.6 Z M-2.6,-4.6 L-2.6,4.6 ${star(0.5, 0.4, 2, 0.84)} M1.4,-4.6 L1.4,-5.8 L2,-5.2 L2.6,-5.8 L2.6,-4.6`, { tags: 'magic wizard tome grimoire read' }],
  ['bubbling-cauldron', 'Bubbling cauldron', 'M-4.2,1 L-3.6,1 L3.6,1 L4.2,1 L4.2,1.8 L-4.2,1.8 Z M-3.6,1 C-5,-0.6 -4.4,-4 0,-4 C4.4,-4 5,-0.6 3.6,1 M-2.615,-3.444 L-3.3,-4.8 M2.615,-3.444 L3.3,-4.8 O-2,3 0.7 O0.2,3.6 0.9 O2.2,2.9 0.6 O-1,5.2 0.5', { tags: 'witch potion brew pot magic halloween' }],
  ['magic-lamp', 'Magic lamp', 'M-5.6,2.6 C-4.4,1.6 -3.4,0.8 -2.2,0.8 L-1.2,0.8 L1.2,0.8 L2.2,0.8 C3.4,-0.6 2,-2.2 0,-2.2 C-2,-2.2 -3.6,-2 -4.6,-0.4 Z M-1.2,0.8 Q0,2.6 1.2,0.8 D0,2.6 M2.2,0.8 C4,1.6 5.4,0.6 4.6,-0.4 C4,-1 3.2,-0.6 2.644,-0.259 M0,-2.2 L0,-3.2 M-2,-3.2 L0,-3.2 L2,-3.2 D-6.2,3.8 D-5.4,4.8', { tags: 'genie wish aladdin oil treasure' }],
  ['magic-mirror', 'Magic mirror', 'E0,1.4 3,3.6 0 360 N E0,1.4 2.3,2.9 0 360 M-0.624,-2.121 L-0.624,-5.4 L0.624,-5.4 L0.624,-2.121 M-0.8,2.2 L-0.8,3.4 M-1.4,2.8 L-0.2,2.8 M0.6,-0.2 Q1.6,0.4 1.4,1.8', { tags: 'hand mirror glass reflect fairy queen' }],
  ['emerald', 'Emerald', 'M-2,4.4 L2,4.4 L3.6,2.6 L3.6,-2.6 L2,-4.4 L-2,-4.4 L-3.6,-2.6 L-3.6,2.6 Z M-1.2,2.8 L1.2,2.8 L2,1.8 L2,-1.8 L1.2,-2.8 L-1.2,-2.8 L-2,-1.8 L-2,1.8 Z M-2,4.4 L-1.2,2.8 M2,4.4 L1.2,2.8 M3.6,2.6 L2,1.8 M3.6,-2.6 L2,-1.8 M2,-4.4 L1.2,-2.8 M-2,-4.4 L-1.2,-2.8 M-3.6,-2.6 L-2,-1.8 M-3.6,2.6 L-2,1.8', { tags: 'gem jewel treasure green crystal ruby' }],
  ['rabbit-hat', 'Rabbit in a hat', 'M0,0.4 L3,0.4 L4.4,0.4 L4.4,1.2 L1.6,1.2 M3,0.4 L2.904,-0.8 L2.6,-4.6 L0,-4.6 M0,-0.8 L2.904,-0.8 M1.071,2.389 C2.4,4 2.4,6.2 1.6,6.2 C0.8,6.2 0.5,4.4 0.651,2.662 D0.6,1.9 | M-1.6,1.2 A0,1.2 1.6 180 0 D-3.6,3.2 D3.6,3.6 D3.2,5.2', { tags: 'magic trick bunny magician show' }],
  ['safe', 'Safe', 'M-4.4,-3.8 L-3.4,-3.8 L-2.2,-3.8 L2.2,-3.8 L3.4,-3.8 L4.4,-3.8 L4.4,4.6 L-4.4,4.6 Z M-3.4,-2.8 L3.4,-2.8 L3.4,3.6 L-3.4,3.6 Z O-0.6,0.4 1.6 M-0.6,0.4 L0.3,1.3 M2.2,1.6 L2.2,-0.8 M-3.4,-3.8 L-3.4,-4.8 L-2.2,-4.8 L-2.2,-3.8 M2.2,-3.8 L2.2,-4.8 L3.4,-4.8 L3.4,-3.8', { tags: 'treasure vault money bank lock' }],
];

const soccerBall = () => {
  const p = (r, a) => around(0, 0, r, a);
  const k = [90, 162, 234, 306, 18];
  return `O0,0 4.6 M${k.map((a) => p(1.7, a)).join(' L')} Z ${k.map((a) => `M${p(1.7, a)} L${p(3.3, a)} L${p(4.6, a - 12)} M${p(3.3, a)} L${p(4.6, a + 12)}`).join(' ')}`;
};

const GAMES = [
  ['soccer-ball', 'Soccer ball', soccerBall, { tags: 'football sport goal kick' }],
  ['baseball-bat', 'Baseball bat', () => joinDrawings(stamp('M-5,0.3 L-0.6,0.4 C1.6,0.5 3.4,1 4.6,1 C5.6,1 5.6,-1 4.6,-1 C3.4,-1 1.6,-0.5 -0.6,-0.4 L-5,-0.3 M-5,0.7 L-5,0.3 L-5,-0.3 L-5,-0.7 L-5.6,-0.7 L-5.6,0.7 Z', [[0, 0, 1, 40]]), parsePath('O3.2,-2.6 1.5 M2.5,-1.8 Q3,-2.6 2.5,-3.4 M3.9,-1.8 Q3.4,-2.6 3.9,-3.4')), { tags: 'sport ball hit club' }],
  ['tennis-racket', 'Tennis racket', 'E0,2 2.8,3.4 0 360 M-1.2,-0.55 L-1.2,4.55 M0,-0.9 L0,4.9 M1.2,-0.55 L1.2,4.55 M-2.05,0.6 L2.05,0.6 M-2.3,2 L2.3,2 M-2.05,3.4 L2.05,3.4 M0,-1.4 L0,-2.4 M-0.6,-2.4 L0,-2.4 L0.6,-2.4 L0.6,-5 L-0.6,-5 Z O3.4,-3.6 1', { tags: 'sport ball badminton bat' }],
  ['golf-flag', 'Golf flag', 'M-5.2,-3.4 L-1.2,-3.4 L0,-3.4 L1.2,-3.4 L5.2,-3.4 M-1.2,-3.4 Q0,-4.6 1.2,-3.4 M0,-3.4 L0,3 L0,5 L3.4,4 L0,3 O-3,-2.2 0.6', { tags: 'sport hole green ball putt' }],
  ['bowling-ball', 'Bowling ball', 'O0,0 4.6 O-1,1.6 0.6 O0.8,1.8 0.6 O0.2,0.2 0.6 M-3.2,-0.6 Q-3,-2.6 -1.4,-3.4', { tags: 'sport strike pins alley' }],
  ['dart', 'Dart', tilted('M5.6,0 L3.6,0 L3,0.5 L0.6,0.5 L0,0 L0.6,-0.5 L3,-0.5 L3.6,0 M0,0 L-2.6,0 L-3.8,1.4 L-5.4,1.4 L-4.4,0 L-5.4,-1.4 L-3.8,-1.4 L-2.6,0', -40), { tags: 'game throw target bullseye pub' }],
  ['whistle', 'Whistle', 'M1.598,0.7 A-1,-0.8 3 30 -270 L5.2,2.2 L5.2,0.7 Z O-1,-0.8 0.9 M-4,-0.8 L-4.6,-0.8 O-5.2,-0.8 0.6 M2.6,3.2 L3,4.4 M4,3 L5,3.8', { tags: 'sport referee coach blow sound' }],
  ['podium', 'Podium', () => `M-5,-4.6 L-5,-1.6 L-1.8,-1.6 L-1.8,0.6 L1.8,0.6 L1.8,-2.6 L5,-2.6 L5,-4.6 L1.8,-4.6 L-1.8,-4.6 Z M-1.8,-1.6 L-1.8,-4.6 M1.8,-2.6 L1.8,-4.6 M-0.5,-0.9 L0.1,-0.3 L0.1,-3.4 ${star(0, 2.8, 1.5, 0.63)}`, { tags: 'sport winner first place rank champion' }],
  ['stopwatch', 'Stopwatch', 'O0,-0.8 3.8 M-0.8,3.6 L0.8,3.6 L0.8,4.6 L-0.8,4.6 Z M3.1,2.3 L3.9,3.1 M0,-0.8 L1.4,1 D0,2.2 D3,-0.8 D0,-3.8 D-3,-0.8', { tags: 'sport time timer race speed clock' }],
  ['chess-king', 'Chess king', 'M-3.2,-5 L3.2,-5 L3.2,-4 L-3.2,-4 Z M-2.2,-4 C-0.6,-2 -0.6,0 -1.8,1.6 M2.2,-4 C0.6,-2 0.6,0 1.8,1.6 M-2.4,1.6 L2.4,1.6 L2.4,2.4 L-2.4,2.4 Z M-1.4,2.4 L-1.8,3.8 L1.8,3.8 L1.4,2.4 M0,3.8 L0,5 L0,5.8 M-0.9,5 L0,5 L0.9,5', { tags: 'game piece board checkmate queen' }],
  ['two-dice', 'Two dice', () => joinDrawings(stamp('M-1.8,-1.8 L1.8,-1.8 L1.8,1.8 L-1.8,1.8 Z D-0.9,0.9 D0.9,0.9 D0,0 D-0.9,-0.9 D0.9,-0.9', [[-2.2, -1.6, 1, -12]]), stamp('M-1.8,-1.8 L1.8,-1.8 L1.8,1.8 L-1.8,1.8 Z D-0.9,0.9 D0,0 D0.9,-0.9', [[2.4, 1.4, 1, 15]])), { tags: 'game roll luck board random' }],
  ['joystick', 'Joystick', 'M-4,-4.6 L4,-4.6 L3.2,-2.2 L2.6,-2.2 L1.6,-2.2 L0.5,-2.2 L-0.5,-2.2 L-3.2,-2.2 Z M-0.5,-2.2 L-0.5,1.68 M0.5,-2.2 L0.5,1.68 O0,3.2 1.6 M1.6,-2.2 L1.6,-1.5 L2.6,-1.5 L2.6,-2.2', { tags: 'game arcade controller stick play' }],
  ['arcade', 'Arcade machine', 'M-3.2,-5 L3.2,-5 L3.2,5 L-3.2,5 Z M-3.2,3.6 L3.2,3.6 M-2.2,0.4 L2.2,0.4 L2.2,2.8 L-2.2,2.8 Z M-3.2,-0.6 L3.2,-0.6 M-3.2,-1.8 L3.2,-1.8 D-1.4,-1.2 D0.6,-1.2 D1.6,-1.2 M-0.6,-3 L0.6,-3 L0.6,-4 L-0.6,-4 Z D-1.2,1.6 D0,1.6 D1.2,1.6', { tags: 'game cabinet retro video coin' }],
  ['teddy-bear', 'Teddy bear', 'M1.905,3.7 B0.68,4.692 1.3 O3.6,-0.8 0.9 O3,-5.4 0.9 D0.8,3.1 | O0,2.6 2.2 N E0,-2.6 2.6,2.4 0 360 O0,-2.6 1.2 D0,2.4 M-0.6,1.8 Q0,1.2 0.6,1.8', { tags: 'toy bear soft cuddly plush' }],
  ['beach-ball', 'Beach ball', () => `O0,0 4.6 M-1.4,2.2 Q-0.6,3.6 0,4.6 M-1.4,2.2 Q2.4,2.4 4.6,0 M-1.4,2.2 Q-0.2,-1.6 0,-4.6 M-1.4,2.2 Q-3.2,1.6 -4.6,0 M-1.4,2.2 Q-2.6,-0.8 ${around(0, 0, 4.6, 228)}`, { tags: 'toy summer sea holiday play' }],
  ['chequered-flag', 'Chequered flag', 'M-4.4,-5 L-4.4,-0.6 L-4.4,2 L-4.4,4.6 L-1.4,4.6 L1.6,4.6 L4.6,4.6 L4.6,2 L4.6,-0.6 L1.6,-0.6 L-1.4,-0.6 L-4.4,-0.6 M-4.4,2 L-1.4,2 L1.6,2 L4.6,2 M-1.4,4.6 L-1.4,2 L-1.4,-0.6 M1.6,4.6 L1.6,2 L1.6,-0.6 M-4.4,4.6 L-1.4,2 L1.6,-0.6 M-1.4,4.6 L-4.4,2 M-1.4,-0.6 L1.6,2 L4.6,4.6 M1.6,4.6 L4.6,2', { tags: 'race finish win checkered sport car' }],
  ['eight-ball', 'Eight ball', 'O0,0 4.6 O0,0.6 2 M0,0.7 C1.2,1.2 1,2.1 0,2.1 C-1,2.1 -1.2,1.2 0,0.7 C1.4,0.1 1.2,-0.9 0,-0.9 C-1.2,-0.9 -1.4,0.1 0,0.7', { tags: 'pool billiards snooker game 8' }],
];

const MORE_MUSIC = [
  ['violin', 'Violin', tilted('M0,-5 C2,-5 2.8,-3.6 2.6,-2.4 C2.4,-1.6 1.6,-1.4 1.6,-0.8 C1.6,-0.2 2.2,0 2.2,0.8 C2.2,1.8 1.2,2.4 0.5,2.4 L0.5,4.6 L0,4.6 M0.7,-0.2 Q1.1,-1.1 0.7,-2 | M0,4.6 L0,-3.6 M0,4.6 L0,5.2 O0,5.9 0.7', -30), { tags: 'music strings fiddle cello orchestra' }],
  ['snare-drum', 'Snare drum', 'E0,1 4,1.4 0 360 M-4,1 L-4,-2.6 M4,1 L4,-2.6 N E0,-2.6 4,1.4 180 360 M-3.236,0.177 L-2.351,-3.733 L-1.236,-0.331 L0,-4 L1.236,-0.331 L2.351,-3.733 L3.236,0.177 M-3.8,5.6 L2.6,3.2 M3.8,5.6 L-2.6,3.2', { tags: 'music drum sticks beat band' }],
  ['maracas', 'Maracas', () => stamp('E0,3 1.8,2.4 0 360 M0,0.6 L0,-4.4 D-0.6,3.6 D0.5,2.6 D0,4.2', [[-1.2, 0, 1, 25], [1.2, 0, 1, -25]]), { tags: 'music shake rattle latin party' }],
  ['harp', 'Harp', 'M-3,-4.6 L-3,4 C-1,5.6 1.2,4.2 3.4,4.4 L-2.2,-4.6 L-3,-4.6 L-3.8,-4.6 M-1.8,4 L-1.8,-3.957 M-0.9,4.15 L-0.9,-2.511 M0.1,4.1 L0.1,-0.903 M1,3.95 L1,0.543 M2,3.8 L2,2.15', { tags: 'music strings angel classical' }],
  ['electric-guitar', 'Electric guitar', tilted('M0,-5 C2.2,-5 3.2,-3.6 3,-2.2 C2.9,-1 2.2,-0.6 2.4,0.2 L2.2,2.2 L0.5,0.6 L0.5,4.4 L1.1,4.4 L1.1,5.6 L0,5.6 | M-1.2,-1.4 L1.2,-1.4 M-1.2,-2.4 L1.2,-2.4 M-0.9,-3.6 L0.9,-3.6 M0,4.4 L0,-3.6 D2,-3.2 D1.4,-4.1', -35), { tags: 'music rock band strings metal' }],
  ['record-player', 'Record player', 'M-4.6,-4.6 L4.6,-4.6 L4.6,4.6 L-4.6,4.6 Z O-0.6,0 3.4 O-0.6,0 1.2 D-0.6,0 M3.8,3.6 L3.8,0.4 L2.2,-1.6 D3.8,-3.6', { tags: 'music vinyl turntable disc dj' }],
  ['cassette', 'Cassette', 'M-5,-3.2 L-2.6,-3.2 L2.6,-3.2 L5,-3.2 L5,3.2 L-5,3.2 Z M-3.4,-1 L3.4,-1 L3.4,1.6 L-3.4,1.6 Z O-1.8,0.3 0.8 O1.8,0.3 0.8 M-2.6,-3.2 L-2,-2 L2,-2 L2.6,-3.2', { tags: 'music tape retro mix recorder' }],
  ['metronome', 'Metronome', 'M-2.8,-5 L2.8,-5 L1.2,4.6 L-1.2,4.6 Z M-2.567,-3.6 L0,-3.6 L2.567,-3.6 M0,-3.6 L1.1,2 O0.66,-0.24 0.6', { tags: 'music tempo beat tick time' }],
  ['lyre', 'Lyre', 'M1.6,-4 C4.8,-3 4.4,2 2.6,4.6 M0,-4 L1.6,-4 L1.6,-5 L0,-5 M0.5,3.2 L0.3,-2.6 M1.5,3.2 L0.9,-2.6 M0,3.2 L4,3.2 M0,-3.2 L1.2,-3.2 |', { tags: 'music harp strings greek bard' }],
];

const HOME = [
  ['sofa', 'Sofa', 'M-3.4,2.4 Q-3.4,3.2 -2.6,3.2 L2.6,3.2 Q3.4,3.2 3.4,2.4 L3.4,1.2 L3.4,-0.4 L3.4,-2.8 L0,-2.8 L-3.4,-2.8 L-3.4,-0.4 L-3.4,1.2 Z M-3.4,1.2 L-4.2,1.2 Q-5,1.2 -5,0.4 L-5,-2.8 L-4.4,-2.8 L-3.4,-2.8 M3.4,1.2 L4.2,1.2 Q5,1.2 5,0.4 L5,-2.8 L4.4,-2.8 L3.4,-2.8 M-3.4,-0.4 L0,-0.4 L3.4,-0.4 M0,-0.4 L0,-2.8 M-4.4,-2.8 L-4.4,-3.8 M4.4,-2.8 L4.4,-3.8', { tags: 'couch seat furniture living room' }],
  ['bathtub', 'Bathtub', 'M-5.2,1.4 L3.6,1.4 L5.2,1.4 L5.2,0.6 L4.6,0.6 L-4.6,0.6 L-5.2,0.6 Z M-4.6,0.6 C-4.6,-2.6 -3,-3.2 -2,-3.2 L-1.6,-3.2 L1.6,-3.2 L2,-3.2 C3,-3.2 4.6,-2.6 4.6,0.6 M-1.6,-3.2 L-2,-4.2 M1.6,-3.2 L2,-4.2 M3.6,1.4 L3.6,3.2 L2.2,3.2 L2.2,2.6 O-3,2.8 0.8 O-1,2.6 0.6 O-2,4.4 0.5', { tags: 'bath wash bubbles bathroom water' }],
  ['toilet', 'Toilet', 'M-4.4,0.6 L-4.4,4 L-4.4,5 L-1.8,5 L-1.8,0.6 L-2.6,0.6 Z M-1.8,0.6 L4.4,0.6 L4.4,-0.2 L3.8,-0.2 L-1.8,-0.2 L-1.8,0.6 M3.8,-0.2 C3.6,-2 2,-2.8 0.6,-2.8 L1,-4.8 L-3,-4.8 L-2.6,0.6 M-4.4,4 L-5.2,4', { tags: 'bathroom loo wc flush' }],
  ['tap', 'Tap', () => joinDrawings(parsePath('M-5,2.4 L-1.6,2.4 L0.6,2.4 C2.6,2.4 3.6,1.2 3.6,-0.6 L3.6,-1.4 L1.8,-1.4 L1.8,-0.6 C1.8,0.2 1.4,0.6 0.6,0.6 L-5,0.6 Z M-1.6,2.4 L-1.6,3.6 M-3,3.6 L-1.6,3.6 L-0.2,3.6'), stamp(DROP, [[2.7, -4.6, 0.22]])), { tags: 'water faucet drip sink bathroom' }],
  ['fridge', 'Fridge', 'M-3,-5 L3,-5 L3,1.6 L3,5 L-3,5 L-3,1.6 Z M-3,1.6 L3,1.6 M-2,2.4 L-2,3.8 M-2,0.8 L-2,-1.6', { tags: 'kitchen cold food freezer' }],
  ['picture-frame', 'Picture frame', 'M-4.6,-3.8 L4.6,-3.8 L4.6,3.8 L1.6,3.8 L-1.6,3.8 L-4.6,3.8 Z M-3.8,-3 L3.8,-3 L3.8,3 L-3.8,3 Z M-3,-2.2 L-1,0.6 L0.2,-0.8 L1.4,0.4 L3,-2.2 O2.2,1.8 0.6 M-1.6,3.8 L0,5.2 L1.6,3.8', { tags: 'painting photo art wall gallery' }],
  ['books', 'Stack of books', 'M-4.6,-4.2 L4.6,-4.2 L4.6,-1.8 L4,-1.8 L4,0.4 L3.2,0.4 L3.2,2.6 L-4.4,2.6 L-4.4,0.4 L-3.8,0.4 L-3.8,-1.8 L-4.6,-1.8 Z M-3.8,-1.8 L4,-1.8 M-3.8,0.4 L3.2,0.4 M-3.4,-4.2 L-3.4,-1.8 M-2.6,-1.8 L-2.6,0.4 M-3.2,0.4 L-3.2,2.6', { tags: 'read library school study pile' }],
  ['alarm-clock', 'Alarm clock', 'N A2.6,3.2 1.1 -45 135 Z M2.116,-3.512 L3,-4.8 | O0,-0.6 3.6 M0,-0.6 L0,1.6 M0,-0.6 L1.6,-0.6 M0,3 L0,4.2 M-0.6,4.2 L0,4.2 L0.6,4.2', { tags: 'time wake morning ring bell' }],
  ['calendar', 'Calendar', () => `M-4,-4.6 L4,-4.6 L4,3.6 L-4,3.6 Z M-4,1.8 L4,1.8 M-2,2.8 L-2,4.6 M2,2.8 L2,4.6 ${[0.5, -0.9, -2.3, -3.6].flatMap((y) => [-2.6, -1.3, 0, 1.3, 2.6].map((x) => `D${x},${y}`)).join(' ')}`, { tags: 'date day month year plan event' }],
  ['trash-can', 'Trash can', 'M-3.8,2.4 L-3,2.4 L3,2.4 L3.8,2.4 L3.8,3.4 L1,3.4 L-1,3.4 L-3.8,3.4 Z M-3,2.4 L-2.4,-4.8 L2.4,-4.8 L3,2.4 M-1,3.4 L-1,4.4 L1,4.4 L1,3.4 M-1.2,1.2 L-1,-3.6 M0,1.2 L0,-3.6 M1.2,1.2 L1,-3.6', { tags: 'bin rubbish garbage delete waste' }],
  ['toothbrush', 'Toothbrush', tilted('M-5.4,-0.5 L5.6,-0.5 L5.6,0.5 L5,0.5 L4.2,0.5 L3.4,0.5 L2.6,0.5 L-5.4,0.5 B-5.4,-0.5 1 M2.6,0.5 L2.6,1.8 L3.4,1.8 L4.2,1.8 L5,1.8 L5,0.5 M3.4,0.5 L3.4,1.8 M4.2,0.5 L4.2,1.8 M2.8,2.4 C3,3.2 3.8,3.2 4,2.6 C4.2,3.2 4.8,3 5,2.4', 30), { tags: 'teeth clean bathroom brush dentist' }],
  ['backpack', 'Backpack', 'M0,-4.6 L2.2,-4.6 L3.4,-4.6 L3.4,-3.8 L3.4,0 L3.4,1.4 C3.4,3.6 2,4.2 0,4.2 M2.2,-4.6 L2.2,-1.4 L0,-1.4 M0,-2.4 L1.4,-2.4 M3.4,0 L4.4,-0.6 L4.4,-3.4 L3.4,-3.8 | M-3.4,1.4 Q0,-0.2 3.4,1.4 M-1.2,4.8 Q0,6 1.2,4.8', { tags: 'bag school rucksack travel hike' }],
  ['camera', 'Camera', 'M-5,-3.4 L5,-3.4 L5,2.4 L2.2,2.4 L1.6,3.6 L-1.6,3.6 L-2.2,2.4 L-3,2.4 L-4.2,2.4 L-5,2.4 Z O0,-0.6 2.2 O0,-0.6 1.2 D3.8,1.3 M-4.2,2.4 L-4.2,3.1 L-3,3.1 L-3,2.4', { tags: 'photo picture snap lens film' }],
  ['floppy-disk', 'Floppy disk', 'M-4.4,-4.4 L-3.2,-4.4 L3.2,-4.4 L4.4,-4.4 L4.4,3.2 L3.2,4.4 L2.2,4.4 L-2.2,4.4 L-4.4,4.4 Z M-2.2,4.4 L-2.2,1.8 L2.2,1.8 L2.2,4.4 M0.6,3.8 L0.6,2.4 L1.4,2.4 L1.4,3.8 Z M-3.2,-4.4 L-3.2,-0.6 L3.2,-0.6 L3.2,-4.4 M-2.2,-1.8 L2.2,-1.8 M-2.2,-3 L2.2,-3', { tags: 'save disk computer file retro' }],
  ['coat-hanger', 'Coat hanger', 'M0,2.2 L-5,-1.2 L5,-1.2 Z M0,2.2 L0,3.4 C0,5.4 2.4,5.4 2.4,3.6', { tags: 'clothes wardrobe hang closet' }],
  ['shopping-cart', 'Shopping cart', 'M-5.2,3.8 L-3.8,3.8 L-3.4,2.2 L-3,0.6 L-2.6,-1 L-2.2,-2.6 L3.6,-2.6 M-3.4,2.2 L-1,2.2 L1,2.2 L3,2.2 L4.8,2.2 L4.3,0.6 L3.8,-1 L3,-1 L1,-1 L-1,-1 L-2.6,-1 M-1,2.2 L-1,-1 M1,2.2 L1,-1 M3,2.2 L3,-1 M-3,0.6 L4.3,0.6 O-1.4,-3.8 0.7 O2.8,-3.8 0.7', { tags: 'shop trolley buy store basket' }],
  ['cardboard-box', 'Cardboard box', 'M-3.6,-4.4 L3.6,-4.4 L3.6,0.6 L0,0.6 L-3.6,0.6 Z M-3.6,0.6 L-5.2,2.4 L-1.6,2.4 L0,0.6 L1.6,2.4 L5.2,2.4 L3.6,0.6 M0,0.6 L0,-1.2 M-1.2,-2 L1.2,-2 L1.2,-3.4 L-1.2,-3.4 Z', { tags: 'package parcel delivery crate open' }],
];

const christmasTree = () => `M0,4 L-2,1.6 L-1,1.6 L-3,-1 L-2,-1 L-4.2,-3.8 L-0.8,-3.8 L0.8,-3.8 L4.2,-3.8 L2,-1 L3,-1 L1,1.6 L2,1.6 Z M-0.8,-3.8 L-0.8,-5 L0.8,-5 L0.8,-3.8 ${star(0, 5.2, 1.1, 0.46)} D-0.9,0.3 D0.8,-0.3 D-2,-2.6 D0,-2.4 D2,-2.7 D0.1,2.3`;
const menorah = () => `M-2,-5 L0,-5 L2,-5 M0,-5 L0,3.8 ${[1.2, 2.4, 3.6, 4.8].map((r) => `M${-r},3.8 L${-r},3.2 A0,3.2 ${r} 180 360 L${r},3.8`).join(' ')} ${[-4.8, -3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6, 4.8].map((x) => `D${x},4.6`).join(' ')}`;
const clapperboard = () => joinDrawings(
  parsePath('M-4.6,-4.4 L4.6,-4.4 L4.6,1.2 L4.6,2.4 L-4.6,2.4 L-4.6,1.2 Z M-4.6,1.2 L4.6,1.2 M-3.4,1.2 L-2.6,2.4 M-1.2,1.2 L-0.4,2.4 M1,1.2 L1.8,2.4 M3.2,1.2 L4,2.4 M-3.4,-0.8 L3.4,-0.8 M-3.4,-2.6 L0.4,-2.6'),
  stamp('M0,0 L9.2,0 L9.2,1.2 L0,1.2 Z M1.2,0 L2,1.2 M3.4,0 L4.2,1.2 M5.6,0 L6.4,1.2 M7.8,0 L8.6,1.2', [[-4.6, 2.9, 1, 15]]),
);

const PARTY = [
  ['christmas-tree', 'Christmas tree', christmasTree, { tags: 'holiday pine star baubles winter festive' }],
  ['wreath', 'Wreath', () => `${scallop(0, 1.4, 3.2, 10, 0.6)} O0,1.4 1.8 D1.25,3.565 D-2.5,1.4 D1.25,-0.765 M0,-3.6 L-1.8,-2.8 L-1.8,-4.4 Z M0,-3.6 L1.8,-2.8 L1.8,-4.4 Z M0,-3.6 L-0.8,-5.2 M0,-3.6 L0.8,-5.2`, { tags: 'christmas door holly bow holiday festive' }],
  ['coffin', 'Coffin', 'M-1.8,5 L1.8,5 L3.2,2.4 L1.8,-5 L-1.8,-5 L-3.2,2.4 Z M0,3.2 L0,1.6 L0,-1.6 M-1.2,1.6 L0,1.6 L1.2,1.6', { tags: 'halloween vampire death spooky grave' }],
  ['gravestone', 'Gravestone', 'M-5,-3.6 L-3,-3.6 L3,-3.6 L5,-3.6 M-3,-3.6 L-3,1.6 C-3,5.4 3,5.4 3,1.6 L3,-3.6 M0,2.8 L0,1.4 L0,-1.2 M-1.3,1.4 L0,1.4 L1.3,1.4', { tags: 'halloween tomb rip grave death spooky' }],
  ['disco-ball', 'Disco ball', 'O0,-0.6 3.8 M-3.8,-0.6 L3.8,-0.6 M-3.447,1 L3.447,1 M-3.447,-2.2 L3.447,-2.2 M0,3.2 L0,-4.4 M-1.6,2.847 L-1.6,-4.047 M1.6,2.847 L1.6,-4.047 M0,3.2 L0,5.4 M4.2,2.8 L4.2,4 M3.6,3.4 L4.8,3.4 M-4.2,3.4 L-4.2,4.6 M-4.8,4 L-3.6,4', { tags: 'party dance mirror club music' }],
  ['firework-rocket', 'Firework rocket', tilted('M-1,-1 L0,-1 L1,-1 L1,2.6 L0,4.6 L-1,2.6 Z M0,-1 L0,-5.4 M-1,1.6 L1,1.6 M-1,0.2 L1,0.2 M-1,2.6 L1,2.6 D-1.8,4.6 D1.8,4.6 D0,5.8', -30), { tags: 'party new year bang celebrate bonfire' }],
  ['paper-lantern', 'Paper lantern', 'E0,0 3.4,3 0 360 M0,2.1 L0,-2.1 M-1.4,2.1 Q-2.3,0 -1.4,-2.1 M1.4,2.1 Q2.3,0 1.4,-2.1 M-1.4,3.5 L1.4,3.5 L1.4,4.3 L0,4.3 L-1.4,4.3 Z M-1.4,-3.5 L1.4,-3.5 L1.4,-4.3 L0,-4.3 L-1.4,-4.3 Z M0,4.3 L0,5.4 M0,-4.3 L0,-5.6', { tags: 'chinese new year festival light lamp' }],
  ['menorah', 'Menorah', menorah, { tags: 'hanukkah candles jewish festival lights' }],
  ['easter-basket', 'Easter basket', 'M-4,0 L-3.2,0 L-2,0 L-1.4,0 L-0.9,0 L0,0 L0.9,0 L1.4,0 L2,0 L3.2,0 L4,0 L3,-4.4 L2,-4.4 L0,-4.4 L-2,-4.4 L-3,-4.4 Z M-3.2,0 C-3.2,2.4 -1.4,2.4 -1.4,0 M-0.9,0 C-0.9,2.8 0.9,2.8 0.9,0 M1.4,0 C1.4,2.4 3.2,2.4 3.2,0 M-4,0 C-4,6.6 4,6.6 4,0 M-3.682,-1.4 L3.682,-1.4 M-3.364,-2.8 L3.364,-2.8 M-2,0 L-2,-4.4 M0,0 L0,-4.4 M2,0 L2,-4.4', { tags: 'eggs spring bunny holiday picnic' }],
  ['clapperboard', 'Clapperboard', clapperboard, { tags: 'film movie cinema action director' }],
  ['ticket', 'Ticket', () => stamp(`M-5,-2.6 L5,-2.6 L5,-0.8 B5,0.8 -1 L5,2.6 L-5,2.6 L-5,0.8 B-5,-0.8 -1 Z D2,-1.8 D2,-0.6 D2,0.6 D2,1.8 ${star(-1.4, 0, 1.5, 0.63)}`, [[0, 0, 1, 20]]), { tags: 'cinema show entry pass event fair' }],
  ['snow-globe', 'Snow globe', 'O0,1 3.8 M-2.543,-1.824 L2.543,-1.824 L2.968,-3.3 L3.4,-4.8 L-3.4,-4.8 L-2.968,-3.3 Z M-2.968,-3.3 L2.968,-3.3 M0,3.2 L-1.3,0.6 L0,0.6 L1.3,0.6 Z M0,0.6 L0,-0.6 D-2,2.6 D1.9,3 D2.5,0.6 D-2.5,0.2 D-1,3.8', { tags: 'christmas winter souvenir shake snow' }],
];

const MORE_VEHICLES = [
  ['scooter', 'Scooter', 'O-3.4,-4 1 O3,-4 1 M-2.4,-4 L2,-4 M3,-3 L2.2,4.4 M1.2,4.4 L2.2,4.4 L3.2,4.4 M-4.6,-2.6 Q-3.4,-1.8 -2.4,-2.8', { tags: 'ride kick wheels toy street' }],
  ['tractor', 'Tractor', 'O-2.4,-2.4 2.6 O-2.4,-2.4 0.9 O3.4,-3.6 1.4 M-3.2,0.8 L-3.2,4.8 L0.8,4.8 L0.8,0.8 Z M-2.4,2.2 L0,2.2 L0,4 L-2.4,4 Z M0.8,0.8 L3.4,0.8 L4.6,0.8 L4.6,-1.4 L0.8,-1.4 L0.8,0.8 M3.4,0.8 L3.4,2.6 M2.9,2.6 L3.4,2.6 L3.9,2.6', { tags: 'farm vehicle field plough' }],
  ['race-car', 'Race car', 'M-5.8,-2.6 L-5,-2.6 A-3.2,-2.6 1.8 180 0 L1.4,-2.6 A3.2,-2.6 1.8 180 0 L5.8,-2.6 L5.8,-1.2 L2.4,-0.4 L1,1.4 L-2.2,1.4 L-4.4,-0.2 L-5.8,-0.2 Z O-3.2,-2.6 1 O3.2,-2.6 1 M-1.8,0.8 L0.7,0.8 L1.4,-0.1 L-2.8,-0.1 Z M-5.8,-0.2 L-5.8,1 M-6.4,1 L-5.8,1 L-5,1', { tags: 'sports fast speed track car spoiler' }],
  ['tank', 'Tank', 'M-3.6,-4.6 L3.6,-4.6 B3.6,-2.2 1 L-3.6,-2.2 B-3.6,-4.6 1 D-3,-3.4 D-1,-3.4 D1,-3.4 D3,-3.4 M-4.4,-1.6 L4.4,-1.6 L3.4,0.2 L2,0.2 L-2,0.2 L-3.6,0.2 Z M-2,0.2 L-1.6,2.2 L-0.6,2.2 L0.6,2.2 L1.6,2.2 L1.68,1.8 L1.84,1 L2,0.2 M1.84,1 L5.8,1.6 L5.7,2.4 L1.68,1.8 M-0.6,2.2 L-0.6,2.9 L0.6,2.9 L0.6,2.2', { tags: 'army war vehicle gun military' }],
  ['airship', 'Airship', 'E0,1 5,2.6 0 360 M-1.545,-1.473 L-1.1,-2.8 L1.1,-2.8 L1.545,-1.473 D-0.5,-2.2 D0.5,-2.2 M-4.045,2.528 L-5.8,3.8 L-4.891,1.541 M-4.891,0.459 L-5.8,-1.8 L-4.045,-0.528 M-2.034,3.375 Q-2.8,1 -2.034,-1.375 M2.034,3.375 Q2.8,1 2.034,-1.375', { tags: 'blimp zeppelin balloon fly sky' }],
  ['fighter-jet', 'Fighter jet', 'M0,5.6 L0.6,3.6 L0.8,1 L4.6,-2.2 L4.6,-3.2 L1,-2.4 L1,-3.6 L2.4,-4.8 L2.4,-5.4 L0,-4.8 | M0,3.6 L0,2', { tags: 'plane fly fast army air force' }],
  ['paper-plane', 'Paper plane', 'M-5.4,1.8 L5.2,3.6 L0.4,-5 L-1.2,-0.6 Z M-1.2,-0.6 L2.4,1.6', { tags: 'fly send message fold origami' }],
  ['satellite', 'Satellite', tilted('M1,-1 L1,0 L1,1 L0,1 M1,0 L1.8,0 L2.8,0 L3.8,0 L4.8,0 M1.8,-1 L2.8,-1 L3.8,-1 L4.8,-1 L4.8,1 L3.8,1 L2.8,1 L1.8,1 Z M2.8,-1 L2.8,1 M3.8,-1 L3.8,1 M1,-1 L0,-1 | M0,1 L0,2 M-1,2.8 Q0,1.2 1,2.8 D0,3', 30), { tags: 'space orbit signal solar station' }],
  ['canoe', 'Canoe', 'M-5.6,1.6 C-4.4,0.6 -3,0.4 0,0.4 C3,0.4 4.4,0.6 5.6,1.6 C4.4,-2 2,-2.6 0,-2.6 C-2,-2.6 -4.4,-2 -5.6,1.6 M-3,4.6 L1.8,2.4 L3,3 L4.2,2 L3,1.4 L1.8,2.4 M-5,-4 Q-3.75,-3.2 -2.5,-4 Q-1.25,-4.8 0,-4 Q1.25,-3.2 2.5,-4 Q3.75,-4.8 5,-4', { tags: 'boat kayak paddle river row' }],
  ['pirate-ship', 'Pirate ship', 'M-5,-1.6 L-3,-1.6 L0,-1.6 L5,-1.6 L3.6,-4.4 L-3.2,-4.4 Z M-5,-1.6 L-5,0 L-3,0 L-3,-1.6 M0,-1.6 L0,0 L0,3.6 L0,4 L0,5 L1.8,4.5 L0,4 M-2.6,3.6 L0,3.6 L2.6,3.6 L2.2,0 L0,0 L-2.2,0 Z M5,-1.6 L6,-0.4 D-1.6,-3 D0,-3 D1.6,-3', { tags: 'boat sail sea galleon treasure' }],
  ['cable-car', 'Cable car', 'M-5.4,3 L0,4 L5.4,5 M0,4 L0,2.4 M-3.2,-3.6 L3.2,-3.6 L3.6,0.4 L3,2.4 L1.2,2.4 L0,2.4 L-1.2,2.4 L-3,2.4 L-3.6,0.4 Z M-3.6,0.4 L-1.2,0.4 L1.2,0.4 L3.6,0.4 M-1.2,2.4 L-1.2,0.4 M1.2,2.4 L1.2,0.4', { tags: 'gondola mountain ski lift ride' }],
  ['sledge', 'Sledge', 'M-5,-3 L-3.6,-3 L-0.6,-3 L2.2,-3 L3.2,-3 C5.2,-3 5.4,-0.6 4,-0.2 M-4.6,-0.4 L-3.6,-0.4 L-0.6,-0.4 L2.2,-0.4 L3,-0.4 L3,0.4 L-4.6,0.4 Z M-3.6,-0.4 L-3.6,-3 M-0.6,-0.4 L-0.6,-3 M2.2,-0.4 L2.2,-3', { tags: 'sled snow winter slide toboggan' }],
  ['mine-cart', 'Mine cart', 'M-4.6,1.6 L-4,1.6 L-1.33,1.6 L1.33,1.6 L4,1.6 L4.6,1.6 L4.6,2.4 L3.6,2.4 L-3.6,2.4 L-4.6,2.4 Z M-4,1.6 L-3,-2.4 L-1,-2.4 L1,-2.4 L3,-2.4 L4,1.6 M-1.33,1.6 L-1,-2.4 M1.33,1.6 L1,-2.4 O-2,-3.8 0.9 O2,-3.8 0.9 M-5.4,-5.3 L5.4,-5.3 M-3.6,2.4 L-2.6,3.8 L-1.4,3 L-0.4,4.4 L1,3.2 L2.2,4 L3.6,2.4', { tags: 'minecart rail ore wagon trolley' }],
  ['steering-wheel', 'Steering wheel', 'O0,0 4.6 O0,0 3.8 O0,0 1 M1,0 L3.8,0 M-1,0 L-3.8,0 M0,-1 L0,-3.8', { tags: 'car drive wheel racing' }],
  ['road', 'Road', 'M-4.6,-5 L-1,5 M4.6,-5 L1,5 M-5.4,5 L-1,5 L1,5 L5.4,5 M0,-4.6 L0,-2.8 M0,-1.6 L0,0 M0,1 L0,2.4 M0,3.2 L0,4.2', { tags: 'street highway path journey way' }],
  ['signpost', 'Signpost', 'M0,5 L0,4.4 M-2.4,2.4 L0,2.4 L2.6,2.4 L3.8,3.4 L2.6,4.4 L0,4.4 L-2.4,4.4 Z M0,2.4 L0,1.6 M2.4,-0.4 L0,-0.4 L-2.6,-0.4 L-3.8,0.6 L-2.6,1.6 L0,1.6 L2.4,1.6 Z M0,-0.4 L0,-5', { tags: 'direction way sign arrows path' }],
  ['traffic-cone', 'Traffic cone', 'M-1,4.6 L1,4.6 L1.488,2.6 L1.976,0.6 L2.512,-1.6 L3,-3.6 L-3,-3.6 L-2.512,-1.6 L-1.976,0.6 L-1.488,2.6 Z M-1.488,2.6 L1.488,2.6 M-1.976,0.6 L1.976,0.6 M-2.512,-1.6 L2.512,-1.6 M-4.4,-3.6 L-3,-3.6 M3,-3.6 L4.4,-3.6 L4.4,-4.6 L-4.4,-4.6 L-4.4,-3.6', { tags: 'road works warning pylon safety' }],
  ['suitcase', 'Suitcase', 'M-3.2,-3.8 L-2.6,-3.8 L-1.8,-3.8 L1.8,-3.8 L2.6,-3.8 L3.2,-3.8 L3.2,2.6 L1.8,2.6 L0.9,2.6 L-0.9,2.6 L-1.8,2.6 L-3.2,2.6 Z M-0.9,2.6 L-0.9,4.8 L0.9,4.8 L0.9,2.6 M-1.8,2.6 L-1.8,-3.8 M1.8,2.6 L1.8,-3.8 M-2.6,-3.8 L-2.6,-4.6 L-1.8,-4.6 L-1.8,-3.8 M1.8,-3.8 L1.8,-4.6 L2.6,-4.6 L2.6,-3.8', { tags: 'luggage bag holiday trip pack' }],
  ['lifebuoy', 'Lifebuoy', () => `O0,0 4.6 O0,0 2.4 ${rays(0, 0, 2.4, 4.6, [30, 60, 120, 150, 210, 240, 300, 330])}`, { tags: 'life ring rescue swim boat safety' }],
  ['jetpack', 'Jetpack', 'M0.4,-1.6 L0.4,0 L0.4,1.4 L0.4,2.6 C0.4,4.4 2.8,4.4 2.8,2.6 L2.8,-1.6 L2.3,-1.6 L0.9,-1.6 Z M0.9,-1.6 L0.6,-2.8 L2.6,-2.8 L2.3,-1.6 M0.8,-3.4 L1.6,-5.6 L2.4,-3.4 | M-0.4,1.4 L0.4,1.4 M-0.4,0 L0.4,0', { tags: 'fly rocket pack space boost' }],
  ['unicycle', 'Unicycle', () => `O0,-2 3 M0,-2 L0,3.8 M-1.6,4.4 Q0,3.2 1.6,4.4 ${rays(0, -2, 0.8, 2.3, [30, 150, 210, 270, 330])}`, { tags: 'circus wheel ride balance clown' }],
  ['roller-skate', 'Roller skate', 'M-2.6,4.6 L-2.6,-1.4 L3.4,-1.4 C3.4,0.2 2,0.8 0.2,1 L0.2,2 L0.2,3.2 L0.2,4.6 Z M-3,-2.1 L3.8,-2.1 O-1.6,-3.6 1 O2.4,-3.6 1 M0.2,2 L-1,2 M0.2,3.2 L-1,3.2', { tags: 'skate wheels boot disco ride' }],
];

const circusTent = () => `M-5,-4.6 L-5,-1 L0,3.6 L5,-1 L5,-4.6 L2.5,-4.6 L1.4,-4.6 L-1.4,-4.6 L-2.5,-4.6 Z M-5,-1${[1, 2, 3, 4, 5, 6, 7, 8].map((i) => ` B${fix(-5 + 1.25 * i)},-1 0.5`).join('')} M-2.5,-1 L-2.5,-4.6 M2.5,-1 L2.5,-4.6 M-1.4,-4.6 L0,-2 L1.4,-4.6 M0,3.6 L0,4.4 L0,5.4 L1.4,4.9 L0,4.4`;
const carousel = () => `M-5,1.6 L0,5 L5,1.6 M-5,1.6${[1, 2, 3, 4, 5, 6, 7, 8].map((i) => ` B${fix(-5 + 1.25 * i)},1.6 0.5`).join('')} M-2.5,1.6 L-2.5,-0.4 L-2.5,-2.4 L-2.5,-4 M-2.5,-0.4 L-1.7,-1.4 L-2.5,-2.4 L-3.3,-1.4 Z M0,1.6 L0,0.4 L0,-1.6 L0,-4 M0,0.4 L0.8,-0.6 L0,-1.6 L-0.8,-0.6 Z M2.5,1.6 L2.5,-0.4 L2.5,-2.4 L2.5,-4 M2.5,-0.4 L3.3,-1.4 L2.5,-2.4 L1.7,-1.4 Z M-5,-4 L-2.5,-4 L0,-4 L2.5,-4 L5,-4 L5,-5 L-5,-5 Z M0,5 L0,5.9`;

const MORE_BUILDINGS = [
  ['skyscraper', 'Skyscraper', () => `M-5,-5 L-4.4,-5 L-1.6,-5 L1.6,-5 L4.2,-5 L5,-5 M-1.6,-5 L-1.6,0.6 L-1.6,3.4 L-0.8,3.4 L-0.8,4.4 L0,4.4 L0.8,4.4 L0.8,3.4 L1.6,3.4 L1.6,-1 L1.6,-5 M0,4.4 L0,5.8 M-4.4,-5 L-4.4,0.6 L-1.6,0.6 M1.6,-1 L4.2,-1 L4.2,-5 ${[2.4, 1.2, 0, -1.2, -2.4, -3.6].flatMap((y) => [-0.8, 0, 0.8].map((x) => `D${x},${y}`)).join(' ')} D-3,-0.6 D-3,-1.8 D-3,-3 D2.9,-2.2 D2.9,-3.4`, { tags: 'building tower city tall office' }],
  ['hospital', 'Hospital', 'M-4.4,-5 L-0.9,-5 L0.9,-5 L4.4,-5 L4.4,2.6 L1.2,2.6 L-1.2,2.6 L-4.4,2.6 Z M0,1.8 L0,0.4 L0,-1 M-1.4,0.4 L0,0.4 L1.4,0.4 M-0.9,-5 L-0.9,-2.6 L0.9,-2.6 L0.9,-5 D-3,1 D-3,-0.6 D-3,-2.2 D3,1 D3,-0.6 D3,-2.2 M-1.2,2.6 L-1.2,3.8 L1.2,3.8 L1.2,2.6', { tags: 'building doctor health medical clinic' }],
  ['school', 'School', 'M0,4.2 L1.6,2.4 L1.6,0.6 L5,0.6 L5,-5 L0.8,-5 L0,-5 M0.8,-5 L0.8,-2.6 L0,-2.6 M2.6,-1 L4,-1 L4,-2.6 L2.6,-2.6 Z | O0,1.6 0.9 M0,4.2 L0,4.8 L0,5.8 L1.4,5.3 L0,4.8', { tags: 'building learn class teacher bell' }],
  ['log-cabin', 'Log cabin', 'M-4.4,-5 L-0.9,-5 L0.9,-5 L4.4,-5 L4.4,0.4 L-4.4,0.4 Z M-4.4,0.4 L-5.4,0.4 L0,4.6 L2,3.044 L3.2,2.111 L5.4,0.4 L4.4,0.4 M-0.9,-5 L-0.9,-1.6 L0.9,-1.6 L0.9,-5 M-4.4,-0.6 L4.4,-0.6 M-4.4,-2.2 L-0.9,-2.2 M0.9,-2.2 L4.4,-2.2 M-4.4,-3.6 L-0.9,-3.6 M0.9,-3.6 L4.4,-3.6 M2,3.044 L2,4.6 L3.2,4.6 L3.2,2.111 M2.6,5.2 Q2,5.8 2.6,6.4', { tags: 'house wood hut forest lodge' }],
  ['tree-house', 'Tree house', 'M-3.6,-1.6 L-2.4,-1.6 L-0.8,-1.6 L0.8,-1.6 L1.4,-1.6 L2.4,-1.6 L3.6,-1.6 M-0.8,-5 L-0.8,-1.6 L-0.8,0.2 L0.8,0.2 L0.8,-1.6 L0.8,-5 M-2.4,-1.6 L-2.4,1 L0,2.8 L2.4,1 L2.4,-1.6 L2.4,-5 M-4.6,0 B-3.6,3.4 -0.7 B-0.6,5.2 -0.7 B2.8,4.4 -0.7 B4.6,0.6 -0.7 M1.4,-1.6 L1.4,-5 M1.4,-2.6 L2.4,-2.6 M1.4,-3.6 L2.4,-3.6 M1.4,-4.4 L2.4,-4.4', { tags: 'house tree ladder den kids' }],
  ['mosque', 'Mosque', 'M0,-5 L0.9,-5 L3,-5 L3.8,-5 L5,-5 L5.6,-5 M3,-5 L3,-0.6 L2.4,-0.6 L0,-0.6 M2.4,-0.6 C3.2,1.6 1,2.4 0,4 M0.9,-5 L0.9,-3 B0,-2.1 0.414 M3.8,-5 L3.8,2.4 L4.4,3.8 L5,2.4 L5,-5 M3.8,2.4 L5,2.4 | M0,4 L0,5.2', { tags: 'building dome minaret islam temple' }],
  ['greek-temple', 'Greek temple', () => `M-5,2 L-4.6,2 L4.6,2 L5,2 L0,5.2 Z M-4.6,2 L-4.6,1.2 L4.6,1.2 L4.6,2 ${[-3.6, -1.2, 1.2, 3.6].map((x) => `M${fix(x - 0.5)},1.2 L${fix(x - 0.5)},-3.6 M${fix(x + 0.5)},1.2 L${fix(x + 0.5)},-3.6`).join(' ')} M-5,-3.6 L5,-3.6 L5,-4.4 L-5,-4.4 Z M-5.6,-4.4 L-5,-4.4 M5,-4.4 L5.6,-4.4 L5.6,-5.2 L-5.6,-5.2 L-5.6,-4.4`, { tags: 'building columns ancient museum bank parthenon' }],
  ['pagoda', 'Pagoda', 'M0,-5 L2.6,-5 L3.4,-5 M2.6,-5 L2.6,-3.4 M0,-3.4 L2.6,-3.4 L3.4,-3.4 L4.4,-3 L2,-2.2 L0,-2.2 M2,-2.2 L2,-0.6 M0,-0.6 L2,-0.6 L2.6,-0.6 L3.6,-0.2 L1.4,0.6 L0,0.6 M1.4,0.6 L1.4,2.2 M0,2.2 L1.4,2.2 L2,2.2 L2.8,2.6 L0,4.4 | M0,4.4 L0,5.6', { tags: 'building temple japan china tower asia' }],
  ['eiffel-tower', 'Eiffel tower', 'M3,-5 L1.5,-1.8 L1.1,-0.4 L0.7,1 L0.4,3.8 L0.4,4.4 L0,4.4 M1.6,-5 L3,-5 M1.6,-5 C1.6,-3.6 0.9,-2.8 0,-2.8 M0,-1.8 L1.5,-1.8 M0,-0.4 L1.1,-0.4 M0,1 L0.7,1 M0,3.8 L0.4,3.8 | M0,4.4 L0,5.8', { tags: 'paris france tower landmark iron' }],
  ['clock-tower', 'Clock tower', 'M0,-5 L1.8,-5 L2.6,-5 M1.8,-5 L1.8,0.2 M0,0.2 L1.8,0.2 L2.4,0.2 L2.4,3.6 L0,3.6 M2.4,3.6 L0,6.2 M0.8,-1 L0.8,-3.4 | O0,1.9 1.1 M0,1.9 L0,2.6 M0,1.9 L0.6,1.9 M0,-1 L0,-3.4', { tags: 'building big ben london time bell' }],
  ['suspension-bridge', 'Suspension bridge', 'M-6,-2 L-4.3,-2 L-2.6,-2 L-1.3,-2 L0,-2 L1.3,-2 L2.6,-2 L4.3,-2 L6,-2 M-2.6,-4.6 L-2.6,-2 L-2.6,3.6 M2.6,-4.6 L2.6,-2 L2.6,3.6 M-6,-2 L-4.3,0.8 L-2.6,3.6 Q-1.95,2.9 -1.3,2.55 Q-0.65,2.2 0,2.2 Q0.65,2.2 1.3,2.55 Q1.95,2.9 2.6,3.6 L4.3,0.8 L6,-2 M-4.3,0.8 L-4.3,-2 M-1.3,2.55 L-1.3,-2 M0,2.2 L0,-2 M1.3,2.55 L1.3,-2 M4.3,0.8 L4.3,-2', { tags: 'bridge river cables golden gate cross' }],
  ['well', 'Well', 'M-3,-5 L0,-5 L3,-5 L3,-3.2 L3,-1.6 L2.4,-1.6 L1,-1.6 L-1,-1.6 L-2.4,-1.6 L-3,-1.6 L-3,-3.2 Z M-3,-3.2 L0,-3.2 L3,-3.2 M-1,-1.6 L-1,-3.2 M1,-1.6 L1,-3.2 M0,-3.2 L0,-5 M-2.4,-1.6 L-2.4,1.4 L-2.4,2.6 M2.4,-1.6 L2.4,1.4 L2.4,2.6 M-3.8,2.6 L-2.4,2.6 L2.4,2.6 L3.8,2.6 L0,5.2 Z M-2.4,1.4 L0,1.4 L2.4,1.4 M0,1.4 L0,0.2 M-0.7,0.2 L0,0.2 L0.7,0.2 L0.5,-1 L-0.5,-1 Z', { tags: 'water wish bucket village stone' }],
  ['haunted-house', 'Haunted house', 'M-5.4,-5 L-4.2,-5 L-0.9,-5 L0.5,-5 L1.6,-5 L3,-5 L4.6,-5 L5.4,-5 M-4.2,-5 L-4.2,0.6 M1.6,-5 L1.6,0.6 M-4.8,0.6 L-4.2,0.6 L1.6,0.6 L2.2,0.6 L-1.3,4.4 Z M3,-5 L3,2.2 M4.6,-5 L4.6,2.2 M2.4,2.2 L3,2.2 L4.6,2.2 L5.2,2.2 L3.8,5 Z M-0.9,-5 L-0.9,-2.6 L0.5,-2.6 L0.5,-5 M-3.4,-0.8 L-2.2,-0.8 L-2.2,-2.2 L-3.4,-2.2 Z O-1.3,2 0.7 D3.8,0.6 D3.8,-1.8', { tags: 'building spooky halloween ghost mansion' }],
  ['circus-tent', 'Circus tent', circusTent, { tags: 'big top show clown fair carnival' }],
  ['carousel', 'Carousel', carousel, { tags: 'merry go round fair ride horses carnival' }],
  ['bench', 'Bench', 'M-4.6,2.6 L4.6,2.6 L4.6,1.6 L4,1.6 L-4,1.6 L-4.6,1.6 Z M-4.6,0.6 L-4,0.6 L4,0.6 L4.6,0.6 L4.6,-0.4 L4,-0.4 L-4,-0.4 L-4.6,-0.4 Z M-5,-1.4 L-4,-1.4 L4,-1.4 L5,-1.4 L5,-2.4 L4,-2.4 L-4,-2.4 L-5,-2.4 Z M-4,1.6 L-4,0.6 M4,1.6 L4,0.6 M-4,-0.4 L-4,-1.4 M4,-0.4 L4,-1.4 M-4,-2.4 L-4,-4.8 M4,-2.4 L4,-4.8', { tags: 'park seat sit garden street' }],
  ['street-lamp', 'Street lamp', 'M-1.2,-5 L0,-5 L1.2,-5 M0,-5 L0,2.4 M-1.2,2.4 L0,2.4 L1.2,2.4 L1.6,4.6 L-1.6,4.6 Z M-2.2,4.6 L-1.6,4.6 M1.6,4.6 L2.2,4.6 L0,6 L-2.2,4.6 M2.6,3.2 L3.6,3 M-2.6,3.2 L-3.6,3 D0,3.5', { tags: 'light lantern post night town' }],
  ['wind-turbine', 'Wind turbine', () => joinDrawings(stamp('M-0.35,0.6 L-0.2,4.2 L0.45,4 L0.35,0.6', [[0, 1.6, 1, 0], [0, 1.6, 1, 120], [0, 1.6, 1, 240]]), parsePath('D0,1.6 M0,0.5 L0,-5 M-1.2,-5 L0,-5 L1.2,-5')), { tags: 'energy power windmill blades green' }],
  ['sandcastle', 'Sandcastle', 'M0,-5 L0.8,-5 L2.6,-5 L4.6,-5 L5.4,-5 M4.6,-5 L4.6,0.4 M2.6,-5 L2.6,-0.6 L2.6,0.4 M2,0.4 L2.6,0.4 L4.6,0.4 L5.2,0.4 L3.6,2.8 Z M0,-0.6 L0.6,-0.6 L0.6,-1.4 L1.8,-1.4 L1.8,-0.6 L2.6,-0.6 M0.8,-5 L0.8,-3.6 B0,-2.8 0.414 D1.7,-2.8 | M3.6,2.8 L3.6,3.8 L3.6,4.8 L5,4.3 L3.6,3.8', { tags: 'beach sand castle summer holiday bucket' }],
  ['observatory', 'Observatory', 'M-3.6,-5 L-0.8,-5 L0.8,-5 L3.6,-5 L3.6,-1 L-3.6,-1 Z M-3.6,-1 A0,-1 3.6 180 0 M0.6,0.4 L3.6,4.6 L4.4,4 L1.4,-0.2 Z M-0.8,-5 L-0.8,-2.8 L0.8,-2.8 L0.8,-5 D-3.6,4 D-1.6,4.8 D-4.6,2.4', { tags: 'building telescope stars space dome science' }],
  ['totem-pole', 'Totem pole', 'M0,-5 L1.4,-5 L1.4,-1.6 L1.4,1.8 L1.4,2.6 L1.4,4.4 L1.4,5 L0,5 M0,1.8 L1.4,1.8 M0,-1.6 L1.4,-1.6 M1.4,4.4 L4.6,4.8 L4.2,3.4 L1.4,2.6 D0.6,3.8 D0.6,0.6 D0.6,-2.8 | M-0.4,3 L0,2.4 L0.4,3 M-0.8,-0.6 L0.8,-0.6 M-0.8,-3.8 L-0.4,-4.2 L0,-3.8 L0.4,-4.2 L0.8,-3.8', { tags: 'carving faces tribe wood statue' }],
  ['moai', 'Moai', 'M0,4.6 L2.2,4.6 L2.6,2.6 L2.6,2 L2.6,-0.6 L2.6,-1 L1.8,-2.6 L1.8,-5 L0,-5 M0,2.6 L0.6,2.6 L2.6,2.6 M0.6,2.6 L0.8,0 L0,0 M2.6,2 L3.4,2 L3.4,-0.6 L2.6,-0.6 D1.6,1.8 | M-1,-1.4 L1,-1.4', { tags: 'statue head stone easter island face' }],
  ['water-tower', 'Water tower', 'M-3,1 L-2.6,1 L0,1 L2.6,1 L3,1 L3,3.6 Q3,5 0,5 Q-3,5 -3,3.6 Z M-2.6,1 L-3.1,-2 L-3.6,-5 M2.6,1 L3.1,-2 L3.6,-5 M0,1 L0,-2 L0,-5 M-3.1,-2 L0,-2 L3.1,-2', { tags: 'building tank town farm tall' }],
  ['mine-entrance', 'Mine entrance', 'M-5.4,-5 L-2.4,-5 L-1,-5 L1,-5 L2.4,-5 L5.4,-5 M-5.4,-5 C-5,1 -2.6,4.6 0,4.6 C2.6,4.6 5,1 5.4,-5 M-2.4,-5 L-2.4,0.6 M2.4,-5 L2.4,0.6 M-3.2,0.6 L-2.4,0.6 L2.4,0.6 L3.2,0.6 L3.2,1.6 L-3.2,1.6 Z M-1,-5 L-0.824,-4 L-0.612,-2.8 L-0.4,-1.6 M1,-5 L0.824,-4 L0.612,-2.8 L0.4,-1.6 M-0.824,-4 L0.824,-4 M-0.612,-2.8 L0.612,-2.8', { tags: 'tunnel cave rails gold shaft dig' }],
];

const MORE_WINGS = [
  ['butterfly-wings', 'Butterfly wings', 'M0.6,0.5 C0.9,3.6 2.8,5.4 4.6,4.6 C5.8,3.4 5,1.2 3.4,0.5 Z M0.6,-0.5 L3,-0.5 C4.6,-1.6 4.2,-3.8 3,-4.4 C1.6,-4.4 0.8,-2.6 0.6,-0.5 O3.3,2.9 0.8 D2.6,-2.4 |', { tags: 'wings fly insect costume back pretty' }],
  ['bee-wings', 'Bee wings', () => stamp('N E0,2.4 1.3,2.4 0 360', [[0.6, 0.7, 1, -60], [0.6, -0.9, 0.7, -115], [-0.6, 0.7, 1, 60], [-0.6, -0.9, 0.7, 115]]), { tags: 'wings insect fly dragonfly round costume' }],
  ['robot-wings', 'Robot wings', 'M0.8,1.6 L5.6,4.6 L5.6,3.4 L0.8,0.4 Z M0.8,-0.4 L5,1.6 L5,0.4 L0.8,-1.6 Z M0.8,-2.4 L4,-1.6 L4,-2.8 L0.8,-3.6 Z |', { tags: 'wings mech metal jet machine blades costume' }],
  ['ice-wings', 'Ice wings', () => stamp('M0,0 L0.5,1 L0.5,3.6 L0,4.6 L-0.5,3.6 L-0.5,1 Z', [[1, 0.8, 1.15, -55], [1.1, -0.5, 1, -90], [1, -1.8, 0.8, -125], [-1, 0.8, 1.15, 55], [-1.1, -0.5, 1, 90], [-1, -1.8, 0.8, 125]]), { tags: 'wings crystal shards frost snow costume' }],
];

const feathers = () => joinDrawings(
  stamp('N E0,2.2 0.7,1.8 0 360', [-50, -25, 0, 25, 50].map((a) => [2.2 * Math.sin(a * Math.PI / 180), -4 + 2.2 * Math.cos(a * Math.PI / 180), 1, -a])),
  parsePath('M-3.6,-3.6 Q0,-2.5 3.6,-3.6 L3.6,-4.8 Q0,-3.7 -3.6,-4.8 Z'),
);
const flowerCrown = () => `M-5,-1.6 Q0,1 5,-1.6 ${[[-3.2, 1.2], [0, 1.8], [3.2, 1.2]].map(([x, y]) => `${scallop(x, y, 0.95, 5, 1)} D${x},${y}`).join(' ')}`;

const MORE_HATS = [
  ['santa-hat', 'Santa hat', 'M-4,-4.6 L4,-4.6 B4,-2.6 1 L3.2,-2.6 L-3.4,-2.6 L-4,-2.6 B-4,-4.6 1 M-3.4,-2.6 C-3.2,1.6 -1,4.8 1.8,4.6 C3.6,4.4 4.6,3 4.8,1.7 M3.2,-2.6 C3.2,-0.4 2.6,1.6 1.4,2.6 O4.8,0.2 0.9', { tags: 'hat christmas winter holiday red pompom' }],
  ['viking-helmet', 'Viking helmet', 'M0,-2 L3,-2 L3.4,-2 L3.4,-3.2 L0,-3.2 M3,-2 C3,1.4 1.6,2.8 0,2.8 M3.7,-0.4 C5.2,0 6,1.8 5.4,4.6 C4.6,3.2 3.8,2.4 2.6,2.2 | M0,-3.2 L0,-4.8', { tags: 'hat horns warrior norse helmet' }],
  ['beanie', 'Beanie', 'M0,-1.6 L2,-1.6 L3.6,-1.6 L4,-1.6 L4,-4 L2,-4 L0,-4 M2,-1.6 L2,-4 M3.6,-1.6 C3.6,2.6 1.6,3.6 0,3.6 | O0,5.2 0.9 M0,-1.6 L0,-4', { tags: 'hat winter wool bobble pompom warm' }],
  ['graduation-cap', 'Graduation cap', 'M-5.4,1.6 L0,3.8 L5.4,1.6 L3,0.622 L0,-0.6 L-3,0.622 Z M-3,0.622 L-3,-2 Q0,-3.8 3,-2 L3,0.622 M5.4,1.6 L5.4,-1.6 L5.4,-3 M4.8,-1.6 L5.4,-1.6 L6,-1.6 D0,1.6', { tags: 'hat school university mortarboard degree learn' }],
  ['hard-hat', 'Hard hat', 'M-3.4,-1.4 C-3.4,2.6 -1.6,3.8 0,3.8 C1.6,3.8 3.4,2.6 3.4,-1.4 M-4.8,-1.4 L-3.4,-1.4 L3.4,-1.4 L4.8,-1.4 L4.8,-2.4 L-4.8,-2.4 Z M-0.7,2.9 L-0.7,-0.5 M0.7,2.9 L0.7,-0.5', { tags: 'hat builder helmet safety construction worker' }],
  ['sombrero', 'Sombrero', 'N E0,-1.6 5.6,1.6 111 429 C2,3 1,4.4 0,4.4 C-1,4.4 -2,3 -2,0.3 Z D-3.8,-1.8 D-1.3,-2.5 D1.3,-2.5 D3.8,-1.8 M-1.2,1.2 L-0.6,0.6 L0,1.2 L0.6,0.6 L1.2,1.2', { tags: 'hat mexico wide brim fiesta' }],
  ['jester-hat', 'Jester hat', 'M0,-3 L3,-3 C3.2,-1.6 4.2,-0.6 5.6,-0.6 C5.2,1.6 4.4,3.8 3,3.8 C1.6,3.8 0.6,2.4 0,0.8 M3,-3 L3,-4.2 L0,-4.2 O5.9,-1.6 0.6 | M0,0.8 L0,-3', { tags: 'hat clown fool joker bells funny' }],
  ['antlers', 'Antlers', 'M1,-4.4 L1.4,-2 L2.6,0 L4,1.6 L4.6,4.2 M1.4,-2 L0.5,-0.2 M2.6,0 L2,2.8 M4,1.6 L5.8,2.2 | M-1,-4.4 Q0,-5.2 1,-4.4', { tags: 'horns reindeer deer christmas headband' }],
  ['feather-headdress', 'Feather headdress', feathers, { tags: 'feathers band hat chief plumes' }],
  ['tiara', 'Tiara', 'M-4.6,-2.6 L-3,1 L-1.8,-0.8 L0,3.4 L1.8,-0.8 L3,1 L4.6,-2.6 M-4.6,-2.6 Q0,-4.4 4.6,-2.6 D-3,1.9 D0,4.3 D3,1.9 O0,0.2 0.8', { tags: 'princess crown queen jewel diadem' }],
  ['propeller-cap', 'Propeller cap', 'M-3.6,-2.6 C-3.6,1.6 -1.6,2.4 0,2.4 C1.6,2.4 3.6,1.6 3.6,-2.6 L0,-2.6 Z M0,3.6 L0,2.4 L0,-2.6 M3.6,-2.6 L5.8,-2.6 N E-1.9,3.6 1.4,0.5 0 360 N E1.9,3.6 1.4,0.5 0 360', { tags: 'hat beanie kid spinner funny' }],
  ['flower-crown', 'Flower crown', flowerCrown, { tags: 'flowers garland headband spring wreath' }],
];

const MORE_CLOTHES = [
  ['sock', 'Sock', 'M-1.6,4.6 L1.6,4.6 L1.6,3.4 L1.6,2.4 L1.6,-0.6 C3,-1 4.6,-1.6 4.6,-3 C4.6,-4.2 3.6,-4.6 2.4,-4.6 L0,-4.6 C-1,-4.6 -1.6,-3.8 -1.6,-2.8 L-1.6,2.4 L-1.6,3.4 Z M-1.6,3.4 L1.6,3.4 M-1.6,2.4 L1.6,2.4', { tags: 'foot clothes stocking christmas' }],
  ['shorts', 'Shorts', 'M-3.6,3 L3.6,3 L3.733,2 L4.4,-3 L0.8,-3 L0,-0.4 L-0.8,-3 L-4.4,-3 L-3.733,2 Z M-3.733,2 L0,2 L3.733,2 M0,2 L0,0.8', { tags: 'clothes pants summer swim trunks' }],
  ['skirt', 'Skirt', 'M-2,3.6 L2,3.6 L2,2.6 L4.4,-3.6 L1.6,-3.6 L-1.6,-3.6 L-4.4,-3.6 L-2,2.6 Z M-2,2.6 L-0.7,2.6 L0.7,2.6 L2,2.6 M-0.7,2.6 L-1.6,-3.6 M0.7,2.6 L1.6,-3.6', { tags: 'clothes dress pleats kilt' }],
  ['sneaker', 'Sneaker', 'M-4.6,-3 L4.6,-3 L4.6,-2 L-4.6,-2 Z M-4.6,-2 L-4.6,2.4 L-2.4,2.4 C-1.6,0.6 1,0 3,-0.4 C4,-0.6 4.6,-1.2 4.6,-2 D-1.4,0 D0,-0.6 D1.4,-1', { tags: 'shoe trainer foot run sport clothes' }],
  ['flip-flops', 'Flip-flops', () => stamp('N E0,0 2.2,4.6 0 360 M-1.6,0.4 L0,3 L1.6,0.4', [[-2.8, 0], [2.8, 0]]), { tags: 'sandals beach summer shoes feet' }],
  ['moustache', 'Moustache', 'M0,0.6 C1,1.6 2.6,1.4 3.6,0.4 C4.4,-0.4 5.2,-0.2 5.4,0.8 C6.2,-0.6 4.6,-2.2 3,-1.6 C1.8,-1.2 0.8,-1 0,-0.4 |', { tags: 'mustache face hair disguise gentleman' }],
  ['wristwatch', 'Wristwatch', 'O0,0 2.6 M0,0 L0,1.6 M0,0 L1.2,0 M-1.4,2.9 L-1.4,5 L1.4,5 L1.4,2.9 M-1.4,-2.9 L-1.4,-5 L1.4,-5 L1.4,-2.9', { tags: 'watch time clock arm strap' }],
  ['handbag', 'Handbag', 'M-3.6,1 L-2,1 L2,1 L3.6,1 L4.4,-4.4 L-4.4,-4.4 Z M-2,1 C-2,5.4 2,5.4 2,1 O0,-1.4 0.7', { tags: 'bag purse shopping fashion carry' }],
  ['apron', 'Apron', 'M-1.6,4 L1.6,4 L1.6,1 L3.6,0 L3.6,-4.6 L-3.6,-4.6 L-3.6,0 L-1.6,1 Z M-1.6,4 C-1.6,6 1.6,6 1.6,4 M-1.2,-1.6 L1.2,-1.6 L1.2,-3.2 L-1.2,-3.2 Z M3.6,0 L5,0.4 M-3.6,0 L-5,0.4', { tags: 'clothes cook kitchen chef baker' }],
  ['button', 'Button', 'O0,0 4.6 O0,0 3.6 D-1,1 D1,1 D-1,-1 D1,-1', { tags: 'clothes sew round holes shirt' }],
  ['devil-tail', 'Devil tail', 'M-4,-4 C-1,-4.6 2,-3 1,0 C0.2,2.2 2,3.6 3.6,3 L3.4,4.6 L5.4,3.4 L3.6,3', { tags: 'tail demon costume halloween imp' }],
  ['eye-patch', 'Eye patch', 'M-1.6,1 L1.6,1 C1.8,-1 1,-2.4 0,-2.4 C-1,-2.4 -1.8,-1 -1.6,1 M-1.6,1 L-5,3.4 M1.6,1 L5,3.4', { tags: 'pirate eye costume cover' }],
  ['hoodie', 'Hoodie', 'M0,5 C1.2,5 2,4.4 2,3.4 L5.6,0.6 L5,-0.8 L3,0.6 L3,-4.6 L0,-4.6 M0,-1.6 L1.4,-1.6 L2,-3.2 L0,-3.2 M0.5,2 L0.5,0.6 | M-2,3.4 Q0,2 2,3.4', { tags: 'clothes jumper sweater hood jacket' }],
  ['beard', 'Beard', 'M-4,3 C-4.4,-1 -2.6,-4.6 0,-4.6 C2.6,-4.6 4.4,-1 4,3 C3,1.6 1.6,1.2 0,1.2 C-1.6,1.2 -3,1.6 -4,3 M-1,-0.4 Q0,-1.2 1,-0.4', { tags: 'face hair chin disguise old man' }],
];

const pictures = (cat, sub, list) => list.map(([id, name, draw, extra = {}]) => drawnShape({ id, name, cat, sub, draw, ...extra }));

export const GOODS_SHAPES = [
  ...pictures('food', 'Fruit and vegetables', FRUIT),
  ...pictures('food', 'Meals', MEALS),
  ...pictures('food', 'Sweets', SWEETS),
  ...pictures('food', 'Drinks', DRINKS),
  ...pictures('things', 'Tools', TOOLS),
  ...pictures('things', 'Weapons', WEAPONS),
  ...pictures('things', 'Treasure and magic', MAGIC),
  ...pictures('things', 'Games and sport', GAMES),
  ...pictures('things', 'Music', MORE_MUSIC),
  ...pictures('things', 'Home', HOME),
  ...pictures('things', 'Party and holidays', PARTY),
  ...pictures('travel', 'Vehicles', MORE_VEHICLES),
  ...pictures('travel', 'Buildings', MORE_BUILDINGS),
  ...pictures('costume', 'Wings', MORE_WINGS),
  ...pictures('costume', 'On the head', MORE_HATS),
  ...pictures('costume', 'Clothes', MORE_CLOTHES),
];
