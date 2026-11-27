// Spirographs for the Curves tab: what a pen draws that sits on a small wheel
// rolling inside or around a big one. Each one is given by four numbers; the
// list holds those whose loops stay clear of each other when they are drawn
// with particles.
//
// None of them is a curve the older shapes can draw. The Spirograph of
// shapes-geo.js has sliders: a wheel inside a wheel of 3 to 12 teeth, the
// small one with 1 to 5, the pen from 0.2 to 1.6 (and the wheel with the
// other teeth, big minus small, draws the same curve with the pen at 1 / pen).
// So the wheels inside are bigger ones here, or have the pen far out on an
// arm; most wheels here roll around the big one, which that shape cannot do.
// The pen is never on the rim (those are the cycloids of the Curves tab), and
// a wheel around a wheel of its own size has the pen inside (beyond the rim
// it draws the Limaçon).
//
// Of two wheels whose curves look alike when they are drawn with particles
// (the same wheels with the pen a little further out), only one is here.

import { drawnShape } from './shape-kit.js';
import { loop } from './shapes-curves.js';

const TAU = Math.PI * 2;

/**
 * The curve of a pen on a wheel with `small` teeth that rolls along a wheel with `big` teeth, inside it or around
 * it. `pen` is how far the pen sits from the middle of the small wheel (1 = on its rim, more = on an arm beyond).
 */
function spiro(inside, big, small, pen) {
  const reach = pen * small;
  return loop((u) => {
    const t = TAU * small * u;
    const arm = inside ? big - small : big + small;
    const x = arm * Math.cos(t) + (inside ? reach : -reach) * Math.cos((arm / small) * t);
    const y = arm * Math.sin(t) - reach * Math.sin((arm / small) * t);
    return [-y, x];
  }, 720);
}

// [1 = the wheel rolls inside (0 = around), teeth of the big wheel, teeth of the small one, where the pen sits]
// A spirograph keeps its number for ever: new ones go to the end of the list.
export const WHEELS = [
  [1, 7, 1, 3], [0, 3, 2, 1.5], [1, 11, 1, 3], [0, 8, 1, 1.5], [1, 15, 1, 3], [0, 5, 2, 1.25], [1, 9, 1, 2.2], [1, 15, 2, 0.7], [1, 12, 1, 2.2], [0, 3, 2, 0.7],
  [0, 2, 1, 2.2], [0, 6, 1, 0.7], [0, 5, 1, 2.2], [0, 9, 2, 0.7], [0, 8, 1, 2.2], [0, 14, 3, 0.55], [0, 12, 1, 2.2], [0, 7, 2, 0.4], [0, 3, 1, 1.5], [1, 10, 1, 3],
  [0, 6, 1, 1.5], [1, 14, 1, 3], [0, 13, 1, 1.5], [1, 8, 1, 2.2], [1, 13, 2, 0.7], [1, 11, 1, 2.2], [0, 3, 1, 0.7], [1, 15, 1, 2.2], [0, 5, 3, 0.7], [0, 4, 1, 2.2],
  [0, 8, 3, 0.7], [0, 7, 1, 2.2], [1, 14, 3, 0.55], [0, 11, 1, 2.2], [0, 5, 2, 0.4], [0, 2, 1, 1.5], [1, 9, 1, 3], [0, 5, 1, 1.5], [1, 13, 1, 3], [0, 9, 2, 1.5],
  [1, 7, 1, 2.2], [0, 7, 2, 1.25], [1, 10, 1, 2.2], [0, 2, 1, 0.7], [1, 14, 1, 2.2], [0, 5, 1, 0.7], [0, 3, 2, 2.2], [0, 7, 3, 0.7], [0, 6, 1, 2.2], [0, 15, 2, 0.7],
  [0, 10, 1, 2.2], [0, 3, 1, 0.4], [0, 15, 1, 2.2], [1, 8, 1, 3], [0, 4, 1, 1.5], [1, 12, 1, 3], [0, 9, 1, 1.5], [1, 16, 1, 3], [0, 5, 3, 1.25], [1, 9, 2, 2.2],
  [0, 1, 1, 0.7], [1, 13, 1, 2.2], [0, 4, 1, 0.7], [0, 3, 1, 2.2], [0, 7, 1, 0.7], [0, 5, 2, 2.2], [0, 10, 3, 0.7], [0, 9, 1, 2.2], [0, 2, 1, 0.4], [0, 14, 1, 2.2],
];

const PEN = [[0.5, 'round lobes'], [0.9, 'petals'], [1, 'cusps points'], [1.8, 'loops'], [9, 'big loops']];

export const SPIRO_SHAPES = WHEELS.map(([inside, big, small, pen], i) => drawnShape({
  id: `spirograph-${i + 1}`, name: `Spirograph ${i + 1}`, cat: 'curves', sub: 'Spirographs', spacing: 0.1,
  tags: `spiro wheel lace rosette loops ${inside ? 'hypotrochoid inside' : 'epitrochoid around'} ${big} ${small} ${PEN.find(([most]) => pen <= most)[1]} mathematics maths curve`,
  draw: () => spiro(inside === 1, big, small, pen),
}));
export const SPIRO_HEADINGS = ['Spirographs'];
