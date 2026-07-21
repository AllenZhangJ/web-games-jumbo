import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import {
  PlayerProfileIndeterminateWriteError,
  advancePlayerProfile,
  createPlayerProfile,
  createPlayerProfileDefinition,
} from '@number-strategy-jump/arena-profile-contracts';

export const PLAYER_PROFILE_SERVICE_STATE = Object.freeze({
  CREATED: 'created',
  OPEN: 'open',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

const GRANT_KEYS = new Set(['grantId', 'experienceDelta', 'unlocks']);
const UNLOCK_KEYS = new Set(['characterIds', 'appearanceIds', 'equipmentIds', 'mapIds']);

function validateRepository(repository) {
  if (!repository || typeof repository !== 'object') {
    throw new TypeError('PlayerProfileService 需要 Repository。');
  }
  for (const method of ['open', 'getSnapshot', 'renewLease', 'compareAndSet', 'destroy']) {
    if (typeof repository[method] !== 'function') {
      throw new TypeError(`PlayerProfile Repository 缺少 ${method}()。`);
    }
  }
  return repository;
}

function sameProfile(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeProgressionGrant(value) {
  const source = cloneFrozenData(value, 'PlayerProfile progression grant');
  assertKnownKeys(source, GRANT_KEYS, 'PlayerProfile progression grant');
  assertKnownKeys(source.unlocks, UNLOCK_KEYS, 'PlayerProfile progression grant.unlocks');
  const unlocks = {};
  for (const key of UNLOCK_KEYS) {
    if (!Array.isArray(source.unlocks[key])) {
      throw new TypeError(`PlayerProfile progression grant.unlocks.${key} 必须是数组。`);
    }
    unlocks[key] = cloneFrozenStringSet(
      source.unlocks[key],
      `PlayerProfile progression grant.unlocks.${key}`,
    );
  }
  return Object.freeze({
    grantId: assertNonEmptyString(source.grantId, 'PlayerProfile progression grant.grantId'),
    experienceDelta: assertIntegerAtLeast(
      source.experienceDelta,
      0,
      'PlayerProfile progression grant.experienceDelta',
    ),
    unlocks: Object.freeze(unlocks),
  });
}

function mergeStringSet(current, additions) {
  return Object.freeze([...new Set([...current, ...additions])].sort());
}

export class PlayerProfilePersistenceError extends Error {
  constructor(message, { cause = null, reason = null, recoverable = false } = {}) {
    super(message);
    this.name = 'PlayerProfilePersistenceError';
    this.reason = reason;
    this.recoverable = recoverable;
    if (cause !== null) this.cause = cause;
  }
}

export class PlayerProfileService {
  #definition;
  #repository;
  #profile;
  #state;
  #transitioning;

  constructor({ definition: definitionValue, repository }) {
    this.#definition = createPlayerProfileDefinition(definitionValue);
    this.#repository = validateRepository(repository);
    this.#profile = null;
    this.#state = PLAYER_PROFILE_SERVICE_STATE.CREATED;
    this.#transitioning = false;
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #assertOpen() {
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

  #validatePublishedProfile(value, expected = null) {
    const profile = createPlayerProfile(this.#definition, value);
    if (expected && !sameProfile(profile, expected)) {
      this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
      throw new PlayerProfilePersistenceError('PlayerProfile 提交后的读回快照不一致。');
    }
    return profile;
  }

  #commit(next, message) {
    this.renewLease();
    this.#transitioning = true;
    try {
      let commit;
      try {
        commit = this.#repository.compareAndSet(next, this.#profile.revision);
      } catch (error) {
        let repositoryStillReadable = false;
        try {
          repositoryStillReadable = sameProfile(
            this.#validatePublishedProfile(this.#repository.getSnapshot()),
            this.#profile,
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
      if (!commit || typeof commit !== 'object' || typeof commit.committed !== 'boolean') {
        this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
        throw new PlayerProfilePersistenceError('PlayerProfile Repository 返回了无效提交结果。');
      }
      if (!commit.committed) {
        throw new PlayerProfilePersistenceError(`${message}未提交。`, {
          reason: typeof commit.reason === 'string' ? commit.reason : 'unknown',
          recoverable: true,
        });
      }
      try {
        this.#profile = this.#validatePublishedProfile(this.#repository.getSnapshot(), next);
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

  open() {
    if (this.#state === PLAYER_PROFILE_SERVICE_STATE.DESTROYED) {
      throw new Error('PlayerProfileService 已销毁。');
    }
    if (this.#state === PLAYER_PROFILE_SERVICE_STATE.FAILED) {
      throw new Error('PlayerProfileService 已失败关闭。');
    }
    if (this.#state === PLAYER_PROFILE_SERVICE_STATE.OPEN) return this.#profile;
    if (this.#transitioning) throw new Error('PlayerProfileService 打开不可重入。');
    this.#transitioning = true;
    try {
      this.#profile = this.#validatePublishedProfile(this.#repository.open());
      this.#state = PLAYER_PROFILE_SERVICE_STATE.OPEN;
      return this.#profile;
    } finally {
      this.#transitioning = false;
    }
  }

  getSnapshot() {
    this.#assertOpen();
    return this.#profile;
  }

  renewLease() {
    this.#assertOpen();
    this.#transitioning = true;
    try {
      try {
        if (this.#repository.renewLease() === true) return true;
        throw new PlayerProfilePersistenceError('PlayerProfile 租约续租暂未确认。', {
          reason: 'lease-renewal-unconfirmed',
          recoverable: true,
        });
      } catch (error) {
        if (error instanceof PlayerProfilePersistenceError) throw error;
        const recoverable = !(error instanceof PlayerProfileIndeterminateWriteError);
        if (!recoverable) this.#state = PLAYER_PROFILE_SERVICE_STATE.FAILED;
        throw new PlayerProfilePersistenceError(
          recoverable
            ? 'PlayerProfile 租约续租暂时失败。'
            : 'PlayerProfile 租约已丢失。',
          {
            cause: error,
            reason: recoverable ? 'lease-renewal-failed' : 'lease-lost',
            recoverable,
          },
        );
      }
    } finally {
      this.#transitioning = false;
    }
  }

  selectCharacter(characterIdValue) {
    this.#assertOpen();
    const characterId = assertNonEmptyString(characterIdValue, 'characterId');
    if (characterId === this.#profile.selection.characterId) return this.#profile;
    const next = advancePlayerProfile(this.#definition, this.#profile, {
      selection: { ...this.#profile.selection, characterId },
    });
    return this.#commit(next, 'PlayerProfile 角色选择');
  }

  commitProgressionGrant(grantValue) {
    this.#assertOpen();
    const grant = normalizeProgressionGrant(grantValue);
    if (this.#profile.progression.committedGrantIds.includes(grant.grantId)) {
      return Object.freeze({ committed: false, duplicate: true, profile: this.#profile });
    }
    const experience = this.#profile.progression.experience + grant.experienceDelta;
    if (!Number.isSafeInteger(experience) || experience > this.#definition.limits.maxExperience) {
      throw new RangeError('PlayerProfile progression grant 会使经验超出上限。');
    }
    const unlocks = Object.freeze(Object.fromEntries([...UNLOCK_KEYS].map((key) => [
      key,
      mergeStringSet(this.#profile.unlocks[key], grant.unlocks[key]),
    ])));
    const next = advancePlayerProfile(this.#definition, this.#profile, {
      progression: {
        experience,
        // ProductSession only permits one unsettled result. Keeping the latest
        // key provides exact retry idempotency without an unbounded local ledger.
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

  destroy() {
    if (this.#state === PLAYER_PROFILE_SERVICE_STATE.DESTROYED && this.#repository === null) return;
    if (this.#transitioning) throw new Error('操作期间不能销毁 PlayerProfileService。');
    this.#repository.destroy();
    this.#repository = null;
    this.#definition = null;
    this.#profile = null;
    this.#state = PLAYER_PROFILE_SERVICE_STATE.DESTROYED;
  }
}
