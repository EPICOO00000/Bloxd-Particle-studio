// More pictures, added when the library grew to 3,624 shapes: nature and animals.

import { around } from './shape-kit.js';
import { star, pictures } from './shapes-emblems.js';

// ---------------------------------------------------------------- nature

const SKY = [
  ['half-moon', 'Half moon', 'N A0,0 5 90 270 Z', 'night phase quarter sky lunar'],
  ['moon-phases', 'Moon phases', 'N A-3.5,0 1.5 60 300 A-2.54,0 1.316 260.8 99.2 Z N A0,0 1.5 90 270 Z O3.5,0 1.5', 'lunar cycle night calendar month'],
  ['hurricane', 'Hurricane', 'O0,0 1.3 N A-1,0 3.6 -10 150 N A1,0 3.6 170 330', 'cyclone typhoon storm swirl weather'],
  ['blowing-cloud', 'Blowing cloud', 'M-4.6,-1.6 C-5.6,-1.6 -5.6,0.6 -4.2,0.6 C-4.2,2.8 -1.4,3.2 -0.8,1.6 C0.6,2.4 2,1 1.2,-0.2 C2,-0.8 1.6,-1.6 0.8,-1.6 Z M2.8,1 L5.2,1 M3,-0.4 L5.6,-0.4 M2.6,-1.8 L4.8,-1.8', 'wind gust breeze blow weather'],
  ['northern-lights', 'Northern lights', 'M-5,2 Q-2.5,4.4 0,2 Q2.5,-0.4 5,2 M-4,2 L-4,-1 M-2,2.2 L-2,-2.6 M0,1.2 L0,-3.4 M2,0.2 L2,-3.6 M4,0.2 L4,-2.4', 'aurora polar sky glow arctic'],
  ['weather-vane', 'Weather vane', 'M0,-5 L0,-1.6 L0,1.6 L0,2.3 M-2.6,-1.6 L0,-1.6 L2.6,-1.6 M-4.4,1.6 L0,1.6 L4.4,1.6 M2.8,3 L4.4,1.6 L2.8,0.2 M-4.4,3 L-4.4,1.6 L-4.4,0.2 O0,3.9 0.9', 'wind direction roof arrow rooster'],
  ['wind-sock', 'Wind sock', 'M-4,-5 L-4,2.4 L-4,4.6 L-1.2,4.209 L1.8,3.791 L4.6,3.4 L4.6,1.6 L1.8,1.86 L-1.2,2.14 L-4,2.4 M-1.2,4.209 L-1.2,2.14 M1.8,3.791 L1.8,1.86', 'airport airfield breeze direction flag'],
  ['puddle', 'Puddle', 'D-2,4.6 D0.4,3.4 D2.4,4.8 N E0,-2.6 4.6,1.6 0 360 N E0,-2.6 2.2,0.7 0 360', 'rain splash water wet ground'],
];

const PLANTS = [
  ['lotus-flower', 'Lotus flower', 'M0,-2 C1.8,0 1.8,3 0,4.8 M0,-2 C2,-1.6 4.4,0.6 4.8,3 C3.6,2.6 2.8,2 2.4,1.4 | M-5,-3.6 L5,-3.6', 'water lily pond zen yoga bloom'],
  ['ivy-vine', 'Ivy vine', 'M-5,-3.6 Q-2.6,-4.4 -1.6,-1.6 Q-0.6,1.2 1.6,1.2 Q3.8,1.2 4.6,4.4 M-1.6,-1.6 Q-3.8,-0.8 -4,1.4 Q-1.8,0.6 -1.6,-1.6 M1.6,1.2 Q3.8,0.4 4,-1.8 Q1.8,-1 1.6,1.2', 'ivy creeper climbing jungle tendril'],
  ['bonsai', 'Bonsai', 'M-3,-3.4 L0,-3.4 L3,-3.4 L2.4,-5 L-2.4,-5 Z M0,-3.4 L-0.6,-1.6 L0.8,0 L0.4,1.6 M-3.6,1.6 C-4.8,3 -3,4.6 -1.6,4 C-0.8,5.4 1.8,5.4 2.4,4 C4,4.6 5.4,3 4.2,1.6 L0.4,1.6 Z', 'japan miniature tree zen pot'],
  ['willow-tree', 'Willow tree', 'M-4.4,0 L-3,2.6 L-1.4,3.8 L0,3.8 L1.4,3.8 L3,2.6 L4.4,0 M-4.4,0 L-4.4,-3.4 M-3,2.6 L-3,-2.4 M-1.4,3.8 L-1.4,-1.2 M1.4,3.8 L1.4,-1.2 M3,2.6 L3,-2.4 M4.4,0 L4.4,-3.4 M0,3.8 L0,-5', 'weeping tree river droop branches'],
  ['succulent', 'Succulent', 'M-2.6,-2 L2.6,-2 L2,-5 L-2,-5 Z M-2.6,-2 L-4.6,1 L-1.8,-0.4 L-3,3.6 L-0.6,0.6 L0,5 L0.6,0.6 L3,3.6 L1.8,-0.4 L4.6,1 L2.6,-2', 'aloe agave desert houseplant spiky'],
  ['bouquet', 'Bouquet', 'M-2.6,0 L0,-5 L2.6,0 O-2.4,2.2 1.1 O2.4,2.2 1.1 O0,4 1.1', 'flowers bunch gift wedding posy'],
  ['wilted-flower', 'Wilted flower', 'M-1,-5 L-1,-2.6 L-1,0 Q-1,3.6 1.6,3.6 Q3.6,3.6 3.6,2 O3.6,0 1.2 M-1,-2.6 Q-3.6,-2.4 -4,0 Q-1.6,-0.6 -1,-2.6 D1.4,-3', 'dead droop sad dry thirsty'],
  ['mistletoe', 'Mistletoe', 'M0,2 L2,0 Q5,-0.6 4.4,-4.4 Q1.6,-3 2,0 D0.9,-1.6 | M0,5 L0,2 O0,-0.4 0.8', 'christmas kiss berries sprig winter'],
  ['olive-branch', 'Olive branch', 'M-5,-3.4 L-2.5,-1.8 L0,0 L2.5,1.6 L5,3 M-2.5,-1.8 Q-4,-0.4 -3.2,1.6 Q-1.8,0.2 -2.5,-1.8 M0,0 Q-1.5,1.4 -0.7,3.4 Q0.7,2 0,0 M0,0 Q1.8,-0.8 2.2,-2.8 Q0.4,-2 0,0 M2.5,1.6 Q1,3 1.8,5 Q3.2,3.6 2.5,1.6 M2.5,1.6 Q4.3,0.8 4.7,-1.2 Q2.9,-0.4 2.5,1.6 M-2.5,-1.8 Q-0.7,-2.6 -0.3,-4.6 Q-2.1,-3.8 -2.5,-1.8', 'peace dove leaves twig greek'],
  ['ginkgo-leaf', 'Ginkgo leaf', 'M0,-5 L0,-1.6 L-4.6,1.6 C-3.4,4.6 -1,5 0,3.4 C1,5 3.4,4.6 4.6,1.6 L0,-1.6', 'fan leaf autumn japan yellow tree'],
  ['tropical-leaf', 'Tropical leaf', 'M0,-4.6 C4.4,-3.6 5.4,1 3.6,3.6 C2.4,5.2 0.8,4.6 0,3.4 M0,-2.4 L2.4,-1.4 M0,0 L3,1.2 M0,2 L1.8,3.2 | M0,-4.6 L0,-2.4 L0,0 L0,2 L0,3.4', 'monstera jungle houseplant palm big'],
  ['thistle', 'Thistle', `${star(0, 2.6, 2.2, 1.5, 10)} M0,-2.4 L1.6,-1.4 L2,-2.6 L3.2,-1.6 L4.4,-3 M0,-2.4 L-1.6,-1.4 L-2,-2.6 L-3.2,-1.6 L-4.4,-3 M0,0.4 L0,-2.4 L0,-5`, 'scotland spiky purple weed flower'],
];

const LAND = [
  ['dunes', 'Dunes', 'M-5,-2 Q-2.6,2.4 0,-0.6 Q2.4,2.6 5,0 M-5,-4.4 Q-1,-1.6 1.6,-3.4 Q3.6,-2.2 5,-3.4 O3,3.6 1.2', 'desert sand sahara hills camel'],
  ['cliff-waterfall', 'Cliff waterfall', 'M-5,4 L-2,4 L-2,-2.6 M5,4 L2,4 L2,-2.6 M-0.7,3.4 L-0.7,-2.6 M0.7,3.4 L0.7,-2.6 M-4,-4.6 Q-3,-3 -2,-4.6 Q-1,-3 0,-4.6 Q1,-3 2,-4.6 Q3,-3 4,-4.6', 'falls river cascade cliff water'],
  ['river', 'River', 'M-3,-5 Q0,-2 -2,0.6 Q-3.4,2.6 -0.6,5 M2.6,-5 Q4.6,-2 1.4,0.6 Q0.4,2.6 1,5', 'stream winding valley water flow'],
  ['geyser', 'Geyser', 'M-5,-4 L-0.8,-4 L-0.8,2 Q-1.2,4.6 -3.6,3 M5,-4 L0.8,-4 L0.8,2 Q1.2,4.6 3.6,3 M0,3 L0,5 D-4.2,1 D4.2,1 D-2.6,0.2 D2.6,0.2', 'hot spring eruption steam fountain'],
  ['hot-spring', 'Hot spring', 'N E0,-3 4.6,1.6 0 360 M-2,-0.4 Q-3,1 -2,2.4 Q-1,3.6 -2,5 M0,-0.4 Q-1,1 0,2.4 Q1,3.6 0,5 M2,-0.4 Q1,1 2,2.4 Q3,3.6 2,5', 'onsen bath spa steam pool'],
  ['stalactites', 'Stalactites', 'M-5,5 L-4,5 L-3,1 L-2,5 L-0.6,5 L0.4,-0.4 L1.4,5 L2.6,5 L3.6,2.4 L4.6,5 M-5,-5 L-3.4,-5 L-2.4,-2 L-1.4,-5 L1.6,-5 L2.8,-1.4 L4,-5 L5,-5', 'cave drip rock spikes underground'],
  ['rock-pile', 'Rock pile', 'M-4.6,-5 L-3.6,-1.6 L-1,-0.6 L1.4,-2 L1.8,-5 Z M2.6,-5 L3,-2.6 L4.6,-2.2 L5,-5 Z M-1.6,0.2 L-0.6,2.6 L1.6,3 L2.6,0.8 L1.4,-0.8 Z', 'stones boulders cairn rubble'],
  ['stepping-stones', 'Stepping stones', 'N E-3.4,-2.6 1.4,0.8 0 360 N E-1,-0.6 1.3,0.7 0 360 N E1.4,1.2 1.2,0.6 0 360 N E3.6,2.8 1,0.5 0 360 M-5,2 Q-4,2.8 -3,2 M2.4,-3 Q3.4,-2.2 4.4,-3', 'path pond garden zen rocks'],
  ['ore-rock', 'Ore rock', 'M-4.6,-3.6 L-3.4,1.6 L-0.6,4 L3,3 L4.8,-0.4 L3.6,-4 Z M-1.4,1.4 L-0.4,0.2 L-1.4,-1 L-2.4,0.2 Z M1.8,0.6 L2.6,-0.4 L1.8,-1.4 L1,-0.4 Z D0.2,-2.6', 'mine mineral gold diamond stone'],
  ['seaweed', 'Seaweed', 'M-3,-5 Q-4.6,-2.5 -3,0 Q-1.4,2.5 -3,4.6 M0,-5 Q1.6,-2 0,0.6 Q-1.6,3 0,5 M3,-5 Q1.6,-3 3,-1 Q4.4,1 3,3', 'kelp algae ocean underwater plant'],
];

// ---------------------------------------------------------------- animals

const FARM = [
  ['hamster', 'Hamster', 'M0,3.6 C2,3.6 4.6,2.4 4.6,-0.6 C4.6,-3.4 2.4,-4.6 0,-4.6 O3.8,4.6 1 D1.7,0.8 M0,-1.6 Q1.2,-3 2.2,-1.8 | D0,-0.6', 'pet rodent gerbil cheeks cute'],
  ['donkey', 'Donkey', 'M0,2.6 C1.6,2.6 2.6,1.6 2.6,0 L2,-3.6 C2,-4.6 1,-5 0,-5 M1.2,3.4 L1.6,6 L2.6,6 L2.8,2.6 D1.4,0.6 D0.8,-3.8 M0,-2.4 L1.2,-2.4 |', 'mule ass farm stubborn long ears'],
  ['bull', 'Bull', 'M0,2.4 L2.4,2.4 C4,2.4 4,0.4 3,-0.6 L2.2,-3.4 C2,-4.6 1,-5 0,-5 M2.6,3.3 Q5.4,3 5,6 D1.6,0.8 D0.9,-3.4 | O0,-6.7 0.9', 'ox cattle farm rodeo horns taurus'],
  ['goose', 'Goose', 'M-4.8,0.6 C-3.6,-3.6 2.6,-3.6 2.6,-0.4 L2.6,3 L4.6,3.6 L2.6,4.4 C2.4,5.2 1,5.2 1,4.2 L1,1 C0,0.6 -2.6,1.2 -4.8,0.6 D1.8,4 M-1.4,-3.8 L-1.4,-5 L-0.2,-5 M0.4,-3.8 L0.4,-5 L1.6,-5', 'bird farm honk gander white'],
  ['hen', 'Hen', 'N E-0.6,-1 3.6,2.8 0 360 O3,2.6 1.3 M5.1,3 L6,2.6 L5.1,2.2 M2.4,4.6 L2.8,5.4 L3.2,4.7 L3.6,5.4 L4,4.6 M-4.6,0.6 L-5.6,3 L-4.4,2.2 L-4.6,4 L-3.4,2.6 M-1.4,-4.6 L-1.4,-6 M0.4,-4.6 L0.4,-6 D3.2,2.9', 'chicken farm eggs cluck poultry'],
  ['ball-of-wool', 'Ball of wool', 'O0,0.4 4 M-2.6,1.8 Q0,3 2.6,1.8 M-3,0 Q0,1.2 3,0 M-2.2,-1.8 Q0,-0.6 2.2,-1.8 M3.2,-3.4 Q4.4,-5.4 5.6,-3.8', 'yarn knitting cat toy thread'],
  ['scratching-post', 'Scratching post', 'M-3.6,-5 L3.6,-5 L3.6,-3.8 L1,-3.8 L-1,-3.8 L-3.6,-3.8 Z M-1,-3.8 L-1,2.6 M1,-3.8 L1,2.6 M-3,2.6 L-1,2.6 L1,2.6 L3,2.6 L3,3.8 L-3,3.8 Z D0,-2 D0,-0.4 D0,1.2 M3,2.6 L4.4,1.6 O4.4,0 0.8', 'cat tree climb pet toy'],
  ['cow-bell', 'Cow bell', 'M-2,3 L-1,3 L1,3 L2,3 L3.6,-3.6 L-3.6,-3.6 Z M-1,3 L-1,4.8 L1,4.8 L1,3 O0,-5.3 0.9', 'swiss alps farm ring cattle'],
  ['pet-carrier', 'Pet carrier', 'M-4.6,2.6 L-1.6,2.6 L1.6,2.6 L4.6,2.6 L4.6,-4 L-4.6,-4 Z M-1.6,2.6 L-1.6,4.4 L1.6,4.4 L1.6,2.6 M-3,1 L-3,-2.4 M-1.6,1 L-1.6,-2.4 M-0.2,1 L-0.2,-2.4', 'cage crate travel vet kennel'],
  ['milk-churn', 'Milk churn', 'M-2.4,-5 L2.4,-5 L2.4,1 L1.2,2.6 L1.2,4 L-1.2,4 L-1.2,2.6 L-2.4,1 Z M-2,4.9 L2,4.9', 'farm dairy can cream'],
  ['hoof-print', 'Hoof print', 'M-0.7,-4.4 C-3.6,-3 -3.4,2 -1,4.6 C-0.6,2 -0.5,-2 -0.7,-4.4 |', 'deer track cow pig cloven footprint'],
];

const WILD = [
  ['gorilla', 'Gorilla', 'M0,4.6 C3,4.6 4.4,2.6 4.2,0.4 C5.4,0.6 5.6,-1.4 4.2,-1.4 C4,-3.6 2.4,-5 0,-5 M0,1.6 Q1.6,2.6 3.2,1.4 D1.5,0.6 D0.7,-1.6 M0,-3.4 L1.6,-3.2 |', 'ape kong monkey jungle strong'],
  ['beaver', 'Beaver', 'M0,4 C2.6,4 4.4,2.4 4.4,-0.2 C4.4,-3 2.4,-4.6 0,-4.6 O3.9,4.5 0.9 D1.6,1.2 M0,0 L1,0 L0,-0.8 M0,-1.8 L0.9,-1.8 L0.9,-3.4 L0,-3.4 | M0,-1.8 L0,-3.4', 'dam river teeth rodent builder'],
  ['bison', 'Bison', 'M-5,-1 C-5,2 -3,2.6 -1,2.4 C0.6,5 3.6,4.6 4.2,1.6 C5.4,0.6 5.2,-1.6 4,-2 L3.6,-3.6 L2.6,-2 L1.6,-2 L1.6,-5 L0.4,-5 L0.4,-1.6 L-3,-1.6 L-3,-5 L-4.2,-5 L-4.2,-1.6 Z D3.6,-0.4', 'buffalo plains herd wild west'],
  ['wild-boar', 'Wild boar', 'M0,4 C2.4,4 4.4,2.4 4.2,0 L2.6,-3.4 C2.4,-4.4 1.2,-4.8 0,-4.8 M3.2,4.2 L4.6,5.8 L4.8,3.4 M3.4,-3.2 Q5,-2.8 4.8,-1 D1.6,1 D0.6,-2.8 | N E0,-2.8 1.6,1 0 360', 'hog pig tusks forest warthog'],
  ['chameleon', 'Chameleon', 'M-3,1 C-2,1 -2.2,2.6 -3.4,2.6 C-5.2,2.6 -5,-1 -2.6,-1 L0,-1 L2.6,-1 C3.4,-0.8 3.8,-0.4 4,0 L5.2,0.6 L4.2,1.4 C3.6,3.2 1,3.8 -1,2.8 C-1.6,2.4 -1.8,1.6 -2,0.4 D3,1.1 M0,-1 L-0.4,-3 M2.6,-1 L2.2,-3 M-5,-3 L-0.4,-3 L2.2,-3 L5,-3', 'lizard reptile colour tongue curl'],
  ['armadillo', 'Armadillo', 'M-3.4,-2 C-3.4,3.4 3,3.4 3,-2 L1.2,-2 L-0.2,-2 L-1.6,-2 Z M-1.6,-2 L-1.6,0.8 M-0.2,-2 L-0.2,1.2 M1.2,-2 L1.2,0.8 M3.8,-0.6 L5.6,-2.4 L3.8,-2.6 M-4.2,-2 L-5.8,-3.2 M-2.2,-2.8 L-2.2,-4 M1.8,-2.8 L1.8,-4', 'armour shell roll desert texas'],
  ['anteater', 'Anteater', 'M-5,0 C-4,3 0,3.4 1.6,1.6 L5.4,-1.6 L5.2,-2.4 L1.4,-1.2 L1.2,-4.6 L0,-4.6 L0,-1.4 L-2.4,-1.4 L-2.6,-4.6 L-3.8,-4.6 L-3.6,-1 C-4.4,-0.6 -5,-0.4 -5,0 D1.6,0.4', 'ants tongue snout jungle'],
  ['axolotl', 'Axolotl', 'M0,3 C2.6,3 4,1.6 4,0 C4,-1.6 2.6,-3 0,-3 M4.6,1.8 L6.4,3.4 M4.9,0 L7,0 M4.6,-1.8 L6.4,-3.4 D1.8,0.6 M0,-1.2 Q1.2,-1.2 2,-0.4 |', 'salamander gills pink mexico cute'],
  ['tadpole', 'Tadpole', 'O-2.4,0 2 M0.4,0 Q1.6,1.6 2.8,0 Q4,-1.6 5.4,0 D-3,0.6', 'frog baby pond swim'],
  ['gazelle', 'Gazelle', 'M0,1.6 C1.2,1.6 2,0.8 2,-0.4 L1.2,-4 C1,-4.8 0.4,-5 0,-5 M1,2.4 L2.2,6 M2.8,1.6 L4.6,2.6 L3,0.4 D1.2,-0.2 D0.5,-4.1 |', 'antelope horns africa fast savanna'],
  ['cattle-skull', 'Cattle skull', 'M0,1.6 L1.6,1.6 L2.2,0 L1,-4.6 L0,-4.6 M1.6,1.6 C3.6,1.4 5,2.6 5.6,4.6 D1,-0.2 | M0,-2.6 L0,-3.8', 'longhorn desert bones wild west bull'],
];

const BIRDS = [
  ['hummingbird', 'Hummingbird', 'M1.8,2 L5.6,2.8 M1.8,2 C1.4,3.4 -0.6,3.4 -1,2 C-1.6,0 -2.6,-1.6 -4.6,-4.6 L-3,-3.6 L-2.6,-5 C-0.6,-3 1.4,-1 1.8,2 M-1.8,2.6 L-5,5.6 L-2.2,5.4 L-0.8,3.6 Z D0.6,2.2', 'nectar tiny hover wings flower'],
  ['pelican', 'Pelican', 'O-2.8,3.2 1.5 D-3,3.6 M-0.4,3.5 L5.4,2.6 L-0.4,2.4 M5.4,2.6 C4,-1.2 0.8,-1.4 -0.4,1.2 M-3.2,0.9 C-4.6,-1 -2,-2.6 -3,-5', 'beak pouch fish sea bird'],
  ['ostrich', 'Ostrich', 'N E-0.6,0 2.8,2 0 360 M2.6,1.6 C4,2.6 3,3.6 3.5,4.6 O4,6.2 0.8 M-1.2,-2.8 L-1.6,-5.6 L-0.4,-5.6 M0.4,-2.8 L0.8,-5.6 L2,-5.6 M-4.2,0.6 L-5.6,1.8 L-4.6,-0.4', 'bird africa run long neck emu'],
  ['kiwi-bird', 'Kiwi bird', 'O-0.6,0.6 3.4 M3.6,0 L6.6,-2.6 D1.4,1.6 M-1.4,-3.6 L-1.4,-5 L-0.2,-5 M0.6,-3.6 L0.6,-5 L1.8,-5', 'new zealand flightless round beak'],
  ['wing', 'Wing', 'M-5,2 C-2,5.4 3,5 5,1.6 C4,1.6 3.4,1 3.2,0.2 C2.2,0.4 1.6,-0.4 1.4,-1.2 C0.4,-1 -0.2,-1.8 -0.4,-2.6 C-1.6,-2.2 -2.4,-3 -2.6,-3.8 C-4,-2.4 -5,0 -5,2', 'feather fly angel bird flight'],
  ['bird-tracks', 'Bird tracks', 'M-2.4,-0.6 L-2.4,-2.6 L-2.4,-3.6 M-3.6,-1 L-2.4,-2.6 L-1.2,-1 M2.2,3.6 L2.2,1.6 L2.2,0.6 M1,3.2 L2.2,1.6 L3.4,3.2', 'footprints chicken trail snow claws'],
  ['bird-bath', 'Bird bath', 'M-4.6,2 L4.6,2 L1,0 L-1,0 Z M-1,0 L-1,-3.8 M1,0 L1,-3.8 M-3,-5 L3,-5 L1,-3.8 L-1,-3.8 Z D-2,3.6 D0,4.4 D2,3.6', 'garden water splash basin'],
  ['webbed-foot', 'Webbed foot', 'M0,5 L0,0.6 L-3.4,-4 L-1.2,-3 L0,-4.6 L1.2,-3 L3.4,-4 L0,0.6', 'duck goose flipper track'],
  ['swallow', 'Swallow', 'M0,3 L0.8,1.8 C2,3 4,4 5.8,2.6 C4,2.4 2.6,1.2 1.4,-0.6 L2.2,-5 L0,-2.4 |', 'bird flying forked tail spring swift'],
  ['paper-crane', 'Paper crane', 'M-5,3.6 L-1.4,0 L0,-3.6 L1.4,0 L4.2,3.2 L5.4,2 M-1.4,0 L0,4.8 L1.4,0 M-1.4,0 L1.4,0', 'origami bird japan fold peace'],
];

const SEA = [
  ['swordfish', 'Swordfish', 'M-1.6,0 C-0.4,1 0.4,1.4 0.8,1.6 L1.4,3.6 L2.6,1.9 C3.4,1.6 4,1 4.4,0.4 L5.8,2.4 L5.4,0 L5.8,-2.4 L4.4,-0.6 C3.4,-1.8 0,-1.8 -1.6,0 M-1.6,0 L-6.4,0.2 D0.6,0.2', 'marlin fish sea sword nose fast'],
  ['eel', 'Eel', 'M-6.6,0.2 L-5.6,1 Q-3.6,3 -1.6,1 Q0.4,-1 2.4,1 Q3.6,2.2 5,1.4 C6.2,0.6 6,-1 4.6,-0.6 Q3.4,0.4 2.2,-0.8 Q0.4,-2.8 -1.8,-0.8 Q-3.6,1 -5.6,-0.6 Z D4.8,0.5', 'electric fish snake sea slippery'],
  ['shrimp', 'Shrimp', `M${[20, 65, 110, 155, 200, 245, 290].map((a) => around(0, 0, 4, a)).join(' L')} L${around(0, 0, 5.4, 310)} L${around(0, 0, 3, 322)} L${[290, 245, 200, 155, 110, 65, 20].map((a) => around(0, 0, 2, a)).join(' L')} Z ${[65, 110, 155, 200, 245].map((a) => `M${around(0, 0, 2, a)} L${around(0, 0, 4, a)}`).join(' ')} M${around(0, 0, 4, 20)} L5.8,3.6 D${around(0, 0, 3, 36)}`, 'prawn seafood curl crustacean pink'],
  ['walrus', 'Walrus', 'M0,4.4 C2.8,4.4 4.6,2.4 4.6,0 C4.6,-1.6 3.6,-2.8 2.6,-3 M0,0 C1.2,0.4 2.4,-0.4 2.2,-1.6 C2,-2.6 0.8,-2.8 0,-2.2 M1.2,-3.4 L1.4,-6.2 D1.8,1.8 D1.2,-1.2 | D0,-0.9', 'tusks arctic seal whiskers ice'],
  ['sea-anemone', 'Sea anemone', 'M-2.6,-5 L2.6,-5 L2,-2 L1,-2 L0,-2 L-1,-2 L-2,-2 Z M-2,-2 Q-4.4,0 -3.6,3 M-1,-2 Q-2.6,1 -1.6,4.4 M0,-2 Q-0.6,2 0.4,5 M1,-2 Q2.6,1 1.8,4.4 M2,-2 Q4.4,0 3.8,3', 'reef tentacles clownfish coral polyp'],
  ['hammerhead-shark', 'Hammerhead shark', 'M0,5 L2.8,5 L2.8,3.6 L1,3.2 C1.4,2 1.2,0.6 1,0 L3.6,-1.6 L1,-1.4 C0.8,-2.6 0.4,-3.6 0,-4.2 L1.6,-5.8 |', 'hammer head ocean predator fin'],
  ['whale-tail', 'Whale tail', 'M1,-3 C0.8,-1 0.6,0 0.8,1 C2,1.2 4.4,2 5.6,3.8 C3.6,4.2 1.4,4 0,2.6 | M-5.4,-4.6 Q-4.05,-3.6 -2.7,-4.6 Q-1.35,-5.6 0,-4.6 Q1.35,-3.6 2.7,-4.6 Q4.05,-5.6 5.4,-4.6', 'fluke dive ocean humpback splash'],
  ['angelfish', 'Angelfish', 'M-4.6,0 L-1,3 L1,5.4 L2,2.6 L4,0.6 L5.4,2 L5.4,-2 L4,-0.6 L2,-2.6 L1,-5.4 L-1,-3 Z M0,2.6 L0,-2.6 M-2,1.2 L-2,-1.2 D-3.2,0.3', 'tropical aquarium reef stripes fins'],
];

const BUGS = [
  ['grasshopper', 'Grasshopper', 'M-3,-0.15 L0,0.3 L3,0.6 C4.6,0.8 5,-0.6 4,-1.2 L3.2,-1.234 L2,-1.286 L-3,-1.5 Z M0,0.3 L-2.4,3.8 L-4.6,-3.4 M2,-1.286 L1.6,-3.4 M3.2,-1.234 L3.6,-3.4 M4.8,1.4 L5.8,3.4 D3.8,-0.2', 'cricket locust hop jump insect'],
  ['stag-beetle', 'Stag beetle', 'M0,1.4 C1.6,1.4 2.6,0.4 2.6,-1.6 C2.6,-3.8 1.4,-5 0,-5 M0,2.4 L1.6,2.4 L1.6,3.4 L0,3.4 M0.8,4.2 Q3.4,4.6 2.4,7 M3.4,0.6 L5.2,1.6 M3.4,-1.6 L5.4,-1.6 M3.2,-3.6 L5,-4.8 | M0,1.4 L0,-5', 'pincers horns bug insect antlers'],
  ['cocoon', 'Cocoon', 'M-5,4.4 L0,4.4 L5,4.4 M0,4.4 L0,3.2 C2.4,2 2.4,-2.6 0,-5 C-2.4,-2.6 -2.4,2 0,3.2 M-1.1,1 L1.1,1 M-1.1,-1 L1.1,-1 M-0.6,-3 L0.6,-3', 'chrysalis pupa butterfly silk hanging'],
  ['bee-skep', 'Straw beehive', 'M-4,-5 L-4,-2.6 C-4,2.6 -2,5 0,5 C2,5 4,2.6 4,-2.6 L4,-5 L1.2,-5 A0,-5 1.2 0 180 Z M-3,-2.6 L3,-2.6 M-2.6,0 L2.6,0 M-1.6,2.6 L1.6,2.6', 'bees honey skep hive buzz'],
  ['butterfly-net', 'Butterfly net', 'M1.2,2.6 E-1.6,2.6 2.8,1.4 0 180 C-3.4,-1 -2.6,-2.8 -1.6,-2.8 C-0.6,-2.8 0.2,-1 1.2,2.6 L5.4,-4.6 M-3.4,2.2 Q-1.6,1.2 0.2,2.2', 'catch insects bug hunt meadow'],
  ['slug', 'Slug', 'M-5.4,-2.4 C-3,-2.4 -2,0.6 0.6,0.8 C2.6,1 3.6,0 3.8,-1 L3.8,-2.4 Z M2.6,1.5 L2.2,3.6 M4,0.4 L4.8,2.6 D2,4.4 D5.1,3.4', 'snail slime garden slow slimy'],
  ['bug-jar', 'Bug jar', 'M-2.4,3.4 L2.4,3.4 L2.4,2.4 L3.2,1.4 L3.2,-5 L-3.2,-5 L-3.2,1.4 L-2.4,2.4 Z M-2.8,4.4 L2.8,4.4 D-1.4,-0.6 D1,-2 D0.6,0.8 D-1,-3.4', 'fireflies glow lantern catch insects'],
];

const BEASTS = [
  ['ankylosaurus', 'Ankylosaurus', 'M-3,-1 L-2.4,0.8 L-1.6,0.2 L-0.8,1.8 L0,1 L0.8,2 L1.6,1 L2.4,1.6 L3,0.4 L4.8,-0.2 L5.4,-1.4 L3.4,-1.8 L3,-4 L2,-4 L1.8,-1.8 L-1.2,-1.8 L-1.4,-4 L-2.4,-4 L-2.6,-1.8 Z M-3,-1 L-4.8,0 O-6.2,0.8 0.8', 'dinosaur armour club tail spikes'],
  ['spinosaurus', 'Spinosaurus', 'M-5.6,0.6 L-2,0 C-1.6,3.6 2,3.6 2.4,0.4 L3.4,1.4 L5.4,1.2 L5.6,0.2 L3.6,-0.4 L2.6,-1 L2.2,-4.6 L1,-4.6 L1.2,-1.6 L-1,-1.6 L-1.4,-4.6 L-2.6,-4.6 L-2.2,-1.2 Z M-0.8,0.2 L-1,1.5 M0.2,0.2 L0.2,2 M1.2,0.2 L1.4,1.6', 'dinosaur sail fin back predator'],
  ['dino-footprint', 'Dinosaur footprint', 'M0,-4.6 C1.6,-4.6 2.4,-3 2,-1.4 L4.4,2 L2.8,2.4 L1.4,0.6 L1.2,4 L0,5.4 |', 'track fossil claw print t-rex'],
  ['dino-skull', 'Dinosaur skull', 'M-5,1 L-3.6,3.4 L2.6,3.6 L5,2 L5.2,-0.4 L4.4,-0.2 L4,-1.2 L3.4,-0.2 L2.8,-1.2 L2.2,-0.2 L1.6,-1.2 L1,-0.2 L-1,-0.4 L-2,-2 L-5,-1 Z O-1.6,1.6 1 D3.8,2.2 M-4.6,-2.6 L-2,-3.8 L4.6,-3.2 L4.6,-2.2 L1,-2.4', 'fossil bones t-rex museum jaw teeth'],
  ['hydra', 'Hydra', 'N E0,-3.6 3.6,1.4 0 360 M-1.6,-1.4 C-3,0.6 -1.6,2 -3,3.4 L-4,4.4 L-3,5.4 L-2,4.4 L-3,3.4 M0,-1.4 C1,0.6 -1,2.4 0,3.8 L-1,4.8 L0,5.8 L1,4.8 L0,3.8 M1.6,-1.4 C3,0.6 1.6,2 3,3.4 L2,4.4 L3,5.4 L4,4.4 L3,3.4', 'three heads serpent myth monster greek'],
  ['kraken', 'Kraken', 'M-3.4,-3 C-3.4,1 -5,2 -4,3.6 C-3.4,4.6 -2.2,4 -2.6,3 M0,-3 C0,2 1.6,3 1,4.8 C0.6,5.8 -0.8,5.2 -0.4,4.2 M3.4,-3 C3.4,0 5,1.4 4.4,2.8 C4,3.8 2.8,3.4 3.2,2.4 M-5.4,-4.6 Q-4.05,-3.6 -2.7,-4.6 Q-1.35,-5.6 0,-4.6 Q1.35,-3.6 2.7,-4.6 Q4.05,-5.6 5.4,-4.6', 'tentacles octopus giant squid sea legend'],
  ['fairy', 'Fairy', 'M1.4,0.6 C3,3.6 5.4,3.4 5,1.4 C4.8,0 3,-0.2 1.8,-0.4 | O0,3.6 1 M0,1.8 L-1.6,-2 L-0.6,-2 L0.6,-2 L1.6,-2 Z M-0.6,-2 L-0.6,-4.4 M0.6,-2 L0.6,-4.4', 'pixie sprite wings magic tinkerbell'],
  ['trilobite', 'Trilobite', 'M3.8,0.6 L4.8,-0.2 M3.8,-0.8 L4.8,-1.6 M3.5,-2.2 L4.4,-3 D1.2,3.2 | N E0,0 3,4.8 0 360 M-1.8,2.2 Q0,1.2 1.8,2.2 M-1.9,0.6 L1.9,0.6 M-2,-0.8 L2,-0.8 M-1.7,-2.2 L1.7,-2.2 M-1,-3.6 L1,-3.6', 'fossil ancient sea bug extinct'],
];

export const OUTDOOR_SHAPES = [
  ...pictures('nature', 'Sky and weather', SKY),
  ...pictures('nature', 'Plants', PLANTS),
  ...pictures('nature', 'Land and sea', LAND),
  ...pictures('animals', 'Pets and farm', FARM),
  ...pictures('animals', 'Wild animals', WILD),
  ...pictures('animals', 'Birds', BIRDS),
  ...pictures('animals', 'Sea animals', SEA),
  ...pictures('animals', 'Bugs', BUGS),
  ...pictures('animals', 'Dinosaurs and dragons', BEASTS),
];
