import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn,
  combineCleanupFailure,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2InformationNavigationSessionV1,
  ArenaV2InformationScreenRegistryV1,
  type ArenaV2MatchSceneReadFrameCandidateV1,
  type ArenaV2InformationNavigationModeKindV1,
  type ArenaV2InformationNavigationOutcomeV1,
  type ArenaV2InformationNavigationSnapshotV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ArenaV2LearningSettlementPendingErrorCandidateV1,
  ArenaV2RewardSettlementPendingErrorCandidateV1,
  ArenaV2SettlementRestartRequiredErrorCandidateV1,
} from './arena-v2-learning-mode-session-bridge-candidate-v1.js';

export const ARENA_V2_INFORMATION_MODE_SESSION_HOST_STATE_CANDIDATE_V1 =
  Object.freeze({
    CREATED: 'created',
    INFORMATION: 'information',
    MATCH_RUNNING: 'match-running',
    MATCH_PAUSED: 'match-paused',
    MATCH_SETTLEMENT_PENDING: 'match-settlement-pending',
    RESULT: 'result',
    FAILED: 'failed',
    DESTROYED: 'destroyed',
  } as const);

export type ArenaV2InformationModeSessionHostStateCandidateV1 =
  typeof ARENA_V2_INFORMATION_MODE_SESSION_HOST_STATE_CANDIDATE_V1[
    keyof typeof ARENA_V2_INFORMATION_MODE_SESSION_HOST_STATE_CANDIDATE_V1
  ];

export interface ArenaV2InformationModeSessionFactoryRequestCandidateV1 {
  readonly schemaVersion: 1;
  readonly generation: number;
  readonly modeKind: ArenaV2InformationNavigationModeKindV1;
}

export interface ArenaV2InformationModeSessionFactoryPortCandidateV1 {
  createSession(request: ArenaV2InformationModeSessionFactoryRequestCandidateV1): unknown;
}

export interface ArenaV2InformationModeSessionHostSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly state: ArenaV2InformationModeSessionHostStateCandidateV1;
  readonly generation: number;
  readonly selectedModeKind: ArenaV2InformationNavigationModeKindV1 | null;
  readonly navigation: ArenaV2InformationNavigationSnapshotV1;
  readonly modeSessionState: string | null;
}

export interface ArenaV2InformationModeSessionHostNavigationOutcomeCandidateV1 {
  readonly navigation: ArenaV2InformationNavigationOutcomeV1;
  readonly matchStart: unknown;
  readonly matchPresentation: unknown;
  readonly snapshot: ArenaV2InformationModeSessionHostSnapshotCandidateV1;
}

export interface ArenaV2InformationModeSessionHostStepOutcomeCandidateV1 {
  readonly modeStep: unknown;
  readonly matchPresentation: unknown;
  readonly snapshot: ArenaV2InformationModeSessionHostSnapshotCandidateV1;
}

export interface ArenaV2InformationModeSessionHostInputContextCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly generation: number;
  readonly modeKind: ArenaV2InformationNavigationModeKindV1;
  readonly state: 'running' | 'paused' | 'settlement-pending';
  readonly tick: number;
  readonly localParticipantId: string;
}

export interface ArenaV2InformationModeSessionHostSettlementOutcomeCandidateV1 {
  readonly settlement: unknown;
  readonly navigation: ArenaV2InformationNavigationOutcomeV1;
  readonly snapshot: ArenaV2InformationModeSessionHostSnapshotCandidateV1;
}

type PortMethod = (...args: readonly unknown[]) => unknown;

type InformationModeSessionHostOperation =
  | 'start'
  | 'loading-ready'
  | 'open-declared-link'
  | 'open-bottom-navigation'
  | 'dispatch-primary-intent'
  | 'step-match'
  | 'pause-match'
  | 'resume-match'
  | 'settle-match'
  | 'snapshot-read'
  | 'input-context-read'
  | 'scene-frame-read'
  | 'destroy';

interface ModeSessionPort {
  readonly start: PortMethod;
  readonly step: PortMethod;
  readonly pause: PortMethod;
  readonly resume: PortMethod;
  readonly settle: PortMethod;
  readonly getSnapshot: PortMethod;
  readonly getPresentationProjection: PortMethod | null;
  readonly destroy: PortMethod;
}

const OPTION_KEYS = new Set(['registry', 'sessionFactory']);
const START_KEYS = new Set(['initialScreenId']);
const FACTORY_REQUEST_KEYS = new Set(['schemaVersion', 'generation', 'modeKind']);

function exact(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
  return source;
}

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function dataMethod(target: unknown, key: string, name: string): PortMethod {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${name}.${key}不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) {
      throw new TypeError(`${name}原型链无效。`);
    }
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是数据方法。`);
      }
      const value = descriptor.value as PortMethod;
      return (...args: readonly unknown[]) => Reflect.apply(value, target, args);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`${name}.${key}不存在。`);
}

function optionalDataMethod(target: unknown, key: string, name: string): PortMethod | null {
  try {
    return dataMethod(target, key, name);
  } catch (error) {
    if (error instanceof TypeError && error.message === `${name}.${key}不存在。`) return null;
    throw error;
  }
}

function call(method: PortMethod, args: readonly unknown[], name: string): unknown {
  const value = method(...args);
  assertSynchronousReturn(value, name);
  return value;
}

function wrapped(error: unknown, message: string): Error {
  const result = new Error(message);
  Object.defineProperty(result, 'cause', { value: error, enumerable: false });
  return result;
}

function retainsSettlementEvidence(error: unknown): boolean {
  return error instanceof ArenaV2LearningSettlementPendingErrorCandidateV1
    || error instanceof ArenaV2RewardSettlementPendingErrorCandidateV1
    || error instanceof ArenaV2SettlementRestartRequiredErrorCandidateV1;
}

function createModeSessionPort(value: unknown, destroy: PortMethod): ModeSessionPort {
  return Object.freeze({
    start: dataMethod(value, 'start', 'Information Mode Session Host session'),
    step: dataMethod(value, 'step', 'Information Mode Session Host session'),
    pause: dataMethod(value, 'pause', 'Information Mode Session Host session'),
    resume: dataMethod(value, 'resume', 'Information Mode Session Host session'),
    settle: dataMethod(value, 'settle', 'Information Mode Session Host session'),
    getSnapshot: dataMethod(value, 'getSnapshot', 'Information Mode Session Host session'),
    getPresentationProjection: optionalDataMethod(
      value,
      'getPresentationProjection',
      'Information Mode Session Host session',
    ),
    destroy,
  });
}

function sessionState(port: ModeSessionPort): string {
  const snapshot = assertPlainRecord(
    call(port.getSnapshot, [], 'Information Mode Session Host session snapshot'),
    'Information Mode Session Host session snapshot',
  );
  const state = dataField(
    snapshot,
    'state',
    'Information Mode Session Host session snapshot',
  );
  if (typeof state !== 'string' || state.length === 0) {
    throw new TypeError('Information Mode Session Host session state无效。');
  }
  return state;
}

function factoryRequest(
  generation: number,
  modeKind: ArenaV2InformationNavigationModeKindV1,
): ArenaV2InformationModeSessionFactoryRequestCandidateV1 {
  const value = Object.freeze({ schemaVersion: 1 as const, generation, modeKind });
  exact(value, FACTORY_REQUEST_KEYS, 'Information Mode Session Host factory request');
  return value;
}

/**
 * Owns the join between the eleven-page navigation session and one future
 * Mode/Learning session. It never owns rules, selection content, result data or
 * profile writes; those stay in the per-generation session created by the
 * explicit factory.
 */
export class ArenaV2InformationModeSessionHostCandidateV1 {
  readonly #navigation: ArenaV2InformationNavigationSessionV1;
  readonly #createSession: PortMethod;
  #session: ModeSessionPort | null = null;
  #pendingSessionDestroy: PortMethod | null = null;
  #state: ArenaV2InformationModeSessionHostStateCandidateV1 = 'created';
  #generation = 0;
  #selectedModeKind: ArenaV2InformationNavigationModeKindV1 | null = null;
  #modeSessionState: string | null = null;
  #pendingSettlementNavigation: ArenaV2InformationNavigationOutcomeV1 | null = null;
  #operation: InformationModeSessionHostOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #navigationDestroyed = false;

  constructor(value: unknown) {
    const source = exact(value, OPTION_KEYS, 'Information Mode Session Host options');
    const registry = dataField(source, 'registry', 'Information Mode Session Host options');
    if (!(registry instanceof ArenaV2InformationScreenRegistryV1)) {
      throw new TypeError('Information Mode Session Host需要受支持的11页Registry。');
    }
    this.#createSession = dataMethod(
      dataField(source, 'sessionFactory', 'Information Mode Session Host options'),
      'createSession',
      'Information Mode Session Host sessionFactory',
    );
    this.#navigation = new ArenaV2InformationNavigationSessionV1({ registry });
  }

  get state(): ArenaV2InformationModeSessionHostStateCandidateV1 {
    this.#assertNoOperation('state-read');
    return this.#state;
  }

  #rejectReentry(operation: string): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `Information Mode Session Host操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) this.#rejectReentry(operation);
  }

  #beginOperation(
    operation: InformationModeSessionHostOperation,
    allowed: readonly ArenaV2InformationModeSessionHostStateCandidateV1[] | null,
  ): void {
    this.#assertNoOperation(operation);
    if (allowed !== null && !allowed.includes(this.#state)) {
      throw new Error(`Information Mode Session Host状态${this.#state}拒绝当前操作。`);
    }
    this.#operation = operation;
    this.#reentryError = null;
  }

  #runOperation<T>(
    operation: InformationModeSessionHostOperation,
    allowed: readonly ArenaV2InformationModeSessionHostStateCandidateV1[] | null,
    action: () => T,
  ): T {
    this.#beginOperation(operation, allowed);
    const reentrySequence = this.#reentrySequence;
    let failed = false;
    let failureValue: unknown = null;
    let result!: T;
    try {
      result = action();
    } catch (error) {
      failed = true;
      failureValue = error;
    } finally {
      this.#operation = null;
    }
    const reentryError = this.#reentrySequence === reentrySequence
      ? null
      : this.#reentryError
        ?? new Error(`Information Mode Session Host ${operation}发生被吞掉的重入。`);
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#state = 'failed';
      throw failed && failureValue !== reentryError
        ? new AggregateError(
          [failureValue, reentryError],
          `Information Mode Session Host ${operation}失败且同步重入。`,
        )
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #destroySession(): Error[] {
    const current = this.#session;
    const pendingDestroy = this.#pendingSessionDestroy;
    if (current === null && pendingDestroy === null) {
      this.#selectedModeKind = null;
      this.#modeSessionState = null;
      this.#pendingSettlementNavigation = null;
      return [];
    }
    try {
      call(
        current?.destroy ?? pendingDestroy!,
        [],
        current === null
          ? 'Information Mode Session Host pending session destroy'
          : 'Information Mode Session Host session destroy',
      );
      this.#session = null;
      this.#pendingSessionDestroy = null;
      this.#selectedModeKind = null;
      this.#modeSessionState = null;
      this.#pendingSettlementNavigation = null;
      this.#assertCurrentOperationCommit('Information Mode Session Host session destroy');
      return [];
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      return [wrapped(error, 'Information Mode Session Host session清理失败。')];
    }
  }

  #cleanup(): Error[] {
    const errors = this.#destroySession();
    if (!this.#navigationDestroyed) {
      try {
        this.#navigation.destroy();
        this.#assertCurrentOperationCommit('Information Mode Session Host navigation destroy');
        this.#navigationDestroyed = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(wrapped(error, 'Information Mode Session Host navigation清理失败。'));
      }
    }
    return errors;
  }

  #cleanupComplete(): boolean {
    return this.#session === null
      && this.#pendingSessionDestroy === null
      && this.#navigationDestroyed;
  }

  #fail(error: unknown): never {
    this.#state = 'failed';
    if (this.#reentryError !== null) throw error;
    const cleanupErrors = this.#cleanup();
    throw combineCleanupFailure(
      wrapped(error, 'Information Mode Session Host失败关闭。'),
      cleanupErrors,
      'Information Mode Session Host失败且清理不完整。',
    );
  }

  #assertCurrentOperationCommit(operation: string): void {
    if (this.#operation === null) throw new Error(`${operation}缺少当前操作所有权。`);
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #requireSession(operation: string): ModeSessionPort {
    if (this.#session === null || this.#selectedModeKind === null) {
      throw new Error(`${operation}缺少当前Mode Session。`);
    }
    return this.#session;
  }

  #assertResultSettlementReady(operation: string): void {
    if (this.#state === 'result' && this.#modeSessionState !== 'settled') {
      throw new Error(`${operation}拒绝待恢复结算；必须先完成当前Session结算。`);
    }
  }

  #startModeSession(
    modeKind: ArenaV2InformationNavigationModeKindV1,
  ): Readonly<{ readonly matchStart: unknown; readonly matchPresentation: unknown }> {
    const oldSessionErrors = this.#destroySession();
    if (oldSessionErrors.length > 0) {
      throw combineCleanupFailure(
        new Error('Information Mode Session Host不能替换旧Session。'),
        oldSessionErrors,
        'Information Mode Session Host旧Session清理不完整。',
      );
    }
    this.#assertCurrentOperationCommit('Information Mode Session Host旧Session destroy');
    const nextGeneration = assertIntegerAtLeast(
      this.#generation + 1,
      1,
      'Information Mode Session Host generation',
    );
    const rawSession = call(
      this.#createSession,
      [factoryRequest(nextGeneration, modeKind)],
      'Information Mode Session Host createSession',
    );
    const destroy = dataMethod(
      rawSession,
      'destroy',
      'Information Mode Session Host pending session',
    );
    this.#pendingSessionDestroy = destroy;
    this.#assertCurrentOperationCommit('Information Mode Session Host createSession');
    const port = createModeSessionPort(rawSession, destroy);
    this.#session = port;
    this.#pendingSessionDestroy = null;
    this.#selectedModeKind = modeKind;
    const startOutcome = call(port.start, [], 'Information Mode Session Host session start');
    this.#assertCurrentOperationCommit('Information Mode Session Host session start');
    const observedState = sessionState(port);
    this.#assertCurrentOperationCommit('Information Mode Session Host session start snapshot');
    if (startOutcome === undefined || observedState !== 'running') {
      throw new Error('Information Mode Session Host新Session未进入running。');
    }
    this.#generation = nextGeneration;
    this.#modeSessionState = observedState;
    this.#state = 'match-running';
    const matchPresentation = port.getPresentationProjection === null
      ? null
      : call(
        port.getPresentationProjection,
        [],
        'Information Mode Session Host initial presentation projection',
      );
    this.#assertCurrentOperationCommit('Information Mode Session Host initial presentation projection');
    if (matchPresentation === undefined) {
      throw new Error('Information Mode Session Host initial presentation projection无结果。');
    }
    return Object.freeze({ matchStart: startOutcome, matchPresentation });
  }

  #releaseSettledSession(): void {
    const session = this.#session;
    if (session === null) return;
    if (this.#modeSessionState !== 'settled') {
      throw new Error('Information Mode Session Host只能从结果页释放settled Session。');
    }
    const errors = this.#destroySession();
    if (errors.length > 0) {
      throw combineCleanupFailure(
        new Error('Information Mode Session Host结果Session释放失败。'),
        errors,
        'Information Mode Session Host结果Session释放不完整。',
      );
    }
    this.#assertCurrentOperationCommit('Information Mode Session Host结果Session destroy');
  }

  #informationOutcome(
    navigation: ArenaV2InformationNavigationOutcomeV1,
  ): ArenaV2InformationModeSessionHostNavigationOutcomeCandidateV1 {
    if (this.#state === 'result') this.#releaseSettledSession();
    this.#state = 'information';
    return Object.freeze({
      navigation,
      matchStart: null,
      matchPresentation: null,
      snapshot: this.#snapshot(),
    });
  }

  start(value: unknown): ArenaV2InformationModeSessionHostSnapshotCandidateV1 {
    return this.#runOperation('start', ['created'], () => {
      const source = exact(value, START_KEYS, 'Information Mode Session Host start');
      this.#navigation.start({
        initialScreenId: dataField(source, 'initialScreenId', 'Information Mode Session Host start'),
      });
      this.#assertCurrentOperationCommit('Information Mode Session Host navigation start');
      this.#state = 'information';
      return this.#snapshot();
    });
  }

  loadingReady(value: unknown): ArenaV2InformationModeSessionHostNavigationOutcomeCandidateV1 {
    return this.#runOperation('loading-ready', ['information'], () => {
      const navigation = this.#navigation.loadingReady(value);
      this.#assertCurrentOperationCommit('Information Mode Session Host loadingReady');
      return this.#informationOutcome(navigation);
    });
  }

  openDeclaredLink(value: unknown): ArenaV2InformationModeSessionHostNavigationOutcomeCandidateV1 {
    return this.#runOperation('open-declared-link', ['information', 'result'], () => {
      const beforeRevision = this.#navigation.getSnapshot().revision;
      this.#assertCurrentOperationCommit('Information Mode Session Host declared link before snapshot');
      try {
        this.#assertResultSettlementReady('Information Mode Session Host openDeclaredLink');
        const navigation = this.#navigation.openDeclaredLink(value);
        this.#assertCurrentOperationCommit('Information Mode Session Host openDeclaredLink');
        return this.#informationOutcome(navigation);
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        const afterRevision = this.#navigation.getSnapshot().revision;
        this.#assertCurrentOperationCommit('Information Mode Session Host declared link after snapshot');
        if (afterRevision === beforeRevision) throw error;
        return this.#fail(error);
      }
    });
  }

  openBottomNavigation(value: unknown): ArenaV2InformationModeSessionHostNavigationOutcomeCandidateV1 {
    return this.#runOperation('open-bottom-navigation', ['information', 'result'], () => {
      const beforeRevision = this.#navigation.getSnapshot().revision;
      this.#assertCurrentOperationCommit('Information Mode Session Host bottom navigation before snapshot');
      try {
        this.#assertResultSettlementReady('Information Mode Session Host openBottomNavigation');
        const navigation = this.#navigation.openBottomNavigation(value);
        this.#assertCurrentOperationCommit('Information Mode Session Host openBottomNavigation');
        return this.#informationOutcome(navigation);
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        const afterRevision = this.#navigation.getSnapshot().revision;
        this.#assertCurrentOperationCommit('Information Mode Session Host bottom navigation after snapshot');
        if (afterRevision === beforeRevision) throw error;
        return this.#fail(error);
      }
    });
  }

  dispatchPrimaryIntent(
    value: unknown,
  ): ArenaV2InformationModeSessionHostNavigationOutcomeCandidateV1 {
    return this.#runOperation('dispatch-primary-intent', ['information', 'result'], () => {
      const beforeRevision = this.#navigation.getSnapshot().revision;
      this.#assertCurrentOperationCommit('Information Mode Session Host primary before snapshot');
      this.#assertResultSettlementReady('Information Mode Session Host dispatchPrimaryIntent');
      let navigation: ArenaV2InformationNavigationOutcomeV1;
      try {
        navigation = this.#navigation.dispatchPrimaryIntent(value);
        this.#assertCurrentOperationCommit('Information Mode Session Host dispatchPrimaryIntent');
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        const afterRevision = this.#navigation.getSnapshot().revision;
        this.#assertCurrentOperationCommit('Information Mode Session Host primary after snapshot');
        if (afterRevision === beforeRevision) throw error;
        return this.#fail(error);
      }
      if (navigation.command !== 'start-match') {
        try {
          return this.#informationOutcome(navigation);
        } catch (error) {
          return this.#fail(error);
        }
      }
      if (navigation.selectedModeKind === null) {
        return this.#fail(new Error('Information Mode Session Host开局缺少模式身份。'));
      }
      try {
        const started = this.#startModeSession(navigation.selectedModeKind);
        return Object.freeze({
          navigation,
          matchStart: started.matchStart,
          matchPresentation: started.matchPresentation,
          snapshot: this.#snapshot(),
        });
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  stepMatch(localInput: unknown): ArenaV2InformationModeSessionHostStepOutcomeCandidateV1 {
    return this.#runOperation('step-match', ['match-running'], () => {
      try {
      const session = this.#requireSession('Information Mode Session Host step');
      const modeStep = call(session.step, [localInput], 'Information Mode Session Host session step');
      this.#assertCurrentOperationCommit('Information Mode Session Host session step');
      const state = sessionState(session);
      this.#assertCurrentOperationCommit('Information Mode Session Host session step snapshot');
      if (state === 'running') {
        this.#state = 'match-running';
      } else if (state === 'reward-pending') {
        this.#state = 'match-settlement-pending';
      } else {
        return this.#fail(new Error(`Information Mode Session Host step后Session状态${state}不闭合。`));
      }
      this.#modeSessionState = state;
      const matchPresentation = session.getPresentationProjection === null
        ? null
        : call(
          session.getPresentationProjection,
          [],
          'Information Mode Session Host step presentation projection',
        );
      this.#assertCurrentOperationCommit('Information Mode Session Host step presentation projection');
      if (matchPresentation === undefined) {
        return this.#fail(new Error(
          'Information Mode Session Host step presentation projection无结果。',
        ));
      }
      return Object.freeze({
        modeStep,
        matchPresentation,
        snapshot: this.#snapshot(),
      });
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  pauseMatch(): ArenaV2InformationModeSessionHostSnapshotCandidateV1 {
    return this.#runOperation('pause-match', ['match-running'], () => {
      try {
      const session = this.#requireSession('Information Mode Session Host pause');
      call(session.pause, [], 'Information Mode Session Host session pause');
      this.#assertCurrentOperationCommit('Information Mode Session Host session pause');
      const observedState = sessionState(session);
      this.#assertCurrentOperationCommit('Information Mode Session Host session pause snapshot');
      if (observedState !== 'paused') {
        return this.#fail(new Error('Information Mode Session Host pause后Session未暂停。'));
      }
      this.#modeSessionState = observedState;
      this.#state = 'match-paused';
      return this.#snapshot();
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  resumeMatch(): ArenaV2InformationModeSessionHostSnapshotCandidateV1 {
    return this.#runOperation('resume-match', ['match-paused'], () => {
      try {
      const session = this.#requireSession('Information Mode Session Host resume');
      call(session.resume, [], 'Information Mode Session Host session resume');
      this.#assertCurrentOperationCommit('Information Mode Session Host session resume');
      const observedState = sessionState(session);
      this.#assertCurrentOperationCommit('Information Mode Session Host session resume snapshot');
      if (observedState !== 'running') {
        return this.#fail(new Error('Information Mode Session Host resume后Session未运行。'));
      }
      this.#modeSessionState = observedState;
      this.#state = 'match-running';
      return this.#snapshot();
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  settleMatch(): ArenaV2InformationModeSessionHostSettlementOutcomeCandidateV1 {
    return this.#runOperation('settle-match', ['match-settlement-pending', 'result'], () => {
      const retryingFromResult = this.#state === 'result';
      try {
      const session = this.#requireSession('Information Mode Session Host settle');
      let settlement: unknown;
      try {
        settlement = call(session.settle, [], 'Information Mode Session Host session settle');
      } catch (error) {
        if (retainsSettlementEvidence(error)) {
          const state = sessionState(session);
          this.#assertCurrentOperationCommit('Information Mode Session Host recoverable settle snapshot');
          if (state !== 'reward-pending' && state !== 'learning-pending') {
            return this.#fail(new Error(
              `Information Mode Session Host可恢复结算后的Session状态${state}不闭合。`,
            ));
          }
          this.#modeSessionState = state;
          if (!retryingFromResult) {
            const navigationSnapshot = this.#navigation.getSnapshot();
            this.#assertCurrentOperationCommit(
              'Information Mode Session Host recoverable navigation snapshot',
            );
            const pendingNavigation = this.#navigation.completeMatch({
              expectedRevision: navigationSnapshot.revision,
            });
            this.#assertCurrentOperationCommit(
              'Information Mode Session Host recoverable navigation complete',
            );
            this.#pendingSettlementNavigation = pendingNavigation;
            this.#state = 'result';
          }
          throw error;
        }
        return this.#fail(error);
      }
      this.#assertCurrentOperationCommit('Information Mode Session Host session settle');
      const observedState = sessionState(session);
      this.#assertCurrentOperationCommit('Information Mode Session Host session settle snapshot');
      if (observedState !== 'settled') {
        return this.#fail(new Error('Information Mode Session Host结算后Session未settled。'));
      }
      this.#modeSessionState = observedState;
      let navigation = this.#pendingSettlementNavigation;
      if (navigation === null) {
        const navigationSnapshot = this.#navigation.getSnapshot();
        this.#assertCurrentOperationCommit('Information Mode Session Host settle navigation snapshot');
        navigation = this.#navigation.completeMatch({
          expectedRevision: navigationSnapshot.revision,
        });
        this.#assertCurrentOperationCommit('Information Mode Session Host settle navigation complete');
      }
      this.#pendingSettlementNavigation = null;
      this.#state = 'result';
      return Object.freeze({
        settlement,
        navigation,
        snapshot: this.#snapshot(),
      });
      } catch (error) {
        if (retainsSettlementEvidence(error)) throw error;
        return this.#fail(error);
      }
    });
  }

  #snapshot(): ArenaV2InformationModeSessionHostSnapshotCandidateV1 {
    const navigation = this.#navigation.getSnapshot();
    this.#assertCurrentOperationCommit('Information Mode Session Host navigation snapshot');
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      state: this.#state,
      generation: this.#generation,
      selectedModeKind: this.#selectedModeKind,
      navigation,
      modeSessionState: this.#modeSessionState,
    });
  }

  getSnapshot(): ArenaV2InformationModeSessionHostSnapshotCandidateV1 {
    return this.#runOperation('snapshot-read', null, () => this.#snapshot());
  }

  getMatchInputContext(): ArenaV2InformationModeSessionHostInputContextCandidateV1 {
    return this.#runOperation('input-context-read', null, () => {
      if (
        this.#state !== 'match-running'
        && this.#state !== 'match-paused'
        && this.#state !== 'match-settlement-pending'
      ) {
        throw new Error(`Information Mode Session Host状态${this.#state}没有输入上下文。`);
      }
      const session = this.#requireSession('Information Mode Session Host input context');
      if (session.getPresentationProjection === null) {
        throw new Error('Information Mode Session Host输入上下文缺少权威表现投影。');
      }
      const projection = call(
        session.getPresentationProjection,
        [],
        'Information Mode Session Host input context projection',
      );
      this.#assertCurrentOperationCommit('Information Mode Session Host input context projection');
      if (projection === null || projection === undefined) {
        throw new Error('Information Mode Session Host输入上下文投影不可用。');
      }
      const snapshotValue = call(
        dataMethod(
          projection,
          'getSnapshot',
          'Information Mode Session Host input context projection',
        ),
        [],
        'Information Mode Session Host input context projection snapshot',
      );
      this.#assertCurrentOperationCommit(
        'Information Mode Session Host input context projection snapshot',
      );
      const snapshot = assertPlainRecord(
        snapshotValue,
        'Information Mode Session Host input context projection snapshot',
      );
      const tick = assertIntegerAtLeast(
        dataField(
          snapshot,
          'tick',
          'Information Mode Session Host input context projection snapshot',
        ),
        0,
        'Information Mode Session Host input context tick',
      );
      const localParticipantId = dataField(
        snapshot,
        'localParticipantId',
        'Information Mode Session Host input context projection snapshot',
      );
      if (typeof localParticipantId !== 'string' || localParticipantId.length === 0) {
        throw new TypeError('Information Mode Session Host input context participant无效。');
      }
      if (this.#selectedModeKind === null) {
        throw new Error('Information Mode Session Host input context缺少模式身份。');
      }
      return Object.freeze({
        schemaVersion: 1 as const,
        status: 'production-unreachable' as const,
        generation: this.#generation,
        modeKind: this.#selectedModeKind,
        state: this.#state === 'match-running'
          ? 'running' as const
          : this.#state === 'match-paused'
            ? 'paused' as const
            : 'settlement-pending' as const,
        tick,
        localParticipantId,
      });
    });
  }

  /**
   * Candidate-only read port for isolated input agents. The returned scene is
   * the same renderer-neutral, authority-audited projection already owned by
   * the current HUD step. The host does not infer affordances or legal routes.
   */
  getMatchSceneReadFrameCandidateV1(): ArenaV2MatchSceneReadFrameCandidateV1 {
    return this.#runOperation('scene-frame-read', null, () => {
      if (
        this.#state !== 'match-running'
        && this.#state !== 'match-paused'
        && this.#state !== 'match-settlement-pending'
      ) {
        throw new Error(`Information Mode Session Host状态${this.#state}没有Scene Frame。`);
      }
      const session = this.#requireSession('Information Mode Session Host scene frame');
      if (session.getPresentationProjection === null) {
        throw new Error('Information Mode Session Host Scene Frame缺少权威表现投影。');
      }
      const projection = call(
        session.getPresentationProjection,
        [],
        'Information Mode Session Host scene frame projection',
      );
      this.#assertCurrentOperationCommit('Information Mode Session Host scene frame projection');
      if (projection === null || projection === undefined) {
        throw new Error('Information Mode Session Host Scene Frame投影不可用。');
      }
      const scene = call(
        dataMethod(
          projection,
          'getSceneReadFrame',
          'Information Mode Session Host scene frame projection',
        ),
        [],
        'Information Mode Session Host scene frame read',
      );
      this.#assertCurrentOperationCommit('Information Mode Session Host scene frame read');
      if (typeof scene !== 'object' || scene === null || Array.isArray(scene)) {
        throw new TypeError('Information Mode Session Host Scene Frame无效。');
      }
      if (
        dataField(scene, 'schemaVersion', 'Information Mode Session Host Scene Frame') !== 1
        || dataField(scene, 'status', 'Information Mode Session Host Scene Frame')
          !== 'production-unreachable'
      ) throw new RangeError('Information Mode Session Host Scene Frame身份无效。');
      return scene as ArenaV2MatchSceneReadFrameCandidateV1;
    });
  }

  destroy(): void {
    this.#assertNoOperation('destroy');
    if (this.#state === 'destroyed') return;
    this.#runOperation('destroy', [
      'created', 'information', 'match-running', 'match-paused',
      'match-settlement-pending', 'result', 'failed',
    ], () => {
      const errors = this.#cleanup();
      if (errors.length > 0 || !this.#cleanupComplete()) {
        this.#state = 'failed';
        throw combineCleanupFailure(
          new Error('Information Mode Session Host销毁失败。'),
          errors.length > 0
            ? errors
            : [new Error('Information Mode Session Host销毁资源未收敛。')],
          'Information Mode Session Host销毁清理不完整。',
        );
      }
      this.#state = 'destroyed';
    });
  }
}

export const ARENA_V2_INFORMATION_MODE_SESSION_HOST_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  ownsRuleOrMatchAuthority: false as const,
  recoverableSettlementEntersReadOnlyResultBeforeRetry: true as const,
  recoverableSettlementRetainsModeSessionUntilSettled: true as const,
  restartRequiredSettlementRetainsReadOnlyResultForCrossRestartRecovery: true as const,
  genericRecoverableFlagsFailClosed: true as const,
  ownsSelectionOrResultData: false as const,
  settledResultFactsVisibleOnlyAfterRewardAndLearningSettlement: true as const,
  pendingSettlementStatusMayUseExistingResultPage: true as const,
  failedCrossOwnerTransitionClosesBothOwners: true as const,
  sessionFactoryPortPreflightsBeforeNavigationConstruction: true as const,
  cleanupRetriesOnlyIncompleteSessionAndNavigationOwners: true as const,
  terminalStateWaitsForSessionAndNavigationOwners: true as const,
  returnedSessionDestroyCapturedBeforeBusinessPortTransfer: true as const,
  failedPortCaptureRetainsPendingSessionCleanupOwnership: true as const,
  allBusinessAndExternalReadsUseStickyOperationGuard: true as const,
  swallowedNavigationSessionOrProjectionReentryFailsClosed: true as const,
  publicStateAndSnapshotRejectOperationIntermediateState: true as const,
  destroyFastPathChecksOperationBeforeIdempotence: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  navigationSessionAndProjectionCallbacksCheckedBeforeHostCommit: true as const,
  cleanupReentryRetainsCurrentAndLaterSessionOwners: true as const,
  successfulCurrentSessionDestroyCommitsBeforeStickyReentry: true as const,
  stickyDestroyReentryRetainsLaterNavigationOwner: true as const,
  validationStatus: 'not-run' as const,
});
