import {
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2AtomicRegistryReferenceCandidateV1,
  type ArenaV2AtomicRegistryReferenceOptionsCandidateV1,
} from './arena-v2-atomic-registry-reference-candidate-v1.js';
import {
  ArenaV2RegistryActiveBootstrapCandidateV1,
} from './arena-v2-registry-active-bootstrap-candidate-v1.js';
import {
  ArenaV2SingleWeaponPersistentRegistrationHostCandidateV1,
  type ArenaV2SingleWeaponPersistentRegistrationHostOptionsCandidateV1,
} from './arena-v2-single-weapon-persistent-registration-host-candidate-v1.js';
import {
  createArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1,
  type ArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1,
} from './arena-v2-single-weapon-registry-promotion-receipt-candidate-v1.js';
import type {
  ArenaV2RegistryPublicationEnvelopeCandidateV1,
} from './arena-v2-registry-publication-envelope-candidate-v1.js';

export const ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_COORDINATOR_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export interface ArenaV2SingleWeaponRegistryPromotionCoordinatorOptionsCandidateV1 {
  readonly coordinatorId: string;
  readonly registrationHostOptions:
    ArenaV2SingleWeaponPersistentRegistrationHostOptionsCandidateV1;
  readonly atomicReferenceOptions?: ArenaV2AtomicRegistryReferenceOptionsCandidateV1;
  readonly registryReference?: ArenaV2RegistryActiveBootstrapCandidateV1;
}

export type ArenaV2SingleWeaponRegistryPromotionCoordinatorStateCandidateV1 =
  | 'ready'
  | 'published'
  | 'rolled-back'
  | 'activated-reference-stale'
  | 'reference-promoted-unsealed'
  | 'promoted'
  | 'failed'
  | 'destroyed';

const OPTION_KEYS = new Set([
  'coordinatorId', 'registrationHostOptions', 'atomicReferenceOptions', 'registryReference',
]);
const REQUIRED_OPTION_KEYS = Object.freeze(['coordinatorId', 'registrationHostOptions'] as const);

export const ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_COORDINATOR_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_COORDINATOR_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.single-weapon-registry-promotion-coordinator-policy.candidate.v1' as const,
    status: 'production-unreachable' as const,
    order: 'persistent-publish-then-durable-activate-then-reference-swap-then-seal' as const,
    preSwapFailure: 'exact-persistent-rollback' as const,
    postActivationSwapFailure: 'retry-reference-without-persistent-rollback' as const,
    postSwapSealFailure: 'retry-seal-without-reference-rollback' as const,
    constructionClosure: 'reference-and-persistent-head-must-match' as const,
    externalActiveReferenceSupported: true as const,
    externalReferenceOwnership: 'caller-retained' as const,
    destroyRejectsUnsealedPersistentPublicationBeforeAnyCleanup: true as const,
    destroyAttemptsIndependentOwnedChildren: true as const,
    destroyClearsOnlySuccessfullyReleasedChildren: true as const,
    swallowedChildReentryCannotPublishPromoted: true as const,
    childCallsCheckedByReentrySequence: true as const,
    promotionWatermarksCommittedBeforeReentryCheck: true as const,
    snapshotRejectedDuringTransition: true as const,
    idempotentDestroyChecksReentryBeforeFastPath: true as const,
    failedCoordinatorRejectsRegistryRead: true as const,
    defaultInstanceCreated: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
  });

function exactOptions(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 Registry promotion coordinator options必须是普通对象。');
  }
  assertKnownKeys(value, OPTION_KEYS, 'Arena V2 Registry promotion coordinator options');
  for (const key of REQUIRED_OPTION_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Arena V2 Registry promotion coordinator options.${key}缺失。`);
    }
  }
  const hasAtomicOptions = Object.hasOwn(value, 'atomicReferenceOptions')
    && value.atomicReferenceOptions !== undefined;
  const hasRegistryReference = Object.hasOwn(value, 'registryReference')
    && value.registryReference !== undefined;
  if (hasAtomicOptions === hasRegistryReference) {
    throw new TypeError('Arena V2 Registry promotion必须且只能选择内部或外部一个引用。');
  }
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function message(error: unknown): string {
  return typeof error === 'string' && error.length > 0
    ? error
    : 'Arena V2 Registry promotion发生非字符串失败。';
}

export class ArenaV2SingleWeaponRegistryPromotionCoordinatorCandidateV1 {
  #coordinatorId: string | null;
  #registrationHost:
    ArenaV2SingleWeaponPersistentRegistrationHostCandidateV1 | null = null;
  #registryReference:
    ArenaV2AtomicRegistryReferenceCandidateV1
    | ArenaV2RegistryActiveBootstrapCandidateV1
    | null = null;
  #ownsRegistryReference: boolean;
  #state: ArenaV2SingleWeaponRegistryPromotionCoordinatorStateCandidateV1 = 'ready';
  #transitioning = false;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #promotionAttempts = 0;
  #sealRetryAttempts = 0;
  #lastReceiptHash: string | null = null;
  #pendingReceipt:
    Readonly<ArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1> | null = null;
  #pendingEnvelope: Readonly<ArenaV2RegistryPublicationEnvelopeCandidateV1> | null = null;
  #lastFailure: string | null = null;

  constructor(options: ArenaV2SingleWeaponRegistryPromotionCoordinatorOptionsCandidateV1) {
    exactOptions(options);
    this.#coordinatorId = assertNonEmptyString(
      options.coordinatorId,
      'Arena V2 Registry promotion coordinatorId',
    );
    const ownsRegistryReference = options.atomicReferenceOptions !== undefined;
    const registryReference = ownsRegistryReference
      ? new ArenaV2AtomicRegistryReferenceCandidateV1(
        options.atomicReferenceOptions as ArenaV2AtomicRegistryReferenceOptionsCandidateV1,
      )
      : options.registryReference;
    if (!(registryReference instanceof ArenaV2AtomicRegistryReferenceCandidateV1)
      && !(registryReference instanceof ArenaV2RegistryActiveBootstrapCandidateV1)) {
      throw new TypeError('Arena V2 Registry promotion外部引用必须来自active bootstrap。');
    }
    this.#ownsRegistryReference = ownsRegistryReference;
    let registrationHost: ArenaV2SingleWeaponPersistentRegistrationHostCandidateV1 | null = null;
    try {
      registrationHost = new ArenaV2SingleWeaponPersistentRegistrationHostCandidateV1(
        options.registrationHostOptions as (
          ArenaV2SingleWeaponPersistentRegistrationHostOptionsCandidateV1
        ),
      );
      const stored = registrationHost.readRegistry();
      const active = registrationHost.readActiveRegistry();
      const referenced = registryReference.read();
      if (stored.revision !== active.revision
        || stored.snapshotHash !== active.snapshotHash
        || !sameIds(stored.collectionWeaponIds, active.collectionWeaponIds)
        || active.revision !== referenced.revision
        || active.snapshotHash !== referenced.snapshotHash
        || !sameIds(active.collectionWeaponIds, referenced.collectionWeaponIds)) {
        throw new RangeError('Arena V2 Registry存在pending头或durable active与原子引用不一致。');
      }
      this.#registrationHost = registrationHost;
      this.#registryReference = registryReference;
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      try { registrationHost?.destroy(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      if (ownsRegistryReference) {
        try { registryReference.destroy(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 Registry promotion coordinator构造失败且清理未完成。',
        );
      }
      throw error;
    }
    Object.freeze(this);
  }

  #notTransitioning(): void {
    if (!this.#transitioning) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error('Arena V2 Registry promotion coordinator操作不可重入。');
    throw this.#reentryError;
  }

  #beginTransition(): void {
    this.#notTransitioning();
    this.#reentryError = null;
    this.#transitioning = true;
  }

  #assertNoReentrySince(sequence: number, operation: string, cause?: unknown): void {
    if (this.#reentrySequence === sequence) return;
    this.#state = 'failed';
    const reentryError = this.#reentryError
      ?? new Error(`Arena V2 Registry promotion ${operation}期间发生重入。`);
    if (cause !== undefined && cause !== reentryError) {
      throw new AggregateError(
        [reentryError, cause],
        `Arena V2 Registry promotion ${operation}期间发生重入且子操作失败。`,
      );
    }
    throw reentryError;
  }

  #runChildOperation<T>(
    operation: string,
    callback: () => T,
    onCommitted?: (result: T) => void,
  ): T {
    const reentrySequence = this.#reentrySequence;
    let result: T;
    try {
      result = callback();
    } catch (error) {
      this.#assertNoReentrySince(reentrySequence, operation, error);
      throw error;
    }
    onCommitted?.(result);
    this.#assertNoReentrySince(reentrySequence, operation);
    return result;
  }

  #endTransition(): void {
    this.#transitioning = false;
  }

  #requireHost(): ArenaV2SingleWeaponPersistentRegistrationHostCandidateV1 {
    if (this.#registrationHost === null) {
      throw new Error('Arena V2 Registry promotion coordinator已销毁。');
    }
    return this.#registrationHost;
  }

  #requireReference(): ArenaV2AtomicRegistryReferenceCandidateV1
    | ArenaV2RegistryActiveBootstrapCandidateV1 {
    if (this.#registryReference === null) {
      throw new Error('Arena V2 Registry promotion coordinator已销毁。');
    }
    return this.#registryReference;
  }

  publishAndPromote(): Readonly<
    ArenaV2SingleWeaponRegistryPromotionCoordinatorSnapshotCandidateV1
  > {
    this.#notTransitioning();
    if (this.#state !== 'ready') {
      throw new Error(`Arena V2 Registry promotion状态无效：${this.#state}。`);
    }
    this.#beginTransition();
    this.#promotionAttempts += 1;
    let durableActivated = false;
    let referencePromoted = false;
    let publicationSealed = false;
    try {
      const host = this.#requireHost();
      this.#runChildOperation('持久发布', () => host.publish(), () => {
        this.#state = 'published';
      });
      const capability = host.createPublishedPromotionCapability();
      const receipt = createArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1(capability);
      this.#pendingReceipt = receipt;
      this.#pendingEnvelope = capability.registryEnvelope;
      this.#runChildOperation(
        'durable active激活',
        () => host.activatePublishedGeneration(capability, receipt.receiptHash),
        () => {
          durableActivated = true;
          this.#state = 'activated-reference-stale';
        },
      );
      this.#runChildOperation(
        '原子引用交换',
        () => this.#requireReference().promote(Object.freeze({
          receiptCapability: receipt,
          registryEnvelope: capability.registryEnvelope,
        })),
        () => {
          referencePromoted = true;
          this.#lastReceiptHash = receipt.receiptHash;
          this.#state = 'reference-promoted-unsealed';
        },
      );
      this.#runChildOperation('持久发布封存', () => host.sealPublication(), () => {
        publicationSealed = true;
        this.#state = 'promoted';
        this.#pendingReceipt = null;
        this.#pendingEnvelope = null;
      });
    } catch (error) {
      this.#lastFailure = message(error);
      if (publicationSealed) {
        this.#state = 'failed';
        throw error;
      }
      if (referencePromoted) {
        this.#state = 'reference-promoted-unsealed';
        throw error;
      }
      if (durableActivated) {
        this.#state = 'activated-reference-stale';
        throw error;
      }
      if (this.#registrationHost?.snapshot().state === 'published') {
        try {
          this.#runChildOperation(
            '引用交换前持久发布回滚',
            () => this.#registrationHost!.rollback(),
            () => { this.#state = 'rolled-back'; },
          );
        } catch (rollbackError) {
          this.#state = 'failed';
          throw new AggregateError(
            [error, rollbackError],
            'Arena V2 Registry引用交换前失败且持久发布回滚未完成。',
          );
        }
      } else {
        this.#state = 'failed';
      }
      throw error;
    } finally {
      this.#endTransition();
    }
    return this.snapshot();
  }

  retryReferenceAfterActivation(): Readonly<
    ArenaV2SingleWeaponRegistryPromotionCoordinatorSnapshotCandidateV1
  > {
    this.#notTransitioning();
    if (this.#state !== 'activated-reference-stale'
      || this.#pendingReceipt === null
      || this.#pendingEnvelope === null) {
      throw new Error(`Arena V2 Registry promotion引用重试状态无效：${this.#state}。`);
    }
    const pendingReceipt = this.#pendingReceipt;
    const pendingEnvelope = this.#pendingEnvelope;
    this.#beginTransition();
    let referencePromoted = false;
    let publicationSealed = false;
    try {
      this.#runChildOperation(
        '激活后原子引用重试',
        () => this.#requireReference().promote(Object.freeze({
          receiptCapability: pendingReceipt,
          registryEnvelope: pendingEnvelope,
        })),
        () => {
          referencePromoted = true;
          this.#state = 'reference-promoted-unsealed';
        },
      );
      this.#runChildOperation('引用重试后持久发布封存', () => this.#requireHost().sealPublication(), () => {
        publicationSealed = true;
        this.#state = 'promoted';
        this.#pendingReceipt = null;
        this.#pendingEnvelope = null;
      });
    } catch (error) {
      this.#lastFailure = message(error);
      if (publicationSealed) {
        this.#state = 'failed';
      } else if (referencePromoted
        || this.#requireReference().read().revision
          === this.#requireHost().readActiveRegistry().revision) {
        this.#state = 'reference-promoted-unsealed';
      }
      throw error;
    } finally {
      this.#endTransition();
    }
    return this.snapshot();
  }

  retrySealAfterPromotion(): Readonly<
    ArenaV2SingleWeaponRegistryPromotionCoordinatorSnapshotCandidateV1
  > {
    this.#notTransitioning();
    if (this.#state !== 'reference-promoted-unsealed') {
      throw new Error(`Arena V2 Registry promotion封存重试状态无效：${this.#state}。`);
    }
    this.#beginTransition();
    this.#sealRetryAttempts += 1;
    try {
      this.#runChildOperation('持久发布封存重试', () => this.#requireHost().sealPublication(), () => {
        this.#state = 'promoted';
        this.#pendingReceipt = null;
        this.#pendingEnvelope = null;
      });
    } catch (error) {
      this.#lastFailure = message(error);
      throw error;
    } finally {
      this.#endTransition();
    }
    return this.snapshot();
  }

  renewLease(): boolean {
    this.#notTransitioning();
    if (this.#state === 'failed' || this.#state === 'destroyed') {
      throw new Error(`Arena V2 Registry promotion续租状态无效：${this.#state}。`);
    }
    this.#beginTransition();
    try {
      return this.#runChildOperation(
        '持久发布租约续期',
        () => this.#requireHost().renewLease(),
      );
    } catch (error) {
      this.#state = 'failed';
      this.#lastFailure = message(error);
      throw error;
    } finally {
      this.#endTransition();
    }
  }

  readRegistry() {
    this.#notTransitioning();
    if (this.#state === 'failed' || this.#state === 'destroyed') {
      throw new Error(`Arena V2 Registry promotion读取状态无效：${this.#state}。`);
    }
    return this.#requireReference().read();
  }

  #snapshot(): Readonly<ArenaV2SingleWeaponRegistryPromotionCoordinatorSnapshotCandidateV1> {
    const host = this.#registrationHost?.snapshot() ?? null;
    const reference = this.#registryReference?.read() ?? null;
    return Object.freeze({
      schemaVersion:
        ARENA_V2_SINGLE_WEAPON_REGISTRY_PROMOTION_COORDINATOR_CANDIDATE_V1_SCHEMA_VERSION,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      coordinatorId: this.#coordinatorId,
      state: this.#state,
      transitioning: this.#transitioning,
      weaponId: host?.weaponId ?? null,
      persistentRevision: host?.registryRevision ?? null,
      activeRevision: host?.activeRegistryRevision ?? null,
      referenceRevision: reference?.revision ?? null,
      referenceSnapshotHash: reference?.snapshotHash ?? null,
      ownsRegistryReference: this.#ownsRegistryReference,
      promotionAttempts: this.#promotionAttempts,
      sealRetryAttempts: this.#sealRetryAttempts,
      lastReceiptHash: this.#lastReceiptHash,
      lastFailure: this.#lastFailure,
      defaultInstanceCreated: false as const,
      defaultRegistryWired: false as const,
      defaultCompositionWired: false as const,
    });
  }

  snapshot(): Readonly<ArenaV2SingleWeaponRegistryPromotionCoordinatorSnapshotCandidateV1> {
    this.#notTransitioning();
    return this.#snapshot();
  }

  destroy(): Readonly<ArenaV2SingleWeaponRegistryPromotionCoordinatorSnapshotCandidateV1> {
    this.#notTransitioning();
    if (this.#state === 'destroyed') return this.#snapshot();
    if (this.#state === 'published'
      || this.#state === 'activated-reference-stale'
      || this.#state === 'reference-promoted-unsealed'
      || this.#registrationHost?.snapshot().publicationState === 'published') {
      throw new Error('Arena V2 Registry promotion存在未收口发布，禁止销毁。');
    }
    this.#beginTransition();
    try {
      const errors: unknown[] = [];
      if (this.#registryReference !== null && this.#ownsRegistryReference) {
        const reference = this.#registryReference;
        try {
          this.#runChildOperation('原子引用销毁', () => reference.destroy(), () => {
            if (this.#registryReference === reference) this.#registryReference = null;
          });
        } catch (error) {
          errors.push(error);
        }
      } else {
        this.#registryReference = null;
      }
      if (this.#registrationHost !== null) {
        const host = this.#registrationHost;
        try {
          this.#runChildOperation('持久注册Host销毁', () => host.destroy(), () => {
            if (this.#registrationHost === host) this.#registrationHost = null;
          });
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length > 0) {
        this.#state = 'failed';
        this.#lastFailure = 'Arena V2 Registry promotion coordinator清理不完整。';
        throw new AggregateError(
          errors,
          'Arena V2 Registry promotion coordinator清理不完整。',
        );
      }
      this.#coordinatorId = null;
      this.#pendingReceipt = null;
      this.#pendingEnvelope = null;
      this.#state = 'destroyed';
    } catch (error) {
      if (this.#state !== 'failed') this.#lastFailure = message(error);
      throw error;
    } finally {
      this.#endTransition();
    }
    return this.snapshot();
  }
}

export interface ArenaV2SingleWeaponRegistryPromotionCoordinatorSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly coordinatorId: string | null;
  readonly state: ArenaV2SingleWeaponRegistryPromotionCoordinatorStateCandidateV1;
  readonly transitioning: boolean;
  readonly weaponId: string | null;
  readonly persistentRevision: number | null;
  readonly activeRevision: number | null;
  readonly referenceRevision: number | null;
  readonly referenceSnapshotHash: string | null;
  readonly ownsRegistryReference: boolean;
  readonly promotionAttempts: number;
  readonly sealRetryAttempts: number;
  readonly lastReceiptHash: string | null;
  readonly lastFailure: string | null;
  readonly defaultInstanceCreated: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
}
