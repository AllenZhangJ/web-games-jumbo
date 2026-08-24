import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2LearningProfileRepositoryV1,
  PlayerProfileRepository,
} from '@number-strategy-jump/arena-profile-persistence';
import {
  ArenaV2LearningProfileServiceV1,
  PlayerProfileService,
} from '@number-strategy-jump/arena-profile-service';

export interface ArenaV2ProfileServicesOwnerCandidateV1Options {
  readonly rewardProfileDefinition: unknown;
  readonly learningProfileDefinition: unknown;
  readonly storage: unknown;
  readonly ownerId: unknown;
  readonly wallNow: unknown;
  readonly keyPrefix?: unknown;
  readonly leaseDurationMs?: unknown;
  readonly leaseTakeoverSameOwner?: unknown;
}

const OPTION_KEYS = new Set([
  'rewardProfileDefinition',
  'learningProfileDefinition',
  'storage',
  'ownerId',
  'wallNow',
  'keyPrefix',
  'leaseDurationMs',
  'leaseTakeoverSameOwner',
]);
const REQUIRED_KEYS = Object.freeze([
  'rewardProfileDefinition',
  'learningProfileDefinition',
  'storage',
  'ownerId',
  'wallNow',
] as const);

function dataField(source: object, key: string, fallback?: unknown): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined) return fallback;
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`Arena profile services owner.${key}必须是数据字段。`);
  }
  return descriptor.value;
}

function cleanup(target: { destroy(): void } | null, name: string): Error[] {
  if (target === null) return [];
  try {
    target.destroy();
    return [];
  } catch (error) {
    return [normalizeThrownError(error, `${name}清理失败`)];
  }
}

interface ProfileServicesConstructionCleanupResourcesCandidateV1 {
  rewardProfileService: PlayerProfileService | null;
  rewardProfileRepository: PlayerProfileRepository | null;
  learningProfileService: ArenaV2LearningProfileServiceV1 | null;
  learningProfileRepository: ArenaV2LearningProfileRepositoryV1 | null;
}

type ProfileServicesOwnerOperationCandidateV1 =
  | 'reward-service-read'
  | 'learning-service-read'
  | 'snapshot-read'
  | 'destroy';

function profileServicesConstructionCleanupCompleteCandidateV1(
  resources: ProfileServicesConstructionCleanupResourcesCandidateV1,
): boolean {
  return resources.rewardProfileService === null
    && resources.rewardProfileRepository === null
    && resources.learningProfileService === null
    && resources.learningProfileRepository === null;
}

function cleanupProfileServicesConstructionResourcesCandidateV1(
  resources: ProfileServicesConstructionCleanupResourcesCandidateV1,
): void {
  const cleanupErrors: Error[] = [];
  if (resources.learningProfileService !== null) {
    const errors = cleanup(resources.learningProfileService, 'Arena learning profile service');
    cleanupErrors.push(...errors);
    if (errors.length === 0) resources.learningProfileService = null;
  }
  if (resources.learningProfileService === null
    && resources.learningProfileRepository !== null) {
    const errors = cleanup(
      resources.learningProfileRepository,
      'Arena learning profile repository',
    );
    cleanupErrors.push(...errors);
    if (errors.length === 0) resources.learningProfileRepository = null;
  }
  if (resources.rewardProfileService !== null) {
    const errors = cleanup(resources.rewardProfileService, 'Arena reward profile service');
    cleanupErrors.push(...errors);
    if (errors.length === 0) resources.rewardProfileService = null;
  }
  if (resources.rewardProfileService === null
    && resources.rewardProfileRepository !== null) {
    const errors = cleanup(
      resources.rewardProfileRepository,
      'Arena reward profile repository',
    );
    cleanupErrors.push(...errors);
    if (errors.length === 0) resources.rewardProfileRepository = null;
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, 'Arena profile services owner构造资源清理不完整。');
  }
  if (!profileServicesConstructionCleanupCompleteCandidateV1(resources)) {
    throw new Error('Arena profile services owner构造资源清理依赖尚未收敛。');
  }
}

export class ArenaV2ProfileServicesOwnerConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: Error;
  readonly cleanupError: unknown;
  readonly #resources: ProfileServicesConstructionCleanupResourcesCandidateV1;

  constructor(
    originalError: Error,
    cleanupError: unknown,
    resources: ProfileServicesConstructionCleanupResourcesCandidateV1,
  ) {
    super(
      [originalError, cleanupError],
      'Arena profile services owner构造失败且反向清理不完整。',
    );
    this.name = 'ArenaV2ProfileServicesOwnerConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return profileServicesConstructionCleanupCompleteCandidateV1(this.#resources);
  }

  retryCleanup(): void {
    cleanupProfileServicesConstructionResourcesCandidateV1(this.#resources);
  }
}

/**
 * Atomically owns the legacy reward Profile and the Arena V2 learning Profile.
 * They use independent CAS slots and leases over the same synchronous storage.
 */
export class ArenaV2ProfileServicesOwnerCandidateV1 {
  #rewardProfileService: PlayerProfileService | null;
  #learningProfileService: ArenaV2LearningProfileServiceV1 | null;
  #destroyed = false;
  #failed = false;
  #operation: ProfileServicesOwnerOperationCandidateV1 | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: ArenaV2ProfileServicesOwnerCandidateV1Options) {
    const source = assertPlainRecord(value, 'Arena profile services owner options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena profile services owner options');
    for (const key of REQUIRED_KEYS) {
      if (!Object.hasOwn(source, key)) {
        throw new TypeError(`Arena profile services owner缺少${key}。`);
      }
    }
    const ownerId = assertNonEmptyString(
      dataField(source, 'ownerId'),
      'Arena profile services owner.ownerId',
    );
    const wallNow = dataField(source, 'wallNow');
    if (typeof wallNow !== 'function') {
      throw new TypeError('Arena profile services owner.wallNow必须是函数。');
    }
    const keyPrefix = assertNonEmptyString(
      dataField(source, 'keyPrefix', 'arena-v2.profile-services.candidate.v1'),
      'Arena profile services owner.keyPrefix',
    );
    const leaseDurationMs = assertIntegerAtLeast(
      dataField(source, 'leaseDurationMs', 60_000),
      1_000,
      'Arena profile services owner.leaseDurationMs',
    );
    const leaseTakeoverSameOwner = dataField(source, 'leaseTakeoverSameOwner', false);
    if (typeof leaseTakeoverSameOwner !== 'boolean') {
      throw new TypeError('Arena profile services owner.leaseTakeoverSameOwner必须是boolean。');
    }
    const storage = dataField(source, 'storage');
    const rewardDefinition = dataField(source, 'rewardProfileDefinition');
    const learningDefinition = dataField(source, 'learningProfileDefinition');

    let rewardRepository: PlayerProfileRepository | null = null;
    let rewardService: PlayerProfileService | null = null;
    let learningRepository: ArenaV2LearningProfileRepositoryV1 | null = null;
    let learningService: ArenaV2LearningProfileServiceV1 | null = null;
    try {
      rewardRepository = new PlayerProfileRepository({
        definition: rewardDefinition,
        storage,
        ownerId: `${ownerId}.reward`,
        leaseHolderId: `${ownerId}.reward.holder`,
        wallNow: wallNow as () => number,
        leaseDurationMs,
        leaseTakeoverSameOwner,
        keyPrefix: `${keyPrefix}.reward`,
      });
      rewardService = new PlayerProfileService({
        definition: rewardDefinition,
        repository: rewardRepository,
      });
      rewardRepository = null;
      rewardService.open();

      learningRepository = new ArenaV2LearningProfileRepositoryV1({
        definition: learningDefinition,
        storage,
        ownerId: `${ownerId}.learning`,
        leaseHolderId: `${ownerId}.learning.holder`,
        wallNow: wallNow as () => number,
        leaseDurationMs,
        leaseTakeoverSameOwner,
        keyPrefix: `${keyPrefix}.learning`,
      });
      learningService = new ArenaV2LearningProfileServiceV1({
        definition: learningDefinition,
        repository: learningRepository,
      });
      learningRepository = null;
      learningService.open();
    } catch (error) {
      const originalError = normalizeThrownError(
        error,
        'Arena profile services owner创建失败',
      );
      const resources: ProfileServicesConstructionCleanupResourcesCandidateV1 = {
        rewardProfileService: rewardService,
        rewardProfileRepository: rewardRepository,
        learningProfileService: learningService,
        learningProfileRepository: learningRepository,
      };
      try {
        cleanupProfileServicesConstructionResourcesCandidateV1(resources);
      } catch (cleanupError) {
        throw new ArenaV2ProfileServicesOwnerConstructionCleanupFailureCandidateV1(
          originalError,
          cleanupError,
          resources,
        );
      }
      throw originalError;
    }
    this.#rewardProfileService = rewardService;
    this.#learningProfileService = learningService;
    Object.freeze(this);
  }

  #rejectReentry(operation: ProfileServicesOwnerOperationCandidateV1): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `Arena profile services owner操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw error;
  }

  #runOperation<T>(operation: ProfileServicesOwnerOperationCandidateV1, callback: () => T): T {
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
    if (!this.#destroyed) this.#failed = true;
    const error = new Error(`Arena profile services owner ${operation}期间发生回调重入。`);
    if (this.#reentryError !== null) error.cause = this.#reentryError;
    throw error;
  }

  #assertReadable(): void {
    if (this.#destroyed) throw new Error('Arena profile services owner已销毁。');
    if (this.#failed) throw new Error('Arena profile services owner已失败关闭。');
  }

  #rewardService(): PlayerProfileService {
    if (this.#rewardProfileService === null) {
      throw new Error('Arena reward profile service所有权不可用。');
    }
    return this.#rewardProfileService;
  }

  #learningService(): ArenaV2LearningProfileServiceV1 {
    if (this.#learningProfileService === null) {
      throw new Error('Arena learning profile service所有权不可用。');
    }
    return this.#learningProfileService;
  }

  get rewardProfileService(): PlayerProfileService {
    return this.#runOperation('reward-service-read', () => {
      this.#assertReadable();
      return this.#rewardService();
    });
  }

  get learningProfileService(): ArenaV2LearningProfileServiceV1 {
    return this.#runOperation('learning-service-read', () => {
      this.#assertReadable();
      return this.#learningService();
    });
  }

  getSnapshot(): unknown {
    return this.#runOperation('snapshot-read', () => {
      this.#assertReadable();
      try {
        let sequence = this.#reentrySequence;
        const reward = this.#rewardService().getSnapshot();
        this.#assertReentryFree(sequence, 'Reward Profile读取');
        sequence = this.#reentrySequence;
        const learning = this.#learningService().getSnapshot();
        this.#assertReentryFree(sequence, 'Learning Profile读取');
        return Object.freeze({ reward, learning });
      } catch (error) {
        this.#failed = true;
        throw error;
      }
    });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#destroyed) return;
      const errors: Error[] = [];
      if (this.#learningProfileService !== null) {
        const sequence = this.#reentrySequence;
        const currentErrors = cleanup(
          this.#learningProfileService,
          'Arena learning profile service',
        );
        errors.push(...currentErrors);
        if (currentErrors.length === 0) this.#learningProfileService = null;
        this.#destroyed = this.#learningProfileService === null
          && this.#rewardProfileService === null;
        this.#assertReentryFree(sequence, 'Learning Profile清理');
      }
      if (this.#rewardProfileService !== null) {
        const sequence = this.#reentrySequence;
        const currentErrors = cleanup(
          this.#rewardProfileService,
          'Arena reward profile service',
        );
        errors.push(...currentErrors);
        if (currentErrors.length === 0) this.#rewardProfileService = null;
        this.#destroyed = this.#learningProfileService === null
          && this.#rewardProfileService === null;
        this.#assertReentryFree(sequence, 'Reward Profile清理');
      }
      this.#destroyed = this.#learningProfileService === null
        && this.#rewardProfileService === null;
      if (errors.length > 0) {
        this.#failed = true;
        throw new AggregateError(errors, 'Arena profile services owner清理不完整。');
      }
    });
  }
}

export function createArenaV2ProfileServicesOwnerCandidateV1(
  value: ArenaV2ProfileServicesOwnerCandidateV1Options,
): ArenaV2ProfileServicesOwnerCandidateV1 {
  return new ArenaV2ProfileServicesOwnerCandidateV1(value);
}

export const ARENA_V2_PROFILE_SERVICES_OWNER_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  ownsRewardAndLearningProfiles: true as const,
  usesIndependentCasSlotsAndLeases: true as const,
  sameOwnerTakeoverUsesDistinctLeaseHolders: true as const,
  constructionCleanupRetainsRetryableProfileOwners: true as const,
  constructionCleanupRetriesOnlyIncompleteOwners: true as const,
  operationGuardPrecedesPublicStateChecks: true as const,
  profileReadsCheckedBeforeCrossChildProgress: true as const,
  swallowedCleanupReentryRetainsAllUnprocessedOwners: true as const,
  successfulCleanupWatermarkPrecedesReentryRejection: true as const,
  publicReadsRejectOperationIntermediateState: true as const,
  validationStatus: 'not-run' as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
});
