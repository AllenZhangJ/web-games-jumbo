import {
  ARENA_MATCH_READ_PROFILE,
  createLocalActionSidecarV2Audit,
  createWorldSnapshotV2Audit,
  type LocalActionSidecarV2,
  type WorldParticipantSnapshotV2,
  type WorldSnapshotV2,
} from './match-read-frame-v2.js';
import {
  createArenaPublicSupplyProjectionV3Audit,
  type ArenaPublicSupplyProjectionV3,
  type ArenaPublicWorldSupplyIdentityV3,
} from './arena-public-supply-projection-v3.js';
import {
  createModeResultV3Payload,
  type ModeResultV3Payload,
} from './match-event-v6.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  type DeepReadonly,
  type PlainRecord,
} from './definition-utils.js';
import {
  assertArenaMatchPhase,
  type ArenaMatchPhase,
} from './arena-authority-state.js';

/** Independent read-model version; it does not change the V2 or authority schema. */
export const MATCH_READ_FRAME_V3_SCHEMA_VERSION = 3 as const;
export const MODE_PROJECTION_V1_SCHEMA_VERSION = 1 as const;

export const ARENA_MODE_PROJECTION_KIND = Object.freeze({
  DUEL: 'duel',
  RACE: 'race',
  SURVIVAL: 'survival',
} as const);

export const ARENA_RACE_PARTICIPANT_STATUS = Object.freeze({
  RACING: 'racing',
  RESPAWNING: 'respawning',
  FINISHED: 'finished',
} as const);

export interface ArenaHeldEquipmentSnapshotV3 {
  readonly instanceId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly collectionEquipmentDefinitionId: string;
  readonly survivalLevel: number | null;
  readonly cooldownRemainingTicks: number;
}

export type WorldParticipantSnapshotV3 = Omit<WorldParticipantSnapshotV2, 'equipment'> & {
  readonly equipment: ArenaHeldEquipmentSnapshotV3 | null;
};

export interface ArenaEquipmentSnapshotV3 {
  readonly schemaVersion: number;
  readonly instanceId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly collectionEquipmentDefinitionId: string;
  readonly survivalLevel: number | null;
  readonly spawnId: string;
  readonly locationState: string;
  readonly ownerId: string | null;
  readonly position: Readonly<{ x: number; y: number; z: number }> | null;
  readonly lastSafePosition: Readonly<{ x: number; y: number; z: number }> | null;
  readonly cooldownRemainingTicks: number;
  readonly revision: number;
}

export interface DuelModeProjectionStateV1 {
  readonly kind: 'duel';
  readonly suddenDeath: boolean;
}

export interface RaceModeProjectionParticipantV1 {
  readonly participantId: string;
  readonly status: 'racing' | 'respawning' | 'finished';
  readonly safeAnchorId: string | null;
  readonly progressOrdinal: number;
  readonly respawnReadyTick: number | null;
  readonly finishTick: number | null;
  readonly rank: number | null;
}

export interface RaceModeProjectionStateV1 {
  readonly kind: 'race';
  readonly finishGateId: string;
  readonly participants: readonly RaceModeProjectionParticipantV1[];
}

export interface SurvivalModeProjectionEnemySlotV1 {
  readonly slotId: string;
  readonly participantId: string;
  readonly active: boolean;
  readonly generation: number;
  readonly anchorId: string | null;
}

export interface SurvivalModeProjectionStateV1 {
  readonly kind: 'survival';
  readonly playerParticipantId: string;
  readonly fallCount: number;
  readonly terminalFallCount: 2;
  readonly survivedTicks: number;
  readonly pressureStage: number;
  readonly enemySlots: readonly SurvivalModeProjectionEnemySlotV1[];
}

export type ArenaModeProjectionStateV1 =
  | DuelModeProjectionStateV1
  | RaceModeProjectionStateV1
  | SurvivalModeProjectionStateV1;

export interface ArenaModeProjectionV1 {
  readonly schemaVersion: typeof MODE_PROJECTION_V1_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly revision: number;
  readonly preparationRemainingTicks: number | null;
  readonly state: ArenaModeProjectionStateV1;
}

export type WorldSnapshotV3 = Omit<
  WorldSnapshotV2,
  'participants' | 'equipment' | 'activeSupplyProjection' | 'result'
> & {
  readonly modeDefinitionId: string;
  readonly participants: readonly WorldParticipantSnapshotV3[];
  readonly equipment: readonly ArenaEquipmentSnapshotV3[];
  readonly activeSupplyProjection: ArenaPublicSupplyProjectionV3 | null;
  readonly modeProjection: ArenaModeProjectionV1;
  readonly result: ModeResultV3Payload | null;
};

export type LocalActionSidecarV3 = Omit<LocalActionSidecarV2, 'schemaVersion'> & {
  readonly schemaVersion: typeof MATCH_READ_FRAME_V3_SCHEMA_VERSION;
};

export interface MatchReadFrameV3 {
  readonly schemaVersion: typeof MATCH_READ_FRAME_V3_SCHEMA_VERSION;
  readonly worldSnapshot: WorldSnapshotV3;
  readonly localActionSidecar: LocalActionSidecarV3;
}

export interface MatchReadFrameV3AuditOptions {
  readonly worldSupplyEquipmentInstanceIds: readonly string[];
  readonly expectedWorldSupplyIdentities: readonly ArenaPublicWorldSupplyIdentityV3[];
}

const RACE_STATUSES: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_RACE_PARTICIPANT_STATUS),
);
const WORLD_KEYS = new Set([
  'authoritySchemaVersion', 'physicsBackendVersion', 'configHash', 'ruleContentHash', 'matchSeed',
  'tick', 'activeTick', 'phase', 'remainingTicks', 'eventSequence', 'modeDefinitionId',
  'participants', 'equipment', 'activeSupplyProjection', 'modeProjection', 'map', 'result',
]);
const PARTICIPANT_KEYS = new Set([
  'id', 'characterDefinitionId', 'status', 'lives', 'eliminations', 'deaths',
  'hitstunTicks', 'invulnerableTicks', 'respawnTicks', 'lastHitBy', 'lastHitTick',
  'action', 'actionRule', 'movement', 'equipment', 'position', 'velocity', 'facing',
  'grounded', 'supportSurfaceId',
]);
const HELD_EQUIPMENT_KEYS = new Set([
  'instanceId', 'runtimeEquipmentDefinitionId', 'collectionEquipmentDefinitionId',
  'survivalLevel', 'cooldownRemainingTicks',
]);
const EQUIPMENT_KEYS = new Set([
  'schemaVersion', 'instanceId', 'runtimeEquipmentDefinitionId',
  'collectionEquipmentDefinitionId', 'survivalLevel', 'spawnId', 'locationState',
  'ownerId', 'position', 'lastSafePosition', 'cooldownRemainingTicks', 'revision',
]);
const MODE_PROJECTION_KEYS = new Set([
  'schemaVersion', 'modeDefinitionId', 'revision', 'preparationRemainingTicks', 'state',
]);
const DUEL_STATE_KEYS = new Set(['kind', 'suddenDeath']);
const RACE_STATE_KEYS = new Set(['kind', 'finishGateId', 'participants']);
const RACE_PARTICIPANT_KEYS = new Set([
  'participantId', 'status', 'safeAnchorId', 'progressOrdinal', 'respawnReadyTick',
  'finishTick', 'rank',
]);
const SURVIVAL_STATE_KEYS = new Set([
  'kind', 'playerParticipantId', 'fallCount', 'terminalFallCount', 'survivedTicks',
  'pressureStage', 'enemySlots',
]);
const SURVIVAL_SLOT_KEYS = new Set([
  'slotId', 'participantId', 'active', 'generation', 'anchorId',
]);
const LOCAL_SIDECAR_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'participantId', 'profile',
  'primaryActionDefinitionId', 'channels',
]);
const FRAME_KEYS = new Set(['schemaVersion', 'worldSnapshot', 'localActionSidecar']);
const OPTIONS_KEYS = new Set([
  'worldSupplyEquipmentInstanceIds',
  'expectedWorldSupplyIdentities',
]);

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

function safeTick(value: unknown, name: string): number {
  return assertIntegerAtLeast(value, 0, name);
}

function nullableId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function nullableTick(value: unknown, name: string): number | null {
  return value === null ? null : safeTick(value, name);
}

function nullablePositiveInteger(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 1, name);
}

function assertCanonicalOrder(values: readonly string[], name: string): void {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1]! >= values[index]!) {
      throw new RangeError(`${name} 必须唯一且按字符串稳定升序排序。`);
    }
  }
}

function auditEquipmentIdentity(
  source: PlainRecord,
  modeKind: ArenaModeProjectionStateV1['kind'],
  name: string,
): Readonly<{
  runtimeEquipmentDefinitionId: string;
  collectionEquipmentDefinitionId: string;
  survivalLevel: number | null;
}> {
  const runtimeEquipmentDefinitionId = assertNonEmptyString(
    source.runtimeEquipmentDefinitionId,
    `${name}.runtimeEquipmentDefinitionId`,
  );
  const collectionEquipmentDefinitionId = assertNonEmptyString(
    source.collectionEquipmentDefinitionId,
    `${name}.collectionEquipmentDefinitionId`,
  );
  const survivalLevel = nullablePositiveInteger(source.survivalLevel, `${name}.survivalLevel`);
  if (modeKind === ARENA_MODE_PROJECTION_KIND.SURVIVAL) {
    if (survivalLevel === null) {
      throw new RangeError(`${name} Survival装备必须携带正survivalLevel。`);
    }
  } else if (
    survivalLevel !== null
    || runtimeEquipmentDefinitionId !== collectionEquipmentDefinitionId
  ) {
    throw new RangeError(`${name} Duel/Race装备必须使用同一runtime/collection身份且level=null。`);
  }
  return Object.freeze({
    runtimeEquipmentDefinitionId,
    collectionEquipmentDefinitionId,
    survivalLevel,
  });
}

function auditModeProjection(
  value: unknown,
  modeDefinitionId: string,
  phase: ArenaMatchPhase,
  tick: number,
  activeTick: number,
  worldParticipantIds: readonly string[],
): DeepReadonly<ArenaModeProjectionV1> {
  exactRecord(value, MODE_PROJECTION_KEYS, 'ArenaModeProjectionV1');
  if (value.schemaVersion !== MODE_PROJECTION_V1_SCHEMA_VERSION) {
    throw new RangeError('ArenaModeProjectionV1.schemaVersion 必须是 1。');
  }
  if (value.modeDefinitionId !== modeDefinitionId) {
    throw new RangeError('ArenaModeProjectionV1.modeDefinitionId 与 world 不一致。');
  }
  safeTick(value.revision, 'ArenaModeProjectionV1.revision');
  const preparationRemainingTicks = nullableTick(
    value.preparationRemainingTicks,
    'ArenaModeProjectionV1.preparationRemainingTicks',
  );
  if ((phase === 'preparing') !== (preparationRemainingTicks !== null)) {
    throw new RangeError('preparationRemainingTicks 只能且必须在 preparing phase 非null。');
  }
  const state = assertPlainRecord(value.state, 'ArenaModeProjectionV1.state');
  const worldIds = new Set(worldParticipantIds);

  if (state.kind === ARENA_MODE_PROJECTION_KIND.DUEL) {
    exactRecord(state, DUEL_STATE_KEYS, 'DuelModeProjectionStateV1');
    if (worldParticipantIds.length !== 2) {
      throw new RangeError('Duel ModeProjection 必须绑定精确2名participant。');
    }
    if (typeof state.suddenDeath !== 'boolean') {
      throw new TypeError('DuelModeProjectionStateV1.suddenDeath 必须是布尔值。');
    }
    if (phase === 'sudden-death' && !state.suddenDeath) {
      throw new RangeError('sudden-death phase 必须发布 suddenDeath=true。');
    }
    if ((phase === 'preparing' || phase === 'running') && state.suddenDeath) {
      throw new RangeError('Duel preparing/running phase 不得提前发布 suddenDeath=true。');
    }
  } else if (state.kind === ARENA_MODE_PROJECTION_KIND.RACE) {
    exactRecord(state, RACE_STATE_KEYS, 'RaceModeProjectionStateV1');
    assertNonEmptyString(state.finishGateId, 'RaceModeProjectionStateV1.finishGateId');
    const participants = state.participants;
    if (!Array.isArray(participants)
      || participants.length < 2
      || participants.length > 4) {
      throw new RangeError('RaceModeProjectionStateV1.participants 必须包含2-4项。');
    }
    if (participants.length !== worldParticipantIds.length) {
      throw new RangeError('Race ModeProjection participant集合必须与world完全一致。');
    }
    const projectionIds: string[] = [];
    participants.forEach((participant, index) => {
      const name = `RaceModeProjectionStateV1.participants[${index}]`;
      exactRecord(participant, RACE_PARTICIPANT_KEYS, name);
      const participantId = assertNonEmptyString(participant.participantId, `${name}.participantId`);
      if (!worldIds.has(participantId)) {
        throw new RangeError(`${name}.participantId 不存在于world。`);
      }
      projectionIds.push(participantId);
      if (!RACE_STATUSES.has(participant.status)) {
        throw new RangeError(`${name}.status 不在racing/respawning/finished集合中。`);
      }
      nullableId(participant.safeAnchorId, `${name}.safeAnchorId`);
      safeTick(participant.progressOrdinal, `${name}.progressOrdinal`);
      const respawnReadyTick = nullableTick(participant.respawnReadyTick, `${name}.respawnReadyTick`);
      const finishTick = nullableTick(participant.finishTick, `${name}.finishTick`);
      const rank = nullablePositiveInteger(participant.rank, `${name}.rank`);
      if (participant.status === ARENA_RACE_PARTICIPANT_STATUS.RACING
        && (respawnReadyTick !== null || finishTick !== null)) {
        throw new RangeError(`${name} racing状态不得携带respawnReadyTick/finishTick。`);
      }
      if (participant.status === ARENA_RACE_PARTICIPANT_STATUS.RESPAWNING
        && (respawnReadyTick === null || respawnReadyTick < tick || finishTick !== null)) {
        throw new RangeError(`${name} respawning状态的readyTick/finishTick不一致。`);
      }
      if (participant.status === ARENA_RACE_PARTICIPANT_STATUS.FINISHED
        && (respawnReadyTick !== null || finishTick === null || finishTick > tick || rank === null)) {
        throw new RangeError(`${name} finished状态必须携带有效finishTick/rank。`);
      }
      if (rank !== null && rank > participants.length) {
        throw new RangeError(`${name}.rank 不能超过Race参与人数。`);
      }
    });
    assertCanonicalOrder(projectionIds, 'RaceModeProjectionStateV1.participants');
    if (projectionIds.some((id, index) => id !== [...worldParticipantIds].sort()[index])) {
      throw new RangeError('Race ModeProjection participant集合与world不闭合。');
    }
  } else if (state.kind === ARENA_MODE_PROJECTION_KIND.SURVIVAL) {
    exactRecord(state, SURVIVAL_STATE_KEYS, 'SurvivalModeProjectionStateV1');
    const playerParticipantId = assertNonEmptyString(
      state.playerParticipantId,
      'SurvivalModeProjectionStateV1.playerParticipantId',
    );
    if (!worldIds.has(playerParticipantId)) {
      throw new RangeError('Survival playerParticipantId 不存在于world。');
    }
    const fallCount = safeTick(state.fallCount, 'SurvivalModeProjectionStateV1.fallCount');
    if (fallCount > 2 || state.terminalFallCount !== 2) {
      throw new RangeError('Survival fallCount/terminalFallCount 必须处于0-2/2。');
    }
    const survivedTicks = safeTick(
      state.survivedTicks,
      'SurvivalModeProjectionStateV1.survivedTicks',
    );
    if (survivedTicks > activeTick) {
      throw new RangeError('Survival survivedTicks 不能超过world.activeTick。');
    }
    safeTick(state.pressureStage, 'SurvivalModeProjectionStateV1.pressureStage');
    if (!Array.isArray(state.enemySlots)
      || state.enemySlots.length < 1
      || state.enemySlots.length > 16) {
      throw new RangeError('Survival enemySlots 必须包含1-16项。');
    }
    if (state.enemySlots.length + 1 !== worldParticipantIds.length) {
      throw new RangeError('Survival player+enemySlots必须与world participant数量一致。');
    }
    const slotIds: string[] = [];
    const enemyParticipantIds: string[] = [];
    state.enemySlots.forEach((slot, index) => {
      const name = `SurvivalModeProjectionStateV1.enemySlots[${index}]`;
      exactRecord(slot, SURVIVAL_SLOT_KEYS, name);
      const slotId = assertNonEmptyString(slot.slotId, `${name}.slotId`);
      const participantId = assertNonEmptyString(slot.participantId, `${name}.participantId`);
      if (!worldIds.has(participantId) || participantId === playerParticipantId) {
        throw new RangeError(`${name}.participantId 必须引用唯一enemy participant。`);
      }
      slotIds.push(slotId);
      enemyParticipantIds.push(participantId);
      if (typeof slot.active !== 'boolean') throw new TypeError(`${name}.active 必须是布尔值。`);
      const generation = safeTick(slot.generation, `${name}.generation`);
      const anchorId = nullableId(slot.anchorId, `${name}.anchorId`);
      if (slot.active && (generation < 1 || anchorId === null)) {
        throw new RangeError(`${name} active slot必须携带正generation与anchor。`);
      }
      if (!slot.active && anchorId !== null) {
        throw new RangeError(`${name} inactive slot的anchorId必须为null。`);
      }
    });
    assertCanonicalOrder(slotIds, 'SurvivalModeProjectionStateV1.enemySlots');
    if (new Set(enemyParticipantIds).size !== enemyParticipantIds.length) {
      throw new RangeError('Survival enemy slot participantId 不能重复。');
    }
    const expectedEnemyIds = worldParticipantIds
      .filter((participantId) => participantId !== playerParticipantId)
      .sort();
    const actualEnemyIds = [...enemyParticipantIds].sort();
    if (actualEnemyIds.some((id, index) => id !== expectedEnemyIds[index])) {
      throw new RangeError('Survival enemySlots participant集合与world不闭合。');
    }
  } else {
    throw new RangeError(`ArenaModeProjectionV1.state.kind 不受支持：${String(state.kind)}。`);
  }

  if (phase === 'sudden-death' && state.kind !== ARENA_MODE_PROJECTION_KIND.DUEL) {
    throw new RangeError('只有Duel允许sudden-death phase。');
  }
  return value as unknown as DeepReadonly<ArenaModeProjectionV1>;
}

function toV2Participant(
  value: unknown,
  index: number,
  modeKind: ArenaModeProjectionStateV1['kind'],
): PlainRecord {
  const name = `WorldSnapshotV3.participants[${index}]`;
  exactRecord(value, PARTICIPANT_KEYS, name);
  const source = value;
  let equipment: PlainRecord | null = null;
  if (source.equipment !== null) {
    exactRecord(source.equipment, HELD_EQUIPMENT_KEYS, `${name}.equipment`);
    const identity = auditEquipmentIdentity(source.equipment, modeKind, `${name}.equipment`);
    equipment = {
      instanceId: assertNonEmptyString(source.equipment.instanceId, `${name}.equipment.instanceId`),
      definitionId: identity.runtimeEquipmentDefinitionId,
      cooldownRemainingTicks: safeTick(
        source.equipment.cooldownRemainingTicks,
        `${name}.equipment.cooldownRemainingTicks`,
      ),
    };
  }
  return { ...source, equipment };
}

function toV2Equipment(
  value: unknown,
  index: number,
  modeKind: ArenaModeProjectionStateV1['kind'],
): PlainRecord {
  const name = `WorldSnapshotV3.equipment[${index}]`;
  exactRecord(value, EQUIPMENT_KEYS, name);
  const identity = auditEquipmentIdentity(value, modeKind, name);
  const {
    runtimeEquipmentDefinitionId: _runtimeEquipmentDefinitionId,
    collectionEquipmentDefinitionId: _collectionEquipmentDefinitionId,
    survivalLevel: _survivalLevel,
    ...common
  } = value;
  return { ...common, definitionId: identity.runtimeEquipmentDefinitionId };
}

function auditHeldEquipmentClosure(
  participants: readonly PlainRecord[],
  equipment: readonly PlainRecord[],
): void {
  const runtimeById = new Map(equipment.map((runtime) => [runtime.instanceId as string, runtime]));
  for (const participant of participants) {
    if (participant.equipment === null) continue;
    const held = assertPlainRecord(participant.equipment, 'WorldSnapshotV3.participant.equipment');
    const runtime = runtimeById.get(held.instanceId as string);
    if (!runtime) continue;
    if (
      runtime.runtimeEquipmentDefinitionId !== held.runtimeEquipmentDefinitionId
      || runtime.collectionEquipmentDefinitionId !== held.collectionEquipmentDefinitionId
      || runtime.survivalLevel !== held.survivalLevel
    ) {
      throw new RangeError(`participant ${String(participant.id)} 的装备身份闭包不一致。`);
    }
  }
}

function toV2World(
  source: PlainRecord,
  participants: readonly PlainRecord[],
  equipment: readonly PlainRecord[],
): DeepReadonly<WorldSnapshotV2> {
  const {
    modeDefinitionId: _modeDefinitionId,
    modeProjection: _modeProjection,
    participants: _participants,
    equipment: _equipment,
    activeSupplyProjection: _activeSupplyProjection,
    result: _result,
    phase,
    ...common
  } = source;
  return createWorldSnapshotV2Audit({
    ...common,
    phase: phase === 'ended' ? 'running' : phase,
    participants: participants.map((participant) => {
      const held = participant.equipment === null
        ? null
        : {
            instanceId: (participant.equipment as PlainRecord).instanceId,
            definitionId: (participant.equipment as PlainRecord).definitionId,
            cooldownRemainingTicks:
              (participant.equipment as PlainRecord).cooldownRemainingTicks,
          };
      return { ...participant, equipment: held };
    }),
    equipment,
    activeSupplyProjection: null,
    result: null,
  });
}

function auditModeResult(
  value: unknown,
  phase: string,
  postStepTick: number,
  participantIds: readonly string[],
  projection: DeepReadonly<ArenaModeProjectionV1>,
): DeepReadonly<ModeResultV3Payload> | null {
  if (phase !== 'ended') {
    if (value !== null) throw new RangeError('只有ended phase可以携带ModeResultV3。');
    return null;
  }
  if (value === null) throw new TypeError('ended phase必须携带ModeResultV3。');
  const result = createModeResultV3Payload(value);
  if (postStepTick === 0 || result.endedAtTick !== postStepTick - 1) {
    throw new RangeError(
      'ModeResultV3.endedAtTick 必须等于post-step world.tick - 1。',
    );
  }
  if (result.kind !== projection.state.kind) {
    throw new RangeError('ModeResultV3.kind 必须与ModeProjection state.kind一致。');
  }
  const worldIds = new Set(participantIds);
  if (result.kind === ARENA_MODE_PROJECTION_KIND.DUEL) {
    if (result.winnerParticipantIds.some((id) => !worldIds.has(id))) {
      throw new RangeError('Duel result winner必须引用world participant。');
    }
  } else if (result.kind === ARENA_MODE_PROJECTION_KIND.RACE) {
    const state = projection.state;
    if (state.kind !== ARENA_MODE_PROJECTION_KIND.RACE) {
      throw new RangeError('Race result/projection类型不一致。');
    }
    if (result.rankings.length !== state.participants.length) {
      throw new RangeError('Race result rankings必须与ModeProjection完全闭合。');
    }
    result.rankings.forEach((ranking, index) => {
      const projected = state.participants[index];
      if (
        !projected
        || ranking.participantId !== projected.participantId
        || ranking.finishTick !== projected.finishTick
        || ranking.progressOrdinal !== projected.progressOrdinal
        || ranking.rank !== projected.rank
      ) {
        throw new RangeError('Race result ranking必须精确等于终局ModeProjection。');
      }
    });
  } else {
    const state = projection.state;
    if (
      state.kind !== ARENA_MODE_PROJECTION_KIND.SURVIVAL
      || result.playerParticipantId !== state.playerParticipantId
      || result.survivedTicks !== state.survivedTicks
      || result.pressureStage !== state.pressureStage
      || result.fallCount !== state.fallCount
    ) {
      throw new RangeError('Survival result必须精确等于终局ModeProjection。');
    }
  }
  return result;
}

function normalizeOptions(value: MatchReadFrameV3AuditOptions): DeepReadonly<MatchReadFrameV3AuditOptions> {
  const source = cloneFrozenData(value, 'MatchReadFrameV3 options');
  exactRecord(source, OPTIONS_KEYS, 'MatchReadFrameV3 options');
  if (!Array.isArray(source.worldSupplyEquipmentInstanceIds)) {
    throw new TypeError('MatchReadFrameV3 options.worldSupplyEquipmentInstanceIds 必须是数组。');
  }
  if (!Array.isArray(source.expectedWorldSupplyIdentities)) {
    throw new TypeError('MatchReadFrameV3 options.expectedWorldSupplyIdentities 必须是数组。');
  }
  const worldSupplyEquipmentInstanceIds = source.worldSupplyEquipmentInstanceIds.map(
    (id, index) => assertNonEmptyString(
      id,
      `MatchReadFrameV3 options.worldSupplyEquipmentInstanceIds[${index}]`,
    ),
  );
  assertCanonicalOrder(
    worldSupplyEquipmentInstanceIds,
    'MatchReadFrameV3 options.worldSupplyEquipmentInstanceIds',
  );
  return Object.freeze({
    worldSupplyEquipmentInstanceIds: Object.freeze(worldSupplyEquipmentInstanceIds),
    expectedWorldSupplyIdentities: source.expectedWorldSupplyIdentities,
  }) as DeepReadonly<MatchReadFrameV3AuditOptions>;
}

export function createWorldSnapshotV3Audit(
  value: unknown,
  options: MatchReadFrameV3AuditOptions,
): DeepReadonly<WorldSnapshotV3> {
  const source = cloneFrozenData(value, 'WorldSnapshotV3');
  const auditedOptions = normalizeOptions(options);
  exactRecord(source, WORLD_KEYS, 'WorldSnapshotV3');
  const modeDefinitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'WorldSnapshotV3.modeDefinitionId',
  );
  const tick = safeTick(source.tick, 'WorldSnapshotV3.tick');
  const activeTick = safeTick(source.activeTick, 'WorldSnapshotV3.activeTick');
  const phase = assertArenaMatchPhase(source.phase, 'WorldSnapshotV3.phase');
  if (!Array.isArray(source.participants) || source.participants.length < 2) {
    throw new RangeError('WorldSnapshotV3.participants 必须至少包含2项。');
  }
  if (!Array.isArray(source.equipment)) {
    throw new TypeError('WorldSnapshotV3.equipment 必须是数组。');
  }
  const participantIds = source.participants.map((participant, index) => {
    const record = assertPlainRecord(participant, `WorldSnapshotV3.participants[${index}]`);
    return assertNonEmptyString(record.id, `WorldSnapshotV3.participants[${index}].id`);
  });
  assertCanonicalOrder(participantIds, 'WorldSnapshotV3.participants');
  const modeProjection = auditModeProjection(
    source.modeProjection,
    modeDefinitionId,
    phase,
    tick,
    activeTick,
    participantIds,
  );
  const v2Participants = source.participants.map((participant, index) => (
    toV2Participant(participant, index, modeProjection.state.kind)
  ));
  const v2Equipment = source.equipment.map((equipment, index) => (
    toV2Equipment(equipment, index, modeProjection.state.kind)
  ));
  const commonWorld = toV2World(source, v2Participants, v2Equipment);
  auditHeldEquipmentClosure(
    source.participants as readonly PlainRecord[],
    source.equipment as readonly PlainRecord[],
  );
  auditModeResult(source.result, phase, tick, participantIds, modeProjection);

  if (modeProjection.state.kind !== ARENA_MODE_PROJECTION_KIND.SURVIVAL) {
    if (source.activeSupplyProjection !== null
      || auditedOptions.expectedWorldSupplyIdentities.length !== 0
      || auditedOptions.worldSupplyEquipmentInstanceIds.length !== 0) {
      throw new RangeError('Duel/Race不得携带Survival SupplyProjection V3。');
    }
  } else if (source.activeSupplyProjection === null) {
    if (auditedOptions.expectedWorldSupplyIdentities.length !== 0
      || auditedOptions.worldSupplyEquipmentInstanceIds.length !== 0) {
      throw new RangeError('Survival world存在供给身份时必须携带SupplyProjection V3。');
    }
  } else {
    const supplyInstanceIds = new Set(auditedOptions.worldSupplyEquipmentInstanceIds);
    const worldSupplyEquipment = (source.equipment as readonly PlainRecord[])
      .filter((runtime) => supplyInstanceIds.has(runtime.instanceId as string));
    if (worldSupplyEquipment.length !== supplyInstanceIds.size) {
      throw new RangeError('MatchReadFrameV3供给实例ID必须全部存在于同一world equipment。');
    }
    createArenaPublicSupplyProjectionV3Audit(source.activeSupplyProjection, {
      modeDefinitionId,
      snapshotTick: tick,
      eventSequence: commonWorld.eventSequence,
      worldSupplyEquipment,
      expectedWorldSupplyIdentities: auditedOptions.expectedWorldSupplyIdentities,
    });
  }
  return source as unknown as DeepReadonly<WorldSnapshotV3>;
}

export function createLocalActionSidecarV3Audit(
  value: unknown,
  worldValue: unknown,
  options: MatchReadFrameV3AuditOptions,
): DeepReadonly<LocalActionSidecarV3> {
  const source = cloneFrozenData(value, 'LocalActionSidecarV3');
  exactRecord(source, LOCAL_SIDECAR_KEYS, 'LocalActionSidecarV3');
  if (source.schemaVersion !== MATCH_READ_FRAME_V3_SCHEMA_VERSION) {
    throw new RangeError('LocalActionSidecarV3.schemaVersion 必须是 3。');
  }
  if (source.profile !== ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY) {
    throw new RangeError('LocalActionSidecarV3.profile 必须是local-context-primary。');
  }
  const world = createWorldSnapshotV3Audit(worldValue, options);
  const {
    modeDefinitionId: _modeDefinitionId,
    modeProjection: _modeProjection,
    participants,
    equipment,
    activeSupplyProjection: _activeSupplyProjection,
    result: _result,
    phase,
    ...common
  } = world;
  const v2World = createWorldSnapshotV2Audit({
    ...common,
    phase: phase === 'ended' ? 'running' : phase,
    participants: participants.map((participant) => ({
      ...participant,
      equipment: participant.equipment === null ? null : {
        instanceId: participant.equipment.instanceId,
        definitionId: participant.equipment.runtimeEquipmentDefinitionId,
        cooldownRemainingTicks: participant.equipment.cooldownRemainingTicks,
      },
    })),
    equipment: equipment.map((runtime) => {
      const {
        runtimeEquipmentDefinitionId,
        collectionEquipmentDefinitionId: _collectionEquipmentDefinitionId,
        survivalLevel: _survivalLevel,
        ...runtimeCommon
      } = runtime;
      return { ...runtimeCommon, definitionId: runtimeEquipmentDefinitionId };
    }),
    activeSupplyProjection: null,
    result: null,
  });
  createLocalActionSidecarV2Audit({ ...source, schemaVersion: 2 }, v2World);
  return source as unknown as DeepReadonly<LocalActionSidecarV3>;
}

export function createMatchReadFrameV3Audit(
  value: unknown,
  options: MatchReadFrameV3AuditOptions,
): DeepReadonly<MatchReadFrameV3> {
  const source = cloneFrozenData(value, 'MatchReadFrameV3');
  exactRecord(source, FRAME_KEYS, 'MatchReadFrameV3');
  if (source.schemaVersion !== MATCH_READ_FRAME_V3_SCHEMA_VERSION) {
    throw new RangeError('MatchReadFrameV3.schemaVersion 必须是 3。');
  }
  createWorldSnapshotV3Audit(source.worldSnapshot, options);
  if (source.localActionSidecar === null || source.localActionSidecar === undefined) {
    throw new TypeError('MatchReadFrameV3.localActionSidecar 不能为空。');
  }
  createLocalActionSidecarV3Audit(source.localActionSidecar, source.worldSnapshot, options);
  return source as unknown as DeepReadonly<MatchReadFrameV3>;
}
