import { describe, expect, it } from 'vitest';

import {
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  type EquipmentDefinition,
} from '@number-strategy-jump/arena-definitions';

import {
  EQUIPMENT_LOCATION_STATE,
  EquipmentPickupResolver,
  EquipmentSpawner,
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

function preview(instanceId = 'equipment-1') {
  return new EquipmentSpawner({ equipmentRegistry: EQUIPMENT_REGISTRY }).preview({
    instanceId,
    definitionId: EQUIPMENT_DEFINITION.id,
    spawnId: 'center',
    position: { x: 0, y: 1, z: 0 },
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
});
