import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { projectArenaV2MapRouteResearchMilestoneV1 } from '@number-strategy-jump/arena-product-progression';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_COLLECTION_PROGRESS_COMPONENT_SET_CANDIDATE_V1,
  ARENA_V2_A6_COLLECTION_PROGRESS_LIFECYCLE_STATE_V1,
  ArenaV2CollectionProgressComponentSetCandidateV1,
  type ArenaV2A6CollectionNextGoalIdentityV1,
  type ArenaV2A6CollectionProgressComponentInputV1,
} from '../src/arena-v2-collection-progress-component-set-candidate-v1.js';

const TEST_WEAPON_IDS = Object.freeze(Array.from(
  { length: 20 },
  (_, index) => `test.weapon.generated-${String(index + 1).padStart(2, '0')}`,
));
const TEST_MAP_DIRECTORY = Object.freeze([
  Object.freeze({
    mapDefinitionId: 'test.map.generated-01',
    segmentDefinitionIds: Object.freeze(Array.from(
      { length: 12 },
      (_, index) => `test.map.generated-01.segment-${String(index + 1).padStart(2, '0')}`,
    )),
  }),
  Object.freeze({
    mapDefinitionId: 'test.map.generated-02',
    segmentDefinitionIds: Object.freeze(Array.from(
      { length: 8 },
      (_, index) => `test.map.generated-02.segment-${String(index + 1).padStart(2, '0')}`,
    )),
  }),
] as const);
const TARGET_WEAPON_ID = TEST_WEAPON_IDS[3]!;
const TARGET_MAP_ID = TEST_MAP_DIRECTORY[1].mapDefinitionId;
const TARGET_SEGMENT_ID = TEST_MAP_DIRECTORY[1].segmentDefinitionIds[0]!;
const MODE_ID = 'test.mode.generated-survival';
const CHALLENGE_ID = 'test.challenge.generated-cross-01';

function withProjectionHash<Authority extends Readonly<Record<string, unknown>>>(
  authority: Authority,
): Authority & Readonly<{ contentHash: string }> {
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function collectionContent(options: Readonly<{
  firstWeaponDisplayName?: string;
  firstMapDisplayName?: string;
}> = {}) {
  const weapons = TEST_WEAPON_IDS.map(
    (weaponDefinitionId, index) => ({
      weaponDefinitionId,
      collectionOrder: index + 1,
      displayName: index === 0
        ? options.firstWeaponDisplayName ?? '冲锋盾'
        : `武器${String(index + 1).padStart(2, '0')}`,
      learningFocus: `学习重点${index + 1}`,
      coreVerb: `战斗动词${index + 1}`,
    }),
  );
  const maps = TEST_MAP_DIRECTORY.map((map, mapIndex) => ({
    mapDefinitionId: map.mapDefinitionId,
    displayName: mapIndex === 0
      ? options.firstMapDisplayName ?? 'KZ纵深路线'
      : 'KZ折返路线',
    participantRange: '1–16人',
    segments: map.segmentDefinitionIds.map((segmentDefinitionId, segmentIndex) => ({
      segmentDefinitionId,
      ordinal: segmentIndex + 1,
      displayName: `路线段${mapIndex + 1}-${segmentIndex + 1}`,
      learningFocus: `路线学习重点${mapIndex + 1}-${segmentIndex + 1}`,
      segmentKind: '跳跃路线',
      survivalRole: '选择',
    })),
  }));
  return withProjectionHash({
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    weapons,
    maps,
    sourceContentHash: '1234abcd',
  });
}

function profileIdentity(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    profileSchemaVersion: 1,
    profileDefinitionId: 'arena-v2.learning-profile.candidate.v1',
    profileDefinitionContentVersion: 5,
    profileId: 'arena-v2-local-learning-profile.candidate.v1',
    profileRevision: 7,
    ...overrides,
  };
}

function progressFacts(options: Readonly<{
  allComplete?: boolean;
  weaponOverrides?: Readonly<Record<number, Readonly<Record<string, unknown>>>>;
  mapOverrides?: Readonly<Record<number, Readonly<Record<string, unknown>>>>;
}> = {}) {
  const allComplete = options.allComplete === true;
  const weapons = TEST_WEAPON_IDS.map(
    (weaponDefinitionId, index) => ({
      weaponDefinitionId,
      collected: allComplete || index < 3,
      collectionEvidenceCount: allComplete || index < 3 ? 120 : 0,
      collectionEvidenceTarget: 120,
      completedContextCount: allComplete ? 5 : index === 0 ? 2 : 0,
      mastered: allComplete,
      ...(options.weaponOverrides?.[index] ?? {}),
    }),
  );
  const currentMainResearch = weapons.reduce((total, weapon) => (
    total + Number(weapon.collectionEvidenceCount)
  ), 0);
  return {
    schemaVersion: 1,
    weapons,
    maps: TEST_MAP_DIRECTORY.map((map, index) => {
      const overrides = options.mapOverrides?.[index] ?? {};
      const completedSegmentCount = typeof overrides.completedSegmentCount === 'number'
        ? overrides.completedSegmentCount
        : allComplete
          ? map.segmentDefinitionIds.length
          : index === 0 ? 4 : 0;
      return {
        mapDefinitionId: map.mapDefinitionId,
        collected: allComplete || index === 0,
        completedSegmentCount,
        totalSegmentCount: map.segmentDefinitionIds.length,
        routeResearch: projectArenaV2MapRouteResearchMilestoneV1({
          evidenceCount: Math.min(completedSegmentCount, map.segmentDefinitionIds.length),
          completedSegmentCount: Math.min(completedSegmentCount, map.segmentDefinitionIds.length),
          segmentCount: map.segmentDefinitionIds.length,
          evidencePerSegmentTarget: 1,
        }),
        ...overrides,
      };
    }),
    weaponJourney: {
      currentMainResearch,
      targetMainResearch: 2_400,
      remainingMainResearch: 2_400 - currentMainResearch,
      collectedWeaponCount: weapons.filter(({ collected }) => collected === true).length,
      weaponCount: 20,
      averageMatchMinutesAssumption: 5,
      estimatedRemainingMinutes: (2_400 - currentMainResearch) * 5,
      estimateKind: 'capacity-hypothesis-not-player-promise',
    },
  };
}

function weaponGoal(
  overrides: Readonly<Record<string, unknown>> = {},
): ArenaV2A6CollectionNextGoalIdentityV1 {
  return {
    schemaVersion: 1,
    profileRevision: 7,
    kind: 'collect-weapon',
    goalId: `collect-weapon:${TARGET_WEAPON_ID}`,
    weaponDefinitionId: TARGET_WEAPON_ID,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
    ...overrides,
  } as ArenaV2A6CollectionNextGoalIdentityV1;
}

function mapGoal(
  overrides: Readonly<Record<string, unknown>> = {},
): ArenaV2A6CollectionNextGoalIdentityV1 {
  return {
    schemaVersion: 1,
    profileRevision: 7,
    kind: 'collect-map',
    goalId: `collect-map:${TARGET_MAP_ID}`,
    weaponDefinitionId: null,
    mapDefinitionId: TARGET_MAP_ID,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
    ...overrides,
  } as ArenaV2A6CollectionNextGoalIdentityV1;
}

function catalogCompleteGoal(): ArenaV2A6CollectionNextGoalIdentityV1 {
  return {
    schemaVersion: 1,
    profileRevision: 7,
    kind: 'catalog-complete',
    goalId: 'catalog-complete',
    weaponDefinitionId: null,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
  };
}

function activeLearningCompleteGoal(): ArenaV2A6CollectionNextGoalIdentityV1 {
  return {
    ...catalogCompleteGoal(),
    goalId: 'active-learning-complete',
  };
}

function modeFirstCompletionGoal(
  overrides: Readonly<Record<string, unknown>> = {},
): ArenaV2A6CollectionNextGoalIdentityV1 {
  return {
    schemaVersion: 1,
    profileRevision: 7,
    kind: 'mode-mastery',
    goalId: `mode-first-completion:${MODE_ID}`,
    weaponDefinitionId: null,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: MODE_ID,
    challengeDefinitionId: null,
    context: null,
    ...overrides,
  } as ArenaV2A6CollectionNextGoalIdentityV1;
}

function input(
  overrides: Readonly<Record<string, unknown>> = {},
): ArenaV2A6CollectionProgressComponentInputV1 {
  return {
    schemaVersion: 1,
    epochId: 'collection-epoch-1',
    tick: 20,
    locale: 'zh-CN',
    sourceState: 'ready',
    profileIdentity: profileIdentity(),
    collectionContent: collectionContent(),
    progressFacts: progressFacts(),
    nextGoalIdentity: weaponGoal(),
    diagnosticCode: null,
    observedProfileSchemaVersion: 1,
    reducedMotion: false,
    muted: false,
    decorativeAssetState: 'ready',
    ...overrides,
  } as unknown as ArenaV2A6CollectionProgressComponentInputV1;
}

function unavailableInput(
  sourceState: 'loading' | 'empty' | 'error' | 'future-profile',
): ArenaV2A6CollectionProgressComponentInputV1 {
  return input({
    sourceState,
    profileIdentity: null,
    progressFacts: null,
    nextGoalIdentity: null,
    diagnosticCode: sourceState === 'empty'
      ? 'profile-empty'
      : sourceState === 'error'
        ? 'profile-read-failed'
        : sourceState === 'future-profile'
          ? 'unsupported-profile-version'
          : null,
    observedProfileSchemaVersion: sourceState === 'future-profile' ? 2 : null,
    decorativeAssetState: 'missing',
  });
}

function consumeOnce(value: ArenaV2A6CollectionProgressComponentInputV1) {
  const view = new ArenaV2CollectionProgressComponentSetCandidateV1({ epochId: value.epochId });
  return { view, snapshot: view.consume(value) };
}

describe('Arena V2 A6.2 collection progress component set candidate', () => {
  it('projects the exact 20-weapon and 2-map directories in stable order', () => {
    const { snapshot } = consumeOnce(input());
    expect(snapshot.weaponIndex).toMatchObject({
      screenId: 'weapon-index',
      directoryCount: 20,
      itemCount: 20,
      addsPrimaryAction: false,
      nestedCards: false,
    });
    expect(snapshot.mapIndex).toMatchObject({
      screenId: 'map-index',
      directoryCount: 2,
      itemCount: 2,
      addsPrimaryAction: false,
      nestedCards: false,
    });
    expect(snapshot.weaponIndex.items.map(({ definitionId }) => definitionId))
      .toEqual(TEST_WEAPON_IDS);
    expect(snapshot.mapIndex.items.map(({ definitionId }) => definitionId))
      .toEqual(TEST_MAP_DIRECTORY.map(({ mapDefinitionId }) => mapDefinitionId));
    expect(snapshot.weaponIndex.items[0]).toMatchObject({
      displayName: '冲锋盾',
      collected: true,
      collectionResearch: {
        labelText: '主研究',
        current: 120,
        target: 120,
        stage: '主研究完成',
        nextMilestone: null,
      },
      mastery: { completed: 2, total: 5, complete: false, valueText: '2/5' },
      semantic: { collectionText: '已收藏', colorIsNeverSoleSignal: true },
    });
    expect(snapshot.weaponIndex.items[3]?.collectionResearch).toMatchObject({
      labelText: '主研究',
      current: 0,
      target: 120,
      stage: '初识',
      nextMilestone: { threshold: 30, remainingMainResearch: 30 },
      milestones: [
        { threshold: 30, reached: false },
        { threshold: 60, reached: false },
        { threshold: 90, reached: false },
        { threshold: 120, reached: false },
      ],
    });
    expect(snapshot.weaponIndex.items[0]?.action).toMatchObject({
      intentId: `arena.v2.selection.weapon.${encodeURIComponent(
        TEST_WEAPON_IDS[0]!,
      )}`,
      screenId: 'weapon-index',
      minimumTouchTargetCssPixels: 48,
      mutatesProfileOrRules: false,
    });
    expect(snapshot.mapIndex.items[0]?.action.intentId).toBe(
      `arena.v2.selection.map.${encodeURIComponent(
        TEST_MAP_DIRECTORY[0].mapDefinitionId,
      )}`,
    );
    expect(snapshot.mapIndex.items[0]?.routeResearch).toMatchObject({
      evidenceCount: 4,
      evidenceTarget: 12,
      stage: '熟悉',
      milestones: [
        { percentage: 25, reached: true },
        { percentage: 50, reached: false },
        { percentage: 75, reached: false },
        { percentage: 100, reached: false },
      ],
      nextMilestonePercentage: 50,
      remainingEvidenceCount: 2,
    });
    expect(ARENA_V2_A6_COLLECTION_PROGRESS_COMPONENT_SET_CANDIDATE_V1).toMatchObject({
      pageCountAdded: 0,
      primaryActionCountAdded: 0,
      ownsProfileWrites: false,
      ownsRewardResolution: false,
      ownsNextGoalSelection: false,
      usesCurrencyStoreRedDotsOrTaskList: false,
    });
  });

  it('marks exactly one weapon or map from the already-selected upstream goal', () => {
    const weapon = consumeOnce(input()).snapshot;
    expect(weapon.currentGoalItem).toEqual({
      kind: 'weapon',
      definitionId: TARGET_WEAPON_ID,
      sourceGoalId: `collect-weapon:${TARGET_WEAPON_ID}`,
    });
    expect([...weapon.weaponIndex.items, ...weapon.mapIndex.items]
      .filter(({ isCurrentUniqueGoal }) => isCurrentUniqueGoal)).toHaveLength(1);

    const map = consumeOnce(input({ nextGoalIdentity: mapGoal() })).snapshot;
    expect(map.currentGoalItem).toMatchObject({ kind: 'map', definitionId: TARGET_MAP_ID });
    expect(map.mapIndex.items.find(({ definitionId }) => definitionId === TARGET_MAP_ID))
      .toMatchObject({ isCurrentUniqueGoal: true });

    const cross = consumeOnce(input({
      nextGoalIdentity: weaponGoal({
        kind: 'cross-challenge',
        goalId: `cross-challenge:${CHALLENGE_ID}`,
        mapDefinitionId: TARGET_MAP_ID,
        modeDefinitionId: null,
        challengeDefinitionId: CHALLENGE_ID,
      }),
    })).snapshot;
    expect(cross.currentGoalItem).toMatchObject({ kind: 'weapon', definitionId: TARGET_WEAPON_ID });

    const modeOwnedCross = consumeOnce(input({
      nextGoalIdentity: weaponGoal({
        kind: 'cross-challenge',
        goalId: `cross-challenge:${CHALLENGE_ID}`,
        mapDefinitionId: TARGET_MAP_ID,
        modeDefinitionId: MODE_ID,
        challengeDefinitionId: CHALLENGE_ID,
      }),
    })).snapshot;
    expect(modeOwnedCross.currentGoalItem).toBeNull();
    expect([...modeOwnedCross.weaponIndex.items, ...modeOwnedCross.mapIndex.items]
      .some(({ isCurrentUniqueGoal }) => isCurrentUniqueGoal)).toBe(false);
  });

  it('accepts the P6.16 first-completion identity without inventing a collection target', () => {
    const snapshot = consumeOnce(input({
      nextGoalIdentity: modeFirstCompletionGoal(),
    })).snapshot;
    expect(snapshot.currentGoalItem).toBeNull();
    expect([...snapshot.weaponIndex.items, ...snapshot.mapIndex.items]
      .some(({ isCurrentUniqueGoal }) => isCurrentUniqueGoal)).toBe(false);

    expect(() => consumeOnce(input({
      nextGoalIdentity: modeFirstCompletionGoal({
        goalId: `mode-first-completion:future.${MODE_ID}`,
      }),
    }))).toThrow(/mode-mastery目标身份不闭合/);
    expect(() => consumeOnce(input({
      nextGoalIdentity: modeFirstCompletionGoal({ kind: 'record-improvement' }),
    }))).toThrow(/record-improvement目标身份不闭合/);
  });

  it('keeps catalog-complete free of collection targets and rejects incomplete completion claims', () => {
    const complete = consumeOnce(input({
      progressFacts: progressFacts({ allComplete: true }),
      nextGoalIdentity: catalogCompleteGoal(),
    })).snapshot;
    expect(complete.currentGoalItem).toBeNull();
    expect([...complete.weaponIndex.items, ...complete.mapIndex.items]
      .some(({ isCurrentUniqueGoal }) => isCurrentUniqueGoal)).toBe(false);
    expect(() => consumeOnce(input({ nextGoalIdentity: catalogCompleteGoal() })))
      .toThrow(/catalog-complete与未完成的收藏目录矛盾/);
    expect(() => consumeOnce(input({
      progressFacts: progressFacts({
        allComplete: true,
        weaponOverrides: {
          7: {
            collected: false,
            collectionEvidenceCount: 0,
            completedContextCount: 0,
            mastered: false,
          },
        },
      }),
      nextGoalIdentity: catalogCompleteGoal(),
    }))).toThrow(/catalog-complete与未完成的收藏目录矛盾/);
    expect(() => consumeOnce(input({
      progressFacts: progressFacts({
        allComplete: true,
        mapOverrides: { 1: { completedSegmentCount: 7 } },
      }),
      nextGoalIdentity: catalogCompleteGoal(),
    }))).toThrow(/catalog-complete与未完成的收藏目录矛盾/);
  });

  it('keeps active-pool completion free of item targets without claiming full completion', () => {
    const snapshot = consumeOnce(input({
      progressFacts: progressFacts({
        mapOverrides: {
          0: {
            collected: true,
            completedSegmentCount: TEST_MAP_DIRECTORY[0]!.segmentDefinitionIds.length,
          },
          1: {
            collected: true,
            completedSegmentCount: TEST_MAP_DIRECTORY[1]!.segmentDefinitionIds.length,
          },
        },
      }),
      nextGoalIdentity: activeLearningCompleteGoal(),
    })).snapshot;
    expect(snapshot.currentGoalItem).toBeNull();
    expect([...snapshot.weaponIndex.items, ...snapshot.mapIndex.items]
      .some(({ isCurrentUniqueGoal }) => isCurrentUniqueGoal)).toBe(false);
    expect(() => consumeOnce(input({
      nextGoalIdentity: activeLearningCompleteGoal(),
    }))).toThrow(/active-learning-complete与未完成的共用地图进度矛盾/);
  });

  it('registers mobile and desktop contracts without claiming screenshot evidence', () => {
    const { snapshot } = consumeOnce(input({
      reducedMotion: true,
      muted: true,
      decorativeAssetState: 'missing',
      collectionContent: collectionContent({
        firstWeaponDisplayName: '一把名称很长但仍必须保留完整辅助技术文本的候选武器'.repeat(5),
        firstMapDisplayName: 'A deliberately long localized map name that must not shift the collection grid '.repeat(4),
      }),
    }));
    expect(snapshot.layouts).toEqual([
      expect.objectContaining({
        viewport: '390x844', weaponColumns: 2, mapColumns: 1,
        itemActionMinimumCssPixels: 48, nameMaximumLines: 2,
        screenshotEvidence: 'not-run',
      }),
      expect.objectContaining({
        viewport: '1440x900', weaponColumns: 4, mapColumns: 2,
        itemActionMinimumCssPixels: 48, nameMaximumLines: 1,
        screenshotEvidence: 'not-run',
      }),
    ]);
    expect(snapshot.accessibility).toMatchObject({
      motionPolicy: 'none-static-state-change',
      muted: true,
      visualDependsOnAudioPlayback: false,
      silentEquivalentComplete: true,
      longTextPreservedForAssistiveTechnology: true,
    });
    expect(snapshot.fallback).toEqual({
      decorativeAssetMissing: true,
      usesTextShapePatternFallback: true,
      programmaticAssetClaimsApproval: false,
    });
  });

  it('shows explicit loading, empty, error and future-profile states without stale items', () => {
    for (const state of ['loading', 'empty', 'error', 'future-profile'] as const) {
      const snapshot = consumeOnce(unavailableInput(state)).snapshot;
      expect(snapshot.sourceState).toBe(state);
      expect(snapshot.profileIdentity).toBeNull();
      expect(snapshot.currentGoalItem).toBeNull();
      expect(snapshot.weaponIndex.items).toEqual([]);
      expect(snapshot.mapIndex.items).toEqual([]);
      expect(snapshot.weaponIndex.stateMessage).not.toBeNull();
      expect(snapshot.mapIndex.stateMessage).not.toBeNull();
    }
  });

  it('rejects contradictory weapon and map progress before exposing a snapshot', () => {
    expect(() => consumeOnce(input({
      progressFacts: progressFacts({
        weaponOverrides: { 0: { completedContextCount: 4, mastered: true } },
      }),
    }))).toThrow(/收藏与五情境完整状态矛盾/);
    expect(() => consumeOnce(input({
      progressFacts: progressFacts({
        mapOverrides: { 0: { completedSegmentCount: 13 } },
      }),
    }))).toThrow(/completedSegmentCount/);
    const routeBeforeCollection = consumeOnce(input({
      progressFacts: progressFacts({
        mapOverrides: { 1: { collected: false, completedSegmentCount: 1 } },
      }),
    })).snapshot;
    expect(routeBeforeCollection.mapIndex.items[1]).toMatchObject({
      collected: false,
      mastery: { completed: 1 },
    });
    const importedCollectedResearch = consumeOnce(input({
      progressFacts: progressFacts({
        weaponOverrides: { 3: { collected: true, collectionEvidenceCount: 60 } },
      }),
    })).snapshot;
    expect(importedCollectedResearch.currentGoalItem).toMatchObject({
      kind: 'weapon',
      definitionId: TARGET_WEAPON_ID,
    });
    expect(importedCollectedResearch.weaponIndex.items[3]).toMatchObject({
      collected: true,
      collectionResearch: {
        current: 60,
        target: 120,
        complete: false,
        stage: '熟练',
      },
      isCurrentUniqueGoal: true,
    });
    expect(() => consumeOnce(input({
      progressFacts: progressFacts({
        weaponOverrides: { 3: { collected: true, collectionEvidenceCount: 120 } },
      }),
    }))).toThrow(/collect-weapon与武器收藏\/熟练事实矛盾/);
  });

  it('accepts a different valid upstream directory as the first versioned input', () => {
    const valid = collectionContent();
    const substitutedWeapons = valid.weapons.map((weapon, index) => ({
      ...weapon,
      weaponDefinitionId: `alternate.weapon.generated-${String(index + 1).padStart(2, '0')}`,
    }));
    const substitutedAuthority = {
      ...valid,
      weapons: substitutedWeapons,
    } as Record<string, unknown>;
    delete substitutedAuthority.contentHash;
    const snapshot = consumeOnce(input({
      collectionContent: withProjectionHash(substitutedAuthority),
      progressFacts: {
        ...progressFacts(),
        weapons: progressFacts().weapons.map((weapon, index) => ({
          ...weapon,
          weaponDefinitionId: substitutedWeapons[index]!.weaponDefinitionId,
        })),
      },
      nextGoalIdentity: weaponGoal({
        goalId: `collect-weapon:${substitutedWeapons[3]!.weaponDefinitionId}`,
        weaponDefinitionId: substitutedWeapons[3]!.weaponDefinitionId,
      }),
    })).snapshot;
    expect(snapshot.weaponIndex.items.map(({ definitionId }) => definitionId))
      .toEqual(substitutedWeapons.map(({ weaponDefinitionId }) => weaponDefinitionId));
  });

  it('rejects duplicate IDs, order holes, count drift, progress mismatch and forged hash', () => {
    const valid = collectionContent();
    const duplicateIdentityAuthority = {
      ...valid,
      maps: valid.maps.map((map, index) => index === 0
        ? { ...map, mapDefinitionId: valid.weapons[0]!.weaponDefinitionId }
        : map),
    } as Record<string, unknown>;
    delete duplicateIdentityAuthority.contentHash;
    expect(() => consumeOnce(input({
      collectionContent: withProjectionHash(duplicateIdentityAuthority),
    }))).toThrow(/内容目录身份.*重复/);

    const weaponOrderHoleAuthority = {
      ...valid,
      weapons: valid.weapons.map((weapon, index) => index === 4
        ? { ...weapon, collectionOrder: 6 }
        : weapon),
    } as Record<string, unknown>;
    delete weaponOrderHoleAuthority.contentHash;
    expect(() => consumeOnce(input({
      collectionContent: withProjectionHash(weaponOrderHoleAuthority),
    }))).toThrow(/稳定顺序漂移/);

    const segmentOrdinalHoleAuthority = {
      ...valid,
      maps: valid.maps.map((map, mapIndex) => mapIndex === 0
        ? {
          ...map,
          segments: map.segments.map((segment, segmentIndex) => segmentIndex === 3
            ? { ...segment, ordinal: 5 }
            : segment),
        }
        : map),
    } as Record<string, unknown>;
    delete segmentOrdinalHoleAuthority.contentHash;
    expect(() => consumeOnce(input({
      collectionContent: withProjectionHash(segmentOrdinalHoleAuthority),
    }))).toThrow(/段落稳定顺序漂移/);

    const weaponCountDriftAuthority = {
      ...valid,
      weapons: valid.weapons.slice(0, -1),
    } as Record<string, unknown>;
    delete weaponCountDriftAuthority.contentHash;
    expect(() => consumeOnce(input({
      collectionContent: withProjectionHash(weaponCountDriftAuthority),
    }))).toThrow(/精确包含20把武器/);

    const mapCountDriftAuthority = {
      ...valid,
      maps: valid.maps.slice(0, -1),
    } as Record<string, unknown>;
    delete mapCountDriftAuthority.contentHash;
    expect(() => consumeOnce(input({
      collectionContent: withProjectionHash(mapCountDriftAuthority),
    }))).toThrow(/精确包含2张地图/);

    const segmentDriftAuthority = {
      ...valid,
      maps: valid.maps.map((map, index) => index === 0
        ? { ...map, segments: map.segments.slice(0, -1) }
        : map),
    } as Record<string, unknown>;
    delete segmentDriftAuthority.contentHash;
    expect(() => consumeOnce(input({
      collectionContent: withProjectionHash(segmentDriftAuthority),
    }))).toThrow(/地图段落总数必须精确为20/);
    expect(() => consumeOnce(input({
      progressFacts: progressFacts({
        weaponOverrides: { 4: { weaponDefinitionId: TEST_WEAPON_IDS[5] } },
      }),
    }))).toThrow(/身份或稳定顺序漂移/);
    expect(() => consumeOnce(input({
      progressFacts: progressFacts({
        mapOverrides: { 1: { mapDefinitionId: TEST_MAP_DIRECTORY[0].mapDefinitionId } },
      }),
    }))).toThrow(/身份或稳定顺序漂移/);
    expect(() => consumeOnce(input({
      collectionContent: { ...valid, contentHash: 'deadbeef' },
    }))).toThrow(/内容hash漂移/);
  });

  it('rejects same-tick conflict, revision rollback and identity/content drift before commit', () => {
    const view = new ArenaV2CollectionProgressComponentSetCandidateV1({ epochId: 'collection-epoch-1' });
    const firstInput = input();
    const first = view.consume(firstInput);
    expect(view.consume(firstInput)).toBe(first);
    expect(() => view.consume(input({ muted: true }))).toThrow(/同tick/);
    expect(view.getSnapshot()).toBe(first);
    expect(() => view.consume(input({ tick: 19 }))).toThrow(/tick回退/);
    expect(() => view.consume(input({
      tick: 21,
      profileIdentity: profileIdentity({ profileId: 'other-profile', profileRevision: 8 }),
      nextGoalIdentity: weaponGoal({ profileRevision: 8 }),
    }))).toThrow(/Profile身份漂移/);
    expect(() => view.consume(input({
      tick: 21,
      profileIdentity: profileIdentity({ profileRevision: 6 }),
      nextGoalIdentity: weaponGoal({ profileRevision: 6 }),
    }))).toThrow(/revision回退/);
    const differentContent = collectionContent({ firstWeaponDisplayName: '同目录但文案revision改变' });
    expect(() => view.consume(input({ tick: 21, collectionContent: differentContent })))
      .toThrow(/内容目录identity\/hash漂移/);
    expect(view.getSnapshot()).toBe(first);
  });

  it('rejects getter, thenable, future field and future schema without committing state', () => {
    const getterInput = input() as unknown as Record<string, unknown>;
    let getterCalls = 0;
    Object.defineProperty(getterInput, 'tick', {
      configurable: true,
      enumerable: true,
      get: () => { getterCalls += 1; return 20; },
    });
    const view = new ArenaV2CollectionProgressComponentSetCandidateV1({ epochId: 'collection-epoch-1' });
    expect(() => view.consume(getterInput)).toThrow(/getter\/setter/);
    expect(getterCalls).toBe(0);
    expect(() => view.consume({ ...input(), then: () => undefined })).toThrow(/thenable/);
    expect(() => view.consume({ ...input(), futureField: true })).toThrow(/exact-key/);
    expect(() => view.consume({ ...input(), schemaVersion: 2 })).toThrow(/schema/);
    expect(view.getSnapshot()).toBeNull();
  });

  it('freezes the stored snapshot, resets only on a new epoch and destroys idempotently', () => {
    const view = new ArenaV2CollectionProgressComponentSetCandidateV1({ epochId: 'collection-epoch-1' });
    const snapshot = view.consume(input());
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.weaponIndex.items)).toBe(true);
    expect(Object.isFrozen(snapshot.weaponIndex.items[0])).toBe(true);
    expect(Reflect.set(snapshot.weaponIndex.items[0]!, 'displayName', '篡改')).toBe(false);
    expect(view.getSnapshot()).toBe(snapshot);
    expect(() => view.resetPresentationEpoch({ epochId: 'collection-epoch-1' }))
      .toThrow(/必须使用新epochId/);
    view.resetPresentationEpoch({ epochId: 'collection-epoch-2' });
    expect(view.getSnapshot()).toBeNull();
    expect(view.consume(input({ epochId: 'collection-epoch-2', tick: 0 }))).toMatchObject({
      epochId: 'collection-epoch-2',
      tick: 0,
    });
    view.destroy();
    view.destroy();
    expect(view.state).toBe(ARENA_V2_A6_COLLECTION_PROGRESS_LIFECYCLE_STATE_V1.DESTROYED);
    expect(() => view.getSnapshot()).toThrow(/destroyed/);
    expect(() => view.consume(input())).toThrow(/destroyed/);
  });

  it('rejects malformed segment goal identity instead of marking a guessed map', () => {
    expect(() => consumeOnce(input({
      nextGoalIdentity: mapGoal({
        kind: 'map-segment',
        goalId: `map-segment:${TARGET_MAP_ID}:${TARGET_SEGMENT_ID}`,
        segmentDefinitionId: 'test.segment.generated-not-owned-by-map',
      }),
    }))).toThrow(/segment不属于指定map/);
  });
});
