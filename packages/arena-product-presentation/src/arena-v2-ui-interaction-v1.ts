import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type { ArenaV2UiRectV1 } from './arena-v2-information-screen-layout-v1.js';
import type {
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from './arena-v2-ui-render-plan-v1.js';

export type ArenaV2UiIntentResolutionV1 =
  | Readonly<{
    readonly status: 'accepted';
    readonly primitiveId: string;
    readonly intentId: string;
  }>
  | Readonly<{
    readonly status: 'disabled';
    readonly primitiveId: string;
    readonly intentId: string;
    readonly reason: string;
  }>
  | Readonly<{
    readonly status: 'miss';
  }>;

export interface ArenaV2UiScrollResolutionV1 {
  readonly status: 'scroll-resolved';
  readonly previousOffsetCssPixels: number;
  readonly requestedDeltaCssPixels: number;
  readonly nextOffsetCssPixels: number;
  readonly minimumOffsetCssPixels: 0;
  readonly maximumOffsetCssPixels: number;
  readonly clamped: boolean;
}

export interface ArenaV2UiActionRevealResolutionV1 {
  readonly status: 'action-reveal-resolved';
  readonly primitiveId: string;
  readonly previousOffsetCssPixels: number;
  readonly desiredOffsetCssPixels: number;
  readonly nextOffsetCssPixels: number;
  readonly minimumOffsetCssPixels: 0;
  readonly maximumOffsetCssPixels: number;
  readonly changed: boolean;
  readonly clamped: boolean;
}

export interface ArenaV2UiPrimitiveRevealResolutionV1 {
  readonly status: 'primitive-reveal-resolved';
  readonly primitiveId: string;
  readonly previousOffsetCssPixels: number;
  readonly desiredOffsetCssPixels: number;
  readonly nextOffsetCssPixels: number;
  readonly minimumOffsetCssPixels: 0;
  readonly maximumOffsetCssPixels: number;
  readonly changed: boolean;
  readonly clamped: boolean;
}

const POINT_KEYS = new Set(['x', 'y']);

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name}必须是有限数。`);
  }
  return value;
}

function point(value: unknown): Readonly<{ x: number; y: number }> {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'Arena V2 UI point'),
    'Arena V2 UI point',
  );
  assertKnownKeys(source, POINT_KEYS, 'Arena V2 UI point');
  for (const key of POINT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 UI point.${key}为必填字段。`);
    }
  }
  return Object.freeze({
    x: finite(source.x, 'Arena V2 UI point.x'),
    y: finite(source.y, 'Arena V2 UI point.y'),
  });
}

function contains(target: ArenaV2UiRectV1, x: number, y: number): boolean {
  return x >= target.x && x <= target.x + target.width
    && y >= target.y && y <= target.y + target.height;
}

function scrollOffset(plan: ArenaV2UiRenderPlanV1, value: unknown): number {
  const requested = finite(value, 'Arena V2 UI scroll offset');
  if (requested < 0) throw new RangeError('Arena V2 UI scroll offset不能为负。');
  if (plan.scrollRegion === null) {
    if (requested !== 0) throw new RangeError('Arena V2 HUD不接受scroll offset。');
    return 0;
  }
  const maximum = Math.max(
    0,
    plan.scrollRegion.contentHeight - plan.scrollRegion.viewport.height,
  );
  if (requested > maximum) throw new RangeError('Arena V2 UI scroll offset超过布局边界。');
  return requested;
}

function actionRect(
  action: Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'action' }>,
  offset: number,
): ArenaV2UiRectV1 {
  return action.clipRect === null || offset === 0
    ? action.rect
    : Object.freeze({ ...action.rect, y: action.rect.y - offset });
}

function actions(plan: ArenaV2UiRenderPlanV1): readonly Extract<
  ArenaV2UiRenderPrimitiveV1,
  { kind: 'action' }
>[] {
  return Object.freeze(plan.primitives
    .filter((primitive): primitive is Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'action' }> => (
      primitive.kind === 'action'
    ))
    .sort((left, right) => right.zIndex - left.zIndex || left.id.localeCompare(right.id)));
}

function resolveAction(
  action: Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'action' }>,
): ArenaV2UiIntentResolutionV1 {
  if (action.enabled) {
    return Object.freeze({
      status: 'accepted' as const,
      primitiveId: action.id,
      intentId: action.intentId,
    });
  }
  if (action.disabledReason === null) {
    throw new RangeError(`Arena V2禁用动作${action.id}缺少原因。`);
  }
  return Object.freeze({
    status: 'disabled' as const,
    primitiveId: action.id,
    intentId: action.intentId,
    reason: action.disabledReason,
  });
}

/** Resolves one pointer release without retaining pointer or gesture state. */
export function resolveArenaV2UiPointerIntentV1(
  plan: ArenaV2UiRenderPlanV1,
  pointValue: unknown,
  scrollOffsetCssPixelsValue: unknown = 0,
): ArenaV2UiIntentResolutionV1 {
  if (plan.schemaVersion !== 1 || plan.productionReady !== false) {
    throw new RangeError('Arena V2 UI intent只接受RenderPlan V1候选。');
  }
  const target = point(pointValue);
  const offset = scrollOffset(plan, scrollOffsetCssPixelsValue);
  for (const action of actions(plan)) {
    if (action.clipRect !== null && !contains(action.clipRect, target.x, target.y)) continue;
    if (contains(actionRect(action, offset), target.x, target.y)) return resolveAction(action);
  }
  return Object.freeze({ status: 'miss' as const });
}

/** Resolves Enter/Space only for an explicitly focused action primitive. */
export function resolveArenaV2UiKeyboardIntentV1(
  plan: ArenaV2UiRenderPlanV1,
  focusedPrimitiveId: string | null,
  key: string,
): ArenaV2UiIntentResolutionV1 {
  if (focusedPrimitiveId === null || (key !== 'Enter' && key !== ' ')) {
    return Object.freeze({ status: 'miss' as const });
  }
  const action = actions(plan).find(({ id }) => id === focusedPrimitiveId);
  return action === undefined
    ? Object.freeze({ status: 'miss' as const })
    : resolveAction(action);
}

/** Applies wheel, drag or touch-scroll deltas to the authoritative layout range. */
export function resolveArenaV2UiScrollDeltaV1(
  plan: ArenaV2UiRenderPlanV1,
  previousOffsetCssPixelsValue: unknown,
  requestedDeltaCssPixelsValue: unknown,
): ArenaV2UiScrollResolutionV1 {
  if (plan.scrollRegion === null) throw new RangeError('Arena V2 HUD不支持内容滚动。');
  const previous = finite(previousOffsetCssPixelsValue, 'Arena V2 UI previous scroll offset');
  const delta = finite(requestedDeltaCssPixelsValue, 'Arena V2 UI requested scroll delta');
  const maximum = Math.max(0, plan.scrollRegion.contentHeight - plan.scrollRegion.viewport.height);
  if (previous < 0 || previous > maximum) {
    throw new RangeError('Arena V2 UI当前滚动位置不在布局边界内。');
  }
  const requested = previous + delta;
  const next = Math.max(0, Math.min(maximum, requested));
  return Object.freeze({
    status: 'scroll-resolved' as const,
    previousOffsetCssPixels: previous,
    requestedDeltaCssPixels: delta,
    nextOffsetCssPixels: next,
    minimumOffsetCssPixels: 0 as const,
    maximumOffsetCssPixels: maximum,
    clamped: next !== requested,
  });
}

/** Centers one scroll-owned primitive using only the current RenderPlan geometry. */
export function resolveArenaV2UiPrimitiveRevealV1(
  plan: ArenaV2UiRenderPlanV1,
  primitiveIdValue: unknown,
  previousOffsetCssPixelsValue: unknown,
): ArenaV2UiPrimitiveRevealResolutionV1 {
  if (plan.schemaVersion !== 1 || plan.productionReady !== false) {
    throw new RangeError('Arena V2 UI primitive reveal只接受RenderPlan V1候选。');
  }
  if (plan.scrollRegion === null) {
    throw new RangeError('Arena V2 UI primitive reveal需要内容滚动区域。');
  }
  if (typeof primitiveIdValue !== 'string' || primitiveIdValue.trim().length === 0
    || primitiveIdValue !== primitiveIdValue.trim()) {
    throw new TypeError('Arena V2 UI primitive reveal primitiveId必须是非空规范字符串。');
  }
  const matches = plan.primitives.filter(({ id, kind }) => (
    id === primitiveIdValue && (kind === 'text' || kind === 'action')
  ));
  if (matches.length !== 1) {
    throw new RangeError(`Arena V2 UI primitive reveal目标${primitiveIdValue}必须唯一存在。`);
  }
  const primitive = matches[0]!;
  const viewport = plan.scrollRegion.viewport;
  if (primitive.clipRect === null
    || primitive.clipRect.x !== viewport.x
    || primitive.clipRect.y !== viewport.y
    || primitive.clipRect.width !== viewport.width
    || primitive.clipRect.height !== viewport.height) {
    throw new RangeError(`Arena V2 UI primitive reveal目标${primitiveIdValue}不属于当前滚动区域。`);
  }
  const previous = scrollOffset(plan, previousOffsetCssPixelsValue);
  const maximum = Math.max(0, plan.scrollRegion.contentHeight - viewport.height);
  const desired = primitive.rect.y + primitive.rect.height / 2
    - (viewport.y + viewport.height / 2);
  const next = Math.max(0, Math.min(maximum, desired));
  return Object.freeze({
    status: 'primitive-reveal-resolved' as const,
    primitiveId: primitiveIdValue,
    previousOffsetCssPixels: previous,
    desiredOffsetCssPixels: desired,
    nextOffsetCssPixels: next,
    minimumOffsetCssPixels: 0 as const,
    maximumOffsetCssPixels: maximum,
    changed: next !== previous,
    clamped: next !== desired,
  });
}

/** Centers one scroll-owned action using only the current RenderPlan geometry. */
export function resolveArenaV2UiActionRevealV1(
  plan: ArenaV2UiRenderPlanV1,
  primitiveIdValue: unknown,
  previousOffsetCssPixelsValue: unknown,
): ArenaV2UiActionRevealResolutionV1 {
  if (plan.schemaVersion !== 1 || plan.productionReady !== false) {
    throw new RangeError('Arena V2 UI action reveal只接受RenderPlan V1候选。');
  }
  if (plan.scrollRegion === null) {
    throw new RangeError('Arena V2 UI action reveal需要内容滚动区域。');
  }
  if (typeof primitiveIdValue !== 'string' || primitiveIdValue.trim().length === 0
    || primitiveIdValue !== primitiveIdValue.trim()) {
    throw new TypeError('Arena V2 UI action reveal primitiveId必须是非空规范字符串。');
  }
  const matches = plan.primitives.filter((primitive): primitive is Extract<
    ArenaV2UiRenderPrimitiveV1,
    { kind: 'action' }
  > => primitive.kind === 'action' && primitive.id === primitiveIdValue);
  if (matches.length !== 1) {
    throw new RangeError(`Arena V2 UI action reveal目标${primitiveIdValue}必须唯一存在。`);
  }
  const resolved = resolveArenaV2UiPrimitiveRevealV1(
    plan,
    primitiveIdValue,
    previousOffsetCssPixelsValue,
  );
  return Object.freeze({
    status: 'action-reveal-resolved' as const,
    primitiveId: primitiveIdValue,
    previousOffsetCssPixels: resolved.previousOffsetCssPixels,
    desiredOffsetCssPixels: resolved.desiredOffsetCssPixels,
    nextOffsetCssPixels: resolved.nextOffsetCssPixels,
    minimumOffsetCssPixels: 0 as const,
    maximumOffsetCssPixels: resolved.maximumOffsetCssPixels,
    changed: resolved.changed,
    clamped: resolved.clamped,
  });
}

export const ARENA_V2_UI_INTERACTION_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  supportedActivationKeys: Object.freeze(['Enter', ' '] as const),
  pointerLifecycleOwnedByHost: true as const,
  pointerPointUsesFrozenDataBoundary: true as const,
  pointerPointAccessorsExecuted: false as const,
  scrollLifecycleOwnedByHost: true as const,
  actionRevealUsesCurrentRenderPlanGeometry: true as const,
  actionRevealCentersAndClampsToScrollBounds: true as const,
  primitiveRevealUsesCurrentRenderPlanGeometry: true as const,
  primitiveRevealSupportsTextAndActions: true as const,
  validationStatus: 'not-run' as const,
});
