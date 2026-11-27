// The "3D gear" tab: swords, axes, hammers, shields, helmets, keys, staffs,
// lanterns, bombs and hats in 3D. As in shapes-loot3d.js, each kind is put
// together from a few parts, and a drawing is written in a box of about 20 units.

import { mapNet } from './shape-kit.js';
import { turned, thick, plate, lines, moved, solidFamily } from './shape-build.js';
import { edgeOf as edge, path, closed, oval, bow, dot, box, polar, star, heart, diamond, ball, zigzag, wavy, roundedBox, ringOf, sparkle } from './shape-mix.js';
import { specks, ringOn, vessel, between, onFront, crossed, CUTS } from './shapes-loot3d.js';

const words = (...parts) => parts.filter(Boolean).join(' ');
const SQUARE = { sides: 4, first: 45, round: false };
/** A net seen in a mirror: left and right change places. */
const flipped = (net) => mapNet(net, ([x, y, z]) => [-x, y, z]);
/** Every pair "x,y" of a drawing made wider and higher. */
const stretched = (d, wide, high) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (pair, x, y) => `${Number((x * wide).toFixed(3))},${Number((y * high).toFixed(3))}`);
/** The highest and the lowest point of a drawing that has only lines and curves. */
const heights = (d) => {
  const ys = d.match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g).map((pair) => Number(pair.split(',')[1]));
  return [Math.min(...ys), Math.max(...ys)];
};

// ---------------------------------------------------------------- swords
//
// Point up: the blade from the height 0, the guard below it down to -0.9, then the grip. The blade and the flat
// guards are slabs, 0.7 to the front and to the back.

const DEEP = 0.7;

const SWORD_BLADES = [
  ['straight blade', 'M-1.1,0 L-1.1,10.5 L0,12.5 L1.1,10.5 L1.1,0'],
  ['broad blade', 'M-1.7,0 L-1.7,9.5 L0,11.5 L1.7,9.5 L1.7,0'],
  ['tapered blade', 'M-1.5,0 L0,13 L1.5,0'],
  ['leaf blade', 'M-0.9,0 C-2.6,5 -1.8,9.5 0,12.5 C1.8,9.5 2.6,5 0.9,0'],
  ['falchion', 'M-1,0 L-1,9 L1.8,12.4 C2.4,9 1.4,4 1,0'],
  ['scimitar curved', 'M-0.9,0 C-0.9,5 -0.2,9.5 2.6,12.4 C1.6,8 1.2,4 0.9,0'],
  ['rapier thin', 'M-0.6,0 L-0.6,11.5 L0,13.5 L0.6,11.5 L0.6,0'],
  ['flamberge wavy', 'M-1.2,0 L-0.7,2.5 L-1.4,5 L-0.7,7.5 L-1.2,10 L0,12.5 L1.2,10 L0.7,7.5 L1.4,5 L0.7,2.5 L1.2,0'],
  ['great sword', 'M-1,0 L-1.9,10.5 L0,12.6 L1.9,10.5 L1,0'],
  ['serrated', 'M-1.1,0 L-1.1,11 L0.3,12.6 L1.4,10.6 L0.8,9 L1.4,7.4 L0.8,5.8 L1.4,4.2 L0.8,2.6 L1.4,1 L0.8,0'],
  ['forked', 'M-1.3,0 L-1.3,10.5 L-0.8,12.6 L0,10.2 L0.8,12.6 L1.3,10.5 L1.3,0'],
];

// (half the width of the blade where it begins) => nets
const closedBelow = (w) => lines([[-w, 0, DEEP], [w, 0, DEEP]], [[-w, 0, -DEEP], [w, 0, -DEEP]]);
const SWORD_GUARDS = [
  ['cross guard', () => [thick(box(-3.4, -0.9, 3.4, 0), DEEP)]],
  ['short guard', () => [thick(box(-2.3, -0.9, 2.3, 0), DEEP)]],
  ['curved guard', () => [thick('M-3.7,1.4 Q-3.3,0 -1.9,0 L1.9,0 Q3.3,0 3.7,1.4 Q3.7,-0.9 1.9,-0.9 L-1.9,-0.9 Q-3.7,-0.9 -3.7,1.4', DEEP)]],
  ['drooping guard', () => [thick('M-3.7,-2.3 Q-3.7,0 -1.9,0 L1.9,0 Q3.7,0 3.7,-2.3 Q3.3,-0.9 1.9,-0.9 L-1.9,-0.9 Q-3.3,-0.9 -3.7,-2.3', DEEP)]],
  ['disc guard', (w) => [turned('M0,-0.45 L2.7,-0.45 D2.7,-0.45', { sides: 4 }), closedBelow(w)]],
  ['cup guard', (w) => [turned('M0,-0.9 C2.2,-0.9 3,0.2 3,1.5 D3,1.5', { sides: 4 }), closedBelow(w)]],
  ['diamond guard', (w) => [turned('M0,-1.2 L3.2,-0.45 L0,0.3 D3.2,-0.45', { sides: 4, round: false, deep: 0.45 }), closedBelow(w)]],
  ['winged guard', () => [thick(closed([-3.9, 0.9], [-2, 0], [2, 0], [3.9, 0.9], [2.6, -0.9], [-2.6, -0.9]), DEEP)]],
  ['pointed guard', () => [thick(closed([-3.8, -0.45], [-2.4, 0], [2.4, 0], [3.8, -0.45], [2.4, -0.9], [-2.4, -0.9]), DEEP)]],
];

// [search words, profile of the grip from the guard down, a net of its own]
const SWORD_GRIPS = [
  ['ball pommel', 'M0.7,-0.9 L0.7,-4.3 C2.1,-4.5 2.1,-6.7 0,-6.8'],
  ['disc pommel', 'M0.7,-0.9 L0.7,-4.4 L1.7,-4.4 L1.7,-5.3 L0,-5.3 D1.7,-4.4 D1.7,-5.3'],
  ['gem pommel', 'M0.7,-0.9 L0.7,-4.4 L1.5,-5.4 L0,-6.6 D1.5,-5.4'],
  ['wrapped grip', 'M0.7,-0.9 L0.7,-4.8 L0,-4.8 D0.7,-1.9 D0.7,-2.9 D0.7,-3.9 D0.7,-4.8'],
  ['long grip', 'M0.7,-0.9 L0.7,-6.6 L0,-6.6 D0.7,-6.6 D0.7,-3.8'],
  ['spike pommel', 'M0.7,-0.9 L0.7,-4.2 L1.4,-4.9 L0,-7 D1.4,-4.9'],
  ['swelling grip', 'M0.7,-0.9 C1.6,-2 1.6,-3.4 0.7,-4.4 L1.5,-4.4 L1.5,-5.3 L0,-5.3 D1.5,-4.4'],
  ['ring pommel', 'M0.7,-0.9 L0.7,-4.4 L0,-4.4 D0.7,-4.4', () => plate(oval(0, -5.7, 1.3, 1.3))],
];

const SWORD_DRESSINGS = [
  ['', () => []],
  ['fuller', () => [lines([[0, 1, DEEP], [0, 7, DEEP]], [[0, 1, -DEEP], [0, 7, -DEEP]])]],
  ['runes', () => [specks([0, 1.6, DEEP], [0, 3.4, DEEP], [0, 5.2, DEEP], [0, 7, DEEP])]],
  ['magic rings', () => [turned(`${dot(2.7, 3.6)} ${dot(2.7, 7.6)}`, { sides: 3 })]],
  ['tassel', () => [plate('M0.7,-3.2 Q3.2,-3.2 2.8,-6.6')]],
  ['sparkle', () => [plate(sparkle(-3, 11.6, 1))]],
  ['enchanted glow', () => [plate(`${wavy([-3, 1.6], [-3, 9.6], 4, 0.5)} ${wavy([3.4, 1.6], [3.4, 9.6], 4, 0.5)}`)]],
];

const swords = solidFamily({
  cat: 'gear3d', count: 500, sizes: [SWORD_BLADES.length, SWORD_GUARDS.length, SWORD_GRIPS.length, SWORD_DRESSINGS.length],
  make: ([blade, guard, grip, dressing], k) => ({
    id: `3d-sword-${k}`, name: `3D sword ${k}`, sub: '3D swords',
    tags: words('blade weapon knight', SWORD_BLADES[blade][0], SWORD_GUARDS[guard][0], SWORD_GRIPS[grip][0], SWORD_DRESSINGS[dressing][0]),
    build: () => {
      const [, outline] = SWORD_BLADES[blade];
      const [, held, own] = SWORD_GRIPS[grip];
      return [thick(outline, DEEP), ...SWORD_GUARDS[guard][1](Math.abs(Number(outline.slice(1).split(',')[0]))), turned(held, SQUARE), own && own(), ...SWORD_DRESSINGS[dressing][1]()];
    },
  }),
});

// ---------------------------------------------------------------- axes
//
// A square handle around the upright axis, 0.75 from it at its corners, and the head on its right.

const AXE_HEADS = [
  ['bearded axe', 'M0.5,5.4 L3.2,6 C4.6,4.6 4.6,2 3.4,-0.4 L2.4,2.6 L0.5,2.8'],
  ['crescent axe', 'M0.5,4.8 L2.2,4.6 L3.6,6.6 C5.4,4.6 5.4,2.2 3.6,0.2 L2.2,2.4 L0.5,2.2'],
  ['hatchet', 'M0.5,5.2 L4,6 L4.4,1.4 L0.5,2.6'],
  ['broad axe', 'M0.5,5 L3,6.8 C5,5 5,1.8 3,0 L0.5,2.2'],
  ['long bladed axe', 'M0.5,4.4 L2.6,4.2 L3.4,7 C4.4,4.8 4.4,2 3.4,-0.4 L2.6,2.4 L0.5,2.2'],
  ['pick', 'M0.5,4.8 L5.6,3.4 L0.5,3'],
  ['tomahawk', 'M0.5,4.6 L3.4,5.8 C4,4.6 4,3.4 3.8,2 L0.5,3.2'],
  ['moon axe', 'M0.5,5 L2,5 C5.8,6.8 5.8,0.4 2,2.2 L0.5,2.2'],
  ['notched axe', 'M0.5,5.2 L3.6,6.4 L4.4,4.4 L3.4,3.6 L4.4,2.8 L3.6,0.8 L0.5,2.4'],
  ['hooked axe', 'M0.5,5.2 L3.4,6.2 C4.8,4.6 4.6,2.4 3.6,1 L4.2,-0.8 L2.4,0.8 L2.4,2.6 L0.5,2.8'],
  ['cleaver', 'M0.5,5.6 L4.6,5.6 L4.6,1.2 L0.5,2.4'],
];

// What is on the other side: a drawing, or (outline of the head, how deep) => net
const AXE_BACKS = [
  ['', ''],
  ['back spike', 'M-0.5,4.6 L-3.6,3.8 L-0.5,3'],
  ['hammer back', 'M-0.5,5 L-2.6,5 L-2.6,2.6 L-0.5,2.6'],
  ['double axe', (head, deep) => flipped(thick(head, deep))],
  ['back hook', 'M-0.5,4.6 Q-3.6,4.8 -3.2,1.8 L-2,3 Q-2,3.6 -0.5,3.4'],
  ['small back blade', 'M-0.5,4.6 L-2.4,5.6 C-3.4,4.4 -3.4,3.2 -2.4,2 L-0.5,3'],
  ['back fork', 'M-0.5,4.8 L-3.4,5.4 L-1.7,3.8 L-3.4,2.2 L-0.5,2.8'],
  ['back ring', oval(-1.9, 3.8, 1.35, 1.35)],
  ['back wedge', 'M-0.5,5 L-2,3.8 L-0.5,2.6'],
];

const AXE_HANDLES = [
  ['', 'M0.75,-8 L0.75,6.4 D0.75,-8 D0.75,6.4'],
  ['ball pommel', 'M0.75,6.4 L0.75,-7 C2.2,-7.2 2.2,-9.4 0,-9.5 D0.75,6.4'],
  ['grip rings', 'M0.75,-8 L0.75,6.4 D0.75,-8 D0.75,6.4 D0.75,-6.8 D0.75,-5.6 D0.75,-4.4'],
  ['top spike', 'M0.75,-8 L0.75,6.4 L0,8.8 D0.75,-8 D0.75,6.4'],
  ['pommel spike', 'M0.75,6.4 L0.75,-7.4 L0,-9.8 D0.75,6.4 D0.75,-7.4'],
  ['capped handle', 'M0.75,6.4 L0.75,-7.6 L1.6,-7.6 L1.6,-8.5 L0,-8.5 D0.75,6.4 D1.6,-7.6'],
  ['long handle', 'M0.75,-10.6 L0.75,6.4 D0.75,-10.6 D0.75,6.4'],
  ['flared handle', 'M0.75,6.4 L0.75,-5 L1.6,-8 L0,-8 D0.75,6.4 D1.6,-8'],
];

// [search words, (how deep the head is) => nets, how deep the head is]
const AXE_DETAILS = [
  ['', () => []],
  ['rivets', (deep) => [specks([1.5, 4.4, deep], [1.5, 3.3, deep])]],
  ['bound head', () => [lines([[-0.55, 5.4, 0.55], [0.55, 2.6, 0.55]], [[0.55, 5.4, 0.55], [-0.55, 2.6, 0.55]])]],
  ['sparkle', () => [plate(sparkle(5.6, 7.6, 1))]],
  ['ribbon', () => [plate('M0.6,1.6 Q3.2,1.2 2.8,-1.8 M0.6,1.6 Q2,0 1.3,-2.2')]],
  ['thick blade', () => [], 1.2],
  ['ring', () => [turned(dot(2, 0.6), { sides: 3 })]],
];

const axes = solidFamily({
  cat: 'gear3d', count: 500, sizes: [AXE_HEADS.length, AXE_BACKS.length, AXE_HANDLES.length, AXE_DETAILS.length],
  make: ([head, back, handle, detail], k) => ({
    id: `3d-axe-${k}`, name: `3D axe ${k}`, sub: '3D axes',
    tags: words('weapon battle chop', AXE_HEADS[head][0], AXE_BACKS[back][0], AXE_HANDLES[handle][0], AXE_DETAILS[detail][0]),
    build: () => {
      const [, more, deep = DEEP] = AXE_DETAILS[detail];
      const behind = AXE_BACKS[back][1];
      return [thick(AXE_HEADS[head][1], deep), behind && (typeof behind === 'string' ? thick(behind, deep) : behind(AXE_HEADS[head][1], deep)), turned(AXE_HANDLES[handle][1], SQUARE), ...more(deep)];
    },
  }),
});

// ---------------------------------------------------------------- hammers
//
// The head lies across the top of the handle: its profile is turned around the axis that runs from left to right,
// through the height 4.5.

const HEAD_AT = 4.5;
const lying = (net) => moved(net, { turn: ['z', 90], to: [0, HEAD_AT, 0] });

// [search words, profile (how far from the axis, how far along it), how it is cut]
const HAMMER_HEADS = [
  ['mallet', 'M0,-3 L2,-3 C2.7,-1 2.7,1 2,3 L0,3 D2,-3 D2,3', 0],
  ['sledge block', 'M0,-3 L2.2,-3 L2.2,3 L0,3 D2.2,-3 D2.2,3', 1],
  ['war hammer', 'M0,-3.6 L1.7,-1 L1.7,2.8 L0,2.8 D1.7,-1 D1.7,2.8', 1],
  ['double taper', 'M0,-3 L1.4,-3 L2.3,0 L1.4,3 L0,3 D1.4,-3 D2.3,0 D1.4,3', 1],
  ['drum head', 'M0,-3 L2,-3 L2,3 L0,3 D2,-3 D2,3', 0],
  ['dumbbell head', 'M0,-3.5 C2.7,-3.5 2.7,-0.9 0.9,-0.9 L0.9,0.9 C2.7,0.9 2.7,3.5 0,3.5 D0.9,-0.9 D0.9,0.9', 0],
  ['flared head', 'M0,-3 L2.4,-3 L1.4,-1.4 L1.4,1.4 L2.4,3 L0,3 D2.4,-3 D2.4,3', 1],
  ['pointed head', 'M0,-3.8 L1.6,-1.6 L1.6,1.6 L0,3.8 D1.6,-1.6 D1.6,1.6', 1],
  ['stone head', 'M0,-2.8 L1.8,-3 L2.5,-0.6 L2,2.9 L0,2.7 D1.8,-3 D2.5,-0.6 D2,2.9', 1],
  ['barrel head', 'M0,-2.6 L1.5,-2.6 C2.9,-1.4 2.9,1.4 1.5,2.6 L0,2.6 D1.5,-2.6 D1.5,2.6', 0],
  ['stepped head', 'M0,-3.2 L1.4,-3.2 L1.4,-1.6 L2.3,-1.6 L2.3,1.6 L1.4,1.6 L1.4,3.2 L0,3.2 D1.4,-3.2 D2.3,-1.6 D2.3,1.6 D1.4,3.2', 1],
];

const HAMMER_HANDLES = [
  ['', 'M0.75,-8 L0.75,4.5 D0.75,-8'],
  ['ball pommel', 'M0.75,4.5 L0.75,-7 C2.2,-7.2 2.2,-9.4 0,-9.5'],
  ['grip rings', 'M0.75,-8 L0.75,4.5 D0.75,-8 D0.75,-6.8 D0.75,-5.6 D0.75,-4.4'],
  ['pommel spike', 'M0.75,4.5 L0.75,-7.4 L0,-9.8 D0.75,-7.4'],
  ['capped handle', 'M0.75,4.5 L0.75,-7.6 L1.6,-7.6 L1.6,-8.5 L0,-8.5 D1.6,-7.6'],
  ['long handle', 'M0.75,-10.6 L0.75,4.5 D0.75,-10.6'],
  ['flared handle', 'M0.75,4.5 L0.75,-5 L1.6,-8 L0,-8 D1.6,-8'],
  ['short handle', 'M0.75,-5.4 L0.75,4.5 D0.75,-5.4'],
  ['collared handle', 'M0.75,-8 L0.75,4.5 D0.75,-8 D0.75,0.6 D1.7,0.6'],
];

// (profile of the head, how far it reaches to each side, how far from the axis it is in the middle) => nets
const HAMMER_TOPS = [
  ['', () => []],
  ['top spike', (d, far, r) => [turned(`M0.6,${HEAD_AT + r} L0,${HEAD_AT + r + 2.4}`, SQUARE)]],
  ['wedge', (d, far, r) => [turned(`M0.9,${HEAD_AT + r} L0.9,${HEAD_AT + r + 0.9} L0,${HEAD_AT + r + 0.9} ${dot(0.9, HEAD_AT + r + 0.9)}`, SQUARE)]],
  ['lightning', (d, far) => [plate(path([far + 0.7, HEAD_AT + 1.4], [far + 2.2, HEAD_AT + 0.2], [far + 1.3, HEAD_AT + 0.2], [far + 2.8, HEAD_AT - 1.2]))]],
  ['impact star', (d, far) => [plate(star(0, HEAD_AT, 6, 2.4, 1.2), (x, y) => [-far - 0.9, y, x])]],
  ['sparkle', (d, far) => [plate(sparkle(far + 1.6, HEAD_AT + 2.6, 1))]],
  ['runes', (d, far, r) => [specks([-0.9, HEAD_AT, r + 0.05], [0.9, HEAD_AT, r + 0.05])]],
  ['strap', () => [plate('M0.6,-3.6 Q3.4,-4 2.8,-7.6')]],
];

// [search words, how long the head is, how thick]
const HAMMER_SIZES = [['', 1, 1], ['long head', 1.3, 1], ['thick head', 1, 1.3], ['small head', 0.8, 0.8], ['big head', 1.3, 1.3], ['stubby head', 0.8, 1.25], ['slim head', 1.25, 0.8]];

const hammers = solidFamily({
  cat: 'gear3d', count: 500, sizes: [HAMMER_HEADS.length, HAMMER_HANDLES.length, HAMMER_TOPS.length, HAMMER_SIZES.length],
  make: ([head, handle, top, size], k) => ({
    id: `3d-hammer-${k}`, name: `3D hammer ${k}`, sub: '3D hammers',
    tags: words('mallet maul weapon tool smith', HAMMER_HEADS[head][0], HAMMER_HANDLES[handle][0], HAMMER_TOPS[top][0], HAMMER_SIZES[size][0]),
    build: () => {
      const [, long, wide] = HAMMER_SIZES[size];
      const d = stretched(HAMMER_HEADS[head][1], wide, long);
      const [, sides, first, round] = CUTS[HAMMER_HEADS[head][2]];
      return [lying(turned(d, { sides, first, round })), turned(HAMMER_HANDLES[handle][1], SQUARE), ...HAMMER_TOPS[top][1](d, heights(d)[1], edge(d).right(0)[0])];
    },
  }),
});

// ---------------------------------------------------------------- shields
//
// The face of a shield is drawn flat and laid on a curved surface that bulges to the front.

const SHIELD_OUTLINES = [
  ['round shield', oval(0, 0, 5, 5)],
  ['heater shield', 'M-4.4,5 L4.4,5 L4.4,0.5 C4.4,-3 2,-5 0,-6 C-2,-5 -4.4,-3 -4.4,0.5 Z'],
  ['kite shield', 'M0,6 C3.4,6 4,4.4 4,3 C4,0 1.6,-4 0,-7 C-1.6,-4 -4,0 -4,3 C-4,4.4 -3.4,6 0,6'],
  ['tower shield', roundedBox(0, 0, 3.6, 5.6, 1)],
  ['oval shield', oval(0, 0, 3.8, 5.6)],
  ['six sided shield', closed(...ringOf((a) => polar(0, 0, 5.2, a), 60))],
  ['eight sided shield', closed(...ringOf((a) => polar(0, 0, 5.2, a + 22.5), 45))],
  ['scutum', 'M-3.6,5 Q0,6.2 3.6,5 L3.6,-5 Q0,-6.2 -3.6,-5 Z'],
  ['spiked shield', star(0, 0, 8, 5.8, 4.5)],
  ['notched shield', 'M-4.4,5 L1.6,5 L1.6,3.6 L4.4,3.6 L4.4,0.5 C4.4,-3 2,-5 0,-6 C-2,-5 -4.4,-3 -4.4,0.5 Z'],
  ['arched shield', 'M-4,-5.4 L-4,2 B4,2 -1 L4,-5.4 Z'],
];

const EMBLEMS = [
  ['cross', `${path([0, -3], [0, 3])} ${path([-2.6, 0.6], [2.6, 0.6])}`],
  ['saltire', `${path([-2.4, -2.4], [2.4, 2.4])} ${path([-2.4, 2.4], [2.4, -2.4])}`],
  ['pale', `${path([-1, -3], [-1, 3])} ${path([1, -3], [1, 3])}`],
  ['fess', `${path([-2.8, 1], [2.8, 1])} ${path([-2.8, -1], [2.8, -1])}`],
  ['chevrons', `${path([-2.8, -0.4], [0, 2.2], [2.8, -0.4])} ${path([-2.8, -2.4], [0, 0.2], [2.8, -2.4])}`],
  ['star', star(0, 0, 5, 2.9, 1.2)],
  ['ring', oval(0, 0, 2.7, 2.7)],
  ['diamond', diamond(0, 0, 2.2, 3)],
  ['sun', [0, 45, 90, 135, 180, 225, 270, 315].map((a) => path(polar(0, 0, 1.3, a), polar(0, 0, 3, a))).join(' ')],
];

const facing = (net, z) => moved(net, { turn: ['x', 90], to: [0, 0, z] }); // what was up now points to the front
const BOSSES = [
  ['', () => []],
  ['boss', (z) => [facing(turned('M1.6,0 C1.6,1.1 0.9,1.6 0,1.6 D1.6,0', { sides: 3 }), z)]],
  ['spike boss', (z) => [facing(turned('M1.4,0 L0,2.8 D1.4,0', { sides: 3 }), z)]],
  ['ring boss', (z) => [facing(turned('M1.7,0 L1.7,0.8 D1.7,0.8', { sides: 3 }), z)]],
  ['gem boss', (z) => [facing(turned('M0,0 L1.5,0.9 L0,1.8 D1.5,0.9', SQUARE), z)]],
  ['studs', (z, lift) => [specks(lift(-2, 2), lift(2, 2), lift(-2, -2), lift(2, -2))]],
  ['straps', (z) => [plate(`${bow([-2.2, 0], [2.2, 0], 0.5)}`, (x, y) => [x, 1.6, z - 2 - y]), plate(`${bow([-2.2, 0], [2.2, 0], 0.5)}`, (x, y) => [x, -1.6, z - 2 - y])]],
  ['domed boss', (z) => [facing(turned('M2.2,0 C2.2,0.7 1.2,1 0,1 D2.2,0', { sides: 3 }), z)]],
];

// [search words, where a point of the face goes]
const SHIELD_CURVES = [
  ['domed', (x, y) => [x, y, 1.8 * (1 - (x * x + y * y) / 49)]],
  ['flat', (x, y) => [x, y, 0]],
  ['deep bowl', (x, y) => [x, y, 3.2 * (1 - (x * x + y * y) / 49)]],
  ['curved', (x, y) => [x, y, 2.4 * (1 - (x * x) / 30)]],
  ['ridged', (x, y) => [x, y, 1.9 * (1 - Math.abs(x) / 5)]],
  ['cone', (x, y) => [x, y, 2.6 * (1 - Math.hypot(x, y) / 6.5)]],
  ['hollow', (x, y) => [x, y, -1.6 * (1 - (x * x + y * y) / 49)]],
];

const shields = solidFamily({
  cat: 'gear3d', count: 500, sizes: [SHIELD_OUTLINES.length, EMBLEMS.length, BOSSES.length, SHIELD_CURVES.length],
  make: ([outline, emblem, boss, curve], k) => ({
    id: `3d-shield-${k}`, name: `3D shield ${k}`, sub: '3D shields',
    tags: words('armour guard knight defence', SHIELD_OUTLINES[outline][0], EMBLEMS[emblem][0], BOSSES[boss][0], SHIELD_CURVES[curve][0]),
    build: () => {
      const lift = SHIELD_CURVES[curve][1];
      const face = `${SHIELD_OUTLINES[outline][1]} ${EMBLEMS[emblem][1]}`;
      // a flat shield has a back as well
      return [...(curve === 1 ? [plate(face, (x, y) => [x, y, 0.5]), plate(SHIELD_OUTLINES[outline][1], (x, y) => [x, y, -0.5])] : [plate(face, lift)]), ...BOSSES[boss][1](lift(0, 0)[2] + (curve === 1 ? 0.5 : 0), lift)];
    },
  }),
});

// ---------------------------------------------------------------- helmets
//
// The dome is turned (the face looks to the front); the brow is at the height 0. What covers the face hangs below
// the brow, and what guards the neck hangs from the rim.

const ROUND4 = ['round', 4, 0, true];
// [search words, profile from the rim to the top]: every one has a ring at the brow, the height 0
export const DOMES = [
  ['round cap', 'M4,0 C4,3.4 2.4,5 0,5 D4,0'],
  ['norman helm', 'M4,0 C4,2 2,5 0,6.6 D4,0'],
  ['great helm bucket', 'M4,-4 L4,3.6 L3,4.6 L0,4.6 D4,-4 D4,0 D4,3.6 D3,4.6'],
  ['kettle hat', 'M5.6,-0.8 L3.6,0 C3.6,3 2.2,4.4 0,4.4 D5.6,-0.8 D3.6,0'],
  ['barbute', 'M3.8,-4 L3.8,0 C3.8,3.4 2,5.4 0,5.4 D3.8,-4 D3.8,0'],
  ['banded helm', ringOn('M4,0 C4,3.4 2.4,5 0,5 D4,0', 2.2)],
  ['samurai kabuto', 'M5.6,-2.6 L3.8,0 C3.8,3 2.2,4.6 0,4.6 D5.6,-2.6 D3.8,0'],
  ['spiked helm', 'M4,0 C4,3 2.2,4.4 0.6,4.4 L0,7 D4,0'],
  ['sallet', 'M4.5,-1.2 L4,0 C4,3.2 2.2,4.8 0,4.8 D4.5,-1.2 D4,0'],
  ['bascinet', 'M3.8,-2.4 L3.8,0 C3.8,3.2 1.4,5.4 0,7 D3.8,-2.4 D3.8,0'],
  ['crowned helm', 'M4,0 L4,2.6 L4.7,2.6 L4.7,3.7 L0,4.5 D4,0 D4.7,2.6 D4.7,3.7'],
];

// (where a drawing goes that is laid on the front, how far the front is from the axis) => nets
const HELMET_FACES = [
  ['open face', () => []],
  ['nose guard', (front) => [plate(path([0, 0], [0, -2.8]), front)]],
  ['visor slit', (front) => [plate(`${path([-2.6, 0], [-2.6, -3], [2.6, -3], [2.6, 0])} ${path([-1.9, -1.2], [1.9, -1.2])}`, front)]],
  ['face plate', (front) => [plate(`${path([-2.6, 0], [-2.6, -3.4])} ${path([2.6, 0], [2.6, -3.4])} ${path([-1.9, -1], [1.9, -1])} ${path([0, -1], [0, -3.4])}`, front)]],
  ['grille', (front) => [plate(`${path([-2.4, 0], [-2.4, -3], [2.4, -3], [2.4, 0])} ${path([-0.8, 0], [-0.8, -3])} ${path([0.8, 0], [0.8, -3])}`, front)]],
  ['goggles', (front) => [plate(`${oval(-1.4, -1.3, 1, 1)} ${oval(1.4, -1.3, 1, 1)}`, front)]],
  ['cheek guards', (front) => [plate(`${path([-3.2, 0], [-3.2, -3], [-1.7, -3.5], [-1.3, 0])} ${path([3.2, 0], [3.2, -3], [1.7, -3.5], [1.3, 0])}`, front)]],
  ['pointed visor', (front, r) => [plate(path([-2.2, 0], [-2.2, -2.6], [2.2, -2.6], [2.2, 0]), front), lines(...[[-2.2, 0], [2.2, 0], [2.2, -2.6], [-2.2, -2.6]].map(([x, y]) => [front(x, y), [0, -1.3, r + 2.6]]))]],
  ['mask', (front) => [plate(`M-2.6,0 Q-2.6,-3.8 0,-3.8 Q2.6,-3.8 2.6,0 ${path([-1.6, -1.2], [-0.5, -1.2])} ${path([0.5, -1.2], [1.6, -1.2])}`, front)]],
];

// (outline of the dome, how high its top is) => nets
const CRESTS = [
  ['', () => []],
  ['horns', (dome) => { const r = dome.right(2.4)[0]; const horn = plate(`M${r},1.8 Q${r + 2.8},2.2 ${r + 2.4},5.8 Q${r + 1.3},3.8 ${r - 0.25},3.3`); return [horn, flipped(horn)]; }],
  ['crest ridge', (dome, top) => { const r = dome.right(top - 2)[0]; return [plate(`M${-r},${top - 2} Q0,${top + 3.6} ${r},${top - 2}`, (x, y) => [0, y, x])]; }],
  ['top spike', (dome, top) => [turned(`M0.6,${top} L0,${top + 2.6}`, SQUARE)]],
  ['plume', (dome, top) => [plate(`M0,${top} Q2.8,${top + 3} -1.4,${top + 5} Q0.2,${top + 2.6} 0,${top}`, (x, y) => [0, y, -x])]],
  ['wings', (dome) => { const r = dome.right(2.2)[0]; const wing = plate(closed([r, 1.6], [r + 3.4, 5.6], [r + 2.5, 3.4], [r + 3.7, 3.4], [r + 2.2, 1.2])); return [wing, flipped(wing)]; }],
  ['top knob', (dome, top) => [turned(`M0,${top} C1.5,${top} 1.5,${top + 1.9} 0,${top + 1.9}`, { sides: 3 })]],
  ['fan crest', (dome, top) => { const r = dome.right(top - 1.4)[0]; return [plate(`M${-r},${top - 1.4} Q0,${top + 3.4} ${r},${top - 1.4} ${path([0, top], [0, top + 1])}`)]; }],
];

// (how far the rim is from the axis, how high the rim is) => nets
const behind = (r) => (x, y, flare = 0) => [(r + flare) * Math.sin(Math.PI + x / r), y, (r + flare) * Math.cos(Math.PI + x / r)];
const NECK_GUARDS = [
  ['', () => []],
  ['neck guard', (r, rim) => [plate(path([-1.9 * r, rim], [-1.9 * r, rim - 2.2], [1.9 * r, rim - 2.2], [1.9 * r, rim]), (x, y) => behind(r)(x, y, (rim - y) * 0.5))]],
  ['mail curtain', (r, rim) => [plate(path([-1.8 * r, rim], ...zigzag([-1.8 * r, rim - 1.2], [1.8 * r, rim - 1.2], 5, -1.2), [1.8 * r, rim]), behind(r))]],
  ['chin strap', (r, rim) => [plate(`M${-r},${rim} Q0,${rim - 5.2} ${r},${rim}`)]],
  ['ear flaps', (r, rim) => [1, -1].map((side) => plate(closed([-1.2, rim], [1.2, rim], [0.8, rim - 2.6], [-0.8, rim - 2.6]), (x, y) => [side * r, y, x]))],
  ['rim band', (r, rim) => [turned(dot(r + 0.05, rim + 0.9), { sides: 4 })]],
  ['rivets', (r, rim) => [specks(...between(['', 8, 0, true], r, rim + 0.9))]],
];

const helmets = solidFamily({
  cat: 'gear3d', count: 500, sizes: [DOMES.length, HELMET_FACES.length, CRESTS.length, NECK_GUARDS.length],
  make: ([dome, face, crest, neck], k) => ({
    id: `3d-helmet-${k}`, name: `3D helmet ${k}`, sub: '3D helmets',
    tags: words('armour knight viking head', DOMES[dome][0], HELMET_FACES[face][0], CRESTS[crest][0], NECK_GUARDS[neck][0]),
    build: () => {
      const d = DOMES[dome][1];
      const [r, rim] = d.slice(1).split(' ')[0].split(',').map(Number);
      const brow = edge(d).right(Math.max(rim, -1.5))[0];
      return [...vessel(ROUND4, d), ...HELMET_FACES[face][1](onFront(ROUND4, brow + 0.02), brow), ...CRESTS[crest][1](edge(d), heights(d)[1]), ...NECK_GUARDS[neck][1](r, rim)];
    },
  }),
});

// ---------------------------------------------------------------- keys
//
// Upright: a square shaft around the axis, the bow on top of it and the bit at the bottom, on the right.

// [search words, outline of the bow, how high the shaft reaches]
const KEY_BOWS = [
  ['ring bow', oval(0, 5.4, 2.4, 2.4), 3],
  ['heart bow', heart(0, 5.4, 2.4), 3],
  ['clover bow', `${oval(0, 7, 1.5, 1.5)} ${oval(-1.6, 4.5, 1.5, 1.5)} ${oval(1.6, 4.5, 1.5, 1.5)}`, 3.4],
  ['diamond bow', diamond(0, 5.6, 2.4, 2.6), 3],
  ['square bow', box(-2.2, 3, 2.2, 7.4), 3],
  ['oval bow', oval(0, 5, 3.1, 2), 3],
  ['crown bow', closed([-2.4, 3], [-2.4, 6.6], [-1.2, 5], [0, 7.2], [1.2, 5], [2.4, 6.6], [2.4, 3]), 3],
  ['star bow', star(0, 5.8, 5, 2.9, 1.3), 4.5],
  ['cog bow', star(0, 5.4, 8, 2.7, 2), 3.4],
  ['double ring bow', `${oval(0, 4.5, 1.5, 1.5)} ${oval(0, 7.5, 1.5, 1.5)}`, 3],
  ['shield bow', 'M-2.3,7.4 L2.3,7.4 L2.3,5 Q2.3,3.4 0,3 Q-2.3,3.4 -2.3,5 Z', 3],
];

// (how high it reaches) => profile
const KEY_SHAFTS = [
  ['', (top) => `M0.6,${top} L0.6,-7 L0,-7 D0.6,-7`],
  ['collar', (top) => `M0.6,${top} L0.6,-7 L0,-7 D0.6,-7 D1.4,1.4`],
  ['two collars', (top) => `M0.6,${top} L0.6,-7 L0,-7 D0.6,-7 D1.3,1.8 D1.3,0.4`],
  ['knob', (top) => `M0.6,${top} L0.6,2 C1.9,1.8 1.9,0 0.6,-0.2 L0.6,-7 L0,-7 D0.6,-7`],
  ['pointed end', (top) => `M0.6,${top} L0.6,-6.6 L0,-8.2 D0.6,-6.6`],
  ['thick shaft', (top) => `M0.9,${top} L0.9,-7 L0,-7 D0.9,-7`],
  ['stepped shaft', (top) => `M0.6,${top} L0.6,0.4 L1,0.4 L1,-7 L0,-7 D1,0.4 D1,-7`],
  ['long shaft', (top) => `M0.6,${top} L0.6,-9.4 L0,-9.4 D0.6,-9.4`],
];

const KEY_BITS = [
  ['block bit', 'M0.45,-3.6 L3,-3.6 L3,-6.6 L0.45,-6.6'],
  ['two teeth', 'M0.45,-3.6 L3,-3.6 L3,-4.6 L1.8,-4.6 L1.8,-5.6 L3,-5.6 L3,-6.6 L0.45,-6.6'],
  ['stepped bit', 'M0.45,-3.6 L2,-3.6 L2,-5 L3.2,-5 L3.2,-6.6 L0.45,-6.6'],
  ['flag bit', 'M0.45,-5.2 L2.8,-5.2 L2.8,-3.6 L3.8,-3.6 L3.8,-6.6 L0.45,-6.6'],
  ['warded bit', 'M0.45,-3.6 L3.2,-3.6 L3.2,-6.6 L0.45,-6.6 M1.8,-3.6 L1.8,-6.6'],
  ['pointed bit', 'M0.45,-3.6 L3.4,-5.1 L0.45,-6.6'],
  ['notched bit', 'M0.45,-3.6 L3,-3.6 L3,-4.5 L2.1,-5.1 L3,-5.7 L3,-6.6 L0.45,-6.6'],
  ['double bit', 'M0.45,-4 L2.6,-4 L2.6,-6.6 L0.45,-6.6 M-0.45,-4 L-2.6,-4 L-2.6,-6.6 L-0.45,-6.6'],
  ['hooked bit', 'M0.45,-3.6 L3.2,-3.6 L3.2,-6.6 L2,-6.6 L2,-5 L0.45,-5'],
];

// [search words, (how high the shaft reaches) => nets, how deep the bow and the bit are]
const KEY_EXTRAS = [
  ['', () => []],
  ['key ring', () => [plate(oval(0, 9.2, 1.8, 1.8), (x, y) => [0, y, x])]],
  ['tag', () => [plate(`${path([2.4, 5.4], [4.4, 4.4])} ${box(4.4, 2.6, 6, 4.4)}`)]],
  ['sparkle', () => [plate(sparkle(4, 8.6, 1))]],
  ['thick key', () => [], 1.1],
  ['cord', () => [plate('M0,7.8 Q-3.6,10.6 -4.4,7 Q-4.8,5 -3.4,4.2')]],
  ['gem', (top) => [turned(`M0,${top + 1.5} L0.9,${top + 2.4} L0,${top + 3.3} ${dot(0.9, top + 2.4)}`, SQUARE)]],
];

const keys = solidFamily({
  cat: 'gear3d', count: 500, sizes: [KEY_BOWS.length, KEY_BITS.length, KEY_SHAFTS.length, KEY_EXTRAS.length],
  make: ([bow, bit, shaft, extra], k) => ({
    id: `3d-key-${k}`, name: `3D key ${k}`, sub: '3D keys',
    tags: words('lock door unlock', KEY_BOWS[bow][0], KEY_BITS[bit][0], KEY_SHAFTS[shaft][0], KEY_EXTRAS[extra][0]),
    build: () => {
      const [, outline, top] = KEY_BOWS[bow];
      const [, more, deep = 0.6] = KEY_EXTRAS[extra];
      return [thick(outline, deep), thick(KEY_BITS[bit][1], deep), turned(KEY_SHAFTS[shaft][1](top), SQUARE), ...more(top)];
    },
  }),
});

// ---------------------------------------------------------------- staffs
//
// A square pole around the axis and a head on top of it, from the height 4 up.

const STAFF_HEADS = [
  ['orb', () => [turned(ringOn('M0,4 C3.4,4 3.4,9 0,9', 6.5), { sides: 3 })]],
  ['crystal', () => [turned('M0,4 L1.8,6 L1.8,8 L0,10.4 D1.8,6 D1.8,8', SQUARE)]],
  ['moon', () => [thick('M0,4 C-3.8,4.6 -3.8,9.6 0.8,10.2 C-1.6,8.6 -1.6,5.6 0,4', 1.2)]],
  ['star', () => [crossed(star(0, 7.2, 5, 3, 1.3)), plate(path([0, 4], [0, 5.9]))]],
  ['caged orb', () => [turned('M0.6,4 C3.6,5 3.6,8 1,9.8', { sides: 4 }), turned('M0,5.6 C1.7,5.6 1.7,8.2 0,8.2', { sides: 3 })]],
  ['flame', () => [turned('M0,4 C3.4,5 1,7.6 0,10.4', { sides: 3 })]],
  ['trident', () => [crossed('M-2.6,9 L-2.6,5.4 L2.6,5.4 L2.6,9'), plate(path([0, 4], [0, 10.4]))]],
  ['hoop', () => [thick(oval(0, 6.7, 2.7, 2.7), 1.2)]],
  ['crook', () => [thick('M0,4 C0,9.4 4.2,9.8 4.2,6.8 C4.2,5 2,5 2,6.6', 1.2)]],
  ['wings', () => { const wing = plate(closed([0.5, 4.6], [4, 9], [2.8, 6.4], [4.2, 6.4], [0.5, 4])); return [wing, flipped(wing), turned('M0,4 L0,5 C1.5,5 1.5,7.4 0,7.4', { sides: 3 })]; }],
  ['sun', () => [turned('M0,5 C2.2,5 2.2,8.4 0,8.4', { sides: 3 }), plate([0, 45, 90, 135, 180, 225, 315].map((a) => path(polar(0, 6.7, 2.4, a), polar(0, 6.7, 3.6, a))).join(' ')), plate(path([0, 4], [0, 5]))]],
];

// (where it ends below) => profile, from the height 4 down
const STAFF_POLES = [
  ['', (low) => `M0.6,4 L0.6,${low}`],
  ['grip rings', (low) => `M0.6,4 L0.6,${low} D0.6,-1 D0.6,-2.2 D0.6,-3.4`],
  ['knobbed', (low) => `M0.6,4 L0.6,1.4 L1.3,0.7 L0.6,0 L0.6,-3.4 L1.3,-4.1 L0.6,-4.8 L0.6,${low}`],
  ['thick pole', (low) => `M0.95,4 L0.95,${low}`],
  ['banded', (low) => `M0.6,4 L0.6,${low} D1.4,2.4 D1.4,-2.6`],
  ['tapered', (low) => `M0.5,4 L1,${low}`],
  ['collar', (low) => `M0.6,4 L1.5,3.2 L0.6,2.4 L0.6,${low} D1.5,3.2`],
  ['ribbon', (low) => `M0.6,4 L0.6,${low}`, () => plate(path([0, 0], [13.8, 0]), (x) => [1.25 * Math.sin(x / 1.1), -5 + x * 0.5, 1.25 * Math.cos(x / 1.1)])],
  ['stepped', (low) => `M0.6,4 L0.6,-1 L1,-1 L1,${low} D1,-1`],
];

// [search words, how low the pole reaches, (that) => profile of its end]
const STAFF_FEET = [
  ['', -9, (low) => `M0.6,${low} L0,${low} D0.6,${low}`],
  ['pointed foot', -9, (low) => `M0.6,${low} L0,${low - 1.8} D0.6,${low}`],
  ['ball foot', -8.4, (low) => `M0.6,${low} C2,${low - 0.2} 2,${low - 2.4} 0,${low - 2.5}`],
  ['disc foot', -9, (low) => `M0.6,${low} L1.8,${low} L1.8,${low - 0.8} L0,${low - 0.8} D1.8,${low}`],
  ['short wand', -4.5, (low) => `M0.6,${low} L0,${low} D0.6,${low}`],
  ['long staff', -11.5, (low) => `M0.6,${low} L0,${low} D0.6,${low}`],
  ['gem foot', -8.6, (low) => `M0.6,${low} L1.4,${low - 1} L0,${low - 2.2} D1.4,${low - 1}`],
  ['wand with a cap', -5.5, (low) => `M0.6,${low} L1.3,${low} L1.3,${low - 1} L0,${low - 1} D1.3,${low}`],
];

const STAFF_EXTRAS = [
  ['', () => []],
  ['halo', () => [turned(dot(4, 7), { sides: 3 })]],
  ['sparkles', () => [plate(`${sparkle(4.6, 9.6, 1)} ${sparkle(-4.2, 5.2, 0.7)}`)]],
  ['ribbons', () => [plate('M0.6,3.4 Q3.4,3 3,-0.4 M-0.6,3.4 Q-2.6,2.6 -2,0.4')]],
  ['charm', () => [plate(`${path([0.6, 3.2], [2.6, 2.2])} ${diamond(2.6, 1.1, 0.8, 1.1)}`)]],
  ['upright ring', () => [plate(oval(0, 7, 4.2, 4.2), (x, y) => [0, y, x])]],
  ['feathers', () => [plate('M0.6,3.4 Q2.6,2.6 2.6,0 Q1.2,1.2 0.6,3.4 M-0.6,3.4 Q-2.6,2.6 -2.6,0 Q-1.2,1.2 -0.6,3.4')]],
];

const staffs = solidFamily({
  cat: 'gear3d', count: 500, sizes: [STAFF_HEADS.length, STAFF_POLES.length, STAFF_FEET.length, STAFF_EXTRAS.length],
  make: ([head, pole, foot, extra], k) => ({
    id: `3d-staff-${k}`, name: `3D staff ${k}`, sub: '3D staffs',
    tags: words('wand wizard magic mage rod', STAFF_HEADS[head][0], STAFF_POLES[pole][0], STAFF_FEET[foot][0], STAFF_EXTRAS[extra][0]),
    build: () => {
      const [, low, end] = STAFF_FEET[foot];
      const [, shaft, own] = STAFF_POLES[pole];
      const d = shaft(low);
      // the pole ends where its profile ends: the foot begins there
      const wide = Number(d.match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g).pop().split(',')[0]);
      return [...STAFF_HEADS[head][1](), turned(`${d} ${end(low).replace(/0\.6,/g, `${wide},`)}`, SQUARE), own && own(), ...STAFF_EXTRAS[extra][1]()];
    },
  }),
});

// ---------------------------------------------------------------- lanterns
//
// The glass from the height -3.4 to 2.6, a roof above, a foot below, a light inside and a ring to hang it from.

const SIX_SIDED = ['six sided', 6, 0, false];
// [search words, profile of the glass, how it is cut]
export const GLASSES = [
  ['square lantern', 'M2.6,-3.4 L2.6,2.6 D2.6,-3.4 D2.6,2.6', CUTS[1]],
  ['tapered lantern', 'M2,-3.4 L3,2.6 D2,-3.4 D3,2.6', CUTS[1]],
  ['six sided lantern', 'M2.5,-3.4 L2.5,2.6 D2.5,-3.4 D2.5,2.6', SIX_SIDED],
  ['globe lantern', 'M1.6,-3.4 C4.6,-2.4 4.6,1.6 1.6,2.6 D1.6,-3.4 D1.6,2.6', CUTS[0]],
  ['tube lantern', 'M2.4,-3.4 L2.4,2.6 D2.4,-3.4 D2.4,2.6', CUTS[0]],
  ['diamond lantern', 'M1.4,-3.4 L3.3,-0.4 L1.4,2.6 D1.4,-3.4 D3.3,-0.4 D1.4,2.6', CUTS[1]],
  ['hanging lantern', 'M1.5,-3.4 L2.7,2.6 D1.5,-3.4 D2.7,2.6', SIX_SIDED],
  ['paper lantern', ringOn('M1.4,-3.4 C4.8,-2.6 4.8,1.8 1.4,2.6 D1.4,-3.4 D1.4,2.6', -1.4, 0.6), CUTS[0]],
  ['bell jar lantern', 'M2.8,-3.4 L2.8,0.6 C2.8,2 1.8,2.6 1.2,2.6 D2.8,-3.4 D1.2,2.6', CUTS[0]],
  ['barred lantern', 'M2.6,-3.4 L2.6,2.6 D2.6,-3.4 D2.6,2.6 D2.6,-0.4', CUTS[1]],
  ['pagoda lantern', 'M2.2,-3.4 L2.2,1.6 L3.4,2.6 D2.2,-3.4 D3.4,2.6', CUTS[1]],
];

// (how wide the glass is at the top) => profile, from the height 2.6 up
export const LANTERN_ROOFS = [
  ['pyramid roof', (r) => `M${r},2.6 L${r + 0.9},2.6 L0,5.4 D${r + 0.9},2.6`],
  ['domed roof', (r) => `M${r},2.6 C${r},4.4 ${r / 2},5 0,5`],
  ['flat roof', (r) => `M${r},2.6 L${r},3.4 L0,3.4 L0,4.8 D${r},3.4`],
  ['curved roof', (r) => `M${r},2.6 L${r + 1.5},2.1 Q${r * 0.5},3.2 0,5.8 D${r + 1.5},2.1`],
  ['chimney', (r) => `M${r},2.6 L1,4 L1,5.4 D1,5.4`],
  ['two roofs', (r) => `M${r},2.6 L${r + 0.7},2.6 L${r * 0.5},3.9 L${r * 0.5 + 0.8},3.9 L0,5.6 D${r + 0.7},2.6 D${r * 0.5 + 0.8},3.9`],
  ['pointed roof', (r) => `M${r},2.6 L0,6.6`],
  ['onion roof', (r) => `M${r},2.6 C${r + 1.4},3.6 0.4,4.4 0,6.4`],
  ['open top', () => 'M0,2.6 L0,3.6'],
];

// (how wide the glass is at the bottom) => part
const LANTERN_FEET = [
  ['', (r) => `M0,-3.4 L${r},-3.4`],
  ['foot ring', (r) => `M${r},-3.4 L${r + 0.8},-4.5 L0,-4.5 D${r + 0.8},-4.5`],
  ['pedestal', (r) => `M${r},-3.4 L0.8,-4.4 L0.8,-5.3 L2.1,-6.2 L0,-6.2 D2.1,-6.2`],
  ['on legs', (r) => ({ d: `M0,-3.4 L${r},-3.4`, nets: [turned(`M${r * 0.7},-3.4 L${r * 0.7 + 0.9},-5.2`, { sides: 3, first: 90 })] })],
  ['pointed foot', (r) => `M${r},-3.4 L0,-5.6`],
  ['stepped foot', (r) => `M${r},-3.4 L${r + 0.7},-3.4 L${r + 0.7},-4.4 L0,-4.4 D${r + 0.7},-3.4 D${r + 0.7},-4.4`],
  ['round foot', (r) => `M${r},-3.4 C${r},-4.7 1,-5.5 0,-5.5`],
  ['tassel', (r) => ({ d: `M${r},-3.4 L0,-4.4 L0,-6`, nets: [plate(path([-0.7, -7.4], [0, -6], [0.7, -7.4]))] })],
];

const FLAME = 'M0,-2.6 C-1.7,-1.6 -0.6,-0.2 0,1.3 C0.6,-0.2 1.7,-1.6 0,-2.6';
// (how high the roof is) => nets: the light, and what it hangs from
const hook = (top) => plate(oval(0, top + 1.1, 1.1, 1.1));
const LIGHTS = [
  ['flame', (top) => [plate(FLAME), hook(top)]],
  ['candle', (top) => [turned('M0.6,-3.4 L0.6,-1.4 L0,-1.4 D0.6,-1.4', SQUARE), plate('M0,-1.4 C-1,-0.6 -0.4,0.4 0,1.4 C0.4,0.4 1,-0.6 0,-1.4'), hook(top)]],
  ['glowing orb', (top) => [turned(ringOn('M0,-2.2 C2.2,-2.2 2.2,1 0,1', -0.6), { sides: 3 }), hook(top)]],
  ['star light', (top) => [plate(star(0, -0.6, 5, 1.9, 0.85)), hook(top)]],
  ['fire', (top) => [plate(FLAME), plate(FLAME, (x, y) => [0, y, x]), hook(top)]],
  ['carrying handle', (top) => [plate(FLAME), plate(`M-3.6,1.6 Q-3.6,${top + 3.4} 0,${top + 3.4} Q3.6,${top + 3.4} 3.6,1.6`)]],
  ['fireflies', (top) => [specks([0.5, -1.6, 0.3], [-0.6, -0.5, -0.4], [0.3, 0.6, 0.4]), hook(top)]],
];

const lanterns = solidFamily({
  cat: 'gear3d', count: 500, sizes: [GLASSES.length, LANTERN_ROOFS.length, LANTERN_FEET.length, LIGHTS.length],
  make: ([glass, roof, foot, light], k) => ({
    id: `3d-lantern-${k}`, name: `3D lantern ${k}`, sub: '3D lanterns',
    tags: words('lamp light torch glow', GLASSES[glass][0], LANTERN_ROOFS[roof][0], LANTERN_FEET[foot][0], LIGHTS[light][0]),
    build: () => {
      const [, d, cut] = GLASSES[glass];
      const above = LANTERN_ROOFS[roof][1](edge(d).right(2.6)[0]);
      return [...vessel(cut, d, above, LANTERN_FEET[foot][1](edge(d).right(-3.4)[0])), ...LIGHTS[light][1](heights(above)[1])];
    },
  }),
});

// ---------------------------------------------------------------- bombs
//
// The body around the axis, a cap and a fuse on top of it, a mark on its front and what the fuse is doing.

const BALL = ['round', 4, 0, true]; // a ball: two circles through its top, and one around its middle
// [search words, profile, how it is cut, nets of its own]
export const BOMB_BODIES = [
  ['round bomb', ringOn('M0,-4 C5.4,-4 5.4,4 0,4', 0), BALL],
  ['egg bomb', ringOn('M0,-4.6 C5.2,-4.6 4,2 0,4', -1.8), BALL],
  ['squat bomb', ringOn('M0,-3 C6.4,-3 6.4,3.4 0,3.4', 0.2), BALL],
  ['cube bomb', 'M0,-3.4 L3.4,-3.4 L3.4,3.4 L0,3.4 D3.4,-3.4 D3.4,3.4', CUTS[1]],
  ['keg bomb', ringOn('M0,-4 L3,-4 C4,-2 4,2 3,4 L0,4 D3,-4 D3,4', 0), BALL],
  ['sea mine', ringOn('M0,-3.6 C4.8,-3.6 4.8,3.6 0,3.6', 0), BALL, () => [lines(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, z]) => [[x * 3.6, 0, z * 3.6], [x * 5.2, 0, z * 5.2]]), [[0, -3.6, 0], [0, -5.2, 0]])]],
  ['grenade', ringOn('M0,-4 C4.6,-4 4.6,4 0,4', -2, 0, 2), BALL],
  ['rocket bomb', ringOn('M0,4.4 C3.8,3 3.2,-1.6 1.2,-3 L1.2,-4.4 L0,-4.4 D1.2,-4.4', 1.6), BALL, () => [turned('M1.2,-3 L3.4,-5.2 L1.2,-4.4', { sides: 3, first: 30 })]],
  ['crystal bomb', 'M0,-4.4 L4,0 L0,4.4 D4,0', CUTS[1]],
  ['flask bomb', ringOn('M0,-4 C5.2,-4 5.2,2.6 1.3,3 L1.3,4.4 L0,4.4 D1.3,4.4', -0.6), BALL],
  ['pumpkin bomb', 'M0,-3.6 C5.6,-3.6 5.6,3.4 0,3.4', ['ribbed', 6, 0, true]],
];

// (how high the body is) => [nets, where the fuse ends]
const cap = (top) => turned(`M1.1,${top - 0.3} L1.1,${top + 0.9} L0,${top + 0.9} ${dot(1.1, top + 0.9)}`, { sides: 4, first: 45 });
const FUSES = [
  ['short fuse', (top) => [[cap(top), plate(path([0, top + 0.9], [0, top + 2.4]))], [0, top + 2.4]]],
  ['curved fuse', (top) => [[cap(top), plate(`M0,${top + 0.9} Q0.4,${top + 3} 2.6,${top + 3.4}`)], [2.6, top + 3.4]]],
  ['curly fuse', (top) => [[cap(top), plate(`M0,${top + 0.9} C2.4,${top + 1.4} -2.4,${top + 2.8} 0.6,${top + 3.8}`)], [0.6, top + 3.8]]],
  ['long fuse', (top) => [[cap(top), plate(`M0,${top + 0.9} Q1,${top + 3.6} 3.4,${top + 2.6} Q4.8,${top + 1.8} 4.8,${top}`)], [4.8, top]]],
  ['zigzag fuse', (top) => [[cap(top), plate(path([0, top + 0.9], [1, top + 1.8], [0, top + 2.7], [1, top + 3.6]))], [1, top + 3.6]]],
  ['looped fuse', (top) => [[cap(top), plate(`M0,${top + 0.9} C3.4,${top + 2} 2.4,${top + 4.4} 1,${top + 3.4} C0,${top + 2.6} 1.6,${top + 2} 3.4,${top + 3.8}`)], [3.4, top + 3.8]]],
  ['bare fuse', (top) => [[plate(`M0,${top} Q-0.4,${top + 2} -2.4,${top + 2.6}`)], [-2.4, top + 2.6]]],
  ['left fuse', (top) => [[cap(top), plate(`M0,${top + 0.9} Q-0.4,${top + 3} -2.6,${top + 3.4}`)], [-2.6, top + 3.4]]],
  ['pin', (top) => [[cap(top), plate(`${path([0, top + 0.9], [0, top + 1.6])} ${oval(1.3, top + 1.6, 1.3, 1.3, 180)}`)], [1.3, top + 2.9]]],
];

// drawings for the front of the body, around (0, 0)
export const BOMB_MARKS = [
  ['', ''],
  ['skull', `${oval(-1, 0.5, 0.75, 0.75)} ${oval(1, 0.5, 0.75, 0.75)} ${path([-0.9, -1.3], [0.9, -1.3])}`],
  ['cross', `${path([-1.5, -1.5], [1.5, 1.5])} ${path([-1.5, 1.5], [1.5, -1.5])}`],
  ['star', star(0, 0, 5, 1.9, 0.85)],
  ['angry eyes', `${path([-2, 1.4], [-0.5, 0.6])} ${path([2, 1.4], [0.5, 0.6])} ${dot(-1.2, -0.3)} ${dot(1.2, -0.3)}`],
  ['danger stripes', path(...zigzag([-2.4, -0.6], [2.4, -0.6], 3, 1.5))],
  ['target', `${oval(0, 0, 1.7, 1.7)} ${dot(0, 0)}`],
  ['shine', 'M-2.2,0.4 Q-2,2 -0.4,2.3'],
];

// (where the fuse ends) => nets
const SPARKS = [
  ['spark', ([x, y]) => [plate(star(x, y + 1.1, 4, 1.2, 0.45))]],
  ['flame', ([x, y]) => [plate(`M${x},${y} C${x - 1.3},${y + 0.8} ${x - 0.4},${y + 1.8} ${x},${y + 2.8} C${x + 0.4},${y + 1.8} ${x + 1.3},${y + 0.8} ${x},${y}`)]],
  ['sparks', ([x, y]) => [specks([x + 0.9, y + 0.9, 0], [x - 0.8, y + 1.1, 0.3], [x + 0.1, y + 1.9, -0.3])]],
  ['unlit', () => []],
  ['smoke', ([x, y]) => [moved(turned(`${dot(0.8, y + 1.3)} ${dot(1.2, y + 2.7)}`, { sides: 3 }), { to: [x, 0, 0] })]],
  ['sparkle', ([x, y]) => [plate(sparkle(x, y + 1.1, 1))]],
  ['burst', ([x, y]) => [plate(`${path([x, y + 0.7], [x, y + 2])} ${path([x + 0.6, y + 0.5], [x + 1.6, y + 1.4])} ${path([x - 0.6, y + 0.5], [x - 1.6, y + 1.4])}`)]],
];

const bombs = solidFamily({
  cat: 'gear3d', count: 500, sizes: [BOMB_BODIES.length, FUSES.length, BOMB_MARKS.length, SPARKS.length],
  make: ([body, fuse, mark, spark], k) => ({
    id: `3d-bomb-${k}`, name: `3D bomb ${k}`, sub: '3D bombs',
    tags: words('explosive boom tnt blast', BOMB_BODIES[body][0], FUSES[fuse][0], BOMB_MARKS[mark][0], SPARKS[spark][0]),
    build: () => {
      const [, d, cut, own] = BOMB_BODIES[body];
      const [nets, end] = FUSES[fuse][1](heights(d)[1]);
      return [...vessel(cut, d), ...(own ? own() : []), ...nets, BOMB_MARKS[mark][1] && plate(BOMB_MARKS[mark][1], onFront(cut, edge(d).right(0)[0] + 0.02)), ...SPARKS[spark][1](end)];
    },
  }),
});

// ---------------------------------------------------------------- hats
//
// The crown stands on the height 0, where the brim begins.

// [search words, profile from the brim to the top]
export const HAT_CROWNS = [
  ['wizard hat', 'M3,0 L0,9'],
  ['witch hat', 'M3,0 C1.6,2.6 0.8,5 0,9.4'],
  ['top hat', 'M2.8,0 L2.8,5 L0,5 D2.8,5'],
  ['bowler hat', 'M3,0 C3,3.4 1.8,4.2 0,4.2'],
  ['fez', 'M3,0 L2.2,4.4 L0,4.4 D2.2,4.4'],
  ['cowboy hat', 'M3,0 C3.2,2.4 2.8,4.2 1.6,4.4 L0,3.6 D1.6,4.4'],
  ['party hat', 'M2.4,0 L0,6.4'],
  ['stovepipe hat', 'M2.6,0 L2.6,6 L3.3,6.9 L0,6.9 D3.3,6.9'],
  ['pilgrim hat', 'M3,0 L2,6 L0,6 D2,6'],
  ['bell hat', 'M3,0 C3,1.8 1.6,2.4 1.4,5 L0,5.7'],
  ['tiered hat', 'M3,0 L2.2,3 L2.9,3 L1.4,6 L2.1,6 L0,9.4 D2.9,3 D2.1,6'],
];

// (how wide the crown is where it begins) => profile
const BRIMS = [
  ['wide brim', (r) => `M${r},0 L${r + 3},0 D${r + 3},0 D${r},0`],
  ['narrow brim', (r) => `M${r},0 L${r + 1.5},0 D${r + 1.5},0 D${r},0`],
  ['drooping brim', (r) => `M${r},0 Q${r + 2},0 ${r + 3},-1.5 D${r + 3},-1.5 D${r},0`],
  ['upturned brim', (r) => `M${r},0 Q${r + 2},0 ${r + 2.8},1.5 D${r + 2.8},1.5 D${r},0`],
  ['no brim', (r) => `D${r},0`],
  ['double brim', (r) => `M${r},0 L${r + 2.6},0 D${r + 2.6},0 D${r + 1.3},0 D${r},0`],
  ['very wide brim', (r) => `M${r},0 L${r + 4.2},0 D${r + 4.2},0 D${r},0`],
  ['fur trim', (r) => `M${r},0 L${r + 0.9},0 L${r + 0.9},1.1 D${r + 0.9},0 D${r + 0.9},1.1`],
  ['slanted brim', (r) => `M${r},0 L${r + 2.8},-1 D${r + 2.8},-1 D${r},0`],
];

// (outline of the crown) => part
const HAT_BANDS = [
  ['', () => ''],
  ['band', (crown) => dot(...crown.right(1.2))],
  ['buckle', (crown) => ({ d: dot(...crown.right(1.2)), nets: [plate(box(-0.9, 0.5, 0.9, 1.9), onFront(CUTS[0], crown.right(1.2)[0] + 0.05))] })],
  ['star', (crown) => ({ nets: [plate(star(0, 2.2, 5, 1.3, 0.55), onFront(CUTS[0], crown.right(2.2)[0] + 0.05))] })],
  ['feather', (crown) => ({ nets: [plate(`M${crown.right(1)[0]},1 Q${crown.right(1)[0] + 3},2.4 ${crown.right(1)[0] + 2.4},6 Q${crown.right(1)[0] + 1},3.6 ${crown.right(1)[0]},1`)] })],
  ['two bands', (crown) => `${dot(...crown.right(0.9))} ${dot(...crown.right(2))}`],
  ['moon', (crown) => ({ nets: [plate('M0.5,3.3 C-1.6,3 -1.6,1 0.5,0.9 C-0.5,1.5 -0.5,2.7 0.5,3.3', onFront(CUTS[0], crown.right(2.1)[0] + 0.05))] })],
  ['flower', (crown) => ({ nets: [plate(`${oval(0, 1.7, 0.6, 0.6)} ${[0, 72, 144, 216, 288].map((a) => dot(...polar(0, 1.7, 1.3, a + 90))).join(' ')}`, onFront(CUTS[0], crown.right(1.7)[0] + 0.05))] })],
];

// (how high the hat is) => nets
const HAT_TIPS = [
  ['', () => []],
  ['pom pom', (top) => [turned(`M0,${top} C1.5,${top} 1.5,${top + 2} 0,${top + 2}`, { sides: 3 })]],
  ['star tip', (top) => [plate(`${path([0, top], [0, top + 0.6])} ${star(0, top + 1.7, 5, 1.5, 0.65)}`)]],
  ['bent tip', (top) => [plate(`M0,${top} Q1.9,${top + 0.5} 2.3,${top - 1.4}`)]],
  ['tassel', (top) => [plate(`M0,${top} Q-2.6,${top + 0.4} -2.8,${top - 2} ${path([-3.4, top - 3.2], [-2.8, top - 2], [-2.2, top - 3.2])}`)]],
  ['sparkle', (top) => [plate(sparkle(2.4, top + 1, 1))]],
  ['halo', (top) => [turned(dot(1.9, top + 1.3), { sides: 3 })]],
];

const hats = solidFamily({
  cat: 'gear3d', count: 500, sizes: [HAT_CROWNS.length, BRIMS.length, HAT_BANDS.length, HAT_TIPS.length],
  make: ([crown, brim, band, tip], k) => ({
    id: `3d-hat-${k}`, name: `3D hat ${k}`, sub: '3D hats',
    tags: words('cap wizard witch costume head', HAT_CROWNS[crown][0], BRIMS[brim][0], HAT_BANDS[band][0], HAT_TIPS[tip][0]),
    build: () => {
      const d = HAT_CROWNS[crown][1];
      return [...vessel(CUTS[0], d, BRIMS[brim][1](Number(d.slice(1).split(',')[0])), HAT_BANDS[band][1](edge(d))), ...HAT_TIPS[tip][1](heights(d)[1])];
    },
  }),
});

export const GEAR3D_SHAPES = [...swords, ...axes, ...hammers, ...shields, ...helmets, ...keys, ...staffs, ...lanterns, ...bombs, ...hats];
export const GEAR3D_HEADINGS = ['3D swords', '3D axes', '3D hammers', '3D shields', '3D helmets', '3D keys', '3D staffs', '3D lanterns', '3D bombs', '3D hats'];
