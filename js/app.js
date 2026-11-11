// Bloxd Particle Studio: the user interface. Scene state lives here; the maths
// is in scene.js, the code generator in codegen.js and the 3D view in viewport.js.

import { SHAPES, SHAPE_BY_ID, shapePoints, defaultParams, MAX_COUNT } from './shapes.js';
import {
  TEXTURES, PLACEHOLDER_TEXTURES, BLEND_MODES, LIFE_PER_SECOND, createObject, sanitizeScene,
  computeParticles, objectPoints, sceneDuration, newId,
} from './scene.js';
import { generateCode, LIMITS, PRECISIONS } from './codegen.js';
import { createViewport } from './viewport.js';
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
  playTime: 0,
  sky: false,
  snap: false,
  style: { texture: 'glint', color: '#ffd24a' }, // look of the next new object
  export: { target: 'block', precision: 100, hideDist: 0, worldPos: [0, 0, 0], part: 0 },
};
let viewport = null;
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
  if (!viewport) return;
  const obj = selectedObject();
  if (!state.playing) viewport.setParticles(computeParticles(state.objects));
  viewport.setSelection(obj && !obj.hidden ? obj : null, !state.playing);
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
  copy.pos = [round(src.pos[0] + 1), src.pos[1], src.pos[2]];
  state.objects.splice(state.objects.indexOf(src) + 1, 0, copy);
  state.selected = copy.id;
  commit();
  renderInspector();
  refresh();
}

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
      h('p', { class: 'note' }, 'Keys: W move, E rotate, R resize, Ctrl+D duplicate, Delete, Ctrl+Z undo, F center, Space play.'),
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

  // place
  const place = h('div', { class: 'group' }, h('h2', {}, 'Place'),
    row('Position', xyz((o) => o.pos, (o, i, v) => { o.pos[i] = v; }, 0.25, 'Position')),
    h('p', { class: 'note' }, 'Blocks from the corner of the code block. Y is up.'),
    isShape ? row('Rotation', xyz((o) => o.rot, (o, i, v) => { o.rot[i] = v; }, 15, 'Rotation')) : null,
    isShape ? row('Scale', sliderPair({
      get: (o) => Math.max(...o.scale.map(Math.abs)),
      set: (o, v) => {
        const now = Math.max(...o.scale.map(Math.abs));
        o.scale = now > 0 ? o.scale.map((s) => round((s / now) * v, 4)) : [v, v, v];
      },
      min: 0.1, max: 6, step: 0.05, numMax: 100, label: 'Scale',
    })) : null,
    isShape ? row('Stretch', xyz((o) => o.scale, (o, i, v) => { o.scale[i] = v; }, 0.1, 'Scale')) : null,
    isShape ? h('div', { class: 'buttons' },
      h('button', { onclick: () => { edit((o) => { o.rot = [90, 0, 0]; }); commit(); } }, 'Lay flat'),
      h('button', { onclick: () => { edit((o) => { o.rot = [0, 0, 0]; }); commit(); } }, 'Stand up'),
      h('button', { onclick: () => { edit((o) => { o.rot = [0, 0, 0]; o.scale = [1, 1, 1]; }); commit(); } }, 'Reset')) : null);

  // life + look
  const lifeNote = h('p', { class: 'note' });
  fields.push({
    sync: () => {
      const o = selectedObject();
      if (o) lifeNote.textContent = `Stays about ${round(o.life / LIFE_PER_SECOND, 1)} seconds in the game.`;
    },
  });
  const blend = h('select', {
    'aria-label': 'Blend mode',
    onchange: () => { edit((o) => { o.blend = Number(blend.value); }); commit(); },
  }, BLEND_MODES.map((b) => h('option', { value: b.id }, `${b.name} (${b.id})`)));
  fields.push({ sync: () => { const o = selectedObject(); if (o) blend.value = String(o.blend); } });
  const life = h('div', { class: 'group' }, h('h2', {}, 'Life'),
    row('Lifetime', numberInput({ get: (o) => o.life, set: (o, v) => { o.life = v; }, min: 0.05, max: 1000, step: 0.5, label: 'Lifetime' })),
    lifeNote,
    row('Ending', checkbox('fade out', (o) => o.fade, (o, on) => { o.fade = on; })),
    row('Blend', blend));

  // motion
  const motion = h('div', { class: 'group' }, h('h2', {}, 'Motion'),
    row('Move', xyz((o) => o.move, (o, i, v) => { o.move[i] = v; }, 0.25, 'Move')),
    row('Scatter', numberInput({ get: (o) => o.spread, set: (o, v) => { o.spread = v; }, min: 0, max: 100, step: 0.1, label: 'Scatter', title: 'Random extra speed in every direction' })),
    isShape ? row('Grow', numberInput({ get: (o) => o.expand, set: (o, v) => { o.expand = v; }, min: -100, max: 100, step: 0.1, label: 'Grow', title: 'Particles fly away from the middle of the shape (negative: towards it)' })) : null,
    row('Gravity', numberInput({ get: (o) => o.gravity, set: (o, v) => { o.gravity = v; }, min: -500, max: 500, step: 0.5, label: 'Gravity', title: 'Negative falls, positive floats up' })),
    h('p', { class: 'note' }, 'All 0 = the particles stand still. Press Play to see the motion.'));

  panel.replaceChildren(head, texture, colour, particles, place, life, motion);
  syncInspector();
}

// ------------------------------------------------------------------ play

function stopPlaying() {
  if (!state.playing) return;
  state.playing = false;
  $('#play').textContent = 'Play';
  $('#play').classList.remove('on');
  $('#playing').hidden = true;
  refresh();
}

function togglePlay() {
  if (state.playing) return stopPlaying();
  if (!state.objects.some((o) => !o.hidden)) return undefined;
  state.playing = true;
  state.playTime = 0;
  $('#play').textContent = 'Stop';
  $('#play').classList.add('on');
  $('#playing').hidden = false;
  refresh();
  return undefined;
}

function onFrame(dt) {
  if (!state.playing) return;
  state.playTime += dt;
  const total = sceneDuration(state.objects);
  if (state.playTime > total + 0.4) return stopPlaying();
  viewport.setParticles(computeParticles(state.objects, state.playTime));
  $('#playing').textContent = `Playing ${Math.min(state.playTime, total).toFixed(1)} / ${total.toFixed(1)} s`;
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
  stopPlaying();
  commit();
  renderInspector();
  refresh();
  if (viewport) viewport.focus(state.objects.filter((o) => !o.hidden).flatMap(objectPoints));
  toast(`Opened "${file.name}".${hadScene ? ' Undo brings the old scene back.' : ''}`);
}

// ------------------------------------------------------------------ start

function shapeIcon(shape) {
  const px = 80;
  const canvas = h('canvas', { width: px, height: px });
  const ctx = canvas.getContext('2d');
  const pts = shapePoints(shape.id, Math.min(shape.count, 60), defaultParams(shape.id));
  const cy = Math.cos(0.6), sy = Math.sin(0.6), cx = Math.cos(0.45), sx = Math.sin(0.45);
  ctx.fillStyle = '#e8ecf5';
  for (const [x0, y0, z0] of pts) {
    let x = x0, y = y0;
    if (shape.group === 'solid') {
      const x1 = x0 * cy + z0 * sy;
      const z1 = -x0 * sy + z0 * cy;
      x = x1;
      y = y0 * cx - z1 * sx;
    }
    const dy = shape.id === 'dome' ? 0.35 : 0;
    ctx.fillRect(px / 2 + x * 29 - 2.5, px / 2 - (y - dy) * 29 - 2.5, 5, 5);
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

function bindUi() {
  $('#shapes').replaceChildren(...SHAPES.map((s) => h('button', {
    title: `Add a ${s.name.toLowerCase()} made of ${s.count} particles`, 'data-shape': s.id,
    onclick: () => addObject(s.id),
  }, shapeIcon(s), s.name)));
  $('#add-point').onclick = () => addObject('point');
  $('#undo').onclick = undo;
  $('#redo').onclick = redo;
  $('#play').onclick = togglePlay;
  $('#focus').onclick = () => viewport && viewport.focus(state.objects.filter((o) => !o.hidden).flatMap(objectPoints));
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
    stopPlaying();
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
    else if (key === 'delete' || key === 'backspace') { if (state.selected) { e.preventDefault(); removeObject(state.selected); } }
    else if (key === 'w') setMode('translate');
    else if (key === 'e') setMode('rotate');
    else if (key === 'r') setMode('scale');
    else if (key === 'f') $('#focus').click();
    else if (key === ' ') { e.preventDefault(); togglePlay(); }
    else if (key === 'escape') { if (state.playing) stopPlaying(); else select(null); }
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
      onTransform: (t) => edit((o) => {
        o.pos = t.pos.map((v) => round(Math.min(500, Math.max(-500, v))));
        if (o.shape !== 'point') {
          o.rot = t.rot.map((v) => round(v, 2) + 0); // + 0 turns -0 into 0
          o.scale = t.scale.map((v) => round(Math.min(100, Math.max(-100, v))));
        }
      }),
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
    state, viewport, generateCode, select, addObject,
    redraw: () => { commit(); renderInspector(); refresh(); },
  };
}

start();
