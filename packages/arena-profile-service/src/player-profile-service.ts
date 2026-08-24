import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  cloneFrozenStringSet,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  PlayerProfileFutureSchemaError,
  PlayerProfileIndeterminateWriteError,
  PlayerProfileRepositoryBusyError,
  PlayerProfileSaveConflictError,
  advancePlayerProfile,
  createPlayerProfile,
  createPlayerProfileDefinition,
  type PlayerProfile,
  type PlayerProfileDefinition,
} from '@number-strategy-jump/arena-profile-contracts';

export const PLAYER_PROFILE_SERVICE_STATE = Object.freeze({
  CREATED: 'created',
  OPEN: 'open',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type PlayerProfileServiceState =
  typeof PLAYER_PROFILE_SERVICE_STATE[keyof typeof PLAYER_PROFILE_SERVICE_STATE];

export interface PlayerProfileRepositoryPort {
  open(): unknown;
  getSnapshot(): unknown;
  renewLease(): unknown;
  compareAndSet(next: unknown, expectedRevision: unknown): unknown;
  destroy(): unknown;
}

export interface PlayerProfileProgressionGrant {
  readonly grantId: unknown;
  readonly experienceDelta: unknown;
  readonly unlocks: unknown;
}

interface PlayerProfileServiceOptions {
  readonly definition: unknown;
  readonly repository: unknown;
}

interface NormalizedProgressionGrant {
  readonly grantId: string;
  readonly experienceDelta: number;
  readonly unlocks: Readonly<Record<UnlockKey, readonly string[]>>;
}

type RepositoryMethod = (...arguments_: readonly unknown[]) => unknown;
type UnlockKey = 'characterIds' | 'appearanceIds' | 'equipmentIds' | 'mapIds';
type PlayerProfileServiceOperation =
  | 'state-read'
  | 'open'
  | 'snapshot-read'
  | 'last-known-snapshot-read'
  | 'renew-lease'
  | 'select-character'
  | 'commit-progression-grant'
  | 'destroy';

const OPTION_KEYS = new Set(['definition', 'repository']);
const GRANT_KEYS = new Set(['grantId', 'experienceDelta', 'unlocks']);
const UNLOCK_KEYS = new Set<UnlockKey>([
  'characterIds', 'appearanceIds', 'equipmentIds', 'mapIds',
]);
const COMMIT_KEYS = new Set(['committed', 'reason', 'headUpdated']);

function readDataField(record: PlainRecord, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${label}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function readExactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  label: string,
): Readonly<Record<string, unknown>> {
  const record = assertPlainRecord(value, label);
  assertKnownKeys(record, keys, label);
  const result: Record<string, unknown> = {};
  for (const key of keys) result[key] = readDataField(record, key, label);
  return Object.freeze(result);
}

function snapshotMethod(target: object, methodName: string): RepositoryMethod {
  let cursor: object | null = target;
  while (cursor !== null && cursor !== Object.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(cursor, methodName);
    if (descriptor) {
      if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
        throw new TypeError(`PlayerProfile Repository.${methodName} 必须是数据方法。`);
      }
      const method = descriptor.value as RepositoryMethod;
      return (...arguments_: readonly unknown[]) => Reflect.apply(method, target, arguments_);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`PlayerProfile Repository 缺少 ${methodName}()。`);
}

function createRepositoryPort(value: unknown): Readonly<PlayerProfileRepositoryPort> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('PlayerProfileService 需要 Repository。');
  }
  return Object.freeze({
    open: snapshotMethod(value, 'open'),
    getSnapshot: snapshotMethod(value, 'getSnapshot'),
    renewLease: snapshotMethod(value, 'renewLease'),
    compareAndSet: snapshotMethod(value, 'compareAndSet'),
    destroy: snapshotMethod(value, 'destroy'),
  });
}

function sameProfile(left: PlayerProfile, right: PlayerProfile): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeProgressionGrant(value: unknown): NormalizedProgressionGrant {
  const source = cloneFrozenData(value, 'PlayerProfile progression grant');
  assertKnownKeys(source, GRANT_KEYS, 'PlayerProfile progression grant');
  const rawUnlocks = assertPlainRecord(
    readDataField(source, 'unlocks', 'PlayerProfile progression grant'),
    'PlayerProfile progression grant.unlocks',
  );
  assertKnownKeys(rawUnlocks, UNLOCK_KEYS, 'PlayerProfile progression grant.unlocks');
  const unlocks = {} as Record<UnlockKey, readonly string[]>;
  for (const key of UNLOCK_KEYS) {
    const entries = readDataField(rawUnlocks, key, 'PlayerProfile progression grant.unlocks');
    if (!Array.isArray(entries)) {
      throw new TypeError(`PlayerProfile progression grant.unlocks.${key} 必须是数组。`);
    }
    unlocks[key] = cloneFrozenStringSet(
      entries,
      `PlayerProfile progression grant.unlocks.${key}`,
    );
  }
  return Object.freeze({
    grantId: assertNonEmptyString(
      readDataField(source, 'grantId', 'PlayerProfile progression grant'),
      'PlayerProfile progression grant.grantId',
    ),
    experienceDelta: assertIntegerAtLeast(
      readDataField(source, 'experienceDelta', 'PlayerProfile progression grant'),
      0,
      'PlayerProfile progression grant.experienceDelta',
    ),
    unlocks: Object.freeze(unlocks),
  });
}

function normalizeCommitResult(value: unknown): Readonly<{
  committed: boolean;
  reason: string | null;
  headUpdated: boolean;
}> {
  const result = readExactRecord(value, COMMIT_KEYS, 'PlayerProfile Repository commit result');
  if (typeof result.committed !== 'boolean' || typeof result.headUpdated !== 'boolean') {
    throw new TypeError('PlayerProfile Repository commit result 状态必须是布尔值。');
  }
  if (result.committed) {
    if (result.reason !== null) {
      throw new TypeError('PlayerProfile Repository 已提交结果的 reason 必须为 null。');
    }
  } else {
    assertNonEmptyString(result.reason, 'PlayerProfile Repository commit result.reason');
    if (result.headUpdated) {
      throw new RangeError('PlayerProfile Repository 未提交时不得更新 head。');
    }
  }
  return Object.freeze({
    committed: result.committed,
    reason: result.reason as string | null,
    headUpdated: result.headUpdated,
  });
}

function mergeStringSet(current: readonly string[], additions: readonly string[]): readonly string[] {
  return Object.freeze([...new Set([...current, ...additions])].sort());
}

export class PlayerProfilePersistenceError extends Error {
  readonly reason: string | null;
  readonly recoverable: boolean;
  readonly restartRequired: boolean;

  constructor(
    message: string,
    { cause = null, reason = null, recoverable = false, restartRequired = false }: {
      readonly cause?: unknown;
      readonly reason?: string | null;
      readonly recoverable?: boolean;
      readonly restartRequired?: boolean;
    } = {},
  ) {
    super(message, cause === null ? undefined : { cause });
    this.name = 'PlayerProfilePersistenceError';
    this.reason = reason;
    this.recoverable = recoverable;
    this.restartRequired = restartRequired;
    if (recoverable && restartRequired) {
      throw new RangeError('PlayerProfilePersistenceError不能同时可重试并要求重启。');
    }
  }
}

export class PlayerProfileService {
  #definition: PlayerProfileDefinition | null;
  #repository: Readonly<PlayerProfileRepositoryPort> | null;
  #profile: PlayerProfile | null = null;
  #state: PlayerProfileServiceState = PLAYER_PROFILE_SERVICE_STATE.CREATED;
  #operation: PlayerProfileServiceOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(options: PlayerProfileServiceOptions);
  constructor(value: unknown) {
    const options = readExactRecord(value, OPTION_KEYS, 'PlayerProfileService options');
    this.#definition = createPlayerProfileDefinition(options.definition);
    this.#repository = createRepositoryPort(options.repository);
    Object.freeze(this);
  }

  get state(): PlayerProfileServiceState {
    return this.#runOperation('state-read', () => this.#state);
  }

  #rejectReentry(operation: PlayerProfileServiceOperation): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `PlayerProfileService操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #runOperation<T>(operation: PlayerProfileServiceOperation, callback: () => T): T {
    if (this.#operation !== null) this.#rejectReentry(operation);
    this.#operation = operation;
    this.#reentryError = null;
    try {
      return callback();
    } finally {
      this.#operation = null;
    }
  }

  #assertCurrentOperationCommit(
    operation: string,
    restartRequired = false,
    preserveState = false,
  ): void {
    if (this.#operation === null) throw new Error(`${operation}缺少当前操作所有权。`);
    if (this.#reentryError === null) return;
    if (!preserveState) this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
    throw new PlayerProfilePersistenceError(
      `PlayerProfileService ${operation}期间发生Repository回调重入。`,
      {
        cause: this.#reentryError,
        reason: 'repository-callback-reentry',
        restartRequired,
      },
    );
  }

  #assertOpen(): void {
    if (this.#state === PLAYER_PROFILE_SERVICE_STATE.DESTROYED) {
      throw new Error('PlayerProfileService 已销毁。');
    }
    if (this.#state === PLAYER_PROFILE_SERVICE_STATE.FAILED) {
      throw new Error('PlayerProfileService 已失败关闭。');
    }
    if (this.#state !== PLAYER_PROFILE_SERVICE_STATE.OPEN) {
      throw new Error('PlayerProfileService 尚未打开。');
    }
  }

  #definitionOrThrow(): PlayerProfileDefinition {
    if (this.#definition === null) throw new Error('PlayerProfileService 已销毁。');
    return this.#definition;
  }

  #repositoryOrThrow(): Readonly<PlayerProfileRepositoryPort> {
    if (this.#repository === null) throw new Error('PlayerProfileService 已销毁。');
    return this.#repository;
  }

  #profileOrThrow(): PlayerProfile {
    if (this.#profile === null) throw new Error('PlayerProfileService 尚未打开。');
    return this.#profile;
  }

  #validatePublishedProfile(value: unknown): PlayerProfile {
    return createPlayerProfile(this.#definitionOrThrow(), value);
  }

  #renewLeaseInsideOperation(): void {
    const repository = this.#repositoryOrThrow();
    try {
      const renewed = repository.renewLease();
      this.#assertCurrentOperationCommit('租约续租');
      if (renewed === true) return;
      throw new PlayerProfilePersistenceError('PlayerProfile 租约续租暂未确认。', {
        reason: 'lease-renewal-unconfirmed',
        recoverable: true,
      });
    } catch (error) {
      this.#assertCurrentOperationCommit('租约续租');
      if (error instanceof PlayerProfilePersistenceError) throw error;
      const recoverable = !(error instanceof PlayerProfileIndeterminateWriteError);
      if (!recoverable) this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
      throw new PlayerProfilePersistenceError(
        recoverable ? 'PlayerProfile 租约续租暂时失败。' : 'PlayerProfile 租约已丢失。',
        {
          cause: error,
          reason: recoverable ? 'lease-renewal-failed' : 'lease-lost',
          recoverable,
          restartRequired: !recoverable,
        },
      );
    }
  }

  #commit(
    next: PlayerProfile,
    message: string,
    idempotencyGrantId: string | null = null,
  ): Readonly<{ readonly profile: PlayerProfile; readonly duplicate: boolean }> {
    this.#assertOpen();
    this.#renewLeaseInsideOperation();
    const repository = this.#repositoryOrThrow();
    const before = this.#profileOrThrow();
    let rawCommit: unknown;
    try {
      rawCommit = repository.compareAndSet(next, before.revision);
      this.#assertCurrentOperationCommit('CAS提交', true);
    } catch (error) {
      if (this.#reentryError === null) {
        if (error instanceof PlayerProfileIndeterminateWriteError) {
          this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
          throw new PlayerProfilePersistenceError(`${message}写入结果无法确认。`, {
            cause: error,
            reason: error.code,
            restartRequired: true,
          });
        }
        if (error instanceof PlayerProfileFutureSchemaError
          || error instanceof PlayerProfileSaveConflictError) {
          this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
          throw new PlayerProfilePersistenceError(`${message}存档身份冲突。`, {
            cause: error,
            reason: error.code,
          });
        }
        if (error instanceof PlayerProfileRepositoryBusyError) {
          throw new PlayerProfilePersistenceError(`${message}暂时被其他持有者占用。`, {
            cause: error,
            reason: error.code,
            recoverable: true,
          });
        }
      }
      let rawPublished: unknown;
      try {
        rawPublished = repository.getSnapshot();
      } catch (readbackError) {
        this.#assertCurrentOperationCommit('CAS异常后读回', true);
        if (readbackError instanceof PlayerProfileIndeterminateWriteError) {
          this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
          throw new PlayerProfilePersistenceError(`${message}冲突后存档状态无法确认。`, {
            cause: readbackError,
            reason: readbackError.code,
            restartRequired: true,
          });
        }
        if (readbackError instanceof PlayerProfileFutureSchemaError
          || readbackError instanceof PlayerProfileSaveConflictError) {
          this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
          throw new PlayerProfilePersistenceError(`${message}读回存档身份冲突。`, {
            cause: readbackError,
            reason: readbackError.code,
          });
        }
        this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
        throw new PlayerProfilePersistenceError(`${message}写入结果无法确认。`, {
          cause: readbackError,
          reason: 'write-indeterminate',
          restartRequired: true,
        });
      }
      let published: PlayerProfile;
      try {
        published = this.#validatePublishedProfile(rawPublished);
      } catch (readbackError) {
        this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
        if (readbackError instanceof PlayerProfilePersistenceError) throw readbackError;
        throw new PlayerProfilePersistenceError(`${message}读回快照结构无效。`, {
          cause: readbackError,
          reason: 'write-readback-invalid',
        });
      }
      this.#profile = published;
      this.#assertCurrentOperationCommit('CAS异常后读回', true);
      if (sameProfile(published, next)) {
        return Object.freeze({ profile: published, duplicate: false });
      }
      if (idempotencyGrantId !== null
        && published.progression.committedGrantIds.includes(idempotencyGrantId)) {
        return Object.freeze({ profile: published, duplicate: true });
      }
      throw new PlayerProfilePersistenceError(`${message}保存失败。`, {
        cause: error,
        reason: sameProfile(published, before)
          ? 'write-rejected-with-unchanged-profile'
          : 'concurrent-profile-change',
        recoverable: true,
      });
    }

    let commit: ReturnType<typeof normalizeCommitResult>;
    try {
      commit = normalizeCommitResult(rawCommit);
    } catch (error) {
      this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
      throw new PlayerProfilePersistenceError('PlayerProfile Repository 返回了无效提交结果。', {
        cause: error,
      });
    }
    if (!commit.committed) {
      let rawPublished: unknown;
      try {
        rawPublished = repository.getSnapshot();
        this.#assertCurrentOperationCommit('CAS冲突读回');
      } catch (readbackError) {
        this.#assertCurrentOperationCommit('CAS冲突读回');
        if (readbackError instanceof PlayerProfileFutureSchemaError
          || readbackError instanceof PlayerProfileSaveConflictError) {
          this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
          throw new PlayerProfilePersistenceError(`${message}冲突后存档身份冲突。`, {
            cause: readbackError,
            reason: readbackError.code,
          });
        }
        throw new PlayerProfilePersistenceError(`${message}冲突后快照暂不可读。`, {
          cause: readbackError,
          reason: 'conflict-snapshot-unavailable',
          recoverable: true,
        });
      }
      let published: PlayerProfile;
      try {
        published = this.#validatePublishedProfile(rawPublished);
      } catch (readbackError) {
        this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
        if (readbackError instanceof PlayerProfilePersistenceError) throw readbackError;
        throw new PlayerProfilePersistenceError(`${message}冲突后快照结构无效。`, {
          cause: readbackError,
          reason: 'conflict-snapshot-invalid',
        });
      }
      this.#profile = published;
      if (idempotencyGrantId !== null
        && published.progression.committedGrantIds.includes(idempotencyGrantId)) {
        return Object.freeze({ profile: published, duplicate: true });
      }
      if (sameProfile(published, next)) {
        return Object.freeze({ profile: published, duplicate: false });
      }
      throw new PlayerProfilePersistenceError(`${message}未提交。`, {
        reason: commit.reason,
        recoverable: true,
      });
    }
    let rawPublished: unknown;
    try {
      rawPublished = repository.getSnapshot();
      this.#assertCurrentOperationCommit('提交后读回', true);
    } catch (error) {
      this.#assertCurrentOperationCommit('提交后读回', true);
      this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
      if (error instanceof PlayerProfileFutureSchemaError
        || error instanceof PlayerProfileSaveConflictError) {
        throw new PlayerProfilePersistenceError('PlayerProfile 提交后存档身份冲突。', {
          cause: error,
          reason: error.code,
        });
      }
      throw new PlayerProfilePersistenceError('PlayerProfile 提交后的读回失败。', {
        cause: error,
        reason: 'committed-readback-unavailable',
        restartRequired: true,
      });
    }
    let published: PlayerProfile;
    try {
      published = this.#validatePublishedProfile(rawPublished);
    } catch (error) {
      this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
      if (error instanceof PlayerProfilePersistenceError) throw error;
      throw new PlayerProfilePersistenceError('PlayerProfile 提交后的读回结构无效。', {
        cause: error,
        reason: 'committed-readback-invalid',
      });
    }
    this.#profile = published;
    if (sameProfile(published, next)) {
      return Object.freeze({ profile: published, duplicate: false });
    }
    if (idempotencyGrantId !== null
      && published.progression.committedGrantIds.includes(idempotencyGrantId)) {
      return Object.freeze({ profile: published, duplicate: true });
    }
    this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
    throw new PlayerProfilePersistenceError('PlayerProfile 提交后的读回快照不一致。', {
      reason: 'committed-readback-mismatch',
    });
  }

  open(): PlayerProfile {
    return this.#runOperation('open', () => {
      if (this.#state === PLAYER_PROFILE_SERVICE_STATE.DESTROYED) {
        throw new Error('PlayerProfileService 已销毁。');
      }
      if (this.#state === PLAYER_PROFILE_SERVICE_STATE.FAILED) {
        throw new Error('PlayerProfileService 已失败关闭。');
      }
      if (this.#state === PLAYER_PROFILE_SERVICE_STATE.OPEN) return this.#profileOrThrow();
      let rawProfile: unknown;
      try {
        rawProfile = this.#repositoryOrThrow().open();
      } catch (error) {
        this.#assertCurrentOperationCommit('打开');
        throw error;
      }
      this.#assertCurrentOperationCommit('打开');
      const profile = this.#validatePublishedProfile(rawProfile);
      this.#profile = profile;
      this.#state = PLAYER_PROFILE_SERVICE_STATE.OPEN;
      return profile;
    });
  }

  getSnapshot(): PlayerProfile {
    return this.#runOperation('snapshot-read', () => {
      this.#assertOpen();
      return this.#profileOrThrow();
    });
  }

  getLastKnownSnapshot(): PlayerProfile {
    return this.#runOperation('last-known-snapshot-read', () => {
      if (this.#state === PLAYER_PROFILE_SERVICE_STATE.DESTROYED) {
        throw new Error('PlayerProfileService 已销毁。');
      }
      return this.#profileOrThrow();
    });
  }

  renewLease(): true {
    return this.#runOperation('renew-lease', () => {
      this.#assertOpen();
      this.#renewLeaseInsideOperation();
      return true;
    });
  }

  selectCharacter(characterIdValue: unknown): PlayerProfile {
    return this.#runOperation('select-character', () => {
      this.#assertOpen();
      const characterId = assertNonEmptyString(characterIdValue, 'characterId');
      const current = this.#profileOrThrow();
      if (characterId === current.selection.characterId) return current;
      const next = advancePlayerProfile(this.#definitionOrThrow(), current, {
        selection: { ...current.selection, characterId },
      });
      return this.#commit(next, 'PlayerProfile 角色选择').profile;
    });
  }

  commitProgressionGrant(grantValue: unknown): Readonly<{
    committed: boolean;
    duplicate: boolean;
    profile: PlayerProfile;
  }> {
    return this.#runOperation('commit-progression-grant', () => {
      this.#assertOpen();
      const grant = normalizeProgressionGrant(grantValue);
      const current = this.#profileOrThrow();
      if (current.progression.committedGrantIds.includes(grant.grantId)) {
        return Object.freeze({ committed: false, duplicate: true, profile: current });
      }
      const definition = this.#definitionOrThrow();
      const experience = current.progression.experience + grant.experienceDelta;
      if (!Number.isSafeInteger(experience) || experience > definition.limits.maxExperience) {
        throw new RangeError('PlayerProfile progression grant 会使经验超出上限。');
      }
      const unlocks: PlayerProfile['unlocks'] = Object.freeze({
        characterIds: mergeStringSet(current.unlocks.characterIds, grant.unlocks.characterIds),
        appearanceIds: mergeStringSet(current.unlocks.appearanceIds, grant.unlocks.appearanceIds),
        equipmentIds: mergeStringSet(current.unlocks.equipmentIds, grant.unlocks.equipmentIds),
        mapIds: mergeStringSet(current.unlocks.mapIds, grant.unlocks.mapIds),
      });
      const next = advancePlayerProfile(definition, current, {
        progression: {
          experience,
          // Keep the complete bounded idempotency history. Retaining only the
          // latest result would allow an older authoritative result to be paid
          // again after one intervening match.
          committedGrantIds: [...current.progression.committedGrantIds, grant.grantId],
        },
        unlocks,
      });
      const commit = this.#commit(next, 'PlayerProfile 奖励', grant.grantId);
      return Object.freeze({
        committed: !commit.duplicate,
        duplicate: commit.duplicate,
        profile: commit.profile,
      });
    });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#state === PLAYER_PROFILE_SERVICE_STATE.DESTROYED
        && this.#repository === null) return;
      try {
        this.#repositoryOrThrow().destroy();
      } catch (error) {
        this.#assertCurrentOperationCommit('销毁');
        throw error;
      }
      this.#assertCurrentOperationCommit('销毁');
      this.#repository = null;
      this.#definition = null;
      this.#profile = null;
      this.#state = PLAYER_PROFILE_SERVICE_STATE.DESTROYED;
    });
  }
}

export const PLAYER_PROFILE_SERVICE_OPERATION_POLICY = Object.freeze({
  operationGuardPrecedesStateAndInputValidation: true as const,
  repositoryPortsCheckedBeforeBusinessProgress: true as const,
  ambiguousCompareAndSetReadbackCommitsBeforeReentryRejection: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  repositoryCallbacksCheckedBeforeProfilePublication: true as const,
  destroyCallbackConfirmedBeforeOwnershipRelease: true as const,
  publicStateAndSnapshotsRejectOperationIntermediateState: true as const,
  destroyWatermarkPrecedesReentryRejection: true as const,
  validationStatus: 'not-run' as const,
});
