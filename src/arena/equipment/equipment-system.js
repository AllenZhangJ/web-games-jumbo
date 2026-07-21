import { ACTION_PRIORITY } from '@number-strategy-jump/arena-core';
import {
  advanceEquipmentCooldown,
  EQUIPMENT_LOCATION_STATE,
  EquipmentPickupResolver,
  EquipmentSpawner,
  createEquipmentRuntimeSnapshot,
  isEquipmentCooldownReady,
  resolveEquipmentDrop,
  serializeEquipmentRuntimeStates,
} from '@number-strategy-jump/arena-equipment';
import { assertKnownKeys, assertNonEmptyString } from '@number-strategy-jump/arena-contracts';

const PICKUP_OPTIONS_KEYS = new Set(['participants', 'contestSeed']);
const DROP_OPTIONS_KEYS = new Set(['isPositionValid']);
const RECONCILE_OPTIONS_KEYS = new Set(['isPositionValid']);
const PICKUP_PARTICIPANT_KEYS = new Set(['id', 'position', 'eligible']);
const POSITION_KEYS = new Set(['x', 'y', 'z']);

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export class EquipmentSystem {
  #actionRegistry;
  #equipmentRegistry;
  #participantIds;
  #runtimes;
  #heldByParticipant;
  #pickupResolver;
  #spawner;
  #destroyed;
  #mutating;

  constructor({ participantIds, actionRegistry, equipmentRegistry }) {
    if (
      !Array.isArray(participantIds)
      || participantIds.length === 0
      || participantIds.some((id) => typeof id !== 'string' || id.trim().length === 0)
      || new Set(participantIds).size !== participantIds.length
    ) throw new RangeError('EquipmentSystem 需要唯一非空 participantIds。');
    if (!actionRegistry || typeof actionRegistry.require !== 'function') {
      throw new TypeError('EquipmentSystem 需要只读 ActionRegistry。');
    }
    if (!equipmentRegistry || typeof equipmentRegistry.require !== 'function') {
      throw new TypeError('EquipmentSystem 需要只读 EquipmentRegistry。');
    }
    this.#actionRegistry = actionRegistry;
    this.#equipmentRegistry = equipmentRegistry;
    this.#participantIds = Object.freeze([...participantIds].sort(compareStrings));
    this.#runtimes = new Map();
    this.#heldByParticipant = new Map();
    this.#pickupResolver = new EquipmentPickupResolver({ equipmentRegistry });
    this.#spawner = new EquipmentSpawner({ equipmentRegistry });
    this.#destroyed = false;
    this.#mutating = false;
    Object.freeze(this);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('EquipmentSystem 已销毁。');
  }

  #requireParticipant(participantId) {
    const id = assertNonEmptyString(participantId, 'equipment participantId');
    if (!this.#participantIds.includes(id)) throw new RangeError(`未知 equipment participant ${id}。`);
    return id;
  }

  #requireRuntime(instanceId) {
    const runtime = this.#runtimes.get(instanceId);
    if (!runtime) throw new RangeError(`未知 equipment instance ${String(instanceId)}。`);
    return runtime;
  }

  #runMutation(operation) {
    this.#assertUsable();
    if (this.#mutating) throw new Error('EquipmentSystem 权威变更不可重入。');
    this.#mutating = true;
    try {
      return operation();
    } finally {
      this.#mutating = false;
    }
  }

  spawn(options) {
    return this.#runMutation(() => {
      const runtime = this.#spawner.createRuntime(options);
      if (this.#runtimes.has(runtime.instanceId)) {
        throw new RangeError(`重复 equipment instance ${runtime.instanceId}。`);
      }
      this.#runtimes.set(runtime.instanceId, runtime);
      return createEquipmentRuntimeSnapshot(runtime);
    });
  }

  resolvePickups(options) {
    return this.#runMutation(() => {
      assertKnownKeys(options, PICKUP_OPTIONS_KEYS, 'EquipmentSystem pickup options');
      const { participants, contestSeed } = options;
      if (!Array.isArray(participants)) throw new TypeError('EquipmentSystem participants 必须是数组。');
      const participantById = new Map();
      for (const participant of participants) {
        assertKnownKeys(participant, PICKUP_PARTICIPANT_KEYS, 'EquipmentPickup participant');
        assertKnownKeys(participant.position, POSITION_KEYS, 'EquipmentPickup participant.position');
        const position = {};
        for (const axis of POSITION_KEYS) {
          if (!Number.isFinite(participant.position[axis])) {
            throw new TypeError(`EquipmentPickup participant.position.${axis} 必须是有限数。`);
          }
          position[axis] = participant.position[axis];
        }
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

  getActionCandidate(participantId) {
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

  getAerialActionCandidate(participantId) {
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

  assertActionCanStart(participantId, actionDefinitionId) {
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

  markActionStarted(participantId, actionDefinitionId) {
    return this.#runMutation(() => {
      const runtime = this.assertActionCanStart(participantId, actionDefinitionId);
      const mutableRuntime = this.#requireRuntime(runtime.instanceId);
      mutableRuntime.cooldownRemainingTicks = this.#actionRegistry
        .require(actionDefinitionId).timing.cooldownTicks;
      mutableRuntime.revision += 1;
      return createEquipmentRuntimeSnapshot(mutableRuntime);
    });
  }

  advanceCooldowns() {
    return this.#runMutation(() => {
      const changed = [];
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

  updateLastSafePosition(participantId, position) {
    return this.#runMutation(() => {
      const id = this.#requireParticipant(participantId);
      const instanceId = this.#heldByParticipant.get(id);
      if (!instanceId) return null;
      assertKnownKeys(position, POSITION_KEYS, 'lastSafePosition');
      const next = {};
      for (const axis of POSITION_KEYS) {
        if (!Number.isFinite(position[axis])) {
          throw new TypeError(`lastSafePosition.${axis} 必须是有限数。`);
        }
        next[axis] = position[axis];
      }
      const runtime = this.#requireRuntime(instanceId);
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

  dropOwned(participantId, options) {
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

  despawnInvalidWorldEquipment(options) {
    return this.#runMutation(() => {
      assertKnownKeys(options, RECONCILE_OPTIONS_KEYS, 'EquipmentSystem reconcile options');
      const { isPositionValid } = options;
      if (typeof isPositionValid !== 'function') {
        throw new TypeError('EquipmentSystem reconcile 需要 isPositionValid。');
      }
      const invalid = [];
      for (const runtime of [...this.#runtimes.values()].sort((left, right) => (
        compareStrings(left.instanceId, right.instanceId)
      ))) {
        if (
          runtime.locationState !== EQUIPMENT_LOCATION_STATE.SPAWNED
          && runtime.locationState !== EQUIPMENT_LOCATION_STATE.DROPPED
        ) continue;
        const snapshot = createEquipmentRuntimeSnapshot(runtime);
        const valid = isPositionValid(snapshot.position);
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

  getHeldEquipment(participantId) {
    this.#assertUsable();
    const id = this.#requireParticipant(participantId);
    const instanceId = this.#heldByParticipant.get(id);
    return instanceId ? createEquipmentRuntimeSnapshot(this.#requireRuntime(instanceId)) : null;
  }

  getSnapshot(instanceId) {
    this.#assertUsable();
    return createEquipmentRuntimeSnapshot(this.#requireRuntime(instanceId));
  }

  listSnapshots() {
    this.#assertUsable();
    return serializeEquipmentRuntimeStates([...this.#runtimes.values()]);
  }

  destroy() {
    if (this.#destroyed) return;
    if (this.#mutating) throw new Error('EquipmentSystem 权威变更期间不能销毁。');
    this.#destroyed = true;
    this.#heldByParticipant.clear();
    this.#runtimes.clear();
  }
}
