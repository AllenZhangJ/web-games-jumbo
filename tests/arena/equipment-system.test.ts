import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_ID,
  createStage4ContentRegistries,
} from '@number-strategy-jump/arena-v1-content';
import {
  EQUIPMENT_LOCATION_STATE,
  EquipmentPickupResolver,
  EquipmentSpawner,
  EquipmentSystem,
  type EquipmentPosition,
  deserializeEquipmentRuntimeState,
  serializeEquipmentRuntimeStates,
} from '@number-strategy-jump/arena-equipment';

const PARTICIPANT_IDS = Object.freeze(['player-1', 'player-2']);

function required<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) throw new Error(`测试缺少 ${name}。`);
  return value;
}

function createSystem() {
  const registries = createStage4ContentRegistries();
  return {
    ...registries,
    system: new EquipmentSystem({ participantIds: PARTICIPANT_IDS, ...registries }),
  };
}

function participants(player1X = 0, player2X = 4) {
  return [
    { id: 'player-1', position: { x: player1X, y: 1, z: 0 }, eligible: true },
    { id: 'player-2', position: { x: player2X, y: 1, z: 0 }, eligible: true },
  ];
}

function spawnHammer(system: EquipmentSystem, overrides: Record<string, unknown> = {}) {
  return system.spawn({
    instanceId: 'equipment-1',
    definitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'center-spawn',
    position: { x: 0, y: 1, z: 0 },
    ...overrides,
  });
}

test('EquipmentSystem owns spawn, automatic pickup, slot and cooldown state', () => {
  const { system } = createSystem();
  const spawned = spawnHammer(system);
  assert.equal(spawned.locationState, EQUIPMENT_LOCATION_STATE.SPAWNED);
  const picked = system.resolvePickups({ participants: participants(), contestSeed: 7 });
  assert.deepEqual(picked.map(({ participantId }) => participantId), ['player-1']);
  assert.equal(required(system.getHeldEquipment('player-1'), 'player-1 装备').instanceId, 'equipment-1');
  assert.equal(system.getHeldEquipment('player-2'), null);

  const ready = required(system.getActionCandidate('player-1'), '地面动作候选');
  assert.equal(ready.actionDefinitionId, STAGE4_ACTION_ID.HAMMER_SMASH);
  assert.equal(ready.available, true);
  const aerialReady = required(system.getAerialActionCandidate('player-1'), '空中动作候选');
  assert.equal(aerialReady.actionDefinitionId, STAGE4_ACTION_ID.HAMMER_AIR_SMASH);
  assert.ok(aerialReady.priority > ready.priority);
  const used = system.markActionStarted('player-1', STAGE4_ACTION_ID.HAMMER_SMASH);
  assert.equal(used.cooldownRemainingTicks, 72);
  const blocked = required(system.getActionCandidate('player-1'), '冷却动作候选');
  assert.equal(blocked.available, false);
  assert.equal(blocked.blocksFallback, true);
  assert.equal(blocked.unavailableReason, 'equipment-cooldown');
  for (let tick = 0; tick < 72; tick += 1) system.advanceCooldowns();
  assert.equal(required(system.getActionCandidate('player-1'), '冷却完成动作候选').available, true);
  system.destroy();
});

test('single primary slot prevents a participant from collecting another nearby equipment', () => {
  const { system } = createSystem();
  spawnHammer(system);
  system.spawn({
    instanceId: 'equipment-2',
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'center-spawn-2',
    position: { x: 0.2, y: 1, z: 0 },
  });
  const first = system.resolvePickups({ participants: participants(), contestSeed: 0 });
  assert.equal(first.length, 1);
  const second = system.resolvePickups({ participants: participants(), contestSeed: 0 });
  assert.equal(second.length, 0);
  assert.equal(system.listSnapshots().filter(({ locationState }) => (
    locationState === EQUIPMENT_LOCATION_STATE.HELD
  )).length, 1);
  system.destroy();
});

test('pickup contests are independent of input array order and seeded ties do not hard-code one player', () => {
  const { equipmentRegistry } = createStage4ContentRegistries();
  const spawner = new EquipmentSpawner({ equipmentRegistry });
  const equipment = [spawner.preview({
    instanceId: 'contested',
    definitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'center',
    position: { x: 0, y: 1, z: 0 },
  })];
  const resolver = new EquipmentPickupResolver({ equipmentRegistry });
  const actors = participants(-0.2, 0.2);
  const winners = new Set();
  for (let seed = 0; seed < 64; seed += 1) {
    const forward = resolver.resolve({ participants: actors, equipment, contestSeed: seed });
    const reversed = resolver.resolve({ participants: [...actors].reverse(), equipment, contestSeed: seed });
    assert.deepEqual(forward, reversed);
    winners.add(required(forward[0], '拾取胜者').participantId);
  }
  assert.deepEqual([...winners].sort(), PARTICIPANT_IDS);
});

test('death drop uses last safe position and reports deterministic origin fallback', () => {
  const { system } = createSystem();
  spawnHammer(system);
  system.resolvePickups({ participants: participants(), contestSeed: 1 });
  system.updateLastSafePosition('player-1', { x: 2, y: 1, z: 0 });
  const normal = required(system.dropOwned('player-1', {
    isPositionValid: () => true,
  }), '正常掉落结果');
  assert.equal(normal.fallbackUsed, false);
  assert.deepEqual(normal.equipment.position, { x: 2, y: 1, z: 0 });

  system.resolvePickups({ participants: participants(2, 4), contestSeed: 1 });
  system.updateLastSafePosition('player-1', { x: 99, y: -20, z: 0 });
  const fallback = required(system.dropOwned('player-1', {
    isPositionValid: (position: EquipmentPosition) => position.y >= 0,
  }), '回退掉落结果');
  assert.equal(fallback.fallbackUsed, true);
  assert.equal(fallback.diagnosticCode, 'equipment-drop-fallback-origin-spawn');
  assert.deepEqual(fallback.equipment.position, { x: 0, y: 1, z: 0 });
  system.destroy();
});

test('failed or reentrant drop leaves ownership unchanged', () => {
  const { system } = createSystem();
  spawnHammer(system);
  system.resolvePickups({ participants: participants(), contestSeed: 1 });
  assert.throws(() => system.dropOwned('player-1', {
    isPositionValid() {
      system.dropOwned('player-1', { isPositionValid: () => true });
      return true;
    },
  }), /不可重入/);
  assert.equal(required(system.getHeldEquipment('player-1'), '重入失败后的装备').instanceId, 'equipment-1');

  const emergency = required(system.dropOwned('player-1', {
    isPositionValid: () => false,
  }), '紧急掉落结果');
  assert.equal(emergency.fallbackUsed, true);
  assert.equal(emergency.despawned, true);
  assert.equal(emergency.diagnosticCode, 'equipment-drop-no-valid-position');
  assert.equal(emergency.equipment.locationState, EQUIPMENT_LOCATION_STATE.DESPAWNED);
  assert.equal(emergency.equipment.position, null);
  assert.equal(system.getHeldEquipment('player-1'), null);
  system.destroy();
});

test('invalid world equipment is despawned atomically while held equipment remains owned', () => {
  const { system } = createSystem();
  spawnHammer(system);
  system.spawn({
    instanceId: 'equipment-2',
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'right-spawn',
    position: { x: 2, y: 1, z: 0 },
  });
  system.resolvePickups({ participants: participants(), contestSeed: 1 });
  assert.throws(() => system.despawnInvalidWorldEquipment({
    isPositionValid() {
      system.despawnInvalidWorldEquipment({ isPositionValid: () => true });
      return false;
    },
  }), /不可重入/);
  assert.equal(system.getSnapshot('equipment-2').locationState, EQUIPMENT_LOCATION_STATE.SPAWNED);

  const despawned = system.despawnInvalidWorldEquipment({
    isPositionValid: (position: EquipmentPosition) => position.x < 1,
  });
  assert.deepEqual(despawned.map(({ instanceId }) => instanceId), ['equipment-2']);
  assert.equal(required(despawned[0], '失效装备').locationState, EQUIPMENT_LOCATION_STATE.DESPAWNED);
  assert.equal(required(system.getHeldEquipment('player-1'), '仍持有的装备').instanceId, 'equipment-1');
  system.destroy();
});

test('EquipmentSerializer round trips schema state without Registry or runtime references', () => {
  const { equipmentRegistry } = createStage4ContentRegistries();
  const spawner = new EquipmentSpawner({ equipmentRegistry });
  const runtime = spawner.createRuntime({
    instanceId: 'serialized',
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'spawn-a',
    position: { x: 1, y: 2, z: 3 },
  });
  runtime.cooldownRemainingTicks = 9;
  runtime.revision = 4;
  const serialized = serializeEquipmentRuntimeStates([runtime]);
  const restored = deserializeEquipmentRuntimeState(required(serialized[0], '序列化装备'), { equipmentRegistry });
  assert.deepEqual(serializeEquipmentRuntimeStates([restored]), serialized);
  assert.equal(JSON.stringify(serialized).includes('equipmentRegistry'), false);
});

test('EquipmentSystem rejects partial, accessor or invalid mutations and has terminal lifecycle', () => {
  const { system } = createSystem();
  spawnHammer(system);
  assert.throws(() => spawnHammer(system), /重复 equipment instance equipment-1/);
  assert.equal(system.listSnapshots().length, 1);
  assert.throws(() => system.resolvePickups({
    participants: [participants()[0]],
    contestSeed: 0,
  }), /必须包含全部 participants/);

  let getterCalled = false;
  const hostile = { position: { x: 0, y: 1, z: 0 }, eligible: true };
  Object.defineProperty(hostile, 'id', {
    enumerable: true,
    get() {
      getterCalled = true;
      return 'player-1';
    },
  });
  assert.throws(() => system.resolvePickups({
    participants: [hostile, participants()[1]],
    contestSeed: 0,
  }), /必须是可枚举数据字段/);
  assert.equal(getterCalled, false);
  assert.equal(required(system.listSnapshots()[0], '场上装备').locationState, EQUIPMENT_LOCATION_STATE.SPAWNED);

  system.destroy();
  system.destroy();
  assert.throws(() => system.listSnapshots(), /已销毁/);
  assert.throws(() => system.spawn({}), /已销毁/);
});
