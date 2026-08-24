import {
  ARENA_MATCH_READ_PROFILE,
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  type ArenaPublicSupplyProjection,
  type BotMobilitySidecarV2,
  type DeepReadonly,
  type FullAuditSidecarV2,
  type MatchReadFrameV2,
  type WorldParticipantSnapshotV2,
  type WorldSnapshotV2,
} from '@number-strategy-jump/arena-contracts';
import {
  MatchCore,
  type MatchReadFrameReader,
  type MatchReadSidecarReader,
} from '@number-strategy-jump/arena-match';

/** Opaque identity shared by the outer composition, Session and BotController. */
export interface BotMatchReadBundleV2 {
  readonly __arenaBotMatchReadBundle?: never;
}

interface BundleRecord {
  readonly core: MatchCore;
  readonly localParticipantId: string;
  readonly botParticipantId: string;
  frameReader: MatchReadFrameReader | null;
  mobilityReader: MatchReadSidecarReader<BotMobilitySidecarV2> | null;
  fullAuditReaders: readonly FullAuditReaderEntry[] | null;
  commandSourceReader: object | null;
  readonly projectionContract: FormalProjectionContract | null;
  readonly requireActiveSupplyProjection: boolean;
  firstRead: boolean;
  initialVerified: boolean;
  valid: boolean;
  activeReadTransaction: ReadTransactionState | null;
  lastReadOutcome: ReadTransactionOutcome | null;
}

interface FullAuditReaderEntry {
  readonly participantId: string;
  readonly reader: MatchReadSidecarReader<FullAuditSidecarV2>;
}

export interface BotMatchReadFullAuditResultV2 {
  readonly worldSnapshot: DeepReadonly<WorldSnapshotV2>;
  readonly sidecars: readonly DeepReadonly<FullAuditSidecarV2>[];
}

type ReadTransactionPhase = 'armed' | 'reading' | 'read' | 'source-failed' | 'source-failed-classified' | 'source-succeeded' | 'fatal' | 'violated';

interface ReadTransactionIdentity {
  readonly commandTick: number;
  readonly commandEventSequence: number;
  readonly phase: string;
}

interface ReadTransactionState {
  readonly record: BundleRecord;
  phase: ReadTransactionPhase;
  identity: ReadTransactionIdentity | null;
  failureClassified: boolean;
}

interface ReadTransactionOutcome {
  readonly phase: 'source-failed' | 'source-succeeded' | 'fatal';
  readonly identity: ReadTransactionIdentity | null;
  readonly transaction: ReadTransactionState;
}

const BUNDLE_RECORDS = new WeakMap<object, BundleRecord>();
const CONSUMED_CORES = new WeakSet<object>();
let FACTORY_ACTIVE = false;
let FACTORY_REENTRY_SEEN = false;

const MATCH_CORE_CONFIG_GETTER = Object.getOwnPropertyDescriptor(MatchCore.prototype, 'config')?.get;
const MATCH_CORE_TICK_GETTER = Object.getOwnPropertyDescriptor(MatchCore.prototype, 'tick')?.get;
const MATCH_CORE_PHASE_GETTER = Object.getOwnPropertyDescriptor(MatchCore.prototype, 'phase')?.get;
const MATCH_CORE_CREATE_BINDING = Object.getOwnPropertyDescriptor(MatchCore.prototype, 'createMatchReadBinding')?.value;
const MATCH_CORE_CREATE_FRAME_READER = Object.getOwnPropertyDescriptor(MatchCore.prototype, 'createMatchReadFrameReader')?.value;
const MATCH_CORE_CREATE_SIDECAR_READER = Object.getOwnPropertyDescriptor(MatchCore.prototype, 'createMatchReadSidecarReader')?.value;
if (
  MATCH_CORE_CONFIG_GETTER === undefined
  || typeof MATCH_CORE_CREATE_BINDING !== 'function'
  || typeof MATCH_CORE_CREATE_FRAME_READER !== 'function'
  || typeof MATCH_CORE_CREATE_SIDECAR_READER !== 'function'
  || typeof MATCH_CORE_TICK_GETTER !== 'function'
  || typeof MATCH_CORE_PHASE_GETTER !== 'function'
) throw new Error('MatchCore MatchRead native API 初始化捕获失败。');

const BUNDLE_OPTION_KEYS = new Set([
  'ownedNewCore',
  'descriptor',
  'localId',
  'botId',
  'projectionContract',
]);
const DESCRIPTOR_KEYS = new Set([
  'schemaVersion',
  'compositionId',
  'participantIds',
  'mapDefinitionId',
  'contentSelectionHash',
  'compositionContractHash',
]);
const SOURCE_KEYS = new Set([
  'schemaVersion',
  'commandTick',
  'commandEventSequence',
  'phase',
  'remainingTicks',
  'self',
  'opponent',
  'botMobility',
  'equipment',
  'map',
]);
const ACTION_KEYS = new Set(['definitionId', 'phase', 'ticksRemaining', 'commitment']);
const ACTION_REQUIRED_KEYS = new Set(['definitionId', 'phase', 'ticksRemaining']);
const ACTION_COMMITMENT_KEYS = new Set([
  'status', 'chargeTicks', 'chargeLevel', 'facingAtStart', 'facingAtResult',
]);
const ACTION_RULE_KEYS = new Set([
  'definitionId',
  'targetingKind',
  'range',
  'minimumFacingDot',
  'maximumVerticalDifference',
  'windupTicks',
  'activeTicks',
  'recoveryTicks',
  'minimumCommitmentTicks',
]);
const HELD_EQUIPMENT_KEYS = new Set([
  'instanceId',
  'definitionId',
  'cooldownRemainingTicks',
]);
const VECTOR3_KEYS = new Set(['x', 'y', 'z']);
const VISIBLE_EQUIPMENT_KEYS = new Set([
  'instanceId',
  'definitionId',
  'locationState',
  'remainingTicks',
  'position',
]);
const BOT_MOBILITY_KEYS = new Set([
  'schemaVersion',
  'tick',
  'eventSequence',
  'participantId',
  'profile',
  'channels',
]);
const CHANNEL_KEYS = new Set(['jump', 'slam']);
const OUTCOME_KEYS = new Set([
  'kind',
  'actionDefinitionId',
  'lane',
  'source',
  'reason',
]);
const FULL_AUDIT_KEYS = new Set([
  'schemaVersion',
  'tick',
  'eventSequence',
  'participantId',
  'profile',
  'primaryActionDefinitionId',
  'channels',
]);
const FULL_AUDIT_CHANNEL_KEYS = new Set(['primary', 'primaryHold', 'jump', 'slam']);

function requireOwnKeys(value: object, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
}

function requireNonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function requireSafeTick(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return value as number;
}

function requireHash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError(`${name} 必须是 8 位小写十六进制 hash。`);
  }
  return value;
}

function requireExactKeys(value: unknown, keys: ReadonlySet<string>, name: string): Record<string, unknown> {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, keys, name);
  requireOwnKeys(record, keys, name);
  return record;
}

function captureOptions(value: unknown): Readonly<Record<string, unknown>> {
  const source = assertPlainRecord(value, 'Bot match read bundle options');
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(source)) {
    if (typeof key !== 'string') throw new TypeError('Bot match read bundle options 不能包含 Symbol。');
    if (!BUNDLE_OPTION_KEYS.has(key)) throw new RangeError(`Bot match read bundle options 不支持字段 ${key}。`);
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`Bot match read bundle options.${key} 必须是可枚举数据字段。`);
    }
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}

/**
 * Checks the already-composed read model in place. It deliberately does not
 * clone or read getters: all mutable input was captured by MatchCore's own
 * strict reader before this boundary. A privatePlan anywhere is still a
 * contract violation, even when nested below a public payload.
 */
function assertFrozenPlainData(
  value: unknown,
  name: string,
  active = new WeakSet<object>(),
): void {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${name} 不能包含非有限数。`);
    return;
  }
  if (typeof value !== 'object') throw new TypeError(`${name} 只能包含 plain data。`);
  const object = value as object;
  if (active.has(object)) throw new TypeError(`${name} 不能包含循环引用。`);
  if (!Object.isFrozen(object)) throw new TypeError(`${name} 必须是递归冻结数据。`);
  const prototype = Object.getPrototypeOf(object);
  if (!Array.isArray(object) && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 只能包含 plain object 或 array。`);
  }
  const keys = Reflect.ownKeys(object);
  if (keys.some((key) => typeof key !== 'string')) {
    throw new TypeError(`${name} 不能包含 Symbol。`);
  }
  const stringKeys = keys as string[];
  active.add(object);
  try {
    if (Array.isArray(object)) {
      const expected = new Set(['length']);
      for (let index = 0; index < object.length; index += 1) expected.add(String(index));
      if (stringKeys.some((key) => !expected.has(key))) {
        throw new TypeError(`${name} 数组不能包含额外字段。`);
      }
      for (let index = 0; index < object.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(object, String(index));
        if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
          throw new TypeError(`${name}[${index}] 必须是可枚举数据字段。`);
        }
        assertFrozenPlainData(descriptor.value, `${name}[${index}]`, active);
      }
      return;
    }
    for (const key of stringKeys) {
      if (key === 'privatePlan') throw new TypeError(`${name} 不得包含 privatePlan。`);
      const descriptor = Object.getOwnPropertyDescriptor(object, key);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
        throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
      }
      assertFrozenPlainData(descriptor.value, `${name}.${key}`, active);
    }
  } finally {
    active.delete(object);
  }
}

function freezeConstructedPlainData(
  value: unknown,
  name: string,
  active = new WeakSet<object>(),
): void {
  if (value === null || typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number') return;
  if (typeof value !== 'object') throw new TypeError(`${name} 只能包含 plain data。`);
  const object = value as object;
  if (active.has(object)) throw new TypeError(`${name} 不能包含循环引用。`);
  const prototype = Object.getPrototypeOf(object);
  if (!Array.isArray(object) && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 只能包含 plain object 或 array。`);
  }
  const keys = Reflect.ownKeys(object);
  if (keys.some((key) => typeof key !== 'string')) throw new TypeError(`${name} 不能包含 Symbol。`);
  const stringKeys = keys as string[];
  active.add(object);
  try {
    if (Array.isArray(object)) {
      const expected = new Set(['length']);
      for (let index = 0; index < object.length; index += 1) expected.add(String(index));
      if (stringKeys.some((key) => !expected.has(key))) throw new TypeError(`${name} 数组不能包含额外字段。`);
    }
    for (const key of stringKeys) {
      if (key === 'privatePlan') throw new TypeError(`${name} 不得包含 privatePlan。`);
      const descriptor = Object.getOwnPropertyDescriptor(object, key);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
        if (key === 'length' && Array.isArray(object)) continue;
        throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
      }
      freezeConstructedPlainData(descriptor.value, `${name}.${key}`, active);
    }
    Object.freeze(object);
  } finally {
    active.delete(object);
  }
}

function assertDataOutcome(value: unknown, name: string): void {
  const outcome = requireExactKeys(value, OUTCOME_KEYS, name);
  requireNonEmptyString(outcome.kind, `${name}.kind`);
  if (outcome.actionDefinitionId !== null) requireNonEmptyString(outcome.actionDefinitionId, `${name}.actionDefinitionId`);
  if (outcome.lane !== null) requireNonEmptyString(outcome.lane, `${name}.lane`);
  if (outcome.source !== null) requireNonEmptyString(outcome.source, `${name}.source`);
  requireNonEmptyString(outcome.reason, `${name}.reason`);
}

function assertBotMobility(value: unknown, name: string): BotMobilitySidecarV2 {
  const sidecar = requireExactKeys(value, BOT_MOBILITY_KEYS, name);
  if (sidecar.schemaVersion !== 2) throw new RangeError(`${name}.schemaVersion 必须是 2。`);
  requireSafeTick(sidecar.tick, `${name}.tick`);
  requireSafeTick(sidecar.eventSequence, `${name}.eventSequence`);
  requireNonEmptyString(sidecar.participantId, `${name}.participantId`);
  if (sidecar.profile !== ARENA_MATCH_READ_PROFILE.BOT_MOBILITY) {
    throw new RangeError(`${name}.profile 不匹配。`);
  }
  const channels = requireExactKeys(sidecar.channels, CHANNEL_KEYS, `${name}.channels`);
  assertDataOutcome(channels.jump, `${name}.channels.jump`);
  assertDataOutcome(channels.slam, `${name}.channels.slam`);
  return sidecar as unknown as BotMobilitySidecarV2;
}

function assertFullAuditSidecar(value: unknown, name: string): FullAuditSidecarV2 {
  const sidecar = requireExactKeys(value, FULL_AUDIT_KEYS, name);
  if (sidecar.schemaVersion !== 2) throw new RangeError(`${name}.schemaVersion 必须是 2。`);
  requireSafeTick(sidecar.tick, `${name}.tick`);
  requireSafeTick(sidecar.eventSequence, `${name}.eventSequence`);
  requireNonEmptyString(sidecar.participantId, `${name}.participantId`);
  if (sidecar.profile !== ARENA_MATCH_READ_PROFILE.FULL_AUDIT) {
    throw new RangeError(`${name}.profile 不匹配。`);
  }
  if (sidecar.primaryActionDefinitionId !== null) {
    requireNonEmptyString(sidecar.primaryActionDefinitionId, `${name}.primaryActionDefinitionId`);
  }
  const channels = requireExactKeys(sidecar.channels, FULL_AUDIT_CHANNEL_KEYS, `${name}.channels`);
  for (const channel of FULL_AUDIT_CHANNEL_KEYS) {
    assertDataOutcome(channels[channel], `${name}.channels.${channel}`);
  }
  return sidecar as unknown as FullAuditSidecarV2;
}

function assertDescriptor(
  value: unknown,
  config: Readonly<{
    readonly participantIds: readonly string[];
    readonly mapDefinitionId: string;
    readonly contentSelectionHash: string | null;
  }>,
  formal: boolean,
): Readonly<Record<string, unknown>> {
  const source = assertPlainRecord(value, 'MatchReadBinding descriptor');
  assertKnownKeys(source, DESCRIPTOR_KEYS, 'MatchReadBinding descriptor');
  requireOwnKeys(source, new Set([
    'schemaVersion',
    'compositionId',
    'participantIds',
    'mapDefinitionId',
    'contentSelectionHash',
    'compositionContractHash',
  ]), 'MatchReadBinding descriptor');
  if (source.schemaVersion !== 1) throw new RangeError('MatchReadBinding descriptor schemaVersion 必须是 1。');
  requireNonEmptyString(source.compositionId, 'MatchReadBinding descriptor.compositionId');
  if (!Array.isArray(source.participantIds) || source.participantIds.length !== config.participantIds.length) {
    throw new RangeError('MatchReadBinding descriptor participantIds 与 Core 不一致。');
  }
  source.participantIds.forEach((id, index) => {
    if (id !== config.participantIds[index]) {
      throw new RangeError('MatchReadBinding descriptor participantIds 顺序与 Core 不一致。');
    }
  });
  if (source.mapDefinitionId !== config.mapDefinitionId) {
    throw new RangeError('MatchReadBinding descriptor mapDefinitionId 与 Core 不一致。');
  }
  if (source.contentSelectionHash !== config.contentSelectionHash) {
    throw new RangeError('MatchReadBinding descriptor contentSelectionHash 与 Core 不一致。');
  }
  const expectedCompositionId = formal
    ? 'arena-v2-survival-supply.v1'
    : 'arena-quick-match.v2';
  if (source.compositionId !== expectedCompositionId) {
    throw new RangeError(`MatchReadBinding descriptor compositionId 必须是 ${expectedCompositionId}。`);
  }
  const compositionContractHash = source.compositionContractHash;
  if (formal) {
    const hash = requireHash(compositionContractHash, 'MatchReadBinding descriptor compositionContractHash');
    if (hash === 'deadbeef') throw new RangeError('formal compositionContractHash 不得使用占位 hash。');
  } else if (compositionContractHash !== undefined && compositionContractHash !== null) {
    throw new RangeError('ordinary Bot match read bundle 不得携带 compositionContractHash。');
  }
  return source;
}

function projectParticipant(source: WorldParticipantSnapshotV2): Record<string, unknown> {
  const participant = requireExactKeys(source, new Set([
    'id', 'characterDefinitionId', 'status', 'lives', 'eliminations', 'deaths',
    'hitstunTicks', 'invulnerableTicks', 'respawnTicks', 'lastHitBy', 'lastHitTick',
    'action', 'actionRule', 'movement', 'equipment', 'position', 'velocity', 'facing',
    'grounded', 'supportSurfaceId',
  ]), 'BotCommandSourceV5 participant');
  const action = assertPlainRecord(participant.action, 'BotCommandSourceV5 participant.action');
  assertKnownKeys(action, ACTION_KEYS, 'BotCommandSourceV5 participant.action');
  requireOwnKeys(action, ACTION_REQUIRED_KEYS, 'BotCommandSourceV5 participant.action');
  const actionRule = requireExactKeys(participant.actionRule, ACTION_RULE_KEYS, 'BotCommandSourceV5 participant.actionRule');
  const movement = requireExactKeys(participant.movement, new Set([
    'schemaVersion', 'participantId', 'characterDefinitionId', 'mode',
    'coyoteTicksRemaining', 'jumpBufferTicksRemaining', 'airJumpsUsed',
    'crouchChargeTicks', 'crouchActionId', 'downSmashActionId', 'revision', 'grounded',
  ]), 'BotCommandSourceV5 participant.movement');
  if (participant.lastHitBy === undefined || participant.lastHitTick === undefined) {
    throw new TypeError('BotCommandSourceV5 participant last-hit 字段缺失。');
  }
  if (participant.equipment !== null) {
    requireExactKeys(participant.equipment, HELD_EQUIPMENT_KEYS, 'BotCommandSourceV5 participant.equipment');
  }
  // The output object is deliberately assembled field by field; no generic
  // participant key can be silently carried into the V5 source.
  void actionRule;
  const commitment = action.commitment === undefined
    ? null
    : requireExactKeys(
        action.commitment,
        ACTION_COMMITMENT_KEYS,
        'BotCommandSourceV5 participant.action.commitment',
      );
  const result = {
    id: participant.id,
    characterDefinitionId: participant.characterDefinitionId,
    status: participant.status,
    lives: participant.lives,
    eliminations: participant.eliminations,
    deaths: participant.deaths,
    hitstunTicks: participant.hitstunTicks,
    invulnerableTicks: participant.invulnerableTicks,
    respawnTicks: participant.respawnTicks,
    action: Object.freeze({
      definitionId: action.definitionId,
      phase: action.phase,
      ticksRemaining: action.ticksRemaining,
      primaryCommitment: commitment === null ? null : Object.freeze({
        status: commitment.status,
        chargeTicks: commitment.chargeTicks,
      }),
    }),
    actionRule: participant.actionRule,
    movement: Object.freeze({
      schemaVersion: movement.schemaVersion,
      mode: movement.mode,
      airJumpsUsed: movement.airJumpsUsed,
      crouchChargeTicks: movement.crouchChargeTicks,
      grounded: movement.grounded,
    }),
    equipment: participant.equipment === null ? null : Object.freeze({
      instanceId: (participant.equipment as Record<string, unknown>).instanceId,
      definitionId: (participant.equipment as Record<string, unknown>).definitionId,
      cooldownRemainingTicks: (participant.equipment as Record<string, unknown>).cooldownRemainingTicks,
    }),
    position: participant.position,
    velocity: participant.velocity,
    facing: participant.facing,
    grounded: participant.grounded,
    supportSurfaceId: participant.supportSurfaceId,
  };
  return Object.freeze(result);
}

interface FormalProjectionContract {
  readonly supplyDefinitionId: string;
  readonly firstSpawnTick: number;
  readonly spawnIntervalTicks: number;
  readonly spawnCount: number;
  readonly lifetimeTicks: number;
  readonly spawnSpecs: readonly Readonly<{
    readonly slotId: string;
    readonly equipmentDefinitionId: string;
    readonly spawnId: string;
    readonly position: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
  }>[];
  readonly equipmentDefinitionIds: readonly string[];
}

function normalizeProjectionContract(value: unknown): FormalProjectionContract {
  const cloned = cloneFrozenData(value, 'Bot match read bundle projectionContract');
  const source = requireExactKeys(cloned, new Set([
    'supplyDefinitionId',
    'firstSpawnTick',
    'spawnIntervalTicks',
    'spawnCount',
    'lifetimeTicks',
    'spawnSpecs',
    'equipmentDefinitionIds',
  ]), 'Bot match read bundle projectionContract');
  const supplyDefinitionId = requireNonEmptyString(source.supplyDefinitionId, 'projectionContract.supplyDefinitionId');
  const firstSpawnTick = requireSafeTick(source.firstSpawnTick, 'projectionContract.firstSpawnTick');
  const spawnIntervalTicks = requireSafeTick(source.spawnIntervalTicks, 'projectionContract.spawnIntervalTicks');
  const spawnCount = requireSafeTick(source.spawnCount, 'projectionContract.spawnCount');
  const lifetimeTicks = requireSafeTick(source.lifetimeTicks, 'projectionContract.lifetimeTicks');
  if (spawnIntervalTicks < 1 || spawnCount < 1 || lifetimeTicks < 1 || lifetimeTicks >= spawnIntervalTicks) {
    throw new RangeError('projectionContract lifecycle 正数约束失败。');
  }
  if (!Array.isArray(source.spawnSpecs) || source.spawnSpecs.length !== spawnCount) {
    throw new RangeError('projectionContract.spawnSpecs 与 spawnCount 不一致。');
  }
  if (!Array.isArray(source.equipmentDefinitionIds)) throw new TypeError('projectionContract.equipmentDefinitionIds 必须是数组。');
  const definitionIds = source.equipmentDefinitionIds.map((id, index) => requireNonEmptyString(id, `projectionContract.equipmentDefinitionIds[${index}]`));
  if (new Set(definitionIds).size !== definitionIds.length) throw new RangeError('projectionContract.equipmentDefinitionIds 不能重复。');
  const knownDefinitions = new Set(definitionIds);
  const slots = new Set<string>();
  const spawnSpecs = source.spawnSpecs.map((value, index) => {
    const spec = requireExactKeys(value, new Set(['slotId', 'equipmentDefinitionId', 'spawnId', 'position']), `projectionContract.spawnSpecs[${index}]`);
    const slotId = requireNonEmptyString(spec.slotId, `projectionContract.spawnSpecs[${index}].slotId`);
    const equipmentDefinitionId = requireNonEmptyString(spec.equipmentDefinitionId, `projectionContract.spawnSpecs[${index}].equipmentDefinitionId`);
    const spawnId = requireNonEmptyString(spec.spawnId, `projectionContract.spawnSpecs[${index}].spawnId`);
    if (slots.has(slotId) || !knownDefinitions.has(equipmentDefinitionId)) throw new RangeError('projectionContract spawn spec identity 无效。');
    slots.add(slotId);
    const position = requireExactKeys(spec.position, VECTOR3_KEYS, `projectionContract.spawnSpecs[${index}].position`);
    for (const axis of VECTOR3_KEYS) {
      if (typeof position[axis] !== 'number' || !Number.isFinite(position[axis] as number)) throw new TypeError('projectionContract position 无效。');
    }
    return Object.freeze({
      slotId,
      equipmentDefinitionId,
      spawnId,
      position: Object.freeze({
        x: position.x as number,
        y: position.y as number,
        z: position.z as number,
      }),
    });
  }).sort((left, right) => left.slotId < right.slotId ? -1 : left.slotId > right.slotId ? 1 : 0);
  return Object.freeze({
    supplyDefinitionId,
    firstSpawnTick,
    spawnIntervalTicks,
    spawnCount,
    lifetimeTicks,
    spawnSpecs: Object.freeze(spawnSpecs),
    equipmentDefinitionIds: Object.freeze(definitionIds),
  });
}

function parseSupplyIdentity(
  instanceId: string,
  contract: FormalProjectionContract,
): Readonly<{
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly slotId: string;
  readonly equipmentDefinitionId: string;
  readonly spawnId: string;
  readonly spawnPosition: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
  readonly spawnTick: number;
  readonly expireTick: number;
}> | null {
  const prefix = `${contract.supplyDefinitionId}:`;
  if (!instanceId.startsWith(prefix)) return null;
  const match = new RegExp(`^${contract.supplyDefinitionId.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}:wave-(\\d+):slot-([A-Za-z0-9._-]+):equipment$`).exec(instanceId);
  if (!match || match[1] === undefined || match[2] === undefined || String(Number(match[1])) !== match[1]) {
    throw new RangeError(`formal supply instanceId 非法：${instanceId}。`);
  }
  const wave = Number(match[1]);
  const slotId = match[2];
  const spec = contract.spawnSpecs.find((candidate) => candidate.slotId === slotId);
  if (!spec || !Number.isSafeInteger(wave) || wave < 0) throw new RangeError(`formal supply instanceId 未绑定 spawn spec：${instanceId}。`);
  const supplyId = `${contract.supplyDefinitionId}:wave-${wave}:slot-${slotId}`;
  const equipmentInstanceId = `${supplyId}:equipment`;
  if (equipmentInstanceId !== instanceId) throw new RangeError(`formal supply instanceId canonical identity 不一致：${instanceId}。`);
  const spawnTick = contract.firstSpawnTick + contract.spawnIntervalTicks * wave;
  const expireTick = spawnTick + contract.lifetimeTicks;
  if (!Number.isSafeInteger(spawnTick) || !Number.isSafeInteger(expireTick)) throw new RangeError('formal supply lifecycle 超出安全整数。');
  return { supplyId, equipmentInstanceId, slotId, equipmentDefinitionId: spec.equipmentDefinitionId, spawnId: spec.spawnId, spawnPosition: spec.position, spawnTick, expireTick };
}

function samePosition(left: unknown, right: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>): boolean {
  const value = requireExactKeys(left, VECTOR3_KEYS, 'equipment.position');
  return value.x === right.x && value.y === right.y && value.z === right.z;
}

function validateProjection(
  world: WorldSnapshotV2,
  projectionContract: FormalProjectionContract | null,
): ArenaPublicSupplyProjection | null {
  const projection = world.activeSupplyProjection;
  if (projectionContract === null) {
    if (projection !== null) throw new Error('ordinary Bot command source 不得携带 activeSupplyProjection。');
    return null;
  }
  if (projection === null) throw new Error('formal survival Bot command source 缺少 activeSupplyProjection。');
  const projectionRecord = requireExactKeys(projection, new Set([
    'schemaVersion', 'snapshotTick', 'snapshotEventSequence', 'resyncReadiness',
    'pendingAuthorityTick', 'pendingExpiryEquipmentInstanceIds', 'supplies',
  ]), 'ArenaPublicSupplyProjection');
  if (projectionRecord.schemaVersion !== 2 || projectionRecord.snapshotTick !== world.tick || projectionRecord.snapshotEventSequence !== world.eventSequence) throw new Error('formal projection identity 不一致。');
  if (!Array.isArray(projectionRecord.pendingExpiryEquipmentInstanceIds) || !Array.isArray(projectionRecord.supplies)) throw new TypeError('formal projection 集合字段无效。');
  if (projectionRecord.pendingExpiryEquipmentInstanceIds.length > 3 || projectionRecord.supplies.length > 3) throw new RangeError('formal projection 超过有界数量。');
  const pendingIds = new Set<string>();
  for (const id of projectionRecord.pendingExpiryEquipmentInstanceIds) {
    const parsed = parseSupplyIdentity(requireNonEmptyString(id, 'formal projection pending id'), projectionContract);
    if (!parsed || parsed.expireTick !== world.tick || pendingIds.has(id)) throw new RangeError('formal projection pending identity 无效。');
    pendingIds.add(id);
  }
  const activeWorldIds = new Set<string>();
  const pendingWorldIds = new Set<string>();
  for (const equipment of world.equipment) {
    const worldState = equipment.locationState === 'spawned' || equipment.locationState === 'dropped';
    const parsed = parseSupplyIdentity(equipment.instanceId, projectionContract);
    if (parsed === null) {
      if (worldState) throw new RangeError(`formal world equipment ${equipment.instanceId} 未映射。`);
      continue;
    }
    if (equipment.definitionId !== parsed.equipmentDefinitionId || equipment.spawnId !== parsed.spawnId) throw new RangeError('formal equipment definition/spawn 不一致。');
    if (world.tick < parsed.spawnTick) throw new RangeError('formal equipment 在 spawnTick 前出现。');
    if (!worldState) continue;
    if (equipment.position === null || equipment.ownerId !== null) throw new RangeError('formal world equipment owner/position 不一致。');
    if (world.tick > parsed.expireTick) throw new RangeError('formal world equipment 在 expireTick 后残留。');
    if (world.tick === parsed.expireTick) pendingWorldIds.add(equipment.instanceId);
    else activeWorldIds.add(equipment.instanceId);
  }
  // MatchCore may filter the terminal world runtime before publishing the
  // command view. Pending metadata is therefore independently authoritative
  // for the exact expiry boundary; every still-visible pending runtime must
  // be named, but a pending ID may legitimately be absent from world.equipment.
  if ([...pendingWorldIds].some((id) => !pendingIds.has(id))) throw new RangeError('formal pending world identity 不一致。');
  const supplies = new Set<string>();
  for (const value of projectionRecord.supplies) {
    const item = requireExactKeys(value, new Set([
      'schemaVersion', 'supplyDefinitionId', 'supplyId', 'slotId', 'equipmentInstanceId',
      'equipmentDefinitionId', 'equipmentSpawnId', 'spawnPosition', 'spawnTick', 'expireTick', 'remainingTicks', 'position',
    ]), 'formal projection supply');
    const parsed = parseSupplyIdentity(requireNonEmptyString(item.equipmentInstanceId, 'formal projection equipmentInstanceId'), projectionContract);
    if (!parsed || supplies.has(item.equipmentInstanceId as string) || !activeWorldIds.has(item.equipmentInstanceId as string)) throw new RangeError('formal projection supply identity 不一致。');
    if (item.schemaVersion !== 2 || item.supplyDefinitionId !== projectionContract.supplyDefinitionId || item.supplyId !== parsed.supplyId || item.slotId !== parsed.slotId || item.equipmentDefinitionId !== parsed.equipmentDefinitionId || item.equipmentSpawnId !== parsed.spawnId || item.spawnTick !== parsed.spawnTick || item.expireTick !== parsed.expireTick || item.remainingTicks !== parsed.expireTick - world.tick || item.remainingTicks <= 0 || !samePosition(item.spawnPosition, parsed.spawnPosition)) throw new RangeError('formal projection supply lifecycle 不一致。');
    const runtime = world.equipment.find((candidate) => candidate.instanceId === item.equipmentInstanceId);
    if (!runtime || runtime.position === null || !samePosition(item.position, runtime.position)) throw new RangeError('formal projection supply position 不一致。');
    supplies.add(item.equipmentInstanceId as string);
  }
  if (supplies.size !== activeWorldIds.size || [...activeWorldIds].some((id) => !supplies.has(id))) throw new RangeError('formal active world/projection 集合不一致。');
  if (projectionRecord.resyncReadiness === 'not-ready-pre-expiry') {
    if (projectionRecord.pendingAuthorityTick !== world.tick || projectionRecord.supplies.length !== 0 || pendingIds.size === 0) throw new RangeError('formal projection not-ready 语义无效。');
  } else if (projectionRecord.resyncReadiness === 'ready') {
    if (projectionRecord.pendingAuthorityTick !== null || pendingIds.size !== 0) throw new RangeError('formal projection ready 语义无效。');
  } else throw new RangeError('formal projection readiness 无效。');
  return projection;
}

function visibleEquipment(
  world: WorldSnapshotV2,
  projection: ArenaPublicSupplyProjection | null,
  formal: boolean,
): readonly Record<string, unknown>[] {
  const remainingByInstance = new Map<string, number>();
  const pendingIds = new Set<string>();
  if (projection !== null) {
    for (const item of projection.supplies) remainingByInstance.set(item.equipmentInstanceId, item.remainingTicks);
    for (const id of projection.pendingExpiryEquipmentInstanceIds) pendingIds.add(id);
  }
  const result = world.equipment
    .filter((equipment) => (
      (equipment.locationState === 'spawned' || equipment.locationState === 'dropped')
      && !(formal && pendingIds.has(equipment.instanceId))
    ))
    .map((equipment) => {
      if (equipment.position === null) throw new Error('Bot command source 世界供给缺少可见位置。');
      const remainingTicks = remainingByInstance.get(equipment.instanceId) ?? null;
      if (formal && remainingTicks === null && !pendingIds.has(equipment.instanceId)) {
        throw new Error(`formal world supply ${equipment.instanceId} 缺少 projection remainingTicks。`);
      }
      return Object.freeze({
        instanceId: equipment.instanceId,
        definitionId: equipment.definitionId,
        locationState: equipment.locationState,
        remainingTicks,
        position: equipment.position,
      });
    })
    .sort((left, right) => (left.instanceId < right.instanceId ? -1 : left.instanceId > right.instanceId ? 1 : 0));
  return Object.freeze(result);
}

function assertSource(
  value: unknown,
  name = 'BotCommandSourceV5',
): void {
  const source = requireExactKeys(value, SOURCE_KEYS, name);
  if (source.schemaVersion !== 5) throw new RangeError(`${name}.schemaVersion 必须是 5。`);
  requireSafeTick(source.commandTick, `${name}.commandTick`);
  requireSafeTick(source.commandEventSequence, `${name}.commandEventSequence`);
  requireNonEmptyString(source.phase, `${name}.phase`);
  requireSafeTick(source.remainingTicks, `${name}.remainingTicks`);
  const mobility = requireExactKeys(source.botMobility, BOT_MOBILITY_KEYS, `${name}.botMobility`);
  assertBotMobility(mobility, `${name}.botMobility`);
  const equipment = source.equipment;
  if (!Array.isArray(equipment)) throw new TypeError(`${name}.equipment 必须是数组。`);
  equipment.forEach((item, index) => {
    const visible = requireExactKeys(item, VISIBLE_EQUIPMENT_KEYS, `${name}.equipment[${index}]`);
    requireNonEmptyString(visible.instanceId, `${name}.equipment[${index}].instanceId`);
    requireNonEmptyString(visible.definitionId, `${name}.equipment[${index}].definitionId`);
    if (visible.locationState !== 'spawned' && visible.locationState !== 'dropped') {
      throw new RangeError(`${name}.equipment[${index}].locationState 无效。`);
    }
    if (visible.remainingTicks !== null) requireSafeTick(visible.remainingTicks, `${name}.equipment[${index}].remainingTicks`);
    const position = requireExactKeys(visible.position, VECTOR3_KEYS, `${name}.equipment[${index}].position`);
    for (const axis of VECTOR3_KEYS) {
      if (typeof position[axis] !== 'number' || !Number.isFinite(position[axis] as number)) {
        throw new TypeError(`${name}.equipment[${index}].position.${axis} 无效。`);
      }
    }
  });
}

function readTransactionIdentity(source: Record<string, unknown>): ReadTransactionIdentity {
  return {
    commandTick: source.commandTick as number,
    commandEventSequence: source.commandEventSequence as number,
    phase: source.phase as string,
  };
}

function sameReadTransactionIdentity(
  left: ReadTransactionIdentity,
  right: ReadTransactionIdentity,
): boolean {
  return left.commandTick === right.commandTick
    && left.commandEventSequence === right.commandEventSequence
    && left.phase === right.phase;
}

const FRAME_SOURCE_KEYS = new Set(['schemaVersion', 'worldSnapshot', 'localActionSidecar']);
const WORLD_SNAPSHOT_KEYS = new Set([
  'authoritySchemaVersion', 'physicsBackendVersion', 'configHash', 'ruleContentHash', 'matchSeed',
  'tick', 'activeTick', 'phase', 'remainingTicks', 'eventSequence', 'participants', 'equipment',
  'activeSupplyProjection', 'map', 'result',
]);
const LOCAL_SIDECAR_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'participantId', 'profile',
  'primaryActionDefinitionId', 'channels',
]);

function readNativeCoreReadIdentity(core: MatchCore): {
  readonly tick: number;
  readonly phase: string;
} {
  const prototype = MatchCore.prototype;
  if (
    Object.getOwnPropertyDescriptor(prototype, 'tick')?.get !== MATCH_CORE_TICK_GETTER
    || Object.getOwnPropertyDescriptor(prototype, 'phase')?.get !== MATCH_CORE_PHASE_GETTER
    || Object.getOwnPropertyDescriptor(core, 'tick') !== undefined
    || Object.getOwnPropertyDescriptor(core, 'phase') !== undefined
  ) throw new Error('MatchCore read identity 原型或 own shadow 已漂移。');
  const tick = Reflect.apply(MATCH_CORE_TICK_GETTER as (...args: unknown[]) => unknown, core, []);
  const phase = Reflect.apply(MATCH_CORE_PHASE_GETTER as (...args: unknown[]) => unknown, core, []);
  if (!Number.isSafeInteger(tick) || typeof phase !== 'string') {
    throw new TypeError('MatchCore read identity 不合法。');
  }
  return { tick: tick as number, phase };
}

/** Package-private seam used by this bundle and its focused adversarial tests. */
export function buildBotCommandSourceV5ForBundle(
  frameValue: unknown,
  mobilityValue: unknown,
  options: Readonly<{
    readonly localParticipantId: string;
    readonly botParticipantId: string;
    readonly projectionContract: FormalProjectionContract | null;
  }>,
): Record<string, unknown> {
  const frame = requireExactKeys(frameValue, FRAME_SOURCE_KEYS, 'Bot match read frame');
  if (frame.schemaVersion !== 2) throw new RangeError('Bot match read frame schemaVersion 必须是 2。');
  const localSidecar = requireExactKeys(frame.localActionSidecar, LOCAL_SIDECAR_KEYS, 'Bot match local sidecar');
  const world = frame.worldSnapshot as WorldSnapshotV2;
  if (
    localSidecar.participantId !== options.localParticipantId
    || localSidecar.tick !== world.tick
    || localSidecar.eventSequence !== world.eventSequence
    || localSidecar.profile !== ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY
  ) throw new Error('Bot match read bundle local frame identity 不一致。');
  const mobility = assertBotMobility(mobilityValue, 'Bot match mobility sidecar');
  if (
    mobility.participantId !== options.botParticipantId
    || mobility.tick !== world.tick
    || mobility.eventSequence !== world.eventSequence
  ) throw new Error('Bot match read bundle mobility identity 不一致。');
  if (!Array.isArray(world.participants) || world.participants.length !== 2) {
    throw new Error('Bot match read bundle participant 集合必须精确包含两个 participant。');
  }
  const participants = world.participants;
  const bot = participants.find((participant) => participant.id === options.botParticipantId);
  const local = participants.find((participant) => participant.id === options.localParticipantId);
  if (bot === undefined || local === undefined || bot === local) throw new Error('Bot match read bundle participant 身份不一致。');
  const projection = validateProjection(world, options.projectionContract);
  const source = {
    schemaVersion: 5 as const,
    commandTick: world.tick,
    commandEventSequence: world.eventSequence,
    phase: world.phase,
    remainingTicks: world.remainingTicks,
    self: projectParticipant(bot),
    opponent: projectParticipant(local),
    botMobility: mobility,
    equipment: visibleEquipment(world, projection, options.projectionContract !== null),
    map: world.map,
  };
  assertSource(source);
  return Object.freeze(source);
}

function buildCommandSource(record: BundleRecord): Record<string, unknown> {
  if (!record.valid) throw new Error('Bot match read bundle 已失效。');
  const frameReader = record.frameReader;
  const mobilityReader = record.mobilityReader;
  if (frameReader === null || mobilityReader === null) throw new Error('Bot match read bundle reader 已释放。');
  const source = buildBotCommandSourceV5ForBundle(
    frameReader.read(),
    mobilityReader.read(),
    {
      localParticipantId: record.localParticipantId,
      botParticipantId: record.botParticipantId,
      projectionContract: record.projectionContract,
    },
  );
  if (record.firstRead === true) {
    freezeConstructedPlainData(source, 'BotCommandSourceV5');
    assertFrozenPlainData(source, 'BotCommandSourceV5');
    record.firstRead = false;
    record.initialVerified = true;
  } else {
    Object.freeze(source);
  }
  if (record.initialVerified !== true) throw new Error('Bot match read bundle initial source verification 状态无效。');
  return source;
}

function createCommandSourceReader(record: BundleRecord): object {
  const reader = {
    read(): unknown {
      if (!record.valid) throw new Error('Bot match read bundle 已失效。');
      const transaction = record.activeReadTransaction;
      if (transaction === null) {
        throw new Error('Bot match read bundle source 读取必须先 arm。');
      }
      if (transaction.phase !== 'armed') {
        transaction.phase = 'violated';
        record.activeReadTransaction = null;
        throw new Error('Bot match read bundle source transaction 已违反单次读取合同。');
      }
      transaction.phase = 'reading';
      try {
        const source = buildCommandSource(record);
        const identity = readTransactionIdentity(source);
        transaction.identity = identity;
        if (
          (record.lastReadOutcome?.phase === 'source-succeeded'
            || record.lastReadOutcome?.phase === 'fatal')
          && record.lastReadOutcome.identity !== null
          && sameReadTransactionIdentity(record.lastReadOutcome.identity, identity)
        ) {
          transaction.phase = 'violated';
          record.activeReadTransaction = null;
          throw new Error('Bot match read bundle source identity 已成功提交，禁止重复读取。');
        }
        transaction.phase = 'read';
        return source;
      } catch (error) {
        if (transaction.phase !== 'violated') {
          transaction.phase = 'source-failed';
          record.lastReadOutcome = Object.freeze({
            phase: 'source-failed',
            identity: transaction.identity,
            transaction,
          });
        }
        if (record.activeReadTransaction === transaction) record.activeReadTransaction = null;
        throw error;
      }
    },
  };
  return Object.freeze(reader);
}

function readFullAuditResultForRecord(record: BundleRecord): BotMatchReadFullAuditResultV2 {
  if (!record.valid) throw new Error('Bot match read bundle 已失效。');
  if (record.activeReadTransaction !== null) {
    throw new Error('Bot match read bundle full-audit 不能在 Bot transaction 期间读取。');
  }
  const frameReader = record.frameReader;
  const fullAuditReaders = record.fullAuditReaders;
  if (frameReader === null || fullAuditReaders === null) {
    throw new Error('Bot match read bundle full-audit reader 已释放。');
  }
  const identityBefore = readNativeCoreReadIdentity(record.core);
  const frame = frameReader.read();
  const frameRecord = requireExactKeys(frame, FRAME_SOURCE_KEYS, 'MatchReadFrameV2');
  if (frameRecord.schemaVersion !== 2) throw new RangeError('MatchReadFrameV2.schemaVersion 必须是 2。');
  const world = requireExactKeys(frameRecord.worldSnapshot, WORLD_SNAPSHOT_KEYS, 'MatchReadFrameV2.worldSnapshot');
  const local = requireExactKeys(frameRecord.localActionSidecar, LOCAL_SIDECAR_KEYS, 'MatchReadFrameV2.localActionSidecar');
  if (!Object.isFrozen(frame) || !Object.isFrozen(world) || !Object.isFrozen(local)) {
    throw new TypeError('MatchReadFrameV2 full-audit 结果必须是冻结数据。');
  }
  requireSafeTick(world.tick, 'MatchReadFrameV2.worldSnapshot.tick');
  requireSafeTick(world.eventSequence, 'MatchReadFrameV2.worldSnapshot.eventSequence');
  if (
    world.tick !== identityBefore.tick
    || world.phase !== identityBefore.phase
    || local.tick !== world.tick
    || local.eventSequence !== world.eventSequence
    || local.participantId !== record.localParticipantId
    || local.profile !== ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY
  ) throw new Error('Bot match read bundle full-audit world/local identity 不一致。');
  if (!Array.isArray(world.participants) || world.participants.length !== 2) {
    throw new Error('Bot match read bundle full-audit participant 集合必须精确包含两个 participant。');
  }
  const participantIds = (world.participants as WorldParticipantSnapshotV2[]).map((participant) => participant.id);
  if (
    participantIds.length !== 2
    || new Set(participantIds).size !== 2
    || !participantIds.includes(record.localParticipantId)
    || !participantIds.includes(record.botParticipantId)
  ) throw new Error('Bot match read bundle full-audit participant 身份不一致。');

  const sidecars = fullAuditReaders.map((entry) => {
    const sidecar = assertFullAuditSidecar(entry.reader.read(), `FullAuditSidecarV2.${entry.participantId}`);
    if (
      sidecar.participantId !== entry.participantId
      || sidecar.tick !== world.tick
      || sidecar.eventSequence !== world.eventSequence
    ) throw new Error('Bot match read bundle full-audit sidecar identity 不一致。');
    if (!Object.isFrozen(sidecar)) throw new TypeError('FullAuditSidecarV2 必须是冻结结果。');
    return sidecar as DeepReadonly<FullAuditSidecarV2>;
  });
  const identityAfter = readNativeCoreReadIdentity(record.core);
  if (
    identityBefore.tick !== identityAfter.tick
    || identityBefore.phase !== identityAfter.phase
    || identityAfter.tick !== world.tick
    || identityAfter.phase !== world.phase
  ) throw new Error('Bot match read bundle full-audit authority identity 在读取期间发生变化。');
  return Object.freeze({
    worldSnapshot: world as unknown as DeepReadonly<WorldSnapshotV2>,
    sidecars: Object.freeze(sidecars),
  });
}

export interface BotMatchReadTransaction {
  readonly completeSuccess: () => void;
  readonly classifyFailure: () => BotMatchReadFailureClassification;
}

export interface BotMatchReadFailureClassification {
  readonly retryable: boolean;
  readonly fatal: boolean;
}

function invalidateRecord(record: BundleRecord): void {
  if (record.activeReadTransaction !== null) {
    record.activeReadTransaction.phase = 'violated';
    record.activeReadTransaction = null;
  }
  record.valid = false;
  record.frameReader = null;
  record.mobilityReader = null;
  record.fullAuditReaders = null;
  record.commandSourceReader = null;
}

function fatalizeTransaction(record: BundleRecord, state: ReadTransactionState): void {
  state.phase = 'fatal';
  record.lastReadOutcome = Object.freeze({
    phase: 'fatal',
    identity: state.identity,
    transaction: state,
  });
  invalidateRecord(record);
}

export interface CreateBotMatchReadBundleV2Options {
  readonly ownedNewCore: MatchCore;
  readonly descriptor: unknown;
  readonly localId: string;
  readonly botId: string;
  readonly projectionContract?: unknown;
}

function fixedCoreApi(core: MatchCore): {
  readonly config: Readonly<{
    readonly participantIds: readonly string[];
    readonly mapDefinitionId: string;
    readonly contentSelection: { readonly contentHash: string } | null;
  }>;
  readonly createBinding: (descriptor: unknown) => unknown;
  readonly createFrameReader: (binding: unknown, participantId: string) => MatchReadFrameReader;
  readonly createSidecarReader: (
    binding: unknown,
    participantId: string,
    profile: 'bot-mobility' | 'full-audit',
  ) => MatchReadSidecarReader<BotMobilitySidecarV2 | FullAuditSidecarV2>;
} {
  const prototype = MatchCore.prototype;
  if (
    Object.getOwnPropertyDescriptor(prototype, 'config')?.get !== MATCH_CORE_CONFIG_GETTER
    || Object.getOwnPropertyDescriptor(prototype, 'createMatchReadBinding')?.value !== MATCH_CORE_CREATE_BINDING
    || Object.getOwnPropertyDescriptor(prototype, 'createMatchReadFrameReader')?.value !== MATCH_CORE_CREATE_FRAME_READER
    || Object.getOwnPropertyDescriptor(prototype, 'createMatchReadSidecarReader')?.value !== MATCH_CORE_CREATE_SIDECAR_READER
  ) throw new Error('MatchCore MatchRead 原型已漂移，bundle fail closed。');
  // Calling the native private-field getter first rejects a Proxy around a
  // Core before any own-method shadow can influence the factory.
  if (typeof MATCH_CORE_CONFIG_GETTER !== 'function') {
    throw new Error('MatchCore config native getter 已失效。');
  }
  const config = Reflect.apply(MATCH_CORE_CONFIG_GETTER, core, []) as {
    readonly participantIds: readonly string[];
    readonly mapDefinitionId: string;
    readonly contentSelection: { readonly contentHash: string } | null;
  };
  const methodNames = [
    'createMatchReadBinding',
    'createMatchReadFrameReader',
    'createMatchReadSidecarReader',
  ] as const;
  for (const name of methodNames) {
    if (Object.getOwnPropertyDescriptor(core, name) !== undefined) {
      throw new TypeError(`MatchCore.${name} 不得被 own shadow。`);
    }
  }
  return {
    config,
    createBinding: (descriptor) => Reflect.apply(MATCH_CORE_CREATE_BINDING, core, [descriptor]),
    createFrameReader: (binding, participantId) => Reflect.apply(MATCH_CORE_CREATE_FRAME_READER, core, [binding, participantId]) as MatchReadFrameReader,
    createSidecarReader: (binding, participantId, profile) => Reflect.apply(MATCH_CORE_CREATE_SIDECAR_READER, core, [binding, participantId, profile]) as MatchReadSidecarReader<BotMobilitySidecarV2 | FullAuditSidecarV2>,
  };
}

/**
 * The only PA3b factory allowed to consume MatchCore MatchRead creation APIs.
 * It never destroys the caller-owned Core; the outer owner quarantines and
 * destroys that newly-created Core exactly once after a failed construction.
 */
export function createMatchReadBotBundleV2(options: CreateBotMatchReadBundleV2Options): BotMatchReadBundleV2;
export function createMatchReadBotBundleV2(options: unknown): BotMatchReadBundleV2;
export function createMatchReadBotBundleV2(options: unknown): BotMatchReadBundleV2 {
  if (FACTORY_ACTIVE) {
    FACTORY_REENTRY_SEEN = true;
    throw new Error('Bot match read bundle factory 验证期间禁止重入。');
  }
  FACTORY_ACTIVE = true;
  FACTORY_REENTRY_SEEN = false;
  try {
    const record = captureOptions(options);
    if (FACTORY_REENTRY_SEEN) throw new Error('Bot match read bundle 验证期间禁止重入。');
    const coreCandidate = record.ownedNewCore;
    if (
      coreCandidate === null
      || typeof coreCandidate !== 'object'
      || Object.getPrototypeOf(coreCandidate) !== MatchCore.prototype
    ) {
      throw new TypeError('Bot match read bundle ownedNewCore 必须是原生 MatchCore。');
    }
    const core = coreCandidate as MatchCore;
    if (CONSUMED_CORES.has(core)) throw new Error('一个 MatchCore 只能创建一个 Bot match read bundle。');
    // Once the exact prototype identity has established that this is the
    // caller-owned native Core candidate, this factory attempt consumes the
    // one-shot slot before any later own-shadow/descriptor/contract check.
    // A failed attempt therefore quarantines the Core; only the outer owner
    // may destroy it and retry with a fresh Core.
    CONSUMED_CORES.add(core);
    const api = fixedCoreApi(core);
    requireOwnKeys(record, new Set(['ownedNewCore', 'descriptor', 'localId', 'botId']), 'Bot match read bundle options');
    const participantIds = api.config.participantIds;
    if (participantIds.length !== 2 || new Set(participantIds).size !== 2) {
      throw new RangeError('Bot match read bundle Core 必须精确包含两个 participant。');
    }
    const localParticipantId = requireNonEmptyString(record.localId, 'Bot match read bundle localId');
    const botParticipantId = requireNonEmptyString(record.botId, 'Bot match read bundle botId');
    if (localParticipantId === botParticipantId) throw new RangeError('Bot match read bundle localId 与 botId 不能相同。');
    if (
      !participantIds.includes(localParticipantId)
      || !participantIds.includes(botParticipantId)
      || new Set([localParticipantId, botParticipantId]).size !== new Set(participantIds).size
    ) throw new RangeError('Bot match read bundle participant 集合与 Core 不一致。');
    const rawProjectionContract = Object.prototype.hasOwnProperty.call(record, 'projectionContract')
      ? record.projectionContract
      : undefined;
    if (rawProjectionContract === undefined && Object.prototype.hasOwnProperty.call(record, 'projectionContract')) {
      throw new TypeError('Bot match read bundle projectionContract 不得显式为 undefined。');
    }
    if (rawProjectionContract !== undefined && rawProjectionContract !== null && typeof rawProjectionContract !== 'object') {
      throw new TypeError('Bot match read bundle projectionContract 必须是对象或 null。');
    }
    const formal = rawProjectionContract !== undefined && rawProjectionContract !== null;
    const descriptorSnapshot = cloneFrozenData(record.descriptor, 'MatchReadBinding descriptor');
    const projectionContract = formal
      ? normalizeProjectionContract(rawProjectionContract)
      : null;
    const descriptor = assertDescriptor(
      descriptorSnapshot,
      {
        participantIds,
        mapDefinitionId: api.config.mapDefinitionId,
        contentSelectionHash: api.config.contentSelection?.contentHash ?? null,
      },
      formal,
    );
    if (FACTORY_REENTRY_SEEN) throw new Error('Bot match read bundle 验证期间禁止重入。');
    const binding = api.createBinding(descriptor);
    const frameReader = api.createFrameReader(binding, localParticipantId);
    const mobilityReader = api.createSidecarReader(binding, botParticipantId, 'bot-mobility') as MatchReadSidecarReader<BotMobilitySidecarV2>;
    const nativeFullAuditReaderFactory = (
      readerBinding: unknown,
      participantId: string,
    ): MatchReadSidecarReader<FullAuditSidecarV2> => (
      api.createSidecarReader(readerBinding, participantId, 'full-audit') as MatchReadSidecarReader<FullAuditSidecarV2>
    );
    const fullAuditReaders = Object.freeze(participantIds.map((participantId): FullAuditReaderEntry => ({
      participantId,
      reader: nativeFullAuditReaderFactory(binding, participantId),
    })));
    const bundleRecord: BundleRecord = {
      core,
      localParticipantId,
      botParticipantId,
      frameReader,
      mobilityReader,
      fullAuditReaders,
      commandSourceReader: null,
      requireActiveSupplyProjection: formal,
      projectionContract,
      valid: true,
      firstRead: true,
      initialVerified: false,
      activeReadTransaction: null,
      lastReadOutcome: null,
    };
    bundleRecord.commandSourceReader = createCommandSourceReader(bundleRecord);
    const initialSource = buildCommandSource(bundleRecord);
    assertSource(initialSource);
    assertFrozenPlainData(initialSource, 'BotCommandSourceV5');
    const bundle = Object.freeze(Object.create(null)) as BotMatchReadBundleV2;
    BUNDLE_RECORDS.set(bundle as object, bundleRecord);
    return bundle;
  } finally {
    FACTORY_ACTIVE = false;
    FACTORY_REENTRY_SEEN = false;
  }
}

/** Package-private session resolver; intentionally absent from arena-session/index. */
export function resolveBotMatchReadBundle(
  value: unknown,
  core: MatchCore,
  localParticipantId: string,
  botParticipantId: string,
): { readonly reader: object; readonly handle: object } {
  if (value === null || typeof value !== 'object') throw new TypeError('Bot match read bundle 必须是 opaque object。');
  const record = BUNDLE_RECORDS.get(value);
  if (
    record === undefined
    || !record.valid
    || record.core !== core
    || record.localParticipantId !== localParticipantId
    || record.botParticipantId !== botParticipantId
    || record.commandSourceReader === null
  ) throw new TypeError('Bot match read bundle provenance 无效。');
  return Object.freeze({ reader: record.commandSourceReader, handle: value });
}

/**
 * Session-only read boundary. The frame reader is created by the PA3b bundle
 * factory; this helper only proves the already-owned bundle and returns the
 * frozen frame value. It deliberately does not expose the Core, binding,
 * reader, handle, or bundle record to callers.
 */
export function readPresentationFrameForSession(
  value: unknown,
  core: MatchCore,
  localParticipantId: string,
  botParticipantId: string,
): MatchReadFrameV2 {
  if (value === null || typeof value !== 'object') {
    throw new TypeError('Bot match read bundle 必须是 opaque object。');
  }
  const record = BUNDLE_RECORDS.get(value);
  if (
    record === undefined
    || !record.valid
    || record.core !== core
    || record.localParticipantId !== localParticipantId
    || record.botParticipantId !== botParticipantId
    || record.frameReader === null
  ) throw new TypeError('Bot match read bundle presentation frame provenance 无效。');
  if (record.activeReadTransaction !== null) {
    throw new Error('Bot match read bundle presentation frame 不能在 Bot transaction 期间读取。');
  }

  const identityBefore = readNativeCoreReadIdentity(core);
  const frame = record.frameReader.read();
  const identityAfter = readNativeCoreReadIdentity(core);
  if (
    identityBefore.tick !== identityAfter.tick
    || identityBefore.phase !== identityAfter.phase
  ) throw new Error('MatchReadFrameV2 authority identity 在读取期间发生变化。');
  if (!Object.isFrozen(frame)) throw new TypeError('MatchReadFrameV2 必须是冻结结果。');
  const frameRecord = requireExactKeys(frame, FRAME_SOURCE_KEYS, 'MatchReadFrameV2');
  if (frameRecord.schemaVersion !== 2) throw new RangeError('MatchReadFrameV2.schemaVersion 必须是 2。');
  const world = requireExactKeys(frameRecord.worldSnapshot, WORLD_SNAPSHOT_KEYS, 'MatchReadFrameV2.worldSnapshot');
  const local = requireExactKeys(frameRecord.localActionSidecar, LOCAL_SIDECAR_KEYS, 'MatchReadFrameV2.localActionSidecar');
  if (!Object.isFrozen(world) || !Object.isFrozen(local)) {
    throw new TypeError('MatchReadFrameV2 world/local 结果必须是冻结数据。');
  }
  if (
    world.tick !== identityAfter.tick
    || world.phase !== identityAfter.phase
    || local.tick !== world.tick
    || local.eventSequence !== world.eventSequence
    || local.participantId !== localParticipantId
    || local.profile !== ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY
  ) throw new Error('MatchReadFrameV2 authority identity 或 local profile 不一致。');
  if (!Array.isArray(world.participants) || world.participants.length !== 2) {
    throw new Error('MatchReadFrameV2 participant 集合必须精确包含两个 participant。');
  }
  const participantIds = world.participants.map((participant) => participant.id);
  if (
    participantIds.length !== 2
    || new Set(participantIds).size !== 2
    || !participantIds.includes(localParticipantId)
    || !participantIds.includes(botParticipantId)
  ) throw new Error('MatchReadFrameV2 participant 身份不一致。');
  if (record.projectionContract !== null && world.activeSupplyProjection === null) {
    throw new Error('正式 survival MatchReadFrameV2 缺少 activeSupplyProjection。');
  }
  return frame as MatchReadFrameV2;
}

/** Package-private session evidence boundary; schedule ownership stays outside Session. */
export function readFullAuditForSession(
  value: unknown,
  core: MatchCore,
  localParticipantId: string,
  botParticipantId: string,
): BotMatchReadFullAuditResultV2 {
  if (value === null || typeof value !== 'object') {
    throw new TypeError('Bot match read bundle 必须是 opaque object。');
  }
  const record = BUNDLE_RECORDS.get(value);
  if (
    record === undefined
    || !record.valid
    || record.core !== core
    || record.localParticipantId !== localParticipantId
    || record.botParticipantId !== botParticipantId
    || record.fullAuditReaders === null
  ) throw new TypeError('Bot match read bundle full-audit provenance 无效。');
  return readFullAuditResultForRecord(record);
}

/** Package-private session transaction arm; intentionally absent from index. */
export function armBotMatchReadTransaction(
  value: unknown,
  core: MatchCore,
  localParticipantId: string,
  botParticipantId: string,
): BotMatchReadTransaction {
  if (value === null || typeof value !== 'object') throw new TypeError('Bot match read bundle 必须是 opaque object。');
  const record = BUNDLE_RECORDS.get(value);
  if (
    record === undefined
    || !record.valid
    || record.core !== core
    || record.localParticipantId !== localParticipantId
    || record.botParticipantId !== botParticipantId
    || record.commandSourceReader === null
  ) throw new TypeError('Bot match read bundle transaction provenance 无效。');
  if (record.activeReadTransaction !== null) {
    throw new Error('Bot match read bundle source transaction 已存在，禁止重入。');
  }
  const state: ReadTransactionState = {
    record,
    phase: 'armed',
    identity: null,
    failureClassified: false,
  };
  record.activeReadTransaction = state;
  const completeSuccess = (): void => {
    if (
      !record.valid
      || record.activeReadTransaction !== state
      || state.phase !== 'read'
      || state.identity === null
    ) {
      fatalizeTransaction(record, state);
      throw new Error('Bot match read bundle source transaction 已失效；completeSuccess 必须发生在恰好一次成功读取之后。');
    }
    state.phase = 'source-succeeded';
    record.lastReadOutcome = Object.freeze({
      phase: 'source-succeeded',
      identity: state.identity,
      transaction: state,
    });
    record.activeReadTransaction = null;
  };
  const classifyFailure = (): BotMatchReadFailureClassification => {
    if (
      record.valid
      && state.phase === 'source-failed'
      && record.lastReadOutcome?.phase === 'source-failed'
      && record.lastReadOutcome.transaction === state
      && state.failureClassified === false
    ) {
      state.failureClassified = true;
      state.phase = 'source-failed-classified';
      return Object.freeze({ retryable: true, fatal: false });
    }
    fatalizeTransaction(record, state);
    return Object.freeze({ retryable: false, fatal: true });
  };
  return Object.freeze({ completeSuccess, classifyFailure });
}

/** Package-private session invalidation; not exported from arena-session/index. */
export function invalidateBotMatchReadBundle(
  value: unknown,
  core: MatchCore,
  localParticipantId: string,
  botParticipantId: string,
): void {
  if (value === null || typeof value !== 'object') throw new TypeError('Bot match read bundle 必须是 opaque object。');
  const record = BUNDLE_RECORDS.get(value);
  if (record === undefined || record.core !== core || record.localParticipantId !== localParticipantId || record.botParticipantId !== botParticipantId) {
    throw new TypeError('Bot match read bundle provenance 无效。');
  }
  invalidateRecord(record);
}
