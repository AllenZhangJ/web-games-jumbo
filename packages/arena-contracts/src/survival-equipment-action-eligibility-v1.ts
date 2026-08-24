import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from './definition-utils.js';
import {
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_EVENT_V6_ACTION_SOURCE,
  createArenaMatchEventV6,
  type ArenaMatchEventV6,
} from './match-event-v6.js';

/**
 * A narrow Replay V6 guard shared by Replay, Product Result and Learning.
 * It has no authority state or outcome policy: it only proves that a Survival
 * equipment action begins from the currently active player life or enemy-slot
 * generation represented by the event stream.
 */
export interface ArenaV6SurvivalEquipmentActionEligibilityParticipantV1 {
  readonly participantId: string;
  readonly modeRole: 'competitor' | 'player' | 'enemy';
  readonly slotId: string | null;
  readonly slotGeneration: number;
}

export interface AssertArenaV6SurvivalEquipmentActionEligibilityV1Options {
  readonly participants: readonly ArenaV6SurvivalEquipmentActionEligibilityParticipantV1[];
  readonly events: readonly ArenaMatchEventV6[];
}

const OPTION_KEYS = new Set(['participants', 'events']);
const PARTICIPANT_KEYS = new Set([
  'participantId', 'modeRole', 'slotId', 'slotGeneration',
]);

interface ParticipantLifecycle {
  readonly modeRole: 'player' | 'enemy';
  readonly slotId: string | null;
  generation: number;
  active: boolean;
  playerFallCount: number;
  playerFallTick: number | null;
  firstRespawnCompleted: boolean;
  playerRespawnSchedule: Readonly<{
    readyTick: number;
    anchorId: string;
  }> | null;
  enemyFallPending: boolean;
}

function requireKeys(value: PlainRecord, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少字段${key}。`);
  }
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is PlainRecord {
  assertKnownKeys(value, keys, name);
  requireKeys(value, keys, name);
}

function nullableId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function normalizeParticipants(value: unknown): ReadonlyMap<string, ParticipantLifecycle> {
  if (!Array.isArray(value) || value.length < 2 || value.length > 17) {
    throw new RangeError('Survival equipment action eligibility participants必须包含2-17项。');
  }
  const result = new Map<string, ParticipantLifecycle>();
  let playerCount = 0;
  for (const [index, candidate] of value.entries()) {
    const name = `Survival equipment action eligibility participants[${index}]`;
    exactRecord(candidate, PARTICIPANT_KEYS, name);
    const participantId = assertNonEmptyString(candidate.participantId, `${name}.participantId`);
    if (result.has(participantId)) {
      throw new RangeError('Survival equipment action eligibility participantId不能重复。');
    }
    if (candidate.modeRole !== 'player' && candidate.modeRole !== 'enemy') {
      throw new RangeError(`${name}.modeRole必须是player或enemy。`);
    }
    const slotId = nullableId(candidate.slotId, `${name}.slotId`);
    const slotGeneration = assertIntegerAtLeast(
      candidate.slotGeneration,
      0,
      `${name}.slotGeneration`,
    );
    if (candidate.modeRole === 'player') {
      if (slotId !== null || slotGeneration !== 0) {
        throw new RangeError(`${name} player必须使用null/0 slot身份。`);
      }
      playerCount += 1;
    } else if (slotId === null || slotGeneration < 1) {
      throw new RangeError(`${name} enemy必须携带slotId与正slotGeneration。`);
    }
    result.set(participantId, {
      modeRole: candidate.modeRole,
      slotId,
      generation: slotGeneration,
      active: candidate.modeRole === 'player',
      playerFallCount: 0,
      playerFallTick: null,
      firstRespawnCompleted: false,
      playerRespawnSchedule: null,
      enemyFallPending: false,
    });
  }
  if (playerCount !== 1) {
    throw new RangeError('Survival equipment action eligibility必须恰有一个player。');
  }
  return result;
}

function canonicalEvents(value: unknown): readonly ArenaMatchEventV6[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Survival equipment action eligibility events必须是数组。');
  }
  const eventIds = new Set<string>();
  let previousSequence = -1;
  return Object.freeze(value.map((candidate, index) => {
    const event = createArenaMatchEventV6(candidate);
    if (eventIds.has(event.id) || event.sequence <= previousSequence) {
      throw new RangeError(`Survival equipment action eligibility events[${index}]身份或sequence不连续。`);
    }
    eventIds.add(event.id);
    previousSequence = event.sequence;
    return event;
  }));
}

function lifecycleFor(
  lifecycles: ReadonlyMap<string, ParticipantLifecycle>,
  participantId: string,
  name: string,
): ParticipantLifecycle {
  const lifecycle = lifecycles.get(participantId);
  if (!lifecycle) throw new RangeError(`${name} participant不属于Survival assignment。`);
  return lifecycle;
}

/**
 * Rejects a complete or replayed Survival event sequence when an equipment
 * action is started while the participant is inactive. It deliberately does
 * not judge delayed feedback: MatchCore may retain an already-formed target
 * pending hit across an attacker fall until the outcome window closes.
 */
export function assertArenaV6SurvivalEquipmentActionEligibilityV1(value: unknown): void {
  const source = cloneFrozenData(value, 'Survival equipment action eligibility options');
  exactRecord(source, OPTION_KEYS, 'Survival equipment action eligibility options');
  const lifecycles = normalizeParticipants(source.participants);
  const events = canonicalEvents(source.events);

  for (const event of events) {
    if (event.type === ARENA_MATCH_EVENT_V6.ACTION_STARTED) {
      const lifecycle = lifecycleFor(
        lifecycles,
        event.participantId,
        'Survival ActionStarted',
      );
      if (event.sourceKind === ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT) {
        if (!lifecycle.active) {
          throw new RangeError('Survival equipment ActionStarted不能来自非active参与者。');
        }
      }
      continue;
    }

    if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL) {
      const lifecycle = lifecycleFor(lifecycles, event.participantId, 'Survival ParticipantFell');
      if (lifecycle.modeRole !== event.modeRole || !lifecycle.active) {
        throw new RangeError('Survival ParticipantFell必须来自当前active assignment。');
      }
      if (lifecycle.modeRole === 'enemy') {
        if (event.slotId !== lifecycle.slotId || event.slotGeneration !== lifecycle.generation) {
          throw new RangeError('Survival enemy ParticipantFell slot generation不闭合。');
        }
        lifecycle.enemyFallPending = true;
      } else {
        if (lifecycle.playerFallCount >= 2
          || (lifecycle.playerFallCount === 1 && !lifecycle.firstRespawnCompleted)) {
          throw new RangeError('Survival player ParticipantFell不能跳过唯一首次复活生命周期。');
        }
        lifecycle.playerFallCount += 1;
        lifecycle.playerFallTick = event.tick;
      }
      lifecycle.active = false;
      continue;
    }

    if (event.type === ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED) {
      const lifecycle = lifecycleFor(
        lifecycles,
        event.participantId,
        'SurvivalEnemySlotChanged',
      );
      if (lifecycle.modeRole !== 'enemy'
        || lifecycle.slotId !== event.slotId
        || lifecycle.generation !== event.previousGeneration) {
        throw new RangeError('Survival enemy slot change与当前generation不闭合。');
      }
      if (event.active) {
        if (lifecycle.active || lifecycle.enemyFallPending
          || event.generation !== event.previousGeneration + 1) {
          throw new RangeError('Survival enemy activation与退役generation不闭合。');
        }
      } else if (lifecycle.active
        || !lifecycle.enemyFallPending
        || event.generation !== event.previousGeneration) {
        throw new RangeError('Survival enemy deactivation必须闭合当前掉落。');
      }
      lifecycle.generation = event.generation;
      lifecycle.active = event.active;
      lifecycle.enemyFallPending = false;
      continue;
    }

    if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED) {
      const lifecycle = lifecycleFor(
        lifecycles,
        event.participantId,
        'Survival ParticipantRespawnScheduled',
      );
      if (lifecycle.modeRole !== 'player'
        || event.modeRole !== 'player'
        || lifecycle.active
        || lifecycle.playerFallCount !== 1
        || lifecycle.playerFallTick !== event.tick
        || lifecycle.firstRespawnCompleted
        || lifecycle.playerRespawnSchedule !== null
        || event.readyTick <= event.tick) {
        throw new RangeError('Survival player respawn schedule必须闭合当前掉落。');
      }
      lifecycle.playerRespawnSchedule = Object.freeze({
        readyTick: event.readyTick,
        anchorId: event.anchorId,
      });
      continue;
    }

    if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED) {
      const lifecycle = lifecycleFor(lifecycles, event.participantId, 'Survival ParticipantRespawned');
      if (lifecycle.modeRole !== 'player'
        || event.modeRole !== 'player'
        || lifecycle.active
        || lifecycle.playerFallCount !== 1
        || lifecycle.firstRespawnCompleted
        || lifecycle.playerRespawnSchedule === null
        || event.tick !== lifecycle.playerRespawnSchedule.readyTick
        || event.anchorId !== lifecycle.playerRespawnSchedule.anchorId) {
        throw new RangeError('Survival player respawn必须闭合已安排的掉落。');
      }
      lifecycle.active = true;
      lifecycle.playerFallTick = null;
      lifecycle.firstRespawnCompleted = true;
      lifecycle.playerRespawnSchedule = null;
      continue;
    }

  }
}
