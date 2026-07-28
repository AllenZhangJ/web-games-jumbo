import {
  ARENA_MATCH_EVENT,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type { EquipmentSupplyRegistryContract } from '@number-strategy-jump/arena-definitions';
import {
  EQUIPMENT_LOCATION_STATE,
  type EquipmentPosition,
  type EquipmentRegistryContract,
} from './equipment-runtime.js';
import {
  EQUIPMENT_SUPPLY_LIFECYCLE_SCHEMA_VERSION,
  createEquipmentSupplyLifecycle,
  type EquipmentSupplyLifecycle,
} from './equipment-supply-lifecycle.js';
import {
  EquipmentSystem,
  type EquipmentSupplyExpiredEvent,
  type EquipmentSupplyPickupDecision,
  type EquipmentSupplyPickupEvent,
} from './equipment-system.js';

export const EQUIPMENT_SUPPLY_TIMELINE_SNAPSHOT_SCHEMA_VERSION = 1 as const;

const OPTIONS_KEYS = new Set([
  'supplyDefinitionId',
  'spawnSpecs',
  'equipmentRegistry',
  'equipmentSupplyRegistry',
  'equipmentSystem',
  'snapshot',
]);
const SPEC_KEYS = new Set(['slotId', 'equipmentDefinitionId', 'spawnId', 'position']);
const POSITION_KEYS = new Set(['x', 'y', 'z']);
const STEP_KEYS = new Set(['tick', 'participants', 'contestSeed']);
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
  readonly expiredEvents: readonly EquipmentSupplyExpiredEvent[];
  readonly pickupDecisions: readonly EquipmentSupplyPickupDecision[];
  readonly pickupEvents: readonly EquipmentSupplyPickupEvent[];
  readonly nextPhase: 'action';
}

interface PendingTick {
  readonly tick: number;
  readonly spawned: readonly EquipmentSupplyLifecycle[];
  readonly expiredEvents: readonly EquipmentSupplyExpiredEvent[];
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

function createSupplyId(definitionId: string, waveIndex: number, slotId: string): string {
  return `${definitionId}:wave-${waveIndex}:slot-${slotId}`;
}

function createEquipmentInstanceId(supplyId: string): string {
  return `${supplyId}:equipment`;
}

export class EquipmentSupplyTimelineSystem {
  readonly #definitionId: string;
  readonly #equipmentRegistry: EquipmentRegistryContract;
  readonly #supplyRegistry: EquipmentSupplyRegistryContract;
  readonly #equipmentSystem: EquipmentSystem;
  readonly #spawnSpecs: readonly EquipmentSupplySpawnSpec[];
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
    if (!(equipmentSystem instanceof EquipmentSystem)) {
      throw new TypeError('EquipmentSupplyTimelineSystem 需要 EquipmentSystem authority。');
    }
    this.#equipmentRegistry = equipmentRegistry as EquipmentRegistryContract;
    this.#supplyRegistry = supplyRegistry as EquipmentSupplyRegistryContract;
    this.#equipmentSystem = equipmentSystem;
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

    if (source.snapshot !== undefined) this.#restore(source.snapshot);
  }

  get nextTick(): number {
    this.#assertUsable();
    return this.#nextTick;
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
          definitionId: spec.equipmentDefinitionId,
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
        runtime.definitionId !== spec.equipmentDefinitionId
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
