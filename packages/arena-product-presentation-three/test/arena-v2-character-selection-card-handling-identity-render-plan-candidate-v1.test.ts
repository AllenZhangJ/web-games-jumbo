import { describe, expect, it } from 'vitest';
import {
  addArenaV2InformationSelectionToRenderPlanCandidateV1,
  type ArenaV2UiRectV1,
  type ArenaV2UiRenderPlanV1,
  type ArenaV2UiRenderPrimitiveV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1,
} from '../src/arena-v2-character-weapon-first-screen-readability-candidate-v1.js';
import {
  addArenaV2CharacterSelectionCardHandlingIdentityToRenderPlanCandidateV1,
  ARENA_V2_CHARACTER_SELECTION_CARD_HANDLING_IDENTITY_RENDER_PLAN_CANDIDATE_V1,
} from '../src/arena-v2-character-selection-card-handling-identity-render-plan-candidate-v1.js';
import {
  ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionCandidateV1,
} from '../src/arena-v2-information-character-selection-preview-surface-composition-candidate-v1.js';

function rect(x: number, y: number, width: number, height: number): ArenaV2UiRectV1 {
  return Object.freeze({ x, y, width, height });
}

function basePlan(viewport: ArenaV2UiRectV1): ArenaV2UiRenderPlanV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    surfaceKind: 'information' as const,
    identity: 'character-select',
    revision: 7,
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

function characterPlan(viewport = rect(16, 16, 358, 900)): ArenaV2UiRenderPlanV1 {
  return addArenaV2InformationSelectionToRenderPlanCandidateV1(
    basePlan(viewport),
    Object.freeze({
      kind: 'character',
      selectedId: ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1[0]!
        .characterDefinitionId,
      items: Object.freeze(ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1.map(
        (identity, index) => Object.freeze({
          id: identity.characterDefinitionId,
          label: `角色${index + 1}`,
          description: identity.selectionPose.intent,
          available: true,
          unavailableReason: null,
        }),
      )),
    }),
  );
}

function inside(container: ArenaV2UiRectV1, child: ArenaV2UiRectV1): boolean {
  return child.x >= container.x
    && child.y >= container.y
    && child.x + child.width <= container.x + container.width
    && child.y + child.height <= container.y + container.height;
}

function primitive(
  plan: ArenaV2UiRenderPlanV1,
  id: string,
): ArenaV2UiRenderPrimitiveV1 {
  const result = plan.primitives.find((value) => value.id === id);
  if (result === undefined) throw new Error(`测试夹具缺少${id}。`);
  return result;
}

function corrupt(
  plan: ArenaV2UiRenderPlanV1,
  primitives: readonly ArenaV2UiRenderPrimitiveV1[],
): ArenaV2UiRenderPlanV1 {
  return Object.freeze({ ...plan, primitives: Object.freeze(primitives) });
}

describe('Arena V2 A6.19 character card handling identity（未运行候选）', () => {
  it('在390×844语义卡片上生成6/6唯一的两panel加glyph非颜色几何signature', () => {
    const source = characterPlan();
    const output = addArenaV2CharacterSelectionCardHandlingIdentityToRenderPlanCandidateV1(source);
    const signatures: string[] = [];
    for (const identity of ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1) {
      const prefix = `selection:character:${identity.characterDefinitionId}`;
      const panel = primitive(source, `${prefix}:panel`);
      if (panel.kind !== 'panel') throw new Error('角色卡panel夹具无效。');
      const primary = primitive(output, `${prefix}:handling-identity:primary`);
      const secondary = primitive(output, `${prefix}:handling-identity:secondary`);
      const glyph = primitive(output, `${prefix}:handling-identity:glyph`);
      if (primary.kind !== 'panel' || secondary.kind !== 'panel' || glyph.kind !== 'text') {
        throw new Error('角色卡身份primitive种类无效。');
      }
      expect(inside(panel.rect, primary.rect)).toBe(true);
      expect(inside(panel.rect, secondary.rect)).toBe(true);
      expect(inside(panel.rect, glyph.rect)).toBe(true);
      expect(primary.clipRect).toEqual(panel.clipRect);
      expect(secondary.clipRect).toEqual(panel.clipRect);
      expect(glyph.clipRect).toEqual(panel.clipRect);
      signatures.push(JSON.stringify([
        primary.rect.x - panel.rect.x,
        primary.rect.y - panel.rect.y,
        primary.rect.width,
        primary.rect.height,
        primary.cornerRadiusCssPixels,
        secondary.rect.x - panel.rect.x,
        secondary.rect.y - panel.rect.y,
        secondary.rect.width,
        secondary.rect.height,
        secondary.cornerRadiusCssPixels,
      ]));
    }
    expect(new Set(signatures).size).toBe(6);
    expect(output.primitives).toHaveLength(source.primitives.length + 18);
    expect(ARENA_V2_CHARACTER_SELECTION_CARD_HANDLING_IDENTITY_RENDER_PLAN_CANDIDATE_V1)
      .toMatchObject({
        sourceCharacterCount: 6,
        primitivesPerCard: 3,
        addedPrimitiveCount: 18,
        maximumOutputPrimitiveCount: 128,
        geometrySignatureExcludesGlyphText: true,
        changesActions: false,
        createsThreeResources: false,
        validationStatus: 'not-run',
      });
  });

  it('同时闭合桌面90px卡片并保持action矩形与全部文字事实不变', () => {
    const source = characterPlan(rect(24, 20, 1392, 900));
    const output = addArenaV2CharacterSelectionCardHandlingIdentityToRenderPlanCandidateV1(source);
    for (const identity of ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1) {
      const prefix = `selection:character:${identity.characterDefinitionId}`;
      expect(primitive(output, `${prefix}:action`)).toBe(primitive(source, `${prefix}:action`));
      for (const suffix of ['label', 'description'] as const) {
        const before = primitive(source, `${prefix}:${suffix}`);
        const after = primitive(output, `${prefix}:${suffix}`);
        if (before.kind !== 'text' || after.kind !== 'text') throw new Error('文字夹具无效。');
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
      addArenaV2CharacterSelectionCardHandlingIdentityToRenderPlanCandidateV1(source),
    ).toEqual(output);
  });

  it('非角色页原引用返回；缺卡、重复primitive与未知角色均在输出前拒绝', () => {
    const other = Object.freeze({ ...basePlan(rect(16, 16, 358, 700)), identity: 'home' });
    expect(addArenaV2CharacterSelectionCardHandlingIdentityToRenderPlanCandidateV1(other))
      .toBe(other);

    const source = characterPlan();
    const lastId = ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1.at(-1)!
      .characterDefinitionId;
    expect(() => addArenaV2CharacterSelectionCardHandlingIdentityToRenderPlanCandidateV1(
      corrupt(source, source.primitives.filter(({ id }) => !id.startsWith(
        `selection:character:${lastId}:`,
      ))),
    )).toThrow(/六张角色卡/);

    const firstId = ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1[0]!
      .characterDefinitionId;
    const duplicatePanel = primitive(source, `selection:character:${firstId}:panel`);
    expect(() => addArenaV2CharacterSelectionCardHandlingIdentityToRenderPlanCandidateV1(
      corrupt(source, [...source.primitives, duplicatePanel]),
    )).toThrow(/重复/);

    const unknown = source.primitives.map((value) => (
      value.id.startsWith(`selection:character:${lastId}:`)
        ? Object.freeze({
          ...value,
          id: value.id.replace(lastId, 'arena-v2-character-unknown.candidate.v1'),
        }) as ArenaV2UiRenderPrimitiveV1
        : value
    ));
    expect(() => addArenaV2CharacterSelectionCardHandlingIdentityToRenderPlanCandidateV1(
      corrupt(source, unknown),
    )).toThrow(/未知角色/);
  });

  it('组合层只把增强计划送给Surface，3D context仍收到同一次原始稳定计划且零资源副作用', () => {
    const source = characterPlan();
    let renderedPlan: ArenaV2UiRenderPlanV1 | null = null;
    let contextPlan: ArenaV2UiRenderPlanV1 | null = null;
    let resourceFactoryCallCount = 0;
    const composition = new ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionCandidateV1({
      schemaVersion: 1,
      surface: {
        scrollOffsetCssPixels: 0,
        load() { return this; },
        bindIntent() { return undefined; },
        bindScrollOffset() { return () => undefined; },
        render(plan) { renderedPlan = plan; },
        dispose() {},
      },
      mountOwnerFactory: () => {
        resourceFactoryCallCount += 1;
        throw new Error('null context不得创建Three mount owner。');
      },
      rendererFactory: () => {
        resourceFactoryCallCount += 1;
        throw new Error('null context不得创建renderer。');
      },
      contextProvider: (request) => {
        contextPlan = request.sourceRenderPlan;
        return null;
      },
      setPreviewVisible: () => undefined,
    });
    composition.load();
    composition.render(source);
    expect((renderedPlan as ArenaV2UiRenderPlanV1 | null)?.identity).toBe(
      'character-select:selection-character:handling-identity-v1',
    );
    expect(contextPlan).toBe(source);
    expect(resourceFactoryCallCount).toBe(0);
    expect(composition.getSnapshot()).toMatchObject({
      rendererFactoryInvoked: false,
      renderedFrameCount: 0,
      createsRaf: false,
      addsInput: false,
    });
    composition.dispose();
  });
});
