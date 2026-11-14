// Still more symbols (arrows, signs, hearts, music, people) and faces, added
// when the library grew to 1,624 shapes. Each one is a short drawing in the
// language described in shape-kit.js ("drawings"), in whatever units suit the
// picture.

import { drawnShape, parsePath, joinDrawings, spin, stamp, around } from './shape-kit.js';

const HEART = 'M0,7.4 C1,10 5,10 5,6.6 C5,3.6 1.6,1.6 0,0 |';
const DROP = 'M0,10 C0.6,7.5 3.6,5.5 3.6,3.2 A0,3.2 3.6 0 -180 C-3.6,5.5 -0.6,7.5 0,10';
const FACE = 'O0,0 5';
const EYES = 'D-1.8,1.4 D1.8,1.4';
// a stick figure: head, body, arms held out to the sides, legs
const PERSON = 'O0,3.9 1.1 M0,2.8 L0,-1 M-2.4,1.2 L0,2 L2.4,1.2 M-1.6,-5 L0,-1 L1.6,-5';
const PERSON_ARMS_DOWN = 'O0,3.9 1.1 M0,2.8 L0,-1 M-1.5,-0.4 L0,2 L1.5,-0.4 M-1.5,-5 L0,-1 L1.5,-5';

/** A star outline with `k` points around (cx, cy): `out` to the tips, `inn` to the corners between them. */
const star = (cx, cy, out, inn, k = 5, first = 90) => `M${Array.from({ length: 2 * k }, (_, i) => around(cx, cy, i % 2 ? inn : out, first + (180 * i) / k)).join(' L')} Z`;
/** The same drawing, turned. */
const tilted = (d, turn) => () => stamp(d, [[0, 0, 1, turn]]);

/** A line that winds outwards, clockwise, and leaves to the right as an arrow. */
function spiralArrow() {
  const pts = Array.from({ length: 55 }, (_, i) => around(0, 0, 0.6 + 3.8 * (i / 54), 270 - 10 * i));
  return `M${pts.join(' L')} L2,4.4 M0.5,5.5 L2,4.4 L0.5,3.3`;
}

// [id, name, drawing, extra fields]
const ARROWS = [
  ['arrow-circle', 'Arrow in a circle', 'O0,0 5 M0,-2.8 L0,2.8 M-2,0.8 L0,2.8 L2,0.8', { tags: 'up button round' }],
  ['arrow-zigzag', 'Zigzag arrow', 'M-4.4,4 L0.8,1 L-1.2,-0.4 L4,-3.8 M2.1,-3.86 L4,-3.8 L3.29,-2.04', { tags: 'bounce down ricochet bolt' }],
  ['arrow-loop', 'Loop arrow', 'M-5,-2 L-1,-2 A-1,0.4 2.4 -90 270 L4.6,-2 M3,-0.5 L4.6,-2 L3,-3.5', { tags: 'roll curl looping stunt' }],
  ['arrows-in', 'Arrows inward', () => spin('M4.6,4.6 L1.4,1.4 M1.4,3.3 L1.4,1.4 L3.3,1.4', 4), { tags: 'shrink collapse gather centre center' }],
  ['arrow-download', 'Download arrow', 'M0,5 L0,-1.4 M-2.4,1 L0,-1.4 L2.4,1 M-4.4,-1.6 L-4.4,-4.4 L4.4,-4.4 L4.4,-1.6', { tags: 'save get tray down' }],
  ['fast-forward', 'Fast forward', 'M-4.6,3.4 L-4.6,-3.4 L0,0 Z M0,3.4 L0,0 L0,-3.4 L4.6,0 Z', { tags: 'speed skip next media' }],
  ['arrow-return', 'Return arrow', 'M4.4,4 L4.4,-1.4 L-4.4,-1.4 M-2.2,0.8 L-4.4,-1.4 L-2.2,-3.6', { tags: 'enter back key newline' }],
  ['arrow-spiral', 'Spiral arrow', spiralArrow, { tags: 'whirl spin twist' }],
  ['arrow-merge', 'Merge arrow', 'M-3.4,-5 C-3.4,-1.6 0,-1.6 0,1.4 M3.4,-5 C3.4,-1.6 0,-1.6 0,1.4 L0,4.8 M-1.8,3 L0,4.8 L1.8,3', { tags: 'join together two into one' }],
  ['arrow-nav', 'Navigation arrow', 'M0,5 L3.2,-4.4 L0,-2.2 L-3.2,-4.4 Z', { tags: 'gps location north direction compass' }],
  ['arrow-wavy', 'Wavy arrow', 'M-5,-1 C-3.8,2.2 -2.6,2.2 -1.4,-0.2 C-0.2,-2.6 1,-2.6 2.2,-0.2 L3.6,2.4 M3.81,0.61 L3.6,2.4 L1.99,1.59', { tags: 'squiggle heat wave snake' }],
];

const SIGNS = [
  ['latin-cross', 'Cross', 'M0,5 L1.2,5 L1.2,2.4 L3.6,2.4 L3.6,0 L1.2,0 L1.2,-5 L0,-5 |', { tags: 'church christian faith' }],
  ['sand-timer', 'Sand timer', 'M2.4,5 C2.4,2 0.5,1 0.5,0 C0.5,-1 2.4,-2 2.4,-5 | M-3.2,5 L3.2,5 M-3.2,-5 L3.2,-5 D0,-3.8 D-0.9,-4.3 D0.9,-4.3 D0,1.8', { tags: 'hourglass time wait turn' }],
  ['chain', 'Chain', tilted('E-4,0 1.4,1.1 0 360 N E0,0 1.4,1.1 0 360 N E4,0 1.4,1.1 0 360 M-3.3,0 L-0.7,0 M0.7,0 L3.3,0', 45), { tags: 'link links metal bind lock connect' }],
  ['thought-bubble', 'Thought bubble', 'M-3.4,0 L3.4,0 B3.8,3.1 0.9 B0.8,5 0.8 B-2.9,3.6 0.85 B-3.4,0 0.9 Z O-3.4,-1.9 0.9 O-4.9,-3.6 0.5', { tags: 'think idea dream comic cloud' }],
  ['sliders', 'Sliders', 'M-5,3 L-2.2,3 M-0.6,3 L5,3 O-1.4,3 0.8 M-5,0 L1,0 M2.6,0 L5,0 O1.8,0 0.8 M-5,-3 L-3.2,-3 M-1.6,-3 L5,-3 O-2.4,-3 0.8', { tags: 'settings controls adjust mixer options' }],
  ['exit-sign', 'Exit sign', 'M-0.8,5 L-4.4,5 L-4.4,-5 L-0.8,-5 M-1.8,0 L4.8,0 M2.6,2.2 L4.8,0 L2.6,-2.2', { tags: 'leave logout door out quit' }],
  ['eye-closed', 'Closed eye', 'M2.48,-0.963 L2.99,-2.37 M4.464,0.137 L5.39,-1.05 | A0,5.85 7.25 -133.6 -46.4 M0,-1.4 L0,-2.9', { tags: 'sleep hidden blind lashes shut' }],
  ['world', 'World', 'O0,0 5 E0,0 2.3,5 90 450 M-5,0 L5,0 M-4.33,2.5 L4.33,2.5 M-4.33,-2.5 L4.33,-2.5', { tags: 'globe earth internet web planet language' }],
  ['share', 'Share sign', 'O-3,0 1.5 O3,3.2 1.5 O3,-3.2 1.5 M-1.6765,0.7059 L1.6765,2.4941 M-1.6765,-0.7059 L1.6765,-2.4941', { tags: 'network connect social send nodes' }],
  ['quest-marker', 'Quest marker', 'M0,5 L4.2,0 L0,-5 L-4.2,0 Z M0,2.4 L0,-0.8 D0,-2.4', { tags: 'exclamation mission npc alert diamond task' }],
  ['help-sign', 'Help sign', 'O0,0 5 N A0,1.3 1.7 160 -50 Q0,-0.7 0,-1.3 D0,-3', { tags: 'question faq hint unknown ask' }],
  ['health-bar', 'Health bar', 'M-5,1.3 L1.4,1.3 L5,1.3 L5,-1.3 L1.4,-1.3 L-5,-1.3 Z M1.4,1.3 L1.4,-1.3 M-3.8,0 L0.2,0', { tags: 'hp life energy progress loading boss' }],
  ['add-button', 'Add button', 'O0,0 5 M-2.8,0 L2.8,0 M0,2.8 L0,-2.8', { tags: 'plus new more zoom create' }],
  ['triquetra', 'Triquetra', 'A0,-2.5 4.33 180 0 A2.165,1.25 4.33 300 120 A-2.165,1.25 4.33 60 -120', { tags: 'celtic knot trinity three charm' }],
  ['triskelion', 'Triskelion', () => spin('M0,0 C1.8,0.2 3,1.8 2.4,3.4 C1.9,4.8 0.2,5 -0.5,3.9 C-1,3 -0.3,2.2 0.5,2.6', 3), { tags: 'celtic spiral three legs triple swirl' }],
  ['eye-horus', 'Eye of Horus', 'M-4.6,1 Q-1,4.2 3.6,1 Q-1,-1.4 -4.6,1 O-0.8,1.2 1 M-5.2,3.6 Q-1,5.6 4.8,3.2 M-0.8,-0.2 L-0.8,-3.6 M0.7,-0.06 C1.4,-3 3.2,-3.8 4.4,-2.8 C5,-2.2 4.4,-1.4 3.8,-1.8', { tags: 'egypt ra wedjat protection pharaoh' }],
  ['celtic-cross', 'Celtic cross', 'M0,5 L0,-5 M-3.4,1.6 L3.4,1.6 O0,1.6 2', { tags: 'irish ring church faith' }],
  ['fleur-de-lis', 'Fleur-de-lis', 'M0,5 C1.8,3 1.8,0.6 0.8,-1 M1.6,-1 C1.6,1.2 2.8,2.8 4,2.4 C5,2 4.9,0.5 3.8,0.4 M0.8,-1.9 Q1.2,-3.6 2.6,-3.8 M0,-1.9 L0.8,-1.9 L2.4,-1.9 L2.4,-1 L1.6,-1 L0.8,-1 L0,-1 | M0,-1.9 L0,-5', { tags: 'lily france royal scout french' }],
];

const HEARTS = [
  ['heart-lock', 'Locked heart', `${HEART} O0,5.6 0.9 M0,4.7 L0,3`, { tags: 'love keyhole secret padlock' }],
  ['heart-pulse', 'Heart with pulse', `${HEART} M-3.2,5.4 L-1.5,5.4 L-0.7,6.9 L0.4,3.8 L1.2,5.4 L3.2,5.4`, { tags: 'health life beat alive doctor' }],
  ['heart-plus', 'Heart with plus', `${HEART} M-1.6,5.2 L1.6,5.2 M0,6.8 L0,3.6`, { tags: 'health heal extra life add medic' }],
  ['heart-crown', 'Crowned heart', `${HEART} M-2.8,10 L-2.8,12.6 L-1.4,11.2 L0,13 L1.4,11.2 L2.8,12.6 L2.8,10 Z`, { tags: 'love king queen royal' }],
  ['heart-key', 'Heart key', () => joinDrawings(stamp(HEART, [[0, 1, 0.5]]), parsePath('M0,1 L0,-5 M0,-3.2 L1.7,-3.2 M0,-5 L1.7,-5')), { tags: 'love unlock secret' }],
  ['star-double', 'Double star', () => `${star(0, 0, 5, 2.1)} ${star(0, 0, 2.5, 1.05)}`, { tags: 'rank favourite favorite nested' }],
  ['star-rating', 'Star rating', () => stamp(star(0, 0, 1, 0.42), [[-3.4, 0, 1.5, 15], [0, 1.2, 2.1], [3.4, 0, 1.5, -15]]), { tags: 'three stars level score review rank best win' }],
];

const MUSIC = [
  ['flat-sign', 'Flat sign', 'M-1.4,5 L-1.4,-4 C1.2,-2.8 2.8,-1 2.4,0.6 C2,2 0,1.8 -1.4,0.4', { tags: 'music note lower b' }],
  ['sound-wave', 'Sound wave', 'M-4.9,-1 L-4.9,1 M-3.5,-2.6 L-3.5,2.6 M-2.1,-4.2 L-2.1,4.2 M-0.7,-1.6 L-0.7,1.6 M0.7,-3.2 L0.7,3.2 M2.1,-5 L2.1,5 M3.5,-2.2 L3.5,2.2 M4.9,-0.8 L4.9,0.8', { tags: 'audio voice equalizer bars music volume' }],
];

const PEOPLE = [
  ['people-two', 'Two people', () => stamp(PERSON, [[-2.4, 0], [2.4, 0]]), { tags: 'friends couple team together hands' }],
  ['family', 'Family', () => stamp(PERSON_ARMS_DOWN, [[-3.4, 0], [3.4, 0], [0, -2, 0.6]]), { tags: 'parents child people group kids' }],
  ['tooth', 'Tooth', 'M0,3.6 C1.4,5 4,4.6 4,2 C4,0 3,-1 2.8,-4 C2.7,-5.4 1.5,-5 1.3,-3.4 C1.1,-2 0.7,-1.2 0,-1.2 |', { tags: 'dentist teeth bite molar' }],
  ['googly-eyes', 'Googly eyes', 'E-2.7,0 2.2,3 0 360 N E2.7,0 2.2,3 0 360 O-2,-0.7 0.9 O3.4,-0.7 0.9', { tags: 'look watch cartoon stare funny' }],
];

const SMILEYS = [
  ['face-kiss', 'Kissing face', `${FACE} ${EYES} M-0.3,-1 Q1.2,-1.6 -0.3,-2.2 Q1.2,-2.8 -0.3,-3.4`, { tags: 'love smooch kiss' }],
  ['face-eyeroll', 'Rolling eyes', `${FACE} O-1.9,1.3 1.3 O1.9,1.3 1.3 D-1.9,2 D1.9,2 M-1.6,-2.4 L1.6,-2.4`, { tags: 'bored whatever annoyed' }],
  ['face-mask', 'Masked face', `${FACE} D-1.8,1.8 D1.8,1.8 M-2.6,0.2 L2.6,0.2 L2.6,-2.4 Q0,-3.8 -2.6,-2.4 Z M-2.6,-1.1 L2.6,-1.1 M-2.6,0.2 L-4.9,1 M2.6,0.2 L4.9,1`, { tags: 'sick doctor ill medical health' }],
  ['face-party', 'Party face', 'O0,-0.8 4.2 D-1.6,0 D1.6,0 M-2,-2.2 Q0,-4.2 2,-2.2 M-2.409,2.64 L0,6.6 L2.409,2.64 D-4.6,4.4 D4.4,5 D4.9,2.4', { tags: 'celebrate birthday hat fun' }],
  ['face-monocle', 'Monocle face', `${FACE} D-1.8,1.4 O1.8,1.4 1.3 M1.8,0.1 L2.3,-3.2 M-1.6,-2.6 L1,-2.6 M-2.8,2.9 L-0.9,2.9`, { tags: 'fancy gentleman inspect posh' }],
  ['face-blush', 'Blushing face', `${FACE} D-1.8,1.6 D1.8,1.6 M-1.8,-1.8 Q0,-3.6 1.8,-1.8 M-3.7,0.3 L-3.1,-0.5 M-2.8,0.3 L-2.2,-0.5 M3.7,0.3 L3.1,-0.5 M2.8,0.3 L2.2,-0.5`, { tags: 'shy embarrassed cute' }],
  ['face-pleading', 'Pleading face', `${FACE} O-1.9,0.9 1.4 O1.9,0.9 1.4 D-2.3,1.4 D1.5,1.4 M-1,-3 Q0,-2.2 1,-3 M-3.2,2.7 L-1.4,3.3 M3.2,2.7 L1.4,3.3`, { tags: 'puppy eyes please beg cute' }],
  ['face-sweat', 'Sweating face', () => joinDrawings(parsePath(`${FACE} ${EYES} M-2,-1.6 Q0,-3.2 2,-1.6`), stamp(DROP, [[2.8, 1.95, 0.17]])), { tags: 'nervous phew hot awkward' }],
  ['face-calm', 'Calm face', `${FACE} M-2.8,1.7 Q-1.8,0.7 -0.8,1.7 M0.8,1.7 Q1.8,0.7 2.8,1.7 M-1.6,-2 Q0,-3.2 1.6,-2`, { tags: 'relaxed peaceful content zen happy' }],
];

const CHARACTERS = [
  ['poo', 'Poo', 'M-4.4,-4.6 L4.4,-4.6 Q5.6,-2.8 3.6,-1.8 Q4.6,0 2.6,0.9 Q3.2,2.6 1,3 Q0.8,4.6 -1,5 Q-0.2,3.8 -1.4,3 Q-3.2,2.6 -2.6,0.9 Q-4.6,0 -3.6,-1.8 Q-5.6,-2.8 -4.4,-4.6 D-1.4,-1.5 D1.4,-1.5 M-1.6,-2.9 Q0,-4 1.6,-2.9', { tags: 'poop emoji funny pile swirl' }],
  ['face-cowboy', 'Cowboy face', 'M2.6,2.816 C2.8,6.2 1,5.2 0,4.8 | O0,-1.4 3.6 D-1.4,-0.8 D1.4,-0.8 M-1.6,-2.6 Q0,-4 1.6,-2.6 M-5.4,3.2 Q0,2.2 5.4,3.2', { tags: 'hat western sheriff yeehaw' }],
  ['face-santa', 'Santa face', 'M3.4,1.6 C4.4,-1 3,-4.4 0,-5 M0,-1 Q1.4,-0.2 2.4,-1.4 Q1,-2 0,-1 | M-3.4,1.6 L3.4,1.6 L3.4,2.8 L3,2.8 L-3,2.8 L-3.4,2.8 Z M-3,2.8 C-2,5.4 0.6,6 3.405,4.897 O4.1,4.5 0.8 M3,2.8 Q3.4,3.4 3.51,3.959 D-1.4,0.5 D1.4,0.5', { tags: 'christmas claus beard father winter' }],
  ['face-vampire', 'Vampire face', `${FACE} D-1.8,1 D1.8,1 M-2.4,-2 Q0,-3.6 2.4,-2 M-1.2,-2.6 L-0.9,-3.9 L-0.5,-2.765 M1.2,-2.6 L0.9,-3.9 L0.5,-2.765 M-4.33,2.5 Q-2,4.4 0,2.6 Q2,4.4 4.33,2.5`, { tags: 'dracula fangs halloween bite' }],
  ['face-zombie', 'Zombie face', 'M-3.6,4.6 L-3,4.6 L-1,4.6 L3.6,4.6 Q4.4,4.6 4.4,3.8 L4.4,-3 Q4.4,-4.8 2.6,-4.8 L-2.6,-4.8 Q-4.4,-4.8 -4.4,-3 L-4.4,3.8 Q-4.4,4.6 -3.6,4.6 Z O-1.8,1.2 1.2 O1.9,1 0.7 M-2.4,-2.4 L2.4,-2.4 M-1.6,-1.7 L-1.6,-3.1 M0,-1.7 L0,-3.1 M1.6,-1.7 L1.6,-3.1 M-3,4.6 L-2,3.4 L-1,4.6', { tags: 'undead monster halloween stitches' }],
  ['face-king', 'King face', 'O0,-1.2 3.8 D-1.4,-0.6 D1.4,-0.6 M-1.6,-2.4 Q0,-3.8 1.6,-2.4 M-2.8,3.2 L-2.8,5.8 L-1.4,4.5 L0,6.2 L1.4,4.5 L2.8,5.8 L2.8,3.2 Z', { tags: 'crown royal queen prince' }],
  ['astronaut', 'Astronaut', `${FACE} M-3.2,1.8 Q0,3 3.2,1.8 L3.2,-1 Q0,-2.6 -3.2,-1 Z M-2.2,0.9 L-1.2,1.5 M-3,-4 L-3.6,-5.4 L3.6,-5.4 L3,-4`, { tags: 'space helmet moon nasa cosmonaut' }],
  ['face-wizard', 'Wizard face', 'M-4.6,1.6 L-3,1.6 L3,1.6 L4.6,1.6 M-3,1.6 L0.6,6.6 L3,1.6 M-3,1.6 L-2.6,-1.4 L0,-5 L2.6,-1.4 L3,1.6 D-1.4,0.4 D1.4,0.4 M0,-0.9 Q-1.2,-0.1 -1.9,-1.3 M0,-0.9 Q1.2,-0.1 1.9,-1.3 D0.4,3.6', { tags: 'mage magic beard hat merlin sorcerer' }],
  ['slime', 'Slime', 'M4.6,-4 C4.6,2 2.6,4.6 0,4.6 M4.6,-4 Q3.4,-5.2 2.3,-4 Q1.2,-5.2 0,-4 | D-1.6,0.8 D1.6,0.8 M-1.4,-1.2 Q0,-2.4 1.4,-1.2', { tags: 'blob monster jelly cute goo' }],
];

const pictures = (cat, sub, list) => list.map(([id, name, draw, extra = {}]) => drawnShape({ id, name, cat, sub, draw, ...extra }));

export const MARK_SHAPES = [
  ...pictures('symbols', 'Arrows', ARROWS),
  ...pictures('symbols', 'Signs', SIGNS),
  ...pictures('symbols', 'Hearts and sparkles', HEARTS),
  ...pictures('symbols', 'Music', MUSIC),
  ...pictures('symbols', 'People and body', PEOPLE),
  ...pictures('faces', 'Smileys', SMILEYS),
  ...pictures('faces', 'Characters', CHARACTERS),
];
