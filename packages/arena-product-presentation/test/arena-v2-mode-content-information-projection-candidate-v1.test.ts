import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1,
  ARENA_V2_PREPARATION_LEARNING_FOCUS_INFORMATION_CANDIDATE_V1,
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
  projectArenaV2ModeContentInformationCandidateV1,
  projectArenaV2MapRouteSkeletonReadV1,
  projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1,
  projectArenaV2WeaponCoreFightReadV1,
} from '../src/index.js';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1,
  ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
} from '@number-strategy-jump/arena-product-progression';

function projection(
  selectedModeKind: 'duel' | 'race' | 'survival',
  homeContinuationPreparationState: 'none' | 'ready' | 'adjusted' = 'none',
  homeContinuationPreparationSource: 'none' | 'home' | 'result' =
    homeContinuationPreparationState === 'none' ? 'none' : 'home',
) {
  return projectArenaV2ModeContentInformationCandidateV1({
    selectedModeKind,
    raceParticipantCount: 4,
    survivalEnemyCount: 16,
    selectedCharacterDisplayName: '突进者',
    selectedWeaponDefinitionId: 'arena-v2.weapon.charge-shield.candidate.v1',
    selectedWeaponDisplayName: '冲锋盾',
    selectedWeaponCollected: false,
    selectedWeaponCollectionEvidence: 29,
    selectedWeaponCollectionTarget: 120,
    selectedMapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
    selectedMapDisplayName: 'KZ 十二段竞技路线',
    selectedMapCollected: true,
    selectedMapCompletedSegmentCount: 3,
    selectedMapSegmentCount: 12,
    homeContinuationPreparationState,
    homeContinuationPreparationSource,
    supplyIntervalTicks: 1_200,
    supplySpawnCount: 3,
    supplyLifetimeTicks: 600,
    pressureStageIntervalTicks: 1_200,
  });
}

function stableGlobalGoalFit(modeKind: 'duel' | 'race' | 'survival') {
  return Object.freeze({
    schemaVersion: 1 as const,
    profileRevision: 7,
    kind: 'stable-current-combination' as const,
    goalId: 'test-current-learning-goal',
    goalActionLabel: '完成当前目标动作',
    sourceModeKind: modeKind,
    recommendedModeKind: modeKind,
    targetWeaponDefinitionId: null,
    targetMapDefinitionId: null,
    requiresModeChange: false,
    requiresWeaponChange: false,
    requiresMapChange: false,
    deterministicCurrentReplayCanAdvance: true,
    conditionalCurrentReplayCanAdvance: false,
  });
}

function freeChallengeGlobalGoalFit(
  modeKind: 'duel' | 'race' | 'survival',
  goalId: string = ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
) {
  return Object.freeze({
    ...stableGlobalGoalFit(modeKind),
    kind: 'free-challenge' as const,
    goalId,
    goalActionLabel: '自由挑战或刷新记录',
  });
}

describe('Arena V2 mode preparation learning context candidate', () => {
  it('states the complete three-minute control contract on the quick-start route', () => {
    expect(ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.contentVersion).toBe(10);
    const modeSelect = projection('duel').screens.find(({ screenId }) => (
      screenId === 'mode-select'
    ))!;
    expect(modeSelect.fieldSource.fieldValues.find(({ fieldId }) => (
      fieldId === 'character-entry'
    ))?.valueText).toBe(ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.quickStartText);
    expect(ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.concepts).toEqual([
      '方向',
      '跳跃',
      '主攻击',
    ]);
    expect(ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1).toMatchObject({
      coveredCharacterCount: 6,
      coveredWeaponCount: 20,
      coveredMapCount: 2,
      coveredMapSegmentCount: 20,
      forcedInactiveInputFields: ['slamPressed'],
      ownsInputMapping: false,
      addsInputConcepts: false,
      rejectsExpandedInputContract: true,
    });
    expect(ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1).toMatchObject({
      moveLeftCodes: ['KeyA', 'ArrowLeft'],
      moveRightCodes: ['KeyD', 'ArrowRight'],
      moveForwardCodes: ['KeyW', 'ArrowUp'],
      moveBackwardCodes: ['KeyS', 'ArrowDown'],
      jumpCodes: ['Space'],
      primaryAttackCodes: ['KeyJ', 'KeyE'],
    });
    expect(ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1).toMatchObject({
      movementControlLabel: '移动',
      jumpControlLabel: '跳跃',
      primaryAttackControlLabel: '攻击',
    });
    expect(ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.platformControlText)
      .toContain(ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1.visibleText);
    expect(ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.platformControlText)
      .toContain(ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.visibleText);
    expect(ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      'arena.v2.screen.mode-select.announcement',
    )).toContain(ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.spokenControlText);
    expect(ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      'arena.v2.screen.mode-select.announcement',
    )).toContain(ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.platformControlAccessibilityText);
    expect(ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      'arena.v2.screen.mode-select.announcement',
    )).toContain('一对一和竞速会携带当前武器与地图；生存只使用当前地图并空手开局');
    expect(ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      'arena.v2.screen.character-select.announcement',
    )).toContain(ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.spokenControlText);
    expect(ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      'arena.v2.screen.character-select.announcement',
    )).toContain(ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.platformControlAccessibilityText);
    expect(ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      'arena.v2.action.use-weapon-next-match',
    )).toBe('选择模式');
    expect(ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      'arena.v2.action.use-map-next-match',
    )).toBe('选择模式');
  });

  it('shows the current competitive loadout or survival map before the quick-start action', () => {
    const coreFight = projectArenaV2WeaponCoreFightReadV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      'arena-v2.weapon.charge-shield.candidate.v1',
    );
    const routeSkeleton = projectArenaV2MapRouteSkeletonReadV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      'arena-v2-kz-base-map.candidate.v1',
    );
    const shortRoute = `${routeSkeleton.anchors[0]!.displayName}→${
      routeSkeleton.anchors[routeSkeleton.anchors.length - 1]!.displayName
    }`;
    const raceModeSelect = projection('race').screens.find(({ screenId }) => (
      screenId === 'mode-select'
    ))!;
    const racePreparation = raceModeSelect.fieldSource.fieldValues.find(({ fieldId }) => (
      fieldId === 'preparation-entry'
    ));
    expect(racePreparation?.valueText).toBe(
      `1v1/竞速：冲锋盾 ${coreFight.coreVerb}·${
        coreFight.operation.compactText
      } × KZ 十二段竞技路线 ${shortRoute}`,
    );
    expect(racePreparation?.accessibilityText).toContain(coreFight.accessibilityText);
    expect(racePreparation?.accessibilityText).toContain(routeSkeleton.accessibilityText);

    const survivalModeSelect = projection('survival').screens.find(({ screenId }) => (
      screenId === 'mode-select'
    ))!;
    const survivalPreparation = survivalModeSelect.fieldSource.fieldValues.find(({ fieldId }) => (
      fieldId === 'preparation-entry'
    ));
    expect(survivalPreparation?.valueText).toBe(
      `生存：KZ 十二段竞技路线｜${shortRoute}｜空手开局`,
    );
    expect(survivalPreparation?.accessibilityText).toContain(routeSkeleton.accessibilityText);
    expect(survivalModeSelect.fieldSource.fieldValues.map(({ valueText }) => (
      valueText
    )).join('；')).not.toContain('冲锋盾');
    expect(survivalPreparation?.accessibilityText).not.toContain('冲锋盾');
  });

  it('reuses the preparation entry to show accepted or adjusted home goals', () => {
    const ready = projection('race', 'ready').screens.find(({ screenId }) => (
      screenId === 'mode-select'
    ))!.fieldSource;
    const adjusted = projection('race', 'adjusted').screens.find(({ screenId }) => (
      screenId === 'mode-select'
    ))!.fieldSource;
    const readyEntry = ready.fieldValues.find(({ fieldId }) => fieldId === 'preparation-entry');
    const adjustedEntry = adjusted.fieldValues.find(({ fieldId }) => (
      fieldId === 'preparation-entry'
    ));
    expect(ready.fieldValues.map(({ fieldId }) => fieldId)).toEqual(
      adjusted.fieldValues.map(({ fieldId }) => fieldId),
    );
    expect(readyEntry?.valueText).toMatch(/^目标已准备｜/u);
    expect(readyEntry?.accessibilityText).toMatch(/^已按首页目标准备当前组合。/u);
    expect(adjustedEntry?.valueText).toMatch(/^已改选｜/u);
    expect(adjustedEntry?.accessibilityText).toMatch(
      /^当前组合已与首页目标不同，可按当前选择开始。/u,
    );
  });

  it('reuses the same preparation entry for a result goal without claiming home origin', () => {
    const ready = projection('survival', 'ready', 'result').screens.find(({ screenId }) => (
      screenId === 'mode-select'
    ))!.fieldSource;
    const adjusted = projection('survival', 'adjusted', 'result').screens.find(({ screenId }) => (
      screenId === 'mode-select'
    ))!.fieldSource;
    const readyEntry = ready.fieldValues.find(({ fieldId }) => fieldId === 'preparation-entry');
    const adjustedEntry = adjusted.fieldValues.find(({ fieldId }) => (
      fieldId === 'preparation-entry'
    ));
    expect(readyEntry?.valueText).toMatch(/^目标已准备｜/u);
    expect(readyEntry?.accessibilityText).toMatch(/^已按上局结算目标准备当前组合。/u);
    expect(readyEntry?.valueText).toContain('空手开局');
    expect(adjustedEntry?.accessibilityText).toMatch(
      /^当前组合已与上局结算目标不同，可按当前选择开始。/u,
    );
  });

  it('labels the competitive weapon and map as this-match learning context', () => {
    const coreFight = projectArenaV2WeaponCoreFightReadV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      'arena-v2.weapon.charge-shield.candidate.v1',
    );
    const matchPrep = projection('race').screens.find(({ screenId }) => (
      screenId === 'match-prep'
    ))!;
    expect(matchPrep.fieldSource.fieldValues.find(({ fieldId }) => (
      fieldId === 'weapon-entry'
    ))?.valueText).toBe(
      '本局武器：冲锋盾（初识 · 主研究29/120 · 距熟悉至少1局有效主研究）',
    );
    expect(matchPrep.fieldSource.fieldValues.find(({ fieldId }) => (
      fieldId === 'map-entry'
    ))?.valueText).toBe('本局地图：KZ 十二段竞技路线（已收藏，路线理解 3/12）');
    expect(matchPrep.fieldSource.fieldValues.find(({ fieldId }) => (
      fieldId === 'weapon-map-plan'
    ))?.valueText).toBe(
      `本局练法：冲锋盾核心 ${coreFight.compactText}；在KZ 十二段竞技路线`
        + '优先找平台入口（第1段·起步平台）、断层（第2段·定向断层）',
    );
    expect(matchPrep.fieldSource.fieldValues.find(({ fieldId }) => (
      fieldId === 'weapon-map-plan'
    ))?.accessibilityText).toContain(`核心动词：${coreFight.coreVerb}`);
    expect(matchPrep.fieldSource.fieldValues.find(({ fieldId }) => (
      fieldId === 'weapon-map-plan'
    ))?.accessibilityText).toContain('地面：');
  });

  it('shows the selected map in Survival without inventing a preselected weapon', () => {
    const survivalPrep = projection('survival').screens.find(({ screenId }) => (
      screenId === 'survival-prep'
    ))!;
    const values = survivalPrep.fieldSource.fieldValues;
    expect(values.find(({ fieldId }) => fieldId === 'pressure-summary')?.valueText)
      .toContain('本局地图：KZ 十二段竞技路线（已收藏，路线理解 3/12）');
    expect(values.find(({ fieldId }) => fieldId === 'unarmed-start')?.valueText)
      .toContain('默认空手开局');
    expect(values.map(({ valueText }) => valueText).join('；')).not.toContain('本局武器');
    expect(values.map(({ fieldId }) => fieldId)).not.toContain('weapon-map-plan');
  });

  it('appends one mode-compatible weapon focus and one least-practiced route focus', () => {
    const racePrep = projection('race').screens.find(({ screenId }) => (
      screenId === 'match-prep'
    ))!;
    const focusedRace = projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      profileRevision: 7,
      modeKind: 'race',
      weaponDefinitionId: 'arena-v2.weapon.charge-shield.candidate.v1',
      mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      fieldSource: racePrep.fieldSource,
      focus: {
        schemaVersion: 1,
        profileRevision: 7,
        modeKind: 'race',
        weaponContextFocus: {
          weaponDefinitionId: 'arena-v2.weapon.charge-shield.candidate.v1',
          context: 'ground',
          currentProgress: 1,
          targetProgress: 3,
          practiceInstruction: '在地面用这把武器形成一次有效武器反馈',
        },
        mapSegmentFocus: {
          segmentDefinitionId: 'kz-segment-01-platform',
          ordinal: 1,
          currentProgress: 0,
          targetProgress: 3,
          practiceInstruction: '经过这段路线的安全落点，或在这段路线形成一次有效命中反馈',
        },
      },
      globalGoalFit: stableGlobalGoalFit('race'),
    });
    expect(focusedRace.fieldValues.find(({ fieldId }) => (
      fieldId === 'weapon-map-plan'
    ))?.valueText).toContain(
      '路线骨架：起步平台→双路迷宫→长线钢丝→终局钢丝',
    );
    expect(focusedRace.fieldValues.find(({ fieldId }) => (
      fieldId === 'weapon-map-plan'
    ))?.accessibilityText).toContain(
      '路线骨架：起步：第1段起步平台',
    );
    expect(focusedRace.fieldValues.find(({ fieldId }) => (
      fieldId === 'weapon-map-plan'
    ))?.valueText).toContain(
      '武器目标：地面1/3，在地面用这把武器形成一次有效武器反馈',
    );
    expect(focusedRace.fieldValues.find(({ fieldId }) => (
      fieldId === 'weapon-map-plan'
    ))?.valueText).toContain(
      '路线目标：第1段·起步平台0/3，经过这段路线的安全落点',
    );

    const survivalPrep = projection('survival').screens.find(({ screenId }) => (
      screenId === 'survival-prep'
    ))!;
    const focusedSurvival = projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      profileRevision: 7,
      modeKind: 'survival',
      weaponDefinitionId: null,
      mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      fieldSource: survivalPrep.fieldSource,
      focus: {
        schemaVersion: 1,
        profileRevision: 7,
        modeKind: 'survival',
        weaponContextFocus: null,
        mapSegmentFocus: {
          segmentDefinitionId: 'kz-segment-01-platform',
          ordinal: 1,
          currentProgress: 0,
          targetProgress: 3,
          practiceInstruction: '经过这段路线的安全落点，或在这段路线形成一次有效命中反馈',
        },
      },
      globalGoalFit: stableGlobalGoalFit('survival'),
    });
    const survivalText = focusedSurvival.fieldValues.find(({ fieldId }) => (
      fieldId === 'pressure-summary'
    ))?.valueText ?? '';
    expect(survivalText).toContain(
      '路线骨架：起步平台→双路迷宫→长线钢丝→终局钢丝',
    );
    expect(survivalText).toContain('路线目标：第1段·起步平台0/3');
    expect(survivalText).not.toContain('武器目标');
  });

  it('keeps the selected map route skeleton visible when no learning focus remains', () => {
    const matchPrep = projection('duel').screens.find(({ screenId }) => (
      screenId === 'match-prep'
    ))!;
    const projected = projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      profileRevision: 7,
      modeKind: 'duel',
      weaponDefinitionId: 'arena-v2.weapon.charge-shield.candidate.v1',
      mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      fieldSource: matchPrep.fieldSource,
      focus: {
        schemaVersion: 1,
        profileRevision: 7,
        modeKind: 'duel',
        weaponContextFocus: null,
        mapSegmentFocus: null,
      },
      globalGoalFit: stableGlobalGoalFit('duel'),
    });
    const plan = projected.fieldValues.find(({ fieldId }) => fieldId === 'weapon-map-plan');
    expect(plan?.valueText).toContain(
      '路线骨架：起步平台→双路迷宫→长线钢丝→终局钢丝',
    );
    expect(plan?.valueText).not.toContain('武器目标：');
    expect(plan?.valueText).not.toContain('路线目标：');
  });

  it('accepts only the two stable free-challenge identities before publishing preparation copy', () => {
    const matchPrep = projection('duel').screens.find(({ screenId }) => (
      screenId === 'match-prep'
    ))!;
    const base = {
      schemaVersion: 1 as const,
      profileRevision: 7,
      modeKind: 'duel' as const,
      weaponDefinitionId: 'arena-v2.weapon.charge-shield.candidate.v1',
      mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      fieldSource: matchPrep.fieldSource,
      focus: {
        schemaVersion: 1 as const,
        profileRevision: 7,
        modeKind: 'duel' as const,
        weaponContextFocus: null,
        mapSegmentFocus: null,
      },
    };
    for (const goalId of [
      ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
      ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
    ]) {
      const projected = projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1({
        ...base,
        globalGoalFit: freeChallengeGlobalGoalFit('duel', goalId),
      });
      expect(projected.fieldValues.map(({ fieldId }) => fieldId)).toEqual(
        matchPrep.fieldSource.fieldValues.map(({ fieldId }) => fieldId),
      );
      expect(projected.fieldValues.find(({ fieldId }) => fieldId === 'weapon-map-plan')
        ?.valueText).toContain('当前开放内容已闭合，可自由挑战或刷新记录');
    }
    expect(() => projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1({
      ...base,
      globalGoalFit: freeChallengeGlobalGoalFit('duel', 'future-scope-complete'),
    })).toThrow(/不是已注册的范围完成身份/);
    expect(() => projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1({
      ...base,
      globalGoalFit: {
        ...stableGlobalGoalFit('duel'),
        goalId: ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
      },
    })).toThrow(/不得冒充范围完成身份/);

    let getterCalls = 0;
    const hostile = { ...freeChallengeGlobalGoalFit('duel') };
    Object.defineProperty(hostile, 'goalId', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1;
      },
    });
    expect(() => projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1({
      ...base,
      globalGoalFit: hostile,
    })).toThrow(/accessor|getter|data field|数据字段/iu);
    expect(getterCalls).toBe(0);
    expect(ARENA_V2_PREPARATION_LEARNING_FOCUS_INFORMATION_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      hardGate: false,
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      scopeCompletionIdentitySource: 'result-next-goal-route-fit',
      freeChallengeUsesStableScopeCompletionGoalIds: true,
      nonFreeChallengeCannotClaimScopeCompletionGoalId: true,
      duplicatesScopeCompletionResolution: false,
    });
  });

  it('rejects a focus from another mode, profile revision or selected weapon', () => {
    const fieldSource = projection('duel').screens.find(({ screenId }) => (
      screenId === 'match-prep'
    ))!.fieldSource;
    const base = {
      schemaVersion: 1 as const,
      profileRevision: 7,
      modeKind: 'duel' as const,
      weaponDefinitionId: 'arena-v2.weapon.charge-shield.candidate.v1',
      mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      fieldSource,
      focus: {
        schemaVersion: 1 as const,
        profileRevision: 7,
        modeKind: 'duel' as const,
        weaponContextFocus: {
          weaponDefinitionId: 'arena-v2.weapon.charge-shield.candidate.v1',
          context: 'ground' as const,
          currentProgress: 0,
          targetProgress: 3,
          practiceInstruction: '在地面用这把武器形成一次有效武器反馈',
        },
        mapSegmentFocus: null,
      },
      globalGoalFit: stableGlobalGoalFit('duel'),
    };
    expect(() => projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1({
      ...base,
      focus: { ...base.focus, modeKind: 'race' },
    })).toThrow(/当前模式不一致/);
    expect(() => projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1({
      ...base,
      focus: { ...base.focus, profileRevision: 8 },
    })).toThrow(/Profile revision不一致/);
    expect(() => projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1({
      ...base,
      weaponDefinitionId: 'arena-v2.weapon.heavy-hammer.candidate.v1',
    })).toThrow(/当前武器不一致/);
  });

  it('rejects weapon or map display labels that drift from their Definition identities', () => {
    const base = {
      selectedModeKind: 'duel' as const,
      raceParticipantCount: 2,
      survivalEnemyCount: 1,
      selectedCharacterDisplayName: '均衡者',
      selectedWeaponDefinitionId: 'arena-v2.weapon.charge-shield.candidate.v1',
      selectedWeaponDisplayName: '冲锋盾',
      selectedWeaponCollected: false,
      selectedWeaponCollectionEvidence: 0,
      selectedWeaponCollectionTarget: 120,
      selectedMapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      selectedMapDisplayName: 'KZ 十二段竞技路线',
      selectedMapCollected: false,
      selectedMapCompletedSegmentCount: 0,
      selectedMapSegmentCount: 12,
      homeContinuationPreparationState: 'none',
      homeContinuationPreparationSource: 'none',
      supplyIntervalTicks: 1_200,
      supplySpawnCount: 3,
      supplyLifetimeTicks: 600,
      pressureStageIntervalTicks: 1_200,
    };
    expect(() => projectArenaV2ModeContentInformationCandidateV1({
      ...base,
      selectedWeaponDisplayName: '错误武器名',
    })).toThrow(/武器Definition与显示名称/);
    expect(() => projectArenaV2ModeContentInformationCandidateV1({
      ...base,
      selectedMapDisplayName: '错误地图名',
    })).toThrow(/地图Definition与显示名称/);
    expect(() => projectArenaV2ModeContentInformationCandidateV1({
      ...base,
      selectedMapSegmentCount: 8,
    })).toThrow(/路线段落总数/);
    expect(() => projectArenaV2ModeContentInformationCandidateV1({
      ...base,
      homeContinuationPreparationState: 'ready',
      homeContinuationPreparationSource: 'none',
    })).toThrow(/准备状态与来源/);
  });
});
