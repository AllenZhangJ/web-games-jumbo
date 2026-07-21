import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_INPUT_FUZZ_REGRESSION_CANDIDATE_SCHEMA_VERSION = 1;
export const ARENA_INPUT_FUZZ_RUNNER_ID = 'arena.input-fuzz';
export const ARENA_INPUT_FUZZ_RUNNER_VERSION = 1;

const CANDIDATE_KEYS = new Set(['schemaVersion', 'id', 'runner', 'case', 'failure']);
const RUNNER_KEYS = new Set(['id', 'version']);
const CASE_KEYS = new Set(['mapperId', 'matchIndex', 'matchSeed', 'replayRequired']);
const FAILURE_KEYS = new Set(['name', 'message']);

function boundedText(value, maximum, name) {
  const text = assertNonEmptyString(value, name);
  if (text.length > maximum) throw new RangeError(`${name} 不能超过 ${maximum} 个字符。`);
  return text;
}

export function createArenaInputFuzzRegressionCandidate(value) {
  const source = cloneFrozenData(value, 'ArenaInputFuzzRegressionCandidate');
  assertKnownKeys(source, CANDIDATE_KEYS, 'ArenaInputFuzzRegressionCandidate');
  if (source.schemaVersion !== ARENA_INPUT_FUZZ_REGRESSION_CANDIDATE_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 ArenaInputFuzzRegressionCandidate schema ${String(source.schemaVersion)}。`,
    );
  }
  assertKnownKeys(source.runner, RUNNER_KEYS, 'ArenaInputFuzzRegressionCandidate.runner');
  if (
    source.runner.id !== ARENA_INPUT_FUZZ_RUNNER_ID
    || source.runner.version !== ARENA_INPUT_FUZZ_RUNNER_VERSION
  ) throw new RangeError('ArenaInputFuzzRegressionCandidate runner 身份不受支持。');
  assertKnownKeys(source.case, CASE_KEYS, 'ArenaInputFuzzRegressionCandidate.case');
  const matchSeed = assertIntegerAtLeast(
    source.case.matchSeed,
    0,
    'ArenaInputFuzzRegressionCandidate.case.matchSeed',
  );
  if (matchSeed > 0xffffffff) throw new RangeError('Input fuzz regression matchSeed 必须是 uint32。');
  if (source.case.replayRequired !== true) {
    throw new RangeError('Input fuzz regression 必须启用严格回放。');
  }
  assertKnownKeys(source.failure, FAILURE_KEYS, 'ArenaInputFuzzRegressionCandidate.failure');
  const result = Object.freeze({
    schemaVersion: ARENA_INPUT_FUZZ_REGRESSION_CANDIDATE_SCHEMA_VERSION,
    id: boundedText(source.id, 256, 'ArenaInputFuzzRegressionCandidate.id'),
    runner: Object.freeze({
      id: ARENA_INPUT_FUZZ_RUNNER_ID,
      version: ARENA_INPUT_FUZZ_RUNNER_VERSION,
    }),
    case: Object.freeze({
      mapperId: boundedText(
        source.case.mapperId,
        128,
        'ArenaInputFuzzRegressionCandidate.case.mapperId',
      ),
      matchIndex: assertIntegerAtLeast(
        source.case.matchIndex,
        0,
        'ArenaInputFuzzRegressionCandidate.case.matchIndex',
      ),
      matchSeed,
      replayRequired: true,
    }),
    failure: Object.freeze({
      name: boundedText(source.failure.name, 128, 'ArenaInputFuzzRegressionCandidate.failure.name'),
      message: boundedText(
        source.failure.message,
        2_000,
        'ArenaInputFuzzRegressionCandidate.failure.message',
      ),
    }),
  });
  const expectedId = `${ARENA_INPUT_FUZZ_RUNNER_ID}.${result.case.mapperId}`
    + `.case-${result.case.matchIndex}.seed-${result.case.matchSeed}`;
  if (result.id !== expectedId) {
    throw new RangeError(`Input fuzz regression id 必须是 ${expectedId}。`);
  }
  return result;
}

export function createArenaInputFuzzFailureCandidate({
  mapperId,
  matchIndex,
  matchSeed,
  failure,
}) {
  const normalized = failure instanceof Error ? failure : new Error(String(failure));
  return createArenaInputFuzzRegressionCandidate({
    schemaVersion: ARENA_INPUT_FUZZ_REGRESSION_CANDIDATE_SCHEMA_VERSION,
    id: `${ARENA_INPUT_FUZZ_RUNNER_ID}.${mapperId}.case-${matchIndex}.seed-${matchSeed}`,
    runner: { id: ARENA_INPUT_FUZZ_RUNNER_ID, version: ARENA_INPUT_FUZZ_RUNNER_VERSION },
    case: { mapperId, matchIndex, matchSeed, replayRequired: true },
    failure: {
      name: (normalized.name || 'Error').slice(0, 128),
      message: (normalized.message || 'Input fuzz failure').slice(0, 2_000),
    },
  });
}
