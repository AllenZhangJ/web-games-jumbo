import { describe, expect, it } from 'vitest';

import {
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  type EquipmentDefinition,
  type ActionDefinition,
} from '@number-strategy-jump/arena-definitions';
import type { ActionRegistryContract } from '@number-strategy-jump/arena-core';

import {
  EQUIPMENT_LOCATION_STATE,
  EquipmentPickupResolver,
  EquipmentSpawner,
  EquipmentSystem,
  advanceEquipmentCooldown,
  createEquipmentRuntimeSnapshot,
  deserializeEquipmentRuntimeState,
  isEquipmentCooldownReady,
  resolveEquipmentDrop,
  serializeEquipmentRuntimeStates,
  type EquipmentRegistryContract,
} from '../src/index.js';

const EQUIPMENT_DEFINITION: EquipmentDefinition = Object.freeze({
  schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  id: 'test-hammer',
  category: 'hammer',
  slot: 'primary',
  actionDefinitionId: 'hammer-ground',
  aerialActionDefinitionId: 'hammer-air',
  pickup: Object.freeze({ mode: 'automatic', radius: 1 }),
  drop: Object.freeze({
    onOwnerEliminated: 'last-safe-position',
    invalidPositionFallback: 'origin-spawn',
  }),
  presentationSemantic: 'hammer',
  tags: Object.freeze(['test']),
});

const EQUIPMENT_REGISTRY: EquipmentRegistryContract = Object.freeze({
  require(id: string) {
    if (id !== EQUIPMENT_DEFINITION.id) throw new RangeError(`未知装备 ${id}`);
    return EQUIPMENT_DEFINITION;
  },
});

const ACTION_REGISTRY: ActionRegistryContract = Object.freeze({
  require(id: string) {
    if (id !== 'hammer-ground' && id !== 'hammer-air') {
      throw new RangeError(`未知动作 ${id}`);
    }
    return {
      id,
      timing: { cooldownTicks: 3 },
    } as ActionDefinition;
  },
});

function preview(instanceId = 'equipment-1') {
  return new EquipmentSpawner({ equipmentRegistry: EQUIPMENT_REGISTRY }).preview({
    instanceId,
    definitionId: EQUIPMENT_DEFINITION.id,
    spawnId: 'center',
    position: { x: 0, y: 1, z: 0 },
  });
}

function createSystem(): EquipmentSystem {
  return new EquipmentSystem({
    participantIds: ['player-1', 'player-2'],
    actionRegistry: ACTION_REGISTRY,
    equipmentRegistry: EQUIPMENT_REGISTRY,
  });
}

describe('arena-equipment primitives', () => {
  it('keeps identity immutable and round-trips only validated runtime data', () => {
    const spawner = new EquipmentSpawner({ equipmentRegistry: EQUIPMENT_REGISTRY });
    const runtime = spawner.createRuntime({
      instanceId: 'equipment-1',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'center',
      position: { x: 0, y: 1, z: 0 },
    });
    runtime.cooldownRemainingTicks = 9;
    runtime.revision = 2;
    const serialized = serializeEquipmentRuntimeStates([runtime]);
    const restored = deserializeEquipmentRuntimeState(serialized[0], {
      equipmentRegistry: EQUIPMENT_REGISTRY,
    });

    expect(serializeEquipmentRuntimeStates([restored])).toEqual(serialized);
    expect(Object.isFrozen(serialized[0]?.position)).toBe(true);
    expect(Reflect.set(runtime, 'instanceId', 'tampered')).toBe(false);
    expect(runtime.instanceId).toBe('equipment-1');
  });

  it('resolves contested pickup independently from caller array order', () => {
    const resolver = new EquipmentPickupResolver({ equipmentRegistry: EQUIPMENT_REGISTRY });
    const participants = [
      { id: 'player-1', eligible: true, position: { x: -0.2, y: 1, z: 0 } },
      { id: 'player-2', eligible: true, position: { x: 0.2, y: 1, z: 0 } },
    ];
    const equipment = [preview()];

    const forward = resolver.resolve({ participants, equipment, contestSeed: 7 });
    const reverse = resolver.resolve({
      participants: [...participants].reverse(),
      equipment,
      contestSeed: 7,
    });
    expect(forward).toEqual(reverse);
    expect(forward).toHaveLength(1);
  });

  it('uses last-safe then origin fallback and validates callback results synchronously', () => {
    expect(resolveEquipmentDrop({
      lastSafePosition: { x: 2, y: 1, z: 0 },
      originPosition: { x: 0, y: 1, z: 0 },
      isPositionValid: (position: Readonly<{ x: number }>) => position.x === 0,
    })).toEqual({
      position: { x: 0, y: 1, z: 0 },
      fallbackUsed: true,
      despawned: false,
      diagnosticCode: 'equipment-drop-fallback-origin-spawn',
    });
    expect(() => resolveEquipmentDrop({
      lastSafePosition: { x: 0, y: 1, z: 0 },
      originPosition: { x: 0, y: 1, z: 0 },
      isPositionValid: () => Promise.resolve(true),
    })).toThrow('必须返回布尔值');
  });

  it('validates cooldown and runtime location invariants before publication', () => {
    expect(isEquipmentCooldownReady(0)).toBe(true);
    expect(advanceEquipmentCooldown(2)).toBe(1);
    expect(() => advanceEquipmentCooldown(-1)).toThrow('大于等于 0');

    const spawner = new EquipmentSpawner({ equipmentRegistry: EQUIPMENT_REGISTRY });
    const runtime = spawner.createRuntime({
      instanceId: 'equipment-2',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'center',
      position: { x: 0, y: 1, z: 0 },
    });
    runtime.locationState = EQUIPMENT_LOCATION_STATE.HELD;
    runtime.ownerId = 'player-1';
    expect(() => createEquipmentRuntimeSnapshot(runtime)).toThrow('不能有世界 position');
  });

  it('owns spawn, pickup and cooldown as one non-reentrant authority', () => {
    const system = createSystem();
    system.spawn({
      instanceId: 'equipment-1',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'center',
      position: { x: 0, y: 1, z: 0 },
    });
    const decisions = system.resolvePickups({
      participants: [
        { id: 'player-1', eligible: true, position: { x: 0, y: 1, z: 0 } },
        { id: 'player-2', eligible: true, position: { x: 4, y: 1, z: 0 } },
      ],
      contestSeed: 1,
    });
    expect(decisions.map(({ participantId }) => participantId)).toEqual(['player-1']);
    expect(system.getActionCandidate('player-1')?.available).toBe(true);
    expect(system.markActionStarted('player-1', 'hammer-ground').cooldownRemainingTicks).toBe(3);
    expect(system.getActionCandidate('player-1')?.available).toBe(false);
    expect(system.advanceCooldowns()[0]?.cooldownRemainingTicks).toBe(2);
    system.destroy();
    system.destroy();
    expect(() => system.listSnapshots()).toThrow('已销毁');
  });

  it('keeps ownership unchanged when a drop callback reenters authority', () => {
    const system = createSystem();
    system.spawn({
      instanceId: 'equipment-1',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'center',
      position: { x: 0, y: 1, z: 0 },
    });
    system.resolvePickups({
      participants: [
        { id: 'player-1', eligible: true, position: { x: 0, y: 1, z: 0 } },
        { id: 'player-2', eligible: true, position: { x: 4, y: 1, z: 0 } },
      ],
      contestSeed: 1,
    });

    expect(() => system.dropOwned('player-1', {
      isPositionValid() {
        system.advanceCooldowns();
        return true;
      },
    })).toThrow('不可重入');
    expect(system.getHeldEquipment('player-1')?.instanceId).toBe('equipment-1');
    system.destroy();
  });

  it('validates every reconcile callback before committing any despawn', () => {
    const system = createSystem();
    for (const [instanceId, x] of [['equipment-1', 0], ['equipment-2', 2]] as const) {
      system.spawn({
        instanceId,
        definitionId: EQUIPMENT_DEFINITION.id,
        spawnId: instanceId,
        position: { x, y: 1, z: 0 },
      });
    }
    let calls = 0;
    expect(() => system.despawnInvalidWorldEquipment({
      isPositionValid() {
        calls += 1;
        return calls === 1 ? false : Promise.resolve(false);
      },
    })).toThrow('必须返回布尔值');
    expect(system.listSnapshots().map(({ locationState }) => locationState)).toEqual([
      EQUIPMENT_LOCATION_STATE.SPAWNED,
      EQUIPMENT_LOCATION_STATE.SPAWNED,
    ]);
    system.destroy();
  });
});
