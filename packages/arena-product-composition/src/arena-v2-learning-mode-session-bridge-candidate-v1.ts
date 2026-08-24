import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn,
  combineCleanupFailure,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  resolveArenaV2ProfilePersistenceDispositionCandidateV1,
} from './arena-v2-profile-persistence-disposition-candidate-v1.js';

export const ARENA_V2_LEARNING_MODE_SESSION_BRIDGE_STATE_CANDIDATE_V1 = Object.freeze({
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  REWARD_PENDING: 'reward-pending',
  LEARNING_PENDING: 'learning-pending',
  SETTLED: 'settled',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ArenaV2LearningModeSessionBridgeStateCandidateV1 =
  typeof ARENA_V2_LEARNING_MODE_SESSION_BRIDGE_STATE_CANDIDATE_V1[
    keyof typeof ARENA_V2_LEARNING_MODE_SESSION_BRIDGE_STATE_CANDIDATE_V1
  ];

export interface ArenaV2LearningModeSessionBridgeSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly state: ArenaV2LearningModeSessionBridgeStateCandidateV1;
  readonly sessionState: string;
  readonly learningHandoffState: string;
  readonly terminalResultCaptured: boolean;
  readonly rewardCommitted: boolean;
  readonly learningCommitted: boolean;
}

export interface ArenaV2LearningModeSessionBridgeSettlementCandidateV1 {
  readonly reward: unknown;
  readonly learning: unknown;
  readonly snapshot: ArenaV2LearningModeSessionBridgeSnapshotCandidateV1;
}

export class ArenaV2LearningSettlementPendingErrorCandidateV1 extends Error {
  readonly recoverable = true;
  readonly restartRequired = false;
  readonly phase = 'post-reward-learning' as const;

  constructor(cause: unknown) {
    super('Arena奖励已提交，Learning结算仍待恢复。', { cause });
    this.name = 'ArenaV2LearningSettlementPendingErrorCandidateV1';
  }
}

export class ArenaV2RewardSettlementPendingErrorCandidateV1 extends Error {
  readonly recoverable = true;
  readonly restartRequired = false;
  readonly phase = 'reward-write' as const;

  constructor(cause: unknown) {
    super('Arena奖励结算遇到可恢复持久化冲突，仍待安全重试。', { cause });
    this.name = 'ArenaV2RewardSettlementPendingErrorCandidateV1';
  }
}

export class ArenaV2SettlementRestartRequiredErrorCandidateV1 extends Error {
  readonly recoverable = false;
  readonly restartRequired = true;
  readonly phase: 'reward-write' | 'post-reward-learning';

  constructor(
    phase: 'reward-write' | 'post-reward-learning',
    cause: unknown,
  ) {
    super(
      phase === 'reward-write'
        ? 'Arena奖励写入结果不能在当前进程安全确认，必须重启恢复。'
        : 'Arena成长写入结果不能在当前进程安全确认，必须重启恢复。',
      { cause },
    );
    this.name = 'ArenaV2SettlementRestartRequiredErrorCandidateV1';
    this.phase = phase;
  }
}

type PortMethod = (...args: readonly unknown[]) => unknown;

type LearningModeSessionBridgeOperation =
  | 'start'
  | 'step'
  | 'pause'
  | 'resume'
  | 'settle'
  | 'snapshot-read'
  | 'destroy';

interface SessionPort {
  readonly start: PortMethod;
  readonly step: PortMethod;
  readonly pause: PortMethod;
  readonly resume: PortMethod;
  readonly prepareReward: PortMethod;
  readonly settleReward: PortMethod;
  readonly getTerminalRuntimeEvidenceV2: PortMethod;
  readonly getSnapshot: PortMethod;
  readonly destroy: PortMethod;
}

interface LearningHandoffPort {
  readonly appendEvents: PortMethod;
  readonly bindRuntimeTerminalEvidenceV3: PortMethod;
  readonly prepareBound: PortMethod;
  readonly settleBound: PortMethod;
  readonly getSnapshot: PortMethod;
  readonly destroy: PortMethod;
}

const OPTION_KEYS = new Set(['session', 'learningHandoff', 'onSettlementIntentPrepared']);
const OPTION_REQUIRED_KEYS = new Set(['session', 'learningHandoff']);
const START_KEYS = new Set([
  'readFrame', 'readFrameAudit', 'supplyCadence', 'localJumpAvailability',
]);
const STEP_OUTCOME_KEYS = new Set(['matchStep', 'snapshot']);
const MATCH_STEP_KEYS = new Set([
  'events', 'supplyFacts', 'supplyCadence', 'readFrame', 'readFrameAudit', 'inputs', 'result',
  'weaponFeedbackDirectionFactsV2',
  'localJumpAvailability',
]);
const MATCH_STEP_REQUIRED_KEYS = new Set([
  'events', 'supplyFacts', 'supplyCadence', 'readFrame', 'readFrameAudit', 'inputs', 'result',
  'weaponFeedbackDirectionFactsV2', 'localJumpAvailability',
]);
const SESSION_SNAPSHOT_KEYS = new Set([
  'schemaVersion', 'modeDefinitionId', 'state', 'result', 'reward',
]);
const LEARNING_HANDOFF_SNAPSHOT_KEYS = new Set([
  'schemaVersion', 'status', 'state', 'eventCount', 'firstSequence',
  'lastSequence', 'terminalTick', 'settlementCommitted', 'settlementDuplicate',
]);
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

function exactWithRequired(
  value: unknown,
  keys: ReadonlySet<string>,
  requiredKeys: ReadonlySet<string>,
  name: string,
): PlainRecord {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
  for (const key of requiredKeys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}.${key}缺失。`);
  }
  return source;
}

function field(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function method(target: unknown, key: string, name: string): PortMethod {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${name}.${key}不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${name}原型链无效。`);
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

function call(portMethod: PortMethod, args: readonly unknown[], name: string): unknown {
  const value = portMethod(...args);
  assertSynchronousReturn(value, name);
  return value;
}

function createSessionPort(value: unknown): SessionPort {
  const destroy = method(value, 'destroy', 'Learning Mode Session Bridge session');
  return Object.freeze({
    start: method(value, 'start', 'Learning Mode Session Bridge session'),
    step: method(value, 'step', 'Learning Mode Session Bridge session'),
    pause: method(value, 'pause', 'Learning Mode Session Bridge session'),
    resume: method(value, 'resume', 'Learning Mode Session Bridge session'),
    prepareReward: method(value, 'prepareReward', 'Learning Mode Session Bridge session'),
    settleReward: method(value, 'settleReward', 'Learning Mode Session Bridge session'),
    getTerminalRuntimeEvidenceV2: method(
      value,
      'getTerminalRuntimeEvidenceV2',
      'Learning Mode Session Bridge session',
    ),
    getSnapshot: method(value, 'getSnapshot', 'Learning Mode Session Bridge session'),
    destroy,
  });
}

function createLearningHandoffPort(value: unknown): LearningHandoffPort {
  const destroy = method(value, 'destroy', 'Learning Mode Session Bridge handoff');
  return Object.freeze({
    appendEvents: method(value, 'appendEvents', 'Learning Mode Session Bridge handoff'),
    bindRuntimeTerminalEvidenceV3: method(
      value,
      'bindRuntimeTerminalEvidenceV3',
      'Learning Mode Session Bridge handoff',
    ),
    prepareBound: method(
      value,
      'prepareBound',
      'Learning Mode Session Bridge handoff',
    ),
    settleBound: method(value, 'settleBound', 'Learning Mode Session Bridge handoff'),
    getSnapshot: method(value, 'getSnapshot', 'Learning Mode Session Bridge handoff'),
    destroy,
  });
}

function wrapped(error: unknown, message: string): Error {
  const result = new Error(message);
  Object.defineProperty(result, 'cause', { value: error, enumerable: false });
  return result;
}

function childState(
  methodValue: PortMethod,
  keys: ReadonlySet<string>,
  name: string,
): string {
  const snapshot = exact(
    call(methodValue, [], `${name}.getSnapshot`),
    keys,
    `${name} snapshot`,
  );
  const state = field(snapshot, 'state', `${name} snapshot`);
  if (typeof state !== 'string' || state.length === 0) {
    throw new TypeError(`${name} snapshot.state无效。`);
  }
  return state;
}

/**
 * Explicit future-session bridge. It is intentionally absent from the default
 * composition. Match events are handed off after each authoritative session
 * step; the learning grant is committed only after normal reward settlement.
 */
export class ArenaV2LearningModeSessionBridgeCandidateV1 {
  readonly #session: SessionPort;
  readonly #learningHandoff: LearningHandoffPort;
  readonly #onSettlementIntentPrepared: PortMethod;
  #state: ArenaV2LearningModeSessionBridgeStateCandidateV1 = 'created';
  #terminalResult: unknown = null;
  #reward: unknown = null;
  #learning: unknown = null;
  #operation: LearningModeSessionBridgeOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #sessionDestroyed = false;
  #learningHandoffDestroyed = false;

  constructor(value: unknown) {
    const source = exactWithRequired(
      value,
      OPTION_KEYS,
      OPTION_REQUIRED_KEYS,
      'Learning Mode Session Bridge options',
    );
    const onSettlementIntentPrepared = Object.hasOwn(source, 'onSettlementIntentPrepared')
      ? field(source, 'onSettlementIntentPrepared', 'Learning Mode Session Bridge options')
      : () => undefined;
    if (typeof onSettlementIntentPrepared !== 'function') {
      throw new TypeError(
        'Learning Mode Session Bridge onSettlementIntentPrepared必须是函数。',
      );
    }
    const session = createSessionPort(
      field(source, 'session', 'Learning Mode Session Bridge options'),
    );
    const learningHandoff = createLearningHandoffPort(
      field(source, 'learningHandoff', 'Learning Mode Session Bridge options'),
    );
    this.#session = session;
    this.#learningHandoff = learningHandoff;
    this.#onSettlementIntentPrepared = onSettlementIntentPrepared as PortMethod;
  }

  get state(): ArenaV2LearningModeSessionBridgeStateCandidateV1 {
    this.#assertNoOperation('state-read');
    return this.#state;
  }

  #rejectReentry(operation: string): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `Learning Mode Session Bridge操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) this.#rejectReentry(operation);
  }

  #beginOperation(
    operation: LearningModeSessionBridgeOperation,
    allowed: readonly ArenaV2LearningModeSessionBridgeStateCandidateV1[] | null,
  ): void {
    this.#assertNoOperation(operation);
    if (allowed !== null && !allowed.includes(this.#state)) {
      throw new Error(`Learning Mode Session Bridge状态${this.#state}拒绝当前操作。`);
    }
    this.#operation = operation;
    this.#reentryError = null;
  }

  #runOperation<T>(
    operation: LearningModeSessionBridgeOperation,
    allowed: readonly ArenaV2LearningModeSessionBridgeStateCandidateV1[] | null,
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
        ?? new Error(`Learning Mode Session Bridge ${operation}发生被吞掉的重入。`);
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#state = 'failed';
      throw failed && failureValue !== reentryError
        ? new AggregateError(
          [failureValue, reentryError],
          `Learning Mode Session Bridge ${operation}失败且同步重入。`,
        )
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #assertCurrentOperationCommit(operation: string): void {
    if (this.#operation === null) throw new Error(`${operation}缺少当前操作所有权。`);
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #callChecked(methodValue: PortMethod, args: readonly unknown[], name: string): unknown {
    try {
      const result = call(methodValue, args, name);
      this.#assertCurrentOperationCommit(name);
      return result;
    } catch (error) {
      this.#assertCurrentOperationCommit(name);
      throw error;
    }
  }

  #cleanup(): Error[] {
    const errors: Error[] = [];
    if (!this.#learningHandoffDestroyed) {
      try {
        this.#callChecked(
          this.#learningHandoff.destroy,
          [],
          'Learning Mode Session Bridge handoff destroy',
        );
        this.#learningHandoffDestroyed = true;
      } catch (error) { errors.push(wrapped(error, 'Learning handoff清理失败。')); }
      if (this.#reentryError !== null) return errors;
    }
    if (!this.#sessionDestroyed) {
      try {
        this.#callChecked(
          this.#session.destroy,
          [],
          'Learning Mode Session Bridge session destroy',
        );
        this.#sessionDestroyed = true;
      } catch (error) { errors.push(wrapped(error, 'Mode session清理失败。')); }
    }
    return errors;
  }

  #fail(error: unknown): never {
    this.#state = 'failed';
    const cleanupErrors = this.#reentryError === null ? this.#cleanup() : [];
    if (this.#reentryError !== null && !cleanupErrors.includes(this.#reentryError)) {
      cleanupErrors.push(this.#reentryError);
    }
    throw combineCleanupFailure(
      wrapped(error, 'Learning Mode Session Bridge失败关闭。'),
      cleanupErrors,
      'Learning Mode Session Bridge失败且清理不完整。',
    );
  }

  #snapshot(): ArenaV2LearningModeSessionBridgeSnapshotCandidateV1 {
    const sessionState = childState(
      this.#session.getSnapshot,
      SESSION_SNAPSHOT_KEYS,
      'Learning Mode Session Bridge session',
    );
    this.#assertCurrentOperationCommit('Learning Mode Session Bridge session snapshot');
    const learningHandoffState = childState(
      this.#learningHandoff.getSnapshot,
      LEARNING_HANDOFF_SNAPSHOT_KEYS,
      'Learning Mode Session Bridge handoff',
    );
    this.#assertCurrentOperationCommit('Learning Mode Session Bridge handoff snapshot');
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      state: this.#state,
      sessionState,
      learningHandoffState,
      terminalResultCaptured: this.#terminalResult !== null,
      rewardCommitted: this.#reward !== null,
      learningCommitted: this.#learning !== null,
    });
  }

  getSnapshot(): ArenaV2LearningModeSessionBridgeSnapshotCandidateV1 {
    return this.#runOperation('snapshot-read', null, () => this.#snapshot());
  }

  start(): unknown {
    return this.#runOperation('start', ['created'], () => {
      try {
        const outcome = this.#callChecked(
          this.#session.start,
          [],
          'Learning Mode Session Bridge start',
        );
        if (outcome === undefined) {
          throw new Error('Learning Mode Session Bridge start没有同步完成。');
        }
        exact(outcome, START_KEYS, 'Learning Mode Session Bridge start outcome');
        this.#state = 'running';
        return outcome;
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  step(localInput: unknown): unknown {
    return this.#runOperation('step', ['running'], () => {
      try {
      const outcome = exact(
        this.#callChecked(
          this.#session.step,
          [localInput],
          'Learning Mode Session Bridge step',
        ),
        STEP_OUTCOME_KEYS,
        'Learning Mode Session Bridge step outcome',
      );
      const matchStep = exactWithRequired(
        field(outcome, 'matchStep', 'Learning Mode Session Bridge step outcome'),
        MATCH_STEP_KEYS,
        MATCH_STEP_REQUIRED_KEYS,
        'Learning Mode Session Bridge matchStep',
      );
      const snapshot = exact(
        field(outcome, 'snapshot', 'Learning Mode Session Bridge step outcome'),
        SESSION_SNAPSHOT_KEYS,
        'Learning Mode Session Bridge session snapshot',
      );
      this.#callChecked(
        this.#learningHandoff.appendEvents,
        [field(matchStep, 'events', 'Learning Mode Session Bridge matchStep')],
        'Learning Mode Session Bridge appendEvents',
      );
      const sessionState = field(snapshot, 'state', 'Learning Mode Session Bridge session snapshot');
      const result = field(snapshot, 'result', 'Learning Mode Session Bridge session snapshot');
      if (sessionState === 'running' && result === null) return outcome;
      if (sessionState !== 'reward-pending' || result === null) {
        throw new RangeError('Learning Mode Session Bridge终局Session状态不闭合。');
      }
      const runtimeEvidence = this.#callChecked(
        this.#session.getTerminalRuntimeEvidenceV2,
        [],
        'Learning Mode Session Bridge terminal Runtime evidence V2',
      );
      this.#callChecked(
        this.#learningHandoff.bindRuntimeTerminalEvidenceV3,
        [result, runtimeEvidence],
        'Learning Mode Session Bridge bind terminal Runtime settlement evidence V3',
      );
      const preparedGrant = this.#callChecked(
        this.#learningHandoff.prepareBound,
        [],
        'Learning Mode Session Bridge prepare Learning Grant',
      );
      const preparedRewardGrant = this.#callChecked(
        this.#session.prepareReward,
        [],
        'Learning Mode Session Bridge prepare Reward Grant',
      );
      this.#callChecked(
        this.#onSettlementIntentPrepared,
        [Object.freeze({
          rewardGrant: preparedRewardGrant,
          learningGrant: preparedGrant,
        })],
        'Learning Mode Session Bridge publish prepared settlement intent',
      );
      this.#terminalResult = result;
      this.#state = 'reward-pending';
      return outcome;
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  pause(): void {
    this.#runOperation('pause', ['running'], () => {
      try {
        this.#callChecked(this.#session.pause, [], 'Learning Mode Session Bridge pause');
        this.#state = 'paused';
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  resume(): void {
    this.#runOperation('resume', ['paused'], () => {
      try {
        this.#callChecked(this.#session.resume, [], 'Learning Mode Session Bridge resume');
        this.#state = 'running';
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  settle(): ArenaV2LearningModeSessionBridgeSettlementCandidateV1 {
    return this.#runOperation('settle', ['reward-pending', 'learning-pending'], () => {
      if (this.#terminalResult === null) {
        throw new Error('Learning Mode Session Bridge缺少终局Result。');
      }
      if (this.#state === 'reward-pending') {
        try {
          this.#reward = this.#callChecked(
            this.#session.settleReward,
            [],
            'Learning Mode Session Bridge settleReward',
          );
        } catch (error) {
          if (error instanceof ArenaV2RewardSettlementPendingErrorCandidateV1
            || error instanceof ArenaV2SettlementRestartRequiredErrorCandidateV1) {
            throw error;
          }
          const disposition = resolveArenaV2ProfilePersistenceDispositionCandidateV1(error);
          if (disposition === 'retry') {
            throw new ArenaV2RewardSettlementPendingErrorCandidateV1(error);
          }
          if (disposition === 'restart') {
            throw new ArenaV2SettlementRestartRequiredErrorCandidateV1(
              'reward-write',
              error,
            );
          }
          return this.#fail(error);
        }
        this.#state = 'learning-pending';
      }
      try {
        this.#learning = this.#callChecked(
          this.#learningHandoff.settleBound,
          [],
          'Learning Mode Session Bridge learning settle',
        );
      } catch (error) {
        // Reward is already durable. Keep the prepared Grant and Runtime
        // evidence owned by the handoff for explicit retry/recovery instead of
        // destroying the only proof of the pending Learning write.
        if (error instanceof ArenaV2LearningSettlementPendingErrorCandidateV1
          || error instanceof ArenaV2SettlementRestartRequiredErrorCandidateV1) {
          throw error;
        }
        const disposition = resolveArenaV2ProfilePersistenceDispositionCandidateV1(error);
        if (disposition === 'retry') {
          throw new ArenaV2LearningSettlementPendingErrorCandidateV1(error);
        }
        if (disposition === 'restart') {
          throw new ArenaV2SettlementRestartRequiredErrorCandidateV1(
            'post-reward-learning',
            error,
          );
        }
        return this.#fail(error);
      }
      this.#state = 'settled';
      try {
        return Object.freeze({
          reward: this.#reward,
          learning: this.#learning,
          snapshot: this.#snapshot(),
        });
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  destroy(): void {
    this.#runOperation('destroy', null, () => {
      if (this.#state === 'destroyed') return;
      const errors = this.#cleanup();
      if (errors.length > 0 || this.#reentryError !== null) {
        this.#state = 'failed';
        throw combineCleanupFailure(
          new Error('Learning Mode Session Bridge销毁失败。'),
          this.#reentryError !== null
            ? [...errors, this.#reentryError]
            : errors,
          'Learning Mode Session Bridge销毁清理不完整。',
        );
      }
      if (!this.#sessionDestroyed || !this.#learningHandoffDestroyed) {
        this.#state = 'failed';
        throw new Error('Learning Mode Session Bridge销毁清理未收敛。');
      }
      this.#terminalResult = null;
      this.#reward = null;
      this.#learning = null;
      this.#state = 'destroyed';
    });
  }
}

export const ARENA_V2_LEARNING_MODE_SESSION_BRIDGE_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSessionWired: false as const,
  settlementOrder: 'mode-reward-then-learning-grant' as const,
  learningGrantPreparedBeforeRewardWrite: true as const,
  rewardGrantPreparedBeforeRewardWrite: true as const,
  completeSettlementIntentPublishedBeforeFirstProfileWrite: true as const,
  constructorTransfersChildrenOnlyAfterAllPortsCaptured: true as const,
  constructionFailureLeavesChildOwnershipWithCaller: true as const,
  postRewardLearningFailureRetainsPendingEvidence: true as const,
  cleanupRetriesOnlyIncompleteChildren: true as const,
  cleanupFailureRetainsTerminalSettlementEvidence: true as const,
  terminalSettlementEvidenceClearsAfterAllChildren: true as const,
  postIntentIndeterminateProfileWriteRequiresRestart: true as const,
  onlyProfilePersistenceErrorsEnterSettlementRecovery: true as const,
  nonRecoverableServiceErrorsWithoutIndeterminateCauseFailClosed: true as const,
  profileSaveConflictFailsClosed: true as const,
  hostileErrorInspectionFailsClosed: true as const,
  sharedPersistenceDispositionResolverWired: true as const,
  sharedSynchronousReturnBoundaryWired: true as const,
  settlementPersistenceDispositionContract: 'retry-restart-fail-closed' as const,
  recoverableLearningRetryDoesNotRepeatReward: true as const,
  allLifecycleSettlementAndSnapshotReadsUseStickyOperationGuard: true as const,
  operationGuardPrecedesBusinessStateValidation: true as const,
  swallowedSessionHandoffOrIntentPublisherReentryFailsClosed: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  childCallbacksCheckedBeforeBridgeStateCommit: true as const,
  cleanupReentryRetainsCurrentAndLaterBridgeOwners: true as const,
  destroyFastPathChecksOperationBeforeIdempotence: true as const,
  consumesAuthorityEventsWithoutReprojection: true as const,
  requiresExplicitPresentationAuditEveryStep: true as const,
  requiresExplicitSupplyCadenceEveryStep: true as const,
  requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true as const,
  requiresExplicitWeaponFeedbackDirectionFactsEveryStep: true as const,
  requiresResultReplayModeDriverIdentityBindingBeforeReward: true as const,
  requiresCompleteSupplyOwnershipBindingBeforeReward: true as const,
  validationStatus: 'not-run' as const,
});
