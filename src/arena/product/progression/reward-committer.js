import { assertNonEmptyString } from '../../rules/definition-utils.js';
import { createPlayerProfileDefinition } from '../profile/player-profile-definition.js';
import { createProgressionRegistry } from './progression-registry.js';
import { resolveMatchReward } from './reward-resolver.js';

function validateProfileService(value) {
  if (!value || typeof value !== 'object') throw new TypeError('RewardCommitter 需要 ProfileService。');
  for (const method of ['getSnapshot', 'commitProgressionGrant']) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`RewardCommitter ProfileService 缺少 ${method}()。`);
    }
  }
  return value;
}

export class RewardCommitter {
  #registry;
  #rewardDefinitionId;
  #profileDefinition;
  #profileService;
  #committing;
  #lastResult;
  #lastOutcome;

  constructor({ registry, rewardDefinitionId, profileDefinition, profileService }) {
    this.#registry = createProgressionRegistry(registry);
    this.#rewardDefinitionId = assertNonEmptyString(
      rewardDefinitionId,
      'RewardCommitter.rewardDefinitionId',
    );
    if (!this.#registry.getReward(this.#rewardDefinitionId)) {
      throw new RangeError('RewardCommitter 奖励 Definition 不存在。');
    }
    this.#profileDefinition = createPlayerProfileDefinition(profileDefinition);
    this.#profileService = validateProfileService(profileService);
    this.#committing = false;
    this.#lastResult = null;
    this.#lastOutcome = null;
    Object.freeze(this);
  }

  commit(result) {
    if (this.#committing) throw new Error('RewardCommitter.commit() 不可重入。');
    if (this.#lastOutcome !== null && this.#lastResult === result) return this.#lastOutcome;
    this.#committing = true;
    try {
      const grant = resolveMatchReward({
        registry: this.#registry,
        rewardDefinitionId: this.#rewardDefinitionId,
        profileDefinition: this.#profileDefinition,
        profile: this.#profileService.getSnapshot(),
        result,
      });
      const commit = this.#profileService.commitProgressionGrant({
        grantId: grant.grantId,
        experienceDelta: grant.experienceDelta,
        unlocks: grant.unlocks,
      });
      const outcome = Object.freeze({
        grant,
        committed: commit.committed,
        duplicate: commit.duplicate,
        profile: commit.profile,
      });
      this.#lastResult = result;
      this.#lastOutcome = outcome;
      return outcome;
    } finally {
      this.#committing = false;
    }
  }
}
