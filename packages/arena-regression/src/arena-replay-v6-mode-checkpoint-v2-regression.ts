import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  assertArenaReplayV6DeterministicPair,
  restoreArenaModeCheckpointV2,
  validateArenaModeCheckpointV2,
  validateArenaReplayV6,
  type ArenaModeCheckpointV2,
  type ArenaReplayV6,
} from '@number-strategy-jump/arena-match';

export const ARENA_REPLAY_V6_MODE_CHECKPOINT_V2_REGRESSION_SCHEMA_VERSION = 1 as const;

export interface ArenaReplayV6ModeCheckpointV2RegressionRun {
  readonly replay: ArenaReplayV6;
  readonly modeCheckpoints: readonly ArenaModeCheckpointV2[];
}

export interface ArenaReplayV6ModeCheckpointV2RegressionCandidate {
  readonly schemaVersion:
    typeof ARENA_REPLAY_V6_MODE_CHECKPOINT_V2_REGRESSION_SCHEMA_VERSION;
  readonly id: string;
  readonly firstRun: ArenaReplayV6ModeCheckpointV2RegressionRun;
  readonly secondRun: ArenaReplayV6ModeCheckpointV2RegressionRun;
  readonly replayIdentityHash: string;
  readonly checkpointSequenceHash: string;
  readonly modeResultHash: string;
  readonly finalHash: string;
  readonly resultHash: string;
}

export type ArenaReplayV6ModeCheckpointV2RegressionCandidateCreateOptions = Pick<
  ArenaReplayV6ModeCheckpointV2RegressionCandidate,
  'schemaVersion' | 'id' | 'firstRun' | 'secondRun'
>;

const CREATE_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion', 'id', 'firstRun', 'secondRun',
]);
const CANDIDATE_KEYS: ReadonlySet<string> = new Set([
  ...CREATE_KEYS,
  'replayIdentityHash', 'checkpointSequenceHash', 'modeResultHash', 'finalHash', 'resultHash',
]);
const RUN_KEYS: ReadonlySet<string> = new Set(['replay', 'modeCheckpoints']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;
const MAXIMUM_CANDIDATE_ID_LENGTH = 256;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是8位小写十六进制hash。`);
  }
  return value;
}

function candidateId(value: unknown): string {
  const id = assertNonEmptyString(
    value,
    'ArenaReplayV6ModeCheckpointV2RegressionCandidate.id',
  );
  if (id.length > MAXIMUM_CANDIDATE_ID_LENGTH) {
    throw new RangeError(
      `ArenaReplayV6ModeCheckpointV2RegressionCandidate.id 不能超过${MAXIMUM_CANDIDATE_ID_LENGTH}字符。`,
    );
  }
  return id;
}

function sameData(left: unknown, right: unknown, name: string): boolean {
  return createDeterministicDataHash(left, `${name} left`)
    === createDeterministicDataHash(right, `${name} right`);
}

function expectedEventSequence(replay: ArenaReplayV6, checkpointTick: number): number {
  return replay.events.filter(({ tick }) => tick < checkpointTick).length;
}

function assertCheckpointReplayClosure(
  checkpoint: ArenaModeCheckpointV2,
  replayCheckpoint: ArenaReplayV6['checkpoints'][number],
  replay: ArenaReplayV6,
  index: number,
): void {
  const name = `Arena Replay V6 regression checkpoint[${index}]`;
  if (
    checkpoint.tick !== replayCheckpoint.tick
    || checkpoint.stateHash !== replayCheckpoint.hash
  ) throw new RangeError(`${name} tick/stateHash 与 Replay checkpoint 不闭合。`);

  const restored = restoreArenaModeCheckpointV2(checkpoint, {
    expectedConfig: replay.config,
    expectedMatchSeed: replay.matchSeed,
  });
  if (
    checkpoint.modeDefinitionId !== replay.modeDefinitionId
    || checkpoint.contentHash !== replay.contentHash
    || checkpoint.configHash !== replay.configHash
    || !sameData(
      checkpoint.participantAssignments,
      replay.participantAssignments,
      `${name} participant assignments`,
    )
    || restored.checkpointIdentityHash !== checkpoint.checkpointIdentityHash
  ) throw new RangeError(`${name} config/content/assignment/restore identity 不闭合。`);

  if (checkpoint.eventSequence !== expectedEventSequence(replay, checkpoint.tick)) {
    throw new RangeError(`${name} eventSequence 与 Replay V6 authority events 不闭合。`);
  }

  const terminal = index === replay.checkpoints.length - 1;
  if (terminal) {
    if (
      checkpoint.phase !== 'ended'
      || !sameData(checkpoint.modeResult, replay.modeResult, `${name} terminal mode result`)
    ) throw new RangeError(`${name} phase/modeResult 与 Replay 终局边界不闭合。`);
  } else if (checkpoint.phase === 'ended' || checkpoint.modeResult !== null) {
    throw new RangeError(`${name} 非终局 checkpoint 不能声明终局 phase/modeResult。`);
  }
}

function normalizeRun(
  value: unknown,
  name: string,
): ArenaReplayV6ModeCheckpointV2RegressionRun {
  const source = cloneFrozenData(value, name);
  exactRecord(source, RUN_KEYS, name);
  const replay = validateArenaReplayV6(source.replay);
  if (!Array.isArray(source.modeCheckpoints)) {
    throw new TypeError(`${name}.modeCheckpoints 必须是数组。`);
  }
  if (source.modeCheckpoints.length !== replay.checkpoints.length) {
    throw new RangeError(`${name}.modeCheckpoints 必须完整映射 Replay checkpoints。`);
  }
  const modeCheckpoints = source.modeCheckpoints.map((value, index) => {
    const checkpoint = validateArenaModeCheckpointV2(value);
    assertCheckpointReplayClosure(checkpoint, replay.checkpoints[index]!, replay, index);
    return checkpoint;
  });
  return Object.freeze({
    replay,
    modeCheckpoints: Object.freeze(modeCheckpoints),
  });
}

function createCandidateCore(
  value: unknown,
): Omit<ArenaReplayV6ModeCheckpointV2RegressionCandidate, 'resultHash'> {
  const source = cloneFrozenData(
    value,
    'ArenaReplayV6ModeCheckpointV2RegressionCandidate create options',
  );
  exactRecord(
    source,
    CREATE_KEYS,
    'ArenaReplayV6ModeCheckpointV2RegressionCandidate create options',
  );
  if (source.schemaVersion !== ARENA_REPLAY_V6_MODE_CHECKPOINT_V2_REGRESSION_SCHEMA_VERSION) {
    throw new RangeError('Arena Replay V6 regression schemaVersion 必须是1。');
  }
  const firstRun = normalizeRun(source.firstRun, 'Arena Replay V6 regression firstRun');
  const secondRun = normalizeRun(source.secondRun, 'Arena Replay V6 regression secondRun');
  const replayIdentity = assertArenaReplayV6DeterministicPair(
    firstRun.replay,
    secondRun.replay,
  );
  if (!sameData(
    firstRun.modeCheckpoints,
    secondRun.modeCheckpoints,
    'Arena Replay V6 regression checkpoint sequence',
  )) throw new RangeError('Arena Replay V6 regression 双跑 Mode Checkpoint V2 序列漂移。');

  return Object.freeze({
    schemaVersion: ARENA_REPLAY_V6_MODE_CHECKPOINT_V2_REGRESSION_SCHEMA_VERSION,
    id: candidateId(source.id),
    firstRun,
    secondRun,
    replayIdentityHash: replayIdentity.replayIdentityHash,
    checkpointSequenceHash: createDeterministicDataHash(
      firstRun.modeCheckpoints,
      'Arena Replay V6 regression checkpoint sequence',
    ),
    modeResultHash: createDeterministicDataHash(
      firstRun.replay.modeResult,
      'Arena Replay V6 regression mode result',
    ),
    finalHash: replayIdentity.finalHash,
  });
}

export function createArenaReplayV6ModeCheckpointV2RegressionCandidate(
  value: unknown,
): ArenaReplayV6ModeCheckpointV2RegressionCandidate {
  const core = createCandidateCore(value);
  return cloneFrozenData({
    ...core,
    resultHash: createDeterministicDataHash(
      core,
      'Arena Replay V6 Mode Checkpoint V2 regression candidate',
    ),
  }, 'ArenaReplayV6ModeCheckpointV2RegressionCandidate');
}

export function validateArenaReplayV6ModeCheckpointV2RegressionCandidate(
  value: unknown,
): ArenaReplayV6ModeCheckpointV2RegressionCandidate {
  const source = cloneFrozenData(
    value,
    'ArenaReplayV6ModeCheckpointV2RegressionCandidate supplied candidate',
  );
  exactRecord(
    source,
    CANDIDATE_KEYS,
    'ArenaReplayV6ModeCheckpointV2RegressionCandidate supplied candidate',
  );
  const expected = createArenaReplayV6ModeCheckpointV2RegressionCandidate({
    schemaVersion: source.schemaVersion,
    id: source.id,
    firstRun: source.firstRun,
    secondRun: source.secondRun,
  });
  for (const key of [
    'replayIdentityHash',
    'checkpointSequenceHash',
    'modeResultHash',
    'finalHash',
    'resultHash',
  ] as const) {
    if (hash(source[key], `Arena Replay V6 regression ${key}`) !== expected[key]) {
      throw new RangeError(`Arena Replay V6 regression ${key} 与重算证据不一致。`);
    }
  }
  return expected;
}
