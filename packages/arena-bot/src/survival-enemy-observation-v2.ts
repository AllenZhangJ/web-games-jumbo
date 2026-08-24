import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  SURVIVAL_ENEMY_TRAVERSAL_V1,
  createSurvivalEnemyObservationV1,
  type SurvivalEnemyObservationV1,
  type SurvivalEnemyTraversalV1,
  type SurvivalEnemyVector3V1,
} from './survival-enemy-observation-v1.js';

export const SURVIVAL_ENEMY_OBSERVATION_V2_SCHEMA_VERSION = 2 as const;
export const SURVIVAL_ENEMY_OBSERVATION_V2_MAX_VISIBLE_SUPPLIES = 3 as const;

export interface SurvivalEnemyHeldEquipmentV2 {
  readonly collectionEquipmentDefinitionId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly survivalLevel: number;
}

export interface SurvivalEnemyVisibleSupplyV2 {
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly collectionEquipmentDefinitionId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly survivalLevel: number;
  readonly segmentId: string;
  readonly position: SurvivalEnemyVector3V1;
  readonly remainingTicks: number;
  readonly directTraversal: SurvivalEnemyTraversalV1;
  readonly routeTargetAnchorId: string | null;
}

export interface SurvivalEnemyObservationV2
  extends Omit<SurvivalEnemyObservationV1, 'schemaVersion'> {
  readonly schemaVersion: typeof SURVIVAL_ENEMY_OBSERVATION_V2_SCHEMA_VERSION;
  readonly heldEquipment: SurvivalEnemyHeldEquipmentV2 | null;
  readonly visibleSupplies: readonly SurvivalEnemyVisibleSupplyV2[];
}

const OBSERVATION_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'modeDefinitionId', 'participantId',
  'slotId', 'slotGeneration', 'active', 'primaryRange', 'primaryMinimumCommitmentTicks',
  'primaryCommitment', 'self', 'player', 'routeTargets',
  'heldEquipment', 'visibleSupplies',
]);
const HELD_EQUIPMENT_KEYS = new Set([
  'collectionEquipmentDefinitionId', 'runtimeEquipmentDefinitionId', 'survivalLevel',
]);
const SUPPLY_KEYS = new Set([
  'supplyId', 'equipmentInstanceId', 'collectionEquipmentDefinitionId',
  'runtimeEquipmentDefinitionId', 'survivalLevel', 'segmentId', 'position',
  'remainingTicks', 'directTraversal', 'routeTargetAnchorId',
]);
const VECTOR_KEYS = new Set(['x', 'y', 'z']);
const TRAVERSALS: ReadonlySet<unknown> = new Set(Object.values(SURVIVAL_ENEMY_TRAVERSAL_V1));

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

function level(value: unknown, name: string): number {
  const result = assertIntegerAtLeast(value, 1, name);
  if (result > 10) throw new RangeError(`${name}不能超过10。`);
  return result;
}

function vector(value: unknown, name: string): SurvivalEnemyVector3V1 {
  exactRecord(value, VECTOR_KEYS, name);
  const result = Object.fromEntries([...VECTOR_KEYS].map((axis) => {
    const component = value[axis];
    if (typeof component !== 'number' || !Number.isFinite(component)) {
      throw new TypeError(`${name}.${axis}必须是有限数。`);
    }
    return [axis, component];
  }));
  return Object.freeze(result) as unknown as SurvivalEnemyVector3V1;
}

function separatedEquipmentIdentity(
  value: Record<string, unknown>,
  name: string,
): Readonly<{
  collectionEquipmentDefinitionId: string;
  runtimeEquipmentDefinitionId: string;
  survivalLevel: number;
}> {
  const collectionEquipmentDefinitionId = assertNonEmptyString(
    value.collectionEquipmentDefinitionId,
    `${name}.collectionEquipmentDefinitionId`,
  );
  const runtimeEquipmentDefinitionId = assertNonEmptyString(
    value.runtimeEquipmentDefinitionId,
    `${name}.runtimeEquipmentDefinitionId`,
  );
  if (collectionEquipmentDefinitionId === runtimeEquipmentDefinitionId) {
    throw new RangeError(`${name}必须分离collection/runtime装备身份。`);
  }
  return Object.freeze({
    collectionEquipmentDefinitionId,
    runtimeEquipmentDefinitionId,
    survivalLevel: level(value.survivalLevel, `${name}.survivalLevel`),
  });
}

function v1Source(source: Record<string, unknown>): SurvivalEnemyObservationV1 {
  return createSurvivalEnemyObservationV1({
    schemaVersion: 1,
    tick: source.tick,
    eventSequence: source.eventSequence,
    modeDefinitionId: source.modeDefinitionId,
    participantId: source.participantId,
    slotId: source.slotId,
    slotGeneration: source.slotGeneration,
    active: source.active,
    primaryRange: source.primaryRange,
    primaryMinimumCommitmentTicks: source.primaryMinimumCommitmentTicks,
    primaryCommitment: source.primaryCommitment,
    self: source.self,
    player: source.player,
    routeTargets: source.routeTargets,
  });
}

export function createSurvivalEnemyObservationV2(value: unknown): SurvivalEnemyObservationV2 {
  const source = cloneFrozenData(value, 'SurvivalEnemyObservationV2');
  exactRecord(source, OBSERVATION_KEYS, 'SurvivalEnemyObservationV2');
  if (source.schemaVersion !== SURVIVAL_ENEMY_OBSERVATION_V2_SCHEMA_VERSION) {
    throw new RangeError('SurvivalEnemyObservationV2.schemaVersion必须是2。');
  }
  const base = v1Source(source);
  let heldEquipment: SurvivalEnemyHeldEquipmentV2 | null = null;
  if (source.heldEquipment !== null) {
    exactRecord(source.heldEquipment, HELD_EQUIPMENT_KEYS, 'SurvivalEnemyObservationV2.heldEquipment');
    heldEquipment = separatedEquipmentIdentity(
      source.heldEquipment,
      'SurvivalEnemyObservationV2.heldEquipment',
    );
  }
  if (!Array.isArray(source.visibleSupplies)) {
    throw new TypeError('SurvivalEnemyObservationV2.visibleSupplies必须是数组。');
  }
  if (source.visibleSupplies.length > SURVIVAL_ENEMY_OBSERVATION_V2_MAX_VISIBLE_SUPPLIES) {
    throw new RangeError('SurvivalEnemyObservationV2.visibleSupplies不能超过3项。');
  }
  const supplyIds = new Set<string>();
  const equipmentInstanceIds = new Set<string>();
  const routeTargetIds = new Set(base.routeTargets.map(({ anchorId }) => anchorId));
  const visibleSupplies = source.visibleSupplies.map((entry, index) => {
    const name = `SurvivalEnemyObservationV2.visibleSupplies[${index}]`;
    exactRecord(entry, SUPPLY_KEYS, name);
    const supplyId = assertNonEmptyString(entry.supplyId, `${name}.supplyId`);
    const equipmentInstanceId = assertNonEmptyString(
      entry.equipmentInstanceId,
      `${name}.equipmentInstanceId`,
    );
    if (supplyIds.has(supplyId)) throw new RangeError(`${name}.supplyId重复。`);
    if (equipmentInstanceIds.has(equipmentInstanceId)) {
      throw new RangeError(`${name}.equipmentInstanceId重复。`);
    }
    supplyIds.add(supplyId);
    equipmentInstanceIds.add(equipmentInstanceId);
    const identity = separatedEquipmentIdentity(entry, name);
    const segmentId = assertNonEmptyString(entry.segmentId, `${name}.segmentId`);
    const routeTargetAnchorId = entry.routeTargetAnchorId === null
      ? null
      : assertNonEmptyString(entry.routeTargetAnchorId, `${name}.routeTargetAnchorId`);
    const onCurrentSegment = base.self.currentSegmentId !== null
      && base.self.currentSegmentId === segmentId;
    if (onCurrentSegment && routeTargetAnchorId !== null) {
      throw new RangeError(`${name}与enemy同段时必须直接追踪供给位置。`);
    }
    if (!onCurrentSegment && (
      routeTargetAnchorId === null
      || !routeTargetIds.has(routeTargetAnchorId)
    )) {
      throw new RangeError(`${name}跨段供给必须引用当前合法route target。`);
    }
    if (!TRAVERSALS.has(entry.directTraversal)) {
      throw new RangeError(`${name}.directTraversal不受支持。`);
    }
    const remainingTicks = assertIntegerAtLeast(entry.remainingTicks, 1, `${name}.remainingTicks`);
    return Object.freeze({
      supplyId,
      equipmentInstanceId,
      ...identity,
      segmentId,
      position: vector(entry.position, `${name}.position`),
      remainingTicks,
      directTraversal: entry.directTraversal as SurvivalEnemyTraversalV1,
      routeTargetAnchorId,
    });
  });
  if (visibleSupplies.some((entry, index) => (
    index > 0 && visibleSupplies[index - 1]!.supplyId >= entry.supplyId
  ))) throw new RangeError('SurvivalEnemyObservationV2.visibleSupplies必须按supplyId稳定升序。');

  return Object.freeze({
    schemaVersion: SURVIVAL_ENEMY_OBSERVATION_V2_SCHEMA_VERSION,
    tick: base.tick,
    eventSequence: base.eventSequence,
    modeDefinitionId: base.modeDefinitionId,
    participantId: base.participantId,
    slotId: base.slotId,
    slotGeneration: base.slotGeneration,
    active: base.active,
    primaryRange: base.primaryRange,
    primaryMinimumCommitmentTicks: base.primaryMinimumCommitmentTicks,
    primaryCommitment: base.primaryCommitment,
    self: base.self,
    player: base.player,
    routeTargets: base.routeTargets,
    heldEquipment,
    visibleSupplies: Object.freeze(visibleSupplies),
  });
}

export const SURVIVAL_ENEMY_OBSERVATION_V2_CANDIDATE = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  maximumVisibleSupplies: SURVIVAL_ENEMY_OBSERVATION_V2_MAX_VISIBLE_SUPPLIES,
  exposesFutureMapState: false as const,
  exposesMatchCoreOrRenderer: false as const,
  exposesCurrentHeldEquipmentIdentity: true as const,
  exposesCurrentVisibleSupplyIdentity: true as const,
  validationStatus: 'not-run' as const,
});
