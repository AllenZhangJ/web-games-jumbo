import {
  assertPlainRecord,
  combineCleanupFailure,
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
    throw new RangeError('ProductPresentationFlow Product state 无效。');
  }
  const activeValue = visible === PRODUCT_SESSION_STATE.SUSPENDED
    ? ownData(state, 'activeState', 'ProductPresentationFlow Product snapshot.state')
    : visible;
  if (typeof activeValue !== 'string' || !PRODUCT_STATES.has(activeValue)) {
    throw new RangeError('ProductPresentationFlow Product activeState 无效。');
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
  const beginMatchWithReadFrame = method('beginMatchWithReadFrame');
  const stepMatchWithReadFrame = method('stepMatchWithReadFrame');
  const getActiveMatchReadFrame = method('getActiveMatchReadFrame');
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
    beginMatchWithReadFrame: () => syncResult(
      beginMatchWithReadFrame(),
      'ProductSessionController.beginMatchWithReadFrame()',
    ),
    stepMatchWithReadFrame: (input: unknown) => syncResult(
      stepMatchWithReadFrame(input),
      'ProductSessionController.stepMatchWithReadFrame()',
    ),
    getActiveMatchReadFrame: () => syncResult(
      getActiveMatchReadFrame(),
      'ProductSessionController.getActiveMatchReadFrame()',
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
    sample: (tick: number, options: Readonly<{
      eventSequence: number;
      localActionSidecar: unknown;
    }>) => syncResult(
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
      cause: safelyWrapThrownError(error, 'ProductPresentationFlow intentDispatcher 合同无效'),
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
      cause: safelyWrapThrownError(error, 'ProductPresentationFlow matchRuntime 合同无效'),
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

function attachOpaqueCause(failure: Error, error: unknown): Error {
  try {
    Object.defineProperty(failure, 'cause', {
      value: error,
      enumerable: false,
      configurable: true,
      writable: false,
    });
  } catch {
    // Caller-thrown values are opaque; error reporting must not execute them.
  }
  return failure;
}

function safelyWrapThrownError(error: unknown, message: string): Error {
  return attachOpaqueCause(new Error(message), error);
}

function staticThrownMessage(error: unknown, fallback: string): string {
  if ((typeof error !== 'object' || error === null) && typeof error !== 'function') {
    return fallback;
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, 'message');
    return descriptor
      && Object.hasOwn(descriptor, 'value')
      && typeof descriptor.value === 'string'
      ? descriptor.value
      : fallback;
  } catch {
    return fallback;
  }
}

function cleanupCandidate(value: unknown, name: string): Error[] {
  const errors: Error[] = [];
  try {
    const destroy = snapshotMethod(value, name, 'destroy', false);
    if (destroy) syncResult(destroy(), `${name}.destroy()`);
  } catch (error) {
    errors.push(safelyWrapThrownError(error, `${name} 清理失败`));
  }
  return errors;
}

type ProductPresentationFlowOperation =
  | 'synchronize'
  | 'dispatch'
  | 'intent-settlement'
  | 'stepMatch'
  | 'heartbeat'
  | 'hide'
  | 'show'
  | 'state-read'
  | 'snapshot-read'
  | 'destroy';

export class ProductPresentationFlow {
  #controller: ControllerAdapter | null;
  #inputSource: ProductMatchPresentationInputPort | null;
  #presentationContent: ProductPresentationContentOptions | null;
  #dispatcher: DispatcherAdapter | null = null;
  #matchRuntimeFactory: ((options: ProductMatchPresentationRuntimeOptions) => unknown) | null;
  #frameProjector: ((options: ProductMatchPresentationProjectorOptions) => unknown) | null;
  #matchPresentationContent: unknown;
  #matchRuntime: MatchRuntimeAdapter | null = null;
  #pendingMatchRuntimeCandidate: unknown = null;
  #state: ProductPresentationFlowState = PRODUCT_PRESENTATION_FLOW_STATE.ACTIVE;
  #pendingIntent: Promise<ProductPresentationFlowSnapshot | null> | null = null;
  #pendingIntentKey: string | null = null;
  #operation: ProductPresentationFlowOperation | null = null;
  #operationSequence = 0;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
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
        safelyWrapThrownError(error, 'ProductPresentationFlow intentDispatcher 不符合合同'),
        cleanupCandidate(candidate, '无效 ProductPresentationFlow intentDispatcher'),
        'ProductPresentationFlow 构造失败且清理未完整完成。',
      );
    }
    Object.freeze(this);
  }

  get state(): ProductPresentationFlowState {
    return this.#run('state-read', () => this.#state);
  }

  getState(): ProductPresentationFlowState {
    return this.#run('state-read', () => this.#state);
  }

  #assertUsable(): void {
    if (this.#destroyRequested || this.#state === PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED) {
      throw new Error('ProductPresentationFlow 已销毁。');
    }
    if (this.#state === PRODUCT_PRESENTATION_FLOW_STATE.FAILED) {
      throw new Error('ProductPresentationFlow 已失败关闭。', { cause: this.#lastError });
    }
  }

  #beginOperation(operation: ProductPresentationFlowOperation): number {
    if (this.#operation !== null) {
      this.#reentrySequence += 1;
      this.#reentryError ??= new Error(
        `ProductPresentationFlow.${operation}() 不可重入；当前正在 ${this.#operation}()。`,
      );
      throw this.#reentryError;
    }
    this.#operation = operation;
    this.#operationSequence += 1;
    this.#reentryError = null;
    return this.#operationSequence;
  }

  #assertCurrentOperationCommit(sequence: number, label: string): void {
    if (this.#operation === null || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前ProductPresentationFlow操作所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #finishOperation(sequence: number): void {
    const operation = this.#operation;
    const ownershipError = operation === null || this.#operationSequence !== sequence
      ? new Error('ProductPresentationFlow操作所有权在结束前已失效。')
      : null;
    const reentryError = this.#reentryError;
    let reentryFailure: Error | null = null;
    if (reentryError !== null) {
      reentryFailure = new Error(
        `ProductPresentationFlow.${operation ?? 'operation'}() 检测到宿主重入并已失败关闭。`,
        { cause: reentryError },
      );
      this.#lastError = reentryFailure;
      if (this.#state !== PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED) {
        this.#state = PRODUCT_PRESENTATION_FLOW_STATE.FAILED;
      }
      if (operation === 'destroy') this.#cleanupIncomplete = true;
    }
    this.#operation = null;
    this.#reentryError = null;
    if (ownershipError !== null) throw ownershipError;
    if (reentryFailure !== null) throw reentryFailure;
  }

  #run<T>(operation: ProductPresentationFlowOperation, callback: (sequence: number) => T): T {
    const sequence = this.#beginOperation(operation);
    try {
      const result = callback(sequence);
      this.#assertCurrentOperationCommit(sequence, `ProductPresentationFlow ${operation}`);
      return result;
    } finally {
      this.#finishOperation(sequence);
    }
  }

  #fail(error: unknown, message: string): Error {
    const failure = new Error(message);
    this.#lastError = failure;
    this.#state = PRODUCT_PRESENTATION_FLOW_STATE.FAILED;
    return attachOpaqueCause(failure, error);
  }

  #requireController(): ControllerAdapter {
    if (this.#controller === null) throw new Error('ProductSessionController 已释放。');
    return this.#controller;
  }

  #controllerSnapshot(sequence: number): unknown {
    const snapshot = this.#requireController().getSnapshot();
    this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow controller snapshot');
    return snapshot;
  }

  #disposeMatchRuntime(sequence: number): void {
    const runtime = this.#matchRuntime;
    if (runtime === null) return;
    runtime.destroy();
    this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow match runtime destroy');
    this.#matchRuntime = null;
  }

  #disposePendingMatchRuntimeCandidate(sequence: number): Error[] {
    const candidate = this.#pendingMatchRuntimeCandidate;
    if (candidate === null) return [];
    const errors = cleanupCandidate(candidate, 'Match 表现候选');
    this.#assertCurrentOperationCommit(
      sequence,
      'ProductPresentationFlow pending match runtime cleanup',
    );
    if (errors.length === 0) this.#pendingMatchRuntimeCandidate = null;
    return errors;
  }

  #createAndStartMatch(sequence: number): void {
    const factory = this.#matchRuntimeFactory;
    const projector = this.#frameProjector;
    const controller = this.#requireController();
    const inputSource = this.#inputSource;
    if (factory === null || projector === null || inputSource === null) {
      throw new Error('ProductPresentationFlow Match 表现能力已释放。');
    }
    try {
      const candidate = factory({
        controller,
        inputSource,
        content: this.#matchPresentationContent,
        frameProjector: projector,
      });
      this.#pendingMatchRuntimeCandidate = candidate;
      this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow match runtime factory');
      const runtime = normalizeMatchRuntime(candidate);
      this.#matchRuntime = runtime;
      this.#pendingMatchRuntimeCandidate = null;
      const frame = runtime.start();
      this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow match runtime start');
      this.#lastMatchFrame = frame;
      this.#lastMatchResult = null;
    } catch (error) {
      const cleanupErrors: Error[] = [];
      if (this.#reentryError === null) {
        if (this.#matchRuntime !== null) {
          try { this.#disposeMatchRuntime(sequence); } catch (cleanupError) {
            cleanupErrors.push(safelyWrapThrownError(
              cleanupError,
              'Match 表现Runtime回滚失败',
            ));
          }
        }
        if (this.#reentryError === null && this.#pendingMatchRuntimeCandidate !== null) {
          try {
            cleanupErrors.push(...this.#disposePendingMatchRuntimeCandidate(sequence));
          } catch (cleanupError) {
            cleanupErrors.push(safelyWrapThrownError(
              cleanupError,
              'Match 表现候选回滚边界失败',
            ));
          }
        }
      }
      throw combineCleanupFailure(
        safelyWrapThrownError(error, 'ProductPresentationFlow matchRuntime 不符合合同'),
        cleanupErrors,
        'Product match 表现创建失败且清理未完整完成。',
      );
    }
  }

  #captureResult(sequence: number, snapshotValue: unknown): void {
    const runtime = this.#matchRuntime;
    const runtimeValue = runtime === null ? null : runtime.getLastMatchResult();
    this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow match result read');
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
    this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow match result validation');
    this.#lastMatchResult = runtimeResult ?? productResult;
  }

  #synchronizeInternal(sequence: number): ProductPresentationFlowSnapshot {
    let snapshot = this.#controllerSnapshot(sequence);
    const initialState = stateView(snapshot);
    if (initialState.suspended) return this.#buildSnapshotView(sequence, snapshot);

    if (initialState.active === PRODUCT_SESSION_STATE.PREPARING) {
      if (this.#matchRuntime !== null) {
        throw new Error('Product preparing 时已存在 MatchPresentationRuntime。');
      }
      this.#createAndStartMatch(sequence);
      snapshot = this.#controllerSnapshot(sequence);
      if (stateView(snapshot).active !== PRODUCT_SESSION_STATE.IN_MATCH) {
        throw new Error('Product match 表现启动后未进入 in-match。');
      }
    } else if (initialState.active === PRODUCT_SESSION_STATE.RESULTS) {
      this.#captureResult(sequence, snapshot);
      snapshot = this.#requireController().commitReward();
      this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow reward commit');
      const afterRewardState = stateView(snapshot).active;
      if (
        afterRewardState === PRODUCT_SESSION_STATE.REWARD
        || afterRewardState === PRODUCT_SESSION_STATE.FATAL_ERROR
      ) {
        this.#disposeMatchRuntime(sequence);
      } else if (afterRewardState !== PRODUCT_SESSION_STATE.RECOVERABLE_ERROR) {
        throw new Error(`Product reward 提交后进入未知状态 ${afterRewardState}。`);
      }
    } else if (initialState.active === PRODUCT_SESSION_STATE.RECOVERABLE_ERROR) {
      if (initialState.recovery !== PRODUCT_SESSION_STATE.RESULTS && this.#matchRuntime !== null) {
        this.#disposeMatchRuntime(sequence);
      }
    } else if (
      initialState.active === PRODUCT_SESSION_STATE.FATAL_ERROR
      || initialState.active === PRODUCT_SESSION_STATE.DESTROYED
    ) {
      this.#disposeMatchRuntime(sequence);
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
    return this.#buildSnapshotView(sequence, snapshot);
  }

  #recoverSynchronizationFailure(
    sequence: number,
    error: unknown,
  ): ProductPresentationFlowSnapshot {
    if (this.#reentryError !== null) {
      throw this.#fail(this.#reentryError, 'ProductPresentationFlow 同步期间发生重入');
    }
    let productSnapshot: unknown;
    let currentState: ReturnType<typeof stateView>;
    try {
      productSnapshot = this.#controllerSnapshot(sequence);
      currentState = stateView(productSnapshot);
    } catch (inspectionError) {
      const combined = combineCleanupFailure(
        safelyWrapThrownError(error, 'ProductPresentationFlow 同步失败'),
        [safelyWrapThrownError(inspectionError, 'Product 状态复验失败')],
        'ProductPresentationFlow 同步失败且状态无法复验。',
      );
      throw this.#fail(combined, 'ProductPresentationFlow 同步失败');
    }
    if (
      currentState.active !== PRODUCT_SESSION_STATE.RECOVERABLE_ERROR
      && currentState.active !== PRODUCT_SESSION_STATE.FATAL_ERROR
    ) {
      const detail = staticThrownMessage(error, '');
      throw this.#fail(
        error,
        detail === 'ProductPresentationFlow matchRuntime 不符合合同'
          ? detail
          : 'ProductPresentationFlow 同步失败',
      );
    }
    try {
      if (
        currentState.active === PRODUCT_SESSION_STATE.FATAL_ERROR
        || currentState.recovery !== PRODUCT_SESSION_STATE.RESULTS
      ) this.#disposeMatchRuntime(sequence);
      return this.#buildSnapshotView(sequence, productSnapshot);
    } catch (cleanupError) {
      const combined = combineCleanupFailure(
        safelyWrapThrownError(error, 'ProductPresentationFlow 同步失败'),
        [safelyWrapThrownError(cleanupError, 'Match 表现清理失败')],
        'ProductPresentationFlow 同步失败且清理未完整完成。',
      );
      throw this.#fail(combined, 'ProductPresentationFlow 同步失败');
    }
  }

  synchronize(): ProductPresentationFlowSnapshot {
    return this.#run('synchronize', (sequence) => {
      this.#assertUsable();
      try {
        return this.#synchronizeInternal(sequence);
      } catch (error) {
        return this.#recoverSynchronizationFailure(sequence, error);
      }
    });
  }

  start(): Promise<ProductPresentationFlowSnapshot | null> {
    return this.dispatch({ id: PRODUCT_UI_INTENT_ID.BOOT });
  }

  dispatch(intentValue: unknown): Promise<ProductPresentationFlowSnapshot | null> {
    let dispatchStarted = false;
    try {
      return this.#run('dispatch', (sequence) => {
        this.#assertUsable();
        const intent: ProductUiIntent = createProductUiIntent(intentValue);
        const key = createProductUiIntentKey(intent);
        this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow intent validation');
        if (this.#pendingIntent !== null) {
          if (this.#pendingIntentKey === key) return this.#pendingIntent;
          throw new Error('已有 ProductPresentationFlow intent 正在处理。');
        }
        const dispatcher = this.#dispatcher;
        if (dispatcher === null) throw new Error('ProductPresentationFlow dispatcher 已释放。');
        dispatchStarted = true;
        const dispatched = dispatcher.dispatch(intent);
        this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow intent dispatch');
        const operation: Promise<ProductPresentationFlowSnapshot | null> = dispatched
          .then(() => {
            if (this.#destroyRequested || this.#state === PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED) {
              return null;
            }
            return this.synchronize();
          })
          .finally(() => {
            try {
              this.#run('intent-settlement', () => {
                if (this.#pendingIntent === operation) {
                  this.#pendingIntent = null;
                  this.#pendingIntentKey = null;
                }
              });
            } catch (error) {
              if (this.#state !== PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED) {
                this.#lastError = safelyWrapThrownError(
                  error,
                  'ProductPresentationFlow intent settlement 失败',
                );
                this.#state = PRODUCT_PRESENTATION_FLOW_STATE.FAILED;
              }
            }
          });
        this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow pending intent publication');
        this.#pendingIntentKey = key;
        this.#pendingIntent = operation;
        return operation;
      });
    } catch (error) {
      if (dispatchStarted && this.#state !== PRODUCT_PRESENTATION_FLOW_STATE.FAILED) {
        return Promise.reject(this.#fail(error, 'ProductPresentationFlow intent 分派失败'));
      }
      return Promise.reject(
        this.#state === PRODUCT_PRESENTATION_FLOW_STATE.FAILED && this.#lastError !== null
          ? this.#lastError
          : error,
      );
    }
  }

  stepMatch(): ProductPresentationFlowSnapshot {
    return this.#run('stepMatch', (sequence) => {
      this.#assertUsable();
      const runtime = this.#matchRuntime;
      if (runtime === null) {
        throw new Error('ProductPresentationFlow 缺少 MatchPresentationRuntime。');
      }
      let suspended: boolean;
      try {
        suspended = stateView(this.#controllerSnapshot(sequence)).suspended;
      } catch (error) {
        throw this.#fail(error, 'ProductPresentationFlow Match step 前置复验失败');
      }
      if (suspended) {
        throw new Error('ProductPresentationFlow 挂起时不能 step。');
      }
      try {
        const frame = runtime.step();
        this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow match step');
        this.#lastMatchFrame = frame;
      } catch (error) {
        return this.#recoverSynchronizationFailure(sequence, error);
      }
      try {
        return this.#synchronizeInternal(sequence);
      } catch (error) {
        return this.#recoverSynchronizationFailure(sequence, error);
      }
    });
  }

  heartbeat(): Readonly<{ renewed: boolean; snapshot: ProductPresentationFlowSnapshot }> {
    return this.#run('heartbeat', (sequence) => {
      this.#assertUsable();
      let renewed: boolean;
      try {
        const outcome = assertPlainRecord(
          this.#requireController().renewProfileLease(),
          'ProductPresentationFlow lease outcome',
        );
        this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow lease renewal');
        const renewedValue = ownData(outcome, 'renewed', 'ProductPresentationFlow lease outcome');
        if (typeof renewedValue !== 'boolean') {
          throw new TypeError('ProductPresentationFlow lease outcome.renewed 必须是 boolean。');
        }
        renewed = renewedValue;
      } catch (error) {
        return Object.freeze({
          renewed: false,
          snapshot: this.#recoverSynchronizationFailure(sequence, error),
        });
      }
      let snapshot: ProductPresentationFlowSnapshot;
      try {
        snapshot = this.#synchronizeInternal(sequence);
      } catch (error) {
        snapshot = this.#recoverSynchronizationFailure(sequence, error);
      }
      return Object.freeze({ renewed, snapshot });
    });
  }

  hide(): ProductPresentationFlowSnapshot {
    return this.#run('hide', (sequence) => {
      this.#assertUsable();
      try {
        this.#requireController().hide();
        this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow hide');
      } catch (error) {
        return this.#recoverSynchronizationFailure(sequence, error);
      }
      try {
        return this.#synchronizeInternal(sequence);
      } catch (error) {
        return this.#recoverSynchronizationFailure(sequence, error);
      }
    });
  }

  show(): ProductPresentationFlowSnapshot {
    return this.#run('show', (sequence) => {
      this.#assertUsable();
      try {
        this.#requireController().show();
        this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow show');
      } catch (error) {
        return this.#recoverSynchronizationFailure(sequence, error);
      }
      try {
        return this.#synchronizeInternal(sequence);
      } catch (error) {
        return this.#recoverSynchronizationFailure(sequence, error);
      }
    });
  }

  #buildSnapshotView(
    sequence: number,
    productSnapshot: unknown | null,
  ): ProductPresentationFlowSnapshot {
    const content = this.#presentationContent;
    const viewModel = productSnapshot === null || content === null
      ? null
      : createProductSessionViewModel(productSnapshot, {
        ...content,
        lastMatchResult: this.#lastMatchResult,
      });
    this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow view model');
    const runtimeState = this.#matchRuntime === null ? null : this.#matchRuntime.getState();
    this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow match runtime state');
    const snapshot = Object.freeze({
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
    this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow snapshot publication');
    return snapshot;
  }

  #snapshotView(sequence: number): ProductPresentationFlowSnapshot {
    const productSnapshot = this.#controller === null ? null : this.#controllerSnapshot(sequence);
    return this.#buildSnapshotView(sequence, productSnapshot);
  }

  getSnapshot(): ProductPresentationFlowSnapshot {
    return this.#run('snapshot-read', (sequence) => this.#snapshotView(sequence));
  }

  destroy(): void {
    this.#run('destroy', (sequence) => {
      if (
        this.#state === PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED
        && this.#dispatcher === null
        && this.#matchRuntime === null
        && this.#pendingMatchRuntimeCandidate === null
      ) return;
      this.#destroyRequested = true;
      const errors: Error[] = [];
      try { this.#disposeMatchRuntime(sequence); } catch (error) {
        errors.push(safelyWrapThrownError(error, 'ProductPresentationFlow Match 清理失败'));
      }
      if (this.#reentryError === null && this.#pendingMatchRuntimeCandidate !== null) {
        try {
          errors.push(...this.#disposePendingMatchRuntimeCandidate(sequence));
        } catch (error) {
          errors.push(safelyWrapThrownError(
            error,
            'ProductPresentationFlow Match候选清理失败',
          ));
        }
      }
      if (this.#reentryError === null && this.#dispatcher !== null) {
        const dispatcher = this.#dispatcher;
        try {
          dispatcher.destroy();
          this.#assertCurrentOperationCommit(
            sequence,
            'ProductPresentationFlow dispatcher destroy',
          );
          this.#dispatcher = null;
        } catch (error) {
          errors.push(safelyWrapThrownError(error, 'ProductPresentationFlow Dispatcher 清理失败'));
        }
      }
      this.#cleanupIncomplete = errors.length > 0 || this.#reentryError !== null;
      this.#assertCurrentOperationCommit(sequence, 'ProductPresentationFlow destroy cleanup');
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
      this.#controller = null;
      this.#inputSource = null;
      this.#presentationContent = null;
      this.#matchRuntimeFactory = null;
      this.#frameProjector = null;
      this.#matchPresentationContent = null;
      this.#lastMatchFrame = null;
      this.#lastMatchResult = null;
      this.#lastError = null;
      this.#cleanupIncomplete = false;
      this.#state = PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED;
    });
  }
}

export const PRODUCT_PRESENTATION_FLOW_OPERATION_POLICY = Object.freeze({
  operationGuardPrecedesLifecycleIntentAndSnapshotValidation: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  controllerDispatcherAndMatchRuntimeCallbacksCheckedBeforeFlowPublication: true as const,
  pendingIntentPublishesAfterDispatcherPromiseCapture: true as const,
  asynchronousIntentSettlementUsesIndependentOperation: true as const,
  matchFrameResultAndSnapshotPublishAfterCallbackClosure: true as const,
  failedMatchRuntimeConstructionRetainsRetryOwnership: true as const,
  cleanupReentryRetainsCurrentAndLaterFlowOwners: true as const,
  destroyFailuresRetainRetryOwnership: true as const,
  flowDoesNotWriteMatchAuthorityOrAddProductScreens: true as const,
  validationStatus: 'not-run' as const,
});
