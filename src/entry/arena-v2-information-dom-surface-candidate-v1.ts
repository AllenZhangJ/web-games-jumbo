import {
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_UI_VISUAL_TOKENS_V1,
  createArenaV2UiDomSurfaceModelV1,
  requireArenaV2UiVisualToneTokenV1,
  resolveArenaV2UiActionRevealV1,
  resolveArenaV2UiPrimitiveRevealV1,
  resolveArenaV2UiKeyboardIntentV1,
  resolveArenaV2UiPointerIntentV1,
  resolveArenaV2UiScrollDeltaV1,
  type ArenaV2UiDomNodeV1,
  type ArenaV2UiRenderPlanV1,
} from '@number-strategy-jump/arena-product-presentation';

export const ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1 = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

type SurfaceState = typeof ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1
];
type IntentHandler = (intentId: string) => unknown;
type RejectedHandler = (error: unknown, intentId: string | null) => unknown;
type ScrollOffsetHandler = (offsetCssPixels: number) => unknown;

function hostRoot(value: unknown): HTMLElement {
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || typeof (value as HTMLElement).append !== 'function'
    || typeof (value as HTMLElement).addEventListener !== 'function') {
    throw new TypeError('Arena V2 DOM Surface需要专用HTMLElement根节点。');
  }
  const root = value as HTMLElement;
  if (!root.ownerDocument || !root.ownerDocument.defaultView) {
    throw new TypeError('Arena V2 DOM Surface根节点缺少可用Document/Window。');
  }
  return root;
}

function functionValue<T extends (...args: never[]) => unknown>(
  value: unknown,
  name: string,
): T {
  if (typeof value !== 'function') throw new TypeError(`${name}必须是函数。`);
  return value as T;
}

function elementTag(node: ArenaV2UiDomNodeV1): string {
  return node.element.toUpperCase();
}

function fontSize(node: ArenaV2UiDomNodeV1): string {
  if (node.semanticRole === 'heading') return 'clamp(22px, 5.8vw, 32px)';
  if (node.semanticRole === 'button') return '17px';
  if (node.semanticRole === 'navigation') return '13px';
  return node.style.fixedWidthNumeric ? '15px' : '14px';
}

function clipPath(node: ArenaV2UiDomNodeV1): string {
  const clip = node.clipRect;
  if (clip === null) return 'none';
  const style = node.style;
  const top = Math.max(0, clip.y - style.topCssPixels);
  const right = Math.max(
    0,
    style.leftCssPixels + style.widthCssPixels - (clip.x + clip.width),
  );
  const bottom = Math.max(
    0,
    style.topCssPixels + style.heightCssPixels - (clip.y + clip.height),
  );
  const left = Math.max(0, clip.x - style.leftCssPixels);
  return `inset(${top}px ${right}px ${bottom}px ${left}px)`;
}

function targetPrimitiveId(value: EventTarget | null, root: HTMLElement): string | null {
  if (value === null || typeof (value as Element).closest !== 'function') return null;
  const element = (value as Element).closest<HTMLElement>('[data-arena-v2-primitive-id]');
  if (!element || !root.contains(element)) return null;
  return element.dataset.arenaV2PrimitiveId ?? null;
}

function localPoint(event: PointerEvent, root: HTMLElement): Readonly<{ x: number; y: number }> {
  const bounds = root.getBoundingClientRect();
  return Object.freeze({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
}

export class ArenaV2InformationDomSurfaceCandidateV1 {
  readonly #hostRoot: HTMLElement;
  readonly #document: Document;
  readonly #window: Window;
  #surfaceRoot: HTMLDivElement | null = null;
  #liveRegion: HTMLDivElement | null = null;
  #state: SurfaceState = ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.CREATED;
  #plan: ArenaV2UiRenderPlanV1 | null = null;
  #scrollOffsetCssPixels = 0;
  #nodes = new Map<string, HTMLElement>();
  #onIntent: IntentHandler | null = null;
  #onRejected: RejectedHandler | null = null;
  #onScrollOffset: ScrollOffsetHandler | null = null;
  #dispatching = false;
  #pointerDownListenerBound = false;
  #pointerUpListenerBound = false;
  #pointerCancelListenerBound = false;
  #lostPointerCaptureListenerBound = false;
  #keyDownListenerBound = false;
  #wheelListenerBound = false;
  #blurListenerBound = false;
  #visibilityListenerBound = false;
  #surfaceRemoved = true;
  #pointer: Readonly<{ pointerId: number; primitiveId: string }> | null = null;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #releasingPointerCapture = false;

  constructor(rootValue: unknown) {
    this.#hostRoot = hostRoot(rootValue);
    this.#document = this.#hostRoot.ownerDocument;
    this.#window = this.#document.defaultView!;
    Object.freeze(this);
  }

  get state(): SurfaceState {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  get scrollOffsetCssPixels(): number {
    this.#assertNoOperation('scroll offset read');
    return this.#scrollOffsetCssPixels;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`Arena V2 DOM Surface ${this.#operation}期间拒绝${operation}。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('Arena V2 DOM Surface缺少当前操作所有权。');
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    let failed = false;
    let failureValue: unknown = null;
    let result!: T;
    try {
      result = run();
    } catch (error) {
      failed = true;
      failureValue = error;
    } finally {
      this.#operation = null;
    }
    const reentryError = this.#reentryError;
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#state = ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.FAILED;
      throw failed && failureValue !== reentryError
        ? new AggregateError(
          [failureValue, reentryError],
          `Arena V2 DOM Surface ${operation}失败且检测到同步重入。`,
        )
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #runEventOperation<T>(operation: string, message: string, run: () => T): T {
    try {
      return this.#runSynchronousOperation(operation, run);
    } catch (error) {
      if (this.#operation !== null
        || this.#state === ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.FAILED
        || this.#state === ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.DISPOSED) {
        throw error;
      }
      return this.#runSynchronousOperation(`${operation}-failure`, () => (
        this.#failRuntimeOperation(error, message)
      ));
    }
  }

  #assertReady(): void {
    if (this.#state !== ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.READY
      || this.#surfaceRoot === null || this.#liveRegion === null) {
      throw new Error(`Arena V2 DOM Surface当前状态不可用：${this.#state}。`);
    }
  }

  load(): this {
    return this.#runSynchronousOperation('load', () => {
    if (this.#state === ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.DISPOSED) {
      throw new Error('Arena V2 DOM Surface已销毁。');
    }
    if (this.#state === ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.FAILED) {
      throw new Error('Arena V2 DOM Surface清理不完整，只允许继续dispose。');
    }
    if (this.#state === ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.READY) return this;
    const surface = this.#document.createElement('div');
    this.#assertCurrentOperationCommit();
    this.#surfaceRoot = surface;
    try {
      surface.dataset.arenaV2InformationSurfaceCandidate = 'v1';
      surface.setAttribute('aria-label', '竞技场菜单');
      this.#assertCurrentOperationCommit();
      Object.assign(surface.style, {
        position: 'absolute', inset: '0', overflow: 'hidden', isolation: 'isolate',
        fontFamily: ARENA_V2_UI_VISUAL_TOKENS_V1.typography.chineseFontStack,
        WebkitTapHighlightColor: 'transparent', userSelect: 'none',
      });
      const live = this.#document.createElement('div');
      this.#assertCurrentOperationCommit();
      this.#liveRegion = live;
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      this.#assertCurrentOperationCommit();
      Object.assign(live.style, {
        position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px',
        overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: '0',
      });
      surface.append(live);
      this.#assertCurrentOperationCommit();
      this.#pointerDownListenerBound = true;
      surface.addEventListener('pointerdown', this.#handlePointerDown);
      this.#assertCurrentOperationCommit();
      this.#pointerUpListenerBound = true;
      surface.addEventListener('pointerup', this.#handlePointerUp);
      this.#assertCurrentOperationCommit();
      this.#pointerCancelListenerBound = true;
      surface.addEventListener('pointercancel', this.#handlePointerClear);
      this.#assertCurrentOperationCommit();
      this.#lostPointerCaptureListenerBound = true;
      surface.addEventListener('lostpointercapture', this.#handlePointerClear);
      this.#assertCurrentOperationCommit();
      this.#keyDownListenerBound = true;
      surface.addEventListener('keydown', this.#handleKeyDown);
      this.#assertCurrentOperationCommit();
      this.#wheelListenerBound = true;
      surface.addEventListener('wheel', this.#handleWheel, { passive: false });
      this.#assertCurrentOperationCommit();
      this.#blurListenerBound = true;
      this.#window.addEventListener('blur', this.#handlePointerClear);
      this.#assertCurrentOperationCommit();
      this.#visibilityListenerBound = true;
      this.#document.addEventListener('visibilitychange', this.#handleVisibilityChange);
      this.#assertCurrentOperationCommit();
      this.#surfaceRemoved = false;
      this.#hostRoot.append(surface);
      this.#assertCurrentOperationCommit();
      this.#state = ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.READY;
      return this;
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      this.#state = ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.FAILED;
      const cleanupErrors = this.#cleanupOwnedResources();
      if (cleanupErrors.length === 0) {
        this.#state = ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.CREATED;
        throw error;
      }
      throw new AggregateError(
        [error, ...cleanupErrors],
        'Arena V2 DOM Surface加载失败且回滚不完整。',
      );
    }
    });
  }

  bindIntent(value: unknown): () => void {
    return this.#runSynchronousOperation('bind-intent', () => {
    this.#assertReady();
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Arena V2 DOM Surface bindIntent必须是对象。');
    }
    const source = value as Readonly<Record<string, unknown>>;
    if (Object.keys(source).some((key) => key !== 'onIntent' && key !== 'onRejected')) {
      throw new RangeError('Arena V2 DOM Surface bindIntent字段不闭合。');
    }
    if (this.#onIntent !== null) throw new Error('Arena V2 DOM Surface Intent已绑定。');
    this.#onIntent = functionValue<IntentHandler>(source.onIntent, 'Arena V2 DOM Surface onIntent');
    this.#onRejected = source.onRejected === undefined
      ? null
      : functionValue<RejectedHandler>(source.onRejected, 'Arena V2 DOM Surface onRejected');
    let active = true;
    return () => {
      this.#assertNoOperation('unbind-intent');
      if (!active) return;
      this.#runSynchronousOperation('unbind-intent', () => {
        this.#onIntent = null;
        this.#onRejected = null;
        this.#clearPointerOwned();
        active = false;
      });
    };
    });
  }

  bindScrollOffset(onChange: unknown): () => void {
    return this.#runSynchronousOperation('bind-scroll-offset', () => {
    if (this.#state === ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.DISPOSED) {
      throw new Error('Arena V2 DOM Surface已销毁。');
    }
    if (this.#state === ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.FAILED) {
      throw new Error('Arena V2 DOM Surface清理不完整，只允许继续dispose。');
    }
    if (this.#onScrollOffset !== null) {
      throw new Error('Arena V2 DOM Surface滚动偏移观察者已绑定。');
    }
    this.#onScrollOffset = functionValue<ScrollOffsetHandler>(
      onChange,
      'Arena V2 DOM Surface滚动偏移观察者',
    );
    let active = true;
    return () => {
      this.#assertNoOperation('unbind-scroll-offset');
      if (!active) return;
      this.#runSynchronousOperation('unbind-scroll-offset', () => {
        this.#onScrollOffset = null;
        active = false;
      });
    };
    });
  }

  #publishScrollOffset(): void {
    if (this.#onScrollOffset === null) return;
    rejectThenable(
      this.#onScrollOffset(this.#scrollOffsetCssPixels),
      'Arena V2 DOM Surface滚动偏移观察者',
    );
  }

  #dispatch(intentId: string): void {
    if (this.#onIntent === null || this.#dispatching) return;
    this.#dispatching = true;
    try {
      rejectThenable(this.#onIntent(intentId), 'Arena V2 DOM Surface onIntent');
    } catch (error) {
      if (this.#onRejected === null) throw error;
      rejectThenable(
        this.#onRejected(error, intentId),
        'Arena V2 DOM Surface onRejected',
      );
    } finally {
      this.#dispatching = false;
    }
  }

  #syncNode(node: ArenaV2UiDomNodeV1): void {
    const surface = this.#surfaceRoot!;
    let element = this.#nodes.get(node.id);
    if (element && element.tagName !== elementTag(node)) {
      element.remove();
      this.#nodes.delete(node.id);
      element = undefined;
    }
    if (!element) {
      element = this.#document.createElement(node.element);
      element.dataset.arenaV2PrimitiveId = node.id;
      this.#nodes.set(node.id, element);
      surface.append(element);
    }
    if (node.element === 'button') (element as HTMLButtonElement).type = 'button';
    element.textContent = node.text ?? '';
    if (node.ariaLabel === null) element.removeAttribute('aria-label');
    else element.setAttribute('aria-label', node.ariaLabel);
    if (node.semanticRole === 'status') element.setAttribute('role', 'status');
    else if (node.semanticRole === 'navigation') element.setAttribute('role', 'navigation');
    else if (node.semanticRole === 'presentation') element.setAttribute('role', 'presentation');
    else element.removeAttribute('role');
    if (node.ariaDisabled === null) element.removeAttribute('aria-disabled');
    else element.setAttribute('aria-disabled', String(node.ariaDisabled));
    element.tabIndex = node.tabIndex;
    if (node.intentId === null) delete element.dataset.arenaV2IntentId;
    else element.dataset.arenaV2IntentId = node.intentId;
    if (node.disabledReason === null) delete element.dataset.arenaV2DisabledReason;
    else element.dataset.arenaV2DisabledReason = node.disabledReason;
    const visualText = node.text !== null;
    const transparentAction = node.semanticRole === 'button' && node.style.tone === 'transparent';
    const visualTone = requireArenaV2UiVisualToneTokenV1(node.style.tone);
    const tokens = ARENA_V2_UI_VISUAL_TOKENS_V1;
    Object.assign(element.style, {
      position: node.style.position,
      left: `${node.style.leftCssPixels}px`,
      top: `${node.style.topCssPixels}px`,
      width: `${node.style.widthCssPixels}px`,
      height: `${node.style.heightCssPixels}px`,
      zIndex: String(node.style.zIndex),
      boxSizing: 'border-box',
      overflow: node.style.overflow,
      pointerEvents: node.style.pointerEvents,
      touchAction: node.style.touchAction,
      clipPath: clipPath(node),
      margin: '0',
      padding: node.semanticRole === 'button' ? '0 18px' : '0',
      border: node.semanticRole === 'button' && !transparentAction
        ? `${tokens.strokes.action.widthCssPixels}px solid ${tokens.strokes.action.color}` : '0',
      borderRadius: node.semanticRole === 'button'
        ? `${tokens.radiiCssPixels.action}px`
        : visualText ? `${tokens.radiiCssPixels.none}px` : `${tokens.radiiCssPixels.panel}px`,
      background: node.semanticRole === 'button'
        ? visualTone.fill
        : visualText ? 'transparent' : visualTone.fill,
      color: visualTone.text,
      fontSize: fontSize(node),
      fontWeight: String(node.semanticRole === 'heading' || node.semanticRole === 'button'
        ? tokens.typography.domEmphasisWeight
        : tokens.typography.domStandardWeight),
      fontFamily: node.style.fixedWidthNumeric
        ? tokens.typography.numericFontStack
        : tokens.typography.chineseFontStack,
      fontVariantNumeric: node.style.fixedWidthNumeric
        ? tokens.typography.numericVariant
        : tokens.typography.standardVariant,
      textAlign: node.style.textAlign ?? 'left',
      lineHeight: String(tokens.typography.lineHeight),
      display: visualText ? '-webkit-box' : 'block',
      WebkitBoxOrient: visualText ? 'vertical' : '',
      WebkitLineClamp: visualText && node.style.maximumLines !== null
        ? String(node.style.maximumLines) : '',
      alignItems: node.semanticRole === 'button' ? 'center' : '',
      justifyContent: node.semanticRole === 'button' ? 'center' : '',
      whiteSpace: visualText ? 'pre-line' : '',
    });
    if (node.semanticRole === 'button') {
      element.style.display = 'flex';
      (element as HTMLButtonElement).disabled = node.ariaDisabled === true;
    }
    this.#assertCurrentOperationCommit();
  }

  #syncCurrentPlan(): void {
    if (this.#operation === null) {
      this.#runSynchronousOperation('event-render', () => this.#syncCurrentPlan());
      return;
    }
    this.#assertReady();
    if (this.#plan === null) throw new Error('Arena V2 DOM Surface缺少RenderPlan。');
    const model = createArenaV2UiDomSurfaceModelV1(
      this.#plan,
      this.#scrollOffsetCssPixels,
    );
    const expected = new Set(model.nodes.map(({ id }) => id));
    for (const [id, element] of this.#nodes) {
      if (expected.has(id)) continue;
      element.remove();
      this.#assertCurrentOperationCommit();
      this.#nodes.delete(id);
    }
    model.nodes.forEach((node) => this.#syncNode(node));
    this.#surfaceRoot!.setAttribute('aria-label', model.rootAriaLabel);
    this.#surfaceRoot!.style.touchAction = model.rootTouchAction;
    this.#liveRegion!.textContent = model.liveRegion.messages.join(' ');
    this.#assertCurrentOperationCommit();
  }

  render(plan: ArenaV2UiRenderPlanV1): void {
    this.#runSynchronousOperation('render', () => {
    this.#assertReady();
    if (plan.schemaVersion !== 1 || plan.productionReady !== false
      || plan.status !== 'layout-candidate') {
      throw new RangeError('Arena V2 DOM Surface只接受未晋级RenderPlan V1。');
    }
    for (const primitive of plan.primitives) {
      requireArenaV2UiVisualToneTokenV1(primitive.tone);
    }
    try {
      if (this.#plan === null || this.#plan.identity !== plan.identity
        || this.#plan.revision !== plan.revision) {
        this.#scrollOffsetCssPixels = 0;
      }
      this.#plan = plan;
      this.#syncCurrentPlan();
    } catch (error) {
      this.#failRuntimeOperation(error, 'Arena V2 DOM Surface render失败。');
    }
    });
  }

  revealActionPrimitive(primitiveId: unknown): void {
    let publish = false;
    try {
      this.#runSynchronousOperation('reveal-action', () => {
        this.#assertReady();
        if (this.#plan === null) throw new Error('Arena V2 DOM Surface缺少可显示的RenderPlan。');
        const resolved = resolveArenaV2UiActionRevealV1(
          this.#plan,
          primitiveId,
          this.#scrollOffsetCssPixels,
        );
        if (!resolved.changed) return;
          this.#scrollOffsetCssPixels = resolved.nextOffsetCssPixels;
          this.#syncCurrentPlan();
        publish = true;
      });
      if (publish) this.#publishScrollOffset();
    } catch (error) {
      this.#runSynchronousOperation('reveal-action-failure', () => (
        this.#failRuntimeOperation(error, 'Arena V2 DOM Surface显示动作失败。')
      ));
    }
  }

  revealPrimitive(primitiveId: unknown): void {
    let publish = false;
    try {
      this.#runSynchronousOperation('reveal-primitive', () => {
        this.#assertReady();
        if (this.#plan === null) throw new Error('Arena V2 DOM Surface缺少可显示的RenderPlan。');
        const resolved = resolveArenaV2UiPrimitiveRevealV1(
          this.#plan,
          primitiveId,
          this.#scrollOffsetCssPixels,
        );
        if (!resolved.changed) return;
        this.#scrollOffsetCssPixels = resolved.nextOffsetCssPixels;
        this.#syncCurrentPlan();
        publish = true;
      });
      if (publish) this.#publishScrollOffset();
    } catch (error) {
      this.#runSynchronousOperation('reveal-primitive-failure', () => (
        this.#failRuntimeOperation(error, 'Arena V2 DOM Surface显示内容失败。')
      ));
    }
  }

  readonly #handlePointerDown = (event: PointerEvent): void => {
    this.#runEventOperation('pointer-down', 'Arena V2 DOM Surface按下事件失败。', () => {
      if (this.#plan === null || this.#surfaceRoot === null) return;
      const primitiveId = targetPrimitiveId(event.target, this.#surfaceRoot);
      this.#assertCurrentOperationCommit();
      if (primitiveId === null) return;
      const point = localPoint(event, this.#surfaceRoot);
      this.#assertCurrentOperationCommit();
      const resolved = resolveArenaV2UiPointerIntentV1(
        this.#plan,
        point,
        this.#scrollOffsetCssPixels,
      );
      if (resolved.status !== 'accepted' || resolved.primitiveId !== primitiveId) return;
      this.#pointer = Object.freeze({ pointerId: event.pointerId, primitiveId });
      this.#surfaceRoot.setPointerCapture?.(event.pointerId);
      this.#assertCurrentOperationCommit();
      event.preventDefault();
      this.#assertCurrentOperationCommit();
    });
  };

  readonly #handlePointerUp = (event: PointerEvent): void => {
    const intentId = this.#runEventOperation(
      'pointer-up',
      'Arena V2 DOM Surface抬起事件失败。',
      (): string | null => {
        if (this.#plan === null || this.#surfaceRoot === null || this.#pointer === null
          || this.#pointer.pointerId !== event.pointerId) return null;
        const pointer = this.#pointer;
        this.#clearPointerOwned();
        const primitiveId = targetPrimitiveId(event.target, this.#surfaceRoot);
        this.#assertCurrentOperationCommit();
        const point = localPoint(event, this.#surfaceRoot);
        this.#assertCurrentOperationCommit();
        const resolved = resolveArenaV2UiPointerIntentV1(
          this.#plan,
          point,
          this.#scrollOffsetCssPixels,
        );
        if (primitiveId !== pointer.primitiveId || resolved.status !== 'accepted') return null;
        event.preventDefault();
        this.#assertCurrentOperationCommit();
        return resolved.intentId;
      },
    );
    if (intentId !== null) this.#dispatch(intentId);
  };

  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    const intentId = this.#runEventOperation(
      'key-down',
      'Arena V2 DOM Surface键盘事件失败。',
      (): string | null => {
        if (this.#plan === null || this.#surfaceRoot === null || event.repeat) return null;
        const primitiveId = targetPrimitiveId(event.target, this.#surfaceRoot);
        this.#assertCurrentOperationCommit();
        const resolved = resolveArenaV2UiKeyboardIntentV1(this.#plan, primitiveId, event.key);
        if (resolved.status !== 'accepted') return null;
        event.preventDefault();
        this.#assertCurrentOperationCommit();
        return resolved.intentId;
      },
    );
    if (intentId !== null) this.#dispatch(intentId);
  };

  readonly #handleWheel = (event: WheelEvent): void => {
    try {
      const publish = this.#runEventOperation(
        'wheel-scroll',
        'Arena V2 DOM Surface滚轮事件失败。',
        (): boolean => {
          if (this.#plan?.scrollRegion === null || this.#plan === null) return false;
          const resolved = resolveArenaV2UiScrollDeltaV1(
            this.#plan,
            this.#scrollOffsetCssPixels,
            event.deltaY,
          );
          if (resolved.nextOffsetCssPixels === this.#scrollOffsetCssPixels) return false;
        this.#scrollOffsetCssPixels = resolved.nextOffsetCssPixels;
          this.#syncCurrentPlan();
          event.preventDefault();
          this.#assertCurrentOperationCommit();
          return true;
        },
      );
      if (publish) this.#publishScrollOffset();
    } catch (error) {
      if (this.#state === ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.FAILED) throw error;
      this.#runSynchronousOperation('wheel-scroll-failure', () => (
        this.#failRuntimeOperation(error, 'Arena V2 DOM Surface滚动提交失败。')
      ));
    }
  };

  readonly #handleVisibilityChange = (): void => {
    this.#runEventOperation(
      'visibility-change',
      'Arena V2 DOM Surface可见性事件失败。',
      () => {
        if (this.#document.visibilityState !== 'visible') this.#clearPointerOwned();
      },
    );
  };

  readonly #handlePointerClear = (): void => {
    if (this.#releasingPointerCapture) return;
    this.#runEventOperation(
      'pointer-clear',
      'Arena V2 DOM Surface指针清理事件失败。',
      () => this.#clearPointerOwned(),
    );
  };

  #clearPointerOwned(): void {
    const pointer = this.#pointer;
    if (pointer === null) return;
    const surfaceRoot = this.#surfaceRoot;
    const hasPointerCapture = surfaceRoot?.hasPointerCapture?.(pointer.pointerId) === true;
    this.#assertCurrentOperationCommit();
    if (hasPointerCapture && surfaceRoot !== null) {
      this.#releasingPointerCapture = true;
      try {
        rejectThenable(
          surfaceRoot.releasePointerCapture(pointer.pointerId),
          'Arena V2 DOM Surface releasePointerCapture',
        );
        this.#assertCurrentOperationCommit();
      } finally {
        this.#releasingPointerCapture = false;
      }
    }
    this.#pointer = null;
  }

  #cleanupOwnedResources(): readonly unknown[] {
    const errors: unknown[] = [];
    let mayContinue = true;
    this.#plan = null;
    this.#onIntent = null;
    this.#onRejected = null;
    this.#onScrollOffset = null;
    try {
      this.#clearPointerOwned();
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      errors.push(error);
      mayContinue = false;
    }
    const surface = this.#surfaceRoot;
    const releaseSurfaceListener = (
      bound: boolean,
      type: string,
      listener: EventListener,
      markReleased: () => void,
    ): void => {
      if (!mayContinue || !bound || surface === null) return;
      try {
        rejectThenable(
          surface.removeEventListener(type, listener),
          `Arena V2 DOM Surface removeEventListener(${type})`,
        );
        this.#assertCurrentOperationCommit();
        markReleased();
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    };
    releaseSurfaceListener(
      this.#pointerDownListenerBound,
      'pointerdown',
      this.#handlePointerDown as EventListener,
      () => { this.#pointerDownListenerBound = false; },
    );
    releaseSurfaceListener(
      this.#pointerUpListenerBound,
      'pointerup',
      this.#handlePointerUp as EventListener,
      () => { this.#pointerUpListenerBound = false; },
    );
    releaseSurfaceListener(
      this.#pointerCancelListenerBound,
      'pointercancel',
      this.#handlePointerClear as EventListener,
      () => { this.#pointerCancelListenerBound = false; },
    );
    releaseSurfaceListener(
      this.#lostPointerCaptureListenerBound,
      'lostpointercapture',
      this.#handlePointerClear as EventListener,
      () => { this.#lostPointerCaptureListenerBound = false; },
    );
    releaseSurfaceListener(
      this.#keyDownListenerBound,
      'keydown',
      this.#handleKeyDown as EventListener,
      () => { this.#keyDownListenerBound = false; },
    );
    releaseSurfaceListener(
      this.#wheelListenerBound,
      'wheel',
      this.#handleWheel as EventListener,
      () => { this.#wheelListenerBound = false; },
    );
    if (mayContinue && this.#blurListenerBound) {
      try {
        rejectThenable(
          this.#window.removeEventListener('blur', this.#handlePointerClear),
          'Arena V2 DOM Surface removeEventListener(blur)',
        );
        this.#assertCurrentOperationCommit();
        this.#blurListenerBound = false;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    if (mayContinue && this.#visibilityListenerBound) {
      try {
        rejectThenable(
          this.#document.removeEventListener(
            'visibilitychange',
            this.#handleVisibilityChange,
          ),
          'Arena V2 DOM Surface removeEventListener(visibilitychange)',
        );
        this.#assertCurrentOperationCommit();
        this.#visibilityListenerBound = false;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    const listenersReleased = !this.#pointerDownListenerBound
      && !this.#pointerUpListenerBound
      && !this.#pointerCancelListenerBound
      && !this.#lostPointerCaptureListenerBound
      && !this.#keyDownListenerBound
      && !this.#wheelListenerBound
      && !this.#blurListenerBound
      && !this.#visibilityListenerBound;
    if (mayContinue && listenersReleased && this.#pointer === null
      && !this.#surfaceRemoved && surface !== null) {
      try {
        rejectThenable(surface.remove(), 'Arena V2 DOM Surface root.remove');
        this.#assertCurrentOperationCommit();
        this.#surfaceRemoved = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    if (listenersReleased && this.#pointer === null && this.#surfaceRemoved) {
      this.#nodes.clear();
      this.#surfaceRoot = null;
      this.#liveRegion = null;
    }
    return Object.freeze(errors);
  }

  #failRuntimeOperation(error: unknown, message: string): never {
    this.#state = ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.FAILED;
    const cleanupErrors = this.#cleanupOwnedResources();
    throw cleanupErrors.length === 0
      ? error
      : new AggregateError([error, ...cleanupErrors], message);
  }

  dispose(): void {
    this.#assertNoOperation('dispose');
    if (this.#state === ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.DISPOSED) return;
    this.#runSynchronousOperation('dispose', () => {
    this.#state = ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.FAILED;
    const errors = this.#cleanupOwnedResources();
    if (this.#surfaceRoot === null) {
      this.#state = ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.DISPOSED;
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2 DOM Surface清理不完整。');
    }
    });
  }
}

export const ARENA_V2_INFORMATION_DOM_SURFACE_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  visualTokenContractId: ARENA_V2_UI_VISUAL_TOKENS_V1.id,
  formalVisualAssetsReady: false as const,
  ownsAuthorityState: false as const,
  failedLoadRollsBackThroughOwnedResourceLedger: true as const,
  cleanupRetriesOnlyIncompleteOwnedResources: true as const,
  surfaceRemovalWaitsForPointerAndListenerRelease: true as const,
  partialRenderOrScrollFailureClosesInteractiveSurface: true as const,
  actionRevealUsesSharedRenderPlanGeometry: true as const,
  actionRevealPublishesCommittedScrollOffset: true as const,
  primitiveRevealUsesSharedRenderPlanGeometry: true as const,
  primitiveRevealPublishesCommittedScrollOffset: true as const,
  synchronousIntentRerenderDoesNotLatchEnabledButtonsDisabled: true as const,
  synchronousLifecycleOperationReentryRejected: true as const,
  swallowedPlatformOrObserverReentryFailsClosed: true as const,
  publicOperationsCommitUnderStickyOperation: true as const,
  idempotentCleanupAndDisposeCheckReentryBeforeFastPath: true as const,
  pointerKeyboardWheelAndVisibilityEventsCommitUnderStickyOperation: true as const,
  intentAndScrollObserversRunAfterSurfaceOperationCommit: true as const,
  stateAndScrollReadsRejectedDuringOperationCommit: true as const,
  scrollObserverRunsAfterCommittedOperationUnlock: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  platformCallbacksCheckedBeforeSurfaceCommit: true as const,
  cleanupReentryRetainsCurrentAndLaterDomOwners: true as const,
  ordinaryCleanupFailureRetainsCurrentAndLaterDomOwners: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  validationStatus: 'not-run' as const,
});
