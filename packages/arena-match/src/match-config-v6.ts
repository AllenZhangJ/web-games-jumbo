import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_MATCH_CONFIG_V6_SCHEMA_VERSION = 6 as const;
export const ARENA_MATCH_CONFIG_V6_MINIMUM_PARTICIPANTS = 2 as const;
export const ARENA_MATCH_CONFIG_V6_MAXIMUM_PARTICIPANTS = 17 as const;

export const ARENA_MATCH_MODE_KIND_V6 = Object.freeze({
  DUEL: 'duel',
  RACE: 'race',
  SURVIVAL: 'survival',
} as const);

export const ARENA_MATCH_PARTICIPANT_ROLE_V2 = Object.freeze({
  COMPETITOR: 'competitor',
  PLAYER: 'player',
  ENEMY: 'enemy',
} as const);

export const ARENA_MATCH_CONTROLLER_KIND_V2 = Object.freeze({
  HUMAN: 'human',
  BOT: 'bot',
} as const);

export type ArenaMatchModeKindV6 =
  typeof ARENA_MATCH_MODE_KIND_V6[keyof typeof ARENA_MATCH_MODE_KIND_V6];
export type ArenaMatchParticipantRoleV2 =
  typeof ARENA_MATCH_PARTICIPANT_ROLE_V2[keyof typeof ARENA_MATCH_PARTICIPANT_ROLE_V2];
export type ArenaMatchControllerKindV2 =
  typeof ARENA_MATCH_CONTROLLER_KIND_V2[keyof typeof ARENA_MATCH_CONTROLLER_KIND_V2];

export interface ArenaMatchParticipantAssignmentV2 {
  readonly participantId: string;
  readonly modeRole: ArenaMatchParticipantRoleV2;
  readonly teamId: string | null;
  readonly controllerKind: ArenaMatchControllerKindV2;
  readonly characterDefinitionId: string;
  readonly slotId: string | null;
  readonly slotGeneration: number;
}

/**
 * P2.1a's production-unreachable V6 mode/roster envelope. Existing V5 gameplay
 * fields stay in their historical contract until the P2.2 migration; this
 * object deliberately has no defaults and cannot silently manufacture Duel.
 */
export interface ArenaMatchConfigV6 {
  readonly schemaVersion: typeof ARENA_MATCH_CONFIG_V6_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly modeKind: ArenaMatchModeKindV6;
  readonly modePolicyContentHash: string;
  readonly participantAssignments: readonly ArenaMatchParticipantAssignmentV2[];
}

const CONFIG_KEYS = new Set([
  'schemaVersion',
  'modeDefinitionId',
  'modeKind',
  'modePolicyContentHash',
  'participantAssignments',
]);
const ASSIGNMENT_KEYS = new Set([
  'participantId',
  'modeRole',
  'teamId',
  'controllerKind',
  'characterDefinitionId',
  'slotId',
  'slotGeneration',
]);
const MODE_KINDS: ReadonlySet<unknown> = new Set(Object.values(ARENA_MATCH_MODE_KIND_V6));
const PARTICIPANT_ROLES: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_MATCH_PARTICIPANT_ROLE_V2),
);
const CONTROLLER_KINDS: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_MATCH_CONTROLLER_KIND_V2),
);

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertExactKeys(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
}

function nullableId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function dataHash(value: unknown, name: string): string {
  const hash = assertNonEmptyString(value, name);
  if (!/^[0-9a-f]+$/u.test(hash)) throw new RangeError(`${name} 必须是小写十六进制数据 hash。`);
  return hash;
}

function cloneAssignment(value: unknown, index: number): ArenaMatchParticipantAssignmentV2 {
  const name = `ArenaMatchConfigV6.participantAssignments[${index}]`;
  assertExactKeys(value, ASSIGNMENT_KEYS, name);
  if (!PARTICIPANT_ROLES.has(value.modeRole)) {
    throw new RangeError(`${name}.modeRole 不受支持。`);
  }
  if (!CONTROLLER_KINDS.has(value.controllerKind)) {
    throw new RangeError(`${name}.controllerKind 不受支持。`);
  }
  const modeRole = value.modeRole as ArenaMatchParticipantRoleV2;
  const controllerKind = value.controllerKind as ArenaMatchControllerKindV2;
  const slotId = nullableId(value.slotId, `${name}.slotId`);
  const slotGeneration = assertIntegerAtLeast(
    value.slotGeneration,
    0,
    `${name}.slotGeneration`,
  );
  if (modeRole === ARENA_MATCH_PARTICIPANT_ROLE_V2.ENEMY) {
    if (controllerKind !== ARENA_MATCH_CONTROLLER_KIND_V2.BOT || slotId === null) {
      throw new RangeError(`${name} enemy 必须使用 bot controller 和显式 slotId。`);
    }
  } else if (slotId !== null || slotGeneration !== 0) {
    throw new RangeError(`${name} 非 enemy assignment 必须使用 slotId=null 与 slotGeneration=0。`);
  }

  return Object.freeze({
    participantId: assertNonEmptyString(value.participantId, `${name}.participantId`),
    modeRole,
    teamId: nullableId(value.teamId, `${name}.teamId`),
    controllerKind,
    characterDefinitionId: assertNonEmptyString(
      value.characterDefinitionId,
      `${name}.characterDefinitionId`,
    ),
    slotId,
    slotGeneration,
  });
}

function assertModeRoster(
  modeKind: ArenaMatchModeKindV6,
  assignments: readonly ArenaMatchParticipantAssignmentV2[],
): void {
  const competitors = assignments.filter(
    ({ modeRole }) => modeRole === ARENA_MATCH_PARTICIPANT_ROLE_V2.COMPETITOR,
  );
  const players = assignments.filter(
    ({ modeRole }) => modeRole === ARENA_MATCH_PARTICIPANT_ROLE_V2.PLAYER,
  );
  const enemies = assignments.filter(
    ({ modeRole }) => modeRole === ARENA_MATCH_PARTICIPANT_ROLE_V2.ENEMY,
  );
  if (modeKind === ARENA_MATCH_MODE_KIND_V6.DUEL) {
    if (assignments.length !== 2 || competitors.length !== 2) {
      throw new RangeError('Duel ArenaMatchConfigV6 必须恰好包含两个 competitor。');
    }
    return;
  }
  if (modeKind === ARENA_MATCH_MODE_KIND_V6.RACE) {
    if (
      assignments.length < 2
      || assignments.length > 4
      || competitors.length !== assignments.length
      || !competitors.some(({ controllerKind }) => (
        controllerKind === ARENA_MATCH_CONTROLLER_KIND_V2.HUMAN
      ))
    ) {
      throw new RangeError('Race ArenaMatchConfigV6 必须包含 2–4 个 competitor 且至少一个 human。');
    }
    return;
  }
  if (
    players.length !== 1
    || players[0]?.controllerKind !== ARENA_MATCH_CONTROLLER_KIND_V2.HUMAN
    || enemies.length < 1
    || players.length + enemies.length !== assignments.length
  ) {
    throw new RangeError('Survival ArenaMatchConfigV6 必须包含一个 human player 与有界 bot enemy。');
  }
}

export function createArenaMatchConfigV6(value: unknown): ArenaMatchConfigV6 {
  const source = cloneFrozenData(value, 'ArenaMatchConfigV6');
  assertExactKeys(source, CONFIG_KEYS, 'ArenaMatchConfigV6');
  if (source.schemaVersion !== ARENA_MATCH_CONFIG_V6_SCHEMA_VERSION) {
    throw new RangeError(
      `ArenaMatchConfigV6.schemaVersion 必须是 ${ARENA_MATCH_CONFIG_V6_SCHEMA_VERSION}。`,
    );
  }
  if (!MODE_KINDS.has(source.modeKind)) {
    throw new RangeError('ArenaMatchConfigV6.modeKind 不受支持。');
  }
  if (!Array.isArray(source.participantAssignments)) {
    throw new TypeError('ArenaMatchConfigV6.participantAssignments 必须是数组。');
  }
  if (
    source.participantAssignments.length < ARENA_MATCH_CONFIG_V6_MINIMUM_PARTICIPANTS
    || source.participantAssignments.length > ARENA_MATCH_CONFIG_V6_MAXIMUM_PARTICIPANTS
  ) {
    throw new RangeError(
      `ArenaMatchConfigV6 participant 数量必须在 ${ARENA_MATCH_CONFIG_V6_MINIMUM_PARTICIPANTS}–${ARENA_MATCH_CONFIG_V6_MAXIMUM_PARTICIPANTS}。`,
    );
  }
  const participantAssignments = source.participantAssignments
    .map(cloneAssignment)
    .sort((left, right) => compareText(left.participantId, right.participantId));
  const participantIds = participantAssignments.map(({ participantId }) => participantId);
  if (new Set(participantIds).size !== participantIds.length) {
    throw new RangeError('ArenaMatchConfigV6 participantId 必须唯一。');
  }
  const slotIds = participantAssignments.flatMap(({ slotId }) => slotId === null ? [] : [slotId]);
  if (new Set(slotIds).size !== slotIds.length) {
    throw new RangeError('ArenaMatchConfigV6 slotId 必须唯一。');
  }
  const modeKind = source.modeKind as ArenaMatchModeKindV6;
  assertModeRoster(modeKind, participantAssignments);
  return Object.freeze({
    schemaVersion: ARENA_MATCH_CONFIG_V6_SCHEMA_VERSION,
    modeDefinitionId: assertNonEmptyString(
      source.modeDefinitionId,
      'ArenaMatchConfigV6.modeDefinitionId',
    ),
    modeKind,
    modePolicyContentHash: dataHash(
      source.modePolicyContentHash,
      'ArenaMatchConfigV6.modePolicyContentHash',
    ),
    participantAssignments: Object.freeze(participantAssignments),
  });
}
