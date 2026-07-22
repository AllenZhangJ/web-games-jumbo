import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  combineCleanupFailure,
  createSynchronousStoragePort,
  normalizeThrownError,
  type SynchronousStoragePort,
} from '@number-strategy-jump/arena-contracts';
import { SynchronousStorageLease } from '@number-strategy-jump/arena-storage';
import {
  createHumanMatchStudyDefinition,
  type HumanMatchStudyDefinition,
} from './human-match-study-definition.js';
import {
  assertHumanMatchStudyWorkspaceEnvelopeHasNoFutureSchema,
  createHumanMatchStudyWorkspaceEnvelope,
  validateHumanMatchStudyWorkspaceEnvelope,
  type HumanMatchStudyWorkspaceEnvelope,
} from './human-match-study-workspace-envelope.js';
import {
  createHumanMatchStudyWorkspace,
  type HumanMatchStudyWorkspace,
} from './human-match-study-workspace.js';

const SLOT = Object.freeze({ A: 'a', B: 'b' } as const);
const OPTION_KEYS = new Set([
  'definition', 'storage', 'ownerId', 'wallNow', 'leaseDurationMs', 'keyPrefix',
]);
const REQUIRED_OPTION_KEYS = Object.freeze(['definition', 'storage', 'ownerId', 'wallNow'] as const);

type SlotId = typeof SLOT[keyof typeof SLOT];
type RepositoryState = 'created' | 'opening' | 'open' | 'failed' | 'destroyed';

export interface HumanMatchStudyWorkspaceRepositoryOptions {
  readonly definition: unknown;
  readonly storage: unknown;
  readonly ownerId: string;
  readonly wallNow: () => number;
  readonly leaseDurationMs?: number;
  readonly keyPrefix?: string;
}

export interface HumanMatchStudyWorkspaceRepositoryKeys {
  readonly slotA: string;
  readonly slotB: string;
  readonly head: string;
  readonly lease: string;
}

export interface HumanMatchStudyWorkspaceRepositoryDiagnostics {
  readonly missingSlots: number;
  readonly invalidSlots: number;
  readonly headReadable: boolean;
  readonly headValid: boolean;
  readonly recoveredDefault: boolean;
}

export type HumanMatchStudyWorkspaceCommitFailureReason =
  | 'memory-revision-mismatch'
  | 'storage-revision-mismatch'
  | 'slot-readback-failed'
  | 'slot-write-failed';

export type HumanMatchStudyWorkspaceCommitResult = Readonly<
  | {
    readonly committed: true;
    readonly reason: null;
    readonly headUpdated: boolean;
  }
  | {
    readonly committed: false;
    readonly reason: HumanMatchStudyWorkspaceCommitFailureReason;
    readonly headUpdated: false;
  }
>;

interface NormalizedOptions {
  readonly definition: unknown;
  readonly storage: unknown;
  readonly ownerId: unknown;
  readonly wallNow: unknown;
  readonly leaseDurationMs: unknown;
  readonly keyPrefix: unknown;
}

interface MissingSlot { readonly kind: 'missing'; readonly slot: SlotId }
interface InvalidSlot { readonly kind: 'invalid'; readonly slot: SlotId }
interface ValidSlot {
  readonly kind: 'valid';
  readonly slot: SlotId;
  readonly envelope: HumanMatchStudyWorkspaceEnvelope;
  readonly workspace: HumanMatchStudyWorkspace;
}
type SlotRead = MissingSlot | InvalidSlot | ValidSlot;
interface StoredSnapshot {
  readonly slot: SlotId | null;
  readonly envelope: HumanMatchStudyWorkspaceEnvelope;
  readonly workspace: HumanMatchStudyWorkspace;
}

function normalizeOptions(value: unknown): NormalizedOptions {
  assertKnownKeys(value, OPTION_KEYS, 'HumanMatchStudyWorkspaceRepository options');
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  for (const key of REQUIRED_OPTION_KEYS) {
    if (!descriptors[key]) {
      throw new TypeError(
        `HumanMatchStudyWorkspaceRepository options.${key} 必须是可枚举数据字段。`,
      );
    }
  }
  const read = (key: string, fallback?: unknown): unknown => {
    const descriptor = descriptors[key];
    return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
      ? descriptor.value
      : fallback;
  };
  return Object.freeze({
    definition: read('definition'),
    storage: read('storage'),
    ownerId: read('ownerId'),
    wallNow: read('wallNow'),
    leaseDurationMs: read('leaseDurationMs', 60_000),
    keyPrefix: read('keyPrefix'),
  });
}

function createKeys(
  definition: HumanMatchStudyDefinition,
  keyPrefixValue: unknown,
): HumanMatchStudyWorkspaceRepositoryKeys {
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

function sameStoredSnapshot(left: StoredSnapshot, right: StoredSnapshot): boolean {
  return left.workspace.revision === right.workspace.revision
    && left.envelope.payloadHash === right.envelope.payloadHash;
}

function isValidSlot(value: SlotRead): value is ValidSlot {
  return value.kind === 'valid';
}

function commitFailure(
  reason: HumanMatchStudyWorkspaceCommitFailureReason,
): HumanMatchStudyWorkspaceCommitResult {
  return Object.freeze({ committed: false, reason, headUpdated: false });
}

export class HumanMatchStudyWorkspaceRepository {
  #definition: HumanMatchStudyDefinition | null;
  #storage: Readonly<SynchronousStoragePort> | null;
  #lease: SynchronousStorageLease | null;
  #keys: HumanMatchStudyWorkspaceRepositoryKeys | null;
  #workspace: HumanMatchStudyWorkspace | null = null;
  #envelope: HumanMatchStudyWorkspaceEnvelope | null = null;
  #diagnostics: HumanMatchStudyWorkspaceRepositoryDiagnostics = Object.freeze({
    missingSlots: 2,
    invalidSlots: 0,
    headReadable: true,
    headValid: true,
    recoveredDefault: false,
  });
  #state: RepositoryState = 'created';
  #writing = false;

  constructor(optionsValue: HumanMatchStudyWorkspaceRepositoryOptions | unknown) {
    const options = normalizeOptions(optionsValue);
    const definition = createHumanMatchStudyDefinition(options.definition);
    if (typeof options.wallNow !== 'function') throw new TypeError('wallNow 必须是函数。');
    this.#definition = definition;
    this.#storage = createSynchronousStoragePort(options.storage, {
      label: 'Human Match Study Storage',
    });
    this.#keys = createKeys(definition, options.keyPrefix);
    this.#lease = new SynchronousStorageLease({
      storage: options.storage,
      key: this.#keys.lease,
      ownerId: assertNonEmptyString(
        options.ownerId,
        'HumanMatchStudyWorkspaceRepository.ownerId',
      ),
      wallNow: options.wallNow as () => number,
      durationMs: assertIntegerAtLeast(
        options.leaseDurationMs,
        1_000,
        'HumanMatchStudyWorkspaceRepository.leaseDurationMs',
      ),
      label: 'Human Match Study Lease',
    });
    Object.freeze(this);
  }

  #requireDefinition(): HumanMatchStudyDefinition {
    if (!this.#definition) throw new Error('HumanMatchStudyWorkspaceRepository 已销毁。');
    return this.#definition;
  }

  #requireStorage(): Readonly<SynchronousStoragePort> {
    if (!this.#storage) throw new Error('HumanMatchStudyWorkspaceRepository 已销毁。');
    return this.#storage;
  }

  #requireLease(): SynchronousStorageLease {
    if (!this.#lease) throw new Error('HumanMatchStudyWorkspaceRepository 已销毁。');
    return this.#lease;
  }

  #requireKeys(): HumanMatchStudyWorkspaceRepositoryKeys {
    if (!this.#keys) throw new Error('HumanMatchStudyWorkspaceRepository 已销毁。');
    return this.#keys;
  }

  #requireWorkspace(): HumanMatchStudyWorkspace {
    if (!this.#workspace) throw new Error('HumanMatchStudyWorkspaceRepository 尚未打开。');
    return this.#workspace;
  }

  #requireEnvelope(): HumanMatchStudyWorkspaceEnvelope {
    if (!this.#envelope) throw new Error('HumanMatchStudyWorkspaceRepository 尚未打开。');
    return this.#envelope;
  }

  #assertNotTransitioning(): void {
    if (this.#state === 'opening' || this.#writing) {
      throw new Error('HumanMatchStudyWorkspaceRepository 操作不可重入。');
    }
  }

  #assertOpen(): void {
    this.#assertNotTransitioning();
    if (this.#state === 'destroyed') throw new Error('HumanMatchStudyWorkspaceRepository 已销毁。');
    if (this.#state === 'failed') throw new Error('HumanMatchStudyWorkspaceRepository 已失败关闭。');
    if (this.#state !== 'open') throw new Error('HumanMatchStudyWorkspaceRepository 尚未打开。');
    if (this.#writing) throw new Error('HumanMatchStudyWorkspaceRepository 写入不可重入。');
  }

  #readSlot(key: string, slot: SlotId): SlotRead {
    const result = this.#requireStorage().read(key);
    if (!result.ok) throw new Error(`Human Match Study ${slot} 槽读取失败。`);
    if (!result.found) return Object.freeze({ kind: 'missing', slot });
    try {
      const validated = validateHumanMatchStudyWorkspaceEnvelope(
        this.#requireDefinition(),
        result.value,
      );
      return Object.freeze({ kind: 'valid', slot, ...validated });
    } catch (error) {
      try {
        assertHumanMatchStudyWorkspaceEnvelopeHasNoFutureSchema(result.value);
      } catch (compatibilityError) {
        const failure = normalizeThrownError(
          compatibilityError,
          'Human Match Study Workspace schema 不兼容',
        );
        failure.cause = normalizeThrownError(error, 'Human Match Study Workspace 槽无效');
        throw failure;
      }
      return Object.freeze({ kind: 'invalid', slot });
    }
  }

  #readHead(): Readonly<{ readable: boolean; value: SlotId | null; valid: boolean }> {
    let result;
    try {
      result = this.#requireStorage().read(this.#requireKeys().head);
    } catch {
      return Object.freeze({ readable: false, value: null, valid: false });
    }
    if (!result.ok) return Object.freeze({ readable: false, value: null, valid: false });
    if (!result.found) return Object.freeze({ readable: true, value: null, valid: true });
    const valid = result.value === SLOT.A || result.value === SLOT.B;
    return Object.freeze({ readable: true, value: valid ? result.value as SlotId : null, valid });
  }

  #loadStored(): ValidSlot | null {
    const keys = this.#requireKeys();
    const slots = [
      this.#readSlot(keys.slotA, SLOT.A),
      this.#readSlot(keys.slotB, SLOT.B),
    ];
    const head = this.#readHead();
    const valid = slots.filter(isValidSlot);
    this.#diagnostics = Object.freeze({
      missingSlots: slots.filter(({ kind }) => kind === 'missing').length,
      invalidSlots: slots.filter(({ kind }) => kind === 'invalid').length,
      headReadable: head.readable,
      headValid: head.valid,
      recoveredDefault: valid.length === 0,
    });
    if (valid.length === 0) return null;
    valid.sort((left, right) => right.workspace.revision - left.workspace.revision);
    const newest = valid[0];
    if (!newest) return null;
    const other = valid[1];
    if (
      other
      && newest.workspace.revision === other.workspace.revision
      && newest.envelope.payloadHash !== other.envelope.payloadHash
    ) throw new Error('Human Match Study 同 generation 双槽内容冲突。');
    if (other && newest.workspace.revision === other.workspace.revision) {
      return valid.find(({ slot }) => slot === head.value) ?? newest;
    }
    return newest;
  }

  #defaultStored(): StoredSnapshot {
    const workspace = createHumanMatchStudyWorkspace(this.#requireDefinition());
    return Object.freeze({
      slot: null,
      workspace,
      envelope: createHumanMatchStudyWorkspaceEnvelope(this.#requireDefinition(), workspace),
    });
  }

  #rollbackSlot(key: string): boolean {
    try {
      this.#requireStorage().delete(key);
      const result = this.#requireStorage().read(key);
      return result.ok && !result.found;
    } catch {
      return false;
    }
  }

  #failIndeterminate(message: string, cause?: unknown): never {
    this.#state = 'failed';
    const failure = new Error(`${message} Repository 已失败关闭。`);
    if (cause !== undefined) {
      failure.cause = normalizeThrownError(cause, 'HumanMatchStudyWorkspaceRepository 状态不确定');
    }
    throw failure;
  }

  open(): HumanMatchStudyWorkspace {
    if (this.#state === 'destroyed') throw new Error('HumanMatchStudyWorkspaceRepository 已销毁。');
    if (this.#state === 'failed') throw new Error('HumanMatchStudyWorkspaceRepository 已失败关闭。');
    if (this.#writing) throw new Error('HumanMatchStudyWorkspaceRepository 操作不可重入。');
    if (this.#state === 'open') return this.#requireWorkspace();
    if (this.#state === 'opening') throw new Error('HumanMatchStudyWorkspaceRepository 打开不可重入。');
    this.#state = 'opening';
    try {
      if (!this.#requireLease().acquire()) throw new Error('真人研究数据正被另一个页面占用。');
      const stored = this.#loadStored() ?? this.#defaultStored();
      this.#workspace = stored.workspace;
      this.#envelope = stored.envelope;
      this.#state = 'open';
      return this.#workspace;
    } catch (error) {
      const failure = normalizeThrownError(error, 'HumanMatchStudyWorkspaceRepository 打开失败');
      const cleanupErrors: Error[] = [];
      try {
        if (!this.#requireLease().release()) cleanupErrors.push(new Error('Study lease 未确认释放。'));
      } catch (cleanupError) {
        cleanupErrors.push(normalizeThrownError(cleanupError, 'Study lease 释放失败'));
      }
      this.#state = cleanupErrors.length === 0 ? 'created' : 'failed';
      throw combineCleanupFailure(
        failure,
        cleanupErrors,
        'HumanMatchStudyWorkspaceRepository 打开失败且租约清理未完成。',
      );
    }
  }

  getSnapshot(): HumanMatchStudyWorkspace {
    this.#assertOpen();
    return this.#requireWorkspace();
  }

  getDiagnostics(): HumanMatchStudyWorkspaceRepositoryDiagnostics {
    this.#assertNotTransitioning();
    if (this.#state === 'destroyed') throw new Error('HumanMatchStudyWorkspaceRepository 已销毁。');
    return this.#diagnostics;
  }

  getStorageKeys(): HumanMatchStudyWorkspaceRepositoryKeys {
    this.#assertNotTransitioning();
    if (this.#state === 'destroyed') throw new Error('HumanMatchStudyWorkspaceRepository 已销毁。');
    return this.#requireKeys();
  }

  renewLease(): boolean {
    this.#assertOpen();
    let renewalError: unknown = null;
    try {
      if (this.#requireLease().renew()) return true;
    } catch (error) {
      renewalError = error;
    }
    try {
      this.#requireLease().assertHeld();
    } catch (verificationError) {
      this.#state = 'failed';
      const failure = new Error('Study lease 已过期、被取代或无法确认，仓储已关闭写入。');
      failure.cause = normalizeThrownError(
        renewalError ?? verificationError,
        'Study lease 续租失败',
      );
      throw failure;
    }
    if (renewalError !== null) throw renewalError;
    return false;
  }

  compareAndSet(nextValue: unknown, expectedRevisionValue: unknown): HumanMatchStudyWorkspaceCommitResult {
    this.#assertOpen();
    const expectedRevision = assertIntegerAtLeast(
      expectedRevisionValue,
      0,
      'HumanMatchStudyWorkspaceRepository.expectedRevision',
    );
    const currentWorkspace = this.#requireWorkspace();
    if (expectedRevision !== currentWorkspace.revision) {
      return commitFailure('memory-revision-mismatch');
    }
    const next = createHumanMatchStudyWorkspace(this.#requireDefinition(), nextValue);
    if (next.revision !== expectedRevision + 1) {
      throw new RangeError('HumanMatchStudyWorkspace revision 必须恰好递增 1。');
    }
    this.#writing = true;
    try {
      try {
        this.#requireLease().assertHeld();
      } catch (error) {
        this.#failIndeterminate(
          'Study lease 已过期、被取代或无法确认。',
          error,
        );
      }
      const currentStored = this.#loadStored() ?? this.#defaultStored();
      if (!sameStoredSnapshot(currentStored, {
        slot: null,
        workspace: currentWorkspace,
        envelope: this.#requireEnvelope(),
      })) {
        return commitFailure('storage-revision-mismatch');
      }
      const targetSlot = currentStored.slot === SLOT.A ? SLOT.B : SLOT.A;
      const keys = this.#requireKeys();
      const targetKey = targetSlot === SLOT.A ? keys.slotA : keys.slotB;
      const envelope = createHumanMatchStudyWorkspaceEnvelope(this.#requireDefinition(), next);
      let writeReported: boolean | null = null;
      try {
        writeReported = this.#requireStorage().write(targetKey, envelope);
      } catch {
        // The host may throw after mutation. Read-back is authoritative.
      }
      let confirmed: SlotRead;
      try {
        confirmed = this.#readSlot(targetKey, targetSlot);
      } catch (error) {
        if (this.#rollbackSlot(targetKey)) {
          return commitFailure(
            writeReported === true ? 'slot-readback-failed' : 'slot-write-failed',
          );
        }
        this.#failIndeterminate('Study 新槽读取失败且无法回滚。', error);
      }
      if (
        confirmed.kind !== 'valid'
        || confirmed.envelope.payloadHash !== envelope.payloadHash
        || confirmed.workspace.revision !== next.revision
      ) {
        if (
          confirmed.kind === 'valid'
          && (writeReported === true
            || confirmed.workspace.revision > currentStored.workspace.revision)
        ) {
          this.#failIndeterminate('Study 新槽出现其他有效 generation。');
        }
        return commitFailure(
          writeReported === true ? 'slot-readback-failed' : 'slot-write-failed',
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
      return Object.freeze({ committed: true, reason: null, headUpdated });
    } finally {
      this.#writing = false;
    }
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    this.#assertNotTransitioning();
    this.#requireLease().destroy();
    this.#definition = null;
    this.#storage = null;
    this.#lease = null;
    this.#keys = null;
    this.#workspace = null;
    this.#envelope = null;
    this.#state = 'destroyed';
  }
}
