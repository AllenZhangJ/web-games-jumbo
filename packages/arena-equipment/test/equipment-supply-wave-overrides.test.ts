import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_SUPPLY_EXPIRY_POLICY,
  EQUIPMENT_SUPPLY_REPLACEMENT_POLICY,
  EQUIPMENT_SUPPLY_TICK_ORDER,
  MODE_KIND,
  MODE_POLICY_DEFINITION_SCHEMA_VERSION,
  EquipmentSupplyRegistry,
  createEquipmentSupplyDefinition,
  createSurvivalEquipmentTierPolicyDefinition,
  type ActionDefinition,
  type EquipmentDefinition,
} from '@number-strategy-jump/arena-definitions';
import type { ActionRegistryContract } from '@number-strategy-jump/arena-core';
import {
  EQUIPMENT_LOCATION_STATE,
  EquipmentSupplyTimelineSystem,
  EquipmentSystem,
  type EquipmentRegistryContract,
} from '../src/index.js';

const ACTION_REGISTRY: ActionRegistryContract = Object.freeze({
  require(id: string) {
    if (id !== 'wave-ground' && id !== 'wave-air') throw new RangeError(`unknown action ${id}`);
    return { id, timing: { cooldownTicks: 10 } } as ActionDefinition;
  },
});

function equipment(id: string): EquipmentDefinition {
  return Object.freeze({
    schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
    id,
    category: 'wave-candidate',
    slot: 'primary',
    actionDefinitionId: 'wave-ground',
    aerialActionDefinitionId: 'wave-air',
    pickup: Object.freeze({ mode: 'automatic', radius: 0.8 }),
    drop: Object.freeze({
      onOwnerEliminated: 'last-safe-position',
      invalidPositionFallback: 'origin-spawn',
    }),
    presentationSemantic: 'wave-candidate',
    tags: Object.freeze(['candidate']),
  });
}

const SLOT_IDS = Object.freeze(['charge-shield', 'gravity-chain', 'heavy-hammer']);
const DEFINITIONS = Object.freeze(SLOT_IDS.flatMap((slotId) => [
  equipment(`${slotId}.collection`),
  equipment(`${slotId}.level-1`),
  equipment(`${slotId}.level-2`),
]));
const EQUIPMENT_REGISTRY: EquipmentRegistryContract = Object.freeze({
  require(id: string) {
    const definition = DEFINITIONS.find((candidate) => candidate.id === id);
    if (!definition) throw new RangeError(`unknown equipment ${id}`);
    return definition;
  },
});
const SUPPLY = createEquipmentSupplyDefinition({
  schemaVersion: EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION,
  id: 'wave-override-supply',
  firstSpawnTick: 1,
  spawnIntervalTicks: 3,
  spawnCount: 3,
  pickupRadius: 0.8,
  lifetimeTicks: 2,
  replacementPolicy: EQUIPMENT_SUPPLY_REPLACEMENT_POLICY.ATOMIC_RECYCLE_HELD,
  expiryPolicy: EQUIPMENT_SUPPLY_EXPIRY_POLICY.WORLD_ONLY_AT_EXPIRE_TICK,
  tickOrder: EQUIPMENT_SUPPLY_TICK_ORDER,
});
const SUPPLY_REGISTRY = new EquipmentSupplyRegistry([SUPPLY]);
const SPAWN_SPECS = Object.freeze(SLOT_IDS.map((slotId, index) => Object.freeze({
  slotId,
  equipmentDefinitionId: `${slotId}.collection`,
  spawnId: `spawn-${slotId}`,
  position: Object.freeze({ x: index * 2, y: 1.5, z: 0 }),
})));
const OVERRIDES = Object.freeze([1, 2].map((level, index) => Object.freeze({
  minimumWaveIndex: index,
  slots: Object.freeze(SLOT_IDS.map((slotId) => Object.freeze({
    slotId,
    equipmentDefinitionId: `${slotId}.level-${level}`,
  }))),
})));
const TIER_POLICY = createSurvivalEquipmentTierPolicyDefinition({
  schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
  id: 'wave-override-tier-policy.candidate.v1',
  contentVersion: 1,
  modeKind: MODE_KIND.SURVIVAL,
  supplyDefinitionId: SUPPLY.id,
  tiers: [1, 2].map((level, index) => ({
    minimumWaveIndex: index,
    survivalLevel: level,
    variants: SLOT_IDS.map((slotId) => ({
      collectionEquipmentDefinitionId: `${slotId}.collection`,
      runtimeEquipmentDefinitionId: `${slotId}.level-${level}`,
    })),
  })),
});
const FAR_PARTICIPANTS = Object.freeze([
  Object.freeze({ id: 'p1', eligible: true, position: Object.freeze({ x: 50, y: 1.5, z: 50 }) }),
  Object.freeze({ id: 'p2', eligible: true, position: Object.freeze({ x: -50, y: 1.5, z: -50 }) }),
]);

function harness(overrides: unknown = OVERRIDES) {
  const equipmentSystem = new EquipmentSystem({
    participantIds: ['p1', 'p2'],
    actionRegistry: ACTION_REGISTRY,
    equipmentRegistry: EQUIPMENT_REGISTRY,
    equipmentSupplyRegistry: SUPPLY_REGISTRY,
  });
  const timeline = new EquipmentSupplyTimelineSystem({
    supplyDefinitionId: SUPPLY.id,
    spawnSpecs: SPAWN_SPECS,
    waveEquipmentOverrides: overrides,
    equipmentRegistry: EQUIPMENT_REGISTRY,
    equipmentSupplyRegistry: SUPPLY_REGISTRY,
    equipmentSystem,
  });
  return { equipmentSystem, timeline };
}

function step(timeline: EquipmentSupplyTimelineSystem, tick: number): void {
  timeline.step({ tick, participants: FAR_PARTICIPANTS, contestSeed: 123 });
}

describe('EquipmentSupplyTimelineSystem wave equipment overrides', () => {
  it('resolves explicit wave tiers and holds the final tier for later waves', () => {
    const { equipmentSystem, timeline } = harness();
    expect(timeline.resolveWaveEquipmentDefinitions(0).map(({ equipmentDefinitionId }) => (
      equipmentDefinitionId
    ))).toEqual(SLOT_IDS.map((slotId) => `${slotId}.level-1`));
    expect(timeline.resolveWaveEquipmentDefinitions(1).map(({ equipmentDefinitionId }) => (
      equipmentDefinitionId
    ))).toEqual(SLOT_IDS.map((slotId) => `${slotId}.level-2`));
    expect(timeline.resolveWaveEquipmentDefinitions(99)).toEqual(
      timeline.resolveWaveEquipmentDefinitions(1),
    );

    step(timeline, 0);
    step(timeline, 1);
    expect(equipmentSystem.listSnapshots().filter(({ locationState }) => (
      locationState === EQUIPMENT_LOCATION_STATE.SPAWNED
    )).map(({ definitionId }) => definitionId)).toEqual(
      SLOT_IDS.map((slotId) => `${slotId}.level-1`),
    );
    step(timeline, 2);
    step(timeline, 3);
    step(timeline, 4);
    expect(equipmentSystem.listSnapshots().filter(({ locationState }) => (
      locationState === EQUIPMENT_LOCATION_STATE.SPAWNED
    )).map(({ definitionId }) => definitionId)).toEqual(
      SLOT_IDS.map((slotId) => `${slotId}.level-2`),
    );
    timeline.destroy();
    equipmentSystem.destroy();
  });

  it('keeps tiered public projection connected without claiming the fixed-definition audit', () => {
    const { equipmentSystem, timeline } = harness();
    step(timeline, 0);
    step(timeline, 1);
    const result = timeline.getPublicSupplyProjection({
      snapshotTick: 2,
      eventSequence: 6,
      equipment: equipmentSystem.listSnapshots(),
    });
    expect(result.projection.supplies).toHaveLength(3);
    expect(result.projection.supplies.map(({ equipmentDefinitionId }) => (
      equipmentDefinitionId
    ))).toEqual(SLOT_IDS.map((slotId) => `${slotId}.level-1`));
    timeline.destroy();
    equipmentSystem.destroy();
  });

  it('projects V3 collection/runtime/level identity from policy without parsing IDs', () => {
    const { equipmentSystem, timeline } = harness();
    step(timeline, 0);
    step(timeline, 1);
    const active = timeline.getPublicSupplyProjectionV3({
      modeDefinitionId: 'arena.mode.survival.candidate.v1',
      tierPolicyDefinition: TIER_POLICY,
      snapshotTick: 2,
      eventSequence: 6,
      equipment: equipmentSystem.listSnapshots(),
    });
    expect(active.projection.supplies).toHaveLength(3);
    expect(active.projection.supplies.map(({ survivalLevel }) => survivalLevel)).toEqual([1, 1, 1]);
    expect(active.projection.supplies.map(({ collectionEquipmentDefinitionId }) => (
      collectionEquipmentDefinitionId
    ))).toEqual(SLOT_IDS.map((slotId) => `${slotId}.collection`));
    expect(active.worldSupplyEquipment.map(({ runtimeEquipmentDefinitionId }) => (
      runtimeEquipmentDefinitionId
    ))).toEqual(SLOT_IDS.map((slotId) => `${slotId}.level-1`));
    expect(active.expectedWorldSupplyIdentities).toHaveLength(3);

    step(timeline, 2);
    const pending = timeline.getPublicSupplyProjectionV3({
      modeDefinitionId: 'arena.mode.survival.candidate.v1',
      tierPolicyDefinition: TIER_POLICY,
      snapshotTick: 3,
      eventSequence: 7,
      equipment: equipmentSystem.listSnapshots(),
    });
    expect(pending.projection.resyncReadiness).toBe('not-ready-pre-expiry');
    expect(pending.projection.supplies).toEqual([]);
    expect(pending.pendingExpiryEquipmentInstanceIds).toHaveLength(3);
    timeline.destroy();
    equipmentSystem.destroy();
  });

  it('fails closed on incomplete, reordered, repeated, or unknown wave mappings', () => {
    expect(() => harness([{ minimumWaveIndex: 1, slots: OVERRIDES[0]!.slots }])).toThrow(
      /wave 0/,
    );
    expect(() => harness([{ minimumWaveIndex: 0, slots: OVERRIDES[0]!.slots.slice(1) }])).toThrow(
      /全部供给槽位/,
    );
    expect(() => harness([{
      minimumWaveIndex: 0,
      slots: [...OVERRIDES[0]!.slots].reverse(),
    }])).toThrow(/冻结slot顺序/);
    expect(() => harness([{
      minimumWaveIndex: 0,
      slots: OVERRIDES[0]!.slots.map((slot, index) => index === 0
        ? { ...slot, equipmentDefinitionId: 'unknown-runtime' }
        : slot),
    }])).toThrow(/unknown equipment/);
  });
});
