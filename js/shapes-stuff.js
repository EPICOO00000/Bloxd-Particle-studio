// More food, things, travel and costume pictures. Each one is a short drawing
// in the language described in shape-kit.js ("drawings"), in whatever units
// suit the picture.

import { drawnShape, parsePath, joinDrawings, placeDrawing, spin, stamp, around, fix } from './shape-kit.js';

const HEART = 'M0,7.4 C1,10 5,10 5,6.6 C5,3.6 1.6,1.6 0,0 |';
const PEAR = 'M0,9 C1.4,9 1.6,7 1.8,5.6 C2,4.2 3.6,3.6 3.6,1.8 C3.6,0 1.8,-0.4 0,-0.4 |';
const EGG = 'M0,5 C2.4,5 3.8,1.6 3.8,-0.8 C3.8,-3.4 2,-5 0,-5 |';

/** A star outline with `k` points around (cx, cy): `out` to the tips, `inn` to the corners between them. */
const star = (cx, cy, out, inn, k = 5, first = 90) => `M${Array.from({ length: 2 * k }, (_, i) => around(cx, cy, i % 2 ? inn : out, first + (180 * i) / k)).join(' L')} Z`;
/** The same drawing, turned. */
const tilted = (d, turn) => () => stamp(d, [[0, 0, 1, turn]]);

// [id, name, drawing, extra fields]
const FRUIT = [
  ['pear', 'Pear', `${PEAR} M0,9 L0.6,10.4`, { tags: 'fruit' }],
  ['cherries', 'Cherries', 'O-2.4,1.8 1.8 O2.6,1.4 1.8 M-2.4,3.6 Q-1.6,7 1,9 Q2.4,6 2.6,3.2 M1,9 Q3,10.2 4.8,8.8 Q3,8.4 1,9', { tags: 'fruit cherry red' }],
  ['banana', 'Banana', 'M-4.6,3.4 C-3.6,-1.6 2.6,-3 5,1.6 L4.4,2.4 C2,-0.6 -2.4,-0.2 -3.8,3.8 Z', { tags: 'fruit yellow monkey' }],
  ['grapes', 'Grapes', 'O-2.7,5.4 1.1 O0,5.4 1.1 O2.7,5.4 1.1 O-1.35,3.06 1.1 O1.35,3.06 1.1 O0,0.72 1.1 M0,6.5 L0,7.6 L1.6,8.4', { tags: 'fruit bunch wine' }],
  ['strawberry', 'Strawberry', 'M0,6.4 C2.6,6.6 4.4,5.6 4,3.4 C3.6,1.2 1.6,-1.4 0,-2 | M0,6.4 L1.6,8 M0,6.4 L-1.6,8 M0,6.4 L0,8.6 D-1.6,4.6 D1.6,4.6 D0,3 D-1.4,1.4 D1.4,1.4 D0,0', { tags: 'fruit berry red' }],
  ['watermelon', 'Watermelon', 'M-5,0 L-4,0 L4,0 L5,0 A0,0 5 0 -180 M4,0 A0,0 4 0 -180 D-2,-1.5 D0,-2.4 D2,-1.5', { tags: 'fruit slice melon summer' }],
  ['pineapple', 'Pineapple', 'E0,-1 3,4 0 360 M0,3 L-2.4,6.4 M0,3 L0,7.4 M0,3 L2.4,6.4 M-2,0.4 L0.6,-3.6 M-0.6,1.6 L2,-2.4 M2,0.4 L-0.6,-3.6 M0.6,1.6 L-2,-2.4', { tags: 'fruit tropical' }],
  ['carrot', 'Carrot', 'M-2.4,4 L0,4 L2.4,4 L0.5,-4.4 Q0,-5.2 -0.5,-4.4 Z M0,4 L-2.2,6.4 M0,4 L0,7 M0,4 L2.2,6.4 M-1.948,2 L-0.4,2 M1.495,0 L0.2,0 M-1.043,-2 L-0.1,-2', { tags: 'vegetable rabbit orange' }],
  ['pumpkin', 'Pumpkin', 'E0,0 5,4 0 360 M-1.6,3 Q-3.4,0 -1.6,-3 M1.6,3 Q3.4,0 1.6,-3 M0,4 L0.2,5.4 L1.4,5.8', { tags: 'vegetable halloween autumn squash' }],
  ['chili', 'Chili pepper', 'M-4,4 C-4.6,0 -1,-4 4.6,-4.4 C2.6,-1.6 -0.6,0.6 -1.6,4.6 Z M-2.8,4.3 L-3.2,6 L-2,6.6', { tags: 'vegetable hot spicy chilli' }],
  ['avocado', 'Avocado', `${PEAR} O0,2 1.7`, { tags: 'fruit vegetable green half' }],
];

const MEALS = [
  ['pizza', 'Pizza', 'M-4,4.4 Q0,6.2 4,4.4 L0,-5 Z O-0.8,2.8 0.9 O0.8,0.6 0.7 D1.6,3.6 D-0.4,-1.6', { tags: 'slice meal fast food italian' }],
  ['burger', 'Burger', 'M-4.4,2 L4.4,2 E0,2 4.4,3.2 0 180 M-4.6,0.8 L4.6,0.8 B4.6,-0.6 -1 L-4.6,-0.6 B-4.6,0.8 -1 M-4.4,-1.6 L4.4,-1.6 L4.4,-2.6 Q4.4,-3.6 3.4,-3.6 L-3.4,-3.6 Q-4.4,-3.6 -4.4,-2.6 Z D-1.8,3.6 D0,4.2 D1.8,3.6', { tags: 'hamburger meal fast food bun' }],
  ['hot-dog', 'Hot dog', tilted('M-4,0.9 L4,0.9 B4,-0.9 -1 L-4,-0.9 B-4,0.9 -1 M-3.6,-0.9 Q-3.6,-2.6 -2,-2.6 L2,-2.6 Q3.6,-2.6 3.6,-0.9 M-3.4,0 Q-2.55,0.7 -1.7,0 Q-0.85,-0.7 0,0 Q0.85,0.7 1.7,0 Q2.55,-0.7 3.4,0', 25), { tags: 'sausage meal fast food bun' }],
  ['fries', 'Fries', 'M-2.6,3 L-2,-4.4 L2,-4.4 L2.6,3 L1.7,3 L0.6,3 L-0.5,3 L-1.6,3 Z M-1.6,3 L-2.2,6.4 M-0.5,3 L-0.7,7.2 M0.6,3 L0.9,6.8 M1.7,3 L2.4,6.2', { tags: 'chips potato meal fast food' }],
  ['fried-egg', 'Fried egg', 'M-4,0 C-5,3 -2,5 0,3.6 C2,5.4 5,3 4,0.6 C5.4,-2 2.6,-4.6 0.4,-3.4 C-1.6,-5 -5,-3 -4,0 O0.2,0.4 1.7', { tags: 'breakfast meal yolk' }],
  ['toast', 'Toast', 'M-3.2,-4.4 L3.2,-4.4 L3.2,1.6 C5.2,2 4.6,5 2.4,5 L-2.4,5 C-4.6,5 -5.2,2 -3.2,1.6 Z M-1,0.4 L1,0.4 L1,-1.6 L-1,-1.6 Z', { tags: 'bread slice breakfast butter' }],
  ['cheese', 'Cheese', 'M-4.4,-3.4 L4.4,-3.4 L4.4,3 Z O2.6,-1.6 0.9 O0.4,-2.2 0.5 O3.2,0.6 0.5', { tags: 'wedge holes mouse dairy' }],
  ['noodle-bowl', 'Noodle bowl', 'M-5,2 L1,2 L2.4,2 L5,2 A0,2 5 0 -180 M1,2 L4.4,7 M2.4,2 L5.6,6.4 M-2.4,3.4 Q-3.2,4.6 -2.4,5.6 Q-1.6,6.6 -2.4,7.8 M-1.6,-2.737 L-1.6,-3.6 L1.6,-3.6 L1.6,-2.737', { tags: 'ramen rice soup chopsticks meal' }],
  ['fork-knife', 'Fork and knife', 'M-2.4,5 L-2.4,2.4 M-3.4,5 L-3.4,2.4 L-2.4,2.4 L-1.4,2.4 L-1.4,5 M-2.4,2.4 L-2.4,-5 M2.4,-5 L2.4,0.6 L2.4,5 C3.8,3.8 3.6,1.6 3.4,0.6 L2.4,0.6', { tags: 'cutlery eat dinner meal restaurant' }],
];

const SWEETS = [
  ['ice-cream', 'Ice cream', 'M-2.6,3 L-1.3,3 L1.3,3 L2.6,3 L0,-5 Z M2.6,3 A0,4.4 2.953 -28.3 208.3 M-1.3,3 L1.3,-1 M1.3,3 L-1.3,-1', { tags: 'cone dessert sweet summer' }],
  ['lollipop', 'Lollipop', 'O0,3 3 M0,0 L0,-6 N A0,3 1.5 30 300', { tags: 'candy sweet sucker' }],
  ['candy', 'Candy', 'M2.4,0 L4.8,1.8 L4.8,-1.8 L2.4,0 | O0,0 2.4 N A0,0 1.2 20 250', { tags: 'sweet wrapped bonbon toffee' }],
  ['sprinkle-donut', 'Sprinkle donut', () => `O0,0 5 O0,0 1.8 ${[20, 80, 140, 200, 260, 320].map((a) => `M${around(0, 0, 3, a)} L${around(0, 0, 3.8, a + 10)}`).join(' ')}`, { tags: 'doughnut sweet dessert cake' }],
  ['cupcake', 'Cupcake', 'M-3,1.6 L-2.2,-4.4 L2.2,-4.4 L3,1.6 M-3.8,1.6 L-3,1.6 L-1,1.6 L1,1.6 L3,1.6 L3.8,1.6 E0,1.6 3.8,3.6 0 180 O0,6.6 0.8 M-1,1.6 L-0.8,-4.4 M1,1.6 L0.8,-4.4', { tags: 'cake muffin sweet dessert' }],
  ['birthday-cake', 'Birthday cake', 'M-4.4,-4 L4.4,-4 L4.4,0.6 L2.4,0.6 L0,0.6 L-2.4,0.6 L-4.4,0.6 Z M-4.4,-1.7 L4.4,-1.7 M-2.4,0.6 L-2.4,3 M0,0.6 L0,3 M2.4,0.6 L2.4,3 D-2.4,4 D0,4 D2.4,4', { tags: 'party candles sweet dessert' }],
  ['cookie', 'Cookie', 'A0,0 5 75 375 A3.536,3.536 2.588 300 150 D-2,2.2 D0.2,0.8 D-2.8,-1 D1.6,-2.4 D-0.8,-3.2 D2.8,-0.6', { tags: 'biscuit sweet chocolate chip bite' }],
];

const DRINKS = [
  ['teacup', 'Teacup', 'M-3.6,2.4 L3.6,2.4 A0,2.4 3.6 0 -180 M3.6,2.4 B2.546,-0.146 -1.3 M-4.6,-1.6 Q0,-3 4.6,-1.6 M-1.2,3.6 Q-2,4.6 -1.2,5.6 Q-0.4,6.6 -1.2,7.6 M1.2,3.6 Q0.4,4.6 1.2,5.6 Q2,6.6 1.2,7.6', { tags: 'tea coffee hot drink cup steam' }],
  ['juice', 'Juice', 'M-2.6,3 L-2,-5 L2,-5 L2.6,3 L0.8667,3 Z M-2.45,1 L0.2,1 L2.45,1 M0.2,1 L0.8667,3 L2.2,7 L3.8,7', { tags: 'drink glass straw soda lemonade' }],
  ['cocktail', 'Cocktail', 'M-4,5 L1.4,5 L4,5 L0,0.6 Z M0,0.6 L0,-4 M-2.4,-4 L0,-4 L2.4,-4 M1.4,5 L3,7.4', { tags: 'drink glass party straw' }],
  ['coffee-cup', 'Coffee cup', 'M-2.8,3 L-2.2,-5 L2.2,-5 L2.8,3 M-3.4,3 L-2.8,3 L2.8,3 L3.4,3 L3.4,4.2 L-3.4,4.2 Z M-2.65,1 L2.65,1 M-2.425,-2 L2.425,-2', { tags: 'drink hot takeaway latte' }],
];

const TOOLS = [
  ['wrench', 'Wrench', tilted('O0,-5.9 0.9 M0,-5 L0,2 N A0,3.6 1.6 130 410', -35), { tags: 'tool spanner fix repair' }],
  ['screwdriver', 'Screwdriver', tilted('M-1.1,5.4 L1.1,5.4 L1.1,1.4 L0,1.4 L-1.1,1.4 Z M0,1.4 L0,-3.8 L-0.6,-5 L0.6,-5 L0,-3.8', 40), { tags: 'tool fix repair screw' }],
  ['saw', 'Saw', 'M-5,0 L2.4,1.8 L2.4,-1.4 L1.66,-2.2 L0.92,-1.4 L0.18,-2.2 L-0.56,-1.4 L-1.3,-2.2 L-2.04,-1.4 L-2.78,-2.2 L-3.52,-1.4 L-4.26,-2.2 L-5,-1.4 Z M2.4,1.8 L4.6,2.2 L5,-1.8 L2.4,-1.4 O3.7,0.2 0.6', { tags: 'tool cut wood teeth' }],
  ['shovel', 'Shovel', 'M-1.8,-1 L0,-1 L1.8,-1 L1.8,-3 C1.8,-4.6 0.8,-5.4 0,-5.6 C-0.8,-5.4 -1.8,-4.6 -1.8,-3 Z M0,-1 L0,5 M-1.2,5 L0,5 L1.2,5', { tags: 'tool spade dig' }],
  ['magnet', 'Magnet', 'M-3.6,-4 L-3.6,-2.4 L-3.6,1 A0,1 3.6 180 0 L3.6,-2.4 L3.6,-4 L1.6,-4 L1.6,-2.4 L1.6,1 A0,1 1.6 0 180 L-1.6,-2.4 L-1.6,-4 Z M-3.6,-2.4 L-1.6,-2.4 M1.6,-2.4 L3.6,-2.4', { tags: 'tool horseshoe attract pull' }],
  ['paint-brush', 'Paint brush', tilted('M-0.6,5 L0.6,5 L0.9,0 L-0.9,0 Z M-0.9,0 L-0.9,-1.4 L0.9,-1.4 L0.9,0 M-0.9,-1.4 C-1.6,-3 -0.8,-4.6 0,-5.4 C0.8,-4.6 1.6,-3 0.9,-1.4', 40), { tags: 'tool art draw colour color' }],
  ['scissors', 'Scissors', 'O2,-3.6 1.4 M1.34,-2.3655 L-2.6,5 |', { tags: 'tool cut snip' }],
  ['ladder', 'Ladder', 'M-2,-5 L-2,5 M2,-5 L2,5 M-2,-3.4 L2,-3.4 M-2,-1.2 L2,-1.2 M-2,1 L2,1 M-2,3.2 L2,3.2', { tags: 'tool climb rungs' }],
  ['bucket', 'Bucket', 'M-3.6,3 L-3.3297,1 L-2.6,-4.4 L2.6,-4.4 L3.3297,1 L3.6,3 Z M-3.3297,1 L3.3297,1 M-3.6,3 C-3.6,8 3.6,8 3.6,3', { tags: 'tool pail water' }],
];

const WEAPONS = [
  ['trident', 'Trident', 'M2.6,5 L2.6,2 L0,2 M1.7,4 L2.6,5 L3.5,4 | M0,-5 L0,2 L0,5.6 M-0.9,4.6 L0,5.6 L0.9,4.6', { tags: 'weapon fork sea spear poseidon' }],
  ['bomb', 'Bomb', 'O-0.6,-1 3.8 M2.087,1.687 L2.9,2.5 Q3.6,4.4 5,4 M5,4 L5.9,4.9 M5,4 L6.1,3.5 M5,4 L4.9,5.2', { tags: 'weapon explosive tnt fuse boom' }],
  ['battle-axe', 'Battle axe', 'M0,4.4 L2.2,5.2 Q3.8,3.4 2.2,1.6 L0,2.4 | M0,-5 L0,2.4 L0,4.4 L0,5.4', { tags: 'weapon double viking warrior' }],
  ['throwing-star', 'Throwing star', () => `${star(0, 0, 5, 1.8, 4)} O0,0 0.8`, { tags: 'weapon shuriken ninja' }],
];

const MAGIC = [
  ['magic-wand', 'Magic wand', () => `M-4.6,-4.6 L${around(3, 3, 2.4, 225)} ${star(3, 3, 2.4, 1, 5, 225)}`, { tags: 'wizard fairy spell star' }],
  ['crystal-ball', 'Crystal ball', 'O0,1.6 3.6 M-1.8303,-1.5 L-2.8,-4.4 L2.8,-4.4 L1.8303,-1.5 N A0,1.6 2.4 110 160', { tags: 'magic fortune future witch' }],
  ['open-book', 'Open book', 'M0,-3.4 L4.6,-2.4 L4.6,4 L0,3 M1,1.4 L3.6,2 M1,-0.2 L3.6,0.4 | M0,-3.4 L0,3', { tags: 'spell read pages magic' }],
  ['coins', 'Coins', 'E0,3 3.6,1.2 0 360 M-3.6,3 L-3.6,1 L-3.6,-1 L-3.6,-3 E0,-3 3.6,1.2 180 360 L3.6,-1 L3.6,1 L3.6,3 M-3.6,1 E0,1 3.6,1.2 180 360 M-3.6,-1 E0,-1 3.6,1.2 180 360', { tags: 'money gold stack treasure' }],
  ['money-bag', 'Money bag', () => `M0,-4.6 C3,-4.6 4.4,-2.6 4,-0.6 C3.6,1 2,2.4 1.2,3.2 L2.2,5 L0,4.4 | M-1.2,3.2 L1.2,3.2 ${star(0, -1, 1.5, 0.63)}`, { tags: 'gold loot sack coins treasure' }],
  ['treasure-map', 'Treasure map', 'M-5,-3.6 L5,-3.6 L5,3.6 L-5,3.6 Z M2,-0.4 L3.6,-2 M2,-2 L3.6,-0.4 D-3.4,2 D-2.2,1.2 D-1,1.4 D0.2,0.8 D1.1,0.2', { tags: 'pirate x marks spot island' }],
];

const GAMES = [
  ['basketball', 'Basketball', 'A7,0 5 134.43 225.57 | O0,0 5 M-5,0 L5,0 M0,5 L0,-5', { tags: 'ball sport game hoop' }],
  ['tennis-ball', 'Tennis ball', 'A6.4,0 4.4 128.84 231.16 | O0,0 5', { tags: 'sport game baseball' }],
  ['medal', 'Medal', () => `M2.4,5.4 L0.9,1.262 M0,5.4 L2.4,5.4 | O0,-1.6 3 ${star(0, -1.6, 1.7, 0.7)}`, { tags: 'award prize winner first gold sport' }],
  ['chess-pawn', 'Chess pawn', 'M0.9,2.4 C0.9,0 2.6,-2 2.6,-3.4 L3.2,-3.4 L3.2,-4.6 L0,-4.6 | O0,3.6 1.5', { tags: 'game piece board' }],
  ['playing-card', 'Playing card', () => joinDrawings(parsePath('M-3.2,-5 L3.2,-5 L3.2,5 L-3.2,5 Z D-2.2,3.9 D2.2,-3.9'), stamp(HEART, [[0, -1.4, 0.36]])), { tags: 'game ace hearts poker deck' }],
  ['game-controller', 'Game controller', 'M-4.6,-1 C-4.6,2.4 -3.4,2.6 -2,2.6 L2,2.6 C3.4,2.6 4.6,2.4 4.6,-1 C4.6,-3.4 2.6,-3 1.6,-1 L-1.6,-1 C-2.6,-3 -4.6,-3.4 -4.6,-1 M-3.4,1 L-1.8,1 M-2.6,1.8 L-2.6,0.2 D2,1 D3.2,1', { tags: 'gamepad joystick console play video' }],
  ['puzzle-piece', 'Puzzle piece', 'M-3,-3 L3,-3 L3,-0.9 B3,0.9 1.3 L3,3 L0.9,3 B-0.9,3 1.3 L-3,3 L-3,0.9 B-3,-0.9 -1.3 Z', { tags: 'jigsaw game' }],
  ['kite', 'Kite', 'M0,5 L3,1.6 L0,-2.6 L-3,1.6 Z M0,5 L0,1.6 L0,-2.6 M-3,1.6 L0,1.6 L3,1.6 M0,-2.6 Q1.6,-3.6 0.4,-4.6 Q-0.6,-5.4 0.6,-6.4', { tags: 'fly wind toy string' }],
  ['skateboard', 'Skateboard', 'M-5,0.6 Q-4.4,-0.4 -3.4,-0.4 L3.4,-0.4 Q4.4,-0.4 5,0.6 O-2.8,-1.9 0.8 O2.8,-1.9 0.8', { tags: 'sport skate board wheels' }],
  ['dumbbell', 'Dumbbell', 'M0,0 L2.4,0 M2.4,1.8 L2.4,-1.8 L3.8,-1.8 L3.8,-1 L3.8,1 L3.8,1.8 Z M3.8,1 L4.6,1 L4.6,-1 L3.8,-1 |', { tags: 'weights gym strong lift sport' }],
];

const INSTRUMENTS = [
  ['guitar', 'Guitar', tilted('A0,-2.6 2.4 121.42 418.58 A0,0.6 1.7 -42.64 222.64 O0,-1.6 0.8 M0,2.3 L0,6.2 M-0.7,6.2 L0,6.2 L0.7,6.2 L0.7,7.6 L-0.7,7.6 Z M-0.9,-3.4 L0.9,-3.4', -30), { tags: 'music instrument strings rock' }],
  ['trumpet', 'Trumpet', 'M-5,0.6 L-2.4,0.6 L-1.2,0.6 L0,0.6 L1.6,0.6 L5,2.6 L5,-2.6 L1.6,-0.6 L0.6,-0.6 L-2.8,-0.6 L-5,-0.6 Z M-2.4,0.6 L-2.4,1.8 M-1.2,0.6 L-1.2,1.8 M0,0.6 L0,1.8 M-2.8,-0.6 L-2.8,-1.8 Q-2.8,-2.6 -2,-2.6 L-0.2,-2.6 Q0.6,-2.6 0.6,-1.8 L0.6,-0.6', { tags: 'music instrument horn brass' }],
  ['piano-keys', 'Piano keys', 'M-4.6,-3 L4.6,-3 L4.6,3 L-4.6,3 Z M-2.9,3 L-2.9,0.2 L-2.3,0.2 L-1.7,0.2 L-1.7,3 M-2.3,0.2 L-2.3,-3 M0,3 L0,-3 M1.7,3 L1.7,0.2 L2.3,0.2 L2.9,0.2 L2.9,3 M2.3,0.2 L2.3,-3', { tags: 'music instrument keyboard' }],
  ['microphone', 'Microphone', tilted('O0,3 2.2 M-1.2,1.156 L-0.7,-5 L0.7,-5 L1.2,1.156 M-2.2,3 L2.2,3', -30), { tags: 'music sing mic voice karaoke' }],
  ['headphones', 'Headphones', 'A0,0 4 0 90 M4.8,0 L3.2,0 L3.2,-3 L4.8,-3 Z |', { tags: 'music listen audio headset' }],
  ['boombox', 'Boombox', 'M-5,-3 L5,-3 L5,2 L3,2 L-3,2 L-5,2 Z O-2.8,-0.5 1.5 O2.8,-0.5 1.5 M-3,2 L-3,3.6 L3,3.6 L3,2 M-0.7,0.4 L0.7,0.4 M-0.7,-1.2 L0.7,-1.2', { tags: 'music radio stereo speaker' }],
];

const HOME = [
  ['clock', 'Clock', 'O0,0 5 M0,3.4 L0,0 L2.4,0 D0,4.2 D4.2,0 D0,-4.2 D-4.2,0', { tags: 'time watch hour home' }],
  ['door', 'Door', 'M-2.8,-5 L-2.8,2.4 A0,2.4 2.8 180 0 L2.8,-5 Z D1.6,-0.6 O0,2.6 1.2', { tags: 'home entrance gate' }],
  ['window', 'Window', 'M-4.8,-4 L-4,-4 L0,-4 L4,-4 L4.8,-4 M-4,-4 L-4,0 L-4,4 L0,4 L4,4 L4,0 L4,-4 M0,-4 L0,4 M-4,0 L4,0', { tags: 'home glass pane frame' }],
  ['bed', 'Bed', 'M-5,3.4 L-5,0.4 L-5,-1.2 L-5,-3 M-5,0.4 L-4.2,0.4 L-0.8,0.4 L5,0.4 L5,-1.2 L5,-3 M-5,-1.2 L5,-1.2 M-4.2,0.4 Q-4.2,1.6 -3,1.6 L-2,1.6 Q-0.8,1.6 -0.8,0.4', { tags: 'sleep home bedroom furniture' }],
  ['lamp', 'Lamp', 'M-1.6,5 L1.6,5 L3.2,1 L0,1 L-3.2,1 Z M0,1 L0,-4 M-2.2,-4 L0,-4 L2.2,-4', { tags: 'light home shade furniture' }],
  ['television', 'Television', 'M-5,-2.6 L0,-2.6 L5,-2.6 L5,3.6 L0,3.6 L-5,3.6 Z M-4,-1.6 L2.6,-1.6 L2.6,2.6 L-4,2.6 Z D3.8,1.6 D3.8,0 M-1.6,5.6 L0,3.6 L1.6,5.6 M0,-2.6 L0,-4.4 M-2,-4.4 L0,-4.4 L2,-4.4', { tags: 'tv screen watch retro home' }],
  ['laptop', 'Laptop', 'M-4,-1.6 L-4,3.6 L4,3.6 L4,-1.6 M-5.4,-3 L-4,-1.6 L4,-1.6 L5.4,-3 Z', { tags: 'computer pc screen' }],
  ['phone', 'Phone', 'M-2.6,-5 L2.6,-5 L2.6,-3.4 L2.6,3.6 L2.6,5 L-2.6,5 L-2.6,3.6 L-2.6,-3.4 Z M-2.6,3.6 L2.6,3.6 M-2.6,-3.4 L2.6,-3.4 D0,-4.2', { tags: 'mobile smartphone call cell' }],
  ['envelope', 'Envelope', 'M-5,-3.2 L5,-3.2 L5,3.2 L-5,3.2 Z M-5,3.2 L0,-0.6 L5,3.2', { tags: 'mail letter message post email' }],
  ['broom', 'Broom', 'M-1.6,-1 L-0.8,-1 L0,-1 L0.8,-1 L1.6,-1 L2.8,-5 L1.4,-5 L0,-5 L-1.4,-5 L-2.8,-5 Z M0,5.4 L0,-1 L0,-5 M-0.8,-1 L-1.4,-5 M0.8,-1 L1.4,-5', { tags: 'witch sweep clean brush home' }],
];

const PARTY = [
  ['party-popper', 'Party popper', 'M-4.6,-4.6 L-2.6,1.4 L1.4,-2.6 Z M0.4,0.4 Q1.4,2 2.6,1.6 Q3.8,1.2 4.6,4.4 D0.6,2.6 D3,0.2 D2.6,4 D5,1.6 D0.4,4.8', { tags: 'celebrate confetti birthday new year' }],
  ['bauble', 'Bauble', 'O0,-1 3.8 M-0.8,2.715 L-0.8,3.8 L-0.4,3.8 L0.4,3.8 L0.8,3.8 L0.8,2.715 M-0.4,3.8 B0.4,3.8 -2.2 M-3.8,-1 L-2.5,0 L-1.3,-1 L0,0 L1.3,-1 L2.5,0 L3.8,-1', { tags: 'christmas ornament ball decoration xmas' }],
  ['snowman', 'Snowman', 'A0,-2 3 -90 67.33 A0,2.4 2 -54.69 53.13 L2,4 M1.2,4 L1.2,6 L0,6 M2.598,-0.5 L4.6,1.2 D0.7,2.9 | D0,-0.8 D0,-2.4 M-1.2,4 L1.2,4', { tags: 'winter christmas snow xmas' }],
  ['candy-cane', 'Candy cane', 'M-2,-5 L-2,-3.6 L-2,-1.4 L-2,0.8 L-2,2.4 A1,2.4 3 180 0 L4,0.6 L2.4,0.6 L2.4,2.4 A1,2.4 1.4 0 180 L-0.4,1.8 L-0.4,-0.4 L-0.4,-2.6 L-0.4,-5 Z M-2,-3.6 L-0.4,-2.6 M-2,-1.4 L-0.4,-0.4 M-2,0.8 L-0.4,1.8', { tags: 'christmas sweet xmas stripes' }],
  ['fireworks', 'Fireworks', () => joinDrawings(spin('M0,1.4 L0,4 D0,5', 6), spin('M0,2 L0,3.2', 6, 30)), { tags: 'celebrate new year burst party explosion' }],
  ['easter-egg', 'Easter egg', `${EGG} M-1.8,3.2 L1.8,3.2 M-2.6,1 L-1.3,2 L0,1 L1.3,2 L2.6,1 D-2.2,-1 D-0.75,-1 D0.75,-1 D2.2,-1 M-2,-3 L2,-3`, { tags: 'holiday painted spring decorated' }],
  ['balloons', 'Balloons', 'E-3,2.6 1.4,1.8 0 360 N E0,4.4 1.4,1.8 0 360 N E3,2.6 1.4,1.8 0 360 M-3,0.8 L0,-3 M0,2.6 L0,-3 L0,-5.4 M3,0.8 L0,-3', { tags: 'party birthday bunch celebrate' }],
];

const ferrisWheel = () => {
  const foot = fix(6 / Math.tan((60 * Math.PI) / 180));
  const spokes = [0, 60, 120, 180].map((a) => `M0,1 L${around(0, 1, 4, a)} D${around(0, 1, 5, a)}`).join(' ');
  return `O0,1 4 ${spokes} M0,1 L${around(0, 1, 4, 240)} L${-foot},-5 M0,1 L${around(0, 1, 4, 300)} L${foot},-5 M-4.6,-5 L${-foot},-5 L${foot},-5 L4.6,-5`;
};

const VEHICLES = [
  ['car', 'Car', 'M-3.9,-1.6 L-5,-1.6 L-5,0.4 L-3,0.6 L-1.6,2.6 L2,2.6 L3.4,0.6 L5,0.2 L5,-1.6 L3.9,-1.6 M-1.7,-1.6 L1.7,-1.6 O-2.8,-1.6 1.1 O2.8,-1.6 1.1 M-1,0.8 L-1,2 L1.6,2 L2.4,0.8 Z', { tags: 'vehicle auto drive road' }],
  ['bus', 'Bus', 'M-4,-2 L-5,-2 L-5,3 L5,3 L5,-2 L4,-2 M-2,-2 L2,-2 O-3,-2 1 O3,-2 1 M-4,0.4 L-4,2 L-2,2 L-2,0.4 Z M-1,0.4 L-1,2 L1,2 L1,0.4 Z M2,0.4 L2,2 L4,2 L4,0.4 Z', { tags: 'vehicle school coach road' }],
  ['truck', 'Truck', 'M-4,-2 L-5,-2 L-5,3 L1,3 L1,1.6 L1,-2 M1,1.6 L3.4,1.6 L5,-0.2 L5,-2 L4,-2 M-2,-2 L1,-2 L2,-2 O-3,-2 1 O3,-2 1', { tags: 'vehicle lorry delivery road' }],
  ['bicycle', 'Bicycle', 'O-3,-1.6 2 O3,-1.6 2 M-3,-1.6 L-1.2,1.4 L1.8,1.4 L-0.2,-1.6 Z M-1.2,1.4 L-0.2,-1.6 M1.8,1.4 L3,-1.6 M1.8,1.4 L1.5,2.4 L2.6,2.6 M-1.2,1.4 L-1.4,2.2 M-2.2,2.2 L-1.4,2.2 L-0.6,2.2', { tags: 'bike cycle ride vehicle' }],
  ['train', 'Train', 'M-4.4,-2 L-5,-2 L-5,3.4 L-1.6,3.4 L-1.6,1.4 L2.2,1.4 L3.4,1.4 L4.8,1.4 L4.8,-2 L4,-2 M2.2,1.4 L2,3.2 L3.6,3.2 L3.4,1.4 M-2.2,-2 L-1.3,-2 M0.9,-2 L1.8,-2 O-3.3,-2 1.1 O-0.2,-2 1.1 O2.9,-2 1.1 M-4.2,1.6 L-4.2,2.6 L-2.4,2.6 L-2.4,1.6 Z O2.8,4.6 0.7 O4.6,5.8 0.9', { tags: 'locomotive steam engine railway vehicle' }],
  ['airplane', 'Airplane', 'M0,5 C0.8,5 1,3.6 1,2.4 L1,1.4 L5,-0.6 L5,-1.8 L1,-0.8 L0.8,-3.4 L2.4,-4.4 L2.4,-5 L0,-4.4 |', { tags: 'plane jet fly aircraft vehicle' }],
  ['helicopter', 'Helicopter', 'E-1,0 3,2.2 0 360 M1.954,0.382 L5.4,1 M5.4,2.2 L5.4,1 L5.4,-0.2 M-1,2.2 L-1,3.4 M-5.4,3.4 L-1,3.4 L3.4,3.4 M-2.5,-1.905 L-2.5,-3.2 M0.5,-1.905 L0.5,-3.2 M-4,-3.2 L-2.5,-3.2 L0.5,-3.2 L2,-3.2', { tags: 'chopper fly aircraft vehicle rotor' }],
  ['ship', 'Ship', 'M-5,0.6 L-2.6,0.6 L2,0.6 L5,0.6 L3.6,-2 L-4,-2 Z M-2.6,0.6 L-2.6,2.4 L-0.6,2.4 L0.8,2.4 L2,2.4 L2,0.6 M-0.6,2.4 L-0.6,4.2 L0.8,4.2 L0.8,2.4 D-2,-0.8 D0,-0.8 D2,-0.8', { tags: 'boat cruise sea vessel vehicle' }],
  ['submarine', 'Submarine', 'E0,0 4.6,2 0 360 M-1,1.952 L-1,3.4 L0,3.4 L1,3.4 L1,1.952 M0,3.4 L0,5 L1.2,5 O-2,0 0.7 O0,0 0.7 O2,0 0.7 M4.6,0 L5.4,0 M5.4,1.2 L5.4,0 L5.4,-1.2', { tags: 'sea underwater vessel vehicle' }],
  ['ufo', 'UFO', 'E0,0 5,1.6 0 360 M-2.2,1.437 C-2.2,4.6 2.2,4.6 2.2,1.437 D-3,-0.2 D0,-0.5 D3,-0.2 M-1.6,-1.516 L-3,-5 M1.6,-1.516 L3,-5', { tags: 'alien spaceship flying saucer space' }],
  ['parachute', 'Parachute', 'M-4.6,1 A0,1 4.6 180 0 B0,1 0.4 B-4.6,1 0.4 M-4.6,1 L0,-4 M0,1 L0,-4 M4.6,1 L0,-4 M-0.8,-4 L0,-4 L0.8,-4 L0.8,-5.4 L-0.8,-5.4 Z', { tags: 'skydive fall air drop canopy' }],
  ['traffic-light', 'Traffic light', 'M-1.8,-5 L1.8,-5 L1.8,5 L-1.8,5 Z O0,3 1 O0,0 1 O0,-3 1', { tags: 'road signal stop go red green' }],
  ['ship-wheel', 'Ship wheel', () => joinDrawings(parsePath('O0,0 4 O0,0 1.2'), spin('M0,1.2 L0,4 L0,5.4', 8)), { tags: 'helm steer captain pirate boat' }],
];

const BUILDINGS = [
  ['lighthouse', 'Lighthouse', 'M-1.8,-5 L-1.5635,-2.5 L-1.327,0 L-1.1,2.4 M1.8,-5 L1.5635,-2.5 L1.327,0 L1.1,2.4 M-1.8,-5 L1.8,-5 M-1.8,2.4 L-1.1,2.4 L1.1,2.4 L1.8,2.4 M-1.1,2.4 L-1.1,4 M1.1,2.4 L1.1,4 M-1.6,4 L-1.1,4 L1.1,4 L1.6,4 L0,5.6 Z M-1.5635,-2.5 L1.5635,-2.5 M-1.327,0 L1.327,0 M2.4,3.7 L5,4.7 M2.4,2.9 L5,1.9 M-2.4,3.7 L-5,4.7 M-2.4,2.9 L-5,1.9', { tags: 'sea tower beacon light coast building' }],
  ['church', 'Church', 'M-3,-5 L-1,-5 L1,-5 L3,-5 L3,0 L0,3 L-3,0 Z M0,3 L0,4.6 L0,5.6 M-0.9,4.6 L0,4.6 L0.9,4.6 M-1,-5 L-1,-2.6 A0,-2.6 1 180 0 L1,-5 O0,0.2 0.8', { tags: 'chapel building cross steeple' }],
  ['tent', 'Tent', 'M-5,-3 L0.6,4.84 M5,-3 L-0.6,4.84 M-5,-3 L-1.4,-3 L1.4,-3 L5,-3 M-1.4,-3 L0,0 L1.4,-3', { tags: 'camp camping outdoors' }],
  ['windmill', 'Windmill', () => joinDrawings(
    parsePath('M-2,-5 L-0.7,-5 L0.7,-5 L2,-5 L1,1.6 L0,1.6 L-1,1.6 Z M-0.7,-5 L-0.7,-3.4 L0.7,-3.4 L0.7,-5'),
    placeDrawing(spin('M0,0 L0,3.6 M-0.6,3.6 L0,3.6 L0.6,3.6', 4, 45), { x: 0, y: 1.6 }),
  ), { tags: 'mill farm wind blades building' }],
  ['city', 'City', 'M-5,-4 L-5,0.6 L-3,0.6 L-3,3.4 L-2,4.6 L-1,3.4 L-1,-1 L0.6,-1 L0.6,2 L2.6,2 L2.6,0 L5,0 L5,-4 Z D-4,-0.8 D-4,-2.4 D-2,2 D-2,0.4 D-2,-1.2 D-2,-2.8 D-0.2,-2.4 D1.6,0.6 D1.6,-1 D1.6,-2.6 D3.8,-1.2 D3.8,-2.8', { tags: 'skyline buildings town skyscraper' }],
  ['pyramids', 'Pyramids', 'M-5,-3 L-1,3 L1.6667,-1 L3,-3 Z M1.6667,-1 L3,1 L5,-3 L3,-3 O-4,3.6 1', { tags: 'egypt desert pharaoh building' }],
  ['barn', 'Barn', 'M-4,-4 L-1.6,-4 L1.6,-4 L4,-4 L4,1 L2.4,3.4 L0,4.6 L-2.4,3.4 L-4,1 Z M-1.6,-4 L-1.6,-0.6 L1.6,-0.6 L1.6,-4 M-1.6,-0.6 L1.6,-4 M1.6,-0.6 L-1.6,-4 O0,2.4 0.8', { tags: 'farm building stable shed' }],
  ['factory', 'Factory', 'M-5,-4 L-5,0 L-3,1.8 L-3,0 L-1,1.8 L-1,0 L1,1.8 L1,0 L2.6,0 L2.6,5 L4.2,5 L4.2,0 L5,0 L5,-4 L0.8,-4 L-0.8,-4 Z M-0.8,-4 L-0.8,-2 L0.8,-2 L0.8,-4 D-3.2,-1.6 D3.2,-1.6', { tags: 'industry building chimney plant' }],
  ['castle-tower', 'Castle tower', 'M-2.6,-5 L-0.9,-5 L0.9,-5 L2.6,-5 L2.6,3 L3.4,3 L3.4,5 L2,5 L2,4 L0.7,4 L0.7,5 L-0.7,5 L-0.7,4 L-2,4 L-2,5 L-3.4,5 L-3.4,3 L-2.6,3 Z M-0.9,-5 L-0.9,-3.2 A0,-3.2 0.9 180 0 L0.9,-5 M0,0.4 L0,1.8', { tags: 'rook fort keep turret building' }],
  ['shop', 'Shop', 'M-5,1 L-4.2,3.4 L4.2,3.4 L5,1 B3,1 -0.4 B1,1 -0.4 B-1,1 -0.4 B-3,1 -0.4 B-5,1 -0.4 M-5,1 L-5,-4 L-1,-4 L1,-4 L5,-4 L5,1 M-1,-4 L-1,-1.2 L1,-1.2 L1,-4 M2,-1.2 L4,-1.2 L4,-2.8 L2,-2.8 Z', { tags: 'store market building buy' }],
  ['torii-gate', 'Torii gate', 'M-5,4.4 Q0,3.4 5,4.4 M-4,2.4 L-2.6,2.4 L2.6,2.4 L4,2.4 M-2.6,4.0352 L-2.6,2.4 L-2.6,-5 M2.6,4.0352 L2.6,2.4 L2.6,-5', { tags: 'japan shrine gate building' }],
  ['ferris-wheel', 'Ferris wheel', ferrisWheel, { tags: 'fair funfair carnival ride big wheel' }],
];

const WINGS = [
  ['angel-wings', 'Angel wings', 'M0.5,2 C1.5,4.8 4,5.6 5.8,5 B4.6,1.2 -0.45 B3,-1 -0.45 B1.4,-2.4 -0.45 B0.5,-0.5 -0.3 Z M1.8,2.2 Q3,3.8 4.6,3.6 M1.6,0.6 Q2.6,1.8 3.8,1.4 |', { tags: 'feather fly heaven bird costume' }],
  ['fairy-wings', 'Fairy wings', 'M0.4,0.4 C1,3.6 3.6,5.6 5,4.6 C5.6,3 3.6,0.6 0.4,0.4 M0.4,-0.2 C2.4,-0.2 4.4,-1.4 4,-3 C3,-4 1,-2.6 0.4,-0.2 |', { tags: 'pixie butterfly fly costume magic' }],
  ['dragon-wings', 'Dragon wings', 'M0.6,0 L2.4,4.4 L5.6,5 Q5.2,3.2 5.4,1.6 Q4.6,0.4 3.6,-1.6 Q2.2,-0.6 0.6,0 M2.4,4.4 L5.4,1.6 M2.4,4.4 L3.6,-1.6 |', { tags: 'demon bat vampire fly costume' }],
];

const HATS = [
  ['top-hat', 'Top hat', 'M-4.6,-2.6 L-2.6,-2.6 L2.6,-2.6 L4.6,-2.6 M-2.6,-2.6 L-2.6,-0.8 L-2.6,4 L2.6,4 L2.6,-0.8 L2.6,-2.6 M-2.6,-0.8 L2.6,-0.8', { tags: 'magician gentleman costume' }],
  ['witch-hat', 'Witch hat', 'M-5.4,-3 L-3,-3 L3,-3 L5.4,-3 M-3,-3 L-2.575,-2 L0.4,5 L2.675,-2 L3,-3 M-2.575,-2 L2.675,-2', { tags: 'wizard halloween magic pointy costume' }],
  ['party-hat', 'Party hat', 'M-3,-4 L3,-4 L1.8,-0.8 L1.05,1.2 L0,4 L-1.5,0 L-2.4,-2.4 Z O0,4.9 0.9 M-2.4,-2.4 L1.8,-0.8 M-1.5,0 L1.05,1.2', { tags: 'birthday cone celebrate costume' }],
  ['cap', 'Cap', 'M3.6,-1 A0,-1 3.6 0 180 L0,-1 L3.6,-1 C4.6,0 6.4,-0.6 6.8,-1.6 C5.6,-2 4.4,-1.8 3.6,-1 M0,2.6 L0,-1', { tags: 'baseball hat sport costume' }],
  ['cowboy-hat', 'Cowboy hat', 'M-5.6,0 Q-3.4,-2.6 0,-2.6 Q3.4,-2.6 5.6,0 M-2.6,-2.158 L-2.448,-1 L-2,2.4 Q0,1.2 2,2.4 L2.448,-1 L2.6,-2.158 M-2.448,-1 L2.448,-1', { tags: 'western sheriff costume' }],
  ['knight-helmet', 'Knight helmet', 'M-3.4,-4 L-3.4,1 A0,1 3.4 180 0 L3.4,-4 Z M-2,0.6 L0,0.6 L2,0.6 M0,0.6 L0,-2.6 M0,4.4 Q2,6.4 3.8,5', { tags: 'armor armour warrior costume' }],
  ['horns', 'Horns', 'M1,-1 C1,2 2.6,4 5,4.6 C4.2,2.6 3.6,0.4 3,-1 Z |', { tags: 'devil demon bull costume' }],
  ['cat-ears', 'Cat ears', 'M0.8,0 L3.4,4.6 L5,0 M2.2,0 L3.3,2.6 L4.2,0 | M-5,0 L-4.2,0 L-2.2,0 L-0.8,0 L0.8,0 L2.2,0 L4.2,0 L5,0', { tags: 'kitty fox headband costume' }],
  ['pirate-hat', 'Pirate hat', 'M-5.6,-1.6 Q0,-3.4 5.6,-1.6 C4.6,1.6 2.6,4 0,4.4 C-2.6,4 -4.6,1.6 -5.6,-1.6 O0,1.2 1 M-1.2,-1.6 L1.2,-0.4 M-1.2,-0.4 L1.2,-1.6', { tags: 'captain tricorn skull costume' }],
  ['chef-hat', 'Chef hat', 'M-2.6,-4 L2.6,-4 L2.6,-1.4 L-2.6,-1.4 Z M2.6,-1.4 C5.4,-0.6 5,4 2,3.4 C1.6,5.4 -1.6,5.4 -2,3.4 C-5,4 -5.4,-0.6 -2.6,-1.4', { tags: 'cook kitchen toque costume' }],
];

const CLOTHES = [
  ['t-shirt', 'T-shirt', 'M0,3.6 Q0.8,3.6 1.4,4.4 L4.8,3 L4.2,0.6 L2.6,1.2 L2.6,-4.4 L0,-4.4 |', { tags: 'shirt top clothes costume' }],
  ['dress', 'Dress', 'M0,3.6 Q0.9,3.6 1.2,4.8 L2.4,4.8 L1.6,1.2 L4.6,-4.4 L0,-4.4 | M-1.6,1.2 L1.6,1.2', { tags: 'gown skirt clothes princess costume' }],
  ['trousers', 'Trousers', 'M0,4.4 L2.6,4.4 L2.7915,3.4 L4.4,-5 L2,-5 L0,1 | M-2.7915,3.4 L2.7915,3.4', { tags: 'pants jeans legs clothes costume' }],
  ['boot', 'Boot', 'M-2,5 L1,5 L1,-1 Q4.4,-1.2 4.6,-3.4 L4.6,-4.6 L-2,-4.6 L-2,-3.4 Z M-2,-3.4 L4.6,-3.4', { tags: 'shoe foot clothes costume' }],
  ['bow-tie', 'Bow tie', 'M0,0.8 L0.8,0.8 L4.6,2.6 L4.6,-2.6 L0.8,-0.8 L0,-0.8 M0.8,0.8 L0.8,-0.8 |', { tags: 'tie formal ribbon costume' }],
  ['glasses', 'Glasses', 'O-2.6,0 2 O2.6,0 2 M-0.6,0 Q0,0.8 0.6,0 M-4.6,0 L-5.6,1 M4.6,0 L5.6,1', { tags: 'spectacles eyes nerd costume' }],
  ['mask', 'Mask', 'M-5,1 C-5,3 -1.6,3 0,1.6 C1.6,3 5,3 5,1 C5,-1.6 2,-2.6 0,-0.6 C-2,-2.6 -5,-1.6 -5,1 N E-2.4,0.6 1.2,0.7 0 360 N E2.4,0.6 1.2,0.7 0 360', { tags: 'eye superhero disguise carnival costume' }],
  ['cape', 'Cape', 'M-2,5 L2,5 L5,-5 Q0,-3.4 -5,-5 Z M-2,5 Q0,3.6 2,5', { tags: 'cloak superhero vampire costume' }],
  ['mitten', 'Mitten', 'M-2.4,-4.4 L2.4,-4.4 L2.4,-3 L2.4,-1 C3.4,2 3,5 0.4,5 C-1.6,5 -2.4,3.4 -2.4,1.6 L-2.4,0.6 L-2.4,-1.6 L-2.4,-3 Z M-2.4,0.6 C-4.6,1.4 -4.6,-1.6 -2.4,-1.6 M-2.4,-3 L2.4,-3', { tags: 'glove winter hand clothes costume' }],
  ['tie', 'Tie', 'M-1,5 L1,5 L0.6,3.6 L-0.6,3.6 Z M-0.6,3.6 L-1.6,-2.6 L0,-5 L1.6,-2.6 L0.6,3.6', { tags: 'necktie formal suit clothes costume' }],
];

const pictures = (cat, sub, list) => list.map(([id, name, draw, extra = {}]) => drawnShape({ id, name, cat, sub, draw, ...extra }));

export const STUFF_SHAPES = [
  ...pictures('food', 'Fruit and vegetables', FRUIT),
  ...pictures('food', 'Meals', MEALS),
  ...pictures('food', 'Sweets', SWEETS),
  ...pictures('food', 'Drinks', DRINKS),
  ...pictures('things', 'Tools', TOOLS),
  ...pictures('things', 'Weapons', WEAPONS),
  ...pictures('things', 'Treasure and magic', MAGIC),
  ...pictures('things', 'Games and sport', GAMES),
  ...pictures('things', 'Music', INSTRUMENTS),
  ...pictures('things', 'Home', HOME),
  ...pictures('things', 'Party and holidays', PARTY),
  ...pictures('travel', 'Vehicles', VEHICLES),
  ...pictures('travel', 'Buildings', BUILDINGS),
  ...pictures('costume', 'Wings', WINGS),
  ...pictures('costume', 'On the head', HATS),
  ...pictures('costume', 'Clothes', CLOTHES),
];
