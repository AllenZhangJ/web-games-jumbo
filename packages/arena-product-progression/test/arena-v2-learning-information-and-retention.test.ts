import { describe, expect, it } from 'vitest';
import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  advanceArenaV2LearningProfileV1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ARENA_V2_LEARNING_RESULT_PROGRESS_READABILITY_CONTRACT_V1,
  ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_RESULT_NEXT_GOAL_ROUTE_FIT_V1,
  ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1,
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1,
  ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1,
  ArenaV2OfflineRetentionObservationJournalCandidateV1,
  aggregateArenaV2RetentionObservationsV1,
  createArenaV2MapLearningFocusContinuationObservationV1,
  createArenaV2RetentionObservationV1,
  createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1,
  createArenaV2WeaponResearchFocusContinuationObservationV1,
  orderArenaV2NewCollectionDefinitionIdsV1,
  projectArenaV2LearningInformationV1,
  projectArenaV2LearningPaceCalibrationCandidateV1,
  projectArenaV2WeaponResearchPaceCalibrationFromAccumulatedEvidenceCandidateV1,
  projectArenaV2WeaponResearchPaceCalibrationCandidateV1,
  resolveArenaV2ResultNextGoalRouteFitV1,
} from '../src/index.js';

const DEFINITION = createArenaV2LearningProfileDefinitionV1({
  schemaVersion: ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  id: 'learning-information.test.v1',
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
    weaponCollectionUseEvidence: 1,
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
  weaponDefinitionIds: ['weapon.a', 'weapon.b'],
  mapDefinitions: [{
    mapDefinitionId: 'map.a',
    segmentDefinitionIds: ['segment.a', 'segment.b'],
  }],
  modeDefinitions: [
    { modeDefinitionId: 'mode.duel', kind: 'duel' },
    { modeDefinitionId: 'mode.race', kind: 'race' },
    { modeDefinitionId: 'mode.survival', kind: 'survival' },
  ],
  challengeDefinitions: [],
});

const MILESTONE_DEFINITION = createArenaV2LearningProfileDefinitionV1({
  ...DEFINITION,
  id: 'learning-information.milestone.test.v1',
  masteryRequirements: {
    ...DEFINITION.masteryRequirements,
    weaponCollectionUseEvidence: 120,
  },
});

const REVERSE_DIRECTORY_DEFINITION = createArenaV2LearningProfileDefinitionV1({
  ...DEFINITION,
  id: 'learning-information.reverse-directory.test.v1',
  weaponDefinitionIds: ['weapon.z', 'weapon.a'],
  mapDefinitions: [
    { mapDefinitionId: 'map.z', segmentDefinitionIds: ['segment.z'] },
    { mapDefinitionId: 'map.a', segmentDefinitionIds: ['segment.a'] },
  ],
});

function committedProfile() {
  return advanceArenaV2LearningProfileV1(
    DEFINITION,
    createArenaV2LearningProfileV1(DEFINITION),
    {
      schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
      grantId: 'grant.1',
      resultAuthorityHash: 'deadbeef',
      recipientParticipantId: 'p1',
      sourceModeDefinitionId: 'mode.survival',
      sourceMapDefinitionIds: ['map.a'],
      collectedWeaponDefinitionIds: ['weapon.a'],
      collectedMapDefinitionIds: ['map.a'],
      weaponDeltas: [{
        weaponDefinitionId: 'weapon.a',
        useCountDelta: 1,
        contextEvidence: [
          { context: 'aerial', evidenceDelta: 1 },
          { context: 'survival', evidenceDelta: 1 },
        ],
      }],
      mapSegmentDeltas: [{
        mapDefinitionId: 'map.a',
        segmentDefinitionId: 'segment.a',
        completionEvidenceDelta: 1,
        raceFinishTicksCandidate: null,
        survivalTicksCandidate: 600,
      }],
      modeDelta: {
        modeDefinitionId: 'mode.survival',
        playCountDelta: 1,
        completionCountDelta: 1,
        winCountDelta: 0,
        bestPerformanceTicksCandidate: 600,
      },
      challengeDeltas: [],
    },
    0,
  );
}

function milestoneProfile(
  initialCount = 29,
  grantId = 'grant.milestone.30',
) {
  const baseline = createArenaV2LearningProfileV1(MILESTONE_DEFINITION, {
    schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
    profileDefinitionId: MILESTONE_DEFINITION.id,
    profileDefinitionContentVersion: MILESTONE_DEFINITION.contentVersion,
    profileId: 'local',
    revision: 5,
    committedGrantIds: [],
    collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
    weaponMastery: [{
      weaponDefinitionId: 'weapon.a',
      useCount: initialCount,
      contexts: [
        { context: 'ground', evidenceCount: 0, completedAtRevision: null },
        { context: 'aerial', evidenceCount: 0, completedAtRevision: null },
        { context: 'edge', evidenceCount: 0, completedAtRevision: null },
        { context: 'duel-counterplay', evidenceCount: 0, completedAtRevision: null },
        { context: 'survival', evidenceCount: 0, completedAtRevision: null },
      ],
    }],
    mapSegmentMastery: [],
    modeRecords: [],
    challenges: [],
  });
  return advanceArenaV2LearningProfileV1(
    MILESTONE_DEFINITION,
    baseline,
    {
      schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
      grantId,
      resultAuthorityHash: '30c0ffee',
      recipientParticipantId: 'p1',
      sourceModeDefinitionId: 'mode.survival',
      sourceMapDefinitionIds: ['map.a'],
      collectedWeaponDefinitionIds: ['weapon.a'],
      collectedMapDefinitionIds: ['map.a'],
      weaponDeltas: [{
        weaponDefinitionId: 'weapon.a',
        useCountDelta: 1,
        contextEvidence: [
          { context: 'aerial', evidenceDelta: 1 },
          { context: 'survival', evidenceDelta: 1 },
        ],
      }],
      mapSegmentDeltas: [],
      modeDelta: {
        modeDefinitionId: 'mode.survival',
        playCountDelta: 1,
        completionCountDelta: 1,
        winCountDelta: 0,
        bestPerformanceTicksCandidate: 600,
      },
      challengeDeltas: [],
    },
    5,
  );
}

function cappedRepeatProfile(
  current: ReturnType<typeof milestoneProfile>['profile'],
) {
  return advanceArenaV2LearningProfileV1(
    MILESTONE_DEFINITION,
    current,
    {
      schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
      grantId: 'grant.milestone.after-cap',
      resultAuthorityHash: 'c01dcafe',
      recipientParticipantId: 'p1',
      sourceModeDefinitionId: 'mode.survival',
      sourceMapDefinitionIds: ['map.a'],
      collectedWeaponDefinitionIds: ['weapon.a'],
      collectedMapDefinitionIds: ['map.a'],
      weaponDeltas: [{
        weaponDefinitionId: 'weapon.a',
        useCountDelta: 1,
        contextEvidence: [
          { context: 'aerial', evidenceDelta: 1 },
          { context: 'survival', evidenceDelta: 1 },
        ],
      }],
      mapSegmentDeltas: [],
      modeDelta: {
        modeDefinitionId: 'mode.survival',
        playCountDelta: 1,
        completionCountDelta: 1,
        winCountDelta: 0,
        bestPerformanceTicksCandidate: 600,
      },
      challengeDeltas: [],
    },
    current.revision,
  );
}

function importedCollectedMilestoneProfile() {
  const imported = createArenaV2LearningProfileV1(MILESTONE_DEFINITION, {
    schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
    profileDefinitionId: MILESTONE_DEFINITION.id,
    profileDefinitionContentVersion: MILESTONE_DEFINITION.contentVersion,
    profileId: 'local',
    revision: 7,
    committedGrantIds: ['grant.imported'],
    collections: { weaponDefinitionIds: ['weapon.a'], mapDefinitionIds: ['map.a'] },
    weaponMastery: [{
      weaponDefinitionId: 'weapon.a',
      useCount: 29,
      contexts: [
        { context: 'ground', evidenceCount: 0, completedAtRevision: null },
        { context: 'aerial', evidenceCount: 0, completedAtRevision: null },
        { context: 'edge', evidenceCount: 0, completedAtRevision: null },
        { context: 'duel-counterplay', evidenceCount: 0, completedAtRevision: null },
        { context: 'survival', evidenceCount: 0, completedAtRevision: null },
      ],
    }],
    mapSegmentMastery: [],
    modeRecords: [],
    challenges: [],
  });
  return advanceArenaV2LearningProfileV1(
    MILESTONE_DEFINITION,
    imported,
    {
      schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
      grantId: 'grant.imported.progress',
      resultAuthorityHash: '1a2b3c4d',
      recipientParticipantId: 'p1',
      sourceModeDefinitionId: 'mode.survival',
      sourceMapDefinitionIds: ['map.a'],
      collectedWeaponDefinitionIds: ['weapon.a'],
      collectedMapDefinitionIds: ['map.a'],
      weaponDeltas: [{
        weaponDefinitionId: 'weapon.a',
        useCountDelta: 1,
        contextEvidence: [
          { context: 'aerial', evidenceDelta: 1 },
          { context: 'survival', evidenceDelta: 1 },
        ],
      }],
      mapSegmentDeltas: [],
      modeDelta: {
        modeDefinitionId: 'mode.survival',
        playCountDelta: 1,
        completionCountDelta: 1,
        winCountDelta: 0,
        bestPerformanceTicksCandidate: 600,
      },
      challengeDeltas: [],
    },
    imported.revision,
  );
}

function modeProgressProfile(
  kind: 'duel' | 'race' | 'survival',
  bestPerformanceTicksCandidate: number | null,
  completionCountDelta = 1,
  winCountDelta = kind !== 'survival' && bestPerformanceTicksCandidate !== null ? 1 : 0,
) {
  const modeDefinitionId = `mode.${kind}`;
  const emptyProfile = createArenaV2LearningProfileV1(DEFINITION);
  const baseline = createArenaV2LearningProfileV1(DEFINITION, {
    ...emptyProfile,
    collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
  });
  return advanceArenaV2LearningProfileV1(
    DEFINITION,
    baseline,
    {
      schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
      grantId: `grant.personal-best.${kind}.${bestPerformanceTicksCandidate ?? 'none'}`,
      resultAuthorityHash: kind === 'duel'
        ? 'd0e1f2a3'
        : kind === 'race' ? 'a1b2c3d4' : '5e6f7081',
      recipientParticipantId: 'p1',
      sourceModeDefinitionId: modeDefinitionId,
      sourceMapDefinitionIds: ['map.a'],
      collectedWeaponDefinitionIds: [],
      collectedMapDefinitionIds: kind === 'race'
        ? bestPerformanceTicksCandidate === null ? [] : ['map.a']
        : completionCountDelta === 1 ? ['map.a'] : [],
      weaponDeltas: [],
      mapSegmentDeltas: [],
      modeDelta: {
        modeDefinitionId,
        playCountDelta: 1,
        completionCountDelta,
        winCountDelta,
        bestPerformanceTicksCandidate,
      },
      challengeDeltas: [],
    },
    0,
  );
}

function noEffectiveModeProgressProfile(kind: 'duel' | 'race' | 'survival') {
  const modeDefinitionId = `mode.${kind}`;
  const baseline = createArenaV2LearningProfileV1(DEFINITION, {
    schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
    profileDefinitionId: DEFINITION.id,
    profileDefinitionContentVersion: DEFINITION.contentVersion,
    profileId: 'local',
    revision: 1,
    committedGrantIds: [],
    collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
    weaponMastery: [],
    mapSegmentMastery: [],
    modeRecords: [{
      modeDefinitionId,
      kind,
      playCount: 5,
      completionCount: kind === 'race' ? 1 : 5,
      winCount: kind === 'survival' ? 0 : 1,
      completedAtRevision: 1,
      bestPerformanceTicks: 6_000,
    }],
    challenges: [],
  });
  return advanceArenaV2LearningProfileV1(
    DEFINITION,
    baseline,
    {
      schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
      grantId: `grant.no-effective-progress.${kind}`,
      resultAuthorityHash: kind === 'duel'
        ? '1111aaaa'
        : kind === 'race' ? '2222bbbb' : '3333cccc',
      recipientParticipantId: 'p1',
      sourceModeDefinitionId: modeDefinitionId,
      sourceMapDefinitionIds: ['map.a'],
      collectedWeaponDefinitionIds: [],
      collectedMapDefinitionIds: kind === 'race' ? [] : ['map.a'],
      weaponDeltas: [],
      mapSegmentDeltas: [],
      modeDelta: {
        modeDefinitionId,
        playCountDelta: 1,
        completionCountDelta: kind === 'race' ? 0 : 1,
        winCountDelta: 0,
        bestPerformanceTicksCandidate: kind === 'survival' ? 5_000 : null,
      },
      challengeDeltas: [],
    },
    baseline.revision,
  );
}

function observation(
  eventId: string,
  eventSequence: number,
  overrides: Readonly<Record<string, unknown>>,
) {
  return {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSinkWired: false,
    eventId,
    cohortSubjectId: 'opaque-subject-a',
    sessionSequence: 1,
    eventSequence,
    profileRevision: 1,
    authorityTick: null,
    kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CATALOG_FIRST_SEEN,
    weaponDefinitionIds: [],
    mapDefinitionIds: [],
    modeDefinitionIds: [],
    goalId: null,
    repeatOrdinal: 1,
    effectiveLearningProgress: null,
    goalSelected: null,
    ...overrides,
  };
}

describe('Arena V2 P6 information and retention candidates', () => {
  const weaponDisplayNames = Object.freeze([
    Object.freeze({ weaponDefinitionId: 'weapon.a', displayName: '冲锋盾' }),
    Object.freeze({ weaponDefinitionId: 'weapon.b', displayName: '重锤' }),
  ]);
  const milestoneWeaponDisplayNames = Object.freeze([
    Object.freeze({ weaponDefinitionId: 'weapon.a', displayName: '冲锋盾' }),
  ]);
  const mapDisplayNames = Object.freeze([Object.freeze({
    mapDefinitionId: 'map.a',
    displayName: '空港断层',
    segments: Object.freeze([
      Object.freeze({ segmentDefinitionId: 'segment.a', displayName: '起步平台' }),
      Object.freeze({ segmentDefinitionId: 'segment.b', displayName: '断层跨越' }),
    ]),
  })]);

  it('orders new collection identities by the formal Definition instead of stored IDs', () => {
    expect(orderArenaV2NewCollectionDefinitionIdsV1(
      REVERSE_DIRECTORY_DEFINITION,
      ['weapon.a'],
      ['map.a', 'map.z'],
    )).toEqual({
      weaponDefinitionIds: ['weapon.a'],
      mapDefinitionIds: ['map.z', 'map.a'],
    });
    expect(() => orderArenaV2NewCollectionDefinitionIdsV1(
      REVERSE_DIRECTORY_DEFINITION,
      ['weapon.a', 'weapon.a'],
      [],
    )).toThrow(/重复/);
    expect(() => orderArenaV2NewCollectionDefinitionIdsV1(
      REVERSE_DIRECTORY_DEFINITION,
      ['weapon.a', 'weapon.z'],
      [],
    )).toThrow(/每局最多只能有一把/);
    expect(() => orderArenaV2NewCollectionDefinitionIdsV1(
      REVERSE_DIRECTORY_DEFINITION,
      [],
      ['map.unknown'],
    )).toThrow(/不是当前Learning Definition身份/);
    const sparse = new Array<string>(1);
    expect(() => orderArenaV2NewCollectionDefinitionIdsV1(
      REVERSE_DIRECTORY_DEFINITION,
      [],
      sparse,
    )).toThrow(/稠密数据字段/);
    let accessorReads = 0;
    const accessor: string[] = [];
    accessor.length = 1;
    Object.defineProperty(accessor, '0', {
      enumerable: true,
      get: () => {
        accessorReads += 1;
        return 'map.a';
      },
    });
    expect(() => orderArenaV2NewCollectionDefinitionIdsV1(
      REVERSE_DIRECTORY_DEFINITION,
      [],
      accessor,
    )).toThrow(/稠密数据字段/);
    expect(accessorReads).toBe(0);
    const extra = Object.assign(['map.a'], { extra: true });
    expect(() => orderArenaV2NewCollectionDefinitionIdsV1(
      REVERSE_DIRECTORY_DEFINITION,
      [],
      extra,
    )).toThrow(/额外或Symbol字段/);
    const symbolExtra = ['map.a'];
    Object.defineProperty(symbolExtra, Symbol('extra'), { value: true });
    expect(() => orderArenaV2NewCollectionDefinitionIdsV1(
      REVERSE_DIRECTORY_DEFINITION,
      [],
      symbolExtra,
    )).toThrow(/额外或Symbol字段/);
  });

  it('projects collection separately from five-context understanding without owning P5 content copy', () => {
    const outcome = committedProfile();
    const projection = projectArenaV2LearningInformationV1({
      profileDefinition: DEFINITION,
      profile: outcome.profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      settlement: {
        status: 'committed',
        grantId: 'grant.1',
        profileRevision: outcome.profile.revision,
        sourceModeDefinitionId: outcome.grant.sourceModeDefinitionId,
        effectiveLearningProgress: outcome.effectiveLearningProgress,
        progressKinds: outcome.progressKinds,
        researchedWeaponDefinitionId: outcome.researchedWeaponDefinitionId,
        weaponContextEvidenceDeltas: outcome.weaponContextEvidenceDeltas,
        mapSegmentEvidenceDeltas: outcome.mapSegmentEvidenceDeltas,
        mapRouteEvidenceDeltas: outcome.mapRouteEvidenceDeltas,
        modeCompletionDeltas: outcome.modeCompletionDeltas,
        challengeProgressDeltas: outcome.challengeProgressDeltas,
        newlyCollectedWeaponDefinitionIds: outcome.newlyCollectedWeaponDefinitionIds,
        newlyCollectedMapDefinitionIds: outcome.newlyCollectedMapDefinitionIds,
      },
      eligibleWeaponDefinitionIds: undefined,
      weaponDisplayNames,
      mapDisplayNames,
    });
    expect(projection.defaultSurfaceWired).toBe(false);
    expect(ARENA_V2_LEARNING_RESULT_PROGRESS_READABILITY_CONTRACT_V1).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      hardGate: false,
      mapRouteSettlementShowsAppliedDeltaAndCumulativePosition: true,
      mapRouteCumulativePositionSource:
        'validated-map-route-delta-and-collection-progress-route-research',
      modeCompletionSettlementShowsAppliedDeltaAndOverallPosition: true,
      modeCompletionCumulativePositionSource:
        'reducer-applied-mode-completion-delta-and-validated-mode-record',
      allEffectiveProgressReceiptsVisible: true,
      weaponResearchSettlementShowsCatalogJourney: true,
      weaponContextSettlementShowsCatalogJourney: true,
      detailAndMapModeMasteryUseSharedJourney: true,
      weaponDetailShowsCatalogJourneys: true,
      mapDetailShowsCatalogRouteJourney: true,
      personalBestSettlementExplicitlyMarksNewRecord: true,
      validationStatus: 'not-run',
    });
    expect(projection.weaponGoal.weaponDefinitionId).toBe('weapon.b');
    expect(projection.mapGoal.segmentDefinitionId).toBe('segment.b');
    expect(projection.homeRecordSummary).toMatchObject({
      schemaVersion: 1,
      modeMasteryProgress: 1,
      modeMasteryTarget: 3,
      collectedWeaponCount: 1,
      weaponCount: 2,
      weaponMainResearchProgress: 1,
      weaponMainResearchTarget: 2,
      completedWeaponContextCount: 2,
      weaponContextCount: 10,
      weaponContextEvidenceProgress: 2,
      weaponContextEvidenceTarget: 10,
      completedWeaponContextEvidence: 2,
      collectedMapCount: 1,
      mapCount: 1,
      completedMapSegmentCount: 1,
      mapSegmentCount: 2,
      mapRouteResearchProgress: 1,
      mapRouteResearchTarget: 2,
      completedChallengeCount: 0,
      challengeCount: 0,
      challengeProgress: 0,
      challengeProgressTarget: 0,
      compactText: '1v1 --｜竞速 --｜生存 00:10；模式熟练1/3·武器1/2·主研究1/2·情境2/10·情境研究2/10·地图1/1·路线1/2·路线研究1/2',
    });
    expect(projection.homeRecordSummary.modeRecords.map(({ kind }) => kind)).toEqual([
      'duel', 'race', 'survival',
    ]);
    expect(projection.homeRecordSummary.modeRecords[2]).toMatchObject({
      modeDefinitionId: 'mode.survival',
      playCount: 1,
      completionCount: 1,
      winCount: 0,
      bestPerformanceTicks: 600,
      compactText: '生存 00:10',
    });
    expect(projection.homeRecordSummary.accessibilityText)
      .toContain('已收藏1/2把武器，已完成2/10项武器实战情境，全部武器累计情境研究进度2/10；已收藏1/1张地图；已完整理解1/2个地图路段');
    expect(projection.screens.find(({ screenId }) => screenId === 'weapon-index')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'owned-progress')?.valueText)
      .toBe('收藏1/2；主研究1/2；至少还需1局；阶段不加战力');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('空港断层（第1张地图）·起步平台（第1段路线）：本局完成1次安全落点或有效命中，当前1/1，已理解');
    expect(projection.screens.find(({ screenId }) => screenId === 'weapon-detail')
      ?.fieldValues.map(({ fieldId }) => fieldId)).toEqual(['weapon-record']);
    expect(projection.screens.find(({ screenId }) => screenId === 'weapon-detail')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'weapon-record')?.valueText)
      .toContain('地面0/1、空中0/1、边缘0/1、1v1反制0/1、生存1/1已理解');
    expect(projection.screens.find(({ screenId }) => screenId === 'weapon-detail')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'weapon-record')?.valueText)
      .toContain('下一局优先练地面情境0/1：在地面用这把武器形成一次有效武器反馈');
    expect(projection.screens.find(({ screenId }) => screenId === 'weapon-detail')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'weapon-record')?.valueText)
      .toContain('全武器主研究1/2；全部武器情境研究2/10');
    expect(projection.screens.find(({ screenId }) => screenId === 'weapon-index')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'practice-target')?.valueText)
      .toContain('重锤（第2把武器）');
    expect(projection.screens.find(({ screenId }) => screenId === 'map-index')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-map')?.valueText)
      .toContain('空港断层（第1张地图）·断层跨越（第2段路线）');
    expect(projection.screens.find(({ screenId }) => screenId === 'map-detail')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'mode-records')?.valueText)
      .toContain('下一路段断层跨越（第2段）0/1：经过这段路线的安全落点，或在这段路线形成一次有效命中反馈');
    expect(projection.screens.find(({ screenId }) => screenId === 'map-index')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'mode-coverage')?.valueText)
      .toBe('模式熟练1/3');
    expect(projection.screens.find(({ screenId }) => screenId === 'map-detail')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'mode-records')?.valueText)
      .toContain('模式熟练1/3；全部地图路线研究1/2；全部路线理解1/2');
    expect(projection.screens.find(({ screenId }) => screenId === 'map-detail')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'mode-records')?.accessibilityText)
      .toContain('起步平台（第1段）1/1已理解、断层跨越（第2段）0/1');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.map(({ fieldId }) => fieldId)).toEqual([
      'earned-progress', 'next-goal', 'collection-change',
    ]);
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('完成：冲锋盾·主研究1次·1/1·已收藏·主研究完成·全武器主研究1/2·收藏1/2；冲锋盾·生存武器应用1次·1/1已理解·全部武器情境研究2/10');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('生存·本局+1·当前1/1·整体1/3');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('新个人最佳·生存最长坚持 00:10');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .not.toContain('另有');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('下一段：断层跨越0/1');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('空港断层·整图路线本局+1·累计1/2·理解1/2段');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.accessibilityText)
      .toContain('冲锋盾（第1把武器）·生存：本局完成1次武器应用，当前1/1，已理解');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.accessibilityText)
      .toContain('全部武器情境研究进度2/10');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.accessibilityText)
      .toContain('生存：本局增加1次有效模式完成，当前1/1；三种模式整体熟练进度1/3');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.accessibilityText)
      .toContain('空港断层（第1张地图）·起步平台（第1段路线）：本局完成1次安全落点或有效命中，当前1/1，已理解');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.accessibilityText)
      .toContain('空港断层（第1张地图）整张路线：本局累计增加1点有效路线证据，当前1/2，已完整理解1/2个路段');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal')?.valueText)
      .toContain('稳定推进：切换到常规1v1');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal')?.accessibilityText)
      .toContain('要推进这个长期目标，需要切换到常规1v1');
  });

  it('shows the exact applied cross-challenge receipt before lower-priority summary facts', () => {
    const challengeDefinition = createArenaV2LearningProfileDefinitionV1({
      ...DEFINITION,
      id: 'learning-information.challenge-receipt.test.v1',
      challengeDefinitions: [{
        challengeDefinitionId: 'challenge.weapon-map-survival',
        targetProgress: 2,
        weaponDefinitionId: 'weapon.a',
        mapDefinitionId: 'map.a',
        segmentDefinitionId: 'segment.a',
        modeDefinitionId: 'mode.survival',
      }],
    });
    const outcome = advanceArenaV2LearningProfileV1(
      challengeDefinition,
      createArenaV2LearningProfileV1(challengeDefinition),
      {
        schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
        grantId: 'grant.challenge-receipt',
        resultAuthorityHash: 'ace0face',
        recipientParticipantId: 'p1',
        sourceModeDefinitionId: 'mode.survival',
        sourceMapDefinitionIds: ['map.a'],
        collectedWeaponDefinitionIds: ['weapon.a'],
        collectedMapDefinitionIds: ['map.a'],
        weaponDeltas: [{
          weaponDefinitionId: 'weapon.a',
          useCountDelta: 1,
          contextEvidence: [
            { context: 'ground', evidenceDelta: 1 },
            { context: 'survival', evidenceDelta: 1 },
          ],
        }],
        mapSegmentDeltas: [{
          mapDefinitionId: 'map.a',
          segmentDefinitionId: 'segment.a',
          completionEvidenceDelta: 1,
          raceFinishTicksCandidate: null,
          survivalTicksCandidate: 600,
        }],
        modeDelta: {
          modeDefinitionId: 'mode.survival',
          playCountDelta: 1,
          completionCountDelta: 1,
          winCountDelta: 0,
          bestPerformanceTicksCandidate: 600,
        },
        challengeDeltas: [{
          challengeDefinitionId: 'challenge.weapon-map-survival',
          progressDelta: 1,
        }],
      },
      0,
    );
    const projection = projectArenaV2LearningInformationV1({
      profileDefinition: challengeDefinition,
      profile: outcome.profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      settlement: {
        status: 'committed',
        grantId: outcome.grant.grantId,
        profileRevision: outcome.profile.revision,
        sourceModeDefinitionId: outcome.grant.sourceModeDefinitionId,
        effectiveLearningProgress: outcome.effectiveLearningProgress,
        progressKinds: outcome.progressKinds,
        researchedWeaponDefinitionId: outcome.researchedWeaponDefinitionId,
        weaponContextEvidenceDeltas: outcome.weaponContextEvidenceDeltas,
        mapSegmentEvidenceDeltas: outcome.mapSegmentEvidenceDeltas,
        mapRouteEvidenceDeltas: outcome.mapRouteEvidenceDeltas,
        modeCompletionDeltas: outcome.modeCompletionDeltas,
        challengeProgressDeltas: outcome.challengeProgressDeltas,
        newlyCollectedWeaponDefinitionIds: outcome.newlyCollectedWeaponDefinitionIds,
        newlyCollectedMapDefinitionIds: outcome.newlyCollectedMapDefinitionIds,
      },
      eligibleWeaponDefinitionIds: undefined,
      weaponDisplayNames,
      mapDisplayNames,
    });
    const earned = projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress');
    expect(earned?.valueText).toContain(
      '第1项交叉挑战·冲锋盾·空港断层·起步平台·生存+1·1/2',
    );
    expect(earned?.valueText).toContain('整体完成0/1·总进度1/2');
    expect(earned?.valueText).toContain('空港断层·整图路线本局+1·累计1/2·理解1/2段');
    expect(earned?.accessibilityText).toContain(
      '第1项交叉挑战·冲锋盾·空港断层·起步平台·生存：本局推进1次，当前1/2',
    );
    expect(earned?.accessibilityText).toContain(
      '交叉挑战整体已完成0/1项，累计进度1/2',
    );
    expect(projection.homeRecordSummary).toMatchObject({
      completedChallengeCount: 0,
      challengeCount: 1,
      challengeProgress: 1,
      challengeProgressTarget: 2,
    });
    expect(projection.homeRecordSummary.compactText).toContain(
      '挑战0/1·挑战进度1/2',
    );
    expect(projection.homeRecordSummary.accessibilityText).toContain(
      '多项挑战可在同一局重叠推进，因此不推算剩余局数',
    );
    const challengeReadyProfile = createArenaV2LearningProfileV1(challengeDefinition, {
      schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
      profileDefinitionId: challengeDefinition.id,
      profileDefinitionContentVersion: challengeDefinition.contentVersion,
      profileId: 'local',
      revision: 4,
      committedGrantIds: ['grant.challenge-goal-ready'],
      collections: {
        weaponDefinitionIds: ['weapon.a', 'weapon.b'],
        mapDefinitionIds: ['map.a'],
      },
      weaponMastery: ['weapon.a', 'weapon.b'].map((weaponDefinitionId) => ({
        weaponDefinitionId,
        useCount: 1,
        contexts: (['ground', 'aerial', 'edge', 'duel-counterplay', 'survival'] as const).map(
          (context) => ({ context, evidenceCount: 1, completedAtRevision: 1 }),
        ),
      })),
      mapSegmentMastery: ['segment.a', 'segment.b'].map((segmentDefinitionId) => ({
        mapDefinitionId: 'map.a',
        segmentDefinitionId,
        completionEvidenceCount: 1,
        completedAtRevision: 2,
        bestRaceFinishTicks: null,
        bestSurvivalTicks: null,
      })),
      modeRecords: [
        {
          modeDefinitionId: 'mode.duel', kind: 'duel', playCount: 1,
          completionCount: 1, winCount: 1, completedAtRevision: 3,
          bestPerformanceTicks: 600,
        },
        {
          modeDefinitionId: 'mode.race', kind: 'race', playCount: 1,
          completionCount: 1, winCount: 1, completedAtRevision: 3,
          bestPerformanceTicks: 600,
        },
        {
          modeDefinitionId: 'mode.survival', kind: 'survival', playCount: 1,
          completionCount: 1, winCount: 0, completedAtRevision: 3,
          bestPerformanceTicks: 600,
        },
      ],
      challenges: [{
        challengeDefinitionId: 'challenge.weapon-map-survival',
        progress: 1,
        completedAtRevision: null,
      }],
    });
    const challengeGoalProjection = projectArenaV2LearningInformationV1({
      profileDefinition: challengeDefinition,
      profile: challengeReadyProfile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      settlement: {
        status: 'duplicate',
        grantId: 'grant.challenge-goal-ready',
        profileRevision: challengeReadyProfile.revision,
        sourceModeDefinitionId: 'mode.survival',
        effectiveLearningProgress: false,
        progressKinds: [],
        researchedWeaponDefinitionId: null,
        weaponContextEvidenceDeltas: [],
        mapSegmentEvidenceDeltas: [],
        mapRouteEvidenceDeltas: [],
        modeCompletionDeltas: [],
        challengeProgressDeltas: [],
        newlyCollectedWeaponDefinitionIds: [],
        newlyCollectedMapDefinitionIds: [],
      },
      eligibleWeaponDefinitionIds: undefined,
      weaponDisplayNames,
      mapDisplayNames,
    });
    expect(challengeGoalProjection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal')?.valueText).toContain(
      '第1项交叉挑战·冲锋盾·空港断层·起步平台·生存',
    );
  });

  it('states whether the settled selection can continue the resolved weapon goal', () => {
    const profile = createArenaV2LearningProfileV1(DEFINITION, {
      schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
      profileDefinitionId: DEFINITION.id,
      profileDefinitionContentVersion: DEFINITION.contentVersion,
      profileId: 'local',
      revision: 8,
      committedGrantIds: ['grant.route-hint'],
      collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
      weaponMastery: [],
      mapSegmentMastery: [
        {
          mapDefinitionId: 'map.a',
          segmentDefinitionId: 'segment.a',
          completionEvidenceCount: 1,
          completedAtRevision: 8,
          bestRaceFinishTicks: null,
          bestSurvivalTicks: null,
        },
        {
          mapDefinitionId: 'map.a',
          segmentDefinitionId: 'segment.b',
          completionEvidenceCount: 1,
          completedAtRevision: 8,
          bestRaceFinishTicks: null,
          bestSurvivalTicks: null,
        },
      ],
      modeRecords: DEFINITION.modeDefinitions.map(({ modeDefinitionId, kind }) => ({
        modeDefinitionId,
        kind,
        playCount: 1,
        completionCount: 1,
        winCount: kind === 'survival' ? 0 : 1,
        completedAtRevision: 8,
        bestPerformanceTicks: 600,
      })),
      challenges: [],
    });
    const resultGoal = (sourceModeDefinitionId: string) => (
      projectArenaV2LearningInformationV1({
        profileDefinition: DEFINITION,
        profile,
        selectedWeaponDefinitionId: 'weapon.a',
        selectedMapDefinitionId: 'map.a',
        settlement: {
          status: 'duplicate',
          grantId: 'grant.route-hint',
          profileRevision: profile.revision,
          sourceModeDefinitionId,
          effectiveLearningProgress: false,
          progressKinds: [],
          researchedWeaponDefinitionId: null,
          weaponContextEvidenceDeltas: [],
          mapSegmentEvidenceDeltas: [],
          mapRouteEvidenceDeltas: [],
          modeCompletionDeltas: [],
          challengeProgressDeltas: [],
          newlyCollectedWeaponDefinitionIds: [],
          newlyCollectedMapDefinitionIds: [],
        },
        eligibleWeaponDefinitionIds: undefined,
        weaponDisplayNames,
        mapDisplayNames,
      }).screens.find(({ screenId }) => screenId === 'result-reward')
        ?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal')
    );
    expect(resultGoal('mode.duel')?.valueText)
      .toContain('稳定推进：当前组合可继续');
    expect(resultGoal('mode.survival')?.valueText)
      .toContain('稳定推进：选择1v1或竞速');
    expect(resultGoal('mode.survival')?.accessibilityText)
      .toContain('选择会稳定携带所选武器的常规1v1或竞速模式');
    expect(ARENA_V2_RESULT_NEXT_GOAL_ROUTE_FIT_V1).toMatchObject({
      implementationStatus: 'code-written-not-run',
      freeChallengeUsesStableScopeCompletionGoalIds: true,
      scopeCompletionIdentitySource: 'unique-next-goal-resolver',
      duplicatesScopeCompletionResolution: false,
      defaultEntryWired: false,
      validationStatus: 'not-run',
    });
    expect(resolveArenaV2ResultNextGoalRouteFitV1({
      profileDefinition: DEFINITION,
      profile,
      eligibleWeaponDefinitionIds: undefined,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      sourceModeDefinitionId: 'mode.duel',
    })).toMatchObject({
      eligibleWeaponDefinitionIds: null,
      kind: 'stable-current-combination',
      recommendedModeKind: 'duel',
      deterministicCurrentReplayCanAdvance: true,
      defaultResultDecision: 'play-again',
    });
    expect(resolveArenaV2ResultNextGoalRouteFitV1({
      profileDefinition: DEFINITION,
      profile,
      eligibleWeaponDefinitionIds: undefined,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      sourceModeDefinitionId: 'mode.survival',
    })).toMatchObject({
      eligibleWeaponDefinitionIds: null,
      kind: 'adjust-before-next-match',
      recommendedModeKind: 'duel',
      requiresModeChange: true,
      defaultResultDecision: 'next-goal',
    });
    const scopedRouteFit = resolveArenaV2ResultNextGoalRouteFitV1({
      profileDefinition: DEFINITION,
      profile,
      eligibleWeaponDefinitionIds: ['weapon.a'],
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      sourceModeDefinitionId: 'mode.duel',
    });
    expect(scopedRouteFit.eligibleWeaponDefinitionIds).toEqual(['weapon.a']);
    expect(Object.isFrozen(scopedRouteFit.eligibleWeaponDefinitionIds)).toBe(true);
  });

  it('marks an explicit Survival weapon goal as conditional on an actual supply spawn', () => {
    const completedContexts = [
      { context: 'ground' as const, evidenceCount: 1, completedAtRevision: 9 },
      { context: 'aerial' as const, evidenceCount: 1, completedAtRevision: 9 },
      { context: 'edge' as const, evidenceCount: 1, completedAtRevision: 9 },
      { context: 'duel-counterplay' as const, evidenceCount: 1, completedAtRevision: 9 },
      { context: 'survival' as const, evidenceCount: 1, completedAtRevision: 9 },
    ];
    const profile = createArenaV2LearningProfileV1(DEFINITION, {
      schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
      profileDefinitionId: DEFINITION.id,
      profileDefinitionContentVersion: DEFINITION.contentVersion,
      profileId: 'local',
      revision: 9,
      committedGrantIds: ['grant.conditional-survival'],
      collections: {
        weaponDefinitionIds: ['weapon.a', 'weapon.b'],
        mapDefinitionIds: ['map.a'],
      },
      weaponMastery: [
        {
          weaponDefinitionId: 'weapon.a',
          useCount: 1,
          contexts: completedContexts.map((context) => (
            context.context === 'survival'
              ? { ...context, evidenceCount: 0, completedAtRevision: null }
              : context
          )),
        },
        { weaponDefinitionId: 'weapon.b', useCount: 1, contexts: completedContexts },
      ],
      mapSegmentMastery: DEFINITION.mapDefinitions[0]!.segmentDefinitionIds.map(
        (segmentDefinitionId) => ({
          mapDefinitionId: 'map.a',
          segmentDefinitionId,
          completionEvidenceCount: 1,
          completedAtRevision: 9,
          bestRaceFinishTicks: null,
          bestSurvivalTicks: null,
        }),
      ),
      modeRecords: DEFINITION.modeDefinitions.map(({ modeDefinitionId, kind }) => ({
        modeDefinitionId,
        kind,
        playCount: 1,
        completionCount: 1,
        winCount: kind === 'survival' ? 0 : 1,
        completedAtRevision: 9,
        bestPerformanceTicks: 600,
      })),
      challenges: [],
    });
    const projection = projectArenaV2LearningInformationV1({
      profileDefinition: DEFINITION,
      profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      settlement: {
        status: 'duplicate',
        grantId: 'grant.conditional-survival',
        profileRevision: profile.revision,
        sourceModeDefinitionId: 'mode.survival',
        effectiveLearningProgress: false,
        progressKinds: [],
        researchedWeaponDefinitionId: null,
        weaponContextEvidenceDeltas: [],
        mapSegmentEvidenceDeltas: [],
        mapRouteEvidenceDeltas: [],
        modeCompletionDeltas: [],
        challengeProgressDeltas: [],
        newlyCollectedWeaponDefinitionIds: [],
        newlyCollectedMapDefinitionIds: [],
      },
      eligibleWeaponDefinitionIds: undefined,
      weaponDisplayNames,
      mapDisplayNames,
    });
    const goal = projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal');
    expect(projection.nextGoal).toMatchObject({
      kind: 'weapon-context',
      weaponDefinitionId: 'weapon.a',
      context: 'survival',
    });
    expect(goal?.valueText).toContain('条件推进：等待冲锋盾刷新后拾取');
    expect(goal?.accessibilityText)
      .toContain('生存仍然空手开局，补给不会保证目标武器在本局出现');
    expect(projection.screens.find(({ screenId }) => screenId === 'weapon-index')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-unowned')?.valueText).toBe(
      '2把武器已全部收藏；五情境理解1/2',
    );
    const scopedComplete = projectArenaV2LearningInformationV1({
      profileDefinition: DEFINITION,
      profile,
      selectedWeaponDefinitionId: 'weapon.b',
      selectedMapDefinitionId: 'map.a',
      settlement: null,
      eligibleWeaponDefinitionIds: ['weapon.b'],
      weaponDisplayNames,
      mapDisplayNames,
    });
    expect(scopedComplete.nextGoal.kind).toBe('catalog-complete');
    expect(scopedComplete.weaponGoal).toMatchObject({
      kind: 'catalog-complete',
      goalId: ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1,
    });
    expect(scopedComplete.mapGoal).toMatchObject({
      kind: 'catalog-complete',
      goalId: ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1,
    });
    expect(scopedComplete.screens.find(({ screenId }) => screenId === 'home')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal')?.valueText).toContain(
      '当前开放学习内容',
    );
    expect(scopedComplete.screens.find(({ screenId }) => screenId === 'weapon-index')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'practice-target')?.valueText).toContain(
      '当前可用武器',
    );
    expect(scopedComplete.screens.find(({ screenId }) => screenId === 'weapon-index')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'practice-target')?.accessibilityText).toContain(
      '当前可用武器池已经完成，但完整武器目录尚未全部开放',
    );
    expect(scopedComplete.screens.find(({ screenId }) => screenId === 'map-index')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-map')).toMatchObject({
      valueText: expect.stringContaining('地图目录'),
      accessibilityText: expect.stringContaining('目标是地图目录'),
    });
    expect(scopedComplete.screens.find(({ screenId }) => screenId === 'home')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal')?.accessibilityText).toContain(
      '完整武器目录尚未全部开放',
    );
    expect(scopedComplete.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal')?.valueText).toContain(
      '当前开放内容已完成：当前组合可继续',
    );
    expect(resolveArenaV2ResultNextGoalRouteFitV1({
      profileDefinition: DEFINITION,
      profile,
      eligibleWeaponDefinitionIds: undefined,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      sourceModeDefinitionId: 'mode.survival',
    })).toMatchObject({
      eligibleWeaponDefinitionIds: null,
      kind: 'conditional-survival-supply',
      recommendedModeKind: 'survival',
      conditionalCurrentReplayCanAdvance: true,
      defaultResultDecision: 'play-again',
    });
    expect(resolveArenaV2ResultNextGoalRouteFitV1({
      profileDefinition: DEFINITION,
      profile,
      eligibleWeaponDefinitionIds: undefined,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      sourceModeDefinitionId: 'mode.duel',
    })).toMatchObject({
      eligibleWeaponDefinitionIds: null,
      kind: 'conditional-survival-supply',
      recommendedModeKind: 'survival',
      requiresModeChange: true,
      conditionalCurrentReplayCanAdvance: false,
      defaultResultDecision: 'next-goal',
    });
  });

  it('rejects reordered weapon display labels and keeps ordinal fallback optional', () => {
    const outcome = committedProfile();
    const input = {
      profileDefinition: DEFINITION,
      profile: outcome.profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      settlement: null,
      eligibleWeaponDefinitionIds: undefined,
    };
    expect(projectArenaV2LearningInformationV1(input).screens.find(
      ({ screenId }) => screenId === 'weapon-index',
    )?.fieldValues.find(({ fieldId }) => fieldId === 'next-unowned')?.valueText)
      .toContain('第2把武器');
    const activePoolComplete = projectArenaV2LearningInformationV1({
      ...input,
      eligibleWeaponDefinitionIds: ['weapon.a'],
    }).screens.find(({ screenId }) => screenId === 'weapon-index')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-unowned');
    expect(activePoolComplete?.valueText).toBe(
      '当前可用武器已收齐1/1；完整目录1/2，后续开放后继续主研究',
    );
    expect(activePoolComplete?.accessibilityText).toContain(
      '当前开放池收齐不等于完整目录完成',
    );
    expect(() => projectArenaV2LearningInformationV1({
      ...input,
      weaponDisplayNames: [weaponDisplayNames[1], weaponDisplayNames[0]],
    })).toThrow(/Definition顺序/);
  });

  it('keeps the real full-catalog terminal when hidden weapons are already complete', () => {
    const profile = createArenaV2LearningProfileV1(DEFINITION, {
      ...createArenaV2LearningProfileV1(DEFINITION),
      revision: 9,
      collections: {
        weaponDefinitionIds: ['weapon.a', 'weapon.b'],
        mapDefinitionIds: ['map.a'],
      },
      weaponMastery: DEFINITION.weaponDefinitionIds.map((weaponDefinitionId) => ({
        weaponDefinitionId,
        useCount: 1,
        contexts: ['ground', 'aerial', 'edge', 'duel-counterplay', 'survival'].map((context) => ({
          context,
          evidenceCount: 1,
          completedAtRevision: 4,
        })),
      })),
      mapSegmentMastery: DEFINITION.mapDefinitions[0]!.segmentDefinitionIds.map(
        (segmentDefinitionId) => ({
          mapDefinitionId: 'map.a',
          segmentDefinitionId,
          completionEvidenceCount: 1,
          completedAtRevision: 5,
          bestRaceFinishTicks: null,
          bestSurvivalTicks: null,
        }),
      ),
      modeRecords: DEFINITION.modeDefinitions.map((mode) => ({
        modeDefinitionId: mode.modeDefinitionId,
        kind: mode.kind,
        playCount: 1,
        completionCount: 1,
        winCount: mode.kind === 'survival' ? 0 : 1,
        completedAtRevision: 6,
        bestPerformanceTicks: 600,
      })),
    });
    const projection = projectArenaV2LearningInformationV1({
      profileDefinition: DEFINITION,
      profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      settlement: null,
      eligibleWeaponDefinitionIds: ['weapon.a'],
    });
    expect(projection.nextGoal).toMatchObject({
      kind: 'catalog-complete',
      goalId: 'catalog-complete',
    });
    expect(projection.screens.find(({ screenId }) => screenId === 'home')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal')?.valueText)
      .toContain('完整收藏目录');
    expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal')?.valueText)
      .toContain('自由挑战：当前组合可继续');
    expect(resolveArenaV2ResultNextGoalRouteFitV1({
      profileDefinition: DEFINITION,
      profile,
      eligibleWeaponDefinitionIds: ['weapon.a'],
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      sourceModeDefinitionId: 'mode.duel',
    })).toMatchObject({
      kind: 'free-challenge',
      nextGoal: {
        kind: 'catalog-complete',
        goalId: 'catalog-complete',
      },
      deterministicCurrentReplayCanAdvance: true,
      defaultResultDecision: 'play-again',
    });

    const activeScopeProfile = createArenaV2LearningProfileV1(DEFINITION, {
      ...profile,
      collections: {
        weaponDefinitionIds: ['weapon.a'],
        mapDefinitionIds: profile.collections.mapDefinitionIds,
      },
      weaponMastery: profile.weaponMastery.filter(({ weaponDefinitionId }) => (
        weaponDefinitionId === 'weapon.a'
      )),
    });
    expect(resolveArenaV2ResultNextGoalRouteFitV1({
      profileDefinition: DEFINITION,
      profile: activeScopeProfile,
      eligibleWeaponDefinitionIds: ['weapon.a'],
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      sourceModeDefinitionId: 'mode.duel',
    })).toMatchObject({
      kind: 'free-challenge',
      nextGoal: {
        kind: 'catalog-complete',
        goalId: 'active-learning-complete',
      },
      deterministicCurrentReplayCanAdvance: true,
      defaultResultDecision: 'play-again',
    });
    expect(() => projectArenaV2LearningInformationV1({
      profileDefinition: DEFINITION,
      profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      settlement: null,
      attemptedGoal: {
        ...projection.nextGoal,
        goalId: 'future-scope-complete',
      },
      eligibleWeaponDefinitionIds: ['weapon.a'],
    })).toThrow(/catalog-complete attemptedGoal/);
    expect(() => projectArenaV2LearningInformationV1({
      profileDefinition: DEFINITION,
      profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: 'map.a',
      settlement: null,
      attemptedGoal: {
        ...projection.nextGoal,
        goalId: ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1,
      },
      eligibleWeaponDefinitionIds: ['weapon.a'],
    })).toThrow(/catalog-complete attemptedGoal/);
    expect(ARENA_V2_LEARNING_RESULT_PROGRESS_READABILITY_CONTRACT_V1).toMatchObject({
      status: 'production-unreachable',
      hardGate: false,
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      scopeCompletionCopyUsesStableGoalIds: true,
      unknownScopeCompletionCopyRejected: true,
      nonScopeCompletionCannotClaimStableCompletionGoalId: true,
      duplicatesScopeCompletionResolution: false,
      visibleAndAccessibilityScopeCompletionDerivedOncePerGoalCopy: true,
      visibleAndAccessibilityShareNormalizedGoalCopy: true,
      laneCompletionGoalIdsFromSingleResolverSource: true,
      laneCompletionKindAndSourceValidatedBeforeCopy: true,
      attemptReceiptScopeCompletionUsesStableGlobalGoalIds: true,
      laneOrUnknownCompletionCannotSuppressAttemptReceipt: true,
      resultGoalHintUsesStableScopeCompletionGoalIds: true,
      resultGoalHintHasNoImplicitFullCatalogFallback: true,
    });
  });

  it('projects exact Duel, Race and Survival personal bests from the committed mode record', () => {
    const cases = [
      ['duel', 3_600, '新个人最佳·常规1v1最快胜利 01:00'],
      ['race', 5_400, '新个人最佳·竞速最快到达 01:30'],
      ['survival', 7_200, '新个人最佳·生存最长坚持 02:00'],
    ] as const;
    for (const [kind, ticks, expected] of cases) {
      const outcome = modeProgressProfile(kind, ticks);
      const projection = projectArenaV2LearningInformationV1({
        profileDefinition: DEFINITION,
        profile: outcome.profile,
        selectedWeaponDefinitionId: null,
        selectedMapDefinitionId: null,
        settlement: {
          status: 'committed',
          grantId: outcome.grant.grantId,
          profileRevision: outcome.profile.revision,
          sourceModeDefinitionId: outcome.grant.sourceModeDefinitionId,
          effectiveLearningProgress: outcome.effectiveLearningProgress,
          progressKinds: outcome.progressKinds,
          researchedWeaponDefinitionId: outcome.researchedWeaponDefinitionId,
          weaponContextEvidenceDeltas: outcome.weaponContextEvidenceDeltas,
          mapSegmentEvidenceDeltas: outcome.mapSegmentEvidenceDeltas,
          mapRouteEvidenceDeltas: outcome.mapRouteEvidenceDeltas,
          modeCompletionDeltas: outcome.modeCompletionDeltas,
          challengeProgressDeltas: outcome.challengeProgressDeltas,
          newlyCollectedWeaponDefinitionIds: outcome.newlyCollectedWeaponDefinitionIds,
          newlyCollectedMapDefinitionIds: outcome.newlyCollectedMapDefinitionIds,
        },
        eligibleWeaponDefinitionIds: undefined,
      });
      expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
        ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
        .toContain(expected);
      expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
        ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.accessibilityText)
        .toContain(expected);
    }

    const duel = modeProgressProfile('duel', 3_600);
    expect(() => projectArenaV2LearningInformationV1({
      profileDefinition: DEFINITION,
      profile: duel.profile,
      selectedWeaponDefinitionId: null,
      selectedMapDefinitionId: 'map.a',
      settlement: {
        status: 'committed',
        grantId: duel.grant.grantId,
        profileRevision: duel.profile.revision,
        sourceModeDefinitionId: 'mode.race',
        effectiveLearningProgress: duel.effectiveLearningProgress,
        progressKinds: duel.progressKinds,
        researchedWeaponDefinitionId: null,
        weaponContextEvidenceDeltas: [],
        mapSegmentEvidenceDeltas: [],
        mapRouteEvidenceDeltas: [],
        modeCompletionDeltas: [],
        challengeProgressDeltas: [],
        newlyCollectedWeaponDefinitionIds: [],
        newlyCollectedMapDefinitionIds: [],
      },
      eligibleWeaponDefinitionIds: undefined,
    })).toThrow(/缺少来源模式Profile记录/);
  });

  it('shows the exact applied mode completion and Definition-driven 5/15 position', () => {
    const definition = createArenaV2LearningProfileDefinitionV1({
      ...DEFINITION,
      id: 'learning-information.mode-completion-receipt.test.v1',
      masteryRequirements: {
        ...DEFINITION.masteryRequirements,
        modeCompletionEvidence: 5,
      },
    });
    const empty = createArenaV2LearningProfileV1(definition);
    const baseline = createArenaV2LearningProfileV1(definition, {
      ...empty,
      collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
    });
    const outcome = advanceArenaV2LearningProfileV1(
      definition,
      baseline,
      {
        schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
        grantId: 'grant.mode-completion-receipt',
        resultAuthorityHash: 'a126a126',
        recipientParticipantId: 'p1',
        sourceModeDefinitionId: 'mode.duel',
        sourceMapDefinitionIds: ['map.a'],
        collectedWeaponDefinitionIds: [],
        collectedMapDefinitionIds: ['map.a'],
        weaponDeltas: [],
        mapSegmentDeltas: [],
        modeDelta: {
          modeDefinitionId: 'mode.duel',
          playCountDelta: 1,
          completionCountDelta: 1,
          winCountDelta: 1,
          bestPerformanceTicksCandidate: 600,
        },
        challengeDeltas: [],
      },
      0,
    );
    expect(outcome.modeCompletionDeltas).toEqual([{
      modeDefinitionId: 'mode.duel',
      completionCountDelta: 1,
    }]);
    const input = {
      profileDefinition: definition,
      profile: outcome.profile,
      selectedWeaponDefinitionId: null,
      selectedMapDefinitionId: null,
      settlement: {
        status: 'committed' as const,
        grantId: outcome.grant.grantId,
        profileRevision: outcome.profile.revision,
        sourceModeDefinitionId: outcome.grant.sourceModeDefinitionId,
        effectiveLearningProgress: outcome.effectiveLearningProgress,
        progressKinds: outcome.progressKinds,
        researchedWeaponDefinitionId: outcome.researchedWeaponDefinitionId,
        weaponContextEvidenceDeltas: outcome.weaponContextEvidenceDeltas,
        mapSegmentEvidenceDeltas: outcome.mapSegmentEvidenceDeltas,
        mapRouteEvidenceDeltas: outcome.mapRouteEvidenceDeltas,
        modeCompletionDeltas: outcome.modeCompletionDeltas,
        challengeProgressDeltas: outcome.challengeProgressDeltas,
        newlyCollectedWeaponDefinitionIds: outcome.newlyCollectedWeaponDefinitionIds,
        newlyCollectedMapDefinitionIds: outcome.newlyCollectedMapDefinitionIds,
      },
      eligibleWeaponDefinitionIds: undefined,
    };
    const projection = projectArenaV2LearningInformationV1(input);
    const earned = projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress');
    expect(earned?.valueText).toContain('常规1v1·本局+1·当前1/5·整体1/15');
    expect(earned?.accessibilityText).toContain(
      '常规1v1：本局增加1次有效模式完成，当前1/5；三种模式整体熟练进度1/15',
    );
    expect(projection.screens.find(({ screenId }) => screenId === 'map-index')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'mode-coverage')?.valueText)
      .toBe('模式熟练1/15');
    expect(projection.screens.find(({ screenId }) => screenId === 'map-detail')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'mode-records')?.valueText)
      .toContain('模式熟练1/15；全部地图路线研究0/2；全部路线理解0/2');
    expect(() => projectArenaV2LearningInformationV1({
      ...input,
      settlement: {
        ...input.settlement,
        modeCompletionDeltas: [{
          modeDefinitionId: 'mode.race',
          completionCountDelta: 1,
        }],
      },
    })).toThrow(/模式完成增量与来源模式身份不闭合/u);
    expect(() => projectArenaV2LearningInformationV1({
      ...input,
      settlement: {
        ...input.settlement,
        modeCompletionDeltas: [{
          modeDefinitionId: 'mode.duel',
          completionCountDelta: 1,
          future: true,
        }],
      },
    })).toThrow(/未知字段|future/u);
  });

  it('does not invent a personal best for a Duel loss or unfinished Race', () => {
    const cases = [
      modeProgressProfile('duel', null, 1, 0),
      modeProgressProfile('race', null, 0, 0),
    ];
    for (const outcome of cases) {
      expect(outcome.progressKinds).not.toContain('personal-best');
      const sourceModeDefinitionId = outcome.grant.sourceModeDefinitionId;
      const projection = projectArenaV2LearningInformationV1({
        profileDefinition: DEFINITION,
        profile: outcome.profile,
        selectedWeaponDefinitionId: null,
        selectedMapDefinitionId: null,
        settlement: {
          status: 'committed',
          grantId: outcome.grant.grantId,
          profileRevision: outcome.profile.revision,
          sourceModeDefinitionId,
          effectiveLearningProgress: outcome.effectiveLearningProgress,
          progressKinds: outcome.progressKinds,
          researchedWeaponDefinitionId: null,
          weaponContextEvidenceDeltas: [],
          mapSegmentEvidenceDeltas: [],
          mapRouteEvidenceDeltas: [],
          modeCompletionDeltas: [],
          challengeProgressDeltas: [],
          newlyCollectedWeaponDefinitionIds: [],
          newlyCollectedMapDefinitionIds: [],
        },
        eligibleWeaponDefinitionIds: undefined,
      });
      expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
        ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
        .not.toContain('新个人最佳');
      const earned = projection.screens.find(({ screenId }) => screenId === 'result-reward')
        ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText;
      expect(earned).not.toMatch(/\d{2}:\d{2}/);
      if (sourceModeDefinitionId === 'mode.race') {
        expect(earned).toBe(
          '本局结果已记录，暂未形成新的学习进度；下一局继续推进路线并到达终点；完成后还能刷新最快到达',
        );
        expect(projection.screens.find(({ screenId }) => screenId === 'result-reward')
          ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')
          ?.accessibilityText).toBe(earned);
      }
      expect(() => projectArenaV2LearningInformationV1({
        profileDefinition: DEFINITION,
        profile: outcome.profile,
        selectedWeaponDefinitionId: null,
        selectedMapDefinitionId: null,
        settlement: {
          status: 'committed',
          grantId: outcome.grant.grantId,
          profileRevision: outcome.profile.revision,
          sourceModeDefinitionId,
          effectiveLearningProgress: true,
          progressKinds: ['mode-mastery', 'personal-best', 'statistics'].filter((kind) => (
            kind !== 'mode-mastery' || outcome.progressKinds.includes('mode-mastery')
          )),
          researchedWeaponDefinitionId: null,
          weaponContextEvidenceDeltas: [],
          mapSegmentEvidenceDeltas: [],
          mapRouteEvidenceDeltas: [],
          modeCompletionDeltas: [],
          challengeProgressDeltas: [],
          newlyCollectedWeaponDefinitionIds: [],
          newlyCollectedMapDefinitionIds: [],
        },
        eligibleWeaponDefinitionIds: undefined,
      })).toThrow(/缺少来源模式成绩记录/);
    }
  });

  it('turns statistics-only settlements into mode-specific next-match guidance', () => {
    const cases = [
      ['duel', '本局结果已记录，暂未形成新的学习进度；下一局继续完成1v1；获胜还能刷新最快胜利'],
      ['race', '本局结果已记录，暂未形成新的学习进度；下一局继续推进路线并到达终点；完成后还能刷新最快到达'],
      ['survival', '本局结果已记录，暂未形成新的学习进度；下一局继续延长坚持时间；跨过下一压力阶段并刷新最长坚持'],
    ] as const;
    for (const [kind, expected] of cases) {
      const outcome = noEffectiveModeProgressProfile(kind);
      expect(outcome.progressKinds).toEqual(['statistics']);
      expect(outcome.effectiveLearningProgress).toBe(false);
      const projection = projectArenaV2LearningInformationV1({
        profileDefinition: DEFINITION,
        profile: outcome.profile,
        selectedWeaponDefinitionId: null,
        selectedMapDefinitionId: null,
        settlement: {
          status: 'committed',
          grantId: outcome.grant.grantId,
          profileRevision: outcome.profile.revision,
          sourceModeDefinitionId: outcome.grant.sourceModeDefinitionId,
          effectiveLearningProgress: outcome.effectiveLearningProgress,
          progressKinds: outcome.progressKinds,
          researchedWeaponDefinitionId: null,
          weaponContextEvidenceDeltas: [],
          mapSegmentEvidenceDeltas: [],
          mapRouteEvidenceDeltas: [],
          modeCompletionDeltas: [],
          challengeProgressDeltas: [],
          newlyCollectedWeaponDefinitionIds: [],
          newlyCollectedMapDefinitionIds: [],
        },
        eligibleWeaponDefinitionIds: undefined,
      });
      const earned = projection.screens.find(({ screenId }) => screenId === 'result-reward')
        ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress');
      expect(earned?.valueText).toBe(expected);
      expect(earned?.accessibilityText).toBe(expected);
    }
  });

  it('uses the existing result field for one message only when main research crosses a milestone', () => {
    const outcome = milestoneProfile();
    const projection = projectArenaV2LearningInformationV1({
      profileDefinition: MILESTONE_DEFINITION,
      profile: outcome.profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: null,
      settlement: {
        status: 'committed',
        grantId: outcome.grant.grantId,
        profileRevision: outcome.profile.revision,
        sourceModeDefinitionId: outcome.grant.sourceModeDefinitionId,
        effectiveLearningProgress: outcome.effectiveLearningProgress,
        progressKinds: outcome.progressKinds,
        researchedWeaponDefinitionId: outcome.researchedWeaponDefinitionId,
        weaponContextEvidenceDeltas: outcome.weaponContextEvidenceDeltas,
        mapSegmentEvidenceDeltas: outcome.mapSegmentEvidenceDeltas,
        mapRouteEvidenceDeltas: outcome.mapRouteEvidenceDeltas,
        modeCompletionDeltas: outcome.modeCompletionDeltas,
        challengeProgressDeltas: outcome.challengeProgressDeltas,
        newlyCollectedWeaponDefinitionIds: outcome.newlyCollectedWeaponDefinitionIds,
        newlyCollectedMapDefinitionIds: outcome.newlyCollectedMapDefinitionIds,
      },
      eligibleWeaponDefinitionIds: undefined,
    });
    const weaponDetail = projection.screens.find(({ screenId }) => screenId === 'weapon-detail');
    expect(weaponDetail?.fieldValues[0]?.valueText)
      .toContain('下一阶段熟练（60/120），至少还需30局有效主研究');
    const result = projection.screens.find(({ screenId }) => screenId === 'result-reward');
    const resultNextGoal = result?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal');
    const homeGoal = projection.screens.find(({ screenId }) => screenId === 'home')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal');
    expect(homeGoal?.valueText).toContain(
      '当前熟悉；距熟练30次；距收藏90次；收藏0/2',
    );
    expect(homeGoal?.accessibilityText).toContain(
      '当前主研究阶段是熟悉；距离下一阶段熟练理论至少还需30局有效主研究',
    );
    expect(homeGoal?.accessibilityText).toContain(
      '这把武器距离加入收藏理论至少还需90局有效主研究。 完整武器目录已收藏0/2把',
    );
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('第1把武器·主研究1次·30/120·距熟练30次');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('全武器主研究30/240');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('收藏0/2·距收藏90次');
    expect(resultNextGoal?.valueText).not.toContain('距收藏90次');
    expect(resultNextGoal?.valueText).not.toContain('收藏0/2');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')
      ?.accessibilityText)
      .toContain('第1把武器：本局完成1次有效主研究，当前30/120；下一阶段熟练（60/120），至少还需30局有效主研究；下一局若再次捡到这把武器，优先练地面情境：在地面用这把武器形成一次有效武器反馈');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')
      ?.accessibilityText).toContain('完整武器目录已收藏0/2把；这把武器距离加入收藏理论至少还需90局有效主研究');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'collection-change')?.valueText)
      .toBe('第1把武器主研究达到30/120，进入熟悉阶段；阶段只表示熟悉度，不提升战斗数值');
  });

  it('shows an exact ordinary +1 without inventing a crossed milestone', () => {
    const outcome = milestoneProfile(30, 'grant.milestone.ordinary.31');
    const projection = projectArenaV2LearningInformationV1({
      profileDefinition: MILESTONE_DEFINITION,
      profile: outcome.profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: null,
      settlement: {
        status: 'committed',
        grantId: outcome.grant.grantId,
        profileRevision: outcome.profile.revision,
        sourceModeDefinitionId: outcome.grant.sourceModeDefinitionId,
        effectiveLearningProgress: outcome.effectiveLearningProgress,
        progressKinds: outcome.progressKinds,
        researchedWeaponDefinitionId: outcome.researchedWeaponDefinitionId,
        weaponContextEvidenceDeltas: outcome.weaponContextEvidenceDeltas,
        mapSegmentEvidenceDeltas: outcome.mapSegmentEvidenceDeltas,
        mapRouteEvidenceDeltas: outcome.mapRouteEvidenceDeltas,
        modeCompletionDeltas: outcome.modeCompletionDeltas,
        challengeProgressDeltas: outcome.challengeProgressDeltas,
        newlyCollectedWeaponDefinitionIds: outcome.newlyCollectedWeaponDefinitionIds,
        newlyCollectedMapDefinitionIds: outcome.newlyCollectedMapDefinitionIds,
      },
      eligibleWeaponDefinitionIds: undefined,
    });
    const result = projection.screens.find(({ screenId }) => screenId === 'result-reward');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('第1把武器·主研究1次·31/120·距熟练29次');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('全武器主研究31/240');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('收藏0/2·距收藏89次');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')
      ?.accessibilityText)
      .toContain('第1把武器：本局完成1次有效主研究，当前31/120；下一阶段熟练（60/120），至少还需29局有效主研究；下一局若再次捡到这把武器，优先练地面情境：在地面用这把武器形成一次有效武器反馈');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'collection-change')?.valueText)
      .toBe('本局进度已记录，收藏阶段未变化');
  });

  it('shows exact completion at 120 and rejects stale settlement/Profile identity', () => {
    const outcome = milestoneProfile(119, 'grant.milestone.120');
    const input = {
      profileDefinition: MILESTONE_DEFINITION,
      profile: outcome.profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: null,
      settlement: {
        status: 'committed',
        grantId: outcome.grant.grantId,
        profileRevision: outcome.profile.revision,
        sourceModeDefinitionId: outcome.grant.sourceModeDefinitionId,
        effectiveLearningProgress: outcome.effectiveLearningProgress,
        progressKinds: outcome.progressKinds,
        researchedWeaponDefinitionId: outcome.researchedWeaponDefinitionId,
        weaponContextEvidenceDeltas: outcome.weaponContextEvidenceDeltas,
        mapSegmentEvidenceDeltas: outcome.mapSegmentEvidenceDeltas,
        mapRouteEvidenceDeltas: outcome.mapRouteEvidenceDeltas,
        modeCompletionDeltas: outcome.modeCompletionDeltas,
        challengeProgressDeltas: outcome.challengeProgressDeltas,
        newlyCollectedWeaponDefinitionIds: outcome.newlyCollectedWeaponDefinitionIds,
        newlyCollectedMapDefinitionIds: outcome.newlyCollectedMapDefinitionIds,
      },
      eligibleWeaponDefinitionIds: undefined,
      weaponDisplayNames: milestoneWeaponDisplayNames,
    };
    const projection = projectArenaV2LearningInformationV1(input);
    const result = projection.screens.find(({ screenId }) => screenId === 'result-reward');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('冲锋盾·主研究1次·120/120·已收藏·主研究完成');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('全武器主研究120/120');
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toContain('收藏1/1');
    expect(outcome.newlyCollectedWeaponDefinitionIds).toEqual(['weapon.a']);
    expect(result?.fieldValues.find(({ fieldId }) => fieldId === 'collection-change')?.valueText)
      .toBe('冲锋盾（第1把武器）主研究达到120/120，进入已收藏阶段；阶段只表示熟悉度，不提升战斗数值；冲锋盾（第1把武器）已加入收藏（武器1/1）');
    expect(() => projectArenaV2LearningInformationV1({
      ...input,
      settlement: { ...input.settlement, profileRevision: outcome.profile.revision - 1 },
    })).toThrow(/Profile revision不一致/);
  });

  it('keeps an imported collected weapon on the same main-research target below 120', () => {
    const outcome = importedCollectedMilestoneProfile();
    const projection = projectArenaV2LearningInformationV1({
      profileDefinition: MILESTONE_DEFINITION,
      profile: outcome.profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: null,
      settlement: {
        status: 'committed',
        grantId: outcome.grant.grantId,
        profileRevision: outcome.profile.revision,
        sourceModeDefinitionId: outcome.grant.sourceModeDefinitionId,
        effectiveLearningProgress: outcome.effectiveLearningProgress,
        progressKinds: outcome.progressKinds,
        researchedWeaponDefinitionId: outcome.researchedWeaponDefinitionId,
        weaponContextEvidenceDeltas: outcome.weaponContextEvidenceDeltas,
        mapSegmentEvidenceDeltas: outcome.mapSegmentEvidenceDeltas,
        mapRouteEvidenceDeltas: outcome.mapRouteEvidenceDeltas,
        modeCompletionDeltas: outcome.modeCompletionDeltas,
        challengeProgressDeltas: outcome.challengeProgressDeltas,
        newlyCollectedWeaponDefinitionIds: outcome.newlyCollectedWeaponDefinitionIds,
        newlyCollectedMapDefinitionIds: outcome.newlyCollectedMapDefinitionIds,
      },
      eligibleWeaponDefinitionIds: undefined,
    });
    const earned = projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText;
    expect(outcome.profile.weaponMastery[0]?.useCount).toBe(30);
    expect(earned).toContain('第1把武器·主研究1次·30/120·已收藏·距熟练30次');
    expect(earned).toContain('收藏1/2');
    expect(earned).not.toContain('距收藏90次');
    const weaponRecord = projection.screens.find(({ screenId }) => screenId === 'weapon-detail')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'weapon-record')?.valueText;
    const weaponIndex = projection.screens.find(({ screenId }) => screenId === 'weapon-index');
    const nextResearch = weaponIndex?.fieldValues.find(({ fieldId }) => (
      fieldId === 'next-unowned'
    ));
    const practiceTarget = weaponIndex?.fieldValues.find(({ fieldId }) => (
      fieldId === 'practice-target'
    ));
    const collectionChange = projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'collection-change')?.valueText;
    expect(weaponRecord).toContain('已收藏；当前主研究熟悉，下一阶段熟练（60/120）');
    expect(nextResearch).toMatchObject({
      valueText: '第1把武器·已收藏·熟悉·主研究30/120·距熟练至少30局有效主研究',
    });
    expect(nextResearch?.accessibilityText).toContain('是当前武器主研究目标');
    expect(practiceTarget?.valueText).toContain('第1把武器：继续在一局中主要使用这把武器（30/120）');
    const homeGoal = projection.screens.find(({ screenId }) => screenId === 'home')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'next-goal');
    expect(homeGoal?.valueText).toContain('当前熟悉；距熟练30次；已收藏；收藏1/2');
    expect(homeGoal?.valueText).not.toContain('距收藏90次');
    expect(homeGoal?.accessibilityText).toContain(
      '这把武器已经加入收藏，目前继续补主研究证据',
    );
    expect(collectionChange).toBe('本局进度已记录，收藏阶段未变化');
  });

  it('does not repeat +1 for duplicate settlement at the collection cap', () => {
    const outcome = milestoneProfile(119, 'grant.milestone.duplicate');
    const projection = projectArenaV2LearningInformationV1({
      profileDefinition: MILESTONE_DEFINITION,
      profile: outcome.profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: null,
      settlement: {
        status: 'duplicate',
        grantId: outcome.grant.grantId,
        profileRevision: outcome.profile.revision,
        sourceModeDefinitionId: outcome.grant.sourceModeDefinitionId,
        effectiveLearningProgress: false,
        progressKinds: [],
        researchedWeaponDefinitionId: null,
        weaponContextEvidenceDeltas: [],
        mapSegmentEvidenceDeltas: [],
        mapRouteEvidenceDeltas: [],
        modeCompletionDeltas: [],
        challengeProgressDeltas: [],
        newlyCollectedWeaponDefinitionIds: [],
        newlyCollectedMapDefinitionIds: [],
      },
      eligibleWeaponDefinitionIds: undefined,
    });
    const earned = projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText;
    expect(earned).toBe('本局已处理，不重复累计');
    expect(earned).not.toContain('+1');

    const afterCap = cappedRepeatProfile(outcome.profile);
    const afterCapProjection = projectArenaV2LearningInformationV1({
      profileDefinition: MILESTONE_DEFINITION,
      profile: afterCap.profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: null,
      settlement: {
        status: 'committed',
        grantId: afterCap.grant.grantId,
        profileRevision: afterCap.profile.revision,
        sourceModeDefinitionId: afterCap.grant.sourceModeDefinitionId,
        effectiveLearningProgress: afterCap.effectiveLearningProgress,
        progressKinds: afterCap.progressKinds,
        researchedWeaponDefinitionId: afterCap.researchedWeaponDefinitionId,
        weaponContextEvidenceDeltas: afterCap.weaponContextEvidenceDeltas,
        mapSegmentEvidenceDeltas: afterCap.mapSegmentEvidenceDeltas,
        mapRouteEvidenceDeltas: afterCap.mapRouteEvidenceDeltas,
        modeCompletionDeltas: afterCap.modeCompletionDeltas,
        challengeProgressDeltas: afterCap.challengeProgressDeltas,
        newlyCollectedWeaponDefinitionIds: afterCap.newlyCollectedWeaponDefinitionIds,
        newlyCollectedMapDefinitionIds: afterCap.newlyCollectedMapDefinitionIds,
      },
      eligibleWeaponDefinitionIds: undefined,
    });
    const afterCapEarned = afterCapProjection.screens.find(
      ({ screenId }) => screenId === 'result-reward',
    )?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText;
    expect(afterCap.researchedWeaponDefinitionId).toBeNull();
    expect(afterCapEarned).not.toContain('+1');
  });

  it('allows an imported duplicate grant without a historical mode record', () => {
    const imported = createArenaV2LearningProfileV1(MILESTONE_DEFINITION, {
      schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
      profileDefinitionId: MILESTONE_DEFINITION.id,
      profileDefinitionContentVersion: MILESTONE_DEFINITION.contentVersion,
      profileId: 'local',
      revision: 9,
      committedGrantIds: ['grant.imported.duplicate'],
      collections: { weaponDefinitionIds: [], mapDefinitionIds: [] },
      weaponMastery: [],
      mapSegmentMastery: [],
      modeRecords: [],
      challenges: [],
    });
    const input = {
      profileDefinition: MILESTONE_DEFINITION,
      profile: imported,
      selectedWeaponDefinitionId: null,
      selectedMapDefinitionId: null,
      settlement: {
        status: 'duplicate',
        grantId: 'grant.imported.duplicate',
        profileRevision: imported.revision,
        sourceModeDefinitionId: 'mode.duel',
        effectiveLearningProgress: false,
        progressKinds: [],
        researchedWeaponDefinitionId: null,
        weaponContextEvidenceDeltas: [],
        mapSegmentEvidenceDeltas: [],
        mapRouteEvidenceDeltas: [],
        modeCompletionDeltas: [],
        challengeProgressDeltas: [],
        newlyCollectedWeaponDefinitionIds: [],
        newlyCollectedMapDefinitionIds: [],
      },
      eligibleWeaponDefinitionIds: undefined,
    };
    const projection = projectArenaV2LearningInformationV1(input);
    const earned = projection.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText;
    expect(earned).toBe('本局已处理，不重复累计');
    expect(earned).not.toMatch(/最快|最长坚持/);
    expect(() => projectArenaV2LearningInformationV1({
      ...input,
      settlement: { ...input.settlement, sourceModeDefinitionId: 'mode.future' },
    })).toThrow(/sourceModeDefinitionId/);
  });

  it('keeps not-settled copy and rejects accessor settlement without reading it', () => {
    const baseline = milestoneProfile();
    const waiting = projectArenaV2LearningInformationV1({
      profileDefinition: MILESTONE_DEFINITION,
      profile: baseline.profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: null,
      settlement: null,
      eligibleWeaponDefinitionIds: undefined,
    });
    expect(waiting.screens.find(({ screenId }) => screenId === 'result-reward')
      ?.fieldValues.find(({ fieldId }) => fieldId === 'earned-progress')?.valueText)
      .toBe('等待权威赛果结算');

    let getterCalls = 0;
    const hostile = {
      status: 'committed',
      grantId: baseline.grant.grantId,
      sourceModeDefinitionId: baseline.grant.sourceModeDefinitionId,
      effectiveLearningProgress: baseline.effectiveLearningProgress,
      progressKinds: baseline.progressKinds,
      researchedWeaponDefinitionId: baseline.researchedWeaponDefinitionId,
      weaponContextEvidenceDeltas: baseline.weaponContextEvidenceDeltas,
      mapSegmentEvidenceDeltas: baseline.mapSegmentEvidenceDeltas,
      mapRouteEvidenceDeltas: baseline.mapRouteEvidenceDeltas,
      modeCompletionDeltas: baseline.modeCompletionDeltas,
      challengeProgressDeltas: baseline.challengeProgressDeltas,
      newlyCollectedWeaponDefinitionIds: baseline.newlyCollectedWeaponDefinitionIds,
      newlyCollectedMapDefinitionIds: baseline.newlyCollectedMapDefinitionIds,
    } as Record<string, unknown>;
    Object.defineProperty(hostile, 'profileRevision', {
      enumerable: true,
      get() { getterCalls += 1; return baseline.profile.revision; },
    });
    expect(() => projectArenaV2LearningInformationV1({
      profileDefinition: MILESTONE_DEFINITION,
      profile: baseline.profile,
      selectedWeaponDefinitionId: 'weapon.a',
      selectedMapDefinitionId: null,
      settlement: hostile,
      eligibleWeaponDefinitionIds: undefined,
    })).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });

  it('derives each numerator from a named denominator opportunity and carries no raw path data', () => {
    const firstSeen = createArenaV2RetentionObservationV1(observation('event.1', 1, {}));
    const repeated = createArenaV2RetentionObservationV1(observation('event.2', 2, {
      kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CONTENT_REPEAT_ENTRY,
      repeatOrdinal: 2,
    }));
    const ineffective = createArenaV2RetentionObservationV1(observation('event.3', 3, {
      kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED,
      repeatOrdinal: null,
      effectiveLearningProgress: false,
    }));
    const homeContinuationFollowed = createArenaV2RetentionObservationV1(
      observation('event.4', 4, {
        kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.HOME_CONTINUATION_FOLLOWED,
        repeatOrdinal: null,
        goalSelected: true,
        goalId: 'collect-map:map.a',
        mapDefinitionIds: ['map.a'],
        modeDefinitionIds: ['mode.race'],
      }),
    );
    const mapLearningContinued = createArenaV2MapLearningFocusContinuationObservationV1({
      schemaVersion: 1,
      status: 'production-unreachable',
      hardGate: false,
      defaultSinkWired: false,
      eventId: 'event.5',
      cohortSubjectId: 'cohort.1',
      sessionSequence: 1,
      eventSequence: 5,
      profileRevision: 1,
      authorityTick: 20,
      previousGoalId: 'map-segment:map.a:segment.a',
      previousGoalProfileRevision: 0,
      previousGoalKind: 'map-segment',
      previousGoalMapDefinitionId: 'map.a',
      previousGoalSegmentDefinitionId: 'segment.a',
      progressedMapDefinitionId: 'map.a',
      progressedSegmentDefinitionId: 'segment.a',
    });
    const weaponContextContinued =
      createArenaV2WeaponResearchFocusContinuationObservationV1({
        schemaVersion: 1,
        status: 'production-unreachable',
        hardGate: false,
        defaultSinkWired: false,
        eventId: 'event.6',
        cohortSubjectId: 'cohort.1',
        sessionSequence: 1,
        eventSequence: 6,
        profileRevision: 1,
        authorityTick: 20,
        previousGoalId: 'weapon-context:weapon.a:edge',
        previousGoalProfileRevision: 0,
        previousGoalKind: 'weapon-context',
        previousGoalWeaponDefinitionId: 'weapon.a',
        previousGoalContext: 'edge',
        progressedWeaponDefinitionId: 'weapon.a',
        progressedContext: 'edge',
      });
    expect(firstSeen).toMatchObject({
      numeratorIncrement: 1,
      denominatorIncrement: 1,
      denominatorKey: 'eligible-catalog-impression',
      privacy: {
        containsRawReplay: false,
        containsInputTrajectory: false,
        containsDeviceFingerprint: false,
        containsWallClockTimestamp: false,
      },
    });
    expect(repeated.numeratorIncrement).toBe(1);
    expect(ineffective.numeratorIncrement).toBe(0);
    const report = aggregateArenaV2RetentionObservationsV1([
      firstSeen,
      repeated,
      ineffective,
      homeContinuationFollowed,
      mapLearningContinued,
      weaponContextContinued,
    ]);
    expect(report.metrics.find(({ kind }) => kind === 'effective-learning-completed'))
      .toMatchObject({ numerator: 0, denominator: 1, ratio: 0 });
    expect(report.longitudinalEvidence).toBe('not-run');
    expect(report.metrics.find(({ kind }) => kind === 'home-continuation-followed'))
      .toMatchObject({
        denominatorKey: 'home-continuation-accepted',
        numerator: 1,
        denominator: 1,
        ratio: 1,
      });
    expect(report.metrics.find(({ kind }) => kind === 'map-learning-focus-continued'))
      .toMatchObject({
        denominatorKey: 'map-learning-focus-opportunity',
        numerator: 1,
        denominator: 1,
        ratio: 1,
      });
    expect(report.metrics.find(({ kind }) => kind === 'weapon-research-focus-continued'))
      .toMatchObject({ numerator: 1, denominator: 1, ratio: 1 });
    expect(() => createArenaV2MapLearningFocusContinuationObservationV1({
      schemaVersion: 1,
      status: 'production-unreachable',
      hardGate: false,
      defaultSinkWired: false,
      eventId: 'event.invalid-map-focus',
      cohortSubjectId: 'cohort.1',
      sessionSequence: 1,
      eventSequence: 7,
      profileRevision: 1,
      authorityTick: 21,
      previousGoalId: 'map-segment:map.a:segment.a',
      previousGoalProfileRevision: 0,
      previousGoalKind: 'map-segment',
      previousGoalMapDefinitionId: 'map.a',
      previousGoalSegmentDefinitionId: null,
      progressedMapDefinitionId: null,
      progressedSegmentDefinitionId: null,
    })).toThrow(/必须携带路段身份/u);
  });

  it('calibrates the 200-hour capacity hypothesis from settled authority ticks only', () => {
    const effective = observation('event.pace.effective', 7, {
      authorityTick: 18_000,
      kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED,
      weaponDefinitionIds: ['weapon.a'],
      mapDefinitionIds: ['map.a'],
      modeDefinitionIds: ['mode.duel'],
      repeatOrdinal: null,
      effectiveLearningProgress: true,
    });
    const ineffective = observation('event.pace.ineffective', 8, {
      authorityTick: 9_000,
      kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED,
      weaponDefinitionIds: ['weapon.a'],
      mapDefinitionIds: ['map.a'],
      modeDefinitionIds: ['mode.duel'],
      repeatOrdinal: null,
      effectiveLearningProgress: false,
    });
    expect(projectArenaV2LearningPaceCalibrationCandidateV1({
      profileDefinition: MILESTONE_DEFINITION,
      observations: [effective, ineffective],
    })).toEqual(expect.objectContaining({
      status: 'offline-capacity-calibration-candidate',
      productionReady: false,
      longitudinalEvidence: 'not-run',
      tickRateHz: 60,
      assumedAverageMatchMinutes: 5,
      settledMatchCount: 2,
      measuredSettledMatchCount: 2,
      missingAuthorityDurationCount: 0,
      effectiveLearningMatchCount: 1,
      effectiveLearningRate: 0.5,
      totalAuthorityTicks: 27_000,
      minimumAuthorityMatchTicks: 9_000,
      maximumAuthorityMatchTicks: 18_000,
      averageAuthorityMatchTicks: 13_500,
      averageAuthorityMatchMinutes: 3.75,
      averageMinusAssumptionMinutes: -1.25,
      meetsFiveMinuteCapacityAssumption: false,
      weaponMainResearchPointTarget: 240,
      idealizedWeaponCollectionHoursAtObservedAverage: 15,
      idealizedWeaponCollectionDeltaFromTargetHours: -185,
      meetsTwoHundredHourIdealizedWeaponCapacity: false,
      minimumMainResearchPointsForTargetAtObservedAverage: 3_200,
      minimumCollectionEvidencePerWeaponForTargetAtObservedAverage: 1_600,
      estimateKind:
        'observed-authority-duration-if-every-match-awards-one-main-research-point',
      claimsObservedRetention: false,
      containsWallClockTime: false,
    }));
  });

  it('reports missing authority duration without inventing elapsed time', () => {
    const missingDuration = observation('event.pace.missing-duration', 9, {
      authorityTick: null,
      kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED,
      weaponDefinitionIds: ['weapon.a'],
      mapDefinitionIds: ['map.a'],
      modeDefinitionIds: ['mode.survival'],
      repeatOrdinal: null,
      effectiveLearningProgress: true,
    });
    expect(projectArenaV2LearningPaceCalibrationCandidateV1({
      profileDefinition: MILESTONE_DEFINITION,
      observations: [missingDuration],
    })).toEqual(expect.objectContaining({
      settledMatchCount: 1,
      measuredSettledMatchCount: 0,
      missingAuthorityDurationCount: 1,
      effectiveLearningMatchCount: 1,
      effectiveLearningRate: 1,
      totalAuthorityTicks: 0,
      minimumAuthorityMatchTicks: null,
      maximumAuthorityMatchTicks: null,
      averageAuthorityMatchTicks: null,
      averageAuthorityMatchMinutes: null,
      averageMinusAssumptionMinutes: null,
      meetsFiveMinuteCapacityAssumption: null,
      idealizedWeaponCollectionHoursAtObservedAverage: null,
      idealizedWeaponCollectionDeltaFromTargetHours: null,
      meetsTwoHundredHourIdealizedWeaponCapacity: null,
      minimumMainResearchPointsForTargetAtObservedAverage: null,
      minimumCollectionEvidencePerWeaponForTargetAtObservedAverage: null,
      claimsObservedRetention: false,
      containsWallClockTime: false,
    }));
  });

  it('does not derive a 200-hour threshold from zero-duration authority evidence', () => {
    const zeroDuration = observation('event.pace.zero-duration', 10, {
      authorityTick: 0,
      kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED,
      weaponDefinitionIds: ['weapon.a'],
      mapDefinitionIds: ['map.a'],
      modeDefinitionIds: ['mode.race'],
      repeatOrdinal: null,
      effectiveLearningProgress: true,
    });
    expect(projectArenaV2LearningPaceCalibrationCandidateV1({
      profileDefinition: MILESTONE_DEFINITION,
      observations: [zeroDuration],
    })).toEqual(expect.objectContaining({
      averageAuthorityMatchTicks: 0,
      averageAuthorityMatchMinutes: 0,
      idealizedWeaponCollectionHoursAtObservedAverage: null,
      idealizedWeaponCollectionDeltaFromTargetHours: null,
      meetsTwoHundredHourIdealizedWeaponCapacity: null,
      minimumMainResearchPointsForTargetAtObservedAverage: null,
      minimumCollectionEvidencePerWeaponForTargetAtObservedAverage: null,
    }));
  });

  it('derives actual weapon-point pace from a contiguous profile window', () => {
    const currentProfile = milestoneProfile(29, 'grant.pace.current').profile;
    const baselineProfile = createArenaV2LearningProfileV1(MILESTONE_DEFINITION, {
      ...currentProfile,
      revision: currentProfile.revision - 1,
      committedGrantIds: [],
      weaponMastery: [{
        weaponDefinitionId: 'weapon.a',
        useCount: 29,
        contexts: [
          { context: 'ground', evidenceCount: 0, completedAtRevision: null },
          { context: 'aerial', evidenceCount: 0, completedAtRevision: null },
          { context: 'edge', evidenceCount: 0, completedAtRevision: null },
          { context: 'duel-counterplay', evidenceCount: 0, completedAtRevision: null },
          { context: 'survival', evidenceCount: 0, completedAtRevision: null },
        ],
      }],
      mapSegmentMastery: [],
      modeRecords: [],
      challenges: [],
    });
    const settled = observation('event.weapon-pace.settled', 11, {
      profileRevision: currentProfile.revision,
      authorityTick: 18_000,
      kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED,
      weaponDefinitionIds: ['weapon.a'],
      mapDefinitionIds: ['map.a'],
      modeDefinitionIds: ['mode.survival'],
      repeatOrdinal: null,
      effectiveLearningProgress: true,
    });
    const window = createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
      profileDefinition: MILESTONE_DEFINITION,
      baselineProfile,
      cohortSubjectId: 'opaque-subject-a',
    });
    expect(window.profileDefinitionContentHash).toBe(MILESTONE_DEFINITION.contentHash);
    expect(MILESTONE_DEFINITION.limits.maxIdentifierLength)
      .toBeLessThan(ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1);
    const maximumLengthSubject = 's'.repeat(ARENA_V2_RETENTION_IDENTIFIER_MAX_LENGTH_V1);
    expect(createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
      profileDefinition: MILESTONE_DEFINITION,
      baselineProfile,
      cohortSubjectId: maximumLengthSubject,
    }).cohortSubjectId).toBe(maximumLengthSubject);
    expect(() => createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
      profileDefinition: MILESTONE_DEFINITION,
      baselineProfile,
      cohortSubjectId: `${maximumLengthSubject}x`,
    })).toThrow(/长度上限/u);
    const detailedProjection = projectArenaV2WeaponResearchPaceCalibrationCandidateV1({
      profileDefinition: MILESTONE_DEFINITION,
      baselineProfile,
      currentProfile,
      observations: [settled],
      window,
    });
    expect(detailedProjection).toEqual(expect.objectContaining({
      status: 'offline-weapon-research-pace-calibration-candidate',
      productionReady: false,
      longitudinalEvidence: 'not-run',
      windowIdentityHash: window.windowIdentityHash,
      baselineProfileRevision: currentProfile.revision - 1,
      currentProfileRevision: currentProfile.revision,
      settledMatchCount: 1,
      measuredSettledMatchCount: 1,
      missingAuthorityDurationCount: 0,
      completeAuthorityDurationWindow: true,
      observedWeaponResearchPointCount: 1,
      observedWeaponResearchPointRate: 1,
      totalAuthorityTicks: 18_000,
      averageAuthorityMinutesPerResearchPoint: 5,
      currentMainResearchPoints: 30,
      targetMainResearchPoints: 240,
      remainingMainResearchPoints: 210,
      projectedRemainingWeaponCollectionHoursAtObservedPace: 17.5,
      projectedCatalogWeaponCollectionHoursAtObservedPace: 20,
      projectedCatalogDeltaFromTargetHours: -180,
      meetsTwoHundredHourObservedWeaponPace: false,
      projectionKind: 'profile-delta-and-complete-authority-window-extrapolation',
      addsRetentionMetric: false,
      claimsObservedRetention: false,
      containsWallClockTime: false,
    }));
    expect(projectArenaV2WeaponResearchPaceCalibrationFromAccumulatedEvidenceCandidateV1({
      profileDefinition: MILESTONE_DEFINITION,
      baselineProfile,
      currentProfile,
      window,
      settledMatchCount: 1,
      measuredSettledMatchCount: 1,
      missingAuthorityDurationCount: 0,
      totalAuthorityTicks: 18_000,
      evidenceThroughProfileRevision: currentProfile.revision,
      catalogCompletionProfileRevision: null,
    })).toEqual(detailedProjection);
    const {
      contentHash: originalDefinitionContentHash,
      ...definitionWithoutHash
    } = MILESTONE_DEFINITION;
    expect(originalDefinitionContentHash).toBe(window.profileDefinitionContentHash);
    const driftedDefinition = createArenaV2LearningProfileDefinitionV1({
      ...definitionWithoutHash,
      limits: {
        ...definitionWithoutHash.limits,
        maxCounterValue: definitionWithoutHash.limits.maxCounterValue + 1,
      },
    });
    expect(driftedDefinition.contentVersion).toBe(MILESTONE_DEFINITION.contentVersion);
    expect(driftedDefinition.contentHash).not.toBe(MILESTONE_DEFINITION.contentHash);
    expect(() => projectArenaV2WeaponResearchPaceCalibrationCandidateV1({
      profileDefinition: driftedDefinition,
      baselineProfile,
      currentProfile,
      observations: [settled],
      window,
    })).toThrow(/窗口身份漂移/u);
  });

  it('withholds weapon-point time projection when the profile window lacks duration', () => {
    const currentProfile = milestoneProfile(29, 'grant.pace.missing').profile;
    const baselineProfile = createArenaV2LearningProfileV1(MILESTONE_DEFINITION, {
      ...currentProfile,
      revision: currentProfile.revision - 1,
      committedGrantIds: [],
      weaponMastery: [{
        weaponDefinitionId: 'weapon.a',
        useCount: 29,
        contexts: [
          { context: 'ground', evidenceCount: 0, completedAtRevision: null },
          { context: 'aerial', evidenceCount: 0, completedAtRevision: null },
          { context: 'edge', evidenceCount: 0, completedAtRevision: null },
          { context: 'duel-counterplay', evidenceCount: 0, completedAtRevision: null },
          { context: 'survival', evidenceCount: 0, completedAtRevision: null },
        ],
      }],
      mapSegmentMastery: [],
      modeRecords: [],
      challenges: [],
    });
    const settled = observation('event.weapon-pace.missing', 12, {
      profileRevision: currentProfile.revision,
      authorityTick: null,
      kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED,
      weaponDefinitionIds: ['weapon.a'],
      mapDefinitionIds: ['map.a'],
      modeDefinitionIds: ['mode.survival'],
      repeatOrdinal: null,
      effectiveLearningProgress: true,
    });
    const window = createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
      profileDefinition: MILESTONE_DEFINITION,
      baselineProfile,
      cohortSubjectId: 'opaque-subject-a',
    });
    expect(projectArenaV2WeaponResearchPaceCalibrationCandidateV1({
      profileDefinition: MILESTONE_DEFINITION,
      baselineProfile,
      currentProfile,
      observations: [settled],
      window,
    })).toEqual(expect.objectContaining({
      completeAuthorityDurationWindow: false,
      observedWeaponResearchPointCount: 1,
      observedWeaponResearchPointRate: 1,
      averageAuthorityMinutesPerResearchPoint: null,
      projectedRemainingWeaponCollectionHoursAtObservedPace: null,
      projectedCatalogWeaponCollectionHoursAtObservedPace: null,
      projectedCatalogDeltaFromTargetHours: null,
      meetsTwoHundredHourObservedWeaponPace: null,
    }));
    expect(() => projectArenaV2WeaponResearchPaceCalibrationCandidateV1({
      profileDefinition: MILESTONE_DEFINITION,
      baselineProfile,
      currentProfile,
      observations: [{ ...settled, cohortSubjectId: 'opaque-subject-b' }],
      window,
    })).toThrow(/观察与校准窗口主体漂移/u);
  });

  it('binds learning-focus observations to canonical goal and settlement revision identities', () => {
    const baseWeaponFocus = {
      schemaVersion: 1,
      status: 'production-unreachable',
      hardGate: false,
      defaultSinkWired: false,
      eventId: 'event.focus.weapon',
      cohortSubjectId: 'cohort.1',
      sessionSequence: 1,
      eventSequence: 7,
      profileRevision: 5,
      authorityTick: 21,
      previousGoalId: 'collect-weapon:weapon.a',
      previousGoalProfileRevision: 4,
      previousGoalKind: 'collect-weapon',
      previousGoalWeaponDefinitionId: 'weapon.a',
      previousGoalContext: null,
      progressedWeaponDefinitionId: null,
      progressedContext: null,
    } as const;
    expect(createArenaV2WeaponResearchFocusContinuationObservationV1(baseWeaponFocus))
      .toMatchObject({
        profileRevision: 5,
        goalId: 'collect-weapon:weapon.a',
        numeratorIncrement: 0,
      });
    expect(() => createArenaV2WeaponResearchFocusContinuationObservationV1({
      ...baseWeaponFocus,
      previousGoalId: 'collect-weapon:weapon.b',
    })).toThrow(/goalId与目标身份不一致/u);
    expect(() => createArenaV2WeaponResearchFocusContinuationObservationV1({
      ...baseWeaponFocus,
      profileRevision: 6,
    })).toThrow(/Profile revision不连续/u);

    const baseMapFocus = {
      schemaVersion: 1,
      status: 'production-unreachable',
      hardGate: false,
      defaultSinkWired: false,
      eventId: 'event.focus.map',
      cohortSubjectId: 'cohort.1',
      sessionSequence: 1,
      eventSequence: 8,
      profileRevision: 5,
      authorityTick: 21,
      previousGoalId: 'map-segment:map.a:segment.a',
      previousGoalProfileRevision: 4,
      previousGoalKind: 'map-segment',
      previousGoalMapDefinitionId: 'map.a',
      previousGoalSegmentDefinitionId: 'segment.a',
      progressedMapDefinitionId: 'map.a',
      progressedSegmentDefinitionId: 'segment.a',
    } as const;
    expect(createArenaV2MapLearningFocusContinuationObservationV1(baseMapFocus))
      .toMatchObject({
        profileRevision: 5,
        goalId: 'map-segment:map.a:segment.a',
        numeratorIncrement: 1,
      });
    expect(() => createArenaV2MapLearningFocusContinuationObservationV1({
      ...baseMapFocus,
      previousGoalId: 'map-segment:map.a:segment.b',
    })).toThrow(/goalId与目标身份不一致/u);
    expect(() => createArenaV2MapLearningFocusContinuationObservationV1({
      ...baseMapFocus,
      previousGoalProfileRevision: 5,
    })).toThrow(/Profile revision不连续/u);

    let getterCalls = 0;
    const accessorFocus: Record<string, unknown> = { ...baseWeaponFocus };
    Object.defineProperty(accessorFocus, 'previousGoalProfileRevision', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 4;
      },
    });
    expect(() => createArenaV2WeaponResearchFocusContinuationObservationV1(accessorFocus))
      .toThrow(/数据字段/u);
    expect(getterCalls).toBe(0);
    expect(() => createArenaV2MapLearningFocusContinuationObservationV1({
      ...baseMapFocus,
      futureField: true,
    })).toThrow(/未知字段/u);
  });

  it('rejects profile revision rollback by logical retention event identity', () => {
    const first = createArenaV2RetentionObservationV1(observation('event.revision.1', 1, {
      profileRevision: 4,
    }));
    const second = createArenaV2RetentionObservationV1(observation('event.revision.2', 2, {
      profileRevision: 5,
    }));
    expect(aggregateArenaV2RetentionObservationsV1([second, first])).toMatchObject({
      observationCount: 2,
      distinctSubjectCount: 1,
    });
    const rollback = createArenaV2RetentionObservationV1(observation(
      'event.revision.rollback',
      2,
      { profileRevision: 3 },
    ));
    expect(() => aggregateArenaV2RetentionObservationsV1([rollback, first]))
      .toThrow(/profileRevision不能随事件身份回退/u);
  });

  it('rejects profile revision rollback before Journal storage access and accepts correction', () => {
    const keyPrefix = 'arena.retention.profile-revision-watermark.test';
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    let storageReads = 0;
    let storageWrites = 0;
    const storage = Object.freeze({
      storageRead(key: string) {
        storageReads += 1;
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        storageWrites += 1;
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key: string) {
        values.delete(key);
        return true;
      },
    });
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage,
      ownerId: 'retention-profile-revision-watermark-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'opaque-subject-a',
      capacity: 32,
      keyPrefix,
    });
    try {
      journal.open();
      journal.collect(observation('event.revision.journal.1', 1, { profileRevision: 4 }));
      const readsBeforeRollback = storageReads;
      const writesBeforeRollback = storageWrites;
      expect(() => journal.collect(observation('event.revision.journal.2', 2, {
        profileRevision: 3,
      }))).toThrow(/profileRevision不能回退/u);
      expect(storageReads).toBe(readsBeforeRollback);
      expect(storageWrites).toBe(writesBeforeRollback);
      expect(journal.getSnapshot()).toMatchObject({
        lifecycle: 'open',
        revision: 1,
        observationCount: 1,
      });
      journal.collect(observation('event.revision.journal.2', 2, { profileRevision: 4 }));
      expect(journal.getSnapshot()).toMatchObject({
        lifecycle: 'open',
        revision: 2,
        observationCount: 2,
      });
    } finally {
      journal.destroy();
    }
  });

  it('rejects a self-hashed stored Journal whose profile revision watermark regresses', () => {
    const keyPrefix = 'arena.retention.stored-profile-revision-watermark.test';
    const journalKey = `${keyPrefix}.journal`;
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    const storage = Object.freeze({
      storageRead(key: string) {
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key: string) {
        values.delete(key);
        return true;
      },
    });
    const firstJournal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage,
      ownerId: 'retention-stored-profile-revision-first-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'opaque-subject-a',
      capacity: 32,
      keyPrefix,
    });
    firstJournal.open();
    firstJournal.collect(observation('event.revision.stored.1', 1, { profileRevision: 4 }));
    firstJournal.collect(observation('event.revision.stored.2', 2, { profileRevision: 5 }));
    firstJournal.destroy();

    const stored = clone(values.get(journalKey)) as Record<string, unknown> & {
      observations: Array<Record<string, unknown>>;
    };
    stored.observations[1] = Object.freeze({
      ...stored.observations[1]!,
      profileRevision: 3,
    });
    const sourcePayload = Object.fromEntries(
      Object.entries(stored).filter(([key]) => key !== 'payloadHash'),
    );
    stored.payloadHash = createDeterministicDataHash(
      sourcePayload,
      'Arena V2 offline retention journal payload',
    );
    values.set(journalKey, clone(stored));

    const reopened = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage,
      ownerId: 'retention-stored-profile-revision-second-owner',
      wallNow: () => 2_000,
      cohortSubjectId: 'opaque-subject-a',
      capacity: 32,
      keyPrefix,
    });
    try {
      expect(() => reopened.open()).toThrow(/profileRevision回退/u);
      expect(reopened.getSnapshot()).toMatchObject({ lifecycle: 'failed' });
    } finally {
      reopened.destroy();
    }
  });

  it('keeps a swallowed-reentry collect pending until the same observation is confirmed', () => {
    const keyPrefix = 'arena.retention.reentry-watermark.test';
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    let journal: ArenaV2OfflineRetentionObservationJournalCandidateV1;
    let onJournalWrite: (() => void) | null = null;
    let onLeaseDelete: (() => void) | null = null;
    const storage = Object.freeze({
      storageRead(key: string) {
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        values.set(key, clone(value));
        if (key === `${keyPrefix}.journal`
          && (value as { readonly revision?: unknown }).revision === 1) {
          onJournalWrite?.();
        }
        return true;
      },
      storageDelete(key: string) {
        values.delete(key);
        if (key === `${keyPrefix}.lease`) onLeaseDelete?.();
        return true;
      },
    });
    journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage,
      ownerId: 'retention-reentry-watermark-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'opaque-subject-a',
      capacity: 32,
      keyPrefix,
    });
    journal.open();
    let nestedWriteReadError: unknown = null;
    onJournalWrite = () => {
      try { journal.getSnapshot(); } catch (error) { nestedWriteReadError = error; }
    };

    const reenteredObservation = createArenaV2RetentionObservationV1(
      observation('event.reentry.1', 1, {}),
    );
    expect(() => journal.collect(reenteredObservation)).toThrow(/重入/u);
    expect(nestedWriteReadError).toBeInstanceOf(Error);
    expect(() => journal.getSnapshot()).toThrow(/未决collect/u);
    expect(() => journal.getExportBundle()).toThrow(/未决collect/u);
    expect(journal.getCollector()).toMatchObject({
      status: 'offline-only',
      sessionSequence: 1,
    });
    onJournalWrite = null;
    journal.collect(reenteredObservation);
    expect(journal.getExportBundle()).toMatchObject({
      revision: 1,
      observationCount: 1,
      retainedObservationCount: 1,
      report: {
        metrics: expect.arrayContaining([expect.objectContaining({
          kind: 'catalog-first-seen',
          numerator: 1,
          denominator: 1,
        })]),
      },
    });

    let nestedDestroyError: unknown = null;
    onLeaseDelete = () => {
      try { journal.destroy(); } catch (error) { nestedDestroyError = error; }
    };
    expect(() => journal.destroy()).toThrow(/重入/u);
    expect(nestedDestroyError).toBeInstanceOf(Error);
    expect(journal.getSnapshot()).toMatchObject({ lifecycle: 'destroyed' });
    onLeaseDelete = null;
    expect(() => journal.destroy()).not.toThrow();
  });

  it('reconciles an uncertain collect by retrying only the same frozen observation', () => {
    const keyPrefix = 'arena.retention.pending-collect-reconcile.test';
    const journalKey = `${keyPrefix}.journal`;
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    let failConfirmationRead = false;
    let journalReads = 0;
    let revisionOneWrites = 0;
    const storage = Object.freeze({
      storageRead(key: string) {
        if (key === journalKey) {
          journalReads += 1;
          if (failConfirmationRead) {
            failConfirmationRead = false;
            throw new Error('journal confirmation temporarily unavailable');
          }
        }
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        values.set(key, clone(value));
        if (key === journalKey
          && (value as { readonly revision?: unknown }).revision === 1) {
          revisionOneWrites += 1;
          failConfirmationRead = true;
        }
        return true;
      },
      storageDelete(key: string) {
        values.delete(key);
        return true;
      },
    });
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage,
      ownerId: 'retention-pending-collect-reconcile-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'opaque-subject-a',
      capacity: 32,
      keyPrefix,
    });
    try {
      journal.open();
      const frozenObservation = createArenaV2RetentionObservationV1(
        observation('event.pending-collect.1', 1, {}),
      );
      expect(() => journal.collect(frozenObservation)).toThrow(
        /confirmation temporarily unavailable/u,
      );
      expect(() => journal.getSnapshot()).toThrow(/未决collect/u);
      expect(() => journal.getExportBundle()).toThrow(/未决collect/u);

      const readsBeforeDifferentObservation = journalReads;
      expect(() => journal.collect({
        ...frozenObservation,
        eventId: 'event.pending-collect.different',
      })).toThrow(/只能重试同一冻结observation/u);
      expect(() => journal.collect(observation(
        'event.pending-collect.later',
        2,
        {},
      ))).toThrow(/只能重试同一冻结observation/u);
      expect(journalReads).toBe(readsBeforeDifferentObservation);

      journal.collect(frozenObservation);
      expect(revisionOneWrites).toBe(1);
      expect(journal.getSnapshot()).toMatchObject({
        lifecycle: 'open',
        revision: 1,
        observationCount: 1,
        retainedObservationCount: 1,
        report: {
          metrics: expect.arrayContaining([expect.objectContaining({
            kind: 'catalog-first-seen',
            numerator: 1,
            denominator: 1,
          })]),
        },
      });
    } finally {
      journal.destroy();
    }
  });

  it('acknowledges only the exact latest committed observation without touching persistence', () => {
    const keyPrefix = 'arena.retention.last-committed-acknowledgement.test';
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    let storageReads = 0;
    let storageWrites = 0;
    let storageDeletes = 0;
    let wallNowReads = 0;
    const storage = Object.freeze({
      storageRead(key: string) {
        storageReads += 1;
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        storageWrites += 1;
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key: string) {
        storageDeletes += 1;
        values.delete(key);
        return true;
      },
    });
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage,
      ownerId: 'retention-last-committed-acknowledgement-owner',
      wallNow: () => {
        wallNowReads += 1;
        return 1_000;
      },
      cohortSubjectId: 'opaque-subject-a',
      capacity: 32,
      keyPrefix,
    });
    try {
      journal.open();
      const committedObservation = createArenaV2RetentionObservationV1(
        observation('event.last-committed.1', 1, { mapDefinitionIds: ['map.a'] }),
      );
      journal.collect(committedObservation);
      const snapshotBeforeAcknowledgement = journal.getSnapshot();
      const exportBeforeAcknowledgement = journal.getExportBundle();
      const readsBeforeAcknowledgement = storageReads;
      const writesBeforeAcknowledgement = storageWrites;
      const deletesBeforeAcknowledgement = storageDeletes;
      const wallNowBeforeAcknowledgement = wallNowReads;

      journal.collect(committedObservation);

      expect(storageReads).toBe(readsBeforeAcknowledgement);
      expect(storageWrites).toBe(writesBeforeAcknowledgement);
      expect(storageDeletes).toBe(deletesBeforeAcknowledgement);
      expect(wallNowReads).toBe(wallNowBeforeAcknowledgement);
      expect(journal.getSnapshot()).toEqual(snapshotBeforeAcknowledgement);
      expect(journal.getExportBundle()).toEqual(exportBeforeAcknowledgement);

      const readsBeforeDrift = storageReads;
      const writesBeforeDrift = storageWrites;
      expect(() => journal.collect({
        ...committedObservation,
        mapDefinitionIds: ['map.drift'],
      })).toThrow(/同水位确认必须重试最后同一观察/u);
      expect(() => journal.collect({
        ...committedObservation,
        cohortSubjectId: 'opaque-subject-drift',
      })).toThrow(/身份或session漂移/u);
      expect(storageReads).toBe(readsBeforeDrift);
      expect(storageWrites).toBe(writesBeforeDrift);
      expect(storageDeletes).toBe(deletesBeforeAcknowledgement);
      expect(wallNowReads).toBe(wallNowBeforeAcknowledgement);
      expect(journal.getSnapshot()).toEqual(snapshotBeforeAcknowledgement);
    } finally {
      journal.destroy();
    }
  });

  it('commits one bounded atomic batch to the same final envelope as ordered single collects', () => {
    const createJournal = (keyPrefix: string) => {
      const values = new Map<string, unknown>();
      const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
      return new ArenaV2OfflineRetentionObservationJournalCandidateV1({
        storage: Object.freeze({
          storageRead(key: string) {
            return values.has(key)
              ? { ok: true, found: true, value: clone(values.get(key)) }
              : { ok: true, found: false, value: undefined };
          },
          storageWrite(key: string, value: unknown) {
            values.set(key, clone(value));
            return true;
          },
          storageDelete(key: string) {
            values.delete(key);
            return true;
          },
        }),
        ownerId: `${keyPrefix}.owner`,
        wallNow: () => 1_000,
        cohortSubjectId: 'opaque-subject-a',
        capacity: 32,
        keyPrefix,
      });
    };
    const prefix = Object.freeze(Array.from({ length: 31 }, (_, index) => (
      createArenaV2RetentionObservationV1(observation(
        `event.atomic.prefix.${index + 1}`,
        index + 1,
        { repeatOrdinal: index + 1 },
      ))
    )));
    const observations = Object.freeze([
      createArenaV2RetentionObservationV1(observation('event.atomic.32', 32, {})),
      createArenaV2RetentionObservationV1(observation('event.atomic.33', 33, {
        kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CONTENT_REPEAT_ENTRY,
        repeatOrdinal: 2,
      })),
      createArenaV2RetentionObservationV1(observation('event.atomic.34', 34, {
        kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED,
        repeatOrdinal: null,
        effectiveLearningProgress: true,
      })),
    ]);
    const sequential = createJournal('arena.retention.atomic-equivalence.sequential');
    const atomic = createJournal('arena.retention.atomic-equivalence.batch');
    try {
      sequential.open();
      atomic.open();
      for (const item of prefix) {
        sequential.collect(item);
        atomic.collect(item);
      }
      for (const item of observations) sequential.collect(item);
      atomic.collectBatch(observations);

      expect(atomic.getSnapshot()).toEqual(sequential.getSnapshot());
      expect(atomic.getExportBundle()).toEqual(sequential.getExportBundle());
      expect(atomic.getSnapshot()).toMatchObject({
        revision: prefix.length + observations.length,
        observationCount: prefix.length + observations.length,
        retainedObservationCount: 32,
        droppedObservationCount: 2,
      });
    } finally {
      sequential.destroy();
      atomic.destroy();
    }
  });

  it('rejects an invalid middle batch item and an oversized batch before any port access', () => {
    const keyPrefix = 'arena.retention.atomic-invalid-middle.test';
    const values = new Map<string, unknown>();
    let portCalls = 0;
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage: Object.freeze({
        storageRead(key: string) {
          portCalls += 1;
          return values.has(key)
            ? { ok: true, found: true, value: clone(values.get(key)) }
            : { ok: true, found: false, value: undefined };
        },
        storageWrite(key: string, value: unknown) {
          portCalls += 1;
          values.set(key, clone(value));
          return true;
        },
        storageDelete(key: string) {
          portCalls += 1;
          values.delete(key);
          return true;
        },
      }),
      ownerId: 'retention-atomic-invalid-middle-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'opaque-subject-a',
      capacity: 32,
      keyPrefix,
    });
    try {
      journal.open();
      const callsAfterOpen = portCalls;
      const first = createArenaV2RetentionObservationV1(
        observation('event.atomic-invalid.1', 1, {}),
      );
      let getterCalls = 0;
      const accessorMiddle = observation('event.atomic-invalid.accessor', 2, {});
      Object.defineProperty(accessorMiddle, 'profileRevision', {
        enumerable: true,
        get() {
          getterCalls += 1;
          return 1;
        },
      });
      expect(() => journal.collectBatch([
        first,
        { ...observation('event.atomic-invalid.2', 2, {}), futureField: true },
      ])).toThrow(/未知字段/u);
      expect(() => journal.collectBatch([first, accessorMiddle])).toThrow(/数据字段/u);
      expect(getterCalls).toBe(0);
      expect(() => journal.collectBatch([
        first,
        createArenaV2RetentionObservationV1(
          observation('event.atomic-invalid.gap', 3, {}),
        ),
      ])).toThrow(/eventSequence不连续/u);
      expect(() => journal.collectBatch([
        createArenaV2RetentionObservationV1(observation(
          'event.atomic-invalid.profile.1',
          1,
          { profileRevision: 2 },
        )),
        createArenaV2RetentionObservationV1(observation(
          'event.atomic-invalid.profile.2',
          2,
          { profileRevision: 1 },
        )),
      ])).toThrow(/profileRevision不能回退/u);
      const symbolBatch = [first];
      Object.defineProperty(symbolBatch, Symbol('future'), {
        enumerable: false,
        value: true,
      });
      expect(() => journal.collectBatch(symbolBatch)).toThrow(/Symbol/u);
      expect(() => journal.collectBatch(Array.from({ length: 26 }, (_, index) => (
        observation(`event.atomic-oversized.${index + 1}`, index + 1, {})
      )))).toThrow(/1\.\.25/u);
      expect(portCalls).toBe(callsAfterOpen);
      expect(journal.getSnapshot()).toMatchObject({ revision: 0, observationCount: 0 });
    } finally {
      journal.destroy();
    }
  });

  it('recovers one uncertain atomic batch only from the exact frozen ordered content', () => {
    const keyPrefix = 'arena.retention.atomic-pending-reconcile.test';
    const journalKey = `${keyPrefix}.journal`;
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    let failConfirmationRead = false;
    let journalReads = 0;
    let revisionTwoWrites = 0;
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage: Object.freeze({
        storageRead(key: string) {
          if (key === journalKey) {
            journalReads += 1;
            if (failConfirmationRead) {
              failConfirmationRead = false;
              throw new Error('atomic confirmation temporarily unavailable');
            }
          }
          return values.has(key)
            ? { ok: true, found: true, value: clone(values.get(key)) }
            : { ok: true, found: false, value: undefined };
        },
        storageWrite(key: string, value: unknown) {
          values.set(key, clone(value));
          if (key === journalKey
            && (value as { readonly revision?: unknown }).revision === 2) {
            revisionTwoWrites += 1;
            failConfirmationRead = true;
          }
          return true;
        },
        storageDelete(key: string) {
          values.delete(key);
          return true;
        },
      }),
      ownerId: 'retention-atomic-pending-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'opaque-subject-a',
      capacity: 32,
      keyPrefix,
    });
    const batch = Object.freeze([
      createArenaV2RetentionObservationV1(observation('event.atomic-pending.1', 1, {})),
      createArenaV2RetentionObservationV1(observation('event.atomic-pending.2', 2, {
        kind: ARENA_V2_RETENTION_OBSERVATION_KIND_V1.CONTENT_REPEAT_ENTRY,
        repeatOrdinal: 2,
      })),
    ]);
    try {
      journal.open();
      expect(() => journal.collectBatch(batch)).toThrow(/temporarily unavailable/u);
      expect(() => journal.getSnapshot()).toThrow(/未决collect/u);
      expect(() => journal.getExportBundle()).toThrow(/未决collect/u);
      const readsBeforeDrift = journalReads;
      expect(() => journal.collectBatch(Object.freeze([
        batch[0]!,
        Object.freeze({ ...batch[1]!, repeatOrdinal: 3 }),
      ]))).toThrow(/只能重试同一冻结observation或原子批/u);
      expect(journalReads).toBe(readsBeforeDrift);

      journal.collectBatch(batch);
      expect(revisionTwoWrites).toBe(1);
      expect(journal.getSnapshot()).toMatchObject({
        revision: 2,
        observationCount: 2,
        retainedObservationCount: 2,
      });
    } finally {
      journal.destroy();
    }
  });

  it('acknowledges only the exact last committed atomic batch without touching ports', () => {
    const keyPrefix = 'arena.retention.atomic-acknowledgement.test';
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    let storageCalls = 0;
    let wallNowReads = 0;
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage: Object.freeze({
        storageRead(key: string) {
          storageCalls += 1;
          return values.has(key)
            ? { ok: true, found: true, value: clone(values.get(key)) }
            : { ok: true, found: false, value: undefined };
        },
        storageWrite(key: string, value: unknown) {
          storageCalls += 1;
          values.set(key, clone(value));
          return true;
        },
        storageDelete(key: string) {
          storageCalls += 1;
          values.delete(key);
          return true;
        },
      }),
      ownerId: 'retention-atomic-acknowledgement-owner',
      wallNow: () => {
        wallNowReads += 1;
        return 1_000;
      },
      cohortSubjectId: 'opaque-subject-a',
      capacity: 32,
      keyPrefix,
    });
    const batch = Object.freeze([
      createArenaV2RetentionObservationV1(observation('event.atomic-ack.1', 1, {})),
      createArenaV2RetentionObservationV1(observation('event.atomic-ack.2', 2, {
        mapDefinitionIds: ['map.a'],
      })),
    ]);
    try {
      journal.open();
      journal.collectBatch(batch);
      const before = journal.getSnapshot();
      const callsBeforeAck = storageCalls;
      const wallBeforeAck = wallNowReads;
      journal.collectBatch(batch);
      expect(storageCalls).toBe(callsBeforeAck);
      expect(wallNowReads).toBe(wallBeforeAck);
      expect(journal.getSnapshot()).toEqual(before);

      expect(() => journal.collectBatch(Object.freeze([batch[1]!]))).toThrow(
        /最后已提交观察批身份无法闭合/u,
      );
      expect(() => journal.collectBatch(Object.freeze([
        batch[0]!,
        Object.freeze({ ...batch[1]!, mapDefinitionIds: ['map.drift'] }),
      ]))).toThrow(/同水位确认必须重试最后同一观察或原子批/u);
      expect(() => journal.collectBatch(Object.freeze([batch[0]!]))).toThrow(
        /eventSequence不连续/u,
      );
      expect(storageCalls).toBe(callsBeforeAck);
      expect(wallNowReads).toBe(wallBeforeAck);
      expect(journal.getSnapshot()).toEqual(before);
    } finally {
      journal.destroy();
    }
  });

  it('rejects an event older than the latest committed acknowledgement watermark', () => {
    const keyPrefix = 'arena.retention.old-acknowledgement.test';
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    let storageReads = 0;
    let storageWrites = 0;
    const storage = Object.freeze({
      storageRead(key: string) {
        storageReads += 1;
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        storageWrites += 1;
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key: string) {
        values.delete(key);
        return true;
      },
    });
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage,
      ownerId: 'retention-old-acknowledgement-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'opaque-subject-a',
      capacity: 32,
      keyPrefix,
    });
    try {
      journal.open();
      const first = createArenaV2RetentionObservationV1(
        observation('event.old-acknowledgement.1', 1, {}),
      );
      const second = createArenaV2RetentionObservationV1(
        observation('event.old-acknowledgement.2', 2, {}),
      );
      journal.collect(first);
      journal.collect(second);
      const readsBeforeOldRetry = storageReads;
      const writesBeforeOldRetry = storageWrites;

      expect(() => journal.collect(first)).toThrow(/eventSequence不连续/u);
      expect(storageReads).toBe(readsBeforeOldRetry);
      expect(storageWrites).toBe(writesBeforeOldRetry);
      expect(journal.getSnapshot()).toMatchObject({
        revision: 2,
        observationCount: 2,
        retainedObservationCount: 2,
      });
    } finally {
      journal.destroy();
    }
  });

  it('keeps pending collect and lease ownership when destroy cannot reconcile it', () => {
    const keyPrefix = 'arena.retention.pending-collect-destroy.test';
    const journalKey = `${keyPrefix}.journal`;
    const leaseKey = `${keyPrefix}.lease`;
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    let allowRevisionOneWrite = false;
    let leaseDeletes = 0;
    const storage = Object.freeze({
      storageRead(key: string) {
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        if (key === journalKey
          && (value as { readonly revision?: unknown }).revision === 1
          && !allowRevisionOneWrite) return false;
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key: string) {
        if (key === leaseKey) leaseDeletes += 1;
        values.delete(key);
        return true;
      },
    });
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage,
      ownerId: 'retention-pending-collect-destroy-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'opaque-subject-a',
      capacity: 32,
      keyPrefix,
    });
    let destroyed = false;
    try {
      journal.open();
      const frozenObservation = createArenaV2RetentionObservationV1(
        observation('event.pending-destroy.1', 1, {}),
      );
      expect(() => journal.collect(frozenObservation)).toThrow(/未被存储端接受/u);
      expect(() => journal.destroy()).toThrow(/未被存储端接受/u);
      expect(leaseDeletes).toBe(0);
      expect(() => journal.getSnapshot()).toThrow(/未决collect/u);
      expect(() => journal.getExportBundle()).toThrow(/未决collect/u);

      allowRevisionOneWrite = true;
      journal.destroy();
      destroyed = true;
      expect(leaseDeletes).toBe(1);
      expect(journal.getSnapshot()).toMatchObject({
        lifecycle: 'destroyed',
        revision: 1,
        observationCount: 1,
      });
      expect(() => journal.destroy()).not.toThrow();
    } finally {
      if (!destroyed) {
        allowRevisionOneWrite = true;
        journal.destroy();
      }
    }
  });

  it('verifies a legacy six-metric journal before adopting both later zero metrics', () => {
    const keyPrefix = 'arena.retention.legacy-six-metric.test';
    const journalKey = `${keyPrefix}.journal`;
    const legacyPayload = {
      schemaVersion: 1,
      status: 'offline-only',
      cohortSubjectId: 'legacy-six-metric-subject',
      revision: 0,
      capacity: 32,
      latestSessionSequence: 0,
      latestSessionEventSequence: 0,
      observationCount: 0,
      droppedObservationCount: 0,
      metrics: [
        ['catalog-first-seen', 'eligible-catalog-impression'],
        ['effective-learning-completed', 'settled-match'],
        ['content-repeat-entry', 'content-entry'],
        ['cross-content-used', 'completed-content-window'],
        ['next-goal-selected', 'next-goal-impression'],
        ['weapon-research-focus-continued', 'weapon-research-focus-opportunity'],
      ].map(([kind, denominatorKey]) => ({
        kind,
        denominatorKey,
        numerator: 0,
        denominator: 0,
      })),
      observations: [],
    };
    const values = new Map<string, unknown>([[journalKey, {
      ...legacyPayload,
      payloadHash: createDeterministicDataHash(
        legacyPayload,
        'Arena V2 offline retention journal payload',
      ),
    }]]);
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage: Object.freeze({
        storageRead(key: string) {
          return values.has(key)
            ? { ok: true, found: true, value: clone(values.get(key)) }
            : { ok: true, found: false, value: undefined };
        },
        storageWrite(key: string, value: unknown) {
          values.set(key, clone(value));
          return true;
        },
        storageDelete(key: string) {
          values.delete(key);
          return true;
        },
      }),
      ownerId: 'legacy-six-metric-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'legacy-six-metric-subject',
      capacity: 32,
      keyPrefix,
    });
    try {
      const opened = journal.open();
      expect(opened.report.metrics).toHaveLength(8);
      expect(opened.report.metrics.at(-2)).toMatchObject({
        kind: 'home-continuation-followed',
        denominatorKey: 'home-continuation-accepted',
        numerator: 0,
        denominator: 0,
      });
      expect(opened.report.metrics.at(-1)).toMatchObject({
        kind: 'map-learning-focus-continued',
        denominatorKey: 'map-learning-focus-opportunity',
        numerator: 0,
        denominator: 0,
      });
    } finally {
      journal.destroy();
    }
  });

  it('verifies a legacy seven-metric journal before adopting the map focus metric', () => {
    const keyPrefix = 'arena.retention.legacy-seven-metric.test';
    const journalKey = `${keyPrefix}.journal`;
    const legacyPayload = {
      schemaVersion: 1,
      status: 'offline-only',
      cohortSubjectId: 'legacy-seven-metric-subject',
      revision: 0,
      capacity: 32,
      latestSessionSequence: 0,
      latestSessionEventSequence: 0,
      observationCount: 0,
      droppedObservationCount: 0,
      metrics: [
        ['catalog-first-seen', 'eligible-catalog-impression'],
        ['effective-learning-completed', 'settled-match'],
        ['content-repeat-entry', 'content-entry'],
        ['cross-content-used', 'completed-content-window'],
        ['next-goal-selected', 'next-goal-impression'],
        ['weapon-research-focus-continued', 'weapon-research-focus-opportunity'],
        ['home-continuation-followed', 'home-continuation-accepted'],
      ].map(([kind, denominatorKey]) => ({
        kind,
        denominatorKey,
        numerator: 0,
        denominator: 0,
      })),
      observations: [],
    };
    const values = new Map<string, unknown>([[journalKey, {
      ...legacyPayload,
      payloadHash: createDeterministicDataHash(
        legacyPayload,
        'Arena V2 offline retention journal payload',
      ),
    }]]);
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage: Object.freeze({
        storageRead(key: string) {
          return values.has(key)
            ? { ok: true, found: true, value: clone(values.get(key)) }
            : { ok: true, found: false, value: undefined };
        },
        storageWrite(key: string, value: unknown) {
          values.set(key, clone(value));
          return true;
        },
        storageDelete(key: string) {
          values.delete(key);
          return true;
        },
      }),
      ownerId: 'legacy-seven-metric-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'legacy-seven-metric-subject',
      capacity: 32,
      keyPrefix,
    });
    try {
      const opened = journal.open();
      expect(opened.report.metrics).toHaveLength(8);
      expect(opened.report.metrics.at(-1)).toMatchObject({
        kind: 'map-learning-focus-continued',
        denominatorKey: 'map-learning-focus-opportunity',
        numerator: 0,
        denominator: 0,
      });
    } finally {
      journal.destroy();
    }
  });

  it('exports a deterministic self-verifiable offline retention bundle', () => {
    const keyPrefix = 'arena.retention.export-bundle.test';
    const values = new Map<string, unknown>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    const journal = new ArenaV2OfflineRetentionObservationJournalCandidateV1({
      storage: Object.freeze({
        storageRead(key: string) {
          return values.has(key)
            ? { ok: true, found: true, value: clone(values.get(key)) }
            : { ok: true, found: false, value: undefined };
        },
        storageWrite(key: string, value: unknown) {
          values.set(key, clone(value));
          return true;
        },
        storageDelete(key: string) {
          values.delete(key);
          return true;
        },
      }),
      ownerId: 'retention-export-owner',
      wallNow: () => 1_000,
      cohortSubjectId: 'retention-export-subject',
      capacity: 32,
      keyPrefix,
    });
    try {
      journal.open();
      const first = journal.getExportBundle();
      const { exportHash, ...exportPayload } = first;
      expect(exportHash).toBe(createDeterministicDataHash(
        exportPayload,
        'Arena V2 offline retention observation export bundle',
      ));
      const sourcePayload = {
        schemaVersion: first.sourceJournalSchemaVersion,
        status: 'offline-only',
        cohortSubjectId: first.cohortSubjectId,
        revision: first.revision,
        capacity: first.capacity,
        latestSessionSequence: first.latestSessionSequence,
        latestSessionEventSequence: first.latestSessionEventSequence,
        observationCount: first.observationCount,
        droppedObservationCount: first.droppedObservationCount,
        metrics: first.metrics,
        observations: first.observations,
      };
      expect(first.sourcePayloadHash).toBe(createDeterministicDataHash(
        sourcePayload,
        'Arena V2 offline retention journal payload',
      ));
      expect(first).toMatchObject({
        status: 'offline-only-export',
        retainedObservationCount: 0,
        observationCount: 0,
      });
      expect(journal.getExportBundle()).toEqual(first);
    } finally {
      journal.destroy();
    }
    expect(() => journal.getExportBundle()).toThrow(/destroyed|销毁/u);
  });
});
