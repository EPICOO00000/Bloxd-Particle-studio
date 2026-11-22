// Bloxd Particle Studio: the My scenes window, a card with a small picture
// for every scene the browser keeps. Where the scenes are kept is in
// js/library.js; what the studio does when one is opened, made or deleted is
// in js/app.js.

import { whenText, MAX_NAME, SCENE_KEY } from './library.js';
import { $, h, selectOnEntry } from './ui.js';

const count = (n, word) => `${n.toLocaleString('en')} ${word}${n === 1 ? '' : 's'}`;

/**
 * hooks:
 *   list()           : the scenes, the one changed last first (see list() in js/library.js)
 *   current()        : the id of the scene that is open
 *   refresh()        : the scene that is open goes into the list as it is now, with a new picture
 *   open(id)         : opens a scene; true when it is the one that is open now
 *   fresh()          : a new empty scene; true when there is one now
 *   rename(id, name) : gives the name the scene has after that
 *   duplicate(id)    : a copy, as a scene of its own; gives its name, or null
 *   remove(id)       : deletes a scene; gives a function that brings it back, or null
 *   trouble()        : why scenes are not kept in this browser: { text, kind }, or null
 * What a hook has to say while the window is open, it says with say().
 */
export function createScenes(hooks) {
  const dialog = $('#scenes-dialog');
  const grid = $('#scenes-grid');
  const status = $('#scenes-status');
  let said = null; // what the window says about the last thing done: { text, kind, undo }
  let opening = false; // the window is on its way up: what is said now is for it

  /** The line (or two) above the cards: what is wrong with the store, and what was done last. */
  function report() {
    const trouble = hooks.trouble();
    // (replaceChildren() would write the word "null" for a line that is not there)
    status.replaceChildren(...[
      trouble ? h('p', { class: trouble.kind || 'warn' }, trouble.text) : null,
      said ? h('p', said.kind ? { class: said.kind } : {}, said.text, said.undo ? h('button', { type: 'button', class: 'undo', onclick: said.undo }, 'Undo') : null) : null,
    ].filter(Boolean));
  }

  /** The card of one scene. */
  function card(entry, open) {
    // (a click into the name selects it, so typing replaces it: as in every box of the page)
    const name = selectOnEntry(h('input', {
      class: 'scene-name', type: 'text', maxLength: MAX_NAME, value: entry.name, spellcheck: false, autocomplete: 'off',
      'aria-label': `Name of the scene ${entry.name}`, title: 'Click to give the scene another name',
    }));
    const picture = h('button', {
      type: 'button', class: 'scene-pic', title: open ? 'This scene is open. Click to go back to it' : `Open "${entry.name}"`,
      onclick: () => { if (hooks.open(entry.id)) dialog.close(); else render(); },
    },
    entry.thumb ? h('img', { src: entry.thumb, alt: '', draggable: false }) : h('span', { class: 'blank' }, 'No picture yet'),
    open ? h('span', { class: 'badge' }, 'Open') : null);
    name.onchange = () => {
      const now = hooks.rename(entry.id, name.value);
      name.value = now;
      entry.name = now;
      picture.title = open ? picture.title : `Open "${now}"`;
      name.setAttribute('aria-label', `Name of the scene ${now}`);
    };
    name.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); name.blur(); }
      // (Esc while typing: the old name is back, and the window stays open)
      else if (e.key === 'Escape' && name.value !== entry.name) { e.preventDefault(); e.stopPropagation(); name.value = entry.name; }
    };
    return h('div', { class: `scene-card${open ? ' is-open' : ''}`, 'data-id': entry.id },
      picture,
      name,
      h('div', { class: 'scene-meta' }, [count(entry.count, 'object'), whenText(entry.updated)].filter(Boolean).join(' · ')),
      h('div', { class: 'scene-tools' },
        h('button', {
          type: 'button', title: `A copy of "${entry.name}", as a scene of its own`,
          onclick: () => {
            const made = hooks.duplicate(entry.id);
            said = made ? { text: `Copied: "${made}" is a scene of its own now.` } : { text: 'My scenes is full: delete a scene first.', kind: 'warn' };
            render();
          },
        }, 'Copy'),
        h('button', {
          type: 'button', class: 'danger', title: `Delete "${entry.name}"`,
          onclick: () => {
            const back = hooks.remove(entry.id);
            if (back) {
              said = {
                text: `Deleted "${entry.name}".`,
                undo: () => { back(); said = { text: `"${entry.name}" is back.` }; render(); },
              };
            }
            render();
          },
        }, 'Delete')));
  }

  /** Draws the cards again: the list as it is now. */
  function render() {
    const open = hooks.current();
    const at = grid.scrollTop;
    grid.replaceChildren(
      h('button', {
        type: 'button', class: 'scene-new', title: 'A new empty scene',
        onclick: () => { if (hooks.fresh()) dialog.close(); else render(); },
      }, h('span', { class: 'plus', 'aria-hidden': 'true' }, '+'), 'New scene'),
      ...hooks.list().map((entry) => card(entry, entry.id === open)));
    grid.scrollTop = at;
    report();
  }

  // another tab made, changed or deleted a scene while the window is open here
  window.addEventListener('storage', (e) => {
    if (!dialog.open || (e.key !== null && !String(e.key).startsWith(SCENE_KEY))) return;
    if (grid.contains(document.activeElement) && document.activeElement.classList.contains('scene-name')) return; // (a name is being typed)
    render();
  });

  return {
    /** Open the window. */
    show() {
      said = null;
      opening = true;
      try {
        hooks.refresh();
      } finally {
        opening = false;
      }
      render();
      if (!dialog.open) dialog.showModal();
      grid.scrollTop = 0;
      const mine = grid.querySelector('.scene-card.is-open .scene-pic');
      if (mine) mine.focus();
    },
    /** Shut it: another scene is open now, by another way than this window. */
    hide() {
      if (dialog.open) dialog.close();
    },
    /**
     * Words about the scenes, for the line above the cards. True when the
     * window is there to show them; else they are for a toast (a toast lies
     * under an open window, where nobody reads it).
     */
    say(text, kind = '') {
      if (!dialog.open && !opening) return false;
      said = { text, kind };
      if (dialog.open) report();
      return true;
    },
    /** For tests. */
    debug: () => ({
      open: dialog.open,
      cards: [...grid.querySelectorAll('.scene-card')].map((el) => ({
        id: el.dataset.id, name: el.querySelector('.scene-name').value, meta: el.querySelector('.scene-meta').textContent,
        picture: !!el.querySelector('img'), open: el.classList.contains('is-open'),
      })),
      status: [...status.querySelectorAll('p')].map((p) => p.firstChild ? p.firstChild.textContent : ''),
    }),
  };
}
