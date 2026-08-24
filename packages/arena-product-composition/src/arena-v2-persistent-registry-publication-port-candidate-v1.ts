import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  createSynchronousStoragePort,
  type SynchronousStoragePort,
} from '@number-strategy-jump/arena-contracts';
import {
  SynchronousStorageLease,
} from '@number-strategy-jump/arena-storage';
import {
  ArenaV2InMemoryRegistryPublicationPortCandidateV1,
  createArenaV2PublishedRegistrySnapshotCandidateV1,
} from './arena-v2-in-memory-registry-publication-port-candidate-v1.js';
import {
  ArenaV2RegistryPublicationFutureSchemaErrorCandidateV1,
  createArenaV2RegistryPublicationEnvelopeCandidateV1,
  decodeArenaV2RegistryPublicationEnvelopeCandidateV1,
  type ArenaV2RegistryPublicationDecodedEnvelopeCandidateV1,
  type ArenaV2RegistryPublicationEnvelopeCandidateV1,
} from './arena-v2-registry-publication-envelope-candidate-v1.js';
import type {
  ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1,
  ArenaV2SingleWeaponRegistryPublicationCompareAndSwapInputCandidateV1,
  ArenaV2SingleWeaponRegistryPublicationCompareAndSwapResultCandidateV1,
  ArenaV2SingleWeaponRegistryPublicationPortCandidateV1,
  ArenaV2SingleWeaponRegistryPublicationReadCandidateV1,
} from './arena-v2-single-weapon-registry-publication-owner-candidate-v1.js';

export const ARENA_V2_PERSISTENT_REGISTRY_PUBLICATION_PORT_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

type Slot = 'a' | 'b';
type State = 'created' | 'open' | 'failed' | 'destroyed';

export interface ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1 {
  readonly storage: unknown;
  readonly repositoryOwnerId: string;
  readonly leaseHolderId: string;
  readonly wallNow: () => number;
  readonly initialRevision: number;
  readonly initialSnapshot: ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1;
  readonly keyPrefix?: string;
  readonly leaseDurationMs?: number;
  readonly leaseTakeoverSameOwner?: boolean;
}

export interface ArenaV2PersistentRegistryPublicationStorageKeysCandidateV1 {
  readonly slotA: string;
  readonly slotB: string;
  readonly head: string;
  readonly active: string;
  readonly lease: string;
}

export interface ArenaV2PersistentRegistryPublicationDiagnosticsCandidateV1 {
  readonly missingSlots: number;
  readonly invalidSlots: number;
  readonly selectedSlot: Slot | null;
  readonly recoveredWithoutHeadHint: boolean;
  readonly headHintValid: boolean;
}

export interface ArenaV2UnactivatedRegistryPendingCandidateV1 {
  readonly ownerId: string;
  readonly weaponId: string;
  readonly planContentHash: string;
  readonly pendingRevision: number;
  readonly pendingSnapshotHash: string;
  readonly activeRevision: number;
  readonly activeSnapshotHash: string;
}

interface NormalizedOptions {
  readonly storage: unknown;
  readonly repositoryOwnerId: unknown;
  readonly leaseHolderId: unknown;
  readonly wallNow: unknown;
  readonly initialRevision: unknown;
  readonly initialSnapshot: unknown;
  readonly keyPrefix: unknown;
  readonly leaseDurationMs: unknown;
  readonly leaseTakeoverSameOwner: unknown;
}

interface StoredHeadHint {
  readonly schemaVersion: 1;
  readonly slot: Slot;
  readonly revision: number;
  readonly envelopeHash: string;
}

interface StoredActiveMarker {
  readonly schemaVersion: 1;
  readonly slot: Slot;
  readonly revision: number;
  readonly snapshotHash: string;
  readonly envelopeHash: string;
  readonly receiptHash: string | null;
}

type SlotRead = Readonly<{
  readonly slot: Slot;
  readonly kind: 'missing' | 'invalid';
}> | Readonly<{
  readonly slot: Slot;
  readonly kind: 'valid';
  readonly decoded: Readonly<ArenaV2RegistryPublicationDecodedEnvelopeCandidateV1>;
}>;

interface StoredSelection {
  readonly slot: Slot;
  readonly decoded: Readonly<ArenaV2RegistryPublicationDecodedEnvelopeCandidateV1>;
}

const OPTION_KEYS = new Set([
  'storage', 'repositoryOwnerId', 'leaseHolderId', 'wallNow', 'initialRevision',
  'initialSnapshot', 'keyPrefix', 'leaseDurationMs', 'leaseTakeoverSameOwner',
]);
const REQUIRED_OPTION_KEYS = Object.freeze([
  'storage', 'repositoryOwnerId', 'leaseHolderId', 'wallNow', 'initialRevision',
  'initialSnapshot',
] as const);
const HEAD_KEYS = new Set(['schemaVersion', 'slot', 'revision', 'envelopeHash']);
const ACTIVE_KEYS = new Set([
  'schemaVersion', 'slot', 'revision', 'snapshotHash', 'envelopeHash', 'receiptHash',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

export const ARENA_V2_PERSISTENT_REGISTRY_PUBLICATION_PORT_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion:
      ARENA_V2_PERSISTENT_REGISTRY_PUBLICATION_PORT_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.persistent-registry-publication-port-policy.candidate.v1' as const,
    status: 'production-unreachable' as const,
    persistence: 'synchronous-dual-slot' as const,
    concurrency: 'single-writer-lease-plus-cas-readback' as const,
    recovery: 'highest-valid-revision-head-is-hint-only' as const,
    activation: 'durable-active-marker-separate-from-staged-head' as const,
    initialization: 'revision-zero-empty-registry-only' as const,
    nonEmptyInitialSnapshotPolicy: 'reject-readiness-bypass' as const,
    legacyNonEmptyTransitionlessGenerationPolicy: 'reject' as const,
    transitionScope: 'exactly-one-arena-v2-weapon' as const,
    futureSchemaPolicy: 'fail-closed' as const,
    ambiguousWritePolicy: 'readback-or-failed-indeterminate' as const,
    swallowedStorageOrLeaseReentryFailsClosed: true as const,
    storageAndLeaseCallbacksCheckedByReentrySequence: true as const,
    publicReadsRejectedDuringTransition: true as const,
    idempotentDestroyChecksReentryBeforeFastPath: true as const,
    defaultPort: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
  });

export class ArenaV2PersistentRegistryPublicationBusyErrorCandidateV1 extends Error {
  constructor() {
    super('Arena V2持久Registry publication已有其他写入者。');
    this.name = 'ArenaV2PersistentRegistryPublicationBusyErrorCandidateV1';
    Object.freeze(this);
  }
}

export class ArenaV2PersistentRegistryPublicationConflictErrorCandidateV1 extends Error {
  constructor(message = 'Arena V2持久Registry publication存在同revision冲突。') {
    super(message);
    this.name = 'ArenaV2PersistentRegistryPublicationConflictErrorCandidateV1';
    Object.freeze(this);
  }
}

export class ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1 extends Error {
  constructor(message = 'Arena V2持久Registry publication写入状态不确定。', options?: ErrorOptions) {
    super(message, options);
    this.name = 'ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1';
    Object.freeze(this);
  }
}

function optionValue(
  descriptors: Record<string, PropertyDescriptor>,
  key: string,
  fallback?: unknown,
): unknown {
  const descriptor = descriptors[key];
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : fallback;
}

function normalizeOptions(value: unknown): Readonly<NormalizedOptions> {
  assertKnownKeys(value, OPTION_KEYS, 'Arena V2 persistent registry publication options');
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  for (const key of REQUIRED_OPTION_KEYS) {
    if (descriptors[key] === undefined) {
      throw new TypeError(`Arena V2 persistent registry publication options.${key}缺失。`);
    }
  }
  return Object.freeze({
    storage: optionValue(descriptors, 'storage'),
    repositoryOwnerId: optionValue(descriptors, 'repositoryOwnerId'),
    leaseHolderId: optionValue(descriptors, 'leaseHolderId'),
    wallNow: optionValue(descriptors, 'wallNow'),
    initialRevision: optionValue(descriptors, 'initialRevision'),
    initialSnapshot: optionValue(descriptors, 'initialSnapshot'),
    keyPrefix: optionValue(
      descriptors,
      'keyPrefix',
      'arena-v2.registry-publication.candidate.v1',
    ),
    leaseDurationMs: optionValue(descriptors, 'leaseDurationMs', 60_000),
    leaseTakeoverSameOwner: optionValue(descriptors, 'leaseTakeoverSameOwner', false),
  });
}

function storageKeys(prefixValue: unknown): Readonly<
  ArenaV2PersistentRegistryPublicationStorageKeysCandidateV1
> {
  const prefix = assertNonEmptyString(prefixValue, 'Arena V2 Registry publication keyPrefix');
  return Object.freeze({
    slotA: `${prefix}.slot-a`,
    slotB: `${prefix}.slot-b`,
    head: `${prefix}.head`,
    active: `${prefix}.active`,
    lease: `${prefix}.lease`,
  });
}

function leaseHost(storage: Readonly<SynchronousStoragePort>) {
  return Object.freeze({
    storageRead: (key: string) => storage.read(key),
    storageWrite: (key: string, data: unknown) => storage.write(key, data),
    storageDelete: (key: string) => storage.delete(key),
  });
}

function exactHead(value: unknown): Readonly<StoredHeadHint> | null {
  try {
    assertKnownKeys(value, HEAD_KEYS, 'Arena V2 Registry publication head hint');
    const descriptors = Object.getOwnPropertyDescriptors(value as object);
    for (const key of HEAD_KEYS) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        return null;
      }
    }
    if (value.schemaVersion !== 1 || (value.slot !== 'a' && value.slot !== 'b')) return null;
    const envelopeHash = assertNonEmptyString(
      value.envelopeHash,
      'Arena V2 Registry publication head envelopeHash',
    );
    if (!HASH_PATTERN.test(envelopeHash)) return null;
    return Object.freeze({
      schemaVersion: 1 as const,
      slot: value.slot,
      revision: assertIntegerAtLeast(
        value.revision,
        0,
        'Arena V2 Registry publication head revision',
      ),
      envelopeHash,
    });
  } catch {
    return null;
  }
}

function exactActiveMarker(value: unknown): Readonly<StoredActiveMarker> | null {
  try {
    assertKnownKeys(value, ACTIVE_KEYS, 'Arena V2 Registry publication active marker');
    const descriptors = Object.getOwnPropertyDescriptors(value as object);
    for (const key of ACTIVE_KEYS) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        return null;
      }
    }
    if (value.schemaVersion !== 1 || (value.slot !== 'a' && value.slot !== 'b')) return null;
    const snapshotHash = assertNonEmptyString(
      value.snapshotHash,
      'Arena V2 Registry publication active snapshotHash',
    );
    const envelopeHash = assertNonEmptyString(
      value.envelopeHash,
      'Arena V2 Registry publication active envelopeHash',
    );
    if (!HASH_PATTERN.test(snapshotHash) || !HASH_PATTERN.test(envelopeHash)) return null;
    let receiptHash: string | null = null;
    if (value.receiptHash !== null) {
      receiptHash = assertNonEmptyString(
        value.receiptHash,
        'Arena V2 Registry publication active receiptHash',
      );
      if (!HASH_PATTERN.test(receiptHash)) return null;
    }
    return Object.freeze({
      schemaVersion: 1 as const,
      slot: value.slot,
      revision: assertIntegerAtLeast(
        value.revision,
        0,
        'Arena V2 Registry publication active revision',
      ),
      snapshotHash,
      envelopeHash,
      receiptHash,
    });
  } catch {
    return null;
  }
}

function sameEnvelope(
  left: Readonly<ArenaV2RegistryPublicationEnvelopeCandidateV1>,
  right: Readonly<ArenaV2RegistryPublicationEnvelopeCandidateV1>,
): boolean {
  return left.revision === right.revision
    && left.snapshotHash === right.snapshotHash
    && left.envelopeHash === right.envelopeHash;
}

export class ArenaV2PersistentRegistryPublicationPortCandidateV1
implements ArenaV2SingleWeaponRegistryPublicationPortCandidateV1 {
  #storage: Readonly<SynchronousStoragePort> | null;
  #lease: SynchronousStorageLease | null;
  #keys: Readonly<ArenaV2PersistentRegistryPublicationStorageKeysCandidateV1> | null;
  #initial: Readonly<ArenaV2RegistryPublicationDecodedEnvelopeCandidateV1> | null;
  #current: Readonly<ArenaV2RegistryPublicationDecodedEnvelopeCandidateV1> | null = null;
  #activeSlot: Slot | null = null;
  #active: Readonly<ArenaV2RegistryPublicationDecodedEnvelopeCandidateV1> | null = null;
  #activatedSlot: Slot | null = null;
  #activeReceiptHash: string | null = null;
  #state: State = 'created';
  #transitioning = false;
  #reentrySequence = 0;
  #diagnostics: Readonly<ArenaV2PersistentRegistryPublicationDiagnosticsCandidateV1> =
    Object.freeze({
      missingSlots: 2,
      invalidSlots: 0,
      selectedSlot: null,
      recoveredWithoutHeadHint: false,
      headHintValid: true,
    });

  constructor(options: ArenaV2PersistentRegistryPublicationPortOptionsCandidateV1) {
    const normalized = normalizeOptions(options);
    if (typeof normalized.wallNow !== 'function') {
      throw new TypeError('Arena V2 Registry publication wallNow必须是函数。');
    }
    if (typeof normalized.leaseTakeoverSameOwner !== 'boolean') {
      throw new TypeError('Arena V2 Registry publication leaseTakeoverSameOwner必须是布尔值。');
    }
    const storage = createSynchronousStoragePort(normalized.storage, {
      label: 'Arena V2 Persistent Registry Publication Storage',
    });
    const keys = storageKeys(normalized.keyPrefix);
    const initialSnapshot = createArenaV2PublishedRegistrySnapshotCandidateV1(
      normalized.initialSnapshot,
      'Arena V2 persistent registry publication initial snapshot',
    );
    const initialEnvelope = createArenaV2RegistryPublicationEnvelopeCandidateV1({
      revision: assertIntegerAtLeast(
        normalized.initialRevision,
        0,
        'Arena V2 persistent registry publication initialRevision',
      ),
      snapshot: initialSnapshot,
      transition: null,
    });
    if (initialEnvelope.revision !== 0
      || initialSnapshot.collectionWeaponIds.length !== 0) {
      throw new RangeError(
        'Arena V2持久Registry只能从revision 0空基线初始化，首把武器必须走正式单把晋级链。',
      );
    }
    this.#storage = storage;
    this.#keys = keys;
    this.#initial = Object.freeze({ envelope: initialEnvelope, snapshot: initialSnapshot });
    this.#lease = new SynchronousStorageLease({
      storage: leaseHost(storage),
      key: keys.lease,
      ownerId: assertNonEmptyString(
        normalized.repositoryOwnerId,
        'Arena V2 Registry publication repositoryOwnerId',
      ),
      holderId: assertNonEmptyString(
        normalized.leaseHolderId,
        'Arena V2 Registry publication leaseHolderId',
      ),
      wallNow: normalized.wallNow as () => number,
      durationMs: assertIntegerAtLeast(
        normalized.leaseDurationMs,
        1_000,
        'Arena V2 Registry publication leaseDurationMs',
      ),
      takeoverSameOwner: normalized.leaseTakeoverSameOwner,
      label: 'Arena V2 Persistent Registry Publication Lease',
    });
    Object.freeze(this);
  }

  #notTransitioning(): void {
    if (!this.#transitioning) return;
    this.#reentrySequence += 1;
    throw new Error('Arena V2持久Registry publication操作不可重入。');
  }

  #beginTransition(): void {
    this.#notTransitioning();
    this.#transitioning = true;
  }

  #indeterminate(message: string, cause?: unknown): never {
    this.#state = 'failed';
    throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
      message,
      cause === undefined ? undefined : { cause },
    );
  }

  #assertNoReentrySince(sequence: number, operation: string, cause?: unknown): void {
    if (this.#reentrySequence !== sequence) {
      this.#indeterminate(
        `Arena V2 Registry publication ${operation}期间发生重入。`,
        cause,
      );
    }
  }

  #runExternalOperation<T>(operation: string, callback: () => T): T {
    const reentrySequence = this.#reentrySequence;
    let result: T;
    try {
      result = callback();
    } catch (error) {
      this.#assertNoReentrySince(reentrySequence, operation, error);
      throw error;
    }
    this.#assertNoReentrySince(reentrySequence, operation);
    return result;
  }

  #endTransition(): void {
    this.#transitioning = false;
  }

  #requireStorage(): Readonly<SynchronousStoragePort> {
    if (this.#storage === null) throw new Error('Arena V2持久Registry publication已销毁。');
    return this.#storage;
  }

  #requireLease(): SynchronousStorageLease {
    if (this.#lease === null) throw new Error('Arena V2持久Registry publication已销毁。');
    return this.#lease;
  }

  #requireKeys(): Readonly<ArenaV2PersistentRegistryPublicationStorageKeysCandidateV1> {
    if (this.#keys === null) throw new Error('Arena V2持久Registry publication已销毁。');
    return this.#keys;
  }

  #requireInitial(): Readonly<ArenaV2RegistryPublicationDecodedEnvelopeCandidateV1> {
    if (this.#initial === null) throw new Error('Arena V2持久Registry publication已销毁。');
    return this.#initial;
  }

  #requireCurrent(): Readonly<ArenaV2RegistryPublicationDecodedEnvelopeCandidateV1> {
    if (this.#state === 'failed') {
      throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1();
    }
    if (this.#state === 'destroyed') throw new Error('Arena V2持久Registry publication已销毁。');
    if (this.#state !== 'open' || this.#current === null) {
      throw new Error('Arena V2持久Registry publication尚未打开。');
    }
    return this.#current;
  }

  #slotKey(slot: Slot): string {
    const keys = this.#requireKeys();
    return slot === 'a' ? keys.slotA : keys.slotB;
  }

  #readSlot(slot: Slot): SlotRead {
    const result = this.#runExternalOperation(
      `${slot}槽读取`,
      () => this.#requireStorage().read(this.#slotKey(slot)),
    );
    if (!result.ok) throw new Error(`Arena V2 Registry publication ${slot}槽读取失败。`);
    if (!result.found) return Object.freeze({ slot, kind: 'missing' as const });
    try {
      return Object.freeze({
        slot,
        kind: 'valid' as const,
        decoded: decodeArenaV2RegistryPublicationEnvelopeCandidateV1(result.value),
      });
    } catch (error) {
      if (error instanceof ArenaV2RegistryPublicationFutureSchemaErrorCandidateV1) throw error;
      return Object.freeze({ slot, kind: 'invalid' as const });
    }
  }

  #readHeadHint(): Readonly<StoredHeadHint> | null {
    try {
      const result = this.#runExternalOperation(
        'head hint读取',
        () => this.#requireStorage().read(this.#requireKeys().head),
      );
      return result.ok && result.found ? exactHead(result.value) : null;
    } catch (error) {
      if (error instanceof ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1) {
        throw error;
      }
      return null;
    }
  }

  #loadActive(): StoredSelection | null {
    const result = this.#runExternalOperation(
      'active marker读取',
      () => this.#requireStorage().read(this.#requireKeys().active),
    );
    if (!result.ok) throw new Error('Arena V2 Registry publication active marker读取失败。');
    if (!result.found) return null;
    const marker = exactActiveMarker(result.value);
    if (marker === null) {
      throw new ArenaV2PersistentRegistryPublicationConflictErrorCandidateV1(
        'Arena V2 Registry publication active marker损坏。',
      );
    }
    const slot = this.#readSlot(marker.slot);
    if (slot.kind !== 'valid'
      || slot.decoded.envelope.revision !== marker.revision
      || slot.decoded.envelope.snapshotHash !== marker.snapshotHash
      || slot.decoded.envelope.envelopeHash !== marker.envelopeHash) {
      throw new ArenaV2PersistentRegistryPublicationConflictErrorCandidateV1(
        'Arena V2 Registry publication active marker未指向精确合法槽。',
      );
    }
    this.#activeReceiptHash = marker.receiptHash;
    return Object.freeze({ slot: marker.slot, decoded: slot.decoded });
  }

  #loadStored(): StoredSelection | null {
    const slots = [this.#readSlot('a'), this.#readSlot('b')] as const;
    const head = this.#readHeadHint();
    const valid = slots.filter((slot): slot is Extract<SlotRead, { kind: 'valid' }> => (
      slot.kind === 'valid'
    )).sort((left, right) => (
      right.decoded.envelope.revision - left.decoded.envelope.revision
    ));
    if (valid.some(({ decoded }) => (
      decoded.envelope.transition === null
      && decoded.snapshot.collectionWeaponIds.length > 0
    ))) {
      throw new ArenaV2PersistentRegistryPublicationConflictErrorCandidateV1(
        'Arena V2 Registry publication槽包含无单把准入transition的旧非空generation。',
      );
    }
    const first = valid[0];
    const second = valid[1];
    if (first !== undefined && second !== undefined
      && first.decoded.envelope.revision === second.decoded.envelope.revision
      && !sameEnvelope(first.decoded.envelope, second.decoded.envelope)) {
      throw new ArenaV2PersistentRegistryPublicationConflictErrorCandidateV1();
    }
    if (first !== undefined && second !== undefined
      && first.decoded.envelope.revision !== second.decoded.envelope.revision) {
      const newer = first.decoded.envelope;
      const older = second.decoded.envelope;
      if (newer.revision !== older.revision + 1
        || newer.transition === null
        || newer.transition.fromRevision !== older.revision
        || newer.transition.fromSnapshotHash !== older.snapshotHash) {
        throw new ArenaV2PersistentRegistryPublicationConflictErrorCandidateV1(
          'Arena V2持久Registry publication双槽generation链不连续。',
        );
      }
    }
    let selected = first;
    if (first !== undefined && second !== undefined
      && sameEnvelope(first.decoded.envelope, second.decoded.envelope)
      && head !== null) {
      selected = valid.find(({ slot, decoded }) => (
        slot === head.slot
        && decoded.envelope.revision === head.revision
        && decoded.envelope.envelopeHash === head.envelopeHash
      )) ?? first;
    }
    const headMatches = selected !== undefined && head !== null
      && selected.slot === head.slot
      && selected.decoded.envelope.revision === head.revision
      && selected.decoded.envelope.envelopeHash === head.envelopeHash;
    this.#diagnostics = Object.freeze({
      missingSlots: slots.filter(({ kind }) => kind === 'missing').length,
      invalidSlots: slots.filter(({ kind }) => kind === 'invalid').length,
      selectedSlot: selected?.slot ?? null,
      recoveredWithoutHeadHint: selected !== undefined && !headMatches,
      headHintValid: head === null || headMatches,
    });
    return selected === undefined
      ? null
      : Object.freeze({ slot: selected.slot, decoded: selected.decoded });
  }

  #writeHeadHint(slot: Slot, envelope: ArenaV2RegistryPublicationEnvelopeCandidateV1): void {
    try {
      this.#runExternalOperation(
        'head hint写入',
        () => this.#requireStorage().write(this.#requireKeys().head, Object.freeze({
          schemaVersion: 1 as const,
          slot,
          revision: envelope.revision,
          envelopeHash: envelope.envelopeHash,
        })),
      );
    } catch (error) {
      if (error instanceof ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1) {
        throw error;
      }
      // The head is only a hint. Recovery always scans and validates both slots.
    }
  }

  #writeActiveMarker(
    slot: Slot,
    decoded: Readonly<ArenaV2RegistryPublicationDecodedEnvelopeCandidateV1>,
    receiptHash: string | null,
  ): boolean {
    const marker = Object.freeze({
      schemaVersion: 1 as const,
      slot,
      revision: decoded.envelope.revision,
      snapshotHash: decoded.envelope.snapshotHash,
      envelopeHash: decoded.envelope.envelopeHash,
      receiptHash,
    });
    let reported: boolean | null = null;
    try {
      reported = this.#runExternalOperation(
        'active marker写入',
        () => this.#requireStorage().write(this.#requireKeys().active, marker),
      );
    } catch (error) {
      if (error instanceof ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1) {
        throw error;
      }
      // Exact marker read-back is authoritative after a host exception.
    }
    let readback: Readonly<StoredActiveMarker> | null = null;
    try {
      const result = this.#runExternalOperation(
        'active marker读回',
        () => this.#requireStorage().read(this.#requireKeys().active),
      );
      if (!result.ok) throw new Error('active marker读取失败。');
      readback = result.found ? exactActiveMarker(result.value) : null;
    } catch (error) {
      this.#state = 'failed';
      throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
        'Arena V2 Registry publication active marker写入后无法readback。',
        { cause: error },
      );
    }
    if (readback !== null
      && readback.slot === marker.slot
      && readback.revision === marker.revision
      && readback.snapshotHash === marker.snapshotHash
      && readback.envelopeHash === marker.envelopeHash
      && readback.receiptHash === marker.receiptHash) return true;
    if (reported === true) {
      this.#state = 'failed';
      throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
        'Arena V2 Registry publication active marker报告写入成功但readback不一致。',
      );
    }
    return false;
  }

  #writeAndConfirm(
    slot: Slot,
    decoded: Readonly<ArenaV2RegistryPublicationDecodedEnvelopeCandidateV1>,
  ): boolean {
    let reported: boolean | null = null;
    try {
      reported = this.#runExternalOperation(
        `${slot}槽写入`,
        () => this.#requireStorage().write(this.#slotKey(slot), decoded.envelope),
      );
    } catch (error) {
      if (error instanceof ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1) {
        throw error;
      }
      // Read-back below decides whether the host committed before throwing.
    }
    let readback: SlotRead;
    try {
      readback = this.#readSlot(slot);
    } catch (error) {
      this.#state = 'failed';
      throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
        `Arena V2 Registry publication ${slot}槽写入后无法readback。`,
        { cause: error },
      );
    }
    if (readback.kind === 'valid'
      && sameEnvelope(readback.decoded.envelope, decoded.envelope)) return true;
    if (reported === true) {
      this.#state = 'failed';
      throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
        `Arena V2 Registry publication ${slot}槽报告写入成功但readback不一致。`,
      );
    }
    if (readback.kind === 'valid'
      && readback.decoded.envelope.revision >= decoded.envelope.revision) {
      this.#state = 'failed';
      throw new ArenaV2PersistentRegistryPublicationConflictErrorCandidateV1(
        `Arena V2 Registry publication ${slot}槽出现未持有的新generation。`,
      );
    }
    return false;
  }

  open(): Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> {
    this.#notTransitioning();
    if (this.#state === 'destroyed') throw new Error('Arena V2持久Registry publication已销毁。');
    if (this.#state === 'failed') {
      throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1();
    }
    if (this.#state === 'open') return this.#readCurrent();
    this.#beginTransition();
    let leaseAcquired = false;
    try {
      const acquireReentrySequence = this.#reentrySequence;
      try {
        leaseAcquired = this.#requireLease().acquire();
      } catch (error) {
        this.#assertNoReentrySince(acquireReentrySequence, '租约获取', error);
        throw error;
      }
      this.#assertNoReentrySince(acquireReentrySequence, '租约获取');
      if (!leaseAcquired) throw new ArenaV2PersistentRegistryPublicationBusyErrorCandidateV1();
      const stored = this.#loadStored();
      if (stored !== null) {
        if (stored.decoded.envelope.transition === null
          && stored.decoded.snapshot.collectionWeaponIds.length > 0) {
          throw new ArenaV2PersistentRegistryPublicationConflictErrorCandidateV1(
            'Arena V2 Registry publication拒绝无单把准入transition的旧非空generation。',
          );
        }
        this.#current = stored.decoded;
        this.#activeSlot = stored.slot;
        let active = this.#loadActive();
        if (active === null && stored.decoded.envelope.transition === null) {
          if (!this.#writeActiveMarker(stored.slot, stored.decoded, null)) {
            throw new Error('Arena V2 Registry publication初始active marker写入未确认。');
          }
          active = stored;
        }
        if (active === null) {
          const transition = stored.decoded.envelope.transition;
          const previousSlot: Slot = stored.slot === 'a' ? 'b' : 'a';
          const previous = this.#readSlot(previousSlot);
          if (transition?.direction === 'publish'
            && previous.kind === 'valid'
            && previous.decoded.envelope.revision === transition.fromRevision
            && previous.decoded.envelope.snapshotHash === transition.fromSnapshotHash) {
            if (!this.#writeActiveMarker(previousSlot, previous.decoded, null)) {
              throw new Error('Arena V2 Registry publication旧数据active marker恢复未确认。');
            }
            active = Object.freeze({ slot: previousSlot, decoded: previous.decoded });
          }
        }
        if (active === null) {
          throw new ArenaV2PersistentRegistryPublicationConflictErrorCandidateV1(
            'Arena V2 Registry publication无法证明当前durable active generation。',
          );
        }
        this.#active = active.decoded;
        this.#activatedSlot = active.slot;
      } else {
        const initial = this.#requireInitial();
        if (!this.#writeAndConfirm('a', initial)) {
          throw new Error('Arena V2 Registry publication初始槽写入未确认。');
        }
        this.#current = initial;
        this.#activeSlot = 'a';
        if (!this.#writeActiveMarker('a', initial, null)) {
          throw new Error('Arena V2 Registry publication初始active marker写入未确认。');
        }
        this.#active = initial;
        this.#activatedSlot = 'a';
        this.#activeReceiptHash = null;
        this.#writeHeadHint('a', initial.envelope);
      }
      this.#state = 'open';
      return this.#readCurrent();
    } catch (error) {
      if (leaseAcquired) {
        try {
          if (!this.#runExternalOperation(
            '打开失败租约释放',
            () => this.#requireLease().release(),
          )) {
            this.#state = 'failed';
            throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
              'Arena V2 Registry publication打开失败且租约释放未确认。',
              { cause: error },
            );
          }
        } catch (releaseError) {
          this.#state = 'failed';
          throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
            'Arena V2 Registry publication打开失败且租约释放异常。',
            { cause: new AggregateError([error, releaseError]) },
          );
        }
      }
      if (!(error instanceof ArenaV2PersistentRegistryPublicationBusyErrorCandidateV1)) {
        this.#state = 'failed';
      }
      throw error;
    } finally {
      this.#endTransition();
    }
  }

  #readCurrent(): Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> {
    const current = this.#requireCurrent();
    return Object.freeze({
      revision: current.envelope.revision,
      snapshotHash: current.envelope.snapshotHash,
      collectionWeaponIds: current.snapshot.collectionWeaponIds,
    });
  }

  read(): Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> {
    this.#notTransitioning();
    return this.#readCurrent();
  }

  readHead(): Readonly<ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1> {
    this.#notTransitioning();
    return this.#requireCurrent().snapshot;
  }

  readEnvelope(): Readonly<ArenaV2RegistryPublicationEnvelopeCandidateV1> {
    this.#notTransitioning();
    return this.#requireCurrent().envelope;
  }

  #readActive(): Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> {
    this.#requireCurrent();
    if (this.#active === null) {
      throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
        'Arena V2 Registry publication缺少durable active generation。',
      );
    }
    return Object.freeze({
      revision: this.#active.envelope.revision,
      snapshotHash: this.#active.envelope.snapshotHash,
      collectionWeaponIds: this.#active.snapshot.collectionWeaponIds,
    });
  }

  readActive(): Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> {
    this.#notTransitioning();
    return this.#readActive();
  }

  readActiveHead(): Readonly<ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1> {
    this.#notTransitioning();
    this.#readActive();
    return this.#active!.snapshot;
  }

  readUnactivatedPending(): Readonly<ArenaV2UnactivatedRegistryPendingCandidateV1> | null {
    this.#notTransitioning();
    const current = this.#requireCurrent();
    if (this.#active === null) {
      throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
        'Arena V2 Registry publication缺少durable active generation。',
      );
    }
    if (sameEnvelope(current.envelope, this.#active.envelope)) return null;
    const transition = current.envelope.transition;
    if (transition === null
      || transition.direction !== 'publish'
      || transition.fromRevision !== this.#active.envelope.revision
      || transition.fromSnapshotHash !== this.#active.envelope.snapshotHash) {
      throw new ArenaV2PersistentRegistryPublicationConflictErrorCandidateV1(
        'Arena V2 Registry publication staged头不是紧邻active的单把pending。',
      );
    }
    return Object.freeze({
      ownerId: transition.ownerId,
      weaponId: transition.weaponId,
      planContentHash: transition.planContentHash,
      pendingRevision: current.envelope.revision,
      pendingSnapshotHash: current.envelope.snapshotHash,
      activeRevision: this.#active.envelope.revision,
      activeSnapshotHash: this.#active.envelope.snapshotHash,
    });
  }

  recoverUnactivatedPending(): Readonly<
    ArenaV2SingleWeaponRegistryPublicationReadCandidateV1
  > {
    this.#notTransitioning();
    const pending = this.readUnactivatedPending();
    if (pending === null) return this.read();
    if (this.#active === null || this.#current === null) {
      throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1();
    }
    if (pending.pendingRevision >= Number.MAX_SAFE_INTEGER) {
      throw new RangeError('Arena V2 Registry publication pending revision已经耗尽。');
    }
    const result = this.compareAndSwap(Object.freeze({
      schemaVersion: 1 as const,
      ownerId: pending.ownerId,
      weaponId: pending.weaponId,
      direction: 'rollback' as const,
      expectedRevision: pending.pendingRevision,
      expectedSnapshotHash: pending.pendingSnapshotHash,
      nextRevision: pending.pendingRevision + 1,
      nextSnapshotHash: pending.activeSnapshotHash,
      planContentHash: pending.planContentHash,
      snapshot: this.#active.snapshot,
    }));
    if (!result.committed
      || result.observedRevision !== pending.pendingRevision + 1
      || result.observedSnapshotHash !== pending.activeSnapshotHash) {
      throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
        'Arena V2 Registry publication orphan pending恢复未确认。',
      );
    }
    return this.read();
  }

  activateCurrentGeneration(
    receiptHashValue: unknown,
  ): Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> {
    this.#notTransitioning();
    const current = this.#requireCurrent();
    if (this.#active === null || this.#activatedSlot === null || this.#activeSlot === null) {
      throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
        'Arena V2 Registry publication缺少可激活的durable基线。',
      );
    }
    const receiptHash = assertNonEmptyString(
      receiptHashValue,
      'Arena V2 Registry publication activation receiptHash',
    );
    if (!HASH_PATTERN.test(receiptHash)) {
      throw new RangeError('Arena V2 Registry publication activation receiptHash无效。');
    }
    if (sameEnvelope(current.envelope, this.#active.envelope)) {
      if (this.#activeReceiptHash !== receiptHash) {
        throw new RangeError('Arena V2 Registry publication generation已由其他回执激活。');
      }
      return this.#readActive();
    }
    const transition = current.envelope.transition;
    if (transition === null
      || transition.direction !== 'publish'
      || transition.fromRevision !== this.#active.envelope.revision
      || transition.fromSnapshotHash !== this.#active.envelope.snapshotHash) {
      throw new RangeError('Arena V2 Registry publication只允许激活紧邻active的publish generation。');
    }
    this.#beginTransition();
    try {
      this.#runExternalOperation(
        'generation激活租约复核',
        () => this.#requireLease().assertHeld(),
      );
      if (!this.#writeActiveMarker(this.#activeSlot, current, receiptHash)) {
        throw new Error('Arena V2 Registry publication active generation写入未确认。');
      }
      this.#active = current;
      this.#activatedSlot = this.#activeSlot;
      this.#activeReceiptHash = receiptHash;
      return this.#readActive();
    } catch (error) {
      if (!(error instanceof RangeError)) this.#state = 'failed';
      throw error;
    } finally {
      this.#endTransition();
    }
  }

  compareAndSwap(
    input: ArenaV2SingleWeaponRegistryPublicationCompareAndSwapInputCandidateV1,
  ): Readonly<ArenaV2SingleWeaponRegistryPublicationCompareAndSwapResultCandidateV1> {
    this.#notTransitioning();
    const current = this.#requireCurrent();
    this.#beginTransition();
    try {
      try {
        this.#runExternalOperation(
          'CAS租约复核',
          () => this.#requireLease().assertHeld(),
        );
      } catch (error) {
        this.#state = 'failed';
        throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
          'Arena V2 Registry publication租约已经失效。',
          { cause: error },
        );
      }
      const stored = this.#loadStored();
      if (stored === null || !sameEnvelope(stored.decoded.envelope, current.envelope)) {
        this.#state = 'failed';
        throw new ArenaV2PersistentRegistryPublicationConflictErrorCandidateV1(
          'Arena V2 Registry publication持有租约期间存储头发生漂移。',
        );
      }
      this.#activeSlot = stored.slot;
      const transient = new ArenaV2InMemoryRegistryPublicationPortCandidateV1({
        revision: current.envelope.revision,
        snapshotHash: current.envelope.snapshotHash,
        snapshot: current.snapshot,
      });
      const result = transient.compareAndSwap(input);
      if (!result.committed) return result;
      if (input.direction === 'publish'
        && (this.#active === null || !sameEnvelope(current.envelope, this.#active.envelope))) {
        throw new RangeError('Arena V2 Registry publication存在未激活generation，禁止继续叠加发布。');
      }
      const nextSnapshot = transient.readHead();
      const envelope = createArenaV2RegistryPublicationEnvelopeCandidateV1({
        revision: input.nextRevision,
        snapshot: nextSnapshot,
        transition: Object.freeze({
          ownerId: input.ownerId,
          weaponId: input.weaponId,
          direction: input.direction,
          fromRevision: input.expectedRevision,
          fromSnapshotHash: input.expectedSnapshotHash,
          toRevision: input.nextRevision,
          toSnapshotHash: input.nextSnapshotHash,
          planContentHash: input.planContentHash,
        }),
      });
      const decoded = Object.freeze({ envelope, snapshot: nextSnapshot });
      const targetSlot: Slot = this.#activeSlot === 'a' ? 'b' : 'a';
      if (!this.#writeAndConfirm(targetSlot, decoded)) {
        return Object.freeze({
          committed: false,
          observedRevision: current.envelope.revision,
          observedSnapshotHash: current.envelope.snapshotHash,
        });
      }
      const committed = this.#loadStored();
      if (committed === null
        || committed.slot !== targetSlot
        || !sameEnvelope(committed.decoded.envelope, envelope)) {
        this.#state = 'failed';
        throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
          'Arena V2 Registry publication写入后双槽头无法证明新generation。',
        );
      }
      this.#current = committed.decoded;
      this.#activeSlot = committed.slot;
      if (input.direction === 'rollback'
        && this.#active !== null
        && envelope.snapshotHash === this.#active.envelope.snapshotHash) {
        if (!this.#writeActiveMarker(committed.slot, committed.decoded, null)) {
          this.#state = 'failed';
          throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
            'Arena V2 Registry publication回滚后active marker推进未确认。',
          );
        }
        this.#active = committed.decoded;
        this.#activatedSlot = committed.slot;
        this.#activeReceiptHash = null;
      }
      this.#writeHeadHint(targetSlot, envelope);
      return Object.freeze({
        committed: true,
        observedRevision: envelope.revision,
        observedSnapshotHash: envelope.snapshotHash,
      });
    } finally {
      this.#endTransition();
    }
  }

  renewLease(): boolean {
    this.#notTransitioning();
    this.#requireCurrent();
    this.#beginTransition();
    try {
      try {
        if (this.#runExternalOperation(
          '租约续期',
          () => this.#requireLease().renew(),
        )) return true;
        this.#runExternalOperation(
          '续期后租约持有复核',
          () => this.#requireLease().assertHeld(),
        );
        return false;
      } catch (error) {
        this.#state = 'failed';
        throw new ArenaV2PersistentRegistryPublicationIndeterminateErrorCandidateV1(
          'Arena V2 Registry publication租约续期状态不确定。',
          { cause: error },
        );
      }
    } finally {
      this.#endTransition();
    }
  }

  getStorageKeys(): Readonly<ArenaV2PersistentRegistryPublicationStorageKeysCandidateV1> {
    this.#notTransitioning();
    return this.#requireKeys();
  }

  getDiagnostics(): Readonly<ArenaV2PersistentRegistryPublicationDiagnosticsCandidateV1> {
    this.#notTransitioning();
    if (this.#state === 'destroyed') throw new Error('Arena V2持久Registry publication已销毁。');
    return this.#diagnostics;
  }

  snapshot(): Readonly<{
    readonly schemaVersion: 1;
    readonly status: 'production-unreachable';
    readonly state: State;
    readonly revision: number | null;
    readonly snapshotHash: string | null;
    readonly collectionWeaponIds: readonly string[];
    readonly activeSlot: Slot | null;
    readonly activeRevision: number | null;
    readonly activeSnapshotHash: string | null;
    readonly activeReceiptHash: string | null;
    readonly transitioning: boolean;
    readonly persistent: true;
    readonly defaultPort: false;
    readonly defaultRegistryWired: false;
  }> {
    this.#notTransitioning();
    return Object.freeze({
      schemaVersion:
        ARENA_V2_PERSISTENT_REGISTRY_PUBLICATION_PORT_CANDIDATE_V1_SCHEMA_VERSION,
      status: 'production-unreachable' as const,
      state: this.#state,
      revision: this.#current?.envelope.revision ?? null,
      snapshotHash: this.#current?.envelope.snapshotHash ?? null,
      collectionWeaponIds: this.#current?.snapshot.collectionWeaponIds ?? Object.freeze([]),
      activeSlot: this.#activeSlot,
      activeRevision: this.#active?.envelope.revision ?? null,
      activeSnapshotHash: this.#active?.envelope.snapshotHash ?? null,
      activeReceiptHash: this.#activeReceiptHash,
      transitioning: this.#transitioning,
      persistent: true as const,
      defaultPort: false as const,
      defaultRegistryWired: false as const,
    });
  }

  destroy(): void {
    this.#notTransitioning();
    if (this.#state === 'destroyed') return;
    this.#beginTransition();
    try {
      this.#state = 'failed';
      this.#runExternalOperation(
        '销毁',
        () => this.#requireLease().destroy(),
      );
      this.#storage = null;
      this.#lease = null;
      this.#keys = null;
      this.#initial = null;
      this.#current = null;
      this.#activeSlot = null;
      this.#active = null;
      this.#activatedSlot = null;
      this.#activeReceiptHash = null;
      this.#state = 'destroyed';
    } finally {
      this.#endTransition();
    }
  }
}
