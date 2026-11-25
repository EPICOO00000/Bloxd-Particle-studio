// Ornaments, each kind made from a few parts that are put together in every
// sensible way: snowflakes (no two alike), flowers by their petals, suns by
// their rays, mandalas ring by ring, shields with their divisions, frames, and
// magic circles with a little picture in the middle. A new part (a petal, a
// ring, a division) is one entry in its table and gives a whole row of shapes.

import { drawnShape, parsePath, placeDrawing, joinDrawings, spin, around, fix, RAD, spreadPoints, drawingNet, apportion } from './shape-kit.js';
import { minis } from './shapes-combos.js';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const polygon = (k, r, first = 90) => `M${Array.from({ length: k }, (_, i) => around(0, 0, r, first + (360 * i) / k)).join(' L')} Z`;
const star = (k, out, inn, first = 90) => `M${Array.from({ length: 2 * k }, (_, i) => around(0, 0, i % 2 ? inn : out, first + (180 * i) / k)).join(' L')} Z`;

// ---------------------------------------------------------------- snowflakes
//
// One arm is drawn pointing up, from the middle (0, 0) to its tip (0, 10), and
// repeated six times. An arm has pairs of branches, something at its tip, and
// the six arms may be tied together near the middle.

// Pairs of branches: [how far up the arm, how long]. A branch stays inside its sixth of the flake.
const BRANCHES = [
  [[4.5, 3.2]],
  [[3.5, 2.2], [6.2, 3]],
  [[3, 2], [5, 2.6], [7.2, 2]],
  [[4, 3], [6.5, 2]],
  [[5.5, 3.8]],
  [[2.8, 1.4], [4.4, 2], [6, 2.6], [7.8, 1.6]],
];
const TIPS = {
  plain: '',
  fork: 'M0,10 L-1.1,11.3 M0,10 L1.1,11.3',
  diamond: 'M0,8.6 L0.9,9.8 L0,11 L-0.9,9.8 Z',
  bar: 'M-1.3,9 L1.3,9',
};
const TIP_LENGTH = { plain: 0, fork: 3.4, diamond: 6, bar: 2.6 };
const HEARTS = {
  none: '',
  hexagon: polygon(6, 2.2),
  star: star(6, 3.2, 1.7),
};
const HEART_LENGTH = { none: 0, hexagon: 13.2, star: 21 };

function flake(branches, tip, heart) {
  let arm = `M0,0 L0,${tip === 'diamond' ? 8.6 : 10}`;
  for (const [at, long] of branches) {
    const dx = fix(long * Math.sin(60 * RAD));
    const dy = fix(at + long * Math.cos(60 * RAD));
    arm += ` M0,${at} L${dx},${dy} M0,${at} L${-dx},${dy}`;
  }
  if (TIPS[tip]) arm += ` ${TIPS[tip]}`;
  return joinDrawings(spin(arm, 6), heart === 'none' ? { polys: [], dots: [] } : parsePath(HEARTS[heart]));
}

const flakes = [];
for (const heart of Object.keys(HEARTS)) {
  for (const tip of Object.keys(TIPS)) {
    BRANCHES.forEach((branches, b) => {
      // (the plainest of all is the snowflake of the Nature tab, and a star in the middle leaves no room for the lowest branches)
      if ((heart === 'none' && tip === 'plain' && b === 1) || (heart === 'star' && branches[0][0] < 3.4)) return;
      flakes.push([branches, tip, heart]);
    });
  }
}
const snowflakes = flakes.map(([branches, tip, heart], i) => {
  const length = 6 * (10 + 2 * branches.reduce((sum, [, long]) => sum + long, 0) + TIP_LENGTH[tip]) + HEART_LENGTH[heart];
  return drawnShape({
    id: `snowflake-${i + 1}`, name: `Snowflake ${i + 1}`, cat: 'nature', sub: 'Snowflakes', draw: () => flake(branches, tip, heart),
    count: Math.max(60, Math.min(230, Math.round(length / 0.62))),
    tags: `snow ice crystal winter frost cold christmas six arms ${branches.length} branches${tip === 'plain' ? '' : ` ${tip} tips`}${heart === 'none' ? '' : ` ${heart} middle`}`,
  });
});

// ---------------------------------------------------------------- flowers
//
// One petal is drawn pointing up, between the middle and the rim (0, 10), and
// repeated. A petal is made narrower when there are many.

// [part of the id, the word in the name, the petal for a width from 0 to 1, how wide it is at its widest (at width 1), search words]
const PETALS = [
  ['round', 'round', (w) => `O0,6.3 ${fix(3.6 * w)}`, 3.6, 'daisy circles'],
  ['pointed', 'pointed', (w) => `M0,2.3 B0,10 ${fix(0.66 * w)} B0,2.3 ${fix(0.66 * w)}`, 2.55, 'lotus leaves sharp'],
  ['long', 'long', (w) => `E0,6.2 ${fix(2 * w)},3.75 90 450`, 2, 'ovals sunflower'],
  ['heart', 'heart-shaped', (w) => `M0,2.4 C${fix(2.6 * w)},4 ${fix(3.6 * w)},7.6 ${fix(1.9 * w)},9.4 C${fix(1.2 * w)},10.2 ${fix(0.2 * w)},9.6 0,8.6 |`, 3.3, 'notched cherry blossom'],
  ['drop', 'drop-shaped', (w) => `M0,2.4 C${fix(3.4 * w)},4.6 ${fix(2.6 * w)},8 0,10 C${fix(-2.6 * w)},8 ${fix(-3.4 * w)},4.6 0,2.4`, 2.9, 'tulip tear'],
];
const PETAL_COUNTS = [4, 5, 6, 7, 8, 10, 12];
/** How wide a petal may be, from 0 to 1, when `count` of them stand in a ring: they do not touch. */
const fits = (count, widest) => Math.min(1, (6.2 * Math.tan(Math.PI / count) * 0.86) / widest);

const flowers = PETALS.flatMap(([id, word, petal, widest, more]) => PETAL_COUNTS.map((count) => drawnShape({
  id: `flower-${count}-${id}`, name: `Flower with ${count} ${word} petals`, cat: 'nature', sub: 'Flowers',
  draw: () => joinDrawings(spin(petal(fits(count, widest)), count), parsePath('O0,0 1.5')),
  count: Math.min(220, 44 + 16 * count), tags: `${count} petals bloom blossom garden spring ${more}`,
})));

// A double flower: a ring of short petals around a whole flower. (The two rings do not reach into each other:
// petals that cross at a flat angle would put particles side by side.)
const DOUBLES = ['pointed', 'long', 'drop'];
const turned = (drawing, count, first = 0) => joinDrawings(...range(0, count - 1).map((i) => placeDrawing(drawing, { turn: first + (360 * i) / count })));
/** A petal that starts further out: what was between 2.3 and 10 from the middle is between `inn` and 10. */
const outer = (text, inn) => {
  const { polys, dots } = parsePath(text);
  const at = ([x, y]) => [x, inn + ((y - 2.3) * (10 - inn)) / 7.7];
  return { polys: polys.map((poly) => poly.map(at)), dots: dots.map(at) };
};
const doubleFlowers = PETALS.filter(([id]) => DOUBLES.includes(id)).flatMap(([id, word, petal, widest, more]) => [5, 6, 8, 10].map((count) => drawnShape({
  id: `double-flower-${count}-${id}`, name: `Double flower with ${count} ${word} petals`, cat: 'nature', sub: 'Flowers',
  draw: () => joinDrawings(
    turned(outer(petal(Math.min(1, (7.6 * Math.tan(Math.PI / count) * 0.86) / widest)), 5.4), count),
    placeDrawing(spin(petal(fits(count, widest)), count, 180 / count), { size: 0.47 }),
    parsePath('O0,0 0.75'),
  ),
  count: Math.min(260, 60 + 22 * count), tags: `${count} petals two rings bloom blossom dahlia garden ${more}`,
})));

// ---------------------------------------------------------------- suns
//
// A disc and its rays: one ray is drawn pointing up and repeated.

// [part of the id, how the name goes on, one ray (for a ring of `count`), what else goes round, search words]
const RAYS = [
  ['pointed', 'pointed rays', (count) => `M${around(0, 0, 5.3, 90 - 100 / count)} L0,10 L${around(0, 0, 5.3, 90 + 100 / count)}`, 'triangles spikes'],
  ['long-short', 'long and short rays', (count) => `M${around(0, 0, 5.3, 90 - 40 / count)} L0,10 L${around(0, 0, 5.3, 90 + 40 / count)} N M${around(0, 0, 5.3, 90 + 140 / count)} L${around(0, 0, 7.6, 90 + 180 / count)} L${around(0, 0, 5.3, 90 + 220 / count)}`, 'alternating compass'],
  ['wavy', 'wavy rays', () => 'M0,5.3 C1.1,6.4 -1.1,7.4 0,8.5 C0.5,9 0.3,9.6 0,10', 'flames curly heat'],
  ['dotted', 'dotted rays', () => 'D0,5.9 D0,7.3 D0,8.7 D0,10', 'dots beads sparkle'],
  ['split', 'forked rays', () => 'M0,5.3 L0,8 L-0.9,10 M0,8 L0.9,10', 'forks branches'],
];
// (with sixteen long and short rays the feet of the rays would stand closer than the particles on them)
const suns = RAYS.flatMap(([id, how, ray, more]) => (id === 'long-short' ? [8, 12] : [8, 12, 16]).map((count) => drawnShape({
  id: `sun-${count}-${id}`, name: `Sun with ${count} ${how}`, cat: 'nature', sub: 'Suns',
  draw: () => joinDrawings(parsePath('O0,0 4.2'), spin(ray(count), id === 'long-short' ? count / 2 : count)),
  // (dotted rays: as far apart on the disc as the dots of a ray are)
  count: id === 'dotted' ? 20 + 4 * count : Math.min(200, 50 + 7 * count), tags: `${count} rays sunshine day summer star shine ${more}`,
})));

// ---------------------------------------------------------------- mandalas
//
// Rings one inside the other, each with the same number of parts. A ring is
// drawn between two radii; the mandala is 10 across from the middle to the rim.

/** One part of a ring, pointing up, between radius `inn` and radius `out`, for a ring of `count` parts. */
const RINGS = {
  petals: (count, inn, out) => {
    const bulge = Math.min(0.7, (((inn + out) / 2) * Math.tan(Math.PI / count) * 0.92) / ((out - inn) / 2));
    return `M0,${inn} B0,${out} ${fix(bulge)} B0,${inn} ${fix(bulge)}`;
  },
  loops: (count, inn, out) => `O0,${fix((inn + out) / 2)} ${fix(Math.min((out - inn) / 2, ((inn + out) / 2) * Math.sin(Math.PI / count) * 0.9))}`,
  spokes: (count, inn, out) => `M0,${inn} L0,${out}`,
  dots: (count, inn, out) => `D0,${fix((inn + out) / 2)}`,
  teeth: (count, inn, out) => `M${around(0, 0, inn, 90 - 180 / count)} L0,${out} L${around(0, 0, inn, 90 + 180 / count)}`,
  arches: (count, inn, out) => `M${around(0, 0, inn, 90 - 180 / count)} Q0,${fix(2 * out - inn)} ${around(0, 0, inn, 90 + 180 / count)}`,
  diamonds: (count, inn, out) => {
    const half = Math.min((out - inn) / 2, ((inn + out) / 2) * Math.sin(Math.PI / count) * 0.8);
    return `M0,${out} L${fix(half)},${fix((inn + out) / 2)} L0,${inn} L${fix(-half)},${fix((inn + out) / 2)} Z`;
  },
};
const OUTER = ['petals', 'teeth', 'arches', 'loops'];
const MIDDLE = ['petals', 'spokes', 'dots', 'loops', 'diamonds'];
const INNER = ['petals', 'teeth', 'dots', 'spokes'];
const FOLDS = [6, 8, 10, 12];

const mandalaPlans = [];
for (const count of FOLDS) {
  for (const outer of OUTER) {
    for (const middle of MIDDLE) {
      for (const inner of INNER) mandalaPlans.push([count, outer, middle, inner]);
    }
  }
}
// (every third plan of the 320: neighbours in the list differ in more than one ring)
const mandalas = mandalaPlans.filter((_, i) => i % 3 === 1).slice(0, 100).map(([count, outer, middle, inner], i) => drawnShape({
  id: `mandala-${i + 1}`, name: `Mandala ${i + 1}`, cat: 'patterns', sub: 'Mandalas',
  draw: () => joinDrawings(
    spin(RINGS[outer](count, 7.2, 10), count),
    parsePath('O0,0 7.2'),
    spin(RINGS[middle](count, 4.6, 6.9), count, 180 / count),
    parsePath('O0,0 4.3'),
    spin(RINGS[inner](count, 1.5, 4), count),
    parsePath('O0,0 1.2'),
  ),
  count: Math.min(300, 150 + 11 * count),
  tags: `${count} fold round ornament rosette circle meditation rangoli ${outer} ${middle} ${inner}`,
}));

// ---------------------------------------------------------------- shields
//
// The outline of a shield, and the lines that divide it. A line is cut off
// where it meets the outline.

// [part of the id, how the name starts, the outline]
const SHIELDS = [
  ['pointed', 'Pointed', 'M-4.5,5 L4.5,5 L4.5,0.5 Q4.5,-3 0,-5 Q-4.5,-3 -4.5,0.5 Z'],
  ['kite', 'Kite', 'M0,5.5 C3,5.5 4,3.5 4,2 C4,-1 2,-3.5 0,-5.5 C-2,-3.5 -4,-1 -4,2 C-4,3.5 -3,5.5 0,5.5'],
  ['round-bottomed', 'Round-bottomed', 'M-4.5,5 L4.5,5 L4.5,-0.5 A0,-0.5 4.5 0 -180 Z'],
  ['notched', 'Notched', 'M-4.5,4.4 Q-2.2,5.4 0,4.4 Q2.2,5.4 4.5,4.4 L4.5,0 Q4.5,-3.4 0,-5 Q-4.5,-3.4 -4.5,0 Z'],
  ['square', 'Square', 'M-4.5,5 L4.5,5 L4.5,-2.6 Q4.5,-4 3,-4 Q0.8,-4 0,-5 Q-0.8,-4 -3,-4 Q-4.5,-4 -4.5,-2.6 Z'],
  ['round', 'Round', 'O0,0 5'],
];
// [part of the id, how the name goes on, the lines (each from far outside to far outside), search words]. 'rim' is the outline once more, smaller.
const DIVISIONS = [
  ['plain', '', [], 'empty blank'],
  ['halves', 'in halves', [[[0, 9], [0, -9]]], 'split down the middle two parts per pale'],
  ['across', 'cut across', [[[-9, 0.6], [9, 0.6]]], 'top and bottom two parts per fess'],
  ['slanting', 'with a slanting line', [[[-8.5, 9], [8.5, -8]]], 'diagonal two parts per bend'],
  ['quarters', 'in quarters', [[[0, 9], [0, -9]], [[-9, 0.6], [9, 0.6]]], 'four parts cross quarterly'],
  ['chevron', 'with a chevron', [[[-9, -5.4], [0, 2.2], [9, -5.4]]], 'roof arrow rank stripe'],
  ['diagonal-cross', 'with a diagonal cross', [[[-8.5, 9], [8.5, -8]], [[8.5, 9], [-8.5, -8]]], 'x saltire scotland'],
  ['top-band', 'with a top band', [[[-9, 2.6], [9, 2.6]]], 'chief head stripe'],
  ['stripe', 'with a stripe', [[[-1.3, 9], [-1.3, -9]], [[1.3, 9], [1.3, -9]]], 'pale upright band'],
  ['band', 'with a band', [[[-9, 1.8], [9, 1.8]], [[-9, -0.6], [9, -0.6]]], 'fess belt across'],
  ['sash', 'with a sash', [[[-7, 8.8], [7, -5.2]], [[-7, 6.4], [7, -7.6]]], 'bend ribbon diagonal band'],
  ['rim', 'with a rim', 'rim', 'border bordure edge double'],
];

/** Where the segment from a to b crosses the closed line `outline`: the parts of it that lie inside, as [[start, end], ...]. */
function inside(a, b, outline) {
  const cuts = [];
  for (let i = 1; i < outline.length; i++) {
    const [px, py] = outline[i - 1];
    const [qx, qy] = outline[i];
    const d = (b[0] - a[0]) * (qy - py) - (b[1] - a[1]) * (qx - px);
    if (Math.abs(d) < 1e-12) continue;
    const t = ((px - a[0]) * (qy - py) - (py - a[1]) * (qx - px)) / d;
    const u = ((px - a[0]) * (b[1] - a[1]) - (py - a[1]) * (b[0] - a[0])) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u < 1) cuts.push(t);
  }
  cuts.sort((p, q) => p - q);
  const out = [];
  // (the ends of the segment are outside, so it goes in at every odd cut and out at every even one)
  for (let i = 0; i + 1 < cuts.length; i += 2) {
    if (cuts[i + 1] - cuts[i] < 1e-6) continue;
    out.push([[a[0] + (b[0] - a[0]) * cuts[i], a[1] + (b[1] - a[1]) * cuts[i]], [a[0] + (b[0] - a[0]) * cuts[i + 1], a[1] + (b[1] - a[1]) * cuts[i + 1]]]);
  }
  return out;
}

function shield(outlineText, lines) {
  const outline = parsePath(outlineText);
  if (lines === 'rim') return joinDrawings(outline, placeDrawing(outline, { size: 0.76 }));
  const edge = outline.polys[0];
  const closed = Math.hypot(edge[0][0] - edge[edge.length - 1][0], edge[0][1] - edge[edge.length - 1][1]) < 1e-6 ? edge : [...edge, edge[0]];
  const polys = [];
  for (const line of lines) {
    // a line with a corner (the chevron) is cut piece by piece; pieces that end at the corner are joined there again
    let run = null;
    for (let i = 1; i < line.length; i++) {
      for (const [from, to] of inside(line[i - 1], line[i], closed)) {
        if (run && Math.hypot(run[run.length - 1][0] - from[0], run[run.length - 1][1] - from[1]) < 1e-6) run.push(to);
        else {
          if (run) polys.push(run);
          run = [from, to];
        }
      }
    }
    if (run) polys.push(run);
  }
  return joinDrawings(outline, { polys, dots: [] });
}

const shields = SHIELDS.flatMap(([id, word, outline]) => DIVISIONS
  .filter(([division]) => !(division === 'plain' && id === 'pointed')) // (the plain pointed shield is the shield of the Things tab)
  .map(([division, how, lines, more]) => drawnShape({
    id: `shield-${id}-${division}`, name: `${word} shield${how ? ` ${how}` : ''}`, cat: 'symbols', sub: 'Shields', draw: () => shield(outline, lines),
    tags: `crest coat of arms heraldry knight team guild emblem ${more}`,
  })));

// ---------------------------------------------------------------- frames

// [part of the id, name, the frame]
const FRAMES = [
  ['wide', 'Wide frame', 'M-5,-3 L5,-3 L5,3 L-5,3 Z'],
  ['tall', 'Tall frame', 'M-3,-5 L3,-5 L3,5 L-3,5 Z'],
  ['rounded-wide', 'Rounded wide frame', 'M-3.8,3 L3.8,3 Q5,3 5,1.8 L5,-1.8 Q5,-3 3.8,-3 L-3.8,-3 Q-5,-3 -5,-1.8 L-5,1.8 Q-5,3 -3.8,3 Z'],
  ['oval', 'Oval frame', 'E0,0 5,3.2 90 450'],
  ['octagon', 'Octagon frame', polygon(8, 5, 22.5)],
  ['ticket', 'Ticket frame', 'M-3.8,3 L3.8,3 A5,3 1.2 180 270 L5,-1.8 A5,-3 1.2 90 180 L-3.8,-3 A-5,-3 1.2 0 90 L-5,1.8 A-5,3 1.2 270 360'],
  ['plaque', 'Plaque frame', 'M-3.6,3 L3.6,3 B5,1.6 0.5 L5,-1.6 B3.6,-3 0.5 L-3.6,-3 B-5,-1.6 0.5 L-5,1.6 B-3.6,3 0.5'],
  ['cut-corners', 'Frame with cut corners', 'M-3.8,3 L3.8,3 L5,1.8 L5,-1.8 L3.8,-3 L-3.8,-3 L-5,-1.8 L-5,1.8 Z'],
  ['ribbon', 'Ribbon frame', 'M-5,2.2 L5,2.2 L3.9,0 L5,-2.2 L-5,-2.2 L-3.9,0 Z'],
  ['arch', 'Arched frame', 'M-3.5,-5 L-3.5,1.5 A0,1.5 3.5 180 0 L3.5,-5 Z'],
  ['pointed-arch', 'Pointed arch frame', 'M-3.5,-5 L-3.5,0.6 Q-3.2,3.6 0,5 Q3.2,3.6 3.5,0.6 L3.5,-5 Z'],
  ['hexagon-wide', 'Long hexagon frame', 'M-3.6,2.6 L3.6,2.6 L5,0 L3.6,-2.6 L-3.6,-2.6 L-5,0 Z'],
  ['label', 'Label frame', 'M-5,0 L-3.2,2.6 L5,2.6 L5,-2.6 L-3.2,-2.6 Z O-3.1,0 0.5'],
  ['scroll', 'Scroll frame', 'M-3.6,3 L4.4,3 A4.4,2.4 0.6 90 -90 L-3.6,1.8 M4.4,1.8 L4.4,-3 L-4.4,-3 A-4.4,-2.4 0.6 270 90 L3.6,-1.8 M-4.4,-1.8 L-4.4,3'],
];
const frames = FRAMES.flatMap(([id, name, frame]) => [
  drawnShape({ id: `frame-${id}`, name, cat: 'patterns', sub: 'Frames', draw: frame, tags: 'border edge box sign panel around a word picture' }),
  ...(id === 'label' || id === 'scroll' ? [] : [drawnShape({
    id: `frame-${id}-double`, name: `Double ${name[0].toLowerCase()}${name.slice(1)}`, cat: 'patterns', sub: 'Frames',
    draw: () => joinDrawings(parsePath(frame), placeDrawing(parsePath(frame), { size: 0.82 })), tags: 'border edge box sign panel two lines rim around a word picture',
  })]),
]);

// ---------------------------------------------------------------- magic circles with a little picture
//
// A ring of signs around one of the little pictures of the Combos tab.

// [part of the id, how the name starts, the lines around the middle, how big the picture in the middle is, search words]
const CIRCLES = [
  ['rune', 'Rune circle', () => `O0,0 10 O0,0 8.2 ${range(0, 11).map((i) => `M${around(0, 0, 8.7, i * 30)} L${around(0, 0, 9.5, i * 30 + (i % 3 ? 6 : -6))}`).join(' ')} O0,0 4.6`, 0.34, 'runes marks double ring'],
  ['triangle', 'Triangle circle', () => `O0,0 10 ${polygon(3, 10)} O0,0 4.6`, 0.33, 'three corners alchemy'],
  ['star', 'Star circle', () => `O0,0 10 ${star(6, 10, 5.77)} O0,0 4.4`, 0.32, 'hexagram six points'],
  ['square', 'Square circle', () => `O0,0 10 ${polygon(4, 10)} ${polygon(4, 10, 45)} O0,0 4.6`, 0.33, 'octagram eight points two squares'],
];
const CENTRES = ['hearts', 'stars', 'moons', 'suns', 'drops', 'flames', 'snowflakes', 'bolts', 'leaves', 'flowers', 'notes', 'sparkles', 'gems', 'crowns', 'shields', 'swords',
  'skulls', 'ghosts', 'eyes', 'fish', 'birds', 'butterflies', 'paws', 'trees'];

const lazy = (make) => {
  let value;
  return () => (value === undefined ? (value = make()) : value);
};

const magicCircles = CIRCLES.flatMap(([id, word, lines, size, more]) => CENTRES.map((centre) => {
  const mini = minis.find((m) => m.id === centre);
  const net = lazy(() => drawingNet(placeDrawing(parsePath(lines()), { size: 0.1 })));
  const length = lazy(() => net().lens.reduce((sum, l) => sum + l, 0));
  const shape = {
    id: `magic-${id}-${centre}`, name: `${word} with a ${mini.one}`, cat: 'effects', sub: 'Magic circles', group: 'flat',
    tags: `${mini.one} ${mini.tags} ${more} magic spell summon seal ritual rune circle`,
    gen: (n) => {
      const fixed = [net().nodes.length, mini.corners()];
      let counts = apportion([length(), mini.length() * size], n);
      if (n < fixed[0] + fixed[1]) counts = apportion(fixed, n);
      else if (counts[0] < fixed[0]) counts = [fixed[0], n - fixed[0]];
      else if (counts[1] < fixed[1]) counts = [n - fixed[1], fixed[1]];
      const ring = counts[0] < fixed[0] ? net().nodes.slice(0, counts[0]) : spreadPoints(net(), counts[0]);
      return [...ring.map(([x, y]) => [x, y, 0]), ...mini.points(counts[1]).map(([x, y]) => [x * size, y * size, 0])];
    },
  };
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => net().nodes.length + mini.corners() });
  Object.defineProperty(shape, 'count', { enumerable: true, get: () => Math.max(shape.min + 10, Math.min(280, Math.round(length() / 0.085) + mini.needs)) });
  return shape;
}));

export const ORNAMENT_SHAPES = [...snowflakes, ...flowers, ...doubleFlowers, ...suns, ...mandalas, ...shields, ...frames, ...magicCircles];
