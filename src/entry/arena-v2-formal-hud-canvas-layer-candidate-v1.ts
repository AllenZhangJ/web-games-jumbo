import {
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
  assertTrimmedNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS,
  ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1,
  ARENA_V2_UI_VISUAL_TOKENS_V1,
  createArenaV2ModeHudLayoutV1,
  createArenaV2ModeHudRenderPlanV1,
  createArenaV2UiViewportV1,
  paintArenaV2UiRenderPlanV1,
  projectArenaV2ModeHudWorldMarkersV1,
  type ArenaV2ModeHudCameraProjectionPortV1,
  type ArenaV2ModeHudConsumerEpochProjectionV1,
  type ArenaV2ModeHudWorldMarkerProjectionV1,
  type ArenaV2UiCanvasPaintResultV1,
  type ArenaV2UiRenderPlanV1,
  type ArenaV2UiViewportV1,
} from '@number-strategy-jump/arena-product-presentation';

export const ARENA_V2_FORMAL_HUD_CANVAS_LAYER_STATE_CANDIDATE_V1 = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  ACTIVE: 'active',
  PAUSED: 'paused',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

type HudCanvasLayerState = typeof ARENA_V2_FORMAL_HUD_CANVAS_LAYER_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_FORMAL_HUD_CANVAS_LAYER_STATE_CANDIDATE_V1
];
type SyncFunction = (...args: readonly unknown[]) => unknown;
type HudCanvasOperation = 'load' | 'render' | 'clear' | 'dispose';

interface HudViewportEnvelope {
  readonly layout: ArenaV2UiViewportV1;
  readonly pixelRatio: number;
}

interface OriginalCanvasState {
  readonly width: number;
  readonly height: number;
  readonly styleWidth: string;
  readonly styleHeight: string;
  readonly pointerEvents: string;
  readonly role: string | null;
  readonly ariaLabel: string | null;
  readonly ariaHidden: string | null;
}

const OPTION_KEYS = new Set([
  'canvas',
  'viewportProvider',
  'reservedInputBottomCssPixels',
  'cameraProjection',
]);
const VIEWPORT_KEYS = new Set(['layout', 'pixelRatio']);
const PROJECTION_KEYS = new Set([
  'schemaVersion',
  'consumerEpochId',
  'generation',
  'tick',
  'eventSequenceWaterline',
  'model',
  'feedback',
]);
const HUD_TEXT_FACT_KEYS = new Set([
  'id',
  'label',
  'valueText',
  'accessibilityText',
  'fixedWidthNumeric',
  'emphasis',
]);
const MAXIMUM_COMBINED_LIVE_ANNOUNCEMENTS =
  ARENA_V2_MODE_HUD_FEEDBACK_QUEUE_V1_LIMITS.visibleItemCount + 1;

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function exactDataFields(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Readonly<Record<string, unknown>> {
  const source = assertPlainRecord(value, name);
  const ownKeys = Reflect.ownKeys(source);
  if (
    ownKeys.length !== keys.size
    || ownKeys.some((key) => typeof key !== 'string' || !keys.has(key))
  ) {
    throw new RangeError(`${name}字段不闭合。`);
  }
  const fields: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of keys) fields[key] = dataField(source, key, name);
  return Object.freeze(fields);
}

function canvasElement(value: unknown): HTMLCanvasElement {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || typeof (value as HTMLCanvasElement).getContext !== 'function'
  ) throw new TypeError('Arena V2 formal HUD需要HTMLCanvasElement。');
  const canvas = value as HTMLCanvasElement;
  if (!canvas.ownerDocument?.defaultView) {
    throw new TypeError('Arena V2 formal HUD Canvas缺少可用Document/Window。');
  }
  return canvas;
}

function syncFunction(value: unknown, name: string): SyncFunction {
  if (typeof value !== 'function') throw new TypeError(`${name}必须是函数。`);
  return value as SyncFunction;
}

function cameraProjectionPort(value: unknown): ArenaV2ModeHudCameraProjectionPortV1 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 formal HUD cameraProjection必须是对象。');
  }
  const visited = new Set<object>();
  let cursor: object | null = value;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) {
      throw new TypeError('Arena V2 formal HUD cameraProjection原型链无效。');
    }
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, 'project');
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError('Arena V2 formal HUD cameraProjection.project必须是数据方法。');
      }
      const method = descriptor.value as SyncFunction;
      return Object.freeze({
        project: (position: Parameters<ArenaV2ModeHudCameraProjectionPortV1['project']>[0]) => {
          const result = Reflect.apply(method, value, [position]);
          rejectThenable(result, 'Arena V2 formal HUD cameraProjection.project');
          return result as ReturnType<ArenaV2ModeHudCameraProjectionPortV1['project']>;
        },
      });
    }
    cursor = Object.getPrototypeOf(cursor) as object | null;
  }
  throw new TypeError('Arena V2 formal HUD cameraProjection缺少project。');
}

function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name}必须是大于等于${minimum}的有限数。`);
  }
  return value;
}

function viewportEnvelope(value: unknown): HudViewportEnvelope {
  const fields = exactDataFields(value, VIEWPORT_KEYS, 'Arena V2 formal HUD viewport');
  const pixelRatio = finiteAtLeast(fields.pixelRatio, 0.5, 'Arena V2 formal HUD pixelRatio');
  return Object.freeze({
    layout: createArenaV2UiViewportV1(fields.layout),
    pixelRatio: Math.min(2, pixelRatio),
  });
}

function projection(value: unknown): ArenaV2ModeHudConsumerEpochProjectionV1 {
  const fields = exactDataFields(value, PROJECTION_KEYS, 'Arena V2 formal HUD projection');
  if (fields.schemaVersion !== 1) throw new RangeError('Arena V2 formal HUD只支持Projection V1。');
  const consumerEpochId = assertTrimmedNonEmptyString(
    fields.consumerEpochId,
    'Arena V2 formal HUD consumerEpochId',
  );
  if (!Number.isSafeInteger(fields.generation) || (fields.generation as number) < 1) {
    throw new RangeError('Arena V2 formal HUD generation无效。');
  }
  if (!Number.isSafeInteger(fields.tick) || (fields.tick as number) < 0) {
    throw new RangeError('Arena V2 formal HUD tick无效。');
  }
  const model = assertPlainRecord(fields.model, 'Arena V2 formal HUD model');
  const feedback = assertPlainRecord(fields.feedback, 'Arena V2 formal HUD feedback');
  if (model.tick !== fields.tick || feedback.modelTick !== fields.tick) {
    throw new RangeError('Arena V2 formal HUD Projection、RenderModel与Feedback tick不闭合。');
  }
  return Object.freeze({
    schemaVersion: 1,
    consumerEpochId,
    generation: fields.generation,
    tick: fields.tick,
    eventSequenceWaterline: fields.eventSequenceWaterline,
    model,
    feedback,
  }) as unknown as ArenaV2ModeHudConsumerEpochProjectionV1;
}

function cooldownReady(modelValue: unknown): boolean {
  const model = assertPlainRecord(modelValue, 'Arena V2 formal HUD model');
  const localFacts = dataField(model, 'localFacts', 'Arena V2 formal HUD model');
  if (!Array.isArray(localFacts)) {
    throw new TypeError('Arena V2 formal HUD model.localFacts必须是数组。');
  }
  let cooldownFact: Readonly<Record<string, unknown>> | null = null;
  for (const [index, factValue] of localFacts.entries()) {
    const fact = assertPlainRecord(factValue, `Arena V2 formal HUD localFacts[${index}]`);
    const factId = dataField(fact, 'id', `Arena V2 formal HUD localFacts[${index}]`);
    if (factId !== 'local-cooldown') continue;
    if (cooldownFact !== null) {
      throw new RangeError('Arena V2 formal HUD local-cooldown事实重复。');
    }
    cooldownFact = exactDataFields(
      fact,
      HUD_TEXT_FACT_KEYS,
      'Arena V2 formal HUD local-cooldown',
    );
  }
  if (cooldownFact === null) {
    throw new RangeError('Arena V2 formal HUD缺少local-cooldown事实。');
  }
  const visibleReady = cooldownFact.valueText
    === ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.readyState.visibleText;
  const accessibilityReady = cooldownFact.accessibilityText
    === ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.readyState.accessibilityText;
  if (visibleReady !== accessibilityReady) {
    throw new RangeError('Arena V2 formal HUD local-cooldown就绪文案不闭合。');
  }
  return visibleReady;
}

function cooldownEpochIdentity(
  projectionValue: ArenaV2ModeHudConsumerEpochProjectionV1,
): string {
  return JSON.stringify([projectionValue.consumerEpochId, projectionValue.generation]);
}

function accessibilityLabel(plan: ArenaV2UiRenderPlanV1): string {
  const labels = [
    ...plan.primitives.flatMap((primitive) => (
    primitive.kind === 'text' ? [primitive.accessibilityText] : []
    )),
    ...plan.worldAnchors.map(({ accessibilityText }) => accessibilityText),
  ];
  return labels.length === 0 ? '竞技场对局状态' : labels.join('；');
}

function markerText(context: CanvasRenderingContext2D, value: string): string {
  if (context.measureText(value).width <= 38) return value;
  const characters = Array.from(value);
  while (characters.length > 0 && context.measureText(`${characters.join('')}…`).width > 38) {
    characters.pop();
  }
  return `${characters.join('')}…`;
}

function paintWorldMarkers(
  context: CanvasRenderingContext2D,
  projectionValue: ArenaV2ModeHudWorldMarkerProjectionV1,
): void {
  const tokens = ARENA_V2_UI_VISUAL_TOKENS_V1;
  for (const marker of projectionValue.markers) {
    if (marker.visibility !== 'visible' || marker.centerCssPixels === null) continue;
    const { x, y } = marker.centerCssPixels;
    context.save();
    context.beginPath();
    context.arc(x, y, 22, 0, Math.PI * 2);
    context.fillStyle = marker.placement === 'edge-clamped'
      ? tokens.tones.primary.fill
      : tokens.tones.secondary.fill;
    context.fill();
    context.strokeStyle = tokens.tones.surface.fill;
    context.lineWidth = tokens.strokes.focus.widthCssPixels;
    context.stroke();
    context.font = `${tokens.typography.canvasNumericWeight} 11px ${tokens.typography.numericFontStack}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = tokens.tones.surface.fill;
    context.fillText(markerText(context, marker.label), x, y);
    context.restore();
  }
}

/**
 * Browser-only HUD layer for the formal Three stage. It paints the existing
 * renderer-neutral HUD plan onto a transparent overlay canvas. It never
 * derives rule facts, consumes input or owns audio/VFX one-shots.
 */
export class ArenaV2FormalHudCanvasLayerCandidateV1 {
  readonly #canvas: HTMLCanvasElement;
  readonly #document: Document;
  readonly #viewportProvider: SyncFunction;
  readonly #reservedInputBottomCssPixels: number;
  readonly #cameraProjection: ArenaV2ModeHudCameraProjectionPortV1;
  readonly #original: OriginalCanvasState;
  #state: HudCanvasLayerState = 'created';
  #context: CanvasRenderingContext2D | null = null;
  #liveRegion: HTMLDivElement | null = null;
  #lastRenderPlan: ArenaV2UiRenderPlanV1 | null = null;
  #lastPaintResult: ArenaV2UiCanvasPaintResultV1 | null = null;
  #lastMarkerProjection: ArenaV2ModeHudWorldMarkerProjectionV1 | null = null;
  #lastAnnouncementRevision: string | null = null;
  #cooldownEpochIdentity: string | null = null;
  #lastCooldownReady: boolean | null = null;
  #operation: HudCanvasOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #operationFailure: unknown = null;
  #cleanupStarted = false;
  #pixelsCleared = true;
  #liveRegionRemoved = true;
  #contextReleased = true;
  #canvasWidthRestored = true;
  #canvasHeightRestored = true;
  #styleWidthRestored = true;
  #styleHeightRestored = true;
  #pointerEventsRestored = true;
  #roleRestored = true;
  #ariaLabelRestored = true;
  #ariaHiddenRestored = true;

  constructor(value: unknown) {
    const fields = exactDataFields(value, OPTION_KEYS, 'Arena V2 formal HUD options');
    this.#canvas = canvasElement(fields.canvas);
    this.#document = this.#canvas.ownerDocument;
    this.#viewportProvider = syncFunction(
      fields.viewportProvider,
      'Arena V2 formal HUD viewportProvider',
    );
    this.#reservedInputBottomCssPixels = finiteAtLeast(
      fields.reservedInputBottomCssPixels,
      0,
      'Arena V2 formal HUD reservedInputBottomCssPixels',
    );
    this.#cameraProjection = cameraProjectionPort(fields.cameraProjection);
    this.#original = Object.freeze({
      width: this.#canvas.width,
      height: this.#canvas.height,
      styleWidth: this.#canvas.style.width,
      styleHeight: this.#canvas.style.height,
      pointerEvents: this.#canvas.style.pointerEvents,
      role: this.#canvas.getAttribute('role'),
      ariaLabel: this.#canvas.getAttribute('aria-label'),
      ariaHidden: this.#canvas.getAttribute('aria-hidden'),
    });
    Object.freeze(this);
  }

  get state(): HudCanvasLayerState {
    this.#assertNoOperation('state-read');
    return this.#state;
  }
  get lastRenderPlan(): ArenaV2UiRenderPlanV1 | null {
    this.#assertNoOperation('last-render-plan-read');
    return this.#lastRenderPlan;
  }
  get lastPaintResult(): ArenaV2UiCanvasPaintResultV1 | null {
    this.#assertNoOperation('last-paint-result-read');
    return this.#lastPaintResult;
  }
  get lastMarkerProjection(): ArenaV2ModeHudWorldMarkerProjectionV1 | null {
    this.#assertNoOperation('last-marker-projection-read');
    return this.#lastMarkerProjection;
  }

  #assertUsable(operation: string): void {
    this.#assertNoOperation(operation);
    if (this.#state === 'failed' || this.#state === 'disposed') {
      throw new Error(`${operation}拒绝当前状态${this.#state}。`);
    }
    if (this.#cleanupStarted) throw new Error(`${operation}拒绝清理中的HUD。`);
  }

  #beginOperation(operation: HudCanvasOperation): void {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    this.#operationFailure = null;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) {
      const error = new Error(`Arena V2 formal HUD拒绝${this.#operation}期间同步重入${operation}。`);
      this.#reentrySequence += 1;
      this.#reentryError ??= error;
      throw this.#reentryError;
    }
  }

  #assertOperationCommit(operation: HudCanvasOperation): void {
    if (this.#operation !== operation) {
      throw new Error(`Arena V2 formal HUD缺少${operation}操作所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) {
      throw new Error('Arena V2 formal HUD缺少当前操作所有权。');
    }
    this.#assertOperationCommit(this.#operation);
  }

  #endOperation(operation: HudCanvasOperation): void {
    const reentryError = this.#reentryError;
    const operationFailure = this.#operationFailure;
    if (this.#operation === operation) this.#operation = null;
    this.#reentryError = null;
    this.#operationFailure = null;
    if (reentryError === null) return;
    this.#state = 'failed';
    throw operationFailure === null || operationFailure === reentryError
      ? reentryError
      : new AggregateError(
        [operationFailure, reentryError],
        `Arena V2 formal HUD ${operation}失败且检测到同步重入。`,
      );
  }

  #clearPixels(): void {
    if (this.#context === null) return;
    rejectThenable(
      this.#context.setTransform(1, 0, 0, 1, 0, 0),
      'Arena V2 formal HUD context.setTransform',
    );
    this.#assertCurrentOperationCommit();
    const width = this.#canvas.width;
    this.#assertCurrentOperationCommit();
    const height = this.#canvas.height;
    this.#assertCurrentOperationCommit();
    rejectThenable(
      this.#context.clearRect(0, 0, width, height),
      'Arena V2 formal HUD context.clearRect',
    );
    this.#assertCurrentOperationCommit();
    this.#pixelsCleared = true;
  }

  #restoreAttribute(name: string, value: string | null): void {
    const result = value === null
      ? this.#canvas.removeAttribute(name)
      : this.#canvas.setAttribute(name, value);
    rejectThenable(result, `Arena V2 formal HUD restore ${name}`);
    this.#assertCurrentOperationCommit();
  }

  #runCleanupStep(
    label: string,
    run: () => unknown,
    commit: () => void,
    errors: unknown[],
  ): boolean {
    const reentrySequence = this.#reentrySequence;
    try {
      rejectThenable(run(), `${label}清理回调`);
      if (this.#reentrySequence !== reentrySequence) {
        this.#operationFailure ??= this.#reentryError ?? new Error(`${label}清理期间发生同步重入。`);
        return false;
      }
      commit();
      return true;
    } catch (error) {
      errors.push(error);
      if (this.#reentrySequence !== reentrySequence) {
        this.#operationFailure ??= error;
      }
      throw error;
    }
  }

  load(): this {
    this.#assertUsable('Arena V2 formal HUD load');
    this.#assertNoOperation('load');
    if (this.#state !== 'created') return this;
    this.#beginOperation('load');
    try {
      const context = this.#canvas.getContext('2d');
      if (context === null) throw new Error('Arena V2 formal HUD无法取得2D context。');
      this.#context = context;
      this.#contextReleased = false;
      this.#assertOperationCommit('load');
      const live = this.#document.createElement('div');
      this.#liveRegion = live;
      this.#liveRegionRemoved = false;
      this.#assertOperationCommit('load');
      live.setAttribute('aria-live', 'polite');
      this.#assertOperationCommit('load');
      live.setAttribute('aria-atomic', 'true');
      this.#assertOperationCommit('load');
      Object.assign(live.style, {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      });
      this.#assertOperationCommit('load');
      const inserted = this.#canvas.insertAdjacentElement('afterend', live);
      this.#assertOperationCommit('load');
      if (inserted !== live) {
        throw new Error('Arena V2 formal HUD无法挂载无障碍播报节点。');
      }
      this.#roleRestored = false;
      this.#canvas.setAttribute('role', 'img');
      this.#assertOperationCommit('load');
      this.#ariaLabelRestored = false;
      this.#canvas.setAttribute('aria-label', '竞技场对局状态');
      this.#assertOperationCommit('load');
      this.#ariaHiddenRestored = false;
      this.#canvas.removeAttribute('aria-hidden');
      this.#assertOperationCommit('load');
      this.#pointerEventsRestored = false;
      this.#canvas.style.pointerEvents = 'none';
      this.#assertOperationCommit('load');
      this.#state = 'ready';
      return this;
    } catch (error) {
      this.#operationFailure ??= error;
      this.#state = 'failed';
      throw error;
    } finally {
      this.#endOperation('load');
    }
  }

  render(value: unknown): void {
    this.#assertUsable('Arena V2 formal HUD render');
    if (this.#state !== 'ready' && this.#state !== 'active') {
      throw new Error(`Arena V2 formal HUD不能在${this.#state}渲染。`);
    }
    if (this.#context === null || this.#liveRegion === null) {
      throw new Error('Arena V2 formal HUD尚未load。');
    }
    this.#beginOperation('render');
    try {
      const next = projection(value);
      const rawViewport = this.#viewportProvider();
      this.#assertOperationCommit('render');
      rejectThenable(rawViewport, 'Arena V2 formal HUD viewportProvider');
      this.#assertOperationCommit('render');
      const viewport = viewportEnvelope(rawViewport);
      const layout = createArenaV2ModeHudLayoutV1(
        next.model,
        next.feedback,
        viewport.layout,
        { reservedInputBottomCssPixels: this.#reservedInputBottomCssPixels },
      );
      const plan = createArenaV2ModeHudRenderPlanV1(next.model, next.feedback, layout);
      const nextCooldownReady = cooldownReady(next.model);
      const nextCooldownEpochIdentity = cooldownEpochIdentity(next);
      const readyTransition = this.#cooldownEpochIdentity === nextCooldownEpochIdentity
        && this.#lastCooldownReady === false
        && nextCooldownReady;
      const announcements = Object.freeze([
        ...plan.liveAnnouncements,
        ...(readyTransition
          ? [ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.readyState.accessibilityText]
          : []),
      ]);
      if (announcements.length > MAXIMUM_COMBINED_LIVE_ANNOUNCEMENTS) {
        throw new RangeError('Arena V2 formal HUD live announcement超过有界上限。');
      }
      const width = Math.max(1, Math.round(viewport.layout.width * viewport.pixelRatio));
      const height = Math.max(1, Math.round(viewport.layout.height * viewport.pixelRatio));
      const currentCanvasWidth = this.#canvas.width;
      this.#assertOperationCommit('render');
      if (currentCanvasWidth !== width) {
        this.#canvasWidthRestored = false;
        this.#canvas.width = width;
        this.#assertOperationCommit('render');
      }
      const currentCanvasHeight = this.#canvas.height;
      this.#assertOperationCommit('render');
      if (currentCanvasHeight !== height) {
        this.#canvasHeightRestored = false;
        this.#canvas.height = height;
        this.#assertOperationCommit('render');
      }
      this.#styleWidthRestored = false;
      this.#canvas.style.width = `${viewport.layout.width}px`;
      this.#assertOperationCommit('render');
      this.#styleHeightRestored = false;
      this.#canvas.style.height = `${viewport.layout.height}px`;
      this.#assertOperationCommit('render');
      this.#pixelsCleared = false;
      this.#context.setTransform(viewport.pixelRatio, 0, 0, viewport.pixelRatio, 0, 0);
      this.#assertOperationCommit('render');
      this.#context.clearRect(0, 0, viewport.layout.width, viewport.layout.height);
      this.#assertOperationCommit('render');
      const painted = paintArenaV2UiRenderPlanV1(this.#context, plan);
      this.#assertOperationCommit('render');
      const markers = projectArenaV2ModeHudWorldMarkersV1(
        plan,
        layout,
        this.#cameraProjection,
      );
      this.#assertOperationCommit('render');
      paintWorldMarkers(this.#context, markers);
      this.#assertOperationCommit('render');
      this.#ariaLabelRestored = false;
      this.#canvas.setAttribute('aria-label', accessibilityLabel(plan));
      this.#assertOperationCommit('render');
      const announcementRevision = JSON.stringify([
        next.consumerEpochId,
        next.generation,
        next.feedback.stateRevision,
      ]);
      if (announcementRevision !== this.#lastAnnouncementRevision || readyTransition) {
        this.#liveRegion.textContent = announcements.join(' ');
        this.#assertOperationCommit('render');
      }
      this.#assertOperationCommit('render');
      this.#lastRenderPlan = plan;
      this.#lastPaintResult = painted;
      this.#lastMarkerProjection = markers;
      this.#lastAnnouncementRevision = announcementRevision;
      this.#cooldownEpochIdentity = nextCooldownEpochIdentity;
      this.#lastCooldownReady = nextCooldownReady;
      this.#state = 'active';
    } catch (error) {
      this.#operationFailure ??= error;
      this.#state = 'failed';
      throw error;
    } finally {
      this.#endOperation('render');
    }
  }

  pause(): void {
    this.#assertUsable('Arena V2 formal HUD pause');
    this.#assertNoOperation('pause');
    if (this.#state === 'paused') return;
    if (this.#state !== 'active') throw new Error('Arena V2 formal HUD只能暂停活动对局。');
    this.#cooldownEpochIdentity = null;
    this.#lastCooldownReady = null;
    this.#state = 'paused';
  }

  resume(): void {
    this.#assertUsable('Arena V2 formal HUD resume');
    this.#assertNoOperation('resume');
    if (this.#state === 'active') return;
    if (this.#state !== 'paused') throw new Error('Arena V2 formal HUD只能恢复暂停对局。');
    this.#state = 'active';
  }

  clear(): void {
    this.#assertNoOperation('clear');
    if (this.#state === 'disposed') return;
    if (this.#state === 'failed') {
      throw new Error('Arena V2 formal HUD已失败，只允许dispose继续清理。');
    }
    this.#beginOperation('clear');
    try {
      this.#clearPixels();
      if (this.#liveRegion !== null) {
        this.#liveRegion.textContent = '';
        this.#assertOperationCommit('clear');
      }
      this.#ariaLabelRestored = false;
      this.#canvas.setAttribute('aria-label', '竞技场对局状态');
      this.#assertOperationCommit('clear');
      this.#lastRenderPlan = null;
      this.#lastPaintResult = null;
      this.#lastMarkerProjection = null;
      this.#lastAnnouncementRevision = null;
      this.#cooldownEpochIdentity = null;
      this.#lastCooldownReady = null;
      const stateAfterClear = this.#state as HudCanvasLayerState;
      if (stateAfterClear !== 'created' && stateAfterClear !== 'failed') this.#state = 'ready';
    } catch (error) {
      this.#operationFailure ??= error;
      this.#state = 'failed';
      throw error;
    } finally {
      this.#endOperation('clear');
    }
  }

  #cleanupComplete(): boolean {
    return this.#pixelsCleared
      && this.#liveRegionRemoved
      && this.#contextReleased
      && this.#canvasWidthRestored
      && this.#canvasHeightRestored
      && this.#styleWidthRestored
      && this.#styleHeightRestored
      && this.#pointerEventsRestored
      && this.#roleRestored
      && this.#ariaLabelRestored
      && this.#ariaHiddenRestored;
  }

  dispose(): void {
    this.#assertNoOperation('dispose');
    if (this.#state === 'disposed') return;
    this.#beginOperation('dispose');
    try {
      this.#cleanupStarted = true;
      const errors: unknown[] = [];
      if (!this.#pixelsCleared) {
        if (!this.#runCleanupStep(
          'Arena V2 formal HUD像素',
          () => this.#clearPixels(),
          () => {},
          errors,
        )) return;
      }
      if (!this.#liveRegionRemoved) {
        if (!this.#runCleanupStep(
          'Arena V2 formal HUD无障碍节点',
          () => this.#liveRegion?.remove(),
          () => {
            this.#liveRegion = null;
            this.#liveRegionRemoved = true;
          },
          errors,
        )) return;
      }
      if (this.#pixelsCleared && !this.#contextReleased) {
        this.#context = null;
        this.#contextReleased = true;
      }
      if (!this.#canvasWidthRestored) {
        if (!this.#runCleanupStep(
          'Arena V2 formal HUD Canvas宽度',
          () => { this.#canvas.width = this.#original.width; },
          () => { this.#canvasWidthRestored = true; },
          errors,
        )) return;
      }
      if (!this.#canvasHeightRestored) {
        if (!this.#runCleanupStep(
          'Arena V2 formal HUD Canvas高度',
          () => { this.#canvas.height = this.#original.height; },
          () => { this.#canvasHeightRestored = true; },
          errors,
        )) return;
      }
      if (!this.#styleWidthRestored) {
        if (!this.#runCleanupStep(
          'Arena V2 formal HUD样式宽度',
          () => { this.#canvas.style.width = this.#original.styleWidth; },
          () => { this.#styleWidthRestored = true; },
          errors,
        )) return;
      }
      if (!this.#styleHeightRestored) {
        if (!this.#runCleanupStep(
          'Arena V2 formal HUD样式高度',
          () => { this.#canvas.style.height = this.#original.styleHeight; },
          () => { this.#styleHeightRestored = true; },
          errors,
        )) return;
      }
      if (!this.#pointerEventsRestored) {
        if (!this.#runCleanupStep(
          'Arena V2 formal HUD指针样式',
          () => { this.#canvas.style.pointerEvents = this.#original.pointerEvents; },
          () => { this.#pointerEventsRestored = true; },
          errors,
        )) return;
      }
      if (!this.#roleRestored) {
        if (!this.#runCleanupStep(
          'Arena V2 formal HUD role属性',
          () => this.#restoreAttribute('role', this.#original.role),
          () => { this.#roleRestored = true; },
          errors,
        )) return;
      }
      if (!this.#ariaLabelRestored) {
        if (!this.#runCleanupStep(
          'Arena V2 formal HUD aria-label属性',
          () => this.#restoreAttribute('aria-label', this.#original.ariaLabel),
          () => { this.#ariaLabelRestored = true; },
          errors,
        )) return;
      }
      if (!this.#ariaHiddenRestored) {
        if (!this.#runCleanupStep(
          'Arena V2 formal HUD aria-hidden属性',
          () => this.#restoreAttribute('aria-hidden', this.#original.ariaHidden),
          () => { this.#ariaHiddenRestored = true; },
          errors,
        )) return;
      }
      this.#assertOperationCommit('dispose');
      this.#lastRenderPlan = null;
      this.#lastPaintResult = null;
      this.#lastMarkerProjection = null;
      this.#lastAnnouncementRevision = null;
      this.#cooldownEpochIdentity = null;
      this.#lastCooldownReady = null;
      const cleanupComplete = this.#cleanupComplete();
      this.#state = errors.length === 0 && cleanupComplete ? 'disposed' : 'failed';
      if (errors.length === 0 && !cleanupComplete) {
        errors.push(new Error('Arena V2 formal HUD终态清理依赖尚未收敛。'));
      }
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 formal HUD清理不完整。');
      }
    } catch (error) {
      this.#operationFailure ??= error;
      this.#state = 'failed';
      throw error;
    } finally {
      this.#endOperation('dispose');
    }
  }
}

export const ARENA_V2_FORMAL_HUD_CANVAS_LAYER_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  consumesRendererNeutralHudProjection: true as const,
  ownsRuleOrMatchAuthority: false as const,
  consumesInput: false as const,
  audioAndVfxOneShotOwnership: false as const,
  maximumVisibleFeedbackItems: 3 as const,
  maximumCombinedLiveAnnouncements: MAXIMUM_COMBINED_LIVE_ANNOUNCEMENTS,
  cooldownReadyAnnouncement: Object.freeze({
    sourceFactId: 'local-cooldown' as const,
    transition: 'positive-to-zero' as const,
    text: ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.readyState.accessibilityText,
    dedupeScope: 'consumerEpochId-and-generation' as const,
    baselineAlreadyReadyAnnounced: false as const,
  }),
  primaryFeedbackCardCount: 1 as const,
  secondaryFeedbackCardCount: 2 as const,
  feedbackFocusOrder: 'emphasis-then-weapon-then-recency' as const,
  modeFirstScreenIdentity: 'mode-label-objective-timer-and-panel-language' as const,
  usesCollectionWeaponDisplayNames: true as const,
  authoritativeWorldMarkerLimit: 3 as const,
  cameraProjectionAndMapOcclusionOwnedByRenderer: true as const,
  externalDataFieldsCapturedOnceByDescriptor: true as const,
  externalDataFieldOrdinaryReadsAfterValidation: false as const,
  synchronousLifecycleReentryRejected: true as const,
  swallowedCanvasDomViewportOrAccessibilityReentryFailsClosed: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  platformCallbacksCheckedBeforeRenderAndLifecycleWatermarks: true as const,
  renderProjectionAndPaintCallbacksCheckedBeforeSnapshotPublication: true as const,
  cleanupReentryRetainsCurrentOwnerAndStopsLaterResources: true as const,
  ordinaryCleanupFailureRetainsCurrentOwnerAndStopsLaterResources: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  publicStateAndRenderReadsRejectedDuringOperationCommit: true as const,
  terminalSuccessCannotOverwriteSwallowedReentry: true as const,
  operationLockScope: 'load-render-clear-dispose-with-pause-resume-rejection' as const,
  loadFailureTransitionsToFailedBeforeOperationRelease: true as const,
  loadFailureRetainsRetryableDisposeOwnership: true as const,
  clearFailureTransitionsToFailedBeforeOperationRelease: true as const,
  clearFailureRetainsRetryableDisposeOwnership: true as const,
  failedStateAllowsDisposeOnly: true as const,
  cleanupRetriesOnlyIncompletePlatformResources: true as const,
  contextReleaseWaitsForPixelClear: true as const,
  canvasAndAccessibilityStateRestoreIndependently: true as const,
  consumerEpochIdRequiresTrimmedIdentity: true as const,
  validationStatus: 'not-run' as const,
});
