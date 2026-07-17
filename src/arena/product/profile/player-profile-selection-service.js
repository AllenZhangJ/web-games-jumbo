import { assertNonEmptyString } from '../../rules/definition-utils.js';
import { advancePlayerProfile, createPlayerProfile } from './player-profile.js';
import { createPlayerProfileDefinition } from './player-profile-definition.js';

export const PLAYER_PROFILE_SELECTION_SERVICE_STATE = Object.freeze({
  CREATED: 'created',
  OPEN: 'open',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

function validateRepository(repository) {
  if (!repository || typeof repository !== 'object') {
    throw new TypeError('PlayerProfileSelectionService 需要 Repository。');
  }
  for (const method of ['open', 'getSnapshot', 'compareAndSet', 'destroy']) {
    if (typeof repository[method] !== 'function') {
      throw new TypeError(`PlayerProfile Repository 缺少 ${method}()。`);
    }
  }
  return repository;
}

export class PlayerProfileSelectionPersistenceError extends Error {
  constructor(message, { cause = null, reason = null } = {}) {
    super(message);
    this.name = 'PlayerProfileSelectionPersistenceError';
    this.reason = reason;
    if (cause !== null) this.cause = cause;
  }
}
export class PlayerProfileSelectionService {
  #definition;
  #repository;
  #profile;
  #state;
  #transitioning;

  constructor({ definition: definitionValue, repository }) {
    this.#definition = createPlayerProfileDefinition(definitionValue);
    this.#repository = validateRepository(repository);
    this.#profile = null;
    this.#state = PLAYER_PROFILE_SELECTION_SERVICE_STATE.CREATED;
    this.#transitioning = false;
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #assertOpen() {
    if (this.#state === PLAYER_PROFILE_SELECTION_SERVICE_STATE.DESTROYED) {
      throw new Error('PlayerProfileSelectionService 已销毁。');
    }
    if (this.#state === PLAYER_PROFILE_SELECTION_SERVICE_STATE.FAILED) {
      throw new Error('PlayerProfileSelectionService 已失败关闭。');
    }
    if (this.#state !== PLAYER_PROFILE_SELECTION_SERVICE_STATE.OPEN) {
      throw new Error('PlayerProfileSelectionService 尚未打开。');
    }
    if (this.#transitioning) {
      throw new Error('PlayerProfileSelectionService 操作不可重入。');
    }
  }

  #validatePublishedProfile(value, expected = null) {
    const profile = createPlayerProfile(this.#definition, value);
    if (expected && (
      profile.revision !== expected.revision
      || profile.selection.characterId !== expected.selection.characterId
      || profile.selection.appearanceId !== expected.selection.appearanceId
    )) {
      this.#state = PLAYER_PROFILE_SELECTION_SERVICE_STATE.FAILED;
      throw new PlayerProfileSelectionPersistenceError('PlayerProfile 提交后的读回快照不一致。');
    }
    return profile;
  }

  open() {
    if (this.#state === PLAYER_PROFILE_SELECTION_SERVICE_STATE.DESTROYED) {
      throw new Error('PlayerProfileSelectionService 已销毁。');
    }
    if (this.#state === PLAYER_PROFILE_SELECTION_SERVICE_STATE.FAILED) {
      throw new Error('PlayerProfileSelectionService 已失败关闭。');
    }
    if (this.#state === PLAYER_PROFILE_SELECTION_SERVICE_STATE.OPEN) return this.#profile;
    if (this.#transitioning) {
      throw new Error('PlayerProfileSelectionService 打开不可重入。');
    }
    this.#transitioning = true;
    try {
      this.#profile = this.#validatePublishedProfile(this.#repository.open());
      this.#state = PLAYER_PROFILE_SELECTION_SERVICE_STATE.OPEN;
      return this.#profile;
    } finally {
      this.#transitioning = false;
    }
  }

  getSnapshot() {
    this.#assertOpen();
    return this.#profile;
  }

  selectCharacter(characterIdValue) {
    this.#assertOpen();
    const characterId = assertNonEmptyString(characterIdValue, 'characterId');
    if (characterId === this.#profile.selection.characterId) return this.#profile;

    // Build and validate the entire next aggregate before asking storage to mutate.
    const next = advancePlayerProfile(this.#definition, this.#profile, {
      selection: { ...this.#profile.selection, characterId },
    });
    this.#transitioning = true;
    try {
      let commit;
      try {
        commit = this.#repository.compareAndSet(next, this.#profile.revision);
      } catch (error) {
        throw new PlayerProfileSelectionPersistenceError('PlayerProfile 角色选择保存失败。', {
          cause: error,
        });
      }
      if (
        !commit
        || typeof commit !== 'object'
        || typeof commit.committed !== 'boolean'
      ) {
        this.#state = PLAYER_PROFILE_SELECTION_SERVICE_STATE.FAILED;
        throw new PlayerProfileSelectionPersistenceError('PlayerProfile Repository 返回了无效提交结果。');
      }
      if (!commit.committed) {
        throw new PlayerProfileSelectionPersistenceError('PlayerProfile 角色选择未提交。', {
          reason: typeof commit.reason === 'string' ? commit.reason : 'unknown',
        });
      }
      this.#profile = this.#validatePublishedProfile(this.#repository.getSnapshot(), next);
      return this.#profile;
    } finally {
      this.#transitioning = false;
    }
  }

  destroy() {
    if (
      this.#state === PLAYER_PROFILE_SELECTION_SERVICE_STATE.DESTROYED
      && this.#repository === null
    ) return;
    if (this.#transitioning) {
      throw new Error('操作期间不能销毁 PlayerProfileSelectionService。');
    }
    this.#repository.destroy();
    this.#repository = null;
    this.#definition = null;
    this.#profile = null;
    this.#state = PLAYER_PROFILE_SELECTION_SERVICE_STATE.DESTROYED;
  }
}
