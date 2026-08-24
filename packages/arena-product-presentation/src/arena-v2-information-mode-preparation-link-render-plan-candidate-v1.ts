import type {
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from './arena-v2-ui-render-plan-v1.js';

export type ArenaV2ModePreparationLinkModeKindCandidateV1 =
  | 'duel'
  | 'race'
  | 'survival';

export type ArenaV2ModePreparationLinkTargetScreenCandidateV1 =
  | 'match-prep'
  | 'survival-prep';

const PREPARATION_PANEL_ID = 'deferred:preparation-entry:panel';
const PREPARATION_LABEL_ID = 'deferred:preparation-entry:label';
const PREPARATION_ACTION_ID = 'secondary:mode-preparation:action';
const PRIMARY_ACTION_ID = 'primary-action';
const MODE_SELECTION_RENDER_PLAN_IDENTITY = 'mode-select:selection-mode';
const MODE_PREPARATION_LINK_INTENT_PREFIX = 'arena.v2.mode-preparation-link.';

function modeKind(value: unknown): ArenaV2ModePreparationLinkModeKindCandidateV1 {
  if (value !== 'duel' && value !== 'race' && value !== 'survival') {
    throw new RangeError('Arena V2 mode preparation link modeKind无效。');
  }
  return value;
}

function targetScreenId(
  value: ArenaV2ModePreparationLinkModeKindCandidateV1,
): ArenaV2ModePreparationLinkTargetScreenCandidateV1 {
  return value === 'survival' ? 'survival-prep' : 'match-prep';
}

function preparationLabel(value: ArenaV2UiRenderPrimitiveV1): ArenaV2UiRenderPrimitiveV1 {
  if (value.kind !== 'text') {
    throw new TypeError('Arena V2 preparation-entry label必须是文本。');
  }
  return Object.freeze({
    ...value,
    text: '对局准备 · 查看规则 ›',
    accessibilityText: '对局准备，可查看完整规则',
  });
}

/**
 * Makes the existing preparation card a secondary route without adding a
 * mandatory step or changing the single primary start action.
 */
export function addArenaV2InformationModePreparationLinkToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
  selectedModeKindValue: unknown,
): ArenaV2UiRenderPlanV1 {
  if (plan.schemaVersion !== 1 || plan.status !== 'layout-candidate'
    || plan.productionReady !== false || plan.surfaceKind !== 'information'
    || plan.scrollRegion === null) {
    throw new RangeError('Arena V2 mode preparation link只接受未晋级信息RenderPlan V1。');
  }
  if (plan.identity !== MODE_SELECTION_RENDER_PLAN_IDENTITY) {
    throw new RangeError(`Arena V2 mode preparation link不能接入${plan.identity}。`);
  }
  const selectedModeKind = modeKind(selectedModeKindValue);
  const target = targetScreenId(selectedModeKind);
  const preparationPanel = plan.primitives.filter(
    ({ id }) => id === PREPARATION_PANEL_ID,
  );
  const preparationLabels = plan.primitives.filter(
    ({ id }) => id === PREPARATION_LABEL_ID,
  );
  const primaryActions = plan.primitives.filter(
    ({ id, kind }) => id === PRIMARY_ACTION_ID && kind === 'action',
  );
  if (preparationPanel.length !== 1 || preparationPanel[0]!.kind !== 'panel') {
    throw new RangeError('Arena V2 mode-select必须精确包含一个preparation-entry panel。');
  }
  if (preparationLabels.length !== 1) {
    throw new RangeError('Arena V2 mode-select必须精确包含一个preparation-entry label。');
  }
  if (primaryActions.length !== 1) {
    throw new RangeError('Arena V2 mode-select必须继续精确包含一个主动作。');
  }
  if (plan.primitives.some(({ id }) => id === PREPARATION_ACTION_ID)) {
    throw new RangeError('Arena V2 mode preparation link不得重复接入。');
  }
  const panel = preparationPanel[0]!;
  if (panel.rect.width < 48 || panel.rect.height < 48) {
    throw new RangeError('Arena V2 preparation-entry不满足48px次级点击下限。');
  }
  const primitives = plan.primitives.map((primitive) => (
    primitive.id === PREPARATION_LABEL_ID
      ? preparationLabel(primitive)
      : primitive
  ));
  primitives.push(Object.freeze({
    kind: 'action' as const,
    id: PREPARATION_ACTION_ID,
    rect: panel.rect,
    clipRect: panel.clipRect,
    intentId: `${MODE_PREPARATION_LINK_INTENT_PREFIX}${target}`,
    label: '查看规则',
    accessibilityText: selectedModeKind === 'survival'
      ? '查看生存规则详情；主按钮仍可直接开始生存'
      : `查看${selectedModeKind === 'duel' ? '常规1v1' : '竞速'}规则详情；主按钮仍可直接开始`,
    enabled: true,
    disabledReason: null,
    minimumTouchTargetCssPixels: 48 as const,
    tone: 'transparent' as const,
    zIndex: 3,
  }));
  return Object.freeze({
    ...plan,
    primitives: Object.freeze(primitives),
  });
}

export const ARENA_V2_INFORMATION_MODE_PREPARATION_LINK_RENDER_PLAN_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    sourceScreenId: 'mode-select' as const,
    sourceFieldId: 'preparation-entry' as const,
    targetByMode: Object.freeze({
      duel: 'match-prep' as const,
      race: 'match-prep' as const,
      survival: 'survival-prep' as const,
    }),
    primaryActionCountAdded: 0 as const,
    secondaryActionCountAdded: 1 as const,
    minimumTouchTargetCssPixels: 48 as const,
    keepsModeSelectPrimaryStartDirect: true as const,
    reusesExistingPreparationPages: true as const,
    defaultEntryWired: false as const,
    defaultNavigationWired: false as const,
    validationStatus: 'not-run' as const,
  });
