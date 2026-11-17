// The form of an object: which points it is made of, before it is placed,
// turned and sized. Pure maths (no DOM), shared by the preview, the plans of
// js/motion.js, the code generator and the tests.
//
// A form is one of
//   a shape of the library : shape (its id), count, params        (js/shapes.js)
//   a path                 : shape 'own:path', count, path: { nodes, closed, smooth, mode }
//                            a line drawn in the Shape Studio: `count` particles
//                            spread along it (or inside it, or spun around)
//   a cloud                : shape 'own:cloud', points: [[x, y, z], ...]
//                            loose points, each placed by hand or baked from other shapes
// and each can have deformers on top: deform: [{ kind, ... }]     (js/deform.js)
//
// An object carries these fields itself. A key of an object can carry a form
// of its own (key.form): from that key on the object has that form, and on the
// way there it morphs into it (js/morph.js, js/motion.js).

import { shapePoints, SHAPE_BY_ID, defaultParams, MAX_COUNT } from './shapes.js';
import { resample, fillPoints, lathe } from './shape-kit.js';
import { applyDeformers, sanitizeDeform, measure, MAX_POINTS } from './deform.js';

// (The ids of the library are made of small letters, digits and "-". The colon
// keeps these two out of their way: the library has a picture called "cloud".)
export const PATH = 'own:path';
export const CLOUD = 'own:cloud';
/** A form that is not a shape of the library: drawn or put together in the Shape Studio. */
export const isCustom = (shape) => shape === PATH || shape === CLOUD;

/** A path has at most this many corners. */
export const MAX_NODES = 120;
/** What the particles of a path do with its line. */
export const PATH_MODES = [
  { id: 'line', name: 'Along the line' },
  { id: 'fill', name: 'Fill the inside' },
  { id: 'spin', name: 'Spin it around (3D)' },
];
const LIMIT = 50;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const vec3 = (v) => (Array.isArray(v) && v.length >= 3 && v.slice(0, 3).every(isNumber) ? v.slice(0, 3).map((x) => clamp(x, -LIMIT, LIMIT) + 0) : null);

/** The fields of an object (or of the form of a key) that say which points it is made of. */
export const formOf = (o) => {
  const form = { shape: o.shape, count: o.count, params: o.params };
  if (o.path) form.path = o.path;
  if (o.points) form.points = o.points;
  if (o.deform && o.deform.length) form.deform = o.deform;
  return form;
};

/** Its points are not just those of a shape of the library: it is drawn, loose points, or deformed. */
export const isShaped = (o) => isCustom(o.shape) || !!(o.deform && o.deform.length);

/** What a form is called: the name of its shape, "Path" or "Points". */
export function formName(form) {
  if (form.shape === PATH) return form.path && form.path.closed ? 'Drawn shape' : 'Drawn line';
  if (form.shape === CLOUD) return 'Points';
  const def = SHAPE_BY_ID[form.shape];
  return def ? def.name : 'Particle';
}

// ---------------------------------------------------------------- keys of the store

/** Two numbers that stand for a list of points (the same points give the same numbers). */
function fingerprint(points) {
  let a = 2166136261, b = 5381;
  for (const p of points) {
    for (let k = 0; k < 3; k++) {
      const v = Math.round(p[k] * 1e5) | 0;
      a = Math.imul(a ^ v, 16777619);
      b = (Math.imul(b, 33) + v) | 0;
    }
  }
  return `${points.length}:${a >>> 0}:${b >>> 0}`;
}

/** A text that is the same for two forms exactly when they have the same points. */
export function formKey(form) {
  let key = `${form.shape}|${form.count}|`;
  if (form.shape === PATH) {
    const path = form.path || {};
    key += `${path.closed ? 'c' : 'o'}${path.smooth ? 's' : 'l'}${path.mode || 'line'}${fingerprint(path.nodes || [])}`;
  } else if (form.shape === CLOUD) key += fingerprint(form.points || []);
  else key += JSON.stringify(form.params || {});
  if (form.deform && form.deform.length) key += `|${JSON.stringify(form.deform)}`;
  return key;
}

/** The same for two forms when they are the same thing before their deformers. */
export const sourceKey = (form) => formKey({ ...form, deform: null });

// ---------------------------------------------------------------- paths

/** A smooth line through the corners of a path (Catmull-Rom), as many short straight pieces. */
function spline(nodes, closed, steps = 10) {
  const n = nodes.length;
  const get = (i) => (closed ? nodes[((i % n) + n) % n] : nodes[Math.min(n - 1, Math.max(0, i))]);
  const out = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const [a, b, c, d] = [get(i - 1), get(i), get(i + 1), get(i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push([0, 1, 2].map((k) => 0.5 * (2 * b[k] + (c[k] - a[k]) * t
        + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t * t * t)));
    }
  }
  if (!closed) out.push(nodes[n - 1].slice());
  return out;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => {
  const len = Math.hypot(...v);
  return len > 1e-12 ? v.map((x) => x / len) : null;
};

/** n points inside a closed line, in the flat plane the line lies in (as well as it lies in one). */
function filled(loop, n) {
  const centre = loop.reduce((sum, p) => sum.map((v, k) => v + p[k] / loop.length), [0, 0, 0]);
  // the direction the loop faces (Newell's way: right for any flat loop, a fair middle for one that is not)
  let normal = [0, 0, 0];
  loop.forEach((p, i) => {
    const q = loop[(i + 1) % loop.length];
    normal = [normal[0] + (p[1] - q[1]) * (p[2] + q[2]), normal[1] + (p[2] - q[2]) * (p[0] + q[0]), normal[2] + (p[0] - q[0]) * (p[1] + q[1])];
  });
  normal = unit(normal);
  if (!normal) return null;
  const u = unit(cross(Math.abs(normal[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], normal));
  const v = cross(normal, u);
  const flat = loop.map((p) => [dot(sub(p, centre), u), dot(sub(p, centre), v)]);
  const inside = fillPoints([flat], n);
  if (inside.length !== n) return null;
  return inside.map(([x, y]) => [0, 1, 2].map((k) => centre[k] + u[k] * x + v[k] * y));
}

/** The particles of a path. */
function pathPoints(path, count) {
  const nodes = path.nodes;
  const n = clamp(Math.round(Number(count) || nodes.length), 1, MAX_COUNT);
  if (nodes.length === 1) return [nodes[0].slice()];
  const closed = !!path.closed && nodes.length > 2;
  const line = path.smooth && nodes.length > 2 ? spline(nodes, closed) : nodes;
  if (path.mode === 'fill' && closed) {
    const inside = filled(line, n);
    if (inside) return inside;
  }
  if (path.mode === 'spin') {
    // around the line that goes up through its pivot: how far a corner is from that line is how wide the thing is there
    const profile = (closed ? [...line, line[0]] : line).map((p) => [Math.hypot(p[0], p[2]), p[1]]);
    const length = profile.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - profile[i - 1][0], p[1] - profile[i - 1][1]) : 0), 0);
    if (length > 1e-9) return lathe(profile, n, 0.03);
  }
  return resample(line, n, closed);
}

// ---------------------------------------------------------------- points

/** The points of a form before its deformers. */
export function basePoints(form) {
  if (form.shape === PATH) return form.path && form.path.nodes && form.path.nodes.length ? pathPoints(form.path, form.count) : [[0, 0, 0]];
  if (form.shape === CLOUD) return form.points && form.points.length ? form.points.slice(0, MAX_POINTS) : [[0, 0, 0]];
  return shapePoints(form.shape, form.count, form.params);
}

// The same form is asked for again and again (every frame while playing), so
// the last results are kept. They are frozen: callers get the list to read.
const made = new Map();
const MADE_MAX = 240;

function facts(form) {
  const key = formKey(form);
  let known = made.get(key);
  if (!known) {
    const points = form.deform && form.deform.length ? applyDeformers(basePoints(form), form.deform) : basePoints(form).map((p) => p.slice());
    for (const p of points) Object.freeze(p);
    Object.freeze(points);
    const info = measure(points);
    let reach = 1;
    for (const p of points) reach = Math.max(reach, Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
    known = { points, box: [info.lo, info.hi], reach };
    made.set(key, known);
    if (made.size > MADE_MAX) made.delete(made.keys().next().value);
  }
  return known;
}

/** The points of a form: [[x, y, z], ...], frozen. A single particle ('point') is one point in the middle. */
export function formPoints(form) {
  if (!isShaped(form)) return shapePoints(form.shape, form.count, form.params);
  return facts(form).points;
}

/** Two opposite corners of the box the points of a form fit in. */
export const formBox = (form) => facts(form).box;

/**
 * How far a form reaches from its pivot, compared with a shape of the library
 * (which fits in the box from -1 to 1): 1 for those, more for a long line or
 * a shape that was blown up. Turns are cut the finer the further it reaches.
 */
export const formReach = (form) => (isShaped(form) ? facts(form).reach : 1);

// ---------------------------------------------------------------- loading

/** A path as loaded from a file, repaired; null when nothing of it can be used. */
export function sanitizePath(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const nodes = (Array.isArray(o.nodes) ? o.nodes : []).map(vec3).filter(Boolean).slice(0, MAX_NODES);
  if (!nodes.length) return null;
  return { nodes, closed: !!o.closed, smooth: !!o.smooth, mode: PATH_MODES.some((m) => m.id === o.mode) ? o.mode : 'line' };
}

/** The points of a cloud as loaded from a file, repaired; null when there are none. */
export function sanitizePoints(raw) {
  const points = (Array.isArray(raw) ? raw : []).map(vec3).filter(Boolean).slice(0, MAX_POINTS);
  return points.length ? points : null;
}

/**
 * A form as loaded from a file, with every field present and inside its
 * limits: { shape, count, params } and, where it has them, path, points and
 * deform. null when it is not a form (no known shape, a path without corners).
 */
export function sanitizeForm(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  if (o.shape === PATH) {
    const path = sanitizePath(o.path);
    if (!path) return null;
    Object.assign(out, { shape: PATH, count: clamp(Math.round(Number(o.count) || 24), 1, MAX_COUNT), params: {}, path });
  } else if (o.shape === CLOUD) {
    const points = sanitizePoints(o.points);
    if (!points) return null;
    Object.assign(out, { shape: CLOUD, count: points.length, params: {}, points });
  } else {
    const def = SHAPE_BY_ID[o.shape];
    if (!def) return null;
    const params = defaultParams(def.id);
    if (o.params && typeof o.params === 'object') {
      for (const p of def.params || []) {
        const v = Number(o.params[p.key]);
        if (Number.isFinite(v) && o.params[p.key] !== null && o.params[p.key] !== '') params[p.key] = clamp(v, p.min, p.max);
      }
    }
    const count = Number.isFinite(Number(o.count)) && o.count !== null && o.count !== '' ? Number(o.count) : def.count;
    Object.assign(out, { shape: def.id, count: clamp(Math.round(count), def.min, MAX_COUNT), params });
  }
  const deform = sanitizeDeform(o.deform);
  if (deform.length) out.deform = deform;
  return out;
}

/** A form made of the given points as they are: what baking a shape, or putting several together, gives. */
export const cloudOf = (points) => {
  const list = points.slice(0, MAX_POINTS).map((p) => p.map((v) => Number(clamp(v, -LIMIT, LIMIT).toFixed(4)) + 0));
  return { shape: CLOUD, count: list.length, params: {}, points: list };
};
