// Turns a scene into JavaScript for a Bloxd code block (or World Code).
// Pure module (no DOM) so the Node tests can run the generated code.
//
// Every particle is one api.playParticleEffect call that emits exactly one
// particle at an exact position (pos1 === pos2, manualEmitCount 1). The game
// reads every field of the options on the client, so the generated code always
// sends the complete set of fields from the official example.

import { objectPoints, hexToRgb, isMoving, LIFE_PER_SECOND, FADE_START } from './scene.js';

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
    if (obj.hidden) continue;
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

function preludeLines({ base, precision, width, useExpand, useMixFade, anchor }) {
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
    `const P = (texture, a, b, f, o, d${useExpand ? ', e' : ''}) => {`,
  ];
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
  const particles = groups.reduce((n, g) => n + g.data.length / 3, 0);
  const base = buildBase(groups);
  const useExpand = groups.some((g) => g.style.expand);
  const useMixFade = groups.some((g) => g.style.fade && String(g.style.c1) !== String(g.style.c2));
  const life = objects.reduce((m, o) => (o.hidden ? m : Math.max(m, o.life)), 0);
  const seconds = life / LIFE_PER_SECOND;
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
    lines.push(...preludeLines({ base, precision: opts.precision, width: opts.width, useExpand, useMixFade, anchor }));
    if (world) lines.push('const psDraw = () => {');
    return lines;
  };

  // Fill parts greedily; a group that does not fit continues in the next part.
  // World Code has no line limit and is never split.
  const budgetChars = world ? Infinity : opts.maxChars;
  const budgetLines = world ? Infinity : opts.maxLines;
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
    for (const group of groups) {
      let rest = group.data;
      while (rest.length) {
        const fits = (take) => {
          const extra = callLines(group, base, rest.slice(0, take * 3), opts.width);
          return sizeOf(lines) + sizeOf(extra) + sizeOf(footer) <= budgetChars
            && lines.length + extra.length + footer.length <= budgetLines;
        };
        const all = rest.length / 3;
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
        lines.push(...callLines(group, base, rest.slice(0, take * 3), opts.width));
        count += take;
        rest = rest.slice(take * 3);
        if (rest.length) flush();
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
  return { parts, particles, groups: groups.length, seconds };
}
