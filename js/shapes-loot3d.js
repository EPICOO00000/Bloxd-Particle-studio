// The "3D loot" tab: potions, goblets, pots, barrels, chests, gems, crowns,
// game pieces, mushrooms and rings in 3D, each kind put together from a few
// parts (shape-mix.js says how the parts are dealt out, shape-build.js how a
// drawing becomes a thing in 3D). A drawing is written in a box of about 20
// units; a thing that is 13 units high has about one unit between two particles.

import { RAD, makeNet, joinNets } from './shape-kit.js';
import { turned, thick, plate, lines, moved, solidFamily } from './shape-build.js';
import { edgeOf as edge, path, closed, oval, bow, dot, box, polar, star, heart, diamond, ball, zigzag, wavy, roundedBox, ringOf } from './shape-mix.js';

const words = (...parts) => parts.filter(Boolean).join(' ');
/** Lone particles. */
export const specks = (...points) => makeNet(points, []);
/** The text of a profile, and a ring where it is so high. */
export const ringOn = (d, ...heights) => `${d} ${heights.map((y) => dot(...edge(d).right(y))).join(' ')}`;

// How a turned thing is cut across: [search words, how many times its profile is drawn, where the first one stands, round or with corners]
export const CUTS = [['round', 3, 270, true], ['square', 4, 45, false]];
const part = (p) => (typeof p === 'string' ? { d: p } : p || {});
/**
 * A turned thing from its parts. A part is the text of a profile, or
 * { d: profile, side: what stands on its right (a handle), both: on its right and on its left, nets: other nets }.
 */
export function vessel([, sides, first, round], ...parts) {
  const all = parts.map(part);
  const text = (key) => all.map((p) => p[key]).filter(Boolean).join(' ');
  const reach = round ? 1 : Math.cos(Math.PI / sides); // how far its faces are from the axis, as a part of how far its corners are
  const [right, left] = [`${text('side')} ${text('both')}`.trim(), text('both')];
  return [
    turned(text('d'), { sides, first, round }),
    right && plate(right, (x, y) => [x * reach, y, 0]),
    left && plate(left, (x, y) => [-x * reach, y, 0]),
    ...all.flatMap((p) => p.nets || []),
  ];
}
/** Points half way between the profiles of a turned thing, `r` from the axis (on its faces, when it has corners). */
export const between = ([, sides, first, round], r, y) => Array.from({ length: sides }, (_, i) => {
  const a = (first + (i + 0.5) * (360 / sides)) * RAD;
  const far = round ? r : r * Math.cos(Math.PI / sides);
  return [far * Math.cos(a), y, far * Math.sin(a)];
});
/** Where a drawing goes that is put on the front of a turned thing, `r` from the axis. */
export const onFront = ([, sides, , round], r) => (round
  ? (x, y) => [r * Math.sin(x / r), y, r * Math.cos(x / r)]
  : (x, y) => [x, y, r * Math.cos(Math.PI / sides)]);
/** Three legs. */
const legs = (d) => turned(d, { sides: 3, first: 90 });

// ---------------------------------------------------------------- potions
//
// A bottle with its mouth at the height 5. Bottle, what is on it, what is in it, what closes it, how it is cut.
// [search words, profile from the middle of the bottom to the mouth, radius of the mouth, radius of the bottom, middle of the belly, level of the drink]

const BOTTLES = [
  ['round flask', 'M0,-4 L2,-4 C5.2,-3.2 5,1.6 1,2.6 L1,5', 1, 2, -0.8, -0.4],
  ['cone flask', 'M0,-4 L4,-4 L1,2.2 L1,5', 1, 4, -1.8, -1.8],
  ['vial tube', 'M0,-4 C2,-4 2.4,-3.4 2.4,-2 L2.4,5', 2.4, 0, 0.6, 2],
  ['shouldered bottle', 'M0,-4 L3,-4 L3,1.6 L1,2.8 L1,5', 1, 3, -1.2, 0],
  ['drop bottle', 'M0,-4 C4.6,-4 4.6,-0.6 2.4,1.2 C1.4,2.2 1,2.8 1,5', 1, 0, -1.6, -1],
  ['crystal bottle', 'M0,-4 L1,-4 L4,-0.6 L1,2.8 L1,5', 1, 1, -0.6, -0.6],
  ['jar', 'M0,-4 L3.2,-4 L3.2,3.4 L2.4,3.9 L2.4,5', 2.4, 3.2, -0.4, 1.4],
  ['gourd', 'M0,-4 L1.6,-4 C4.8,-3.4 4.6,0 2,0.6 C3.6,1.2 3.4,3.4 1,3.6 L1,5', 1, 1.6, -1.7, -1.2],
  ['bell flask', 'M0,-4 L4.4,-4 C4.4,-0.5 1,0.5 1,2.6 L1,5', 1, 4.4, -2.2, -2],
  ['long neck', 'M0,-4 L1.6,-4 C4.4,-3.6 4.4,-0.2 1,0.2 L1,5', 1, 1.6, -1.9, -1.6],
  ['footed bottle', 'M0,-4 L2.2,-4 L1,-3 C4.6,-2 4.6,1.8 1,2.8 L1,5', 1, 2.2, -0.2, 0.2],
];

// (radius of the mouth) => profile
const STOPPERS = [
  ['cork', (m) => `M${m},5 L${m},6.3 L0,6.3 ${dot(m, 6.3)}`],
  ['ball stopper', (m) => `N E0,${5.2 + m} ${m + 0.3} ${m + 0.3} -90 90`],
  ['open lip', (m) => `M${m},5 L${m + 1.1},5.8 ${dot(m + 1.1, 5.8)}`],
  ['lid cap', (m) => `M${m},5 L${m + 1},5 L${m + 1},6.1 L0,6.1 ${dot(m + 1, 6.1)}`],
  ['crystal stopper', (m) => `M${m},5 L${m + 0.6},6.4 L0,8.2`],
];

// (outline of the bottle, level of the drink, middle of the belly) => part
const DRINKS = [
  ['empty', () => ''],
  ['half full', (b, lvl) => dot(...b.right(lvl))],
  ['full', (b, lvl) => `${path([0, lvl], b.right(lvl))} ${dot(...b.right(lvl))}`],
  ['two layers', (b, lvl) => `${dot(...b.right(lvl))} ${dot(...b.right((lvl - 4) / 2))}`],
  ['ripples', (b, lvl) => `${dot(...b.right(lvl))} ${dot(b.right(lvl)[0] * 0.5, lvl)}`],
  ['love heart', (b, lvl, c) => ({ nets: [plate(heart(0, c, Math.min(1.5, b.right(c)[0] - 1.2)))] })],
  ['star magic', (b, lvl, c) => ({ nets: [plate(star(0, c, 5, Math.min(1.7, b.right(c)[0] - 1.1), Math.min(1.7, b.right(c)[0] - 1.1) * 0.45))] })],
];

// (outline of the bottle, radius of the mouth, radius of the bottom, middle of the belly, how it is cut) => part
const BOTTLE_TRIMS = [
  ['', () => ''],
  ['handle jug', (b, m, base, c) => ({ side: bow([m, 4.4], b.right(c + 1), 0.8) })],
  ['two handles', (b, m, base, c) => ({ both: bow([m, 4.4], b.right(c + 1), 0.8) })],
  ['neck band', (b, m) => dot(m, 3.9)],
  ['tag', (b, m) => ({ side: `${path([m, 4.4], [m + 2.6, 4.6])} ${box(m + 2.6, 3.2, m + 4, 4.6)}` })],
  ['label', (b, m, base, c, cut) => ({ nets: [plate(box(-1.3, c - 0.9, 1.3, c + 0.9), onFront(cut, b.right(c)[0]))] })],
  ['glowing sparks', (b, m) => ({ nets: [specks([m + 1.6, 6.6, 0], [m + 2.7, 5.4, 0.5], [m + 2.9, 7.2, -0.5])] })],
  ['dripping', (b, m) => ({ side: path([m + 0.9, 4.7], [m + 0.9, 3.3]) })],
  ['on legs', (b, m, base) => ({ nets: [legs(`M${Math.max(1, base * 0.6)},-4 L${Math.max(1, base * 0.6) + 0.9},-5.5`)] })],
];

const potions = solidFamily({
  cat: 'loot3d', count: 500, sizes: [BOTTLES.length, BOTTLE_TRIMS.length, DRINKS.length, STOPPERS.length, CUTS.length],
  make: ([bottle, trim, drink, stopper, cut], k) => ({
    id: `3d-potion-${k}`, name: `3D potion ${k}`, sub: '3D potions',
    tags: words('bottle flask magic drink brew elixir', BOTTLES[bottle][0], BOTTLE_TRIMS[trim][0], DRINKS[drink][0], STOPPERS[stopper][0], CUTS[cut][0]),
    build: () => {
      const [, line, m, base, c, lvl] = BOTTLES[bottle];
      const b = edge(line);
      return vessel(CUTS[cut], `${line} ${dot(m, 5)} ${base ? dot(base, -4) : ''}`, STOPPERS[stopper][1](m), DRINKS[drink][1](b, lvl, c), BOTTLE_TRIMS[trim][1](b, m, base, c, CUTS[cut]));
    },
  }),
});

// ---------------------------------------------------------------- goblets
//
// A foot from the height -5 to -3.6, a stem up to 0 and a cup above it; the stem is 0.6 from the axis at both ends.

// [search words, profile from the stem to the rim, the rim]
export const CUPS = [
  ['chalice', 'M0.6,0 C3,0 3.4,2 3.4,4.6', [3.4, 4.6]],
  ['cone cup', 'M0.6,0 L3.6,4.6', [3.6, 4.6]],
  ['tumbler', 'M0.6,0 L3,0 L3,4.6', [3, 4.6]],
  ['tulip cup', 'M0.6,0 C4.6,0.4 3.8,3 2.6,4.6', [2.6, 4.6]],
  ['bowl', 'M0.6,0 C3,0.2 4.6,1 4.6,2.8', [4.6, 2.8]],
  ['trumpet cup', 'M0.6,0 C1,2.6 2.2,3.8 4,4.6', [4, 4.6]],
  ['ball cup', 'M0.6,0 C5.2,0.2 4.8,4.4 2,4.8', [2, 4.8]],
  ['angular cup', 'M0.6,0 L3.2,1.4 L3.2,3.2 L2.4,4.6', [2.4, 4.6]],
  ['stepped cup', 'M0.6,0 L2,0 L2,1.8 L3.4,1.8 L3.4,4.6', [3.4, 4.6]],
  ['bell cup', 'M0.6,0 C0.6,2.8 3,2 3.8,4.6', [3.8, 4.6]],
  ['waisted cup', 'M0.6,0 C3.8,0 3.6,2 2.4,2.4 C3.8,2.8 3.6,4.2 3.2,4.6', [3.2, 4.6]],
];

export const STEMS = [
  ['', 'M0.6,-3.6 L0.6,0'],
  ['knob', ringOn('M0.6,-3.6 L0.6,-2.8 C2.2,-2.8 2.2,-0.8 0.6,-0.8 L0.6,0', -1.8)],
  ['collar', 'M0.6,-3.6 L0.6,0 D2,-1.8'],
  ['thick stem', 'M0.6,-3.6 L1.5,-3 L1.5,-0.6 L0.6,0'],
  ['baluster', 'M0.6,-3.6 C2.8,-3.2 0.2,-1.4 1.6,-0.6 L0.6,0'],
  ['two beads', 'M0.6,-3.6 L1.6,-2.7 L0.6,-1.8 L1.6,-0.9 L0.6,0'],
  ['cone stem', 'M0.6,-3.6 L2,-3.6 L0.6,0 D2,-3.6'],
  ['ball stem', ringOn('M0.6,-3.6 C3.2,-3.4 3.2,-0.2 0.6,0', -1.8)],
  ['bead under the cup', 'M0.6,-3.6 L0.6,-1.6 C2.2,-1.6 2.2,0 0.6,0'],
];

// [search words, profile up to the stem, a net of its own]
export const GOBLET_FEET = [
  ['', 'M0,-5 L2.8,-5 L0.6,-3.6 D2.8,-5'],
  ['domed foot', 'M0,-5 L3,-5 C3,-3.8 1,-4.2 0.6,-3.6 D3,-5'],
  ['stepped foot', 'M0,-5 L3.2,-5 L3.2,-4.3 L1.8,-4.3 L0.6,-3.6 D3.2,-5'],
  ['small foot', 'M0,-5 L1.9,-5 L0.6,-3.6 D1.9,-5'],
  ['wide foot', 'M0,-5 L3.9,-5 L0.6,-4.2 L0.6,-3.6 D3.9,-5'],
  ['ball foot', ringOn('M0,-5.6 C2.6,-5.6 2.6,-3.6 0.6,-3.6', -4.6)],
  ['three legs', 'M0,-3.6 L0.6,-3.6', () => legs('M0,-3.6 Q2.6,-3.6 3.2,-5.2')],
];

// (outline of the cup, its rim, how it is cut) => part
const GOBLET_TRIMS = [
  ['', () => ''],
  ['full drink wine', (cup, [, ry]) => dot(...cup.right(ry - 1.2))],
  ['two handles trophy', (cup, rim) => ({ both: bow(rim, cup.right(0.9), 0.9) })],
  ['banded cup', (cup, [, ry]) => dot(...cup.right(ry * 0.5))],
  ['steaming', (cup, [, ry]) => `${dot(0, ry + 1.2)} ${dot(0, ry + 2.5)}`],
];

const goblets = solidFamily({
  cat: 'loot3d', count: 500, sizes: [CUPS.length, STEMS.length, GOBLET_FEET.length, GOBLET_TRIMS.length, CUTS.length],
  make: ([cup, stem, foot, trim, cut], k) => ({
    id: `3d-goblet-${k}`, name: `3D goblet ${k}`, sub: '3D goblets',
    tags: words('cup chalice grail wine drink', CUPS[cup][0], STEMS[stem][0], GOBLET_FEET[foot][0], GOBLET_TRIMS[trim][0], CUTS[cut][0]),
    build: () => {
      const [, line, rim] = CUPS[cup];
      const [, standing, own] = GOBLET_FEET[foot];
      return [...vessel(CUTS[cut], `${line} ${dot(...rim)}`, STEMS[stem][1], standing, GOBLET_TRIMS[trim][1](edge(line), rim, CUTS[cut])), own && own()];
    },
  }),
});

// ---------------------------------------------------------------- pots
//
// The belly from the height -5 up to the shoulder (1.8 from the axis, at the height 3), a neck above it and what is on it.

export const BELLIES = [
  ['round pot', 'M0,-5 L2,-5 C5.4,-3.6 5,1.6 1.8,3 D2,-5'],
  ['ball pot', 'M0,-5 L1.4,-5 C6.2,-4.6 6,2.6 1.8,3 D1.4,-5'],
  ['amphora', 'M0,-5 C1.2,-3 4.6,-1 4.4,0.6 C4.2,2 2.6,2.6 1.8,3'],
  ['squat pot', 'M0,-5 L3.4,-5 C6,-4 5.6,-0.4 3,0.4 L1.8,3 D3.4,-5'],
  ['straight pot', 'M0,-5 L3.6,-5 L3.6,2 L1.8,3 D3.6,-5 D3.6,2'],
  ['flower pot', 'M0,-5 L2.4,-5 L4.2,2.2 L1.8,3 D2.4,-5 D4.2,2.2'],
  ['cone pot', 'M0,-5 L4.4,-5 L1.8,3 D4.4,-5'],
  ['barrel pot', 'M0,-5 L3,-5 C4.9,-3 4.9,1 3.2,2.4 L1.8,3 D3,-5'],
  ['gourd pot', 'M0,-5 L2,-5 C5.6,-4.4 5,-1 2.6,-0.4 C4,0.2 3.8,2.6 1.8,3 D2,-5'],
  ['urn', 'M0,-5 L2.6,-5 L1.2,-3.8 C5.6,-3 5.2,2 1.8,3 D2.6,-5'],
  ['angular pot', 'M0,-5 L2,-5 L4.8,-1 L1.8,3 D2,-5 D4.8,-1'],
];

// [search words, profile from the shoulder up, the mouth]
export const NECKS = [
  ['', 'M1.8,3 L1.8,4.2 D1.8,4.2', [1.8, 4.2]],
  ['flared neck', 'M1.8,3 C1.8,3.8 2.4,4.2 3.2,4.6 D3.2,4.6', [3.2, 4.6]],
  ['tall neck', 'M1.8,3 L1.8,6 D1.8,6', [1.8, 6]],
  ['wide mouth', 'D1.8,3', [1.8, 3]],
  ['collar', 'M1.8,3 L1.8,3.9 L3.4,3.9 D3.4,3.9', [3.4, 3.9]],
  ['bottle neck', 'M1.8,3 L1,4.4 L1,5.6 D1,5.6', [1, 5.6]],
  ['rolled lip', 'M1.8,3 L1.8,3.8 C3.2,3.8 3.2,5.2 1.8,5.2 D1.8,5.2', [1.8, 5.2]],
  ['stepped neck', 'M1.8,3 L2.8,3 L2.8,4.2 L1.8,4.2 L1.8,5.4 D1.8,5.4', [1.8, 5.4]],
  ['funnel neck', 'M1.8,3 L3,5.4 D3,5.4', [3, 5.4]],
];

// (the mouth) => part
const POT_LIDS = [
  ['open', () => ''],
  ['lid with a knob', ([r, h]) => `M${r + 0.8},${h + 0.9} L0,${h + 0.9} L0,${h + 2.2} ${dot(r + 0.8, h + 0.9)}`],
  ['domed lid', ([r, h]) => `M${r},${h} C${r},${h + 1.5} ${r * 0.5},${h + 2.1} 0,${h + 2.1}`],
  ['pointed lid', ([r, h]) => `M${r},${h} L0,${h + 2.6}`],
  ['cork', ([r, h]) => `M${r},${h} L${r},${h + 1.3} L0,${h + 1.3} ${dot(r, h + 1.3)}`],
  ['plant sprout', ([, h]) => ({ d: `M0,${h - 0.6} L0,${h + 3}`, nets: [plate(`${bow([0, h + 1.2], [2, h + 2.6], -0.5)} ${bow([0, h + 2], [-1.8, h + 3.6], 0.5)}`)] })],
  ['steam smoke', ([, h]) => `${dot(0, h + 1.2)} ${dot(0, h + 2.5)} ${dot(0, h + 3.8)}`],
];

// (outline of the belly) => part
const POT_HANDLES = [
  ['', () => ''],
  ['two handles', (b) => ({ both: bow(b.right(2.2), b.right(-0.8), 0.9) })],
  ['two bands', (b) => `${dot(...b.right(-1.4))} ${dot(...b.right(0.8))}`],
  ['on legs', () => ({ nets: [legs('M1.4,-5 L2.4,-6.6')] })],
  ['handle jug', (b) => ({ side: bow(b.right(2.2), b.right(-0.8), 0.9) })],
];

const pots = solidFamily({
  cat: 'loot3d', count: 500, sizes: [BELLIES.length, NECKS.length, POT_LIDS.length, POT_HANDLES.length, CUTS.length],
  make: ([belly, neck, lid, handle, cut], k) => ({
    id: `3d-pot-${k}`, name: `3D pot ${k}`, sub: '3D pots',
    tags: words('vase urn jar clay loot', BELLIES[belly][0], NECKS[neck][0], POT_LIDS[lid][0], POT_HANDLES[handle][0], CUTS[cut][0]),
    build: () => vessel(CUTS[cut], BELLIES[belly][1], NECKS[neck][1], POT_LIDS[lid][1](NECKS[neck][2]), POT_HANDLES[handle][1](edge(BELLIES[belly][1]))),
  }),
});

// ---------------------------------------------------------------- barrels
//
// Staves, what is on its side, hoops, what is on top, and how many staves show.
// [search words, profile from the middle of the bottom to the top, its top]

export const STAVES = [
  ['', 'M0,-5 L3,-5 C4.6,-3 4.6,3 3,5', [3, 5]],
  ['tub', 'M0,-5 L3.6,-5 L3.6,5', [3.6, 5]],
  ['keg', 'M0,-5 L2.4,-5 C3.6,-3 3.6,3 2.4,5', [2.4, 5]],
  ['bucket', 'M0,-5 L2.8,-5 L4,5', [4, 5]],
  ['squat barrel', 'M0,-3.6 L4,-3.6 C5.6,-2 5.6,2 4,3.6', [4, 3.6]],
  ['cask', 'M0,-5 L3,-5 L4,-2.5 L4,2.5 L3,5', [3, 5]],
  ['vat', 'M0,-5 L4,-5 L3,5', [3, 5]],
  ['double barrel', 'M0,-5 L2.8,-5 C4.4,-4 4.4,-1 3.2,0 C4.4,1 4.4,4 2.8,5', [2.8, 5]],
  ['tapered keg', 'M0,-5 L2.2,-5 C3.8,-4 4.2,2 3.6,5', [3.6, 5]],
  ['waisted barrel', 'M0,-5 L3.8,-5 C2.6,-3 2.6,3 3.8,5', [3.8, 5]],
  ['low tub', 'M0,-3 L4.2,-3 L4.6,3', [4.6, 3]],
];

// the hoops, as parts of the height from the middle to the top
export const HOOPS = [['two hoops', [-0.5, 0.5]], ['one hoop', [0]], ['three hoops', [-0.56, 0, 0.56]], ['no hoops', []], ['end hoops', [-0.7, 0.7]], ['middle hoops', [-0.2, 0.2]], ['low hoops', [-0.56, 0]]];

// (outline of the staves, its top) => part
const BARREL_TOPS = [
  ['closed lid', (b, [r, h]) => path([0, h], [r, h])],
  ['open water', (b, [, h]) => dot(...b.right(h - 1.3))],
  ['lid with a knob', (b, [r, h]) => `${path([0, h], [r, h])} ${path([0, h], [0, h + 1.5])}`],
  ['heaped full', (b, [r, h]) => `M${r},${h} C${r},${h + 1.5} ${r * 0.5},${h + 2.1} 0,${h + 2.1}`],
  ['powder keg fuse', (b, [r, h]) => ({ d: path([0, h], [r, h]), nets: [plate(`M0,${h} Q0.2,${h + 1.8} 1.8,${h + 2.4}`), specks([2.9, h + 2.8, 0], [1.9, h + 3.6, 0], [2.7, h + 1.5, 0])] })],
];

const BARREL_SIDES = [
  ['', () => ''],
  ['tap', (b, [, h]) => ({ side: path(b.right(-h * 0.5), [b.right(-h * 0.5)[0] + 1.8, -h * 0.5], [b.right(-h * 0.5)[0] + 1.8, -h * 0.5 - 1.3]) })],
  ['rope handles', (b, [, h]) => ({ both: bow(b.right(h * 0.62), b.right(h * 0.1), 1) })],
  ['on legs', (b, [, h]) => ({ nets: [legs(`M2,${-h} L2.9,${-h - 1.7}`)] })],
  ['tag', (b, [, h]) => ({ side: `${path(b.right(h * 0.3), [b.right(h * 0.3)[0] + 2.2, h * 0.3 + 0.2])} ${box(b.right(h * 0.3)[0] + 2.2, h * 0.3 - 1.2, b.right(h * 0.3)[0] + 3.6, h * 0.3 + 0.2)}` })],
  ['ladle', (b, [r, h]) => ({ nets: [plate(path([0.6, h - 2.4], [r + 1.4, h + 2.8]), (x, y) => [x * 0.7, y, x * 0.7])] })],
  ['arrow stuck', (b) => ({ side: `${path(b.right(0.9), [b.right(0.9)[0] + 3.4, 2.4])} ${path([b.right(0.9)[0] + 2.2, 2.9], [b.right(0.9)[0] + 3.4, 2.4], [b.right(0.9)[0] + 3.1, 1.2])}` })],
  ['grass', (b, [, h]) => ({ nets: [turned(`M${b.right(-h)[0] + 0.7},${-h} L${b.right(-h)[0] + 1.5},${-h + 1.6}`, { sides: 5, first: 20 })] })],
  ['pebbles', (b, [, h]) => ({ nets: [specks([b.right(-h)[0] + 1.2, -h, 0.8], [-b.right(-h)[0] - 1, -h, 1.2], [0.6, -h, b.right(-h)[0] + 1.2])] })],
];

// [search words, how many staves show, where the first one stands, round]
const BARREL_CUTS = [['', 3, 270, true], ['many staves', 6, 30, true]];

const barrels = solidFamily({
  cat: 'loot3d', count: 500, sizes: [STAVES.length, BARREL_SIDES.length, HOOPS.length, BARREL_TOPS.length, BARREL_CUTS.length],
  make: ([staves, side, hoops, top, cut], k) => ({
    id: `3d-barrel-${k}`, name: `3D barrel ${k}`, sub: '3D barrels',
    tags: words('keg cask wood loot', STAVES[staves][0], BARREL_SIDES[side][0], HOOPS[hoops][0], BARREL_TOPS[top][0], BARREL_CUTS[cut][0]),
    build: () => {
      const [, line, rim] = STAVES[staves];
      const b = edge(line);
      return vessel(BARREL_CUTS[cut], `${line} ${dot(...rim)} ${dot(...b.right(-rim[1]))}`, HOOPS[hoops][1].map((f) => dot(...b.right(f * rim[1]))).join(' '), BARREL_TOPS[top][1](b, rim), BARREL_SIDES[side][1](b, rim));
    },
  }),
});

// ---------------------------------------------------------------- chests
//
// Seen from its end, the box is 3 to each side (the front on the right) and its top at the height 1; the lid is above.
// The box is then made as long as it is. Lock, lid, fittings, how big.

const LIDS = [
  ['flat lid', path([-3, 1], [-3, 2.3], [3, 2.3], [3, 1])],
  ['arched lid', bow([-3, 1], [3, 1], 1)],
  ['low lid', bow([-3, 1], [3, 1], 0.5)],
  ['peaked lid', path([-3, 1], [0, 3.4], [3, 1])],
  ['sloped lid', path([-3, 1], [-1.8, 2.8], [1.8, 2.8], [3, 1])],
  ['open lid', closed([-3, 1], [-4, 1.5], [-2.6, 5], [-1.6, 4.5])],
  ['half open', closed([-3, 1], [-3.5, 2], [2.1, 4.8], [2.6, 3.8])],
  ['rounded lid', 'M-3,1 Q-3,2.8 -1.4,2.8 L1.4,2.8 Q3,2.8 3,1'],
  ['ridged lid', `${bow([-3, 1], [3, 1], 0.8)} ${dot(0, 3.4)}`],
];

// On the front, below the lid: drawn around (0, -0.7), not higher than 0.2.
export const LOCKS = [
  ['padlock', `${box(-0.9, -1.9, 0.9, -0.6)} ${bow([-0.6, -0.6], [0.6, -0.6], 1.1)}`],
  ['keyhole', `${oval(0, -0.8, 1.1, 1.1)} ${path([0, -0.4], [0, -1.3])}`],
  ['latch bar', box(-1.4, -1.3, 1.4, -0.2)],
  ['ring pull', ball([0, 0.2], [0, -1.2], 0.85)],
  ['two latches', `${box(-1.5, -1.5, -0.5, -0.1)} ${box(0.5, -1.5, 1.5, -0.1)}`],
  ['gem lock', diamond(0, -0.9, 1.1, 1.1)],
  ['star lock', star(0, -0.9, 5, 1.2, 0.55)],
  ['heart lock', heart(0, -0.8, 1.1)],
  ['no lock', ''],
  ['shield lock', closed([-1, 0.1], [1, 0.1], [1, -1], [0, -1.9], [-1, -1])],
  ['hasp', box(-0.6, -1.9, 0.6, 0.1)],
];

// (half its length, its bottom, outline of the lid) => nets
const FITTINGS = [
  ['', () => []],
  ['iron straps', (w, low, lid) => [-0.66, 0.66].map((f) => plate(`${path([3, low], [3, 1])} ${lid}`, (x, y) => [f * w, y, x]))],
  ['feet', (w, low) => [lines(...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([i, j]) => [[i * w, low, j * 3], [i * (w + 0.5), low - 1.3, j * 3.5]]))]],
  ['plinth', (w, low) => [lines([[-w - 0.9, low - 1, -3.9], [w + 0.9, low - 1, -3.9], [w + 0.9, low - 1, 3.9], [-w - 0.9, low - 1, 3.9], [-w - 0.9, low - 1, -3.9]])]],
  ['handles', (w, low) => [-1, 1].map((side) => plate(bow([-1.2, (1 + low) / 2 + 0.6], [1.2, (1 + low) / 2 + 0.6], -1.1), (x, y) => [side * w, y, x]))],
  ['sparkling', (w) => [plate(`${path([w * 0.3 - 0.9, 6.6], [w * 0.3 + 0.9, 6.6])} ${path([w * 0.3, 5.7], [w * 0.3, 7.5])}`), specks([w * 0.3 + 1.7, 7.9, 0])]],
  ['coins beside', (w, low) => [plate(`${oval(0, 0, 1, 1)} ${oval(2.6, 1.3, 1, 1)}`, (x, y) => [w + 2.2 + y, low, 1 + x])]],
  ['ridge strap', (w, low, lid) => [plate(lid, (x, y) => [0, y, x])]],
];

// [search words, half its length, how high the box is]
const TRUNKS = [['', 5, 4], ['short', 4, 4], ['long', 6, 3.4], ['strongbox', 3.4, 4.4], ['low', 5, 3.2], ['tall', 4.2, 5], ['big trunk', 6, 4.6]];

const chests = solidFamily({
  cat: 'loot3d', count: 500, sizes: [LOCKS.length, LIDS.length, FITTINGS.length, TRUNKS.length],
  make: ([lock, lid, fitting, trunk], k) => ({
    id: `3d-chest-${k}`, name: `3D chest ${k}`, sub: '3D chests',
    tags: words('treasure box trunk loot', LOCKS[lock][0], LIDS[lid][0], FITTINGS[fitting][0], TRUNKS[trunk][0]),
    build: () => {
      const [, w, high] = TRUNKS[trunk];
      const low = 1 - high;
      return [
        moved(thick(`${box(-3, low, 3, 1)} ${LIDS[lid][1]}`, w), { turn: ['y', -90] }),
        LOCKS[lock][1] && plate(LOCKS[lock][1], (x, y) => [x, y, 3]),
        ...FITTINGS[fitting][1](w, low, LIDS[lid][1]),
      ];
    },
  }),
});

// ---------------------------------------------------------------- gems
//
// A cut gem: its profile is drawn at every corner, and the rings are straight from corner to corner.
// [search words, profile, where it is widest]

const GEM_CUTS = [
  ['brilliant', 'M0,-4 L4,0.8 L2.4,2.6 D4,0.8 D2.4,2.6', [4, 0.8]],
  ['octahedron', 'M0,-4.2 L3.4,0 L0,4.2 D3.4,0', [3.4, 0]],
  ['emerald step cut', 'M1.6,-3.2 L4,-0.4 L4,0.8 L2.4,2.6 D1.6,-3.2 D4,-0.4 D2.4,2.6', [4, -0.4]],
  ['rose cut', 'M4,-1.6 L3,0.8 L0,2.6 D4,-1.6 D3,0.8', [4, -1.6]],
  ['briolette drop', 'M0,-4.4 L2.6,-2.6 L2.4,0.6 L0,4.8 D2.6,-2.6 D2.4,0.6', [2.6, -2.6]],
  ['crystal shard', 'M0,-5.4 L2,-3.4 L2,3.4 L0,5.4 D2,-3.4 D2,3.4', [2, -3.4]],
  ['lens', 'M0,-2.2 L4.6,0 L0,2.2 D4.6,0', [4.6, 0]],
  ['obelisk crystal', 'M1.4,-5 L2.2,2.6 L0,5.4 D1.4,-5 D2.2,2.6', [2.2, 2.6]],
  ['table cut', 'M2.2,-2.6 L4,0 L2.2,2.6 D2.2,-2.6 D4,0 D2.2,2.6', [4, 0]],
  ['kite cut', 'M0,-5 L3,1.6 L0,3.4 D3,1.6', [3, 1.6]],
  ['bead', 'M0,-3.8 L3.3,-1.9 L3.3,1.9 L0,3.8 D3.3,-1.9 D3.3,1.9', [3.3, 1.9]],
];

const GEM_SIDES = [['four sided', 4], ['five sided', 5], ['six sided', 6], ['eight sided', 8], ['three sided', 3]];

// (outline of the gem, where it is widest, its bottom, its top, the profile, how it is turned) => part
const FACETS = [
  ['', () => ''],
  ['lower facets', (e, [, yg], low) => (yg - low > 2 ? dot(...e.right((yg + low) / 2)) : '')],
  ['upper facets', (e, [, yg], low, high) => (high - yg > 2 ? dot(...e.right((yg + high) / 2)) : dot(...e.right((yg + low) / 2)))],
  ['core', (e, g, low, high) => path([0, low], [0, high])],
  ['spokes', (e, [rg, yg]) => path([0, yg], [rg, yg])],
  ['gem in a gem', (e, [, yg], low, high, line, turn) => ({ nets: [moved(turned(line, turn), { size: 0.42, to: [0, ((low + high) / 2) * 0.58, 0] })] })],
  ['flaw', (e, [rg, yg], low, high) => ({ nets: [plate(path([-rg * 0.3, (low + high) / 2 - 1], [0.2, (low + high) / 2 + 0.2], [-0.3, (low + high) / 2 + 0.5], [rg * 0.3, (low + high) / 2 + 1.5]))] })],
];

// (where it is widest, its bottom, its top) => nets
const GEM_EXTRAS = [
  ['', () => []],
  ['sparkling', ([rg], low, high) => [plate(`${path([rg + 0.5, high + 0.6], [rg + 2.3, high + 0.6])} ${path([rg + 1.4, high - 0.3], [rg + 1.4, high + 1.5])}`)]],
  ['halo', ([rg, yg]) => [turned(dot(rg + 1.8, yg), { sides: 3 })]],
  ['shards', ([rg], low, high) => [plate(`${diamond(rg + 2, high - 0.4, 0.7, 1.2)} ${diamond(-rg - 1.6, low + 1.4, 0.6, 1)}`)]],
  ['pedestal', (g, low) => [lines([[-2.2, low - 1, -2.2], [2.2, low - 1, -2.2], [2.2, low - 1, 2.2], [-2.2, low - 1, 2.2], [-2.2, low - 1, -2.2]])]],
  ['shining rays', ([rg], low, high) => [plate(`${path([rg * 0.7 + 0.8, high + 0.2], [rg * 0.7 + 2, high + 1.2])} ${path([rg * 0.7 - 0.4, high + 0.9], [rg * 0.7 - 0.1, high + 2.4])} ${path([rg * 0.7 + 1.5, high - 1], [rg * 0.7 + 3, high - 0.8])}`)]],
  ['cushion', (g, low) => [turned(dot(2.3, low - 1), { sides: 3 })]],
  ['glint star', ([rg], low, high) => [plate(star(rg + 1.2, high + 0.6, 4, 1.4, 0.4))]],
];

// (its bottom, its top, where it is widest) => nets
const SETTINGS = [
  ['', () => []],
  ['claw setting', (low, high, [rg, yg]) => [turned(`M0,${low - 1.2} L${rg + 0.6},${yg}`, { sides: 4, first: 45 })]],
  ['pendant', (low, high) => [plate(ball([0, high], [0, high + 1.6], 0.9))]],
];

const gems = solidFamily({
  cat: 'loot3d', count: 500, sizes: [GEM_CUTS.length, GEM_EXTRAS.length, FACETS.length, GEM_SIDES.length, SETTINGS.length],
  make: ([cut, extra, facet, sides, setting], k) => ({
    id: `3d-gem-${k}`, name: `3D gem ${k}`, sub: '3D gems',
    tags: words('jewel crystal diamond ruby treasure', GEM_CUTS[cut][0], GEM_EXTRAS[extra][0], FACETS[facet][0], GEM_SIDES[sides][0], SETTINGS[setting][0]),
    build: () => {
      const [, line, widest] = GEM_CUTS[cut];
      const turn = { sides: GEM_SIDES[sides][1], first: 90, round: false };
      const ys = line.match(/-?[\d.]+,-?[\d.]+/g).map((pair) => Number(pair.split(',')[1]));
      const [low, high] = [Math.min(...ys), Math.max(...ys)];
      const more = part(FACETS[facet][1](edge(line), widest, low, high, line, turn));
      return [turned(`${line} ${more.d || ''}`, turn), ...(more.nets || []), ...GEM_EXTRAS[extra][1](widest, low, high), ...SETTINGS[setting][1](low, high, widest)];
    },
  }),
});

// ---------------------------------------------------------------- crowns
//
// A crown is drawn flat, as a strip (x along the band, y up), and bent into a ring.

const BAND = 4; // how far the band is from the axis
const ROUND = 2 * Math.PI * BAND;
const bent = (d, flare) => plate(d, (x, y) => [(BAND + flare * y) * Math.sin(x / BAND), y, (BAND + flare * y) * Math.cos(x / BAND)]);
const across = (y) => path([0, y], [ROUND, y]);

// (where a point begins, how much room it has, the top of the band) => what stands on the band there
const POINTS = [
  ['', (x, p, h) => path([x, h], [x + p / 2, h + 3], [x + p, h])],
  ['pearls on spikes', (x, p, h) => `${path([x + p / 2 - 1.1, h], [x + p / 2, h + 2.2], [x + p / 2 + 1.1, h])} ${ball([x + p / 2, h + 2.2], [x + p / 2, h + 3.5], 0.7)}`],
  ['scallops', (x, p, h) => bow([x, h], [x + p, h], 0.8)],
  ['crosses', (x, p, h) => `${path([x + p / 2, h], [x + p / 2, h + 3.2])} ${path([x + p / 2 - 1, h + 2.1], [x + p / 2 + 1, h + 2.1])}`],
  ['battlements', (x, p, h) => path([x + p / 4, h], [x + p / 4, h + 1.9], [x + (3 * p) / 4, h + 1.9], [x + (3 * p) / 4, h])],
  ['leaves', (x, p, h) => `M${x + p / 2},${h} Q${x + p / 2 - 1.5},${h + 1.6} ${x + p / 2},${h + 3.4} Q${x + p / 2 + 1.5},${h + 1.6} ${x + p / 2},${h}`],
  ['tall and short spikes', (x, p, h) => path([x, h + 1.5], [x + p / 4, h], [x + p / 2, h + 3.4], [x + (3 * p) / 4, h], [x + p, h + 1.5])],
  ['stars', (x, p, h) => `${path([x + p / 2, h], [x + p / 2, h + 1.6])} ${star(x + p / 2, h + 2.5, 4, 1.1, 0.45)}`],
  ['flames', (x, p, h) => `M${x + p / 2 - 1.1},${h} Q${x + p / 2 - 1.2},${h + 2} ${x + p / 2 + 0.3},${h + 3.4} Q${x + p / 2 + 0.2},${h + 1.6} ${x + p / 2 + 1.1},${h}`],
  ['pearls', (x, p, h) => ball([x + p / 2, h], [x + p / 2, h + 1.8], 0.9)],
  ['diamonds', (x, p, h) => closed([x + p / 2, h], [x + p / 2 + 1, h + 1.6], [x + p / 2, h + 3.2], [x + p / 2 - 1, h + 1.6])],
];

// (how many points) => [the band, its top]
const BANDS = [
  ['', () => [`${across(0)} ${across(1.6)}`, 1.6]],
  ['thin band', () => [across(0), 0]],
  ['jewelled band', (k) => [`${across(0)} ${across(2)} ${Array.from({ length: k }, (_, i) => dot(((i + 0.5) * ROUND) / k, 1)).join(' ')}`, 2]],
  ['tall band', () => [`${across(0)} ${across(2.8)}`, 2.8]],
  ['fur band', (k) => [`${wavy([0, 0], [ROUND, 0], 2 * k, 0.35)} ${across(1.6)}`, 1.6]],
  ['lattice band', (k) => [`${across(0)} ${path(...zigzag([0, 0], [ROUND, 0], k, 1.8))}`, 0]],
  ['ribbed band', (k) => [`${across(0)} ${across(1.8)} ${Array.from({ length: k }, (_, i) => path([(i * ROUND) / k, 0], [(i * ROUND) / k, 1.8])).join(' ')}`, 1.8]],
];

// (the top of the band, how far its top is from the axis) => nets
const CROWN_TOPS = [
  ['', () => []],
  ['arches and a ball', (h, r) => [turned(`M${r},${h} C${r},${h + 4.4} 2,${h + 5.2} 0,${h + 5.2} N E0,${h + 6.2} 1 1 -90 90`, { sides: 4, first: 45 })]],
  ['arch and a cross', (h, r) => [turned(`M${r},${h} C${r},${h + 4.4} 2,${h + 5.2} 0,${h + 5.2} L0,${h + 7.4}`, { sides: 2, first: 0 }), plate(path([-1.1, h + 6.4], [1.1, h + 6.4]))]],
  ['velvet cap', (h, r) => [turned(`M${r - 0.5},${h} C${r - 0.5},${h + 2.6} 2,${h + 3.2} 0,${h + 3.2}`, { sides: 3, first: 90 })]],
  ['arch and a gem', (h, r) => [turned(`M${r},${h} C${r},${h + 4.4} 2,${h + 5} 0,${h + 5}`, { sides: 2, first: 90 }), turned(`M0,${h + 5} L1.1,${h + 6.2} L0,${h + 7.4} ${dot(1.1, h + 6.2)}`, { sides: 4, round: false })]],
  ['pointed cap', (h, r) => [turned(`M${r - 0.5},${h} L0,${h + 6}`, { sides: 4, first: 45 })]],
  ['floating gem', (h) => [turned(`M0,${h + 1.2} L1.5,${h + 2.8} L0,${h + 4.4} ${dot(1.5, h + 2.8)}`, { sides: 4, round: false })]],
  ['halo', (h) => [turned(dot(2.2, h + 4.6), { sides: 3 })]],
  ['feather plume', (h, r) => [plate(`M${r},${h} Q${r + 2.4},${h + 4} ${r - 1.4},${h + 7.2} Q${r - 0.2},${h + 3.4} ${r},${h}`)]],
];

const POINT_COUNTS = [5, 4, 6, 3, 7];
const FLARES = [['', 0.12], ['wide open', 0.3]];

const crowns = solidFamily({
  cat: 'loot3d', count: 500, sizes: [POINTS.length, CROWN_TOPS.length, BANDS.length, POINT_COUNTS.length, FLARES.length],
  make: ([point, top, band, count, flare], k) => ({
    id: `3d-crown-${k}`, name: `3D crown ${k}`, sub: '3D crowns',
    tags: words('king queen royal gold tiara', POINTS[point][0], CROWN_TOPS[top][0], BANDS[band][0], `${POINT_COUNTS[count]} points`, FLARES[flare][0]),
    build: () => {
      const points = POINT_COUNTS[count];
      const [strip, high] = BANDS[band][1](points);
      return [
        bent(`${strip} ${Array.from({ length: points }, (_, i) => POINTS[point][1]((i * ROUND) / points, ROUND / points, high)).join(' ')}`, FLARES[flare][1]),
        ...CROWN_TOPS[top][1](high, BAND + FLARES[flare][1] * high),
      ];
    },
  }),
});

// ---------------------------------------------------------------- game pieces
//
// A foot from the height -6 to -4.4, a body up to 2, a neck up to 3 and a head.

// [search words, profile from the neck up, a flat drawing that stands on it]
export const PIECE_HEADS = [
  ['pawn ball', 'M0.8,3 E0,4.5 1.7 1.7 -62 90 D1.7,4.5'],
  ['bishop mitre', ringOn('M0.8,3 C3,3.6 1.6,5.6 0,7', 4.2)],
  ['king cross', ringOn('M0.8,3 C2.4,3.2 2.4,5 0,5.2 L0,7.6', 4.1), path([-1.1, 6.6], [1.1, 6.6])],
  ['queen crown', 'M0.8,3 L2.2,4.6 L2.9,5.9 D2.2,4.6 D0,5.4'],
  ['rook tower', 'M0.8,3 L2.2,3 L2.2,5.2 D2.2,3 D2.2,5.2'],
  ['checker cap', 'M0.8,3 L2.6,3 L2.6,4.3 L0,4.3 D2.6,3 D2.6,4.3'],
  ['wizard cone', 'M0.8,3 L2.4,3 L0,7.4 D2.4,3'],
  ['gem head', 'M0.8,3 L2.2,4.8 L0,6.8 D2.2,4.8'],
  ['hoop head', 'M0.8,3 L0,3.4', oval(0, 5.2, 1.8, 1.8, 270)],
  ['cup head', 'M0.8,3 C2.6,3 2.8,4.4 2.8,5.4 D2.8,5.4'],
  ['star head', 'M0.8,3 L0,3.4', `${path([0, 3.4], [0, 4.6])} ${star(0, 5.6, 5, 2.2, 1)}`],
];

export const PIECE_BODIES = [
  ['', 'M1.8,-4.4 L0.8,2'],
  ['waisted', 'M1.8,-4.4 C0.6,-3 0.6,0 0.8,2'],
  ['pear body', ringOn('M1.8,-4.4 C4,-3.6 3.2,0.6 0.8,2', -2)],
  ['straight body', 'M1.8,-4.4 L1.8,1.2 L0.8,2 D1.8,1.2'],
  ['baluster body', 'M1.8,-4.4 L2.8,-2.6 L1,-0.6 L1.8,1 L0.8,2 D2.8,-2.6'],
  ['hourglass body', 'M1.8,-4.4 L0.7,-1.2 L1.9,1.3 L0.8,2 D1.9,1.3'],
  ['tiered body', 'M1.8,-4.4 L2.6,-4.4 L2.6,-2.2 L1.7,-2.2 L1.7,0 L0.8,0 L0.8,2 D2.6,-2.2 D1.7,0'],
  ['slender body', 'M1.8,-4.4 L0.8,-3.2 L0.8,2'],
  ['bulb body', ringOn('M1.8,-4.4 C1.8,-2 3.6,-1.6 3,0.4 L0.8,2', -0.6)],
];

export const PIECE_FEET = [
  ['', 'M0,-6 L3.4,-6 L3.4,-5.2 L1.8,-4.4 D3.4,-6'],
  ['bell foot', 'M0,-6 L3.8,-6 C2.6,-5.6 2,-5 1.8,-4.4 D3.8,-6'],
  ['two step foot', 'M0,-6 L3.8,-6 L2.6,-5 L1.8,-4.4 D3.8,-6 D2.6,-5'],
  ['domed foot', 'M0,-6 L3.2,-6 C3.2,-4.8 2.4,-4.4 1.8,-4.4 D3.2,-6'],
  ['small foot', 'M0,-6 L2.6,-6 L1.8,-4.4 D2.6,-6'],
  ['wide foot', 'M0,-6 L4.4,-6 L1.8,-5 L1.8,-4.4 D4.4,-6'],
  ['ringed foot', 'M0,-6 L2.4,-6 L1.8,-4.4 D2.4,-6 D4,-6'],
];

export const COLLARS = [
  ['', 'M0.8,2 L0.8,3'],
  ['collar', 'M0.8,2 L0.8,3 D2.2,2.5'],
  ['ruff', 'M0.8,2 L2.3,2 L0.8,3 D2.3,2'],
  ['bead collar', ringOn('M0.8,2 C2.6,2 2.6,3 0.8,3', 2.5)],
  ['double collar', 'M0.8,2 L0.8,3 D2,2 D2,3'],
];

const pieces = solidFamily({
  cat: 'loot3d', count: 500, sizes: [PIECE_HEADS.length, PIECE_BODIES.length, PIECE_FEET.length, COLLARS.length, CUTS.length],
  make: ([head, body, foot, collar, cut], k) => ({
    id: `3d-game-piece-${k}`, name: `3D game piece ${k}`, sub: '3D game pieces',
    tags: words('chess pawn board token figure', PIECE_HEADS[head][0], PIECE_BODIES[body][0], PIECE_FEET[foot][0], COLLARS[collar][0], CUTS[cut][0]),
    build: () => [...vessel(CUTS[cut], PIECE_FEET[foot][1], PIECE_BODIES[body][1], COLLARS[collar][1], PIECE_HEADS[head][1]), PIECE_HEADS[head][2] && plate(PIECE_HEADS[head][2])],
  }),
});

// ---------------------------------------------------------------- mushrooms
//
// A stem from the ground (the height -5) up to 0, where it is 1 from the axis, and a cap on it.

const SIX = ['', 6, 30, true]; // six places around a cap, none on the three lines that draw it

// [search words, profile from the stem out to the rim and up to the top, the rim]
export const CAPS = [
  ['', 'M1,0 L4.4,0 C4.4,3 2.4,4.4 0,4.4', [4.4, 0]],
  ['flat cap', 'M1,0 L4.6,0 C4.8,1.6 4,2.2 0,2.4', [4.6, 0]],
  ['pointed cap', 'M1,0 L4,0 L0,5.4', [4, 0]],
  ['bell cap', 'M1,0 L3.4,-1 C3.4,2 1.6,4.6 0,4.8', [3.4, -1]],
  ['funnel cap chanterelle', 'M1,0 C2.6,0 4.2,0.6 4.8,2.2', [4.8, 2.2]],
  ['puffball', ringOn('M1,0 C5.6,0.2 5,5 0,5', 2.4), [4, 2.4]],
  ['tiered cap', 'M1,0 L4.4,0 L1.6,2.4 L2.8,2.4 L0,4.8', [4.4, 0]],
  ['morel', ringOn('M1,0 C3.4,0.6 3,5 0,6.4', 2.2, 4.2), [2.6, 2.2]],
  ['nippled cap', 'M1,0 L4.8,0 C4.6,1.2 1.4,1.4 0.8,2.2 L0,2.6', [4.8, 0]],
  ['block cap', 'M1,0 L4,0 L4,2.6 L0,2.6 D4,2.6', [4, 0]],
  ['turban cap', 'M1,0 L3.6,0 C5.4,1.6 2,2.6 0.6,3.6 L0,5.2', [3.6, 0]],
];

export const STALKS = [
  ['', 'M0,-5 L1.2,-5 L1,0 D1.2,-5'],
  ['bulb stem', 'M0,-5 L1,-5 C3,-4.8 2.6,-2.6 1,-2 L1,0'],
  ['thick stem', 'M0,-5 L2.2,-5 L1,0 D2.2,-5'],
  ['waisted stem', 'M0,-5 L1.7,-5 C0.6,-3.6 0.6,-1.4 1,0 D1.7,-5'],
  ['skirt', 'M0,-5 L1.2,-5 L1,0 M1.07,-1.6 L2.3,-2.5 D2.3,-2.5'],
  ['cup at the foot', 'M0,-5 L1.2,-5 L1,0 M1.18,-4.4 L2.5,-3.4 D2.5,-3.4'],
  ['stubby stem', 'M0,-5 L2,-5 C2.4,-3 1.6,-1 1,0 D2,-5'],
  ['ringed stem', 'M0,-5 L1.2,-5 L1,0 D1.14,-3.4 D1.07,-1.7'],
];

// (outline of the cap, its rim, how high its top is) => part
const SPOTS = [
  ['', () => ''],
  ['spots', (cap, [, ry], top) => ({ nets: [specks(...between(SIX, cap.right(ry + (top - ry) * 0.36)[0], ry + (top - ry) * 0.36))] })],
  ['many spots', (cap, [, ry], top) => ({ nets: [specks(...between(SIX, cap.right(ry + (top - ry) * 0.24)[0], ry + (top - ry) * 0.24), ...between(SIX, cap.right(ry + (top - ry) * 0.6)[0], ry + (top - ry) * 0.6))] })],
  ['banded cap', (cap, [, ry], top) => dot(...cap.right(ry + (top - ry) * 0.5))],
  ['gills', (cap, rim) => ({ nets: [turned(path([1, 0], rim), { sides: 3, first: 330 })] })],
  ['button top', (cap, [, ry], top) => dot(...cap.right(ry + (top - ry) * 0.8))],
  ['dripping', (cap, [rx, ry]) => ({ nets: [specks(...between(CUTS[0], rx, ry - 1.2))] })],
  ['spores', (cap, rim, top) => ({ d: `${dot(0, top + 1.2)} ${dot(0, top + 2.4)}` })],
  ['two bands', (cap, [, ry], top) => `${dot(...cap.right(ry + (top - ry) * 0.36))} ${dot(...cap.right(ry + (top - ry) * 0.7))}`],
];

const GROUNDS = [
  ['', () => []],
  ['grass', () => [turned('M2.6,-5 L3.3,-3.4', { sides: 5, first: 20 })]],
  ['baby mushroom', () => [moved(turned('M0,-5 L0,0 M0,0 L4,0 C4,3 2,4 0,4 D4,0', { sides: 3, first: 90 }), { size: 0.4, to: [4.6, -3, 1.6] })]],
  ['ground ring', () => [turned(dot(3.8, -5), { sides: 3 })]],
  ['pebbles', () => [specks([2.4, -5, 0.8], [-2.2, -5, 1.3], [0.6, -5, -2.5])]],
  ['log slice', () => [turned('M3.4,-5 L3.4,-6.4 D3.4,-5 D3.4,-6.4', { sides: 3, first: 30 })]],
  ['roots', () => [legs('M1,-5 L2.6,-6.4')]],
];

const mushrooms = solidFamily({
  cat: 'loot3d', count: 500, sizes: [CAPS.length, SPOTS.length, STALKS.length, GROUNDS.length],
  make: ([cap, spots, stalk, ground], k) => ({
    id: `3d-mushroom-${k}`, name: `3D mushroom ${k}`, sub: '3D mushrooms',
    tags: words('toadstool fungus power up forest', CAPS[cap][0], SPOTS[spots][0], STALKS[stalk][0], GROUNDS[ground][0]),
    build: () => {
      const [, line, rim] = CAPS[cap];
      const top = Math.max(...line.match(/-?[\d.]+,-?[\d.]+/g).map((pair) => Number(pair.split(',')[1])));
      return [...vessel(CUTS[0], `${line} ${dot(...rim)}`, STALKS[stalk][1], SPOTS[spots][1](edge(line), rim, top)), ...GROUNDS[ground][1]()];
    },
  }),
});

// ---------------------------------------------------------------- rings
//
// The band is a circle around (0, 0), 3.4 wide, standing upright; what holds the stone begins at its top, and the
// stone at the height 5.

// [search words, profile from the height 5 up, a net of its own, how it is turned]
/** A flat drawing that stands twice, the second time turned a quarter around the upright axis: it has depth from every side. */
export const crossed = (d) => joinNets(plate(d), plate(d, (x, y) => [0, y, x]));

const STONES = [
  ['brilliant', 'M0,5 L2.6,6.6 L1.6,7.6 D2.6,6.6 D1.6,7.6', null, { sides: 6, round: false }],
  ['octahedron', 'M0,5 L2.2,6.8 L0,8.6 D2.2,6.8', null, { sides: 4, round: false }],
  ['pearl', 'N E0,6.8 1.8 1.8 -90 90 D1.8,6.8'],
  ['block stone', 'M0,5 L2,5.8 L2,7.6 L0,7.6 D2,5.8 D2,7.6', null, { sides: 4, first: 45, round: false }],
  ['signet', 'M0,5 L2.8,6 L0,6 D2.8,6'],
  ['heart', '', () => crossed(heart(0, 7, 2))],
  ['star', 'M0,5 L0,6.2', () => crossed(star(0, 7.2, 5, 2.2, 1))],
  ['tulip crown', 'M0,5 L1.8,5.8 L2.6,7.6 D1.8,5.8'],
  ['flower', 'M0,5 L0,5.6', () => turned('M0,5.6 C1.6,5.2 3.2,6 3,7.2 C2,7 0.8,6.4 0,5.6', { sides: 5, first: 90 })],
  ['flame bud', 'M0,5 C3,5.8 0.9,7.4 0,9'],
  ['bow', 'M0,5 L0,6.4', () => crossed('M0,6.4 C3,8.8 3,4.2 0,6.4 C-3,8.8 -3,4.2 0,6.4')],
];

const HOOP = `${oval(0, 0, 3.4, 3.4)} D3.4,0 D-3.4,0 D0,-3.4`;
const RING_BANDS = [
  ['wide band', () => [thick(HOOP, 0.8)]],
  ['wire band', () => [plate(HOOP)]],
  ['tapered band', () => [1, -1].map((side) => plate(HOOP, (x, y) => [x, y, (side * 0.9 * (y + 3.4)) / 6.8]))],
  ['double band', () => [plate(HOOP, (x, y) => [x, y, 1.5]), plate(HOOP, (x, y) => [x, y, -1.5]), lines([[0, 3.4, -1.5], [0, 3.4, 1.5]])]],
  ['square band', () => [thick(`${roundedBox(0, 0, 3.4, 3.4, 1.3)} D3.4,0 D-3.4,0 D0,-3.4`, 0.8)]],
  ['eight sided band', () => [thick(closed(...ringOf((a) => polar(0, 0, 3.4 / Math.cos(22.5 * RAD), a + 22.5), 45)), 0.8)]],
  ['wavy band', () => [plate(closed(...ringOf((a) => polar(0, 0, 3.4 + 0.3 * Math.cos(8 * (a - 90) * RAD), a), 9)))]],
  ['open band', () => [plate('N A0,0 3.4 -68 248')]],
  ['flat band', () => [plate(`${HOOP} ${oval(0, 0, 4.3, 4.3)}`)]],
];

// What holds the stone: [search words, profile from the top of the band, a net of its own]
const MOUNTS = [
  ['', 'M0,3.4 L0,5'],
  ['cup mount', 'M0,3.4 L1.6,4.6 D1.6,4.6'],
  ['prongs', 'M0,3.4 L2.1,5.6'],
  ['bezel', 'M0,3.4 L0,5 D1.7,4.2'],
  ['shoulders', 'M0,3.4 L0,5', () => plate(`${bow([1.49, 3.06], [0.3, 5], 0.4)} ${bow([-1.49, 3.06], [-0.3, 5], -0.4)}`)],
  ['forked mount', '', () => plate(path([-1.2, 3.18], [0, 5], [1.2, 3.18]))],
  ['platform', 'M0,3.4 L0,4.4', () => turned('M0,4.4 L2,4.4 D2,4.4', { sides: 4, first: 45, round: false })],
  ['leaf mount', 'M0,3.4 L0,5', () => plate('M0,3.6 Q1.6,3.4 2.4,4.6 Q1,4.8 0,3.6 M0,3.6 Q-1.6,3.4 -2.4,4.6 Q-1,4.8 0,3.6')],
];

const RING_EXTRAS = [
  ['', () => []],
  ['sparkling', () => [plate(`${path([2.9, 9], [4.7, 9])} ${path([3.8, 8.1], [3.8, 9.9])}`)]],
  ['side stones', () => [plate(`${diamond(3.9, 2.4, 0.7, 1)} ${diamond(-3.9, 2.4, 0.7, 1)}`)]],
  ['charm', () => [plate(ball([0, -3.4], [0, -5.3], 0.9))]],
  ['cushion', () => [turned(dot(2.6, -4.4), { sides: 3 })]],
  ['halo', () => [turned(dot(4.2, 7), { sides: 3 })]],
  ['twin band', () => [plate(oval(0, 0, 3.4, 3.4), (x, y) => [x, y, -3])]],
];

const rings = solidFamily({
  cat: 'loot3d', count: 500, sizes: [STONES.length, RING_BANDS.length, MOUNTS.length, RING_EXTRAS.length],
  make: ([stone, band, mount, extra], k) => ({
    id: `3d-ring-${k}`, name: `3D ring ${k}`, sub: '3D rings',
    tags: words('jewel jewellery finger gold magic', STONES[stone][0], RING_BANDS[band][0], MOUNTS[mount][0], RING_EXTRAS[extra][0]),
    build: () => {
      const [, line, own, turn] = STONES[stone];
      const [, holder, held] = MOUNTS[mount];
      return [turned(`${holder} ${line}`, turn || { sides: 3, first: 270 }), own && own(), held && held(), ...RING_BANDS[band][1](), ...RING_EXTRAS[extra][1]()];
    },
  }),
});

export const LOOT3D_SHAPES = [...potions, ...goblets, ...pots, ...barrels, ...chests, ...gems, ...crowns, ...pieces, ...mushrooms, ...rings];
export const LOOT3D_HEADINGS = ['3D potions', '3D goblets', '3D pots', '3D barrels', '3D chests', '3D gems', '3D crowns', '3D game pieces', '3D mushrooms', '3D rings'];
