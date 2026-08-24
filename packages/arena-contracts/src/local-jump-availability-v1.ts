import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from './definition-utils.js';

export const ARENA_LOCAL_JUMP_AVAILABILITY_V1_SCHEMA_VERSION = 1 as const;

export type ArenaLocalJumpAvailabilityStateV1 = 'ready' | 'blocked';

export interface ArenaLocalJumpAvailabilityV1 {
  readonly schemaVersion: typeof ARENA_LOCAL_JUMP_AVAILABILITY_V1_SCHEMA_VERSION;
  readonly tick: number;
  readonly eventSequence: number;
  readonly participantId: string;
  readonly canMove: boolean;
  readonly canGroundJump: boolean;
  readonly canAirJump: boolean;
  readonly state: ArenaLocalJumpAvailabilityStateV1;
}

const KEYS = new Set([
  'schemaVersion',
  'tick',
  'eventSequence',
  'participantId',
  'canMove',
  'canGroundJump',
  'canAirJump',
  'state',
]);

function booleanField(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name}必须是boolean。`);
  return value;
}

/**
 * Versioned read-only projection of the authoritative Movement capability.
 * It deliberately does not derive capability from Presentation snapshots.
 */
export function createArenaLocalJumpAvailabilityV1(
  value: unknown,
): ArenaLocalJumpAvailabilityV1 {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'ArenaLocalJumpAvailabilityV1'),
    'ArenaLocalJumpAvailabilityV1',
  );
  assertKnownKeys(source, KEYS, 'ArenaLocalJumpAvailabilityV1');
  for (const key of KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`ArenaLocalJumpAvailabilityV1缺少${key}。`);
    }
  }
  if (source.schemaVersion !== ARENA_LOCAL_JUMP_AVAILABILITY_V1_SCHEMA_VERSION) {
    throw new RangeError('ArenaLocalJumpAvailabilityV1.schemaVersion必须是1。');
  }
  const tick = assertIntegerAtLeast(source.tick, 0, 'ArenaLocalJumpAvailabilityV1.tick');
  const eventSequence = assertIntegerAtLeast(
    source.eventSequence,
    0,
    'ArenaLocalJumpAvailabilityV1.eventSequence',
  );
  const participantId = assertNonEmptyString(
    source.participantId,
    'ArenaLocalJumpAvailabilityV1.participantId',
  );
  const canMove = booleanField(source.canMove, 'ArenaLocalJumpAvailabilityV1.canMove');
  const canGroundJump = booleanField(
    source.canGroundJump,
    'ArenaLocalJumpAvailabilityV1.canGroundJump',
  );
  const canAirJump = booleanField(
    source.canAirJump,
    'ArenaLocalJumpAvailabilityV1.canAirJump',
  );
  if (!canMove && (canGroundJump || canAirJump)) {
    throw new RangeError('ArenaLocalJumpAvailabilityV1不可在canMove=false时允许跳跃。');
  }
  if (canGroundJump && canAirJump) {
    throw new RangeError('ArenaLocalJumpAvailabilityV1地面跳与空中跳不可同时可用。');
  }
  const state = canGroundJump || canAirJump ? 'ready' : 'blocked';
  if (source.state !== state) {
    throw new RangeError('ArenaLocalJumpAvailabilityV1.state与权威能力不一致。');
  }
  return Object.freeze({
    schemaVersion: ARENA_LOCAL_JUMP_AVAILABILITY_V1_SCHEMA_VERSION,
    tick,
    eventSequence,
    participantId,
    canMove,
    canGroundJump,
    canAirJump,
    state,
  });
}
