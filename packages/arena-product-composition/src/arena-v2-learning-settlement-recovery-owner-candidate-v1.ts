import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  recoverArenaV2DuplicateLearningSettlementProjectionV1,
  type ArenaV2LearningSettlementProjectionV1,
} from '@number-strategy-jump/arena-product-progression';
import {
  createArenaV2LearningGrantV1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
  type ArenaV2LearningGrantV1,
  type ArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';

export interface ArenaV2LearningSettlementRecoveryOwnerCandidateV1Options {
  readonly profileDefinition: unknown;
  readonly readCurrentProfile: () => unknown;
  readonly onSettlementFinalized: (
    settlement: ArenaV2LearningSettlementProjectionV1,
    grant: ArenaV2LearningGrantV1,
  ) => void;
}

export interface ArenaV2LearningSettlementRecoveryReadCandidateV1 {
  readonly pendingBaselineCaptured: boolean;
  readonly pendingGrantCaptured: boolean;
  readonly retryRequired: boolean;
  readonly postProcessed: boolean;
  readonly lastError: unknown;
  readonly lastPostProcessingError: unknown;
}

export interface ArenaV2LearningSettlementRecoverySnapshotCandidateV1 {
  readonly read: ArenaV2LearningSettlementRecoveryReadCandidateV1;
  readonly settlement: ArenaV2LearningSettlementProjectionV1 | null;
}

type LearningSettlementRecoveryOperation =
  | 'assert-can-start-match'
  | 'capture-match-start-baseline'
  | 'retain-indeterminate-match-start-baseline'
  | 'capture-prepared-grant'
  | 'retain-pending-settlement-failure'
  | 'complete-settlement'
  | 'retry'
  | 'settlement-read'
  | 'pending-baseline-read'
  | 'recovery-read'
  | 'snapshot-read'
  | 'destroy';

const OPTION_KEYS = new Set([
  'profileDefinition',
  'readCurrentProfile',
  'onSettlementFinalized',
]);
const SETTLEMENT_KEYS = new Set([
  'status',
  'grantId',
  'profileRevision',
  'sourceModeDefinitionId',
  'effectiveLearningProgress',
  'progressKinds',
  'researchedWeaponDefinitionId',
  'weaponContextEvidenceDeltas',
  'mapSegmentEvidenceDeltas',
  'mapRouteEvidenceDeltas',
  'modeCompletionDeltas',
  'challengeProgressDeltas',
  'newlyCollectedWeaponDefinitionIds',
  'newlyCollectedMapDefinitionIds',
]);

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是自有可枚举数据字段。`);
  }
  return descriptor.value;
}

function dataFunction<T extends (...args: never[]) => unknown>(
  source: object,
  key: string,
  name: string,
): T {
  const value = dataField(source, key, name);
  if (typeof value !== 'function') throw new TypeError(`${name}.${key}必须是函数。`);
  return value as T;
}

function nonNullSnapshot(value: unknown, name: string): unknown {
  if (value === null || value === undefined) throw new TypeError(`${name}不能为空。`);
  return cloneFrozenData(value, name);
}

function canonicalGrant(
  profileDefinition: unknown,
  value: unknown,
): ArenaV2LearningGrantV1 {
  return createArenaV2LearningGrantV1(profileDefinition, value);
}

function canonicalSettlement(value: unknown): ArenaV2LearningSettlementProjectionV1 {
  const name = 'Arena V2 learning settlement recovery projection';
  const source = assertPlainRecord(cloneFrozenData(value, name), name);
  assertKnownKeys(source, SETTLEMENT_KEYS, name);
  for (const key of SETTLEMENT_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  if (source.status !== 'committed' && source.status !== 'duplicate') {
    throw new RangeError(`${name}.status无效。`);
  }
  if (typeof source.grantId !== 'string' || source.grantId.length === 0
    || typeof source.sourceModeDefinitionId !== 'string'
    || source.sourceModeDefinitionId.length === 0) {
    throw new TypeError(`${name}结算身份无效。`);
  }
  if (!Number.isSafeInteger(source.profileRevision) || (source.profileRevision as number) < 0) {
    throw new RangeError(`${name}.profileRevision无效。`);
  }
  if (typeof source.effectiveLearningProgress !== 'boolean'
    || !Array.isArray(source.progressKinds)
    || !Array.isArray(source.weaponContextEvidenceDeltas)
    || !Array.isArray(source.mapSegmentEvidenceDeltas)
    || !Array.isArray(source.mapRouteEvidenceDeltas)
    || !Array.isArray(source.modeCompletionDeltas)
    || !Array.isArray(source.challengeProgressDeltas)
    || !Array.isArray(source.newlyCollectedWeaponDefinitionIds)
    || !Array.isArray(source.newlyCollectedMapDefinitionIds)) {
    throw new TypeError(`${name}进度事实无效。`);
  }
  if (source.researchedWeaponDefinitionId !== null
    && (typeof source.researchedWeaponDefinitionId !== 'string'
      || source.researchedWeaponDefinitionId.length === 0)) {
    throw new TypeError(`${name}.researchedWeaponDefinitionId无效。`);
  }
  return source as unknown as ArenaV2LearningSettlementProjectionV1;
}

/**
 * Owns the only recoverable Learning settlement evidence for one local host.
 * It never writes a Profile: duplicate recovery replays the immutable Grant
 * against the immutable match-start baseline and compares that result with the
 * caller's current canonical Profile.
 */
export class ArenaV2LearningSettlementRecoveryOwnerCandidateV1 {
  readonly #profileDefinition: ArenaV2LearningProfileDefinitionV1;
  readonly #readCurrentProfile: () => unknown;
  readonly #onSettlementFinalized: (
    settlement: ArenaV2LearningSettlementProjectionV1,
    grant: ArenaV2LearningGrantV1,
  ) => unknown;
  #pendingBaseline: ArenaV2LearningProfileV1 | null = null;
  #pendingGrant: ArenaV2LearningGrantV1 | null = null;
  #finalizedGrant: ArenaV2LearningGrantV1 | null = null;
  #settlement: ArenaV2LearningSettlementProjectionV1 | null = null;
  #postProcessed = false;
  #lastError: unknown = null;
  #lastPostProcessingError: unknown = null;
  #operation: LearningSettlementRecoveryOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #destroyed = false;

  constructor(value: ArenaV2LearningSettlementRecoveryOwnerCandidateV1Options) {
    const name = 'Arena V2 learning settlement recovery owner options';
    const source = assertPlainRecord(value, name);
    assertKnownKeys(source, OPTION_KEYS, name);
    for (const key of OPTION_KEYS) {
      if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
    }
    this.#profileDefinition = createArenaV2LearningProfileDefinitionV1(
      dataField(source, 'profileDefinition', name),
    );
    this.#readCurrentProfile = dataFunction<() => unknown>(
      source,
      'readCurrentProfile',
      name,
    );
    this.#onSettlementFinalized = dataFunction<(
      settlement: ArenaV2LearningSettlementProjectionV1,
      grant: ArenaV2LearningGrantV1,
    ) => unknown>(source, 'onSettlementFinalized', name);
    Object.freeze(this);
  }

  #rejectReentry(operation: LearningSettlementRecoveryOperation): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `Arena Learning结算恢复操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #runOperation<T>(operation: LearningSettlementRecoveryOperation, callback: () => T): T {
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

  #assertLive(operation: string): void {
    if (this.#destroyed) throw new Error(`${operation}不能在已销毁owner上执行。`);
  }

  #assertCanStartMatchState(): void {
    this.#assertLive('Arena Learning结算恢复开局门');
    if (this.#pendingBaseline !== null) {
      throw new Error('Arena上一局Learning结算基线尚未消费，不能覆盖证据并开始下一局。');
    }
  }

  #captureMatchStartBaseline(value: unknown): void {
    this.#assertCanStartMatchState();
    const baseline = createArenaV2LearningProfileV1(
      this.#profileDefinition,
      nonNullSnapshot(value, 'Arena Learning开局前Profile基线'),
    );
    this.#pendingBaseline = baseline;
    this.#pendingGrant = null;
    this.#finalizedGrant = null;
    this.#settlement = null;
    this.#postProcessed = false;
    this.#lastError = null;
    this.#lastPostProcessingError = null;
  }

  #recover(): ArenaV2LearningSettlementProjectionV1 {
    const baselineProfile = this.#pendingBaseline;
    const grant = this.#pendingGrant;
    if (baselineProfile === null || grant === null) {
      throw new Error('Arena当前没有完整的Learning结算恢复证据。');
    }
    const currentProfile = this.#readCurrentProfile();
    this.#assertCurrentOperationCommit('Arena Learning当前Profile读取');
    return recoverArenaV2DuplicateLearningSettlementProjectionV1({
      profileDefinition: this.#profileDefinition,
      baselineProfile,
      currentProfile,
      grant,
    });
  }

  #finalize(
    settlement: ArenaV2LearningSettlementProjectionV1,
    grant: ArenaV2LearningGrantV1,
  ): ArenaV2LearningSettlementProjectionV1 {
    this.#pendingBaseline = null;
    this.#pendingGrant = null;
    this.#finalizedGrant = grant;
    this.#settlement = settlement;
    this.#lastError = null;
    if (this.#postProcessed) return settlement;

    // Commit the at-most-once marker before invoking non-authoritative work so
    // callback reentry or failure can never duplicate retention observations.
    this.#postProcessed = true;
    try {
      const returned = this.#onSettlementFinalized(settlement, grant);
      if (returned !== undefined) {
        throw new TypeError('Arena Learning结算后处理必须同步返回void。');
      }
      this.#assertCurrentOperationCommit('Arena Learning结算后处理');
      this.#lastPostProcessingError = null;
    } catch (error) {
      // Learning Profile and result projection are already authoritative. A
      // retention/presentation callback cannot turn them into a retryable write.
      this.#lastPostProcessingError = this.#reentryError ?? error;
    }
    return settlement;
  }

  assertCanStartMatch(): void {
    this.#runOperation('assert-can-start-match', () => this.#assertCanStartMatchState());
  }

  captureMatchStartBaseline(value: unknown): void {
    this.#runOperation(
      'capture-match-start-baseline',
      () => this.#captureMatchStartBaseline(value),
    );
  }

  retainIndeterminateMatchStartBaseline(value: unknown, error: unknown): void {
    this.#runOperation('retain-indeterminate-match-start-baseline', () => {
      this.#assertLive('Arena Learning不确定开局基线保留');
      if (this.#pendingBaseline === null) {
        this.#captureMatchStartBaseline(value);
      }
      this.#lastError = error;
    });
  }

  capturePreparedGrant(value: unknown): ArenaV2LearningGrantV1 {
    return this.#runOperation('capture-prepared-grant', () => {
      this.#assertLive('Arena Learning规范Grant预留');
      if (this.#pendingBaseline === null) {
        throw new Error('Arena Learning规范Grant预留缺少开局前Profile基线。');
      }
      const grant = canonicalGrant(this.#profileDefinition, value);
      if (this.#pendingGrant !== null) {
        const currentIdentity = createDeterministicDataHash(
          this.#pendingGrant,
          'Arena Learning pending Grant identity',
        );
        const nextIdentity = createDeterministicDataHash(
          grant,
          'Arena Learning prepared Grant identity',
        );
        if (currentIdentity !== nextIdentity) {
          throw new RangeError('Arena Learning拒绝替换已预留的规范Grant。');
        }
        return this.#pendingGrant;
      }
      this.#pendingGrant = grant;
      this.#lastError = null;
      return grant;
    });
  }

  retainPendingSettlementFailure(error: unknown): void {
    this.#runOperation('retain-pending-settlement-failure', () => {
      this.#assertLive('Arena Learning待恢复结算错误保留');
      if (this.#pendingBaseline === null || this.#pendingGrant === null) {
        throw new Error('Arena Learning待恢复结算错误缺少完整基线与Grant。');
      }
      this.#lastError = error;
    });
  }

  completeSettlement(
    rawSettlementValue: unknown,
    grantValue: unknown,
  ): ArenaV2LearningSettlementProjectionV1 {
    return this.#runOperation('complete-settlement', () => this.#completeSettlement(
      rawSettlementValue,
      grantValue,
    ));
  }

  #completeSettlement(
    rawSettlementValue: unknown,
    grantValue: unknown,
  ): ArenaV2LearningSettlementProjectionV1 {
    this.#assertLive('Arena Learning结算完成');
    const rawSettlement = canonicalSettlement(rawSettlementValue);
    const grant = canonicalGrant(this.#profileDefinition, grantValue);
    if (grant.grantId !== rawSettlement.grantId
      || grant.sourceModeDefinitionId !== rawSettlement.sourceModeDefinitionId) {
      throw new RangeError('Arena Learning结算投影与规范Grant身份漂移。');
    }
    if (this.#pendingGrant !== null
      && createDeterministicDataHash(
        this.#pendingGrant,
        'Arena Learning pending Grant settlement identity',
      ) !== createDeterministicDataHash(
        grant,
        'Arena Learning completed Grant settlement identity',
      )) {
      throw new RangeError('Arena Learning完成结算的Grant与预留Grant漂移。');
    }
    if (this.#postProcessed) {
      const finalizedGrant = this.#finalizedGrant;
      const settlement = this.#settlement;
      if (finalizedGrant === null || settlement === null) {
        throw new Error('Arena Learning已后处理结算缺少冻结的最终身份。');
      }
      if (settlement.grantId !== rawSettlement.grantId
        || settlement.sourceModeDefinitionId !== rawSettlement.sourceModeDefinitionId) {
        throw new RangeError('Arena Learning重复结算投影与最终结算身份漂移。');
      }
      if (createDeterministicDataHash(
        finalizedGrant,
        'Arena Learning finalized Grant identity',
      ) !== createDeterministicDataHash(
        grant,
        'Arena Learning repeated Grant identity',
      )) {
        throw new RangeError('Arena Learning重复结算的最终Grant身份漂移。');
      }
      this.#pendingBaseline = null;
      this.#pendingGrant = null;
      this.#lastError = null;
      return settlement;
    }
    if (this.#pendingBaseline === null) {
      throw new Error('Arena Learning结算缺少开局前Profile基线。');
    }
    if (rawSettlement.status !== 'duplicate') {
      this.#pendingGrant = grant;
      try {
        const recovered = this.#recover();
        if (createDeterministicDataHash(
          rawSettlement,
          'Arena Learning committed settlement projection identity',
        ) !== createDeterministicDataHash(
          recovered,
          'Arena Learning committed settlement replay identity',
        )) {
          throw new RangeError('Arena committed Learning结算投影与规范重放身份漂移。');
        }
        return this.#finalize(recovered, grant);
      } catch (error) {
        this.#lastError = error;
        throw error;
      }
    }

    this.#pendingGrant = grant;
    try {
      return this.#finalize(this.#recover(), grant);
    } catch (error) {
      this.#settlement = rawSettlement;
      this.#lastError = error;
      return rawSettlement;
    }
  }

  retry(): ArenaV2LearningSettlementProjectionV1 {
    return this.#runOperation('retry', () => this.#retry());
  }

  #retry(): ArenaV2LearningSettlementProjectionV1 {
    this.#assertLive('Arena Learning结算恢复重试');
    const grant = this.#pendingGrant;
    if (grant === null || this.#pendingBaseline === null) {
      throw new Error('Arena当前没有可重试的Learning结算恢复证据。');
    }
    try {
      return this.#finalize(this.#recover(), grant);
    } catch (error) {
      this.#lastError = error;
      throw error;
    }
  }

  getSettlement(): ArenaV2LearningSettlementProjectionV1 | null {
    return this.#runOperation('settlement-read', () => {
      this.#assertLive('Arena Learning结算投影读取');
      return this.#settlement;
    });
  }

  getPendingBaselineProfile(): ArenaV2LearningProfileV1 | null {
    return this.#runOperation('pending-baseline-read', () => {
      this.#assertLive('Arena Learning待恢复基线读取');
      return this.#pendingBaseline;
    });
  }

  #recoveryRead(): ArenaV2LearningSettlementRecoveryReadCandidateV1 {
    const pendingBaselineCaptured = this.#pendingBaseline !== null;
    const pendingGrantCaptured = this.#pendingGrant !== null;
    return Object.freeze({
      pendingBaselineCaptured,
      pendingGrantCaptured,
      retryRequired: pendingBaselineCaptured && pendingGrantCaptured,
      postProcessed: this.#postProcessed,
      lastError: this.#lastError,
      lastPostProcessingError: this.#lastPostProcessingError,
    });
  }

  getRead(): ArenaV2LearningSettlementRecoveryReadCandidateV1 {
    return this.#runOperation('recovery-read', () => {
      this.#assertLive('Arena Learning结算恢复状态读取');
      return this.#recoveryRead();
    });
  }

  getSnapshot(): ArenaV2LearningSettlementRecoverySnapshotCandidateV1 {
    return this.#runOperation('snapshot-read', () => {
      this.#assertLive('Arena Learning结算恢复聚合快照读取');
      return Object.freeze({
        read: this.#recoveryRead(),
        settlement: this.#settlement,
      });
    });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#destroyed) return;
      this.#pendingBaseline = null;
      this.#pendingGrant = null;
      this.#finalizedGrant = null;
      this.#settlement = null;
      this.#postProcessed = false;
      this.#lastError = null;
      this.#lastPostProcessingError = null;
      this.#destroyed = true;
    });
  }
}

export function createArenaV2LearningSettlementRecoveryOwnerCandidateV1(
  value: ArenaV2LearningSettlementRecoveryOwnerCandidateV1Options,
): ArenaV2LearningSettlementRecoveryOwnerCandidateV1 {
  return new ArenaV2LearningSettlementRecoveryOwnerCandidateV1(value);
}

export const ARENA_V2_LEARNING_SETTLEMENT_RECOVERY_OWNER_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  immutableBaselineAndGrantEvidence: true as const,
  preparedGrantCanBeCapturedBeforeRewardWrite: true as const,
  pendingBaselineCanBackReadOnlyResultDuringIndeterminateWrite: true as const,
  profileWritesDuringRecovery: 0 as const,
  settlementPostProcessingAtMostOnce: true as const,
  recoveryReadAndSettlementAggregateSnapshot: true as const,
  committedSettlementMatchesCanonicalReplay: true as const,
  finalizedGrantIdentityImmutableAcrossIdempotentSettlement: true as const,
  operationGuardPrecedesBusinessValidation: true as const,
  currentProfileReadReentryFailsBeforeRecoveryCommit: true as const,
  postProcessingReentryRecordedWithoutReopeningSettlement: true as const,
  publicReadsRejectOperationIntermediateState: true as const,
  destroyFastPathChecksOperationBeforeIdempotence: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  authoritativeProfileReadCheckedBeforeRecoveryCommit: true as const,
  nonAuthoritativePostProcessingReentryRemainsRecordedAtMostOnce: true as const,
  validationStatus: 'not-run' as const,
});
