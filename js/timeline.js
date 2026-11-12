// The timeline under the 3D view: one row per object, time runs to the right.
// A row shows when the object is there (the bar) and its keys (the diamonds).
// This file only draws and reports what the pointer does; app.js owns the
// scene and decides what changes.

import { spanOf, keyAt, NEAR_KEY } from './motion.js';

const NAMES = 120; // width of the name column in pixels (the CSS has it as --names)
const PAD = 12; // room between the names and second 0, so a diamond at 0 is not cut in half
const SNAP = 0.05; // dragging moves in steps of this many seconds
const STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]; // ruler: seconds between marks

const el = (className, parent, tag = 'div') => {
  const node = document.createElement(tag);
  node.className = className;
  parent.append(node);
  return node;
};

/**
 * root : the #timeline element
 * on   : {
 *   seek(time, tolerance)        the time marker was put somewhere (tolerance: seconds that count as "on a key")
 *   select(id)
 *   start(id, seconds, done)     the bar was dragged: the object appears at another time
 *   end(id, seconds, done)       the end of the bar was dragged
 *   key(id, index, seconds, done) a key was dragged; seconds is on the timeline
 * }
 * `done` is false while dragging and true once when the pointer is let go.
 */
export function createTimeline(root, on) {
  const scroll = root.querySelector('#tl-scroll');
  const canvas = root.querySelector('#tl-canvas');
  const ruler = root.querySelector('#tl-ruler');
  const rowsEl = root.querySelector('#tl-rows');
  const head = root.querySelector('#tl-head');
  const rows = new Map(); // object id -> { row, shape, name, span, end, first, keys: [] }
  let model = { objects: [], selected: null, time: 0, duration: 0 };
  let zoom = 1;
  let pps = 60; // pixels per second
  let rulerKey = '';
  let held = false; // a drag is going on: the scale stays as it is, so things follow the pointer
  let shown = null; // the selected object whose row was last scrolled into sight

  const x = (t) => NAMES + PAD + t * pps;
  const timeAt = (clientX) => Math.max(0, (clientX - canvas.getBoundingClientRect().left - NAMES - PAD) / pps);
  const snap = (t) => Math.round(t / SNAP) * SNAP;
  const seek = (e) => on.seek(timeAt(e.clientX), 7 / pps);

  /** Follow the pointer from a press until it is let go. */
  function drag(e, target, { move, up }) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    let moved = false;
    held = true;
    try { target.setPointerCapture(e.pointerId); } catch { /* an old browser: the events still arrive while over the element */ }
    const onMove = (ev) => {
      if (!moved && Math.abs(ev.clientX - startX) < 3) return;
      moved = true;
      move(ev, (ev.clientX - startX) / pps);
    };
    const onUp = (ev) => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
      held = false;
      up(ev, moved);
      api.render(model); // now the scale may fit the new length
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  }

  ruler.addEventListener('pointerdown', (e) => {
    seek(e);
    drag(e, ruler, { move: seek, up: () => {} });
  });

  function makeRow(obj) {
    const row = el('tl-row', rowsEl);
    const r = { row, shape: '', name: el('tl-name', row, 'span'), span: el('tl-span', row), end: el('tl-end', row), first: null, keys: [] };
    const id = obj.id;
    const mine = () => model.objects.find((o) => o.id === id);
    r.name.addEventListener('click', () => on.select(id));
    row.addEventListener('pointerdown', (e) => {
      if (e.target !== row) return;
      on.select(id);
      seek(e);
      drag(e, row, { move: seek, up: () => {} });
    });
    r.span.addEventListener('pointerdown', (e) => {
      on.select(id);
      const from = spanOf(mine()).start;
      drag(e, r.span, {
        move: (ev, dt) => on.start(id, Math.max(0, snap(from + dt)), false),
        up: (ev, moved) => (moved ? on.start(id, spanOf(mine()).start, true) : seek(ev)),
      });
    });
    r.end.title = 'Drag: how long it stays';
    r.end.addEventListener('pointerdown', (e) => {
      on.select(id);
      const from = spanOf(mine()).end;
      drag(e, r.end, {
        move: (ev, dt) => on.end(id, snap(from + dt), false),
        up: (ev, moved) => { if (moved) on.end(id, spanOf(mine()).end, true); },
      });
    });
    r.span.title = 'Drag: when it appears';
    return r;
  }

  function makeKey(r, id, index) {
    const key = el(index < 0 ? 'tl-key first' : 'tl-key', r.row); // not a button: the keyboard stays with the shortcuts
    const mine = () => model.objects.find((o) => o.id === id);
    const timeOf = () => {
      const o = mine();
      return spanOf(o).start + (index < 0 ? 0 : o.keys[index].t);
    };
    key.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      on.select(id);
      on.seek(timeOf(), 0);
      if (index < 0) return;
      const from = timeOf();
      drag(e, key, {
        move: (ev, dt) => on.key(id, index, snap(from + dt), false),
        up: (ev, moved) => { if (moved) on.key(id, index, timeOf(), true); },
      });
    });
    return key;
  }

  function drawRuler(extent) {
    const step = STEPS.find((s) => s * pps >= 56) || STEPS[STEPS.length - 1];
    const key = `${step}:${pps.toFixed(3)}:${extent.toFixed(2)}`;
    if (key === rulerKey) return;
    rulerKey = key;
    ruler.replaceChildren();
    for (let i = 0; i * step <= extent + 1e-9; i++) {
      const tick = el('tick', ruler);
      tick.style.left = `${x(i * step)}px`;
      tick.textContent = String(Number((i * step).toFixed(2)));
    }
  }

  // scrolled under the names, the time marker is not drawn across them
  const showHead = () => { head.hidden = x(model.time) - scroll.scrollLeft < NAMES; };
  scroll.addEventListener('scroll', showHead);

  const api = {
    /** model: { objects, selected, time, duration } */
    render(next) {
      model = next;
      // room for the whole show and a little more, so things can be dragged later
      const extent = Math.max(6, model.duration * 1.2, model.duration + 2, model.time + 1);
      const room = Math.max(120, scroll.clientWidth - NAMES - PAD - 24);
      if (!held) pps = Math.max(2, (room / extent) * zoom);
      canvas.style.width = `${Math.ceil(x(extent) + 16)}px`;
      drawRuler(extent);

      const seen = new Set();
      model.objects.forEach((obj, order) => {
        seen.add(obj.id);
        let r = rows.get(obj.id);
        if (!r) {
          r = makeRow(obj);
          rows.set(obj.id, r);
        }
        if (rowsEl.children[order] !== r.row) rowsEl.insertBefore(r.row, rowsEl.children[order] || null);
        // rebuild the diamonds only when their number changes, so a drag keeps hold of its diamond
        if (r.keys.length !== obj.keys.length || (r.first === null) !== (obj.keys.length === 0)) {
          for (const k of r.keys) k.remove();
          if (r.first) r.first.remove();
          r.first = obj.keys.length ? makeKey(r, obj.id, -1) : null;
          r.keys = obj.keys.map((k, i) => makeKey(r, obj.id, i));
        }
        const { start, end } = spanOf(obj);
        // the key under the time marker; close to a key counts, as no other key can be made there
        const here = model.selected === obj.id ? keyAt(obj, model.time, NEAR_KEY) : null;
        r.row.className = `tl-row${model.selected === obj.id ? ' selected' : ''}${obj.hidden ? ' hidden' : ''}`;
        r.row.dataset.id = obj.id;
        if (r.name.textContent !== obj.name) r.name.textContent = obj.name;
        r.name.title = obj.name;
        r.span.className = `tl-span${obj.fadeIn ? ' fade-in' : ''}${obj.fade ? ' fade-out' : ''}`;
        r.span.style.left = `${x(start)}px`;
        r.span.style.width = `${Math.max(4, (end - start) * pps)}px`;
        r.end.style.left = `${x(end)}px`;
        if (r.first) {
          r.first.style.left = `${x(start)}px`;
          r.first.classList.toggle('on', here === 'start');
          r.first.title = `Where ${obj.name} starts`;
        }
        obj.keys.forEach((k, i) => {
          r.keys[i].style.left = `${x(start + k.t)}px`;
          r.keys[i].classList.toggle('on', here === i);
          r.keys[i].title = `Key ${i + 1} at ${Number((start + k.t).toFixed(2))} s. Drag: another time. Delete: remove it.`;
        });
      });
      for (const [id, r] of rows) {
        if (!seen.has(id)) {
          r.row.remove();
          rows.delete(id);
        }
      }
      // a newly selected object: bring its row into sight (the ruler covers the top of the list)
      if (model.selected !== shown) {
        shown = model.selected;
        const r = rows.get(shown);
        if (r) {
          const top = r.row.offsetTop - ruler.offsetHeight;
          const bottom = r.row.offsetTop + r.row.offsetHeight;
          if (top < scroll.scrollTop) scroll.scrollTop = top;
          else if (bottom > scroll.scrollTop + scroll.clientHeight) scroll.scrollTop = bottom - scroll.clientHeight;
        }
      }
      api.setTime(model.time, false);
    },
    /** Move the time marker only (cheap; used while playing). */
    setTime(time, follow) {
      model.time = time;
      head.style.left = `${x(time)}px`;
      if (follow) {
        const left = x(time) - scroll.scrollLeft;
        if (left > scroll.clientWidth - 40 || left < NAMES) scroll.scrollLeft = Math.max(0, x(time) - NAMES - PAD - 40);
      }
      showHead();
    },
    zoomBy(factor) {
      const before = zoom;
      zoom = Math.min(64, Math.max(1, zoom * factor));
      if (zoom === before) return;
      const centre = model.time;
      api.render(model);
      scroll.scrollLeft = Math.max(0, x(centre) - scroll.clientWidth / 2);
    },
    /** For tests: where things are on the screen. */
    debug: () => ({ pps, zoom, x: (t) => canvas.getBoundingClientRect().left + x(t) }),
  };
  return api;
}
