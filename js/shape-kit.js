// Toolkit for the shape library: the geometry every shape is built from.
// Pure functions, no dependencies — also used by the Node tests.
//
// Local coordinates: shapes fit in about [-1, 1] on each axis (2 blocks across at
// scale 1). Flat shapes lie in the XY plane (standing up, facing the camera).

export const TAU = Math.PI * 2;
export const GOLDEN = Math.PI * (3 - Math.sqrt(5));
export const RAD = Math.PI / 180;

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const lerp = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** n points evenly spaced (by length) along a polyline. */
export function resample(poly, n, closed = false) {
  if (n <= 0 || !poly.length) return [];
  const pts = closed ? [...poly, poly[0]] : poly;
  if (n === 1 || pts.length === 1) return [pts[0].slice()];
  const seg = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = dist(pts[i], pts[i + 1]);
    seg.push(l);
    total += l;
  }
  const step = total / (closed ? n : n - 1);
  const out = [];
  let si = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const d = Math.min(k * step, total);
    while (si < seg.length - 1 && acc + seg[si] < d - 1e-9) acc += seg[si++];
    const t = seg[si] > 0 ? (d - acc) / seg[si] : 0;
    out.push(lerp(pts[si], pts[si + 1], Math.min(1, Math.max(0, t))));
  }
  return out;
}

/** Share `total` items between weights (largest remainder), exact sum. */
export function apportion(weights, total) {
  const sum = weights.reduce((s, w) => s + w, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  const left = total - out.reduce((s, x) => s + x, 0);
  raw
    .map((r, i) => [r - Math.floor(r), i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .slice(0, left)
    .forEach(([, i]) => out[i]++);
  return out;
}

/** Wireframe: every corner once, the rest spread evenly along the edges. */
export function wire(verts, edges, n) {
  if (n <= verts.length) return verts.slice(0, Math.max(1, n)).map((v) => v.slice());
  const lens = edges.map(([a, b]) => dist(verts[a], verts[b]));
  const k = apportion(lens, n - verts.length);
  const out = verts.map((v) => v.slice());
  edges.forEach(([a, b], i) => {
    for (let j = 1; j <= k[i]; j++) out.push(lerp(verts[a], verts[b], j / (k[i] + 1)));
  });
  return out;
}

export const loopEdges = (count) => Array.from({ length: count }, (_, i) => [i, (i + 1) % count]);

export function polygon(sides, n, radius = 1, inner = null) {
  const verts = [];
  const count = inner ? sides * 2 : sides;
  for (let i = 0; i < count; i++) {
    const r = inner && i % 2 ? radius * inner : radius;
    const a = (TAU * i) / count;
    verts.push([Math.sin(a) * r, Math.cos(a) * r, 0]);
  }
  return wire(verts, loopEdges(count), n);
}

export function curve(fn, n, closed = false, samples = 600) {
  const poly = [];
  const last = closed ? samples : samples + 1;
  for (let i = 0; i < last; i++) poly.push(fn(i / samples));
  return resample(poly, n, closed);
}

export function ring(n, radius, y, phase = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (TAU * i) / n;
    out.push([Math.cos(a) * radius, y, Math.sin(a) * radius]);
  }
  return out;
}

/** A slider of a shape. */
export const P = (key, label, min, max, step, def) => ({ key, label, min, max, step, default: def });

// ---------------------------------------------------------------- more tools

/** A ring standing up in the XY plane, first particle at the top. */
export function flatRing(n, radius, phase = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (TAU * i) / n;
    out.push([Math.sin(a) * radius, Math.cos(a) * radius, 0]);
  }
  return out;
}

export function pathLength(poly) {
  let total = 0;
  for (let i = 1; i < poly.length; i++) total += dist(poly[i - 1], poly[i]);
  return total;
}

/** Remembers the last few results of a builder that depends on slider values. */
export function memo(build, size = 16) {
  const kept = new Map();
  return (...args) => {
    const key = args.join('|');
    if (kept.has(key)) return kept.get(key);
    const value = build(...args);
    kept.set(key, value);
    if (kept.size > size) kept.delete(kept.keys().next().value);
    return value;
  };
}

/** Piecewise curve through [[t, value], ...] that levels off at every stop. */
export function ease(stops, t) {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [t1, v1] = stops[i];
    if (t <= t1) {
      const [t0, v0] = stops[i - 1];
      const k = (1 - Math.cos((Math.PI * (t - t0)) / (t1 - t0))) / 2;
      return v0 + (v1 - v0) * k;
    }
  }
  return stops[stops.length - 1][1];
}

/** Evenly scattered numbers from 0 to 1 that never repeat; axis is 0, 1 or 2. */
const SCATTER = [0.8191725133961645, 0.6710436067037893, 0.5497004779019703];
export const scatter = (i, axis) => (0.5 + (i + 1) * SCATTER[axis]) % 1;

// ---------------------------------------------------------------- nets
//
// A net is how most shapes are stored: `nodes` are the corners, ends and
// crossings (always one particle each) and `chains` are the runs between them
// (polylines from node to node). Extra particles are shared out along the
// chains so the gaps come out as even as possible.

export const makeNet = (nodes, chains) => ({ nodes, chains, lens: chains.map(pathLength) });

/** Net of a wireframe: corners plus straight edges [[a, b], ...]. */
export const wireNet = (verts, edges) => makeNet(verts, edges.map(([a, b]) => [verts[a], verts[b]]));

/** How many particles go inside each run so the spacing is the same everywhere. */
export function share(lens, total) {
  if (total <= 0) return lens.map(() => 0);
  let active = lens.map((_, i) => i).filter((i) => lens[i] > 0);
  let gap = 0;
  while (active.length) {
    gap = active.reduce((s, i) => s + lens[i], 0) / (total + active.length);
    const longer = active.filter((i) => lens[i] > gap);
    if (longer.length === active.length) break;
    active = longer;
  }
  return apportion(lens.map((l) => (gap > 0 && l > gap ? l / gap - 1 : 0)), total);
}

/** n particles on a net. Never fewer than its nodes: a shape keeps all its corners. */
export function netPoints(net, n) {
  const { nodes, chains, lens } = net;
  if (n <= nodes.length) return nodes.map((p) => p.slice());
  const inside = share(lens, n - nodes.length);
  const out = nodes.map((p) => p.slice());
  chains.forEach((chain, i) => {
    if (!inside[i]) return;
    const pts = resample(chain, inside[i] + 2);
    for (let j = 1; j <= inside[i]; j++) out.push(pts[j]);
  });
  return out;
}

/** n particles along one path with corners; too few for the corners = spaced evenly instead. */
export function pathPoints(verts, n, closed = false) {
  if (n < verts.length) return resample(verts, n, closed);
  const edges = closed ? loopEdges(verts.length) : verts.slice(1).map((_, i) => [i, i + 1]);
  return netPoints(wireNet(verts, edges), n);
}

const CROWDED = 0.55; // of the usual gap: closer than this and two dots read as one blob

/** Which of two crowded particles goes: the one with less room, else the lower, else the outer one. */
function crowdedOne(pts, gone, i, j) {
  const room = (a, partner) => {
    let best = Infinity;
    for (let k = 0; k < pts.length; k++) {
      if (k !== a && k !== partner && !gone[k]) best = Math.min(best, dist(pts[a], pts[k]));
    }
    return best;
  };
  const ri = room(i, j);
  const rj = room(j, i);
  if (Math.abs(ri - rj) > 1e-9) return ri < rj ? i : j;
  if (Math.abs(pts[i][1] - pts[j][1]) > 1e-9) return pts[i][1] < pts[j][1] ? i : j;
  if (Math.abs(Math.abs(pts[i][0]) - Math.abs(pts[j][0])) > 1e-9) return Math.abs(pts[i][0]) > Math.abs(pts[j][0]) ? i : j;
  return j;
}

/**
 * Takes particles out of pairs that sit closer than `reach` times the usual
 * gap, tightest pair first, at most `most` of them. The first `fixed` points
 * (the corners of the shape) always stay.
 */
function thin(pts, fixed, reach, most = Infinity) {
  const m = pts.length;
  const gap2 = (i, j) => {
    const dx = pts[i][0] - pts[j][0];
    const dy = pts[i][1] - pts[j][1];
    const dz = pts[i][2] - pts[j][2];
    return dx * dx + dy * dy + dz * dz;
  };
  const nearest = new Float64Array(m).fill(Infinity);
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      const d = gap2(i, j);
      if (d < nearest[i]) nearest[i] = d;
      if (d < nearest[j]) nearest[j] = d;
    }
  }
  const limit = reach * reach * Float64Array.from(nearest).sort()[m >> 1]; // squared, like the gaps
  const pairs = [];
  for (let i = 0; i < m; i++) {
    if (nearest[i] >= limit) continue;
    for (let j = Math.max(i + 1, fixed); j < m; j++) { // j < fixed would be two corners
      const d = gap2(i, j);
      if (d < limit) pairs.push([d, i, j]);
    }
  }
  if (!pairs.length) return pts;
  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const gone = new Uint8Array(m);
  let left = most;
  for (const [, i, j] of pairs) {
    if (left <= 0) break;
    if (gone[i] || gone[j]) continue;
    gone[i < fixed ? j : crowdedOne(pts, gone, i, j)] = 1;
    left--;
  }
  return pts.filter((_, i) => !gone[i]);
}

/**
 * n particles on a net without crowding. Where strokes meet at a narrow angle
 * (the waist of a B, the tip of a flame) an even share puts dots side by side.
 * Those are taken out and as many are spread over the rest of the shape
 * instead, so the answer is the same size as netPoints gives.
 */
export function spreadPoints(net, n) {
  const fixed = net.nodes.length;
  if (n <= fixed + 1) return netPoints(net, n);
  let ask = n;
  for (let attempt = 0; attempt < 8; attempt++) {
    let kept = thin(netPoints(net, ask), fixed, CROWDED);
    if (kept.length > n) kept = thin(kept, fixed, 4, kept.length - n); // a few too many: the tightest pairs lose one each
    if (kept.length > n) kept = kept.slice(0, n);
    if (kept.length === n) return kept;
    ask += n - kept.length;
  }
  return netPoints(net, n);
}

// ---------------------------------------------------------------- drawings
//
// Letters and pictures are written in a tiny drawing language (y up, numbers
// separated by spaces or commas):
//
//   M x y              lift the pen and move there
//   L x y ...          line(s)
//   Q hx hy x y        curve with one handle
//   C ax ay bx by x y  curve with two handles
//   A cx cy r a0 a1    arc around a centre, in degrees (anticlockwise if a1 > a0)
//   E cx cy rx ry a0 a1  the same for an oval
//   B x y b            arc to a point; b is the bulge (1 = half circle, the
//                      sign picks the side: positive bulges to the right)
//   O cx cy r          a whole circle
//   D x y              one lone particle
//   N                  lift the pen
//   Z                  close the outline
//
// Whatever stands before a "|" is drawn twice: as written and mirrored
// left-right. An arc that starts where the pen already is carries on from
// there; otherwise a line joins them.

const ARGC = { M: 2, L: 2, Q: 4, C: 6, A: 5, E: 6, B: 3, O: 3, D: 2, N: 0, Z: 0 };
const SNAP = 0.05; // drawing units: this close to the pen counts as "where the pen is"

function bezier(ctrl) {
  let rough = 0;
  for (let i = 1; i < ctrl.length; i++) rough += Math.hypot(ctrl[i][0] - ctrl[i - 1][0], ctrl[i][1] - ctrl[i - 1][1]);
  const steps = Math.min(40, Math.max(10, Math.ceil(rough / 0.6)));
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let pts = ctrl;
    while (pts.length > 1) {
      const next = [];
      for (let j = 1; j < pts.length; j++) {
        next.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * t, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * t]);
      }
      pts = next;
    }
    out.push(pts[0]);
  }
  out[0] = ctrl[0];
  out[steps] = ctrl[ctrl.length - 1];
  return out;
}

/** Arc as a polyline, angles in degrees. A full turn ends exactly where it began. */
export function arcPoly(cx, cy, rx, ry, a0, a1) {
  const steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 6));
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const a = (a0 + ((a1 - a0) * i) / steps) * RAD;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  if (Math.abs(a1 - a0) >= 360 && Math.abs(a1 - a0) % 360 === 0) out[steps] = out[0].slice();
  return out;
}

function bulgeArc(p0, p1, bulge) {
  const chord = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  if (Math.abs(bulge) < 1e-6 || chord < 1e-9) return [p0, p1];
  const angle = 4 * Math.atan(Math.abs(bulge));
  const radius = chord / (2 * Math.sin(angle / 2));
  const side = bulge > 0 ? 1 : -1;
  const off = radius * Math.cos(angle / 2) * side;
  const cx = (p0[0] + p1[0]) / 2 - ((p1[1] - p0[1]) / chord) * off;
  const cy = (p0[1] + p1[1]) / 2 + ((p1[0] - p0[0]) / chord) * off;
  const a0 = Math.atan2(p0[1] - cy, p0[0] - cx) / RAD;
  const out = arcPoly(cx, cy, radius, radius, a0, a0 + (angle / RAD) * side);
  out[0] = p0;
  out[out.length - 1] = p1;
  return out;
}

function parseOne(d) {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)/g) || [];
  const polys = [];
  const dots = [];
  let cur = null;
  const lift = () => {
    if (cur && cur.length > 1) polys.push(cur);
    cur = null;
  };
  const pen = (cmd) => {
    if (!cur) throw new Error(`Drawing: "${cmd}" needs a starting point in "${d}"`);
    return cur[cur.length - 1];
  };
  const through = (pts) => {
    if (!cur) cur = [pts[0]];
    else {
      const p = cur[cur.length - 1];
      if (Math.hypot(pts[0][0] - p[0], pts[0][1] - p[1]) >= SNAP) cur.push(pts[0]);
    }
    for (let i = 1; i < pts.length; i++) cur.push(pts[i]);
  };
  const run = (cmd, a) => {
    switch (cmd) {
      case 'M': lift(); cur = [[a[0], a[1]]]; break;
      case 'L': pen(cmd); cur.push([a[0], a[1]]); break;
      case 'Q': through(bezier([pen(cmd), [a[0], a[1]], [a[2], a[3]]])); break;
      case 'C': through(bezier([pen(cmd), [a[0], a[1]], [a[2], a[3]], [a[4], a[5]]])); break;
      case 'A': through(arcPoly(a[0], a[1], a[2], a[2], a[3], a[4])); break;
      case 'E': through(arcPoly(a[0], a[1], a[2], a[3], a[4], a[5])); break;
      case 'B': through(bulgeArc(pen(cmd), [a[0], a[1]], a[2])); break;
      case 'O': lift(); cur = arcPoly(a[0], a[1], a[2], a[2], 90, 450); lift(); break;
      case 'D': dots.push([a[0], a[1]]); break;
      case 'N': lift(); break;
      case 'Z': {
        const first = cur && cur[0];
        const p = pen(cmd);
        if (cur.length > 2 && Math.hypot(first[0] - p[0], first[1] - p[1]) < SNAP) cur[cur.length - 1] = first.slice();
        else cur.push(first.slice());
        lift();
        break;
      }
      default: throw new Error(`Drawing: unknown command "${cmd}" in "${d}"`);
    }
  };
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    const argc = ARGC[cmd];
    if (argc === undefined) throw new Error(`Drawing: unknown command "${cmd}" in "${d}"`);
    do {
      const a = [];
      for (let k = 0; k < argc; k++) a.push(Number(tokens[i++]));
      if (a.some((v) => !Number.isFinite(v))) throw new Error(`Drawing: bad numbers after "${cmd}" in "${d}"`);
      run(cmd, a);
    } while (argc > 0 && i < tokens.length && !/[A-Za-z]/.test(tokens[i]));
  }
  lift();
  return { polys, dots };
}

/** Text of a drawing -> { polys: [[[x, y], ...], ...], dots: [[x, y], ...] }. */
export function parsePath(d) {
  const cut = d.indexOf('|');
  if (cut < 0) return parseOne(d);
  const half = parseOne(d.slice(0, cut));
  const rest = parseOne(d.slice(cut + 1));
  const out = { polys: [], dots: [] };
  for (const sign of [1, -1]) {
    for (const poly of half.polys) out.polys.push(poly.map(([x, y]) => [x * sign, y]));
    for (const [x, y] of half.dots) out.dots.push([x * sign, y]);
  }
  out.polys.push(...rest.polys);
  out.dots.push(...rest.dots);
  return out;
}

/** Several drawings as one. */
export const joinDrawings = (...parts) => ({
  polys: parts.flatMap((p) => p.polys || []),
  dots: parts.flatMap((p) => p.dots || []),
});

/** Move, turn (degrees) and resize a drawing. */
export function placeDrawing(drawing, { x = 0, y = 0, size = 1, turn = 0 } = {}) {
  const c = Math.cos(turn * RAD);
  const s = Math.sin(turn * RAD);
  const at = ([px, py]) => [x + (px * c - py * s) * size, y + (px * s + py * c) * size];
  return { polys: drawing.polys.map((poly) => poly.map(at)), dots: drawing.dots.map(at) };
}

/** Centre a drawing and scale it to fill the -1..1 box (or use a fixed box [cx, cy, half]). */
export function fitDrawing(drawing, box = null) {
  let cx, cy, half;
  if (box) [cx, cy, half] = box;
  else {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of [...drawing.polys.flat(), ...drawing.dots]) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    cx = (x0 + x1) / 2;
    cy = (y0 + y1) / 2;
    half = Math.max(x1 - x0, y1 - y0) / 2 || 1;
  }
  return placeDrawing(drawing, { x: -cx / half, y: -cy / half, size: 1 / half });
}

const TOL = 0.004; // in the -1..1 box: points this close are the same point
const JOIN = 0.03; // junctions this close, with a stroke between them, are one junction
const REACH = 0.03; // how far along a stroke to look when judging a bend (a quarter of the usual gap between particles)
const CORNER = Math.cos(30 * RAD); // a bend sharper than this gets a particle of its own

/**
 * Turns a fitted drawing into a net. Strokes that touch, cross or run over each
 * other are joined up first, so no two particles can land on the same spot.
 * `lift` places the flat drawing in 3D.
 */
export function drawingNet(drawing, lift = (x, y) => [x, y, 0]) {
  const verts = [];
  const cells = new Map();
  const cellKey = (gx, gy) => (gx + 2048) * 4096 + (gy + 2048);
  const vertex = (x, y) => {
    const gx = Math.floor(x / TOL);
    const gy = Math.floor(y / TOL);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const i of cells.get(cellKey(gx + dx, gy + dy)) || []) {
          if (Math.hypot(verts[i][0] - x, verts[i][1] - y) < TOL) return i;
        }
      }
    }
    verts.push([x, y]);
    const key = cellKey(gx, gy);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(verts.length - 1);
    return verts.length - 1;
  };

  // strokes as short straight pieces between numbered points
  const segs = [];
  const have = new Set();
  const segKey = (a, b) => (a < b ? a * 65536 + b : b * 65536 + a);
  const addSeg = (a, b) => {
    if (a === b || have.has(segKey(a, b))) return;
    have.add(segKey(a, b));
    segs.push([a, b]);
  };
  const split = (i, v) => {
    const [a, b] = segs[i];
    if (v === a || v === b) return;
    have.delete(segKey(a, b));
    segs[i] = null;
    addSeg(a, v);
    addSeg(v, b);
  };
  for (const poly of drawing.polys) {
    let prev = -1;
    for (const [x, y] of poly) {
      const v = vertex(x, y);
      if (prev >= 0) addSeg(prev, v);
      prev = v;
    }
  }
  const lone = drawing.dots.map(([x, y]) => vertex(x, y));

  // a point lying on another stroke becomes part of that stroke
  for (let v = 0; v < verts.length; v++) {
    const px = verts[v][0];
    const py = verts[v][1];
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (!s || s[0] === v || s[1] === v) continue;
      const ax = verts[s[0]][0];
      const bx = verts[s[1]][0];
      if (px < (ax < bx ? ax : bx) - TOL || px > (ax > bx ? ax : bx) + TOL) continue;
      const ay = verts[s[0]][1];
      const by = verts[s[1]][1];
      if (py < (ay < by ? ay : by) - TOL || py > (ay > by ? ay : by) + TOL) continue;
      const dx = bx - ax;
      const dy = by - ay;
      const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
      if (t <= 0 || t >= 1) continue;
      if (Math.hypot(ax + t * dx - px, ay + t * dy - py) < TOL) split(i, v);
    }
  }

  // strokes that cross get a shared point at the crossing
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (!s) continue;
    const ax = verts[s[0]][0], ay = verts[s[0]][1], bx = verts[s[1]][0], by = verts[s[1]][1];
    const x0 = ax < bx ? ax : bx, x1 = ax > bx ? ax : bx, y0 = ay < by ? ay : by, y1 = ay > by ? ay : by;
    const rx = bx - ax, ry = by - ay;
    for (let j = i + 1; j < segs.length; j++) {
      const u = segs[j];
      if (!u || s[0] === u[0] || s[0] === u[1] || s[1] === u[0] || s[1] === u[1]) continue;
      const cx = verts[u[0]][0], dx = verts[u[1]][0];
      if (x1 < (cx < dx ? cx : dx) || x0 > (cx > dx ? cx : dx)) continue;
      const cy = verts[u[0]][1], dy = verts[u[1]][1];
      if (y1 < (cy < dy ? cy : dy) || y0 > (cy > dy ? cy : dy)) continue;
      const sx = dx - cx, sy = dy - cy;
      const den = rx * sy - ry * sx;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((cx - ax) * sy - (cy - ay) * sx) / den;
      const w = ((cx - ax) * ry - (cy - ay) * rx) / den;
      if (t <= 0 || t >= 1 || w <= 0 || w >= 1) continue;
      const v = vertex(ax + t * rx, ay + t * ry);
      split(j, v);
      split(i, v);
      if (!segs[i]) break; // this piece is now two shorter ones further down the list
    }
  }

  // two junctions a hair apart are one junction: strokes that cross right next
  // to a bend in both of them would otherwise meet twice
  const merged = new Map(); // a point that was folded into another one -> that one
  for (let guard = 0; guard < 200; guard++) {
    const degree = verts.map(() => 0);
    for (const s of segs) {
      if (!s) continue;
      degree[s[0]]++;
      degree[s[1]]++;
    }
    const at = segs.findIndex((s) => s && degree[s[0]] > 2 && degree[s[1]] > 2
      && Math.hypot(verts[s[0]][0] - verts[s[1]][0], verts[s[0]][1] - verts[s[1]][1]) < JOIN);
    if (at < 0) break;
    const [a, b] = segs[at];
    verts[a] = [(verts[a][0] + verts[b][0]) / 2, (verts[a][1] + verts[b][1]) / 2];
    merged.set(b, a);
    for (let i = 0; i < segs.length; i++) {
      const t = segs[i];
      if (!t || (t[0] !== b && t[1] !== b)) continue;
      have.delete(segKey(t[0], t[1]));
      segs[i] = null;
      addSeg(t[0] === b ? a : t[0], t[1] === b ? a : t[1]);
    }
  }

  const adj = verts.map(() => []);
  for (const s of segs) {
    if (!s) continue;
    adj[s[0]].push(s[1]);
    adj[s[1]].push(s[0]);
  }

  // Which points always get a particle: ends, junctions, lone dots and corners.
  // A corner is a bend of more than 30 degrees, judged over REACH, so a tight
  // curl counts as one corner (its sharpest point) however finely it is drawn.
  const ahead = (from, to) => { // the point REACH further along the stroke, to judge its direction
    let prev = from;
    let cur = to;
    let left = REACH;
    for (let guard = 0; guard < 400; guard++) {
      const step = Math.hypot(verts[cur][0] - verts[prev][0], verts[cur][1] - verts[prev][1]);
      if (step >= left) {
        const k = left / step;
        return [verts[prev][0] + (verts[cur][0] - verts[prev][0]) * k, verts[prev][1] + (verts[cur][1] - verts[prev][1]) * k];
      }
      left -= step;
      const next = adj[cur][0] === prev ? adj[cur][1] : adj[cur][0];
      if (adj[cur].length !== 2 || next === from) break;
      prev = cur;
      cur = next;
    }
    return verts[cur];
  };
  const bend = verts.map((v, i) => { // cosine of the turn at a point in the middle of a stroke: 1 = straight on
    if (merged.has(i) || adj[i].length !== 2) return 1;
    const a = ahead(i, adj[i][0]);
    const b = ahead(i, adj[i][1]);
    const ux = v[0] - a[0], uy = v[1] - a[1], wx = b[0] - v[0], wy = b[1] - v[1];
    return (ux * wx + uy * wy) / (Math.hypot(ux, uy) * Math.hypot(wx, wy) || 1);
  });
  const sharperNearby = (i) => {
    for (const first of adj[i]) {
      let prev = i;
      let cur = first;
      for (let guard = 0; guard < 400; guard++) {
        if (cur === i || adj[cur].length !== 2) break;
        if (Math.hypot(verts[cur][0] - verts[i][0], verts[cur][1] - verts[i][1]) >= REACH) break;
        if (bend[cur] < bend[i] - 1e-12 || (Math.abs(bend[cur] - bend[i]) <= 1e-12 && cur < i)) return true;
        const next = adj[cur][0] === prev ? adj[cur][1] : adj[cur][0];
        prev = cur;
        cur = next;
      }
    }
    return false;
  };
  const isNode = verts.map((v, i) => {
    if (merged.has(i)) return false;
    if (adj[i].length !== 2) return true;
    return bend[i] < CORNER && !sharperNearby(i);
  });
  for (let v of lone) {
    while (merged.has(v)) v = merged.get(v);
    isNode[v] = true;
  }

  const used = new Set();
  const chains = [];
  const walk = (start, next) => {
    const chain = [lift(...verts[start])];
    let prev = start;
    let cur = next;
    used.add(segKey(prev, cur));
    while (!isNode[cur]) {
      chain.push(lift(...verts[cur]));
      const to = adj[cur][0] === prev ? adj[cur][1] : adj[cur][0];
      used.add(segKey(cur, to));
      prev = cur;
      cur = to;
    }
    chain.push(lift(...verts[cur]));
    return chain;
  };
  for (let i = 0; i < verts.length; i++) {
    if (!isNode[i]) continue;
    for (const to of adj[i]) if (!used.has(segKey(i, to))) chains.push(walk(i, to));
  }
  // smooth closed loops (a plain circle) have no corner: their first point is the anchor
  for (let i = 0; i < verts.length; i++) {
    if (isNode[i] || !adj[i].length || used.has(segKey(i, adj[i][0]))) continue;
    isNode[i] = true;
    chains.push(walk(i, adj[i][0]));
  }

  const nodes = [];
  for (let i = 0; i < verts.length; i++) if (isNode[i]) nodes.push(lift(...verts[i]));
  return makeNet(nodes, chains);
}

/** n points spread in tidy rows inside closed outlines [[[x, y], ...], ...] (holes follow the even-odd rule). */
export function fillPoints(outlines, n) {
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [, y] of outlines.flat()) {
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const height = y1 - y0;
  const spans = (y) => {
    const xs = [];
    for (const poly of outlines) {
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
    return xs.sort((p, q) => p - q);
  };
  const widthAt = (y) => {
    const xs = spans(y);
    let w = 0;
    for (let i = 0; i + 1 < xs.length; i += 2) w += xs[i + 1] - xs[i];
    return w;
  };
  const SCAN = 96;
  let area = 0;
  for (let k = 0; k < SCAN; k++) area += widthAt(y0 + ((k + 0.5) * height) / SCAN);
  area *= height / SCAN;
  const rows = Math.max(1, Math.round(height / Math.sqrt(area / n)));
  const ys = Array.from({ length: rows }, (_, j) => y1 - ((j + 0.5) * height) / rows);
  const perRow = apportion(ys.map(widthAt), n);
  const out = [];
  ys.forEach((y, j) => {
    if (!perRow[j]) return;
    const xs = spans(y);
    const lens = [];
    for (let i = 0; i + 1 < xs.length; i += 2) lens.push(xs[i + 1] - xs[i]);
    apportion(lens, perRow[j]).forEach((count, s) => {
      for (let i = 0; i < count; i++) out.push([xs[s * 2] + ((i + 0.5) * lens[s]) / count, y, 0]);
    });
  });
  return out;
}

// ---------------------------------------------------------------- surfaces

/**
 * Spins a profile [[radius, y], ...] around the Y axis and spreads n particles
 * evenly over the surface (the way the Sphere does it). `floor` treats thin
 * parts as at least that wide, so stems still get particles.
 */
export function lathe(profile, n, floor = 0) {
  const acc = [0];
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1];
    const [r1, y1] = profile[i];
    acc.push(acc[i - 1] + Math.max(floor, (r0 + r1) / 2) * Math.hypot(r1 - r0, y1 - y0));
  }
  const total = acc[acc.length - 1];
  const out = [];
  let seg = 0;
  for (let k = 0; k < n; k++) {
    const want = ((k + 0.5) / n) * total;
    while (seg < acc.length - 2 && acc[seg + 1] < want) seg++;
    const t = (want - acc[seg]) / (acc[seg + 1] - acc[seg] || 1);
    const r = profile[seg][0] + (profile[seg + 1][0] - profile[seg][0]) * t;
    const y = profile[seg][1] + (profile[seg + 1][1] - profile[seg][1]) * t;
    out.push([Math.cos(k * GOLDEN) * r, y, Math.sin(k * GOLDEN) * r]);
  }
  return out;
}

/** Rings of particles, one per [radius, y]; a radius of 0 is a single particle (a tip). */
export function ringStack(stations, n) {
  const tip = (r) => r < 1e-6;
  const tips = stations.filter(([r]) => tip(r)).length;
  const per = apportion(stations.map(([r]) => (tip(r) ? 0 : r)), Math.max(0, n - tips));
  return stations.flatMap(([r, y], j) => (tip(r)
    ? [[0, y, 0]]
    : ring(per[j], r, y, j % 2 ? Math.PI / Math.max(1, per[j]) : 0)));
}

// ---------------------------------------------------------------- drawn shapes

/**
 * A shape made from a drawing. `draw` is the drawing text, or a function of the
 * slider values that returns the text or a { polys, dots } drawing.
 *   box    null = centre it and fill the -1..1 box, [cx, cy, half] = a fixed
 *          frame, false = the drawing is already in the -1..1 box
 *   turn   degrees to turn the drawing first
 *   lift   (x, y) => [x, y, z] to lay a flat drawing down in 3D
 * count (default "How many") and min (fewest particles: one per corner) are
 * measured from the drawing the first time they are needed, unless given.
 */
export function drawnShape({
  id, name, cat, draw, params, box = null, turn = 0, lift, group = 'flat', count, min, label, tags, spacing = 0.13,
}) {
  const keys = (params || []).map((p) => p.key);
  const build = memo((...values) => {
    let drawing = typeof draw === 'function' ? draw(Object.fromEntries(keys.map((k, i) => [k, values[i]]))) : draw;
    if (typeof drawing === 'string') drawing = parsePath(drawing);
    if (turn) drawing = placeDrawing(drawing, { turn });
    return drawingNet(box === false ? drawing : fitDrawing(drawing, box), lift);
  });
  const netFor = (p) => build(...keys.map((k) => p[k]));
  let measured = null;
  const measure = () => {
    if (!measured) {
      const net = netFor(Object.fromEntries((params || []).map((p) => [p.key, p.default])));
      const least = Math.max(8, net.nodes.length);
      const length = net.lens.reduce((s, l) => s + l, 0);
      measured = { min: least, count: Math.max(least + 8, Math.min(140, Math.round(length / spacing))) };
    }
    return measured;
  };
  const shape = { id, name, cat, group, gen: (n, p) => spreadPoints(netFor(p), n) };
  if (params) shape.params = params;
  if (label) shape.label = label;
  if (tags) shape.tags = tags;
  Object.defineProperty(shape, 'min', { enumerable: true, get: () => min ?? measure().min });
  Object.defineProperty(shape, 'count', { enumerable: true, get: () => count ?? measure().count });
  return shape;
}
