// Turns a scene into JavaScript for a Bloxd code block (or World Code).
// Pure module (no DOM) so the Node tests can run the generated code.
//
// Every particle is one api.playParticleEffect call that emits exactly one
// particle at an exact position (pos1 === pos2, manualEmitCount 1). The game
// reads every field of the options on the client, so the generated code always
// sends the complete set of fields from the official example.
//
// Objects without timing are written the short way: P(...) with one position
// per particle. Objects with timing (they appear later, fade in or have keys)
// are written as T(...): the points of the shape once, and a table of "pieces"
// (js/motion.js) that says what the particles of every point do over time.

import { objectPoints, localPoints, hexToRgb, isMoving, sceneDuration, FADE_START } from './scene.js';
import { planOf, isPlain } from './motion.js';

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
function buildGroups(objects, opts) {
  const groups = [];
  const byKey = new Map();
  for (const obj of objects) {
    if (obj.hidden || !isPlain(obj)) continue;
    const style = styleOf(obj, opts.hideDist);
    const key = styleKey(style);
    let group = byKey.get(key);
    if (!group) {
      group = { style, data: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    for (const p of objectPoints(obj)) {
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

function preludeLines({ base, precision, width, useExpand, useMixFade, anchor, plain, timed }) {
  const q = precision;
  const entries = Object.keys(base).map((k) => `${k}: ${lit(base[k])},`);
  const lines = [
    anchor,
    'const B = {',
    ...pack(entries, width, '  '),
    '  velocityGradients: [{ timeFraction: 0, factor: 1, factor2: 1 }],',
    '}',
    'const G = (t, a, b, o) =>',
    '  ({ timeFraction: t, minColor: a.concat(o), maxColor: b.concat(o) })',
  ];
  if (timed) lines.push(...timedHelperLines(timed));
  if (!plain) return lines;
  lines.push(`const P = (texture, a, b, f, o, d${useExpand ? ', e' : ''}) => {`);
  const position = `    const p = [X + d[i] / ${q}, Y + d[i + 1] / ${q}, Z + d[i + 2] / ${q}]`;
  if (useMixFade) {
    // The game picks a new random colour at every step of a gradient, so a
    // fading particle with two colours would drift between them. Picking the
    // colour here keeps each particle in one colour, like the studio shows.
    lines.push(
      '  for (let i = 0; i < d.length; i += 3) {',
      position,
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
      position,
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
  lines.push('    api.playParticleEffect(Object.assign({}, B, o, q))', '  }', '}');
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
 * Every point gets one game particle per piece. All of them are made at once;
 * each stays unseen until its time has come.
 */
function timedHelperLines({ mix, sizes, darken }) {
  const c = mix ? 'c' : 'a';
  const lines = [
    `const T = (texture, a, b, o, q, d, s${darken ? ', h' : ''}) => {`,
    '  for (let i = 0; i < d.length; i += 3) {',
  ];
  // one colour and one size per point: all its pieces have to look the same
  if (mix) lines.push('    const k = Math.random()', '    const c = a.map((v, j) => Math.round(v + (b[j] - v) * k))');
  if (sizes) lines.push('    const z = o.minSize + (o.maxSize - o.minSize) * Math.random()');
  if (darken) {
    // blend mode 0 ignores alpha: there a particle is hidden by turning it black
    lines.push(
      '    const C = (t, x) => {',
      `      const e = h ? ${c}.map((y) => Math.round(y * x)) : ${c}`,
      '      return G(t, e, e, h ? 1 : x)',
      '    }',
    );
  }
  lines.push(
    '    for (const [n, m, v, w, f, r, g] of s) {',
    '      const at = (e) => [0, 4, 8].map((j) => e[j + 3] + (e[j] * d[i]',
    '        + e[j + 1] * d[i + 1] + e[j + 2] * d[i + 2]) / q)',
    '      const p = at(m).map((x, j) => x + [X, Y, Z][j])',
    '      const u = v ? at(v) : [0, 1, 0]',
    '      api.playParticleEffect(Object.assign({}, B, o, {',
    `        texture, pos1: p, pos2: p,${sizes ? ' minSize: z, maxSize: z,' : ''}`,
    '        dir1: u.map((x) => x - (r || 0)),',
    '        dir2: u.map((x) => x + (r || 0)),',
    '        minEmitPower: v ? 1 : 0, maxEmitPower: v ? 1 : 0,',
    '        minLifeTime: n, maxLifeTime: n, gravity: [0, g || 0, 0],',
    darken ? '        colorGradients: w.map(([t, x]) => C(t, x)),'
      : `        colorGradients: w.map(([t, x]) => G(t, ${c}, ${c}, x)),`,
    '        velocityGradients: (f || [[0, 1]]).map(([t, x]) =>',
    '          ({ timeFraction: t, factor: x, factor2: x })),',
    '      }))',
    '    }',
    '  }',
    '}',
  );
  return lines;
}

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
  const out = curve.map(([age, value]) => [
    Math.min(1, Math.floor((ageOf(age) / life) * 1e6 + 1e-6) / 1e6),
    Number(Number(value).toFixed(digits)) + 0,
  ]);
  for (let i = out.length - 2; i >= 0; i--) {
    if (out[i][0] >= out[i + 1][0]) out[i][0] = Math.max(0, Math.round(out[i + 1][0] * 1e6 - 1) / 1e6);
  }
  // (two stops at 0 can only come from a change in the very first moment: the later one counts)
  while (out.length > 1 && out[1][0] <= 0) out.shift();
  return out.map(([t, x]) => [short(t, 6), short(x, digits)]);
}

/** Everything the code needs to know about one object with timing. */
function timedOf(obj, opts) {
  const plan = planOf(obj);
  const n = (v) => Number(fmt(v));
  const size2 = obj.size2 === null ? obj.size : obj.size2;
  const o = { minSize: n(Math.min(obj.size, size2)), maxSize: n(Math.max(obj.size, size2)), blendMode: obj.blend };
  if (opts.hideDist) o.hideDist = opts.hideDist;
  // points are stored as whole numbers: fine enough for the biggest the shape gets
  const reach = Math.max(1, ...[obj, ...obj.keys].flatMap((k) => k.scale.map(Math.abs)));
  const q = Math.ceil(opts.precision * reach);
  const c1 = hexToRgb(obj.color);
  const pieces = plan.pieces.map((piece) => {
    const life = ageOf(piece.end);
    const matrix = (m) => m.map((v, i) => short(v, i % 4 === 3 ? 3 : 4));
    const tuple = [short(life, 4), matrix(piece.P)];
    if (piece.V) {
      const v = piece.V.slice();
      if (piece.g) v[7] -= piece.g[1] * piece.ref; // the pull starts when the particle is made, not when it sets off
      tuple.push(matrix(v), stopsOf(piece.visible, life, 3), stopsOf(piece.speed, life, 4));
      if (piece.spread || piece.g) tuple.push(short(piece.spread, 3));
      if (piece.g) tuple.push(short(piece.g[1], 3));
    } else tuple.push('0', stopsOf(piece.visible, life, 3));
    return tuple;
  });
  // Latest piece first. Should the game ever make the particles of one click
  // over several frames, a piece then shows up a frame early (unnoticed, it is
  // in the same place as the one before it) instead of a frame late (a blink).
  pieces.reverse();
  return {
    texture: obj.texture, c1, c2: obj.color2 ? hexToRgb(obj.color2) : c1, o, q, darken: obj.blend === 0,
    points: localPoints(obj).flatMap((l) => l.map((v) => Math.round(v * q) + 0)),
    pieces,
  };
}

/** Lines of one T(...) call for some of the points and some of the pieces of an object. */
function timedCallLines(t, points, table, width) {
  const head = [`T(${lit(t.texture)},`, `${lit(t.c1)},`, `${lit(t.c2)},`, `${lit(t.o)},`, `${t.q}, [`];
  const lines = pack(head, width - 2).map((l, i) => (i ? '  ' : '') + l);
  lines.push(...pack(points.map((v) => `${v},`), width, '', ''));
  lines.push('], [', ...table, t.darken ? '], 1)' : '])');
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

/**
 * objects : scene objects
 * opts    : { precision, hideDist, target: 'block' | 'world', worldPos, maxChars, maxLines, width }
 * returns : { parts: [{ code, chars, lines, particles }], particles, groups, seconds }
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
  const world = opts.target === 'world';
  const groups = buildGroups(objects, opts);
  const timed = objects.filter((o) => !o.hidden && !isPlain(o)).map((o) => timedOf(o, opts));
  const base = buildBase(groups);
  const useExpand = groups.some((g) => g.style.expand);
  const useMixFade = groups.some((g) => g.style.fade && String(g.style.c1) !== String(g.style.c2));
  const helpers = {
    plain: groups.length > 0 || !timed.length,
    timed: timed.length ? {
      mix: timed.some((t) => String(t.c1) !== String(t.c2)),
      sizes: timed.some((t) => t.o.minSize !== t.o.maxSize),
      darken: timed.some((t) => t.darken),
    } : null,
  };
  const seconds = sceneDuration(objects);
  // World Code has no line limit and is never split.
  const budgetChars = world ? Infinity : opts.maxChars;
  const budgetLines = world ? Infinity : opts.maxLines;

  // What goes into the code, as "units" that can be cut between two particles
  // (or, with timing, between two points of the shape).
  const units = groups.map((g) => ({
    atoms: g.data.length / 3,
    per: 1,
    lines: (from, take) => callLines(g, base, g.data.slice(from * 3, (from + take) * 3), opts.width),
  }));
  for (const t of timed) {
    // A table of pieces that would fill most of a code block on its own is
    // cut into runs; every run comes with the points again.
    const runs = [];
    let run = [];
    for (const piece of t.pieces) {
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
        atoms: t.points.length / 3,
        per: pieces.length,
        lines: (from, take) => timedCallLines(t, t.points.slice(from * 3, (from + take) * 3), table, opts.width),
      });
    }
  }
  const particles = units.reduce((n, u) => n + u.atoms * u.per, 0);
  const footer = world
    ? ['}', 'let psWait = 0', 'tick = (ms) => {', '  psWait -= ms', '  if (psWait > 0) return',
      '  psWait = PS_EVERY', '  psDraw()', '}', '}']
    : [];

  const makePrelude = (index, total) => {
    const n = `${particles} particle${particles === 1 ? '' : 's'}`;
    const lines = [];
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
  return { parts, particles, groups: groups.length + timed.length, seconds };
}
