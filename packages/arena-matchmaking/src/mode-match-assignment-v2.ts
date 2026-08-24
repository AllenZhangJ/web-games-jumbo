import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
  createMatchRosterAssignmentV2,
  deriveSeed,
  type DeepReadonly,
  type MatchRosterAssignmentV2,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';

export const MODE_MATCH_ASSIGNMENT_PLAN_V2_SCHEMA_VERSION = 2 as const;

export interface ModeMatchControllerSeedV2 {
  readonly participantId: string;
  readonly seed: number;
}

export interface ModeMatchAssignmentSeedsV2 {
  readonly content: number;
  readonly map: number;
  readonly equipmentSupply: number;
  readonly controllers: readonly ModeMatchControllerSeedV2[];
}

export interface ModeMatchAssignmentPlanV2 {
  readonly schemaVersion: typeof MODE_MATCH_ASSIGNMENT_PLAN_V2_SCHEMA_VERSION;
  readonly matchSeed: number;
  readonly roster: MatchRosterAssignmentV2;
  readonly seeds: ModeMatchAssignmentSeedsV2;
  readonly assignmentHash: string;
}

const OPTION_KEYS = new Set(['schemaVersion', 'matchSeed', 'roster']);

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

export function createModeMatchAssignmentPlanV2(
  value: unknown,
): DeepReadonly<ModeMatchAssignmentPlanV2> {
  const source = cloneFrozenData(value, 'ModeMatchAssignmentPlanV2 options');
  assertKnownKeys(source, OPTION_KEYS, 'ModeMatchAssignmentPlanV2 options');
  requireKeys(source, OPTION_KEYS, 'ModeMatchAssignmentPlanV2 options');
  if (source.schemaVersion !== MODE_MATCH_ASSIGNMENT_PLAN_V2_SCHEMA_VERSION) {
    throw new RangeError('ModeMatchAssignmentPlanV2.schemaVersion必须是2。');
  }
  const matchSeed = uint32(source.matchSeed, 'ModeMatchAssignmentPlanV2.matchSeed');
  const roster = createMatchRosterAssignmentV2(source.roster);
  const controllers = roster.participants
    .filter(({ controllerKind }) => controllerKind !== 'human')
    .map(({ participantId, controllerKind }) => Object.freeze({
      participantId,
      seed: deriveSeed(matchSeed, `controller:${controllerKind}:${participantId}`),
    }));
  const authority = Object.freeze({
    schemaVersion: MODE_MATCH_ASSIGNMENT_PLAN_V2_SCHEMA_VERSION,
    matchSeed,
    roster,
    seeds: Object.freeze({
      content: deriveSeed(matchSeed, 'content-selection'),
      map: deriveSeed(matchSeed, 'map-selection'),
      equipmentSupply: deriveSeed(matchSeed, 'equipment-supply'),
      controllers: Object.freeze(controllers),
    }),
  });
  return Object.freeze({
    ...authority,
    assignmentHash: createDeterministicDataHash(authority, 'ModeMatchAssignmentPlanV2'),
  });
}
