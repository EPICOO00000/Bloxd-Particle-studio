// Bloxd Particle Studio: the user interface. Scene state lives here; the maths
// is in scene.js, the code generator in codegen.js and the 3D view in viewport.js.

import { SHAPES, SHAPE_BY_ID, CATEGORIES, shapePoints, defaultParams, searchShapes, MAX_COUNT } from './shapes.js';
import {
  TEXTURES, PLACEHOLDER_TEXTURES, BLEND_MODES, LIFE_PER_SECOND, createObject, sanitizeScene,
  computeParticles, posedPoints, sceneDuration, newId, poseAtTime,
} from './scene.js';
import { spanOf, poseAt, markAt, planOf, EASES, MAX_KEYS, MIN_KEY_GAP, MAX_START } from './motion.js';
import { generateCode, LIMITS, PRECISIONS } from './codegen.js';
import { createViewport } from './viewport.js';
import { createTimeline } from './timeline.js';
import { assetUrl } from './assets.js';

const STORE = 'bloxd-particle-studio.v1';
const MANY_PARTICLES = 600; // above this one click may lag slower devices
const PALETTE = [
  '#ffffff', '#c9d1e3', '#7d879c', '#1d2233', '#ff4d4d', '#ff8a3d', '#ffd24a', '#b6f24a', '#4ddb6a', '#2fd6b5',
  '#47c8ff', '#4f8dff', '#7a5cff', '#c05cff', '#ff5cc8', '#ff4d7a', '#8b5a2b', '#f5c9a0', '#6b2d2d', '#0b3d2e',
];

const $ = (sel) => document.querySelector(sel);

/** Tiny DOM builder: h('div', { class: 'row' }, child, 'text') */
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

const clone = (v) => JSON.parse(JSON.stringify(v));
const round = (v, digits = 3) => Number(Number(v).toFixed(digits));

// ------------------------------------------------------------------ state

const state = {
  objects: [],
  selected: null,
  mode: 'translate',
  playing: false,
  time: 0, // the time marker of the timeline, in seconds after the click
  ease: 'smooth', // how a new key is reached
  loop: false, // Play starts again at the end
  sky: false,
  snap: false,
  style: { texture: 'glint', color: '#ffd24a' }, // look of the next new object
  export: { target: 'block', precision: 100, hideDist: 0, worldPos: [0, 0, 0], part: 0 },
};
let viewport = null;
let timeline = null;
let keyPressed = false; // the last press was on a key of the timeline: Delete then removes that key, never the object
const images = {};
const history = [];
const future = [];

const selectedObject = () => state.objects.find((o) => o.id === state.selected) || null;

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

/** Call after a finished change: remembers it for undo and saves. */
function commit() {
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
  state.objects = sanitizeScene({ objects: JSON.parse(json) }).objects;
  if (!selectedObject()) state.selected = null;
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

// ------------------------------------------------------------------ drawing

let statsTimer = 0;

function refresh() {
  renderTimeline();
  if (!viewport) return;
  const obj = selectedObject();
  // Not playing, time marker at the start: everything where it starts, fully
  // visible, to build with. Anywhere else: that moment, with the objects that
  // are not there then drawn see-through so they can still be picked.
  if (!state.playing) viewport.setParticles(computeParticles(state.objects, state.time > 0 ? state.time : null, { ghosts: true }));
  // the gizmo sits where the object is at that moment
  viewport.setSelection(obj && !obj.hidden ? { id: obj.id, shape: obj.shape, ...poseNow(obj) } : null, !state.playing);
  clearTimeout(statsTimer);
  statsTimer = setTimeout(updateStats, 120);
}

/** Particle count and how many code blocks the scene needs. */
function updateStats() {
  const result = generateCode(state.objects, state.export);
  const pill = $('#count');
  const blocks = result.parts.length;
  const split = state.export.target === 'block' && blocks > 1;
  pill.textContent = `${result.particles.toLocaleString('en')} particle${result.particles === 1 ? '' : 's'}${split ? ` · ${blocks} code blocks` : ''}`;
  pill.className = `pill${result.particles > MANY_PARTICLES || split ? ' warn' : ''}`;
  pill.title = `${result.parts[0].chars.toLocaleString('en')} of ${LIMITS.chars.toLocaleString('en')} characters in the first code block`;
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

function renderList() {
  const list = $('#objects');
  list.replaceChildren(...state.objects.map((o) => h('li', {
    class: `${o.id === state.selected ? 'selected' : ''} ${o.hidden ? 'hidden' : ''}`,
    'data-id': o.id,
    onclick: () => select(o.id),
  },
  tinted(o.texture, o.color, 40),
  h('span', { class: 'name' }, o.name),
  h('span', { class: 'n' }, String(o.shape === 'point' ? 1 : shapePoints(o.shape, o.count, o.params).length)),
  h('button', {
    title: o.hidden ? 'Show' : 'Hide', 'aria-label': o.hidden ? 'Show' : 'Hide',
    onclick: (e) => { e.stopPropagation(); o.hidden = !o.hidden; commit(); renderInspector(); refresh(); },
  }, o.hidden ? 'show' : 'hide'),
  h('button', {
    title: 'Delete', 'aria-label': 'Delete', class: 'danger',
    onclick: (e) => { e.stopPropagation(); removeObject(o.id); },
  }, '×'))));
  $('#empty').hidden = state.objects.length > 0;
}

// ------------------------------------------------------------------ scene edits

function select(id) {
  if (state.selected === id) return;
  state.selected = id;
  renderList();
  renderInspector();
  refresh();
}

function uniqueName(base) {
  const names = new Set(state.objects.map((o) => o.name));
  if (!names.has(base)) return base;
  for (let i = 2; ; i++) if (!names.has(`${base} ${i}`)) return `${base} ${i}`;
}

function addObject(shape) {
  stopPlaying();
  const pos = shape === 'point' ? [0.5, 1.5, 0.5] : [0.5, 2.5, 0.5];
  const taken = () => state.objects.some((o) => o.pos.every((v, i) => Math.abs(v - pos[i]) < 1e-6));
  while (taken()) pos[0] += shape === 'point' ? 0.5 : 2.5; // never hide a new object inside an old one
  const obj = createObject(shape, { pos, texture: state.style.texture, color: state.style.color });
  obj.name = uniqueName(obj.name);
  if (state.time > spanOf(obj).end) state.time = 0; // at the time marker it would be gone already
  state.objects.push(obj);
  state.selected = obj.id;
  commit();
  renderInspector();
  refresh();
}

function removeObject(id) {
  state.objects = state.objects.filter((o) => o.id !== id);
  if (state.selected === id) state.selected = null;
  commit();
  renderInspector();
  refresh();
}

function duplicateObject() {
  const src = selectedObject();
  if (!src) return;
  const copy = clone(src);
  copy.id = newId();
  copy.name = uniqueName(src.name);
  for (const place of [copy, ...copy.keys]) place.pos = [round(place.pos[0] + 1), place.pos[1], place.pos[2]];
  state.objects.splice(state.objects.indexOf(src) + 1, 0, copy);
  state.selected = copy.id;
  commit();
  renderInspector();
  refresh();
}

/** Every place a particle is put: the objects where they start and at each of their keys. */
const allPoints = () => state.objects.filter((o) => !o.hidden).flatMap((o) => [o, ...o.keys].flatMap((pose) => posedPoints(o, pose)));

/** Live edit of the selected object (sliders, typing, gizmo). */
function edit(change) {
  const obj = selectedObject();
  if (!obj) return;
  change(obj);
  refresh();
  syncInspector();
}

// ------------------------------------------------------------------ inspector

let fields = []; // [{ sync() }] refreshed after every edit

function syncInspector() {
  for (const f of fields) f.sync();
}

/** Number box bound to the selected object. */
function numberInput({ get, set, min, max, step = 0.1, digits = 3, title, label }) {
  const el = h('input', {
    type: 'number', step, min, max, title, 'aria-label': label,
    oninput: () => {
      const v = Number(el.value);
      if (el.value === '' || !Number.isFinite(v)) return;
      edit((o) => set(o, Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))));
    },
    onchange: () => { syncInspector(); commit(); },
  });
  selectOnEntry(el);
  fields.push({ sync: () => { const o = selectedObject(); if (o && document.activeElement !== el) el.value = round(get(o), digits); } });
  return el;
}

/**
 * Clicking or tabbing into a box selects the old value, so typing replaces it.
 * A second click places the cursor as usual, and so does dragging over part of
 * the text. No timers: the value is selected when the mouse button comes up.
 */
function selectOnEntry(el) {
  let pressedAt = null; // where the press that brought the box into focus started
  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || document.activeElement === el) { pressedAt = null; return; }
    pressedAt = [e.clientX, e.clientY];
    window.addEventListener('mouseup', (up) => {
      const start = pressedAt;
      pressedAt = null;
      if (!start || document.activeElement !== el) return;
      if (Math.hypot(up.clientX - start[0], up.clientY - start[1]) < 4) el.select();
    }, { once: true });
  });
  el.addEventListener('focus', () => { if (!pressedAt) el.select(); });
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

function renderInspector() {
  fields = [];
  const panel = $('#inspector');
  const obj = selectedObject();
  if (!obj) {
    panel.replaceChildren(
      h('h2', {}, 'How it works'),
      h('ol', { class: 'steps' },
        h('li', {}, h('b', {}, 'Add'), ' a particle or a shape on the left.'),
        h('li', {}, h('b', {}, 'Click'), ' it in the 3D view and drag the arrows to move it. Pick a texture and a colour here.'),
        h('li', {}, h('b', {}, 'Export code'), ', paste it into a code block in Bloxd and click the block.')),
      h('p', { class: 'note' }, 'The crate in the middle is your code block. Everything appears in the game exactly where you see it around the block. One grid square is one block.'),
      h('p', { class: 'note' }, 'The X, Y and Z lines point the same way as the X, Y and Z of the coordinates in the game. Y is up.'),
      h('p', { class: 'note' }, 'The timeline at the bottom is for timing. Drag the bar of an object to make it appear later. To make it move: click the object, click on the row of numbers at a later time, press Add key and move the object.'),
      h('p', { class: 'note' }, 'Keyboard: W move, E rotate, R resize, Ctrl+D duplicate, Delete, Ctrl+Z undo, F center, Space play, K add key, Esc back to the start.'),
    );
    return;
  }
  const isShape = obj.shape !== 'point';
  const def = SHAPE_BY_ID[obj.shape];

  // name + actions
  const name = h('input', {
    type: 'text', maxLength: 40, 'aria-label': 'Name', value: obj.name,
    oninput: () => { obj.name = name.value.trim() || (def ? def.name : 'Particle'); },
    onchange: commit,
  });
  selectOnEntry(name);
  const head = h('div', { class: 'group' },
    h('h2', {}, isShape ? `${def.name} shape` : 'Single particle'),
    row('Name', name),
    h('div', { class: 'buttons' },
      h('button', { onclick: duplicateObject, title: 'Ctrl+D' }, 'Duplicate'),
      h('button', { onclick: () => { obj.hidden = !obj.hidden; commit(); renderInspector(); refresh(); } }, obj.hidden ? 'Show' : 'Hide'),
      h('button', { class: 'danger', onclick: () => removeObject(obj.id), title: 'Delete' }, 'Delete')));

  // texture
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
  const texture = h('div', { class: 'group' }, h('h2', {}, 'Texture'), h('div', { class: 'tex-grid' }, texButtons),
    h('p', { class: 'tex-name' }, texName, h('span', { class: 'note' }, texNote)));

  // colour
  const setColor = (o, v) => { o.color = v; state.style.color = v; };
  const colour = h('div', { class: 'group' }, h('h2', {}, 'Colour'),
    row('Colour', colorControl((o) => o.color, setColor, 'Colour')),
    h('div', { class: 'swatches' }, PALETTE.map((c) => h('button', {
      style: `background:${c}`, title: c, 'aria-label': `Colour ${c}`,
      onclick: () => { edit((o) => setColor(o, c)); commit(); },
    }))),
    h('div', { class: 'row' }, h('span', { class: 'l' }, 'Mix with'),
      h('div', { class: 'inline' },
        checkbox('second colour', (o) => o.color2 !== null, (o, on) => { o.color2 = on ? '#ffffff' : null; }),
        obj.color2 !== null ? colorControl((o) => o.color2 || '#ffffff', (o, v) => { o.color2 = v; }, 'Second colour') : null)),
    obj.color2 !== null ? h('p', { class: 'note' }, 'Each particle gets a random colour between the two.') : null);

  // particles
  const countNote = h('p', { class: 'note' });
  fields.push({
    sync: () => {
      const o = selectedObject();
      if (o && isShape) {
        const n = shapePoints(o.shape, o.count, o.params).length;
        countNote.textContent = n === o.count ? '' : `This shape uses ${n} particles.`;
      }
    },
  });
  const particles = h('div', { class: 'group' }, h('h2', {}, 'Particles'),
    row('Size', sliderPair({ get: (o) => o.size, set: (o, v) => { o.size = v; if (o.size2 !== null) o.size2 = Math.max(o.size2, v); }, min: 0.05, max: 2, step: 0.05, numMax: 50, label: 'Particle size' })),
    h('div', { class: 'row' }, h('span', { class: 'l' }, 'Random'),
      h('div', { class: 'inline' },
        checkbox('sizes up to', (o) => o.size2 !== null, (o, on) => { o.size2 = on ? round(o.size * 2, 2) : null; }),
        obj.size2 !== null ? numberInput({ get: (o) => o.size2 ?? o.size, set: (o, v) => { o.size2 = v; }, min: 0.01, max: 50, step: 0.05, label: 'Largest size' }) : null)),
    isShape ? row('How many', sliderPair({ get: (o) => o.count, set: (o, v) => { o.count = Math.round(v); }, min: def.min, max: 300, step: 1, numMax: MAX_COUNT, label: 'Particle count' })) : null,
    isShape ? countNote : null,
    isShape ? (def.params || []).map((p) => row(p.label, sliderPair({
      get: (o) => o.params[p.key] ?? p.default, set: (o, v) => { o.params[p.key] = v; }, min: p.min, max: p.max, step: p.step, label: p.label,
    }))) : null);

  // place: shown and changed at the time marker (the object itself, or the key there)
  const placeNote = h('p', { class: 'note' });
  fields.push({
    sync: () => {
      const o = selectedObject();
      if (!o) return;
      placeNote.textContent = placeHint(o);
      placeNote.hidden = !o.keys.length;
    },
  });
  const place = h('div', { class: 'group' }, h('h2', {}, 'Place'),
    row('Position', xyz((o) => poseNow(o).pos, (o, i, v) => setPose(o, (k) => { k.pos[i] = v; }), 0.25, 'Position')),
    h('p', { class: 'note' }, 'Blocks from the corner of the code block. Y is up.'),
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
      h('button', { onclick: () => { edit((o) => setPose(o, (k) => { k.rot = [90, 0, 0]; })); commit(); } }, 'Lay flat'),
      h('button', { onclick: () => { edit((o) => setPose(o, (k) => { k.rot = [0, 0, 0]; })); commit(); } }, 'Stand up'),
      h('button', { onclick: () => { edit((o) => setPose(o, (k) => { k.rot = [0, 0, 0]; k.scale = [1, 1, 1]; })); commit(); } }, 'Reset')) : null,
    placeNote);

  // life + look
  const lifeNote = h('p', { class: 'note' });
  fields.push({
    sync: () => {
      const o = selectedObject();
      if (!o) return;
      const { start, end } = spanOf(o);
      const byKeys = o.keys.length && o.keys[o.keys.length - 1].t > o.life / LIFE_PER_SECOND;
      lifeNote.textContent = `Stays about ${round(end - start, 1)} seconds in the game${byKeys ? ': until its last key' : ''}.`;
    },
  });
  const blend = h('select', {
    'aria-label': 'Blend mode',
    onchange: () => { edit((o) => { o.blend = Number(blend.value); }); commit(); },
  }, BLEND_MODES.map((b) => h('option', { value: b.id }, `${b.name} (${b.id})`)));
  fields.push({ sync: () => { const o = selectedObject(); if (o) blend.value = String(o.blend); } });
  const life = h('div', { class: 'group' }, h('h2', {}, 'Life'),
    row('Appears', h('div', { class: 'seconds' },
      numberInput({ get: (o) => o.start, set: (o, v) => { o.start = round(v, 3); }, min: 0, max: MAX_START, step: 0.1, label: 'Appears after seconds', title: 'How long after the click on the code block it appears. The same as dragging its bar on the timeline.' }),
      h('span', { class: 'note' }, 'seconds after the click'))),
    row('Lifetime', numberInput({ get: (o) => o.life, set: (o, v) => { o.life = v; }, min: 0.05, max: 1000, step: 0.5, label: 'Lifetime' })),
    lifeNote,
    row('Beginning', checkbox('fade in', (o) => o.fadeIn, (o, on) => { o.fadeIn = on; })),
    row('Ending', checkbox('fade out', (o) => o.fade, (o, on) => { o.fade = on; })),
    row('Blend', blend));

  // keys: made on the timeline; here is what they cost and how the object turns
  const keysNote = h('p', { class: 'note' });
  const clearKeys = h('button', {
    class: 'danger',
    onclick: () => { edit((o) => { o.keys = []; }); commit(); },
  }, 'Remove all keys');
  const turnNote = h('p', { class: 'note' });
  fields.push({
    sync: () => {
      const o = selectedObject();
      if (!o) return;
      clearKeys.disabled = !o.keys.length;
      keysNote.textContent = keysHint(o);
      turnNote.textContent = o.spin
        ? 'It turns from the Rotation numbers of one key to those of the next. For a full turn, type 360 in a key.'
        : 'It turns the short way round to the next key. Tick this to make full turns.';
    },
  });
  const keys = h('div', { class: 'group' }, h('h2', {}, 'Keys'),
    keysNote,
    isShape ? row('Turning', checkbox('by the angles as typed', (o) => o.spin, (o, on) => { o.spin = on; })) : null,
    isShape ? turnNote : null,
    h('div', { class: 'buttons' }, clearKeys));

  // motion
  const motion = h('div', { class: 'group' }, h('h2', {}, 'Motion'),
    row('Move', xyz((o) => o.move, (o, i, v) => { o.move[i] = v; }, 0.25, 'Move')),
    row('Scatter', numberInput({ get: (o) => o.spread, set: (o, v) => { o.spread = v; }, min: 0, max: 100, step: 0.1, label: 'Scatter', title: 'Random extra speed in every direction' })),
    isShape ? row('Grow', numberInput({ get: (o) => o.expand, set: (o, v) => { o.expand = v; }, min: -100, max: 100, step: 0.1, label: 'Grow', title: 'Particles fly away from the middle of the shape (negative: towards it)' })) : null,
    row('Gravity', numberInput({ get: (o) => o.gravity, set: (o, v) => { o.gravity = v; }, min: -500, max: 500, step: 0.5, label: 'Gravity', title: 'Negative falls, positive floats up' })),
    h('p', { class: 'note' }, 'All 0 = the particles stand still. Press Play to see the motion. With keys, this motion starts after the last key.'));

  panel.replaceChildren(head, texture, colour, particles, place, life, keys, motion);
  syncInspector();
}

// ------------------------------------------------------------------ time

const duration = () => sceneDuration(state.objects);

/** Where an object is at the time marker: { pos, rot, scale }. */
const poseNow = (obj) => poseAtTime(obj, state.time);

/** What the time marker points at for an object, and so what a change of its place changes (see markAt). */
const markOf = (obj) => markAt(obj, state.time);

/** A new key `t` seconds after the object appears, with the place the object has at that time anyway. */
function insertKey(obj, t) {
  const pose = poseAt(obj, t);
  const key = {
    t: round(t, 3), pos: pose.pos.map((v) => round(v)), rot: pose.rot.map((v) => round(v, 2) + 0),
    scale: pose.scale.map((v) => round(v, 4)), ease: state.ease,
  };
  obj.keys.push(key);
  obj.keys.sort((x, y) => x.t - y.t);
  return key;
}

/** Change the place of an object at the time marker: see markOf() for what that changes. */
function setPose(obj, change) {
  const mark = markOf(obj);
  const { start } = spanOf(obj);
  if (mark.at === 'full') {
    toast(`${obj.name} has ${MAX_KEYS} keys, the most an object can have. Go to one of them to change it.`, 'warn');
    return;
  }
  if (mark.at === 'object') change(obj);
  else if (mark.at === 'start') {
    if (state.time > start) state.time = start; // a moment after the start: too close for a key of its own
    change(obj);
  } else if (mark.at === 'between') change(insertKey(obj, state.time - start));
  else {
    if (mark.at === 'key') state.time = round(start + obj.keys[mark.index].t, 3);
    change(obj.keys[mark.index]);
  }
}

/** The same in words, for the timeline and the Place settings. */
function placeHint(obj) {
  const mark = markOf(obj);
  const { start } = spanOf(obj);
  const of = `${obj.keys.length}`;
  switch (mark.at) {
    case 'object': return '';
    case 'start': return state.time < start ? 'It is not there yet at this time. This is where it starts.' : 'This is where it starts.';
    case 'key': return `This is key ${mark.index + 1} of ${of}.`;
    case 'last': return `It is gone at this time. This is where it was last, key ${mark.index + 1} of ${of}.`;
    case 'between': return 'Between keys: moving it now makes a new key here.';
    default: return `Between keys. It has ${MAX_KEYS} keys, the most an object can have: go to one of them to change it.`;
  }
}

/** What the keys of an object cost in the game, in words. */
function keysHint(obj) {
  if (!obj.keys.length) return 'No keys: it stays in one place. To make it move, put the time marker of the timeline at a later moment, press Add key and move it.';
  const points = obj.shape === 'point' ? 1 : shapePoints(obj.shape, obj.count, obj.params).length;
  const plan = planOf(obj);
  const n = (points * plan.pieces.length).toLocaleString('en');
  const cost = `${obj.keys.length} key${obj.keys.length === 1 ? '' : 's'}. The game cannot move a particle around a corner, so every stretch of the way gets particles of its own: ${n} for this object.`;
  if (plan.rough === 'quick') return `${cost} One of its turns is too quick: the shape will cut corners. Give that turn more time.`;
  if (plan.rough === 'big') return `${cost} One of its turns is too big: the shape will cut corners. Add a key halfway.`;
  return cost;
}

/** Put the time marker somewhere. `tolerance`: seconds within which it sticks to a key, a start or an end. */
function seek(time, tolerance = 0, exact = false) {
  if (state.playing) pause();
  const t = Math.max(0, Math.min(Number(time) || 0, MAX_START + 6000));
  const marks = [0, duration()];
  const obj = selectedObject();
  if (obj) {
    const { start, end } = spanOf(obj);
    marks.push(start, end, ...obj.keys.map((k) => start + k.t));
  }
  const hit = marks.filter((m) => Math.abs(m - t) <= tolerance + 1e-9).sort((x, y) => Math.abs(x - t) - Math.abs(y - t))[0];
  state.time = round(hit !== undefined ? hit : exact ? t : Math.round(t / 0.05) * 0.05, 3);
  refresh();
  syncInspector();
}

/** Why no key can be added at the time marker, or '' when one can. */
function noKeyReason(obj) {
  if (!obj) return 'Select an object first: a key belongs to one object.';
  const { start } = spanOf(obj);
  if (state.time < start) return `${obj.name} is not there yet at this time. Move the time marker to the right.`;
  if (state.time - start < MIN_KEY_GAP - 1e-9) return 'This is where it starts. Move the time marker to the right, to the moment it should be somewhere else.';
  // an object without keys can get its first one anywhere after its start, also after it is gone
  const mark = obj.keys.length ? markOf(obj) : { at: 'between' };
  if (mark.at === 'start') return 'This is where it starts. Move the time marker to the right, to the moment it should be somewhere else.';
  if (mark.at === 'key') return 'There is already a key here. Just move the object.';
  if (obj.keys.length >= MAX_KEYS) return `An object can have ${MAX_KEYS} keys at most.`;
  return '';
}

function addKeyHere() {
  const obj = selectedObject();
  const reason = noKeyReason(obj);
  if (reason) return toast(reason);
  if (state.playing) pause();
  insertKey(obj, state.time - spanOf(obj).start);
  commit();
  refresh();
  syncInspector();
  return toast(`Key added at ${round(state.time, 2)} s. Now move, turn or resize ${obj.name}: that is where it will be at that time.`);
}

/** Remove the key under the time marker. Returns false when there is none. */
function deleteKeyHere() {
  const obj = selectedObject();
  const mark = obj ? markOf(obj) : null;
  if (!mark || mark.at !== 'key') return false;
  obj.keys.splice(mark.index, 1);
  commit();
  refresh();
  syncInspector();
  return true;
}

function renderTimeline() {
  if (!timeline) return;
  timeline.render({ objects: state.objects, selected: state.selected, time: state.time, duration: duration() });
  updateTimeBar();
}

/** The controls above the timeline rows, and the label over the 3D view. */
function updateTimeBar() {
  const total = duration();
  const at = $('#tl-at');
  if (document.activeElement !== at) at.value = round(state.time, 2);
  $('#tl-total').textContent = `/ ${round(total, 1)} s`;
  const obj = selectedObject();
  const mark = obj ? markOf(obj) : null;
  const onKey = !!mark && mark.at === 'key';
  const reason = noKeyReason(obj);
  $('#tl-key').disabled = !!reason;
  $('#tl-key').title = reason || 'Remember where the selected object is at this time (K)';
  $('#tl-del').disabled = !onKey;
  const ease = $('#tl-ease');
  if (document.activeElement !== ease) ease.value = onKey ? obj.keys[mark.index].ease : state.ease;
  let hint = 'Drag a bar to change when an object appears. Click an object to make it move.';
  if (obj && obj.keys.length) hint = `${obj.name}: ${placeHint(obj)}`;
  else if (obj && !reason) hint = `Press Add key, then move ${obj.name}: that is where it will be at ${round(state.time, 2)} s.`;
  else if (obj) hint = `To make ${obj.name} move: click a later time on the numbers, press Add key, move it.`;
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
  if (!state.objects.some((o) => !o.hidden)) return undefined;
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
    say(`${result.particles.toLocaleString('en')} particle${result.particles === 1 ? '' : 's'}. They stay about ${round(result.seconds, 1)} seconds${world ? ', then they are drawn again' : ' after each click'}.`);
    if (result.particles > MANY_PARTICLES) say('That is a lot of particles at once and can lag slower devices. Bigger particles with a smaller "How many" look much the same.', 'warn');
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
  toastTimer = setTimeout(() => { el.hidden = true; }, 5000);
}

// ------------------------------------------------------------------ files

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
  const hadScene = state.objects.length > 0;
  state.objects = objects;
  applyExportOptions(raw.export);
  state.selected = null;
  state.playing = false;
  state.time = 0;
  updatePlayButtons();
  commit();
  renderInspector();
  refresh();
  if (viewport) viewport.focus(allPoints());
  toast(`Opened "${file.name}".${hadScene ? ' Undo brings the old scene back.' : ''}`);
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
  const note = $('#shape-note');
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
    note.hidden = !typed;
    if (typed) {
      note.textContent = list.length
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
  const byId = (id) => state.objects.find((o) => o.id === id);
  const changed = (done) => {
    if (done) commit();
    refresh();
    syncInspector();
  };
  timeline = createTimeline($('#timeline'), {
    seek,
    select,
    start: (id, seconds, done) => {
      const o = byId(id);
      if (!o) return;
      if (!done) o.start = round(Math.min(MAX_START, Math.max(0, seconds)), 3);
      changed(done);
    },
    end: (id, seconds, done) => {
      const o = byId(id);
      if (!o) return;
      if (!done) o.life = Math.min(1000, Math.max(0.05, round((seconds - o.start) * LIFE_PER_SECOND, 3)));
      changed(done);
    },
    key: (id, index, seconds, done) => {
      const o = byId(id);
      if (!o || !o.keys[index]) return;
      if (!done) {
        // stays between its neighbours
        const lo = (index ? o.keys[index - 1].t : 0) + MIN_KEY_GAP;
        const hi = index < o.keys.length - 1 ? o.keys[index + 1].t - MIN_KEY_GAP : 6000;
        o.keys[index].t = round(Math.min(hi, Math.max(lo, seconds - o.start)), 3);
        state.time = round(o.start + o.keys[index].t, 3);
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
    const obj = selectedObject();
    const mark = obj ? markOf(obj) : null;
    if (mark && mark.at === 'key') {
      obj.keys[mark.index].ease = ease.value;
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
  bindShapePicker();
  $('#add-point').onclick = () => addObject('point');
  $('#undo').onclick = undo;
  $('#redo').onclick = redo;
  $('#play').onclick = togglePlay;
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
    if (viewport) viewport.setMode(mode);
  };
  for (const b of document.querySelectorAll('#modes button')) b.onclick = () => setMode(b.dataset.mode);
  setMode(state.mode);

  $('#new').onclick = () => {
    const hadScene = state.objects.length > 0;
    state.objects = [];
    state.selected = null;
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
    if (t instanceof HTMLElement) {
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; // typing
      if (t.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return; // pressing the button
    }
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if (mod && key === 'y') { e.preventDefault(); redo(); }
    else if (mod && key === 'd') { e.preventDefault(); duplicateObject(); }
    else if (mod || e.altKey) return;
    else if (key === 'delete' || key === 'backspace') {
      if (keyPressed) {
        e.preventDefault();
        if (!deleteKeyHere()) toast('No key under the time marker. To delete the whole object, click it first.');
      } else if (state.selected) { e.preventDefault(); removeObject(state.selected); }
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
      onPick: (id) => { if (!state.playing) select(id); },
      // Only what the drag changes is written. (The angles the gizmo reports are
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
  viewport.setMode(state.mode);
  refresh();
  updateStats();
  // Handy in the console and for tests. After changing studio.state by hand, call studio.redraw().
  window.studio = {
    state, viewport, timeline, generateCode, select, addObject, seek,
    redraw: () => { commit(); renderInspector(); refresh(); },
  };
}

start();
