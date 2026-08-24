import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  combineCleanupFailure,
  createSynchronousStoragePort,
  normalizeThrownError,
  type SynchronousStoragePort,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaV2LearningProfileFutureSchemaError,
  ArenaV2LearningProfileIndeterminateWriteError,
  ArenaV2LearningProfileRepositoryBusyError,
  ArenaV2LearningProfileSaveConflictError,
  assertArenaV2LearningProfileSaveEnvelopeV1HasNoFutureSchema,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileSaveEnvelopeV1,
  createArenaV2LearningProfileV1,
  createSaveMigrationRegistry,
  validateArenaV2LearningProfileSaveEnvelopeV1,
  type ArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningProfileSaveEnvelopeV1,
  type ArenaV2LearningProfileV1,
  type SaveMigrationRegistry,
  type ValidatedArenaV2LearningProfileSaveEnvelopeV1,
} from '@number-strategy-jump/arena-profile-contracts';
import { SynchronousStorageLease } from '@number-strategy-jump/arena-storage';

type Slot = 'a' | 'b';
type State = 'created' | 'open' | 'failed' | 'destroyed';
type LearningProfileRepositoryOperation =
  | 'open'
  | 'snapshot-read'
  | 'diagnostics-read'
  | 'storage-keys-read'
  | 'renew-lease'
  | 'compare-and-set'
  | 'destroy';

export interface ArenaV2LearningProfileRepositoryOptionsV1 {
  readonly definition: unknown;
  readonly migrationRegistry?: unknown;
  readonly storage: unknown;
  readonly ownerId: string;
  readonly leaseHolderId?: string;
  readonly wallNow: () => number;
  readonly leaseDurationMs?: number;
  readonly leaseTakeoverSameOwner?: boolean;
  readonly keyPrefix?: string | null;
}

export interface ArenaV2LearningProfileStorageKeysV1 {
  readonly slotA: string;
  readonly slotB: string;
  readonly head: string;
  readonly lease: string;
}

export interface ArenaV2LearningProfileRepositoryDiagnosticsV1 {
  readonly missingSlots: number;
  readonly invalidSlots: number;
  readonly migratedSlots: number;
  readonly headReadable: boolean;
  readonly headValid: boolean;
  readonly recoveredDefault: boolean;
}

export const ARENA_V2_LEARNING_PROFILE_REPOSITORY_LIFECYCLE_V1 = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  storageAndLeaseCallbackReentryIsSticky: true,
  operationGuardPrecedesStateAndInputValidation: true,
  storageAndLeasePortsCheckedBeforeCrossOwnerProgress: true,
  durableSlotAndHeadWatermarksPrecedeReentryRejection: true,
  publicReadsRejectOperationIntermediateState: true,
  destroyWatermarkPrecedesReentryRejection: true,
  persistentPublicationWaitsForCallbackClosure: true,
  postWriteReentryIsIndeterminate: true,
  openFailureWithLeaseCleanupDebtFailsClosed: true,
  destroyStartsAtFailedClosedWatermark: true,
  leaseAcquireFailureDispositionIsExplicit: true,
  validationStatus: 'not-run',
} as const);

export type ArenaV2LearningProfileCommitFailureReasonV1 =
  | 'memory-revision-mismatch'
  | 'storage-revision-mismatch'
  | 'slot-readback-failed'
  | 'slot-write-failed';

export type ArenaV2LearningProfileCommitResultV1 = Readonly<
  | { readonly committed: true; readonly reason: null; readonly headUpdated: boolean }
  | {
    readonly committed: false;
    readonly reason: ArenaV2LearningProfileCommitFailureReasonV1;
    readonly headUpdated: false;
  }
>;

interface NormalizedOptions {
  readonly definition: unknown;
  readonly migrationRegistry: unknown;
  readonly storage: unknown;
  readonly ownerId: unknown;
  readonly leaseHolderId: unknown;
  readonly wallNow: unknown;
  readonly leaseDurationMs: unknown;
  readonly leaseTakeoverSameOwner: unknown;
  readonly keyPrefix: unknown;
}

type SlotRead =
  | Readonly<{ readonly kind: 'missing'; readonly slot: Slot }>
  | Readonly<{ readonly kind: 'invalid'; readonly slot: Slot }>
  | (ValidatedArenaV2LearningProfileSaveEnvelopeV1
    & Readonly<{ readonly kind: 'valid'; readonly slot: Slot }>);

interface HeadRead {
  readonly readable: boolean;
  readonly value: Slot | null;
  readonly valid: boolean;
}

interface StoredProfile {
  readonly slot: Slot | null;
  readonly profile: ArenaV2LearningProfileV1;
  readonly envelope: ArenaV2LearningProfileSaveEnvelopeV1;
  readonly migrated: boolean;
}

interface StoredLoad {
  readonly stored: StoredProfile | null;
  readonly diagnostics: Readonly<ArenaV2LearningProfileRepositoryDiagnosticsV1>;
}

interface LeaseStorageHost {
  storageRead(key: string): ReturnType<SynchronousStoragePort['read']>;
  storageWrite(key: string, data: unknown): boolean;
  storageDelete(key: string): boolean;
}

const SLOT = Object.freeze({ A: 'a' as const, B: 'b' as const });
const OPTION_KEYS = new Set([
  'definition', 'migrationRegistry', 'storage', 'ownerId', 'leaseHolderId',
  'wallNow', 'leaseDurationMs', 'leaseTakeoverSameOwner', 'keyPrefix',
]);
const REQUIRED_OPTIONS = Object.freeze(['definition', 'storage', 'ownerId', 'wallNow'] as const);

function valueOf(
  descriptors: Record<string, PropertyDescriptor>,
  key: string,
  fallback?: unknown,
): unknown {
  const descriptor = descriptors[key];
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : fallback;
}

function normalizeOptions(value: unknown): NormalizedOptions {
  assertKnownKeys(value, OPTION_KEYS, 'ArenaV2LearningProfileRepositoryV1 options');
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  for (const key of REQUIRED_OPTIONS) {
    if (!descriptors[key]) throw new TypeError(`Learning Repository options缺少${key}。`);
  }
  const ownerId = valueOf(descriptors, 'ownerId');
  return Object.freeze({
    definition: valueOf(descriptors, 'definition'),
    migrationRegistry: valueOf(descriptors, 'migrationRegistry', null),
    storage: valueOf(descriptors, 'storage'),
    ownerId,
    leaseHolderId: valueOf(descriptors, 'leaseHolderId', ownerId),
    wallNow: valueOf(descriptors, 'wallNow'),
    leaseDurationMs: valueOf(descriptors, 'leaseDurationMs', 60_000),
    leaseTakeoverSameOwner: valueOf(descriptors, 'leaseTakeoverSameOwner', false),
    keyPrefix: valueOf(descriptors, 'keyPrefix', null),
  });
}

function keys(
  definition: ArenaV2LearningProfileDefinitionV1,
  prefixValue: unknown,
): Readonly<ArenaV2LearningProfileStorageKeysV1> {
  const prefix = assertNonEmptyString(
    prefixValue ?? `arena.v2-learning-profile.${definition.id}`,
    'Learning Repository keyPrefix',
  );
  return Object.freeze({
    slotA: `${prefix}.slot-a`,
    slotB: `${prefix}.slot-b`,
    head: `${prefix}.head`,
    lease: `${prefix}.lease`,
  });
}

function leaseHost(storage: Readonly<SynchronousStoragePort>): Readonly<LeaseStorageHost> {
  return Object.freeze({
    storageRead: (key: string) => storage.read(key),
    storageWrite: (key: string, data: unknown) => storage.write(key, data),
    storageDelete: (key: string) => storage.delete(key),
  });
}

function valid(value: SlotRead): value is Extract<SlotRead, { kind: 'valid' }> {
  return value.kind === 'valid';
}

function same(left: StoredProfile, right: StoredProfile): boolean {
  return left.profile.revision === right.profile.revision
    && left.envelope.payloadHash === right.envelope.payloadHash;
}

function failure(
  reason: ArenaV2LearningProfileCommitFailureReasonV1,
): ArenaV2LearningProfileCommitResultV1 {
  return Object.freeze({ committed: false, reason, headUpdated: false });
}

export class ArenaV2LearningProfileRepositoryV1 {
  #definition: ArenaV2LearningProfileDefinitionV1 | null;
  #migrationRegistry: SaveMigrationRegistry | null;
  #storage: Readonly<SynchronousStoragePort> | null;
  #lease: SynchronousStorageLease | null;
  #keys: Readonly<ArenaV2LearningProfileStorageKeysV1> | null;
  #profile: ArenaV2LearningProfileV1 | null = null;
  #envelope: ArenaV2LearningProfileSaveEnvelopeV1 | null = null;
  #diagnostics: Readonly<ArenaV2LearningProfileRepositoryDiagnosticsV1> = Object.freeze({
    missingSlots: 2,
    invalidSlots: 0,
    migratedSlots: 0,
    headReadable: true,
    headValid: true,
    recoveredDefault: false,
  });
  #state: State = 'created';
  #operation: LearningProfileRepositoryOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(options: ArenaV2LearningProfileRepositoryOptionsV1) {
    const normalized = normalizeOptions(options);
    const definition = createArenaV2LearningProfileDefinitionV1(normalized.definition);
    const migrationRegistry = createSaveMigrationRegistry(normalized.migrationRegistry ?? {
      currentVersion: definition.currentProfileSchemaVersion,
      migrations: [],
    });
    if (migrationRegistry.getCurrentVersion() !== definition.currentProfileSchemaVersion) {
      throw new RangeError('Learning Repository MigrationRegistry schema不匹配。');
    }
    if (typeof normalized.wallNow !== 'function') throw new TypeError('wallNow必须是函数。');
    const storage = createSynchronousStoragePort(normalized.storage, {
      label: 'Arena V2 Learning Profile Storage',
    });
    const storageKeys = keys(definition, normalized.keyPrefix);
    this.#definition = definition;
    this.#migrationRegistry = migrationRegistry;
    this.#storage = storage;
    this.#keys = storageKeys;
    this.#lease = new SynchronousStorageLease({
      storage: leaseHost(storage),
      key: storageKeys.lease,
      ownerId: assertNonEmptyString(normalized.ownerId, 'Learning Repository ownerId'),
      holderId: assertNonEmptyString(normalized.leaseHolderId, 'Learning Repository leaseHolderId'),
      wallNow: normalized.wallNow as () => number,
      durationMs: assertIntegerAtLeast(normalized.leaseDurationMs, 1_000, 'leaseDurationMs'),
      takeoverSameOwner: normalized.leaseTakeoverSameOwner as boolean,
      label: 'Arena V2 Learning Profile Lease',
    });
    Object.freeze(this);
  }

  #rejectReentry(operation: LearningProfileRepositoryOperation): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `Learning Repository操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw error;
  }

  #runOperation<T>(operation: LearningProfileRepositoryOperation, callback: () => T): T {
    if (this.#operation !== null) this.#rejectReentry(operation);
    this.#operation = operation;
    this.#reentryError = null;
    try {
      return callback();
    } finally {
      this.#operation = null;
    }
  }

  #assertNoReentrySince(
    sequence: number,
    operation: string,
    preserveState = false,
  ): void {
    if (this.#reentrySequence !== sequence) {
      if (!preserveState) {
        this.#indeterminate(
          `Learning Repository ${operation}期间发生重入。`,
          this.#reentryError ?? undefined,
        );
      }
      const error = new ArenaV2LearningProfileIndeterminateWriteError(
        `Learning Repository ${operation}期间发生重入。`,
      );
      if (this.#reentryError !== null) error.cause = this.#reentryError;
      throw error;
    }
  }

  #openState(): void {
    if (this.#state === 'destroyed') throw new Error('Learning Repository已销毁。');
    if (this.#state === 'failed') throw new ArenaV2LearningProfileIndeterminateWriteError();
    if (this.#state !== 'open') throw new Error('Learning Repository尚未打开。');
  }

  #definitionValue(): ArenaV2LearningProfileDefinitionV1 {
    if (!this.#definition) throw new Error('Learning Repository已销毁。');
    return this.#definition;
  }

  #migrations(): SaveMigrationRegistry {
    if (!this.#migrationRegistry) throw new Error('Learning Repository已销毁。');
    return this.#migrationRegistry;
  }

  #storageValue(): Readonly<SynchronousStoragePort> {
    if (!this.#storage) throw new Error('Learning Repository已销毁。');
    return this.#storage;
  }

  #leaseValue(): SynchronousStorageLease {
    if (!this.#lease) throw new Error('Learning Repository已销毁。');
    return this.#lease;
  }

  #keyValue(): Readonly<ArenaV2LearningProfileStorageKeysV1> {
    if (!this.#keys) throw new Error('Learning Repository已销毁。');
    return this.#keys;
  }

  #profileValue(): ArenaV2LearningProfileV1 {
    if (!this.#profile) throw new Error('Learning Repository尚未打开。');
    return this.#profile;
  }

  #envelopeValue(): ArenaV2LearningProfileSaveEnvelopeV1 {
    if (!this.#envelope) throw new Error('Learning Repository尚未打开。');
    return this.#envelope;
  }

  #readSlot(key: string, slot: Slot): SlotRead {
    const readReentrySequence = this.#reentrySequence;
    const result = this.#storageValue().read(key);
    this.#assertNoReentrySince(readReentrySequence, `${slot}槽读取`);
    if (!result.ok) throw new Error(`Learning Profile ${slot}槽读取失败。`);
    if (!result.found) return Object.freeze({ kind: 'missing', slot });
    try {
      return Object.freeze({
        kind: 'valid' as const,
        slot,
        ...validateArenaV2LearningProfileSaveEnvelopeV1(
          this.#definitionValue(),
          this.#migrations(),
          result.value,
        ),
      });
    } catch (error) {
      try {
        assertArenaV2LearningProfileSaveEnvelopeV1HasNoFutureSchema(
          this.#definitionValue(),
          result.value,
        );
      } catch (compatibilityError) {
        if (compatibilityError instanceof Error) compatibilityError.cause = error;
        throw compatibilityError;
      }
      return Object.freeze({ kind: 'invalid', slot });
    }
  }

  #readHead(): HeadRead {
    const readReentrySequence = this.#reentrySequence;
    try {
      const result = this.#storageValue().read(this.#keyValue().head);
      this.#assertNoReentrySince(readReentrySequence, 'head读取');
      if (!result.ok) return Object.freeze({ readable: false, value: null, valid: false });
      if (!result.found) return Object.freeze({ readable: true, value: null, valid: true });
      const isValid = result.value === SLOT.A || result.value === SLOT.B;
      return Object.freeze({
        readable: true,
        value: isValid ? result.value as Slot : null,
        valid: isValid,
      });
    } catch {
      this.#assertNoReentrySince(readReentrySequence, 'head读取');
      return Object.freeze({ readable: false, value: null, valid: false });
    }
  }

  #loadStored(): StoredLoad {
    const storageKeys = this.#keyValue();
    const slots = [
      this.#readSlot(storageKeys.slotA, SLOT.A),
      this.#readSlot(storageKeys.slotB, SLOT.B),
    ] as const;
    const head = this.#readHead();
    const candidates = slots.filter(valid).sort(
      (left, right) => right.profile.revision - left.profile.revision,
    );
    const diagnostics = Object.freeze({
      missingSlots: slots.filter(({ kind }) => kind === 'missing').length,
      invalidSlots: slots.filter(({ kind }) => kind === 'invalid').length,
      migratedSlots: candidates.filter(({ migrated }) => migrated).length,
      headReadable: head.readable,
      headValid: head.valid,
      recoveredDefault: candidates.length === 0,
    });
    const first = candidates[0];
    if (!first) return Object.freeze({ stored: null, diagnostics });
    const second = candidates[1];
    if (second
      && first.profile.revision === second.profile.revision
      && first.envelope.payloadHash !== second.envelope.payloadHash) {
      throw new ArenaV2LearningProfileSaveConflictError();
    }
    if (second && first.profile.revision === second.profile.revision) {
      return Object.freeze({
        stored: candidates.find(({ slot }) => slot === head.value) ?? first,
        diagnostics,
      });
    }
    return Object.freeze({ stored: first, diagnostics });
  }

  #defaultStored(): StoredProfile {
    const profile = createArenaV2LearningProfileV1(this.#definitionValue());
    return Object.freeze({
      slot: null,
      profile,
      envelope: createArenaV2LearningProfileSaveEnvelopeV1(this.#definitionValue(), profile),
      migrated: false,
    });
  }

  #rollback(key: string): boolean {
    try {
      try {
        this.#storageValue().delete(key);
      } catch {
        // Read-back below is authoritative when a host throws after mutation.
      }
      const result = this.#storageValue().read(key);
      return result.ok && !result.found;
    } catch {
      return false;
    }
  }

  #indeterminate(message: string, cause?: unknown): never {
    this.#state = 'failed';
    const error = new ArenaV2LearningProfileIndeterminateWriteError(message);
    if (cause !== undefined) error.cause = cause;
    throw error;
  }

  open(): ArenaV2LearningProfileV1 {
    return this.#runOperation('open', () => {
      if (this.#state === 'destroyed') throw new Error('Learning Repository已销毁。');
      if (this.#state === 'failed') throw new ArenaV2LearningProfileIndeterminateWriteError();
      if (this.#state === 'open') return this.#profileValue();
      const acquireReentrySequence = this.#reentrySequence;
      let acquired: boolean;
      try {
        acquired = this.#leaseValue().acquire();
      } catch (error) {
        this.#assertNoReentrySince(acquireReentrySequence, '租约获取');
        let leaseFailedClosed = true;
        try {
          leaseFailedClosed = this.#leaseValue().isFailedClosed();
        } catch {
          // An unreadable lease lifecycle is itself unsafe to reuse.
        }
        if (leaseFailedClosed) {
          this.#state = 'failed';
          const indeterminate = new ArenaV2LearningProfileIndeterminateWriteError(
            'Learning Repository租约获取事务已失败关闭。',
          );
          indeterminate.cause = error;
          throw indeterminate;
        }
        throw error;
      }
      if (!acquired) {
        this.#assertNoReentrySince(acquireReentrySequence, '租约获取');
        throw new ArenaV2LearningProfileRepositoryBusyError();
      }
      try {
        this.#assertNoReentrySince(acquireReentrySequence, '租约获取');
        const loadReentrySequence = this.#reentrySequence;
        const loaded = this.#loadStored();
        this.#assertNoReentrySince(loadReentrySequence, '打开读档');
        const stored = loaded.stored ?? this.#defaultStored();
        this.#diagnostics = loaded.diagnostics;
        this.#profile = stored.profile;
        this.#envelope = stored.envelope;
        this.#state = 'open';
        return stored.profile;
      } catch (error) {
        if (error instanceof ArenaV2LearningProfileFutureSchemaError
          || error instanceof ArenaV2LearningProfileSaveConflictError) {
          this.#state = 'failed';
        }
        const failure = normalizeThrownError(error, 'Learning Repository打开失败');
        const cleanupErrors: Error[] = [];
        try {
          const releaseReentrySequence = this.#reentrySequence;
          const released = this.#leaseValue().release();
          this.#assertNoReentrySince(releaseReentrySequence, '打开失败租约释放');
          if (!released) cleanupErrors.push(new Error('Learning lease未确认释放。'));
        } catch (cleanupError) {
          cleanupErrors.push(normalizeThrownError(cleanupError, 'Learning lease释放失败'));
        }
        const combinedFailure = combineCleanupFailure(
          failure,
          cleanupErrors,
          'Learning Repository打开失败且租约清理未完成。',
        );
        if (cleanupErrors.length > 0) {
          this.#state = 'failed';
          const indeterminate = new ArenaV2LearningProfileIndeterminateWriteError(
            'Learning Repository打开失败且租约清理债务未确认。',
          );
          indeterminate.cause = combinedFailure;
          throw indeterminate;
        }
        throw combinedFailure;
      }
    });
  }

  getSnapshot(): ArenaV2LearningProfileV1 {
    return this.#runOperation('snapshot-read', () => {
      this.#openState();
      return this.#profileValue();
    });
  }

  getDiagnostics(): Readonly<ArenaV2LearningProfileRepositoryDiagnosticsV1> {
    return this.#runOperation('diagnostics-read', () => {
      if (this.#state === 'destroyed') throw new Error('Learning Repository已销毁。');
      return this.#diagnostics;
    });
  }

  getStorageKeys(): Readonly<ArenaV2LearningProfileStorageKeysV1> {
    return this.#runOperation('storage-keys-read', () => {
      if (this.#state === 'destroyed') throw new Error('Learning Repository已销毁。');
      return this.#keyValue();
    });
  }

  renewLease(): boolean {
    return this.#runOperation('renew-lease', () => {
      this.#openState();
      try {
        const renewReentrySequence = this.#reentrySequence;
        const renewed = this.#leaseValue().renew();
        this.#assertNoReentrySince(renewReentrySequence, '租约续租');
        if (renewed) return true;
        const heldReentrySequence = this.#reentrySequence;
        this.#leaseValue().assertHeld();
        this.#assertNoReentrySince(heldReentrySequence, '租约持有复核');
        return false;
      } catch (error) {
        return this.#indeterminate('Learning Profile租约无法确认，仓储停止写入。', error);
      }
    });
  }

  compareAndSet(
    nextValue: unknown,
    expectedRevisionValue: unknown,
  ): ArenaV2LearningProfileCommitResultV1 {
    return this.#runOperation('compare-and-set', () => {
      this.#openState();
      const current = this.#profileValue();
      const expectedRevision = assertIntegerAtLeast(
        expectedRevisionValue,
        0,
        'Learning Repository expectedRevision',
      );
      if (current.revision !== expectedRevision) return failure('memory-revision-mismatch');
      const next = createArenaV2LearningProfileV1(this.#definitionValue(), nextValue);
      if (next.revision !== expectedRevision + 1) {
        throw new RangeError('Learning Profile下一revision必须恰好递增1。');
      }
      try {
        const heldReentrySequence = this.#reentrySequence;
        this.#leaseValue().assertHeld();
        this.#assertNoReentrySince(heldReentrySequence, 'CAS租约复核');
      } catch (error) {
        return this.#indeterminate('Learning Profile租约已失效，仓储停止写入。', error);
      }
      let stored: StoredProfile;
      try {
        const loadReentrySequence = this.#reentrySequence;
        const loaded = this.#loadStored();
        this.#assertNoReentrySince(loadReentrySequence, 'CAS基线读档');
        stored = loaded.stored ?? this.#defaultStored();
        this.#diagnostics = loaded.diagnostics;
      } catch (error) {
        if (error instanceof ArenaV2LearningProfileFutureSchemaError
          || error instanceof ArenaV2LearningProfileSaveConflictError) {
          this.#state = 'failed';
        }
        throw error;
      }
      if (!same(stored, {
        slot: null,
        profile: current,
        envelope: this.#envelopeValue(),
        migrated: false,
      })) return failure('storage-revision-mismatch');

      const targetSlot = stored.slot === SLOT.A ? SLOT.B : SLOT.A;
      const storageKeys = this.#keyValue();
      const targetKey = targetSlot === SLOT.A ? storageKeys.slotA : storageKeys.slotB;
      const envelope = createArenaV2LearningProfileSaveEnvelopeV1(this.#definitionValue(), next);
      let writeReported: boolean | null = null;
      const writeReentrySequence = this.#reentrySequence;
      try {
        writeReported = this.#storageValue().write(targetKey, envelope);
      } catch {
        // Read-back decides whether a host mutated before throwing.
      }
      let confirmed: SlotRead;
      const readbackReentrySequence = this.#reentrySequence;
      try {
        confirmed = this.#readSlot(targetKey, targetSlot);
        this.#assertNoReentrySince(readbackReentrySequence, '新槽读回');
      } catch (error) {
        this.#assertNoReentrySince(readbackReentrySequence, '新槽读回');
        if (error instanceof ArenaV2LearningProfileFutureSchemaError) {
          this.#state = 'failed';
          throw error;
        }
        const rollbackReentrySequence = this.#reentrySequence;
        const rolledBack = this.#rollback(targetKey);
        this.#assertNoReentrySince(rollbackReentrySequence, '新槽回滚');
        if (rolledBack) {
          return failure(writeReported === true ? 'slot-readback-failed' : 'slot-write-failed');
        }
        return this.#indeterminate('Learning Profile新槽读取失败且无法回滚。', error);
      }
      if (confirmed.kind !== 'valid'
        || confirmed.envelope.payloadHash !== envelope.payloadHash
        || confirmed.profile.revision !== next.revision) {
        this.#assertNoReentrySince(writeReentrySequence, '新槽写入');
        if (confirmed.kind === 'valid'
          && (writeReported === true || confirmed.profile.revision > stored.profile.revision)) {
          return this.#indeterminate('Learning Profile新槽出现其他有效generation。');
        }
        return failure(writeReported === true ? 'slot-readback-failed' : 'slot-write-failed');
      }
      if (this.#reentrySequence !== writeReentrySequence) {
        this.#profile = confirmed.profile;
        this.#envelope = confirmed.envelope;
        this.#assertNoReentrySince(writeReentrySequence, '新槽写入');
      }
      let headUpdated = false;
      const headWriteReentrySequence = this.#reentrySequence;
      try {
        headUpdated = this.#storageValue().write(storageKeys.head, targetSlot);
      } catch {
        headUpdated = false;
      }
      this.#profile = confirmed.profile;
      this.#envelope = confirmed.envelope;
      this.#assertNoReentrySince(headWriteReentrySequence, 'head写入');
      return Object.freeze({ committed: true, reason: null, headUpdated });
    });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#state === 'destroyed') return;
      this.#state = 'failed';
      const destroyReentrySequence = this.#reentrySequence;
      try {
        this.#leaseValue().destroy();
      } catch (error) {
        this.#assertNoReentrySince(destroyReentrySequence, '销毁');
        throw error;
      }
      this.#definition = null;
      this.#migrationRegistry = null;
      this.#storage = null;
      this.#lease = null;
      this.#keys = null;
      this.#profile = null;
      this.#envelope = null;
      this.#state = 'destroyed';
      this.#assertNoReentrySince(destroyReentrySequence, '销毁发布', true);
    });
  }
}
