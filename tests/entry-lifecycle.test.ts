import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearWebStartupError,
  launchGame,
  showMiniGameStartupError,
  showWebStartupError,
  stopLaunchedGame,
} from '@number-strategy-jump/arena-platform-runtime';

interface TestLaunchRoot {
  __NUMBER_STRATEGY_GAME__?: unknown;
}

function required<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) throw new Error(`测试缺少 ${name}。`);
  return value;
}

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function fakeGame(start: () => Promise<void> = async () => {}) {
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
  const root: TestLaunchRoot = {};
  const errors: string[] = [];
  const result = await launchGame(() => { throw new Error('WebGL2 unavailable'); }, {
    root,
    createGame: () => { throw new Error('must not construct'); },
    onError: (error: unknown) => errors.push(
      error instanceof Error ? error.message : String(error),
    ),
  });
  assert.equal(result, null);
  assert.deepEqual(errors, ['WebGL2 unavailable']);
  assert.equal(root.__NUMBER_STRATEGY_GAME__, null);
});

test('entry startup contains invalid factories and optional callback failures', async () => {
  const root: TestLaunchRoot = {};
  assert.equal(await launchGame(null, {
    root,
    createGame: () => fakeGame(),
    onError: () => { throw new Error('presentation failed'); },
  }), null);

  assert.equal(await launchGame(() => ({ id: 'test' }), { root }), null);

  const game = fakeGame();
  assert.equal(await launchGame(() => ({ id: 'test' }), {
    root,
    createGame: () => game,
    onSuccess: () => { throw new Error('optional callback failed'); },
  }), game);
  stopLaunchedGame(root);
});

test('entry startup destroys a partially started game when start rejects', async () => {
  const root: TestLaunchRoot = {};
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
  const root: TestLaunchRoot = {};
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
  const root: TestLaunchRoot = {};
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
  interface TestElement {
    tagName: string;
    id: string;
    style: Record<string, unknown>;
    attributes: Map<string, string>;
    children: TestElement[];
    textContent: string;
    focused: boolean;
    parent?: TestElement;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    appendChild(node: TestElement): void;
    focus(): void;
    remove(): void;
  }
  const elements = new Map<string, TestElement>();
  const shell = {
    tagName: 'div', id: 'shell', style: {}, attributes: new Map<string, string>(),
    children: [] as TestElement[], textContent: '', focused: false,
    setAttribute(name: string, value: string) { this.attributes.set(name, value); },
    removeAttribute(name: string) { this.attributes.delete(name); },
    appendChild(node: TestElement) {
      node.parent = this;
      elements.set(node.id, node);
    },
    focus() { this.focused = true; },
    remove() {},
  } satisfies TestElement;
  const canvas = {
    tagName: 'canvas', id: 'game', style: {}, attributes: new Map<string, string>(),
    children: [] as TestElement[], textContent: '', focused: false,
    setAttribute(name: string, value: string) { this.attributes.set(name, value); },
    removeAttribute(name: string) { this.attributes.delete(name); },
    appendChild(node: TestElement) { this.children.push(node); },
    focus() { this.focused = true; },
    remove() {},
  } satisfies TestElement;
  const createElement = (tagName: string): TestElement => ({
    tagName,
    id: '',
    style: {},
    attributes: new Map<string, string>(),
    children: [],
    textContent: '',
    focused: false,
    setAttribute(name: string, value: string) { this.attributes.set(name, value); },
    removeAttribute(name: string) { this.attributes.delete(name); },
    appendChild(node: TestElement) { this.children.push(node); },
    focus() { this.focused = true; },
    remove() { elements.delete(this.id); },
  });
  return {
    document: {
      createElement,
      getElementById: (id: string) => elements.get(id) ?? null,
      querySelector: (selector: string) => (
        selector === '.game-shell' ? shell : selector === '#game' ? canvas : null
      ),
      body: shell,
    },
    elements,
    canvas,
  };
}

test('Web startup failure renders one visible accessible alert and can clear it', () => {
  const fixture = fakeWebDocument();
  assert.equal(showWebStartupError(new Error('WebGL2 unavailable'), fixture), true);
  const panel = required(fixture.elements.get('game-startup-error'), '启动错误面板');
  assert.equal(panel.attributes.get('role'), 'alert');
  assert.equal(panel.attributes.get('aria-live'), 'assertive');
  assert.equal(panel.focused, true);
  assert.equal(required(panel.children[0], '错误标题').textContent, '游戏暂时无法启动');
  assert.match(required(panel.children[1], '错误正文').textContent, /WebGL2/);
  assert.equal(fixture.canvas.attributes.get('aria-hidden'), 'true');

  showWebStartupError(new Error('second failure'), fixture);
  assert.equal(fixture.elements.size, 1);
  clearWebStartupError(fixture);
  assert.equal(fixture.elements.size, 0);
  assert.equal(fixture.canvas.attributes.has('aria-hidden'), false);
});

test('mini-game startup fallback prefers a non-cancellable modal and falls back safely', () => {
  const calls: Array<{ showCancel?: boolean; content?: string }> = [];
  assert.equal(showMiniGameStartupError({
    showModal: (payload: { showCancel?: boolean; content?: string }) => calls.push(payload),
  }), true);
  assert.equal(required(calls[0], '模态框调用').showCancel, false);
  assert.match(required(required(calls[0], '模态框调用').content, '模态框正文'), /WebGL2/);

  const toastCalls: Array<{ icon?: string }> = [];
  assert.equal(showMiniGameStartupError({
    showModal: () => { throw new Error('unsupported'); },
    showToast: (payload: { icon?: string }) => toastCalls.push(payload),
  }), true);
  assert.equal(required(toastCalls[0], 'Toast 调用').icon, 'none');
});

test('startup fallbacks remain inert when host presentation APIs are missing or broken', () => {
  assert.equal(showMiniGameStartupError(null), false);
  assert.equal(showMiniGameStartupError({}), false);
  assert.equal(showMiniGameStartupError({
    showToast: () => { throw new Error('toast failed'); },
  }), false);

  assert.equal(showWebStartupError(new Error('missing document'), {}), false);
  assert.equal(showWebStartupError(new Error('broken document'), {
    document: {
      createElement: () => { throw new Error('blocked'); },
    },
  }), false);
  assert.doesNotThrow(() => clearWebStartupError({
    get document(): never { throw new Error('detached'); },
  }));
});
