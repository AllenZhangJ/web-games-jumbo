import type {
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from './arena-v2-ui-render-plan-v1.js';

export type ArenaV2InformationDetailDirectoryTargetCandidateV1 =
  | 'weapon-index'
  | 'map-index';

const PRIMARY_ACTION_ID = 'primary-action';
const DIRECTORY_ACTION_ID = 'secondary:detail:return-directory:action';
const DIRECTORY_LINK_INTENT_PREFIX = 'arena.v2.detail-directory-link.';

function directoryTarget(planIdentity: string): Readonly<{
  readonly targetScreenId: ArenaV2InformationDetailDirectoryTargetCandidateV1;
  readonly label: string;
}> {
  if (planIdentity.startsWith('weapon-detail')) {
    return Object.freeze({ targetScreenId: 'weapon-index', label: '返回武器库' });
  }
  if (planIdentity.startsWith('map-detail')) {
    return Object.freeze({ targetScreenId: 'map-index', label: '返回地图库' });
  }
  throw new RangeError(`Arena V2 detail directory link不能接入${planIdentity}。`);
}

/** Adds one optional directory return below existing detail content. */
export function addArenaV2InformationDetailDirectoryLinkToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
): ArenaV2UiRenderPlanV1 {
  if (plan.schemaVersion !== 1 || plan.status !== 'layout-candidate'
    || plan.productionReady !== false || plan.surfaceKind !== 'information'
    || plan.scrollRegion === null) {
    throw new RangeError(
      'Arena V2 detail directory link只接受未晋级信息RenderPlan V1。',
    );
  }
  const target = directoryTarget(plan.identity);
  const primaryActions = plan.primitives.filter(
    ({ id, kind }) => id === PRIMARY_ACTION_ID && kind === 'action',
  );
  if (primaryActions.length !== 1) {
    throw new RangeError('Arena V2详情页必须继续精确包含一个主动作。');
  }
  if (plan.primitives.some(({ id }) => id === DIRECTORY_ACTION_ID)) {
    throw new RangeError('Arena V2详情目录入口不得重复接入。');
  }
  const viewport = plan.scrollRegion.viewport;
  const actionHeight = 48;
  const actionY = viewport.y + plan.scrollRegion.contentHeight + 12;
  const contentHeight = plan.scrollRegion.contentHeight + 12 + actionHeight;
  const action: ArenaV2UiRenderPrimitiveV1 = Object.freeze({
    kind: 'action' as const,
    id: DIRECTORY_ACTION_ID,
    rect: Object.freeze({
      x: viewport.x,
      y: actionY,
      width: viewport.width,
      height: actionHeight,
    }),
    clipRect: viewport,
    intentId: `${DIRECTORY_LINK_INTENT_PREFIX}${target.targetScreenId}`,
    label: target.label,
    accessibilityText: `${target.label}，不改变当前选择`,
    enabled: true,
    disabledReason: null,
    minimumTouchTargetCssPixels: 48 as const,
    tone: 'muted' as const,
    zIndex: 3,
  });
  return Object.freeze({
    ...plan,
    primitives: Object.freeze([...plan.primitives, action]),
    scrollRegion: Object.freeze({
      ...plan.scrollRegion,
      contentHeight,
      verticalScrollRequired: contentHeight > viewport.height,
    }),
  });
}

export const ARENA_V2_INFORMATION_DETAIL_DIRECTORY_LINK_RENDER_PLAN_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    sourceScreenIds: Object.freeze(['weapon-detail', 'map-detail'] as const),
    targetScreenIds: Object.freeze(['weapon-index', 'map-index'] as const),
    primaryActionCountAdded: 0 as const,
    secondaryActionCountAdded: 1 as const,
    minimumTouchTargetCssPixels: 48 as const,
    preservesCurrentSelection: true as const,
    clearsRetainedPreparationSourceThroughNavigation: true as const,
    defaultEntryWired: false as const,
    defaultNavigationWired: false as const,
    validationStatus: 'not-run' as const,
  });
