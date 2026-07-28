import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
  createArenaV2SurvivalSupplyRegistry,
  createStage4ContentRegistries,
} from '@number-strategy-jump/arena-v1-content';
import { ARENA_MATCH_EVENT } from '@number-strategy-jump/arena-contracts';
import {
  EQUIPMENT_LOCATION_STATE,
  EQUIPMENT_SUPPLY_TIMELINE_SNAPSHOT_SCHEMA_VERSION,
  EquipmentSupplyTimelineSystem,
  EquipmentSystem,
  type EquipmentSupplyTimelineStepResult,
} from '@number-strategy-jump/arena-equipment';

const PARTICIPANT_IDS = ['player-1', 'player-2'] as const;
const FAR_PARTICIPANTS = Object.freeze([
  Object.freeze({ id: 'player-1', position: Object.freeze({ x: 50, y: 1, z: 50 }), eligible: true }),
  Object.freeze({ id: 'player-2', position: Object.freeze({ x: -50, y: 1, z: -50 }), eligible: true }),
]);
const SPAWN_SPECS = Object.freeze([
  Object.freeze({
    slotId: 'right',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'survival-right',
    position: Object.freeze({ x: 2, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'left',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'survival-left',
    position: Object.freeze({ x: -2, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'center',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'survival-center',
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
]);

function createHarness(snapshot?: unknown) {
  const registries = createStage4ContentRegistries();
  const supplyRegistry = createArenaV2SurvivalSupplyRegistry();
  const equipmentSystem = new EquipmentSystem({
    participantIds: PARTICIPANT_IDS,
    ...registries,
    equipmentSupplyRegistry: supplyRegistry,
  });
  const timeline = new EquipmentSupplyTimelineSystem({
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    spawnSpecs: SPAWN_SPECS,
    equipmentRegistry: registries.equipmentRegistry,
    equipmentSupplyRegistry: supplyRegistry,
    equipmentSystem,
    ...(snapshot === undefined ? {} : { snapshot }),
  });
  return { ...registries, supplyRegistry, equipmentSystem, timeline };
}

function stepTo(
  timeline: EquipmentSupplyTimelineSystem,
  targetTick: number,
  participants: readonly unknown[] = FAR_PARTICIPANTS,
): EquipmentSupplyTimelineStepResult {
  let result: EquipmentSupplyTimelineStepResult | null = null;
  while (timeline.nextTick <= targetTick) {
    result = timeline.step({
      tick: timeline.nextTick,
      participants,
      contestSeed: 17,
    });
  }
  if (!result) throw new Error(`没有推进到 tick ${targetTick}。`);
  return result;
}

test('supply timeline spawns three stable identities at 1200/2400 and never on non-wave ticks', () => {
  const { timeline, equipmentSystem } = createHarness();
  const before = stepTo(timeline, 1_199);
  assert.deepEqual(before.spawned, []);
  assert.equal(equipmentSystem.listSnapshots().length, 0);

  const first = stepTo(timeline, 1_200);
  assert.deepEqual(first.phaseOrder, ['spawn', 'expire', 'pickup', 'action']);
  assert.equal(first.nextPhase, 'action');
  assert.deepEqual(first.spawned.map(({ supplyId }) => supplyId), [
    'arena-v2.survival-supply.v1:wave-0:slot-center',
    'arena-v2.survival-supply.v1:wave-0:slot-left',
    'arena-v2.survival-supply.v1:wave-0:slot-right',
  ]);
  assert.deepEqual(first.spawned.map(({ equipmentInstanceId }) => equipmentInstanceId),
    first.spawned.map(({ supplyId }) => `${supplyId}:equipment`));
  assert.equal(equipmentSystem.listSnapshots().length, 3);

  const nonWave = stepTo(timeline, 2_399);
  assert.deepEqual(nonWave.spawned, []);
  assert.equal(equipmentSystem.listSnapshots().length, 0);
  const second = stepTo(timeline, 2_400);
  assert.equal(second.spawned.length, 3);
  assert.deepEqual(second.spawned.map(({ supplyId }) => supplyId), [
    'arena-v2.survival-supply.v1:wave-1:slot-center',
    'arena-v2.survival-supply.v1:wave-1:slot-left',
    'arena-v2.survival-supply.v1:wave-1:slot-right',
  ]);
  timeline.destroy();
  equipmentSystem.destroy();
});

test('599/600/601 boundary expires world supply before same-tick pickup', () => {
  const { timeline, equipmentSystem } = createHarness();
  stepTo(timeline, 1_799);
  assert.equal(equipmentSystem.listSnapshots().length, 3, '出生后599 tick仍存在');
  const nearAtExpiry = [
    { id: 'player-1', position: { x: 0, y: 1, z: 0 }, eligible: true },
    FAR_PARTICIPANTS[1],
  ];
  const expiry = stepTo(timeline, 1_800, nearAtExpiry);
  assert.equal(expiry.expiredEvents.length, 3, '出生后600 tick先过期');
  assert.ok(expiry.expiredEvents.every(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED));
  assert.deepEqual(expiry.pickupDecisions, [], 'expireTick不能被抢救拾取');
  assert.equal(equipmentSystem.getHeldEquipment('player-1'), null);
  assert.equal(equipmentSystem.listSnapshots().length, 0);
  const after = stepTo(timeline, 1_801, nearAtExpiry);
  assert.deepEqual(after.expiredEvents, [], '出生后601 tick不重复过期');
  assert.equal(equipmentSystem.listSnapshots().length, 0);
  timeline.destroy();
  equipmentSystem.destroy();
});

test('held supply survives expireTick while remaining world supplies expire', () => {
  const { timeline, equipmentSystem } = createHarness();
  stepTo(timeline, 1_199);
  const nearCenter = [
    { id: 'player-1', position: { x: 0, y: 1, z: 0 }, eligible: true },
    FAR_PARTICIPANTS[1],
  ];
  const spawned = stepTo(timeline, 1_200, nearCenter);
  assert.equal(spawned.pickupDecisions.length, 1);
  assert.ok(equipmentSystem.getActionCandidate('player-1'), '动作阶段只能观察到已完成的拾取');
  const heldId = equipmentSystem.getHeldEquipment('player-1')?.instanceId;
  assert.ok(heldId);
  const expired = stepTo(timeline, 1_800, nearCenter);
  assert.equal(expired.expiredEvents.length, 2);
  assert.equal(equipmentSystem.getHeldEquipment('player-1')?.instanceId, heldId);
  assert.equal(equipmentSystem.getSnapshot(heldId).locationState, EQUIPMENT_LOCATION_STATE.HELD);
  assert.equal(equipmentSystem.listSnapshots().length, 1);
  assert.deepEqual(timeline.listActiveSupplies(), []);
  timeline.destroy();
  equipmentSystem.destroy();
});

test('same-wave replacement retires the recycled supply lifecycle before expiry', () => {
  const { timeline, equipmentSystem } = createHarness();
  stepTo(timeline, 1_199);
  const nearCenter = [
    { id: 'player-1', position: { x: 0, y: 1, z: 0 }, eligible: true },
    FAR_PARTICIPANTS[1],
  ];
  stepTo(timeline, 1_200, nearCenter);
  const centerId = equipmentSystem.getHeldEquipment('player-1')?.instanceId;
  assert.match(centerId ?? '', /slot-center/);
  const nearLeft = [
    { id: 'player-1', position: { x: -2, y: 1, z: 0 }, eligible: true },
    FAR_PARTICIPANTS[1],
  ];
  const replacement = stepTo(timeline, 1_201, nearLeft);
  assert.deepEqual(replacement.pickupEvents.map(({ type }) => type), [
    ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED,
    ARENA_MATCH_EVENT.EQUIPMENT_REPLACED,
  ]);
  assert.equal(
    Reflect.get(replacement.pickupEvents[0]?.payload ?? {}, 'recycledEquipmentInstanceId'),
    centerId,
  );
  assert.throws(() => equipmentSystem.getSnapshot(centerId), /未知 equipment instance/);
  assert.equal(timeline.listActiveSupplies().some(({ equipmentInstanceId }) => (
    equipmentInstanceId === centerId
  )), false);
  const expiry = stepTo(timeline, 1_800, nearLeft);
  assert.equal(expiry.expiredEvents.length, 1, '只剩未拾取的right供给需要过期');
  assert.match(equipmentSystem.getHeldEquipment('player-1')?.instanceId ?? '', /slot-left/);
  timeline.destroy();
  equipmentSystem.destroy();
});

test('versioned timeline snapshot restores deterministically and continues with identical results', () => {
  const first = createHarness();
  const control = createHarness();
  stepTo(first.timeline, 1_300);
  stepTo(control.timeline, 1_300);
  const snapshot = first.timeline.getSnapshot();
  assert.equal(snapshot.schemaVersion, EQUIPMENT_SUPPLY_TIMELINE_SNAPSHOT_SCHEMA_VERSION);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.activeSupplies), true);
  first.timeline.destroy();
  const restored = new EquipmentSupplyTimelineSystem({
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    spawnSpecs: SPAWN_SPECS,
    equipmentRegistry: first.equipmentRegistry,
    equipmentSupplyRegistry: first.supplyRegistry,
    equipmentSystem: first.equipmentSystem,
    snapshot,
  });
  const restoredResult = stepTo(restored, 1_800);
  const controlResult = stepTo(control.timeline, 1_800);
  assert.deepEqual(restoredResult, controlResult);
  assert.deepEqual(restored.getSnapshot(), control.timeline.getSnapshot());
  assert.deepEqual(first.equipmentSystem.listSnapshots(), control.equipmentSystem.listSnapshots());
  restored.destroy();
  control.timeline.destroy();
  first.equipmentSystem.destroy();
  control.equipmentSystem.destroy();
});

test('invalid tick, specs, duplicate runtime and restore conflict fail without partial authority', () => {
  const invalid = createHarness();
  assert.throws(() => invalid.timeline.step({
    tick: 1,
    participants: FAR_PARTICIPANTS,
    contestSeed: 0,
  }), /期望 tick 0/);
  assert.equal(invalid.timeline.nextTick, 0);
  assert.deepEqual(invalid.equipmentSystem.listSnapshots(), []);
  invalid.timeline.destroy();
  invalid.equipmentSystem.destroy();

  const registries = createStage4ContentRegistries();
  const supplyRegistry = createArenaV2SurvivalSupplyRegistry();
  const equipmentSystem = new EquipmentSystem({
    participantIds: PARTICIPANT_IDS,
    ...registries,
    equipmentSupplyRegistry: supplyRegistry,
  });
  assert.throws(() => new EquipmentSupplyTimelineSystem({
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    spawnSpecs: SPAWN_SPECS.map((spec, index) => index === 0
      ? { ...spec, position: { x: Number.NaN, y: 1, z: 0 } }
      : spec),
    equipmentRegistry: registries.equipmentRegistry,
    equipmentSupplyRegistry: supplyRegistry,
    equipmentSystem,
  }), /非有限|有限数/);
  assert.deepEqual(equipmentSystem.listSnapshots(), []);

  const retryable = createHarness();
  stepTo(retryable.timeline, 1_199);
  assert.throws(() => retryable.timeline.step({
    tick: 1_200,
    participants: [FAR_PARTICIPANTS[0]],
    contestSeed: 0,
  }), /必须包含全部 participants/);
  assert.equal(retryable.timeline.nextTick, 1_200);
  assert.equal(retryable.equipmentSystem.listSnapshots().length, 3);
  assert.throws(() => retryable.timeline.getSnapshot(), /不能快照未完成 tick/);
  const retried = retryable.timeline.step({
    tick: 1_200,
    participants: FAR_PARTICIPANTS,
    contestSeed: 0,
  });
  assert.equal(retried.spawned.length, 3);
  assert.equal(retryable.equipmentSystem.listSnapshots().length, 3);
  assert.equal(retryable.timeline.nextTick, 1_201);
  retryable.timeline.destroy();
  retryable.equipmentSystem.destroy();

  const duplicate = createHarness();
  stepTo(duplicate.timeline, 1_199);
  const duplicateId = 'arena-v2.survival-supply.v1:wave-0:slot-center:equipment';
  duplicate.equipmentSystem.spawn({
    instanceId: duplicateId,
    definitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'conflict',
    position: { x: 0, y: 1, z: 0 },
  });
  assert.throws(() => duplicate.timeline.step({
    tick: 1_200,
    participants: FAR_PARTICIPANTS,
    contestSeed: 0,
  }), /重复 equipment instance/);
  assert.equal(duplicate.equipmentSystem.listSnapshots().length, 1, '其余两个供给不能半生成');
  assert.equal(duplicate.timeline.nextTick, 1_200);
  duplicate.timeline.destroy();
  duplicate.equipmentSystem.destroy();

  const restoreSource = createHarness();
  stepTo(restoreSource.timeline, 1_200);
  const snapshot = restoreSource.timeline.getSnapshot();
  assert.throws(() => new EquipmentSupplyTimelineSystem({
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    spawnSpecs: SPAWN_SPECS,
    equipmentRegistry: restoreSource.equipmentRegistry,
    equipmentSupplyRegistry: restoreSource.supplyRegistry,
    equipmentSystem: restoreSource.equipmentSystem,
    snapshot: { ...snapshot, schemaVersion: 2 },
  }), /schemaVersion/);
  assert.throws(() => new EquipmentSupplyTimelineSystem({
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    spawnSpecs: SPAWN_SPECS,
    equipmentRegistry: restoreSource.equipmentRegistry,
    equipmentSupplyRegistry: restoreSource.supplyRegistry,
    equipmentSystem: restoreSource.equipmentSystem,
    snapshot: { ...snapshot, futureState: true },
  }), /futureState/);
  assert.throws(() => new EquipmentSupplyTimelineSystem({
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    spawnSpecs: SPAWN_SPECS,
    equipmentRegistry: restoreSource.equipmentRegistry,
    equipmentSupplyRegistry: restoreSource.supplyRegistry,
    equipmentSystem: restoreSource.equipmentSystem,
    snapshot: { ...snapshot, nextTick: Number.MAX_SAFE_INTEGER + 1 },
  }), /安全整数/);
  const conflicted = {
    ...snapshot,
    activeSupplies: snapshot.activeSupplies.map((lifecycle, index) => index === 0
      ? { ...lifecycle, equipmentInstanceId: 'unknown-runtime' }
      : { ...lifecycle }),
  };
  assert.throws(() => new EquipmentSupplyTimelineSystem({
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    spawnSpecs: SPAWN_SPECS,
    equipmentRegistry: restoreSource.equipmentRegistry,
    equipmentSupplyRegistry: restoreSource.supplyRegistry,
    equipmentSystem: restoreSource.equipmentSystem,
    snapshot: conflicted,
  }), /不是组合层注册身份|未知 equipment/);
  assert.deepEqual(restoreSource.equipmentSystem.listSnapshots().length, 3);
  restoreSource.timeline.destroy();
  restoreSource.equipmentSystem.destroy();
  equipmentSystem.destroy();
});

test('many deterministic waves keep world runtime and active lifecycle counts bounded', () => {
  const { timeline, equipmentSystem } = createHarness();
  let maximumRuntimeCount = 0;
  let maximumActiveCount = 0;
  const finalTick = ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick
    + ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnIntervalTicks * 20;
  while (timeline.nextTick <= finalTick) {
    timeline.step({
      tick: timeline.nextTick,
      participants: FAR_PARTICIPANTS,
      contestSeed: 99,
    });
    maximumRuntimeCount = Math.max(maximumRuntimeCount, equipmentSystem.listSnapshots().length);
    maximumActiveCount = Math.max(maximumActiveCount, timeline.listActiveSupplies().length);
  }
  assert.equal(maximumRuntimeCount, 3);
  assert.equal(maximumActiveCount, 3);
  assert.equal(equipmentSystem.listSnapshots().length, 3);
  timeline.destroy();
  equipmentSystem.destroy();
});

test('timeline destroy is idempotent and releases only its owned lifecycle ledger', () => {
  const { timeline, equipmentSystem } = createHarness();
  stepTo(timeline, 1_200);
  assert.equal(equipmentSystem.listSnapshots().length, 3);
  timeline.destroy();
  timeline.destroy();
  assert.throws(() => timeline.getSnapshot(), /已销毁/);
  assert.throws(() => timeline.step({
    tick: 1_201,
    participants: FAR_PARTICIPANTS,
    contestSeed: 0,
  }), /已销毁/);
  assert.equal(
    equipmentSystem.listSnapshots().length,
    3,
    'Timeline不能越权销毁借用的EquipmentSystem；组合层负责随后销毁实例authority',
  );
  equipmentSystem.destroy();
});
