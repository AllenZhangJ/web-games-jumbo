import {
  createMatchContentPublicViewV2,
  type MatchContentSelectionV2,
} from './match-content-selection-v2.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type DeepReadonly,
  type PlainRecord,
} from './definition-utils.js';
import { createDeterministicDataHash } from './deterministic-data-hash.js';

export const MATCH_PARTICIPANT_ASSIGNMENT_V2_SCHEMA_VERSION = 2 as const;

export const MATCH_ASSIGNMENT_CONTROLLER_KIND = Object.freeze({
  HUMAN: 'human',
  BOT: 'bot',
} as const);

export const MATCH_ASSIGNMENT_MODE_ROLE = Object.freeze({
  COMPETITOR: 'competitor',
  PLAYER: 'player',
  ENEMY: 'enemy',
} as const);

export type MatchAssignmentControllerKind =
  typeof MATCH_ASSIGNMENT_CONTROLLER_KIND[keyof typeof MATCH_ASSIGNMENT_CONTROLLER_KIND];
export type MatchAssignmentModeRole =
  typeof MATCH_ASSIGNMENT_MODE_ROLE[keyof typeof MATCH_ASSIGNMENT_MODE_ROLE];

export interface MatchRosterParticipantV2 {
  readonly participantId: string;
  readonly modeRole: MatchAssignmentModeRole;
  readonly teamId: string | null;
  readonly controllerKind: MatchAssignmentControllerKind;
  readonly slotId: string | null;
  readonly slotGeneration: number;
}

export interface MatchRosterAssignmentV2 {
  readonly schemaVersion: typeof MATCH_PARTICIPANT_ASSIGNMENT_V2_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly participants: readonly MatchRosterParticipantV2[];
  readonly rosterHash: string;
}

export interface MatchParticipantAssignmentV2 extends MatchRosterParticipantV2 {
  readonly characterDefinitionId: string;
}

export interface FinalizedMatchAssignmentV2 {
  readonly schemaVersion: typeof MATCH_PARTICIPANT_ASSIGNMENT_V2_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly contentHash: string;
  readonly participants: readonly MatchParticipantAssignmentV2[];
  readonly assignmentHash: string;
}

const ROSTER_KEYS = new Set(['schemaVersion', 'modeDefinitionId', 'participants', 'rosterHash']);
const ROSTER_PARTICIPANT_KEYS = new Set([
  'participantId', 'modeRole', 'teamId', 'controllerKind', 'slotId', 'slotGeneration',
]);
const FINALIZED_KEYS = new Set([
  'schemaVersion', 'modeDefinitionId', 'contentHash', 'participants', 'assignmentHash',
]);
const FINALIZED_PARTICIPANT_KEYS = new Set([
  ...ROSTER_PARTICIPANT_KEYS,
  'characterDefinitionId',
]);
const FINALIZE_OPTIONS_KEYS = new Set(['roster', 'content']);
const ROLES: ReadonlySet<unknown> = new Set(Object.values(MATCH_ASSIGNMENT_MODE_ROLE));
const CONTROLLERS: ReadonlySet<unknown> = new Set(
  Object.values(MATCH_ASSIGNMENT_CONTROLLER_KIND),
);

function requireKeys(value: PlainRecord, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name} 缺少字段 ${key}。`);
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

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError(`${name} 必须是8位小写十六进制hash。`);
  }
  return value;
}

function createRosterParticipants(
  value: unknown,
  keys: ReadonlySet<string>,
  finalized: boolean,
): readonly (MatchRosterParticipantV2 | MatchParticipantAssignmentV2)[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 17) {
    throw new RangeError('Match assignment participants必须包含2-17项。');
  }
  const participants = value.map((candidate, index) => {
    const name = `Match assignment participants[${index}]`;
    exactRecord(candidate, keys, name);
    if (!ROLES.has(candidate.modeRole)) throw new RangeError(`${name}.modeRole不受支持。`);
    if (!CONTROLLERS.has(candidate.controllerKind)) {
      throw new RangeError(`${name}.controllerKind不受支持。`);
    }
    const modeRole = candidate.modeRole as MatchAssignmentModeRole;
    const slotId = nullableId(candidate.slotId, `${name}.slotId`);
    const slotGeneration = assertIntegerAtLeast(
      candidate.slotGeneration,
      0,
      `${name}.slotGeneration`,
    );
    if (modeRole === MATCH_ASSIGNMENT_MODE_ROLE.ENEMY) {
      if (slotId === null || slotGeneration < 1
        || candidate.controllerKind !== MATCH_ASSIGNMENT_CONTROLLER_KIND.BOT) {
        throw new RangeError(`${name} enemy必须是Bot并携带slotId/正generation。`);
      }
    } else if (slotId !== null || slotGeneration !== 0) {
      throw new RangeError(`${name} 非enemy的slotId/generation必须为null/0。`);
    }
    const common = {
      participantId: assertNonEmptyString(candidate.participantId, `${name}.participantId`),
      modeRole,
      teamId: nullableId(candidate.teamId, `${name}.teamId`),
      controllerKind: candidate.controllerKind as MatchAssignmentControllerKind,
      slotId,
      slotGeneration,
    };
    return Object.freeze(finalized ? {
      ...common,
      characterDefinitionId: assertNonEmptyString(
        candidate.characterDefinitionId,
        `${name}.characterDefinitionId`,
      ),
    } : common);
  });
  const participantIds = participants.map(({ participantId }) => participantId);
  for (let index = 1; index < participantIds.length; index += 1) {
    if (participantIds[index - 1]! >= participantIds[index]!) {
      throw new RangeError('Match assignment participants必须按participantId唯一稳定升序。');
    }
  }
  const enemySlots = participants
    .filter(({ modeRole }) => modeRole === MATCH_ASSIGNMENT_MODE_ROLE.ENEMY)
    .map(({ slotId }) => slotId!);
  if (new Set(enemySlots).size !== enemySlots.length) {
    throw new RangeError('Match assignment enemy slotId不能重复。');
  }
  return Object.freeze(participants);
}

function normalizeRoster(value: PlainRecord) {
  if (value.schemaVersion !== MATCH_PARTICIPANT_ASSIGNMENT_V2_SCHEMA_VERSION) {
    throw new RangeError('MatchRosterAssignmentV2.schemaVersion必须是2。');
  }
  return Object.freeze({
    schemaVersion: MATCH_PARTICIPANT_ASSIGNMENT_V2_SCHEMA_VERSION,
    modeDefinitionId: assertNonEmptyString(
      value.modeDefinitionId,
      'MatchRosterAssignmentV2.modeDefinitionId',
    ),
    participants: createRosterParticipants(
      value.participants,
      ROSTER_PARTICIPANT_KEYS,
      false,
    ) as readonly MatchRosterParticipantV2[],
  });
}

export function createMatchRosterAssignmentV2(
  value: unknown,
): DeepReadonly<MatchRosterAssignmentV2> {
  const source = cloneFrozenData(value, 'MatchRosterAssignmentV2 create options');
  assertKnownKeys(source, ROSTER_KEYS, 'MatchRosterAssignmentV2 create options');
  for (const key of ['schemaVersion', 'modeDefinitionId', 'participants']) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`MatchRosterAssignmentV2 create options缺少字段 ${key}。`);
    }
  }
  const payload = normalizeRoster(source);
  const rosterHash = createDeterministicDataHash(payload, 'MatchRosterAssignmentV2');
  if (source.rosterHash !== undefined
    && hash(source.rosterHash, 'MatchRosterAssignmentV2.rosterHash') !== rosterHash) {
    throw new RangeError('MatchRosterAssignmentV2.rosterHash不一致。');
  }
  return Object.freeze({ ...payload, rosterHash });
}

export function validateMatchRosterAssignmentV2(
  value: unknown,
): DeepReadonly<MatchRosterAssignmentV2> {
  const source = cloneFrozenData(value, 'MatchRosterAssignmentV2');
  exactRecord(source, ROSTER_KEYS, 'MatchRosterAssignmentV2');
  return createMatchRosterAssignmentV2(source);
}

function normalizeFinalized(value: PlainRecord) {
  if (value.schemaVersion !== MATCH_PARTICIPANT_ASSIGNMENT_V2_SCHEMA_VERSION) {
    throw new RangeError('FinalizedMatchAssignmentV2.schemaVersion必须是2。');
  }
  return Object.freeze({
    schemaVersion: MATCH_PARTICIPANT_ASSIGNMENT_V2_SCHEMA_VERSION,
    modeDefinitionId: assertNonEmptyString(
      value.modeDefinitionId,
      'FinalizedMatchAssignmentV2.modeDefinitionId',
    ),
    contentHash: hash(value.contentHash, 'FinalizedMatchAssignmentV2.contentHash'),
    participants: createRosterParticipants(
      value.participants,
      FINALIZED_PARTICIPANT_KEYS,
      true,
    ) as readonly MatchParticipantAssignmentV2[],
  });
}

export function createFinalizedMatchAssignmentV2(
  value: unknown,
): DeepReadonly<FinalizedMatchAssignmentV2> {
  const source = cloneFrozenData(value, 'FinalizedMatchAssignmentV2 create options');
  assertKnownKeys(source, FINALIZED_KEYS, 'FinalizedMatchAssignmentV2 create options');
  for (const key of ['schemaVersion', 'modeDefinitionId', 'contentHash', 'participants']) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`FinalizedMatchAssignmentV2 create options缺少字段 ${key}。`);
    }
  }
  const payload = normalizeFinalized(source);
  const assignmentHash = createDeterministicDataHash(payload, 'FinalizedMatchAssignmentV2');
  if (source.assignmentHash !== undefined
    && hash(source.assignmentHash, 'FinalizedMatchAssignmentV2.assignmentHash') !== assignmentHash) {
    throw new RangeError('FinalizedMatchAssignmentV2.assignmentHash不一致。');
  }
  return Object.freeze({ ...payload, assignmentHash });
}

export function validateFinalizedMatchAssignmentV2(
  value: unknown,
): DeepReadonly<FinalizedMatchAssignmentV2> {
  const source = cloneFrozenData(value, 'FinalizedMatchAssignmentV2');
  exactRecord(source, FINALIZED_KEYS, 'FinalizedMatchAssignmentV2');
  return createFinalizedMatchAssignmentV2(source);
}

export function finalizeMatchParticipantAssignmentV2(
  value: unknown,
): DeepReadonly<FinalizedMatchAssignmentV2> {
  const source = cloneFrozenData(value, 'finalizeMatchParticipantAssignmentV2 options');
  exactRecord(source, FINALIZE_OPTIONS_KEYS, 'finalizeMatchParticipantAssignmentV2 options');
  const roster = validateMatchRosterAssignmentV2(source.roster);
  const content: DeepReadonly<MatchContentSelectionV2> = createMatchContentPublicViewV2(
    source.content,
  );
  if (roster.modeDefinitionId !== content.modeDefinitionId) {
    throw new RangeError('roster/content modeDefinitionId不一致。');
  }
  if (roster.participants.length !== content.participantCharacters.length) {
    throw new RangeError('roster/content participant数量不一致。');
  }
  return createFinalizedMatchAssignmentV2({
    schemaVersion: MATCH_PARTICIPANT_ASSIGNMENT_V2_SCHEMA_VERSION,
    modeDefinitionId: roster.modeDefinitionId,
    contentHash: content.contentHash,
    participants: roster.participants.map((participant, index) => {
      const selected = content.participantCharacters[index];
      if (!selected || selected.participantId !== participant.participantId) {
        throw new RangeError('roster/content participant集合或顺序不一致。');
      }
      return {
        ...participant,
        characterDefinitionId: selected.definitionId,
      };
    }),
  });
}
