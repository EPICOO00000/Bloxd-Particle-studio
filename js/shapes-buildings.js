// The Buildings tab: houses, castles and towers, each kind put together from
// a few parts (see shape-mix.js for how the parts are dealt out). One unit of
// a drawing is roughly the gap between two particles. The ground is at y = 0.

import {
  family, edgeOf as edge, joined, at, path, closed, circle, dot, box, bow, bowTo, bend, wavy, ball, sparkle, polar,
} from './shape-mix.js';

const words = (...parts) => parts.filter(Boolean).join(' ');

/** A pole that stands on `foot`, with a pointed flag or a square one. */
const pennant = ([x, y]) => `${path([x, y], [x, y + 3.2])} ${path([x, y + 3.2], [x + 1.9, y + 2.5], [x, y + 1.8])}`;
const banner = ([x, y]) => `${path([x, y], [x, y + 3.3])} ${path([x, y + 3.3], [x + 2, y + 3.3], [x + 2, y + 2], [x, y + 2])}`;
const bird = (x, y) => path([x - 1.1, y + 0.6], [x, y], [x + 1.1, y + 0.6]);
const cloud = (x, y) => `${bow([x - 1.8, y], [x - 0.6, y + 0.6], 0.6)} ${bowTo([x + 0.6, y + 0.6], 0.6)} ${bowTo([x + 1.8, y], 0.6)} Z`;
const crescent = (x, y, r) => `${bow([x, y + r], [x, y - r], 1)} ${bowTo([x, y + r], -0.45)}`;
/** A doorway that stands on the ground: square, or with a round top. */
const door = (x, half = 1, high = 3.2) => path([x - half, 0], [x - half, high], [x + half, high], [x + half, 0]);
const archDoor = (x, half = 1, high = 2.4) => `${path([x - half, 0], [x - half, high])} ${bowTo([x + half, high], 1)} L${at(x + half, 0)}`;
const pane = (x, y, s) => box(x - s, y - s, x + s, y + s);

// ---------------------------------------------------------------- houses

// [search words, half the width, the height of the walls]
const HOUSE_WALLS = [
  ['cottage', 5, 5.5],
  ['wide bungalow', 7, 4.8],
  ['tall', 4.4, 8],
  ['town', 5.4, 7],
  ['hut small', 4.4, 4.6],
];

// [search words, (half the width, the height of the walls) => the roof, (half the width) => where a chimney stands]
// The lower edge of a roof runs along the top of the walls; a chimney keeps clear of the corners of the roof.
const ROOFS = [
  ['gable roof', (w, h) => closed([-w - 0.9, h], [0, h + Math.max(4, 0.7 * (w + 0.9))], [w + 0.9, h]), (w) => 0.5 * w],
  ['hip roof', (w, h) => closed([-w - 0.9, h], [-w * 0.45, h + 3], [w * 0.45, h + 3], [w + 0.9, h]), (w) => 0.45 * w + 1.6],
  ['flat roof', (w, h) => box(-w - 0.6, h, w + 0.6, h + 1.3), (w) => 0.5 * w],
  ['round roof', (w, h) => `${path([-w - 0.6, h], [w + 0.6, h])} ${bowTo([-w - 0.6, h], -0.6)}`, (w) => 0.5 * w],
  ['steep roof', (w, h) => closed([-w - 0.9, h], [0, h + 6.4], [w + 0.9, h]), (w) => 0.5 * w],
  ['shed roof', (w, h) => closed([-w - 0.9, h], [w + 0.9, h], [w + 0.9, h + 3.6], [-w - 0.9, h + 1.2]), (w) => 0.5 * w],
  ['barn roof', (w, h) => closed([-w - 0.9, h], [-w * 0.72, h + 2.3], [0, h + 3.9], [w * 0.72, h + 2.3], [w + 0.9, h]), (w) => Math.min(0.5 * w, 0.72 * w - 1.6)],
];

// What a front is made of. A wall has a place left and right of the middle; a house of two floors (7 and higher)
// has the same places once more upstairs.
function front(w, h, { middle, left, right, upstairs, above }, side = (w + 1) / 2, size = Math.min(0.9, (w - 1) / 2 - 0.9)) {
  const parts = [middle && middle(0, size), left && left(-side, 2.3, size), right && right(side, 2.3, size)];
  if (h >= 7) parts.push(upstairs(-side, h - 2.1, size), upstairs(side, h - 2.1, size), above && above(0, h - 2.1, size));
  return parts.filter(Boolean);
}
const square = (x, y, s) => pane(x, y, s);
const round = (x, y, s) => circle(x, y, s);
const crossed = (x, y, s) => `${pane(x, y, s)} ${path([x - s, y], [x + s, y])} ${path([x, y - s], [x, y + s])}`;
const arched = (x, y, s) => `${path([x - s, y], [x - s, y - s], [x + s, y - s], [x + s, y])} ${bowTo([x - s, y], -1)}`;

const FRONTS = [
  ['door windows', (w, h) => front(w, h, { middle: (x) => door(x), left: square, right: square, upstairs: square, above: square })],
  ['side door window', (w, h) => front(w, h, { left: (x, y, s) => door(x, s + 0.1), right: square, upstairs: square })],
  ['double door barn garage', (w, h) => front(w, h, { middle: () => `${door(0, 1.7)} ${path([0, 0], [0, 3.2])}`, upstairs: () => '', above: (x, y) => circle(x, y, 0.9) })],
  ['arched door round windows', (w, h) => front(w, h, { middle: (x) => archDoor(x), left: round, right: round, upstairs: round })],
  ['door cross windows', (w, h) => front(w, h, { middle: (x) => door(x), left: crossed, right: crossed, upstairs: crossed })],
  ['round window side arched door', (w, h) => front(w, h, { left: round, right: (x, y, s) => archDoor(x, s + 0.1), upstairs: round })],
  ['shop wide window', (w, h) => {
    const side = (w + 1) / 2;
    const size = Math.min(0.9, (w - 1) / 2 - 0.9);
    const from = -side + size + 1.2;
    const wide = `${box(from, 1.4, w - 1.1, 3.2)} ${path([(from + w - 1.1) / 2, 1.4], [(from + w - 1.1) / 2, 3.2])}`;
    return [...front(w, h, { left: (x, y, s) => door(x, s + 0.1), upstairs: square }), wide];
  }],
  ['pointed door arched windows', (w, h) => front(w, h, { middle: () => path([-1, 0], [-1, 2.5], [0, 3.8], [1, 2.5], [1, 0]), left: arched, right: arched, upstairs: arched })],
];

function chimney(x, roof) {
  const [x0, y0] = roof.top(x - 0.7);
  const [x1, y1] = roof.top(x + 0.7);
  const high = Math.max(y0, y1) + 2;
  return { d: path([x0, y0], [x0, high], [x1, high], [x1, y1]), x, y: high };
}

// (half the width, the height of the walls, the outline of the roof, where a chimney stands) => what stands on or
// beside the house
const HOUSE_EXTRAS = [
  ['', () => ''],
  ['chimney', (w, h, roof, x) => chimney(x, roof).d],
  ['chimney smoke', (w, h, roof, x) => {
    const c = chimney(x, roof);
    return `${c.d} ${circle(c.x, c.y + 1.5, 0.6)} ${circle(c.x + 0.9, c.y + 3.3, 0.9)}`;
  }],
  ['fence', (w) => [1, -1].map((s) => `${path([s * w, 1.2], [s * (w + 4.2), 1.2])} ${[1.4, 2.8, 4.2].map((d) => path([s * (w + d), 0], [s * (w + d), 2.2])).join(' ')}`).join(' ')],
  ['tree', (w) => ball([w + 4.2, 0], [w + 4.2, 4.6], 2)],
  ['garden ground', (w) => `${path([w, 0], [w + 3.4, 0])} ${path([-w, 0], [-w - 3.4, 0])}`],
  ['flag', (w, h, roof) => pennant(roof.top(0))],
  ['sun', (w, h) => `${circle(w + 4.8, h + 4.8, 1.3)} ${Array.from({ length: 8 }, (_, i) => dot(...polar(w + 4.8, h + 4.8, 2.4, 45 * i))).join(' ')}`],
  ['bushes', (w) => `${bow([w + 0.9, 0], [w + 3.9, 0], 0.8)} ${bow([-w - 3.9, 0], [-w - 0.9, 0], 0.8)}`],
];

const houses = family({
  cat: 'buildings', count: 280, spacing: 0.1, sizes: [HOUSE_WALLS.length, ROOFS.length, FRONTS.length, HOUSE_EXTRAS.length],
  make: ([walls, roof, face, extra], k) => ({
    id: `house-${k}`, name: `House ${k}`, sub: 'Houses',
    tags: words('home building village town', HOUSE_WALLS[walls][0], ROOFS[roof][0], FRONTS[face][0], HOUSE_EXTRAS[extra][0]),
    draw: () => {
      const [, w, h] = HOUSE_WALLS[walls];
      const top = edge(ROOFS[roof][1](w, h));
      return joined(path([-w, h], [-w, 0], [w, 0], [w, h]), top.d, ...FRONTS[face][1](w, h), HOUSE_EXTRAS[extra][1](w, h, top, ROOFS[roof][2](w)));
    },
  }),
});

// ---------------------------------------------------------------- castles
//
// A wall from -5 to 5 with a gate in it, between two towers (5 to 8.6) that are 9 high.

/** The corners of a wall top that is low and high in turn, in `parts` stretches. */
function battlements(x0, x1, y, parts, high = 1.1) {
  const wide = (x1 - x0) / parts;
  return Array.from({ length: parts }, (_, i) => [[x0 + i * wide, y + (i % 2 ? high : 0)], [x0 + (i + 1) * wide, y + (i % 2 ? high : 0)]]).flat();
}

// (left edge, right edge, height) => [the tower, where a flag pole stands on it]
const CASTLE_TOWERS = [
  ['square towers', (a, b, h) => [path([a, 0], [a, h + 1.1], [a + 1, h + 1.1], [a + 1, h], [b - 1, h], [b - 1, h + 1.1], [b, h + 1.1], [b, 0]), [(a + b) / 2, h]]],
  ['cone roofs', (a, b, h) => [`${path([a, 0], [a, h])} ${path([b, 0], [b, h])} ${closed([a - 0.8, h], [(a + b) / 2, h + 3.6], [b + 0.8, h])}`, [(a + b) / 2, h + 3.6]]],
  ['round towers domes', (a, b, h) => [`${path([a, 0], [a, h])} ${bowTo([b, h], 1)} L${at(b, 0)}`, [(a + b) / 2, h + (b - a) / 2]]],
  ['spires', (a, b, h) => [`${path([a, 0], [a, h])} ${path([b, 0], [b, h])} ${closed([a - 0.8, h], [(a + b) / 2, h + 5.6], [b + 0.8, h])}`, [(a + b) / 2, h + 5.6]]],
  ['crown towers', (a, b, h) => [path([a, 0], [a, h + 1.3], [a + 0.9, h], [(a + b) / 2, h + 1.3], [b - 0.9, h], [b, h + 1.3], [b, 0]), [(a + b) / 2, h + 1.3]]],
];

// what stands between the towers, above the gate
const CASTLE_WALLS = [
  ['battlements', path(...battlements(-5, 5, 5, 7))],
  ['plain wall', path([-5, 5], [5, 5])],
  ['keep', `${path([-5, 5], [5, 5])} ${path([-2.2, 5], [-2.2, 10.6], [-0.73, 10.6], [-0.73, 9.5], [0.73, 9.5], [0.73, 10.6], [2.2, 10.6], [2.2, 5])}`],
  ['keep roof', `${path([-5, 5], [5, 5])} ${path([-2.2, 5], [-2.2, 9.5])} ${path([2.2, 5], [2.2, 9.5])} ${closed([-3, 9.5], [0, 12.6], [3, 9.5])}`],
  ['high wall', path(...battlements(-5, 5, 7, 7))],
  ['palisade fort', path([-5, 5], [-4, 6.3], [-3, 5], [-2, 6.3], [-1, 5], [0, 6.3], [1, 5], [2, 6.3], [3, 5], [4, 6.3], [5, 5])],
  ['domed hall', `${path([-5, 5], [5, 5])} ${bow([-3, 5], [3, 5], 0.7)}`],
];

const GATE = `${path([-1.5, 0], [-1.5, 2.2])} ${bowTo([1.5, 2.2], 1)} L1.5,0`;
const SQUARE_GATE = path([-1.5, 0], [-1.5, 3.2], [1.5, 3.2], [1.5, 0]);
const CASTLE_GATES = [
  ['arched gate', GATE],
  ['portcullis', `${GATE} ${path([-1.5, 2.2], [1.5, 2.2])} ${path([-0.5, 0], [-0.5, 2.2])} ${path([0.5, 0], [0.5, 2.2])}`],
  ['square gate', SQUARE_GATE],
  ['double door', `${SQUARE_GATE} ${path([0, 0], [0, 3.2])}`],
  ['drawbridge', `${GATE} ${path([-1.5, 0], [-2, -2.6], [2, -2.6], [1.5, 0])}`],
  ['pointed gate', `${path([-1.5, 0], [-1.5, 2])} ${bowTo([0, 4], 0.22)} ${bowTo([1.5, 2], 0.22)} L1.5,0`],
  ['arrow slits', `${SQUARE_GATE} ${path([-3.3, 2], [-3.3, 3.6])} ${path([3.3, 2], [3.3, 3.6])}`],
  ['steps', `${SQUARE_GATE} ${path([-2.3, -0.9], [2.3, -0.9])} ${path([-3.1, -1.8], [3.1, -1.8])}`],
];

// (where a pole stands on the left tower, on the right one, on the middle) => what else there is
const CASTLE_EXTRAS = [
  ['', () => ''],
  ['flags pennants', (l, r) => `${pennant(l)} ${pennant(r)}`],
  ['flags banners', (l, r) => `${banner(l)} ${banner(r)}`],
  ['flag', (l, r, m) => pennant(m)],
  ['moon night', (l, r, [, y]) => crescent(-0.3, y + 3.2, 1.4)],
  ['birds', (l, r, [, y]) => `${bird(-2.4, y + 2.4)} ${bird(2.2, y + 3.8)}`],
  ['tower windows', () => `${path([-6.8, 5.2], [-6.8, 7])} ${path([6.8, 5.2], [6.8, 7])}`],
  ['cross slits', () => [-6.8, 6.8].map((x) => `${path([x, 5], [x, 7.2])} ${path([x - 0.8, 6.3], [x + 0.8, 6.3])}`).join(' ')],
  ['stars night', (l, r, [, y]) => `${sparkle(-2.6, y + 2.2, 0.8)} ${sparkle(0.4, y + 4.2, 0.8)} ${sparkle(2.8, y + 2.6, 0.8)}`],
];

const castles = family({
  cat: 'buildings', count: 280, spacing: 0.1, sizes: [CASTLE_TOWERS.length, CASTLE_WALLS.length, CASTLE_GATES.length, CASTLE_EXTRAS.length],
  make: ([tower, wall, gate, extra], k) => ({
    id: `castle-${k}`, name: `Castle ${k}`, sub: 'Castles',
    tags: words('fortress fort stronghold palace medieval knight building', CASTLE_TOWERS[tower][0], CASTLE_WALLS[wall][0], CASTLE_GATES[gate][0], CASTLE_EXTRAS[extra][0]),
    draw: () => {
      const [left, onLeft] = CASTLE_TOWERS[tower][1](-8.6, -5, 9);
      const [right, onRight] = CASTLE_TOWERS[tower][1](5, 8.6, 9);
      const middle = edge(CASTLE_WALLS[wall][1]);
      return joined(path([-8.6, 0], [8.6, 0]), left, right, middle.d, CASTLE_GATES[gate][1], CASTLE_EXTRAS[extra][1](onLeft, onRight, middle.top(0)));
    },
  }),
});

// ---------------------------------------------------------------- towers

// [search words, the two walls, the height, half the width at the top, half the width at the bottom, (height) => half the width there]
const SHAFTS = [
  ['straight', `${path([-2.6, 0], [-2.6, 12])} ${path([2.6, 0], [2.6, 12])}`, 12, 2.6, 2.6, () => 2.6],
  ['tapered lighthouse', `${path([-3.4, 0], [-2.2, 12])} ${path([3.4, 0], [2.2, 12])}`, 12, 2.2, 3.4, (y) => 3.4 - 0.1 * y],
  ['stepped', `${path([-3.4, 0], [-3.4, 5], [-2.4, 5], [-2.4, 12])} ${path([3.4, 0], [3.4, 5], [2.4, 5], [2.4, 12])}`, 12, 2.4, 3.4, (y) => (y < 5 ? 3.4 : 2.4)],
  ['slender thin', `${path([-1.9, 0], [-1.9, 13])} ${path([1.9, 0], [1.9, 13])}`, 13, 1.9, 1.9, () => 1.9],
  ['flared rook', `${path([-2.4, 0], [-2.4, 10.4], [-3.4, 12])} ${path([2.4, 0], [2.4, 10.4], [3.4, 12])}`, 12, 3.4, 2.4, (y) => (y < 10.4 ? 2.4 : 2.4 + (y - 10.4) / 1.6)],
];

// (half the width at the top, the height) => what stands on the tower
const TOWER_TOPS = [
  ['cone roof wizard', (w, h) => closed([-w - 0.8, h], [0, h + 4.2], [w + 0.8, h])],
  ['battlements', (w, h) => path([-w, h], [-w, h + 1.2], [-w / 3, h + 1.2], [-w / 3, h], [w / 3, h], [w / 3, h + 1.2], [w, h + 1.2], [w, h])],
  ['dome', (w, h) => `${path([-w, h], [w, h])} ${bowTo([-w, h], -1)}`],
  ['onion dome', (w, h) => `${bend([-w, h], [-w - 2.4, h + 2.8], [0, h + 5.2])} ${bend([w, h], [w + 2.4, h + 2.8], [0, h + 5.2])} ${path([-w, h], [w, h])}`],
  ['lantern lighthouse', (w, h) => {
    const room = Math.min(1.5, w - 0.9);
    return `${path([-w - 0.9, h], [w + 0.9, h])} ${path([-room, h], [-room, h + 2.4])} ${path([room, h], [room, h + 2.4])} ${closed([-room - 0.6, h + 2.4], [0, h + 4.2], [room + 0.6, h + 2.4])}`;
  }],
  ['antenna mast radio', (w, h) => `${path([-w - 0.5, h], [w + 0.5, h])} ${ball([0, h], [0, h + 4.2], 0.7)} ${path([-1, h + 2], [1, h + 2])}`],
  ['pagoda roof', (w, h) => `M${at(-w - 2.2, h + 1.3)} Q${at(-w * 0.5, h + 1)} ${at(0, h + 3.8)} Q${at(w * 0.5, h + 1)} ${at(w + 2.2, h + 1.3)} L${at(w, h)} L${at(-w, h)} Z`],
];

// (height, (height) => half the width there) => doors and windows
const TOWER_FRONTS = [
  ['door', () => archDoor(0, 0.9)],
  ['door windows', () => `${archDoor(0, 0.9)} ${pane(0, 6, 0.7)} ${pane(0, 9.2, 0.7)}`],
  ['stripes bands lighthouse', (h, half) => [3, 6, 9].map((y) => path([-half(y), y], [half(y), y])).join(' ')],
  ['clock', (h, half) => {
    const r = Math.min(1.5, half(h - 2.8) - 0.9);
    const hands = r >= 1.4 ? path([0, h - 2.8 + 0.5 * r], [0, h - 2.8], [0.5 * r, h - 2.8]) : dot(0, h - 2.8);
    return `${archDoor(0, 0.9)} ${circle(0, h - 2.8, r)} ${hands}`;
  }],
  ['arrow slits', () => `${path([-0.7, 3.4], [-0.7, 5])} ${path([0.7, 6.2], [0.7, 7.8])} ${path([-0.7, 9], [-0.7, 10.6])}`],
  ['balcony', (h, half) => `${archDoor(0, 0.9)} ${path([-half(7) - 1.1, 7], [half(7) + 1.1, 7])} ${path([-0.8, 7], [-0.8, 9.2], [0.8, 9.2], [0.8, 7])}`],
  ['round windows portholes', () => `${circle(0, 3.4, 0.8)} ${circle(0, 6.6, 0.8)} ${circle(0, 9.8, 0.8)}`],
  ['ladder', () => `${path([-0.6, 0], [-0.6, 9])} ${path([0.6, 0], [0.6, 9])} ${[1.5, 3, 4.5, 6, 7.5].map((y) => path([-0.6, y], [0.6, y])).join(' ')}`],
];

// ({ half the width at the bottom, at the top, the height, the width by height }, the outline of the top) => the
// ground and what else there is
const TOWER_EXTRAS = [
  ['', ({ wb }) => path([-wb - 1.6, 0], [wb + 1.6, 0])],
  ['island rock', ({ wb }) => `${path([-wb - 3.2, 0], [wb + 3.2, 0])} ${path([-wb - 3.2, 0], [-wb - 1.6, -1.9], [wb + 1.6, -1.9], [wb + 3.2, 0])}`],
  ['waves sea', ({ wb }) => `${path([-wb - 1.6, 0], [wb + 1.6, 0])} ${wavy([-wb - 4.4, -1.7], [wb + 4.4, -1.7], 6, 0.5)}`],
  ['steps plinth', ({ wb }) => closed([-wb - 0.9, 0], [-wb - 0.9, -1], [-wb - 1.8, -1], [-wb - 1.8, -2], [wb + 1.8, -2], [wb + 1.8, -1], [wb + 0.9, -1], [wb + 0.9, 0])],
  ['pine trees', ({ wb }) => `${path([-wb - 5, 0], [wb + 5, 0])} ${[-wb - 3.2, wb + 3.2].map((x) => `${path([x, 0], [x, 1.3])} ${closed([x - 1.4, 1.3], [x, 4.6], [x + 1.4, 1.3])}`).join(' ')}`],
  ['light beams lighthouse', ({ wb, h, half }) => {
    const x = half(h - 1.6) + 1.2;
    return `${path([-wb - 1.6, 0], [wb + 1.6, 0])} ${[1, -1].map((s) => path([s * (x + 4.8), h + 0.1], [s * x, h - 1.6], [s * (x + 4.8), h - 3.3])).join(' ')}`;
  }],
  ['clouds', ({ wb, wt, h }) => `${path([-wb - 1.6, 0], [wb + 1.6, 0])} ${cloud(-wt - 5, h - 1)} ${cloud(wt + 5.4, h + 1)}`],
  ['flag', ({ wb }, top) => `${path([-wb - 1.6, 0], [wb + 1.6, 0])} ${pennant(top.top(0))}`],
  ['birds', ({ wb, wt, h }) => `${path([-wb - 1.6, 0], [wb + 1.6, 0])} ${bird(-wt - 4, h + 1.2)} ${bird(wt + 4.6, h - 0.6)}`],
];

const towers = family({
  cat: 'buildings', count: 280, spacing: 0.1, sizes: [SHAFTS.length, TOWER_TOPS.length, TOWER_FRONTS.length, TOWER_EXTRAS.length],
  make: ([shaft, top, face, extra], k) => ({
    id: `tower-${k}`, name: `Tower ${k}`, sub: 'Towers',
    tags: words('building tall high turret', SHAFTS[shaft][0], TOWER_TOPS[top][0], TOWER_FRONTS[face][0], TOWER_EXTRAS[extra][0]),
    draw: () => {
      const [, walls, h, wt, wb, half] = SHAFTS[shaft];
      const cap = edge(TOWER_TOPS[top][1](wt, h));
      return joined(walls, cap.d, TOWER_FRONTS[face][1](h, half), TOWER_EXTRAS[extra][1]({ wb, wt, h, half }, cap));
    },
  }),
});

export const BUILDING_SHAPES = [...houses, ...castles, ...towers];
export const BUILDING_HEADINGS = ['Houses', 'Castles', 'Towers'];
