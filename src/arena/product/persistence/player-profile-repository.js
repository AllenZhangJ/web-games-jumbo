import {
  assertIntegerAtLeast,
  assertNonEmptyString,
} from '../../rules/definition-utils.js';
import {
  combineCleanupFailure,
  normalizeThrownError,
} from '../../lifecycle-error.js';
import { createSynchronousStoragePort } from '../../storage/synchronous-storage-port.js';
import { SynchronousStorageLease } from '../../storage/synchronous-storage-lease.js';
import { createPlayerProfile } from '../profile/player-profile.js';
import { createPlayerProfileDefinition } from '../profile/player-profile-definition.js';
import {
  assertPlayerProfileSaveEnvelopeHasNoFutureSchema,
  createPlayerProfileSaveEnvelope,
  validatePlayerProfileSaveEnvelope,
} from './player-profile-save-envelope.js';
import {
  PlayerProfileFutureSchemaError,
  PlayerProfileIndeterminateWriteError,
  PlayerProfileRepositoryBusyError,
  PlayerProfileSaveConflictError,
} from './profile-persistence-errors.js';
import { createSaveMigrationRegistry } from './save-migration-registry.js';

const SLOT = Object.freeze({ A: 'a', B: 'b' });

function createKeys(definition, keyPrefixValue) {
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

function sameStoredSnapshot(left, right) {
  return left.profile.revision === right.profile.revision
    && left.envelope.payloadHash === right.envelope.payloadHash;
}

function createDiagnostics({ slots, head, recoveredDefault }) {
  return Object.freeze({
    missingSlots: slots.filter(({ kind }) => kind === 'missing').length,
    invalidSlots: slots.filter(({ kind }) => kind === 'invalid').length,
    migratedSlots: slots.filter(({ kind, migrated }) => kind === 'valid' && migrated).length,
    headReadable: head.readable,
    headValid: head.valid,
    recoveredDefault,
  });
}

export class PlayerProfileRepository {
  #definition;
  #migrationRegistry;
  #storage;
  #lease;
  #keys;
  #profile;
  #envelope;
  #diagnostics;
  #state;
  #writing;

  constructor({
    definition: definitionValue,
    migrationRegistry: migrationRegistryValue,
    storage,
    ownerId,
    leaseHolderId = ownerId,
    wallNow,
    leaseDurationMs = 60_000,
    leaseTakeoverSameOwner = false,
    keyPrefix,
  }) {
    const definition = createPlayerProfileDefinition(definitionValue);
    const migrationRegistry = createSaveMigrationRegistry(
      migrationRegistryValue ?? {
        currentVersion: definition.currentProfileSchemaVersion,
        migrations: [],
      },
    );
    if (migrationRegistry.getCurrentVersion() !== definition.currentProfileSchemaVersion) {
      throw new RangeError('PlayerProfileRepository MigrationRegistry schema 不匹配。');
    }
    this.#definition = definition;
    this.#migrationRegistry = migrationRegistry;
    this.#storage = createSynchronousStoragePort(storage, { label: 'PlayerProfile Storage' });
    this.#keys = createKeys(definition, keyPrefix);
    this.#lease = new SynchronousStorageLease({
      storage,
      key: this.#keys.lease,
      ownerId,
      holderId: leaseHolderId,
      wallNow,
      durationMs: leaseDurationMs,
      takeoverSameOwner: leaseTakeoverSameOwner,
      label: 'PlayerProfile Lease',
    });
    this.#profile = null;
    this.#envelope = null;
    this.#diagnostics = Object.freeze({
      missingSlots: 2,
      invalidSlots: 0,
      migratedSlots: 0,
      headReadable: true,
      headValid: true,
      recoveredDefault: false,
    });
    this.#state = 'created';
    this.#writing = false;
    Object.freeze(this);
  }

  #assertOpen() {
    if (this.#state === 'destroyed') throw new Error('PlayerProfileRepository 已销毁。');
    if (this.#state === 'failed') {
      throw new PlayerProfileIndeterminateWriteError('PlayerProfileRepository 已进入失败关闭状态。');
    }
    if (this.#state !== 'open') throw new Error('PlayerProfileRepository 尚未打开。');
    if (this.#writing) throw new Error('PlayerProfileRepository 写入不可重入。');
  }

  #readSlot(key, slot) {
    const result = this.#storage.read(key);
    if (!result.ok) throw new Error(`PlayerProfile ${slot} 槽读取失败。`);
    if (!result.found) return Object.freeze({ kind: 'missing', slot });
    try {
      const validated = validatePlayerProfileSaveEnvelope(
        this.#definition,
        this.#migrationRegistry,
        result.value,
      );
      return Object.freeze({ kind: 'valid', slot, ...validated });
    } catch (error) {
      try {
        assertPlayerProfileSaveEnvelopeHasNoFutureSchema(this.#definition, result.value);
      } catch (compatibilityError) {
        compatibilityError.cause = error;
        throw compatibilityError;
      }
      return Object.freeze({ kind: 'invalid', slot });
    }
  }

  #readHead() {
    let result;
    try {
      result = this.#storage.read(this.#keys.head);
    } catch {
      return Object.freeze({ readable: false, value: null, valid: false });
    }
    if (!result.ok) return Object.freeze({ readable: false, value: null, valid: false });
    if (!result.found) return Object.freeze({ readable: true, value: null, valid: true });
    const valid = result.value === SLOT.A || result.value === SLOT.B;
    return Object.freeze({ readable: true, value: valid ? result.value : null, valid });
  }

  #loadStored() {
    const slots = [
      this.#readSlot(this.#keys.slotA, SLOT.A),
      this.#readSlot(this.#keys.slotB, SLOT.B),
    ];
    const head = this.#readHead();
    const valid = slots.filter(({ kind }) => kind === 'valid');
    this.#diagnostics = createDiagnostics({
      slots,
      head,
      recoveredDefault: valid.length === 0,
    });
    if (valid.length === 0) return null;
    valid.sort((left, right) => right.profile.revision - left.profile.revision);
    if (
      valid.length === 2
      && valid[0].profile.revision === valid[1].profile.revision
      && valid[0].envelope.payloadHash !== valid[1].envelope.payloadHash
    ) throw new PlayerProfileSaveConflictError();
    if (valid.length === 2 && valid[0].profile.revision === valid[1].profile.revision) {
      return valid.find(({ slot }) => slot === head.value) ?? valid[0];
    }
    return valid[0];
  }

  #defaultStored() {
    const profile = createPlayerProfile(this.#definition);
    return Object.freeze({
      slot: null,
      profile,
      envelope: createPlayerProfileSaveEnvelope(this.#definition, profile),
      migrated: false,
    });
  }

  #rollbackUnconfirmedSlot(key) {
    let deleted = false;
    try {
      deleted = this.#storage.delete(key);
      if (!deleted) return false;
      const result = this.#storage.read(key);
      return result.ok && !result.found;
    } catch {
      return false;
    }
  }

  #failIndeterminate(message) {
    this.#state = 'failed';
    throw new PlayerProfileIndeterminateWriteError(message);
  }

  open() {
    if (this.#state === 'destroyed') throw new Error('PlayerProfileRepository 已销毁。');
    if (this.#state === 'failed') throw new PlayerProfileIndeterminateWriteError();
    if (this.#state === 'open') return this.#profile;
    if (!this.#lease.acquire()) throw new PlayerProfileRepositoryBusyError();
    try {
      const stored = this.#loadStored() ?? this.#defaultStored();
      this.#profile = stored.profile;
      this.#envelope = stored.envelope;
      this.#state = 'open';
      return this.#profile;
    } catch (error) {
      const failure = normalizeThrownError(error, 'PlayerProfileRepository 打开失败');
      const cleanupErrors = [];
      try {
        if (!this.#lease.release()) cleanupErrors.push(new Error('PlayerProfile lease 未确认释放。'));
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      throw combineCleanupFailure(
        failure,
        cleanupErrors,
        'PlayerProfileRepository 打开失败且租约清理未完成。',
      );
    }
  }

  getSnapshot() {
    this.#assertOpen();
    return this.#profile;
  }

  getDiagnostics() {
    if (this.#state === 'destroyed') throw new Error('PlayerProfileRepository 已销毁。');
    return this.#diagnostics;
  }

  getStorageKeys() {
    if (this.#state === 'destroyed') throw new Error('PlayerProfileRepository 已销毁。');
    return this.#keys;
  }

  renewLease() {
    this.#assertOpen();
    let renewalError = null;
    try {
      if (this.#lease.renew()) return true;
    } catch (error) {
      renewalError = error;
    }
    try {
      this.#lease.assertHeld();
    } catch (verificationError) {
      this.#state = 'failed';
      const failure = new PlayerProfileIndeterminateWriteError(
        'PlayerProfile 租约已过期、被取代或无法确认，仓储已关闭写入。',
      );
      failure.cause = renewalError ?? verificationError;
      if (renewalError !== null) failure.verificationError = verificationError;
      throw failure;
    }
    if (renewalError !== null) throw renewalError;
    return false;
  }

  compareAndSet(nextValue, expectedRevisionValue) {
    this.#assertOpen();
    const expectedRevision = assertIntegerAtLeast(
      expectedRevisionValue,
      0,
      'PlayerProfileRepository.expectedRevision',
    );
    if (expectedRevision !== this.#profile.revision) {
      return Object.freeze({
        committed: false,
        reason: 'memory-revision-mismatch',
        headUpdated: false,
      });
    }
    const next = createPlayerProfile(this.#definition, nextValue);
    if (next.revision !== expectedRevision + 1) {
      throw new RangeError('PlayerProfile 下一 revision 必须恰好递增 1。');
    }
    this.#writing = true;
    try {
      this.#lease.assertHeld();
      const currentStored = this.#loadStored() ?? this.#defaultStored();
      if (!sameStoredSnapshot(currentStored, {
        profile: this.#profile,
        envelope: this.#envelope,
      })) {
        return Object.freeze({
          committed: false,
          reason: 'storage-revision-mismatch',
          headUpdated: false,
        });
      }
      const targetSlot = currentStored.slot === SLOT.A ? SLOT.B : SLOT.A;
      const targetKey = targetSlot === SLOT.A ? this.#keys.slotA : this.#keys.slotB;
      const envelope = createPlayerProfileSaveEnvelope(this.#definition, next);
      let writeReported = null;
      try {
        writeReported = this.#storage.write(targetKey, envelope);
      } catch {
        // A host can throw after mutating storage. Read-back remains the only
        // authority for deciding whether the new generation was committed.
      }

      let confirmed;
      try {
        confirmed = this.#readSlot(targetKey, targetSlot);
      } catch (error) {
        if (error instanceof PlayerProfileFutureSchemaError) {
          this.#state = 'failed';
          throw error;
        }
        if (this.#rollbackUnconfirmedSlot(targetKey)) {
          return Object.freeze({
            committed: false,
            reason: writeReported === true ? 'slot-readback-failed' : 'slot-write-failed',
            headUpdated: false,
          });
        }
        return this.#failIndeterminate('PlayerProfile 新槽读取失败且无法回滚。');
      }
      if (
        confirmed.kind !== 'valid'
        || confirmed.envelope.payloadHash !== envelope.payloadHash
        || confirmed.profile.revision !== next.revision
      ) {
        if (confirmed.kind === 'valid' && (
          writeReported === true
          || confirmed.profile.revision > currentStored.profile.revision
        )) {
          return this.#failIndeterminate('PlayerProfile 新槽出现其他有效 generation。');
        }
        return Object.freeze({
          committed: false,
          reason: writeReported === true ? 'slot-readback-failed' : 'slot-write-failed',
          headUpdated: false,
        });
      }

      let headUpdated = false;
      try {
        headUpdated = this.#storage.write(this.#keys.head, targetSlot);
      } catch {
        headUpdated = false;
      }
      this.#profile = confirmed.profile;
      this.#envelope = confirmed.envelope;
      return Object.freeze({ committed: true, reason: null, headUpdated });
    } finally {
      this.#writing = false;
    }
  }

  destroy() {
    if (this.#state === 'destroyed') return;
    if (this.#writing) throw new Error('写入期间不能销毁 PlayerProfileRepository。');
    this.#lease.destroy();
    this.#definition = null;
    this.#migrationRegistry = null;
    this.#storage = null;
    this.#lease = null;
    this.#keys = null;
    this.#profile = null;
    this.#envelope = null;
    this.#state = 'destroyed';
  }
}
