// The Space tab: rockets, flying saucers, starships, planets and aliens, each
// kind put together from a few parts (see shape-mix.js for how the parts are
// dealt out). One unit of a drawing is roughly the gap between two particles.

import {
  family, edgeOf as edge, mirrored, joined, placed, at, path, closed, circle, oval, dot, box, bow, bowTo, wavy, add, mid, polar, ball,
  star, sparkle, roundedBox, left,
} from './shape-mix.js';

const words = (...parts) => parts.filter(Boolean).join(' ');

// ---------------------------------------------------------------- rockets
//
// The hull stands from -4 up to its nose. Fins start at the heights -0.4, -1.2 or -2.4, or at the lower corner;
// stripes are painted at 2.4 and -3.2: so no two of them start on the same spot.
// [search words, outline, half the width at the bottom]

const ROCKETS = [
  ['classic', 'M-2.2,-4 L-2.2,4 L0,8.4 L2.2,4 L2.2,-4 Z', 2.2],
  ['fat capsule', `M-3,-4 L-3,3 ${bowTo([3, 3], 1)} L3,-4 Z`, 3],
  ['slim needle', 'M-1.6,-4 L-1.6,4.5 L0,9 L1.6,4.5 L1.6,-4 Z M0,9 L0,10.6', 1.6],
  ['bullet', 'M-2.4,-4 L-2.4,2 Q-2.4,6.4 0,8.6 Q2.4,6.4 2.4,2 L2.4,-4 Z', 2.4],
  ['wide base', 'M-3,-4 L-1.9,4.6 L0,8 L1.9,4.6 L3,-4 Z', 3],
  ['two stages', 'M-2.8,-4 L-2.8,0.4 L-1.8,1.4 L-1.8,5 L0,8.2 L1.8,5 L1.8,1.4 L2.8,0.4 L2.8,-4 Z', 2.8],
  ['shuttle blunt', 'M-2.4,-4 L-2.4,4.4 L-1.2,7 L1.2,7 L2.4,4.4 L2.4,-4 Z', 2.4],
];

// (outline, half the width at the bottom) => [what is drawn on the right and mirrored, what stands in the middle]
const FINS = [
  ['', () => [[], []]],
  ['fins', (h, w) => [[path(h.right(-1.2), [w + 2.4, -5], [w, -4])], []]],
  ['swept fins', (h, w) => [[path(h.right(-0.4), [w + 2.2, -3.2], [w + 2.2, -5.4], [w, -4])], []]],
  ['round fins', (h, w) => [[bow(h.right(-0.4), [w, -4], 0.9)], []]],
  ['boosters', (h, w) => [[path(h.right(-1.2), [w + 1.1, -1.2]), roundedBox(w + 2, -1.8, 0.9, 2.2, 0.9)], []]],
  ['delta wings', (h, w) => [[path(h.right(-0.4), [w + 3.6, -3.6], h.right(-2.4))], []]],
  ['landing legs', (h, w) => [[path(h.right(-2.4), [w + 2.2, -6.4]), path([w + 1.3, -6.4], [w + 3.1, -6.4])], []]],
  ['three fins', (h, w) => [[path(h.right(-2.4), [w + 1.7, -4.8], [w, -4])], [path([0, -2.2], [0, -4])]]],
  ['big fins', (h, w) => [[path(h.right(-1.2), [w + 1.6, -1.8], [w + 2.6, -5.6], [w, -4])], []]],
];

const WINDOWS = [
  ['', () => ''],
  ['window porthole', () => circle(0, 2.2, 0.8)],
  ['two windows', () => `${circle(0, 2.8, 0.75)} ${circle(0, 0.6, 0.75)}`],
  ['lights', () => `${dot(0, 3)} ${dot(0, 1.5)} ${dot(0, 0)}`],
  ['stripes', (h) => [2.4, -3.2].map((y) => path(left(h.right(y)), h.right(y))).join(' ')],
  ['window stripe', (h) => `${circle(0, 2.2, 0.8)} ${path(left(h.right(-3.2)), h.right(-3.2))}`],
  ['hatch door', () => box(-0.8, -0.2, 0.8, 2.2)],
  ['arrows', () => `${path([-0.8, 1.2], [0, 2.2], [0.8, 1.2])} ${path([-0.8, 0], [0, 1], [0.8, 0])}`],
];

const FLAMES = [
  ['', ''],
  ['flame fire', 'M-0.9,-4 Q-1.3,-6 0,-8 Q1.3,-6 0.9,-4'],
  ['big flame fire launch', 'M-0.9,-4 Q-1.5,-6.4 0,-8.8 Q1.5,-6.4 0.9,-4 M0,-4.9 L0,-6.6'],
  ['engine nozzle', `${path([-0.9, -4], [-1.4, -5.2], [1.4, -5.2], [0.9, -4])} ${path([0, -6.1], [0, -8])} ${path([-1, -6.1], [-1.6, -7.6])} ${path([1, -6.1], [1.6, -7.6])}`],
  ['smoke puffs', `${circle(0, -5.5, 1)} ${circle(-1.5, -7.8, 0.85)} ${circle(1.3, -9.2, 0.7)}`],
];

const rockets = family({
  cat: 'space', count: 280, spacing: 0.1, sizes: [ROCKETS.length, FINS.length, WINDOWS.length, FLAMES.length], first: [0, 1, 1, 1],
  make: ([hull, fin, win, flame], k) => ({
    id: `rocket-${k}`, name: `Rocket ${k}`, sub: 'Rockets',
    tags: words('spaceship launch fly missile', ROCKETS[hull][0], FINS[fin][0], WINDOWS[win][0], FLAMES[flame][0]),
    draw: () => {
      const h = edge(ROCKETS[hull][1]);
      const [sides, middle] = FINS[fin][1](h, ROCKETS[hull][2]);
      return mirrored([sides], [h.d, middle, WINDOWS[win][1](h), FLAMES[flame][1]]);
    },
  }),
});

// ---------------------------------------------------------------- flying saucers
//
// Seen from the side. [search words, outline, the height where a row of lights fits, the height of its tips]

const SAUCERS = [
  ['lens', `M-6,0 ${bowTo([6, 0], 0.3)} ${bowTo([-6, 0], 0.3)}`, 0, 0],
  ['flat disc', oval(0, 0, 6, 1.3, 0), 0, 0],
  ['angular', closed([-6, -0.6], [-2.2, 1.4], [2.2, 1.4], [6, -0.6], [3, -1.8], [-3, -1.8]), -0.3, -0.6],
  ['bowl', `M-6,0.6 L6,0.6 ${bowTo([-6, 0.6], 0.5)}`, -0.6, 0.6],
  ['diamond', closed([-6, 0], [0, 1.8], [6, 0], [0, -1.8]), 0, 0],
  ['rimmed', `M-6,0 ${bowTo([6, 0], 0.3)} ${bowTo([-6, 0], 0.3)} L6,0`, -0.9, 0],
  ['classic', 'M-6,-0.4 Q-3,0.2 -2.4,1.6 L2.4,1.6 Q3,0.2 6,-0.4 Q0,-3 -6,-0.4', -0.7, -0.4],
];

// (left foot, right foot) => [the dome, how high it is]
const DOMES = [
  ['', (a, b) => [bow(a, b, 1), 2.4]],
  ['tall dome', (a, b) => [bow(a, b, 1.4), 3.36]],
  ['low dome', (a, b) => [bow(a, b, 0.55), 1.32]],
  ['pointed dome', (a, b) => [path(a, [0, a[1] + 3.2], b), 3.2]],
  ['cabin', (a, b) => [path(a, add(a, 0.3, 2.2), add(b, -0.3, 2.2), b), 2.2]],
];

// (outline, height of the lights, top of the dome, height of the tips) => what is drawn
const LIGHTS = [
  ['', () => ''],
  ['lights', (h, y) => `${dot(0, y)} ${dot(3, y)} ${dot(-3, y)}`],
  ['many lights', (h, y) => [-4, -2, 0, 2, 4].map((x) => dot(x, y)).join(' ')],
  ['stripe', (h, y) => path([-3.4, y], [3.4, y])],
  ['engine', (h) => bow(h.bottom(-1.4), h.bottom(1.4), -0.7)],
  ['antenna', (h, y, top) => ball([0, top], [0, top + 1.5], 0.6)],
  ['lights antenna', (h, y, top) => `${dot(0, y)} ${dot(3, y)} ${dot(-3, y)} ${ball([0, top], [0, top + 1.5], 0.6)}`],
  ['wing tips', (h, y, top, tip) => `${path([6, tip - 0.9], [6, tip + 0.9])} ${path([-6, tip - 0.9], [-6, tip + 0.9])}`],
];

// (outline, its lowest point in the middle) => [what is drawn on the right and mirrored, what stands in the middle]
const BEAMS = [
  ['', () => [[], []]],
  ['beam', (h) => [[path(h.bottom(1.4), [3.6, -8])], []]],
  ['beam rings', (h) => {
    const [a, b] = [0.42, 0.78].map((t) => mid(h.bottom(1.4), [3.6, -8], t));
    return [[path(h.bottom(1.4), [3.6, -8])], [path(left(a), a), path(left(b), b)]];
  }],
  ['landing legs', (h) => [[path(h.bottom(3.6), add(h.bottom(3.6), 1.2, -3.2)), path(add(h.bottom(3.6), 0.3, -3.2), add(h.bottom(3.6), 2.1, -3.2))], []]],
  ['beam star abduct', (h) => [[path(h.bottom(1.4), [3.6, -8])], [star(0, -5.8, 5, 1.2, 0.5)]]],
  ['hovering', (h, y) => [[], [bow([-2.6, y - 2.1], [2.6, y - 2.1], -0.2), bow([-1.8, y - 3.3], [1.8, y - 3.3], -0.2), bow([-1, y - 4.5], [1, y - 4.5], -0.2)]]],
  ['lightning zap', (h, y) => [[], [path([0.6, y - 1.9], [-0.7, y - 4], [0.5, y - 4], [-0.6, y - 7])]]],
  ['spotlight', (h) => [[path(h.bottom(1.4), [4.6, -7.6])], [path([-4.6, -7.6], [4.6, -7.6])]]],
  ['sparkle rain', (h, y) => [[dot(1.2, y - 3.4), dot(1.2, y - 6.4)], [dot(0, y - 1.9), dot(0, y - 4.9)]]],
];

const saucers = family({
  cat: 'space', count: 280, spacing: 0.1, sizes: [SAUCERS.length, DOMES.length, LIGHTS.length, BEAMS.length], first: [0, 0, 1, 1],
  make: ([saucer, dome, light, beam], k) => ({
    id: `flying-saucer-${k}`, name: `Flying saucer ${k}`, sub: 'Flying saucers',
    tags: words('ufo alien spaceship disc', SAUCERS[saucer][0], DOMES[dome][0], LIGHTS[light][0], BEAMS[beam][0]),
    draw: () => {
      const [, line, lights, tip] = SAUCERS[saucer];
      const h = edge(line);
      const [top, high] = DOMES[dome][1](h.top(-2.4), h.top(2.4));
      const [sides, middle] = BEAMS[beam][1](h, h.bottom(0)[1]);
      return mirrored([sides], [h.d, top, LIGHTS[light][1](h, lights, h.top(2.4)[1] + high, tip), middle]);
    },
  }),
});

// ---------------------------------------------------------------- starships
//
// Seen from above, the nose up: the hull from -5 to about 7, the pilot around the height -0.3.

const HULLS = [
  ['arrow', closed([0, 7], [1.6, 1], [1.6, -5], [-1.6, -5], [-1.6, 1])],
  ['needle', closed([0, 8], [1.4, 2], [1.6, -5], [-1.6, -5], [-1.4, 2])],
  ['capsule', `M-1.8,-5 L-1.8,3.6 ${bowTo([1.8, 3.6], 1)} L1.8,-5 Z`],
  ['wedge', closed([0, 7], [2.6, -5], [-2.6, -5])],
  ['twin prong', closed([-1.8, -5], [-1.8, 7], [-0.8, 7], [-0.8, 2.4], [0.8, 2.4], [0.8, 7], [1.8, 7], [1.8, -5])],
  ['hexagon', closed([0, 7], [1.9, 4], [1.9, -3.4], [0.9, -5], [-0.9, -5], [-1.9, -3.4], [-1.9, 4])],
  ['disc', `${oval(0, 3.6, 2.4, 2.4, 270)} ${path([-1.6, 1.811], [-1.6, -5], [1.6, -5], [1.6, 1.811])}`],
];

// (hull) => what is drawn on the right and mirrored
const WINGS = [
  ['delta wings', (h) => [path(h.right(2.6), [6, -4.2], h.right(-4))]],
  ['swept wings', (h) => [path(h.right(1.2), [5.4, -4.6], [5.4, -6.2], h.right(-2.6))]],
  ['forward wings', (h) => [path(h.right(-1), [5.4, 3], [5.4, 1.4], h.right(-4.2))]],
  ['stub wings', (h) => [path(h.right(0.4), [5, 0.4], [5, -2], h.right(-2))]],
  ['four wings cannons', (h) => [path(h.right(0.8), [5.8, 3.2]), path(h.right(-2.4), [5.8, -5]), path([5.8, 3.2], [5.8, 5]), path([5.8, -5], [5.8, -3.4])]],
  ['curved wings', (h) => [`M${at(...h.right(2.4))} Q${at(6.6, 1.6)} ${at(5.4, -5.8)} L${at(...h.right(-2.4))}`]],
  ['canards', (h) => [path(h.right(3.4), add(h.right(2.4), 2, -0.6), h.right(2.4)), path(h.right(-1.4), [5, -4.8], h.right(-4.2))]],
  ['engine pods', (h) => [path(h.right(-1.6), [4.4, -1.6]), roundedBox(5.3, -1.6, 0.9, 2.2, 0.9)]],
  ['double delta', (h) => [path(h.right(3), [3.6, -0.6], [6.2, -4.6], h.right(-4.4))]],
];

const THRUST = [
  ['', ''],
  ['flame', path([-0.8, -5.9], [0, -8], [0.8, -5.9])],
  ['twin flames', mirrored([path([0.4, -5.9], [1, -7.6], [1.6, -5.9])], [])],
  ['exhaust', `${path([0, -5.9], [0, -8.2])} ${path([0.9, -5.9], [0.9, -7.4])} ${path([-0.9, -5.9], [-0.9, -7.4])}`],
  ['thruster ring', oval(0, -6.6, 1.3, 0.7)],
];

const PILOTS = [
  ['', oval(0, -0.2, 0.75, 1.2)],
  ['', circle(0, -0.3, 0.8)],
  ['', closed([0, 0.9], [0.8, -1.2], [-0.8, -1.2])],
  ['', path([0, 1], [0, -3.4])],
  ['', dot(0, -0.3)],
  ['', `${dot(0, 0.6)} ${dot(0, -1.2)}`],
  ['', closed([0, 1], [0.75, -0.2], [0, -1.4], [-0.75, -0.2])],
  ['', `${path([-0.8, -0.3], [0.8, -0.3])} ${path([0, 0.7], [0, -1.3])}`],
];

const starships = family({
  cat: 'space', count: 280, spacing: 0.1, sizes: [HULLS.length, WINGS.length, THRUST.length, PILOTS.length], first: [0, 0, 1, 0],
  make: ([hull, wing, thrust, pilot], k) => ({
    id: `starship-${k}`, name: `Starship ${k}`, sub: 'Starships',
    tags: words('spaceship fighter jet ship', HULLS[hull][0], WINGS[wing][0], THRUST[thrust][0]),
    draw: () => {
      const h = edge(HULLS[hull][1]);
      return joined(mirrored([WINGS[wing][1](h)], [h.d, PILOTS[pilot][1]]), THRUST[thrust][1]);
    },
  }),
});

// ---------------------------------------------------------------- planets
//
// A ball of radius 4, what is on it (within 3.1 of the middle), its ring (behind it: only what sticks out is drawn),
// what is near it, and how far the whole picture leans.

const SURFACES = [
  ['', ''],
  ['craters moon', `${circle(-1.3, 1.2, 0.9)} ${circle(1.4, -0.6, 0.7)} ${circle(-0.6, -1.9, 0.6)}`],
  ['bands gas giant', `${bow([-3.67, 1.6], [3.67, 1.6], -0.12)} ${bow([-4, 0], [4, 0], -0.12)} ${bow([-3.67, -1.6], [3.67, -1.6], -0.12)}`],
  ['continents earth world', `${closed([-2.4, 0.6], [-1.2, 2.2], [0.2, 1.6], [-0.4, 0.2], [-1.6, -0.4])} ${closed([0.8, -0.6], [2.2, -0.2], [2.4, -1.6], [1.2, -2.4], [0.2, -1.6])}`],
  ['storm swirl', `M-0.4,0 ${bowTo([0.8, 0], 1)} ${bowTo([-1.4, 0], 1)} ${bowTo([2.2, 0], 1)}`],
  ['spots', `${dot(-1.8, 1.4)} ${dot(0.4, 2.2)} ${dot(1.9, 0.6)} ${dot(-0.6, -0.2)} ${dot(1.1, -1.6)} ${dot(-1.7, -1.9)}`],
  ['cracked lava', `${path([-2.6, 1.8], [-1, 0.6], [-1.8, -0.6], [0, -1], [0.6, -2.6])} ${path([-1, 0.6], [0.6, 1.4], [1.6, 0.2])}`],
  ['ice caps', `${wavy([-3.2, 2.4], [3.2, 2.4], 4, 0.25)} ${wavy([-3.04, -2.6], [3.04, -2.6], 4, 0.25)}`],
  ['globe grid', `${path([-4, 0], [4, 0])} ${bow([0, 4], [0, -4], 0.45)} ${bow([0, 4], [0, -4], -0.45)}`],
];

// The two ends of an oval ring that stick out from behind the ball: `to` is the angle where the oval meets the ball.
const ears = (rx, ry, to) => `N E0,0 ${rx} ${ry} ${-to} ${to} N E0,0 ${rx} ${ry} ${180 - to} ${180 + to}`;
const RINGS = [
  ['', ''],
  ['ring saturn', ears(6.4, 1.5, 53.4)],
  ['double ring saturn', `${ears(6.4, 1.5, 53.4)} ${ears(7.6, 2.3, 63.14)}`],
  ['wide ring saturn', ears(7.4, 0.9, 57.95)],
  // a ring over the poles: its ends meet the ball at 27.89 degrees
  ['polar ring uranus upright', 'N E0,0 2.6 7 27.89 152.11 N E0,0 2.6 7 207.89 332.11'],
];

const NEAR = [
  ['', ''],
  ['moon', circle(5.2, 4.6, 1)],
  ['two moons', `${circle(5.2, 4.6, 1)} ${circle(-5.4, -4.4, 0.7)}`],
  ['stars', `${sparkle(5.4, 4.8, 0.9)} ${sparkle(-5.2, 4.4, 0.75)} ${sparkle(-4.8, -4.8, 0.75)}`],
  ['comet', `${circle(-4.6, 4.4, 0.6)} ${path(polar(-4.6, 4.4, 1.2, 165), polar(-4.6, 4.4, 3, 165))} ${path(polar(-4.6, 4.4, 1.2, 105), polar(-4.6, 4.4, 3, 105))}`],
  ['satellite', `${box(4.6, 4.2, 5.6, 5.2)} ${path([3.4, 4.7], [4.6, 4.7])} ${path([5.6, 4.7], [6.8, 4.7])}`],
  ['rocket', `${closed([5.2, 5.8], [6, 4], [4.4, 4])} ${path([5.2, 4], [5.2, 3])}`],
  ['asteroids', `${dot(5, 4.4)} ${dot(6, 5.2)} ${dot(5.6, 3.4)} ${dot(-5.2, -4.2)} ${dot(-6, -3.4)}`],
];

const LEAN = [0, 20, -20, 35, -35, 10, -10];

const planets = family({
  cat: 'space', count: 280, spacing: 0.1, sizes: [SURFACES.length, RINGS.length, NEAR.length, LEAN.length], first: [0, 1, 0, 0],
  make: ([surface, ring, near, lean], k) => ({
    id: `planet-${k}`, name: `Planet ${k}`, sub: 'Planets',
    tags: words('world globe space orbit', SURFACES[surface][0], RINGS[ring][0], NEAR[near][0]),
    draw: () => placed(joined(circle(0, 0, 4), SURFACES[surface][1], RINGS[ring][1], NEAR[near][1]), { turn: LEAN[lean] }),
  }),
});

// ---------------------------------------------------------------- aliens
//
// [search words, outline of the head, height of the eyes, height of the mouth, how far from the middle the face reaches]

const ALIEN_HEADS = [
  ['grey', 'M0,-0.4 C-2.2,-0.4 -4.4,2.6 -4.4,4.6 C-4.4,7.4 -2,8.4 0,8.4 C2,8.4 4.4,7.4 4.4,4.6 C4.4,2.6 2.2,-0.4 0,-0.4 Z', 3.8, 1.1, 3],
  ['round head', oval(0, 4, 4.2, 4.2, 270), 4.4, 1.8, 3],
  ['wide head', oval(0, 4, 5.4, 3.6, 270), 4.4, 2, 3.8],
  ['egg head', oval(0, 4.2, 3.4, 4.6, 270), 4.8, 1.7, 2.4],
  ['brain head', 'M0,-0.2 C-1.8,-0.2 -4.6,2.4 -4.6,5 C-4.6,7.2 -2.6,8.6 -0.9,8 L0,7.2 L0.9,8 C2.6,8.6 4.6,7.2 4.6,5 C4.6,2.4 1.8,-0.2 0,-0.2 Z', 4.2, 1.5, 3.2],
  ['triangle head', 'M0,-0.4 L-4.6,6.2 Q-4.6,8 -2.8,8 L2.8,8 Q4.6,8 4.6,6.2 Z', 4.9, 2.4, 3.2],
  ['squid', `M-4.2,2.4 L-4.2,4.6 ${bowTo([4.2, 4.6], 1)} L4.2,2.4 L2.8,1 L1.4,2.4 L0,1 L-1.4,2.4 L-2.8,1 Z`, 5.4, 3.5, 3],
];

// (height of the eyes, height of the mouth, how wide the face is) => [what is drawn on the right and mirrored, what stands in the middle]
const ALIEN_FACES = [
  ['almond eyes', (e, m, w) => [[`${bow([0.6, e - 0.6], [0.85 * w, e + 0.6], 0.45)} ${bowTo([0.6, e - 0.6], 0.45)}`], [path([-0.6, m], [0.6, m])]]],
  ['big round eyes', (e, m, w) => [[circle(0.55 * w, e, 1.15), dot(0.55 * w, e)], [circle(0, m, 0.5)]]],
  ['one eye cyclops', (e, m) => [[], [circle(0, e, 1.6), circle(0, e, 0.6), bow([-0.9, m + 0.2], [0.9, m + 0.2], -0.5)]]],
  ['three eyes', (e, m, w) => [[circle(0.6 * w, e - 0.2, 0.8), dot(0.6 * w, e - 0.2)], [dot(0, e + 0.9), path([-0.6, m], [0.6, m])]]],
  ['slit eyes', (e, m, w) => [[path([0.5, e - 0.5], [0.8 * w, e + 0.5])], [path([-1, m + 0.3], [-0.5, m - 0.3], [0, m + 0.3], [0.5, m - 0.3], [1, m + 0.3])]]],
  ['tall eyes', (e, m, w) => [[oval(0.5 * w, e, 0.75, 1.3), dot(0.5 * w, e + 0.3)], [dot(0, m)]]],
  ['happy eyes', (e, m, w) => [[bow([0.25 * w, e - 0.2], [0.8 * w, e - 0.2], 0.7)], [bow([-1.2, m + 0.4], [1.2, m + 0.4], -0.55)]]],
  ['dot eyes smile', (e, m, w) => [[dot(0.45 * w, e)], [bow([-1.2, m + 0.3], [1.2, m + 0.3], -0.5)]]],
  ['dizzy eyes', (e, m, w) => [[sparkle(0.5 * w, e, 0.8)], [wavy([-1, m], [1, m], 2, 0.25)]]],
];

// (head, height of the eyes) => [what is drawn on the right and mirrored, what stands in the middle]
const ALIEN_TOPS = [
  ['', () => [[], []]],
  ['antennae', (h) => [[ball(h.top(1.4), add(h.top(1.4), 0.9, 2.2), 0.7)], []]],
  ['antenna', (h) => [[], [ball(h.top(0), add(h.top(0), 0, 2.4), 0.8)]]],
  ['feelers', (h) => [[path(h.top(1.6), add(h.top(1.6), 0.4, 1.6), add(h.top(1.6), 1.8, 2.2))], []]],
  ['ears', (h, e) => [[path(h.right(e + 0.6), [h.right(e)[0] + 2, e + 0.4], h.right(e - 0.8))], []]],
];

// (height of the chin) => [what is drawn on the right and mirrored, what stands in the middle]
const ALIEN_BODIES = [
  ['thin body', (y) => [
    [path([1.6, y - 0.8], [3.4, y - 3.2]), path([1, y - 4.6], [1.4, y - 7.4], [2.6, y - 7.4])],
    [path([0, y], [0, y - 0.8]), closed([-1.6, y - 0.8], [1.6, y - 0.8], [1, y - 4.6], [-1, y - 4.6])],
  ]],
  ['in a saucer ufo', (y) => [
    [dot(2.6, y - 2.4)],
    [path([0, y], [0, y - 0.82]), `${bow([-6, y - 1.9], [6, y - 1.9], 0.18)} ${bowTo([-6, y - 1.9], 0.35)}`, dot(0, y - 2.6)],
  ]],
  ['tentacles octopus', (y) => [
    [wavy([1.6, y - 0.9], [2.6, y - 5.6], 3, 0.4)],
    [path([0, y], [0, y - 0.9]), path([-1.6, y - 0.9], [1.6, y - 0.9]), wavy([0, y - 0.9], [0, y - 5.8], 3, 0.4)],
  ]],
  ['robe cloak', (y) => [
    [path([0.9, y - 2.6], [3.2, y - 3.2])],
    [path([0, y], [0, y - 0.8]), closed([0, y - 0.8], [2.8, y - 6.4], [-2.8, y - 6.4])],
  ]],
  ['small body', (y) => [
    [path([0.8, y - 4.3], [0.8, y - 5.2], [2.6, y - 5.2]), path([1.7, y - 1.9], [3.2, y - 2.9])],
    [path([0, y], [0, y - 0.7]), roundedBox(0, y - 2.5, 1.7, 1.8, 0.8)],
  ]],
  ['floating', (y) => [
    [],
    [path([0, y], [0, y - 0.9]), closed([-1.8, y - 0.9], [1.8, y - 0.9], [0, y - 3.4]), bow([-1.6, y - 4.6], [1.6, y - 4.6], -0.25), bow([-0.9, y - 5.8], [0.9, y - 5.8], -0.25)],
  ]],
  ['three legs', (y) => [
    [path([1.6, y - 4.476], [2.2, y - 6.8])],
    [path([0, y], [0, y - 0.9]), oval(0, y - 2.9, 2.6, 2, 90), path([0, y - 4.9], [0, y - 6.8])],
  ]],
  ['long arms', (y) => [
    [path([1.5, y - 1.4], [3, y - 2], [3, y - 5]), path([0.7, y - 4.4], [0.7, y - 7], [1.9, y - 7])],
    [path([0, y], [0, y - 0.8]), box(-1.5, y - 4.4, 1.5, y - 0.8)],
  ]],
];

const aliens = family({
  cat: 'space', count: 280, spacing: 0.1, sizes: [ALIEN_HEADS.length, ALIEN_FACES.length, ALIEN_TOPS.length, ALIEN_BODIES.length], first: [0, 0, 1, 0],
  make: ([head, face, top, body], k) => ({
    id: `alien-${k}`, name: `Alien ${k}`, sub: 'Aliens',
    tags: words('space creature et visitor', ALIEN_HEADS[head][0], ALIEN_FACES[face][0], ALIEN_TOPS[top][0], ALIEN_BODIES[body][0]),
    draw: () => {
      const [, line, eyes, mouth, wide] = ALIEN_HEADS[head];
      const h = edge(line);
      const parts = [ALIEN_FACES[face][1](eyes, mouth, wide), ALIEN_TOPS[top][1](h, eyes), ALIEN_BODIES[body][1](h.bottom(0)[1])];
      return mirrored(parts.map((part) => part[0]), [h.d, ...parts.map((part) => part[1])]);
    },
  }),
});

export const COSMOS_SHAPES = [...rockets, ...saucers, ...starships, ...planets, ...aliens];
export const COSMOS_HEADINGS = ['Rockets', 'Flying saucers', 'Starships', 'Planets', 'Aliens'];
