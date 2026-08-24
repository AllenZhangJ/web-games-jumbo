import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type { ArenaV2InformationScreenRenderModelV1 } from './arena-v2-information-screen-render-model-v1.js';
import {
  resolveArenaV2InformationLongProgressReadableLayoutCandidateV1,
} from './arena-v2-information-long-progress-readable-layout-candidate-v1.js';

export const ARENA_V2_INFORMATION_SCREEN_LAYOUT_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaV2UiRectV1 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ArenaV2UiViewportV1 {
  readonly width: number;
  readonly height: number;
  readonly safeAreaInsets: Readonly<{
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  }>;
}

export interface ArenaV2InformationScreenLayoutV1 {
  readonly schemaVersion: typeof ARENA_V2_INFORMATION_SCREEN_LAYOUT_V1_SCHEMA_VERSION;
  readonly screenId: ArenaV2InformationScreenRenderModelV1['screenId'];
  readonly density: 'narrow' | 'regular';
  readonly safeRect: ArenaV2UiRectV1;
  readonly contentViewport: ArenaV2UiRectV1;
  readonly questionRect: ArenaV2UiRectV1;
  readonly firstViewItemRects: readonly Readonly<{
    readonly fieldId: string;
    readonly rect: ArenaV2UiRectV1;
  }>[];
  readonly deferredItemRects: readonly Readonly<{
    readonly fieldId: string;
    readonly rect: ArenaV2UiRectV1;
  }>[];
  readonly primaryActionRect: ArenaV2UiRectV1;
  readonly bottomNavigationRects: readonly Readonly<{
    readonly id: ArenaV2InformationScreenRenderModelV1['bottomNavigation'][number]['id'];
    readonly rect: ArenaV2UiRectV1;
  }>[];
  readonly contentHeight: number;
  readonly verticalScrollRequired: boolean;
  readonly horizontalOverflowAllowed: false;
  readonly primaryHitTarget: Readonly<{
    readonly intentId: ArenaV2InformationScreenRenderModelV1['primaryAction']['intentId'];
    readonly rect: ArenaV2UiRectV1;
  }> | null;
  readonly focusOrder: readonly 'primary-action'[];
}

const VIEWPORT_KEYS = new Set(['width', 'height', 'safeAreaInsets']);
const INSET_KEYS = new Set(['top', 'right', 'bottom', 'left']);

function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isFinite(value) || (value as number) < minimum) {
    throw new RangeError(`${name}必须是大于等于${minimum}的有限数。`);
  }
  return value as number;
}

function rect(x: number, y: number, width: number, height: number): ArenaV2UiRectV1 {
  return Object.freeze({ x, y, width, height });
}

export function createArenaV2UiViewportV1(value: unknown): ArenaV2UiViewportV1 {
  const source = cloneFrozenData(value, 'ArenaV2UiViewportV1');
  assertKnownKeys(source, VIEWPORT_KEYS, 'ArenaV2UiViewportV1');
  const safeAreaInsets = assertPlainRecord(
    source.safeAreaInsets,
    'ArenaV2UiViewportV1.safeAreaInsets',
  );
  assertKnownKeys(safeAreaInsets, INSET_KEYS, 'ArenaV2UiViewportV1.safeAreaInsets');
  const width = finiteAtLeast(source.width, 1, 'ArenaV2UiViewportV1.width');
  const height = finiteAtLeast(source.height, 1, 'ArenaV2UiViewportV1.height');
  const top = finiteAtLeast(safeAreaInsets.top, 0, 'ArenaV2UiViewportV1.safeAreaInsets.top');
  const right = finiteAtLeast(safeAreaInsets.right, 0, 'ArenaV2UiViewportV1.safeAreaInsets.right');
  const bottom = finiteAtLeast(safeAreaInsets.bottom, 0, 'ArenaV2UiViewportV1.safeAreaInsets.bottom');
  const left = finiteAtLeast(safeAreaInsets.left, 0, 'ArenaV2UiViewportV1.safeAreaInsets.left');
  if (left + right >= width || top + bottom >= height) {
    throw new RangeError('ArenaV2UiViewportV1安全区不能覆盖整个视口。');
  }
  return Object.freeze({
    width,
    height,
    safeAreaInsets: Object.freeze({ top, right, bottom, left }),
  });
}

function itemRects(
  fieldIds: readonly string[],
  startY: number,
  contentX: number,
  contentWidth: number,
  columns: number,
  height: number | ((fieldId: string, index: number, width: number) => number),
  gap: number,
): Readonly<{ readonly items: readonly Readonly<{ fieldId: string; rect: ArenaV2UiRectV1 }>[]; readonly endY: number }> {
  if (fieldIds.length === 0) return Object.freeze({ items: Object.freeze([]), endY: startY });
  const width = (contentWidth - gap * (columns - 1)) / columns;
  const heights = fieldIds.map((fieldId, index) => (
    typeof height === 'number' ? height : height(fieldId, index, width)
  ));
  const rows = Math.ceil(fieldIds.length / columns);
  const rowHeights = Array.from({ length: rows }, (_, row) => Math.max(
    ...heights.slice(row * columns, Math.min(fieldIds.length, (row + 1) * columns)),
  ));
  const rowStarts = rowHeights.map((_, row) => (
    startY + rowHeights.slice(0, row).reduce((total, value) => total + value, 0) + row * gap
  ));
  const items = fieldIds.map((fieldId, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    return Object.freeze({
      fieldId,
      rect: rect(
        contentX + column * (width + gap),
        rowStarts[row]!,
        width,
        heights[index]!,
      ),
    });
  });
  return Object.freeze({
    items: Object.freeze(items),
    endY: startY + rowHeights.reduce((total, value) => total + value, 0)
      + Math.max(0, rows - 1) * gap,
  });
}

/**
 * Shared geometry for DOM and Canvas consumers. It keeps the only primary
 * action pinned above bottom navigation while content can scroll vertically.
 */
export function createArenaV2InformationScreenLayoutV1(
  model: ArenaV2InformationScreenRenderModelV1,
  viewportValue: unknown,
): ArenaV2InformationScreenLayoutV1 {
  if (model.schemaVersion !== 1) {
    throw new RangeError('Arena V2页面Layout只支持RenderModel schema 1。');
  }
  const view = createArenaV2UiViewportV1(viewportValue);
  const safeRect = rect(
    view.safeAreaInsets.left,
    view.safeAreaInsets.top,
    view.width - view.safeAreaInsets.left - view.safeAreaInsets.right,
    view.height - view.safeAreaInsets.top - view.safeAreaInsets.bottom,
  );
  if (safeRect.width < 96 || safeRect.height < 240) {
    throw new RangeError('Arena V2页面安全区小于最小可交互尺寸。');
  }
  if (model.bottomNavigation.length > 0 && safeRect.width < 192) {
    throw new RangeError('Arena V2页面底部导航无法保持48px最小宽度。');
  }
  const density = safeRect.width < 760 ? 'narrow' as const : 'regular' as const;
  const padding = density === 'narrow' ? 16 : 24;
  const gap = density === 'narrow' ? 12 : 16;
  const contentX = safeRect.x + padding;
  const contentWidth = safeRect.width - padding * 2;
  const navigationHeight = model.bottomNavigation.length === 0 ? 0 : 64;
  const navigationTop = safeRect.y + safeRect.height - navigationHeight;
  const actionHeight = Math.max(56, model.primaryAction.minimumTouchTargetCssPixels);
  const actionRect = rect(
    contentX,
    navigationTop - actionHeight - gap,
    contentWidth,
    actionHeight,
  );
  const contentViewport = rect(
    contentX,
    safeRect.y + padding,
    contentWidth,
    Math.max(1, actionRect.y - gap - (safeRect.y + padding)),
  );
  const questionHeight = density === 'narrow' ? 96 : 112;
  const questionRect = rect(contentX, contentViewport.y, contentWidth, questionHeight);
  const firstColumns = density === 'narrow' ? 1 : Math.max(1, model.firstViewItems.length);
  const firstItemHeight = model.screenId === 'result-reward'
    ? 96
    : density === 'narrow' ? 72 : 96;
  const firstById = new Map(model.firstViewItems.map((item) => [item.fieldId, item]));
  const first = itemRects(
    model.firstViewItems.map(({ fieldId }) => fieldId),
    questionRect.y + questionRect.height + gap,
    contentX,
    contentWidth,
    firstColumns,
    (fieldId, _index, width) => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: model.screenId,
      fieldId,
      valueText: firstById.get(fieldId)!.valueText,
      textWidthCssPixels: Math.max(1, width - 24),
      baseCardHeightCssPixels: firstItemHeight,
      baseMaximumLines: 3,
    }).cardHeightCssPixels,
    gap,
  );
  const deferredColumns = density === 'narrow' ? 1 : Math.min(2, Math.max(1, model.deferredItems.length));
  const deferredItemHeight = model.screenId === 'home'
    && model.deferredItems.some(({ fieldId }) => fieldId === 'recent-records')
    ? density === 'narrow' ? 88 : 96
    : density === 'narrow' ? 58 : 68;
  const deferredById = new Map(model.deferredItems.map((item) => [item.fieldId, item]));
  const deferred = itemRects(
    model.deferredItems.map(({ fieldId }) => fieldId),
    first.endY + (model.deferredItems.length === 0 ? 0 : gap * 1.5),
    contentX,
    contentWidth,
    deferredColumns,
    (fieldId, _index, width) => resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
      schemaVersion: 1,
      screenId: model.screenId,
      fieldId,
      valueText: deferredById.get(fieldId)!.valueText,
      textWidthCssPixels: Math.max(1, width - 24),
      baseCardHeightCssPixels: deferredItemHeight,
      baseMaximumLines: 2,
    }).cardHeightCssPixels,
    gap,
  );
  const contentHeight = Math.max(questionRect.height, deferred.endY - contentViewport.y);
  const navigationRects = model.bottomNavigation.length === 0
    ? Object.freeze([])
    : Object.freeze(model.bottomNavigation.map(({ id }, index) => Object.freeze({
      id,
      rect: rect(
        safeRect.x + index * (safeRect.width / model.bottomNavigation.length),
        navigationTop,
        safeRect.width / model.bottomNavigation.length,
        navigationHeight,
      ),
    })));
  return Object.freeze({
    schemaVersion: ARENA_V2_INFORMATION_SCREEN_LAYOUT_V1_SCHEMA_VERSION,
    screenId: model.screenId,
    density,
    safeRect,
    contentViewport,
    questionRect,
    firstViewItemRects: first.items,
    deferredItemRects: deferred.items,
    primaryActionRect: actionRect,
    bottomNavigationRects: navigationRects,
    contentHeight,
    verticalScrollRequired: contentHeight > contentViewport.height,
    horizontalOverflowAllowed: false as const,
    primaryHitTarget: model.primaryAction.enabled
      ? Object.freeze({ intentId: model.primaryAction.intentId, rect: actionRect })
      : null,
    focusOrder: model.primaryAction.enabled
      ? Object.freeze(['primary-action'] as const)
      : Object.freeze([]),
  });
}
