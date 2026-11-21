// Bloxd Particle Studio: the Share window (a link that holds the scene), and
// the question a share link asks before its scene takes the place of the one
// that is there. What a link is made of is in js/share.js; what the studio
// does with a scene that arrives is in js/app.js (sharedArrived).

import { makeLink, readLink, payloadOf, baseOf, shareData, sceneText, ShareError, CHAT_CHARS } from './share.js';
import { $, h } from './ui.js';

const count = (n, word) => `${n.toLocaleString('en')} ${word}${n === 1 ? '' : 's'}`;
/** "12 objects": what a scene is made of, without the groups that only hold them. */
const sizeOf = (objects) => count(objects.filter((o) => o.shape !== 'group').length, 'object');
/** The first names of the scene list: "Fire, Sparks, Smoke and 4 more". */
function namesOf(objects, most = 3) {
  const top = objects.filter((o) => o.parent === null).map((o) => o.name);
  const shown = top.slice(0, most).join(', ');
  return top.length > most ? `${shown} and ${top.length - most} more` : shown;
}
/** "4 nodes and your own code": what is in a Code window. `typed`: what to call the code that was typed by hand. */
function codeOf(code, typed) {
  const nodes = code.graph.nodes.length;
  return [nodes ? count(nodes, 'node') : '', code.own ? typed : ''].filter(Boolean).join(' and ');
}

/**
 * hooks:
 *   data() : the scene as a saved file holds it: { objects, export, code }
 *   save() : saves the scene to a file
 */
export function createShare(hooks) {
  const dialog = $('#share-dialog');
  const box = $('#share-link');
  const copyButton = $('#share-copy');
  const withCode = $('#share-code');
  let turn = 0; // (a link is made in the background: only the last one asked for counts)
  let shown = null; // the link in the window: what makeLink() gave
  let asking = null; // the question that is up waits for this: asking(true | false | null)

  const say = (lines) => $('#share-status').replaceChildren(...lines.filter(Boolean).map(([text, kind]) => h('p', { class: kind || '' }, text)));

  /** Nothing to copy: why. */
  function refuse(text) {
    shown = null;
    box.value = '';
    copyButton.disabled = true;
    say([[text, 'bad']]);
  }

  /** What the window says about the link in it. */
  function report(copied) {
    const made = shown;
    const chars = made.chars.toLocaleString('en');
    say([
      copied ? [`Link copied: ${chars} characters. Paste it into a chat or a post.`] : [`${chars} characters. Press Copy link.`],
      made.chars > CHAT_CHARS
        ? [`Too long for one Discord message, which holds ${CHAT_CHARS.toLocaleString('en')} characters. For a scene this big, send the file from Save, or post the link where long links fit.`, 'warn']
        : null,
      made.deflated ? null : ['This browser cannot shorten links. Made in a current browser, the link is about a third as long.', 'warn'],
      /^https?:$/.test(location.protocol) ? null : ['You opened the studio from a file, so the link leads to the studio on the web.'],
    ]);
  }

  /** Puts the link into the clipboard. True when that worked. */
  async function copy() {
    if (!shown) return false;
    try {
      await navigator.clipboard.writeText(shown.url);
      return true;
    } catch {
      // older browsers, and pages inside other pages
      box.focus();
      box.select();
      try { return document.execCommand('copy'); } catch { return false; }
    }
  }

  /** Makes the link for the scene as it is now and shows it. `copyNow`: and puts it into the clipboard. */
  async function render(copyNow = false) {
    const mine = ++turn;
    const data = hooks.data();
    const ready = shareData(data);
    $('#share-code-row').hidden = !ready.code;
    if (ready.code) $('#share-code-text').textContent = `with what is in the Code window (${codeOf(ready.code, 'your own code')})`;
    if (!ready.objects.length) return refuse('The scene is empty. Add a particle or a shape first.');
    let made;
    try {
      made = await makeLink(data, { base: baseOf(location), withCode: withCode.checked });
    } catch {
      if (mine === turn) refuse('This scene could not be put into a link. Save it as a file instead.');
      return undefined;
    }
    if (mine !== turn) return undefined;
    if (made.heavy) return refuse('This scene is far bigger than the studio opens from a link. Send the file from Save instead.');
    shown = made;
    box.value = made.url;
    copyButton.disabled = false;
    const copied = copyNow && await copy();
    if (mine === turn) report(copied);
    return undefined;
  }

  copyButton.onclick = async () => {
    const ok = await copy();
    copyButton.textContent = ok ? 'Copied!' : 'Press Ctrl+C to copy';
    setTimeout(() => { copyButton.textContent = 'Copy link'; }, 1800);
    if (shown) report(ok);
  };
  withCode.onchange = () => render(true); // (the link that was copied before is not this one any more)
  box.onfocus = () => box.select();

  /** Takes the share link out of the address, so that a reload does not bring it up again. */
  function forget() {
    if (payloadOf(location.hash) === null) return;
    try {
      window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}`);
    } catch {
      try { location.hash = ''; } catch { /* a page that may not change its address: the link stays there, no harm */ }
    }
  }

  return {
    /** Open the Share window with a link for the scene as it is now, and copy that link. */
    show() {
      withCode.checked = true;
      box.value = '';
      copyButton.disabled = true;
      say([['Making the link ...']]);
      if (!dialog.open) dialog.showModal();
      return render(true);
    },

    /**
     * What the share link in the address holds. Null: there is none.
     * { scene }: the scene ({ objects, export, code }, see js/share.js).
     * { error }: why it cannot be opened (a key of SHARE_ERRORS). Never throws.
     */
    async arrival() {
      const payload = payloadOf(location.hash);
      if (payload === null) return null;
      try {
        const late = new Promise((resolve, reject) => { setTimeout(() => reject(new ShareError('broken')), 10000); });
        const scene = await Promise.race([readLink(payload), late]);
        return scene.objects.length ? { scene } : { error: 'empty' };
      } catch (err) {
        return { error: err instanceof ShareError ? err.kind : 'broken' };
      }
    },

    /** Is the scene of a link the one that is here already? */
    here(scene) {
      const mine = shareData(hooks.data());
      // (a link without a Code window leaves the one that is here as it is: then that is not compared)
      return sceneText(scene) === sceneText({ ...mine, code: scene.code ? mine.code : null });
    },

    /**
     * Asks whether the scene of a link may take the place of the one that is
     * here. Gives true (open it), false (keep mine: also for Esc), or null:
     * another link came while this one still asked, and asks in its place.
     */
    ask(scene) {
      const question = $('#shared-dialog');
      if (asking) asking(null);
      const mine = shareData(hooks.data());
      const names = namesOf(scene.objects);
      $('#shared-theirs').replaceChildren(
        'This link holds a scene of ', h('b', {}, sizeOf(scene.objects)), names ? `: ${names}.` : '.',
        scene.code ? ` It also holds ${codeOf(scene.code, 'code typed by hand')} for the Code window.` : '');
      $('#shared-mine').replaceChildren(
        'It takes the place of the scene you have here (', h('b', {}, sizeOf(mine.objects)),
        '). Undo brings yours back while this page stays open. To keep yours for later, save it to a file first.');
      // (Undo is for the scene: what is in the Code window has no way back)
      $('#shared-code').hidden = !(scene.code && mine.code);
      $('#shared-saved').hidden = true;
      return new Promise((resolve) => {
        const answer = (open) => {
          if (asking !== answer) return;
          asking = null;
          // (the window stays up for the link that asks next)
          if (open !== null && question.open) question.close();
          resolve(open);
        };
        asking = answer;
        $('#shared-open').onclick = () => answer(true);
        $('#shared-keep').onclick = () => answer(false);
        $('#shared-save').onclick = () => { hooks.save(); $('#shared-saved').hidden = false; };
        // Esc. A browser may shut the window without asking first: then the news that it is shut is all there is,
        // and that comes a moment later, when the window can be up again for the next link.
        question.oncancel = () => answer(false);
        question.onclose = () => { if (!question.open) answer(false); };
        if (!question.open) question.showModal();
        $('#shared-open').focus();
      });
    },

    /** Shut the Share window: the link in it is not for the scene that is here any more. */
    hide() {
      turn++;
      if (dialog.open) dialog.close();
    },

    forget,
    /** For tests. */
    debug: () => ({ link: shown ? { ...shown } : null }),
  };
}
