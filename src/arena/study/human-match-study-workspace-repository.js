import {
  assertIntegerAtLeast,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import { createSynchronousStoragePort } from '@number-strategy-jump/arena-contracts';
import { SynchronousStorageLease } from '@number-strategy-jump/arena-storage';
import { createHumanMatchStudyDefinition } from '@number-strategy-jump/arena-human-match-study';
import {
  assertHumanMatchStudyWorkspaceEnvelopeHasNoFutureSchema,
  createHumanMatchStudyWorkspaceEnvelope,
  validateHumanMatchStudyWorkspaceEnvelope,
} from './human-match-study-workspace-envelope.js';
import { createHumanMatchStudyWorkspace } from './human-match-study-workspace.js';

const SLOT = Object.freeze({ A: 'a', B: 'b' });

function createKeys(definition, keyPrefixValue) {
  const prefix = assertNonEmptyString(
    keyPrefixValue ?? `arena.human-study.${definition.id}.${definition.getContentHash()}`,
    'HumanMatchStudyWorkspaceRepository.keyPrefix',
  );
  return Object.freeze({
    slotA: `${prefix}.slot-a`,
    slotB: `${prefix}.slot-b`,
    head: `${prefix}.head`,
    lease: `${prefix}.lease`,
  });
}

function sameStoredSnapshot(left, right) {
  return left.workspace.revision === right.workspace.revision
    && left.envelope.payloadHash === right.envelope.payloadHash;
}

export class HumanMatchStudyWorkspaceRepository {
  #definition;
  #storage;
  #lease;
  #keys;
  #workspace;
  #envelope;
  #diagnostics;
  #state;
  #writing;

  constructor({
    definition: definitionValue,
    storage,
    ownerId,
    wallNow,
    leaseDurationMs = 60_000,
    keyPrefix,
  }) {
    const definition = createHumanMatchStudyDefinition(definitionValue);
    this.#definition = definition;
    this.#storage = createSynchronousStoragePort(storage, {
      label: 'Human Match Study Storage',
    });
    this.#keys = createKeys(definition, keyPrefix);
    this.#lease = new SynchronousStorageLease({
      storage,
      key: this.#keys.lease,
      ownerId,
      wallNow,
      durationMs: leaseDurationMs,
      label: 'Human Match Study Lease',
    });
    this.#workspace = null;
    this.#envelope = null;
    this.#diagnostics = Object.freeze({
      missingSlots: 2,
      invalidSlots: 0,
      headReadable: true,
      headValid: true,
      recoveredDefault: false,
    });
    this.#state = 'created';
    this.#writing = false;
    Object.freeze(this);
  }

  #assertOpen() {
    if (this.#state === 'destroyed') {
      throw new Error('HumanMatchStudyWorkspaceRepository 已销毁。');
    }
    if (this.#state === 'failed') {
      throw new Error('HumanMatchStudyWorkspaceRepository 已失败关闭。');
    }
    if (this.#state !== 'open') {
      throw new Error('HumanMatchStudyWorkspaceRepository 尚未打开。');
    }
    if (this.#writing) {
      throw new Error('HumanMatchStudyWorkspaceRepository 写入不可重入。');
    }
  }

  #readSlot(key, slot) {
    const result = this.#storage.read(key);
    if (!result.ok) throw new Error(`Human Match Study ${slot} 槽读取失败。`);
    if (!result.found) return Object.freeze({ kind: 'missing', slot });
    try {
      const validated = validateHumanMatchStudyWorkspaceEnvelope(
        this.#definition,
        result.value,
      );
      return Object.freeze({ kind: 'valid', slot, ...validated });
    } catch (error) {
      try {
        assertHumanMatchStudyWorkspaceEnvelopeHasNoFutureSchema(result.value);
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
    this.#diagnostics = Object.freeze({
      missingSlots: slots.filter(({ kind }) => kind === 'missing').length,
      invalidSlots: slots.filter(({ kind }) => kind === 'invalid').length,
      headReadable: head.readable,
      headValid: head.valid,
      recoveredDefault: valid.length === 0,
    });
    if (valid.length === 0) return null;
    valid.sort((left, right) => right.workspace.revision - left.workspace.revision);
    if (
      valid.length === 2
      && valid[0].workspace.revision === valid[1].workspace.revision
      && valid[0].envelope.payloadHash !== valid[1].envelope.payloadHash
    ) throw new Error('Human Match Study 同 generation 双槽内容冲突。');
    if (valid.length === 2 && valid[0].workspace.revision === valid[1].workspace.revision) {
      return valid.find(({ slot }) => slot === head.value) ?? valid[0];
    }
    return valid[0];
  }

  #defaultStored() {
    const workspace = createHumanMatchStudyWorkspace(this.#definition);
    return Object.freeze({
      slot: null,
      workspace,
      envelope: createHumanMatchStudyWorkspaceEnvelope(this.#definition, workspace),
    });
  }

  #rollbackSlot(key) {
    try {
      this.#storage.delete(key);
      const result = this.#storage.read(key);
      return result.ok && !result.found;
    } catch {
      return false;
    }
  }

  #failIndeterminate(message) {
    this.#state = 'failed';
    throw new Error(`${message} Repository 已失败关闭。`);
  }

  open() {
    if (this.#state === 'destroyed') {
      throw new Error('HumanMatchStudyWorkspaceRepository 已销毁。');
    }
    if (this.#state === 'failed') {
      throw new Error('HumanMatchStudyWorkspaceRepository 已失败关闭。');
    }
    if (this.#state === 'open') return this.#workspace;
    if (!this.#lease.acquire()) throw new Error('真人研究数据正被另一个页面占用。');
    try {
      const stored = this.#loadStored() ?? this.#defaultStored();
      this.#workspace = stored.workspace;
      this.#envelope = stored.envelope;
      this.#state = 'open';
      return this.#workspace;
    } catch (error) {
      const failure = normalizeThrownError(
        error,
        'HumanMatchStudyWorkspaceRepository 打开失败',
      );
      const cleanupErrors = [];
      try {
        if (!this.#lease.release()) cleanupErrors.push(new Error('Study lease 未确认释放。'));
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      throw combineCleanupFailure(
        failure,
        cleanupErrors,
        'HumanMatchStudyWorkspaceRepository 打开失败且租约清理未完成。',
      );
    }
  }

  getSnapshot() {
    this.#assertOpen();
    return this.#workspace;
  }

  getDiagnostics() {
    if (this.#state === 'destroyed') {
      throw new Error('HumanMatchStudyWorkspaceRepository 已销毁。');
    }
    return this.#diagnostics;
  }

  getStorageKeys() {
    if (this.#state === 'destroyed') {
      throw new Error('HumanMatchStudyWorkspaceRepository 已销毁。');
    }
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
      const failure = new Error('Study lease 已过期、被取代或无法确认，仓储已关闭写入。');
      failure.cause = renewalError ?? verificationError;
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
      'HumanMatchStudyWorkspaceRepository.expectedRevision',
    );
    if (expectedRevision !== this.#workspace.revision) {
      return Object.freeze({
        committed: false,
        reason: 'memory-revision-mismatch',
        headUpdated: false,
      });
    }
    const next = createHumanMatchStudyWorkspace(this.#definition, nextValue);
    if (next.revision !== expectedRevision + 1) {
      throw new RangeError('HumanMatchStudyWorkspace revision 必须恰好递增 1。');
    }
    this.#writing = true;
    try {
      this.#lease.assertHeld();
      const currentStored = this.#loadStored() ?? this.#defaultStored();
      if (!sameStoredSnapshot(currentStored, {
        workspace: this.#workspace,
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
      const envelope = createHumanMatchStudyWorkspaceEnvelope(this.#definition, next);
      let writeReported = null;
      try {
        writeReported = this.#storage.write(targetKey, envelope);
      } catch {
        // The host may throw after mutation. Read-back is authoritative.
      }
      let confirmed;
      try {
        confirmed = this.#readSlot(targetKey, targetSlot);
      } catch (error) {
        if (this.#rollbackSlot(targetKey)) {
          return Object.freeze({
            committed: false,
            reason: writeReported === true ? 'slot-readback-failed' : 'slot-write-failed',
            headUpdated: false,
          });
        }
        error.repositoryState = 'failed';
        return this.#failIndeterminate('Study 新槽读取失败且无法回滚。');
      }
      if (
        confirmed.kind !== 'valid'
        || confirmed.envelope.payloadHash !== envelope.payloadHash
        || confirmed.workspace.revision !== next.revision
      ) {
        if (!this.#rollbackSlot(targetKey)) {
          return this.#failIndeterminate('Study 新槽内容未确认且无法回滚。');
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
      this.#workspace = confirmed.workspace;
      this.#envelope = confirmed.envelope;
      return Object.freeze({ committed: true, reason: null, headUpdated });
    } finally {
      this.#writing = false;
    }
  }

  destroy() {
    if (this.#state === 'destroyed') return;
    if (this.#writing) {
      throw new Error('写入期间不能销毁 HumanMatchStudyWorkspaceRepository。');
    }
    this.#lease.destroy();
    this.#definition = null;
    this.#storage = null;
    this.#lease = null;
    this.#keys = null;
    this.#workspace = null;
    this.#envelope = null;
    this.#state = 'destroyed';
  }
}
