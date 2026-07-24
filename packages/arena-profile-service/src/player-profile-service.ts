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
  PlayerProfileIndeterminateWriteError,
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

  constructor(
    message: string,
    { cause = null, reason = null, recoverable = false }: {
      readonly cause?: unknown;
      readonly reason?: string | null;
      readonly recoverable?: boolean;
    } = {},
  ) {
    super(message, cause === null ? undefined : { cause });
    this.name = 'PlayerProfilePersistenceError';
    this.reason = reason;
    this.recoverable = recoverable;
  }
}

export class PlayerProfileService {
  #definition: PlayerProfileDefinition | null;
  #repository: Readonly<PlayerProfileRepositoryPort> | null;
  #profile: PlayerProfile | null = null;
  #state: PlayerProfileServiceState = PLAYER_PROFILE_SERVICE_STATE.CREATED;
  #transitioning = false;

  constructor(options: PlayerProfileServiceOptions);
  constructor(value: unknown) {
    const options = readExactRecord(value, OPTION_KEYS, 'PlayerProfileService options');
    this.#definition = createPlayerProfileDefinition(options.definition);
    this.#repository = createRepositoryPort(options.repository);
    Object.freeze(this);
  }

  get state(): PlayerProfileServiceState {
    return this.#state;
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
    if (this.#transitioning) throw new Error('PlayerProfileService 操作不可重入。');
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

  #validatePublishedProfile(value: unknown, expected: PlayerProfile | null = null): PlayerProfile {
    const profile = createPlayerProfile(this.#definitionOrThrow(), value);
    if (expected !== null && !sameProfile(profile, expected)) {
      this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
      throw new PlayerProfilePersistenceError('PlayerProfile 提交后的读回快照不一致。');
    }
    return profile;
  }

  #renewLeaseInsideTransition(): void {
    const repository = this.#repositoryOrThrow();
    try {
      if (repository.renewLease() === true) return;
      throw new PlayerProfilePersistenceError('PlayerProfile 租约续租暂未确认。', {
        reason: 'lease-renewal-unconfirmed',
        recoverable: true,
      });
    } catch (error) {
      if (error instanceof PlayerProfilePersistenceError) throw error;
      const recoverable = !(error instanceof PlayerProfileIndeterminateWriteError);
      if (!recoverable) this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
      throw new PlayerProfilePersistenceError(
        recoverable ? 'PlayerProfile 租约续租暂时失败。' : 'PlayerProfile 租约已丢失。',
        {
          cause: error,
          reason: recoverable ? 'lease-renewal-failed' : 'lease-lost',
          recoverable,
        },
      );
    }
  }

  #commit(next: PlayerProfile, message: string): PlayerProfile {
    this.#assertOpen();
    this.#transitioning = true;
    try {
      this.#renewLeaseInsideTransition();
      const repository = this.#repositoryOrThrow();
      const before = this.#profileOrThrow();
      let rawCommit: unknown;
      try {
        rawCommit = repository.compareAndSet(next, before.revision);
      } catch (error) {
        let repositoryStillReadable = false;
        try {
          repositoryStillReadable = sameProfile(
            this.#validatePublishedProfile(repository.getSnapshot()),
            before,
          );
        } catch {
          repositoryStillReadable = false;
        }
        if (!repositoryStillReadable) this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
        throw new PlayerProfilePersistenceError(`${message}保存失败。`, {
          cause: error,
          recoverable: repositoryStillReadable,
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
        throw new PlayerProfilePersistenceError(`${message}未提交。`, {
          reason: commit.reason,
          recoverable: true,
        });
      }
      try {
        this.#profile = this.#validatePublishedProfile(repository.getSnapshot(), next);
      } catch (error) {
        this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
        if (error instanceof PlayerProfilePersistenceError) throw error;
        throw new PlayerProfilePersistenceError('PlayerProfile 提交后的读回失败。', {
          cause: error,
        });
      }
      return this.#profile;
    } finally {
      this.#transitioning = false;
    }
  }

  open(): PlayerProfile {
    if (this.#state === PLAYER_PROFILE_SERVICE_STATE.DESTROYED) {
      throw new Error('PlayerProfileService 已销毁。');
    }
    if (this.#state === PLAYER_PROFILE_SERVICE_STATE.FAILED) {
      throw new Error('PlayerProfileService 已失败关闭。');
    }
    if (this.#state === PLAYER_PROFILE_SERVICE_STATE.OPEN) return this.#profileOrThrow();
    if (this.#transitioning) throw new Error('PlayerProfileService 打开不可重入。');
    this.#transitioning = true;
    try {
      const profile = this.#validatePublishedProfile(this.#repositoryOrThrow().open());
      this.#profile = profile;
      this.#state = PLAYER_PROFILE_SERVICE_STATE.OPEN;
      return profile;
    } finally {
      this.#transitioning = false;
    }
  }

  getSnapshot(): PlayerProfile {
    this.#assertOpen();
    return this.#profileOrThrow();
  }

  renewLease(): true {
    this.#assertOpen();
    this.#transitioning = true;
    try {
      this.#renewLeaseInsideTransition();
      return true;
    } finally {
      this.#transitioning = false;
    }
  }

  selectCharacter(characterIdValue: unknown): PlayerProfile {
    this.#assertOpen();
    const characterId = assertNonEmptyString(characterIdValue, 'characterId');
    const current = this.#profileOrThrow();
    if (characterId === current.selection.characterId) return current;
    const next = advancePlayerProfile(this.#definitionOrThrow(), current, {
      selection: { ...current.selection, characterId },
    });
    return this.#commit(next, 'PlayerProfile 角色选择');
  }

  commitProgressionGrant(grantValue: unknown): Readonly<{
    committed: boolean;
    duplicate: boolean;
    profile: PlayerProfile;
  }> {
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
        // ProductSession only permits one unsettled result. The profile revision
        // distinguishes a future legitimate result with the same seed/hash.
        committedGrantIds: [grant.grantId],
      },
      unlocks,
    });
    return Object.freeze({
      committed: true,
      duplicate: false,
      profile: this.#commit(next, 'PlayerProfile 奖励'),
    });
  }

  destroy(): void {
    if (this.#state === PLAYER_PROFILE_SERVICE_STATE.DESTROYED && this.#repository === null) return;
    if (this.#transitioning) throw new Error('操作期间不能销毁 PlayerProfileService。');
    this.#transitioning = true;
    try {
      this.#repositoryOrThrow().destroy();
      this.#repository = null;
      this.#definition = null;
      this.#profile = null;
      this.#state = PLAYER_PROFILE_SERVICE_STATE.DESTROYED;
    } finally {
      this.#transitioning = false;
    }
  }
}
