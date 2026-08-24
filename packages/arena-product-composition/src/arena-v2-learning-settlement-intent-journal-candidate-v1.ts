import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  createSynchronousStoragePort,
  type SynchronousStoragePort,
} from '@number-strategy-jump/arena-contracts';
import {
  recoverArenaV2DuplicateLearningSettlementProjectionV1,
  type ArenaV2LearningSettlementProjectionV1,
} from '@number-strategy-jump/arena-product-progression';
import {
  createArenaV2LearningGrantV1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
  getArenaV2LearningResultGrantIdV1,
  type ArenaV2LearningGrantV1,
  type ArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ArenaV2LearningProfileServiceV1,
  PlayerProfileService,
} from '@number-strategy-jump/arena-profile-service';
import {
  createRewardGrant,
  type RewardGrant,
} from '@number-strategy-jump/arena-progression';
import { SynchronousStorageLease } from '@number-strategy-jump/arena-storage';
import {
  resolveArenaV2ProfilePersistenceDispositionCandidateV1,
} from './arena-v2-profile-persistence-disposition-candidate-v1.js';

export interface ArenaV2LearningSettlementIntentJournalCandidateV1Options {
  readonly profileDefinition: unknown;
  readonly storage: unknown;
  readonly ownerId: unknown;
  readonly wallNow: unknown;
  readonly keyPrefix?: unknown;
  readonly leaseDurationMs?: unknown;
  readonly leaseTakeoverSameOwner?: unknown;
}

export interface ArenaV2LearningSettlementIntentJournalSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly lifecycle: 'created' | 'open' | 'failed' | 'destroyed';
  readonly pendingBaselineCaptured: boolean;
  readonly pendingRewardGrantCaptured: boolean;
  readonly pendingLearningGrantCaptured: boolean;
  readonly pendingRewardGrantId: string | null;
  readonly pendingLearningGrantId: string | null;
}

export interface ArenaV2RecoveredLearningSettlementIntentCandidateV1 {
  readonly status: 'recovered-after-reward';
  readonly settlement: ArenaV2LearningSettlementProjectionV1;
  readonly rewardGrant: RewardGrant;
  readonly learningGrant: ArenaV2LearningGrantV1;
  readonly baselineProfile: ArenaV2LearningProfileV1;
}

export interface ArenaV2DiscardedLearningSettlementIntentCandidateV1 {
  readonly status: 'discarded-before-reward';
  readonly reason: 'baseline-only' | 'reward-not-committed';
  readonly rewardGrantId: string | null;
  readonly learningGrantId: string | null;
  readonly cleanupPending: boolean;
  readonly cleanupError: unknown;
}

export interface ArenaV2DeferredLearningSettlementRecoveryCandidateV1 {
  readonly status: 'recovery-retry-required' | 'recovery-restart-required';
  readonly reason: 'learning-profile-recovery-temporarily-unavailable'
    | 'learning-profile-recovery-indeterminate';
  readonly rewardGrantId: string;
  readonly learningGrantId: string;
  readonly rewardGrant: RewardGrant;
  readonly learningGrant: ArenaV2LearningGrantV1;
  readonly baselineProfile: ArenaV2LearningProfileV1;
  readonly recoveryError: unknown;
}

export type ArenaV2LearningSettlementIntentRecoveryCandidateV1 =
  | ArenaV2RecoveredLearningSettlementIntentCandidateV1
  | ArenaV2DiscardedLearningSettlementIntentCandidateV1
  | ArenaV2DeferredLearningSettlementRecoveryCandidateV1;

type LearningSettlementIntentJournalOperation =
  | 'open'
  | 'capture-match-start-baseline'
  | 'capture-prepared-settlement-intent'
  | 'recover-pending'
  | 'acknowledge'
  | 'discard-unprepared-baseline'
  | 'snapshot-read'
  | 'destroy';

interface StoredIntentEnvelopeV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly profileDefinitionId: string;
  readonly profileDefinitionContentVersion: number;
  readonly baselineProfile: ArenaV2LearningProfileV1;
  readonly rewardGrant: RewardGrant | null;
  readonly learningGrant: ArenaV2LearningGrantV1 | null;
  readonly payloadHash: string;
}

const OPTION_KEYS = new Set([
  'profileDefinition', 'storage', 'ownerId', 'wallNow', 'keyPrefix',
  'leaseDurationMs', 'leaseTakeoverSameOwner',
]);
const OPTION_REQUIRED_KEYS = Object.freeze([
  'profileDefinition', 'storage', 'ownerId', 'wallNow',
] as const);
const ENVELOPE_KEYS = new Set([
  'schemaVersion', 'status', 'profileDefinitionId',
  'profileDefinitionContentVersion', 'baselineProfile', 'rewardGrant',
  'learningGrant', 'payloadHash',
]);
const PREPARED_INTENT_KEYS = new Set(['rewardGrant', 'learningGrant']);
const ACKNOWLEDGE_KEYS = new Set(['rewardGrantId', 'learningGrantId']);

function dataField(source: object, key: string, fallback?: unknown): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined) return fallback;
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`Arena Learning结算意图台账.${key}必须是数据字段。`);
  }
  return descriptor.value;
}

function requiredDataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是自有可枚举数据字段。`);
  }
  return descriptor.value;
}

function payload(value: Omit<StoredIntentEnvelopeV1, 'payloadHash'>) {
  return Object.freeze({
    schemaVersion: value.schemaVersion,
    status: value.status,
    profileDefinitionId: value.profileDefinitionId,
    profileDefinitionContentVersion: value.profileDefinitionContentVersion,
    baselineProfile: value.baselineProfile,
    rewardGrant: value.rewardGrant,
    learningGrant: value.learningGrant,
  });
}

function envelope(
  definition: ArenaV2LearningProfileDefinitionV1,
  baselineValue: unknown,
  rewardGrantValue: unknown | null,
  learningGrantValue: unknown | null,
): StoredIntentEnvelopeV1 {
  const baselineProfile = createArenaV2LearningProfileV1(definition, baselineValue);
  const rewardGrant = rewardGrantValue === null ? null : createRewardGrant(rewardGrantValue);
  const learningGrant = learningGrantValue === null
    ? null
    : createArenaV2LearningGrantV1(definition, learningGrantValue);
  if ((rewardGrant === null) !== (learningGrant === null)) {
    throw new RangeError('Arena结算意图必须同时持有Reward Grant与Learning Grant。');
  }
  if (rewardGrant !== null && learningGrant !== null) {
    if (rewardGrant.resultAuthorityHash !== learningGrant.resultAuthorityHash) {
      throw new RangeError('Arena结算意图的Reward/Learning终局权威身份漂移。');
    }
    const resultGrantId = getArenaV2LearningResultGrantIdV1(learningGrant.grantId);
    const committedResultGrantId = baselineProfile.committedGrantIds.find((grantId) => (
      getArenaV2LearningResultGrantIdV1(grantId) === resultGrantId
    ));
    if (committedResultGrantId !== undefined) {
      if (committedResultGrantId !== learningGrant.grantId) {
        throw new RangeError(
          'Arena Learning结算意图基线中的同一Result已绑定不同Replay结算身份。',
        );
      }
      throw new RangeError('Arena Learning结算意图基线已包含待提交Grant。');
    }
  }
  const body = payload({
    schemaVersion: 1,
    status: 'production-unreachable',
    profileDefinitionId: definition.id,
    profileDefinitionContentVersion: definition.contentVersion,
    baselineProfile,
    rewardGrant,
    learningGrant,
  });
  return Object.freeze({
    ...body,
    payloadHash: createDeterministicDataHash(
      body,
      'Arena Reward Learning settlement intent journal payload',
    ),
  });
}

function validateEnvelope(
  definition: ArenaV2LearningProfileDefinitionV1,
  value: unknown,
): StoredIntentEnvelopeV1 {
  const name = 'Arena Reward Learning settlement intent journal envelope';
  const source = assertPlainRecord(cloneFrozenData(value, name), name);
  assertKnownKeys(source, ENVELOPE_KEYS, name);
  for (const key of ENVELOPE_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  if (source.schemaVersion !== 1 || source.status !== 'production-unreachable') {
    throw new RangeError(`${name}版本或状态无效。`);
  }
  if (source.profileDefinitionId !== definition.id
    || source.profileDefinitionContentVersion !== definition.contentVersion) {
    throw new RangeError(`${name} Profile Definition身份漂移。`);
  }
  const normalized = envelope(
    definition,
    source.baselineProfile,
    source.rewardGrant,
    source.learningGrant,
  );
  if (source.payloadHash !== normalized.payloadHash) {
    throw new RangeError(`${name}.payloadHash不一致。`);
  }
  return normalized;
}

function projectCommittedOutcome(
  outcome: ReturnType<ArenaV2LearningProfileServiceV1['commitGrant']>,
): ArenaV2LearningSettlementProjectionV1 {
  if (outcome.committed === outcome.duplicate) {
    throw new RangeError('Arena Learning恢复提交结果必须且只能是committed或duplicate。');
  }
  return Object.freeze({
    status: outcome.committed ? 'committed' as const : 'duplicate' as const,
    grantId: outcome.grant.grantId,
    profileRevision: outcome.profile.revision,
    sourceModeDefinitionId: outcome.grant.sourceModeDefinitionId,
    effectiveLearningProgress: outcome.effectiveLearningProgress,
    progressKinds: outcome.progressKinds,
    researchedWeaponDefinitionId: outcome.researchedWeaponDefinitionId,
    weaponContextEvidenceDeltas: outcome.weaponContextEvidenceDeltas,
    mapSegmentEvidenceDeltas: outcome.mapSegmentEvidenceDeltas,
    mapRouteEvidenceDeltas: outcome.mapRouteEvidenceDeltas,
    modeCompletionDeltas: outcome.modeCompletionDeltas,
    challengeProgressDeltas: outcome.challengeProgressDeltas,
    newlyCollectedWeaponDefinitionIds: outcome.newlyCollectedWeaponDefinitionIds,
    newlyCollectedMapDefinitionIds: outcome.newlyCollectedMapDefinitionIds,
  });
}

/**
 * Persists the immutable Learning baseline and the complete Reward/Learning
 * settlement intent before the first Profile write. Recovery checks the Reward
 * Profile first, so a terminal preparation that never paid Reward cannot later
 * create Learning progress by itself. This is an idempotent journal, not a
 * transaction across the two independent Profile slots.
 */
export class ArenaV2LearningSettlementIntentJournalCandidateV1 {
  readonly #definition: ArenaV2LearningProfileDefinitionV1;
  #storage: Readonly<SynchronousStoragePort> | null;
  #lease: SynchronousStorageLease | null;
  #intentKey: string | null;
  #pending: StoredIntentEnvelopeV1 | null = null;
  #lifecycle: 'created' | 'open' | 'failed' | 'destroyed' = 'created';
  #operation: LearningSettlementIntentJournalOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: ArenaV2LearningSettlementIntentJournalCandidateV1Options) {
    const source = assertPlainRecord(value, 'Arena Learning settlement intent journal options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena Learning settlement intent journal options');
    for (const key of OPTION_REQUIRED_KEYS) {
      if (!Object.hasOwn(source, key)) {
        throw new TypeError(`Arena Learning结算意图台账缺少${key}。`);
      }
    }
    this.#definition = createArenaV2LearningProfileDefinitionV1(
      dataField(source, 'profileDefinition'),
    );
    const storage = dataField(source, 'storage');
    const ownerId = assertNonEmptyString(
      dataField(source, 'ownerId'),
      'Arena Learning结算意图台账.ownerId',
    );
    const wallNow = dataField(source, 'wallNow');
    if (typeof wallNow !== 'function') {
      throw new TypeError('Arena Learning结算意图台账.wallNow必须是函数。');
    }
    const keyPrefix = assertNonEmptyString(
      dataField(
        source,
        'keyPrefix',
        `arena-v2.learning-settlement-intent.${this.#definition.id}`,
      ),
      'Arena Learning结算意图台账.keyPrefix',
    );
    const leaseDurationMs = assertIntegerAtLeast(
      dataField(source, 'leaseDurationMs', 60_000),
      1_000,
      'Arena Learning结算意图台账.leaseDurationMs',
    );
    const leaseTakeoverSameOwner = dataField(source, 'leaseTakeoverSameOwner', false);
    if (typeof leaseTakeoverSameOwner !== 'boolean') {
      throw new TypeError('Arena Learning结算意图台账.leaseTakeoverSameOwner必须是boolean。');
    }
    this.#storage = createSynchronousStoragePort(storage, {
      label: 'Arena Learning Settlement Intent Journal Storage',
    });
    this.#intentKey = `${keyPrefix}.intent`;
    this.#lease = new SynchronousStorageLease({
      storage,
      key: `${keyPrefix}.lease`,
      ownerId,
      holderId: `${ownerId}.settlement-intent-holder`,
      wallNow: wallNow as () => number,
      durationMs: leaseDurationMs,
      takeoverSameOwner: leaseTakeoverSameOwner,
      label: 'Arena Learning Settlement Intent Journal Lease',
    });
    Object.freeze(this);
  }

  #rejectReentry(operation: LearningSettlementIntentJournalOperation): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `Arena Learning结算意图台账操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #runOperation<T>(operation: LearningSettlementIntentJournalOperation, callback: () => T): T {
    if (this.#operation !== null) this.#rejectReentry(operation);
    this.#operation = operation;
    this.#reentryError = null;
    try {
      return callback();
    } finally {
      this.#operation = null;
    }
  }

  #assertCurrentOperationCommit(operation: string): void {
    if (this.#operation === null) throw new Error(`${operation}缺少当前操作所有权。`);
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #callChecked<T>(operation: string, callback: () => T): T {
    try {
      const result = callback();
      this.#assertCurrentOperationCommit(operation);
      return result;
    } catch (error) {
      this.#assertCurrentOperationCommit(operation);
      throw error;
    }
  }

  #assertOpen(): void {
    if (this.#lifecycle !== 'open') {
      throw new Error(`Arena Learning结算意图台账状态${this.#lifecycle}不可操作。`);
    }
  }

  #storageValue(): Readonly<SynchronousStoragePort> {
    if (this.#storage === null) throw new Error('Arena Learning结算意图台账已销毁。');
    return this.#storage;
  }

  #leaseValue(): SynchronousStorageLease {
    if (this.#lease === null) throw new Error('Arena Learning结算意图台账已销毁。');
    return this.#lease;
  }

  #intentKeyValue(): string {
    if (this.#intentKey === null) throw new Error('Arena Learning结算意图台账已销毁。');
    return this.#intentKey;
  }

  #readStored(): StoredIntentEnvelopeV1 | null {
    const read = this.#storageValue().read(this.#intentKeyValue());
    if (!read.ok) throw new Error('Arena Learning结算意图台账读取失败。');
    return read.found ? validateEnvelope(this.#definition, read.value) : null;
  }

  #assertExclusive(): void {
    const lease = this.#leaseValue();
    const renewed = this.#callChecked(
      'Arena Learning结算意图台账租约续租',
      () => lease.renew(),
    );
    if (!renewed) {
      const acquired = this.#callChecked(
        'Arena Learning结算意图台账租约取得',
        () => lease.acquire(),
      );
      if (!acquired) throw new Error('Arena Learning结算意图台账租约不可用。');
    }
    const stored = this.#callChecked(
      'Arena Learning结算意图台账当前Intent读取',
      () => this.#readStored(),
    );
    if (stored?.payloadHash !== this.#pending?.payloadHash) {
      throw new Error('Arena Learning结算意图台账已被其他owner改变。');
    }
  }

  #writeConfirmed(next: StoredIntentEnvelopeV1): void {
    let accepted = false;
    let writeError: unknown = null;
    try {
      accepted = this.#storageValue().write(this.#intentKeyValue(), next);
    } catch (error) {
      writeError = error;
    }
    // The readback is the same durable-write resolution sequence. It must run
    // even when a storage callback attempted reentry, then the caller rejects
    // that reentry after committing the confirmed in-memory watermark.
    let confirmed: StoredIntentEnvelopeV1 | null = null;
    let readError: unknown = null;
    try {
      confirmed = this.#readStored();
    } catch (error) {
      readError = error;
    }
    if (confirmed?.payloadHash === next.payloadHash) return;
    this.#assertCurrentOperationCommit('Arena Learning结算意图台账写入确认');
    if (readError instanceof Error) throw readError;
    if (readError !== null) {
      throw new Error(`Arena Learning结算意图台账写后读回失败：${String(readError)}`);
    }
    if (writeError instanceof Error) throw writeError;
    if (writeError !== null) {
      throw new Error(`Arena Learning结算意图台账写入失败：${String(writeError)}`);
    }
    if (!accepted) throw new Error('Arena Learning结算意图台账写入未被接受。');
    throw new Error('Arena Learning结算意图台账写后读回不一致。');
  }

  #deleteConfirmed(): void {
    let accepted = false;
    let deleteError: unknown = null;
    try {
      accepted = this.#storageValue().delete(this.#intentKeyValue());
    } catch (error) {
      deleteError = error;
    }
    // Deletion ambiguity is resolved before the caller advances its pending
    // watermark or rejects a swallowed callback reentry.
    let remaining: StoredIntentEnvelopeV1 | null = null;
    let readError: unknown = null;
    try {
      remaining = this.#readStored();
    } catch (error) {
      readError = error;
    }
    if (readError === null && remaining === null) return;
    this.#assertCurrentOperationCommit('Arena Learning结算意图台账删除确认');
    if (readError instanceof Error) throw readError;
    if (readError !== null) {
      throw new Error(`Arena Learning结算意图台账删除后读回失败：${String(readError)}`);
    }
    if (deleteError instanceof Error) throw deleteError;
    if (deleteError !== null) {
      throw new Error(`Arena Learning结算意图台账删除失败：${String(deleteError)}`);
    }
    if (!accepted) throw new Error('Arena Learning结算意图台账删除未被接受。');
    throw new Error('Arena Learning结算意图台账删除后仍存在。');
  }

  open(): ArenaV2LearningSettlementIntentJournalSnapshotCandidateV1 {
    return this.#runOperation('open', () => {
      if (this.#lifecycle !== 'created') {
        throw new Error(`Arena Learning结算意图台账状态${this.#lifecycle}不能open。`);
      }
      try {
        const acquired = this.#callChecked(
          'Arena Learning结算意图台账打开租约',
          () => this.#leaseValue().acquire(),
        );
        if (!acquired) {
          throw new Error('Arena Learning结算意图台账已被其他owner持有。');
        }
        const pending = this.#callChecked(
          'Arena Learning结算意图台账打开读取',
          () => this.#readStored(),
        );
        this.#pending = pending;
        this.#lifecycle = 'open';
        return this.#snapshot();
      } catch (error) {
        this.#lifecycle = 'failed';
        try {
          this.#callChecked(
            'Arena Learning结算意图台账打开失败租约释放',
            () => this.#leaseValue().release(),
          );
        } catch {
          // Original open failure remains authoritative.
        }
        this.#assertCurrentOperationCommit('Arena Learning结算意图台账打开失败清理');
        throw error;
      }
    });
  }

  captureMatchStartBaseline(value: unknown): void {
    this.#runOperation('capture-match-start-baseline', () => {
      this.#assertOpen();
      try {
        this.#assertExclusive();
        const next = envelope(this.#definition, value, null, null);
        if (this.#pending !== null) {
          if (this.#pending.payloadHash === next.payloadHash) return;
          throw new Error('Arena上一局Learning结算意图尚未清除，不能覆盖。');
        }
        this.#writeConfirmed(next);
        this.#pending = next;
        this.#assertCurrentOperationCommit('Arena Learning结算意图台账开局基线发布');
      } catch (error) {
        this.#lifecycle = 'failed';
        throw error;
      }
    });
  }

  capturePreparedSettlementIntent(value: unknown): Readonly<{
    readonly rewardGrant: RewardGrant;
    readonly learningGrant: ArenaV2LearningGrantV1;
  }> {
    return this.#runOperation('capture-prepared-settlement-intent', () => {
      this.#assertOpen();
      try {
        this.#assertExclusive();
        if (this.#pending === null) {
          throw new Error('Arena Learning结算意图缺少开局基线。');
        }
        const name = 'Arena prepared Reward Learning settlement intent';
        const source = assertPlainRecord(cloneFrozenData(value, name), name);
        assertKnownKeys(source, PREPARED_INTENT_KEYS, name);
        for (const key of PREPARED_INTENT_KEYS) {
          if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
        }
        const next = envelope(
          this.#definition,
          this.#pending.baselineProfile,
          requiredDataField(source, 'rewardGrant', name),
          requiredDataField(source, 'learningGrant', name),
        );
        if (this.#pending.rewardGrant !== null || this.#pending.learningGrant !== null) {
          if (this.#pending.payloadHash !== next.payloadHash) {
            throw new RangeError('Arena Learning结算意图拒绝替换已预留的双Profile Grant。');
          }
          return Object.freeze({
            rewardGrant: this.#pending.rewardGrant!,
            learningGrant: this.#pending.learningGrant!,
          });
        }
        this.#writeConfirmed(next);
        this.#pending = next;
        this.#assertCurrentOperationCommit('Arena Learning结算意图台账双Grant发布');
        return Object.freeze({
          rewardGrant: next.rewardGrant!,
          learningGrant: next.learningGrant!,
        });
      } catch (error) {
        this.#lifecycle = 'failed';
        throw error;
      }
    });
  }

  recoverPending(
    rewardService: PlayerProfileService,
    learningService: ArenaV2LearningProfileServiceV1,
  ): ArenaV2LearningSettlementIntentRecoveryCandidateV1 | null {
    return this.#runOperation('recover-pending', () => {
      this.#assertOpen();
      if (!(rewardService instanceof PlayerProfileService)) {
        throw new TypeError('Arena Learning结算意图恢复需要Reward Profile Service。');
      }
      if (!(learningService instanceof ArenaV2LearningProfileServiceV1)) {
        throw new TypeError('Arena Learning结算意图恢复需要Learning Profile Service V1。');
      }
      this.#assertExclusive();
      const pending = this.#pending;
      if (pending === null) return null;
      if (pending.rewardGrant === null || pending.learningGrant === null) {
        let cleanupError: unknown = null;
        try {
          this.#deleteConfirmed();
          this.#pending = null;
          this.#assertCurrentOperationCommit('Arena Learning结算意图台账空基线删除');
        } catch (error) {
          cleanupError = error;
          this.#lifecycle = 'failed';
        }
        return Object.freeze({
          status: 'discarded-before-reward' as const,
          reason: 'baseline-only' as const,
          rewardGrantId: null,
          learningGrantId: null,
          cleanupPending: this.#pending !== null,
          cleanupError,
        });
      }
      const rewardSnapshot = this.#callChecked(
        'Arena Learning结算意图台账Reward Profile读取',
        () => rewardService.getSnapshot(),
      );
      const rewardCommitted = rewardSnapshot.progression.committedGrantIds.includes(
        pending.rewardGrant.grantId,
      );
      if (!rewardCommitted) {
        const rewardGrantId = pending.rewardGrant.grantId;
        const learningGrantId = pending.learningGrant.grantId;
        let cleanupError: unknown = null;
        try {
          this.#deleteConfirmed();
          this.#pending = null;
          this.#assertCurrentOperationCommit('Arena Learning结算意图台账未支付Intent删除');
        } catch (error) {
          cleanupError = error;
          this.#lifecycle = 'failed';
        }
        return Object.freeze({
          status: 'discarded-before-reward' as const,
          reason: 'reward-not-committed' as const,
          rewardGrantId,
          learningGrantId,
          cleanupPending: this.#pending !== null,
          cleanupError,
        });
      }
      let settlement: ArenaV2LearningSettlementProjectionV1;
      try {
        const current = this.#callChecked(
          'Arena Learning结算意图台账Learning Profile读取',
          () => learningService.getSnapshot(),
        );
        settlement = current.committedGrantIds.includes(pending.learningGrant.grantId)
          ? recoverArenaV2DuplicateLearningSettlementProjectionV1({
            profileDefinition: this.#definition,
            baselineProfile: pending.baselineProfile,
            currentProfile: current,
            grant: pending.learningGrant,
          })
          : (() => {
            const outcome = this.#callChecked(
              'Arena Learning结算意图台账Learning Profile提交',
              () => learningService.commitGrant(pending.learningGrant!),
            );
            if (outcome.duplicate) {
              return recoverArenaV2DuplicateLearningSettlementProjectionV1({
                profileDefinition: this.#definition,
                baselineProfile: pending.baselineProfile,
                currentProfile: outcome.profile,
                grant: pending.learningGrant,
              });
            }
            return projectCommittedOutcome(outcome);
          })();
      } catch (recoveryError) {
        this.#assertCurrentOperationCommit('Arena Learning结算意图台账Profile恢复');
        const disposition = resolveArenaV2ProfilePersistenceDispositionCandidateV1(
          recoveryError,
        );
        if (disposition === 'fail-closed') {
          this.#lifecycle = 'failed';
          throw recoveryError;
        }
        if (disposition === 'restart') this.#lifecycle = 'failed';
        return Object.freeze({
          status: disposition === 'retry'
            ? 'recovery-retry-required' as const
            : 'recovery-restart-required' as const,
          reason: disposition === 'retry'
            ? 'learning-profile-recovery-temporarily-unavailable' as const
            : 'learning-profile-recovery-indeterminate' as const,
          rewardGrantId: pending.rewardGrant.grantId,
          learningGrantId: pending.learningGrant.grantId,
          rewardGrant: pending.rewardGrant,
          learningGrant: pending.learningGrant,
          baselineProfile: pending.baselineProfile,
          recoveryError,
        });
      }
      return Object.freeze({
        status: 'recovered-after-reward' as const,
        settlement,
        rewardGrant: pending.rewardGrant,
        learningGrant: pending.learningGrant,
        baselineProfile: pending.baselineProfile,
      });
    });
  }

  acknowledge(value: unknown): void {
    this.#runOperation('acknowledge', () => {
      this.#assertOpen();
      try {
        this.#assertExclusive();
        const name = 'Arena Learning settlement intent acknowledgement';
        const source = assertPlainRecord(value, name);
        assertKnownKeys(source, ACKNOWLEDGE_KEYS, name);
        for (const key of ACKNOWLEDGE_KEYS) {
          if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
        }
        const rewardGrantId = assertNonEmptyString(
          requiredDataField(source, 'rewardGrantId', name),
          `${name}.rewardGrantId`,
        );
        const learningGrantId = assertNonEmptyString(
          requiredDataField(source, 'learningGrantId', name),
          `${name}.learningGrantId`,
        );
        if (this.#pending?.rewardGrant?.grantId !== rewardGrantId
          || this.#pending?.learningGrant?.grantId !== learningGrantId) {
          throw new RangeError('Arena Learning结算意图确认身份漂移。');
        }
        this.#deleteConfirmed();
        this.#pending = null;
        this.#assertCurrentOperationCommit('Arena Learning结算意图台账确认删除');
      } catch (error) {
        this.#lifecycle = 'failed';
        throw error;
      }
    });
  }

  discardUnpreparedBaseline(): void {
    this.#runOperation('discard-unprepared-baseline', () => {
      this.#assertOpen();
      try {
        this.#assertExclusive();
        if (this.#pending === null) return;
        if (this.#pending.rewardGrant !== null || this.#pending.learningGrant !== null) {
          throw new Error('Arena Learning结算意图已包含Grant，不能按未开局基线丢弃。');
        }
        this.#deleteConfirmed();
        this.#pending = null;
        this.#assertCurrentOperationCommit('Arena Learning结算意图台账未准备基线删除');
      } catch (error) {
        this.#lifecycle = 'failed';
        throw error;
      }
    });
  }

  #snapshot(): ArenaV2LearningSettlementIntentJournalSnapshotCandidateV1 {
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      lifecycle: this.#lifecycle,
      pendingBaselineCaptured: this.#pending !== null,
      pendingRewardGrantCaptured: this.#pending?.rewardGrant !== null
        && this.#pending?.rewardGrant !== undefined,
      pendingLearningGrantCaptured: this.#pending?.learningGrant !== null
        && this.#pending?.learningGrant !== undefined,
      pendingRewardGrantId: this.#pending?.rewardGrant?.grantId ?? null,
      pendingLearningGrantId: this.#pending?.learningGrant?.grantId ?? null,
    });
  }

  getSnapshot(): ArenaV2LearningSettlementIntentJournalSnapshotCandidateV1 {
    return this.#runOperation('snapshot-read', () => this.#snapshot());
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#lifecycle === 'destroyed') return;
      try {
        this.#callChecked(
          'Arena Learning结算意图台账销毁租约',
          () => this.#leaseValue().destroy(),
        );
        this.#lease = null;
        this.#storage = null;
        this.#intentKey = null;
        this.#pending = null;
        this.#lifecycle = 'destroyed';
      } catch (error) {
        if (this.#lifecycle !== 'destroyed') this.#lifecycle = 'failed';
        throw error;
      }
    });
  }
}

export const ARENA_V2_LEARNING_SETTLEMENT_INTENT_JOURNAL_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  persistsBaselineBeforeMatchMutation: true as const,
  persistsRewardAndLearningGrantsBeforeFirstProfileWrite: true as const,
  rejectsSameResultDifferentReplayBindingBeforeRewardWrite: true as const,
  recoveryRequiresCommittedRewardBeforeLearningWrite: true as const,
  recoveryIsIdempotentAndProfileDriven: true as const,
  discardDecisionSurvivesIntentCleanupFailure: true as const,
  startupRecoverableProfileFailureRetainsOpenJournalForExplicitRetry: true as const,
  startupLearningRecoveryFailureRetainsIntentForNextRestart: true as const,
  startupNonPersistenceFailureFailsClosed: true as const,
  persistenceDispositionContract: 'retry-restart-fail-closed' as const,
  crossProfileTransactionClaimed: false as const,
  operationGuardPrecedesLifecycleAndInputValidation: true as const,
  leaseStorageAndProfilePortsCheckedBeforeCrossOwnerProgress: true as const,
  durableWriteAndDeleteReadbackPrecedesReentryRejection: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  leaseStorageAndProfileCallbacksCheckedBeforeJournalCommit: true as const,
  cleanupReentryRetainsCurrentAndLaterJournalOwners: true as const,
  publicSnapshotRejectsOperationIntermediateState: true as const,
  destroyWatermarkPrecedesReentryRejection: true as const,
  validationStatus: 'not-run' as const,
});
