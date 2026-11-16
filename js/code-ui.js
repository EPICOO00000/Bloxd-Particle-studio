// The Code window: a picture of nodes joined by Run wires (what they mean and
// the World Code they make: js/nodes.js), a box for code of your own, and the
// World Code that comes out. This file is only the page: drawing the cards and
// the wires, dragging, the list of nodes to add.

import { $, h } from './ui.js';
import {
  CATS, NODE_TYPES, NODE_BY_ID, NODE_EXAMPLES, MAX_NODES, WORLD_CHARS, outsOf, createNode, defaultValues, exampleGraph, worldCode, sanitizeGraph,
} from './nodes.js';

const CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c]));
/** A little sign for every kind of node, drawn in its heading (16 by 16, lines only). */
const ICONS = {
  event: 'M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z',
  loop: 'M3 8a5 5 0 0 1 8.6-3.5M13 8a5 5 0 0 1-8.6 3.5M11.8 1.8v3h-3M4.2 14.2v-3h3',
  logic: 'M8 1.8 14.2 8 8 14.2 1.8 8zM8 5.2v3.4M8 10.6v.2',
  particles: 'M8 1.5v4M8 10.5v4M1.5 8h4M10.5 8h4M3.6 3.6l2 2M10.4 10.4l2 2M12.4 3.6l-2 2M5.6 10.4l-2 2',
  action: 'M4.5 2.5v11l8.5-5.5z',
};
const GRID = 24; // the dots of the background are this far apart
const SNAP = 10; // a node that is let go lands on a grid this fine

/**
 * hooks: {
 *   code()        -> { graph, own, lang } of the scene (it is changed in place)
 *   objects()     -> the objects of the scene
 *   options()     -> { precision, hideDist } of the export
 *   changed()     : something was changed: save it
 *   download(name, text, type)
 * }
 * returns { open(tab), close(), isOpen(), result() }
 */
export function createCodeWindow(hooks) {
  const dialog = $('#code-dialog');
  const canvas = $('#code-canvas');
  const world = $('#code-world');
  const cards = $('#code-cards');
  const wires = $('#code-wires');
  const view = { x: 40, y: 40, k: 1 };
  let selected = null; // the id of the node that is picked
  let helped = new Set(); // ids of the nodes whose help is open
  let made = null; // what worldCode() gave last
  let tab = 'nodes';
  const undone = [];
  const redone = [];
  const graph = () => hooks.code().graph;
  const nodeOf = (id) => graph().nodes.find((n) => n.id === id) || null;

  // (the window lies on top of the page: what it has to say is said inside it)
  let saying = 0;
  const say = (words, kind = '') => {
    const el = $('#code-toast');
    el.textContent = words;
    el.className = `code-toast ${kind}`.trim();
    el.hidden = false;
    clearTimeout(saying);
    saying = setTimeout(() => { el.hidden = true; }, Math.min(12000, 3500 + words.length * 45));
  };

  // ---------------------------------------------------------------- history (of the picture only)

  const snapshot = () => JSON.stringify(graph());
  /** Call before a change: what was there can be brought back. */
  const remember = () => {
    const now = snapshot();
    if (undone[undone.length - 1] === now) return;
    undone.push(now);
    if (undone.length > 100) undone.shift();
    redone.length = 0;
  };
  const restore = (from, to) => {
    if (!from.length) return;
    to.push(snapshot());
    hooks.code().graph = sanitizeGraph(JSON.parse(from.pop()));
    if (!nodeOf(selected)) selected = null;
    hooks.changed();
    draw();
  };

  // ---------------------------------------------------------------- the view

  const applyView = () => {
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
    canvas.style.backgroundSize = `${GRID * view.k}px ${GRID * view.k}px`;
    canvas.style.backgroundPosition = `${view.x}px ${view.y}px`;
    $('#code-zoom').textContent = `${Math.round(view.k * 100)}%`;
  };
  /** A place on the screen as a place in the picture. */
  const toWorld = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return [(clientX - rect.left - view.x) / view.k, (clientY - rect.top - view.y) / view.k];
  };
  const zoomAt = (k, clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const px = clientX === undefined ? rect.width / 2 : clientX - rect.left;
    const py = clientY === undefined ? rect.height / 2 : clientY - rect.top;
    const to = Math.min(1.6, Math.max(0.3, k));
    view.x = px - ((px - view.x) * to) / view.k;
    view.y = py - ((py - view.y) * to) / view.k;
    view.k = to;
    applyView();
  };
  /** Show all nodes, as large as they fit (never larger than life). */
  const fit = () => {
    const list = [...cards.children];
    const rect = canvas.getBoundingClientRect();
    if (!list.length || !rect.width) { Object.assign(view, { x: 40, y: 40, k: 1 }); applyView(); return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const el of list) {
      const n = nodeOf(el.dataset.node);
      x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y);
      x1 = Math.max(x1, n.x + el.offsetWidth); y1 = Math.max(y1, n.y + el.offsetHeight);
    }
    view.k = Math.min(1, Math.max(0.3, Math.min((rect.width - 80) / (x1 - x0), (rect.height - 110) / (y1 - y0))));
    view.x = (rect.width - (x1 - x0) * view.k) / 2 - x0 * view.k;
    view.y = Math.max(50, (rect.height - (y1 - y0) * view.k) / 2) - y0 * view.k;
    applyView();
  };

  // ---------------------------------------------------------------- the code that comes out

  let timer = 0;
  /** Work out the World Code again and show what it says about the picture. */
  const compile = () => {
    clearTimeout(timer);
    made = worldCode(hooks.objects(), hooks.code(), hooks.options());
    const warned = new Map();
    for (const w of made.warnings) warned.set(w.node, [...(warned.get(w.node) || []), w.text]);
    for (const el of cards.children) {
      const id = el.dataset.node;
      el.classList.toggle('idle', made.idle.includes(id));
      el.classList.toggle('warned', warned.has(id));
      el.querySelector('.node-warn').textContent = (warned.get(id) || []).join(' ');
      el.querySelector('.node-warn').hidden = !warned.has(id);
    }
    const box = $('#code-warnings');
    const notes = [
      ...made.warnings.map((w) => h('button', { type: 'button', onclick: () => { select(w.node); centreOn(w.node); } }, w.text)),
      made.idle.length ? h('span', {}, `${made.idle.length === 1 ? 'One node is' : `${made.idle.length} nodes are`} not wired to an event: ${made.idle.length === 1 ? 'it does' : 'they do'} nothing.`) : null,
    ].filter(Boolean);
    box.replaceChildren(...notes);
    box.hidden = !notes.length;
    $('#code-empty').hidden = graph().nodes.length > 0;
    const over = made.chars > WORLD_CHARS;
    $('#code-meter').textContent = `${made.file}: ${made.chars.toLocaleString('en')} characters`
      + `${over ? `, more than the ${WORLD_CHARS.toLocaleString('en')} World Code holds` : ''} · ${made.particles.toLocaleString('en')} particles each time it plays`;
    $('#code-meter').classList.toggle('bad', over);
    $('#code-text').value = made.code;
    $('#code-download').textContent = `Download ${made.file}`;
    $('#code-rename').hidden = hooks.code().lang !== 'ts';
    return made;
  };
  const later = () => { clearTimeout(timer); timer = setTimeout(compile, 160); };
  const changed = () => { hooks.changed(); later(); };

  // ---------------------------------------------------------------- wires

  /** The middle of a port of a node, as a place in the picture. */
  const portAt = (id, port) => {
    const el = cards.querySelector(`[data-node="${id}"] [data-port="${port}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return toWorld(r.left + r.width / 2, r.top + r.height / 2);
  };
  const curve = (a, b) => {
    const reach = Math.max(50, Math.abs(b[0] - a[0]) / 2);
    return `M${a[0]} ${a[1]} C${a[0] + reach} ${a[1]}, ${b[0] - reach} ${b[1]}, ${b[0]} ${b[1]}`;
  };
  const svg = (tag, attrs) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };
  let pulling = null; // a wire that is being pulled out of a port: { from, out, to: [x, y] }
  const drawWires = () => {
    const list = [];
    for (const w of graph().wires) {
      const a = portAt(w.from, w.out);
      const b = portAt(w.to, 'in');
      if (!a || !b) continue;
      const d = curve(a, b);
      const line = svg('path', { d, class: 'wire' });
      // (a wide unseen line on top, so the wire is easy to hit)
      const hit = svg('path', { d, class: 'wire-hit', 'data-wire': `${w.from} ${w.out} ${w.to}` });
      hit.addEventListener('pointerenter', () => line.classList.add('hot'));
      hit.addEventListener('pointerleave', () => line.classList.remove('hot'));
      hit.addEventListener('click', () => {
        remember();
        hooks.code().graph.wires = graph().wires.filter((x) => x !== w);
        drawWires();
        changed();
      });
      const title = svg('title', {});
      title.textContent = 'Click to cut this wire';
      hit.append(title);
      list.push(line, hit);
    }
    if (pulling) {
      const a = portAt(pulling.from, pulling.out);
      if (a) list.push(svg('path', { d: curve(a, pulling.to), class: 'wire pulled' }));
    }
    wires.replaceChildren(...list);
  };

  /** Join an output of a node to another node. false when that cannot be. */
  const join = (from, out, to) => {
    const target = nodeOf(to);
    if (!target || from === to || NODE_BY_ID[target.type].event) return false;
    if (graph().wires.some((w) => w.from === from && w.out === out && w.to === to)) return false;
    remember();
    graph().wires.push({ from, out, to });
    return true;
  };

  const pullWire = (node, out) => (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    pulling = { from: node.id, out, to: toWorld(e.clientX, e.clientY) };
    canvas.classList.add('wiring');
    const move = (ev) => { pulling.to = toWorld(ev.clientX, ev.clientY); drawWires(); };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      canvas.classList.remove('wiring');
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      const card = under ? under.closest('.node') : null;
      const from = pulling.from;
      pulling = null;
      if (card && join(from, out, card.dataset.node)) changed();
      else if (card && NODE_BY_ID[nodeOf(card.dataset.node).type].event && card.dataset.node !== from) say('An event starts a run: nothing can be wired into it.', 'warn');
      drawWires();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ---------------------------------------------------------------- cards

  /** One thing to type or choose on a node. */
  const control = (node, field, redraw) => {
    const value = node.values[field.key];
    const set = (v) => { node.values[field.key] = v; changed(); };
    const typing = { onfocus: remember };
    if (field.kind === 'choice') {
      const el = h('select', { 'aria-label': field.label, ...typing, onchange: () => { set(el.value); redraw(); } },
        field.options.map((o) => h('option', { value: o.id }, o.name)));
      el.value = value;
      return el;
    }
    if (field.kind === 'check') {
      const el = h('input', { type: 'checkbox', checked: !!value, ...typing, onchange: () => set(el.checked) });
      return h('label', { class: 'check' }, el, field.label);
    }
    if (field.kind === 'vec') {
      return h('span', { class: 'node-vec' }, ['X', 'Y', 'Z'].map((axis, i) => {
        const el = h('input', {
          type: 'number', step: 0.5, value: value[i], 'aria-label': `${field.label} ${axis}`, title: axis, ...typing,
          oninput: () => { if (el.value !== '' && Number.isFinite(Number(el.value))) { node.values[field.key][i] = Number(el.value); changed(); } },
        });
        return el;
      }));
    }
    if (field.kind === 'code') {
      const el = h('textarea', { rows: 4, spellcheck: false, 'aria-label': field.label, ...typing, oninput: () => set(el.value) });
      el.value = value;
      return el;
    }
    if (field.kind === 'number') {
      const el = h('input', {
        type: 'number', min: field.min, max: field.max, step: field.step, value, 'aria-label': field.label, ...typing,
        oninput: () => { if (el.value !== '' && Number.isFinite(Number(el.value))) set(Math.min(field.max, Math.max(field.min, Number(el.value)))); },
      });
      return field.unit ? h('span', { class: 'node-unit' }, el, field.unit) : el;
    }
    const el = h('input', { type: 'text', value, placeholder: field.hint || '', spellcheck: false, maxLength: 300, 'aria-label': field.label, ...typing, oninput: () => set(el.value) });
    return el;
  };

  const card = (node) => {
    const type = NODE_BY_ID[node.type];
    const cat = CAT_BY_ID[type.cat];
    const fields = h('div', { class: 'node-fields' });
    const fill = () => {
      fields.replaceChildren(...type.fields.filter((f) => !f.when || f.when(node.values)).map((f) => (f.kind === 'check' || f.kind === 'code'
        ? h('div', { class: 'node-row wide' }, control(node, f, refill))
        : h('label', { class: 'node-row' }, h('span', {}, f.label), control(node, f, refill)))));
    };
    // (a choice can bring other things to fill in: the card is filled again, and the wires follow its new size)
    const refill = () => { fill(); drawWires(); };
    fill();
    const icon = svg('svg', { class: 'node-icon', viewBox: '0 0 16 16', 'aria-hidden': 'true' });
    icon.append(svg('path', { d: ICONS[type.cat] }));
    const el = h('div', {
      class: `node${node.id === selected ? ' selected' : ''}`, 'data-node': node.id, 'data-type': type.id,
      style: `left:${node.x}px;top:${node.y}px;--c:${cat.colour}`,
      onpointerdown: () => select(node.id),
    },
    h('div', { class: 'node-head', onpointerdown: dragNode(node) },
      icon,
      h('span', { class: 'node-title' }, type.name),
      h('button', {
        class: 'node-help', type: 'button', title: 'What this node does', 'aria-label': `What "${type.name}" does`,
        onpointerdown: (e) => e.stopPropagation(),
        onclick: () => { if (helped.has(node.id)) helped.delete(node.id); else helped.add(node.id); draw(); },
      }, '?')),
    helped.has(node.id) ? h('p', { class: 'node-about' }, type.about) : null,
    h('p', { class: 'node-warn', hidden: true }),
    fields,
    type.event ? null : h('span', { class: 'port in', 'data-port': 'in', title: 'Run comes in here: pull a wire from another node onto this one' }),
    h('div', { class: 'node-outs' }, outsOf(type).map((out) => h('div', { class: 'node-out' },
      h('span', {}, out.name || 'Then'),
      h('span', { class: 'port out', 'data-port': out.id, title: 'Pull a wire from here to the node that runs next', onpointerdown: pullWire(node, out.id) })))));
    return el;
  };

  const dragNode = (node) => (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    e.preventDefault(); // (no text is selected while it is dragged)
    select(node.id);
    const el = cards.querySelector(`[data-node="${node.id}"]`);
    const start = { x: e.clientX, y: e.clientY, nx: node.x, ny: node.y, moved: false };
    const move = (ev) => {
      if (!start.moved) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 3) return;
        start.moved = true;
        remember();
        el.classList.add('dragged');
      }
      node.x = Math.round((start.nx + (ev.clientX - start.x) / view.k) / SNAP) * SNAP;
      node.y = Math.round((start.ny + (ev.clientY - start.y) / view.k) / SNAP) * SNAP;
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      drawWires();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.classList.remove('dragged');
      if (start.moved) changed(); // (the order of what is wired to one output goes by where the nodes are)
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  function select(id) {
    if (selected === id) return;
    selected = id;
    for (const el of cards.children) el.classList.toggle('selected', el.dataset.node === id);
    $('#code-dup').disabled = !id;
    $('#code-del').disabled = !id;
  }

  const centreOn = (id) => {
    const node = nodeOf(id);
    const el = cards.querySelector(`[data-node="${id}"]`);
    const rect = canvas.getBoundingClientRect();
    if (!node || !el) return;
    view.x = rect.width / 2 - (node.x + el.offsetWidth / 2) * view.k;
    view.y = rect.height / 2 - (node.y + el.offsetHeight / 2) * view.k;
    applyView();
  };

  /** Draw the whole picture anew. */
  function draw() {
    cards.replaceChildren(...graph().nodes.map(card));
    $('#code-dup').disabled = !selected;
    $('#code-del').disabled = !selected;
    $('#code-undo').disabled = !undone.length;
    $('#code-redo').disabled = !redone.length;
    applyView();
    drawWires();
    compile();
  }

  // ---------------------------------------------------------------- adding and taking away

  /** A free spot for a new node: to the right of the picked one, else in the middle of what is seen. Never on top of another. */
  const freeSpot = () => {
    const from = nodeOf(selected);
    const el = from ? cards.querySelector(`[data-node="${from.id}"]`) : null;
    const rect = canvas.getBoundingClientRect();
    const boxes = [...cards.children].map((card) => {
      const n = nodeOf(card.dataset.node);
      return [n.x, n.y, card.offsetWidth, card.offsetHeight];
    });
    const [W, H, GAP] = [262, 190, 20]; // about the size of a card, and the room between two
    const at = (el ? [from.x + el.offsetWidth + 70, from.y] : toWorld(rect.left + rect.width / 2 - W / 2, rect.top + rect.height / 2 - H / 2))
      .map((v) => Math.round(v / SNAP) * SNAP);
    for (let tries = 0; tries < 80; tries++) {
      const hit = boxes.find(([x, y, w, hgt]) => at[0] < x + w + GAP && at[0] + W + GAP > x && at[1] < y + hgt + GAP && at[1] + H + GAP > y);
      if (!hit) break;
      at[1] = Math.ceil((hit[1] + hit[3] + GAP) / SNAP) * SNAP; // below the one that is in the way
    }
    return at;
  };

  const addNode = (typeId) => {
    if (graph().nodes.length >= MAX_NODES) { say(`A picture can have ${MAX_NODES} nodes.`, 'warn'); return null; }
    remember();
    const from = nodeOf(selected);
    const [x, y] = freeSpot();
    const node = createNode(typeId, x, y);
    graph().nodes.push(node);
    // wired to the picked node at once, when that one has an output with nothing on it yet
    if (from && !NODE_BY_ID[typeId].event) {
      const free = outsOf(NODE_BY_ID[from.type]).find((out) => !graph().wires.some((w) => w.from === from.id && w.out === out.id));
      if (free) graph().wires.push({ from: from.id, out: free.id, to: node.id });
    }
    selected = node.id;
    hooks.changed();
    draw();
    // (into view, if it landed outside)
    const el = cards.querySelector(`[data-node="${node.id}"]`);
    const r = el.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    if (r.right > c.right - 10 || r.bottom > c.bottom - 10 || r.left < c.left || r.top < c.top) centreOn(node.id);
    return node;
  };

  const removeNode = (id = selected) => {
    if (!nodeOf(id)) return;
    remember();
    const g = graph();
    g.nodes = g.nodes.filter((n) => n.id !== id);
    g.wires = g.wires.filter((w) => w.from !== id && w.to !== id);
    selected = null;
    hooks.changed();
    draw();
  };

  const duplicateNode = () => {
    const node = nodeOf(selected);
    if (!node) return;
    if (graph().nodes.length >= MAX_NODES) { say(`A picture can have ${MAX_NODES} nodes.`, 'warn'); return; }
    remember();
    const copy = createNode(node.type, node.x + 30, node.y + 40, JSON.parse(JSON.stringify(node.values)));
    graph().nodes.push(copy);
    selected = copy.id;
    hooks.changed();
    draw();
  };

  // ---------------------------------------------------------------- the list of nodes to add

  const palette = $('#code-palette');
  const search = $('#code-search');
  const showPalette = (on) => {
    palette.hidden = !on;
    $('#code-add').setAttribute('aria-expanded', String(on));
    if (on) { search.value = ''; listNodes(); search.focus(); }
  };
  function listNodes() {
    const want = search.value.trim().toLowerCase();
    const fits = (t) => !want || `${t.name} ${t.about} ${CAT_BY_ID[t.cat].name}`.toLowerCase().includes(want);
    const parts = CATS.flatMap((cat) => {
      const list = NODE_TYPES.filter((t) => t.cat === cat.id && fits(t));
      if (!list.length) return [];
      return [
        h('h4', { style: `--c:${cat.colour}` }, cat.name),
        ...list.map((t) => h('button', {
          type: 'button', class: 'palette-item', style: `--c:${cat.colour}`, title: t.about, 'data-add': t.id,
          onclick: () => { showPalette(false); addNode(t.id); },
        }, h('b', {}, t.name), h('small', {}, t.about))),
      ];
    });
    $('#code-list').replaceChildren(...(parts.length ? parts : [h('p', { class: 'note' }, 'No node is called that.')]));
  }
  search.oninput = listNodes;
  search.onkeydown = (e) => {
    if (e.key === 'Enter') { const first = $('#code-list').querySelector('[data-add]'); if (first) first.click(); }
  };

  // ---------------------------------------------------------------- tabs, buttons, keys

  const showTab = (name) => {
    tab = name;
    for (const b of document.querySelectorAll('#code-tabs button')) b.classList.toggle('on', b.dataset.tab === name);
    for (const pane of ['nodes', 'own', 'result']) $(`#code-pane-${pane}`).hidden = pane !== name;
    for (const el of document.querySelectorAll('#code-dialog [data-only="nodes"]')) el.hidden = name !== 'nodes';
    showPalette(false);
    compile();
    if (name === 'nodes') { applyView(); drawWires(); }
  };
  for (const b of document.querySelectorAll('#code-tabs button')) b.onclick = () => showTab(b.dataset.tab);

  $('#code-add').onclick = () => showPalette(palette.hidden);
  $('#code-dup').onclick = duplicateNode;
  $('#code-del').onclick = () => removeNode();
  $('#code-undo').onclick = () => restore(undone, redone);
  $('#code-redo').onclick = () => restore(redone, undone);
  $('#code-zoom-in').onclick = () => zoomAt(view.k * 1.2);
  $('#code-zoom-out').onclick = () => zoomAt(view.k / 1.2);
  $('#code-fit').onclick = fit;
  $('#code-close').onclick = () => dialog.close();
  $('#code-export').onclick = () => showTab('result');

  const lang = $('#code-lang');
  lang.onchange = () => { hooks.code().lang = lang.value === 'ts' ? 'ts' : 'js'; lang.blur(); changed(); compile(); };
  const own = $('#code-own-text');
  own.oninput = () => { hooks.code().own = own.value; changed(); };

  // examples: each replaces the picture (Undo brings the old one back)
  const menu = $('#code-examples-menu');
  menu.replaceChildren(...NODE_EXAMPLES.map((ex) => h('button', {
    type: 'button', role: 'menuitem', 'data-example': ex.id,
    onclick: () => {
      menu.hidden = true;
      remember();
      hooks.code().graph = exampleGraph(ex);
      selected = null;
      hooks.changed();
      showTab('nodes');
      draw();
      fit();
      say(`${ex.name}: ${ex.about}${undone.length ? ' Undo brings the old picture back.' : ''}`);
    },
  }, h('b', {}, ex.name), h('small', {}, ex.about))));
  $('#code-examples').onclick = () => { menu.hidden = !menu.hidden; };

  $('#code-copy').onclick = async () => {
    const { code } = compile();
    let ok = false;
    try { await navigator.clipboard.writeText(code); ok = true; } catch { /* no permission: the old way below */ }
    if (!ok) {
      const box = $('#code-text');
      box.focus();
      box.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
    }
    say(ok ? 'World Code copied. In Bloxd press F8 and paste it.' : 'Could not copy: select the code and press Ctrl+C.', ok ? '' : 'warn');
  };
  $('#code-download').onclick = () => { const out = compile(); hooks.download(out.file, out.code, 'text/plain'); };

  // the background: drag to slide the picture, the wheel zooms
  canvas.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.node, .code-float, .wire-hit')) return;
    showPalette(false);
    menu.hidden = true;
    if (e.button !== 0 && e.button !== 1) return;
    select(null);
    const start = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    canvas.classList.add('sliding');
    const move = (ev) => { view.x = start.vx + ev.clientX - start.x; view.y = start.vy + ev.clientY - start.y; applyView(); };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      canvas.classList.remove('sliding');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
  canvas.addEventListener('wheel', (e) => {
    if (e.target.closest('.code-float, textarea')) return;
    e.preventDefault();
    zoomAt(view.k * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  }, { passive: false });

  dialog.addEventListener('keydown', (e) => {
    const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (e.key === 'Escape' && (!palette.hidden || !menu.hidden)) { e.preventDefault(); showPalette(false); menu.hidden = true; return; }
    if (typing || tab !== 'nodes') return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') { e.preventDefault(); restore(e.shiftKey ? redone : undone, e.shiftKey ? undone : redone); }
    else if (mod && key === 'y') { e.preventDefault(); restore(redone, undone); }
    else if (mod && key === 'd') { e.preventDefault(); duplicateNode(); }
    else if ((key === 'delete' || key === 'backspace') && selected) { e.preventDefault(); removeNode(); }
    else if (key === 'n' && !mod) { e.preventDefault(); showPalette(true); }
  });
  // (Esc with the list of nodes open closes the list, not the window)
  dialog.addEventListener('cancel', (e) => {
    if (!palette.hidden || !menu.hidden) { e.preventDefault(); showPalette(false); menu.hidden = true; }
  });
  window.addEventListener('resize', () => { if (dialog.open && tab === 'nodes') drawWires(); });

  return {
    /** Open the window (on one of its tabs: 'nodes', 'own', 'result'). */
    open(name = 'nodes') {
      if (!dialog.open) dialog.showModal();
      lang.value = hooks.code().lang;
      own.value = hooks.code().own;
      if (!nodeOf(selected)) selected = null;
      showTab(name);
      draw();
      fit();
    },
    close() { if (dialog.open) dialog.close(); },
    isOpen: () => dialog.open,
    /** What comes out now: see worldCode() in js/nodes.js. */
    result: () => worldCode(hooks.objects(), hooks.code(), hooks.options()),
    /** For tests. */
    debug: () => ({ view: { ...view }, selected, tab, undo: undone.length, redo: redone.length }),
    addNode, removeNode, select, fit,
    defaults: defaultValues,
  };
}
