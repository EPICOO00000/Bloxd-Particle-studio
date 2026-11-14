// The timeline under the 3D view: one row per object or group, time runs to
// the right. A row shows when the thing is there (the bar), its keys (the
// diamonds) and, when it repeats, its later plays (the faint bars). Rows follow
// the scene list: what is in a group sits under it, and a closed group hides it.
// This file only draws and reports what the pointer does; app.js owns the
// scene, works out the rows and decides what changes.

const NAMES = 150; // width of the name column in pixels (the CSS has it as --names)
const PAD = 12; // room between the names and second 0, so a diamond at 0 is not cut in half
const SNAP = 0.05; // dragging moves in steps of this many seconds
const STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]; // ruler: seconds between marks
const MAX_ECHOES = 24; // later plays drawn per row

const el = (className, parent, tag = 'div') => {
  const node = document.createElement(tag);
  node.className = className;
  parent.append(node);
  return node;
};

/**
 * root : the #timeline element
 * on   : {
 *   seek(time, tolerance)         the time marker was put somewhere (tolerance: seconds that count as "on a key")
 *   select(id, { add, range })    add: Ctrl was held, range: Shift
 *   fold(id)                      the arrow of a group was clicked
 *   start(id, seconds, done)      the bar was dragged: it appears at another time
 *   end(id, seconds, done)        the end of the bar was dragged
 *   key(id, index, seconds, done) a key was dragged; seconds is on the timeline
 * }
 * `done` is false while dragging and true once when the pointer is let go.
 *
 * render(model): model = { rows, primary, time, duration }, a row being
 *   { id, name, depth, group, open, hidden, selected, start, end, keys: [seconds], here ('start', a key number or null),
 *     fadeIn, fade, echoes: [seconds at which later plays start], lasts (seconds of one play) }
 */
export function createTimeline(root, on) {
  const scroll = root.querySelector('#tl-scroll');
  const canvas = root.querySelector('#tl-canvas');
  const ruler = root.querySelector('#tl-ruler');
  const rowsEl = root.querySelector('#tl-rows');
  const head = root.querySelector('#tl-head');
  const rows = new Map(); // id -> { row, data, name, arrow, label, span, end, first, keys: [], echoes: [] }
  let model = { rows: [], primary: null, time: 0, duration: 0 };
  let zoom = 1;
  let pps = 60; // pixels per second
  let rulerKey = '';
  let held = false; // a drag is going on: the scale stays as it is, so things follow the pointer
  let shown = null; // the selected row that was last scrolled into sight

  const x = (t) => NAMES + PAD + t * pps;
  const timeAt = (clientX) => Math.max(0, (clientX - canvas.getBoundingClientRect().left - NAMES - PAD) / pps);
  const snap = (t) => Math.round(t / SNAP) * SNAP;
  const seek = (e) => on.seek(timeAt(e.clientX), 7 / pps);
  const how = (e) => ({ add: e.ctrlKey || e.metaKey, range: e.shiftKey });

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

  function makeRow(id) {
    const row = el('tl-row', rowsEl);
    const name = el('tl-name', row, 'span');
    const r = {
      row, data: null, name, arrow: el('tl-fold', name, 'span'), label: el('tl-label', name, 'span'),
      span: el('tl-span', row), end: el('tl-end', row), first: null, keys: [], echoes: [],
    };
    // (while Ctrl or Shift is held a press only changes what is selected)
    const pick = (e) => { on.select(id, how(e)); return !e.ctrlKey && !e.metaKey && !e.shiftKey; };
    r.arrow.addEventListener('click', (e) => { e.stopPropagation(); on.fold(id); });
    name.addEventListener('click', (e) => on.select(id, how(e)));
    row.addEventListener('pointerdown', (e) => {
      if (e.target !== row) return;
      if (!pick(e)) return;
      seek(e);
      drag(e, row, { move: seek, up: () => {} });
    });
    r.span.addEventListener('pointerdown', (e) => {
      if (!pick(e)) return;
      const from = r.data.start;
      drag(e, r.span, {
        move: (ev, dt) => on.start(id, Math.max(0, snap(from + dt)), false),
        up: (ev, moved) => (moved ? on.start(id, r.data.start, true) : seek(ev)),
      });
    });
    r.end.title = 'Drag: how long it stays';
    r.end.addEventListener('pointerdown', (e) => {
      if (!pick(e)) return;
      const from = r.data.end;
      drag(e, r.end, {
        move: (ev, dt) => on.end(id, snap(from + dt), false),
        up: (ev, moved) => { if (moved) on.end(id, r.data.end, true); },
      });
    });
    return r;
  }

  function makeKey(r, id, index) {
    const key = el(index < 0 ? 'tl-key first' : 'tl-key', r.row); // not a button: the keyboard stays with the shortcuts
    const timeOf = () => (index < 0 ? r.data.start : r.data.keys[index]);
    key.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      on.select(id, {});
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
    render(next) {
      model = next;
      // room for the whole show and a little more, so things can be dragged later
      const extent = Math.max(6, model.duration * 1.2, model.duration + 2, model.time + 1);
      const room = Math.max(120, scroll.clientWidth - NAMES - PAD - 24);
      if (!held) pps = Math.max(2, (room / extent) * zoom);
      canvas.style.width = `${Math.ceil(x(extent) + 16)}px`;
      drawRuler(extent);

      const seen = new Set();
      model.rows.forEach((data, order) => {
        seen.add(data.id);
        let r = rows.get(data.id);
        if (!r) {
          r = makeRow(data.id);
          rows.set(data.id, r);
        }
        r.data = data;
        if (rowsEl.children[order] !== r.row) rowsEl.insertBefore(r.row, rowsEl.children[order] || null);
        // rebuild the diamonds only when their number changes, so a drag keeps hold of its diamond
        if (r.keys.length !== data.keys.length || (r.first === null) !== (data.keys.length === 0)) {
          for (const k of r.keys) k.remove();
          if (r.first) r.first.remove();
          r.first = data.keys.length ? makeKey(r, data.id, -1) : null;
          r.keys = data.keys.map((k, i) => makeKey(r, data.id, i));
        }
        const echoes = data.echoes.slice(0, MAX_ECHOES);
        while (r.echoes.length > echoes.length) r.echoes.pop().remove();
        while (r.echoes.length < echoes.length) r.echoes.push(el('tl-echo', r.row));
        r.row.className = `tl-row${data.selected ? ' selected' : ''}${data.hidden ? ' hidden' : ''}${data.group ? ' group' : ''}`;
        r.row.dataset.id = data.id;
        r.name.style.paddingLeft = `${6 + data.depth * 12}px`;
        r.name.title = data.name;
        r.arrow.className = `tl-fold${data.group ? ' chev' : ''}${data.group && data.open ? ' open' : ''}`;
        r.arrow.title = data.group ? (data.open ? 'Close this group' : 'Open this group') : '';
        if (r.label.textContent !== data.name) r.label.textContent = data.name;
        r.span.className = `tl-span${data.fadeIn ? ' fade-in' : ''}${data.fade ? ' fade-out' : ''}`;
        r.span.style.left = `${x(data.start)}px`;
        r.span.style.width = `${Math.max(4, (data.end - data.start) * pps)}px`;
        r.span.title = data.group ? 'Drag: when the group starts. Everything in it comes along.' : 'Drag: when it appears';
        r.end.hidden = !!data.group;
        r.end.style.left = `${x(data.end)}px`;
        echoes.forEach((at, i) => {
          r.echoes[i].style.left = `${x(at)}px`;
          r.echoes[i].style.width = `${Math.max(3, data.lasts * pps)}px`;
        });
        if (r.first) {
          r.first.style.left = `${x(data.start)}px`;
          r.first.classList.toggle('on', data.here === 'start');
          r.first.title = `Where ${data.name} starts`;
        }
        data.keys.forEach((at, i) => {
          r.keys[i].style.left = `${x(at)}px`;
          r.keys[i].classList.toggle('on', data.here === i);
          r.keys[i].title = `Key ${i + 1} at ${Number(at.toFixed(2))} s. Drag: another time. Delete: remove it.`;
        });
      });
      for (const [id, r] of rows) {
        if (!seen.has(id)) {
          r.row.remove();
          rows.delete(id);
        }
      }
      // a newly selected object: bring its row into sight (the ruler covers the top of the list)
      if (model.primary !== shown) {
        shown = model.primary;
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
    /** After the timeline was out of sight: lay it out for the room it has now, the selected row and the time marker in sight. */
    reveal() {
      shown = null;
      api.render(model);
      api.setTime(model.time, true);
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
