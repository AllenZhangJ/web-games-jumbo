import { describe, expect, it } from 'vitest';
import {
  addArenaV2InformationSelectionToRenderPlanCandidateV1,
  ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1,
  type ArenaV2UiRectV1,
  type ArenaV2UiRenderPlanV1,
  type ArenaV2UiRenderPrimitiveV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1,
  ARENA_V2_MODE_SELECTION_CARD_NON_COLOR_IDENTITY_RENDER_PLAN_CANDIDATE_V1,
} from '../src/arena-v2-mode-selection-card-non-color-identity-render-plan-candidate-v1.js';
import {
  ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionCandidateV1,
} from '../src/arena-v2-information-character-selection-preview-surface-composition-candidate-v1.js';

const MODE_KINDS = Object.freeze(['duel', 'race', 'survival'] as const);

function rect(x: number, y: number, width: number, height: number): ArenaV2UiRectV1 {
  return Object.freeze({ x, y, width, height });
}

function basePlan(viewport: ArenaV2UiRectV1): ArenaV2UiRenderPlanV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    surfaceKind: 'information' as const,
    identity: 'mode-select',
    revision: 9,
    status: 'layout-candidate' as const,
    productionReady: false as const,
    primitives: Object.freeze([]),
    scrollRegion: Object.freeze({
      viewport,
      contentHeight: 80,
      verticalScrollRequired: false,
    }),
    liveAnnouncements: Object.freeze([]),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: Object.freeze([]) as readonly [],
  });
}

function modePlan(viewport = rect(16, 16, 358, 680)): ArenaV2UiRenderPlanV1 {
  return addArenaV2InformationSelectionToRenderPlanCandidateV1(
    basePlan(viewport),
    Object.freeze({
      kind: 'mode',
      selectedId: 'duel',
      items: ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items,
    }),
  );
}

function primitive(
  plan: ArenaV2UiRenderPlanV1,
  id: string,
): ArenaV2UiRenderPrimitiveV1 {
  const result = plan.primitives.find((value) => value.id === id);
  if (result === undefined) throw new Error(`模式卡测试夹具缺少${id}。`);
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

describe('Arena V2 P5 mode-selection non-color card identity（未运行候选）', () => {
  it('在112px窄屏卡上形成三种只由三panel几何构成的唯一signature', () => {
    const source = modePlan();
    const output = addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(source);
    const signatures: string[] = [];
    for (const modeKind of MODE_KINDS) {
      const prefix = `selection:mode:${modeKind}`;
      const card = primitive(source, `${prefix}:panel`);
      if (card.kind !== 'panel') throw new Error('模式卡panel夹具无效。');
      expect(card.rect.height).toBe(112);
      const panels = ['primary', 'secondary', 'tertiary'].map((role) => (
        primitive(output, `${prefix}:non-color-identity:${role}`)
      ));
      if (panels.some((panel) => panel.kind !== 'panel')) {
        throw new Error('模式身份必须只使用panel primitive。');
      }
      const typedPanels = panels as Extract<
        ArenaV2UiRenderPrimitiveV1,
        { kind: 'panel' }
      >[];
      typedPanels.forEach((panel) => {
        expect(inside(card.rect, panel.rect)).toBe(true);
        expect(panel.clipRect).toEqual(card.clipRect);
      });
      signatures.push(JSON.stringify(typedPanels.map((panel) => [
        panel.rect.x - card.rect.x,
        panel.rect.y - card.rect.y,
        panel.rect.width,
        panel.rect.height,
        panel.cornerRadiusCssPixels,
      ])));
    }
    expect(new Set(signatures).size).toBe(3);
    expect(output.primitives).toHaveLength(source.primitives.length + 9);
    expect(output.primitives.length).toBeLessThanOrEqual(128);
    expect(ARENA_V2_MODE_SELECTION_CARD_NON_COLOR_IDENTITY_RENDER_PLAN_CANDIDATE_V1)
      .toMatchObject({
        modeKinds: ['duel', 'race', 'survival'],
        primitivesPerCard: 3,
        addedPrimitiveCount: 9,
        maximumOutputPrimitiveCount: 128,
        geometrySignatureUsesPanelsOnly: true,
        validatesEnhancedReplayAndDrift: true,
        changesActions: false,
        validationStatus: 'not-run',
      });
  });

  it('保持桌面96px模式卡、原panel/action对象和全部文字/读屏事实', () => {
    const source = modePlan(rect(24, 20, 1392, 720));
    const output = addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(source);
    for (const modeKind of MODE_KINDS) {
      const prefix = `selection:mode:${modeKind}`;
      const panel = primitive(source, `${prefix}:panel`);
      expect(panel.kind === 'panel' ? panel.rect.height : null).toBe(96);
      expect(primitive(output, `${prefix}:panel`)).toBe(panel);
      expect(primitive(output, `${prefix}:action`)).toBe(primitive(source, `${prefix}:action`));
      for (const suffix of ['label', 'description'] as const) {
        const before = primitive(source, `${prefix}:${suffix}`);
        const after = primitive(output, `${prefix}:${suffix}`);
        if (before.kind !== 'text' || after.kind !== 'text') throw new Error('模式文字夹具无效。');
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
    }
    expect(
      addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(source),
    ).toEqual(output);
    expect(
      addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(output),
    ).toBe(output);
  });

  it('非模式页原引用返回；缺卡、重复、未知身份与primitive预算越界失败关闭', () => {
    const other = Object.freeze({ ...basePlan(rect(16, 16, 358, 600)), identity: 'home' });
    expect(addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(other)).toBe(other);

    const source = modePlan();
    expect(() => addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(
      corrupt(source, source.primitives.filter(({ id }) => !id.startsWith(
        'selection:mode:survival:',
      ))),
    )).toThrow(/三张卡/);

    const duelPanel = primitive(source, 'selection:mode:duel:panel');
    expect(() => addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(
      corrupt(source, [...source.primitives, duelPanel]),
    )).toThrow(/重复/);

    const unknown = source.primitives.map((value) => (
      value.id.startsWith('selection:mode:survival:')
        ? (Object.freeze({
          ...value,
          id: value.id.replace('survival', 'unknown'),
        }) as ArenaV2UiRenderPrimitiveV1)
        : value
    ));
    expect(() => addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(
      corrupt(source, unknown),
    )).toThrow(/未知模式/);

    const partialIdentity = Object.freeze({
      ...duelPanel,
      id: 'selection:mode:duel:non-color-identity:primary',
    }) as ArenaV2UiRenderPrimitiveV1;
    expect(() => addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(
      corrupt(source, [...source.primitives, partialIdentity]),
    )).toThrow(/部分或提前提交/);

    const unknownIdentityRole = Object.freeze({
      ...duelPanel,
      id: 'selection:mode:duel:non-color-identity:future',
    }) as ArenaV2UiRenderPrimitiveV1;
    expect(() => addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(
      corrupt(source, [...source.primitives, unknownIdentityRole]),
    )).toThrow(/未知非颜色身份primitive/);

    const filler: ArenaV2UiRenderPrimitiveV1[] = Array.from({ length: 108 }, (_, index) => (
      Object.freeze({
        kind: 'panel' as const,
        id: `test:filler:${index}`,
        rect: rect(0, 0, 1, 1),
        clipRect: null,
        tone: 'surface' as const,
        cornerRadiusCssPixels: 0,
        zIndex: 0,
      })
    ));
    expect(() => addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(
      corrupt(source, [...source.primitives, ...filler]),
    )).toThrow(/primitive预算/);

    const enhanced = addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(source);
    const drifted = enhanced.primitives.map((value) => (
      value.id === 'selection:mode:duel:non-color-identity:primary'
        ? Object.freeze({ ...value, tone: 'warning' as const }) as ArenaV2UiRenderPrimitiveV1
        : value
    ));
    expect(() => addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(
      corrupt(enhanced, drifted),
    )).toThrow(/完整几何事实漂移/);

    expect(() => addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(
      corrupt(enhanced, enhanced.primitives.filter(({ id }) => (
        id !== 'selection:mode:race:non-color-identity:tertiary'
      ))),
    )).toThrow(/完整几何事实漂移/);

    const duplicatedIdentity = enhanced.primitives.map((value) => (
      value.id === 'selection:mode:race:non-color-identity:tertiary'
        ? Object.freeze({
          ...primitive(enhanced, 'selection:mode:race:non-color-identity:primary'),
        }) as ArenaV2UiRenderPrimitiveV1
        : value
    ));
    expect(() => addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(
      corrupt(enhanced, duplicatedIdentity),
    )).toThrow(/完整几何事实漂移/);

    const textDrift = enhanced.primitives.map((value) => (
      value.id === 'selection:mode:survival:description' && value.kind === 'text'
        ? Object.freeze({
          ...value,
          rect: rect(value.rect.x, value.rect.y, value.rect.width + 1, value.rect.height),
        })
        : value
    ));
    expect(() => addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(
      corrupt(enhanced, textDrift),
    )).toThrow(/完整几何事实漂移/);
  });

  it('现有Surface只接收增强plan，模式页不创建角色Three/资源Owner', () => {
    const source = modePlan();
    let rendered: ArenaV2UiRenderPlanV1 | null = null;
    let contextSource: ArenaV2UiRenderPlanV1 | null = null;
    let resourceFactoryCalls = 0;
    const composition = new ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionCandidateV1({
      schemaVersion: 1,
      surface: {
        scrollOffsetCssPixels: 0,
        load() { return this; },
        bindIntent() { return undefined; },
        bindScrollOffset() { return () => undefined; },
        render(plan) { rendered = plan; },
        dispose() {},
      },
      mountOwnerFactory: () => {
        resourceFactoryCalls += 1;
        throw new Error('模式页不得创建角色预览Owner。');
      },
      rendererFactory: () => {
        resourceFactoryCalls += 1;
        throw new Error('模式页不得创建Three renderer。');
      },
      contextProvider: (request) => {
        contextSource = request.sourceRenderPlan;
        return null;
      },
      setPreviewVisible: () => undefined,
    });
    composition.load();
    composition.render(source);
    expect((rendered as ArenaV2UiRenderPlanV1 | null)?.identity)
      .toBe('mode-select:selection-mode:non-color-identity-v1');
    expect(contextSource).toBe(source);
    expect(resourceFactoryCalls).toBe(0);
    expect(composition.getSnapshot()).toMatchObject({
      rendererFactoryInvoked: false,
      renderedFrameCount: 0,
      createsRaf: false,
      addsInput: false,
    });
    composition.dispose();
  });
});
