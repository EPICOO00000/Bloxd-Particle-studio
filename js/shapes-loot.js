// The "Loot" tab: flat pictures of goblets, pots, barrels, chests, game pieces,
// mushrooms, rings, coins, scrolls and spell books, each kind put together from
// a few parts (shape-mix.js says how the parts are dealt out). The turned things
// are seen from the front: their profiles are the ones of shapes-loot3d.js.

import { parsePath } from './shape-kit.js';
import { flatFamily } from './shape-build.js';
import { edgeOf as edge, path, closed, oval, bow, dot, box, polar, star, heart, diamond, ball, zigzag, wavy, roundedBox, ringOf, sparkle, left } from './shape-mix.js';
import { CUPS, STEMS, GOBLET_FEET, BELLIES, NECKS, STAVES, HOOPS, LOCKS, PIECE_HEADS, PIECE_BODIES, PIECE_FEET, COLLARS, CAPS, STALKS } from './shapes-loot3d.js';

const words = (...parts) => parts.filter(Boolean).join(' ');
const MARK = /D(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g;
/** A profile without the dots that say where its rings are. */
export const bare = (d) => d.replace(MARK, (mark, x) => (Number(x) > 0 ? '' : mark)).replace(/\s+/g, ' ').trim();
const onAxis = ([x]) => Math.abs(x) < 1e-6;

/**
 * A turned thing seen from the front, as a drawing: its profiles on the right and on the left, a line across for
 * every ring, and what is drawn once. What runs along the axis is drawn once, and a ring is not drawn again where
 * a profile runs along it already (the flat underside of a foot).
 */
export function fromFront(profiles, ...once) {
  const sides = profiles.filter(Boolean);
  const half = parsePath(sides.map(bare).join(' '));
  const polys = [...half.polys];
  for (const poly of half.polys) {
    let run = [];
    poly.forEach((p, i) => {
      if (i && onAxis(p) && onAxis(poly[i - 1])) { // this piece lies on the axis: its mirror picture is itself
        if (run.length > 1) polys.push(run);
        run = [];
      }
      run.push([-p[0], p[1]]);
    });
    if (run.length > 1) polys.push(run);
  }
  const level = half.polys.flatMap((poly) => poly.slice(1).map((q, i) => [poly[i], q])).filter(([a, b]) => Math.abs(a[1] - b[1]) < 1e-6);
  for (const mark of sides.flatMap((d) => [...d.matchAll(MARK)])) {
    const [x, y] = [Number(mark[1]), Number(mark[2])];
    if (!(x > 0)) continue;
    // the parts of the line across that no profile runs along
    const taken = level.filter(([a]) => Math.abs(a[1] - y) < 1e-6).map(([a, b]) => [Math.min(a[0], b[0]), Math.max(a[0], b[0])]).sort((a, b) => a[0] - b[0]);
    let from = 0;
    const free = [];
    for (const [lo, hi] of taken) {
      if (lo - from > 0.05) free.push([from, Math.min(lo, x)]);
      from = Math.max(from, hi);
      if (from >= x) break;
    }
    if (x - from > 0.05) free.push([from, x]);
    for (const [lo, hi] of free) {
      if (lo < 1e-6) polys.push([[-hi, y], [hi, y]]);
      else polys.push([[lo, y], [hi, y]], [[-hi, y], [-lo, y]]);
    }
  }
  const rest = parsePath(once.flat().filter(Boolean).join(' ') || 'N');
  return { polys: [...polys, ...rest.polys], dots: [...half.dots, ...rest.dots] };
}
/** A part is a drawing that is drawn once, or { sides: drawn on the right and on the left, once }. */
export const part = (p) => (typeof p === 'string' ? { once: p } : p || {});
/** The highest and the lowest point of a drawing. */
export const topOf = (d) => { const { polys, dots } = parsePath(d); return Math.max(...polys.flat().map((p) => p[1]), ...dots.map((p) => p[1])); };
export const bottomOf = (d) => { const { polys, dots } = parsePath(d); return Math.min(...polys.flat().map((p) => p[1]), ...dots.map((p) => p[1])); };
/** Every pair "x,y" of a drawing made wider and higher. */
export const stretched = (d, wide, high) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (pair, x, y) => `${Number((x * wide).toFixed(3))},${Number((y * high).toFixed(3))}`);
const across = (b, y) => path(left(b.right(y)), b.right(y));
const cross = (x, y, r) => `${path([x - r, y - r], [x + r, y + r])} ${path([x - r, y + r], [x + r, y - r])}`;
const rays = (x, y, from, to, angles) => angles.map((a) => path(polar(x, y, from, a), polar(x, y, to, a))).join(' ');

// ---------------------------------------------------------------- goblets

// (outline of the cup, its rim) => part
const GOBLET_MARKS = [
  ['', () => ''],
  ['full drink wine', (cup, [, ry]) => across(cup, ry - 1.3)],
  ['two handles trophy', (cup, rim) => ({ sides: bow(rim, cup.right(0.9), 0.9) })],
  ['jewels gems', (cup, [, ry]) => [-0.5, 0, 0.5].map((f) => dot(f * cup.right(ry * 0.5)[0], ry * 0.5)).join(' ')],
  ['steaming', (cup, [, ry]) => `${wavy([-0.9, ry + 1.6], [-0.9, ry + 4], 2, 0.4)} ${wavy([0.9, ry + 1.6], [0.9, ry + 4], 2, 0.4)}`],
  ['banded cup', (cup, [, ry]) => across(cup, ry * 0.45)],
  ['sparkle', (cup, [rx, ry]) => sparkle(rx + 1.5, ry + 1.8, 0.9)],
  ['overflowing', (cup, [rx, ry]) => bow([-rx, ry], [rx, ry], 0.55)],
];
// [search words, profile, what is drawn once]
const GOBLET_STANDS = [...GOBLET_FEET.slice(0, 6), ['three legs', 'M0,-3.6 L0.6,-3.6 M0.4,-3.6 Q2.5,-3.6 3.1,-5.2', path([0, -3.6], [0, -5.2])]];

const goblets = flatFamily({
  cat: 'loot', count: 500, sizes: [CUPS.length, STEMS.length, GOBLET_MARKS.length, GOBLET_STANDS.length],
  make: ([cup, stem, mark, stand], k) => ({
    id: `goblet-${k}`, name: `Goblet ${k}`, sub: 'Goblets',
    tags: words('cup chalice grail wine drink', CUPS[cup][0], STEMS[stem][0], GOBLET_MARKS[mark][0], GOBLET_STANDS[stand][0]),
    draw: () => {
      const [, line, rim] = CUPS[cup];
      const more = part(GOBLET_MARKS[mark][1](edge(line), rim));
      return fromFront([line, STEMS[stem][1], GOBLET_STANDS[stand][1], more.sides], oval(0, rim[1], rim[0], Math.max(0.5, rim[0] * 0.2)), GOBLET_STANDS[stand][2], more.once);
    },
  }),
});

// ---------------------------------------------------------------- pots

// (the mouth: how wide, how high) => what is drawn once
const POT_TOPS = [
  ['open', ([r, h]) => oval(0, h, r, Math.max(0.45, r * 0.22))],
  ['lid with a knob', ([r, h]) => `${closed([-r - 0.7, h], [r + 0.7, h], [r + 0.7, h + 0.8], [-r - 0.7, h + 0.8])} ${ball([0, h + 0.8], [0, h + 2], 0.75)}`],
  ['domed lid', ([r, h]) => `${path([-r, h], [r, h])} ${bow([-r, h], [r, h], 0.9)}`],
  ['pointed lid', ([r, h]) => closed([-r, h], [0, h + 2.6], [r, h])],
  ['cork', ([r, h]) => box(-r, h, r, h + 1.3)],
  ['plant sprout', ([r, h]) => `${oval(0, h, r, Math.max(0.45, r * 0.22))} ${path([0, h], [0, h + 3])} ${bow([0, h + 1.2], [2, h + 2.6], -0.5)} ${bow([0, h + 2], [-1.8, h + 3.6], 0.5)}`],
  ['steam smoke', ([r, h]) => `${oval(0, h, r, Math.max(0.45, r * 0.22))} ${wavy([-0.8, h + 1.4], [-0.8, h + 3.8], 2, 0.4)} ${wavy([0.8, h + 1.4], [0.8, h + 3.8], 2, 0.4)}`],
];

// (outline of the belly) => part
const POT_PATTERNS = [
  ['', () => ''],
  ['two handles', (b) => ({ sides: bow(b.right(2.2), b.right(-0.8), 0.9) })],
  ['two bands', (b) => `${across(b, -1.4)} ${across(b, 0.8)}`],
  ['zigzag band', (b) => path(...zigzag(left(b.right(-0.6)), b.right(-0.6), 5, 1))],
  ['dotted', (b) => [-0.5, 0, 0.5].map((f) => dot(f * b.right(-0.6)[0], -0.6)).join(' ')],
  ['cracked', () => path([0.5, 2.2], [-0.3, 1], [0.6, -0.1], [-0.1, -1.4])],
  ['handle jug', (b) => bow(b.right(2.2), b.right(-0.8), 0.9)],
  ['striped', () => ({ sides: path([1, -3.4], [1, 1.4]) })],
];

const pots = flatFamily({
  cat: 'loot', count: 500, sizes: [BELLIES.length, NECKS.length, POT_PATTERNS.length, POT_TOPS.length],
  make: ([belly, neck, pattern, top], k) => ({
    id: `pot-${k}`, name: `Pot ${k}`, sub: 'Pots',
    tags: words('vase urn jar clay loot', BELLIES[belly][0], NECKS[neck][0], POT_PATTERNS[pattern][0], POT_TOPS[top][0]),
    draw: () => {
      const more = part(POT_PATTERNS[pattern][1](edge(BELLIES[belly][1])));
      return fromFront([BELLIES[belly][1], bare(NECKS[neck][1]), more.sides], POT_TOPS[top][1](NECKS[neck][2]), more.once);
    },
  }),
});

// ---------------------------------------------------------------- barrels

// (outline of the staves, its top: how wide, how high) => part
const BARREL_LIDS = [
  ['closed lid', (b, [r, h]) => path([-r, h], [r, h])],
  ['open', (b, [r, h]) => oval(0, h, r, Math.max(0.5, r * 0.2))],
  ['lid with a knob', (b, [r, h]) => `${path([-r, h], [r, h])} ${ball([0, h], [0, h + 1.4], 0.75)}`],
  ['heaped full', (b, [r, h]) => `${path([-r, h], [r, h])} ${bow([-r, h], [r, h], 0.55)}`],
  ['powder keg fuse', (b, [r, h]) => `${path([-r, h], [r, h])} M0,${h} Q0.2,${h + 1.8} 1.8,${h + 2.4} ${dot(2.8, h + 2.9)} ${dot(1.9, h + 3.6)} ${dot(2.8, h + 1.7)}`],
  ['bubbling', (b, [r, h]) => `${oval(0, h, r, Math.max(0.5, r * 0.2))} ${dot(-1, h + 1.6)} ${dot(0.3, h + 2.5)} ${dot(1.2, h + 1.5)}`],
  ['bung', (b, [r, h]) => `${path([-r, h], [r, h])} ${box(-0.8, h, 0.8, h + 1.1)}`],
  ['apples', (b, [r, h]) => `${path([-r, h], [r, h])} ${oval(-1.2, h + 0.9, 0.9, 0.9)} ${oval(0.9, h + 0.9, 0.9, 0.9)} ${oval(-0.15, h + 2.4, 0.9, 0.9)}`],
];

const BARREL_FRONTS = [
  ['', () => ''],
  ['tap', (b, [, h]) => { const [x, y] = b.right(-h * 0.5); return path([x, y], [x + 1.8, y], [x + 1.8, y - 1.3]); }],
  ['rope handles', (b, [, h]) => ({ sides: bow(b.right(h * 0.62), b.right(h * 0.1), 1) })],
  ['on legs', (b, [, h]) => ({ sides: path([2, -h], [2.9, -h - 1.7]) })],
  ['tag', (b, [, h]) => { const [x, y] = b.right(h * 0.3); return `${path([x, y], [x + 2.2, y + 0.2])} ${box(x + 2.2, y - 1.2, x + 3.6, y + 0.2)}`; }],
  ['planks', (b) => ({ sides: stretched(b.d, 0.45, 1) })],
  ['arrow stuck', (b) => { const [x] = b.right(0.9); return `${path([x, 0.9], [x + 3.4, 2.4])} ${path([x + 2.2, 2.9], [x + 3.4, 2.4], [x + 3.1, 1.2])}`; }],
  ['grass', (b, [, h]) => { const [x] = b.right(-h); return { sides: `${path([x + 0.5, -h], [x + 1.1, -h + 1.5])} ${path([x + 1.4, -h], [x + 1.7, -h + 0.9])}` }; }],
  ['puddle', (b, [, h]) => { const [x] = b.right(-h); return `M${x + 0.4},${-h} Q${x + 1.9},${-h + 0.7} ${x + 3.4},${-h} Q${x + 1.9},${-h - 0.7} ${x + 0.4},${-h}`; }],
];

const barrels = flatFamily({
  cat: 'loot', count: 500, sizes: [STAVES.length, BARREL_FRONTS.length, BARREL_LIDS.length, HOOPS.length],
  make: ([staves, front, lid, hoops], k) => ({
    id: `barrel-${k}`, name: `Barrel ${k}`, sub: 'Barrels',
    tags: words('keg cask wood loot', STAVES[staves][0], BARREL_FRONTS[front][0], BARREL_LIDS[lid][0], HOOPS[hoops][0]),
    draw: () => {
      const [, line, rim] = STAVES[staves];
      const b = edge(line);
      const more = part(BARREL_FRONTS[front][1](b, rim));
      return fromFront([line, more.sides], ...HOOPS[hoops][1].map((f) => across(b, f * rim[1])), part(BARREL_LIDS[lid][1](b, rim)).once, more.once);
    },
  }),
});

// ---------------------------------------------------------------- chests
//
// Seen from the front: the box reaches w to each side and its top is at the height 1; the lid is above.

// (half its length) => drawing
const CHEST_LIDS = [
  ['flat lid', (w) => path([-w, 1], [-w, 2.4], [w, 2.4], [w, 1])],
  ['arched lid', (w) => `M${-w},1 Q${-w},3.6 0,3.6 Q${w},3.6 ${w},1`],
  ['low lid', (w) => `M${-w},1 Q0,3.6 ${w},1`],
  ['sloped lid', (w) => path([-w, 1], [-w + 1.2, 3], [w - 1.2, 3], [w, 1])],
  ['stepped lid', (w) => path([-w, 1], [-w, 2], [-w + 0.9, 2], [-w + 0.9, 3], [w - 0.9, 3], [w - 0.9, 2], [w, 2], [w, 1])],
  ['open lid treasure', (w) => `${path([-w, 1], [-w + 0.6, 4.8], [w - 0.6, 4.8], [w, 1])} ${bow([-w + 1.2, 1], [w - 1.2, 1], 0.45)} ${dot(-1.4, 3.7)} ${dot(1.2, 3.3)} ${dot(0, 4.1)}`],
  ['half open glowing', (w) => `${box(-w, 2.1, w, 3.5)} ${path([-1.6, 1.3], [-2, 1.9])} ${path([0, 1.3], [0, 1.9])} ${path([1.6, 1.3], [2, 1.9])}`],
  ['rounded lid', (w) => `M${-w},1 Q${-w},3 ${-w + 2},3 L${w - 2},3 Q${w},3 ${w},1`],
  ['ridged lid', (w) => `M${-w},1 Q${-w},3.6 0,3.6 Q${w},3.6 ${w},1 M${-w + 1},1 Q${-w + 1},2.7 0,2.7 Q${w - 1},2.7 ${w - 1},1`],
];

// (half its length, its bottom) => drawing
const CHEST_FITTINGS = [
  ['', () => ''],
  ['iron straps', (w, low) => `${path([-0.62 * w, low], [-0.62 * w, 1])} ${path([0.62 * w, low], [0.62 * w, 1])}`],
  ['corner brackets', (w, low) => `${path([-w + 1.1, low], [-w + 1.1, low + 1.1], [-w, low + 1.1])} ${path([w - 1.1, low], [w - 1.1, low + 1.1], [w, low + 1.1])}`],
  ['feet', (w, low) => `${box(-w + 0.4, low - 1, -w + 1.6, low)} ${box(w - 1.6, low - 1, w - 0.4, low)}`],
  ['plinth', (w, low) => path([-w, low], [-w - 0.8, low], [-w - 0.8, low - 0.9], [w + 0.8, low - 0.9], [w + 0.8, low], [w, low])],
  ['handles', (w, low) => `${bow([w, 0.3], [w, low + 0.7], 0.9)} ${bow([-w, low + 0.7], [-w, 0.3], 0.9)}`],
  ['studs', (w, low) => [-0.75, -0.35, 0.35, 0.75].map((f) => dot(f * w, low + 0.7)).join(' ')],
  ['on the ground', (w, low) => `${path([-w - 1.6, low], [-w, low])} ${path([w, low], [w + 1.6, low])}`],
];

// [search words, half its length, how high the box is]
const CHEST_SIZES = [['', 5, 4], ['short', 4, 4], ['long', 6, 3.4], ['strongbox', 3.4, 4.4], ['low', 5, 3.3], ['tall', 4.2, 5], ['big trunk', 6, 4.6]];

const chests = flatFamily({
  cat: 'loot', count: 500, sizes: [LOCKS.length, CHEST_LIDS.length, CHEST_FITTINGS.length, CHEST_SIZES.length],
  make: ([lock, lid, fitting, size], k) => ({
    id: `chest-${k}`, name: `Chest ${k}`, sub: 'Chests',
    tags: words('treasure box trunk loot', LOCKS[lock][0], CHEST_LIDS[lid][0], CHEST_FITTINGS[fitting][0], CHEST_SIZES[size][0]),
    draw: () => {
      const [, w, high] = CHEST_SIZES[size];
      return [box(-w, 1 - high, w, 1), CHEST_LIDS[lid][1](w), LOCKS[lock][1], CHEST_FITTINGS[fitting][1](w, 1 - high)].filter(Boolean).join(' ');
    },
  }),
});

// ---------------------------------------------------------------- game pieces

// (outline of the body, how high the piece is) => drawing
const PIECE_MARKS = [
  ['', () => ''],
  ['banded', (body) => across(body, -1.2)],
  ['two bands', (body) => `${across(body, -2.6)} ${across(body, 0.4)}`],
  ['shadow', () => oval(0, -6, 4.8, 0.7)],
  ['sparkle', (body, top) => sparkle(3.7, top - 0.6, 0.9)],
  ['crowned with dots', (body, top) => `${dot(-1.3, top + 1)} ${dot(0, top + 1.6)} ${dot(1.3, top + 1)}`],
  ['moving', () => `${path([-5.6, -1], [-4, -1])} ${path([-6, -3], [-4, -3])} ${path([-5.4, -5], [-4, -5])}`],
  ['on the board', () => `${path([-5.6, -6], [-3.4, -6])} ${path([3.4, -6], [5.6, -6])}`],
];

const pieces = flatFamily({
  cat: 'loot', count: 500, sizes: [PIECE_HEADS.length, PIECE_BODIES.length, PIECE_FEET.length, COLLARS.length, PIECE_MARKS.length],
  make: ([head, body, foot, collar, mark], k) => ({
    id: `game-piece-${k}`, name: `Game piece ${k}`, sub: 'Game pieces',
    tags: words('chess pawn board token figure', PIECE_HEADS[head][0], PIECE_BODIES[body][0], PIECE_FEET[foot][0], COLLARS[collar][0], PIECE_MARKS[mark][0]),
    draw: () => {
      const [, line, own] = PIECE_HEADS[head];
      return fromFront([PIECE_FEET[foot][1], PIECE_BODIES[body][1], COLLARS[collar][1], line], own, PIECE_MARKS[mark][1](edge(PIECE_BODIES[body][1]), topOf(`${line} ${own || ''}`)));
    },
  }),
});

// ---------------------------------------------------------------- mushrooms

// (outline of the cap, its rim, how high its top is, how low it begins) => drawing
const inside = (rule) => (cap, [rx], top, low) => rule(cap, (f) => low + f * (top - low), rx, top);
const MUSHROOM_MARKS = [
  ['', () => ''],
  ['spots', inside((cap, at) => `${oval(0, at(0.62), 0.75, Math.min(0.75, (at(1) - at(0)) * 0.2))} ${oval(-0.55 * cap.right(at(0.3))[0], at(0.3), 0.55, Math.min(0.55, (at(1) - at(0)) * 0.16))} ${oval(0.55 * cap.right(at(0.3))[0], at(0.3), 0.55, Math.min(0.55, (at(1) - at(0)) * 0.16))}`)],
  ['dotted', inside((cap, at) => `${dot(0, at(0.7))} ${[-0.6, 0.6].map((f) => dot(f * cap.right(at(0.5))[0], at(0.5))).join(' ')} ${[-0.45, 0, 0.45].map((f) => dot(f * cap.right(at(0.25))[0], at(0.25))).join(' ')}`)],
  ['banded cap', inside((cap, at) => across(cap, at(0.5)))],
  ['shiny', inside((cap, at) => `M${-0.5 * cap.right(at(0.78))[0]},${at(0.78)} Q${-0.85 * cap.right(at(0.55))[0]},${at(0.6)} ${-0.78 * cap.right(at(0.3))[0]},${at(0.3)}`)],
  ['ribbed cap', inside((cap, at, rx, top) => `${path([0, top], [-0.45 * rx, at(0)])} ${path([0, top], [0.45 * rx, at(0)])}`)],
  ['ring spot', inside((cap, at) => oval(0, at(0.5), Math.min(1.2, 0.4 * cap.right(at(0.5))[0]), Math.min(1, 0.3 * (at(1) - at(0)))))],
  ['sparkle', (cap, [rx], top) => sparkle(rx + 0.9, top + 0.9, 0.9)],
  ['spores', (cap, rim, top) => `${dot(-1.2, top + 1.2)} ${dot(0.2, top + 2.1)} ${dot(1.3, top + 1.1)}`],
];

const MUSHROOM_GROUNDS = [
  ['', {}],
  ['grass', { sides: `${path([2.2, -5], [2.8, -3.5])} ${path([3.2, -5], [3.5, -4])}` }],
  ['baby mushroom', { once: 'M3.4,-3.6 Q3.4,-2.2 4.4,-2.2 Q5.4,-2.2 5.4,-3.6 Z M4.1,-3.6 L4.1,-5 M4.7,-3.6 L4.7,-5' }],
  ['on the ground', { sides: path([2.2, -5], [4.8, -5]) }],
  ['pebbles', { once: `${oval(-3, -4.65, 0.6, 0.35)} ${oval(3.3, -4.7, 0.5, 0.3)}` }],
  ['leaf', { once: 'M2,-5 Q3.4,-3.6 4.8,-5 Q3.4,-5.7 2,-5' }],
  ['flower', { once: `${path([-3.2, -5], [-3.2, -3.4])} ${star(-3.2, -2.6, 5, 0.8, 0.4)}` }],
];

const mushrooms = flatFamily({
  cat: 'loot', count: 500, first: [0, 1, 0, 0], sizes: [CAPS.length, MUSHROOM_MARKS.length, STALKS.length, MUSHROOM_GROUNDS.length],
  make: ([cap, mark, stalk, ground], k) => ({
    id: `mushroom-${k}`, name: `Mushroom ${k}`, sub: 'Mushrooms',
    tags: words('toadstool fungus power up forest', CAPS[cap][0], MUSHROOM_MARKS[mark][0], STALKS[stalk][0], MUSHROOM_GROUNDS[ground][0]),
    draw: () => {
      const [, line, rim] = CAPS[cap];
      return fromFront([line, STALKS[stalk][1], MUSHROOM_GROUNDS[ground][1].sides], MUSHROOM_MARKS[mark][1](edge(line), rim, topOf(bare(line)), bottomOf(bare(line))), MUSHROOM_GROUNDS[ground][1].once);
    },
  }),
});

// ---------------------------------------------------------------- rings
//
// The band is a circle around (0, 0), 3.4 wide; what holds the stone stands on its top, and the stone begins at the height 5.

const RING_STONES = [
  ['brilliant', `${closed([-2.4, 6.6], [-1.4, 7.8], [1.4, 7.8], [2.4, 6.6], [0, 5])} ${path([-2.4, 6.6], [2.4, 6.6])}`],
  ['pearl', oval(0, 6.8, 1.8, 1.8, 270)],
  ['square stone', box(-1.7, 5, 1.7, 8.4)],
  ['heart', heart(0, 7, 2)],
  ['star', `${path([0, 5], [0, 6.2])} ${star(0, 7.2, 5, 2.2, 1)}`],
  ['emerald', closed([-1.2, 5], [1.2, 5], [2.2, 6], [2.2, 7.6], [1.2, 8.6], [-1.2, 8.6], [-2.2, 7.6], [-2.2, 6])],
  ['teardrop', 'M0,9 C2.6,7 2,5 0,5 C-2,5 -2.6,7 0,9'],
  ['flower', `${oval(0, 7, 0.8, 0.8)} ${[90, 162, 234, 306, 18].map((a) => oval(...polar(0, 7, 1.6, a), 0.8, 0.8)).join(' ')}`],
  ['signet', oval(0, 6.2, 2.6, 1.2, 270)],
  ['moon', 'M0,5 C-3.2,5.4 -3.2,8.8 0.4,9 C-1.2,8 -1.4,6 0,5'],
  ['crown', closed([-2, 5], [-2.4, 8], [-1, 6.6], [0, 8.6], [1, 6.6], [2.4, 8], [2, 5])],
];

const RING_HOOPS = [
  ['thin band', oval(0, 0, 3.4, 3.4)],
  ['wide band', `${oval(0, 0, 3.4, 3.4)} ${oval(0, 0, 2.5, 2.5)}`],
  ['tapered band', `${oval(0, 0, 3.4, 3.4)} ${oval(0, 0.3, 2.8, 2.8)}`],
  ['open band', 'N A0,0 3.4 -62 242'],
  ['square band', roundedBox(0, 0, 3.4, 3.4, 1.2)],
  ['beaded band', ringOf((a) => polar(0, 0, 3.4, a), 15).map((p) => dot(...p)).join(' ')],
  ['notched band', `${oval(0, 0, 3.4, 3.4)} ${rays(0, 0, 3.4, 4.2, [205, 250, 290, 335])}`],
  ['eight sided band', closed(...ringOf((a) => polar(0, 0, 3.4 / Math.cos(Math.PI / 8), a + 22.5), 45))],
  ['wavy band', closed(...ringOf((a) => polar(0, 0, 3.4 + 0.3 * Math.cos(((a - 90) * 8 * Math.PI) / 180), a), 9))],
];

const RING_MOUNTS = [
  ['', path([0, 3.4], [0, 5])],
  ['prongs', path([-1.4, 5.6], [0, 3.4], [1.4, 5.6])],
  ['cup mount', `M-1.8,5.2 Q0,3 1.8,5.2 ${path([0, 3.4], [0, 4.1])}`],
  ['bezel', `${path([0, 3.4], [0, 4])} ${path([-1.5, 5], [-1.5, 4], [1.5, 4], [1.5, 5])}`],
  ['shoulders', path([-2.2, 2.6], [0, 5], [2.2, 2.6])],
  ['leaf mount', `M0,3.4 Q-2.4,3.4 -2.6,5.2 Q-0.8,5 0,3.4 M0,3.4 Q2.4,3.4 2.6,5.2 Q0.8,5 0,3.4 ${path([0, 3.4], [0, 5])}`],
  ['beaded mount', `${path([0, 3.4], [0, 5])} ${dot(-1.2, 4.2)} ${dot(1.2, 4.2)}`],
  ['collar', `${path([0, 3.4], [0, 5])} ${path([-1.3, 4.2], [1.3, 4.2])}`],
];

const RING_EXTRAS = [
  ['', ''],
  ['sparkle', sparkle(3.7, 8.7, 0.9)],
  ['side stones', `${diamond(3.5, 3, 0.7, 0.7)} ${diamond(-3.5, 3, 0.7, 0.7)}`],
  ['shining', `${path([0, 9.7], [0, 10.9])} ${path([-1.7, 9.3], [-2.5, 10.3])} ${path([1.7, 9.3], [2.5, 10.3])}`],
  ['charm', ball([0, -3.4], [0, -5.2], 0.9)],
  ['shadow', oval(0, -4.7, 3, 0.5)],
  ['glint', 'N A0,0 4.4 115 160'],
];

const rings2d = flatFamily({
  cat: 'loot', count: 500, sizes: [RING_STONES.length, RING_HOOPS.length, RING_MOUNTS.length, RING_EXTRAS.length],
  make: ([stone, hoop, mount, extra], k) => ({
    id: `ring-${k}`, name: `Ring ${k}`, sub: 'Rings',
    tags: words('jewel jewellery finger gold magic', RING_STONES[stone][0], RING_HOOPS[hoop][0], RING_MOUNTS[mount][0], RING_EXTRAS[extra][0]),
    draw: () => [RING_HOOPS[hoop][1], RING_MOUNTS[mount][1], RING_STONES[stone][1], RING_EXTRAS[extra][1]].filter(Boolean).join(' '),
  }),
});

// ---------------------------------------------------------------- coins
//
// The edge is about 5 from the middle, the picture on the coin within 2.4, and what runs around it at about 3.5.

const COIN_FACES = [
  ['star', star(0, 0, 5, 2.4, 1)],
  ['crown', closed([-2, -1.3], [-2.2, 1.4], [-1, 0.2], [0, 1.9], [1, 0.2], [2.2, 1.4], [2, -1.3])],
  ['heart', heart(0, 0.2, 2)],
  ['plus', `${path([0, -2.2], [0, 2.2])} ${path([-2.2, 0], [2.2, 0])}`],
  ['gem', `${diamond(0, 0, 1.7, 2.3)} ${path([-1.7, 0], [1.7, 0])}`],
  ['sun', `${oval(0, 0, 1, 1)} ${rays(0, 0, 1.5, 2.4, [0, 45, 90, 135, 180, 225, 270, 315])}`],
  ['moon', 'M0.8,2.2 C-2.6,1.8 -2.6,-1.8 0.8,-2.2 C-0.8,-1 -0.8,1 0.8,2.2'],
  ['bolt', path([0.8, 2.4], [-1.2, -0.2], [0.9, -0.2], [-0.8, -2.4])],
  ['smiling face', `${dot(-0.9, 0.8)} ${dot(0.9, 0.8)} M-1.5,-0.5 Q0,-2.2 1.5,-0.5`],
  ['number one', `${path([-0.9, 1.3], [0.2, 2.3], [0.2, -2.2])} ${path([-1, -2.2], [1.4, -2.2])}`],
  ['skull', `${oval(0, 0.4, 1.9, 1.7)} ${dot(-0.7, 0.5)} ${dot(0.7, 0.5)} ${path([-0.7, -1.3], [-0.7, -2.2], [0.7, -2.2], [0.7, -1.3])}`],
];

const COIN_EDGES = [
  ['round coin', oval(0, 0, 5, 5)],
  ['eight sided coin', closed(...ringOf((a) => polar(0, 0, 5.2, a + 22.5), 45))],
  ['six sided coin', closed(...ringOf((a) => polar(0, 0, 5.3, a), 60))],
  ['scalloped coin', closed(...ringOf((a) => polar(0, 0, 5 + 0.3 * Math.cos((a * 12 * Math.PI) / 180), a), 6))],
  ['square coin', roundedBox(0, 0, 4.6, 4.6, 1.4)],
  ['oval coin', oval(0, 0, 4.3, 5.2)],
  ['milled coin', star(0, 0, 16, 5.1, 4.6)],
  ['shield token', 'M-4.3,4.6 L4.3,4.6 L4.3,0 C4.3,-3 2,-4.8 0,-5.6 C-2,-4.8 -4.3,-3 -4.3,0 Z'],
  ['twelve sided coin', closed(...ringOf((a) => polar(0, 0, 5.1, a), 30))],
];

const COIN_RIMS = [
  ['', ''],
  ['inner ring', oval(0, 0, 3.6, 3.6)],
  ['dotted ring', ringOf((a) => polar(0, 0, 3.5, a), 30).map((p) => dot(...p)).join(' ')],
  ['dashed ring', [10, 100, 190, 280].map((a) => `N A0,0 3.5 ${a} ${a + 70}`).join(' ')],
  ['ticks', rays(0, 0, 3.1, 3.9, [22, 67, 112, 157, 202, 247, 292, 337])],
  ['laurel', 'N A0,0 3.5 110 250 N A0,0 3.5 -70 70'],
  ['square frame', box(-2.9, -2.9, 2.9, 2.9)],
  ['four dots', [45, 135, 225, 315].map((a) => dot(...polar(0, 0, 3.5, a))).join(' ')],
];

const COIN_EXTRAS = [
  ['', ''],
  ['sparkle', sparkle(4.8, 5, 0.9)],
  ['stack', 'N A0,-1.3 5 200 340 N A0,-2.6 5 200 340'],
  ['flying', `${path([-7.6, 2], [-6, 2])} ${path([-8, 0], [-6, 0])} ${path([-7.6, -2], [-6, -2])}`],
  ['glowing', rays(0, 0, 5.9, 7, [45, 135, 225, 315])],
  ['two coins', 'N A2.4,0 5 -60 60'],
  ['shadow', oval(0, -6.4, 3.6, 0.5)],
];

const coins = flatFamily({
  cat: 'loot', count: 500, sizes: [COIN_FACES.length, COIN_EDGES.length, COIN_RIMS.length, COIN_EXTRAS.length],
  make: ([face, coinEdge, rim, extra], k) => ({
    id: `coin-${k}`, name: `Coin ${k}`, sub: 'Coins',
    tags: words('gold money token treasure', COIN_FACES[face][0], COIN_EDGES[coinEdge][0], COIN_RIMS[rim][0], COIN_EXTRAS[extra][0]),
    draw: () => [COIN_EDGES[coinEdge][1], COIN_RIMS[rim][1], COIN_FACES[face][1], COIN_EXTRAS[extra][1]].filter(Boolean).join(' '),
  }),
});

// ---------------------------------------------------------------- scrolls
//
// The parchment: [search words, drawing, where the writing goes (its middle, half its width, half its height),
// its bottom, its top, its right edge]

const roll = (y, w) => roundedBox(0, y, w, 0.7, 0.7);
const SCROLL_SHAPES = [
  ['open scroll', `${path([-3.4, -4], [-3.4, 4])} ${path([3.4, -4], [3.4, 4])} ${roll(4.7, 4.2)} ${roll(-4.7, 4.2)}`, [0, 0, 2.4, 3], -5.4, 5.4, 4.2],
  ['wide scroll', `${path([-4, 3], [4, 3])} ${path([-4, -3], [4, -3])} ${roundedBox(-4.7, 0, 0.7, 3.8, 0.7)} ${roundedBox(4.7, 0, 0.7, 3.8, 0.7)}`, [0, 0, 3, 2], -3.8, 3.8, 5.4],
  ['long scroll', `${path([-2.6, -5.4], [-2.6, 5.4])} ${path([2.6, -5.4], [2.6, 5.4])} ${roll(6.1, 3.4)} ${roll(-6.1, 3.4)}`, [0, 0, 1.8, 4.2], -6.8, 6.8, 3.4],
  ['torn scroll', `${path([-3.4, 4], [-3.4, -4.4], ...zigzag([-3.4, -4.4], [3.4, -4.4], 4, 0.9).slice(1), [3.4, 4])} ${roll(4.7, 4.2)}`, [0, 0.4, 2.4, 2.6], -4.4, 5.4, 4.2],
  ['wavy scroll', `${wavy([-3.4, -4], [-3.4, 4], 2, 0.3)} ${wavy([3.4, -4], [3.4, 4], 2, 0.3)} ${roll(4.7, 4.2)} ${roll(-4.7, 4.2)}`, [0, 0, 2.2, 3], -5.4, 5.4, 4.2],
  ['parchment', `${closed([-3.6, 4.6], [3.6, 4.6], [3.6, -3.2], [2.2, -4.6], [-3.6, -4.6])} ${path([2.2, -4.6], [2.2, -3.2], [3.6, -3.2])}`, [0, 0.4, 2.6, 3], -4.6, 4.6, 3.6],
  ['scroll with handles', `${path([-3.4, -4], [-3.4, 4])} ${path([3.4, -4], [3.4, 4])} ${roll(4.7, 4.2)} ${roll(-4.7, 4.2)} ${[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([i, j]) => oval(i * 5, j * 4.7, 0.8, 0.8, i > 0 ? 180 : 0)).join(' ')}`, [0, 0, 2.4, 3], -5.4, 5.4, 5.8],
  ['short scroll', `${path([-4.2, -2.6], [-4.2, 2.6])} ${path([4.2, -2.6], [4.2, 2.6])} ${roll(3.3, 5)} ${roll(-3.3, 5)}`, [0, 0, 3.2, 1.7], -4, 4, 5],
  ['flying page', `${wavy([-3.8, 3.4], [3.8, 3.4], 2, 0.4)} ${wavy([-3.8, -3.4], [3.8, -3.4], 2, 0.4)} ${path([-3.8, -3.4], [-3.8, 3.4])} ${path([3.8, -3.4], [3.8, 3.4])}`, [0, 0, 2.7, 2.2], -3.8, 3.8, 3.8],
];

// (its middle x, y, half its width, half its height, the smaller of the two) => drawing
const SCROLL_TEXTS = [
  ['writing', (x, y, w, h) => [0.75, 0.25, -0.25].map((f) => path([x - w, y + f * h], [x + w, y + f * h])).join(' ') + ` ${path([x - w, y - 0.75 * h], [x, y - 0.75 * h])}`],
  ['treasure map', (x, y, w, h) => `${path([x - w, y - 0.6 * h], [x - 0.3 * w, y + 0.2 * h], [x + 0.2 * w, y - 0.3 * h])} ${cross(x + 0.6 * w, y + 0.5 * h, Math.min(w, h) * 0.3)}`],
  ['magic circle', (x, y, w, h, s) => `${oval(x, y, s, s)} ${closed(polar(x, y, s, 90), polar(x, y, s, 210), polar(x, y, s, 330))}`],
  ['star', (x, y, w, h, s) => star(x, y, 5, s, 0.42 * s)],
  ['heart', (x, y, w, h, s) => heart(x, y, 0.9 * s)],
  ['mountains', (x, y, w, h) => path([x - w, y - 0.6 * h], [x - 0.35 * w, y + 0.5 * h], [x, y - 0.1 * h], [x + 0.4 * w, y + 0.7 * h], [x + w, y - 0.6 * h])],
  ['spiral', (x, y, w, h, s) => `N A${x + 0.25 * s},${y} ${0.25 * s} 180 360 A${x},${y} ${0.5 * s} 0 180 A${x + 0.25 * s},${y} ${0.75 * s} 180 360`],
  ['grid', (x, y, w, h, s) => `${path([x - 0.35 * s, y - s], [x - 0.35 * s, y + s])} ${path([x + 0.35 * s, y - s], [x + 0.35 * s, y + s])} ${path([x - s, y - 0.35 * s], [x + s, y - 0.35 * s])} ${path([x - s, y + 0.35 * s], [x + s, y + 0.35 * s])}`],
  ['sun', (x, y, w, h, s) => `${oval(x, y, 0.42 * s, 0.42 * s)} ${rays(x, y, 0.66 * s, s, [0, 45, 90, 135, 180, 225, 270, 315])}`],
  ['eye', (x, y, w, h, s) => `M${x - s},${y} Q${x},${y + 0.95 * s} ${x + s},${y} Q${x},${y - 0.95 * s} ${x - s},${y} ${oval(x, y, 0.3 * s, 0.3 * s)}`],
  ['arrow', (x, y, w, h, s) => `${path([x, y - s], [x, y + s])} ${path([x - 0.6 * s, y + 0.35 * s], [x, y + s], [x + 0.6 * s, y + 0.35 * s])}`],
];

// (its bottom, its right edge) => drawing
const SCROLL_SEALS = [
  ['', () => ''],
  ['wax seal', (low) => `${path([1.8, low], [1.8, low - 0.6])} ${oval(1.8, low - 1.5, 0.9, 0.9)}`],
  ['ribbons', (low) => `${path([-1.2, low], [-1.9, low - 2.2])} ${path([-0.6, low], [-0.3, low - 2.4])}`],
  ['star seal', (low) => `${path([1.8, low], [1.8, low - 0.5])} ${star(1.8, low - 1.6, 5, 1.1, 0.5)}`],
  ['tassel', (low) => `${path([0, low], [0, low - 1.2])} ${path([-0.7, low - 2.6], [0, low - 1.2], [0.7, low - 2.6])}`],
  ['quill', (low, wide) => `M${wide + 1.2},${low + 1} Q${wide + 3.4},${low + 4} ${wide + 2.6},${low + 7.6} Q${wide + 1.2},${low + 4.6} ${wide + 1.2},${low + 1}`],
  ['cord', (low) => `${path([0, low], [0, low - 0.9])} ${oval(0, low - 1.6, 0.7, 0.7)} ${path([0, low - 2.3], [0, low - 3.1])}`],
  ['two seals', (low) => `${path([-1.6, low], [-1.6, low - 0.6])} ${oval(-1.6, low - 1.4, 0.8, 0.8)} ${path([1.6, low], [1.6, low - 0.6])} ${oval(1.6, low - 1.4, 0.8, 0.8)}`],
];

// (its top, its right edge) => drawing
const SCROLL_EXTRAS = [
  ['', () => ''],
  ['sparkle', (high, wide) => sparkle(wide + 1.1, high + 0.7, 0.9)],
  ['glowing', (high) => `${path([0, high + 0.7], [0, high + 1.9])} ${path([-1.8, high + 0.6], [-2.5, high + 1.6])} ${path([1.8, high + 0.6], [2.5, high + 1.6])}`],
  ['magic dust', (high, wide) => `${dot(-wide - 1, 2.2)} ${dot(-wide - 1.9, 0.9)} ${dot(-wide - 1.1, -0.5)}`],
  ['little star', (high, wide) => star(-wide - 0.6, high + 0.9, 5, 1, 0.45)],
  ['important', (high, wide) => `${path([-wide - 1.4, 2.2], [-wide - 1.4, -0.6])} ${dot(-wide - 1.4, -1.7)}`],
  ['swirl', (high, wide) => wavy([-wide - 1.3, -2.6], [-wide - 1.3, 2.6], 3, 0.4)],
];

const scrolls = flatFamily({
  cat: 'loot', count: 500, sizes: [SCROLL_TEXTS.length, SCROLL_SHAPES.length, SCROLL_SEALS.length, SCROLL_EXTRAS.length],
  make: ([text, shape, seal, extra], k) => ({
    id: `scroll-${k}`, name: `Scroll ${k}`, sub: 'Scrolls',
    tags: words('parchment paper spell quest letter', SCROLL_TEXTS[text][0], SCROLL_SHAPES[shape][0], SCROLL_SEALS[seal][0], SCROLL_EXTRAS[extra][0]),
    draw: () => {
      const [, d, [x, y, w, h], low, high, wide] = SCROLL_SHAPES[shape];
      return [d, SCROLL_TEXTS[text][1](x, y, w, h, Math.min(w, h)), SCROLL_SEALS[seal][1](low, wide), SCROLL_EXTRAS[extra][1](high, wide)].filter(Boolean).join(' ');
    },
  }),
});

// ---------------------------------------------------------------- spell books
//
// The cover: [search words, drawing, where its sign goes (middle and size), its box (left, bottom, right, top)]

const BOOK_COVERS = [
  ['', `${box(-3.6, -4.8, 3.6, 4.8)} ${path([-2.6, -4.8], [-2.6, 4.8])}`, [0.5, 0.3, 2], [-3.6, -4.8, 3.6, 4.8]],
  ['thick book', `${box(-3.8, -4, 3, 4.8)} ${path([-3.8, -4], [-3, -5], [3.8, -5], [3, -4])} ${path([3.8, -5], [3.8, 3.8], [3, 4.8])} ${path([-2.8, -4], [-2.8, 4.8])}`, [0.1, 0.5, 1.9], [-3.8, -4, 3, 4.8]],
  ['rounded book', `${roundedBox(0, 0, 3.6, 4.8, 0.9)} ${path([-2.6, -4.8], [-2.6, 4.8])}`, [0.5, 0.3, 2], [-3.6, -4.8, 3.6, 4.8]],
  ['tall book', `${box(-3, -5.6, 3, 5.6)} ${path([-2.1, -5.6], [-2.1, 5.6])}`, [0.45, 0.4, 1.8], [-3, -5.6, 3, 5.6]],
  ['wide tome', `${box(-4.8, -3.8, 4.8, 3.8)} ${path([-3.7, -3.8], [-3.7, 3.8])}`, [0.55, 0.2, 2.2], [-4.8, -3.8, 4.8, 3.8]],
  ['open book', 'M0,-3.6 Q-2.4,-2.8 -5.2,-3.6 L-5.2,3.4 Q-2.4,4.2 0,3.4 Q2.4,4.2 5.2,3.4 L5.2,-3.6 Q2.4,-2.8 0,-3.6 L0,3.4', [2.6, 0.2, 1.5], [-5.2, -3.6, 5.2, 3.4]],
  ['book with cut corners', `${closed([-2.8, -4.8], [2.8, -4.8], [3.6, -4], [3.6, 4], [2.8, 4.8], [-2.8, 4.8], [-3.6, 4], [-3.6, -4])} ${path([-2.4, -4.8], [-2.4, 4.8])}`, [0.6, 0.3, 1.9], [-3.6, -4.8, 3.6, 4.8]],
  ['book with tabs', `${box(-3.6, -4.8, 3.6, 4.8)} ${path([-2.6, -4.8], [-2.6, 4.8])} ${path([3.6, 3.2], [4.5, 3.2], [4.5, 2.2], [3.6, 2.2])} ${path([3.6, 1], [4.5, 1], [4.5, 0], [3.6, 0])}`, [0.5, 0.3, 2], [-3.6, -4.8, 3.6, 4.8]],
  ['square book', `${box(-3.9, -3.9, 3.9, 3.9)} ${path([-2.9, -3.9], [-2.9, 3.9])}`, [0.5, 0.2, 2], [-3.9, -3.9, 3.9, 3.9]],
];

// (its middle x, y, its size) => drawing
export const BOOK_SIGNS = [
  ['star', (x, y, s) => star(x, y, 5, s, 0.42 * s)],
  ['moon', (x, y, s) => `M${x + 0.4 * s},${y + s} C${x - 1.3 * s},${y + 0.8 * s} ${x - 1.3 * s},${y - 0.8 * s} ${x + 0.4 * s},${y - s} C${x - 0.4 * s},${y - 0.45 * s} ${x - 0.4 * s},${y + 0.45 * s} ${x + 0.4 * s},${y + s}`],
  ['eye', (x, y, s) => `M${x - s},${y} Q${x},${y + 0.95 * s} ${x + s},${y} Q${x},${y - 0.95 * s} ${x - s},${y} ${oval(x, y, 0.3 * s, 0.3 * s)}`],
  ['flame', (x, y, s) => `M${x},${y - s} C${x - 1.3 * s},${y - 0.4 * s} ${x - 0.4 * s},${y + 0.2 * s} ${x - 0.1 * s},${y + s} C${x + 1.1 * s},${y + 0.2 * s} ${x + s},${y - 0.7 * s} ${x},${y - s}`],
  ['pentagram', (x, y, s) => closed(...[90, 234, 18, 162, 306].map((a) => polar(x, y, s, a)))],
  ['gem', (x, y, s) => `${diamond(x, y, 0.75 * s, s)} ${path([x - 0.75 * s, y], [x + 0.75 * s, y])}`],
  ['sun', (x, y, s) => `${oval(x, y, 0.42 * s, 0.42 * s)} ${rays(x, y, 0.66 * s, s, [0, 45, 90, 135, 180, 225, 270, 315])}`],
  ['leaf', (x, y, s) => `M${x - 0.7 * s},${y - s} Q${x - s},${y + 0.6 * s} ${x + 0.7 * s},${y + s} Q${x + s},${y - 0.6 * s} ${x - 0.7 * s},${y - s} ${path([x - 0.7 * s, y - s], [x + 0.3 * s, y + 0.4 * s])}`],
  ['bolt', (x, y, s) => path([x + 0.35 * s, y + s], [x - 0.5 * s, y - 0.1 * s], [x + 0.4 * s, y - 0.1 * s], [x - 0.35 * s, y - s])],
  ['heart', (x, y, s) => heart(x, y, 0.9 * s)],
  ['spiral', (x, y, s) => `N A${x + 0.25 * s},${y} ${0.25 * s} 180 360 A${x},${y} ${0.5 * s} 0 180 A${x + 0.25 * s},${y} ${0.75 * s} 180 360`],
];

// (left, bottom, right, top of the cover) => drawing
const BOOK_FITTINGS = [
  ['', () => ''],
  ['corner guards', (x0, y0, x1, y1) => `${path([x1 - 1.3, y1], [x1, y1 - 1.3])} ${path([x1 - 1.3, y0], [x1, y0 + 1.3])}`],
  ['clasp', (x0, y0, x1) => box(x1 - 1.3, -0.55, x1 + 0.5, 0.55)],
  ['ribbed spine', (x0, y0, x1, y1) => [0.25, 0.5, 0.75].map((f) => path([x0, y0 + f * (y1 - y0)], [x0 + 1, y0 + f * (y1 - y0)])).join(' ')],
  ['bookmark', (x0, y0, x1) => path([x1 - 1.6, y0], [x1 - 1.6, y0 - 1.7], [x1 - 1.1, y0 - 1.1], [x1 - 0.6, y0 - 1.7], [x1 - 0.6, y0])],
  ['studs', (x0, y0, x1, y1) => `${dot(x1 - 0.7, y1 - 0.7)} ${dot(x1 - 0.7, y0 + 0.7)} ${dot(x0 + 1.7, y1 - 0.7)} ${dot(x0 + 1.7, y0 + 0.7)}`],
  ['title bar', (x0, y0, x1, y1) => box((x0 + x1) / 2 - 0.9, y1 - 1.5, (x0 + x1) / 2 + 1.9, y1 - 0.7)],
  ['strap', (x0, y0, x1, y1) => `${path([x0, y0 + 1.4], [x1, y0 + 1.4])} ${path([x0, y0 + 0.7], [x1, y0 + 0.7])}`],
];

// (right, top of the cover) => drawing
const BOOK_EXTRAS = [
  ['', () => ''],
  ['sparkles', (x1, y1) => `${sparkle(x1 + 1.3, y1 + 0.3, 0.9)} ${sparkle(x1 + 0.4, y1 + 1.9, 0.6)}`],
  ['magic dust', (x1, y1) => `${dot(-1.4, y1 + 1)} ${dot(0, y1 + 1.8)} ${dot(1.4, y1 + 1)}`],
  ['glowing', (x1, y1) => `${path([0, y1 + 0.7], [0, y1 + 1.9])} ${path([-1.8, y1 + 0.6], [-2.5, y1 + 1.6])} ${path([1.8, y1 + 0.6], [2.5, y1 + 1.6])}`],
  ['swirl', (x1) => wavy([x1 + 1.5, -2.6], [x1 + 1.5, 2.6], 3, 0.4)],
  ['quill', (x1) => `M${x1 + 1.2},-3 Q${x1 + 3.4},0 ${x1 + 2.6},3.6 Q${x1 + 1.2},0.6 ${x1 + 1.2},-3`],
  ['little stars', (x1, y1) => `${star(x1 + 1.2, y1 + 0.2, 4, 0.9, 0.35)} ${star(-x1 - 1.2, y1 - 1.2, 4, 0.7, 0.3)}`],
];

const books = flatFamily({
  cat: 'loot', count: 500, sizes: [BOOK_SIGNS.length, BOOK_COVERS.length, BOOK_FITTINGS.length, BOOK_EXTRAS.length],
  make: ([sign, cover, fitting, extra], k) => ({
    id: `spell-book-${k}`, name: `Spell book ${k}`, sub: 'Spell books',
    tags: words('tome grimoire magic wizard read', BOOK_SIGNS[sign][0], BOOK_COVERS[cover][0], BOOK_FITTINGS[fitting][0], BOOK_EXTRAS[extra][0]),
    draw: () => {
      const [, d, [x, y, s], [x0, y0, x1, y1]] = BOOK_COVERS[cover];
      return [d, BOOK_SIGNS[sign][1](x, y, s), BOOK_FITTINGS[fitting][1](x0, y0, x1, y1), BOOK_EXTRAS[extra][1](x1, y1)].filter(Boolean).join(' ');
    },
  }),
});

export const LOOT_SHAPES = [...goblets, ...pots, ...barrels, ...chests, ...pieces, ...mushrooms, ...rings2d, ...coins, ...scrolls, ...books];
export const LOOT_HEADINGS = ['Goblets', 'Pots', 'Barrels', 'Chests', 'Game pieces', 'Mushrooms', 'Rings', 'Coins', 'Scrolls', 'Spell books'];
