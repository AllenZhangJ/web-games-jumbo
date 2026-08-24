import type {
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from './arena-v2-ui-render-plan-v1.js';

export type ArenaV2CompetitivePreparationLinkTargetScreenCandidateV1 =
  | 'mode-select'
  | 'character-select'
  | 'weapon-detail'
  | 'map-detail';

const PRIMARY_ACTION_ID = 'primary-action';
const LINK_INTENT_PREFIX = 'arena.v2.competitive-preparation-link.';
const RETURN_ACTION_ID = 'secondary:competitive-preparation:return-mode:action';
const LINK_DEFINITIONS = Object.freeze([
  Object.freeze({
    fieldId: 'character-entry',
    label: '角色 · 更换 ›',
    targetScreenId: 'character-select' as const,
    actionLabel: '更换角色',
    accessibilityText: '打开六角色选择；保存后返回竞技准备',
  }),
  Object.freeze({
    fieldId: 'weapon-entry',
    label: '武器 · 查看 ›',
    targetScreenId: 'weapon-detail' as const,
    actionLabel: '查看武器',
    accessibilityText: '查看当前武器详情',
  }),
  Object.freeze({
    fieldId: 'map-entry',
    label: '地图 · 查看 ›',
    targetScreenId: 'map-detail' as const,
    actionLabel: '查看地图',
    accessibilityText: '查看当前地图详情',
  }),
] as const);

function linkedLabel(
  value: ArenaV2UiRenderPrimitiveV1,
  text: string,
): ArenaV2UiRenderPrimitiveV1 {
  if (value.kind !== 'text') {
    throw new TypeError('Arena V2 competitive preparation link label必须是文本。');
  }
  return Object.freeze({
    ...value,
    text,
    accessibilityText: text.replace(/\s*›$/u, ''),
  });
}

/**
 * Adds optional detail routes to the existing competitive preparation cards.
 * It does not change the prepared match authority or the primary start action.
 */
export function addArenaV2InformationCompetitivePreparationLinksToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
): ArenaV2UiRenderPlanV1 {
  if (plan.schemaVersion !== 1 || plan.status !== 'layout-candidate'
    || plan.productionReady !== false || plan.surfaceKind !== 'information'
    || plan.scrollRegion === null) {
    throw new RangeError(
      'Arena V2 competitive preparation links只接受未晋级信息RenderPlan V1。',
    );
  }
  if (plan.identity !== 'match-prep') {
    throw new RangeError(`Arena V2 competitive preparation links不能接入${plan.identity}。`);
  }
  const primaryActions = plan.primitives.filter(
    ({ id, kind }) => id === PRIMARY_ACTION_ID && kind === 'action',
  );
  if (primaryActions.length !== 1) {
    throw new RangeError('Arena V2 match-prep必须继续精确包含一个主动作。');
  }
  const primitives: ArenaV2UiRenderPrimitiveV1[] = [...plan.primitives];
  for (const definition of LINK_DEFINITIONS) {
    const panelId = `deferred:${definition.fieldId}:panel`;
    const labelId = `deferred:${definition.fieldId}:label`;
    const actionId = `secondary:competitive-preparation:${definition.fieldId}:action`;
    const panels = primitives.filter(({ id }) => id === panelId);
    const labels = primitives.filter(({ id }) => id === labelId);
    if (panels.length !== 1 || panels[0]!.kind !== 'panel') {
      throw new RangeError(`Arena V2 match-prep必须精确包含一个${panelId}。`);
    }
    if (labels.length !== 1) {
      throw new RangeError(`Arena V2 match-prep必须精确包含一个${labelId}。`);
    }
    if (primitives.some(({ id }) => id === actionId)) {
      throw new RangeError(`Arena V2 ${definition.fieldId}次级入口不得重复接入。`);
    }
    const panel = panels[0]!;
    if (panel.rect.width < 48 || panel.rect.height < 48) {
      throw new RangeError(`Arena V2 ${definition.fieldId}不满足48px次级点击下限。`);
    }
    const labelIndex = primitives.findIndex(({ id }) => id === labelId);
    primitives[labelIndex] = linkedLabel(primitives[labelIndex]!, definition.label);
    primitives.push(Object.freeze({
      kind: 'action' as const,
      id: actionId,
      rect: panel.rect,
      clipRect: panel.clipRect,
      intentId: `${LINK_INTENT_PREFIX}${definition.targetScreenId}`,
      label: definition.actionLabel,
      accessibilityText: definition.accessibilityText,
      enabled: true,
      disabledReason: null,
      minimumTouchTargetCssPixels: 48 as const,
      tone: 'transparent' as const,
      zIndex: 3,
    }));
  }
  if (primitives.some(({ id }) => id === RETURN_ACTION_ID)) {
    throw new RangeError('Arena V2竞技准备返回模式入口不得重复接入。');
  }
  const viewport = plan.scrollRegion.viewport;
  const returnActionHeight = 48;
  const returnActionY = viewport.y + plan.scrollRegion.contentHeight + 12;
  primitives.push(Object.freeze({
    kind: 'action' as const,
    id: RETURN_ACTION_ID,
    rect: Object.freeze({
      x: viewport.x,
      y: returnActionY,
      width: viewport.width,
      height: returnActionHeight,
    }),
    clipRect: viewport,
    intentId: `${LINK_INTENT_PREFIX}mode-select`,
    label: '返回模式',
    accessibilityText: '返回模式选择，不开始比赛',
    enabled: true,
    disabledReason: null,
    minimumTouchTargetCssPixels: 48 as const,
    tone: 'muted' as const,
    zIndex: 3,
  }));
  const contentHeight = plan.scrollRegion.contentHeight + 12 + returnActionHeight;
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

export const ARENA_V2_INFORMATION_COMPETITIVE_PREPARATION_LINKS_RENDER_PLAN_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    sourceScreenId: 'match-prep' as const,
    sourceFieldIds: Object.freeze([
      'character-entry', 'weapon-entry', 'map-entry',
    ] as const),
    targetScreenIds: Object.freeze([
      'mode-select', 'character-select', 'weapon-detail', 'map-detail',
    ] as const),
    primaryActionCountAdded: 0 as const,
    secondaryActionCountAdded: 4 as const,
    minimumTouchTargetCssPixels: 48 as const,
    keepsPreparedMatchPrimaryStartDirect: true as const,
    supportsExplicitReturnToModeSelect: true as const,
    survivalUnarmedPreparationUnchanged: true as const,
    defaultEntryWired: false as const,
    defaultNavigationWired: false as const,
    validationStatus: 'not-run' as const,
  });
