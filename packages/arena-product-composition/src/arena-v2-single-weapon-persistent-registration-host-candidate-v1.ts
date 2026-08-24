import {
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2PersistentRegistryPublicationPortCandidateV1,
  type ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1,
} from './arena-v2-persistent-registry-publication-port-candidate-v1.js';
import type {
  ArenaV2RegistryPublicationEnvelopeCandidateV1,
} from './arena-v2-registry-publication-envelope-candidate-v1.js';
import {
  ArenaV2SingleWeaponRegistryPublicationOwnerCandidateV1,
  type ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1,
  type ArenaV2SingleWeaponRegistryPublicationOwnerSnapshotCandidateV1,
  type ArenaV2SingleWeaponRegistryPublicationReadCandidateV1,
} from './arena-v2-single-weapon-registry-publication-owner-candidate-v1.js';

export const ARENA_V2_SINGLE_WEAPON_PERSISTENT_REGISTRATION_HOST_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export interface ArenaV2SingleWeaponPersistentRegistrationHostOptionsCandidateV1 {
  readonly hostId: string;
  readonly publicationOwnerId: string;
  readonly snapshotOptions: unknown;
  readonly portOptions: ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1;
}

export type ArenaV2SingleWeaponPersistentRegistrationHostStateCandidateV1 =
  | 'ready'
  | 'published'
  | 'rolled-back'
  | 'sealed'
  | 'failed'
  | 'destroyed';

export interface ArenaV2SingleWeaponPublishedPromotionCapabilityCandidateV1 {
  readonly hostId: string;
  readonly publicationOwnerId: string;
  readonly weaponId: string;
  readonly planContentHash: string;
  readonly previousSnapshotHash: string;
  readonly nextSnapshotHash: string;
  readonly registryRead: Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1>;
  readonly registryEnvelope: Readonly<ArenaV2RegistryPublicationEnvelopeCandidateV1>;
}

const OPTION_KEYS = new Set([
  'hostId', 'publicationOwnerId', 'snapshotOptions', 'portOptions',
]);
const PUBLISHED_PROMOTION_CAPABILITIES = new WeakSet<object>();

export function requireArenaV2SingleWeaponPublishedPromotionCapabilityCandidateV1(
  value: unknown,
): Readonly<ArenaV2SingleWeaponPublishedPromotionCapabilityCandidateV1> {
  if (typeof value !== 'object' || value === null
    || !PUBLISHED_PROMOTION_CAPABILITIES.has(value)) {
    throw new TypeError('Arena V2单把Registry晋级必须使用真实已发布宿主能力。');
  }
  return value as Readonly<ArenaV2SingleWeaponPublishedPromotionCapabilityCandidateV1>;
}

export const ARENA_V2_SINGLE_WEAPON_PERSISTENT_REGISTRATION_HOST_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_SINGLE_WEAPON_PERSISTENT_REGISTRATION_HOST_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.single-weapon-persistent-registration-host-policy.candidate.v1' as const,
    status: 'production-unreachable' as const,
    constructionOrder: 'persistent-port-open-then-publication-owner' as const,
    publication: 'explicit-only' as const,
    rollback: 'explicit-exact-head-only' as const,
    sealing: 'explicit-before-final-destroy' as const,
    destroyOrder: 'publication-owner-then-persistent-port' as const,
    destroyDependencyOrderPreserved: true as const,
    destroyClearsOnlySuccessfullyReleasedChildren: true as const,
    failedChildCleanupRemainsRetryable: true as const,
    swallowedChildReentryFailsClosed: true as const,
    publicationActivationAndDestroyCommitUnderStickyTransition: true as const,
    snapshotRejectedDuringTransition: true as const,
    idempotentDestroyChecksReentryBeforeFastPath: true as const,
    autoPublish: false as const,
    autoRollback: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
  });

function exactOptions(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 persistent registration host options必须是普通对象。');
  }
  assertKnownKeys(value, OPTION_KEYS, 'Arena V2 persistent registration host options');
  for (const key of OPTION_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Arena V2 persistent registration host options.${key}缺失。`);
    }
  }
}

function message(error: unknown): string {
  return typeof error === 'string' && error.length > 0
    ? error
    : 'Arena V2 persistent registration发生非字符串失败。';
}

export class ArenaV2SingleWeaponPersistentRegistrationHostCandidateV1 {
  #hostId: string | null;
  #port: ArenaV2PersistentRegistryPublicationPortCandidateV1 | null = null;
  #owner: ArenaV2SingleWeaponRegistryPublicationOwnerCandidateV1 | null = null;
  #state: ArenaV2SingleWeaponPersistentRegistrationHostStateCandidateV1 = 'ready';
  #transitioning = false;
  #reentryAttempted = false;
  #reentryError: Error | null = null;
  #lastFailure: string | null = null;

  constructor(options: ArenaV2SingleWeaponPersistentRegistrationHostOptionsCandidateV1) {
    exactOptions(options);
    this.#hostId = assertNonEmptyString(
      options.hostId,
      'Arena V2 persistent registration hostId',
    );
    const port = new ArenaV2PersistentRegistryPublicationPortCandidateV1(
      options.portOptions as ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1,
    );
    try {
      port.open();
      this.#owner = new ArenaV2SingleWeaponRegistryPublicationOwnerCandidateV1({
        ownerId: assertNonEmptyString(
          options.publicationOwnerId,
          'Arena V2 persistent registration publicationOwnerId',
        ),
        snapshotOptions: options.snapshotOptions,
        port,
      });
      this.#port = port;
    } catch (error) {
      try {
        port.destroy();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Arena V2 persistent registration host构造失败且端口清理未完成。',
        );
      }
      throw error;
    }
    Object.freeze(this);
  }

  #notTransitioning(): void {
    if (!this.#transitioning) return;
    this.#reentryAttempted = true;
    this.#reentryError ??= new Error('Arena V2 persistent registration host操作不可重入。');
    throw this.#reentryError;
  }

  #requireOwner(): ArenaV2SingleWeaponRegistryPublicationOwnerCandidateV1 {
    if (this.#owner === null) throw new Error('Arena V2 persistent registration host已销毁。');
    return this.#owner;
  }

  #requirePort(): ArenaV2PersistentRegistryPublicationPortCandidateV1 {
    if (this.#port === null) throw new Error('Arena V2 persistent registration host已销毁。');
    return this.#port;
  }

  #transition<T>(operation: () => T, allowFailed = false): T {
    this.#notTransitioning();
    if (this.#state === 'failed' && !allowFailed) {
      throw new Error('Arena V2 persistent registration host已经失败关闭。');
    }
    if (this.#state === 'destroyed') throw new Error('Arena V2 persistent registration host已销毁。');
    this.#reentryAttempted = false;
    this.#reentryError = null;
    this.#transitioning = true;
    let result!: T;
    let operationFailed = false;
    let operationFailure: unknown = undefined;
    try {
      result = operation();
    } catch (error) {
      operationFailed = true;
      operationFailure = error;
    }
    const reentryError = this.#reentryAttempted
      ? this.#reentryError ?? new Error('Arena V2 persistent registration host发生重入。')
      : null;
    if (reentryError !== null || operationFailed) {
      this.#state = 'failed';
      this.#lastFailure = reentryError === null
        ? message(operationFailure)
        : 'Arena V2 persistent registration host发生被子Owner吞掉的重入。';
    }
    this.#transitioning = false;
    if (reentryError !== null) {
      if (operationFailed && operationFailure !== reentryError) {
        throw new AggregateError(
          [reentryError, operationFailure],
          'Arena V2 persistent registration host重入且子操作失败。',
        );
      }
      throw reentryError;
    }
    if (operationFailed) throw operationFailure;
    return result;
  }

  publish(): Readonly<ArenaV2SingleWeaponPersistentRegistrationHostSnapshotCandidateV1> {
    this.#notTransitioning();
    if (this.#state !== 'ready') {
      throw new Error(`Arena V2 persistent registration host发布状态无效：${this.#state}。`);
    }
    return this.#transition(() => {
      this.#requireOwner().publish();
      this.#state = 'published';
      return this.#snapshot();
    });
  }

  rollback(): Readonly<ArenaV2SingleWeaponPersistentRegistrationHostSnapshotCandidateV1> {
    this.#notTransitioning();
    if (this.#state !== 'published') {
      throw new Error(`Arena V2 persistent registration host回滚状态无效：${this.#state}。`);
    }
    return this.#transition(() => {
      this.#requireOwner().rollback();
      this.#state = 'rolled-back';
      return this.#snapshot();
    });
  }

  sealPublication(): Readonly<ArenaV2SingleWeaponPersistentRegistrationHostSnapshotCandidateV1> {
    this.#notTransitioning();
    const publicationState = this.#owner?.snapshot().state ?? null;
    if (this.#state !== 'published'
      && !(this.#state === 'failed' && publicationState === 'published')) {
      throw new Error(`Arena V2 persistent registration host封存状态无效：${this.#state}。`);
    }
    return this.#transition(() => {
      this.#requireOwner().sealPublication();
      this.#state = 'sealed';
      return this.#snapshot();
    }, true);
  }

  renewLease(): boolean {
    return this.#transition(() => this.#requirePort().renewLease());
  }

  readRegistry(): Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> {
    this.#notTransitioning();
    if (this.#state === 'destroyed') throw new Error('Arena V2 persistent registration host已销毁。');
    return this.#requirePort().read();
  }

  readRegistryHead(): Readonly<ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1> {
    this.#notTransitioning();
    if (this.#state === 'destroyed') throw new Error('Arena V2 persistent registration host已销毁。');
    return this.#requirePort().readHead();
  }

  readActiveRegistry(): Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> {
    this.#notTransitioning();
    if (this.#state === 'destroyed') throw new Error('Arena V2 persistent registration host已销毁。');
    return this.#requirePort().readActive();
  }

  readRegistryEnvelope(): Readonly<ArenaV2RegistryPublicationEnvelopeCandidateV1> {
    this.#notTransitioning();
    if (this.#state === 'destroyed') throw new Error('Arena V2 persistent registration host已销毁。');
    return this.#requirePort().readEnvelope();
  }

  createPublishedPromotionCapability(): Readonly<
    ArenaV2SingleWeaponPublishedPromotionCapabilityCandidateV1
  > {
    this.#notTransitioning();
    if (this.#state !== 'published') {
      throw new Error(`Arena V2 persistent registration host晋级状态无效：${this.#state}。`);
    }
    const owner = this.#requireOwner().snapshot();
    if (owner.state !== 'published'
      || owner.ownerId === null
      || owner.weaponId === null
      || owner.planContentHash === null
      || owner.previousSnapshotHash === null
      || owner.nextSnapshotHash === null
      || this.#hostId === null) {
      throw new Error('Arena V2 persistent registration host缺少已发布身份。');
    }
    const capability = Object.freeze({
      hostId: this.#hostId,
      publicationOwnerId: owner.ownerId,
      weaponId: owner.weaponId,
      planContentHash: owner.planContentHash,
      previousSnapshotHash: owner.previousSnapshotHash,
      nextSnapshotHash: owner.nextSnapshotHash,
      registryRead: this.#requirePort().read(),
      registryEnvelope: this.#requirePort().readEnvelope(),
    });
    PUBLISHED_PROMOTION_CAPABILITIES.add(capability);
    return capability;
  }

  activatePublishedGeneration(
    capabilityValue: unknown,
    receiptHash: unknown,
  ): Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> {
    this.#notTransitioning();
    if (this.#state !== 'published') {
      throw new Error(`Arena V2 persistent registration host激活状态无效：${this.#state}。`);
    }
    return this.#transition(() => {
      const capability = requireArenaV2SingleWeaponPublishedPromotionCapabilityCandidateV1(
        capabilityValue,
      );
      const current = this.#requirePort().read();
      if (capability.hostId !== this.#hostId
        || capability.registryRead.revision !== current.revision
        || capability.registryRead.snapshotHash !== current.snapshotHash) {
        throw new RangeError('Arena V2 persistent registration host激活能力不属于当前发布头。');
      }
      return this.#requirePort().activateCurrentGeneration(receiptHash);
    });
  }

  #snapshot(): Readonly<ArenaV2SingleWeaponPersistentRegistrationHostSnapshotCandidateV1> {
    const owner = this.#owner?.snapshot() ?? null;
    const port = this.#port?.snapshot() ?? null;
    return Object.freeze({
      schemaVersion:
        ARENA_V2_SINGLE_WEAPON_PERSISTENT_REGISTRATION_HOST_CANDIDATE_V1_SCHEMA_VERSION,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      hostId: this.#hostId,
      state: this.#state,
      transitioning: this.#transitioning,
      weaponId: owner?.weaponId ?? null,
      publicationOwnerId: owner?.ownerId ?? null,
      publicationState: owner?.state ?? null,
      planContentHash: owner?.planContentHash ?? null,
      previousSnapshotHash: owner?.previousSnapshotHash ?? null,
      nextSnapshotHash: owner?.nextSnapshotHash ?? null,
      registryRevision: port?.revision ?? null,
      registrySnapshotHash: port?.snapshotHash ?? null,
      activeRegistryRevision: port?.activeRevision ?? null,
      activeRegistrySnapshotHash: port?.activeSnapshotHash ?? null,
      lastFailure: this.#lastFailure,
      persistent: true as const,
      autoPublish: false as const,
      autoRollback: false as const,
      defaultRegistryWired: false as const,
      defaultCompositionWired: false as const,
    });
  }

  snapshot(): Readonly<ArenaV2SingleWeaponPersistentRegistrationHostSnapshotCandidateV1> {
    this.#notTransitioning();
    return this.#snapshot();
  }

  destroy(): Readonly<ArenaV2SingleWeaponPersistentRegistrationHostSnapshotCandidateV1> {
    this.#notTransitioning();
    if (this.#state === 'destroyed') return this.#snapshot();
    if (this.#owner?.snapshot().state === 'published') {
      throw new Error('Arena V2 persistent registration host发布后必须先回滚或封存。');
    }
    return this.#transition(() => {
      const errors: unknown[] = [];
      if (this.#owner !== null) {
        const owner = this.#owner;
        try {
          owner.destroy();
          if (this.#owner === owner) this.#owner = null;
        } catch (error) {
          errors.push(error);
        }
      }
      if (this.#owner === null && this.#port !== null) {
        const port = this.#port;
        try {
          port.destroy();
          if (this.#port === port) this.#port = null;
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length > 0) {
        this.#state = 'failed';
        this.#lastFailure = 'Arena V2 persistent registration host清理不完整。';
        throw new AggregateError(
          errors,
          'Arena V2 persistent registration host清理不完整。',
        );
      }
      this.#hostId = null;
      this.#state = 'destroyed';
      return this.#snapshot();
    }, true);
  }
}

export interface ArenaV2SingleWeaponPersistentRegistrationHostSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hostId: string | null;
  readonly state: ArenaV2SingleWeaponPersistentRegistrationHostStateCandidateV1;
  readonly transitioning: boolean;
  readonly weaponId: string | null;
  readonly publicationOwnerId: string | null;
  readonly publicationState:
    ArenaV2SingleWeaponRegistryPublicationOwnerSnapshotCandidateV1['state'] | null;
  readonly planContentHash: string | null;
  readonly previousSnapshotHash: string | null;
  readonly nextSnapshotHash: string | null;
  readonly registryRevision: number | null;
  readonly registrySnapshotHash: string | null;
  readonly activeRegistryRevision: number | null;
  readonly activeRegistrySnapshotHash: string | null;
  readonly lastFailure: string | null;
  readonly persistent: true;
  readonly autoPublish: false;
  readonly autoRollback: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
}
