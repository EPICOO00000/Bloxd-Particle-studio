// Morphing: which particle of one shape becomes which particle of the other.
// Pure maths (no DOM), used by the plans of js/motion.js.
//
// Every particle flies straight from its place in the first shape to a place
// in the second, so the pairs decide how the morph looks. They are chosen so
// that the particles have as short a way as possible and no two of them swap
// sides: the shape seems to flow into the other.
//
// When the shapes do not have the same number of particles
//   more in the second : particles of the first shape split. One flies on as
//                        itself, the others come out of it and fade in on
//                        their way ("in").
//   fewer in the second: particles of the first shape fly together. One stays,
//                        the others fade out on their way to it ("out").
// The extra ones are shared out evenly, so no part of a shape gets them all.

const squared = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;

/** Points seen from their own middle, so that only their arrangement counts and not where they stand. */
function centred(points) {
  const c = [0, 0, 0];
  for (const p of points) for (let k = 0; k < 3; k++) c[k] += p[k] / points.length;
  return points.map((p) => [p[0] - c[0], p[1] - c[1], p[2] - c[2]]);
}

/**
 * Gives every point of `many` one of the points of `few` (which has no more
 * points than `many`): owner[i] is the number of the point of `few` that point
 * i of `many` belongs to. Every point of `few` gets about equally many.
 */
function share(few, many) {
  const n = few.length;
  const N = many.length;
  const room = Array.from({ length: n }, (_, s) => Math.floor(((s + 1) * N) / n) - Math.floor((s * N) / n));
  // To begin with: every point, the ones far out first, takes the nearest one that still has room.
  const order = many.map((p, i) => [squared(p, [0, 0, 0]), i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
  const owner = new Int32Array(N);
  for (const [, i] of order) {
    let best = -1;
    let bestD = Infinity;
    for (let s = 0; s < n; s++) {
      if (!room[s]) continue;
      const d = squared(many[i], few[s]);
      if (d < bestD) { bestD = d; best = s; }
    }
    owner[i] = best;
    room[best]--;
  }
  // Then: two points swap what they belong to whenever that makes their ways shorter. After that no two ways cross.
  for (let pass = 0; pass < 16; pass++) {
    let swapped = false;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const si = owner[i];
        const sj = owner[j];
        if (si === sj) continue;
        if (squared(many[i], few[sj]) + squared(many[j], few[si]) < squared(many[i], few[si]) + squared(many[j], few[sj]) - 1e-12) {
          owner[i] = sj;
          owner[j] = si;
          swapped = true;
        }
      }
    }
    if (!swapped) break;
  }
  return owner;
}

const fingerprint = (points) => {
  let a = 2166136261, b = 5381;
  for (const p of points) {
    for (let k = 0; k < 3; k++) {
      const v = Math.round(p[k] * 1e4) | 0;
      a = Math.imul(a ^ v, 16777619);
      b = (Math.imul(b, 33) + v) | 0;
    }
  }
  return `${points.length}:${a >>> 0}:${b >>> 0}`;
};

const known = new Map();
const KNOWN_MAX = 80;

/**
 * The pairs for a morph from points `a` to points `b` (both where they stand
 * in the scene: placed, turned and sized).
 *   same : both are the same shape with other deformers: every particle keeps its number.
 * returns {
 *   kind  : 'in' (the second has more: particles come in), 'out' (it has fewer), or null (as many)
 *   stay  : [[i, j], ...] particle i of the first becomes particle j of the second
 *   extra : [[i, j], ...] 'in': j comes out of i and fades in; 'out': i flies to j and fades out
 * }
 * Every particle of the first shape is the first of exactly one pair of `stay`
 * or, with 'out', of `extra`; every particle of the second the second of one.
 */
export function matchPoints(a, b, same = false) {
  if (same && a.length === b.length) return { kind: null, stay: a.map((_, i) => [i, i]), extra: [] };
  const A = centred(a);
  const B = centred(b);
  const key = `${fingerprint(A)}|${fingerprint(B)}`;
  const found = known.get(key);
  if (found) return found;
  const fewer = B.length < A.length; // the second shape has fewer
  const few = fewer ? B : A;
  const many = fewer ? A : B;
  const owner = share(few, many);
  // of all the points that belong to one, the nearest is the one it becomes
  const nearest = new Array(few.length).fill(-1);
  for (let i = 0; i < many.length; i++) {
    const s = owner[i];
    if (nearest[s] < 0 || squared(many[i], few[s]) < squared(many[nearest[s]], few[s]) - 1e-12) nearest[s] = i;
  }
  const stay = [];
  const extra = [];
  for (let i = 0; i < many.length; i++) {
    const pair = fewer ? [i, owner[i]] : [owner[i], i];
    (nearest[owner[i]] === i ? stay : extra).push(pair);
  }
  const inOrder = (x, y) => x[0] - y[0] || x[1] - y[1];
  const result = {
    kind: A.length === B.length ? null : fewer ? 'out' : 'in',
    stay: stay.sort(inOrder),
    extra: extra.sort(inOrder),
  };
  known.set(key, result);
  if (known.size > KNOWN_MAX) known.delete(known.keys().next().value);
  return result;
}
