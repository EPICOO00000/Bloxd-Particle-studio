// Turns a scene into JavaScript for a Bloxd code block (or World Code).
// Pure module (no DOM) so the Node tests can run the generated code.
//
// Every particle is one api.playParticleEffect call that emits exactly one
// particle at an exact position (pos1 === pos2, manualEmitCount 1). The game
// reads every field of the options on the client, so the generated code always
// sends the complete set of fields from the official example.
//
// Objects without timing are written the short way: P(...) with one position
// per particle. Objects with timing (they appear later, fade in, have keys,
// repeat, or sit in a group that does) are written as T(...): the points of
// the shape once, and a table of "pieces" (js/motion.js) that says what the
// particles of every point do over time.
//
// Groups are not in the code at all: every object is written where its groups
// put it.
//
// An object whose keys change its shape (a morph, js/motion.js) is written as
// several T(...): one for each list of points its pieces are for. The points
// it starts with, the points of a shape a key gives it, and for every morph
// its "rows": six numbers for each particle (where it starts, which way it
// goes) and matrices of 3 rows of 7 numbers instead of 4. T(...) sees from
// the first matrix of a call which of the two it is.
//
// A third way to write the scene, next to the code block and the World Code
// that redraws it on a timer: as a function (target 'function'). World Code
// made in the Code window (js/nodes.js) calls it wherever and whenever
// something happens in the game:
//   psPlay(pos, facing)
// pos is where the middle of the floor of the studio's code block goes, so a
// scene built around the block is played around that place. facing (optional)
// is a direction: the scene is turned about that middle so that what points
// along +Z in the studio points that way. Every place and every direction of
// flight goes through W(...), which does the turning; the pull of gravity
// stays straight down.
//
// The order in which the particles are made
//   A particle counts its time from the moment the game makes it, so one that
//   is made later does everything later. Users found that things in a group
//   that moves were out of step with each other in the game. Played in the
//   copy of the game's particle engine (tests/babylon-sim.mjs) the code keeps
//   them together to a hundredth of a block when all particles of a click are
//   made in the same frame, and tears them apart in just that way when they
//   are made one after the other over several frames. So that is what the game
//   must be doing with a click that makes hundreds of particles. (Nobody here
//   has seen its code. A burst of hundreds of messages takes a while to arrive
//   and to be worked through, which would do it.) Written object after object,
//   each object was late by the time the game needed for all the particles of
//   the objects before it.
//   So the particles with timing are not played where they are written. T(...)
//   only notes them down in a list, and the last lines of the code play that
//   list family by family, and a family in the order of time.
//   A family is what has to be in step: what is in a group that moves, and
//   objects that fly the very same stretches at the very same moments (see
//   familiesOf). An object that goes its own way is a family by itself: its
//   particles stay next to each other, as they always were, and nothing that
//   has nothing to do with it comes between them.
//   The families follow each other in the order of time too, the latest first
//   (as the pieces of a family do, see below): what comes after something in
//   the show is made right before the last pieces of it. A splash where a
//   group lands then shows when the group lands, and not later by the time
//   the game needs for the whole group.
//   Inside a family every piece lies where the middle of the time it is seen
//   lies, the latest first. What is seen at the same moment is then made
//   together, whichever object it belongs to. Things that move as one have
//   the same moments, so their pieces are neighbours in the list. A piece
//   that is seen for a long time (a body that glides) lies in the middle of
//   the short ones that are seen meanwhile (its wings, flapping): as near to
//   all of them as one place in a list can be.
//   Among pieces with the same moment the list goes along the shapes: the
//   first points of all objects, then the next ones, so that no object as a
//   whole is ahead of another.
//   Latest first, because the piece that takes over from another is then made
//   before it: it shows up a little early (for a moment the point is seen
//   twice) instead of a little late (the point would be gone for a moment: a
//   blink).
//   This cannot make the game start everything at once. What is left: things
//   of a family that are seen at the same moment are apart by the time the
//   game needs for the particles of that moment, not for those of the whole
//   scene; two families that are in the show at the same time are apart by
//   the time it needs for one of them, as they always were; and every code
//   block has a list of its own, so what is in different code blocks is as
//   far apart as before. rushOf() says how much there is to be out of step.

import {
  objectPoints, stillPoints, stillMove, localPoints, hexToRgb, isMoving, sceneDuration, sceneTree, FADE_START,
} from './scene.js';
import { planOf, tintedStops, applyMatrix, LIFE_PER_SECOND } from './motion.js';

/** Limits of the in-game editor. */
export const LIMITS = { chars: 16000, lines: 500, width: 80 };

/** Precisions offered in the export panel: positions are stored as integers. */
export const PRECISIONS = [
  { scale: 100, label: '0.01 block (exact)' },
  { scale: 20, label: '0.05 block (smaller code)' },
  { scale: 10, label: '0.1 block (smallest code)' },
];

const fmt = (v) => String(Number(Number(v).toFixed(3)));

/** Compact JS literal with bare keys: { a: 1, b: [0, 1, 0] } */
function lit(v) {
  if (Array.isArray(v)) return `[${v.map(lit).join(', ')}]`;
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    return keys.length ? `{ ${keys.map((k) => `${k}: ${lit(v[k])}`).join(', ')} }` : '{}';
  }
  if (typeof v === 'string') return JSON.stringify(v);
  return fmt(v);
}

/** Pack "token, token," pieces into lines no wider than `width`. */
function pack(tokens, width, indent = '', glue = ' ') {
  const lines = [];
  let line = '';
  for (const tok of tokens) {
    if (!line) line = indent + tok;
    else if (line.length + glue.length + tok.length <= width) line += glue + tok;
    else {
      lines.push(line);
      line = indent + tok;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** The options one object needs, with real Code API field names. */
function styleOf(obj, hideDist) {
  const n = (v) => Number(fmt(v));
  const moving = isMoving(obj);
  const lo = obj.move.map((v) => n(v - obj.spread));
  const hi = obj.move.map((v) => n(v + obj.spread));
  const size2 = obj.size2 === null ? obj.size : obj.size2;
  const fields = {
    dir1: moving ? lo : [0, 1, 0],
    dir2: moving ? hi : [0, 1, 0],
    minEmitPower: moving ? 1 : 0,
    maxEmitPower: moving ? 1 : 0,
    minLifeTime: n(obj.life),
    maxLifeTime: n(obj.life),
    minSize: n(Math.min(obj.size, size2)),
    maxSize: n(Math.max(obj.size, size2)),
    gravity: [0, n(obj.gravity), 0],
    blendMode: obj.blend,
  };
  if (hideDist) fields.hideDist = hideDist;
  const c1 = hexToRgb(obj.color);
  const style = {
    texture: obj.texture,
    c1,
    c2: obj.color2 ? hexToRgb(obj.color2) : c1,
    fade: obj.fade ? 1 : 0,
    fields,
    // expand: [centre x, y, z, rate, slowest velocity xyz, fastest velocity xyz]
    expand: obj.expand !== 0 ? [...obj.pos, obj.expand, ...lo, ...hi].map(n) : null,
  };
  if (style.expand) {
    delete fields.dir1; // set for every particle from its own position
    delete fields.dir2;
  }
  return style;
}

const styleKey = (s) => JSON.stringify([s.texture, s.c1, s.c2, s.fade, s.fields, s.expand]);

/** Objects with the same look are merged so their options are written once. */
function buildGroups(tree, opts) {
  const groups = [];
  const byKey = new Map();
  for (const obj of tree.leaves()) {
    if (!tree.plain(obj)) continue;
    // in a group: where the group puts it, flying the way the group is turned
    const grouped = tree.chainOf(obj).length > 0;
    const points = grouped ? stillPoints(tree, obj) : objectPoints(obj);
    const placed = grouped ? { ...obj, pos: stillPoints(tree, { ...obj, shape: 'point' })[0], move: stillMove(tree, obj) } : obj;
    const style = styleOf(placed, opts.hideDist);
    const key = styleKey(style);
    let group = byKey.get(key);
    if (!group) {
      group = { style, data: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    for (const p of points) {
      for (const v of p) group.data.push(Math.round(v * opts.precision) + 0); // + 0 turns -0 into 0
    }
  }
  return groups;
}

const BASE_ORDER = [
  'dir1', 'dir2', 'minEmitPower', 'maxEmitPower', 'minLifeTime', 'maxLifeTime',
  'minSize', 'maxSize', 'manualEmitCount', 'gravity', 'blendMode', 'hideDist',
];

/** Most common value of every field goes into the shared base object. */
function buildBase(groups) {
  const base = { manualEmitCount: 1 };
  for (const key of BASE_ORDER) {
    const votes = new Map();
    for (const g of groups) {
      if (!(key in g.style.fields)) continue;
      const k = JSON.stringify(g.style.fields[key]);
      votes.set(k, (votes.get(k) || 0) + 1);
    }
    let best = null;
    for (const [k, n] of votes) if (!best || n > best[1]) best = [k, n];
    if (best) base[key] = JSON.parse(best[0]);
  }
  for (const key of ['dir1', 'dir2']) if (!(key in base)) base[key] = [0, 1, 0];
  const ordered = {};
  for (const key of BASE_ORDER) if (key in base) ordered[key] = base[key];
  return ordered;
}

function overridesOf(group, base) {
  const o = {};
  for (const key of BASE_ORDER) {
    if (key in group.style.fields && JSON.stringify(group.style.fields[key]) !== JSON.stringify(base[key])) {
      o[key] = group.style.fields[key];
    }
  }
  return o;
}

function preludeLines({ base, precision, width, useExpand, useMixFade, anchor, plain, timed, turn }) {
  const q = precision;
  const entries = Object.keys(base).map((k) => `${k}: ${lit(base[k])},`);
  const lines = Array.isArray(anchor) ? anchor.slice() : [anchor];
  // T(...) sets the directions and the speed of every particle itself: when
  // nothing is written the short way, B has nothing to say about them.
  if (plain) {
    lines.push(
      'const B = {',
      ...pack(entries, width, '  '),
      '  velocityGradients: [{ timeFraction: 0, factor: 1, factor2: 1 }],',
      '}',
    );
  } else lines.push(`const B = { manualEmitCount: ${lit(base.manualEmitCount)} }`);
  lines.push(
    'const G = (t, a, b, o) =>',
    '  ({ timeFraction: t, minColor: a.concat(o), maxColor: b.concat(o) })',
  );
  if (timed) lines.push('const Q = []', ...timedHelperLines({ ...timed, turn }));
  if (!plain) return lines;
  lines.push(`const P = (texture, a, b, f, o, d${useExpand ? ', e' : ''}) => {`);
  // (`turn`: the scene is played by a function, at a place and turned a way that are only known in the game)
  const position = turn
    ? `    const p = W([d[i] / ${q} - .5, d[i + 1] / ${q}, d[i + 2] / ${q} - .5])\n      .map((v, j) => v + [X, Y, Z][j])`
    : `    const p = [X + d[i] / ${q}, Y + d[i + 1] / ${q}, Z + d[i + 2] / ${q}]`;
  if (useMixFade) {
    // The game picks a new random colour at every step of a gradient, so a
    // fading particle with two colours would drift between them. Picking the
    // colour here keeps each particle in one colour, like the studio shows.
    lines.push(
      '  for (let i = 0; i < d.length; i += 3) {',
      ...position.split('\n'),
      '    const k = Math.random()',
      '    const c = a.map((v, j) => Math.round(v + (b[j] - v) * k))',
      '    const colorGradients = f',
      `      ? [G(0, c, c, 1), G(${fmt(FADE_START)}, c, c, 1), G(1, c, c, 0)]`,
      '      : [G(0, a, b, 1)]',
    );
  } else {
    lines.push(
      '  const colorGradients = f',
      `    ? [G(0, a, b, 1), G(${fmt(FADE_START)}, a, b, 1), G(1, a, b, 0)]`,
      '    : [G(0, a, b, 1)]',
      '  for (let i = 0; i < d.length; i += 3) {',
      ...position.split('\n'),
    );
  }
  lines.push('    const q = { texture, colorGradients, pos1: p, pos2: p }');
  if (useExpand) {
    lines.push(
      '    if (e) {',
      `      const u = [0, 1, 2].map((j) => (d[i + j] / ${q} - e[j]) * e[3])`,
      '      q.dir1 = u.map((v, j) => v + e[4 + j])',
      '      q.dir2 = u.map((v, j) => v + e[7 + j])',
      '    }',
    );
  }
  if (turn) {
    // the way it flies is turned with the scene: the middle of what dir1 and dir2 span, with the same scatter around it
    lines.push(
      '    const O = Object.assign({}, B, o, q)',
      '    const m = W(O.dir1.map((v, j) => (v + O.dir2[j]) / 2))',
      '    const s = O.dir1.map((v, j) => (O.dir2[j] - v) / 2)',
      '    O.dir1 = m.map((v, j) => v - s[j])',
      '    O.dir2 = m.map((v, j) => v + s[j])',
      '    api.playParticleEffect(O)',
      '  }',
      '}',
    );
  } else lines.push('    api.playParticleEffect(Object.assign({}, B, o, q))', '  }', '}');
  return lines;
}

// ---------------------------------------------------------------- objects with timing

/**
 * The helper for objects with timing.
 *   T(texture, colour, second colour, options, q, points, pieces, darken)
 * points : x, y, z of every point of the shape, times q
 * pieces : [lifetime, place, direction, visibility, speed, scatter, gravity]
 *          place and direction are 3x4 matrices (row by row) that turn a point
 *          of the shape into a position and a velocity; visibility and speed
 *          are lists of [fraction of the lifetime, value].
 * Every point gets one game particle per piece. All of them are made at the
 * click; each stays unseen until its time has come. T(...) does not play them:
 * it puts each into the list Q as [the middle of the time it is seen (twice
 * that: the age it shows up at plus the age it ends at), how far along the
 * shape its point is (0 to 1), the options], and PLAY_LINES plays the list
 * (see the top of the file).
 */
/**
 * The room every family has in the order (see T): more than twice the latest
 * age a piece can end at. Eight groups around an object, each of the nine
 * started as late and played as often as the studio allows, and the longest
 * life there is: 322,300 seconds, an age of 193,380.
 */
const FAMILY_ROOM = '1e6';
function timedHelperLines({ mix, sizes, darken, hue, grow, families, wide, turn }) {
  // `hue`: a key changes a colour somewhere. Then a and b are lists of colours
  // and a stop of the visibility says which one it has: [fraction, value, number].
  // `grow`: a key changes a size somewhere. Then a piece can carry its own size,
  // after its visibility: a number, or [smallest, largest].
  const own = mix ? 'c' : 'a';
  const colour = hue ? `${own}[i || 0]` : own;
  const lines = [
    // (F: the number of its family, see familiesOf(); only there when the scene has more than one)
    `const T = (texture, a, b, o, q, d, s${darken ? ', h' : ''}${families ? ', F = 0' : ''}) => {`,
  ];
  // `wide`: a key changes a shape somewhere. Then a call can be for the rows of
  // a morph: N numbers for each particle (6, or 3 as ever), and matrices with
  // N + 1 numbers in each of their 3 rows.
  if (wide) lines.push('  const N = s[0][1].length / 3 - 1');
  lines.push(`  for (let i = 0; i < d.length; i += ${wide ? 'N' : 3}) {`);
  // one colour and one size per point: all its pieces have to look the same
  if (mix) {
    lines.push('    const k = Math.random()');
    if (hue) lines.push('    const c = a.map((e, n) =>', '      e.map((v, j) => Math.round(v + (b[n][j] - v) * k)))');
    else lines.push('    const c = a.map((v, j) => Math.round(v + (b[j] - v) * k))');
  }
  if (grow) lines.push('    const K = Math.random()');
  else if (sizes) lines.push('    const z = o.minSize + (o.maxSize - o.minSize) * Math.random()');
  if (darken) {
    // blend mode 0 ignores alpha: there a particle is hidden by turning it black
    lines.push(
      hue ? '    const C = (t, x, i) => {' : '    const C = (t, x) => {',
      `      const e = h ? ${colour}.map((y) => Math.round(y * x)) : ${colour}`,
      '      return G(t, e, e, h ? 1 : x)',
      '    }',
    );
  }
  lines.push(grow ? '    for (const [n, m, v, w, z, f, r, g] of s) {' : '    for (const [n, m, v, w, f, r, g] of s) {');
  if (wide) {
    lines.push(
      '      const at = (e) => [0, N + 1, N + N + 2].map((j) => e[j + N]',
      '        + d.slice(i, i + N).reduce((y, x, l) => y + e[j + l] * x, 0) / q)',
    );
  } else {
    lines.push(
      '      const at = (e) => [0, 4, 8].map((j) => e[j + 3] + (e[j] * d[i]',
      '        + e[j + 1] * d[i + 1] + e[j + 2] * d[i + 2]) / q)',
    );
  }
  if (turn) {
    lines.push(
      '      const p = W(at(m).map((x, j) => x - (j === 1 ? 0 : .5)))',
      '        .map((x, j) => x + [X, Y, Z][j])',
      '      const u = v ? W(at(v)) : [0, 1, 0]',
    );
  } else {
    lines.push(
      '      const p = at(m).map((x, j) => x + [X, Y, Z][j])',
      '      const u = v ? at(v) : [0, 1, 0]',
    );
  }
  if (grow) {
    lines.push(
      '      const S = !z ? o.minSize + (o.maxSize - o.minSize) * K',
      '        : z.length ? z[0] + (z[1] - z[0]) * K : z',
    );
  }
  const stop = hue ? '([t, x, i])' : '([t, x])';
  lines.push(
    // (L: the stop at which the piece lights up; n + n * L[0] is the age it shows up at plus the age it ends at.
    // One family after the other: every family has room for itself below the one before it.)
    '      const L = w.find((e) => e[1] > 0) || w[0]',
    `      Q.push([n + n * L[0]${families ? ` - ${FAMILY_ROOM} * F` : ''}, i / d.length, Object.assign({}, B, o, {`,
    `        texture, pos1: p, pos2: p,${grow ? ' minSize: S, maxSize: S,' : sizes ? ' minSize: z, maxSize: z,' : ''}`,
    '        dir1: u.map((x) => x - (r || 0)),',
    '        dir2: u.map((x) => x + (r || 0)),',
    '        minEmitPower: v ? 1 : 0, maxEmitPower: v ? 1 : 0,',
    '        minLifeTime: n, maxLifeTime: n, gravity: [0, g || 0, 0],',
    darken ? `        colorGradients: w.map(${stop} => C(t, x${hue ? ', i' : ''})),`
      : `        colorGradients: w.map(${stop} => G(t, ${colour}, ${colour}, x)),`,
    '        velocityGradients: (f || [[0, 1]]).map(([t, x]) =>',
    '          ({ timeFraction: t, factor: x, factor2: x })),',
    '      })])',
    '    }',
    '  }',
    '}',
  );
  return lines;
}

/**
 * The last lines of a code block with timing: play what T(...) noted down, in
 * the order of time (see the top of the file). The list is emptied, so that
 * World Code, which runs these lines again and again, starts afresh each time.
 */
const PLAY_LINES = [
  'Q.sort((a, b) => b[0] - a[0] || a[1] - b[1])',
  'for (const e of Q.splice(0)) api.playParticleEffect(e[2])',
];

/** A number as short as JavaScript allows: 0.5 is written .5 */
const short = (v, digits) => {
  const text = String(Number(Number(v).toFixed(digits)) + 0);
  return text.replace(/^(-?)0\./, '$1.');
};

/** Nested arrays of ready-made number strings as tokens that can be packed into lines. */
function tokensOf(v) {
  if (!Array.isArray(v)) return [String(v)];
  if (!v.length) return ['[]'];
  const out = [];
  v.forEach((child, i) => {
    const t = tokensOf(child);
    if (i < v.length - 1) t[t.length - 1] += ',';
    out.push(...t);
  });
  out[0] = `[${out[0]}`;
  out[out.length - 1] += ']';
  return out;
}

/** Ages are written with four decimals, here and as lifetimes, so that pieces agree on them. */
const ageOf = (age) => Number(age.toFixed(4));

/**
 * [age, value] stops as [fraction of the lifetime, value]. Fractions are cut
 * off, never rounded up: a piece must be switched on no later than the piece
 * before it dies. They stay strictly rising.
 */
function stopsOf(curve, life, digits) {
  const out = curve.map(([age, value, colour]) => [
    Math.min(1, Math.floor((ageOf(age) / life) * 1e6 + 1e-6) / 1e6),
    Number(Number(value).toFixed(digits)) + 0,
    colour,
  ]);
  for (let i = out.length - 2; i >= 0; i--) {
    if (out[i][0] >= out[i + 1][0]) out[i][0] = Math.max(0, Math.round(out[i + 1][0] * 1e6 - 1) / 1e6);
  }
  // (two stops at 0 can only come from a change in the very first moment: the later one counts)
  while (out.length > 1 && out[1][0] <= 0) out.shift();
  // (the number of a colour is only written when it is not the first one)
  return out.map(([t, x, colour]) => (colour ? [short(t, 6), short(x, digits), String(colour)] : [short(t, 6), short(x, digits)]));
}

/** Everything the code needs to know about one object with timing: all its plays, with its groups worked in. */
function timedOf(obj, tree, opts) {
  const plans = tree.playsOf(obj).map((lineage) => planOf(obj, lineage));
  const n = (v) => Number(fmt(v));
  const size2 = obj.size2 === null ? obj.size : obj.size2;
  const o = { minSize: n(Math.min(obj.size, size2)), maxSize: n(Math.max(obj.size, size2)), blendMode: obj.blend };
  if (opts.hideDist) o.hideDist = opts.hideDist;
  // points are stored as whole numbers: fine enough for the biggest the shape gets
  const biggest = (node) => Math.max(...[node, ...node.keys].flatMap((k) => k.scale.map(Math.abs)));
  const reach = Math.max(1, [obj, ...tree.chainOf(obj)].reduce((r, node) => r * biggest(node), 1));
  const q = Math.ceil(opts.precision * reach);
  const c1 = hexToRgb(obj.color);
  // the colours its keys give it, each written once: colour 0 is the one it starts with
  const palette = [[c1, obj.color2 ? hexToRgb(obj.color2) : c1]];
  const colourOf = ([a, b]) => {
    const pair = [a.map(Math.round), b.map(Math.round)];
    let at = palette.findIndex((known) => String(known) === String(pair));
    if (at < 0) at = palette.push(pair) - 1;
    return at;
  };
  let hue = false;
  let grow = false;
  const local = localPoints(obj);
  /** The points a piece is for: the ones the object starts with, or those of a shape a key gave it, or the rows of a morph. */
  const pointsOf = (piece) => piece.pts || local;
  /** The fastest any of its particles flies during a piece, in blocks a second. */
  const speedOf = (piece) => (piece.V
    ? pointsOf(piece).reduce((top, l) => Math.max(top, Math.hypot(...applyMatrix(piece.V, l))), 0) + piece.spread : 0) * LIFE_PER_SECOND;
  const pieces = plans.flatMap((plan) => plan.pieces).map((piece) => {
    const life = ageOf(piece.end);
    // (the last number of each of the three rows of a matrix is a place: three decimals are enough for it)
    const matrix = (m) => m.map((v, i) => short(v, (i + 1) % (m.length / 3) === 0 ? 3 : 4));
    let visible = piece.visible;
    if (piece.tint) {
      // its colour is not the one the object starts with, or changes: every stop says which colour it has
      hue = true;
      visible = piece.tint.length > 1
        ? tintedStops(piece).map(([age, value, a, b]) => [age, value, colourOf([a, b])])
        : visible.map(([age, value]) => [age, value, colourOf([piece.tint[0][1], piece.tint[0][2]])]);
    }
    // its size, when that is not the one the object starts with
    let size = null;
    if (piece.size && (n(piece.size[0]) !== o.minSize || n(piece.size[1]) !== o.maxSize)) {
      grow = true;
      size = piece.size[0] === piece.size[1] ? short(piece.size[0], 3) : [short(piece.size[0], 3), short(piece.size[1], 3)];
    }
    const tuple = [short(life, 4), matrix(piece.P)];
    if (piece.V) {
      const v = piece.V.slice();
      if (piece.g) v[7] -= piece.g[1] * piece.ref; // the pull starts when the particle is made, not when it sets off
      tuple.push(matrix(v), stopsOf(visible, life, 3), stopsOf(piece.speed, life, 4));
      if (piece.spread || piece.g) tuple.push(short(piece.spread, 3));
      if (piece.g) tuple.push(short(piece.g[1], 3));
    } else tuple.push('0', stopsOf(visible, life, 3));
    return {
      tuple,
      size,
      set: piece.set || '', // the name of the list of points it is for ('': the ones the object starts with)
      pts: pointsOf(piece),
      // for familiesOf() and rushOf(): the ages it is seen from and to, their sum (what the code sorts by) and its speed
      show: piece.show,
      end: piece.end,
      stretch: `${piece.show.toFixed(4)} ${piece.end.toFixed(4)}`,
      moment: Number((piece.show + piece.end).toFixed(4)),
      speed: speedOf(piece),
    };
  });
  // Latest piece first: the order in which the code plays them anyway (see the
  // top of the file). Written this way round the list is nearly in order when
  // it is sorted, and the code is the same as it was before the list.
  pieces.reverse();
  // One T(...) for every list of points. The rows of a morph are places in
  // blocks already, the way the group around the object sees them: they are
  // stored fine enough for the biggest that group makes them.
  const around = Math.max(1, tree.chainOf(obj).reduce((r, node) => r * biggest(node), 1));
  const sets = [];
  for (const piece of pieces) {
    let set = sets.find((known) => known.name === piece.set);
    if (!set) {
      const stride = piece.pts.length ? piece.pts[0].length : 3;
      const fine = stride === 6 ? Math.ceil(opts.precision * around) : q;
      set = {
        name: piece.set, stride, q: fine, pieces: [],
        points: piece.pts.flatMap((l) => l.map((v) => Math.round(v * fine) + 0)),
      };
      sets.push(set);
    }
    set.pieces.push(piece);
  }
  return {
    texture: obj.texture, c1, c2: palette[0][1], palette, o, darken: obj.blend === 0, hue, grow,
    pieces, sets,
  };
}

/**
 * Which objects with timing are made together: a number for each, the same
 * number for the same family (see the top of the file). `leaves` and `timed`
 * (what timedOf() gave for each) are in the order of the list.
 *   - What is in a group that has timing of its own (keys, a start, repeats)
 *     moves with it: one family, counted from the outermost such group.
 *   - Objects that fly the very same stretches at the very same moments (the
 *     same keys, as after "Copy keys") are one family too, grouped or not.
 * Everything else is a family of its own.
 * The families are made in the order of time as well, the latest first: each
 * lies where the middle of the time it is seen lies. What follows on something
 * (a splash where a group lands) is then made right before the last pieces of
 * what it follows, and what goes before it (a flash where it sets off) right
 * after its first ones.
 * The numbers say that order: the smaller number is made first. The family
 * with the most objects is number 0, which the code does not have to write;
 * what is made before it counts down from it (-1, -2), what is made after it
 * counts up.
 */
function familiesOf(tree, leaves, timed) {
  const boss = new Map();
  const find = (x) => {
    while (boss.has(x) && boss.get(x) !== x) x = boss.get(x);
    return x;
  };
  const join = (a, b) => { boss.set(find(a), find(b)); };
  const seeds = leaves.map((leaf) => {
    const around = tree.chainOf(leaf).filter((g) => g.keys.length || g.start > 0 || g.repeat > 1);
    return around.length ? around[around.length - 1].id : leaf.id;
  });
  for (const seed of seeds) if (!boss.has(seed)) boss.set(seed, seed);
  const first = new Map(); // a stretch of time in which something flies -> the family that flew then first
  timed.forEach((t, i) => {
    for (const piece of t.pieces) {
      if (!(piece.speed > 0)) continue;
      if (first.has(piece.stretch)) join(seeds[i], first.get(piece.stretch));
      else first.set(piece.stretch, seeds[i]);
    }
  });
  const roots = seeds.map(find);
  if (!roots.length) return [];
  // every family, in the order in which they come up in the list: how many objects, and the ages it is seen from and to
  const facts = new Map();
  roots.forEach((root, i) => {
    const f = facts.get(root) || { root, size: 0, from: Infinity, to: -Infinity };
    f.size++;
    for (const piece of timed[i].pieces) {
      f.from = Math.min(f.from, piece.show);
      f.to = Math.max(f.to, piece.end);
    }
    facts.set(root, f);
  });
  const list = [...facts.values()];
  const middle = (f) => (f.to >= f.from ? Number((f.from + f.to).toFixed(4)) : 0); // (twice the middle)
  // the latest first; with the same middle, as they come up in the list
  const order = list.slice().sort((a, b) => middle(b) - middle(a));
  // (of several that are as big, the one that comes up first in the list)
  const biggest = list.reduce((best, f) => (f.size > best.size ? f : best));
  const zero = order.indexOf(biggest);
  const numbers = new Map(order.map((f, n) => [f.root, n - zero]));
  return roots.map((root) => numbers.get(root));
}

/**
 * How much of the scene is on its way at the same moment, and how fast: what
 * decides how far out of step things can get in the game (see the top of the
 * file). The particles of one moment of one family are made one after the
 * other, so the last of them starts later than the first by the time the game
 * needs for all of them; at speed, that time is a distance.
 * Returns { particles, speed } for the moment at which particles times speed
 * (blocks a second) is largest, or null when nothing with timing moves.
 */
function rushOf(timed) {
  const moments = new Map();
  for (const t of timed) {
    for (const piece of t.pieces) {
      const key = `${t.family} ${piece.moment}`;
      const m = moments.get(key) || { particles: 0, speed: 0 };
      m.particles += piece.pts.length;
      m.speed = Math.max(m.speed, piece.speed);
      moments.set(key, m);
    }
  }
  let worst = null;
  for (const m of moments.values()) {
    if (m.speed > 0 && (!worst || m.particles * m.speed > worst.particles * worst.speed)) worst = m;
  }
  return worst && { particles: worst.particles, speed: Number(worst.speed.toFixed(2)) };
}

/**
 * The pieces of an object as they are written. When a key changes a size
 * somewhere in the scene (`grow`), every piece has a place for its size right
 * after its visibility; the pieces at the end of a tuple that are not needed
 * are left out.
 */
function tuplesOf(set, grow) {
  return set.pieces.map(({ tuple, size }) => {
    if (!grow) return tuple;
    const out = [...tuple.slice(0, 4), size || '0', ...tuple.slice(4)];
    if (out.length === 5 && !size) out.pop();
    return out;
  });
}

/** Lines of one T(...) call for some of the points of one of the lists of an object (`set`) and some of its pieces. */
function timedCallLines(t, set, points, table, width, hue, helper) {
  // with colours that change, both colours are lists: one entry for each colour its keys give it
  const colours = (at) => {
    if (!hue) return [`${lit(t.palette[0][at])},`];
    const tokens = t.palette.map((pair) => `${lit(pair[at])},`);
    tokens[0] = `[${tokens[0]}`;
    tokens[tokens.length - 1] = tokens[tokens.length - 1].replace(/,$/, '],');
    return tokens;
  };
  const head = [`T(${lit(t.texture)},`, ...colours(0), ...colours(1), `${lit(t.o)},`, `${set.q}, [`];
  const lines = pack(head, width - 2).map((l, i) => (i ? '  ' : '') + l);
  lines.push(...pack(points.map((v) => `${v},`), width, '', ''));
  // after the pieces: 1 for an object that is hidden by darkening, then the number of its family; none when they are 0
  const tail = [];
  if (helper.darken) tail.push(t.darken ? 1 : 0);
  if (helper.families) tail.push(t.family);
  while (tail.length && !tail[tail.length - 1]) tail.pop();
  lines.push('], [', ...table, `]${tail.map((v) => `, ${v}`).join('')})`);
  return lines;
}

const tableLines = (pieces, width) => pack(pieces.flatMap((piece) => {
  const tokens = tokensOf(piece);
  tokens[tokens.length - 1] += ',';
  return tokens;
}), width, '', '');

/** Lines of one P(...) call. `data` is a slice of the group's numbers. */
function callLines(group, base, data, width) {
  const s = group.style;
  const head = [`P(${lit(s.texture)},`, `${lit(s.c1)},`, `${lit(s.c2)},`, `${s.fade},`];
  const o = overridesOf(group, base);
  const oneLine = `${head.join(' ')} ${lit(o)}, [`;
  let lines;
  if (oneLine.length <= width) lines = [oneLine];
  else {
    lines = pack(head, width - 2).map((l, i) => (i ? '  ' : '') + l);
    const entries = Object.keys(o).map((k) => `${k}: ${lit(o[k])},`);
    if (!entries.length) lines.push('  {}, [');
    else lines.push('  {', ...pack(entries, width, '    '), '  }, [');
  }
  lines.push(...pack(data.map((v) => `${v},`), width, '', ''));
  lines.push(s.expand ? `], ${lit(s.expand)})` : '])');
  return lines;
}

const sizeOf = (lines) => lines.reduce((n, l) => n + l.length + 1, 0);

/** The parameters of a function, cut at the commas between them (not at those inside [a, b]). */
function splitParams(text) {
  const out = [''];
  let depth = 0;
  for (const ch of text) {
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (ch === ',' && !depth) out.push('');
    else out[out.length - 1] += ch;
  }
  return out;
}

/**
 * What the studio writes in TypeScript asks the game through this name, which
 * has no type. The game checks the types of World Code (index.ts), and its own
 * types for `api` are stricter than its documentation says: so no type of the
 * game's can hold up what the studio wrote. Code the user writes uses `api`.
 */
export const UNTYPED_API = 'psApi';
export const UNTYPED_API_LINES = [
  `// ${UNTYPED_API}: the game, asked without types, so that the types of the game`,
  '// never hold up what the studio wrote. Your own code uses api.',
  `const ${UNTYPED_API}: any = api`,
];

/** Change a line of code with what is in quotes put aside: no text that was typed by the user is touched. */
export function outsideTexts(line, change) {
  const kept = [];
  const bare = line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, (text) => `\u0002${kept.push(text) - 1}\u0002`);
  return change(bare).replace(/\u0002(\d+)\u0002/g, (all, i) => kept[Number(i)]);
}

/**
 * A line of the helpers the way TypeScript takes it when it is strict: every
 * parameter says that it can be anything, and so do the list and the options
 * that are filled bit by bit. (World Code can be TypeScript: index.ts.)
 * The parameters of a helper itself can also be left out: P(...) and T(...)
 * are called without their last ones when those have nothing to say.
 * The game is asked through UNTYPED_API. Comments and texts stay as they are.
 */
export function typedLine(line) {
  if (/^\s*\/\//.test(line)) return line;
  const helper = /^\s*const [A-Za-z_$][\w$]* = \(/.test(line);
  let seen = 0;
  return outsideTexts(line, (code) => code
    .replace(/\(([^()]*)\)(\s*=>)/g, (all, params, arrow) => {
      const own = helper && !seen++; // the first list of a line that names a helper: its own parameters
      return `(${splitParams(params)
        .map((p) => (!p.trim() || p.includes('=') || p.includes(':') ? p : `${p}${own && !p.includes('[') ? '?' : ''}: any`)).join(',')})${arrow}`;
    })
    .replace(/(^|[^\w$.])api\./g, `$1${UNTYPED_API}.`)
    .replace(/^(\s*const Q) = \[\]$/, '$1: any[] = []')
    .replace(/^(\s*const q) = \{/, '$1: any = {'));
}

/**
 * The start of the function that plays the scene (target 'function'): the
 * place, and the way it is turned. In TypeScript the lists it works with can
 * be anything: with strict settings a number out of a list counts as "maybe
 * not there", and the sums would be refused.
 */
const functionLines = (name, typed) => {
  const any = typed ? ': any' : '';
  return [
    ...(typed ? UNTYPED_API_LINES : []),
    typed ? `const ${name} = (pos: number[], facing?: number[] | null) => {` : `const ${name} = (pos, facing) => {`,
    `const [X, Y, Z]${any} = pos`,
    // R: where right, up and ahead of the scene point in the game
    `let R${any} = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]`,
    'if (facing && Math.hypot(...facing) > 1e-6) {',
    '  const far = Math.hypot(...facing)',
    `  const ahead${any} = facing.map((v${any}) => v / far)`,
    '  const flat = Math.hypot(ahead[0], ahead[2])',
    `  const side${any} = flat > 1e-6`,
    '    ? [ahead[2] / flat, 0, -ahead[0] / flat] : [1, 0, 0]',
    '  R = [side, [',
    '    ahead[1] * side[2] - ahead[2] * side[1],',
    '    ahead[2] * side[0] - ahead[0] * side[2],',
    '    ahead[0] * side[1] - ahead[1] * side[0],',
    '  ], ahead]',
    '}',
    `const W = (v${any}) => [0, 1, 2].map((j${any}) =>`,
    '  v[0] * R[0][j] + v[1] * R[1][j] + v[2] * R[2][j])',
  ];
};

/**
 * objects : scene objects
 * opts    : { precision, hideDist, target: 'block' | 'world' | 'function', worldPos, maxChars, maxLines, width,
 *             name (of the function, target 'function'), typed (TypeScript, target 'function') }
 * returns : { parts: [{ code, chars, lines, particles }], particles, groups, seconds, rush, families }
 *           rush     : see rushOf(); what moves fast and all at the same moment
 *           families : { id of an object with timing: the number of its family }, see familiesOf()
 */
export function generateCode(objects, options = {}) {
  const opts = {
    precision: 100,
    hideDist: 0,
    target: 'block',
    worldPos: [0, 0, 0],
    maxChars: LIMITS.chars,
    maxLines: LIMITS.lines,
    width: LIMITS.width,
    ...options,
  };
  opts.hideDist = Number(opts.hideDist) > 0 ? Number(fmt(opts.hideDist)) : 0;
  if (!(opts.precision > 0)) opts.precision = 100;
  const world = opts.target === 'world';
  const asFunction = opts.target === 'function'; // see the top of the file
  const name = /^[A-Za-z_$][\w$]*$/.test(opts.name || '') ? opts.name : 'psPlay';
  const tree = sceneTree(objects);
  const groups = buildGroups(tree, opts);
  const timedLeaves = tree.leaves().filter((o) => !tree.plain(o));
  const timed = timedLeaves.map((o) => timedOf(o, tree, opts));
  const families = {}; // the id of every object with timing -> the number of its family
  familiesOf(tree, timedLeaves, timed).forEach((number, i) => {
    timed[i].family = number;
    families[timedLeaves[i].id] = number;
  });
  const base = buildBase(groups);
  const useExpand = groups.some((g) => g.style.expand);
  const useMixFade = groups.some((g) => g.style.fade && String(g.style.c1) !== String(g.style.c2));
  const hue = timed.some((t) => t.hue);
  const grow = timed.some((t) => t.grow);
  const helpers = {
    plain: groups.length > 0 || !timed.length,
    timed: timed.length ? {
      mix: timed.some((t) => t.palette.some((pair) => String(pair[0]) !== String(pair[1]))),
      sizes: timed.some((t) => t.o.minSize !== t.o.maxSize),
      darken: timed.some((t) => t.darken),
      hue,
      grow,
      families: timed.some((t) => t.family !== 0),
      wide: timed.some((t) => t.sets.some((set) => set.stride === 6)),
    } : null,
  };
  const seconds = sceneDuration(objects);
  // World Code has no line limit and is never split.
  const budgetChars = world || asFunction ? Infinity : opts.maxChars;
  const budgetLines = world || asFunction ? Infinity : opts.maxLines;

  // What goes into the code, as "units" that can be cut between two particles
  // (or, with timing, between two points of the shape).
  const units = groups.map((g) => ({
    atoms: g.data.length / 3,
    per: 1,
    lines: (from, take) => callLines(g, base, g.data.slice(from * 3, (from + take) * 3), opts.width),
  }));
  for (const [t, set] of timed.flatMap((t) => t.sets.map((set) => [t, set]))) {
    // A table of pieces that would fill most of a code block on its own is
    // cut into runs; every run comes with the points again.
    const runs = [];
    let run = [];
    for (const piece of tuplesOf(set, grow)) {
      const lines = tableLines([...run, piece], opts.width);
      if (run.length && (sizeOf(lines) > budgetChars * 0.45 || lines.length > budgetLines * 0.45)) {
        runs.push(run);
        run = [];
      }
      run.push(piece);
    }
    runs.push(run);
    for (const pieces of runs) {
      const table = tableLines(pieces, opts.width);
      units.push({
        atoms: set.points.length / set.stride,
        per: pieces.length,
        lines: (from, take) => timedCallLines(
          t, set, set.points.slice(from * set.stride, (from + take) * set.stride), table, opts.width, hue, helpers.timed),
      });
    }
  }
  const particles = units.reduce((n, u) => n + u.atoms * u.per, 0);
  const play = timed.length ? PLAY_LINES : [];
  const footer = world
    ? [...play, '}', 'let psWait = 0', 'tick = (ms) => {', '  psWait -= ms', '  if (psWait > 0) return',
      '  psWait = PS_EVERY', '  psDraw()', '}', '}']
    : asFunction ? [...play, '}'].map((line) => (opts.typed ? typedLine(line) : line)) : play;

  const makePrelude = (index, total) => {
    const n = `${particles} particle${particles === 1 ? '' : 's'}`;
    const lines = [];
    if (asFunction) {
      lines.push(
        `// Bloxd Particle Studio: ${n}.`,
        `// ${name}(pos, facing) plays them. pos: where the middle of the floor`,
        '// of the studio\'s code block goes. facing (optional): the scene is',
        '// turned so that what points along +Z in the studio points this way.',
      );
      const made = [...lines, ...preludeLines({
        base, precision: opts.precision, width: opts.width, useExpand, useMixFade, turn: true,
        anchor: functionLines(name, !!opts.typed), ...helpers,
      })];
      return opts.typed ? made.map(typedLine) : made;
    }
    if (world) {
      const [x, y, z] = opts.worldPos.map((v) => Number(fmt(v)));
      lines.push(
        `// Bloxd Particle Studio: ${n}, World Code (F8)`,
        '// PS_POS is where the scene goes: the corner of the block the',
        '// studio shows as the code block. PS_EVERY is the pause between',
        '// redraws in milliseconds. If you already have a tick callback,',
        '// move the body of the tick below into it.',
        '{',
        `const PS_POS = [${x}, ${y}, ${z}]`,
        `const PS_EVERY = ${Math.max(50, Math.round(seconds * 1000))}`,
      );
    } else if (total > 1) {
      lines.push(
        `// Bloxd Particle Studio: ${n}, code block ${index + 1} of ${total}`,
        index ? `// This code block goes directly on top of block ${index}.`
          : '// The other code blocks are stacked on top of this one, in order.',
      );
    } else {
      lines.push(`// Bloxd Particle Studio: ${n}. Click the block to play.`);
    }
    const anchor = world ? 'const [X, Y, Z] = PS_POS'
      : index ? `const [X, Y, Z] = [thisPos[0], thisPos[1] - ${index}, thisPos[2]]`
        : 'const [X, Y, Z] = thisPos';
    lines.push(...preludeLines({
      base, precision: opts.precision, width: opts.width, useExpand, useMixFade, anchor, ...helpers,
    }));
    if (world) lines.push('const psDraw = () => {');
    return lines;
  };

  // Fill parts greedily; a unit that does not fit continues in the next part.
  const build = (total) => {
    const parts = [];
    let lines = makePrelude(0, total);
    let count = 0;
    const flush = () => {
      const all = [...lines, ...footer];
      parts.push({ code: all.join('\n'), chars: all.join('\n').length, lines: all.length, particles: count });
      lines = makePrelude(parts.length, total);
      count = 0;
    };
    for (const unit of units) {
      let from = 0;
      while (from < unit.atoms) {
        const fits = (take) => {
          const extra = unit.lines(from, take);
          return sizeOf(lines) + sizeOf(extra) + sizeOf(footer) <= budgetChars
            && lines.length + extra.length + footer.length <= budgetLines;
        };
        const all = unit.atoms - from;
        let take = all;
        if (!fits(all)) {
          // largest number of particles that still fits (binary search)
          let lo = 0, hi = all;
          while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            if (fits(mid)) lo = mid; else hi = mid - 1;
          }
          take = lo;
        }
        if (take === 0) {
          if (count === 0) take = 1; // limits too small to be useful: emit anyway
          else { flush(); continue; }
        }
        lines.push(...unit.lines(from, take));
        count += take * unit.per;
        from += take;
        if (from < unit.atoms) flush();
      }
    }
    if (count || !parts.length) flush();
    return parts;
  };

  // The header mentions the number of parts, so settle on it first.
  let total = 1;
  let parts = build(total);
  for (let guard = 0; guard < 6 && parts.length !== total; guard++) {
    total = parts.length;
    parts = build(total);
  }
  return { parts, particles, groups: groups.length + timed.length, seconds, rush: rushOf(timed), families };
}
