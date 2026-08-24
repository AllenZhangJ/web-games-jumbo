import {
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2UiViewportV1,
  type ArenaV2UiRectV1,
} from './arena-v2-information-screen-layout-v1.js';
import type { ArenaV2ModeHudFeedbackQueueProjectionV1 } from './arena-v2-mode-hud-feedback-queue-v1.js';
import {
  ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1,
  type ArenaV2ModeHudRenderModelV1,
} from './arena-v2-mode-hud-render-model-v1.js';

export const ARENA_V2_MODE_HUD_LAYOUT_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaV2ModeHudLayoutV1 {
  readonly schemaVersion: typeof ARENA_V2_MODE_HUD_LAYOUT_V1_SCHEMA_VERSION;
  readonly density: 'narrow' | 'regular';
  readonly safeRect: ArenaV2UiRectV1;
  readonly primaryTimerRect: ArenaV2UiRectV1;
  readonly preparationTimerRect: ArenaV2UiRectV1 | null;
  readonly localStatusRect: ArenaV2UiRectV1;
  readonly modeStatusRect: ArenaV2UiRectV1;
  readonly supplyRailRect: ArenaV2UiRectV1 | null;
  readonly supplyRailVisibility: 'empty' | 'visible' | 'deferred-no-space';
  readonly supplyItemRects: readonly Readonly<{
    readonly supplyId: string;
    readonly rect: ArenaV2UiRectV1;
    readonly worldPosition: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
  }>[];
  readonly feedbackRect: ArenaV2UiRectV1 | null;
  readonly feedbackVisibility: 'empty' | 'visible' | 'deferred-no-space';
  readonly visibleFeedbackSourceEventIds: readonly string[];
  readonly inputReservedRect: ArenaV2UiRectV1 | null;
  readonly fixedWidthNumeric: true;
  readonly horizontalOverflowAllowed: false;
}

const OPTION_KEYS = new Set(['reservedInputBottomCssPixels']);

function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isFinite(value) || (value as number) < minimum) {
    throw new RangeError(`${name}必须是大于等于${minimum}的有限数。`);
  }
  return value as number;
}

function rect(x: number, y: number, width: number, height: number): ArenaV2UiRectV1 {
  return Object.freeze({ x, y, width, height });
}

function reservedInputBottom(value: unknown): number {
  const source = cloneFrozenData(value, 'ArenaV2ModeHudLayoutOptionsV1');
  assertKnownKeys(source, OPTION_KEYS, 'ArenaV2ModeHudLayoutOptionsV1');
  return finiteAtLeast(
    source.reservedInputBottomCssPixels,
    0,
    'ArenaV2ModeHudLayoutOptionsV1.reservedInputBottomCssPixels',
  );
}

/**
 * Computes overlay-only geometry. World-space supply anchors are preserved for
 * the renderer; this module never projects them through a camera or infers
 * pickup distance.
 */
export function createArenaV2ModeHudLayoutV1(
  model: ArenaV2ModeHudRenderModelV1,
  feedback: ArenaV2ModeHudFeedbackQueueProjectionV1,
  viewportValue: unknown,
  optionsValue: unknown,
): ArenaV2ModeHudLayoutV1 {
  if (model.schemaVersion !== 1) {
    throw new RangeError('Arena V2 HUD Layout只支持RenderModel schema 1。');
  }
  if (feedback.schemaVersion !== 1 || feedback.modelTick !== model.tick) {
    throw new RangeError('Arena V2 HUD Layout反馈队列与RenderModel不闭合。');
  }
  if (feedback.visibleItems.length > 3) {
    throw new RangeError('Arena V2 HUD Layout反馈队列可见项超过3条。');
  }
  const view = createArenaV2UiViewportV1(viewportValue);
  const safeRect = rect(
    view.safeAreaInsets.left,
    view.safeAreaInsets.top,
    view.width - view.safeAreaInsets.left - view.safeAreaInsets.right,
    view.height - view.safeAreaInsets.top - view.safeAreaInsets.bottom,
  );
  if (safeRect.width < 240 || safeRect.height < 240) {
    throw new RangeError('Arena V2 HUD安全区小于最小可读尺寸。');
  }
  const reservedBottom = Math.min(
    safeRect.height - 120,
    reservedInputBottom(optionsValue),
  );
  const density = safeRect.width < 800 ? 'narrow' as const : 'regular' as const;
  const padding = density === 'narrow' ? 12 : 20;
  const gap = density === 'narrow' ? 8 : 12;
  const requestedTimerWidth = density === 'narrow'
    ? ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.primaryClock
      .minimumWidthCssPixels.narrow
    : ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.primaryClock
      .minimumWidthCssPixels.regular;
  const timerWidth = Math.min(requestedTimerWidth, safeRect.width - padding * 2);
  if (timerWidth < ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.primaryClock
    .minimumWidthCssPixels.narrow) {
    throw new RangeError('Arena V2 HUD主计时槽小于MM:SS最小可读宽度。');
  }
  const timerHeight = 60;
  const primaryTimerRect = rect(
    safeRect.x + (safeRect.width - timerWidth) / 2,
    safeRect.y + padding,
    timerWidth,
    timerHeight,
  );
  let localStatusRect: ArenaV2UiRectV1;
  let modeStatusRect: ArenaV2UiRectV1;
  const statusHeight = Math.max(
    84,
    22 + Math.max(model.localFacts.length, model.modeFacts.length) * 22,
  );
  if (density === 'narrow') {
    const statusTop = primaryTimerRect.y + primaryTimerRect.height + gap;
    const statusWidth = (safeRect.width - padding * 2 - gap) / 2;
    localStatusRect = rect(safeRect.x + padding, statusTop, statusWidth, statusHeight);
    modeStatusRect = rect(
      localStatusRect.x + statusWidth + gap,
      statusTop,
      statusWidth,
      statusHeight,
    );
  } else {
    localStatusRect = rect(safeRect.x + padding, safeRect.y + padding, 236, statusHeight);
    modeStatusRect = rect(
      safeRect.x + safeRect.width - padding - 276,
      safeRect.y + padding,
      276,
      statusHeight,
    );
  }
  const shortViewport = safeRect.height < 560;
  const supplyWidth = density === 'narrow' ? Math.min(148, safeRect.width * 0.4) : 180;
  const supplyItemHeight = shortViewport ? 50 : 58;
  const supplyTop = Math.max(localStatusRect.y + localStatusRect.height, modeStatusRect.y + modeStatusRect.height) + gap;
  const requestedSupplyRailRect = model.supplyItems.length === 0
    ? null
    : shortViewport
      ? rect(
        safeRect.x + padding,
        supplyTop,
        safeRect.width - padding * 2,
        supplyItemHeight,
      )
      : rect(
        safeRect.x + safeRect.width - padding - supplyWidth,
        supplyTop,
        supplyWidth,
        model.supplyItems.length * supplyItemHeight + Math.max(0, model.supplyItems.length - 1) * gap,
      );
  const inputTop = safeRect.y + safeRect.height - reservedBottom;
  const supplyRailFits = requestedSupplyRailRect === null
    || requestedSupplyRailRect.y + requestedSupplyRailRect.height <= inputTop;
  const supplyRailRect = supplyRailFits ? requestedSupplyRailRect : null;
  const supplyRailVisibility = model.supplyItems.length === 0
    ? 'empty' as const
    : supplyRailRect === null
      ? 'deferred-no-space' as const
      : 'visible' as const;
  const supplyItemRects = supplyRailRect === null
    ? Object.freeze([])
    : Object.freeze(model.supplyItems.map((supply, index) => Object.freeze({
      supplyId: supply.supplyId,
      rect: shortViewport
        ? rect(
          supplyRailRect.x + index * (supplyRailRect.width / model.supplyItems.length),
          supplyRailRect.y,
          supplyRailRect.width / model.supplyItems.length,
          supplyItemHeight,
        )
        : rect(
          supplyRailRect.x,
          supplyRailRect.y + index * (supplyItemHeight + gap),
          supplyRailRect.width,
          supplyItemHeight,
        ),
      worldPosition: supply.worldPosition,
    })));
  const feedbackItems = feedback.visibleItems;
  const feedbackAvailableWidth = supplyRailRect === null || shortViewport
    ? safeRect.width - padding * 2
    : Math.max(120, supplyRailRect.x - gap - (safeRect.x + padding));
  const feedbackWidth = Math.min(density === 'narrow' ? 300 : 420, feedbackAvailableWidth);
  const feedbackBottom = safeRect.y + safeRect.height - reservedBottom - gap;
  const statusBottom = Math.max(
    localStatusRect.y + localStatusRect.height,
    modeStatusRect.y + modeStatusRect.height,
  );
  const feedbackMinimumTop = shortViewport && supplyRailRect !== null
    ? supplyRailRect.y + supplyRailRect.height + gap
    : statusBottom + gap;
  const feedbackHasSpace = feedbackItems.length === 0
    || feedbackBottom - feedbackMinimumTop >= 72;
  const feedbackHeight = feedbackItems.length === 0 || !feedbackHasSpace
    ? 0
    : Math.min(
      density === 'narrow' ? 112 : 128,
      Math.max(72, feedbackBottom - feedbackMinimumTop),
    );
  const feedbackRect = feedbackItems.length === 0 || !feedbackHasSpace
    ? null
    : rect(
      supplyRailRect === null || shortViewport
        ? safeRect.x + (safeRect.width - feedbackWidth) / 2
        : safeRect.x + padding + (feedbackAvailableWidth - feedbackWidth) / 2,
      Math.max(feedbackMinimumTop, feedbackBottom - feedbackHeight),
      feedbackWidth,
      Math.min(feedbackHeight, Math.max(1, feedbackBottom - feedbackMinimumTop)),
    );
  const feedbackVisibility = feedbackItems.length === 0
    ? 'empty' as const
    : feedbackRect === null
      ? 'deferred-no-space' as const
      : 'visible' as const;
  const inputReservedRect = reservedBottom === 0
    ? null
    : rect(
      safeRect.x,
      safeRect.y + safeRect.height - reservedBottom,
      safeRect.width,
      reservedBottom,
    );
  return Object.freeze({
    schemaVersion: ARENA_V2_MODE_HUD_LAYOUT_V1_SCHEMA_VERSION,
    density,
    safeRect,
    primaryTimerRect,
    preparationTimerRect: model.preparationTimer === null
      ? null
      : rect(
        safeRect.x + (safeRect.width - Math.min(260, safeRect.width - padding * 2)) / 2,
        safeRect.y + safeRect.height * 0.34,
        Math.min(260, safeRect.width - padding * 2),
        96,
      ),
    localStatusRect,
    modeStatusRect,
    supplyRailRect,
    supplyRailVisibility,
    supplyItemRects,
    feedbackRect,
    feedbackVisibility,
    visibleFeedbackSourceEventIds: feedbackRect === null
      ? Object.freeze([])
      : Object.freeze(feedbackItems.map(({ sourceEventId }) => sourceEventId)),
    inputReservedRect,
    fixedWidthNumeric: true as const,
    horizontalOverflowAllowed: false as const,
  });
}
