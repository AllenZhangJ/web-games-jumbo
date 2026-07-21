import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionRegistry } from '../../src/arena/action/action-registry.js';
import {
  STAGE4_ACTION_DEFINITIONS,
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_DEFINITIONS,
  STAGE4_EQUIPMENT_ID,
  createStage4ContentRegistries,
} from '../../src/arena/content/stage4-equipment.js';
import { ARENA_GAMEPLAY_V2_TUNING } from '../../src/arena/content/arena-gameplay-v2-tuning.js';
import { EquipmentRegistry } from '../../src/arena/equipment/equipment-registry.js';
import { createArenaMatchConfig } from '../../src/arena/config.js';
import {
  EQUIPMENT_LOCATION_STATE,
  createEquipmentRuntimeSnapshot,
  createEquipmentRuntimeState,
} from '../../src/arena/equipment/equipment-runtime.js';

test('Stage4 catalog validates three equipment definitions and all action references', () => {
  const { actionRegistry, equipmentRegistry } = createStage4ContentRegistries();
  assert.equal(actionRegistry.size, 8);
  assert.equal(equipmentRegistry.size, 3);
  assert.deepEqual(
    equipmentRegistry.list().map(({ id }) => id),
    [STAGE4_EQUIPMENT_ID.CHAIN, STAGE4_EQUIPMENT_ID.HAMMER, STAGE4_EQUIPMENT_ID.SHIELD],
  );
  assert.equal(
    equipmentRegistry.require(STAGE4_EQUIPMENT_ID.HAMMER).actionDefinitionId,
    STAGE4_ACTION_ID.HAMMER_SMASH,
  );
  assert.equal(
    equipmentRegistry.require(STAGE4_EQUIPMENT_ID.HAMMER).aerialActionDefinitionId,
    STAGE4_ACTION_ID.HAMMER_AIR_SMASH,
  );
});

test('base push compatibility definition cannot drift before MatchCore migration', () => {
  const { actionRegistry } = createStage4ContentRegistries();
  const definition = actionRegistry.require(STAGE4_ACTION_ID.BASE_PUSH);
  const legacy = createArenaMatchConfig().basePush;
  const hitstun = definition.effects.find(({ kind }) => kind === 'apply-hitstun');
  const impulse = definition.effects.find(({ kind }) => kind === 'apply-directional-impulse');
  assert.deepEqual({
    range: definition.targeting.parameters.range,
    minimumFacingDot: definition.targeting.parameters.minimumFacingDot,
    maximumVerticalDifference: definition.targeting.parameters.maximumVerticalDifference,
    windupTicks: definition.timing.windupTicks,
    activeTicks: definition.timing.activeTicks,
    recoveryTicks: definition.timing.recoveryTicks,
    hitstunTicks: hitstun.parameters.ticks,
    horizontalImpulse: impulse.parameters.horizontalImpulse,
    verticalImpulse: impulse.parameters.verticalImpulse,
  }, legacy);
});

test('all authoritative attack definitions consume the unified tuning table exactly', () => {
  const definitionById = new Map(STAGE4_ACTION_DEFINITIONS.map((definition) => [
    definition.id,
    definition,
  ]));
  for (const [id, tuning] of Object.entries(ARENA_GAMEPLAY_V2_TUNING.attacks)) {
    const { kind, ...targetingParameters } = tuning.targeting;
    const definition = definitionById.get(id);
    assert.ok(definition, `missing ActionDefinition ${id}`);
    assert.deepEqual(definition.timing, tuning.timing);
    assert.equal(definition.targeting.kind, kind);
    assert.deepEqual(definition.targeting.parameters, targetingParameters);
    const impulse = definition.effects.find(({ kind }) => (
      kind === 'apply-directional-impulse' || kind === 'pull-to-source'
    ));
    assert.equal(impulse.parameters.horizontalImpulse, tuning.knockback.horizontalImpulse);
    assert.equal(impulse.parameters.verticalImpulse, tuning.knockback.verticalImpulse);
  }
});

test('EquipmentRegistry rejects duplicate ids and dangling ActionDefinition references', () => {
  const actionRegistry = new ActionRegistry(STAGE4_ACTION_DEFINITIONS);
  assert.throws(() => new EquipmentRegistry({
    definitions: [STAGE4_EQUIPMENT_DEFINITIONS[0], STAGE4_EQUIPMENT_DEFINITIONS[0]],
    actionRegistry,
  }), /重复 id hammer/);
  assert.throws(() => new EquipmentRegistry({
    definitions: [{
      ...STAGE4_EQUIPMENT_DEFINITIONS[0],
      id: 'broken-equipment',
      actionDefinitionId: 'missing-action',
    }],
    actionRegistry,
  }), /未知 ActionDefinition missing-action/);
});

test('EquipmentRuntime keeps stable identity separate from mutable state and exposes frozen snapshots', () => {
  const { equipmentRegistry } = createStage4ContentRegistries();
  const runtime = createEquipmentRuntimeState({
    instanceId: 'equipment-1',
    definitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'spawner-center',
    position: { x: 1, y: 2, z: 3 },
    equipmentRegistry,
  });
  assert.equal(runtime.locationState, EQUIPMENT_LOCATION_STATE.SPAWNED);
  assert.throws(() => { runtime.instanceId = 'tampered'; }, TypeError);
  runtime.cooldownRemainingTicks = 10;
  runtime.revision += 1;
  const snapshot = createEquipmentRuntimeSnapshot(runtime);
  runtime.position.x = 999;
  assert.equal(snapshot.position.x, 1);
  assert.equal(snapshot.cooldownRemainingTicks, 10);
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.position));
  assert.throws(() => { snapshot.position.x = 100; }, TypeError);
});

test('EquipmentRuntime rejects invalid registry references, positions and snapshot state', () => {
  const { equipmentRegistry } = createStage4ContentRegistries();
  assert.throws(() => createEquipmentRuntimeState({
    instanceId: 'equipment-bad',
    definitionId: 'unknown',
    spawnId: 'spawn',
    position: { x: 0, y: 0, z: 0 },
    equipmentRegistry,
  }), /未知 EquipmentDefinition unknown/);
  assert.throws(() => createEquipmentRuntimeState({
    instanceId: 'equipment-bad',
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'spawn',
    position: { x: 0, y: Number.NaN, z: 0 },
    equipmentRegistry,
  }), /position\.y 必须是有限数/);

  const runtime = createEquipmentRuntimeState({
    instanceId: 'equipment-2',
    definitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'spawn',
    position: { x: 0, y: 0, z: 0 },
    equipmentRegistry,
  });
  runtime.locationState = 'teleported-by-renderer';
  assert.throws(() => createEquipmentRuntimeSnapshot(runtime), /locationState 不受支持/);
});

test('EquipmentRuntime snapshot enforces location ownership invariants', () => {
  const { equipmentRegistry } = createStage4ContentRegistries();
  const runtime = createEquipmentRuntimeState({
    instanceId: 'equipment-3',
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'spawn',
    position: { x: 0, y: 0, z: 0 },
    equipmentRegistry,
  });
  runtime.locationState = EQUIPMENT_LOCATION_STATE.HELD;
  runtime.ownerId = 'player-1';
  assert.throws(
    () => createEquipmentRuntimeSnapshot(runtime),
    /不能有世界 position/,
  );
  runtime.position = null;
  const held = createEquipmentRuntimeSnapshot(runtime);
  assert.equal(held.ownerId, 'player-1');
  assert.equal(held.position, null);
});
