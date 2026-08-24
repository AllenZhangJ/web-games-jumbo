import {
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_EVENT_V6_ACTION_SOURCE,
  ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND,
  assertArenaV6ActionFeedbackOutcomeConsistencyV1,
  assertArenaV6CompetitiveEquipmentActionEligibilityV1,
  assertArenaV6SurvivalEquipmentActionEligibilityV1,
  createArenaMatchEventV6,
  createDeterministicDataHash,
  createParticipantEquipmentUsageV3FromEvents,
  type ArenaMatchEventV6,
} from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_MODE_ROLE,
  validateProductMatchResultV3,
} from '@number-strategy-jump/arena-product-contracts';
import {
  ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
  ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
  ARENA_V2_WEAPON_LEARNING_CONTEXT_V1,
  createArenaV2LearningGrantV1,
  createArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningGrantV1,
  type ArenaV2WeaponLearningContextV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  createArenaV2LearningEvidenceDefinitionV1,
} from './arena-v2-learning-evidence-definition-v1.js';
import {
  isArenaV2EffectiveMatchCompletionV1,
  isArenaV2WholeMapCollectionEarnedV1,
} from './arena-v2-effective-match-completion-v1.js';
import { readExactOptions } from './options.js';

export interface ResolveArenaV2ReplayLearningGrantV1Options {
  readonly profileDefinition: unknown;
  readonly evidenceDefinition: unknown;
  readonly result: unknown;
  readonly recipientParticipantId: unknown;
  readonly events: unknown;
}

const OPTION_KEYS = new Set([
  'profileDefinition', 'evidenceDefinition', 'result', 'recipientParticipantId', 'events',
]);
const ROUTE_PROVING_WEAPON_FEEDBACK_KINDS = new Set<string>([
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_CONFIRM,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_SURFACE_TRANSFER,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_RING_OUT,
]);

function winner(
  result: ReturnType<typeof validateProductMatchResultV3>,
  participantId: string,
): boolean {
  return result.modeResult.kind !== 'survival'
    && result.modeResult.winnerParticipantIds.includes(participantId);
}

function modeBest(
  result: ReturnType<typeof validateProductMatchResultV3>,
  participantId: string,
): number | null {
  if (result.modeResult.kind === 'survival') return result.modeResult.survivedTicks;
  if (result.modeResult.kind === 'duel') {
    return winner(result, participantId) ? result.modeResult.endedAtTick : null;
  }
  return result.modeResult.rankings.find(
    (entry) => entry.participantId === participantId,
  )?.finishTick ?? null;
}

function canonicalEvents(value: unknown): readonly ArenaMatchEventV6[] {
  if (!Array.isArray(value) || value.length < 2) throw new RangeError('Learning replay至少需要起止事件。');
  const events = value.map((entry) => createArenaMatchEventV6(entry));
  const ids = new Set<string>();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    if (ids.has(event.id)) throw new RangeError('Learning replay事件身份必须唯一。');
    if (event.sequence !== index) {
      throw new RangeError('Learning replay事件sequence必须从0连续递增。');
    }
    if (index > 0 && event.tick < events[index - 1]!.tick) {
      throw new RangeError('Learning replay事件tick不能回退。');
    }
    ids.add(event.id);
  }
  const startedCount = events.filter(({ type }) => (
    type === ARENA_MATCH_EVENT_V6.MATCH_STARTED
  )).length;
  const endedCount = events.filter(({ type }) => (
    type === ARENA_MATCH_EVENT_V6.MATCH_ENDED
  )).length;
  if (startedCount !== 1 || events[0]!.type !== ARENA_MATCH_EVENT_V6.MATCH_STARTED
    || events[0]!.tick !== 0 || endedCount !== 1
    || events.at(-1)!.type !== ARENA_MATCH_EVENT_V6.MATCH_ENDED) {
    throw new RangeError('Learning replay必须以tick0唯一MatchStarted开始并以唯一MatchEnded结束。');
  }
  return Object.freeze(events);
}

function sameData(left: unknown, right: unknown, name: string): boolean {
  return createDeterministicDataHash(left, `${name} left`)
    === createDeterministicDataHash(right, `${name} right`);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Consumes the complete V6 event chain to award only observable contexts,
 * route segments and cross-challenges. It intentionally shares the canonical
 * grant identity with the summary resolver; a match can settle only one form.
 */
export function resolveArenaV2ReplayLearningGrantV1(
  value: unknown,
): ArenaV2LearningGrantV1 {
  const options = readExactOptions(value, OPTION_KEYS, 'ReplayLearningGrantV1 options');
  const profileDefinition = createArenaV2LearningProfileDefinitionV1(options.profileDefinition);
  const evidenceDefinition = createArenaV2LearningEvidenceDefinitionV1(
    profileDefinition,
    options.evidenceDefinition,
  );
  const result = validateProductMatchResultV3(options.result);
  if (typeof options.recipientParticipantId !== 'string'
    || options.recipientParticipantId.trim().length === 0) {
    throw new TypeError('Replay Learning recipient必须是非空字符串。');
  }
  const recipientParticipantId = options.recipientParticipantId;
  const assignment = result.participantAssignments.find(
    (entry) => entry.participantId === recipientParticipantId,
  );
  if (!assignment || assignment.modeRole === PRODUCT_MODE_ROLE.ENEMY) {
    throw new RangeError('Replay Learning recipient必须是当局非enemy参与者。');
  }
  if (result.modeResult.kind === 'survival'
    && result.modeResult.playerParticipantId !== recipientParticipantId) {
    throw new RangeError('Replay Learning Survival只能授予权威player。');
  }
  const mode = profileDefinition.modeDefinitions.find(
    (entry) => entry.modeDefinitionId === result.modeDefinitionId,
  );
  if (!mode || mode.kind !== result.modeResult.kind) {
    throw new RangeError('Replay Learning Mode与Profile Definition不一致。');
  }
  const racePreparingTicks = result.modeResult.kind === 'race'
    ? evidenceDefinition.racePreparingTicks
    : undefined;
  if (result.modeResult.kind === 'race'
    && (racePreparingTicks === undefined
      || result.modeResult.endedAtTick < racePreparingTicks)) {
    throw new RangeError('Replay Learning Race缺少权威准备期绑定或在准备期内提前终局。');
  }
  if (result.content.mapDefinitionIds.length !== 1) {
    throw new RangeError('Replay Learning Candidate当前只接受单地图赛果。');
  }
  const mapDefinitionId = result.content.mapDefinitionIds[0]!;
  const mapBinding = evidenceDefinition.mapBindings.find(
    (entry) => entry.mapDefinitionId === mapDefinitionId,
  );
  if (!mapBinding) throw new RangeError('Replay Learning缺少赛果地图证据绑定。');

  const actionBinding = new Map<string, Readonly<{
    weaponDefinitionId: string;
    context: 'ground' | 'aerial';
    runtimeEquipmentDefinitionId: string;
    modeKinds: readonly ('duel' | 'race' | 'survival')[];
    survivalLevel: number | null;
  }>>();
  for (const binding of evidenceDefinition.weaponBindings) {
    if (binding.actionBindings === undefined) {
      throw new RangeError('Replay Learning缺少运行时武器动作身份绑定。');
    }
    for (const action of binding.actionBindings) {
      if (actionBinding.has(action.actionDefinitionId)) {
        throw new RangeError('Replay Learning武器动作情境绑定不能重复。');
      }
      actionBinding.set(action.actionDefinitionId, Object.freeze({
        weaponDefinitionId: binding.weaponDefinitionId,
        context: action.context,
        runtimeEquipmentDefinitionId: action.runtimeEquipmentDefinitionId,
        modeKinds: action.modeKinds,
        survivalLevel: action.survivalLevel,
      }));
    }
  }

  const events = canonicalEvents(options.events);
  assertArenaV6ActionFeedbackOutcomeConsistencyV1(events);
  if (result.modeResult.kind === 'duel' || result.modeResult.kind === 'race') {
    assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: result.modeResult.kind,
      participants: result.participantAssignments.map((entry) => ({
        participantId: entry.participantId,
        modeRole: entry.modeRole,
        slotId: entry.slotId,
        slotGeneration: entry.slotGeneration,
      })),
      events,
    });
  } else {
    assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants: result.participantAssignments.map((entry) => ({
        participantId: entry.participantId,
        modeRole: entry.modeRole,
        slotId: entry.slotId,
        slotGeneration: entry.slotGeneration,
      })),
      events,
    });
  }
  const first = events[0]!;
  const last = events.at(-1)!;
  if (first.type !== ARENA_MATCH_EVENT_V6.MATCH_STARTED
    || first.modeDefinitionId !== result.modeDefinitionId
    || !sameData(
      first.participantIds,
      result.participantAssignments.map(({ participantId }) => participantId),
      'Replay Learning participant set',
    )) {
    throw new RangeError('Replay Learning起始事件与赛果不一致。');
  }
  if (last.type !== ARENA_MATCH_EVENT_V6.MATCH_ENDED
    || last.modeDefinitionId !== result.modeDefinitionId
    || !sameData(last.modeResult, result.modeResult, 'Replay Learning mode result')) {
    throw new RangeError('Replay Learning终局事件与赛果不一致。');
  }
  if (events.some((event) => event.tick > result.modeResult.endedAtTick)) {
    throw new RangeError('Replay Learning事件不能晚于终局tick。');
  }
  if (events.some((event) => (
    'modeDefinitionId' in event && event.modeDefinitionId !== result.modeDefinitionId
  ))) throw new RangeError('Replay Learning事件包含其他Mode身份。');
  const participantIds = new Set(
    result.participantAssignments.map(({ participantId }) => participantId),
  );
  const assignmentByParticipant = new Map(result.participantAssignments.map((entry) => (
    [entry.participantId, entry] as const
  )));
  const participantFallByIdentity = new Map<string, Extract<
    ArenaMatchEventV6,
    { readonly type: 'ParticipantFell' }
  >>();
  const authorityActionStarts = new Map<string, Extract<
    ArenaMatchEventV6,
    { readonly type: 'ActionStarted' }
  >>();
  for (const event of events) {
    if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL) {
      const fallIdentity = `${event.participantId}\u0000${event.tick}`;
      if (participantFallByIdentity.has(fallIdentity)) {
        throw new RangeError('Replay Learning同一参与者同tick不能重复掉落。');
      }
      participantFallByIdentity.set(fallIdentity, event);
    } else if (event.type === ARENA_MATCH_EVENT_V6.ACTION_STARTED) {
      const actionIdentity = `${event.participantId}\u0000${event.action}\u0000${event.tick}`;
      if (authorityActionStarts.has(actionIdentity)) {
        throw new RangeError('Replay Learning同一攻击者、动作与tick的起手身份不能重复。');
      }
      authorityActionStarts.set(actionIdentity, event);
    }
  }
  if (result.modeResult.kind === 'survival') {
    const playerParticipantId = result.modeResult.playerParticipantId;
    if (result.participantAssignments.some((entry) => (
      entry.participantId === playerParticipantId
        ? entry.modeRole !== PRODUCT_MODE_ROLE.PLAYER
        : entry.modeRole !== PRODUCT_MODE_ROLE.ENEMY
    ))) throw new RangeError('Replay Learning Survival assignment必须是唯一player与其余enemy。');
  } else if (result.participantAssignments.some(({ modeRole }) => (
    modeRole !== PRODUCT_MODE_ROLE.COMPETITOR
  ))) throw new RangeError('Replay Learning Duel/Race assignment只能包含competitor。');
  if (result.modeResult.kind === 'duel' && result.participantAssignments.length !== 2) {
    throw new RangeError('Replay Learning Duel必须是固定两名competitor。');
  }
  const duelFallParticipants = new Set<string>();
  const raceRankingByParticipant = result.modeResult.kind === 'race'
    ? new Map(result.modeResult.rankings.map((entry) => [entry.participantId, entry] as const))
    : null;
  const raceProgressByParticipant = new Map<string, number>();
  const raceProgressTickByParticipant = new Map<string, number>();
  const raceFinishParticipants = new Set<string>();
  const raceLatestSafeAnchorByParticipant = new Map<string, string>();
  if (result.modeResult.kind === 'race') {
    if (mapBinding.raceStartAnchorIds === undefined
      || mapBinding.raceStartAnchorIds.length < result.participantAssignments.length) {
      throw new RangeError('Replay Learning Race地图缺少完整起跑安全锚绑定。');
    }
    result.participantAssignments.forEach(({ participantId }, index) => {
      raceLatestSafeAnchorByParticipant.set(
        participantId,
        mapBinding.raceStartAnchorIds![index]!,
      );
    });
  }
  const racePendingFallTickByParticipant = new Map<string, number>();
  const raceRespawnScheduleByParticipant = new Map<string, Readonly<{
    readyTick: number;
    anchorId: string;
  }>>();
  const survivalEnemySlotStateByParticipant = new Map<string, {
    generation: number;
    active: boolean;
  }>(result.participantAssignments.flatMap(
    (entry) => result.modeResult.kind === 'survival'
      && entry.modeRole === PRODUCT_MODE_ROLE.ENEMY
      ? [[entry.participantId, {
        generation: entry.slotGeneration,
        active: false,
      }] as const]
      : [],
  ));
  const survivalEnemyPendingFallTickByParticipant = new Map<string, number>();
  let survivalPlayerFallPendingTick: number | null = null;
  let survivalFirstFallTick: number | null = null;
  let survivalFallCount = 0;
  let survivalFirstFallNeedsSchedule = false;
  let survivalRespawnSchedule: Readonly<{
    readyTick: number;
    anchorId: string;
  }> | null = null;
  let survivalFirstRespawnCompleted = false;
  const consumedRingOutFallIdentities = new Set<string>();
  const movementFallFeedbackIdentities = new Set<string>();
  for (const event of events) {
    if (result.modeResult.kind === 'race'
      && racePreparingTicks !== undefined
      && event.tick < racePreparingTicks
      && (
        event.type === ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED
        || event.type === ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED
        || (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL
          && event.modeRole === PRODUCT_MODE_ROLE.COMPETITOR)
        || (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED
          && event.modeRole === PRODUCT_MODE_ROLE.COMPETITOR)
        || (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED
          && event.modeRole === PRODUCT_MODE_ROLE.COMPETITOR)
      )) {
      throw new RangeError('Replay Learning Race准备期不能提交比赛事实。');
    }
    if ('participantId' in event && !participantIds.has(event.participantId)) {
      throw new RangeError('Replay Learning事件participantId不属于当前对局。');
    }
    if ('modeRole' in event) {
      const eventAssignment = assignmentByParticipant.get(event.participantId);
      if (eventAssignment === undefined || eventAssignment.modeRole !== event.modeRole) {
        throw new RangeError('Replay Learning事件modeRole与当局assignment不一致。');
      }
      if ('slotId' in event && (
        event.slotId !== eventAssignment.slotId
        || event.slotGeneration < eventAssignment.slotGeneration
      )) throw new RangeError('Replay Learning事件slot身份与当局assignment不一致。');
    }
    if ('creditedAttackerId' in event) {
      const participantId = event.creditedAttackerId;
      if (participantId !== null && !participantIds.has(participantId)) {
        throw new RangeError('Replay Learning事件creditedAttackerId不属于当前对局。');
      }
    }
    if (event.type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED) {
      for (const [name, participantId] of [
        ['attackerId', event.attackerId],
        ['targetId', event.targetId],
      ] as const) {
        if (participantId !== null && !participantIds.has(participantId)) {
          throw new RangeError(`Replay Learning WeaponFeedback.${name}不属于当前对局。`);
        }
      }
      if (event.attackerId !== null
        && event.actionDefinitionId !== null
        && event.actionStartedTick !== null) {
        const actionIdentity = `${event.attackerId}\u0000${event.actionDefinitionId}\u0000${event.actionStartedTick}`;
        const startedAction = authorityActionStarts.get(actionIdentity);
        if (startedAction === undefined || startedAction.sequence >= event.sequence) {
          throw new RangeError(
            'Replay Learning攻击反馈缺少同攻击者、同动作、同起手tick的先行权威起手。',
          );
        }
        if (actionBinding.has(event.actionDefinitionId)
          && startedAction.sourceKind !== ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT) {
          throw new RangeError('Replay Learning武器反馈只能引用equipment权威起手。');
        }
        if (event.firstHitTick !== null
          && event.tick - event.firstHitTick
            > ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1) {
          throw new RangeError(
            `Replay Learning命中反馈必须在${ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1} tick结果窗口内闭合。`,
          );
        }
      }
      if (event.kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.HIT_RING_OUT) {
        if (event.targetId === null
          || event.attackerId === null
          || event.targetFallTick === null
          || event.targetFallTick !== event.tick) {
          throw new RangeError('Replay Learning ring-out反馈必须在目标掉落tick闭合。');
        }
        const fallIdentity = `${event.targetId}\u0000${event.targetFallTick}`;
        const fall = participantFallByIdentity.get(fallIdentity);
        if (fall === undefined
          || fall.fallCause !== 'credited-hit'
          || fall.creditedAttackerId !== event.attackerId
          || consumedRingOutFallIdentities.has(fallIdentity)) {
          throw new RangeError('Replay Learning ring-out反馈缺少唯一匹配的权威掉落事实。');
        }
        consumedRingOutFallIdentities.add(fallIdentity);
      } else if (event.kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.MOVEMENT_FALL) {
        if (event.attackerId !== null
          || event.actionDefinitionId !== null
          || event.actionStartedTick !== null) {
          throw new RangeError('Replay Learning movement-fall不能携带攻击上下文。');
        }
        if (event.targetId === null
          || event.targetFallTick === null
          || event.targetFallTick !== event.tick) {
          throw new RangeError('Replay Learning movement-fall必须在目标掉落tick闭合。');
        }
        const fallIdentity = `${event.targetId}\u0000${event.targetFallTick}`;
        const fall = participantFallByIdentity.get(fallIdentity);
        if (fall === undefined
          || fall.fallCause !== 'movement'
          || (fall.supportSurfaceId !== null
            && fall.supportSurfaceId !== event.initialSupportSurfaceId)
          || movementFallFeedbackIdentities.has(fallIdentity)) {
          throw new RangeError('Replay Learning movement-fall缺少唯一匹配的移动掉落事实。');
        }
        movementFallFeedbackIdentities.add(fallIdentity);
      }
      continue;
    }
    if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL
      && event.modeRole === PRODUCT_MODE_ROLE.PLAYER) {
      if (result.modeResult.kind !== 'survival'
        || event.participantId !== result.modeResult.playerParticipantId
        || survivalPlayerFallPendingTick !== null
        || (survivalFallCount === 1 && !survivalFirstRespawnCompleted)
        || survivalFallCount >= 2) {
        throw new RangeError('Replay Learning Survival玩家掉落事实与生命周期不闭合。');
      }
      survivalPlayerFallPendingTick = event.tick;
      continue;
    }
    if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL
      && event.modeRole === PRODUCT_MODE_ROLE.COMPETITOR) {
      if (result.modeResult.kind === 'duel') {
        if (event.tick !== result.modeResult.endedAtTick
          || duelFallParticipants.has(event.participantId)) {
          throw new RangeError('Replay Learning Duel掉落事实与终局tick不闭合。');
        }
        duelFallParticipants.add(event.participantId);
        continue;
      }
      if (result.modeResult.kind === 'race') {
        if (racePendingFallTickByParticipant.has(event.participantId)
          || raceRespawnScheduleByParticipant.has(event.participantId)
          || raceFinishParticipants.has(event.participantId)) {
          throw new RangeError('Replay Learning Race掉落事实与生命周期不闭合。');
        }
        racePendingFallTickByParticipant.set(event.participantId, event.tick);
        continue;
      }
      throw new RangeError('Replay Learning competitor掉落不属于当前模式。');
    }
    if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL
      && event.modeRole === PRODUCT_MODE_ROLE.ENEMY) {
      const slotState = survivalEnemySlotStateByParticipant.get(event.participantId);
      if (result.modeResult.kind !== 'survival'
        || slotState === undefined
        || !slotState.active
        || event.slotGeneration !== slotState.generation
        || survivalEnemyPendingFallTickByParticipant.has(event.participantId)) {
        throw new RangeError('Replay Learning Survival敌人掉落与当前槽生命周期不闭合。');
      }
      survivalEnemyPendingFallTickByParticipant.set(event.participantId, event.tick);
      continue;
    }
    if (event.type === ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED) {
      if (result.modeResult.kind !== 'race' || raceRankingByParticipant === null) {
        throw new RangeError('Replay Learning非Race不能包含安全锚事件。');
      }
      const eventAssignment = assignmentByParticipant.get(event.participantId);
      const ranking = raceRankingByParticipant.get(event.participantId);
      const segment = mapBinding.segments[event.progressOrdinal - 1];
      const previousProgress = raceProgressByParticipant.get(event.participantId) ?? 0;
      const previousProgressTick = raceProgressTickByParticipant.get(event.participantId);
      if (eventAssignment === undefined
        || eventAssignment.modeRole !== PRODUCT_MODE_ROLE.COMPETITOR
        || ranking === undefined
        || segment === undefined
        || segment.safeAnchorId === undefined
        || event.anchorId !== segment.safeAnchorId
        || event.progressOrdinal <= previousProgress
        || previousProgressTick === event.tick
        || raceRespawnScheduleByParticipant.has(event.participantId)
        || racePendingFallTickByParticipant.has(event.participantId)
        || raceFinishParticipants.has(event.participantId)
        || event.progressOrdinal > ranking.progressOrdinal) {
        throw new RangeError('Replay Learning Race安全锚与地图、角色或终局进度不闭合。');
      }
      raceProgressByParticipant.set(event.participantId, event.progressOrdinal);
      raceProgressTickByParticipant.set(event.participantId, event.tick);
      raceLatestSafeAnchorByParticipant.set(event.participantId, event.anchorId);
      continue;
    }
    if (event.type === ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED) {
      if (result.modeResult.kind !== 'race' || raceRankingByParticipant === null) {
        throw new RangeError('Replay Learning非Race不能包含冲线事件。');
      }
      const eventAssignment = assignmentByParticipant.get(event.participantId);
      const ranking = raceRankingByParticipant.get(event.participantId);
      if (eventAssignment === undefined
        || eventAssignment.modeRole !== PRODUCT_MODE_ROLE.COMPETITOR
        || ranking === undefined
        || ranking.finishTick !== event.finishTick
        || ranking.progressOrdinal !== event.progressOrdinal
        || event.progressOrdinal !== mapBinding.segments.length + 1
        || raceRespawnScheduleByParticipant.has(event.participantId)
        || racePendingFallTickByParticipant.has(event.participantId)
        || raceFinishParticipants.has(event.participantId)) {
        throw new RangeError('Replay Learning Race冲线与地图、角色或终局排名不闭合。');
      }
      raceFinishParticipants.add(event.participantId);
      continue;
    }
    if (event.type === ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED) {
      const eventAssignment = assignmentByParticipant.get(event.participantId);
      const slotState = survivalEnemySlotStateByParticipant.get(event.participantId);
      const pendingFallTick = survivalEnemyPendingFallTickByParticipant.get(
        event.participantId,
      );
      if (result.modeResult.kind !== 'survival'
        || eventAssignment === undefined
        || eventAssignment.modeRole !== PRODUCT_MODE_ROLE.ENEMY
        || eventAssignment.slotId !== event.slotId
        || slotState === undefined
        || event.previousGeneration !== slotState.generation
        || (event.active && (slotState.active || pendingFallTick !== undefined))
        || (!event.active && (!slotState.active || pendingFallTick !== event.tick))) {
        throw new RangeError('Replay Learning Survival敌人槽事件与终局assignment不闭合。');
      }
      survivalEnemySlotStateByParticipant.set(event.participantId, {
        generation: event.generation,
        active: event.active,
      });
      if (!event.active) survivalEnemyPendingFallTickByParticipant.delete(event.participantId);
      continue;
    }
    if (event.type === ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED
    ) {
      if (result.modeResult.kind !== 'survival'
        || event.participantId !== result.modeResult.playerParticipantId
        || survivalPlayerFallPendingTick !== event.tick
        || event.fallCount !== survivalFallCount + 1
        || (event.fallCount === 2 && !survivalFirstRespawnCompleted)) {
        throw new RangeError('Replay Learning Survival玩家掉落计数与权威掉落事实不闭合。');
      }
      survivalFallCount = event.fallCount;
      survivalPlayerFallPendingTick = null;
      if (event.fallCount === 1) {
        survivalFirstFallTick = event.tick;
        survivalFirstFallNeedsSchedule = true;
      }
      continue;
    }
    if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED) {
      if (event.modeRole === PRODUCT_MODE_ROLE.COMPETITOR) {
        if (result.modeResult.kind !== 'race'
          || racePendingFallTickByParticipant.get(event.participantId) !== event.tick
          || raceRespawnScheduleByParticipant.has(event.participantId)
          || raceLatestSafeAnchorByParticipant.get(event.participantId) !== event.anchorId) {
          throw new RangeError('Replay Learning竞速重生计划与当前模式不闭合。');
        }
        racePendingFallTickByParticipant.delete(event.participantId);
        raceRespawnScheduleByParticipant.set(event.participantId, Object.freeze({
          readyTick: event.readyTick,
          anchorId: event.anchorId,
        }));
      } else {
        if (result.modeResult.kind !== 'survival'
          || event.participantId !== result.modeResult.playerParticipantId
          || !survivalFirstFallNeedsSchedule
          || event.tick !== survivalFirstFallTick
          || survivalRespawnSchedule !== null
          || survivalFirstRespawnCompleted) {
          throw new RangeError('Replay Learning Survival首次掉落重生计划不闭合。');
        }
        survivalRespawnSchedule = Object.freeze({
          readyTick: event.readyTick,
          anchorId: event.anchorId,
        });
        survivalFirstFallNeedsSchedule = false;
      }
      continue;
    }
    if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED) {
      if (event.modeRole === PRODUCT_MODE_ROLE.COMPETITOR) {
        const schedule = raceRespawnScheduleByParticipant.get(event.participantId);
        if (result.modeResult.kind !== 'race'
          || schedule === undefined
          || event.tick !== schedule.readyTick
          || event.anchorId !== schedule.anchorId
          || raceFinishParticipants.has(event.participantId)) {
          throw new RangeError('Replay Learning竞速重生与当前模式不闭合。');
        }
        raceRespawnScheduleByParticipant.delete(event.participantId);
      } else if (result.modeResult.kind !== 'survival'
        || event.participantId !== result.modeResult.playerParticipantId
        || survivalRespawnSchedule === null
        || event.tick !== survivalRespawnSchedule.readyTick
        || event.anchorId !== survivalRespawnSchedule.anchorId
        || survivalFirstRespawnCompleted) {
        throw new RangeError('Replay Learning Survival首次掉落重生执行不闭合。');
      } else {
        survivalRespawnSchedule = null;
        survivalFirstRespawnCompleted = true;
      }
    }
  }
  if (result.modeResult.kind !== 'race' && events.some((event) => (
    event.type === ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED
    || event.type === ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED
  ))) throw new RangeError('Replay Learning非Race包含Race专属事件。');
  if (result.modeResult.kind !== 'survival' && events.some((event) => (
    event.type === ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED
    || event.type === ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED
  ))) throw new RangeError('Replay Learning非Survival包含Survival专属事件。');
  if (result.modeResult.kind === 'duel') {
    const duelResult = result.modeResult;
    const expectedFallParticipants = duelResult.reason === 'last-participant-standing'
      ? result.participantAssignments.flatMap(({ participantId }) => (
        duelResult.winnerParticipantIds.includes(participantId)
          ? []
          : [participantId]
      ))
      : duelResult.reason === 'simultaneous-elimination'
        ? result.participantAssignments.map(({ participantId }) => participantId)
        : [];
    if (expectedFallParticipants.length !== duelFallParticipants.size
      || expectedFallParticipants.some((participantId) => (
        !duelFallParticipants.has(participantId)
      ))) throw new RangeError('Replay Learning Duel掉落事件未闭合终局结果。');
  }
  if (result.modeResult.kind === 'race') {
    const expectedFinishParticipants = result.modeResult.rankings.filter(({ finishTick }) => (
      finishTick !== null
    )).map(({ participantId }) => participantId);
    if (expectedFinishParticipants.length !== raceFinishParticipants.size
      || expectedFinishParticipants.some((participantId) => (
        !raceFinishParticipants.has(participantId)
      ))) throw new RangeError('Replay Learning Race冲线事件未完整闭合终局排名。');
    for (const ranking of result.modeResult.rankings) {
      if (ranking.finishTick !== null) continue;
      if ((raceProgressByParticipant.get(ranking.participantId) ?? 0)
        !== ranking.progressOrdinal) {
        throw new RangeError('Replay Learning Race未冲线者的安全锚证据未闭合终局进度。');
      }
    }
    if (result.modeResult.rankings.some(({ finishTick }) => (
      finishTick !== null && finishTick !== result.modeResult.endedAtTick
    ))) throw new RangeError('Replay Learning Race冲线者必须在同一终局tick完成。');
    const finisherIds = result.modeResult.rankings.filter(({ finishTick }) => (
      finishTick !== null
    )).map(({ participantId }) => participantId).sort(compareText);
    const unfinished = result.modeResult.rankings.filter(({ finishTick }) => (
      finishTick === null
    )).sort((left, right) => (
      right.progressOrdinal - left.progressOrdinal
      || compareText(left.participantId, right.participantId)
    ));
    const expectedRankByParticipant = new Map<string, number>(
      finisherIds.map((participantId) => [participantId, 1] as const),
    );
    let previousProgress: number | null = null;
    let rank = finisherIds.length + 1;
    for (let index = 0; index < unfinished.length; index += 1) {
      const ranking = unfinished[index]!;
      if (previousProgress !== null && ranking.progressOrdinal !== previousProgress) {
        rank = finisherIds.length + index + 1;
      }
      previousProgress = ranking.progressOrdinal;
      expectedRankByParticipant.set(ranking.participantId, rank);
    }
    if (result.modeResult.rankings.some(({ participantId, rank: actualRank }) => (
      expectedRankByParticipant.get(participantId) !== actualRank
    ))) throw new RangeError('Replay Learning Race名次与冲线/进度权威排序不一致。');
    if ([...racePendingFallTickByParticipant.values()].some((fallTick) => (
      fallTick !== result.modeResult.endedAtTick
    ))
      || [...raceRespawnScheduleByParticipant.values()].some(({ readyTick }) => (
        readyTick < result.modeResult.endedAtTick
      ))) throw new RangeError('Replay Learning Race掉落/重生事件未闭合终局。');
  }
  if (result.modeResult.kind === 'survival') {
    const timeCapEndedOnUnscheduledFirstFall =
      result.modeResult.reason === 'survival-time-cap'
      && survivalFallCount === 1
      && survivalFirstFallTick === result.modeResult.endedAtTick
      && survivalFirstFallNeedsSchedule
      && survivalRespawnSchedule === null
      && !survivalFirstRespawnCompleted;
    if (survivalPlayerFallPendingTick !== null
      || (survivalFirstFallNeedsSchedule && !timeCapEndedOnUnscheduledFirstFall)
      || survivalEnemyPendingFallTickByParticipant.size !== 0
      || survivalFallCount !== result.modeResult.fallCount
      || (result.modeResult.reason === 'terminal-player-fall'
        && (survivalFallCount !== 2
          || !survivalFirstRespawnCompleted
          || survivalRespawnSchedule !== null))
      || (result.modeResult.reason === 'survival-time-cap'
        && (survivalFallCount >= 2
          || (survivalFallCount === 1
            && !survivalFirstRespawnCompleted
            && survivalRespawnSchedule === null
            && !timeCapEndedOnUnscheduledFirstFall)
          || (survivalFirstFallTick === result.modeResult.endedAtTick
            && !timeCapEndedOnUnscheduledFirstFall)
          || (survivalRespawnSchedule !== null
            && result.modeResult.endedAtTick > survivalRespawnSchedule.readyTick)))) {
      throw new RangeError('Replay Learning Survival掉落/重生事件未闭合终局结果。');
    }
  }
  const unclosedMovementFall = [...participantFallByIdentity].some(([identity, fall]) => (
    fall.fallCause === 'movement' && !movementFallFeedbackIdentities.has(identity)
  ));
  if (unclosedMovementFall) {
    throw new RangeError('Replay Learning移动掉落缺少唯一movement-fall反馈。');
  }
  const rebuiltUsage = createParticipantEquipmentUsageV3FromEvents({
    participantIds: [...participantIds],
    allowedCollectionEquipmentDefinitionIds: result.content.equipmentDefinitionIds,
    events,
  });
  if (!sameData(rebuiltUsage, result.participantEquipmentUsage, 'Replay Learning equipment usage')) {
    throw new RangeError('Replay Learning事件与赛果武器使用摘要不一致。');
  }
  const usage = rebuiltUsage.find((entry) => entry.participantId === recipientParticipantId)!;
  const usedWeapons = new Set(usage.usedCollectionEquipmentDefinitionIds);
  const registeredWeapons = new Set(profileDefinition.weaponDefinitionIds);
  if ([...usedWeapons].some((weaponDefinitionId) => !registeredWeapons.has(weaponDefinitionId))) {
    throw new RangeError('Replay Learning使用了Profile Definition之外的武器。');
  }

  const contextByWeapon = new Map<string, Set<ArenaV2WeaponLearningContextV1>>(
    [...usedWeapons].map((id) => [id, new Set()]),
  );
  const actionCountByWeapon = new Map<string, number>(
    [...usedWeapons].map((id) => [id, 0]),
  );
  const segmentBySurface = new Map<string, string>();
  const edgeSurfaces = new Set<string>();
  for (const segment of mapBinding.segments) {
    for (const surfaceId of segment.surfaceIds) {
      segmentBySurface.set(surfaceId, segment.segmentDefinitionId);
    }
    for (const surfaceId of segment.edgeSurfaceIds) edgeSurfaces.add(surfaceId);
  }
  const evidencedSegments = new Set<string>();
  const feedbackSegmentsByWeapon = new Map<string, Set<string>>(
    [...usedWeapons].map((weaponDefinitionId) => [weaponDefinitionId, new Set()]),
  );
  const startedActions = new Map<string, Readonly<{
    weaponDefinitionId: string;
    context: 'ground' | 'aerial';
    eligibleForLearning: boolean;
    startedSequence: number;
  }>>();
  const equipmentInstanceIdentities = new Map<string, Readonly<{
    runtimeEquipmentDefinitionId: string;
    collectionEquipmentDefinitionId: string;
    survivalLevel: number | null;
  }>>();
  const participantEquipmentActionTicks = new Set<string>();
  const equipmentInstanceActionTicks = new Map<string, string>();
  const equipmentInstanceParticipants = new Map<string, string>();
  const effectiveActionIds = new Set<string>();
  const effectiveWeapons = new Set<string>();
  const firstEffectiveActionSequenceByWeapon = new Map<string, number>();
  for (const event of events) {
    if (event.type === ARENA_MATCH_EVENT_V6.ACTION_STARTED
      && event.sourceKind === ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT) {
      const binding = actionBinding.get(event.action);
      if (!binding
        || event.collectionEquipmentDefinitionId !== binding.weaponDefinitionId
        || event.runtimeEquipmentDefinitionId !== binding.runtimeEquipmentDefinitionId
        || event.survivalLevel !== binding.survivalLevel
        || !binding.modeKinds.includes(result.modeResult.kind)) {
        throw new RangeError('Replay Learning ActionStarted缺少闭合的武器运行时身份绑定。');
      }
      const equipmentInstanceId = event.equipmentInstanceId!;
      const instanceIdentity = equipmentInstanceIdentities.get(equipmentInstanceId);
      if (instanceIdentity && (
        instanceIdentity.runtimeEquipmentDefinitionId !== event.runtimeEquipmentDefinitionId
        || instanceIdentity.collectionEquipmentDefinitionId
          !== event.collectionEquipmentDefinitionId
        || instanceIdentity.survivalLevel !== event.survivalLevel
      )) {
        throw new RangeError('Replay Learning同一装备实例的运行时身份不能变化。');
      }
      if (!instanceIdentity) {
        equipmentInstanceIdentities.set(equipmentInstanceId, Object.freeze({
          runtimeEquipmentDefinitionId: event.runtimeEquipmentDefinitionId!,
          collectionEquipmentDefinitionId: event.collectionEquipmentDefinitionId!,
          survivalLevel: event.survivalLevel,
        }));
      }
      const previousParticipantId = equipmentInstanceParticipants.get(equipmentInstanceId);
      if (result.modeResult.kind !== 'survival'
        && previousParticipantId !== undefined
        && previousParticipantId !== event.participantId) {
        throw new RangeError('Replay Learning Duel/Race装备实例不能跨参与者转移。');
      }
      equipmentInstanceParticipants.set(equipmentInstanceId, event.participantId);
      const participantTickIdentity = `${event.participantId}\u0000${event.tick}`;
      if (participantEquipmentActionTicks.has(participantTickIdentity)) {
        throw new RangeError('Replay Learning同一参与者同tick只能启动一个装备动作。');
      }
      participantEquipmentActionTicks.add(participantTickIdentity);
      const instanceTickIdentity = `${equipmentInstanceId}\u0000${event.tick}`;
      const instanceTickParticipantId = equipmentInstanceActionTicks.get(instanceTickIdentity);
      if (instanceTickParticipantId !== undefined) {
        throw new RangeError('Replay Learning同一装备实例同tick只能被一个参与者使用一次。');
      }
      equipmentInstanceActionTicks.set(instanceTickIdentity, event.participantId);
      if (event.participantId !== recipientParticipantId) continue;
      const actionIdentity = `${event.action}\u0000${event.tick}`;
      if (startedActions.has(actionIdentity)) {
        throw new RangeError('Replay Learning同一tick包含重复武器动作身份。');
      }
      startedActions.set(actionIdentity, Object.freeze({
        ...binding,
        eligibleForLearning: result.modeResult.kind !== 'race'
          || (racePreparingTicks !== undefined && event.tick >= racePreparingTicks),
        startedSequence: event.sequence,
      }));
      continue;
    }
    if (event.type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED
      && event.attackerId === recipientParticipantId
      && event.actionDefinitionId !== null
      && event.actionStartedTick !== null) {
      const binding = actionBinding.get(event.actionDefinitionId);
      if (!binding) continue;
      if (!usedWeapons.has(binding.weaponDefinitionId)) {
        throw new RangeError('Replay Learning WeaponFeedback缺少闭合的武器绑定。');
      }
      const actionIdentity = `${event.actionDefinitionId}\u0000${event.actionStartedTick}`;
      const startedAction = startedActions.get(actionIdentity);
      if (!startedAction || startedAction.weaponDefinitionId !== binding.weaponDefinitionId) {
        throw new RangeError('Replay Learning WeaponFeedback缺少同动作同tick的权威起手。');
      }
      if (!startedAction.eligibleForLearning
        || (result.modeResult.kind === 'race'
          && racePreparingTicks !== undefined
          && event.tick < racePreparingTicks)) {
        continue;
      }
      if (!effectiveActionIds.has(actionIdentity)) {
        effectiveActionIds.add(actionIdentity);
        effectiveWeapons.add(binding.weaponDefinitionId);
        if (!firstEffectiveActionSequenceByWeapon.has(binding.weaponDefinitionId)) {
          firstEffectiveActionSequenceByWeapon.set(
            binding.weaponDefinitionId,
            startedAction.startedSequence,
          );
        }
        contextByWeapon.get(binding.weaponDefinitionId)?.add(startedAction.context);
        actionCountByWeapon.set(
          binding.weaponDefinitionId,
          (actionCountByWeapon.get(binding.weaponDefinitionId) ?? 0) + 1,
        );
      }
      if (ROUTE_PROVING_WEAPON_FEEDBACK_KINDS.has(event.kind)
        && event.initialSupportSurfaceId !== null) {
        const segmentId = segmentBySurface.get(event.initialSupportSurfaceId);
        if (segmentId) {
          evidencedSegments.add(segmentId);
          feedbackSegmentsByWeapon.get(binding.weaponDefinitionId)?.add(segmentId);
        }
        if (edgeSurfaces.has(event.initialSupportSurfaceId)) {
          contextByWeapon.get(binding.weaponDefinitionId)?.add(
            ARENA_V2_WEAPON_LEARNING_CONTEXT_V1.EDGE,
          );
        }
      }
      if (result.modeResult.kind === 'duel'
        && event.kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED) {
        contextByWeapon.get(binding.weaponDefinitionId)?.add(
          ARENA_V2_WEAPON_LEARNING_CONTEXT_V1.DUEL_COUNTERPLAY,
        );
      }
      continue;
    }
    if (event.type === ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED
      && event.participantId === recipientParticipantId) {
      const segment = mapBinding.segments[event.progressOrdinal - 1];
      if (!segment) throw new RangeError('Replay Learning race progressOrdinal越界。');
      evidencedSegments.add(segment.segmentDefinitionId);
      continue;
    }
    if (event.type === ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED
      && event.participantId === recipientParticipantId) {
      const finalSegment = mapBinding.segments.at(-1);
      if (!finalSegment) throw new RangeError('Replay Learning Race地图缺少终点前段落。');
      evidencedSegments.add(finalSegment.segmentDefinitionId);
    }
  }
  if (result.modeResult.kind === 'survival') {
    for (const weaponDefinitionId of effectiveWeapons) {
      contextByWeapon.get(weaponDefinitionId)?.add(
        ARENA_V2_WEAPON_LEARNING_CONTEXT_V1.SURVIVAL,
      );
    }
  }
  const contextOrder = new Map(
    ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.map((context, index) => [context, index]),
  );
  const finishTick = result.modeResult.kind === 'race'
    ? result.modeResult.rankings.find(({ participantId }) => (
      participantId === recipientParticipantId
    ))?.finishTick ?? null
    : null;
  const finalSegmentId = mapBinding.segments.at(-1)?.segmentDefinitionId ?? null;
  const effectiveCompletion = isArenaV2EffectiveMatchCompletionV1(
    result,
    recipientParticipantId,
  );
  const wholeMapCollectionEarned = isArenaV2WholeMapCollectionEarnedV1(
    result,
    recipientParticipantId,
  );
  const orderedUsedWeapons = profileDefinition.weaponDefinitionIds.filter((id) => (
    effectiveWeapons.has(id)
  ));
  const featuredCollectionWeaponDefinitionId = [...orderedUsedWeapons].sort((left, right) => (
    (actionCountByWeapon.get(right) ?? 0) - (actionCountByWeapon.get(left) ?? 0)
    || (firstEffectiveActionSequenceByWeapon.get(left) ?? Number.MAX_SAFE_INTEGER)
      - (firstEffectiveActionSequenceByWeapon.get(right) ?? Number.MAX_SAFE_INTEGER)
    || profileDefinition.weaponDefinitionIds.indexOf(left)
      - profileDefinition.weaponDefinitionIds.indexOf(right)
  ))[0] ?? null;
  const challengeDeltas = profileDefinition.challengeDefinitions.filter((challenge) => (
    (challenge.weaponDefinitionId === null || effectiveWeapons.has(challenge.weaponDefinitionId))
    && (challenge.mapDefinitionId === null || challenge.mapDefinitionId === mapDefinitionId)
    && (challenge.segmentDefinitionId === null || evidencedSegments.has(challenge.segmentDefinitionId))
    && (challenge.modeDefinitionId === null || challenge.modeDefinitionId === result.modeDefinitionId)
    && (
      challenge.weaponDefinitionId === null
      || challenge.segmentDefinitionId === null
      || feedbackSegmentsByWeapon.get(challenge.weaponDefinitionId)?.has(
        challenge.segmentDefinitionId,
      ) === true
    )
  )).map(({ challengeDefinitionId }) => ({ challengeDefinitionId, progressDelta: 1 }));

  const grantIdentityHash = createDeterministicDataHash({
    profileDefinitionId: profileDefinition.id,
    profileDefinitionContentHash: profileDefinition.contentHash,
    resultAuthorityHash: result.authorityHash,
    recipientParticipantId,
  }, 'Arena V2 Learning Grant Identity V1');
  const resultGrantId = `arena-learning:v1:${grantIdentityHash}`;
  return createArenaV2LearningGrantV1(profileDefinition, {
    schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
    grantId: resultGrantId,
    resultAuthorityHash: result.authorityHash,
    recipientParticipantId,
    sourceModeDefinitionId: result.modeDefinitionId,
    sourceMapDefinitionIds: [mapDefinitionId],
    collectedWeaponDefinitionIds: featuredCollectionWeaponDefinitionId === null
      ? []
      : [featuredCollectionWeaponDefinitionId],
    collectedMapDefinitionIds: wholeMapCollectionEarned ? [mapDefinitionId] : [],
    weaponDeltas: orderedUsedWeapons.map((weaponDefinitionId) => ({
      weaponDefinitionId,
      useCountDelta: weaponDefinitionId === featuredCollectionWeaponDefinitionId ? 1 : 0,
      contextEvidence: [...contextByWeapon.get(weaponDefinitionId)!]
        .sort((left, right) => contextOrder.get(left)! - contextOrder.get(right)!)
        .map((context) => ({ context, evidenceDelta: 1 })),
    })),
    mapSegmentDeltas: [...evidencedSegments].sort().map((segmentDefinitionId) => ({
      mapDefinitionId,
      segmentDefinitionId,
      completionEvidenceDelta: 1,
      raceFinishTicksCandidate: segmentDefinitionId === finalSegmentId ? finishTick : null,
      survivalTicksCandidate: result.modeResult.kind === 'survival'
        ? result.modeResult.survivedTicks
        : null,
    })),
    modeDelta: {
      modeDefinitionId: result.modeDefinitionId,
      playCountDelta: 1,
      completionCountDelta: effectiveCompletion ? 1 : 0,
      winCountDelta: winner(result, recipientParticipantId) ? 1 : 0,
      bestPerformanceTicksCandidate: modeBest(result, recipientParticipantId),
    },
    challengeDeltas,
  });
}
