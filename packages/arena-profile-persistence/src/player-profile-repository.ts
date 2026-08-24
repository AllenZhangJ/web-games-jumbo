import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  combineCleanupFailure,
  createSynchronousStoragePort,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import type {
  SynchronousStoragePort,
} from '@number-strategy-jump/arena-contracts';
import {
  PlayerProfileFutureSchemaError,
  PlayerProfileIndeterminateWriteError,
  PlayerProfileRepositoryBusyError,
  PlayerProfileSaveConflictError,
  assertPlayerProfileSaveEnvelopeHasNoFutureSchema,
  createPlayerProfile,
  createPlayerProfileDefinition,
  createPlayerProfileSaveEnvelope,
  createSaveMigrationRegistry,
  validatePlayerProfileSaveEnvelope,
} from '@number-strategy-jump/arena-profile-contracts';
import type {
  PlayerProfile,
  PlayerProfileDefinition,
  PlayerProfileSaveEnvelope,
  SaveMigrationRegistry,
  ValidatedPlayerProfileSaveEnvelope,
} from '@number-strategy-jump/arena-profile-contracts';
import { SynchronousStorageLease } from '@number-strategy-jump/arena-storage';

type Slot = 'a' | 'b';
type RepositoryState = 'created' | 'open' | 'failed' | 'destroyed';
type PlayerProfileRepositoryOperation =
  | 'open'
  | 'snapshot-read'
  | 'diagnostics-read'
  | 'storage-keys-read'
  | 'renew-lease'
  | 'compare-and-set'
  | 'destroy';

export interface PlayerProfileRepositoryOptions {
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

export interface PlayerProfileStorageKeys {
  readonly slotA: string;
  readonly slotB: string;
  readonly head: string;
  readonly lease: string;
}

export interface PlayerProfileRepositoryDiagnostics {
  readonly missingSlots: number;
  readonly invalidSlots: number;
  readonly migratedSlots: number;
  readonly headReadable: boolean;
  readonly headValid: boolean;
  readonly recoveredDefault: boolean;
}

export type PlayerProfileCommitFailureReason =
  | 'memory-revision-mismatch'
  | 'storage-revision-mismatch'
  | 'slot-readback-failed'
  | 'slot-write-failed';

export type PlayerProfileCommitResult = Readonly<
  | {
    readonly committed: true;
    readonly reason: null;
    readonly headUpdated: boolean;
  }
  | {
    readonly committed: false;
    readonly reason: PlayerProfileCommitFailureReason;
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

interface MissingSlot {
  readonly kind: 'missing';
  readonly slot: Slot;
}

interface InvalidSlot {
  readonly kind: 'invalid';
  readonly slot: Slot;
}

interface ValidSlot extends ValidatedPlayerProfileSaveEnvelope {
  readonly kind: 'valid';
  readonly slot: Slot;
}

type SlotRead = MissingSlot | InvalidSlot | ValidSlot;

interface HeadRead {
  readonly readable: boolean;
  readonly value: Slot | null;
  readonly valid: boolean;
}

interface StoredProfile {
  readonly slot: Slot | null;
  readonly profile: PlayerProfile;
  readonly envelope: PlayerProfileSaveEnvelope;
  readonly migrated: boolean;
}

interface LeaseStorageHost {
  storageRead(key: string): ReturnType<SynchronousStoragePort['read']>;
  storageWrite(key: string, data: unknown): boolean;
  storageDelete(key: string): boolean;
}

const SLOT = Object.freeze({ A: 'a' as const, B: 'b' as const });
const OPTION_KEYS = new Set([
  'definition',
  'migrationRegistry',
  'storage',
  'ownerId',
  'leaseHolderId',
  'wallNow',
  'leaseDurationMs',
  'leaseTakeoverSameOwner',
  'keyPrefix',
]);
const REQUIRED_OPTION_KEYS = Object.freeze([
  'definition',
  'storage',
  'ownerId',
  'wallNow',
] as const);

function descriptorValue(
  descriptors: Record<string, PropertyDescriptor>,
  key: string,
  fallback?: unknown,
): unknown {
  const descriptor = descriptors[key];
  return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ? descriptor.value
    : fallback;
}

function normalizeOptions(value: unknown): NormalizedOptions {
  assertKnownKeys(value, OPTION_KEYS, 'PlayerProfileRepository options');
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  for (const key of REQUIRED_OPTION_KEYS) {
    if (!descriptors[key]) {
      throw new TypeError(`PlayerProfileRepository options.${key} 必须是可枚举数据字段。`);
    }
  }
  const ownerId = descriptorValue(descriptors, 'ownerId');
  return Object.freeze({
    definition: descriptorValue(descriptors, 'definition'),
    migrationRegistry: descriptorValue(descriptors, 'migrationRegistry', null),
    storage: descriptorValue(descriptors, 'storage'),
    ownerId,
    leaseHolderId: descriptorValue(descriptors, 'leaseHolderId', ownerId),
    wallNow: descriptorValue(descriptors, 'wallNow'),
    leaseDurationMs: descriptorValue(descriptors, 'leaseDurationMs', 60_000),
    leaseTakeoverSameOwner: descriptorValue(
      descriptors,
      'leaseTakeoverSameOwner',
      false,
    ),
    keyPrefix: descriptorValue(descriptors, 'keyPrefix', null),
  });
}

function createKeys(
  definition: PlayerProfileDefinition,
  keyPrefixValue: unknown,
): Readonly<PlayerProfileStorageKeys> {
  const prefix = assertNonEmptyString(
    keyPrefixValue ?? `arena.player-profile.${definition.id}`,
    'PlayerProfileRepository.keyPrefix',
  );
  return Object.freeze({
    slotA: `${prefix}.slot-a`,
    slotB: `${prefix}.slot-b`,
    head: `${prefix}.head`,
    lease: `${prefix}.lease`,
  });
}

function sameStoredSnapshot(left: StoredProfile, right: StoredProfile): boolean {
  return left.profile.revision === right.profile.revision
    && left.envelope.payloadHash === right.envelope.payloadHash;
}

function isValidSlot(value: SlotRead): value is ValidSlot {
  return value.kind === 'valid';
}

function createDiagnostics(
  slots: readonly SlotRead[],
  head: HeadRead,
  recoveredDefault: boolean,
): Readonly<PlayerProfileRepositoryDiagnostics> {
  return Object.freeze({
    missingSlots: slots.filter(({ kind }) => kind === 'missing').length,
    invalidSlots: slots.filter(({ kind }) => kind === 'invalid').length,
    migratedSlots: slots.filter(isValidSlot).filter(({ migrated }) => migrated).length,
    headReadable: head.readable,
    headValid: head.valid,
    recoveredDefault,
  });
}

function commitFailure(reason: PlayerProfileCommitFailureReason): PlayerProfileCommitResult {
  return Object.freeze({ committed: false, reason, headUpdated: false });
}

function createLeaseStorageHost(
  storage: Readonly<SynchronousStoragePort>,
): Readonly<LeaseStorageHost> {
  return Object.freeze({
    storageRead: (key: string) => storage.read(key),
    storageWrite: (key: string, data: unknown) => storage.write(key, data),
    storageDelete: (key: string) => storage.delete(key),
  });
}

export class PlayerProfileRepository {
  #definition: PlayerProfileDefinition | null;
  #migrationRegistry: SaveMigrationRegistry | null;
  #storage: Readonly<SynchronousStoragePort> | null;
  #lease: SynchronousStorageLease | null;
  #keys: Readonly<PlayerProfileStorageKeys> | null;
  #profile: PlayerProfile | null = null;
  #envelope: PlayerProfileSaveEnvelope | null = null;
  #diagnostics: Readonly<PlayerProfileRepositoryDiagnostics> = Object.freeze({
    missingSlots: 2,
    invalidSlots: 0,
    migratedSlots: 0,
    headReadable: true,
    headValid: true,
    recoveredDefault: false,
  });
  #state: RepositoryState = 'created';
  #operation: PlayerProfileRepositoryOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(options: PlayerProfileRepositoryOptions) {
    const normalized = normalizeOptions(options);
    const definition = createPlayerProfileDefinition(normalized.definition);
    const migrationRegistry = createSaveMigrationRegistry(
      normalized.migrationRegistry ?? {
        currentVersion: definition.currentProfileSchemaVersion,
        migrations: [],
      },
    );
    if (migrationRegistry.getCurrentVersion() !== definition.currentProfileSchemaVersion) {
      throw new RangeError('PlayerProfileRepository MigrationRegistry schema 不匹配。');
    }
    if (typeof normalized.wallNow !== 'function') throw new TypeError('wallNow 必须是函数。');
    this.#definition = definition;
    this.#migrationRegistry = migrationRegistry;
    const storage = createSynchronousStoragePort(normalized.storage, {
      label: 'PlayerProfile Storage',
    });
    this.#storage = storage;
    this.#keys = createKeys(definition, normalized.keyPrefix);
    this.#lease = new SynchronousStorageLease({
      storage: createLeaseStorageHost(storage),
      key: this.#keys.lease,
      ownerId: assertNonEmptyString(
        normalized.ownerId,
        'PlayerProfileRepository.ownerId',
      ),
      holderId: assertNonEmptyString(
        normalized.leaseHolderId,
        'PlayerProfileRepository.leaseHolderId',
      ),
      wallNow: normalized.wallNow as () => number,
      durationMs: assertIntegerAtLeast(
        normalized.leaseDurationMs,
        1000,
        'PlayerProfileRepository.leaseDurationMs',
      ),
      takeoverSameOwner: normalized.leaseTakeoverSameOwner as boolean,
      label: 'PlayerProfile Lease',
    });
    Object.freeze(this);
  }

  #rejectReentry(operation: PlayerProfileRepositoryOperation): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `PlayerProfileRepository 操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw error;
  }

  #runOperation<T>(operation: PlayerProfileRepositoryOperation, callback: () => T): T {
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
    if (this.#reentrySequence === sequence) return;
    if (!preserveState) {
      this.#failIndeterminate(
        `PlayerProfileRepository ${operation}期间发生重入。`,
        this.#reentryError ?? undefined,
      );
    }
    const failure = new PlayerProfileIndeterminateWriteError(
      `PlayerProfileRepository ${operation}期间发生重入。`,
    );
    if (this.#reentryError !== null) failure.cause = this.#reentryError;
    throw failure;
  }

  #assertOpen(): void {
    if (this.#state === 'destroyed') throw new Error('PlayerProfileRepository 已销毁。');
    if (this.#state === 'failed') {
      throw new PlayerProfileIndeterminateWriteError(
        'PlayerProfileRepository 已进入失败关闭状态。',
      );
    }
    if (this.#state !== 'open') throw new Error('PlayerProfileRepository 尚未打开。');
  }

  #requireDefinition(): PlayerProfileDefinition {
    if (!this.#definition) throw new Error('PlayerProfileRepository 已销毁。');
    return this.#definition;
  }

  #requireMigrationRegistry(): SaveMigrationRegistry {
    if (!this.#migrationRegistry) throw new Error('PlayerProfileRepository 已销毁。');
    return this.#migrationRegistry;
  }

  #requireStorage(): Readonly<SynchronousStoragePort> {
    if (!this.#storage) throw new Error('PlayerProfileRepository 已销毁。');
    return this.#storage;
  }

  #requireLease(): SynchronousStorageLease {
    if (!this.#lease) throw new Error('PlayerProfileRepository 已销毁。');
    return this.#lease;
  }

  #requireKeys(): Readonly<PlayerProfileStorageKeys> {
    if (!this.#keys) throw new Error('PlayerProfileRepository 已销毁。');
    return this.#keys;
  }

  #requireProfile(): PlayerProfile {
    if (!this.#profile) throw new Error('PlayerProfileRepository 尚未打开。');
    return this.#profile;
  }

  #requireEnvelope(): PlayerProfileSaveEnvelope {
    if (!this.#envelope) throw new Error('PlayerProfileRepository 尚未打开。');
    return this.#envelope;
  }

  #readSlot(key: string, slot: Slot): SlotRead {
    const readReentrySequence = this.#reentrySequence;
    const result = this.#requireStorage().read(key);
    this.#assertNoReentrySince(readReentrySequence, `${slot}槽读取`);
    if (!result.ok) throw new Error(`PlayerProfile ${slot} 槽读取失败。`);
    if (!result.found) return Object.freeze({ kind: 'missing', slot });
    try {
      const validated = validatePlayerProfileSaveEnvelope(
        this.#requireDefinition(),
        this.#requireMigrationRegistry(),
        result.value,
      );
      return Object.freeze({ kind: 'valid', slot, ...validated });
    } catch (error) {
      try {
        assertPlayerProfileSaveEnvelopeHasNoFutureSchema(
          this.#requireDefinition(),
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
    let result;
    try {
      result = this.#requireStorage().read(this.#requireKeys().head);
    } catch {
      this.#assertNoReentrySince(readReentrySequence, 'head读取');
      return Object.freeze({ readable: false, value: null, valid: false });
    }
    this.#assertNoReentrySince(readReentrySequence, 'head读取');
    if (!result.ok) return Object.freeze({ readable: false, value: null, valid: false });
    if (!result.found) return Object.freeze({ readable: true, value: null, valid: true });
    const valid = result.value === SLOT.A || result.value === SLOT.B;
    return Object.freeze({
      readable: true,
      value: valid ? result.value as Slot : null,
      valid,
    });
  }

  #loadStored(): StoredProfile | null {
    const keys = this.#requireKeys();
    const slots: readonly SlotRead[] = [
      this.#readSlot(keys.slotA, SLOT.A),
      this.#readSlot(keys.slotB, SLOT.B),
    ];
    const head = this.#readHead();
    const valid = slots.filter(isValidSlot);
    this.#diagnostics = createDiagnostics(slots, head, valid.length === 0);
    if (valid.length === 0) return null;
    valid.sort((left, right) => right.profile.revision - left.profile.revision);
    const first = valid[0];
    if (!first) return null;
    const second = valid[1];
    if (
      second
      && first.profile.revision === second.profile.revision
      && first.envelope.payloadHash !== second.envelope.payloadHash
    ) throw new PlayerProfileSaveConflictError();
    if (second && first.profile.revision === second.profile.revision) {
      return valid.find(({ slot }) => slot === head.value) ?? first;
    }
    return first;
  }

  #defaultStored(): StoredProfile {
    const definition = this.#requireDefinition();
    const profile = createPlayerProfile(definition);
    return Object.freeze({
      slot: null,
      profile,
      envelope: createPlayerProfileSaveEnvelope(definition, profile),
      migrated: false,
    });
  }

  #rollbackUnconfirmedSlot(key: string): boolean {
    try {
      try {
        this.#requireStorage().delete(key);
      } catch {
        // Deletion can complete before a host throws. Read-back is authority.
      }
      const result = this.#requireStorage().read(key);
      return result.ok && !result.found;
    } catch {
      return false;
    }
  }

  #failIndeterminate(message: string, cause?: unknown): never {
    this.#state = 'failed';
    const failure = new PlayerProfileIndeterminateWriteError(message);
    if (cause !== undefined) failure.cause = cause;
    throw failure;
  }

  open(): PlayerProfile {
    return this.#runOperation('open', () => {
      if (this.#state === 'destroyed') throw new Error('PlayerProfileRepository 已销毁。');
      if (this.#state === 'failed') throw new PlayerProfileIndeterminateWriteError();
      if (this.#state === 'open') return this.#requireProfile();
      const acquireReentrySequence = this.#reentrySequence;
      let acquired: boolean;
      try {
        acquired = this.#requireLease().acquire();
      } catch (error) {
        this.#assertNoReentrySince(acquireReentrySequence, '租约获取');
        let leaseFailedClosed = true;
        try {
          leaseFailedClosed = this.#requireLease().isFailedClosed();
        } catch {
          // An unreadable lease lifecycle cannot be reused safely.
        }
        if (leaseFailedClosed) {
          return this.#failIndeterminate(
            'PlayerProfileRepository 租约获取事务已失败关闭。',
            error,
          );
        }
        throw error;
      }
      if (!acquired) {
        this.#assertNoReentrySince(acquireReentrySequence, '租约获取');
        throw new PlayerProfileRepositoryBusyError();
      }
      try {
        this.#assertNoReentrySince(acquireReentrySequence, '租约获取');
        const loadReentrySequence = this.#reentrySequence;
        const stored = this.#loadStored() ?? this.#defaultStored();
        this.#assertNoReentrySince(loadReentrySequence, '打开读档');
        this.#profile = stored.profile;
        this.#envelope = stored.envelope;
        this.#state = 'open';
        return stored.profile;
      } catch (error) {
        if (error instanceof PlayerProfileFutureSchemaError
          || error instanceof PlayerProfileSaveConflictError) {
          this.#state = 'failed';
        }
        const failure = normalizeThrownError(error, 'PlayerProfileRepository 打开失败');
        const cleanupErrors: Error[] = [];
        try {
          const releaseReentrySequence = this.#reentrySequence;
          const released = this.#requireLease().release();
          this.#assertNoReentrySince(releaseReentrySequence, '打开失败租约释放');
          if (!released) {
            cleanupErrors.push(new Error('PlayerProfile lease 未确认释放。'));
          }
        } catch (cleanupError) {
          cleanupErrors.push(normalizeThrownError(
            cleanupError,
            'PlayerProfile lease 释放失败',
          ));
        }
        const combinedFailure = combineCleanupFailure(
          failure,
          cleanupErrors,
          'PlayerProfileRepository 打开失败且租约清理未完成。',
        );
        if (cleanupErrors.length > 0) {
          return this.#failIndeterminate(
            'PlayerProfileRepository 打开失败且租约清理债务未确认。',
            combinedFailure,
          );
        }
        throw combinedFailure;
      }
    });
  }

  getSnapshot(): PlayerProfile {
    return this.#runOperation('snapshot-read', () => {
      this.#assertOpen();
      return this.#requireProfile();
    });
  }

  getDiagnostics(): Readonly<PlayerProfileRepositoryDiagnostics> {
    return this.#runOperation('diagnostics-read', () => {
      if (this.#state === 'destroyed') throw new Error('PlayerProfileRepository 已销毁。');
      return this.#diagnostics;
    });
  }

  getStorageKeys(): Readonly<PlayerProfileStorageKeys> {
    return this.#runOperation('storage-keys-read', () => {
      if (this.#state === 'destroyed') throw new Error('PlayerProfileRepository 已销毁。');
      return this.#requireKeys();
    });
  }

  renewLease(): boolean {
    return this.#runOperation('renew-lease', () => {
      this.#assertOpen();
      let renewalError: unknown = null;
      const renewReentrySequence = this.#reentrySequence;
      try {
        const renewed = this.#requireLease().renew();
        this.#assertNoReentrySince(renewReentrySequence, '租约续租');
        if (renewed) return true;
      } catch (error) {
        this.#assertNoReentrySince(renewReentrySequence, '租约续租');
        renewalError = error;
      }
      const heldReentrySequence = this.#reentrySequence;
      try {
        this.#requireLease().assertHeld();
        this.#assertNoReentrySince(heldReentrySequence, '租约持有复核');
      } catch (verificationError) {
        this.#assertNoReentrySince(heldReentrySequence, '租约持有复核');
        const cause = renewalError ?? verificationError;
        const failure = new PlayerProfileIndeterminateWriteError(
          'PlayerProfile 租约已过期或被其他页面取代，或当前状态无法确认，仓储已关闭写入。',
        ) as PlayerProfileIndeterminateWriteError & { verificationError?: unknown };
        failure.cause = cause;
        if (renewalError !== null) failure.verificationError = verificationError;
        this.#state = 'failed';
        throw failure;
      }
      if (renewalError !== null) throw renewalError;
      return false;
    });
  }

  compareAndSet(nextValue: unknown, expectedRevisionValue: unknown): PlayerProfileCommitResult {
    return this.#runOperation('compare-and-set', () => {
      this.#assertOpen();
      const profile = this.#requireProfile();
      const expectedRevision = assertIntegerAtLeast(
        expectedRevisionValue,
        0,
        'PlayerProfileRepository.expectedRevision',
      );
      if (expectedRevision !== profile.revision) {
        return commitFailure('memory-revision-mismatch');
      }
      const next = createPlayerProfile(this.#requireDefinition(), nextValue);
      if (next.revision !== expectedRevision + 1) {
        throw new RangeError('PlayerProfile 下一 revision 必须恰好递增 1。');
      }
      const heldReentrySequence = this.#reentrySequence;
      try {
        this.#requireLease().assertHeld();
        this.#assertNoReentrySince(heldReentrySequence, 'CAS租约复核');
      } catch (error) {
        this.#assertNoReentrySince(heldReentrySequence, 'CAS租约复核');
        return this.#failIndeterminate(
          'PlayerProfile 租约已过期或被其他页面取代，或当前状态无法确认，仓储已关闭写入。',
          error,
        );
      }
      let currentStored: StoredProfile;
      const loadReentrySequence = this.#reentrySequence;
      try {
        currentStored = this.#loadStored() ?? this.#defaultStored();
        this.#assertNoReentrySince(loadReentrySequence, 'CAS基线读档');
      } catch (error) {
        if (
          error instanceof PlayerProfileFutureSchemaError
          || error instanceof PlayerProfileSaveConflictError
        ) this.#state = 'failed';
        throw error;
      }
      const currentMemory: StoredProfile = {
        slot: null,
        profile,
        envelope: this.#requireEnvelope(),
        migrated: false,
      };
      if (!sameStoredSnapshot(currentStored, currentMemory)) {
        return commitFailure('storage-revision-mismatch');
      }
      const targetSlot = currentStored.slot === SLOT.A ? SLOT.B : SLOT.A;
      const keys = this.#requireKeys();
      const targetKey = targetSlot === SLOT.A ? keys.slotA : keys.slotB;
      const envelope = createPlayerProfileSaveEnvelope(this.#requireDefinition(), next);
      let writeReported: boolean | null = null;
      const writeReentrySequence = this.#reentrySequence;
      try {
        writeReported = this.#requireStorage().write(targetKey, envelope);
      } catch {
        // A host can throw after mutation. Read-back decides the outcome.
      }

      let confirmed: SlotRead;
      const readbackReentrySequence = this.#reentrySequence;
      try {
        confirmed = this.#readSlot(targetKey, targetSlot);
        this.#assertNoReentrySince(readbackReentrySequence, '新槽读回');
      } catch (error) {
        this.#assertNoReentrySince(readbackReentrySequence, '新槽读回');
        if (error instanceof PlayerProfileFutureSchemaError) {
          this.#state = 'failed';
          throw error;
        }
        const rollbackReentrySequence = this.#reentrySequence;
        const rolledBack = this.#rollbackUnconfirmedSlot(targetKey);
        this.#assertNoReentrySince(rollbackReentrySequence, '新槽回滚');
        if (rolledBack) {
          return commitFailure(
            writeReported === true ? 'slot-readback-failed' : 'slot-write-failed',
          );
        }
        return this.#failIndeterminate(
          'PlayerProfile 新槽读取失败且无法回滚。',
          error,
        );
      }
      if (
        confirmed.kind !== 'valid'
        || confirmed.envelope.payloadHash !== envelope.payloadHash
        || confirmed.profile.revision !== next.revision
      ) {
        this.#assertNoReentrySince(writeReentrySequence, '新槽写入');
        if (
          confirmed.kind === 'valid'
          && (writeReported === true || confirmed.profile.revision > currentStored.profile.revision)
        ) {
          return this.#failIndeterminate('PlayerProfile 新槽出现其他有效 generation。');
        }
        return commitFailure(
          writeReported === true ? 'slot-readback-failed' : 'slot-write-failed',
        );
      }
      if (this.#reentrySequence !== writeReentrySequence) {
        this.#profile = confirmed.profile;
        this.#envelope = confirmed.envelope;
        this.#assertNoReentrySince(writeReentrySequence, '新槽写入');
      }

      let headUpdated = false;
      const headWriteReentrySequence = this.#reentrySequence;
      try {
        headUpdated = this.#requireStorage().write(keys.head, targetSlot);
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
        this.#requireLease().destroy();
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

export const PLAYER_PROFILE_REPOSITORY_OPERATION_POLICY = Object.freeze({
  operationGuardPrecedesStateAndInputValidation: true as const,
  storageAndLeasePortsCheckedBeforeCrossOwnerProgress: true as const,
  durableSlotAndHeadWatermarksPrecedeReentryRejection: true as const,
  publicReadsRejectOperationIntermediateState: true as const,
  destroyWatermarkPrecedesReentryRejection: true as const,
  validationStatus: 'not-run' as const,
});
