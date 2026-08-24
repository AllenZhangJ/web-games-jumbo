import {
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2AtomicRegistryReferenceCandidateV1,
  type ArenaV2AtomicRegistryReferencePromotionInputCandidateV1,
} from './arena-v2-atomic-registry-reference-candidate-v1.js';
import {
  ArenaV2PersistentRegistryPublicationPortCandidateV1,
  type ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1,
} from './arena-v2-persistent-registry-publication-port-candidate-v1.js';
import type {
  ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1,
  ArenaV2SingleWeaponRegistryPublicationReadCandidateV1,
} from './arena-v2-single-weapon-registry-publication-owner-candidate-v1.js';
import {
  projectArenaV2RegistryWeaponSequenceCandidateV1,
} from './arena-v2-registry-weapon-sequence-candidate-v1.js';

export const ARENA_V2_REGISTRY_ACTIVE_BOOTSTRAP_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaV2RegistryActiveBootstrapOptionsCandidateV1 {
  readonly bootstrapId: string;
  readonly portOptions: ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1;
}

const OPTION_KEYS = new Set(['bootstrapId', 'portOptions']);

export const ARENA_V2_REGISTRY_ACTIVE_BOOTSTRAP_POLICY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: ARENA_V2_REGISTRY_ACTIVE_BOOTSTRAP_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.registry-active-bootstrap-policy.candidate.v1' as const,
  status: 'production-unreachable' as const,
  authoritativeSource: 'durable-active-marker-only' as const,
  orphanPendingPolicy: 'exact-rollback-before-load' as const,
  minimumActiveWeaponCount: 1 as const,
  emptyBaselinePolicy: 'reject-until-first-weapon-promotion-completes' as const,
  storageLeaseAfterBootstrap: 'released' as const,
  defaultInstanceCreated: false as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  validationStatus: 'not-run' as const,
});

function exactOptions(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 Registry active bootstrap options必须是普通对象。');
  }
  assertKnownKeys(value, OPTION_KEYS, 'Arena V2 Registry active bootstrap options');
  for (const key of OPTION_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Arena V2 Registry active bootstrap options.${key}缺失。`);
    }
  }
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export class ArenaV2RegistryActiveBootstrapCandidateV1 {
  #bootstrapId: string | null;
  #reference: ArenaV2AtomicRegistryReferenceCandidateV1 | null = null;
  #pendingRecovered: boolean;
  #loadedRevision: number;
  #loadedSnapshotHash: string;
  #destroyed = false;

  constructor(options: ArenaV2RegistryActiveBootstrapOptionsCandidateV1) {
    exactOptions(options);
    this.#bootstrapId = assertNonEmptyString(
      options.bootstrapId,
      'Arena V2 Registry active bootstrapId',
    );
    const port = new ArenaV2PersistentRegistryPublicationPortCandidateV1(
      options.portOptions as ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1,
    );
    let pendingRecovered = false;
    let activeRead: Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> | null = null;
    let activeHead: Readonly<ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1> | null = null;
    let failed = false;
    let primaryError: unknown;
    try {
      port.open();
      if (port.readUnactivatedPending() !== null) {
        port.recoverUnactivatedPending();
        pendingRecovered = true;
      }
      const current = port.read();
      activeRead = port.readActive();
      activeHead = port.readActiveHead();
      if (current.revision !== activeRead.revision
        || current.snapshotHash !== activeRead.snapshotHash
        || !sameIds(current.collectionWeaponIds, activeRead.collectionWeaponIds)) {
        throw new RangeError('Arena V2 Registry active bootstrap恢复后仍存在staged/active分叉。');
      }
    } catch (error) {
      failed = true;
      primaryError = error;
    }
    try {
      port.destroy();
    } catch (cleanupError) {
      if (failed) {
        throw new AggregateError(
          [primaryError, cleanupError],
          'Arena V2 Registry active bootstrap失败且存储租约清理未完成。',
        );
      }
      throw cleanupError;
    }
    if (failed) throw primaryError;
    if (activeRead === null || activeHead === null) {
      throw new Error('Arena V2 Registry active bootstrap没有取得active generation。');
    }
    if (activeRead.collectionWeaponIds.length === 0) {
      throw new RangeError(
        'Arena V2 Registry active bootstrap拒绝空基线，必须先完成首把武器正式晋级。',
      );
    }
    projectArenaV2RegistryWeaponSequenceCandidateV1(activeRead.collectionWeaponIds);
    this.#reference = new ArenaV2AtomicRegistryReferenceCandidateV1({
      initialRevision: activeRead.revision,
      initialSnapshotHash: activeRead.snapshotHash,
      initialSnapshot: activeHead,
    });
    this.#pendingRecovered = pendingRecovered;
    this.#loadedRevision = activeRead.revision;
    this.#loadedSnapshotHash = activeRead.snapshotHash;
    Object.freeze(this);
  }

  #requireReference(): ArenaV2AtomicRegistryReferenceCandidateV1 {
    if (this.#destroyed || this.#reference === null) {
      throw new Error('Arena V2 Registry active bootstrap已销毁。');
    }
    return this.#reference;
  }

  read(): Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> {
    return this.#requireReference().read();
  }

  readHead(): Readonly<ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1> {
    return this.#requireReference().readHead();
  }

  promote(
    input: ArenaV2AtomicRegistryReferencePromotionInputCandidateV1,
  ): Readonly<ArenaV2RegistryActiveBootstrapSnapshotCandidateV1> {
    this.#requireReference().promote(input);
    return this.snapshot();
  }

  snapshot(): Readonly<ArenaV2RegistryActiveBootstrapSnapshotCandidateV1> {
    const reference = this.#reference?.snapshot() ?? null;
    return Object.freeze({
      schemaVersion: ARENA_V2_REGISTRY_ACTIVE_BOOTSTRAP_CANDIDATE_V1_SCHEMA_VERSION,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      bootstrapId: this.#bootstrapId,
      loadedRevision: this.#destroyed ? null : this.#loadedRevision,
      loadedSnapshotHash: this.#destroyed ? null : this.#loadedSnapshotHash,
      currentRevision: reference?.revision ?? null,
      currentSnapshotHash: reference?.snapshotHash ?? null,
      pendingRecovered: this.#pendingRecovered,
      storageLeaseHeld: false as const,
      destroyed: this.#destroyed,
      defaultInstanceCreated: false as const,
      defaultRegistryWired: false as const,
      defaultCompositionWired: false as const,
    });
  }

  destroy(): Readonly<ArenaV2RegistryActiveBootstrapSnapshotCandidateV1> {
    if (this.#destroyed) return this.snapshot();
    this.#requireReference().destroy();
    this.#reference = null;
    this.#bootstrapId = null;
    this.#destroyed = true;
    return this.snapshot();
  }
}

export interface ArenaV2RegistryActiveBootstrapSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly bootstrapId: string | null;
  readonly loadedRevision: number | null;
  readonly loadedSnapshotHash: string | null;
  readonly currentRevision: number | null;
  readonly currentSnapshotHash: string | null;
  readonly pendingRecovered: boolean;
  readonly storageLeaseHeld: false;
  readonly destroyed: boolean;
  readonly defaultInstanceCreated: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
}
