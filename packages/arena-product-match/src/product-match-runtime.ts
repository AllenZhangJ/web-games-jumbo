import {
  assertKnownKeys,
  cloneFrozenData,
  createMatchContentPublicView,
  isNormalizedInputFrame,
} from '@number-strategy-jump/arena-contracts';
import type { MatchContentSelection } from '@number-strategy-jump/arena-contracts';
import type {
  ArenaInputFrame,
  DeepReadonly,
  MatchReadFrameV2,
} from '@number-strategy-jump/arena-contracts';
import {
  assertProductMatchSeed,
  createProductMatchResult,
  createProductPublicMatchInfo,
  createProductPublicOpponent,
} from '@number-strategy-jump/arena-product-contracts';
import type {
  ProductMatchResult,
  ProductPublicMatchInfo,
  ProductPublicOpponent,
} from '@number-strategy-jump/arena-product-contracts';
import {
  containRejectedAsyncReturn,
  readOptionalDataField,
  readRequiredDataField,
  requireRecord,
  assertProductMatchReadFrameV2,
  assertProductMatchReadFrameStartOutcome,
  assertProductMatchReadFrameStepOutcome,
  assertProductMatchResult,
  snapshotGetter,
  snapshotMethod,
} from './ports.js';

export const PRODUCT_MATCH_RUNTIME_STATE = Object.freeze({
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  ENDED: 'ended',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ProductMatchRuntimeState = typeof PRODUCT_MATCH_RUNTIME_STATE[
  keyof typeof PRODUCT_MATCH_RUNTIME_STATE
];

export interface ProductMatchCompletion {
  readonly result: ProductMatchResult;
  readonly replay: Readonly<Record<string, unknown>>;
}

export type ProductMatchCompletionSink = (completion: ProductMatchCompletion) => unknown;

export interface ProductMatchRuntimeOptions {
  readonly completionSink?: ProductMatchCompletionSink | null;
}

export interface ProductMatchReadFrameStartOutcome {
  readonly readFrame: DeepReadonly<MatchReadFrameV2>;
}

export interface ProductMatchReadFrameStepOutcome {
  readonly events: readonly unknown[];
  readonly readFrame: DeepReadonly<MatchReadFrameV2>;
  readonly input: ArenaInputFrame | null;
  readonly result: ProductMatchResult | null;
}

export interface ProductMatchRuntimePort {
  setPaused(paused: boolean): void;
  getPublicInfo(): ProductPublicMatchInfo;
  getResult(): ProductMatchResult | null;
  startWithReadFrame(): ProductMatchReadFrameStartOutcome;
  getReadFrame(): DeepReadonly<MatchReadFrameV2>;
  stepWithReadFrame(playerFrame?: unknown): ProductMatchReadFrameStepOutcome;
  destroy(): void;
}

interface LocalMatchSessionPort {
  readonly getState: () => unknown;
  readonly start: () => unknown;
  readonly setPaused: (paused: boolean) => unknown;
  readonly getPresentationReadFrame: () => unknown;
  readonly stepWithPresentationReadFrame: (frame?: unknown) => unknown;
  readonly exportReplay: () => unknown;
  readonly destroy: () => unknown;
}

interface NormalizedLocalMatch {
  readonly session: LocalMatchSessionPort;
  readonly matchSeed: number;
  readonly opponent: ProductPublicOpponent;
  readonly content: MatchContentSelection;
}

const LOCAL_MATCH_KEYS = new Set(['session', 'matchSeed', 'opponent', 'content']);
const RUNTIME_OPTION_KEYS = new Set(['completionSink']);
const LOCAL_MATCH_SESSION_STATES = new Set([
  'created',
  'running',
  'paused',
  'ended',
  'destroyed',
]);

function normalizeSession(value: unknown): Readonly<LocalMatchSessionPort> {
  const getPresentationReadFrame = snapshotMethod<LocalMatchSessionPort['getPresentationReadFrame']>(
    value,
    'getPresentationReadFrame',
    'LocalMatchSession',
  );
  const stepWithPresentationReadFrame = snapshotMethod<LocalMatchSessionPort['stepWithPresentationReadFrame']>(
    value,
    'stepWithPresentationReadFrame',
    'LocalMatchSession',
  );
  return Object.freeze({
    getState: snapshotGetter(value, 'state', 'LocalMatchSession'),
    start: snapshotMethod<LocalMatchSessionPort['start']>(value, 'start', 'LocalMatchSession'),
    setPaused: snapshotMethod<LocalMatchSessionPort['setPaused']>(value, 'setPaused', 'LocalMatchSession'),
    getPresentationReadFrame,
    stepWithPresentationReadFrame,
    exportReplay: snapshotMethod<LocalMatchSessionPort['exportReplay']>(value, 'exportReplay', 'LocalMatchSession'),
    destroy: snapshotMethod<LocalMatchSessionPort['destroy']>(value, 'destroy', 'LocalMatchSession'),
  });
}

function normalizeLocalMatch(value: unknown): Readonly<NormalizedLocalMatch> {
  assertKnownKeys(value, LOCAL_MATCH_KEYS, 'ProductMatchRuntime localMatch');
  const record = requireRecord(value, 'ProductMatchRuntime localMatch');
  return Object.freeze({
    session: normalizeSession(readRequiredDataField(record, 'session', 'ProductMatchRuntime localMatch')),
    matchSeed: assertProductMatchSeed(
      readRequiredDataField(record, 'matchSeed', 'ProductMatchRuntime localMatch'),
    ),
    opponent: createProductPublicOpponent(
      readRequiredDataField(record, 'opponent', 'ProductMatchRuntime localMatch'),
    ),
    content: createMatchContentPublicView(
      readRequiredDataField(record, 'content', 'ProductMatchRuntime localMatch'),
    ),
  });
}

function normalizeOptions(value: unknown): ProductMatchCompletionSink | null {
  const source = value === undefined ? {} : value;
  assertKnownKeys(source, RUNTIME_OPTION_KEYS, 'ProductMatchRuntime options');
  const record = requireRecord(source, 'ProductMatchRuntime options');
  const sink = readOptionalDataField(record, 'completionSink', 'ProductMatchRuntime options', null);
  if (sink !== null && typeof sink !== 'function') {
    throw new TypeError('ProductMatchRuntime completionSink 必须是函数或 null。');
  }
  return sink as ProductMatchCompletionSink | null;
}

type ProductMatchRuntimeOperation =
  | 'state-read'
  | 'pause-transition'
  | 'start-read-frame'
  | 'read-frame-read'
  | 'step-read-frame'
  | 'public-info-read'
  | 'result-read'
  | 'destroy';

export const PRODUCT_MATCH_RUNTIME_OPERATION_GUARD_V1 = Object.freeze({
  operationGuardPrecedesLifecycleAndInputValidation: true,
  publicReadsRejectCallbackIntermediateState: true,
  sessionCallbacksCheckedBeforeAuthorityCommit: true,
  completionSinkCheckedBeforeResultPublication: true,
  swallowedCallbackReentryStopsLaterAuthorityMutation: true,
  postCallbackReentryFailsClosed: true,
  destroyFastPathChecksOperationBeforeIdempotence: true,
  validationStatus: 'not-run',
} as const);

export class ProductMatchRuntime implements ProductMatchRuntimePort {
  #session: Readonly<LocalMatchSessionPort> | null;
  readonly #matchSeed: number;
  #opponent: ProductPublicOpponent | null;
  #content: MatchContentSelection | null;
  #state: ProductMatchRuntimeState = PRODUCT_MATCH_RUNTIME_STATE.CREATED;
  #pauseRequested = false;
  #operation: ProductMatchRuntimeOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #result: ProductMatchResult | null = null;
  #completionSink: ProductMatchCompletionSink | null;

  constructor(localMatchValue: unknown, options: ProductMatchRuntimeOptions = {}) {
    const completionSink = normalizeOptions(options);
    const localMatch = normalizeLocalMatch(localMatchValue);
    this.#session = localMatch.session;
    this.#matchSeed = localMatch.matchSeed;
    this.#opponent = localMatch.opponent;
    this.#content = localMatch.content;
    this.#completionSink = completionSink;
    Object.freeze(this);
  }

  get state(): ProductMatchRuntimeState {
    return this.#runOperation('state-read', () => this.#state, {
      allowDestroyed: true,
      allowFailed: true,
    });
  }

  #recordReentry(requestedOperation: ProductMatchRuntimeOperation): Error {
    this.#reentrySequence += 1;
    if (this.#reentryError === null) {
      this.#reentryError = new Error(
        `ProductMatchRuntime ${String(this.#operation)}期间不可重入${requestedOperation}。`,
      );
    }
    return this.#reentryError;
  }

  #assertReentryFree(
    sequence: number,
    operation: ProductMatchRuntimeOperation,
    failClosed: boolean,
  ): void {
    if (this.#reentrySequence === sequence) return;
    if (failClosed && this.#state !== PRODUCT_MATCH_RUNTIME_STATE.DESTROYED) {
      this.#state = PRODUCT_MATCH_RUNTIME_STATE.FAILED;
    }
    throw this.#reentryError ?? new Error(`ProductMatchRuntime ${operation}期间发生重入。`);
  }

  #runOperation<T>(
    operation: ProductMatchRuntimeOperation,
    callback: () => T,
    options: Readonly<{
      allowDestroyed?: boolean;
      allowFailed?: boolean;
      failClosedOnReentry?: boolean;
    }> = {},
  ): T {
    if (this.#operation !== null) throw this.#recordReentry(operation);
    this.#operation = operation;
    const sequence = this.#reentrySequence;
    try {
      if (!options.allowDestroyed && this.#state === PRODUCT_MATCH_RUNTIME_STATE.DESTROYED) {
        throw new Error('ProductMatchRuntime 已销毁。');
      }
      if (!options.allowFailed && this.#state === PRODUCT_MATCH_RUNTIME_STATE.FAILED) {
        throw new Error('ProductMatchRuntime 已失败关闭。');
      }
      try {
        const result = callback();
        this.#assertReentryFree(
          sequence,
          operation,
          options.failClosedOnReentry === true,
        );
        return result;
      } catch (error) {
        if (
          options.failClosedOnReentry === true
          && this.#reentrySequence !== sequence
          && this.#state !== PRODUCT_MATCH_RUNTIME_STATE.DESTROYED
        ) this.#state = PRODUCT_MATCH_RUNTIME_STATE.FAILED;
        throw error;
      }
    } finally {
      this.#operation = null;
      this.#reentryError = null;
    }
  }

  #assertAuthorityCommitReady(
    operation: ProductMatchRuntimeOperation,
    failClosedOnReentry = false,
  ): void {
    if (this.#reentryError !== null) {
      if (failClosedOnReentry && this.#state !== PRODUCT_MATCH_RUNTIME_STATE.DESTROYED) {
        this.#state = PRODUCT_MATCH_RUNTIME_STATE.FAILED;
      }
      throw this.#reentryError;
    }
    if (this.#operation !== operation) {
      throw new Error(`ProductMatchRuntime ${operation}缺少权威操作所有权。`);
    }
  }

  #assertUsable(): void {
    if (this.#state === PRODUCT_MATCH_RUNTIME_STATE.DESTROYED) {
      throw new Error('ProductMatchRuntime 已销毁。');
    }
    if (this.#state === PRODUCT_MATCH_RUNTIME_STATE.FAILED) {
      throw new Error('ProductMatchRuntime 已失败关闭。');
    }
  }

  #requireSession(): Readonly<LocalMatchSessionPort> {
    if (!this.#session) throw new Error('ProductMatchRuntime 已销毁。');
    return this.#session;
  }

  #requireOpponent(): ProductPublicOpponent {
    if (!this.#opponent) throw new Error('ProductMatchRuntime 已销毁。');
    return this.#opponent;
  }

  #requireContent(): MatchContentSelection {
    if (!this.#content) throw new Error('ProductMatchRuntime 已销毁。');
    return this.#content;
  }

  #requireReadFrameSession(): {
    readonly getPresentationReadFrame: () => unknown;
    readonly stepWithPresentationReadFrame: (frame?: unknown) => unknown;
  } {
    const session = this.#requireSession();
    if (!session.getPresentationReadFrame || !session.stepWithPresentationReadFrame) {
      throw new Error('ProductMatchRuntime 缺少 PA4a MatchReadFrameV2 Session 合同。');
    }
    return {
      getPresentationReadFrame: session.getPresentationReadFrame,
      stepWithPresentationReadFrame: session.stepWithPresentationReadFrame,
    };
  }

  #readV2Frame(operation: ProductMatchRuntimeOperation): DeepReadonly<MatchReadFrameV2> {
    const frame = this.#requireReadFrameSession().getPresentationReadFrame();
    containRejectedAsyncReturn(frame, 'LocalMatchSession.getPresentationReadFrame');
    this.#assertAuthorityCommitReady(operation, true);
    return assertProductMatchReadFrameV2(frame, this.#matchSeed);
  }

  #completeEndedSession(
    session: Readonly<LocalMatchSessionPort>,
    operation: ProductMatchRuntimeOperation,
  ): void {
    const sessionState = session.getState();
    containRejectedAsyncReturn(sessionState, 'LocalMatchSession.state');
    this.#assertAuthorityCommitReady(operation, true);
    if (typeof sessionState !== 'string' || !LOCAL_MATCH_SESSION_STATES.has(sessionState)) {
      throw new TypeError('LocalMatchSession.state 无效。');
    }
    if (sessionState !== 'ended') return;
    const rawReplay = session.exportReplay();
    containRejectedAsyncReturn(rawReplay, 'LocalMatchSession.exportReplay');
    this.#assertAuthorityCommitReady(operation, true);
    const replay = requireRecord(
      cloneFrozenData(rawReplay, 'ProductMatchRuntime completion replay'),
      'ProductMatchRuntime completion replay',
    );
    const result = createProductMatchResult({
      matchSeed: this.#matchSeed,
      opponent: this.#requireOpponent(),
      content: this.#requireContent(),
      replay,
    });
    const completion = Object.freeze({ result, replay });
    const sinkResult = this.#completionSink?.(completion);
    containRejectedAsyncReturn(sinkResult, 'ProductMatchRuntime completionSink');
    this.#assertAuthorityCommitReady(operation, true);
    this.#result = result;
    this.#state = PRODUCT_MATCH_RUNTIME_STATE.ENDED;
  }

  setPaused(paused: boolean): void {
    this.#runOperation('pause-transition', () => {
      this.#assertUsable();
      if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
      if (this.#state === PRODUCT_MATCH_RUNTIME_STATE.ENDED) return;
      try {
        const pauseResult = this.#requireSession().setPaused(paused);
        containRejectedAsyncReturn(pauseResult, 'LocalMatchSession.setPaused');
        this.#assertAuthorityCommitReady('pause-transition', true);
        this.#pauseRequested = paused;
        if (this.#state !== PRODUCT_MATCH_RUNTIME_STATE.CREATED) {
          this.#state = paused
            ? PRODUCT_MATCH_RUNTIME_STATE.PAUSED
            : PRODUCT_MATCH_RUNTIME_STATE.RUNNING;
        }
      } catch (error) {
        this.#state = PRODUCT_MATCH_RUNTIME_STATE.FAILED;
        throw error;
      }
    }, { failClosedOnReentry: true });
  }

  startWithReadFrame(): ProductMatchReadFrameStartOutcome {
    return this.#runOperation('start-read-frame', () => {
      this.#assertUsable();
      if (this.#state !== PRODUCT_MATCH_RUNTIME_STATE.CREATED
        && this.#state !== PRODUCT_MATCH_RUNTIME_STATE.RUNNING
        && this.#state !== PRODUCT_MATCH_RUNTIME_STATE.PAUSED) {
        throw new Error(`ProductMatchRuntime 无法从 ${this.#state} start V2 read frame。`);
      }
      try {
        if (this.#state === PRODUCT_MATCH_RUNTIME_STATE.CREATED) {
          const startResult = this.#requireSession().start();
          containRejectedAsyncReturn(startResult, 'LocalMatchSession.start');
          this.#assertAuthorityCommitReady('start-read-frame', true);
          this.#state = this.#pauseRequested
            ? PRODUCT_MATCH_RUNTIME_STATE.PAUSED
            : PRODUCT_MATCH_RUNTIME_STATE.RUNNING;
        }
        return Object.freeze({ readFrame: this.#readV2Frame('start-read-frame') });
      } catch (error) {
        this.#state = PRODUCT_MATCH_RUNTIME_STATE.FAILED;
        throw error;
      }
    }, { failClosedOnReentry: true });
  }

  getReadFrame(): DeepReadonly<MatchReadFrameV2> {
    return this.#runOperation('read-frame-read', () => {
      this.#assertUsable();
      return this.#readV2Frame('read-frame-read');
    }, { failClosedOnReentry: true });
  }

  stepWithReadFrame(playerFrame: unknown = null): ProductMatchReadFrameStepOutcome {
    return this.#runOperation('step-read-frame', () => {
      this.#assertUsable();
      if (this.#state !== PRODUCT_MATCH_RUNTIME_STATE.RUNNING) {
        throw new Error(`ProductMatchRuntime V2 step 只允许 running，当前为 ${this.#state}。`);
      }
      try {
        const session = this.#requireSession();
        const readFrameSession = this.#requireReadFrameSession();
        const rawOutcome = readFrameSession.stepWithPresentationReadFrame(playerFrame);
        containRejectedAsyncReturn(rawOutcome, 'LocalMatchSession.stepWithPresentationReadFrame');
        this.#assertAuthorityCommitReady('step-read-frame', true);
        const outcome = requireRecord(rawOutcome, 'ProductMatchRuntime V2 step outcome');
        assertKnownKeys(outcome, new Set(['events', 'readFrame', 'input']), 'ProductMatchRuntime V2 step outcome');
        const events = cloneFrozenData(
          readRequiredDataField(outcome, 'events', 'ProductMatchRuntime V2 step outcome'),
          'ProductMatchRuntime V2 events',
        );
        if (!Array.isArray(events)) {
          throw new TypeError('ProductMatchRuntime V2 events 必须是数组。');
        }
        const readFrame = assertProductMatchReadFrameV2(
          readRequiredDataField(outcome, 'readFrame', 'ProductMatchRuntime V2 step outcome'),
          this.#matchSeed,
        );
        const input = readRequiredDataField(outcome, 'input', 'ProductMatchRuntime V2 step outcome');
        const world = requireRecord(
          readRequiredDataField(readFrame, 'worldSnapshot', 'ProductMatchRuntime V2 read frame'),
          'ProductMatchRuntime V2 read frame world',
        );
        const local = requireRecord(
          readRequiredDataField(readFrame, 'localActionSidecar', 'ProductMatchRuntime V2 read frame'),
          'ProductMatchRuntime V2 read frame local sidecar',
        );
        if (input === null) {
          throw new TypeError('ProductMatchRuntime running V2 step 必须返回非 null normalized InputFrame。');
        }
        if (!isNormalizedInputFrame(input)) {
          throw new TypeError('ProductMatchRuntime V2 input 缺少 normalized InputFrame provenance。');
        }
        const inputParticipantId = readRequiredDataField(input, 'participantId', 'ProductMatchRuntime V2 input');
        const inputTick = readRequiredDataField(input, 'tick', 'ProductMatchRuntime V2 input');
        const localParticipantId = readRequiredDataField(
          local,
          'participantId',
          'ProductMatchRuntime V2 local sidecar',
        );
        const postTick = readRequiredDataField(world, 'tick', 'ProductMatchRuntime V2 read frame world');
        if (
          inputParticipantId !== localParticipantId
          || inputTick !== (postTick as number) - 1
        ) {
          throw new Error('ProductMatchRuntime V2 input 与 post read frame identity 不一致。');
        }
        this.#completeEndedSession(session, 'step-read-frame');
        this.#assertAuthorityCommitReady('step-read-frame', true);
        return Object.freeze({
          events: events as readonly unknown[],
          readFrame,
          input: input as ArenaInputFrame | null,
          result: this.#result,
        });
      } catch (error) {
        this.#state = PRODUCT_MATCH_RUNTIME_STATE.FAILED;
        throw error;
      }
    }, { failClosedOnReentry: true });
  }

  getPublicInfo(): ProductPublicMatchInfo {
    return this.#runOperation('public-info-read', () => {
      this.#assertUsable();
      return Object.freeze({
        matchSeed: this.#matchSeed,
        opponent: this.#requireOpponent(),
        content: this.#requireContent(),
      });
    });
  }

  getResult(): ProductMatchResult | null {
    return this.#runOperation('result-read', () => {
      this.#assertUsable();
      return this.#result;
    });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#state === PRODUCT_MATCH_RUNTIME_STATE.DESTROYED && this.#session === null) return;
      const destroyResult = this.#requireSession().destroy();
      containRejectedAsyncReturn(destroyResult, 'LocalMatchSession.destroy');
      this.#assertAuthorityCommitReady('destroy', true);
      this.#session = null;
      this.#opponent = null;
      this.#content = null;
      this.#result = null;
      this.#completionSink = null;
      this.#pauseRequested = true;
      this.#state = PRODUCT_MATCH_RUNTIME_STATE.DESTROYED;
    }, { allowDestroyed: true, allowFailed: true, failClosedOnReentry: true });
  }
}

export function createProductMatchRuntimePort(value: unknown): Readonly<ProductMatchRuntimePort> {
  const setPaused = snapshotMethod<ProductMatchRuntimePort['setPaused']>(
    value,
    'setPaused',
    'ProductMatchRuntime',
  );
  const getPublicInfo = snapshotMethod<ProductMatchRuntimePort['getPublicInfo']>(
    value,
    'getPublicInfo',
    'ProductMatchRuntime',
  );
  const getResult = snapshotMethod<ProductMatchRuntimePort['getResult']>(
    value,
    'getResult',
    'ProductMatchRuntime',
  );
  const startWithReadFrame = snapshotMethod<ProductMatchRuntimePort['startWithReadFrame']>(
    value,
    'startWithReadFrame',
    'ProductMatchRuntime',
  );
  const getReadFrame = snapshotMethod<ProductMatchRuntimePort['getReadFrame']>(
    value,
    'getReadFrame',
    'ProductMatchRuntime',
  );
  const stepWithReadFrame = snapshotMethod<ProductMatchRuntimePort['stepWithReadFrame']>(
    value,
    'stepWithReadFrame',
    'ProductMatchRuntime',
  );
  const destroy = snapshotMethod<ProductMatchRuntimePort['destroy']>(
    value,
    'destroy',
    'ProductMatchRuntime',
  );
  const publicInfo = getPublicInfo();
  containRejectedAsyncReturn(publicInfo, 'ProductMatchRuntime.getPublicInfo');
  const fixedPublicInfo = createProductPublicMatchInfo(publicInfo);
  const expectedMatchSeed = assertProductMatchSeed(
    readRequiredDataField(
      requireRecord(fixedPublicInfo, 'ProductMatchRuntime public info'),
      'matchSeed',
      'ProductMatchRuntime public info',
    ),
  );
  return Object.freeze({
    setPaused: (paused: boolean): void => {
      containRejectedAsyncReturn(setPaused(paused), 'ProductMatchRuntime.setPaused');
    },
    getPublicInfo: (): ProductPublicMatchInfo => {
      return fixedPublicInfo;
    },
    getResult: (): ProductMatchResult | null => {
      const result = getResult();
      containRejectedAsyncReturn(result, 'ProductMatchRuntime.getResult');
      if (result !== null) assertProductMatchResult(result, expectedMatchSeed, 'ProductMatchRuntime result');
      return result;
    },
    startWithReadFrame: (): ProductMatchReadFrameStartOutcome => {
      const outcome = startWithReadFrame();
      containRejectedAsyncReturn(outcome, 'ProductMatchRuntime.startWithReadFrame');
      return assertProductMatchReadFrameStartOutcome(outcome, expectedMatchSeed);
    },
    getReadFrame: (): DeepReadonly<MatchReadFrameV2> => {
      const frame = getReadFrame();
      containRejectedAsyncReturn(frame, 'ProductMatchRuntime.getReadFrame');
      return assertProductMatchReadFrameV2(frame, expectedMatchSeed);
    },
    stepWithReadFrame: (playerFrame: unknown = null): ProductMatchReadFrameStepOutcome => {
      const outcome = stepWithReadFrame(playerFrame);
      containRejectedAsyncReturn(outcome, 'ProductMatchRuntime.stepWithReadFrame');
      return assertProductMatchReadFrameStepOutcome(outcome, expectedMatchSeed) as ProductMatchReadFrameStepOutcome;
    },
    destroy: (): void => {
      containRejectedAsyncReturn(destroy(), 'ProductMatchRuntime.destroy');
    },
  });
}

export function validateProductMatchRuntime(value: unknown): unknown {
  createProductMatchRuntimePort(value);
  return value;
}
