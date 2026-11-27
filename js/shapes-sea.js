// The Sea tab: fish, jellyfish and boats, each kind put together from a few
// parts (see shape-mix.js for how the parts are dealt out). One unit of a
// drawing is roughly the gap between two particles.

import {
  family, edgeOf as edge, joined, path, closed, circle, oval, dot, box, bow, bowTo, bend, wavy, zigzag, add, polar, star, sparkle, roundedBox,
} from './shape-mix.js';

const words = (...parts) => parts.filter(Boolean).join(' ');
const bird = (x, y) => path([x - 1.1, y + 0.6], [x, y], [x + 1.1, y + 0.6]);
const cloud = (x, y) => `${bow([x - 2.2, y], [x - 0.7, y + 0.9], 0.8)} ${bowTo([x + 0.7, y + 0.9], 0.8)} ${bowTo([x + 2.2, y], 0.8)} Z`;
/** A leaf from one end to the other. */
const leaf = (from, to, round) => `${bow(from, to, round)} ${bowTo(from, round)}`;
/** A little fish that swims to the right; its tail starts at (x, y). */
const smallFish = (x, y) => `${leaf([x, y], [x + 3, y], 0.45)} ${closed([x, y], [x - 1.2, y + 0.9], [x - 1.2, y - 0.9])}`;

// ---------------------------------------------------------------- fish
//
// A fish swims to the right. [search words, outline, where the tail starts (on y = 0), the eye, half its height]

const FISH_BODIES = [
  ['oval', oval(0, 0, 5, 3, 180), -5, [2.8, 0.9], 3],
  ['long eel', oval(0, 0, 6, 2, 180), -6, [3.6, 0.5], 2],
  ['round puffer', oval(0, 0, 4, 3.8, 180), -4, [2, 1.2], 3.8],
  ['pointed', leaf([-5.5, 0], [5.5, 0], 0.5), -5.5, [2.6, 0.7], 2.75],
  ['teardrop', 'M-5.5,0 Q-1,4.2 3,2.6 Q5.6,1.4 5.6,0 Q5.6,-1.4 3,-2.6 Q-1,-4.2 -5.5,0', -5.5, [3.2, 0.8], 3],
  ['boxfish square', roundedBox(0, 0, 4.2, 3, 1.6), -4.2, [2.2, 1.1], 3],
  ['shark torpedo', 'M-6.5,0 Q2,4.6 6.5,0.2 Q2,-3 -6.5,0', -6.5, [3.6, 0.7], 1.5],
];

// (where the tail starts) => the tail
const FISH_TAILS = [
  ['forked tail', (j) => closed([j, 0], [j - 3.2, 2.5], [j - 2.7, 0], [j - 3.2, -2.5])],
  ['fan tail', (j) => closed([j, 0], [j - 3, 2.4], [j - 3, -2.4])],
  ['round tail', (j) => `${path([j, 0], [j - 2.6, 2.2])} ${bowTo([j - 2.6, -2.2], -0.5)} Z`],
  ['diamond tail', (j) => closed([j, 0], [j - 1.6, 1.5], [j - 3.6, 0], [j - 1.6, -1.5])],
  ['ray tail', (j) => `${path([j, 0], [j - 3.2, 0])} ${path([j, 0], [j - 2.8, 2.2])} ${path([j, 0], [j - 2.8, -2.2])}`],
];

// (the outline) => the fins: they start and end on the outline
const dorsal = (b) => path(b.top(-2), add(b.top(-1.6), 0, 2.4), b.top(0.8));
const shark = (b) => path(b.top(-1.2), add(b.top(-2), 0, 3.2), b.top(1.6));
const belly = (b) => `${path(b.bottom(-2.6), add(b.bottom(-2.6), -0.4, -1.9), b.bottom(-1))} ${path(b.bottom(0.6), add(b.bottom(0.6), -0.4, -1.9), b.bottom(2.2))}`;
const FISH_FINS = [
  ['back fin', dorsal],
  ['sail fin', (b) => path(b.top(-3), add(b.top(-2.6), 0, 2), add(b.top(1.4), 0, 1.5), b.top(2))],
  ['spines', (b) => [-2.2, -0.6, 1].map((x) => path(b.top(x), add(b.top(x), -0.6, 1.9))).join(' ')],
  ['round fin', (b) => bow(b.top(-2.2), b.top(1.2), 0.6)],
  ['back fin belly fins', (b) => `${dorsal(b)} ${belly(b)}`],
  ['belly fins', belly],
  ['shark fin', shark],
  ['shark fin belly fins', (b) => `${shark(b)} ${belly(b)}`],
];

// (the outline, the eye, half the height, where the tail starts) => the eye and what is drawn on the fish
const FISH_MARKS = [
  ['', (b, e) => dot(...e)],
  ['bubbles', (b, e) => {
    const [nose] = b.right(0);
    return `${dot(...e)} ${circle(nose + 1.5, 1.3, 0.5)} ${circle(nose + 2.5, 2.9, 0.7)}`;
  }],
  ['gill', (b, e, r) => `${dot(...e)} ${bow([e[0] - 1.6, 0.42 * r], [e[0] - 1.6, -0.42 * r], -0.3)}`],
  ['stripes clownfish', (b, e, r, j) => `${dot(...e)} ${[0.05, 0.36].map((f) => path(add(b.bottom(f * j), 0, 0.75), add(b.top(f * j), 0, -0.75))).join(' ')}`],
  ['spots', (b, e, r, j) => `${dot(...e)} ${dot(0.1 * j, 0.3 * r)} ${dot(0.4 * j, -0.25 * r)} ${dot(0.62 * j, 0.12 * r)}`],
  ['scales', (b, e, r, j) => `${dot(...e)} ${[0.1, 0.45].map((f) => bow([f * j, 0.4 * r], [f * j, -0.4 * r], -0.35)).join(' ')}`],
  ['mouth', (b, e, r) => {
    const from = b.right(-0.25 * r);
    return `${dot(...e)} ${path(from, add(from, -1.5, 0.28))}`;
  }],
  ['side line', (b, e, r, j) => `${dot(...e)} ${path([0.72 * j, 0], [e[0] - 1.8, 0])}`],
  ['big eye', (b, e, r) => {
    const size = Math.min(0.9, 0.36 * r - 0.2);
    return `${circle(e[0], e[1], size)}${size >= 0.8 ? ` ${dot(...e)}` : ''}`;
  }],
];

const fish = family({
  cat: 'sea', count: 280, spacing: 0.1, sizes: [FISH_BODIES.length, FISH_TAILS.length, FISH_FINS.length, FISH_MARKS.length],
  make: ([body, tail, fins, marks], k) => ({
    id: `fish-${k}`, name: `Fish ${k}`, sub: 'Fish',
    tags: words('sea ocean water swim animal aquarium', FISH_BODIES[body][0], FISH_TAILS[tail][0], FISH_FINS[fins][0], FISH_MARKS[marks][0]),
    draw: () => {
      const [, line, joint, eye, half] = FISH_BODIES[body];
      const b = edge(line);
      return joined(b.d, FISH_TAILS[tail][1](joint), FISH_FINS[fins][1](b), FISH_MARKS[marks][1](b, eye, half, joint));
    },
  }),
});

// ---------------------------------------------------------------- jellyfish
//
// The rim of the bell is at y = 0. [search words, outline, half the width of the rim, the height, the height of the eyes]

const BELLS = [
  ['round bell', `${bow([-4, 0], [4, 0], 1)} Z`, 4, 4, 2.2],
  ['wide bell mushroom', `${bow([-4.6, 0], [4.6, 0], 0.8)} Z`, 4.6, 3.7, 2],
  ['tall bell', 'M-3.4,0 Q-3.6,6 0,6.2 Q3.6,6 3.4,0 Z', 3.4, 6.2, 3.4],
  ['frilly bell', `${bow([-4, 0], [4, 0], 1)} ${wavy([4, 0], [-4, 0], 4, 0.35)}`, 4, 4, 2.2],
  ['pointed cap squid', closed([-4, 0], [0, 6.5], [4, 0]), 4, 6.5, 2.5],
];

// (half the width of the rim, (x) => the point of the rim there) => what hangs from the rim
const HANG = [-0.7, -0.25, 0.25, 0.7];
const out = (f) => (f < 0 ? -1 : 1);
const TENTACLES = [
  ['straight tentacles', (w, rim) => HANG.map((f) => path(rim(f * w), [f * w, -6])).join(' ')],
  ['wavy tentacles', (w, rim) => HANG.map((f) => wavy(rim(f * w), [f * w, -6], 3, 0.4)).join(' ')],
  ['long short tentacles', (w, rim) => HANG.map((f, i) => path(rim(f * w), [f * w, i % 2 ? -4 : -6.5])).join(' ')],
  ['hooked tentacles', (w, rim) => HANG.map((f) => path(rim(f * w), [f * w, -4.8], [f * w + out(f), -5.8])).join(' ')],
  ['zigzag tentacles', (w, rim) => HANG.map((f) => path(...zigzag(rim(f * w), [f * w, -6], 3, 0.6))).join(' ')],
  ['ribbon arms', (w, rim) => `${[-0.3, 0.3].map((f) => leaf(rim(f * w), [f * w * 1.3, -6.5], 0.25)).join(' ')} ${[-0.78, 0.78].map((f) => path(rim(f * w), [f * w, -4.5])).join(' ')}`],
  ['bead strings', (w, rim) => HANG.map((f) => [1.3, 2.7, 4.1, 5.5].map((d) => dot(f * w, rim(f * w)[1] - d)).join(' ')).join(' ')],
  ['curved tentacles', (w, rim) => HANG.map((f) => bend(rim(f * w), [f * w, -4], [f * w + out(f) * (Math.abs(f) > 0.5 ? 2 : 0.8), -6])).join(' ')],
  ['fine tentacles', (w, rim) => [-0.8, -0.48, -0.16, 0.16, 0.48, 0.8].map((f) => path(rim(f * w), [f * w, -4.6])).join(' ')],
];

// (the height of the eyes, half the width of the rim) => what is drawn on the bell
const JELLY_FACES = [
  ['', () => ''],
  ['eyes', (y) => `${dot(-1.2, y)} ${dot(1.2, y)}`],
  ['eyes smile face', (y) => `${dot(-1.3, y)} ${dot(1.3, y)} ${bow([-0.9, y - 0.9], [0.9, y - 0.9], -0.33)}`],
  ['inner bell', (y, w) => bow([-0.5 * w, 0.9], [0.5 * w, 0.9], (y - 0.6) / (0.5 * w))],
  ['spots', (y) => `${dot(0, y + 0.9)} ${dot(-1.5, y - 0.5)} ${dot(1.5, y - 0.5)}`],
  ['stripes', (y, w) => [-0.45, 0, 0.45].map((f) => path([f * w, 0.9], [f * w * 0.6, y + (f ? 0 : 0.7)])).join(' ')],
  ['ring', (y) => circle(0, y, 0.9)],
];

// (half the width of the rim, the height) => what else is in the water
const JELLY_EXTRAS = [
  ['', () => ''],
  ['bubbles', (w) => `${circle(w + 2.4, 1, 0.6)} ${circle(w + 3.3, 3.2, 0.9)} ${circle(w + 2.3, 5.4, 0.5)}`],
  ['sparkles glow', (w, t) => `${sparkle(-w - 2.6, 0.7 * t, 0.8)} ${sparkle(w + 2.8, 0.4 * t, 0.8)} ${sparkle(w + 3.2, -3, 0.8)}`],
  ['seaweed', (w) => wavy([-w - 3.2, -6.5], [-w - 3.2, 2], 4, 0.5)],
  ['starfish', (w) => star(w + 3.6, -5, 5, 1.7, 0.75)],
  ['small fish', (w, t) => smallFish(w + 1.8, 0.75 * t)],
  ['sea floor sand', (w) => path([-w - 3, -7.7], [w + 3, -7.7])],
  ['surface waves', (w, t) => wavy([-w - 3, t + 1.9], [w + 3, t + 1.9], 5, 0.5)],
];

const jellyfish = family({
  cat: 'sea', count: 280, spacing: 0.1, sizes: [BELLS.length, TENTACLES.length, JELLY_FACES.length, JELLY_EXTRAS.length],
  make: ([bell, arms, face, extra], k) => ({
    id: `jellyfish-${k}`, name: `Jellyfish ${k}`, sub: 'Jellyfish',
    tags: words('jelly sea ocean water animal medusa', BELLS[bell][0], TENTACLES[arms][0], JELLY_FACES[face][0], JELLY_EXTRAS[extra][0]),
    draw: () => {
      const [, line, w, high, eyes] = BELLS[bell];
      const b = edge(line);
      return joined(b.d, TENTACLES[arms][1](w, b.bottom), JELLY_FACES[face][1](eyes, w), JELLY_EXTRAS[extra][1](w, high));
    },
  }),
});

// ---------------------------------------------------------------- boats
//
// The deck is at y = 3 and the keel at y = 0.

const DECK = 3;
const KEEL = 'M-7.6,5 Q-6.6,0 0,0 Q6.6,0 7.6,5';
const HULLS = [
  ['sailboat', closed([-6.5, 3], [7.2, 3], [4.8, 0], [-5, 0])],
  ['tub round', `${path([-6, 3], [6, 3])} ${bowTo([-6, 3], 0.5)}`],
  ['longship viking', `${KEEL} ${path(edge(KEEL).out(180, 0, 3), edge(KEEL).right(3))}`],
  ['ship steamer', closed([-7.5, 3], [7.5, 3], [6.2, 0], [-6.8, 0])],
  ['canoe', 'M-7.4,3 L7.4,3 Q4.4,0 0,0 Q-4.4,0 -7.4,3 Z'],
];

const D = DECK;
// what stands on the deck
const RIGS = [
  ['sail mast', `${path([0.4, D], [0.4, D + 9])} ${path([0.4, D + 9], [5.2, D + 1.2], [0.4, D + 1.2])}`],
  ['two sails sloop mast', `${path([0, D], [0, D + 9])} ${path([0, D + 9], [5, D + 1.2], [0, D + 1.2])} ${path([0, D + 9], [-4.8, D + 1.2], [0, D + 1.2])}`],
  ['square sail mast', `${path([0, D], [0, D + 9.4])} ${box(-3.4, D + 2.6, 3.4, D + 7.8)}`],
  ['two masts square sails galleon', `${path([-2.6, D], [-2.6, D + 8])} ${path([2.6, D], [2.6, D + 9])} ${box(-4.4, D + 2.4, -0.8, D + 6.6)} ${box(0.8, D + 2.8, 4.4, D + 7.6)}`],
  ['steamer funnel smoke cabin', `${path([-3.4, D], [-3.4, D + 2.2], [2.4, D + 2.2], [2.4, D])} ${path([-1.4, D + 2.2], [-1.4, D + 5], [0.2, D + 5], [0.2, D + 2.2])} ${circle(-0.2, D + 6.6, 0.7)} ${circle(-1.6, D + 8.4, 1)}`],
  ['motor boat cabin flag', `${path([-3.6, D], [-3.6, D + 2.6], [0.8, D + 2.6], [2.6, D])} ${path([4.6, D], [4.6, D + 3.2])} ${path([4.6, D + 3.2], [6.5, D + 2.5], [4.6, D + 1.8])}`],
  ['lateen sail mast', `${path([0, D], [0, D + 7.7])} ${closed([-4.2, D + 2.6], [3.2, D + 9.4], [3.6, D + 1.6])}`],
  ['crows nest pirate sail mast', `${path([0, D], [0, D + 8.2])} ${box(-3, D + 2.4, 3, D + 6.4)} ${box(-0.9, D + 8.2, 0.9, D + 9.3)}`],
  ['fishing boat rod cabin', `${path([-4.2, D], [-4.2, D + 2.4], [-1.2, D + 2.4], [-1.2, D])} ${path([1.6, D], [5.6, D + 5.6])} ${path([5.6, D + 5.6], [5.6, D + 1.2])}`],
];

// (the outline of the hull) => what is drawn on the hull or hangs under it
const HULL_MARKS = [
  ['', () => ''],
  ['portholes', () => [-3, 0, 3].map((x) => circle(x, 1.6, 0.6)).join(' ')],
  ['stripe', (h) => path(add(h.out(180, 0, 1.5), 1.2, 0), add(h.right(1.5), -1.2, 0))],
  ['rivets', () => [-3, -1.5, 0, 1.5, 3].map((x) => dot(x, 1.5)).join(' ')],
  ['planks', (h) => [-2.5, 2.5].map((x) => path(h.bottom(x), [x, D])).join(' ')],
  ['eye', (h) => {
    const [x] = h.right(1.7);
    return `${circle(x - 1.9, 1.7, 0.6)} ${dot(x - 1.9, 1.7)}`;
  }],
  ['keel fin', (h) => path(h.bottom(-1.5), add(h.bottom(0), 0, -2), h.bottom(1.5))],
];

// (the outline of the hull) => the water and the sky
const SEAS = [
  ['', () => ''],
  ['waves', () => wavy([-9, -3.6], [9, -3.6], 6, 0.5)],
  ['rough sea waves', () => `${wavy([-9, -3.4], [9, -3.4], 6, 0.5)} ${wavy([-7.5, -5.2], [7.5, -5.2], 5, 0.5)}`],
  ['sun', () => `${circle(-7.6, D + 9.4, 1.3)} ${Array.from({ length: 8 }, (_, i) => dot(...polar(-7.6, D + 9.4, 2.4, 45 * i))).join(' ')}`],
  ['birds seagulls', () => `${bird(-6.4, D + 8.6)} ${bird(6.4, D + 10)}`],
  ['cloud', () => cloud(-6.4, D + 8.8)],
  ['fish', () => smallFish(0.6, -4.2)],
  ['calm water', (h) => `${path([-10.5, 0.6], add(h.out(180, 0, 0.6), -1, 0))} ${path(add(h.right(0.6), 1, 0), [10.5, 0.6])}`],
];

const boats = family({
  cat: 'sea', count: 280, spacing: 0.1, sizes: [HULLS.length, RIGS.length, HULL_MARKS.length, SEAS.length],
  make: ([hull, rig, marks, sea], k) => ({
    id: `boat-${k}`, name: `Boat ${k}`, sub: 'Boats',
    tags: words('ship sea ocean water sailing vessel', HULLS[hull][0], RIGS[rig][0], HULL_MARKS[marks][0], SEAS[sea][0]),
    draw: () => {
      const h = edge(HULLS[hull][1]);
      return joined(h.d, RIGS[rig][1], HULL_MARKS[marks][1](h), SEAS[sea][1](h));
    },
  }),
});

export const SEA_SHAPES = [...fish, ...jellyfish, ...boats];
export const SEA_HEADINGS = ['Fish', 'Jellyfish', 'Boats'];
