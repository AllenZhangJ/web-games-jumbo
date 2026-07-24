import {
  assertPlainRecord,
  combineCleanupFailure,
  normalizeThrownError,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_PRESENTATION_FLOW_STATE,
  PRODUCT_UI_INTENT_ID,
  createProductUiIntent,
  createProductUiIntentKey,
  type ProductPresentationFlowState,
  type ProductUiIntent,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  validateProductMatchResult,
  type ProductMatchResult,
} from '@number-strategy-jump/arena-product-contracts';
import { PRODUCT_SESSION_STATE } from '@number-strategy-jump/arena-product-state';
import {
  ownOptions,
  rejectThenable,
  snapshotMethod,
} from './capability-utils.js';
import {
  PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE,
  ProductMatchPresentationRuntime,
  type ProductMatchPresentationControllerPort,
  type ProductMatchPresentationInputPort,
  type ProductMatchPresentationProjectorOptions,
  type ProductMatchPresentationRuntimeOptions,
  type ProductMatchPresentationRuntimeState,
} from './product-match-presentation-runtime.js';
import {
  ProductSessionIntentDispatcher,
  type ProductSessionControllerPresentationPort,
} from './product-session-intent-dispatcher.js';
import {
  createProductSessionViewModel,
  type ProductSessionViewModel,
  type ProductSessionViewModelOptions,
} from './product-session-view-model.js';

export { PRODUCT_PRESENTATION_FLOW_STATE } from '@number-strategy-jump/arena-presentation-contracts';

export interface ProductPresentationFlowControllerPort
  extends ProductSessionControllerPresentationPort,
  ProductMatchPresentationControllerPort {
  commitReward(): unknown;
  hide(): unknown;
  renewProfileLease(): unknown;
  show(): unknown;
}

type ControllerAdapter = ProductPresentationFlowControllerPort;

interface DispatcherAdapter {
  dispatch(intent: ProductUiIntent): Promise<unknown>;
  getSnapshot(): unknown;
  destroy(): void;
}

interface MatchRuntimeAdapter {
  start(): unknown;
  step(): unknown;
  getLastMatchResult(): unknown;
  getState(): ProductMatchPresentationRuntimeState;
  destroy(): void;
}

export type ProductPresentationContentOptions = Omit<
  ProductSessionViewModelOptions,
  'lastMatchResult'
>;

export interface ProductPresentationFlowOptions {
  readonly controller: ProductPresentationFlowControllerPort;
  readonly inputSource: ProductMatchPresentationInputPort;
  readonly presentationContent: ProductPresentationContentOptions;
  readonly matchPresentationContent?: unknown;
  readonly intentDispatcherFactory?: (
    options: Readonly<{ controller: ProductSessionControllerPresentationPort }>,
  ) => unknown;
  readonly matchRuntimeFactory?: (options: ProductMatchPresentationRuntimeOptions) => unknown;
  readonly frameProjector: (options: ProductMatchPresentationProjectorOptions) => unknown;
}

export interface ProductPresentationFlowSnapshot {
  readonly state: ProductPresentationFlowState;
  readonly pendingIntent: boolean;
  readonly pendingIntentKey: string | null;
  readonly synchronizing: boolean;
  readonly stepping: boolean;
  readonly cleanupIncomplete: boolean;
  readonly viewModel: ProductSessionViewModel | null;
  readonly matchFrame: unknown;
  readonly hasMatchRuntime: boolean;
  readonly matchRuntimeState: ProductMatchPresentationRuntimeState | null;
  readonly failed: boolean;
}

const OPTION_KEYS = new Set([
  'controller', 'inputSource', 'presentationContent', 'matchPresentationContent',
  'intentDispatcherFactory', 'matchRuntimeFactory', 'frameProjector',
]);
const PRESENTATION_CONTENT_KEYS = new Set([
  'schemaVersion', 'screenRegistry', 'messageCatalog', 'contentRegistry',
]);
const PRODUCT_STATES = new Set<string>(Object.values(PRODUCT_SESSION_STATE));
const MATCH_RUNTIME_STATES = new Set<string>(
  Object.values(PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE),
);

function syncResult(value: unknown, name: string): unknown {
  rejectThenable(value, name);
  return value;
}

function requiredFunction(value: unknown, name: string): (...args: unknown[]) => unknown {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as (...args: unknown[]) => unknown;
}

function ownData(record: PlainRecord, field: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${field} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function optionalOwnData(record: PlainRecord, field: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (!descriptor) return undefined;
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${field} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function stateView(snapshotValue: unknown): Readonly<{
  visible: string;
  active: string;
  recovery: string | null;
  suspended: boolean;
}> {
  const snapshot = assertPlainRecord(snapshotValue, 'ProductPresentationFlow Product snapshot');
  const state = assertPlainRecord(
    ownData(snapshot, 'state', 'ProductPresentationFlow Product snapshot'),
    'ProductPresentationFlow Product snapshot.state',
  );
  const visible = ownData(state, 'state', 'ProductPresentationFlow Product snapshot.state');
  if (typeof visible !== 'string' || !PRODUCT_STATES.has(visible)) {
    throw new RangeError(`ProductPresentationFlow Product state 无效：${String(visible)}。`);
  }
  const activeValue = visible === PRODUCT_SESSION_STATE.SUSPENDED
    ? ownData(state, 'activeState', 'ProductPresentationFlow Product snapshot.state')
    : visible;
  if (typeof activeValue !== 'string' || !PRODUCT_STATES.has(activeValue)) {
    throw new RangeError(`ProductPresentationFlow Product activeState 无效：${String(activeValue)}。`);
  }
  const recoveryValue = optionalOwnData(
    state,
    'recoveryState',
    'ProductPresentationFlow Product snapshot.state',
  );
  if (
    recoveryValue !== undefined
    && recoveryValue !== null
    && (typeof recoveryValue !== 'string' || !PRODUCT_STATES.has(recoveryValue))
  ) {
    throw new RangeError('ProductPresentationFlow Product recoveryState 无效。');
  }
  return Object.freeze({
    visible,
    active: activeValue,
    recovery: recoveryValue === undefined ? null : recoveryValue as string | null,
    suspended: visible === PRODUCT_SESSION_STATE.SUSPENDED,
  });
}

function normalizeController(value: unknown): ControllerAdapter {
  const method = (name: string): ((...args: unknown[]) => unknown) => (
    snapshotMethod(value, 'ProductSessionController', name)!
  );
  const boot = method('boot');
  const openCharacterSelect = method('openCharacterSelect');
  const closeCharacterSelect = method('closeCharacterSelect');
  const selectCharacter = method('selectCharacter');
  const requestMatch = method('requestMatch');
  const requestRematch = method('requestRematch');
  const continueReward = method('continueReward');
  const dismissUnlocks = method('dismissUnlocks');
  const retry = method('retry');
  const beginMatch = method('beginMatch');
  const stepMatch = method('stepMatch');
  const getActiveMatchSnapshot = method('getActiveMatchSnapshot');
  const getSnapshot = method('getSnapshot');
  const commitReward = method('commitReward');
  const hide = method('hide');
  const renewProfileLease = method('renewProfileLease');
  const show = method('show');
  return Object.freeze({
    boot: () => boot(),
    openCharacterSelect: () => openCharacterSelect(),
    closeCharacterSelect: () => closeCharacterSelect(),
    selectCharacter: (id: string) => selectCharacter(id),
    requestMatch: () => requestMatch(),
    requestRematch: () => requestRematch(),
    continueReward: () => continueReward(),
    dismissUnlocks: () => dismissUnlocks(),
    retry: () => retry(),
    beginMatch: () => syncResult(beginMatch(), 'ProductSessionController.beginMatch()'),
    stepMatch: (input: unknown) => syncResult(
      stepMatch(input),
      'ProductSessionController.stepMatch()',
    ),
    getActiveMatchSnapshot: () => syncResult(
      getActiveMatchSnapshot(),
      'ProductSessionController.getActiveMatchSnapshot()',
    ),
    getSnapshot: () => syncResult(getSnapshot(), 'ProductSessionController.getSnapshot()'),
    commitReward: () => syncResult(commitReward(), 'ProductSessionController.commitReward()'),
    hide: () => syncResult(hide(), 'ProductSessionController.hide()'),
    renewProfileLease: () => syncResult(
      renewProfileLease(),
      'ProductSessionController.renewProfileLease()',
    ),
    show: () => syncResult(show(), 'ProductSessionController.show()'),
  });
}

function normalizeInputSource(value: unknown): ProductMatchPresentationInputPort {
  const sample = snapshotMethod(value, 'ProductPresentationFlow inputSource', 'sample')!;
  return Object.freeze({
    sample: (tick: number, options: Readonly<{ actionAffordance: unknown }>) => syncResult(
      sample(tick, options),
      'ProductPresentationFlow inputSource.sample()',
    ),
  });
}

function normalizeDispatcher(value: unknown): DispatcherAdapter {
  let dispatch: (...args: unknown[]) => unknown;
  let getSnapshot: (...args: unknown[]) => unknown;
  let destroy: (...args: unknown[]) => unknown;
  try {
    dispatch = snapshotMethod(value, 'ProductPresentationFlow intentDispatcher', 'dispatch')!;
    getSnapshot = snapshotMethod(
      value,
      'ProductPresentationFlow intentDispatcher',
      'getSnapshot',
    )!;
    destroy = snapshotMethod(value, 'ProductPresentationFlow intentDispatcher', 'destroy')!;
  } catch (error) {
    throw new TypeError('ProductPresentationFlow intentDispatcher 不符合合同。', {
      cause: normalizeThrownError(error, 'ProductPresentationFlow intentDispatcher 合同无效'),
    });
  }
  return Object.freeze({
    dispatch(intent: ProductUiIntent) {
      const operation = dispatch(intent);
      if (!(operation instanceof Promise)) {
        rejectThenable(operation, 'ProductPresentationFlow intentDispatcher.dispatch()');
        throw new TypeError('ProductPresentationFlow intentDispatcher.dispatch() 必须返回 Promise。');
      }
      return operation;
    },
    getSnapshot: () => syncResult(
      getSnapshot(),
      'ProductPresentationFlow intentDispatcher.getSnapshot()',
    ),
    destroy: () => { syncResult(destroy(), 'ProductPresentationFlow intentDispatcher.destroy()'); },
  });
}

function normalizeMatchRuntime(value: unknown): MatchRuntimeAdapter {
  let start: (...args: unknown[]) => unknown;
  let step: (...args: unknown[]) => unknown;
  let getLastMatchResult: (...args: unknown[]) => unknown;
  let getState: (...args: unknown[]) => unknown;
  let destroy: (...args: unknown[]) => unknown;
  try {
    start = snapshotMethod(value, 'ProductPresentationFlow matchRuntime', 'start')!;
    step = snapshotMethod(value, 'ProductPresentationFlow matchRuntime', 'step')!;
    getLastMatchResult = snapshotMethod(
      value,
      'ProductPresentationFlow matchRuntime',
      'getLastMatchResult',
    )!;
    getState = snapshotMethod(value, 'ProductPresentationFlow matchRuntime', 'getState')!;
    destroy = snapshotMethod(value, 'ProductPresentationFlow matchRuntime', 'destroy')!;
  } catch (error) {
    throw new TypeError('ProductPresentationFlow matchRuntime 不符合合同。', {
      cause: normalizeThrownError(error, 'ProductPresentationFlow matchRuntime 合同无效'),
    });
  }
  return Object.freeze({
    start: () => syncResult(start(), 'ProductPresentationFlow matchRuntime.start()'),
    step: () => syncResult(step(), 'ProductPresentationFlow matchRuntime.step()'),
    getLastMatchResult: () => syncResult(
      getLastMatchResult(),
      'ProductPresentationFlow matchRuntime.getLastMatchResult()',
    ),
    getState: () => {
      const state = syncResult(
        getState(),
        'ProductPresentationFlow matchRuntime.getState()',
      );
      if (typeof state !== 'string' || !MATCH_RUNTIME_STATES.has(state)) {
        throw new RangeError('ProductPresentationFlow matchRuntime state 无效。');
      }
      return state as ProductMatchPresentationRuntimeState;
    },
    destroy: () => { syncResult(destroy(), 'ProductPresentationFlow matchRuntime.destroy()'); },
  });
}

function normalizePresentationContent(value: unknown): ProductPresentationContentOptions {
  const source = ownOptions(
    value,
    PRESENTATION_CONTENT_KEYS,
    'ProductPresentationFlow presentationContent',
  );
  for (const key of ['screenRegistry', 'messageCatalog', 'contentRegistry']) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`ProductPresentationFlow presentationContent 缺少 ${key}。`);
    }
  }
  return Object.freeze({
    ...(Object.hasOwn(source, 'schemaVersion') ? { schemaVersion: source.schemaVersion as 1 } : {}),
    screenRegistry: source.screenRegistry as ProductSessionViewModelOptions['screenRegistry'],
    messageCatalog: source.messageCatalog,
    contentRegistry: source.contentRegistry as ProductSessionViewModelOptions['contentRegistry'],
  });
}

function cleanupCandidate(value: unknown, name: string): Error[] {
  const errors: Error[] = [];
  try {
    const destroy = snapshotMethod(value, name, 'destroy', false);
    if (destroy) syncResult(destroy(), `${name}.destroy()`);
  } catch (error) {
    errors.push(normalizeThrownError(error, `${name} 清理失败`));
  }
  return errors;
}

function flowFailure(error: unknown, message: string): Error {
  const cause = normalizeThrownError(error, message);
  return new Error(`${message}：${cause.message}`, { cause });
}

export class ProductPresentationFlow {
  #controller: ControllerAdapter | null;
  #inputSource: ProductMatchPresentationInputPort | null;
  #presentationContent: ProductPresentationContentOptions | null;
  #dispatcher: DispatcherAdapter | null = null;
  #matchRuntimeFactory: ((options: ProductMatchPresentationRuntimeOptions) => unknown) | null;
  #frameProjector: ((options: ProductMatchPresentationProjectorOptions) => unknown) | null;
  #matchPresentationContent: unknown;
  #matchRuntime: MatchRuntimeAdapter | null = null;
  #state: ProductPresentationFlowState = PRODUCT_PRESENTATION_FLOW_STATE.ACTIVE;
  #pendingIntent: Promise<ProductPresentationFlowSnapshot | null> | null = null;
  #pendingIntentKey: string | null = null;
  #operation: string | null = null;
  #reentryAttempted = false;
  #destroyRequested = false;
  #cleanupIncomplete = false;
  #lastMatchFrame: unknown = null;
  #lastMatchResult: ProductMatchResult | null = null;
  #lastError: Error | null = null;

  constructor(optionsValue: ProductPresentationFlowOptions) {
    const options = ownOptions(optionsValue, OPTION_KEYS, 'ProductPresentationFlow options');
    this.#controller = normalizeController(options.controller);
    this.#inputSource = normalizeInputSource(options.inputSource);
    this.#presentationContent = normalizePresentationContent(options.presentationContent);
    this.#matchPresentationContent = options.matchPresentationContent;
    const projector = requiredFunction(
      options.frameProjector,
      'ProductPresentationFlow.frameProjector',
    );
    this.#frameProjector = (projectorOptions) => syncResult(
      projector(projectorOptions),
      'ProductPresentationFlow.frameProjector()',
    );
    const runtimeFactory = options.matchRuntimeFactory === undefined
      ? (value: ProductMatchPresentationRuntimeOptions) => new ProductMatchPresentationRuntime(value)
      : requiredFunction(
        options.matchRuntimeFactory,
        'ProductPresentationFlow.matchRuntimeFactory',
      );
    this.#matchRuntimeFactory = (value) => syncResult(
      runtimeFactory(value),
      'ProductPresentationFlow.matchRuntimeFactory()',
    );
    const dispatcherFactory = options.intentDispatcherFactory === undefined
      ? (value: Readonly<{ controller: ProductSessionControllerPresentationPort }>) => (
        new ProductSessionIntentDispatcher(value)
      )
      : requiredFunction(
        options.intentDispatcherFactory,
        'ProductPresentationFlow.intentDispatcherFactory',
      );
    let candidate: unknown = null;
    try {
      candidate = syncResult(
        dispatcherFactory({ controller: this.#controller }),
        'ProductPresentationFlow.intentDispatcherFactory()',
      );
      this.#dispatcher = normalizeDispatcher(candidate);
    } catch (error) {
      throw combineCleanupFailure(
        normalizeThrownError(error, 'ProductPresentationFlow 构造失败'),
        cleanupCandidate(candidate, '无效 ProductPresentationFlow intentDispatcher'),
        'ProductPresentationFlow 构造失败且清理未完整完成。',
      );
    }
    Object.freeze(this);
  }

  get state(): ProductPresentationFlowState {
    return this.#state;
  }

  getState(): ProductPresentationFlowState {
    return this.#state;
  }

  #assertUsable(): void {
    if (this.#destroyRequested || this.#state === PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED) {
      throw new Error('ProductPresentationFlow 已销毁。');
    }
    if (this.#state === PRODUCT_PRESENTATION_FLOW_STATE.FAILED) {
      throw new Error('ProductPresentationFlow 已失败关闭。', { cause: this.#lastError });
    }
  }

  #enter(operation: string): void {
    if (this.#operation !== null) {
      this.#reentryAttempted = true;
      throw new Error(`ProductPresentationFlow ${this.#operation} 期间不能执行 ${operation}。`);
    }
    this.#operation = operation;
    this.#reentryAttempted = false;
  }

  #assertNoSwallowedReentry(): void {
    if (this.#reentryAttempted) {
      throw new Error('ProductPresentationFlow 检测到被宿主吞掉的重入异常。');
    }
  }

  #leave(): void {
    this.#operation = null;
    this.#reentryAttempted = false;
  }

  #run<T>(operation: string, callback: () => T): T {
    this.#enter(operation);
    try {
      const result = callback();
      this.#assertNoSwallowedReentry();
      return result;
    } finally {
      this.#leave();
    }
  }

  #fail(error: unknown, message: string): Error {
    this.#lastError = flowFailure(error, message);
    this.#state = PRODUCT_PRESENTATION_FLOW_STATE.FAILED;
    return this.#lastError;
  }

  #requireController(): ControllerAdapter {
    if (this.#controller === null) throw new Error('ProductSessionController 已释放。');
    return this.#controller;
  }

  #controllerSnapshot(): unknown {
    const snapshot = this.#requireController().getSnapshot();
    this.#assertNoSwallowedReentry();
    return snapshot;
  }

  #disposeMatchRuntime(): void {
    const runtime = this.#matchRuntime;
    if (runtime === null) return;
    runtime.destroy();
    this.#matchRuntime = null;
    this.#assertNoSwallowedReentry();
  }

  #createAndStartMatch(): void {
    const factory = this.#matchRuntimeFactory;
    const projector = this.#frameProjector;
    const controller = this.#requireController();
    const inputSource = this.#inputSource;
    if (factory === null || projector === null || inputSource === null) {
      throw new Error('ProductPresentationFlow Match 表现能力已释放。');
    }
    let candidate: unknown = null;
    try {
      candidate = factory({
        controller,
        inputSource,
        content: this.#matchPresentationContent,
        frameProjector: projector,
      });
      this.#assertNoSwallowedReentry();
      const runtime = normalizeMatchRuntime(candidate);
      const frame = runtime.start();
      this.#assertNoSwallowedReentry();
      this.#matchRuntime = runtime;
      candidate = null;
      this.#lastMatchFrame = frame;
      this.#lastMatchResult = null;
    } catch (error) {
      throw combineCleanupFailure(
        normalizeThrownError(error, 'Product match 表现创建失败'),
        cleanupCandidate(candidate, 'Match 表现候选'),
        'Product match 表现创建失败且清理未完整完成。',
      );
    }
  }

  #captureResult(snapshotValue: unknown): void {
    const runtime = this.#matchRuntime;
    const runtimeValue = runtime === null ? null : runtime.getLastMatchResult();
    this.#assertNoSwallowedReentry();
    const snapshot = assertPlainRecord(snapshotValue, 'ProductPresentationFlow Product snapshot');
    const matchValue = optionalOwnData(snapshot, 'match', 'ProductPresentationFlow Product snapshot');
    const match = matchValue === null || matchValue === undefined
      ? null
      : assertPlainRecord(matchValue, 'ProductPresentationFlow Product snapshot.match');
    const productValue = match === null
      ? null
      : optionalOwnData(match, 'result', 'ProductPresentationFlow Product snapshot.match') ?? null;
    if (runtimeValue === null && productValue === null) {
      throw new Error('Product results 缺少可展示的权威结果。');
    }
    const runtimeResult = runtimeValue === null
      ? null
      : validateProductMatchResult(runtimeValue);
    const productResult = productValue === null
      ? null
      : validateProductMatchResult(productValue);
    if (
      runtimeResult !== null
      && productResult !== null
      && runtimeResult.authorityHash !== productResult.authorityHash
    ) throw new RangeError('Product 与 Match 表现结果不一致。');
    this.#lastMatchResult = runtimeResult ?? productResult;
  }

  #synchronizeInternal(): ProductPresentationFlowSnapshot {
    let snapshot = this.#controllerSnapshot();
    const initialState = stateView(snapshot);
    if (initialState.suspended) return this.#buildSnapshotView(snapshot);

    if (initialState.active === PRODUCT_SESSION_STATE.PREPARING) {
      if (this.#matchRuntime !== null) {
        throw new Error('Product preparing 时已存在 MatchPresentationRuntime。');
      }
      this.#createAndStartMatch();
      snapshot = this.#controllerSnapshot();
      if (stateView(snapshot).active !== PRODUCT_SESSION_STATE.IN_MATCH) {
        throw new Error('Product match 表现启动后未进入 in-match。');
      }
    } else if (initialState.active === PRODUCT_SESSION_STATE.RESULTS) {
      this.#captureResult(snapshot);
      snapshot = this.#requireController().commitReward();
      this.#assertNoSwallowedReentry();
      const afterRewardState = stateView(snapshot).active;
      if (
        afterRewardState === PRODUCT_SESSION_STATE.REWARD
        || afterRewardState === PRODUCT_SESSION_STATE.FATAL_ERROR
      ) {
        this.#disposeMatchRuntime();
      } else if (afterRewardState !== PRODUCT_SESSION_STATE.RECOVERABLE_ERROR) {
        throw new Error(`Product reward 提交后进入未知状态 ${afterRewardState}。`);
      }
    } else if (initialState.active === PRODUCT_SESSION_STATE.RECOVERABLE_ERROR) {
      if (initialState.recovery !== PRODUCT_SESSION_STATE.RESULTS && this.#matchRuntime !== null) {
        this.#disposeMatchRuntime();
      }
    } else if (
      initialState.active === PRODUCT_SESSION_STATE.FATAL_ERROR
      || initialState.active === PRODUCT_SESSION_STATE.DESTROYED
    ) {
      this.#disposeMatchRuntime();
    } else if (initialState.active === PRODUCT_SESSION_STATE.READY) {
      if (this.#matchRuntime !== null) {
        throw new Error('Product ready 时仍持有 MatchPresentationRuntime。');
      }
      this.#lastMatchFrame = null;
      this.#lastMatchResult = null;
    } else if (
      initialState.active === PRODUCT_SESSION_STATE.IN_MATCH
      && this.#matchRuntime === null
    ) {
      throw new Error('Product in-match 缺少 MatchPresentationRuntime。');
    }
    this.#lastError = null;
    return this.#buildSnapshotView(snapshot);
  }

  #recoverSynchronizationFailure(error: unknown): ProductPresentationFlowSnapshot {
    let productSnapshot: unknown;
    let currentState: ReturnType<typeof stateView>;
    try {
      productSnapshot = this.#controllerSnapshot();
      currentState = stateView(productSnapshot);
    } catch (inspectionError) {
      const combined = combineCleanupFailure(
        normalizeThrownError(error, 'ProductPresentationFlow 同步失败'),
        [normalizeThrownError(inspectionError, 'Product 状态复验失败')],
        'ProductPresentationFlow 同步失败且状态无法复验。',
      );
      throw this.#fail(combined, 'ProductPresentationFlow 同步失败');
    }
    if (
      currentState.active !== PRODUCT_SESSION_STATE.RECOVERABLE_ERROR
      && currentState.active !== PRODUCT_SESSION_STATE.FATAL_ERROR
    ) throw this.#fail(error, 'ProductPresentationFlow 同步失败');
    try {
      if (
        currentState.active === PRODUCT_SESSION_STATE.FATAL_ERROR
        || currentState.recovery !== PRODUCT_SESSION_STATE.RESULTS
      ) this.#disposeMatchRuntime();
      return this.#buildSnapshotView(productSnapshot);
    } catch (cleanupError) {
      const combined = combineCleanupFailure(
        normalizeThrownError(error, 'ProductPresentationFlow 同步失败'),
        [normalizeThrownError(cleanupError, 'Match 表现清理失败')],
        'ProductPresentationFlow 同步失败且清理未完整完成。',
      );
      throw this.#fail(combined, 'ProductPresentationFlow 同步失败');
    }
  }

  synchronize(): ProductPresentationFlowSnapshot {
    return this.#run('synchronize', () => {
      this.#assertUsable();
      try {
        return this.#synchronizeInternal();
      } catch (error) {
        return this.#recoverSynchronizationFailure(error);
      }
    });
  }

  start(): Promise<ProductPresentationFlowSnapshot | null> {
    return this.dispatch({ id: PRODUCT_UI_INTENT_ID.BOOT });
  }

  dispatch(intentValue: unknown): Promise<ProductPresentationFlowSnapshot | null> {
    let intent: ProductUiIntent;
    let key: string;
    try {
      this.#assertUsable();
      intent = createProductUiIntent(intentValue);
      key = createProductUiIntentKey(intent);
    } catch (error) {
      return Promise.reject(error);
    }
    if (this.#pendingIntent !== null) {
      if (this.#pendingIntentKey === key) return this.#pendingIntent;
      return Promise.reject(new Error('已有 ProductPresentationFlow intent 正在处理。'));
    }
    let dispatched: Promise<unknown>;
    try {
      dispatched = this.#run('dispatch', () => {
        const dispatcher = this.#dispatcher;
        if (dispatcher === null) throw new Error('ProductPresentationFlow dispatcher 已释放。');
        const operation = dispatcher.dispatch(intent);
        this.#assertNoSwallowedReentry();
        return operation;
      });
    } catch (error) {
      return Promise.reject(this.#fail(error, 'ProductPresentationFlow intent 分派失败'));
    }
    const operation: Promise<ProductPresentationFlowSnapshot | null> = dispatched
      .then(() => {
        if (this.#destroyRequested || this.#state === PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED) {
          return null;
        }
        return this.synchronize();
      })
      .finally(() => {
        if (this.#pendingIntent === operation) {
          this.#pendingIntent = null;
          this.#pendingIntentKey = null;
        }
      });
    this.#pendingIntentKey = key;
    this.#pendingIntent = operation;
    return operation;
  }

  stepMatch(): ProductPresentationFlowSnapshot {
    return this.#run('stepMatch', () => {
      this.#assertUsable();
      const runtime = this.#matchRuntime;
      if (runtime === null) {
        throw new Error('ProductPresentationFlow 缺少 MatchPresentationRuntime。');
      }
      let suspended: boolean;
      try {
        suspended = stateView(this.#controllerSnapshot()).suspended;
      } catch (error) {
        throw this.#fail(error, 'ProductPresentationFlow Match step 前置复验失败');
      }
      if (suspended) {
        throw new Error('ProductPresentationFlow 挂起时不能 step。');
      }
      try {
        this.#lastMatchFrame = runtime.step();
        this.#assertNoSwallowedReentry();
      } catch (error) {
        return this.#recoverSynchronizationFailure(error);
      }
      try {
        return this.#synchronizeInternal();
      } catch (error) {
        return this.#recoverSynchronizationFailure(error);
      }
    });
  }

  heartbeat(): Readonly<{ renewed: boolean; snapshot: ProductPresentationFlowSnapshot }> {
    return this.#run('heartbeat', () => {
      this.#assertUsable();
      let renewed: boolean;
      try {
        const outcome = assertPlainRecord(
          this.#requireController().renewProfileLease(),
          'ProductPresentationFlow lease outcome',
        );
        this.#assertNoSwallowedReentry();
        const renewedValue = ownData(outcome, 'renewed', 'ProductPresentationFlow lease outcome');
        if (typeof renewedValue !== 'boolean') {
          throw new TypeError('ProductPresentationFlow lease outcome.renewed 必须是 boolean。');
        }
        renewed = renewedValue;
      } catch (error) {
        return Object.freeze({
          renewed: false,
          snapshot: this.#recoverSynchronizationFailure(error),
        });
      }
      let snapshot: ProductPresentationFlowSnapshot;
      try {
        snapshot = this.#synchronizeInternal();
      } catch (error) {
        snapshot = this.#recoverSynchronizationFailure(error);
      }
      return Object.freeze({ renewed, snapshot });
    });
  }

  hide(): ProductPresentationFlowSnapshot {
    return this.#run('hide', () => {
      this.#assertUsable();
      try {
        this.#requireController().hide();
        this.#assertNoSwallowedReentry();
      } catch (error) {
        return this.#recoverSynchronizationFailure(error);
      }
      try {
        return this.#synchronizeInternal();
      } catch (error) {
        return this.#recoverSynchronizationFailure(error);
      }
    });
  }

  show(): ProductPresentationFlowSnapshot {
    return this.#run('show', () => {
      this.#assertUsable();
      try {
        this.#requireController().show();
        this.#assertNoSwallowedReentry();
      } catch (error) {
        return this.#recoverSynchronizationFailure(error);
      }
      try {
        return this.#synchronizeInternal();
      } catch (error) {
        return this.#recoverSynchronizationFailure(error);
      }
    });
  }

  #buildSnapshotView(productSnapshot: unknown | null): ProductPresentationFlowSnapshot {
    const content = this.#presentationContent;
    const viewModel = productSnapshot === null || content === null
      ? null
      : createProductSessionViewModel(productSnapshot, {
        ...content,
        lastMatchResult: this.#lastMatchResult,
      });
    const runtimeState = this.#matchRuntime === null ? null : this.#matchRuntime.getState();
    this.#assertNoSwallowedReentry();
    return Object.freeze({
      state: this.#state,
      pendingIntent: this.#pendingIntent !== null,
      pendingIntentKey: this.#pendingIntentKey,
      synchronizing: this.#operation === 'synchronize',
      stepping: this.#operation === 'stepMatch',
      cleanupIncomplete: this.#cleanupIncomplete,
      viewModel,
      matchFrame: this.#lastMatchFrame,
      hasMatchRuntime: this.#matchRuntime !== null,
      matchRuntimeState: runtimeState,
      failed: this.#lastError !== null,
    });
  }

  #snapshotView(): ProductPresentationFlowSnapshot {
    const productSnapshot = this.#controller === null ? null : this.#controllerSnapshot();
    return this.#buildSnapshotView(productSnapshot);
  }

  getSnapshot(): ProductPresentationFlowSnapshot {
    return this.#run('getSnapshot', () => this.#snapshotView());
  }

  destroy(): void {
    if (
      this.#state === PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED
      && this.#dispatcher === null
      && this.#matchRuntime === null
    ) return;
    this.#enter('destroy');
    const errors: Error[] = [];
    try {
      this.#destroyRequested = true;
      this.#controller = null;
      this.#inputSource = null;
      this.#presentationContent = null;
      this.#matchRuntimeFactory = null;
      this.#frameProjector = null;
      this.#matchPresentationContent = null;
      this.#lastMatchFrame = null;
      this.#lastMatchResult = null;
      try { this.#disposeMatchRuntime(); } catch (error) {
        errors.push(normalizeThrownError(error, 'ProductPresentationFlow Match 清理失败'));
      }
      const dispatcher = this.#dispatcher;
      if (dispatcher !== null) {
        try {
          dispatcher.destroy();
          this.#dispatcher = null;
          this.#assertNoSwallowedReentry();
        } catch (error) {
          errors.push(normalizeThrownError(error, 'ProductPresentationFlow Dispatcher 清理失败'));
        }
      }
      this.#cleanupIncomplete = errors.length > 0;
      if (errors.length > 0) {
        const failure = combineCleanupFailure(
          new Error('ProductPresentationFlow 清理未完整完成。'),
          errors,
          'ProductPresentationFlow 清理未完整完成。',
        );
        this.#lastError = failure;
        this.#state = PRODUCT_PRESENTATION_FLOW_STATE.FAILED;
        throw failure;
      }
      this.#lastError = null;
      this.#state = PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED;
    } finally {
      this.#cleanupIncomplete = errors.length > 0;
      this.#leave();
    }
  }
}
