import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
  type ArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1,
  resolveArenaV2MapLearningGoalV1,
  resolveArenaV2NextLearningGoalV1,
  projectArenaV2PreparationLearningFocusV1,
  resolveArenaV2WeaponLearningGoalV1,
  resolveArenaV2WeaponContextLearningFocusForModeV1,
  type ArenaV2NextLearningGoalKindV1,
} from '../src/arena-v2-next-learning-goal-v1.js';
import {
  ARENA_V2_COLLECTION_NEXT_GOAL_IDENTITY_PROJECTION_V1_METADATA,
  projectArenaV2CollectionNextGoalIdentityV1,
} from '../src/arena-v2-collection-next-goal-identity-projection-v1.js';

type SequentialGoalKindV1 = Exclude<ArenaV2NextLearningGoalKindV1, 'catalog-complete'>;

const GOAL_IDENTITY_KEYS = Object.freeze([
  'schemaVersion',
  'profileRevision',
  'kind',
  'goalId',
  'weaponDefinitionId',
  'mapDefinitionId',
  'segmentDefinitionId',
  'modeDefinitionId',
  'challengeDefinitionId',
  'context',
] as const);

const STAGES = Object.freeze([
  'collect-map',
  'collect-weapon',
  'weapon-context',
  'map-segment',
  'mode-mastery',
  'cross-challenge',
  'record-improvement',
] as const satisfies readonly SequentialGoalKindV1[]);

function definitionFixture(
  overrides: Readonly<Record<string, unknown>> = {},
): ArenaV2LearningProfileDefinitionV1 {
  return createArenaV2LearningProfileDefinitionV1({
    schemaVersion: ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
    id: 'collection-next-goal.test.v1',
    contentVersion: 3,
    currentProfileSchemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
    status: 'production-unreachable',
    hardGate: false,
    defaultProfileServiceWired: false,
    limits: {
      maxIdentifierLength: 96,
      maxCommittedGrantIds: 16,
      maxCounterValue: 1_000,
      maxCollectedWeaponIds: 4,
      maxCollectedMapIds: 4,
      maxWeaponMasteryRecords: 4,
      maxMapSegmentMasteryRecords: 8,
      maxModeRecords: 4,
      maxChallengeRecords: 8,
    },
    masteryRequirements: {
      weaponCollectionUseEvidence: 120,
      weaponContextEvidence: {
        ground: 1,
        aerial: 1,
        edge: 1,
        'duel-counterplay': 1,
        survival: 1,
      },
      mapSegmentCompletionEvidence: 1,
      modeCompletionEvidence: 2,
    },
    defaultProfileId: 'local',
    initiallyCollectedWeaponDefinitionIds: [],
    initiallyCollectedMapDefinitionIds: [],
    weaponDefinitionIds: ['weapon.a'],
    mapDefinitions: [{
      mapDefinitionId: 'map.a',
      segmentDefinitionIds: ['segment.a'],
    }],
    modeDefinitions: [{ modeDefinitionId: 'mode.duel', kind: 'duel' }],
    challengeDefinitions: [{
      challengeDefinitionId: 'challenge.cross',
      targetProgress: 1,
      weaponDefinitionId: 'weapon.a',
      mapDefinitionId: 'map.a',
      segmentDefinitionId: 'segment.a',
      modeDefinitionId: 'mode.duel',
    }],
    ...overrides,
  });
}

function profileFrom(
  definition: ArenaV2LearningProfileDefinitionV1,
  overrides: Readonly<Record<string, unknown>> = {},
): ArenaV2LearningProfileV1 {
  return createArenaV2LearningProfileV1(definition, {
    schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
    profileDefinitionId: definition.id,
    profileDefinitionContentVersion: definition.contentVersion,
    profileId: 'local',
    revision: 7,
    committedGrantIds: [],
    collections: { weaponDefinitionIds: [], mapDefinitionIds: [] },
    weaponMastery: [],
    mapSegmentMastery: [],
    modeRecords: [],
    challenges: [],
    ...overrides,
  });
}

function weaponMasteryRecord(
  definition: ArenaV2LearningProfileDefinitionV1,
  weaponDefinitionId: string,
  useCount: number,
  contextsComplete: boolean,
) {
  return {
    weaponDefinitionId,
    useCount,
    contexts: ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.map((context) => ({
      context,
      evidenceCount: contextsComplete
        ? definition.masteryRequirements.weaponContextEvidence[context]
        : 0,
      completedAtRevision: contextsComplete ? 3 : null,
    })),
  };
}

function completedMapSegmentRecords(definition: ArenaV2LearningProfileDefinitionV1) {
  return definition.mapDefinitions.flatMap(({ mapDefinitionId, segmentDefinitionIds }) => (
    segmentDefinitionIds.map((segmentDefinitionId) => ({
      mapDefinitionId,
      segmentDefinitionId,
      completionEvidenceCount:
        definition.masteryRequirements.mapSegmentCompletionEvidence,
      completedAtRevision: 4,
      bestRaceFinishTicks: null,
      bestSurvivalTicks: null,
    }))
  ));
}

function modeRecord(
  definition: ArenaV2LearningProfileDefinitionV1,
  modeDefinitionId: string,
  completionCount: number,
  bestPerformanceTicks: number | null,
) {
  const mode = definition.modeDefinitions.find((candidate) => (
    candidate.modeDefinitionId === modeDefinitionId
  ));
  if (mode === undefined) throw new RangeError(`测试模式不受支持：${modeDefinitionId}`);
  const resolvedBestPerformanceTicks = mode.kind === 'survival' && completionCount > 0
    ? bestPerformanceTicks ?? 900
    : bestPerformanceTicks;
  return {
    modeDefinitionId,
    kind: mode.kind,
    playCount: mode.kind === 'race' ? Math.max(1, completionCount) : completionCount,
    completionCount,
    winCount: mode.kind !== 'survival' && resolvedBestPerformanceTicks !== null ? 1 : 0,
    completedAtRevision:
      completionCount >= definition.masteryRequirements.modeCompletionEvidence ? 5 : null,
    bestPerformanceTicks: resolvedBestPerformanceTicks,
  };
}

function withComparableModeRecord(
  record: ReturnType<typeof modeRecord>,
) {
  return {
    ...record,
    winCount: record.kind === 'survival' ? 0 : Math.max(1, record.winCount),
    bestPerformanceTicks: 900,
  };
}

function modeRecords(
  definition: ArenaV2LearningProfileDefinitionV1,
  completionCount: number,
  bestPerformanceTicks: number | null,
) {
  return definition.modeDefinitions.map(({ modeDefinitionId }) => modeRecord(
    definition,
    modeDefinitionId,
    completionCount,
    bestPerformanceTicks,
  ));
}

function profileFixture(
  definition: ArenaV2LearningProfileDefinitionV1,
  stage: SequentialGoalKindV1,
): ArenaV2LearningProfileV1 {
  const stageIndex = STAGES.indexOf(stage);
  if (stageIndex < 0) throw new RangeError(`测试stage不受支持：${stage}`);
  const mapCollected = stage !== 'collect-map';
  const weaponCollected = stage !== 'collect-map' && stage !== 'collect-weapon';
  const longTermLanesComplete = stage !== 'map-segment';
  const contextsComplete = stage !== 'weapon-context';
  const fullModeMastery = stage === 'cross-challenge' || stage === 'record-improvement';
  const primaryWeaponDefinitionId = definition.weaponDefinitionIds[0]!;
  return profileFrom(definition, {
    collections: {
      weaponDefinitionIds: weaponCollected ? [primaryWeaponDefinitionId] : [],
      mapDefinitionIds: mapCollected
        ? definition.mapDefinitions.map(({ mapDefinitionId }) => mapDefinitionId)
        : [],
    },
    weaponMastery: weaponCollected ? [weaponMasteryRecord(
      definition,
      primaryWeaponDefinitionId,
      definition.masteryRequirements.weaponCollectionUseEvidence,
      contextsComplete,
    )] : [],
    mapSegmentMastery: mapCollected && longTermLanesComplete
      ? completedMapSegmentRecords(definition)
      : [],
    modeRecords: mapCollected ? modeRecords(
      definition,
      fullModeMastery ? definition.masteryRequirements.modeCompletionEvidence : 1,
      stage === 'record-improvement' ? null : 900,
    ) : [],
    challenges: stage === 'record-improvement'
      ? definition.challengeDefinitions.map(({ challengeDefinitionId, targetProgress }) => ({
        challengeDefinitionId,
        progress: targetProgress,
        completedAtRevision: 6,
      }))
      : [],
  });
}

function input(
  profileDefinition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
) {
  return { profileDefinition, profile };
}

function identityFromFullGoal(
  goal: ReturnType<typeof resolveArenaV2NextLearningGoalV1>,
) {
  return Object.freeze({
    schemaVersion: goal.schemaVersion,
    profileRevision: goal.profileRevision,
    kind: goal.kind,
    goalId: goal.goalId,
    weaponDefinitionId: goal.weaponDefinitionId,
    mapDefinitionId: goal.mapDefinitionId,
    segmentDefinitionId: goal.segmentDefinitionId,
    modeDefinitionId: goal.modeDefinitionId,
    challengeDefinitionId: goal.challengeDefinitionId,
    context: goal.context,
  });
}

describe('Arena V2 P6 collection next-goal identity projection V1', () => {
  it('keeps weapon and map collection pages on their own learning lanes', () => {
    const definition = definitionFixture();
    const profile = profileFrom(definition, {
      collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
    });
    expect(resolveArenaV2WeaponLearningGoalV1(input(definition, profile))).toMatchObject({
      kind: 'collect-weapon',
      weaponDefinitionId: 'weapon.a',
      mapDefinitionId: null,
    });
    expect(resolveArenaV2MapLearningGoalV1(input(definition, profile))).toMatchObject({
      kind: 'map-segment',
      mapDefinitionId: 'map.a',
      segmentDefinitionId: 'segment.a',
      weaponDefinitionId: null,
    });
    expect(resolveArenaV2NextLearningGoalV1(input(definition, profile))).toMatchObject({
      kind: 'mode-mastery',
      modeDefinitionId: 'mode.duel',
    });
  });

  it('publishes scoped lane completion from one exported ID source', () => {
    const definition = definitionFixture();
    const profile = profileFixture(definition, 'record-improvement');
    const weaponGoal = resolveArenaV2WeaponLearningGoalV1(input(definition, profile));
    const mapGoal = resolveArenaV2MapLearningGoalV1(input(definition, profile));
    expect(weaponGoal).toMatchObject({
      kind: 'catalog-complete',
      goalId: ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1,
      currentProgress: 1,
      targetProgress: 1,
      effectiveLearningRequired: false,
    });
    expect(mapGoal).toMatchObject({
      kind: 'catalog-complete',
      goalId: ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1,
      currentProgress: 1,
      targetProgress: 1,
      effectiveLearningRequired: false,
    });
    expect(weaponGoal.goalId).not.toBe(mapGoal.goalId);
  });

  it('selects only weapon contexts that the prepared mode can evidence', () => {
    const definition = definitionFixture({
      modeDefinitions: [
        { modeDefinitionId: 'mode.duel', kind: 'duel' },
        { modeDefinitionId: 'mode.race', kind: 'race' },
        { modeDefinitionId: 'mode.survival', kind: 'survival' },
      ],
    });
    const profile = profileFrom(definition, {
      collections: { weaponDefinitionIds: ['weapon.a'], mapDefinitionIds: ['map.a'] },
      weaponMastery: [{
        ...weaponMasteryRecord(definition, 'weapon.a', 120, false),
        contexts: ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.map((context) => ({
          context,
          evidenceCount: context === 'ground' || context === 'aerial' || context === 'edge'
            ? 1
            : 0,
          completedAtRevision: context === 'ground' || context === 'aerial' || context === 'edge'
            ? 3
            : null,
        })),
      }],
    });
    expect(projectArenaV2PreparationLearningFocusV1({
      profileDefinition: definition,
      profile,
      modeKind: 'duel',
      weaponDefinitionId: 'weapon.a',
      mapDefinitionId: 'map.a',
    })).toMatchObject({
      weaponContextFocus: {
        context: 'duel-counterplay',
        practiceInstruction: '在常规1v1中完成一次被对手完整避开的攻击窗口',
      },
      mapSegmentFocus: { segmentDefinitionId: 'segment.a' },
    });
    expect(projectArenaV2PreparationLearningFocusV1({
      profileDefinition: definition,
      profile,
      modeKind: 'race',
      weaponDefinitionId: 'weapon.a',
      mapDefinitionId: 'map.a',
    }).weaponContextFocus).toBeNull();
    expect(projectArenaV2PreparationLearningFocusV1({
      profileDefinition: definition,
      profile,
      modeKind: 'survival',
      weaponDefinitionId: null,
      mapDefinitionId: 'map.a',
    })).toMatchObject({
      weaponContextFocus: null,
      mapSegmentFocus: { segmentDefinitionId: 'segment.a' },
    });
    expect(resolveArenaV2WeaponContextLearningFocusForModeV1({
      profileDefinition: definition,
      profile,
      modeKind: 'survival',
      weaponDefinitionId: 'weapon.a',
    })).toMatchObject({ context: 'survival' });
  });

  it('keeps incomplete weapon-context goals in Definition order rather than Profile id order', () => {
    const definition = definitionFixture({
      weaponDefinitionIds: ['weapon.z', 'weapon.a'],
    });
    const profile = profileFrom(definition, {
      collections: {
        weaponDefinitionIds: ['weapon.a', 'weapon.z'],
        mapDefinitionIds: ['map.a'],
      },
      weaponMastery: [
        weaponMasteryRecord(definition, 'weapon.a', 120, false),
        weaponMasteryRecord(definition, 'weapon.z', 120, false),
      ],
      modeRecords: [modeRecord(definition, 'mode.duel', 1, 900)],
    });
    expect(resolveArenaV2NextLearningGoalV1(input(definition, profile))).toMatchObject({
      kind: 'weapon-context',
      weaponDefinitionId: 'weapon.z',
      context: 'ground',
    });
    expect(resolveArenaV2WeaponLearningGoalV1(input(definition, profile))).toMatchObject({
      kind: 'weapon-context',
      weaponDefinitionId: 'weapon.z',
      context: 'ground',
    });
  });

  it('crops the same resolved goal identity for all seven sequential kinds', () => {
    const definition = definitionFixture();
    for (const stage of STAGES) {
      const profile = profileFixture(definition, stage);
      const options = input(definition, profile);
      const fullGoal = resolveArenaV2NextLearningGoalV1(options);
      const identity = projectArenaV2CollectionNextGoalIdentityV1(options);
      expect(fullGoal.kind).toBe(stage);
      expect(identity).toEqual(identityFromFullGoal(fullGoal));
      expect(Object.keys(identity)).toEqual(GOAL_IDENTITY_KEYS);
      expect(identity).not.toHaveProperty('question');
      expect(identity).not.toHaveProperty('actionLabel');
      expect(identity).not.toHaveProperty('currentProgress');
      expect(identity).not.toHaveProperty('targetProgress');
      expect(identity).not.toHaveProperty('effectiveLearningRequired');
      expect(Object.isFrozen(identity)).toBe(true);
    }
  });

  it('keeps each reachable identity combination bound to the formal Profile fixture', () => {
    const definition = definitionFixture();
    const expected = {
      'collect-map': {
        goalId: 'collect-map:map.a',
        weaponDefinitionId: null,
        mapDefinitionId: 'map.a',
        segmentDefinitionId: null,
        modeDefinitionId: null,
        challengeDefinitionId: null,
        context: null,
      },
      'collect-weapon': {
        goalId: 'collect-weapon:weapon.a',
        weaponDefinitionId: 'weapon.a',
        mapDefinitionId: null,
        segmentDefinitionId: null,
        modeDefinitionId: null,
        challengeDefinitionId: null,
        context: null,
      },
      'weapon-context': {
        goalId: 'weapon-context:weapon.a:ground',
        weaponDefinitionId: 'weapon.a',
        mapDefinitionId: null,
        segmentDefinitionId: null,
        modeDefinitionId: null,
        challengeDefinitionId: null,
        context: 'ground',
      },
      'map-segment': {
        goalId: 'map-segment:map.a:segment.a',
        weaponDefinitionId: null,
        mapDefinitionId: 'map.a',
        segmentDefinitionId: 'segment.a',
        modeDefinitionId: null,
        challengeDefinitionId: null,
        context: null,
      },
      'mode-mastery': {
        goalId: 'mode-mastery:mode.duel',
        weaponDefinitionId: null,
        mapDefinitionId: null,
        segmentDefinitionId: null,
        modeDefinitionId: 'mode.duel',
        challengeDefinitionId: null,
        context: null,
      },
      'cross-challenge': {
        goalId: 'cross-challenge:challenge.cross',
        weaponDefinitionId: 'weapon.a',
        mapDefinitionId: 'map.a',
        segmentDefinitionId: 'segment.a',
        modeDefinitionId: 'mode.duel',
        challengeDefinitionId: 'challenge.cross',
        context: null,
      },
      'record-improvement': {
        goalId: 'record-improvement:mode.duel',
        weaponDefinitionId: null,
        mapDefinitionId: null,
        segmentDefinitionId: null,
        modeDefinitionId: 'mode.duel',
        challengeDefinitionId: null,
        context: null,
      },
    } as const satisfies Record<SequentialGoalKindV1, Readonly<Record<string, unknown>>>;
    for (const stage of STAGES) {
      expect(projectArenaV2CollectionNextGoalIdentityV1(input(
        definition,
        profileFixture(definition, stage),
      ))).toMatchObject({
        schemaVersion: 1,
        profileRevision: 7,
        kind: stage,
        ...expected[stage],
      });
    }
  });

  it('covers every registered mode once in Definition order before entering the long-term lanes', () => {
    const definition = definitionFixture({
      modeDefinitions: [
        { modeDefinitionId: 'mode.duel', kind: 'duel' },
        { modeDefinitionId: 'mode.race', kind: 'race' },
        { modeDefinitionId: 'mode.survival', kind: 'survival' },
      ],
    });
    const shared = {
      collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
      weaponMastery: [],
      mapSegmentMastery: [],
      challenges: [],
    } as const;
    const expectedFirstCompletion = (
      records: readonly Readonly<Record<string, unknown>>[],
      modeDefinitionId: string,
    ) => expect(resolveArenaV2NextLearningGoalV1(input(
      definition,
      profileFrom(definition, { ...shared, modeRecords: records }),
    ))).toMatchObject({
      kind: 'mode-mastery',
      goalId: `mode-first-completion:${modeDefinitionId}`,
      modeDefinitionId,
      currentProgress: 0,
      targetProgress: 1,
    });

    expectedFirstCompletion([], 'mode.duel');
    expectedFirstCompletion([
      modeRecord(definition, 'mode.duel', 0, null),
    ], 'mode.duel');
    expectedFirstCompletion([
      modeRecord(definition, 'mode.duel', 1, null),
    ], 'mode.race');
    expectedFirstCompletion([
      modeRecord(definition, 'mode.duel', 1, null),
      modeRecord(definition, 'mode.race', 1, null),
    ], 'mode.survival');
    expectedFirstCompletion([
      modeRecord(definition, 'mode.duel', 1, null),
      modeRecord(definition, 'mode.survival', 1, null),
    ], 'mode.race');

    const afterAllFirstCompletions = resolveArenaV2NextLearningGoalV1(input(
      definition,
      profileFrom(definition, {
        ...shared,
        modeRecords: modeRecords(definition, 1, null),
      }),
    ));
    expect(afterAllFirstCompletions).toMatchObject({
      kind: 'map-segment',
      goalId: 'map-segment:map.a:segment.a',
    });
  });

  it('keeps ordinary mode mastery after first completion when its configured target exceeds one', () => {
    const definition = definitionFixture();
    const firstCompletion = resolveArenaV2NextLearningGoalV1(input(
      definition,
      profileFrom(definition, {
        collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
      }),
    ));
    const ordinaryMastery = resolveArenaV2NextLearningGoalV1(input(
      definition,
      profileFixture(definition, 'mode-mastery'),
    ));
    expect(firstCompletion).toMatchObject({
      kind: 'mode-mastery',
      goalId: 'mode-first-completion:mode.duel',
      currentProgress: 0,
      targetProgress: 1,
    });
    expect(ordinaryMastery).toMatchObject({
      kind: 'mode-mastery',
      goalId: 'mode-mastery:mode.duel',
      currentProgress: 1,
      targetProgress: 2,
    });
  });

  it('compares weapon and map lanes by exact normalized BigInt ratios with map-stable ties', () => {
    const definition = definitionFixture({
      mapDefinitions: [{
        mapDefinitionId: 'map.a',
        segmentDefinitionIds: ['segment.a', 'segment.b'],
      }],
    });
    const laneProfile = (
      weaponEvidence: number,
      completedSegmentDefinitionIds: readonly string[],
    ) => profileFrom(definition, {
      collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
      weaponMastery: [weaponMasteryRecord(definition, 'weapon.a', weaponEvidence, false)],
      mapSegmentMastery: completedSegmentDefinitionIds.map((segmentDefinitionId) => ({
        mapDefinitionId: 'map.a',
        segmentDefinitionId,
        completionEvidenceCount: 1,
        completedAtRevision: 4,
        bestRaceFinishTicks: null,
        bestSurvivalTicks: null,
      })),
      modeRecords: modeRecords(definition, 1, null),
    });
    expect(resolveArenaV2NextLearningGoalV1(input(
      definition,
      laneProfile(0, []),
    ))).toMatchObject({ kind: 'map-segment', segmentDefinitionId: 'segment.a' });
    expect(resolveArenaV2NextLearningGoalV1(input(
      definition,
      laneProfile(0, ['segment.a']),
    ))).toMatchObject({ kind: 'collect-weapon', weaponDefinitionId: 'weapon.a' });
    expect(resolveArenaV2NextLearningGoalV1(input(
      definition,
      laneProfile(60, []),
    ))).toMatchObject({ kind: 'map-segment', segmentDefinitionId: 'segment.a' });
    expect(resolveArenaV2NextLearningGoalV1(input(
      definition,
      laneProfile(60, ['segment.a']),
    ))).toMatchObject({ kind: 'map-segment', segmentDefinitionId: 'segment.b' });
  });

  it('limits the weapon denominator and candidate to the explicit active pool without trimming Profile', () => {
    const definition = definitionFixture({
      weaponDefinitionIds: ['weapon.a', 'weapon.b'],
    });
    const profile = profileFrom(definition, {
      collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
      weaponMastery: [
        weaponMasteryRecord(definition, 'weapon.a', 0, false),
        weaponMasteryRecord(definition, 'weapon.b', 10, false),
      ],
      mapSegmentMastery: completedMapSegmentRecords(definition),
      modeRecords: modeRecords(definition, 1, null),
    });
    expect(resolveArenaV2NextLearningGoalV1({
      ...input(definition, profile),
      eligibleWeaponDefinitionIds: ['weapon.a'],
    })).toMatchObject({ kind: 'collect-weapon', weaponDefinitionId: 'weapon.a' });
    expect(resolveArenaV2NextLearningGoalV1({
      ...input(definition, profile),
      eligibleWeaponDefinitionIds: ['weapon.a', 'weapon.b'],
    })).toMatchObject({ kind: 'collect-weapon', weaponDefinitionId: 'weapon.b' });
    expect(profile.weaponMastery.map(({ weaponDefinitionId }) => weaponDefinitionId))
      .toEqual(['weapon.a', 'weapon.b']);
    expect(() => resolveArenaV2NextLearningGoalV1({
      ...input(definition, profile),
      eligibleWeaponDefinitionIds: [],
    })).toThrow(/必须是非空数组/);
    expect(() => resolveArenaV2NextLearningGoalV1({
      ...input(definition, profile),
      eligibleWeaponDefinitionIds: ['weapon.a', 'weapon.a'],
    })).toThrow(/重复声明武器/);
    expect(() => resolveArenaV2NextLearningGoalV1({
      ...input(definition, profile),
      eligibleWeaponDefinitionIds: ['weapon.future'],
    })).toThrow(/目录外武器/);
  });

  it('keeps an exhausted active pool distinct from the unfinished full catalog', () => {
    const definition = definitionFixture({
      weaponDefinitionIds: ['weapon.a', 'weapon.b'],
    });
    const profile = profileFrom(definition, {
      collections: {
        weaponDefinitionIds: ['weapon.a'],
        mapDefinitionIds: ['map.a'],
      },
      weaponMastery: [weaponMasteryRecord(definition, 'weapon.a', 120, true)],
      mapSegmentMastery: completedMapSegmentRecords(definition),
      modeRecords: modeRecords(definition, 2, 900),
      challenges: definition.challengeDefinitions.map((challenge) => ({
        challengeDefinitionId: challenge.challengeDefinitionId,
        progress: challenge.targetProgress,
        completedAtRevision: 6,
      })),
    });
    expect(resolveArenaV2NextLearningGoalV1({
      ...input(definition, profile),
      eligibleWeaponDefinitionIds: ['weapon.a'],
    })).toMatchObject({
      kind: 'catalog-complete',
      goalId: 'active-learning-complete',
      question: '当前已开放学习内容是否已经闭合？',
      actionLabel: '自由练习当前开放内容，等待新武器开放',
      effectiveLearningRequired: false,
    });
    expect(resolveArenaV2NextLearningGoalV1(input(definition, profile))).toMatchObject({
      kind: 'collect-weapon',
      weaponDefinitionId: 'weapon.b',
    });
  });

  it('recomputes normalized lane capacity when the active weapon pool expands', () => {
    const definition = definitionFixture({
      weaponDefinitionIds: ['weapon.a', 'weapon.b'],
      mapDefinitions: [{
        mapDefinitionId: 'map.a',
        segmentDefinitionIds: ['segment.a', 'segment.b', 'segment.c', 'segment.d'],
      }],
    });
    const profile = profileFrom(definition, {
      collections: {
        weaponDefinitionIds: ['weapon.a'],
        mapDefinitionIds: ['map.a'],
      },
      weaponMastery: [
        weaponMasteryRecord(definition, 'weapon.a', 120, true),
        weaponMasteryRecord(definition, 'weapon.b', 0, false),
      ],
      mapSegmentMastery: ['segment.a', 'segment.b', 'segment.c'].map(
        (segmentDefinitionId) => ({
          mapDefinitionId: 'map.a',
          segmentDefinitionId,
          completionEvidenceCount: 1,
          completedAtRevision: 4,
          bestRaceFinishTicks: null,
          bestSurvivalTicks: null,
        }),
      ),
      modeRecords: modeRecords(definition, 1, null),
    });
    expect(resolveArenaV2NextLearningGoalV1({
      ...input(definition, profile),
      eligibleWeaponDefinitionIds: ['weapon.a'],
    })).toMatchObject({
      kind: 'map-segment',
      mapDefinitionId: 'map.a',
      segmentDefinitionId: 'segment.d',
    });
    expect(resolveArenaV2NextLearningGoalV1({
      ...input(definition, profile),
      eligibleWeaponDefinitionIds: ['weapon.a', 'weapon.b'],
    })).toMatchObject({
      kind: 'collect-weapon',
      weaponDefinitionId: 'weapon.b',
      currentProgress: 0,
      targetProgress: 120,
    });
    expect(profile.weaponMastery.map(({ weaponDefinitionId, useCount }) => ({
      weaponDefinitionId,
      useCount,
    }))).toEqual([
      { weaponDefinitionId: 'weapon.a', useCount: 120 },
      { weaponDefinitionId: 'weapon.b', useCount: 0 },
    ]);
  });

  it('chooses the least-practiced map segment with Definition-order ties and no rotation state', () => {
    const definition = definitionFixture({
      masteryRequirements: {
        weaponCollectionUseEvidence: 120,
        weaponContextEvidence: {
          ground: 1,
          aerial: 1,
          edge: 1,
          'duel-counterplay': 1,
          survival: 1,
        },
        mapSegmentCompletionEvidence: 2,
        modeCompletionEvidence: 2,
      },
      mapDefinitions: [
        {
          mapDefinitionId: 'map.z',
          segmentDefinitionIds: ['segment.z-first', 'segment.z-second'],
        },
        {
          mapDefinitionId: 'map.a',
          segmentDefinitionIds: ['segment.a-first', 'segment.a-second'],
        },
      ],
      challengeDefinitions: [],
    });
    const firstMap = definition.mapDefinitions[0]!;
    const firstSegmentDefinitionId = firstMap.segmentDefinitionIds[0]!;
    const expectedSegmentDefinitionId = firstMap.segmentDefinitionIds[1]!;
    const profile = profileFrom(definition, {
      collections: {
        weaponDefinitionIds: ['weapon.a'],
        mapDefinitionIds: definition.mapDefinitions.map(({ mapDefinitionId }) => mapDefinitionId),
      },
      weaponMastery: [weaponMasteryRecord(definition, 'weapon.a', 7, true)],
      mapSegmentMastery: [{
        mapDefinitionId: firstMap.mapDefinitionId,
        segmentDefinitionId: firstSegmentDefinitionId,
        completionEvidenceCount: 1,
        completedAtRevision: null,
        bestRaceFinishTicks: null,
        bestSurvivalTicks: null,
      }],
      modeRecords: modeRecords(definition, 1, null),
    });
    const first = resolveArenaV2NextLearningGoalV1(input(definition, profile));
    const second = resolveArenaV2NextLearningGoalV1(input(definition, profile));
    expect(first).toMatchObject({
      kind: 'map-segment',
      mapDefinitionId: firstMap.mapDefinitionId,
      segmentDefinitionId: expectedSegmentDefinitionId,
      actionLabel: '经过这段路线的安全落点，或在这段路线形成一次有效命中反馈',
      currentProgress: 0,
      targetProgress: 2,
    });
    expect(second).toEqual(first);
  });

  it('keeps imported collected-low-count facts legal and goal identities mutually exclusive', () => {
    const definition = definitionFixture();
    const importedCollected = profileFrom(definition, {
      collections: { weaponDefinitionIds: ['weapon.a'], mapDefinitionIds: ['map.a'] },
      weaponMastery: [weaponMasteryRecord(definition, 'weapon.a', 7, false)],
      mapSegmentMastery: completedMapSegmentRecords(definition),
      modeRecords: modeRecords(definition, 1, null),
    });
    expect(resolveArenaV2NextLearningGoalV1(input(definition, importedCollected)))
      .toMatchObject({
        kind: 'collect-weapon',
        goalId: 'collect-weapon:weapon.a',
        currentProgress: 7,
        targetProgress: 120,
        actionLabel: '继续在一局中主要使用这把武器',
      });
    expect(resolveArenaV2WeaponLearningGoalV1(input(definition, importedCollected)))
      .toMatchObject({
        kind: 'collect-weapon',
        goalId: 'collect-weapon:weapon.a',
        currentProgress: 7,
        targetProgress: 120,
      });

    const ordinaryMastery = resolveArenaV2NextLearningGoalV1(input(
      definition,
      profileFixture(definition, 'mode-mastery'),
    ));
    const recordImprovement = resolveArenaV2NextLearningGoalV1(input(
      definition,
      profileFixture(definition, 'record-improvement'),
    ));
    const firstCompletion = resolveArenaV2NextLearningGoalV1(input(
      definition,
      profileFrom(definition, {
        collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
      }),
    ));
    const recordBase = profileFixture(definition, 'record-improvement');
    const catalogComplete = resolveArenaV2NextLearningGoalV1(input(
      definition,
      profileFrom(definition, {
        ...recordBase,
        modeRecords: recordBase.modeRecords.map(withComparableModeRecord),
      }),
    ));
    expect(firstCompletion).toMatchObject({
      kind: 'mode-mastery',
      goalId: 'mode-first-completion:mode.duel',
      currentProgress: 0,
      targetProgress: 1,
      effectiveLearningRequired: true,
    });
    expect(ordinaryMastery).toMatchObject({
      kind: 'mode-mastery',
      goalId: 'mode-mastery:mode.duel',
      currentProgress: 1,
      targetProgress: 2,
      effectiveLearningRequired: true,
    });
    expect(recordImprovement).toMatchObject({
      kind: 'record-improvement',
      goalId: 'record-improvement:mode.duel',
      currentProgress: 0,
      targetProgress: 1,
      effectiveLearningRequired: false,
    });
    expect(catalogComplete).toMatchObject({
      kind: 'catalog-complete',
      goalId: 'catalog-complete',
      currentProgress: 1,
      targetProgress: 1,
      effectiveLearningRequired: false,
    });
    expect(new Set([
      firstCompletion.goalId,
      ordinaryMastery.goalId,
      recordImprovement.goalId,
      catalogComplete.goalId,
    ]).size).toBe(4);
  });

  it('selects the first registered mode missing a comparable record with a meaningful 0-to-1 goal', () => {
    const definition = definitionFixture({
      modeDefinitions: [
        { modeDefinitionId: 'mode.survival', kind: 'survival' },
        { modeDefinitionId: 'mode.duel', kind: 'duel' },
        { modeDefinitionId: 'mode.race', kind: 'race' },
      ],
    });
    const base = profileFixture(definition, 'record-improvement');
    const profile = createArenaV2LearningProfileV1(definition, {
      ...base,
      modeRecords: [
        {
          modeDefinitionId: 'mode.duel', kind: 'duel', playCount: 2,
          completionCount: 2, winCount: 1, completedAtRevision: 5,
          bestPerformanceTicks: 900,
        },
        {
          modeDefinitionId: 'mode.race', kind: 'race', playCount: 2,
          completionCount: 2, winCount: 0, completedAtRevision: 5,
          bestPerformanceTicks: null,
        },
        {
          modeDefinitionId: 'mode.survival', kind: 'survival', playCount: 2,
          completionCount: 2, winCount: 0, completedAtRevision: 5,
          bestPerformanceTicks: 900,
        },
      ],
    });
    const goal = resolveArenaV2NextLearningGoalV1(input(definition, profile));
    expect(goal).toMatchObject({
      kind: 'record-improvement',
      goalId: 'record-improvement:mode.race',
      modeDefinitionId: 'mode.race',
      currentProgress: 0,
      targetProgress: 1,
      effectiveLearningRequired: false,
    });
  });

  it('publishes catalog-complete after every registered mode has a comparable record', () => {
    const definition = definitionFixture();
    const base = profileFixture(definition, 'record-improvement');
    const profile = createArenaV2LearningProfileV1(definition, {
      ...base,
      modeRecords: base.modeRecords.map(withComparableModeRecord),
    });
    const fullGoal = resolveArenaV2NextLearningGoalV1(input(definition, profile));
    expect(fullGoal).toMatchObject({
      kind: 'catalog-complete',
      goalId: 'catalog-complete',
      currentProgress: 1,
      targetProgress: 1,
      effectiveLearningRequired: false,
      actionLabel: '自由挑战或刷新任意个人记录',
    });
    expect(projectArenaV2CollectionNextGoalIdentityV1(input(definition, profile))).toEqual(
      identityFromFullGoal(fullGoal),
    );
  });

  it('uses a replacement dynamic Definition without retaining old identities', () => {
    const definition = definitionFixture({
      id: 'collection-next-goal.replacement.v1',
      weaponDefinitionIds: ['weapon.dynamic'],
      mapDefinitions: [{
        mapDefinitionId: 'map.dynamic',
        segmentDefinitionIds: ['segment.dynamic'],
      }],
      challengeDefinitions: [{
        challengeDefinitionId: 'challenge.dynamic',
        targetProgress: 1,
        weaponDefinitionId: 'weapon.dynamic',
        mapDefinitionId: 'map.dynamic',
        segmentDefinitionId: 'segment.dynamic',
        modeDefinitionId: 'mode.duel',
      }],
    });
    const identity = projectArenaV2CollectionNextGoalIdentityV1(input(
      definition,
      createArenaV2LearningProfileV1(definition),
    ));
    expect(identity).toMatchObject({
      kind: 'collect-map',
      goalId: 'collect-map:map.dynamic',
      mapDefinitionId: 'map.dynamic',
    });
  });

  it('inherits exact-input, future-schema, accessor and thenable rejection from the resolver', () => {
    const definition = definitionFixture();
    const profile = profileFixture(definition, 'collect-map');
    expect(() => projectArenaV2CollectionNextGoalIdentityV1({
      profileDefinition: definition,
      profile,
      future: true,
    })).toThrow(/不支持字段 future/);
    expect(() => projectArenaV2CollectionNextGoalIdentityV1({
      profileDefinition: definition,
      profile: { ...profile, schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION + 1 },
    })).toThrow(/schema 不受支持/);

    let getterCalls = 0;
    const options = Object.defineProperty({}, 'profileDefinition', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return definition;
      },
    });
    Object.defineProperty(options, 'profile', { enumerable: true, value: profile });
    expect(() => projectArenaV2CollectionNextGoalIdentityV1(options)).toThrow(
      /必须是可枚举数据字段/,
    );
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => projectArenaV2CollectionNextGoalIdentityV1({
      profileDefinition: definition,
      profile,
      then() {
        thenCalls += 1;
      },
    })).toThrow(/不支持字段 then/);
    expect(thenCalls).toBe(0);
  });

  it('is deterministic, detached and records catalog-complete as a reachable terminal goal', () => {
    const definition = definitionFixture();
    const source = JSON.parse(JSON.stringify(
      profileFixture(definition, 'weapon-context'),
    )) as Record<string, unknown>;
    const first = projectArenaV2CollectionNextGoalIdentityV1({
      profileDefinition: definition,
      profile: source,
    });
    const second = projectArenaV2CollectionNextGoalIdentityV1({
      profileDefinition: definition,
      profile: source,
    });
    expect(second).toEqual(first);
    source.revision = 99;
    expect(first.profileRevision).toBe(7);
    expect(ARENA_V2_COLLECTION_NEXT_GOAL_IDENTITY_PROJECTION_V1_METADATA).toEqual({
      status: 'production-unreachable',
      defaultSurfaceWired: false,
      validationStatus: 'not-run',
      inheritedUnreachableGoalKinds: [],
      inheritedUnreachableGoalReason: null,
      catalogCompleteReachable: true,
      catalogCompleteKindMeaning: 'resolved-learning-scope-complete',
      fullCatalogTerminalGoalId: 'catalog-complete',
      activeLearningCompletionGoalId: 'active-learning-complete',
      fullCatalogTerminalMeaning: 'free-challenge-or-record-refresh',
    });
    expect(Object.isFrozen(
      ARENA_V2_COLLECTION_NEXT_GOAL_IDENTITY_PROJECTION_V1_METADATA
        .inheritedUnreachableGoalKinds,
    )).toBe(true);
  });
});
