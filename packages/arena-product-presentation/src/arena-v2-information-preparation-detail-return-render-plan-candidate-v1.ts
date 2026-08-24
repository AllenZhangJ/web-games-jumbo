import type {
  ArenaV2UiRenderPlanV1,
  ArenaV2UiRenderPrimitiveV1,
} from './arena-v2-ui-render-plan-v1.js';

export type ArenaV2PreparationDetailReturnScreenCandidateV1 =
  | 'match-prep'
  | 'survival-prep';

const PRIMARY_ACTION_ID = 'primary-action';

function returnScreenId(value: unknown): ArenaV2PreparationDetailReturnScreenCandidateV1 {
  if (value !== 'match-prep' && value !== 'survival-prep') {
    throw new RangeError('Arena V2 preparation detail returnScreenId无效。');
  }
  return value;
}

function returnedPrimaryAction(
  primitive: ArenaV2UiRenderPrimitiveV1,
  target: ArenaV2PreparationDetailReturnScreenCandidateV1,
): ArenaV2UiRenderPrimitiveV1 {
  if (primitive.kind !== 'action') {
    throw new TypeError('Arena V2 detail primary action必须是动作。');
  }
  const label = target === 'match-prep' ? '返回竞技准备' : '返回生存准备';
  return Object.freeze({
    ...primitive,
    label,
    accessibilityText: `${label}，保留当前选择`,
  });
}

/**
 * Re-labels the existing detail primary action when navigation has retained a
 * single preparation source. Navigation remains the only owner of the return.
 */
export function addArenaV2InformationPreparationDetailReturnToRenderPlanCandidateV1(
  plan: ArenaV2UiRenderPlanV1,
  returnScreenIdValue: unknown,
): ArenaV2UiRenderPlanV1 {
  if (plan.schemaVersion !== 1 || plan.status !== 'layout-candidate'
    || plan.productionReady !== false || plan.surfaceKind !== 'information') {
    throw new RangeError(
      'Arena V2 preparation detail return只接受未晋级信息RenderPlan V1。',
    );
  }
  const target = returnScreenId(returnScreenIdValue);
  if (plan.identity !== 'weapon-detail' && plan.identity !== 'map-detail') {
    throw new RangeError(`Arena V2 preparation detail return不能接入${plan.identity}。`);
  }
  if (plan.identity === 'weapon-detail' && target !== 'match-prep') {
    throw new RangeError('Arena V2生存准备不能通过详情主动作携带预选武器。');
  }
  const primaryActions = plan.primitives.filter(({ id }) => id === PRIMARY_ACTION_ID);
  if (primaryActions.length !== 1) {
    throw new RangeError('Arena V2详情页必须精确包含一个主动作。');
  }
  const expectedIntentId = plan.identity === 'weapon-detail'
    ? 'use-selected-weapon-next-match'
    : 'use-selected-map-next-match';
  if (primaryActions[0]!.kind !== 'action'
    || primaryActions[0]!.intentId !== expectedIntentId) {
    throw new RangeError('Arena V2详情页主动作intent与页面身份不一致。');
  }
  const primitives = plan.primitives.map((primitive) => (
    primitive.id === PRIMARY_ACTION_ID
      ? returnedPrimaryAction(primitive, target)
      : primitive
  ));
  return Object.freeze({
    ...plan,
    primitives: Object.freeze(primitives),
  });
}

export const ARENA_V2_INFORMATION_PREPARATION_DETAIL_RETURN_RENDER_PLAN_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    sourceScreenIds: Object.freeze(['weapon-detail', 'map-detail'] as const),
    targetScreenIds: Object.freeze(['match-prep', 'survival-prep'] as const),
    retainedDepth: 1 as const,
    addsNavigationStack: false as const,
    changesPrimaryIntent: false as const,
    changesSelectionOrAuthority: false as const,
    survivalWeaponDetailReturnForbidden: true as const,
    defaultEntryWired: false as const,
    defaultNavigationWired: false as const,
    validationStatus: 'not-run' as const,
  });
