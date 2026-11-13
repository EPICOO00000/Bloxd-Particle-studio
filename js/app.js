// Bloxd Particle Studio: the user interface. Scene state lives here; the maths
// is in scene.js and motion.js, the changes that involve several objects in
// edits.js and moves.js, the code generator in codegen.js and the 3D view in
// viewport.js.

import { SHAPES, SHAPE_BY_ID, CATEGORIES, shapePoints, defaultParams, searchShapes, MAX_COUNT } from './shapes.js';
import {
  TEXTURES, PLACEHOLDER_TEXTURES, BLEND_MODES, LIFE_PER_SECOND, createObject, sanitizeScene,
  computeParticles, sceneDuration, sceneTree, isGroup, rgbToHex, localPoints,
} from './scene.js';
import {
  poseAt, markAt, keyAt, planOf, restPose, lineageMatrix, lookAt, NEAR_KEY,
  EASES, MAX_KEYS, MIN_KEY_GAP, MAX_START, MAX_REPEAT, MIN_EVERY, keyHasColor, keyHasSize,
} from './motion.js';
import { generateCode, LIMITS, PRECISIONS } from './codegen.js';
import {
  uniqueName, topNodes, removeNodes, moveInto, groupNodes, ungroup, duplicateNodes, mirrorNodes, stretchNodes,
  copyKeys, pasteKeys, movePivot,
} from './edits.js';
import { MOVES, MOVE_BY_ID, moveFields, mostTimes, applyMove } from './moves.js';
import { EXAMPLES } from './examples-data.js';
import { createViewport } from './viewport.js';
import { createTimeline } from './timeline.js';
import { assetUrl } from './assets.js';
import { $, h, clone, round, selectOnEntry, category, wireCategory } from './ui.js';

const STORE = 'bloxd-particle-studio.v1';
const MANY_PARTICLES = 600; // above this one click may lag slower devices
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

function loadStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE));
    if (!raw) return false;
    state.objects = sanitizeScene(raw).objects;
    applyExportOptions(raw.export);
    state.sky = !!raw.sky;
    state.snap = !!raw.snap;
    return true;
  } catch {
    return false;
  }
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
  app: 'bloxd-particle-studio', version: 1, objects: state.objects,
  export: { target: state.export.target, precision: state.export.precision, hideDist: state.export.hideDist, worldPos: state.export.worldPos },
  sky: state.sky, snap: state.snap,
});

function store() {
  try {
    localStorage.setItem(STORE, JSON.stringify(fileData()));
  } catch { /* private mode or sandboxed frame: the Save button still works */ }
}

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
    n += tr.plain(leaf) ? points : points * tr.playsOf(leaf).reduce((sum, play) => sum + planOf(leaf, play).pieces.length, 0);
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
  if (!state.playing) viewport.setParticles(computeParticles(state.objects, state.time > 0 ? state.time : null, { ghosts: true }));
  const nodes = selectedNodes();
  const ids = [...new Set(nodes.flatMap((n) => tr.leavesOf(n)).map((leaf) => leaf.id))];
  // the handles sit where the object is at that moment; several objects have none
  const one = nodes.length === 1 && !tr.isHidden(nodes[0]) ? nodes[0] : null;
  const stand = one ? standOf(one, tr) : null;
  viewport.setMode(state.pivot && isGroup(one) ? 'translate' : state.mode);
  viewport.setSelection(ids, stand ? { pose: stand.pose, around: stand.around, point: one.shape === 'point' } : null, !state.playing);
  clearTimeout(statsTimer);
  statsTimer = setTimeout(updateStats, 120);
}

/** Particle count and how many code blocks the scene needs. */
function updateStats() {
  const result = generateCode(state.objects, state.export);
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

/** Places to frame the camera on: where the particles are at the start and through the show. */
function allPoints() {
  const points = computeParticles(state.objects, null).map((p) => p.pos);
  const end = duration();
  if (state.objects.some((o) => o.keys.length || o.move && o.move.some((v) => v))) {
    for (let i = 1; i <= 8; i++) {
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
function sliderPair({ get, set, min, max, step, numMax, label }) {
  const range = h('input', {
    type: 'range', min, max, step, 'aria-label': label,
    oninput: () => edit((o) => set(o, Number(range.value))),
    onchange: () => { commit(); range.blur(); }, // give the keyboard back to the shortcuts
  });
  fields.push({ sync: () => { const o = selectedObject(); if (o) range.value = get(o); } });
  return h('div', { class: 'pair' }, range, numberInput({ get, set, min, max: numMax ?? max, step, label }));
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
  const fallback = group ? 'Group' : def ? def.name : 'Particle';
  const name = h('input', {
    type: 'text', maxLength: 40, 'aria-label': 'Name', value: node.name,
    oninput: () => { node.name = name.value.trim() || fallback; },
    onchange: () => { commit(); renderTimeline(); },
  });
  selectOnEntry(name);
  return h('div', { class: 'ins-head' },
    h('h2', {}, group ? 'Group' : def ? `${def.name} shape` : 'Single particle'),
    row('Name', name),
    h('div', { class: 'buttons' },
      h('button', { onclick: duplicateSelected, title: 'Ctrl+D' }, 'Duplicate'),
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
        ? [o.id, mark.index, keyHasColor(key), !!key.color2, keyHasSize(key), typeof key.size2 === 'number'].join()
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
  const usable = MOVES.filter((m) => !(m.leaf && isGroup(node)) && !(m.shaped && node.shape === 'point'));
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

const KEYBOARD = [
  ['W, E, R', 'move, rotate, resize'], ['Click', 'select; in a group: the group first, click again for what is in it'],
  ['Ctrl+click', 'select several'], ['Shift+click', 'in the lists: everything in between'], ['Ctrl+A', 'select everything'],
  ['Ctrl+G', 'group what is selected'], ['Ctrl+Shift+G', 'take the group apart'], ['Ctrl+D', 'duplicate'], ['Delete', 'delete'],
  ['Ctrl+Z, Ctrl+Y', 'undo, redo'], ['Space', 'play or pause'], ['K', 'add a key at the time marker'],
  ['Left, Right', 'move the time marker (Shift: a whole second)'], ['Esc', 'back to the start, then select nothing'], ['F', 'center the view'],
];

function nothingSelected() {
  return [
    h('div', { class: 'ins-head' },
      h('h2', {}, 'How it works'),
      h('ol', { class: 'steps' },
        h('li', {}, h('b', {}, 'Add'), ' a particle or a shape on the left. Or open one of the ', h('b', {}, 'Examples'), ' at the top.'),
        h('li', {}, h('b', {}, 'Click'), ' it in the 3D view and drag the arrows to move it. Its settings appear here, in categories that open when you click them.'),
        h('li', {}, h('b', {}, 'Export code'), ', paste it into a code block in Bloxd and click the block.'))),
    category('show', 'Whole show', [
      row('Lasts', withUnit(numberOnEnter({
        get: duration, apply: stretchShow, min: 0.1, max: 6000, label: 'Seconds the whole show lasts',
        title: 'Type another length: everything gets slower or faster to fit.',
      }), 'seconds')),
      note('The show is what happens after one click on the code block, from the first particle to the last. Type another length to make all of it slower or faster.'),
    ], { summary: liveNote(() => `${round(duration(), 1)} s`, 'span') }),
    category('tips', 'Tips', [
      note('The crate in the middle is your code block. Everything appears in the game exactly where you see it around the block. One grid square is one block. Y is up.'),
      note(h('b', {}, 'Timing: '), 'drag the bar of an object on the timeline to make it appear later. To make it move: click it, click a later time on the row of numbers, press Add key and move it.'),
      note(h('b', {}, 'Groups: '), 'select several objects (Ctrl+click), press Group, and they move, turn and resize as one. A wing is a group; so is a whole dragon.'),
      note(h('b', {}, 'Ready-made moves: '), 'Flap, Pulse, Spin, Orbit and more work out the keys for you. Select something and open that category.'),
      note(h('b', {}, 'Repeat: '), 'under Time, an object or a whole group can be played again and again, for fire, smoke or rain.'),
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
        h('button', { onclick: () => { for (const n of nodes) n.hidden = !hidden; commit(); renderInspector(); refresh(); } }, hidden ? 'Show' : 'Hide'),
        h('button', { class: 'danger', onclick: () => removeSelected(), title: 'Delete' }, 'Delete')),
      note('Group them to move, turn and resize them as one, and to give them keys together.')),
    arrangeSection(nodes),
  ];
}

function renderInspector() {
  fields = [];
  const panel = $('#inspector');
  const nodes = selectedNodes();
  let parts;
  if (!nodes.length) parts = nothingSelected();
  else if (nodes.length > 1) parts = severalSelected(nodes);
  else {
    const [node] = nodes;
    const def = SHAPE_BY_ID[node.shape];
    parts = isGroup(node)
      ? [headOf(node), placeSection(node), timeSection(node), keysSection(node), movesSection(node), arrangeSection(nodes)]
      : [headOf(node), lookSection(node), def ? shapeSection(def) : null, placeSection(node), timeSection(node), keysSection(node),
        movesSection(node), motionSection(!!def), arrangeSection(nodes)];
  }
  const top = panel.scrollTop;
  panel.replaceChildren(...parts.filter(Boolean));
  panel.scrollTop = top;
  syncInspector();
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
    return `No keys: ${group ? 'the group' : 'it'} stays in one place. To make it move, put the time marker of the timeline at a later moment, press Add key and move it. Or pick a ready-made move below.`;
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
    h('b', {}, part.chars.toLocaleString('en')), ` / ${LIMITS.chars.toLocaleString('en')} characters`,
    world ? '' : ` · ${part.lines} / ${LIMITS.lines} lines`]));
  $('#ex-meter').style.color = over || (world && part.chars > LIMITS.chars) ? 'var(--bad)' : '';

  const status = [];
  const say = (text, kind = '') => status.push(h('p', { class: kind }, text));
  if (!result.particles) say('The scene is empty. Add a particle or a shape first.', 'bad');
  else {
    say(`${plural(result.particles, 'particle')}. They stay about ${round(result.seconds, 1)} seconds${world ? ', then they are drawn again' : ' after each click'}.`);
    if (result.particles > MANY_PARTICLES) say('That is a lot of particles at once and can lag slower devices. Bigger particles with a smaller "How many" look much the same; fewer keys and repeats help too.', 'warn');
    if (!world && parts.length > 1) say(`This scene does not fit in one code block (16,000 characters), so it is split into ${parts.length}. Stack the code blocks on top of each other in order, block 1 at the bottom.`, 'warn');
    if (world && part.chars > LIMITS.chars) say('This is longer than the 16,000 characters World Code allows. Use fewer particles or coarser positions.', 'bad');
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
    ['Click the block: the particles appear around it exactly as in the studio.'],
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

/** A short message over the 3D view. (alert and confirm do not work in every embedded page.) */
let toastTimer = 0;
function toast(message, kind = '') {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast ${kind}`.trim();
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 6000);
}

// ------------------------------------------------------------------ files and examples

/** Replace the scene by another one (Undo brings the old one back). */
function openScene(objects, message) {
  const hadScene = state.objects.length > 0;
  state.objects = objects;
  state.selection = [];
  state.playing = false;
  state.time = 0;
  updatePlayButtons();
  commit();
  renderInspector();
  refresh();
  if (viewport) viewport.focus(allPoints());
  toast(`${message}${hadScene ? ' Undo brings the old scene back.' : ''}`);
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
  applyExportOptions(raw.export);
  openScene(objects, `Opened "${file.name}".`);
}

function openExample(example) {
  openScene(sanitizeScene(clone(example.scene)).objects, `${example.name}: press Play.`);
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
function shapeIcon(shape) {
  const px = 88;
  const canvas = h('canvas', { width: px, height: px });
  const ctx = canvas.getContext('2d');
  const pts = shapePoints(shape.id, shape.count, defaultParams(shape.id));
  const solid = shape.group === 'solid';
  const reach = solid ? 31 : 38; // 3D shapes are drawn turned, so they need room for their corners
  const dot = pts.length > 110 ? 3 : pts.length > 60 ? 4 : 5;
  const cy = Math.cos(0.6), sy = Math.sin(0.6), cx = Math.cos(0.45), sx = Math.sin(0.45);
  ctx.fillStyle = '#e8ecf5';
  for (const [x0, y0, z0] of pts) {
    let x = x0, y = y0;
    if (solid) {
      const x1 = x0 * cy + z0 * sy;
      const z1 = -x0 * sy + z0 * cy;
      x = x1;
      y = y0 * cx - z1 * sx;
    }
    const dy = shape.id === 'dome' ? 0.35 : 0;
    ctx.fillRect(Math.round(px / 2 + x * reach - dot / 2), Math.round(px / 2 - (y - dy) * reach - dot / 2), dot, dot);
  }
  return canvas;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * The shape library: tabs, a search box and a grid of buttons. Only the shapes
 * on show are in the page; a button (and its picture) is made the first time
 * it is needed and kept.
 */
function bindShapePicker() {
  const search = $('#shape-search');
  const tabs = $('#shape-tabs');
  const grid = $('#shapes');
  const hint = $('#shape-note');
  const made = new Map();
  let tab = CATEGORIES[0].id;

  const button = (s) => {
    if (!made.has(s.id)) {
      // a soft hyphen lets "Dodecahedron" break as "Dodeca-hedron" on a narrow button
      const caption = (s.label || s.name).replace(/(\w{4})(hedron)/, '$1\u00AD$2');
      made.set(s.id, h('button', {
        title: `${s.name}: ${s.count} particles`, 'aria-label': `Add ${s.name}`, 'data-shape': s.id,
        onclick: () => addObject(s.id),
      }, shapeIcon(s), h('span', {}, caption)));
    }
    return made.get(s.id);
  };

  const show = () => {
    const typed = search.value.trim();
    const list = typed ? searchShapes(typed) : SHAPES.filter((s) => s.cat === tab);
    for (const b of tabs.children) {
      const on = !typed && b.dataset.tab === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
    grid.replaceChildren(...list.map(button));
    grid.scrollTop = 0;
    hint.hidden = !typed;
    if (typed) {
      hint.textContent = list.length
        ? `${list.length} of ${SHAPES.length} shapes. Enter adds the first one.`
        : `No shape matches \u201c${typed.slice(0, 30)}\u201d. Try a shorter word or pick a kind above.`;
    }
  };

  tabs.replaceChildren(...CATEGORIES.map((c) => {
    const size = SHAPES.filter((s) => s.cat === c.id).length;
    return h('button', {
      'data-tab': c.id, title: `${size} shapes`,
      onclick: () => { tab = c.id; search.value = ''; show(); },
    }, c.name);
  }));
  search.placeholder = `Search ${SHAPES.length} shapes`;
  search.oninput = show;
  search.onkeydown = (e) => {
    if (e.key === 'Enter') {
      const first = searchShapes(search.value)[0];
      if (first) addObject(first.id);
    } else if (e.key === 'Escape' && search.value) {
      search.value = '';
      show();
    }
  };
  show();
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
  renderTimeline();
}

function bindUi() {
  wireCategory($('#cat-add'), true);
  wireCategory($('#cat-scene'), true);
  bindShapePicker();
  const closeExamples = bindExamples();
  $('#add-point').onclick = () => addObject('point');
  $('#undo').onclick = undo;
  $('#redo').onclick = redo;
  $('#play').onclick = togglePlay;
  $('#group').onclick = () => { groupSelected(); $('#group').blur(); };
  bindTimeline();
  $('#focus').onclick = () => viewport && viewport.focus(allPoints());
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

  $('#new').onclick = () => {
    const hadScene = state.objects.length > 0;
    state.objects = [];
    state.selection = [];
    state.playing = false;
    state.time = 0;
    updatePlayButtons();
    commit();
    renderInspector();
    refresh();
    if (viewport) viewport.focus([]); // back to the opening view
    toast(hadScene ? 'New empty scene. Undo brings the old one back.' : 'The scene is already empty.');
  };
  $('#save').onclick = () => download('particle-scene.json', JSON.stringify(fileData(), null, 1), 'application/json');
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
    if ($('#export-dialog').open) return;
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
    else if (key === 'delete' || key === 'backspace') {
      if (keyPressed) {
        e.preventDefault();
        if (!deleteKeyHere()) toast('No key under the time marker. To delete the whole object, click it first.');
      } else if (state.selection.length) { e.preventDefault(); removeSelected(); }
    }
    else if (key === 'w') setMode('translate');
    else if (key === 'e') setMode('rotate');
    else if (key === 'r') setMode('scale');
    else if (key === 'f') $('#focus').click();
    else if (key === ' ') { e.preventDefault(); togglePlay(); }
    else if (key === 'k') addKeyHere();
    else if (key === 'home') rewind();
    else if (key === 'arrowleft' || key === 'arrowright') {
      e.preventDefault();
      seek(state.time + (key === 'arrowleft' ? -1 : 1) * (e.shiftKey ? 1 : 0.05), 0, true);
    } else if (key === 'escape') { if (state.playing || state.time > 0) rewind(); else select(null); }
  });
}

async function start() {
  if (!loadStored()) state.objects = starterScene();
  bindUi();
  renderList();
  renderInspector();
  history.push(snapshot());
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
  updateStats();
  // Handy in the console and for tests. After changing studio.state by hand, call studio.redraw().
  window.studio = {
    state, viewport, timeline, generateCode, select, addObject, seek, examples: EXAMPLES, openExample,
    redraw: () => { commit(); renderInspector(); refresh(); },
  };
}

start();
