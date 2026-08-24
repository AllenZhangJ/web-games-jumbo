import {
  ACTION_RESOLUTION_KIND,
  type ActionResolutionKind,
} from './action-resolution.js';
import {
  ARENA_MATCH_PHASE,
  assertArenaActionPhase,
  assertArenaMatchPhase,
  assertArenaParticipantStatus,
  type ArenaMatchPhase,
} from './arena-authority-state.js';
import {
  createArenaPublicSupplyProjectionAudit,
  type ArenaPublicSupplyProjection,
} from './arena-public-supply-projection.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  type DeepReadonly,
  type PlainRecord,
} from './definition-utils.js';
import type {
  ArenaMapOccurrenceSnapshot,
  ArenaMapSnapshot,
  ArenaMatchSnapshot,
  ArenaParticipantSnapshot,
} from './match-snapshot.js';

/** Independent read-model version; it is not ArenaMatchSnapshot.schemaVersion. */
export const MATCH_READ_FRAME_V2_SCHEMA_VERSION = 2 as const;

export const ARENA_MATCH_READ_PROFILE = Object.freeze({
  LOCAL_CONTEXT_PRIMARY: 'local-context-primary',
  BOT_MOBILITY: 'bot-mobility',
  FULL_AUDIT: 'full-audit',
} as const);

export type ArenaMatchReadProfile =
  (typeof ARENA_MATCH_READ_PROFILE)[keyof typeof ARENA_MATCH_READ_PROFILE];

export interface ActionAffordanceViewV2 {
  readonly kind: ActionResolutionKind;
  readonly actionDefinitionId: string | null;
  readonly lane: string | null;
  readonly source: string | null;
  readonly reason: string;
}

export type WorldParticipantSnapshotV2 = Omit<ArenaParticipantSnapshot, 'actionAffordance'>;

type WorldMapOccurrenceSnapshotV2 = Omit<ArenaMapOccurrenceSnapshot, 'privatePlan'>;
type WorldMapSnapshotV2 = Omit<ArenaMapSnapshot, 'occurrences'> & {
  readonly occurrences: readonly WorldMapOccurrenceSnapshotV2[];
};

export type WorldSnapshotV2 = Omit<
  ArenaMatchSnapshot,
  'schemaVersion' | 'participants' | 'activeSupplyProjection' | 'rngStates'
> & {
  /** The legacy ArenaMatchSnapshot.schemaVersion, renamed to avoid V2 confusion. */
  readonly authoritySchemaVersion: number;
  readonly participants: readonly WorldParticipantSnapshotV2[];
  readonly activeSupplyProjection: ArenaPublicSupplyProjection | null;
  readonly map: WorldMapSnapshotV2;
};

export interface LocalActionSidecarV2 {
  readonly schemaVersion: typeof MATCH_READ_FRAME_V2_SCHEMA_VERSION;
  readonly tick: number;
  readonly eventSequence: number;
  readonly participantId: string;
  readonly profile: typeof ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY;
  readonly primaryActionDefinitionId: string | null;
  readonly channels: Readonly<{
    readonly primary: ActionAffordanceViewV2;
    readonly primaryHold: ActionAffordanceViewV2;
  }>;
}

export interface BotMobilitySidecarV2 {
  readonly schemaVersion: typeof MATCH_READ_FRAME_V2_SCHEMA_VERSION;
  readonly tick: number;
  readonly eventSequence: number;
  readonly participantId: string;
  readonly profile: typeof ARENA_MATCH_READ_PROFILE.BOT_MOBILITY;
  readonly channels: Readonly<{
    readonly jump: ActionAffordanceViewV2;
    readonly slam: ActionAffordanceViewV2;
  }>;
}

export interface FullAuditSidecarV2 {
  readonly schemaVersion: typeof MATCH_READ_FRAME_V2_SCHEMA_VERSION;
  readonly tick: number;
  readonly eventSequence: number;
  readonly participantId: string;
  readonly profile: typeof ARENA_MATCH_READ_PROFILE.FULL_AUDIT;
  readonly primaryActionDefinitionId: string | null;
  readonly channels: Readonly<{
    readonly primary: ActionAffordanceViewV2;
    readonly primaryHold: ActionAffordanceViewV2;
    readonly jump: ActionAffordanceViewV2;
    readonly slam: ActionAffordanceViewV2;
  }>;
}

export interface MatchReadFrameV2 {
  readonly schemaVersion: typeof MATCH_READ_FRAME_V2_SCHEMA_VERSION;
  readonly worldSnapshot: WorldSnapshotV2;
  readonly localActionSidecar: LocalActionSidecarV2;
}

const HASH_PATTERN = /^[0-9a-f]{8}$/;
const EQUIPMENT_LOCATION_STATES = new Set(['spawned', 'held', 'dropped', 'despawned']);
const WORLD_KEYS = new Set([
  'authoritySchemaVersion', 'physicsBackendVersion', 'configHash', 'ruleContentHash', 'matchSeed',
  'tick', 'activeTick', 'phase', 'remainingTicks', 'eventSequence', 'participants', 'equipment',
  'activeSupplyProjection', 'map', 'result',
]);
const PARTICIPANT_KEYS = new Set([
  'id', 'characterDefinitionId', 'status', 'lives', 'eliminations', 'deaths',
  'hitstunTicks', 'invulnerableTicks', 'respawnTicks', 'lastHitBy', 'lastHitTick',
  'action', 'actionRule', 'movement', 'equipment', 'position', 'velocity', 'facing',
  'grounded', 'supportSurfaceId',
]);
const ACTION_KEYS = new Set(['definitionId', 'phase', 'ticksRemaining', 'commitment']);
const ACTION_COMMITMENT_KEYS = new Set([
  'status', 'chargeTicks', 'chargeLevel', 'facingAtStart', 'facingAtResult',
]);
const MOVEMENT_KEYS = new Set([
  'schemaVersion', 'participantId', 'characterDefinitionId', 'mode',
  'coyoteTicksRemaining', 'jumpBufferTicksRemaining', 'airJumpsUsed',
  'crouchChargeTicks', 'crouchActionId', 'downSmashActionId', 'revision', 'grounded',
]);
const HELD_EQUIPMENT_KEYS = new Set(['instanceId', 'definitionId', 'cooldownRemainingTicks']);
const EQUIPMENT_KEYS = new Set([
  'schemaVersion', 'instanceId', 'definitionId', 'spawnId', 'locationState', 'ownerId',
  'position', 'lastSafePosition', 'cooldownRemainingTicks', 'revision',
]);
const MAP_KEYS = new Set([
  'schemaVersion', 'definitionId', 'nextActiveTick', 'revision', 'surfaces', 'occurrences',
]);
const SURFACE_KEYS = new Set(['id', 'enabled', 'revision']);
const OCCURRENCE_KEYS = new Set([
  'occurrenceId', 'eventId', 'kind', 'warningTick', 'startTick', 'endTick', 'phase',
  'publicPayload', 'revision',
]);
const RESULT_KEYS = new Set(['winnerId', 'reason', 'isDraw', 'endedAtTick']);
const VECTOR3_KEYS = new Set(['x', 'y', 'z']);
const VECTOR2_KEYS = new Set(['x', 'z']);
const OUTCOME_KEYS = new Set([
  'kind', 'actionDefinitionId', 'lane', 'source', 'reason',
]);
const LOCAL_SIDECAR_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'participantId', 'profile',
  'primaryActionDefinitionId', 'channels',
]);
const BOT_SIDECAR_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'participantId', 'profile', 'channels',
]);
const FULL_SIDECAR_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'participantId', 'profile',
  'primaryActionDefinitionId', 'channels',
]);
const FRAME_KEYS = new Set(['schemaVersion', 'worldSnapshot', 'localActionSidecar']);
const LOCAL_CHANNEL_KEYS = new Set(['primary', 'primaryHold']);
const BOT_CHANNEL_KEYS = new Set(['jump', 'slam']);
const FULL_CHANNEL_KEYS = new Set(['primary', 'primaryHold', 'jump', 'slam']);

function record(value: unknown, name: string): PlainRecord {
  return assertPlainRecord(value, name);
}

function requireKeys(value: PlainRecord, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new TypeError(`${name} 缺少字段 ${key}。`);
    }
  }
}

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} 必须是有限数。`);
  }
  return value;
}

function safeTick(value: unknown, name: string): number {
  return assertIntegerAtLeast(value, 0, name);
}

function safeSchemaVersion(value: unknown, name: string): number {
  return assertIntegerAtLeast(value, 1, name);
}

function hash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!HASH_PATTERN.test(result)) throw new RangeError(`${name} 必须是 8 位小写十六进制 hash。`);
  return result;
}

function nullableIdentifier(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function vector3(value: unknown, name: string): void {
  const source = record(value, name);
  assertKnownKeys(source, VECTOR3_KEYS, name);
  requireKeys(source, VECTOR3_KEYS, name);
  finite(source.x, `${name}.x`);
  finite(source.y, `${name}.y`);
  finite(source.z, `${name}.z`);
}

function vector2(value: unknown, name: string): void {
  const source = record(value, name);
  assertKnownKeys(source, VECTOR2_KEYS, name);
  requireKeys(source, VECTOR2_KEYS, name);
  finite(source.x, `${name}.x`);
  finite(source.z, `${name}.z`);
}

function uniqueId(
  value: unknown,
  name: string,
  ids: Set<string>,
): string {
  const id = assertNonEmptyString(value, name);
  if (ids.has(id)) throw new RangeError(`${name} 重复 ${id}。`);
  ids.add(id);
  return id;
}

function auditActionCommitment(value: unknown, name: string): void {
  const source = record(value, name);
  assertKnownKeys(source, ACTION_COMMITMENT_KEYS, name);
  requireKeys(source, ACTION_COMMITMENT_KEYS, name);
  assertNonEmptyString(source.status, `${name}.status`);
  safeTick(source.chargeTicks, `${name}.chargeTicks`);
  safeTick(source.chargeLevel, `${name}.chargeLevel`);
  vector2(source.facingAtStart, `${name}.facingAtStart`);
  vector2(source.facingAtResult, `${name}.facingAtResult`);
}

function auditAction(value: unknown, name: string): void {
  const source = record(value, name);
  assertKnownKeys(source, ACTION_KEYS, name);
  if (!Object.prototype.hasOwnProperty.call(source, 'definitionId')) {
    throw new TypeError(`${name} 缺少 definitionId。`);
  }
  nullableIdentifier(source.definitionId, `${name}.definitionId`);
  assertArenaActionPhase(source.phase, `${name}.phase`);
  safeTick(source.ticksRemaining, `${name}.ticksRemaining`);
  if (source.commitment !== undefined) auditActionCommitment(source.commitment, `${name}.commitment`);
}

function auditMovement(value: unknown, participantId: string, characterDefinitionId: string, grounded: boolean, name: string): void {
  const source = record(value, name);
  assertKnownKeys(source, MOVEMENT_KEYS, name);
  requireKeys(source, MOVEMENT_KEYS, name);
  if (source.participantId !== participantId) {
    throw new RangeError(`${name}.participantId 与 participant 不一致。`);
  }
  if (source.characterDefinitionId !== characterDefinitionId) {
    throw new RangeError(`${name}.characterDefinitionId 与 participant 不一致。`);
  }
  safeSchemaVersion(source.schemaVersion, `${name}.schemaVersion`);
  assertNonEmptyString(source.mode, `${name}.mode`);
  for (const key of [
    'coyoteTicksRemaining', 'jumpBufferTicksRemaining', 'airJumpsUsed',
    'crouchChargeTicks', 'revision',
  ]) safeTick(source[key], `${name}.${key}`);
  nullableIdentifier(source.crouchActionId, `${name}.crouchActionId`);
  nullableIdentifier(source.downSmashActionId, `${name}.downSmashActionId`);
  if (typeof source.grounded !== 'boolean' || source.grounded !== grounded) {
    throw new RangeError(`${name}.grounded 与 participant grounded 不一致。`);
  }
}

function auditParticipant(value: unknown, index: number, ids: Set<string>): string {
  const name = `WorldSnapshotV2.participants[${index}]`;
  const source = record(value, name);
  assertKnownKeys(source, PARTICIPANT_KEYS, name);
  requireKeys(source, PARTICIPANT_KEYS, name);
  const id = uniqueId(source.id, `${name}.id`, ids);
  const characterDefinitionId = assertNonEmptyString(
    source.characterDefinitionId,
    `${name}.characterDefinitionId`,
  );
  assertArenaParticipantStatus(source.status, `${name}.status`);
  for (const key of [
    'lives', 'eliminations', 'deaths', 'hitstunTicks', 'invulnerableTicks', 'respawnTicks',
  ]) safeTick(source[key], `${name}.${key}`);
  assertIntegerAtLeast(source.lastHitTick, -1, `${name}.lastHitTick`);
  nullableIdentifier(source.lastHitBy, `${name}.lastHitBy`);
  auditAction(source.action, `${name}.action`);
  auditMovement(source.movement, id, characterDefinitionId, source.grounded as boolean, `${name}.movement`);
  vector3(source.position, `${name}.position`);
  vector3(source.velocity, `${name}.velocity`);
  vector2(source.facing, `${name}.facing`);
  if (typeof source.grounded !== 'boolean') throw new TypeError(`${name}.grounded 必须是布尔值。`);
  nullableIdentifier(source.supportSurfaceId, `${name}.supportSurfaceId`);
  if (source.equipment !== null) {
    const equipment = record(source.equipment, `${name}.equipment`);
    assertKnownKeys(equipment, HELD_EQUIPMENT_KEYS, `${name}.equipment`);
    requireKeys(equipment, HELD_EQUIPMENT_KEYS, `${name}.equipment`);
    assertNonEmptyString(equipment.instanceId, `${name}.equipment.instanceId`);
    assertNonEmptyString(equipment.definitionId, `${name}.equipment.definitionId`);
    safeTick(equipment.cooldownRemainingTicks, `${name}.equipment.cooldownRemainingTicks`);
  }
  return id;
}

function auditEquipment(
  value: unknown,
  index: number,
  ids: Set<string>,
  participantIds: ReadonlySet<string>,
): void {
  const name = `WorldSnapshotV2.equipment[${index}]`;
  const source = record(value, name);
  assertKnownKeys(source, EQUIPMENT_KEYS, name);
  requireKeys(source, EQUIPMENT_KEYS, name);
  safeSchemaVersion(source.schemaVersion, `${name}.schemaVersion`);
  uniqueId(source.instanceId, `${name}.instanceId`, ids);
  assertNonEmptyString(source.definitionId, `${name}.definitionId`);
  assertNonEmptyString(source.spawnId, `${name}.spawnId`);
  const locationState = assertNonEmptyString(source.locationState, `${name}.locationState`);
  if (!EQUIPMENT_LOCATION_STATES.has(locationState)) {
    throw new RangeError(`${name}.locationState 不在 spawned/held/dropped/despawned 集合中。`);
  }
  const ownerId = nullableIdentifier(source.ownerId, `${name}.ownerId`);
  if (source.position !== null) vector3(source.position, `${name}.position`);
  if (source.lastSafePosition !== null) vector3(source.lastSafePosition, `${name}.lastSafePosition`);
  safeTick(source.cooldownRemainingTicks, `${name}.cooldownRemainingTicks`);
  safeTick(source.revision, `${name}.revision`);
  if (locationState === 'held') {
    if (ownerId === null || !participantIds.has(ownerId) || source.position !== null) {
      throw new RangeError(`${name} held owner/position 不一致。`);
    }
  } else if (locationState === 'spawned' || locationState === 'dropped') {
    if (ownerId !== null || source.position === null) {
      throw new RangeError(`${name} world owner/position 不一致。`);
    }
  } else if (locationState === 'despawned') {
    if (ownerId !== null || source.position !== null) {
      throw new RangeError(`${name} despawned owner/position 不一致。`);
    }
  }
}

function auditMap(value: unknown, name: string): void {
  const source = record(value, name);
  assertKnownKeys(source, MAP_KEYS, name);
  requireKeys(source, MAP_KEYS, name);
  safeSchemaVersion(source.schemaVersion, `${name}.schemaVersion`);
  assertNonEmptyString(source.definitionId, `${name}.definitionId`);
  safeTick(source.nextActiveTick, `${name}.nextActiveTick`);
  safeTick(source.revision, `${name}.revision`);
  if (!Array.isArray(source.surfaces) || !Array.isArray(source.occurrences)) {
    throw new TypeError(`${name}.surfaces/occurrences 必须是数组。`);
  }
  const surfaceIds = new Set<string>();
  source.surfaces.forEach((value, index) => {
    const surfaceName = `${name}.surfaces[${index}]`;
    const surface = record(value, surfaceName);
    assertKnownKeys(surface, SURFACE_KEYS, surfaceName);
    requireKeys(surface, SURFACE_KEYS, surfaceName);
    uniqueId(surface.id, `${surfaceName}.id`, surfaceIds);
    if (typeof surface.enabled !== 'boolean') throw new TypeError(`${surfaceName}.enabled 必须是布尔值。`);
    safeTick(surface.revision, `${surfaceName}.revision`);
  });
  const occurrenceIds = new Set<string>();
  source.occurrences.forEach((value, index) => {
    const occurrenceName = `${name}.occurrences[${index}]`;
    const occurrence = record(value, occurrenceName);
    assertKnownKeys(occurrence, OCCURRENCE_KEYS, occurrenceName);
    requireKeys(occurrence, OCCURRENCE_KEYS, occurrenceName);
    uniqueId(occurrence.occurrenceId, `${occurrenceName}.occurrenceId`, occurrenceIds);
    assertNonEmptyString(occurrence.eventId, `${occurrenceName}.eventId`);
    assertNonEmptyString(occurrence.kind, `${occurrenceName}.kind`);
    const warningTick = safeTick(occurrence.warningTick, `${occurrenceName}.warningTick`);
    const startTick = safeTick(occurrence.startTick, `${occurrenceName}.startTick`);
    const endTick = occurrence.endTick === null ? null : safeTick(occurrence.endTick, `${occurrenceName}.endTick`);
    assertNonEmptyString(occurrence.phase, `${occurrenceName}.phase`);
    if (warningTick > startTick || (endTick !== null && endTick <= startTick)) {
      throw new RangeError(`${occurrenceName} warning/start/end tick 顺序无效。`);
    }
    if (!Object.prototype.hasOwnProperty.call(occurrence, 'publicPayload')) {
      throw new TypeError(`${occurrenceName} 缺少 publicPayload。`);
    }
    safeTick(occurrence.revision, `${occurrenceName}.revision`);
  });
}

function auditResult(
  value: unknown,
  participantIds: ReadonlySet<string>,
  phase: ArenaMatchPhase,
  worldTick: number,
  name: string,
): void {
  if (phase === ARENA_MATCH_PHASE.ENDED && value === null) {
    throw new TypeError(`${name} ended phase 必须携带 result。`);
  }
  if (phase !== ARENA_MATCH_PHASE.ENDED && value !== null) {
    throw new RangeError(`${name} 只有 ended phase 可以携带 result。`);
  }
  if (value === null) return;
  const source = record(value, name);
  assertKnownKeys(source, RESULT_KEYS, name);
  requireKeys(source, RESULT_KEYS, name);
  const winnerId = nullableIdentifier(source.winnerId, `${name}.winnerId`);
  if (winnerId !== null && !participantIds.has(winnerId)) {
    throw new RangeError(`${name}.winnerId 必须引用 participant。`);
  }
  assertNonEmptyString(source.reason, `${name}.reason`);
  if (typeof source.isDraw !== 'boolean') throw new TypeError(`${name}.isDraw 必须是布尔值。`);
  if ((winnerId === null) !== source.isDraw) {
    throw new RangeError(`${name}.winnerId 与 isDraw 不一致。`);
  }
  const endedAtTick = safeTick(source.endedAtTick, `${name}.endedAtTick`);
  if (endedAtTick > worldTick) {
    throw new RangeError(`${name}.endedAtTick 不能超过 world.tick。`);
  }
}

function auditOutcome(value: unknown, name: string): void {
  const source = record(value, name);
  assertKnownKeys(source, OUTCOME_KEYS, name);
  requireKeys(source, OUTCOME_KEYS, name);
  if (!Object.values(ACTION_RESOLUTION_KIND).includes(source.kind as ActionResolutionKind)) {
    throw new RangeError(`${name}.kind 不在 ActionResolutionKind 集合中。`);
  }
  const actionDefinitionId = nullableIdentifier(source.actionDefinitionId, `${name}.actionDefinitionId`);
  const lane = nullableIdentifier(source.lane, `${name}.lane`);
  const actionSource = nullableIdentifier(source.source, `${name}.source`);
  assertNonEmptyString(source.reason, `${name}.reason`);
  const identityCount = [actionDefinitionId, lane, actionSource].filter((value) => value !== null).length;
  if (source.kind === ACTION_RESOLUTION_KIND.NONE && identityCount !== 0) {
    throw new RangeError(`${name}.none 不得包含 actionDefinitionId/lane/source。`);
  }
  if (source.kind === ACTION_RESOLUTION_KIND.SELECTED && identityCount !== 3) {
    throw new RangeError(`${name}.selected 必须包含 actionDefinitionId/lane/source。`);
  }
  if (source.kind === ACTION_RESOLUTION_KIND.IGNORED && identityCount !== 0 && identityCount !== 3) {
    throw new RangeError(`${name}.ignored 必须是全空或完整 actionDefinitionId/lane/source。`);
  }
}

function auditChannels(
  value: unknown,
  channelKeys: ReadonlySet<string>,
  name: string,
): void {
  const channels = record(value, name);
  assertKnownKeys(channels, channelKeys, name);
  requireKeys(channels, channelKeys, name);
  for (const key of channelKeys) auditOutcome(channels[key], `${name}.${key}`);
}

function auditSidecarEnvelope(
  value: unknown,
  keys: ReadonlySet<string>,
  expectedProfile: ArenaMatchReadProfile,
  world: DeepReadonly<WorldSnapshotV2> | null,
  name: string,
): PlainRecord {
  const source = record(value, name);
  assertKnownKeys(source, keys, name);
  requireKeys(source, keys, name);
  if (source.schemaVersion !== MATCH_READ_FRAME_V2_SCHEMA_VERSION) {
    throw new RangeError(`${name}.schemaVersion 必须是 ${MATCH_READ_FRAME_V2_SCHEMA_VERSION}。`);
  }
  safeTick(source.tick, `${name}.tick`);
  safeTick(source.eventSequence, `${name}.eventSequence`);
  assertNonEmptyString(source.participantId, `${name}.participantId`);
  if (source.profile !== expectedProfile) throw new RangeError(`${name}.profile 不匹配。`);
  if (world !== null) {
    if (source.tick !== world.tick || source.eventSequence !== world.eventSequence) {
      throw new RangeError(`${name} identity 必须与 world snapshot 一致。`);
    }
    if (!world.participants.some((participant) => participant.id === source.participantId)) {
      throw new RangeError(`${name}.participantId 不存在于 world snapshot。`);
    }
  }
  return source;
}

function auditPrimaryIdentity(source: PlainRecord, name: string): void {
  const primary = record(source.channels, `${name}.channels`).primary;
  const primaryOutcome = record(primary, `${name}.channels.primary`);
  const primaryId = nullableIdentifier(source.primaryActionDefinitionId, `${name}.primaryActionDefinitionId`);
  const outcomeId = nullableIdentifier(primaryOutcome.actionDefinitionId, `${name}.channels.primary.actionDefinitionId`);
  if (outcomeId !== null && primaryId !== outcomeId) {
    throw new RangeError(`${name}.primaryActionDefinitionId 必须匹配 primary outcome。`);
  }
  if (primaryOutcome.kind === ACTION_RESOLUTION_KIND.NONE && primaryId !== null) {
    throw new RangeError(`${name}.none primary 不得携带 primaryActionDefinitionId。`);
  }
}

function cloneAuditInput<T>(value: unknown, name: string): DeepReadonly<T> {
  return cloneFrozenData(value, name) as DeepReadonly<T>;
}

function auditedWorldFromUnknown(worldValue: unknown): DeepReadonly<WorldSnapshotV2> | null {
  return worldValue === null || worldValue === undefined
    ? null
    : createWorldSnapshotV2Audit(worldValue);
}

function auditLocalSidecarSource(
  source: PlainRecord,
  world: DeepReadonly<WorldSnapshotV2> | null,
): DeepReadonly<LocalActionSidecarV2> {
  auditSidecarEnvelope(
    source,
    LOCAL_SIDECAR_KEYS,
    ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
    world,
    'LocalActionSidecarV2',
  );
  auditChannels(source.channels, LOCAL_CHANNEL_KEYS, 'LocalActionSidecarV2.channels');
  auditPrimaryIdentity(source, 'LocalActionSidecarV2');
  return source as unknown as DeepReadonly<LocalActionSidecarV2>;
}

function auditBotSidecarSource(
  source: PlainRecord,
  world: DeepReadonly<WorldSnapshotV2> | null,
): DeepReadonly<BotMobilitySidecarV2> {
  auditSidecarEnvelope(
    source,
    BOT_SIDECAR_KEYS,
    ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
    world,
    'BotMobilitySidecarV2',
  );
  auditChannels(source.channels, BOT_CHANNEL_KEYS, 'BotMobilitySidecarV2.channels');
  return source as unknown as DeepReadonly<BotMobilitySidecarV2>;
}

function auditFullSidecarSource(
  source: PlainRecord,
  world: DeepReadonly<WorldSnapshotV2> | null,
): DeepReadonly<FullAuditSidecarV2> {
  auditSidecarEnvelope(
    source,
    FULL_SIDECAR_KEYS,
    ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
    world,
    'FullAuditSidecarV2',
  );
  auditChannels(source.channels, FULL_CHANNEL_KEYS, 'FullAuditSidecarV2.channels');
  auditPrimaryIdentity(source, 'FullAuditSidecarV2');
  return source as unknown as DeepReadonly<FullAuditSidecarV2>;
}

/**
 * Expensive boundary audit for fixtures, migration and evidence tooling.
 * It is intentionally not a MatchCore hot-path operation.
 */
export function createWorldSnapshotV2Audit(value: unknown): DeepReadonly<WorldSnapshotV2> {
  const source = cloneAuditInput<WorldSnapshotV2>(value, 'WorldSnapshotV2') as unknown as PlainRecord;
  assertKnownKeys(source, WORLD_KEYS, 'WorldSnapshotV2');
  requireKeys(source, WORLD_KEYS, 'WorldSnapshotV2');
  safeSchemaVersion(source.authoritySchemaVersion, 'WorldSnapshotV2.authoritySchemaVersion');
  assertNonEmptyString(source.physicsBackendVersion, 'WorldSnapshotV2.physicsBackendVersion');
  hash(source.configHash, 'WorldSnapshotV2.configHash');
  hash(source.ruleContentHash, 'WorldSnapshotV2.ruleContentHash');
  const matchSeed = safeTick(source.matchSeed, 'WorldSnapshotV2.matchSeed');
  if (matchSeed > 0xffffffff) throw new RangeError('WorldSnapshotV2.matchSeed 必须是 uint32。');
  const tick = safeTick(source.tick, 'WorldSnapshotV2.tick');
  const activeTick = safeTick(source.activeTick, 'WorldSnapshotV2.activeTick');
  if (activeTick > tick) throw new RangeError('WorldSnapshotV2.activeTick 不能超过 tick。');
  const phase = assertArenaMatchPhase(source.phase, 'WorldSnapshotV2.phase');
  safeTick(source.remainingTicks, 'WorldSnapshotV2.remainingTicks');
  const eventSequence = safeTick(source.eventSequence, 'WorldSnapshotV2.eventSequence');
  if (!Array.isArray(source.participants) || source.participants.length === 0) {
    throw new RangeError('WorldSnapshotV2.participants 必须是非空数组。');
  }
  if (!Array.isArray(source.equipment)) throw new TypeError('WorldSnapshotV2.equipment 必须是数组。');
  const participantIds = new Set<string>();
  source.participants.forEach((participant, index) => auditParticipant(participant, index, participantIds));
  for (const [index, participantValue] of source.participants.entries()) {
    const participant = record(participantValue, `WorldSnapshotV2.participants[${index}]`);
    if (participant.lastHitBy !== null && !participantIds.has(participant.lastHitBy as string)) {
      throw new RangeError(`WorldSnapshotV2.participants[${index}].lastHitBy 必须引用 participant。`);
    }
  }
  const equipmentIds = new Set<string>();
  source.equipment.forEach((equipment, index) => (
    auditEquipment(equipment, index, equipmentIds, participantIds)
  ));
  const runtimeById = new Map<string, PlainRecord>();
  const heldRuntimeByOwner = new Map<string, string>();
  for (const [index, equipmentValue] of source.equipment.entries()) {
    const runtime = record(equipmentValue, `WorldSnapshotV2.equipment[${index}]`);
    runtimeById.set(runtime.instanceId as string, runtime);
    if (runtime.locationState === 'held') {
      const ownerId = runtime.ownerId as string;
      if (heldRuntimeByOwner.has(ownerId)) {
        throw new RangeError(`participant ${ownerId} 不能同时持有多个 equipment runtime。`);
      }
      heldRuntimeByOwner.set(ownerId, runtime.instanceId as string);
    }
  }
  const referencedHeldRuntimeIds = new Set<string>();
  for (const participant of source.participants as readonly PlainRecord[]) {
    if (participant.equipment === null) continue;
    const held = record(participant.equipment, 'WorldSnapshotV2.participant.equipment');
    if (referencedHeldRuntimeIds.has(held.instanceId as string)) {
      throw new RangeError(`participant equipment ${held.instanceId as string} 被重复引用。`);
    }
    referencedHeldRuntimeIds.add(held.instanceId as string);
    const equipment = runtimeById.get(held.instanceId as string);
    if (!equipment) throw new RangeError(`participant ${participant.id} 的 held equipment 缺少 runtime。`);
    if (equipment.locationState !== 'held' || equipment.ownerId !== participant.id) {
      throw new RangeError(`participant ${participant.id} 的 held equipment owner 不一致。`);
    }
    if (
      equipment.definitionId !== held.definitionId
      || equipment.cooldownRemainingTicks !== held.cooldownRemainingTicks
    ) {
      throw new RangeError(`participant ${participant.id} 的 held equipment definition 不一致。`);
    }
  }
  for (const [ownerId, instanceId] of heldRuntimeByOwner) {
    if (!referencedHeldRuntimeIds.has(instanceId)) {
      throw new RangeError(`held runtime ${instanceId} 缺少 participant.equipment 指针。`);
    }
    const participant = (source.participants as readonly PlainRecord[]).find((candidate) => candidate.id === ownerId);
    if (!participant || participant.equipment === null || record(participant.equipment, 'WorldSnapshotV2.participant.equipment').instanceId !== instanceId) {
      throw new RangeError(`held runtime ${instanceId} 的 owner 指针不一致。`);
    }
  }
  auditMap(source.map, 'WorldSnapshotV2.map');
  auditResult(source.result, participantIds, phase, tick, 'WorldSnapshotV2.result');
  if (source.activeSupplyProjection !== null) {
    createArenaPublicSupplyProjectionAudit(source.activeSupplyProjection, {
      snapshotTick: tick,
      eventSequence,
      equipment: source.equipment,
    });
  }
  return source as unknown as DeepReadonly<WorldSnapshotV2>;
}

/** Audits a complete projection and rejects the explicit ordinary-world null form. */
export function requireArenaSurvivalSupplyProjectionV2(
  worldValue: unknown,
): DeepReadonly<ArenaPublicSupplyProjection> {
  const world = createWorldSnapshotV2Audit(worldValue);
  if (world.activeSupplyProjection === null) {
    throw new TypeError('正式 survival read frame 必须携带 activeSupplyProjection。');
  }
  return world.activeSupplyProjection;
}

export function createLocalActionSidecarV2Audit(
  value: unknown,
  worldValue: unknown = null,
): DeepReadonly<LocalActionSidecarV2> {
  const source = cloneAuditInput<LocalActionSidecarV2>(value, 'LocalActionSidecarV2') as unknown as PlainRecord;
  return auditLocalSidecarSource(source, auditedWorldFromUnknown(worldValue));
}

export function createBotMobilitySidecarV2Audit(
  value: unknown,
  worldValue: unknown = null,
): DeepReadonly<BotMobilitySidecarV2> {
  const source = cloneAuditInput<BotMobilitySidecarV2>(value, 'BotMobilitySidecarV2') as unknown as PlainRecord;
  return auditBotSidecarSource(source, auditedWorldFromUnknown(worldValue));
}

export function createFullAuditSidecarV2Audit(
  value: unknown,
  worldValue: unknown = null,
): DeepReadonly<FullAuditSidecarV2> {
  const source = cloneAuditInput<FullAuditSidecarV2>(value, 'FullAuditSidecarV2') as unknown as PlainRecord;
  return auditFullSidecarSource(source, auditedWorldFromUnknown(worldValue));
}

export function createMatchReadFrameV2Audit(value: unknown): DeepReadonly<MatchReadFrameV2> {
  const source = cloneAuditInput<MatchReadFrameV2>(value, 'MatchReadFrameV2') as unknown as PlainRecord;
  assertKnownKeys(source, FRAME_KEYS, 'MatchReadFrameV2');
  requireKeys(source, FRAME_KEYS, 'MatchReadFrameV2');
  if (source.schemaVersion !== MATCH_READ_FRAME_V2_SCHEMA_VERSION) {
    throw new RangeError(`MatchReadFrameV2.schemaVersion 必须是 ${MATCH_READ_FRAME_V2_SCHEMA_VERSION}。`);
  }
  const world = createWorldSnapshotV2Audit(source.worldSnapshot);
  if (source.localActionSidecar === null || source.localActionSidecar === undefined) {
    throw new TypeError('MatchReadFrameV2.localActionSidecar 不能为空。');
  }
  auditLocalSidecarSource(
    record(source.localActionSidecar, 'MatchReadFrameV2.localActionSidecar'),
    world,
  );
  return source as unknown as DeepReadonly<MatchReadFrameV2>;
}
