// The Code window: nodes that say when and where the particle scene plays in
// the game, and the World Code they make. Pure (no DOM), so the tests can run
// what comes out.
//
// A graph is { nodes: [{ id, type, x, y, values }], wires: [{ from, out, to }] }.
// Nodes are joined by "Run" wires, from an output of one node to the input of
// the next: when the first is done, the next runs. An event starts a run (a
// player joins, clicks, hits a mob ...). What a node needs to know (which
// player, which mob, which block) comes from the event its run began with:
// nobody wires values. A node that needs a player in a run that has none says
// so (compileGraph gives the warnings), and "For each player" gives it one.
//
// The World Code that comes out
//   const psPlay = (pos, facing) => { ... }   the particle scene (js/codegen.js)
//   helpers the nodes need (waiting, cooldowns, places)
//   your own code, as it was typed (JavaScript, or TypeScript for index.ts)
//   the callbacks of the game: one for every kind of event that has a node
// When your own code sets a callback the nodes use too, both run: the nodes
// first, then yours.

import { generateCode, typedLine } from './codegen.js';

export const CATS = [
  { id: 'event', name: 'Events', colour: '#f2a31c', about: 'Something happens in the game: a run starts here.' },
  { id: 'loop', name: 'Loops', colour: '#18b6a4', about: 'Do something several times, or later.' },
  { id: 'logic', name: 'Logic', colour: '#9a6bff', about: 'Go on only if something is so.' },
  { id: 'particles', name: 'Particles', colour: '#ff5fa8', about: 'Play the scene you built.' },
  { id: 'action', name: 'Actions', colour: '#4f8dff', about: 'Other things the game can do.' },
];

/** A graph has at most this many nodes. */
export const MAX_NODES = 120;
/** World Code can be this long in one file. */
export const WORLD_CHARS = 64000;

// ---------------------------------------------------------------- what a run knows

/** Where something happens. `needs`: what the run has to know for it. */
export const PLACES = [
  { id: 'player', name: 'at the player', needs: ['player'], code: () => 'api.getPosition(playerId)' },
  { id: 'eyes', name: 'in front of the player\'s eyes', needs: ['player'], code: () => 'psAhead(playerId, 2)', uses: ['psAhead'] },
  { id: 'look', name: 'on the block the player looks at', needs: ['player'], code: () => 'psAim(playerId)', uses: ['psAim'] },
  { id: 'target', name: 'at the mob or player it is about', needs: ['target'], code: () => '(targetId == null ? null : api.getPosition(targetId))' },
  { id: 'spot', name: 'on the block it is about', needs: ['spot'], code: () => 'spot' },
  { id: 'fixed', name: 'at a fixed place', needs: [], code: (pos) => `[${pos.map(num).join(', ')}]` },
];

/** Which way the scene is turned. */
export const FACINGS = [
  { id: 'none', name: 'as built', needs: [] },
  { id: 'look', name: 'the way the player looks', needs: ['player'], code: 'api.getPlayerFacingInfo(playerId).dir' },
  { id: 'toTarget', name: 'from the player to what it is about', needs: ['player', 'target'], code: 'psWay(api.getPosition(playerId), api.getPosition(targetId))', uses: ['psWay'] },
  { id: 'random', name: 'a random way round', needs: [], code: 'psSpin()', uses: ['psSpin'] },
];

const KNOWS = { player: 'which player', target: 'which mob or player it is about', spot: 'which block' };

const num = (v) => String(Number(Number(v).toFixed(3)) + 0);
const text = (v) => JSON.stringify(String(v));

// ---------------------------------------------------------------- fields

const number = (key, label, value, min, max, step, unit = '') => ({ key, label, kind: 'number', value, min, max, step, unit });
const choice = (key, label, options, value) => ({ key, label, kind: 'choice', options, value });
const words = (key, label, value, hint = '') => ({ key, label, kind: 'text', value, hint });
const check = (key, label, value) => ({ key, label, kind: 'check', value });
const vec = (key, label, value) => ({ key, label, kind: 'vec', value });
const when = (field, test) => ({ ...field, when: test });
const placeFields = (value = 'player') => [
  choice('place', 'Where', PLACES.map(({ id, name }) => ({ id, name })), value),
  when(vec('pos', 'Place', [0, 0, 0]), (v) => v.place === 'fixed'),
];

// ---------------------------------------------------------------- the nodes

const EVERYONE = [{ id: 'player', name: 'the player' }, { id: 'all', name: 'everyone' }];
const WHO = [{ id: 'player', name: 'the player' }, { id: 'target', name: 'the mob or player it is about' }];

/**
 * Every kind of node.
 *   id, name, cat, about
 *   fields : what is typed or chosen on the node
 *   outs   : its outputs [{ id, name }] (none: it has one, "then")
 *   event  : for an event: { callback, params, gives, lines(v, c) }
 *            gives: what a run that starts here knows ('player', 'target', 'spot')
 *            lines: code at the start of the run that works out `spot` and such
 *            test(v, c): the condition under which the run starts (none: always)
 *   run(v, c) : for the others: the lines of code. c.then(out) gives the lines of
 *            what is wired to an output; c.needs(...) says what the run must know.
 */
export const NODE_TYPES = [
  // ---- events
  {
    id: 'join', name: 'When a player joins', cat: 'event', about: 'Runs once for every player who comes into the world.',
    fields: [], event: { callback: 'onPlayerJoin', params: ['playerId'], gives: ['player'] },
  },
  {
    id: 'click', name: 'When a player clicks', cat: 'event',
    about: 'Runs when a player clicks. On a touch screen every click counts as a left click.',
    fields: [choice('button', 'Which', [{ id: 'any', name: 'any click' }, { id: 'left', name: 'left click' }, { id: 'right', name: 'right click' }], 'any')],
    event: {
      callback: 'onPlayerClick', params: ['playerId', 'wasAltClick', 'x', 'y', 'z', 'block', 'targetId'], gives: ['player', 'target', 'spot'],
      spot: true,
      test: (v) => (v.button === 'left' ? '!wasAltClick' : v.button === 'right' ? 'wasAltClick' : ''),
    },
  },
  {
    id: 'use', name: 'When a player uses something', cat: 'event',
    about: 'Right click, the interact key (E) or a tap. The game repeats this while the key is held, so it runs at most once in the time you set.',
    fields: [number('gap', 'At most every', 0.5, 0.05, 600, 0.1, 'seconds')],
    event: {
      callback: 'onPlayerAltAction', params: ['playerId', 'x', 'y', 'z', 'block', 'targetId'], gives: ['player', 'target', 'spot'], spot: true,
      test: (v, c) => { c.use('psCool'); return `psCool(${text(`${c.key} `)} + playerId, ${num(v.gap)})`; },
    },
  },
  {
    id: 'chat', name: 'When a player says', cat: 'event', about: 'Runs when a player sends a chat message. Good for commands like !fx.',
    fields: [
      choice('match', 'The message', [{ id: 'is', name: 'is exactly' }, { id: 'starts', name: 'starts with' }, { id: 'has', name: 'contains' }, { id: 'any', name: 'is anything' }], 'is'),
      when(words('text', 'Text', '!fx'), (v) => v.match !== 'any'),
      check('hide', 'hide the message from the chat', true),
    ],
    event: {
      callback: 'onPlayerChat', params: ['playerId', 'chatMessage'], gives: ['player'],
      test: (v) => (v.match === 'any' ? '' : v.match === 'starts' ? `chatMessage.startsWith(${text(v.text)})`
        : v.match === 'has' ? `chatMessage.includes(${text(v.text)})` : `chatMessage === ${text(v.text)}`),
    },
  },
  {
    id: 'jump', name: 'When a player jumps', cat: 'event', about: 'Runs every time a player jumps.',
    fields: [], event: { callback: 'onPlayerJump', params: ['playerId'], gives: ['player'] },
  },
  {
    id: 'hitMob', name: 'When a player hits a mob', cat: 'event', about: 'Runs when a player damages a mob. "What it is about" is the mob.',
    fields: [], event: { callback: 'onPlayerDamagingMob', params: ['playerId', 'targetId'], gives: ['player', 'target'] },
  },
  {
    id: 'killMob', name: 'When a player kills a mob', cat: 'event', about: 'Runs when a player kills a mob. "What it is about" is the mob.',
    fields: [], event: { callback: 'onPlayerKilledMob', params: ['playerId', 'targetId'], gives: ['player', 'target'] },
  },
  {
    id: 'hitPlayer', name: 'When a player hits a player', cat: 'event',
    about: 'Runs when a player damages another player. "The player" is the one who hits, "what it is about" the one who is hit.',
    fields: [], event: { callback: 'onPlayerDamagingOtherPlayer', params: ['playerId', 'targetId'], gives: ['player', 'target'] },
  },
  {
    id: 'killPlayer', name: 'When a player kills a player', cat: 'event',
    about: 'Runs when a player kills another player. "The player" is the one who won, "what it is about" the one who lost.',
    fields: [], event: { callback: 'onPlayerKilledOtherPlayer', params: ['playerId', 'targetId'], gives: ['player', 'target'] },
  },
  {
    id: 'mobHits', name: 'When a mob hits a player', cat: 'event', about: 'Runs when a mob damages a player. "What it is about" is the mob.',
    fields: [], event: { callback: 'onMobDamagingPlayer', params: ['targetId', 'playerId'], gives: ['player', 'target'] },
  },
  {
    id: 'stand', name: 'When a player stands on', cat: 'event',
    about: 'Runs while a player stands on a block, at most once in the time you set. Leave the name empty for any block.',
    fields: [words('block', 'Block', '', 'any block'), number('gap', 'At most every', 1, 0.05, 600, 0.1, 'seconds')],
    event: {
      callback: 'onBlockStand', params: ['playerId', 'x', 'y', 'z', 'block'], gives: ['player', 'spot'], spot: true,
      test: (v, c) => {
        c.use('psCool');
        return `${v.block.trim() ? `block === ${text(v.block.trim())} && ` : ''}psCool(${text(`${c.key} `)} + playerId, ${num(v.gap)})`;
      },
    },
  },
  {
    id: 'lands', name: 'When something thrown lands', cat: 'event',
    about: 'Runs when a snowball, an arrow or another thrown thing hits the ground. "What it is about" is the thing that was thrown. Leave the name empty for any.',
    fields: [words('item', 'Thrown', '', 'anything')],
    event: {
      callback: 'onPlayerThrowableHitTerrain', params: ['playerId', 'thrown', 'targetId'], gives: ['player', 'target'],
      test: (v) => (v.item.trim() ? `thrown === ${text(v.item.trim())}` : ''),
    },
  },
  {
    id: 'charged', name: 'When a player lets a charged item go', cat: 'event',
    about: 'Runs when a player has charged an item (a bow) and uses it. Leave the name empty for any item.',
    fields: [words('item', 'Item', '', 'any item')],
    event: {
      callback: 'onPlayerFinishChargingItem', params: ['playerId', 'used', 'item'], gives: ['player'],
      test: (v) => `used${v.item.trim() ? ` && item === ${text(v.item.trim())}` : ''}`,
    },
  },
  {
    id: 'every', name: 'Every', cat: 'event', about: 'Runs again and again, for as long as the world is open. It has no player: use "For each player" after it.',
    fields: [number('seconds', 'Every', 2, 0.05, 3600, 0.1, 'seconds')], event: { callback: 'tick', params: ['ms'], gives: [] },
  },
  {
    id: 'start', name: 'When the world starts', cat: 'event', about: 'Runs once, when the World Code starts. It has no player.',
    fields: [], event: { callback: null, params: [], gives: [] },
  },
  // ---- loops
  {
    id: 'forEach', name: 'For each player', cat: 'loop', about: 'Runs what follows once for every player in the world.',
    fields: [], outs: [{ id: 'each', name: 'Each player' }, { id: 'done', name: 'Done' }],
    run: (v, c) => [
      'for (const playerId of api.getPlayerIds()) {',
      ...c.then('each', { gives: ['player'] }).map(indent),
      '}',
      ...c.then('done'),
    ],
  },
  {
    id: 'repeat', name: 'Repeat', cat: 'loop', about: 'Runs what follows several times, with a pause in between.',
    fields: [number('times', 'Times', 3, 1, 200, 1), number('gap', 'Pause', 0.5, 0, 600, 0.1, 'seconds')],
    outs: [{ id: 'each', name: 'Each time' }, { id: 'done', name: 'Done' }],
    run: (v, c) => {
      const times = Math.round(v.times);
      const each = c.then('each');
      const done = c.then('done');
      if (!(v.gap > 0)) return [`for (let turn = 0; turn < ${times}; turn++) {`, ...each.map(indent), '}', ...done];
      c.use('psLater');
      return [
        `for (let turn = 0; turn < ${times}; turn++) {`,
        `  psLater(turn * ${num(v.gap)}, () => {`,
        ...each.map(indent).map(indent),
        '  })',
        '}',
        ...(done.length ? [`psLater(${num(times * v.gap)}, () => {`, ...done.map(indent), '})'] : []),
      ];
    },
  },
  {
    id: 'wait', name: 'Wait', cat: 'loop', about: 'Waits, then goes on.',
    fields: [number('seconds', 'For', 1, 0.05, 3600, 0.1, 'seconds')],
    run: (v, c) => {
      const then = c.then('out');
      if (!then.length) return [];
      c.use('psLater');
      return [`psLater(${num(v.seconds)}, () => {`, ...then.map(indent), '})'];
    },
  },
  // ---- logic
  {
    id: 'if', name: 'If', cat: 'logic', about: 'Goes one way when it is so, the other way when it is not.',
    fields: [
      choice('test', 'If', [
        { id: 'chance', name: 'luck says so' }, { id: 'crouch', name: 'the player is crouching' }, { id: 'holds', name: 'the player holds' },
        { id: 'near', name: 'the player is near' }, { id: 'type', name: 'what it is about is a' },
      ], 'chance'),
      when(number('chance', 'Chance', 50, 0, 100, 1, 'percent'), (v) => v.test === 'chance'),
      when(words('item', 'Item', 'Stick'), (v) => v.test === 'holds'),
      ...placeFields('fixed').map((f) => when(f, (v) => v.test === 'near' && (!f.when || f.when(v)))),
      when(number('far', 'Within', 5, 0, 1000, 0.5, 'blocks'), (v) => v.test === 'near'),
      when(words('kind', 'Kind', 'Pig'), (v) => v.test === 'type'),
    ],
    outs: [{ id: 'yes', name: 'Yes' }, { id: 'no', name: 'No' }],
    run: (v, c) => {
      let test = `Math.random() * 100 < ${num(v.chance)}`;
      if (v.test === 'crouch') test = c.needs('player') && 'api.isPlayerCrouching(playerId)';
      else if (v.test === 'holds') { test = c.needs('player') && `psHeld(playerId) === ${text(v.item.trim())}`; c.use('psHeld'); }
      else if (v.test === 'type') test = c.needs('target') && `targetId != null && api.getEntityType(targetId) === ${text(v.kind.trim())}`;
      else if (v.test === 'near') {
        const place = c.place(v);
        test = c.needs('player') && place && `psNear(api.getPosition(playerId), ${place}, ${num(v.far)})`;
        c.use('psNear');
      }
      if (!test) return [];
      const yes = c.then('yes');
      const no = c.then('no');
      if (!yes.length && !no.length) return [];
      if (!yes.length) return [`if (!(${test})) {`, ...no.map(indent), '}'];
      return [`if (${test}) {`, ...yes.map(indent), ...(no.length ? ['} else {', ...no.map(indent)] : []), '}'];
    },
  },
  {
    id: 'cooldown', name: 'Not too often', cat: 'logic', about: 'Lets a run through, then stops the next ones until the time is over.',
    fields: [number('seconds', 'At most every', 3, 0.05, 3600, 0.1, 'seconds'), choice('who', 'Counted', [{ id: 'each', name: 'for each player' }, { id: 'all', name: 'for everyone together' }], 'each')],
    run: (v, c) => {
      const then = c.then('out');
      if (!then.length) return [];
      if (v.who === 'each' && !c.needs('player')) return [];
      c.use('psCool');
      return [`if (psCool(${text(`${c.key} `)}${v.who === 'each' ? ' + playerId' : ''}, ${num(v.seconds)})) {`, ...then.map(indent), '}'];
    },
  },
  // ---- particles
  {
    id: 'play', name: 'Play the particles', cat: 'particles',
    about: 'Plays the scene you built. The place is where the middle of the floor of the studio\'s code block goes: a scene built around the block plays around that place.',
    fields: [
      ...placeFields('player'),
      vec('shift', 'Moved by', [0, 0, 0]),
      choice('facing', 'Turned', FACINGS.map(({ id, name }) => ({ id, name })), 'none'),
      when(check('upright', 'stays upright', true), (v) => v.facing !== 'none' && v.facing !== 'random'),
    ],
    run: (v, c) => {
      const place = c.place(v);
      const facing = FACINGS.find((f) => f.id === v.facing) || FACINGS[0];
      if (!place || !c.needs(...facing.needs)) return c.then('out');
      for (const name of facing.uses || []) c.use(name);
      let way = facing.code || '';
      if (way && v.upright && facing.id !== 'random') { way = `psFlat(${way})`; c.use('psFlat'); }
      const moved = v.shift.some((x) => x !== 0);
      const at = moved ? `[at[0] + ${num(v.shift[0])}, at[1] + ${num(v.shift[1])}, at[2] + ${num(v.shift[2])}]` : 'at';
      return ['{', `  const at = ${place}`, `  if (at) psPlay(${at}${way ? `, ${way}` : ''})`, '}', ...c.then('out')];
    },
  },
  // ---- actions
  {
    id: 'message', name: 'Send a message', cat: 'action', about: 'Writes a line into the chat. {player} becomes the name of the player.',
    fields: [words('text', 'Text', 'Hello {player}!'), choice('to', 'To', EVERYONE, 'player')],
    run: (v, c) => {
      const named = v.text.includes('{player}');
      if ((named || v.to === 'player') && !c.needs('player')) return c.then('out');
      const said = named ? v.text.split('{player}').map(text).join(' + api.getEntityName(playerId) + ') : text(v.text);
      return [v.to === 'all' ? `api.broadcastMessage(${said})` : `api.sendMessage(playerId, ${said})`, ...c.then('out')];
    },
  },
  {
    id: 'sound', name: 'Play a sound', cat: 'action', about: 'Plays one of the game\'s sounds. The names are in the Bloxd docs: Sounds and Music.',
    fields: [words('name', 'Sound', 'levelUp'), number('volume', 'Volume', 1, 0, 1, 0.05), number('rate', 'Speed', 1, 0.5, 4, 0.05), choice('to', 'Heard by', EVERYONE, 'player')],
    run: (v, c) => {
      if (!c.needs('player')) return c.then('out');
      const call = v.to === 'all'
        ? `api.broadcastSound(${text(v.name.trim())}, ${num(v.volume)}, ${num(v.rate)}, { playerIdOrPos: playerId })`
        : `api.playSound(playerId, ${text(v.name.trim())}, ${num(v.volume)}, ${num(v.rate)})`;
      return [call, ...c.then('out')];
    },
  },
  {
    id: 'push', name: 'Push', cat: 'action', about: 'Gives the player, or the mob it is about, a shove.',
    fields: [
      choice('who', 'Push', WHO, 'player'),
      choice('way', 'Which way', [{ id: 'up', name: 'up' }, { id: 'ahead', name: 'the way the player looks' }, { id: 'back', name: 'back from where the player looks' }], 'up'),
      number('power', 'Power', 8, 0, 100, 0.5),
    ],
    run: (v, c) => {
      const id = v.who === 'target' ? 'targetId' : 'playerId';
      if (!c.needs(v.who === 'target' ? 'target' : 'player') || (v.way !== 'up' && !c.needs('player'))) return c.then('out');
      const guard = v.who === 'target' ? 'if (targetId != null) ' : '';
      if (v.way === 'up') return [`${guard}api.applyImpulse(${id}, 0, ${num(v.power)}, 0)`, ...c.then('out')];
      const power = num(v.way === 'back' ? -v.power : v.power);
      return [
        '{',
        '  const way = api.getPlayerFacingInfo(playerId).dir',
        `  ${guard}api.applyImpulse(${id}, way[0] * ${power}, way[1] * ${power}, way[2] * ${power})`,
        '}',
        ...c.then('out'),
      ];
    },
  },
  {
    id: 'health', name: 'Change health', cat: 'action', about: 'Heals (a number above 0) or hurts (below 0) the player, or the mob it is about.',
    fields: [choice('who', 'Of', WHO, 'player'), number('amount', 'By', 10, -1000, 1000, 1)],
    run: (v, c) => {
      if (!c.needs(v.who === 'target' ? 'target' : 'player')) return c.then('out');
      const call = `api.applyHealthChange(${v.who === 'target' ? 'targetId' : 'playerId'}, ${Math.round(v.amount)})`;
      return [v.who === 'target' ? `if (targetId != null) ${call}` : call, ...c.then('out')];
    },
  },
  {
    id: 'code', name: 'Run your own code', cat: 'action',
    about: 'A few lines of your own. In a run with a player they can use playerId; psPlay(pos, facing) plays the particles; api is the game.',
    fields: [{ key: 'code', label: 'Code', kind: 'code', value: 'api.broadcastMessage("It works!")' }],
    run: (v, c) => {
      const lines = String(v.code).replace(/\r/g, '').split('\n').filter((line) => line.trim());
      return [...(lines.length ? ['{', ...lines.map((line) => RAW + indent(line)), '}'] : []), ...c.then('out')];
    },
  },
];

export const NODE_BY_ID = Object.fromEntries(NODE_TYPES.map((t) => [t.id, t]));
/** The outputs of a kind of node: [{ id, name }]. */
export const outsOf = (type) => type.outs || [{ id: 'out', name: '' }];

const indent = (line) => `  ${line}`;
/** Marks a line that was typed by the user: it goes into the code as it is, also in TypeScript. */
const RAW = '\u0001';

// ---------------------------------------------------------------- helpers in the World Code

// (written only when a node uses them; `needs`: other helpers they call)
const HELPERS = {
  psLater: {
    lines: [
      '// psLater(seconds, run): do something later',
      'const psQueue = []',
      'const psLater = (seconds, run) => psQueue.push([api.now() + seconds * 1000, run])',
    ],
    typed: ['// psLater(seconds, run): do something later', 'const psQueue: any[] = []', 'const psLater = (seconds: number, run: () => void) => psQueue.push([api.now() + seconds * 1000, run])'],
    tick: [
      'for (let i = psQueue.length - 1; i >= 0; i--) {',
      '  if (psQueue[i][0] <= api.now()) psQueue.splice(i, 1)[0][1]()',
      '}',
    ],
  },
  psCool: {
    lines: [
      '// psCool(key, seconds): true at most once in that time for a key',
      'const psLast = {}',
      'const psCool = (key, seconds) => {',
      '  if (psLast[key] > api.now() - seconds * 1000) return false',
      '  psLast[key] = api.now()',
      '  return true',
      '}',
    ],
    typed: [
      '// psCool(key, seconds): true at most once in that time for a key',
      'const psLast: any = {}',
      'const psCool = (key: string, seconds: number) => {',
      '  if (psLast[key] > api.now() - seconds * 1000) return false',
      '  psLast[key] = api.now()',
      '  return true',
      '}',
    ],
  },
  psHeld: {
    lines: [
      '// psHeld(id): the name of the item a player holds (none: "")',
      'const psHeld = (id) => {',
      '  const item = api.getHeldItem(id)',
      '  return item ? item.name : \'\'',
      '}',
    ],
  },
  psAhead: {
    lines: [
      '// psAhead(id, far): the place that far in front of a player\'s eyes',
      'const psAhead = (id, far) => {',
      '  const { camPos, dir } = api.getPlayerFacingInfo(id)',
      '  return camPos.map((v, j) => v + dir[j] * far)',
      '}',
    ],
  },
  psAim: {
    lines: [
      '// psAim(id): the top of the block a player looks at (none: where the player is)',
      'const psAim = (id) => {',
      '  const hit = api.getPlayerTargetInfo(id)',
      '  if (!hit || !hit.position) return api.getPosition(id)',
      '  return [hit.position[0] + 0.5, hit.position[1] + 1, hit.position[2] + 0.5]',
      '}',
    ],
  },
  psWay: { lines: ['const psWay = (from, to) => to.map((v, j) => v - from[j])'] },
  psFlat: { lines: ['const psFlat = (way) => [way[0], 0, way[2]]'] },
  psSpin: {
    lines: [
      'const psSpin = () => {',
      '  const turn = Math.random() * 2 * Math.PI',
      '  return [Math.sin(turn), 0, Math.cos(turn)]',
      '}',
    ],
  },
  psNear: {
    lines: [
      'const psNear = (a, b, far) => !!a && !!b',
      '  && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= far',
    ],
  },
};
const HELPER_ORDER = Object.keys(HELPERS);

// ---------------------------------------------------------------- loading

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const finite = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback);

/** The value of a field as loaded from a file, repaired. */
function sanitizeValue(field, raw) {
  switch (field.kind) {
    case 'number': return clamp(finite(raw, field.value), field.min, field.max);
    case 'choice': return field.options.some((o) => o.id === raw) ? raw : field.value;
    case 'check': return typeof raw === 'boolean' ? raw : field.value;
    case 'vec': return field.value.map((fallback, i) => clamp(finite(Array.isArray(raw) ? raw[i] : undefined, fallback), -100000, 100000));
    case 'code': return typeof raw === 'string' ? raw.slice(0, 4000) : field.value;
    default: return typeof raw === 'string' ? raw.slice(0, 300) : field.value;
  }
}

/** The values a new node of a kind starts with. */
export function defaultValues(type) {
  return Object.fromEntries(type.fields.map((f) => [f.key, Array.isArray(f.value) ? f.value.slice() : f.value]));
}

let made = 0;
export const newNodeId = () => `n${Date.now().toString(36)}${(made++).toString(36)}`;

/** A new node of a kind at a place. */
export function createNode(typeId, x = 0, y = 0, values = {}) {
  const type = NODE_BY_ID[typeId];
  if (!type) return null;
  return { id: newNodeId(), type: type.id, x: Math.round(x), y: Math.round(y), values: { ...defaultValues(type), ...values } };
}

/** A graph as loaded from a file, repaired: every node is of a kind there is, every wire joins two nodes that are there. */
export function sanitizeGraph(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const nodes = [];
  const ids = new Set();
  for (const n of Array.isArray(o.nodes) ? o.nodes : []) {
    const type = n && typeof n === 'object' ? NODE_BY_ID[n.type] : null;
    if (!type || nodes.length >= MAX_NODES) continue;
    let id = typeof n.id === 'string' && /^[\w-]{1,40}$/.test(n.id) ? n.id : newNodeId();
    while (ids.has(id)) id = newNodeId();
    ids.add(id);
    const values = {};
    for (const f of type.fields) values[f.key] = sanitizeValue(f, n.values && typeof n.values === 'object' ? n.values[f.key] : undefined);
    nodes.push({ id, type: type.id, x: Math.round(clamp(finite(n.x, 0), -20000, 20000)), y: Math.round(clamp(finite(n.y, 0), -20000, 20000)), values });
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const wires = [];
  const seen = new Set();
  for (const w of Array.isArray(o.wires) ? o.wires : []) {
    const from = w && byId.get(w.from);
    const to = w && byId.get(w.to);
    if (!from || !to || from === to || NODE_BY_ID[to.type].event) continue; // (an event has no input)
    if (!outsOf(NODE_BY_ID[from.type]).some((out) => out.id === w.out)) continue;
    const key = `${w.from} ${w.out} ${w.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    wires.push({ from: w.from, out: w.out, to: w.to });
  }
  return { nodes, wires };
}

/** The Code window's part of a saved scene, repaired: { graph, own, lang }. */
export function sanitizeCode(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    graph: sanitizeGraph(o.graph),
    own: typeof o.own === 'string' ? o.own.slice(0, 200000) : '',
    lang: o.lang === 'ts' ? 'ts' : 'js',
  };
}

// ---------------------------------------------------------------- from the graph to code

/**
 * The code a graph stands for.
 *   options: { typed (TypeScript), own (your own code: callbacks it sets are kept) }
 * returns {
 *   helpers  : lines of the helpers the nodes use
 *   lines    : lines of the callbacks (and of what runs when the world starts)
 *   warnings : [{ node (id), text }]
 *   idle     : ids of the nodes no event leads to: they do nothing
 * }
 */
export function compileGraph(graph, options = {}) {
  const typed = !!options.typed;
  const own = String(options.own || '');
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const warnings = [];
  const used = new Set();
  // the nodes an event leads to, by any way: the others do nothing
  const reached = new Set(graph.nodes.filter((n) => NODE_BY_ID[n.type].event).map((n) => n.id));
  for (const id of reached) for (const w of graph.wires) if (w.from === id) reached.add(w.to);
  const warn = (node, words) => {
    if (!warnings.some((w) => w.node === node.id && w.text === words)) warnings.push({ node: node.id, text: words });
  };
  /** A short name for a node in the code (for what it has to remember): its number in the graph. */
  const keyOf = (node) => `n${graph.nodes.indexOf(node) + 1}`;
  /** What is wired to an output of a node, from the top of the picture down. */
  const wired = (node, out) => graph.wires.filter((w) => w.from === node.id && w.out === out).map((w) => byId.get(w.to)).filter(Boolean)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  /** The lines of a node and of what follows it. knows: what the run knows; path: the nodes it came through. */
  const linesOf = (node, knows, path) => {
    const type = NODE_BY_ID[node.type];
    if (path.includes(node.id)) { warn(node, 'The wires go round in a circle here. This node is left out the second time.'); return []; }
    const next = [...path, node.id];
    const c = {
      node,
      key: keyOf(node),
      use: (name) => used.add(name),
      then: (out, more = {}) => {
        const sees = more.gives ? new Set([...knows, ...more.gives]) : knows;
        return wired(node, out).flatMap((to) => linesOf(to, sees, next));
      },
      needs: (...what) => {
        const missing = what.filter((w) => !knows.has(w));
        for (const w of missing) {
          warn(node, w === 'player'
            ? `"${type.name}" does not know which player to use: this run has none. Put "For each player" before it.`
            : `"${type.name}" does not know ${KNOWS[w]}: the event this run starts with does not say.`);
        }
        return !missing.length;
      },
      place: (v) => {
        const place = PLACES.find((p) => p.id === v.place) || PLACES[0];
        if (!c.needs(...place.needs)) return '';
        for (const name of place.uses || []) used.add(name);
        return place.code(v.pos || [0, 0, 0]);
      },
    };
    return [`// ${type.name}`, ...type.run(node.values, c)];
  };

  // the events, callback by callback, in the order the kinds of event are listed
  const events = graph.nodes.filter((n) => NODE_BY_ID[n.type].event).sort((a, b) => a.y - b.y || a.x - b.x);
  const byCallback = new Map();
  for (const node of events) {
    const { event } = NODE_BY_ID[node.type];
    const list = byCallback.get(event.callback) || [];
    list.push(node);
    byCallback.set(event.callback, list);
  }
  const startLines = [];
  const tickLines = [];
  const callbacks = [];
  let timers = 0;
  for (const type of NODE_TYPES.filter((t) => t.event)) {
    const nodes = (byCallback.get(type.event.callback) || []).filter((n) => n.type === type.id);
    for (const node of nodes) {
      const { event } = type;
      const c = { node, key: keyOf(node), use: (name) => used.add(name) };
      const body = wired(node, 'out').flatMap((to) => linesOf(to, new Set(event.gives), [node.id]));
      if (type.id === 'start') { startLines.push(`// ${type.name}`, '{', ...body.map(indent), '}'); continue; }
      if (type.id === 'every') {
        const n = timers++;
        tickLines.push(
          `// ${type.name} ${num(node.values.seconds)} seconds`,
          `psEvery[${n}] -= ms`,
          `if (psEvery[${n}] <= 0) {`,
          `  psEvery[${n}] += ${Math.round(node.values.seconds * 1000)}`,
          ...body.map(indent),
          '}',
        );
        continue;
      }
      let entry = callbacks.find((cb) => cb.name === event.callback);
      if (!entry) callbacks.push(entry = { name: event.callback, params: event.params, lines: [], spot: false, hides: false });
      const test = event.test ? event.test(node.values, c) : '';
      if (event.spot) entry.spot = true;
      const hide = type.id === 'chat' && node.values.hide;
      if (hide) entry.hides = true;
      const inner = [...(hide ? ['psHide = true'] : []), ...body];
      entry.lines.push(`// ${type.name}`, test ? `if (${test}) {` : '{', ...inner.map(indent), '}');
    }
  }

  const helpers = [];
  for (const name of HELPER_ORDER) {
    if (!used.has(name)) continue;
    const h = HELPERS[name];
    helpers.push(...(typed && h.typed ? h.typed : h.lines));
  }
  if (timers) helpers.push(`const psEvery = [${new Array(timers).fill(0).join(', ')}]`);

  /** your own code sets this callback too: then both run */
  const ownHas = (name) => new RegExp(`(^|[^\\w$.])${name}\\s*=[^=>]|\\bfunction\\s+${name}\\b`).test(own);
  const lines = [];
  const keep = (name) => `psOwn${name[0].toUpperCase()}${name.slice(1)}`;
  const tick = [...(used.has('psLater') ? HELPERS.psLater.tick : []), ...tickLines];
  if (tick.length) callbacks.unshift({ name: 'tick', params: ['ms'], lines: tick, spot: false, hides: false });
  for (const cb of callbacks) {
    const mine = ownHas(cb.name);
    if (mine) lines.push(`const ${keep(cb.name)} = ${cb.name} // what your own code does then`);
    const params = mine ? [...cb.params, '...more'] : cb.params;
    lines.push(`${cb.name} = (${params.join(', ')}) => {`);
    if (cb.spot) lines.push('  const spot = x === undefined ? null : [x + 0.5, y + 1, z + 0.5]');
    if (cb.hides) lines.push('  let psHide = false');
    lines.push(...cb.lines.map(indent));
    if (mine && cb.hides) lines.push(`  const said = ${keep(cb.name)}(${params.join(', ')})`, '  return psHide ? false : said');
    else if (mine) lines.push(`  return ${keep(cb.name)}(${params.join(', ')})`);
    else if (cb.hides) lines.push('  if (psHide) return false');
    lines.push('}');
  }
  lines.push(...startLines);

  const finish = (line) => (line.includes(RAW) ? line.replace(RAW, '') : typed ? typedLine(line) : line);
  return {
    helpers: helpers.map(finish),
    lines: lines.map(finish),
    warnings,
    idle: graph.nodes.filter((n) => !reached.has(n.id)).map((n) => n.id),
  };
}

/**
 * The whole World Code: the particle scene as a function, the helpers, your
 * own code and the callbacks the nodes make.
 *   objects : the scene
 *   code    : { graph, own, lang } (see sanitizeCode)
 *   options : { precision, hideDist } of the export
 * returns { code, chars, particles, seconds, warnings, idle, file (the name of the file it belongs in) }
 */
export function worldCode(objects, code, options = {}) {
  const typed = code.lang === 'ts';
  const scene = generateCode(objects, { precision: options.precision || 100, hideDist: options.hideDist || 0, target: 'function', typed });
  const own = String(code.own || '').replace(/\r/g, '').replace(/\s+$/, '');
  const made = compileGraph(code.graph, { typed, own });
  const parts = [
    `// World Code (F8)${typed ? ', TypeScript: rename index.js to index.ts first' : ''}. Made with Bloxd Particle Studio.`,
    scene.parts[0].code,
  ];
  if (made.helpers.length) parts.push('', '// ---- helpers', ...made.helpers);
  if (own.trim()) parts.push('', '// ---- your own code', own);
  if (made.lines.length) parts.push('', '// ---- what the nodes say', ...made.lines);
  const text = parts.join('\n');
  return {
    code: text, chars: text.length, particles: scene.particles, seconds: scene.seconds,
    warnings: made.warnings, idle: made.idle, file: typed ? 'index.ts' : 'index.js',
  };
}

/** Graphs to start from. Positions are in the picture's own pixels. */
export const NODE_EXAMPLES = [
  {
    id: 'aura', name: 'An aura on every player',
    about: 'Every 2 seconds the scene plays around each player. Build it around the code block, lasting about 2 seconds.',
    nodes: [['every', 40, 60, { seconds: 2 }], ['forEach', 330, 60, {}], ['play', 620, 40, { place: 'player' }]],
    wires: [[0, 'out', 1], [1, 'each', 2]],
  },
  {
    id: 'wand', name: 'A wand: right click to cast',
    about: 'A player who holds a Stick and right clicks plays the scene where they look, turned the way they look.',
    nodes: [
      ['click', 40, 60, { button: 'right' }], ['if', 330, 60, { test: 'holds', item: 'Stick' }], ['cooldown', 620, 40, { seconds: 1, who: 'each' }],
      ['play', 910, 40, { place: 'eyes', facing: 'look', upright: false }],
    ],
    wires: [[0, 'out', 1], [1, 'yes', 2], [2, 'out', 3]],
  },
  {
    id: 'command', name: 'A chat command',
    about: 'Whoever types !fx gets the scene, three times in a row.',
    nodes: [['chat', 40, 60, { match: 'is', text: '!fx', hide: true }], ['repeat', 330, 60, { times: 3, gap: 1 }], ['play', 620, 40, { place: 'player' }], ['message', 620, 330, { text: 'Done, {player}!', to: 'player' }]],
    wires: [[0, 'out', 1], [1, 'each', 2], [1, 'done', 3]],
  },
  {
    id: 'hit', name: 'A burst on every hit',
    about: 'When a player hits a mob, the scene plays at the mob, turned from the player towards it.',
    nodes: [['hitMob', 40, 60, {}], ['play', 330, 40, { place: 'target', facing: 'toTarget' }]],
    wires: [[0, 'out', 1]],
  },
  {
    id: 'welcome', name: 'A welcome',
    about: 'A player who joins gets a message and, a moment later, the scene.',
    nodes: [['join', 40, 60, {}], ['message', 330, 60, { text: 'Welcome, {player}!', to: 'all' }], ['wait', 620, 60, { seconds: 2 }], ['play', 910, 40, { place: 'player' }]],
    wires: [[0, 'out', 1], [1, 'out', 2], [2, 'out', 3]],
  },
];

/** The graph of an example, with fresh ids. */
export function exampleGraph(example) {
  const nodes = example.nodes.map(([type, x, y, values]) => createNode(type, x, y, values));
  return sanitizeGraph({ nodes, wires: example.wires.map(([from, out, to]) => ({ from: nodes[from].id, out, to: nodes[to].id })) });
}
