import {
  ARENA_MATCH_EVENT,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
  createArenaPublicSupplyProjectionAudit,
  ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS,
  ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
  ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS,
  ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION,
  createArenaPublicSupplyProjectionV3Audit,
  createArenaSupplyCadenceSnapshotV1,
  type ArenaPublicSupplyProjection,
  type ArenaPublicSupplyProjectionV3,
  type ArenaPublicWorldSupplyIdentityV3,
  type ArenaSupplyCadenceSnapshotV1,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  createSurvivalEquipmentTierPolicyDefinition,
  type EquipmentSupplyRegistryContract,
  type SurvivalEquipmentTierPolicyDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  EQUIPMENT_LOCATION_STATE,
  type EquipmentPosition,
  type EquipmentRegistryContract,
  type EquipmentRuntimeSnapshot,
} from './equipment-runtime.js';
import {
  EQUIPMENT_SUPPLY_LIFECYCLE_SCHEMA_VERSION,
  createEquipmentSupplyLifecycle,
  type EquipmentSupplyLifecycle,
} from './equipment-supply-lifecycle.js';
import {
  type EquipmentSupplyExpiredEvent,
  type EquipmentSupplyPickupDecision,
  type EquipmentSupplyPickupEvent,
  type EquipmentSupplySpawnedEvent,
  type EquipmentSupplyTimelinePhaseResult,
} from './equipment-system.js';

export const EQUIPMENT_SUPPLY_TIMELINE_SNAPSHOT_SCHEMA_VERSION = 1 as const;

const OPTIONS_KEYS = new Set([
  'supplyDefinitionId',
  'spawnSpecs',
  'waveEquipmentOverrides',
  'equipmentRegistry',
  'equipmentSupplyRegistry',
  'equipmentSystem',
  'snapshot',
]);
const SPEC_KEYS = new Set(['slotId', 'equipmentDefinitionId', 'spawnId', 'position']);
const WAVE_OVERRIDE_KEYS = new Set(['minimumWaveIndex', 'slots']);
const WAVE_OVERRIDE_SLOT_KEYS = new Set(['slotId', 'equipmentDefinitionId']);
const POSITION_KEYS = new Set(['x', 'y', 'z']);
const STEP_KEYS = new Set(['tick', 'participants', 'contestSeed']);
const PUBLIC_PROJECTION_KEYS = new Set(['snapshotTick', 'eventSequence', 'equipment']);
const PUBLIC_PROJECTION_V3_KEYS = new Set([
  'modeDefinitionId',
  'tierPolicyDefinition',
  'snapshotTick',
  'eventSequence',
  'equipment',
]);
const SNAPSHOT_KEYS = new Set([
  'schemaVersion',
  'supplyDefinitionId',
  'nextTick',
  'activeSupplies',
]);
const SLOT_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export interface EquipmentSupplySpawnSpec {
  readonly slotId: string;
  readonly equipmentDefinitionId: string;
  readonly spawnId: string;
  readonly position: Readonly<EquipmentPosition>;
}

export interface EquipmentSupplyWaveEquipmentOverride {
  readonly minimumWaveIndex: number;
  readonly slots: readonly Readonly<{
    readonly slotId: string;
    readonly equipmentDefinitionId: string;
  }>[];
}

export interface EquipmentSupplyTimelineSnapshot {
  readonly schemaVersion: typeof EQUIPMENT_SUPPLY_TIMELINE_SNAPSHOT_SCHEMA_VERSION;
  readonly supplyDefinitionId: string;
  readonly nextTick: number;
  readonly activeSupplies: readonly EquipmentSupplyLifecycle[];
}

export interface EquipmentSupplyTimelineStepResult {
  readonly tick: number;
  readonly phaseOrder: readonly ['spawn', 'expire', 'pickup', 'action'];
  readonly spawned: readonly EquipmentSupplyLifecycle[];
  readonly spawnedEvents: readonly EquipmentSupplySpawnedEvent[];
  readonly expiredEvents: readonly EquipmentSupplyExpiredEvent[];
  readonly pickupDecisions: readonly EquipmentSupplyPickupDecision[];
  readonly pickupEvents: readonly EquipmentSupplyPickupEvent[];
  readonly nextPhase: 'action';
}

export interface EquipmentSupplyPublicProjectionResult {
  readonly projection: ArenaPublicSupplyProjection;
  readonly pendingExpiryEquipmentInstanceIds: readonly string[];
}

export interface EquipmentSupplyWorldEquipmentSnapshotV3 {
  readonly schemaVersion: number;
  readonly instanceId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly collectionEquipmentDefinitionId: string;
  readonly survivalLevel: number;
  readonly spawnId: string;
  readonly locationState: 'spawned' | 'dropped';
  readonly ownerId: null;
  readonly position: Readonly<EquipmentPosition>;
  readonly lastSafePosition: Readonly<EquipmentPosition> | null;
  readonly cooldownRemainingTicks: number;
  readonly revision: number;
}

export interface EquipmentSupplyPublicProjectionV3Result {
  readonly projection: DeepReadonly<ArenaPublicSupplyProjectionV3>;
  readonly cadence: DeepReadonly<ArenaSupplyCadenceSnapshotV1>;
  readonly pendingExpiryEquipmentInstanceIds: readonly string[];
  readonly worldSupplyEquipment: readonly EquipmentSupplyWorldEquipmentSnapshotV3[];
  readonly expectedWorldSupplyIdentities: readonly ArenaPublicWorldSupplyIdentityV3[];
}

interface PendingTick {
  readonly tick: number;
  readonly spawned: readonly EquipmentSupplyLifecycle[];
  readonly spawnedEvents: readonly EquipmentSupplySpawnedEvent[];
  readonly expiredEvents: readonly EquipmentSupplyExpiredEvent[];
}

export interface EquipmentSupplyAuthorityContract {
  applySupplyTimelinePhase(options: unknown): EquipmentSupplyTimelinePhaseResult;
  resolveSupplyPickups(options: unknown): Readonly<{
    decisions: readonly EquipmentSupplyPickupDecision[];
    events: readonly EquipmentSupplyPickupEvent[];
  }>;
  getSnapshot(instanceId: string): EquipmentRuntimeSnapshot;
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function safeTick(value: unknown, name: string): number {
  const tick = assertIntegerAtLeast(value, 0, name);
  if (!Number.isSafeInteger(tick)) throw new RangeError(`${name} 必须是安全整数。`);
  return tick;
}

function clonePosition(value: unknown, name: string): Readonly<EquipmentPosition> {
  assertKnownKeys(value, POSITION_KEYS, name);
  const position = { x: 0, y: 0, z: 0 };
  for (const axis of ['x', 'y', 'z'] as const) {
    if (!Number.isFinite(value[axis])) throw new RangeError(`${name}.${axis} 必须是有限数。`);
    position[axis] = value[axis] as number;
  }
  return Object.freeze(position);
}

function samePosition(
  left: Readonly<EquipmentPosition>,
  right: Readonly<EquipmentPosition>,
): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function normalizeWaveEquipmentOverrides(
  value: unknown,
  spawnSpecs: readonly EquipmentSupplySpawnSpec[],
  equipmentRegistry: EquipmentRegistryContract,
): readonly EquipmentSupplyWaveEquipmentOverride[] {
  if (value === undefined) return Object.freeze([]);
  const source = cloneFrozenData(value, 'EquipmentSupplyTimelineSystem waveEquipmentOverrides');
  if (!Array.isArray(source) || source.length === 0) {
    throw new RangeError(
      'EquipmentSupplyTimelineSystem waveEquipmentOverrides必须是非空数组或省略。',
    );
  }
  const expectedSlotIds = spawnSpecs.map(({ slotId }) => slotId);
  let previousWaveIndex = -1;
  const overrides = source.map((entry, index) => {
    const name = `EquipmentSupplyTimelineSystem waveEquipmentOverrides[${index}]`;
    assertKnownKeys(entry, WAVE_OVERRIDE_KEYS, name);
    const minimumWaveIndex = safeTick(entry.minimumWaveIndex, `${name}.minimumWaveIndex`);
    if (index === 0 && minimumWaveIndex !== 0) {
      throw new RangeError('waveEquipmentOverrides首项必须从wave 0开始。');
    }
    if (minimumWaveIndex <= previousWaveIndex) {
      throw new RangeError('waveEquipmentOverrides.minimumWaveIndex必须严格递增。');
    }
    previousWaveIndex = minimumWaveIndex;
    if (!Array.isArray(entry.slots) || entry.slots.length !== expectedSlotIds.length) {
      throw new RangeError(`${name}.slots必须精确覆盖全部供给槽位。`);
    }
    const slots = entry.slots.map((slot, slotIndex) => {
      const slotName = `${name}.slots[${slotIndex}]`;
      assertKnownKeys(slot, WAVE_OVERRIDE_SLOT_KEYS, slotName);
      const slotId = assertNonEmptyString(slot.slotId, `${slotName}.slotId`);
      if (slotId !== expectedSlotIds[slotIndex]) {
        throw new RangeError(`${name}.slots必须按冻结slot顺序精确覆盖。`);
      }
      const equipmentDefinitionId = assertNonEmptyString(
        slot.equipmentDefinitionId,
        `${slotName}.equipmentDefinitionId`,
      );
      equipmentRegistry.require(equipmentDefinitionId);
      return Object.freeze({ slotId, equipmentDefinitionId });
    });
    return Object.freeze({ minimumWaveIndex, slots: Object.freeze(slots) });
  });
  return Object.freeze(overrides);
}

function createSupplyId(definitionId: string, waveIndex: number, slotId: string): string {
  return `${definitionId}:wave-${waveIndex}:slot-${slotId}`;
}

function createEquipmentInstanceId(supplyId: string): string {
  return `${supplyId}:equipment`;
}

function dataMethod(
  value: unknown,
  methodName: keyof EquipmentSupplyAuthorityContract,
): (...args: unknown[]) => unknown {
  if (!value || typeof value !== 'object') {
    throw new TypeError('EquipmentSupplyTimelineSystem 需要 equipment authority。');
  }
  let current: object | null = value;
  const visited = new Set<object>();
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) {
      throw new TypeError('EquipmentSupplyTimelineSystem equipment authority 原型链无效。');
    }
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, methodName);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`EquipmentSupplyTimelineSystem authority.${methodName} 必须是数据方法。`);
      }
      return descriptor.value.bind(value) as (...args: unknown[]) => unknown;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`EquipmentSupplyTimelineSystem authority 缺少 ${methodName}()。`);
}

function createAuthorityContract(value: unknown): EquipmentSupplyAuthorityContract {
  const apply = dataMethod(value, 'applySupplyTimelinePhase');
  const resolve = dataMethod(value, 'resolveSupplyPickups');
  const get = dataMethod(value, 'getSnapshot');
  return Object.freeze({
    applySupplyTimelinePhase: (options: unknown) => apply(options) as EquipmentSupplyTimelinePhaseResult,
    resolveSupplyPickups: (options: unknown) => resolve(options) as ReturnType<
      EquipmentSupplyAuthorityContract['resolveSupplyPickups']
    >,
    getSnapshot: (instanceId: string) => get(instanceId) as EquipmentRuntimeSnapshot,
  });
}

export class EquipmentSupplyTimelineSystem {
  readonly #definitionId: string;
  readonly #equipmentRegistry: EquipmentRegistryContract;
  readonly #supplyRegistry: EquipmentSupplyRegistryContract;
  readonly #equipmentSystem: EquipmentSupplyAuthorityContract;
  readonly #spawnSpecs: readonly EquipmentSupplySpawnSpec[];
  readonly #waveEquipmentOverrides: readonly EquipmentSupplyWaveEquipmentOverride[];
  readonly #contentHash: string;
  readonly #activeSupplies = new Map<string, EquipmentSupplyLifecycle>();
  #nextTick = 0;
  #pending: PendingTick | null = null;
  #destroyed = false;

  constructor(options: unknown) {
    assertKnownKeys(options, OPTIONS_KEYS, 'EquipmentSupplyTimelineSystem options');
    const source = options;
    const equipmentRegistry = source.equipmentRegistry as Partial<EquipmentRegistryContract> | null;
    const supplyRegistry = source.equipmentSupplyRegistry as Partial<EquipmentSupplyRegistryContract> | null;
    const equipmentSystem = source.equipmentSystem;
    if (!equipmentRegistry || typeof equipmentRegistry.require !== 'function') {
      throw new TypeError('EquipmentSupplyTimelineSystem 需要只读 EquipmentRegistry。');
    }
    if (!supplyRegistry || typeof supplyRegistry.require !== 'function') {
      throw new TypeError('EquipmentSupplyTimelineSystem 需要只读 EquipmentSupplyRegistry。');
    }
    this.#equipmentRegistry = equipmentRegistry as EquipmentRegistryContract;
    this.#supplyRegistry = supplyRegistry as EquipmentSupplyRegistryContract;
    this.#equipmentSystem = createAuthorityContract(equipmentSystem);
    this.#definitionId = assertNonEmptyString(
      source.supplyDefinitionId,
      'EquipmentSupplyTimelineSystem.supplyDefinitionId',
    );
    const definition = this.#supplyRegistry.require(this.#definitionId);
    const spawnSpecs = cloneFrozenData(
      source.spawnSpecs,
      'EquipmentSupplyTimelineSystem spawnSpecs',
    );
    if (!Array.isArray(spawnSpecs) || spawnSpecs.length !== definition.spawnCount) {
      throw new RangeError(
        `EquipmentSupplyTimelineSystem spawnSpecs 必须恰好包含 ${definition.spawnCount} 项。`,
      );
    }
    const slotIds = new Set<string>();
    this.#spawnSpecs = Object.freeze(spawnSpecs.map((value, index) => {
      assertKnownKeys(value, SPEC_KEYS, `EquipmentSupplyTimelineSystem spawnSpecs[${index}]`);
      const slotId = assertNonEmptyString(
        value.slotId,
        `EquipmentSupplyTimelineSystem spawnSpecs[${index}].slotId`,
      );
      if (!SLOT_ID_PATTERN.test(slotId)) {
        throw new RangeError(`EquipmentSupplyTimelineSystem slotId ${slotId} 格式非法。`);
      }
      if (slotIds.has(slotId)) throw new RangeError(`重复 supply slotId ${slotId}。`);
      slotIds.add(slotId);
      const equipmentDefinitionId = assertNonEmptyString(
        value.equipmentDefinitionId,
        `EquipmentSupplyTimelineSystem spawnSpecs[${index}].equipmentDefinitionId`,
      );
      this.#equipmentRegistry.require(equipmentDefinitionId);
      return Object.freeze({
        slotId,
        equipmentDefinitionId,
        spawnId: assertNonEmptyString(
          value.spawnId,
          `EquipmentSupplyTimelineSystem spawnSpecs[${index}].spawnId`,
        ),
        position: clonePosition(
          value.position,
          `EquipmentSupplyTimelineSystem spawnSpecs[${index}].position`,
        ),
      });
    }).sort((left, right) => compareStrings(left.slotId, right.slotId)));
    this.#waveEquipmentOverrides = normalizeWaveEquipmentOverrides(
      source.waveEquipmentOverrides,
      this.#spawnSpecs,
      this.#equipmentRegistry,
    );
    this.#contentHash = createDeterministicDataHash({
      definition,
      spawnSpecs: this.#spawnSpecs,
      waveEquipmentOverrides: this.#waveEquipmentOverrides,
    }, 'Equipment supply timeline content');

    if (source.snapshot !== undefined) this.#restore(source.snapshot);
  }

  get nextTick(): number {
    this.#assertUsable();
    return this.#nextTick;
  }

  getContentHash(): string {
    this.#assertUsable();
    return this.#contentHash;
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('EquipmentSupplyTimelineSystem 已销毁。');
  }

  #lifecycleFor(waveIndex: number, spec: EquipmentSupplySpawnSpec): EquipmentSupplyLifecycle {
    const definition = this.#supplyRegistry.require(this.#definitionId);
    const spawnTick = definition.firstSpawnTick + definition.spawnIntervalTicks * waveIndex;
    if (!Number.isSafeInteger(spawnTick)) {
      throw new RangeError('EquipmentSupplyTimelineSystem spawnTick 超出安全整数范围。');
    }
    const supplyId = createSupplyId(definition.id, waveIndex, spec.slotId);
    return createEquipmentSupplyLifecycle({
      schemaVersion: EQUIPMENT_SUPPLY_LIFECYCLE_SCHEMA_VERSION,
      supplyDefinitionId: definition.id,
      supplyId,
      equipmentInstanceId: createEquipmentInstanceId(supplyId),
      spawnTick,
      expireTick: spawnTick + definition.lifetimeTicks,
    }, definition);
  }

  #equipmentDefinitionIdAt(waveIndex: number, slotId: string): string {
    const spec = this.#spawnSpecs.find((candidate) => candidate.slotId === slotId);
    if (!spec) throw new RangeError(`未知 supply slot ${slotId}。`);
    if (this.#waveEquipmentOverrides.length === 0) return spec.equipmentDefinitionId;
    const tier = [...this.#waveEquipmentOverrides]
      .reverse()
      .find(({ minimumWaveIndex }) => minimumWaveIndex <= waveIndex);
    if (!tier) throw new Error(`wave ${waveIndex}缺少 equipment override。`);
    const slot = tier.slots.find((candidate) => candidate.slotId === slotId);
    if (!slot) throw new Error(`wave ${waveIndex}缺少 supply slot ${slotId} override。`);
    return slot.equipmentDefinitionId;
  }

  resolveWaveEquipmentDefinitions(waveIndexValue: unknown): readonly Readonly<{
    readonly slotId: string;
    readonly equipmentDefinitionId: string;
  }>[] {
    this.#assertUsable();
    const waveIndex = safeTick(waveIndexValue, 'EquipmentSupplyTimelineSystem waveIndex');
    return Object.freeze(this.#spawnSpecs.map(({ slotId }) => Object.freeze({
      slotId,
      equipmentDefinitionId: this.#equipmentDefinitionIdAt(waveIndex, slotId),
    })));
  }

  #waveIndexAt(tick: number): number | null {
    const definition = this.#supplyRegistry.require(this.#definitionId);
    if (tick < definition.firstSpawnTick) return null;
    const offset = tick - definition.firstSpawnTick;
    if (offset % definition.spawnIntervalTicks !== 0) return null;
    return offset / definition.spawnIntervalTicks;
  }

  #beginTick(tick: number): PendingTick {
    const waveIndex = this.#waveIndexAt(tick);
    const spawned = waveIndex === null
      ? []
      : this.#spawnSpecs.map((spec) => this.#lifecycleFor(waveIndex, spec));
    const expirations = [...this.#activeSupplies.values()]
      .filter(({ expireTick }) => expireTick === tick)
      .sort((left, right) => compareStrings(left.supplyId, right.supplyId));
    const overdue = [...this.#activeSupplies.values()].find(({ expireTick }) => expireTick < tick);
    if (overdue) throw new Error(`active supply ${overdue.supplyId} 已错过 expireTick。`);
    const phase = this.#equipmentSystem.applySupplyTimelinePhase({
      tick,
      spawns: spawned.map((lifecycle, index) => {
        const spec = this.#spawnSpecs[index];
        if (!spec) throw new Error(`wave ${waveIndex} 缺少 spawn spec ${index}。`);
        return {
          lifecycle,
          definitionId: this.#equipmentDefinitionIdAt(waveIndex!, spec.slotId),
          spawnId: spec.spawnId,
          position: spec.position,
        };
      }),
      expirations,
    });
    for (const lifecycle of expirations) this.#activeSupplies.delete(lifecycle.supplyId);
    for (const lifecycle of spawned) this.#activeSupplies.set(lifecycle.supplyId, lifecycle);
    return Object.freeze({
      tick,
      spawned: Object.freeze(spawned),
      spawnedEvents: phase.spawnedEvents,
      expiredEvents: phase.events,
    });
  }

  step(options: unknown): EquipmentSupplyTimelineStepResult {
    this.#assertUsable();
    const source = cloneFrozenData(options, 'EquipmentSupplyTimelineSystem step');
    assertKnownKeys(source, STEP_KEYS, 'EquipmentSupplyTimelineSystem step');
    const tick = safeTick(source.tick, 'EquipmentSupplyTimelineSystem step.tick');
    if (tick !== this.#nextTick) {
      throw new RangeError(`EquipmentSupplyTimelineSystem 期望 tick ${this.#nextTick}，收到 ${tick}。`);
    }
    if (!Number.isSafeInteger(tick + 1)) {
      throw new RangeError('EquipmentSupplyTimelineSystem nextTick 超出安全整数范围。');
    }
    if (!this.#pending) this.#pending = this.#beginTick(tick);
    const pickup = this.#equipmentSystem.resolveSupplyPickups({
      participants: source.participants,
      supplies: [...this.#activeSupplies.values()].sort((left, right) => (
        compareStrings(left.supplyId, right.supplyId)
      )),
      contestSeed: source.contestSeed,
      tick,
    });
    const recycledEquipmentIds = new Set(pickup.events.flatMap((event) => (
      event.type === ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED
        ? [event.payload.recycledEquipmentInstanceId]
        : []
    )));
    if (recycledEquipmentIds.size > 0) {
      for (const [supplyId, lifecycle] of this.#activeSupplies) {
        if (recycledEquipmentIds.has(lifecycle.equipmentInstanceId)) {
          this.#activeSupplies.delete(supplyId);
        }
      }
    }
    const pending = this.#pending;
    if (!pending) throw new Error('EquipmentSupplyTimelineSystem pending tick 丢失。');
    const result = Object.freeze({
      tick,
      phaseOrder: Object.freeze(['spawn', 'expire', 'pickup', 'action'] as const),
      spawned: pending.spawned,
      spawnedEvents: pending.spawnedEvents,
      expiredEvents: pending.expiredEvents,
      pickupDecisions: pickup.decisions,
      pickupEvents: pickup.events,
      nextPhase: 'action' as const,
    });
    this.#nextTick = tick + 1;
    this.#pending = null;
    return result;
  }

  listActiveSupplies(): readonly EquipmentSupplyLifecycle[] {
    this.#assertUsable();
    return Object.freeze([...this.#activeSupplies.values()].sort((left, right) => (
      compareStrings(left.supplyId, right.supplyId)
    )));
  }

  /**
   * Builds the only public supply projection from the timeline's registered
   * Definition, frozen spawn specs and EquipmentSystem runtime. The returned
   * pending IDs are authority metadata used by MatchCore to hide the
   * pre-expiry world item; they are never exposed as interactable supplies.
   */
  getPublicSupplyProjection(options: unknown): EquipmentSupplyPublicProjectionResult {
    this.#assertUsable();
    const source = cloneFrozenData(options, 'EquipmentSupplyTimelineSystem public projection');
    assertKnownKeys(source, PUBLIC_PROJECTION_KEYS, 'EquipmentSupplyTimelineSystem public projection');
    const snapshotTick = safeTick(
      source.snapshotTick,
      'EquipmentSupplyTimelineSystem public projection.snapshotTick',
    );
    const eventSequence = safeTick(
      source.eventSequence,
      'EquipmentSupplyTimelineSystem public projection.eventSequence',
    );
    const timeline = this.getSnapshot();
    if (timeline.nextTick !== snapshotTick) {
      throw new RangeError(
        `public supply projection 期望 timeline tick ${timeline.nextTick}，收到 ${snapshotTick}。`,
      );
    }
    if (!Array.isArray(source.equipment)) {
      throw new TypeError('EquipmentSupplyTimelineSystem public projection.equipment 必须是数组。');
    }
    const definition = this.#supplyRegistry.require(this.#definitionId);
    const equipmentById = new Map<string, EquipmentRuntimeSnapshot>();
    for (const [index, value] of source.equipment.entries()) {
      const runtime = value as EquipmentRuntimeSnapshot;
      const instanceId = assertNonEmptyString(
        runtime.instanceId,
        `EquipmentSupplyTimelineSystem public projection.equipment[${index}].instanceId`,
      );
      if (equipmentById.has(instanceId)) {
        throw new RangeError(`public projection equipment instance ${instanceId} 重复。`);
      }
      equipmentById.set(instanceId, runtime);
    }
    const supplies: Array<{
      readonly schemaVersion: typeof ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION;
      readonly supplyDefinitionId: string;
      readonly supplyId: string;
      readonly slotId: string;
      readonly equipmentInstanceId: string;
      readonly equipmentDefinitionId: string;
      readonly equipmentSpawnId: string;
      readonly spawnPosition: Readonly<EquipmentPosition>;
      readonly spawnTick: number;
      readonly expireTick: number;
      readonly remainingTicks: number;
      readonly position: Readonly<EquipmentPosition>;
    }> = [];
    const pendingExpiryEquipmentInstanceIds: string[] = [];
    for (const lifecycle of timeline.activeSupplies) {
      if (lifecycle.supplyDefinitionId !== definition.id) {
        throw new RangeError(`供给 ${lifecycle.supplyId} Definition 身份不一致。`);
      }
      const offset = lifecycle.spawnTick - definition.firstSpawnTick;
      if (
        offset < 0
        || offset % definition.spawnIntervalTicks !== 0
        || !Number.isSafeInteger(offset / definition.spawnIntervalTicks)
      ) {
        throw new RangeError(`供给 ${lifecycle.supplyId} 不是正式 Definition 合法波次。`);
      }
      const waveIndex = offset / definition.spawnIntervalTicks;
      const spec = this.#spawnSpecs.find((candidate) => (
        createSupplyId(definition.id, waveIndex, candidate.slotId) === lifecycle.supplyId
      ));
      if (!spec || createEquipmentInstanceId(lifecycle.supplyId) !== lifecycle.equipmentInstanceId) {
        throw new RangeError(`供给 ${lifecycle.supplyId} 不是冻结 spawn spec 身份。`);
      }
      const runtime = equipmentById.get(lifecycle.equipmentInstanceId);
      if (!runtime) throw new RangeError(`供给 ${lifecycle.supplyId} 缺少 equipment runtime。`);
      const expectedEquipmentDefinitionId = this.#equipmentDefinitionIdAt(
        waveIndex,
        spec.slotId,
      );
      if (
        runtime.definitionId !== expectedEquipmentDefinitionId
        || runtime.spawnId !== spec.spawnId
        || !samePosition(runtime.originPosition, spec.position)
      ) {
        throw new RangeError(`供给 ${lifecycle.supplyId} 与 Definition/spawn spec 不一致。`);
      }
      const remainingTicks = lifecycle.expireTick - snapshotTick;
      if (!Number.isSafeInteger(remainingTicks) || remainingTicks < 0) {
        throw new RangeError(`供给 ${lifecycle.supplyId} remainingTicks 无效。`);
      }
      if (remainingTicks === 0) {
        if (
          runtime.locationState === EQUIPMENT_LOCATION_STATE.SPAWNED
          || runtime.locationState === EQUIPMENT_LOCATION_STATE.DROPPED
        ) {
          pendingExpiryEquipmentInstanceIds.push(runtime.instanceId);
        }
        continue;
      }
      if (
        runtime.locationState !== EQUIPMENT_LOCATION_STATE.SPAWNED
        && runtime.locationState !== EQUIPMENT_LOCATION_STATE.DROPPED
      ) continue;
      if (runtime.ownerId !== null || runtime.position === null) {
        throw new RangeError(`供给 ${lifecycle.supplyId} 的 world runtime 连接不一致。`);
      }
      supplies.push({
        schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
        supplyDefinitionId: definition.id,
        supplyId: lifecycle.supplyId,
        slotId: spec.slotId,
        equipmentInstanceId: lifecycle.equipmentInstanceId,
        equipmentDefinitionId: runtime.definitionId,
        equipmentSpawnId: runtime.spawnId,
        spawnPosition: { ...spec.position },
        spawnTick: lifecycle.spawnTick,
        expireTick: lifecycle.expireTick,
        remainingTicks,
        position: { ...runtime.position },
      });
    }
    const expectedWorldSupplyEquipmentInstanceIds = timeline.activeSupplies
      .filter((lifecycle) => {
        const runtime = equipmentById.get(lifecycle.equipmentInstanceId);
        return runtime !== undefined
          && lifecycle.expireTick > snapshotTick
          && (runtime.locationState === EQUIPMENT_LOCATION_STATE.SPAWNED
            || runtime.locationState === EQUIPMENT_LOCATION_STATE.DROPPED);
      })
      .map(({ equipmentInstanceId }) => equipmentInstanceId);
    const equipmentForPublicAudit = source.equipment.map((value) => {
      const runtime = value as EquipmentRuntimeSnapshot;
      return {
        schemaVersion: runtime.schemaVersion,
        instanceId: runtime.instanceId,
        definitionId: runtime.definitionId,
        spawnId: runtime.spawnId,
        locationState: runtime.locationState,
        ownerId: runtime.ownerId,
        position: runtime.position,
        lastSafePosition: runtime.lastSafePosition,
        cooldownRemainingTicks: runtime.cooldownRemainingTicks,
        revision: runtime.revision,
      };
    });
    const resyncReadiness = pendingExpiryEquipmentInstanceIds.length > 0
      ? ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.NOT_READY_PRE_EXPIRY
      : ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY;
    const lifecycleContract = this.#waveEquipmentOverrides.length === 0
      ? {
        lifecycleContract: {
          supplyDefinitionId: definition.id,
          firstSpawnTick: definition.firstSpawnTick,
          spawnIntervalTicks: definition.spawnIntervalTicks,
          spawnCount: definition.spawnCount,
          lifetimeTicks: definition.lifetimeTicks,
          spawnSpecs: this.#spawnSpecs,
          equipmentDefinitionIds: this.#spawnSpecs.map(({ equipmentDefinitionId }) => (
            equipmentDefinitionId
          )),
        },
      }
      : {};
    const projection = createArenaPublicSupplyProjectionAudit({
      schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
      snapshotTick,
      snapshotEventSequence: eventSequence,
      resyncReadiness,
      pendingAuthorityTick: resyncReadiness === ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY
        ? null
        : snapshotTick,
      pendingExpiryEquipmentInstanceIds: pendingExpiryEquipmentInstanceIds.sort(compareStrings),
      supplies,
    }, {
      snapshotTick,
      eventSequence,
      equipment: equipmentForPublicAudit,
      expectedWorldSupplyEquipmentInstanceIds,
      ...lifecycleContract,
    });
    return Object.freeze({
      projection,
      pendingExpiryEquipmentInstanceIds: Object.freeze(
        [...pendingExpiryEquipmentInstanceIds].sort(compareStrings),
      ),
    });
  }

  /**
   * Projects survival supply identity without parsing runtime Definition IDs.
   * Collection identity and level are resolved only through the registered
   * SurvivalEquipmentTierPolicyDefinition supplied by the owning Mode.
   */
  getPublicSupplyProjectionV3(options: unknown): EquipmentSupplyPublicProjectionV3Result {
    this.#assertUsable();
    const source = cloneFrozenData(
      options,
      'EquipmentSupplyTimelineSystem V3 public projection',
    );
    assertKnownKeys(
      source,
      PUBLIC_PROJECTION_V3_KEYS,
      'EquipmentSupplyTimelineSystem V3 public projection',
    );
    const modeDefinitionId = assertNonEmptyString(
      source.modeDefinitionId,
      'EquipmentSupplyTimelineSystem V3 public projection.modeDefinitionId',
    );
    const tierPolicy: SurvivalEquipmentTierPolicyDefinition =
      createSurvivalEquipmentTierPolicyDefinition(source.tierPolicyDefinition);
    if (tierPolicy.supplyDefinitionId !== this.#definitionId) {
      throw new RangeError('V3 public projection tier policy 与 supply Definition 不一致。');
    }
    const snapshotTick = safeTick(
      source.snapshotTick,
      'EquipmentSupplyTimelineSystem V3 public projection.snapshotTick',
    );
    const eventSequence = safeTick(
      source.eventSequence,
      'EquipmentSupplyTimelineSystem V3 public projection.eventSequence',
    );
    const timeline = this.getSnapshot();
    if (timeline.nextTick !== snapshotTick) {
      throw new RangeError(
        `V3 public supply projection 期望 timeline tick ${timeline.nextTick}，收到 ${snapshotTick}。`,
      );
    }
    if (!Array.isArray(source.equipment)) {
      throw new TypeError('EquipmentSupplyTimelineSystem V3 projection.equipment 必须是数组。');
    }
    const equipmentById = new Map<string, EquipmentRuntimeSnapshot>();
    for (const [index, value] of source.equipment.entries()) {
      const runtime = value as EquipmentRuntimeSnapshot;
      const instanceId = assertNonEmptyString(
        runtime.instanceId,
        `EquipmentSupplyTimelineSystem V3 projection.equipment[${index}].instanceId`,
      );
      if (equipmentById.has(instanceId)) {
        throw new RangeError(`V3 projection equipment instance ${instanceId} 重复。`);
      }
      equipmentById.set(instanceId, runtime);
    }

    const definition = this.#supplyRegistry.require(this.#definitionId);
    const elapsedSinceFirstSpawn = Math.max(0, snapshotTick - definition.firstSpawnTick);
    const nextWaveIndex = snapshotTick <= definition.firstSpawnTick
      ? 0
      : Math.ceil(elapsedSinceFirstSpawn / definition.spawnIntervalTicks);
    const nextSpawnTick = definition.firstSpawnTick
      + nextWaveIndex * definition.spawnIntervalTicks;
    if (!Number.isSafeInteger(nextSpawnTick)) {
      throw new RangeError('V3 public supply cadence下一波tick超过安全整数。');
    }
    const cadence = createArenaSupplyCadenceSnapshotV1({
      schemaVersion: 1,
      modeDefinitionId,
      supplyDefinitionId: definition.id,
      snapshotTick,
      nextWaveIndex,
      nextSpawnTick,
      remainingTicks: nextSpawnTick - snapshotTick,
      spawnCount: definition.spawnCount,
    });
    const worldSupplyEquipment: EquipmentSupplyWorldEquipmentSnapshotV3[] = [];
    const identities: ArenaPublicWorldSupplyIdentityV3[] = [];
    const supplies: Array<Readonly<{
      readonly schemaVersion: typeof ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION;
      readonly supplyDefinitionId: string;
      readonly tierPolicyDefinitionId: string;
      readonly supplyId: string;
      readonly slotId: string;
      readonly waveIndex: number;
      readonly survivalLevel: number;
      readonly collectionEquipmentDefinitionId: string;
      readonly runtimeEquipmentDefinitionId: string;
      readonly equipmentInstanceId: string;
      readonly equipmentSpawnId: string;
      readonly spawnPosition: Readonly<EquipmentPosition>;
      readonly spawnTick: number;
      readonly expireTick: number;
      readonly remainingTicks: number;
      readonly position: Readonly<EquipmentPosition>;
    }>> = [];
    const pendingExpiryEquipmentInstanceIds: string[] = [];

    for (const lifecycle of timeline.activeSupplies) {
      if (lifecycle.supplyDefinitionId !== definition.id) {
        throw new RangeError(`V3供给 ${lifecycle.supplyId} Definition 身份不一致。`);
      }
      const waveOffset = lifecycle.spawnTick - definition.firstSpawnTick;
      if (
        waveOffset < 0
        || waveOffset % definition.spawnIntervalTicks !== 0
        || !Number.isSafeInteger(waveOffset / definition.spawnIntervalTicks)
      ) {
        throw new RangeError(`V3供给 ${lifecycle.supplyId} 不属于合法波次。`);
      }
      const waveIndex = waveOffset / definition.spawnIntervalTicks;
      const spec = this.#spawnSpecs.find((candidate) => (
        createSupplyId(definition.id, waveIndex, candidate.slotId) === lifecycle.supplyId
      ));
      if (!spec || createEquipmentInstanceId(lifecycle.supplyId) !== lifecycle.equipmentInstanceId) {
        throw new RangeError(`V3供给 ${lifecycle.supplyId} 不属于冻结 spawn spec。`);
      }
      const runtime = equipmentById.get(lifecycle.equipmentInstanceId);
      if (!runtime) throw new RangeError(`V3供给 ${lifecycle.supplyId} 缺少 equipment runtime。`);
      const runtimeEquipmentDefinitionId = this.#equipmentDefinitionIdAt(waveIndex, spec.slotId);
      if (
        runtime.definitionId !== runtimeEquipmentDefinitionId
        || runtime.spawnId !== spec.spawnId
        || !samePosition(runtime.originPosition, spec.position)
      ) {
        throw new RangeError(`V3供给 ${lifecycle.supplyId} runtime/spawn 身份漂移。`);
      }
      if (
        runtime.locationState !== EQUIPMENT_LOCATION_STATE.SPAWNED
        && runtime.locationState !== EQUIPMENT_LOCATION_STATE.DROPPED
      ) continue;
      if (runtime.ownerId !== null || runtime.position === null) {
        throw new RangeError(`V3供给 ${lifecycle.supplyId} world owner/position 不一致。`);
      }
      const remainingTicks = lifecycle.expireTick - snapshotTick;
      if (!Number.isSafeInteger(remainingTicks) || remainingTicks < 0) {
        throw new RangeError(`V3供给 ${lifecycle.supplyId} remainingTicks 无效。`);
      }
      let tier = tierPolicy.tiers[0]!;
      for (const candidate of tierPolicy.tiers) {
        if (candidate.minimumWaveIndex > waveIndex) break;
        tier = candidate;
      }
      const variant = tier.variants.find((candidate) => (
        candidate.runtimeEquipmentDefinitionId === runtimeEquipmentDefinitionId
      ));
      if (!variant) {
        throw new RangeError(
          `V3供给 ${lifecycle.supplyId} runtime 不属于 wave ${waveIndex} tier。`,
        );
      }
      const position = Object.freeze({ ...runtime.position });
      const spawnPosition = Object.freeze({ ...spec.position });
      const worldEquipment = Object.freeze({
        schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION,
        instanceId: runtime.instanceId,
        runtimeEquipmentDefinitionId,
        collectionEquipmentDefinitionId: variant.collectionEquipmentDefinitionId,
        survivalLevel: tier.survivalLevel,
        spawnId: runtime.spawnId,
        locationState: runtime.locationState,
        ownerId: null,
        position,
        lastSafePosition: runtime.lastSafePosition === null
          ? null
          : Object.freeze({ ...runtime.lastSafePosition }),
        cooldownRemainingTicks: runtime.cooldownRemainingTicks,
        revision: runtime.revision,
      }) satisfies EquipmentSupplyWorldEquipmentSnapshotV3;
      const identity = Object.freeze({
        modeDefinitionId,
        supplyDefinitionId: definition.id,
        tierPolicyDefinitionId: tierPolicy.id,
        supplyId: lifecycle.supplyId,
        slotId: spec.slotId,
        waveIndex,
        survivalLevel: tier.survivalLevel,
        collectionEquipmentDefinitionId: variant.collectionEquipmentDefinitionId,
        runtimeEquipmentDefinitionId,
        equipmentInstanceId: runtime.instanceId,
        equipmentSpawnId: runtime.spawnId,
        spawnPosition,
        spawnTick: lifecycle.spawnTick,
        expireTick: lifecycle.expireTick,
      }) satisfies ArenaPublicWorldSupplyIdentityV3;
      worldSupplyEquipment.push(worldEquipment);
      identities.push(identity);
      if (remainingTicks === 0) {
        pendingExpiryEquipmentInstanceIds.push(runtime.instanceId);
        continue;
      }
      supplies.push(Object.freeze({
        schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION,
        supplyDefinitionId: definition.id,
        tierPolicyDefinitionId: tierPolicy.id,
        supplyId: lifecycle.supplyId,
        slotId: spec.slotId,
        waveIndex,
        survivalLevel: tier.survivalLevel,
        collectionEquipmentDefinitionId: variant.collectionEquipmentDefinitionId,
        runtimeEquipmentDefinitionId,
        equipmentInstanceId: runtime.instanceId,
        equipmentSpawnId: runtime.spawnId,
        spawnPosition,
        spawnTick: lifecycle.spawnTick,
        expireTick: lifecycle.expireTick,
        remainingTicks,
        position,
      }));
    }

    identities.sort((left, right) => compareStrings(left.supplyId, right.supplyId));
    supplies.sort((left, right) => compareStrings(left.supplyId, right.supplyId));
    worldSupplyEquipment.sort((left, right) => compareStrings(left.instanceId, right.instanceId));
    pendingExpiryEquipmentInstanceIds.sort(compareStrings);
    const resyncReadiness = pendingExpiryEquipmentInstanceIds.length === 0
      ? ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.READY
      : ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.NOT_READY_PRE_EXPIRY;
    const projection = createArenaPublicSupplyProjectionV3Audit({
      schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION,
      modeDefinitionId,
      snapshotTick,
      snapshotEventSequence: eventSequence,
      resyncReadiness,
      pendingAuthorityTick: resyncReadiness === ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.READY
        ? null
        : snapshotTick,
      pendingExpiryEquipmentInstanceIds,
      supplies,
    }, {
      modeDefinitionId,
      snapshotTick,
      eventSequence,
      worldSupplyEquipment,
      expectedWorldSupplyIdentities: identities,
    });
    return Object.freeze({
      projection,
      cadence,
      pendingExpiryEquipmentInstanceIds: Object.freeze([...pendingExpiryEquipmentInstanceIds]),
      worldSupplyEquipment: Object.freeze([...worldSupplyEquipment]),
      expectedWorldSupplyIdentities: Object.freeze([...identities]),
    });
  }

  getSnapshot(): EquipmentSupplyTimelineSnapshot {
    this.#assertUsable();
    if (this.#pending) throw new Error('EquipmentSupplyTimelineSystem 不能快照未完成 tick。');
    return Object.freeze({
      schemaVersion: EQUIPMENT_SUPPLY_TIMELINE_SNAPSHOT_SCHEMA_VERSION,
      supplyDefinitionId: this.#definitionId,
      nextTick: this.#nextTick,
      activeSupplies: this.listActiveSupplies(),
    });
  }

  #restore(value: unknown): void {
    const source = cloneFrozenData(value, 'EquipmentSupplyTimelineSnapshot');
    assertKnownKeys(source, SNAPSHOT_KEYS, 'EquipmentSupplyTimelineSnapshot');
    if (source.schemaVersion !== EQUIPMENT_SUPPLY_TIMELINE_SNAPSHOT_SCHEMA_VERSION) {
      throw new RangeError(
        `EquipmentSupplyTimelineSnapshot.schemaVersion 必须是 ${EQUIPMENT_SUPPLY_TIMELINE_SNAPSHOT_SCHEMA_VERSION}。`,
      );
    }
    if (source.supplyDefinitionId !== this.#definitionId) {
      throw new RangeError('EquipmentSupplyTimelineSnapshot Definition 身份不一致。');
    }
    const nextTick = safeTick(source.nextTick, 'EquipmentSupplyTimelineSnapshot.nextTick');
    if (!Array.isArray(source.activeSupplies)) {
      throw new TypeError('EquipmentSupplyTimelineSnapshot.activeSupplies 必须是数组。');
    }
    const definition = this.#supplyRegistry.require(this.#definitionId);
    for (const value of source.activeSupplies) {
      const lifecycle = createEquipmentSupplyLifecycle(value, definition);
      if (lifecycle.spawnTick >= nextTick || lifecycle.expireTick < nextTick) {
        throw new RangeError(`snapshot active supply ${lifecycle.supplyId} 不覆盖 nextTick。`);
      }
      if (
        this.#activeSupplies.has(lifecycle.supplyId)
        || [...this.#activeSupplies.values()].some(({ equipmentInstanceId }) => (
          equipmentInstanceId === lifecycle.equipmentInstanceId
        ))
      ) throw new RangeError(`snapshot 包含重复 supply ${lifecycle.supplyId}。`);
      const waveIndex = (lifecycle.spawnTick - definition.firstSpawnTick)
        / definition.spawnIntervalTicks;
      const spec = this.#spawnSpecs.find((candidate) => (
        createSupplyId(definition.id, waveIndex, candidate.slotId) === lifecycle.supplyId
      ));
      if (!spec || createEquipmentInstanceId(lifecycle.supplyId) !== lifecycle.equipmentInstanceId) {
        throw new RangeError(`snapshot supply ${lifecycle.supplyId} 不是组合层注册身份。`);
      }
      const runtime = this.#equipmentSystem.getSnapshot(lifecycle.equipmentInstanceId);
      if (
        runtime.definitionId !== this.#equipmentDefinitionIdAt(waveIndex, spec.slotId)
        || runtime.locationState === EQUIPMENT_LOCATION_STATE.DESPAWNED
      ) throw new RangeError(`snapshot supply ${lifecycle.supplyId} 与 EquipmentSystem 冲突。`);
      this.#activeSupplies.set(lifecycle.supplyId, lifecycle);
    }
    this.#nextTick = nextTick;
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#pending = null;
    this.#activeSupplies.clear();
  }
}
