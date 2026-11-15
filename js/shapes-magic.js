// More effects, added when the library grew to 3,624 shapes: magic circles,
// rings and shields, elements and small things that float in the air.

import {
  TAU, RAD, P, curve, mix, pathPoints, ballPoints, blobPoints, sketch, smooth, around, spin, parsePath, joinDrawings, fitDrawing,
  drawingNet, joinNets, mapNet, drawnShape, dice,
} from './shape-kit.js';
import { floaters } from './shapes-effects.js';
import { wire, box, circle, cutLine, some, equal, ringPt, X, Z } from './shapes-space.js';

// ---------------------------------------------------------------- magic circles

const RINGS = 'O0,0 5 O0,0 4.3';
/** A star drawn in one go: every `skip`th of `points` corners on a circle. */
const starPath = (points, skip, r) => `M${Array.from({ length: points }, (_, i) => around(0, 0, r, 90 + (360 * skip * i) / points)).join(' L')} Z`;
const cog = (outer, inner) => `M${Array.from({ length: 8 }, (_, i) => [[-14, inner], [-8, outer], [8, outer], [14, inner]].map(([da, r]) => around(0, 0, r, 45 * i + da)).join(' L')).join(' L')} Z`;
const spiral = (turns, r, steps) => `M${Array.from({ length: steps + 1 }, (_, i) => around(0, 0, 0.1 * r + (0.9 * r * i) / steps, (360 * turns * i) / steps)).join(' L')}`;
const WEB = [0, 60, 120, 180, 240, 300].map((a) => `M0,0 L${around(0, 0, 1.6, a)} L${around(0, 0, 3.2, a)} L${around(0, 0, 5, a)}`).join(' ');
const hexagon = (r) => `M${[0, 60, 120, 180, 240, 300].map((a) => around(0, 0, r, a)).join(' L')} Z`;
const CHAIN = Array.from({ length: 10 }, (_, i) => {
  const a = 36 * i * RAD;
  const wide = i % 2 ? 0.22 : 0.55; // every second link is seen from the side
  return `M${Array.from({ length: 16 }, (_, j) => {
    const [u, v] = [1.2 * Math.cos((TAU * j) / 16), wide * Math.sin((TAU * j) / 16)];
    return `${(4.2 * Math.cos(a) - u * Math.sin(a) + v * Math.cos(a)).toFixed(3)},${(4.2 * Math.sin(a) + u * Math.cos(a) + v * Math.sin(a)).toFixed(3)}`;
  }).join(' L')} Z`;
}).join(' ');
const INFINITY = `M${Array.from({ length: 48 }, (_, i) => {
  const t = (TAU * i) / 48;
  const k = 3.9 / (1 + Math.sin(t) ** 2);
  return `${(k * Math.cos(t)).toFixed(3)},${(k * Math.sin(t) * Math.cos(t)).toFixed(3)}`;
}).join(' L')} Z`;

const SEALS = [
  ['pentagram-seal', 'Pentagram seal', `${RINGS} ${starPath(5, 2, 4.3)}`, 'star five points witch ritual spell'],
  ['heptagram-seal', 'Heptagram seal', `${RINGS} ${starPath(7, 3, 4.3)}`, 'star seven points fairy ward spell'],
  ['square-seal', 'Square seal', 'O0,0 5 M3.5,3.5 L-3.5,3.5 L-3.5,-3.5 L3.5,-3.5 Z O0,0 3.5 O0,0 1.2', 'four corners box ward stable spell'],
  ['water-seal', 'Water seal', `${RINGS} M0,3.3 C1.6,1.1 2.4,-0.1 2.4,-1.1 C2.4,-2.5 1.3,-3.3 0,-3.3 C-1.3,-3.3 -2.4,-2.5 -2.4,-1.1 C-2.4,-0.1 -1.6,1.1 0,3.3 N A0,-1.1 1.4 200 270`, 'drop rain sea wet aqua spell'],
  ['earth-seal', 'Earth seal', `${RINGS} M-3.5,-1.7 L-0.9,2.5 L0.5,0.3 L1.3,1.5 L3.5,-1.7 Z`, 'mountain rock stone ground spell'],
  ['wind-seal', 'Wind seal', `${RINGS} M-3.3,1.4 L1.2,1.4 C3,1.4 3,3.3 1.4,2.9 M-3.5,0 L2.6,0 M-3.3,-1.4 L0.6,-1.4 C2.4,-1.4 2.4,-3.3 0.8,-2.9`, 'air gust breeze storm blow spell'],
  ['light-seal', 'Light seal', `${RINGS} M0,3.7 Q0.5,0.5 3.7,0 Q0.5,-0.5 0,-3.7 Q-0.5,-0.5 -3.7,0 Q-0.5,0.5 0,3.7 D2.3,2.3 D-2.3,2.3 D2.3,-2.3 D-2.3,-2.3`, 'holy shine sparkle bright bless spell'],
  ['skull-seal', 'Skull seal', `${RINGS} M-2.2,-0.6 C-3.4,0.6 -2.6,3.4 0,3.4 C2.6,3.4 3.4,0.6 2.2,-0.6 L2.2,-1.7 L1.2,-1.7 L1.2,-2.9 L-1.2,-2.9 L-1.2,-1.7 L-2.2,-1.7 Z O-1.1,0.9 0.65 O1.1,0.9 0.65`, 'death curse dark danger necromancer spell'],
  ['shield-seal', 'Shield seal', `${RINGS} M0,3.5 L2.8,2.5 L2.8,0.6 L2.8,0 C2.8,-1.8 1.4,-3 0,-3.6 C-1.4,-3 -2.8,-1.8 -2.8,0 L-2.8,0.6 L-2.8,2.5 Z M0,3.5 L0,0.6 L0,-3.6 M-2.8,0.6 L0,0.6 L2.8,0.6`, 'defence protect armour guard block buff'],
  ['sword-seal', 'Sword seal', `${RINGS} M0,3.8 L0.6,2.9 L0.6,-1.2 L1.8,-1.2 L1.8,-1.9 L0.4,-1.9 L0.4,-3.5 L-0.4,-3.5 L-0.4,-1.9 L-1.8,-1.9 L-1.8,-1.2 L-0.6,-1.2 L-0.6,2.9 Z`, 'attack strength power fight blade buff'],
  ['key-seal', 'Key seal', `${RINGS} O0,2 1.5 M0,0.5 L0,-2.3 L0,-3.6 L1.5,-3.6 M0,-2.3 L1.2,-2.3`, 'unlock secret open door spell'],
  ['crown-seal', 'Crown seal', `${RINGS} M-3,-2.2 L-3.2,1.6 L-1.5,-0.2 L0,2.6 L1.5,-0.2 L3.2,1.6 L3,-2.2 Z`, 'king queen royal boss leader'],
  ['leaf-seal', 'Leaf seal', `${RINGS} M-2.6,-2.6 C-3,1 0,3.4 3,3 C3.4,0 1,-3 -2.6,-2.6 M-2.6,-2.6 L1.8,1.8`, 'plant grass forest grow druid life'],
  ['spiral-seal', 'Spiral seal', `O0,0 5 ${spiral(3, 4.3, 72)}`, 'hypnosis swirl vortex dizzy sleep spell'],
  ['yin-yang-seal', 'Yin-yang seal', `${RINGS} N A0,2.15 2.15 90 270 N A0,-2.15 2.15 -90 90 O0,2.15 0.5 O0,-2.15 0.5`, 'balance harmony taijitu light dark'],
  ['lock-on-ring', 'Lock-on ring', () => joinDrawings(parsePath('O0,0 3 D0,0'), spin('M-0.9,5 L0.9,5 L0,3.6 Z', 3)), 'target aim enemy marker boss focus'],
  ['paw-seal', 'Paw seal', `${RINGS} M0,-2.8 C-2.5,-2.8 -2.3,-0.3 0,0.1 C2.3,-0.3 2.5,-2.8 0,-2.8 O-2.4,0.6 0.75 O-0.9,2.2 0.75 O0.9,2.2 0.75 O2.4,0.6 0.75`, 'beast animal pet summon tamer'],
  ['music-seal', 'Music seal', `${RINGS} O-0.9,-2.1 1.1 M0.2,-2.1 L0.2,3.3 C1.2,2.7 2.6,2 2.4,0.3`, 'song bard sound charm sing note'],
  ['time-seal', 'Time seal', `${RINGS} M-2.2,3.2 L2.2,3.2 L0.3,0 L2.2,-3.2 L-2.2,-3.2 L-0.3,0 Z`, 'hourglass slow haste sand stop'],
  ['lock-seal', 'Lock seal', `${RINGS} M-2.2,0.4 L-1.4,0.4 L1.4,0.4 L2.2,0.4 L2.2,-3 L-2.2,-3 Z M-1.4,0.4 L-1.4,1.6 A0,1.6 1.4 180 0 L1.4,0.4 O0,-1.2 0.5`, 'padlock sealed closed bind silence'],
  ['potion-seal', 'Potion seal', `${RINGS} M-0.7,3.4 L-0.7,1.2 L-2.6,-2.4 C-3,-3.2 -2.6,-3.4 -2,-3.4 L2,-3.4 C2.6,-3.4 3,-3.2 2.6,-2.4 L0.7,1.2 L0.7,3.4 Z D-0.5,-2.2 D0.7,-1.6`, 'poison alchemy brew flask toxic'],
  ['speed-seal', 'Speed seal', `${RINGS} M-2.8,2.6 L-0.2,0 L-2.8,-2.6 M-0.2,2.6 L2.4,0 L-0.2,-2.6`, 'haste fast dash boost forward'],
  ['gear-seal', 'Gear seal', `O0,0 5 ${cog(4, 3.1)} O0,0 1.3`, 'machine cog mechanic steampunk engineer'],
  ['web-seal', 'Web seal', `O0,0 5 ${WEB} ${hexagon(1.6)} ${hexagon(3.2)}`, 'spider trap snare slow sticky'],
  ['orb-seal', 'Orb seal', `O0,0 5 O0,0 3.4 ${[0, 60, 120, 180, 240, 300].map((a) => `O${around(0, 0, 3.4, a)} 0.7`).join(' ')} D0,0`, 'beads planets pearls six charm'],
  ['chain-seal', 'Chain seal', `${CHAIN} O0,0 2.6`, 'bind chains prison hold trap links'],
  ['infinity-seal', 'Infinity seal', `${RINGS} ${INFINITY}`, 'forever endless loop eternal eight'],
].map(([id, name, draw, tags]) => drawnShape({ id, name, cat: 'effects', sub: 'Magic circles', draw, tags }));

// ---------------------------------------------------------------- rings and shields

function barrierWall() {
  const s = sketch();
  const angles = [-60, -30, 0, 30, 60].map((d) => (90 + d) * RAD);
  const levels = [-0.8, 0, 0.8];
  const at = (a, y) => [1.1 * Math.cos(a), y, 1.1 * Math.sin(a) - 0.8];
  for (const y of levels) for (let i = 0; i + 1 < angles.length; i++) s.run(Array.from({ length: 5 }, (_, j) => at(angles[i] + ((angles[i + 1] - angles[i]) * j) / 4, y)));
  for (const a of angles) cutLine(s, ...levels.map((y) => at(a, y)));
  return s;
}

function lotusShield() {
  const s = sketch();
  const base = circle(s, [0, -0.6, 0], 0.5, X, Z, 8);
  for (let i = 0; i < 8; i++) {
    const tip = ringPt(1, 0.6, (TAU * (i + 0.5)) / 8);
    const side = (p) => smooth([p, [((p[0] + tip[0]) / 2) * 1.25, -0.1, ((p[2] + tip[2]) / 2) * 1.25], tip], 5);
    s.run(side(base[i])).run(side(base[(i + 1) % 8]));
  }
  return s;
}

/** `k` copies of a flat drawing standing in a ring: `facing` the middle, or edge on to it. */
function ringOf(d, k, radius, size, facing = true) {
  const glyph = drawingNet(fitDrawing(parsePath(d)));
  return joinNets(...Array.from({ length: k }, (_, i) => {
    const [c, t] = [Math.cos((TAU * i) / k), Math.sin((TAU * i) / k)];
    return mapNet(glyph, ([u, v]) => (facing ? [radius * c - u * size * t, v * size, radius * t + u * size * c] : [(radius + u * size) * c, v * size, (radius + u * size) * t]));
  }));
}

const twist = (strand) => (t) => {
  const a = TAU * t;
  const b = 6 * a + Math.PI * strand;
  return [(0.82 + 0.16 * Math.cos(b)) * Math.cos(a), 0.16 * Math.sin(b), (0.82 + 0.16 * Math.cos(b)) * Math.sin(a)];
};

const FIELDS = [
  wire('barrier-wall', 'Barrier wall', barrierWall, 'shield curved block defend energy'),
  { id: 'twisted-ring', name: 'Twisted ring', count: 140, min: 24, tags: 'rope braid halo two strands wreath', gen: (n) => equal(2, n).flatMap((k, i) => curve(twist(i), k, true, 1200)) },
  wire('lotus-shield', 'Lotus shield', lotusShield, 'flower petals guard bloom barrier'),
  {
    id: 'chain-ring', name: 'Chain ring', count: 150, min: 40, tags: 'chains bind links necklace bracelet',
    gen: (n) => equal(10, n).flatMap((k, i) => Array.from({ length: k }, (_, j) => {
      const [a, b] = [(TAU * i) / 10, (TAU * j) / k];
      const [along, across] = [0.3 * Math.cos(b), 0.12 * Math.sin(b)];
      const r = 0.8 + (i % 2 ? 0 : across); // every second link lies flat, the others stand up
      return [r * Math.cos(a) - along * Math.sin(a), i % 2 ? across : 0, r * Math.sin(a) + along * Math.cos(a)];
    })),
  },
  wire('sword-ring', 'Ring of swords', () => ringOf('M-0.45,0.4 L-0.16,0.4 L-0.16,-0.7 L0,-1 L0.16,-0.7 L0.16,0.4 L0.45,0.4 M-0.16,0.4 L0,0.4 L0.16,0.4 M0,0.4 L0,1', 4, 0.66, 0.7), 'blades summon attack spell circle'),
  wire('crystal-ring', 'Crystal ring', () => ringOf('M0,1 L0.4,0.6 L0.4,-0.6 L0,-1 L-0.4,-0.6 L-0.4,0.6 Z M0,1 L0,-1', 5, 0.7, 0.55), 'gems shards mana circle stones'),
  wire('candle-ring', 'Candle ring', () => ringOf('M-0.25,-1 L0.25,-1 L0.25,0.2 L0,0.2 L-0.25,0.2 Z M0,0.2 L0,0.4 M0,0.45 C0.3,0.7 0.1,0.9 0,1 C-0.1,0.9 -0.3,0.7 0,0.45', 7, 0.8, 0.42), 'ritual birthday seance lights circle'),
];

// ---------------------------------------------------------------- elements

const pathPart = (weight, path) => ({ weight, gen: (k) => some(k, () => pathPoints(path, k)) });

// seven jagged bolts from the middle outwards: only the two points in the middle of each are shaken
const ZAPS = (() => {
  const next = dice(7);
  return [[1, 0.3, 0.2], [-0.8, 0.5, 0.4], [0.2, 1, -0.3], [-0.3, -1, 0.3], [0.5, -0.4, -0.9], [-0.5, 0.2, -1], [0.3, -0.2, 1]].map((d) => {
    const len = Math.hypot(...d);
    return [0.42, 0.56, 0.7, 0.85].map((r, i) => d.map((c) => (c / len) * r + (i % 3 ? 0.2 * (next() - 0.5) : 0)));
  });
})();
const ARC = [[-0.5, 0, 0], [-0.32, 0.22, 0.1], [-0.16, -0.12, -0.08], [0, 0.2, 0.05], [0.14, -0.2, 0.1], [0.32, 0.14, -0.1], [0.5, 0, 0]];
const CLOUD = [[-0.5, 0.5, 0, 0.38], [0, 0.58, 0, 0.4], [0.5, 0.5, 0, 0.38], [0.15, 0.44, 0.28, 0.32], [-0.2, 0.46, -0.28, 0.32]];
const RAIN = [[-0.6, 0, 0], [-0.3, -0.3, 0.2], [0, 0, -0.1], [0.3, -0.3, 0.1], [0.6, 0, -0.2], [-0.45, -0.6, -0.1], [0.1, -0.62, 0.2], [0.5, -0.6, 0]];

function iceCrystal() {
  const s = sketch();
  for (let c = 0; c < 3; c++) {
    for (const side of [1, -1]) {
      const pt = (along, u, v) => {
        const p = [0, 0, 0];
        p[c] = side * along;
        p[(c + 1) % 3] = u;
        p[(c + 2) % 3] = v;
        return p;
      };
      cutLine(s, [0, 0, 0], pt(0.55, 0, 0), pt(1, 0, 0));
      for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.line(pt(0.55, 0, 0), pt(0.8, 0.25 * u, 0.25 * v));
    }
  }
  return s;
}

function frostNova() {
  const s = sketch();
  const base = circle(s, [0, 0, 0], 0.35, X, Z, 20, 0.5);
  for (let i = 0; i < 10; i++) {
    const tip = ringPt(1, 0.35, (TAU * (2 * i + 1)) / 20);
    s.line(base[2 * i], tip).line(tip, base[2 * i + 1]);
  }
  return s;
}

function stonePillars() {
  const s = sketch();
  for (const [x, z, wide, top] of [[-0.75, -0.2, 0.5, 0.2], [-0.1, -0.6, 0.5, 1], [0.45, 0, 0.45, -0.2], [-0.3, 0.35, 0.5, 0.5]]) box(s, x, -1, z, x + wide, top, z + wide);
  return s;
}

const ELEMENTS = [
  {
    id: 'ball-lightning', name: 'Ball lightning', count: 130, min: 30, tags: 'electric orb plasma tesla shock energy',
    gen: (n) => mix(n, [{ weight: 5, gen: (k) => ballPoints(k, 0.36) }, ...ZAPS.map((zap) => pathPart(1, zap))]),
  },
  {
    id: 'chain-lightning', name: 'Chain lightning', count: 120, min: 30, tags: 'electric arc tesla zap link beam',
    gen: (n) => mix(n, [{ weight: 4, gen: (k) => ballPoints(k, 0.24, [-0.75, 0, 0]) }, { weight: 4, gen: (k) => ballPoints(k, 0.24, [0.75, 0, 0]) }, pathPart(3, ARC)]),
  },
  {
    id: 'fire-wall', name: 'Wall of fire', count: 120, min: 30, tags: 'flames burn barrier line blaze',
    params: [P('flames', 'Flames', 4, 12, 1, 7)],
    gen: (n, p) => curve((t) => {
      const tongue = 1 - Math.abs(Math.sin(Math.round(p.flames) * Math.PI * t)) ** 0.6;
      return [-1 + 2 * t, -0.6 + 1.2 * tongue * (0.55 + 0.45 * Math.sin(TAU * (3 * t + 0.2)) ** 2), 0.2 * Math.sin(TAU * 2 * t)];
    }, n, false, 2880),
  },
  wire('snowflake3d', '3D snowflake', iceCrystal, 'ice crystal frost freeze cold winter'),
  {
    id: 'steam', name: 'Steam', count: 90, min: 12, tags: 'hot vapour smell heat rising wisps',
    gen: (n) => equal(3, n).flatMap((k, i) => Array.from({ length: k }, (_, j) => {
      const t = (j + 0.5) / k;
      return [-0.55 + 0.55 * i + 0.16 * Math.sin(TAU * 1.5 * t + i), -1 + 2 * t, 0.16 * Math.cos(TAU * 1.5 * t + i)];
    })),
  },
  {
    id: 'rain-cloud3d', name: '3D rain cloud', count: 130, min: 24, tags: 'weather shower storm drops wet',
    gen: (n) => mix(n, [{ weight: 14, gen: (k) => blobPoints(CLOUD, k) }, ...RAIN.map(([x, y, z]) => pathPart(1, [[x, y - 0.05, z], [x - 0.06, y - 0.3, z]]))]),
  },
  wire('frost-nova', 'Frost nova', frostNova, 'ice burst freeze spikes ring blast'),
  wire('stone-pillars', 'Stone pillars', stonePillars, 'earth rock columns basalt rise wall'),
];

// ---------------------------------------------------------------- floating things

const THREE = [[-0.62, -0.3, 0.2, 0.34, 12], [0, 0.3, -0.2, 0.5, 0], [0.62, -0.3, 0.1, 0.34, -12]];
const FIVE = [[-0.6, 0.55, 0.3, 0.36], [0.55, 0.6, -0.4, 0.3], [0, 0, 0.1, 0.4], [-0.58, -0.58, -0.3, 0.3], [0.6, -0.55, 0.4, 0.36]];
const SIX = [[-0.6, 0.6, -0.3, 0.3], [0.55, 0.5, 0.4, 0.34], [0.05, 0.1, -0.6, 0.26], [-0.66, -0.2, 0.3, 0.22], [0.62, -0.5, -0.4, 0.34], [-0.2, -0.68, 0.2, 0.28]];
const tilted = (places, turns) => places.map((p, i) => [...p.slice(0, 4), turns[i % turns.length]]);
const SWIRL = Array.from({ length: 9 }, (_, i) => [0.7 * Math.cos(0.9 * i), -0.85 + (1.7 * i) / 8, 0.7 * Math.sin(0.9 * i), 0.2, 40 * i]);

const FLOATING = [
  ['floating-skulls', 'Floating skulls', 'M-0.7,-0.2 C-1.1,0.2 -0.9,1 0,1 C0.9,1 1.1,0.2 0.7,-0.2 L0.7,-0.6 L0.35,-0.6 L0.35,-1 L-0.35,-1 L-0.35,-0.6 L-0.7,-0.6 Z D-0.35,0.25 D0.35,0.25', THREE, 'death poison curse danger spooky'],
  ['floating-keys', 'Floating keys', 'O-0.6,0 0.4 M-0.2,0 L0.6,0 L1,0 L1,-0.4 M0.6,0 L0.6,-0.3', tilted(THREE, [30, -45, 60]), 'unlock secret doors locks treasure'],
  ['floating-moons', 'Floating moons', 'N A0,0 1 60 300 A0.64,0 0.8772 260.82 99.18 Z', SIX, 'night crescents sleep dream sky'],
  ['lightning-bolts', 'Lightning bolts', 'M0.1,1 L-0.5,-0.1 L0.05,-0.1 L-0.1,-1 L0.5,0.2 L-0.05,0.2 Z', FIVE, 'electric shock zap energy thunder power'],
  ['floating-feathers', 'Floating feathers', 'M-0.9,-0.9 L-0.3,-0.3 L0.9,0.9 M-0.3,-0.3 C-0.9,0.5 0,1 0.9,0.9 C1,0 0.5,-0.9 -0.3,-0.3', tilted(FIVE, [0, 60, -30, 100, 20]), 'angel wings bird light soft fall'],
  ['floating-clovers', 'Floating clovers', 'O-0.42,0.42 0.4 O0.42,0.42 0.4 O-0.42,-0.42 0.4 O0.42,-0.42 0.4 M0,-0.5 L0.25,-1', THREE, 'luck lucky shamrock irish four leaf'],
  ['floating-crowns', 'Floating crowns', 'M-1,-0.6 L-1,0.6 L-0.5,0 L0,0.8 L0.5,0 L1,0.6 L1,-0.6 Z', THREE, 'king queen royal winner boss'],
  ['floating-hexagons', 'Floating hexagons', 'M1,0 L0.5,0.866 L-0.5,0.866 L-1,0 L-0.5,-0.866 L0.5,-0.866 Z', SIX, 'honeycomb cells sci-fi tech digital'],
  ['floating-spirals', 'Floating spirals', spiral(1.75, 1, 28), FIVE, 'dizzy hypnosis swirl confused'],
  ['floating-paws', 'Floating paws', 'O0,-0.3 0.5 O-0.62,0.45 0.24 O0,0.76 0.24 O0.62,0.45 0.24', tilted(THREE, [-20, 0, 25]), 'pet animal tracks cat dog prints'],
  ['floating-gifts', 'Floating gifts', 'M-0.8,-0.9 L0,-0.9 L0.8,-0.9 L0.8,0.3 L0,0.3 L-0.8,0.3 Z M0,-0.9 L0,0.3 M0,0.3 C-0.8,1.1 -1,0.3 0,0.3 C1,0.3 0.8,1.1 0,0.3', THREE, 'presents reward birthday christmas loot'],
  ['floating-balloons', 'Floating balloons', 'O0,0.3 0.7 M0,-0.4 L0.1,-0.7 L-0.05,-1', FIVE, 'party birthday celebrate fair'],
  ['butterfly-swarm', 'Butterfly swarm', 'M0,0 C0.3,0.9 1,1 1,0.4 C1,0 0.5,-0.1 0,0 C0.6,-0.2 0.8,-0.8 0.4,-0.9 C0.1,-0.9 0,-0.5 0,0 |', tilted(THREE, [20, 0, -25]), 'butterflies spring garden flutter meadow'],
  ['fish-school', 'School of fish', 'M-1,0 C-0.5,0.6 0.2,0.6 0.6,0.1 L1,0.5 L1,-0.5 L0.6,-0.1 C0.2,-0.6 -0.5,-0.6 -1,0', SIX, 'sea ocean underwater swim shoal'],
  ['floating-clouds', 'Floating clouds', 'M-0.6,-0.4 C-1.1,-0.4 -1.1,0.2 -0.6,0.2 C-0.6,0.7 0,0.8 0.2,0.4 C0.6,0.7 1.1,0.3 0.8,0 C1.1,-0.2 0.9,-0.4 0.6,-0.4 Z', THREE, 'sky weather dream puffs heaven'],
  ['floating-swords', 'Floating swords', 'M-0.45,-0.4 L-0.16,-0.4 L-0.16,0.7 L0,1 L0.16,0.7 L0.16,-0.4 L0.45,-0.4 M-0.16,-0.4 L0,-0.4 L0.16,-0.4 M0,-0.4 L0,-1', tilted(THREE, [200, 180, 160]), 'blades attack summon spirit rain'],
  ['floating-shields', 'Floating shields', 'M0,1 L0.8,0.7 L0.8,0 C0.8,-0.5 0.4,-0.8 0,-1 C-0.4,-0.8 -0.8,-0.5 -0.8,0 L-0.8,0.7 Z', THREE, 'defence protect guard armour buff'],
  ['floating-bones', 'Floating bones', 'M-0.6,0 L0.6,0 O-0.78,0.2 0.2 O-0.78,-0.2 0.2 O0.78,0.2 0.2 O0.78,-0.2 0.2', tilted(THREE, [40, -30, 75]), 'skeleton dog undead halloween'],
  ['floating-sweets', 'Floating sweets', 'O0,0 0.5 M0.5,0 L1,0.4 L1,-0.4 Z M-0.5,0 L-1,0.4 L-1,-0.4 Z', tilted(THREE, [30, -40, 10]), 'candy halloween treats sugar wrapped'],
  ['floating-ghosts', 'Floating ghosts', 'M-0.7,-1 L-0.7,0.3 C-0.7,1.2 0.7,1.2 0.7,0.3 L0.7,-1 L0.35,-0.7 L0,-1 L-0.35,-0.7 Z D-0.25,0.3 D0.25,0.3', THREE, 'spirits spooky halloween haunt boo'],
  ['floating-gears', 'Floating gears', `${cog(1, 0.78)} O0,0 0.3`, THREE, 'machine cogs steampunk tech work'],
  ['flying-cards', 'Flying cards', 'M-0.6,-1 L0.6,-1 L0.6,1 L-0.6,1 Z M0,0.4 L0.3,0 L0,-0.4 L-0.3,0 Z', tilted(FIVE, [20, -30, 5, 50, -15]), 'playing magic trick casino deck'],
  ['speech-bubbles', 'Speech bubbles', 'M-0.9,-0.3 L-0.9,0.8 L0.9,0.8 L0.9,-0.3 L-0.1,-0.3 L-0.5,-0.9 L-0.5,-0.3 Z', THREE, 'chat talk comic text say'],
  ['dollar-signs', 'Dollar signs', 'M0.6,0.55 C0.3,0.9 -0.6,0.8 -0.6,0.35 C-0.6,-0.1 0.6,0.1 0.6,-0.35 C0.6,-0.8 -0.3,-0.9 -0.6,-0.55 M0,1 L0,-1', THREE, 'money cash rich price sale'],
  ['petal-swirl', 'Petal swirl', 'M-1,0 Q0,0.7 1,0 Q0,-0.7 -1,0', SWIRL, 'wind blossom leaves autumn spring whirl'],
].map(([id, name, d, places, tags]) => wire(id, name, () => floaters(d, places), tags));

const put = (group, sub, list) => list.map((s) => Object.assign(s, { cat: 'effects', group, sub }));

export const MAGIC_SHAPES = [
  ...SEALS,
  ...put('solid', 'Rings and shields', FIELDS),
  ...put('solid', 'Elements', ELEMENTS),
  ...put('solid', 'Floating things', FLOATING),
];
