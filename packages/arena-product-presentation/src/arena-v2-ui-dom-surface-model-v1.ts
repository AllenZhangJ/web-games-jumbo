import type { ArenaV2UiRectV1 } from './arena-v2-information-screen-layout-v1.js';
import type {
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
  ArenaV2UiToneV1,
} from './arena-v2-ui-render-plan-v1.js';

export interface ArenaV2UiDomStyleV1 {
  readonly position: 'absolute';
  readonly leftCssPixels: number;
  readonly topCssPixels: number;
  readonly widthCssPixels: number;
  readonly heightCssPixels: number;
  readonly zIndex: number;
  readonly overflow: 'hidden' | 'visible';
  readonly pointerEvents: 'auto' | 'none';
  readonly touchAction: 'manipulation' | 'none' | 'auto';
  readonly tone: ArenaV2UiToneV1;
  readonly textAlign: 'left' | 'center' | 'right' | null;
  readonly maximumLines: number | null;
  readonly fixedWidthNumeric: boolean;
}

export interface ArenaV2UiDomNodeV1 {
  readonly id: string;
  readonly element: 'div' | 'h1' | 'p' | 'span' | 'button';
  readonly semanticRole: 'presentation' | 'heading' | 'status' | 'navigation' | 'button';
  readonly text: string | null;
  readonly ariaLabel: string | null;
  readonly ariaDisabled: boolean | null;
  readonly tabIndex: -1 | 0;
  readonly intentId: string | null;
  readonly disabledReason: string | null;
  readonly clipRect: ArenaV2UiRectV1 | null;
  readonly style: ArenaV2UiDomStyleV1;
}

export interface ArenaV2UiDomSurfaceModelV1 {
  readonly schemaVersion: 1;
  readonly status: 'dom-surface-candidate';
  readonly productionReady: false;
  readonly identity: string;
  readonly revision: number;
  readonly surfaceKind: ArenaV2UiRenderPlanV1['surfaceKind'];
  readonly rootAriaLabel: string;
  readonly rootTouchAction: 'pan-y' | 'none';
  readonly scrollOffsetCssPixels: number;
  readonly scrollRegion: ArenaV2UiRenderPlanV1['scrollRegion'];
  readonly nodes: readonly ArenaV2UiDomNodeV1[];
  readonly liveRegion: Readonly<{
    readonly ariaLive: 'polite';
    readonly ariaAtomic: true;
    readonly messages: readonly string[];
  }>;
  readonly formalAssetIds: readonly [];
}

function offset(
  plan: ArenaV2UiRenderPlanV1,
  value: unknown,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError('Arena V2 DOM滚动位置必须是有限非负数。');
  }
  if (plan.scrollRegion === null) {
    if (value !== 0) throw new RangeError('Arena V2 HUD不接受DOM滚动位置。');
    return 0;
  }
  const maximum = Math.max(0, plan.scrollRegion.contentHeight - plan.scrollRegion.viewport.height);
  if (value > maximum) throw new RangeError('Arena V2 DOM滚动位置超过内容边界。');
  return value;
}

function nodeElement(
  primitive: ArenaV2UiRenderPrimitiveV1,
): ArenaV2UiDomNodeV1['element'] {
  if (primitive.kind === 'action') return 'button';
  if (primitive.kind === 'panel') return 'div';
  if (primitive.role === 'question') return 'h1';
  if (primitive.role === 'label' || primitive.role === 'navigation') return 'span';
  return 'p';
}

function semanticRole(
  primitive: ArenaV2UiRenderPrimitiveV1,
): ArenaV2UiDomNodeV1['semanticRole'] {
  if (primitive.kind === 'action') return 'button';
  if (primitive.kind === 'panel') return 'presentation';
  if (primitive.role === 'question') return 'heading';
  if (primitive.role === 'navigation') return 'navigation';
  return primitive.role.startsWith('hud-') || primitive.role === 'feedback'
    ? 'status'
    : 'presentation';
}

function shiftedRect(
  primitive: ArenaV2UiRenderPrimitiveV1,
  scrollOffsetCssPixels: number,
): ArenaV2UiRectV1 {
  return primitive.clipRect === null || scrollOffsetCssPixels === 0
    ? primitive.rect
    : Object.freeze({ ...primitive.rect, y: primitive.rect.y - scrollOffsetCssPixels });
}

function style(
  primitive: ArenaV2UiRenderPrimitiveV1,
  target: ArenaV2UiRectV1,
): ArenaV2UiDomStyleV1 {
  return Object.freeze({
    position: 'absolute' as const,
    leftCssPixels: target.x,
    topCssPixels: target.y,
    widthCssPixels: target.width,
    heightCssPixels: target.height,
    zIndex: primitive.zIndex,
    overflow: primitive.clipRect === null ? 'visible' as const : 'hidden' as const,
    pointerEvents: primitive.kind === 'action' && primitive.enabled ? 'auto' as const : 'none' as const,
    touchAction: primitive.kind === 'action' ? 'manipulation' as const : 'auto' as const,
    tone: primitive.tone,
    textAlign: primitive.kind === 'text' ? primitive.alignment : null,
    maximumLines: primitive.kind === 'text' ? primitive.maximumLines : null,
    fixedWidthNumeric: primitive.kind === 'text' ? primitive.fixedWidthNumeric : false,
  });
}

function node(
  primitive: ArenaV2UiRenderPrimitiveV1,
  scrollOffsetCssPixels: number,
): ArenaV2UiDomNodeV1 {
  const target = shiftedRect(primitive, scrollOffsetCssPixels);
  const isAction = primitive.kind === 'action';
  const isText = primitive.kind === 'text';
  const isTransparentAction = isAction && primitive.tone === 'transparent';
  return Object.freeze({
    id: primitive.id,
    element: nodeElement(primitive),
    semanticRole: semanticRole(primitive),
    text: isAction && !isTransparentAction ? primitive.label : isText ? primitive.text : null,
    ariaLabel: isAction
      ? primitive.accessibilityText
      : isText ? primitive.accessibilityText : null,
    ariaDisabled: isAction ? !primitive.enabled : null,
    tabIndex: isAction && primitive.enabled ? 0 as const : -1 as const,
    intentId: isAction ? primitive.intentId : null,
    disabledReason: isAction ? primitive.disabledReason : null,
    clipRect: primitive.clipRect,
    style: style(primitive, target),
  });
}

/**
 * Builds inert DOM instructions. A host may materialize them, but this package
 * never imports document/window and never owns event listeners or simulation.
 */
export function createArenaV2UiDomSurfaceModelV1(
  plan: ArenaV2UiRenderPlanV1,
  scrollOffsetCssPixels = 0,
): ArenaV2UiDomSurfaceModelV1 {
  if (plan.schemaVersion !== 1 || plan.productionReady !== false
    || plan.status !== 'layout-candidate') {
    throw new RangeError('Arena V2 DOM只接受未晋级的RenderPlan V1。');
  }
  const normalizedOffset = offset(plan, scrollOffsetCssPixels);
  const nodes = Object.freeze([...plan.primitives]
    .sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id))
    .map((primitive) => node(primitive, normalizedOffset)));
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'dom-surface-candidate' as const,
    productionReady: false as const,
    identity: plan.identity,
    revision: plan.revision,
    surfaceKind: plan.surfaceKind,
    rootAriaLabel: plan.surfaceKind === 'hud' ? '竞技状态' : '竞技场菜单',
    rootTouchAction: plan.surfaceKind === 'hud' ? 'none' as const : 'pan-y' as const,
    scrollOffsetCssPixels: normalizedOffset,
    scrollRegion: plan.scrollRegion,
    nodes,
    liveRegion: Object.freeze({
      ariaLive: 'polite' as const,
      ariaAtomic: true as const,
      messages: plan.liveAnnouncements,
    }),
    formalAssetIds: [] as const,
  });
}

export const ARENA_V2_UI_DOM_SURFACE_MODEL_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  ownsDom: false as const,
  ownsEventListeners: false as const,
  formalVisualAssetsReady: false as const,
});
