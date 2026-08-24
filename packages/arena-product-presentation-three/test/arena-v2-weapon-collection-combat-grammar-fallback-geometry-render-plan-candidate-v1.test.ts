import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1,
  type ArenaV2UiRectV1,
  type ArenaV2UiRenderPlanV1,
  type ArenaV2UiRenderPrimitiveV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_COLLECTION_PREVIEW_RENDER_PLAN_LAYOUT_BRIDGE_CANDIDATE_V1,
} from '../src/arena-v2-collection-preview-render-plan-layout-bridge-candidate-v1.js';
import {
  ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1,
  createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1,
} from '../src/arena-v2-collection-semantic-fallback-visual-profile-candidate-v1.js';
import {
  addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1,
  ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_FALLBACK_GEOMETRY_RENDER_PLAN_CANDIDATE_V1,
} from '../src/arena-v2-weapon-collection-combat-grammar-fallback-geometry-render-plan-candidate-v1.js';

const WEAPONS = ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1.entries;

function rect(x: number, y: number, width: number, height: number): ArenaV2UiRectV1 {
  return Object.freeze({ x, y, width, height });
}

function plan(
  identity: string,
  viewport: ArenaV2UiRectV1,
  primitives: readonly ArenaV2UiRenderPrimitiveV1[],
): ArenaV2UiRenderPlanV1 {
  return Object.freeze({
    schemaVersion: 1,
    surfaceKind: 'information',
    identity,
    revision: 1,
    status: 'layout-candidate',
    productionReady: false,
    primitives: Object.freeze(primitives),
    scrollRegion: Object.freeze({
      viewport,
      contentHeight: 16_000,
      verticalScrollRequired: true,
    }),
    liveAnnouncements: Object.freeze([]),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: Object.freeze([] as const),
  });
}

function pair(slotSize: 72 | 96 | 168 | 240): Readonly<{
  source: ArenaV2UiRenderPlanV1;
  composed: ArenaV2UiRenderPlanV1;
}> {
  const viewport = slotSize === 72
    ? rect(16, 16, 358, 680)
    : rect(24, 20, 1392, 720);
  const source: ArenaV2UiRenderPrimitiveV1[] = [];
  const composed: ArenaV2UiRenderPrimitiveV1[] = [];
  WEAPONS.forEach((weapon, index) => {
    const prefix = `selection:weapon:${weapon.weaponDefinitionId}`;
    const sourceCard = rect(viewport.x, viewport.y + index * 132, viewport.width, 112);
    const card = rect(viewport.x, viewport.y + index * (slotSize + 110), viewport.width, slotSize + 96);
    const clipRect = viewport;
    const labelText = `武器${String(index + 1).padStart(2, '0')}`;
    const sourcePanel = Object.freeze({
      kind: 'panel' as const,
      id: `${prefix}:panel`,
      rect: sourceCard,
      clipRect,
      tone: 'surface' as const,
      cornerRadiusCssPixels: 12,
      zIndex: 1,
    });
    const sourceLabel = Object.freeze({
      kind: 'text' as const,
      id: `${prefix}:label`,
      rect: rect(sourceCard.x + 12, sourceCard.y + 10, sourceCard.width - 24, 20),
      clipRect,
      text: labelText,
      accessibilityText: labelText,
      tone: 'strong' as const,
      role: 'label' as const,
      alignment: 'left' as const,
      maximumLines: 1,
      fixedWidthNumeric: false,
      zIndex: 2,
    });
    const sourceDescription = Object.freeze({
      kind: 'text' as const,
      id: `${prefix}:description`,
      rect: rect(sourceCard.x + 12, sourceCard.y + 34, sourceCard.width - 24, 36),
      clipRect,
      text: `既有武器${index + 1}说明`,
      accessibilityText: `既有武器${index + 1}说明`,
      tone: 'secondary' as const,
      role: 'value' as const,
      alignment: 'left' as const,
      maximumLines: 2,
      fixedWidthNumeric: false,
      zIndex: 2,
    });
    const sourceAction = Object.freeze({
      kind: 'action' as const,
      id: `${prefix}:action`,
      rect: sourceCard,
      clipRect,
      intentId: `arena.v2.selection.weapon.${encodeURIComponent(weapon.weaponDefinitionId)}`,
      label: labelText,
      accessibilityText: `选择${labelText}`,
      enabled: true,
      disabledReason: null,
      minimumTouchTargetCssPixels: 48 as const,
      tone: 'primary' as const,
      zIndex: 4,
    });
    source.push(sourcePanel, sourceLabel, sourceDescription, sourceAction);
    const previewRect = rect(card.x + 12, card.y + 12, slotSize, slotSize);
    const outputPanel = Object.freeze({ ...sourcePanel, rect: card });
    const outputLabel = Object.freeze({
      ...sourceLabel,
      rect: rect(card.x + slotSize + 24, card.y + 12, card.width - slotSize - 36, 22),
    });
    const outputDescription = Object.freeze({
      ...sourceDescription,
      rect: rect(card.x + slotSize + 24, card.y + 38, card.width - slotSize - 36, 36),
    });
    const outputAction = Object.freeze({ ...sourceAction, rect: card });
    const profile = ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1.profiles.find(
      (candidate) => candidate.kind === 'weapon'
        && candidate.definitionId === weapon.weaponDefinitionId,
    )!;
    const preview = Object.freeze({
      kind: 'panel' as const,
      id: `formal-preview:weapon:${weapon.weaponDefinitionId}:panel`,
      rect: previewRect,
      clipRect,
      tone: 'muted' as const,
      cornerRadiusCssPixels: 12,
      zIndex: 2,
    });
    const fallback = createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1({
      schemaVersion: 1,
      prefix: `formal-preview:weapon:${weapon.weaponDefinitionId}`,
      rect: previewRect,
      clipRect,
      kind: 'weapon',
      definitionId: weapon.weaponDefinitionId,
      assetId: profile.assetId,
      displayName: labelText,
    });
    const research = Object.freeze({
      kind: 'text' as const,
      id: `${prefix}:main-research`,
      rect: rect(card.x + 10, card.y + slotSize + 20, card.width - 20, 20),
      clipRect,
      text: '主研究 0/120',
      accessibilityText: '主研究进度0/120',
      tone: 'secondary' as const,
      role: 'value' as const,
      alignment: 'left' as const,
      maximumLines: 1,
      fixedWidthNumeric: true,
      zIndex: 3,
    });
    const milestones = Object.freeze({
      ...research,
      id: `${prefix}:main-research-milestones`,
      rect: rect(card.x + 10, card.y + slotSize + 44, card.width - 20, 20),
      text: '30·60·90·120',
      accessibilityText: '主研究里程碑30、60、90、120',
    });
    composed.push(
      outputPanel, outputLabel, outputDescription, outputAction,
      preview, ...fallback, research, milestones,
    );
  });
  return Object.freeze({
    source: plan('weapon-index:selection-weapon', viewport, source),
    composed: plan('weapon-index:selection-weapon:a6.15-preview-aware:test', viewport, composed),
  });
}

function primitive(planValue: ArenaV2UiRenderPlanV1, id: string): ArenaV2UiRenderPrimitiveV1 {
  const value = planValue.primitives.find((candidate) => candidate.id === id);
  if (value === undefined) throw new Error(`武器语法测试夹具缺少${id}。`);
  return value;
}

function corrupt(
  source: ArenaV2UiRenderPlanV1,
  primitives: readonly ArenaV2UiRenderPrimitiveV1[],
): ArenaV2UiRenderPlanV1 {
  return Object.freeze({ ...source, primitives: Object.freeze(primitives) });
}

function inside(container: ArenaV2UiRectV1, child: ArenaV2UiRectV1): boolean {
  return child.x >= container.x
    && child.y >= container.y
    && child.x + child.width <= container.x + container.width
    && child.y + child.height <= container.y + container.height;
}

function geometrySignature(output: ArenaV2UiRenderPlanV1, weaponDefinitionId: string): string {
  const preview = primitive(output, `formal-preview:weapon:${weaponDefinitionId}:panel`);
  if (preview.kind !== 'panel') throw new Error('语法几何夹具无效。');
  return geometrySignatureInRect(output, weaponDefinitionId, preview.rect);
}

function geometrySignatureInRect(
  output: ArenaV2UiRenderPlanV1,
  weaponDefinitionId: string,
  previewRect: ArenaV2UiRectV1,
): string {
  return JSON.stringify([1, 2, 3].map((ordinal) => {
    const panel = primitive(
      output,
      `formal-preview:weapon:${weaponDefinitionId}:fallback-pattern:${ordinal}`,
    );
    if (panel.kind !== 'panel') throw new Error('语法几何夹具无效。');
    return [
      panel.rect.x - previewRect.x,
      panel.rect.y - previewRect.y,
      panel.rect.width,
      panel.rect.height,
      panel.cornerRadiusCssPixels,
    ];
  }));
}

function detailPair(
  slotSize: 200 | 260,
  weaponIndex = 0,
) {
  const weapon = WEAPONS[weaponIndex]!;
  const viewport = slotSize <= 200 ? rect(16, 20, 358, 680) : rect(24, 20, 1392, 720);
  const displayName = `详情武器${weaponIndex + 1}`;
  const question = Object.freeze({
    kind: 'text' as const,
    id: 'page-question',
    rect: rect(viewport.x, viewport.y, viewport.width, 32),
    clipRect: viewport,
    text: '这把武器如何使用？',
    accessibilityText: '这把武器如何使用？',
    tone: 'strong' as const,
    role: 'question' as const,
    alignment: 'left' as const,
    maximumLines: 1,
    fixedWidthNumeric: false,
    zIndex: 2,
  });
  const information = Object.freeze({
    ...question,
    id: 'weapon-detail:information',
    rect: rect(viewport.x, viewport.y + 52, viewport.width, 56),
    text: '既有详情事实',
    accessibilityText: '既有详情事实',
    tone: 'secondary' as const,
    role: 'value' as const,
    maximumLines: 2,
  });
  const action = Object.freeze({
    kind: 'action' as const,
    id: 'primary-action',
    rect: rect(viewport.x, viewport.y + 116, viewport.width, 48),
    clipRect: viewport,
    intentId: 'use-selected-weapon-next-match',
    label: '下局使用',
    accessibilityText: '下局使用这把武器',
    enabled: true,
    disabledReason: null,
    minimumTouchTargetCssPixels: 48 as const,
    tone: 'primary' as const,
    zIndex: 4,
  });
  const outer = rect(
    viewport.x + Math.round((viewport.width - slotSize - 24) / 2),
    viewport.y + 52,
    slotSize + 24,
    slotSize + 68,
  );
  const previewRect = rect(outer.x + 12, outer.y + 44, slotSize, slotSize);
  const panel = Object.freeze({
    kind: 'panel' as const,
    id: `formal-preview:weapon:${weapon.weaponDefinitionId}:panel`,
    rect: outer,
    clipRect: viewport,
    tone: 'surface' as const,
    cornerRadiusCssPixels: 12,
    zIndex: 2,
  });
  const title = Object.freeze({
    ...question,
    id: `formal-preview:weapon:${weapon.weaponDefinitionId}:title`,
    rect: rect(outer.x + 12, outer.y + 12, outer.width - 24, 24),
    text: displayName,
    accessibilityText: displayName,
    role: 'label' as const,
    alignment: 'center' as const,
    zIndex: 3,
  });
  const profile = ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1.profiles.find(
    (candidate) => candidate.kind === 'weapon'
      && candidate.definitionId === weapon.weaponDefinitionId,
  )!;
  const fallback = createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1({
    schemaVersion: 1,
    prefix: `formal-preview:weapon:${weapon.weaponDefinitionId}`,
    rect: previewRect,
    clipRect: viewport,
    kind: 'weapon',
    definitionId: weapon.weaponDefinitionId,
    assetId: profile.assetId,
    displayName,
  });
  const shiftedInformation = Object.freeze({
    ...information,
    rect: rect(information.rect.x, outer.y + outer.height + 16, information.rect.width, information.rect.height),
  });
  const shiftedAction = Object.freeze({
    ...action,
    rect: rect(action.rect.x, shiftedInformation.rect.y + 64, action.rect.width, action.rect.height),
  });
  return Object.freeze({
    source: plan('weapon-detail', viewport, Object.freeze([question, information, action])),
    composed: plan(
      `weapon-detail:a6.15-preview-aware:${slotSize <= 200 ? '390x844' : '1440x900'}`,
      viewport,
      Object.freeze([question, panel, title, ...fallback, shiftedInformation, shiftedAction]),
    ),
    previewRect,
    target: Object.freeze({
      schemaVersion: 1 as const,
      weaponDefinitionId: weapon.weaponDefinitionId,
      displayName,
      previewRect,
      fallbackExpected: true as const,
      currentUniqueGoal: false as const,
    }),
  });
}

describe('Arena V2 A5/A6 weapon collection combat grammar fallback geometry（未运行候选）', () => {
  for (const slotSize of [72, 96, 168, 240] as const) {
    it(`${slotSize}px标准槽重排既有60 panel且保持20武器最终几何唯一`, () => {
      const fixture = pair(slotSize);
      expect(fixture.composed.primitives).toHaveLength(220);
      const output = addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
        fixture.composed,
        fixture.source,
      );
      expect(output.primitives).toHaveLength(220);
      expect(output.primitives.length).toBeLessThanOrEqual(256);
      WEAPONS.forEach(({ weaponDefinitionId }) => {
        const preview = primitive(output, `formal-preview:weapon:${weaponDefinitionId}:panel`);
        if (preview.kind !== 'panel') throw new Error('语法preview测试夹具无效。');
        for (const ordinal of [1, 2, 3]) {
          const panel = primitive(
            output,
            `formal-preview:weapon:${weaponDefinitionId}:fallback-pattern:${ordinal}`,
          );
          if (panel.kind !== 'panel') throw new Error('语法panel测试夹具无效。');
          expect(inside(preview.rect, panel.rect)).toBe(true);
          expect(panel.clipRect).toEqual(preview.clipRect);
        }
      });
      expect(new Set(WEAPONS.map(({ weaponDefinitionId }) => (
        geometrySignature(output, weaponDefinitionId)
      ))).size).toBe(20);
      expect(addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
        output,
        fixture.source,
      )).toBe(output);
    });
  }

  for (const slotSize of [200, 260] as const) {
    it(`weapon-detail ${slotSize}px复用同一重排核心且保持20武器整数几何唯一`, () => {
      const signatures = WEAPONS.map((_, weaponIndex) => {
        const fixture = detailPair(slotSize, weaponIndex);
        const output = addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
          fixture.composed,
          fixture.source,
          fixture.target,
        );
        expect(output.primitives).toHaveLength(fixture.composed.primitives.length);
        expect(output.primitives.length).toBeLessThanOrEqual(256);
        for (const ordinal of [1, 2, 3]) {
          const panel = primitive(
            output,
            `formal-preview:weapon:${fixture.target.weaponDefinitionId}:fallback-pattern:${ordinal}`,
          );
          if (panel.kind !== 'panel') throw new Error('详情语法panel测试夹具无效。');
          expect(inside(fixture.previewRect, panel.rect)).toBe(true);
        }
        expect(addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
          output,
          fixture.source,
          fixture.target,
        )).toBe(output);
        return geometrySignatureInRect(output, fixture.target.weaponDefinitionId, fixture.previewRect);
      });
      expect(new Set(signatures).size).toBe(20);
    });
  }

  it('weapon-detail精确闭合selection、fallback与许可路径且保留既有文字/action', () => {
    const fixture = detailPair(200);
    const output = addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      fixture.composed,
      fixture.source,
      fixture.target,
    );
    expect(primitive(output, 'page-question')).toBe(primitive(fixture.composed, 'page-question'));
    expect(primitive(output, 'weapon-detail:information')).toBe(
      primitive(fixture.composed, 'weapon-detail:information'),
    );
    expect(primitive(output, 'primary-action')).toBe(
      primitive(fixture.composed, 'primary-action'),
    );
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      fixture.composed,
      fixture.source,
      Object.freeze({ ...fixture.target, weaponDefinitionId: WEAPONS[1]!.weaponDefinitionId }),
    )).toThrow(/身份|缺少|未知|闭合/);
    const second = detailPair(200, 1);
    const browseIdentityMismatch = Object.freeze({
      ...second.source,
      identity: `weapon-detail:browse-weapon:${encodeURIComponent(
        fixture.target.weaponDefinitionId
      )}`,
    });
    const browseMismatchComposed = Object.freeze({
      ...second.composed,
      identity: `${browseIdentityMismatch.identity}:a6.15-preview-aware:390x844`,
    });
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      browseMismatchComposed,
      browseIdentityMismatch,
      second.target,
    )).toThrow(/browse identity|当前武器不闭合/);
    const browseIdentityMatch = Object.freeze({
      ...fixture.source,
      identity: `weapon-detail:browse-weapon:${encodeURIComponent(
        fixture.target.weaponDefinitionId
      )}`,
    });
    const browseMatchComposed = Object.freeze({
      ...fixture.composed,
      identity: `${browseIdentityMatch.identity}:a6.15-preview-aware:390x844`,
    });
    expect(addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      browseMatchComposed,
      browseIdentityMatch,
      fixture.target,
    ).primitives).toHaveLength(browseMatchComposed.primitives.length);
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      Object.freeze({
        ...fixture.composed,
        identity: 'weapon-detail:a6.15-preview-aware:unknown-viewport',
      }),
      fixture.source,
      fixture.target,
    )).toThrow(/输入|绑定/);
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      fixture.composed,
      fixture.source,
      Object.freeze({
        ...fixture.target,
        previewRect: rect(fixture.previewRect.x, fixture.previewRect.y, 199, 200),
      }),
    )).toThrow(/输入|绑定/);
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      fixture.composed,
      fixture.source,
      Object.freeze({ ...fixture.target, currentUniqueGoal: true as const }),
    )).toThrow(/标题|当前身份/);
    const firstPattern = `formal-preview:weapon:${fixture.target.weaponDefinitionId}:fallback-pattern:1`;
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      corrupt(fixture.composed, fixture.composed.primitives.filter(({ id }) => id !== firstPattern)),
      fixture.source,
      fixture.target,
    )).toThrow(/精确闭合|partial|必须/);
    const sourceAction = primitive(fixture.composed, 'primary-action');
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      corrupt(fixture.composed, fixture.composed.primitives.map((candidate) => (
        candidate.id === sourceAction.id && candidate.kind === 'action'
          ? Object.freeze({ ...candidate, label: '漂移' })
          : candidate
      ))),
      fixture.source,
      fixture.target,
    )).toThrow(/文字|动作|语义漂移/);
  });

  it('正式获批GLB详情路径原引用返回，地图详情仍是非目标路径', () => {
    const fixture = detailPair(200);
    const prefix = `formal-preview:weapon:${fixture.target.weaponDefinitionId}`;
    const approvedPrimitives = fixture.composed.primitives.filter(({ id }) => (
      !id.startsWith(`${prefix}:fallback`)
    ));
    const transparent = Object.freeze({
      kind: 'panel' as const,
      id: `${prefix}:transparent-center`,
      rect: fixture.previewRect,
      clipRect: fixture.composed.scrollRegion!.viewport,
      tone: 'transparent' as const,
      cornerRadiusCssPixels: 12,
      zIndex: 2,
    });
    const thickness = 2;
    const borders = [
      rect(fixture.previewRect.x, fixture.previewRect.y, fixture.previewRect.width, thickness),
      rect(
        fixture.previewRect.x,
        fixture.previewRect.y + fixture.previewRect.height - thickness,
        fixture.previewRect.width,
        thickness,
      ),
      rect(
        fixture.previewRect.x,
        fixture.previewRect.y + thickness,
        thickness,
        fixture.previewRect.height - thickness * 2,
      ),
      rect(
        fixture.previewRect.x + fixture.previewRect.width - thickness,
        fixture.previewRect.y + thickness,
        thickness,
        fixture.previewRect.height - thickness * 2,
      ),
    ].map((borderRect, index) => Object.freeze({
      kind: 'panel' as const,
      id: `${prefix}:preview-border:${index + 1}`,
      rect: borderRect,
      clipRect: fixture.composed.scrollRegion!.viewport,
      tone: 'secondary' as const,
      cornerRadiusCssPixels: index < 2 ? 2 : 0,
      zIndex: 3,
    }));
    const approved = corrupt(fixture.composed, [...approvedPrimitives, transparent, ...borders]);
    expect(addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      approved,
      fixture.source,
      Object.freeze({ ...fixture.target, fallbackExpected: false as const }),
    )).toBe(approved);
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      corrupt(approved, approved.primitives.map((candidate) => (
        candidate.id === `${prefix}:transparent-center` && candidate.kind === 'panel'
          ? Object.freeze({
            ...candidate,
            rect: Object.freeze({ ...candidate.rect, width: candidate.rect.width - 1 }),
          })
          : candidate
      ))),
      fixture.source,
      Object.freeze({ ...fixture.target, fallbackExpected: false as const }),
    )).toThrow(/透明preview结构/);
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      corrupt(approved, approved.primitives.map((candidate) => (
        candidate.id === `${prefix}:preview-border:1` && candidate.kind === 'panel'
          ? Object.freeze({
            ...candidate,
            rect: Object.freeze({ ...candidate.rect, height: candidate.rect.height + 1 }),
          })
          : candidate
      ))),
      fixture.source,
      Object.freeze({ ...fixture.target, fallbackExpected: false as const }),
    )).toThrow(/透明preview结构/);
    const mapSource = Object.freeze({ ...fixture.source, identity: 'map-detail' });
    expect(addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      fixture.composed,
      mapSource,
    )).toBe(fixture.composed);
  });

  it('保留全部ID、fallback text、选择文字/action/48px与非目标primitive引用', () => {
    const fixture = pair(72);
    const output = addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      fixture.composed,
      fixture.source,
    );
    expect(output.primitives.map(({ id }) => id)).toEqual(
      fixture.composed.primitives.map(({ id }) => id),
    );
    WEAPONS.forEach(({ weaponDefinitionId }) => {
      const prefix = `selection:weapon:${weaponDefinitionId}`;
      for (const suffix of ['panel', 'label', 'description', 'action', 'main-research', 'main-research-milestones']) {
        expect(primitive(output, `${prefix}:${suffix}`)).toBe(
          primitive(fixture.composed, `${prefix}:${suffix}`),
        );
      }
      expect(primitive(output, `${prefix}:action`)).toMatchObject({
        kind: 'action', minimumTouchTargetCssPixels: 48,
      });
      expect(primitive(output, `formal-preview:weapon:${weaponDefinitionId}:fallback`)).toBe(
        primitive(fixture.composed, `formal-preview:weapon:${weaponDefinitionId}:fallback`),
      );
    });
  });

  it('拒绝部分提交、重复ID、未知武器、几何漂移及文字/action漂移', () => {
    const fixture = pair(72);
    const output = addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      fixture.composed,
      fixture.source,
    );
    const first = WEAPONS[0]!.weaponDefinitionId;
    const firstPattern = `formal-preview:weapon:${first}:fallback-pattern:1`;
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      corrupt(output, output.primitives.map((candidate) => (
        candidate.id === firstPattern ? primitive(fixture.composed, firstPattern) : candidate
      ))),
      fixture.source,
    )).toThrow(/部分提交|漂移/);
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      corrupt(fixture.composed, [...fixture.composed.primitives, fixture.composed.primitives[0]!]),
      fixture.source,
    )).toThrow(/重复/);
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      corrupt(fixture.composed, [...fixture.composed.primitives, Object.freeze({
        ...fixture.composed.primitives[0]!, id: 'selection:weapon:unknown:panel',
      })]),
      fixture.source,
    )).toThrow(/未知武器|漂移/);
    const drifted = primitive(fixture.composed, firstPattern);
    if (drifted.kind !== 'panel') throw new Error('几何漂移夹具无效。');
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      corrupt(fixture.composed, fixture.composed.primitives.map((candidate) => (
        candidate.id === firstPattern
          ? Object.freeze({ ...drifted, rect: Object.freeze({ ...drifted.rect, x: drifted.rect.x + 1 }) })
          : candidate
      ))),
      fixture.source,
    )).toThrow(/几何漂移|部分提交/);
    for (const id of [
      `selection:weapon:${first}:label`,
      `selection:weapon:${first}:action`,
      `formal-preview:weapon:${first}:fallback`,
    ]) {
      const target = primitive(fixture.composed, id);
      expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
        corrupt(fixture.composed, fixture.composed.primitives.map((candidate) => (
          candidate.id !== id ? candidate : Object.freeze({
            ...target,
            ...(target.kind === 'action' ? { label: '漂移' } : target.kind === 'text' ? { text: '漂移' } : {}),
          }) as ArenaV2UiRenderPrimitiveV1
        ))),
        fixture.source,
      )).toThrow(/文字|动作|改写/);
    }
  });

  it('非weapon-index原引用返回，预算越界在重排前失败关闭', () => {
    const fixture = pair(72);
    const otherSource = Object.freeze({ ...fixture.source, identity: 'home' });
    expect(addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      fixture.composed,
      otherSource,
    )).toBe(fixture.composed);
    const fillers = Array.from({ length: 37 }, (_, index) => Object.freeze({
      kind: 'panel' as const,
      id: `overflow:${index}`,
      rect: rect(0, index, 1, 1),
      clipRect: null,
      tone: 'muted' as const,
      cornerRadiusCssPixels: 0,
      zIndex: 0,
    }));
    expect(() => addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1(
      corrupt(fixture.composed, [...fixture.composed.primitives, ...fillers]),
      fixture.source,
    )).toThrow(/越界|上限/);
  });

  it('登记零新增primitive、零资源副作用及A6.15组合接线', () => {
    expect(ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_FALLBACK_GEOMETRY_RENDER_PLAN_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        hardGate: false,
        weaponCount: 20,
        fallbackPanelsReshapedPerWeapon: 3,
        reshapedPanelCount: 60,
        detailFallbackPanelsReshapedPerSelectedWeapon: 3,
        addedPrimitiveCount: 0,
        maximumOutputPrimitiveCount: 256,
        preservesFallbackPrimitiveIdsRolesAndText: true,
        preservesSelectionTextActionsAndTouchTargets: true,
        preservesA6_18IntegerPanelDimensions: true,
        preservesA6_18UniqueIntegerPatternWidthsAtStandardSlots: true,
        grammarDimensionsAloneClaimTwentyUniqueWeapons: false,
        officialDefinitionValueDomainsFailClosed: true,
        geometrySignatureFormat: 'a6.18b-primary-secondary-pattern-v1',
        createsResources: false,
        loadsAssetBytes: false,
        createsLeaseOrMount: false,
        weaponIndexWired: true,
        weaponDetailWired: true,
        approvedGltfPathReturnsOriginal: true,
      });
    expect(ARENA_V2_COLLECTION_PREVIEW_RENDER_PLAN_LAYOUT_BRIDGE_CANDIDATE_V1)
      .toMatchObject({
        maximumOutputPrimitiveCount: 256,
        weaponCombatGrammarFallbackGeometryWired: true,
        weaponCombatGrammarFallbackGeometryIndexAndDetailWired: true,
        weaponCombatGrammarFallbackGeometryAddedPrimitiveCount: 0,
        weaponCombatGrammarFallbackPanelsReshaped: 60,
        weaponCombatGrammarFallbackDetailPanelsReshapedPerSelectedWeapon: 3,
      });
  });
});
