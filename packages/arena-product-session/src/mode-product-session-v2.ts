import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  combineCleanupFailure,
  createDeterministicDataHash,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type { ProductMatchResultV3 } from '@number-strategy-jump/arena-product-contracts';
import type { ModeProductResultAssemblerV3 } from '@number-strategy-jump/arena-product-match';
import type {
  ModeRewardCommitOutcomeV2,
  ModeRewardCommitterV2,
} from '@number-strategy-jump/arena-product-progression';
import { createRewardGrant } from '@number-strategy-jump/arena-progression';
import type { RewardGrant } from '@number-strategy-jump/arena-progression';
import {
  assertSynchronousModePortResult,
  captureOptionalSynchronousModeDataMethod,
  captureSynchronousModeDataMethod,
  type SynchronousModePortMethod,
} from './synchronous-mode-port-boundary.js';

export const MODE_PRODUCT_SESSION_V2_STATE = Object.freeze({
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  REWARD_PENDING: 'reward-pending',
  SETTLED: 'settled',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ModeProductSessionV2State = typeof MODE_PRODUCT_SESSION_V2_STATE[
  keyof typeof MODE_PRODUCT_SESSION_V2_STATE
];

export interface ModeProductMatchSessionPortV2 {
  start(): unknown;
  step(localInput: unknown): unknown;
  pause(): void;
  resume(): void;
  getTerminalReplayV6?(): unknown;
  getTerminalRuntimeEvidenceV1?(): unknown;
  getTerminalRuntimeEvidenceV2?(): unknown;
  destroy(): void;
}

export interface ModeProductSessionV2Options {
  readonly modeDefinitionId: string;
  readonly matchSession: ModeProductMatchSessionPortV2;
  readonly resultAssembler: ModeProductResultAssemblerV3;
  readonly rewardCommitter: ModeRewardCommitterV2;
}

export interface ModeProductSessionV2Snapshot {
  readonly schemaVersion: 2;
  readonly modeDefinitionId: string;
  readonly state: ModeProductSessionV2State;
  readonly result: ProductMatchResultV3 | null;
  readonly reward: ModeRewardCommitOutcomeV2 | null;
}

export interface ModeProductSessionV2StepOutcome {
  readonly matchStep: unknown;
  readonly snapshot: ModeProductSessionV2Snapshot;
}

export const MODE_PRODUCT_SESSION_V2_CONSTRUCTION_OWNERSHIP = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  constructorTransfersChildrenOnlyAfterAllPortsCaptured: true,
  constructionFailureLeavesChildOwnershipWithCaller: true,
  validationStatus: 'not-run',
} as const);

export const MODE_PRODUCT_SESSION_V2_LIFECYCLE_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  operationGuardPrecedesBusinessStateValidation: true,
  matchAssemblerAndRewardCallsCheckedBeforeCrossOwnerProgress: true,
  publicStateAndSnapshotRejectOperationIntermediateState: true,
  swallowedMatchAssemblerOrRewardReentryFailsClosed: true,
  stickyReentryUsesSequenceAndFirstError: true,
  cleanupCallbacksCheckedBeforeOwnershipRelease: true,
  swallowedCleanupReentryStopsLaterOwners: true,
  destroyFastPathChecksOperationBeforeIdempotence: true,
  requiresExplicitPresentationAuditEveryStep: true,
  requiresExplicitSupplyCadenceEveryStep: true,
  requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true,
  requiresExplicitWeaponFeedbackDirectionFactsEveryStep: true,
  requiredStepFieldsValidatedBeforeAssembler: true,
  validationStatus: 'not-run',
} as const);

type PortMethod = SynchronousModePortMethod;
type ModeProductSessionV2Operation =
  | 'start'
  | 'step'
  | 'pause'
  | 'resume'
  | 'prepare-reward'
  | 'settle-reward'
  | 'terminal-replay-read'
  | 'terminal-runtime-evidence-read'
  | 'terminal-runtime-evidence-v2-read'
  | 'destroy';
interface MatchPort {
  readonly start: PortMethod;
  readonly step: PortMethod;
  readonly pause: PortMethod;
  readonly resume: PortMethod;
  readonly getTerminalReplayV6: PortMethod | null;
  readonly getTerminalRuntimeEvidenceV1: PortMethod | null;
  readonly getTerminalRuntimeEvidenceV2: PortMethod | null;
  readonly destroy: PortMethod;
}
interface AssemblerPort {
  readonly appendEvents: PortMethod;
  readonly finalize: PortMethod;
  readonly destroy: PortMethod;
}
interface RewardPort {
  readonly prepare: PortMethod;
  readonly commit: PortMethod;
}

const OPTION_KEYS = new Set([
  'modeDefinitionId', 'matchSession', 'resultAssembler', 'rewardCommitter',
]);
const START_KEYS = new Set([
  'readFrame', 'readFrameAudit', 'supplyCadence', 'localJumpAvailability',
]);
const STEP_KEYS = new Set([
  'events', 'supplyFacts', 'supplyCadence', 'readFrame', 'readFrameAudit', 'inputs', 'result',
  'weaponFeedbackDirectionFactsV2',
  'localJumpAvailability',
]);
const REQUIRED_STEP_KEYS = new Set([
  'events', 'supplyFacts', 'supplyCadence', 'readFrame', 'readFrameAudit', 'inputs', 'result',
  'weaponFeedbackDirectionFactsV2', 'localJumpAvailability',
]);
const REWARD_KEYS = new Set(['grant', 'committed', 'duplicate', 'profile']);

function safelyWrapThrownError(value: unknown, message: string): Error {
  const error = new Error(message);
  Object.defineProperty(error, 'cause', {
    value,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return error;
}

function requireKeys(value: PlainRecord, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) ownDataField(value, key, name);
}

function ownDataField(value: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function createMatchPort(value: unknown, destroy: PortMethod): MatchPort {
  const ownerName = 'ModeProductSessionV2 matchSession';
  return Object.freeze({
    start: captureSynchronousModeDataMethod(value, 'start', ownerName),
    step: captureSynchronousModeDataMethod(value, 'step', ownerName),
    pause: captureSynchronousModeDataMethod(value, 'pause', ownerName),
    resume: captureSynchronousModeDataMethod(value, 'resume', ownerName),
    getTerminalReplayV6: captureOptionalSynchronousModeDataMethod(
      value,
      'getTerminalReplayV6',
      ownerName,
    ),
    getTerminalRuntimeEvidenceV1: captureOptionalSynchronousModeDataMethod(
      value,
      'getTerminalRuntimeEvidenceV1',
      ownerName,
    ),
    getTerminalRuntimeEvidenceV2: captureOptionalSynchronousModeDataMethod(
      value,
      'getTerminalRuntimeEvidenceV2',
      ownerName,
    ),
    destroy,
  });
}

function createAssemblerPort(value: unknown, destroy: PortMethod): AssemblerPort {
  const ownerName = 'ModeProductSessionV2 resultAssembler';
  return Object.freeze({
    appendEvents: captureSynchronousModeDataMethod(value, 'appendEvents', ownerName),
    finalize: captureSynchronousModeDataMethod(value, 'finalize', ownerName),
    destroy,
  });
}

function createRewardPort(value: unknown): RewardPort {
  return Object.freeze({
    prepare: captureSynchronousModeDataMethod(
      value,
      'prepare',
      'ModeProductSessionV2 rewardCommitter',
    ),
    commit: captureSynchronousModeDataMethod(
      value,
      'commit',
      'ModeProductSessionV2 rewardCommitter',
    ),
  });
}

function recoverable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, 'recoverable');
    return Boolean(descriptor && 'value' in descriptor && descriptor.value === true);
  } catch {
    return false;
  }
}

function assertSynchronous<T>(value: T, name: string): T {
  return assertSynchronousModePortResult(value, name);
}

function normalizeReward(
  value: unknown,
  result: ProductMatchResultV3,
): ModeRewardCommitOutcomeV2 {
  const source = cloneFrozenData(value, 'ModeProductSessionV2 reward outcome');
  assertKnownKeys(source, REWARD_KEYS, 'ModeProductSessionV2 reward outcome');
  requireKeys(source, REWARD_KEYS, 'ModeProductSessionV2 reward outcome');
  if (typeof source.committed !== 'boolean' || typeof source.duplicate !== 'boolean') {
    throw new TypeError('ModeProductSessionV2 reward状态必须是布尔值。');
  }
  if (source.committed === source.duplicate) {
    throw new RangeError('ModeProductSessionV2 reward必须且只能是committed或duplicate。');
  }
  const grant = createRewardGrant(source.grant);
  if (grant.resultAuthorityHash !== result.authorityHash) {
    throw new RangeError('ModeProductSessionV2 reward与终局Result权威身份不一致。');
  }
  assertPlainRecord(source.profile, 'ModeProductSessionV2 reward profile');
  return Object.freeze({
    grant,
    committed: source.committed,
    duplicate: source.duplicate,
    profile: source.profile,
  }) as unknown as ModeRewardCommitOutcomeV2;
}

function sameData(left: unknown, right: unknown): boolean {
  return createDeterministicDataHash(left, 'ModeProductSessionV2 comparison left')
    === createDeterministicDataHash(right, 'ModeProductSessionV2 comparison right');
}

export class ModeProductSessionV2 {
  readonly #modeDefinitionId: string;
  #match: MatchPort | null;
  #assembler: AssemblerPort | null;
  readonly #reward: RewardPort;
  #state: ModeProductSessionV2State = MODE_PRODUCT_SESSION_V2_STATE.CREATED;
  #result: ProductMatchResultV3 | null = null;
  #rewardOutcome: ModeRewardCommitOutcomeV2 | null = null;
  #operation: ModeProductSessionV2Operation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(options: ModeProductSessionV2Options);
  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'ModeProductSessionV2 options');
    assertKnownKeys(source, OPTION_KEYS, 'ModeProductSessionV2 options');
    requireKeys(source, OPTION_KEYS, 'ModeProductSessionV2 options');
    this.#modeDefinitionId = assertNonEmptyString(
      ownDataField(source, 'modeDefinitionId', 'ModeProductSessionV2 options'),
      'ModeProductSessionV2.modeDefinitionId',
    );
    const matchCandidate = ownDataField(
      source,
      'matchSession',
      'ModeProductSessionV2 options',
    );
    const assemblerCandidate = ownDataField(
      source,
      'resultAssembler',
      'ModeProductSessionV2 options',
    );
    const assemblerDestroy = captureSynchronousModeDataMethod(
      assemblerCandidate,
      'destroy',
      'ModeProductSessionV2 resultAssembler',
    );
    const matchDestroy = captureSynchronousModeDataMethod(
      matchCandidate,
      'destroy',
      'ModeProductSessionV2 matchSession',
    );
    const match = createMatchPort(matchCandidate, matchDestroy);
    const assembler = createAssemblerPort(assemblerCandidate, assemblerDestroy);
    const reward = createRewardPort(ownDataField(
      source,
      'rewardCommitter',
      'ModeProductSessionV2 options',
    ));
    this.#match = match;
    this.#assembler = assembler;
    this.#reward = reward;
  }

  get state(): ModeProductSessionV2State {
    this.#assertNoOperation('state-read');
    return this.#state;
  }

  getSnapshot(): ModeProductSessionV2Snapshot {
    this.#assertNoOperation('snapshot-read');
    return this.#snapshot();
  }

  #snapshot(): ModeProductSessionV2Snapshot {
    return Object.freeze({
      schemaVersion: 2,
      modeDefinitionId: this.#modeDefinitionId,
      state: this.#state,
      result: this.#result,
      reward: this.#rewardOutcome,
    });
  }

  #rejectReentry(operation: string): never {
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `ModeProductSessionV2操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) this.#rejectReentry(operation);
  }

  #beginOperation(
    operation: ModeProductSessionV2Operation,
    allowed: readonly ModeProductSessionV2State[],
  ): void {
    this.#assertNoOperation(operation);
    if (!allowed.includes(this.#state)) {
      throw new Error(`ModeProductSessionV2状态${this.#state}拒绝当前操作。`);
    }
    this.#operation = operation;
    this.#reentryError = null;
  }

  #runOperation<T>(
    operation: ModeProductSessionV2Operation,
    allowed: readonly ModeProductSessionV2State[],
    action: () => T,
  ): T {
    this.#beginOperation(operation, allowed);
    const reentrySequence = this.#reentrySequence;
    try {
      const result = action();
      if (this.#reentrySequence !== reentrySequence) {
        throw this.#reentryError
          ?? new Error(`ModeProductSessionV2 ${operation}发生被吞掉的重入。`);
      }
      return result;
    } catch (error) {
      if (this.#reentrySequence !== reentrySequence
        && this.#state !== MODE_PRODUCT_SESSION_V2_STATE.FAILED) {
        return this.#fail(error);
      }
      throw error;
    } finally {
      this.#operation = null;
    }
  }

  #assertReentryFree(_operation: string): void {
    if (this.#reentryError !== null) {
      throw this.#reentryError;
    }
  }

  #cleanup(): Error[] {
    const errors: Error[] = [];
    if (this.#assembler !== null) {
      const reentrySequence = this.#reentrySequence;
      try {
        assertSynchronous(this.#assembler.destroy(), 'ModeProductSessionV2 assembler destroy');
        if (this.#reentrySequence !== reentrySequence) {
          throw this.#reentryError
            ?? new Error('ModeProductSessionV2 assembler清理期间发生重入。');
        }
        this.#assembler = null;
      } catch (error) {
        errors.push(safelyWrapThrownError(error, 'ModeProductSessionV2 assembler清理失败。'));
        if (this.#reentrySequence !== reentrySequence) return errors;
      }
    }
    if (this.#match !== null) {
      const reentrySequence = this.#reentrySequence;
      try {
        assertSynchronous(this.#match.destroy(), 'ModeProductSessionV2 match destroy');
        if (this.#reentrySequence !== reentrySequence) {
          throw this.#reentryError
            ?? new Error('ModeProductSessionV2 match清理期间发生重入。');
        }
        this.#match = null;
      } catch (error) {
        errors.push(safelyWrapThrownError(error, 'ModeProductSessionV2 match清理失败。'));
      }
    }
    return errors;
  }

  #fail(error: unknown): never {
    this.#state = MODE_PRODUCT_SESSION_V2_STATE.FAILED;
    const cleanupErrors = this.#cleanup();
    if (this.#reentryError !== null && !cleanupErrors.includes(this.#reentryError)) {
      cleanupErrors.push(this.#reentryError);
    }
    throw combineCleanupFailure(
      safelyWrapThrownError(error, 'ModeProductSessionV2失败关闭。'),
      cleanupErrors,
      'ModeProductSessionV2失败且清理不完整。',
    );
  }

  start(): unknown {
    return this.#runOperation('start', [MODE_PRODUCT_SESSION_V2_STATE.CREATED], () => {
      try {
        const outcome = assertSynchronous(
          this.#match?.start(),
          'ModeProductSessionV2 match start',
        );
        if (outcome === undefined) throw new Error('ModeProductSessionV2 match start无结果。');
        const start = assertPlainRecord(outcome, 'ModeProductSessionV2 match start');
        assertKnownKeys(start, START_KEYS, 'ModeProductSessionV2 match start');
        requireKeys(start, START_KEYS, 'ModeProductSessionV2 match start');
        this.#assertReentryFree('ModeProductSessionV2 start');
        this.#state = MODE_PRODUCT_SESSION_V2_STATE.RUNNING;
        return outcome;
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  step(localInput: unknown): ModeProductSessionV2StepOutcome {
    return this.#runOperation('step', [MODE_PRODUCT_SESSION_V2_STATE.RUNNING], () => {
      try {
      const rawStep = assertSynchronous(
        this.#match?.step(localInput),
        'ModeProductSessionV2 match step',
      );
      this.#assertReentryFree('ModeProductSessionV2 match step');
      const step = assertPlainRecord(rawStep, 'ModeProductSessionV2 match step');
      assertKnownKeys(step, STEP_KEYS, 'ModeProductSessionV2 match step');
      requireKeys(step, REQUIRED_STEP_KEYS, 'ModeProductSessionV2 match step');
      const events = ownDataField(step, 'events', 'ModeProductSessionV2 match step');
      const stepResult = ownDataField(step, 'result', 'ModeProductSessionV2 match step');
      assertSynchronous(
        this.#assembler?.appendEvents(events),
        'ModeProductSessionV2 appendEvents',
      );
      this.#assertReentryFree('ModeProductSessionV2 appendEvents');
      if (stepResult !== null) {
        const rawResult = assertSynchronous(
          this.#assembler?.finalize(),
          'ModeProductSessionV2 finalize',
        );
        const result = cloneFrozenData(rawResult, 'ModeProductSessionV2 Product Result');
        const resultRecord = assertPlainRecord(result, 'ModeProductSessionV2 Product Result');
        if (!sameData(
          stepResult,
          ownDataField(resultRecord, 'modeResult', 'ModeProductSessionV2 Product Result'),
        )) {
          throw new RangeError('ModeProductSessionV2 Session终局与Product Result不一致。');
        }
        if (ownDataField(
          resultRecord,
          'modeDefinitionId',
          'ModeProductSessionV2 Product Result',
        ) !== this.#modeDefinitionId) {
          throw new RangeError('ModeProductSessionV2 Result Mode身份与Session不一致。');
        }
        this.#assertReentryFree('ModeProductSessionV2 finalize');
        this.#result = result as ProductMatchResultV3;
        this.#state = MODE_PRODUCT_SESSION_V2_STATE.REWARD_PENDING;
      }
      return Object.freeze({ matchStep: rawStep, snapshot: this.#snapshot() });
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  pause(): void {
    this.#runOperation('pause', [MODE_PRODUCT_SESSION_V2_STATE.RUNNING], () => {
      try {
        assertSynchronous(this.#match?.pause(), 'ModeProductSessionV2 match pause');
        this.#assertReentryFree('ModeProductSessionV2 pause');
        this.#state = MODE_PRODUCT_SESSION_V2_STATE.PAUSED;
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  resume(): void {
    this.#runOperation('resume', [MODE_PRODUCT_SESSION_V2_STATE.PAUSED], () => {
      try {
        assertSynchronous(this.#match?.resume(), 'ModeProductSessionV2 match resume');
        this.#assertReentryFree('ModeProductSessionV2 resume');
        this.#state = MODE_PRODUCT_SESSION_V2_STATE.RUNNING;
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  prepareReward(): RewardGrant {
    return this.#runOperation(
      'prepare-reward',
      [MODE_PRODUCT_SESSION_V2_STATE.REWARD_PENDING],
      () => {
        if (this.#result === null) {
          throw new Error('ModeProductSessionV2缺少可准备奖励的Result。');
        }
        try {
          const grant = createRewardGrant(assertSynchronous(
            this.#reward.prepare(this.#result),
            'ModeProductSessionV2 reward prepare',
          ));
          if (grant.resultAuthorityHash !== this.#result.authorityHash) {
            throw new RangeError('ModeProductSessionV2准备奖励与终局Result权威身份不一致。');
          }
          this.#assertReentryFree('ModeProductSessionV2 prepareReward');
          return grant;
        } catch (error) {
          if (recoverable(error)) throw error;
          return this.#fail(error);
        }
      },
    );
  }

  settleReward(): ModeRewardCommitOutcomeV2 {
    return this.#runOperation(
      'settle-reward',
      [MODE_PRODUCT_SESSION_V2_STATE.REWARD_PENDING],
      () => {
        if (this.#result === null) throw new Error('ModeProductSessionV2缺少可结算Result。');
        try {
          const outcome = normalizeReward(
            assertSynchronous(
              this.#reward.commit(this.#result),
              'ModeProductSessionV2 reward commit',
            ),
            this.#result,
          );
          this.#assertReentryFree('ModeProductSessionV2 settleReward');
          this.#rewardOutcome = outcome;
          this.#state = MODE_PRODUCT_SESSION_V2_STATE.SETTLED;
          return outcome;
        } catch (error) {
          if (recoverable(error)) throw error;
          return this.#fail(error);
        }
      },
    );
  }

  getTerminalReplayV6(): unknown {
    return this.#runOperation('terminal-replay-read', [
      MODE_PRODUCT_SESSION_V2_STATE.REWARD_PENDING,
      MODE_PRODUCT_SESSION_V2_STATE.SETTLED,
    ], () => {
      if (this.#match?.getTerminalReplayV6 === null || this.#match === null) {
        throw new Error('ModeProductSessionV2当前Match不提供终局Replay V6。');
      }
      try {
        const replay = assertSynchronous(
          this.#match.getTerminalReplayV6(),
          'ModeProductSessionV2 terminal Replay V6',
        );
        this.#assertReentryFree('ModeProductSessionV2 terminal Replay V6');
        return replay;
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  getTerminalRuntimeEvidenceV1(): unknown {
    return this.#runOperation('terminal-runtime-evidence-read', [
      MODE_PRODUCT_SESSION_V2_STATE.REWARD_PENDING,
      MODE_PRODUCT_SESSION_V2_STATE.SETTLED,
    ], () => {
      if (this.#match?.getTerminalRuntimeEvidenceV1 === null || this.#match === null) {
        throw new Error('ModeProductSessionV2当前Match不提供终局Runtime证据V1。');
      }
      try {
        const evidence = assertSynchronous(
          this.#match.getTerminalRuntimeEvidenceV1(),
          'ModeProductSessionV2 terminal Runtime evidence V1',
        );
        this.#assertReentryFree('ModeProductSessionV2 terminal Runtime evidence V1');
        return evidence;
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  getTerminalRuntimeEvidenceV2(): unknown {
    return this.#runOperation('terminal-runtime-evidence-v2-read', [
      MODE_PRODUCT_SESSION_V2_STATE.REWARD_PENDING,
      MODE_PRODUCT_SESSION_V2_STATE.SETTLED,
    ], () => {
      if (this.#match?.getTerminalRuntimeEvidenceV2 === null || this.#match === null) {
        throw new Error('ModeProductSessionV2当前Match不提供完整供给Runtime证据V2。');
      }
      try {
        const evidence = assertSynchronous(
          this.#match.getTerminalRuntimeEvidenceV2(),
          'ModeProductSessionV2 terminal Runtime evidence V2',
        );
        this.#assertReentryFree('ModeProductSessionV2 terminal Runtime evidence V2');
        return evidence;
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  destroy(): void {
    this.#assertNoOperation('destroy');
    if (this.#state === MODE_PRODUCT_SESSION_V2_STATE.DESTROYED) return;
    this.#runOperation('destroy', [
      MODE_PRODUCT_SESSION_V2_STATE.CREATED,
      MODE_PRODUCT_SESSION_V2_STATE.RUNNING,
      MODE_PRODUCT_SESSION_V2_STATE.PAUSED,
      MODE_PRODUCT_SESSION_V2_STATE.REWARD_PENDING,
      MODE_PRODUCT_SESSION_V2_STATE.SETTLED,
      MODE_PRODUCT_SESSION_V2_STATE.FAILED,
    ], () => {
      const errors = this.#cleanup();
      if (errors.length > 0) {
        this.#state = MODE_PRODUCT_SESSION_V2_STATE.FAILED;
        throw combineCleanupFailure(
          new Error('ModeProductSessionV2 destroy失败。'),
          errors,
          'ModeProductSessionV2 destroy清理不完整。',
        );
      }
      this.#state = MODE_PRODUCT_SESSION_V2_STATE.DESTROYED;
    });
  }
}
