// Tests for the shapes that are made from parts (numbers, words, names, combos,
// badges, ornaments, solids), and the fingerprints of the whole library.
// tests/core.test.mjs checks every single shape; here is what belongs to a
// whole family.
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SHAPES, SHAPE_BY_ID, CATEGORIES, shapePoints, defaultParams, shapeCaption } from '../js/shapes.js';
import { inWords, romanNumeral } from '../js/shapes-numbers.js';
import { slug, breakAt, writable, phrase } from '../js/shapes-vocab.js';
import { shapeDigests } from '../tools/shape-digests.mjs';
import { WHEELS } from '../js/shapes-spiro.js';

const root = new URL('..', import.meta.url);
const points = (id, params = {}) => shapePoints(id, SHAPE_BY_ID[id].count, { ...defaultParams(id), ...params });
const under = (cat, sub) => SHAPES.filter((s) => s.cat === cat && s.sub === sub);
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
/** How many groups the numbers fall into when a gap of more than `gap` separates two groups. */
const groups = (values, gap) => values.slice().sort((a, b) => a - b).reduce((count, v, i, all) => count + (i && v - all[i - 1] > gap ? 1 : 0), 1);

// ---------------------------------------------------------------- the points every shape gives

test('every shape gives the points it gave: the fingerprint of every heading is what it was', () => {
  const noted = JSON.parse(fs.readFileSync(new URL('tests/shape-digests.json', root), 'utf8'));
  const now = shapeDigests();
  const changed = Object.keys(now).filter((key) => now[key] !== noted[key]);
  const gone = Object.keys(noted).filter((key) => !(key in now));
  // After adding shapes on purpose, "node tools/shape-digests.mjs" notes the new fingerprints. If nothing was added
  // under a heading that is named here, a shape that was there gives other points than before: saved scenes change.
  assert.deepEqual(changed, [], `these headings have other shapes or other points than noted: ${changed.join('; ')}`);
  assert.deepEqual(gone, [], `these headings are gone: ${gone.join('; ')}`);
  assert.equal(Object.values(now).reduce((sum, text) => sum + Number(text.split(' ')[0]), 0), SHAPES.length);
});

// ---------------------------------------------------------------- numbers

test('numbers: every number up to 999 is there, and so are its relatives', () => {
  for (const n of range(0, 999)) {
    const shape = SHAPE_BY_ID[n < 10 ? `digit-${n}` : `number-${n}`];
    assert.ok(shape, `the number ${n}`);
    assert.equal(shape.name, `Number ${n}`);
    assert.equal(shape.label, String(n));
    assert.equal(shape.cat, 'numbers');
  }
  // in words, for the search
  assert.deepEqual([0, 7, 13, 20, 42, 99, 100, 101, 110, 999].map(inWords),
    ['zero', 'seven', 'thirteen', 'twenty', 'forty two', 'ninety nine', 'one hundred', 'one hundred one', 'one hundred ten', 'nine hundred ninety nine']);
  // Roman numbers
  assert.deepEqual([1, 4, 9, 14, 19, 40, 44, 49, 88, 90, 99, 100, 400, 500, 900, 1000, 2024].map(romanNumeral),
    ['I', 'IV', 'IX', 'XIV', 'XIX', 'XL', 'XLIV', 'XLIX', 'LXXXVIII', 'XC', 'XCIX', 'C', 'CD', 'D', 'CM', 'M', 'MMXXIV']);
  for (const n of [...range(1, 100), 500, 1000]) assert.equal(SHAPE_BY_ID[`roman-${n}`].label, romanNumeral(n), `Roman ${n}`);
  // every percentage (two of them were there before, under Scores), every place up to the 100th, with the right ending
  for (const n of range(0, 100)) assert.ok(SHAPE_BY_ID[n === 50 || n === 100 ? `score-percent-${n}` : `percent-${n}`], `${n}%`);
  const ending = (n) => SHAPE_BY_ID[`place-${n}`].label.slice(String(n).length);
  assert.deepEqual([4, 11, 12, 13, 21, 22, 23, 42, 63, 100].map(ending), ['th', 'th', 'th', 'th', 'st', 'nd', 'rd', 'nd', 'rd', 'th']);
  // a digital clock for every quarter of an hour, a clock face for every quarter too
  const times = under('numbers', 'Digital clock').map((s) => s.label);
  assert.equal(times.length, 96);
  assert.deepEqual([times[0], times[1], times[47], times[95]], ['00:00', '00:15', '11:45', '23:45']);
  assert.equal(under('numbers', 'Clock times').length, 48);
  // the times tables are right
  for (const a of range(1, 10)) for (const b of range(1, 10)) assert.equal(SHAPE_BY_ID[`times-${a}x${b}`].label, `${a}\u00D7${b}=${a * b}`);
  // a number in a ring, on a badge, on a display
  for (const n of range(1, 99)) assert.ok(SHAPE_BY_ID[`circled-${n}`], `circled ${n}`);
  for (const frame of ['square', 'diamond', 'hexagon', 'star', 'shield']) for (const n of range(1, 20)) assert.ok(SHAPE_BY_ID[`badge-${frame}-${n}`], `${n} on a ${frame}`);
  for (const n of range(0, 99)) assert.ok(SHAPE_BY_ID[`digital-${String(n).padStart(2, '0')}`], `digital ${n}`);
});

// ---------------------------------------------------------------- words and names

test('words: every text once, in capital letters, with an id that says what it is', () => {
  const words = SHAPES.filter((s) => s.cat === 'words' && s.id.startsWith('word-'));
  assert.equal(words.length, 2538);
  assert.equal(new Set(words.map((s) => s.label)).size, words.length, 'a text is one shape, whatever list it is in');
  for (const s of words) {
    assert.equal(s.label, s.label.toUpperCase(), s.id);
    assert.ok(s.name === `The word ${s.label}` || s.name === `The words ${s.label}`, s.name);
    assert.equal(s.name.startsWith('The words'), s.label.includes(' '), `${s.name}: "words" for more than one`);
    assert.ok(writable(s.label), `${s.label} can be written`);
    assert.ok(s.count >= 60 && s.count <= 300, `${s.id} count ${s.count}`);
  }
  // what the id is made of
  assert.deepEqual(['JOYEUX NO\u00CBL', 'GO!', 'READY?', 'LET\'S GO', 'C\u0152UR', '\u00A1VAMOS!', 'BEM-VINDO', '1 VS 1'].map(slug),
    ['joyeux-noel', 'go-x', 'ready-q', 'lets-go', 'coeur', 'vamos-x', 'bem-vindo', '1-vs-1']);
  assert.ok(writable('HELLO!') && writable('\u00C0 BIENT\u00D4T') && !writable('HELLO@') && !writable('hello'));
  assert.ok(phrase('LEVEL 12').polys.length > 6);
  // labels with a number: none is missing
  for (const [word, most] of [['LEVEL', 50], ['STAGE', 20], ['WAVE', 20], ['ROUND', 10], ['CHECKPOINT', 20], ['PLAYER', 8], ['TEAM', 8]]) {
    for (const n of range(1, most)) assert.ok(SHAPE_BY_ID[`word-${word.toLowerCase()}-${n}`], `${word} ${n}`);
  }
  // the 80 words there were before the Words tab are in it, with the ids they had
  for (const id of ['word-gg', 'word-win', 'word-welcome', 'word-bloxd', 'word-goal']) assert.equal(SHAPE_BY_ID[id].cat, 'words', id);
  // other languages keep their accents, and say what they mean
  for (const [id, label, meaning] of [['word-bienvenue', 'BIENVENUE', 'welcome'], ['word-felicitations', 'F\u00C9LICITATIONS', 'congratulations'],
    ['word-adios', 'ADI\u00D3S', 'goodbye'], ['word-tschuss', 'TSCH\u00DCSS', 'bye'], ['word-citta', 'CITT\u00C0', 'city'], ['word-coracao', 'CORA\u00C7\u00C3O', 'heart']]) {
    assert.equal(SHAPE_BY_ID[id].label, label);
    assert.ok(SHAPE_BY_ID[id].tags.includes(meaning), `${label} means ${meaning}`);
  }
});

test('words: a long word breaks between two syllables, as well as a rule can tell', () => {
  assert.deepEqual(['CHRISTOPHER', 'ELIZABETH', 'BIENVENUE', 'SEBASTIAN', 'MAXIMILIAN', 'CHARLOTTE', 'WILLKOMMEN'].map((word) => `${word.slice(0, breakAt(word))}-${word.slice(breakAt(word))}`),
    ['CHRIS-TOPHER', 'ELIZA-BETH', 'BIEN-VENUE', 'SEBAS-TIAN', 'MAXI-MILIAN', 'CHAR-LOTTE', 'WILL-KOMMEN']);
  assert.equal(breakAt('SHORT'), -1);
  for (const s of SHAPES.filter((x) => x.cat === 'words' || x.cat === 'names')) {
    for (const word of (s.label || '').split(/[\s'-]+/)) {
      const letters = [...word.replace(/[^\p{L}]/gu, '')];
      if (letters.length < 9) continue;
      const parts = shapeCaption({ label: word }).split('\u00AD');
      assert.equal(parts.length, 2, `${word} (${s.id}) breaks once`);
      assert.ok(parts.every((part) => [...part.replace(/[^\p{L}]/gu, '')].length >= 3 && [...part].length <= 9), `${word} breaks into ${parts.join(' + ')}`);
    }
  }
  // the words that say where they break do break there
  assert.equal(shapeCaption(SHAPE_BY_ID['word-checkpoint']), 'CHECK\u00ADPOINT');
  assert.equal(shapeCaption(SHAPE_BY_ID['word-joyeux-anniversaire']), 'JOYEUX ANNIVER\u00ADSAIRE');
  assert.equal(shapeCaption(SHAPE_BY_ID['word-felicitations']), 'F\u00C9LICI\u00ADTATIONS');
});

test('names: 1300 first names, each once, under their first letter', () => {
  const names = SHAPES.filter((s) => s.cat === 'names');
  assert.equal(names.length, 1300);
  const labels = names.map((s) => s.label);
  assert.equal(new Set(labels).size, labels.length);
  assert.deepEqual(labels, labels.slice().sort((a, b) => (a < b ? -1 : 1)), 'in the order of the alphabet');
  const words = new Set(SHAPES.filter((s) => s.cat === 'words').map((s) => s.label));
  for (const s of names) {
    assert.match(s.label, /^[A-Z]{2,12}$/, s.id);
    assert.equal(s.sub, s.label[0], `${s.label} stands under ${s.label[0]}`);
    assert.equal(s.name, `The name ${s.label}`);
    assert.equal(s.id, `name-${s.label.toLowerCase()}`);
    assert.ok(!words.has(s.label), `${s.label} is a word of the Words tab already`);
  }
  assert.deepEqual(CATEGORIES.find((c) => c.id === 'names').subs, [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
  for (const name of ['EMMA', 'LIAM', 'MOHAMED', 'SOFIA', 'YUKI', 'ZOE', 'INES', 'ARJUN', 'OLGA', 'KWAME']) assert.ok(labels.includes(name), name);
});

test('bent words: an arch, a wave, a column, and a ring in 3D', () => {
  for (const [kind, sub] of [['arch', 'Words on an arch'], ['valley', 'Words in a valley'], ['wavy', 'Words on a wave'], ['down', 'Words written downwards']]) {
    const list = under('words', sub);
    assert.ok(list.length > 50 && list.every((s) => s.id.startsWith(`${kind}-word-`) && s.group === 'flat'), sub);
  }
  // the middle of a word on an arch is higher than its ends; in a valley it is lower
  const middleAndEnds = (id) => {
    const pts = points(id);
    const mean = (list) => list.reduce((sum, p) => sum + p[1], 0) / list.length;
    return [mean(pts.filter((p) => Math.abs(p[0]) < 0.25)), mean(pts.filter((p) => Math.abs(p[0]) > 0.75))];
  };
  const [archMiddle, archEnds] = middleAndEnds('arch-word-welcome');
  const [valleyMiddle, valleyEnds] = middleAndEnds('valley-word-welcome');
  assert.ok(archMiddle > archEnds + 0.1 && valleyMiddle < valleyEnds - 0.05, `${archMiddle} ${archEnds} ${valleyMiddle} ${valleyEnds}`);
  // written downwards: taller than wide, one letter under the other
  const down = points('down-word-lobby');
  assert.ok(Math.max(...down.map((p) => Math.abs(p[0]))) < 0.2 && groups(down.map((p) => p[1]), 0.07) === 5, 'five letters, one under the other');
  // around a ring: every particle is as far from the upright axis, and the word goes nearly all the way round
  const rings = under('solid', 'Words around a ring');
  assert.ok(rings.length > 70 && rings.every((s) => s.group === 'solid'));
  for (const s of rings.filter((_, i) => i % 9 === 0)) {
    const pts = points(s.id);
    // (between two points of a stroke a particle lies on the straight line, a hair inside the ring)
    for (const [x, , z] of pts) assert.ok(Math.abs(Math.hypot(x, z) - 0.97) < 0.003, `${s.id}: on the ring`);
    assert.ok(pts.some((p) => p[2] < -0.9) && pts.some((p) => p[2] > 0.9) && pts.some((p) => p[0] < -0.9) && pts.some((p) => p[0] > 0.9), `${s.id}: all the way round`);
  }
});

// ---------------------------------------------------------------- combos and badges

test('combos: every little picture stands in every formation, and the sliders set the copies', () => {
  const tab = CATEGORIES.find((c) => c.id === 'combos');
  const pictures = tab.subs.filter((sub) => sub !== 'Made of little shapes');
  assert.equal(pictures.length, 66);
  for (const sub of pictures) {
    const list = under('combos', sub);
    assert.ok(list.length >= 25 && list.length <= 27, `${sub}: ${list.length} formations`);
    const many = sub.toLowerCase();
    assert.ok(list.every((s) => s.name.toLowerCase().includes(many)), `${sub}: every name says what it is made of`);
    // (a picture that needs many particles is left out of the formations with the most copies)
    const deep = list.filter((s) => s.group === 'solid').length;
    assert.ok(deep >= 8 && deep <= 10, `${sub}: ${deep} formations in 3D`);
  }
  // the particles come copy by copy, and copies of one size share them evenly: the middle of every copy is where it should be
  const middles = (pts, copies) => range(0, copies - 1).map((i) => {
    const part = pts.slice(Math.floor((pts.length * i) / copies), Math.floor((pts.length * (i + 1)) / copies));
    return [0, 1, 2].map((axis) => part.reduce((sum, p) => sum + p[axis], 0) / part.length);
  });
  const near = (a, b, eps = 0.03) => Math.abs(a - b) < eps;
  // a row of five stands side by side, a row of three too: the slider sets the copies
  // (with a number of particles that the copies can share evenly)
  const some = (id, n, params = {}) => shapePoints(id, n, { ...defaultParams(id), ...params });
  // a row of five stands side by side, a row of three too: the slider sets the copies
  assert.ok(middles(some('row-of-squares', 60), 5).every(([x, y], i) => near(x, -0.8 + 0.4 * i) && near(y, 0)), 'a row of five');
  assert.ok(middles(some('row-of-squares', 60, { copies: 3 }), 3).every(([x, y], i) => near(x, -2 / 3 + (2 / 3) * i) && near(y, 0)), 'a row of three');
  assert.ok(middles(some('column-of-squares', 60, { copies: 6 }), 6).every(([x, y], i) => near(x, 0) && near(y, 1 - (2 * i + 1) / 6)), 'a column of six');
  assert.ok(middles(some('grid-of-squares', 72), 9).every(([x, y], i) => near(x, -2 / 3 + (2 / 3) * (i % 3)) && near(y, 2 / 3 - (2 / 3) * Math.floor(i / 3))), 'a grid of three by three');
  // a ring: the copies are all as far from the middle
  for (const [x, y] of middles(some('ring-of-squares', 64), 8)) assert.ok(near(Math.hypot(x, y), 0.75, 0.02), `a copy at ${x}, ${y}`);
  // every particle of every copy: the copies share the particles, each keeps its corners
  assert.equal(points('ring-of-diamonds').length, SHAPE_BY_ID['ring-of-diamonds'].count);
  assert.equal(shapePoints('ring-of-diamonds', 9, defaultParams('ring-of-diamonds')).length, SHAPE_BY_ID['ring-of-diamonds'].min, 'never fewer than its least');
  // in 3D: a halo lies flat, a sphere is round, a tunnel goes into the depth
  const halo = points('halo-of-hearts');
  assert.ok(Math.max(...halo.map((p) => Math.abs(p[1]))) < 0.36 && Math.max(...halo.map((p) => Math.hypot(p[0], p[2]))) > 0.9);
  const sphere = points('sphere-of-stars');
  assert.ok(sphere.every((p) => Math.hypot(...p) > 0.8 && Math.hypot(...p) < 1), 'on a ball');
  assert.equal(groups(points('tunnel-of-squares').map((p) => p[2]), 0.1), 5);
  // a big picture made of little ones
  const built = under('combos', 'Made of little shapes');
  assert.equal(built.length, 9 * 22);
  assert.ok(SHAPE_BY_ID['heart-made-of-stars'] && SHAPE_BY_ID['star-made-of-hearts'] && SHAPE_BY_ID['moon-made-of-sparkles']);
  // what was in the library before is not made a second time
  for (const [id, cat] of [['ring-of-stars', 'basic'], ['ring-of-circles', 'basic'], ['nested-hearts', 'basic'], ['nested-stars', 'basic']]) assert.equal(SHAPE_BY_ID[id].cat, cat, id);
});

test('badges, speech bubbles and magic circles: a frame, and something inside it', () => {
  const badges = under('symbols', 'Badges');
  assert.ok(badges.length > 380, `${badges.length} badges`);
  // the frame is the outermost line; the picture stays well inside it
  for (const id of ['badge-circle-skulls', 'badge-medal-crowns']) {
    const far = points(id).map((p) => Math.hypot(p[0], p[1]));
    assert.ok(far.filter((r) => r > 0.99).length > 20, `${id}: the frame`);
    assert.ok(far.filter((r) => r < 0.82).length > 10, `${id}: the picture`);
    assert.equal(far.filter((r) => r > 0.84 && r < 0.99 && !(id.includes('medal') && Math.abs(r - 0.82) < 0.01)).length, 0, `${id}: nothing between them`);
  }
  assert.equal(under('letters', 'Letter badges').length, 5 * 26);
  assert.equal(under('numbers', 'Number badges').length, 5 * 20);
  assert.equal(under('symbols', 'Shields').length, 71);
  assert.equal(under('effects', 'Magic circles').length, 50 + 4 * 24);
  assert.ok(under('symbols', 'Speech bubbles').length >= 30 && SHAPE_BY_ID['speech-hi'] && SHAPE_BY_ID['speech-hearts']);
  // the same gap between particles on the frame and inside it (as far as whole particles allow)
  const pts = points('badge-square-skulls');
  const gapOf = (list) => {
    const nearest = list.map((p, i) => Math.min(...list.map((q, j) => (i === j ? Infinity : Math.hypot(p[0] - q[0], p[1] - q[1])))));
    return nearest.sort((a, b) => a - b)[nearest.length >> 1];
  };
  const frame = gapOf(pts.filter((p) => Math.max(Math.abs(p[0]), Math.abs(p[1])) > 0.99));
  const picture = gapOf(pts.filter((p) => Math.max(Math.abs(p[0]), Math.abs(p[1])) < 0.8));
  assert.ok(picture / frame > 0.7 && picture / frame < 1.4, `the frame ${frame}, the picture ${picture}`);
});

// ---------------------------------------------------------------- pictures in a frame, pictures with things around them

test('framed and decorated: a picture in a frame, or with little things around it', () => {
  const sizes = (cat) => CATEGORIES.find((c) => c.id === cat).subs.map((sub) => [sub, under(cat, sub).length]);
  assert.deepEqual(sizes('framed'), [['In a circle', 914], ['In a square', 914], ['In a hexagon', 914], ['On a shield', 914], ['In a speech bubble', 961], ['On a banner', 312], ['On a sign', 262]]);
  assert.deepEqual(sizes('decorated'), [['With sparkles', 962], ['With hearts', 962], ['With stars', 962], ['With a crown', 961], ['With a halo', 962]]);
  const made = SHAPES.filter((s) => s.cat === 'framed' || s.cat === 'decorated');
  assert.equal(made.length, 10000);

  // each is made from a picture of the picture tabs: its id and its name say which one, and what is around it
  const pictureTabs = ['animals', 'faces', 'food', 'nature', 'things', 'travel', 'costume', 'symbols'];
  const baseOf = (s) => {
    const how = s.sub.toLowerCase();
    assert.ok(s.name.endsWith(` ${how}`) && s.id.endsWith(`-${how.replace(/ /g, '-')}`), `${s.id}: "${s.name}" under ${s.sub}`);
    const base = SHAPE_BY_ID[s.id.slice(0, -how.length - 1)];
    assert.ok(base && s.name === `${base.name} ${how}` && pictureTabs.includes(base.cat) && base.group === 'flat', `${s.id}: its picture`);
    return base;
  };
  const pictures = new Set(made.map((s) => baseOf(s).id));
  assert.equal(pictures.size, 962);
  // every picture has sparkles, hearts and stars around it and a halo over it; and a crown, but the speech bubble,
  // for "Speech bubble with a crown" is a bubble with a crown in it
  for (const how of ['with-sparkles', 'with-hearts', 'with-stars', 'with-a-halo']) for (const id of pictures) assert.ok(SHAPE_BY_ID[`${id}-${how}`], `${id}-${how}`);
  assert.ok(SHAPE_BY_ID['cat-with-a-crown'] && !SHAPE_BY_ID['speech-with-a-crown'] && SHAPE_BY_ID['speech-crowns'].name === 'Speech bubble with a crown');
  // a frame: every picture but the ones that are a badge in that frame already (a plainer drawing, in the Symbols tab)
  assert.ok(SHAPE_BY_ID['cat-in-a-circle'] && SHAPE_BY_ID['dragon-head-on-a-shield'] && SHAPE_BY_ID['pizza-in-a-speech-bubble']);
  assert.ok(!SHAPE_BY_ID['skull-in-a-circle'] && SHAPE_BY_ID['badge-circle-skulls'].name === 'Skull in a circle' && SHAPE_BY_ID['skull-in-a-speech-bubble']);
  // a banner is for the pictures that are high, a sign for the ones that are wide: no picture has both
  const stretch = (id) => {
    const pts = points(id);
    return (Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]))) / (Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])));
  };
  for (const s of under('framed', 'On a banner')) assert.ok(stretch(baseOf(s).id) > 1.1 && !SHAPE_BY_ID[`${baseOf(s).id}-on-a-sign`], `${s.id}: a high picture`);
  for (const s of under('framed', 'On a sign')) assert.ok(stretch(baseOf(s).id) < 1 / 1.1, `${s.id}: a wide picture`);

  // The particles of the picture come first, then the ones of what is around it. The picture keeps away from that:
  // 0.18 from a frame, 0.13 from a little thing. (Every seventh shape: they are all made the same way.)
  const some = made.filter((_, i) => i % 7 === 0);
  let alone = 0;
  for (const s of some) {
    const base = baseOf(s);
    const pts = points(s.id);
    const own = s.shares(s.count)[0];
    const picture = pts.slice(0, own);
    const rest = pts.slice(own);
    assert.ok(own >= base.count && rest.length >= 8, `${s.id}: ${own} particles for the picture, ${rest.length} around it`);
    let gap = Infinity;
    for (const p of picture) for (const q of rest) gap = Math.min(gap, Math.hypot(p[0] - q[0], p[1] - q[1]));
    assert.ok(gap > (s.cat === 'framed' ? 0.177 : 0.129), `${s.id}: the picture is ${gap} from what is around it`);
    // with the usual number of particles the picture is the picture alone, only smaller and somewhere else: it has
    // the same particles (more of them when the little things would be too coarse to be read otherwise)
    const box = (list) => [0, 1].map((axis) => [Math.min(...list.map((p) => p[axis])), Math.max(...list.map((p) => p[axis]))]);
    const [to, from] = [box(picture), box(points(base.id))];
    const long = from[0][1] - from[0][0] > from[1][1] - from[1][0] ? 0 : 1;
    const scale = (to[long][1] - to[long][0]) / (from[long][1] - from[long][0]);
    if (s.cat === 'framed') {
      assert.equal(own, base.count, `${s.id}: the picture has the particles it has alone`);
      // and it is as big as the frame allows: nowhere less than half its own size
      assert.ok(scale > 0.49 && scale <= 1.0001, `${s.id}: the picture is ${scale} of its size`);
    }
    if (own !== base.count) continue;
    alone++;
    points(base.id).forEach((p, i) => {
      for (const axis of [0, 1]) assert.ok(Math.abs((picture[i][axis] - to[axis][0]) - (p[axis] - from[axis][0]) * scale) < 1e-9, `${s.id}: particle ${i} of the picture`);
    });
  }
  assert.ok(alone > some.length * 0.7, `${alone} of ${some.length} pictures are as they are alone`);

  // No clumps, by the rule of the picture tabs: no two particles are nearer than half the usual distance to the
  // nearest one. Five shapes miss it by a little, and it can be seen why. The towers of the suspension bridge have two
  // particles close together where the cable is hung, as they have in the picture alone (which keeps the rule: the
  // frame, with its even particles, makes the usual distance longer). And the fireworks are so few particles, far
  // apart, that the little sparkles beside them are finer than they are.
  const tight = new Set(['suspension-bridge-in-a-circle', 'suspension-bridge-in-a-square', 'suspension-bridge-on-a-shield', 'suspension-bridge-on-a-sign', 'fireworks-with-sparkles']);
  for (const s of made) {
    const pts = points(s.id);
    const xs = Float64Array.from(pts, (p) => p[0]);
    const ys = Float64Array.from(pts, (p) => p[1]);
    const near = new Float64Array(pts.length).fill(Infinity); // (the square of the distance to the nearest one)
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const gap = (xs[i] - xs[j]) * (xs[i] - xs[j]) + (ys[i] - ys[j]) * (ys[i] - ys[j]);
        if (gap < near[i]) near[i] = gap;
        if (gap < near[j]) near[j] = gap;
      }
    }
    const nearest = Array.from(near, Math.sqrt).sort((x, y) => x - y);
    const usual = nearest[nearest.length >> 1];
    const least = nearest[0];
    if (tight.has(s.id)) assert.ok(least >= 0.45 * usual && least < 0.5 * usual, `${s.id} is one of the five: two particles ${least.toFixed(3)} apart, the usual gap is ${usual.toFixed(3)}`);
    else assert.ok(least >= 0.5 * usual, `${s.id}: two particles ${least.toFixed(3)} apart, the usual gap is ${usual.toFixed(3)}`);
  }

  // the frame itself: a circle is round, a square has its four corners, and a shape never has fewer particles than it asks for
  const ring = points('cat-in-a-circle').slice(SHAPE_BY_ID['cat-in-a-circle'].shares(SHAPE_BY_ID['cat-in-a-circle'].count)[0]);
  assert.ok(ring.length > 40 && ring.every((p) => Math.abs(Math.hypot(p[0], p[1]) - 1) < 0.002));
  const square = points('cat-in-a-square');
  for (const [x, y] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) assert.ok(square.some((p) => p[0] === x && p[1] === y), `a corner at ${x}, ${y}`);
  for (const id of ['cat-in-a-circle', 'sword-on-a-banner', 'fish-on-a-sign', 'cat-with-stars', 'dog-with-a-halo']) {
    const s = SHAPE_BY_ID[id];
    for (const n of [s.min, s.count, 300]) assert.equal(shapePoints(id, n, defaultParams(id)).length, n, `${id} with ${n}`);
  }
  // little things made of equal runs get whole rounds of particles: a star its ten corners, or twenty, never eleven
  const stars = SHAPE_BY_ID['cat-with-stars'];
  for (const n of [stars.count, 150, 220, 300]) for (const k of stars.shares(n).slice(1)) assert.equal(k % 10, 0, `a star of ${k} particles`);
});

// ---------------------------------------------------------------- ornaments and solids

test('ornaments: no two snowflakes are alike, nor two mandalas', () => {
  for (const [cat, sub, size] of [['nature', 'Snowflakes', 63], ['patterns', 'Mandalas', 100], ['nature', 'Flowers', 47], ['nature', 'Suns', 14], ['patterns', 'Frames', 26]]) {
    const list = under(cat, sub);
    assert.equal(list.length, size, sub);
    const looks = new Set(list.map((s) => points(s.id).map((p) => p.map((v) => v.toFixed(3)).join(',')).sort().join(';')));
    assert.equal(looks.size, size, `${sub}: every one is different`);
  }
  // a snowflake has six arms: turned by a sixth of a circle, its particles lie where particles were (give or take the gap between two)
  const flake = points('snowflake-20');
  const turned = flake.map(([x, y]) => [x * 0.5 - y * Math.sqrt(0.75), x * Math.sqrt(0.75) + y * 0.5]);
  const off = turned.map((p) => Math.min(...flake.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))));
  assert.ok(off.sort((a, b) => a - b)[Math.floor(off.length * 0.9)] < 0.07, 'six-fold');
});

test('solids: each has the corners it should have', () => {
  const corners = {
    'truncated-dodecahedron': 60, rhombicuboctahedron: 24, 'truncated-cuboctahedron': 48, 'snub-cube': 24, rhombicosidodecahedron: 60,
    'triakis-tetrahedron': 8, 'triakis-octahedron': 14, 'tetrakis-hexahedron': 14, 'deltoidal-icositetrahedron': 26, 'disdyakis-dodecahedron': 26,
    'pentagonal-icositetrahedron': 38, 'rhombic-triacontahedron': 32, 'triakis-icosahedron': 32, 'pentakis-dodecahedron': 32, 'deltoidal-hexecontahedron': 62,
    'small-stellated-dodecahedron': 12, 'great-stellated-dodecahedron': 20, 'five-cubes': 20, 'ten-tetrahedra': 20, 'dodecahedron-icosahedron': 32,
    'geodesic-ball': 42, 'triangular-cupola': 9, 'pentagonal-cupola': 15, 'pentagonal-rotunda': 20, pentachoron: 5, hexadecachoron: 8, icositetrachoron: 24,
  };
  assert.deepEqual(under('solid', 'Polyhedra').map((s) => s.id).sort(), Object.keys(corners).sort());
  // edges: corners + faces - 2 (Euler), for the ones that are one solid without dents or crossings
  const edges = {
    'truncated-dodecahedron': 90, rhombicuboctahedron: 48, 'truncated-cuboctahedron': 72, 'snub-cube': 60, rhombicosidodecahedron: 120,
    'triakis-tetrahedron': 18, 'triakis-octahedron': 36, 'tetrakis-hexahedron': 36, 'deltoidal-icositetrahedron': 48, 'disdyakis-dodecahedron': 72,
    'pentagonal-icositetrahedron': 60, 'rhombic-triacontahedron': 60, 'triakis-icosahedron': 90, 'pentakis-dodecahedron': 90, 'deltoidal-hexecontahedron': 120,
    'geodesic-ball': 120, 'triangular-cupola': 15, 'pentagonal-cupola': 25, 'pentagonal-rotunda': 35,
  };
  for (const [id, count] of Object.entries(corners)) {
    const shape = SHAPE_BY_ID[id];
    assert.equal(shape.min, count, `${id}: corners`);
    // with only its corners asked for, a solid gives its corners: all different, the farthest 1 from the middle
    const pts = shapePoints(id, count, {});
    assert.equal(new Set(pts.map((p) => p.map((v) => v.toFixed(6)).join(','))).size, count);
    assert.ok(Math.abs(Math.max(...pts.map((p) => Math.hypot(...p))) - 1) < 1e-9, `${id} fills the box`);
    if (edges[id]) {
      // one particle more than corners and edges: with every edge given one particle, the extra one is the second on some edge
      const all = shapePoints(id, count + edges[id], {});
      assert.equal(all.length, count + edges[id]);
      // an edge joins two corners: so every particle that is not a corner lies between two corners, on the line from one to the other
      const onAnEdge = (p) => pts.some((a, i) => pts.some((b, j) => j > i && Math.abs(Math.hypot(...a.map((v, k) => v - p[k])) + Math.hypot(...b.map((v, k) => v - p[k])) - Math.hypot(...a.map((v, k) => v - b[k]))) < 1e-9));
      for (const p of all.slice(count, count + 6)) assert.ok(onAnEdge(p), `${id}: a particle off its edges`);
    }
  }
  // the snub cube: every corner has five neighbours at the length of an edge (the others have three or four)
  const snub = shapePoints('snub-cube', 24, {});
  const nearest = Math.min(...snub.slice(1).map((p) => Math.hypot(...p.map((v, k) => v - snub[0][k]))));
  for (const p of snub) assert.equal(snub.filter((q) => Math.abs(Math.hypot(...q.map((v, k) => v - p[k])) - nearest) < 1e-6).length, 5);
  // letters with depth: a front and a back, the same letter twice
  const deep = points('letter3d-a');
  const front = deep.filter((p) => p[2] > 0.2).length;
  const back = deep.filter((p) => p[2] < -0.2).length;
  assert.ok(front > 20 && Math.abs(front - back) <= 2 && deep.length - front - back >= 5, `${front} in front, ${back} behind, ${deep.length - front - back} between`);
  assert.equal(under('solid', 'Letters in 3D').length, 36);
});

// ---------------------------------------------------------------- shapes put together by rule

test('families: monsters, robots, items and the others are dealt out so that no two are alike', () => {
  const sizes = (cat) => CATEGORIES.find((c) => c.id === cat).subs.map((sub) => [sub, under(cat, sub).length]);
  assert.deepEqual(sizes('monsters'), [['Round monsters', 180], ['Tall monsters', 180], ['Wide monsters', 180], ['Square monsters', 180], ['Furry monsters', 180],
    ['Bumpy monsters', 180], ['Pear monsters', 180], ['Rock monsters', 180], ['Slimes', 200], ['Ghosts', 200]]);
  assert.deepEqual(sizes('robots'), [['Walking robots', 280], ['Rolling robots', 280], ['Hovering robots', 280], ['Tank robots', 280]]);
  assert.deepEqual(sizes('items'), [['Swords', 250], ['Potions', 280], ['Keys', 280], ['Shields', 280], ['Gems', 280], ['Wands and staffs', 280], ['Axes and hammers', 280], ['Crowns', 280]]);
  assert.deepEqual(sizes('space'), [['Rockets', 280], ['Flying saucers', 280], ['Starships', 280], ['Planets', 280], ['Aliens', 280]]);
  assert.deepEqual(sizes('mandalas'), [['Snow crystals', 280], ['Flowers', 280], ['Rosettes', 280]]);
  assert.deepEqual(sizes('buildings'), [['Houses', 280], ['Castles', 280], ['Towers', 280]]);
  assert.deepEqual(sizes('sea'), [['Fish', 280], ['Jellyfish', 280], ['Boats', 280]]);
  assert.deepEqual(sizes('pixel').slice(-3), [['Pixel invaders', 280], ['Pixel heroes', 280], ['Pixel starfighters', 280]]);
  assert.deepEqual(sizes('curves').slice(-1), [['Spirographs', 70]]);

  const families = [
    ...['monsters', 'robots', 'items', 'space', 'mandalas', 'buildings', 'sea'].flatMap((cat) => CATEGORIES.find((c) => c.id === cat).subs.map((sub) => [cat, sub])),
    ['pixel', 'Pixel invaders'], ['pixel', 'Pixel heroes'], ['pixel', 'Pixel starfighters'], ['curves', 'Spirographs'],
  ];
  assert.equal(families.length, 40);
  assert.equal(families.reduce((sum, [cat, sub]) => sum + under(cat, sub).length, 0), 10000);

  for (const [cat, sub] of families) {
    const list = under(cat, sub);
    const numbers = new Map(); // the kinds under a heading ("Axe", "Mallet", "Club") are each numbered from 1
    for (const s of list) {
      // a name is a kind and a number, and the id says the same
      const [, kind, number] = /^(.+) (\d+)$/.exec(s.name) || [];
      assert.ok(kind, `${s.id}: "${s.name}" is a kind and a number`);
      numbers.set(kind, (numbers.get(kind) || 0) + 1);
      assert.equal(Number(number), numbers.get(kind), `${s.name} is number ${numbers.get(kind)} of its kind`);
      assert.equal(s.id, cat === 'pixel' ? s.name.toLowerCase().replace('pixel ', 'px-').replace(/ /g, '-') : s.name.toLowerCase().replace(/ /g, '-'), `the id of ${s.name}`);
      assert.equal(s.group, 'flat', s.id);
      assert.equal((s.params || []).length, 0, `${s.id} has no sliders`);
      assert.ok(s.count >= 20 && s.count <= 140, `${s.id}: ${s.count} particles`);

      // no clumps: no two particles nearer than half the usual gap
      const pts = points(s.id);
      const nearest = pts.map((p, i) => pts.reduce((least, q, j) => (j === i ? least : Math.min(least, Math.hypot(p[0] - q[0], p[1] - q[1]))), Infinity));
      const usual = nearest.slice().sort((a, b) => a - b)[nearest.length >> 1];
      assert.ok(Math.min(...nearest) >= 0.5 * usual, `${s.id}: two particles ${Math.min(...nearest).toFixed(3)} apart, the usual gap is ${usual.toFixed(3)}`);
    }
    // every one is another picture
    const looks = new Set(list.map((s) => points(s.id).map((p) => p.map((v) => v.toFixed(3)).join(',')).sort().join(';')));
    assert.equal(looks.size, list.length, `${sub}: every one is different`);
    if (sub === 'Spirographs') continue;
    // a member is given by which variant of each part it has: any two differ in two parts or more
    for (const s of list) assert.ok(Array.isArray(s.variants) && s.variants.length >= 4, `${s.id} knows its parts`);
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < i; j++) {
        const differ = list[i].variants.filter((v, k) => v !== list[j].variants[k]).length;
        assert.ok(differ >= 2, `${list[i].id} and ${list[j].id} differ in ${differ} part only`);
      }
    }
  }

  // a snow crystal has six arms: turned by a sixth of a circle, its particles lie where particles were
  for (const id of ['snow-crystal-1', 'snow-crystal-20', 'snow-crystal-140', 'snow-crystal-280']) {
    const flake = points(id);
    const turned = flake.map(([x, y]) => [x * 0.5 - y * Math.sqrt(0.75), x * Math.sqrt(0.75) + y * 0.5]);
    const off = turned.map((p) => Math.min(...flake.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))));
    assert.ok(off.sort((a, b) => a - b)[Math.floor(off.length * 0.9)] < 0.07, `${id} is six-fold`);
  }
  // pixel creatures are the same left and right, dot for dot, and a dot is a square of the grid
  for (const s of SHAPES.filter((x) => /^px-(invader|hero|starfighter)-\d+$/.test(x.id))) {
    const dots = points(s.id);
    const spots = new Set(dots.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`));
    assert.ok(s.tidy && s.min === s.count && dots.length === s.count, `${s.id}: as many particles as squares`);
    for (const [x, y] of dots) assert.ok(spots.has(`${(-x || 0).toFixed(4)},${y.toFixed(4)}`), `${s.id}: the dot at ${x}, ${y} has no twin`);
  }
  // a spirograph is not a curve that the sliders of the older Spirograph shape can make (a wheel inside a wheel: the
  // wheel with the other teeth, big minus small, draws the same curve with the pen at 1 / pen), nor a cycloid (the
  // pen on the rim), nor the Limaçon (a wheel around one of its own size, the pen beyond the rim)
  const sliders = Object.fromEntries(SHAPE_BY_ID.spirograph.params.map((p) => [p.key, [p.min, p.max]]));
  assert.deepEqual(sliders, { points: [3, 12], skip: [1, 5], pen: [0.2, 1.6] });
  const inReach = (big, small, pen) => big <= 12 && small <= 5 && pen >= 0.2 && pen <= 1.6;
  assert.equal(WHEELS.length, 70);
  assert.equal(new Set(WHEELS.map((wheel) => wheel.join(' '))).size, 70);
  for (const [inside, big, small, pen] of WHEELS) {
    const what = `the wheel ${[inside, big, small, pen]}`;
    assert.ok(pen !== 1 && small >= 1 && small < 4 && (inside ? big > 2 * small : big >= small), what);
    if (inside) assert.ok(!inReach(big, small, pen) && !inReach(big, big - small, 1 / pen), `${what} is one the Spirograph shape can draw`);
    else assert.ok(!(big === 1 && small === 1 && pen > 1) && pen > small / (big + small), `${what} is a Limaçon or an oval`);
  }
  // and no two of them look alike: drawn with 240 particles each, the particles of one are on average a third of the
  // gap between two particles away from the other, or more
  const drawn = under('curves', 'Spirographs').map((s) => [s.id, shapePoints(s.id, 240, defaultParams(s.id))]);
  const away = (a, b) => a.reduce((sum, p) => sum + b.reduce((least, q) => Math.min(least, Math.hypot(p[0] - q[0], p[1] - q[1])), Infinity), 0) / a.length;
  for (let i = 0; i < drawn.length; i++) {
    for (let j = 0; j < i; j++) {
      const apart = Math.max(away(drawn[i][1], drawn[j][1]), away(drawn[j][1], drawn[i][1]));
      assert.ok(apart >= 0.03, `${drawn[i][0]} and ${drawn[j][0]} look alike (${apart.toFixed(3)} apart)`);
    }
  }
  // the older shapes of the same names are still there, and still themselves
  for (const id of ['snowflake-1', 'mandala-1', 'rocket', 'house', 'castle', 'fish', 'jellyfish', 'robot-face', 'monster', 'alien', 'sword', 'key', 'crown', 'planet']) assert.ok(SHAPE_BY_ID[id], `${id} is gone`);
  assert.equal(SHAPE_BY_ID['snowflake-1'].cat, 'nature');
  assert.equal(SHAPE_BY_ID['mandala-1'].cat, 'patterns');
});

test('families: loot and gear, each kind as flat pictures and in 3D, and no two alike', () => {
  const headings = {
    loot: ['Goblets', 'Pots', 'Barrels', 'Chests', 'Game pieces', 'Mushrooms', 'Rings', 'Coins', 'Scrolls', 'Spell books'],
    gear: ['Helmets', 'Lanterns', 'Bombs', 'Hats', 'Bows', 'Arrows', 'Boots', 'Armour', 'Amulets', 'Torches'],
    loot3d: ['3D potions', '3D goblets', '3D pots', '3D barrels', '3D chests', '3D gems', '3D crowns', '3D game pieces', '3D mushrooms', '3D rings'],
    gear3d: ['3D swords', '3D axes', '3D hammers', '3D shields', '3D helmets', '3D keys', '3D staffs', '3D lanterns', '3D bombs', '3D hats'],
  };
  let all = 0;
  for (const [cat, subs] of Object.entries(headings)) {
    assert.deepEqual(CATEGORIES.find((c) => c.id === cat).subs, subs);
    assert.equal(SHAPES.filter((s) => s.cat === cat).length, 5000, `the ${cat} tab`);
    const solid = cat.endsWith('3d');
    for (const sub of subs) {
      const list = under(cat, sub);
      assert.equal(list.length, 500, sub);
      all += list.length;
      const kinds = new Set();
      const looks = new Set();
      list.forEach((s, i) => {
        // a name is a kind and a number, and the id says the same; what is in 3D says so in its name
        const [, kind, number] = /^(.+) (\d+)$/.exec(s.name) || [];
        assert.ok(kind, `${s.id}: "${s.name}" is a kind and a number`);
        kinds.add(kind);
        assert.equal(Number(number), i + 1, `${s.name} is number ${i + 1} of its kind`);
        assert.equal(s.id, s.name.toLowerCase().replace(/ /g, '-'), `the id of ${s.name}`);
        assert.equal(kind.startsWith('3D '), solid, s.name);
        assert.equal(s.group, solid ? 'solid' : 'flat', s.id);
        assert.equal((s.params || []).length, 0, `${s.id} has no sliders`);
        assert.ok(s.count >= 20 && s.count <= (solid ? 160 : 140), `${s.id}: ${s.count} particles`);

        // no clumps: no two particles nearer than half the usual gap (measured in space: a thing in 3D has particles behind particles)
        const pts = points(s.id);
        const nearest = new Float64Array(pts.length).fill(Infinity);
        for (let a = 0; a < pts.length; a++) {
          for (let b = 0; b < a; b++) {
            const d = Math.sqrt((pts[a][0] - pts[b][0]) ** 2 + (pts[a][1] - pts[b][1]) ** 2 + (pts[a][2] - pts[b][2]) ** 2);
            if (d < nearest[a]) nearest[a] = d;
            if (d < nearest[b]) nearest[b] = d;
          }
        }
        const usual = Float64Array.from(nearest).sort()[pts.length >> 1];
        const least = nearest.reduce((m, d) => Math.min(m, d), Infinity);
        assert.ok(least >= 0.5 * usual, `${s.id}: two particles ${least.toFixed(3)} apart, the usual gap is ${usual.toFixed(3)}`);
        // a thing in 3D has depth, whichever side it is seen from; a flat picture has none
        const reach = [0, 1, 2].map((axis) => pts.reduce((m, p) => Math.max(m, p[axis]), -Infinity) - pts.reduce((m, p) => Math.min(m, p[axis]), Infinity));
        if (solid) assert.ok(Math.min(...reach) >= 0.1, `${s.id} is ${reach.map((v) => v.toFixed(2)).join(' by ')}`);
        else assert.equal(reach[2], 0, `${s.id} is flat`);
        looks.add(pts.map((p) => p.map((v) => v.toFixed(3)).join(',')).sort().join(';'));
        assert.ok(Array.isArray(s.variants) && s.variants.length >= 4, `${s.id} knows its parts`);
      });
      assert.equal(kinds.size, 1, `${sub} are one kind`);
      assert.equal(looks.size, list.length, `${sub}: every one is different`);
      // a member is given by which variant of each part it has: any two differ in two parts or more
      for (let i = 0; i < list.length; i++) {
        for (let j = 0; j < i; j++) {
          const differ = list[i].variants.filter((v, k) => v !== list[j].variants[k]).length;
          assert.ok(differ >= 2, `${list[i].id} and ${list[j].id} differ in ${differ} part only`);
        }
      }
    }
  }
  assert.equal(all, 20000);
  // a kind that there is flat and in 3D is two families, each numbered from 1
  for (const kind of ['goblet', 'pot', 'barrel', 'chest', 'game-piece', 'mushroom', 'ring', 'helmet', 'lantern', 'bomb', 'hat']) {
    assert.equal(SHAPE_BY_ID[`${kind}-1`].group, 'flat');
    assert.equal(SHAPE_BY_ID[`3d-${kind}-1`].group, 'solid');
    assert.ok(SHAPE_BY_ID[`${kind}-500`] && SHAPE_BY_ID[`3d-${kind}-500`] && !SHAPE_BY_ID[`${kind}-501`] && !SHAPE_BY_ID[`3d-${kind}-501`], kind);
  }
  // the older shapes of the same names are still there, and still themselves
  for (const id of ['goblet', 'barrel', 'lantern', 'mushroom', 'bomb', 'scroll', 'spell-book', 'bow', 'arrow', 'boot', 'amulet', 'dagger', 'sword3d', 'key3d', 'shield3d', 'hammer3d', 'bomb3d',
    'sword-1', 'potion-1', 'key-1', 'shield-1', 'gem-1', 'crown-1']) assert.ok(SHAPE_BY_ID[id], `${id} is gone`);
  assert.equal(SHAPE_BY_ID['sword-1'].cat, 'items');
  assert.equal(SHAPE_BY_ID['3d-sword-1'].cat, 'gear3d');
  assert.equal(SHAPE_BY_ID.lantern.cat, 'solid');
});

// ---------------------------------------------------------------- pixel art made from parts

test('pixel art: words in one or two lines, numbers and faces', () => {
  const words = SHAPES.filter((s) => s.id.startsWith('px-word-'));
  assert.equal(words.length, 501);
  for (const s of words) {
    assert.ok(s.count <= 300 && s.count >= 12, `${s.id}: ${s.count} dots`);
    const rows = new Set(points(s.id).map((p) => p[1].toFixed(4))).size;
    assert.equal(rows, s.label.includes(' ') ? 14 : 7, `${s.label}: ${rows} rows of dots`);
  }
  for (const n of range(10, 99)) assert.equal(SHAPE_BY_ID[`px-number-${n}`].label, String(n));
  const faces = SHAPES.filter((s) => s.id.startsWith('px-face-'));
  assert.equal(faces.length, 79);
  assert.equal(new Set(faces.map((s) => s.count)).size > 10, true, 'eyes and mouths take different numbers of dots out of the face');
});

// ---------------------------------------------------------------- the page

test('the page: a big tab is folded, and a search shows what it found a few hundred at a time', () => {
  const app = fs.readFileSync(new URL('js/app.js', root), 'utf8');
  const css = fs.readFileSync(new URL('css/style.css', root), 'utf8');
  assert.ok(app.includes('const FOLD_FROM = 900;') && app.includes('const FOUND_AT_ONCE = 200;'));
  // so many shapes under each heading of a big tab that all its headings are a short scroll apart, in whole rows of four
  assert.ok(app.includes('const most = list.length > FOLD_FROM ? Math.max(8, Math.floor(480 / kinds.length / 4) * 4) : Infinity;'));
  assert.ok(app.includes('const folded = size > most + 8 && !unfolded.has(key);'));
  assert.ok(app.includes('`Show all ${size}`') && app.includes('`Show ${some} more`'));
  // the button that was pressed is gone: the first of the shapes it brought is where the keyboard is
  assert.ok(app.includes('if (next && made.has(next.id)) made.get(next.id).focus({ preventScroll: true });'));
  assert.ok(app.includes('list.slice(0, found).forEach(add);'));
  assert.match(css, /\.shape-grid \.shape-more \{\s*grid-column: 1 \/ -1;/);
  // with these numbers no tab shows more than a few hundred buttons at once, whatever it holds
  for (const tab of CATEGORIES) {
    const list = SHAPES.filter((s) => s.cat === tab.id);
    const kinds = [...new Set(list.map((s) => s.sub || ''))].map((name) => list.filter((s) => (s.sub || '') === name).length);
    const most = list.length > 900 ? Math.max(8, Math.floor(480 / kinds.length / 4) * 4) : Infinity;
    const shown = kinds.reduce((sum, size) => sum + (size > most + 8 ? most : size), 0);
    assert.ok(shown <= 900, `the ${tab.name} tab shows ${shown} buttons when it opens`);
    // (the Letters tab is not folded: an alphabet is looked at as a whole)
    if (tab.id === 'letters') assert.equal(shown, list.length);
  }
  // the tabs: 32 names that fit a button of the narrow panel (eight full rows of four)
  assert.deepEqual(CATEGORIES.map((c) => c.name), ['Basic', '3D', 'Letters', 'Words', 'Names', 'Numbers', 'Symbols', 'Faces', 'Nature', 'Animals', 'Food', 'Things',
    'Travel', 'Costume', 'Pixel art', 'Curves', 'Patterns', 'Effects', 'Combos', 'Framed', 'Decorated', 'Monsters', 'Robots', 'Items', 'Space', 'Mandalas', 'Buildings', 'Sea',
    'Loot', 'Gear', '3D loot', '3D gear']);
  for (const c of CATEGORIES) assert.ok(c.name.length <= 9, c.name);
});

test('the page: a row of shapes stays in view, however many rows of tabs there are', () => {
  const app = fs.readFileSync(new URL('js/app.js', root), 'utf8');
  const css = fs.readFileSync(new URL('css/style.css', root), 'utf8');
  // The Add part of the left panel does not shrink below its buttons, its tabs and one row of shapes.
  // That is said by what is in it: no height is written down that one more row of tabs would make wrong
  // (as it was: with seven rows of tabs and a long scene list, not one shape was left in view).
  assert.match(css, /#left > #cat-add\.open \{ flex: 1 0 auto; \}/);
  assert.match(css, /#left > #cat-add\.open > \.cat-body > \.shape-grid \{ flex: 1 1 var\(--shape-row\); min-height: var\(--shape-row\); max-height: none; \}/);
  assert.doesNotMatch(css, /#cat-add\.open \{[^}]*min-height: var\(--one-row\)/);
  // a row of shapes: a heading, and buttons with a name of two lines
  assert.match(css, /#left \{ --shape-row: 113px; /);
  // What the scene list may take is what the Add part can spare, with one row of shapes and with two. For
  // that the page measures the rest of the Add part: it grows with the tabs, and with the notes that come and go.
  assert.match(css, /--one-row: calc\(var\(--add-rest\) \+ var\(--shape-row\)\); --two-rows: calc\(var\(--one-row\) \+ 83px\);/);
  assert.match(css, /#left > #cat-scene\.open \{ max-height: max\(124px, min\(100% - var\(--one-row\), max\(222px, min\(45%, 100% - var\(--two-rows\)\)\)\)\); \}/);
  const measure = /function measureAddPart\(\) \{[\s\S]*?\n\}/.exec(app)[0];
  assert.ok(measure.includes("if (isSmall() || !part.offsetHeight) return;"), 'not in one column, and not while the part is shut');
  assert.ok(measure.includes("part.getBoundingClientRect().height - $('#shapes').getBoundingClientRect().height"));
  assert.ok(measure.includes("left.style.setProperty('--add-rest', `${rest}px`)"));
  // measured when a part opens or shuts, when a search shows its note, when the note of a pick comes and goes, when the window changes
  const callers = ['function applyPanels() {', 'function pickShapeFor(index) {', 'function endPick() {'];
  for (const head of callers) {
    const body = app.slice(app.indexOf(head), app.indexOf('\n}\n', app.indexOf(head)));
    assert.ok(app.includes(head) && body.includes('measureAddPart();'), head);
  }
  assert.ok(app.includes('measureAddPart(); // (the note takes room, or gives it back)'));
  assert.ok(app.includes("window.addEventListener('resize', measureAddPart);"));
  // the tabs themselves: rows as low as they can be read, and of the old height where a finger presses them
  assert.match(css, /\.shape-tabs button \{ padding: 2px 1px; font-size: 12px; line-height: 16px; min-width: 0; \}/);
  assert.match(css, /\.shape-tabs button \{ padding: 4px 1px; \}/);
});
