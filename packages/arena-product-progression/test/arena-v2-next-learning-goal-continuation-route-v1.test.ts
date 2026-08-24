import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
  ARENA_V2_NEXT_LEARNING_GOAL_CONTINUATION_ROUTE_V1,
  resolveArenaV2NextLearningGoalContinuationRouteV1,
  resolveArenaV2NextLearningGoalV1,
} from '../src/index.js';

const definition = createArenaV2LearningProfileDefinitionV1({
  schemaVersion: ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  id: 'continuation-route.test.v1',
  contentVersion: 1,
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
    modeCompletionEvidence: 1,
  },
  defaultProfileId: 'local',
  initiallyCollectedWeaponDefinitionIds: [],
  initiallyCollectedMapDefinitionIds: [],
  weaponDefinitionIds: ['weapon.a'],
  mapDefinitions: [{ mapDefinitionId: 'map.a', segmentDefinitionIds: ['segment.a'] }],
  modeDefinitions: [
    { modeDefinitionId: 'mode.duel', kind: 'duel' },
    { modeDefinitionId: 'mode.race', kind: 'race' },
    { modeDefinitionId: 'mode.survival', kind: 'survival' },
  ],
  challengeDefinitions: [{
    challengeDefinitionId: 'challenge.survival',
    targetProgress: 1,
    weaponDefinitionId: 'weapon.a',
    mapDefinitionId: 'map.a',
    segmentDefinitionId: 'segment.a',
    modeDefinitionId: 'mode.survival',
  }],
});

function route(nextGoal: ReturnType<typeof resolveArenaV2NextLearningGoalV1>) {
  return resolveArenaV2NextLearningGoalContinuationRouteV1({
    profileDefinition: definition,
    nextGoal,
  });
}

describe('Arena V2 next learning goal continuation route V1', () => {
  it('routes map learning to race without adding a new task', () => {
    const nextGoal = resolveArenaV2NextLearningGoalV1({
      profileDefinition: definition,
      profile: createArenaV2LearningProfileV1(definition),
    });
    expect(nextGoal.actionLabel).toBe('竞速亲自冲线，或完成1v1/生存来收藏地图');
    expect(route(nextGoal)).toMatchObject({
      goalKind: 'collect-map',
      continuationKind: 'map-route-practice',
      recommendedModeKind: 'race',
      targetMapDefinitionId: 'map.a',
      requiresTargetMapSelection: true,
      requiresTargetWeaponSelection: false,
    });
  });

  it('routes a generic weapon research goal to deterministic duel loadout', () => {
    const profile = createArenaV2LearningProfileV1(definition, {
      ...createArenaV2LearningProfileV1(definition),
      collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
      modeRecords: definition.modeDefinitions.map((mode) => ({
        modeDefinitionId: mode.modeDefinitionId,
        kind: mode.kind,
        playCount: 1,
        completionCount: 1,
        winCount: mode.kind === 'survival' ? 0 : 1,
        bestPerformanceTicks: 600,
      })),
    });
    const nextGoal = resolveArenaV2NextLearningGoalV1({
      profileDefinition: definition,
      profile,
    });
    expect(route(nextGoal)).toMatchObject({
      goalKind: 'collect-weapon',
      continuationKind: 'deterministic-weapon-loadout',
      recommendedModeKind: 'duel',
      targetWeaponDefinitionId: 'weapon.a',
      requiresTargetWeaponSelection: true,
      targetWeaponRequiresWorldPickup: false,
    });
  });

  it('keeps an explicit survival weapon challenge conditional on world supply', () => {
    const nextGoal = Object.freeze({
      schemaVersion: 1 as const,
      profileRevision: 8,
      kind: 'cross-challenge' as const,
      goalId: 'cross-challenge:challenge.survival',
      question: '下一项武器、地图和模式交叉目标是什么？',
      actionLabel: '在指定路段用指定武器命中一次',
      currentProgress: 0,
      targetProgress: 1,
      weaponDefinitionId: 'weapon.a',
      mapDefinitionId: 'map.a',
      segmentDefinitionId: 'segment.a',
      modeDefinitionId: 'mode.survival',
      challengeDefinitionId: 'challenge.survival',
      context: null,
      effectiveLearningRequired: true,
    });
    expect(route(nextGoal)).toMatchObject({
      continuationKind: 'conditional-survival-supply',
      recommendedModeKind: 'survival',
      requiresTargetWeaponSelection: false,
      targetWeaponRequiresWorldPickup: true,
      requiresTargetMapSelection: true,
    });
  });

  it('keeps active-pool completion on free choice without claiming the full catalog terminal', () => {
    const nextGoal = Object.freeze({
      schemaVersion: 1 as const,
      profileRevision: 8,
      kind: 'catalog-complete' as const,
      goalId: ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
      question: '当前已开放学习内容是否已经闭合？',
      actionLabel: '自由练习当前开放内容，等待新武器开放',
      currentProgress: 1,
      targetProgress: 1,
      weaponDefinitionId: null,
      mapDefinitionId: null,
      segmentDefinitionId: null,
      modeDefinitionId: null,
      challengeDefinitionId: null,
      context: null,
      effectiveLearningRequired: false,
    });
    expect(route(nextGoal)).toMatchObject({
      goalId: ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
      goalKind: 'catalog-complete',
      continuationKind: 'free-choice',
      recommendedModeKind: null,
    });
  });

  it('routes only the stable full-catalog identity to full free choice', () => {
    const nextGoal = Object.freeze({
      schemaVersion: 1 as const,
      profileRevision: 8,
      kind: 'catalog-complete' as const,
      goalId: ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
      question: '完整学习目录是否已经闭合？',
      actionLabel: '自由挑战或刷新个人记录',
      currentProgress: 1,
      targetProgress: 1,
      weaponDefinitionId: null,
      mapDefinitionId: null,
      segmentDefinitionId: null,
      modeDefinitionId: null,
      challengeDefinitionId: null,
      context: null,
      effectiveLearningRequired: false,
    });
    expect(route(nextGoal)).toMatchObject({
      goalId: ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
      goalKind: 'catalog-complete',
      continuationKind: 'free-choice',
      recommendedModeDefinitionId: null,
      recommendedModeKind: null,
    });
  });

  it('rejects unknown or kind-mismatched scope completion identities before routing', () => {
    const activeCompletion = Object.freeze({
      schemaVersion: 1 as const,
      profileRevision: 8,
      kind: 'catalog-complete' as const,
      goalId: ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
      question: '当前已开放学习内容是否已经闭合？',
      actionLabel: '自由练习当前开放内容，等待新武器开放',
      currentProgress: 1,
      targetProgress: 1,
      weaponDefinitionId: null,
      mapDefinitionId: null,
      segmentDefinitionId: null,
      modeDefinitionId: null,
      challengeDefinitionId: null,
      context: null,
      effectiveLearningRequired: false,
    });
    expect(() => route({ ...activeCompletion, goalId: 'future-learning-complete' }))
      .toThrow(/catalog-complete.*身份/);
    expect(() => route({ ...activeCompletion, kind: 'record-improvement' }))
      .toThrow(/record-improvement.*身份/);
  });

  it('declares that free choice consumes stable scope-completion identities once', () => {
    expect(ARENA_V2_NEXT_LEARNING_GOAL_CONTINUATION_ROUTE_V1).toMatchObject({
      freeChoiceUsesStableScopeCompletionGoalIds: true,
      freeChoiceDoesNotUseCatalogKindAlone: true,
      scopeCompletionIdentityDerivedOnce: true,
      status: 'production-unreachable',
      hardGate: false,
      validationStatus: 'not-run',
    });
  });

  it('rejects forged goal identity before choosing a continuation mode', () => {
    const nextGoal = resolveArenaV2NextLearningGoalV1({
      profileDefinition: definition,
      profile: createArenaV2LearningProfileV1(definition),
    });
    expect(() => route({ ...nextGoal, goalId: 'collect-map:future-map' }))
      .toThrow(/collect-map.*身份/);
  });
});
