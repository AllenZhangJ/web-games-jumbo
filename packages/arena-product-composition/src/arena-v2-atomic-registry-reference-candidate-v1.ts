import {
  assertIntegerAtLeast,
  assertKnownKeys,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2InMemoryRegistryPublicationPortCandidateV1,
  createArenaV2PublishedRegistrySnapshotCandidateV1,
  createArenaV2RegistryPublicationSnapshotHashCandidateV1,
} from './arena-v2-in-memory-registry-publication-port-candidate-v1.js';
import {
  decodeArenaV2RegistryPublicationEnvelopeCandidateV1,
  type ArenaV2RegistryPublicationEnvelopeCandidateV1,
} from './arena-v2-registry-publication-envelope-candidate-v1.js';
import {
  requireArenaV2SingleWeaponRegistryPromotionReceiptCapabilityCandidateV1,
  validateArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1,
} from './arena-v2-single-weapon-registry-promotion-receipt-candidate-v1.js';
import type {
  ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1,
  ArenaV2SingleWeaponRegistryPublicationReadCandidateV1,
} from './arena-v2-single-weapon-registry-publication-owner-candidate-v1.js';

export const ARENA_V2_ATOMIC_REGISTRY_REFERENCE_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaV2AtomicRegistryReferenceOptionsCandidateV1 {
  readonly initialRevision: number;
  readonly initialSnapshotHash: string;
  readonly initialSnapshot: ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1;
}

export interface ArenaV2AtomicRegistryReferencePromotionInputCandidateV1 {
  readonly receiptCapability: unknown;
  readonly registryEnvelope: ArenaV2RegistryPublicationEnvelopeCandidateV1;
}

const OPTION_KEYS = new Set(['initialRevision', 'initialSnapshotHash', 'initialSnapshot']);
const PROMOTION_KEYS = new Set(['receiptCapability', 'registryEnvelope']);
const MAXIMUM_USED_RECEIPTS = 64;

export const ARENA_V2_ATOMIC_REGISTRY_REFERENCE_POLICY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: ARENA_V2_ATOMIC_REGISTRY_REFERENCE_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.atomic-registry-reference-policy.candidate.v1' as const,
  status: 'production-unreachable' as const,
  source: 'sealed-persistent-single-weapon-promotion-receipt' as const,
  swap: 'synchronous-validated-whole-reference' as const,
  transitionScope: 'exactly-one-weapon-publish' as const,
  rollback: 'new-reviewed-generation-only' as const,
  maximumUsedReceiptIdentities: MAXIMUM_USED_RECEIPTS,
  defaultInstanceCreated: false as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  validationStatus: 'not-run' as const,
});

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export class ArenaV2AtomicRegistryReferenceCandidateV1 {
  #revision: number;
  #snapshotHash: string;
  #snapshot: Readonly<ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1> | null;
  #usedReceiptHashes: readonly string[] = Object.freeze([]);
  #transitioning = false;
  #destroyed = false;

  constructor(options: ArenaV2AtomicRegistryReferenceOptionsCandidateV1) {
    exactRecord(options, OPTION_KEYS, 'Arena V2 atomic Registry reference options');
    const snapshot = createArenaV2PublishedRegistrySnapshotCandidateV1(
      options.initialSnapshot,
      'Arena V2 atomic Registry reference initial snapshot',
    );
    const snapshotHash = createArenaV2RegistryPublicationSnapshotHashCandidateV1(snapshot);
    if (options.initialSnapshotHash !== snapshotHash) {
      throw new RangeError('Arena V2 atomic Registry reference初始hash与快照不一致。');
    }
    this.#revision = assertIntegerAtLeast(
      options.initialRevision,
      0,
      'Arena V2 atomic Registry reference initialRevision',
    );
    this.#snapshotHash = snapshotHash;
    this.#snapshot = snapshot;
    Object.freeze(this);
  }

  #usable(): void {
    if (this.#destroyed || this.#snapshot === null) {
      throw new Error('Arena V2 atomic Registry reference已销毁。');
    }
    if (this.#transitioning) throw new Error('Arena V2 atomic Registry reference操作不可重入。');
  }

  read(): Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> {
    this.#usable();
    return Object.freeze({
      revision: this.#revision,
      snapshotHash: this.#snapshotHash,
      collectionWeaponIds: this.#snapshot!.collectionWeaponIds,
    });
  }

  readHead(): Readonly<ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1> {
    this.#usable();
    return this.#snapshot!;
  }

  promote(
    input: ArenaV2AtomicRegistryReferencePromotionInputCandidateV1,
  ): Readonly<ArenaV2AtomicRegistryReferenceSnapshotCandidateV1> {
    this.#usable();
    exactRecord(input, PROMOTION_KEYS, 'Arena V2 atomic Registry promotion input');
    this.#transitioning = true;
    try {
      const authorizedReceipt =
        requireArenaV2SingleWeaponRegistryPromotionReceiptCapabilityCandidateV1(
          input.receiptCapability,
        );
      const receipt = validateArenaV2SingleWeaponRegistryPromotionReceiptCandidateV1(
        authorizedReceipt,
      );
      if (this.#usedReceiptHashes.includes(receipt.receiptHash)) {
        throw new RangeError('Arena V2 Registry晋级回执已经消费。');
      }
      const decoded = decodeArenaV2RegistryPublicationEnvelopeCandidateV1(
        input.registryEnvelope,
      );
      const transition = decoded.envelope.transition;
      if (transition === null
        || transition.direction !== 'publish'
        || receipt.fromRevision !== this.#revision
        || receipt.fromSnapshotHash !== this.#snapshotHash
        || receipt.toRevision !== decoded.envelope.revision
        || receipt.toSnapshotHash !== decoded.envelope.snapshotHash
        || receipt.envelopeHash !== decoded.envelope.envelopeHash
        || receipt.publicationOwnerId !== transition.ownerId
        || receipt.weaponId !== transition.weaponId
        || receipt.planContentHash !== transition.planContentHash
        || !sameIds(receipt.collectionWeaponIds, decoded.snapshot.collectionWeaponIds)) {
        throw new RangeError('Arena V2 Registry晋级回执、持久封装与当前原子引用不闭合。');
      }
      const transient = new ArenaV2InMemoryRegistryPublicationPortCandidateV1({
        revision: this.#revision,
        snapshotHash: this.#snapshotHash,
        snapshot: this.#snapshot!,
      });
      const result = transient.compareAndSwap(Object.freeze({
        schemaVersion: 1 as const,
        ownerId: transition.ownerId,
        weaponId: transition.weaponId,
        direction: 'publish' as const,
        expectedRevision: receipt.fromRevision,
        expectedSnapshotHash: receipt.fromSnapshotHash,
        nextRevision: receipt.toRevision,
        nextSnapshotHash: receipt.toSnapshotHash,
        planContentHash: receipt.planContentHash,
        snapshot: decoded.snapshot,
      }));
      if (!result.committed
        || result.observedRevision !== receipt.toRevision
        || result.observedSnapshotHash !== receipt.toSnapshotHash) {
        throw new Error('Arena V2 Registry原子引用拒绝未确认晋级。');
      }
      const nextUsedReceipts = Object.freeze([
        ...this.#usedReceiptHashes,
        receipt.receiptHash,
      ].slice(-MAXIMUM_USED_RECEIPTS));
      this.#snapshot = transient.readHead();
      this.#snapshotHash = receipt.toSnapshotHash;
      this.#revision = receipt.toRevision;
      this.#usedReceiptHashes = nextUsedReceipts;
      return this.snapshot();
    } finally {
      this.#transitioning = false;
    }
  }

  snapshot(): Readonly<ArenaV2AtomicRegistryReferenceSnapshotCandidateV1> {
    return Object.freeze({
      schemaVersion: ARENA_V2_ATOMIC_REGISTRY_REFERENCE_CANDIDATE_V1_SCHEMA_VERSION,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      revision: this.#destroyed ? null : this.#revision,
      snapshotHash: this.#destroyed ? null : this.#snapshotHash,
      collectionWeaponIds: this.#snapshot?.collectionWeaponIds ?? Object.freeze([]),
      usedReceiptCount: this.#usedReceiptHashes.length,
      transitioning: this.#transitioning,
      destroyed: this.#destroyed,
      defaultInstanceCreated: false as const,
      defaultRegistryWired: false as const,
      defaultCompositionWired: false as const,
    });
  }

  destroy(): Readonly<ArenaV2AtomicRegistryReferenceSnapshotCandidateV1> {
    if (this.#destroyed) return this.snapshot();
    this.#usable();
    this.#snapshot = null;
    this.#usedReceiptHashes = Object.freeze([]);
    this.#destroyed = true;
    return this.snapshot();
  }
}

export interface ArenaV2AtomicRegistryReferenceSnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly revision: number | null;
  readonly snapshotHash: string | null;
  readonly collectionWeaponIds: readonly string[];
  readonly usedReceiptCount: number;
  readonly transitioning: boolean;
  readonly destroyed: boolean;
  readonly defaultInstanceCreated: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
}
