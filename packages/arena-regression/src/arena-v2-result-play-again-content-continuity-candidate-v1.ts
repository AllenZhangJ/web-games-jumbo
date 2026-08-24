import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export type ArenaV2ResultPlayAgainModeKindCandidateV1 = 'duel' | 'race' | 'survival';

export interface ArenaV2ResultPlayAgainContentContinuityCandidateV1 {
  readonly schemaVersion: 1;
  readonly modeKind: ArenaV2ResultPlayAgainModeKindCandidateV1;
  readonly weaponDefinitionId: string;
  readonly mapDefinitionId: string;
}

const CAPTURE_KEYS = new Set([
  'previousModeKind', 'requestedModeKind', 'weaponDefinitionId', 'mapDefinitionId',
]);
const CONTINUITY_KEYS = new Set([
  'schemaVersion', 'modeKind', 'weaponDefinitionId', 'mapDefinitionId',
]);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string) {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function modeKind(value: unknown, name: string): ArenaV2ResultPlayAgainModeKindCandidateV1 {
  if (!MODE_KINDS.has(value)) throw new RangeError(`${name}不是Arena三模式身份。`);
  return value as ArenaV2ResultPlayAgainModeKindCandidateV1;
}

function continuity(
  value: unknown,
  name: string,
): ArenaV2ResultPlayAgainContentContinuityCandidateV1 {
  const source = exactRecord(value, CONTINUITY_KEYS, name);
  if (source.schemaVersion !== 1) throw new RangeError(`${name}.schemaVersion必须是1。`);
  return Object.freeze({
    schemaVersion: 1 as const,
    modeKind: modeKind(source.modeKind, `${name}.modeKind`),
    weaponDefinitionId: assertNonEmptyString(
      source.weaponDefinitionId,
      `${name}.weaponDefinitionId`,
    ),
    mapDefinitionId: assertNonEmptyString(source.mapDefinitionId, `${name}.mapDefinitionId`),
  });
}

/**
 * Captures the current match-content identity before a result-page replay.
 * It owns no selection state and performs no write outside the returned value.
 */
export function captureArenaV2ResultPlayAgainContentContinuityCandidateV1(
  value: unknown,
): ArenaV2ResultPlayAgainContentContinuityCandidateV1 {
  const source = exactRecord(
    cloneFrozenData(value, 'Arena再来一局内容连续性捕获输入'),
    CAPTURE_KEYS,
    'Arena再来一局内容连续性捕获输入',
  );
  const previousModeKind = modeKind(
    source.previousModeKind,
    'Arena再来一局.previousModeKind',
  );
  const requestedModeKind = modeKind(
    source.requestedModeKind,
    'Arena再来一局.requestedModeKind',
  );
  if (requestedModeKind !== previousModeKind) {
    throw new RangeError('Arena再来一局必须保持上一局模式；切换模式应走下一目标或模式选择。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    modeKind: previousModeKind,
    weaponDefinitionId: assertNonEmptyString(
      source.weaponDefinitionId,
      'Arena再来一局.weaponDefinitionId',
    ),
    mapDefinitionId: assertNonEmptyString(
      source.mapDefinitionId,
      'Arena再来一局.mapDefinitionId',
    ),
  });
}

export function assertArenaV2ResultPlayAgainContentContinuityCandidateV1(
  expectedValue: unknown,
  observedValue: unknown,
): ArenaV2ResultPlayAgainContentContinuityCandidateV1 {
  const expected = continuity(
    cloneFrozenData(expectedValue, 'Arena再来一局预期内容身份'),
    'Arena再来一局预期内容身份',
  );
  const observed = continuity(
    cloneFrozenData(observedValue, 'Arena再来一局实际内容身份'),
    'Arena再来一局实际内容身份',
  );
  if (observed.modeKind !== expected.modeKind
    || observed.weaponDefinitionId !== expected.weaponDefinitionId
    || observed.mapDefinitionId !== expected.mapDefinitionId) {
    throw new RangeError('Arena再来一局模式、武器或地图发生漂移。');
  }
  return expected;
}

export const ARENA_V2_RESULT_PLAY_AGAIN_CONTENT_CONTINUITY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  preservesMode: true as const,
  preservesWeapon: true as const,
  preservesMap: true as const,
  registryWithdrawalFailsClosed: true as const,
  addsProfileFields: false as const,
  addsSelectionState: false as const,
  createsResources: false as const,
  createsAsyncWork: false as const,
});
