import { normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_INPUT_ROUTER_MODE,
  PRODUCT_PRESENTATION_FLOW_STATE,
  PRODUCT_PRESENTATION_SESSION_STATE,
  PRODUCT_UI_INTENT_ID,
  type ProductInputRouterMode,
  type ProductPresentationSessionState,
  type ProductUiIntent,
} from '@number-strategy-jump/arena-presentation-contracts';
import { PRODUCT_SESSION_STATE } from '@number-strategy-jump/arena-product-state';
import {
  createPresentationMemorySnapshot,
  mergePresentationMemorySnapshot,
  type PresentationQualityDefinition,
  type PresentationResourceSnapshot,
} from '@number-strategy-jump/arena-presentation-runtime';
import { ownOptions, rejectThenable, snapshotMethod } from './capability-utils.js';
import { type ProductPresentationFlowSnapshot } from './product-presentation-flow.js';

export { PRODUCT_PRESENTATION_SESSION_STATE } from '@number-strategy-jump/arena-presentation-contracts';

type UnknownFunction = (...args: unknown[]) => unknown;

interface PlatformPort {
  readonly source: object;
  readonly id: unknown;
  readonly createCanvas: () => unknown;
  readonly getViewport: () => unknown;
  readonly requestFrame: (callback: unknown) => unknown;
  readonly cancelFrame: (token: unknown) => unknown;
  readonly now: () => unknown;
  readonly wallNow: () => unknown;
  readonly onResize: (callback: UnknownFunction) => unknown;
  readonly onShow: (callback: UnknownFunction) => unknown;
  readonly onHide: (callback: UnknownFunction) => unknown;
}

interface CanvasPort {
  readonly source: object;
  readonly getContext: UnknownFunction;
  readonly addEventListener: (type: string, callback: UnknownFunction, capture: boolean) => unknown;
  readonly removeEventListener: (type: string, callback: UnknownFunction, capture: boolean) => unknown;
}

interface RendererPort {
  readonly source: object;
  readonly load: () => unknown;
  readonly render: (snapshot: unknown, options: unknown) => unknown;
  readonly resize: (viewport: unknown) => unknown;
  readonly getInputViewport: () => unknown;
  readonly hitTestUi: (point: unknown, viewport: unknown, viewModel: unknown) => unknown;
  readonly bindUiIntent: (options: unknown) => unknown;
  readonly handleContextLost: (event: unknown) => unknown;
  readonly handleContextRestored: () => unknown;
  readonly getPerformanceSnapshot: (() => unknown) | null;
  readonly getDebugSnapshot: (() => unknown) | null;
  readonly dispose: () => unknown;
}

interface ControllerPort {
  readonly source: object;
  readonly getSnapshot: () => unknown;
  readonly destroy: () => unknown;
}

interface FlowPort {
  readonly source: object;
  readonly getState: () => unknown;
  readonly start: () => unknown;
  readonly dispatch: (intent: ProductUiIntent) => unknown;
  readonly stepMatch: () => ProductPresentationFlowSnapshot;
  readonly heartbeat: () => unknown;
  readonly hide: () => ProductPresentationFlowSnapshot;
  readonly show: () => ProductPresentationFlowSnapshot;
  readonly getSnapshot: () => ProductPresentationFlowSnapshot;
  readonly destroy: () => unknown;
}

interface InputRouterPort {
  readonly source: object;
  readonly setMode: (mode: ProductInputRouterMode) => unknown;
  readonly resize: (viewport: unknown) => unknown;
  readonly suspend: () => unknown;
  readonly resume: () => unknown;
  readonly sample: (tick: number) => unknown;
  readonly replaceSampler: (sampler: unknown) => unknown;
  readonly destroy: () => unknown;
  readonly getDebugSnapshot: (() => unknown) | null;
}

interface InputAdapterPort {
  readonly start: () => unknown;
  readonly destroy: () => unknown;
}

interface AccumulatorBatch {
  readonly steps: number;
  readonly droppedSeconds: number;
}

interface AccumulatorPort {
  readonly push: (deltaSeconds: number) => AccumulatorBatch;
  readonly reset: () => unknown;
  readonly getDebugSnapshot: (() => unknown) | null;
}

interface FrameLoopPort {
  readonly start: (callback: (frame: Readonly<{ timestamp: number; deltaSeconds: number }>) => boolean) => unknown;
  readonly stop: () => unknown;
  readonly destroy: () => unknown;
  readonly getDebugSnapshot: (() => unknown) | null;
}

interface RenderPacerPort {
  readonly shouldRender: (deltaSeconds: number, options: Readonly<{ force: boolean }>) => boolean;
  readonly reset: () => unknown;
  readonly getDebugSnapshot: (() => unknown) | null;
}

interface PerformanceProbePort {
  readonly start: (timestampMs: number) => unknown;
  readonly markMilestone: (id: string, timestampMs: number) => unknown;
  readonly recordFrame: (frame: unknown) => unknown;
  readonly stop: (timestampMs: number) => unknown;
  readonly getSnapshot: () => unknown;
  readonly destroy: () => unknown;
  readonly shouldSampleResources: (() => unknown) | null;
}

export interface ProductPresentationSessionComposition {
  readonly platform: unknown;
  readonly mapperId: string;
  readonly seedSource: unknown;
  readonly ownerId: string;
  readonly profileLeaseHolderId: string;
  readonly keyPrefix: string;
  readonly matchConfig: unknown;
  readonly matchCompletionSink: unknown;
  readonly qualityDefinition: PresentationQualityDefinition;
  readonly fixedDeltaSeconds: number;
  readonly maximumCatchUpTicks: number;
  readonly profileLeaseHeartbeatIntervalMs: number;
  readonly profileLeaseRetryIntervalMs: number;
  readonly profileLeaseTakeoverSameOwner: boolean;
  readonly performanceMemoryProvider: () => unknown;
  readonly onDiagnostic: (detail: Readonly<Record<string, unknown>>) => unknown;
  readonly rendererFactory: UnknownFunction;
  readonly controllerFactory: UnknownFunction;
  readonly flowFactory: UnknownFunction;
  readonly mapperFactory: UnknownFunction;
  readonly samplerFactory: UnknownFunction;
  readonly inputRouterFactory: UnknownFunction;
  readonly inputAdapterFactory: UnknownFunction;
  readonly frameLoopFactory: UnknownFunction;
  readonly accumulatorFactory: UnknownFunction;
  readonly renderPacerFactory: UnknownFunction;
  readonly performanceProbeFactory: UnknownFunction;
}

const COMPOSITION_KEYS = new Set([
  'platform', 'mapperId', 'seedSource', 'ownerId', 'profileLeaseHolderId', 'keyPrefix',
  'matchConfig', 'matchCompletionSink', 'qualityDefinition', 'fixedDeltaSeconds',
  'maximumCatchUpTicks', 'profileLeaseHeartbeatIntervalMs', 'profileLeaseRetryIntervalMs',
  'profileLeaseTakeoverSameOwner', 'performanceMemoryProvider', 'onDiagnostic',
  'rendererFactory', 'controllerFactory', 'flowFactory', 'mapperFactory', 'samplerFactory',
  'inputRouterFactory', 'inputAdapterFactory', 'frameLoopFactory', 'accumulatorFactory',
  'renderPacerFactory', 'performanceProbeFactory',
]);

function syncResult(value: unknown, name: string): unknown {
  rejectThenable(value, name);
  return value;
}

function requiredFunction(value: unknown, name: string): UnknownFunction {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as UnknownFunction;
}

function asObject(value: unknown, name: string): object {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return value;
}

function method(value: unknown, name: string, methodName: string): UnknownFunction {
  return snapshotMethod(value, name, methodName)!;
}

function optionalMethod(value: unknown, name: string, methodName: string): UnknownFunction | null {
  return snapshotMethod(value, name, methodName, false);
}

function validatePlatform(value: unknown): PlatformPort {
  const source = asObject(value, 'ProductPresentationSession platform');
  return Object.freeze({
    source,
    id: Object.getOwnPropertyDescriptor(source, 'id')?.value,
    createCanvas: method(source, 'ProductPresentationSession platform', 'createCanvas') as () => unknown,
    getViewport: method(source, 'ProductPresentationSession platform', 'getViewport') as () => unknown,
    requestFrame: method(source, 'ProductPresentationSession platform', 'requestFrame'),
    cancelFrame: method(source, 'ProductPresentationSession platform', 'cancelFrame'),
    now: method(source, 'ProductPresentationSession platform', 'now') as () => unknown,
    wallNow: method(source, 'ProductPresentationSession platform', 'wallNow') as () => unknown,
    onResize: method(source, 'ProductPresentationSession platform', 'onResize'),
    onShow: method(source, 'ProductPresentationSession platform', 'onShow'),
    onHide: method(source, 'ProductPresentationSession platform', 'onHide'),
  });
}

function validateCanvas(value: unknown): CanvasPort {
  const source = asObject(value, 'ProductPresentationSession Canvas');
  return Object.freeze({
    source,
    getContext: method(source, 'ProductPresentationSession Canvas', 'getContext'),
    addEventListener: method(source, 'ProductPresentationSession Canvas', 'addEventListener'),
    removeEventListener: method(source, 'ProductPresentationSession Canvas', 'removeEventListener'),
  });
}

function validateRenderer(value: unknown): RendererPort {
  const source = asObject(value, 'ProductPresentationSession renderer');
  return Object.freeze({
    source,
    load: method(source, 'ProductPresentationSession renderer', 'load') as () => unknown,
    render: method(source, 'ProductPresentationSession renderer', 'render'),
    resize: method(source, 'ProductPresentationSession renderer', 'resize'),
    getInputViewport: method(source, 'ProductPresentationSession renderer', 'getInputViewport') as () => unknown,
    hitTestUi: method(source, 'ProductPresentationSession renderer', 'hitTestUi'),
    bindUiIntent: method(source, 'ProductPresentationSession renderer', 'bindUiIntent'),
    handleContextLost: method(source, 'ProductPresentationSession renderer', 'handleContextLost'),
    handleContextRestored: method(source, 'ProductPresentationSession renderer', 'handleContextRestored') as () => unknown,
    getPerformanceSnapshot: optionalMethod(source, 'ProductPresentationSession renderer', 'getPerformanceSnapshot') as (() => unknown) | null,
    getDebugSnapshot: optionalMethod(source, 'ProductPresentationSession renderer', 'getDebugSnapshot') as (() => unknown) | null,
    dispose: method(source, 'ProductPresentationSession renderer', 'dispose') as () => unknown,
  });
}

function validateController(value: unknown): ControllerPort {
  try {
    const source = asObject(value, 'ProductPresentationSession controller');
    return Object.freeze({
      source,
      getSnapshot: method(source, 'ProductPresentationSession controller', 'getSnapshot') as () => unknown,
      destroy: method(source, 'ProductPresentationSession controller', 'destroy') as () => unknown,
    });
  } catch (error) {
    throw new TypeError('ProductPresentationSession controller 不符合合同。', {
      cause: normalizeThrownError(error, 'controller 合同无效'),
    });
  }
}

function validateFlow(value: unknown): FlowPort {
  const source = asObject(value, 'ProductPresentationSession flow');
  const stateMethod = optionalMethod(source, 'ProductPresentationSession flow', 'getState');
  return Object.freeze({
    source,
    getState: stateMethod ?? (() => Object.getOwnPropertyDescriptor(source, 'state')?.value),
    start: method(source, 'ProductPresentationSession flow', 'start') as () => unknown,
    dispatch: method(source, 'ProductPresentationSession flow', 'dispatch') as (intent: ProductUiIntent) => unknown,
    stepMatch: method(source, 'ProductPresentationSession flow', 'stepMatch') as () => ProductPresentationFlowSnapshot,
    heartbeat: method(source, 'ProductPresentationSession flow', 'heartbeat') as () => unknown,
    hide: method(source, 'ProductPresentationSession flow', 'hide') as () => ProductPresentationFlowSnapshot,
    show: method(source, 'ProductPresentationSession flow', 'show') as () => ProductPresentationFlowSnapshot,
    getSnapshot: method(source, 'ProductPresentationSession flow', 'getSnapshot') as () => ProductPresentationFlowSnapshot,
    destroy: method(source, 'ProductPresentationSession flow', 'destroy') as () => unknown,
  });
}

function validateInputRouter(value: unknown): InputRouterPort {
  const source = asObject(value, 'ProductPresentationSession inputRouter');
  return Object.freeze({
    source,
    setMode: method(source, 'ProductPresentationSession inputRouter', 'setMode') as (mode: ProductInputRouterMode) => unknown,
    resize: method(source, 'ProductPresentationSession inputRouter', 'resize'),
    suspend: method(source, 'ProductPresentationSession inputRouter', 'suspend') as () => unknown,
    resume: method(source, 'ProductPresentationSession inputRouter', 'resume') as () => unknown,
    sample: method(source, 'ProductPresentationSession inputRouter', 'sample') as (tick: number) => unknown,
    replaceSampler: method(source, 'ProductPresentationSession inputRouter', 'replaceSampler'),
    destroy: method(source, 'ProductPresentationSession inputRouter', 'destroy') as () => unknown,
    getDebugSnapshot: optionalMethod(source, 'ProductPresentationSession inputRouter', 'getDebugSnapshot') as (() => unknown) | null,
  });
}

function validateInputAdapter(value: unknown): InputAdapterPort {
  const source = asObject(value, 'ProductPresentationSession inputAdapter');
  return Object.freeze({
    start: method(source, 'ProductPresentationSession inputAdapter', 'start') as () => unknown,
    destroy: method(source, 'ProductPresentationSession inputAdapter', 'destroy') as () => unknown,
  });
}

function validateAccumulator(value: unknown): AccumulatorPort {
  const source = asObject(value, 'ProductPresentationSession accumulator');
  const push = method(source, 'ProductPresentationSession accumulator', 'push');
  return Object.freeze({
    push: (deltaSeconds: number) => {
      const batch = asObject(
        syncResult(push(deltaSeconds), 'ProductPresentationSession accumulator.push()'),
        'ProductPresentationSession accumulator batch',
      );
      const steps = ownData(batch, 'steps', 'ProductPresentationSession accumulator batch');
      const droppedSeconds = ownData(
        batch,
        'droppedSeconds',
        'ProductPresentationSession accumulator batch',
      );
      if (!Number.isSafeInteger(steps) || (steps as number) < 0) {
        throw new RangeError('ProductPresentationSession accumulator steps 必须是非负安全整数。');
      }
      if (
        typeof droppedSeconds !== 'number'
        || !Number.isFinite(droppedSeconds)
        || droppedSeconds < 0
      ) throw new RangeError('ProductPresentationSession droppedSeconds 必须是非负有限数。');
      return Object.freeze({ steps: steps as number, droppedSeconds });
    },
    reset: method(source, 'ProductPresentationSession accumulator', 'reset') as () => unknown,
    getDebugSnapshot: optionalMethod(source, 'ProductPresentationSession accumulator', 'getDebugSnapshot') as (() => unknown) | null,
  });
}

function validateFrameLoop(value: unknown): FrameLoopPort {
  const source = asObject(value, 'ProductPresentationSession frameLoop');
  return Object.freeze({
    start: method(source, 'ProductPresentationSession frameLoop', 'start') as FrameLoopPort['start'],
    stop: method(source, 'ProductPresentationSession frameLoop', 'stop') as () => unknown,
    destroy: method(source, 'ProductPresentationSession frameLoop', 'destroy') as () => unknown,
    getDebugSnapshot: optionalMethod(source, 'ProductPresentationSession frameLoop', 'getDebugSnapshot') as (() => unknown) | null,
  });
}

function validateRenderPacer(value: unknown): RenderPacerPort {
  const source = asObject(value, 'ProductPresentationSession renderPacer');
  const shouldRender = method(source, 'ProductPresentationSession renderPacer', 'shouldRender');
  return Object.freeze({
    shouldRender: (
      deltaSeconds: number,
      options: Readonly<{ force: boolean }>,
    ) => {
      const result = syncResult(
        shouldRender(deltaSeconds, options),
        'ProductPresentationSession renderPacer.shouldRender()',
      );
      if (typeof result !== 'boolean') {
        throw new TypeError('ProductPresentationSession renderPacer.shouldRender() 必须返回 boolean。');
      }
      return result;
    },
    reset: method(source, 'ProductPresentationSession renderPacer', 'reset') as () => unknown,
    getDebugSnapshot: optionalMethod(source, 'ProductPresentationSession renderPacer', 'getDebugSnapshot') as (() => unknown) | null,
  });
}

function validatePerformanceProbe(value: unknown): PerformanceProbePort {
  const source = asObject(value, 'ProductPresentationSession performanceProbe');
  return Object.freeze({
    start: method(source, 'ProductPresentationSession performanceProbe', 'start') as PerformanceProbePort['start'],
    markMilestone: method(source, 'ProductPresentationSession performanceProbe', 'markMilestone') as PerformanceProbePort['markMilestone'],
    recordFrame: method(source, 'ProductPresentationSession performanceProbe', 'recordFrame') as PerformanceProbePort['recordFrame'],
    stop: method(source, 'ProductPresentationSession performanceProbe', 'stop') as PerformanceProbePort['stop'],
    getSnapshot: method(source, 'ProductPresentationSession performanceProbe', 'getSnapshot') as () => unknown,
    destroy: method(source, 'ProductPresentationSession performanceProbe', 'destroy') as () => unknown,
    shouldSampleResources: optionalMethod(source, 'ProductPresentationSession performanceProbe', 'shouldSampleResources') as (() => unknown) | null,
  });
}

function validateComposition(value: unknown): ProductPresentationSessionComposition & { readonly platform: PlatformPort } {
  const options = ownOptions(value, COMPOSITION_KEYS, 'ProductPresentationSession composition');
  const factoryNames = [
    'rendererFactory', 'controllerFactory', 'flowFactory', 'mapperFactory', 'samplerFactory',
    'inputRouterFactory', 'inputAdapterFactory', 'frameLoopFactory', 'accumulatorFactory',
    'renderPacerFactory', 'performanceProbeFactory', 'performanceMemoryProvider', 'onDiagnostic',
  ] as const;
  for (const name of factoryNames) requiredFunction(options[name], `ProductPresentationSession composition.${name}`);
  for (const name of ['mapperId', 'ownerId', 'profileLeaseHolderId', 'keyPrefix'] as const) {
    const field = options[name];
    if (typeof field !== 'string' || field.trim().length === 0) {
      throw new TypeError(`ProductPresentationSession composition.${name} 必须是非空字符串。`);
    }
  }
  for (const name of [
    'fixedDeltaSeconds', 'maximumCatchUpTicks', 'profileLeaseHeartbeatIntervalMs',
    'profileLeaseRetryIntervalMs',
  ] as const) {
    const field = options[name];
    if (typeof field !== 'number' || !Number.isFinite(field) || field <= 0) {
      throw new RangeError(`ProductPresentationSession composition.${name} 必须是正有限数。`);
    }
  }
  if (!Number.isSafeInteger(options.maximumCatchUpTicks)) {
    throw new RangeError('ProductPresentationSession maximumCatchUpTicks 必须是安全整数。');
  }
  if (
    !Number.isSafeInteger(options.profileLeaseHeartbeatIntervalMs)
    || !Number.isSafeInteger(options.profileLeaseRetryIntervalMs)
  ) throw new RangeError('ProductPresentationSession lease 间隔必须是安全整数。');
  if (typeof options.profileLeaseTakeoverSameOwner !== 'boolean') {
    throw new TypeError('ProductPresentationSession profileLeaseTakeoverSameOwner 必须是布尔值。');
  }
  if (options.matchCompletionSink !== null && typeof options.matchCompletionSink !== 'function') {
    throw new TypeError('ProductPresentationSession matchCompletionSink 必须是函数或 null。');
  }
  const seedSource = asObject(options.seedSource, 'ProductPresentationSession seedSource');
  method(seedSource, 'ProductPresentationSession seedSource', 'nextSeed');
  const qualityDefinition = asObject(
    options.qualityDefinition,
    'ProductPresentationSession qualityDefinition',
  );
  const qualityId = ownData(
    qualityDefinition,
    'id',
    'ProductPresentationSession qualityDefinition',
  );
  if (typeof qualityId !== 'string' || qualityId.length === 0) {
    throw new TypeError('ProductPresentationSession qualityDefinition.id 必须是非空字符串。');
  }
  method(qualityDefinition, 'ProductPresentationSession qualityDefinition', 'getContentHash');
  return Object.freeze({
    platform: validatePlatform(options.platform),
    mapperId: options.mapperId as string,
    seedSource: options.seedSource,
    ownerId: options.ownerId as string,
    profileLeaseHolderId: options.profileLeaseHolderId as string,
    keyPrefix: options.keyPrefix as string,
    matchConfig: options.matchConfig,
    matchCompletionSink: options.matchCompletionSink,
    qualityDefinition: options.qualityDefinition as PresentationQualityDefinition,
    fixedDeltaSeconds: options.fixedDeltaSeconds as number,
    maximumCatchUpTicks: options.maximumCatchUpTicks as number,
    profileLeaseHeartbeatIntervalMs: options.profileLeaseHeartbeatIntervalMs as number,
    profileLeaseRetryIntervalMs: options.profileLeaseRetryIntervalMs as number,
    profileLeaseTakeoverSameOwner: options.profileLeaseTakeoverSameOwner as boolean,
    performanceMemoryProvider: options.performanceMemoryProvider as () => unknown,
    onDiagnostic: options.onDiagnostic as ProductPresentationSessionComposition['onDiagnostic'],
    rendererFactory: options.rendererFactory as UnknownFunction,
    controllerFactory: options.controllerFactory as UnknownFunction,
    flowFactory: options.flowFactory as UnknownFunction,
    mapperFactory: options.mapperFactory as UnknownFunction,
    samplerFactory: options.samplerFactory as UnknownFunction,
    inputRouterFactory: options.inputRouterFactory as UnknownFunction,
    inputAdapterFactory: options.inputAdapterFactory as UnknownFunction,
    frameLoopFactory: options.frameLoopFactory as UnknownFunction,
    accumulatorFactory: options.accumulatorFactory as UnknownFunction,
    renderPacerFactory: options.renderPacerFactory as UnknownFunction,
    performanceProbeFactory: options.performanceProbeFactory as UnknownFunction,
  });
}

type ActiveFlowSnapshot = ProductPresentationFlowSnapshot & {
  readonly viewModel: NonNullable<ProductPresentationFlowSnapshot['viewModel']>;
};

function ownData(value: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key} 必须是自有数据字段。`);
  }
  return descriptor.value;
}

function requireSnapshot(value: unknown, name: string): ActiveFlowSnapshot {
  const source = asObject(value, name);
  const viewModel = asObject(ownData(source, 'viewModel', name), `${name}.viewModel`);
  const terminal = ownData(viewModel, 'terminal', `${name}.viewModel`);
  const activeState = ownData(viewModel, 'activeState', `${name}.viewModel`);
  if (typeof terminal !== 'boolean' || typeof activeState !== 'string') {
    throw new TypeError(`${name}.viewModel 不符合合同。`);
  }
  return value as ActiveFlowSnapshot;
}

function nativePromise<T>(value: unknown, name: string): Promise<T> {
  if (!(value instanceof Promise)) {
    rejectThenable(value, name);
    throw new TypeError(`${name} 必须返回 Promise。`);
  }
  return value as Promise<T>;
}

function errorMessage(error: unknown): string {
  return normalizeThrownError(error, '未知错误').message;
}

function validateOwnedCandidate<T>(
  value: unknown,
  name: string,
  cleanupMethodName: string,
  validator: (candidate: unknown) => T,
  retainCleanup: (cleanup: () => unknown) => void,
): T {
  try {
    return validator(value);
  } catch (error) {
    try {
      const cleanup = optionalMethod(value, name, cleanupMethodName);
      if (cleanup) retainCleanup(() => syncResult(cleanup(), `${name}.${cleanupMethodName}()`));
    } catch {
      // An accessor-backed cleanup capability is unsafe to execute.
    }
    throw normalizeThrownError(error, `${name} 候选无效`);
  }
}

function optionalNestedInteger(value: unknown, parentKey: string, key: string): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const parentDescriptor = Object.getOwnPropertyDescriptor(value, parentKey);
  if (!parentDescriptor || !Object.hasOwn(parentDescriptor, 'value')) return null;
  const parent = parentDescriptor.value;
  if (!parent || typeof parent !== 'object' || Array.isArray(parent)) return null;
  const descriptor = Object.getOwnPropertyDescriptor(parent, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) return null;
  return Number.isSafeInteger(descriptor.value) ? descriptor.value as number : null;
}

function cleanupFailure(errors: readonly unknown[]): Error | null {
  if (errors.length === 0) return null;
  const failure = new Error('ProductPresentationSession 清理未完整完成。');
  Object.defineProperty(failure, 'cleanupErrors', { value: errors.map((error) => normalizeThrownError(
    error,
    'ProductPresentationSession 资源清理失败',
  )) });
  return failure;
}

export class ProductPresentationSession {
  #composition: ProductPresentationSessionComposition & { readonly platform: PlatformPort };
  #state: ProductPresentationSessionState;
  #startPromise: Promise<this> | null;
  #destroyRequested: boolean;
  #processingFrame: boolean;
  #frameReentryAttempted: boolean;
  #cleaningUp: boolean;
  #cleanupIncomplete: boolean;
  #deferredFailureCleanup: boolean;
  #hidden: boolean;
  #contextLost: boolean;
  #externallyPaused: boolean;
  #resizePending: boolean;
  #lastError: Error | null;
  #canvas: CanvasPort | null;
  #renderer: RendererPort | null;
  #controller: ControllerPort | null;
  #flow: FlowPort | null;
  #inputRouter: InputRouterPort | null;
  #inputAdapter: InputAdapterPort | null;
  #accumulator: AccumulatorPort | null;
  #frameLoop: FrameLoopPort | null;
  #renderPacer: RenderPacerPort | null;
  #performanceProbe: PerformanceProbePort | null;
  #performanceProbeErrorCount: number;
  #lastPerformanceSnapshot: unknown;
  #lastPublishTelemetry: Readonly<{
    rendered: boolean;
    renderDurationMs: number | null;
    resources: Readonly<PresentationResourceSnapshot> | null | undefined;
  }> | null;
  #firstMatchMilestoneRecorded: boolean;
  #performanceObservedMatchCount: number;
  #performanceMatchActive: boolean;
  #performanceLifecycleCounters: {
    hideCount: number;
    showCount: number;
    contextLostCount: number;
    contextRestoredCount: number;
  };
  #bindings: Array<() => unknown>;
  #candidateCleanups: Array<() => unknown>;
  #lastSnapshot: ProductPresentationFlowSnapshot | null;
  #inputMatchActive: boolean;
  #hasAssignedMatchSampler: boolean;
  #lastWallNowMs: number | null;
  #nextProfileLeaseHeartbeatAtMs: number | null;

  constructor(compositionValue: ProductPresentationSessionComposition) {
    this.#composition = validateComposition(compositionValue);
    this.#state = PRODUCT_PRESENTATION_SESSION_STATE.CREATED;
    this.#startPromise = null;
    this.#destroyRequested = false;
    this.#processingFrame = false;
    this.#frameReentryAttempted = false;
    this.#cleaningUp = false;
    this.#cleanupIncomplete = false;
    this.#deferredFailureCleanup = false;
    this.#hidden = false;
    this.#contextLost = false;
    this.#externallyPaused = false;
    this.#resizePending = false;
    this.#lastError = null;
    this.#canvas = null;
    this.#renderer = null;
    this.#controller = null;
    this.#flow = null;
    this.#inputRouter = null;
    this.#inputAdapter = null;
    this.#accumulator = null;
    this.#frameLoop = null;
    this.#renderPacer = null;
    this.#performanceProbe = null;
    this.#performanceProbeErrorCount = 0;
    this.#lastPerformanceSnapshot = null;
    this.#lastPublishTelemetry = null;
    this.#firstMatchMilestoneRecorded = false;
    this.#performanceObservedMatchCount = 0;
    this.#performanceMatchActive = false;
    this.#performanceLifecycleCounters = {
      hideCount: 0,
      showCount: 0,
      contextLostCount: 0,
      contextRestoredCount: 0,
    };
    this.#bindings = [];
    this.#candidateCleanups = [];
    this.#lastSnapshot = null;
    this.#inputMatchActive = false;
    this.#hasAssignedMatchSampler = false;
    this.#lastWallNowMs = null;
    this.#nextProfileLeaseHeartbeatAtMs = null;
    Object.freeze(this);
  }

  get state(): ProductPresentationSessionState {
    return this.#state;
  }

  #isTerminal(): boolean {
    return this.#state === PRODUCT_PRESENTATION_SESSION_STATE.FAILED
      || this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED;
  }

  #guardFrameReentry(operation: string): void {
    if (!this.#processingFrame) return;
    this.#frameReentryAttempted = true;
    throw new Error(`ProductPresentationSession frame 期间不能执行 ${operation}。`);
  }

  #requireRenderer(): RendererPort {
    if (this.#renderer === null) throw new Error('ProductPresentationSession renderer 尚未就绪。');
    return this.#renderer;
  }

  #requireFlow(): FlowPort {
    if (this.#flow === null) throw new Error('ProductPresentationSession flow 尚未就绪。');
    return this.#flow;
  }

  #requireInputRouter(): InputRouterPort {
    if (this.#inputRouter === null) throw new Error('ProductPresentationSession inputRouter 尚未就绪。');
    return this.#inputRouter;
  }

  #requireAccumulator(): AccumulatorPort {
    if (this.#accumulator === null) throw new Error('ProductPresentationSession accumulator 尚未就绪。');
    return this.#accumulator;
  }

  #requireFrameLoop(): FrameLoopPort {
    if (this.#frameLoop === null) throw new Error('ProductPresentationSession frameLoop 尚未就绪。');
    return this.#frameLoop;
  }

  #requireRenderPacer(): RenderPacerPort {
    if (this.#renderPacer === null) throw new Error('ProductPresentationSession renderPacer 尚未就绪。');
    return this.#renderPacer;
  }

  #report(type: string, detail: Readonly<Record<string, unknown>> = {}): void {
    try { this.#composition.onDiagnostic(Object.freeze({ type, ...detail })); } catch {
      // Diagnostics are observational and cannot own Product lifecycle.
    }
  }

  #performanceNow(): number | null {
    try {
      const value = this.#composition.platform.now();
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
    } catch {
      // Performance observation must not own Product lifecycle.
    }
    return null;
  }

  #observePerformance(
    methodName: 'start' | 'markMilestone' | 'recordFrame' | 'stop',
    ...args: unknown[]
  ): boolean {
    if (this.#performanceProbe === null) return false;
    try {
      const result = (this.#performanceProbe[methodName] as UnknownFunction)(...args);
      syncResult(result, `ProductPresentationSession performanceProbe.${methodName}()`);
      return result !== false;
    } catch (error) {
      this.#performanceProbeErrorCount += 1;
      this.#report('observer-probe-error', {
        method: methodName,
        message: errorMessage(error),
      });
      return false;
    }
  }

  #markPerformanceMilestone(id: string, timestampMs: number | null = this.#performanceNow()): boolean {
    if (timestampMs === null) return false;
    return this.#observePerformance('markMilestone', id, timestampMs);
  }

  #guardHost(callback: UnknownFunction): UnknownFunction {
    return (...args: unknown[]) => {
      if (this.#isTerminal() || this.#destroyRequested) return false;
      try {
        callback(...args);
        return true;
      } catch (error) {
        this.#fail(error);
        return false;
      }
    };
  }

  #registerCleanup(cleanup: unknown, name: string): void {
    if (typeof cleanup !== 'function') throw new TypeError(`${name} 必须返回 cleanup 函数。`);
    this.#bindings.push(cleanup as () => unknown);
  }

  #bindCanvasEvent(type: string, callback: UnknownFunction): () => void {
    const canvas = this.#canvas;
    if (canvas === null) throw new Error('Product Canvas 尚未创建。');
    syncResult(canvas.addEventListener(type, callback, false), `Product Canvas ${type} addEventListener()`);
    let active = true;
    return () => {
      if (!active) return;
      syncResult(canvas.removeEventListener(type, callback, false), `Product Canvas ${type} removeEventListener()`);
      active = false;
    };
  }

  #failFromHost(error: unknown): void {
    if (this.#cleaningUp || this.#destroyRequested || this.#isTerminal()) return;
    this.#fail(error);
  }

  #bindLifecycle(): void {
    const platform = this.#composition.platform;
    this.#registerCleanup(platform.onResize(this.#guardHost(() => this.#handleResize())), 'onResize');
    this.#registerCleanup(platform.onHide(this.#guardHost(() => {
      this.#performanceLifecycleCounters.hideCount += 1;
      this.#hidden = true;
      this.#syncPauseState();
    })), 'onHide');
    this.#registerCleanup(platform.onShow(this.#guardHost(() => {
      this.#performanceLifecycleCounters.showCount += 1;
      this.#hidden = false;
      this.#syncPauseState();
    })), 'onShow');
    this.#registerCleanup(this.#bindCanvasEvent(
      'webglcontextlost',
      this.#guardHost((event: unknown) => {
        this.#performanceLifecycleCounters.contextLostCount += 1;
        this.#requireRenderer().handleContextLost(event);
        this.#contextLost = true;
        this.#syncPauseState();
      }),
    ), 'webglcontextlost');
    this.#registerCleanup(this.#bindCanvasEvent(
      'webglcontextrestored',
      this.#guardHost(() => {
        if (this.#requireRenderer().handleContextRestored() === false) return;
        this.#performanceLifecycleCounters.contextRestoredCount += 1;
        this.#contextLost = false;
        if (!this.#inputRouter) {
          this.#resizePending = true;
          return;
        }
        this.#applyResize();
        this.#syncPauseState();
      }),
    ), 'webglcontextrestored');
  }

  #desiredInputMode(snapshot: ActiveFlowSnapshot): ProductInputRouterMode {
    if (snapshot.viewModel.terminal) return PRODUCT_INPUT_ROUTER_MODE.INACTIVE;
    if (snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH) {
      return PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY;
    }
    return PRODUCT_INPUT_ROUTER_MODE.UI;
  }

  #updateInputMode(snapshot: ActiveFlowSnapshot): void {
    const inMatch = snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH;
    if (!inMatch) {
      this.#inputMatchActive = false;
    } else if (!this.#inputMatchActive) {
      if (this.#hasAssignedMatchSampler) {
        this.#requireInputRouter().replaceSampler(this.#createSampler());
      }
      this.#hasAssignedMatchSampler = true;
      this.#inputMatchActive = true;
    }
    syncResult(
      this.#requireInputRouter().setMode(this.#desiredInputMode(snapshot)),
      'ProductPresentationSession inputRouter.setMode()',
    );
  }

  #createSampler(): unknown {
    const mapper = syncResult(
      this.#composition.mapperFactory(this.#composition.mapperId),
      'ProductPresentationSession mapperFactory()',
    );
    const mapperObject = asObject(mapper, 'ProductPresentationSession mapper');
    if (ownData(mapperObject, 'id', 'ProductPresentationSession mapper') !== this.#composition.mapperId) {
      throw new TypeError('ProductPresentationSession mapperFactory 返回值不符合合同。');
    }
    method(mapperObject, 'ProductPresentationSession mapper', 'map');
    return syncResult(this.#composition.samplerFactory({
      participantId: 'player-1',
      viewport: this.#requireRenderer().getInputViewport(),
      mapper,
    }), 'ProductPresentationSession samplerFactory()');
  }

  #readWallNow(): number {
    const now = this.#composition.platform.wallNow();
    if (typeof now !== 'number' || !Number.isSafeInteger(now) || now < 0) {
      throw new RangeError('ProductPresentationSession platform.wallNow() 必须返回非负安全整数。');
    }
    if (this.#lastWallNowMs !== null && now < this.#lastWallNowMs) {
      throw new RangeError('ProductPresentationSession wallNow 不能在实例生命周期内倒退。');
    }
    this.#lastWallNowMs = now;
    return now;
  }

  #scheduleProfileLeaseHeartbeat(now: number, delayMs: number): void {
    const next = now + delayMs;
    if (!Number.isSafeInteger(next)) {
      throw new RangeError('ProductPresentationSession Profile lease 心跳时间溢出。');
    }
    this.#nextProfileLeaseHeartbeatAtMs = next;
  }

  #heartbeatIfDue(force = false): ActiveFlowSnapshot {
    const flow = this.#requireFlow();
    let snapshot = requireSnapshot(flow.getSnapshot(), 'ProductPresentationSession flow snapshot');
    if (snapshot.viewModel.terminal) {
      this.#nextProfileLeaseHeartbeatAtMs = null;
      return snapshot;
    }
    const now = this.#readWallNow();
    if (
      !force
      && this.#nextProfileLeaseHeartbeatAtMs !== null
      && now < this.#nextProfileLeaseHeartbeatAtMs
    ) return snapshot;
    const outcome = asObject(
      syncResult(flow.heartbeat(), 'ProductPresentationSession flow.heartbeat()'),
      'ProductPresentationSession heartbeat outcome',
    );
    const renewed = ownData(outcome, 'renewed', 'ProductPresentationSession heartbeat outcome');
    if (typeof renewed !== 'boolean') throw new TypeError('ProductPresentationSession heartbeat.renewed 必须是 boolean。');
    snapshot = requireSnapshot(
      ownData(outcome, 'snapshot', 'ProductPresentationSession heartbeat outcome'),
      'ProductPresentationSession heartbeat snapshot',
    );
    if (snapshot.viewModel.terminal) {
      this.#nextProfileLeaseHeartbeatAtMs = null;
      return snapshot;
    }
    this.#scheduleProfileLeaseHeartbeat(
      now,
      renewed
        ? this.#composition.profileLeaseHeartbeatIntervalMs
        : this.#composition.profileLeaseRetryIntervalMs,
    );
    return snapshot;
  }

  #publish(
    snapshot: ActiveFlowSnapshot,
    deltaSeconds: number,
    { forceRender = false }: Readonly<{ forceRender?: boolean }> = {},
  ): boolean {
    this.#lastSnapshot = snapshot;
    const performanceInMatch = snapshot?.viewModel?.activeState === PRODUCT_SESSION_STATE.IN_MATCH;
    const matchSeed = optionalNestedInteger(snapshot.matchFrame, 'source', 'matchSeed');
    if (
      performanceInMatch
      && !this.#performanceMatchActive
      && matchSeed !== null
      && matchSeed >= 0
      && matchSeed <= 0xffffffff
    ) {
      this.#performanceObservedMatchCount += 1;
    }
    this.#performanceMatchActive = performanceInMatch;
    this.#updateInputMode(snapshot);
    this.#lastPublishTelemetry = Object.freeze({
      rendered: false,
      renderDurationMs: null,
      resources: null,
    });
    if (this.#hidden || this.#contextLost || this.#destroyRequested || this.#isTerminal()) {
      return true;
    }
    if (!this.#requireRenderPacer().shouldRender(deltaSeconds, { force: forceRender })) return true;
    const renderStartedAtMs = this.#performanceNow();
    const renderer = this.#requireRenderer();
    const rendered = syncResult(renderer.render(Object.freeze({
      viewModel: snapshot.viewModel,
      matchFrame: snapshot.matchFrame,
    }), { deltaSeconds }), 'ProductPresentationSession renderer.render()');
    const renderEndedAtMs = this.#performanceNow();
    let resources: Readonly<PresentationResourceSnapshot> | null | undefined = null;
    const sampleResourcesValue = this.#performanceProbe?.shouldSampleResources?.() ?? true;
    rejectThenable(sampleResourcesValue, 'ProductPresentationSession shouldSampleResources()');
    const sampleResources = sampleResourcesValue !== false;
    if (sampleResources) {
      try {
        const resourceValue = renderer.getPerformanceSnapshot?.() ?? null;
        rejectThenable(resourceValue, 'ProductPresentationSession renderer.getPerformanceSnapshot()');
        resources = resourceValue as Readonly<PresentationResourceSnapshot> | null;
      } catch (error) {
        this.#performanceProbeErrorCount += 1;
        this.#report('observer-probe-error', {
          method: 'renderer.getPerformanceSnapshot',
          message: errorMessage(error),
        });
      }
      try {
        const memory = createPresentationMemorySnapshot(
          this.#composition.performanceMemoryProvider(),
        );
        resources = mergePresentationMemorySnapshot(resources, memory);
      } catch (error) {
        this.#performanceProbeErrorCount += 1;
        this.#report('observer-probe-error', {
          method: 'performanceMemoryProvider',
          message: errorMessage(error),
        });
      }
    }
    this.#lastPublishTelemetry = Object.freeze({
      rendered: rendered !== false,
      renderDurationMs: renderStartedAtMs !== null
        && renderEndedAtMs !== null
        && renderEndedAtMs >= renderStartedAtMs
        ? renderEndedAtMs - renderStartedAtMs
        : null,
      resources,
    });
    if (rendered === false) {
      this.#contextLost = true;
      if (this.#state !== PRODUCT_PRESENTATION_SESSION_STATE.STARTING) {
        this.#syncPauseState();
      }
    }
    return rendered !== false;
  }

  #dispatchIntent(intent: ProductUiIntent): Promise<ActiveFlowSnapshot | null> {
    if (this.#isTerminal() || this.#destroyRequested) {
      return Promise.reject(new Error('ProductPresentationSession 不可处理 UI intent。'));
    }
    if (this.#flow === null) {
      return Promise.reject(new Error('ProductPresentationSession 尚未完成启动。'));
    }
    if (
      intent?.id === PRODUCT_UI_INTENT_ID.START_MATCH
      || intent?.id === PRODUCT_UI_INTENT_ID.REQUEST_MATCH
      || intent?.id === PRODUCT_UI_INTENT_ID.REQUEST_REMATCH
    ) this.#markPerformanceMilestone('first-match-requested');
    const flow = this.#flow;
    const dispatched = nativePromise<unknown>(
      flow.dispatch(intent),
      'ProductPresentationSession flow.dispatch()',
    );
    return dispatched.then<ActiveFlowSnapshot | null>(
      (snapshotValue) => {
        if (snapshotValue === null || this.#isTerminal() || this.#destroyRequested) return null;
        const snapshot = requireSnapshot(snapshotValue, 'ProductPresentationSession dispatch snapshot');
        try {
          this.#publish(snapshot, 0, { forceRender: true });
          return snapshot;
        } catch (error) {
          throw this.#fail(error);
        }
      },
      (error: unknown) => {
        if (this.#flow?.getState() === PRODUCT_PRESENTATION_FLOW_STATE.FAILED) {
          throw this.#fail(error);
        }
        throw error;
      },
    );
  }

  async #initialize(): Promise<void> {
    this.#renderPacer = validateRenderPacer(syncResult(this.#composition.renderPacerFactory({
      qualityDefinition: this.#composition.qualityDefinition,
    }), 'ProductPresentationSession renderPacerFactory()'));
    this.#performanceProbe = validateOwnedCandidate(
      syncResult(
        this.#composition.performanceProbeFactory(),
        'ProductPresentationSession performanceProbeFactory()',
      ),
      'ProductPresentationSession performanceProbe',
      'destroy',
      validatePerformanceProbe,
      (cleanup) => this.#candidateCleanups.push(cleanup),
    );
    const probeStartedAtMs = this.#performanceNow();
    if (probeStartedAtMs !== null) this.#observePerformance('start', probeStartedAtMs);
    this.#canvas = validateCanvas(syncResult(
      this.#composition.platform.createCanvas(),
      'ProductPresentationSession platform.createCanvas()',
    ));
    this.#renderer = validateOwnedCandidate(syncResult(this.#composition.rendererFactory({
      canvas: this.#canvas.source,
      platform: this.#composition.platform.source,
      qualityDefinition: this.#composition.qualityDefinition,
    }), 'ProductPresentationSession rendererFactory()'), 'ProductPresentationSession renderer', 'dispose', validateRenderer, (cleanup) => this.#candidateCleanups.push(cleanup));
    this.#bindLifecycle();
    await nativePromise<void>(
      this.#renderer.load(),
      'ProductPresentationSession renderer.load()',
    );
    this.#markPerformanceMilestone('renderer-ready');
    if (this.#destroyRequested || this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED) {
      throw new Error('ProductPresentationSession 启动已取消。');
    }
    this.#resizeRenderer();
    this.#resizePending = false;

    this.#controller = validateOwnedCandidate(syncResult(this.#composition.controllerFactory({
      storage: this.#composition.platform.source,
      ownerId: this.#composition.ownerId,
      profileLeaseHolderId: this.#composition.profileLeaseHolderId,
      wallNow: () => this.#composition.platform.wallNow(),
      seedSource: this.#composition.seedSource,
      matchConfig: this.#composition.matchConfig,
      matchCompletionSink: this.#composition.matchCompletionSink,
      keyPrefix: this.#composition.keyPrefix,
      profileLeaseTakeoverSameOwner: this.#composition.profileLeaseTakeoverSameOwner,
      diagnosticSink: (detail: unknown) => this.#report('product', { detail }),
    }), 'ProductPresentationSession controllerFactory()'), 'ProductPresentationSession controller', 'destroy', validateController, (cleanup) => this.#candidateCleanups.push(cleanup));
    this.#markPerformanceMilestone('controller-ready');
    let sampler = this.#createSampler();
    try {
      const routerCandidate = syncResult(this.#composition.inputRouterFactory({
        sampler,
        viewport: this.#requireRenderer().getInputViewport(),
        hitTestUi: (point: unknown, viewport: unknown) => this.#requireRenderer().hitTestUi(
          point,
          viewport,
          this.#lastSnapshot?.viewModel ?? null,
        ),
        onIntent: (intent: ProductUiIntent) => this.#dispatchIntent(intent),
        onIntentRejected: (error: unknown, intent: ProductUiIntent) => this.#report('ui-intent-rejected', {
          message: errorMessage(error),
          intentId: intent.id,
        }),
      }), 'ProductPresentationSession inputRouterFactory()');
      this.#inputRouter = validateOwnedCandidate(
        routerCandidate,
        'ProductPresentationSession inputRouter',
        'destroy',
        validateInputRouter,
        (cleanup) => this.#candidateCleanups.push(cleanup),
      );
      sampler = null;
    } finally {
      if (sampler !== null) {
        const destroySampler = optionalMethod(sampler, 'ProductPresentationSession sampler', 'destroy');
        if (destroySampler) {
          this.#candidateCleanups.push(() => syncResult(
            destroySampler(),
            'ProductPresentationSession sampler.destroy()',
          ));
        }
      }
    }
    this.#flow = validateOwnedCandidate(syncResult(this.#composition.flowFactory({
      controller: this.#controller.source,
      inputSource: this.#inputRouter.source,
    }), 'ProductPresentationSession flowFactory()'), 'ProductPresentationSession flow', 'destroy', validateFlow, (cleanup) => this.#candidateCleanups.push(cleanup));
    this.#registerCleanup(this.#renderer.bindUiIntent({
      onIntent: (intent: ProductUiIntent) => this.#dispatchIntent(intent),
      onRejected: (error: unknown, intent: ProductUiIntent | null) => this.#report('ui-intent-rejected', {
        message: errorMessage(error),
        intentId: intent?.id ?? null,
      }),
    }), 'renderer.bindUiIntent');
    this.#inputAdapter = validateOwnedCandidate(syncResult(this.#composition.inputAdapterFactory({
      platform: this.#composition.platform.source,
      sampler: this.#inputRouter.source,
      viewportProvider: () => this.#requireRenderer().getInputViewport(),
      manageLifecycle: false,
      onError: (error: unknown) => this.#failFromHost(error),
    }), 'ProductPresentationSession inputAdapterFactory()'), 'ProductPresentationSession inputAdapter', 'destroy', validateInputAdapter, (cleanup) => this.#candidateCleanups.push(cleanup));
    this.#accumulator = validateAccumulator(syncResult(this.#composition.accumulatorFactory({
      fixedDeltaSeconds: this.#composition.fixedDeltaSeconds,
      maximumSteps: this.#composition.maximumCatchUpTicks,
    }), 'ProductPresentationSession accumulatorFactory()'));
    this.#frameLoop = validateOwnedCandidate(syncResult(this.#composition.frameLoopFactory({
      requestFrame: (callback: unknown) => this.#composition.platform.requestFrame(callback),
      cancelFrame: (token: unknown) => this.#composition.platform.cancelFrame(token),
      now: () => this.#composition.platform.now(),
      onError: (error: unknown) => this.#fail(error),
      maxDeltaSeconds: 0.1,
    }), 'ProductPresentationSession frameLoopFactory()'), 'ProductPresentationSession frameLoop', 'destroy', validateFrameLoop, (cleanup) => this.#candidateCleanups.push(cleanup));
    if (this.#resizePending) this.#applyResize();

    this.#lastSnapshot = requireSnapshot(this.#flow.getSnapshot(), 'ProductPresentationSession initial snapshot');
    const initialSnapshot = requireSnapshot(this.#lastSnapshot, 'ProductPresentationSession initial snapshot');
    this.#updateInputMode(initialSnapshot);
    this.#publish(initialSnapshot, 0, { forceRender: true });
    const startingFlow = nativePromise<unknown>(
      this.#flow.start(),
      'ProductPresentationSession flow.start()',
    );
    await Promise.resolve();
    syncResult(this.#inputAdapter.start(), 'ProductPresentationSession inputAdapter.start()');
    if (this.#hidden || this.#contextLost || this.#externallyPaused) {
      this.#syncPauseState();
    }
    const started = await startingFlow;
    if (this.#destroyRequested) {
      throw new Error('ProductPresentationSession 启动已取消。');
    }
    if (started !== null) {
      this.#lastSnapshot = requireSnapshot(started, 'ProductPresentationSession started snapshot');
    }
    const heartbeatNow = this.#readWallNow();
    this.#scheduleProfileLeaseHeartbeat(
      heartbeatNow,
      this.#composition.profileLeaseHeartbeatIntervalMs,
    );
    this.#publish(
      this.#lastSnapshot === null
        ? requireSnapshot(this.#flow.getSnapshot(), 'ProductPresentationSession current snapshot')
        : requireSnapshot(this.#lastSnapshot, 'ProductPresentationSession current snapshot'),
      0,
      { forceRender: true },
    );
    this.#markPerformanceMilestone('interactive');
    this.#syncPauseState();
  }

  start(): Promise<this> {
    this.#guardFrameReentry('start');
    if (this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED) {
      return Promise.reject(new Error('ProductPresentationSession 已销毁。'));
    }
    if (this.#state === PRODUCT_PRESENTATION_SESSION_STATE.FAILED) {
      const error = new Error('ProductPresentationSession 已失败。');
      error.cause = this.#lastError;
      return Promise.reject(error);
    }
    if (this.#startPromise) return this.#startPromise;
    if (this.#state !== PRODUCT_PRESENTATION_SESSION_STATE.CREATED) {
      return Promise.resolve(this);
    }
    this.#state = PRODUCT_PRESENTATION_SESSION_STATE.STARTING;
    const operation: Promise<this> = this.#initialize()
      .then(() => this)
      .catch((error) => {
        if (this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED) throw error;
        throw this.#fail(error);
      })
      .finally(() => {
        if (this.#startPromise === operation) this.#startPromise = null;
      });
    this.#startPromise = operation;
    return operation;
  }

  #startFrameLoop(): boolean {
    if (
      this.#isTerminal()
      || this.#hidden
      || this.#contextLost
      || this.#externallyPaused
      || this.#destroyRequested
      || this.#lastSnapshot?.viewModel?.terminal
    ) return false;
    const result = this.#requireFrameLoop().start(({ timestamp, deltaSeconds }) => (
      this.#onFrame(timestamp, deltaSeconds)
    ));
    rejectThenable(result, 'ProductPresentationSession frameLoop.start()');
    return result !== false;
  }

  #onFrame(timestamp: number, deltaSeconds: number): boolean {
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      throw this.#fail(new RangeError('ProductPresentationSession frame timestamp 必须是非负有限数。'));
    }
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw this.#fail(new RangeError('ProductPresentationSession frame deltaSeconds 必须是非负有限数。'));
    }
    if (this.#destroyRequested) return false;
    if (this.#processingFrame) throw new Error('ProductPresentationSession frame 不可重入。');
    this.#processingFrame = true;
    this.#frameReentryAttempted = false;
    try {
      if (this.#resizePending) this.#applyResize();
      let snapshot = this.#heartbeatIfDue();
      let coreSteps = 0;
      let droppedSeconds = 0;
      if (snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH) {
        const accumulator = this.#requireAccumulator();
        const batch = accumulator.push(deltaSeconds);
        coreSteps = batch.steps;
        droppedSeconds = batch.droppedSeconds;
        if (batch.droppedSeconds > 0) {
          this.#report('presentation-backlog-dropped', {
            droppedSeconds: batch.droppedSeconds,
          });
        }
        for (
          let index = 0;
          index < batch.steps
            && snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH;
          index += 1
        ) snapshot = requireSnapshot(
          this.#requireFlow().stepMatch(),
          'ProductPresentationSession step snapshot',
        );
      } else {
        syncResult(this.#requireAccumulator().reset(), 'ProductPresentationSession accumulator.reset()');
      }
      this.#publish(snapshot, deltaSeconds);
      if (
        !this.#firstMatchMilestoneRecorded
        && snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH
      ) {
        this.#firstMatchMilestoneRecorded = this.#markPerformanceMilestone(
          'first-match-ready',
          timestamp,
        );
      }
      this.#observePerformance('recordFrame', {
        timestampMs: timestamp,
        deltaSeconds,
        coreSteps,
        droppedSeconds,
        rendered: this.#lastPublishTelemetry?.rendered ?? false,
        renderDurationMs: this.#lastPublishTelemetry?.renderDurationMs ?? null,
        resources: this.#lastPublishTelemetry?.resources ?? null,
      });
      if (this.#frameReentryAttempted) {
        throw this.#fail(new Error('ProductPresentationSession 检测到被宿主吞掉的 frame 重入异常。'));
      }
      return !this.#hidden
        && !this.#contextLost
        && !this.#externallyPaused
        && !this.#destroyRequested
        && !this.#isTerminal()
        && !snapshot.viewModel.terminal;
    } finally {
      this.#processingFrame = false;
      this.#frameReentryAttempted = false;
      if (this.#destroyRequested && this.#state !== PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED) {
        const errors = this.#cleanupResources();
        this.#state = PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED;
        const failure = cleanupFailure(errors);
        if (failure) this.#lastError = failure;
      } else if (this.#deferredFailureCleanup) {
        this.#completeFailureCleanup();
      }
    }
  }

  #resizeRenderer(): void {
    const resized = syncResult(
      this.#requireRenderer().resize(this.#composition.platform.getViewport()),
      'ProductPresentationSession renderer.resize()',
    );
    if (resized === false) {
      throw new Error('Product Renderer resize 失败。');
    }
  }

  #applyResize(): void {
    this.#resizeRenderer();
    syncResult(
      this.#requireInputRouter().resize(this.#requireRenderer().getInputViewport()),
      'ProductPresentationSession inputRouter.resize()',
    );
    this.#resizePending = false;
  }

  #handleResize(): void {
    if (!this.#renderer || !this.#inputRouter) {
      this.#resizePending = true;
      return;
    }
    if (this.#processingFrame) {
      this.#resizePending = true;
      return;
    }
    this.#applyResize();
    if (this.#lastSnapshot && !this.#hidden && !this.#contextLost) {
      this.#publish(
        requireSnapshot(this.#lastSnapshot, 'ProductPresentationSession resize snapshot'),
        0,
        { forceRender: true },
      );
    }
  }

  #syncPauseState(): void {
    if (!this.#flow || !this.#inputRouter || !this.#frameLoop || this.#isTerminal()) return;
    const paused = this.#hidden || this.#contextLost || this.#externallyPaused;
    if (paused) {
      syncResult(this.#inputRouter.suspend(), 'ProductPresentationSession inputRouter.suspend()');
      this.#lastSnapshot = requireSnapshot(this.#flow.hide(), 'ProductPresentationSession hidden snapshot');
      syncResult(this.#frameLoop.stop(), 'ProductPresentationSession frameLoop.stop()');
      syncResult(this.#requireAccumulator().reset(), 'ProductPresentationSession accumulator.reset()');
      this.#state = PRODUCT_PRESENTATION_SESSION_STATE.PAUSED;
      return;
    }
    const wasPaused = this.#state === PRODUCT_PRESENTATION_SESSION_STATE.PAUSED;
    const shownSnapshot = requireSnapshot(
      this.#flow.show(),
      'ProductPresentationSession shown snapshot',
    );
    this.#lastSnapshot = shownSnapshot;
    if (wasPaused && !shownSnapshot.viewModel.terminal) {
      this.#lastSnapshot = this.#heartbeatIfDue(true);
    }
    syncResult(this.#inputRouter.resume(), 'ProductPresentationSession inputRouter.resume()');
    const currentSnapshot = requireSnapshot(this.#lastSnapshot, 'ProductPresentationSession current snapshot');
    this.#updateInputMode(currentSnapshot);
    syncResult(this.#requireAccumulator().reset(), 'ProductPresentationSession accumulator.reset()');
    syncResult(this.#requireRenderPacer().reset(), 'ProductPresentationSession renderPacer.reset()');
    this.#state = PRODUCT_PRESENTATION_SESSION_STATE.RUNNING;
    this.#publish(currentSnapshot, 0, { forceRender: true });
    this.#startFrameLoop();
  }

  dispatch(intent: ProductUiIntent): Promise<ActiveFlowSnapshot | null> {
    this.#guardFrameReentry('dispatch');
    return this.#dispatchIntent(intent);
  }

  setPaused(paused: boolean): boolean {
    this.#guardFrameReentry('setPaused');
    if (this.#isTerminal() || this.#destroyRequested) return false;
    if (this.#externallyPaused === paused) return false;
    this.#externallyPaused = paused;
    this.#syncPauseState();
    return true;
  }

  getLastSnapshot(): ProductPresentationFlowSnapshot | null {
    this.#guardFrameReentry('getLastSnapshot');
    return this.#lastSnapshot;
  }

  getPerformanceSnapshot(): Readonly<Record<string, unknown>> {
    this.#guardFrameReentry('getPerformanceSnapshot');
    let probe = this.#lastPerformanceSnapshot;
    if (this.#performanceProbe !== null) {
      try {
        probe = syncResult(
          this.#performanceProbe.getSnapshot(),
          'ProductPresentationSession performanceProbe.getSnapshot()',
        );
      } catch (error) {
        this.#performanceProbeErrorCount += 1;
        this.#report('observer-probe-error', {
          method: 'getSnapshot',
          message: errorMessage(error),
        });
      }
    }
    return Object.freeze({
      qualityDefinitionId: this.#composition.qualityDefinition.id,
      qualityDefinitionHash: this.#composition.qualityDefinition.getContentHash(),
      observerErrorCount: this.#performanceProbeErrorCount,
      observedMatchCount: this.#performanceObservedMatchCount,
      lifecycle: Object.freeze({ ...this.#performanceLifecycleCounters }),
      probe,
    });
  }

  #finalizePerformanceProbe(): Readonly<Record<string, unknown>> {
    if (this.#performanceProbe === null) return this.getPerformanceSnapshot();
    const stoppedAtMs = this.#performanceNow();
    if (stoppedAtMs !== null) this.#observePerformance('stop', stoppedAtMs);
    try {
      this.#lastPerformanceSnapshot = syncResult(
        this.#performanceProbe.getSnapshot(),
        'ProductPresentationSession performanceProbe.getSnapshot()',
      );
    } catch (error) {
      this.#performanceProbeErrorCount += 1;
      this.#report('observer-probe-error', {
        method: 'finalize.getSnapshot',
        message: errorMessage(error),
      });
    }
    syncResult(this.#performanceProbe.destroy(), 'ProductPresentationSession performanceProbe.destroy()');
    this.#performanceProbe = null;
    return this.getPerformanceSnapshot();
  }

  finishPerformanceCapture(): Readonly<Record<string, unknown>> {
    this.#guardFrameReentry('finishPerformanceCapture');
    return this.#finalizePerformanceProbe();
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#guardFrameReentry('getDebugSnapshot');
    return Object.freeze({
      state: this.#state,
      hidden: this.#hidden,
      contextLost: this.#contextLost,
      externallyPaused: this.#externallyPaused,
      resizePending: this.#resizePending,
      processingFrame: this.#processingFrame,
      cleanupIncomplete: this.#cleanupIncomplete,
      deferredFailureCleanup: this.#deferredFailureCleanup,
      bindingCount: this.#bindings.length,
      productState: this.#lastSnapshot?.viewModel?.activeState ?? null,
      matchTick: optionalNestedInteger(this.#lastSnapshot?.matchFrame, 'source', 'tick'),
      input: this.#inputRouter?.getDebugSnapshot?.() ?? null,
      renderer: this.#renderer?.getDebugSnapshot?.() ?? null,
      frameLoop: this.#frameLoop?.getDebugSnapshot?.() ?? null,
      accumulator: this.#accumulator?.getDebugSnapshot?.() ?? null,
      renderPacer: this.#renderPacer?.getDebugSnapshot?.() ?? null,
      lastErrorMessage: this.#lastError?.message ?? null,
      lastErrorCauseMessage: this.#lastError?.cause === undefined
        ? null
        : errorMessage(this.#lastError.cause),
      performanceSnapshot: this.getPerformanceSnapshot(),
      nextProfileLeaseHeartbeatAtMs: this.#nextProfileLeaseHeartbeatAtMs,
    });
  }

  #cleanupResources(): unknown[] {
    if (this.#cleaningUp) return [new Error('ProductPresentationSession 清理不可重入。')];
    this.#cleaningUp = true;
    const errors: unknown[] = [];
    try {
      if (this.#frameLoop !== null) {
        if (typeof this.#frameLoop?.destroy !== 'function') this.#frameLoop = null;
        else {
          try {
            syncResult(this.#frameLoop.destroy(), 'ProductPresentationSession frameLoop.destroy()');
            this.#frameLoop = null;
          } catch (error) { errors.push(error); }
        }
      }
      if (this.#performanceProbe !== null) {
        try { this.#finalizePerformanceProbe(); } catch (error) { errors.push(error); }
      }
      if (this.#inputAdapter !== null) {
        if (typeof this.#inputAdapter?.destroy !== 'function') this.#inputAdapter = null;
        else {
          try {
            syncResult(this.#inputAdapter.destroy(), 'ProductPresentationSession inputAdapter.destroy()');
            this.#inputAdapter = null;
          } catch (error) { errors.push(error); }
        }
      }
      const bindings = this.#bindings.splice(0);
      const failedBindings: Array<() => unknown> = [];
      for (const cleanup of bindings.reverse()) {
        try {
          syncResult(cleanup(), 'ProductPresentationSession binding cleanup()');
        } catch (error) { errors.push(error); failedBindings.push(cleanup); }
      }
      this.#bindings.push(...failedBindings.reverse());
      const candidateCleanups = this.#candidateCleanups.splice(0);
      const failedCandidateCleanups: Array<() => unknown> = [];
      for (const cleanup of candidateCleanups.reverse()) {
        try {
          syncResult(cleanup(), 'ProductPresentationSession candidate cleanup()');
        } catch (error) { errors.push(error); failedCandidateCleanups.push(cleanup); }
      }
      this.#candidateCleanups.push(...failedCandidateCleanups.reverse());
      if (this.#flow !== null) {
        if (typeof this.#flow?.destroy !== 'function') this.#flow = null;
        else {
          try {
            syncResult(this.#flow.destroy(), 'ProductPresentationSession flow.destroy()');
            this.#flow = null;
          } catch (error) { errors.push(error); }
        }
      }
      if (this.#inputRouter !== null) {
        if (typeof this.#inputRouter?.destroy !== 'function') this.#inputRouter = null;
        else {
          try {
            syncResult(this.#inputRouter.destroy(), 'ProductPresentationSession inputRouter.destroy()');
            this.#inputRouter = null;
          } catch (error) { errors.push(error); }
        }
      }
      if (this.#controller !== null) {
        if (typeof this.#controller?.destroy !== 'function') this.#controller = null;
        else {
          try {
            syncResult(this.#controller.destroy(), 'ProductPresentationSession controller.destroy()');
            this.#controller = null;
          } catch (error) { errors.push(error); }
        }
      }
      if (this.#renderer !== null) {
        if (typeof this.#renderer?.dispose !== 'function') this.#renderer = null;
        else {
          try {
            syncResult(this.#renderer.dispose(), 'ProductPresentationSession renderer.dispose()');
            this.#renderer = null;
          } catch (error) { errors.push(error); }
        }
      }
      if (this.#renderer === null && this.#bindings.length === 0) this.#canvas = null;
      this.#accumulator = null;
      this.#renderPacer = null;
      this.#lastPublishTelemetry = null;
      this.#lastSnapshot = null;
      this.#inputMatchActive = false;
      this.#hasAssignedMatchSampler = false;
      this.#lastWallNowMs = null;
      this.#nextProfileLeaseHeartbeatAtMs = null;
    } finally {
      this.#cleanupIncomplete = errors.length > 0;
      this.#cleaningUp = false;
    }
    return errors;
  }

  #completeFailureCleanup(): Error | null {
    this.#deferredFailureCleanup = false;
    const cleanupErrors = this.#cleanupResources();
    if (cleanupErrors.length === 0) return this.#lastError;
    const failure = new Error('ProductPresentationSession 失败且清理未完整完成。');
    failure.cause = this.#lastError;
    Object.defineProperty(failure, 'cleanupErrors', { value: cleanupErrors.map((error) => normalizeThrownError(
      error,
      'ProductPresentationSession 资源清理失败',
    )) });
    this.#lastError = failure;
    return failure;
  }

  #fail(error: unknown): Error {
    const failure = normalizeThrownError(error, 'ProductPresentationSession 失败');
    if (this.#state === PRODUCT_PRESENTATION_SESSION_STATE.FAILED) {
      return this.#lastError ?? failure;
    }
    if (this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED) return failure;
    this.#lastError = failure;
    this.#state = PRODUCT_PRESENTATION_SESSION_STATE.FAILED;
    try {
      if (this.#frameLoop !== null) {
        syncResult(this.#frameLoop.stop(), 'ProductPresentationSession frameLoop.stop()');
      }
    } catch (stopError) {
      this.#report('frame-loop-stop-error', { message: errorMessage(stopError) });
    }
    this.#report('session-failed', { message: failure.message });
    if (this.#processingFrame) {
      this.#deferredFailureCleanup = true;
      return failure;
    }
    return this.#completeFailureCleanup() ?? failure;
  }

  destroy(): void {
    if (
      this.#state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED
      && !this.#cleanupIncomplete
    ) return;
    if (this.#processingFrame) {
      this.#destroyRequested = true;
      return;
    }
    this.#destroyRequested = true;
    const errors = this.#cleanupResources();
    this.#state = PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED;
    const failure = cleanupFailure(errors);
    if (failure) {
      this.#lastError = failure;
      throw failure;
    }
    this.#lastError = null;
  }
}
