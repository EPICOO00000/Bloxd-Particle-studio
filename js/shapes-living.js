// More nature (sky and weather, plants, land and sea) and animals. Each one is
// a short drawing in the language described in shape-kit.js ("drawings"), in
// whatever units suit the picture.

import { RAD, drawnShape, stamp, around, scallop, fix } from './shape-kit.js';

const CLOUD = 'M-3.4,0 L3.4,0 B3.8,3.1 0.9 B0.8,5 0.8 B-2.9,3.6 0.85 B-3.4,0 0.9 Z';
const DROP = 'M0,10 C0.6,7.5 3.6,5.5 3.6,3.2 A0,3.2 3.6 0 -180 C-3.6,5.5 -0.6,7.5 0,10';

/** A star outline with `k` points around (cx, cy): `out` to the tips, `inn` to the corners between them. */
const star = (cx, cy, out, inn, k = 5, first = 90) => `M${Array.from({ length: 2 * k }, (_, i) => around(cx, cy, i % 2 ? inn : out, first + (180 * i) / k)).join(' L')} Z`;

// [id, name, drawing, extra fields]
const SKY = [
  ['rain-cloud', 'Rain cloud', `${CLOUD} M-2.4,-1 L-3,-2.6 M0,-1 L-0.6,-2.6 M2.4,-1 L1.8,-2.6`, { tags: 'weather wet shower' }],
  ['storm-cloud', 'Storm cloud', `${CLOUD} M0.6,-0.9 L-1,-3 L0.4,-3 L-0.8,-5.2`, { tags: 'weather thunder lightning' }],
  ['snow-cloud', 'Snow cloud', `${CLOUD} D-2.2,-1.4 D0,-1.4 D2.2,-1.4 D-1.1,-2.8 D1.1,-2.8`, { tags: 'weather winter cold' }],
  ['twister', 'Twister', 'M-5,5 L5,5 M-3.8,3.4 L4.2,3.4 M-2.4,1.8 L3.4,1.8 M-1,0.2 L2.8,0.2 M0,-1.4 L2.4,-1.4 M0.8,-3 L2,-3 D1.6,-4.6', { tags: 'weather tornado storm whirlwind' }],
  ['wind', 'Wind', 'M-5,2 L2.4,2 A2.4,3.4 1.4 -90 180 M-5,0 L3.6,0 A3.6,-1.1 1.1 90 -150 M-3,-2 L0.6,-2 A0.6,-2.9 0.9 90 -120', { tags: 'weather air blow breeze' }],
  ['sunrise', 'Sunrise', () => `M-5,0 L-2.6,0 L2.6,0 L5,0 M2.6,0 A0,0 2.6 0 180 ${[30, 60, 90, 120, 150].map((a) => `M${around(0, 0, 3.6, a)} L${around(0, 0, 5, a)}`).join(' ')}`, { tags: 'sun morning sunset dawn horizon' }],
  ['full-moon', 'Full moon', 'O0,0 5 O-1.6,1.8 1.2 O1.8,-0.4 0.9 O-0.6,-2.4 0.7 D2,2.6 D-3,-0.6', { tags: 'night craters space' }],
  ['constellation', 'Constellation', 'M-5,2 L-2.8,2.8 L-1,2 L0.8,1 L1.2,-1.4 L4.4,-1.6 L4.8,1 L0.8,1', { tags: 'stars big dipper plough night sky' }],
  ['raindrops', 'Raindrops', () => stamp(DROP, [[-2.6, 1.4, 0.42], [1.2, 3.4, 0.5], [0.6, -3.6, 0.36], [3.6, -1.6, 0.3]]), { tags: 'water rain wet tears' }],
  ['stars-three', 'Three stars', () => `${star(-1.6, -1, 3.4, 1.43)} ${star(3.2, 3, 1.8, 0.76)} ${star(3.4, -3.4, 1.3, 0.6)}`, { tags: 'night sky rating' }],
];

const PLANTS = [
  ['rose-flower', 'Rose flower', 'O0.2,7 2.5 M0.4,7 A0,7 0.4 0 180 A0.3,7 0.7 180 360 A0,7 1 0 180 A0.3,7 1.3 180 360 M0.2,4.5 L0.2,0.6 L0.2,-1 M0.2,0.6 Q2.6,0.4 3.2,2.4 Q1,2.4 0.2,0.6', { tags: 'flower love' }],
  ['sunflower', 'Sunflower', () => `${star(0, 6.2, 3.6, 2.4, 12)} O0,6.2 1.5 M0,2.6 L0,0.6 L0,-0.6 L0,-2 M0,-0.6 Q2.4,-0.8 3,1.2 Q0.8,1.2 0,-0.6 M0,0.6 Q-2.4,0.4 -3,2.4 Q-0.8,2.4 0,0.6`, { tags: 'flower summer' }],
  ['wheat', 'Wheat', 'M0,3.4 L1.2,4.6 M0,2 L1.4,3.4 M0,0.6 L1.4,2 M0,-0.8 L1.2,0.4 | M0,-5 L0,-0.8 L0,0.6 L0,2 L0,3.4 L0,5', { tags: 'grain corn farm harvest' }],
  ['bamboo', 'Bamboo', 'M-2,-5 L-2,-1.8 L-2,0 L-2,1.6 L-2,5 M-2.7,-1.8 L-1.3,-1.8 M-2.7,1.6 L-1.3,1.6 M1.6,-5 L1.6,-0.4 L1.6,3.4 M0.9,-0.4 L2.3,-0.4 M1.6,3.4 L3.6,5 M1.6,3.4 L0.2,5.2 M-2,0 L-4.2,1.6', { tags: 'plant panda stalk' }],
  ['sprout', 'Sprout', 'M-3,0 L0,0 L3,0 M0,0 L0,4 C1.4,6.2 3,7.2 4.6,7 C4.4,5 2.4,3.8 0,4 C-1.4,6 -2.4,6.6 -3.6,6.4 C-3.4,4.8 -1.8,3.8 0,4', { tags: 'seedling plant grow leaves' }],
  ['acorn', 'Acorn', 'M0,5.4 L2.6,5.4 L3.2,5.4 E0,5.4 3.2,2.2 0 90 M2.6,5.4 C2.6,2.4 1.2,0.6 0,-0.6 | M0,7.6 L0.4,9', { tags: 'nut oak squirrel autumn' }],
  ['maple-leaf', 'Maple leaf', 'M0,5.4 L0.8,3 L1.8,4 L2.2,2.6 L4.2,3 L3.6,1 L5,0.4 L2.4,-1.6 L3,-3.2 L0,-2.6 | M0,-2.6 L0,-5', { tags: 'autumn fall canada' }],
  ['palm-tree', 'Palm tree', 'M-0.6,-5 Q0.8,-1 -0.4,3.4 Q-2.4,4.8 -4,3 M-0.4,3.4 Q1.6,5 3.4,3.4 M-0.4,3.4 Q-1.6,2.8 -2.4,1 M-0.4,3.4 Q1,2.8 1.8,1.2 M-0.4,3.4 L-0.2,5.4', { tags: 'beach island tropical' }],
  ['apple-tree', 'Apple tree', 'M0.9,0 L0.9,3 B3.7,5 0.75 B2.3,8.4 0.75 A0,7.8 2.377 14.6 90 | M-0.9,0 L0.9,0 D-1.6,5.2 D1.5,6.4 D0,8 D0.2,4.4 D-1.4,7.4', { tags: 'fruit orchard' }],
  ['grass-blades', 'Grass', 'M-5,0 L-4,0 L-2.4,0 L-0.8,0 L0.8,0 L2.4,0 L4,0 L5,0 M-4,0 L-4.8,2.6 M-2.4,0 L-2.8,4 M-0.8,0 L-0.6,3 M0.8,0 L1.4,4.4 M2.4,0 L2.4,2.8 M4,0 L4.8,3.4', { tags: 'lawn meadow blades' }],
];

const LAND = [
  ['sea-wave', 'Sea wave', 'M-5,0 C-2.4,0.2 -1,2.6 0.4,5 C1.6,7 3.8,7 4.6,5.4 C3.4,5.2 2.6,4.6 2.6,3.4 C2.6,2 3.6,0.6 5,0', { tags: 'sea surf water ocean' }],
  ['waves', 'Waves', () => [2.6, 0, -2.6].map((y) => `M-5,${y} Q-3.75,${fix(y + 1.6)} -2.5,${y} Q-1.25,${fix(y - 1.6)} 0,${y} Q1.25,${fix(y + 1.6)} 2.5,${y} Q3.75,${fix(y - 1.6)} 5,${y}`).join(' '), { tags: 'sea water ocean river' }],
  ['island', 'Island', 'M-6.6,0 L-5,0 Q0,3.6 5,0 L6.6,0 M0,1.8 Q0.8,5 -0.4,8 Q-2.4,9.4 -4,7.6 M-0.4,8 Q1.6,9.6 3.4,8 M-0.4,8 Q-1.6,7.4 -2.4,5.6 M-0.4,8 Q1,7.4 1.8,5.8', { tags: 'palm beach sea desert' }],
  ['scallop-shell', 'Scallop shell', 'M-1.2,-3 L-4.698,1.71 A0,0 5 160 20 L1.2,-3 L0.6,-3 L0,-3 L-0.6,-3 L-1.2,-3 L-1.6,-4.2 L1.6,-4.2 L1.2,-3 M-0.6,-3 L-2.5,4.33 M0,-3 L0,5 M0.6,-3 L2.5,4.33', { tags: 'sea beach clam fan' }],
];

// The round head most of the animal faces share, and ears that sit on it.
const HEAD = 'O0,4.4 4';
const ROUND_EAR = 'M3.464,6.4 B1.368,8.159';

const hedgehog = () => {
  const back = Array.from({ length: 15 }, (_, i) => {
    const a = (170 - i * 9.3) * RAD;
    const r = i % 2 ? 4.8 : 3.6;
    return `${fix(r * Math.cos(a))},${fix(0.9 * r * Math.sin(a))}`;
  });
  return `M${back.join(' L')} L5.4,0.5 L3.6,-0.6 L2,-0.6 L-2,-0.6 L-3.6,-0.6 Z M-2,-0.6 L-2,-1.5 M2,-0.6 L2,-1.5 D3.5,0.8`;
};

const FARM = [
  ['dog', 'Dog', `M2.571,7.464 C4.6,8 5.8,6.4 5.6,4 C5.5,2.8 5,2.4 3.864,3.365 D1.6,5.4 M0,2.6 Q0.8,1.8 1.6,2.5 M0,4 L0.6,4 L0,3.3 | ${HEAD} M0,3.3 L0,2.6`, { tags: 'puppy face pet' }],
  ['pig', 'Pig', `M3.277,6.694 L3.6,9.2 L1.69,8.025 D1.7,5.4 D0.7,3.2 | ${HEAD} N E0,3.2 1.9,1.3 0 360`, { tags: 'face farm piglet oink' }],
  ['mouse', 'Mouse', 'M3.081,5.037 B0.59,6.948 1.6 D1.3,4.4 M1.4,2.8 L4.2,3.2 M1.4,2.2 L4.2,1.6 M0,2.6 L0.5,2.6 L0,2 | O0,3.6 3.4', { tags: 'face rat pet cheese' }],
  ['cow', 'Cow', 'M0,8 L2.6,8 C3.6,6 3.4,3 2.8,1.6 C2.4,0.4 1.2,0 0,0 M2.6,8 C3.2,9 4.2,9.6 5,9.4 M2.972,7.041 L5.4,6.2 L3.3,4.575 D1.4,5.6 D0.8,2 | E0,2 1.8,1.2 0 360', { tags: 'face farm bull moo horns' }],
  ['sheep', 'Sheep', () => `${scallop(0, 4.6, 3.6, 8, 1)} N E0,3.6 1.5,2 0 360 D-0.6,4 D0.6,4 M-0.4,2.6 L0,2.2 L0.4,2.6`, { tags: 'face farm wool lamb' }],
  ['chick', 'Chick', 'O0,4 3.6 D-1.2,5 D1.2,5 M-0.6,3.8 L0,4.3 L0.6,3.8 L0,3.3 Z M-1,0.542 L-1,-0.8 L-1.7,-1.4 M-1,-0.8 L-0.3,-1.4 M1,0.542 L1,-0.8 L0.3,-1.4 M1,-0.8 L1.7,-1.4 M0,7.6 L-0.4,8.8 M0,7.6 L0.6,8.6', { tags: 'bird baby chicken farm easter' }],
  ['duck', 'Duck', 'O-2,5.6 2 D-2.6,6.2 M-3.879,6.284 L-5.4,5.5 L-3.813,4.755 M5,4.4 C4.6,1.4 3,0 0,0 C-3,0 -4.6,1.6 -3.286,4.068 M-0.468,4.314 C0.6,3.2 3.4,3 5,4.4 M0.6,2 Q2,0.8 3.4,2.2', { tags: 'bird rubber bath farm quack' }],
];

const WILD = [
  ['bear', 'Bear', `${ROUND_EAR} 1.3 D1.5,5.4 M0,3.6 L0.5,3.6 L0,3 | ${HEAD} O0,3 1.5 M0,3 L0,2.2`, { tags: 'face teddy' }],
  ['panda', 'Panda', `${ROUND_EAR} 1.3 N E1.7,5.2 0.9,1.2 0 360 D1.7,5.2 M0,3.4 L0.5,3.4 L0,2.8 M0,2.2 Q0.7,1.6 1.3,2.2 | ${HEAD} M0,2.8 L0,2.2`, { tags: 'face bear bamboo' }],
  ['koala', 'Koala', `${ROUND_EAR} 1.7 D1.6,5.2 | ${HEAD} N E0,3.6 0.8,1.2 0 360`, { tags: 'face bear australia' }],
  ['tiger', 'Tiger', `${ROUND_EAR} 1.3 D1.5,5.2 M0.695,8.339 L0.55,7.1 M3.939,5.095 L2.7,4.9 M3.939,3.705 L2.7,3.9 M0,3.6 L0.5,3.6 L0,3 M0,2.4 Q0.7,1.8 1.3,2.4 | ${HEAD} M0,8.4 L0,7 M0,3 L0,2.4`, { tags: 'face big cat stripes' }],
  ['lion', 'Lion', () => `${scallop(0, 0, 3.9, 8, 1)} O0,0 2.9 D-1.1,0.8 D1.1,0.8 M-0.5,-0.2 L0.5,-0.2 L0,-0.8 Z M0,-0.8 L0,-1.3 Q0.6,-1.9 1.2,-1.4 M0,-1.3 Q-0.6,-1.9 -1.2,-1.4`, { tags: 'face big cat mane king' }],
  ['fox', 'Fox', 'M0,0 L4.6,5 L3.6,9.4 L1.6,6.6 L0,6.6 D1.6,4.8 | D0,1.6', { tags: 'face wolf' }],
  ['monkey', 'Monkey', `M3.759,3.032 B3.625,6.09 1.2 D1.2,5.6 D0.4,3.2 | ${HEAD} N E0,2.8 2,1.4 0 360 M-1,2.4 Q0,1.9 1,2.4`, { tags: 'face ape chimp' }],
  ['elephant', 'Elephant', 'M1.606,6.894 B2.145,2.8 -1.3 D1.1,5.2 | O0,4.6 2.8 M-0.958,1.969 L-0.958,-0.4 C-0.958,-2 1.2,-2.4 2.6,-1.4 L2.2,-0.2 C1.4,-0.8 0.958,-0.6 0.958,0.4 L0.958,1.969', { tags: 'face trunk big ears' }],
  ['deer', 'Deer', 'M0,0 C1.6,0 2.6,2 2.6,4 C2.6,5.6 1.6,6.6 0,6.6 M1.606,6.146 L2.6,8 L2.4,8.9 L2.2,9.8 M2.6,8 L4.2,8.8 M2.4,8.9 L3.6,10 M2.341,5.267 L4.8,4.8 L2.483,2.816 D1.1,3.8 | D0,1', { tags: 'face antlers reindeer stag' }],
  ['frog', 'Frog', 'M3.524,4.928 B1.191,5.898 1.4 D2.55,6.3 D0.5,3.8 | E0,3 4.6,3 0 360 M-3,2.6 Q0,0.6 3,2.6', { tags: 'face toad pond' }],
  ['snake', 'Snake', 'M-4.4,-4.4 L2.4,-4.4 C5,-4.4 5,-1.4 2.4,-1.4 L-1.6,-1.4 C-4.2,-1.4 -4.2,1.6 -1.6,1.6 L1,1.6 N E2.6,1.6 1.6,1.1 0 360 D2.8,1.9 M4.2,1.6 L5,1.6 L5.6,2.2 M5,1.6 L5.6,1', { tags: 'serpent reptile' }],
  ['turtle', 'Turtle', 'M3.195,1.368 B2.185,3.064 1.2 M2.185,-3.064 B3.195,-1.368 1.2 D0.45,4.6 | E0,0 3.4,4 0 360 M1.163,3.759 B-1.163,3.759 1.5 M-0.5,-3.957 L0,-5 L0.5,-3.957 M0,2 L1.6,1 L1.6,-1 L0,-2 L-1.6,-1 L-1.6,1 Z', { tags: 'tortoise shell reptile sea' }],
  ['hedgehog', 'Hedgehog', hedgehog, { tags: 'spikes spiny porcupine' }],
];

const BIRDS = [
  ['owl', 'Owl', 'E0,4.4 3.6,4.4 0 360 O-1.5,5.8 1.2 O1.5,5.8 1.2 D-1.5,5.8 D1.5,5.8 M-0.5,4.4 L0.5,4.4 L0,3.5 Z M2.065,8.004 L3.8,9.2 L3.118,6.6 M-2.065,8.004 L-3.8,9.2 L-3.118,6.6 M-1,2.2 L0,1.4 L1,2.2', { tags: 'bird night wise' }],
  ['penguin', 'Penguin', 'E0,4.6 3.2,4.6 0 360 N E0,3.4 2,2.6 0 360 D-1.2,8 D1.2,8 M-0.5,7.4 L0.5,7.4 L0,6.7 Z M3.123,5.6 L5,4.4 M-3.123,5.6 L-5,4.4 M1.2,0.336 L2.2,-0.5 M-1.2,0.336 L-2.2,-0.5', { tags: 'bird ice antarctic' }],
  ['swan', 'Swan', 'M-4.8,6.4 L-3.6,7 C-3.2,8.2 -1.6,8 -1.6,6.6 C-1.6,5 -3.2,4.2 -3.2,2.6 C-3.2,0.8 -1,0 1.4,0 C3.4,0 4.8,1 5.4,3.6 C4,2.6 2.6,2.8 1.4,3.6 C0.2,4.4 -1.6,3.6 -3.2,2.6 D-2.6,7.1', { tags: 'bird lake goose' }],
  ['feather', 'Feather', 'M-4,-5 L-2.6,-3.158 L3.6,5 C0,5.4 -3.4,1.6 -2.6,-3.158 M3.6,5 C4,1.6 1,-2.6 -2.6,-3.158', { tags: 'bird quill pen light' }],
];

const SEA = [
  ['whale', 'Whale', 'M-5,2 C-5,5.6 -0.6,6.2 2,4.4 L4,3 C1,0.2 -5,-0.6 -5,2 M4,3 L5.4,5 M4,3 L5.6,1.4 D-3.6,3 M-4.2,1.8 Q-3.4,1.4 -2.6,1.8 M-2,6.2 L-2,7.4 Q-3.2,8.6 -3.8,7.6 M-2,7.4 Q-0.8,8.6 -0.2,7.6', { tags: 'sea ocean big spout' }],
  ['shark-fin', 'Shark fin', 'M-5,0 Q-4,0.8 -3,0 Q-2,-0.8 -1,0 C0,3 1,5 3,6.6 C2.8,4 3,2 3.6,0 Q4.3,-0.8 5,0 M-5,-2.2 Q-3.75,-1.4 -2.5,-2.2 Q-1.25,-3 0,-2.2 Q1.25,-1.4 2.5,-2.2 Q3.75,-3 5,-2.2', { tags: 'sea danger water jaws' }],
  ['octopus', 'Octopus', 'M3.4,3 A0,3 3.4 0 90 M3.4,3 Q4.6,1.4 3.6,0 Q2.8,-1.2 4,-2.4 M1.4,3 Q2.4,1 1.4,-0.6 Q0.6,-1.8 1.6,-3 D1.2,4.4 | M-0.7,3.6 Q0,3 0.7,3.6', { tags: 'sea tentacles squid kraken' }],
  ['jellyfish', 'Jellyfish', 'A0,2 4 0 180 B-2,2 0.5 B0,2 0.5 B2,2 0.5 B4,2 0.5 M-3,1.5 Q-3.8,0.4 -3,-0.8 Q-2.2,-2 -3,-3.2 M-1,1.5 Q-2,0 -1,-1.5 Q0,-3 -1,-4.5 M1,1.5 Q2,0 1,-1.5 Q0,-3 1,-4.5 M3,1.5 Q3.8,0.4 3,-0.8 Q2.2,-2 3,-3.2 D-1.2,3.6 D1.2,3.6', { tags: 'sea tentacles sting' }],
  ['crab', 'Crab', 'M2.785,1.262 L4.4,3 L4,4.6 L3,5.6 M4,4.6 L5,5.4 M3.387,0.192 L5,0.4 L5.6,-0.8 M3.284,-0.569 L4.8,-1 L5.4,-2.2 M2.785,-1.262 L4.2,-2.2 L4.6,-3.4 M0.8,2.138 L0.8,3.2 | E0,0 3.4,2.2 0 360 M-0.8,-0.6 Q0,-1.2 0.8,-0.6', { tags: 'sea beach claws pincers' }],
  ['starfish', 'Starfish', () => `${star(0, 0, 5, 2.2)} D0,0 ${[0, 1, 2, 3, 4].map((i) => `D${around(0, 0, 2.6, 90 + 72 * i)}`).join(' ')}`, { tags: 'sea star beach' }],
  ['fish-bones', 'Fish bones', 'M-5,0 L-2.6,1.6 L-2.6,0 L-2.6,-1.6 Z M-2.6,0 L-1.2,0 L0.4,0 L2,0 L3.6,0 L5,1.5 L5,-1.5 L3.6,0 M-1.2,0 L-0.4,1.5 M-1.2,0 L-0.4,-1.5 M0.4,0 L1.2,1.5 M0.4,0 L1.2,-1.5 M2,0 L2.8,1.3 M2,0 L2.8,-1.3 D-3.5,0', { tags: 'skeleton cat food dead' }],
];

const BUGS = [
  ['bee', 'Bee', 'E0,0 3,2.2 0 360 M-1,2.074 L-1,-2.074 M1,2.074 L1,-2.074 O-1.6,4.2 1.5 O1.8,4.4 1.3 M-3,0 L-4.2,0 O4.5,0 0.9 M4.95,0.779 L5.6,2 M4.192,0.846 L3.9,2.2', { tags: 'insect honey wasp buzz' }],
  ['ladybird', 'Ladybird', 'D1.8,1.6 D2.2,-0.8 D1,-2.6 M0.6,4.974 L1.4,6.2 | O0,0 4 M0,4 L0,-4 M2,3.464 B-2,3.464 0.8', { tags: 'insect ladybug beetle spots' }],
  ['spider', 'Spider', 'M1.839,0.543 L3.2,3 L4.4,5.2 M2.318,-0.379 L4.4,1 L5.6,2.4 M2.364,-1.417 L4.4,-2 L5.6,-3.4 M1.966,-2.377 L3.2,-4 L4.2,-6 D0.4,2 | O0,-1 2.4 M1.2,1.078 B-1.2,1.078 1.3', { tags: 'insect legs halloween' }],
  ['ant', 'Ant', 'M0.8,0.6 L2.4,1.6 L2.8,2.8 M1,0 L2.6,0 L3.6,-0.6 M0.8,-0.6 L2.4,-1.6 L2.8,-2.8 M0.55,3.553 L1.4,4.6 L2.4,4.6 | O0,-3.2 1.6 O0,0 1 O0,2.6 1.1 M0,-1.6 L0,-1 M0,1 L0,1.5', { tags: 'insect bug' }],
  ['dragonfly', 'Dragonfly', 'M0,3 C2,5 5,5 5.4,4 C5,3 2,2.6 0,3 M0,2 C2,2.2 5,1.6 5,0.6 C4.6,-0.4 2,0.6 0,2 | M0,5 L0,3 L0,2 L0,-5 O0,5.6 0.6', { tags: 'insect wings' }],
  ['snail', 'Snail', 'M-5,0 L-2.4,0 L-1.418,0 L3.418,0 L5.2,0 M3.418,0 A1,1.6 2.9 -33.5 213.5 M1.5,2.1 A1,2.1 0.5 0 180 A1.35,2.1 0.85 180 360 A1,2.1 1.2 0 180 M-5,0 C-5.6,1.4 -5,2.8 -4,2.8 C-3,2.8 -2.6,1.4 -2.4,0 M-4.415,2.709 L-4.9,4.4 M-3.586,2.709 L-3.1,4.4', { tags: 'slow shell slug' }],
  ['caterpillar', 'Caterpillar', 'O-3.8,0 1 O-1.3,0.6 1 O1.2,0 1 O3.8,0.8 1.2 M-3.8,-1 L-3.8,-1.9 M-1.3,-0.4 L-1.3,-1.3 M1.2,-1 L1.2,-1.9 M3.2,1.839 L2.8,3 M4.4,1.839 L4.8,3 D3.4,1 D4.2,1', { tags: 'insect worm bug larva' }],
];

const DINOS = [
  ['dinosaur', 'Dinosaur', 'M-5.2,7 L-4,7.8 L-3.2,7.2 C-2.6,5.4 -1.6,4.6 0,4.6 C2,4.6 3.6,3.6 5.6,1 C3.6,0.8 2.6,1.6 2,1.8 L2,0 L1,0 L1,1.8 L-0.8,1.8 L-0.8,0 L-1.8,0 L-1.8,2.2 C-2.6,3 -3.2,4.6 -3.8,6.4 Z D-4.1,7.1', { tags: 'dino long neck sauropod' }],
  ['stegosaurus', 'Stegosaurus', 'M-5.4,1.4 L-4.4,2.2 L-3.4,2.6 L-3,3.8 L-2.2,3.2 L-1.4,5 L-0.4,3.8 L0.6,5.4 L1.4,3.8 L2.4,4.6 L2.8,3.2 L3.6,3.4 L4,2.4 L5.6,1.2 L3.6,0.9 L2.4,1.2 L2.4,-0.6 L1.4,-0.6 L1.4,1.2 L-1.4,1.2 L-1.4,-0.6 L-2.4,-0.6 L-2.4,1.2 L-4.2,0.8 Z D-4.4,1.5', { tags: 'dinosaur dino plates spikes' }],
  ['hatching-egg', 'Hatching egg', 'M0,5 C2.4,5 3.8,1.6 3.8,-0.8 C3.8,-3.4 2,-5 0,-5 | M-3.751,0 L-2.4,1.2 L-1.2,-0.4 L0,1.2 L1.2,-0.4 L2.4,1.2 L3.751,0', { tags: 'cracked dragon dinosaur chick baby' }],
  ['dragon-eye', 'Dragon eye', 'M-5,0 B5,0 -0.45 B-5,0 -0.45 M0,1.5 B0,-1.5 0.35 B0,1.5 0.35 M-5,3 L-1.6,4 L4.6,2.2', { tags: 'reptile snake cat slit' }],
  ['sea-monster', 'Sea monster', 'M-5.6,0 L-3.2,0 L-2,0 L-0.6,0 L2.6,0 L3.6,0 L5.8,0 M-2,0 C-2,3 -2.6,5.4 -4,5.4 L-5.2,4.8 L-4,4.4 C-3.2,4.2 -3.2,2 -3.2,0 M-0.6,0 Q1,3.2 2.6,0 M3.6,0 Q4.4,2.4 5.4,2.6 D-4,4.9', { tags: 'loch ness serpent dragon nessie' }],
];

const pictures = (cat, sub, list) => list.map(([id, name, draw, extra = {}]) => drawnShape({ id, name, cat, sub, draw, ...extra }));

export const LIVING_SHAPES = [
  ...pictures('nature', 'Sky and weather', SKY),
  ...pictures('nature', 'Plants', PLANTS),
  ...pictures('nature', 'Land and sea', LAND),
  ...pictures('animals', 'Pets and farm', FARM),
  ...pictures('animals', 'Wild animals', WILD),
  ...pictures('animals', 'Birds', BIRDS),
  ...pictures('animals', 'Sea animals', SEA),
  ...pictures('animals', 'Bugs', BUGS),
  ...pictures('animals', 'Dinosaurs and dragons', DINOS),
];
