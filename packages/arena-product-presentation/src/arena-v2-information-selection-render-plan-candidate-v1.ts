import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2UiRectV1,
} from './arena-v2-information-screen-layout-v1.js';
import type {
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from './arena-v2-ui-render-plan-v1.js';
import { ARENA_V2_UI_VISUAL_TOKENS_V1 } from './arena-v2-ui-visual-tokens-v1.js';

export type ArenaV2InformationSelectionKindCandidateV1 =
  | 'mode'
  | 'character'
  | 'weapon'
  | 'map';

export interface ArenaV2InformationSelectionItemCandidateV1 {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly available?: boolean;
  readonly unavailableReason?: string | null;
}

export interface ArenaV2InformationSelectionProjectionCandidateV1 {
  readonly kind: ArenaV2InformationSelectionKindCandidateV1;
  readonly selectedId: string;
  readonly items: readonly ArenaV2InformationSelectionItemCandidateV1[];
}

const PROJECTION_KEYS = new Set(['kind', 'selectedId', 'items']);
const ITEM_KEYS = new Set([
  'id', 'label', 'description', 'available', 'unavailableReason',
]);
const REQUIRED_ITEM_KEYS = Object.freeze(['id', 'label', 'description'] as const);
const EXPECTED_SCREEN = Object.freeze({
  mode: 'mode-select',
  character: 'character-select',
  weapon: 'weapon-index',
  map: 'map-index',
} as const);

function rect(x: number, y: number, width: number, height: number): ArenaV2UiRectV1 {
  return Object.freeze({ x, y, width, height });
}

function selectionKind(value: unknown): ArenaV2InformationSelectionKindCandidateV1 {
  if (value !== 'mode' && value !== 'character' && value !== 'weapon' && value !== 'map') {
    throw new RangeError('Arena V2 information selection kind无效。');
  }
  return value;
}

function projection(value: unknown): ArenaV2InformationSelectionProjectionCandidateV1 {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'Arena V2 information selection projection'),
    'Arena V2 information selection projection',
  );
  assertKnownKeys(source, PROJECTION_KEYS, 'Arena V2 information selection projection');
  for (const key of PROJECTION_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 information selection projection缺少${key}。`);
    }
  }
  const kind = selectionKind(source.kind);
  const selectedId = assertNonEmptyString(
    source.selectedId,
    'Arena V2 information selection selectedId',
  );
  if (!Array.isArray(source.items)) {
    throw new TypeError('Arena V2 information selection items必须是数组。');
  }
  const minimum = kind === 'mode' ? 3 : kind === 'character' ? 6 : 1;
  const maximum = kind === 'mode' ? 3 : kind === 'character' ? 6 : kind === 'weapon' ? 28 : 16;
  if (source.items.length < minimum || source.items.length > maximum) {
    throw new RangeError(`Arena V2 ${kind} selection数量必须位于${minimum}到${maximum}。`);
  }
  const ids = new Set<string>();
  const items = Object.freeze(source.items.map((itemValue, index) => {
    const item = assertPlainRecord(itemValue, `Arena V2 selection item[${index}]`);
    assertKnownKeys(item, ITEM_KEYS, `Arena V2 selection item[${index}]`);
    for (const key of REQUIRED_ITEM_KEYS) {
      if (!Object.hasOwn(item, key)) {
        throw new TypeError(`Arena V2 selection item[${index}]缺少${key}。`);
      }
    }
    const id = assertNonEmptyString(item.id, `Arena V2 selection item[${index}].id`);
    if (ids.has(id)) throw new RangeError(`Arena V2 selection item ${id}重复。`);
    ids.add(id);
    const hasAvailability = Object.hasOwn(item, 'available');
    const hasUnavailableReason = Object.hasOwn(item, 'unavailableReason');
    if (hasAvailability !== hasUnavailableReason) {
      throw new TypeError(
        `Arena V2 selection item[${index}]必须同时提供available与unavailableReason。`,
      );
    }
    if (hasAvailability && typeof item.available !== 'boolean') {
      throw new TypeError(`Arena V2 selection item[${index}].available必须是布尔值。`);
    }
    const available = hasAvailability ? item.available as boolean : true;
    const unavailableReason = hasUnavailableReason
      ? item.unavailableReason === null
        ? null
        : assertNonEmptyString(
          item.unavailableReason,
          `Arena V2 selection item[${index}].unavailableReason`,
        )
      : null;
    if (available === (unavailableReason !== null)) {
      throw new RangeError(
        `Arena V2 selection item[${index}]可用性与不可用原因不闭合。`,
      );
    }
    return Object.freeze({
      id,
      label: assertNonEmptyString(item.label, `Arena V2 selection item[${index}].label`),
      description: assertNonEmptyString(
        item.description,
        `Arena V2 selection item[${index}].description`,
      ),
      ...(hasAvailability ? { available, unavailableReason } : {}),
    });
  }));
  if (!ids.has(selectedId)) {
    throw new RangeError('Arena V2 information selection selectedId不在items中。');
  }
  if (items.find(({ id }) => id === selectedId)?.available === false) {
    throw new RangeError('Arena V2 information selection selectedId不能指向不可用项。');
  }
  if (kind === 'mode' && items.map(({ id }) => id).join(',') !== 'duel,race,survival') {
    throw new RangeError('Arena V2 mode selection必须按duel/race/survival固定顺序。');
  }
  return Object.freeze({ kind, selectedId, items });
}

function panel(
  id: string,
  target: ArenaV2UiRectV1,
  clipRect: ArenaV2UiRectV1,
  selected: boolean,
  available: boolean,
): ArenaV2UiRenderPrimitiveV1 {
  return Object.freeze({
    kind: 'panel' as const,
    id,
    rect: target,
    clipRect,
    tone: !available ? 'muted' as const : selected ? 'secondary' as const : 'surface' as const,
    cornerRadiusCssPixels: ARENA_V2_UI_VISUAL_TOKENS_V1.radiiCssPixels.panel,
    zIndex: 1,
  });
}

function text(
  id: string,
  target: ArenaV2UiRectV1,
  clipRect: ArenaV2UiRectV1,
  value: string,
  role: 'label' | 'value',
  selected: boolean,
  available: boolean,
  maximumValueLines = 2,
): ArenaV2UiRenderPrimitiveV1 {
  return Object.freeze({
    kind: 'text' as const,
    id,
    rect: target,
    clipRect,
    text: value,
    accessibilityText: value,
    tone: !available
      ? 'muted' as const
      : selected
        ? 'strong' as const
        : role === 'label' ? 'secondary' as const : 'strong' as const,
    role,
    alignment: 'left' as const,
    maximumLines: role === 'label' ? 1 : maximumValueLines,
    fixedWidthNumeric: false,
    zIndex: 2,
  });
}

function accessibilityDescription(value: string): string {
  return value.replace(/[。！？；，,.!?;]+$/u, '');
}

/**
 * Adds secondary selection cards to an already closed information RenderPlan.
 * It never changes the one-primary-action contract or owns the selected value.
 */
export function addArenaV2InformationSelectionToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
  projectionValue: unknown,
): ArenaV2UiRenderPlanV1 {
  if (plan.schemaVersion !== 1 || plan.status !== 'layout-candidate'
    || plan.productionReady !== false || plan.surfaceKind !== 'information'
    || plan.scrollRegion === null) {
    throw new RangeError('Arena V2 information selection只接受未晋级信息RenderPlan V1。');
  }
  const value = projection(projectionValue);
  const expectedScreen = EXPECTED_SCREEN[value.kind];
  if (plan.identity !== expectedScreen) {
    throw new RangeError(`Arena V2 ${value.kind} selection不能接入${plan.identity}。`);
  }
  const viewport = plan.scrollRegion.viewport;
  const narrow = viewport.width < 760;
  const columns = value.kind === 'mode'
    ? narrow ? 1 : 3
    : value.kind === 'character'
      ? narrow ? 2 : 3
    : value.kind === 'weapon'
      ? narrow ? 2 : 4
      : narrow ? 1 : 2;
  const gap = narrow ? 10 : 14;
  const height = value.kind === 'mode'
    ? narrow ? 112 : 96
    : narrow ? 82 : 90;
  const width = (viewport.width - gap * (columns - 1)) / columns;
  const sectionStartY = viewport.y + plan.scrollRegion.contentHeight + gap;
  const primitives: ArenaV2UiRenderPrimitiveV1[] = [...plan.primitives];
  const characterPreviewHeight = narrow ? 250 : 300;
  const characterPreviewWidth = narrow
    ? Math.floor(viewport.width)
    : Math.min(420, Math.floor(viewport.width));
  if (value.kind === 'character') {
    primitives.push(panel(
      'selection:character:formal-preview:panel',
      rect(
        Math.floor(viewport.x + (viewport.width - characterPreviewWidth) / 2),
        Math.floor(sectionStartY),
        characterPreviewWidth,
        characterPreviewHeight,
      ),
      viewport,
      true,
      true,
    ));
  }
  const startY = value.kind === 'character'
    ? sectionStartY + characterPreviewHeight + gap
    : sectionStartY;
  value.items.forEach((item, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const target = rect(
      viewport.x + column * (width + gap),
      startY + row * (height + gap),
      width,
      height,
    );
    const selected = item.id === value.selectedId;
    const available = item.available ?? true;
    const unavailableReason = item.unavailableReason ?? null;
    const spokenDescription = accessibilityDescription(item.description);
    const prefix = `selection:${value.kind}:${item.id}`;
    primitives.push(
      panel(`${prefix}:panel`, target, viewport, selected, available),
      text(
        `${prefix}:label`,
        rect(target.x + 10, target.y + 8, target.width - 20, 22),
        viewport,
        `${selected ? '已选·' : !available ? '未开放·' : ''}${item.label}`,
        'label',
        selected,
        available,
      ),
      text(
        `${prefix}:description`,
        rect(target.x + 10, target.y + 33, target.width - 20, target.height - 41),
        viewport,
        item.description,
        'value',
        selected,
        available,
        value.kind === 'mode' && narrow ? 3 : 2,
      ),
      Object.freeze({
        kind: 'action' as const,
        id: `${prefix}:action`,
        rect: target,
        clipRect: viewport,
        intentId: `arena.v2.selection.${value.kind}.${encodeURIComponent(item.id)}`,
        label: item.label,
        accessibilityText: selected
          ? `${item.label}。${spokenDescription}。已选择`
          : available
            ? `选择${item.label}。${spokenDescription}`
            : `${item.label}。${spokenDescription}。${unavailableReason}`,
        enabled: available && !selected,
        disabledReason: selected ? '已选择' : unavailableReason,
        minimumTouchTargetCssPixels: 48 as const,
        tone: 'transparent' as const,
        zIndex: 3,
      }),
    );
  });
  const rows = Math.ceil(value.items.length / columns);
  const contentHeight = startY - viewport.y
    + rows * height
    + Math.max(0, rows - 1) * gap;
  const selected = value.items.find(({ id }) => id === value.selectedId)!;
  const selectedDescription = accessibilityDescription(selected.description);
  return Object.freeze({
    ...plan,
    identity: `${plan.identity}:selection-${value.kind}`,
    primitives: Object.freeze(primitives),
    scrollRegion: Object.freeze({
      ...plan.scrollRegion,
      contentHeight,
      verticalScrollRequired: contentHeight > viewport.height,
    }),
    liveAnnouncements: Object.freeze([
      ...plan.liveAnnouncements,
      `当前选择${selected.label}。${selectedDescription}。`,
    ]),
  });
}

export const ARENA_V2_INFORMATION_SELECTION_RENDER_PLAN_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  supportsPerItemAvailability: true as const,
  inputUsesFrozenDataBoundary: true as const,
  inputAccessorsExecuted: false as const,
  actionAccessibilityIncludesDescription: true as const,
  selectionAnnouncementIncludesDescription: true as const,
  narrowModeCardHeightCssPixels: 112 as const,
  narrowModeDescriptionMaximumLines: 3 as const,
  kinds: Object.freeze(['mode', 'character', 'weapon', 'map'] as const),
  validationStatus: 'not-run' as const,
});
