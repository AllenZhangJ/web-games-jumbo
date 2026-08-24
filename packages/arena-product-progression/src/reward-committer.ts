import {
  assertNonEmptyString,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createPlayerProfile,
  createPlayerProfileDefinition,
  type PlayerProfile,
  type PlayerProfileDefinition,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  createProgressionRegistry,
  type ProgressionRegistry,
  type RewardGrant,
} from '@number-strategy-jump/arena-progression';
import { readExactOptions } from './options.js';
import { resolveMatchReward } from './reward-resolver.js';
import {
  assertSynchronousRewardPortResult,
  captureSynchronousRewardDataMethod,
  type SynchronousRewardPortMethod,
} from './synchronous-reward-port-boundary.js';

export interface ProfileProgressionCommitPort {
  getSnapshot(): unknown;
  commitProgressionGrant(grant: unknown): unknown;
}

export interface RewardCommitterOptions {
  readonly registry: unknown;
  readonly rewardDefinitionId: unknown;
  readonly profileDefinition: unknown;
  readonly profileService: unknown;
}

export interface RewardCommitOutcome {
  readonly grant: RewardGrant;
  readonly committed: boolean;
  readonly duplicate: boolean;
  readonly profile: PlayerProfile;
}

type PortMethod = SynchronousRewardPortMethod;
const OPTION_KEYS = new Set(['registry', 'rewardDefinitionId', 'profileDefinition', 'profileService']);
const COMMIT_KEYS = new Set(['committed', 'duplicate', 'profile']);

function createProfilePort(value: unknown): Readonly<{
  getSnapshot: PortMethod;
  commitProgressionGrant: PortMethod;
}> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('RewardCommitter 需要 ProfileService。');
  }
  return Object.freeze({
    getSnapshot: captureSynchronousRewardDataMethod(
      value,
      'getSnapshot',
      'RewardCommitter ProfileService',
    ),
    commitProgressionGrant: captureSynchronousRewardDataMethod(
      value,
      'commitProgressionGrant',
      'RewardCommitter ProfileService',
    ),
  });
}

function sameProfile(left: PlayerProfile, right: PlayerProfile): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isExplicitlyRecoverable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const descriptor = Object.getOwnPropertyDescriptor(error, 'recoverable');
  return Boolean(descriptor && 'value' in descriptor && descriptor.value === true);
}

function containsGrantUnlocks(profile: PlayerProfile, grant: RewardGrant): boolean {
  const keys = [
    'characterIds', 'appearanceIds', 'equipmentIds', 'mapIds',
  ] as const satisfies readonly (keyof PlayerProfile['unlocks'])[];
  return keys.every((key) => (
    grant.unlocks[key].every((id: string) => profile.unlocks[key].includes(id))
  ));
}

function normalizeCommitOutcome(
  value: unknown,
  definition: PlayerProfileDefinition,
  before: PlayerProfile,
  grant: RewardGrant,
): RewardCommitOutcome {
  const record = assertPlainRecord(value, 'RewardCommitter commit result');
  const options = readExactOptions(record, COMMIT_KEYS, 'RewardCommitter commit result');
  if (typeof options.committed !== 'boolean' || typeof options.duplicate !== 'boolean') {
    throw new TypeError('RewardCommitter commit result 状态必须是布尔值。');
  }
  if (options.committed === options.duplicate) {
    throw new RangeError('RewardCommitter commit result 必须且只能是 committed 或 duplicate。');
  }
  const profile = createPlayerProfile(definition, options.profile);
  if (!profile.progression.committedGrantIds.includes(grant.grantId)) {
    throw new RangeError('RewardCommitter commit result 未记录当前 grant。');
  }
  if (!containsGrantUnlocks(profile, grant)) {
    throw new RangeError('RewardCommitter commit result 缺少已授予解锁。');
  }
  if (options.committed) {
    if (
      profile.revision !== before.revision + 1
      || profile.progression.experience !== before.progression.experience + grant.experienceDelta
    ) {
      throw new RangeError('RewardCommitter commit result 与本次奖励变更不一致。');
    }
  } else if (!sameProfile(profile, before)) {
    throw new RangeError('RewardCommitter duplicate result 不得改变 Profile。');
  }
  return Object.freeze({
    grant,
    committed: options.committed,
    duplicate: options.duplicate,
    profile,
  });
}

export class RewardCommitter {
  readonly #registry: ProgressionRegistry;
  readonly #rewardDefinitionId: string;
  readonly #profileDefinition: PlayerProfileDefinition;
  readonly #profilePort: Readonly<{
    getSnapshot: PortMethod;
    commitProgressionGrant: PortMethod;
  }>;
  #committing = false;
  #failed = false;
  #lastAuthorityHash: string | null = null;
  #lastOutcome: RewardCommitOutcome | null = null;

  constructor(options: RewardCommitterOptions);
  constructor(value: unknown) {
    const options = readExactOptions(value, OPTION_KEYS, 'RewardCommitter options');
    this.#registry = createProgressionRegistry(options.registry);
    this.#rewardDefinitionId = assertNonEmptyString(
      options.rewardDefinitionId,
      'RewardCommitter.rewardDefinitionId',
    );
    if (!this.#registry.getReward(this.#rewardDefinitionId)) {
      throw new RangeError('RewardCommitter 奖励 Definition 不存在。');
    }
    this.#profileDefinition = createPlayerProfileDefinition(options.profileDefinition);
    this.#profilePort = createProfilePort(options.profileService);
    Object.freeze(this);
  }

  commit(result: unknown): RewardCommitOutcome {
    if (this.#failed) throw new Error('RewardCommitter 已失败关闭。');
    if (this.#committing) throw new Error('RewardCommitter.commit() 不可重入。');
    this.#committing = true;
    try {
      const profile = createPlayerProfile(
        this.#profileDefinition,
        assertSynchronousRewardPortResult(
          this.#profilePort.getSnapshot(),
          'RewardCommitter ProfileService.getSnapshot',
        ),
      );
      const grant = resolveMatchReward({
        registry: this.#registry,
        rewardDefinitionId: this.#rewardDefinitionId,
        profileDefinition: this.#profileDefinition,
        profile,
        result,
      });
      if (
        this.#lastOutcome !== null
        && this.#lastAuthorityHash === grant.resultAuthorityHash
      ) return this.#lastOutcome;
      let rawOutcome: unknown;
      try {
        rawOutcome = assertSynchronousRewardPortResult(
          this.#profilePort.commitProgressionGrant({
            grantId: grant.grantId,
            experienceDelta: grant.experienceDelta,
            unlocks: grant.unlocks,
          }),
          'RewardCommitter ProfileService.commitProgressionGrant',
        );
      } catch (error) {
        if (!isExplicitlyRecoverable(error)) this.#failed = true;
        throw error;
      }
      let outcome: RewardCommitOutcome;
      try {
        outcome = normalizeCommitOutcome(
          rawOutcome,
          this.#profileDefinition,
          profile,
          grant,
        );
      } catch (error) {
        this.#failed = true;
        throw error;
      }
      this.#lastAuthorityHash = grant.resultAuthorityHash;
      this.#lastOutcome = outcome;
      return outcome;
    } finally {
      this.#committing = false;
    }
  }
}
