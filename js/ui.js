// Small helpers for building the page: elements, and the categories that open
// and close (the page remembers which ones are open).

export const $ = (sel) => document.querySelector(sel);

/** Tiny DOM builder: h('div', { class: 'row' }, child, 'text') */
export function h(tag, props = {}, ...children) {
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

export const clone = (v) => JSON.parse(JSON.stringify(v));
export const round = (v, digits = 3) => Number(Number(v).toFixed(digits));

/**
 * Clicking or tabbing into a box selects the old value, so typing replaces it.
 * A second click places the cursor as usual, and so does dragging over part of
 * the text. No timers: the value is selected when the mouse button comes up.
 */
export function selectOnEntry(el) {
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

// ------------------------------------------------------------------ categories

const MEMORY = 'bloxd-particle-studio.ui';
let memory = {};
try { memory = JSON.parse(localStorage.getItem(MEMORY)) || {}; } catch { memory = {}; }
const remember = () => {
  try { localStorage.setItem(MEMORY, JSON.stringify(memory)); } catch { /* private mode: it is forgotten on reload, no harm */ }
};

/** Make a category in the page open and close when its heading is clicked. `open`: how it is the first time. */
export function wireCategory(section, open = false) {
  const id = section.dataset.cat;
  const head = section.querySelector('.cat-head');
  const set = (on) => {
    section.classList.toggle('open', on);
    head.setAttribute('aria-expanded', String(on));
  };
  head.addEventListener('click', () => {
    const on = !section.classList.contains('open');
    set(on);
    memory[id] = on;
    remember();
    head.blur(); // the keyboard goes back to the shortcuts
  });
  set(typeof memory[id] === 'boolean' ? memory[id] : open);
  return section;
}

/**
 * A category: a heading to click, and under it the body, shown only while the
 * category is open. `summary`: a few words next to the heading, so a closed
 * category still says what is in it.
 */
export function category(id, title, body, { open = false, summary = null } = {}) {
  const section = h('section', { class: 'cat', 'data-cat': id },
    h('button', { class: 'cat-head', type: 'button' },
      h('span', { class: 'chev', 'aria-hidden': 'true' }),
      h('span', { class: 'cat-title' }, title),
      summary ? h('span', { class: 'cat-sum' }, summary) : null),
    h('div', { class: 'cat-body' }, body));
  return wireCategory(section, open);
}
