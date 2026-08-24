import type {
  ArenaV2InformationScreenLayoutV1,
  ArenaV2UiRectV1,
} from './arena-v2-information-screen-layout-v1.js';
import type { ArenaV2InformationScreenRenderModelV1 } from './arena-v2-information-screen-render-model-v1.js';
import type { ArenaV2ModeHudLayoutV1 } from './arena-v2-mode-hud-layout-v1.js';
import type { ArenaV2ModeHudFeedbackQueueProjectionV1 } from './arena-v2-mode-hud-feedback-queue-v1.js';
import {
  ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1,
  type ArenaV2ModeHudRenderModelV1,
} from './arena-v2-mode-hud-render-model-v1.js';
import {
  ARENA_V2_UI_VISUAL_TOKENS_V1,
  type ArenaV2UiToneV1,
} from './arena-v2-ui-visual-tokens-v1.js';
import {
  resolveArenaV2InformationLongProgressReadableLayoutCandidateV1,
} from './arena-v2-information-long-progress-readable-layout-candidate-v1.js';

export type { ArenaV2UiToneV1 } from './arena-v2-ui-visual-tokens-v1.js';

export const ARENA_V2_UI_RENDER_PLAN_V1_SCHEMA_VERSION = 1 as const;

export type ArenaV2UiRenderPrimitiveV1 =
  | Readonly<{
    readonly kind: 'panel';
    readonly id: string;
    readonly rect: ArenaV2UiRectV1;
    readonly clipRect: ArenaV2UiRectV1 | null;
    readonly tone: ArenaV2UiToneV1;
    readonly cornerRadiusCssPixels: number;
    readonly zIndex: number;
  }>
  | Readonly<{
    readonly kind: 'text';
    readonly id: string;
    readonly rect: ArenaV2UiRectV1;
    readonly clipRect: ArenaV2UiRectV1 | null;
    readonly text: string;
    readonly accessibilityText: string;
    readonly tone: ArenaV2UiToneV1;
    readonly role:
      | 'question'
      | 'label'
      | 'value'
      | 'navigation'
      | 'hud-primary'
      | 'hud-secondary'
      | 'feedback'
      | 'feedback-kicker'
      | 'feedback-primary'
      | 'feedback-learning'
      | 'feedback-secondary';
    readonly alignment: 'left' | 'center' | 'right';
    readonly maximumLines: number;
    readonly fixedWidthNumeric: boolean;
    readonly zIndex: number;
  }>
  | Readonly<{
    readonly kind: 'action';
    readonly id: string;
    readonly rect: ArenaV2UiRectV1;
    readonly clipRect: ArenaV2UiRectV1 | null;
    readonly intentId: string;
    readonly label: string;
    readonly accessibilityText: string;
    readonly enabled: boolean;
    readonly disabledReason: string | null;
    readonly minimumTouchTargetCssPixels: 48;
    readonly tone: 'primary' | 'muted' | 'transparent';
    readonly zIndex: number;
  }>;

export interface ArenaV2UiRenderPlanV1 {
  readonly schemaVersion: typeof ARENA_V2_UI_RENDER_PLAN_V1_SCHEMA_VERSION;
  readonly surfaceKind: 'information' | 'hud';
  readonly identity: string;
  readonly revision: number;
  readonly status: 'layout-candidate';
  readonly productionReady: false;
  readonly primitives: readonly ArenaV2UiRenderPrimitiveV1[];
  readonly scrollRegion: Readonly<{
    readonly viewport: ArenaV2UiRectV1;
    readonly contentHeight: number;
    readonly verticalScrollRequired: boolean;
  }> | null;
  readonly liveAnnouncements: readonly string[];
  readonly audioCues: readonly Readonly<{
    readonly sourceEventId: string;
    readonly cueId: string;
  }>[];
  readonly worldAnchors: readonly Readonly<{
    readonly id: string;
    readonly position: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
    readonly label: string;
    readonly accessibilityText: string;
  }>[];
  readonly inputExclusionRect: ArenaV2UiRectV1 | null;
  readonly formalAssetIds: readonly [];
}

function insetRect(
  target: ArenaV2UiRectV1,
  horizontal: number,
  top: number,
  bottom: number,
): ArenaV2UiRectV1 {
  return Object.freeze({
    x: target.x + horizontal,
    y: target.y + top,
    width: Math.max(1, target.width - horizontal * 2),
    height: Math.max(1, target.height - top - bottom),
  });
}

function panel(
  id: string,
  target: ArenaV2UiRectV1,
  tone: ArenaV2UiToneV1,
  zIndex: number,
  clipRect: ArenaV2UiRectV1 | null = null,
): ArenaV2UiRenderPrimitiveV1 {
  return Object.freeze({
    kind: 'panel' as const,
    id,
    rect: target,
    clipRect,
    tone,
    cornerRadiusCssPixels: ARENA_V2_UI_VISUAL_TOKENS_V1.radiiCssPixels.panel,
    zIndex,
  });
}

function text(
  id: string,
  target: ArenaV2UiRectV1,
  value: string,
  accessibilityText: string,
  tone: ArenaV2UiToneV1,
  role: Extract<ArenaV2UiRenderPrimitiveV1, { kind: 'text' }>['role'],
  options: Readonly<{
    alignment?: 'left' | 'center' | 'right';
    maximumLines?: number;
    fixedWidthNumeric?: boolean;
    zIndex?: number;
    clipRect?: ArenaV2UiRectV1 | null;
  }> = {},
): ArenaV2UiRenderPrimitiveV1 {
  return Object.freeze({
    kind: 'text' as const,
    id,
    rect: target,
    clipRect: options.clipRect ?? null,
    text: value,
    accessibilityText,
    tone,
    role,
    alignment: options.alignment ?? 'left',
    maximumLines: options.maximumLines ?? 1,
    fixedWidthNumeric: options.fixedWidthNumeric ?? false,
    zIndex: options.zIndex ?? 2,
  });
}

function informationCardPrimitives(
  prefix: 'first' | 'deferred',
  screenId: ArenaV2InformationScreenRenderModelV1['screenId'],
  target: ArenaV2UiRectV1,
  item: ArenaV2InformationScreenRenderModelV1['firstViewItems'][number],
  clipRect: ArenaV2UiRectV1,
): readonly ArenaV2UiRenderPrimitiveV1[] {
  const tone = prefix === 'first' ? 'surface' as const : 'muted' as const;
  const readable = resolveArenaV2InformationLongProgressReadableLayoutCandidateV1({
    schemaVersion: 1,
    screenId,
    fieldId: item.fieldId,
    valueText: item.valueText,
    textWidthCssPixels: Math.max(1, target.width - 24),
    baseCardHeightCssPixels: target.height,
    baseMaximumLines: prefix === 'first' ? 3 : 2,
  });
  if (readable.cardHeightCssPixels !== target.height) {
    throw new RangeError('Arena V2长期进度RenderPlan与共享Layout高度不闭合。');
  }
  return Object.freeze([
    panel(`${prefix}:${item.fieldId}:panel`, target, tone, 1, clipRect),
    text(
      `${prefix}:${item.fieldId}:label`,
      Object.freeze({ x: target.x + 12, y: target.y + 10, width: target.width - 24, height: 20 }),
      item.label,
      item.label,
      'secondary',
      'label',
      { clipRect },
    ),
    text(
      `${prefix}:${item.fieldId}:value`,
      insetRect(target, 12, 32, 10),
      readable.visualText,
      item.accessibilityText,
      prefix === 'first' ? 'strong' : 'secondary',
      'value',
      {
        maximumLines: readable.maximumLines,
        fixedWidthNumeric: item.fixedWidthNumeric,
        clipRect,
      },
    ),
  ]);
}

export function createArenaV2InformationScreenRenderPlanV1(
  model: ArenaV2InformationScreenRenderModelV1,
  layout: ArenaV2InformationScreenLayoutV1,
): ArenaV2UiRenderPlanV1 {
  if (model.screenId !== layout.screenId) {
    throw new RangeError('Arena V2页面RenderModel与Layout身份不一致。');
  }
  const firstById = new Map(model.firstViewItems.map((item) => [item.fieldId, item]));
  const deferredById = new Map(model.deferredItems.map((item) => [item.fieldId, item]));
  const primitives: ArenaV2UiRenderPrimitiveV1[] = [
    panel('page-background', layout.safeRect, 'background', 0),
    text(
      'page-question',
      layout.questionRect,
      model.question,
      model.question,
      model.state === 'error' ? 'warning' : 'strong',
      'question',
      { maximumLines: 3, zIndex: 2, clipRect: layout.contentViewport },
    ),
  ];
  for (const entry of layout.firstViewItemRects) {
    const item = firstById.get(entry.fieldId);
    if (!item) throw new RangeError(`Arena V2页面Layout引用未知首屏字段${entry.fieldId}。`);
    primitives.push(...informationCardPrimitives(
      'first',
      model.screenId,
      entry.rect,
      item,
      layout.contentViewport,
    ));
  }
  for (const entry of layout.deferredItemRects) {
    const item = deferredById.get(entry.fieldId);
    if (!item) throw new RangeError(`Arena V2页面Layout引用未知延后字段${entry.fieldId}。`);
    primitives.push(...informationCardPrimitives(
      'deferred',
      model.screenId,
      entry.rect,
      item,
      layout.contentViewport,
    ));
  }
  primitives.push(Object.freeze({
    kind: 'action' as const,
    id: 'primary-action' as const,
    rect: layout.primaryActionRect,
    clipRect: null,
    intentId: model.primaryAction.intentId,
    label: model.primaryAction.label,
    accessibilityText: model.primaryAction.disabledReason === null
      ? model.primaryAction.label
      : `${model.primaryAction.label}，${model.primaryAction.disabledReason}`,
    enabled: model.primaryAction.enabled,
    disabledReason: model.primaryAction.disabledReason,
    minimumTouchTargetCssPixels: 48 as const,
    tone: model.primaryAction.enabled ? 'primary' as const : 'muted' as const,
    zIndex: 4,
  }));
  const navigationById = new Map(model.bottomNavigation.map((item) => [item.id, item]));
  for (const entry of layout.bottomNavigationRects) {
    const item = navigationById.get(entry.id);
    if (!item) throw new RangeError(`Arena V2页面Layout引用未知底部信息槽${entry.id}。`);
    primitives.push(
      panel(
        `navigation:${entry.id}:panel`,
        entry.rect,
        item.active ? 'secondary' : 'background',
        3,
      ),
      text(
        `navigation:${entry.id}:label`,
        entry.rect,
        item.label,
        `${item.label}${item.active ? '，当前入口' : ''}`,
        item.active ? 'strong' : 'secondary',
        'navigation',
        { alignment: 'center', zIndex: 4 },
      ),
      Object.freeze({
        kind: 'action' as const,
        id: `navigation:${entry.id}:action`,
        rect: entry.rect,
        clipRect: null,
        intentId: `arena.v2.bottom-navigation.${entry.id}`,
        label: item.label,
        accessibilityText: item.active ? `${item.label}，当前入口` : `打开${item.label}`,
        enabled: !item.active,
        disabledReason: item.active ? '当前入口' : null,
        minimumTouchTargetCssPixels: 48 as const,
        tone: 'transparent' as const,
        zIndex: 5,
      }),
    );
  }
  return Object.freeze({
    schemaVersion: ARENA_V2_UI_RENDER_PLAN_V1_SCHEMA_VERSION,
    surfaceKind: 'information' as const,
    identity: model.screenId,
    revision: model.revision,
    status: 'layout-candidate' as const,
    productionReady: false as const,
    primitives: Object.freeze(primitives),
    scrollRegion: Object.freeze({
      viewport: layout.contentViewport,
      contentHeight: layout.contentHeight,
      verticalScrollRequired: layout.verticalScrollRequired,
    }),
    liveAnnouncements: Object.freeze([model.announcement]),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: [] as const,
  });
}

function factPrimitives(
  prefix: string,
  target: ArenaV2UiRectV1,
  facts: ReadonlyArray<ArenaV2ModeHudRenderModelV1['localFacts'][number]>,
): readonly ArenaV2UiRenderPrimitiveV1[] {
  const rowHeight = target.height / Math.max(1, facts.length);
  return Object.freeze(facts.map((item, index) => text(
    `${prefix}:${item.id}`,
    Object.freeze({
      x: target.x + 10,
      y: target.y + index * rowHeight,
      width: target.width - 20,
      height: rowHeight,
    }),
    `${item.label}  ${item.valueText}`,
    item.accessibilityText,
    item.emphasis === 'warning' ? 'warning' : item.emphasis === 'strong' ? 'strong' : 'secondary',
    'hud-secondary',
    { maximumLines: 1, fixedWidthNumeric: item.fixedWidthNumeric, zIndex: 5 },
  )));
}

function feedbackCategoryLabel(
  category: ArenaV2ModeHudRenderModelV1['feedbackItems'][number]['category'],
): string {
  if (category === 'weapon') return '命中反馈';
  if (category === 'supply') return '地图武器';
  return '模式事件';
}

function feedbackFocusOrder(
  left: ArenaV2ModeHudRenderModelV1['feedbackItems'][number],
  right: ArenaV2ModeHudRenderModelV1['feedbackItems'][number],
): number {
  const critical = (item: typeof left): number => item.emphasis === 'warning' ? 1 : 0;
  const learning = (item: typeof left): number => (
    isWeaponLearningFeedback(item) ? 1 : 0
  );
  const emphasis = (item: typeof left): number => (
    item.emphasis === 'warning' ? 3 : item.emphasis === 'strong' ? 2 : 1
  );
  const category = (item: typeof left): number => (
    item.category === 'weapon' ? 3 : item.category === 'mode' ? 2 : 1
  );
  return critical(right) - critical(left)
    || learning(right) - learning(left)
    || emphasis(right) - emphasis(left)
    || category(right) - category(left)
    || right.tick - left.tick
    || right.sequence - left.sequence
    || right.sourceEventId.localeCompare(left.sourceEventId);
}

function isWeaponLearningFeedback(
  item: ArenaV2ModeHudRenderModelV1['feedbackItems'][number],
): boolean {
  return (item.category === 'weapon'
      && (item.explanation.startsWith('本招用途：')
        || item.explanation.startsWith('下次注意：')
        || item.explanation.startsWith('下次可')))
    || (item.category === 'supply' && item.explanation.startsWith('当前地图'));
}

export function createArenaV2ModeHudRenderPlanV1(
  model: ArenaV2ModeHudRenderModelV1,
  feedback: ArenaV2ModeHudFeedbackQueueProjectionV1,
  layout: ArenaV2ModeHudLayoutV1,
): ArenaV2UiRenderPlanV1 {
  if (feedback.schemaVersion !== 1 || feedback.modelTick !== model.tick) {
    throw new RangeError('Arena V2 HUD RenderPlan反馈队列与RenderModel不闭合。');
  }
  const localFactRect = insetRect(layout.localStatusRect, 0, 22, 0);
  const modeFactRect = insetRect(layout.modeStatusRect, 0, 22, 0);
  const primitives: ArenaV2UiRenderPrimitiveV1[] = [
    panel('hud:timer:panel', layout.primaryTimerRect, model.modePresentation.accentTone, 4),
    text(
      'hud:timer:mode',
      Object.freeze({
        x: layout.primaryTimerRect.x + 10,
        y: layout.primaryTimerRect.y + 4,
        width: layout.primaryTimerRect.width - 20,
        height: 16,
      }),
      `${model.modePresentation.modeLabel} · ${model.modePresentation.objectiveText}`,
      `${model.modePresentation.modeLabel}模式，目标${model.modePresentation.objectiveText}`,
      model.modePresentation.accentTone === 'warning' ? 'primary' : 'background',
      'label',
      { alignment: 'center', maximumLines: 1, zIndex: 5 },
    ),
    text(
      'hud:timer:value',
      Object.freeze({
        x: layout.primaryTimerRect.x,
        y: layout.primaryTimerRect.y + 19,
        width: layout.primaryTimerRect.width,
        height: layout.primaryTimerRect.height - 19,
      }),
      model.primaryTimer.valueText,
      `${model.primaryTimer.label}，${model.primaryTimer.accessibilityText}`,
      model.primaryTimer.emphasis === 'warning' ? 'warning' : 'strong',
      'hud-primary',
      { alignment: 'center', fixedWidthNumeric: true, zIndex: 5 },
    ),
    panel('hud:local:panel', layout.localStatusRect, 'surface', 4),
    panel('hud:mode:panel', layout.modeStatusRect, 'surface', 4),
    text(
      'hud:local:label',
      Object.freeze({
        x: layout.localStatusRect.x + 10,
        y: layout.localStatusRect.y + 3,
        width: layout.localStatusRect.width - 20,
        height: 18,
      }),
      model.modePresentation.localPanelLabel,
      model.modePresentation.localPanelLabel,
      'muted',
      'label',
      { maximumLines: 1, zIndex: 5 },
    ),
    text(
      'hud:mode:label',
      Object.freeze({
        x: layout.modeStatusRect.x + 10,
        y: layout.modeStatusRect.y + 3,
        width: layout.modeStatusRect.width - 20,
        height: 18,
      }),
      model.modePresentation.modePanelLabel,
      model.modePresentation.modePanelLabel,
      'muted',
      'label',
      { maximumLines: 1, zIndex: 5 },
    ),
    ...factPrimitives('hud:local', localFactRect, model.localFacts),
    ...factPrimitives('hud:mode', modeFactRect, model.modeFacts),
  ];
  if (layout.preparationTimerRect !== null && model.preparationTimer !== null) {
    primitives.push(
      panel('hud:preparation:panel', layout.preparationTimerRect, 'primary', 8),
      text(
        'hud:preparation:value',
        layout.preparationTimerRect,
        model.preparationTimer.valueText,
        model.preparationTimer.accessibilityText,
        'strong',
        'hud-primary',
        { alignment: 'center', fixedWidthNumeric: true, zIndex: 9 },
      ),
    );
  }
  const supplyById = new Map(model.supplyItems.map((item) => [item.supplyId, item]));
  for (const entry of layout.supplyItemRects) {
    const item = supplyById.get(entry.supplyId);
    if (!item) throw new RangeError(`Arena V2 HUD Layout引用未知供给${entry.supplyId}。`);
    const horizontalInset = entry.rect.width
      < ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.shortCountdown
        .minimumValueWidthCssPixels + 16
      ? 4
      : 8;
    const nameHeight = Math.min(22, Math.max(16, entry.rect.height * 0.4));
    primitives.push(
      panel(`hud:supply:${item.supplyId}:panel`, entry.rect, 'secondary', 4),
      text(
        `hud:supply:${item.supplyId}:name`,
        Object.freeze({
          x: entry.rect.x + horizontalInset,
          y: entry.rect.y + 3,
          width: entry.rect.width - horizontalInset * 2,
          height: nameHeight,
        }),
        `${item.displayName} · ${item.coreVerbText}`,
        `地图武器${item.displayName}`,
        'secondary',
        'label',
        { alignment: 'center', maximumLines: 1, zIndex: 5 },
      ),
      text(
        `hud:supply:${item.supplyId}:time`,
        Object.freeze({
          x: entry.rect.x + horizontalInset,
          y: entry.rect.y + nameHeight + 3,
          width: entry.rect.width - horizontalInset * 2,
          height: Math.max(1, entry.rect.height - nameHeight - 6),
        }),
        `Lv.${item.survivalLevel} · ${item.remainingTickText}`,
        item.accessibilityText,
        'strong',
        'hud-secondary',
        { alignment: 'center', maximumLines: 1, fixedWidthNumeric: true, zIndex: 5 },
      ),
    );
  }
  if (layout.feedbackRect !== null) {
    const feedbackById = new Map(
      feedback.visibleItems.map((item) => [item.sourceEventId, item]),
    );
    const visible = layout.visibleFeedbackSourceEventIds.map((id) => {
      const item = feedbackById.get(id);
      if (!item) throw new RangeError(`Arena V2 HUD Layout引用未知反馈${id}。`);
      return item;
    });
    const focused = [...visible].sort(feedbackFocusOrder);
    const primary = focused[0]!;
    const learningFocus = isWeaponLearningFeedback(primary);
    const secondary = learningFocus && layout.density === 'narrow'
      ? []
      : focused.slice(1, 3);
    const feedbackRect = layout.feedbackRect;
    const primaryRect = layout.density === 'regular' && secondary.length > 0
      ? Object.freeze({
        x: feedbackRect.x,
        y: feedbackRect.y,
        width: feedbackRect.width * 0.66,
        height: feedbackRect.height,
      })
      : Object.freeze({
        x: feedbackRect.x,
        y: feedbackRect.y,
        width: feedbackRect.width,
        height: secondary.length === 0 ? feedbackRect.height : feedbackRect.height * 0.66,
      });
    const secondaryRect = secondary.length === 0
      ? null
      : layout.density === 'regular'
        ? Object.freeze({
          x: primaryRect.x + primaryRect.width + 8,
          y: feedbackRect.y,
          width: Math.max(1, feedbackRect.width - primaryRect.width - 8),
          height: feedbackRect.height,
        })
        : Object.freeze({
          x: feedbackRect.x,
          y: primaryRect.y + primaryRect.height + 6,
          width: feedbackRect.width,
          height: Math.max(1, feedbackRect.height - primaryRect.height - 6),
        });
    const expandedPrimaryFeedback = primaryRect.height >= 64;
    const expandedLearningFeedback = expandedPrimaryFeedback && learningFocus;
    const titleTop = primaryRect.y + (expandedPrimaryFeedback ? 23 : 16);
    const titleHeight = expandedLearningFeedback
      ? Math.min(40, Math.max(36, primaryRect.height * 0.32))
      : expandedPrimaryFeedback
        ? Math.max(24, primaryRect.height * 0.34)
        : Math.max(18, primaryRect.height - 18);
    const explanationTop = titleTop + titleHeight + 2;
    primitives.push(
      panel('hud:feedback:panel', feedbackRect, 'background', 6),
      panel(
        `hud:feedback:${primary.sourceEventId}:primary-panel`,
        primaryRect,
        primary.emphasis === 'warning' ? 'warning' : primary.emphasis === 'strong' ? 'secondary' : 'surface',
        7,
      ),
      text(
        `hud:feedback:${primary.sourceEventId}:kicker`,
        Object.freeze({
          x: primaryRect.x + 12,
          y: primaryRect.y + (expandedPrimaryFeedback ? 7 : 3),
          width: primaryRect.width - 24,
          height: expandedPrimaryFeedback ? 18 : 14,
        }),
        feedbackCategoryLabel(primary.category),
        feedbackCategoryLabel(primary.category),
        primary.emphasis === 'warning' ? 'primary' : 'background',
        'feedback-kicker',
        { maximumLines: 1, zIndex: 8 },
      ),
      text(
        `hud:feedback:${primary.sourceEventId}:title`,
        Object.freeze({
          x: primaryRect.x + 12,
          y: titleTop,
          width: primaryRect.width - 24,
          height: titleHeight,
        }),
        primary.title,
        `${primary.title}。${primary.explanation}`,
        primary.emphasis === 'warning' ? 'primary' : 'strong',
        'feedback-primary',
        { maximumLines: expandedLearningFeedback ? 2 : 1, zIndex: 8 },
      ),
    );
    if (expandedPrimaryFeedback) {
      primitives.push(text(
        `hud:feedback:${primary.sourceEventId}:explanation`,
        Object.freeze({
          x: primaryRect.x + 12,
          y: expandedLearningFeedback
            ? explanationTop
            : primaryRect.y + Math.max(52, primaryRect.height * 0.57),
          width: primaryRect.width - 24,
          height: expandedLearningFeedback
            ? Math.max(18, primaryRect.y + primaryRect.height - explanationTop - 6)
            : Math.max(18, primaryRect.height - Math.max(58, primaryRect.height * 0.57)),
        }),
        primary.explanation,
        primary.explanation,
        primary.emphasis === 'warning' ? 'primary' : 'secondary',
        expandedLearningFeedback ? 'feedback-learning' : 'feedback-secondary',
        { maximumLines: expandedLearningFeedback ? 3 : 2, zIndex: 8 },
      ));
    }
    if (secondaryRect !== null) {
      const rowHeight = secondaryRect.height / secondary.length;
      secondary.forEach((item, index) => {
        const row = Object.freeze({
          x: secondaryRect.x,
          y: secondaryRect.y + index * rowHeight,
          width: secondaryRect.width,
          height: rowHeight,
        });
        primitives.push(
          panel(
            `hud:feedback:${item.sourceEventId}:secondary-panel`,
            row,
            item.emphasis === 'warning' ? 'warning' : 'surface',
            7,
          ),
          text(
            `hud:feedback:${item.sourceEventId}:secondary`,
            Object.freeze({
              x: row.x + 9,
              y: row.y + 4,
              width: row.width - 18,
              height: row.height - 8,
            }),
            item.title,
            `${item.title}。${item.explanation}`,
            item.emphasis === 'warning' ? 'primary' : item.emphasis === 'strong' ? 'strong' : 'secondary',
            'feedback-secondary',
            { maximumLines: 2, zIndex: 8 },
          ),
        );
      });
    }
  }
  return Object.freeze({
    schemaVersion: ARENA_V2_UI_RENDER_PLAN_V1_SCHEMA_VERSION,
    surfaceKind: 'hud' as const,
    identity: `${model.modeDefinitionId}:${model.tick}`,
    revision: model.tick,
    status: 'layout-candidate' as const,
    productionReady: false as const,
    primitives: Object.freeze(primitives),
    scrollRegion: null,
    liveAnnouncements: feedback.liveAnnouncements,
    audioCues: feedback.oneShotAudioCues,
    worldAnchors: Object.freeze(model.supplyItems.map((item) => Object.freeze({
      id: item.supplyId,
      position: item.worldPosition,
      label: `${item.displayName} · Lv.${item.survivalLevel}`,
      accessibilityText: item.accessibilityText,
    }))),
    inputExclusionRect: layout.inputReservedRect,
    formalAssetIds: [] as const,
  });
}

export const ARENA_V2_MODE_HUD_FEEDBACK_READABILITY_CONTRACT_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  validationStatus: 'not-run' as const,
  impactStrengthLabelPosition: 'title-prefix' as const,
  impactDirectionLabelPosition: 'title-prefix-after-strength' as const,
  weaponLearningHintPosition: 'explanation-prefix' as const,
  localCounterplayHintPosition: 'explanation-prefix' as const,
  criticalWarningsPrecedeLearningFeedback: true as const,
  learningFeedbackPrecedesNonCriticalFeedback: true as const,
  localPickupMapOpportunityPosition: 'explanation-prefix' as const,
  primaryLearningTitleMaximumLines: 2 as const,
  primaryLearningExplanationMaximumLines: 3 as const,
  narrowLearningFocusSecondaryCardsRendered: false as const,
  hiddenSecondaryItemsRemainQueuedAndLiveAnnounced: true as const,
  canvasLineCountBoundedByAvailableHeight: true as const,
  singleLineHudFactsUseMeasuredEllipsis: true as const,
  truncatedVisibleTextRetainsFullAccessibilityText: true as const,
  reducedMotionRetainsCausalAndLearningText: true as const,
  ownsRuleOrMatchAuthority: false as const,
});
