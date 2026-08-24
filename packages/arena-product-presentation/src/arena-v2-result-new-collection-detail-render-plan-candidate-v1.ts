import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from './arena-v2-ui-render-plan-v1.js';

export type ArenaV2ResultNewCollectionDetailKindCandidateV1 = 'weapon' | 'map';

export interface ArenaV2ResultNewCollectionDetailItemCandidateV1 {
  readonly kind: ArenaV2ResultNewCollectionDetailKindCandidateV1;
  readonly definitionId: string;
  readonly displayName: string;
}

const ITEM_KEYS = new Set(['kind', 'definitionId', 'displayName']);
const PRIMARY_ACTION_ID = 'primary-action';
const ACTION_PREFIX = 'secondary:result-new-collection:';
const INTENT_PREFIX = 'arena.v2.result-new-collection.';

function items(
  value: unknown,
): readonly ArenaV2ResultNewCollectionDetailItemCandidateV1[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Arena V2结果页本局新收藏详情投影必须是数组。');
  }
  const candidates = cloneFrozenData(
    value,
    'Arena V2结果页本局新收藏详情投影',
  ) as readonly unknown[];
  const identities = new Set<string>();
  return Object.freeze(candidates.map((itemValue, index) => {
    const item = assertPlainRecord(
      itemValue,
      `Arena V2结果页本局新收藏详情投影[${index}]`,
    );
    assertKnownKeys(
      item,
      ITEM_KEYS,
      `Arena V2结果页本局新收藏详情投影[${index}]`,
    );
    for (const key of ITEM_KEYS) {
      if (!Object.hasOwn(item, key)) {
        throw new TypeError(`Arena V2结果页本局新收藏详情投影[${index}]缺少${key}。`);
      }
    }
    if (item.kind !== 'weapon' && item.kind !== 'map') {
      throw new RangeError('Arena V2结果页本局新收藏详情类型无效。');
    }
    const kind = item.kind;
    const definitionId = assertNonEmptyString(
      item.definitionId,
      `Arena V2结果页本局新收藏详情投影[${index}].definitionId`,
    );
    const identity = `${kind}\u0000${definitionId}`;
    if (identities.has(identity)) {
      throw new RangeError(`Arena V2结果页本局新收藏详情${identity}重复。`);
    }
    identities.add(identity);
    return Object.freeze({
      kind,
      definitionId,
      displayName: assertNonEmptyString(
        item.displayName,
        `Arena V2结果页本局新收藏详情投影[${index}].displayName`,
      ),
    });
  }));
}

/** Adds optional links to exact items collected by the committed result. */
export function addArenaV2ResultNewCollectionDetailToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
  projectionValue: unknown,
): ArenaV2UiRenderPlanV1 {
  if (plan.schemaVersion !== 1 || plan.status !== 'layout-candidate'
    || plan.productionReady !== false || plan.surfaceKind !== 'information'
    || plan.identity !== 'result-reward' || plan.scrollRegion === null) {
    throw new RangeError('Arena V2结果页本局新收藏详情只接受未晋级结果RenderPlan V1。');
  }
  const value = items(projectionValue);
  if (plan.primitives.filter(
    ({ id, kind }) => id === PRIMARY_ACTION_ID && kind === 'action',
  ).length !== 1) {
    throw new RangeError('Arena V2结果页本局新收藏详情必须保留精确一个主动作。');
  }
  if (plan.primitives.some(({ id }) => id.startsWith(ACTION_PREFIX))) {
    throw new RangeError('Arena V2结果页本局新收藏详情不得重复接入。');
  }
  if (value.length === 0) return plan;
  const viewport = plan.scrollRegion.viewport;
  const gap = 8;
  const actionHeight = 48;
  const startY = viewport.y + plan.scrollRegion.contentHeight + 12;
  const actions: ArenaV2UiRenderPrimitiveV1[] = value.map((item, index) => {
    const kindLabel = item.kind === 'weapon' ? '新武器' : '新地图';
    return Object.freeze({
      kind: 'action' as const,
      id: `${ACTION_PREFIX}${item.kind}:${encodeURIComponent(item.definitionId)}:action`,
      rect: Object.freeze({
        x: viewport.x,
        y: startY + index * (actionHeight + gap),
        width: viewport.width,
        height: actionHeight,
      }),
      clipRect: viewport,
      intentId: `${INTENT_PREFIX}${item.kind}.${encodeURIComponent(item.definitionId)}`,
      label: `查看并选择${kindLabel}：${item.displayName}`,
      accessibilityText:
        `查看本局刚加入收藏的${kindLabel}${item.displayName}，并将它选为下一局准备内容`,
      enabled: true,
      disabledReason: null,
      minimumTouchTargetCssPixels: 48 as const,
      tone: 'muted' as const,
      zIndex: 3,
    });
  });
  const contentHeight = plan.scrollRegion.contentHeight + 12
    + value.length * actionHeight + (value.length - 1) * gap;
  return Object.freeze({
    ...plan,
    primitives: Object.freeze([...plan.primitives, ...actions]),
    scrollRegion: Object.freeze({
      ...plan.scrollRegion,
      contentHeight,
      verticalScrollRequired: contentHeight > viewport.height,
    }),
  });
}

export const ARENA_V2_RESULT_NEW_COLLECTION_DETAIL_RENDER_PLAN_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    sourceScreenIds: Object.freeze(['result-reward'] as const),
    targetScreenIds: Object.freeze(['weapon-detail', 'map-detail'] as const),
    sourceFacts: Object.freeze([
      'learning-settlement.newlyCollectedWeaponDefinitionIds',
      'learning-settlement.newlyCollectedMapDefinitionIds',
    ] as const),
    primaryActionCountAdded: 0 as const,
    preservesLongTermGoalPrimaryAction: true as const,
    reusesExistingDetailScreens: true as const,
    selectionChangeRequiresExplicitAction: true as const,
    startsMatch: false as const,
    inputUsesFrozenDataBoundary: true as const,
    inputAccessorsExecuted: false as const,
    minimumTouchTargetCssPixels: 48 as const,
    ownsGameplayAuthority: false as const,
    defaultEntryWired: false as const,
    defaultNavigationWired: false as const,
    validationStatus: 'not-run' as const,
  });
