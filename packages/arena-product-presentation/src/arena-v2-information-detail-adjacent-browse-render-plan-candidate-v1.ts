import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type { ArenaV2UiRectV1 } from './arena-v2-information-screen-layout-v1.js';
import type {
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from './arena-v2-ui-render-plan-v1.js';

export type ArenaV2InformationDetailBrowseKindCandidateV1 = 'weapon' | 'map';

export interface ArenaV2InformationDetailBrowseItemCandidateV1 {
  readonly definitionId: string;
  readonly displayName: string;
}

export interface ArenaV2InformationDetailBrowseProjectionCandidateV1 {
  readonly kind: ArenaV2InformationDetailBrowseKindCandidateV1;
  readonly selectedDefinitionId: string;
  readonly orderedItems: readonly ArenaV2InformationDetailBrowseItemCandidateV1[];
}

export interface ArenaV2InformationDetailBrowseTargetCandidateV1 {
  readonly direction: 'previous' | 'next' | 'other';
  readonly item: ArenaV2InformationDetailBrowseItemCandidateV1;
}

const PROJECTION_KEYS = new Set(['kind', 'selectedDefinitionId', 'orderedItems']);
const ITEM_KEYS = new Set(['definitionId', 'displayName']);
const PRIMARY_ACTION_ID = 'primary-action';
const QUESTION_ID = 'page-question';
const ACTION_PREFIX = 'secondary:detail:adjacent:';
const POSITION_ID = 'secondary:detail:browse-position';
const INTENT_PREFIX = 'arena.v2.detail-adjacent.';

function rect(x: number, y: number, width: number, height: number): ArenaV2UiRectV1 {
  return Object.freeze({ x, y, width, height });
}

function projection(
  value: unknown,
): ArenaV2InformationDetailBrowseProjectionCandidateV1 {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'Arena V2 detail browse projection'),
    'Arena V2 detail browse projection',
  );
  assertKnownKeys(source, PROJECTION_KEYS, 'Arena V2 detail browse projection');
  for (const key of PROJECTION_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 detail browse projection缺少${key}。`);
    }
  }
  if (source.kind !== 'weapon' && source.kind !== 'map') {
    throw new RangeError('Arena V2 detail browse kind无效。');
  }
  const kind = source.kind;
  const selectedDefinitionId = assertNonEmptyString(
    source.selectedDefinitionId,
    'Arena V2 detail browse selectedDefinitionId',
  );
  if (!Array.isArray(source.orderedItems) || source.orderedItems.length === 0
    || source.orderedItems.length > (kind === 'weapon' ? 28 : 16)) {
    throw new RangeError('Arena V2 detail browse目录数量无效。');
  }
  const ids = new Set<string>();
  const orderedItems = Object.freeze(source.orderedItems.map((itemValue, index) => {
    const item = assertPlainRecord(itemValue, `Arena V2 detail browse item[${index}]`);
    assertKnownKeys(item, ITEM_KEYS, `Arena V2 detail browse item[${index}]`);
    for (const key of ITEM_KEYS) {
      if (!Object.hasOwn(item, key)) {
        throw new TypeError(`Arena V2 detail browse item[${index}]缺少${key}。`);
      }
    }
    const definitionId = assertNonEmptyString(
      item.definitionId,
      `Arena V2 detail browse item[${index}].definitionId`,
    );
    if (ids.has(definitionId)) {
      throw new RangeError(`Arena V2 detail browse item ${definitionId}重复。`);
    }
    ids.add(definitionId);
    return Object.freeze({
      definitionId,
      displayName: assertNonEmptyString(
        item.displayName,
        `Arena V2 detail browse item[${index}].displayName`,
      ),
    });
  }));
  if (!ids.has(selectedDefinitionId)) {
    throw new RangeError('Arena V2 detail browse当前选择不在可浏览目录中。');
  }
  return Object.freeze({ kind, selectedDefinitionId, orderedItems });
}

function adjacentTargetsFromProjection(
  value: ArenaV2InformationDetailBrowseProjectionCandidateV1,
): readonly ArenaV2InformationDetailBrowseTargetCandidateV1[] {
  if (value.orderedItems.length === 1) return Object.freeze([]);
  const selectedIndex = value.orderedItems.findIndex(
    ({ definitionId }) => definitionId === value.selectedDefinitionId,
  );
  if (value.orderedItems.length === 2) {
    return Object.freeze([Object.freeze({
      direction: 'other' as const,
      item: value.orderedItems[selectedIndex === 0 ? 1 : 0]!,
    })]);
  }
  return Object.freeze([
    Object.freeze({
      direction: 'previous' as const,
      item: value.orderedItems[
        (selectedIndex - 1 + value.orderedItems.length) % value.orderedItems.length
      ]!,
    }),
    Object.freeze({
      direction: 'next' as const,
      item: value.orderedItems[(selectedIndex + 1) % value.orderedItems.length]!,
    }),
  ]);
}

export function resolveArenaV2InformationDetailAdjacentBrowseTargetsCandidateV1(
  projectionValue: unknown,
): readonly ArenaV2InformationDetailBrowseTargetCandidateV1[] {
  return adjacentTargetsFromProjection(projection(projectionValue));
}

/** Adds optional previous/next browsing without changing detail primary intent. */
export function addArenaV2InformationDetailAdjacentBrowseToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
  projectionValue: unknown,
): ArenaV2UiRenderPlanV1 {
  if (plan.schemaVersion !== 1 || plan.status !== 'layout-candidate'
    || plan.productionReady !== false || plan.surfaceKind !== 'information'
    || plan.scrollRegion === null) {
    throw new RangeError('Arena V2 detail adjacent browse只接受未晋级信息RenderPlan V1。');
  }
  const value = projection(projectionValue);
  const expectedScreen = value.kind === 'weapon' ? 'weapon-detail' : 'map-detail';
  if (plan.identity !== expectedScreen) {
    throw new RangeError(`Arena V2 ${value.kind} detail browse不能接入${plan.identity}。`);
  }
  if (plan.primitives.filter(
    ({ id, kind }) => id === PRIMARY_ACTION_ID && kind === 'action',
  ).length !== 1) {
    throw new RangeError('Arena V2 detail adjacent browse必须保留精确一个主动作。');
  }
  const questions = plan.primitives.filter(({ id }) => id === QUESTION_ID);
  if (questions.length !== 1) {
    throw new RangeError('Arena V2 detail adjacent browse必须保留精确一个页面问题。');
  }
  const question = questions[0]!;
  if (question.kind !== 'text' || question.role !== 'question') {
    throw new RangeError('Arena V2 detail adjacent browse必须保留精确一个页面问题。');
  }
  if (plan.primitives.some(({ id }) => id.startsWith(ACTION_PREFIX) || id === POSITION_ID)) {
    throw new RangeError('Arena V2 detail adjacent browse不得重复接入。');
  }
  const targets = adjacentTargetsFromProjection(value);
  const viewport = plan.scrollRegion.viewport;
  const gap = 8;
  const positionHeight = 24;
  const actionHeight = 48;
  const actionWidth = targets.length === 0
    ? 0
    : (viewport.width - gap * (targets.length - 1)) / targets.length;
  if (targets.length > 0 && actionWidth < 48) {
    throw new RangeError('Arena V2 detail adjacent browse无法满足48px点击下限。');
  }
  const positionY = viewport.y + plan.scrollRegion.contentHeight + 12;
  const actionY = positionY + positionHeight + gap;
  const kindText = value.kind === 'weapon' ? '把武器' : '张地图';
  const selectedIndex = value.orderedItems.findIndex(
    ({ definitionId }) => definitionId === value.selectedDefinitionId,
  );
  const selectedName = value.orderedItems[selectedIndex]!.displayName;
  const collectionKindText = value.kind === 'weapon' ? '武器' : '地图';
  const primitives: ArenaV2UiRenderPrimitiveV1[] = plan.primitives.map((primitive) => (
    primitive.id === QUESTION_ID && primitive.kind === 'text'
      ? Object.freeze({
        ...primitive,
        text: `${selectedName}｜${primitive.text}`,
        accessibilityText: `当前浏览${collectionKindText}：${selectedName}。${
          primitive.accessibilityText
        }`,
      })
      : primitive
  ));
  primitives.push(Object.freeze({
    kind: 'text' as const,
    id: POSITION_ID,
    rect: rect(viewport.x, positionY, viewport.width, positionHeight),
    clipRect: viewport,
    text: `${collectionKindText} ${selectedIndex + 1} / ${value.orderedItems.length}`,
    accessibilityText: `当前浏览${selectedName}，第${selectedIndex + 1}项，共${value.orderedItems.length}项`,
    tone: 'secondary' as const,
    role: 'label' as const,
    alignment: 'right' as const,
    maximumLines: 1,
    fixedWidthNumeric: true,
    zIndex: 3,
  }));
  targets.forEach((target, index) => {
    const directionLabel = target.direction === 'previous'
      ? `上一${kindText}`
      : target.direction === 'next'
        ? `下一${kindText}`
        : `另一${kindText}`;
    const visibleDirectionLabel = target.direction === 'previous'
      ? value.kind === 'weapon' ? '上把' : '上张'
      : target.direction === 'next'
        ? value.kind === 'weapon' ? '下把' : '下张'
        : value.kind === 'weapon' ? '另一把' : '另一张';
    primitives.push(Object.freeze({
      kind: 'action' as const,
      id: `${ACTION_PREFIX}${target.direction}:action`,
      rect: rect(
        viewport.x + index * (actionWidth + gap),
        actionY,
        actionWidth,
        actionHeight,
      ),
      clipRect: viewport,
      intentId: `${INTENT_PREFIX}${value.kind}.${encodeURIComponent(
        target.item.definitionId,
      )}`,
      label: `${visibleDirectionLabel}·${target.item.displayName}`,
      accessibilityText: `${directionLabel}：${target.item.displayName}`,
      enabled: true,
      disabledReason: null,
      minimumTouchTargetCssPixels: 48 as const,
      tone: 'muted' as const,
      zIndex: 3,
    }));
  });
  const contentHeight = plan.scrollRegion.contentHeight + 12 + positionHeight
    + (targets.length === 0 ? 0 : gap + actionHeight);
  return Object.freeze({
    ...plan,
    identity: `${plan.identity}:browse-${value.kind}:${encodeURIComponent(
      value.selectedDefinitionId,
    )}`,
    primitives: Object.freeze(primitives),
    scrollRegion: Object.freeze({
      ...plan.scrollRegion,
      contentHeight,
      verticalScrollRequired: contentHeight > viewport.height,
    }),
    liveAnnouncements: Object.freeze([
      ...plan.liveAnnouncements,
      `当前浏览${selectedName}，第${selectedIndex + 1}项，共${value.orderedItems.length}项。`,
    ]),
  });
}

export const ARENA_V2_INFORMATION_DETAIL_ADJACENT_BROWSE_RENDER_PLAN_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    sourceScreenIds: Object.freeze(['weapon-detail', 'map-detail'] as const),
    usesDirectoryOrder: true as const,
    excludesInactiveRegistryWeapons: true as const,
    inputUsesFrozenDataBoundary: true as const,
    inputAccessorsExecuted: false as const,
    renderPlanReusesValidatedProjectionWithoutReparse: true as const,
    wrapsDirectoriesWithThreeOrMoreItems: true as const,
    twoItemDirectoryUsesSingleOtherAction: true as const,
    primaryActionCountAdded: 0 as const,
    maximumSecondaryActionCountAdded: 2 as const,
    visibleDirectoryPositionTextAdded: true as const,
    directoryPositionUsesCurrentBrowsableSet: true as const,
    adjacentActionLabelsExposeTargetNames: true as const,
    selectedIdentityAnchoredInFirstReadingPoint: true as const,
    selectedIdentityUsesSameBrowseProjection: true as const,
    selectedIdentityPrimitiveCountAdded: 0 as const,
    minimumTouchTargetCssPixels: 48 as const,
    changesSelectionOnlyAfterBoundIntent: true as const,
    ownsGameplayAuthority: false as const,
    defaultEntryWired: false as const,
    defaultNavigationWired: false as const,
    validationStatus: 'not-run' as const,
  });
