import test from 'node:test';
import assert from 'node:assert/strict';
import type { ProductSessionViewModel } from '@number-strategy-jump/arena-product-presentation';
import {
  WEB_PRODUCT_UI_SURFACE_STATE,
  WebProductUiSurface,
} from '../src/entry/web-product-ui-surface.js';

type FakeEvent = Readonly<{ target?: FakeElement | null }>;
type FakeListener = (event: FakeEvent) => unknown;

class FakeElement {
  readonly tagName: string;
  id: string;
  ownerDocument: FakeDocument | null;
  parentNode: FakeElement | null;
  children: FakeElement[];
  readonly dataset: Record<string, string>;
  readonly attributes: Map<string, string>;
  readonly listeners: Map<string, Set<FakeListener>>;
  hidden: boolean;
  disabled: boolean;
  textContent: string;
  className: string;
  tabIndex: number;
  readonly style: Readonly<{
    values: Map<string, string>;
    setProperty: (key: string, value: string) => void;
  }>;
  readonly classList: Readonly<{ add: (value: string) => void }>;

  constructor(tagName: string, id = '') {
    this.tagName = tagName;
    this.id = id;
    this.ownerDocument = null;
    this.parentNode = null;
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this.textContent = '';
    this.className = '';
    this.tabIndex = 0;
    const styleValues = new Map<string, string>();
    this.style = {
      values: styleValues,
      setProperty: (key, value) => { styleValues.set(key, value); },
    };
    this.classList = { add: (value) => { this.className = `${this.className} ${value}`.trim(); } };
  }

  setAttribute(name: string, value: unknown) { this.attributes.set(name, String(value)); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  removeAttribute(name: string) { this.attributes.delete(name); }

  append(...values: FakeElement[]) {
    for (const value of values) {
      value.parentNode = this;
      this.children.push(value);
    }
  }

  replaceChildren(...values: FakeElement[]) {
    this.children = [];
    for (const value of values) {
      if (value.tagName === '#fragment') this.append(...value.children);
      else this.append(value);
    }
  }

  #walk(): FakeElement[] {
    return [this, ...this.children.flatMap((child) => child.#walk())];
  }

  querySelector(selector: string): FakeElement | null {
    if (selector.startsWith('#')) {
      return this.#walk().find(({ id }) => id === selector.slice(1)) ?? null;
    }
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    if (selector === '[data-product-visual]') {
      return this.#walk().filter(({ dataset }) => dataset.productVisual !== undefined);
    }
    if (selector === 'button') return this.#walk().filter(({ tagName }) => tagName === 'button');
    if (selector === 'img') return this.#walk().filter(({ tagName }) => tagName === 'img');
    if (selector === 'span') return this.#walk().filter(({ tagName }) => tagName === 'span');
    return [];
  }

  contains(value: FakeElement) { return this.#walk().includes(value); }

  closest(selector: string): FakeElement | null {
    if (selector !== '[data-product-intent]') return null;
    if (this.dataset.productIntent !== undefined) return this;
    let current = this.parentNode;
    while (current) {
      if (current.dataset.productIntent !== undefined) return current;
      current = current.parentNode;
    }
    return null;
  }

  addEventListener(type: string, callback: FakeListener) {
    let listeners = this.listeners.get(type);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(type, listeners);
    }
    listeners.add(callback);
  }

  removeEventListener(type: string, callback: FakeListener) { this.listeners.get(type)?.delete(callback); }
  emit(type: string, event: FakeEvent) {
    for (const callback of [...(this.listeners.get(type) ?? [])]) callback(event);
  }
}

class FakeDocument {
  createElement(tagName: string) {
    const element = new FakeElement(tagName);
    element.ownerDocument = this;
    return element;
  }

  createDocumentFragment() {
    const fragment = new FakeElement('#fragment');
    fragment.ownerDocument = this;
    return fragment;
  }
}

const REQUIRED_IDS = [
  'product-kicker',
  'product-title',
  'product-body',
  'product-live',
  'product-primary-action',
  'product-secondary-action',
  'product-hero-image',
  'product-character-list',
  'product-matching-player-image',
  'product-matching-player-name',
  'product-matching-opponent-image',
  'product-matching-opponent-name',
  'product-result-image',
  'product-result-mark',
  'product-reward-value',
  'product-reward-image',
  'product-reward-mark',
  'product-reward-scene-value',
  'product-unlock-image',
  'product-unlock-name',
  'product-error-message',
];

function required<T>(value: T | null | undefined, name: string): T {
  assert.ok(value != null, `${name} 不存在。`);
  return value;
}

function domHarness() {
  const documentObject = new FakeDocument();
  const root = documentObject.createElement('section');
  const canvas = documentObject.createElement('canvas');
  for (const id of REQUIRED_IDS) root.append(Object.assign(documentObject.createElement(
    id.includes('action') ? 'button' : id.includes('image') ? 'img' : 'div',
  ), { id }));
  for (const scene of [
    'loading',
    'home',
    'character-select',
    'matching',
    'result',
    'reward',
    'unlock',
    'recoverable-error',
    'fatal-error',
    'destroyed',
  ]) {
    const visual = documentObject.createElement('section');
    visual.dataset.productVisual = scene;
    root.append(visual);
  }
  return { root, canvas };
}

function viewModel(
  scene = 'home',
  overrides: Partial<ProductSessionViewModel> = {},
): ProductSessionViewModel {
  const activeState = (scene === 'home' ? 'ready' : scene) as ProductSessionViewModel['activeState'];
  return {
    schemaVersion: 1,
    revision: 1,
    locale: 'zh-CN',
    activeState,
    visibleState: activeState,
    busy: false,
    suspended: false,
    terminal: false,
    inputEnabled: true,
    screen: {
      definitionId: `test-${scene}-screen`,
      definitionHash: '12345678',
      kind: (scene === 'home' ? 'menu' : 'selection') as ProductSessionViewModel['screen']['kind'],
      sceneId: scene,
      title: scene === 'home' ? '竞技场' : '选择角色',
      body: '争夺装备，把对手击出平台',
      announcement: scene === 'home' ? '竞技场' : '选择角色',
      primaryAction: scene === 'home'
        ? {
          label: '开始匹配',
          enabled: true,
          intent: { id: 'start-match', characterDefinitionId: null },
        }
        : {
          label: '确认选择',
          enabled: true,
          intent: { id: 'close-character-select', characterDefinitionId: null },
        },
      secondaryAction: null,
    },
    characterOptions: [
      {
        characterDefinitionId: 'parkour-apprentice',
        name: '跑酷学徒',
        previewAssetId: 'parkour-apprentice-preview',
        selected: true,
        selectIntent: { id: 'select-character', characterDefinitionId: 'parkour-apprentice' },
      },
      {
        characterDefinitionId: 'wind-up-cube',
        name: '发条方块',
        previewAssetId: 'wind-up-cube-preview',
        selected: false,
        selectIntent: { id: 'select-character', characterDefinitionId: 'wind-up-cube' },
      },
    ],
    profile: {
      revision: 1,
      experience: 0,
      selectedCharacterId: 'parkour-apprentice',
      soundEnabled: true,
      reducedMotion: false,
      qualityProfile: 'high',
    },
    match: null,
    result: null,
    reward: null,
    unlocks: [],
    error: null,
    ...overrides,
  };
}

test('WebProductUiSurface renders stable semantic controls and serializes DOM intents', async () => {
  const { root, canvas } = domHarness();
  const surface = new WebProductUiSurface({
    root: root as unknown as HTMLElement,
    canvas: canvas as unknown as HTMLCanvasElement,
  });
  await surface.load();
  assert.equal(surface.resize(
    { width: 400, height: 800 },
    { width: 800, height: 1600 },
  ), true);
  assert.deepEqual(surface.getInputViewport(), { width: 800, height: 1600 });
  surface.render(viewModel());
  assert.equal(surface.requiresCompositeFrame(), false);
  assert.equal(required(root.querySelector('#product-title'), 'product title').textContent, '竞技场');
  const primary = required(root.querySelector('#product-primary-action'), 'primary action');
  assert.equal(primary.textContent, '开始匹配');
  assert.equal(primary.disabled, false);

  const intents: Readonly<Record<string, unknown>>[] = [];
  let resolveIntent: (() => void) | undefined;
  const cleanup = surface.bindIntent({
    onIntent: (intent: Readonly<Record<string, unknown>>) => new Promise<void>((resolve) => {
      intents.push(intent);
      resolveIntent = () => { resolve(); };
    }),
  });
  root.emit('click', { target: primary });
  root.emit('click', { target: primary });
  await Promise.resolve();
  assert.deepEqual(intents, [{ id: 'start-match', characterDefinitionId: null }]);
  assert.equal(primary.disabled, true);
  required(resolveIntent, 'intent resolver')();
  await Promise.resolve();
  await Promise.resolve();

  surface.render(viewModel('character-select', { revision: 2 }));
  const cards = required(
    root.querySelector('#product-character-list'),
    'character list',
  ).querySelectorAll('button');
  assert.equal(cards.length, 2);
  const firstCard = required(cards[0], 'first character card');
  const secondCard = required(cards[1], 'second character card');
  assert.equal(firstCard.getAttribute('aria-checked'), 'true');
  assert.equal(firstCard.getAttribute('aria-label'), '跑酷学徒');
  surface.render(viewModel('character-select', {
    revision: 3,
    characterOptions: [
      {
        characterDefinitionId: 'parkour-apprentice',
        name: '跑酷学徒',
        previewAssetId: 'parkour-apprentice-preview',
        selected: false,
        selectIntent: { id: 'select-character', characterDefinitionId: 'parkour-apprentice' },
      },
      {
        characterDefinitionId: 'wind-up-cube',
        name: '发条方块',
        previewAssetId: 'wind-up-cube-preview',
        selected: true,
        selectIntent: { id: 'select-character', characterDefinitionId: 'wind-up-cube' },
      },
    ],
  }));
  const updatedCards = required(
    root.querySelector('#product-character-list'),
    'character list',
  ).querySelectorAll('button');
  assert.equal(required(updatedCards[0], 'updated first card'), firstCard);
  assert.equal(required(updatedCards[1], 'updated second card'), secondCard);
  assert.equal(required(updatedCards[1], 'updated second card').getAttribute('aria-checked'), 'true');
  assert.equal(required(updatedCards[1], 'updated second card').getAttribute('aria-label'), '发条方块');
  cleanup();
  surface.dispose();
  surface.dispose();
  assert.equal(surface.state, WEB_PRODUCT_UI_SURFACE_STATE.DISPOSED);
  assert.equal(root.listeners.get('click')?.size ?? 0, 0);
  assert.equal(root.hidden, true);
  assert.equal(canvas.getAttribute('aria-hidden'), null);
});

test('WebProductUiSurface rejects an incomplete host before taking event ownership', async () => {
  const { root, canvas } = domHarness();
  required(root.querySelector('#product-title'), 'product title').id = 'missing-title';
  const surface = new WebProductUiSurface({
    root: root as unknown as HTMLElement,
    canvas: canvas as unknown as HTMLCanvasElement,
  });
  await assert.rejects(() => surface.load(), /缺少 #product-title/);
  assert.equal(root.listeners.size, 0);
});

test('WebProductUiSurface rejects option and intent accessors without execution or ownership', async () => {
  const { root, canvas } = domHarness();
  let reads = 0;
  const constructorOptions = Object.defineProperty({ root }, 'canvas', {
    enumerable: true,
    get() {
      reads += 1;
      return canvas;
    },
  });
  assert.throws(() => new WebProductUiSurface(
    constructorOptions as unknown as { root: HTMLElement; canvas: HTMLCanvasElement },
  ), /访问器/);

  const surface = new WebProductUiSurface({
    root: root as unknown as HTMLElement,
    canvas: canvas as unknown as HTMLCanvasElement,
  });
  await surface.load();
  const bindingOptions = Object.defineProperty({}, 'onIntent', {
    enumerable: true,
    get() {
      reads += 1;
      return () => {};
    },
  });
  assert.throws(() => surface.bindIntent(
    bindingOptions as unknown as { onIntent: (intent: Readonly<Record<string, unknown>>) => unknown },
  ), /访问器/);
  assert.equal(reads, 0);
  assert.equal(root.listeners.size, 0);
  surface.dispose();
});
