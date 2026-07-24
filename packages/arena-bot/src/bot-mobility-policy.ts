import { ARENA_PARTICIPANT_STATUS } from '@number-strategy-jump/arena-match';
import { MOVEMENT_MODE } from '@number-strategy-jump/arena-movement';
import { BOT_GOAL_ID } from './bot-goals.js';
import type { BotGoalPlan } from './bot-goals.js';
import type { BotObservation } from './bot-observation.js';
import type { UtilityDecision } from './utility-arbitrator.js';

export const BOT_MOBILITY_INTENT = Object.freeze({
  NONE: 'none',
  JUMP: 'jump',
  CROUCH_JUMP: 'crouch-jump',
  SLAM: 'slam',
} as const);

export type BotMobilityIntent = typeof BOT_MOBILITY_INTENT[keyof typeof BOT_MOBILITY_INTENT];

export interface BotMobilitySelection {
  readonly observation: BotObservation;
  readonly decision: UtilityDecision<BotGoalPlan>;
}

function channelIsSelected(
  observation: BotObservation,
  channel: 'jump' | 'slam',
): boolean {
  return observation.self.actionAffordance.channels[channel].kind === 'selected';
}

function horizontalDistance(
  first: Readonly<{ x: number; z: number }>,
  second: Readonly<{ x: number; z: number }>,
): number {
  return Math.hypot(second.x - first.x, second.z - first.z);
}

/**
 * Selects only a semantic mobility intent. It never reads Physics, private
 * Movement counters, future contacts or difficulty-specific permissions.
 */
export function selectBotMobilityIntent(
  { observation, decision }: BotMobilitySelection,
): BotMobilityIntent {
  const { self, opponent, arena } = observation;
  if (
    self.status !== ARENA_PARTICIPANT_STATUS.ACTIVE
    || self.hitstunTicks > 0
    || self.movement.mode !== MOVEMENT_MODE.STANDARD
  ) return BOT_MOBILITY_INTENT.NONE;

  const opponentDistance = horizontalDistance(self.position, opponent.position);
  const heightAdvantage = self.position.y - opponent.position.y;
  if (
    !self.movement.grounded
    && channelIsSelected(observation, 'slam')
    && opponent.status === ARENA_PARTICIPANT_STATUS.ACTIVE
    && opponentDistance <= observation.actionRule.range * 1.35
    && heightAdvantage >= arena.characterRadius * 0.75
    && self.position.y > arena.killY + arena.characterRadius * 4
  ) return BOT_MOBILITY_INTENT.SLAM;

  if (!channelIsSelected(observation, 'jump')) return BOT_MOBILITY_INTENT.NONE;
  if (!self.movement.grounded) {
    if (
      self.velocity.y <= 1.5
      && (
        decision.goalId === BOT_GOAL_ID.RECOVER_EDGE
        || decision.goalId === BOT_GOAL_ID.AVOID_MAP_HAZARD
        || decision.goalId === BOT_GOAL_ID.EVADE_THREAT
      )
    ) return BOT_MOBILITY_INTENT.JUMP;
    return BOT_MOBILITY_INTENT.NONE;
  }

  const targetDistance = horizontalDistance(self.position, decision.plan.target);
  if (
    (decision.goalId === BOT_GOAL_ID.AVOID_MAP_HAZARD && targetDistance > 1.5)
    || (decision.goalId === BOT_GOAL_ID.ACQUIRE_EQUIPMENT && targetDistance > 3.5)
  ) return BOT_MOBILITY_INTENT.CROUCH_JUMP;
  if (
    decision.goalId === BOT_GOAL_ID.EVADE_THREAT
    || (
      decision.goalId === BOT_GOAL_ID.ATTACK
      && opponent.position.y - self.position.y > arena.characterRadius * 1.2
    )
  ) return BOT_MOBILITY_INTENT.JUMP;
  return BOT_MOBILITY_INTENT.NONE;
}
