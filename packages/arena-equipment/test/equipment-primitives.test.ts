import { describe, expect, it } from 'vitest';

import {
  ARENA_MATCH_EVENT,
  EQUIPMENT_DESPAWN_REASON,
} from '@number-strategy-jump/arena-contracts';
import {
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_SUPPLY_EXPIRY_POLICY,
  EQUIPMENT_SUPPLY_REPLACEMENT_POLICY,
  EQUIPMENT_SUPPLY_TICK_ORDER,
  EquipmentSupplyRegistry,
  createEquipmentSupplyDefinition,
  type EquipmentDefinition,
  type ActionDefinition,
} from '@number-strategy-jump/arena-definitions';
import type { ActionRegistryContract } from '@number-strategy-jump/arena-core';

import {
  EQUIPMENT_LOCATION_STATE,
  EQUIPMENT_SUPPLY_TIMELINE_SNAPSHOT_SCHEMA_VERSION,
  EquipmentPickupResolver,
  EquipmentSpawner,
  EquipmentSupplyTimelineSystem,
  EquipmentSystem,
  advanceEquipmentCooldown,
  createEquipmentRuntimeSnapshot,
  createEquipmentSupplyEventIdentity,
  createEquipmentSupplyLifecycle,
  deserializeEquipmentRuntimeState,
  isEquipmentCooldownReady,
  resolveEquipmentDrop,
  serializeEquipmentRuntimeStates,
  validateEquipmentSystemCheckpointV1,
  type EquipmentRegistryContract,
} from '../src/index.js';

const SUPPLY_DEFINITION = createEquipmentSupplyDefinition({
  schemaVersion: EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION,
  id: 'survival-supply',
  firstSpawnTick: 1_200,
  spawnIntervalTicks: 1_200,
  spawnCount: 3,
  pickupRadius: 0.8,
  lifetimeTicks: 600,
  replacementPolicy: EQUIPMENT_SUPPLY_REPLACEMENT_POLICY.ATOMIC_RECYCLE_HELD,
  expiryPolicy: EQUIPMENT_SUPPLY_EXPIRY_POLICY.WORLD_ONLY_AT_EXPIRE_TICK,
  tickOrder: EQUIPMENT_SUPPLY_TICK_ORDER,
});

const SHORT_SUPPLY_DEFINITION = createEquipmentSupplyDefinition({
  schemaVersion: EQUIPMENT_SUPPLY_DEFINITION_SCHEMA_VERSION,
  id: 'short-survival-supply',
  firstSpawnTick: 2,
  spawnIntervalTicks: 4,
  spawnCount: 3,
  pickupRadius: 0.8,
  lifetimeTicks: 2,
  replacementPolicy: EQUIPMENT_SUPPLY_REPLACEMENT_POLICY.ATOMIC_RECYCLE_HELD,
  expiryPolicy: EQUIPMENT_SUPPLY_EXPIRY_POLICY.WORLD_ONLY_AT_EXPIRE_TICK,
  tickOrder: EQUIPMENT_SUPPLY_TICK_ORDER,
});

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

const LEFT_EQUIPMENT_DEFINITION: EquipmentDefinition = Object.freeze({
  ...EQUIPMENT_DEFINITION,
  id: 'test-hammer-left',
});
const RIGHT_EQUIPMENT_DEFINITION: EquipmentDefinition = Object.freeze({
  ...EQUIPMENT_DEFINITION,
  id: 'test-hammer-right',
});
const EQUIPMENT_DEFINITIONS = Object.freeze([
  EQUIPMENT_DEFINITION,
  LEFT_EQUIPMENT_DEFINITION,
  RIGHT_EQUIPMENT_DEFINITION,
]);

const EQUIPMENT_REGISTRY: EquipmentRegistryContract = Object.freeze({
  require(id: string) {
    const definition = EQUIPMENT_DEFINITIONS.find((candidate) => candidate.id === id);
    if (!definition) throw new RangeError(`未知装备 ${id}`);
    return definition;
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

const SUPPLY_REGISTRY = new EquipmentSupplyRegistry([SHORT_SUPPLY_DEFINITION]);
const SHORT_SPAWN_SPECS = Object.freeze([
  Object.freeze({
    slotId: 'right',
    equipmentDefinitionId: RIGHT_EQUIPMENT_DEFINITION.id,
    spawnId: 'supply-right',
    position: Object.freeze({ x: 2, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'left',
    equipmentDefinitionId: LEFT_EQUIPMENT_DEFINITION.id,
    spawnId: 'supply-left',
    position: Object.freeze({ x: -2, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'center',
    equipmentDefinitionId: EQUIPMENT_DEFINITION.id,
    spawnId: 'supply-center',
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
]);
const FAR_PARTICIPANTS = Object.freeze([
  Object.freeze({
    id: 'player-1',
    eligible: true,
    position: Object.freeze({ x: 50, y: 1, z: 50 }),
  }),
  Object.freeze({
    id: 'player-2',
    eligible: true,
    position: Object.freeze({ x: -50, y: 1, z: -50 }),
  }),
]);

function nearCenterParticipants() {
  return [
    { id: 'player-1', eligible: true, position: { x: 0, y: 1, z: 0 } },
    FAR_PARTICIPANTS[1],
  ];
}

function createSupplySystem(): EquipmentSystem {
  return new EquipmentSystem({
    participantIds: ['player-1', 'player-2'],
    actionRegistry: ACTION_REGISTRY,
    equipmentRegistry: EQUIPMENT_REGISTRY,
    equipmentSupplyRegistry: SUPPLY_REGISTRY,
  });
}

function createTimelineHarness(snapshot?: unknown) {
  const equipmentSystem = createSupplySystem();
  const timeline = new EquipmentSupplyTimelineSystem({
    supplyDefinitionId: SHORT_SUPPLY_DEFINITION.id,
    spawnSpecs: SHORT_SPAWN_SPECS,
    equipmentRegistry: EQUIPMENT_REGISTRY,
    equipmentSupplyRegistry: SUPPLY_REGISTRY,
    equipmentSystem,
    ...(snapshot === undefined ? {} : { snapshot }),
  });
  return { equipmentSystem, timeline };
}

function shortLifecycle(slotId = 'center', waveIndex = 0) {
  const spawnTick = SHORT_SUPPLY_DEFINITION.firstSpawnTick
    + SHORT_SUPPLY_DEFINITION.spawnIntervalTicks * waveIndex;
  const supplyId = `${SHORT_SUPPLY_DEFINITION.id}:wave-${waveIndex}:slot-${slotId}`;
  return createEquipmentSupplyLifecycle({
    schemaVersion: 1,
    supplyDefinitionId: SHORT_SUPPLY_DEFINITION.id,
    supplyId,
    equipmentInstanceId: `${supplyId}:equipment`,
    spawnTick,
    expireTick: spawnTick + SHORT_SUPPLY_DEFINITION.lifetimeTicks,
  }, SHORT_SUPPLY_DEFINITION);
}

function timelineSpawn(slotId = 'center') {
  const spec = SHORT_SPAWN_SPECS.find((value) => value.slotId === slotId);
  if (!spec) throw new Error(`测试缺少 supply slot ${slotId}。`);
  return {
    lifecycle: shortLifecycle(slotId),
    definitionId: spec.equipmentDefinitionId,
    spawnId: spec.spawnId,
    position: spec.position,
  };
}

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
  it('validates supply spawn/expiry identity and projects stable event identity', () => {
    const lifecycle = createEquipmentSupplyLifecycle({
      schemaVersion: 1,
      supplyDefinitionId: SUPPLY_DEFINITION.id,
      supplyId: 'wave-1:left',
      equipmentInstanceId: 'wave-1:left:hammer',
      spawnTick: 1_200,
      expireTick: 1_800,
    }, SUPPLY_DEFINITION);

    expect(createEquipmentSupplyEventIdentity(lifecycle, SUPPLY_DEFINITION)).toEqual({
      supplyDefinitionId: SUPPLY_DEFINITION.id,
      supplyId: 'wave-1:left',
      equipmentInstanceId: 'wave-1:left:hammer',
      spawnTick: 1_200,
      expireTick: 1_800,
    });
    expect(Object.isFrozen(lifecycle)).toBe(true);
    expect(ARENA_MATCH_EVENT.EQUIPMENT_REPLACED).toBe('EquipmentReplaced');
    expect(ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED).toBe('EquipmentRecycled');
    expect(ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED).toBe('EquipmentExpired');
  });

  it('rejects unsupported lifecycle schema and invalid 600-tick expiry before publication', () => {
    const valid = {
      schemaVersion: 1,
      supplyDefinitionId: SUPPLY_DEFINITION.id,
      supplyId: 'wave-1:left',
      equipmentInstanceId: 'wave-1:left:hammer',
      spawnTick: 1_200,
      expireTick: 1_800,
    };
    expect(() => createEquipmentSupplyLifecycle({ ...valid, schemaVersion: 2 }, SUPPLY_DEFINITION))
      .toThrow(/schemaVersion/);
    expect(() => createEquipmentSupplyLifecycle({ ...valid, expireTick: 1_799 }, SUPPLY_DEFINITION))
      .toThrow(/spawnTick \+ 600/);
    expect(createEquipmentSupplyLifecycle({
      ...valid,
      supplyId: 'wave-2:left',
      equipmentInstanceId: 'wave-2:left:hammer',
      spawnTick: 2_400,
      expireTick: 3_000,
    }, SUPPLY_DEFINITION).spawnTick).toBe(2_400);
    expect(() => createEquipmentSupplyLifecycle({
      ...valid,
      spawnTick: 1_199,
      expireTick: 1_799,
    }, SUPPLY_DEFINITION)).toThrow(/firstSpawnTick/);
    expect(() => createEquipmentSupplyLifecycle({
      ...valid,
      spawnTick: 1_201,
      expireTick: 1_801,
    }, SUPPLY_DEFINITION)).toThrow(/合法生成波次/);
    expect(() => createEquipmentSupplyLifecycle({
      ...valid,
      supplyDefinitionId: 'unknown-supply',
    }, SUPPLY_DEFINITION)).toThrow(/Definition 不一致/);
    expect(() => createEquipmentSupplyLifecycle({ ...valid, futureState: true }, SUPPLY_DEFINITION))
      .toThrow(/futureState/);
    expect(() => createEquipmentSupplyLifecycle({
      ...valid,
      get expireTick() {
        throw new Error('getter must not run');
      },
    }, SUPPLY_DEFINITION)).toThrow(/数据字段/);
    expect(() => createEquipmentSupplyLifecycle({
      ...valid,
      spawnTick: Number.MAX_SAFE_INTEGER + 1,
      expireTick: Number.MAX_SAFE_INTEGER + 1,
    }, SUPPLY_DEFINITION)).toThrow(/安全整数/);
    const overflowDefinition = createEquipmentSupplyDefinition({
      ...SUPPLY_DEFINITION,
      id: 'overflow-supply',
      firstSpawnTick: Number.MAX_SAFE_INTEGER - 1,
      spawnIntervalTicks: 1,
      lifetimeTicks: 2,
    });
    expect(() => createEquipmentSupplyLifecycle({
      ...valid,
      supplyDefinitionId: overflowDefinition.id,
      spawnTick: Number.MAX_SAFE_INTEGER - 1,
      expireTick: Number.MAX_SAFE_INTEGER,
    }, overflowDefinition)).toThrow(/超出安全整数范围/);
  });

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

  it('restores equipment ownership, cooldown and runtime identity atomically', () => {
    const continuous = createSystem();
    continuous.spawn({
      instanceId: 'checkpoint-hammer',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'checkpoint-center',
      position: { x: 0, y: 1, z: 0 },
    });
    continuous.resolvePickups({
      participants: [
        { id: 'player-1', eligible: true, position: { x: 0, y: 1, z: 0 } },
        { id: 'player-2', eligible: false, position: { x: 5, y: 1, z: 0 } },
      ],
      contestSeed: 9,
      excludedEquipmentInstanceIds: [],
    });
    continuous.markActionStarted('player-1', 'hammer-ground');
    const checkpoint = continuous.exportCheckpointV1();
    const restored = EquipmentSystem.restoreFromCheckpointV1(checkpoint, {
      actionRegistry: ACTION_REGISTRY,
      equipmentRegistry: EQUIPMENT_REGISTRY,
    });

    expect(restored.listSnapshots()).toEqual(continuous.listSnapshots());
    expect(restored.getHeldEquipment('player-1')).toEqual(
      continuous.getHeldEquipment('player-1'),
    );
    expect(restored.exportCheckpointV1()).toEqual(checkpoint);
    restored.advanceCooldowns();
    continuous.advanceCooldowns();
    expect(restored.exportCheckpointV1()).toEqual(continuous.exportCheckpointV1());
    restored.destroy();
    continuous.destroy();
  });

  it('rejects tampered, reordered and future equipment checkpoints', () => {
    const system = createSystem();
    system.spawn({
      instanceId: 'checkpoint-a',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'checkpoint-a-spawn',
      position: { x: 0, y: 1, z: 0 },
    });
    system.spawn({
      instanceId: 'checkpoint-b',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'checkpoint-b-spawn',
      position: { x: 2, y: 1, z: 0 },
    });
    const checkpoint = system.exportCheckpointV1();
    const tampered = JSON.parse(JSON.stringify(checkpoint)) as {
      runtimes: Array<Record<string, unknown>>;
      future?: boolean;
    };
    tampered.runtimes[0]!.cooldownRemainingTicks = 99;
    expect(() => validateEquipmentSystemCheckpointV1(tampered)).toThrow(/hash漂移/u);
    const reordered = JSON.parse(JSON.stringify(checkpoint)) as {
      runtimes: Array<Record<string, unknown>>;
    };
    reordered.runtimes.reverse();
    expect(() => validateEquipmentSystemCheckpointV1(reordered)).toThrow(/稳定升序/u);
    const future = JSON.parse(JSON.stringify(checkpoint)) as Record<string, unknown>;
    future.future = true;
    expect(() => validateEquipmentSystemCheckpointV1(future)).toThrow(/future/u);
    system.destroy();
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

  it('rejects swallowed Registry and map callback reentry before equipment authority commits', () => {
    let registrySystem: EquipmentSystem | null = null;
    let registryReentryError: unknown = null;
    let registryReentryEnabled = false;
    const reentrantEquipmentRegistry: EquipmentRegistryContract = Object.freeze({
      require(id: string) {
        if (registryReentryEnabled) {
          try {
            registrySystem?.listSnapshots();
          } catch (error) {
            registryReentryError = error;
          }
        }
        return EQUIPMENT_REGISTRY.require(id);
      },
    });
    const registryGuarded = new EquipmentSystem({
      participantIds: ['player-1', 'player-2'],
      actionRegistry: ACTION_REGISTRY,
      equipmentRegistry: reentrantEquipmentRegistry,
    });
    registrySystem = registryGuarded;
    registryReentryEnabled = true;
    expect(() => registryGuarded.spawn({
      instanceId: 'registry-reentry-equipment',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'center',
      position: { x: 0, y: 1, z: 0 },
    })).toThrow(/spawn.*重入equipment-list-read/u);
    expect(String(registryReentryError)).toMatch(/spawn.*重入equipment-list-read/u);
    registryReentryEnabled = false;
    expect(registryGuarded.listSnapshots()).toEqual([]);
    registryGuarded.destroy();

    const dropGuarded = createSystem();
    dropGuarded.spawn({
      instanceId: 'drop-reentry-equipment',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'center',
      position: { x: 0, y: 1, z: 0 },
    });
    dropGuarded.resolvePickups({
      participants: [
        { id: 'player-1', eligible: true, position: { x: 0, y: 1, z: 0 } },
        { id: 'player-2', eligible: true, position: { x: 4, y: 1, z: 0 } },
      ],
      contestSeed: 1,
    });
    let mapReentryError: unknown = null;
    expect(() => dropGuarded.dropOwned('player-1', {
      isPositionValid() {
        try {
          dropGuarded.getHeldEquipment('player-1');
        } catch (error) {
          mapReentryError = error;
        }
        return true;
      },
    })).toThrow(/drop-owned.*重入held-equipment-read/u);
    expect(String(mapReentryError)).toMatch(/drop-owned.*重入held-equipment-read/u);
    expect(dropGuarded.getHeldEquipment('player-1')?.instanceId)
      .toBe('drop-reentry-equipment');
    dropGuarded.destroy();
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

  it('runs a short supply timeline through spawn, projection and expiry deterministically', () => {
    const { equipmentSystem, timeline } = createTimelineHarness();
    const contentHash = timeline.getContentHash();
    expect(contentHash).toMatch(/^[0-9a-f]{8}$/);
    for (const tick of [0, 1]) {
      const idle = timeline.step({ tick, participants: FAR_PARTICIPANTS, contestSeed: 7 });
      expect(idle.spawned).toEqual([]);
      expect(idle.expiredEvents).toEqual([]);
    }

    const spawned = timeline.step({ tick: 2, participants: FAR_PARTICIPANTS, contestSeed: 7 });
    expect(spawned.phaseOrder).toEqual(['spawn', 'expire', 'pickup', 'action']);
    expect(spawned.spawned.map(({ supplyId }) => supplyId)).toEqual([
      'short-survival-supply:wave-0:slot-center',
      'short-survival-supply:wave-0:slot-left',
      'short-survival-supply:wave-0:slot-right',
    ]);
    expect(spawned.spawnedEvents).toHaveLength(3);
    expect(spawned.pickupDecisions).toEqual([]);
    expect(equipmentSystem.listSnapshots()).toHaveLength(3);

    const ready = timeline.getPublicSupplyProjection({
      snapshotTick: 3,
      eventSequence: 9,
      equipment: equipmentSystem.listSnapshots(),
    });
    expect(ready.projection.resyncReadiness).toBe('ready');
    expect(ready.projection.supplies).toHaveLength(3);
    expect(ready.projection.supplies.every(({ remainingTicks }) => remainingTicks === 1)).toBe(true);
    expect(Object.isFrozen(ready.projection)).toBe(true);

    timeline.step({ tick: 3, participants: FAR_PARTICIPANTS, contestSeed: 7 });
    const pending = timeline.getPublicSupplyProjection({
      snapshotTick: 4,
      eventSequence: 10,
      equipment: equipmentSystem.listSnapshots(),
    });
    expect(pending.projection.resyncReadiness).toBe('not-ready-pre-expiry');
    expect(pending.projection.supplies).toEqual([]);
    expect(pending.pendingExpiryEquipmentInstanceIds).toHaveLength(3);

    const expired = timeline.step({ tick: 4, participants: FAR_PARTICIPANTS, contestSeed: 7 });
    expect(expired.expiredEvents).toHaveLength(3);
    expect(expired.expiredEvents.every(({ type }) => (
      type === ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED
    ))).toBe(true);
    expect(timeline.listActiveSupplies()).toEqual([]);
    expect(equipmentSystem.listSnapshots()).toEqual([]);
    expect(timeline.getContentHash()).toBe(contentHash);

    timeline.destroy();
    timeline.destroy();
    expect(() => timeline.getSnapshot()).toThrow(/已销毁/);
    expect(() => timeline.nextTick).toThrow(/已销毁/);
    equipmentSystem.destroy();
  });

  it('retains one pending tick after pickup validation fails and retries without duplicate spawn', () => {
    const { equipmentSystem, timeline } = createTimelineHarness();
    timeline.step({ tick: 0, participants: FAR_PARTICIPANTS, contestSeed: 1 });
    timeline.step({ tick: 1, participants: FAR_PARTICIPANTS, contestSeed: 1 });
    expect(() => timeline.step({
      tick: 2,
      participants: [FAR_PARTICIPANTS[0]],
      contestSeed: 1,
    })).toThrow(/必须包含全部 participants/);
    expect(timeline.nextTick).toBe(2);
    expect(equipmentSystem.listSnapshots()).toHaveLength(3);
    expect(() => timeline.getSnapshot()).toThrow(/不能快照未完成 tick/);

    const retried = timeline.step({
      tick: 2,
      participants: FAR_PARTICIPANTS,
      contestSeed: 1,
    });
    expect(retried.spawned).toHaveLength(3);
    expect(equipmentSystem.listSnapshots()).toHaveLength(3);
    expect(timeline.nextTick).toBe(3);
    expect(timeline.getSnapshot().activeSupplies).toHaveLength(3);
    timeline.destroy();
    equipmentSystem.destroy();
  });

  it('replaces held equipment and atomically disposes an expired held supply', () => {
    const { equipmentSystem, timeline } = createTimelineHarness();
    equipmentSystem.spawn({
      instanceId: 'old-primary',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'old-spawn',
      position: { x: 0, y: 1, z: 0 },
    });
    equipmentSystem.resolvePickups({ participants: nearCenterParticipants(), contestSeed: 1 });
    timeline.step({ tick: 0, participants: FAR_PARTICIPANTS, contestSeed: 1 });
    timeline.step({ tick: 1, participants: FAR_PARTICIPANTS, contestSeed: 1 });
    const replacement = timeline.step({
      tick: 2,
      participants: nearCenterParticipants(),
      contestSeed: 1,
    });
    expect(replacement.pickupDecisions).toHaveLength(1);
    expect(replacement.pickupDecisions[0]).toMatchObject({
      participantId: 'player-1',
      previousEquipmentInstanceId: 'old-primary',
      kind: 'replaced',
    });
    expect(replacement.pickupEvents.map(({ type }) => type)).toEqual([
      ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED,
      ARENA_MATCH_EVENT.EQUIPMENT_REPLACED,
    ]);
    expect(() => equipmentSystem.getSnapshot('old-primary')).toThrow(/未知 equipment instance/);

    timeline.step({ tick: 3, participants: FAR_PARTICIPANTS, contestSeed: 1 });
    const expiry = timeline.step({ tick: 4, participants: FAR_PARTICIPANTS, contestSeed: 1 });
    expect(expiry.expiredEvents).toHaveLength(2);
    const heldId = equipmentSystem.getHeldEquipment('player-1')?.instanceId;
    expect(heldId).toMatch(/slot-center/);
    expect(equipmentSystem.listExpiredHeldSupplyEquipmentInstanceIds()).toEqual([heldId]);
    let callbackCalls = 0;
    const disposed = equipmentSystem.dropOwned('player-1', {
      isPositionValid() {
        callbackCalls += 1;
        return true;
      },
    });
    expect(callbackCalls).toBe(0);
    expect(disposed).toMatchObject({
      fallbackUsed: false,
      despawned: true,
      diagnosticCode: EQUIPMENT_DESPAWN_REASON.EXPIRED_HELD_LIFECYCLE,
    });
    expect(equipmentSystem.listSnapshots()).toEqual([]);
    expect(equipmentSystem.listExpiredHeldSupplyEquipmentInstanceIds()).toEqual([]);
    expect(equipmentSystem.dropOwned('player-1', { isPositionValid: () => true })).toBeNull();
    timeline.destroy();
    equipmentSystem.destroy();
  });

  it('validates a supply phase completely before spawning or expiring authority state', () => {
    const legacy = createSystem();
    expect(() => legacy.applySupplyTimelinePhase({ tick: 2, spawns: [], expirations: [] }))
      .toThrow(/未配置 EquipmentSupplyRegistry/);
    expect(legacy.listSnapshots()).toEqual([]);
    legacy.destroy();

    const system = createSupplySystem();
    const spawn = timelineSpawn();
    expect(() => system.applySupplyTimelinePhase({ tick: 2, spawns: {}, expirations: [] }))
      .toThrow(/必须是数组/);
    expect(() => system.applySupplyTimelinePhase({
      tick: 3,
      spawns: [spawn],
      expirations: [],
    })).toThrow(/只能在 spawnTick/);
    expect(() => system.applySupplyTimelinePhase({
      tick: 2,
      spawns: [spawn, spawn],
      expirations: [],
    })).toThrow(/重复 equipment instance/);
    expect(system.listSnapshots()).toEqual([]);

    const phase = system.applySupplyTimelinePhase({ tick: 2, spawns: [spawn], expirations: [] });
    expect(phase.spawned).toHaveLength(1);
    expect(phase.spawnedEvents[0]?.type).toBe(ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED);
    expect(() => system.applySupplyTimelinePhase({
      tick: 3,
      spawns: [],
      expirations: [spawn.lifecycle],
    })).toThrow(/只能在 expireTick/);
    expect(() => system.applySupplyTimelinePhase({
      tick: 4,
      spawns: [],
      expirations: [spawn.lifecycle, spawn.lifecycle],
    })).toThrow(/重复 supply expiration/);
    expect(system.getSnapshot(spawn.lifecycle.equipmentInstanceId).locationState)
      .toBe(EQUIPMENT_LOCATION_STATE.SPAWNED);

    const expiry = system.applySupplyTimelinePhase({
      tick: 4,
      spawns: [],
      expirations: [spawn.lifecycle],
    });
    expect(expiry.events).toHaveLength(1);
    expect(expiry.events[0]?.type).toBe(ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED);
    expect(system.listSnapshots()).toEqual([]);
    system.destroy();
  });

  it('fails closed when a supply replacement commit cannot recycle the previous runtime', () => {
    const system = createSupplySystem();
    system.spawn({
      instanceId: 'old-primary',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'old-spawn',
      position: { x: 0, y: 1, z: 0 },
    });
    system.resolvePickups({ participants: nearCenterParticipants(), contestSeed: 1 });
    const spawn = timelineSpawn();
    system.applySupplyTimelinePhase({ tick: 2, spawns: [spawn], expirations: [] });

    const originalDelete = Map.prototype.delete as (
      this: Map<unknown, unknown>,
      key: unknown,
    ) => boolean;
    let injected = false;
    Object.defineProperty(Map.prototype, 'delete', {
      configurable: true,
      writable: true,
      value(this: Map<unknown, unknown>, key: unknown): boolean {
        if (!injected && key === 'old-primary') {
          injected = true;
          throw new Error('controlled recycle commit failure');
        }
        return originalDelete.call(this, key);
      },
    });
    try {
      expect(() => system.resolveSupplyPickups({
        participants: nearCenterParticipants(),
        supplies: [spawn.lifecycle],
        contestSeed: 3,
        tick: 3,
      })).toThrow(/controlled recycle commit failure/);
    } finally {
      Object.defineProperty(Map.prototype, 'delete', {
        configurable: true,
        writable: true,
        value: originalDelete,
      });
    }
    expect(injected).toBe(true);
    expect(() => system.listSnapshots()).toThrow(/已销毁/);
    expect(() => system.listExpiredHeldSupplyEquipmentInstanceIds()).toThrow(/已销毁/);
    system.destroy();
  });

  it('covers action, drop and reconcile boundaries without publishing partial state', () => {
    const system = createSystem();
    expect(system.getActionCandidate('player-1')).toBeNull();
    expect(system.getAerialActionCandidate('player-1')).toBeNull();
    expect(system.updateLastSafePosition('player-1', { x: 1, y: 1, z: 0 })).toBeNull();
    expect(system.dropOwned('player-1', { isPositionValid: () => true })).toBeNull();
    expect(() => system.getActionCandidate('unknown-player')).toThrow(/未知 equipment participant/);

    system.spawn({
      instanceId: 'equipment-action',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'action-spawn',
      position: { x: 0, y: 1, z: 0 },
    });
    expect(() => system.spawn({
      instanceId: 'equipment-action',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'duplicate',
      position: { x: 0, y: 1, z: 0 },
    })).toThrow(/重复 equipment instance/);
    system.resolvePickups({ participants: nearCenterParticipants(), contestSeed: 2 });
    expect(system.getAerialActionCandidate('player-1')).toMatchObject({
      actionDefinitionId: 'hammer-air',
      available: true,
    });
    expect(() => system.assertActionCanStart('player-1', 'other-action')).toThrow(/动作不匹配/);
    const unchanged = system.updateLastSafePosition('player-1', { x: 0, y: 1, z: 0 });
    const moved = system.updateLastSafePosition('player-1', { x: 2, y: 1, z: 0 });
    expect(moved?.revision).toBe((unchanged?.revision ?? 0) + 1);
    expect(system.markActionStarted('player-1', 'hammer-air').cooldownRemainingTicks).toBe(3);
    expect(() => system.assertActionCanStart('player-1', 'hammer-air')).toThrow(/仍在冷却/);
    expect(system.advanceCooldowns()).toHaveLength(1);

    const dropped = system.dropOwned('player-1', {
      isPositionValid: (position: Readonly<{ x: number }>) => position.x === 2,
    });
    expect(dropped).toMatchObject({ fallbackUsed: false, despawned: false });
    expect(dropped?.equipment.position).toEqual({ x: 2, y: 1, z: 0 });
    system.spawn({
      instanceId: 'equipment-reconcile-extra',
      definitionId: EQUIPMENT_DEFINITION.id,
      spawnId: 'reconcile-extra',
      position: { x: 3, y: 1, z: 0 },
    });
    expect(() => system.despawnInvalidWorldEquipment({ isPositionValid: true }))
      .toThrow(/需要 isPositionValid/);
    let callbackCalls = 0;
    expect(() => system.despawnInvalidWorldEquipment({
      isPositionValid() {
        callbackCalls += 1;
        if (callbackCalls === 1) return false;
        return Promise.resolve(true);
      },
    })).toThrow(/必须返回布尔值/);
    expect(system.getSnapshot('equipment-action').locationState)
      .toBe(EQUIPMENT_LOCATION_STATE.DROPPED);
    const despawned = system.despawnInvalidWorldEquipment({ isPositionValid: () => false });
    expect(despawned).toHaveLength(2);
    expect(despawned.every(({ locationState }) => (
      locationState === EQUIPMENT_LOCATION_STATE.DESPAWNED
    ))).toBe(true);
    system.destroy();
    expect(() => system.getSnapshot('equipment-action')).toThrow(/已销毁/);
  });

  it('rejects invalid construction and timeline authority descriptors without invoking getters', () => {
    expect(() => new EquipmentSystem({
      participantIds: [],
      actionRegistry: ACTION_REGISTRY,
      equipmentRegistry: EQUIPMENT_REGISTRY,
    })).toThrow(/participantIds/);
    expect(() => new EquipmentSystem({
      participantIds: ['player-1'],
      actionRegistry: null,
      equipmentRegistry: EQUIPMENT_REGISTRY,
    })).toThrow(/ActionRegistry/);
    expect(() => new EquipmentSystem({
      participantIds: ['player-1'],
      actionRegistry: ACTION_REGISTRY,
      equipmentRegistry: null,
    })).toThrow(/EquipmentRegistry/);
    expect(() => new EquipmentSystem({
      participantIds: ['player-1'],
      actionRegistry: ACTION_REGISTRY,
      equipmentRegistry: EQUIPMENT_REGISTRY,
      equipmentSupplyRegistry: {},
    })).toThrow(/equipmentSupplyRegistry/);

    let getterCalls = 0;
    const hostileAuthority = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(hostileAuthority, 'applySupplyTimelinePhase', {
      configurable: true,
      get() {
        getterCalls += 1;
        return () => ({ spawned: [], spawnedEvents: [], events: [] });
      },
    });
    expect(() => new EquipmentSupplyTimelineSystem({
      supplyDefinitionId: SHORT_SUPPLY_DEFINITION.id,
      spawnSpecs: SHORT_SPAWN_SPECS,
      equipmentRegistry: EQUIPMENT_REGISTRY,
      equipmentSupplyRegistry: SUPPLY_REGISTRY,
      equipmentSystem: hostileAuthority,
    })).toThrow(/数据方法/);
    expect(getterCalls).toBe(0);
    expect(() => new EquipmentSupplyTimelineSystem({
      supplyDefinitionId: SHORT_SUPPLY_DEFINITION.id,
      spawnSpecs: SHORT_SPAWN_SPECS.slice(0, 2),
      equipmentRegistry: EQUIPMENT_REGISTRY,
      equipmentSupplyRegistry: SUPPLY_REGISTRY,
      equipmentSystem: createSupplySystem(),
    })).toThrow(/恰好包含 3 项/);
    expect(() => new EquipmentSupplyTimelineSystem({
      supplyDefinitionId: SHORT_SUPPLY_DEFINITION.id,
      spawnSpecs: SHORT_SPAWN_SPECS.map((spec, index) => index === 1
        ? { ...spec, slotId: 'center' }
        : spec),
      equipmentRegistry: EQUIPMENT_REGISTRY,
      equipmentSupplyRegistry: SUPPLY_REGISTRY,
      equipmentSystem: createSupplySystem(),
    })).toThrow(/重复 supply slotId/);
    expect(() => new EquipmentSupplyTimelineSystem({
      supplyDefinitionId: SHORT_SUPPLY_DEFINITION.id,
      spawnSpecs: SHORT_SPAWN_SPECS.map((spec, index) => index === 0
        ? { ...spec, position: { x: Number.NaN, y: 1, z: 0 } }
        : spec),
      equipmentRegistry: EQUIPMENT_REGISTRY,
      equipmentSupplyRegistry: SUPPLY_REGISTRY,
      equipmentSystem: createSupplySystem(),
    })).toThrow(/有限数/);
  });

  it('restores only active registered supply identities and continues from a frozen snapshot', () => {
    const first = createTimelineHarness();
    first.timeline.step({ tick: 0, participants: FAR_PARTICIPANTS, contestSeed: 4 });
    first.timeline.step({ tick: 1, participants: FAR_PARTICIPANTS, contestSeed: 4 });
    first.timeline.step({ tick: 2, participants: FAR_PARTICIPANTS, contestSeed: 4 });
    const snapshot = first.timeline.getSnapshot();
    expect(snapshot).toMatchObject({
      schemaVersion: EQUIPMENT_SUPPLY_TIMELINE_SNAPSHOT_SCHEMA_VERSION,
      supplyDefinitionId: SHORT_SUPPLY_DEFINITION.id,
      nextTick: 3,
    });
    expect(Object.isFrozen(snapshot.activeSupplies)).toBe(true);
    first.timeline.destroy();

    const restored = new EquipmentSupplyTimelineSystem({
      supplyDefinitionId: SHORT_SUPPLY_DEFINITION.id,
      spawnSpecs: SHORT_SPAWN_SPECS,
      equipmentRegistry: EQUIPMENT_REGISTRY,
      equipmentSupplyRegistry: SUPPLY_REGISTRY,
      equipmentSystem: first.equipmentSystem,
      snapshot,
    });
    expect(restored.getSnapshot()).toEqual(snapshot);
    restored.step({ tick: 3, participants: FAR_PARTICIPANTS, contestSeed: 4 });
    const expired = restored.step({ tick: 4, participants: FAR_PARTICIPANTS, contestSeed: 4 });
    expect(expired.expiredEvents).toHaveLength(3);

    for (const invalidSnapshot of [
      { ...snapshot, schemaVersion: 2 },
      { ...snapshot, supplyDefinitionId: 'other-supply' },
      { ...snapshot, activeSupplies: null },
      { ...snapshot, nextTick: 2 },
      { ...snapshot, activeSupplies: [...snapshot.activeSupplies, snapshot.activeSupplies[0]] },
      {
        ...snapshot,
        activeSupplies: snapshot.activeSupplies.map((lifecycle, index) => index === 0
          ? { ...lifecycle, supplyId: 'unregistered-supply-id' }
          : lifecycle),
      },
    ]) {
      expect(() => new EquipmentSupplyTimelineSystem({
        supplyDefinitionId: SHORT_SUPPLY_DEFINITION.id,
        spawnSpecs: SHORT_SPAWN_SPECS,
        equipmentRegistry: EQUIPMENT_REGISTRY,
        equipmentSupplyRegistry: SUPPLY_REGISTRY,
        equipmentSystem: first.equipmentSystem,
        snapshot: invalidSnapshot,
      })).toThrow();
    }

    const overflow = new EquipmentSupplyTimelineSystem({
      supplyDefinitionId: SHORT_SUPPLY_DEFINITION.id,
      spawnSpecs: SHORT_SPAWN_SPECS,
      equipmentRegistry: EQUIPMENT_REGISTRY,
      equipmentSupplyRegistry: SUPPLY_REGISTRY,
      equipmentSystem: createSupplySystem(),
      snapshot: {
        schemaVersion: EQUIPMENT_SUPPLY_TIMELINE_SNAPSHOT_SCHEMA_VERSION,
        supplyDefinitionId: SHORT_SUPPLY_DEFINITION.id,
        nextTick: Number.MAX_SAFE_INTEGER,
        activeSupplies: [],
      },
    });
    expect(() => overflow.step({
      tick: Number.MAX_SAFE_INTEGER,
      participants: FAR_PARTICIPANTS,
      contestSeed: 0,
    })).toThrow(/nextTick 超出安全整数范围/);
    overflow.destroy();
    restored.destroy();
    first.equipmentSystem.destroy();
  });
});
