import { createWebProductSceneModel } from './web-product-scene-model.js';

export const WEB_PRODUCT_UI_SURFACE_STATE = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  DISPOSED: 'disposed',
});

function requiredElement(root, selector) {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Web Product UI 缺少 ${selector}。`);
  return element;
}

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function positiveFinite(value, fallback = 1) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function setText(element, value) {
  const text = String(value ?? '');
  if (element.textContent !== text) element.textContent = text;
}

function setImage(image, source, alt) {
  if (image.getAttribute('src') !== source) image.setAttribute('src', source);
  if (image.getAttribute('alt') !== alt) image.setAttribute('alt', alt);
}

export class WebProductUiSurface {
  #canvas;
  #root;
  #document;
  #nodes;
  #intentByElement;
  #state;
  #bindingCleanup;
  #dispatching;
  #lastViewModel;
  #lastModel;
  #lastRenderKey;
  #inputViewport;

  constructor({ canvas, root }) {
    if (!canvas || typeof canvas.setAttribute !== 'function') {
      throw new TypeError('WebProductUiSurface 需要 DOM Canvas。');
    }
    if (!root || typeof root.querySelector !== 'function') {
      throw new TypeError('WebProductUiSurface 需要产品 UI 根节点。');
    }
    const documentObject = root.ownerDocument;
    if (!documentObject || typeof documentObject.createElement !== 'function') {
      throw new TypeError('WebProductUiSurface root 缺少 ownerDocument。');
    }
    this.#canvas = canvas;
    this.#root = root;
    this.#document = documentObject;
    this.#nodes = null;
    this.#intentByElement = new WeakMap();
    this.#state = WEB_PRODUCT_UI_SURFACE_STATE.CREATED;
    this.#bindingCleanup = null;
    this.#dispatching = false;
    this.#lastViewModel = null;
    this.#lastModel = null;
    this.#lastRenderKey = null;
    this.#inputViewport = null;
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #assertReady() {
    if (this.#state !== WEB_PRODUCT_UI_SURFACE_STATE.READY) {
      throw new Error(`WebProductUiSurface 当前状态不可用：${this.#state}。`);
    }
  }

  async load() {
    if (this.#state === WEB_PRODUCT_UI_SURFACE_STATE.DISPOSED) {
      throw new Error('WebProductUiSurface 已销毁。');
    }
    if (this.#state === WEB_PRODUCT_UI_SURFACE_STATE.READY) return this;
    this.#nodes = Object.freeze({
      kicker: requiredElement(this.#root, '#product-kicker'),
      title: requiredElement(this.#root, '#product-title'),
      body: requiredElement(this.#root, '#product-body'),
      live: requiredElement(this.#root, '#product-live'),
      primary: requiredElement(this.#root, '#product-primary-action'),
      secondary: requiredElement(this.#root, '#product-secondary-action'),
      heroImage: requiredElement(this.#root, '#product-hero-image'),
      characterList: requiredElement(this.#root, '#product-character-list'),
      matchingPlayerImage: requiredElement(this.#root, '#product-matching-player-image'),
      matchingPlayerName: requiredElement(this.#root, '#product-matching-player-name'),
      matchingOpponentImage: requiredElement(this.#root, '#product-matching-opponent-image'),
      matchingOpponentName: requiredElement(this.#root, '#product-matching-opponent-name'),
      resultImage: requiredElement(this.#root, '#product-result-image'),
      resultMark: requiredElement(this.#root, '#product-result-mark'),
      rewardValue: requiredElement(this.#root, '#product-reward-value'),
      rewardImage: requiredElement(this.#root, '#product-reward-image'),
      rewardMark: requiredElement(this.#root, '#product-reward-mark'),
      rewardSceneValue: requiredElement(this.#root, '#product-reward-scene-value'),
      unlockImage: requiredElement(this.#root, '#product-unlock-image'),
      unlockName: requiredElement(this.#root, '#product-unlock-name'),
      errorMessage: requiredElement(this.#root, '#product-error-message'),
      visuals: [...this.#root.querySelectorAll('[data-product-visual]')],
    });
    this.#nodes.primary.dataset.productIntent = 'primary';
    this.#nodes.secondary.dataset.productIntent = 'secondary';
    this.#state = WEB_PRODUCT_UI_SURFACE_STATE.READY;
    return this;
  }

  #setIntent(element, action) {
    const available = action !== null && action !== undefined;
    element.hidden = !available;
    element.disabled = !available || !action.enabled || this.#dispatching;
    element.setAttribute('aria-disabled', String(element.disabled));
    if (!available) {
      this.#intentByElement.delete(element);
      setText(element, '');
      return;
    }
    this.#intentByElement.set(element, action.intent);
    setText(element, action.label);
  }

  #updateCharacterCard(button, card) {
    const image = button.querySelector('img');
    const label = button.querySelector('span');
    if (!image || !label) throw new Error(`角色卡片 ${card.id} 结构不完整。`);
    button.className = `product-character-card${card.selected ? ' is-selected' : ''}`;
    button.setAttribute('aria-checked', String(card.selected));
    button.setAttribute('aria-label', `${card.name}${card.selected ? '，当前已选择' : ''}`);
    button.disabled = !card.enabled || this.#dispatching;
    setImage(image, card.asset, '');
    image.draggable = false;
    setText(label, card.name);
    this.#intentByElement.set(button, card.intent);
  }

  #createCharacterCard(card) {
    const button = this.#document.createElement('button');
    const image = this.#document.createElement('img');
    const label = this.#document.createElement('span');
    button.type = 'button';
    button.dataset.productIntent = 'character';
    button.dataset.characterId = card.id;
    button.setAttribute('role', 'radio');
    button.append(image, label);
    this.#updateCharacterCard(button, card);
    return button;
  }

  #syncCharacterCards(model) {
    this.#setIntent(this.#nodes.primary, model.primaryAction);
    this.#setIntent(this.#nodes.secondary, model.secondaryAction);
    const existing = [...this.#nodes.characterList.querySelectorAll('button')];
    const reusable = existing.length === model.characterCards.length
      && existing.every((button, index) => (
        button.dataset.characterId === model.characterCards[index].id
      ));
    if (reusable) {
      existing.forEach((button, index) => this.#updateCharacterCard(
        button,
        model.characterCards[index],
      ));
      return;
    }
    const fragment = this.#document.createDocumentFragment();
    for (const card of model.characterCards) {
      const button = this.#createCharacterCard(card);
      fragment.append(button);
    }
    this.#nodes.characterList.replaceChildren(fragment);
  }

  #syncInteractive() {
    if (!this.#lastModel) return;
    this.#root.setAttribute('aria-busy', String(this.#lastModel.busy || this.#dispatching));
    this.#setIntent(this.#nodes.primary, this.#lastModel.primaryAction);
    this.#setIntent(this.#nodes.secondary, this.#lastModel.secondaryAction);
    for (const element of this.#nodes.characterList.querySelectorAll('button')) {
      element.disabled = this.#dispatching || !this.#lastViewModel?.inputEnabled;
    }
  }

  render(viewModel) {
    this.#assertReady();
    const model = createWebProductSceneModel(viewModel);
    const renderKey = [
      model.revision,
      model.scene,
      viewModel.locale,
      viewModel.activeState,
      viewModel.visibleState,
      viewModel.inputEnabled,
      viewModel.suspended,
      model.characterCards.find(({ selected }) => selected)?.id ?? '',
      model.primaryAction?.enabled ?? false,
      model.primaryAction?.label ?? '',
      model.secondaryAction?.enabled ?? false,
      model.secondaryAction?.label ?? '',
      model.title,
      model.body,
      model.announcement,
      model.outcome ?? '',
      model.experienceDelta ?? '',
      model.unlockName,
      model.errorMessage,
    ].join(':');
    const unchanged = this.#lastRenderKey === renderKey;
    this.#lastViewModel = viewModel;
    this.#lastModel = model;
    this.#lastRenderKey = renderKey;
    this.#root.hidden = model.gameplay;
    this.#root.dataset.scene = model.scene;
    this.#root.dataset.productState = viewModel.activeState;
    this.#root.lang = viewModel.locale;
    this.#canvas.setAttribute('aria-hidden', String(!model.gameplay));
    this.#canvas.tabIndex = model.gameplay ? 0 : -1;
    if (model.gameplay) return true;
    if (unchanged) return true;
    setText(this.#nodes.kicker, model.kicker);
    setText(this.#nodes.title, model.title);
    setText(this.#nodes.body, model.body);
    this.#nodes.body.hidden = model.body.length === 0;
    setText(this.#nodes.live, model.announcement);
    for (const visual of this.#nodes.visuals) {
      visual.hidden = visual.dataset.productVisual !== model.scene;
    }
    setImage(this.#nodes.heroImage, model.lobbyAsset, '跑酷学徒和发条方块站在竞技场平台上');
    this.#syncCharacterCards(model);
    setImage(
      this.#nodes.matchingPlayerImage,
      model.selectedCharacterAsset,
      model.selectedCharacterName,
    );
    setText(this.#nodes.matchingPlayerName, model.selectedCharacterName);
    setImage(this.#nodes.matchingOpponentImage, model.opponentPortraitAsset, '等待中的挑战者');
    setText(this.#nodes.matchingOpponentName, model.opponentName);
    setImage(this.#nodes.resultImage, model.selectedCharacterAsset, model.selectedCharacterName);
    setText(
      this.#nodes.resultMark,
      model.outcome === 'win' ? 'WIN' : model.outcome === 'draw' ? 'DRAW' : 'NEXT',
    );
    setText(
      this.#nodes.rewardValue,
      model.experienceDelta === null ? '' : `EXP +${model.experienceDelta}`,
    );
    setImage(this.#nodes.rewardImage, model.selectedCharacterAsset, model.selectedCharacterName);
    setText(
      this.#nodes.rewardMark,
      model.outcome === 'win' ? 'WIN' : model.outcome === 'draw' ? 'DRAW' : 'NEXT',
    );
    setText(
      this.#nodes.rewardSceneValue,
      model.experienceDelta === null ? '奖励结算完成' : `EXP +${model.experienceDelta}`,
    );
    setImage(this.#nodes.unlockImage, model.unlockAsset, model.unlockName || '新内容');
    setText(this.#nodes.unlockName, model.unlockName);
    setText(this.#nodes.errorMessage, model.errorMessage || model.body);
    this.#syncInteractive();
    return true;
  }

  resize(viewport, inputViewport) {
    if (this.#state === WEB_PRODUCT_UI_SURFACE_STATE.DISPOSED) return false;
    const width = positiveFinite(inputViewport?.width, positiveFinite(viewport?.width));
    const height = positiveFinite(inputViewport?.height, positiveFinite(viewport?.height));
    this.#inputViewport = Object.freeze({ width, height });
    this.#root.style.setProperty('--arena-viewport-width', `${positiveFinite(viewport?.width, width)}px`);
    this.#root.style.setProperty('--arena-viewport-height', `${positiveFinite(viewport?.height, height)}px`);
    return true;
  }

  getInputViewport(fallback) {
    if (this.#inputViewport) return this.#inputViewport;
    return Object.freeze({
      width: positiveFinite(fallback?.width),
      height: positiveFinite(fallback?.height),
    });
  }

  hitTestUi() {
    return null;
  }

  bindIntent({ onIntent, onRejected = () => {} } = {}) {
    this.#assertReady();
    requiredFunction(onIntent, 'WebProductUiSurface.onIntent');
    requiredFunction(onRejected, 'WebProductUiSurface.onRejected');
    if (this.#bindingCleanup !== null) {
      throw new Error('WebProductUiSurface intent 已绑定。');
    }
    const listener = (event) => {
      const element = event.target?.closest?.('[data-product-intent]');
      if (!element || !this.#root.contains(element) || element.disabled || this.#dispatching) return;
      const intent = this.#intentByElement.get(element);
      if (!intent) return;
      this.#dispatching = true;
      this.#syncInteractive();
      Promise.resolve()
        .then(() => onIntent(intent))
        .catch((error) => {
          try { onRejected(error, intent); } catch { /* diagnostic only */ }
        })
        .finally(() => {
          if (this.#state === WEB_PRODUCT_UI_SURFACE_STATE.DISPOSED) return;
          this.#dispatching = false;
          this.#syncInteractive();
        });
    };
    this.#root.addEventListener('click', listener);
    let active = true;
    const cleanup = () => {
      if (!active) return;
      this.#root.removeEventListener('click', listener);
      active = false;
      if (this.#bindingCleanup === cleanup) this.#bindingCleanup = null;
    };
    this.#bindingCleanup = cleanup;
    return cleanup;
  }

  getDebugSnapshot() {
    return Object.freeze({
      state: this.#state,
      scene: this.#lastModel?.scene ?? null,
      dispatching: this.#dispatching,
      bound: this.#bindingCleanup !== null,
      inputViewport: this.#inputViewport,
    });
  }

  dispose() {
    if (this.#state === WEB_PRODUCT_UI_SURFACE_STATE.DISPOSED) return;
    this.#bindingCleanup?.();
    this.#root.hidden = true;
    this.#canvas.removeAttribute('aria-hidden');
    this.#nodes = null;
    this.#lastViewModel = null;
    this.#lastModel = null;
    this.#lastRenderKey = null;
    this.#inputViewport = null;
    this.#state = WEB_PRODUCT_UI_SURFACE_STATE.DISPOSED;
  }
}
