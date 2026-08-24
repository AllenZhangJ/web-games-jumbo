import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { projectArenaV2MapRouteResearchMilestoneV1 } from '@number-strategy-jump/arena-product-progression';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_COMPOSITION_CANDIDATE_V1,
  ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_LIFECYCLE_V1,
  ArenaV2CollectionMasteryDetailCompositionCandidateV1,
  type ArenaV2A6CollectionMasteryDetailInputV1,
  type ArenaV2A6DetailProgressFactsV1,
  type ArenaV2A6P5DetailContentEnvelopeV1,
} from '../src/arena-v2-collection-mastery-detail-composition-candidate-v1.js';

const TEST_WEAPONS = Object.freeze(Array.from(
  { length: 20 },
  (_, index) => `test.a6.3.weapon-${String(index + 1).padStart(2, '0')}`,
));
const TEST_MAPS = Object.freeze([
  Object.freeze({
    mapDefinitionId: 'test.a6.3.map-01',
    segmentDefinitionIds: Object.freeze(Array.from(
      { length: 12 },
      (_, index) => `test.a6.3.map-01.segment-${String(index + 1).padStart(2, '0')}`,
    )),
  }),
  Object.freeze({
    mapDefinitionId: 'test.a6.3.map-02',
    segmentDefinitionIds: Object.freeze(Array.from(
      { length: 8 },
      (_, index) => `test.a6.3.map-02.segment-${String(index + 1).padStart(2, '0')}`,
    )),
  }),
] as const);
const WEAPON_ID = TEST_WEAPONS[0]!;
const MAP_ID = TEST_MAPS[0].mapDefinitionId;
const MAP_TARGET_SEGMENT_ID = TEST_MAPS[0].segmentDefinitionIds[4]!;

const WEAPON_CONTEXTS = Object.freeze([
  'ground', 'aerial', 'edge', 'duel-counterplay', 'survival',
] as const);

const WEAPON_FIELDS = Object.freeze([
  'range-coverage', 'timing-risk', 'ground-aerial', 'counter-inputs', 'map-consequences',
] as const);
const MAP_FIELDS = Object.freeze([
  'route-goal', 'hazard-summary', 'full-route', 'weapon-consequences',
] as const);

function withHash(authority: Readonly<Record<string, unknown>>, label: string) {
  return { ...authority, contentHash: createDeterministicDataHash(authority, label) };
}

function collectionContent(options: Readonly<{ firstWeaponName?: string; firstMapName?: string }> = {}) {
  const weapons = TEST_WEAPONS.map((weaponDefinitionId, index) => ({
    weaponDefinitionId,
    collectionOrder: index + 1,
    displayName: index === 0
      ? options.firstWeaponName ?? '测试重锤详情'
      : `测试武器${String(index + 1).padStart(2, '0')}`,
    learningFocus: `测试学习重点${index + 1}`,
    coreVerb: `测试战斗动词${index + 1}`,
  }));
  const maps = TEST_MAPS.map((map, mapIndex) => ({
    mapDefinitionId: map.mapDefinitionId,
    displayName: mapIndex === 0
      ? options.firstMapName ?? '测试KZ纵深地图详情'
      : '测试KZ折返地图详情',
    participantRange: '1–16人',
    segments: map.segmentDefinitionIds.map((segmentDefinitionId, segmentIndex) => ({
      segmentDefinitionId,
      ordinal: segmentIndex + 1,
      displayName: `测试路线段${mapIndex + 1}-${segmentIndex + 1}`,
      learningFocus: `测试路线重点${mapIndex + 1}-${segmentIndex + 1}`,
      segmentKind: '测试跳跃路线',
      survivalRole: '测试选择',
    })),
  }));
  return withHash({
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    weapons,
    maps,
    sourceContentHash: '1234abcd',
  }, 'Arena V2 Information Collection Content Projection V1');
}

function profileIdentity(revision = 7) {
  return {
    profileSchemaVersion: 1,
    profileDefinitionId: 'arena-v2.learning-profile.candidate.v1',
    profileDefinitionContentVersion: 5,
    profileId: 'test.a6.3.profile',
    profileRevision: revision,
  };
}

function progressFacts(options: Readonly<{
  weaponCompleted?: number;
  mapCompleted?: number;
  mapCollected?: boolean;
}> = {}) {
  const weaponCompleted = options.weaponCompleted ?? 2;
  const mapCompleted = options.mapCompleted ?? 4;
  const mapCollected = options.mapCollected ?? true;
  const weapons = TEST_WEAPONS.map((weaponDefinitionId, index) => ({
    weaponDefinitionId,
    collected: index === 0,
    collectionEvidenceCount: index === 0 ? 9 : 0,
    collectionEvidenceTarget: 120,
    completedContextCount: index === 0 ? weaponCompleted : 0,
    mastered: index === 0 && weaponCompleted === 5,
  }));
  return {
    schemaVersion: 1,
    weapons,
    maps: TEST_MAPS.map((map, index) => {
      const completedSegmentCount = index === 0 ? mapCompleted : 0;
      const evidenceCount = index === 0
        ? completedSegmentCount * 2 + (completedSegmentCount < map.segmentDefinitionIds.length ? 1 : 0)
        : 0;
      return {
        mapDefinitionId: map.mapDefinitionId,
        collected: index === 0 && mapCollected,
        completedSegmentCount,
        totalSegmentCount: map.segmentDefinitionIds.length,
        routeResearch: projectArenaV2MapRouteResearchMilestoneV1({
          evidenceCount,
          completedSegmentCount,
          segmentCount: map.segmentDefinitionIds.length,
          evidencePerSegmentTarget: 2,
        }),
      };
    }),
    weaponJourney: {
      currentMainResearch: 9,
      targetMainResearch: 2_400,
      remainingMainResearch: 2_391,
      collectedWeaponCount: 1,
      weaponCount: 20,
      averageMatchMinutesAssumption: 5,
      estimatedRemainingMinutes: 11_955,
      estimateKind: 'capacity-hypothesis-not-player-promise',
    },
  };
}

function weaponGoal(revision = 7) {
  return {
    schemaVersion: 1,
    profileRevision: revision,
    kind: 'weapon-context',
    goalId: `weapon-context:${WEAPON_ID}:edge`,
    weaponDefinitionId: WEAPON_ID,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: 'edge',
  };
}

function mapGoal(revision = 7) {
  return {
    schemaVersion: 1,
    profileRevision: revision,
    kind: 'map-segment',
    goalId: `map-segment:${MAP_ID}:${MAP_TARGET_SEGMENT_ID}`,
    weaponDefinitionId: null,
    mapDefinitionId: MAP_ID,
    segmentDefinitionId: MAP_TARGET_SEGMENT_ID,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
  };
}

function collectionProgressInput(
  kind: 'weapon' | 'map',
  overrides: Readonly<Record<string, unknown>> = {},
) {
  return {
    schemaVersion: 1,
    epochId: `test.a6.3.${kind}.epoch-1`,
    tick: 20,
    locale: 'zh-CN',
    sourceState: 'ready',
    profileIdentity: profileIdentity(),
    collectionContent: collectionContent(),
    progressFacts: progressFacts(),
    nextGoalIdentity: kind === 'weapon' ? weaponGoal() : mapGoal(),
    diagnosticCode: null,
    observedProfileSchemaVersion: 1,
    reducedMotion: false,
    muted: false,
    decorativeAssetState: 'ready',
    ...overrides,
  };
}

function p5DetailContent(kind: 'weapon' | 'map', overrides: Readonly<Record<string, unknown>> = {}) {
  const fieldIds = kind === 'weapon' ? WEAPON_FIELDS : MAP_FIELDS;
  const targetDefinitionId = kind === 'weapon' ? WEAPON_ID : MAP_ID;
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    screenId: `${kind}-detail`,
    targetDefinitionId,
    sourceContentHash: '1234abcd',
    fieldValues: fieldIds.map((fieldId, index) => ({
      fieldId,
      labelMessageId: `test.a6.3.field.${fieldId}`,
      valueText: index === 0
        ? `${kind} detail content with a deliberately long English and 中文 label `.repeat(4)
        : `测试P5详情字段${fieldId}`,
      accessibilityText: `完整读取测试P5详情字段${fieldId}`,
      fixedWidthNumeric: fieldId === 'timing-risk' || fieldId === 'route-goal',
    })),
    ...overrides,
  } as Record<string, unknown>;
  return withHash(
    authority,
    'Arena V2 A6.3 P5 Detail Content Envelope V1',
  ) as ArenaV2A6P5DetailContentEnvelopeV1;
}

function detailProgress(kind: 'weapon' | 'map', revision = 7): ArenaV2A6DetailProgressFactsV1 {
  if (kind === 'weapon') {
    return {
      schemaVersion: 1,
      ownerId: 'p6-profile',
      kind: 'weapon',
      profileRevision: revision,
      weaponDefinitionId: WEAPON_ID,
      collected: true,
      useCount: 9,
      collectionEvidenceTarget: 120,
      contexts: WEAPON_CONTEXTS.map((context, index) => ({
        context,
        evidenceCount: index < 3 ? 1 : 0,
        completedAtRevision: index < 2 ? 5 + index : null,
      })),
    };
  }
  return {
    schemaVersion: 1,
    ownerId: 'p6-profile',
    kind: 'map',
    profileRevision: revision,
    mapDefinitionId: MAP_ID,
    routeResearch: projectArenaV2MapRouteResearchMilestoneV1({
      evidenceCount: 9,
      completedSegmentCount: 4,
      segmentCount: TEST_MAPS[0].segmentDefinitionIds.length,
      evidencePerSegmentTarget: 2,
    }),
    segments: TEST_MAPS[0].segmentDefinitionIds.map((segmentDefinitionId, index) => ({
      segmentDefinitionId,
      completionEvidenceCount: index < 4 ? 2 : index === 4 ? 1 : 0,
      completedAtRevision: index < 4 ? 2 + index : null,
    })),
  };
}

function action(kind: 'weapon' | 'map', overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    intentId: kind === 'weapon'
      ? 'use-selected-weapon-next-match'
      : 'use-selected-map-next-match',
    labelMessageId: kind === 'weapon'
      ? 'arena.v2.action.use-weapon-next-match'
      : 'arena.v2.action.use-map-next-match',
    labelText: '下局使用',
    accessibilityText: `下局使用当前${kind === 'weapon' ? '武器' : '地图'}`,
    targetDefinitionId: kind === 'weapon' ? WEAPON_ID : MAP_ID,
    enabled: true,
    disabledReason: null,
    ...overrides,
  };
}

function input(
  kind: 'weapon' | 'map',
  overrides: Readonly<Record<string, unknown>> = {},
): ArenaV2A6CollectionMasteryDetailInputV1 {
  return {
    schemaVersion: 1,
    collectionProgressInput: collectionProgressInput(kind),
    selection: {
      kind,
      screenId: `${kind}-detail`,
      targetDefinitionId: kind === 'weapon' ? WEAPON_ID : MAP_ID,
    },
    p5DetailContent: p5DetailContent(kind),
    detailProgressFacts: detailProgress(kind),
    existingSelectionAction: action(kind),
    ...overrides,
  } as ArenaV2A6CollectionMasteryDetailInputV1;
}

function unavailableInput(
  kind: 'weapon' | 'map',
  sourceState: 'loading' | 'empty' | 'error' | 'future-profile',
): ArenaV2A6CollectionMasteryDetailInputV1 {
  return input(kind, {
    collectionProgressInput: collectionProgressInput(kind, {
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
    }),
    detailProgressFacts: null,
  });
}

function consumeOnce(kind: 'weapon' | 'map', value = input(kind)) {
  const epochId = value.collectionProgressInput.epochId;
  const component = new ArenaV2CollectionMasteryDetailCompositionCandidateV1({ epochId });
  return { component, snapshot: component.consume(value) };
}

describe('Arena V2 A6.3 collection mastery detail composition candidate', () => {
  it('composes weapon-detail from P5 fields, A6.2 summary and five P6 context facts', () => {
    const { snapshot } = consumeOnce('weapon');
    expect(snapshot).toMatchObject({
      status: 'production-unreachable',
      hardGate: false,
      defaultSurfaceWired: false,
      validationStatus: 'not-run',
      screenId: 'weapon-detail',
      targetDefinitionId: WEAPON_ID,
      summary: {
        collected: true,
        completed: 2,
        total: 5,
        valueText: '2/5',
        mainResearchStage: '已收藏',
        nextMainResearchMilestoneText: '下一里程碑 30/120，还需21次主研究',
      },
    });
    expect(snapshot.p5DetailFields.map(({ fieldId }) => fieldId)).toEqual(WEAPON_FIELDS);
    expect(snapshot.rows).toHaveLength(5);
    expect(snapshot.rows.map(({ identity }) => identity)).toEqual(WEAPON_CONTEXTS);
    expect(snapshot.rows.map(({ state }) => state)).toEqual([
      'complete', 'complete', 'in-progress', 'not-started', 'not-started',
    ]);
    expect(snapshot.currentGoalMarker).toEqual({
      scope: 'weapon-context',
      identity: 'edge',
      sourceGoalId: `weapon-context:${WEAPON_ID}:edge`,
    });
    expect(snapshot.rows.filter(({ isCurrentUniqueGoal }) => isCurrentUniqueGoal)).toHaveLength(1);
    expect(snapshot.selectionAction).toMatchObject({
      intentId: 'use-selected-weapon-next-match',
      labelMessageId: 'arena.v2.action.use-weapon-next-match',
      labelText: '下局使用',
      targetDefinitionId: WEAPON_ID,
      enabled: true,
      minimumTouchTargetCssPixels: 48,
      mutatesProfileOrRules: false,
    });
  });

  it('composes map-detail one-to-one with the selected P5 map segment directory', () => {
    const { snapshot } = consumeOnce('map');
    expect(snapshot).toMatchObject({
      screenId: 'map-detail',
      summary: {
        collected: true,
        completed: 4,
        total: 12,
        valueText: '4/12',
        routeResearch: {
          evidenceCount: 9,
          evidenceTarget: 24,
          stage: '熟悉',
          nextMilestonePercentage: 50,
          remainingEvidenceCount: 3,
        },
        nextMapRouteResearchMilestoneText: '下一里程碑50%，还需3次有效路线练习',
      },
    });
    expect(snapshot.p5DetailFields.map(({ fieldId }) => fieldId)).toEqual(MAP_FIELDS);
    expect(snapshot.rows.map(({ identity }) => identity))
      .toEqual(TEST_MAPS[0].segmentDefinitionIds);
    expect(snapshot.rows.filter(({ state }) => state === 'complete')).toHaveLength(4);
    expect(snapshot.currentGoalMarker).toEqual({
      scope: 'map-segment',
      identity: MAP_TARGET_SEGMENT_ID,
      sourceGoalId: `map-segment:${MAP_ID}:${MAP_TARGET_SEGMENT_ID}`,
    });
    expect(snapshot.rows.filter(({ isCurrentUniqueGoal }) => isCurrentUniqueGoal)).toHaveLength(1);
  });

  it('shows proven map-route learning before the whole map is collected', () => {
    const uncollectedFacts = progressFacts({ mapCompleted: 1, mapCollected: false });
    const snapshot = consumeOnce('map', input('map', {
      collectionProgressInput: collectionProgressInput('map', {
        progressFacts: uncollectedFacts,
      }),
      detailProgressFacts: {
        ...detailProgress('map'),
        routeResearch: projectArenaV2MapRouteResearchMilestoneV1({
          evidenceCount: 3,
          completedSegmentCount: 1,
          segmentCount: TEST_MAPS[0].segmentDefinitionIds.length,
          evidencePerSegmentTarget: 2,
        }),
        segments: TEST_MAPS[0].segmentDefinitionIds.map((segmentDefinitionId, index) => ({
          segmentDefinitionId,
          completionEvidenceCount: index === 0 ? 2 : index === 1 ? 1 : 0,
          completedAtRevision: index === 0 ? 7 : null,
        })),
      },
    })).snapshot;
    expect(snapshot.summary).toMatchObject({ collected: false, completed: 1 });
    expect(snapshot.rows[0]).toMatchObject({ state: 'complete', evidenceCount: 2 });
  });

  it('keeps broad upstream goals as one detail-level marker without selecting a new target', () => {
    const broadGoal = {
      schemaVersion: 1,
      profileRevision: 7,
      kind: 'collect-map',
      goalId: `collect-map:${MAP_ID}`,
      weaponDefinitionId: null,
      mapDefinitionId: MAP_ID,
      segmentDefinitionId: null,
      modeDefinitionId: null,
      challengeDefinitionId: null,
      context: null,
    };
    const { snapshot } = consumeOnce('map', input('map', {
      collectionProgressInput: collectionProgressInput('map', {
        progressFacts: progressFacts({ mapCompleted: 0, mapCollected: false }),
        nextGoalIdentity: broadGoal,
      }),
      detailProgressFacts: {
        ...detailProgress('map'),
        routeResearch: projectArenaV2MapRouteResearchMilestoneV1({
          evidenceCount: 0,
          completedSegmentCount: 0,
          segmentCount: TEST_MAPS[0].segmentDefinitionIds.length,
          evidencePerSegmentTarget: 2,
        }),
        segments: TEST_MAPS[0].segmentDefinitionIds.map((segmentDefinitionId) => ({
          segmentDefinitionId,
          completionEvidenceCount: 0,
          completedAtRevision: null,
        })),
      },
    }));
    expect(snapshot.currentGoalMarker).toEqual({
      scope: 'detail', identity: MAP_ID, sourceGoalId: `collect-map:${MAP_ID}`,
    });
    expect(snapshot.summary?.isCurrentUniqueGoal).toBe(true);
    expect(snapshot.rows.some(({ isCurrentUniqueGoal }) => isCurrentUniqueGoal)).toBe(false);
  });

  it('rejects summary/detail count mismatch and selected detail identity drift', () => {
    expect(() => consumeOnce('weapon', input('weapon', {
      detailProgressFacts: {
        ...detailProgress('weapon'),
        contexts: WEAPON_CONTEXTS.map((context, index) => ({
          context,
          evidenceCount: index < 4 ? 1 : 0,
          completedAtRevision: index < 3 ? 4 + index : null,
        })),
      },
    }))).toThrow(/completedContextCount与P6逐情境明细不一致/);

    expect(() => consumeOnce('map', input('map', {
      detailProgressFacts: {
        ...detailProgress('map'),
        segments: TEST_MAPS[0].segmentDefinitionIds.map((segmentDefinitionId, index) => ({
          segmentDefinitionId: index === 3 ? TEST_MAPS[0].segmentDefinitionIds[4]! : segmentDefinitionId,
          completionEvidenceCount: index < 5 ? 1 : 0,
          completedAtRevision: index < 4 ? 2 + index : null,
        })),
      },
    }))).toThrow(/身份或目录顺序漂移/);

    expect(() => consumeOnce('weapon', input('weapon', {
      selection: {
        kind: 'weapon',
        screenId: 'weapon-detail',
        targetDefinitionId: 'test.a6.3.weapon-not-in-directory',
      },
    }))).toThrow(/不属于已验证P5 collectionContent/);
  });

  it('rejects same-count detail completion-set drift at one Profile revision', () => {
    const component = new ArenaV2CollectionMasteryDetailCompositionCandidateV1({
      epochId: 'test.a6.3.weapon.epoch-1',
    });
    const first = component.consume(input('weapon'));
    const changedContexts = WEAPON_CONTEXTS.map((context, index) => ({
      context,
      evidenceCount: index < 3 ? 1 : 0,
      completedAtRevision: index === 1 || index === 2 ? 5 + index : null,
    }));
    expect(() => component.consume(input('weapon', {
      collectionProgressInput: collectionProgressInput('weapon', { tick: 21 }),
      detailProgressFacts: { ...detailProgress('weapon'), contexts: changedContexts },
    }))).toThrow(/相同Profile revision与selection的明细身份或完成集合漂移/);
    expect(component.getSnapshot()).toBe(first);
  });

  it('allows higher-tick A-to-B-to-A browsing and mutable action availability', () => {
    const epochId = 'test.a6.3.browse.epoch-1';
    const component = new ArenaV2CollectionMasteryDetailCompositionCandidateV1({ epochId });
    const weaponA = input('weapon', {
      collectionProgressInput: collectionProgressInput('weapon', { epochId }),
    });
    expect(component.consume(weaponA).screenId).toBe('weapon-detail');

    const mapB = input('map', {
      collectionProgressInput: collectionProgressInput('map', {
        epochId,
        tick: 21,
        nextGoalIdentity: weaponGoal(),
      }),
    });
    expect(component.consume(mapB)).toMatchObject({
      screenId: 'map-detail',
      targetDefinitionId: MAP_ID,
    });

    const weaponAReturn = input('weapon', {
      collectionProgressInput: collectionProgressInput('weapon', { epochId, tick: 22 }),
    });
    expect(component.consume(weaponAReturn)).toMatchObject({
      screenId: 'weapon-detail',
      targetDefinitionId: WEAPON_ID,
    });

    const actionChanged = input('weapon', {
      collectionProgressInput: collectionProgressInput('weapon', { epochId, tick: 23 }),
      existingSelectionAction: action('weapon', {
        enabled: false,
        disabledReason: '当前选择暂不可用',
      }),
    });
    expect(component.consume(actionChanged).selectionAction).toMatchObject({
      labelText: '下局使用',
      targetDefinitionId: WEAPON_ID,
      sourceEnabled: false,
      enabled: false,
      disabledReason: '当前选择暂不可用',
    });
  });

  it('rejects same-target detail hash drift and same-tick selection switching', () => {
    const epochId = 'test.a6.3.selection-guard.epoch-1';
    const component = new ArenaV2CollectionMasteryDetailCompositionCandidateV1({ epochId });
    const first = component.consume(input('weapon', {
      collectionProgressInput: collectionProgressInput('weapon', { epochId }),
    }));
    const originalP5 = p5DetailContent('weapon');
    const changedP5Authority = {
      ...originalP5,
      fieldValues: originalP5.fieldValues.map((field, index) => index === 0
        ? { ...field, valueText: `${field.valueText}发生同目标漂移` }
        : field),
    } as Record<string, unknown>;
    delete changedP5Authority.contentHash;
    expect(() => component.consume(input('weapon', {
      collectionProgressInput: collectionProgressInput('weapon', { epochId, tick: 21 }),
      p5DetailContent: withHash(
        changedP5Authority,
        'Arena V2 A6.3 P5 Detail Content Envelope V1',
      ),
    }))).toThrow(/同一详情目标的P5 content hash漂移/);
    expect(component.getSnapshot()).toBe(first);

    const sameTickComponent = new ArenaV2CollectionMasteryDetailCompositionCandidateV1({ epochId });
    sameTickComponent.consume(input('weapon', {
      collectionProgressInput: collectionProgressInput('weapon', { epochId }),
    }));
    expect(() => sameTickComponent.consume(input('map', {
      collectionProgressInput: collectionProgressInput('map', {
        epochId,
        nextGoalIdentity: weaponGoal(),
      }),
    }))).toThrow(/同tick输入携带冲突事实/);
  });

  it('rejects forged P5 hash, wrong field order and a different source catalog revision', () => {
    expect(() => consumeOnce('weapon', input('weapon', {
      p5DetailContent: { ...p5DetailContent('weapon'), contentHash: 'deadbeef' },
    }))).toThrow(/P5详情内容hash漂移/);

    const wrongOrder = p5DetailContent('weapon');
    const wrongOrderAuthority = {
      ...wrongOrder,
      fieldValues: [wrongOrder.fieldValues[1], wrongOrder.fieldValues[0], ...wrongOrder.fieldValues.slice(2)],
    } as Record<string, unknown>;
    delete wrongOrderAuthority.contentHash;
    expect(() => consumeOnce('weapon', input('weapon', {
      p5DetailContent: withHash(
        wrongOrderAuthority,
        'Arena V2 A6.3 P5 Detail Content Envelope V1',
      ),
    }))).toThrow(/身份或顺序漂移/);

    expect(() => consumeOnce('map', input('map', {
      p5DetailContent: p5DetailContent('map', { sourceContentHash: '87654321' }),
    }))).toThrow(/未绑定A6.2所用P5目录revision/);
  });

  it('shows loading, empty, error and future-profile without stale mastery rows', () => {
    for (const state of ['loading', 'empty', 'error', 'future-profile'] as const) {
      const snapshot = consumeOnce('weapon', unavailableInput('weapon', state)).snapshot;
      expect(snapshot.sourceState).toBe(state);
      expect(snapshot.profileIdentity).toBeNull();
      expect(snapshot.summary).toBeNull();
      expect(snapshot.rows).toEqual([]);
      expect(snapshot.currentGoalMarker).toBeNull();
      expect(snapshot.stateMessage).not.toBeNull();
      expect(snapshot.selectionAction).toMatchObject({
        labelText: '下局使用',
        targetDefinitionId: WEAPON_ID,
        sourceEnabled: true,
        enabled: false,
      });
    }
  });

  it('registers both layout contracts and non-color reduced-motion/silent fallback', () => {
    const longContent = collectionContent({
      firstWeaponName: '一把名称非常长但必须保留完整辅助技术文本的测试武器'.repeat(8),
    });
    const { snapshot } = consumeOnce('weapon', input('weapon', {
      collectionProgressInput: collectionProgressInput('weapon', {
        collectionContent: longContent,
        reducedMotion: true,
        muted: true,
        decorativeAssetState: 'missing',
      }),
      p5DetailContent: p5DetailContent('weapon'),
    }));
    expect(snapshot.layouts).toEqual([
      expect.objectContaining({
        viewport: '390x844', safeAreaRequired: true, rowColumns: 1,
        actionMinimumTouchTargetCssPixels: 48, labelMaximumLines: 2,
        screenshotEvidence: 'not-run',
      }),
      expect.objectContaining({
        viewport: '1440x900', safeAreaRequired: true, rowColumns: 2,
        actionMinimumTouchTargetCssPixels: 48, labelMaximumLines: 1,
        screenshotEvidence: 'not-run',
      }),
    ]);
    expect(snapshot.accessibility).toMatchObject({
      motionPolicy: 'none-static-state-change',
      muted: true,
      visualDependsOnAudioPlayback: false,
      silentEquivalentComplete: true,
    });
    expect(snapshot.rows.every(({ semantic }) => semantic.colorIsNeverSoleSignal)).toBe(true);
    expect(snapshot.fallback).toEqual({
      decorativeAssetMissing: true,
      usesTextShapePatternFallback: true,
      programmaticAssetClaimsApproval: false,
    });
  });

  it('rejects future fields, getters, thenables, same-tick conflict and revision rollback', () => {
    expect(() => consumeOnce('weapon', { ...input('weapon'), futureField: true } as never))
      .toThrow(/exact-key/);
    expect(() => consumeOnce('weapon', { ...input('weapon'), then: () => undefined } as never))
      .toThrow(/thenable/);
    const getterInput = input('weapon') as unknown as Record<string, unknown>;
    let getterCalls = 0;
    Object.defineProperty(getterInput, 'selection', {
      enumerable: true,
      configurable: true,
      get: () => { getterCalls += 1; return {}; },
    });
    expect(() => consumeOnce('weapon', getterInput as never)).toThrow(/getter\/setter/);
    expect(getterCalls).toBe(0);

    const component = new ArenaV2CollectionMasteryDetailCompositionCandidateV1({
      epochId: 'test.a6.3.weapon.epoch-1',
    });
    const firstInput = input('weapon');
    const first = component.consume(firstInput);
    expect(component.consume(firstInput)).toBe(first);
    expect(() => component.consume(input('weapon', {
      collectionProgressInput: collectionProgressInput('weapon', { muted: true }),
    }))).toThrow(/同tick/);
    expect(() => component.consume(input('weapon', {
      collectionProgressInput: collectionProgressInput('weapon', {
        tick: 21,
        profileIdentity: profileIdentity(6),
        nextGoalIdentity: weaponGoal(6),
      }),
      detailProgressFacts: detailProgress('weapon', 6),
    }))).toThrow(/revision回退/);
    expect(component.getSnapshot()).toBe(first);
  });

  it('protects frozen snapshot integrity and reset/destroy lifecycle', () => {
    const component = new ArenaV2CollectionMasteryDetailCompositionCandidateV1({
      epochId: 'test.a6.3.map.epoch-1',
    });
    const snapshot = component.consume(input('map'));
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.rows)).toBe(true);
    expect(Object.isFrozen(snapshot.rows[0])).toBe(true);
    expect(Reflect.set(snapshot.rows[0]!, 'labelText', 'tampered')).toBe(false);
    expect(component.getSnapshot()).toBe(snapshot);
    expect(() => component.resetPresentationEpoch({ epochId: 'test.a6.3.map.epoch-1' }))
      .toThrow(/必须使用新epochId/);
    component.resetPresentationEpoch({ epochId: 'test.a6.3.map.epoch-2' });
    expect(component.getSnapshot()).toBeNull();
    const next = input('map', {
      collectionProgressInput: collectionProgressInput('map', {
        epochId: 'test.a6.3.map.epoch-2', tick: 0,
      }),
    });
    expect(component.consume(next)).toMatchObject({ epochId: 'test.a6.3.map.epoch-2', tick: 0 });
    component.destroy();
    component.destroy();
    expect(component.state).toBe(ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_LIFECYCLE_V1.DESTROYED);
    expect(() => component.getSnapshot()).toThrow(/destroyed/);
    expect(() => component.consume(next)).toThrow(/destroyed/);
    expect(ARENA_V2_A6_COLLECTION_MASTERY_DETAIL_COMPOSITION_CANDIDATE_V1).toMatchObject({
      pageCountAdded: 0,
      primaryActionCountAdded: 0,
      localProductionContentIdCatalog: false,
      ownsProfileReads: false,
      ownsProfileWrites: false,
      ownsNextGoalSelection: false,
      validationStatus: 'not-run',
    });
  });
});
