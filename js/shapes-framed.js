// Pictures in a frame, and pictures with little things around them: "Cat in a
// circle", "Sword on a shield", "Pizza in a speech bubble", "Cupcake with
// sparkles", "Dog with a crown".
//
// Every picture of the picture tabs (animals, faces, food, nature, things,
// travel, costume and symbols) is taken as it was drawn, and made as big as
// the room allows that the frame, or the things around it, leave free. The
// particles are shared out by the length of the lines, so they lie as far
// apart on the frame as on the picture.
//
// With the usual number of particles, a picture in a frame has exactly the
// particles it has when it stands alone, only smaller and somewhere else. So
// has a picture with a crown, and nearly every picture with a halo. Sparkles,
// hearts and stars are small, and each of them needs enough particles to be
// read: most pictures then get more particles than they have alone, so that
// the particles are as far apart on the picture as on the little things.
//
// A new frame is one entry in FRAMES, a new way to decorate one in AROUND. A
// new picture under one of the headings in FROM gets all of them (but a banner
// or a sign: those are for the pictures listed in ONLY).

import { parsePath, fitDrawing, drawingNet, spreadPoints, apportion, around, RAD } from './shape-kit.js';
import { minis, pictureOf } from './shapes-combos.js';

// ---------------------------------------------------------------- the pictures

// The pictures that were drawn by hand, tab by tab, in the order they stand in under a heading of the new tabs.
// (Left out: what is a frame already, like the shields and the badges, and what is made from parts, like the snowflakes.)
const FROM = [
  ['animals', ['Pets and farm', 'Wild animals', 'Birds', 'Sea animals', 'Bugs', 'Dinosaurs and dragons']],
  ['faces', ['Smileys', 'Characters']],
  ['food', ['Fruit and vegetables', 'Meals', 'Sweets', 'Drinks']],
  ['nature', ['Sky and weather', 'Plants', 'Land and sea']],
  ['things', ['Tools', 'Weapons', 'Treasure and magic', 'Games and sport', 'Music', 'Home', 'Party and holidays']],
  ['travel', ['Vehicles', 'Buildings']],
  ['costume', ['Wings', 'On the head', 'Clothes']],
  ['symbols', ['Signs', 'Hearts and sparkles', 'Music', 'Star signs', 'People and body', 'Arrows']],
];

// These stand in the four frames already, as badges of the Symbols tab (drawn smaller and plainer, for the Combos
// tab), and "Arrow in a circle" is a frame itself: they are not framed a second time. They do get things around them.
// (Only "Speech bubble with a crown" was there too: a bubble with a crown in it.)
const FRAMED_BEFORE = new Set((
  'paw bat bird fish butterfly smiley skull apple pumpkin ice-cream sun moon cloud raindrop snowflake leaf tree flower clover mushroom cactus flame key lock '
  + 'anchor sword shield bomb crown potion flag trophy bell umbrella candle balloon ghost snowman rocket house witch-hat check eye latin-cross sparkle note arrow '
  + 'arrow-circle'
).split(' '));

const lazy = (make) => {
  let value;
  return () => (value === undefined ? (value = make()) : value);
};

/** The corners of the smallest outline without dents around some points (so few points say how far a picture reaches). */
function hullOf(points) {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length >= 2 && turn(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return sorted.length < 3 ? sorted : [...half(sorted), ...half(sorted.reverse())];
}

/**
 * What a picture needs to be put somewhere else: where its middle is and how big it is as it was drawn, how long its
 * lines are and how far it reaches (both with the picture in the box from -1 to 1 around its own middle; `low` and
 * `high`: how far down and up).
 */
function measured(base) {
  const drawing = base.drawing();
  const points = [...drawing.polys.flat(), ...drawing.dots];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of points) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const half = Math.max(x1 - x0, y1 - y0) / 2 || 1;
  let length = 0;
  for (const poly of drawing.polys) for (let i = 1; i < poly.length; i++) length += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
  const hull = hullOf(points.map(([x, y]) => [(x - cx) / half, (y - cy) / half]));
  return { cx, cy, half, length: length / half, hull, low: Math.min(...hull.map((p) => p[1])), high: Math.max(...hull.map((p) => p[1])) };
}

// ---------------------------------------------------------------- the room for a picture
//
// The room is what a frame leaves free: the space on the inner side of a few straight lines. A line is
// [nx, ny, h]: the points with nx * x + ny * y <= h are inside (nx, ny has the length 1).

const GAP = 0.18; // between a frame and the picture in it: two particles apart, so that the frame is a line of its own
const NEAR = 0.13; // between a picture and the little things around it

/** The lines of the room inside a closed outline that has no dents, `gap` away from it. */
function roomInside(outline, gap) {
  let area = 0;
  for (let i = 1; i < outline.length; i++) area += outline[i - 1][0] * outline[i][1] - outline[i][0] * outline[i - 1][1];
  const side = area > 0 ? 1 : -1;
  const lines = [];
  for (let i = 1; i < outline.length; i++) {
    const [ax, ay] = outline[i - 1];
    const [bx, by] = outline[i];
    const length = Math.hypot(bx - ax, by - ay);
    if (length < 1e-9) continue;
    const nx = (side * (by - ay)) / length;
    const ny = (-side * (bx - ax)) / length;
    lines.push([nx, ny, nx * ax + ny * ay - gap]);
  }
  return lines;
}

const BOX = [[1, 0, 0.98], [-1, 0, 0.98], [0, 1, 0.98], [0, -1, 0.98]];

/** The room beside little things: the whole box, cut off in front of each of them ([x, y, the points of the thing as it lies there]). */
const roomBeside = (things, gap) => [...BOX, ...things.map(([x, y, points]) => {
  // the line stands across the way from the middle of the box to the thing, before its nearest point
  const far = Math.hypot(x, y);
  return [x / far, y / far, Math.min(...points.map((p) => (x * p[0] + y * p[1]) / far)) - gap];
})];

/**
 * Where a picture goes and how big it gets, so that it fills the room: [x, y, size]. `hull` says how far the picture
 * reaches, in the box from -1 to 1 around its own middle. Of all the places where it is biggest, the one nearest
 * `home` is taken: the middle of the box, or the top of it for a picture with something over it.
 */
function fitInto(lines, hull, home = [0, 0]) {
  // how far the picture reaches towards each line
  const reach = lines.map(([nx, ny]) => hull.reduce((most, [x, y]) => Math.max(most, nx * x + ny * y), -Infinity));
  const sizeAt = (cx, cy) => {
    let size = 1;
    for (let i = 0; i < lines.length; i++) {
      const free = lines[i][2] - lines[i][0] * cx - lines[i][1] * cy;
      if (free < 0) return -1;
      if (reach[i] > 1e-6) size = Math.min(size, free / reach[i]);
    }
    return size - 0.02 * ((cx - home[0]) ** 2 + (cy - home[1]) ** 2);
  };
  let at = [0, 0];
  let best = sizeAt(0, 0);
  for (let step = 0.16; step > 0.001; step /= 2) {
    for (let moved = true; moved;) {
      moved = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const value = sizeAt(at[0] + dx * step, at[1] + dy * step);
        if (value > best + 1e-9) {
          best = value;
          at = [at[0] + dx * step, at[1] + dy * step];
          moved = true;
        }
      }
    }
  }
  return [at[0], at[1], best + 0.02 * ((at[0] - home[0]) ** 2 + (at[1] - home[1]) ** 2)];
}

// ---------------------------------------------------------------- frames and things around

const corners = (k, radius, first = 90) => Array.from({ length: k }, (_, i) => around(0, 0, radius, first + (360 * i) / k));
const ROUND = Array.from({ length: 72 }, (_, i) => [Math.cos(i * 5 * RAD), Math.sin(i * 5 * RAD), 1 - GAP]);

const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];

// [part of the id, how the name ends, the heading, the frame in the box from -1 to 1, search words,
//  { inside: the outline the picture stays in, when that is not the frame itself (it must not have dents),
//    home: where the picture goes when it has room to spare, only: the pictures that get this frame }]
const FRAMES = [
  ['in-a-circle', 'in a circle', 'In a circle', 'O0,0 1', 'round button coin token badge emblem logo'],
  ['in-a-square', 'in a square', 'In a square', 'M-1,-1 L1,-1 L1,1 L-1,1 Z', 'box tile block icon button badge frame'],
  ['in-a-hexagon', 'in a hexagon', 'In a hexagon', `M${corners(6, 1).join(' L')} Z`, 'six sides tile honeycomb badge emblem'],
  ['on-a-shield', 'on a shield', 'On a shield', 'M-0.86,1 L0.86,1 L0.86,0 Q0.86,-0.62 0,-1 Q-0.86,-0.62 -0.86,0 Z', 'crest team guard coat of arms badge emblem'],
  ['in-a-speech-bubble', 'in a speech bubble', 'In a speech bubble',
    'M-0.86,1 L0.86,1 Q1,1 1,0.86 L1,-0.42 Q1,-0.56 0.86,-0.56 L-0.1,-0.56 L-0.5,-1 L-0.46,-0.56 L-0.86,-0.56 Q-1,-0.56 -1,-0.42 L-1,0.86 Q-1,1 -0.86,1 Z',
    'emote talk say chat thinking comic balloon npc quest', { inside: box(-1, -0.56, 1, 1), home: [0, 0.22] }],
  ['on-a-banner', 'on a banner', 'On a banner', 'M-0.7,1 L0.7,1 L0.7,-1 L0,-0.74 L-0.7,-1 Z',
    'flag pennant hanging standard team guild clan emblem', { inside: box(-0.7, -0.74, 0.7, 1), home: [0, 0.13], only: 'tall' }],
  ['on-a-sign', 'on a sign', 'On a sign', 'M-1,1 L1,1 L1,-0.4 L0,-0.4 L-1,-0.4 Z M0,-0.4 L0,-1',
    'board post signpost shop notice street road', { inside: box(-1, -0.4, 1, 1), home: [0, 0.3], only: 'wide' }],
];

// A banner is high and a sign is wide: the pictures that are high go on a banner, the ones that are wide on a sign.
// (The lists are written out, and not worked out from the drawings each time, so that no shape comes or goes when a
// picture is drawn a little differently: saved scenes ask for a shape by its id.)
const listed = (text) => new Set(text.split(' ').filter(Boolean));
const ONLY = {
  tall: listed(
    'rabbit chick goat llama sitting-cat horseshoe donkey bull cow-bell milk-churn hoof-print turtle raccoon giraffe gecko gazelle owl feather parrot '
    + 'flamingo toucan bird-house bird-cage ostrich webbed-foot octopus jellyfish seahorse squid lobster walrus sea-anemone hammerhead-shark ladybird ant '
    + 'beetle firefly bee-skep bug-jar hatching-egg dragon-head dragon-egg dino-footprint hydra face-angel face-devil face-party cold-face hair-bow-face '
    + 'skull skull-bones alien mask-comedy mask-tragedy monster face-santa face-king face-wizard queen-face chef-face grandma-face tiki-mask hockey-mask '
    + 'diving-helmet scream-mask gas-mask apple pear grapes strawberry pineapple carrot chili avocado aubergine onion bell-pepper radish apple-core pizza '
    + 'fries fork-knife egg-cup popcorn salt-shaker ice-cream lollipop cupcake ice-lolly cotton-candy sundae gumball-machine soft-serve tiered-cake juice '
    + 'cocktail coffee-cup milk-carton water-bottle bubble-tea milkshake hot-chocolate baby-bottle jug moon raindrop storm-cloud raindrops ice-crystal '
    + 'thermometer moon-cloud half-moon leaf tree pine flower tulip cactus rose-flower sunflower wheat bamboo acorn palm-tree apple-tree fern potted-plant '
    + 'oak-leaf dandelion venus-flytrap winter-tree bonsai bouquet flame crystal-cluster smoke-puffs log-fire river seaweed lock hammer wrench screwdriver '
    + 'shovel magnet paint-brush scissors ladder bucket rake fish-hook test-tube plug sword bow trident battle-axe dagger crossed-swords war-hammer scythe '
    + 'dynamite potion crystal-ball coins money-bag jewel-ring amulet spell-book bubbling-cauldron magic-mirror emerald rabbit-hat flag medal chess-pawn '
    + 'playing-card kite tennis-racket stopwatch chess-king joystick arcade teddy-bear guitar microphone violin snare-drum harp electric-guitar metronome '
    + 'lyre bulb candle door lamp phone broom fridge alarm-clock calendar trash-can backpack balloon ghost bauble snowman candy-cane fireworks easter-egg '
    + 'balloons christmas-tree wreath coffin firework-rocket paper-lantern easter-basket clapperboard snow-globe rocket parachute traffic-light fighter-jet '
    + 'signpost suitcase jetpack unicycle roller-skate church windmill castle-tower pagoda eiffel-tower clock-tower well street-lamp wind-turbine moai '
    + 'water-tower party-hat knight-helmet beanie boot mitten tie sock wristwatch lightning hexagram power map-pin female ankh latin-cross sand-timer '
    + 'quest-marker celtic-cross bluetooth-sign wheelchair-sign bookmark push-pin paper-clip safety-shield railway-crossing-sign document restroom-sign '
    + 'heart-crown heart-key flaming-heart heart-balloon note note-quarter note-sixteenth treble-clef flat-sign natural-sign quarter-rest repeat-sign chord '
    + 'taurus gemini leo person person-cheer person-run thumbs-up tooth walking-person dancing-person sitting-person weightlifter footballer person-in-dress '
    + 'footprint person-with-stick skateboarder arrow arrow-outline arrow-uturn pointer arrow-spiral arrow-merge arrow-nav north-arrow arrow-thin-up '
    + 'arrow-thin-down arrow-block-up arrow-block-down arrow-triangle-right arrow-triangle-left arrow-chevron-right arrow-chevron-left',
  ),
  wide: listed(
    'dog cow duck turkey pet-bowl bat monkey frog snake hedgehog rhino crocodile chameleon armadillo anteater axolotl tadpole cattle-skull bird swan eagle '
    + 'dove seagull nest kiwi-bird wing swallow paper-crane fish whale crab fish-bones dolphin shark narwhal anglerfish swordfish eel shrimp whale-tail bee '
    + 'snail caterpillar mosquito scorpion grasshopper butterfly-net slug dinosaur stegosaurus dragon-eye sea-monster t-rex triceratops pterodactyl '
    + 'ankylosaurus spinosaurus dino-skull headphones-face ninja elf-face monster-face banana watermelon orange-slice lemon kiwi burger hot-dog cheese '
    + 'baguette croissant kebab cooking-pot frying-pan candy pie jelly cloud rainbow planet rain-cloud sunrise constellation rainbow-clouds moon-stars '
    + 'cloud-happy moon-phases hurricane blowing-cloud northern-lights sprout grass-blades tree-stump log bush lotus-flower ivy-vine mountain sea-wave waves '
    + 'island cave ripples pearl-shell splash cliff-waterfall rock-pile stepping-stones ore-rock key saw ruler palette watering-can toolbox katana boomerang '
    + 'ray-gun crown open-book treasure-map magic-lamp game-controller skateboard dumbbell baseball-bat golf-flag dart whistle two-dice trumpet piano-keys '
    + 'headphones boombox cassette window bed laptop envelope sofa bathtub books toothbrush camera coat-hanger shopping-cart cardboard-box gravestone ticket '
    + 'car bus truck bicycle helicopter ship submarine ufo race-car tank airship paper-plane satellite canoe pirate-ship cable-car sledge tent city pyramids '
    + 'shop suspension-bridge bench angel-wings fairy-wings dragon-wings bee-wings robot-wings ice-wings top-hat witch-hat cap cowboy-hat horns cat-ears '
    + 'pirate-hat santa-hat viking-helmet graduation-cap hard-hat sombrero jester-hat antlers feather-headdress tiara propeller-cap flower-crown bow-tie '
    + 'glasses mask shorts skirt sneaker moustache eye-patch hoodie check infinity warning atom eye signal battery scales sliders eye-closed health-bar '
    + 'eye-horus progress-bar muted-speaker give-way-sign flammable-sign voltage-sign price-tag id-card toggle-switch one-way-sign folder heart-arrow '
    + 'hearts-two star-rating winged-heart love-letter fermata libra scorpio aquarius lips bone googly-eyes swimmer brain arrow-double chevrons arrow-curved '
    + 'arrows-swap arrow-trend arrow-loop fast-forward arrow-return arrow-wavy dashed-arrow skip-arrow stairs-arrow arrow-thin-right arrow-thin-left '
    + 'arrow-block-right arrow-block-left arrow-triangle-up arrow-triangle-down arrow-chevron-up arrow-chevron-down',
  ),
};

// [part of the id, how the name ends, the heading, the little picture, where its copies are: [x, y, size, turned by], search words,
//  'under' = the picture stands right under them]
// (few and big: a little picture has to be made of a dozen particles to be read)
const AROUND = [
  ['with-sparkles', 'with sparkles', 'With sparkles', 'sparkles', [[0.74, 0.74, 0.24], [-0.79, -0.77, 0.19], [-0.82, 0.8, 0.15]], 'shiny shining glitter twinkle new clean magic enchanted'],
  ['with-hearts', 'with hearts', 'With hearts', 'hearts', [[0.7, 0.7, 0.25, -14], [-0.76, 0.76, 0.19, 14]], 'love loved cute valentine like favourite'],
  ['with-stars', 'with stars', 'With stars', 'stars', [[-0.66, 0.68, 0.18, 14], [0, 0.8, 0.19], [0.66, 0.68, 0.18, -14]], 'three starry best winner award rating night', 'under'],
  ['with-a-crown', 'with a crown', 'With a crown', 'crowns', [[0, 0.78, 0.27]], 'king queen royal best winner champion boss ruler', 'under'],
  ['with-a-halo', 'with a halo', 'With a halo', 'halo', [[0, 0.86, 0.42]], 'angel holy saint good blessed heaven ring', 'under'],
];

// The little pictures of the Combos tab, and a halo: a flat ring. A sparkle is read from eight particles, its
// points and the corners between them: the small ones are that plain, or the picture would have to be made of
// many more particles than it was drawn for.
const HALO = 'E0,0 1 0.26 90 450';
const LITTLE = (which) => (which === 'halo'
  ? { ...pictureOf(HALO), d: HALO, needs: 14 }
  : { ...minis.find((m) => m.id === which), ...(which === 'sparkles' ? { needs: 8 } : {}) });

/**
 * What stands around every picture of one kind, as parts that each give particles: `points(k)`, the `length` of its
 * lines, its `corners` (fewest particles), and how many it `needs` to be read (0: any number will do).
 */
function framePart(d) {
  const net = lazy(() => drawingNet(parsePath(d)));
  // (a circle has no corners: eight particles are the fewest that still make a ring)
  const least = lazy(() => Math.max(8, net().nodes.length));
  return {
    points: (k) => (k < net().nodes.length ? net().nodes.slice(0, k) : spreadPoints(net(), k)),
    length: lazy(() => net().lens.reduce((sum, l) => sum + l, 0)),
    corners: least,
    needs: 0,
  };
}

/** A point of a little picture (in its own box from -1 to 1), where the copy lies that stands at x, y, this big and turned. */
const laid = ([x, y, size, turn = 0]) => {
  const c = Math.cos(turn * RAD);
  const s = Math.sin(turn * RAD);
  return ([px, py]) => [x + (px * c - py * s) * size, y + (px * s + py * c) * size];
};

function littlePart(mini, where) {
  // A star or a sparkle is made of runs that are all the same: it gets whole rounds of particles, one more on every
  // run, or some of its points would have a neighbour at half the distance.
  const runs = lazy(() => {
    const { nodes, lens } = drawingNet(fitDrawing(parsePath(mini.d)));
    const same = lens.every((l) => Math.abs(l - lens[0]) < 0.01 * lens[0]);
    return { first: nodes.length, step: same ? lens.length : 1 };
  });
  return {
    points: (k) => mini.points(k).map(laid(where)),
    length: () => mini.length() * where[2],
    corners: () => mini.corners(),
    needs: mini.needs,
    even: (k) => (k < runs().first ? k : k - ((k - runs().first) % runs().step)),
  };
}

// ---------------------------------------------------------------- the shapes

/**
 * One shape: the picture `base` in its `room`, and the `parts` around it. `home`: where the picture goes when it has
 * room to spare. `over`: the parts stand over the picture, from this low to this high; a picture that is wide then
 * leaves the bottom of the box empty, and the whole is moved down to stand in the middle of the box.
 */
function composed(base, measure, [part, how, heading, words], cat, parts, room, home, over = null) {
  const id = `${base.id}-${part}`;
  const place = lazy(() => fitInto(room(), measure().hull, home));
  const down = lazy(() => {
    if (!over) return 0;
    const [, y, size] = place();
    return (Math.max(over()[1], y + size * measure().high) + Math.min(over()[0], y + size * measure().low)) / 2;
  });
  const lengths = lazy(() => [measure().length * place()[2], ...parts.map((p) => p.length())]);
  const fewest = lazy(() => [base.min, ...parts.map((p) => p.corners())]);
  const usual = Object.fromEntries((base.params || []).map((p) => [p.key, p.default]));
  /** How many particles each gets of n: the picture first, then what is around it. */
  const shares = (n) => {
    // each its share by the length of its lines; none gets fewer than its corners (the others give some up for that)
    let counts = apportion(lengths(), n);
    const least = fewest();
    if (n < least.reduce((sum, k) => sum + k, 0)) return apportion(least, n);
    for (let i = 0; i < counts.length; i++) {
      while (counts[i] < least[i]) {
        let rich = 0;
        for (let j = 1; j < counts.length; j++) if (counts[j] - least[j] > counts[rich] - least[rich]) rich = j;
        counts[rich]--;
        counts[i]++;
      }
    }
    // (what a little thing cannot use evenly goes to the picture)
    parts.forEach((p, i) => {
      const even = p.even ? p.even(counts[i + 1]) : counts[i + 1];
      counts[0] += counts[i + 1] - even;
      counts[i + 1] = even;
    });
    return counts;
  };
  // The usual number is the one that gives the picture exactly the particles it has alone (it was drawn for that many),
  // and what is around it as many as its lines are longer: so the particles are as close together everywhere as they
  // are on the picture alone. It is more when a little thing would not get what it needs to be read.
  const numbers = lazy(() => {
    const whole = lengths().reduce((sum, l) => sum + l, 0);
    const least = fewest().reduce((sum, k) => sum + k, 0);
    let asAlone = Math.round((base.count * whole) / lengths()[0]);
    for (const step of [0, 1, -1, 2, -2, 3, -3]) {
      if (asAlone + step <= 300 && shares(asAlone + step)[0] === base.count) {
        asAlone += step;
        break;
      }
    }
    const toRead = Math.max(...parts.map((p, i) => Math.ceil((p.needs * whole) / lengths()[i + 1])));
    return { min: least, count: Math.max(least + 8, Math.min(300, Math.max(asAlone, toRead))) };
  });
  const shape = {
    id, name: `${base.name} ${how}`, cat, sub: heading, group: 'flat',
    tags: `${base.tags || ''} ${words}`.trim(),
    gen: (n) => {
      const counts = shares(n);
      const { cx, cy, half } = measure();
      const [x, y, size] = place();
      const scale = size / half;
      const out = base.gen(counts[0], usual).slice(0, counts[0]).map((p) => [x + (p[0] - cx) * scale, y - down() + (p[1] - cy) * scale, 0]);
      parts.forEach((p, i) => {
        for (const [px, py] of p.points(counts[i + 1])) out.push([px, py - down(), 0]);
      });
      return out;
    },
  };
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => numbers().min });
  Object.defineProperty(shape, 'count', { enumerable: true, get: () => numbers().count });
  // (for the tests: of n particles, the first so many are the picture's; it is not listed with the shape's own fields)
  Object.defineProperty(shape, 'shares', { value: shares });
  return shape;
}

/** The headings of the two tabs. */
export const FRAMED_HEADINGS = FRAMES.map((frame) => frame[2]);
export const AROUND_HEADINGS = AROUND.map((kind) => kind[2]);

/**
 * The framed and the decorated pictures. `all` is the library so far, every picture in the tab and under the
 * heading where it is shown.
 */
export function framedShapes(all) {
  const pictures = FROM.flatMap(([cat, subs]) => subs.flatMap((sub) => all.filter((s) => s.cat === cat && s.sub === sub && s.group === 'flat' && typeof s.drawing === 'function')))
    .map((base) => [base, lazy(() => measured(base))]);
  const out = [];
  const known = new Set(pictures.map(([base]) => base.id));
  for (const [kind, ids] of Object.entries(ONLY)) for (const id of ids) if (!known.has(id)) throw new Error(`Framed shapes: "${id}" (${kind}) is not a picture`);
  for (const [part, how, heading, d, words, { inside, home, only } = {}] of FRAMES) {
    const frame = framePart(d);
    const room = lazy(() => (d.startsWith('O') ? ROUND : roomInside(inside || parsePath(d).polys[0], GAP)));
    for (const [base, measure] of pictures) {
      // (the first four frames: not what is a badge already; a speech bubble does not say a speech bubble)
      if (only ? !ONLY[only].has(base.id) : inside ? base.id === 'speech' : FRAMED_BEFORE.has(base.id)) continue;
      out.push(composed(base, measure, [part, how, heading, words], 'framed', [frame], room, home));
    }
  }
  for (const [part, how, heading, which, places, words, under] of AROUND) {
    const mini = LITTLE(which);
    const parts = places.map((where) => littlePart(mini, where));
    const outlines = lazy(() => {
      const outline = fitDrawing(parsePath(mini.d)).polys.flat();
      return places.map((where) => outline.map(laid(where)));
    });
    const room = lazy(() => roomBeside(places.map((where, i) => [where[0], where[1], outlines()[i]]), NEAR));
    const over = under ? lazy(() => {
      const heights = outlines().flat().map((p) => p[1]);
      return [Math.min(...heights), Math.max(...heights)];
    }) : null;
    for (const [base, measure] of pictures) {
      if (`${base.id}-${part}` === 'speech-with-a-crown') continue;
      out.push(composed(base, measure, [part, how, heading, words], 'decorated', parts, room, under ? [0, 1] : [0, 0], over));
    }
  }
  return out;
}
