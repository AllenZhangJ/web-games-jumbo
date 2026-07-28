import {
  ARENA_MATCH_EVENT,
  EQUIPMENT_EXPIRY_REASON,
  EQUIPMENT_RECYCLE_REASON,
  EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createEquipmentExpiredEventPayload,
  createEquipmentRecycledEventPayload,
  createEquipmentReplacedEventPayload,
  type EquipmentExpiredEventPayload,
  type EquipmentRecycledEventPayload,
  type EquipmentReplacedEventPayload,
} from '@number-strategy-jump/arena-contracts';
import type { EquipmentSupplyRegistryContract } from '@number-strategy-jump/arena-definitions';
import {
  createEquipmentSupplyLifecycle,
  type EquipmentSupplyLifecycle,
} from './equipment-supply-lifecycle.js';
import {
  ACTION_PRIORITY,
  type ActionCandidate,
  type ActionRegistryContract,
} from '@number-strategy-jump/arena-core';
import { advanceEquipmentCooldown, isEquipmentCooldownReady } from './equipment-cooldown.js';
import { resolveEquipmentDrop } from './equipment-drop-resolver.js';
import { EquipmentPickupResolver } from './equipment-pickup-resolver.js';
import {
  EQUIPMENT_LOCATION_STATE,
  createEquipmentRuntimeSnapshot,
  type EquipmentPosition,
  type EquipmentRegistryContract,
  type EquipmentRuntimeSnapshot,
  type EquipmentRuntimeState,
} from './equipment-runtime.js';
import { EquipmentSpawner } from './equipment-spawner.js';
import { serializeEquipmentRuntimeStates } from './equipment-serializer.js';

const PICKUP_OPTIONS_KEYS = new Set(['participants', 'contestSeed']);
const SUPPLY_PICKUP_OPTIONS_KEYS = new Set(['participants', 'supplies', 'contestSeed', 'tick']);
const SUPPLY_TIMELINE_OPTIONS_KEYS = new Set(['tick', 'spawns', 'expirations']);
const SUPPLY_TIMELINE_SPAWN_KEYS = new Set([
  'lifecycle',
  'definitionId',
  'spawnId',
  'position',
]);
const SUPPLY_LIFECYCLE_KEYS = new Set([
  'schemaVersion',
  'supplyDefinitionId',
  'supplyId',
  'equipmentInstanceId',
  'spawnTick',
  'expireTick',
]);
const DROP_OPTIONS_KEYS = new Set(['isPositionValid']);
const RECONCILE_OPTIONS_KEYS = new Set(['isPositionValid']);
const PICKUP_PARTICIPANT_KEYS = new Set(['id', 'position', 'eligible']);
const POSITION_KEYS = new Set(['x', 'y', 'z']);

interface EquipmentSystemOptions {
  readonly participantIds: unknown;
  readonly actionRegistry: unknown;
  readonly equipmentRegistry: unknown;
  readonly equipmentSupplyRegistry?: unknown;
}

interface SystemPickupParticipant {
  readonly id: string;
  readonly position: EquipmentPosition;
  readonly eligible: boolean;
}

export interface EquipmentDropResult {
  readonly participantId: string;
  readonly equipment: EquipmentRuntimeSnapshot;
  readonly fallbackUsed: boolean;
  readonly despawned: boolean;
  readonly diagnosticCode: string | null;
}

export type EquipmentSupplyPickupEvent = Readonly<
  | { readonly type: typeof ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED; readonly payload: EquipmentRecycledEventPayload }
  | { readonly type: typeof ARENA_MATCH_EVENT.EQUIPMENT_REPLACED; readonly payload: EquipmentReplacedEventPayload }
>;

export interface EquipmentSupplyPickupDecision {
  readonly participantId: string;
  readonly equipmentInstanceId: string;
  readonly previousEquipmentInstanceId: string | null;
  readonly distanceSquared: number;
  readonly kind: 'picked-up' | 'replaced';
}

export interface EquipmentSupplyPickupTransactionResult {
  readonly decisions: readonly EquipmentSupplyPickupDecision[];
  readonly events: readonly EquipmentSupplyPickupEvent[];
}

export interface EquipmentSupplyTimelineSpawn {
  readonly lifecycle: EquipmentSupplyLifecycle;
  readonly definitionId: string;
  readonly spawnId: string;
  readonly position: EquipmentPosition;
}

export interface EquipmentSupplyExpiredEvent {
  readonly type: typeof ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED;
  readonly payload: EquipmentExpiredEventPayload;
}

export interface EquipmentSupplyTimelinePhaseResult {
  readonly spawned: readonly EquipmentRuntimeSnapshot[];
  readonly events: readonly EquipmentSupplyExpiredEvent[];
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function clonePosition(value: unknown, name: string): EquipmentPosition {
  assertKnownKeys(value, POSITION_KEYS, name);
  const position: EquipmentPosition = { x: 0, y: 0, z: 0 };
  for (const axis of ['x', 'y', 'z'] as const) {
    const coordinate = value[axis];
    if (!Number.isFinite(coordinate)) {
      throw new TypeError(`${name}.${axis} 必须是有限数。`);
    }
    position[axis] = coordinate as number;
  }
  return position;
}

export class EquipmentSystem {
  readonly #actionRegistry: ActionRegistryContract;
  readonly #equipmentRegistry: EquipmentRegistryContract;
  readonly #equipmentSupplyRegistry: EquipmentSupplyRegistryContract | null;
  readonly #participantIds: readonly string[];
  readonly #runtimes: Map<string, EquipmentRuntimeState>;
  readonly #heldByParticipant: Map<string, string>;
  readonly #pickupResolver: EquipmentPickupResolver;
  readonly #spawner: EquipmentSpawner;
  #destroyed: boolean;
  #mutating: boolean;

  constructor({
    participantIds,
    actionRegistry,
    equipmentRegistry,
    equipmentSupplyRegistry,
  }: EquipmentSystemOptions) {
    const actionCatalog = actionRegistry as Partial<ActionRegistryContract> | null;
    const equipmentCatalog = equipmentRegistry as Partial<EquipmentRegistryContract> | null;
    if (
      !Array.isArray(participantIds)
      || participantIds.length === 0
      || participantIds.some((id) => typeof id !== 'string' || id.trim().length === 0)
      || new Set(participantIds).size !== participantIds.length
    ) throw new RangeError('EquipmentSystem 需要唯一非空 participantIds。');
    if (!actionCatalog || typeof actionCatalog.require !== 'function') {
      throw new TypeError('EquipmentSystem 需要只读 ActionRegistry。');
    }
    if (!equipmentCatalog || typeof equipmentCatalog.require !== 'function') {
      throw new TypeError('EquipmentSystem 需要只读 EquipmentRegistry。');
    }
    this.#actionRegistry = actionCatalog as ActionRegistryContract;
    this.#equipmentRegistry = equipmentCatalog as EquipmentRegistryContract;
    if (equipmentSupplyRegistry === undefined) {
      this.#equipmentSupplyRegistry = null;
    } else {
      const supplyCatalog = equipmentSupplyRegistry as Partial<EquipmentSupplyRegistryContract> | null;
      if (!supplyCatalog || typeof supplyCatalog.require !== 'function') {
        throw new TypeError('EquipmentSystem equipmentSupplyRegistry 必须是只读 Registry。');
      }
      this.#equipmentSupplyRegistry = supplyCatalog as EquipmentSupplyRegistryContract;
    }
    this.#participantIds = Object.freeze([...(participantIds as string[])].sort(compareStrings));
    this.#runtimes = new Map<string, EquipmentRuntimeState>();
    this.#heldByParticipant = new Map<string, string>();
    this.#pickupResolver = new EquipmentPickupResolver({ equipmentRegistry: this.#equipmentRegistry });
    this.#spawner = new EquipmentSpawner({ equipmentRegistry: this.#equipmentRegistry });
    this.#destroyed = false;
    this.#mutating = false;
    Object.freeze(this);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('EquipmentSystem 已销毁。');
  }

  #requireParticipant(participantId: unknown): string {
    const id = assertNonEmptyString(participantId, 'equipment participantId');
    if (!this.#participantIds.includes(id)) throw new RangeError(`未知 equipment participant ${id}。`);
    return id;
  }

  #requireRuntime(instanceId: unknown): EquipmentRuntimeState {
    const id = assertNonEmptyString(instanceId, 'equipment instanceId');
    const runtime = this.#runtimes.get(id);
    if (!runtime) throw new RangeError(`未知 equipment instance ${String(instanceId)}。`);
    return runtime;
  }

  #runMutation<T>(operation: () => T): T {
    this.#assertUsable();
    if (this.#mutating) throw new Error('EquipmentSystem 权威变更不可重入。');
    this.#mutating = true;
    try {
      return operation();
    } finally {
      this.#mutating = false;
    }
  }

  #assertOwnershipInvariants(): void {
    const seenOwners = new Set<string>();
    for (const runtime of this.#runtimes.values()) {
      this.#equipmentRegistry.require(runtime.definitionId);
      const snapshot = createEquipmentRuntimeSnapshot(runtime);
      if (snapshot.locationState !== EQUIPMENT_LOCATION_STATE.HELD) continue;
      const ownerId = this.#requireParticipant(snapshot.ownerId);
      if (seenOwners.has(ownerId)) {
        throw new Error(`participant ${ownerId} 同时拥有多件 primary equipment。`);
      }
      seenOwners.add(ownerId);
      if (this.#heldByParticipant.get(ownerId) !== snapshot.instanceId) {
        throw new Error(`participant ${ownerId} 的 primary slot 与 owner 不一致。`);
      }
    }
    for (const [participantId, instanceId] of this.#heldByParticipant) {
      this.#requireParticipant(participantId);
      const runtime = this.#requireRuntime(instanceId);
      if (
        runtime.locationState !== EQUIPMENT_LOCATION_STATE.HELD
        || runtime.ownerId !== participantId
      ) throw new Error(`participant ${participantId} 的 primary slot 指向错误 owner。`);
    }
  }

  spawn(options: unknown): EquipmentRuntimeSnapshot {
    return this.#runMutation(() => {
      const runtime = this.#spawner.createRuntime(options);
      if (this.#runtimes.has(runtime.instanceId)) {
        throw new RangeError(`重复 equipment instance ${runtime.instanceId}。`);
      }
      this.#runtimes.set(runtime.instanceId, runtime);
      return createEquipmentRuntimeSnapshot(runtime);
    });
  }

  applySupplyTimelinePhase(options: unknown): EquipmentSupplyTimelinePhaseResult {
    return this.#runMutation(() => {
      if (!this.#equipmentSupplyRegistry) {
        throw new Error('EquipmentSystem 未配置 EquipmentSupplyRegistry。');
      }
      assertKnownKeys(options, SUPPLY_TIMELINE_OPTIONS_KEYS, 'EquipmentSystem supply timeline');
      const tick = assertIntegerAtLeast(options.tick, 0, 'EquipmentSystem supply timeline tick');
      if (!Number.isSafeInteger(tick)) {
        throw new RangeError('EquipmentSystem supply timeline tick 必须是安全整数。');
      }
      if (!Array.isArray(options.spawns) || !Array.isArray(options.expirations)) {
        throw new TypeError('EquipmentSystem supply timeline spawns/expirations 必须是数组。');
      }
      this.#assertOwnershipInvariants();

      const pendingSpawns: Array<Readonly<{
        lifecycle: EquipmentSupplyLifecycle;
        runtime: EquipmentRuntimeState;
      }>> = [];
      const pendingSpawnIds = new Set<string>();
      for (let index = 0; index < options.spawns.length; index += 1) {
        const source = cloneFrozenData(
          options.spawns[index],
          `EquipmentSystem supply timeline spawn[${index}]`,
        );
        assertKnownKeys(
          source,
          SUPPLY_TIMELINE_SPAWN_KEYS,
          `EquipmentSystem supply timeline spawn[${index}]`,
        );
        const lifecycleSource = cloneFrozenData(
          source.lifecycle,
          `EquipmentSystem supply timeline spawn[${index}].lifecycle`,
        );
        assertKnownKeys(
          lifecycleSource,
          SUPPLY_LIFECYCLE_KEYS,
          `EquipmentSystem supply timeline spawn[${index}].lifecycle`,
        );
        const definitionId = assertNonEmptyString(
          lifecycleSource.supplyDefinitionId,
          `EquipmentSystem supply timeline spawn[${index}].supplyDefinitionId`,
        );
        const supplyDefinition = this.#equipmentSupplyRegistry.require(definitionId);
        const lifecycle = createEquipmentSupplyLifecycle(lifecycleSource, supplyDefinition);
        if (lifecycle.spawnTick !== tick) {
          throw new RangeError(`supply ${lifecycle.supplyId} 只能在 spawnTick 生成。`);
        }
        if (
          pendingSpawnIds.has(lifecycle.equipmentInstanceId)
          || this.#runtimes.has(lifecycle.equipmentInstanceId)
        ) throw new RangeError(`重复 equipment instance ${lifecycle.equipmentInstanceId}。`);
        pendingSpawnIds.add(lifecycle.equipmentInstanceId);
        const runtime = this.#spawner.createRuntime({
          instanceId: lifecycle.equipmentInstanceId,
          definitionId: source.definitionId,
          spawnId: source.spawnId,
          position: source.position,
        });
        pendingSpawns.push(Object.freeze({ lifecycle, runtime }));
      }
      pendingSpawns.sort((left, right) => compareStrings(
        left.lifecycle.supplyId,
        right.lifecycle.supplyId,
      ));

      const pendingExpirations: Array<Readonly<{
        lifecycle: EquipmentSupplyLifecycle;
        runtime: EquipmentRuntimeState;
        event: EquipmentSupplyExpiredEvent | null;
        remove: boolean;
      }>> = [];
      const expirationIds = new Set<string>();
      for (let index = 0; index < options.expirations.length; index += 1) {
        const lifecycleSource = cloneFrozenData(
          options.expirations[index],
          `EquipmentSystem supply timeline expiration[${index}]`,
        );
        const definitionId = assertNonEmptyString(
          lifecycleSource.supplyDefinitionId,
          `EquipmentSystem supply timeline expiration[${index}].supplyDefinitionId`,
        );
        const supplyDefinition = this.#equipmentSupplyRegistry.require(definitionId);
        const lifecycle = createEquipmentSupplyLifecycle(lifecycleSource, supplyDefinition);
        if (lifecycle.expireTick !== tick) {
          throw new RangeError(`supply ${lifecycle.supplyId} 只能在 expireTick 过期。`);
        }
        if (
          expirationIds.has(lifecycle.equipmentInstanceId)
          || pendingSpawnIds.has(lifecycle.equipmentInstanceId)
        ) throw new RangeError(`重复 supply expiration ${lifecycle.equipmentInstanceId}。`);
        expirationIds.add(lifecycle.equipmentInstanceId);
        const runtime = this.#requireRuntime(lifecycle.equipmentInstanceId);
        this.#equipmentRegistry.require(runtime.definitionId);
        const world = runtime.locationState === EQUIPMENT_LOCATION_STATE.SPAWNED
          || runtime.locationState === EQUIPMENT_LOCATION_STATE.DROPPED;
        const held = runtime.locationState === EQUIPMENT_LOCATION_STATE.HELD;
        if (!world && !held && runtime.locationState !== EQUIPMENT_LOCATION_STATE.DESPAWNED) {
          throw new Error(`supply ${lifecycle.supplyId} 状态不可判定。`);
        }
        const event = world
          ? Object.freeze({
            type: ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED,
            payload: createEquipmentExpiredEventPayload({
              schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
              supplyDefinitionId: lifecycle.supplyDefinitionId,
              supplyId: lifecycle.supplyId,
              equipmentInstanceId: lifecycle.equipmentInstanceId,
              spawnTick: lifecycle.spawnTick,
              expireTick: lifecycle.expireTick,
              tick,
              expiredEquipmentInstanceId: lifecycle.equipmentInstanceId,
              reason: EQUIPMENT_EXPIRY_REASON.LIFETIME_EXPIRED,
            }),
          })
          : null;
        pendingExpirations.push(Object.freeze({
          lifecycle,
          runtime,
          event,
          remove: !held,
        }));
      }
      pendingExpirations.sort((left, right) => compareStrings(
        left.lifecycle.supplyId,
        right.lifecycle.supplyId,
      ));

      const result = Object.freeze({
        spawned: Object.freeze(pendingSpawns.map(({ runtime }) => (
          createEquipmentRuntimeSnapshot(runtime)
        ))),
        events: Object.freeze(pendingExpirations.flatMap(({ event }) => event ? [event] : [])),
      });
      // Atomic authority commit: all registries, identities, states and payloads are validated above.
      try {
        for (const { runtime } of pendingSpawns) this.#runtimes.set(runtime.instanceId, runtime);
        for (const { runtime, remove } of pendingExpirations) {
          if (remove && !this.#runtimes.delete(runtime.instanceId)) {
            throw new Error(`待过期 equipment ${runtime.instanceId} 已不在权威集合。`);
          }
        }
      } catch (error) {
        this.#destroyed = true;
        this.#heldByParticipant.clear();
        this.#runtimes.clear();
        throw error;
      }
      return result;
    });
  }

  resolvePickups(options: unknown) {
    return this.#runMutation(() => {
      assertKnownKeys(options, PICKUP_OPTIONS_KEYS, 'EquipmentSystem pickup options');
      const { participants, contestSeed } = options;
      if (!Array.isArray(participants)) throw new TypeError('EquipmentSystem participants 必须是数组。');
      const participantById = new Map<string, SystemPickupParticipant>();
      for (const participant of participants) {
        assertKnownKeys(participant, PICKUP_PARTICIPANT_KEYS, 'EquipmentPickup participant');
        const position = clonePosition(
          participant.position,
          'EquipmentPickup participant.position',
        );
        if (typeof participant.eligible !== 'boolean') {
          throw new TypeError('EquipmentPickup participant.eligible 必须是布尔值。');
        }
        const id = this.#requireParticipant(participant.id);
        if (participantById.has(id)) throw new RangeError(`重复 pickup participant ${id}。`);
        participantById.set(id, { id, position, eligible: participant.eligible });
      }
      if (participantById.size !== this.#participantIds.length) {
        throw new RangeError('EquipmentSystem pickup 必须包含全部 participants。');
      }
      const decisions = this.#pickupResolver.resolve({
        participants: this.#participantIds.map((id) => {
          const participant = participantById.get(id);
          if (!participant) throw new Error(`pickup participant map 缺少 ${id}。`);
          return {
            ...participant,
            eligible: participant.eligible && !this.#heldByParticipant.has(id),
          };
        }),
        equipment: [...this.#runtimes.values()].map(createEquipmentRuntimeSnapshot),
        contestSeed,
      });
      const pending = decisions.map((decision) => {
        const runtime = this.#requireRuntime(decision.equipmentInstanceId);
        if (this.#heldByParticipant.has(decision.participantId)) {
          throw new Error(`participant ${decision.participantId} 的 primary slot 已占用。`);
        }
        return { decision, runtime };
      });
      for (const { decision, runtime } of pending) {
        runtime.locationState = EQUIPMENT_LOCATION_STATE.HELD;
        runtime.ownerId = decision.participantId;
        runtime.position = null;
        runtime.revision += 1;
        this.#heldByParticipant.set(decision.participantId, runtime.instanceId);
      }
      return decisions;
    });
  }

  resolveSupplyPickups(options: unknown): EquipmentSupplyPickupTransactionResult {
    return this.#runMutation(() => {
      if (!this.#equipmentSupplyRegistry) {
        throw new Error('EquipmentSystem 未配置 EquipmentSupplyRegistry。');
      }
      assertKnownKeys(options, SUPPLY_PICKUP_OPTIONS_KEYS, 'EquipmentSystem supply pickup options');
      const { participants, supplies, contestSeed } = options;
      const tick = assertIntegerAtLeast(options.tick, 0, 'EquipmentSystem supply pickup tick');
      if (!Array.isArray(participants) || !Array.isArray(supplies)) {
        throw new TypeError('EquipmentSystem supply pickup participants/supplies 必须是数组。');
      }
      this.#assertOwnershipInvariants();
      const participantById = new Map<string, SystemPickupParticipant>();
      for (const participant of participants) {
        assertKnownKeys(participant, PICKUP_PARTICIPANT_KEYS, 'EquipmentSupplyPickup participant');
        const id = this.#requireParticipant(participant.id);
        if (participantById.has(id)) throw new RangeError(`重复 supply pickup participant ${id}。`);
        if (typeof participant.eligible !== 'boolean') {
          throw new TypeError('EquipmentSupplyPickup participant.eligible 必须是布尔值。');
        }
        participantById.set(id, {
          id,
          position: clonePosition(
            participant.position,
            'EquipmentSupplyPickup participant.position',
          ),
          eligible: participant.eligible,
        });
      }
      if (participantById.size !== this.#participantIds.length) {
        throw new RangeError('EquipmentSystem supply pickup 必须包含全部 participants。');
      }

      const lifecycleByEquipment = new Map<string, EquipmentSupplyLifecycle>();
      const supplyIds = new Set<string>();
      const candidates: Array<Readonly<{
        equipment: EquipmentRuntimeSnapshot;
        pickupRadius: number;
      }>> = [];
      for (let index = 0; index < supplies.length; index += 1) {
        const source = cloneFrozenData(supplies[index], `EquipmentSupplyPickup supply[${index}]`);
        assertKnownKeys(source, SUPPLY_LIFECYCLE_KEYS, `EquipmentSupplyPickup supply[${index}]`);
        const definitionId = assertNonEmptyString(
          source.supplyDefinitionId,
          `EquipmentSupplyPickup supply[${index}].supplyDefinitionId`,
        );
        const definition = this.#equipmentSupplyRegistry.require(definitionId);
        const lifecycle = createEquipmentSupplyLifecycle(source, definition);
        if (supplyIds.has(lifecycle.supplyId)) {
          throw new RangeError(`重复 equipment supply ${lifecycle.supplyId}。`);
        }
        if (lifecycleByEquipment.has(lifecycle.equipmentInstanceId)) {
          throw new RangeError(`重复 supply equipment ${lifecycle.equipmentInstanceId}。`);
        }
        supplyIds.add(lifecycle.supplyId);
        lifecycleByEquipment.set(lifecycle.equipmentInstanceId, lifecycle);
        if (tick < lifecycle.spawnTick || tick >= lifecycle.expireTick) {
          throw new RangeError(`supply equipment ${lifecycle.equipmentInstanceId} 当前 tick 不可拾取。`);
        }
        const runtime = this.#requireRuntime(lifecycle.equipmentInstanceId);
        this.#equipmentRegistry.require(runtime.definitionId);
        if (
          runtime.locationState === EQUIPMENT_LOCATION_STATE.SPAWNED
          || runtime.locationState === EQUIPMENT_LOCATION_STATE.DROPPED
        ) {
          candidates.push(Object.freeze({
            equipment: createEquipmentRuntimeSnapshot(runtime),
            pickupRadius: definition.pickupRadius,
          }));
          continue;
        }
        if (
          runtime.locationState !== EQUIPMENT_LOCATION_STATE.HELD
          && runtime.locationState !== EQUIPMENT_LOCATION_STATE.DESPAWNED
        ) throw new Error(`supply equipment ${runtime.instanceId} 状态不可判定。`);
      }

      const decisions = this.#pickupResolver.resolveSupply({
        participants: this.#participantIds.map((id) => {
          const participant = participantById.get(id);
          if (!participant) throw new Error(`supply pickup participant map 缺少 ${id}。`);
          return participant;
        }),
        supplies: candidates,
        contestSeed,
      });
      const pending: Array<Readonly<{
        target: EquipmentRuntimeState;
        previous: EquipmentRuntimeState | null;
        decision: EquipmentSupplyPickupDecision;
      }>> = [];
      const transactionEvents: EquipmentSupplyPickupEvent[] = [];
      const transactionDecisions: EquipmentSupplyPickupDecision[] = [];
      for (const decision of decisions) {
        const participant = participantById.get(decision.participantId);
        if (!participant?.eligible) {
          throw new Error(`participant ${decision.participantId} 在提交前失去拾取资格。`);
        }
        const target = this.#requireRuntime(decision.equipmentInstanceId);
        if (
          target.locationState !== EQUIPMENT_LOCATION_STATE.SPAWNED
          && target.locationState !== EQUIPMENT_LOCATION_STATE.DROPPED
        ) throw new Error(`supply target ${target.instanceId} 在提交前不属于世界实例。`);
        if (target.ownerId !== null || target.position === null) {
          throw new Error(`supply target ${target.instanceId} owner/position 不一致。`);
        }
        const lifecycle = lifecycleByEquipment.get(target.instanceId);
        if (!lifecycle) throw new Error(`supply target ${target.instanceId} 缺少生命周期身份。`);
        const previousId = this.#heldByParticipant.get(decision.participantId) ?? null;
        if (previousId === target.instanceId) {
          throw new Error(`participant ${decision.participantId} 不能用同一装备替换自身。`);
        }
        const previous = previousId ? this.#requireRuntime(previousId) : null;
        if (previous && (
          previous.locationState !== EQUIPMENT_LOCATION_STATE.HELD
          || previous.ownerId !== decision.participantId
          || previous.position !== null
        )) throw new Error(`participant ${decision.participantId} 的旧装备 owner/slot 不一致。`);
        if (!Number.isSafeInteger(target.revision + 1) || (previous && !Number.isSafeInteger(previous.revision + 1))) {
          throw new RangeError('EquipmentSupplyPickup revision 超出安全整数范围。');
        }
        const resultDecision = Object.freeze({
          participantId: decision.participantId,
          equipmentInstanceId: decision.equipmentInstanceId,
          previousEquipmentInstanceId: previousId,
          distanceSquared: decision.distanceSquared,
          kind: previous ? 'replaced' as const : 'picked-up' as const,
        });
        transactionDecisions.push(resultDecision);
        if (previous) {
          const identity = {
            schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
            supplyDefinitionId: lifecycle.supplyDefinitionId,
            supplyId: lifecycle.supplyId,
            equipmentInstanceId: lifecycle.equipmentInstanceId,
            spawnTick: lifecycle.spawnTick,
            expireTick: lifecycle.expireTick,
            tick,
            participantId: decision.participantId,
          };
          transactionEvents.push(Object.freeze({
            type: ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED,
            payload: createEquipmentRecycledEventPayload({
              ...identity,
              recycledEquipmentInstanceId: previous.instanceId,
              replacementEquipmentInstanceId: target.instanceId,
              reason: EQUIPMENT_RECYCLE_REASON.REPLACED,
            }),
          }));
          transactionEvents.push(Object.freeze({
            type: ARENA_MATCH_EVENT.EQUIPMENT_REPLACED,
            payload: createEquipmentReplacedEventPayload({
              ...identity,
              previousEquipmentInstanceId: previous.instanceId,
              nextEquipmentInstanceId: target.instanceId,
            }),
          }));
        }
        pending.push(Object.freeze({ target, previous, decision: resultDecision }));
      }

      const result = Object.freeze({
        decisions: Object.freeze(transactionDecisions),
        events: Object.freeze(transactionEvents),
      });
      // Commit point: every external value, invariant and event payload is now validated.
      // The remaining block performs only private, synchronous assignments and exposes no callback.
      try {
        for (const { target, previous, decision } of pending) {
          if (previous) {
            if (!this.#runtimes.delete(previous.instanceId)) {
              throw new Error(`待回收 equipment ${previous.instanceId} 已不在权威集合。`);
            }
          }
          target.locationState = EQUIPMENT_LOCATION_STATE.HELD;
          target.ownerId = decision.participantId;
          target.position = null;
          target.revision += 1;
          this.#heldByParticipant.set(decision.participantId, target.instanceId);
        }
      } catch (error) {
        this.#destroyed = true;
        this.#heldByParticipant.clear();
        this.#runtimes.clear();
        throw error;
      }
      return result;
    });
  }

  getActionCandidate(participantId: unknown): ActionCandidate | null {
    this.#assertUsable();
    const id = this.#requireParticipant(participantId);
    const instanceId = this.#heldByParticipant.get(id);
    if (!instanceId) return null;
    const runtime = this.#requireRuntime(instanceId);
    const equipment = this.#equipmentRegistry.require(runtime.definitionId);
    const ready = isEquipmentCooldownReady(runtime.cooldownRemainingTicks);
    return Object.freeze({
      id: `equipment:${runtime.instanceId}`,
      actionDefinitionId: equipment.actionDefinitionId,
      source: 'equipment-system',
      priority: ACTION_PRIORITY.EQUIPMENT,
      available: ready,
      blocksFallback: true,
      unavailableReason: ready ? null : 'equipment-cooldown',
    });
  }

  getAerialActionCandidate(participantId: unknown): ActionCandidate | null {
    this.#assertUsable();
    const id = this.#requireParticipant(participantId);
    const instanceId = this.#heldByParticipant.get(id);
    if (!instanceId) return null;
    const runtime = this.#requireRuntime(instanceId);
    const equipment = this.#equipmentRegistry.require(runtime.definitionId);
    const ready = isEquipmentCooldownReady(runtime.cooldownRemainingTicks);
    return Object.freeze({
      id: `equipment-aerial:${runtime.instanceId}`,
      actionDefinitionId: equipment.aerialActionDefinitionId,
      source: 'equipment-system',
      priority: ACTION_PRIORITY.AIR_COMBAT,
      available: ready,
      blocksFallback: true,
      unavailableReason: ready ? null : 'equipment-cooldown',
    });
  }

  assertActionCanStart(
    participantId: unknown,
    actionDefinitionId: unknown,
  ): EquipmentRuntimeSnapshot {
    this.#assertUsable();
    const id = this.#requireParticipant(participantId);
    const instanceId = this.#heldByParticipant.get(id);
    if (!instanceId) throw new Error(`participant ${id} 没有可使用装备。`);
    const runtime = this.#requireRuntime(instanceId);
    const equipment = this.#equipmentRegistry.require(runtime.definitionId);
    if (
      equipment.actionDefinitionId !== actionDefinitionId
      && equipment.aerialActionDefinitionId !== actionDefinitionId
    ) {
      throw new Error(`participant ${id} 的装备动作不匹配。`);
    }
    if (!isEquipmentCooldownReady(runtime.cooldownRemainingTicks)) {
      throw new Error(`participant ${id} 的装备仍在冷却。`);
    }
    return createEquipmentRuntimeSnapshot(runtime);
  }

  markActionStarted(
    participantId: unknown,
    actionDefinitionId: unknown,
  ): EquipmentRuntimeSnapshot {
    return this.#runMutation(() => {
      const actionId = assertNonEmptyString(actionDefinitionId, 'equipment actionDefinitionId');
      const runtime = this.assertActionCanStart(participantId, actionId);
      const mutableRuntime = this.#requireRuntime(runtime.instanceId);
      mutableRuntime.cooldownRemainingTicks = this.#actionRegistry
        .require(actionId).timing.cooldownTicks;
      mutableRuntime.revision += 1;
      return createEquipmentRuntimeSnapshot(mutableRuntime);
    });
  }

  advanceCooldowns(): readonly EquipmentRuntimeSnapshot[] {
    return this.#runMutation(() => {
      const changed: EquipmentRuntimeSnapshot[] = [];
      for (const runtime of [...this.#runtimes.values()].sort((left, right) => (
        compareStrings(left.instanceId, right.instanceId)
      ))) {
        const next = advanceEquipmentCooldown(runtime.cooldownRemainingTicks);
        if (next === runtime.cooldownRemainingTicks) continue;
        runtime.cooldownRemainingTicks = next;
        runtime.revision += 1;
        changed.push(createEquipmentRuntimeSnapshot(runtime));
      }
      return Object.freeze(changed);
    });
  }

  updateLastSafePosition(
    participantId: unknown,
    position: unknown,
  ): EquipmentRuntimeSnapshot | null {
    return this.#runMutation(() => {
      const id = this.#requireParticipant(participantId);
      const instanceId = this.#heldByParticipant.get(id);
      if (!instanceId) return null;
      const next = clonePosition(position, 'lastSafePosition');
      const runtime = this.#requireRuntime(instanceId);
      if (!runtime.lastSafePosition) {
        throw new Error(`held equipment ${runtime.instanceId} 缺少 lastSafePosition。`);
      }
      if (
        runtime.lastSafePosition.x === next.x
        && runtime.lastSafePosition.y === next.y
        && runtime.lastSafePosition.z === next.z
      ) return createEquipmentRuntimeSnapshot(runtime);
      runtime.lastSafePosition = next;
      runtime.revision += 1;
      return createEquipmentRuntimeSnapshot(runtime);
    });
  }

  dropOwned(participantId: unknown, options: unknown): EquipmentDropResult | null {
    return this.#runMutation(() => {
      assertKnownKeys(options, DROP_OPTIONS_KEYS, 'EquipmentSystem drop options');
      const { isPositionValid } = options;
      const id = this.#requireParticipant(participantId);
      const instanceId = this.#heldByParticipant.get(id);
      if (!instanceId) return null;
      const runtime = this.#requireRuntime(instanceId);
      const drop = resolveEquipmentDrop({
        lastSafePosition: runtime.lastSafePosition,
        originPosition: runtime.originPosition,
        isPositionValid,
      });
      runtime.locationState = drop.despawned
        ? EQUIPMENT_LOCATION_STATE.DESPAWNED
        : EQUIPMENT_LOCATION_STATE.DROPPED;
      runtime.ownerId = null;
      runtime.position = drop.position ? { ...drop.position } : null;
      runtime.revision += 1;
      this.#heldByParticipant.delete(id);
      return Object.freeze({
        participantId: id,
        equipment: createEquipmentRuntimeSnapshot(runtime),
        fallbackUsed: drop.fallbackUsed,
        despawned: drop.despawned,
        diagnosticCode: drop.diagnosticCode,
      });
    });
  }

  despawnInvalidWorldEquipment(options: unknown): readonly EquipmentRuntimeSnapshot[] {
    return this.#runMutation(() => {
      assertKnownKeys(options, RECONCILE_OPTIONS_KEYS, 'EquipmentSystem reconcile options');
      const { isPositionValid } = options;
      if (typeof isPositionValid !== 'function') {
        throw new TypeError('EquipmentSystem reconcile 需要 isPositionValid。');
      }
      const validatePosition = isPositionValid as (
        position: Readonly<EquipmentPosition>,
      ) => unknown;
      const invalid: EquipmentRuntimeState[] = [];
      for (const runtime of [...this.#runtimes.values()].sort((left, right) => (
        compareStrings(left.instanceId, right.instanceId)
      ))) {
        if (
          runtime.locationState !== EQUIPMENT_LOCATION_STATE.SPAWNED
          && runtime.locationState !== EQUIPMENT_LOCATION_STATE.DROPPED
        ) continue;
        const snapshot = createEquipmentRuntimeSnapshot(runtime);
        if (!snapshot.position) {
          throw new Error(`world equipment ${runtime.instanceId} 缺少 position。`);
        }
        const valid = validatePosition(snapshot.position);
        if (typeof valid !== 'boolean') {
          throw new TypeError('EquipmentSystem reconcile isPositionValid 必须返回布尔值。');
        }
        if (!valid) invalid.push(runtime);
      }
      return Object.freeze(invalid.map((runtime) => {
        runtime.locationState = EQUIPMENT_LOCATION_STATE.DESPAWNED;
        runtime.ownerId = null;
        runtime.position = null;
        runtime.revision += 1;
        return createEquipmentRuntimeSnapshot(runtime);
      }));
    });
  }

  getHeldEquipment(participantId: unknown): EquipmentRuntimeSnapshot | null {
    this.#assertUsable();
    const id = this.#requireParticipant(participantId);
    const instanceId = this.#heldByParticipant.get(id);
    return instanceId ? createEquipmentRuntimeSnapshot(this.#requireRuntime(instanceId)) : null;
  }

  getSnapshot(instanceId: unknown): EquipmentRuntimeSnapshot {
    this.#assertUsable();
    return createEquipmentRuntimeSnapshot(this.#requireRuntime(instanceId));
  }

  listSnapshots(): readonly EquipmentRuntimeSnapshot[] {
    this.#assertUsable();
    return serializeEquipmentRuntimeStates([...this.#runtimes.values()]);
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#mutating) throw new Error('EquipmentSystem 权威变更期间不能销毁。');
    this.#destroyed = true;
    this.#heldByParticipant.clear();
    this.#runtimes.clear();
  }
}
