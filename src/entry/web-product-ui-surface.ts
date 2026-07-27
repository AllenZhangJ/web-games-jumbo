import {
  type ProductSessionViewModel,
  type ProductUiSceneAction,
} from '@number-strategy-jump/arena-product-presentation';
import {
  createWebProductSceneModel,
  type WebProductCharacterCard,
  type WebProductSceneModel,
} from './web-product-scene-model.js';
import type { ProductUiSceneWeaponCard } from '@number-strategy-jump/arena-product-presentation';

export const WEB_PRODUCT_UI_SURFACE_STATE = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  DISPOSED: 'disposed',
});

type WebProductUiSurfaceState = typeof WEB_PRODUCT_UI_SURFACE_STATE[
  keyof typeof WEB_PRODUCT_UI_SURFACE_STATE
];
type ProductIntent = Readonly<Record<string, unknown>>;
type IntentHandler = (intent: ProductIntent) => unknown;
type IntentRejectedHandler = (error: unknown, intent: ProductIntent) => unknown;

interface ViewportLike {
  readonly width?: unknown;
  readonly height?: unknown;
}

interface UiNodes {
  readonly kicker: HTMLElement;
  readonly title: HTMLElement;
  readonly body: HTMLElement;
  readonly live: HTMLElement;
  readonly primary: HTMLButtonElement;
  readonly secondary: HTMLButtonElement;
  readonly heroImage: HTMLImageElement;
  readonly characterList: HTMLElement;
  readonly weaponList: HTMLElement | null;
  readonly weaponComparison: HTMLElement | null;
  readonly matchingPlayerImage: HTMLImageElement;
  readonly matchingPlayerName: HTMLElement;
  readonly matchingOpponentImage: HTMLImageElement;
  readonly matchingOpponentName: HTMLElement;
  readonly resultImage: HTMLImageElement;
  readonly resultMark: HTMLElement;
  readonly rewardValue: HTMLElement;
  readonly rewardImage: HTMLImageElement;
  readonly rewardMark: HTMLElement;
  readonly rewardSceneValue: HTMLElement;
  readonly unlockImage: HTMLImageElement;
  readonly unlockName: HTMLElement;
  readonly errorMessage: HTMLElement;
  readonly visuals: readonly HTMLElement[];
}

function surfaceOptions(value: unknown): Readonly<{
  canvas: HTMLCanvasElement;
  root: HTMLElement;
}> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('WebProductUiSurface options 必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('WebProductUiSurface options 必须是普通对象。');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || (key !== 'canvas' && key !== 'root')) {
      throw new RangeError(`WebProductUiSurface options 不支持 ${String(key)}。`);
    }
    if (!Object.hasOwn(descriptors[key]!, 'value')) {
      throw new TypeError(`WebProductUiSurface options.${key} 不能是访问器。`);
    }
  }
  return Object.freeze({
    canvas: descriptors.canvas?.value as HTMLCanvasElement,
    root: descriptors.root?.value as HTMLElement,
  });
}

function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Web Product UI 缺少 ${selector}。`);
  return element;
}

function requiredFunction<T extends (...args: never[]) => unknown>(value: unknown, name: string): T {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as T;
}

function positiveFinite(value: unknown, fallback = 1): number {
  return Number.isFinite(value) && (value as number) > 0 ? value as number : fallback;
}

function viewportDimension(value: unknown, key: 'width' | 'height'): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
}

function setText(element: Element, value: unknown): void {
  const text = String(value ?? '');
  if (element.textContent !== text) element.textContent = text;
}

function setImage(image: HTMLImageElement, source: string, alt: string): void {
  if (image.getAttribute('src') !== source) image.setAttribute('src', source);
  if (image.getAttribute('alt') !== alt) image.setAttribute('alt', alt);
}

function weaponDirectionHint(direction: string): string {
  return direction === 'lower-is-better'
    ? '越低越有利'
    : direction === 'higher-is-risk' ? '越高风险越大' : '越高越有利';
}

function weaponStatFill(value: number, maxValue: number, direction: string): number {
  const ratio = Math.max(0, Math.min(1, value / maxValue));
  return (direction === 'lower-is-better' ? 1 - ratio : ratio) * 100;
}

export class WebProductUiSurface {
  readonly #canvas: HTMLCanvasElement;
  readonly #root: HTMLElement;
  readonly #document: Document;
  #nodes: UiNodes | null;
  readonly #intentByElement: WeakMap<Element, ProductIntent>;
  #state: WebProductUiSurfaceState;
  #bindingCleanup: (() => void) | null;
  #dispatching: boolean;
  #lastViewModel: ProductSessionViewModel | null;
  #lastModel: WebProductSceneModel | null;
  #lastRenderKey: string | null;
  #inputViewport: Readonly<{ width: number; height: number }> | null;

  constructor(optionsValue: unknown) {
    const { canvas, root } = surfaceOptions(optionsValue);
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

  get state(): WebProductUiSurfaceState {
    return this.#state;
  }

  #assertReady(): void {
    if (this.#state !== WEB_PRODUCT_UI_SURFACE_STATE.READY) {
      throw new Error(`WebProductUiSurface 当前状态不可用：${this.#state}。`);
    }
  }

  #readyNodes(): UiNodes {
    if (this.#nodes === null) throw new Error('WebProductUiSurface 尚未加载。');
    return this.#nodes;
  }

  async load(): Promise<this> {
    if (this.#state === WEB_PRODUCT_UI_SURFACE_STATE.DISPOSED) {
      throw new Error('WebProductUiSurface 已销毁。');
    }
    if (this.#state === WEB_PRODUCT_UI_SURFACE_STATE.READY) return this;
    const nodes: UiNodes = Object.freeze({
      kicker: requiredElement<HTMLElement>(this.#root, '#product-kicker'),
      title: requiredElement<HTMLElement>(this.#root, '#product-title'),
      body: requiredElement<HTMLElement>(this.#root, '#product-body'),
      live: requiredElement<HTMLElement>(this.#root, '#product-live'),
      primary: requiredElement<HTMLButtonElement>(this.#root, '#product-primary-action'),
      secondary: requiredElement<HTMLButtonElement>(this.#root, '#product-secondary-action'),
      heroImage: requiredElement<HTMLImageElement>(this.#root, '#product-hero-image'),
      characterList: requiredElement<HTMLElement>(this.#root, '#product-character-list'),
      weaponList: this.#root.querySelector<HTMLElement>('#product-weapon-list'),
      weaponComparison: this.#root.querySelector<HTMLElement>('#product-weapon-comparison'),
      matchingPlayerImage: requiredElement<HTMLImageElement>(this.#root, '#product-matching-player-image'),
      matchingPlayerName: requiredElement<HTMLElement>(this.#root, '#product-matching-player-name'),
      matchingOpponentImage: requiredElement<HTMLImageElement>(this.#root, '#product-matching-opponent-image'),
      matchingOpponentName: requiredElement<HTMLElement>(this.#root, '#product-matching-opponent-name'),
      resultImage: requiredElement<HTMLImageElement>(this.#root, '#product-result-image'),
      resultMark: requiredElement<HTMLElement>(this.#root, '#product-result-mark'),
      rewardValue: requiredElement<HTMLElement>(this.#root, '#product-reward-value'),
      rewardImage: requiredElement<HTMLImageElement>(this.#root, '#product-reward-image'),
      rewardMark: requiredElement<HTMLElement>(this.#root, '#product-reward-mark'),
      rewardSceneValue: requiredElement<HTMLElement>(this.#root, '#product-reward-scene-value'),
      unlockImage: requiredElement<HTMLImageElement>(this.#root, '#product-unlock-image'),
      unlockName: requiredElement<HTMLElement>(this.#root, '#product-unlock-name'),
      errorMessage: requiredElement<HTMLElement>(this.#root, '#product-error-message'),
      visuals: [...this.#root.querySelectorAll<HTMLElement>('[data-product-visual]')],
    });
    this.#nodes = nodes;
    nodes.primary.dataset.productIntent = 'primary';
    nodes.secondary.dataset.productIntent = 'secondary';
    this.#state = WEB_PRODUCT_UI_SURFACE_STATE.READY;
    return this;
  }

  #setIntent(element: HTMLButtonElement, action: ProductUiSceneAction | null): void {
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

  #updateCharacterCard(button: HTMLButtonElement, card: WebProductCharacterCard): void {
    const image = button.querySelector<HTMLImageElement>('img');
    const label = button.querySelector<HTMLSpanElement>('span');
    if (!image || !label) throw new Error(`角色卡片 ${card.id} 结构不完整。`);
    button.className = `product-character-card${card.selected ? ' is-selected' : ''}`;
    button.setAttribute('aria-checked', String(card.selected));
    // role=radio + aria-checked already announces selection. Keep the name
    // stable while a click commits so assistive tech and automation retain it.
    button.setAttribute('aria-label', card.name);
    button.disabled = !card.enabled || this.#dispatching;
    setImage(image, card.asset, '');
    image.draggable = false;
    setText(label, card.name);
    this.#intentByElement.set(button, card.intent);
  }

  #createCharacterCard(card: WebProductCharacterCard): HTMLButtonElement {
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

  #syncCharacterCards(model: WebProductSceneModel): void {
    const nodes = this.#readyNodes();
    this.#setIntent(nodes.primary, model.primaryAction);
    this.#setIntent(nodes.secondary, model.secondaryAction);
    const existing = [...nodes.characterList.querySelectorAll<HTMLButtonElement>('button')];
    const reusable = existing.length === model.characterCards.length
      && existing.every((button, index) => (
        button.dataset.characterId === model.characterCards[index]!.id
      ));
    if (reusable) {
      existing.forEach((button, index) => this.#updateCharacterCard(
        button,
        model.characterCards[index]!,
      ));
      return;
    }
    const fragment = this.#document.createDocumentFragment();
    for (const card of model.characterCards) {
      const button = this.#createCharacterCard(card);
      fragment.append(button);
    }
    nodes.characterList.replaceChildren(fragment);
  }

  #updateWeaponCard(element: HTMLElement, card: ProductUiSceneWeaponCard): void {
    const title = element.querySelector<HTMLElement>('[data-weapon-title]');
    const role = element.querySelector<HTMLElement>('[data-weapon-role]');
    const description = element.querySelector<HTMLElement>('[data-weapon-description]');
    const coreVerb = element.querySelector<HTMLElement>('[data-weapon-core-verb]');
    const tradeoff = element.querySelector<HTMLElement>('[data-weapon-tradeoff]');
    const counterplay = element.querySelector<HTMLElement>('[data-weapon-counterplay]');
    const hitResult = element.querySelector<HTMLElement>('[data-weapon-hit-result]');
    const mapUse = element.querySelector<HTMLElement>('[data-weapon-map-use]');
    const stats = element.querySelector<HTMLElement>('[data-weapon-stats]');
    const behaviorStats = element.querySelector<HTMLElement>('[data-weapon-behavior-stats]');
    const contexts = element.querySelector<HTMLElement>('[data-weapon-contexts]');
    if (!title || !role || !description || !coreVerb || !tradeoff || !counterplay
      || !hitResult || !mapUse || !stats || !behaviorStats || !contexts) {
      throw new Error(`武器卡片 ${card.id} 结构不完整。`);
    }
    setText(title, card.name);
    setText(role, card.role);
    setText(coreVerb, `核心：${card.coreVerb}`);
    setText(description, card.description);
    setText(hitResult, `命中：${card.hitResult}`);
    setText(mapUse, `地图：${card.mapUse}`);
    setText(tradeoff, `风险：${card.tradeoff}`);
    setText(counterplay, `反制：${card.counterplay}`);
    const existing = [...stats.querySelectorAll<HTMLElement>('[data-weapon-stat]')];
    if (existing.length !== card.stats.length) {
      stats.replaceChildren(...card.stats.map(() => {
        const row = this.#document.createElement('div');
        const label = this.#document.createElement('span');
        const value = this.#document.createElement('strong');
        const track = this.#document.createElement('span');
        row.dataset.weaponStat = 'true';
        row.className = 'product-weapon-stat';
        label.dataset.weaponStatLabel = 'true';
        value.dataset.weaponStatValue = 'true';
        track.dataset.weaponStatTrack = 'true';
        track.className = 'product-weapon-stat-track';
        row.append(label, value, track);
        return row;
      }));
    }
    const rows = [...stats.querySelectorAll<HTMLElement>('[data-weapon-stat]')];
    card.stats.forEach((stat, index) => {
      const row = rows[index]!;
      const label = row.querySelector<HTMLElement>('[data-weapon-stat-label]');
      const value = row.querySelector<HTMLElement>('[data-weapon-stat-value]');
      const track = row.querySelector<HTMLElement>('[data-weapon-stat-track]');
      if (!label || !value || !track) throw new Error(`武器数值 ${stat.id} 结构不完整。`);
      const direction = stat.direction === 'lower-is-better'
        ? '↓'
        : stat.direction === 'higher-is-risk' ? '⚠' : '↑';
      setText(label, `${stat.label} ${direction}`);
      setText(value, `${stat.value.toFixed(stat.precision)}${stat.unit}`);
      row.setAttribute(
        'aria-label',
        `${stat.label}：${stat.value.toFixed(stat.precision)}${stat.unit}，${weaponDirectionHint(stat.direction)}`,
      );
      track.setAttribute('aria-hidden', 'true');
      track.setAttribute('title', weaponDirectionHint(stat.direction));
      track.style.setProperty(
        '--weapon-stat-fill',
        `${weaponStatFill(stat.value, stat.maxValue, stat.direction)}%`,
      );
      row.dataset.weaponStatDirection = stat.direction;
    });
    behaviorStats.replaceChildren(...card.behaviorStats.map((stat) => {
      const metric = this.#document.createElement('span');
      const direction = stat.direction === 'lower-is-better'
        ? '↓'
        : stat.direction === 'higher-is-risk' ? '⚠' : '↑';
      const value = `${stat.value.toFixed(stat.precision)}${stat.unit}`;
      metric.textContent = `${stat.label} ${direction} ${value}`;
      metric.title = `${stat.label}：${value}，${weaponDirectionHint(stat.direction)}`;
      metric.setAttribute(
        'aria-label',
        `${stat.label}：${value}，${weaponDirectionHint(stat.direction)}`,
      );
      metric.dataset.weaponBehaviorStat = stat.id;
      metric.dataset.weaponBehaviorDirection = stat.direction;
      return metric;
    }));
    const existingContexts = [...contexts.querySelectorAll<HTMLElement>('[data-weapon-context]')];
    if (existingContexts.length !== card.contexts.length) {
      contexts.replaceChildren(...card.contexts.map(() => {
        const context = this.#document.createElement('div');
        const heading = this.#document.createElement('span');
        const summary = this.#document.createElement('small');
        const metrics = this.#document.createElement('div');
        context.dataset.weaponContext = 'true';
        context.className = 'product-weapon-context';
        heading.dataset.weaponContextLabel = 'true';
        summary.dataset.weaponContextSummary = 'true';
        metrics.dataset.weaponContextMetrics = 'true';
        metrics.className = 'product-weapon-context-metrics';
        context.append(heading, summary, metrics);
        return context;
      }));
    }
    const contextNodes = [...contexts.querySelectorAll<HTMLElement>('[data-weapon-context]')];
    card.contexts.forEach((context, index) => {
      const contextNode = contextNodes[index]!;
      const heading = contextNode.querySelector<HTMLElement>('[data-weapon-context-label]');
      const summary = contextNode.querySelector<HTMLElement>('[data-weapon-context-summary]');
      const metrics = contextNode.querySelector<HTMLElement>('[data-weapon-context-metrics]');
      if (!heading || !summary || !metrics) throw new Error(`武器上下文 ${context.id} 结构不完整。`);
      setText(heading, context.label);
      setText(summary, context.summary);
      metrics.replaceChildren(...context.stats.map((stat) => {
        const metric = this.#document.createElement('span');
        const direction = stat.direction === 'lower-is-better'
          ? '↓'
          : stat.direction === 'higher-is-risk' ? '⚠' : '↑';
        const value = `${stat.value.toFixed(stat.precision)}${stat.unit}`;
        metric.textContent = `${stat.label} ${direction} ${value}`;
        metric.title = `${stat.label}：${value}，${weaponDirectionHint(stat.direction)}`;
        metric.setAttribute(
          'aria-label',
          `${stat.label}：${value}，${weaponDirectionHint(stat.direction)}`,
        );
        metric.dataset.weaponContextStat = stat.id;
        metric.dataset.weaponContextDirection = stat.direction;
        return metric;
      }));
    });
  }

  #syncWeaponCards(model: WebProductSceneModel): void {
    const list = this.#readyNodes().weaponList;
    if (!list) return;
    const existing = [...list.querySelectorAll<HTMLElement>('[data-weapon-card]')];
    const reusable = existing.length === model.weaponCards.length
      && existing.every((element, index) => element.dataset.weaponId === model.weaponCards[index]!.id);
    if (reusable) {
      existing.forEach((element, index) => this.#updateWeaponCard(element, model.weaponCards[index]!));
      return;
    }
    const fragment = this.#document.createDocumentFragment();
    for (const card of model.weaponCards) {
      const element = this.#document.createElement('article');
      element.className = 'product-weapon-card';
      element.dataset.weaponCard = 'true';
      element.dataset.weaponId = card.id;
      const title = this.#document.createElement('strong');
      const role = this.#document.createElement('span');
      const description = this.#document.createElement('p');
      const coreVerb = this.#document.createElement('span');
      const hitResult = this.#document.createElement('small');
      const mapUse = this.#document.createElement('small');
      const tradeoff = this.#document.createElement('small');
      const counterplay = this.#document.createElement('small');
      const stats = this.#document.createElement('div');
      const behaviorStats = this.#document.createElement('div');
      const contexts = this.#document.createElement('div');
      title.dataset.weaponTitle = 'true';
      role.dataset.weaponRole = 'true';
      description.dataset.weaponDescription = 'true';
      coreVerb.dataset.weaponCoreVerb = 'true';
      hitResult.dataset.weaponHitResult = 'true';
      mapUse.dataset.weaponMapUse = 'true';
      tradeoff.dataset.weaponTradeoff = 'true';
      counterplay.dataset.weaponCounterplay = 'true';
      stats.dataset.weaponStats = 'true';
      stats.className = 'product-weapon-stats';
      behaviorStats.dataset.weaponBehaviorStats = 'true';
      behaviorStats.className = 'product-weapon-behavior-stats';
      contexts.dataset.weaponContexts = 'true';
      contexts.className = 'product-weapon-contexts';
      element.append(
        title,
        role,
        coreVerb,
        description,
        hitResult,
        mapUse,
        tradeoff,
        counterplay,
        behaviorStats,
        contexts,
        stats,
      );
      this.#updateWeaponCard(element, card);
      fragment.append(element);
    }
    list.replaceChildren(fragment);
  }

  #syncWeaponComparison(model: WebProductSceneModel): void {
    const comparison = this.#readyNodes().weaponComparison;
    if (!comparison) return;
    const comparisonRows = [
      ...model.weaponComparison.map((row) => ({ row, kind: 'main' as const })),
      ...model.weaponBehaviorComparison.map((row) => ({ row, kind: 'behavior' as const })),
    ];
    if (comparisonRows.length === 0) {
      comparison.replaceChildren();
      return;
    }
    const fragment = this.#document.createDocumentFragment();
    const header = this.#document.createElement('div');
    header.className = 'product-weapon-comparison-row is-header';
    header.setAttribute('role', 'row');
    const headerLabel = this.#document.createElement('span');
    headerLabel.textContent = '数值';
    headerLabel.setAttribute('role', 'columnheader');
    header.append(headerLabel);
    const firstRow = comparisonRows[0]!.row;
    for (const value of firstRow.values) {
      const weapon = this.#document.createElement('span');
      weapon.textContent = value.weaponName;
      weapon.setAttribute('role', 'columnheader');
      header.append(weapon);
    }
    fragment.append(header);
    for (const { row: rowValue, kind } of comparisonRows) {
      const row = this.#document.createElement('div');
      row.className = 'product-weapon-comparison-row';
      row.dataset.weaponComparisonRow = rowValue.id;
      row.dataset.weaponComparisonSurface = kind;
      row.setAttribute('role', 'row');
      const label = this.#document.createElement('span');
      label.textContent = `${kind === 'behavior' ? '行为·' : ''}${rowValue.label} (${rowValue.unit})`;
      label.setAttribute('role', 'rowheader');
      row.append(label);
      for (const value of rowValue.values) {
        const cell = this.#document.createElement('span');
        const direction = value.direction === 'lower-is-better'
          ? '↓'
          : value.direction === 'higher-is-risk' ? '⚠' : '↑';
        cell.textContent = `${value.value.toFixed(value.precision)}${value.unit} ${direction}`;
        cell.dataset.weaponComparisonValue = value.weaponId;
        cell.setAttribute('role', 'cell');
        cell.setAttribute(
          'aria-label',
          `${value.weaponName}${rowValue.label}${value.value.toFixed(value.precision)}${value.unit}，${weaponDirectionHint(value.direction)}`,
        );
        cell.title = weaponDirectionHint(value.direction);
        row.append(cell);
      }
      fragment.append(row);
    }
    comparison.replaceChildren(fragment);
  }

  #syncInteractive(): void {
    if (!this.#lastModel) return;
    const nodes = this.#readyNodes();
    this.#root.setAttribute('aria-busy', String(this.#lastModel.busy || this.#dispatching));
    this.#setIntent(nodes.primary, this.#lastModel.primaryAction);
    this.#setIntent(nodes.secondary, this.#lastModel.secondaryAction);
    for (const element of nodes.characterList.querySelectorAll<HTMLButtonElement>('button')) {
      element.disabled = this.#dispatching || !this.#lastViewModel?.inputEnabled;
    }
  }

  render(viewModel: ProductSessionViewModel): boolean {
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
      model.weaponCards.map((card) => [
        card.id,
        card.coreVerb,
        card.tradeoff,
        card.counterplay,
        card.stats.map((stat) => `${stat.id}=${stat.value}`).join(','),
        card.behaviorStats.map((stat) => `${stat.id}=${stat.value}`).join(','),
        card.contexts.map((context) => `${context.id}:${context.stats.map((stat) => stat.value).join(',')}`).join(';'),
      ].join(':')).join('|'),
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
    const nodes = this.#readyNodes();
    setText(nodes.kicker, model.kicker);
    setText(nodes.title, model.title);
    setText(nodes.body, model.body);
    nodes.body.hidden = model.body.length === 0;
    setText(nodes.live, model.announcement);
    for (const visual of nodes.visuals) {
      visual.hidden = visual.dataset.productVisual !== model.scene;
    }
    setImage(nodes.heroImage, model.lobbyAsset, '跑酷学徒和发条方块站在竞技场平台上');
    this.#syncCharacterCards(model);
    this.#syncWeaponCards(model);
    this.#syncWeaponComparison(model);
    setImage(
      nodes.matchingPlayerImage,
      model.selectedCharacterAsset,
      model.selectedCharacterName,
    );
    setText(nodes.matchingPlayerName, model.selectedCharacterName);
    setImage(nodes.matchingOpponentImage, model.opponentPortraitAsset, '等待中的挑战者');
    setText(nodes.matchingOpponentName, model.opponentName);
    setImage(nodes.resultImage, model.selectedCharacterAsset, model.selectedCharacterName);
    setText(
      nodes.resultMark,
      model.outcome === 'win' ? 'WIN' : model.outcome === 'draw' ? 'DRAW' : 'NEXT',
    );
    setText(
      nodes.rewardValue,
      model.experienceDelta === null ? '' : `EXP +${model.experienceDelta}`,
    );
    setImage(nodes.rewardImage, model.selectedCharacterAsset, model.selectedCharacterName);
    setText(
      nodes.rewardMark,
      model.outcome === 'win' ? 'WIN' : model.outcome === 'draw' ? 'DRAW' : 'NEXT',
    );
    setText(
      nodes.rewardSceneValue,
      model.experienceDelta === null ? '奖励结算完成' : `EXP +${model.experienceDelta}`,
    );
    setImage(nodes.unlockImage, model.unlockAsset, model.unlockName || '新内容');
    setText(nodes.unlockName, model.unlockName);
    setText(nodes.errorMessage, model.errorMessage || model.body);
    this.#syncInteractive();
    return true;
  }

  resize(viewport: ViewportLike = {}, inputViewport: ViewportLike = {}): boolean {
    if (this.#state === WEB_PRODUCT_UI_SURFACE_STATE.DISPOSED) return false;
    const width = positiveFinite(
      viewportDimension(inputViewport, 'width'),
      positiveFinite(viewportDimension(viewport, 'width')),
    );
    const height = positiveFinite(
      viewportDimension(inputViewport, 'height'),
      positiveFinite(viewportDimension(viewport, 'height')),
    );
    this.#inputViewport = Object.freeze({ width, height });
    this.#root.style.setProperty(
      '--arena-viewport-width',
      `${positiveFinite(viewportDimension(viewport, 'width'), width)}px`,
    );
    this.#root.style.setProperty(
      '--arena-viewport-height',
      `${positiveFinite(viewportDimension(viewport, 'height'), height)}px`,
    );
    return true;
  }

  getInputViewport(fallback: ViewportLike = {}): Readonly<{ width: number; height: number }> {
    if (this.#inputViewport) return this.#inputViewport;
    return Object.freeze({
      width: positiveFinite(viewportDimension(fallback, 'width')),
      height: positiveFinite(viewportDimension(fallback, 'height')),
    });
  }

  hitTestUi(): null {
    return null;
  }

  present(): boolean {
    this.#assertReady();
    return true;
  }

  requiresCompositeFrame(): boolean {
    this.#assertReady();
    return false;
  }

  bindIntent(optionsValue: unknown = {}): () => void {
    this.#assertReady();
    if (!optionsValue || typeof optionsValue !== 'object' || Array.isArray(optionsValue)) {
      throw new TypeError('WebProductUiSurface bindIntent options 必须是普通对象。');
    }
    const prototype = Object.getPrototypeOf(optionsValue);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('WebProductUiSurface bindIntent options 必须是普通对象。');
    }
    const descriptors = Object.getOwnPropertyDescriptors(optionsValue);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string' || (key !== 'onIntent' && key !== 'onRejected')) {
        throw new RangeError(`WebProductUiSurface bindIntent 不支持 ${String(key)}。`);
      }
      if (!Object.hasOwn(descriptors[key]!, 'value')) {
        throw new TypeError(`WebProductUiSurface bindIntent.${key} 不能是访问器。`);
      }
    }
    const onIntent = requiredFunction<IntentHandler>(
      descriptors.onIntent?.value,
      'WebProductUiSurface.onIntent',
    );
    const onRejected = descriptors.onRejected === undefined
      ? (() => {}) as IntentRejectedHandler
      : requiredFunction<IntentRejectedHandler>(
        descriptors.onRejected.value,
        'WebProductUiSurface.onRejected',
      );
    if (this.#bindingCleanup !== null) {
      throw new Error('WebProductUiSurface intent 已绑定。');
    }
    const listener = (event: Event) => {
      const target = event.target;
      const element = target && typeof (target as Element).closest === 'function'
        ? (target as Element).closest<HTMLButtonElement>('[data-product-intent]')
        : null;
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

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      state: this.#state,
      scene: this.#lastModel?.scene ?? null,
      dispatching: this.#dispatching,
      bound: this.#bindingCleanup !== null,
      inputViewport: this.#inputViewport,
    });
  }

  dispose(): void {
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
