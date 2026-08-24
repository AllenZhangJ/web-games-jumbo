import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  validateFinalizedMatchAssignmentV2,
  type DeepReadonly,
  type FinalizedMatchAssignmentV2,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';

export const PRODUCT_MODE_ROLE = Object.freeze({
  COMPETITOR: 'competitor',
  PLAYER: 'player',
  ENEMY: 'enemy',
} as const);

export type ProductModeRole = typeof PRODUCT_MODE_ROLE[keyof typeof PRODUCT_MODE_ROLE];

export interface ProductParticipantAssignmentV2 {
  readonly participantId: string;
  readonly modeRole: ProductModeRole;
  readonly teamId: string | null;
  readonly slotId: string | null;
  readonly slotGeneration: number;
}

export interface ProductPublicParticipantV2 {
  readonly participantId: string;
  readonly displayName: string;
  readonly portraitKey: string;
  readonly appearanceKey: string;
  readonly identityOrdinal: number;
  readonly identityGlyphKey: string;
  readonly identityPatternKey: string;
}

const ASSIGNMENT_KEYS = new Set([
  'participantId', 'modeRole', 'teamId', 'slotId', 'slotGeneration',
]);
const PUBLIC_PARTICIPANT_KEYS = new Set([
  'participantId', 'displayName', 'portraitKey', 'appearanceKey', 'identityOrdinal',
  'identityGlyphKey', 'identityPatternKey',
]);
const MODE_ROLES: ReadonlySet<unknown> = new Set(Object.values(PRODUCT_MODE_ROLE));

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

function assertCanonicalIds(values: readonly string[], name: string): void {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1]! >= values[index]!) {
      throw new RangeError(`${name} 必须唯一且按participantId稳定升序。`);
    }
  }
}

export function createProductParticipantAssignmentsV2(
  value: unknown,
): DeepReadonly<readonly ProductParticipantAssignmentV2[]> {
  const source = cloneFrozenData(value, 'ProductParticipantAssignmentsV2');
  if (!Array.isArray(source) || source.length < 2 || source.length > 17) {
    throw new RangeError('ProductParticipantAssignmentsV2 必须包含2-17项。');
  }
  const assignments = source.map((candidate, index) => {
    const name = `ProductParticipantAssignmentsV2[${index}]`;
    exactRecord(candidate, ASSIGNMENT_KEYS, name);
    if (!MODE_ROLES.has(candidate.modeRole)) {
      throw new RangeError(`${name}.modeRole 不受支持。`);
    }
    const modeRole = candidate.modeRole as ProductModeRole;
    const slotId = nullableId(candidate.slotId, `${name}.slotId`);
    const slotGeneration = assertIntegerAtLeast(
      candidate.slotGeneration,
      0,
      `${name}.slotGeneration`,
    );
    if (modeRole === PRODUCT_MODE_ROLE.ENEMY) {
      if (slotId === null || slotGeneration < 1) {
        throw new RangeError(`${name} enemy必须携带slotId和正slotGeneration。`);
      }
    } else if (slotId !== null || slotGeneration !== 0) {
      throw new RangeError(`${name} 非enemy的slotId/slotGeneration必须为null/0。`);
    }
    return Object.freeze({
      participantId: assertNonEmptyString(candidate.participantId, `${name}.participantId`),
      modeRole,
      teamId: nullableId(candidate.teamId, `${name}.teamId`),
      slotId,
      slotGeneration,
    });
  });
  assertCanonicalIds(
    assignments.map(({ participantId }) => participantId),
    'ProductParticipantAssignmentsV2',
  );
  const enemySlotIds = assignments
    .filter(({ modeRole }) => modeRole === PRODUCT_MODE_ROLE.ENEMY)
    .map(({ slotId }) => slotId!);
  if (new Set(enemySlotIds).size !== enemySlotIds.length) {
    throw new RangeError('ProductParticipantAssignmentsV2 enemy slotId 不能重复。');
  }
  return Object.freeze(assignments);
}

export function projectProductParticipantAssignmentsV2(
  value: unknown,
): DeepReadonly<readonly ProductParticipantAssignmentV2[]> {
  const assignment: DeepReadonly<FinalizedMatchAssignmentV2> =
    validateFinalizedMatchAssignmentV2(value);
  return createProductParticipantAssignmentsV2(
    assignment.participants.map((participant) => ({
      participantId: participant.participantId,
      modeRole: participant.modeRole,
      teamId: participant.teamId,
      slotId: participant.slotId,
      slotGeneration: participant.slotGeneration,
    })),
  );
}

export function createProductPublicParticipantsV2(
  value: unknown,
  assignmentsValue: unknown,
): DeepReadonly<readonly ProductPublicParticipantV2[]> {
  const assignments = createProductParticipantAssignmentsV2(assignmentsValue);
  const source = cloneFrozenData(value, 'ProductPublicParticipantsV2');
  if (!Array.isArray(source) || source.length !== assignments.length) {
    throw new RangeError('ProductPublicParticipantsV2 必须与assignment数量一致。');
  }
  const participants = source.map((candidate, index) => {
    const name = `ProductPublicParticipantsV2[${index}]`;
    exactRecord(candidate, PUBLIC_PARTICIPANT_KEYS, name);
    return Object.freeze({
      participantId: assertNonEmptyString(candidate.participantId, `${name}.participantId`),
      displayName: assertNonEmptyString(candidate.displayName, `${name}.displayName`),
      portraitKey: assertNonEmptyString(candidate.portraitKey, `${name}.portraitKey`),
      appearanceKey: assertNonEmptyString(candidate.appearanceKey, `${name}.appearanceKey`),
      identityOrdinal: assertIntegerAtLeast(
        candidate.identityOrdinal,
        1,
        `${name}.identityOrdinal`,
      ),
      identityGlyphKey: assertNonEmptyString(
        candidate.identityGlyphKey,
        `${name}.identityGlyphKey`,
      ),
      identityPatternKey: assertNonEmptyString(
        candidate.identityPatternKey,
        `${name}.identityPatternKey`,
      ),
    });
  });
  const participantIds = participants.map(({ participantId }) => participantId);
  assertCanonicalIds(participantIds, 'ProductPublicParticipantsV2');
  if (participantIds.some((id, index) => id !== assignments[index]!.participantId)) {
    throw new RangeError('ProductPublicParticipantsV2 participant集合与assignment不一致。');
  }
  const ordinals = participants.map(({ identityOrdinal }) => identityOrdinal);
  if (
    new Set(ordinals).size !== ordinals.length
    || [...ordinals].sort((left, right) => left - right)
      .some((ordinal, index) => ordinal !== index + 1)
  ) {
    throw new RangeError('ProductPublicParticipantsV2 identityOrdinal必须从1连续且唯一。');
  }
  return Object.freeze(participants);
}

export function sameProductPublicParticipantsV2(
  left: readonly ProductPublicParticipantV2[],
  right: readonly ProductPublicParticipantV2[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
