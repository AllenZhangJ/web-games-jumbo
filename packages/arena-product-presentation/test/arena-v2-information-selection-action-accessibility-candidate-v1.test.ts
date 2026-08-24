import { describe, expect, it } from 'vitest';
import {
  addArenaV2InformationCompetitivePreparationLinksToRenderPlanCandidateV1,
  addArenaV2InformationDetailAdjacentBrowseToRenderPlanCandidateV1,
  addArenaV2InformationDetailDirectoryLinkToRenderPlanCandidateV1,
  addArenaV2InformationModeCharacterLinkToRenderPlanCandidateV1,
  addArenaV2InformationModePreparationLinkToRenderPlanCandidateV1,
  addArenaV2InformationPreparationDetailReturnToRenderPlanCandidateV1,
  addArenaV2InformationSelectionToRenderPlanCandidateV1,
  addArenaV2InformationSurvivalPreparationLinksToRenderPlanCandidateV1,
  ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1,
  type ArenaV2UiRenderPlanV1,
  type ArenaV2UiRenderPrimitiveV1,
} from '../src/index.js';

function basePlan(identity: 'mode-select' | 'weapon-index'): ArenaV2UiRenderPlanV1 {
  return Object.freeze({
    schemaVersion: 1,
    surfaceKind: 'information',
    identity,
    revision: 1,
    status: 'layout-candidate',
    productionReady: false,
    primitives: Object.freeze([]),
    scrollRegion: Object.freeze({
      viewport: Object.freeze({ x: 16, y: 100, width: 358, height: 600 }),
      contentHeight: 0,
      verticalScrollRequired: false,
    }),
    liveAnnouncements: Object.freeze([]),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: Object.freeze([] as const),
  });
}

function modePlan(): ArenaV2UiRenderPlanV1 {
  const target = Object.freeze({ x: 16, y: 420, width: 358, height: 68 });
  const viewport = Object.freeze({ x: 16, y: 100, width: 358, height: 600 });
  return Object.freeze({
    ...basePlan('mode-select'),
    primitives: Object.freeze([
      Object.freeze({
        kind: 'panel' as const,
        id: 'first:character-entry:panel',
        rect: Object.freeze({ x: 16, y: 280, width: 358, height: 68 }),
        clipRect: viewport,
        tone: 'surface' as const,
        cornerRadiusCssPixels: 12,
        zIndex: 1,
      }),
      Object.freeze({
        kind: 'text' as const,
        id: 'first:character-entry:label',
        rect: Object.freeze({ x: 28, y: 290, width: 334, height: 20 }),
        clipRect: viewport,
        text: '角色',
        accessibilityText: '角色',
        tone: 'secondary' as const,
        role: 'label' as const,
        alignment: 'left' as const,
        maximumLines: 1,
        fixedWidthNumeric: false,
        zIndex: 2,
      }),
      Object.freeze({
        kind: 'text' as const,
        id: 'first:character-entry:value',
        rect: Object.freeze({ x: 28, y: 312, width: 334, height: 26 }),
        clipRect: viewport,
        text: '当前角色：均衡',
        accessibilityText: '当前角色：均衡',
        tone: 'strong' as const,
        role: 'value' as const,
        alignment: 'left' as const,
        maximumLines: 2,
        fixedWidthNumeric: false,
        zIndex: 2,
      }),
      Object.freeze({
        kind: 'panel' as const,
        id: 'deferred:preparation-entry:panel',
        rect: target,
        clipRect: viewport,
        tone: 'muted' as const,
        cornerRadiusCssPixels: 12,
        zIndex: 1,
      }),
      Object.freeze({
        kind: 'text' as const,
        id: 'deferred:preparation-entry:label',
        rect: Object.freeze({ x: 28, y: 430, width: 334, height: 20 }),
        clipRect: viewport,
        text: '对局准备',
        accessibilityText: '对局准备',
        tone: 'secondary' as const,
        role: 'label' as const,
        alignment: 'left' as const,
        maximumLines: 1,
        fixedWidthNumeric: false,
        zIndex: 2,
      }),
      Object.freeze({
        kind: 'text' as const,
        id: 'deferred:preparation-entry:value',
        rect: Object.freeze({ x: 28, y: 452, width: 334, height: 26 }),
        clipRect: viewport,
        text: '当前组合：回旋短棍 × 断层回廊',
        accessibilityText: '当前组合：回旋短棍，断层回廊',
        tone: 'secondary' as const,
        role: 'value' as const,
        alignment: 'left' as const,
        maximumLines: 2,
        fixedWidthNumeric: false,
        zIndex: 2,
      }),
      Object.freeze({
        kind: 'action' as const,
        id: 'primary-action',
        rect: Object.freeze({ x: 16, y: 720, width: 358, height: 52 }),
        clipRect: null,
        intentId: 'start-selected-mode',
        label: '开始这一局',
        accessibilityText: '开始这一局',
        enabled: true,
        disabledReason: null,
        minimumTouchTargetCssPixels: 48 as const,
        tone: 'primary' as const,
        zIndex: 4,
      }),
    ]),
    scrollRegion: Object.freeze({
      viewport,
      contentHeight: 388,
      verticalScrollRequired: false,
    }),
  });
}

function competitivePreparationPlan(): ArenaV2UiRenderPlanV1 {
  const viewport = Object.freeze({ x: 16, y: 100, width: 358, height: 600 });
  const fieldIds = ['character-entry', 'weapon-entry', 'map-entry'] as const;
  const primitives: ArenaV2UiRenderPrimitiveV1[] = fieldIds.flatMap((fieldId, index) => {
    const target = Object.freeze({
      x: 16,
      y: 350 + index * 78,
      width: 358,
      height: 68,
    });
    return [
      Object.freeze({
        kind: 'panel' as const,
        id: `deferred:${fieldId}:panel`,
        rect: target,
        clipRect: viewport,
        tone: 'muted' as const,
        cornerRadiusCssPixels: 12,
        zIndex: 1,
      }),
      Object.freeze({
        kind: 'text' as const,
        id: `deferred:${fieldId}:label`,
        rect: Object.freeze({ x: 28, y: target.y + 10, width: 334, height: 20 }),
        clipRect: viewport,
        text: fieldId,
        accessibilityText: fieldId,
        tone: 'secondary' as const,
        role: 'label' as const,
        alignment: 'left' as const,
        maximumLines: 1,
        fixedWidthNumeric: false,
        zIndex: 2,
      }),
    ];
  });
  primitives.push(Object.freeze({
    kind: 'action' as const,
    id: 'primary-action',
    rect: Object.freeze({ x: 16, y: 720, width: 358, height: 52 }),
    clipRect: null,
    intentId: 'start-prepared-match',
    label: '开始比赛',
    accessibilityText: '开始比赛',
    enabled: true,
    disabledReason: null,
    minimumTouchTargetCssPixels: 48 as const,
    tone: 'primary' as const,
    zIndex: 4,
  }));
  return Object.freeze({
    ...basePlan('mode-select'),
    identity: 'match-prep',
    primitives: Object.freeze(primitives),
    scrollRegion: Object.freeze({
      viewport,
      contentHeight: 484,
      verticalScrollRequired: false,
    }),
  });
}

function survivalPreparationPlan(): ArenaV2UiRenderPlanV1 {
  const viewport = Object.freeze({ x: 16, y: 100, width: 358, height: 600 });
  return Object.freeze({
    ...basePlan('mode-select'),
    identity: 'survival-prep',
    primitives: Object.freeze([
      Object.freeze({
        kind: 'action' as const,
        id: 'primary-action',
        rect: Object.freeze({ x: 16, y: 720, width: 358, height: 52 }),
        clipRect: null,
        intentId: 'start-survival',
        label: '开始生存',
        accessibilityText: '开始生存',
        enabled: true,
        disabledReason: null,
        minimumTouchTargetCssPixels: 48 as const,
        tone: 'primary' as const,
        zIndex: 4,
      }),
    ]),
    scrollRegion: Object.freeze({
      viewport,
      contentHeight: 520,
      verticalScrollRequired: false,
    }),
  });
}

function detailPlan(identity: 'weapon-detail' | 'map-detail'): ArenaV2UiRenderPlanV1 {
  return Object.freeze({
    ...basePlan('mode-select'),
    identity,
    primitives: Object.freeze([
      Object.freeze({
        kind: 'text' as const,
        id: 'page-question',
        rect: Object.freeze({ x: 16, y: 100, width: 358, height: 72 }),
        clipRect: Object.freeze({ x: 16, y: 100, width: 358, height: 600 }),
        text: '详情问题',
        accessibilityText: '详情问题',
        tone: 'strong' as const,
        role: 'question' as const,
        alignment: 'left' as const,
        maximumLines: 3,
        fixedWidthNumeric: false,
        zIndex: 2,
      }),
      Object.freeze({
        kind: 'action' as const,
        id: 'primary-action',
        rect: Object.freeze({ x: 16, y: 720, width: 358, height: 52 }),
        clipRect: null,
        intentId: identity === 'weapon-detail'
          ? 'use-selected-weapon-next-match'
          : 'use-selected-map-next-match',
        label: '选择模式',
        accessibilityText: '选择模式',
        enabled: true,
        disabledReason: null,
        minimumTouchTargetCssPixels: 48 as const,
        tone: 'primary' as const,
        zIndex: 4,
      }),
    ]),
  });
}

describe('Arena V2 information selection action accessibility candidate V1', () => {
  it('keeps decisive mode rules on the focusable selection action', () => {
    const plan = addArenaV2InformationSelectionToRenderPlanCandidateV1(
      basePlan('mode-select'),
      {
        kind: 'mode',
        selectedId: 'duel',
        items: ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items,
      },
    );
    expect(plan.primitives.find(({ id }) => id === 'selection:mode:race:action'))
      .toMatchObject({
        kind: 'action',
        accessibilityText: `选择竞速。${
          ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items[1]!.description
        }`,
      });
    expect(plan.primitives.find(({ id }) => id === 'selection:mode:duel:action'))
      .toMatchObject({
        kind: 'action',
        accessibilityText: `常规1v1。${
          ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items[0]!.description
        }。已选择`,
      });
    expect(plan.primitives.find(({ id }) => id === 'selection:mode:survival:panel'))
      .toMatchObject({ kind: 'panel', rect: { height: 112 } });
    expect(plan.primitives.find(({ id }) => id === 'selection:mode:survival:description'))
      .toMatchObject({ kind: 'text', maximumLines: 3 });
    expect(plan.liveAnnouncements.at(-1)).toBe(
      `当前选择常规1v1。${ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items[0]!
        .description.replace(/。$/u, '')}。`,
    );
  });

  it('keeps the description and unavailable reason together', () => {
    const items = Array.from({ length: 20 }, (_, index) => Object.freeze({
      id: `weapon-${index + 1}`,
      label: `武器${index + 1}`,
      description: `研究进度${index + 1}/120`,
      available: index !== 1,
      unavailableReason: index === 1 ? '尚未进入当前可玩武器池' : null,
    }));
    const plan = addArenaV2InformationSelectionToRenderPlanCandidateV1(
      basePlan('weapon-index'),
      { kind: 'weapon', selectedId: 'weapon-1', items },
    );
    expect(plan.primitives.find(({ id }) => id === 'selection:weapon:weapon-2:action'))
      .toMatchObject({
        kind: 'action',
        enabled: false,
        accessibilityText: '武器2。研究进度2/120。尚未进入当前可玩武器池',
      });
  });

  it('rejects sparse and accessor selection inputs without executing accessors', () => {
    const sparseItems = new Array(3);
    sparseItems[0] = ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items[0];
    sparseItems[2] = ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items[2];
    expect(() => addArenaV2InformationSelectionToRenderPlanCandidateV1(
      basePlan('mode-select'),
      { kind: 'mode', selectedId: 'duel', items: sparseItems },
    )).toThrow(/空槽|访问器/);

    let itemAccessorReads = 0;
    const accessorItems = [...ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items];
    Object.defineProperty(accessorItems, '1', {
      enumerable: true,
      get: () => {
        itemAccessorReads += 1;
        return ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items[1];
      },
    });
    expect(() => addArenaV2InformationSelectionToRenderPlanCandidateV1(
      basePlan('mode-select'),
      { kind: 'mode', selectedId: 'duel', items: accessorItems },
    )).toThrow(/空槽|访问器/);
    expect(itemAccessorReads).toBe(0);

    let fieldAccessorReads = 0;
    const accessorItem: Record<string, unknown> = {
      id: 'duel',
      label: '常规1v1',
    };
    Object.defineProperty(accessorItem, 'description', {
      enumerable: true,
      get: () => {
        fieldAccessorReads += 1;
        return '对战';
      },
    });
    expect(() => addArenaV2InformationSelectionToRenderPlanCandidateV1(
      basePlan('mode-select'),
      {
        kind: 'mode',
        selectedId: 'duel',
        items: [
          accessorItem,
          ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items[1],
          ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items[2],
        ],
      },
    )).toThrow(/数据字段/);
    expect(fieldAccessorReads).toBe(0);
  });

  it('adds one optional preparation route while preserving direct start', () => {
    const selectionPlan = addArenaV2InformationSelectionToRenderPlanCandidateV1(
      modePlan(),
      {
        kind: 'mode',
        selectedId: 'duel',
        items: ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items,
      },
    );
    const plan = addArenaV2InformationModePreparationLinkToRenderPlanCandidateV1(
      selectionPlan,
      'duel',
    );
    expect(plan.primitives.find(({ id }) => id === 'secondary:mode-preparation:action'))
      .toMatchObject({
        kind: 'action',
        intentId: 'arena.v2.mode-preparation-link.match-prep',
        minimumTouchTargetCssPixels: 48,
        tone: 'transparent',
      });
    expect(plan.primitives.find(({ id }) => id === 'deferred:preparation-entry:label'))
      .toMatchObject({ kind: 'text', text: '对局准备 · 查看规则 ›' });
    expect(plan.primitives.filter(({ id }) => id === 'primary-action')).toHaveLength(1);
    expect(plan.primitives.find(({ id }) => id === 'primary-action')).toMatchObject({
      intentId: 'start-selected-mode',
      label: '开始这一局',
    });
  });

  it('routes survival to its existing preparation page', () => {
    const selectionPlan = addArenaV2InformationSelectionToRenderPlanCandidateV1(
      modePlan(),
      {
        kind: 'mode',
        selectedId: 'survival',
        items: ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items,
      },
    );
    const plan = addArenaV2InformationModePreparationLinkToRenderPlanCandidateV1(
      selectionPlan,
      'survival',
    );
    expect(plan.primitives.find(({ id }) => id === 'secondary:mode-preparation:action'))
      .toMatchObject({
        intentId: 'arena.v2.mode-preparation-link.survival-prep',
        accessibilityText: '查看生存规则详情；主按钮仍可直接开始生存',
      });
  });

  it('opens the optional six-character selection and preserves the primary action', () => {
    const selectionPlan = addArenaV2InformationSelectionToRenderPlanCandidateV1(
      modePlan(),
      {
        kind: 'mode',
        selectedId: 'race',
        items: ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items,
      },
    );
    const preparationPlan = addArenaV2InformationModePreparationLinkToRenderPlanCandidateV1(
      selectionPlan,
      'race',
    );
    const plan = addArenaV2InformationModeCharacterLinkToRenderPlanCandidateV1(
      preparationPlan,
    );
    expect(plan.identity).toBe('mode-select:selection-mode');
    expect(plan.primitives.find(({ id }) => id === 'secondary:mode-character:action'))
      .toMatchObject({
        kind: 'action',
        intentId: 'arena.v2.mode-character-link.character-select',
        accessibilityText: '打开六角色选择；保存后返回当前模式',
        minimumTouchTargetCssPixels: 48,
        tone: 'transparent',
      });
    expect(plan.primitives.find(({ id }) => id === 'first:character-entry:label'))
      .toMatchObject({ kind: 'text', text: '角色 · 更换 ›' });
    expect(plan.primitives.filter(({ id }) => id === 'primary-action')).toHaveLength(1);
    expect(plan.primitives.find(({ id }) => id === 'primary-action')).toMatchObject({
      intentId: 'start-selected-mode',
    });
  });

  it('keeps competitive preparation direct start and adds three optional details', () => {
    const plan = addArenaV2InformationCompetitivePreparationLinksToRenderPlanCandidateV1(
      competitivePreparationPlan(),
    );
    expect(plan.identity).toBe('match-prep');
    expect(plan.primitives.find(
      ({ id }) => id === 'secondary:competitive-preparation:character-entry:action',
    )).toMatchObject({
      intentId: 'arena.v2.competitive-preparation-link.character-select',
      minimumTouchTargetCssPixels: 48,
    });
    expect(plan.primitives.find(
      ({ id }) => id === 'secondary:competitive-preparation:weapon-entry:action',
    )).toMatchObject({
      intentId: 'arena.v2.competitive-preparation-link.weapon-detail',
    });
    expect(plan.primitives.find(
      ({ id }) => id === 'secondary:competitive-preparation:map-entry:action',
    )).toMatchObject({
      intentId: 'arena.v2.competitive-preparation-link.map-detail',
    });
    expect(plan.primitives.find(
      ({ id }) => id === 'secondary:competitive-preparation:return-mode:action',
    )).toMatchObject({
      intentId: 'arena.v2.competitive-preparation-link.mode-select',
      accessibilityText: '返回模式选择，不开始比赛',
    });
    expect(plan.scrollRegion?.contentHeight).toBe(544);
    expect(plan.primitives.filter(({ id }) => id === 'primary-action')).toHaveLength(1);
    expect(plan.primitives.find(({ id }) => id === 'primary-action')).toMatchObject({
      intentId: 'start-prepared-match',
    });
  });

  it('keeps survival unarmed start and exposes collection-only optional routes', () => {
    const source = survivalPreparationPlan();
    const plan = addArenaV2InformationSurvivalPreparationLinksToRenderPlanCandidateV1(
      source,
    );
    expect(plan.identity).toBe('survival-prep');
    expect(plan.scrollRegion?.contentHeight).toBe(636);
    expect(plan.scrollRegion?.verticalScrollRequired).toBe(true);
    expect(plan.primitives.find(
      ({ id }) => id === 'secondary:survival-preparation:mode:action',
    )).toMatchObject({
      intentId: 'arena.v2.survival-preparation-link.mode-select',
      accessibilityText: '返回模式选择，不开始生存',
    });
    expect(plan.primitives.find(
      ({ id }) => id === 'secondary:survival-preparation:character:action',
    )).toMatchObject({
      intentId: 'arena.v2.survival-preparation-link.character-select',
      minimumTouchTargetCssPixels: 48,
    });
    expect(plan.primitives.find(
      ({ id }) => id === 'secondary:survival-preparation:weapons:action',
    )).toMatchObject({
      intentId: 'arena.v2.survival-preparation-link.weapon-index',
      accessibilityText: '查看武器收藏；生存仍然空手开局并在场上拾取',
    });
    expect(plan.primitives.find(
      ({ id }) => id === 'secondary:survival-preparation:map:action',
    )).toMatchObject({
      intentId: 'arena.v2.survival-preparation-link.map-detail',
    });
    expect(plan.primitives.filter(({ id }) => id === 'primary-action')).toHaveLength(1);
    expect(plan.primitives.find(({ id }) => id === 'primary-action')).toMatchObject({
      intentId: 'start-survival',
    });
  });

  it('relabels only a retained preparation detail primary action', () => {
    const weapon = addArenaV2InformationPreparationDetailReturnToRenderPlanCandidateV1(
      detailPlan('weapon-detail'),
      'match-prep',
    );
    expect(weapon.primitives.find(({ id }) => id === 'primary-action')).toMatchObject({
      intentId: 'use-selected-weapon-next-match',
      label: '返回竞技准备',
      accessibilityText: '返回竞技准备，保留当前选择',
    });
    const map = addArenaV2InformationPreparationDetailReturnToRenderPlanCandidateV1(
      detailPlan('map-detail'),
      'survival-prep',
    );
    expect(map.primitives.find(({ id }) => id === 'primary-action')).toMatchObject({
      intentId: 'use-selected-map-next-match',
      label: '返回生存准备',
    });
    expect(() => addArenaV2InformationPreparationDetailReturnToRenderPlanCandidateV1(
      detailPlan('weapon-detail'),
      'survival-prep',
    )).toThrow(/不能通过详情主动作携带预选武器/);
  });

  it('adds one directory return without replacing the detail primary action', () => {
    const returnedWeapon = addArenaV2InformationPreparationDetailReturnToRenderPlanCandidateV1(
      detailPlan('weapon-detail'),
      'match-prep',
    );
    const weapon = addArenaV2InformationDetailDirectoryLinkToRenderPlanCandidateV1(
      returnedWeapon,
    );
    expect(weapon.primitives.find(
      ({ id }) => id === 'secondary:detail:return-directory:action',
    )).toMatchObject({
      intentId: 'arena.v2.detail-directory-link.weapon-index',
      label: '返回武器库',
      accessibilityText: '返回武器库，不改变当前选择',
      minimumTouchTargetCssPixels: 48,
    });
    expect(weapon.primitives.filter(({ id }) => id === 'primary-action')).toHaveLength(1);
    expect(weapon.primitives.find(({ id }) => id === 'page-question')).toMatchObject({
      kind: 'text',
      text: '武器乙｜详情问题',
      accessibilityText: '当前浏览武器：武器乙。详情问题',
      role: 'question',
    });
    expect(weapon.primitives.find(({ id }) => id === 'primary-action')).toMatchObject({
      label: '返回竞技准备',
      intentId: 'use-selected-weapon-next-match',
    });

    const map = addArenaV2InformationDetailDirectoryLinkToRenderPlanCandidateV1(
      detailPlan('map-detail'),
    );
    expect(map.primitives.find(
      ({ id }) => id === 'secondary:detail:return-directory:action',
    )).toMatchObject({
      intentId: 'arena.v2.detail-directory-link.map-index',
      label: '返回地图库',
    });
    expect(map.primitives.find(({ id }) => id === 'primary-action')).toMatchObject({
      label: '选择模式',
      intentId: 'use-selected-map-next-match',
    });
  });

  it('browses adjacent active weapons and the other map without adding a primary action', () => {
    const weapon = addArenaV2InformationDetailAdjacentBrowseToRenderPlanCandidateV1(
      detailPlan('weapon-detail'),
      {
        kind: 'weapon',
        selectedDefinitionId: 'weapon-b',
        orderedItems: [
          { definitionId: 'weapon-a', displayName: '武器甲' },
          { definitionId: 'weapon-b', displayName: '武器乙' },
          { definitionId: 'weapon-c', displayName: '武器丙' },
        ],
      },
    );
    expect(weapon.identity).toBe('weapon-detail:browse-weapon:weapon-b');
    expect(weapon.primitives.filter(({ id }) => id === 'primary-action')).toHaveLength(1);
    expect(weapon.primitives.find(
      ({ id }) => id === 'secondary:detail:browse-position',
    )).toMatchObject({
      kind: 'text',
      text: '武器 2 / 3',
      accessibilityText: '当前浏览武器乙，第2项，共3项',
      alignment: 'right',
      fixedWidthNumeric: true,
    });
    expect(weapon.primitives.find(
      ({ id }) => id === 'secondary:detail:adjacent:previous:action',
    )).toMatchObject({
      intentId: 'arena.v2.detail-adjacent.weapon.weapon-a',
      label: '上把·武器甲',
      accessibilityText: '上一把武器：武器甲',
      minimumTouchTargetCssPixels: 48,
    });
    expect(weapon.primitives.find(
      ({ id }) => id === 'secondary:detail:adjacent:next:action',
    )).toMatchObject({
      intentId: 'arena.v2.detail-adjacent.weapon.weapon-c',
      label: '下把·武器丙',
      accessibilityText: '下一把武器：武器丙',
    });

    const map = addArenaV2InformationDetailAdjacentBrowseToRenderPlanCandidateV1(
      detailPlan('map-detail'),
      {
        kind: 'map',
        selectedDefinitionId: 'map-a',
        orderedItems: [
          { definitionId: 'map-a', displayName: '地图甲' },
          { definitionId: 'map-b', displayName: '地图乙' },
        ],
      },
    );
    expect(map.primitives.filter(
      ({ id }) => id.startsWith('secondary:detail:adjacent:'),
    )).toHaveLength(1);
    expect(map.primitives.find(({ id }) => id === 'page-question')).toMatchObject({
      kind: 'text',
      text: '地图甲｜详情问题',
      accessibilityText: '当前浏览地图：地图甲。详情问题',
      role: 'question',
    });
    expect(map.primitives.find(
      ({ id }) => id === 'secondary:detail:adjacent:other:action',
    )).toMatchObject({
      intentId: 'arena.v2.detail-adjacent.map.map-b',
      label: '另一张·地图乙',
      accessibilityText: '另一张地图：地图乙',
    });
    expect(map.primitives.find(
      ({ id }) => id === 'secondary:detail:browse-position',
    )).toMatchObject({ text: '地图 1 / 2' });

    const singleWeapon = addArenaV2InformationDetailAdjacentBrowseToRenderPlanCandidateV1(
      detailPlan('weapon-detail'),
      {
        kind: 'weapon',
        selectedDefinitionId: 'weapon-only',
        orderedItems: [{ definitionId: 'weapon-only', displayName: '唯一武器' }],
      },
    );
    expect(singleWeapon.primitives.filter(
      ({ id }) => id.startsWith('secondary:detail:adjacent:'),
    )).toHaveLength(0);
    expect(singleWeapon.primitives.find(
      ({ id }) => id === 'secondary:detail:browse-position',
    )).toMatchObject({ text: '武器 1 / 1' });
  });

  it('rejects sparse and accessor adjacent browse inputs without executing accessors', () => {
    const sparseItems = new Array(2);
    sparseItems[0] = { definitionId: 'map-a', displayName: '地图甲' };
    expect(() => addArenaV2InformationDetailAdjacentBrowseToRenderPlanCandidateV1(
      detailPlan('map-detail'),
      { kind: 'map', selectedDefinitionId: 'map-a', orderedItems: sparseItems },
    )).toThrow(/空槽|访问器/);

    let indexAccessorReads = 0;
    const accessorItems = [{ definitionId: 'map-a', displayName: '地图甲' }];
    accessorItems.length = 2;
    Object.defineProperty(accessorItems, '1', {
      enumerable: true,
      get: () => {
        indexAccessorReads += 1;
        return { definitionId: 'map-b', displayName: '地图乙' };
      },
    });
    expect(() => addArenaV2InformationDetailAdjacentBrowseToRenderPlanCandidateV1(
      detailPlan('map-detail'),
      { kind: 'map', selectedDefinitionId: 'map-a', orderedItems: accessorItems },
    )).toThrow(/空槽|访问器/);
    expect(indexAccessorReads).toBe(0);

    let fieldAccessorReads = 0;
    const accessorItem: Record<string, unknown> = { definitionId: 'map-a' };
    Object.defineProperty(accessorItem, 'displayName', {
      enumerable: true,
      get: () => {
        fieldAccessorReads += 1;
        return '地图甲';
      },
    });
    expect(() => addArenaV2InformationDetailAdjacentBrowseToRenderPlanCandidateV1(
      detailPlan('map-detail'),
      {
        kind: 'map',
        selectedDefinitionId: 'map-a',
        orderedItems: [
          accessorItem,
          { definitionId: 'map-b', displayName: '地图乙' },
        ],
      },
    )).toThrow(/数据字段/);
    expect(fieldAccessorReads).toBe(0);
  });
});
