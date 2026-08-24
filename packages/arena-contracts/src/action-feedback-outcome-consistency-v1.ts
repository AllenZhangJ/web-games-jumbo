import {
  ARENA_MATCH_EVENT_V6,
  createArenaMatchEventV6,
  type ArenaMatchEventV6,
} from './match-event-v6.js';
import {
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND,
} from './weapon-feedback-semantic-v1.js';
import { cloneFrozenData } from './definition-utils.js';

interface ActionFeedbackOutcomeStateV1 {
  readonly startedSequence: number;
  sawEvaded: boolean;
  hitOutcomeCount: number;
}

function canonicalEvents(value: unknown): readonly ArenaMatchEventV6[] {
  const source = cloneFrozenData(value, 'Action feedback outcome consistency events');
  if (!Array.isArray(source)) {
    throw new TypeError('Action feedback outcome consistency events必须是数组。');
  }
  const ids = new Set<string>();
  let previousSequence = -1;
  let previousTick = -1;
  return Object.freeze(source.map((candidate, index) => {
    const event = createArenaMatchEventV6(candidate);
    if (ids.has(event.id)
      || event.sequence <= previousSequence
      || event.tick < previousTick) {
      throw new RangeError(
        `Action feedback outcome consistency events[${index}]身份、sequence或tick无效。`,
      );
    }
    ids.add(event.id);
    previousSequence = event.sequence;
    previousTick = event.tick;
    return event;
  }));
}

function actionIdentity(participantId: string, action: string, tick: number): string {
  return `${participantId}\u0000${action}\u0000${tick}`;
}

/**
 * Proves the minimum causal closure shared by Replay, Product Result and
 * Learning. One action may resolve multiple hit outcomes, but it cannot also
 * resolve attack-evaded; every attack-context feedback must follow its exact
 * participant/action/start-tick authority event. Lifecycle is validated by
 * the mode-specific eligibility guards and delayed hit outcomes stay legal.
 */
export function assertArenaV6ActionFeedbackOutcomeConsistencyV1(value: unknown): void {
  const events = canonicalEvents(value);
  const actionOutcomes = new Map<string, ActionFeedbackOutcomeStateV1>();

  for (const event of events) {
    if (event.type === ARENA_MATCH_EVENT_V6.ACTION_STARTED) {
      const identity = actionIdentity(event.participantId, event.action, event.tick);
      if (actionOutcomes.has(identity)) {
        throw new RangeError('Action feedback outcome同参与者、动作与tick的起手不能重复。');
      }
      actionOutcomes.set(identity, {
        startedSequence: event.sequence,
        sawEvaded: false,
        hitOutcomeCount: 0,
      });
      continue;
    }

    if (event.type !== ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED
      || event.kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.MOVEMENT_FALL) {
      continue;
    }

    const identity = actionIdentity(
      event.attackerId!,
      event.actionDefinitionId!,
      event.actionStartedTick!,
    );
    const outcome = actionOutcomes.get(identity);
    if (outcome === undefined || outcome.startedSequence >= event.sequence) {
      throw new RangeError(
        'Action feedback outcome缺少同攻击者、动作与起手tick的先行权威起手。',
      );
    }
    if (event.kind === ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND.ATTACK_EVADED) {
      if (outcome.sawEvaded || outcome.hitOutcomeCount !== 0) {
        throw new RangeError('同一权威动作的attack-evaded不能重复或与命中结果共存。');
      }
      outcome.sawEvaded = true;
      continue;
    }
    if (outcome.sawEvaded) {
      throw new RangeError('同一权威动作的命中结果不能晚于attack-evaded。');
    }
    outcome.hitOutcomeCount += 1;
  }
}
