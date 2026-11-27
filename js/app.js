// Bloxd Particle Studio: the user interface. Scene state lives here; the maths
// is in scene.js and motion.js, the changes that involve several objects in
// edits.js and moves.js, the code generator in codegen.js and the 3D view in
// viewport.js.

import { SHAPES, SHAPE_BY_ID, CATEGORIES, shapePoints, defaultParams, searchShapes, prepareSearch, shapeCaption, MAX_COUNT } from './shapes.js';
import {
  TEXTURES, PLACEHOLDER_TEXTURES, BLEND_MODES, LIFE_PER_SECOND, createObject, sanitizeScene,
  computeParticles, sceneDuration, sceneTree, isGroup, rgbToHex, localPoints,
} from './scene.js';
import {
  poseAt, markAt, keyAt, planOf, restPose, lineageMatrix, lookAt, NEAR_KEY,
  EASES, MAX_KEYS, MIN_KEY_GAP, MAX_START, MAX_REPEAT, MIN_EVERY, keyHasColor, keyHasSize,
  keyHasForm, flipZ, viewMatrix, mulAffine, applyMatrix,
} from './motion.js';
import { formName, formPoints, basePoints, PATH, CLOUD, PATH_MODES, MAX_NODES } from './forms.js';
import { DEFORMERS, DEFORMER_BY_ID, newDeformer, handlesOf, dragHandle, MAX_DEFORMERS, MAX_POINTS } from './deform.js';
import { generateCode, LIMITS, PRECISIONS } from './codegen.js';
import {
  uniqueName, topNodes, removeNodes, moveInto, groupNodes, ungroup, duplicateNodes, mirrorNodes, stretchNodes,
  copyKeys, pasteKeys, movePivot, arrayNodes, MAX_ARRAY,
  morphNodes, joinNodes, bakeForm, formCopyAt, invAffine, MORPH_WAIT, MORPH_TIME,
} from './edits.js';
import { MOVES, MOVE_BY_ID, moveFields, mostTimes, applyMove } from './moves.js';
import { EXAMPLES } from './examples-data.js';
import { createViewport } from './viewport.js';
import { createCodeWindow } from './code-ui.js';
import { sanitizeCode, WORLD_CHARS } from './nodes.js';
import { createShare } from './share-ui.js';
import { sceneText, shareData, SHARE_ERRORS } from './share.js';
import { createLibrary, browserStores, cleanName, cleanThumb, fileNameOf, nameOfFile, markOf, MAX_SCENES } from './library.js';
import { createScenes } from './library-ui.js';
import { createTimeline } from './timeline.js';
import { assetUrl } from './assets.js';
import { $, h, clone, round, selectOnEntry, category, recall, keep } from './ui.js';

const MANY_PARTICLES = 600; // above this one click may lag slower devices
/**
 * Above this, things that move fast may be seen out of step in the game: so
 * many particles times so many blocks a second, on their way at the same
 * moment (rushOf in js/codegen.js). A guess: 1500 is a fifth of a block when
 * the game takes an eighth of a millisecond to make a particle, and nobody has
 * measured how long it takes.
 */
const RUSH = 1500;
const PALETTE = [
  '#ffffff', '#c9d1e3', '#7d879c', '#1d2233', '#ff4d4d', '#ff8a3d', '#ffd24a', '#b6f24a', '#4ddb6a', '#2fd6b5',
  '#47c8ff', '#4f8dff', '#7a5cff', '#c05cff', '#ff5cc8', '#ff4d7a', '#8b5a2b', '#f5c9a0', '#6b2d2d', '#0b3d2e',
];
const SIDES = [['Left and right', 'X'], ['Up and down', 'Y'], ['Front and back', 'Z']];

// ------------------------------------------------------------------ state

const state = {
  objects: [], // objects and groups; what is in a group names it as its `parent`
  selection: [], // ids; the settings on the right show the last one
  mode: 'translate',
  playing: false,
  time: 0, // the time marker of the timeline, in seconds after the click
  ease: 'smooth', // how a new key is reached
  loop: false, // Play starts again at the end
  sky: false,
  snap: false,
  pivot: false, // moving a group moves only its pivot, not what is in it
  dragging: false, // a row of the scene list is being dragged
  clip: null, // the keys remembered by Copy keys
  move: { id: 'flap', settings: {} }, // the ready-made move on show, and what was typed for each
  // the Array category: what was typed for each kind (null: not typed yet, see arraySpec)
  array: {
    kind: 'row',
    row: { count: 5, step: [null, null, null] },
    grid: { counts: [3, 1, 3], gaps: [null, null, null] },
    ring: { count: 8, radius: null, plane: 'flat', arc: 360, turn: true },
    delay: 0,
    group: true,
  },
  // the Shape Studio: `on` shows the dots to drag in the 3D view (and hides the arrows), `tool` is the deformer
  // whose dots they are (-1: the corners of a drawn line, or the loose points), `point` the dot that is selected
  studio: { on: false, tool: -1, point: -1 },
  morph: { wait: MORPH_WAIT, time: MORPH_TIME }, // what was typed for the next morph
  pickFor: null, // { id, index }: the next shape clicked in Add becomes the shape of that key
  code: sanitizeCode(null), // the Code window: { graph (nodes and wires), own (your own code), lang } (js/nodes.js)
  style: { texture: 'glint', color: '#ffd24a' }, // look of the next new object
  export: { target: 'block', precision: 100, hideDist: 0, worldPos: [0, 0, 0], part: 0 },
};
// `state.selected` is the one whose settings are shown; setting it selects just that one.
Object.defineProperty(state, 'selected', {
  get: () => (state.selection.length ? state.selection[state.selection.length - 1] : null),
  set: (id) => { state.selection = id ? [id] : []; },
});
let viewport = null;
let timeline = null;
let codeWindow = null;
let share = null; // the Share window, and what reads a share link (js/share-ui.js)
let scenesWindow = null; // the My scenes window (js/library-ui.js)
/** My scenes: every scene the browser keeps, each in a place of its own (js/library.js). */
const library = createLibrary(browserStores());
/**
 * The scene that is open, as My scenes has it. id: its place there. name, and
 * named: somebody gave it that name (the studio's own are "Scene 3", or what an
 * example is called). created, updated: when it was made and changed last.
 * thumb: its small picture. link: it came by a share link (the mark of that
 * scene, see sharedTwin). text: what it is made of, as it was last stored, and
 * pictured: as it was when its picture was taken (see store and takePicture).
 * seen: the `updated` of what My scenes held when this tab last read or wrote
 * it (null: it is not there yet). Another tab that changes the scene changes
 * that: see store and catchUp.
 */
const current = { id: '', name: 'Scene', named: false, created: 0, updated: 0, thumb: '', link: '', text: '', pictured: '', seen: null };
/** The size of a scene's small picture. */
const THUMB = [288, 180];
/**
 * A scene that came by a share link is on trial until the studio has worked it
 * out once: drawn it, counted its particles, and looked where it is through
 * the show. Only then is it stored in the browser. A link can be made by
 * anyone, and a scene the studio chokes on must not be what the next visit
 * starts with. { spent: milliseconds of work so far, back(): puts back what
 * was there, quiet: it came before the page was drawn }
 */
let trial = null;
/** A shared scene that takes longer than this to work out is not kept. (The dragon takes a quarter of a second.) */
const SHARED_PATIENCE = 8000;
let keyPressed = false; // the last press was on a key of the timeline: Delete then removes that key, never the object
const images = {};
const history = [];
const future = [];

const tree = () => sceneTree(state.objects);
const nodeOf = (id) => state.objects.find((o) => o.id === id) || null;
const selectedObject = () => nodeOf(state.selected);
/** What is selected, in the order of the list. */
const selectedNodes = () => state.objects.filter((o) => state.selection.includes(o.id));
const startOf = (node) => (node.start > 0 ? node.start : 0);
const plural = (n, word) => `${n.toLocaleString('en')} ${word}${n === 1 ? '' : 's'}`;
/** A small screen has one column: the 3D view on top, the panels under it. */
const isSmall = () => window.matchMedia('(max-width: 900px)').matches;
/** There is a mouse: a pointer can rest on something. */
const canHover = () => window.matchMedia('(hover: hover)').matches;

function starterScene() {
  return [
    createObject('circle', {
      name: 'Ring', pos: [0.5, 1.35, 0.5], rot: [90, 0, 0], scale: [1.4, 1.4, 1.4], count: 40,
      texture: 'glint', color: '#ffc531', size: 0.35,
    }),
    createObject('heart', {
      name: 'Heart', pos: [0.5, 3.1, 0.5], scale: [0.9, 0.9, 0.9], count: 34, texture: 'heart', color: '#ff4d7a',
    }),
  ];
}

/** When an entry of My scenes was changed last, as a number that every change makes another one (0: it does not say). */
const stampOf = (raw) => (Number.isFinite(raw.updated) ? raw.updated : 0);

/** The scene of an entry of My scenes is what the studio holds from now on. (Nothing is drawn here: see settle.) */
function takeRecord(id, raw) {
  state.objects = sanitizeScene(raw).objects;
  applyExportOptions(raw.export);
  state.code = sanitizeCode(raw.code);
  const time = (v) => (Number.isFinite(v) && v > 0 ? v : Date.now());
  Object.assign(current, {
    id, name: cleanName(raw.name) || 'Scene', named: raw.named === true, created: time(raw.created), updated: time(raw.updated),
    thumb: cleanThumb(raw.thumb), link: typeof raw.link === 'string' ? raw.link.slice(0, 20) : '', pictured: '', seen: stampOf(raw),
  });
  current.text = contentText();
}

/**
 * The scene the page starts with: the one this tab had before it was loaded
 * again, else the one that was worked on last. False: there is none yet, and
 * the scene that is made then has its place in My scenes ready.
 */
function loadStored() {
  try {
    library.adopt(); // (the one scene the browser kept before there was a list)
    const id = library.pointer();
    const raw = id ? library.read(id) : null;
    if (raw) {
      takeRecord(id, raw);
      state.sky = !!raw.sky;
      state.snap = !!raw.snap;
      return true;
    }
  } catch { /* a scene that cannot be read: the page starts as on a first visit, and that scene stays where it is */ }
  const time = Date.now();
  Object.assign(current, {
    id: library.newId(), name: library.nameFor('Scene', { numbered: true }), named: false, created: time, updated: time, thumb: '', link: '', pictured: '', seen: null,
  });
  return false;
}

function applyExportOptions(raw) {
  if (!raw || typeof raw !== 'object') return;
  const e = state.export;
  if (raw.target === 'world' || raw.target === 'block') e.target = raw.target;
  if (PRECISIONS.some((p) => p.scale === raw.precision)) e.precision = raw.precision;
  if (Number(raw.hideDist) >= 0) e.hideDist = Math.min(1000, Number(raw.hideDist));
  if (Array.isArray(raw.worldPos) && raw.worldPos.length === 3 && raw.worldPos.every((v) => Number.isFinite(Number(v)))) {
    e.worldPos = raw.worldPos.map(Number);
  }
}

const fileData = () => ({
  app: 'bloxd-particle-studio', version: 1, name: current.name, objects: state.objects,
  export: { target: state.export.target, precision: state.export.precision, hideDist: state.export.hideDist, worldPos: state.export.worldPos },
  sky: state.sky, snap: state.snap, code: state.code,
});

/** What the scene is made of, as a text that changes when the scene does. (Which groups are open in the lists is no change.) */
const contentText = () => `${JSON.stringify(state.objects, (key, value) => (key === 'open' ? undefined : value))}${JSON.stringify([fileData().export, state.code])}`;

/**
 * The scene that is open goes to its place in My scenes, and is the one the
 * next visit starts with.
 *
 * The same scene may be open in another tab, which may have changed it since
 * this tab last looked (see `seen`, and catchUp, which looks whenever the tab
 * is looked at). Then nothing of the other tab's work is written over:
 *   - nothing has changed here (only the picture is new): nothing is written;
 *   - something has changed here too: what this tab has becomes a scene of
 *     its own, and says so;
 *   - the other tab deleted the scene: a change here puts it back.
 */
function store() {
  if (trial) return; // (a shared scene is stored once it has shown that the studio can work it out: see `trial`)
  const text = contentText();
  const changed = text !== current.text;
  const there = current.seen === null ? null : library.read(current.id);
  const moved = current.seen !== null && (!there || stampOf(there) !== current.seen);
  if (moved && !changed) {
    library.point(current.id);
    return;
  }
  if (moved && there) {
    const was = current.name;
    Object.assign(current, { id: library.newId(), name: library.nameFor(was), created: Date.now(), link: '', seen: null });
    showName();
    notice(`"${was}" was changed in another tab. What you have here is kept as "${current.name}".`);
  }
  if (changed) {
    current.text = text;
    current.updated = Date.now();
  }
  const kept = library.write(current.id, {
    ...fileData(), named: current.named, created: current.created, updated: current.updated, thumb: current.thumb, link: current.link,
  });
  current.seen = current.updated;
  library.point(current.id);
  // (a private window, a page inside another page, a full store: everything works until the page is closed, and Save still does)
  if (!kept && !unkeptTold && library.persistent()) {
    unkeptTold = true;
    toast('The store of this browser is full, so this scene is only kept until the page is closed. Save it as a file, or delete scenes in My scenes.', 'warn');
  }
  if (kept) unkeptTold = false;
}
let unkeptTold = false; // the words about a full store were said (once, until there is room again)

// ------------------------------------------------------------------ history

const snapshot = () => JSON.stringify(state.objects);

/** Only what is still in the scene stays selected. */
function pruneSelection() {
  const ids = new Set(state.objects.map((o) => o.id));
  state.selection = state.selection.filter((id) => ids.has(id));
  if (!isGroup(selectedObject())) state.pivot = false;
}

/** Call after a finished change: remembers it for undo and saves. */
function commit() {
  pruneSelection();
  const now = snapshot();
  if (history[history.length - 1] !== now) {
    history.push(now);
    if (history.length > 200) history.shift();
    future.length = 0;
    arrayStep = null;
  }
  store();
  renderList();
  updateHistoryButtons();
}

function restore(json) {
  // (which groups are open in the lists is not a step for Undo: they stay as they are now)
  const open = new Map(state.objects.filter(isGroup).map((g) => [g.id, g.open]));
  state.objects = sanitizeScene({ objects: JSON.parse(json) }).objects;
  for (const g of state.objects) if (isGroup(g) && open.has(g.id)) g.open = open.get(g.id);
  history[history.length - 1] = snapshot(); // the step on top is exactly what is shown now
  pruneSelection();
  // an array that went into a group, taken back: what it was made of is selected again, for a try with other numbers
  if (!state.selection.length && arrayStep && arrayStep.at === history.length - 1) state.selection = arrayStep.ids.filter((id) => nodeOf(id));
  arrayRest = false;
  Object.assign(state.studio, { tool: -1, point: -1 }); // (the tool or the dot it was on may be gone)
  state.pickFor = null;
  reveal();
  stopPlaying();
  store();
  renderList();
  renderInspector();
  refresh();
  updateHistoryButtons();
}

function undo() {
  if (history.length < 2) return;
  future.push(history.pop());
  restore(history[history.length - 1]);
}

function redo() {
  if (!future.length) return;
  const next = future.pop();
  history.push(next);
  restore(next);
}

function updateHistoryButtons() {
  $('#undo').disabled = history.length < 2;
  $('#redo').disabled = !future.length;
}

// ------------------------------------------------------------------ where things are at the time marker

/**
 * A node at the time marker:
 *   play   which of its plays the marker is in (see sceneTree().playAt): { start, ancestors }
 *   local  seconds since that play started (negative: it has not started yet)
 *   lasts  seconds one play takes
 *   mark   what the marker points at, and so what a change of its place changes (see markAt)
 *   pose   where it is then, as its group sees it: { pos, rot, scale }
 *   around the groups around it at that moment, as one view matrix
 * With the marker at the very start everything is shown where it starts, also
 * what appears later and what is in a group that has moved by then.
 */
function standOf(node, tr = tree()) {
  const play = tr.playAt(node, state.time);
  const lasts = tr.onceOf(node);
  const local = state.time - play.start;
  const mark = markAt(node, startOf(node) + local, { start: startOf(node), end: startOf(node) + lasts });
  if (state.time === 0 && !state.playing) {
    return { play, local, lasts, mark, pose: restPose(node, false), around: tr.aroundOf(node, -Infinity) };
  }
  const pose = local <= 0 ? restPose(node, false) : local >= lasts ? restPose(node, true) : poseAt(node, local);
  const around = lineageMatrix(play.ancestors, Math.min(Math.max(state.time, play.start), play.start + lasts));
  return { play, local, lasts, mark, pose, around };
}

/** Where a node is at the time marker, as its group sees it: { pos, rot, scale }. */
const poseNow = (node) => standOf(node).pose;

/** How many particles the game makes for a node: for every point one for each stretch of its way, in every play. */
function costOf(node, tr = tree()) {
  let n = 0;
  for (const leaf of tr.leavesOf(node)) {
    if (tr.isHidden(leaf)) continue;
    const points = leaf.shape === 'point' ? 1 : localPoints(leaf).length;
    // (a piece can be for other points than the ones the object starts with: a key changed its shape)
    const cost = (play) => planOf(leaf, play).pieces.reduce((sum, piece) => sum + (piece.pts ? piece.pts.length : points), 0);
    n += tr.plain(leaf) ? points : tr.playsOf(leaf).reduce((sum, play) => sum + cost(play), 0);
  }
  return n;
}

// ------------------------------------------------------------------ drawing

let statsTimer = 0;

function refresh() {
  renderTimeline();
  if (!viewport) return;
  const tr = tree();
  // Not playing, time marker at the start: everything where it starts, fully
  // visible, to build with. Anywhere else: that moment, with the objects that
  // are not there then drawn see-through so they can still be picked.
  const began = performance.now();
  if (!state.playing) viewport.setParticles(arrayGhosts() || computeParticles(state.objects, state.time > 0 ? state.time : null, { ghosts: true }));
  if (trial) trial.spent += performance.now() - began;
  const nodes = selectedNodes();
  const ids = [...new Set(nodes.flatMap((n) => tr.leavesOf(n)).map((leaf) => leaf.id))];
  // the handles sit where the object is at that moment; several objects have none
  const one = nodes.length === 1 && !tr.isHidden(nodes[0]) ? nodes[0] : null;
  const stand = one ? standOf(one, tr) : null;
  // the Shape Studio: its dots are dragged instead of the arrows
  const dots = one ? studioDots(one) : [];
  viewport.setHandles(dots);
  $('#studio').classList.toggle('on', state.studio.on && !!one && !isGroup(one));
  viewport.setMode(state.pivot && isGroup(one) ? 'translate' : state.mode);
  viewport.setSelection(ids, stand && !dots.length ? { pose: stand.pose, around: stand.around, point: one.shape === 'point' } : null, !state.playing);
  clearTimeout(statsTimer);
  statsTimer = setTimeout(updateStats, 120);
}

/** Particle count and how many code blocks the scene needs. */
function updateStats() {
  const began = performance.now();
  let result;
  try {
    result = generateCode(state.objects, state.export);
  } catch (err) {
    if (!trial) throw err;
    endTrial(true); // (a shared scene the studio cannot work out at all: what was there comes back, and is counted instead)
    return updateStats();
  }
  if (trial) {
    trial.spent += performance.now() - began;
    if (endTrial(false)) return updateStats();
  }
  const pill = $('#count');
  const blocks = result.parts.length;
  const split = state.export.target === 'block' && blocks > 1;
  pill.textContent = `${plural(result.particles, 'particle')}${split ? ` · ${blocks} blocks` : ''}`;
  pill.className = `pill${result.particles > MANY_PARTICLES || split ? ' warn' : ''}`;
  pill.title = split
    ? `The code needs ${blocks} code blocks stacked on top of each other (16,000 characters fit in one).`
    : `${result.parts[0].chars.toLocaleString('en')} of ${LIMITS.chars.toLocaleString('en')} characters of one code block`;
  if (viewport) viewport.setBlocks(state.export.target === 'block' ? blocks : 1);
  $('#empty').hidden = state.objects.length > 0;
  if ($('#export-dialog').open) renderExport(result);
  return result;
}

/** A texture drawn in a colour, the way the game tints it. */
function tinted(texture, color, px) {
  const canvas = h('canvas', { width: px, height: px, class: 'tex' });
  const img = images[texture];
  if (!img) return canvas;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const k = px / Math.max(img.naturalWidth, img.naturalHeight);
  const w = img.naturalWidth * k;
  const hgt = img.naturalHeight * k;
  const x = (px - w) / 2;
  const y = (px - hgt) / 2;
  ctx.drawImage(img, x, y, w, hgt);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, px, px);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, x, y, w, hgt);
  return canvas;
}

/** Ctrl adds to what is selected, Shift takes everything from the last one to this one. */
const howClicked = (e) => ({ add: e.ctrlKey || e.metaKey, range: e.shiftKey });

/** The scene list: groups first, what is in them under them. A closed group hides what it holds. */
function renderList() {
  const tr = tree();
  const chosen = new Set(state.selection);
  const list = $('#objects');
  list.replaceChildren(...tr.rows(true).map(({ node, depth }) => {
    const group = isGroup(node);
    const hidden = tr.isHidden(node);
    const li = h('li', {
      class: `${chosen.has(node.id) ? 'selected' : ''} ${hidden ? 'hidden' : ''} ${group ? 'group' : ''}`.trim(),
      'data-id': node.id, draggable: true, style: `padding-left:${6 + depth * 14}px`,
      onclick: (e) => select(node.id, howClicked(e)),
      ondragstart: (e) => {
        // (a browser gives up a drag whose row is rebuilt or pushed away under the mouse:
        //  selecting only marks the rows, and the note below the list comes a moment later)
        if (!state.selection.includes(node.id)) select(node.id);
        e.dataTransfer.setData('text/plain', node.id);
        e.dataTransfer.effectAllowed = 'move';
        state.dragging = true;
        setTimeout(() => { if (state.dragging) $('#drop-out').hidden = !selectedNodes().some((n) => n.parent); }, 0);
      },
      ondragend: endDrag,
    },
    group
      ? h('button', {
        class: `fold${node.open === false ? '' : ' open'}`, title: node.open === false ? 'Open this group' : 'Close this group',
        'aria-label': node.open === false ? 'Open group' : 'Close group',
        onclick: (e) => { e.stopPropagation(); toggleFold(node.id); },
      }, h('span', { class: 'chev' }))
      : tinted(node.texture, node.color, 40),
    h('span', { class: 'name' }, node.name),
    h('span', { class: 'n', title: group ? 'Things in this group' : 'Particles' }, String(group ? tr.childrenOf(node).length : node.shape === 'point' ? 1 : localPoints(node).length)),
    h('button', {
      title: node.hidden ? 'Show' : 'Hide', 'aria-label': node.hidden ? 'Show' : 'Hide',
      onclick: (e) => { e.stopPropagation(); node.hidden = !node.hidden; commit(); renderInspector(); refresh(); },
    }, node.hidden ? 'show' : 'hide'),
    h('button', {
      title: group ? 'Delete the group and what is in it' : 'Delete', 'aria-label': 'Delete', class: 'danger',
      onclick: (e) => { e.stopPropagation(); removeSelected([node.id]); },
    }, '\u00D7'));
    if (group) {
      // drop on a group: into that group
      li.addEventListener('dragover', (e) => { e.preventDefault(); li.classList.add('drop'); });
      li.addEventListener('dragleave', () => li.classList.remove('drop'));
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        li.classList.remove('drop');
        endDrag();
        intoGroup(node.id);
      });
    }
    return li;
  }));
  $('#empty').hidden = state.objects.length > 0;
  endDrag(); // (a list that is built anew has nothing dragged in it)
  markRows();
}

/** Nothing from the list is being dragged any more. */
function endDrag() {
  state.dragging = false;
  $('#drop-out').hidden = true;
  $('#drop-out').classList.remove('drop');
}

/** Show what is selected in the list as it stands, without building it anew. */
function markRows() {
  const chosen = new Set(state.selection);
  for (const li of $('#objects').children) li.classList.toggle('selected', chosen.has(li.dataset.id));
  $('#group').disabled = !state.selection.length;
  showSelectedRow();
}

/**
 * Bring the row of what was selected last into sight, where the list scrolls
 * by itself. (Never the page: on a small screen the 3D view must stay put.)
 */
function showSelectedRow() {
  const list = $('#objects');
  const box = list.parentElement;
  const row = state.selected && list.querySelector(`li[data-id="${state.selected}"]`);
  if (!row || box.scrollHeight <= box.clientHeight + 1) return;
  const top = row.offsetTop - list.offsetTop;
  const bottom = top + row.offsetHeight;
  if (top < box.scrollTop) box.scrollTop = top;
  else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
}

/** Change which groups are open: like the look of the lists, that is no step for Undo. */
function refold(change) {
  const saved = history[history.length - 1] === snapshot();
  change();
  if (saved) history[history.length - 1] = snapshot();
  store();
}

/** What is selected is never out of sight: the groups around it open. Returns whether one did. */
function reveal() {
  const tr = tree();
  const shut = new Set();
  for (const id of state.selection) {
    const node = tr.byId.get(id);
    if (node) for (const group of tr.chainOf(node)) if (group.open === false) shut.add(group);
  }
  if (shut.size) refold(() => { for (const group of shut) group.open = true; });
  return shut.size > 0;
}

// ------------------------------------------------------------------ scene edits

/**
 * Select an object or group (null: nothing). `add`: also this one, or no longer
 * this one. `range`: everything in the list from the last one to this one.
 */
function select(id, { add = false, range = false } = {}) {
  const before = state.selection.join();
  if (!id) state.selection = [];
  else if (range && state.selected) {
    const rows = tree().rows(true).map((r) => r.node.id);
    const a = rows.indexOf(state.selected);
    const b = rows.indexOf(id);
    state.selection = a < 0 || b < 0 ? [id] : [...new Set([...state.selection, ...rows.slice(Math.min(a, b), Math.max(a, b) + 1).filter((x) => x !== id), id])];
  } else if (add) state.selection = state.selection.includes(id) ? state.selection.filter((x) => x !== id) : [...state.selection, id];
  else state.selection = [id];
  if (state.selection.join() === before) return;
  state.pivot = false;
  Object.assign(state.studio, { on: false, tool: -1, point: -1 });
  endPick();
  // (the rows stay the elements they are, so a click or a drag that began on one goes on)
  if (reveal()) renderList();
  else markRows();
  renderInspector();
  refresh();
}

/** A click on a particle in the 3D view: the group it is in first, then what is in the group. */
function pick(id, { add = false } = {}) {
  if (state.playing) return;
  if (!id) { if (!add) select(null); return; }
  const tr = tree();
  const leaf = tr.byId.get(id);
  if (!leaf) return;
  const path = [...tr.chainOf(leaf).reverse(), leaf]; // from the outermost group in
  const now = selectedObject();
  let target = path[0];
  if (now && !add) {
    const at = path.indexOf(now);
    if (at >= 0) target = path[Math.min(at + 1, path.length - 1)]; // clicked again: one step in
    else {
      // working inside a group: stay at that depth
      const around = new Set(tr.chainOf(now));
      path.forEach((n, k) => { if (around.has(n)) target = path[k + 1]; });
    }
  }
  select(target.id, { add });
}

/** What an edit from edits.js or moves.js gave back: take it over, or say why it could not be done. */
function take(result, { ids = null, say = '' } = {}) {
  if (!result || result.error) {
    toast(result && result.error ? result.error : 'That could not be done.', 'warn');
    return false;
  }
  stopPlaying();
  if (result.objects) state.objects = result.objects;
  if (ids) state.selection = ids;
  reveal();
  commit();
  renderInspector();
  refresh();
  if (say) toast(say);
  return true;
}

function addObject(shape) {
  stopPlaying();
  const pos = shape === 'point' ? [0.5, 1.5, 0.5] : [0.5, 2.5, 0.5];
  const taken = () => state.objects.some((o) => !o.parent && o.pos.every((v, i) => Math.abs(v - pos[i]) < 1e-6));
  while (taken()) pos[0] += shape === 'point' ? 0.5 : 2.5; // never hide a new object inside an old one
  const obj = createObject(shape, { pos, texture: state.style.texture, color: state.style.color });
  obj.name = uniqueName(state.objects, obj.name);
  if (state.time > startOf(obj) + obj.life / LIFE_PER_SECOND) state.time = 0; // at the time marker it would be gone already
  state.objects.push(obj);
  state.selection = [obj.id];
  commit();
  renderInspector();
  refresh();
}

/** Delete what is selected (or the given ids), with everything that is in it. */
function removeSelected(ids = state.selection) {
  if (!ids.length) return;
  state.objects = removeNodes(state.objects, ids);
  commit();
  renderInspector();
  refresh();
}

function duplicateSelected() {
  if (!state.selection.length) return;
  const made = duplicateNodes(state.objects, state.selection);
  take(made, { ids: made.ids });
}

function mirrorSelected(axis) {
  if (!state.selection.length) return;
  const made = mirrorNodes(state.objects, state.selection, axis);
  const [first] = selectedNodes();
  const where = first && first.parent ? 'the pivot of its group' : axis === 1 ? 'its own height' : 'the middle of the code block';
  take(made, { ids: made.ids, say: `Mirror copy made: the mirror stands in ${where}.` });
}

function groupSelected() {
  if (!state.selection.length) return toast('Select the objects for the group first. Ctrl+click selects several.');
  const made = groupNodes(state.objects, state.selection);
  return take(made, { ids: [made.id], say: 'Group made. Move, turn or resize it and everything in it comes along.' });
}

function ungroupSelected() {
  const group = selectedObject();
  if (!isGroup(group)) return;
  const lost = group.keys.length || group.repeat > 1;
  const made = ungroup(state.objects, group.id);
  take(made, { ids: made.ids, say: lost ? 'Group taken apart. What the group itself did (its keys, its repeats) is gone: Undo brings it back.' : '' });
}

/** Move what is selected into a group, or out of all groups (null). */
function intoGroup(groupId) {
  const ids = state.selection.filter((id) => id !== groupId);
  if (!ids.length) return;
  take(moveInto(state.objects, ids, groupId));
}

/** Open or close a group in the lists. (Not a step for Undo.) */
function toggleFold(id) {
  const group = nodeOf(id);
  if (!isGroup(group)) return;
  refold(() => { group.open = group.open === false; });
  // closing a group selects it instead of what it hides
  if (!group.open) {
    const inside = new Set(tree().insideOf(group).map((n) => n.id));
    if (state.selection.some((x) => inside.has(x))) state.selection = [...state.selection.filter((x) => !inside.has(x) && x !== id), id];
  }
  renderList();
  renderInspector();
  refresh();
}

/**
 * Places to frame the camera on: where the particles are at the start and
 * through the show. `enough`: asked before every moment of the show; when it
 * says yes, the moments that are left are left out.
 */
function allPoints(enough = null) {
  const points = computeParticles(state.objects, null).map((p) => p.pos);
  const end = duration();
  if (state.objects.some((o) => o.keys.length || o.move && o.move.some((v) => v))) {
    for (let i = 1; i <= 8; i++) {
      if (enough && enough()) break;
      const shown = computeParticles(state.objects, (end * i) / 8.02);
      const step = Math.max(1, Math.floor(shown.length / 150));
      for (let k = 0; k < shown.length; k += step) points.push(shown[k].pos);
    }
  }
  return points;
}

/** Live edit of the selected object (sliders, typing, handles). */
function edit(change) {
  const obj = selectedObject();
  if (!obj) return;
  change(obj);
  refresh();
  syncInspector();
}

// ------------------------------------------------------------------ settings on the right: the parts

let fields = []; // [{ sync() }] refreshed after every edit

function syncInspector() {
  for (const f of fields) f.sync();
}

/** Run `build` with the fields it makes kept in a list of their own (for a part that is rebuilt on its own). */
function withFields(list, build) {
  const outer = fields;
  fields = list;
  try { return build(); } finally { fields = outer; }
}

/** Number box bound to the selected object. */
function numberInput({ get, set, min, max, step = 0.1, digits = 3, title, label, rerender = false }) {
  const el = h('input', {
    type: 'number', step, min, max, title, 'aria-label': label,
    oninput: () => {
      const v = Number(el.value);
      if (el.value === '' || !Number.isFinite(v)) return;
      edit((o) => set(o, Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))));
    },
    onchange: () => { syncInspector(); commit(); if (rerender) renderInspector(); },
  });
  selectOnEntry(el);
  fields.push({ sync: () => { const o = selectedObject(); if (o && document.activeElement !== el) el.value = round(get(o), digits); } });
  return el;
}

/** Slider with a number box next to it (the box may go beyond the slider). */
function sliderPair({ get, set, min, max, step, numMax, numMin, label }) {
  const range = h('input', {
    type: 'range', min, max, step, 'aria-label': label,
    oninput: () => edit((o) => set(o, Number(range.value))),
    onchange: () => { commit(); range.blur(); }, // give the keyboard back to the shortcuts
  });
  fields.push({ sync: () => { const o = selectedObject(); if (o) range.value = get(o); } });
  return h('div', { class: 'pair' }, range, numberInput({ get, set, min: numMin ?? min, max: numMax ?? max, step, label }));
}

const row = (label, control) => h('div', { class: 'row' }, h('span', { class: 'l' }, label), control);
const note = (...text) => h('p', { class: 'note' }, ...text);
const withUnit = (control, unit) => h('div', { class: 'seconds' }, control, h('span', { class: 'note' }, unit));

/** A line of text that follows the selected object: `text(o)` gives the words ('' hides it). */
function liveNote(text, tag = 'p') {
  const el = h(tag, { class: tag === 'p' ? 'note' : '' });
  fields.push({
    sync: () => {
      const o = selectedObject();
      if (!o) return;
      const words = text(o);
      el.textContent = words;
      el.hidden = !words;
    },
  });
  return el;
}

function xyz(get, set, step, labelPrefix) {
  return h('div', { class: 'xyz' }, ['X', 'Y', 'Z'].map((axis, i) => h('div', { class: 'axis', 'data-axis': axis },
    numberInput({ get: (o) => get(o)[i], set: (o, v) => { set(o, i, v); }, step, label: `${labelPrefix} ${axis}` }))));
}

function checkbox(label, get, set) {
  const box = h('input', {
    type: 'checkbox',
    onchange: () => { edit((o) => set(o, box.checked)); commit(); renderInspector(); box.blur(); },
  });
  fields.push({ sync: () => { const o = selectedObject(); if (o) box.checked = get(o); } });
  return h('label', { class: 'check' }, box, label);
}

function colorControl(get, set, label) {
  const picker = h('input', {
    type: 'color', 'aria-label': label,
    oninput: () => edit((o) => set(o, picker.value)),
    onchange: commit,
  });
  const text = h('input', {
    type: 'text', maxLength: 7, size: 7, spellcheck: false, 'aria-label': `${label} hex`,
    oninput: () => { if (/^#[0-9a-f]{6}$/i.test(text.value)) edit((o) => set(o, text.value.toLowerCase())); },
    onchange: () => { syncInspector(); commit(); },
  });
  selectOnEntry(text);
  fields.push({
    sync: () => {
      const o = selectedObject();
      if (!o) return;
      picker.value = get(o);
      if (document.activeElement !== text) text.value = get(o);
    },
  });
  return h('div', { class: 'inline' }, picker, text);
}

/** The little squares of ready colours. */
const swatches = (set) => h('div', { class: 'swatches' }, PALETTE.map((c) => h('button', {
  style: `background:${c}`, title: c, 'aria-label': `Colour ${c}`,
  onclick: () => { edit((o) => set(o, c)); commit(); },
})));

/** A number box that changes nothing while typing: `apply(value)` runs when the typing is done. */
function numberOnEnter({ get, apply, min, max, step = 0.1, label, title }) {
  const el = h('input', {
    type: 'number', step, min, max, title, 'aria-label': label,
    onchange: () => {
      const v = Number(el.value);
      if (el.value !== '' && Number.isFinite(v)) apply(Math.min(max, Math.max(min, v)));
      syncInspector();
    },
    onkeydown: (e) => { if (e.key === 'Enter') el.blur(); },
  });
  selectOnEntry(el);
  fields.push({ sync: () => { if (document.activeElement !== el) el.value = round(get(), 2); } });
  return el;
}

// ------------------------------------------------------------------ settings on the right: the categories

/** The few words next to the heading of a category, so a closed one still says what is in it. */
const summary = (text) => liveNote(text, 'span');
const inline = (...parts) => h('div', { class: 'inline' }, ...parts);

/** Name and the buttons for the whole thing. */
function headOf(node) {
  const group = isGroup(node);
  const def = SHAPE_BY_ID[node.shape];
  const custom = !group && !def && node.shape !== 'point'; // drawn, or loose points
  const fallback = group ? 'Group' : def ? def.name : custom ? formName(node) : 'Particle';
  const name = h('input', {
    type: 'text', maxLength: 40, 'aria-label': 'Name', value: node.name,
    oninput: () => { node.name = name.value.trim() || fallback; },
    onchange: () => { commit(); renderTimeline(); },
  });
  selectOnEntry(name);
  return h('div', { class: 'ins-head' },
    h('h2', {}, group ? 'Group' : def ? `${def.name} shape` : custom ? formName(node) : 'Single particle'),
    row('Name', name),
    h('div', { class: 'buttons' },
      h('button', { onclick: duplicateSelected, title: 'Ctrl+D' }, 'Duplicate'),
      h('button', { onclick: showArray, title: 'Copies in a row, a grid or a ring (A)' }, 'Array'),
      h('button', { onclick: () => { node.hidden = !node.hidden; commit(); renderInspector(); refresh(); } }, node.hidden ? 'Show' : 'Hide'),
      group ? h('button', { onclick: ungroupSelected, title: 'Take the group apart: what is in it stays (Ctrl+Shift+G)' }, 'Ungroup') : null,
      h('button', { class: 'danger', onclick: () => removeSelected(), title: group ? 'Delete the group and what is in it' : 'Delete' }, 'Delete')),
    group ? note('A group holds objects. Move, turn or resize it and everything in it comes along; its keys move them all.') : null);
}

function lookSection(obj) {
  const texButtons = TEXTURES.map((t) => h('button', {
    title: t + (PLACEHOLDER_TEXTURES.includes(t) ? ' (preview picture is a stand-in)' : ''),
    'data-texture': t, 'aria-label': `Texture ${t}`,
    onclick: () => {
      edit((o) => { o.texture = t; });
      state.style.texture = t;
      commit();
    },
  }, h('img', { src: assetUrl(`textures/${t}.png`), alt: '' }), PLACEHOLDER_TEXTURES.includes(t) ? h('span', { class: 'approx' }, '~') : null));
  const texName = h('code', {});
  const texNote = h('span', {});
  fields.push({
    sync: () => {
      const o = selectedObject();
      if (!o) return;
      texButtons.forEach((b) => b.classList.toggle('on', b.dataset.texture === o.texture));
      texName.textContent = o.texture;
      texNote.textContent = PLACEHOLDER_TEXTURES.includes(o.texture) ? ' The picture here is a stand-in; the game uses its own.' : '';
    },
  });
  const setColor = (o, v) => { o.color = v; state.style.color = v; };
  const blend = h('select', {
    'aria-label': 'Blend mode',
    onchange: () => { edit((o) => { o.blend = Number(blend.value); }); commit(); blend.blur(); },
  }, BLEND_MODES.map((b) => h('option', { value: b.id }, `${b.name} (${b.id})`)));
  fields.push({ sync: () => { const o = selectedObject(); if (o) blend.value = String(o.blend); } });
  return category('look', 'Look', [
    h('div', { class: 'tex-grid' }, texButtons),
    h('p', { class: 'tex-name' }, texName, h('span', { class: 'note' }, texNote)),
    row('Colour', colorControl((o) => o.color, setColor, 'Colour')),
    swatches(setColor),
    row('Mix with', inline(
      checkbox('second colour', (o) => o.color2 !== null, (o, on) => { o.color2 = on ? '#ffffff' : null; }),
      obj.color2 !== null ? colorControl((o) => o.color2 || '#ffffff', (o, v) => { o.color2 = v; }, 'Second colour') : null)),
    obj.color2 !== null ? note('Each particle gets a random colour between the two.') : null,
    row('Size', sliderPair({ get: (o) => o.size, set: (o, v) => { o.size = v; if (o.size2 !== null) o.size2 = Math.max(o.size2, v); }, min: 0.05, max: 2, step: 0.05, numMax: 50, label: 'Particle size' })),
    row('Random', inline(
      checkbox('sizes up to', (o) => o.size2 !== null, (o, on) => { o.size2 = on ? round(o.size * 2, 2) : null; }),
      obj.size2 !== null ? numberInput({ get: (o) => o.size2 ?? o.size, set: (o, v) => { o.size2 = v; }, min: 0.01, max: 50, step: 0.05, label: 'Largest size' }) : null)),
    row('Blend', blend),
    liveNote((o) => (o.keys.some((k) => keyHasColor(k) || keyHasSize(k)) ? 'This is the look it starts with. Its keys change it: see Keys.' : '')),
  ], { open: true, summary: summary((o) => o.texture) });
}

function shapeSection(def) {
  const count = (o) => shapePoints(o.shape, o.count, o.params).length;
  return category('shape', 'Shape', [
    row('How many', sliderPair({ get: (o) => o.count, set: (o, v) => { o.count = Math.round(v); }, min: def.min, max: 300, step: 1, numMax: MAX_COUNT, label: 'Particle count' })),
    liveNote((o) => (count(o) === o.count ? '' : `This shape uses ${count(o)} particles.`)),
    (def.params || []).map((p) => row(p.label, sliderPair({
      get: (o) => o.params[p.key] ?? p.default, set: (o, v) => { o.params[p.key] = v; }, min: p.min, max: p.max, step: p.step, label: p.label,
    }))),
  ], { open: true, summary: summary((o) => plural(count(o), 'particle')) });
}

/** Place: shown and changed at the time marker (the thing itself, or the key there). */
function placeSection(node) {
  const group = isGroup(node);
  const isShape = node.shape !== 'point';
  const pivot = h('input', {
    type: 'checkbox', checked: state.pivot,
    onchange: () => { state.pivot = pivot.checked; pivot.blur(); refresh(); syncInspector(); },
  });
  return category('place', 'Place', [
    row('Position', xyz((o) => poseNow(o).pos, (o, i, v) => setPose(o, (k) => { k.pos[i] = v; }), 0.25, 'Position')),
    note(node.parent ? `Blocks from the pivot of its group, ${nodeOf(node.parent).name}.` : 'Blocks from the corner of the code block. Y is up.'),
    group ? h('label', { class: 'check line' }, pivot, 'Move only the pivot') : null,
    group ? liveNote(() => (state.pivot
      ? 'Now only the pivot moves and what is in the group stays put. Untick this when the pivot is where it should be.'
      : 'The pivot is the point the group turns about and is resized from: it is where the arrows are. Tick this to move it without moving what is in the group.')) : null,
    isShape ? row('Rotation', xyz((o) => poseNow(o).rot, (o, i, v) => setPose(o, (k) => { k.rot[i] = v; }), 15, 'Rotation')) : null,
    isShape ? row('Scale', sliderPair({
      get: (o) => Math.max(...poseNow(o).scale.map(Math.abs)),
      set: (o, v) => setPose(o, (k) => {
        const now = Math.max(...k.scale.map(Math.abs));
        k.scale = now > 0 ? k.scale.map((s) => round((s / now) * v, 4)) : [v, v, v];
      }),
      min: 0.1, max: 6, step: 0.05, numMax: 100, label: 'Scale',
    })) : null,
    isShape ? row('Stretch', xyz((o) => poseNow(o).scale, (o, i, v) => setPose(o, (k) => { k.scale[i] = v; }), 0.1, 'Scale')) : null,
    isShape ? h('div', { class: 'buttons' },
      group ? null : h('button', { onclick: () => { edit((o) => setPose(o, (k) => { k.rot = [90, 0, 0]; })); commit(); } }, 'Lay flat'),
      group ? null : h('button', { onclick: () => { edit((o) => setPose(o, (k) => { k.rot = [0, 0, 0]; })); commit(); } }, 'Stand up'),
      h('button', { title: 'No turn, size 1', onclick: () => { edit((o) => setPose(o, (k) => { k.rot = [0, 0, 0]; k.scale = [1, 1, 1]; })); commit(); } }, 'Reset')) : null,
    liveNote((o) => (o.keys.length ? placeHint(o) : '')),
  ], { summary: summary((o) => poseNow(o).pos.map((v) => round(v, 2)).join(', ')) });
}

function timeSection(node) {
  const group = isGroup(node);
  const after = node.parent ? 'seconds after its group starts' : 'seconds after the click';
  return category('time', 'Time and repeat', [
    row(group ? 'Starts' : 'Appears', withUnit(numberInput({
      get: (o) => o.start, set: (o, v) => { o.start = round(v, 3); }, min: 0, max: MAX_START, step: 0.1,
      label: 'Starts after seconds', title: 'The same as dragging its bar on the timeline.',
    }), after)),
    group ? null : row('Lifetime', numberInput({ get: (o) => o.life, set: (o, v) => { o.life = v; }, min: 0.05, max: 1000, step: 0.5, label: 'Lifetime' })),
    group ? null : liveNote((o) => {
      const byKeys = o.keys.length && o.keys[o.keys.length - 1].t > o.life / LIFE_PER_SECOND;
      return `Stays about ${round(tree().onceOf(o), 1)} seconds in the game${byKeys ? ': until its last key' : ''}.`;
    }),
    group ? null : row('Beginning', checkbox('fade in', (o) => o.fadeIn, (o, on) => { o.fadeIn = on; })),
    group ? null : row('Ending', checkbox('fade out', (o) => o.fade, (o, on) => { o.fade = on; })),
    row('Repeat', withUnit(numberInput({
      get: (o) => o.repeat, set: (o, v) => { o.repeat = Math.round(v); }, min: 1, max: MAX_REPEAT, step: 1, digits: 0,
      label: 'How many times it is played', rerender: true,
    }), 'times')),
    node.repeat > 1 ? row('Every', h('div', { class: 'seconds' },
      numberInput({ get: (o) => o.every, set: (o, v) => { o.every = round(v, 3); }, min: MIN_EVERY, max: 600, step: 0.1, label: 'Seconds from one play to the next' }),
      h('button', {
        title: 'One play right after the other',
        onclick: () => { edit((o) => { o.every = round(Math.min(600, Math.max(MIN_EVERY, tree().onceOf(o))), 3); }); commit(); },
      }, 'Back to back'))) : null,
    liveNote((o) => (o.repeat > 1
      ? `Played ${o.repeat} times, ${round(o.every, 2)} seconds apart. Every play makes its particles again: ${plural(costOf(o), 'particle')} in all.`
      : 'More than 1 plays it again and again, with new particles each time.')),
    row('Lasts', withUnit(numberOnEnter({
      get: () => tree().onceOf(selectedObject()), apply: stretchSelected, min: 0.05, max: 6000, label: 'Seconds one play lasts',
      title: 'Type another length: everything it does gets slower or faster to fit.',
    }), 'seconds')),
    note(group ? 'Type another length to stretch it: all that is in it gets slower or faster to fit.' : 'Type another length to stretch it: all it does gets slower or faster to fit.'),
  ], {
    summary: summary((o) => {
      const { start } = tree().span(o);
      return `${round(start, 1)} to ${round(start + tree().onceOf(o), 1)} s${o.repeat > 1 ? `, ${o.repeat} times` : ''}`;
    }),
  });
}

/** A tick box that is not bound to a field of the object: `change(on)` gives the edit to make. */
function tick(label, on, change) {
  const box = h('input', {
    type: 'checkbox', checked: on,
    onchange: () => { edit(change(box.checked)); commit(); box.blur(); },
  });
  return h('label', { class: 'check' }, box, label);
}

/** The colour and size a key gives the object from there on. */
function keyLookParts(obj, key, index) {
  if (!key) return obj.keys.length ? [note('A key can also change the colour and the particle size. Click one of the diamonds on the timeline to set that.')] : [];
  const at = (o) => o.keys[index];
  return [
    h('h3', {}, `Key ${index + 1}: the look from here on`),
    row('Colour', inline(
      tick('changes here', keyHasColor(key), (on) => (o) => {
        const k = at(o);
        if (on) Object.assign(k, { color: rgbToHex(lookAt(o, k.t).c1), color2: null });
        else { delete k.color; delete k.color2; }
      }),
      keyHasColor(key) ? colorControl((o) => at(o).color, (o, v) => { at(o).color = v; }, 'Colour at this key') : null)),
    keyHasColor(key) ? swatches((o, v) => { at(o).color = v; }) : null,
    keyHasColor(key) ? row('Mix with', inline(
      tick('second colour', !!key.color2, (on) => (o) => { at(o).color2 = on ? '#ffffff' : null; }),
      key.color2 ? colorControl((o) => at(o).color2 || '#ffffff', (o, v) => { at(o).color2 = v; }, 'Second colour at this key') : null)) : null,
    row('Size', inline(
      tick('changes here', keyHasSize(key), (on) => (o) => {
        const k = at(o);
        const now = lookAt(o, k.t);
        if (on) Object.assign(k, { size: round(now.lo, 3), size2: now.hi > now.lo ? round(now.hi, 3) : null });
        else { delete k.size; delete k.size2; }
      }),
      keyHasSize(key) ? numberInput({ get: (o) => at(o).size, set: (o, v) => { at(o).size = v; }, min: 0.01, max: 50, step: 0.05, label: 'Particle size at this key' }) : null)),
    keyHasSize(key) ? row('Random', inline(
      tick('sizes up to', typeof key.size2 === 'number', (on) => (o) => { at(o).size2 = on ? round(at(o).size * 2, 2) : null; }),
      typeof key.size2 === 'number' ? numberInput({ get: (o) => at(o).size2 ?? at(o).size, set: (o, v) => { at(o).size2 = v; }, min: 0.01, max: 50, step: 0.05, label: 'Largest size at this key' }) : null)) : null,
    note('The colour changes on the way to this key. The size changes in a few steps, each made of particles of its own.'),
    obj.shape === 'point' ? null : row('Shape', inline(
      tick('changes here', keyHasForm(key), (on) => (o) => {
        const k = at(o);
        if (on) k.form = formCopyAt(o, k.t - 1e-6);
        else delete k.form;
      }),
      keyHasForm(key) ? h('button', { onclick: () => pickShapeFor(index), title: 'Choose the shape it turns into from the shapes in Add' }, 'Pick a shape') : null)),
    obj.shape === 'point' ? null : note(keyHasForm(key)
      ? `It morphs into this on the way to the key: ${formName(key.form)}, ${plural(formPoints(key.form).length, 'particle')}. Pick another shape, or bend this one in the Shape Studio (S).`
      : 'Tick this and it morphs into another shape on the way to this key: every particle flies to its new place.'),
  ];
}

/** That part of Keys follows the time marker: it is rebuilt whenever the marker comes to another key. */
function keyLook() {
  const box = h('div', { class: 'key-look' });
  const local = [];
  let shown = null;
  fields.push({
    sync: () => {
      const o = selectedObject();
      if (!o || isGroup(o)) return;
      const { mark } = standOf(o);
      const key = mark.at === 'key' ? o.keys[mark.index] : null;
      const made = key
        ? [o.id, mark.index, keyHasColor(key), !!key.color2, keyHasSize(key), typeof key.size2 === 'number',
          keyHasForm(key) ? `${key.form.shape} ${formPoints(key.form).length}` : ''].join()
        : [o.id, 'no key', o.keys.length > 0].join();
      if (made !== shown) {
        shown = made;
        local.length = 0;
        box.replaceChildren(...withFields(local, () => keyLookParts(o, key, mark.index)).filter(Boolean));
      }
      for (const f of local) f.sync();
    },
  });
  return box;
}

function keysSection(node) {
  const group = isGroup(node);
  const point = node.shape === 'point';
  const clearKeys = h('button', { class: 'danger', onclick: () => { edit((o) => { o.keys = []; }); commit(); } }, 'Remove all');
  const copy = h('button', { onclick: copyKeysNow, title: 'Remember what it does, to give it to another object' }, 'Copy keys');
  const paste = h('button', { onclick: pasteKeysNow }, 'Paste keys');
  fields.push({
    sync: () => {
      const o = selectedObject();
      if (!o) return;
      clearKeys.disabled = !o.keys.length;
      copy.disabled = !o.keys.length;
      paste.disabled = !state.clip;
      paste.title = state.clip
        ? `Give it the ${plural(state.clip.keys.length, 'key')} copied from ${state.clip.name}: the same move, from where this one is at the time marker`
        : 'Nothing copied yet: select an object that moves and press Copy keys';
    },
  });
  return category('keys', 'Keys', [
    liveNote(keysHint),
    group ? null : keyLook(),
    point ? null : row('Turning', checkbox('by the angles as typed', (o) => o.spin, (o, on) => { o.spin = on; })),
    point ? null : liveNote((o) => (o.spin
      ? 'It turns from the Rotation numbers of one key to those of the next. For a full turn, type 360 in a key.'
      : 'It turns the short way round to the next key. Tick this to make full turns.')),
    h('div', { class: 'buttons' }, copy, paste, clearKeys),
  ], { summary: summary((o) => (o.keys.length ? plural(o.keys.length, 'key') : 'none')) });
}

/** In words: when the move on show would begin, and how often it fits. */
function moveWhen(node) {
  const move = MOVE_BY_ID[state.move.id];
  const at = Math.max(0, standOf(node).local);
  const from = at < MIN_KEY_GAP ? `It begins when ${node.name} starts` : `It begins at the time marker (${round(state.time, 2)} s)`;
  const most = mostTimes(node, move, at);
  const fits = move.once || !move.keys ? '' : most ? ` Up to ${most} times fit (${MAX_KEYS} keys at most).` : ' No keys are left for it here.';
  return `${from} and replaces what it did after that.${fits}`;
}

function movesSection(node) {
  const usable = MOVES.filter((m) => !(m.shaped && node.shape === 'point'));
  if (!usable.some((m) => m.id === state.move.id)) state.move.id = usable[0].id;
  const box = h('div', {});
  const when = liveNote(moveWhen);
  const build = () => {
    const move = MOVE_BY_ID[state.move.id];
    const mine = state.move.settings[move.id] || (state.move.settings[move.id] = {});
    const inputs = moveFields(move).map((f) => {
      const value = mine[f.key] ?? f.value;
      let control;
      if (f.options) {
        control = h('select', { 'aria-label': f.label, onchange: () => { mine[f.key] = Number(control.value); control.blur(); } },
          f.options.map((o) => h('option', { value: o.id }, o.name)));
        control.value = String(value);
      } else {
        control = selectOnEntry(h('input', {
          type: 'number', min: f.min, max: f.max, step: f.step, value, 'aria-label': f.label, 'data-move': f.key,
          oninput: () => { if (control.value !== '' && Number.isFinite(Number(control.value))) mine[f.key] = Number(control.value); },
        }));
      }
      return row(f.label, f.unit ? withUnit(control, f.unit) : control);
    });
    box.replaceChildren(note(move.about), ...inputs, when,
      h('div', { class: 'buttons' }, h('button', { class: 'primary', id: 'apply-move', onclick: applyMoveNow }, `Apply ${move.name}`)));
  };
  const choose = h('select', {
    'aria-label': 'Ready-made move',
    onchange: () => { state.move.id = choose.value; choose.blur(); build(); syncInspector(); },
  }, usable.map((m) => h('option', { value: m.id }, m.name)));
  choose.value = state.move.id;
  build();
  return category('moves', 'Ready-made moves', [row('Move', choose), box], { summary: h('span', {}, usable.map((m) => m.name).slice(0, 3).join(', ') + ' ...') });
}

function motionSection(isShape) {
  const flies = (o) => o.move.some((v) => v !== 0) || o.spread > 0 || o.expand !== 0 || o.gravity !== 0;
  return category('motion', 'Motion', [
    row('Move', xyz((o) => o.move, (o, i, v) => { o.move[i] = v; }, 0.25, 'Move')),
    row('Scatter', numberInput({ get: (o) => o.spread, set: (o, v) => { o.spread = v; }, min: 0, max: 100, step: 0.1, label: 'Scatter', title: 'Random extra speed in every direction' })),
    isShape ? row('Grow', numberInput({ get: (o) => o.expand, set: (o, v) => { o.expand = v; }, min: -100, max: 100, step: 0.1, label: 'Grow', title: 'Particles fly away from the middle of the shape (negative: towards it)' })) : null,
    row('Gravity', numberInput({ get: (o) => o.gravity, set: (o, v) => { o.gravity = v; }, min: -500, max: 500, step: 0.5, label: 'Gravity', title: 'Negative falls, positive floats up' })),
    note('All 0 = the particles stand still. Press Play to see the motion. With keys, this motion starts after the last key; in a group that moves, the particles are let go where the group is then.'),
  ], { summary: summary((o) => (flies(o) ? 'flies' : 'stands still')) });
}

/** The group something is in, and mirror copies. Works for one thing or for several. */
function arrangeSection(nodes) {
  const tr = tree();
  const tops = topNodes(state.objects, nodes.map((n) => n.id));
  const banned = new Set(tops.flatMap((n) => [n, ...tr.insideOf(n)]));
  const groups = state.objects.filter((o) => isGroup(o) && !banned.has(o));
  const parents = [...new Set(tops.map((n) => n.parent || ''))];
  const into = h('select', {
    'aria-label': 'The group it is in',
    onchange: () => { const to = into.value; into.blur(); if (to !== 'mixed') intoGroup(to || null); },
  },
  parents.length > 1 ? h('option', { value: 'mixed' }, '(different groups)') : null,
  h('option', { value: '' }, '(no group)'),
  groups.map((g) => h('option', { value: g.id }, `${'\u2003'.repeat(tr.chainOf(g).length)}${g.name}`)));
  into.value = parents.length > 1 ? 'mixed' : parents[0];
  const inGroup = parents.length === 1 && parents[0] ? nodeOf(parents[0]) : null;
  return category('arrange', 'Group and mirror', [
    row('In group', into),
    note(groups.length
      ? 'Or drag it onto a group in the Scene list. For a new group: select the objects (Ctrl+click) and press Group.'
      : 'There is no group yet. To make one: select the objects (Ctrl+click) and press Group above the Scene list.'),
    row('Mirror copy', h('div', { class: 'buttons tight' }, SIDES.map(([name, axis], i) => h('button', {
      title: `${name}: a twin on the other side`, 'data-mirror': axis, onclick: () => mirrorSelected(i),
    }, axis)))),
    note(inGroup
      ? `Makes a twin on the other side of the pivot of ${inGroup.name}: X is left and right, Y up and down, Z front and back.`
      : 'Makes a twin on the other side of the code block: X is left and right, Z front and back. Y turns the copy upside down where it is. In a group, the mirror stands in the pivot of the group.'),
  ], { summary: h('span', {}, inGroup ? `in ${inGroup.name}` : '') });
}

// ------------------------------------------------------------------ settings on the right: arrays

const ARRAY_KINDS = [['row', 'Row'], ['grid', 'Grid'], ['ring', 'Ring']];
const RING_LIES = [['flat', 'Flat, like a carousel'], ['front', 'Upright, facing the front'], ['side', 'Upright, facing the side']];
const PREVIEW = 0.45; // how visible the copies are drawn before the array is made
let arrayHover = false; // the pointer is on the Array category: the 3D view shows what it would make
let arrayRest = false; // an array was just made: nothing more is shown until a number changes or the pointer comes back
let arrayStep = null; // the array made last, until the next edit: { at (where the scene before it stands in the history), ids (what it was made of) }

/** What the Array category asks for. A step, a gap or a radius that nobody typed yet suits what is selected. */
function arraySpec(nodes) {
  const a = state.array;
  const small = nodes.every((n) => n.shape === 'point'); // single particles stand closer together than shapes
  const gap = small ? 0.5 : 2.5;
  const all = { delay: a.delay, group: a.group };
  if (a.kind === 'row') return { kind: 'row', count: a.row.count, step: a.row.step.map((v, k) => v ?? (k === 0 ? gap : 0)), ...all };
  if (a.kind === 'grid') return { kind: 'grid', counts: a.grid.counts, gaps: a.grid.gaps.map((v) => v ?? gap), ...all };
  return { kind: 'ring', count: a.ring.count, radius: a.ring.radius ?? (small ? 1.5 : 3), plane: a.ring.plane, arc: a.ring.arc, turn: a.ring.turn, ...all };
}

/** The scene as the array would leave it, with nothing changed: { objects, made, fresh (the ids that are new) }, or { error }. */
function arrayTrial() {
  const nodes = selectedNodes();
  if (!nodes.length) return { error: '' };
  const before = new Set(state.objects.map((o) => o.id));
  const made = arrayNodes(clone(state.objects), nodes.map((n) => n.id), arraySpec(nodes));
  if (made.error) return made;
  return { ...made, fresh: new Set(made.objects.filter((o) => !before.has(o.id)).map((o) => o.id)) };
}

/** While the pointer is on the Array category: the particles of the scene as the array would leave it, the copies see-through. */
function arrayGhosts() {
  if (!arrayHover) return null;
  const trial = arrayTrial();
  if (trial.error !== undefined) return null;
  const list = computeParticles(trial.objects, state.time > 0 ? state.time : null, { ghosts: true });
  for (const p of list) {
    if (!trial.fresh.has(p.id)) continue;
    if (p.blend === 0) p.rgb = p.rgb.map((v) => v * PREVIEW); // (this blend takes no notice of how see-through a particle is)
    p.alpha *= PREVIEW;
  }
  return list;
}

/** How many particles the game makes for a whole scene. */
function particlesOf(objects) {
  const tr = sceneTree(objects);
  return tr.leaves().reduce((n, leaf) => n + costOf(leaf, tr), 0);
}

function makeArray() {
  const nodes = selectedNodes();
  if (!nodes.length) return;
  const spec = arraySpec(nodes);
  const made = arrayNodes(state.objects, nodes.map((n) => n.id), spec);
  const group = made.group ? made.objects.find((o) => o.id === made.group) : null;
  arrayRest = !made.error; // (the pointer is still on the button: it should not show the next array at once)
  const done = take(made, {
    ids: made.ids,
    say: group
      ? `${made.made + 1} in a ${spec.kind}, in the group ${group.name}. Move, turn or resize the group and they all come along.`
      : `${made.made + 1} in a ${spec.kind}. They are all selected.`,
  });
  if (!done) return;
  arrayStep = { at: history.length - 2, ids: nodes.map((n) => n.id) };
  // one column on a small screen: the 3D view is above the settings, so back up to see what was made
  if (isSmall()) window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Open the Array category and bring it into view. */
function showArray() {
  keep('array', true);
  renderInspector();
  const section = $('#inspector [data-cat="array"]');
  if (!section) return;
  section.classList.add('flash'); // (a moment of light, so the eye finds what the button opened)
  section.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/**
 * The Array button in the bar at the top, and the key A. The settings are shut
 * until they are asked for, so the tool has a button that is always in sight:
 * it opens the settings on the Array category, or says what to select first.
 */
function arrayTool() {
  if (!state.selection.length) {
    toast(`Array makes copies of what is selected, in a row, a grid or a ring. ${state.objects.length
      ? 'Select something first: click it in the 3D view.' : 'Add a particle or a shape first.'}`);
    return;
  }
  $('#toast').hidden = true; // (whatever it said, "select something first" for one, is answered)
  showPanel('settings', true);
  showArray();
}

/** Copies of what is selected in a row, a grid or a ring. Works for one thing or for several. */
function arraySection(nodes) {
  const a = state.array;
  const spec = () => arraySpec(nodes);
  const said = h('p', { class: 'note', id: 'array-note', 'aria-live': 'polite' });
  const go = h('button', { class: 'primary', id: 'make-array', onclick: makeArray }, 'Make array');
  /** Say what the array would make, or why it cannot be made. */
  const tell = () => {
    const trial = arrayTrial();
    go.disabled = trial.error !== undefined;
    if (trial.error !== undefined) said.textContent = trial.error;
    else {
      const more = particlesOf(trial.objects) - particlesOf(state.objects);
      said.textContent = `Makes ${trial.made} ${trial.made === 1 ? 'copy' : 'copies'}: ${plural(more, 'particle')} more.${canHover() && !isSmall() ? ' The 3D view shows them while the mouse is here.' : ''}`;
    }
  };
  /** A number, a choice or a tick was changed by hand. */
  const typed = () => {
    tell();
    if (arrayHover) refresh();
    if (arrayRest) {
      arrayRest = false;
      if (box.matches(':hover')) hover(true);
    }
  };
  const hover = (on) => {
    if (on && arrayRest) return;
    if (arrayHover !== on) { arrayHover = on; refresh(); }
  };
  const number = (get, set, { min, max, step = 1, whole = false, label }) => {
    const el = selectOnEntry(h('input', {
      type: 'number', min, max, step, value: round(get(), 2), 'aria-label': label,
      oninput: () => {
        const v = Number(el.value);
        if (el.value === '' || !Number.isFinite(v)) return;
        set(Math.min(max, Math.max(min, whole ? Math.round(v) : v)));
        typed();
      },
      onchange: () => { el.value = round(get(), 2); }, // what counts: a whole number, inside its limits
    }));
    return el;
  };
  const triple = (get, set, options, label) => h('div', { class: 'xyz' }, ['X', 'Y', 'Z'].map((axis, i) => h('div', { class: 'axis', 'data-axis': axis },
    number(() => get()[i], (v) => set(i, v), { ...options, label: `${label} ${axis}` }))));
  const box = h('div', {});
  const build = () => {
    let parts;
    if (a.kind === 'row') {
      parts = [
        row('How many', withUnit(number(() => a.row.count, (v) => { a.row.count = v; }, { min: 2, max: MAX_ARRAY, whole: true, label: 'How many in the row' }), 'in all, with the first one')),
        row('Step', triple(() => spec().step, (i, v) => { a.row.step[i] = v; }, { min: -500, max: 500, step: 0.5 }, 'Step along')),
        note('Step: the blocks from one to the next. X goes to the right, Y up, Z to the back.'),
      ];
    } else if (a.kind === 'grid') {
      parts = [
        row('How many', triple(() => a.grid.counts, (i, v) => { a.grid.counts[i] = v; }, { min: 1, max: MAX_ARRAY, whole: true }, 'How many along')),
        row('Gap', triple(() => spec().gaps, (i, v) => { a.grid.gaps[i] = v; }, { min: -500, max: 500, step: 0.5 }, 'Gap along')),
        note('How many along X, Y (up) and Z, and the blocks between them. 3, 1, 3 is a floor of nine; 3, 3, 1 is a wall.'),
      ];
    } else {
      const lies = h('select', { 'aria-label': 'How the ring lies', id: 'array-lies', onchange: () => { a.ring.plane = lies.value; lies.blur(); typed(); } },
        RING_LIES.map(([id, name]) => h('option', { value: id }, name)));
      lies.value = a.ring.plane;
      const turn = h('input', { type: 'checkbox', checked: a.ring.turn, id: 'array-turn', onchange: () => { a.ring.turn = turn.checked; turn.blur(); typed(); } });
      parts = [
        row('How many', withUnit(number(() => a.ring.count, (v) => { a.ring.count = v; }, { min: 2, max: MAX_ARRAY, whole: true, label: 'How many in the ring' }), 'in all, with the first one')),
        row('Radius', withUnit(number(() => spec().radius, (v) => { a.ring.radius = v; }, { min: 0.01, max: 500, step: 0.5, label: 'Radius of the ring' }), 'blocks')),
        row('Ring', lies),
        row('Arc', withUnit(number(() => a.ring.arc, (v) => { a.ring.arc = v; }, { min: 1, max: 360, step: 15, label: 'Arc of the ring in degrees' }), 'degrees: 360 is a full ring')),
        h('label', { class: 'check line' }, turn, 'Turn each one with the ring'),
        note('The ring is made around the place where it is now: it moves out onto the ring itself.'),
      ];
    }
    const group = h('input', { type: 'checkbox', checked: a.group, id: 'array-group', onchange: () => { a.group = group.checked; group.blur(); typed(); } });
    box.replaceChildren(...parts,
      row('Each later', withUnit(number(() => a.delay, (v) => { a.delay = v; }, { min: 0, max: 60, step: 0.1, label: 'Seconds each one appears after the one before' }), 'seconds after the one before')),
      h('label', { class: 'check line' }, group, 'Put them all in a group'),
      said,
      h('div', { class: 'buttons' }, go));
  };
  const kind = h('select', { 'aria-label': 'Kind of array', id: 'array-kind', onchange: () => { a.kind = kind.value; kind.blur(); build(); typed(); } },
    ARRAY_KINDS.map(([id, name]) => h('option', { value: id }, name)));
  kind.value = a.kind;
  build();
  const section = category('array', 'Array', [row('Kind', kind), box], { summary: h('span', {}, 'copies in a row, a grid or a ring') });
  // What it would make is only worked out while the category is open: at once when it is shown, and a moment
  // after an edit to what is selected (like the particle count at the top, it waits until the dragging stops).
  const isOpen = () => section.classList.contains('open');
  let wait = null; // (null: nothing said yet)
  fields.push({
    sync: () => {
      if (!isOpen()) return;
      if (wait === null) { wait = 0; tell(); return; }
      clearTimeout(wait);
      wait = setTimeout(() => { if (section.isConnected && isOpen()) tell(); }, 120);
    },
  });
  section.querySelector('.cat-head').addEventListener('click', () => { if (isOpen()) tell(); });
  const body = section.querySelector('.cat-body');
  body.addEventListener('pointerenter', () => hover(true));
  body.addEventListener('pointermove', () => hover(true));
  body.addEventListener('pointerleave', () => { arrayRest = false; hover(false); });
  return section;
}

const KEYBOARD = [
  ['W, E, R', 'move, rotate, resize'], ['Click', 'select; in a group: the group first, click again for what is in it'],
  ['Ctrl+click', 'select several'], ['Shift+click', 'in the lists: everything in between'], ['Ctrl+A', 'select everything'],
  ['Ctrl+G', 'group what is selected'], ['Ctrl+Shift+G', 'take the group apart'], ['Ctrl+D', 'duplicate'], ['A', 'array: copies in a row, a grid or a ring'],
  ['S', 'Shape Studio: bend, twist and pull a shape, or draw one'], ['M', 'morph: one shape turns into another'],
  ['C', 'Code: when and where the scene plays in the game'], ['Delete', 'delete'],
  ['Ctrl+Z, Ctrl+Y', 'undo, redo'], ['Space', 'play or pause'], ['K', 'add a key at the time marker'],
  ['Left, Right', 'move the time marker (Shift: a whole second)'], ['Esc', 'back to the start, then select nothing'], ['F', 'center the view'],
  ['1, 2, 3, 4', 'open or close Add, Scene, Settings, Timeline'],
];

function nothingSelected() {
  return [
    h('div', { class: 'ins-head' },
      h('h2', {}, 'How it works'),
      h('ol', { class: 'steps' },
        h('li', {}, 'Press ', h('b', {}, '+ Add'), ' and pick a particle or a shape. Or open one of the ', h('b', {}, 'Examples'), ' at the top.'),
        h('li', {}, h('b', {}, 'Click'), ' it in the 3D view and drag the arrows to move it. Its settings appear here, in categories that open when you click them.'),
        h('li', {}, h('b', {}, 'Export code'), ', paste it into a code block in Bloxd and click the block.')),
      note('The coloured buttons in the corners of the 3D view open and close the parts of the page: + Add, Scene, Settings and Timeline. Shut, they leave the whole window to the 3D view.')),
    category('show', 'Whole show', [
      row('Lasts', withUnit(numberOnEnter({
        get: duration, apply: stretchShow, min: 0.1, max: 6000, label: 'Seconds the whole show lasts',
        title: 'Type another length: everything gets slower or faster to fit.',
      }), 'seconds')),
      note('The show is what happens after one click on the code block, from the first particle to the last. Type another length to make all of it slower or faster.'),
    ], { summary: liveNote(() => `${round(duration(), 1)} s`, 'span') }),
    category('tips', 'Tips', [
      note('The crate in the middle is your code block. Everything appears in the game exactly where you see it around the block. One grid square is one block. Y is up.'),
      note(h('b', {}, 'Timing: '), 'open the Timeline and drag the bar of an object to make it appear later. To make it move: click it, click a later time on the row of numbers, press Add key and move it.'),
      note(h('b', {}, 'Groups: '), 'select several objects (Ctrl+click), press Group, and they move, turn and resize as one. A wing is a group; so is a whole dragon.'),
      note(h('b', {}, 'Ready-made moves: '), 'Flap, Pulse, Spin, Orbit and more work out the keys for you. Select something and open that category.'),
      note(h('b', {}, 'Repeat: '), 'under Time, an object or a whole group can be played again and again, for fire, smoke or rain.'),
      note(h('b', {}, 'Array: '), 'select something and press Array at the top, or the key A, for copies of it in a row, a grid or a ring.'),
      note(h('b', {}, 'Shape Studio: '), 'select a shape and press Shape Studio at the top, or the key S, to bend, twist, inflate and pull it, or to move its points one by one. "Draw your own shape" in Add starts a line of your own.'),
      note(h('b', {}, 'Morph: '), 'select a shape, Ctrl+click a second one and press Morph at the top, or the key M: the first turns into the second.'),
      note(h('b', {}, 'Code: '), 'press Code at the top, or the key C, to say when and where the scene plays in the game: when a player clicks, joins, hits a mob, types a command. With nodes, or with code of your own.'),
    ]),
    category('keyboard', 'Keyboard and mouse', [
      h('dl', { class: 'keys' }, KEYBOARD.map(([keys, does]) => [h('dt', {}, keys), h('dd', {}, does)])),
    ]),
  ];
}

function severalSelected(nodes) {
  const hidden = nodes.every((n) => n.hidden);
  return [
    h('div', { class: 'ins-head' },
      h('h2', {}, `${nodes.length} selected`),
      note(nodes.slice(0, 6).map((n) => n.name).join(', ') + (nodes.length > 6 ? ` and ${nodes.length - 6} more` : '')),
      h('div', { class: 'buttons' },
        h('button', { class: 'primary', onclick: groupSelected, title: 'Ctrl+G' }, 'Group'),
        h('button', { onclick: duplicateSelected, title: 'Ctrl+D' }, 'Duplicate'),
        h('button', { onclick: showArray, title: 'Copies in a row, a grid or a ring (A)' }, 'Array'),
        nodes.every((n) => !isGroup(n)) ? h('button', { onclick: joinSelected, title: 'One shape made of loose points out of all of them' }, 'Join') : null,
        h('button', { onclick: () => { for (const n of nodes) n.hidden = !hidden; commit(); renderInspector(); refresh(); } }, hidden ? 'Show' : 'Hide'),
        h('button', { class: 'danger', onclick: () => removeSelected(), title: 'Delete' }, 'Delete')),
      note('Group them to move, turn and resize them as one, and to give them keys together.')),
    morphSection(nodes),
    arrangeSection(nodes),
    arraySection(nodes),
  ];
}

function renderInspector() {
  fields = [];
  arrayHover = false; // (the Array category is made anew: the pointer has to come onto it again)
  const panel = $('#inspector');
  const nodes = selectedNodes();
  let parts;
  if (!nodes.length) parts = nothingSelected();
  else if (nodes.length > 1) parts = severalSelected(nodes);
  else {
    const [node] = nodes;
    const def = SHAPE_BY_ID[node.shape];
    parts = isGroup(node)
      ? [headOf(node), placeSection(node), timeSection(node), keysSection(node), movesSection(node), arrangeSection(nodes), arraySection(nodes)]
      : [headOf(node), lookSection(node), def ? shapeSection(def) : null, node.shape === 'point' ? null : studioSection(),
        placeSection(node), timeSection(node), keysSection(node),
        movesSection(node), motionSection(node.shape !== 'point'), arrangeSection(nodes), arraySection(nodes)];
  }
  const top = panel.scrollTop;
  panel.replaceChildren(...parts.filter(Boolean));
  panel.scrollTop = top;
  syncInspector();
}

// ------------------------------------------------------------------ Shape Studio

/**
 * What the Shape Studio shapes at the time marker: the shape the object starts
 * with, or the one the latest key up to the marker gave it. Returns
 * { form, key, index } (form: the object itself, or the form of that key), or
 * null for a group or a single particle.
 */
function shaping(node = selectedObject()) {
  if (!node || isGroup(node) || node.shape === 'point') return null;
  let index = -1;
  if (state.time > 0 || state.playing) {
    const { local } = standOf(node);
    node.keys.forEach((k, i) => { if (k.form && local >= k.t - NEAR_KEY) index = i; });
  }
  return index < 0 ? { form: node, key: null, index } : { form: node.keys[index].form, key: node.keys[index], index };
}

/** The matrix that puts a point of a shape where it is in the scene at the time marker (Bloxd space). */
function placeOf(node) {
  const stand = standOf(node);
  return flipZ(mulAffine(stand.around, viewMatrix(stand.pose)));
}

const toolHasDots = (tool) => !!(tool && DEFORMER_BY_ID[tool.kind].handles);

/**
 * The dots to drag in the 3D view: the grips of the tool that is picked, else
 * the corners of a drawn line or the loose points. None while the Shape Studio
 * is not at work on the object.
 */
function studioDots(node) {
  const target = state.studio.on && !state.playing ? shaping(node) : null;
  if (!target) return [];
  const { form } = target;
  const m = placeOf(node);
  const dot = (key, at, more) => ({ key, pos: applyMatrix(m, at), ...more });
  const tool = (form.deform || [])[state.studio.tool];
  if (toolHasDots(tool)) {
    return handlesOf(basePoints(form), form.deform, state.studio.tool).map((hd) => dot(`d:${hd.id}`, hd.at, { minor: !!hd.minor }));
  }
  if (form.shape === PATH) return form.path.nodes.map((p, i) => dot(`n:${i}`, p, { selected: i === state.studio.point }));
  if (form.shape === CLOUD) return form.points.map((p, i) => dot(`p:${i}`, p, { selected: i === state.studio.point }));
  return [];
}

/**
 * The dots are switched on and there are none to show (a shape of the library
 * has none of its own): then those of its last tool that has dots.
 */
function pickDots(node = selectedObject()) {
  const target = state.studio.on ? shaping(node) : null;
  if (!target || studioDots(node).length) return;
  const at = (target.form.deform || []).map(toolHasDots).lastIndexOf(true);
  if (at >= 0) Object.assign(state.studio, { tool: at, point: -1 });
}

/** The corners of a drawn line or the loose points of the shape the Shape Studio is at work on: the list, or null. */
function dotList(form) {
  return form.shape === PATH ? form.path.nodes : form.shape === CLOUD ? form.points : null;
}

/** A dot was dragged to a place in the scene. */
function dragDot(key, pos) {
  const node = selectedObject();
  const target = shaping(node);
  const inverse = target ? invAffine(placeOf(node)) : null;
  if (!inverse) return;
  const step = state.snap ? 0.05 : 0.001;
  const at = applyMatrix(inverse, pos).map((v) => round(Math.min(50, Math.max(-50, Math.round(v / step) * step)), 3) + 0);
  const { form } = target;
  const [kind, id] = key.split(':');
  if (kind === 'd') dragHandle(basePoints(form), form.deform, state.studio.tool, id, at);
  else {
    const list = dotList(form);
    if (!list || !list[id]) return;
    list[id] = at;
    state.studio.point = Number(id);
  }
  refresh();
  syncInspector();
}

/** A dot was clicked: the settings show its place (clicked again: no longer). */
function clickDot(key) {
  const [kind, id] = key.split(':');
  if (kind === 'd') return;
  state.studio.point = state.studio.point === Number(id) ? -1 : Number(id);
  refresh();
  syncInspector();
}

/** Take away the corner or the loose point that is picked. false when none is. */
function removeDot() {
  const target = shaping();
  const list = target ? dotList(target.form) : null;
  const at = state.studio.point;
  if (!list || !list[at]) return false;
  const line = target.form.shape === PATH;
  if (list.length <= (line ? 2 : 1)) {
    toast(line ? 'A line needs two corners.' : 'This is its last point. To delete the whole shape, press Esc first, then Delete.', 'warn');
    return true;
  }
  list.splice(at, 1);
  if (!line) target.form.count = list.length;
  state.studio.point = Math.min(at, list.length - 1);
  commit();
  refresh();
  syncInspector();
  return true;
}

/** A new corner after the one that is picked (or at the end of the line), or a new loose point next to the picked one. */
function addDot() {
  const target = shaping();
  const list = target ? dotList(target.form) : null;
  if (!list) return;
  const { form } = target;
  const at = list[state.studio.point] ? state.studio.point : list.length - 1;
  const here = list[at];
  const tidy = (p) => p.map((v) => round(Math.min(50, Math.max(-50, v)), 3) + 0);
  if (form.shape === PATH) {
    if (list.length >= MAX_NODES) { toast(`A line can have ${MAX_NODES} corners.`, 'warn'); return; }
    const next = list[at + 1] || (form.path.closed && list.length > 2 ? list[0] : null);
    const before = list[at - 1];
    // halfway to the next corner; after the last one: as far again as the step before it
    const made = next ? here.map((v, k) => (v + next[k]) / 2) : before ? here.map((v, k) => 2 * v - before[k]) : [here[0] + 0.5, here[1], here[2]];
    list.splice(at + 1, 0, tidy(made));
    state.studio.point = at + 1;
  } else {
    if (list.length >= MAX_POINTS) { toast(`A shape can have ${MAX_POINTS} points.`, 'warn'); return; }
    list.push(tidy([here[0] + 0.2, here[1], here[2]]));
    form.count = list.length;
    state.studio.point = list.length - 1;
  }
  Object.assign(state.studio, { on: true, tool: -1 });
  commit();
  refresh();
  syncInspector();
}

/** A few words on what the Shape Studio has made of an object. */
function studioSummary(o) {
  const tools = (o.deform || []).length;
  const what = o.shape === PATH ? 'drawn' : o.shape === CLOUD ? 'loose points' : '';
  return [what, tools ? plural(tools, 'tool') : ''].filter(Boolean).join(', ') || 'bend, twist, pull';
}

const TOOL_GROUPS = [...new Set(DEFORMERS.map((d) => d.group))];

/** One tool (deformer) of a shape: its name, the buttons for it and its sliders. `form()`: the shape it is on. */
function toolCard(form, tool, n, count, done) {
  const def = DEFORMER_BY_ID[tool.kind];
  const at = () => (form().deform || [])[n] || tool;
  const on = h('input', { type: 'checkbox', checked: tool.on !== false, title: 'On or off', onchange: () => { at().on = on.checked; on.blur(); done(); } });
  const shift = (by) => () => {
    const list = form().deform;
    list.splice(n + by, 0, ...list.splice(n, 1));
    state.studio.tool = state.studio.tool === n ? n + by : state.studio.tool === n + by ? n : state.studio.tool;
    done();
  };
  const picked = state.studio.on && state.studio.tool === n;
  const field = (f) => {
    if (f.kind === 'number') {
      const pair = sliderPair({
        get: () => at()[f.key], set: (o, v) => { at()[f.key] = v; }, min: f.slide[0], max: f.slide[1], step: f.step,
        numMin: f.min, numMax: f.max, label: `${def.name}: ${f.label}`,
      });
      return row(f.label, f.unit ? h('div', { class: 'with-unit' }, pair, h('span', { class: 'note' }, f.unit)) : pair);
    }
    if (f.kind === 'choice') {
      const pick = h('select', {
        'aria-label': `${def.name}: ${f.label}`,
        onchange: () => { at()[f.key] = Number(pick.value); pick.blur(); done(); },
      }, f.options.map((o) => h('option', { value: o.id }, o.name)));
      pick.value = String(tool[f.key]);
      return row(f.label, pick);
    }
    return row(f.label, xyz(() => at()[f.key], (o, i, v) => { at()[f.key][i] = v; }, f.step, `${def.name}: ${f.label}`));
  };
  return h('div', { class: `tool${tool.on === false ? ' off' : ''}${picked ? ' picked' : ''}`, 'data-tool': tool.kind },
    h('div', { class: 'tool-head' },
      h('label', { class: 'check' }, on, h('b', {}, def.name)),
      // (the buttons stay together: next to a short name, below a long one)
      h('span', { class: 'tool-buttons' },
        def.handles ? h('button', {
          class: picked ? 'on' : '', title: 'Show its dots in the 3D view, to drag them',
          onclick: () => { Object.assign(state.studio, picked ? { tool: -1 } : { on: true, tool: n, point: -1 }); refresh(); syncInspector(); },
        }, 'Dots') : null,
        h('button', { title: 'Do this one earlier', 'aria-label': 'Earlier', disabled: n === 0, onclick: shift(-1) }, 'Up'),
        h('button', { title: 'Do this one later', 'aria-label': 'Later', disabled: n === count - 1, onclick: shift(1) }, 'Down'),
        h('button', {
          class: 'danger', title: 'Take this tool away', 'aria-label': `Remove ${def.name}`,
          onclick: () => {
            const fm = form();
            fm.deform.splice(n, 1);
            if (!fm.deform.length) delete fm.deform;
            state.studio.tool = -1;
            done();
          },
        }, '\u00D7'))),
    note(def.about),
    def.fields.map(field),
    tool.kind === 'cage' ? h('div', { class: 'buttons' }, h('button', {
      onclick: () => { at().c = at().c.map(() => [0, 0, 0]); done(); },
    }, 'Put the corners back')) : null);
}

/** What the Shape Studio category holds for a shape: see studioSection(). */
function studioParts(node, target) {
  const form = () => (shaping() || target).form; // (looked up again every time: after Undo the objects are new ones)
  const f0 = target.form;
  const def = SHAPE_BY_ID[f0.shape];
  const done = () => { commit(); refresh(); syncInspector(); };
  const tools = f0.deform || [];
  const list = dotList(f0);
  const sel = state.studio.point;
  const dotted = !!list || tools.some(toolHasDots);
  const showDots = h('input', {
    type: 'checkbox', checked: state.studio.on,
    onchange: () => { state.studio.on = showDots.checked; pickDots(); showDots.blur(); refresh(); syncInspector(); },
  });
  const count = (min) => row('How many', sliderPair({
    get: () => form().count, set: (o, v) => { form().count = Math.round(v); }, min, max: 300, step: 1, numMax: MAX_COUNT, label: 'Particle count',
  }));
  const parts = [
    note(target.key
      ? `This is the shape ${node.name} turns into at key ${target.index + 1}. To shape what it starts with, go back to the start (Esc).`
      : node.keys.some(keyHasForm)
        ? `This is the shape ${node.name} starts with. Its keys change it: put the time marker on such a key to shape what it turns into.`
        : 'Bend, twist, inflate and pull the shape with the tools below. Every tool works on what the tools above it have made.'),
    dotted ? h('label', { class: 'check line' }, showDots, 'Dots to drag in the 3D view') : null,
    dotted && state.studio.on ? note('Drag a dot to move it. While the dots are there the arrows are away: untick this, or press Esc, to move the whole shape again.') : null,
  ];
  if (target.key && def) {
    // (the shape a key gives it has its sliders here; those of the shape it starts with are under Shape)
    parts.push(
      h('h3', {}, def.name),
      count(def.min),
      (def.params || []).map((p) => row(p.label, sliderPair({
        get: () => form().params[p.key] ?? p.default, set: (o, v) => { form().params[p.key] = v; }, min: p.min, max: p.max, step: p.step, label: p.label,
      }))),
      h('div', { class: 'buttons' }, h('button', { onclick: () => pickShapeFor(target.index) }, 'Pick another shape')));
  }
  if (list) {
    const line = f0.shape === PATH;
    const one = () => dotList(form())[sel];
    parts.push(
      h('h3', {}, line ? 'Drawn line' : 'Loose points'),
      row(line ? 'Corners' : 'Points', inline(
        h('b', {}, String(list.length)),
        h('button', { 'data-do': 'add-dot', onclick: addDot, title: line ? 'A new corner after the picked one' : 'A new point next to the picked one' }, 'Add'),
        h('button', { class: 'danger', 'data-do': 'remove-dot', disabled: !list[sel], onclick: removeDot, title: 'Take the picked one away (Delete)' }, 'Remove'))),
      list[sel]
        ? row(`${line ? 'Corner' : 'Point'} ${sel + 1}`, xyz(() => one() || [0, 0, 0], (o, i, v) => { if (one()) one()[i] = v; }, 0.1, line ? 'Corner' : 'Point'))
        : note(`Click a dot in the 3D view to pick ${line ? 'a corner' : 'a point'}: its place can be typed here, and Add puts a new one next to it.`));
    if (line) {
      const flag = (key, label, title) => {
        const el = h('input', { type: 'checkbox', checked: !!f0.path[key], onchange: () => { form().path[key] = el.checked; el.blur(); done(); } });
        return h('label', { class: 'check', title }, el, label);
      };
      const mode = h('select', {
        'aria-label': 'What the particles do with the line', onchange: () => { form().path.mode = mode.value; mode.blur(); done(); },
      }, PATH_MODES.map((m) => h('option', { value: m.id }, m.name)));
      mode.value = f0.path.mode;
      parts.push(
        row('Line', inline(flag('closed', 'closed', 'The last corner is joined to the first'), flag('smooth', 'smooth', 'A curve through the corners instead of straight lines'))),
        row('Particles', mode),
        count(1),
        f0.path.mode === 'fill' ? note(f0.path.closed ? 'The particles fill the inside of the line.' : 'Tick "closed": only a closed line has an inside to fill.') : null,
        f0.path.mode === 'spin' ? note('The line is spun around the upright line through its pivot, like clay on a wheel: draw half an outline, to the right of the pivot.') : null);
    }
  }
  const choose = h('select', {
    'aria-label': 'Add a tool', 'data-do': 'add-tool',
    onchange: () => {
      const kind = choose.value;
      choose.value = '';
      choose.blur();
      const fm = form();
      if (!DEFORMER_BY_ID[kind]) return;
      if ((fm.deform || []).length >= MAX_DEFORMERS) {
        toast(`A shape can have ${MAX_DEFORMERS} tools. Take one away, or press "Turn into loose points": that works them all in.`, 'warn');
        return;
      }
      const made = newDeformer(kind, formPoints(fm));
      (fm.deform || (fm.deform = [])).push(made);
      if (toolHasDots(made)) Object.assign(state.studio, { on: true, tool: fm.deform.length - 1, point: -1 });
      done();
      toast(`${DEFORMER_BY_ID[kind].name}: ${DEFORMER_BY_ID[kind].about}${toolHasDots(made) ? ' Drag its dots in the 3D view.' : ''}`);
    },
  }, h('option', { value: '' }, 'Choose ...'),
  TOOL_GROUPS.map((g) => h('optgroup', { label: g }, DEFORMERS.filter((d) => d.group === g).map((d) => h('option', { value: d.id, title: d.about }, d.name)))));
  parts.push(
    h('h3', {}, 'Tools'),
    row('Add a tool', choose),
    tools.map((tool, n) => toolCard(form, tool, n, tools.length, done)),
    h('div', { class: 'buttons' },
      f0.shape !== CLOUD || tools.length ? h('button', {
        'data-do': 'bake',
        title: 'The points it is made of now become loose points: each can be moved by hand. Its sliders and its tools are worked in and go away.',
        onclick: () => {
          bakeForm(form());
          Object.assign(state.studio, { on: true, tool: -1, point: -1 });
          done();
          renderInspector();
          toast('Now it is made of loose points. Drag them in the 3D view, one by one.');
        },
      }, 'Turn into loose points') : null,
      tools.length ? h('button', { class: 'danger', onclick: () => { delete form().deform; state.studio.tool = -1; done(); } }, 'Remove all tools') : null));
  return parts;
}

/**
 * The Shape Studio: tools that bend, twist and pull a shape (js/deform.js), a
 * line drawn by hand, and loose points (js/forms.js). It follows the time
 * marker: on a key that changes the shape it is at work on that shape. So it is
 * built anew whenever what it shows is something else.
 */
function studioSection() {
  const box = h('div', { class: 'studio' });
  const local = [];
  let shown = null;
  fields.push({
    sync: () => {
      const o = selectedObject();
      const target = shaping(o);
      if (!target) return;
      const { form } = target;
      const made = JSON.stringify([
        o.id, target.index, form.shape, state.studio, o.keys.map((k) => !!k.form),
        (form.deform || []).map((d) => [d.kind, d.on]),
        form.path ? [form.path.nodes.length, form.path.closed, form.path.smooth, form.path.mode] : 0,
        form.points ? form.points.length : 0,
      ]);
      if (made !== shown) {
        shown = made;
        local.length = 0;
        box.replaceChildren(h('div', {}, withFields(local, () => studioParts(o, target))));
      }
      for (const f of local) f.sync();
    },
  });
  return category('studio', 'Shape Studio', [box], { summary: summary(studioSummary) });
}

/** Open a category of the settings and bring it into view. */
function showCategory(id) {
  keep(id, true);
  renderInspector();
  const section = $(`#inspector [data-cat="${id}"]`);
  if (!section) return;
  section.classList.add('flash'); // (a moment of light, so the eye finds what the button opened)
  section.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/**
 * The Shape Studio button in the bar at the top, and the key S: opens the
 * settings on the Shape Studio category and shows the dots of the shape, or
 * says what to select first. Pressed again while the dots are there: back to
 * the arrows.
 */
function studioTool() {
  const node = selectedObject();
  if (state.selection.length !== 1 || !node || isGroup(node) || node.shape === 'point') {
    const what = !state.objects.length ? 'Add a shape first, or press "Draw your own shape" in + Add.'
      : isGroup(node) && state.selection.length === 1 ? 'A group has no shape of its own: click a shape inside it.'
        : node && node.shape === 'point' && state.selection.length === 1 ? 'A single particle has no shape to bend: select a shape, or press "Draw your own shape" in + Add.'
          : 'Select one shape first: click it in the 3D view. Or press "Draw your own shape" in + Add.';
    toast(`The Shape Studio bends, twists and pulls a shape, and lets you draw one. ${what}`);
    return;
  }
  $('#toast').hidden = true;
  state.studio.on = !(state.studio.on && studioDots(node).length > 0);
  pickDots(node);
  showPanel('settings', true);
  showCategory('studio');
  refresh();
}

/** "Draw your own shape" in Add: a line with a few corners to drag. */
function drawShape() {
  stopPlaying();
  endPick();
  const pos = [0.5, 2.5, 0.5];
  const taken = () => state.objects.some((o) => !o.parent && o.pos.every((v, i) => Math.abs(v - pos[i]) < 1e-6));
  while (taken()) pos[0] += 2.5;
  const obj = createObject(PATH, {
    name: uniqueName(state.objects, 'Drawing'), pos, count: 24, texture: state.style.texture, color: state.style.color,
    path: { nodes: [[-1, -0.6, 0], [-0.35, 0.6, 0], [0.35, -0.3, 0], [1, 0.6, 0]], closed: false, smooth: true, mode: 'line' },
  });
  state.time = 0;
  state.objects.push(obj);
  state.selection = [obj.id];
  Object.assign(state.studio, { on: true, tool: -1, point: -1 });
  commit();
  showPanel('settings', true);
  showCategory('studio');
  refresh();
  toast('Drag the white dots to draw. More corners, a closed or a filled shape: in the settings, under Shape Studio.');
}

// ------------------------------------------------------------------ morph: one shape turns into another

/** The two shapes a morph is for, the one that changes first (the order they were selected in). null when it is not two shapes. */
function morphPair() {
  const picked = state.selection.map(nodeOf).filter(Boolean);
  return picked.length === 2 && picked.every((n) => !isGroup(n)) ? picked : null;
}

function makeMorph() {
  const pair = morphPair();
  if (!pair) return;
  const names = pair.map((n) => n.name);
  const done = morphNodes(state.objects, pair.map((n) => n.id), state.morph);
  take(done, {
    ids: done.ids,
    say: `${names[0]} turns into ${names[1]}, from ${round(done.from, 2)} to ${round(done.to, 2)} seconds after it appears. Press Play to see it. `
      + 'Its keys on the timeline say when: drag them to change that.',
  });
}

/** With two shapes selected: the first turns into the second. */
function morphSection() {
  const pair = morphPair();
  if (!pair) return null;
  const [a, b] = pair;
  const seconds = (key, label, min) => {
    const el = selectOnEntry(h('input', {
      type: 'number', min, max: 600, step: 0.1, value: state.morph[key], 'aria-label': label, 'data-morph': key,
      oninput: () => { if (el.value !== '' && Number.isFinite(Number(el.value))) state.morph[key] = Math.min(600, Math.max(min, Number(el.value))); },
    }));
    return el;
  };
  return category('morph', 'Morph', [
    note(h('b', {}, a.name), ' turns into ', h('b', {}, b.name), ': every particle flies to a place in the other shape. Particles that are too many fade away, missing ones fade in.'),
    row('First', withUnit(seconds('wait', 'Seconds it keeps its own shape first', 0), 'seconds as it is')),
    row('Then', withUnit(seconds('time', 'Seconds the change takes', MIN_KEY_GAP), 'seconds to change')),
    h('div', { class: 'buttons' },
      h('button', { class: 'primary', 'data-do': 'morph', onclick: makeMorph }, `Morph ${a.name} into ${b.name}`),
      h('button', { title: 'The other one changes', 'data-do': 'swap', onclick: () => { state.selection = [b.id, a.id]; renderInspector(); refresh(); } }, 'Swap')),
    note(`${a.name} gets keys for it on the timeline and takes the place, the size, the colour and the particle size of ${b.name}, `
      + `which is taken out of the scene. It keeps its own picture: the game cannot change that on the way.`),
  ], { open: true });
}

/**
 * The Morph button in the bar at the top, and the key M: opens the settings on
 * the Morph category, or says what to select first.
 */
function morphTool() {
  if (!morphPair()) {
    toast(`Morph turns one shape into another. ${state.objects.filter((o) => !isGroup(o)).length < 2
      ? 'Add two shapes first.' : 'Select the shape that changes, then Ctrl+click the shape it turns into.'}`);
    return;
  }
  $('#toast').hidden = true;
  showPanel('settings', true);
  showCategory('morph');
}

/**
 * The Code button in the bar at the top, and the key C: the window in which
 * nodes (or code of your own) say when and where the scene plays in the game.
 */
function codeTool() {
  stopPlaying();
  $('#toast').hidden = true;
  codeWindow.open();
}

/** Several shapes become one, made of loose points. */
function joinSelected() {
  const done = joinNodes(state.objects, state.selection.slice());
  take(done, {
    ids: done.ids,
    say: done.left ? `Joined, but ${plural(done.left, 'point')} did not fit: a shape can have ${MAX_POINTS}.`
      : 'Joined into one shape of loose points. The Shape Studio (S) moves them one by one.',
  });
}

/** The next shape clicked in Add becomes the shape the selected object turns into at one of its keys. */
function pickShapeFor(index) {
  const node = selectedObject();
  if (!node || !node.keys[index]) return;
  state.pickFor = { id: node.id, index };
  $('#pick-text').textContent = `Click the shape ${node.name} turns into at key ${index + 1}.`;
  $('#pick-note').hidden = false;
  showPanel('add', true);
  measureAddPart(); // (the note takes room from the shapes, or gives it back)
}

function endPick() {
  state.pickFor = null;
  const note = $('#pick-note');
  if (note.hidden) return; // (this runs with every click on an object: nothing to do, nothing to measure)
  note.hidden = true;
  measureAddPart();
}

/** A shape was clicked in Add: a new object, or the shape a key was waiting for. */
function chooseShape(id) {
  const pick = state.pickFor;
  const node = pick ? nodeOf(pick.id) : null;
  const key = node && node.shape !== 'point' ? node.keys[pick.index] : null;
  endPick();
  const def = SHAPE_BY_ID[id];
  if (!key || !def) { addObject(id); return; }
  stopPlaying();
  key.form = { shape: id, count: def.count, params: defaultParams(id) };
  commit();
  renderInspector();
  refresh();
  toast(`${node.name} turns into ${def.name} on the way to key ${pick.index + 1}. Press Play to see it.`);
}

// ------------------------------------------------------------------ time

const duration = () => sceneDuration(state.objects);

/** A new key `t` seconds after the node starts, with the place the node has at that time anyway. */
function insertKey(node, t) {
  const pose = poseAt(node, t);
  const key = {
    t: round(t, 3), pos: pose.pos.map((v) => round(v)), rot: pose.rot.map((v) => round(v, 2) + 0),
    scale: pose.scale.map((v) => round(v, 4)), ease: state.ease,
  };
  node.keys.push(key);
  node.keys.sort((x, y) => x.t - y.t);
  return key;
}

/** Change the place of a node at the time marker: see standOf() for what that changes. */
function setPose(node, change) {
  const { mark, play, local } = standOf(node);
  if (state.pivot && isGroup(node)) {
    // only the pivot: what is in the group stays where it is
    if (mark.at !== 'object' && mark.at !== 'start') {
      toast('The pivot is moved where the group starts. Press Esc to go there, or untick "Move only the pivot".', 'warn');
      return;
    }
    const probe = clone({ pos: node.pos, rot: node.rot, scale: node.scale });
    change(probe);
    if (!movePivot(state.objects, node.id, probe.pos)) toast(`${node.name} is squashed flat (a size of 0). Give it a size first.`, 'warn');
    return;
  }
  if (mark.at === 'full') {
    toast(`${node.name} has ${MAX_KEYS} keys, the most there can be. Go to one of them to change it.`, 'warn');
    return;
  }
  if (mark.at === 'object') change(node);
  else if (mark.at === 'start') {
    if (state.time > play.start) state.time = round(play.start, 3); // a moment after the start: too close for a key of its own
    change(node);
  } else if (mark.at === 'between') change(insertKey(node, local));
  else {
    if (mark.at === 'key') state.time = round(play.start + node.keys[mark.index].t, 3);
    change(node.keys[mark.index]);
  }
}

/** The same in words, for the timeline and the Place settings. */
function placeHint(node) {
  const { mark, local } = standOf(node);
  const of = `${node.keys.length}`;
  switch (mark.at) {
    case 'object': return '';
    case 'start': return local < 0 ? 'It is not there yet at this time. This is where it starts.' : 'This is where it starts.';
    case 'key': return `This is key ${mark.index + 1} of ${of}.`;
    case 'last': return `It is over at this time. This is where it was last, key ${mark.index + 1} of ${of}.`;
    case 'between': return 'Between keys: moving it now makes a new key here.';
    default: return `Between keys. It has ${MAX_KEYS} keys, the most there can be: go to one of them to change it.`;
  }
}

/** What the keys of a node cost in the game, in words. */
function keysHint(node) {
  const group = isGroup(node);
  if (!node.keys.length) {
    return `No keys: ${group ? 'the group' : 'it'} stays in one place. To make it move, open the Timeline, put the time marker at a later moment, press Add key and move it. Or pick a ready-made move below.`;
  }
  const tr = tree();
  const rough = tr.leavesOf(node).map((leaf) => planOf(leaf, tr.playsOf(leaf)[0]).rough).find(Boolean) || '';
  const cost = `${plural(node.keys.length, 'key')}. The game cannot move a particle around a corner, so every stretch of the way gets particles of its own: `
    + `${costOf(node, tr).toLocaleString('en')} for ${group ? 'what is in this group' : 'this object'}.`;
  if (rough === 'quick') return `${cost} One of the turns is too quick: the shape will cut corners. Give that turn more time.`;
  if (rough === 'big') return `${cost} One of the turns is too big: the shape will cut corners. Add a key halfway.`;
  return cost;
}

/** Put the time marker somewhere. `tolerance`: seconds within which it sticks to a key, a start or an end. */
function seek(time, tolerance = 0, exact = false) {
  if (state.playing) pause();
  const t = Math.max(0, Math.min(Number(time) || 0, MAX_START + 6000));
  const marks = [0, duration()];
  const node = selectedObject();
  if (node) {
    const tr = tree();
    const { start } = tr.playAt(node, t);
    marks.push(start, start + tr.onceOf(node), ...node.keys.map((k) => start + k.t));
  }
  const hit = marks.filter((m) => Math.abs(m - t) <= tolerance + 1e-9).sort((x, y) => Math.abs(x - t) - Math.abs(y - t))[0];
  state.time = round(hit !== undefined ? hit : exact ? t : Math.round(t / 0.05) * 0.05, 3);
  refresh();
  syncInspector();
}

/** Why no key can be added at the time marker, or '' when one can. */
function noKeyReason(node) {
  if (!node) return state.selection.length > 1 ? 'A key belongs to one object or group. Select one, or group them first.' : 'Select an object or a group first: a key belongs to one of them.';
  const { mark, local } = standOf(node);
  if (local < 0) return `${node.name} is not there yet at this time. Move the time marker to the right.`;
  if (local < MIN_KEY_GAP - 1e-9) return 'This is where it starts. Move the time marker to the right, to the moment it should be somewhere else.';
  // a node without keys can get its first one anywhere after its start, also after it is gone
  const at = node.keys.length ? mark.at : 'between';
  if (at === 'start') return 'This is where it starts. Move the time marker to the right, to the moment it should be somewhere else.';
  if (at === 'key') return 'There is already a key here. Just move the object.';
  if (node.keys.length >= MAX_KEYS) return `There can be ${MAX_KEYS} keys at most.`;
  return '';
}

function addKeyHere() {
  const node = selectedObject();
  const reason = noKeyReason(node);
  if (reason) return toast(reason);
  if (state.playing) pause();
  insertKey(node, standOf(node).local);
  commit();
  refresh();
  syncInspector();
  return toast(`Key added at ${round(state.time, 2)} s. Now move, turn or resize ${node.name}: that is where it will be at that time.`);
}

/** Remove the key under the time marker. Returns false when there is none. */
function deleteKeyHere() {
  const node = selectedObject();
  const mark = node ? standOf(node).mark : null;
  if (!mark || mark.at !== 'key') return false;
  node.keys.splice(mark.index, 1);
  commit();
  refresh();
  syncInspector();
  return true;
}

function copyKeysNow() {
  const node = selectedObject();
  const clip = copyKeys(node);
  if (!clip) return toast('It has no keys to copy.');
  state.clip = clip;
  syncInspector();
  return toast(`${plural(clip.keys.length, 'key')} of ${node.name} copied. Select another object and press Paste keys: it will do the same from where it is.`);
}

function pasteKeysNow() {
  const node = selectedObject();
  if (!node) return;
  const done = pasteKeys(node, state.clip, Math.max(0, standOf(node).local));
  if (!done.ok) { toast(done.message, 'warn'); return; }
  stopPlaying();
  commit();
  renderInspector();
  refresh();
  toast(`${done.message} Press Play to see it.`);
}

function applyMoveNow() {
  const node = selectedObject();
  if (!node) return;
  const move = MOVE_BY_ID[state.move.id];
  const done = applyMove(state.objects, node.id, move.id, state.move.settings[move.id] || {}, Math.max(0, standOf(node).local));
  if (!done.ok) { toast(done.message, 'warn'); return; }
  stopPlaying();
  state.objects = done.objects;
  commit();
  renderInspector();
  refresh();
  toast(`${done.message} Press Play to see it.`);
}

/** Tell when a stretch did not go all the way. */
function stretched(used, wanted) {
  if (Math.abs(used - wanted) < 1e-6) return;
  toast(used === 1 ? 'It cannot be made that long or short.' : 'Stretched as far as it goes: keys stay 0.1 seconds apart, and nothing lasts longer than the studio allows.', 'warn');
}

/** Make one play of the selected node last `seconds`. */
function stretchSelected(seconds) {
  const node = selectedObject();
  const was = node ? tree().onceOf(node) : 0;
  if (!(was > 0)) { toast('There is nothing in it to stretch yet.'); return; }
  stretched(stretchNodes(state.objects, [node.id], seconds / was), seconds / was);
  commit();
  refresh();
  syncInspector();
}

/** Make the whole show last `seconds`. */
function stretchShow(seconds) {
  const was = duration();
  if (!(was > 0)) { toast('The scene is empty.'); return; }
  stretched(stretchNodes(state.objects, null, seconds / was), seconds / was);
  if (state.time > duration()) state.time = 0;
  commit();
  refresh();
  syncInspector();
}

function renderTimeline() {
  if (!timeline) return;
  const tr = tree();
  const chosen = new Set(state.selection);
  const rows = tr.rows(true).map(({ node, depth }) => {
    const group = isGroup(node);
    const { start } = tr.span(node);
    const lasts = tr.onceOf(node);
    const echoes = [];
    for (let i = 1; i < node.repeat && i <= 24; i++) echoes.push(start + i * node.every);
    return {
      id: node.id, name: node.name, depth, group, open: node.open !== false, hidden: tr.isHidden(node), selected: chosen.has(node.id),
      start, end: start + lasts, lasts, keys: node.keys.map((k) => start + k.t), echoes,
      // the key under the time marker; close to a key counts, as no other key can be made there
      here: node.id === state.selected ? keyAt({ keys: node.keys, start: 0 }, standOf(node, tr).local, NEAR_KEY) : null,
      fadeIn: !group && node.fadeIn, fade: !group && node.fade,
    };
  });
  timeline.render({ rows, primary: state.selected, time: state.time, duration: duration() });
  updateTimeBar();
}

/** The controls above the timeline rows, and the label over the 3D view. */
function updateTimeBar() {
  const total = duration();
  const at = $('#tl-at');
  if (document.activeElement !== at) at.value = round(state.time, 2);
  $('#tl-total').textContent = `/ ${round(total, 1)} s`;
  const node = selectedObject();
  const mark = node ? standOf(node).mark : null;
  const onKey = !!mark && mark.at === 'key';
  const reason = noKeyReason(node);
  $('#tl-key').disabled = !!reason;
  $('#tl-key').title = reason || 'Remember where the selected object is at this time (K)';
  $('#tl-del').disabled = !onKey;
  const ease = $('#tl-ease');
  if (document.activeElement !== ease) ease.value = onKey ? node.keys[mark.index].ease : state.ease;
  let hint = 'Drag a bar to change when something appears. Click an object to make it move.';
  if (state.selection.length > 1) hint = `${state.selection.length} selected. Group them (Ctrl+G) to move them as one.`;
  else if (node && state.pivot) hint = `Moving only the pivot of ${node.name}.`;
  else if (node && node.keys.length) hint = `${node.name}: ${placeHint(node)}`;
  else if (node && !reason) hint = `Press Add key, then move ${node.name}: that is where it will be at ${round(state.time, 2)} s.`;
  else if (node) hint = `To make ${node.name} move: click a later time on the numbers, press Add key, move it.`;
  $('#tl-hint').textContent = hint;
  $('#tl-hint').title = hint;
  const label = $('#playing');
  label.hidden = !state.playing && state.time === 0;
  if (state.playing) label.textContent = `Playing ${Math.min(state.time, total).toFixed(1)} / ${total.toFixed(1)} s`;
  else label.textContent = `${round(state.time, 2)} s after the click · Esc: back to the start`;
}

// ------------------------------------------------------------------ play

function updatePlayButtons() {
  for (const b of [$('#play'), $('#tl-play')]) {
    b.textContent = state.playing ? 'Pause' : 'Play';
    b.classList.toggle('on', state.playing);
  }
}

/** Stop playing and stay at this moment. */
function pause() {
  if (!state.playing) return;
  state.playing = false;
  updatePlayButtons();
  refresh();
  syncInspector();
}
const stopPlaying = pause;

/** Back to the moment of the click. */
function rewind() {
  state.playing = false;
  state.time = 0;
  updatePlayButtons();
  refresh();
  syncInspector();
}

function togglePlay() {
  if (state.playing) return pause();
  if (!tree().leaves().length) return undefined;
  if (state.time >= duration() - 0.01) state.time = 0;
  state.playing = true;
  updatePlayButtons();
  refresh();
  return undefined;
}

function onFrame(dt) {
  if (!state.playing) return;
  state.time += dt;
  if (state.time > duration() + 0.4) { // a short empty moment at the end, as in the game
    if (!state.loop) return rewind();
    state.time = 0;
  }
  viewport.setParticles(computeParticles(state.objects, state.time));
  timeline.setTime(state.time, true);
  updateTimeBar();
  return undefined;
}

// ------------------------------------------------------------------ export

function renderExport(result) {
  const e = state.export;
  const world = e.target === 'world';
  const parts = result.parts;
  e.part = Math.min(e.part, parts.length - 1);
  const part = parts[e.part];
  const empty = result.particles === 0;
  $('#ex-world').hidden = !world;
  $('#ex-code').value = empty ? '' : part.code;
  $('#ex-code').placeholder = 'Nothing to export yet. Add a particle or a shape first.';
  $('#ex-copy').disabled = empty;
  $('#ex-download').disabled = empty;

  const tabs = $('#ex-tabs');
  tabs.replaceChildren(...(parts.length > 1 ? parts.map((p, i) => h('button', {
    class: i === e.part ? 'on' : '',
    onclick: () => { e.part = i; renderExport(result); },
  }, `Block ${i + 1}`)) : []));

  const over = !world && (part.chars > LIMITS.chars || part.lines > LIMITS.lines);
  $('#ex-meter').replaceChildren(...(empty ? [] : [
    h('b', {}, part.chars.toLocaleString('en')), ` / ${(world ? WORLD_CHARS : LIMITS.chars).toLocaleString('en')} characters`,
    world ? '' : ` · ${part.lines} / ${LIMITS.lines} lines`]));
  $('#ex-meter').style.color = over || (world && part.chars > WORLD_CHARS) ? 'var(--bad)' : '';

  const status = [];
  const say = (text, kind = '') => status.push(h('p', { class: kind }, text));
  // much is on its way at the same moment, and fast: the game may show it a little out of step
  const rush = result.rush;
  const rushed = !!rush && rush.particles * rush.speed > RUSH;
  if (!result.particles) say('The scene is empty. Add a particle or a shape first.', 'bad');
  else {
    say(`${plural(result.particles, 'particle')}. They stay about ${round(result.seconds, 1)} seconds${world ? ', then they are drawn again' : ' after each click'}.`);
    if (result.particles > MANY_PARTICLES) say('That is a lot of particles at once and can lag slower devices. Bigger particles with a smaller "How many" look much the same; fewer keys and repeats help too.', 'warn');
    if (rushed) {
      say(`Fast moves with many particles can look a little out of step in the game: Bloxd does not seem to start all the particles of a click in the same instant. Here ${plural(rush.particles, 'particle')} fly at up to ${Math.round(rush.speed)} blocks a second at once. Slower moves, or fewer particles in what moves, keep them together.`, 'warn');
    }
    if (!world && parts.length > 1) say(`This scene does not fit in one code block (16,000 characters), so it is split into ${parts.length}. Stack the code blocks on top of each other in order, block 1 at the bottom.${rush ? ' Things that move together stay in step best when they are in the same code block.' : ''}`, 'warn');
    if (world && part.chars > WORLD_CHARS) say(`This is longer than the ${WORLD_CHARS.toLocaleString('en')} characters World Code holds. Use fewer particles or coarser positions.`, 'bad');
  }
  $('#ex-status').replaceChildren(...status);

  const steps = world ? [
    ['Stand where the scene should be and note the block position (the studio\'s code block corner). Type it above.'],
    ['Press ', h('b', {}, 'F8'), ' in your world to open World Code and paste the code.'],
    ['The scene is redrawn every time it fades. Change ', h('code', {}, 'PS_EVERY'), ' to redraw sooner or later.'],
  ] : parts.length > 1 ? [
    ['Place ', h('b', {}, `${parts.length} code blocks`), ' on top of each other.'],
    ['Right-click each one and paste its code: Block 1 in the bottom block, Block 2 in the one above, and so on.'],
    [parts.length === 2 ? 'Click one of the blocks.' : 'Click a block in the middle of the stack.',
      ' Code blocks that touch run together. If part of the scene is missing, click the other blocks too.'],
  ] : [
    ['Place a ', h('b', {}, 'Code Block'), ' in your Bloxd world (creative menu).'],
    ['Right-click it, paste the code and close the editor.'],
    [`Click the block: the particles appear around it${rushed ? '' : ' exactly'} as in the studio.`],
  ];
  $('#ex-steps').replaceChildren(...steps.map((s) => h('li', {}, ...s)));
}

function openExport() {
  stopPlaying();
  const e = state.export;
  $('#ex-target').value = e.target;
  $('#ex-precision').value = String(e.precision);
  $('#ex-hide').value = e.hideDist;
  ['x', 'y', 'z'].forEach((a, i) => { $(`#ex-w${a}`).value = e.worldPos[i]; });
  $('#export-dialog').showModal();
  updateStats();
}

function exportOptionChanged() {
  const e = state.export;
  e.target = $('#ex-target').value === 'world' ? 'world' : 'block';
  e.precision = Number($('#ex-precision').value) || 100;
  e.hideDist = Math.min(1000, Math.max(0, Number($('#ex-hide').value) || 0));
  e.worldPos = ['x', 'y', 'z'].map((a) => Number($(`#ex-w${a}`).value) || 0);
  e.part = 0;
  store();
  updateStats();
}

async function copyCode() {
  const text = $('#ex-code').value;
  const button = $('#ex-copy');
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    const area = $('#ex-code'); // older browsers and sandboxed frames
    area.focus();
    area.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
  }
  button.textContent = ok ? 'Copied!' : 'Press Ctrl+C to copy';
  setTimeout(() => { button.textContent = 'Copy code'; }, 1800);
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A short message over the 3D view, there for as long as it takes to read. (alert and confirm do not work in every embedded page.) */
let toastTimer = 0;
function toast(message, kind = '') {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast ${kind}`.trim();
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, Math.max(6000, message.length * 70));
}

// ------------------------------------------------------------------ My scenes, files and examples

/**
 * Words about the scenes. While the My scenes window is open they are said in
 * it: a toast lies under an open window, where nobody reads it.
 */
function notice(message, kind = '') {
  if (!scenesWindow || !scenesWindow.say(message, kind)) toast(message, kind);
}

/** The name of the scene that is open, where it is shown: on the Scene panel and on the tab. */
function showName() {
  $('#scene-name').textContent = current.name;
  $('#scene-name').title = `This scene is "${current.name}". My scenes has the others, and there it gets another name.`;
  document.title = `${current.name} · Bloxd Particle Studio`;
}

/**
 * A new small picture of the scene that is open, for My scenes: everything
 * where it starts, as the 3D view shows it while nothing plays.
 */
function takePicture() {
  if (!viewport || trial) return;
  const url = viewport.picture(THUMB[0], THUMB[1], state.playing || state.time > 0 || arrayHover ? computeParticles(state.objects, null) : null);
  if (!url) return;
  current.thumb = url;
  current.pictured = contentText();
}

/**
 * This tab is looked at again. When another tab has changed the scene that is
 * open here in the meantime, it is shown as it is now: two tabs never work on
 * two copies of one scene. (A scene that was deleted in the other tab stays
 * here as it is: the next change puts it back into My scenes.)
 */
function catchUp() {
  if (trial || !viewport || current.seen === null || document.visibilityState === 'hidden') return;
  const there = library.read(current.id);
  if (!there) return;
  if (stampOf(there) === current.seen) {
    // (only its name is another one)
    const name = cleanName(there.name);
    if (name && name !== current.name) {
      current.name = name;
      current.named = there.named === true;
      showName();
    }
    return;
  }
  try {
    sanitizeScene(there);
  } catch {
    return;
  }
  takeRecord(current.id, there);
  settle();
  notice(`"${current.name}" was changed in another tab. Here it is as it is now.`);
}

/** The scene that is open goes into My scenes as it is now, with a new picture. `always`: also when it has not changed since the last one. */
function keepScene(always = true) {
  if (trial) return;
  try {
    if (!always && current.thumb && current.pictured === contentText()) return;
    takePicture();
    store();
  } catch (err) {
    console.error(err);
  }
}

/**
 * A shared scene that is still on trial (see `trial`) is worked out now, not a
 * moment later: after this it is kept as one of My scenes, or the scene that
 * was open before it is back. Whatever leaves the scene asks for this first.
 */
function endTrialNow() {
  if (trial) updateStats();
}

/**
 * Nothing in the scene that is open is somebody's work: nobody gave it a name,
 * it did not come by a link, and it is empty, or the scene a first visit
 * starts with, or an example as it comes (see untouched()). Such a scene is
 * not kept when another one is opened.
 */
const nobodys = () => !current.named && !current.link && untouched();

/**
 * The scene that is open is left for another one. It stays in My scenes, with
 * a new picture; only one that is nobody's work is not kept. Returns the words
 * about where it is, to end a message with.
 */
function leaveScene() {
  endTrialNow();
  stopPlaying();
  if (nobodys()) {
    // (only what this tab knows is taken out: a scene another tab has worked on in the meantime stays)
    const there = library.read(current.id);
    if (there && stampOf(there) === current.seen) library.remove(current.id);
    return '';
  }
  keepScene();
  return ` "${current.name}" is in My scenes.`;
}

/**
 * Another scene is in the studio (state.objects, state.code and `current`
 * are set): nothing is selected, the time is at the start, Undo starts anew,
 * the windows that showed the old scene are shut, and all is drawn again.
 */
function settle() {
  if (codeWindow) codeWindow.close();
  if ($('#export-dialog').open) $('#export-dialog').close();
  if (share) share.hide();
  state.selection = [];
  state.playing = false;
  state.time = 0;
  state.pivot = false;
  state.export.part = 0;
  Object.assign(state.studio, { on: false, tool: -1, point: -1 });
  endPick();
  arrayStep = null;
  arrayRest = false;
  keyPressed = false;
  history.length = 0;
  future.length = 0;
  history.push(snapshot());
  current.text = contentText();
  showName();
  updatePlayButtons();
  commit();
  renderInspector();
  refresh();
  // (a shared scene on trial: the view goes to where it starts; where it is later is worked out at the end of the trial)
  if (viewport) viewport.focus(allPoints(trial ? () => true : null));
}

/**
 * A scene that is not in My scenes yet is the one that is open from now on.
 * `name`: what it is called ('' for the next "Scene 3"); if another scene has
 * that name already, a number is added. `scene`: { objects, code, export }: with no code its
 * Code window is empty, with no export the settings of the Export window stay.
 * `quiet`: before the page is drawn for the first time (then nothing is drawn here either).
 */
function beginScene(name, scene, { named = false, link = '', quiet = false } = {}) {
  const time = Date.now();
  Object.assign(current, {
    id: library.newId(), name: name ? library.nameFor(name) : library.nameFor('Scene', { numbered: true }), named: named && !!name,
    created: time, updated: time, thumb: '', link, pictured: '', seen: null,
  });
  state.objects = scene.objects;
  state.code = scene.code || sanitizeCode(null);
  applyExportOptions(scene.export);
  if (!quiet) {
    settle();
    return;
  }
  history.length = 0;
  future.length = 0;
  history.push(snapshot());
  current.text = contentText();
}

/** Is there room in My scenes for one more scene? Says so when there is not. */
function roomForScene() {
  if (nobodys() || library.hasRoom()) return true;
  notice(`My scenes is full: it holds ${MAX_SCENES} scenes. Delete some of them first.`, 'warn');
  return false;
}

/** The New button: an empty scene of its own. True when there is one now. */
function newScene() {
  if (nobodys() && !state.objects.length) {
    toast('The scene is already empty.');
    return true;
  }
  if (!roomForScene()) return false;
  const left = leaveScene();
  beginScene('', { objects: [] });
  toast(`New empty scene.${left}`);
  return true;
}

async function openFile(file) {
  let objects;
  let raw;
  try {
    raw = JSON.parse(await file.text());
    if (!raw || !Array.isArray(raw.objects)) throw new Error('not a scene');
    objects = sanitizeScene(raw).objects;
  } catch {
    toast(`"${file.name}" is not a Bloxd Particle Studio scene. Nothing was changed.`, 'warn');
    return;
  }
  if (!roomForScene()) return;
  const left = leaveScene();
  beginScene(nameOfFile(raw, file.name), { objects, code: sanitizeCode(raw.code), export: raw.export }, { named: true });
  toast(`Opened "${file.name}" as the scene "${current.name}".${left}`);
}

function openExample(example) {
  if (!roomForScene()) return;
  const left = leaveScene();
  beginScene(example.name, { objects: sanitizeScene(clone(example.scene)).objects });
  toast(`${example.name}: press Play.${left}`);
}

const saveFile = () => download(fileNameOf(current.name), JSON.stringify(fileData(), null, 1), 'application/json');

/**
 * A scene of My scenes is opened. True when it is the one that is open now.
 * `quiet`: before the page is drawn for the first time (then nothing is drawn or said here either).
 */
function openEntry(id, quiet = false) {
  endTrialNow();
  if (id === current.id) return true;
  const raw = library.read(id);
  let sound = !!raw;
  try {
    if (raw) sanitizeScene(raw);
  } catch {
    sound = false;
  }
  if (!sound) {
    notice('This scene could not be opened: it is not in the browser any more, or it is damaged.', 'warn');
    return false;
  }
  leaveScene();
  takeRecord(id, raw);
  if (quiet) {
    history.length = 0;
    future.length = 0;
    history.push(snapshot());
    return true;
  }
  if (scenesWindow) scenesWindow.hide();
  settle();
  toast(`Opened "${current.name}".`);
  return true;
}

/** A scene of My scenes gets another name. Returns the name it has now. */
function renameEntry(id, name) {
  const clean = cleanName(name);
  if (id !== current.id) return library.rename(id, clean) || clean;
  if (clean && clean !== current.name) {
    current.name = clean;
    current.named = true;
    showName();
    store();
  }
  return current.name;
}

/**
 * A scene of My scenes is deleted. When it is the one that is open, the scene
 * that was changed last before it takes its place, or a new empty one. Returns
 * a function that puts it back into My scenes; null when there was nothing to delete.
 */
function deleteEntry(id) {
  endTrialNow();
  const raw = library.read(id);
  if (!raw) return null;
  library.remove(id);
  if (id === current.id) {
    stopPlaying();
    const next = library.list().find((entry) => {
      try { return !!sanitizeScene(library.read(entry.id)); } catch { return false; }
    });
    if (next) {
      takeRecord(next.id, library.read(next.id));
      settle();
    } else beginScene('', { objects: [] });
    keepScene(false); // (the window that asked stays open, and shows the scene that is open now with its picture)
  }
  return () => { library.write(id, raw); };
}

/** Why the scenes are not safe in this browser, for the My scenes window: { text, kind }, or null. */
function storeTrouble() {
  if (!library.persistent()) {
    return {
      kind: 'warn',
      text: 'This browser does not keep anything for this page (a private window, or the page is inside another page). Your scenes are gone when the page is closed: use Save for the ones you want to keep.',
    };
  }
  if (!library.safe()) {
    return {
      kind: 'bad',
      text: 'The store of this browser is full. A scene that could not be kept is gone when the page is closed: save it as a file, or delete scenes you do not need.',
    };
  }
  return null;
}

// ------------------------------------------------------------------ share links

/**
 * Nothing here is the user's own work: the scene is empty, or the one a first
 * visit starts with, or an example as it comes, and the Code window is empty.
 * (What that means for My scenes: see nobodys.)
 */
function untouched() {
  if (state.code.graph.nodes.length || state.code.own) return false;
  if (!state.objects.length) return true;
  const text = (objects) => sceneText({ objects: sanitizeScene({ objects: clone(objects) }).objects, export: null, code: null });
  const mine = text(state.objects);
  return mine === text(starterScene()) || EXAMPLES.some((example) => mine === text(example.scene.objects));
}

/**
 * Everything that is open now: the scene, what My scenes knows of it, and the
 * steps of Undo. Returns the function that puts it all back.
 */
function hold() {
  const was = { entry: { ...current }, code: state.code, options: { ...state.export }, steps: [...history], undone: [...future] };
  return () => {
    Object.assign(current, was.entry);
    // (it was taken out of My scenes when it was left as nobody's work: now that it is open again, it is stored again)
    if (current.seen !== null && !library.read(current.id)) current.seen = null;
    state.code = was.code;
    Object.assign(state.export, was.options);
    history.length = 0;
    history.push(...was.steps);
    future.length = 0;
    future.push(...was.undone);
    showName();
    restore(history[history.length - 1]);
    if (viewport) viewport.focus(allPoints());
  };
}

/** The mark of a shared scene: what My scenes keeps of the link a scene came by (see sharedTwin). */
const linkMark = (scene) => markOf(sceneText(scene));

/**
 * The same link opened a second time: the scene it holds is in My scenes
 * already, as it came. Returns the id of that scene; null when there is none
 * (also when the one that came by the link was changed since).
 */
function sharedTwin(scene) {
  const text = sceneText(scene);
  const mark = markOf(text);
  for (const entry of library.list()) {
    if (entry.link !== mark || entry.id === current.id) continue;
    try {
      const raw = library.read(entry.id);
      if (sceneText(shareData({ objects: raw.objects, export: raw.export, code: raw.code })) === text) return entry.id;
    } catch { /* a scene that cannot be read is not that one */ }
  }
  return null;
}

/**
 * The scene of a share link is opened, as a scene of its own in My scenes:
 * nothing takes the place of anything. It is on trial first (see `trial`).
 * `quiet`: before the page is drawn for the first time, so nothing else is
 * ever seen; else like a file that is opened.
 */
function takeShared(scene, quiet = false) {
  const left = leaveScene();
  const back = hold();
  trial = { spent: 0, quiet, back, left };
  if (scenesWindow) scenesWindow.hide();
  beginScene('Shared scene', scene, { link: linkMark(scene), quiet });
  if (!quiet) toast(`Opened the shared scene: press Play.${sharedCode()}${left}`);
}

/** What is said when a shared scene brought nodes or code along: nobody should paste code into a world without having seen that it is there. */
const sharedCode = () => (state.code.graph.nodes.length || state.code.own ? ' The Code window has what belongs to it.' : '');

/** The first words about a shared scene that is on show. `first`: on a first visit, where the parts of the page are as well. */
const sharedWelcome = (first) => `A shared scene: press Play.${sharedCode()}${
  first ? ' The coloured buttons in the corners open the parts of the page: + Add, Scene, Settings and Timeline.' : ''}`;

/**
 * The end of a trial: the studio has drawn the shared scene and counted its
 * particles, or could not (`failed`). The last of the work is done here: where
 * the scene is through the show, which the view goes to. Kept: it is stored
 * now, as one more of My scenes, and the link goes out of the address. Not
 * kept, because it could not be worked out or took too long: the scene that
 * was open before is back. Returns true when the scene was not kept.
 */
function endTrial(failed) {
  const { back, quiet, left } = trial;
  let points = null;
  let kept = !failed && trial.spent <= SHARED_PATIENCE;
  if (kept) {
    const began = performance.now();
    try {
      points = allPoints(() => trial.spent + performance.now() - began > SHARED_PATIENCE);
    } catch {
      kept = false;
    }
    kept = kept && trial.spent + performance.now() - began <= SHARED_PATIENCE;
  }
  trial = null;
  share.forget();
  if (!kept) {
    back();
    toast('This shared scene is more than the studio can work out here, so it was not kept. Ask for it as a file, or for a smaller one.', 'warn');
    return true;
  }
  store();
  if (viewport) viewport.focus(points);
  if (quiet) toast(`${sharedWelcome(welcome())}${left}`);
  return false;
}

/** The first visit? Asked once: after that it is not the first any more. */
function welcome() {
  if (recall('welcomed')) return false;
  keep('welcomed', true);
  return true;
}

/**
 * A share link is in the address (`arrived`: what share.arrival() gave), at
 * the start of the page or put there while the page is open. Its scene is
 * opened as one more of My scenes: the scene that is here stays there.
 */
async function sharedArrived(arrived, starting = false) {
  if (!arrived) return;
  if (trial) {
    // (another shared scene is still on trial, for a moment: one after the other)
    setTimeout(() => sharedArrived(arrived, starting), 300);
    return;
  }
  if (arrived.error) {
    // (a link from a newer studio stays in the address: the page loads again by itself when there is a newer one)
    if (arrived.error !== 'newer') share.forget();
    notice(SHARE_ERRORS[arrived.error] || SHARE_ERRORS.broken, 'warn');
    return;
  }
  if (share.here(arrived.scene)) {
    share.forget();
    notice(starting ? sharedWelcome(welcome()) : 'This shared scene is open already.');
    return;
  }
  const twin = sharedTwin(arrived.scene);
  if (twin && openEntry(twin)) {
    share.forget();
    toast(`This shared scene is in My scenes already, as "${current.name}": it is open now.`);
    return;
  }
  if (!roomForScene()) {
    share.forget();
    return;
  }
  takeShared(arrived.scene);
}

/** The Examples button and its menu. */
function bindExamples() {
  const button = $('#examples');
  const menu = $('#examples-menu');
  const close = () => {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };
  menu.replaceChildren(...EXAMPLES.map((example) => h('button', {
    class: 'menu-item', role: 'menuitem', 'data-example': example.id,
    onclick: () => { close(); openExample(example); },
  }, h('b', {}, example.name), h('span', {}, example.about))));
  button.onclick = () => {
    menu.hidden = !menu.hidden;
    button.setAttribute('aria-expanded', String(!menu.hidden));
    button.blur();
    // it hangs from the right end of the button; in a narrow window it is pushed back inside
    menu.style.right = '0px';
    const { left } = menu.getBoundingClientRect();
    if (!menu.hidden && left < 8) menu.style.right = `${left - 8}px`;
  };
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== button) close();
  });
  return close;
}

// ------------------------------------------------------------------ start

/** The little picture on a shape's button: the shape itself, as it comes when you add it. */
function drawShapeIcon(canvas, shape) {
  const px = canvas.width;
  const ctx = canvas.getContext('2d');
  const pts = shapePoints(shape.id, shape.count, defaultParams(shape.id));
  const solid = shape.group === 'solid';
  // a letter with a tail (g, y) reaches below the box and the accent of a capital (É) above it:
  // the picture is made a little smaller and moved, so the tail or the accent shows
  const drop = shape.drop || 0;
  const rise = shape.rise || 0;
  const reach = (solid ? 31 : 38) / (1 + (drop + rise) / 2); // 3D shapes are drawn turned, so they need room for their corners
  const dot = pts.length > 110 ? 3 : pts.length > 60 ? 4 : 5;
  const cy = Math.cos(0.6), sy = Math.sin(0.6), cx = Math.cos(0.45), sx = Math.sin(0.45);
  const dy = shape.id === 'dome' ? 0.35 : (rise - drop) / 2;
  ctx.fillStyle = '#e8ecf5';
  for (const [x0, y0, z0] of pts) {
    let x = x0, y = y0;
    if (solid) {
      const x1 = x0 * cy + z0 * sy;
      const z1 = -x0 * sy + z0 * cy;
      x = x1;
      y = y0 * cx - z1 * sx;
    }
    ctx.fillRect(Math.round(px / 2 + x * reach - dot / 2), Math.round(px / 2 - (y - dy) * reach - dot / 2), dot, dot);
  }
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const SHOWN_AT_ONCE = 40; // about as many shape buttons as are in view without scrolling
const FOLD_FROM = 900; // a tab with more shapes than this shows the beginning of each long heading, and a button for the rest
const FOUND_AT_ONCE = 200; // of what a search finds, so many at a time

/**
 * The shape library: tabs, a search box and a grid of buttons. Inside a tab the
 * shapes stand under headings. Only the shapes on show are in the page; a button
 * is made the first time it is needed and kept, and its picture is drawn when it
 * first comes into view, so a long tab or a wide search stays quick.
 *
 * The library has thousands of shapes. A big tab shows the first rows under
 * each heading with a "Show all" button, so that every heading of the tab is
 * in reach; a search shows what it found a few hundred at a time.
 */
function bindShapePicker() {
  const search = $('#shape-search');
  const tabs = $('#shape-tabs');
  const grid = $('#shapes');
  const hint = $('#shape-note');
  const made = new Map();
  const blank = new Map(); // picture (canvas) -> its shape, until it is drawn
  const unfolded = new Set(); // 'tab/Heading': the headings that were opened with "Show all"
  let tab = CATEGORIES[0].id;
  let found = FOUND_AT_ONCE; // how many of the shapes a search found are on show

  const draw = (canvas) => {
    const shape = blank.get(canvas);
    if (!shape) return;
    blank.delete(canvas);
    if (watch) watch.unobserve(canvas);
    drawShapeIcon(canvas, shape);
    // a drawn shape measures its number of particles the first time it is asked for: the hint that
    // names the number is written here, when the button comes into view, so a long tab opens quickly
    canvas.parentNode.title = `${shape.name}: ${shape.count} particles`;
  };
  const watch = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((seen) => { for (const e of seen) if (e.isIntersecting) draw(e.target); }, { root: grid, rootMargin: '260px 0px' })
    : null;

  const button = (s) => {
    if (!made.has(s.id)) {
      const picture = h('canvas', { width: 88, height: 88 });
      made.set(s.id, h('button', {
        title: s.name, 'aria-label': `Add ${s.name}`, 'data-shape': s.id,
        onclick: () => chooseShape(s.id),
      }, picture, h('span', {}, shapeCaption(s)))); // (a long word in it breaks where it reads well)
      blank.set(picture, s);
      if (watch) watch.observe(picture);
      else draw(picture);
    }
    return made.get(s.id);
  };

  /**
   * Draws the grid. `next`: more shapes were asked for with a "Show" button; this is the first of them. The grid
   * stays scrolled to where it is, and that shape is where the keyboard is (the button that was pressed is gone).
   */
  const show = (next = null) => {
    const stay = !!next;
    const typed = search.value.trim();
    const list = typed ? searchShapes(typed) : SHAPES.filter((s) => s.cat === tab);
    for (const b of tabs.children) {
      const on = !typed && b.dataset.tab === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
    const at = grid.scrollTop;
    const cells = [];
    let shown = 0;
    const add = (s) => {
      const b = button(s);
      if (shown++ < SHOWN_AT_ONCE) draw(b.firstChild); // what is in view at once has its picture straight away
      cells.push(b);
    };
    const more = (label, title, act) => h('button', { class: 'shape-more', title, onclick: act }, label);
    if (typed) {
      list.slice(0, found).forEach(add);
      if (list.length > found) {
        const some = Math.min(FOUND_AT_ONCE, list.length - found);
        const first = list[found];
        cells.push(more(`Show ${some} more`, `${list.length - found} more shapes were found`, () => { found += FOUND_AT_ONCE; show(first); }));
      }
    } else {
      // in a tab, a heading stands before the first shape of each kind (SHAPES is in that order)
      const kinds = [];
      for (const s of list) {
        if (!kinds.length || kinds[kinds.length - 1].name !== (s.sub || '')) kinds.push({ name: s.sub || '', shapes: [] });
        kinds[kinds.length - 1].shapes.push(s);
      }
      // a big tab: so many shapes under each heading that all its headings are a short scroll apart (whole rows of four)
      const most = list.length > FOLD_FROM ? Math.max(8, Math.floor(480 / kinds.length / 4) * 4) : Infinity;
      for (const kind of kinds) {
        const size = kind.shapes.length;
        if (kind.name) cells.push(h('h4', { class: 'shape-sub', 'aria-label': `${kind.name}: ${size} shapes` }, kind.name, h('small', {}, String(size))));
        const key = `${tab}/${kind.name}`;
        // (a heading with only a few more than fit is shown whole: a button that hides one row saves nothing)
        const folded = size > most + 8 && !unfolded.has(key);
        (folded ? kind.shapes.slice(0, most) : kind.shapes).forEach(add);
        if (folded) {
          const first = kind.shapes[most];
          cells.push(more(`Show all ${size}`, `${size - most} more under \u201c${kind.name || 'the first shapes'}\u201d`, () => { unfolded.add(key); show(first); }));
        }
      }
    }
    grid.replaceChildren(...cells);
    grid.scrollTop = stay ? at : 0;
    if (next && made.has(next.id)) made.get(next.id).focus({ preventScroll: true });
    hint.hidden = !typed;
    if (typed) {
      hint.textContent = list.length
        ? `${list.length} of ${SHAPES.length} shapes. Enter adds the first one.`
        : `No shape matches \u201c${typed.slice(0, 30)}\u201d. Try a shorter word or pick a kind above.`;
    }
    measureAddPart(); // (the note takes room, or gives it back)
  };

  tabs.replaceChildren(...CATEGORIES.map((c) => {
    const size = SHAPES.filter((s) => s.cat === c.id).length;
    return h('button', {
      'data-tab': c.id, title: `${size} shapes`,
      onclick: () => { tab = c.id; search.value = ''; show(); },
    }, c.name);
  }));
  search.placeholder = `Search ${SHAPES.length} shapes`;
  search.oninput = () => { found = FOUND_AT_ONCE; show(); };
  search.onkeydown = (e) => {
    if (e.key === 'Enter') {
      const first = searchShapes(search.value)[0];
      if (first) chooseShape(first.id);
    } else if (e.key === 'Escape' && search.value) {
      search.value = '';
      show();
    }
  };
  show();
  // The search gets ready while the page has nothing else to do, a few thousand shapes at a time:
  // the first letter that is typed is then answered at once.
  const whenIdle = window.requestIdleCallback ? (act) => window.requestIdleCallback(act) : (act) => setTimeout(act, 60);
  const getReady = () => { if (prepareSearch()) whenIdle(getReady); };
  whenIdle(getReady);
}

function bindTimeline() {
  const changed = (done) => {
    if (done) commit();
    refresh();
    syncInspector();
  };
  timeline = createTimeline($('#timeline'), {
    seek,
    select,
    fold: toggleFold,
    start: (id, seconds, done) => {
      const o = nodeOf(id);
      if (!o) return;
      // (in a group it counts from the moment the group starts, and cannot start before it)
      if (!done) o.start = round(Math.min(MAX_START, Math.max(0, seconds - tree().originOf(o))), 3);
      changed(done);
    },
    end: (id, seconds, done) => {
      const o = nodeOf(id);
      if (!o || isGroup(o)) return;
      if (!done) o.life = Math.min(1000, Math.max(0.05, round((seconds - tree().span(o).start) * LIFE_PER_SECOND, 3)));
      changed(done);
    },
    key: (id, index, seconds, done) => {
      const o = nodeOf(id);
      if (!o || !o.keys[index]) return;
      if (!done) {
        // stays between its neighbours
        const from = tree().span(o).start;
        const lo = (index ? o.keys[index - 1].t : 0) + MIN_KEY_GAP;
        const hi = index < o.keys.length - 1 ? o.keys[index + 1].t - MIN_KEY_GAP : 6000;
        o.keys[index].t = round(Math.min(hi, Math.max(lo, seconds - from)), 3);
        state.time = round(from + o.keys[index].t, 3);
      }
      changed(done);
    },
  });
  // After a click the keyboard goes back to the shortcuts (Space plays, it does not press the button again).
  const press = (id, action) => { $(id).onclick = () => { action(); $(id).blur(); }; };
  press('#tl-home', rewind);
  press('#tl-play', togglePlay);
  press('#tl-key', addKeyHere);
  press('#tl-del', deleteKeyHere);
  press('#tl-zoom-in', () => timeline.zoomBy(2));
  press('#tl-zoom-out', () => timeline.zoomBy(0.5));
  $('#tl-loop').onchange = () => { state.loop = $('#tl-loop').checked; $('#tl-loop').blur(); };
  const at = $('#tl-at');
  selectOnEntry(at);
  at.oninput = () => { if (at.value !== '' && Number.isFinite(Number(at.value))) seek(Number(at.value), 0, true); };
  at.onchange = () => { at.value = round(state.time, 2); };
  const ease = $('#tl-ease');
  ease.replaceChildren(...EASES.map((e) => h('option', { value: e.id }, e.name)));
  ease.onchange = () => {
    // on a key: that key. Anywhere else: the choice for the keys made from now on.
    const node = selectedObject();
    const mark = node ? standOf(node).mark : null;
    if (mark && mark.at === 'key') {
      node.keys[mark.index].ease = ease.value;
      commit();
      refresh();
    } else state.ease = ease.value;
    ease.blur();
  };
  document.addEventListener('pointerdown', (e) => {
    keyPressed = e.target instanceof Element && !!e.target.closest('.tl-key:not(.first)');
  }, true);
  window.addEventListener('resize', renderTimeline);
  window.addEventListener('resize', measureAddPart);
  renderTimeline();
}

// ------------------------------------------------------------------ panels

/**
 * The big parts of the page stay shut until their button is pressed, so the 3D
 * view has the window to itself. The buttons sit in the corners of the 3D view;
 * the page remembers which parts are open. `within`: the two parts on the left
 * share one panel, which is there while one of them is open.
 */
const PANELS = [
  { id: 'add', key: '1', el: '#cat-add', button: '#show-add', within: '#left' },
  { id: 'scene', key: '2', el: '#cat-scene', button: '#show-scene', within: '#left' },
  { id: 'settings', key: '3', el: '#inspector', button: '#show-settings' },
  { id: 'timeline', key: '4', el: '#timeline', button: '#show-timeline' },
];
const shown = Object.fromEntries(PANELS.map((p) => [p.id, recall(`panel.${p.id}`, false)]));

/** Make the page look the way `shown` says. */
function applyPanels() {
  for (const panel of PANELS) {
    const on = shown[panel.id];
    const el = $(panel.el);
    el.hidden = !on;
    if (panel.within) {
      el.classList.toggle('open', on);
      $(panel.within).hidden = !PANELS.some((p) => p.within === panel.within && shown[p.id]);
    }
    $(panel.button).setAttribute('aria-pressed', String(on));
  }
  // nothing open: on a small screen the 3D view takes the whole height
  document.body.classList.toggle('bare', !PANELS.some((p) => shown[p.id]));
  measureAddPart();
}

/**
 * The left panel shares its height between the shapes and the scene list, and the scene list may
 * take only what the shapes can spare: a row of shapes always stays in view (see "#cat-scene.open"
 * in style.css). For that the style sheet has to know how high the Add part is without its shapes.
 * That grows with every row of tabs, and with the notes that come and go, so it is measured here:
 * when the part opens, when a note shows or goes, and when the window changes.
 */
function measureAddPart() {
  const part = $('#cat-add');
  if (isSmall() || !part.offsetHeight) return; // one column, where nothing is shared; or shut
  const rest = Math.ceil(part.getBoundingClientRect().height - $('#shapes').getBoundingClientRect().height);
  const left = $('#left');
  if (left.style.getPropertyValue('--add-rest') !== `${rest}px`) left.style.setProperty('--add-rest', `${rest}px`);
}

/** Open or close a part of the page (no `on`: the other way round). */
function showPanel(id, on = !shown[id]) {
  const panel = PANELS.find((p) => p.id === id);
  if (!panel || shown[id] === on) return;
  shown[id] = on;
  keep(`panel.${id}`, on);
  applyPanels();
  if (id === 'timeline') keyPressed = false; // (Delete is for what can be seen: not for a key clicked before the timeline went)
  if (!on) return;
  // what could not be laid out while it was out of sight
  if (id === 'timeline' && timeline) timeline.reveal();
  if (id === 'scene') showSelectedRow();
  // one column on a small screen: the part that opened may be below the edge
  if (isSmall()) $(panel.el).scrollIntoView({ block: 'nearest' });
}

/**
 * The panel a pressed key stands for. By the place of the key as well as by
 * what it types: on a French keyboard the keys with 1 to 4 on them type & é " '
 * unless Shift is held.
 */
function panelOfKey(e) {
  const digit = /^Digit\d$/.test(e.code) ? e.code.slice(5) : e.key;
  return PANELS.find((p) => p.key === digit) || null;
}

function bindPanels() {
  for (const panel of PANELS) {
    const button = $(panel.button);
    button.onclick = () => { showPanel(panel.id); button.blur(); }; // (the keyboard goes back to the shortcuts)
    // the heading of a part on the left closes it again
    const head = panel.within ? $(panel.el).querySelector('.cat-head') : null;
    if (head) head.onclick = () => showPanel(panel.id, false);
  }
  applyPanels();
}

function bindUi() {
  bindPanels();
  bindShapePicker();
  const closeExamples = bindExamples();
  $('#add-point').onclick = () => addObject('point');
  $('#undo').onclick = undo;
  $('#redo').onclick = redo;
  $('#play').onclick = togglePlay;
  $('#group').onclick = () => { groupSelected(); $('#group').blur(); };
  $('#array').onclick = () => { arrayTool(); $('#array').blur(); };
  $('#studio').onclick = () => { studioTool(); $('#studio').blur(); };
  $('#morph').onclick = () => { morphTool(); $('#morph').blur(); };
  $('#add-draw').onclick = drawShape;
  $('#pick-cancel').onclick = endPick;
  codeWindow = createCodeWindow({
    code: () => state.code,
    objects: () => state.objects,
    options: () => ({ precision: state.export.precision, hideDist: state.export.hideDist }),
    changed: store,
    download,
  });
  $('#code').onclick = () => { codeTool(); $('#code').blur(); };
  bindTimeline();
  $('#focus').onclick = () => viewport && viewport.focus(allPoints());
  // after an array is made its copies-to-be are not shown again until the pointer has been somewhere else
  document.addEventListener('pointermove', (e) => {
    if (arrayRest && !(e.target instanceof Element && e.target.closest('[data-cat="array"] .cat-body'))) arrayRest = false;
  });
  $('#export').onclick = openExport;
  $('#snap').checked = state.snap;
  $('#snap').onchange = () => { state.snap = $('#snap').checked; if (viewport) viewport.setSnap(state.snap); store(); };
  $('#sky').checked = state.sky;
  $('#sky').onchange = () => { state.sky = $('#sky').checked; if (viewport) viewport.setTheme(state.sky ? 'sky' : 'dark'); store(); };
  const setMode = (mode) => {
    state.mode = mode;
    for (const b of document.querySelectorAll('#modes button')) b.classList.toggle('on', b.dataset.mode === mode);
    refresh();
  };
  for (const b of document.querySelectorAll('#modes button')) b.onclick = () => setMode(b.dataset.mode);
  setMode(state.mode);

  // dropped below the list: out of all groups
  const out = $('#drop-out');
  out.addEventListener('dragover', (e) => { e.preventDefault(); out.classList.add('drop'); });
  out.addEventListener('dragleave', () => out.classList.remove('drop'));
  out.addEventListener('drop', (e) => {
    e.preventDefault();
    endDrag();
    intoGroup(null);
  });

  $('#new').onclick = () => { newScene(); $('#new').blur(); };
  scenesWindow = createScenes({
    list: () => library.list(),
    current: () => current.id,
    refresh: keepScene,
    open: openEntry,
    fresh: newScene,
    rename: renameEntry,
    duplicate: (id) => {
      const copy = library.duplicate(id);
      return copy ? cleanName(library.read(copy).name) : null;
    },
    remove: deleteEntry,
    trouble: storeTrouble,
  });
  $('#scenes').onclick = () => { endTrialNow(); stopPlaying(); scenesWindow.show(); $('#scenes').blur(); };
  // the small picture of the scene is as new as the scene when the page is left ...
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') keepScene(false); else catchUp(); });
  window.addEventListener('pagehide', () => keepScene(false));
  // ... and when the page is looked at again, the scene is as new as another tab left it
  window.addEventListener('focus', catchUp);
  window.addEventListener('pageshow', (e) => { if (e.persisted) catchUp(); });
  $('#save').onclick = saveFile;
  $('#share').onclick = () => { share.show(); $('#share').blur(); };
  $('#open').onclick = () => $('#file').click();
  $('#file').onchange = () => {
    const file = $('#file').files[0];
    $('#file').value = '';
    if (file) openFile(file);
  };

  $('#ex-precision').replaceChildren(...PRECISIONS.map((p) => h('option', { value: p.scale }, p.label)));
  for (const id of ['#ex-target', '#ex-precision', '#ex-hide', '#ex-wx', '#ex-wy', '#ex-wz']) $(id).onchange = exportOptionChanged;
  $('#ex-copy').onclick = copyCode;
  $('#ex-download').onclick = () => {
    const n = state.export.part + 1;
    download(state.export.target === 'world' ? 'particles-world-code.js' : `particles-block-${n}.js`, $('#ex-code').value, 'text/javascript');
  };

  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (document.querySelector('dialog[open]')) return; // (a window is open: the keys are for it)
    if (e.key === 'Escape' && !$('#examples-menu').hidden) { closeExamples(); return; }
    if (t instanceof HTMLElement) {
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; // typing
      if (t.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return; // pressing the button
    }
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if (mod && key === 'y') { e.preventDefault(); redo(); }
    else if (mod && key === 'd') { e.preventDefault(); duplicateSelected(); }
    else if (mod && key === 'g') { e.preventDefault(); if (e.shiftKey) ungroupSelected(); else groupSelected(); }
    else if (mod && key === 'a') {
      e.preventDefault();
      state.selection = tree().childrenOf(null).map((o) => o.id);
      renderList();
      renderInspector();
      refresh();
    }
    else if (mod || e.altKey) return;
    else if ((key === 'delete' || key === 'backspace') && state.studio.on && state.studio.point >= 0 && removeDot()) e.preventDefault();
    else if (key === 'delete' || key === 'backspace') {
      if (keyPressed) {
        e.preventDefault();
        if (!deleteKeyHere()) toast('No key under the time marker. To delete the whole object, click it first.');
      } else if (state.selection.length) { e.preventDefault(); removeSelected(); }
    }
    else if (panelOfKey(e)) showPanel(panelOfKey(e).id);
    else if (key === 'w') setMode('translate');
    else if (key === 'e') setMode('rotate');
    else if (key === 'r') setMode('scale');
    else if (key === 'a') arrayTool();
    else if (key === 's') studioTool();
    else if (key === 'm') morphTool();
    else if (key === 'c') codeTool();
    else if (key === 'f') $('#focus').click();
    else if (key === ' ') { e.preventDefault(); togglePlay(); }
    else if (key === 'k') addKeyHere();
    else if (key === 'home') rewind();
    else if (key === 'arrowleft' || key === 'arrowright') {
      e.preventDefault();
      seek(state.time + (key === 'arrowleft' ? -1 : 1) * (e.shiftKey ? 1 : 0.05), 0, true);
    } else if (key === 'escape') {
      if (state.pickFor) endPick();
      else if (state.studio.on) { Object.assign(state.studio, { on: false, tool: -1, point: -1 }); refresh(); syncInspector(); }
      else if (state.playing || state.time > 0) rewind();
      else select(null);
    }
  });
}

async function start() {
  if (!loadStored()) {
    state.objects = starterScene();
    current.text = contentText();
  }
  share = createShare({
    data: () => ({ objects: state.objects, export: fileData().export, code: state.code }),
  });
  history.push(snapshot());
  // A share link in the address. Its scene is put in before the page is drawn, as one more of My scenes (or the
  // one it already is there): nothing else is ever seen, and the scene that would have been here stays in My scenes.
  let arrived = await share.arrival();
  const linked = !!arrived; // (then what is said first is about the link)
  let known = ''; // the scene of the link was in My scenes already: its name
  if (linked && arrived.scene && !share.here(arrived.scene)) {
    const twin = sharedTwin(arrived.scene);
    if (twin && openEntry(twin, true)) {
      share.forget();
      known = current.name;
      arrived = null;
    } else if (nobodys() || library.hasRoom()) {
      takeShared(arrived.scene, true);
      arrived = null;
    }
  }
  bindUi();
  showName();
  renderList();
  renderInspector();
  updateHistoryButtons();

  const loaded = await Promise.all([...TEXTURES.map((t) => loadImage(assetUrl(`textures/${t}.png`))), loadImage(assetUrl('textures/ui/code_block.png'))]);
  TEXTURES.forEach((t, i) => { images[t] = loaded[i]; });
  images.code_block = loaded[TEXTURES.length];
  renderList(); // now with pictures

  try {
    viewport = createViewport($('#view'), images, TEXTURES, {
      onPick: pick,
      // Only what the drag changes is written. (The angles the handles report are
      // the same rotation, but not the same numbers: a typed 360 would come back as 0.)
      onTransform: (t) => edit((o) => setPose(o, (k) => {
        if (t.mode === 'translate' || o.shape === 'point') k.pos = t.pos.map((v) => round(Math.min(500, Math.max(-500, v))));
        else if (t.mode === 'rotate') k.rot = t.rot.map((v) => round(v, 2) + 0); // + 0 turns -0 into 0
        else k.scale = t.scale.map((v) => round(Math.min(100, Math.max(-100, v))));
      })),
      onTransformEnd: commit,
      onHandleDrag: dragDot,
      onHandleEnd: () => { commit(); syncInspector(); },
      onHandleClick: clickDot,
      onFrame,
    });
  } catch (err) {
    $('#fatal').hidden = false;
    $('#fatal').textContent = 'The 3D view could not start: this browser or device has WebGL turned off.';
    console.error(err);
    return;
  }
  viewport.setSnap(state.snap);
  viewport.setTheme(state.sky ? 'sky' : 'dark');
  refresh();
  updateStats(); // (a shared scene that was put in above has been worked out now: the end of its trial)
  // the first time: where everything is
  if (!linked && welcome()) toast('The coloured buttons in the corners open the parts of the page: + Add, Scene, Settings and Timeline.');
  if (known) toast(`This shared scene is in My scenes already, as "${known}": press Play.`);
  // Handy in the console and for tests. After changing studio.state by hand, call studio.redraw().
  window.studio = {
    state, viewport, timeline, generateCode, select, addObject, seek, examples: EXAMPLES, openExample,
    redraw: () => { commit(); renderInspector(); refresh(); },
    showPanel, panels: () => ({ ...shown }),
    code: codeWindow,
    share,
    scenes: {
      window: scenesWindow, library, current: () => ({ ...current }), open: openEntry, fresh: newScene, keep: keepScene,
      rename: renameEntry, remove: deleteEntry, nobodys,
    },
  };
  sharedArrived(arrived, true);
  // a share link pasted into the address while the page is open
  window.addEventListener('hashchange', async () => sharedArrived(await share.arrival()));
}

start();
