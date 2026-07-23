import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MATCH_REWARD_DEFINITION_SCHEMA_VERSION,
  ProgressionRegistry,
  UNLOCK_DEFINITION_SCHEMA_VERSION,
  UNLOCK_KIND,
  createMatchRewardDefinition,
  type UnlockDefinitionValue,
} from '@number-strategy-jump/arena-progression';
import {
  ARENA_V1_MATCH_REWARD_DEFINITION,
  ARENA_V1_MATCH_REWARD_ID,
  ARENA_V1_PLAYER_PROFILE_DEFINITION,
} from '@number-strategy-jump/arena-product-v1-content';
import {
  createProductMatchResult,
  type ProductMatchResult,
} from '@number-strategy-jump/arena-product-contracts';
import {
  advancePlayerProfile,
  createPlayerProfile,
  type PlayerProfile,
} from '@number-strategy-jump/arena-profile-contracts';
import { PlayerProfileService } from '@number-strategy-jump/arena-profile-service';
import {
  RewardCommitter,
  resolveMatchReward,
} from '@number-strategy-jump/arena-product-progression';
import { TEST_MATCH_CONTENT_PUBLIC_VIEW } from './stage8-test-content.js';

interface MatchResultOptions {
  readonly winnerId?: string | null;
  readonly seed?: number;
}

function matchResult({
  winnerId = 'player-1',
  seed = 7,
}: MatchResultOptions = {}): ProductMatchResult {
  return createProductMatchResult({
    matchSeed: seed,
    opponent: {
      id: `opponent-${seed}`,
      displayName: `玩家${seed}`,
      portraitKey: `portrait-${seed}`,
      appearanceKey: `appearance-${seed}`,
    },
    content: TEST_MATCH_CONTENT_PUBLIC_VIEW,
    replay: {
      replaySchemaVersion: 5,
      schemaVersion: 5,
      physicsBackendVersion: 'lightweight-v3',
      configHash: '12345678',
      ruleContentHash: 'abcdef01',
      finalHash: seed.toString(16).padStart(8, '0'),
      matchSeed: seed,
      config: { contentSelection: TEST_MATCH_CONTENT_PUBLIC_VIEW },
      result: {
        winnerId,
        reason: winnerId === null ? 'hard-limit-draw' : 'last-participant-standing',
        isDraw: winnerId === null,
        endedAtTick: 90,
      },
    },
  });
}

function unlock({
  id,
  kind,
  contentId,
  requiredExperience,
  prerequisiteIds = [],
}: Omit<
  UnlockDefinitionValue,
  'schemaVersion' | 'contentVersion' | 'prerequisiteIds'
> & {
  readonly prerequisiteIds?: readonly string[];
}): UnlockDefinitionValue {
  return {
    schemaVersion: UNLOCK_DEFINITION_SCHEMA_VERSION,
    id,
    contentVersion: 1,
    kind,
    contentId,
    requiredExperience,
    prerequisiteIds,
  };
}

function progressionRegistry(
  unlocks: readonly UnlockDefinitionValue[] = [],
): ProgressionRegistry {
  return new ProgressionRegistry({
    rewards: [ARENA_V1_MATCH_REWARD_DEFINITION],
    unlocks,
  });
}

function repositoryHarness() {
  let profile = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION);
  let commits = 0;
  return {
    get commits() { return commits; },
    open() { return profile; },
    getSnapshot() { return profile; },
    renewLease() { return true; },
    compareAndSet(next: unknown, expectedRevision: unknown) {
      assert.equal(expectedRevision, profile.revision);
      commits += 1;
      profile = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION, next);
      return { committed: true, reason: null, headUpdated: true };
    },
    destroy() {},
  };
}

test('Stage 8 reward definitions and registries reject ambiguous or cyclic content', () => {
  const base = unlock({
    id: 'base',
    kind: UNLOCK_KIND.APPEARANCE,
    contentId: 'paper-cape',
    requiredExperience: 100,
  });
  const registry = progressionRegistry([base]);
  assert.equal(Object.isFrozen(registry.getRewards()), true);
  const reward = registry.getReward(ARENA_V1_MATCH_REWARD_ID);
  const baseUnlock = registry.getUnlock('base');
  assert.ok(reward);
  assert.ok(baseUnlock);
  assert.equal(reward.completionExperience, 100);
  assert.equal(baseUnlock.contentId, 'paper-cape');
  assert.throws(() => createMatchRewardDefinition({
    ...ARENA_V1_MATCH_REWARD_DEFINITION,
    schemaVersion: MATCH_REWARD_DEFINITION_SCHEMA_VERSION,
    completionExperience: Number.MAX_SAFE_INTEGER,
  }), /总和超出/);

  assert.throws(() => progressionRegistry([base, { ...base, id: 'duplicate-target' }]), /重复解锁目标/);
  assert.throws(() => progressionRegistry([{
    ...base,
    prerequisiteIds: ['missing'],
  }]), /缺少解锁依赖/);
  assert.throws(() => progressionRegistry([
    { ...base, id: 'cycle-a', prerequisiteIds: ['cycle-b'] },
    {
      ...base,
      id: 'cycle-b',
      contentId: 'paper-cape-b',
      prerequisiteIds: ['cycle-a'],
    },
  ]), /存在环/);
});

test('RewardResolver applies completion, winner, draw and cap rules deterministically', () => {
  const registry = progressionRegistry();
  const initial = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION);
  const resolve = (
    result: ProductMatchResult,
    profile: PlayerProfile = initial,
  ) => resolveMatchReward({
    registry,
    rewardDefinitionId: ARENA_V1_MATCH_REWARD_ID,
    profileDefinition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
    profile,
    result,
  });
  const win = resolve(matchResult({ winnerId: 'player-1', seed: 1 }));
  const loss = resolve(matchResult({ winnerId: 'player-2', seed: 2 }));
  const draw = resolve(matchResult({ winnerId: null, seed: 3 }));
  assert.equal(win.experienceDelta, 125);
  assert.equal(loss.experienceDelta, 100);
  assert.equal(draw.experienceDelta, 110);
  assert.equal(win.grantId, `arena-result:r0:00000001:${matchResult({ winnerId: 'player-1', seed: 1 }).authorityHash}`);
  assert.deepEqual(resolve(matchResult({ winnerId: 'player-1', seed: 1 })), win);
  assert.throws(() => resolve({
    ...matchResult({ winnerId: 'player-1', seed: 1 }),
    authorityResult: {
      ...matchResult({ winnerId: 'player-1', seed: 1 }).authorityResult,
      winnerId: 'player-2',
    },
  }), /authorityHash 与权威内容不一致/);

  const nearlyCapped = advancePlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION, initial, {
    progression: {
      ...initial.progression,
      experience: ARENA_V1_PLAYER_PROFILE_DEFINITION.limits.maxExperience - 5,
    },
  });
  assert.equal(resolve(matchResult({ seed: 4 }), nearlyCapped).experienceDelta, 5);
});

test('RewardResolver resolves prerequisite chains to a fixed point in one grant', () => {
  const registry = progressionRegistry([
    unlock({
      id: 'a-dependent',
      kind: UNLOCK_KIND.CHARACTER,
      contentId: 'runner-two',
      requiredExperience: 100,
      prerequisiteIds: ['z-base'],
    }),
    unlock({
      id: 'z-base',
      kind: UNLOCK_KIND.APPEARANCE,
      contentId: 'paper-cape',
      requiredExperience: 100,
    }),
  ]);
  const grant = resolveMatchReward({
    registry,
    rewardDefinitionId: ARENA_V1_MATCH_REWARD_ID,
    profileDefinition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
    profile: createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION),
    result: matchResult({ winnerId: 'player-2' }),
  });
  assert.deepEqual(grant.unlocks.appearanceIds, ['paper-cape']);
  assert.deepEqual(grant.unlocks.characterIds, ['runner-two']);
});

test('RewardCommitter and PlayerProfileService commit one result exactly once across retries', () => {
  const repository = repositoryHarness();
  const profileService = new PlayerProfileService({
    definition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
    repository,
  });
  profileService.open();
  const options = {
    registry: progressionRegistry(),
    rewardDefinitionId: ARENA_V1_MATCH_REWARD_ID,
    profileDefinition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
    profileService,
  };
  const result = matchResult({ winnerId: 'player-1', seed: 50 });
  const committer = new RewardCommitter(options);
  for (let index = 0; index < 1_000; index += 1) committer.commit(result);
  assert.equal(repository.commits, 1);
  assert.equal(profileService.getSnapshot().progression.experience, 125);
  assert.deepEqual(profileService.getSnapshot().progression.committedGrantIds, [
    `arena-result:r0:00000032:${result.authorityHash}`,
  ]);

  const grant = committer.commit(result).grant;
  const duplicate = profileService.commitProgressionGrant({
    grantId: grant.grantId,
    experienceDelta: grant.experienceDelta,
    unlocks: grant.unlocks,
  });
  assert.equal(duplicate.duplicate, true);
  assert.equal(repository.commits, 1);
  assert.equal(profileService.getSnapshot().progression.experience, 125);

  const restartedCommitter = new RewardCommitter(options);
  restartedCommitter.commit(matchResult({ winnerId: 'player-2', seed: 51 }));
  assert.equal(repository.commits, 2);
  assert.equal(profileService.getSnapshot().progression.experience, 225);
  profileService.destroy();
});
