import type { ArenaV2UiRectV1 } from './arena-v2-information-screen-layout-v1.js';
import type {
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from './arena-v2-ui-render-plan-v1.js';

export type ArenaV2SurvivalPreparationLinkTargetScreenCandidateV1 =
  | 'mode-select'
  | 'character-select'
  | 'weapon-index'
  | 'map-detail';

const PRIMARY_ACTION_ID = 'primary-action';
const LINK_INTENT_PREFIX = 'arena.v2.survival-preparation-link.';
const LINK_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'mode',
    label: '返回模式',
    targetScreenId: 'mode-select' as const,
    accessibilityText: '返回模式选择，不开始生存',
  }),
  Object.freeze({
    id: 'character',
    label: '角色',
    targetScreenId: 'character-select' as const,
    accessibilityText: '打开六角色选择；保存后返回生存准备',
  }),
  Object.freeze({
    id: 'weapons',
    label: '武器收藏',
    targetScreenId: 'weapon-index' as const,
    accessibilityText: '查看武器收藏；生存仍然空手开局并在场上拾取',
  }),
  Object.freeze({
    id: 'map',
    label: '地图详情',
    targetScreenId: 'map-detail' as const,
    accessibilityText: '查看当前生存地图详情',
  }),
] as const);

function rect(x: number, y: number, width: number, height: number): ArenaV2UiRectV1 {
  return Object.freeze({ x, y, width, height });
}

/**
 * Appends a compact optional navigation row to survival preparation. The
 * weapon route is collection-only and never changes the unarmed match start.
 */
export function addArenaV2InformationSurvivalPreparationLinksToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
): ArenaV2UiRenderPlanV1 {
  if (plan.schemaVersion !== 1 || plan.status !== 'layout-candidate'
    || plan.productionReady !== false || plan.surfaceKind !== 'information'
    || plan.scrollRegion === null) {
    throw new RangeError(
      'Arena V2 survival preparation links只接受未晋级信息RenderPlan V1。',
    );
  }
  if (plan.identity !== 'survival-prep') {
    throw new RangeError(`Arena V2 survival preparation links不能接入${plan.identity}。`);
  }
  const primaryActions = plan.primitives.filter(
    ({ id, kind }) => id === PRIMARY_ACTION_ID && kind === 'action',
  );
  if (primaryActions.length !== 1) {
    throw new RangeError('Arena V2 survival-prep必须继续精确包含一个主动作。');
  }
  const viewport = plan.scrollRegion.viewport;
  const gap = 8;
  const actionHeight = 48;
  const columns = viewport.width < 760 ? 2 : 4;
  const rows = Math.ceil(LINK_DEFINITIONS.length / columns);
  const actionWidth = (viewport.width - gap * (columns - 1)) / columns;
  if (actionWidth < 48) {
    throw new RangeError('Arena V2 survival preparation次级入口无法满足48px点击下限。');
  }
  const startY = viewport.y + plan.scrollRegion.contentHeight + 12;
  const primitives: ArenaV2UiRenderPrimitiveV1[] = [...plan.primitives];
  for (const [index, definition] of LINK_DEFINITIONS.entries()) {
    const actionId = `secondary:survival-preparation:${definition.id}:action`;
    if (primitives.some(({ id }) => id === actionId)) {
      throw new RangeError(`Arena V2 survival ${definition.id}次级入口不得重复接入。`);
    }
    primitives.push(Object.freeze({
      kind: 'action' as const,
      id: actionId,
      rect: rect(
        viewport.x + (index % columns) * (actionWidth + gap),
        startY + Math.floor(index / columns) * (actionHeight + gap),
        actionWidth,
        actionHeight,
      ),
      clipRect: viewport,
      intentId: `${LINK_INTENT_PREFIX}${definition.targetScreenId}`,
      label: definition.label,
      accessibilityText: definition.accessibilityText,
      enabled: true,
      disabledReason: null,
      minimumTouchTargetCssPixels: 48 as const,
      tone: 'muted' as const,
      zIndex: 3,
    }));
  }
  const contentHeight = plan.scrollRegion.contentHeight + 12
    + rows * actionHeight
    + Math.max(0, rows - 1) * gap;
  return Object.freeze({
    ...plan,
    primitives: Object.freeze(primitives),
    scrollRegion: Object.freeze({
      ...plan.scrollRegion,
      contentHeight,
      verticalScrollRequired: contentHeight > viewport.height,
    }),
  });
}

export const ARENA_V2_INFORMATION_SURVIVAL_PREPARATION_LINKS_RENDER_PLAN_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    sourceScreenId: 'survival-prep' as const,
    targetScreenIds: Object.freeze([
      'mode-select', 'character-select', 'weapon-index', 'map-detail',
    ] as const),
    primaryActionCountAdded: 0 as const,
    secondaryActionCountAdded: 4 as const,
    minimumTouchTargetCssPixels: 48 as const,
    narrowColumnCount: 2 as const,
    wideColumnCount: 4 as const,
    weaponRouteIsCollectionOnly: true as const,
    keepsSurvivalPrimaryStartDirect: true as const,
    supportsExplicitReturnToModeSelect: true as const,
    keepsSurvivalStartUnarmed: true as const,
    defaultEntryWired: false as const,
    defaultNavigationWired: false as const,
    validationStatus: 'not-run' as const,
  });
