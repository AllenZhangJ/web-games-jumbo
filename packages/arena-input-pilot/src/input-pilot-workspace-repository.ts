import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  combineCleanupFailure,
  normalizeThrownError,
  type SynchronousStoragePort,
} from '@number-strategy-jump/arena-contracts';
import { createInputPilotDefinition, type InputPilotDefinition } from './input-pilot-definition.js';
import {
  createInputPilotStoragePort,
  InputPilotStorageLease,
} from './input-pilot-runtime-ports.js';
import {
  INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION,
  assertInputPilotWorkspaceEnvelopeHasNoFutureSchema,
  createInputPilotWorkspaceEnvelope,
  validateInputPilotWorkspaceEnvelope,
  type InputPilotWorkspaceEnvelope,
} from './input-pilot-workspace-envelope.js';
import { createInputPilotWorkspace, type InputPilotWorkspace } from './input-pilot-workspace.js';

export { INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION };

const SLOT = Object.freeze({ A: 'a', B: 'b' } as const);
type Slot = typeof SLOT[keyof typeof SLOT];

interface WorkspaceStorageKeys {
  readonly slotA: string;
  readonly slotB: string;
  readonly head: string;
  readonly lease: string;
}
interface WorkspaceRepositoryDiagnostics {
  readonly invalidSlots: number;
  readonly headReadable: boolean;
  readonly headValid: boolean;
}
interface ValidStoredSlot {
  readonly kind: 'valid';
  readonly slot: Slot;
  readonly envelope: InputPilotWorkspaceEnvelope;
  readonly workspace: InputPilotWorkspace;
}
interface MissingStoredSlot { readonly kind: 'missing'; readonly slot: Slot }
interface InvalidStoredSlot { readonly kind: 'invalid'; readonly slot: Slot }
type StoredSlot = ValidStoredSlot | MissingStoredSlot | InvalidStoredSlot;
interface StoredSnapshot {
  readonly slot: Slot | null;
  readonly envelope: InputPilotWorkspaceEnvelope;
  readonly workspace: InputPilotWorkspace;
}
export interface InputPilotWorkspaceCommitResult {
  readonly committed: boolean;
  readonly reason: string | null;
  readonly headUpdated: boolean;
}

const REPOSITORY_OPTION_KEYS = new Set([
  'definition',
  'storage',
  'ownerId',
  'wallNow',
  'leaseDurationMs',
  'keyPrefix',
]);

function createKeys(
  definition: InputPilotDefinition,
  keyPrefixValue: unknown,
): WorkspaceStorageKeys {
  const keyPrefix = keyPrefixValue ?? `arena.input-pilot.${definition.id}.${definition.getContentHash()}`;
  const prefix = assertNonEmptyString(keyPrefix, 'InputPilotWorkspaceRepository.keyPrefix');
  return Object.freeze({
    slotA: `${prefix}.slot-a`,
    slotB: `${prefix}.slot-b`,
    head: `${prefix}.head`,
    lease: `${prefix}.lease`,
  });
}

function sameStoredSnapshot(left: StoredSnapshot, right: StoredSnapshot): boolean {
  return left.workspace.revision === right.workspace.revision
    && left.envelope.payloadHash === right.envelope.payloadHash;
}

function commitResult(
  committed: boolean,
  reason: string | null,
  headUpdated: boolean,
): Readonly<InputPilotWorkspaceCommitResult> {
  return Object.freeze({ committed, reason, headUpdated });
}

export class InputPilotWorkspaceRepository {
  #definition: InputPilotDefinition | null;
  #storage: Readonly<SynchronousStoragePort> | null;
  #lease: InputPilotStorageLease | null;
  #keys: WorkspaceStorageKeys | null;
  #workspace: InputPilotWorkspace | null = null;
  #envelope: InputPilotWorkspaceEnvelope | null = null;
  #slot: Slot | null = null;
  #diagnostics: Readonly<WorkspaceRepositoryDiagnostics> = Object.freeze({
    invalidSlots: 0,
    headReadable: true,
    headValid: true,
  });
  #state: 'created' | 'open' | 'destroyed' = 'created';
  #writing = false;

  constructor(optionsValue: unknown) {
    assertKnownKeys(optionsValue, REPOSITORY_OPTION_KEYS, 'InputPilotWorkspaceRepository options');
    const definition = createInputPilotDefinition(optionsValue.definition);
    const storage = createInputPilotStoragePort(optionsValue.storage);
    const keys = createKeys(definition, optionsValue.keyPrefix);
    const lease = new InputPilotStorageLease({
      storage: optionsValue.storage,
      key: keys.lease,
      ownerId: optionsValue.ownerId,
      wallNow: optionsValue.wallNow,
      durationMs: optionsValue.leaseDurationMs ?? 60_000,
    });
    this.#definition = definition;
    this.#storage = storage;
    this.#keys = keys;
    this.#lease = lease;
    Object.freeze(this);
  }

  #requireDefinition(): InputPilotDefinition {
    if (!this.#definition) throw new Error('InputPilotWorkspaceRepository 已销毁。');
    return this.#definition;
  }

  #requireStorage(): Readonly<SynchronousStoragePort> {
    if (!this.#storage) throw new Error('InputPilotWorkspaceRepository 已销毁。');
    return this.#storage;
  }

  #requireLease(): InputPilotStorageLease {
    if (!this.#lease) throw new Error('InputPilotWorkspaceRepository 已销毁。');
    return this.#lease;
  }

  #requireKeys(): WorkspaceStorageKeys {
    if (!this.#keys) throw new Error('InputPilotWorkspaceRepository 已销毁。');
    return this.#keys;
  }

  #requireWorkspace(): InputPilotWorkspace {
    if (!this.#workspace) throw new Error('InputPilotWorkspaceRepository 尚未打开。');
    return this.#workspace;
  }

  #requireEnvelope(): InputPilotWorkspaceEnvelope {
    if (!this.#envelope) throw new Error('InputPilotWorkspaceRepository 尚未打开。');
    return this.#envelope;
  }

  #assertOpen(): void {
    if (this.#state === 'destroyed') throw new Error('InputPilotWorkspaceRepository 已销毁。');
    if (this.#state !== 'open') throw new Error('InputPilotWorkspaceRepository 尚未打开。');
    if (this.#writing) throw new Error('InputPilotWorkspaceRepository 写入不可重入。');
  }

  #readSlot(key: string, slot: Slot): StoredSlot {
    const result = this.#requireStorage().read(key);
    if (!result.ok) throw new Error(`InputPilotWorkspace ${slot} 槽读取失败。`);
    if (!result.found) return Object.freeze({ kind: 'missing', slot });
    try {
      const validated = validateInputPilotWorkspaceEnvelope(
        this.#requireDefinition(),
        result.value,
      );
      return Object.freeze({ kind: 'valid', slot, ...validated });
    } catch (error) {
      try {
        assertInputPilotWorkspaceEnvelopeHasNoFutureSchema(result.value);
      } catch (compatibilityError) {
        const compatibilityFailure = normalizeThrownError(
          compatibilityError,
          'InputPilotWorkspace compatibility 检查失败',
        );
        compatibilityFailure.cause = error;
        throw compatibilityFailure;
      }
      return Object.freeze({ kind: 'invalid', slot });
    }
  }

  #readHead(): Readonly<{ readable: boolean; value: Slot | null; valid: boolean }> {
    const result = this.#requireStorage().read(this.#requireKeys().head);
    if (!result.ok) return Object.freeze({ readable: false, value: null, valid: false });
    if (!result.found) return Object.freeze({ readable: true, value: null, valid: true });
    const valid = result.value === SLOT.A || result.value === SLOT.B;
    return Object.freeze({ readable: true, value: valid ? result.value : null, valid });
  }

  #loadStored(): ValidStoredSlot | null {
    const keys = this.#requireKeys();
    const slots: StoredSlot[] = [
      this.#readSlot(keys.slotA, SLOT.A),
      this.#readSlot(keys.slotB, SLOT.B),
    ];
    const head = this.#readHead();
    const valid = slots.filter((slot): slot is ValidStoredSlot => slot.kind === 'valid');
    const invalidSlots = slots.filter(({ kind }) => kind === 'invalid').length;
    this.#diagnostics = Object.freeze({
      invalidSlots,
      headReadable: head.readable,
      headValid: head.valid,
    });
    if (valid.length === 0) return null;
    valid.sort((left, right) => right.workspace.revision - left.workspace.revision);
    const newest = valid[0];
    if (!newest) return null;
    const second = valid[1];
    if (
      second
      && newest.workspace.revision === second.workspace.revision
      && newest.envelope.payloadHash !== second.envelope.payloadHash
    ) throw new Error('InputPilotWorkspace 同 generation 双槽内容冲突。');
    if (second && newest.workspace.revision === second.workspace.revision) {
      return valid.find(({ slot }) => slot === head.value) ?? newest;
    }
    return newest;
  }

  open(): InputPilotWorkspace {
    if (this.#state === 'destroyed') throw new Error('InputPilotWorkspaceRepository 已销毁。');
    if (this.#state === 'open') return this.#requireWorkspace();
    if (!this.#requireLease().acquire()) throw new Error('Pilot 数据正被另一个页面占用。');
    try {
      const stored = this.#loadStored();
      if (stored) {
        this.#workspace = stored.workspace;
        this.#envelope = stored.envelope;
        this.#slot = stored.slot;
      } else {
        const workspace = createInputPilotWorkspace(this.#requireDefinition());
        this.#workspace = workspace;
        this.#envelope = createInputPilotWorkspaceEnvelope(this.#requireDefinition(), workspace);
        this.#slot = null;
      }
      this.#state = 'open';
      return this.#requireWorkspace();
    } catch (error) {
      const failure = normalizeThrownError(error, 'InputPilotWorkspaceRepository 打开失败');
      const cleanupErrors: Error[] = [];
      try {
        if (!this.#requireLease().release()) cleanupErrors.push(new Error('Pilot lease 未确认释放。'));
      } catch (cleanupError) {
        cleanupErrors.push(normalizeThrownError(cleanupError, 'Pilot lease 释放失败'));
      }
      throw combineCleanupFailure(
        failure,
        cleanupErrors,
        'InputPilotWorkspaceRepository 打开失败且租约清理未完成。',
      );
    }
  }

  getSnapshot(): InputPilotWorkspace {
    this.#assertOpen();
    return this.#requireWorkspace();
  }

  getDiagnostics(): Readonly<WorkspaceRepositoryDiagnostics> {
    if (this.#state === 'destroyed') throw new Error('InputPilotWorkspaceRepository 已销毁。');
    return this.#diagnostics;
  }

  renewLease(): boolean {
    this.#assertOpen();
    return this.#requireLease().renew();
  }

  compareAndSet(nextValue: unknown, expectedRevisionValue: unknown): InputPilotWorkspaceCommitResult {
    this.#assertOpen();
    const expectedRevision = assertIntegerAtLeast(
      expectedRevisionValue,
      0,
      'InputPilotWorkspaceRepository.expectedRevision',
    );
    if (expectedRevision !== this.#requireWorkspace().revision) {
      return commitResult(false, 'memory-revision-mismatch', false);
    }
    const next = createInputPilotWorkspace(this.#requireDefinition(), nextValue);
    if (next.revision !== expectedRevision + 1) {
      throw new RangeError('InputPilotWorkspace 下一 revision 必须恰好递增 1。');
    }
    this.#writing = true;
    try {
      this.#requireLease().assertHeld();
      const stored = this.#loadStored();
      const emptyWorkspace = createInputPilotWorkspace(this.#requireDefinition());
      const currentStored: StoredSnapshot = stored ?? Object.freeze({
        slot: null,
        workspace: emptyWorkspace,
        envelope: createInputPilotWorkspaceEnvelope(this.#requireDefinition(), emptyWorkspace),
      });
      if (!sameStoredSnapshot(currentStored, {
        workspace: this.#requireWorkspace(),
        envelope: this.#requireEnvelope(),
        slot: this.#slot,
      })) return commitResult(false, 'storage-revision-mismatch', false);

      const targetSlot = currentStored.slot === SLOT.A ? SLOT.B : SLOT.A;
      const keys = this.#requireKeys();
      const targetKey = targetSlot === SLOT.A ? keys.slotA : keys.slotB;
      const envelope = createInputPilotWorkspaceEnvelope(this.#requireDefinition(), next);
      let writeConfirmed = false;
      try {
        writeConfirmed = this.#requireStorage().write(targetKey, envelope);
      } catch {
        writeConfirmed = false;
      }
      let confirmed: StoredSlot;
      try {
        confirmed = this.#readSlot(targetKey, targetSlot);
      } catch (error) {
        if (!writeConfirmed) return commitResult(false, 'slot-write-failed', false);
        throw error;
      }
      if (
        confirmed.kind !== 'valid'
        || confirmed.envelope.payloadHash !== envelope.payloadHash
        || confirmed.workspace.revision !== next.revision
      ) {
        return commitResult(
          false,
          writeConfirmed ? 'slot-readback-failed' : 'slot-write-failed',
          false,
        );
      }
      let headUpdated = false;
      try {
        headUpdated = this.#requireStorage().write(keys.head, targetSlot);
      } catch {
        headUpdated = false;
      }
      this.#workspace = confirmed.workspace;
      this.#envelope = confirmed.envelope;
      this.#slot = targetSlot;
      return commitResult(true, null, headUpdated);
    } finally {
      this.#writing = false;
    }
  }

  getStorageKeys(): WorkspaceStorageKeys {
    if (this.#state === 'destroyed') throw new Error('InputPilotWorkspaceRepository 已销毁。');
    return this.#requireKeys();
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    if (this.#writing) throw new Error('写入期间不能销毁 InputPilotWorkspaceRepository。');
    this.#requireLease().destroy();
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
