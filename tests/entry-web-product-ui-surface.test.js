import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEB_PRODUCT_UI_SURFACE_STATE,
  WebProductUiSurface,
} from '../src/entry/web-product-ui-surface.js';

class FakeElement {
  constructor(tagName, id = '') {
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
    this.style = { values: new Map(), setProperty: (key, value) => this.style.values.set(key, value) };
    this.classList = { add: (value) => { this.className = `${this.className} ${value}`.trim(); } };
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }

  append(...values) {
    for (const value of values) {
      value.parentNode = this;
      this.children.push(value);
    }
  }

  replaceChildren(...values) {
    this.children = [];
    for (const value of values) {
      if (value.tagName === '#fragment') this.append(...value.children);
      else this.append(value);
    }
  }

  #walk() {
    return [this, ...this.children.flatMap((child) => child.#walk())];
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      return this.#walk().find(({ id }) => id === selector.slice(1)) ?? null;
    }
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    if (selector === '[data-product-visual]') {
      return this.#walk().filter(({ dataset }) => dataset.productVisual !== undefined);
    }
    if (selector === 'button') return this.#walk().filter(({ tagName }) => tagName === 'button');
    if (selector === 'img') return this.#walk().filter(({ tagName }) => tagName === 'img');
    if (selector === 'span') return this.#walk().filter(({ tagName }) => tagName === 'span');
    return [];
  }

  contains(value) { return this.#walk().includes(value); }

  closest(selector) {
    if (selector !== '[data-product-intent]') return null;
    let current = this;
    while (current) {
      if (current.dataset.productIntent !== undefined) return current;
      current = current.parentNode;
    }
    return null;
  }

  addEventListener(type, callback) {
    let listeners = this.listeners.get(type);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(type, listeners);
    }
    listeners.add(callback);
  }

  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type, event) { for (const callback of [...(this.listeners.get(type) ?? [])]) callback(event); }
}

class FakeDocument {
  createElement(tagName) {
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

function viewModel(scene = 'home', overrides = {}) {
  return {
    revision: 1,
    locale: 'zh-CN',
    activeState: scene === 'home' ? 'ready' : scene,
    visibleState: scene === 'home' ? 'ready' : scene,
    busy: false,
    suspended: false,
    terminal: false,
    inputEnabled: true,
    screen: {
      sceneId: scene,
      title: scene === 'home' ? '竞技场' : '选择角色',
      body: '争夺装备，把对手击出平台',
      announcement: scene === 'home' ? '竞技场' : '选择角色',
      primaryAction: scene === 'home'
        ? { label: '开始匹配', enabled: true, intent: { id: 'start-match' } }
        : { label: '确认选择', enabled: true, intent: { id: 'close-character-select' } },
      secondaryAction: null,
    },
    characterOptions: [
      {
        characterDefinitionId: 'parkour-apprentice',
        name: '跑酷学徒',
        selected: true,
        selectIntent: { id: 'select-character', characterDefinitionId: 'parkour-apprentice' },
      },
      {
        characterDefinitionId: 'wind-up-cube',
        name: '发条方块',
        selected: false,
        selectIntent: { id: 'select-character', characterDefinitionId: 'wind-up-cube' },
      },
    ],
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
  const surface = new WebProductUiSurface({ root, canvas });
  await surface.load();
  assert.equal(surface.resize(
    { width: 400, height: 800 },
    { width: 800, height: 1600 },
  ), true);
  assert.deepEqual(surface.getInputViewport(), { width: 800, height: 1600 });
  surface.render(viewModel());
  assert.equal(root.querySelector('#product-title').textContent, '竞技场');
  const primary = root.querySelector('#product-primary-action');
  assert.equal(primary.textContent, '开始匹配');
  assert.equal(primary.disabled, false);

  const intents = [];
  let resolveIntent;
  const cleanup = surface.bindIntent({
    onIntent: (intent) => new Promise((resolve) => {
      intents.push(intent);
      resolveIntent = resolve;
    }),
  });
  root.emit('click', { target: primary });
  root.emit('click', { target: primary });
  await Promise.resolve();
  assert.deepEqual(intents, [{ id: 'start-match' }]);
  assert.equal(primary.disabled, true);
  resolveIntent();
  await Promise.resolve();
  await Promise.resolve();

  surface.render(viewModel('character-select', { revision: 2 }));
  const cards = root.querySelector('#product-character-list').querySelectorAll('button');
  assert.equal(cards.length, 2);
  assert.equal(cards[0].getAttribute('aria-checked'), 'true');
  surface.render(viewModel('character-select', {
    revision: 3,
    characterOptions: [
      {
        characterDefinitionId: 'parkour-apprentice',
        name: '跑酷学徒',
        selected: false,
        selectIntent: { id: 'select-character', characterDefinitionId: 'parkour-apprentice' },
      },
      {
        characterDefinitionId: 'wind-up-cube',
        name: '发条方块',
        selected: true,
        selectIntent: { id: 'select-character', characterDefinitionId: 'wind-up-cube' },
      },
    ],
  }));
  const updatedCards = root.querySelector('#product-character-list').querySelectorAll('button');
  assert.equal(updatedCards[0], cards[0]);
  assert.equal(updatedCards[1], cards[1]);
  assert.equal(updatedCards[1].getAttribute('aria-checked'), 'true');
  cleanup();
  surface.dispose();
  surface.dispose();
  assert.equal(surface.state, WEB_PRODUCT_UI_SURFACE_STATE.DISPOSED);
  assert.equal(root.listeners.get('click').size, 0);
  assert.equal(root.hidden, true);
  assert.equal(canvas.getAttribute('aria-hidden'), null);
});

test('WebProductUiSurface rejects an incomplete host before taking event ownership', async () => {
  const { root, canvas } = domHarness();
  root.querySelector('#product-title').id = 'missing-title';
  const surface = new WebProductUiSurface({ root, canvas });
  await assert.rejects(() => surface.load(), /缺少 #product-title/);
  assert.equal(root.listeners.size, 0);
});
