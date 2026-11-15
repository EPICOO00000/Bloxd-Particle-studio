// More pictures, added when the library grew to 3,624 shapes: symbols and faces.
// Each one is a drawing (the drawing language is in shape-kit.js); the tools at
// the top are shared with the other files of pictures that were added then.

import { around, fix, drawnShape } from './shape-kit.js';

/** A star outline with `k` points around (cx, cy): `out` to the tips, `inn` to the corners between them. */
export const star = (cx, cy, out, inn, k = 5, first = 90) => `M${Array.from({ length: 2 * k }, (_, i) => around(cx, cy, i % 2 ? inn : out, first + (180 * i) / k)).join(' L')} Z`;
/** Short lines pointing away from (cx, cy), from `from` to `to`, at the given angles. */
export const rays = (cx, cy, from, to, angles) => angles.map((a) => `M${around(cx, cy, from, a)} L${around(cx, cy, to, a)}`).join(' ');
/** Rows of [id, name, drawing, search words] as shapes of one heading. */
export const pictures = (cat, sub, list) => list.map(([id, name, draw, tags]) => drawnShape({ id, name, cat, sub, draw, tags }));

// ---------------------------------------------------------------- symbols

const ARROWS = [
  ['dashed-arrow', 'Dashed arrow', 'M-5,0 L-3.6,0 M-2.4,0 L-1,0 M0.2,0 L1.6,0 M2.8,0 L5,0 M3,2 L5,0 L3,-2', 'dotted pointer direction path route'],
  ['triple-arrow', 'Triple arrow', 'M-4,3.2 L4,3.2 M2.6,4.4 L4,3.2 L2.6,2 M-4,0 L4,0 M2.6,1.2 L4,0 L2.6,-1.2 M-4,-3.2 L4,-3.2 M2.6,-2 L4,-3.2 L2.6,-4.4', 'three pointers lanes speed direction'],
  ['skip-arrow', 'Skip arrow', 'M-5,0 L3,0 M0.8,2.2 L3,0 L0.8,-2.2 M4.6,3 L4.6,-3', 'end last next tab stop bar'],
  ['expand-arrows', 'Expand arrows', 'M-1,-1 L-4.5,-4.5 L-4.5,-1.8 M-4.5,-4.5 L-1.8,-4.5 M1,1 L4.5,4.5 L4.5,1.8 M4.5,4.5 L1.8,4.5', 'grow bigger resize stretch maximise'],
  ['crossing-arrows', 'Crossing arrows', 'M-5,3 L-2.5,3 L0,0 L2.5,-3 L5,-3 M3.4,-1.4 L5,-3 L3.4,-4.6 M-5,-3 L-2.5,-3 L0,0 L2.5,3 L5,3 M3.4,4.6 L5,3 L3.4,1.4', 'shuffle mix random swap cross'],
  ['feathered-arrow', 'Feathered arrow', 'M-4,-4 L-3,-3 L4,4 M4,4 L1.8,3.6 M4,4 L3.6,1.8 M-4,-4 L-4.2,-2.4 M-4,-4 L-2.4,-4.2 M-3,-3 L-3.2,-1.4 M-3,-3 L-1.4,-3.2', 'archery bow shoot dart cupid'],
  ['pointing-hand', 'Pointing hand', 'M-1.6,-1.8 L-1.6,4 C-1.6,5.3 0.4,5.3 0.4,4 L0.4,0.6 L1.5,0.6 L2.6,0.6 L3.6,0.6 C4.4,0.6 4.6,0 4.6,-0.8 L4.6,-3.4 C4.6,-4.4 3.8,-5 2.8,-5 L-0.4,-5 C-1.4,-5 -2,-4.6 -2.6,-3.8 L-4.2,-1.6 C-4.8,-0.6 -3.6,0.2 -2.8,-0.6 Z M1.5,0.6 L1.5,-1 M2.6,0.6 L2.6,-1', 'finger cursor click index tap'],
  ['stairs-arrow', 'Stairs arrow', 'M-5,-4 L-2,-4 L-2,-1 L1,-1 L1,2 L4,2 L4,4.8 M2.6,3.4 L4,4.8 L5.4,3.4', 'steps level up climb progress'],
  ['fullscreen-corners', 'Fullscreen corners', 'M-5,2 L-5,5 L-2,5 M2,5 L5,5 L5,2 M5,-2 L5,-5 L2,-5 M-2,-5 L-5,-5 L-5,-2', 'frame brackets focus scan view'],
  ['north-arrow', 'North arrow', 'M0,5 L0,-1 M-2,3 L0,5 L2,3 M-2,-5 L-2,-2 L2,-5 L2,-2', 'map compass direction up'],
];

const BIOHAZARD = `O0,0 1 ${[90, 210, 330].map((a) => `N A${around(0, 0, 2.4, a)} 2.4 ${a - 100} ${a + 100}`).join(' ')}`;
const RECYCLING = (() => {
  const v = [[0, 4.8], [4.6, -3.2], [-4.6, -3.2]];
  return v.map((p, i) => {
    const q = v[(i + 1) % 3];
    const [dx, dy] = [q[0] - p[0], q[1] - p[1]];
    const len = Math.hypot(dx, dy);
    const at = (t, side = 0) => `${fix(p[0] + dx * t - (dy / len) * side)},${fix(p[1] + dy * t + (dx / len) * side)}`;
    return `M${at(0.2)} L${at(0.8)} M${at(0.62, 1.1)} L${at(0.8)} L${at(0.62, -1.1)}`;
  }).join(' ');
})();

const SIGNS = [
  ['stop-button', 'Stop button', 'O0,0 5 M-2,2 L2,2 L2,-2 L-2,-2 Z', 'square end halt media player'],
  ['eject-button', 'Eject button', 'M0,4 L4,-0.6 L-4,-0.6 Z M-4,-2.4 L4,-2.4 L4,-4 L-4,-4 Z', 'media player disc out open'],
  ['muted-speaker', 'Muted speaker', 'M-5,1.6 L-2.6,1.6 L0,4 L0,-4 L-2.6,-1.6 L-5,-1.6 Z M2,1.6 L3.5,0 L5,-1.6 M2,-1.6 L3.5,0 L5,1.6', 'mute silent sound off quiet volume'],
  ['bluetooth-sign', 'Bluetooth sign', 'M-2.6,2.4 L0,0 L2.6,-2.4 L0,-5 L0,0 L0,5 L2.6,2.4 L0,0 L-2.6,-2.4', 'wireless pair connect phone rune'],
  ['no-entry-sign', 'No entry sign', 'O0,0 5 M-3,0.9 L3,0.9 L3,-0.9 L-3,-0.9 Z', 'road traffic forbidden stop bar'],
  ['give-way-sign', 'Give way sign', 'M-5,4.2 L5,4.2 L0,-4.4 Z M-2.9,3 L2.9,3 L0,-2 Z', 'yield road traffic triangle'],
  ['biohazard-sign', 'Biohazard sign', BIOHAZARD, 'danger toxic virus infection warning'],
  ['flammable-sign', 'Flammable sign', 'M0,5 L5.4,-4.2 L-5.4,-4.2 Z M0,2 C-2.6,0 -2,-3 0,-3 C2,-3 2.6,-0.4 1,0.6 C1,-0.4 0.4,-0.8 0.2,0 C0,0.8 0.4,1.2 0,2', 'fire danger hazard burn warning'],
  ['voltage-sign', 'High voltage sign', 'M0,5 L5.4,-4.2 L-5.4,-4.2 Z M0.6,2.2 L-1.4,-1 L0.2,-1 L-0.6,-3.2 L1.6,-0.2 L0,-0.2 Z', 'electric danger hazard shock warning'],
  ['wheelchair-sign', 'Wheelchair sign', 'O-0.6,4 0.9 M-0.6,2.8 L-0.6,1.2 L-0.6,-0.4 L2.2,-0.4 L3.6,-3.6 L4.8,-3.6 M-0.6,1.2 L2,1.2 N A-0.4,-2 2.9 110 380', 'access disabled accessible parking'],
  ['parking-sign', 'Parking sign', 'M-4.6,4.6 L4.6,4.6 L4.6,-4.6 L-4.6,-4.6 Z M-1.4,-3 L-1.4,0 L-1.4,3 L0.6,3 A0.6,1.5 1.5 90 -90 L-1.4,0', 'car park road traffic letter'],
  ['hospital-sign', 'Hospital sign', 'M-4.6,4.6 L4.6,4.6 L4.6,-4.6 L-4.6,-4.6 Z M-1.8,3 L-1.8,0 L-1.8,-3 M1.8,3 L1.8,0 L1.8,-3 M-1.8,0 L1.8,0', 'road traffic doctor emergency letter'],
  ['close-button', 'Close button', 'O0,0 5 M-2,2 L0,0 L2,-2 M-2,-2 L0,0 L2,2', 'cancel delete exit dismiss error'],
  ['remove-button', 'Remove button', 'O0,0 5 M-2.6,0 L2.6,0', 'minus less delete subtract take away'],
  ['tick-button', 'Tick button', 'O0,0 5 M-2.6,0 L-0.8,-2 L2.8,2', 'done yes correct ok approve'],
  ['bookmark', 'Bookmark', 'M-3,5 L3,5 L3,-5 L0,-2.4 L-3,-5 Z', 'ribbon save favourite page marker'],
  ['price-tag', 'Price tag', 'M-5,0 L-1.6,3.6 L5,3.6 L5,-3.6 L-1.6,-3.6 Z O-1.8,0 0.9', 'label sale shop cost'],
  ['push-pin', 'Push pin', 'M-2.4,5 L-1.6,5 L1.6,5 L2.4,5 M-1.6,5 L-1.6,1.4 L-3.4,-0.4 L0,-0.4 L3.4,-0.4 L1.6,1.4 L1.6,5 M0,-0.4 L0,-5', 'thumbtack notice board pinned'],
  ['paper-clip', 'Paper clip', 'M2.6,2.6 L2.6,-2.6 A0.3,-2.6 2.3 0 -180 L-2,3.2 A-0.4,3.2 1.6 180 0 L1.2,-1.2 A0.1,-1.2 1.1 0 -180 L-1,1.4', 'attach office file attachment'],
  ['recycling-sign', 'Recycling sign', RECYCLING, 'recycle reuse green waste eco'],
  ['id-card', 'ID card', 'M-5,3.4 L5,3.4 L5,-3.4 L-5,-3.4 Z O-2.6,1.2 1 N A-2.6,-2.6 1.9 30 150 M0.6,1.4 L3.6,1.4 M0.6,-0.4 L3.6,-0.4 M0.6,-2.2 L2.6,-2.2', 'badge pass identity licence name'],
  ['bar-chart', 'Bar chart', 'M-5,-4 L-3.6,-4 L-1.6,-4 L-0.6,-4 L1.4,-4 L2.4,-4 L4.4,-4 M-3.6,-4 L-3.6,-1 L-1.6,-1 L-1.6,-4 M-0.6,-4 L-0.6,2 L1.4,2 L1.4,-4 M2.4,-4 L2.4,4.6 L4.4,4.6 L4.4,-4', 'graph statistics data columns growth'],
  ['toggle-switch', 'Toggle switch', 'M-2.4,2.6 L2.4,2.6 A2.4,0 2.6 90 -90 L-2.4,-2.6 A-2.4,0 2.6 270 90 O2.4,0 1.5', 'on off setting option slider'],
  ['crop-sign', 'Crop sign', 'M-3,5 L-3,3 L-3,-3 L3,-3 L5,-3 M-5,3 L-3,3 L3,3 L3,-3 L3,-5', 'cut trim image edit frame'],
  ['layers-sign', 'Layers sign', 'M0,5 L5,2.4 L0,-0.2 L-5,2.4 Z M-5,0 L0,-2.6 L5,0 M-5,-2.4 L0,-5 L5,-2.4', 'stack sheets levels design'],
  ['safety-shield', 'Safety shield', 'M0,5 L4.2,3.6 L4.2,0 C4.2,-2.6 2,-4.2 0,-5 C-2,-4.2 -4.2,-2.6 -4.2,0 L-4.2,3.6 Z M-2,0 L-0.6,-1.6 L2.2,1.6', 'secure protected safe guard tick'],
  ['zoom-in-sign', 'Zoom in sign', 'O-1,1 3.6 M1.6,-1.6 L5,-5 M-2.8,1 L-1,1 L0.8,1 M-1,2.8 L-1,1 L-1,-0.8', 'magnify plus enlarge closer'],
  ['filter-funnel', 'Filter funnel', 'M-5,4.4 L5,4.4 L1,-0.4 L1,-4.6 L-1,-3.4 L-1,-0.4 Z', 'sort sieve search narrow'],
  ['railway-crossing-sign', 'Railway crossing sign', 'M-4,5 L0,2.6 L4,0.2 M-4,0.2 L0,2.6 L4,5 M0,2.6 L0,-5', 'train level road warning post'],
  ['dead-end-sign', 'Dead end sign', 'M-4.6,4.6 L4.6,4.6 L4.6,-4.6 L-4.6,-4.6 Z M-2.6,1.6 L0,1.6 L2.6,1.6 L2.6,3 L-2.6,3 Z M0,1.6 L0,-3.2', 'no through road traffic closed'],
  ['speed-limit-sign', 'Speed limit sign', 'O0,0 5 M-0.6,2 L-2.6,2 L-2.6,0.2 L-1.4,0.2 A-1.4,-0.9 1.1 90 -150 N E1.6,0 1.1,2 0 360', 'fifty road traffic slow'],
  ['one-way-sign', 'One-way sign', 'M-5,2.4 L5,2.4 L5,-2.4 L-5,-2.4 Z M-3,0 L3,0 M1.4,1.4 L3,0 L1.4,-1.4', 'road traffic street direction'],
  ['cloud-download', 'Cloud download', 'M-3,-0.6 C-5.4,-0.6 -5.4,2.6 -3,2.6 C-3,5 0.6,5.4 1.4,3.4 C3.4,4.6 5.6,2.6 4.4,0.8 C5.6,0 4.8,-0.6 3.6,-0.6 M0,1.4 L0,-4.6 M-1.8,-2.8 L0,-4.6 L1.8,-2.8', 'save file sync internet storage'],
  ['folder', 'Folder', 'M-5,3.6 L-1.6,3.6 L-0.6,2.4 L5,2.4 L5,-3.6 L-5,-3.6 Z', 'files directory documents computer'],
  ['document', 'Document', 'M-3.4,5 L1.4,5 L3.4,3 L3.4,-5 L-3.4,-5 Z M1.4,5 L1.4,3 L3.4,3 M-1.6,0.6 L1.6,0.6 M-1.6,-1.4 L1.6,-1.4 M-1.6,-3.4 L0.4,-3.4', 'file page paper text sheet'],
  ['profile-sign', 'Profile sign', 'O0,0 5 O0,1.4 1.5 N A0,-4.4 3.4 40 140', 'account avatar member login user'],
  ['molecule', 'Molecule', 'O-2.6,-2 1.3 O2.8,-2.2 1.1 O0.4,2.8 1.6 M-1.54,-0.3 L-0.82,0.85 M1.39,0.73 L2.02,-0.58 M-0.6,-2.07 L1,-2.13', 'chemistry science atoms bonds water'],
  ['restroom-sign', 'Restroom sign', 'O-2.8,3.8 1 M-4,-4.8 L-4,2.2 L-1.6,2.2 L-1.6,-4.8 M-2.8,-1 L-2.8,-4.8 M0,5 L0,-5 O2.8,3.8 1 M2.8,2.4 L4.6,-2 L3.4,-2 L2.2,-2 L1,-2 Z M2.2,-2 L2.2,-4.8 M3.4,-2 L3.4,-4.8', 'toilet wc bathroom men women'],
];

const HEARTS = [
  ['winged-heart', 'Winged heart', 'M0,1.5 C0.5,2.8 2.5,2.8 2.5,1.1 C2.5,-0.4 0.8,-1.4 0,-2.2 M2.5,1.1 C3.6,3.4 6,3.6 7.2,2.6 C6.4,2 6.8,1.2 6,0.8 C5.6,0 5,0 4.4,-0.6 C3.6,-0.9 3,-0.7 2.4,-0.9 |', 'love angel fly wings valentine'],
  ['flaming-heart', 'Flaming heart', 'M0,1 C0.8,3 4,3 4,0.4 C4,-2 1.3,-3.6 0,-5 | M-3,3.4 L-2.4,5.2 L-1.4,4 L0,5.8 L1.4,4 L2.4,5.2 L3,3.4', 'love passion fire burning hot'],
  ['bandaged-heart', 'Bandaged heart', 'M0,3 C1,5.6 5,5.6 5,2.2 C5,-0.8 1.6,-2.8 0,-4.4 | M-2.4,1.6 L-1.2,2.8 L2.4,-0.8 L1.2,-2 Z D0,0.4', 'mend healing hurt fixed plaster'],
  ['love-letter', 'Love letter', 'M0,-1.2 C0.3,-0.6 1.2,-0.6 1.2,-1.3 C1.2,-1.9 0.4,-2.2 0,-2.6 | M-5,3.4 L5,3.4 L5,-3.4 L-5,-3.4 Z M-5,3.4 L0,-0.4 L5,3.4', 'mail valentine envelope message romance'],
  ['sparkling-heart', 'Sparkling heart', 'M0,2 C0.8,4 4,4 4,1.4 C4,-1 1.3,-2.6 0,-4 | M4.6,5.8 L4.6,4.6 L4.6,3.4 M3.4,4.6 L4.6,4.6 L5.8,4.6 M-4.6,-2.4 L-4.6,-3.4 L-4.6,-4.4 M-5.6,-3.4 L-4.6,-3.4 L-3.6,-3.4', 'love shine glitter cute valentine'],
  ['wedding-rings', 'Wedding rings', 'O-1.6,-1 3 N A1.8,-1 3 -105 105 M-1.6,2 L-2.6,3.4 L-1.6,4.6 L-0.6,3.4 Z', 'marriage engaged couple bride groom love'],
  ['love-message', 'Love message', 'M0,2.2 C0.4,3.2 1.9,3.2 1.9,1.9 C1.9,0.7 0.6,0 0,-0.6 | M-5,4.4 L5,4.4 L5,-2 L-1,-2 L-3.4,-4.8 L-3.4,-2 L-5,-2 Z', 'chat text valentine like comment'],
  ['heart-balloon', 'Heart balloon', 'M0,3.6 C0.9,5.8 4.4,5.8 4.4,2.9 C4.4,0.4 1.4,-1.2 0,-2.4 | M0,-2.4 L0.4,-3.4 L-0.4,-4.2 L0,-5.2', 'party valentine float gift love'],
  ['star-badge', 'Star badge', `O0,0 5 ${star(0, 0, 3.4, 1.4)}`, 'favourite rating award rank circle'],
  ['glowing-star', 'Glowing star', `${star(0, 0, 3, 1.3)} ${rays(0, 0, 3.7, 5, [54, 126, 198, 270, 342])}`, 'shine bright twinkle glow night'],
];

const MUSIC = [
  ['natural-sign', 'Natural sign', 'M-1.4,5 L-1.4,1.2 L-1.4,-2.2 L1.4,-1.2 L1.4,-5 M-1.4,1.2 L1.4,2.2 L1.4,-1.2', 'music notation accidental note'],
  ['quarter-rest', 'Quarter rest', 'M-1,5 L1.4,2.2 L-1,0 L1.2,-2.2 C-1.6,-1.6 -2,-4 0.4,-5', 'music silence pause notation'],
  ['fermata', 'Fermata', 'N A0,-2.4 5 20 160 D0,-0.8', 'music hold pause notation'],
  ['repeat-sign', 'Repeat sign', 'M3.6,5 L3.6,-5 L4.8,-5 L4.8,5 Z M1.8,5 L1.8,-5 D-0.4,1.4 D-0.4,-1.4', 'music notation again bar'],
  ['chord', 'Chord', 'N E-1.4,-3.6 1.8,1 0 360 N E-1.4,-0.6 1.8,1 0 360 N E-1.4,2.4 1.8,1 0 360 M1.2,-3.6 L1.2,5', 'music notes harmony triad piano'],
  ['equaliser-bars', 'Equaliser bars', 'M-4,-4 L-4,0 M-2,-4 L-2,3 M0,-4 L0,4.6 M2,-4 L2,1.4 M4,-4 L4,-1.6', 'volume levels spectrum audio sound'],
];

const PEOPLE = [
  ['walking-person', 'Walking person', 'O0,4 1 M0,3 L0,2 L0,-0.4 L-1.8,-4.8 M0,-0.4 L1.6,-2.6 L2.4,-4.8 M-2,0.2 L0,2 L2,0.6', 'walk stroll hike pedestrian step'],
  ['dancing-person', 'Dancing person', 'O0.4,4 1 M0.4,3 L0.2,1.8 L0,-0.6 L-1.4,-2.6 L-0.6,-4.8 M0,-0.6 L2,-2 L3.6,-0.8 M-2.6,4 L0.2,1.8 L2.8,2.8 L3.4,4.4', 'dance party disco move'],
  ['sitting-person', 'Sitting person', 'O-1,4 1 M-1,3 L-1,1.6 L-1,-0.6 L2,-0.6 L2,-4.6 M-1,1.6 L1.4,0.6 M-2.4,2.6 L-2.4,-1.6 L-2.4,-4.6 M-2.4,-1.6 L1,-1.6 L1,-4.6', 'sit chair rest wait seat'],
  ['meditating-person', 'Meditating person', 'M0,1.4 L2.6,-0.4 L3.6,-1.6 M0,-1.4 L4,-3.4 L0,-3.4 | O0,3.6 1.1 M0,2.5 L0,1.4 L0,-1.4', 'yoga zen calm lotus relax'],
  ['weightlifter', 'Weightlifter', 'M0,4.6 L2.4,4.6 L4.2,4.6 M4.2,3.4 L4.2,4.6 L4.2,5.8 M0,1 L2.4,2.6 L2.4,4.6 M0,-1.4 L1.6,-4.8 | O0,2.6 0.9 M0,1.7 L0,1 L0,-1.4', 'gym strong barbell lift sport'],
  ['swimmer', 'Swimmer', 'O-2,1.6 1 M-0.6,1 L1.2,2.6 L3.4,1.4 M-5,-1 Q-3.75,0.4 -2.5,-1 Q-1.25,-2.4 0,-1 Q1.25,0.4 2.5,-1 Q3.75,-2.4 5,-1 M-5,-3.6 Q-3.75,-2.2 -2.5,-3.6 Q-1.25,-5 0,-3.6 Q1.25,-2.2 2.5,-3.6 Q3.75,-5 5,-3.6', 'swim pool sea sport water'],
  ['footballer', 'Footballer', 'O-1,4 1 M-1,3 L-0.6,1.8 L0,-0.4 L-1.6,-2.4 L-2,-4.8 M0,-0.4 L2,-1.8 L3.2,-3.2 M-3,2.2 L-0.6,1.8 L1.4,3 O4.4,-4 0.9', 'football soccer kick ball sport player'],
  ['person-in-dress', 'Person in a dress', 'M0,3 L0.62,1.6 L2.4,-2.4 L1,-2.4 L0,-2.4 M0.62,1.6 L2.6,0.2 M1,-2.4 L1,-4.8 | O0,4 1', 'woman girl lady figure skirt'],
  ['footprint', 'Footprint', 'M-0.6,-5 C-2.6,-5 -2.6,-2 -1.6,-0.4 C-2.6,0.8 -2.6,3 -0.4,3 C2,3 2.4,0.6 1.6,-1 C2.4,-3 1.6,-5 -0.6,-5 D-2.2,4.4 D-0.6,4.8 D1,4.6 D2.4,3.8', 'foot step bare track walk'],
  ['brain', 'Brain', 'M0,4.4 C-2,5.4 -4.4,4.4 -4.4,2.4 C-5.6,1.4 -5.4,-1 -4.2,-1.8 C-4.4,-3.6 -2.4,-4.6 0,-3.8 | M0,4.4 L0,-3.8 M-2.6,2.4 C-1.6,1.6 -1.6,0.4 -2.6,-0.2 M2.6,2.4 C1.6,1.6 1.6,0.4 2.6,-0.2', 'mind think smart idea head organ'],
  ['lungs', 'Lungs', 'M1,2.6 C3.6,3.4 4.8,0 4.6,-2.6 C4.6,-4.4 2.4,-4.6 1,-3.4 L1,1.4 Z M0,2.4 L1,1.4 | M0,5 L0,2.4', 'breathe chest organ air body'],
  ['strong-arm', 'Strong arm', 'M-5,-3 L1,-3 C3,-3 3.6,-1 3.6,0.6 L3.6,3.4 C3.6,5.2 1.2,5.2 1.2,3.4 L1.2,1.4 C0.2,3 -2.6,2.8 -3,0.4 L-5,0.4', 'muscle biceps flex power gym'],
  ['person-with-stick', 'Person with a stick', 'O-0.6,4 1 M-0.6,3 L0,1 L0,-1 L-1.4,-4.8 M0,-1 L1.4,-4.8 M0,1 L2.2,0 L2.6,-4.8', 'old elderly cane walk grandparent'],
  ['skateboarder', 'Skateboarder', 'O0,4.2 0.9 M0,3.3 L0.2,2.2 L0.4,1 L-1.4,-1.2 L-1,-3.2 M0.4,1 L1.8,-1 L1.4,-3.2 M-2.4,2.6 L0.2,2.2 L2.6,3 M-3.4,-3.4 L-2.6,-3.8 L2.6,-3.8 L3.4,-3.4 D-1.8,-4.7 D1.8,-4.7', 'skateboard trick sport ride'],
];

// ---------------------------------------------------------------- faces

const SMILEYS = [
  ['yawning-face', 'Yawning face', 'O0,0 5 N A-1.8,1.6 0.9 20 160 N A1.8,1.6 0.9 20 160 N E0,-1.8 1.4,1.8 0 360', 'tired sleepy bored yawn'],
  ['sick-face', 'Sick face', 'O0,0 5 M-2.8,1 L-1,1.8 M1,1.8 L2.8,1 M-2.6,-2 L-1.3,-1.2 L0,-2 L1.3,-1.2 L2.6,-2', 'ill queasy green unwell yuck'],
  ['cold-face', 'Cold face', `N A0,0 5 298.6 601.4 A0,0 5 241.4 260.7 A0,0 5 260.7 279.3 A0,0 5 279.3 298.6 M${around(0, 0, 5, 241.4)} L-1.6,-6.4 L${around(0, 0, 5, 260.7)} M${around(0, 0, 5, 279.3)} L1.6,-6.4 L${around(0, 0, 5, 298.6)} D-1.8,1.2 D1.8,1.2 M-2.4,-1.6 L-1.2,-2.4 L0,-1.6 L1.2,-2.4 L2.4,-1.6`, 'freezing shiver winter icy brr'],
  ['smirking-face', 'Smirking face', 'O0,0 5 D-1.4,1.2 D2.2,1.2 M-2.8,2.2 L-0.8,2.2 M0.8,2.2 L2.8,2.2 M-1.6,-2.2 Q1,-2.6 2.6,-1', 'sly smug cheeky flirt'],
  ['grimacing-face', 'Grimacing face', 'O0,0 5 D-1.8,1.4 D1.8,1.4 M-2.7,-1 L-0.9,-1 L0.9,-1 L2.7,-1 L2.7,-2.8 L0.9,-2.8 L-0.9,-2.8 L-2.7,-2.8 Z M-0.9,-1 L-0.9,-2.8 M0.9,-1 L0.9,-2.8', 'awkward teeth eek nervous oops'],
  ['bandaged-face', 'Bandaged face', 'O0,0 5 D-1.8,0.6 D1.8,0.6 M-1.6,-2.4 Q0,-1.4 1.6,-2.4 M-4.5,2.2 L4.5,2.2 M-3.8,3.2 L3.8,3.2', 'hurt injured ouch accident bump'],
  ['melting-face', 'Melting face', 'N A0,0.6 4.6 200 -20 L4.32,-3.2 Q3.6,-4.4 2.9,-3.2 L2.9,-2.6 Q2,-1.4 1.1,-2.6 L1.1,-4 Q0.2,-5.4 -0.7,-4 L-0.7,-2.4 Q-1.6,-1.2 -2.5,-2.4 L-2.5,-3.6 Q-3.4,-5 -4.32,-3.6 Z D-1.8,2 D1.8,2 N A0,1.2 1.8 220 320', 'heat hot puddle drip embarrassed'],
  ['headphones-face', 'Headphones face', 'M5.2,1.8 L6.2,1.8 L6.2,-1.8 L5.2,-1.8 Z D1.6,0.8 | O0,0 4.2 N A0,-0.2 2.2 220 320 N A0,0 5.503 19.09 160.91', 'music listening dj gamer audio'],
  ['hair-bow-face', 'Hair bow face', 'M0,3.8 L2.6,6 L3,4.2 Z D1.6,0.2 | O0,-0.6 4.4 N A0,-0.8 2.2 220 320', 'girl cute ribbon pretty'],
  ['baby-face', 'Baby face', 'O0,0 5 D-1.8,1.2 D1.8,1.2 O0,-1.8 1.1 M0,5 C1.4,6.4 2.4,5 1.4,4.4', 'infant newborn dummy toddler little'],
  ['freckles-face', 'Freckles face', 'O0,0 5 D-1.8,1.6 D1.8,1.6 N A0,0.2 2.6 220 320 D-3,0 D-2.2,-0.6 D-3.2,-1 D3,0 D2.2,-0.6 D3.2,-1', 'cute kid spots cheeks'],
  ['block-face', 'Block face', 'M-4.6,4.6 L4.6,4.6 L4.6,-4.6 L-4.6,-4.6 Z D-1.8,1.4 D1.8,1.4 M-2,-1.6 L2,-1.6', 'square cube head game steve'],
  ['squinting-face', 'Squinting face', 'O0,0 5 M-2.8,2 L-1.2,1.2 L-2.8,0.4 M2.8,2 L1.2,1.2 L2.8,0.4 M-2.6,-2 L-1.3,-1.2 L0,-2 L1.3,-1.2 L2.6,-2', 'squint ugh frustrated argh'],
  ['wide-eyed-face', 'Wide-eyed face', 'O0,0 5 O-1.8,1 1.3 O1.8,1 1.3 D-1.8,1 D1.8,1 M-1,-2.6 L1,-2.6', 'stare shocked awake owl'],
  ['buck-teeth-face', 'Buck teeth face', 'O0,0 5 D-1.8,1.4 D1.8,1.4 M-2.4,-1 L-0.8,-1 L0,-1 L0.8,-1 L2.4,-1 M-0.8,-1 L-0.8,-2.6 L0,-2.6 L0.8,-2.6 L0.8,-1 M0,-1 L0,-2.6', 'teeth goofy beaver rabbit silly'],
  ['three-eyed-face', 'Three-eyed face', 'O0,0 5 D-2,1 D2,1 D0,2.8 N A0,0 2.6 220 320', 'alien mutant third eye weird'],
];

const CHARACTERS = [
  ['witch-face', 'Witch face', 'O0,-1.6 3.2 D-1.2,-1 D1.2,-1 N A0,-1.8 1.6 220 320 M-5,1.6 L-2.6,1.6 L0,1.6 L2.6,1.6 L5,1.6 M-2.6,1.6 L0,6 L2.6,1.6', 'halloween hag hat spell'],
  ['elf-face', 'Elf face', 'M3.6,1.2 L6,3.4 L3.7,-0.8 D1.4,0.8 | O0,0 3.8 N A0,-0.2 2 220 320', 'fantasy pointy ears fairy christmas'],
  ['mummy-face', 'Mummy face', 'O0,0 5 M-4.6,2 L4.6,2 M-5,0 L5,0 M-4.6,-2 L4.6,-2 M-3,-4 L3,-4 D-1.6,1 D1.6,1', 'halloween egypt bandages monster undead'],
  ['monster-face', 'Monster face', 'M-3.6,4 L3.6,4 L3.6,2.6 L3.6,-1.6 L3.6,-4.6 L-3.6,-4.6 L-3.6,-1.6 L-3.6,2.6 Z M-3.6,2.6 L-2.4,1.6 L-1.2,2.6 L0,1.6 L1.2,2.6 L2.4,1.6 L3.6,2.6 D-1.6,0 D1.6,0 M-1.6,-2.6 L1.6,-2.6 M-3.6,-1.6 L-5,-1.6 M3.6,-1.6 L5,-1.6', 'frankenstein halloween bolts green creature'],
  ['queen-face', 'Queen face', 'O0,-1 3.6 D-1.4,-0.4 D1.4,-0.4 N A0,-1.2 1.8 220 320 M-2.4,3.2 L-2.8,5.6 L-1.2,4.4 L0,5.8 L1.2,4.4 L2.8,5.6 L2.4,3.2 Z', 'princess royal girl fairy tale crown'],
  ['chef-face', 'Chef face', 'O0,-2.2 2.8 D-1.2,-1.6 D1.2,-1.6 N A0,-2.2 1.6 220 320 M-2.4,1.6 L-2.4,3 C-4.4,3.2 -4.2,6 -1.6,5.4 C-0.8,6.6 0.8,6.6 1.6,5.4 C4.2,6 4.4,3.2 2.4,3 L2.4,1.6 Z', 'cook kitchen baker restaurant hat'],
  ['grandma-face', 'Grandma face', 'O0,-0.8 3.8 O-1.5,-0.2 1 O1.5,-0.2 1 M-0.5,-0.2 L0.5,-0.2 N A0,-1.2 2 235 305 O0,5 1.2', 'granny old lady nan bun glasses'],
  ['hero-face', 'Hero face', 'O0,0 5 M-4.6,2 Q0,3 4.6,2 M-4.9,0 Q0,-0.6 4.9,0 D-1.8,1.1 D1.8,1.1 N A0,-0.6 2.6 230 310', 'superhero mask comic cape power'],
  ['demon-mask', 'Demon mask', 'M0,3.8 L2,3.8 L3.8,3 C4.6,0 3.6,-3.6 0,-4.8 M3.8,3 L4.8,6 L2,3.8 M2.8,1.6 L1,0.8 M0,-2 L0.4,-2 L1.2,-2 L2,-2 M0.4,-2 L0.8,-3.2 L1.2,-2 |', 'oni japan devil ogre horns fangs'],
  ['tiki-mask', 'Tiki mask', 'M-3,5 L3,5 L3,-5 L-3,-5 Z O-1.3,2.4 0.9 O1.3,2.4 0.9 M0,0.8 L0,-0.8 M-2,-1.8 L0,-1.8 L2,-1.8 L2,-3.6 L0,-3.6 L-2,-3.6 Z M0,-1.8 L0,-3.6', 'totem hawaii tribal wooden idol'],
  ['hockey-mask', 'Hockey mask', 'N E0,0 3.8,5 0 360 O-1.5,1.4 0.9 O1.5,1.4 0.9 D0,-0.6 D-1.2,-1.8 D1.2,-1.8 D0,-3 D-1.6,3.6 D1.6,3.6', 'goalie sport scary horror'],
  ['diving-helmet', 'Diving helmet', 'O0,0.6 4.4 O0,0.6 2.4 M-3.2,-2.4 L-4.4,-5 L4.4,-5 L3.2,-2.4 D0,3.9 D3.3,0.6 D-3.3,0.6', 'deep sea scuba copper underwater'],
  ['pharaoh-face', 'Pharaoh face', 'M0,3.8 L2.6,3.8 L4.237,-2.6 L4.8,-4.8 L2.2,-4.8 L2.329,-2.6 L4.237,-2.6 D1,0.6 | O0,0 2.8 M-1,-1.2 L1,-1.2', 'egypt king mummy nile gold'],
  ['screen-face', 'Screen face', 'M-4.6,4 L4.6,4 L4.6,-2.6 L0,-2.6 L-4.6,-2.6 Z D-1.8,1.6 D1.8,1.6 N A0,1 2.2 225 315 M0,-2.6 L0,-4.4 M-2.4,-4.4 L0,-4.4 L2.4,-4.4', 'monitor computer tv head smile'],
  ['yeti-face', 'Yeti face', `${star(0, 0, 5, 4.1, 14)} D-1.6,1 D1.6,1 M-1.6,-1.6 L1.6,-1.6`, 'abominable snowman bigfoot furry monster'],
  ['scream-mask', 'Scream mask', 'M0,5 C3.6,5 4.2,1 3,-2 C2.4,-4 1,-5 0,-5 N E1.5,1.6 0.8,1.4 0 360 | N E0,-2.2 0.9,1.6 0 360', 'horror halloween ghost spooky shout'],
  ['snowman-face', 'Snowman face', 'O0,-0.6 4.2 D-1.6,0.6 D1.6,0.6 M0,-0.4 L2.2,-1 L0,-1.4 Z D-2,-2.4 D-1,-3 D0,-3.2 D1,-3 D2,-2.4', 'winter carrot coal frosty christmas'],
  ['gas-mask', 'Gas mask', 'O0,1.4 3.6 O-1.5,2.2 1 O1.5,2.2 1 O0,-4.4 1.4', 'toxic apocalypse filter breathing hazmat'],
];

export const EMBLEM_SHAPES = [
  ...pictures('symbols', 'Arrows', ARROWS),
  ...pictures('symbols', 'Signs', SIGNS),
  ...pictures('symbols', 'Hearts and sparkles', HEARTS),
  ...pictures('symbols', 'Music', MUSIC),
  ...pictures('symbols', 'People and body', PEOPLE),
  ...pictures('faces', 'Smileys', SMILEYS),
  ...pictures('faces', 'Characters', CHARACTERS),
];
