import {
  ARENA_MATCH_EVENT_V6,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createArenaMatchEventV6,
  createDeterministicDataHash,
  createMatchReadFrameV3Audit,
  normalizeInputFrame,
  type ArenaInputFrame,
  type ArenaMatchEventV6,
  type DeepReadonly,
  type MatchReadFrameV3,
  type MatchReadFrameV3AuditOptions,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
} from './match-config-v6.js';
import {
  validateArenaModeCheckpointV2,
  type ArenaModeCheckpointV2,
} from './mode-checkpoint-v2.js';
import type { ArenaReplayV6Checkpoint } from './replay-v6.js';

export const MODE_MATCH_RUNTIME_CHECKPOINT_V1_SCHEMA_VERSION = 1 as const;

export interface ModeMatchRuntimeCheckpointV1 {
  readonly schemaVersion: typeof MODE_MATCH_RUNTIME_CHECKPOINT_V1_SCHEMA_VERSION;
  readonly runtimeState: 'running' | 'paused';
  readonly checkpointIntervalTicks: number;
  readonly localParticipantId: string;
  readonly config: ArenaMatchConfigV6;
  readonly expectedMatchSeed: number;
  readonly physicsBackendVersion: string;
  readonly readFrame: DeepReadonly<MatchReadFrameV3>;
  readonly readFrameAudit: DeepReadonly<MatchReadFrameV3AuditOptions>;
  readonly stateHash: string;
  readonly modeCheckpoint: ArenaModeCheckpointV2;
  readonly worldAuthorityCheckpoint: DeepReadonly<unknown>;
  readonly inputFramesPrefix: readonly ArenaInputFrame[];
  readonly eventsPrefix: readonly DeepReadonly<ArenaMatchEventV6>[];
  readonly replayCheckpointsPrefix: readonly ArenaReplayV6Checkpoint[];
  readonly modeCheckpointsPrefix: readonly ArenaModeCheckpointV2[];
  readonly runtimeCheckpointIdentityHash: string;
}

export type ModeMatchRuntimeCheckpointV1CreateOptions = Omit<
  ModeMatchRuntimeCheckpointV1,
  'runtimeCheckpointIdentityHash'
>;

const CREATE_KEYS = new Set([
  'schemaVersion',
  'runtimeState',
  'checkpointIntervalTicks',
  'localParticipantId',
  'config',
  'expectedMatchSeed',
  'physicsBackendVersion',
  'readFrame',
  'readFrameAudit',
  'stateHash',
  'modeCheckpoint',
  'worldAuthorityCheckpoint',
  'inputFramesPrefix',
  'eventsPrefix',
  'replayCheckpointsPrefix',
  'modeCheckpointsPrefix',
]);
const CHECKPOINT_KEYS = new Set([...CREATE_KEYS, 'runtimeCheckpointIdentityHash']);
const REPLAY_CHECKPOINT_KEYS = new Set(['tick', 'hash']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;
const RACE_ONLY_EVENT_TYPES: ReadonlySet<ArenaMatchEventV6['type']> = new Set([
  ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED,
  ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED,
]);
const SURVIVAL_ONLY_EVENT_TYPES: ReadonlySet<ArenaMatchEventV6['type']> = new Set([
  ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED,
  ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED,
]);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写十六进制hash。`);
  }
  return value;
}

function positiveSafeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new RangeError(`${name}必须是正安全整数。`);
  }
  return value as number;
}

function uint32(value: unknown, name: string): number {
  const result = assertIntegerAtLeast(value, 0, name);
  if (result > 0xffff_ffff) throw new RangeError(`${name}必须是uint32。`);
  return result;
}

function sameData(left: unknown, right: unknown, name: string): boolean {
  return createDeterministicDataHash(left, `${name} left`)
    === createDeterministicDataHash(right, `${name} right`);
}

function normalizeInputPrefix(
  value: unknown,
  config: ArenaMatchConfigV6,
  currentTick: number,
): readonly ArenaInputFrame[] {
  if (!Array.isArray(value)) throw new TypeError('RuntimeCheckpoint inputFramesPrefix必须是数组。');
  const participantIds = config.participantAssignments.map(({ participantId }) => participantId);
  const expectedLength = currentTick * participantIds.length;
  if (!Number.isSafeInteger(expectedLength) || value.length !== expectedLength) {
    throw new RangeError('RuntimeCheckpoint inputFramesPrefix长度未闭合已提交tick。');
  }
  return Object.freeze(value.map((entry, index) => {
    const tick = Math.floor(index / participantIds.length);
    const participantId = participantIds[index % participantIds.length]!;
    const frame = normalizeInputFrame(entry, { expectedTick: tick, participantIds });
    if (frame.participantId !== participantId) {
      throw new RangeError('RuntimeCheckpoint inputFramesPrefix顺序不规范。');
    }
    return frame;
  }));
}

function normalizeEventPrefix(
  value: unknown,
  config: ArenaMatchConfigV6,
  currentTick: number,
  eventSequence: number,
): readonly DeepReadonly<ArenaMatchEventV6>[] {
  if (!Array.isArray(value)) throw new TypeError('RuntimeCheckpoint eventsPrefix必须是数组。');
  if (value.length !== eventSequence) {
    throw new RangeError('RuntimeCheckpoint eventsPrefix与frame eventSequence不闭合。');
  }
  const participantById = new Map(config.participantAssignments.map((entry) => (
    [entry.participantId, entry] as const
  )));
  const participantIds = config.participantAssignments.map(({ participantId }) => participantId);
  const ids = new Set<string>();
  let previousTick = -1;
  const events = value.map((entry, index) => {
    const event = createArenaMatchEventV6(entry);
    if (event.sequence !== index || event.tick < previousTick || event.tick >= currentTick) {
      throw new RangeError('RuntimeCheckpoint event sequence/tick不属于已提交前缀。');
    }
    previousTick = event.tick;
    if (ids.has(event.id)) throw new RangeError('RuntimeCheckpoint event id重复。');
    ids.add(event.id);
    if (RACE_ONLY_EVENT_TYPES.has(event.type) && config.modeKind !== 'race') {
      throw new RangeError('RuntimeCheckpoint Race事件不得跨mode。');
    }
    if (SURVIVAL_ONLY_EVENT_TYPES.has(event.type) && config.modeKind !== 'survival') {
      throw new RangeError('RuntimeCheckpoint Survival事件不得跨mode。');
    }
    if ('modeDefinitionId' in event && event.modeDefinitionId !== config.modeDefinitionId) {
      throw new RangeError('RuntimeCheckpoint event modeDefinitionId漂移。');
    }
    if ('participantId' in event) {
      const assignment = participantById.get(event.participantId);
      if (!assignment) throw new RangeError('RuntimeCheckpoint event participant不属于config。');
      if ('modeRole' in event && event.modeRole !== assignment.modeRole) {
        throw new RangeError('RuntimeCheckpoint event modeRole与assignment不一致。');
      }
    }
    if (
      event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL
      && event.creditedAttackerId !== null
      && !participantById.has(event.creditedAttackerId)
    ) throw new RangeError('RuntimeCheckpoint ParticipantFell attacker不属于config。');
    if (event.type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED) {
      for (const [name, participantId] of [
        ['attackerId', event.attackerId],
        ['targetId', event.targetId],
        ['creditedAttackerId', event.creditedAttackerId],
      ] as const) {
        if (participantId !== null && !participantById.has(participantId)) {
          throw new RangeError(`RuntimeCheckpoint feedback ${name}不属于config。`);
        }
      }
    }
    if (event.type === ARENA_MATCH_EVENT_V6.MATCH_ENDED) {
      throw new RangeError('RuntimeCheckpoint未终局前缀不得包含MatchEnded。');
    }
    return event;
  });
  if (currentTick === 0 && eventSequence === 0) {
    if (events.length !== 0) throw new RangeError('RuntimeCheckpoint tick0事件前缀必须为空。');
    return Object.freeze(events);
  }
  const firstEvent = events[0];
  if (
    firstEvent === undefined
    || firstEvent.type !== ARENA_MATCH_EVENT_V6.MATCH_STARTED
    || firstEvent.tick !== 0
    || !sameData(firstEvent.participantIds, participantIds, 'RuntimeCheckpoint MatchStarted participants')
    || events.filter(({ type }) => type === ARENA_MATCH_EVENT_V6.MATCH_STARTED).length !== 1
  ) throw new RangeError('RuntimeCheckpoint必须包含唯一首事件MatchStarted。');
  return Object.freeze(events);
}

function normalizeCheckpointPrefixes(
  replayValue: unknown,
  modeValue: unknown,
  config: ArenaMatchConfigV6,
  matchSeed: number,
  currentTick: number,
  interval: number,
  events: readonly DeepReadonly<ArenaMatchEventV6>[],
): Readonly<{
  replay: readonly ArenaReplayV6Checkpoint[];
  mode: readonly ArenaModeCheckpointV2[];
}> {
  if (!Array.isArray(replayValue) || !Array.isArray(modeValue)) {
    throw new TypeError('RuntimeCheckpoint checkpoint prefixes必须是数组。');
  }
  if (replayValue.length !== modeValue.length || replayValue.length === 0) {
    throw new RangeError('RuntimeCheckpoint replay/mode checkpoint前缀长度不一致。');
  }
  const expectedTicks = [0];
  for (let tick = interval; tick <= currentTick; tick += interval) expectedTicks.push(tick);
  if (replayValue.length !== expectedTicks.length) {
    throw new RangeError('RuntimeCheckpoint checkpoint前缀不符合显式间隔。');
  }
  const replay = replayValue.map((entry, index) => {
    exactRecord(entry, REPLAY_CHECKPOINT_KEYS, `RuntimeCheckpoint replay[${index}]`);
    const tick = assertIntegerAtLeast(entry.tick, 0, `RuntimeCheckpoint replay[${index}].tick`);
    if (tick !== expectedTicks[index]) throw new RangeError('RuntimeCheckpoint replay tick节奏漂移。');
    return Object.freeze({
      tick,
      hash: hash(entry.hash, `RuntimeCheckpoint replay[${index}].hash`),
    });
  });
  const mode = modeValue.map((entry, index) => {
    const checkpoint = validateArenaModeCheckpointV2(entry);
    const replayCheckpoint = replay[index]!;
    if (
      checkpoint.tick !== replayCheckpoint.tick
      || checkpoint.stateHash !== replayCheckpoint.hash
      || checkpoint.eventSequence !== events.filter(({ tick }) => tick < checkpoint.tick).length
      || checkpoint.matchSeed !== matchSeed
      || !sameData(checkpoint.config, config, 'RuntimeCheckpoint mode config')
    ) throw new RangeError('RuntimeCheckpoint Mode/Replay checkpoint身份漂移。');
    return checkpoint;
  });
  return Object.freeze({ replay: Object.freeze(replay), mode: Object.freeze(mode) });
}

function normalizeCore(value: unknown): ModeMatchRuntimeCheckpointV1CreateOptions {
  exactRecord(value, CREATE_KEYS, 'ModeMatchRuntimeCheckpointV1');
  if (value.schemaVersion !== MODE_MATCH_RUNTIME_CHECKPOINT_V1_SCHEMA_VERSION) {
    throw new RangeError('ModeMatchRuntimeCheckpointV1.schemaVersion必须是1。');
  }
  if (value.runtimeState !== 'running' && value.runtimeState !== 'paused') {
    throw new RangeError('ModeMatchRuntimeCheckpointV1只允许running/paused。');
  }
  const runtimeState = value.runtimeState;
  const checkpointIntervalTicks = positiveSafeInteger(
    value.checkpointIntervalTicks,
    'ModeMatchRuntimeCheckpointV1.checkpointIntervalTicks',
  );
  const config = createArenaMatchConfigV6(value.config);
  const expectedMatchSeed = uint32(
    value.expectedMatchSeed,
    'ModeMatchRuntimeCheckpointV1.expectedMatchSeed',
  );
  const localParticipantId = assertNonEmptyString(
    value.localParticipantId,
    'ModeMatchRuntimeCheckpointV1.localParticipantId',
  );
  if (!config.participantAssignments.some(({ participantId }) => participantId === localParticipantId)) {
    throw new RangeError('ModeMatchRuntimeCheckpointV1 local participant不属于config。');
  }
  const readFrameAudit = cloneFrozenData(
    value.readFrameAudit,
    'ModeMatchRuntimeCheckpointV1.readFrameAudit',
  ) as DeepReadonly<MatchReadFrameV3AuditOptions>;
  const readFrame = createMatchReadFrameV3Audit(value.readFrame, readFrameAudit);
  const world = readFrame.worldSnapshot;
  const participantIds = config.participantAssignments.map(({ participantId }) => participantId);
  const physicsBackendVersion = assertNonEmptyString(
    value.physicsBackendVersion,
    'ModeMatchRuntimeCheckpointV1.physicsBackendVersion',
  );
  const stateHash = hash(value.stateHash, 'ModeMatchRuntimeCheckpointV1.stateHash');
  const modeCheckpoint = validateArenaModeCheckpointV2(value.modeCheckpoint);
  if (
    world.phase === 'ended'
    || world.result !== null
    || world.physicsBackendVersion !== physicsBackendVersion
    || world.configHash !== createDeterministicDataHash(config)
    || world.ruleContentHash !== config.modePolicyContentHash
    || world.modeDefinitionId !== config.modeDefinitionId
    || world.matchSeed !== expectedMatchSeed
    || !sameData(
      world.participants.map(({ id }) => id),
      participantIds,
      'RuntimeCheckpoint world participants',
    )
    || readFrame.localActionSidecar.participantId !== localParticipantId
    || modeCheckpoint.tick !== world.tick
    || modeCheckpoint.phase !== world.phase
    || modeCheckpoint.eventSequence !== world.eventSequence
    || modeCheckpoint.stateHash !== stateHash
    || modeCheckpoint.matchSeed !== expectedMatchSeed
    || modeCheckpoint.modeResult !== null
    || !sameData(modeCheckpoint.config, config, 'RuntimeCheckpoint current mode config')
  ) throw new RangeError('ModeMatchRuntimeCheckpointV1 current identity未闭合。');
  const inputFramesPrefix = normalizeInputPrefix(value.inputFramesPrefix, config, world.tick);
  const eventsPrefix = normalizeEventPrefix(
    value.eventsPrefix,
    config,
    world.tick,
    world.eventSequence,
  );
  const prefixes = normalizeCheckpointPrefixes(
    value.replayCheckpointsPrefix,
    value.modeCheckpointsPrefix,
    config,
    expectedMatchSeed,
    world.tick,
    checkpointIntervalTicks,
    eventsPrefix,
  );
  if (
    world.tick % checkpointIntervalTicks === 0
    && !sameData(
      prefixes.mode[prefixes.mode.length - 1],
      modeCheckpoint,
      'RuntimeCheckpoint current interval mode checkpoint',
    )
  ) throw new RangeError('RuntimeCheckpoint当前间隔点与历史ModeCheckpoint分叉。');
  const worldAuthorityCheckpoint = cloneFrozenData(
    value.worldAuthorityCheckpoint,
    'ModeMatchRuntimeCheckpointV1.worldAuthorityCheckpoint',
  );
  assertPlainRecord(
    worldAuthorityCheckpoint,
    'ModeMatchRuntimeCheckpointV1.worldAuthorityCheckpoint',
  );
  return Object.freeze({
    schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V1_SCHEMA_VERSION,
    runtimeState,
    checkpointIntervalTicks,
    localParticipantId,
    config,
    expectedMatchSeed,
    physicsBackendVersion,
    readFrame,
    readFrameAudit,
    stateHash,
    modeCheckpoint,
    worldAuthorityCheckpoint,
    inputFramesPrefix,
    eventsPrefix,
    replayCheckpointsPrefix: prefixes.replay,
    modeCheckpointsPrefix: prefixes.mode,
  });
}

function withIdentityHash(
  core: ModeMatchRuntimeCheckpointV1CreateOptions,
): ModeMatchRuntimeCheckpointV1 {
  return Object.freeze({
    ...core,
    runtimeCheckpointIdentityHash: createDeterministicDataHash(
      core,
      'ModeMatchRuntimeCheckpointV1 identity',
    ),
  });
}

export function createModeMatchRuntimeCheckpointV1(
  value: unknown,
): ModeMatchRuntimeCheckpointV1 {
  const source = cloneFrozenData(value, 'ModeMatchRuntimeCheckpointV1 create options');
  exactRecord(source, CREATE_KEYS, 'ModeMatchRuntimeCheckpointV1 create options');
  return withIdentityHash(normalizeCore(source));
}

export function validateModeMatchRuntimeCheckpointV1(
  value: unknown,
): ModeMatchRuntimeCheckpointV1 {
  const source = cloneFrozenData(value, 'ModeMatchRuntimeCheckpointV1');
  exactRecord(source, CHECKPOINT_KEYS, 'ModeMatchRuntimeCheckpointV1');
  const claimedHash = hash(
    source.runtimeCheckpointIdentityHash,
    'ModeMatchRuntimeCheckpointV1.runtimeCheckpointIdentityHash',
  );
  const core = Object.fromEntries(
    [...CREATE_KEYS].map((key) => [key, source[key]]),
  );
  const checkpoint = withIdentityHash(normalizeCore(core));
  if (checkpoint.runtimeCheckpointIdentityHash !== claimedHash) {
    throw new RangeError('ModeMatchRuntimeCheckpointV1声明hash与重算值不一致。');
  }
  return checkpoint;
}
