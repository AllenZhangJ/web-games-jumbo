import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
  createModeResultV3Payload,
  type DeepReadonly,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_PARTICIPANT_ROLE_V2,
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
  type ArenaMatchParticipantAssignmentV2,
} from './match-config-v6.js';

export const ARENA_MODE_CHECKPOINT_V2_SCHEMA_VERSION = 2 as const;

export interface DuelModeCheckpointStateV2 {
  readonly kind: 'duel';
  readonly suddenDeath: boolean;
}

export interface RaceModeCheckpointParticipantV2 {
  readonly participantId: string;
  readonly status: 'racing' | 'respawning' | 'finished';
  readonly safeAnchorId: string;
  readonly progressOrdinal: number;
  readonly respawnReadyTick: number | null;
  readonly finishTick: number | null;
  readonly rank: number | null;
}

export interface RaceModeCheckpointStateV2 {
  readonly kind: 'race';
  readonly revision: number;
  readonly lastProcessedTick: number;
  readonly finishGateId: string;
  readonly participants: readonly RaceModeCheckpointParticipantV2[];
}

export interface SurvivalModeCheckpointEnemySlotV2 {
  readonly slotId: string;
  readonly participantId: string;
  readonly active: boolean;
  readonly generation: number;
  readonly anchorId: string | null;
  readonly reactivationReadyTick: number | null;
}

export interface SurvivalModeCheckpointStateV2 {
  readonly kind: 'survival';
  readonly revision: number;
  readonly lastProcessedTick: number;
  readonly playerParticipantId: string;
  readonly playerStatus: 'active' | 'respawning' | 'ended';
  readonly playerRespawnReadyTick: number | null;
  readonly fallCount: number;
  readonly terminalFallCount: 2;
  readonly survivedTicks: number;
  readonly pressureStage: number;
  readonly enemySlots: readonly SurvivalModeCheckpointEnemySlotV2[];
}

export type ArenaModeCheckpointStateV2 =
  | DuelModeCheckpointStateV2
  | RaceModeCheckpointStateV2
  | SurvivalModeCheckpointStateV2;

export interface ArenaModeCheckpointV2 {
  readonly checkpointSchemaVersion: typeof ARENA_MODE_CHECKPOINT_V2_SCHEMA_VERSION;
  readonly matchSchemaVersion: 6;
  readonly modeDefinitionId: string;
  readonly contentHash: string;
  readonly configHash: string;
  readonly participantAssignmentHash: string;
  readonly matchSeed: number;
  readonly config: ArenaMatchConfigV6;
  readonly participantAssignments: readonly ArenaMatchParticipantAssignmentV2[];
  readonly tick: number;
  readonly phase: 'preparing' | 'running' | 'sudden-death' | 'ended';
  readonly eventSequence: number;
  readonly modeState: ArenaModeCheckpointStateV2;
  readonly modeResult: DeepReadonly<ModeResultV3Payload> | null;
  readonly stateHash: string;
  readonly checkpointIdentityHash: string;
}

export type ArenaModeCheckpointV2CreateOptions = Omit<
  ArenaModeCheckpointV2,
  'configHash' | 'participantAssignmentHash' | 'checkpointIdentityHash'
>;

export interface RestoreArenaModeCheckpointV2Options {
  readonly expectedConfig: ArenaMatchConfigV6;
  readonly expectedMatchSeed: number;
}

export interface RestoredArenaModeCheckpointV2 {
  readonly config: ArenaMatchConfigV6;
  readonly matchSeed: number;
  readonly tick: number;
  readonly phase: ArenaModeCheckpointV2['phase'];
  readonly eventSequence: number;
  readonly modeState: ArenaModeCheckpointStateV2;
  readonly modeResult: DeepReadonly<ModeResultV3Payload> | null;
  readonly stateHash: string;
  readonly checkpointIdentityHash: string;
}

const CREATE_KEYS = new Set([
  'checkpointSchemaVersion', 'matchSchemaVersion', 'modeDefinitionId', 'contentHash',
  'matchSeed', 'config', 'participantAssignments', 'tick', 'phase', 'eventSequence',
  'modeState', 'modeResult', 'stateHash',
]);
const CHECKPOINT_KEYS = new Set([
  ...CREATE_KEYS, 'configHash', 'participantAssignmentHash', 'checkpointIdentityHash',
]);
const RESTORE_KEYS = new Set(['expectedConfig', 'expectedMatchSeed']);
const DUEL_STATE_KEYS = new Set(['kind', 'suddenDeath']);
const RACE_STATE_KEYS = new Set([
  'kind', 'revision', 'lastProcessedTick', 'finishGateId', 'participants',
]);
const RACE_PARTICIPANT_KEYS = new Set([
  'participantId', 'status', 'safeAnchorId', 'progressOrdinal', 'respawnReadyTick',
  'finishTick', 'rank',
]);
const SURVIVAL_STATE_KEYS = new Set([
  'kind', 'revision', 'lastProcessedTick', 'playerParticipantId', 'playerStatus',
  'playerRespawnReadyTick', 'fallCount', 'terminalFallCount', 'survivedTicks',
  'pressureStage', 'enemySlots',
]);
const SURVIVAL_SLOT_KEYS = new Set([
  'slotId', 'participantId', 'active', 'generation', 'anchorId', 'reactivationReadyTick',
]);
const PHASES: ReadonlySet<unknown> = new Set([
  'preparing', 'running', 'sudden-death', 'ended',
]);
const RACE_STATUSES: ReadonlySet<unknown> = new Set(['racing', 'respawning', 'finished']);
const PLAYER_STATUSES: ReadonlySet<unknown> = new Set(['active', 'respawning', 'ended']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

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

function integerAtLeastMinusOne(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < -1) {
    throw new RangeError(`${name} 必须是大于等于-1的安全整数。`);
  }
  return value as number;
}

function nullableTick(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function nullableRank(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 1, name);
}

function sameData(left: unknown, right: unknown, name: string): boolean {
  return createDeterministicDataHash(left, `${name} left`)
    === createDeterministicDataHash(right, `${name} right`);
}

function assertConfigEnvelope(
  source: Record<string, unknown>,
): Readonly<{
  config: ArenaMatchConfigV6;
  participantAssignments: readonly ArenaMatchParticipantAssignmentV2[];
  modeDefinitionId: string;
  contentHash: string;
}> {
  const config = createArenaMatchConfigV6(source.config);
  const modeDefinitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'ModeCheckpointV2.modeDefinitionId',
  );
  const normalizedContentHash = contentHash(source.contentHash, 'ModeCheckpointV2.contentHash');
  if (
    modeDefinitionId !== config.modeDefinitionId
    || normalizedContentHash !== config.modePolicyContentHash
  ) throw new RangeError('ModeCheckpointV2 config/mode/content identity 不一致。');
  if (!sameData(
    source.participantAssignments,
    config.participantAssignments,
    'ModeCheckpointV2 participant assignments',
  )) throw new RangeError('ModeCheckpointV2 participant assignment identity 不一致。');
  return Object.freeze({
    config,
    participantAssignments: config.participantAssignments,
    modeDefinitionId,
    contentHash: normalizedContentHash,
  });
}

function assertResultParticipants(
  result: DeepReadonly<ModeResultV3Payload>,
  config: ArenaMatchConfigV6,
): void {
  if (result.kind !== config.modeKind) {
    throw new RangeError('ModeCheckpointV2 result kind 与 config mode 不一致。');
  }
  const participantIds = config.participantAssignments.map(({ participantId }) => participantId);
  if (result.kind === 'duel') {
    if (result.winnerParticipantIds.some((id) => !participantIds.includes(id))) {
      throw new RangeError('ModeCheckpointV2 Duel winner 不属于当局。');
    }
    return;
  }
  if (result.kind === 'race') {
    const rankedIds = result.rankings.map(({ participantId }) => participantId);
    if (
      rankedIds.length !== participantIds.length
      || rankedIds.some((id, index) => id !== participantIds[index])
    ) throw new RangeError('ModeCheckpointV2 Race rankings 未闭合 participant identity。');
    return;
  }
  const player = config.participantAssignments.find(
    ({ modeRole }) => modeRole === ARENA_MATCH_PARTICIPANT_ROLE_V2.PLAYER,
  );
  if (result.playerParticipantId !== player?.participantId) {
    throw new RangeError('ModeCheckpointV2 Survival player identity 不一致。');
  }
}

function normalizeDuelState(
  value: unknown,
  phase: ArenaModeCheckpointV2['phase'],
): DuelModeCheckpointStateV2 {
  exactRecord(value, DUEL_STATE_KEYS, 'ModeCheckpointV2 Duel state');
  if (value.kind !== 'duel' || typeof value.suddenDeath !== 'boolean') {
    throw new TypeError('ModeCheckpointV2 Duel state 判别字段无效。');
  }
  if (value.suddenDeath !== (phase === 'sudden-death')) {
    throw new RangeError('ModeCheckpointV2 Duel suddenDeath 与 phase 不一致。');
  }
  return Object.freeze({ kind: 'duel', suddenDeath: value.suddenDeath });
}

function normalizeRaceState(
  value: unknown,
  config: ArenaMatchConfigV6,
  tick: number,
  result: DeepReadonly<ModeResultV3Payload> | null,
): RaceModeCheckpointStateV2 {
  exactRecord(value, RACE_STATE_KEYS, 'ModeCheckpointV2 Race state');
  if (value.kind !== 'race') throw new RangeError('ModeCheckpointV2 Race state.kind 无效。');
  const lastProcessedTick = integerAtLeastMinusOne(
    value.lastProcessedTick,
    'ModeCheckpointV2 Race lastProcessedTick',
  );
  if (lastProcessedTick !== tick - 1) {
    throw new RangeError('ModeCheckpointV2 Race state tick 游标不一致。');
  }
  if (!Array.isArray(value.participants)) {
    throw new TypeError('ModeCheckpointV2 Race participants 必须是数组。');
  }
  const participants = value.participants.map((entry, index) => {
    const name = `ModeCheckpointV2 Race participants[${index}]`;
    exactRecord(entry, RACE_PARTICIPANT_KEYS, name);
    const participantId = assertNonEmptyString(entry.participantId, `${name}.participantId`);
    if (!RACE_STATUSES.has(entry.status)) throw new RangeError(`${name}.status 不受支持。`);
    const status = entry.status as RaceModeCheckpointParticipantV2['status'];
    const respawnReadyTick = nullableTick(entry.respawnReadyTick, `${name}.respawnReadyTick`);
    const finishTick = nullableTick(entry.finishTick, `${name}.finishTick`);
    const rank = nullableRank(entry.rank, `${name}.rank`);
    if (
      (status === 'racing' && (respawnReadyTick !== null || finishTick !== null))
      || (status === 'respawning' && (respawnReadyTick === null || finishTick !== null))
      || (status === 'finished' && (respawnReadyTick !== null || finishTick === null))
    ) throw new RangeError(`${name} status/respawn/finish identity 不一致。`);
    if (respawnReadyTick !== null && respawnReadyTick <= lastProcessedTick) {
      throw new RangeError(`${name}.respawnReadyTick 必须晚于已提交tick。`);
    }
    if (finishTick !== null && finishTick > lastProcessedTick) {
      throw new RangeError(`${name}.finishTick 不能位于checkpoint未来。`);
    }
    if ((result === null) !== (rank === null)) {
      throw new RangeError(`${name}.rank 只能在终局 checkpoint 存在。`);
    }
    if (result === null && status === 'finished') {
      throw new RangeError(`${name} 非终局 checkpoint 不能存在 finished participant。`);
    }
    return Object.freeze({
      participantId,
      status,
      safeAnchorId: assertNonEmptyString(entry.safeAnchorId, `${name}.safeAnchorId`),
      progressOrdinal: assertIntegerAtLeast(entry.progressOrdinal, 0, `${name}.progressOrdinal`),
      respawnReadyTick,
      finishTick,
      rank,
    });
  });
  const participantIds = config.participantAssignments.map(({ participantId }) => participantId);
  if (
    participants.length !== participantIds.length
    || participants.some((entry, index) => entry.participantId !== participantIds[index])
  ) throw new RangeError('ModeCheckpointV2 Race participant 集合/顺序与 config 不一致。');
  if (result?.kind === 'race') {
    for (const participant of participants) {
      const ranking = result.rankings.find(({ participantId }) => (
        participantId === participant.participantId
      ));
      if (
        !ranking
        || participant.rank !== ranking.rank
        || participant.finishTick !== ranking.finishTick
        || participant.progressOrdinal !== ranking.progressOrdinal
      ) throw new RangeError('ModeCheckpointV2 Race state/result ranking identity 不一致。');
    }
  }
  return Object.freeze({
    kind: 'race',
    revision: assertIntegerAtLeast(value.revision, 0, 'ModeCheckpointV2 Race revision'),
    lastProcessedTick,
    finishGateId: assertNonEmptyString(
      value.finishGateId,
      'ModeCheckpointV2 Race finishGateId',
    ),
    participants: Object.freeze(participants),
  });
}

function normalizeSurvivalState(
  value: unknown,
  config: ArenaMatchConfigV6,
  tick: number,
  result: DeepReadonly<ModeResultV3Payload> | null,
): SurvivalModeCheckpointStateV2 {
  exactRecord(value, SURVIVAL_STATE_KEYS, 'ModeCheckpointV2 Survival state');
  if (value.kind !== 'survival') {
    throw new RangeError('ModeCheckpointV2 Survival state.kind 无效。');
  }
  const lastProcessedTick = integerAtLeastMinusOne(
    value.lastProcessedTick,
    'ModeCheckpointV2 Survival lastProcessedTick',
  );
  if (lastProcessedTick !== tick - 1) {
    throw new RangeError('ModeCheckpointV2 Survival state tick 游标不一致。');
  }
  const player = config.participantAssignments.find(
    ({ modeRole }) => modeRole === ARENA_MATCH_PARTICIPANT_ROLE_V2.PLAYER,
  );
  const playerParticipantId = assertNonEmptyString(
    value.playerParticipantId,
    'ModeCheckpointV2 Survival playerParticipantId',
  );
  if (playerParticipantId !== player?.participantId) {
    throw new RangeError('ModeCheckpointV2 Survival player identity 与 config 不一致。');
  }
  if (!PLAYER_STATUSES.has(value.playerStatus)) {
    throw new RangeError('ModeCheckpointV2 Survival playerStatus 不受支持。');
  }
  const playerStatus = value.playerStatus as SurvivalModeCheckpointStateV2['playerStatus'];
  const playerRespawnReadyTick = nullableTick(
    value.playerRespawnReadyTick,
    'ModeCheckpointV2 Survival playerRespawnReadyTick',
  );
  if ((playerStatus === 'respawning') !== (playerRespawnReadyTick !== null)) {
    throw new RangeError('ModeCheckpointV2 Survival player respawn identity 不一致。');
  }
  const fallCount = assertIntegerAtLeast(value.fallCount, 0, 'ModeCheckpointV2 Survival fallCount');
  if (fallCount > 2 || value.terminalFallCount !== 2) {
    throw new RangeError('ModeCheckpointV2 Survival fall/terminal 计数无效。');
  }
  if ((result === null) === (playerStatus === 'ended')) {
    throw new RangeError('ModeCheckpointV2 Survival ended/result identity 不一致。');
  }
  if (playerRespawnReadyTick !== null && playerRespawnReadyTick <= lastProcessedTick) {
    throw new RangeError('ModeCheckpointV2 Survival playerRespawnReadyTick 必须位于未来。');
  }
  if (!Array.isArray(value.enemySlots)) {
    throw new TypeError('ModeCheckpointV2 Survival enemySlots 必须是数组。');
  }
  const enemySlots = value.enemySlots.map((entry, index) => {
    const name = `ModeCheckpointV2 Survival enemySlots[${index}]`;
    exactRecord(entry, SURVIVAL_SLOT_KEYS, name);
    if (typeof entry.active !== 'boolean') throw new TypeError(`${name}.active 必须是布尔值。`);
    const anchorId = entry.anchorId === null
      ? null
      : assertNonEmptyString(entry.anchorId, `${name}.anchorId`);
    const reactivationReadyTick = nullableTick(
      entry.reactivationReadyTick,
      `${name}.reactivationReadyTick`,
    );
    if (entry.active ? anchorId === null || reactivationReadyTick !== null : anchorId !== null) {
      throw new RangeError(`${name} active/anchor/reactivation identity 不一致。`);
    }
    return Object.freeze({
      slotId: assertNonEmptyString(entry.slotId, `${name}.slotId`),
      participantId: assertNonEmptyString(entry.participantId, `${name}.participantId`),
      active: entry.active,
      generation: assertIntegerAtLeast(entry.generation, 0, `${name}.generation`),
      anchorId,
      reactivationReadyTick,
    });
  });
  const enemyAssignments = config.participantAssignments.filter(
    ({ modeRole }) => modeRole === ARENA_MATCH_PARTICIPANT_ROLE_V2.ENEMY,
  ).sort((left, right) => compareText(left.slotId ?? '', right.slotId ?? ''));
  if (
    enemySlots.length !== enemyAssignments.length
    || enemySlots.some((slot, index) => (
      slot.slotId !== enemyAssignments[index]!.slotId
      || slot.participantId !== enemyAssignments[index]!.participantId
      || slot.generation < enemyAssignments[index]!.slotGeneration
    ))
  ) throw new RangeError('ModeCheckpointV2 Survival enemy slot identity 与 config 不一致。');
  if (result?.kind === 'survival' && (
    result.playerParticipantId !== playerParticipantId
    || result.fallCount !== fallCount
    || result.survivedTicks !== value.survivedTicks
    || result.pressureStage !== value.pressureStage
  )) throw new RangeError('ModeCheckpointV2 Survival state/result identity 不一致。');
  const survivedTicks = assertIntegerAtLeast(
    value.survivedTicks,
    0,
    'ModeCheckpointV2 Survival survivedTicks',
  );
  if (lastProcessedTick >= 0 && survivedTicks !== lastProcessedTick) {
    throw new RangeError('ModeCheckpointV2 Survival survivedTicks 与已提交tick不一致。');
  }
  return Object.freeze({
    kind: 'survival',
    revision: assertIntegerAtLeast(value.revision, 0, 'ModeCheckpointV2 Survival revision'),
    lastProcessedTick,
    playerParticipantId,
    playerStatus,
    playerRespawnReadyTick,
    fallCount,
    terminalFallCount: 2,
    survivedTicks,
    pressureStage: assertIntegerAtLeast(
      value.pressureStage,
      0,
      'ModeCheckpointV2 Survival pressureStage',
    ),
    enemySlots: Object.freeze(enemySlots),
  });
}

function normalizeCheckpointCore(
  source: Record<string, unknown>,
): Omit<ArenaModeCheckpointV2, 'checkpointIdentityHash'> {
  if (source.checkpointSchemaVersion !== ARENA_MODE_CHECKPOINT_V2_SCHEMA_VERSION) {
    throw new RangeError('ModeCheckpointV2 checkpointSchemaVersion 必须是2。');
  }
  if (source.matchSchemaVersion !== 6) {
    throw new RangeError('ModeCheckpointV2 matchSchemaVersion 必须是6。');
  }
  const identity = assertConfigEnvelope(source);
  const matchSeed = uint32(source.matchSeed, 'ModeCheckpointV2.matchSeed');
  const tick = assertIntegerAtLeast(source.tick, 0, 'ModeCheckpointV2.tick');
  if (!PHASES.has(source.phase)) throw new RangeError('ModeCheckpointV2.phase 不受支持。');
  const phase = source.phase as ArenaModeCheckpointV2['phase'];
  if (identity.config.modeKind !== 'duel' && phase === 'sudden-death') {
    throw new RangeError('ModeCheckpointV2 只有Duel允许sudden-death phase。');
  }
  const eventSequence = assertIntegerAtLeast(
    source.eventSequence,
    0,
    'ModeCheckpointV2.eventSequence',
  );
  const modeResult = source.modeResult === null ? null : createModeResultV3Payload(source.modeResult);
  if ((phase === 'ended') !== (modeResult !== null)) {
    throw new RangeError('ModeCheckpointV2 ended phase 与 result 存在性不一致。');
  }
  if (modeResult !== null) {
    assertResultParticipants(modeResult, identity.config);
    if (modeResult.endedAtTick !== tick - 1) {
      throw new RangeError('ModeCheckpointV2 result终局tick必须等于checkpoint tick-1。');
    }
  }
  let modeState: ArenaModeCheckpointStateV2;
  if (identity.config.modeKind === 'duel') {
    modeState = normalizeDuelState(source.modeState, phase);
  } else if (identity.config.modeKind === 'race') {
    modeState = normalizeRaceState(source.modeState, identity.config, tick, modeResult);
  } else {
    modeState = normalizeSurvivalState(source.modeState, identity.config, tick, modeResult);
  }
  return Object.freeze({
    checkpointSchemaVersion: ARENA_MODE_CHECKPOINT_V2_SCHEMA_VERSION,
    matchSchemaVersion: 6,
    modeDefinitionId: identity.modeDefinitionId,
    contentHash: identity.contentHash,
    configHash: createDeterministicDataHash(identity.config, 'ModeCheckpointV2 config'),
    participantAssignmentHash: createDeterministicDataHash(
      identity.participantAssignments,
      'ModeCheckpointV2 participant assignments',
    ),
    matchSeed,
    config: identity.config,
    participantAssignments: identity.participantAssignments,
    tick,
    phase,
    eventSequence,
    modeState,
    modeResult,
    stateHash: hash(source.stateHash, 'ModeCheckpointV2.stateHash'),
  });
}

function withIdentityHash(
  core: Omit<ArenaModeCheckpointV2, 'checkpointIdentityHash'>,
): ArenaModeCheckpointV2 {
  return Object.freeze({
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'ModeCheckpointV2 identity',
    ),
  });
}

export function createArenaModeCheckpointV2(value: unknown): ArenaModeCheckpointV2 {
  const source = cloneFrozenData(value, 'ModeCheckpointV2 create options');
  exactRecord(source, CREATE_KEYS, 'ModeCheckpointV2 create options');
  return withIdentityHash(normalizeCheckpointCore(source));
}

export function validateArenaModeCheckpointV2(value: unknown): ArenaModeCheckpointV2 {
  const source = cloneFrozenData(value, 'ModeCheckpointV2');
  exactRecord(source, CHECKPOINT_KEYS, 'ModeCheckpointV2');
  const expectedConfigHash = hash(source.configHash, 'ModeCheckpointV2.configHash');
  const expectedAssignmentHash = hash(
    source.participantAssignmentHash,
    'ModeCheckpointV2.participantAssignmentHash',
  );
  const expectedIdentityHash = hash(
    source.checkpointIdentityHash,
    'ModeCheckpointV2.checkpointIdentityHash',
  );
  const checkpoint = withIdentityHash(normalizeCheckpointCore(source));
  if (
    checkpoint.configHash !== expectedConfigHash
    || checkpoint.participantAssignmentHash !== expectedAssignmentHash
    || checkpoint.checkpointIdentityHash !== expectedIdentityHash
  ) throw new RangeError('ModeCheckpointV2 声明hash与重算身份不一致。');
  return checkpoint;
}

export function restoreArenaModeCheckpointV2(
  checkpointValue: unknown,
  optionsValue: unknown,
): RestoredArenaModeCheckpointV2 {
  const checkpoint = validateArenaModeCheckpointV2(checkpointValue);
  const source = cloneFrozenData(optionsValue, 'ModeCheckpointV2 restore options');
  exactRecord(source, RESTORE_KEYS, 'ModeCheckpointV2 restore options');
  const expectedConfig = createArenaMatchConfigV6(source.expectedConfig);
  const expectedMatchSeed = uint32(
    source.expectedMatchSeed,
    'ModeCheckpointV2 restore expectedMatchSeed',
  );
  if (
    checkpoint.matchSeed !== expectedMatchSeed
    || checkpoint.modeDefinitionId !== expectedConfig.modeDefinitionId
    || checkpoint.contentHash !== expectedConfig.modePolicyContentHash
    || checkpoint.configHash !== createDeterministicDataHash(
      expectedConfig,
      'ModeCheckpointV2 expected config',
    )
    || checkpoint.participantAssignmentHash !== createDeterministicDataHash(
      expectedConfig.participantAssignments,
      'ModeCheckpointV2 expected assignments',
    )
  ) throw new RangeError('ModeCheckpointV2 restore config/content/assignment identity 不一致。');
  return Object.freeze({
    config: checkpoint.config,
    matchSeed: checkpoint.matchSeed,
    tick: checkpoint.tick,
    phase: checkpoint.phase,
    eventSequence: checkpoint.eventSequence,
    modeState: checkpoint.modeState,
    modeResult: checkpoint.modeResult,
    stateHash: checkpoint.stateHash,
    checkpointIdentityHash: checkpoint.checkpointIdentityHash,
  });
}
