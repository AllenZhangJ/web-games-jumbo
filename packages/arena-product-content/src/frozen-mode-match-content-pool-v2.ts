import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
  finalizeMatchParticipantAssignmentV2,
  validateMatchContentSelectionV2,
  validateMatchRosterAssignmentV2,
  type DeepReadonly,
  type FinalizedMatchAssignmentV2,
  type MatchContentSelectionV2,
  type MatchRosterAssignmentV2,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';

export const FROZEN_MODE_MATCH_CONTENT_POOL_V2_SCHEMA_VERSION = 2 as const;

export interface FrozenModeMatchContentPoolV2 {
  readonly schemaVersion: typeof FROZEN_MODE_MATCH_CONTENT_POOL_V2_SCHEMA_VERSION;
  readonly matchSeed: number;
  readonly sourceProfileRevision: number;
  readonly roster: MatchRosterAssignmentV2;
  readonly selection: MatchContentSelectionV2;
  readonly finalAssignment: FinalizedMatchAssignmentV2;
  readonly poolHash: string;
}

const OPTION_KEYS = new Set([
  'schemaVersion', 'matchSeed', 'sourceProfileRevision', 'roster', 'selection',
]);

function requireKeys(value: PlainRecord, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少字段${key}。`);
  }
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name}必须是uint32。`);
  }
  return value as number;
}

export function createFrozenModeMatchContentPoolV2(
  value: unknown,
): DeepReadonly<FrozenModeMatchContentPoolV2> {
  const source = cloneFrozenData(value, 'FrozenModeMatchContentPoolV2 options');
  assertKnownKeys(source, OPTION_KEYS, 'FrozenModeMatchContentPoolV2 options');
  requireKeys(source, OPTION_KEYS, 'FrozenModeMatchContentPoolV2 options');
  if (source.schemaVersion !== FROZEN_MODE_MATCH_CONTENT_POOL_V2_SCHEMA_VERSION) {
    throw new RangeError('FrozenModeMatchContentPoolV2.schemaVersion必须是2。');
  }
  const roster = validateMatchRosterAssignmentV2(source.roster);
  const selection = validateMatchContentSelectionV2(source.selection);
  const finalAssignment = finalizeMatchParticipantAssignmentV2({
    roster,
    content: selection,
  });
  const authority = Object.freeze({
    schemaVersion: FROZEN_MODE_MATCH_CONTENT_POOL_V2_SCHEMA_VERSION,
    matchSeed: uint32(source.matchSeed, 'FrozenModeMatchContentPoolV2.matchSeed'),
    sourceProfileRevision: assertIntegerAtLeast(
      source.sourceProfileRevision,
      0,
      'FrozenModeMatchContentPoolV2.sourceProfileRevision',
    ),
    roster,
    selection,
    finalAssignment,
  });
  return Object.freeze({
    ...authority,
    poolHash: createDeterministicDataHash(authority, 'FrozenModeMatchContentPoolV2'),
  });
}
