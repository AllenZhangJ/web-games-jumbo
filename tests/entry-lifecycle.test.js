import test from 'node:test';
import assert from 'node:assert/strict';
import { launchGame, stopLaunchedGame } from '../src/entry/launch-game.js';
import { showMiniGameStartupError } from '../src/entry/mini-game-startup-fallback.js';
import { clearWebStartupError, showWebStartupError } from '../src/entry/web-startup-fallback.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function fakeGame(start = async () => {}) {
  return {
    starts: 0,
    destroys: 0,
    async start() {
      this.starts += 1;
      return start();
    },
    destroy() {
      this.destroys += 1;
    },
  };
}

test('entry startup handles synchronous platform failure without an unhandled rejection', async () => {
  const root = {};
  const errors = [];
  const result = await launchGame(() => { throw new Error('WebGL2 unavailable'); }, {
    root,
    createGame: () => { throw new Error('must not construct'); },
    onError: (error) => errors.push(error.message),
  });
  assert.equal(result, null);
  assert.deepEqual(errors, ['WebGL2 unavailable']);
  assert.equal(root.__NUMBER_STRATEGY_GAME__, null);
});

test('entry startup destroys a partially started game when start rejects', async () => {
  const root = {};
  const game = fakeGame(async () => { throw new Error('load failed'); });
  const result = await launchGame(() => ({ id: 'test' }), {
    root,
    createGame: () => game,
  });
  assert.equal(result, null);
  assert.equal(game.starts, 1);
  assert.equal(game.destroys, 1);
});

test('a replacement launch does not wait for a stale pending start and destroys it immediately', async () => {
  const root = {};
  const gate = deferred();
  const first = fakeGame(() => gate.promise);
  const second = fakeGame();
  const firstLaunch = launchGame(() => ({ id: 'first' }), {
    root,
    createGame: () => first,
  });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(first.starts, 1);

  const secondLaunch = launchGame(() => ({ id: 'second' }), {
    root,
    createGame: () => second,
  });
  assert.equal(first.destroys, 1);
  assert.equal(await secondLaunch, second);
  assert.equal(root.__NUMBER_STRATEGY_GAME__, second);

  gate.resolve();
  assert.equal(await firstLaunch, null);
  assert.ok(first.destroys >= 1);
  stopLaunchedGame(root);
  assert.equal(second.destroys, 1);
});

test('stopping a pending startup invalidates and destroys the in-flight game', async () => {
  const root = {};
  const gate = deferred();
  const game = fakeGame(() => gate.promise);
  const launch = launchGame(() => ({}), { root, createGame: () => game });
  await Promise.resolve();
  await Promise.resolve();
  stopLaunchedGame(root);
  assert.equal(game.destroys, 1);
  gate.resolve();
  assert.equal(await launch, null);
  assert.equal(root.__NUMBER_STRATEGY_GAME__, null);
});

function fakeWebDocument() {
  const elements = new Map();
  const shell = {
    appendChild(node) {
      node.parent = this;
      elements.set(node.id, node);
    },
  };
  const canvas = {
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, value); },
    removeAttribute(name) { this.attributes.delete(name); },
  };
  const createElement = (tagName) => ({
    tagName,
    id: '',
    style: {},
    attributes: new Map(),
    children: [],
    textContent: '',
    setAttribute(name, value) { this.attributes.set(name, value); },
    appendChild(node) { this.children.push(node); },
    focus() { this.focused = true; },
    remove() { elements.delete(this.id); },
  });
  return {
    document: {
      createElement,
      getElementById: (id) => elements.get(id) ?? null,
      querySelector: (selector) => (selector === '.game-shell' ? shell : selector === '#game' ? canvas : null),
      body: shell,
    },
    elements,
    canvas,
  };
}

test('Web startup failure renders one visible accessible alert and can clear it', () => {
  const fixture = fakeWebDocument();
  assert.equal(showWebStartupError(new Error('WebGL2 unavailable'), fixture), true);
  const panel = fixture.elements.get('game-startup-error');
  assert.ok(panel);
  assert.equal(panel.attributes.get('role'), 'alert');
  assert.equal(panel.attributes.get('aria-live'), 'assertive');
  assert.equal(panel.focused, true);
  assert.equal(panel.children[0].textContent, '游戏暂时无法启动');
  assert.match(panel.children[1].textContent, /WebGL2/);
  assert.equal(fixture.canvas.attributes.get('aria-hidden'), 'true');

  showWebStartupError(new Error('second failure'), fixture);
  assert.equal(fixture.elements.size, 1);
  clearWebStartupError(fixture);
  assert.equal(fixture.elements.size, 0);
  assert.equal(fixture.canvas.attributes.has('aria-hidden'), false);
});

test('mini-game startup fallback prefers a non-cancellable modal and falls back safely', () => {
  const calls = [];
  assert.equal(showMiniGameStartupError({
    showModal: (payload) => calls.push(payload),
  }), true);
  assert.equal(calls[0].showCancel, false);
  assert.match(calls[0].content, /WebGL2/);

  const toastCalls = [];
  assert.equal(showMiniGameStartupError({
    showModal: () => { throw new Error('unsupported'); },
    showToast: (payload) => toastCalls.push(payload),
  }), true);
  assert.equal(toastCalls[0].icon, 'none');
});
