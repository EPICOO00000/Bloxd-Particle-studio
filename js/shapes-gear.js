// The "Gear" tab: flat pictures of helmets, lanterns, bombs, hats, bows, arrows,
// boots, armour, amulets and torches, each kind put together from a few parts
// (shape-mix.js says how the parts are dealt out). The turned things are seen
// from the front: their profiles are the ones of shapes-gear3d.js.

import { flatFamily } from './shape-build.js';
import { edgeOf as edge, path, closed, oval, dot, box, polar, star, heart, diamond, ball, zigzag, wavy, roundedBox, ringOf, sparkle, left, mid } from './shape-mix.js';
import { DOMES, GLASSES, LANTERN_ROOFS, BOMB_BODIES, BOMB_MARKS, HAT_CROWNS } from './shapes-gear3d.js';
import { fromFront, bare, part, topOf, bottomOf, BOOK_SIGNS } from './shapes-loot.js';

const words = (...parts) => parts.filter(Boolean).join(' ');
const across = (b, y) => path(left(b.right(y)), b.right(y));
const rays = (x, y, from, to, angles) => angles.map((a) => path(polar(x, y, from, a), polar(x, y, to, a))).join(' ');
/** Where a profile begins: its first point. */
const startOf = (d) => d.slice(1).split(' ')[0].split(',').map(Number);
/** The lowest point of a drawing that is put together already. */
const floorOf = (drawing) => Math.min(...drawing.polys.flat().map((p) => p[1]), ...drawing.dots.map((p) => p[1]));
/** How far a drawing reaches to the side. */
const widthOf = (drawing) => Math.max(...drawing.polys.flat().map((p) => Math.abs(p[0])));

// ---------------------------------------------------------------- helmets
//
// The brow is at the height 0. What covers the face reaches w to each side and down to `low`.

const facePlate = (w, low) => path([-w, 0], [-w, low], [w, low], [w, 0]);
const HELMET_FRONTS = [
  ['open face', () => ''],
  ['nose guard', (w, low) => path([0, 0], [0, low])],
  ['visor slit', (w, low) => `${facePlate(w, low)} ${path([-0.6 * w, 0.4 * low], [0.6 * w, 0.4 * low])}`],
  ['eye holes', (w, low) => `${facePlate(w, low)} ${oval(-0.45 * w, 0.42 * low, 0.6, 0.5)} ${oval(0.45 * w, 0.42 * low, 0.6, 0.5)}`],
  ['grille', (w, low) => `${facePlate(w, low)} ${path([-w / 3, 0], [-w / 3, low])} ${path([w / 3, 0], [w / 3, low])}`],
  ['T visor', (w, low) => `${facePlate(w, low)} ${path([-0.65 * w, 0.35 * low], [0.65 * w, 0.35 * low])} ${path([0, 0.35 * low], [0, low])}`],
  ['cheek guards', (w, low) => ({ sides: path([1.3 * w, 0], [1.3 * w, low], [0.7 * w, low], [0.45 * w, 0]) })],
  ['mask', (w, low) => `M${-w},${0.4 * low} Q${-w},${1.2 * low} 0,${1.2 * low} Q${w},${1.2 * low} ${w},${0.4 * low} Z ${dot(-0.4 * w, 0.75 * low)} ${dot(0.4 * w, 0.75 * low)}`],
  ['goggles', (w, low) => `${oval(-0.5 * w, 0.5 * low, 0.38 * w, 0.3 * w)} ${oval(0.5 * w, 0.5 * low, 0.38 * w, 0.3 * w)}`],
];

// (outline of the dome, how high it is) => part
const HELMET_CRESTS = [
  ['', () => ''],
  ['horns', (dome) => { const [a, b] = [dome.right(1.8), dome.right(3.2)]; return { sides: `M${a[0]},${a[1]} Q${a[0] + 3},2 ${a[0] + 2.6},5.8 Q${a[0] + 1.3},4 ${b[0]},${b[1]}` }; }],
  ['cross finial', (dome, top) => `${path([0, top], [0, top + 2.4])} ${path([-0.8, top + 1.5], [0.8, top + 1.5])}`],
  ['plume', (dome, top) => `M0,${top} Q3.4,${top + 3} -1.6,${top + 4.6} Q0.2,${top + 2.4} 0,${top}`],
  ['wings', (dome) => { const [a, b] = [dome.right(2.6), dome.right(1.2)]; return { sides: path(a, [a[0] + 3.2, 6], [a[0] + 2.5, 4], [a[0] + 3.7, 3.8], [a[0] + 2.7, 2.4], [a[0] + 3.5, 1.8], b) }; }],
  ['fan crest', (dome, top) => { const [x, y] = dome.top(2); return `M${-x},${y} Q0,${top + 4.4} ${x},${y} ${path([0, top], [0, (y + top + 4.4) / 2])}`; }],
  ['top knob', (dome, top) => ball([0, top], [0, top + 1.5], 0.85)],
  ['antlers', (dome) => { const a = dome.right(2.8); return { sides: `${path(a, [a[0] + 1.5, 4.6], [a[0] + 1.1, 6.6])} ${path([a[0] + 1.5, 4.6], [a[0] + 2.9, 5.6])}` }; }],
];

// (outline of the dome, how high it is, its rim, the lowest point of the picture) => part
const HELMET_EXTRAS = [
  ['', () => ''],
  ['rivets', (dome) => [-0.6, -0.2, 0.2, 0.6].map((f) => dot(f * dome.right(0.9)[0], 0.9)).join(' ')],
  ['ridge', (dome) => path([0, 0], [0, dome.top(0.7)[1] - 0.2])],
  ['ear flaps', (dome, top, [rx, rim]) => ({ sides: closed([rx, rim], [rx + 1.1, rim - 1.2], [rx + 0.5, rim - 2.6], [rx - 0.3, rim - 1.3]) })],
  ['sparkle', (dome, top, [rx]) => sparkle(rx + 1.8, top + 3.4, 0.9)],
  ['shadow', (dome, top, [rx], floor) => oval(0, floor - 1.5, rx * 0.8, 0.5)],
  ['star badge', () => star(0, 1.15, 5, 0.95, 0.42)],
];

const helmets = flatFamily({
  cat: 'gear', count: 500, first: [0, 1, 1, 0], sizes: [DOMES.length, HELMET_FRONTS.length, HELMET_CRESTS.length, HELMET_EXTRAS.length],
  make: ([dome, front, crest, extra], k) => ({
    id: `helmet-${k}`, name: `Helmet ${k}`, sub: 'Helmets',
    tags: words('armour knight viking head', DOMES[dome][0], HELMET_FRONTS[front][0], HELMET_CRESTS[crest][0], HELMET_EXTRAS[extra][0]),
    draw: () => {
      const d = DOMES[dome][1];
      const outline = edge(bare(d));
      const rim = startOf(d);
      const low = rim[1] <= -3.5 ? rim[1] + 1.1 : Math.min(-3, rim[1] - 1.3); // a closed helm has its face on it
      const face = part(HELMET_FRONTS[front][1](0.7 * outline.right(0.01)[0], low));
      const above = part(HELMET_CRESTS[crest][1](outline, topOf(bare(d))));
      const more = part(HELMET_EXTRAS[extra][1](outline, topOf(bare(d)), rim, floorOf(fromFront([d, face.sides], face.once))));
      return fromFront([d, face.sides, above.sides, more.sides], face.once, above.once, more.once);
    },
  }),
});

// ---------------------------------------------------------------- lanterns
//
// The glass from the height -3.4 to 2.6, as in 3D; a ring around its middle would run through the light, so it is left out.

const MARK = /D(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g;
const endRings = (d) => d.replace(MARK, (mark, x, y) => (Number(y) === -3.4 || Number(y) === 2.6 ? mark : ''));
// what a glass has in the flat picture in place of its rings
const GLASS_SIDES = { 'barred lantern': 'M2.6,-0.4 L2,-0.4 M2.6,-1.9 L2,-1.9 M2.6,1.1 L2,1.1', 'paper lantern': 'M1.4,-3.4 C2.6,-2.4 2.6,1.6 1.4,2.6' };

// (how wide the glass is at the bottom) => part
const LANTERN_STANDS = [
  ['', () => ''],
  ['foot ring', (r) => ({ sides: `M${r},-3.4 L${r + 0.8},-4.5 L0,-4.5` })],
  ['pedestal', (r) => ({ sides: `M${r},-3.4 L0.8,-4.4 L0.8,-5.3 L2.1,-6.2 L0,-6.2` })],
  ['on legs', (r) => ({ sides: path([r * 0.7, -3.4], [r * 0.7 + 0.9, -5.2]) })],
  ['pointed foot', (r) => ({ sides: `M${r},-3.4 L0,-5.6` })],
  ['stepped foot', (r) => ({ sides: `M${r},-3.4 L${r + 0.7},-3.4 L${r + 0.7},-4.4 L0,-4.4` })],
  ['round foot', (r) => ({ sides: `M${r},-3.4 C${r},-4.7 1,-5.5 0,-5.5` })],
  ['tassel', () => `${path([0, -3.4], [0, -5])} ${path([-0.7, -6.4], [0, -5], [0.7, -6.4])}`],
];

const FLAME = 'M0,-2.6 C-1.7,-1.6 -0.6,-0.2 0,1.3 C0.6,-0.2 1.7,-1.6 0,-2.6';
const hook = (top) => oval(0, top + 1.1, 1.1, 1.1, 270);
// (how high the roof is, how wide the lantern is, the edge of the glass) => part
const LANTERN_LIGHTS = [
  ['flame', (top) => `${FLAME} ${hook(top)}`],
  ['candle', (top) => `${box(-0.6, -3.4, 0.6, -1.4)} M0,-1.4 C-1,-0.6 -0.4,0.4 0,1.4 C0.4,0.4 1,-0.6 0,-1.4 ${hook(top)}`],
  ['glowing orb', (top) => `${oval(0, -0.6, 1.5, 1.5)} ${hook(top)}`],
  ['star light', (top) => `${star(0, -0.6, 5, 1.9, 0.85)} ${hook(top)}`],
  ['carrying handle', (top, wide, glass) => ({ once: FLAME, sides: `M${glass.right(1.6)[0]},1.6 C${wide + 2.2},2.2 ${wide + 1.6},${top + 3.2} 0,${top + 3.2}` })],
  ['fireflies', (top) => `${dot(0.5, -1.6)} ${dot(-0.6, -0.5)} ${dot(0.3, 0.6)} ${hook(top)}`],
  ['shining', (top, wide) => ({ once: `${FLAME} ${hook(top)}`, sides: `${path([wide + 1.2, -0.4], [wide + 2.4, -0.4])} ${path([wide + 1, 1.4], [wide + 2, 2.2])}` })],
];

const lanterns = flatFamily({
  cat: 'gear', count: 500, sizes: [GLASSES.length, LANTERN_ROOFS.length, LANTERN_STANDS.length, LANTERN_LIGHTS.length],
  make: ([glass, roof, stand, light], k) => ({
    id: `lantern-${k}`, name: `Lantern ${k}`, sub: 'Lanterns',
    tags: words('lamp light glow', GLASSES[glass][0], LANTERN_ROOFS[roof][0], LANTERN_STANDS[stand][0], LANTERN_LIGHTS[light][0]),
    draw: () => {
      const d = endRings(GLASSES[glass][1]);
      const outline = edge(bare(d));
      const above = LANTERN_ROOFS[roof][1](outline.right(2.6)[0]);
      const below = part(LANTERN_STANDS[stand][1](outline.right(-3.4)[0]));
      const body = [d, GLASS_SIDES[GLASSES[glass][0]], above, below.sides];
      const lit = part(LANTERN_LIGHTS[light][1](topOf(bare(above)), widthOf(fromFront([d, above])), outline));
      return fromFront([...body, lit.sides], below.once, lit.once);
    },
  }),
});

// ---------------------------------------------------------------- bombs
//
// The body as in 3D, without its rings (they would run through the mark on its front).

// what a body has of its own in the flat picture: (its edge) => part
const BOMB_OWN = {
  'sea mine': (body) => ({ sides: [-45, 0, 45].map((a) => path(body.out(a), polar(0, 0, 5.3, a))).join(' '), once: path([0, -3.6], [0, -5.2]) }),
  'rocket bomb': () => ({ sides: 'M1.2,-3 L3.4,-5.2 L1.2,-4.4' }),
  grenade: () => ({ once: 'M1.1,4.5 Q4.6,4.8 4.3,0.4' }),
  'pumpkin bomb': () => ({ sides: 'M2.2,-2.8 Q3.9,-0.1 2.2,2.6' }),
};

// [search words, has a cap, (how high the body is) => drawing, (the same) => where it ends]
const BOMB_FUSES = [
  ['short fuse', true, (t) => path([0, t + 0.9], [0, t + 2.4]), (t) => [0, t + 2.4]],
  ['curved fuse', true, (t) => `M0,${t + 0.9} Q0.4,${t + 3} 2.6,${t + 3.4}`, (t) => [2.6, t + 3.4]],
  ['curly fuse', true, (t) => `M0,${t + 0.9} C2.4,${t + 1.4} -2.4,${t + 2.8} 0.6,${t + 3.8}`, (t) => [0.6, t + 3.8]],
  ['long fuse', true, (t) => `M0,${t + 0.9} Q1,${t + 3.6} 3.4,${t + 2.6} Q4.8,${t + 1.8} 4.8,${t}`, (t) => [4.8, t]],
  ['zigzag fuse', true, (t) => path([0, t + 0.9], [1, t + 1.8], [0, t + 2.7], [1, t + 3.6]), (t) => [1, t + 3.6]],
  ['looped fuse', true, (t) => `M0,${t + 0.9} C3.4,${t + 2} 2.4,${t + 4.4} 1,${t + 3.4} C0,${t + 2.6} 1.6,${t + 2} 3.4,${t + 3.8}`, (t) => [3.4, t + 3.8]],
  ['bare fuse', false, (t) => `M0,${t} Q-0.4,${t + 2} -2.4,${t + 2.6}`, (t) => [-2.4, t + 2.6]],
  ['left fuse', true, (t) => `M0,${t + 0.9} Q-0.4,${t + 3} -2.6,${t + 3.4}`, (t) => [-2.6, t + 3.4]],
  ['pin', true, (t) => `${path([0, t + 0.9], [0, t + 1.6])} ${oval(1.3, t + 1.6, 1.3, 1.3, 180)}`, (t) => [1.3, t + 2.9]],
];

// (where the fuse ends) => drawing
const BOMB_SPARKS = [
  ['spark', ([x, y]) => star(x, y + 1.2, 4, 1.2, 0.45)],
  ['flame', ([x, y]) => `M${x},${y} C${x - 1.3},${y + 0.8} ${x - 0.4},${y + 1.8} ${x},${y + 2.8} C${x + 0.4},${y + 1.8} ${x + 1.3},${y + 0.8} ${x},${y}`],
  ['sparks', ([x, y]) => `${dot(x + 0.9, y + 0.9)} ${dot(x - 0.8, y + 1.1)} ${dot(x + 0.1, y + 1.9)}`],
  ['unlit', () => ''],
  ['smoke', ([x, y]) => `${oval(x - 0.3, y + 1.5, 0.6, 0.6)} ${oval(x + 0.5, y + 3.2, 0.85, 0.85)}`],
  ['sparkle', ([x, y]) => sparkle(x, y + 1.2, 1)],
  ['burst', ([x, y]) => `${path([x, y + 0.7], [x, y + 2])} ${path([x + 0.6, y + 0.5], [x + 1.6, y + 1.4])} ${path([x - 0.6, y + 0.5], [x - 1.6, y + 1.4])}`],
];

const bombs = flatFamily({
  cat: 'gear', count: 500, sizes: [BOMB_BODIES.length, BOMB_FUSES.length, BOMB_MARKS.length, BOMB_SPARKS.length],
  make: ([body, fuse, mark, spark], k) => ({
    id: `bomb-${k}`, name: `Bomb ${k}`, sub: 'Bombs',
    tags: words('explosive boom tnt blast', BOMB_BODIES[body][0], BOMB_FUSES[fuse][0], BOMB_MARKS[mark][0], BOMB_SPARKS[spark][0]),
    draw: () => {
      const d = bare(BOMB_BODIES[body][1]);
      const outline = edge(d);
      const top = topOf(d);
      const own = part(BOMB_OWN[BOMB_BODIES[body][0]] && BOMB_OWN[BOMB_BODIES[body][0]](outline));
      const [, capped, line, end] = BOMB_FUSES[fuse];
      const y = outline.top(1.1)[1];
      return fromFront([d, own.sides, capped && path([1.1, y], [1.1, top + 0.9], [0, top + 0.9])], own.once, line(top), BOMB_MARKS[mark][1], BOMB_SPARKS[spark][1](end(top)));
    },
  }),
});

// ---------------------------------------------------------------- hats

// (how wide the crown is where it begins) => part
const HAT_BRIMS = [
  ['wide brim', (r) => `${path([-r - 3, 0], [r + 3, 0])} M${-r - 3},0 Q0,-2 ${r + 3},0`],
  ['narrow brim', (r) => `${path([-r - 1.5, 0], [r + 1.5, 0])} M${-r - 1.5},0 Q0,-1.4 ${r + 1.5},0`],
  ['drooping brim', (r) => ({ once: path([-r, 0], [r, 0]), sides: `M${r},0 Q${r + 2},0 ${r + 3},-1.5` })],
  ['upturned brim', (r) => ({ once: path([-r, 0], [r, 0]), sides: `M${r},0 Q${r + 2},0 ${r + 2.8},1.5` })],
  ['no brim', (r) => path([-r, 0], [r, 0])],
  ['floppy brim', (r) => `${path([-r, 0], [r, 0])} ${wavy([r, 0], [r + 3.2, -0.6], 2, 0.4)} ${wavy([-r, 0], [-r - 3.2, -0.6], 2, -0.4)}`],
  ['very wide brim', (r) => `${path([-r - 4.2, 0], [r + 4.2, 0])} M${-r - 4.2},0 Q0,-2.4 ${r + 4.2},0`],
  ['fur trim', (r) => roundedBox(0, -0.6, r + 0.8, 0.6, 0.6)],
  ['slanted brim', (r) => ({ once: path([-r, 0], [r, 0]), sides: `M${r},0 L${r + 2.8},-1` })],
];

// (edge of the crown) => drawing
const HAT_BANDS = [
  ['', () => ''],
  ['band', (crown) => across(crown, 1.2)],
  ['buckle', (crown) => `${across(crown, 1.2)} ${box(-0.9, 0.5, 0.9, 1.9)}`],
  ['star', () => star(0, 1.9, 5, 1.1, 0.48)],
  ['feather', (crown) => { const [x] = crown.right(1); return `M${x},1 Q${x + 3},2.4 ${x + 2.4},6 Q${x + 1},3.6 ${x},1`; }],
  ['two bands', (crown) => `${across(crown, 0.9)} ${across(crown, 2)}`],
  ['moon', () => 'M0.45,2.8 C-1.4,2.6 -1.4,1 0.45,0.8 C-0.45,1.3 -0.45,2.3 0.45,2.8'],
  ['patch', () => box(-0.6, 0.9, 0.6, 2.1)],
];

// (how high the hat is) => drawing
const HAT_TOPS = [
  ['', () => ''],
  ['pom pom', (top) => ball([0, top], [0, top + 1.5], 0.9)],
  ['star tip', (top) => `${path([0, top], [0, top + 1.05])} ${star(0, top + 1.7, 5, 1.5, 0.65)}`],
  ['bent tip', (top) => `M0,${top} Q1.9,${top + 0.5} 2.3,${top - 1.4}`],
  ['tassel', (top) => `M0,${top} Q-2.6,${top + 0.4} -2.8,${top - 2} ${path([-3.4, top - 3.2], [-2.8, top - 2], [-2.2, top - 3.2])}`],
  ['sparkle', (top) => sparkle(2.4, top + 1, 1)],
  ['halo', (top) => oval(0, top + 1.5, 2, 0.55)],
];

const hats = flatFamily({
  cat: 'gear', count: 500, sizes: [HAT_CROWNS.length, HAT_BRIMS.length, HAT_BANDS.length, HAT_TOPS.length],
  make: ([crown, brim, band, tip], k) => ({
    id: `hat-${k}`, name: `Hat ${k}`, sub: 'Hats',
    tags: words('cap wizard witch costume head', HAT_CROWNS[crown][0], HAT_BRIMS[brim][0], HAT_BANDS[band][0], HAT_TOPS[tip][0]),
    draw: () => {
      const d = HAT_CROWNS[crown][1];
      const under = part(HAT_BRIMS[brim][1](startOf(d)[0]));
      return fromFront([d, under.sides], under.once, HAT_BANDS[band][1](edge(bare(d))), HAT_TOPS[tip][1](topOf(bare(d))));
    },
  }),
});

// ---------------------------------------------------------------- bows
//
// A bow that shoots to the right: the stave bulges to the right, the string is on the left, the arrow lies on the height 0.

const spiked = Array.from({ length: 13 }, (_, i) => [8.8 * (i / 12) * (1 - i / 12) + (i % 2 ? 0.55 : 0), 7 - (14 * i) / 12]);
// [search words, the stave, its top tip, its bottom tip]
const BOW_STAVES = [
  ['longbow', 'M0,7 Q4.4,0 0,-7', [0, 7], [0, -7]],
  ['recurve bow', 'M-0.8,7 Q0.6,6.4 1,5 C2,2.6 2.8,1.4 2.8,0 C2.8,-1.4 2,-2.6 1,-5 Q0.6,-6.4 -0.8,-7', [-0.8, 7], [-0.8, -7]],
  ['short bow', 'M0,5 Q4,0 0,-5', [0, 5], [0, -5]],
  ['flat bow', path([0, 7], [2.2, 2.5], [2.2, -2.5], [0, -7]), [0, 7], [0, -7]],
  ['horn bow', 'M0,7 C3.6,6 1,2 2.4,0 C1,-2 3.6,-6 0,-7', [0, 7], [0, -7]],
  ['elven bow', 'M-0.6,6.4 Q-0.8,7.6 0.4,7 C2.4,5.8 2.9,2 2.9,0 C2.9,-2 2.4,-5.8 0.4,-7 Q-0.8,-7.6 -0.6,-6.4', [-0.6, 6.4], [-0.6, -6.4]],
  ['yumi', 'M0,8 C2.6,6 3,1 2.4,-2 Q1.9,-4.4 0,-6', [0, 8], [0, -6]],
  ['compound bow', `${path([0.5, 6.2], [2.2, 2.2], [2.2, -2.2], [0.5, -6.2])} ${oval(0, 6.6, 0.75, 0.75)} ${oval(0, -6.6, 0.75, 0.75)}`, [-0.75, 6.6], [-0.75, -6.6]],
  ['stepped bow', path([0, 7], [1.4, 5], [1.4, 3], [2.8, 1.5], [2.8, -1.5], [1.4, -3], [1.4, -5], [0, -7]), [0, 7], [0, -7]],
  ['wide bow', 'M0,6 C6.6,5 6.6,-5 0,-6', [0, 6], [0, -6]],
  ['spiked bow', path(...spiked), [0, 7], [0, -7]],
];

const HEAD = closed([7.6, 0], [6.4, 0.7], [6.4, -0.7]);
const arrowFrom = (x, head = HEAD) => `${path([x, 0], [6.4, 0])} ${head} ${path([x + 0.9, 0], [x + 0.2, 0.6])} ${path([x + 0.9, 0], [x + 0.2, -0.6])}`;
// (top tip, bottom tip) => drawing
const BOW_STRINGS = [
  ['strung', (a, b) => path(a, b)],
  ['drawn with an arrow', (a, b) => `${path(a, [-3, 0], b)} ${arrowFrom(-3)}`],
  ['arrow nocked', (a, b) => `${path(a, b)} ${arrowFrom(a[0])}`],
  ['unstrung', (a) => `M${a[0]},${a[1]} Q${a[0] - 2.2},${a[1] - 3} ${a[0] - 0.8},${a[1] - 6}`],
  ['half drawn', (a, b) => `${path(a, [-1.5, 0], b)} ${arrowFrom(-1.5)}`],
  ['fire arrow', (a, b) => `${path(a, [-3, 0], b)} ${arrowFrom(-3, 'M6.4,0 C7.2,1.3 8,0.4 9.4,0.2 C8.2,-0.4 7.4,-1.3 6.4,0')}`],
  ['magic arrow', (a, b) => `${path(a, [-3, 0], b)} ${arrowFrom(-3, `${path([6.4, 0], [6.95, 0])} ${star(7.5, 0, 5, 1.3, 0.55, 0)}`)}`],
  ['ice arrow', (a, b) => `${path(a, [-3, 0], b)} ${arrowFrom(-3, `${diamond(7.6, 0, 1.2, 0.8)} ${path([7.6, 0.8], [7.6, -0.8])}`)}`],
  ['broken string', (a, b) => `M${a[0]},${a[1]} Q${a[0] - 1.6},${a[1] - 2.4} ${a[0] - 0.4},${a[1] - 4.6} M${b[0]},${b[1]} Q${b[0] - 1.4},${b[1] + 1.6} ${b[0] - 0.5},${b[1] + 3.4}`],
];

// (how far to the right the stave is at a height) => drawing
const BOW_GRIPS = [
  ['', () => ''],
  ['wrapped grip', (at) => [-2.6, -1.8, 1.8, 2.6].map((y) => path([at(y) - 0.5, y], [at(y) + 0.5, y])).join(' ')],
  ['grip block', (at) => box(at(0) - 0.55, -1.6, at(0) + 0.55, 1.6)],
  ['arrow rest', (at) => path([at(1.9), 1.9], [at(1.9) + 1, 1.9], [at(1.9) + 1, 2.5])],
  ['grip gem', (at) => diamond(at(-2.6) + 0.95, -2.6, 0.55, 0.8)],
  ['sight ring', (at) => ball([at(2.6), 2.6], [at(2.6) + 1.3, 2.6], 0.6)],
  ['grip studs', (at) => `${dot(at(2.2) - 0.8, 2.2)} ${dot(at(-2.2) - 0.8, -2.2)}`],
  ['stabiliser', (at) => `${path([at(-2.8), -2.8], [at(-2.8) + 2, -2.8])} ${box(at(-2.8) + 2, -3.3, at(-2.8) + 2.9, -2.3)}`],
];

const BOW_EXTRAS = [
  ['', ''],
  ['sparkle', sparkle(4.8, 6.2, 0.9)],
  ['target', `${oval(12, 0, 1.6, 1.6)} ${dot(12, 0)}`],
  ['aim line', `${path([10.2, 0], [11.2, 0])} ${path([12, 0], [13, 0])}`],
  ['motion lines', `${path([-5.8, 1.2], [-4.6, 1.2])} ${path([-6.2, 0], [-4.8, 0])} ${path([-5.8, -1.2], [-4.6, -1.2])}`],
  ['quiver', `${box(-7.4, -5, -5.4, 1)} ${path([-6.9, 1], [-6.9, 2.6])} ${path([-5.9, 1], [-5.9, 2.2])} ${path([-7.3, 3.2], [-6.9, 2.6], [-6.5, 3.2])} ${path([-6.3, 2.8], [-5.9, 2.2], [-5.5, 2.8])}`],
  ['magic dust', `${dot(4.6, 4.8)} ${dot(5.6, 3.4)} ${dot(5.2, 6)}`],
];

const bows = flatFamily({
  cat: 'gear', count: 500, first: [0, 1, 0, 0], sizes: [BOW_STAVES.length, BOW_STRINGS.length, BOW_GRIPS.length, BOW_EXTRAS.length],
  make: ([stave, string, grip, extra], k) => ({
    id: `bow-${k}`, name: `Bow ${k}`, sub: 'Bows',
    tags: words('archer archery weapon shoot', BOW_STAVES[stave][0], BOW_STRINGS[string][0], BOW_GRIPS[grip][0], BOW_EXTRAS[extra][0]),
    draw: () => {
      const [, d, a, b] = BOW_STAVES[stave];
      return [d, BOW_STRINGS[string][1](a, b), BOW_GRIPS[grip][1]((y) => edge(d).right(y)[0]), BOW_EXTRAS[extra][1]].filter(Boolean).join(' ');
    },
  }),
});

// ---------------------------------------------------------------- arrows
//
// Drawn upright, point up, and shown slanting: the shaft from the height -6.4 up to the head.

// [search words, drawing, where the shaft ends]
const ARROW_HEADS = [
  ['broadhead', closed([0, 7.2], [1.5, 4.2], [0, 4.9], [-1.5, 4.2]), 4.9],
  ['bodkin point', closed([0, 7.4], [0.6, 4.6], [-0.6, 4.6]), 4.6],
  ['leaf head', 'M0,4.5 Q-1.7,5.4 0,7.4 Q1.7,5.4 0,4.5', 4.5],
  ['blunt head', roundedBox(0, 5.3, 0.9, 0.8, 0.4), 4.5],
  ['forked head', path([-1.4, 7.2], [0, 4.8], [1.4, 7.2]), 4.8],
  ['fire arrow', 'M0,4.5 C-1.9,5.5 -0.6,6.4 -0.2,7.8 C0.9,6.6 1.7,5.6 0,4.5', 4.5],
  ['heart arrow', heart(0, 5.9, 1.4), 4.5],
  ['star head', star(0, 5.9, 5, 1.6, 0.7), 5.2],
  ['sucker', 'M-1.5,4.6 Q-1.5,6.2 0,6.2 Q1.5,6.2 1.5,4.6 Z', 4.6],
  ['trident head', `${path([-1.3, 7], [-1.3, 5.2], [1.3, 5.2], [1.3, 7])} ${path([0, 5.2], [0, 7.4])}`, 5.2],
  ['crystal head', `${diamond(0, 5.9, 1, 1.4)} ${path([-1, 5.9], [1, 5.9])}`, 4.5],
];

const FLETCHINGS = [
  ['two feathers', { sides: 'M0,-3.6 L1.3,-4.6 L1.3,-6.6 L0,-5.6' }],
  ['swept feathers', { sides: 'M0,-3.8 L1.6,-6.8 L0,-5.8' }],
  ['barbs', { sides: 'M0,-4 L1.2,-5 M0,-5 L1.2,-6 M0,-6 L1.2,-7' }],
  ['round feathers', { sides: 'M0,-3.6 Q1.9,-4.4 1.3,-6.6 L0,-5.8' }],
  ['nock', { once: path([-0.5, -6.9], [0, -6.4], [0.5, -6.9]) }],
  ['ribbon tail', { once: wavy([0, -6.4], [0, -9.2], 3, 0.45) }],
  ['box vanes', { sides: 'M0,-4.2 L1.1,-4.2 L1.1,-6.4 L0,-6.4' }],
  ['long feathers', { sides: 'M0,-2.6 L1.1,-3.8 L1.1,-6.8 L0,-6' }],
  ['ball tail', { once: oval(0, -7.2, 0.8, 0.8, 90) }],
];

// (where the shaft ends) => drawing
const shaft = (to) => path([0, -6.4], [0, to]);
const ARROW_SHAFTS = [
  ['', shaft],
  ['banded', (to) => `${shaft(to)} ${path([-0.5, 1.2], [0.5, 1.2])} ${path([-0.5, 2.2], [0.5, 2.2])}`],
  ['cracked', (to) => path([0, -6.4], [0, -1], [0.5, -0.4], [-0.3, 0.2], [0, 0.8], [0, to])],
  ['bound', (to) => `${shaft(to)} ${path([-0.5, 1], [0.5, 1.7], [-0.5, 2.4])} ${path([0.5, 1], [-0.5, 1.7], [0.5, 2.4])}`],
  ['message', (to) => `${shaft(to)} ${box(-0.9, -1.2, 0.9, 0.2)}`],
  ['rope', (to) => `${shaft(to)} M0,-2 Q2.6,-2.6 2.2,-5.4`],
  ['glowing', (to) => `${shaft(to)} ${[-1.5, 0.5, 2.5].map((y) => `${dot(-0.9, y)} ${dot(0.9, y)}`).join(' ')}`],
  ['tail bands', (to) => `${shaft(to)} ${path([-0.5, -2.4], [0.5, -2.4])} ${path([-0.5, -1.4], [0.5, -1.4])}`],
];

const ARROW_EXTRAS = [
  ['', ''],
  ['motion lines', `${path([-2, -7.6], [-2, -9.4])} ${path([2, -7.6], [2, -9.4])} ${path([0, -9.9], [0, -11.2])}`],
  ['sparkle', sparkle(2.6, 6.6, 0.9)],
  ['impact', `${path([-0.9, 8.1], [-1.8, 9.1])} ${path([0, 8.4], [0, 9.6])} ${path([0.9, 8.1], [1.8, 9.1])}`],
  ['trail', `${dot(-1.4, -7.8)} ${dot(1.4, -8.4)} ${dot(0, -9.9)}`],
  ['wind swirl', wavy([-2.8, -3], [-2.8, 3], 3, 0.45)],
  ['aimed ring', oval(0, 5.9, 2.9, 2.9)],
];

const arrows = flatFamily({
  cat: 'gear', count: 500, turn: -45, sizes: [ARROW_HEADS.length, FLETCHINGS.length, ARROW_SHAFTS.length, ARROW_EXTRAS.length],
  make: ([head, fletching, line, extra], k) => ({
    id: `arrow-${k}`, name: `Arrow ${k}`, sub: 'Arrows',
    tags: words('archer bow shoot dart', ARROW_HEADS[head][0], FLETCHINGS[fletching][0], ARROW_SHAFTS[line][0], ARROW_EXTRAS[extra][0]),
    draw: () => fromFront([FLETCHINGS[fletching][1].sides], ARROW_SHAFTS[line][1](ARROW_HEADS[head][2]), ARROW_HEADS[head][1], FLETCHINGS[fletching][1].once, ARROW_EXTRAS[extra][1]),
  }),
});

// ---------------------------------------------------------------- boots
//
// A boot that walks to the right. The upper stands on the height -4, where the sole begins; the heel is at x = -3
// and the front of the leg at x = 0, from the height -0.6 up.

// [search words, the foot: from the heel along the ground to the toe and back to the leg, how far the sole reaches]
const ROUND_TOE = 'M-3,-4 L3.2,-4 C4.8,-4 4.8,-1.8 3,-1.8 L1.4,-1.8 Q0.2,-1.8 0,-0.6';
const BOOT_TOES = [
  ['round toe', ROUND_TOE, 4.2],
  ['pointed toe', 'M-3,-4 L5.4,-4 L1.6,-1.8 Q0.3,-1.6 0,-0.6', 5.4],
  ['curled toe elf', 'M-3,-4 L3.4,-4 Q5.4,-4 5.6,-1 Q4.4,-2.4 2.6,-1.8 L1.4,-1.8 Q0.2,-1.8 0,-0.6', 4.4],
  ['square toe', 'M-3,-4 L4.2,-4 L4.2,-2 L1.4,-2 Q0.2,-2 0,-0.6', 4.2],
  ['steel cap', `${ROUND_TOE} M2.4,-4 Q3,-2.9 2.4,-1.8`, 4.2],
  ['long toe', 'M-3,-4 L5.6,-4 Q5.8,-2.4 4,-2 L1.4,-1.8 Q0.3,-1.6 0,-0.6', 5.6],
  ['clawed toe', 'M-3,-4 L3.6,-4 L4.8,-4.3 L4.2,-3.5 L5.2,-3.3 L4.2,-2.8 L4.8,-2.1 L3.4,-1.9 L1.4,-1.8 Q0.2,-1.8 0,-0.6', 3.6],
  ['bulb toe', 'M-3,-4 L2.6,-4 C5.6,-4.4 5.6,-0.8 2.8,-1.2 Q1.6,-1.4 1.2,-1.8 Q0.2,-1.8 0,-0.6', 4.6],
  ['armoured toe sabaton', 'M-3,-4 L5,-4 L1.6,-1.8 Q0.3,-1.6 0,-0.6 M1.6,-4 L1.3,-1.9 M3.2,-4 L2.7,-2.5', 5],
  ['ski boot', 'M-3,-4 L4.4,-4 L4.4,-2.6 L3,-1.4 L1.2,-1.4 L0,-0.6', 4.4],
  ['slipper toe', 'M-3,-4 L3.6,-4 Q4.8,-4 4.4,-3 Q3,-2.2 1.2,-2.4 Q0.2,-2 0,-0.6', 4.4],
];

// [search words, the front of the leg, its back, the top edge: from x, to x, how high]
const BOOT_LEGS = [
  ['ankle boot', 'M0,-0.6 L0,1.4', 'M-3,-4 L-3,1.4', [-3, 0, 1.4]],
  ['tall boot', 'M0,-0.6 L0,5', 'M-3,-4 L-3,5', [-3, 0, 5]],
  ['wide top pirate boot', 'M0,-0.6 L0,2 L1,5', 'M-3,-4 L-3,2 L-4,5', [-4, 1, 5]],
  ['slouch boot', 'M0,-0.6 Q0.6,0.6 0,1.6 Q-0.5,2.6 0.2,3.6', 'M-3,-4 L-3,0 Q-3.5,1 -3,1.8 Q-2.6,2.8 -3.2,3.6', [-3.2, 0.2, 3.6]],
  ['narrow tall boot', 'M0,-0.6 L-0.4,5', 'M-3,-4 L-2.6,5', [-2.6, -0.4, 5]],
  ['mid boot', 'M0,-0.6 L0,3', 'M-3,-4 L-3,3', [-3, 0, 3]],
  ['flared boot', 'M0,-0.6 Q0,2.4 1.2,4', 'M-3,-4 L-3,1 Q-3,2.8 -4.2,4', [-4.2, 1.2, 4]],
  ['low shoe', 'M0,-0.6 L0,0.2', 'M-3,-4 L-3,0.2', [-3, 0, 0.2]],
  ['thigh boot', 'M0,-0.6 L0.2,6.4', 'M-3,-4 L-3.2,6.4', [-3.2, 0.2, 6.4]],
];

// (how far the sole reaches) => drawing
const flatSole = (to) => path([-3, -4], [-3, -4.8], [to, -4.8], [to, -4]);
const BOOT_SOLES = [
  ['flat sole', flatSole],
  ['heel', (to) => path([-3, -4], [-3, -5.6], [-1.2, -5.6], [-1.2, -4.7], [to, -4.7], [to, -4])],
  ['platform', (to) => path([-3, -4], [-3, -6], [to, -6], [to, -4])],
  ['soft sole', () => ''],
  ['spiked sole', (to) => `${flatSole(to)} ${path(...zigzag([-3, -4.8], [to, -4.8], 5, -0.9))}`],
  ['roller skate', (to) => `${flatSole(to)} ${oval(-1.8, -5.4, 0.8, 0.8)} ${oval(to - 1.4, -5.4, 0.8, 0.8)}`],
  ['ice skate', (to) => `${flatSole(to)} ${path([-2.2, -4.8], [-2.2, -5.8])} ${path([to - 1.2, -4.8], [to - 1.2, -5.8])} M-3.4,-5.8 L${to - 0.4},-5.8 Q${to + 0.8},-5.8 ${to + 0.8},-4.9`],
  ['spur', (to) => `${flatSole(to)} ${path([-3, -3.6], [-4.2, -3.6])} ${star(-5, -3.6, 6, 0.8, 0.4, 0)}`],
];

// (the top edge: from x, to x, how high) => drawing
const BOOT_TRIMS = [
  ['', (x0, x1, top) => path([x0, top], [x1, top])],
  ['cuff', (x0, x1, top) => closed([x0 - 0.5, top], [x1 + 0.5, top], [x1 + 0.5, top - 1.3], [x0 - 0.5, top - 1.3])],
  ['fur trim', (x0, x1, top) => `${path(...zigzag([x0 - 0.4, top], [x1 + 0.4, top], 4, 0.8))} ${path([x0 - 0.4, top], [x1 + 0.4, top])}`],
  ['buckle strap', (x0, x1, top) => `${path([x0, top], [x1, top])} ${path([-3, -0.6], [0, -0.6])} ${box(-1.9, -1.1, -1.1, -0.1)}`],
  ['winged', (x0, x1, top) => `${path([x0, top], [x1, top])} ${path([-3, -0.4], [-5.6, 1.4], [-4.4, 0], [-5.8, -0.6], [-4.2, -1.2], [-5.2, -2], [-3, -2])}`],
  ['star badge', (x0, x1, top) => `${path([x0, top], [x1, top])} ${star(-1.5, -2.4, 5, 0.9, 0.4)}`],
  ['pull loop', (x0, x1, top) => `${path([x0, top], [x1, top])} ${oval(x0 - 0.4, top - 0.8, 0.7, 0.7)}`],
];

const boots = flatFamily({
  cat: 'gear', count: 500, sizes: [BOOT_TOES.length, BOOT_LEGS.length, BOOT_SOLES.length, BOOT_TRIMS.length],
  make: ([toe, leg, sole, trim], k) => ({
    id: `boot-${k}`, name: `Boot ${k}`, sub: 'Boots',
    tags: words('shoe footwear speed armour', BOOT_TOES[toe][0], BOOT_LEGS[leg][0], BOOT_SOLES[sole][0], BOOT_TRIMS[trim][0]),
    draw: () => {
      const [, front, back, edgeOnTop] = BOOT_LEGS[leg];
      return [BOOT_TOES[toe][1], front, back, BOOT_SOLES[sole][1](BOOT_TOES[toe][2]), BOOT_TRIMS[trim][1](...edgeOnTop)].filter(Boolean).join(' ');
    },
  }),
});

// ---------------------------------------------------------------- armour
//
// A chest plate from the front: the right half is drawn, from the collar at (1.4, 5) around to the middle of the hem.

const ARMOUR_BODIES = [
  ['breastplate', 'M1.4,5 L4.4,4.4 L3.6,2 Q3.8,-1 3,-3.6 L0,-3.6'],
  ['muscle cuirass', 'M1.4,5 L4.2,4.6 Q4.6,2.6 3.4,2 Q4,-0.6 2.8,-3.6 L0,-4.2 M3.3,1.9 Q2.4,1.3 1.9,2.4'],
  ['mail shirt', 'M1.4,5 L4.6,4.2 L4.6,1.6 L3.4,1.6 L3.4,-3.4 L2.3,-4.4 L1.2,-3.4 L0,-4.4'],
  ['plate with tassets', 'M1.4,5 L4.4,4.4 L3.6,2 L3,-2 L0,-2 M0.8,-2 L0.8,-4.6 L3.3,-4.2 L3,-2'],
  ['padded jack', 'M1.4,5 L3.4,4.6 L3,2.4 Q3.4,-1 3,-4 L0,-4 M1.9,2 L1.9,-3.4'],
  ['round cuirass', 'M1.4,5 L4,4.6 C5.4,2 5.2,-2.6 3,-4 L0,-4'],
  ['spiked armour', 'M1.4,5 L4.4,4.4 L5.6,5.4 L4.6,3 L3.6,2 Q3.8,-1 3,-3.6 L0,-3.6'],
  ['tabard', 'M1.4,5 L3.6,4.6 L3.6,-4.6 L0,-4.6'],
  ['waisted armour', 'M1.4,5 L4.2,4.4 L3.6,2.4 Q2,-0.4 2.4,-1.6 L3.6,-4.2 L0,-4.2'],
  ['crystal armour', 'M1.4,5 L4.6,4 L4,1 L4.6,-1.4 L2.6,-4.4 L0,-3.4'],
  ['pot belly plate', 'M1.4,5 L4,4.6 L3.4,2.6 C5.6,1.6 5.2,-3.6 2.6,-4.2 L0,-4.2'],
];

const ARMOUR_NECKS = [
  ['round neck', { sides: 'M1.4,5 Q1.2,3.8 0,3.8' }],
  ['V neck', { sides: 'M1.4,5 L0,3.2' }],
  ['high collar', { sides: 'M1.4,5 L1.6,6.6 L0,6.2' }],
  ['pauldrons shoulder plates', { sides: 'M1.4,5 Q1.2,3.8 0,3.8 M2.2,4.85 Q4.2,7.2 6,4.4 L6,3.4 L4.4,3.7' }],
  ['spiked collar', { sides: 'M1.4,5 L1.9,6.6 L0.9,5.6 L0,6.8' }],
  ['deep neck', { sides: 'M1.4,5 Q1.4,2.8 0,2.4' }],
  ['gorget', { sides: 'M1.4,5 L2.2,3.4 L0,2.6', once: path([-1.4, 5], [1.4, 5]) }],
  ['studded', { sides: 'M1.4,5 Q1.2,3.8 0,3.8', once: `${dot(2.2, 3.6)} ${dot(-2.2, 3.6)} ${dot(1.9, 2.8)} ${dot(-1.9, 2.8)}` }],
  ['square neck', { sides: 'M1.4,5 L1.4,3.6 L0,3.6' }],
];

const ARMOUR_SIGNS = [
  ['', ''],
  ['cross', `${path([0, -1.5], [0, 1.5])} ${path([-1.1, 0.4], [1.1, 0.4])}`],
  ['star', star(0, 0, 5, 1.5, 0.65)],
  ['heart', heart(0, 0.1, 1.3)],
  ['gem', `${diamond(0, 0, 1, 1.5)} ${path([-1, 0], [1, 0])}`],
  ['sun', `${oval(0, 0, 0.6, 0.6)} ${rays(0, 0, 1, 1.5, [0, 45, 90, 135, 180, 225, 270, 315])}`],
  ['ring', oval(0, 0, 1.3, 1.3)],
  ['bolt', path([0.6, 1.5], [-0.7, -0.1], [0.6, -0.1], [-0.5, -1.5])],
];

// (edge of the body, its lowest point) => part
const ARMOUR_BELTS = [
  ['', () => ''],
  ['belt', (body) => `${across(body, -2.2)} ${across(body, -3)}`],
  ['buckle belt', (body) => `${across(body, -2.6)} ${box(-0.7, -3.2, 0.7, -2)}`],
  ['side rivets', (body) => [0.4, -0.8].map((y) => `${dot(body.right(y)[0] - 0.6, y)} ${dot(0.6 - body.right(y)[0], y)}`).join(' ')],
  ['sword belt', (body) => { const [w] = body.right(-2.6); return `${across(body, -2.6)} ${path([-w, -2.6], [-w - 1.5, -1])} ${path([-w - 1.9, -1.9], [-w - 0.6, -1.4])}`; }],
  ['cape', () => ({ sides: 'M5.4,2.8 Q6.8,-1 6.2,-5.6', once: wavy([-6.2, -5.6], [6.2, -5.6], 6, 0.3) })],
  ['on a stand', (body, low) => `${path([0, low - 0.6], [0, low - 2])} ${path([-2, low - 2], [2, low - 2])}`],
];

const armour = flatFamily({
  cat: 'gear', count: 500, first: [0, 0, 1, 1], sizes: [ARMOUR_BODIES.length, ARMOUR_NECKS.length, ARMOUR_SIGNS.length, ARMOUR_BELTS.length],
  make: ([body, neck, sign, belt], k) => ({
    id: `armour-${k}`, name: `Armour ${k}`, sub: 'Armour',
    tags: words('armor chest plate knight body', ARMOUR_BODIES[body][0], ARMOUR_NECKS[neck][0], ARMOUR_SIGNS[sign][0], ARMOUR_BELTS[belt][0]),
    draw: () => {
      const d = ARMOUR_BODIES[body][1];
      const around = part(ARMOUR_BELTS[belt][1](edge(d), bottomOf(d)));
      return fromFront([d, ARMOUR_NECKS[neck][1].sides, around.sides], ARMOUR_NECKS[neck][1].once, ARMOUR_SIGNS[sign][1], around.once);
    },
  }),
});

// ---------------------------------------------------------------- amulets
//
// The pendant hangs around (0, -2). [search words, drawing, its top, its lowest point, where its sign goes: x, y, size]

const AMULET_FRAMES = [
  ['round amulet', oval(0, -2, 3.4, 3.4), 1.4, -5.4, [0, -2, 1.7]],
  ['teardrop amulet', 'M0,1.4 C-4.4,-2 -3,-5.4 0,-5.4 C3,-5.4 4.4,-2 0,1.4', 1.4, -5.4, [0, -2.6, 1.5]],
  ['diamond amulet', diamond(0, -2, 2.9, 3.4), 1.4, -5.4, [0, -2, 1.2]],
  ['heart locket', heart(0, -1.6, 3.2), -0.32, -4.8, [0, -2, 1]],
  ['star amulet', star(0, -2, 5, 3.6, 1.7), 1.6, -3.7, [0, -2, 0.95]],
  ['shield amulet', 'M-3,1.4 L3,1.4 L3,-2 Q3,-4.6 0,-5.6 Q-3,-4.6 -3,-2 Z', 1.4, -5.6, [0, -1.6, 1.6]],
  ['hexagon amulet', closed(...ringOf((a) => polar(0, -2, 3.4, a), 60)), 1.4, -5.4, [0, -2, 1.6]],
  ['square amulet', box(-2.9, -4.9, 2.9, 0.9), 0.9, -4.9, [0, -2, 1.6]],
  ['triangle amulet', closed([0, 1.4], [3.6, -4.6], [-3.6, -4.6]), 1.4, -4.6, [0, -3, 1.1]],
  ['eye amulet', oval(0, -2, 3.6, 2.4), 0.4, -4.4, [0, -2, 1.3]],
  ['cog amulet', star(0, -2, 10, 3.5, 2.9), 1.5, -5.5, [0, -2, 1.6]],
];

// (the top of the ring the pendant hangs from) => part
const AMULET_CHAINS = [
  ['cord', (t) => ({ sides: path([0, t], [4.2, 6.8]) })],
  ['curved chain', (t) => ({ sides: `M0,${t} Q3.8,${t + 0.4} 4.4,6.8` })],
  ['beaded chain', (t) => ({ once: [0, 1, 2, 3, 4, 5].map((i) => mid([0, t], [4.2, 6.8], 0.2 + 0.16 * i)).map(([x, y]) => `${dot(x, y)} ${dot(-x, y)}`).join(' ') })],
  ['knotted cord', (t) => ({ sides: `${path([0, t], [4.2, 6.8])} ${diamond(...mid([0, t], [4.2, 6.8]), 0.8, 0.8)}` })],
  ['ring', (t) => ({ once: oval(0, t + 1.9, 1.9, 1.9, 270) })],
  ['zigzag chain', (t) => ({ sides: path(...zigzag([0, t], [4.2, 6.8], 5, 0.4)) })],
  ['pin brooch', (t) => ({ once: `${path([-3, t], [3, t])} ${oval(3.6, t, 0.6, 0.6, 180)}` })],
  ['hook', (t) => ({ once: `M0,${t} Q0,${t + 2.6} 1.6,${t + 2.6} Q3.2,${t + 2.6} 3.2,${t + 1}` })],
];

// (the lowest point of the pendant) => drawing
const AMULET_EXTRAS = [
  ['', () => ''],
  ['sparkle', () => sparkle(4.8, -4.6, 0.9)],
  ['glowing', () => rays(0, -2, 4.4, 5.4, [200, 235, 305, 340])],
  ['drop', (low) => ball([0, low], [0, low - 1.5], 0.7)],
  ['side stones', () => `${diamond(4.7, -2, 0.5, 0.75)} ${diamond(-4.7, -2, 0.5, 0.75)}`],
  ['magic dust', () => `${dot(-4.4, 0.6)} ${dot(-5.2, -0.8)} ${dot(-4.6, -2.4)}`],
  ['tassel', (low) => `${path([0, low], [0, low - 2.4])} ${path([-0.8, low - 2.4], [0, low - 0.9], [0.8, low - 2.4])}`],
];

const amulets = flatFamily({
  cat: 'gear', count: 500, sizes: [AMULET_FRAMES.length, 9, AMULET_CHAINS.length, AMULET_EXTRAS.length],
  make: ([frame, sign, chain, extra], k) => ({
    id: `amulet-${k}`, name: `Amulet ${k}`, sub: 'Amulets',
    tags: words('necklace pendant charm talisman magic', AMULET_FRAMES[frame][0], BOOK_SIGNS[sign][0], AMULET_CHAINS[chain][0], AMULET_EXTRAS[extra][0]),
    draw: () => {
      const [, d, top, low, at] = AMULET_FRAMES[frame];
      const held = AMULET_CHAINS[chain][1](top + 1.4);
      return fromFront([held.sides], d, oval(0, top + 0.7, 0.7, 0.7, 270), BOOK_SIGNS[sign][1](...at), held.once, AMULET_EXTRAS[extra][1](low));
    },
  }),
});

// ---------------------------------------------------------------- torches
//
// The handle from the height 0 down, the head from 0 to 1.6, and the flame on it, 1.4 to each side where it begins.

const SMALL_FLAME = 'M-1.2,1.6 C-1.8,2.6 -0.6,3.2 0,4.4 C0.6,3.2 1.8,2.6 1.2,1.6';
const TORCH_FLAMES = [
  ['flame', 'M-1.4,1.6 C-3,3.4 -1,4.6 0,7 C1,4.6 3,3.4 1.4,1.6'],
  ['tall flame', 'M-1.2,1.6 C-2,4 -0.6,5.6 0,8 C0.6,5.6 2,4 1.2,1.6'],
  ['forked flame', 'M-1.4,1.6 C-3.2,3.6 -1.6,4.8 -1.2,6.8 C-0.6,5.6 -0.2,5 0,4.4 C0.4,5.2 1,6 1.6,7.4 C2,5 3,3.6 1.4,1.6'],
  ['blown flame', 'M-1.4,1.6 C-2.6,3 -0.4,4.4 2.6,6.6 C2.4,4.6 3.2,3 1.4,1.6'],
  ['round fire', 'M-1.4,1.6 C-4,2.6 -3,6 0,6.2 C3,6 4,2.6 1.4,1.6'],
  ['three tongues', 'M-1.4,1.6 L-2.4,4.6 L-1,3.6 L0,6.8 L1,3.6 L2.4,4.6 L1.4,1.6'],
  ['ember', SMALL_FLAME],
  ['magic flame', `${path([0, 1.6], [0, 3.2])} ${star(0, 4.4, 5, 2.8, 1.2)}`],
  ['swirling flame', 'M-1.4,1.6 C-3.4,4 -0.6,7 1.2,5.6 C2.4,4.6 1.2,3.2 0.2,4.2 M1.4,1.6 Q3,3.4 2.4,5.2'],
  ['double flame', 'M-1.4,1.6 C-3,3.4 -1,4.6 0,7 C1,4.6 3,3.4 1.4,1.6 M-0.6,2.2 C-1.2,3.2 -0.3,3.8 0,5 C0.3,3.8 1.2,3.2 0.6,2.2'],
  ['smoky flame', `${SMALL_FLAME} ${wavy([-0.6, 5.2], [-0.6, 7.6], 2, 0.4)} ${wavy([0.7, 5.6], [0.7, 8], 2, 0.4)}`],
];

const CUP = closed([-0.6, 0], [-1.4, 1.6], [1.4, 1.6], [0.6, 0]);
const TORCH_HEADS = [
  ['cup', CUP],
  ['wrapped head', `${box(-1.2, 0, 1.2, 1.6)} ${path([-1.2, 0.5], [1.2, 1.1])}`],
  ['bowl brazier', 'M-2.6,1.6 Q-2.4,0 -0.6,0 L0.6,0 Q2.4,0 2.6,1.6 Z'],
  ['cage', `${box(-1.4, 0, 1.4, 1.6)} ${path([-0.5, 0], [-0.5, 1.6])} ${path([0.5, 0], [0.5, 1.6])}`],
  ['banded cup', `${CUP} ${path([-1, 0.8], [1, 0.8])}`],
  ['spiked cup', `${CUP} ${path([-1.4, 1.6], [-2.4, 2.4])} ${path([1.4, 1.6], [2.4, 2.4])}`],
  ['plate sconce', closed([-0.6, 0], [-0.6, 0.9], [-2.4, 0.9], [-2.4, 1.6], [2.4, 1.6], [2.4, 0.9], [0.6, 0.9], [0.6, 0])],
  ['cone head', closed([0, 0], [-1.4, 1.6], [1.4, 1.6])],
  ['double cup', `${closed([-0.6, 0], [-1.2, 0.8], [1.2, 0.8], [0.6, 0])} ${closed([-0.8, 0.8], [-1.4, 1.6], [1.4, 1.6], [0.8, 0.8])}`],
];

const TORCH_HANDLES = [
  ['', box(-0.6, -7, 0.6, 0)],
  ['wrapped handle', `${box(-0.6, -7, 0.6, 0)} ${path([-0.6, -2], [0.6, -1.4])} ${path([-0.6, -3.6], [0.6, -3])} ${path([-0.6, -5.2], [0.6, -4.6])}`],
  ['stake', closed([-0.6, 0], [-0.6, -5.6], [0, -7.4], [0.6, -5.6], [0.6, 0])],
  ['short handle', box(-0.6, -4.4, 0.6, 0)],
  ['tapered handle', closed([-0.7, 0], [0.7, 0], [0.3, -7], [-0.3, -7])],
  ['wall bracket', `${box(-0.6, -7, 0.6, 0)} ${path([0.6, -1.6], [2.8, -1.6])} ${path([0.6, -3.4], [2.8, -3.4])} ${path([2.8, -0.6], [2.8, -5])}`],
  ['knobbed handle', `${box(-0.6, -6, 0.6, 0)} ${diamond(0, -6.9, 0.9, 0.9)}`],
  ['club', closed([-0.6, 0], [0.6, 0], [1, -7], [-1, -7])],
];

// (how high the flame is) => drawing
const TORCH_EXTRAS = [
  ['', () => ''],
  ['sparks', (top) => `${dot(-1.6, top + 0.9)} ${dot(1.4, top + 1.5)} ${dot(-0.3, top + 2.3)}`],
  ['glowing', (top) => rays(0, (top + 1.6) / 2, (top - 1.6) / 2 + 1.2, (top - 1.6) / 2 + 2.2, [0, 60, 120, 180])],
  ['smoke', (top) => wavy([0, top + 0.8], [0, top + 3.4], 2, 0.5)],
  ['light ring', () => oval(0, 4.4, 4.6, 4.6)],
  ['dripping', () => `${dot(-1.6, -1)} ${dot(-1.9, -2.6)}`],
  ['moths', (top) => `${path([-3.6, top - 1.2], [-3.1, top - 1.7], [-2.6, top - 1.2])} ${path([2.9, 2.6], [3.4, 2.1], [3.9, 2.6])}`],
];

const torches = flatFamily({
  cat: 'gear', count: 500, sizes: [TORCH_FLAMES.length, TORCH_HEADS.length, TORCH_HANDLES.length, TORCH_EXTRAS.length],
  make: ([flame, head, handle, extra], k) => ({
    id: `torch-${k}`, name: `Torch ${k}`, sub: 'Torches',
    tags: words('fire light flame burning', TORCH_FLAMES[flame][0], TORCH_HEADS[head][0], TORCH_HANDLES[handle][0], TORCH_EXTRAS[extra][0]),
    draw: () => [TORCH_HANDLES[handle][1], TORCH_HEADS[head][1], TORCH_FLAMES[flame][1], TORCH_EXTRAS[extra][1](topOf(TORCH_FLAMES[flame][1]))].filter(Boolean).join(' '),
  }),
});

export const GEAR_SHAPES = [...helmets, ...lanterns, ...bombs, ...hats, ...bows, ...arrows, ...boots, ...armour, ...amulets, ...torches];
export const GEAR_HEADINGS = ['Helmets', 'Lanterns', 'Bombs', 'Hats', 'Bows', 'Arrows', 'Boots', 'Armour', 'Amulets', 'Torches'];
