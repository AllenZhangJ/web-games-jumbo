import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_UI_VISUAL_TOKENS_V1,
  createArenaV2UiDomSurfaceModelV1,
  paintArenaV2UiRenderPlanV1,
  resolveArenaV2UiActionRevealV1,
  resolveArenaV2UiKeyboardIntentV1,
  resolveArenaV2UiPointerIntentV1,
  resolveArenaV2UiPrimitiveRevealV1,
  resolveArenaV2UiScrollDeltaV1,
  type ArenaV2UiCanvasPaintPortV1,
  type ArenaV2UiRenderPlanV1,
} from '../src/index.js';

function plan(enabled = true): ArenaV2UiRenderPlanV1 {
  const viewport = Object.freeze({ x: 16, y: 16, width: 358, height: 500 });
  return Object.freeze({
    schemaVersion: 1,
    surfaceKind: 'information',
    identity: 'weapon-detail',
    revision: 4,
    status: 'layout-candidate',
    productionReady: false,
    primitives: Object.freeze([Object.freeze({
      kind: 'panel' as const,
      id: 'page-background',
      rect: Object.freeze({ x: 0, y: 0, width: 390, height: 844 }),
      clipRect: null,
      tone: 'background' as const,
      cornerRadiusCssPixels: 0,
      zIndex: 0,
    }), Object.freeze({
      kind: 'text' as const,
      id: 'page-question',
      rect: Object.freeze({ x: 24, y: 24, width: 342, height: 96 }),
      clipRect: viewport,
      text: '这把武器什么时候最强？',
      accessibilityText: '这把武器什么时候最强？',
      tone: 'strong' as const,
      role: 'question' as const,
      alignment: 'left' as const,
      maximumLines: 3,
      fixedWidthNumeric: false,
      zIndex: 2,
    }), Object.freeze({
      kind: 'action' as const,
      id: 'primary-action' as const,
      rect: Object.freeze({ x: 16, y: 700, width: 358, height: 56 }),
      clipRect: null,
      intentId: 'use-selected-weapon-next-match',
      label: '下局使用',
      accessibilityText: enabled ? '下局使用' : '下局使用，请先完成选择',
      enabled,
      disabledReason: enabled ? null : '请先完成选择',
      minimumTouchTargetCssPixels: 48 as const,
      tone: enabled ? 'primary' as const : 'muted' as const,
      zIndex: 4,
    })]),
    scrollRegion: Object.freeze({
      viewport,
      contentHeight: 760,
      verticalScrollRequired: true,
    }),
    liveAnnouncements: Object.freeze(['已进入武器详情。']),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: Object.freeze([]),
  });
}

function canvas(): Readonly<{
  port: ArenaV2UiCanvasPaintPortV1;
  text: string[];
  fills: unknown[];
  fonts: string[];
}> {
  const text: string[] = [];
  const fills: unknown[] = [];
  const fonts: string[] = [];
  let fillStyle: unknown = '';
  let font = '';
  const port: ArenaV2UiCanvasPaintPortV1 = {
    get fillStyle() { return fillStyle; },
    set fillStyle(value) { fillStyle = value; },
    strokeStyle: '', lineWidth: 1,
    get font() { return font; },
    set font(value) { font = value; fonts.push(value); },
    textAlign: '', textBaseline: '',
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {},
    closePath() {}, rect() {}, clip() {}, fill() { fills.push(fillStyle); }, stroke() {}, fillRect() {},
    fillText(value) { text.push(value); },
    measureText(value) { return { width: Array.from(value).length * 12 }; },
  };
  return Object.freeze({ port, text, fills, fonts });
}

describe('Arena V2 UI surface candidates V1', () => {
  it('creates inert DOM instructions with mobile scroll and stable action semantics', () => {
    const model = createArenaV2UiDomSurfaceModelV1(plan(), 20);
    expect(model).toMatchObject({
      status: 'dom-surface-candidate',
      productionReady: false,
      rootTouchAction: 'pan-y',
      scrollOffsetCssPixels: 20,
    });
    expect(model.nodes.find(({ id }) => id === 'primary-action')).toMatchObject({
      element: 'button',
      tabIndex: 0,
      intentId: 'use-selected-weapon-next-match',
      ariaDisabled: false,
    });
    expect(model.liveRegion.messages).toEqual(['已进入武器详情。']);
  });

  it('paints all primitives through the canvas port without DOM or Three ownership', () => {
    const host = canvas();
    const result = paintArenaV2UiRenderPlanV1(host.port, plan(), 20);
    expect(result.paintedPrimitiveIds).toEqual([
      'page-background', 'page-question', 'primary-action',
    ]);
    expect(result.clippedPrimitiveIds).toEqual(['page-question']);
    expect(host.text.join('')).toContain('下局使用');
    expect(host.fills).toContain(ARENA_V2_UI_VISUAL_TOKENS_V1.tones.background.fill);
    expect(host.fills).toContain(ARENA_V2_UI_VISUAL_TOKENS_V1.tones.primary.fill);
    expect(host.fonts.some((value) => (
      value.includes(ARENA_V2_UI_VISUAL_TOKENS_V1.typography.chineseFontStack)
    ))).toBe(true);
  });

  it('preserves explicit grouped lines in both DOM semantics and Canvas painting', () => {
    const source = plan();
    const groupedText = '武器与情境研究\n地图与路线研究\n模式与挑战进度';
    const completeSemantic = '武器与情境研究，地图与路线研究，模式与挑战进度。';
    const groupedPlan = Object.freeze({
      ...source,
      primitives: Object.freeze(source.primitives.map((primitive) => (
        primitive.id !== 'page-question'
          ? primitive
          : Object.freeze({
            ...primitive,
            text: groupedText,
            accessibilityText: completeSemantic,
            maximumLines: 3,
          })
      ))),
    });
    const dom = createArenaV2UiDomSurfaceModelV1(groupedPlan);
    expect(dom.nodes.find(({ id }) => id === 'page-question')).toMatchObject({
      text: groupedText,
      ariaLabel: completeSemantic,
      style: expect.objectContaining({ maximumLines: 3 }),
    });
    const host = canvas();
    const result = paintArenaV2UiRenderPlanV1(host.port, groupedPlan);
    expect(host.text).toEqual(expect.arrayContaining([
      '武器与情境研究',
      '地图与路线研究',
      '模式与挑战进度',
    ]));
    expect(result.truncatedTextPrimitiveIds).not.toContain('page-question');
  });

  it('rejects a future tone before issuing any Canvas paint call', () => {
    const source = plan();
    const malformed = Object.freeze({
      ...source,
      primitives: Object.freeze(source.primitives.map((primitive, index) => (
        index === 2 ? Object.freeze({ ...primitive, tone: 'future' }) : primitive
      ))),
    }) as unknown as ArenaV2UiRenderPlanV1;
    const host = canvas();
    expect(() => paintArenaV2UiRenderPlanV1(host.port, malformed)).toThrow(/闭合集合/);
    expect(host.fills).toEqual([]);
    expect(host.text).toEqual([]);
  });

  it('resolves pointer, keyboard, disabled and bounded scroll intents', () => {
    expect(resolveArenaV2UiPointerIntentV1(plan(), { x: 100, y: 720 })).toEqual({
      status: 'accepted',
      primitiveId: 'primary-action',
      intentId: 'use-selected-weapon-next-match',
    });
    expect(resolveArenaV2UiKeyboardIntentV1(plan(), 'primary-action', 'Enter').status)
      .toBe('accepted');
    expect(resolveArenaV2UiPointerIntentV1(plan(false), { x: 100, y: 720 })).toMatchObject({
      status: 'disabled',
      reason: '请先完成选择',
    });
    expect(resolveArenaV2UiScrollDeltaV1(plan(), 200, 500)).toMatchObject({
      nextOffsetCssPixels: 260,
      maximumOffsetCssPixels: 260,
      clamped: true,
    });
  });

  it('rejects pointer coordinate accessors without executing them', () => {
    let accessorReads = 0;
    const point: Record<string, unknown> = { y: 720 };
    Object.defineProperty(point, 'x', {
      enumerable: true,
      get: () => {
        accessorReads += 1;
        return 100;
      },
    });
    expect(() => resolveArenaV2UiPointerIntentV1(plan(), point))
      .toThrow(/数据字段/);
    expect(accessorReads).toBe(0);
  });

  it('centers a selected directory card from current RenderPlan geometry and clamps edges', () => {
    const source = plan();
    const selectionViewport = source.scrollRegion!.viewport;
    const selectionPlan = Object.freeze({
      ...source,
      identity: 'weapon-index:selection-weapon',
      primitives: Object.freeze([...source.primitives, Object.freeze({
        kind: 'action' as const,
        id: 'selection:weapon:arena-weapon-20:action',
        rect: Object.freeze({ x: 16, y: 1080, width: 358, height: 96 }),
        clipRect: selectionViewport,
        intentId: 'arena.v2.selection.weapon.arena-weapon-20',
        label: '第二十把武器',
        accessibilityText: '第二十把武器。已选择',
        enabled: false,
        disabledReason: '已选择',
        minimumTouchTargetCssPixels: 48 as const,
        tone: 'transparent' as const,
        zIndex: 3,
      })]),
      scrollRegion: Object.freeze({
        ...source.scrollRegion!,
        contentHeight: 1200,
      }),
    });
    expect(resolveArenaV2UiActionRevealV1(
      selectionPlan,
      'selection:weapon:arena-weapon-20:action',
      0,
    )).toMatchObject({
      status: 'action-reveal-resolved',
      nextOffsetCssPixels: 700,
      maximumOffsetCssPixels: 700,
      changed: true,
      clamped: true,
    });
  });

  it('reveals a deferred records text primitive without inventing an action', () => {
    const source = plan();
    const viewport = source.scrollRegion!.viewport;
    const recordsPlan = Object.freeze({
      ...source,
      identity: 'home:records',
      primitives: Object.freeze([...source.primitives, Object.freeze({
        kind: 'text' as const,
        id: 'deferred:recent-records:value',
        rect: Object.freeze({ x: 28, y: 920, width: 334, height: 44 }),
        clipRect: viewport,
        text: '1v1 --｜竞速 --｜生存 00:10；模式熟练1/3·武器1/2·主研究1/2·情境2/10·情境研究2/10·地图1/1·路线1/2·路线研究1/2',
        accessibilityText: '三种模式记录与收藏进度',
        tone: 'secondary' as const,
        role: 'value' as const,
        alignment: 'left' as const,
        maximumLines: 2,
        fixedWidthNumeric: true,
        zIndex: 2,
      })]),
      scrollRegion: Object.freeze({
        ...source.scrollRegion!,
        contentHeight: 1060,
      }),
    });
    expect(resolveArenaV2UiPrimitiveRevealV1(
      recordsPlan,
      'deferred:recent-records:value',
      0,
    )).toMatchObject({
      status: 'primitive-reveal-resolved',
      primitiveId: 'deferred:recent-records:value',
      nextOffsetCssPixels: 560,
      maximumOffsetCssPixels: 560,
      changed: true,
      clamped: true,
    });
    expect(() => resolveArenaV2UiActionRevealV1(
      recordsPlan,
      'deferred:recent-records:value',
      0,
    )).toThrow(/action reveal/);
  });
});
