// Still more nature (sky and weather, plants, land and sea) and animals, added
// when the library grew to 1,624 shapes. Each one is a short drawing in the
// language described in shape-kit.js ("drawings"), in whatever units suit the
// picture.

import { drawnShape, parsePath, joinDrawings, spin, stamp, around, scallop } from './shape-kit.js';

const CLOUD = 'M-3.4,0 L3.4,0 B3.8,3.1 0.9 B0.8,5 0.8 B-2.9,3.6 0.85 B-3.4,0 0.9 Z';
const DROP = 'M0,10 C0.6,7.5 3.6,5.5 3.6,3.2 A0,3.2 3.6 0 -180 C-3.6,5.5 -0.6,7.5 0,10';
const HEART = 'M0,7.4 C1,10 5,10 5,6.6 C5,3.6 1.6,1.6 0,0 |';
const EGG = 'M0,5 C2.4,5 3.8,1.6 3.8,-0.8 C3.8,-3.4 2,-5 0,-5 |';
// a leaf lying along the x axis, its stalk end at the origin
const LEAF = 'M0,0 Q1.3,0.9 2.6,0 Q1.3,-0.9 0,0';
const HOLLY_LEAF = 'M0,0 B1.5,1.4 -0.25 B1.7,3.4 -0.4 B1.3,5 -0.4 L0,6.4 | M0,2 L0,5';

/** A star outline with `k` points around (cx, cy): `out` to the tips, `inn` to the corners between them. */
const star = (cx, cy, out, inn, k = 5, first = 90) => `M${Array.from({ length: 2 * k }, (_, i) => around(cx, cy, i % 2 ? inn : out, first + (180 * i) / k)).join(' L')} Z`;
/** Short lines pointing away from (cx, cy), from `from` to `to`, at the given angles. */
const rays = (cx, cy, from, to, angles) => angles.map((a) => `M${around(cx, cy, from, a)} L${around(cx, cy, to, a)}`).join(' ');

const METEOR = `${star(0, 0, 1.1, 0.46)} M0.9,0.9 L3.8,3.8 M1.7,0.5 L3.3,2.1 M0.5,1.7 L2.1,3.3`;

// [id, name, drawing, extra fields]
const SKY = [
  ['sun-cloud', 'Sun and cloud', () => joinDrawings(parsePath(`O-2.6,3 1.5 ${rays(-2.6, 3, 2.2, 3, [0, 45, 90, 135, 180, 225, 270])}`), stamp(CLOUD, [[0.8, -3.6, 0.8]])), { tags: 'weather partly cloudy fair day' }],
  ['fog', 'Fog', `${CLOUD} M-4,-1.4 L4.6,-1.4 M-4.8,-2.8 L3.4,-2.8 M-3.2,-4.2 L4.8,-4.2`, { tags: 'weather mist haze cloud grey' }],
  ['rainbow-clouds', 'Rainbow and clouds', () => joinDrawings(parsePath('A0,0 5 18 162 N A0,0 4 18 162 N A0,0 3 18 162'), stamp(CLOUD, [[-4, -1.6, 0.42], [4, -1.6, 0.42]])), { tags: 'weather colours arc sky happy' }],
  ['moon-stars', 'Moon and stars', () => `M0.8,4.2 B0.8,-4.2 1.5 B0.8,4.2 -0.75 Z ${star(3.6, 2.4, 1.6, 0.67)} ${star(1.8, -0.2, 1.1, 0.46)} ${star(4.4, -2.6, 1.1, 0.46)}`, { tags: 'night sky crescent sleep bedtime' }],
  ['ice-crystal', 'Ice crystal', () => spin('M0,0 L0,1.8 L0,3.2 L0.9,4.1 L0,5 L-0.9,4.1 L0,3.2 M0,1.8 L1,2.5 M0,1.8 L-1,2.5', 6), { tags: 'snowflake snow winter frost cold freeze' }],
  ['icicles', 'Icicles', 'M-5,4 L5,4 L4.3,-1.6 L3.6,4 L2.9,1 L2.2,4 L1.1,-4.6 L0,4 L-0.7,0.4 L-1.4,4 L-2.4,-3.6 L-3.4,4 L-4.2,-1 L-5,4 D1.1,-5.8', { tags: 'ice winter cold frozen spikes drip' }],
  ['sun-face', 'Smiling sun', () => `O0,0 3 D-1.1,0.8 D1.1,0.8 M-1.4,-0.8 Q0,-2.2 1.4,-0.8 ${rays(0, 0, 3.8, 5, [0, 45, 90, 135, 180, 225, 270, 315])}`, { tags: 'weather happy summer day face sunny' }],
  ['moon-sleeping', 'Sleeping moon', 'M1,5 B1,-5 1.4 B1,5 -0.7 Z M-4.9,1 Q-4.2,0.2 -3.5,1 M-4.6,-1.2 Q-4,-2 -3.2,-1.4 M2.2,1.4 L4,1.4 L2.2,-0.8 L4,-0.8 M4.6,4 L5.8,4 L4.6,2.6 L5.8,2.6', { tags: 'night crescent face zzz bedtime dream' }],
  ['cloud-happy', 'Happy cloud', `${CLOUD} D-1.4,2.4 D1.4,2.4 M-1.2,1.2 Q0,0.2 1.2,1.2`, { tags: 'weather face smile cute kawaii' }],
  ['thermometer', 'Thermometer', 'M0.8,-2.014 A0,-3.4 1.6 60 -240 L-0.8,4.2 B0.8,4.2 -1 L0.8,-2.014 M0,-3.4 L0,1.8 M1.8,3 L3,3 M1.8,1.4 L3,1.4 M1.8,-0.2 L3,-0.2', { tags: 'weather hot cold temperature heat fever degrees' }],
  ['moon-cloud', 'Night cloud', () => joinDrawings(parsePath(`M3,5.4 B3,0.6 1.5 B3,5.4 -0.75 Z ${star(-3.4, 3.2, 1.2, 0.5)}`), stamp(CLOUD, [[-0.6, -5.2, 0.85]])), { tags: 'weather moon crescent evening star' }],
  ['falling-stars', 'Falling stars', () => stamp(METEOR, [[-4, 0.2], [0, -4.6], [1.2, 0.6, 0.8]]), { tags: 'space falling stars shooting night comet' }],
  ['clouds', 'Clouds', () => stamp(CLOUD, [[-1, -4.6, 0.8], [1.8, 1.2, 0.55]]), { tags: 'weather cloudy overcast sky two' }],
];

const dandelion = () => `${[90, 126, 162, 198, 234, 306, 342, 18, 54].map((a) => `M0,1.6 L${around(0, 1.6, 2.5, a)} D${around(0, 1.6, 3.4, a)}`).join(' ')} M0,1.6 L0,-3.2 L0,-5 M0,-3.2 Q1.6,-3.4 2.4,-2.2`;

const PLANTS = [
  ['fern', 'Fern', 'M-0.6,-5 L-0.55,-3.4 L-0.45,-2 L-0.25,-0.6 L0,0.8 L0.35,2.2 L0.75,3.5 L1.2,5 M-3.6,-2.4 L-0.55,-3.4 L2.5,-2.4 M-3.3,-0.9 L-0.45,-2 L2.4,-0.9 M-2.7,0.5 L-0.25,-0.6 L2.3,0.5 M-2,1.8 L0,0.8 L2.1,1.8 M-1.2,3 L0.35,2.2 L1.9,3 M-0.2,4.1 L0.75,3.5 L1.8,4.1', { tags: 'leaf frond forest jungle plant' }],
  ['potted-plant', 'Potted plant', 'M0,0.5 Q2,2.6 4.2,2.8 Q3,0.4 0,0.5 | M0,0 L0,0.5 L0,1.4 Q-1.5,3.4 0,5.4 Q1.5,3.4 0,1.4 M-2.8,0 L0,0 L2.8,0 L2.8,-1.2 L2.3,-1.2 L-2.3,-1.2 L-2.8,-1.2 Z M-2.3,-1.2 L-1.7,-5 L1.7,-5 L2.3,-1.2', { tags: 'pot house plant leaves indoor flowerpot' }],
  ['oak-leaf', 'Oak leaf', 'M0,-3.6 L1.1,-3 B1.3,-1 0.7 B1.4,1.2 0.7 B1.1,3.1 0.7 B0,4.9 0.7 | M0,-5 L0,-3.6 L0,3.2', { tags: 'autumn fall tree lobed' }],
  ['cherry-blossom', 'Cherry blossom', () => joinDrawings(spin('M0,1 C0.9,1.6 2.2,3.4 0.6,4.7 L0,4.1 L-0.6,4.7 C-2.2,3.4 -0.9,1.6 0,1', 5), parsePath('D0,0')), { tags: 'flower sakura spring japan petals pink' }],
  ['tree-stump', 'Tree stump', 'M3.4,2 L3.4,-1.6 Q3.6,-3.2 5,-3.8 | N E0,2 3.4,1.3 0 360 N E0,2 1.7,0.6 0 360 M-2.6,-3.4 Q0,-2.6 2.6,-3.4 M-1.4,-0.4 L-1.4,-1.8 M1,0 L1,-1.2', { tags: 'wood cut log rings forest' }],
  ['log', 'Log', 'N E-3.4,0 1.3,2.4 0 360 N E-3.4,0 0.6,1.1 0 360 M-3.4,2.4 L3.6,2.4 M-3.4,-2.4 L3.6,-2.4 N E3.6,0 1.3,2.4 -90 90 M-0.8,1 L1.4,1 M0.2,-0.8 L2.6,-0.8', { tags: 'wood timber tree trunk firewood' }],
  ['holly', 'Holly', () => joinDrawings(stamp(HOLLY_LEAF, [[-0.5, 0.9, 1, 45], [0.5, 0.9, 1, -45]]), parsePath('O0,-0.6 0.9 O-1.3,-2.6 0.9 O1.3,-2.6 0.9')), { tags: 'christmas berries winter leaves festive' }],
  ['dandelion', 'Dandelion', dandelion, { tags: 'flower seeds wish blow clock puff' }],
  ['cattail', 'Cattail', 'M-5,-5 L-3.6,-5 L-2.6,-5 L0,-5 L2.6,-5 L3.6,-5 L5,-5 M0,-5 L0,1.6 M-0.55,2.15 L-0.55,3.65 B0.55,3.65 -1 L0.55,2.15 B-0.55,2.15 -1 M0,4.2 L0,5.2 M-2.6,-5 L-2.6,-0.6 M-3.15,-0.05 L-3.15,1.25 B-2.05,1.25 -1 L-2.05,-0.05 B-3.15,-0.05 -1 M-2.6,1.8 L-2.6,2.7 M2.6,-5 L2.6,-1.8 M2.05,-1.25 L2.05,0.05 B3.15,0.05 -1 L3.15,-1.25 B2.05,-1.25 -1 M2.6,0.6 L2.6,1.5 M-3.6,-5 Q-3.6,-1.6 -5,0.6 M3.6,-5 Q3.6,-1.6 5,0.6', { tags: 'reed bulrush pond swamp marsh' }],
  ['bush', 'Bush', 'M-5,-2.6 L5,-2.6 B4.6,0.6 0.8 B1.8,2.6 0.8 B-1.6,2.8 0.8 B-4.4,0.8 0.8 B-5,-2.6 0.8 Z D-2.2,0 D1,0.6 D2.8,-0.8 D-0.2,-1.2', { tags: 'shrub hedge berries garden green' }],
  ['venus-flytrap', 'Venus flytrap', 'M0,-0.4 C3,-0.2 4.6,2.4 3.2,4.4 L2.5,3.3 L1.7,2.1 L0.9,0.9 L0,-0.4 M2.5,3.3 L1.7,3.6 M1.7,2.1 L0.9,2.4 M0.9,0.9 L0.35,1.2 M0,-5 Q2.6,-4.8 3.4,-3 Q1.4,-3.4 0,-5 | M0,-0.4 L0,-5', { tags: 'plant carnivorous teeth bite monster' }],
  ['winter-tree', 'Winter tree', 'M0,-5 L0,-1.6 L0,0.4 L0,2.6 L0,5 M0,-1.6 L-1.8,0.6 L-3.6,1.4 M-1.8,0.6 L-2.4,3 M0,0.4 L1.9,2 L3.8,2.2 M1.9,2 L2.2,4.2 M0,2.6 L-1.2,4.4 M0,2.6 L1,3.9 M-2.4,-5 L0,-5 L2.4,-5', { tags: 'bare branches dead autumn spooky twigs' }],
  ['leafy-branch', 'Leafy branch', () => joinDrawings(parsePath('M-4.6,-4.6 L-2.8,-2.8 L-1,-1 L0.8,0.8 L2.6,2.6'), stamp(LEAF, [[-2.8, -2.8, 1, 120], [-1, -1, 1, -30], [0.8, 0.8, 1, 120], [0.8, 0.8, 1, -30], [2.6, 2.6, 1, 45]])), { tags: 'twig leaves olive laurel spring' }],
  ['shamrock', 'Shamrock', () => joinDrawings(stamp(HEART, [[0, 0.6, 0.45, 0], [-0.52, -0.3, 0.45, 120], [0.52, -0.3, 0.45, -120]]), parsePath('M0,-0.9 Q0,-3.4 -1.2,-5')), { tags: 'clover three leaf irish luck patrick' }],
];

const LAND = [
  ['volcano-eruption', 'Erupting volcano', 'M-5,-4 L-1.6,2 L1.6,2 L5,-4 Z M-1.6,2 L-0.9,0.4 L0,1.4 L0.9,0.2 L1.6,2 M0,3 L0,4.8 M-1.1,2.9 L-2.2,4.4 M1.1,2.9 L2.2,4.4 D-3,5.2 D3,5.2 D0,5.8', { tags: 'mountain lava eruption fire' }],
  ['iceberg', 'Iceberg', 'M-5,0 L-2.6,0 L2.4,0 L5,0 M-2.6,0 L-1.4,2.2 L-0.4,1.4 L0.6,4.4 L1.6,2 L2.4,0 M-2.6,0 L-3.8,-1.6 L-2.6,-3.6 L-0.6,-5 L1.4,-4.2 L3.4,-2.2 L2.4,0', { tags: 'ice sea arctic cold frozen glacier' }],
  ['cave', 'Cave', 'M5,-3.6 C4.6,1.6 2.4,4 0,4 M1.8,-3.6 L5,-3.6 D0.6,-1.6 | M-1.8,-3.6 L-1.8,-1 B1.8,-1 -1 L1.8,-3.6', { tags: 'rock mine den dark eyes tunnel' }],
  ['crystal-cluster', 'Crystal cluster', 'M-3.5,-4.4 L-3.5,-0.6 L-2.4,1 L-1.3,-0.6 L-1.3,2.4 L0,4.8 L1.3,2.4 L1.3,0.4 L2.3,1.9 L3.3,0.4 L3.3,-4.4 L2.3,-4.4 L1.3,-4.4 L0,-4.4 L-1.3,-4.4 L-2.4,-4.4 Z M-1.3,-0.6 L-1.3,-4.4 M1.3,0.4 L1.3,-4.4 M-1.3,2.4 L0,1.8 L1.3,2.4 M0,1.8 L0,-4.4 M-3.5,-0.6 L-2.4,-1.2 L-1.3,-0.6 M-2.4,-1.2 L-2.4,-4.4 M1.3,0.4 L2.3,-0.2 L3.3,0.4 M2.3,-0.2 L2.3,-4.4', { tags: 'gems quartz ore mine shards amethyst' }],
  ['peak', 'Mountain peak', 'M-5,-4 L-1.744,1.6 L0,4.6 L1.744,1.6 L5,-4 Z M-1.744,1.6 L-0.9,0.6 L-0.2,1.5 L0.6,0.4 L1.744,1.6 M0,4.6 L0,5.2 L0,6.6 L1.6,5.9 L0,5.2', { tags: 'summit flag snow climb top everest' }],
  ['ripples', 'Ripples', () => joinDrawings(parsePath('E0,0 5,2.2 0 360 N E0,0 3.3,1.4 0 360 N E0,0 1.6,0.65 0 360'), stamp(DROP, [[0, 3.2, 0.3]])), { tags: 'water drop pond rings puddle' }],
  ['pearl-shell', 'Pearl in a shell', () => `M-4.6,-0.4${[144, 108, 72, 36, 0].map((a) => ` B${around(0, -0.4, 4.6, a)} -0.6`).join('')} Q0,-5.6 -4.6,-0.4 Q0,-2.4 4.6,-0.4 O0,0.6 1.2 M-3.72,2.3 L-2.232,1.22 M-1.42,3.97 L-0.852,2.222 M1.42,3.97 L0.852,2.222 M3.72,2.3 L2.232,1.22`, { tags: 'clam oyster sea treasure jewel' }],
  ['fireball', 'Fireball', 'M-1.043,-2.289 A1.4,-1.4 2.6 200 430 Q1.6,3.4 -0.4,4.8 Q-0.2,2.6 -1,1.8 Q-2.2,3.4 -4.2,3.8 Q-2.4,1.8 -2.6,0.2 Q-3.6,0.6 -4.9,0 Q-2.6,-0.6 -1.043,-2.289 O1.4,-1.4 1.2', { tags: 'fire flame magic spell meteor burn' }],
  ['splash', 'Splash', 'N E0,-3.6 4.6,1.2 0 360 M0,-2.4 L0,2.2 M1.4215,-2.4587 Q2.2,1.4 4.4,1.8 M-1.4215,-2.4587 Q-2.2,1.4 -4.4,1.8 O0,3.6 0.8 O-4.9,0.5 0.6 O4.9,0.5 0.6 D-2.4,3.6 D2.4,3.6', { tags: 'water fountain drops wet puddle jump' }],
  ['smoke-puffs', 'Smoke puffs', () => `${scallop(1.8, 2.4, 2.2, 7, 0.8)} ${scallop(-1.2, -1.8, 1.3, 5, 0.8)} O-2.8,-4.2 0.7`, { tags: 'puff cloud steam fire dust poof' }],
  ['log-fire', 'Log fire', 'M0,5 C0.6,3 3,2.2 3,-0.4 C3,-2.4 1.6,-3.4 0,-3.4 C-1.6,-3.4 -3,-2.4 -3,-0.4 C-3,0.8 -2.2,1.6 -1.6,2.4 C-1.2,1.4 -0.8,1.2 -0.4,1.6 C-0.6,3 -0.4,4 0,5 M0,-2.6 C1.2,-2.6 1.6,-1.2 0.2,0.4 C-1.4,-1 -1.2,-2.6 0,-2.6 M-4.4,-5 L4.4,-3.2 M-4.4,-3.2 L4.4,-5', { tags: 'fire flame camp logs wood bonfire' }],
];

// The round head most of the animal faces share, and ears that sit on it.
const HEAD = 'O0,4.4 4';
const HORSE_HEAD = 'M-4.6,-3 L-2.1,2.167 L-1.6,3.2 L-0.8,5.4 L0.2,3.6 C2.6,2.8 4.2,0 4.4,-5 L0.6,-5 C0.8,-3.4 0.2,-2.2 -0.8,-1.8 L-3.2,-4.4 C-4.2,-4.6 -4.8,-3.8 -4.6,-3 Z D-1.6,1.4 D-3.9,-3.5';

const turkey = () => {
  const body = (deg) => around(0, -1, 2.4, deg);
  const fan = (deg) => around(0.6, -0.6, 4.4, deg);
  const head = (deg) => around(-3.4, 2.6, 1, deg);
  const bumps = [90, 60, 30, 0, -30].map((a) => ` B${fan(a)} -0.5`).join('');
  const feathers = [[84, 90], [60, 60], [36, 30], [12, 0]].map(([b, f]) => `M${body(b)} L${fan(f)}`).join(' ');
  return `O0,-1 2.4 M${body(120)} L${fan(120)}${bumps} L${body(-18)} ${feathers}`
    + ` O-3.4,2.6 1 M${body(138)} L${head(-36)} M${body(162)} L${head(-84)}`
    + ` M${head(156)} L-5.4,2.5 L${head(204)} D-3.6,2.8`
    + ` M${body(246)} L-0.976,-5 L-1.9,-5 M${body(294)} L0.976,-5 L0.05,-5 M-0.8,-0.4 Q0.6,-2.2 1.6,-0.6`;
};

const horseshoe = () => `M2.2,-3.01 A0,0.8 4.4 -60 240 L-2.6,-4.8 L-1.3,-4.8 L-1.3,-1.452 A0,0.8 2.6 240 -60 L1.3,-4.8 L2.6,-4.8 Z ${[-15, 20, 55, 125, 160, 195].map((a) => `D${around(0, 0.8, 3.5, a)}`).join(' ')}`;

const FARM = [
  ['horse', 'Horse', `${HORSE_HEAD} M0.9,3.9 C3.6,3.2 5.2,0.4 5.4,-4.2`, { tags: 'head pony farm ride stallion knight' }],
  ['goat', 'Goat', 'M0,0.6 C1.4,0.6 1.8,2 1.8,3.4 C1.8,5 2.6,5.6 2.6,7 Q2.6,8.3 1.6,8.8 Q0.8,9.1 0,9.1 M1.6,8.8 C1.6,10.4 2.8,11.6 4.6,11.4 M2.6,7 L5,7.6 L4.4,6.2 Z M0,0.6 L0.5,-0.4 L0,-1.6 D1.4,6.4 M0,2.2 L0.6,2.7 | M0,2.2 L0,1.4', { tags: 'face farm horns beard ram billy' }],
  ['rooster', 'Rooster', 'M-5,3.2 L-4,4 L-3.7,5 L-3.2,4.2 L-2.8,5.2 L-2.3,4.2 L-1.9,5 L-1.6,3.8 C-1.2,2.8 -0.8,1.6 0.6,1.4 C1.6,1.4 2,2.4 2.4,3.4 L3.4,5.4 L3.6,3.2 L5,4.2 L4.4,2.4 L5.4,1.8 C4.8,0.2 4,-1.4 2.4,-2.2 L1.2,-2.6 L-0.6,-2.6 C-1.8,-2.4 -2.8,-1.4 -3,0.2 C-3.1,1.2 -3.4,1.8 -3.8,2.4 L-4,2.8 Z D-3.2,3.3 M-1.4,0.2 Q0.4,-1.6 2.2,0.4 M1.2,-2.6 L1.2,-5 L0.3,-5 M-0.6,-2.6 L-0.6,-5 L-1.5,-5', { tags: 'bird chicken hen farm cockerel morning' }],
  ['llama', 'Llama', 'M0,7.8 Q1.2,7.8 1.8,7.25 Q2.4,6.7 2.4,5.6 L2.4,3.6 Q2.4,2.8 1.8,2.4 Q1.2,2 0,2 M1.8,7.25 Q1.2,9.4 2.4,10.8 Q3.4,9 1.8,7.25 M1.8,2.4 L1.8,-0.6 Q3.8,-0.8 4,-3 D1.3,6.2 M0,4.2 L0.6,4.8 M0,3.6 Q0.6,3.2 1,3.7 | M0,4.2 L0,3.6', { tags: 'alpaca wool farm peru neck' }],
  ['sitting-cat', 'Sitting cat', 'M0,4 L0.9,4 L2.2,5.2 L2.2,2.8 C2.2,1.8 1.6,1.6 1.5,1.2 C3,0 3.2,-3 2.6,-5 L0,-5 | M2.6,-5 C5.2,-5 5.6,-2.2 4.2,-1.2', { tags: 'kitten pet tail back silhouette' }],
  ['fish-bowl', 'Fish bowl', 'M-3,4.2 L-2.524,3.204 A0,-0.4 4.4 125 415 L3,4.2 Z M-3.919,1.6 Q-2,2.2 0,1.6 Q2,1 3.919,1.6 M-1.6,-1.2 Q0,0.4 1.4,-1.2 Q0,-2.8 -1.6,-1.2 M1.4,-1.2 L2.4,-0.4 L2.4,-2 Z D-0.8,-1 D-2.3,0.5', { tags: 'goldfish pet tank aquarium water' }],
  ['horseshoe', 'Horseshoe', horseshoe, { tags: 'luck lucky horse iron magnet' }],
  ['dog-house', 'Dog house', 'M-5,0.2 L-3.8,1.352 L0,5 L3.8,1.352 L5,0.2 M-3.8,1.352 L-3.8,-5 L-1.6,-5 L1.6,-5 L3.8,-5 L3.8,1.352 M-1.6,-5 L-1.6,-1.6 B1.6,-1.6 -1 L1.6,-5 O0,2.2 0.6', { tags: 'kennel pet puppy home' }],
  ['turkey', 'Turkey', turkey, { tags: 'bird farm thanksgiving feathers tail' }],
  ['pet-bowl', 'Pet bowl', 'M-4.4,-3.6 L-3.4,0 L-2.8,0 L2.8,0 L3.4,0 L4.4,-3.6 Z M-2.8,0 Q0,2.8 2.8,0 D-1,0.6 D0.2,0.9 D1.2,0.5 M-1.2,-1.8 L1.2,-1.8 D-1.5,-1.4 D-1.5,-2.2 D1.5,-1.4 D1.5,-2.2', { tags: 'dog cat food dish bone feed' }],
];

const WILD = [
  ['wolf', 'Wolf', 'M0,0 L1.6,0.8 L4.6,3.2 L3.6,3.8 L4.8,5.2 L3.6,5.8 L4,9.8 L1.6,7.4 L0,7 D1.7,5.2 M0,2.2 L0.7,2.2 L0,1.4 |', { tags: 'face howl dog husky werewolf' }],
  ['raccoon', 'Raccoon', `M2,7.864 L3.7,9.8 L3.464,6.4 N E1.9,5 1.5,0.95 0 360 D1.9,5 M0,3.3 L0.5,3.3 L0,2.7 M0,2.1 Q0.7,1.5 1.3,2.1 | ${HEAD} M0,2.7 L0,2.1`, { tags: 'face mask bandit trash panda' }],
  ['hippo', 'Hippo', 'N E1.5,3.1 0.55,0.8 0 360 D1.2,6.2 O2.9,7.3 0.7 | N E0,2.4 4.4,2.6 0 360 M2.586,4.503 C3,8 -3,8 -2.586,4.503 M-2.6,1.5 Q0,0.3 2.6,1.5', { tags: 'face hippopotamus river africa' }],
  ['giraffe', 'Giraffe', 'M0,9.2 Q0.75,9.2 1.125,8.9 Q1.5,8.6 1.5,8 L1.5,6.6 Q2,5.4 2,4.6 Q2,4 1.5,3.7 Q1,3.4 0,3.4 M1.125,8.9 L1.2,10.4 O1.2,10.9 0.5 M1.5,8 L3.6,8.6 L3.2,7.4 Z M1.5,3.7 L1.85,-3.6 D0.8,7.6 D0.7,4.5 | D0.2,2.2 D-0.8,0.8 D0.9,-0.4 D-0.3,-1.8 D0.9,-2.8', { tags: 'long neck spots africa safari tall' }],
  ['rhino', 'Rhino', 'M-5.6,-0.6 L-5.2,0.6 L-5,2.6 L-4,0.8 L-3.7,1.7 L-3.2,0.9 L-2.6,1.4 L-2.2,2.4 L-1.7,1.5 L0,2.2 L3,2 L4.6,1 L4.8,-1 L4.2,-1.2 L4.2,-3.4 L2.8,-3.4 L2.8,-1.4 L-0.6,-1.4 L-0.6,-3.4 L-2,-3.4 L-2,-1.2 L-3.4,-1.6 L-5,-1.6 Z D-3.4,0 M4.6,1 L5.6,0.2', { tags: 'rhinoceros horn africa safari' }],
  ['squirrel', 'Squirrel', 'M-4.6,1.4 Q-4,3.2 -2.9,3.4 L-2.7,4.8 L-2,3.6 Q-1.2,3.2 -1,2 Q0.8,0.6 1.2,-2.6 C2.6,-1.4 2.2,1.6 2.2,3.2 C1.4,3.6 1.6,5.2 3,5.2 C5.6,5.2 6,0.4 5,-2 C4.4,-3.4 3,-4.4 1.8,-4.6 L-0.4,-4.6 L-1.8,-4.6 Q-2.8,-4.4 -2.6,-3 C-2.6,-1.4 -3.4,-0.6 -3.2,0.4 Q-4.4,0.4 -4.6,1.4 Z D-3.4,2.2 M-0.4,-4.6 Q-1.6,-2.6 -0.2,-1.6', { tags: 'tail nut acorn chipmunk tree' }],
  ['kangaroo', 'Kangaroo', 'M-4.6,3 L-3,4.2 L-2.6,5.6 L-2.1,4.2 Q-1.4,3.6 -1.2,2.6 C0.4,2.4 1.8,1 1.8,-0.8 Q3.6,-2 5.4,-4.6 Q3.2,-3.6 1.6,-3.2 L0.8,-4.6 L-2.6,-4.6 L-2.6,-4 L-0.4,-3.8 Q-0.8,-2.4 -1.4,-1.6 Q-2.2,-0.6 -2.4,0.4 L-3.6,-0.2 L-3.4,0.6 L-2.6,1.2 Q-2.8,1.8 -3,2.2 L-4.4,2.2 Z D-3.4,3.2', { tags: 'australia jump hop joey pouch' }],
  ['camel', 'Camel', 'M-5.4,3.2 L-4.2,4.4 L-3.4,4.2 C-3.2,3 -3.2,1.6 -2.4,0.8 C-2,2.6 -1.4,3.6 -0.8,3.6 C-0.2,3.6 0.2,2.6 0.6,1.6 C1,2.6 1.4,3.6 2.2,3.6 C3,3.6 3.6,2 3.8,0.4 L4,-1.2 L4,-5 L3,-5 L3,-1.8 L-1.4,-1.8 L-1.4,-5 L-2.4,-5 L-2.4,-1.2 C-3.4,-0.4 -4,1 -4.2,2.4 L-5.4,2.4 Z D-4.4,3.4', { tags: 'desert humps sand egypt dromedary' }],
  ['crocodile', 'Crocodile', 'M-5.4,1.2 L-2.6,1.4 L-2.2,2.4 L-1.2,2.4 L-0.8,1.6 L0.2,2.2 L1,1.6 L1.8,2.1 L2.6,1.4 L3.4,1.8 L4,1 L5.4,-0.6 L3.2,-1.4 L2.6,-1.4 L2.6,-2.6 L1.6,-2.6 L1.6,-1.6 L-0.6,-1.6 L-0.6,-2.6 L-1.6,-2.6 L-1.6,-1.6 L-5.4,-1.2 L-5.4,0 Z M-5.4,0 L-4.8,0.6 L-4.2,-0.6 L-3.6,0.6 L-3,-0.6 L-2.4,0.6 L-1.8,-0.2 D-1.7,1.9', { tags: 'alligator croc teeth reptile swamp river' }],
  ['gecko', 'Gecko', 'M0.779,1.4 L2,1.8 L2.6,3 L2.4,3.8 M2.6,3 L3.2,3.6 M2.6,3 L3.4,2.9 M0.779,-0.6 L2,-1 L2.6,-2.2 L2.4,-3 M2.6,-2.2 L3.2,-2.8 M2.6,-2.2 L3.4,-2.1 D0.45,4.3 | N E0,0.4 0.9,2 0 360 N E0,4 1,1.1 0 360 M0,-1.6 C0,-3 0.2,-4.2 1.4,-4.8', { tags: 'lizard reptile salamander newt chameleon' }],
  ['moose', 'Moose', 'M0,0.8 C1.6,0.8 2,2.2 1.9,3.4 C1.8,5 2.4,5.6 2.4,6.8 Q2.4,8 1.4,8.5 Q0.8,8.8 0,8.8 M1.4,8.5 L2.6,9.2 L2.4,10.8 L3.3,10 L3.9,11.4 L4.5,10 L5.6,10.6 L5.2,8.8 L2.6,9.2 M2.4,6.8 L4.2,7.6 L3.8,6.4 Z D1.4,6 D0.8,1.8 M0,3 Q1,2.8 1.9,3.4 |', { tags: 'face antlers elk canada forest' }],
];

const BIRDS = [
  ['parrot', 'Parrot', 'M-2.4,4.2 C-1.6,5.2 0,5 0.4,3.6 C1.2,2.4 2,0.8 2.2,-0.6 L3.8,-5 L2.6,-5 L1,-2.6 C-0.6,-2.4 -2.2,-1 -2.6,1 C-2.8,1.8 -2.4,2 -2.4,2.6 L-3.5,1.8 C-4.2,3 -3.6,4 -2.4,4.2 Z M-2.4,4.2 L-2.4,2.6 D-1.4,3.6 M-0.6,2.6 C0.4,1.6 0.8,0 0.6,-1.6 M-4.4,-3.6 L-0.6,-3.6 L0.2,-3.6 L1,-3.6 M-0.6,-2.9 L-0.6,-3.6 M0.2,-3 L0.2,-3.6', { tags: 'bird tropical pirate macaw talk jungle' }],
  ['flamingo', 'Flamingo', 'N E1,0.6 2.4,1.6 0 360 M-1.078,1.4 C-2.8,2.4 -0.6,3.8 -1.8,4.807 O-2.2,5.5 0.8 M-3,5.5 L-4,5 L-3.8,4 L-2.847,5.03 M1,-1 L1,-5 L0,-5 M1.742,-0.922 L2.6,-2.6 L1.6,-3.4 M-0.2,0.8 Q1.2,-0.6 2.6,0.6 D-2.3,5.7', { tags: 'bird pink tropical leg lake' }],
  ['eagle', 'Eagle', 'M0,3.8 Q1,3.8 0.9,2.4 L5.6,3.6 L4.8,1.8 L4.2,2.2 L3.8,0.6 L3.1,1.2 L2.6,-0.4 L1.9,0.5 L1.3,-0.8 L1.2,-3.6 L0,-2.8 D0.4,3.1 M0,2.6 L0.35,2.2 L0,1.6 |', { tags: 'bird wings hawk falcon prey fly emblem' }],
  ['toucan', 'Toucan', 'M-1.4,4.4 C-3.4,5 -5.2,4.2 -5.4,2.6 C-4.2,2.2 -2.8,2.2 -1.6,2.4 M-1.4,4.4 C-0.6,5.4 1.2,5 1.4,3.4 C2.6,1.6 2.8,-1 1.8,-2.6 L2.6,-5 L1.4,-5 L0.8,-3.2 C-0.8,-2.8 -1.8,-1 -1.8,0.6 C-1.8,1.4 -1.6,2 -1.6,2.4 L-1.5,3.4 L-1.4,4.4 D-0.4,3.8 M-1.5,3.4 Q-3.2,3.6 -4.4,3 M-0.2,1.6 C0.8,0.6 1,-0.8 0.6,-2 M-4.2,-3.8 L-0.6,-3.8 L0.2,-3.8 M-0.6,-3.1 L-0.6,-3.8', { tags: 'bird beak tropical jungle bill' }],
  ['dove', 'Dove', 'M-5,1.4 L-3.8,2 C-3.4,3 -2.4,3 -2,2 C-1.4,3.6 -0.2,5 1.4,5.6 C1.2,4 1.6,2.6 2.4,1.4 L5.2,2.2 L4.4,0.4 L5,-1 L2.6,-0.6 C0.6,-2.2 -2.6,-1.6 -3.6,0.4 L-3.8,1.2 Z D-3,2', { tags: 'bird peace pigeon fly white wedding' }],
  ['seagull', 'Seagull', 'M0,1.6 Q0.9,1.6 1,0.8 C2.2,2.6 3.6,3.6 5.6,1.4 C3.8,1.2 2.2,1 1,-0.6 Q1,-2.2 0,-2.8 D0.4,0.9 | M-0.3,0.3 L0,-0.3 L0.3,0.3', { tags: 'bird gull sea beach fly wings soar' }],
  ['nest', 'Nest with eggs', 'M-5,0 L-3.8,0 L-1.6,0 L-1.1,0 L1.1,0 L1.6,0 L3.8,0 L5,0 M-3.8,0 C-3.8,3 -1.6,3 -1.6,0 M-1.1,0 C-1.1,3.6 1.1,3.6 1.1,0 M1.6,0 C1.6,3 3.8,3 3.8,0 M-5,0 C-4.6,-3.6 -2,-4.4 0,-4.4 C2,-4.4 4.6,-3.6 5,0 M-3,-1.2 L-1.6,-2.2 M-0.6,-1.4 L0.8,-2.6 M1.8,-1 L3,-2 M-1.8,-3.2 L-0.6,-3.6 M1.2,-3.4 L2.4,-3', { tags: 'bird eggs twigs spring home' }],
  ['bird-house', 'Bird house', 'M-3.8,2 L0,5.2 L3.8,2 L2.8,2 L-2.8,2 Z M-2.8,2 L-2.8,-1.4 L0,-1.4 L2.8,-1.4 L2.8,2 O0,0.6 0.9 M0,-1.4 L0,-5 M-1.6,-5 L0,-5 L1.6,-5', { tags: 'nest box garden pole home' }],
  ['bird-cage', 'Bird cage', 'M-3,-4 L-3,1 B3,1 -1 L3,-4 L1.5,-4 L0,-4 L-1.5,-4 Z M-1.5,-4 L-1.5,3.598 M0,-4 L0,4 L0,4.6 M1.5,-4 L1.5,3.598 O0,5.2 0.6', { tags: 'pet parrot canary bars prison' }],
];

const SEA = [
  ['dolphin', 'Dolphin', 'M-5.4,-1.4 L-4,-0.4 C-3.6,1 -2,2.4 -0.4,2.8 L1.2,4.6 L1.6,2.6 C2.8,2 3.6,0.8 4,-0.6 L5.6,0.4 L4.8,-1.2 L5.2,-3 L3.6,-1.8 C2.8,-0.4 1,0.6 -1.2,0.6 L-0.8,-1.6 L-2.4,0.2 C-3,0 -3.4,-0.8 -3.6,-1.4 Z D-3.2,0.4', { tags: 'sea ocean jump porpoise fin smart' }],
  ['shark', 'Shark', 'M-5.6,0.4 C-4,1.4 -2.2,1.8 -0.6,1.8 L0.8,4 L1.2,1.6 C2.2,1.4 2.8,1 3.2,0.6 L5.6,3 L5,0.2 L5.6,-1.6 L3.6,-0.6 C2.4,-1 1,-1.2 -0.4,-1.2 L0.4,-3 L-2,-1.4 L-3.6,-1.4 L-4.4,-0.6 Z D-3.8,0.4 M-2.4,0.6 L-2.4,-0.6 M-1.8,0.6 L-1.8,-0.6', { tags: 'sea ocean fish teeth jaws danger fin' }],
  ['seahorse', 'Seahorse', 'M-3.4,3.2 L-1.6,3.9 L-1.2,5 L-0.6,4.2 L0,5 L0.4,3.8 C1.2,3 1.8,1.6 1.6,0 C1.4,-1.6 0.6,-2.6 0,-3.2 C-0.2,-2 -1.2,-1.4 -1.6,-0.2 C-2,1 -1.4,1.8 -1,2.4 L-1.6,2.6 L-3.4,2.6 Z M0,-3.2 C-0.2,-4.6 -1.8,-5 -2.2,-3.8 C-2.4,-3 -1.6,-2.6 -1.2,-3.2 D-0.8,3.4 M-0.6,0.6 L0.8,0.8 M-0.8,-0.6 L0.8,-0.6', { tags: 'sea ocean fish curl tail coral' }],
  ['squid', 'Squid', 'M0,5.2 L0.8,4.2 L1.4,2.6 L1.6,0 L0,0 M0.8,4.2 L2.8,3.6 L1.4,2.6 M1.6,0 L1.2,-1.8 L0.4,-1.8 L0,-1.8 M1.2,-1.8 Q2.4,-3 1.8,-5 M0.4,-1.8 Q1,-3.4 0.5,-4.8 D0.8,-0.9 | M0,-1.8 L0,-4.4', { tags: 'sea ocean tentacles ink kraken calamari' }],
  ['lobster', 'Lobster', 'M0,3.6 L1,3.4 L1.6,2.4 L1.6,1.4 L1.6,0.4 L1.467,-0.6 L1.333,-1.6 L1.2,-2.6 L0,-2.6 M1.2,-2.6 L2.2,-4.4 L0.8,-4 L0,-4.6 M0,-0.6 L1.467,-0.6 M0,-1.6 L1.333,-1.6 M0,0.4 L1.6,0.4 M1.6,2.4 L3,3.2 L3.4,4.4 L2.6,5.4 L3.2,6.8 L3.6,5.6 L4.2,6.8 L4.8,5.2 L3.4,4.4 M1.6,1.4 L3.2,1.2 M1.6,0.4 L3.2,-0.2 M1.467,-0.6 L3,-1.4 M1,3.4 Q1.4,5.6 0.6,7 D0.5,2.8 |', { tags: 'sea claws crayfish shellfish crab red' }],
  ['seal', 'Seal', 'M-3.6,3.2 C-3.2,4.2 -2,4.4 -1.4,3.6 C-0.4,1.4 1.2,-1.6 3.4,-3 L5.4,-2.2 L4.6,-3.6 L5.4,-5 L3,-4.6 L-0.4,-4.6 L-2.4,-5 L-1.6,-3.6 C-2.2,-1.8 -2.6,0.2 -2.6,1.8 L-3.6,2.4 Z D-2.6,3.2 O-4.4,4.9 1.2', { tags: 'sea lion ball circus walrus ice' }],
  ['pufferfish', 'Pufferfish', () => `O-0.4,0 3 ${rays(-0.4, 0, 3, 4, [36, 72, 108, 144, 216, 252, 288, 324])} M2.534,0.624 L4.6,1.6 L4.6,-1.6 L2.534,-0.624 O-1.6,1 0.6 D-2.7,-0.5 M-0.2,-0.6 Q0.8,-1.4 1.2,-0.2`, { tags: 'sea fish blowfish spikes balloon fugu' }],
  ['manta-ray', 'Manta ray', 'M0,3 L0.6,3.2 L1,4.6 L1.8,3 C3.4,2.6 5,1 5.6,-0.8 C3.6,-0.8 1.6,-1.6 0.6,-2.6 L0,-2.6 D1.5,2.2 M0.5,1 L1.3,0.8 M0.5,0.2 L1.3,0 M0.5,-0.6 L1.3,-0.8 | M0,-2.6 L0,-5.6', { tags: 'sea stingray fish ocean glide wings' }],
  ['narwhal', 'Narwhal', 'M-3.6,0.6 C-3,2.6 -0.6,3 1.6,2 L3.6,0.6 L5.2,2 L4.8,0 L5.4,-1.6 L3.4,-0.6 C1,-2.4 -2.6,-2.6 -3.6,-0.8 L-3.6,0 Z M-3.6,0 L-6,1.4 D-2.6,0.6 M-1.8,-0.8 Q-0.8,-1.8 0,-0.8 D0.4,1.4 D1.4,0.6 D-0.4,0.6', { tags: 'sea whale horn tusk arctic unicorn' }],
  ['anglerfish', 'Anglerfish', 'M-3.4,1.4 C-3,2.6 -2.2,3.2 -1.2,3.4 C0.4,3.8 1.6,3.2 2.4,2.4 L3.2,1.2 L5,2.4 L5,-2.4 L3.2,-1.2 C1.6,-3.6 -2,-3.6 -3.4,-1.6 L-2.9,-0.7 L-2.5,-1.3 L-2,-0.4 L-1.6,-0.9 L-0.8,0 L-1.6,0.7 L-2,0.3 L-2.5,1.1 L-2.9,0.5 Z M-1.2,3.4 C-1.6,5.4 -3.6,5.6 -4.675,4.131 N O-5,3.4 0.8 D-1.8,2.1 M0.6,-0.4 Q1.8,-1.4 2,0', { tags: 'sea deep fish lure light teeth monster' }],
];

const BUGS = [
  ['beetle', 'Beetle', 'M0,2.4 L1.6,2.4 C2,2.2 2.3,1.75 2.5,1.125 C2.7,0.5 2.8,-0.3 2.8,-1.2 C2.8,-2.3 2.45,-3.15 1.925,-3.725 C1.4,-4.3 0.7,-4.6 0,-4.6 M1.6,2.4 C1.8,3.4 1,4 0,4 M0.45,5.279 L1.2,6.2 L2,6 M2.5,1.125 L4.2,1.8 L4.8,3 M2.8,-1.2 L4.6,-1.4 L5.2,-2.6 M1.925,-3.725 L3.4,-4.6 L3.6,-5.8 | M0,2.4 L0,-4.6 M-0.9,4.5 B0.9,4.5 -1 Z', { tags: 'insect bug scarab stag shell' }],
  ['fly', 'Fly', 'M0.45,1.852 C2.6,2 4.8,-0.8 4.4,-3.4 C3.4,-2.6 2.2,-0.6 0.88,0.141 M0.88,-0.941 L2.2,-1.6 L2.6,-2.8 M0.728,-1.928 L1.8,-3 L1.8,-4.2 D0.4,3.6 | N E0,-0.4 0.9,2.6 0 360 O0,3.5 0.9', { tags: 'insect bug housefly buzz wings pest' }],
  ['mosquito', 'Mosquito', 'O0,0.6 0.9 O-1.9,1.2 0.5 M-2.305,0.906 L-4.6,-1.4 M-2.194,1.605 L-3.2,2.6 M0.9,0.6 L4.8,-0.4 M0.45,1.379 C1.6,3.6 3.8,4 4.6,3 C3.4,2.4 1.6,2 0.45,1.379 M-0.45,-0.179 L-2,-1.6 L-2.8,-4.4 M0,-0.3 L0.2,-2.2 L-0.2,-4.6 M0.45,-0.179 L2.2,-1.2 L3.4,-4.4', { tags: 'insect bug bite gnat buzz pest' }],
  ['scorpion', 'Scorpion', 'N E-0.6,-2 2.6,1.1 0 360 M2,-2 C4.4,-2 5.4,0.6 4.4,2.4 C3.6,4 1.6,4 0.8,2.8 L0.4,1.6 M-2.975,-1.553 L-4,-0.4 L-5.2,-0.2 M-4,-0.4 L-4.6,0.8 M-2.975,-2.447 L-4.2,-2.6 L-5.4,-2.2 M-4.2,-2.6 L-5.2,-3.4 M-1.9,-2.953 L-2.6,-4.8 M-1.141,-3.076 L-1.4,-4.8 M-0.059,-3.076 L0.2,-4.8 M0.7,-2.953 L1.4,-4.8 D-2.2,-1.8', { tags: 'sting tail desert poison claws bug' }],
  ['moth', 'Moth', 'M0.35,1.852 L4.8,3.4 C5.2,2 5,0.4 4.2,-0.6 L3,-0.438 L0.696,-0.128 M3,-0.438 C3.8,-2 3,-3.6 1.6,-3.8 L0.52,-2.14 M0,2.2 L0.7,3.3 L1.2,4.3 L1.6,5.2 M0.7,3.3 L1.5,3.1 M1.2,4.3 L2,4.1 O3.4,1.4 0.6 | N E0,-0.4 0.7,2.6 0 360', { tags: 'insect bug night wings butterfly lamp' }],
  ['firefly', 'Firefly', () => `M1.039,1.7 C2.8,1.6 3.6,0 3.2,-1.6 C2.2,-1 1.8,0.2 1.193,0.672 M0,4.8 L0.8,5.8 | N E0,0.4 1.2,2.6 0 360 O0,4.1 0.7 M-0.971,-1.128 L0.971,-1.128 ${rays(0, -1.4, 1.7, 2.7, [210, 240, 270, 300, 330])}`, { tags: 'insect bug glow light night lightning bug' }],
];

const ammonite = () => {
  const at = (deg) => around(0, 0, 0.7 + (1.7 * deg) / 360, deg);
  const ribs = Array.from({ length: 12 }, (_, i) => `M${at(570 + 30 * i)} L${at(210 + 30 * i)}`);
  return `M${Array.from({ length: 61 }, (_, i) => at(i * 15)).join(' L')} ${ribs.join(' ')}`;
};

const DINOS = [
  ['t-rex', 'T-rex', 'M-5.4,3 L-5.2,4 L-3,4.6 L-2,3.6 L0.6,2.4 L5.6,0.8 L1.8,-0.4 L1.8,-2.4 L0.8,-3.6 L1,-5 L-1.6,-5 L-0.4,-4 L-0.6,-2.4 L-1.4,-1.6 L-2.2,-0.4 L-3.2,-0.4 L-3.4,0.2 L-2.4,0.4 L-2.8,1.2 L-4.8,1.2 L-5,1.8 L-3.4,2.6 Z D-3.6,3.8', { tags: 'dinosaur dino tyrannosaurus rex jurassic' }],
  ['triceratops', 'Triceratops', 'M-5.6,0.4 L-4.6,1 L-4.4,2 L-4,1.2 L-3.4,1.6 L-4.2,3.8 L-2.4,2.4 L-2.2,4.4 L-0.6,4 L-1,2.2 L1.6,2.6 L4,1.6 L5.6,-0.6 L3.6,-0.2 L3.6,-3 L2.4,-3 L2.4,-1 L-0.6,-1 L-0.6,-3 L-1.8,-3 L-1.8,-0.6 L-4.6,-0.6 Z D-3.6,0.5', { tags: 'dinosaur dino horns frill jurassic' }],
  ['pterodactyl', 'Pterodactyl', 'M0,5.6 L0.7,3.4 L0.7,2.4 L3,3.8 L5.6,2 Q3.6,1.8 3,-0.2 Q1.8,0.4 0.8,-1.4 L0,-3.2 M0.8,-1.4 L1.5,-3.6 M3,3.8 L3,-0.2 |', { tags: 'dinosaur dino fly wings pterosaur jurassic' }],
  ['dragon-head', 'Dragon head', 'M-5.4,0.6 L-4.8,1.6 L-2.2,2 L-1.6,3.4 L3.6,5.6 L1.8,2.6 L3.8,2.4 L1.6,1 C2.2,-0.4 2.8,-2.6 3,-5 L-0.4,-5 C-0.2,-4 -0.6,-3.2 -1.4,-2.8 L-4,-3.2 L-4.4,-2.2 L-2.2,-0.4 L-3,-0.15 L-3.4,-0.8 L-3.8,0.1 L-4.2,-0.55 L-4.6,0.35 Z D-2.8,1.2 D-4.7,1', { tags: 'monster fire horns teeth wyvern fantasy' }],
  ['unicorn', 'Unicorn', `${HORSE_HEAD} M-2.1,2.167 L-4.8,6 M1,4 Q3.4,4 3.8,2 Q5.2,1.6 5,-0.4 Q6,-1.6 5.4,-3.6`, { tags: 'horse horn magic fantasy fairy rainbow' }],
  ['phoenix', 'Phoenix', 'M0,4.6 Q0.9,4.6 0.9,3.6 L1,2.6 C2.4,3 3.6,4.4 5.4,5.2 L4.6,3.6 L5.2,2.8 L3.8,2 L4.2,1 L2.4,0.6 L1.2,-0.2 C1.6,-2 3,-3 3.6,-5.2 C2.2,-4.4 1.2,-3.4 0.8,-2 L0,-2.6 M0,4.6 L0.9,5.6 D0.35,3.9 M0,3.4 L0.3,3 L0,2.4 | M0,4.6 L0,5.8 M0,-2.6 L0,-5.6', { tags: 'bird fire wings fantasy rebirth flame' }],
  ['ammonite', 'Ammonite', ammonite, { tags: 'fossil shell spiral nautilus stone ancient' }],
  ['dragon-egg', 'Dragon egg', `${EGG} M-2,2.4 Q-1,1 0,2.4 Q1,1 2,2.4 M-3,0.8 Q-2,-0.6 -1,0.8 Q0,-0.6 1,0.8 Q2,-0.6 3,0.8 M-2,-0.8 Q-1,-2.2 0,-0.8 Q1,-2.2 2,-0.8 M-3,-2.4 Q-2,-3.8 -1,-2.4 Q0,-3.8 1,-2.4 Q2,-3.8 3,-2.4`, { tags: 'scales fantasy hatch dinosaur monster' }],
];

const pictures = (cat, sub, list) => list.map(([id, name, draw, extra = {}]) => drawnShape({ id, name, cat, sub, draw, ...extra }));

export const WILD_SHAPES = [
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
