import {
  assertIntegerAtLeast,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  combineCleanupFailure,
  normalizeThrownError,
} from '../../lifecycle-error.js';
import { createInputPilotDefinition } from './input-pilot-definition.js';
import { InputPilotStorageLease } from './input-pilot-storage-lease.js';
import { createInputPilotStoragePort } from './input-pilot-storage-port.js';
import {
  INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION,
  assertInputPilotWorkspaceEnvelopeHasNoFutureSchema,
  createInputPilotWorkspaceEnvelope,
  validateInputPilotWorkspaceEnvelope,
} from './input-pilot-workspace-envelope.js';
import {
  createInputPilotWorkspace,
} from './input-pilot-workspace.js';

export { INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION };

const SLOT = Object.freeze({ A: 'a', B: 'b' });

function createKeys(definition, keyPrefixValue) {
  const keyPrefix = keyPrefixValue ?? (
    `arena.input-pilot.${definition.id}.${definition.getContentHash()}`
  );
  const prefix = assertNonEmptyString(keyPrefix, 'InputPilotWorkspaceRepository.keyPrefix');
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

export class InputPilotWorkspaceRepository {
  #definition;
  #storage;
  #lease;
  #keys;
  #workspace;
  #envelope;
  #slot;
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
    const definition = createInputPilotDefinition(definitionValue);
    this.#definition = definition;
    this.#storage = createInputPilotStoragePort(storage);
    this.#keys = createKeys(definition, keyPrefix);
    this.#lease = new InputPilotStorageLease({
      storage,
      key: this.#keys.lease,
      ownerId,
      wallNow,
      durationMs: leaseDurationMs,
    });
    this.#workspace = null;
    this.#envelope = null;
    this.#slot = null;
    this.#diagnostics = Object.freeze({ invalidSlots: 0, headReadable: true, headValid: true });
    this.#state = 'created';
    this.#writing = false;
    Object.freeze(this);
  }

  #assertOpen() {
    if (this.#state === 'destroyed') throw new Error('InputPilotWorkspaceRepository 已销毁。');
    if (this.#state !== 'open') throw new Error('InputPilotWorkspaceRepository 尚未打开。');
    if (this.#writing) throw new Error('InputPilotWorkspaceRepository 写入不可重入。');
  }

  #readSlot(key, slot) {
    const result = this.#storage.read(key);
    if (!result.ok) throw new Error(`InputPilotWorkspace ${slot} 槽读取失败。`);
    if (!result.found) return Object.freeze({ kind: 'missing', slot });
    try {
      const validated = validateInputPilotWorkspaceEnvelope(this.#definition, result.value);
      return Object.freeze({ kind: 'valid', slot, ...validated });
    } catch (error) {
      try {
        assertInputPilotWorkspaceEnvelopeHasNoFutureSchema(result.value);
      } catch (compatibilityError) {
        compatibilityError.cause = error;
        throw compatibilityError;
      }
      return Object.freeze({ kind: 'invalid', slot });
    }
  }

  #readHead() {
    const result = this.#storage.read(this.#keys.head);
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
    const invalidSlots = slots.filter(({ kind }) => kind === 'invalid').length;
    this.#diagnostics = Object.freeze({
      invalidSlots,
      headReadable: head.readable,
      headValid: head.valid,
    });
    if (valid.length === 0) return null;
    valid.sort((left, right) => right.workspace.revision - left.workspace.revision);
    if (
      valid.length === 2
      && valid[0].workspace.revision === valid[1].workspace.revision
      && valid[0].envelope.payloadHash !== valid[1].envelope.payloadHash
    ) throw new Error('InputPilotWorkspace 同 generation 双槽内容冲突。');
    if (valid.length === 2 && valid[0].workspace.revision === valid[1].workspace.revision) {
      return valid.find(({ slot }) => slot === head.value) ?? valid[0];
    }
    return valid[0];
  }

  open() {
    if (this.#state === 'destroyed') throw new Error('InputPilotWorkspaceRepository 已销毁。');
    if (this.#state === 'open') return this.#workspace;
    if (!this.#lease.acquire()) throw new Error('Pilot 数据正被另一个页面占用。');
    try {
      const stored = this.#loadStored();
      if (stored) {
        this.#workspace = stored.workspace;
        this.#envelope = stored.envelope;
        this.#slot = stored.slot;
      } else {
        this.#workspace = createInputPilotWorkspace(this.#definition);
        this.#envelope = createInputPilotWorkspaceEnvelope(
          this.#definition,
          this.#workspace,
        );
        this.#slot = null;
      }
      this.#state = 'open';
      return this.#workspace;
    } catch (error) {
      const failure = normalizeThrownError(error, 'InputPilotWorkspaceRepository 打开失败');
      const cleanupErrors = [];
      try {
        if (!this.#lease.release()) cleanupErrors.push(new Error('Pilot lease 未确认释放。'));
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      throw combineCleanupFailure(
        failure,
        cleanupErrors,
        'InputPilotWorkspaceRepository 打开失败且租约清理未完成。',
      );
    }
  }

  getSnapshot() {
    this.#assertOpen();
    return this.#workspace;
  }

  getDiagnostics() {
    if (this.#state === 'destroyed') throw new Error('InputPilotWorkspaceRepository 已销毁。');
    return this.#diagnostics;
  }

  renewLease() {
    this.#assertOpen();
    return this.#lease.renew();
  }

  compareAndSet(nextValue, expectedRevisionValue) {
    this.#assertOpen();
    const expectedRevision = assertIntegerAtLeast(
      expectedRevisionValue,
      0,
      'InputPilotWorkspaceRepository.expectedRevision',
    );
    if (expectedRevision !== this.#workspace.revision) {
      return Object.freeze({ committed: false, reason: 'memory-revision-mismatch', headUpdated: false });
    }
    const next = createInputPilotWorkspace(this.#definition, nextValue);
    if (next.revision !== expectedRevision + 1) {
      throw new RangeError('InputPilotWorkspace 下一 revision 必须恰好递增 1。');
    }
    this.#writing = true;
    try {
      this.#lease.assertHeld();
      const stored = this.#loadStored();
      const currentStored = stored ?? Object.freeze({
        slot: null,
        workspace: createInputPilotWorkspace(this.#definition),
        envelope: createInputPilotWorkspaceEnvelope(
          this.#definition,
          createInputPilotWorkspace(this.#definition),
        ),
      });
      if (!sameStoredSnapshot(currentStored, {
        workspace: this.#workspace,
        envelope: this.#envelope,
      })) {
        return Object.freeze({ committed: false, reason: 'storage-revision-mismatch', headUpdated: false });
      }
      const targetSlot = currentStored.slot === SLOT.A ? SLOT.B : SLOT.A;
      const targetKey = targetSlot === SLOT.A ? this.#keys.slotA : this.#keys.slotB;
      const envelope = createInputPilotWorkspaceEnvelope(this.#definition, next);
      if (!this.#storage.write(targetKey, envelope)) {
        return Object.freeze({ committed: false, reason: 'slot-write-failed', headUpdated: false });
      }
      const confirmed = this.#readSlot(targetKey, targetSlot);
      if (
        confirmed.kind !== 'valid'
        || confirmed.envelope.payloadHash !== envelope.payloadHash
        || confirmed.workspace.revision !== next.revision
      ) {
        return Object.freeze({ committed: false, reason: 'slot-readback-failed', headUpdated: false });
      }
      const headUpdated = this.#storage.write(this.#keys.head, targetSlot);
      this.#workspace = confirmed.workspace;
      this.#envelope = confirmed.envelope;
      this.#slot = targetSlot;
      return Object.freeze({ committed: true, reason: null, headUpdated });
    } finally {
      this.#writing = false;
    }
  }

  getStorageKeys() {
    if (this.#state === 'destroyed') throw new Error('InputPilotWorkspaceRepository 已销毁。');
    return this.#keys;
  }

  destroy() {
    if (this.#state === 'destroyed') return;
    if (this.#writing) throw new Error('写入期间不能销毁 InputPilotWorkspaceRepository。');
    this.#lease.destroy();
    this.#definition = null;
    this.#storage = null;
    this.#lease = null;
    this.#keys = null;
    this.#workspace = null;
    this.#envelope = null;
    this.#slot = null;
    this.#state = 'destroyed';
  }
}
