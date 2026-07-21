import {
  assertKnownKeys,
  cloneFrozenData,
  createMatchContentPublicView,
} from '@number-strategy-jump/arena-contracts';
import type { MatchContentSelection } from '@number-strategy-jump/arena-contracts';
import {
  assertProductMatchSeed,
  createProductMatchResult,
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

export interface ProductMatchStepOutcome {
  readonly events: readonly unknown[];
  readonly snapshot: Readonly<Record<string, unknown>>;
  readonly result: ProductMatchResult | null;
}

export interface ProductMatchRuntimePort {
  start(): void;
  setPaused(paused: boolean): void;
  step(playerFrame?: unknown): ProductMatchStepOutcome;
  getSnapshot(): Readonly<Record<string, unknown>>;
  getPublicInfo(): ProductPublicMatchInfo;
  getResult(): ProductMatchResult | null;
  destroy(): void;
}

interface LocalMatchSessionPort {
  readonly getState: () => unknown;
  readonly start: () => unknown;
  readonly setPaused: (paused: boolean) => unknown;
  readonly step: (frame: unknown) => unknown;
  readonly getSnapshot: () => unknown;
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
const STEP_OUTCOME_KEYS = new Set(['events', 'snapshot', 'input']);
const LOCAL_MATCH_SESSION_STATES = new Set([
  'created',
  'running',
  'paused',
  'ended',
  'destroyed',
]);

function normalizeSession(value: unknown): Readonly<LocalMatchSessionPort> {
  return Object.freeze({
    getState: snapshotGetter(value, 'state', 'LocalMatchSession'),
    start: snapshotMethod<LocalMatchSessionPort['start']>(value, 'start', 'LocalMatchSession'),
    setPaused: snapshotMethod<LocalMatchSessionPort['setPaused']>(value, 'setPaused', 'LocalMatchSession'),
    step: snapshotMethod<LocalMatchSessionPort['step']>(value, 'step', 'LocalMatchSession'),
    getSnapshot: snapshotMethod<LocalMatchSessionPort['getSnapshot']>(value, 'getSnapshot', 'LocalMatchSession'),
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

function normalizeStepOutcome(value: unknown): Readonly<{
  events: readonly unknown[];
  snapshot: Readonly<Record<string, unknown>>;
}> {
  assertKnownKeys(value, STEP_OUTCOME_KEYS, 'ProductMatchRuntime step outcome');
  const record = requireRecord(value, 'ProductMatchRuntime step outcome');
  const events = cloneFrozenData(
    readRequiredDataField(record, 'events', 'ProductMatchRuntime step outcome'),
    'ProductMatchRuntime events',
  );
  if (!Array.isArray(events)) throw new TypeError('ProductMatchRuntime events 必须是数组。');
  const snapshot = cloneFrozenData(
    readRequiredDataField(record, 'snapshot', 'ProductMatchRuntime step outcome'),
    'ProductMatchRuntime snapshot',
  );
  return Object.freeze({
    events: events as readonly unknown[],
    snapshot: requireRecord(snapshot, 'ProductMatchRuntime snapshot'),
  });
}

export class ProductMatchRuntime implements ProductMatchRuntimePort {
  #session: Readonly<LocalMatchSessionPort> | null;
  readonly #matchSeed: number;
  #opponent: ProductPublicOpponent | null;
  #content: MatchContentSelection | null;
  #state: ProductMatchRuntimeState = PRODUCT_MATCH_RUNTIME_STATE.CREATED;
  #pauseRequested = false;
  #transitioning = false;
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
    return this.#state;
  }

  #begin(): void {
    if (this.#transitioning) throw new Error('ProductMatchRuntime 操作不可重入。');
    this.#transitioning = true;
  }

  #end(): void {
    this.#transitioning = false;
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

  start(): void {
    this.#begin();
    try {
      this.#assertUsable();
      if (
        this.#state === PRODUCT_MATCH_RUNTIME_STATE.RUNNING
        || this.#state === PRODUCT_MATCH_RUNTIME_STATE.PAUSED
      ) return;
      if (this.#state !== PRODUCT_MATCH_RUNTIME_STATE.CREATED) {
        throw new Error(`ProductMatchRuntime 无法从 ${this.#state} start。`);
      }
      try {
        const startResult = this.#requireSession().start();
        containRejectedAsyncReturn(startResult, 'LocalMatchSession.start');
        this.#state = this.#pauseRequested
          ? PRODUCT_MATCH_RUNTIME_STATE.PAUSED
          : PRODUCT_MATCH_RUNTIME_STATE.RUNNING;
      } catch (error) {
        this.#state = PRODUCT_MATCH_RUNTIME_STATE.FAILED;
        throw error;
      }
    } finally {
      this.#end();
    }
  }

  setPaused(paused: boolean): void {
    this.#begin();
    try {
      this.#assertUsable();
      if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
      if (this.#state === PRODUCT_MATCH_RUNTIME_STATE.ENDED) return;
      try {
        const pauseResult = this.#requireSession().setPaused(paused);
        containRejectedAsyncReturn(pauseResult, 'LocalMatchSession.setPaused');
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
    } finally {
      this.#end();
    }
  }

  step(playerFrame: unknown = null): ProductMatchStepOutcome {
    this.#begin();
    try {
      this.#assertUsable();
      if (this.#state !== PRODUCT_MATCH_RUNTIME_STATE.RUNNING) {
        throw new Error(`ProductMatchRuntime 无法在 ${this.#state} 状态 step。`);
      }
      try {
        const session = this.#requireSession();
        const outcome = normalizeStepOutcome(session.step(playerFrame));
        const sessionState = session.getState();
        if (typeof sessionState !== 'string' || !LOCAL_MATCH_SESSION_STATES.has(sessionState)) {
          throw new TypeError('LocalMatchSession.state 无效。');
        }
        if (sessionState === 'ended') {
          const replay = requireRecord(
            cloneFrozenData(session.exportReplay(), 'ProductMatchRuntime completion replay'),
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
          this.#result = result;
          this.#state = PRODUCT_MATCH_RUNTIME_STATE.ENDED;
        }
        return Object.freeze({ ...outcome, result: this.#result });
      } catch (error) {
        this.#state = PRODUCT_MATCH_RUNTIME_STATE.FAILED;
        throw error;
      }
    } finally {
      this.#end();
    }
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    this.#begin();
    try {
      this.#assertUsable();
      return requireRecord(
        cloneFrozenData(this.#requireSession().getSnapshot(), 'ProductMatchRuntime snapshot'),
        'ProductMatchRuntime snapshot',
      );
    } finally {
      this.#end();
    }
  }

  getPublicInfo(): ProductPublicMatchInfo {
    this.#begin();
    try {
      this.#assertUsable();
      return Object.freeze({
        matchSeed: this.#matchSeed,
        opponent: this.#requireOpponent(),
        content: this.#requireContent(),
      });
    } finally {
      this.#end();
    }
  }

  getResult(): ProductMatchResult | null {
    this.#begin();
    try {
      this.#assertUsable();
      return this.#result;
    } finally {
      this.#end();
    }
  }

  destroy(): void {
    this.#begin();
    try {
      if (this.#state === PRODUCT_MATCH_RUNTIME_STATE.DESTROYED && this.#session === null) return;
      const destroyResult = this.#requireSession().destroy();
      containRejectedAsyncReturn(destroyResult, 'LocalMatchSession.destroy');
      this.#session = null;
      this.#opponent = null;
      this.#content = null;
      this.#result = null;
      this.#completionSink = null;
      this.#pauseRequested = true;
      this.#state = PRODUCT_MATCH_RUNTIME_STATE.DESTROYED;
    } finally {
      this.#end();
    }
  }
}

export function createProductMatchRuntimePort(value: unknown): Readonly<ProductMatchRuntimePort> {
  const start = snapshotMethod<ProductMatchRuntimePort['start']>(
    value,
    'start',
    'ProductMatchRuntime',
  );
  const setPaused = snapshotMethod<ProductMatchRuntimePort['setPaused']>(
    value,
    'setPaused',
    'ProductMatchRuntime',
  );
  const step = snapshotMethod<ProductMatchRuntimePort['step']>(
    value,
    'step',
    'ProductMatchRuntime',
  );
  const getSnapshot = snapshotMethod<ProductMatchRuntimePort['getSnapshot']>(
    value,
    'getSnapshot',
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
  const destroy = snapshotMethod<ProductMatchRuntimePort['destroy']>(
    value,
    'destroy',
    'ProductMatchRuntime',
  );
  return Object.freeze({
    start: (): void => {
      containRejectedAsyncReturn(start(), 'ProductMatchRuntime.start');
    },
    setPaused: (paused: boolean): void => {
      containRejectedAsyncReturn(setPaused(paused), 'ProductMatchRuntime.setPaused');
    },
    step: (playerFrame: unknown = null): ProductMatchStepOutcome => {
      const outcome = step(playerFrame);
      containRejectedAsyncReturn(outcome, 'ProductMatchRuntime.step');
      return outcome;
    },
    getSnapshot: (): Readonly<Record<string, unknown>> => {
      const snapshot = getSnapshot();
      containRejectedAsyncReturn(snapshot, 'ProductMatchRuntime.getSnapshot');
      return snapshot;
    },
    getPublicInfo: (): ProductPublicMatchInfo => {
      const publicInfo = getPublicInfo();
      containRejectedAsyncReturn(publicInfo, 'ProductMatchRuntime.getPublicInfo');
      return publicInfo;
    },
    getResult: (): ProductMatchResult | null => {
      const result = getResult();
      containRejectedAsyncReturn(result, 'ProductMatchRuntime.getResult');
      return result;
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
