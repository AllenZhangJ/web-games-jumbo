import { describe, expect, it } from 'vitest';
import { createMatchContentSelection } from '@number-strategy-jump/arena-contracts';
import { createProductMatchResult } from '@number-strategy-jump/arena-product-contracts';
import {
  PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
  PLAYER_PROFILE_QUALITY,
  PLAYER_PROFILE_SCHEMA_VERSION,
  advancePlayerProfile,
  createPlayerProfile,
  createPlayerProfileDefinition,
  type PlayerProfile,
  type PlayerProfileDefinition,
  type PlayerProfileDefinitionData,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  MATCH_REWARD_DEFINITION_SCHEMA_VERSION,
  UNLOCK_DEFINITION_SCHEMA_VERSION,
  UNLOCK_KIND,
  createProgressionRegistry,
  type RewardGrant,
} from '@number-strategy-jump/arena-progression';
import { RewardCommitter, resolveMatchReward } from '../src/index.js';

function profileDefinitionData(): PlayerProfileDefinitionData {
  return {
    schemaVersion: PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
    id: 'test-profile',
    contentVersion: 1,
    currentProfileSchemaVersion: PLAYER_PROFILE_SCHEMA_VERSION,
    limits: {
      maxUnlockedPerKind: 16,
      maxCommittedGrantIds: 16,
      maxExperience: 1_000,
      maxIdentifierLength: 64,
    },
    defaults: {
      profileId: 'local-player',
      progression: { experience: 0, committedGrantIds: [] },
      unlocks: {
        characterIds: ['hero'], appearanceIds: [], equipmentIds: [], mapIds: ['arena'],
      },
      selection: { characterId: 'hero', appearanceId: null },
      settings: {
        soundEnabled: true,
        reducedMotion: false,
        qualityProfile: PLAYER_PROFILE_QUALITY.AUTO,
      },
    },
  };
}

function registry() {
  return createProgressionRegistry({
    rewards: [{
      schemaVersion: MATCH_REWARD_DEFINITION_SCHEMA_VERSION,
      id: 'match-reward',
      contentVersion: 1,
      participantId: 'player-1',
      completionExperience: 10,
      winnerBonusExperience: 5,
      drawBonusExperience: 2,
    }],
    unlocks: [
      {
        schemaVersion: UNLOCK_DEFINITION_SCHEMA_VERSION,
        id: 'unlock-a',
        contentVersion: 1,
        kind: UNLOCK_KIND.CHARACTER,
        contentId: 'hero-a',
        requiredExperience: 15,
        prerequisiteIds: [],
      },
      {
        schemaVersion: UNLOCK_DEFINITION_SCHEMA_VERSION,
        id: 'unlock-b',
        contentVersion: 1,
        kind: UNLOCK_KIND.EQUIPMENT,
        contentId: 'weapon-b',
        requiredExperience: 15,
        prerequisiteIds: ['unlock-a'],
      },
    ],
  });
}

function productResult() {
  const matchContent = createMatchContentSelection({
    schemaVersion: 1,
    contentDefinitionId: 'test-content',
    contentVersion: 1,
    characterDefinitionIds: ['hero'],
    equipmentDefinitionIds: ['hammer'],
    mapDefinitionIds: ['arena'],
    selectedMapDefinitionId: 'arena',
    participantCharacters: [{ participantId: 'player-1', definitionId: 'hero' }],
  });
  return createProductMatchResult({
    matchSeed: 9,
    opponent: {
      id: 'opponent-1',
      displayName: '玩家1001',
      portraitKey: 'portrait-1',
      appearanceKey: 'appearance-1',
    },
    content: matchContent,
    replay: {
      replaySchemaVersion: 5,
      schemaVersion: 5,
      physicsBackendVersion: 'test-physics-v1',
      configHash: '12345678',
      ruleContentHash: 'abcdef01',
      finalHash: '11223344',
      matchSeed: 9,
      config: { contentSelection: matchContent },
      result: {
        winnerId: 'player-1',
        reason: 'last-participant-standing',
        isDraw: false,
        endedAtTick: 90,
      },
    },
  });
}

function applyGrant(
  definition: PlayerProfileDefinition,
  profile: PlayerProfile,
  grant: RewardGrant,
): PlayerProfile {
  return advancePlayerProfile(definition, profile, {
    progression: {
      experience: profile.progression.experience + grant.experienceDelta,
      committedGrantIds: [...profile.progression.committedGrantIds, grant.grantId],
    },
    unlocks: {
      characterIds: [...profile.unlocks.characterIds, ...grant.unlocks.characterIds],
      appearanceIds: [...profile.unlocks.appearanceIds, ...grant.unlocks.appearanceIds],
      equipmentIds: [...profile.unlocks.equipmentIds, ...grant.unlocks.equipmentIds],
      mapIds: [...profile.unlocks.mapIds, ...grant.unlocks.mapIds],
    },
  });
}

function validService(definition: PlayerProfileDefinition) {
  let profile = createPlayerProfile(definition);
  let commits = 0;
  return {
    get commits() { return commits; },
    getSnapshot() { return profile; },
    commitProgressionGrant(value: unknown) {
      const grant = value as RewardGrant;
      if (profile.progression.committedGrantIds.includes(grant.grantId)) {
        return { committed: false, duplicate: true, profile };
      }
      commits += 1;
      profile = applyGrant(definition, profile, grant);
      return { committed: true, duplicate: false, profile };
    },
  };
}

describe('arena-product-progression', () => {
  it('resolves winner experience and a prerequisite chain in one deterministic pass', () => {
    const definition = createPlayerProfileDefinition(profileDefinitionData());
    const profile = createPlayerProfile(definition);
    const grant = resolveMatchReward({
      registry: registry(),
      rewardDefinitionId: 'match-reward',
      profileDefinition: definition,
      profile,
      result: productResult(),
    });
    expect(grant.experienceDelta).toBe(15);
    expect(grant.unlocks.characterIds).toEqual(['hero-a']);
    expect(grant.unlocks.equipmentIds).toEqual(['weapon-b']);
    expect(Object.isFrozen(grant.unlocks)).toBe(true);
  });

  it('commits one transaction exactly once even through a distinct immutable result value', () => {
    const definition = createPlayerProfileDefinition(profileDefinitionData());
    const service = validService(definition);
    const committer = new RewardCommitter({
      registry: registry(),
      rewardDefinitionId: 'match-reward',
      profileDefinition: definition,
      profileService: service,
    });
    const result = productResult();
    const first = committer.commit(result);
    const second = committer.commit(JSON.parse(JSON.stringify(result)));
    expect(first).toBe(second);
    expect(service.commits).toBe(1);
    expect(first.profile.progression.experience).toBe(15);
  });

  it('blocks accessors and reentrant commits without executing caller getters', () => {
    const definition = createPlayerProfileDefinition(profileDefinitionData());
    let getterCalls = 0;
    const accessorService = Object.defineProperty({}, 'getSnapshot', {
      enumerable: true,
      get() { getterCalls += 1; return () => createPlayerProfile(definition); },
    });
    Object.defineProperty(accessorService, 'commitProgressionGrant', {
      value: () => undefined,
      enumerable: true,
    });
    expect(() => new RewardCommitter({
      registry: registry(),
      rewardDefinitionId: 'match-reward',
      profileDefinition: definition,
      profileService: accessorService,
    })).toThrow(/数据方法/);
    expect(getterCalls).toBe(0);

    let profile = createPlayerProfile(definition);
    let reentryError: unknown = null;
    const holder: { committer: RewardCommitter | null } = { committer: null };
    const result = productResult();
    const service = {
      getSnapshot() { return profile; },
      commitProgressionGrant(value: unknown) {
        try { holder.committer?.commit(result); } catch (error) { reentryError = error; }
        const grant = value as RewardGrant;
        profile = applyGrant(definition, profile, grant);
        return { committed: true, duplicate: false, profile };
      },
    };
    const committer = new RewardCommitter({
      registry: registry(),
      rewardDefinitionId: 'match-reward',
      profileDefinition: definition,
      profileService: service,
    });
    holder.committer = committer;
    expect(committer.commit(result).committed).toBe(true);
    expect(reentryError).toBeInstanceOf(Error);
    expect((reentryError as Error).message).toMatch(/不可重入/);
  });

  it('fails closed after an externally mutated but malformed commit outcome', () => {
    const definition = createPlayerProfileDefinition(profileDefinitionData());
    let profile = createPlayerProfile(definition);
    let commits = 0;
    const service = {
      getSnapshot() { return profile; },
      commitProgressionGrant(value: unknown) {
        commits += 1;
        profile = applyGrant(definition, profile, value as RewardGrant);
        return { committed: false, duplicate: false, profile };
      },
    };
    const committer = new RewardCommitter({
      registry: registry(),
      rewardDefinitionId: 'match-reward',
      profileDefinition: definition,
      profileService: service,
    });
    expect(() => committer.commit(productResult())).toThrow(/必须且只能/);
    expect(() => committer.commit(productResult())).toThrow(/失败关闭/);
    expect(commits).toBe(1);
  });

  it('retries only explicitly recoverable write failures and closes on ambiguous throws', () => {
    const definition = createPlayerProfileDefinition(profileDefinitionData());
    let profile = createPlayerProfile(definition);
    let recoverableAttempts = 0;
    const recoverableService = {
      getSnapshot() { return profile; },
      commitProgressionGrant(value: unknown) {
        recoverableAttempts += 1;
        if (recoverableAttempts === 1) {
          throw Object.assign(new Error('retry'), { recoverable: true });
        }
        const grant = value as RewardGrant;
        profile = applyGrant(definition, profile, grant);
        return { committed: true, duplicate: false, profile };
      },
    };
    const retryingCommitter = new RewardCommitter({
      registry: registry(),
      rewardDefinitionId: 'match-reward',
      profileDefinition: definition,
      profileService: recoverableService,
    });
    expect(() => retryingCommitter.commit(productResult())).toThrow(/retry/);
    expect(retryingCommitter.commit(productResult()).committed).toBe(true);
    expect(recoverableAttempts).toBe(2);

    let ambiguousAttempts = 0;
    const ambiguousService = {
      getSnapshot() { return createPlayerProfile(definition); },
      commitProgressionGrant() {
        ambiguousAttempts += 1;
        throw new Error('write outcome unknown');
      },
    };
    const closedCommitter = new RewardCommitter({
      registry: registry(),
      rewardDefinitionId: 'match-reward',
      profileDefinition: definition,
      profileService: ambiguousService,
    });
    expect(() => closedCommitter.commit(productResult())).toThrow(/outcome unknown/);
    expect(() => closedCommitter.commit(productResult())).toThrow(/失败关闭/);
    expect(ambiguousAttempts).toBe(1);
  });
});
