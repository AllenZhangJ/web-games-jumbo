import { describe, expect, it } from 'vitest';
import { createMatchContentSelectionV2 } from '@number-strategy-jump/arena-contracts';
import { createProductMatchResultV3 } from '@number-strategy-jump/arena-product-contracts';
import {
  PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
  PLAYER_PROFILE_QUALITY,
  PLAYER_PROFILE_SCHEMA_VERSION,
  advancePlayerProfile,
  createPlayerProfile,
  createPlayerProfileDefinition,
  type PlayerProfile,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
  UNLOCK_DEFINITION_SCHEMA_VERSION,
  UNLOCK_KIND,
  createModeProgressionRegistryV2,
  type RewardGrant,
} from '@number-strategy-jump/arena-progression';
import {
  ModeRewardCommitterV2,
  projectArenaV2ModeRewardSettlementInformationCandidateV1,
  projectModeMatchRewardPolicyBreakdownV2,
  resolveModeMatchRewardV2,
} from '../src/index.js';

const MODES = Object.freeze({
  duel: 'mode.duel.test.v1',
  race: 'mode.race.test.v1',
  survival: 'mode.survival.test.v1',
});

function profileDefinition() {
  return createPlayerProfileDefinition({
    schemaVersion: PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
    id: 'profile.mode-reward.test.v1',
    contentVersion: 1,
    currentProfileSchemaVersion: PLAYER_PROFILE_SCHEMA_VERSION,
    limits: {
      maxUnlockedPerKind: 16,
      maxCommittedGrantIds: 16,
      maxExperience: 1_000,
      maxIdentifierLength: 80,
    },
    defaults: {
      profileId: 'local-player',
      progression: { experience: 0, committedGrantIds: [] },
      unlocks: {
        characterIds: ['fighter-a'],
        appearanceIds: [],
        equipmentIds: [],
        mapIds: ['map.duel.test.v1'],
      },
      selection: { characterId: 'fighter-a', appearanceId: null },
      settings: {
        soundEnabled: true,
        reducedMotion: false,
        qualityProfile: PLAYER_PROFILE_QUALITY.AUTO,
      },
    },
  });
}

function registry(policyOverride?: unknown) {
  return createModeProgressionRegistryV2({
    rewards: [
      {
        schemaVersion: MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
        id: 'reward.duel.test.v2',
        contentVersion: 1,
        modeDefinitionId: MODES.duel,
        completionExperience: 10,
        policy: { kind: 'duel', winnerBonusExperience: 5, drawBonusExperience: 2 },
      },
      {
        schemaVersion: MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
        id: 'reward.race.test.v2',
        contentVersion: 1,
        modeDefinitionId: MODES.race,
        completionExperience: 10,
        policy: policyOverride ?? {
          kind: 'race',
          finishBonusExperience: 3,
          rankBonuses: [
            { rank: 1, experience: 5 },
            { rank: 2, experience: 2 },
          ],
        },
      },
      {
        schemaVersion: MODE_MATCH_REWARD_DEFINITION_V2_SCHEMA_VERSION,
        id: 'reward.survival.test.v2',
        contentVersion: 1,
        modeDefinitionId: MODES.survival,
        completionExperience: 10,
        policy: {
          kind: 'survival',
          stageBonuses: [
            { minimumPressureStage: 1, experience: 2 },
            { minimumPressureStage: 3, experience: 6 },
          ],
        },
      },
    ],
    unlocks: [{
      schemaVersion: UNLOCK_DEFINITION_SCHEMA_VERSION,
      id: 'unlock.weapon.test.v1',
      contentVersion: 1,
      kind: UNLOCK_KIND.EQUIPMENT,
      contentId: 'hammer.collection.test',
      requiredExperience: 15,
      prerequisiteIds: [],
    }],
  });
}

function assignments(kind: 'duel' | 'race' | 'survival') {
  if (kind === 'survival') {
    return [
      {
        participantId: 'enemy-1', modeRole: 'enemy', teamId: null,
        slotId: 'slot-1', slotGeneration: 1,
      },
      {
        participantId: 'p1', modeRole: 'player', teamId: null,
        slotId: null, slotGeneration: 0,
      },
    ];
  }
  const ids = kind === 'race' ? ['p1', 'p2', 'p3'] : ['p1', 'p2'];
  return ids.map((participantId) => ({
    participantId,
    modeRole: 'competitor',
    teamId: null,
    slotId: null,
    slotGeneration: 0,
  }));
}

function publicParticipants(kind: 'duel' | 'race' | 'survival') {
  return assignments(kind).map((assignment, index) => ({
    participantId: assignment.participantId,
    displayName: `Participant ${index + 1}`,
    portraitKey: `portrait.${index + 1}`,
    appearanceKey: `appearance.${index + 1}`,
    identityOrdinal: index + 1,
    identityGlyphKey: `glyph.${index + 1}`,
    identityPatternKey: `pattern.${index + 1}`,
  }));
}

function result(
  kind: 'duel' | 'race' | 'survival',
  modeResult: unknown,
  usedByP1 = false,
) {
  const participantAssignments = assignments(kind);
  const participantIds = participantAssignments.map(({ participantId }) => participantId);
  const modeDefinitionId = MODES[kind];
  const characterDefinitionIds = participantIds.map((id) => `fighter.${id}`);
  const content = createMatchContentSelectionV2({
    schemaVersion: 2,
    modeDefinitionId,
    contentDefinitionId: `content.${kind}.test.v1`,
    contentVersion: 1,
    characterDefinitionIds,
    equipmentDefinitionIds: ['hammer.collection.test'],
    mapDefinitionIds: [`map.${kind}.test.v1`],
    selectedMapDefinitionId: `map.${kind}.test.v1`,
    participantCharacters: participantIds.map((participantId) => ({
      participantId,
      definitionId: `fighter.${participantId}`,
    })),
  });
  return createProductMatchResultV3({
    schemaVersion: 3,
    modeDefinitionId,
    matchSeed: 7,
    authorityIdentity: {
      replaySchemaVersion: 6,
      ruleSchemaVersion: 6,
      physicsBackendVersion: 'lightweight-v3',
      configHash: 'deadbeef',
      ruleContentHash: 'c0ffee00',
      finalHash: '1234abcd',
    },
    content,
    participantAssignments,
    participantEquipmentUsage: participantIds.map((participantId) => ({
      participantId,
      usedCollectionEquipmentDefinitionIds: participantId === 'p1' && usedByP1
        ? ['hammer.collection.test']
        : [],
    })),
    modeResult,
    publicParticipants: publicParticipants(kind),
  });
}

function resolve(resultValue: unknown, recipientParticipantId: string, profileValue?: unknown) {
  const definition = profileDefinition();
  return resolveModeMatchRewardV2({
    registry: registry(),
    profileDefinition: definition,
    profile: profileValue ?? createPlayerProfile(definition),
    result: resultValue,
    recipientParticipantId,
  });
}

describe('P2.5 mode reward resolver V2 candidate', () => {
  it('resolves Duel winner and draw without reading equipment usage', () => {
    const winner = result('duel', {
      kind: 'duel',
      winnerParticipantIds: ['p1'],
      isDraw: false,
      reason: 'last-participant-standing',
      endedAtTick: 300,
    });
    const used = result('duel', winner.modeResult, true);
    expect(resolve(winner, 'p1').experienceDelta).toBe(15);
    expect(resolve(winner, 'p2').experienceDelta).toBe(10);
    expect(resolve(used, 'p1').experienceDelta).toBe(15);
    const draw = result('duel', {
      kind: 'duel',
      winnerParticipantIds: [],
      isDraw: true,
      reason: 'timeout-draw',
      endedAtTick: 300,
    });
    expect(resolve(draw, 'p1').experienceDelta).toBe(12);
  });

  it('supports tied Race rank and gives a progressed non-finisher completion only', () => {
    const race = result('race', {
      kind: 'race',
      winnerParticipantIds: ['p1', 'p2'],
      rankings: [
        { participantId: 'p1', rank: 1, finishTick: 100, progressOrdinal: 10 },
        { participantId: 'p2', rank: 1, finishTick: 100, progressOrdinal: 10 },
        { participantId: 'p3', rank: 3, finishTick: null, progressOrdinal: 8 },
      ],
      reason: 'finish-claimed',
      endedAtTick: 120,
    });
    expect(resolve(race, 'p1').experienceDelta).toBe(18);
    expect(resolve(race, 'p3').experienceDelta).toBe(10);
  });

  it('withholds Race completion experience without a finish claim or recipient progress', () => {
    const noFinisher = result('race', {
      kind: 'race',
      winnerParticipantIds: [],
      rankings: [
        { participantId: 'p1', rank: 1, finishTick: null, progressOrdinal: 8 },
        { participantId: 'p2', rank: 2, finishTick: null, progressOrdinal: 7 },
        { participantId: 'p3', rank: 3, finishTick: null, progressOrdinal: 6 },
      ],
      reason: 'no-finisher',
      endedAtTick: 120,
    });
    const zeroProgress = result('race', {
      kind: 'race',
      winnerParticipantIds: ['p2'],
      rankings: [
        { participantId: 'p1', rank: 3, finishTick: null, progressOrdinal: 0 },
        { participantId: 'p2', rank: 1, finishTick: 100, progressOrdinal: 10 },
        { participantId: 'p3', rank: 2, finishTick: null, progressOrdinal: 8 },
      ],
      reason: 'finish-claimed',
      endedAtTick: 120,
    });

    expect(resolve(noFinisher, 'p1').experienceDelta).toBe(0);
    expect(resolve(zeroProgress, 'p1').experienceDelta).toBe(0);
    expect(projectModeMatchRewardPolicyBreakdownV2({
      registry: registry(),
      result: noFinisher,
      recipientParticipantId: 'p1',
    })).toMatchObject({
      effectiveCompletion: false,
      completionExperience: 0,
      bonusExperience: 0,
      requestedExperience: 0,
    });
  });

  it('uses only the highest reached Survival stage and rejects enemy recipients', () => {
    const survival = result('survival', {
      kind: 'survival',
      playerParticipantId: 'p1',
      survivedTicks: 3_000,
      pressureStage: 3,
      fallCount: 2,
      reason: 'terminal-player-fall',
      endedAtTick: 3_000,
    });
    expect(resolve(survival, 'p1').experienceDelta).toBe(16);
    expect(() => resolve(survival, 'enemy-1')).toThrow(/非enemy/);
  });

  it('projects one authoritative Survival reward explanation from policy and commit facts', () => {
    const survival = result('survival', {
      kind: 'survival',
      playerParticipantId: 'p1',
      survivedTicks: 3_000,
      pressureStage: 3,
      fallCount: 2,
      reason: 'terminal-player-fall',
      endedAtTick: 3_000,
    });
    const definition = profileDefinition();
    const before = createPlayerProfile(definition);
    const grant = resolve(survival, 'p1', before);
    const profile = advancePlayerProfile(definition, before, {
      progression: {
        experience: grant.experienceDelta,
        committedGrantIds: [grant.grantId],
      },
      unlocks: {
        characterIds: [...before.unlocks.characterIds, ...grant.unlocks.characterIds],
        appearanceIds: [...before.unlocks.appearanceIds, ...grant.unlocks.appearanceIds],
        equipmentIds: [...before.unlocks.equipmentIds, ...grant.unlocks.equipmentIds],
        mapIds: [...before.unlocks.mapIds, ...grant.unlocks.mapIds],
      },
    });
    expect(projectModeMatchRewardPolicyBreakdownV2({
      registry: registry(),
      result: survival,
      recipientParticipantId: 'p1',
    })).toMatchObject({
      modeKind: 'survival',
      completionExperience: 10,
      bonusExperience: 6,
      requestedExperience: 16,
      reason: { pressureStage: 3, matchedMinimumPressureStage: 3 },
    });
    const projection = projectArenaV2ModeRewardSettlementInformationCandidateV1({
      registry: registry(),
      profileDefinition: definition,
      result: survival,
      recipientParticipantId: 'p1',
      rewardOutcome: { grant, committed: true, duplicate: false, profile },
    });
    expect(projection).toMatchObject({
      settlementStatus: 'committed',
      requestedExperience: 16,
      grantedExperience: 16,
    });
    expect(projection.fieldValues[0]).toMatchObject({
      fieldId: 'reward-breakdown',
      valueText: '完成 +10，坚持到压力阶段3 +6；规则经验 +16',
    });
  });

  it('keeps one idempotency identity across profile revisions', () => {
    const duel = result('duel', {
      kind: 'duel',
      winnerParticipantIds: ['p1'],
      isDraw: false,
      reason: 'last-participant-standing',
      endedAtTick: 300,
    });
    const definition = profileDefinition();
    const initial = createPlayerProfile(definition);
    const revised = advancePlayerProfile(definition, initial, {
      settings: { ...initial.settings, reducedMotion: true },
    });
    expect(resolve(duel, 'p1', initial).grantId).toBe(resolve(duel, 'p1', revised).grantId);
  });

  it('fails closed when Mode and reward policy disagree', () => {
    const race = result('race', {
      kind: 'race',
      winnerParticipantIds: ['p1'],
      rankings: [
        { participantId: 'p1', rank: 1, finishTick: 100, progressOrdinal: 10 },
        { participantId: 'p2', rank: 2, finishTick: null, progressOrdinal: 9 },
        { participantId: 'p3', rank: 3, finishTick: null, progressOrdinal: 8 },
      ],
      reason: 'finish-claimed',
      endedAtTick: 120,
    });
    const definition = profileDefinition();
    expect(() => resolveModeMatchRewardV2({
      registry: registry({ kind: 'duel', winnerBonusExperience: 5, drawBonusExperience: 2 }),
      profileDefinition: definition,
      profile: createPlayerProfile(definition),
      result: race,
      recipientParticipantId: 'p1',
    })).toThrow(/不一致/);
  });

  it('commits one authority result exactly once and closes on ambiguous storage errors', () => {
    const duel = result('duel', {
      kind: 'duel',
      winnerParticipantIds: ['p1'],
      isDraw: false,
      reason: 'last-participant-standing',
      endedAtTick: 300,
    });
    const definition = profileDefinition();
    let profile: PlayerProfile = createPlayerProfile(definition);
    let commits = 0;
    const service = {
      getSnapshot() { return profile; },
      commitProgressionGrant(value: unknown) {
        const grant = value as RewardGrant;
        commits += 1;
        profile = advancePlayerProfile(definition, profile, {
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
        return { committed: true, duplicate: false, profile };
      },
    };
    const committer = new ModeRewardCommitterV2({
      registry: registry(),
      profileDefinition: definition,
      profileService: service,
      recipientParticipantId: 'p1',
    });
    const first = committer.commit(duel);
    expect(committer.commit(JSON.parse(JSON.stringify(duel)))).toBe(first);
    expect(commits).toBe(1);

    let attempts = 0;
    const closed = new ModeRewardCommitterV2({
      registry: registry(),
      profileDefinition: definition,
      profileService: {
        getSnapshot() { return createPlayerProfile(definition); },
        commitProgressionGrant() {
          attempts += 1;
          throw new Error('write outcome unknown');
        },
      },
      recipientParticipantId: 'p1',
    });
    expect(() => closed.commit(duel)).toThrow(/outcome unknown/);
    expect(() => closed.commit(duel)).toThrow(/失败关闭/);
    expect(attempts).toBe(1);

    let descriptorCalls = 0;
    const hostile = new Proxy(Object.create(null), {
      getOwnPropertyDescriptor() {
        descriptorCalls += 1;
        throw new Error('hostile-descriptor');
      },
    });
    const hostileCommitter = new ModeRewardCommitterV2({
      registry: registry(),
      profileDefinition: definition,
      profileService: {
        getSnapshot() { return createPlayerProfile(definition); },
        commitProgressionGrant() { throw hostile; },
      },
      recipientParticipantId: 'p1',
    });
    let captured: unknown;
    try {
      hostileCommitter.commit(duel);
    } catch (error) {
      captured = error;
    }
    expect(captured).toBe(hostile);
    expect(descriptorCalls).toBe(1);
    expect(() => hostileCommitter.commit(duel)).toThrow(/失败关闭/);
  });

  it('publishes a durable outcome watermark before rejecting swallowed commit reentry', () => {
    const duel = result('duel', {
      kind: 'duel',
      winnerParticipantIds: ['p1'],
      isDraw: false,
      reason: 'last-participant-standing',
      endedAtTick: 300,
    });
    const definition = profileDefinition();
    let profile: PlayerProfile = createPlayerProfile(definition);
    let commits = 0;
    let committer: ModeRewardCommitterV2 | null = null;
    const service = {
      getSnapshot() { return profile; },
      commitProgressionGrant(value: unknown) {
        const grant = value as RewardGrant;
        commits += 1;
        profile = advancePlayerProfile(definition, profile, {
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
        if (committer === null) throw new Error('test committer not initialized');
        try { committer.prepare(duel); } catch { /* hostile port swallows reentry */ }
        return { committed: true, duplicate: false, profile };
      },
    };
    const activeCommitter = new ModeRewardCommitterV2({
      registry: registry(),
      profileDefinition: definition,
      profileService: service,
      recipientParticipantId: 'p1',
    });
    committer = activeCommitter;

    expect(() => activeCommitter.commit(duel)).toThrow(/重入/);
    expect(() => activeCommitter.commit(duel)).toThrow(/失败关闭/);

    const recovery = new ModeRewardCommitterV2({
      registry: registry(),
      profileDefinition: definition,
      profileService: service,
      recipientParticipantId: 'p1',
    });
    expect(recovery.commit(duel)).toMatchObject({ committed: false, duplicate: true });
    expect(commits).toBe(1);
  });

  it('does not execute Promise subclass species or hostile commit accessors', () => {
    const duel = result('duel', {
      kind: 'duel',
      winnerParticipantIds: ['p1'],
      isDraw: false,
      reason: 'last-participant-standing',
      endedAtTick: 300,
    });
    const definition = profileDefinition();
    let speciesCalls = 0;
    class DerivedPromise<T> extends Promise<T> {
      static override get [Symbol.species](): PromiseConstructor {
        speciesCalls += 1;
        return Promise;
      }
    }
    const subclass = new ModeRewardCommitterV2({
      registry: registry(),
      profileDefinition: definition,
      profileService: {
        getSnapshot() {
          return new DerivedPromise((resolve) => resolve(createPlayerProfile(definition)));
        },
        commitProgressionGrant() { throw new Error('must-not-reach'); },
      },
      recipientParticipantId: 'p1',
    });
    expect(() => subclass.commit(duel)).toThrow(/同步完成/);
    expect(speciesCalls).toBe(0);

    let thenCalls = 0;
    let attempts = 0;
    const hostile = new ModeRewardCommitterV2({
      registry: registry(),
      profileDefinition: definition,
      profileService: {
        getSnapshot() { return createPlayerProfile(definition); },
        commitProgressionGrant() {
          attempts += 1;
          return Object.defineProperty(Object.create(null), 'then', {
            get() {
              thenCalls += 1;
              throw new Error('must-not-run');
            },
          });
        },
      },
      recipientParticipantId: 'p1',
    });
    expect(() => hostile.commit(duel)).toThrow(/访问器thenable/);
    expect(() => hostile.commit(duel)).toThrow(/失败关闭/);
    expect([thenCalls, attempts]).toEqual([0, 1]);
  });
});
