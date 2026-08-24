import {
  ARENA_MATCH_EVENT_V6,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createArenaMatchEventV6,
  createDeterministicDataHash,
  assertArenaV6ActionFeedbackOutcomeConsistencyV1,
  assertArenaV6CompetitiveEquipmentActionEligibilityV1,
  assertArenaV6SurvivalEquipmentActionEligibilityV1,
  createModeResultV3Payload,
  normalizeInputFrame,
  type ArenaInputFrame,
  type ArenaMatchEventV6,
  type DeepReadonly,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_PARTICIPANT_ROLE_V2,
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
  type ArenaMatchParticipantAssignmentV2,
} from './match-config-v6.js';

export const ARENA_REPLAY_V6_SCHEMA_VERSION = 6 as const;

export interface ArenaReplayV6Checkpoint {
  readonly tick: number;
  readonly hash: string;
}

export interface ArenaReplayV6 {
  readonly replaySchemaVersion: typeof ARENA_REPLAY_V6_SCHEMA_VERSION;
  readonly authoritySchemaVersion: 6;
  readonly physicsBackendVersion: string;
  readonly modeDefinitionId: string;
  readonly contentHash: string;
  readonly configHash: string;
  readonly matchSeed: number;
  readonly config: ArenaMatchConfigV6;
  readonly participantAssignments: readonly ArenaMatchParticipantAssignmentV2[];
  readonly inputFrames: readonly ArenaInputFrame[];
  readonly checkpoints: readonly ArenaReplayV6Checkpoint[];
  readonly events: readonly DeepReadonly<ArenaMatchEventV6>[];
  readonly modeResult: DeepReadonly<ModeResultV3Payload>;
  readonly finalHash: string;
  readonly replayIdentityHash: string;
}

export type ArenaReplayV6CreateOptions = Omit<
  ArenaReplayV6,
  'configHash' | 'replayIdentityHash'
>;

export interface ArenaReplayV6DeterminismIdentity {
  readonly replayIdentityHash: string;
  readonly modeDefinitionId: string;
  readonly contentHash: string;
  readonly matchSeed: number;
  readonly finalHash: string;
}

const CREATE_KEYS = new Set([
  'replaySchemaVersion', 'authoritySchemaVersion', 'physicsBackendVersion', 'modeDefinitionId',
  'contentHash', 'matchSeed', 'config',
  'participantAssignments', 'inputFrames', 'checkpoints', 'events', 'modeResult', 'finalHash',
]);
const REPLAY_KEYS = new Set([...CREATE_KEYS, 'configHash', 'replayIdentityHash']);
const CHECKPOINT_KEYS = new Set(['tick', 'hash']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

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

function contentHash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!/^[0-9a-f]+$/u.test(result)) throw new TypeError(`${name} 必须是小写十六进制hash。`);
  return result;
}

function uint32(value: unknown, name: string): number {
  const result = assertIntegerAtLeast(value, 0, name);
  if (result > 0xffffffff) throw new RangeError(`${name} 必须是uint32。`);
  return result;
}

function sameData(left: unknown, right: unknown, name: string): boolean {
  return createDeterministicDataHash(left, `${name} left`)
    === createDeterministicDataHash(right, `${name} right`);
}

function normalizeInputFrames(
  value: unknown,
  participantIds: readonly string[],
  endedAtTick: number,
): readonly ArenaInputFrame[] {
  if (!Array.isArray(value)) throw new TypeError('ArenaReplayV6.inputFrames 必须是数组。');
  const expectedLength = (endedAtTick + 1) * participantIds.length;
  if (!Number.isSafeInteger(expectedLength) || value.length !== expectedLength) {
    throw new RangeError('ArenaReplayV6.inputFrames 未完整覆盖每tick participant。');
  }
  return Object.freeze(value.map((frame, index) => {
    const tick = Math.floor(index / participantIds.length);
    const participantId = participantIds[index % participantIds.length]!;
    const normalized = normalizeInputFrame(frame, { expectedTick: tick, participantIds });
    if (normalized.participantId !== participantId) {
      throw new RangeError('ArenaReplayV6.inputFrames 必须按tick/participant规范顺序排列。');
    }
    if (!sameData(frame, normalized, `ArenaReplayV6.inputFrames[${index}]`)) {
      throw new RangeError('ArenaReplayV6.inputFrames 必须已是完整规范值。');
    }
    return normalized;
  }));
}

function normalizeCheckpoints(
  value: unknown,
  finalTick: number,
  finalHash: string,
): readonly ArenaReplayV6Checkpoint[] {
  if (!Array.isArray(value) || value.length < 2) {
    throw new RangeError('ArenaReplayV6.checkpoints 必须至少包含初始与最终checkpoint。');
  }
  const checkpoints = value.map((entry, index) => {
    const name = `ArenaReplayV6.checkpoints[${index}]`;
    exactRecord(entry, CHECKPOINT_KEYS, name);
    return Object.freeze({
      tick: assertIntegerAtLeast(entry.tick, 0, `${name}.tick`),
      hash: hash(entry.hash, `${name}.hash`),
    });
  });
  if (checkpoints[0]!.tick !== 0) throw new RangeError('ArenaReplayV6 初始checkpoint必须是tick0。');
  for (let index = 1; index < checkpoints.length; index += 1) {
    if (checkpoints[index]!.tick <= checkpoints[index - 1]!.tick) {
      throw new RangeError('ArenaReplayV6 checkpoint tick 必须严格递增。');
    }
  }
  const terminal = checkpoints.at(-1)!;
  if (terminal.tick !== finalTick || terminal.hash !== finalHash) {
    throw new RangeError('ArenaReplayV6 最终checkpoint必须闭合final tick/hash。');
  }
  return Object.freeze(checkpoints);
}

function assertEventParticipantIdentity(
  event: DeepReadonly<ArenaMatchEventV6>,
  config: ArenaMatchConfigV6,
): void {
  const participantIds = config.participantAssignments.map(({ participantId }) => participantId);
  const assignment = 'participantId' in event
    ? config.participantAssignments.find(({ participantId }) => (
      participantId === event.participantId
    ))
    : undefined;
  if ('participantId' in event && !assignment) {
    throw new RangeError('ArenaReplayV6 event participant不属于最终assignment。');
  }
  if (assignment && 'modeRole' in event && event.modeRole !== assignment.modeRole) {
    throw new RangeError('ArenaReplayV6 event participant role与最终assignment不一致。');
  }
  if ('modeDefinitionId' in event && event.modeDefinitionId !== config.modeDefinitionId) {
    throw new RangeError('ArenaReplayV6 event modeDefinitionId漂移。');
  }
  if (event.type === ARENA_MATCH_EVENT_V6.MATCH_STARTED) {
    if (
      event.participantIds.length !== participantIds.length
      || event.participantIds.some((id, index) => id !== participantIds[index])
    ) throw new RangeError('ArenaReplayV6 MatchStarted assignment identity不一致。');
  }
  if (event.type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED) {
    for (const [name, participantId] of [
      ['attackerId', event.attackerId],
      ['targetId', event.targetId],
      ['creditedAttackerId', event.creditedAttackerId],
    ] as const) {
      if (participantId !== null && !participantIds.includes(participantId)) {
        throw new RangeError(`ArenaReplayV6 feedback ${name}不属于最终assignment。`);
      }
    }
  }
  const raceOnly = event.type === ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED
    || event.type === ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED;
  const survivalOnly = event.type === ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED
    || event.type === ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED;
  if (raceOnly && config.modeKind !== 'race') {
    throw new RangeError('ArenaReplayV6 非Race不能包含Race事件。');
  }
  if (survivalOnly && config.modeKind !== 'survival') {
    throw new RangeError('ArenaReplayV6 非Survival不能包含Survival事件。');
  }
  if (event.type === ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED) {
    if (
      !assignment
      || assignment.modeRole !== ARENA_MATCH_PARTICIPANT_ROLE_V2.ENEMY
      || assignment.slotId !== event.slotId
      || event.generation < assignment.slotGeneration
    ) throw new RangeError('ArenaReplayV6 Survival slot事件与最终assignment不一致。');
  }
}

function normalizeEvents(
  value: unknown,
  config: ArenaMatchConfigV6,
  modeResult: DeepReadonly<ModeResultV3Payload>,
): readonly DeepReadonly<ArenaMatchEventV6>[] {
  if (!Array.isArray(value) || value.length < 2) {
    throw new RangeError('ArenaReplayV6.events 必须包含MatchStarted与MatchEnded。');
  }
  const events = value.map((event, index) => {
    const normalized = createArenaMatchEventV6(event);
    if (normalized.sequence !== index) {
      throw new RangeError('ArenaReplayV6 event sequence 必须从0连续递增。');
    }
    assertEventParticipantIdentity(normalized, config);
    return normalized;
  });
  for (let index = 1; index < events.length; index += 1) {
    if (events[index]!.tick < events[index - 1]!.tick) {
      throw new RangeError('ArenaReplayV6 event tick 不能回退。');
    }
  }
  if (new Set(events.map(({ id }) => id)).size !== events.length) {
    throw new RangeError('ArenaReplayV6 event id 必须唯一。');
  }
  const startedCount = events.filter(
    ({ type }) => type === ARENA_MATCH_EVENT_V6.MATCH_STARTED,
  ).length;
  const endedCount = events.filter(
    ({ type }) => type === ARENA_MATCH_EVENT_V6.MATCH_ENDED,
  ).length;
  const first = events[0]!;
  const terminal = events.at(-1)!;
  if (
    startedCount !== 1
    || first.type !== ARENA_MATCH_EVENT_V6.MATCH_STARTED
    || first.tick !== 0
    || endedCount !== 1
    || terminal.type !== ARENA_MATCH_EVENT_V6.MATCH_ENDED
  ) throw new RangeError('ArenaReplayV6 必须以唯一MatchStarted开始并以唯一MatchEnded结束。');
  if (terminal.type !== ARENA_MATCH_EVENT_V6.MATCH_ENDED) {
    throw new Error('ArenaReplayV6 terminal event narrowing 失败。');
  }
  if (
    terminal.tick !== modeResult.endedAtTick
    || !sameData(terminal.modeResult, modeResult, 'ArenaReplayV6 terminal result')
  ) throw new RangeError('ArenaReplayV6 MatchEnded与modeResult不闭合。');
  return Object.freeze(events);
}

function assertModeResultParticipants(
  result: DeepReadonly<ModeResultV3Payload>,
  config: ArenaMatchConfigV6,
): void {
  if (result.kind !== config.modeKind) {
    throw new RangeError('ArenaReplayV6 modeResult.kind与config mode不一致。');
  }
  const participantIds = config.participantAssignments.map(({ participantId }) => participantId);
  if (result.kind === 'duel') {
    if (result.winnerParticipantIds.some((id) => !participantIds.includes(id))) {
      throw new RangeError('ArenaReplayV6 Duel winner不属于最终assignment。');
    }
    return;
  }
  if (result.kind === 'race') {
    const rankedIds = result.rankings.map(({ participantId }) => participantId);
    if (
      rankedIds.length !== participantIds.length
      || rankedIds.some((id, index) => id !== participantIds[index])
    ) throw new RangeError('ArenaReplayV6 Race rankings未闭合最终assignment。');
    return;
  }
  const player = config.participantAssignments.find(
    ({ modeRole }) => modeRole === ARENA_MATCH_PARTICIPANT_ROLE_V2.PLAYER,
  );
  if (result.playerParticipantId !== player?.participantId) {
    throw new RangeError('ArenaReplayV6 Survival player identity不一致。');
  }
}

function normalizeReplayCore(source: Record<string, unknown>): Omit<
  ArenaReplayV6,
  'replayIdentityHash'
> {
  if (source.replaySchemaVersion !== ARENA_REPLAY_V6_SCHEMA_VERSION) {
    throw new RangeError('ArenaReplayV6.replaySchemaVersion 必须是6。');
  }
  if (source.authoritySchemaVersion !== 6) {
    throw new RangeError('ArenaReplayV6.authoritySchemaVersion 必须是6。');
  }
  const config = createArenaMatchConfigV6(source.config);
  const modeDefinitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'ArenaReplayV6.modeDefinitionId',
  );
  const normalizedContentHash = contentHash(source.contentHash, 'ArenaReplayV6.contentHash');
  if (
    modeDefinitionId !== config.modeDefinitionId
    || normalizedContentHash !== config.modePolicyContentHash
  ) throw new RangeError('ArenaReplayV6 config/mode/content identity不一致。');
  if (!sameData(
    source.participantAssignments,
    config.participantAssignments,
    'ArenaReplayV6 participant assignments',
  )) throw new RangeError('ArenaReplayV6 finalized participant assignment identity不一致。');
  const modeResult = createModeResultV3Payload(source.modeResult);
  assertModeResultParticipants(modeResult, config);
  const finalHash = hash(source.finalHash, 'ArenaReplayV6.finalHash');
  const inputFrames = normalizeInputFrames(
    source.inputFrames,
    config.participantAssignments.map(({ participantId }) => participantId),
    modeResult.endedAtTick,
  );
  const events = normalizeEvents(source.events, config, modeResult);
  assertArenaV6ActionFeedbackOutcomeConsistencyV1(events);
  if (config.modeKind === 'duel' || config.modeKind === 'race') {
    assertArenaV6CompetitiveEquipmentActionEligibilityV1({
      modeKind: config.modeKind,
      participants: config.participantAssignments.map((entry) => ({
        participantId: entry.participantId,
        modeRole: entry.modeRole,
        slotId: entry.slotId,
        slotGeneration: entry.slotGeneration,
      })),
      events,
    });
  } else {
    assertArenaV6SurvivalEquipmentActionEligibilityV1({
      participants: config.participantAssignments.map((entry) => ({
        participantId: entry.participantId,
        modeRole: entry.modeRole,
        slotId: entry.slotId,
        slotGeneration: entry.slotGeneration,
      })),
      events,
    });
  }
  return Object.freeze({
    replaySchemaVersion: ARENA_REPLAY_V6_SCHEMA_VERSION,
    authoritySchemaVersion: 6,
    physicsBackendVersion: assertNonEmptyString(
      source.physicsBackendVersion,
      'ArenaReplayV6.physicsBackendVersion',
    ),
    modeDefinitionId,
    contentHash: normalizedContentHash,
    configHash: createDeterministicDataHash(config, 'ArenaReplayV6 config'),
    matchSeed: uint32(source.matchSeed, 'ArenaReplayV6.matchSeed'),
    config,
    participantAssignments: config.participantAssignments,
    inputFrames,
    checkpoints: normalizeCheckpoints(
      source.checkpoints,
      modeResult.endedAtTick + 1,
      finalHash,
    ),
    events,
    modeResult,
    finalHash,
  });
}

function withIdentityHash(core: Omit<ArenaReplayV6, 'replayIdentityHash'>): ArenaReplayV6 {
  return Object.freeze({
    ...core,
    replayIdentityHash: createDeterministicDataHash(core, 'ArenaReplayV6 identity'),
  });
}

export function createArenaReplayV6(value: unknown): ArenaReplayV6 {
  const source = cloneFrozenData(value, 'ArenaReplayV6 create options');
  exactRecord(source, CREATE_KEYS, 'ArenaReplayV6 create options');
  return withIdentityHash(normalizeReplayCore(source));
}

export function validateArenaReplayV6(value: unknown): ArenaReplayV6 {
  const source = cloneFrozenData(value, 'ArenaReplayV6');
  exactRecord(source, REPLAY_KEYS, 'ArenaReplayV6');
  const expectedConfigHash = hash(source.configHash, 'ArenaReplayV6.configHash');
  const expectedIdentityHash = hash(source.replayIdentityHash, 'ArenaReplayV6.replayIdentityHash');
  const replay = withIdentityHash(normalizeReplayCore(source));
  if (replay.configHash !== expectedConfigHash || replay.replayIdentityHash !== expectedIdentityHash) {
    throw new RangeError('ArenaReplayV6 replayIdentityHash与重算证据不一致。');
  }
  return replay;
}

export function assertArenaReplayV6DeterministicPair(
  firstValue: unknown,
  secondValue: unknown,
): ArenaReplayV6DeterminismIdentity {
  const first = validateArenaReplayV6(firstValue);
  const second = validateArenaReplayV6(secondValue);
  if (
    first.matchSeed !== second.matchSeed
    || !sameData(first.config, second.config, 'ArenaReplayV6 pair config')
    || !sameData(first.inputFrames, second.inputFrames, 'ArenaReplayV6 pair input')
  ) throw new RangeError('ArenaReplayV6 双跑比较前提 config/seed/input 不一致。');
  if (first.replayIdentityHash !== second.replayIdentityHash) {
    throw new RangeError('ArenaReplayV6 同配置/seed/input 双跑证据发生确定性漂移。');
  }
  return Object.freeze({
    replayIdentityHash: first.replayIdentityHash,
    modeDefinitionId: first.modeDefinitionId,
    contentHash: first.contentHash,
    matchSeed: first.matchSeed,
    finalHash: first.finalHash,
  });
}
