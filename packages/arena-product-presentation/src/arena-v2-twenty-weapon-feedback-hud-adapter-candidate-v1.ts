import {
  ARENA_MATCH_EVENT_V6,
  assertKnownKeys,
  cloneFrozenData,
  createArenaMatchEventV6,
} from '@number-strategy-jump/arena-contracts';
import {
  projectArenaWeaponFeedbackEventV6PresentationEvent,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1,
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  projectArenaV2ModeHudWeaponFeedbackCopyV1,
  projectArenaV2ModeHudWeaponFeedbackEmphasisV1,
  type ArenaV2ModeHudRenderModelV1,
} from './arena-v2-mode-hud-render-model-v1.js';
import {
  arenaV2WeaponDisplayNameV1,
} from './arena-v2-weapon-map-learning-projection-candidate-v1.js';
import {
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
} from './arena-v2-information-presentation-content-v1.js';
import {
  projectArenaV2TwentyWeaponFeedbackReadPlanCandidateV1,
  type ArenaV2TwentyWeaponFeedbackReadPlanProjectionCandidateV1,
} from './arena-v2-twenty-weapon-feedback-read-plan-candidate-v1.js';

export interface ArenaV2TwentyWeaponFeedbackHudAdapterProjectionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly renderModel: ArenaV2ModeHudRenderModelV1;
  readonly weaponReadPlans: readonly ArenaV2TwentyWeaponFeedbackReadPlanProjectionCandidateV1[];
  readonly passthroughUnarmedSourceEventIds: readonly string[];
  readonly governance: Readonly<{
    readonly inputSource: 'validated-hud-render-model-and-v6-events';
    readonly outputTarget: 'existing-feedback-queue-and-effect-consumer';
    readonly mutatesInput: false;
    readonly ownsRuleOrMatchAuthority: false;
    readonly infersOutcome: false;
    readonly addsSameCatalogResultOrRiskLearningLoop: true;
    readonly counterHintUsesSameCatalogInputs: true;
    readonly learningHintPrecedesGenericOutcomeCopy: true;
    readonly learningHintUsesLocalPerspective: true;
    readonly duplicatesWeaponLearningCopy: false;
  }>;
}

const INPUT_KEYS = new Set(['schemaVersion', 'renderModel', 'events']);
const RENDER_MODEL_KEYS = new Set([
  'schemaVersion', 'tick', 'modeDefinitionId', 'modeKind', 'modePresentation', 'phase',
  'preferences', 'participantIdentities', 'primaryTimer', 'preparationTimer', 'localFacts',
  'modeFacts', 'supplyItems', 'feedbackItems', 'supplyResyncReady', 'result',
]);
const UNARMED_ACTION_IDS = new Set(
  ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1.map(({ id }) => id),
);
const PUBLIC_IDENTITY_KEYS = new Set([
  'participantId', 'displayName', 'portraitKey', 'appearanceKey', 'identityOrdinal',
  'identityGlyphKey', 'identityPatternKey', 'modeRole', 'teamId', 'local',
]);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return value;
}

function feedbackCopyContext(
  renderSource: Record<string, unknown>,
  modeKind: 'duel' | 'race' | 'survival',
) {
  if (!Array.isArray(renderSource.participantIdentities)) {
    throw new TypeError('Arena V2 twenty weapon HUD adapter缺少公开身份数组。');
  }
  const participantIdentities = Object.freeze(renderSource.participantIdentities.map(
    (value, index) => {
      const identity = exactRecord(
        value,
        PUBLIC_IDENTITY_KEYS,
        `Arena V2 twenty weapon HUD adapter participantIdentities[${index}]`,
      );
      if (typeof identity.participantId !== 'string' || identity.participantId.length === 0
        || typeof identity.displayName !== 'string' || identity.displayName.length === 0
        || !Number.isSafeInteger(identity.identityOrdinal)
        || (identity.identityOrdinal as number) < 1
        || typeof identity.local !== 'boolean') {
        throw new TypeError('Arena V2 twenty weapon HUD adapter公开身份无效。');
      }
      return Object.freeze({ ...identity }) as unknown as ArenaV2ModeHudRenderModelV1[
        'participantIdentities'
      ][number];
    },
  ));
  const locals = participantIdentities.filter(({ local }) => local);
  if (locals.length !== 1) {
    throw new RangeError('Arena V2 twenty weapon HUD adapter必须有且只有一个本地公开身份。');
  }
  return Object.freeze({
    localParticipantId: locals[0]!.participantId,
    participantIdentities,
    modeKind,
  });
}

function weaponLearningTitle(
  plan: ArenaV2TwentyWeaponFeedbackReadPlanProjectionCandidateV1,
  title: string,
): string {
  if (plan.equipmentDefinitionId === null || plan.actionContext === null) return title;
  const context = plan.actionContext === 'ground' ? '地面' : '空中';
  return `${arenaV2WeaponDisplayNameV1(plan.equipmentDefinitionId)}·${context}：${title}`;
}

function weaponLearningExplanation(
  plan: ArenaV2TwentyWeaponFeedbackReadPlanProjectionCandidateV1,
  explanation: string,
  localParticipantId: string,
): string {
  if (plan.equipmentDefinitionId === null || plan.actionContext === null) return explanation;
  const weapon = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.find(
    ({ weaponDefinitionId }) => weaponDefinitionId === plan.equipmentDefinitionId,
  );
  const action = weapon?.actions.find(({ context }) => context === plan.actionContext);
  if (action === undefined) {
    throw new RangeError(`Arena V2 twenty weapon HUD adapter缺少${plan.sourceEventId}学习文案。`);
  }
  if (plan.learningRead.intendedResult === null
    || plan.learningRead.failureRisk === null
    || action.actionDefinitionId !== plan.collectionActionDefinitionId
    || action.failureRisk !== plan.learningRead.failureRisk
    || action.counterInputs.length !== plan.learningRead.counterInputs.length
    || action.counterInputs.some((counterInput, index) => (
      counterInput !== plan.learningRead.counterInputs[index]
    ))) {
    throw new RangeError(`Arena V2 twenty weapon HUD adapter检测到${plan.sourceEventId}学习身份漂移。`);
  }
  const localAttacker = plan.authorityPresentation.attackerId === localParticipantId
    && plan.authorityPresentation.targetId !== localParticipantId;
  const localTarget = plan.authorityPresentation.targetId === localParticipantId
    && plan.authorityPresentation.attackerId !== localParticipantId;
  const risk = ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
    `arena.v2.risk.${plan.learningRead.failureRisk}`,
  );
  if (plan.feedbackKind === 'attack-evaded') {
    if (!localAttacker) return explanation;
    const retry = ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      `arena.v2.retry.${plan.learningRead.failureRisk}`,
    );
    return `下次注意：${risk}；${retry}。${explanation}`;
  }
  if (plan.feedbackKind === 'hit-confirm'
    || plan.feedbackKind === 'hit-surface-transfer'
    || plan.feedbackKind === 'hit-ring-out') {
    if (localTarget) {
      if (action.counterInputs.length < 1
        || action.counterInputs.length > 2
        || new Set(action.counterInputs).size !== action.counterInputs.length) {
        throw new RangeError(`Arena V2 twenty weapon HUD adapter检测到${plan.sourceEventId}反制输入漂移。`);
      }
      const counterInputCopy = action.counterInputs.map((counterInput) => (
        ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
          `arena.v2.counter.${counterInput}`,
        )
      )).join('或');
      return `下次可${counterInputCopy}；对方弱点：${risk}。${explanation}`;
    }
    if (!localAttacker) return explanation;
    const intendedResult = ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      action.resultMessageId,
    );
    return `本招用途：${intendedResult}${explanation}`;
  }
  return explanation;
}

/**
 * Enriches an already projected weapon item with catalog/action-context copy
 * and specialized cue identities. The existing queue and effect consumer keep
 * their lifetime, epoch, audio budget and cleanup ownership; this adapter
 * contributes no new side effect.
 */
export function specializeArenaV2TwentyWeaponFeedbackHudCandidateV1(
  value: unknown,
): ArenaV2TwentyWeaponFeedbackHudAdapterProjectionCandidateV1 {
  const source = exactRecord(
    cloneFrozenData(value, 'Arena V2 twenty weapon HUD adapter input'),
    INPUT_KEYS,
    'Arena V2 twenty weapon HUD adapter input',
  );
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena V2 twenty weapon HUD adapter只接受schemaVersion 1。');
  }
  const renderSource = exactRecord(
    source.renderModel,
    RENDER_MODEL_KEYS,
    'Arena V2 twenty weapon HUD adapter renderModel',
  );
  if (renderSource.schemaVersion !== 1
    || !Array.isArray(renderSource.feedbackItems)
    || (renderSource.modeKind !== 'duel'
      && renderSource.modeKind !== 'race'
      && renderSource.modeKind !== 'survival')) {
    throw new RangeError('Arena V2 twenty weapon HUD adapter renderModel合同无效。');
  }
  if (!Array.isArray(source.events)) {
    throw new TypeError('Arena V2 twenty weapon HUD adapter events必须是数组。');
  }
  const modeKind = renderSource.modeKind;
  const events = source.events.map((event) => createArenaMatchEventV6(event));
  const weaponEvents = events.filter((event) => (
    event.type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED
  ));
  if (new Set(weaponEvents.map(({ id }) => id)).size !== weaponEvents.length) {
    throw new RangeError('Arena V2 twenty weapon HUD adapter拒绝重复反馈事件ID。');
  }
  const passthroughUnarmedSourceEventIds: string[] = [];
  const plans = Object.freeze(weaponEvents.flatMap((event) => {
    if (event.kind !== 'movement-fall'
      && event.actionDefinitionId !== null
      && UNARMED_ACTION_IDS.has(event.actionDefinitionId)) {
      passthroughUnarmedSourceEventIds.push(event.id);
      return [];
    }
    return [projectArenaV2TwentyWeaponFeedbackReadPlanCandidateV1({
      schemaVersion: 1,
      modeKind,
      event,
    })];
  }));
  const planBySourceEventId = new Map(plans.map((plan) => [plan.sourceEventId, plan]));
  if (planBySourceEventId.size !== plans.length) {
    throw new RangeError('Arena V2 twenty weapon HUD adapter拒绝重复反馈事件ID。');
  }

  const renderModel = renderSource as unknown as ArenaV2ModeHudRenderModelV1;
  const copyContext = feedbackCopyContext(renderSource, modeKind);
  const weaponItems = renderModel.feedbackItems.filter(({ category }) => category === 'weapon');
  if (weaponItems.length !== plans.length + passthroughUnarmedSourceEventIds.length) {
    throw new RangeError('Arena V2 twenty weapon HUD adapter的V6事件与HUD武器反馈数量不闭合。');
  }
  const specializedFeedbackItems = Object.freeze(renderModel.feedbackItems.map((item) => {
    if (item.category !== 'weapon') return item;
    const plan = planBySourceEventId.get(item.sourceEventId);
    if (plan === undefined) {
      if (!passthroughUnarmedSourceEventIds.includes(item.sourceEventId)) {
        throw new RangeError(`Arena V2 twenty weapon HUD adapter缺少${item.sourceEventId}读取计划。`);
      }
      const event = weaponEvents.find(({ id }) => id === item.sourceEventId);
      if (event === undefined) {
        throw new RangeError(`Arena V2 twenty weapon HUD adapter缺少${item.sourceEventId}徒手事件。`);
      }
      const authority = projectArenaWeaponFeedbackEventV6PresentationEvent(event);
      const copy = projectArenaV2ModeHudWeaponFeedbackCopyV1(
        copyContext,
        authority,
      );
      const emphasis = projectArenaV2ModeHudWeaponFeedbackEmphasisV1(
        copyContext,
        authority,
      );
      if (item.tick !== authority.tick
        || item.sequence !== authority.sequence
        || item.attackerParticipantId !== authority.attackerId
        || item.targetParticipantId !== authority.targetId
        || item.actionDefinitionId !== authority.action
        || item.title !== copy.title
        || item.explanation !== copy.explanation
        || item.emphasis !== emphasis
        || item.visualCue !== authority.visualCue
        || (item.audioCue !== null && item.audioCue !== authority.audioCue)) {
        throw new RangeError(`Arena V2 twenty weapon HUD adapter检测到${item.sourceEventId}徒手语义漂移。`);
      }
      return item;
    }
    const authority = plan.authorityPresentation;
    const copy = projectArenaV2ModeHudWeaponFeedbackCopyV1(
      copyContext,
      authority,
    );
    const emphasis = projectArenaV2ModeHudWeaponFeedbackEmphasisV1(
      copyContext,
      authority,
    );
    if (item.tick !== plan.tick
      || item.sequence !== plan.sequence
      || item.attackerParticipantId !== authority.attackerId
      || item.targetParticipantId !== authority.targetId
      || item.actionDefinitionId !== plan.sourceActionDefinitionId
      || item.title !== copy.title
      || item.explanation !== copy.explanation
      || item.emphasis !== emphasis
      || item.visualCue !== authority.visualCue
      || (item.audioCue !== null && item.audioCue !== authority.audioCue)) {
      throw new RangeError(`Arena V2 twenty weapon HUD adapter检测到${item.sourceEventId}语义漂移。`);
    }
    return Object.freeze({
      ...item,
      title: weaponLearningTitle(plan, item.title),
      explanation: weaponLearningExplanation(
        plan,
        item.explanation,
        copyContext.localParticipantId,
      ),
      visualCue: plan.vfx.cueId,
      audioCue: item.audioCue === null ? null : plan.audio.cueId,
    });
  }));
  if ([...planBySourceEventId.keys()].some((sourceEventId) => (
    !weaponItems.some((item) => item.sourceEventId === sourceEventId)
  ))) {
    throw new RangeError('Arena V2 twenty weapon HUD adapter存在未被HUD消费的武器读取计划。');
  }

  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    renderModel: Object.freeze({
      ...renderModel,
      feedbackItems: specializedFeedbackItems,
    }),
    weaponReadPlans: plans,
    passthroughUnarmedSourceEventIds: Object.freeze(
      [...passthroughUnarmedSourceEventIds].sort(),
    ),
    governance: Object.freeze({
      inputSource: 'validated-hud-render-model-and-v6-events' as const,
      outputTarget: 'existing-feedback-queue-and-effect-consumer' as const,
      mutatesInput: false as const,
      ownsRuleOrMatchAuthority: false as const,
      infersOutcome: false as const,
      addsSameCatalogResultOrRiskLearningLoop: true as const,
      counterHintUsesSameCatalogInputs: true as const,
      learningHintPrecedesGenericOutcomeCopy: true as const,
      learningHintUsesLocalPerspective: true as const,
      duplicatesWeaponLearningCopy: false as const,
    }),
  });
}

export const ARENA_V2_TWENTY_WEAPON_FEEDBACK_HUD_ADAPTER_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  defaultSurfaceWired: false as const,
  inputSource: 'validated-hud-render-model-and-v6-events' as const,
  outputTarget: 'existing-feedback-queue-and-effect-consumer' as const,
  modifiesOnlyWeaponCueIdentities: false as const,
  addsWeaponAndActionContextToPlayerCopy: true as const,
  addsSameCatalogResultOrRiskLearningLoop: true as const,
  counterHintUsesSameCatalogInputs: true as const,
  learningHintPrecedesGenericOutcomeCopy: true as const,
  learningHintUsesLocalPerspective: true as const,
  duplicatesWeaponLearningCopy: false as const,
  unarmedCuePolicy: 'validated-generic-passthrough' as const,
  attackerAndTargetIdentityCannotBeSpecialized: true as const,
  keepsExistingQueueEpochAndCleanupOwnership: true as const,
  ownsRuleOrMatchAuthority: false as const,
  validationStatus: 'not-run' as const,
});
