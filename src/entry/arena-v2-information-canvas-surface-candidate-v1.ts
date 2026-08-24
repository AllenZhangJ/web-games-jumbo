import {
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import {
  paintArenaV2UiRenderPlanV1,
  resolveArenaV2UiActionRevealV1,
  resolveArenaV2UiPrimitiveRevealV1,
  resolveArenaV2UiKeyboardIntentV1,
  resolveArenaV2UiPointerIntentV1,
  resolveArenaV2UiScrollDeltaV1,
  type ArenaV2UiCanvasPaintResultV1,
  type ArenaV2UiRenderPlanV1,
  type ArenaV2UiRenderPrimitiveV1,
} from '@number-strategy-jump/arena-product-presentation';

export const ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1 = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

type SurfaceState = typeof ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1
];
type IntentHandler = (intentId: string) => unknown;
type RejectedHandler = (error: unknown, intentId: string | null) => unknown;

interface SurfaceViewportV1 {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
}

interface OriginalCanvasStateV1 {
  readonly role: string | null;
  readonly ariaLabel: string | null;
  readonly tabIndex: number;
  readonly touchAction: string;
  readonly width: number;
  readonly height: number;
  readonly styleWidth: string;
  readonly styleHeight: string;
}

function canvasElement(value: unknown): HTMLCanvasElement {
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || typeof (value as HTMLCanvasElement).getContext !== 'function'
    || typeof (value as HTMLCanvasElement).addEventListener !== 'function') {
    throw new TypeError('Arena V2 Canvas Surface需要HTMLCanvasElement。');
  }
  const canvas = value as HTMLCanvasElement;
  if (!canvas.ownerDocument?.defaultView) {
    throw new TypeError('Arena V2 Canvas Surface缺少可用Document/Window。');
  }
  return canvas;
}

function finitePositive(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name}必须是有限正数。`);
  }
  return value;
}

function viewport(value: unknown): SurfaceViewportV1 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 Canvas viewport必须是对象。');
  }
  const source = value as Readonly<Record<string, unknown>>;
  if (Object.keys(source).some((key) => (
    key !== 'width' && key !== 'height' && key !== 'pixelRatio'
  ))) throw new RangeError('Arena V2 Canvas viewport字段不闭合。');
  return Object.freeze({
    width: finitePositive(source.width, 'Arena V2 Canvas viewport.width'),
    height: finitePositive(source.height, 'Arena V2 Canvas viewport.height'),
    pixelRatio: Math.max(0.5, Math.min(
      2,
      finitePositive(source.pixelRatio, 'Arena V2 Canvas viewport.pixelRatio'),
    )),
  });
}

function functionValue<T extends (...args: never[]) => unknown>(value: unknown, name: string): T {
  if (typeof value !== 'function') throw new TypeError(`${name}必须是函数。`);
  return value as T;
}

function focusableActions(plan: ArenaV2UiRenderPlanV1): readonly Extract<
  ArenaV2UiRenderPrimitiveV1,
  { kind: 'action' }
>[] {
  return Object.freeze(plan.primitives
    .filter((primitive): primitive is Extract<
      ArenaV2UiRenderPrimitiveV1,
      { kind: 'action' }
    > => primitive.kind === 'action' && primitive.enabled)
    .sort((left, right) => {
      const leftGroup = left.clipRect === null ? 1 : 0;
      const rightGroup = right.clipRect === null ? 1 : 0;
      return leftGroup - rightGroup
        || left.rect.y - right.rect.y
        || left.rect.x - right.rect.x
        || left.id.localeCompare(right.id);
    }));
}

export class ArenaV2InformationCanvasSurfaceCandidateV1 {
  readonly #canvas: HTMLCanvasElement;
  readonly #document: Document;
  readonly #window: Window;
  readonly #originalCanvasState: OriginalCanvasStateV1;
  #context: CanvasRenderingContext2D | null = null;
  #liveRegion: HTMLDivElement | null = null;
  #state: SurfaceState = ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.CREATED;
  #viewport: SurfaceViewportV1 | null = null;
  #plan: ArenaV2UiRenderPlanV1 | null = null;
  #scrollOffsetCssPixels = 0;
  #focusedActionPrimitiveId: string | null = null;
  #lastPaintResult: ArenaV2UiCanvasPaintResultV1 | null = null;
  #onIntent: IntentHandler | null = null;
  #onRejected: RejectedHandler | null = null;
  #dispatching = false;
  #pointerDownListenerBound = false;
  #pointerMoveListenerBound = false;
  #pointerUpListenerBound = false;
  #pointerCancelListenerBound = false;
  #lostPointerCaptureListenerBound = false;
  #keyDownListenerBound = false;
  #wheelListenerBound = false;
  #blurListenerBound = false;
  #visibilityListenerBound = false;
  #liveRegionRemoved = true;
  #roleRestored = true;
  #ariaLabelRestored = true;
  #tabIndexRestored = true;
  #touchActionRestored = true;
  #widthRestored = true;
  #heightRestored = true;
  #styleWidthRestored = true;
  #styleHeightRestored = true;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #releasingPointerCapture = false;
  #pointer: Readonly<{
    readonly pointerId: number;
    readonly startX: number;
    readonly startY: number;
    readonly previousY: number;
    readonly moved: boolean;
  }> | null = null;

  constructor(canvasValue: unknown) {
    this.#canvas = canvasElement(canvasValue);
    this.#document = this.#canvas.ownerDocument;
    this.#window = this.#document.defaultView!;
    this.#originalCanvasState = Object.freeze({
      role: this.#canvas.getAttribute('role'),
      ariaLabel: this.#canvas.getAttribute('aria-label'),
      tabIndex: this.#canvas.tabIndex,
      touchAction: this.#canvas.style.touchAction,
      width: this.#canvas.width,
      height: this.#canvas.height,
      styleWidth: this.#canvas.style.width,
      styleHeight: this.#canvas.style.height,
    });
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

  get focusedActionPrimitiveId(): string | null {
    this.#assertNoOperation('focus read');
    return this.#focusedActionPrimitiveId;
  }

  get lastPaintResult(): ArenaV2UiCanvasPaintResultV1 | null {
    this.#assertNoOperation('paint result read');
    return this.#lastPaintResult;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`Arena V2 Canvas Surface ${this.#operation}期间拒绝${operation}。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('Arena V2 Canvas Surface缺少当前操作所有权。');
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
      this.#state = ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.FAILED;
      throw failed && failureValue !== reentryError
        ? new AggregateError(
          [failureValue, reentryError],
          `Arena V2 Canvas Surface ${operation}失败且检测到同步重入。`,
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
        || this.#state === ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.FAILED
        || this.#state === ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.DISPOSED) {
        throw error;
      }
      return this.#runSynchronousOperation(`${operation}-failure`, () => (
        this.#failRuntimeOperation(error, message)
      ));
    }
  }

  #assertReady(): void {
    if (this.#state !== ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.READY
      || this.#context === null || this.#liveRegion === null) {
      throw new Error(`Arena V2 Canvas Surface当前状态不可用：${this.#state}。`);
    }
  }

  load(): this {
    return this.#runSynchronousOperation('load', () => {
    if (this.#state === ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.DISPOSED) {
      throw new Error('Arena V2 Canvas Surface已销毁。');
    }
    if (this.#state === ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.FAILED) {
      throw new Error('Arena V2 Canvas Surface清理不完整，只允许继续dispose。');
    }
    if (this.#state === ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.READY) return this;
    const context = this.#canvas.getContext('2d');
    this.#assertCurrentOperationCommit();
    if (context === null) throw new Error('Arena V2 Canvas Surface无法取得2D context。');
    this.#context = context;
    try {
      const live = this.#document.createElement('div');
      this.#assertCurrentOperationCommit();
      this.#liveRegion = live;
      this.#liveRegionRemoved = false;
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      this.#assertCurrentOperationCommit();
      Object.assign(live.style, {
        position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px',
        overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: '0',
      });
      const insertedLiveRegion = this.#canvas.insertAdjacentElement('afterend', live);
      this.#assertCurrentOperationCommit();
      if (insertedLiveRegion !== live) {
        throw new Error('Arena V2 Canvas Surface无法挂载无障碍播报节点。');
      }
      this.#roleRestored = false;
      this.#canvas.setAttribute('role', 'application');
      this.#assertCurrentOperationCommit();
      this.#ariaLabelRestored = false;
      this.#canvas.setAttribute('aria-label', '竞技场菜单');
      this.#assertCurrentOperationCommit();
      this.#tabIndexRestored = false;
      this.#canvas.tabIndex = 0;
      this.#touchActionRestored = false;
      this.#canvas.style.touchAction = 'none';
      this.#pointerDownListenerBound = true;
      this.#canvas.addEventListener('pointerdown', this.#handlePointerDown);
      this.#assertCurrentOperationCommit();
      this.#pointerMoveListenerBound = true;
      this.#canvas.addEventListener('pointermove', this.#handlePointerMove);
      this.#assertCurrentOperationCommit();
      this.#pointerUpListenerBound = true;
      this.#canvas.addEventListener('pointerup', this.#handlePointerUp);
      this.#assertCurrentOperationCommit();
      this.#pointerCancelListenerBound = true;
      this.#canvas.addEventListener('pointercancel', this.#handlePointerClear);
      this.#assertCurrentOperationCommit();
      this.#lostPointerCaptureListenerBound = true;
      this.#canvas.addEventListener('lostpointercapture', this.#handlePointerClear);
      this.#assertCurrentOperationCommit();
      this.#keyDownListenerBound = true;
      this.#canvas.addEventListener('keydown', this.#handleKeyDown);
      this.#assertCurrentOperationCommit();
      this.#wheelListenerBound = true;
      this.#canvas.addEventListener('wheel', this.#handleWheel, { passive: false });
      this.#assertCurrentOperationCommit();
      this.#blurListenerBound = true;
      this.#window.addEventListener('blur', this.#handlePointerClear);
      this.#assertCurrentOperationCommit();
      this.#visibilityListenerBound = true;
      this.#document.addEventListener('visibilitychange', this.#handleVisibilityChange);
      this.#assertCurrentOperationCommit();
      this.#state = ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.READY;
      return this;
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      this.#state = ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.FAILED;
      const cleanupErrors = this.#cleanupOwnedResources();
      if (cleanupErrors.length === 0) {
        this.#state = ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.CREATED;
        throw error;
      }
      throw new AggregateError(
        [error, ...cleanupErrors],
        'Arena V2 Canvas Surface加载失败且回滚不完整。',
      );
    }
    });
  }

  bindIntent(value: unknown): () => void {
    return this.#runSynchronousOperation('bind-intent', () => {
    this.#assertReady();
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Arena V2 Canvas Surface bindIntent必须是对象。');
    }
    const source = value as Readonly<Record<string, unknown>>;
    if (Object.keys(source).some((key) => key !== 'onIntent' && key !== 'onRejected')) {
      throw new RangeError('Arena V2 Canvas Surface bindIntent字段不闭合。');
    }
    if (this.#onIntent !== null) throw new Error('Arena V2 Canvas Surface Intent已绑定。');
    this.#onIntent = functionValue<IntentHandler>(source.onIntent, 'Arena V2 Canvas onIntent');
    this.#onRejected = source.onRejected === undefined
      ? null
      : functionValue<RejectedHandler>(source.onRejected, 'Arena V2 Canvas onRejected');
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

  resize(value: unknown): boolean {
    return this.#runSynchronousOperation('resize', () => {
    this.#assertReady();
    const next = viewport(value);
    const unchanged = this.#viewport !== null
      && this.#viewport.width === next.width
      && this.#viewport.height === next.height
      && this.#viewport.pixelRatio === next.pixelRatio;
    if (unchanged) return false;
    try {
      this.#viewport = next;
      this.#widthRestored = false;
      this.#canvas.width = Math.max(1, Math.round(next.width * next.pixelRatio));
      this.#heightRestored = false;
      this.#canvas.height = Math.max(1, Math.round(next.height * next.pixelRatio));
      this.#styleWidthRestored = false;
      this.#canvas.style.width = `${next.width}px`;
      this.#styleHeightRestored = false;
      this.#canvas.style.height = `${next.height}px`;
      this.#context!.setTransform(next.pixelRatio, 0, 0, next.pixelRatio, 0, 0);
      this.#assertCurrentOperationCommit();
      if (this.#plan !== null) this.#paint();
      return true;
    } catch (error) {
      return this.#failRuntimeOperation(error, 'Arena V2 Canvas Surface resize失败。');
    }
    });
  }

  render(plan: ArenaV2UiRenderPlanV1): void {
    this.#runSynchronousOperation('render', () => {
    this.#assertReady();
    if (this.#viewport === null) throw new Error('Arena V2 Canvas Surface必须先设置viewport。');
    if (plan.schemaVersion !== 1 || plan.productionReady !== false
      || plan.status !== 'layout-candidate') {
      throw new RangeError('Arena V2 Canvas Surface只接受未晋级RenderPlan V1。');
    }
    try {
      const pageChanged = this.#plan === null || this.#plan.identity !== plan.identity
        || this.#plan.revision !== plan.revision;
      if (pageChanged) {
        this.#scrollOffsetCssPixels = 0;
        this.#focusedActionPrimitiveId = null;
      }
      this.#plan = plan;
      const focusable = focusableActions(plan);
      if (!focusable.some(({ id }) => id === this.#focusedActionPrimitiveId)) {
        this.#focusedActionPrimitiveId = focusable[0]?.id ?? null;
      }
      this.#syncAccessibleLabel();
      this.#liveRegion!.textContent = plan.liveAnnouncements.join(' ');
      this.#paint();
    } catch (error) {
      this.#failRuntimeOperation(error, 'Arena V2 Canvas Surface render失败。');
    }
    });
  }

  revealActionPrimitive(primitiveId: unknown): void {
    this.#runSynchronousOperation('reveal-action', () => {
    this.#assertReady();
    if (this.#plan === null) throw new Error('Arena V2 Canvas Surface缺少可显示的RenderPlan。');
    try {
      const resolved = resolveArenaV2UiActionRevealV1(
        this.#plan,
        primitiveId,
        this.#scrollOffsetCssPixels,
      );
      if (!resolved.changed) return;
      this.#scrollOffsetCssPixels = resolved.nextOffsetCssPixels;
      this.#paint();
    } catch (error) {
      this.#failRuntimeOperation(error, 'Arena V2 Canvas Surface显示动作失败。');
    }
    });
  }

  revealPrimitive(primitiveId: unknown): void {
    this.#runSynchronousOperation('reveal-primitive', () => {
    this.#assertReady();
    if (this.#plan === null) throw new Error('Arena V2 Canvas Surface缺少可显示的RenderPlan。');
    try {
      const resolved = resolveArenaV2UiPrimitiveRevealV1(
        this.#plan,
        primitiveId,
        this.#scrollOffsetCssPixels,
      );
      if (!resolved.changed) return;
      this.#scrollOffsetCssPixels = resolved.nextOffsetCssPixels;
      this.#paint();
    } catch (error) {
      this.#failRuntimeOperation(error, 'Arena V2 Canvas Surface显示内容失败。');
    }
    });
  }

  #paint(): void {
    if (this.#operation === null) {
      try {
        this.#runSynchronousOperation('event-paint', () => this.#paint());
      } catch (error) {
        this.#runSynchronousOperation('event-paint-failure', () => (
          this.#failRuntimeOperation(error, 'Arena V2 Canvas Surface事件绘制失败。')
        ));
      }
      return;
    }
    const context = this.#context!;
    const view = this.#viewport!;
    const plan = this.#plan!;
    context.clearRect(0, 0, view.width, view.height);
    this.#assertCurrentOperationCommit();
    const paintResult = paintArenaV2UiRenderPlanV1(
      context,
      plan,
      this.#scrollOffsetCssPixels,
      this.#focusedActionPrimitiveId,
    );
    this.#assertCurrentOperationCommit();
    this.#lastPaintResult = paintResult;
  }

  #syncAccessibleLabel(): void {
    if (this.#operation === null) {
      try {
        this.#runSynchronousOperation(
          'event-accessibility-label',
          () => this.#syncAccessibleLabel(),
        );
      } catch (error) {
        this.#runSynchronousOperation('event-accessibility-label-failure', () => (
          this.#failRuntimeOperation(error, 'Arena V2 Canvas Surface无障碍标签提交失败。')
        ));
      }
      return;
    }
    const surfaceLabel = this.#plan?.surfaceKind === 'hud' ? '竞技状态' : '竞技场菜单';
    const focused = this.#plan?.primitives.find((primitive) => (
      primitive.kind === 'action' && primitive.id === this.#focusedActionPrimitiveId
    ));
    this.#canvas.setAttribute(
      'aria-label',
      focused?.kind === 'action'
        ? `${surfaceLabel}，当前操作：${focused.accessibilityText}`
        : surfaceLabel,
    );
    this.#assertCurrentOperationCommit();
  }

  #revealFocusedAction(): void {
    if (this.#plan?.scrollRegion === null || this.#plan === null
      || this.#focusedActionPrimitiveId === null) return;
    const action = this.#plan.primitives.find((primitive) => (
      primitive.kind === 'action' && primitive.id === this.#focusedActionPrimitiveId
    ));
    if (action?.kind !== 'action' || action.clipRect === null) return;
    const viewport = this.#plan.scrollRegion.viewport;
    const visibleTop = action.rect.y - this.#scrollOffsetCssPixels;
    const visibleBottom = visibleTop + action.rect.height;
    const delta = visibleTop < viewport.y
      ? visibleTop - viewport.y
      : visibleBottom > viewport.y + viewport.height
        ? visibleBottom - (viewport.y + viewport.height)
        : 0;
    if (delta === 0) return;
    this.#scrollOffsetCssPixels = resolveArenaV2UiScrollDeltaV1(
      this.#plan,
      this.#scrollOffsetCssPixels,
      delta,
    ).nextOffsetCssPixels;
  }

  #localPoint(event: PointerEvent): Readonly<{ x: number; y: number }> {
    const bounds = this.#canvas.getBoundingClientRect();
    this.#assertCurrentOperationCommit();
    const view = this.#viewport!;
    return Object.freeze({
      x: (event.clientX - bounds.left) * (view.width / Math.max(1, bounds.width)),
      y: (event.clientY - bounds.top) * (view.height / Math.max(1, bounds.height)),
    });
  }

  #dispatch(intentId: string): void {
    if (this.#onIntent === null || this.#dispatching) return;
    this.#dispatching = true;
    try {
      rejectThenable(this.#onIntent(intentId), 'Arena V2 Canvas onIntent');
    } catch (error) {
      if (this.#onRejected === null) throw error;
      rejectThenable(this.#onRejected(error, intentId), 'Arena V2 Canvas onRejected');
    } finally {
      this.#dispatching = false;
    }
  }

  readonly #handlePointerDown = (event: PointerEvent): void => {
    this.#runEventOperation('pointer-down', 'Arena V2 Canvas Surface按下事件失败。', () => {
      if (this.#plan === null || this.#viewport === null || this.#pointer !== null) return;
      const target = this.#localPoint(event);
      this.#pointer = Object.freeze({
        pointerId: event.pointerId,
        startX: target.x,
        startY: target.y,
        previousY: target.y,
        moved: false,
      });
      this.#canvas.setPointerCapture?.(event.pointerId);
      this.#assertCurrentOperationCommit();
      event.preventDefault();
      this.#assertCurrentOperationCommit();
    });
  };

  readonly #handlePointerMove = (event: PointerEvent): void => {
    this.#runEventOperation('pointer-move', 'Arena V2 Canvas Surface拖动事件失败。', () => {
      if (this.#plan === null || this.#pointer === null
        || this.#pointer.pointerId !== event.pointerId) return;
      const target = this.#localPoint(event);
      const distance = Math.abs(target.x - this.#pointer.startX)
        + Math.abs(target.y - this.#pointer.startY);
      const moved = this.#pointer.moved || distance >= 8;
      if (moved && this.#plan.scrollRegion !== null) {
        const resolved = resolveArenaV2UiScrollDeltaV1(
          this.#plan,
          this.#scrollOffsetCssPixels,
          this.#pointer.previousY - target.y,
        );
        if (resolved.nextOffsetCssPixels !== this.#scrollOffsetCssPixels) {
          this.#scrollOffsetCssPixels = resolved.nextOffsetCssPixels;
          this.#paint();
        }
      }
      this.#pointer = Object.freeze({
        ...this.#pointer,
        previousY: target.y,
        moved,
      });
      if (moved) {
        event.preventDefault();
        this.#assertCurrentOperationCommit();
      }
    });
  };

  readonly #handlePointerUp = (event: PointerEvent): void => {
    const intentId = this.#runEventOperation(
      'pointer-up',
      'Arena V2 Canvas Surface抬起事件失败。',
      (): string | null => {
        if (this.#plan === null || this.#pointer === null
          || this.#pointer.pointerId !== event.pointerId) return null;
        const pointer = this.#pointer;
        const target = this.#localPoint(event);
        this.#clearPointerOwned();
        if (pointer.moved) return null;
        const resolved = resolveArenaV2UiPointerIntentV1(
          this.#plan,
          target,
          this.#scrollOffsetCssPixels,
        );
        if (resolved.status !== 'accepted') return null;
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
      'Arena V2 Canvas Surface键盘事件失败。',
      (): string | null => {
        if (this.#plan === null || event.repeat) return null;
        if (event.key === 'Tab') {
          const focusable = focusableActions(this.#plan);
          if (focusable.length === 0) return null;
          const current = focusable.findIndex(({ id }) => id === this.#focusedActionPrimitiveId);
          const direction = event.shiftKey ? -1 : 1;
          const next = current < 0
            ? event.shiftKey ? focusable.length - 1 : 0
            : (current + direction + focusable.length) % focusable.length;
          this.#focusedActionPrimitiveId = focusable[next]!.id;
          this.#revealFocusedAction();
          this.#syncAccessibleLabel();
          this.#paint();
          event.preventDefault();
          this.#assertCurrentOperationCommit();
          return null;
        }
        const resolved = resolveArenaV2UiKeyboardIntentV1(
          this.#plan,
          this.#focusedActionPrimitiveId,
          event.key,
        );
        if (resolved.status !== 'accepted') return null;
        event.preventDefault();
        this.#assertCurrentOperationCommit();
        return resolved.intentId;
      },
    );
    if (intentId !== null) this.#dispatch(intentId);
  };

  readonly #handleWheel = (event: WheelEvent): void => {
    this.#runEventOperation('wheel-scroll', 'Arena V2 Canvas Surface滚轮事件失败。', () => {
      if (this.#plan?.scrollRegion === null || this.#plan === null) return;
      const resolved = resolveArenaV2UiScrollDeltaV1(
        this.#plan,
        this.#scrollOffsetCssPixels,
        event.deltaY,
      );
      if (resolved.nextOffsetCssPixels === this.#scrollOffsetCssPixels) return;
      this.#scrollOffsetCssPixels = resolved.nextOffsetCssPixels;
      this.#paint();
      event.preventDefault();
      this.#assertCurrentOperationCommit();
    });
  };

  readonly #handleVisibilityChange = (): void => {
    this.#runEventOperation(
      'visibility-change',
      'Arena V2 Canvas Surface可见性事件失败。',
      () => {
        if (this.#document.visibilityState !== 'visible') this.#clearPointerOwned();
      },
    );
  };

  readonly #handlePointerClear = (): void => {
    if (this.#releasingPointerCapture) return;
    this.#runEventOperation(
      'pointer-clear',
      'Arena V2 Canvas Surface指针清理事件失败。',
      () => this.#clearPointerOwned(),
    );
  };

  #clearPointerOwned(): void {
    const pointer = this.#pointer;
    if (pointer === null) return;
    const hasPointerCapture = this.#canvas.hasPointerCapture?.(pointer.pointerId) === true;
    this.#assertCurrentOperationCommit();
    if (hasPointerCapture) {
      this.#releasingPointerCapture = true;
      try {
        rejectThenable(
          this.#canvas.releasePointerCapture(pointer.pointerId),
          'Arena V2 Canvas Surface releasePointerCapture',
        );
        this.#assertCurrentOperationCommit();
      } finally {
        this.#releasingPointerCapture = false;
      }
    }
    this.#pointer = null;
  }

  #restoreCanvasState(): readonly unknown[] {
    const original = this.#originalCanvasState;
    const errors: unknown[] = [];
    let mayContinue = true;
    if (!this.#roleRestored) {
      try {
        const result = original.role === null
          ? this.#canvas.removeAttribute('role')
          : this.#canvas.setAttribute('role', original.role);
        rejectThenable(result, 'Arena V2 Canvas Surface restore role');
        this.#assertCurrentOperationCommit();
        this.#roleRestored = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    if (mayContinue && !this.#ariaLabelRestored) {
      try {
        const result = original.ariaLabel === null
          ? this.#canvas.removeAttribute('aria-label')
          : this.#canvas.setAttribute('aria-label', original.ariaLabel);
        rejectThenable(result, 'Arena V2 Canvas Surface restore aria-label');
        this.#assertCurrentOperationCommit();
        this.#ariaLabelRestored = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    if (mayContinue && !this.#tabIndexRestored) {
      try {
        this.#canvas.tabIndex = original.tabIndex;
        this.#assertCurrentOperationCommit();
        this.#tabIndexRestored = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    if (mayContinue && !this.#touchActionRestored) {
      try {
        this.#canvas.style.touchAction = original.touchAction;
        this.#assertCurrentOperationCommit();
        this.#touchActionRestored = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    if (mayContinue && !this.#widthRestored) {
      try {
        this.#canvas.width = original.width;
        this.#assertCurrentOperationCommit();
        this.#widthRestored = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    if (mayContinue && !this.#heightRestored) {
      try {
        this.#canvas.height = original.height;
        this.#assertCurrentOperationCommit();
        this.#heightRestored = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    if (mayContinue && !this.#styleWidthRestored) {
      try {
        this.#canvas.style.width = original.styleWidth;
        this.#assertCurrentOperationCommit();
        this.#styleWidthRestored = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    if (mayContinue && !this.#styleHeightRestored) {
      try {
        this.#canvas.style.height = original.styleHeight;
        this.#assertCurrentOperationCommit();
        this.#styleHeightRestored = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    return Object.freeze(errors);
  }

  #cleanupOwnedResources(): readonly unknown[] {
    const errors: unknown[] = [];
    let mayContinue = true;
    this.#plan = null;
    this.#viewport = null;
    this.#focusedActionPrimitiveId = null;
    this.#lastPaintResult = null;
    this.#onIntent = null;
    this.#onRejected = null;
    try {
      this.#clearPointerOwned();
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      errors.push(error);
      mayContinue = false;
    }
    const releaseCanvasListener = (
      bound: boolean,
      type: string,
      listener: EventListener,
      markReleased: () => void,
    ): void => {
      if (!mayContinue || !bound) return;
      try {
        rejectThenable(
          this.#canvas.removeEventListener(type, listener),
          `Arena V2 Canvas Surface removeEventListener(${type})`,
        );
        this.#assertCurrentOperationCommit();
        markReleased();
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    };
    releaseCanvasListener(
      this.#pointerDownListenerBound,
      'pointerdown',
      this.#handlePointerDown as EventListener,
      () => { this.#pointerDownListenerBound = false; },
    );
    releaseCanvasListener(
      this.#pointerMoveListenerBound,
      'pointermove',
      this.#handlePointerMove as EventListener,
      () => { this.#pointerMoveListenerBound = false; },
    );
    releaseCanvasListener(
      this.#pointerUpListenerBound,
      'pointerup',
      this.#handlePointerUp as EventListener,
      () => { this.#pointerUpListenerBound = false; },
    );
    releaseCanvasListener(
      this.#pointerCancelListenerBound,
      'pointercancel',
      this.#handlePointerClear as EventListener,
      () => { this.#pointerCancelListenerBound = false; },
    );
    releaseCanvasListener(
      this.#lostPointerCaptureListenerBound,
      'lostpointercapture',
      this.#handlePointerClear as EventListener,
      () => { this.#lostPointerCaptureListenerBound = false; },
    );
    releaseCanvasListener(
      this.#keyDownListenerBound,
      'keydown',
      this.#handleKeyDown as EventListener,
      () => { this.#keyDownListenerBound = false; },
    );
    releaseCanvasListener(
      this.#wheelListenerBound,
      'wheel',
      this.#handleWheel as EventListener,
      () => { this.#wheelListenerBound = false; },
    );
    if (mayContinue && this.#blurListenerBound) {
      try {
        rejectThenable(
          this.#window.removeEventListener('blur', this.#handlePointerClear),
          'Arena V2 Canvas Surface removeEventListener(blur)',
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
          'Arena V2 Canvas Surface removeEventListener(visibilitychange)',
        );
        this.#assertCurrentOperationCommit();
        this.#visibilityListenerBound = false;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    if (mayContinue && !this.#liveRegionRemoved && this.#liveRegion !== null) {
      try {
        rejectThenable(
          this.#liveRegion.remove(),
          'Arena V2 Canvas Surface live region.remove',
        );
        this.#assertCurrentOperationCommit();
        this.#liveRegionRemoved = true;
        this.#liveRegion = null;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        mayContinue = false;
      }
    }
    if (mayContinue) errors.push(...this.#restoreCanvasState());
    const listenersReleased = !this.#pointerDownListenerBound
      && !this.#pointerMoveListenerBound
      && !this.#pointerUpListenerBound
      && !this.#pointerCancelListenerBound
      && !this.#lostPointerCaptureListenerBound
      && !this.#keyDownListenerBound
      && !this.#wheelListenerBound
      && !this.#blurListenerBound
      && !this.#visibilityListenerBound;
    const canvasStateRestored = this.#roleRestored
      && this.#ariaLabelRestored
      && this.#tabIndexRestored
      && this.#touchActionRestored
      && this.#widthRestored
      && this.#heightRestored
      && this.#styleWidthRestored
      && this.#styleHeightRestored;
    if (this.#pointer === null && listenersReleased
      && this.#liveRegionRemoved && canvasStateRestored) {
      this.#context = null;
    }
    return Object.freeze(errors);
  }

  #failRuntimeOperation(error: unknown, message: string): never {
    this.#state = ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.FAILED;
    const cleanupErrors = this.#cleanupOwnedResources();
    throw cleanupErrors.length === 0
      ? error
      : new AggregateError([error, ...cleanupErrors], message);
  }

  dispose(): void {
    this.#assertNoOperation('dispose');
    if (this.#state === ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.DISPOSED) return;
    this.#runSynchronousOperation('dispose', () => {
    this.#state = ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.FAILED;
    const errors = this.#cleanupOwnedResources();
    if (this.#context === null) {
      this.#state = ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.DISPOSED;
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2 Canvas Surface清理不完整。');
    }
    });
  }
}

export const ARENA_V2_INFORMATION_CANVAS_SURFACE_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  formalVisualAssetsReady: false as const,
  maximumPixelRatio: 2 as const,
  ownsAuthorityState: false as const,
  failedLoadRollsBackThroughOwnedResourceLedger: true as const,
  cleanupRetriesOnlyIncompleteOwnedResources: true as const,
  canvasContextReleasedAfterListenersLiveRegionAndStateRestore: true as const,
  partialResizeOrRenderFailureClosesInteractiveSurface: true as const,
  actionRevealUsesSharedRenderPlanGeometry: true as const,
  primitiveRevealUsesSharedRenderPlanGeometry: true as const,
  synchronousLifecycleOperationReentryRejected: true as const,
  swallowedCanvasDomOrObserverReentryFailsClosed: true as const,
  publicOperationsCommitUnderStickyOperation: true as const,
  idempotentCleanupAndDisposeCheckReentryBeforeFastPath: true as const,
  pointerKeyboardWheelAndVisibilityEventsCommitUnderStickyOperation: true as const,
  intentCallbacksRunAfterSurfaceOperationCommit: true as const,
  publicReadsRejectedDuringOperationCommit: true as const,
  eventPaintAndAccessibilityCommitsUseOperationGuard: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  canvasAndDomCallbacksCheckedBeforeSurfaceCommit: true as const,
  cleanupReentryRetainsCurrentAndLaterCanvasOwners: true as const,
  ordinaryCleanupFailureRetainsCurrentAndLaterCanvasOwners: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  validationStatus: 'not-run' as const,
});
