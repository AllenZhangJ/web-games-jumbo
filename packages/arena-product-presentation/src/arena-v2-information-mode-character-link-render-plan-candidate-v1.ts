import type {
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from './arena-v2-ui-render-plan-v1.js';

const CHARACTER_PANEL_ID = 'first:character-entry:panel';
const CHARACTER_LABEL_ID = 'first:character-entry:label';
const CHARACTER_ACTION_ID = 'secondary:mode-character:action';
const PRIMARY_ACTION_ID = 'primary-action';
const MODE_CHARACTER_LINK_INTENT = 'arena.v2.mode-character-link.character-select';

function characterLabel(value: ArenaV2UiRenderPrimitiveV1): ArenaV2UiRenderPrimitiveV1 {
  if (value.kind !== 'text') {
    throw new TypeError('Arena V2 character-entry label必须是文本。');
  }
  return Object.freeze({
    ...value,
    text: '角色 · 更换 ›',
    accessibilityText: '当前角色，可更换角色',
  });
}

/**
 * Makes the existing character summary card optional navigation. Character
 * selection remains outside the mandatory quick-start path.
 */
export function addArenaV2InformationModeCharacterLinkToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
): ArenaV2UiRenderPlanV1 {
  if (plan.schemaVersion !== 1 || plan.status !== 'layout-candidate'
    || plan.productionReady !== false || plan.surfaceKind !== 'information'
    || plan.scrollRegion === null) {
    throw new RangeError('Arena V2 mode character link只接受未晋级信息RenderPlan V1。');
  }
  if (plan.identity !== 'mode-select:selection-mode') {
    throw new RangeError(`Arena V2 mode character link不能接入${plan.identity}。`);
  }
  const characterPanels = plan.primitives.filter(({ id }) => id === CHARACTER_PANEL_ID);
  const characterLabels = plan.primitives.filter(({ id }) => id === CHARACTER_LABEL_ID);
  const primaryActions = plan.primitives.filter(
    ({ id, kind }) => id === PRIMARY_ACTION_ID && kind === 'action',
  );
  if (characterPanels.length !== 1 || characterPanels[0]!.kind !== 'panel') {
    throw new RangeError('Arena V2 mode-select必须精确包含一个character-entry panel。');
  }
  if (characterLabels.length !== 1) {
    throw new RangeError('Arena V2 mode-select必须精确包含一个character-entry label。');
  }
  if (primaryActions.length !== 1) {
    throw new RangeError('Arena V2 mode-select必须继续精确包含一个主动作。');
  }
  if (plan.primitives.some(({ id }) => id === CHARACTER_ACTION_ID)) {
    throw new RangeError('Arena V2 mode character link不得重复接入。');
  }
  const panel = characterPanels[0]!;
  if (panel.rect.width < 48 || panel.rect.height < 48) {
    throw new RangeError('Arena V2 character-entry不满足48px次级点击下限。');
  }
  const primitives = plan.primitives.map((primitive) => (
    primitive.id === CHARACTER_LABEL_ID ? characterLabel(primitive) : primitive
  ));
  primitives.push(Object.freeze({
    kind: 'action' as const,
    id: CHARACTER_ACTION_ID,
    rect: panel.rect,
    clipRect: panel.clipRect,
    intentId: MODE_CHARACTER_LINK_INTENT,
    label: '更换角色',
    accessibilityText: '打开六角色选择；保存后返回当前模式',
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

export const ARENA_V2_INFORMATION_MODE_CHARACTER_LINK_RENDER_PLAN_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    sourceScreenId: 'mode-select' as const,
    sourceFieldId: 'character-entry' as const,
    targetScreenId: 'character-select' as const,
    primaryActionCountAdded: 0 as const,
    secondaryActionCountAdded: 1 as const,
    minimumTouchTargetCssPixels: 48 as const,
    keepsCharacterSelectionOptional: true as const,
    returnsToCurrentModeAfterSave: true as const,
    defaultEntryWired: false as const,
    defaultNavigationWired: false as const,
    validationStatus: 'not-run' as const,
  });
