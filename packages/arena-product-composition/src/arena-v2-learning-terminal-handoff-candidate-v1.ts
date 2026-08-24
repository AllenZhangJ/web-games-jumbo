import {
  ARENA_MATCH_EVENT_V6,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  createArenaMatchEventV6,
  createDeterministicDataHash,
  type ArenaMatchEventV6,
  type DeepReadonly,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2ProductAuthorityRegistryCandidateV1,
  createProductResultReplaySettlementEvidenceV1,
  createProductResultRuntimeSettlementEvidenceV2,
  createProductResultRuntimeSettlementEvidenceV3,
  type ArenaV2ProductAuthorityAdmissionCandidate,
  type ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV1,
  type ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV2,
  type ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV3,
  type ProductResultReplaySettlementEvidenceV1,
  type ProductResultRuntimeSettlementEvidenceV2,
  type ProductResultRuntimeSettlementEvidenceV3,
} from '@number-strategy-jump/arena-product-match';
import {
  ArenaV2LearningProfileServiceV1,
} from '@number-strategy-jump/arena-profile-service';
import type { ArenaV2LearningGrantV1 } from '@number-strategy-jump/arena-profile-contracts';
import {
  prepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV2,
  prepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV3,
  prepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV2,
  prepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV3,
  settleArenaV2LearningMatchCandidateV1,
  settleArenaV2LearningMatchWithRegisteredAuthorityCandidateV1,
  settleArenaV2LearningMatchWithReplayCandidateV1,
} from './arena-v2-learning-settlement-candidate-v1.js';

export const ARENA_V2_LEARNING_TERMINAL_HANDOFF_STATE_V1 = Object.freeze({
  COLLECTING: 'collecting',
  READY_TO_SETTLE: 'ready-to-settle',
  SETTLED: 'settled',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ArenaV2LearningTerminalHandoffStateV1 =
  typeof ARENA_V2_LEARNING_TERMINAL_HANDOFF_STATE_V1[
    keyof typeof ARENA_V2_LEARNING_TERMINAL_HANDOFF_STATE_V1
  ];

export interface ArenaV2LearningTerminalHandoffCandidateV1Options {
  readonly profileDefinition: unknown;
  readonly evidenceDefinition: unknown;
  readonly learningProfileService: ArenaV2LearningProfileServiceV1;
  readonly authorityRegistry: ArenaV2ProductAuthorityRegistryCandidateV1 | null;
  readonly authorityAdmission: unknown | null;
  readonly recipientParticipantId: unknown;
  readonly maxEventCount: number;
}

export interface ArenaV2LearningTerminalHandoffSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly state: ArenaV2LearningTerminalHandoffStateV1;
  readonly eventCount: number;
  readonly firstSequence: number | null;
  readonly lastSequence: number | null;
  readonly terminalTick: number | null;
  readonly settlementCommitted: boolean | null;
  readonly settlementDuplicate: boolean | null;
}

type SettlementOutcome = ReturnType<typeof settleArenaV2LearningMatchCandidateV1>;
type LearningTerminalHandoffOperation =
  | 'state-read'
  | 'snapshot-read'
  | 'append-events'
  | 'settle'
  | 'bind-replay'
  | 'bind-runtime'
  | 'bind-runtime-v3'
  | 'prepare-bound'
  | 'settle-bound'
  | 'destroy';
const OPTION_KEYS = new Set([
  'profileDefinition', 'evidenceDefinition', 'learningProfileService',
  'authorityRegistry', 'authorityAdmission',
  'recipientParticipantId', 'maxEventCount',
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

function isRecoverable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const descriptor = Object.getOwnPropertyDescriptor(error, 'recoverable');
  return Boolean(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.value === true);
}

/**
 * Candidate-only owner of the complete terminal event chain. A caller must
 * append the exact event batches it also gives the result assembler, bind the
 * terminal Product Result to the same complete Runtime evidence, then
 * explicitly settle. Replay V1 remains a compatibility path; the candidate
 * bridge uses the Mode Driver-bound V2 path. No default ModeProductSession
 * uses it.
 */
export class ArenaV2LearningTerminalHandoffCandidateV1 {
  readonly #profileDefinition: unknown;
  readonly #evidenceDefinition: unknown;
  readonly #learningProfileService: ArenaV2LearningProfileServiceV1;
  readonly #authorityRegistry: ArenaV2ProductAuthorityRegistryCandidateV1 | null;
  readonly #authorityAdmission: ArenaV2ProductAuthorityAdmissionCandidate | null;
  readonly #recipientParticipantId: unknown;
  readonly #maxEventCount: number;
  readonly #events: DeepReadonly<ArenaMatchEventV6>[] = [];
  readonly #eventIds = new Set<string>();
  #state: ArenaV2LearningTerminalHandoffStateV1 = 'collecting';
  #outcome: SettlementOutcome | null = null;
  #resultIdentity: string | null = null;
  #boundSettlementEvidence: ProductResultReplaySettlementEvidenceV1 | null = null;
  #boundRuntimeSettlementEvidence: ProductResultRuntimeSettlementEvidenceV2 | null = null;
  #boundRuntimeSettlementEvidenceV3: ProductResultRuntimeSettlementEvidenceV3 | null = null;
  #boundRegisteredSettlementEvidence:
    ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV1 | null = null;
  #boundRegisteredRuntimeSettlementEvidence:
    ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV2 | null = null;
  #boundRegisteredRuntimeSettlementEvidenceV3:
    ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV3 | null = null;
  #preparedRuntimeGrant: ArenaV2LearningGrantV1 | null = null;
  #settlementEvidenceIdentity: string | null = null;
  #boundEventCount = 0;
  #boundFirstSequence: number | null = null;
  #boundLastSequence: number | null = null;
  #boundTerminalTick: number | null = null;
  #operation: LearningTerminalHandoffOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(options: ArenaV2LearningTerminalHandoffCandidateV1Options) {
    const source = exact(options, OPTION_KEYS, 'ArenaV2LearningTerminalHandoffCandidateV1 options');
    if (!(source.learningProfileService instanceof ArenaV2LearningProfileServiceV1)) {
      throw new TypeError('Learning terminal handoff需要ArenaV2LearningProfileServiceV1。');
    }
    const maxEventCount = assertIntegerAtLeast(
      source.maxEventCount,
      1,
      'Learning terminal handoff maxEventCount',
    );
    if (maxEventCount > 1_000_000) {
      throw new RangeError('Learning terminal handoff maxEventCount超出上限。');
    }
    this.#profileDefinition = source.profileDefinition;
    this.#evidenceDefinition = source.evidenceDefinition;
    this.#learningProfileService = source.learningProfileService;
    if ((source.authorityRegistry === null) !== (source.authorityAdmission === null)) {
      throw new RangeError('Learning terminal handoff Authority Registry与Admission必须成对出现。');
    }
    if (source.authorityRegistry !== null
      && !(source.authorityRegistry instanceof ArenaV2ProductAuthorityRegistryCandidateV1)) {
      throw new TypeError('Learning terminal handoff Authority Registry类型无效。');
    }
    this.#authorityRegistry = source.authorityRegistry;
    this.#authorityAdmission = source.authorityRegistry === null
      ? null
      : source.authorityRegistry.validateAdmissionCandidate(source.authorityAdmission);
    this.#recipientParticipantId = source.recipientParticipantId;
    this.#maxEventCount = maxEventCount;
  }

  get state(): ArenaV2LearningTerminalHandoffStateV1 {
    return this.#runOperation('state-read', () => this.#state);
  }

  getSnapshot(): ArenaV2LearningTerminalHandoffSnapshotV1 {
    return this.#runOperation('snapshot-read', () => this.#snapshot());
  }

  #snapshot(): ArenaV2LearningTerminalHandoffSnapshotV1 {
    const terminal = this.#events.at(-1);
    const eventCount = this.#events.length > 0 ? this.#events.length : this.#boundEventCount;
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      state: this.#state,
      eventCount,
      firstSequence: this.#events[0]?.sequence ?? this.#boundFirstSequence,
      lastSequence: terminal?.sequence ?? this.#boundLastSequence,
      terminalTick: terminal?.type === ARENA_MATCH_EVENT_V6.MATCH_ENDED
        ? terminal.tick
        : this.#boundTerminalTick,
      settlementCommitted: this.#outcome?.committed ?? null,
      settlementDuplicate: this.#outcome?.duplicate ?? null,
    });
  }

  #rejectReentry(operation: LearningTerminalHandoffOperation): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `Learning terminal handoff操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw error;
  }

  #runOperation<T>(operation: LearningTerminalHandoffOperation, callback: () => T): T {
    if (this.#operation !== null) this.#rejectReentry(operation);
    this.#operation = operation;
    this.#reentryError = null;
    try {
      return callback();
    } finally {
      this.#operation = null;
    }
  }

  #assertReentryFree(sequence: number, operation: string): void {
    if (this.#reentrySequence === sequence) return;
    const error = new Error(`Learning terminal handoff ${operation}期间发生回调重入。`);
    if (this.#reentryError !== null) error.cause = this.#reentryError;
    throw error;
  }

  appendEvents(value: unknown): ArenaV2LearningTerminalHandoffSnapshotV1 {
    return this.#runOperation('append-events', () => {
      if (this.#state !== 'collecting') {
        throw new Error(`Learning terminal handoff状态${this.#state}拒绝追加事件。`);
      }
      if (!Array.isArray(value)) throw new TypeError('Learning terminal handoff events必须是数组。');
      if (value.length === 0) return this.#snapshot();
      if (value.length > this.#maxEventCount - this.#events.length) {
        throw new RangeError('Learning terminal handoff事件超过显式上限。');
      }
      const sequence = this.#reentrySequence;
      let mutationStarted = false;
      try {
        let previousSequence = this.#events.at(-1)?.sequence ?? -1;
        let previousTick = this.#events.at(-1)?.tick ?? -1;
        const batchIds = new Set<string>();
        const batch = value.map((candidate, index) => {
          const event = createArenaMatchEventV6(candidate);
          if (event.sequence !== previousSequence + 1) {
            throw new RangeError('Learning terminal handoff事件sequence必须连续升序。');
          }
          if (event.tick < previousTick) {
            throw new RangeError('Learning terminal handoff事件tick不能回退。');
          }
          if (this.#eventIds.has(event.id) || batchIds.has(event.id)) {
            throw new RangeError(`Learning terminal handoff events[${index}] id重复。`);
          }
          batchIds.add(event.id);
          previousSequence = event.sequence;
          previousTick = event.tick;
          return event;
        });
        if (this.#events.length === 0
          && batch[0]?.type !== ARENA_MATCH_EVENT_V6.MATCH_STARTED) {
          throw new RangeError('Learning terminal handoff首个事件必须是MatchStarted。');
        }
        const terminalIndex = batch.findIndex(
          ({ type }) => type === ARENA_MATCH_EVENT_V6.MATCH_ENDED,
        );
        if (terminalIndex !== -1 && terminalIndex !== batch.length - 1) {
          throw new RangeError('Learning terminal handoff的MatchEnded必须位于最终位置。');
        }
        if (batch.filter(({ type }) => type === ARENA_MATCH_EVENT_V6.MATCH_STARTED).length
          > (this.#events.length === 0 ? 1 : 0)) {
          throw new RangeError('Learning terminal handoff只能接收一个MatchStarted。');
        }
        if (batch.filter(({ type }) => type === ARENA_MATCH_EVENT_V6.MATCH_ENDED).length > 1) {
          throw new RangeError('Learning terminal handoff只能接收一个MatchEnded。');
        }
        this.#assertReentryFree(sequence, '追加事件');
        mutationStarted = true;
        for (const event of batch) {
          this.#eventIds.add(event.id);
          this.#events.push(event);
        }
        if (terminalIndex !== -1) this.#state = 'ready-to-settle';
        return this.#snapshot();
      } catch (error) {
        if (mutationStarted) this.#state = 'failed';
        throw error;
      }
    });
  }

  settle(result: unknown): SettlementOutcome {
    return this.#runOperation('settle', () => {
      if (this.#authorityRegistry !== null) {
        throw new Error('Learning terminal handoff已绑定Authority Registry，拒绝降级结算。');
      }
      if (this.#state === 'settled') {
        if (this.#settlementEvidenceIdentity !== null) {
          throw new Error('Learning terminal handoff已使用Replay绑定结算，必须使用settleBound重试。');
        }
        const identity = createDeterministicDataHash(result, 'Learning terminal handoff result retry');
        if (identity !== this.#resultIdentity) {
          throw new RangeError('Learning terminal handoff已结算，拒绝不同Result重试。');
        }
        return this.#outcome!;
      }
      if (this.#state !== 'ready-to-settle') {
        throw new Error(`Learning terminal handoff状态${this.#state}不能结算。`);
      }
      if (this.#boundSettlementEvidence !== null
        || this.#boundRuntimeSettlementEvidence !== null
        || this.#boundRuntimeSettlementEvidenceV3 !== null) {
        throw new Error('Learning terminal handoff已绑定终局证据，拒绝降级为独立Result/events结算。');
      }
      const sequence = this.#reentrySequence;
      try {
        const resultIdentity = createDeterministicDataHash(
          result,
          'Learning terminal handoff result',
        );
        const outcome = settleArenaV2LearningMatchCandidateV1({
          profileDefinition: this.#profileDefinition,
          evidenceDefinition: this.#evidenceDefinition,
          learningProfileService: this.#learningProfileService,
          result,
          recipientParticipantId: this.#recipientParticipantId,
          events: Object.freeze([...this.#events]),
        });
        this.#assertReentryFree(sequence, '旧结算');
        this.#outcome = outcome;
        this.#resultIdentity = resultIdentity;
        this.#events.length = 0;
        this.#eventIds.clear();
        this.#state = 'settled';
        return outcome;
      } catch (error) {
        if (!isRecoverable(error) && this.#reentrySequence === sequence) this.#state = 'failed';
        throw error;
      }
    });
  }

  bindTerminalEvidence(result: unknown, replay: unknown): ArenaV2LearningTerminalHandoffSnapshotV1 {
    return this.#runOperation('bind-replay', () => {
      if (this.#state !== 'ready-to-settle') {
        throw new Error(`Learning terminal handoff状态${this.#state}不能绑定终局Replay。`);
      }
      const sequence = this.#reentrySequence;
      const evidence = createProductResultReplaySettlementEvidenceV1({
        schemaVersion: 1,
        result,
        replay,
      });
      const authorityAdmission = this.#authorityAdmission;
      let registeredEvidence:
        ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV1 | null = null;
      if (this.#authorityRegistry !== null) {
        if (authorityAdmission === null || authorityAdmission.schemaVersion !== 1) {
          throw new Error('Learning terminal handoff Replay V1结算需要Admission V1。');
        }
        const registrySequence = this.#reentrySequence;
        registeredEvidence = this.#authorityRegistry.createRegisteredSettlementEvidence({
          admission: authorityAdmission,
          settlementEvidence: evidence,
        });
        this.#assertReentryFree(registrySequence, 'Replay Registry证据创建');
      }
      if (this.#boundRuntimeSettlementEvidence !== null
        || this.#boundRuntimeSettlementEvidenceV3 !== null) {
        throw new Error('Learning terminal handoff已绑定Runtime证据，拒绝降级到Replay V1。');
      }
      if (this.#boundSettlementEvidence !== null) {
        if (this.#boundSettlementEvidence.settlementEvidenceHash
          !== evidence.settlementEvidenceHash
          || this.#boundRegisteredSettlementEvidence?.registeredSettlementEvidenceHash
            !== registeredEvidence?.registeredSettlementEvidenceHash) {
          throw new RangeError('Learning terminal handoff拒绝替换已绑定的终局Replay。');
        }
        this.#assertReentryFree(sequence, 'Replay证据重放');
        return this.#snapshot();
      }
      const collectedEventsHash = createDeterministicDataHash(
        this.#events,
        'Learning terminal handoff collected events',
      );
      const replayEventsHash = createDeterministicDataHash(
        evidence.replay.events,
        'Learning terminal handoff Replay events',
      );
      if (collectedEventsHash !== replayEventsHash) {
        throw new RangeError('Learning terminal handoff累计事件链与终局Replay V6不一致。');
      }
      this.#assertReentryFree(sequence, 'Replay证据绑定');
      const terminal = this.#events.at(-1);
      this.#boundSettlementEvidence = evidence;
      this.#boundRegisteredSettlementEvidence = registeredEvidence;
      this.#boundEventCount = this.#events.length;
      this.#boundFirstSequence = this.#events[0]?.sequence ?? null;
      this.#boundLastSequence = terminal?.sequence ?? null;
      this.#boundTerminalTick = terminal?.type === ARENA_MATCH_EVENT_V6.MATCH_ENDED
        ? terminal.tick
        : null;
      this.#events.length = 0;
      this.#eventIds.clear();
      return this.#snapshot();
    });
  }

  bindRuntimeTerminalEvidenceV2(
    result: unknown,
    runtimeTerminalEvidence: unknown,
  ): ArenaV2LearningTerminalHandoffSnapshotV1 {
    return this.#runOperation('bind-runtime', () => {
      if (this.#state !== 'ready-to-settle') {
        throw new Error(`Learning terminal handoff状态${this.#state}不能绑定终局Runtime证据。`);
      }
      const sequence = this.#reentrySequence;
      const evidence = createProductResultRuntimeSettlementEvidenceV2({
        schemaVersion: 2,
        result,
        runtimeTerminalEvidence,
      });
      const authorityAdmission = this.#authorityAdmission;
      let registeredEvidence:
        ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV2 | null = null;
      if (this.#authorityRegistry !== null) {
        if (authorityAdmission === null || authorityAdmission.schemaVersion !== 2) {
          throw new Error('Learning terminal handoff Runtime V2结算需要Admission V2。');
        }
        const registrySequence = this.#reentrySequence;
        registeredEvidence = this.#authorityRegistry.createRegisteredSettlementEvidenceV2({
          admission: authorityAdmission,
          settlementEvidence: evidence,
        });
        this.#assertReentryFree(registrySequence, 'Runtime Registry证据创建');
      }
      if (this.#boundSettlementEvidence !== null) {
        throw new Error('Learning terminal handoff已绑定Replay V1证据，拒绝切换到Runtime V2。');
      }
      if (this.#boundRuntimeSettlementEvidenceV3 !== null) {
        throw new Error('Learning terminal handoff已绑定Runtime V3证据，拒绝降级到Runtime V2。');
      }
      if (this.#boundRuntimeSettlementEvidence !== null) {
        if (this.#boundRuntimeSettlementEvidence.settlementEvidenceHash
          !== evidence.settlementEvidenceHash
          || this.#boundRegisteredRuntimeSettlementEvidence?.registeredSettlementEvidenceHash
            !== registeredEvidence?.registeredSettlementEvidenceHash) {
          throw new RangeError('Learning terminal handoff拒绝替换已绑定的终局Runtime证据。');
        }
        this.#assertReentryFree(sequence, 'Runtime证据重放');
        return this.#snapshot();
      }
      const collectedEventsHash = createDeterministicDataHash(
        this.#events,
        'Learning terminal handoff collected events V2',
      );
      const replayEventsHash = createDeterministicDataHash(
        evidence.replay.events,
        'Learning terminal handoff Runtime Replay events V2',
      );
      if (collectedEventsHash !== replayEventsHash) {
        throw new RangeError('Learning terminal handoff累计事件链与终局Runtime Replay不一致。');
      }
      this.#assertReentryFree(sequence, 'Runtime证据绑定');
      const terminal = this.#events.at(-1);
      this.#boundRuntimeSettlementEvidence = evidence;
      this.#boundRegisteredRuntimeSettlementEvidence = registeredEvidence;
      this.#boundEventCount = this.#events.length;
      this.#boundFirstSequence = this.#events[0]?.sequence ?? null;
      this.#boundLastSequence = terminal?.sequence ?? null;
      this.#boundTerminalTick = terminal?.type === ARENA_MATCH_EVENT_V6.MATCH_ENDED
        ? terminal.tick
        : null;
      this.#events.length = 0;
      this.#eventIds.clear();
      return this.#snapshot();
    });
  }

  bindRuntimeTerminalEvidenceV3(
    result: unknown,
    runtimeTerminalEvidence: unknown,
  ): ArenaV2LearningTerminalHandoffSnapshotV1 {
    return this.#runOperation('bind-runtime-v3', () => {
      if (this.#state !== 'ready-to-settle') {
        throw new Error(`Learning terminal handoff状态${this.#state}不能绑定终局Runtime V3证据。`);
      }
      const sequence = this.#reentrySequence;
      const evidence = createProductResultRuntimeSettlementEvidenceV3({
        schemaVersion: 3,
        result,
        runtimeTerminalEvidence,
      });
      const authorityAdmission = this.#authorityAdmission;
      let registeredEvidence:
        ArenaV2ProductAuthorityRegisteredSettlementEvidenceCandidateV3 | null = null;
      if (this.#authorityRegistry !== null) {
        if (authorityAdmission === null || authorityAdmission.schemaVersion !== 2) {
          throw new Error('Learning terminal handoff Runtime V3结算需要Admission V2。');
        }
        const registrySequence = this.#reentrySequence;
        registeredEvidence = this.#authorityRegistry.createRegisteredSettlementEvidenceV3({
          admission: authorityAdmission,
          settlementEvidence: evidence,
        });
        this.#assertReentryFree(registrySequence, 'Runtime V3 Registry证据创建');
      }
      if (this.#boundSettlementEvidence !== null
        || this.#boundRuntimeSettlementEvidence !== null) {
        throw new Error('Learning terminal handoff已绑定旧终局证据，拒绝切换到Runtime V3。');
      }
      if (this.#boundRuntimeSettlementEvidenceV3 !== null) {
        if (this.#boundRuntimeSettlementEvidenceV3.settlementEvidenceHash
          !== evidence.settlementEvidenceHash
          || this.#boundRegisteredRuntimeSettlementEvidenceV3?.registeredSettlementEvidenceHash
            !== registeredEvidence?.registeredSettlementEvidenceHash) {
          throw new RangeError('Learning terminal handoff拒绝替换已绑定的终局Runtime V3证据。');
        }
        this.#assertReentryFree(sequence, 'Runtime V3证据重放');
        return this.#snapshot();
      }
      const collectedEventsHash = createDeterministicDataHash(
        this.#events,
        'Learning terminal handoff collected events V3',
      );
      const replayEventsHash = createDeterministicDataHash(
        evidence.replay.events,
        'Learning terminal handoff Runtime Replay events V3',
      );
      if (collectedEventsHash !== replayEventsHash) {
        throw new RangeError('Learning terminal handoff累计事件链与终局Runtime V3 Replay不一致。');
      }
      this.#assertReentryFree(sequence, 'Runtime V3证据绑定');
      const terminal = this.#events.at(-1);
      this.#boundRuntimeSettlementEvidenceV3 = evidence;
      this.#boundRegisteredRuntimeSettlementEvidenceV3 = registeredEvidence;
      this.#boundEventCount = this.#events.length;
      this.#boundFirstSequence = this.#events[0]?.sequence ?? null;
      this.#boundLastSequence = terminal?.sequence ?? null;
      this.#boundTerminalTick = terminal?.type === ARENA_MATCH_EVENT_V6.MATCH_ENDED
        ? terminal.tick
        : null;
      this.#events.length = 0;
      this.#eventIds.clear();
      return this.#snapshot();
    });
  }

  /**
   * Resolves the immutable Runtime V2 Learning Grant without writing Profile.
   * The formal bridge invokes this before reward settlement so every authority
   * and grant-contract failure is closed before the first durable write.
   */
  prepareBound(): ArenaV2LearningGrantV1 {
    return this.#runOperation('prepare-bound', () => {
      if (this.#state !== 'ready-to-settle') {
        throw new Error(`Learning terminal handoff状态${this.#state}不能准备结算。`);
      }
      if (this.#boundRuntimeSettlementEvidence === null
        && this.#boundRuntimeSettlementEvidenceV3 === null) {
        throw new Error('Learning terminal handoff正式准备入口需要Runtime终局证据。');
      }
      if (this.#authorityRegistry !== null
        && this.#boundRegisteredRuntimeSettlementEvidence === null
        && this.#boundRegisteredRuntimeSettlementEvidenceV3 === null) {
        throw new Error('Learning terminal handoff正式准备入口缺少Registry Runtime证据。');
      }
      const sequence = this.#reentrySequence;
      try {
        return this.#prepareBoundInsideOperation();
      } catch (error) {
        if (this.#reentrySequence === sequence && !isRecoverable(error)) {
          this.#state = 'failed';
        }
        throw error;
      }
    });
  }

  #prepareBoundInsideOperation(): ArenaV2LearningGrantV1 {
    if (this.#preparedRuntimeGrant !== null) return this.#preparedRuntimeGrant;
    const runtimeEvidenceV3 = this.#boundRuntimeSettlementEvidenceV3;
    const runtimeEvidenceV2 = this.#boundRuntimeSettlementEvidence;
    if (runtimeEvidenceV3 === null && runtimeEvidenceV2 === null) {
      throw new Error('Learning terminal handoff正式准备入口需要Runtime终局证据。');
    }
    const authorityRegistry = this.#authorityRegistry;
    const registeredRuntimeEvidenceV3 = this.#boundRegisteredRuntimeSettlementEvidenceV3;
    const registeredRuntimeEvidenceV2 = this.#boundRegisteredRuntimeSettlementEvidence;
    const sequence = this.#reentrySequence;
    let grant: ArenaV2LearningGrantV1;
    if (authorityRegistry === null) {
      grant = runtimeEvidenceV3 === null
        ? prepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV2({
          profileDefinition: this.#profileDefinition,
          evidenceDefinition: this.#evidenceDefinition,
          settlementEvidence: runtimeEvidenceV2,
          recipientParticipantId: this.#recipientParticipantId,
        })
        : prepareArenaV2LearningMatchWithRuntimeEvidenceCandidateV3({
          profileDefinition: this.#profileDefinition,
          evidenceDefinition: this.#evidenceDefinition,
          settlementEvidence: runtimeEvidenceV3,
          recipientParticipantId: this.#recipientParticipantId,
        });
    } else {
      if (runtimeEvidenceV3 !== null) {
        if (registeredRuntimeEvidenceV3 === null) {
          throw new Error('Learning terminal handoff正式准备入口缺少Registry Runtime V3证据。');
        }
        grant = prepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV3({
          profileDefinition: this.#profileDefinition,
          evidenceDefinition: this.#evidenceDefinition,
          authorityRegistry,
          registeredSettlementEvidence: registeredRuntimeEvidenceV3,
          recipientParticipantId: this.#recipientParticipantId,
        });
      } else {
        if (registeredRuntimeEvidenceV2 === null) {
          throw new Error('Learning terminal handoff正式准备入口缺少Registry Runtime V2证据。');
        }
        grant = prepareArenaV2LearningMatchWithRegisteredAuthorityCandidateV2({
          profileDefinition: this.#profileDefinition,
          evidenceDefinition: this.#evidenceDefinition,
          authorityRegistry,
          registeredSettlementEvidence: registeredRuntimeEvidenceV2,
          recipientParticipantId: this.#recipientParticipantId,
        });
      }
    }
    this.#assertReentryFree(sequence, 'Grant准备');
    this.#preparedRuntimeGrant = grant;
    return grant;
  }

  settleBound(): SettlementOutcome {
    return this.#runOperation('settle-bound', () => {
      if (this.#state === 'settled') {
        if (this.#settlementEvidenceIdentity === null) {
          throw new Error('Learning terminal handoff已使用旧结算入口，不能切换Replay绑定重试。');
        }
        return this.#outcome!;
      }
      if (this.#state !== 'ready-to-settle') {
        throw new Error(`Learning terminal handoff状态${this.#state}不能结算。`);
      }
      if (this.#boundSettlementEvidence === null
        && this.#boundRuntimeSettlementEvidence === null
        && this.#boundRuntimeSettlementEvidenceV3 === null) {
        throw new Error('Learning terminal handoff缺少已绑定的Result/终局证据。');
      }
      if (this.#authorityRegistry !== null
        && this.#boundRegisteredSettlementEvidence === null
        && this.#boundRegisteredRuntimeSettlementEvidence === null
        && this.#boundRegisteredRuntimeSettlementEvidenceV3 === null) {
        throw new Error('Learning terminal handoff缺少Authority Registry注册结算证据。');
      }
      if ((this.#boundRuntimeSettlementEvidence !== null
          || this.#boundRuntimeSettlementEvidenceV3 !== null)
        && this.#preparedRuntimeGrant === null) {
        const preparationSequence = this.#reentrySequence;
        try {
          this.#prepareBoundInsideOperation();
        } catch (error) {
          if (this.#reentrySequence === preparationSequence && !isRecoverable(error)) {
            this.#state = 'failed';
          }
          throw error;
        }
      }
      const sequence = this.#reentrySequence;
      try {
        const runtimeEvidence = this.#boundRuntimeSettlementEvidenceV3
          ?? this.#boundRuntimeSettlementEvidence;
        const replayEvidence = this.#boundSettlementEvidence;
        let outcome: SettlementOutcome;
        if (runtimeEvidence !== null) {
          const preparedRuntimeGrant = this.#preparedRuntimeGrant;
          if (preparedRuntimeGrant === null) {
            throw new Error('Learning terminal handoff Runtime结算缺少已准备Grant。');
          }
          outcome = this.#learningProfileService.commitGrant(preparedRuntimeGrant);
        } else {
          if (replayEvidence === null) {
            throw new Error('Learning terminal handoff Replay V1结算缺少已绑定证据。');
          }
          const authorityRegistry = this.#authorityRegistry;
          if (authorityRegistry === null) {
            outcome = settleArenaV2LearningMatchWithReplayCandidateV1({
              profileDefinition: this.#profileDefinition,
              evidenceDefinition: this.#evidenceDefinition,
              learningProfileService: this.#learningProfileService,
              settlementEvidence: replayEvidence,
              recipientParticipantId: this.#recipientParticipantId,
            });
          } else {
            const registeredSettlementEvidence = this.#boundRegisteredSettlementEvidence;
            if (registeredSettlementEvidence === null) {
              throw new Error('Learning terminal handoff Replay V1结算缺少Registry证据。');
            }
            outcome = settleArenaV2LearningMatchWithRegisteredAuthorityCandidateV1({
              profileDefinition: this.#profileDefinition,
              evidenceDefinition: this.#evidenceDefinition,
              learningProfileService: this.#learningProfileService,
              authorityRegistry,
              registeredSettlementEvidence,
              recipientParticipantId: this.#recipientParticipantId,
            });
          }
        }
        this.#assertReentryFree(sequence, '绑定结算');
        const evidence = runtimeEvidence ?? replayEvidence;
        if (evidence === null) {
          throw new Error('Learning terminal handoff结算后缺少终局证据。');
        }
        this.#outcome = outcome;
        this.#resultIdentity = evidence.resultAuthorityHash;
        this.#settlementEvidenceIdentity = this.#boundRegisteredSettlementEvidence
          ?.registeredSettlementEvidenceHash
          ?? this.#boundRegisteredRuntimeSettlementEvidenceV3?.registeredSettlementEvidenceHash
          ?? this.#boundRegisteredRuntimeSettlementEvidence?.registeredSettlementEvidenceHash
          ?? evidence.settlementEvidenceHash;
        this.#boundSettlementEvidence = null;
        this.#boundRuntimeSettlementEvidence = null;
        this.#boundRuntimeSettlementEvidenceV3 = null;
        this.#boundRegisteredSettlementEvidence = null;
        this.#boundRegisteredRuntimeSettlementEvidence = null;
        this.#boundRegisteredRuntimeSettlementEvidenceV3 = null;
        this.#preparedRuntimeGrant = null;
        this.#events.length = 0;
        this.#eventIds.clear();
        this.#boundEventCount = 0;
        this.#boundFirstSequence = null;
        this.#boundLastSequence = null;
        this.#boundTerminalTick = null;
        this.#state = 'settled';
        return outcome;
      } catch (error) {
        // Runtime V2 preparation has already succeeded, so a Profile write error
        // must retain Grant and terminal evidence for a later recovery owner.
        if (this.#reentrySequence === sequence
          && this.#preparedRuntimeGrant === null
          && !isRecoverable(error)) {
          this.#state = 'failed';
        }
        throw error;
      }
    });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#state === 'destroyed') return;
      this.#events.length = 0;
      this.#eventIds.clear();
      this.#outcome = null;
      this.#resultIdentity = null;
      this.#boundSettlementEvidence = null;
      this.#boundRuntimeSettlementEvidence = null;
      this.#boundRuntimeSettlementEvidenceV3 = null;
      this.#boundRegisteredSettlementEvidence = null;
      this.#boundRegisteredRuntimeSettlementEvidence = null;
      this.#boundRegisteredRuntimeSettlementEvidenceV3 = null;
      this.#preparedRuntimeGrant = null;
      this.#settlementEvidenceIdentity = null;
      this.#boundEventCount = 0;
      this.#boundFirstSequence = null;
      this.#boundLastSequence = null;
      this.#boundTerminalTick = null;
      this.#state = 'destroyed';
    });
  }
}

export const ARENA_V2_LEARNING_TERMINAL_HANDOFF_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSessionWired: false as const,
  ownership: 'result-runtime-mode-driver-supply-ownership-bound-until-settlement-v3' as const,
  runtimeV2GrantPreparedBeforeRewardWrite: true as const,
  runtimeV3CompleteSupplyOwnershipPreferredByFormalBridge: true as const,
  preparedGrantRetainedAcrossProfileWriteFailure: true as const,
  swallowedReentryFailsBeforeEvidenceOrSettlementPublication: true as const,
  operationGuardPrecedesStateAndInputValidation: true as const,
  authorityAndProfilePortsCheckedBeforeBusinessProgress: true as const,
  internalSnapshotAndPreparationAvoidPublicReentry: true as const,
  settlementReentryRetainsPreparedGrantAndTerminalEvidence: true as const,
  publicReadsRejectOperationIntermediateState: true as const,
  destroyFastPathChecksOperationBeforeIdempotence: true as const,
  replayV1CompatibilityBindingAvailable: true as const,
  registeredAuthoritySettlementRequiredWhenAdmissionPresent: true as const,
  legacyUnboundSettlementDefaultWired: false as const,
  validationStatus: 'not-run' as const,
});
