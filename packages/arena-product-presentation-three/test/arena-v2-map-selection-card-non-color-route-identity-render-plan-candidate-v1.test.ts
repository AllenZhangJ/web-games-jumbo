import { describe, expect, it } from 'vitest';
import {
  addArenaV2InformationSelectionToRenderPlanCandidateV1,
  ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1,
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
  addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1,
  ARENA_V2_MAP_SELECTION_CARD_NON_COLOR_ROUTE_IDENTITY_RENDER_PLAN_CANDIDATE_V1,
  createArenaV2MapRouteIdentityGeometrySignatureCandidateV1,
} from '../src/arena-v2-map-selection-card-non-color-route-identity-render-plan-candidate-v1.js';

const MAPS = ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1.maps;

function rect(x: number, y: number, width: number, height: number): ArenaV2UiRectV1 {
  return Object.freeze({ x, y, width, height });
}

function basePlan(viewport: ArenaV2UiRectV1): ArenaV2UiRenderPlanV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    surfaceKind: 'information' as const,
    identity: 'map-index',
    revision: 12,
    status: 'layout-candidate' as const,
    productionReady: false as const,
    primitives: Object.freeze([]),
    scrollRegion: Object.freeze({
      viewport,
      contentHeight: 72,
      verticalScrollRequired: false,
    }),
    liveAnnouncements: Object.freeze([]),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: Object.freeze([]) as readonly [],
  });
}

function mapPlan(viewport = rect(16, 16, 358, 680)): ArenaV2UiRenderPlanV1 {
  return addArenaV2InformationSelectionToRenderPlanCandidateV1(
    basePlan(viewport),
    Object.freeze({
      kind: 'map' as const,
      selectedId: MAPS[0]!.mapDefinitionId,
      items: Object.freeze(MAPS.map((map, index) => Object.freeze({
        id: map.mapDefinitionId,
        label: index === 0 ? '地图甲' : '地图乙',
        description: index === 0 ? '既有十二段路线说明' : '既有八段路线说明',
        available: true,
        unavailableReason: null,
      }))),
    }),
  );
}

function primitive(
  plan: ArenaV2UiRenderPlanV1,
  id: string,
): ArenaV2UiRenderPrimitiveV1 {
  const result = plan.primitives.find((value) => value.id === id);
  if (result === undefined) throw new Error(`地图路线身份测试夹具缺少${id}。`);
  return result;
}

function inside(container: ArenaV2UiRectV1, child: ArenaV2UiRectV1): boolean {
  return child.x >= container.x
    && child.y >= container.y
    && child.x + child.width <= container.x + container.width
    && child.y + child.height <= container.y + container.height;
}

function corrupt(
  plan: ArenaV2UiRenderPlanV1,
  primitives: readonly ArenaV2UiRenderPrimitiveV1[],
): ArenaV2UiRenderPlanV1 {
  return Object.freeze({ ...plan, primitives: Object.freeze(primitives) });
}

function routePanels(
  plan: ArenaV2UiRenderPlanV1,
  mapDefinitionId: string,
): readonly Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'panel' }>[] {
  return Object.freeze(['primary', 'secondary', 'tertiary'].map((role) => {
    const value = primitive(
      plan,
      `selection:map:${mapDefinitionId}:non-color-route-identity:${role}`,
    );
    if (value.kind !== 'panel') throw new Error('地图路线身份必须只使用panel。');
    return value;
  }));
}

function signature(
  card: Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'panel' }>,
  panels: readonly Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'panel' }>[],
): string {
  return JSON.stringify(panels.map((panel) => [
    panel.rect.x - card.rect.x,
    panel.rect.y - card.rect.y,
    panel.rect.width,
    panel.rect.height,
    panel.cornerRadiusCssPixels,
  ]));
}

function mapDetailPair(slotSize: 200 | 260, mapIndex = 0) {
  const map = MAPS[mapIndex]!;
  const viewport = slotSize === 200 ? rect(16, 20, 358, 680) : rect(24, 20, 1392, 720);
  const displayName = mapIndex === 0 ? '空港断层' : '折返天梯';
  const question = Object.freeze({
    kind: 'text' as const,
    id: 'page-question',
    rect: rect(viewport.x, viewport.y, viewport.width, 32),
    clipRect: viewport,
    text: '这张地图如何前进？',
    accessibilityText: '这张地图如何前进？',
    tone: 'strong' as const,
    role: 'question' as const,
    alignment: 'left' as const,
    maximumLines: 1,
    fixedWidthNumeric: false,
    zIndex: 2,
  });
  const information = Object.freeze({
    ...question,
    id: 'map-detail:information',
    rect: rect(viewport.x, viewport.y + 52, viewport.width, 56),
    text: '既有地图详情事实',
    accessibilityText: '既有地图详情事实',
    tone: 'secondary' as const,
    role: 'value' as const,
    maximumLines: 2,
  });
  const action = Object.freeze({
    kind: 'action' as const,
    id: 'primary-action',
    rect: rect(viewport.x, viewport.y + 116, viewport.width, 48),
    clipRect: viewport,
    intentId: 'use-selected-map-next-match',
    label: '下局使用',
    accessibilityText: '下局使用这张地图',
    enabled: true,
    disabledReason: null,
    minimumTouchTargetCssPixels: 48 as const,
    tone: 'primary' as const,
    zIndex: 4,
  });
  const sourcePanel = Object.freeze({
    kind: 'panel' as const,
    id: 'map-detail:source-panel',
    rect: rect(viewport.x, viewport.y + 52, viewport.width, 56),
    clipRect: viewport,
    tone: 'surface' as const,
    cornerRadiusCssPixels: 8,
    zIndex: 1,
  });
  const source = Object.freeze({
    ...basePlan(viewport),
    identity: 'map-detail',
    primitives: Object.freeze([question, sourcePanel, information, action]),
    scrollRegion: Object.freeze({ viewport, contentHeight: 520, verticalScrollRequired: false }),
  });
  const outer = rect(
    viewport.x + Math.round((viewport.width - slotSize - 24) / 2),
    viewport.y + 52,
    slotSize + 24,
    slotSize + 68,
  );
  const previewRect = rect(outer.x + 12, outer.y + 44, slotSize, slotSize);
  const prefix = `formal-preview:map:${map.mapDefinitionId}`;
  const panel = Object.freeze({
    kind: 'panel' as const,
    id: `${prefix}:panel`,
    rect: outer,
    clipRect: viewport,
    tone: 'muted' as const,
    cornerRadiusCssPixels: 12,
    zIndex: 2,
  });
  const title = Object.freeze({
    ...question,
    id: `${prefix}:title`,
    rect: rect(outer.x + 12, outer.y + 12, outer.width - 24, 24),
    text: displayName,
    accessibilityText: displayName,
    tone: 'secondary' as const,
    role: 'label' as const,
    alignment: 'center' as const,
    zIndex: 3,
  });
  const profile = ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1.profiles.find(
    (candidate) => candidate.kind === 'map' && candidate.definitionId === map.mapDefinitionId,
  )!;
  const fallback = createArenaV2CollectionSemanticFallbackPrimitivesCandidateV1({
    schemaVersion: 1,
    prefix,
    rect: previewRect,
    clipRect: viewport,
    kind: 'map',
    definitionId: map.mapDefinitionId,
    assetId: profile.assetId,
    displayName,
  });
  const shiftedInformation = Object.freeze({
    ...information,
    rect: rect(information.rect.x, outer.y + outer.height + 16, information.rect.width, information.rect.height),
  });
  const shiftedSourcePanel = Object.freeze({
    ...sourcePanel,
    rect: shiftedInformation.rect,
  });
  const shiftedAction = Object.freeze({
    ...action,
    rect: rect(action.rect.x, shiftedInformation.rect.y + 64, action.rect.width, action.rect.height),
  });
  const composed = Object.freeze({
    ...source,
    identity: `map-detail:a6.15-preview-aware:${slotSize === 200 ? '390x844' : '1440x900'}`,
    primitives: Object.freeze([
      question,
      panel,
      title,
      ...fallback,
      shiftedSourcePanel,
      shiftedInformation,
      shiftedAction,
    ]),
  });
  return Object.freeze({
    source,
    composed,
    previewRect,
    target: Object.freeze({
      schemaVersion: 1 as const,
      mapDefinitionId: map.mapDefinitionId,
      displayName,
      previewRect,
      currentUniqueGoal: false as const,
    }),
  });
}

function detailRoutePanels(
  plan: ArenaV2UiRenderPlanV1,
  mapDefinitionId: string,
): readonly Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'panel' }>[] {
  return Object.freeze([1, 2, 3].map((ordinal) => {
    const value = primitive(plan, `formal-preview:map:${mapDefinitionId}:fallback-pattern:${ordinal}`);
    if (value.kind !== 'panel') throw new Error('地图详情路线身份必须只使用panel。');
    return value;
  }));
}

describe('Arena V2 P5 map-selection non-color route identity（未运行候选）', () => {
  for (const slotSize of [200, 260] as const) {
    it(`map-detail ${slotSize}px复用同一route geometry且详情零primitive增量`, () => {
      const signatures = MAPS.map((map, mapIndex) => {
        const fixture = mapDetailPair(slotSize, mapIndex);
        const output = addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
          fixture.composed,
          fixture.source.identity,
          fixture.source,
          fixture.target,
        );
        expect(output.primitives).toHaveLength(fixture.composed.primitives.length);
        expect(output.primitives.length).toBeLessThanOrEqual(128);
        const panels = detailRoutePanels(output, map.mapDefinitionId);
        panels.forEach((panel) => expect(inside(fixture.previewRect, panel.rect)).toBe(true));
        const signature = createArenaV2MapRouteIdentityGeometrySignatureCandidateV1(
          map.mapDefinitionId,
          fixture.previewRect,
        );
        const actualSignature = ['primary', 'secondary', 'tertiary'].map((role, index) => {
          const panel = panels[index]!;
          return `${role}:${[
            panel.rect.x - fixture.previewRect.x,
            panel.rect.y - fixture.previewRect.y,
            panel.rect.width,
            panel.rect.height,
            panel.cornerRadiusCssPixels,
          ].join(',')}`;
        }).join('|');
        expect(actualSignature).toBe(signature);
        expect(addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
          output,
          fixture.source.identity,
          fixture.source,
          fixture.target,
        )).toBe(output);
        return signature;
      });
      expect(new Set(signatures).size).toBe(2);
    });
  }

  it('map index/detail同地图同rect共用同一route geometry签名', () => {
    for (const size of [200, 260] as const) {
      MAPS.forEach((map) => {
        const standardRect = rect(0, 0, size, size);
        const indexSignature = createArenaV2MapRouteIdentityGeometrySignatureCandidateV1(
          map.mapDefinitionId,
          standardRect,
        );
        const detailFixture = mapDetailPair(size, map.collectionOrder - 1);
        const detailSignature = createArenaV2MapRouteIdentityGeometrySignatureCandidateV1(
          map.mapDefinitionId,
          detailFixture.previewRect,
        );
        expect(detailSignature).toBe(indexSignature);
      });
    }
  });

  it('map-detail闭合browse身份、标题/主动作、partial与文字动作漂移', () => {
    const fixture = mapDetailPair(200);
    const other = mapDetailPair(200, 1);
    const mismatchIdentity = `map-detail:browse-map:${encodeURIComponent(
      fixture.target.mapDefinitionId
    )}`;
    const mismatchSource = Object.freeze({ ...other.source, identity: mismatchIdentity });
    const mismatchPlan = Object.freeze({
      ...other.composed,
      identity: `${mismatchIdentity}:a6.15-preview-aware:390x844`,
    });
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      mismatchPlan,
      mismatchSource.identity,
      mismatchSource,
      other.target,
    )).toThrow(/browse identity|当前地图不闭合/);
    const browseIdentityMatch = `map-detail:browse-map:${encodeURIComponent(
      fixture.target.mapDefinitionId
    )}`;
    const browseSource = Object.freeze({ ...fixture.source, identity: browseIdentityMatch });
    const browsePlan = Object.freeze({
      ...fixture.composed,
      identity: `${browseIdentityMatch}:a6.15-preview-aware:390x844`,
    });
    expect(addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      browsePlan,
      browseSource.identity,
      browseSource,
      fixture.target,
    ).primitives).toHaveLength(browsePlan.primitives.length);
    const prefix = `formal-preview:map:${fixture.target.mapDefinitionId}`;
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      corrupt(fixture.composed, fixture.composed.primitives.filter(({ id }) => (
        id !== `${prefix}:fallback-pattern:1`
      ))),
      fixture.source.identity,
      fixture.source,
      fixture.target,
    )).toThrow(/精确闭合|partial/);
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      corrupt(fixture.composed, fixture.composed.primitives.map((candidate) => (
        candidate.id === 'primary-action' && candidate.kind === 'action'
          ? Object.freeze({ ...candidate, label: '漂移' })
          : candidate
      ))),
      fixture.source.identity,
      fixture.source,
      fixture.target,
    )).toThrow(/文字|action|语义漂移/);
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      corrupt(fixture.composed, fixture.composed.primitives.map((candidate) => (
        candidate.id === 'map-detail:source-panel' && candidate.kind === 'panel'
          ? Object.freeze({ ...candidate, clipRect: null })
          : candidate
      ))),
      fixture.source.identity,
      fixture.source,
      fixture.target,
    )).toThrow(/primitive语义漂移/);
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      fixture.composed,
      fixture.source.identity,
      fixture.source,
      Object.freeze({ ...fixture.target, previewRect: rect(
        fixture.previewRect.x,
        fixture.previewRect.y,
        199,
        200,
      ) }),
    )).toThrow(/输入|绑定/);
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      Object.freeze({
        ...fixture.composed,
        identity: 'map-detail:a6.15-preview-aware:unknown-viewport',
      }),
      fixture.source.identity,
      fixture.source,
      fixture.target,
    )).toThrow(/输入|绑定/);
  });

  it('为两图生成精确六个纯panel且形成两种非文字几何signature', () => {
    const source = mapPlan();
    const output = addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(source);
    const signatures: string[] = [];
    MAPS.forEach((map) => {
      const card = primitive(source, `selection:map:${map.mapDefinitionId}:panel`);
      if (card.kind !== 'panel') throw new Error('地图卡panel夹具无效。');
      const panels = routePanels(output, map.mapDefinitionId);
      expect(panels).toHaveLength(3);
      panels.forEach((panel) => {
        expect(inside(card.rect, panel.rect)).toBe(true);
        expect(panel.clipRect).toEqual(card.clipRect);
      });
      signatures.push(signature(card, panels));
    });
    expect(new Set(signatures).size).toBe(2);
    expect(output.primitives).toHaveLength(source.primitives.length + 6);
    expect(output.primitives.length).toBeLessThanOrEqual(128);
    expect(ARENA_V2_MAP_SELECTION_CARD_NON_COLOR_ROUTE_IDENTITY_RENDER_PLAN_CANDIDATE_V1)
      .toMatchObject({
        mapSegmentCounts: [12, 8],
        primitivesPerCard: 3,
        addedPrimitiveCount: 6,
        maximumOutputPrimitiveCount: 128,
        geometrySignatureUsesPanelsOnly: true,
        mapDetailWired: true,
        detailAddedPrimitiveCount: 0,
        detailSlotCssPixels: [200, 260],
        detailUsesSharedRouteGeometryCore: true,
        detailSourceIdentityAndTargetBound: true,
        detailViewportIdentityAndSlotSizeBound: true,
        detailSourcePanelIdentityClipToneRadiusAndZIndexPreserved: true,
        validatesEnhancedReplayAndDrift: true,
        colorGlyphOrTextCanSatisfyIdentity: false,
        defaultSurfaceWired: false,
        addsPages: 0,
        addsActions: 0,
        changesAvailability: false,
        changesAccessibilitySemantics: false,
        validationStatus: 'not-run',
      });
  });

  it('首图表现前进断层与跨越落点，第二图表现折返阶梯', () => {
    const output = addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      mapPlan(),
    );
    const forward = routePanels(output, MAPS[0]!.mapDefinitionId);
    expect(forward[0]!.rect.x).toBeLessThan(forward[1]!.rect.x);
    expect(forward[1]!.rect.x).toBeLessThan(forward[2]!.rect.x);
    expect(forward[1]!.rect.y).toBeLessThan(forward[0]!.rect.y);
    expect(forward[1]!.rect.y).toBeLessThan(forward[2]!.rect.y);

    const switchback = routePanels(output, MAPS[1]!.mapDefinitionId);
    expect(switchback[0]!.rect.y).toBeLessThan(switchback[1]!.rect.y);
    expect(switchback[1]!.rect.y).toBeLessThan(switchback[2]!.rect.y);
    expect(switchback[0]!.rect.x).toBeLessThan(switchback[1]!.rect.x);
    expect(switchback[2]!.rect.x).toBeLessThan(switchback[1]!.rect.x);
  });

  it('保持原panel/action身份、48px、文字、availability与读屏语义', () => {
    const source = mapPlan(rect(24, 20, 1392, 720));
    const output = addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(source);
    MAPS.forEach((map) => {
      const prefix = `selection:map:${map.mapDefinitionId}`;
      expect(primitive(output, `${prefix}:panel`)).toBe(primitive(source, `${prefix}:panel`));
      expect(primitive(output, `${prefix}:action`)).toBe(primitive(source, `${prefix}:action`));
      const action = primitive(output, `${prefix}:action`);
      expect(action).toMatchObject({ kind: 'action', minimumTouchTargetCssPixels: 48 });
      for (const suffix of ['label', 'description'] as const) {
        const before = primitive(source, `${prefix}:${suffix}`);
        const after = primitive(output, `${prefix}:${suffix}`);
        if (before.kind !== 'text' || after.kind !== 'text') throw new Error('地图文字夹具无效。');
        expect({
          text: after.text,
          accessibilityText: after.accessibilityText,
          tone: after.tone,
          role: after.role,
          alignment: after.alignment,
          maximumLines: after.maximumLines,
          fixedWidthNumeric: after.fixedWidthNumeric,
          clipRect: after.clipRect,
        }).toEqual({
          text: before.text,
          accessibilityText: before.accessibilityText,
          tone: before.tone,
          role: before.role,
          alignment: before.alignment,
          maximumLines: before.maximumLines,
          fixedWidthNumeric: before.fixedWidthNumeric,
          clipRect: before.clipRect,
        });
        expect(after.rect.width).toBeLessThan(before.rect.width);
      }
    });
    expect(output.identity).toBe(source.identity);
    expect(
      addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(output),
    ).toBe(output);
  });

  it('保持A6.15输出身份并登记桥接；其他页面原引用返回', () => {
    const source = mapPlan();
    const previewAware = Object.freeze({
      ...source,
      identity: `${source.identity}:a6.15-preview-aware:390x844`,
    });
    const output = addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      previewAware,
      source.identity,
    );
    expect(output.identity).toBe(previewAware.identity);
    expect(output.primitives).toHaveLength(previewAware.primitives.length + 6);
    expect(ARENA_V2_COLLECTION_PREVIEW_RENDER_PLAN_LAYOUT_BRIDGE_CANDIDATE_V1)
      .toMatchObject({
        mapSelectionNonColorRouteIdentityWired: true,
        mapSelectionNonColorRouteIdentityAddedPrimitiveCount: 6,
        mapDetailNonColorRouteIdentityWired: true,
        mapDetailNonColorRouteIdentityAddedPrimitiveCount: 0,
        mapDetailNonColorRouteIdentityPanelsReshapedPerSelectedMap: 3,
      });

    const other = Object.freeze({ ...basePlan(rect(16, 16, 358, 600)), identity: 'home' });
    expect(
      addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(other),
    ).toBe(other);
  });

  it('缺卡、重复、未知身份与预算越界在零输出前失败关闭', () => {
    const source = mapPlan();
    const secondPrefix = `selection:map:${MAPS[1]!.mapDefinitionId}:`;
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      corrupt(source, source.primitives.filter(({ id }) => !id.startsWith(secondPrefix))),
    )).toThrow(/精确包含一个/);

    const firstPanel = primitive(source, `selection:map:${MAPS[0]!.mapDefinitionId}:panel`);
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      corrupt(source, [...source.primitives, firstPanel]),
    )).toThrow(/精确包含一个/);

    const repeatedMilestone = Object.freeze({
      ...firstPanel,
      id: `selection:map:${MAPS[0]!.mapDefinitionId}:map-route-research-milestones`,
    }) as ArenaV2UiRenderPrimitiveV1;
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      corrupt(source, [...source.primitives, repeatedMilestone, repeatedMilestone]),
    )).toThrow(/重复selection primitive/);

    const unknown = source.primitives.map((value) => (
      value.id.startsWith(secondPrefix)
        ? (Object.freeze({
          ...value,
          id: value.id.replace(MAPS[1]!.mapDefinitionId, 'map.unknown'),
        }) as ArenaV2UiRenderPrimitiveV1)
        : value
    ));
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      corrupt(source, unknown),
    )).toThrow(/未知、漂移/);

    const filler: ArenaV2UiRenderPrimitiveV1[] = Array.from({ length: 115 }, (_, index) => (
      Object.freeze({
        kind: 'panel' as const,
        id: `test:map-route-filler:${index}`,
        rect: rect(0, 0, 1, 1),
        clipRect: null,
        tone: 'surface' as const,
        cornerRadiusCssPixels: 0,
        zIndex: 0,
      })
    ));
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      corrupt(source, [...source.primitives, ...filler]),
    )).toThrow(/primitive预算/);

    const enhanced = addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      source,
    );
    const drifted = enhanced.primitives.map((value) => (
      value.id.endsWith(':non-color-route-identity:primary')
        ? Object.freeze({ ...value, tone: 'warning' as const }) as ArenaV2UiRenderPrimitiveV1
        : value
    ));
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      corrupt(enhanced, drifted),
    )).toThrow(/几何事实漂移/);

    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      corrupt(enhanced, enhanced.primitives.filter(({ id }) => (
        !id.endsWith(':non-color-route-identity:tertiary')
      ))),
    )).toThrow(/部分提交/);

    const textDrift = enhanced.primitives.map((value) => (
      value.id === `selection:map:${MAPS[0]!.mapDefinitionId}:label` && value.kind === 'text'
        ? Object.freeze({
          ...value,
          rect: rect(value.rect.x, value.rect.y, value.rect.width + 1, value.rect.height),
        })
        : value
    ));
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      corrupt(enhanced, textDrift),
    )).toThrow(/几何事实漂移/);

    const enhancedBudgetOverflow: ArenaV2UiRenderPrimitiveV1[] = Array.from(
      { length: 129 - enhanced.primitives.length },
      (_, index) => Object.freeze({
        kind: 'panel' as const,
        id: `test:enhanced-map-route-filler:${index}`,
        rect: rect(0, 0, 1, 1),
        clipRect: null,
        tone: 'surface' as const,
        cornerRadiusCssPixels: 0,
        zIndex: 0,
      }),
    );
    expect(() => addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1(
      corrupt(enhanced, [...enhanced.primitives, ...enhancedBudgetOverflow]),
    )).toThrow(/几何事实漂移/);
  });
});
