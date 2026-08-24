import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_SAVE_ENVELOPE_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  ArenaV2LearningProfileFutureSchemaError,
  advanceArenaV2LearningProfileV1,
  assertArenaV2LearningProfileSaveEnvelopeV1HasNoFutureSchema,
  createArenaV2LearningGrantV1,
  bindArenaV2LearningGrantToReplayEvidenceV1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileSaveEnvelopeV1,
  createArenaV2LearningProfileV1,
} from '../src/index.js';

const DEFINITION = createArenaV2LearningProfileDefinitionV1({
  schemaVersion: ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  id: 'learning.test.v1',
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
      ground: 2,
      aerial: 2,
      edge: 2,
      'duel-counterplay': 2,
      survival: 2,
    },
    mapSegmentCompletionEvidence: 2,
    modeCompletionEvidence: 2,
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
  challengeDefinitions: [
    {
      challengeDefinitionId: 'challenge.a',
      targetProgress: 2,
      weaponDefinitionId: 'weapon.a',
      mapDefinitionId: 'map.a',
      segmentDefinitionId: 'segment.a',
      modeDefinitionId: 'mode.survival',
    },
    {
      challengeDefinitionId: 'challenge.non-main',
      targetProgress: 2,
      weaponDefinitionId: 'weapon.b',
      mapDefinitionId: 'map.a',
      segmentDefinitionId: 'segment.a',
      modeDefinitionId: 'mode.survival',
    },
  ],
});

function grant(id: string) {
  return createArenaV2LearningGrantV1(DEFINITION, {
    schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
    grantId: id,
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
    challengeDeltas: [{ challengeDefinitionId: 'challenge.a', progressDelta: 1 }],
  });
}

function profileWithModeRecord(
  kind: 'duel' | 'race' | 'survival',
  completionCount: number,
  winCount: number,
  bestPerformanceTicks: number | null,
  playCount = kind === 'race' ? Math.max(1, completionCount) : completionCount,
) {
  const profile = createArenaV2LearningProfileV1(DEFINITION);
  return {
    ...profile,
    revision: 2,
    modeRecords: [{
      modeDefinitionId: `mode.${kind}`,
      kind,
      playCount,
      completionCount,
      winCount,
      completedAtRevision: completionCount >= DEFINITION.masteryRequirements.modeCompletionEvidence
        ? 2
        : null,
      bestPerformanceTicks,
    }],
  };
}

function profileWithMapSegmentRecord(
  segmentDefinitionId: 'segment.a' | 'segment.b',
  completionEvidenceCount: number,
  bestRaceFinishTicks: number | null,
  bestSurvivalTicks: number | null,
) {
  const profile = createArenaV2LearningProfileV1(DEFINITION);
  return {
    ...profile,
    revision: 2,
    collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
    mapSegmentMastery: [{
      mapDefinitionId: 'map.a',
      segmentDefinitionId,
      completionEvidenceCount,
      completedAtRevision: completionEvidenceCount
        === DEFINITION.masteryRequirements.mapSegmentCompletionEvidence
        ? 2
        : null,
      bestRaceFinishTicks,
      bestSurvivalTicks,
    }],
  };
}

function modeOnlyGrant(
  grantId: string,
  kind: 'duel' | 'race' | 'survival',
  completionCountDelta: 0 | 1,
  winCountDelta: 0 | 1,
  bestPerformanceTicksCandidate: number | null,
) {
  return {
    schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
    grantId,
    resultAuthorityHash: 'facefeed',
    recipientParticipantId: 'p1',
    sourceModeDefinitionId: `mode.${kind}`,
    sourceMapDefinitionIds: ['map.a'],
    collectedWeaponDefinitionIds: [],
    collectedMapDefinitionIds: kind === 'race'
      ? bestPerformanceTicksCandidate === null ? [] : ['map.a']
      : completionCountDelta === 1 ? ['map.a'] : [],
    weaponDeltas: [],
    mapSegmentDeltas: [],
    modeDelta: {
      modeDefinitionId: `mode.${kind}`,
      playCountDelta: 1,
      completionCountDelta,
      winCountDelta,
      bestPerformanceTicksCandidate,
    },
    challengeDeltas: [],
  };
}

describe('Arena V2 P6 learning profile candidate', () => {
  it('closes single-match Duel, Race and Survival Grant mode facts before reduction', () => {
    for (const fixture of [
      modeOnlyGrant('grant.valid.duel-win', 'duel', 1, 1, 600),
      modeOnlyGrant('grant.valid.duel-loss', 'duel', 1, 0, null),
      modeOnlyGrant('grant.valid.race-win', 'race', 1, 1, 600),
      modeOnlyGrant('grant.valid.race-route-progress', 'race', 1, 0, null),
      modeOnlyGrant('grant.valid.race-no-finisher', 'race', 0, 0, null),
      modeOnlyGrant('grant.valid.survival-zero-ticks', 'survival', 1, 0, 0),
    ]) {
      expect(createArenaV2LearningGrantV1(DEFINITION, fixture).modeDelta)
        .toEqual(fixture.modeDelta);
    }

    for (const [fixture, expectedMessage] of [
      [
        modeOnlyGrant('grant.invalid.duel-no-completion', 'duel', 0, 0, null),
        /Duel每局必须计为有效完成/u,
      ],
      [
        modeOnlyGrant('grant.invalid.duel-win-without-best', 'duel', 1, 1, null),
        /Duel胜场与最快胜利候选/u,
      ],
      [
        modeOnlyGrant('grant.invalid.duel-best-without-win', 'duel', 1, 0, 600),
        /Duel胜场与最快胜利候选/u,
      ],
      [
        modeOnlyGrant('grant.invalid.race-best-without-completion', 'race', 0, 0, 600),
        /Race最快到达候选必须来自有效完成/u,
      ],
      [
        modeOnlyGrant('grant.invalid.race-win-without-best', 'race', 1, 1, null),
        /Race胜场与最快到达候选/u,
      ],
      [
        modeOnlyGrant('grant.invalid.race-best-without-win', 'race', 1, 0, 600),
        /Race胜场与最快到达候选/u,
      ],
      [
        modeOnlyGrant('grant.invalid.survival-no-completion', 'survival', 0, 0, null),
        /Survival每局必须计为有效完成/u,
      ],
      [
        modeOnlyGrant('grant.invalid.survival-win', 'survival', 1, 1, 600),
        /Survival胜场必须恒为0/u,
      ],
      [
        modeOnlyGrant('grant.invalid.survival-missing-best', 'survival', 1, 0, null),
        /Survival每局必须携带最长坚持候选/u,
      ],
    ] as const) {
      expect(() => createArenaV2LearningGrantV1(DEFINITION, fixture))
        .toThrow(expectedMessage);
    }
    expect(() => createArenaV2LearningGrantV1(
      DEFINITION,
      modeOnlyGrant('grant.invalid.generic-win-count', 'duel', 0, 1, 600),
    )).toThrow(/win不能超过completion/u);
  });

  it('rejects an invalid single-match Grant before history can mask it', () => {
    for (const [kind, historical, invalidGrant, expectedMessage] of [
      [
        'duel',
        profileWithModeRecord('duel', 2, 1, 600),
        modeOnlyGrant('grant.invalid.history-masked-duel-best', 'duel', 1, 0, 500),
        /Duel胜场与最快胜利候选/u,
      ],
      [
        'race',
        profileWithModeRecord('race', 2, 1, 600),
        modeOnlyGrant('grant.invalid.history-masked-race-best', 'race', 1, 0, 500),
        /Race胜场与最快到达候选/u,
      ],
      [
        'survival',
        profileWithModeRecord('survival', 2, 0, 600),
        modeOnlyGrant('grant.invalid.history-masked-survival-best', 'survival', 1, 0, null),
        /Survival每局必须携带最长坚持候选/u,
      ],
    ] as const) {
      const canonicalHistorical = createArenaV2LearningProfileV1(DEFINITION, historical);
      expect(() => advanceArenaV2LearningProfileV1(
        DEFINITION,
        canonicalHistorical,
        invalidGrant,
        canonicalHistorical.revision,
      )).toThrow(expectedMessage);
      expect(canonicalHistorical).toMatchObject({
        revision: 2,
        committedGrantIds: [],
        modeRecords: [{ kind, playCount: 2, completionCount: 2, bestPerformanceTicks: 600 }],
      });
    }
  });

  it('closes weapon contexts to the source mode before reduction', () => {
    const validFixtures = [
      {
        ...modeOnlyGrant('grant.valid.duel-contexts', 'duel', 1, 0, null),
        collectedWeaponDefinitionIds: ['weapon.a'],
        weaponDeltas: [{
          weaponDefinitionId: 'weapon.a', useCountDelta: 1,
          contextEvidence: [
            { context: 'ground', evidenceDelta: 1 },
            { context: 'duel-counterplay', evidenceDelta: 1 },
          ],
        }],
      },
      {
        ...modeOnlyGrant('grant.valid.race-contexts', 'race', 1, 0, null),
        collectedWeaponDefinitionIds: ['weapon.a'],
        weaponDeltas: [{
          weaponDefinitionId: 'weapon.a', useCountDelta: 1,
          contextEvidence: [
            { context: 'aerial', evidenceDelta: 1 },
            { context: 'edge', evidenceDelta: 1 },
          ],
        }],
      },
      {
        ...modeOnlyGrant('grant.valid.survival-contexts', 'survival', 1, 0, 600),
        collectedWeaponDefinitionIds: ['weapon.a'],
        weaponDeltas: [{
          weaponDefinitionId: 'weapon.a', useCountDelta: 1,
          contextEvidence: [
            { context: 'ground', evidenceDelta: 1 },
            { context: 'survival', evidenceDelta: 1 },
          ],
        }],
      },
      modeOnlyGrant('grant.valid.survival-empty-weapons', 'survival', 1, 0, 600),
    ];
    for (const fixture of validFixtures) {
      expect(createArenaV2LearningGrantV1(DEFINITION, fixture).grantId)
        .toBe(fixture.grantId);
    }

    const invalidFixtures = [
      {
        value: {
          ...modeOnlyGrant('grant.invalid.duel-survival-context', 'duel', 1, 0, null),
          collectedWeaponDefinitionIds: ['weapon.a'],
          weaponDeltas: [{
            weaponDefinitionId: 'weapon.a', useCountDelta: 1,
            contextEvidence: [{ context: 'survival', evidenceDelta: 1 }],
          }],
        },
        error: /非Survival模式不能携带生存情境/u,
      },
      {
        value: {
          ...modeOnlyGrant('grant.invalid.race-survival-context', 'race', 1, 0, null),
          collectedWeaponDefinitionIds: ['weapon.a'],
          weaponDeltas: [{
            weaponDefinitionId: 'weapon.a', useCountDelta: 1,
            contextEvidence: [{ context: 'survival', evidenceDelta: 1 }],
          }],
        },
        error: /非Survival模式不能携带生存情境/u,
      },
      {
        value: {
          ...modeOnlyGrant('grant.invalid.survival-missing-context', 'survival', 1, 0, 600),
          collectedWeaponDefinitionIds: ['weapon.a'],
          weaponDeltas: [{
            weaponDefinitionId: 'weapon.a', useCountDelta: 1,
            contextEvidence: [{ context: 'ground', evidenceDelta: 1 }],
          }],
        },
        error: /Survival武器事实必须携带生存情境/u,
      },
      {
        value: {
          ...modeOnlyGrant('grant.invalid.race-counterplay-context', 'race', 1, 0, null),
          collectedWeaponDefinitionIds: ['weapon.a'],
          weaponDeltas: [{
            weaponDefinitionId: 'weapon.a', useCountDelta: 1,
            contextEvidence: [{ context: 'duel-counterplay', evidenceDelta: 1 }],
          }],
        },
        error: /非Duel模式不能携带1v1反制情境/u,
      },
      {
        value: {
          ...modeOnlyGrant('grant.invalid.survival-counterplay-context', 'survival', 1, 0, 600),
          collectedWeaponDefinitionIds: ['weapon.a'],
          weaponDeltas: [{
            weaponDefinitionId: 'weapon.a', useCountDelta: 1,
            contextEvidence: [
              { context: 'duel-counterplay', evidenceDelta: 1 },
              { context: 'survival', evidenceDelta: 1 },
            ],
          }],
        },
        error: /非Duel模式不能携带1v1反制情境/u,
      },
    ];
    for (const fixture of invalidFixtures) {
      expect(() => createArenaV2LearningGrantV1(DEFINITION, fixture.value))
        .toThrow(fixture.error);
    }

    const historical = advanceArenaV2LearningProfileV1(
      DEFINITION,
      createArenaV2LearningProfileV1(DEFINITION),
      grant('grant.weapon-context.history'),
      0,
    ).profile;
    expect(() => advanceArenaV2LearningProfileV1(
      DEFINITION,
      historical,
      invalidFixtures[2]!.value,
      historical.revision,
    )).toThrow(/Survival武器事实必须携带生存情境/u);
    expect(historical).toMatchObject({
      revision: 1,
      committedGrantIds: ['grant.weapon-context.history'],
    });
  });

  it('closes one featured research weapon over every non-empty weapon fact set', () => {
    const valid = {
      ...modeOnlyGrant('grant.valid.multi-weapon-featured', 'duel', 1, 0, null),
      collectedWeaponDefinitionIds: ['weapon.b'],
      weaponDeltas: [
        {
          weaponDefinitionId: 'weapon.a', useCountDelta: 0,
          contextEvidence: [{ context: 'ground', evidenceDelta: 1 }],
        },
        {
          weaponDefinitionId: 'weapon.b', useCountDelta: 1,
          contextEvidence: [{ context: 'aerial', evidenceDelta: 1 }],
        },
      ],
    };
    expect(createArenaV2LearningGrantV1(DEFINITION, valid)).toMatchObject({
      collectedWeaponDefinitionIds: ['weapon.b'],
      weaponDeltas: [
        { weaponDefinitionId: 'weapon.a', useCountDelta: 0 },
        { weaponDefinitionId: 'weapon.b', useCountDelta: 1 },
      ],
    });

    const invalidFixtures = [
      {
        value: {
          ...modeOnlyGrant('grant.invalid.featured-without-context', 'duel', 1, 0, null),
          collectedWeaponDefinitionIds: ['weapon.a'],
          weaponDeltas: [{
            weaponDefinitionId: 'weapon.a', useCountDelta: 1, contextEvidence: [],
          }],
        },
        error: /每条武器事实必须携带至少一项/u,
      },
      {
        value: {
          ...modeOnlyGrant('grant.invalid.collection-without-weapons', 'duel', 1, 0, null),
          collectedWeaponDefinitionIds: ['weapon.a'],
        },
        error: /为空时不能携带主研究武器候选/u,
      },
      {
        value: {
          ...modeOnlyGrant('grant.invalid.weapons-without-collection', 'duel', 1, 0, null),
          weaponDeltas: [{
            weaponDefinitionId: 'weapon.a', useCountDelta: 0,
            contextEvidence: [{ context: 'ground', evidenceDelta: 1 }],
          }],
        },
        error: /非空时必须精确携带一把主研究武器候选/u,
      },
      {
        value: {
          ...modeOnlyGrant('grant.invalid.no-featured-evidence', 'duel', 1, 0, null),
          collectedWeaponDefinitionIds: ['weapon.a'],
          weaponDeltas: [{
            weaponDefinitionId: 'weapon.a', useCountDelta: 0,
            contextEvidence: [{ context: 'ground', evidenceDelta: 1 }],
          }],
        },
        error: /必须精确一条主研究证据且身份匹配/u,
      },
      {
        value: {
          ...modeOnlyGrant('grant.invalid.multiple-featured-evidence', 'duel', 1, 0, null),
          collectedWeaponDefinitionIds: ['weapon.a'],
          weaponDeltas: [
            {
              weaponDefinitionId: 'weapon.a', useCountDelta: 1,
              contextEvidence: [{ context: 'ground', evidenceDelta: 1 }],
            },
            {
              weaponDefinitionId: 'weapon.b', useCountDelta: 1,
              contextEvidence: [{ context: 'aerial', evidenceDelta: 1 }],
            },
          ],
        },
        error: /只能授予本局主研究武器/u,
      },
    ];
    for (const fixture of invalidFixtures) {
      expect(() => createArenaV2LearningGrantV1(DEFINITION, fixture.value))
        .toThrow(fixture.error);
    }

    const historical = advanceArenaV2LearningProfileV1(
      DEFINITION,
      createArenaV2LearningProfileV1(DEFINITION),
      grant('grant.featured.history'),
      0,
    ).profile;
    expect(() => advanceArenaV2LearningProfileV1(
      DEFINITION,
      historical,
      invalidFixtures[3]!.value,
      historical.revision,
    )).toThrow(/必须精确一条主研究证据且身份匹配/u);
    expect(historical).toMatchObject({
      revision: 1,
      committedGrantIds: ['grant.featured.history'],
    });
  });

  it('requires a ground or aerial effective-action context on every weapon fact', () => {
    const invalidFixtures = [
      {
        ...modeOnlyGrant('grant.invalid.edge-only-weapon', 'duel', 1, 0, null),
        collectedWeaponDefinitionIds: ['weapon.a'],
        weaponDeltas: [{
          weaponDefinitionId: 'weapon.a', useCountDelta: 1,
          contextEvidence: [{ context: 'edge', evidenceDelta: 1 }],
        }],
      },
      {
        ...modeOnlyGrant('grant.invalid.counterplay-only-weapon', 'duel', 1, 0, null),
        collectedWeaponDefinitionIds: ['weapon.a'],
        weaponDeltas: [{
          weaponDefinitionId: 'weapon.a', useCountDelta: 1,
          contextEvidence: [{ context: 'duel-counterplay', evidenceDelta: 1 }],
        }],
      },
      {
        ...modeOnlyGrant('grant.invalid.survival-only-weapon', 'survival', 1, 0, 600),
        collectedWeaponDefinitionIds: ['weapon.a'],
        weaponDeltas: [{
          weaponDefinitionId: 'weapon.a', useCountDelta: 1,
          contextEvidence: [{ context: 'survival', evidenceDelta: 1 }],
        }],
      },
    ];
    for (const fixture of invalidFixtures) {
      expect(() => createArenaV2LearningGrantV1(DEFINITION, fixture))
        .toThrow(/必须携带地面或空中基础情境证据/u);
    }

    const historical = advanceArenaV2LearningProfileV1(
      DEFINITION,
      createArenaV2LearningProfileV1(DEFINITION),
      grant('grant.base-context.history'),
      0,
    ).profile;
    expect(() => advanceArenaV2LearningProfileV1(
      DEFINITION,
      historical,
      invalidFixtures[2],
      historical.revision,
    )).toThrow(/必须携带地面或空中基础情境证据/u);
    expect(historical).toMatchObject({
      revision: 1,
      committedGrantIds: ['grant.base-context.history'],
    });
  });

  it('closes single-match map collection and mode-specific map performance facts', () => {
    const raceWin = modeOnlyGrant('grant.valid.race-map-finish', 'race', 1, 1, 600);
    const survival = modeOnlyGrant('grant.valid.survival-map-progress', 'survival', 1, 0, 0);
    for (const fixture of [
      {
        ...modeOnlyGrant('grant.valid.duel-map-progress', 'duel', 1, 0, null),
        mapSegmentDeltas: [{
          mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.a',
          completionEvidenceDelta: 1, raceFinishTicksCandidate: null,
          survivalTicksCandidate: null,
        }],
      },
      {
        ...raceWin,
        mapSegmentDeltas: [{
          mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.b',
          completionEvidenceDelta: 1, raceFinishTicksCandidate: 600,
          survivalTicksCandidate: null,
        }],
      },
      {
        ...modeOnlyGrant('grant.valid.race-map-route', 'race', 1, 0, null),
        mapSegmentDeltas: [{
          mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.a',
          completionEvidenceDelta: 1, raceFinishTicksCandidate: null,
          survivalTicksCandidate: null,
        }],
      },
      {
        ...survival,
        mapSegmentDeltas: [{
          mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.a',
          completionEvidenceDelta: 1, raceFinishTicksCandidate: null,
          survivalTicksCandidate: 0,
        }],
      },
    ]) {
      expect(createArenaV2LearningGrantV1(DEFINITION, fixture))
        .toMatchObject({ modeDelta: fixture.modeDelta });
    }

    const invalidFixtures = [
      {
        value: {
          ...modeOnlyGrant('grant.invalid.race-collect-without-completion', 'race', 0, 0, null),
          collectedMapDefinitionIds: ['map.a'],
        },
        error: /整图收藏资格及来源地图/u,
      },
      {
        value: {
          ...modeOnlyGrant('grant.invalid.duel-missing-map-collection', 'duel', 1, 0, null),
          collectedMapDefinitionIds: [],
        },
        error: /整图收藏资格及来源地图/u,
      },
      {
        value: {
          ...modeOnlyGrant('grant.invalid.duel-map-performance', 'duel', 1, 0, null),
          mapSegmentDeltas: [{
            mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.a',
            completionEvidenceDelta: 1, raceFinishTicksCandidate: 300,
            survivalTicksCandidate: null,
          }],
        },
        error: /Duel不能携带/u,
      },
      {
        value: {
          ...raceWin,
          grantId: 'grant.invalid.race-non-final-performance',
          mapSegmentDeltas: [{
            mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.a',
            completionEvidenceDelta: 1, raceFinishTicksCandidate: 600,
            survivalTicksCandidate: null,
          }],
        },
        error: /Race成绩候选只能记录.*最终段/u,
      },
      {
        value: {
          ...raceWin,
          grantId: 'grant.invalid.race-performance-drift',
          mapSegmentDeltas: [{
            mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.b',
            completionEvidenceDelta: 1, raceFinishTicksCandidate: 599,
            survivalTicksCandidate: null,
          }],
        },
        error: /Race段落成绩必须与模式最佳候选一致/u,
      },
      {
        value: {
          ...raceWin,
          grantId: 'grant.invalid.race-missing-final-performance',
          mapSegmentDeltas: [{
            mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.a',
            completionEvidenceDelta: 1, raceFinishTicksCandidate: null,
            survivalTicksCandidate: null,
          }],
        },
        error: /精确携带一个最终段成绩候选/u,
      },
      {
        value: {
          ...raceWin,
          grantId: 'grant.invalid.race-survival-performance',
          mapSegmentDeltas: [{
            mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.b',
            completionEvidenceDelta: 1, raceFinishTicksCandidate: 600,
            survivalTicksCandidate: 600,
          }],
        },
        error: /Race不能携带Survival/u,
      },
      {
        value: {
          ...survival,
          grantId: 'grant.invalid.survival-performance-drift',
          mapSegmentDeltas: [{
            mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.a',
            completionEvidenceDelta: 1, raceFinishTicksCandidate: null,
            survivalTicksCandidate: 1,
          }],
        },
        error: /Survival段落成绩必须全部存在/u,
      },
      {
        value: {
          ...survival,
          grantId: 'grant.invalid.survival-race-performance',
          mapSegmentDeltas: [{
            mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.a',
            completionEvidenceDelta: 1, raceFinishTicksCandidate: 0,
            survivalTicksCandidate: 0,
          }],
        },
        error: /Survival不能携带Race/u,
      },
    ];
    for (const fixture of invalidFixtures) {
      expect(() => createArenaV2LearningGrantV1(DEFINITION, fixture.value))
        .toThrow(fixture.error);
    }

    const historical = createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('race', 2, 1, 600),
    );
    expect(() => advanceArenaV2LearningProfileV1(
      DEFINITION,
      historical,
      invalidFixtures[4]!.value,
      historical.revision,
    )).toThrow(/Race段落成绩必须与模式最佳候选一致/u);
    expect(historical).toMatchObject({ revision: 2, committedGrantIds: [] });
  });

  it('closes challenge facts to the same Grant mode, map, segment and weapon evidence', () => {
    expect(createArenaV2LearningGrantV1(DEFINITION, {
      ...grant('grant.challenge.valid'),
      grantId: 'grant.challenge.valid',
    }).challengeDeltas).toEqual([{
      challengeDefinitionId: 'challenge.a',
      progressDelta: 1,
    }]);
    expect(createArenaV2LearningGrantV1(DEFINITION, {
      ...modeOnlyGrant('grant.challenge.non-main-weapon', 'survival', 1, 0, 600),
      collectedWeaponDefinitionIds: ['weapon.a'],
      weaponDeltas: [
        {
          weaponDefinitionId: 'weapon.a', useCountDelta: 1,
          contextEvidence: [
            { context: 'ground', evidenceDelta: 1 },
            { context: 'survival', evidenceDelta: 1 },
          ],
        },
        {
          weaponDefinitionId: 'weapon.b', useCountDelta: 0,
          contextEvidence: [
            { context: 'ground', evidenceDelta: 1 },
            { context: 'survival', evidenceDelta: 1 },
          ],
        },
      ],
      mapSegmentDeltas: [{
        mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.a',
        completionEvidenceDelta: 1, raceFinishTicksCandidate: null,
        survivalTicksCandidate: 600,
      }],
      challengeDeltas: [{ challengeDefinitionId: 'challenge.non-main', progressDelta: 1 }],
    }).weaponDeltas).toMatchObject([
      { weaponDefinitionId: 'weapon.a', useCountDelta: 1 },
      { weaponDefinitionId: 'weapon.b', useCountDelta: 0 },
    ]);

    const duelModeMismatch = {
      ...modeOnlyGrant('grant.invalid.challenge-mode', 'duel', 1, 0, null),
      collectedWeaponDefinitionIds: ['weapon.a'],
      weaponDeltas: [{
        weaponDefinitionId: 'weapon.a', useCountDelta: 1,
        contextEvidence: [{ context: 'ground', evidenceDelta: 1 }],
      }],
      mapSegmentDeltas: [{
        mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.a',
        completionEvidenceDelta: 1, raceFinishTicksCandidate: null,
        survivalTicksCandidate: null,
      }],
      challengeDeltas: [{ challengeDefinitionId: 'challenge.a', progressDelta: 1 }],
    };
    const survivalBase = modeOnlyGrant(
      'grant.invalid.challenge-evidence',
      'survival',
      1,
      0,
      600,
    );
    const invalidFixtures = [
      { value: duelModeMismatch, error: /模式限定与本局来源模式不一致/u },
      {
        value: {
          ...survivalBase,
          collectedWeaponDefinitionIds: ['weapon.a'],
          weaponDeltas: [{
            weaponDefinitionId: 'weapon.a', useCountDelta: 1,
            contextEvidence: [
              { context: 'ground', evidenceDelta: 1 },
              { context: 'survival', evidenceDelta: 1 },
            ],
          }],
          challengeDeltas: [{ challengeDefinitionId: 'challenge.a', progressDelta: 1 }],
        },
        error: /段落限定缺少本局精确地图段落证据/u,
      },
      {
        value: {
          ...survivalBase,
          mapSegmentDeltas: [{
            mapDefinitionId: 'map.a', segmentDefinitionId: 'segment.a',
            completionEvidenceDelta: 1, raceFinishTicksCandidate: null,
            survivalTicksCandidate: 600,
          }],
          challengeDeltas: [{ challengeDefinitionId: 'challenge.a', progressDelta: 1 }],
        },
        error: /武器限定缺少本局武器事实/u,
      },
    ];
    for (const fixture of invalidFixtures) {
      expect(() => createArenaV2LearningGrantV1(DEFINITION, fixture.value))
        .toThrow(fixture.error);
    }

    const historical = advanceArenaV2LearningProfileV1(
      DEFINITION,
      createArenaV2LearningProfileV1(DEFINITION),
      grant('grant.challenge.history'),
      0,
    ).profile;
    expect(() => advanceArenaV2LearningProfileV1(
      DEFINITION,
      historical,
      invalidFixtures[1]!.value,
      historical.revision,
    )).toThrow(/段落限定缺少本局精确地图段落证据/u);
    expect(historical).toMatchObject({ revision: 1, committedGrantIds: ['grant.challenge.history'] });
  });

  it('requires every non-empty map-segment Grant fact to carry current-match evidence', () => {
    const invalidGrant = {
      ...modeOnlyGrant('grant.invalid.history-masked-map-evidence', 'race', 1, 1, 600),
      mapSegmentDeltas: [{
        mapDefinitionId: 'map.a',
        segmentDefinitionId: 'segment.b',
        completionEvidenceDelta: 0,
        raceFinishTicksCandidate: 600,
        survivalTicksCandidate: null,
      }],
    };
    expect(() => createArenaV2LearningGrantV1(DEFINITION, invalidGrant))
      .toThrow(/每条地图段落事实必须携带本局完成证据/u);

    const historical = createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithMapSegmentRecord('segment.b', 1, 700, null),
    );
    expect(() => advanceArenaV2LearningProfileV1(
      DEFINITION,
      historical,
      invalidGrant,
      historical.revision,
    )).toThrow(/每条地图段落事实必须携带本局完成证据/u);
    expect(historical).toMatchObject({
      revision: 2,
      committedGrantIds: [],
      mapSegmentMastery: [{
        segmentDefinitionId: 'segment.b',
        completionEvidenceCount: 1,
        bestRaceFinishTicks: 700,
      }],
    });
  });

  it('commits collection/mastery/challenge atomically and accepts stale duplicate retry', () => {
    const initial = createArenaV2LearningProfileV1(DEFINITION);
    const first = advanceArenaV2LearningProfileV1(DEFINITION, initial, grant('grant.1'), 0);
    expect(first).toMatchObject({
      committed: true,
      duplicate: false,
      effectiveLearningProgress: true,
      profile: { revision: 1 },
    });
    expect(first.profile.collections).toEqual({
      weaponDefinitionIds: ['weapon.a'],
      mapDefinitionIds: ['map.a'],
    });
    expect(first.weaponContextEvidenceDeltas).toEqual([
      {
        weaponDefinitionId: 'weapon.a',
        context: 'ground',
        evidenceDelta: 1,
      },
      {
        weaponDefinitionId: 'weapon.a',
        context: 'survival',
        evidenceDelta: 1,
      },
    ]);
    expect(first.mapSegmentEvidenceDeltas).toEqual([{
      mapDefinitionId: 'map.a',
      segmentDefinitionId: 'segment.a',
      completionEvidenceDelta: 1,
    }]);
    expect(first.mapRouteEvidenceDeltas).toEqual([{
      mapDefinitionId: 'map.a',
      completionEvidenceDelta: 1,
    }]);
    expect(first.modeCompletionDeltas).toEqual([{
      modeDefinitionId: 'mode.survival',
      completionCountDelta: 1,
    }]);
    expect(first.challengeProgressDeltas).toEqual([{
      challengeDefinitionId: 'challenge.a',
      progressDelta: 1,
    }]);
    expect(first.profile).not.toHaveProperty('combatStats');
    const duplicate = advanceArenaV2LearningProfileV1(
      DEFINITION,
      first.profile,
      grant('grant.1'),
      0,
    );
    expect(duplicate).toMatchObject({ committed: false, duplicate: true });
    expect(duplicate.modeCompletionDeltas).toEqual([]);
    expect(duplicate.challengeProgressDeltas).toEqual([]);
    expect(duplicate.profile.revision).toBe(1);
  });

  it('retains proven route evidence before a race finish collects the whole map', () => {
    const initial = createArenaV2LearningProfileV1(DEFINITION);
    const routeOnlyGrant = createArenaV2LearningGrantV1(DEFINITION, {
      ...modeOnlyGrant('grant.race.route-before-collection', 'race', 0, 0, null),
      mapSegmentDeltas: [{
        mapDefinitionId: 'map.a',
        segmentDefinitionId: 'segment.a',
        completionEvidenceDelta: 1,
        raceFinishTicksCandidate: null,
        survivalTicksCandidate: null,
      }],
    });
    const outcome = advanceArenaV2LearningProfileV1(DEFINITION, initial, routeOnlyGrant, 0);
    expect(outcome.profile.collections.mapDefinitionIds).toEqual([]);
    expect(outcome.profile.mapSegmentMastery).toEqual([expect.objectContaining({
      mapDefinitionId: 'map.a',
      segmentDefinitionId: 'segment.a',
      completionEvidenceCount: 1,
    })]);
    expect(createArenaV2LearningProfileV1(DEFINITION, outcome.profile)).toEqual(outcome.profile);
  });

  it('persists Replay-bound grant identity and rejects another Replay for the same Result', () => {
    const unbound = grant('arena-learning:v1:deadbeef');
    const firstGrant = bindArenaV2LearningGrantToReplayEvidenceV1(
      DEFINITION,
      unbound,
      '11111111',
      '22222222',
    );
    expect(firstGrant.grantId).toBe('l1:deadbeef:11111111:22222222');
    const first = advanceArenaV2LearningProfileV1(
      DEFINITION,
      createArenaV2LearningProfileV1(DEFINITION),
      firstGrant,
      0,
    );
    expect(advanceArenaV2LearningProfileV1(
      DEFINITION,
      first.profile,
      firstGrant,
      0,
    )).toMatchObject({ committed: false, duplicate: true });
    const conflictingReplay = bindArenaV2LearningGrantToReplayEvidenceV1(
      DEFINITION,
      unbound,
      '33333333',
      '44444444',
    );
    expect(() => advanceArenaV2LearningProfileV1(
      DEFINITION,
      first.profile,
      conflictingReplay,
      first.profile.revision,
    )).toThrow(/不同Replay/u);
  });

  it('caps learning evidence at explicit thresholds without permanent combat fields', () => {
    const first = advanceArenaV2LearningProfileV1(
      DEFINITION,
      createArenaV2LearningProfileV1(DEFINITION),
      grant('grant.1'),
      0,
    );
    const second = advanceArenaV2LearningProfileV1(DEFINITION, first.profile, grant('grant.2'), 1);
    expect(second.profile.weaponMastery[0]?.contexts.find(({ context }) => (
      context === 'survival'
    ))).toMatchObject({ evidenceCount: 2, completedAtRevision: 2 });
    expect(second.profile.mapSegmentMastery[0]).toMatchObject({
      completionEvidenceCount: 2,
      completedAtRevision: 2,
      bestSurvivalTicks: 600,
    });
    expect(second.profile.modeRecords[0]).toMatchObject({
      completionCount: 2,
      completedAtRevision: 2,
    });
    expect(second.weaponContextEvidenceDeltas).toEqual([
      {
        weaponDefinitionId: 'weapon.a',
        context: 'ground',
        evidenceDelta: 1,
      },
      {
        weaponDefinitionId: 'weapon.a',
        context: 'survival',
        evidenceDelta: 1,
      },
    ]);
    expect(second.mapSegmentEvidenceDeltas).toEqual([{
      mapDefinitionId: 'map.a',
      segmentDefinitionId: 'segment.a',
      completionEvidenceDelta: 1,
    }]);
    expect(second.modeCompletionDeltas).toEqual([{
      modeDefinitionId: 'mode.survival',
      completionCountDelta: 1,
    }]);
    const capped = advanceArenaV2LearningProfileV1(
      DEFINITION,
      second.profile,
      grant('grant.3'),
      2,
    );
    expect(capped.weaponContextEvidenceDeltas).toEqual([]);
    expect(capped.mapSegmentEvidenceDeltas).toEqual([]);
    expect(capped.mapRouteEvidenceDeltas).toEqual([]);
    expect(capped.modeCompletionDeltas).toEqual([]);
    expect(capped.progressKinds).not.toContain('weapon-context');
    expect(capped.progressKinds).not.toContain('mode-mastery');
  });

  it('closes Duel, Race and Survival mode-record performance invariants', () => {
    expect(createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('duel', 2, 1, 600),
    ).modeRecords[0]).toMatchObject({ winCount: 1, bestPerformanceTicks: 600 });
    expect(createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('duel', 1, 0, null),
    ).modeRecords[0]).toMatchObject({ winCount: 0, bestPerformanceTicks: null });
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('duel', 1, 1, null),
    )).toThrow(/Duel胜场/u);
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('duel', 1, 0, 600),
    )).toThrow(/Duel胜场/u);

    expect(createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('race', 1, 0, null),
    ).modeRecords[0]).toMatchObject({ completionCount: 1, bestPerformanceTicks: null });
    expect(createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('race', 1, 1, 600),
    ).modeRecords[0]).toMatchObject({
      completionCount: 1,
      winCount: 1,
      bestPerformanceTicks: 600,
    });
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('race', 0, 0, 600),
    )).toThrow(/Race最快到达/u);
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('race', 1, 0, 600),
    )).toThrow(/Race胜场/u);
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('race', 1, 1, null),
    )).toThrow(/Race胜场/u);

    expect(createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('survival', 1, 0, 600),
    ).modeRecords[0]).toMatchObject({ completionCount: 1, bestPerformanceTicks: 600 });
    expect(createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('survival', 0, 0, null),
    ).modeRecords[0]).toMatchObject({ completionCount: 0, bestPerformanceTicks: null });
    expect(createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('race', 1, 0, null, 2),
    ).modeRecords[0]).toMatchObject({ playCount: 2, completionCount: 1 });
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('duel', 1, 1, 600, 2),
    )).toThrow(/Duel完成次数/u);
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('survival', 1, 0, 600, 2),
    )).toThrow(/Survival完成次数/u);
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('survival', 1, 0, null),
    )).toThrow(/Survival有效完成/u);
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('survival', 0, 0, 600),
    )).toThrow(/Survival有效完成/u);
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithModeRecord('survival', 1, 1, 600),
    )).toThrow(/Survival胜场/u);
  });

  it('closes map-segment Race and Survival performance invariants', () => {
    expect(createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithMapSegmentRecord('segment.a', 1, null, null),
    ).mapSegmentMastery[0]).toMatchObject({
      segmentDefinitionId: 'segment.a',
      completionEvidenceCount: 1,
      bestRaceFinishTicks: null,
      bestSurvivalTicks: null,
    });
    expect(createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithMapSegmentRecord('segment.a', 1, null, 600),
    ).mapSegmentMastery[0]).toMatchObject({
      segmentDefinitionId: 'segment.a',
      bestRaceFinishTicks: null,
      bestSurvivalTicks: 600,
    });
    expect(createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithMapSegmentRecord('segment.b', 1, 480, 600),
    ).mapSegmentMastery[0]).toMatchObject({
      segmentDefinitionId: 'segment.b',
      bestRaceFinishTicks: 480,
      bestSurvivalTicks: 600,
    });
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithMapSegmentRecord('segment.b', 0, 480, null),
    )).toThrow(/Race最佳成绩.*完成证据/u);
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithMapSegmentRecord('segment.a', 1, 480, null),
    )).toThrow(/Race最佳成绩.*最终段/u);
    expect(() => createArenaV2LearningProfileV1(
      DEFINITION,
      profileWithMapSegmentRecord('segment.a', 0, null, 600),
    )).toThrow(/Survival最佳成绩.*完成证据/u);
  });

  it('rejects an invalid reducer candidate before publishing a next Profile', () => {
    const initial = createArenaV2LearningProfileV1(DEFINITION);
    expect(() => advanceArenaV2LearningProfileV1(
      DEFINITION,
      initial,
      modeOnlyGrant('grant.invalid.duel-best-without-win', 'duel', 1, 0, 600),
      0,
    )).toThrow(/Duel胜场/u);
    expect(initial).toMatchObject({ revision: 0, modeRecords: [] });

    for (const [invalidGrant, expectedMessage] of [
      [
        modeOnlyGrant('grant.invalid.duel-incomplete-play', 'duel', 0, 0, null),
        /Duel每局必须计为有效完成/u,
      ],
      [
        modeOnlyGrant('grant.invalid.survival-incomplete-play', 'survival', 0, 0, null),
        /Survival每局必须计为有效完成/u,
      ],
    ] as const) {
      expect(() => advanceArenaV2LearningProfileV1(
        DEFINITION,
        initial,
        invalidGrant,
        0,
      )).toThrow(expectedMessage);
    }
    expect(initial).toMatchObject({ revision: 0, modeRecords: [] });

    const legalRaceCompletion = advanceArenaV2LearningProfileV1(
      DEFINITION,
      initial,
      modeOnlyGrant('grant.valid.race-completion-without-best', 'race', 1, 0, null),
      0,
    );
    expect(legalRaceCompletion.profile.modeRecords[0]).toMatchObject({
      kind: 'race',
      completionCount: 1,
      winCount: 0,
      bestPerformanceTicks: null,
    });

    for (const invalidGrant of [
      modeOnlyGrant('grant.invalid.race-best-without-win', 'race', 1, 0, 600),
      modeOnlyGrant('grant.invalid.race-win-without-best', 'race', 1, 1, null),
      modeOnlyGrant('grant.invalid.survival-win', 'survival', 1, 1, 600),
    ]) {
      expect(() => advanceArenaV2LearningProfileV1(
        DEFINITION,
        initial,
        invalidGrant,
        0,
      )).toThrow(/Race胜场|Survival胜场/u);
    }
    expect(initial).toMatchObject({ revision: 0, modeRecords: [] });

    const collectedMapProfile = createArenaV2LearningProfileV1(DEFINITION, {
      ...initial,
      collections: { weaponDefinitionIds: [], mapDefinitionIds: ['map.a'] },
    });
    expect(() => advanceArenaV2LearningProfileV1(
      DEFINITION,
      collectedMapProfile,
      {
        ...modeOnlyGrant('grant.invalid.race-segment-best-without-evidence', 'race', 1, 1, 600),
        mapSegmentDeltas: [{
          mapDefinitionId: 'map.a',
          segmentDefinitionId: 'segment.b',
          completionEvidenceDelta: 0,
          raceFinishTicksCandidate: 480,
          survivalTicksCandidate: null,
        }],
      },
      0,
    )).toThrow(/每条地图段落事实必须携带本局完成证据/u);
    expect(collectedMapProfile).toMatchObject({ revision: 0, mapSegmentMastery: [] });
  });

  it('hashes envelopes and refuses future envelope/payload/content versions', () => {
    const profile = createArenaV2LearningProfileV1(DEFINITION);
    const envelope = createArenaV2LearningProfileSaveEnvelopeV1(DEFINITION, profile);
    expect(envelope.payloadHash).toMatch(/^[0-9a-f]{8}$/);
    for (const future of [
      { ...envelope, schemaVersion: ARENA_V2_LEARNING_PROFILE_SAVE_ENVELOPE_V1_SCHEMA_VERSION + 1 },
      { ...envelope, payloadSchemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION + 1 },
      { ...envelope, profileDefinitionContentVersion: DEFINITION.contentVersion + 1 },
    ]) {
      expect(() => assertArenaV2LearningProfileSaveEnvelopeV1HasNoFutureSchema(
        DEFINITION,
        future,
      )).toThrow(ArenaV2LearningProfileFutureSchemaError);
    }
  });
});
