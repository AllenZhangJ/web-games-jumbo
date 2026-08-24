import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_COLLECTION_NEXT_GOAL_FIRST_SCREEN_CANDIDATE_V1,
  ARENA_V2_A6_COLLECTION_NEXT_GOAL_VIEW_STATE_V1,
  ARENA_V2_A6_STATIC_CATALOG_FACT_V1,
  ArenaV2CollectionNextGoalFirstScreenCandidateV1,
  type ArenaV2A6CollectionNextGoalInputV1,
  type ArenaV2A6NextGoalFactV1,
} from '../src/arena-v2-collection-next-goal-first-screen-candidate-v1.js';

const WEAPON_ID = 'arena-v2.weapon.heavy-hammer.candidate.v1';
const MAP_ID = 'arena-v2.map.kz-base.candidate.v1';
const SEGMENT_ID = 'arena-v2.map.kz-base.segment-01.candidate.v1';
const MODE_ID = 'arena-v2.mode.duel.candidate.v1';
const CHALLENGE_ID = 'arena-v2.learning.cross-01.candidate.v1';

function progress(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    profileSchemaVersion: 1,
    profileDefinitionId: 'arena-v2.learning-profile.candidate.v1',
    profileDefinitionContentVersion: 5,
    profileId: 'arena-v2-local-learning-profile.candidate.v1',
    profileRevision: 7,
    collectedWeaponCount: 8,
    weaponMainResearchProgress: 960,
    weaponMainResearchTarget: 2_400,
    masteredWeaponCount: 3,
    completedWeaponContextCount: 22,
    collectedMapCount: 1,
    masteredMapSegmentCount: 6,
    completedModeCount: 1,
    completedChallengeCount: 4,
    challengeCount: 20,
    challengeProgress: 12,
    challengeProgressTarget: 60,
    ...overrides,
  };
}

function weaponGoal(overrides: Readonly<Record<string, unknown>> = {}): ArenaV2A6NextGoalFactV1 {
  return {
    schemaVersion: 1,
    profileRevision: 7,
    kind: 'collect-weapon',
    goalId: `collect-weapon:${WEAPON_ID}`,
    question: '下一把需要收集并理解的武器是什么？',
    actionLabel: '在实战中拾取并使用这把武器',
    currentProgress: 0,
    targetProgress: 1,
    weaponDefinitionId: WEAPON_ID,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
    effectiveLearningRequired: true,
    ...overrides,
  } as ArenaV2A6NextGoalFactV1;
}

function mapGoal(overrides: Readonly<Record<string, unknown>> = {}): ArenaV2A6NextGoalFactV1 {
  return {
    schemaVersion: 1,
    profileRevision: 7,
    kind: 'map-segment',
    goalId: `map-segment:${MAP_ID}:${SEGMENT_ID}`,
    question: '下一段需要熟悉的路线是什么？',
    actionLabel: '完成该段路线并留下有效记录',
    currentProgress: 1,
    targetProgress: 3,
    weaponDefinitionId: null,
    mapDefinitionId: MAP_ID,
    segmentDefinitionId: SEGMENT_ID,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
    effectiveLearningRequired: true,
    ...overrides,
  } as ArenaV2A6NextGoalFactV1;
}

function modeGoal(overrides: Readonly<Record<string, unknown>> = {}): ArenaV2A6NextGoalFactV1 {
  return {
    schemaVersion: 1,
    profileRevision: 7,
    kind: 'mode-mastery',
    goalId: `mode-mastery:${MODE_ID}`,
    question: '下一种需要建立记录的模式是什么？',
    actionLabel: '完成一局该模式',
    currentProgress: 2,
    targetProgress: 5,
    weaponDefinitionId: null,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: MODE_ID,
    challengeDefinitionId: null,
    context: null,
    effectiveLearningRequired: true,
    ...overrides,
  } as ArenaV2A6NextGoalFactV1;
}

function completeGoal(): ArenaV2A6NextGoalFactV1 {
  return {
    schemaVersion: 1,
    profileRevision: 7,
    kind: 'catalog-complete',
    goalId: 'catalog-complete',
    question: '全部已注册学习目录和模式记录是否已经闭合？',
    actionLabel: '自由挑战或刷新任意个人记录',
    currentProgress: 1,
    targetProgress: 1,
    weaponDefinitionId: null,
    mapDefinitionId: null,
    segmentDefinitionId: null,
    modeDefinitionId: null,
    challengeDefinitionId: null,
    context: null,
    effectiveLearningRequired: false,
  };
}

function activeLearningCompleteGoal(): ArenaV2A6NextGoalFactV1 {
  return {
    ...completeGoal(),
    goalId: 'active-learning-complete',
    question: '当前已开放学习内容是否已经闭合？',
    actionLabel: '自由练习当前开放内容，等待新武器开放',
  };
}

function input(overrides: Readonly<Record<string, unknown>> = {}): ArenaV2A6CollectionNextGoalInputV1 {
  return {
    schemaVersion: 1,
    epochId: 'profile-epoch-1',
    tick: 20,
    locale: 'zh-CN',
    sourceState: 'ready',
    catalogFact: ARENA_V2_A6_STATIC_CATALOG_FACT_V1,
    progressFact: progress(),
    nextGoal: weaponGoal(),
    diagnosticCode: null,
    observedProfileSchemaVersion: 1,
    viewport: {
      width: 390,
      height: 844,
      safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
    },
    reducedMotion: false,
    muted: false,
    decorativeAssetState: 'ready',
    ...overrides,
  } as ArenaV2A6CollectionNextGoalInputV1;
}

function unavailableInput(
  sourceState: 'loading' | 'empty' | 'error' | 'future-profile',
): ArenaV2A6CollectionNextGoalInputV1 {
  return input({
    sourceState,
    progressFact: null,
    nextGoal: null,
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

function consumeOnce(value: ArenaV2A6CollectionNextGoalInputV1) {
  const view = new ArenaV2CollectionNextGoalFirstScreenCandidateV1({ epochId: value.epochId });
  const snapshot = view.consume(value);
  return { view, snapshot };
}

describe('Arena V2 A6 collection and unique next-goal first-screen candidate', () => {
  it('projects one weapon goal, one primary action and at most three first-view facts', () => {
    const { view, snapshot } = consumeOnce(input());
    expect(snapshot.state).toBe('ready');
    expect(snapshot.goal).toMatchObject({
      kind: 'collect-weapon',
      category: 'weapon',
      targetDefinitionIds: [WEAPON_ID],
    });
    expect(snapshot.firstViewFacts).toHaveLength(3);
    expect(snapshot.firstViewFacts[2]).toMatchObject({
      factId: 'category-progress',
      labelMessageId: 'arena.v2.a6.weapon-progress',
      valueText: '收藏8/20 · 五情境完整3/20 · 主研究960/2400 · 情境22/100',
      accessibilityText: '已收藏8/20把武器，完整理解3/20把，共完成960/2400次主研究和22/100项武器情境。',
    });
    expect(snapshot.primaryAction).toMatchObject({
      intentId: 'open-selected-weapon',
      entryScreenId: 'weapon-index',
      labelText: '在实战中拾取并使用这把武器',
      accessibilityText: '在实战中拾取并使用这把武器。',
      enabled: true,
      targetDefinitionId: WEAPON_ID,
      minimumTouchTargetCssPixels: 48,
      mutatesProfileOrRules: false,
    });
    expect(snapshot.layout.primaryActionCount).toBe(1);
    expect(snapshot.layout.maximumFirstViewFacts).toBe(3);
    expect(snapshot.semanticStyle).toMatchObject({
      shapeToken: 'heavy-square-forward-notch',
      patternToken: 'vertical-single-bars',
      textToken: '武器',
      colorIsNeverSoleSignal: true,
    });
    view.destroy();
  });

  it('maps weapon, map and mode goals to existing navigation intents without selecting a goal', () => {
    const weapon = consumeOnce(input()).snapshot;
    const map = consumeOnce(input({ nextGoal: mapGoal() })).snapshot;
    const mode = consumeOnce(input({ nextGoal: modeGoal() })).snapshot;
    expect(weapon.goal?.category).toBe('weapon');
    expect(weapon.primaryAction.intentId).toBe('open-selected-weapon');
    expect(map.goal?.category).toBe('map');
    expect(map.primaryAction).toMatchObject({
      intentId: 'open-selected-map',
      entryScreenId: 'map-index',
      labelText: '完成该段路线并留下有效记录',
      targetDefinitionId: MAP_ID,
    });
    expect(mode.goal?.category).toBe('mode');
    expect(mode.primaryAction).toMatchObject({
      intentId: 'open-mode-select',
      entryScreenId: 'mode-select',
      labelText: '完成一局该模式',
      targetDefinitionId: MODE_ID,
    });
    expect(mode.primaryAction.intentId).not.toBe('start-selected-mode');
  });

  it('keeps cross-challenge identity closed without inventing a mode selection', () => {
    const goal: ArenaV2A6NextGoalFactV1 = {
      ...modeGoal(),
      kind: 'cross-challenge',
      goalId: `cross-challenge:${CHALLENGE_ID}`,
      weaponDefinitionId: WEAPON_ID,
      mapDefinitionId: MAP_ID,
      segmentDefinitionId: SEGMENT_ID,
      challengeDefinitionId: CHALLENGE_ID,
      currentProgress: 1,
      targetProgress: 3,
    };
    const { snapshot } = consumeOnce(input({ nextGoal: goal }));
    expect(snapshot.goal).toMatchObject({
      kind: 'cross-challenge',
      category: 'mode',
      targetDefinitionIds: [WEAPON_ID, MAP_ID, SEGMENT_ID, MODE_ID, CHALLENGE_ID],
    });
    expect(snapshot.primaryAction.intentId).toBe('open-mode-select');
  });

  it('accepts the P6.16 first-completion mode identity and keeps its 0-to-1 boundary exact', () => {
    const firstCompletion = modeGoal({
      goalId: `mode-first-completion:${MODE_ID}`,
      question: '哪一种常驻模式还没有完成过一局？',
      actionLabel: '完成一局该模式，建立第一条模式记录',
      currentProgress: 0,
      targetProgress: 1,
    });
    const { snapshot } = consumeOnce(input({ nextGoal: firstCompletion }));
    expect(snapshot.goal).toMatchObject({
      kind: 'mode-mastery',
      goalId: `mode-first-completion:${MODE_ID}`,
      category: 'mode',
    });
    expect(snapshot.firstViewFacts[1]).toMatchObject({ valueText: '0/1' });
    expect(snapshot.primaryAction).toMatchObject({
      intentId: 'open-mode-select',
      entryScreenId: 'mode-select',
      targetDefinitionId: MODE_ID,
    });

    expect(() => consumeOnce(input({
      nextGoal: modeGoal({
        goalId: `mode-first-completion:${MODE_ID}`,
        currentProgress: 1,
        targetProgress: 5,
      }),
    }))).toThrow(/0→1首次完成/);
    expect(() => consumeOnce(input({
      nextGoal: modeGoal({ goalId: `mode-first-completion:future.${MODE_ID}` }),
    }))).toThrow(/mode-mastery目标身份不闭合/);
  });

  it('renders Definition-driven challenge completion and aggregate progress without a fixed total', () => {
    const { snapshot } = consumeOnce(input({
      progressFact: progress({
        completedModeCount: 2,
        completedChallengeCount: 2,
        challengeCount: 3,
        challengeProgress: 7,
        challengeProgressTarget: 11,
      }),
      nextGoal: modeGoal(),
    }));
    expect(snapshot.firstViewFacts[2]).toMatchObject({
      factId: 'category-progress',
      valueText: '模式2/3 · 挑战完成2/3 · 挑战进度7/11',
      accessibilityText: '已完成2/3种模式的熟练记录，已完成2/3项交叉挑战，累计挑战进度7/11。',
    });
  });

  it('omits zero challenge ratios when the Definition has no challenges', () => {
    const { snapshot } = consumeOnce(input({
      progressFact: progress({
        completedChallengeCount: 0,
        challengeCount: 0,
        challengeProgress: 0,
        challengeProgressTarget: 0,
      }),
      nextGoal: modeGoal(),
    }));
    expect(snapshot.firstViewFacts[2]).toMatchObject({
      valueText: '模式1/3',
      accessibilityText: '已完成1/3种模式的熟练记录。',
    });
    expect(snapshot.firstViewFacts[2]?.valueText).not.toContain('0/0');
    expect(snapshot.firstViewFacts[2]?.accessibilityText).not.toContain('0/0');
  });

  it('rejects challenge count, completion and aggregate progress contradictions before publish', () => {
    expect(() => consumeOnce(input({
      progressFact: progress({ completedChallengeCount: 4, challengeCount: 3 }),
    }))).toThrow(/completedChallengeCount/);
    expect(() => consumeOnce(input({
      progressFact: progress({ challengeProgress: 61, challengeProgressTarget: 60 }),
    }))).toThrow(/challengeProgress/);
    expect(() => consumeOnce(input({
      progressFact: progress({
        completedChallengeCount: 0,
        challengeCount: 0,
        challengeProgress: 0,
        challengeProgressTarget: 1,
      }),
    }))).toThrow(/挑战数量与累计进度目标/);
    expect(() => consumeOnce(input({
      progressFact: progress({
        completedChallengeCount: 0,
        challengeCount: 1,
        challengeProgress: 0,
        challengeProgressTarget: 0,
      }),
    }))).toThrow(/挑战数量与累计进度目标/);
  });

  it('rejects challenge fact accessors, symbols and future fields without executing getters', () => {
    const accessorProgress = progress();
    let getterCalls = 0;
    Object.defineProperty(accessorProgress, 'challengeCount', {
      enumerable: true,
      get: () => { getterCalls += 1; return 20; },
    });
    expect(() => consumeOnce(input({ progressFact: accessorProgress }))).toThrow(/getter\/setter/);
    expect(getterCalls).toBe(0);
    expect(() => consumeOnce(input({
      progressFact: { ...progress(), futureChallengeMetric: 1 },
    }))).toThrow(/exact-key/);
    const symbolProgress = progress() as unknown as Record<PropertyKey, unknown>;
    Object.defineProperty(symbolProgress, Symbol('future-challenge'), {
      enumerable: true,
      value: true,
    });
    expect(() => consumeOnce(input({ progressFact: symbolProgress }))).toThrow(/Symbol/);
  });

  it('accepts a cross-challenge with exactly two declared dimensions and routes only by those facts', () => {
    const goal: ArenaV2A6NextGoalFactV1 = {
      ...modeGoal(),
      kind: 'cross-challenge',
      goalId: `cross-challenge:${CHALLENGE_ID}`,
      actionLabel: '打开武器详情并准备该交叉挑战',
      weaponDefinitionId: WEAPON_ID,
      mapDefinitionId: MAP_ID,
      segmentDefinitionId: null,
      modeDefinitionId: null,
      challengeDefinitionId: CHALLENGE_ID,
      currentProgress: 1,
      targetProgress: 3,
    };
    const { snapshot } = consumeOnce(input({ nextGoal: goal }));
    expect(snapshot.goal).toMatchObject({
      kind: 'cross-challenge',
      category: 'weapon',
      targetDefinitionIds: [WEAPON_ID, MAP_ID, CHALLENGE_ID],
    });
    expect(snapshot.primaryAction).toMatchObject({
      intentId: 'open-selected-weapon',
      targetDefinitionId: WEAPON_ID,
      labelText: '打开武器详情并准备该交叉挑战',
    });
  });

  it('rejects cross-challenge segment identity without its owning map', () => {
    const goal: ArenaV2A6NextGoalFactV1 = {
      ...modeGoal(),
      kind: 'cross-challenge',
      goalId: `cross-challenge:${CHALLENGE_ID}`,
      weaponDefinitionId: WEAPON_ID,
      mapDefinitionId: null,
      segmentDefinitionId: SEGMENT_ID,
      modeDefinitionId: null,
      challengeDefinitionId: CHALLENGE_ID,
      currentProgress: 1,
      targetProgress: 3,
    };
    expect(() => consumeOnce(input({ nextGoal: goal }))).toThrow(/cross-challenge目标身份不闭合/);
  });

  it('accepts the legal zero baseline for record-improvement without inventing a record', () => {
    const goal: ArenaV2A6NextGoalFactV1 = {
      ...modeGoal(),
      kind: 'record-improvement',
      goalId: `record-improvement:${MODE_ID}`,
      question: '下一项需要建立个人记录的模式是什么？',
      actionLabel: '进入该模式并建立第一条记录',
      currentProgress: 0,
      targetProgress: 0,
      effectiveLearningRequired: false,
    };
    const { snapshot } = consumeOnce(input({ nextGoal: goal }));
    expect(snapshot).toMatchObject({ state: 'ready' });
    expect(snapshot.firstViewFacts[1]).toMatchObject({ valueText: '0/0' });
    expect(snapshot.primaryAction).toMatchObject({
      intentId: 'open-mode-select',
      targetDefinitionId: MODE_ID,
      labelText: '进入该模式并建立第一条记录',
    });
    expect(() => consumeOnce(input({
      nextGoal: weaponGoal({ targetProgress: 0 }),
    }))).toThrow(/targetProgress/);
  });

  it('marks catalog completion without creating currency, store or another task', () => {
    const { snapshot } = consumeOnce(input({
      progressFact: progress({
        collectedWeaponCount: 20,
        weaponMainResearchProgress: 2_400,
        masteredWeaponCount: 20,
        completedWeaponContextCount: 100,
        collectedMapCount: 2,
        masteredMapSegmentCount: 20,
        completedModeCount: 3,
        completedChallengeCount: 20,
        challengeProgress: 60,
      }),
      nextGoal: completeGoal(),
    }));
    expect(snapshot.state).toBe('complete');
    expect(snapshot.goal).toMatchObject({ kind: 'catalog-complete', category: 'complete' });
    expect(snapshot.firstViewFacts).toHaveLength(3);
    expect(snapshot.firstViewFacts[2]).toMatchObject({
      factId: 'category-progress',
      labelMessageId: 'arena.v2.a6.catalog-progress',
      valueText: '20武器 · 2地图 · 3模式 · 主研究2400/2400 · 情境100/100 · 挑战完成20/20 · 挑战进度60/60',
      accessibilityText: '当前目录包含20把武器、2张地图和3种模式，已完成2400/2400次主研究和100/100项武器情境，已完成20/20项交叉挑战，累计挑战进度60/60。',
    });
    expect(snapshot.primaryAction).toMatchObject({
      intentId: 'open-mode-select',
      entryScreenId: 'mode-select',
      labelText: '自由挑战或刷新任意个人记录',
      accessibilityText: '自由挑战或刷新任意个人记录。',
      enabled: true,
      disabledReasonMessageId: null,
      targetDefinitionId: null,
      mutatesProfileOrRules: false,
    });
    expect(ARENA_V2_A6_COLLECTION_NEXT_GOAL_FIRST_SCREEN_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        hardGate: false,
        defaultSurfaceWired: false,
        validationStatus: 'not-run',
        usesCurrencyOrStoreOrRedDots: false,
        ownsNextGoalSelection: false,
        catalogCompletePrimaryActionWired: true,
        catalogCompletePrimaryActionTarget: 'existing-mode-select',
      });
    expect(() => consumeOnce(input({ nextGoal: completeGoal() })))
      .toThrow(/catalog-complete与未完成的目录进度矛盾/);
    expect(() => consumeOnce(input({
      progressFact: progress({
        collectedWeaponCount: 20,
        masteredWeaponCount: 20,
        completedWeaponContextCount: 100,
        collectedMapCount: 2,
        masteredMapSegmentCount: 20,
        completedModeCount: 3,
        completedChallengeCount: 20,
        challengeProgress: 60,
      }),
      nextGoal: { ...completeGoal(), currentProgress: 0 },
    }))).toThrow(/catalog-complete目标身份不闭合/);
  });

  it('keeps active-pool completion actionable without entering the full terminal state', () => {
    const { snapshot } = consumeOnce(input({
      progressFact: progress({
        collectedMapCount: 2,
        masteredMapSegmentCount: 20,
        completedModeCount: 3,
      }),
      nextGoal: activeLearningCompleteGoal(),
    }));
    expect(snapshot).toMatchObject({
      state: 'ready',
      goal: {
        kind: 'catalog-complete',
        goalId: 'active-learning-complete',
        category: 'complete',
      },
      primaryAction: {
        entryScreenId: 'mode-select',
        labelText: '自由练习当前开放内容，等待新武器开放',
        enabled: true,
      },
    });
    expect(snapshot.firstViewFacts[0]?.valueText).toBe('当前已开放学习内容是否已经闭合？');
    expect(() => consumeOnce(input({ nextGoal: activeLearningCompleteGoal() })))
      .toThrow(/active-learning-complete与未完成的共用地图\/模式进度矛盾/);
  });

  it('closes catalog completion against dynamic challenge totals and aggregate targets', () => {
    const completeProgress = progress({
      collectedWeaponCount: 20,
      weaponMainResearchProgress: 2_400,
      masteredWeaponCount: 20,
      completedWeaponContextCount: 100,
      collectedMapCount: 2,
      masteredMapSegmentCount: 20,
      completedModeCount: 3,
      completedChallengeCount: 2,
      challengeCount: 2,
      challengeProgress: 7,
      challengeProgressTarget: 7,
    });
    expect(consumeOnce(input({ progressFact: completeProgress, nextGoal: completeGoal() })).snapshot)
      .toMatchObject({ state: 'complete' });
    const emptyChallengeSnapshot = consumeOnce(input({
      progressFact: {
        ...completeProgress,
        completedChallengeCount: 0,
        challengeCount: 0,
        challengeProgress: 0,
        challengeProgressTarget: 0,
      },
      nextGoal: completeGoal(),
    })).snapshot;
    expect(emptyChallengeSnapshot).toMatchObject({
      state: 'complete',
      primaryAction: {
        entryScreenId: 'mode-select',
        labelText: '自由挑战或刷新任意个人记录',
        enabled: true,
      },
      firstViewFacts: expect.arrayContaining([
        expect.objectContaining({
          factId: 'category-progress',
          valueText: '20武器 · 2地图 · 3模式 · 主研究2400/2400 · 情境100/100',
        }),
      ]),
    });
    expect(emptyChallengeSnapshot.firstViewFacts[2]?.valueText).not.toContain('0/0');
    expect(() => consumeOnce(input({
      progressFact: { ...completeProgress, challengeProgress: 6 },
      nextGoal: completeGoal(),
    }))).toThrow(/catalog-complete与未完成的目录进度矛盾/);
  });

  it('rejects mastered weapon totals that do not have all five completed contexts', () => {
    expect(() => consumeOnce(input({
      progressFact: progress({ masteredWeaponCount: 3, completedWeaponContextCount: 14 }),
    }))).toThrow(/每把完整理解武器必须具备五个已完成情境/);
  });

  it('allows effective five-context understanding before the slower 120-use collection threshold', () => {
    const snapshot = consumeOnce(input({
      progressFact: progress({
        collectedWeaponCount: 1,
        weaponMainResearchProgress: 120,
        masteredWeaponCount: 2,
        completedWeaponContextCount: 11,
      }),
    })).snapshot;
    expect(snapshot.firstViewFacts[2]).toMatchObject({
      valueText: '收藏1/20 · 五情境完整2/20 · 主研究120/2400 · 情境11/100',
    });
  });

  it('allows proven route understanding before the whole map is collected', () => {
    const snapshot = consumeOnce(input({
      progressFact: progress({ collectedMapCount: 0, masteredMapSegmentCount: 2 }),
      nextGoal: mapGoal(),
    })).snapshot;
    expect(snapshot.firstViewFacts[2]).toMatchObject({
      valueText: '地图0/2 · 路线2/20',
    });
  });

  it('renders loading, empty, error and future-profile as explicit non-success states', () => {
    const loading = consumeOnce(unavailableInput('loading')).snapshot;
    const empty = consumeOnce(unavailableInput('empty')).snapshot;
    const error = consumeOnce(unavailableInput('error')).snapshot;
    const future = consumeOnce(unavailableInput('future-profile')).snapshot;
    expect(loading).toMatchObject({ state: 'loading', profileIdentity: null, goal: null });
    expect(empty).toMatchObject({ state: 'empty', profileIdentity: null, goal: null });
    expect(error.primaryAction).toMatchObject({
      intentId: 'retry-loading',
      entryScreenId: 'loading',
      labelText: '重试读取收藏档案',
      enabled: true,
    });
    expect(future).toMatchObject({ state: 'future-profile', profileIdentity: null, goal: null });
    expect(future.primaryAction.enabled).toBe(false);
    for (const snapshot of [loading, empty, error, future]) {
      expect(snapshot.firstViewFacts).toHaveLength(1);
      expect(snapshot.firstViewFacts[0]?.factId).toBe('state-message');
      expect(snapshot.fallback).toMatchObject({
        decorativeAssetMissing: true,
        usesTextShapePatternFallback: true,
        programmaticAssetClaimsApproval: false,
      });
    }
  });

  it('preserves long Chinese and English copy under mobile and desktop text-fit contracts', () => {
    const longChinese = '下一把武器需要在哪一种真实对局情境中继续建立可验证理解？'.repeat(6);
    const mobile = consumeOnce(input({
      nextGoal: weaponGoal({ question: longChinese, actionLabel: '打开武器详情并核对下一局目标'.repeat(5) }),
      reducedMotion: true,
      muted: true,
    })).snapshot;
    const longEnglish = 'Which map route should be understood next without turning this screen into a nested dashboard? '.repeat(4);
    const desktop = consumeOnce(input({
      locale: 'en-US',
      nextGoal: mapGoal({ question: longEnglish, actionLabel: 'Open the selected map and review the next route objective.' }),
      viewport: {
        width: 1440,
        height: 900,
        safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    })).snapshot;
    expect(mobile.goal?.question).toBe(longChinese);
    expect(mobile.textFit).toMatchObject({
      questionMaxLines: 3,
      primaryActionMaxLines: 2,
      minimumBodyFontCssPixels: 16,
      overflowPolicy: 'wrap-then-ellipsis-preserve-accessibility-text',
      screenshotEvidence: 'not-run',
    });
    expect(mobile.accessibility).toMatchObject({
      motionPolicy: 'none-static-state-change',
      visualDependsOnAudioPlayback: false,
      silentEquivalentComplete: true,
    });
    expect(desktop.goal?.question).toBe(longEnglish);
    expect(desktop.layout.viewportKind).toBe('desktop-1440x900');
    expect(desktop.textFit).toMatchObject({ questionMaxLines: 2, primaryActionMaxLines: 1 });
    expect(desktop.layout.primaryActionRect.height).toBeGreaterThanOrEqual(48);
    expect(desktop.layout.horizontalOverflowAllowed).toBe(false);
  });

  it('keeps 200 hours as a deferred static hypothesis rather than a retention promise', () => {
    const { snapshot } = consumeOnce(input());
    expect(snapshot.capacityDisclosure).toEqual({
      weaponCount: 20,
      mapCount: 2,
      mapSegmentCount: 20,
      modeCount: 3,
      challengeCount: 20,
      characterIdentityCount: 6,
      staticCapacityHours: 200,
      evidenceKind: 'capacity-hypothesis',
      longitudinalEvidence: 'not-run',
      isRetentionGuarantee: false,
      addsCharacterFunction: false,
      firstViewFact: false,
    });
    expect(() => consumeOnce(input({
      catalogFact: { ...ARENA_V2_A6_STATIC_CATALOG_FACT_V1, staticCapacityHours: 201 },
    }))).toThrow(/漂移/);
  });

  it('rejects same-tick conflict, tick rollback and same-revision fact drift before commit', () => {
    const view = new ArenaV2CollectionNextGoalFirstScreenCandidateV1({ epochId: 'profile-epoch-1' });
    const firstInput = input();
    const first = view.consume(firstInput);
    expect(view.consume(firstInput)).toBe(first);
    expect(() => view.consume(input({ muted: true }))).toThrow(/同tick/);
    expect(view.getSnapshot()).toBe(first);
    expect(() => view.consume(input({ tick: 19 }))).toThrow(/tick回退/);
    expect(() => view.consume(input({
      tick: 21,
      progressFact: progress({ collectedWeaponCount: 9 }),
    }))).toThrow(/相同Profile revision/);
    expect(view.getSnapshot()).toBe(first);
    const next = view.consume(input({
      tick: 21,
      progressFact: progress({ profileRevision: 8, collectedWeaponCount: 9 }),
      nextGoal: weaponGoal({ profileRevision: 8 }),
    }));
    expect(next.profileIdentity?.profileRevision).toBe(8);
    view.destroy();
  });

  it('rejects profile identity drift and malformed goal identity without replacing the last snapshot', () => {
    const view = new ArenaV2CollectionNextGoalFirstScreenCandidateV1({ epochId: 'profile-epoch-1' });
    const first = view.consume(input());
    expect(() => view.consume(input({
      tick: 21,
      progressFact: progress({ profileId: 'other-profile', profileRevision: 8 }),
      nextGoal: weaponGoal({ profileRevision: 8 }),
    }))).toThrow(/Profile身份漂移/);
    expect(() => view.consume(input({
      tick: 21,
      nextGoal: weaponGoal({ mapDefinitionId: MAP_ID }),
    }))).toThrow(/身份不闭合/);
    expect(view.getSnapshot()).toBe(first);
    view.destroy();
  });

  it('rejects getter, thenable, extra field and future schema without executing hostile data', () => {
    const getterInput = input() as unknown as Record<string, unknown>;
    let getterCalls = 0;
    Object.defineProperty(getterInput, 'tick', {
      configurable: true,
      enumerable: true,
      get: () => { getterCalls += 1; return 20; },
    });
    const view = new ArenaV2CollectionNextGoalFirstScreenCandidateV1({ epochId: 'profile-epoch-1' });
    expect(() => view.consume(getterInput)).toThrow(/getter\/setter/);
    expect(getterCalls).toBe(0);
    expect(() => view.consume({ ...input(), then: () => undefined })).toThrow(/thenable/);
    expect(() => view.consume({ ...input(), futureField: true })).toThrow(/exact-key/);
    expect(() => view.consume({ ...input(), schemaVersion: 2 })).toThrow(/schema 1/);
    expect(view.getSnapshot()).toBeNull();
    view.destroy();
  });

  it('requires explicit epoch reset, accepts a new identity afterward and destroys idempotently', () => {
    const view = new ArenaV2CollectionNextGoalFirstScreenCandidateV1({ epochId: 'profile-epoch-1' });
    view.consume(input());
    expect(() => view.consume(input({ epochId: 'profile-epoch-2', tick: 0 }))).toThrow(/epochId漂移/);
    expect(() => view.resetPresentationEpoch({ epochId: 'profile-epoch-1' })).toThrow(/新epochId/);
    view.resetPresentationEpoch({ epochId: 'profile-epoch-2' });
    expect(view.getSnapshot()).toBeNull();
    expect(view.consume(input({
      epochId: 'profile-epoch-2',
      tick: 0,
      progressFact: progress({ profileId: 'replacement-profile', profileRevision: 0 }),
      nextGoal: weaponGoal({ profileRevision: 0 }),
    }))).toMatchObject({ epochId: 'profile-epoch-2', tick: 0 });
    view.destroy();
    view.destroy();
    expect(view.state).toBe(ARENA_V2_A6_COLLECTION_NEXT_GOAL_VIEW_STATE_V1.DESTROYED);
    expect(() => view.getSnapshot()).toThrow(/destroyed/);
    expect(() => view.consume(input())).toThrow(/destroyed/);
  });
});
