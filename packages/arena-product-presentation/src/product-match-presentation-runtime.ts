import {
  assertNonEmptyString,
  assertPlainRecord,
  combineCleanupFailure,
  normalizeThrownError,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createProductPublicMatchInfo,
  validateProductMatchResult,
  type ProductMatchResult,
  type ProductPublicMatchInfo,
} from '@number-strategy-jump/arena-product-contracts';
import { PresentationEventWindow } from '@number-strategy-jump/arena-presentation-runtime';
import { PRODUCT_SESSION_STATE } from '@number-strategy-jump/arena-product-state';
import {
  ownOptions,
  rejectThenable,
  snapshotMethod,
} from './capability-utils.js';

export const PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE = Object.freeze({
  PREPARED: 'prepared',
  RUNNING: 'running',
  RESULT: 'result',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ProductMatchPresentationRuntimeState = typeof PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE[
  keyof typeof PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE
];

interface ProductControllerAdapter {
  beginMatch(): unknown;
  stepMatch(input: unknown): unknown;
  getActiveMatchSnapshot(): unknown;
  getSnapshot(): unknown;
}

export interface ProductMatchPresentationControllerPort {
  beginMatch(): unknown;
  stepMatch(input: unknown): unknown;
  getActiveMatchSnapshot(): unknown;
  getSnapshot(): unknown;
}

export interface ProductMatchPresentationInputPort {
  sample(tick: number, options: Readonly<{ actionAffordance: unknown }>): unknown;
}

export interface ProductMatchPresentationEventWindowPort {
  consume(events: readonly unknown[]): unknown;
  destroy(): void;
}

export interface ProductMatchPresentationProjectorOptions {
  readonly snapshot: unknown;
  readonly events: readonly unknown[];
  readonly publicMatchInfo: ProductPublicMatchInfo;
  readonly localParticipantId: string;
  readonly opponentParticipantId: string;
  readonly content: unknown;
}

export interface ProductMatchPresentationRuntimeOptions {
  readonly controller: ProductMatchPresentationControllerPort;
  readonly inputSource: ProductMatchPresentationInputPort;
  readonly localParticipantId?: string;
  readonly opponentParticipantId?: string;
  readonly content?: unknown;
  readonly eventWindowFactory?: (
    options: Readonly<{ capacity: number }>,
  ) => ProductMatchPresentationEventWindowPort;
  readonly frameProjector: (options: ProductMatchPresentationProjectorOptions) => unknown;
}

const OPTION_KEYS = new Set([
  'controller', 'inputSource', 'localParticipantId', 'opponentParticipantId',
  'content', 'eventWindowFactory', 'frameProjector',
]);

function syncResult(value: unknown, name: string): unknown {
  rejectThenable(value, name);
  return value;
}

function normalizeController(value: unknown): ProductControllerAdapter {
  const beginMatch = snapshotMethod(value, 'ProductSessionController', 'beginMatch')!;
  const stepMatch = snapshotMethod(value, 'ProductSessionController', 'stepMatch')!;
  const getActiveMatchSnapshot = snapshotMethod(
    value,
    'ProductSessionController',
    'getActiveMatchSnapshot',
  )!;
  const getSnapshot = snapshotMethod(value, 'ProductSessionController', 'getSnapshot')!;
  return Object.freeze({
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
  });
}

function normalizeInputSource(value: unknown): ProductMatchPresentationInputPort {
  const sample = snapshotMethod(value, 'ProductMatch inputSource', 'sample')!;
  return Object.freeze({
    sample: (tick: number, options: Readonly<{ actionAffordance: unknown }>) => syncResult(
      sample(tick, options),
      'ProductMatch inputSource.sample()',
    ),
  });
}

function normalizeEventWindow(value: unknown): ProductMatchPresentationEventWindowPort {
  let consume: (...args: unknown[]) => unknown;
  let destroy: (...args: unknown[]) => unknown;
  try {
    consume = snapshotMethod(value, 'ProductMatch eventWindow', 'consume')!;
    destroy = snapshotMethod(value, 'ProductMatch eventWindow', 'destroy')!;
  } catch (error) {
    throw new TypeError('ProductMatchPresentationRuntime eventWindow 不符合合同。', {
      cause: normalizeThrownError(error, 'ProductMatch eventWindow 合同无效'),
    });
  }
  return Object.freeze({
    consume: (events: readonly unknown[]) => syncResult(
      consume(events),
      'ProductMatch eventWindow.consume()',
    ),
    destroy: () => { syncResult(destroy(), 'ProductMatch eventWindow.destroy()'); },
  });
}

function requiredFunction(value: unknown, name: string): (...args: unknown[]) => unknown {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as (...args: unknown[]) => unknown;
}

function activeProductState(snapshotValue: unknown): unknown {
  const snapshot = assertPlainRecord(snapshotValue, 'ProductSession snapshot');
  const state = assertPlainRecord(snapshot.state, 'ProductSession snapshot.state');
  return state.state === PRODUCT_SESSION_STATE.SUSPENDED ? state.activeState : state.state;
}

function requireLocalParticipant(snapshotValue: unknown, participantId: string): PlainRecord {
  const snapshot = assertPlainRecord(snapshotValue, 'Product match snapshot');
  if (!Array.isArray(snapshot.participants)) {
    throw new TypeError('Product match snapshot 缺少 participants。');
  }
  let participant: PlainRecord | null = null;
  for (let index = 0; index < snapshot.participants.length; index += 1) {
    const candidate = assertPlainRecord(
      snapshot.participants[index],
      `Product match snapshot.participants[${index}]`,
    );
    if (candidate.id === participantId) participant = candidate;
  }
  if (participant === null) {
    throw new RangeError(`Product match snapshot 缺少本地参与者 ${participantId}。`);
  }
  assertPlainRecord(participant.actionAffordance, `${participantId}.actionAffordance`);
  return participant;
}

function runtimeFailure(error: unknown, message: string): Error {
  const cause = normalizeThrownError(error, message);
  const failure = new Error(`${message}：${cause.message}`, { cause });
  return failure;
}

export class ProductMatchPresentationRuntime {
  #controller: ProductControllerAdapter | null;
  #inputSource: ProductMatchPresentationInputPort | null;
  #eventWindow: ProductMatchPresentationEventWindowPort | null;
  #frameProjector: ((options: ProductMatchPresentationProjectorOptions) => unknown) | null;
  #content: unknown;
  readonly #localParticipantId: string;
  readonly #opponentParticipantId: string;
  #state: ProductMatchPresentationRuntimeState;
  #operation: string | null = null;
  #reentryAttempted = false;
  #cleanupIncomplete = false;
  #publicMatchInfo: ProductPublicMatchInfo | null = null;
  #lastFrame: unknown = null;
  #lastResult: ProductMatchResult | null = null;
  #lastError: Error | null = null;

  constructor(optionsValue: ProductMatchPresentationRuntimeOptions) {
    const options = ownOptions(
      optionsValue,
      OPTION_KEYS,
      'ProductMatchPresentationRuntime options',
    );
    this.#controller = normalizeController(options.controller);
    this.#inputSource = normalizeInputSource(options.inputSource);
    this.#localParticipantId = assertNonEmptyString(
      options.localParticipantId ?? 'player-1',
      'localParticipantId',
    );
    this.#opponentParticipantId = assertNonEmptyString(
      options.opponentParticipantId ?? 'player-2',
      'opponentParticipantId',
    );
    if (this.#localParticipantId === this.#opponentParticipantId) {
      throw new RangeError('本地与对手 participantId 不能相同。');
    }
    this.#content = options.content;
    const projector = requiredFunction(
      options.frameProjector,
      'ProductMatchPresentationRuntime.frameProjector',
    );
    this.#frameProjector = (projectorOptions) => syncResult(
      projector(projectorOptions),
      'ProductMatchPresentationRuntime.frameProjector()',
    );
    const eventWindowFactory = options.eventWindowFactory === undefined
      ? (value: Readonly<{ capacity: number }>) => new PresentationEventWindow(value)
      : requiredFunction(
        options.eventWindowFactory,
        'ProductMatchPresentationRuntime.eventWindowFactory',
      );
    let candidate: unknown = null;
    try {
      candidate = syncResult(
        eventWindowFactory({ capacity: 512 }),
        'ProductMatchPresentationRuntime.eventWindowFactory()',
      );
      this.#eventWindow = normalizeEventWindow(candidate);
    } catch (error) {
      const cleanupErrors: Error[] = [];
      try {
        const destroy = snapshotMethod(
          candidate,
          '无效 ProductMatch eventWindow',
          'destroy',
          false,
        );
        if (destroy) syncResult(destroy(), '无效 ProductMatch eventWindow.destroy()');
      } catch (cleanupError) {
        cleanupErrors.push(normalizeThrownError(cleanupError, '无效 eventWindow 清理失败'));
      }
      throw combineCleanupFailure(
        normalizeThrownError(error, 'ProductMatchPresentationRuntime 构造失败'),
        cleanupErrors,
        'ProductMatchPresentationRuntime 构造失败且清理未完整完成。',
      );
    }
    this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.PREPARED;
    Object.freeze(this);
  }

  get state(): ProductMatchPresentationRuntimeState {
    return this.#state;
  }

  #assertUsable(): void {
    if (this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED) {
      throw new Error('ProductMatchPresentationRuntime 已销毁。');
    }
    if (this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED) {
      throw new Error('ProductMatchPresentationRuntime 已失败关闭。', { cause: this.#lastError });
    }
  }

  #enter(operation: string): void {
    if (this.#operation !== null) {
      this.#reentryAttempted = true;
      throw new Error(
        `ProductMatchPresentationRuntime ${this.#operation} 期间不能执行 ${operation}。`,
      );
    }
    this.#operation = operation;
    this.#reentryAttempted = false;
  }

  #assertNoSwallowedReentry(): void {
    if (this.#reentryAttempted) {
      throw new Error('ProductMatchPresentationRuntime 检测到被宿主吞掉的重入异常。');
    }
  }

  #leave(): void {
    this.#operation = null;
    this.#reentryAttempted = false;
  }

  #fail(error: unknown, message: string): Error {
    this.#lastError = runtimeFailure(error, message);
    this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED;
    return this.#lastError;
  }

  #project(
    snapshot: unknown,
    events: readonly unknown[],
    publicMatchInfo: ProductPublicMatchInfo,
  ): unknown {
    const eventWindow = this.#eventWindow;
    if (eventWindow === null) throw new Error('ProductMatch eventWindow 已释放。');
    const frameProjector = this.#frameProjector;
    if (frameProjector === null) throw new Error('ProductMatch frameProjector 已释放。');
    const accepted = eventWindow.consume(events);
    this.#assertNoSwallowedReentry();
    if (!Array.isArray(accepted)) {
      throw new TypeError('ProductMatch eventWindow.consume() 必须返回数组。');
    }
    const frame = frameProjector({
      snapshot,
      events: accepted,
      publicMatchInfo,
      localParticipantId: this.#localParticipantId,
      opponentParticipantId: this.#opponentParticipantId,
      content: this.#content,
    });
    this.#assertNoSwallowedReentry();
    if (!frame || typeof frame !== 'object' || Array.isArray(frame)) {
      throw new TypeError('ProductMatch frameProjector() 必须返回对象。');
    }
    return frame;
  }

  start(): unknown {
    this.#assertUsable();
    this.#enter('start');
    try {
      if (
        this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING
        || this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RESULT
      ) return this.#lastFrame;
      const controller = this.#controller;
      if (controller === null) throw new Error('ProductSessionController 已释放。');
      const productSnapshotValue = controller.beginMatch();
      this.#assertNoSwallowedReentry();
      if (activeProductState(productSnapshotValue) !== PRODUCT_SESSION_STATE.IN_MATCH) {
        throw new Error('Product match 启动后未进入 in-match。');
      }
      const productSnapshot = assertPlainRecord(productSnapshotValue, 'ProductSession snapshot');
      const match = assertPlainRecord(productSnapshot.match, 'ProductSession snapshot.match');
      const publicMatchInfo = createProductPublicMatchInfo(match.publicMatchInfo);
      const snapshot = controller.getActiveMatchSnapshot();
      this.#assertNoSwallowedReentry();
      if (snapshot === null) throw new Error('Product match 启动后缺少权威快照。');
      const frame = this.#project(snapshot, [], publicMatchInfo);
      this.#publicMatchInfo = publicMatchInfo;
      this.#lastFrame = frame;
      this.#lastError = null;
      this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING;
      return frame;
    } catch (error) {
      throw this.#fail(error, 'Product match 表现启动失败');
    } finally {
      this.#leave();
    }
  }

  step(): unknown {
    this.#assertUsable();
    this.#enter('step');
    try {
      if (this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RESULT) return this.#lastFrame;
      if (this.#state !== PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING) {
        throw new Error(`ProductMatchPresentationRuntime 无法在 ${this.#state} 状态 step。`);
      }
      const publicMatchInfo = this.#publicMatchInfo;
      if (publicMatchInfo === null) throw new Error('Product match 运行中缺少公开比赛信息。');
      const controller = this.#controller;
      if (controller === null) throw new Error('ProductSessionController 已释放。');
      const inputSource = this.#inputSource;
      if (inputSource === null) throw new Error('ProductMatch inputSource 已释放。');
      const before = controller.getActiveMatchSnapshot();
      this.#assertNoSwallowedReentry();
      if (before === null) throw new Error('Product match 运行中缺少权威快照。');
      const beforeRecord = assertPlainRecord(before, 'Product match snapshot');
      const tick = beforeRecord.tick;
      if (!Number.isSafeInteger(tick) || (tick as number) < 0) {
        throw new RangeError('Product match snapshot.tick 必须是非负安全整数。');
      }
      const local = requireLocalParticipant(before, this.#localParticipantId);
      const input = inputSource.sample(tick as number, {
        actionAffordance: local.actionAffordance,
      });
      this.#assertNoSwallowedReentry();
      const outcome = assertPlainRecord(
        controller.stepMatch(input),
        'Product match step outcome',
      );
      this.#assertNoSwallowedReentry();
      if (outcome.matchStep === null) {
        throw new Error('Product match 权威 step 失败并已关闭。');
      }
      const matchStep = assertPlainRecord(outcome.matchStep, 'Product match step');
      if (!Array.isArray(matchStep.events) || !matchStep.snapshot) {
        throw new TypeError('Product match step 返回值不符合表现合同。');
      }
      const result = matchStep.result === null
        ? null
        : validateProductMatchResult(matchStep.result);
      const expectedProductState = result === null
        ? PRODUCT_SESSION_STATE.IN_MATCH
        : PRODUCT_SESSION_STATE.RESULTS;
      if (activeProductState(outcome.productSnapshot) !== expectedProductState) {
        throw new Error(`Product match step 后未进入 ${expectedProductState}。`);
      }
      const frame = this.#project(matchStep.snapshot, matchStep.events, publicMatchInfo);
      this.#lastFrame = frame;
      if (result !== null) {
        this.#lastResult = result;
        this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RESULT;
      }
      return frame;
    } catch (error) {
      throw this.#fail(error, 'Product match 表现 step 失败');
    } finally {
      this.#leave();
    }
  }

  getLastPresentationFrame(): unknown {
    return this.#lastFrame;
  }

  getLastMatchResult(): ProductMatchResult | null {
    return this.#lastResult;
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    let lastTick: number | null = null;
    if (this.#lastFrame && typeof this.#lastFrame === 'object') {
      const sourceDescriptor = Object.getOwnPropertyDescriptor(this.#lastFrame, 'source');
      const source = sourceDescriptor && 'value' in sourceDescriptor
        ? sourceDescriptor.value as unknown
        : null;
      if (source && typeof source === 'object') {
        const tickDescriptor = Object.getOwnPropertyDescriptor(source, 'tick');
        const value = tickDescriptor && 'value' in tickDescriptor ? tickDescriptor.value : null;
        if (Number.isSafeInteger(value) && (value as number) >= 0) lastTick = value as number;
      }
    }
    return Object.freeze({
      state: this.#state,
      stepping: this.#operation === 'step',
      cleanupIncomplete: this.#cleanupIncomplete,
      hasPublicMatchInfo: this.#publicMatchInfo !== null,
      hasFrame: this.#lastFrame !== null,
      hasResult: this.#lastResult !== null,
      lastTick,
      failed: this.#lastError !== null,
    });
  }

  destroy(): void {
    if (
      this.#state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED
      && this.#eventWindow === null
    ) return;
    this.#enter('destroy');
    try {
      this.#controller = null;
      this.#inputSource = null;
      this.#frameProjector = null;
      this.#content = null;
      this.#publicMatchInfo = null;
      this.#lastFrame = null;
      this.#lastResult = null;
      if (this.#eventWindow !== null) {
        this.#eventWindow.destroy();
        this.#eventWindow = null;
        this.#assertNoSwallowedReentry();
      }
      this.#lastError = null;
      this.#cleanupIncomplete = false;
      this.#state = PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED;
    } catch (error) {
      this.#cleanupIncomplete = true;
      throw this.#fail(error, 'Product match 表现资源清理失败');
    } finally {
      this.#leave();
    }
  }
}
