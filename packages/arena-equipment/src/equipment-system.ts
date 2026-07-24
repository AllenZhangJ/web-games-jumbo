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
import { assertKnownKeys, assertNonEmptyString } from '@number-strategy-jump/arena-contracts';

const PICKUP_OPTIONS_KEYS = new Set(['participants', 'contestSeed']);
const DROP_OPTIONS_KEYS = new Set(['isPositionValid']);
const RECONCILE_OPTIONS_KEYS = new Set(['isPositionValid']);
const PICKUP_PARTICIPANT_KEYS = new Set(['id', 'position', 'eligible']);
const POSITION_KEYS = new Set(['x', 'y', 'z']);

interface EquipmentSystemOptions {
  readonly participantIds: unknown;
  readonly actionRegistry: unknown;
  readonly equipmentRegistry: unknown;
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
  readonly #participantIds: readonly string[];
  readonly #runtimes: Map<string, EquipmentRuntimeState>;
  readonly #heldByParticipant: Map<string, string>;
  readonly #pickupResolver: EquipmentPickupResolver;
  readonly #spawner: EquipmentSpawner;
  #destroyed: boolean;
  #mutating: boolean;

  constructor({ participantIds, actionRegistry, equipmentRegistry }: EquipmentSystemOptions) {
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
