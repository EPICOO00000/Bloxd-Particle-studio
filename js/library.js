// Bloxd Particle Studio: My scenes, the scenes the browser keeps. No DOM here;
// the window that lists them is in js/library-ui.js, and what the studio does
// when one is opened or left is in js/app.js.
//
// Every scene has an entry of its own in the browser's store:
//
//   bloxd-particle-studio.scene.<id> = what a saved file holds (objects,
//       export, code ...) and with it: name, named (somebody gave it that
//       name), created, updated (milliseconds), thumb (a small picture, as a
//       data URL), link (it came by a share link: the mark of that scene)
//   bloxd-particle-studio.last       = the id of the scene that was worked on last
//   bloxd-particle-studio.open       = the same for one tab (in the tab's own
//       store), so that a reload brings back the scene that tab had
//
// There is no list that could go out of step: the list is whatever entries
// are there. Two tabs can each have a scene open and neither undoes what the
// other one does.
//
// Before there were several scenes the one scene was in
// bloxd-particle-studio.v1. adopt() moves it into the list. An old copy of
// the page that is still open in another tab keeps writing to that place: what
// it writes is adopted too, as one more scene, unless it is the very text that
// was adopted last (bloxd-particle-studio.adopted holds the mark of that).
//
// A browser may refuse to store anything (a private window, a page inside
// another page) or be full. Then what could not be written is kept in memory:
// everything works until the page is closed, and write() says so.

export const SCENE_KEY = 'bloxd-particle-studio.scene.';
export const LAST_KEY = 'bloxd-particle-studio.last';
export const OPEN_KEY = 'bloxd-particle-studio.open';
export const OLD_KEY = 'bloxd-particle-studio.v1';
export const ADOPTED_KEY = 'bloxd-particle-studio.adopted';
/** More scenes than this are not kept: new ones are refused until some are deleted. */
export const MAX_SCENES = 200;
/** A name is at most this long. */
export const MAX_NAME = 40;
/** A picture is at most this long as text (a real one is a tenth of it). */
export const MAX_THUMB = 60000;

const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const PICTURE = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

/** A name as it is kept: one line, no spaces at the ends, not too long. Empty when nothing is left. */
export function cleanName(raw) {
  const text = typeof raw === 'string' ? raw : '';
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();
}

/** A picture that may be shown: a small image as a data URL, and nothing else. Empty otherwise. */
export const cleanThumb = (raw) => (typeof raw === 'string' && raw.length <= MAX_THUMB && PICTURE.test(raw) ? raw : '');

/** What a saved scene is called as a file: its name without the signs a file name cannot have. */
export function fileNameOf(name) {
  const text = cleanName(name).replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').replace(/^[. ]+|[. ]+$/g, '');
  return `${text || 'particle-scene'}.json`;
}

/** A name the studio gave by itself ("Scene 3"): it says nothing about the scene. */
export const isAutoName = (name) => /^Scene( \d+)?$/i.test(cleanName(name));

/**
 * The name a file brings: the one written in it, or else what the file is
 * called, without its ending and without the "(2)" a browser adds to a second
 * download. '' when neither says anything ("Scene 3", "particle-scene (1)").
 */
export function nameOfFile(raw, fileName) {
  const inside = cleanName(isObject(raw) ? raw.name : '');
  if (inside && !isAutoName(inside)) return inside;
  const outside = cleanName(String(fileName || '').replace(/\.[A-Za-z0-9]{1,5}$/, '').replace(/(\s*\(\d+\))+$/, ''));
  return !outside || isAutoName(outside) || /^particle-scene$/i.test(outside) ? '' : outside;
}

/** A short mark of a text: two texts with different marks are different texts. */
export function markOf(text) {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b + c, 0x85ebca6b) ^ (b >>> 13);
  }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}

/** "today", "yesterday", "5 days ago", or the day: when a scene was changed last. */
export function whenText(then, now = Date.now()) {
  if (!Number.isFinite(then) || then <= 0) return '';
  const day = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const days = Math.round((day(now) - day(then)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(then).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * A store of the browser (localStorage, sessionStorage) that may be missing,
 * full, or forbidden. What cannot be written is kept here until the page is
 * closed, so that whoever asks gets back what was put in.
 */
function shelf(storage) {
  const kept = new Map(); // key -> text that the browser did not take
  const gone = new Set(); // keys the browser did not let go of
  return {
    get(key) {
      if (kept.has(key)) return kept.get(key);
      if (gone.has(key)) return null;
      try {
        const text = storage.getItem(key);
        return typeof text === 'string' ? text : null;
      } catch {
        return null;
      }
    },
    /** True when the browser has it now. */
    set(key, text) {
      gone.delete(key);
      try {
        storage.setItem(key, text);
        kept.delete(key);
        return true;
      } catch {
        kept.set(key, text);
        return false;
      }
    },
    remove(key) {
      kept.delete(key);
      try {
        storage.removeItem(key);
        gone.delete(key);
      } catch {
        gone.add(key);
      }
      // (there may be room now for what the browser did not take before)
      for (const [waiting, text] of [...kept]) {
        try {
          storage.setItem(waiting, text);
          kept.delete(waiting);
        } catch { break; }
      }
    },
    /** Is everything that was put in with the browser now? (False: some of it is only in memory.) */
    safe: () => kept.size === 0,
    keys() {
      const out = new Set(kept.keys());
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (typeof key === 'string' && !gone.has(key)) out.add(key);
        }
      } catch { /* nothing can be read: what is in memory is all there is */ }
      return [...out];
    },
    /** Can the browser keep anything at all? */
    works() {
      const probe = 'bloxd-particle-studio.probe';
      try {
        storage.setItem(probe, '1');
        storage.removeItem(probe);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * The scenes the browser keeps.
 *   local   : the browser's store that stays (localStorage), or null
 *   session : the store of this tab (sessionStorage), or null
 *   now     : the time in milliseconds (for tests)
 */
export function createLibrary({ local = null, session = null, now = () => Date.now() } = {}) {
  const store = shelf(local);
  const tab = shelf(session);
  const isId = (id) => typeof id === 'string' && /^[a-z0-9]{1,40}$/.test(id);
  const keyOf = (id) => `${SCENE_KEY}${id}`;
  let made = 0;

  /** What is kept under an id, as it was written: an object with a list of objects. Null when there is none (or not a scene). */
  function read(id) {
    if (!isId(id)) return null;
    const text = store.get(keyOf(id));
    if (text === null) return null;
    try {
      const raw = JSON.parse(text);
      return isObject(raw) && Array.isArray(raw.objects) ? raw : null;
    } catch {
      return null;
    }
  }

  /** Keeps a scene under an id. True: the browser has it. False: it is only in memory, until the page is closed. */
  function write(id, record) {
    if (!isId(id) || !isObject(record) || !Array.isArray(record.objects)) return false;
    return store.set(keyOf(id), JSON.stringify(record));
  }

  function remove(id) {
    if (isId(id)) store.remove(keyOf(id));
  }

  /**
   * Every scene that is kept, the one changed last first:
   * [{ id, name, created, updated, count (objects, without the groups), thumb, named }].
   * An entry that cannot be read is left where it is and not listed.
   */
  function list() {
    const out = [];
    for (const key of store.keys()) {
      if (!key.startsWith(SCENE_KEY)) continue;
      const id = key.slice(SCENE_KEY.length);
      const raw = read(id);
      if (!raw) continue;
      out.push({
        id,
        name: cleanName(raw.name) || 'Scene',
        created: Number.isFinite(raw.created) ? raw.created : 0,
        updated: Number.isFinite(raw.updated) ? raw.updated : 0,
        count: raw.objects.filter((o) => isObject(o) && o.shape !== 'group').length,
        thumb: cleanThumb(raw.thumb),
        named: raw.named === true,
        link: typeof raw.link === 'string' ? raw.link.slice(0, 20) : '',
      });
    }
    return out.sort((a, b) => b.updated - a.updated || b.created - a.created || (a.id < b.id ? -1 : 1));
  }

  /** An id no scene has. */
  function newId() {
    for (;;) {
      const id = `s${now().toString(36)}${(made++).toString(36)}${Math.floor(Math.random() * 1679616).toString(36).padStart(4, '0')}`;
      if (store.get(keyOf(id)) === null) return id;
    }
  }

  /**
   * A name no other scene has: the wanted one, or else with a number after it.
   *   numbered : always with a number ("Scene 1", "Scene 2")
   *   except   : the id of the scene the name is for (its own name is not in the way)
   */
  function nameFor(wanted, { numbered = false, except = null } = {}) {
    const base = cleanName(wanted) || 'Scene';
    const taken = new Set(list().filter((entry) => entry.id !== except).map((entry) => entry.name.toLowerCase()));
    if (!numbered && !taken.has(base.toLowerCase())) return base;
    for (let n = numbered ? 1 : 2; ; n++) {
      const tail = ` ${n}`;
      const name = `${base.slice(0, MAX_NAME - tail.length).trim()}${tail}`;
      if (!taken.has(name.toLowerCase())) return name;
    }
  }

  /** Another name for a scene. Returns the name it has now (null: there is no such scene). */
  function rename(id, name) {
    const raw = read(id);
    if (!raw) return null;
    const clean = cleanName(name);
    if (!clean) return cleanName(raw.name) || 'Scene';
    raw.name = clean;
    raw.named = true;
    write(id, raw);
    return clean;
  }

  /** A copy of a scene, as a scene of its own. Returns its id (null: no such scene, or the list is full). */
  function duplicate(id) {
    const raw = read(id);
    if (!raw || !hasRoom()) return null;
    const copy = newId();
    const time = now();
    write(copy, { ...raw, name: nameFor(`${cleanName(raw.name) || 'Scene'} copy`), named: true, link: '', created: time, updated: time });
    return copy;
  }

  /** This is the scene that is open: in this tab, and for the next visit. */
  function point(id) {
    if (!isId(id)) return;
    tab.set(OPEN_KEY, id);
    store.set(LAST_KEY, id);
  }

  /** The scene to open: the one this tab had, else the one worked on last, else the one changed last. Null: there is none. */
  function pointer() {
    for (const id of [tab.get(OPEN_KEY), store.get(LAST_KEY)]) if (read(id)) return id;
    const all = list();
    return all.length ? all[0].id : null;
  }

  /**
   * The scene from before there was a list (see the top of the file) becomes
   * a scene of the list. Returns its id; null when there is nothing to adopt,
   * or that very scene was adopted before.
   */
  function adopt() {
    const text = store.get(OLD_KEY);
    if (text === null) return null;
    let raw = null;
    try { raw = JSON.parse(text); } catch { raw = null; }
    const mark = markOf(text);
    if (!isObject(raw) || !Array.isArray(raw.objects) || store.get(ADOPTED_KEY) === mark) {
      // (not a scene, or the one that was taken before, written again by an old copy of the page)
      store.remove(OLD_KEY);
      return null;
    }
    if (!hasRoom()) return null; // (it stays where it is until there is room)
    const id = newId();
    const time = now();
    const record = { ...raw, name: nameFor('Scene', { numbered: true }), named: false, created: time, updated: time };
    // The old place is emptied first: a store that is nearly full needs that room for the new one. With no
    // room even so, the scene goes back to where it was (and is in the list from memory, for this visit).
    store.remove(OLD_KEY);
    if (write(id, record)) store.set(ADOPTED_KEY, mark);
    else store.set(OLD_KEY, text);
    return id;
  }

  /** Is there room for one more scene in the list? */
  const hasRoom = () => list().length < MAX_SCENES;

  return {
    read, write, remove, list, newId, nameFor, rename, duplicate, point, pointer, adopt,
    /** Can the browser keep scenes at all? (False: a private window, or a page that may not store anything.) */
    persistent: () => store.works(),
    /** Is every scene with the browser now? (False: its store is full, and some are only in memory until the page is closed.) */
    safe: () => store.safe(),
    hasRoom,
  };
}

/** The stores of the page, each null when the browser does not hand it out. */
export function browserStores() {
  const get = (name) => {
    try { return window[name] || null; } catch { return null; }
  };
  return { local: get('localStorage'), session: get('sessionStorage') };
}
