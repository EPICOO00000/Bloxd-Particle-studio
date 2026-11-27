// The Monsters tab: monsters put together from a body, eyes, a mouth, something
// on the head, arms and legs (see shape-mix.js for how the parts are dealt out).
// Each heading is one kind of body. A drawing is about 16 units across, so a
// unit is roughly the gap between two particles: nothing here is drawn finer
// than that, and no two corners stand closer than three quarters of a unit.

import {
  family, outline, mirrored, at, path, closed, circle, oval, dot, bow, bowTo, bend, wavy, zigzag, add, mid, polar, ringOf, ball, roundedBox,
} from './shape-mix.js';

// ---------------------------------------------------------------- eyes
//
// (y, wide) => [what is drawn on the right and mirrored, what stands in the middle, search words].
// y is the height of the eyes and `wide` how far from the middle the face reaches.

const EYES = [
  ['two round eyes', (y, w) => [[circle(0.56 * w, y, 1.15), dot(0.56 * w, y)], []]],
  ['one eye cyclops', (y) => [[], [circle(0, y, 1.8), circle(0, y, 0.8)]]],
  ['angry eyes brows', (y, w) => [[dot(0.52 * w, y - 0.2), path([0.2 * w, y + 0.5], [0.82 * w, y + 1.4])], []]],
  ['three eyes', (y, w) => [[circle(0.7 * w, y - 0.3, 0.85), dot(0.7 * w, y - 0.3)], [circle(0, y + 0.8, 0.85), dot(0, y + 0.8)]]],
  ['sleepy closed eyes', (y, w) => [[bow([0.25 * w, y + 0.2], [0.85 * w, y + 0.2], -0.75)], []]],
  ['beady dot eyes', (y, w) => [[dot(0.45 * w, y)], []]],
  ['big and small eye uneven', (y, w) => [[], [circle(-0.5 * w, y, 1.4), dot(-0.5 * w, y), circle(0.6 * w, y - 0.1, 0.8), dot(0.6 * w, y - 0.1)]]],
  ['oval eyes', (y, w) => [[oval(0.55 * w, y, 0.8, 1.25), dot(0.55 * w, y - 0.2)], []]],
  ['dizzy cross eyes', (y, w) => [[path([0.55 * w - 0.75, y - 0.75], [0.55 * w + 0.75, y + 0.75]), path([0.55 * w - 0.75, y + 0.75], [0.55 * w + 0.75, y - 0.75])], []]],
  ['happy eyes', (y, w) => [[bow([0.25 * w, y - 0.3], [0.85 * w, y - 0.3], 0.75)], []]],
  ['four spider eyes', (y, w) => [[dot(0.3 * w, y - 0.2), dot(0.8 * w, y + 0.5)], []]],
];

// ---------------------------------------------------------------- mouths
//
// (y) => what is drawn, in the middle; y is the height of the mouth.

const MOUTHS = [
  ['smile', (y) => bow([-2.2, y + 0.4], [2.2, y + 0.4], -0.5)],
  ['jagged teeth', (y) => path(...zigzag([-2.6, y + 0.5], [2.6, y + 0.5], 3, -1.1))],
  ['open mouth', (y) => `${path([-2, y + 0.6], [2, y + 0.6])} ${bowTo([-2, y + 0.6], 0.8)}`],
  ['fangs', (y) => `${path([-2.5, y + 0.5], [2.5, y + 0.5])} ${path([-1.8, y + 0.5], [-1.2, y - 0.8], [-0.6, y + 0.5])} ${path([0.6, y + 0.5], [1.2, y - 0.8], [1.8, y + 0.5])}`],
  ['frown sad', (y) => bow([-2, y - 0.5], [2, y - 0.5], 0.5)],
  ['round mouth surprised', (y) => circle(0, y - 0.1, 0.85)],
  ['tongue out', (y) => `${path([-2.3, y + 0.4], [2.3, y + 0.4])} ${path([0.1, y + 0.4], [0.1, y - 0.4])} ${bowTo([1.7, y - 0.4], -1)} L${at(1.7, y + 0.4)}`],
  ['straight mouth', (y) => path([-1.9, y], [1.9, y])],
];

// ---------------------------------------------------------------- on the head
//
// (body) => [what is drawn on the right and mirrored, what stands in the middle].
// `b.head` is how far from the middle the top of the head reaches.

/** A horn or an ear standing on the outline between two points: `high` times as high as it is wide, leaning outwards by `lean` of its width. */
function peak(from, to, high, lean = 0) {
  const wide = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const ux = (to[0] - from[0]) / wide;
  const uy = (to[1] - from[1]) / wide;
  const m = mid(from, to);
  return path(from, [m[0] - uy * wide * high + ux * wide * lean, m[1] + ux * wide * high + uy * wide * lean], to);
}

const TOPS = [
  ['', () => [[], []]],
  ['horns', (b) => [[peak(b.top(0.3 * b.head), b.top(0.74 * b.head), 1.25, 0.25)], []]],
  ['antennae feelers', (b) => [[ball(b.top(0.3 * b.head), add(b.top(0.3 * b.head), 1, 2.5), 0.8)], []]],
  ['pointed ears', (b) => [[peak(b.top(0.34 * b.head), b.top(0.8 * b.head), 0.9, 0.15)], []]],
  ['one horn unicorn', (b) => [[], [peak(b.top(-1.2), b.top(1.2), 1.2)]]],
  ['curved horns bull', (b) => [[bend(b.top(0.52 * b.head), add(b.top(0.52 * b.head), 1.3, 1.9), add(b.top(0.52 * b.head), 0.7, 3.5))], []]],
  ['spikes mohawk', (b) => {
    const step = 0.18 * b.head;
    return [[], [path(...[-3, -2, -1, 0, 1, 2, 3].map((i) => (i % 2 ? b.top(i * step) : add(b.top(i * step), 0, 1.7))))]];
  }],
  ['round ears bear', (b) => [[`M${at(...b.top(0.3 * b.head))} C${at(...add(b.top(0.3 * b.head), 0.1, 2.6))} ${at(...add(b.top(0.78 * b.head), 1.5, 1.9))} ${at(...b.top(0.78 * b.head))}`], []]],
  ['hair tuft', (b) => [[path(b.top(0), add(b.top(0), 1.8, 2))], [path(b.top(0), add(b.top(0), 0, 2.7))]]],
];

// On a body with fur or bumps only single strokes stand well: five of them.
const TOPS_SIMPLE = [
  TOPS[0], TOPS[2], TOPS[5], TOPS[8],
  ['bent feelers', (b) => [[path(b.top(0.5 * b.head), add(b.top(0.5 * b.head), 0.7, 2.4), add(b.top(0.5 * b.head), 2.5, 2.9))], []]],
];

// ---------------------------------------------------------------- arms and legs
//
// An arm starts on the right edge of the body, a leg on its underside; both are mirrored.

const claw = (hand, dx, dy) => `${path(add(hand, dx * 0.9 - dy * 0.5, dy * 0.9 + dx * 0.5), hand, add(hand, dx * 0.9 + dy * 0.5, dy * 0.9 - dx * 0.5))}`;

const ARMS = {
  none: ['', () => ''],
  down: ['arms', (b) => { const s = b.right(b.arm); return path(s, add(s, 2.1, -1.5)); }],
  up: ['arms up raised cheering', (b) => { const s = b.right(b.arm); return path(s, add(s, 2, 1.8)); }],
  claws: ['claws pincers', (b) => { const s = b.right(b.arm); return `${path(s, add(s, 1.5, 0.5))} ${claw(add(s, 1.5, 0.5), 0.95, 0.32)}`; }],
  tentacles: ['tentacle arms', (b) => { const s = b.right(b.arm); return wavy(s, add(s, 3, -0.4), 2, 0.55); }],
  wings: ['wings bat flying', (b) => {
    const s = b.right(b.arm + 1);
    const tip = add(s, 3.3, 2.3);
    return path(s, tip, add(tip, -0.2, -2.5), add(tip, -1.4, -1.7), add(tip, -1.7, -3.6), b.right(b.arm - 1.2));
  }],
  bent: ['arms elbows', (b) => { const s = b.right(b.arm); return path(s, add(s, 1.8, 0), add(s, 1.8, -1.9)); }],
};

const LEGS = {
  none: ['', () => ''],
  feet: ['legs feet', (b) => { const f = b.bottom(b.leg); return path(f, [f[0], b.floor], [f[0] + 1.6, b.floor]); }],
  stilts: ['four legs', (b) => {
    const [inner, outer] = b.pair.map((x) => b.bottom(x));
    return `${path(inner, [inner[0], b.floor])} ${path(outer, [outer[0] + 1.2, b.floor])}`;
  }],
  tentacles: ['tentacles octopus', (b) => b.pair.map((x) => b.bottom(x)).map((from, i) => wavy(from, [from[0] + 0.4 + 0.5 * i, b.floor], 2, 0.5)).join(' ')],
  round: ['legs round feet', (b) => {
    const f = b.bottom(b.leg);
    return `${path(f, [f[0], b.floor + 1])} ${path([f[0] - 1, b.floor], [f[0] + 1, b.floor])} ${bowTo([f[0] - 1, b.floor], -1)}`;
  }],
  springs: ['spring legs bouncy', (b) => {
    const [x, y] = b.bottom(b.leg);
    const step = (y - b.floor) / 3;
    return path([x, y], [x + 0.75, y - step], [x - 0.75, y - 2 * step], [x + 0.75, b.floor], [x + 1.9, b.floor]);
  }],
};

// The arms and legs that go together: thirteen ways.
const LIMBS = [
  ['none', 'feet'], ['down', 'feet'], ['wings', 'none'], ['up', 'stilts'], ['tentacles', 'tentacles'], ['claws', 'round'], ['none', 'none'],
  ['bent', 'feet'], ['none', 'tentacles'], ['up', 'feet'], ['wings', 'round'], ['claws', 'stilts'], ['down', 'springs'],
];
// For a body that floats or sits on the ground: arms only, five ways.
const ARMS_ONLY = [['none', 'none'], ['down', 'none'], ['up', 'none'], ['tentacles', 'none'], ['claws', 'none']];

// ---------------------------------------------------------------- bodies
//
// A body: its outline, the height of the eyes and of the mouth, how wide the
// face is, how wide the top of the head, the height the arms start at, how far
// from the middle the legs are (one pair, and two pairs), and how far down the
// feet stand. `hold`: the only points of the outline that anything is fastened
// to (the dips of a furry body, the tops of the bumps of a bumpy one).

function body(d, { eyes, mouth, wide, head, arm, leg, pair, floor, hold }) {
  const edge = outline(d);
  const nearest = (axis, v, side) => {
    let best = null;
    for (const p of hold) if (side(p) && (!best || Math.abs(p[axis] - v) < Math.abs(best[axis] - v))) best = p;
    return best;
  };
  const held = hold ? {
    top: (x) => nearest(0, x, (p) => p[1] > 0.1),
    bottom: (x) => nearest(0, x, (p) => p[1] < -0.1),
    right: (y) => nearest(1, y, (p) => p[0] > 0.1),
  } : {};
  return { ...edge, ...held, eyes, mouth, wide, head, arm, leg, pair, floor };
}


// fur: twelve tufts, the dips between them 30 degrees apart, one at the very top
const FUR = ringOf((a) => polar(0, 0, Math.round((a - 90) / 15) % 2 ? 5.5 : 4.5, a), 15);
// bumps: twelve of them, one at the very top
const BUMPS = `M${at(...polar(0, 0, 4.6, 75))} ${Array.from({ length: 12 }, (_, i) => `B${at(...polar(0, 0, 4.6, 105 + 30 * i))} 0.75`).join(' ')}`;
const BUMP_TOPS = ringOf((a) => polar(0, 0, 4.6 * Math.cos(Math.PI / 12) + 0.75 * 4.6 * Math.sin(Math.PI / 12), a), 30);
const PEAR = ringOf((a) => { const [x, y] = polar(0, 0, 1, a); return [(4.4 - 1.5 * y) * x, 5.4 * y]; });

const BODIES = {
  round: () => body(closed(...ringOf((a) => polar(0, 0, 5, a))), { eyes: 1.3, mouth: -1.9, wide: 3.3, head: 5, arm: -0.6, leg: 2, pair: [1.1, 3.3], floor: -7.4 }),
  tall: () => body(closed(...ringOf((a) => polar(0, 0, 4.2, a, 5.9))), { eyes: 2, mouth: -1.4, wide: 2.9, head: 3.9, arm: -0.4, leg: 1.6, pair: [0.8, 2.6], floor: -8.2 }),
  wide: () => body(closed(...ringOf((a) => polar(0, 0, 6.3, a, 4.2))), { eyes: 1.2, mouth: -2, wide: 3.8, head: 5.6, arm: -0.4, leg: 2.6, pair: [1.4, 4], floor: -6.6 }),
  square: () => body(roundedBox(0, 0, 4.7, 4.7, 1.3), { eyes: 1.4, mouth: -1.9, wide: 3.4, head: 4.4, arm: -0.6, leg: 2.2, pair: [1.1, 3], floor: -7.3 }),
  furry: () => body(closed(...FUR), { eyes: 1.2, mouth: -1.8, wide: 3, head: 5, arm: -0.6, leg: 2.25, pair: [2.25, 3.9], floor: -7.4, hold: FUR.filter((_, i) => i % 2 === 0) }),
  bumpy: () => body(BUMPS, { eyes: 1.3, mouth: -1.8, wide: 3.1, head: 5, arm: -0.6, leg: 2.55, pair: [2.55, 4.4], floor: -7.6, hold: BUMP_TOPS }),
  pear: () => body(closed(...PEAR), { eyes: 1.5, mouth: -1.8, wide: 2.8, head: 3.3, arm: -1.2, leg: 1.8, pair: [0.9, 3], floor: -8 }),
  rock: () => body(closed([-3.9, 4.8], [3.9, 4.8], [5.2, 1.5], [4.8, -2.4], [2.6, -4.9], [-2.6, -4.9], [-4.8, -2.4], [-5.2, 1.5]),
    { eyes: 1.5, mouth: -1.8, wide: 3.3, head: 4, arm: -0.4, leg: 1.5, pair: [0.8, 3.7], floor: -7.5 }),
  slime: () => body(`M-5.8,-4 C-6.1,-0.6 -4.6,5 0,5 C4.6,5 6.1,-0.6 5.8,-4 Z`, { eyes: 0.6, mouth: -2.3, wide: 3.5, head: 4.2, arm: -1.2, leg: 2, pair: [1, 3], floor: -4 }),
  ghost: () => body(`${path([4.4, -5], [4.4, 1])} ${bowTo([-4.4, 1], -1)} L${at(-4.4, -5)} L${[-2.93, -1.47, 0, 1.47, 2.93].map((x, i) => at(x, i % 2 ? -5 : -3.7)).join(' L')} Z`,
    { eyes: 1.8, mouth: -1.3, wide: 3.1, head: 4.2, arm: -0.6, leg: 2, pair: [1, 3], floor: -5 }),
};

// how far apart the particles of a monster are at first (in the -1..1 box)
const SPACING = 0.1;

// [id, name, heading, search words, how many, things on the head, limbs, which variants number 1 has]
const KINDS = [
  ['round', 'Round monster', 'Round monsters', 'ball blob', 180, TOPS, LIMBS, [0, 0, 0, 0]],
  ['tall', 'Tall monster', 'Tall monsters', 'egg long', 180, TOPS, LIMBS, [3, 5, 2, 7]],
  ['wide', 'Wide monster', 'Wide monsters', 'fat broad', 180, TOPS, LIMBS, [6, 2, 5, 3]],
  ['square', 'Square monster', 'Square monsters', 'box block cube', 180, TOPS, LIMBS, [9, 7, 7, 10]],
  ['furry', 'Furry monster', 'Furry monsters', 'fuzzy fluffy hairy spiky', 180, TOPS_SIMPLE, LIMBS, [1, 4, 3, 5]],
  ['bumpy', 'Bumpy monster', 'Bumpy monsters', 'cloud lumpy', 180, TOPS_SIMPLE, LIMBS, [7, 1, 1, 12]],
  ['pear', 'Pear monster', 'Pear monsters', 'chubby', 180, TOPS, LIMBS, [4, 6, 4, 1]],
  ['rock', 'Rock monster', 'Rock monsters', 'stone golem boulder', 180, TOPS, LIMBS, [10, 3, 8, 8]],
  ['slime', 'Slime', 'Slimes', 'blob goo jelly', 200, TOPS, ARMS_ONLY, [2, 0, 6, 0]],
  ['ghost', 'Ghost', 'Ghosts', 'spooky halloween spirit boo', 200, TOPS, ARMS_ONLY, [5, 5, 0, 2]],
];

function monsters([kind, name, sub, more, count, tops, limbsOf, first]) {
  let made = null;
  const theBody = () => (made ||= BODIES[kind]());
  return family({
    cat: 'monsters', count, first, spacing: SPACING, sizes: [EYES.length, MOUTHS.length, tops.length, limbsOf.length],
    make: ([eye, mouth, top, limbs], k) => {
      const [arms, legs] = limbsOf[limbs];
      return {
        id: `${name.toLowerCase().replace(/ /g, '-')}-${k}`, name: `${name} ${k}`, sub,
        tags: ['monster creature beast critter cute scary', more, EYES[eye][0], MOUTHS[mouth][0], tops[top][0], ARMS[arms][0], LEGS[legs][0]].filter(Boolean).join(' '),
        draw: () => {
          const b = theBody();
          const [eyeSides, eyeMiddle] = EYES[eye][1](b.eyes, b.wide);
          const [topSides, topMiddle] = tops[top][1](b);
          return mirrored([eyeSides, topSides, ARMS[arms][1](b), LEGS[legs][1](b)], [b.d, eyeMiddle, MOUTHS[mouth][1](b.mouth), topMiddle]);
        },
      };
    },
  });
}

export const MONSTER_SHAPES = KINDS.flatMap(monsters);
export const MONSTER_HEADINGS = KINDS.map((kind) => kind[2]);
