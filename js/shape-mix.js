// Families of shapes that are put together by rule: a monster from a body,
// eyes, a mouth, something on its head, arms and legs; a robot from a head, a
// chest and what it moves on; a sword from a blade, a guard and a pommel.
//
// Every feature has a few variants, and member number k of a family takes
// variant (k mod how many there are) of each feature. The numbers of variants
// share no divisor, so no two members are put together the same way, and
// from one member to the next every feature changes: the first dozen members
// show every variant there is. A family is never so big that two of its
// members differ in one feature only.
//
// The members are numbered, and a number means the same shape for ever: saved
// scenes and share links ask for a shape by its id. So a family only grows at
// its end, and a variant is never changed or taken out once it is published
// (tests/shape-digests.json notices).

import { drawnShape, parsePath, joinDrawings, placeDrawing, RAD } from './shape-kit.js';

// ---------------------------------------------------------------- writing drawings

/** A number as it is written in a drawing. */
export const num = (v) => String(Math.round(v * 1000) / 1000 || 0);
export const at = (x, y) => `${num(x)},${num(y)}`;
/** A stroke through points [[x, y], ...]. */
export const path = (...points) => `M${points.map(([x, y]) => at(x, y)).join(' L')}`;
export const closed = (...points) => `${path(...points)} Z`;
export const circle = (x, y, r) => `O${at(x, y)} ${num(r)}`;
/** An oval; its first particle is where the angle `first` (degrees) points. ("N" lifts the pen: an arc carries on from where the pen is.) */
export const oval = (x, y, rx, ry, first = 90) => `N E${at(x, y)} ${num(rx)} ${num(ry)} ${num(first)} ${num(first + 360)}`;
/** An arc around (x, y) from the angle a0 to a1 (degrees), on its own. */
export const arc = (x, y, r, a0, a1) => `N A${at(x, y)} ${num(r)} ${num(a0)} ${num(a1)}`;
export const dot = (x, y) => `D${at(x, y)}`;
export const box = (x0, y0, x1, y1) => closed([x0, y0], [x1, y0], [x1, y1], [x0, y1]);
/** A stroke from a to b that bows out by `bulge` times half its length: to the left of the way it runs when positive. */
export const bow = (a, b, bulge) => `M${at(...a)} B${at(...b)} ${num(-bulge)}`;
/** The same, carrying on from where the pen is. */
export const bowTo = (b, bulge) => `B${at(...b)} ${num(-bulge)}`;
/** A curve from a to b with one handle. */
export const bend = (a, handle, b) => `M${at(...a)} Q${at(...handle)} ${at(...b)}`;
/** A wavy stroke from a to b: `waves` half waves, `high` to each side. */
export function wavy(a, b, waves, high) {
  const long = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = -(b[1] - a[1]) / long;
  const ny = (b[0] - a[0]) / long;
  let d = `M${at(...a)}`;
  for (let i = 0; i < waves; i++) {
    const side = i % 2 ? -1 : 1;
    const m = mid(a, b, (i + 0.5) / waves);
    d += ` Q${at(m[0] + nx * high * 2 * side, m[1] + ny * high * 2 * side)} ${at(...mid(a, b, (i + 1) / waves))}`;
  }
  return d;
}
/** A zigzag from a to b: `teeth` teeth, `high` to the left of the way it runs. */
export function zigzag(a, b, teeth, high) {
  const long = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = -(b[1] - a[1]) / long;
  const ny = (b[0] - a[0]) / long;
  const points = [a];
  for (let i = 0; i < teeth; i++) {
    const m = mid(a, b, (i + 0.5) / teeth);
    points.push([m[0] + nx * high, m[1] + ny * high], mid(a, b, (i + 1) / teeth));
  }
  return points;
}

export const add = ([x, y], dx, dy) => [x + dx, y + dy];
export const mid = (a, b, t = 0.5) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** A point on a circle or an oval, by its angle in degrees. */
export const polar = (cx, cy, r, deg, ry = r) => [cx + r * Math.cos(deg * RAD), cy + ry * Math.sin(deg * RAD)];
/** A closed outline from a rule that gives its point for an angle, a corner every `step` degrees, from the top. */
export const ringOf = (rule, step = 6) => Array.from({ length: Math.round(360 / step) }, (_, i) => rule(90 + i * step));

/** A little ball at the end of a stalk that comes from `from`: the ball starts where the stalk ends. */
export function ball(from, centre, r) {
  const back = Math.atan2(from[1] - centre[1], from[0] - centre[0]);
  const end = [centre[0] + r * Math.cos(back), centre[1] + r * Math.sin(back)];
  return `${path(from, end)} ${oval(centre[0], centre[1], r, r, back / RAD)}`;
}

/** A whole drawing: what is drawn on the right and mirrored to the left, and what stands in the middle. */
export const mirrored = (sides, middle) => `${sides.flat().filter(Boolean).join(' ')} | ${middle.flat().filter(Boolean).join(' ')}`;

/** Several parts as one drawing: each is the text of a drawing, or a drawing. */
export const joined = (...parts) => joinDrawings(...parts.flat().filter(Boolean).map((part) => (typeof part === 'string' ? parsePath(part) : part)));
/** A drawing (or its text) moved, turned (degrees) and resized: { x, y, size, turn }. */
export const placed = (d, where) => placeDrawing(typeof d === 'string' ? parsePath(d) : d, where);
/** A drawing made smaller or bigger around a point of its own. */
export const resized = (d, [cx, cy], size) => placed(d, { x: cx * (1 - size), y: cy * (1 - size), size });

/** A star with `k` points around (cx, cy), the first one pointing where `first` (degrees) says. */
export const star = (cx, cy, k, out, inn, first = 90) => closed(...Array.from({ length: 2 * k }, (_, i) => polar(cx, cy, i % 2 ? inn : out, first + (180 * i) / k)));
/** A little heart, its point at the bottom, 2w wide. */
export const heart = (cx, cy, w) => `${path([cx, cy - w], [cx - w, cy + 0.13 * w])} ${bowTo([cx, cy + 0.4 * w], 0.9)} ${bowTo([cx + w, cy + 0.13 * w], 0.9)} Z`;
/** A sparkle: a little cross. */
export const sparkle = (x, y, r = 0.7) => `${path([x - r, y], [x + r, y])} ${path([x, y - r], [x, y + r])}`;
/** A little diamond. */
export const diamond = (x, y, w, h = w) => closed([x, y + h], [x + w, y], [x, y - h], [x - w, y]);
/** A box with rounded corners around (cx, cy), w and h from the middle to the edge. */
export const roundedBox = (cx, cy, w, h, r) => `${path([cx - w + r, cy + h], [cx + w - r, cy + h])} ${bowTo([cx + w, cy + h - r], 0.4142)} L${at(cx + w, cy - h + r)} ${bowTo([cx + w - r, cy - h], 0.4142)} `
  + `L${at(cx - w + r, cy - h)} ${bowTo([cx - w, cy - h + r], 0.4142)} L${at(cx - w, cy + h - r)} ${bowTo([cx - w + r, cy + h], 0.4142)}`;
/** The same point on the other side. */
export const left = ([x, y]) => [-x, y];
/** How far a row of corners reaches from `c` in the direction `deg`, and a point `more` beyond that. */
export const reach = (points, [cx, cy], deg) => Math.max(...points.map(([x, y]) => (x - cx) * Math.cos(deg * RAD) + (y - cy) * Math.sin(deg * RAD)));
export const beyond = (points, c, deg, more) => polar(c[0], c[1], reach(points, c, deg) + more, deg);

// ---------------------------------------------------------------- where a stroke meets an outline

/**
 * An outline that other strokes are fastened to. Arms, horns and legs start
 * exactly on it: where it is cut by an upright or a level line.
 */
export function outline(d) {
  const polys = (typeof d === 'string' ? parsePath(d) : d).polys;
  const cuts = (axis, v) => {
    const other = 1 - axis;
    const found = [];
    for (const poly of polys) {
      for (let i = 1; i < poly.length; i++) {
        const p = poly[i - 1];
        const q = poly[i];
        if ((p[axis] - v) * (q[axis] - v) > 0 || p[axis] === q[axis]) continue;
        found.push(p[other] + ((v - p[axis]) / (q[axis] - p[axis])) * (q[other] - p[other]));
      }
    }
    if (!found.length) throw new Error(`Outline "${String(d).slice(0, 40)}..." is not cut at ${axis ? 'y' : 'x'} = ${v}`);
    return found;
  };
  return {
    d,
    /** The point of the outline straight above x: its top there. */
    top: (x) => [x, Math.max(...cuts(0, x))],
    bottom: (x) => [x, Math.min(...cuts(0, x))],
    /** Its right edge at the height y. */
    right: (y) => [Math.max(...cuts(1, y)), y],
    /** Where a ray from (cx, cy) leaves the outline for good, by its angle in degrees. */
    out: (deg, cx = 0, cy = 0) => {
      const ux = Math.cos(deg * RAD);
      const uy = Math.sin(deg * RAD);
      let far = -1;
      for (const poly of polys) {
        for (let i = 1; i < poly.length; i++) {
          const [px, py] = poly[i - 1];
          const ex = poly[i][0] - px;
          const ey = poly[i][1] - py;
          const den = ux * ey - uy * ex;
          if (Math.abs(den) < 1e-12) continue;
          const along = ((px - cx) * ey - (py - cy) * ex) / den;
          const on = ((px - cx) * uy - (py - cy) * ux) / den;
          if (along > far && on >= -1e-9 && on <= 1 + 1e-9) far = along;
        }
      }
      if (far < 0) throw new Error(`Outline "${String(d).slice(0, 40)}..." is not cut by a ray at ${deg} degrees`);
      return [cx + ux * far, cy + uy * far];
    },
  };
}

const outlines = new Map();
/** The same, worked out once for each outline. */
export const edgeOf = (d) => outlines.get(d) || outlines.set(d, outline(d)).get(d);

// ---------------------------------------------------------------- families

const divisor = (a, b) => (b ? divisor(b, a % b) : a);

/**
 * Which variant of each feature the members of a family have: member k (from 0) takes variant (k + first) % size.
 * As no two sizes share a divisor, no two members are alike; as there are no more members than `count` allows,
 * any two of them differ in two features or more.
 */
export function deal({ sizes, first = [], count, where = 'a family' }) {
  sizes.forEach((a, i) => sizes.forEach((b, j) => {
    if (i < j && divisor(a, b) !== 1) throw new Error(`Family in ${where}: features with ${a} and ${b} variants would repeat`);
  }));
  const all = sizes.reduce((product, n) => product * n, 1);
  if (count > (sizes.length > 1 ? all / Math.max(...sizes) : all)) throw new Error(`Family in ${where}: with ${count} members, two would differ in one feature only`);
  return Array.from({ length: count }, (_, k) => sizes.map((n, j) => (k + (first[j] || 0)) % n));
}

/**
 * The shapes of a family.
 *   sizes   how many variants each feature has (no two of these numbers may share a divisor)
 *   first   the variants of member 1, when they should not all be the first ones
 *   count   how many members
 *   make    (variants, number) => { id, name, sub, tags, draw } for a member; `draw` gives its drawing when it is asked for
 * `spacing` is how far apart the particles of a member are at first (in the -1..1 box), and `turn` how many degrees
 * its drawing is turned (a sword is drawn upright and shown slanting).
 *
 * A family that people use keeps its lists as they are: with one more variant in a list, every member after the
 * first few would get other parts, and a saved scene names a member by its number. More shapes are a new family.
 */
export function family({ cat, sizes, first = [], count, make, spacing, turn }) {
  return deal({ sizes, first, count, where: cat }).map((variants, k) => {
    const { id, name, sub, tags, draw } = make(variants, k + 1);
    // which variant of each feature it has: not listed with the shape's own fields (the tests read it)
    return Object.defineProperty(drawnShape({ id, name, cat, sub, tags, draw, spacing, turn }), 'variants', { value: variants });
  });
}
