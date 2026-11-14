// More symbols (arrows, signs, hearts, music, star signs, people, hands) and
// faces. Each one is a short drawing in the language described in shape-kit.js
// ("drawings"), in whatever units suit the picture.

import { drawnShape, parsePath, joinDrawings, spin, stamp, around } from './shape-kit.js';

const HEART = 'M0,7.4 C1,10 5,10 5,6.6 C5,3.6 1.6,1.6 0,0 |';
const SPARKLE = 'M0,5 Q1.3,1.3 5,0 Q1.3,-1.3 0,-5 Q-1.3,-1.3 -5,0 Q-1.3,1.3 0,5';
const SKULL = 'A0,6 4 90 -40 L2.2,2.6 L2.2,0 L0,0 O1.6,5.6 1 M0.75,0 L0.75,1.6 | M0,4.2 L0.55,3.2 L-0.55,3.2 Z';

/** A star outline with `k` points around (cx, cy): `out` to the tips, `inn` to the corners between them. */
const star = (cx, cy, out, inn, k = 5, first = 90) => `M${Array.from({ length: 2 * k }, (_, i) => around(cx, cy, i % 2 ? inn : out, first + (180 * i) / k)).join(' L')} Z`;

// [id, name, drawing, extra fields]
const ARROWS = [
  ['arrow-outline', 'Block arrow', 'M0,10 L4.4,5.4 L1.8,5.4 L1.8,0 L0,0 |', { tags: 'thick pointer up' }],
  ['arrow-curved', 'Curved arrow', 'A0,0 5 180 20 M5.595,3.633 L4.698,1.71 L2.775,2.607', { tags: 'bend arc over' }],
  ['arrow-uturn', 'U-turn arrow', 'M-2.5,0 L-2.5,6 A0,6 2.5 180 0 L2.5,2 M1,3.6 L2.5,2 L4,3.6', { tags: 'back return' }],
  ['arrow-split', 'Split arrow', 'M0,4 L3.5,7.5 M3.5,5.3 L3.5,7.5 L1.3,7.5 | M0,0 L0,4', { tags: 'fork two ways branch' }],
  ['arrows-four', 'Four arrows', () => spin('M0,0 L0,5 M-1.5,3.5 L0,5 L1.5,3.5', 4), { tags: 'move all directions' }],
  ['arrows-swap', 'Swap arrows', 'M-4.5,1.6 L4.5,1.6 M2.9,3.2 L4.5,1.6 M4.5,-1.6 L-4.5,-1.6 M-2.9,-3.2 L-4.5,-1.6', { tags: 'exchange trade left right' }],
  ['arrows-cycle', 'Cycle arrows', () => spin('A0,0 4.5 80 -10 M6.17,0.436 L4.432,-0.781 L3.215,0.958', 3), { tags: 'recycle refresh loop' }],
  ['arrow-trend', 'Trend arrow', 'M-5,-3 L-2,1.5 L0,-1 L4.4,4 M4.4,1.6 L4.4,4 L2,4', { tags: 'growth chart up rising' }],
  ['pointer', 'Mouse pointer', 'M-3,5 L-3,-4.4 L-0.7,-2.3 L0.9,-5.6 L2.3,-4.9 L0.8,-1.7 L4,-1.5 Z', { tags: 'cursor click' }],
];

const SIGNS = [
  ['power', 'Power sign', 'A0,0 4.5 60 -240 M0,1.4 L0,6.2', { tags: 'on off button' }],
  ['radiation', 'Radiation sign', () => joinDrawings(
    spin(`M${around(0, 0, 1.5, 60)} L${around(0, 0, 5, 60)} A0,0 5 60 120 L${around(0, 0, 1.5, 120)} A0,0 1.5 120 60`, 3),
    parsePath('D0,0'),
  ), { tags: 'nuclear radioactive danger' }],
  ['signal', 'Signal', 'D0,0 A0,0 2 45 135 N A0,0 3.6 45 135 N A0,0 5.2 45 135', { tags: 'wifi wireless radio waves' }],
  ['play', 'Play button', 'O0,0 5 M-1.7,2.8 L-1.7,-2.8 L3,0 Z', { tags: 'start video triangle' }],
  ['pause', 'Pause button', 'O0,0 5 M-1.5,2.4 L-1.5,-2.4 M1.5,2.4 L1.5,-2.4', { tags: 'stop wait' }],
  ['map-pin', 'Map pin', 'A0,6.4 3.6 -40 220 L0,0 Z O0,6.4 1.3', { tags: 'location marker place here' }],
  ['female', 'Female sign', 'O0,6.4 3 M0,3.4 L0,-1.4 M-2.2,1 L2.2,1', { tags: 'venus woman girl' }],
  ['male', 'Male sign', 'O-1,-1 3.4 M1.404,1.404 L5,5 M2.2,5 L5,5 L5,2.2', { tags: 'mars man boy' }],
  ['ankh', 'Ankh', 'E0,7 1.9,2.6 -90 270 M0,4.4 L0,-1 M-3,3.2 L3,3.2', { tags: 'egypt life cross' }],
  ['star-crescent', 'Star and crescent', () => `A0,0 5 50 310 A2.669,0 3.869 278.1 81.9 Z ${star(2.5, 0, 1.6, 0.64)}`, { tags: 'moon night' }],
  ['battery', 'Battery', 'M-4.6,-2.4 L3.6,-2.4 L3.6,-1 L3.6,1 L3.6,2.4 L-4.6,2.4 Z M3.6,1 L4.7,1 L4.7,-1 L3.6,-1 M-3,-1.1 L-3,1.1 M-1.2,-1.1 L-1.2,1.1 M0.6,-1.1 L0.6,1.1', { tags: 'power charge energy' }],
  ['magnifier', 'Magnifying glass', 'O-1.2,1.2 3.4 M1.204,-1.204 L4.8,-4.8', { tags: 'search zoom find look' }],
  ['stop-sign', 'Stop sign', () => `M${Array.from({ length: 8 }, (_, i) => around(0, 0, 5, 22.5 + 45 * i)).join(' L')} Z M-2.6,0 L2.6,0`, { tags: 'octagon halt road' }],
  ['bullseye', 'Bullseye', 'O0,0 5 O0,0 3.2 O0,0 1.4 D0,0', { tags: 'target aim dart' }],
  ['info', 'Info sign', 'O0,0 5 D0,2.6 M0,1 L0,-2.8', { tags: 'information help' }],
  ['medical', 'Medical cross', 'M0,5 L1.6,5 L1.6,1.6 L5,1.6 L5,-1.6 L1.6,-1.6 L1.6,-5 L0,-5 |', { tags: 'health first aid hospital plus' }],
  ['speaker', 'Speaker', 'M-4.6,-1.5 L-2.6,-1.5 L0,-4 L0,4 L-2.6,1.5 L-4.6,1.5 Z N A0,0 2.2 -50 50 N A0,0 4.2 -50 50', { tags: 'sound volume audio loud' }],
  ['checkbox', 'Checkbox', 'M-4.6,-4.6 L4.6,-4.6 L4.6,4.6 L-4.6,4.6 Z M-2.6,0.2 L-0.6,-2 L3,2.8', { tags: 'tick done yes box' }],
  ['scales', 'Scales', 'M0,8 L4,8 L5.4,4.4 B2.6,4.4 -1 L4,8 | M0,0 L0,8 L0,9.2 M-2.2,0 L2.2,0', { tags: 'justice balance law weigh' }],
];

const HEARTS = [
  ['heart-broken', 'Broken heart', `${HEART} M0,7.4 L-0.9,5.8 L0.9,4.6 L-0.5,3.2 L0.3,2`, { tags: 'love sad crack' }],
  ['heart-arrow', 'Heart with arrow', `${HEART} M-6.5,1.2 L6.5,7.7 M4.622,8.326 L6.5,7.7 L5.874,5.822 M-7.2,2.3 L-6.5,1.2 L-6.9,-0.1`, { tags: 'love cupid valentine' }],
  ['hearts-two', 'Two hearts', () => stamp(HEART, [[-1.5, 0, 1], [6.6, 3, 0.5]]), { tags: 'love couple pair' }],
  ['heart-in-heart', 'Heart in heart', () => stamp(HEART, [[0, 0, 1], [0, 2, 0.55]]), { tags: 'love double' }],
  ['sparkle', 'Sparkle', SPARKLE, { tags: 'shine star glint' }],
  ['sparkles', 'Three sparkles', () => stamp(SPARKLE, [[-1.6, -1, 1], [3.4, 3.6, 0.46], [4.2, -3.8, 0.34]]), { tags: 'shine magic glitter stars' }],
  ['shooting-star', 'Shooting star', () => `${star(2.6, 2.6, 2.4, 1)} M0.6,1.4 L-5,-3.4 M-0.5,2.9 L-4.4,-0.2 M2,0 L-2.4,-4.4`, { tags: 'wish falling night' }],
];

const MUSIC = [
  ['note-quarter', 'Quarter note', 'E-0.2,1.3 1.8,1.3 0 360 M1.6,1.3 L1.6,10', { tags: 'music song sound crotchet' }],
  ['note-sixteenth', 'Sixteenth note', 'E-1.2,1.3 1.8,1.3 0 360 M0.6,1.3 L0.6,7.4 L0.6,10 C2,8.8 3.8,8.2 3.6,6.4 M0.6,7.4 C2,6.2 3.8,5.6 3.6,3.8', { tags: 'music song sound' }],
  ['notes-three', 'Three notes', 'E-4.2,1.1 1.4,1.1 0 360 M-2.8,1.1 L-2.8,8.4 L1.2,9 L5.2,9.6 L5.2,2.3 N E3.8,2.3 1.4,1.1 0 360 N E-0.2,1.7 1.4,1.1 0 360 M1.2,1.7 L1.2,9', { tags: 'music song triplet' }],
  ['treble-clef', 'Treble clef', 'M-0.9,-4 C-0.9,-5.2 1.1,-5.2 1.1,-3.8 L0.2,4 C0,5.6 1.4,6.4 1.6,5 C1.8,3.4 -2.6,1.6 -2.6,-0.6 C-2.6,-2.6 2.4,-2.8 2.4,-0.6 C2.4,1 0,1.4 -0.4,-0.2', { tags: 'music g clef' }],
  ['bass-clef', 'Bass clef', 'M-2.4,1 C-2.6,4.2 2.6,4.6 2.6,1 C2.6,-2 -0.6,-4.2 -3.4,-5 D4.4,2.6 D4.4,-0.4', { tags: 'music f clef' }],
];

const ZODIAC = [
  ['aries', 'Aries', 'M0,1 C2,4.5 4.8,5.4 4.6,2.4 | M0,-4.4 L0,1', { tags: 'ram' }],
  ['taurus', 'Taurus', 'O0,-1.6 3 M-4.2,5 C-3.4,1.6 3.4,1.6 4.2,5', { tags: 'bull' }],
  ['gemini', 'Gemini', 'M0,4.3 L1.5,4.3 L3.6,5 M1.5,4.3 L1.5,-4.3 L3.6,-5 M0,-4.3 L1.5,-4.3 |', { tags: 'twins' }],
  ['cancer', 'Cancer', () => spin('M4.4,3 C2.4,5.2 -4.6,5.4 -4.4,2.2 C-4.3,0.4 -1.4,0.4 -1.4,2.2 C-1.4,3.2 -2.4,3.6 -3,3', 2), { tags: 'crab' }],
  ['leo', 'Leo', 'O-2.6,-1.6 1.6 M-2.6,0 C-2.6,2 -3.8,3 -3.2,4.6 C-2.4,6.6 2.2,6.6 2.2,3.6 C2.2,1 0.6,-1 1.2,-3 C1.6,-4.4 3.2,-4.4 4.2,-3.4', { tags: 'lion' }],
  ['virgo', 'Virgo', 'M-4.4,3 L-4.4,1.6 L-4.4,-3 M-4.4,1.6 L-3.2,3 L-2,1.6 L-2,-3 M-2,1.6 L-0.8,3 L0.4,1.6 L0.4,-3 M0.4,1.6 L1.6,3 L2.8,1.6 C3.2,-1.4 1.8,-3.6 -0.6,-4.8', { tags: 'maiden' }],
  ['libra', 'Libra', 'M0,5 C2.4,5 4.4,2.6 2,-0.6 L5,-0.6 M0,-3.4 L5,-3.4 |', { tags: 'balance' }],
  ['scorpio', 'Scorpio', 'M-4.4,3 L-4.4,1.6 L-4.4,-3 M-4.4,1.6 L-3.2,3 L-2,1.6 L-2,-3 M-2,1.6 L-0.8,3 L0.4,1.6 L0.4,-3 L1.6,-4.2 L3.8,-2 M2.2,-2 L3.8,-2 L3.8,-3.6', { tags: 'scorpion' }],
  ['sagittarius', 'Sagittarius', 'M-4.4,-4.4 L-1.7,-1.7 L4.4,4.4 M1,4.4 L4.4,4.4 L4.4,1 M-3.4,0 L-1.7,-1.7 L0,-3.4', { tags: 'archer' }],
  ['capricorn', 'Capricorn', 'M-5,4.4 L-2.8,-2 L-0.6,4.4 C1,4.4 2.6,2.4 2.6,-0.6 C2.6,-3 1.4,-4.6 0,-4.4 C-1.2,-4.2 -1,-2.4 0.4,-2 C1.6,-1.7 3.4,-2 4.4,-3', { tags: 'goat' }],
  ['aquarius', 'Aquarius', 'M-5,1 L-3,3 L-1,1 L1,3 L3,1 L5,3 M-5,-3 L-3,-1 L-1,-3 L1,-1 L3,-3 L5,-1', { tags: 'water waves' }],
  ['pisces', 'Pisces', 'M0,0 L1.4,0 N A6,0 4.6 115 245 |', { tags: 'fish' }],
];

const PEOPLE = [
  ['person', 'Person', 'M0,5.6 L3,4.2 M0,2.6 L2.4,-1.2 | O0,8.4 1.6 M0,6.8 L0,5.6 L0,2.6', { tags: 'stick figure man human player' }],
  ['person-cheer', 'Cheering person', 'M0,5.6 L3.2,8.2 M0,2.6 L2.4,-1.2 | O0,8.4 1.6 M0,6.8 L0,5.6 L0,2.6', { tags: 'stick figure happy win arms up' }],
  ['person-run', 'Running person', 'O1.2,8.4 1.5 M0.741,6.972 L0.3,5.6 L-0.6,3.2 L2,1.6 L1.6,-1.2 M-0.6,3.2 L-2.6,1 L-4.8,1.4 M0.3,5.6 L2.8,4.6 L3.6,6.2 M0.3,5.6 L-2.4,6 L-3,4.4', { tags: 'stick figure sprint jog fast' }],
  ['lips', 'Lips', 'M-5,0 C-3,2.6 -1.4,3 0,2 C1.4,3 3,2.6 5,0 C3,-3.2 -3,-3.2 -5,0 M-5,0 Q0,1.2 5,0', { tags: 'mouth kiss' }],
  ['bone', 'Bone', 'M0,0.8 L2.8,0.8 B4.6,0 -1.5 B2.8,-0.8 -1.5 L0,-0.8 |', { tags: 'dog skeleton' }],
];

const HANDS = [
  ['thumbs-up', 'Thumbs up', 'M-3,-4 L3.4,-4 L3.4,-2.75 L3.4,-1.5 L3.4,-0.25 L3.4,1 L1.4,1 L1.4,5 B0,5 1 L-0.8,1 L-3,1 Z M-3,-4 L-4.6,-4 L-4.6,1 L-3,1 M1.4,-2.75 L3.4,-2.75 M1.4,-1.5 L3.4,-1.5 M1.4,-0.25 L3.4,-0.25', { tags: 'like good yes ok hand' }],
  ['hand', 'Open hand', 'M-2.4,0 L2.4,0 L2.8,4.4 L1,4.4 L-0.9,4.4 L-2.8,4.4 L-2.636,2.6 Z M2.8,4.4 L3.3,8 M1,4.4 L1.2,9.2 M-0.9,4.4 L-1.1,9 M-2.8,4.4 L-3.5,7.8 M-2.636,2.6 L-5,4.6', { tags: 'palm five stop high wave' }],
];

const SMILEYS = [
  ['face-grin', 'Grin', 'O0,0 5 D-1.8,1.8 D1.8,1.8 M-3,-0.6 L3,-0.6 A0,-0.6 3 0 -180', { tags: 'happy laugh open smile face' }],
  ['face-wink', 'Wink', 'O0,0 5 D-1.8,1.5 M0.9,1.5 L2.7,1.5 N A0,0.3 3 215 325', { tags: 'face smile joke' }],
  ['face-laugh', 'Laughing face', 'O0,0 5 N A-1.9,1.2 1.1 20 160 N A1.9,1.2 1.1 20 160 M-3,-0.8 L3,-0.8 A0,-0.8 3 0 -180', { tags: 'happy lol joy' }],
  ['face-surprised', 'Surprised face', 'O0,0 5 D-1.8,1.6 D1.8,1.6 O0,-2 1.2', { tags: 'wow shock oh' }],
  ['face-neutral', 'Neutral face', 'O0,0 5 D-1.8,1.5 D1.8,1.5 M-2,-2 L2,-2', { tags: 'meh blank straight' }],
  ['face-angry', 'Angry face', 'O0,0 5 D-1.8,1 D1.8,1 M-3,3 L-0.9,2 M3,3 L0.9,2 N A0,-4.6 3 55 125', { tags: 'mad rage grumpy' }],
  ['face-cry', 'Crying face', 'O0,0 5 D-1.8,1.8 D1.8,1.8 D-1.8,0.5 D-1.8,-0.8 D1.8,0.5 D1.8,-0.8 N A0,-4.8 3 55 125', { tags: 'sad tears sob' }],
  ['face-love', 'Heart eyes', () => joinDrawings(parsePath('O0,0 5 N A0,0.3 3 215 325'), stamp(HEART, [[-1.9, 0.6, 0.24], [1.9, 0.6, 0.24]])), { tags: 'love face crush' }],
  ['face-cool', 'Cool face', 'M0,2.2 L0.6,2.2 L0.9,0.8 L3.3,0.8 L3.6,2.2 L0.6,2.2 | O0,0 5 N A0,0.3 3 235 325', { tags: 'sunglasses shades' }],
  ['face-tongue', 'Tongue out', 'O0,0 5 D-1.8,1.5 D1.8,1.5 M-2.4,-1.4 L0.2,-1.4 L1.8,-1.4 L2.4,-1.4 M0.2,-1.4 L0.2,-2.6 B1.8,-2.6 1 L1.8,-1.4', { tags: 'silly cheeky playful face' }],
  ['face-sleep', 'Sleeping face', 'O0,0 5 N A-1.8,1.9 1.1 200 340 N A1.8,1.9 1.1 200 340 N O0,-2 0.8 M4.6,6.8 L6.2,6.8 L4.6,5.2 L6.2,5.2', { tags: 'tired night snore' }],
  ['face-unsure', 'Unsure face', 'O0,0 5 D-1.8,1.5 D1.8,1.5 M-2,-2.6 L2,-1.4', { tags: 'confused hmm doubt' }],
  ['face-dizzy', 'Dizzy face', 'M1,2.3 L2.6,0.7 M1,0.7 L2.6,2.3 | O0,0 5 N O0,-2.2 1', { tags: 'knocked out dead' }],
  ['face-star', 'Star eyes', () => `O0,0 5 ${star(-1.9, 1.4, 1.3, 0.62)} ${star(1.9, 1.4, 1.3, 0.62)} M-3,-0.9 L3,-0.9 A0,-0.9 3 0 -180`, { tags: 'amazed wow excited face' }],
  ['face-glasses', 'Glasses face', 'O0,0 5 O-1.9,1.4 1.3 O1.9,1.4 1.3 M-0.6,1.4 L0.6,1.4 D-1.9,1.4 D1.9,1.4 N A0,0.3 3 225 315', { tags: 'nerd smart geek' }],
  ['face-scared', 'Scared face', 'O0,0 5 O-1.8,1.6 0.9 O1.8,1.6 0.9 N E0,-2.2 1.3,1.7 0 360', { tags: 'fear scream afraid' }],
  ['face-moustache', 'Moustache face', 'M0,-1.2 C1,-2.6 3,-2.6 3.6,-0.8 | O0,0 5 D-1.8,1.6 D1.8,1.6 M-1,-3.3 L1,-3.3', { tags: 'mustache man gentleman' }],
  ['face-angel', 'Angel face', 'O0,0 5 D-1.8,1.5 D1.8,1.5 N A0,0.3 3 215 325 N E0,6.8 2.8,0.8 0 360', { tags: 'halo holy good' }],
  ['face-devil', 'Devil face', 'M3.83,3.214 L4.4,6.6 L1.873,4.636 M3,2.6 L0.9,1.8 | O0,0 5 D-1.8,1 D1.8,1 N A0,0.3 3 215 325', { tags: 'evil horns demon imp' }],
  ['face-zip', 'Zipped mouth', 'O0,0 5 D-1.8,1.5 D1.8,1.5 M-2.6,-2 L2.6,-2 M-1.6,-1.3 L-1.6,-2.7 M-0.5,-1.3 L-0.5,-2.7 M0.6,-1.3 L0.6,-2.7 M1.7,-1.3 L1.7,-2.7', { tags: 'quiet secret silent face' }],
];

const CHARACTERS = [
  ['skull-bones', 'Skull and crossbones', () => joinDrawings(
    stamp(SKULL, [[0, 1.6, 0.72]]),
    parsePath('M4.11,1.237 L4.4,0.6 L4.69,-0.037 M4.4,0.6 L0,-1.4 L-4.4,-3.4 M-4.11,-4.037 L-4.4,-3.4 L-4.69,-2.763 |'),
  ), { tags: 'pirate danger poison death' }],
  ['alien', 'Alien', 'M0,-5 C2,-5 4.6,0 4.6,2.4 C4.6,5 2.4,5.6 0,5.6 M0.8,0.6 Q1.4,2.6 3.6,2.6 Q3,0.6 0.8,0.6 | M-0.8,-2.8 L0.8,-2.8', { tags: 'ufo space martian face' }],
  ['robot-face', 'Robot face', 'M0,-4 L4,-4 L4,-1 L4,1 L4,3.6 L0,3.6 M4,1 L5,1 L5,-1 L4,-1 N O1.8,1.2 0.9 | M-2.2,-2.2 L-1.1,-2.2 L0,-2.2 L1.1,-2.2 L2.2,-2.2 M-1.1,-1.5 L-1.1,-2.2 L-1.1,-2.9 M0,-1.5 L0,-2.2 L0,-2.9 M1.1,-1.5 L1.1,-2.2 L1.1,-2.9 M0,3.6 L0,5.2 O0,5.9 0.7', { tags: 'bot machine android' }],
  ['pumpkin-face', 'Jack-o-lantern', 'E0,0 5,4.2 0 360 M-0.6,4.17 L-0.5,5.6 L0.7,5.6 L0.6,4.17 M-2.8,1 L-1.9,2.4 L-1,1 Z M2.8,1 L1.9,2.4 L1,1 Z M-3,-0.8 L-2,-2 L-1,-1.2 L0,-2.2 L1,-1.2 L2,-2 L3,-0.8', { tags: 'halloween pumpkin carved spooky' }],
  ['ninja', 'Ninja', 'O0,0 5 M-4.271,2.6 L4.271,2.6 M-4.996,0.2 L4.996,0.2 M-2.6,1.9 L-1,1.2 M2.6,1.9 L1,1.2 M4.271,2.6 L6.4,3.6 M4.271,2.6 L6.6,2', { tags: 'mask face warrior' }],
  ['pirate-face', 'Pirate face', 'O0,0 5 M-4.33,2.5 L0.8,2.5 L3,2.5 L4.33,2.5 M0.8,2.5 L0.8,1.6 B3,1.6 1 L3,2.5 D-1.8,1.3 M-1.8,-2.4 Q0.4,-3 2.2,-1.6', { tags: 'eye patch captain' }],
  ['clown', 'Clown face', 'M4.698,1.71 B3.214,3.83 0.9 B0.868,4.924 0.9 | O0,0 5 D-1.8,1.8 D1.8,1.8 O0,0.2 1 N A0,-0.2 3.2 215 325', { tags: 'circus funny joker' }],
  ['mask-comedy', 'Comedy mask', 'M0,5 L4,5 L4,0 C4,-3 2,-5 0,-5 M1,2 Q1.8,3.2 2.6,2 Z | M-2.4,-1 Q0,-4 2.4,-1 Z', { tags: 'theatre drama happy' }],
  ['mask-tragedy', 'Tragedy mask', 'M0,5 L4,5 L4,0 C4,-3 2,-5 0,-5 M1,2.8 Q1.8,1.6 2.6,2.8 Z | M-2.4,-3 Q0,0 2.4,-3 Z', { tags: 'theatre drama sad' }],
  ['monster', 'One-eyed monster', 'M1.71,4.698 L2.6,6.8 | O0,0 5 O0,1.2 1.8 D0,1.2 M-2.6,-1.8 L-1.3,-3 L0,-1.8 L1.3,-3 L2.6,-1.8', { tags: 'cyclops alien creature' }],
];

const pictures = (cat, sub, list) => list.map(([id, name, draw, extra = {}]) => drawnShape({ id, name, cat, sub, draw, ...extra }));
const starSign = ([id, name, draw, extra]) => [id, name, draw, { tags: `zodiac star sign horoscope ${extra.tags}` }];

export const SIGN_SHAPES = [
  ...pictures('symbols', 'Arrows', ARROWS),
  ...pictures('symbols', 'Signs', SIGNS),
  ...pictures('symbols', 'Hearts and sparkles', HEARTS),
  ...pictures('symbols', 'Music', MUSIC),
  ...pictures('symbols', 'Star signs', ZODIAC.map(starSign)),
  ...pictures('symbols', 'People and body', [...PEOPLE, ...HANDS]),
  ...pictures('faces', 'Smileys', SMILEYS),
  ...pictures('faces', 'Characters', CHARACTERS),
];
