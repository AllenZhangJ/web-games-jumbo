import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_FULL_CATALOG_REPLAY_COMBINATION_INFORMATION_PROJECTION_CANDIDATE_V1,
  projectArenaV2FullCatalogReplayCombinationInformationFieldSourceCandidateV1,
  projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1,
  projectArenaV2NextLearningSignatureReadCandidateV1,
} from '../src/index.js';

const HEAVY_HAMMER = 'arena-v2.weapon.heavy-hammer.candidate.v1';
const KZ_MAP = 'arena-v2-kz-base-map.candidate.v1';
const KZ_ROUTE_FORK = 'kz-segment-04-maze';

function fieldSource() {
  return Object.freeze({
    ownerId: 'p6-learning-profile' as const,
    fieldValues: Object.freeze([
      Object.freeze({
        fieldId: 'next-goal',
        labelMessageId: 'arena.v2.field.next-goal',
        valueText: '第2把·重锤：完成地面情境（2/6）',
        accessibilityText: '下一个长期目标是重锤地面情境，进度二比六。',
        fixedWidthNumeric: true,
      }),
    ]),
  });
}

function continuationRoute(
  weaponDefinitionId: string | null,
  mapDefinitionId: string | null,
  segmentDefinitionId: string | null = null,
) {
  const recommendedModeKind = mapDefinitionId === null ? 'duel' : 'race';
  return Object.freeze({
    schemaVersion: 1 as const,
    goalId: 'fixture-goal',
    goalKind: segmentDefinitionId !== null
      ? 'map-segment' as const
      : mapDefinitionId === null ? 'collect-weapon' as const : 'collect-map' as const,
    continuationKind: mapDefinitionId === null
      ? 'deterministic-weapon-loadout' as const
      : 'map-route-practice' as const,
    recommendedModeDefinitionId: `arena-v2.mode.${recommendedModeKind}.candidate.v1`,
    recommendedModeKind,
    targetWeaponDefinitionId: weaponDefinitionId,
    targetMapDefinitionId: mapDefinitionId,
    requiresTargetWeaponSelection: weaponDefinitionId !== null,
    targetWeaponRequiresWorldPickup: false,
    requiresTargetMapSelection: mapDefinitionId !== null,
  });
}

function fullCatalogReplayCombination() {
  return Object.freeze({
    schemaVersion: 1 as const,
    profileRevision: 21,
    modeDefinitionId: 'arena-v2.mode.duel.candidate.v1',
    modeKind: 'duel' as const,
    modePlayCount: 5,
    weaponDefinitionId: HEAVY_HAMMER,
    weaponRotationOrdinal: 2,
    eligibleWeaponCount: 20,
    mapDefinitionId: KZ_MAP,
    mapRotationOrdinal: 2,
    mapCount: 2,
    weaponMapRotationCycleLength: 40,
    survivalWeaponRequiresWorldPickup: false,
  });
}

function project(
  weaponDefinitionId: string | null,
  mapDefinitionId: string | null,
  segmentDefinitionId: string | null = null,
) {
  return projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1({
    schemaVersion: 1,
    fieldSource: fieldSource(),
    weaponDefinitionId,
    mapDefinitionId,
    segmentDefinitionId,
    continuationRoute: continuationRoute(
      weaponDefinitionId,
      mapDefinitionId,
      segmentDefinitionId,
    ),
    fullCatalogReplayCombination: null,
  });
}

describe('Arena V2 home next learning signature projection candidate V1', () => {
  it('adds one short shared core-fight signature to an existing weapon goal', () => {
    const result = project(HEAVY_HAMMER, null);
    expect(result.fieldValues[0]).toMatchObject({
      fieldId: 'next-goal',
      valueText:
        '第2把·重锤：完成地面情境（2/6）；打法：推离·按一下；下一局：常规1v1',
      fixedWidthNumeric: true,
    });
    expect(result.fieldValues[0]?.valueText).toContain('下一局：常规1v1');
    expect(result.fieldValues[0]?.accessibilityText).toContain('重锤。核心动词：推离。');
    expect(result.fieldValues).toHaveLength(fieldSource().fieldValues.length);
  });

  it('adds only the start-to-finish route on a map goal', () => {
    const target = project(null, KZ_MAP).fieldValues[0]!;
    expect(target.valueText).toContain('路线：起步平台→终局钢丝');
    expect(target.valueText).not.toContain('打法：');
    expect(target.accessibilityText).toContain(
      '目标地图KZ 十二段竞技路线路线骨架：起步：第1段起步平台',
    );
    expect(target.accessibilityText).toContain('收官：第12段终局钢丝');
  });

  it('keeps one weapon and one map signature for a cross challenge', () => {
    const target = project(HEAVY_HAMMER, KZ_MAP).fieldValues[0]!;
    expect(target.valueText).toContain('打法：推离·按一下；路线：起步平台→终局钢丝');
    expect(target.valueText.match(/打法：/gu)).toHaveLength(1);
    expect(target.valueText.match(/路线：/gu)).toHaveLength(1);
  });

  it('shares a compact home signature and an expanded result signature', () => {
    const signature = projectArenaV2NextLearningSignatureReadCandidateV1({
      weaponDefinitionId: HEAVY_HAMMER,
      mapDefinitionId: KZ_MAP,
      segmentDefinitionId: null,
    });
    expect(signature).toMatchObject({
      weaponDefinitionId: HEAVY_HAMMER,
      weaponDisplayName: '重锤',
      mapDefinitionId: KZ_MAP,
      mapDisplayName: 'KZ 十二段竞技路线',
      compactText: '打法：推离·按一下；路线：起步平台→终局钢丝',
    });
    expect(signature?.expandedText).toContain('核心：推离｜按一下｜');
    expect(signature?.expandedText).toContain(
      '路线：起步平台→双路迷宫→长线钢丝→终局钢丝',
    );
    expect(signature?.accessibilityText).toContain('目标武器核心打法');
    expect(signature?.accessibilityText).toContain('目标地图KZ 十二段竞技路线路线骨架');
  });

  it('puts the exact map-segment goal before the full route skeleton', () => {
    const target = project(null, KZ_MAP, KZ_ROUTE_FORK).fieldValues[0]!;
    expect(target.valueText).toContain(
      '下一段：4.双路迷宫；路线：起步平台→终局钢丝',
    );
    expect(target.accessibilityText).toContain('目标路段是第4段双路迷宫');
    expect(target.accessibilityText).toContain('目标地图KZ 十二段竞技路线路线骨架');
  });

  it('shows a continuation mode even when a mode goal has no weapon or map identity', () => {
    const source = fieldSource();
    const result = projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: source,
      weaponDefinitionId: null,
      mapDefinitionId: null,
      segmentDefinitionId: null,
      continuationRoute: {
        schemaVersion: 1,
        goalId: 'mode-first-completion:arena-v2.mode.survival.candidate.v1',
        goalKind: 'mode-mastery',
        continuationKind: 'explicit-mode',
        recommendedModeDefinitionId: 'arena-v2.mode.survival.candidate.v1',
        recommendedModeKind: 'survival',
        targetWeaponDefinitionId: null,
        targetMapDefinitionId: null,
        requiresTargetWeaponSelection: false,
        targetWeaponRequiresWorldPickup: false,
        requiresTargetMapSelection: false,
      },
      fullCatalogReplayCombination: null,
    });
    expect(result.fieldValues[0]?.valueText).toContain('下一局：生存');
    expect(result.fieldValues[0]?.valueText).not.toContain('打法：');
    expect(result.fieldValues[0]?.valueText).not.toContain('路线：');
  });

  it('reuses the result next-goal field for the next full-catalog replay combo', () => {
    const result = projectArenaV2FullCatalogReplayCombinationInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      continuationRoute: {
        schemaVersion: 1,
        goalId: 'catalog-complete',
        goalKind: 'catalog-complete',
        continuationKind: 'free-choice',
        recommendedModeDefinitionId: null,
        recommendedModeKind: null,
        targetWeaponDefinitionId: null,
        targetMapDefinitionId: null,
        requiresTargetWeaponSelection: false,
        targetWeaponRequiresWorldPickup: false,
        requiresTargetMapSelection: false,
      },
      fullCatalogReplayCombination: fullCatalogReplayCombination(),
    });
    expect(result.fieldValues).toHaveLength(fieldSource().fieldValues.length);
    expect(result.fieldValues[0]?.valueText).toContain(
      '复练 22/40：常规1v1·重锤·KZ 十二段竞技路线',
    );
    expect(result.fieldValues[0]?.accessibilityText).toContain('完整目录第22组，共40组');
    expect(ARENA_V2_FULL_CATALOG_REPLAY_COMBINATION_INFORMATION_PROJECTION_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        hardGate: false,
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        resultReusesExistingNextGoalField: true,
        fullCatalogReplayCombinationShowsDerivedCycleOrdinal: true,
        replayRotationOrdinalsRevalidatedAgainstProfileRevision: true,
        fieldCountAdded: 0,
        pageCountAdded: 0,
        actionCountAdded: 0,
      });
  });

  it('does not append a replay combo for active-scope completion', () => {
    expect(projectArenaV2FullCatalogReplayCombinationInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      continuationRoute: {
        schemaVersion: 1,
        goalId: 'active-learning-complete',
        goalKind: 'catalog-complete',
        continuationKind: 'free-choice',
        recommendedModeDefinitionId: null,
        recommendedModeKind: null,
        targetWeaponDefinitionId: null,
        targetMapDefinitionId: null,
        requiresTargetWeaponSelection: false,
        targetWeaponRequiresWorldPickup: false,
        requiresTargetMapSelection: false,
      },
      fullCatalogReplayCombination: null,
    })).toEqual(fieldSource());
  });

  it('rejects a replay rotation ordinal that drifts from the profile revision', () => {
    expect(() => projectArenaV2FullCatalogReplayCombinationInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      continuationRoute: {
        schemaVersion: 1,
        goalId: 'catalog-complete',
        goalKind: 'catalog-complete',
        continuationKind: 'free-choice',
        recommendedModeDefinitionId: null,
        recommendedModeKind: null,
        targetWeaponDefinitionId: null,
        targetMapDefinitionId: null,
        requiresTargetWeaponSelection: false,
        targetWeaponRequiresWorldPickup: false,
        requiresTargetMapSelection: false,
      },
      fullCatalogReplayCombination: {
        ...fullCatalogReplayCombination(),
        weaponRotationOrdinal: 3,
      },
    })).toThrow(/武器轮转序号/u);
  });

  it('uses only the two stable scope-completion goal IDs for free-choice copy', () => {
    const freeChoiceRoute = (goalId: 'catalog-complete' | 'active-learning-complete') => ({
      schemaVersion: 1 as const,
      goalId,
      goalKind: 'catalog-complete' as const,
      continuationKind: 'free-choice' as const,
      recommendedModeDefinitionId: null,
      recommendedModeKind: null,
      targetWeaponDefinitionId: null,
      targetMapDefinitionId: null,
      requiresTargetWeaponSelection: false,
      targetWeaponRequiresWorldPickup: false,
      requiresTargetMapSelection: false,
    });
    const projectFreeChoice = (continuationRoute: ReturnType<typeof freeChoiceRoute>) => (
      projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1({
        schemaVersion: 1,
        fieldSource: fieldSource(),
        weaponDefinitionId: null,
        mapDefinitionId: null,
        segmentDefinitionId: null,
        continuationRoute,
        fullCatalogReplayCombination: continuationRoute.goalId === 'catalog-complete'
          ? fullCatalogReplayCombination()
          : null,
      })
    );
    expect(projectFreeChoice(freeChoiceRoute('catalog-complete')).fieldValues[0]?.valueText)
      .toContain('下一局：自由挑战');
    expect(projectFreeChoice(freeChoiceRoute('catalog-complete')).fieldValues[0]?.valueText)
      .toContain('复练 22/40：常规1v1·重锤·KZ 十二段竞技路线');
    expect(projectFreeChoice(
      freeChoiceRoute('active-learning-complete'),
    ).fieldValues[0]?.valueText).toContain('下一局：自由练习当前开放内容');

    expect(() => projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      weaponDefinitionId: null,
      mapDefinitionId: null,
      segmentDefinitionId: null,
      continuationRoute: {
        ...freeChoiceRoute('catalog-complete'),
        goalId: 'future-complete',
      },
      fullCatalogReplayCombination: null,
    } as never)).toThrow(/目标ID/);
    expect(() => projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      weaponDefinitionId: null,
      mapDefinitionId: null,
      segmentDefinitionId: null,
      continuationRoute: {
        ...freeChoiceRoute('catalog-complete'),
        goalKind: 'mode-mastery',
      },
      fullCatalogReplayCombination: null,
    })).toThrow(/不得冒充/);
    expect(() => projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      weaponDefinitionId: null,
      mapDefinitionId: null,
      segmentDefinitionId: null,
      continuationRoute: {
        ...continuationRoute(null, null),
        goalId: 'catalog-complete',
        goalKind: 'catalog-complete',
      },
      fullCatalogReplayCombination: null,
    })).toThrow(/不得指定推荐模式/);
  });

  it('fails closed on unknown identities, owner drift and target-field drift', () => {
    expect(() => project('future-weapon', null)).toThrow(/future-weapon/);
    expect(() => project(null, 'future-map')).toThrow(/future-map/);
    expect(() => project(null, null, KZ_ROUTE_FORK)).toThrow(/路段必须隶属于目标地图/);
    expect(() => project(null, KZ_MAP, 'future-segment')).toThrow(/不属于目标地图/);
    expect(() => projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: { ...fieldSource(), ownerId: 'future-owner' } as never,
      weaponDefinitionId: HEAVY_HAMMER,
      mapDefinitionId: null,
      segmentDefinitionId: null,
      continuationRoute: continuationRoute(HEAVY_HAMMER, null),
      fullCatalogReplayCombination: null,
    })).toThrow(/Owner/);
    expect(() => projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: { ...fieldSource(), fieldValues: [] },
      weaponDefinitionId: HEAVY_HAMMER,
      mapDefinitionId: null,
      segmentDefinitionId: null,
      continuationRoute: continuationRoute(HEAVY_HAMMER, null),
      fullCatalogReplayCombination: null,
    })).toThrow(/next-goal/);
  });
});
