import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BotController,
  cloneBotCommandSourceV5,
  cloneBotSourceSnapshot,
  createBotArenaView,
  createBotObservation,
  createBotObservationV5,
} from '@number-strategy-jump/arena-bot';
import { createBotCommandSourceV5FromLegacy } from '../../packages/arena-bot/src/bot-observation.js';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';

const LEGACY_OBSERVATION_KEYS = [
  'schemaVersion', 'commandTick', 'observedTick', 'phase', 'remainingTicks',
  'self', 'opponent', 'equipment', 'map', 'arena', 'actionRule',
  'opponentActionRule', 'objectives',
];
const V5_SOURCE_KEYS = [
  'schemaVersion', 'commandTick', 'commandEventSequence', 'phase', 'remainingTicks',
  'self', 'opponent', 'botMobility', 'equipment', 'map',
];
const V5_OBSERVATION_KEYS = [
  'schemaVersion', 'commandTick', 'commandEventSequence', 'observedTick',
  'observedEventSequence', 'phase', 'remainingTicks', 'self', 'opponent',
  'equipment', 'map', 'arena', 'actionRule', 'opponentActionRule',
  'botMobility', 'objectives',
];

function makeCore(seed = 101) {
  return createArenaV1MatchCore({ seed, config: { preparingTicks: 0 } });
}

function sourceFromCore(core: ReturnType<typeof makeCore>) {
  return createBotCommandSourceV5FromLegacy(
    cloneBotSourceSnapshot(core.getLegacyFullSnapshotForAudit()),
    'player-2',
  );
}

function arenaFor(core: ReturnType<typeof makeCore>) {
  return createBotArenaView(
    core.config.arena,
    core.getCharacterDefinition('player-2').collision.radius,
  );
}

function assertDeepFrozen(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

test('legacy V4 shape stays exact while V5 is a separate contract', () => {
  const core = makeCore();
  const legacy = cloneBotSourceSnapshot(core.getLegacyFullSnapshotForAudit());
  const arena = arenaFor(core);
  const v4 = createBotObservation({
    commandSnapshot: legacy,
    delayedSnapshot: legacy,
    selfId: 'player-2',
    arena,
  });
  assert.deepEqual(Object.keys(v4), LEGACY_OBSERVATION_KEYS);
  assert.equal('botMobility' in v4, false);
  assert.equal('observedEventSequence' in v4, false);

  const source = sourceFromCore(core);
  const v5 = createBotObservationV5({
    commandSource: source,
    delayedSource: source,
    selfId: 'player-2',
    arena,
  });
  assert.deepEqual(Object.keys(source), V5_SOURCE_KEYS);
  assert.deepEqual(Object.keys(v5), V5_OBSERVATION_KEYS);
  assert.equal('actionAffordance' in v5.self, false);
  assert.deepEqual(Object.keys(v5.botMobility.channels).sort(), ['jump', 'slam']);
  assertDeepFrozen(source);
  assertDeepFrozen(v5);
  assert.throws(() => {
    (v5.self.position as { x: number }).x = 999;
  }, TypeError);
  core.destroy();
});

test('V5 keeps current self/mobility and delays only opponent/world', () => {
  const core = makeCore(102);
  const before = sourceFromCore(core);
  const beforePosition = before.self.position;
  core.step([
    createNeutralInputFrame(0, 'player-1'),
    { ...createNeutralInputFrame(0, 'player-2'), jumpPressed: true },
  ]);
  const after = sourceFromCore(core);
  const observation = createBotObservationV5({
    commandSource: after,
    delayedSource: before,
    selfId: 'player-2',
    arena: arenaFor(core),
  });
  assert.equal(observation.commandTick, after.commandTick);
  assert.equal(observation.commandEventSequence, after.commandEventSequence);
  assert.equal(observation.observedTick, before.commandTick);
  assert.equal(observation.observedEventSequence, before.commandEventSequence);
  assert.deepEqual(observation.self, after.self);
  assert.deepEqual(observation.opponent, before.opponent);
  assert.deepEqual(observation.equipment, before.equipment);
  assert.deepEqual(observation.map, before.map);
  assert.deepEqual(observation.botMobility, after.botMobility);
  assert.notEqual(observation.self.position, beforePosition);
  assert.throws(() => createBotObservationV5({
    commandSource: before,
    delayedSource: after,
    selfId: 'player-2',
    arena: arenaFor(core),
  }), /未来 tick/);
  core.destroy();
});

test('V5 source rejects missing/undefined/accessor/extra fields at every trusted boundary', () => {
  const core = makeCore(103);
  const source = sourceFromCore(core);

  const missingSelf = structuredClone(source) as unknown as Record<string, unknown>;
  delete missingSelf.self;
  assert.throws(() => cloneBotCommandSourceV5(missingSelf), /self.*显式/);

  const undefinedPosition = structuredClone(source) as unknown as {
    self: { position: Record<string, unknown> };
  };
  undefinedPosition.self.position.x = undefined;
  assert.throws(() => cloneBotCommandSourceV5(undefinedPosition), /只能包含可序列化数据/);

  let phaseReads = 0;
  const accessor = structuredClone(source) as unknown as Record<string, unknown>;
  Object.defineProperty(accessor, 'phase', {
    enumerable: true,
    get() {
      phaseReads += 1;
      return source.phase;
    },
  });
  assert.throws(() => cloneBotCommandSourceV5(accessor), TypeError);
  assert.equal(phaseReads, 0);

  const extraParticipant = structuredClone(source) as unknown as {
    self: Record<string, unknown>;
  };
  extraParticipant.self.extra = true;
  assert.throws(() => cloneBotCommandSourceV5(extraParticipant), /不支持字段/);

  const equipmentSource = structuredClone(source) as unknown as {
    equipment: Array<Record<string, unknown>>;
  };
  equipmentSource.equipment = [{
    instanceId: 'test-equipment-instance',
    definitionId: 'test-equipment-definition',
    locationState: 'spawned',
    remainingTicks: null,
    position: { x: 0, y: 0, z: 0 },
  }];

  const extraEquipmentPosition = structuredClone(equipmentSource) as unknown as {
    equipment: Array<{ position: Record<string, unknown> }>;
  };
  extraEquipmentPosition.equipment[0]!.position.secret = 99;
  assert.throws(() => cloneBotCommandSourceV5(extraEquipmentPosition), /position.*不支持字段/);

  const missingEquipmentPosition = structuredClone(equipmentSource) as unknown as {
    equipment: Array<{ position: Record<string, unknown> }>;
  };
  delete missingEquipmentPosition.equipment[0]!.position.z;
  assert.throws(
    () => cloneBotCommandSourceV5(missingEquipmentPosition),
    /position\.z.*显式可枚举数据字段/,
  );

  const undefinedEquipmentPosition = structuredClone(equipmentSource) as unknown as {
    equipment: Array<{ position: Record<string, unknown> }>;
  };
  undefinedEquipmentPosition.equipment[0]!.position.x = undefined;
  assert.throws(
    () => cloneBotCommandSourceV5(undefinedEquipmentPosition),
    /只能包含可序列化数据/,
  );

  const accessorEquipmentPosition = structuredClone(equipmentSource) as unknown as {
    equipment: Array<{ position: Record<string, unknown> }>;
  };
  let equipmentPositionGetterReads = 0;
  Object.defineProperty(accessorEquipmentPosition.equipment[0]!.position, 'x', {
    enumerable: true,
    get() {
      equipmentPositionGetterReads += 1;
      return 0;
    },
  });
  assert.throws(
    () => cloneBotCommandSourceV5(accessorEquipmentPosition),
    TypeError,
  );
  assert.equal(equipmentPositionGetterReads, 0);

  const missingMobilityChannel = structuredClone(source) as {
    botMobility: { channels: Record<string, unknown> };
  };
  delete missingMobilityChannel.botMobility.channels.jump;
  assert.throws(() => cloneBotCommandSourceV5(missingMobilityChannel), /channels\.jump.*显式/);

  const privateMap = structuredClone(source) as unknown as { map: Record<string, unknown> };
  privateMap.map.privatePlan = { future: true };
  assert.throws(() => cloneBotCommandSourceV5(privateMap), /privatePlan/);

  const nestedPrivateMap = structuredClone(source) as unknown as {
    map: {
      occurrences: Array<Record<string, unknown>>;
    };
  };
  nestedPrivateMap.map.occurrences = [{
    occurrenceId: 'test-occurrence',
    eventId: 'test-event',
    kind: 'test-kind',
    warningTick: 0,
    startTick: 0,
    endTick: null,
    phase: 'warning',
    publicPayload: { privatePlan: { future: true } },
    revision: 0,
  }];
  assert.throws(() => cloneBotCommandSourceV5(nestedPrivateMap), /privatePlan/);

  const missingOption = {
    delayedSource: source,
    selfId: 'player-2',
    arena: arenaFor(core),
  };
  assert.throws(
    () => Reflect.apply(createBotObservationV5, null, [missingOption]),
    /commandSource.*显式/,
  );
  core.destroy();
});

test('V5 repeated stable identity is idempotent while changed same-tick identity fails closed', () => {
  const core = makeCore(106);
  const handle = {};
  let current = sourceFromCore(core);
  const reader = { read: () => current };
  const controller = new BotController({
    participantId: 'player-2',
    difficultyId: 'normal',
    behaviorSeed: 13,
    personalitySeed: 14,
    trustedCommandSourceHandle: handle,
    arena: core.config.arena,
    characterRadius: core.getCharacterDefinition('player-2').collision.radius,
  });
  controller.attachTrustedCommandSourceReader(reader, handle);

  const firstFrame = controller.createInputFromTrustedCommandSource();
  const beforeRepeat = controller.getDebugSnapshot();
  const repeatedFrame = controller.createInputFromTrustedCommandSource();
  assert.strictEqual(repeatedFrame, firstFrame);
  assert.deepEqual(controller.getDebugSnapshot(), beforeRepeat);

  const changedSameIdentity = structuredClone(current) as unknown as Record<string, unknown>;
  changedSameIdentity.remainingTicks = (changedSameIdentity.remainingTicks as number) + 1;
  current = changedSameIdentity as unknown as typeof current;
  assert.throws(
    () => controller.createInputFromTrustedCommandSource(),
    /同 tick source identity 或内容不一致/,
  );
  assert.deepEqual(controller.getDebugSnapshot(), beforeRepeat);

  const changedEventIdentity = structuredClone(sourceFromCore(core)) as unknown as {
    commandEventSequence: number;
    botMobility: { eventSequence: number };
  };
  changedEventIdentity.commandEventSequence += 1;
  changedEventIdentity.botMobility.eventSequence += 1;
  current = changedEventIdentity as unknown as typeof current;
  assert.throws(
    () => controller.createInputFromTrustedCommandSource(),
    /同 tick source identity 或内容不一致/,
  );

  const changedPhase = structuredClone(sourceFromCore(core)) as unknown as {
    phase: string;
  };
  changedPhase.phase = changedPhase.phase === 'running' ? 'preparing' : 'running';
  current = changedPhase as unknown as typeof current;
  assert.throws(
    () => controller.createInputFromTrustedCommandSource(),
    /同 tick source identity 或内容不一致/,
  );
  assert.deepEqual(controller.getDebugSnapshot(), beforeRepeat);

  current = sourceFromCore(core);
  core.step([
    createNeutralInputFrame(core.tick, 'player-1'),
    createNeutralInputFrame(core.tick, 'player-2'),
  ]);
  current = sourceFromCore(core);
  const nextFrame = controller.createInputFromTrustedCommandSource();
  assert.notStrictEqual(nextFrame, firstFrame);
  const beforeNextRepeat = controller.getDebugSnapshot();
  assert.strictEqual(controller.createInputFromTrustedCommandSource(), nextFrame);
  assert.deepEqual(controller.getDebugSnapshot(), beforeNextRepeat);

  const endedSource = structuredClone(sourceFromCore(core)) as unknown as Record<string, unknown>;
  endedSource.phase = 'ended';
  const endedCurrent = endedSource as unknown as typeof current;
  const endedHandle = {};
  const endedController = new BotController({
    participantId: 'player-2',
    difficultyId: 'normal',
    behaviorSeed: 13,
    personalitySeed: 14,
    trustedCommandSourceHandle: endedHandle,
    arena: core.config.arena,
    characterRadius: core.getCharacterDefinition('player-2').collision.radius,
  });
  endedController.attachTrustedCommandSourceReader(
    { read: () => endedCurrent },
    endedHandle,
  );
  const endedFrame = endedController.createInputFromTrustedCommandSource();
  assert.strictEqual(endedController.createInputFromTrustedCommandSource(), endedFrame);
  endedController.destroy();

  controller.destroy();
  core.destroy();
});

test('trusted command-source attach uses one expected handle and captures the reader method', () => {
  const core = makeCore(104);
  const strictCore = makeCore(104);
  const current = sourceFromCore(core);
  const expectedHandle = {};
  const otherHandle = {};
  const reader = {
    read() {
      return current;
    },
  };
  const controller = new BotController({
    participantId: 'player-2',
    difficultyId: 'easy',
    behaviorSeed: 7,
    personalitySeed: 8,
    trustedCommandSourceHandle: expectedHandle,
    arena: core.config.arena,
    characterRadius: core.getCharacterDefinition('player-2').collision.radius,
  });
  assert.throws(
    () => controller.attachTrustedCommandSourceReader(reader, otherHandle),
    /handle.*不一致/,
  );
  assert.equal(controller.attachTrustedCommandSourceReader(reader, expectedHandle), true);
  assert.throws(
    () => controller.attachTrustedCommandSourceReader({ read() { return current; } }, expectedHandle),
    /不可替换/,
  );
  const originalRead = reader.read;
  reader.read = () => { throw new Error('replaced reader must not be used'); };
  assert.equal(controller.attachTrustedCommandSourceReader(reader, expectedHandle), true);
  const trustedFrame = controller.createInputFromTrustedCommandSource();
  const strictFrame = new BotController({
    participantId: 'player-2',
    difficultyId: 'easy',
    behaviorSeed: 7,
    personalitySeed: 8,
    arena: strictCore.config.arena,
    characterRadius: strictCore.getCharacterDefinition('player-2').collision.radius,
  }).createInput(strictCore.getLegacyFullSnapshotForAudit());
  assert.equal(typeof originalRead, 'function');
  assert.deepEqual(trustedFrame, strictFrame);

  const accessorReader: Record<string, unknown> = {};
  let getterReads = 0;
  Object.defineProperty(accessorReader, 'read', {
    enumerable: true,
    get() {
      getterReads += 1;
      return () => current;
    },
  });
  assert.throws(
    () => controller.attachTrustedCommandSourceReader(accessorReader, expectedHandle),
    /不可替换/,
  );
  assert.equal(getterReads, 0);

  const freshAccessorController = new BotController({
    participantId: 'player-2',
    difficultyId: 'easy',
    behaviorSeed: 9,
    personalitySeed: 10,
    trustedCommandSourceHandle: expectedHandle,
    arena: core.config.arena,
    characterRadius: core.getCharacterDefinition('player-2').collision.radius,
  });
  let freshGetterReads = 0;
  const freshAccessorReader: Record<string, unknown> = {};
  Object.defineProperty(freshAccessorReader, 'read', {
    enumerable: true,
    get() {
      freshGetterReads += 1;
      return () => current;
    },
  });
  assert.throws(
    () => freshAccessorController.attachTrustedCommandSourceReader(
      freshAccessorReader,
      expectedHandle,
    ),
    /数据方法/,
  );
  assert.equal(freshGetterReads, 0);
  assert.equal(
    freshAccessorController.attachTrustedCommandSourceReader(
      { read: () => current },
      expectedHandle,
    ),
    true,
  );
  freshAccessorController.destroy();

  controller.destroy();
  assert.throws(() => controller.createInputFromTrustedCommandSource(), /已销毁/);
  assert.equal(reader.read instanceof Function, true);
  core.destroy();
  strictCore.destroy();
});

test('trusted command-source attach does not publish after descriptor reentry or destroy', () => {
  const core = makeCore(108);
  const current = sourceFromCore(core);
  const makeController = (handle: object) => new BotController({
    participantId: 'player-2',
    difficultyId: 'easy',
    behaviorSeed: 19,
    personalitySeed: 20,
    trustedCommandSourceHandle: handle,
    arena: core.config.arena,
    characterRadius: core.getCharacterDefinition('player-2').collision.radius,
  });

  const reentrantHandle = {};
  const reentrantController = makeController(reentrantHandle);
  const reentrantTarget = { read: () => current };
  let nestedErrors = 0;
  const reentrantReader = new Proxy(reentrantTarget, {
    getOwnPropertyDescriptor(target, key) {
      if (key === 'read') {
        try {
          reentrantController.attachTrustedCommandSourceReader(
            { read: () => current },
            reentrantHandle,
          );
        } catch {
          nestedErrors += 1;
        }
      }
      return Object.getOwnPropertyDescriptor(target, key);
    },
  });
  assert.throws(
    () => reentrantController.attachTrustedCommandSourceReader(
      reentrantReader,
      reentrantHandle,
    ),
    /验证期间禁止重入/,
  );
  assert.equal(nestedErrors, 1);
  assert.throws(
    () => reentrantController.createInputFromTrustedCommandSource(),
    /尚未由 bundle 绑定/,
  );
  assert.equal(
    reentrantController.attachTrustedCommandSourceReader(
      { read: () => current },
      reentrantHandle,
    ),
    true,
  );
  reentrantController.destroy();

  const destroyHandle = {};
  const destroyController = makeController(destroyHandle);
  const destroyTarget = { read: () => current };
  const destroyReader = new Proxy(destroyTarget, {
    getOwnPropertyDescriptor(target, key) {
      if (key === 'read') destroyController.destroy();
      return Object.getOwnPropertyDescriptor(target, key);
    },
  });
  assert.throws(
    () => destroyController.attachTrustedCommandSourceReader(destroyReader, destroyHandle),
    /已销毁/,
  );
  assert.throws(
    () => destroyController.createInputFromTrustedCommandSource(),
    /已销毁/,
  );
  destroyController.destroy();
  core.destroy();
});

test('legacy and trusted V5 command source paths produce identical frames and retry pre-commit failures', () => {
  const legacyCore = makeCore(105);
  const trustedCore = makeCore(105);
  const handle = {};
  let current = sourceFromCore(trustedCore);
  const reader = { read: () => current };
  const common = {
    participantId: 'player-2',
    difficultyId: 'normal',
    behaviorSeed: 11,
    personalitySeed: 12,
    arena: legacyCore.config.arena,
    characterRadius: legacyCore.getCharacterDefinition('player-2').collision.radius,
  } as const;
  const legacy = new BotController(common);
  const trusted = new BotController({ ...common, trustedCommandSourceHandle: handle });
  trusted.attachTrustedCommandSourceReader(reader, handle);
  for (let index = 0; index < 4; index += 1) {
    current = sourceFromCore(trustedCore);
    const before = trusted.getDebugSnapshot();
    if (index === 1) {
      const invalid = structuredClone(current) as unknown as Record<string, unknown>;
      delete invalid.self;
      current = invalid as unknown as typeof current;
      assert.throws(() => trusted.createInputFromTrustedCommandSource(), /self/);
      assert.deepEqual(trusted.getDebugSnapshot(), before);
      current = sourceFromCore(trustedCore);
    }
    const legacyFrame = legacy.createInput(legacyCore.getLegacyFullSnapshotForAudit());
    const trustedFrame = trusted.createInputFromTrustedCommandSource();
    assert.deepEqual(trustedFrame, legacyFrame);
    legacyCore.step([
      createNeutralInputFrame(legacyCore.tick, 'player-1'),
      legacyFrame,
    ]);
    trustedCore.step([
      createNeutralInputFrame(trustedCore.tick, 'player-1'),
      trustedFrame,
    ]);
  }
  legacy.destroy();
  trusted.destroy();
  legacyCore.destroy();
  trustedCore.destroy();
});
