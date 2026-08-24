export const ARENA_ACTION_PHASE = Object.freeze({
  IDLE: 'idle',
  WINDUP: 'windup',
  ACTIVE: 'active',
  RECOVERY: 'recovery',
} as const);

export type ArenaActionPhase =
  typeof ARENA_ACTION_PHASE[keyof typeof ARENA_ACTION_PHASE];

export const ARENA_MATCH_PHASE = Object.freeze({
  PREPARING: 'preparing',
  RUNNING: 'running',
  SUDDEN_DEATH: 'sudden-death',
  ENDED: 'ended',
} as const);

export type ArenaMatchPhase =
  typeof ARENA_MATCH_PHASE[keyof typeof ARENA_MATCH_PHASE];

export const ARENA_PARTICIPANT_STATUS = Object.freeze({
  ACTIVE: 'active',
  RESPAWNING: 'respawning',
  ELIMINATED: 'eliminated',
} as const);

export type ArenaParticipantStatus =
  typeof ARENA_PARTICIPANT_STATUS[keyof typeof ARENA_PARTICIPANT_STATUS];

const ACTION_PHASE_VALUES: ReadonlySet<string> = new Set(
  Object.values(ARENA_ACTION_PHASE),
);
const MATCH_PHASE_VALUES: ReadonlySet<string> = new Set(
  Object.values(ARENA_MATCH_PHASE),
);
const PARTICIPANT_STATUS_VALUES: ReadonlySet<string> = new Set(
  Object.values(ARENA_PARTICIPANT_STATUS),
);

function assertAuthorityEnum<T extends string>(
  value: unknown,
  values: ReadonlySet<string>,
  name: string,
): T {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} 必须是字符串。`);
  }
  if (!values.has(value)) {
    throw new RangeError(`${name} 不在权威枚举集合中。`);
  }
  return value as T;
}

export function assertArenaActionPhase(
  value: unknown,
  name: string,
): ArenaActionPhase {
  return assertAuthorityEnum<ArenaActionPhase>(value, ACTION_PHASE_VALUES, name);
}

export function assertArenaMatchPhase(
  value: unknown,
  name: string,
): ArenaMatchPhase {
  return assertAuthorityEnum<ArenaMatchPhase>(value, MATCH_PHASE_VALUES, name);
}

export function assertArenaParticipantStatus(
  value: unknown,
  name: string,
): ArenaParticipantStatus {
  return assertAuthorityEnum<ArenaParticipantStatus>(value, PARTICIPANT_STATUS_VALUES, name);
}
