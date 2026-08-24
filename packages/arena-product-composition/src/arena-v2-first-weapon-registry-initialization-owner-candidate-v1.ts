import {
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2EmptyRegistryBaselineCandidateV1,
} from './arena-v2-empty-registry-baseline-candidate-v1.js';
import type {
  ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1,
} from './arena-v2-persistent-registry-publication-port-candidate-v1.js';
import {
  ArenaV2PersistentRegistryPublicationPortCandidateV1,
} from './arena-v2-persistent-registry-publication-port-candidate-v1.js';
import {
  ArenaV2SingleWeaponRegistryPromotionCoordinatorCandidateV1,
  type ArenaV2SingleWeaponRegistryPromotionCoordinatorSnapshotCandidateV1,
} from './arena-v2-single-weapon-registry-promotion-coordinator-candidate-v1.js';

export const ARENA_V2_FIRST_WEAPON_REGISTRY_INITIALIZATION_OWNER_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export interface ArenaV2FirstWeaponRegistryInitializationOwnerOptionsCandidateV1 {
  readonly initializationOwnerId: string;
  readonly coordinatorId: string;
  readonly hostId: string;
  readonly publicationOwnerId: string;
  readonly assessment: unknown;
  readonly plan: unknown;
  readonly portOptions: ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1;
}

const OPTION_KEYS = new Set([
  'initializationOwnerId', 'coordinatorId', 'hostId', 'publicationOwnerId',
  'assessment', 'plan', 'portOptions',
]);
type InitializationOperation =
  | 'initialize'
  | 'retry-reference'
  | 'retry-seal'
  | 'renew-lease'
  | 'destroy';

export const ARENA_V2_FIRST_WEAPON_REGISTRY_INITIALIZATION_OWNER_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_FIRST_WEAPON_REGISTRY_INITIALIZATION_OWNER_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.first-weapon-registry-initialization-owner.candidate.v1' as const,
    status: 'production-unreachable' as const,
    base: 'revision-zero-empty-registry' as const,
    order: 'assess-plan-publish-receipt-activate-reference-swap-seal' as const,
    firstWeaponBypassesReadiness: false as const,
    playableBeforeFirstPromotion: false as const,
    recovery: 'retain-owner-for-reference-or-seal-retry' as const,
    swallowedCoordinatorReentryFailsOwnerClosed: true as const,
    coordinatorResultCommittedBeforeReentryCheck: true as const,
    snapshotAndRegistryReadRejectedDuringOperation: true as const,
    failedOwnerCannotClaimDurableRegistryPlayable: true as const,
    idempotentDestroyChecksReentryBeforeFastPath: true as const,
    defaultInstanceCreated: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    defaultEntryWired: false as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
  });

function exactOptions(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2首把Registry初始化Owner options必须是普通对象。');
  }
  assertKnownKeys(value, OPTION_KEYS, 'Arena V2首把Registry初始化Owner options');
  for (const key of OPTION_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Arena V2首把Registry初始化Owner options.${key}缺失。`);
    }
  }
}

function emptyActiveReferenceOptions(
  portOptions: ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1,
) {
  const baseline = createArenaV2EmptyRegistryBaselineCandidateV1();
  const port = new ArenaV2PersistentRegistryPublicationPortCandidateV1(portOptions);
  let revision: number | null = null;
  let snapshotHash: string | null = null;
  let snapshot: ReturnType<
    ArenaV2PersistentRegistryPublicationPortCandidateV1['readActiveHead']
  > | null = null;
  let primaryError: unknown = null;
  try {
    port.open();
    if (port.readUnactivatedPending() !== null) {
      port.recoverUnactivatedPending();
    }
    const current = port.read();
    const active = port.readActive();
    const activeHead = port.readActiveHead();
    if (current.revision !== active.revision
      || current.snapshotHash !== active.snapshotHash
      || current.collectionWeaponIds.length !== 0
      || active.collectionWeaponIds.length !== 0
      || activeHead.collectionWeaponIds.length !== 0
      || active.snapshotHash !== baseline.snapshotHash) {
      throw new RangeError(
        'Arena V2首把Registry初始化要求当前staged与active均为同一空基线。',
      );
    }
    revision = active.revision;
    snapshotHash = active.snapshotHash;
    snapshot = activeHead;
  } catch (error) {
    primaryError = error;
  }
  try {
    port.destroy();
  } catch (cleanupError) {
    if (primaryError !== null) {
      throw new AggregateError(
        [primaryError, cleanupError],
        'Arena V2首把Registry预检失败且存储租约清理不完整。',
      );
    }
    throw cleanupError;
  }
  if (primaryError !== null) throw primaryError;
  if (revision === null || snapshotHash === null || snapshot === null) {
    throw new Error('Arena V2首把Registry预检没有取得空active引用。');
  }
  return Object.freeze({
    initialRevision: revision,
    initialSnapshotHash: snapshotHash,
    initialSnapshot: snapshot,
  });
}

export class ArenaV2FirstWeaponRegistryInitializationOwnerCandidateV1 {
  #initializationOwnerId: string | null;
  #coordinator: ArenaV2SingleWeaponRegistryPromotionCoordinatorCandidateV1 | null;
  #lastCoordinatorSnapshot:
    Readonly<ArenaV2SingleWeaponRegistryPromotionCoordinatorSnapshotCandidateV1>;
  #operation: InitializationOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #failed = false;
  #destroying = false;
  #destroyed = false;

  constructor(options: ArenaV2FirstWeaponRegistryInitializationOwnerOptionsCandidateV1) {
    exactOptions(options);
    this.#initializationOwnerId = assertNonEmptyString(
      options.initializationOwnerId,
      'Arena V2首把Registry initializationOwnerId',
    );
    const atomicReferenceOptions = emptyActiveReferenceOptions(options.portOptions);
    const coordinator = new ArenaV2SingleWeaponRegistryPromotionCoordinatorCandidateV1({
      coordinatorId: assertNonEmptyString(
        options.coordinatorId,
        'Arena V2首把Registry coordinatorId',
      ),
      registrationHostOptions: {
        hostId: assertNonEmptyString(options.hostId, 'Arena V2首把Registry hostId'),
        publicationOwnerId: assertNonEmptyString(
          options.publicationOwnerId,
          'Arena V2首把Registry publicationOwnerId',
        ),
        snapshotOptions: {
          assessment: options.assessment,
          plan: options.plan,
          baseCollectionWeaponIds: Object.freeze([]),
          baseActionDefinitions: Object.freeze([]),
          baseEquipmentDefinitions: Object.freeze([]),
          baseGrammarDefinitions: Object.freeze([]),
        },
        portOptions: options.portOptions,
      },
      atomicReferenceOptions,
    });
    this.#coordinator = coordinator;
    this.#lastCoordinatorSnapshot = coordinator.snapshot();
    Object.freeze(this);
  }

  #assertNoOperation(): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error('Arena V2首把Registry初始化Owner操作不可重入。');
    throw this.#reentryError;
  }

  #usable(allowFailed = false): ArenaV2SingleWeaponRegistryPromotionCoordinatorCandidateV1 {
    this.#assertNoOperation();
    if (this.#destroyed || this.#coordinator === null) {
      throw new Error('Arena V2首把Registry初始化Owner已销毁。');
    }
    if (this.#failed && !allowFailed) {
      throw new Error('Arena V2首把Registry初始化Owner已经失败关闭。');
    }
    return this.#coordinator;
  }

  #assertNoReentrySince(sequence: number, operation: string, cause?: unknown): void {
    if (this.#reentrySequence === sequence) return;
    this.#failed = true;
    const reentryError = this.#reentryError
      ?? new Error(`Arena V2首把Registry初始化Owner ${operation}期间发生重入。`);
    if (cause !== undefined && cause !== reentryError) {
      throw new AggregateError(
        [reentryError, cause],
        `Arena V2首把Registry初始化Owner ${operation}期间发生重入且子操作失败。`,
      );
    }
    throw reentryError;
  }

  #runCoordinatorOperation<T>(
    operation: InitializationOperation,
    callback: () => T,
    onCommitted?: (result: T) => void,
    allowFailed = false,
  ): T {
    this.#usable(allowFailed);
    this.#operation = operation;
    this.#reentryError = null;
    const reentrySequence = this.#reentrySequence;
    let result: T;
    try {
      try {
        result = callback();
      } catch (error) {
        this.#assertNoReentrySince(reentrySequence, operation, error);
        throw error;
      }
      onCommitted?.(result);
      this.#assertNoReentrySince(reentrySequence, operation);
      return result;
    } finally {
      this.#operation = null;
    }
  }

  initialize(): Readonly<ArenaV2FirstWeaponRegistryInitializationOwnerSnapshotCandidateV1> {
    const coordinator = this.#usable();
    this.#runCoordinatorOperation(
      'initialize',
      () => coordinator.publishAndPromote(),
      (snapshot) => { this.#lastCoordinatorSnapshot = snapshot; },
    );
    return this.snapshot();
  }

  retryReferenceAfterActivation(): Readonly<
    ArenaV2FirstWeaponRegistryInitializationOwnerSnapshotCandidateV1
  > {
    const coordinator = this.#usable();
    this.#runCoordinatorOperation(
      'retry-reference',
      () => coordinator.retryReferenceAfterActivation(),
      (snapshot) => { this.#lastCoordinatorSnapshot = snapshot; },
    );
    return this.snapshot();
  }

  retrySealAfterPromotion(): Readonly<
    ArenaV2FirstWeaponRegistryInitializationOwnerSnapshotCandidateV1
  > {
    const coordinator = this.#usable();
    this.#runCoordinatorOperation(
      'retry-seal',
      () => coordinator.retrySealAfterPromotion(),
      (snapshot) => { this.#lastCoordinatorSnapshot = snapshot; },
    );
    return this.snapshot();
  }

  renewLease(): boolean {
    const coordinator = this.#usable();
    return this.#runCoordinatorOperation('renew-lease', () => coordinator.renewLease());
  }

  readRegistry() {
    return this.#usable().readRegistry();
  }

  #snapshot(): Readonly<ArenaV2FirstWeaponRegistryInitializationOwnerSnapshotCandidateV1> {
    const coordinator = this.#coordinator?.snapshot() ?? this.#lastCoordinatorSnapshot;
    return Object.freeze({
      schemaVersion:
        ARENA_V2_FIRST_WEAPON_REGISTRY_INITIALIZATION_OWNER_CANDIDATE_V1_SCHEMA_VERSION,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      initializationOwnerId: this.#initializationOwnerId,
      state: this.#destroyed
        ? 'destroyed' as const
        : this.#failed ? 'failed' as const : coordinator.state,
      weaponId: coordinator.weaponId,
      persistentRevision: coordinator.persistentRevision,
      activeRevision: coordinator.activeRevision,
      referenceRevision: coordinator.referenceRevision,
      referenceSnapshotHash: coordinator.referenceSnapshotHash,
      promotionAttempts: coordinator.promotionAttempts,
      sealRetryAttempts: coordinator.sealRetryAttempts,
      lastReceiptHash: coordinator.lastReceiptHash,
      lastFailure: coordinator.lastFailure,
      firstWeaponBypassesReadiness: false as const,
      durableRegistryPlayable: !this.#failed && coordinator.state === 'promoted',
      initializationOwnerLive: !this.#destroyed,
      destroying: this.#destroying,
      destroyed: this.#destroyed,
      defaultInstanceCreated: false as const,
      defaultRegistryWired: false as const,
      defaultCompositionWired: false as const,
      defaultEntryWired: false as const,
    });
  }

  snapshot(): Readonly<ArenaV2FirstWeaponRegistryInitializationOwnerSnapshotCandidateV1> {
    this.#assertNoOperation();
    return this.#snapshot();
  }

  destroy(): Readonly<ArenaV2FirstWeaponRegistryInitializationOwnerSnapshotCandidateV1> {
    this.#assertNoOperation();
    if (this.#destroyed) return this.#snapshot();
    const coordinator = this.#usable(true);
    this.#destroying = true;
    try {
      this.#runCoordinatorOperation(
        'destroy',
        () => {
          const finalOperationalSnapshot = coordinator.snapshot();
          coordinator.destroy();
          return finalOperationalSnapshot;
        },
        (finalOperationalSnapshot) => {
          this.#lastCoordinatorSnapshot = finalOperationalSnapshot;
          this.#coordinator = null;
          this.#initializationOwnerId = null;
          this.#destroyed = true;
        },
        true,
      );
    } finally {
      this.#destroying = false;
    }
    return this.#snapshot();
  }
}

export interface ArenaV2FirstWeaponRegistryInitializationOwnerSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly initializationOwnerId: string | null;
  readonly state: ArenaV2SingleWeaponRegistryPromotionCoordinatorSnapshotCandidateV1['state'];
  readonly weaponId: string | null;
  readonly persistentRevision: number | null;
  readonly activeRevision: number | null;
  readonly referenceRevision: number | null;
  readonly referenceSnapshotHash: string | null;
  readonly promotionAttempts: number;
  readonly sealRetryAttempts: number;
  readonly lastReceiptHash: string | null;
  readonly lastFailure: string | null;
  readonly firstWeaponBypassesReadiness: false;
  readonly durableRegistryPlayable: boolean;
  readonly initializationOwnerLive: boolean;
  readonly destroying: boolean;
  readonly destroyed: boolean;
  readonly defaultInstanceCreated: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
  readonly defaultEntryWired: false;
}

export function createArenaV2FirstWeaponRegistryInitializationOwnerCandidateV1(
  options: ArenaV2FirstWeaponRegistryInitializationOwnerOptionsCandidateV1,
): ArenaV2FirstWeaponRegistryInitializationOwnerCandidateV1 {
  return new ArenaV2FirstWeaponRegistryInitializationOwnerCandidateV1(options);
}
