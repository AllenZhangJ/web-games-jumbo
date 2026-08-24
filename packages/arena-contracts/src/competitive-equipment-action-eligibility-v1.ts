import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from './definition-utils.js';
import {
  RACE_MODE_RESPAWN_DELAY_TICKS_V1,
} from './arena-mode-rule-constants-v1.js';
import {
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_EVENT_V6_ACTION_SOURCE,
  ARENA_MATCH_EVENT_V6_RESPAWN_REASON,
  createArenaMatchEventV6,
  type ArenaMatchEventV6,
} from './match-event-v6.js';

export interface ArenaV6CompetitiveEquipmentActionEligibilityParticipantV1 {
  readonly participantId: string;
  readonly modeRole: 'competitor' | 'player' | 'enemy';
  readonly slotId: string | null;
  readonly slotGeneration: number;
}

export interface AssertArenaV6CompetitiveEquipmentActionEligibilityV1Options {
  readonly modeKind: 'duel' | 'race';
  readonly participants: readonly ArenaV6CompetitiveEquipmentActionEligibilityParticipantV1[];
  readonly events: readonly ArenaMatchEventV6[];
}

const OPTION_KEYS = new Set(['modeKind', 'participants', 'events']);
const PARTICIPANT_KEYS = new Set([
  'participantId', 'modeRole', 'slotId', 'slotGeneration',
]);

interface CompetitiveLifecycle {
  active: boolean;
  finished: boolean;
  fallTick: number | null;
  respawnSchedule: Readonly<{
    readyTick: number;
    anchorId: string;
  }> | null;
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

function normalizeParticipants(
  value: unknown,
  modeKind: 'duel' | 'race',
): ReadonlyMap<string, CompetitiveLifecycle> {
  const maximum = modeKind === 'duel' ? 2 : 4;
  if (!Array.isArray(value) || value.length < 2 || value.length > maximum) {
    throw new RangeError(`Competitive equipment action eligibility ${modeKind} participants数量无效。`);
  }
  if (modeKind === 'duel' && value.length !== 2) {
    throw new RangeError('Competitive equipment action eligibility Duel必须恰有2名参与者。');
  }
  const result = new Map<string, CompetitiveLifecycle>();
  value.forEach((candidate, index) => {
    const name = `Competitive equipment action eligibility participants[${index}]`;
    exactRecord(candidate, PARTICIPANT_KEYS, name);
    const participantId = assertNonEmptyString(candidate.participantId, `${name}.participantId`);
    if (result.has(participantId)) {
      throw new RangeError('Competitive equipment action eligibility participantId不能重复。');
    }
    if (candidate.modeRole !== 'competitor'
      || candidate.slotId !== null
      || assertIntegerAtLeast(candidate.slotGeneration, 0, `${name}.slotGeneration`) !== 0) {
      throw new RangeError(`${name}必须使用competitor/null/0身份。`);
    }
    result.set(participantId, {
      active: true,
      finished: false,
      fallTick: null,
      respawnSchedule: null,
    });
  });
  return result;
}

function canonicalEvents(value: unknown): readonly ArenaMatchEventV6[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Competitive equipment action eligibility events必须是数组。');
  }
  const ids = new Set<string>();
  let previousSequence = -1;
  let previousTick = -1;
  return Object.freeze(value.map((candidate, index) => {
    const event = createArenaMatchEventV6(candidate);
    if (ids.has(event.id)
      || event.sequence <= previousSequence
      || event.tick < previousTick) {
      throw new RangeError(
        `Competitive equipment action eligibility events[${index}]身份、sequence或tick无效。`,
      );
    }
    ids.add(event.id);
    previousSequence = event.sequence;
    previousTick = event.tick;
    return event;
  }));
}

function lifecycleFor(
  lifecycles: ReadonlyMap<string, CompetitiveLifecycle>,
  participantId: string,
  name: string,
): CompetitiveLifecycle {
  const lifecycle = lifecycles.get(participantId);
  if (!lifecycle) throw new RangeError(`${name} participant不属于competitive assignment。`);
  return lifecycle;
}

/**
 * Proves only the Duel/Race participant lifecycle at equipment-action start.
 * It does not re-evaluate hit outcomes: a pending hit formed while the attacker
 * was active may still resolve after a fall, finish or later respawn.
 */
export function assertArenaV6CompetitiveEquipmentActionEligibilityV1(value: unknown): void {
  const source = cloneFrozenData(value, 'Competitive equipment action eligibility options');
  exactRecord(source, OPTION_KEYS, 'Competitive equipment action eligibility options');
  if (source.modeKind !== 'duel' && source.modeKind !== 'race') {
    throw new RangeError('Competitive equipment action eligibility modeKind必须是duel或race。');
  }
  const modeKind = source.modeKind;
  const lifecycles = normalizeParticipants(source.participants, modeKind);
  const events = canonicalEvents(source.events);

  for (const event of events) {
    if (event.type === ARENA_MATCH_EVENT_V6.ACTION_STARTED) {
      const lifecycle = lifecycleFor(
        lifecycles,
        event.participantId,
        'Competitive ActionStarted',
      );
      if (event.sourceKind === ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT
        && !lifecycle.active) {
        throw new RangeError('Competitive equipment ActionStarted不能来自非active参与者。');
      }
      continue;
    }

    if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL
      && event.modeRole === 'competitor') {
      const lifecycle = lifecycleFor(
        lifecycles,
        event.participantId,
        'Competitive ParticipantFell',
      );
      if (!lifecycle.active
        || lifecycle.finished
        || lifecycle.fallTick !== null
        || lifecycle.respawnSchedule !== null
        || event.slotId !== null
        || event.slotGeneration !== 0) {
        throw new RangeError('Competitive ParticipantFell必须来自当前active参与者。');
      }
      lifecycle.active = false;
      lifecycle.fallTick = event.tick;
      continue;
    }

    if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED
      && event.modeRole === 'competitor') {
      if (modeKind !== 'race') {
        throw new RangeError('Duel不能包含competitor respawn schedule。');
      }
      const lifecycle = lifecycleFor(
        lifecycles,
        event.participantId,
        'Race ParticipantRespawnScheduled',
      );
      if (lifecycle.active
        || lifecycle.finished
        || lifecycle.fallTick !== event.tick
        || lifecycle.respawnSchedule !== null
        || event.slotId !== null
        || event.slotGeneration !== 0
        || event.reason !== ARENA_MATCH_EVENT_V6_RESPAWN_REASON.RACE_FALL
        || event.readyTick !== event.tick + RACE_MODE_RESPAWN_DELAY_TICKS_V1) {
        throw new RangeError('Race respawn schedule必须闭合当前掉落与固定延迟。');
      }
      lifecycle.respawnSchedule = Object.freeze({
        readyTick: event.readyTick,
        anchorId: event.anchorId,
      });
      continue;
    }

    if (event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED
      && event.modeRole === 'competitor') {
      if (modeKind !== 'race') {
        throw new RangeError('Duel不能包含competitor respawn。');
      }
      const lifecycle = lifecycleFor(
        lifecycles,
        event.participantId,
        'Race ParticipantRespawned',
      );
      if (lifecycle.active
        || lifecycle.finished
        || lifecycle.fallTick === null
        || lifecycle.respawnSchedule === null
        || event.tick !== lifecycle.respawnSchedule.readyTick
        || event.anchorId !== lifecycle.respawnSchedule.anchorId
        || event.slotId !== null
        || event.slotGeneration !== 0) {
        throw new RangeError('Race respawn必须闭合已安排的掉落。');
      }
      lifecycle.active = true;
      lifecycle.fallTick = null;
      lifecycle.respawnSchedule = null;
      continue;
    }

    if (event.type === ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED) {
      if (modeKind !== 'race') {
        throw new RangeError('Duel不能包含RaceFinishClaimed。');
      }
      const lifecycle = lifecycleFor(
        lifecycles,
        event.participantId,
        'RaceFinishClaimed',
      );
      if (!lifecycle.active
        || lifecycle.finished
        || lifecycle.fallTick !== null
        || lifecycle.respawnSchedule !== null) {
        throw new RangeError('RaceFinishClaimed必须来自当前active未完成参与者。');
      }
      lifecycle.active = false;
      lifecycle.finished = true;
    }
  }
}
