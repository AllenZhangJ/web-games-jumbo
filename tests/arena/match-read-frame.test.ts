import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_MATCH_READ_PROFILE,
  createDeterministicDataHash,
  createNeutralInputFrame,
  normalizeInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_EVENT,
  HeadlessMatchRunner,
} from '@number-strategy-jump/arena-match';
import {
  createArenaV1MatchCore,
  createArenaV1MapSystem,
  createArenaV1RuleEngine,
  createArenaV2SurvivalSupplyMatchCore,
} from '@number-strategy-jump/arena-v1-composition';
import type {
  MatchCore,
  MatchReadBinding,
  MatchReadFrameReader,
} from '@number-strategy-jump/arena-match';
import { MatchCore as MatchCoreClass } from '@number-strategy-jump/arena-match';
import { createArenaV1CharacterRegistry } from '@number-strategy-jump/arena-v1-content';
import {
  composeWorldSnapshotV2,
  type MatchReadWorldSource,
} from '../../packages/arena-match/src/match-read-frame.js';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
} from '@number-strategy-jump/arena-v1-content';
import { STAGE4_EQUIPMENT_ID } from '@number-strategy-jump/arena-v1-content';
import { LocalMatchSession } from '@number-strategy-jump/arena-session';

const SURVIVAL_SPAWN_SPECS = Object.freeze([
  Object.freeze({
    slotId: 'left',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'pa2c-left',
    position: Object.freeze({ x: -1, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'right',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'pa2c-right',
    position: Object.freeze({ x: 1, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'spare',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'pa2c-spare',
    position: Object.freeze({ x: 3, y: 1, z: 0 }),
  }),
]);
const SURVIVAL_SUPPLY = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  spawnSpecs: SURVIVAL_SPAWN_SPECS,
});
const SURVIVAL_CONTRACT_HASH = createDeterministicDataHash(
  {
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    firstSpawnTick: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick,
    spawnIntervalTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnIntervalTicks,
    spawnCount: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnCount,
    lifetimeTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.lifetimeTicks,
    spawnSpecs: SURVIVAL_SPAWN_SPECS,
    equipmentDefinitionIds: Object.freeze([
      ...new Set(SURVIVAL_SPAWN_SPECS.map(({ equipmentDefinitionId }) => equipmentDefinitionId)),
    ]),
  },
  'PA2c survival composition contract',
);

function descriptor(core: MatchCore, compositionContractHash?: string): Readonly<Record<string, unknown>> {
  return {
    schemaVersion: 1,
    compositionId: 'pa2c-read-frame-test',
    participantIds: [...core.config.participantIds],
    mapDefinitionId: core.config.mapDefinitionId,
    contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
    ...(compositionContractHash === undefined ? {} : { compositionContractHash }),
  };
}

function ordinaryCore(options: Readonly<Record<string, unknown>> = {}): MatchCore {
  return createArenaV1MatchCore({
    seed: 2301,
    config: { preparingTicks: 0, suddenDeathStartTick: 60, hardLimitTicks: 120, ...options },
  });
}

function assertDeepFrozen(value: unknown, active = new WeakSet<object>()): void {
  if (value === null || typeof value !== 'object') return;
  const object = value as object;
  if (active.has(object)) throw new Error('test fixture cycle');
  assert.equal(Object.isFrozen(object), true);
  active.add(object);
  for (const key of Reflect.ownKeys(object)) {
    assert.equal(typeof key, 'string');
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    assert.ok(descriptor && Object.hasOwn(descriptor, 'value'));
    assertDeepFrozen(descriptor.value, active);
  }
  active.delete(object);
}

function expectedWorldFromLegacy(snapshot: unknown): Record<string, unknown> {
  const expected = structuredClone(snapshot) as Record<string, unknown>;
  expected.authoritySchemaVersion = expected.schemaVersion;
  delete expected.schemaVersion;
  for (const participant of expected.participants as Record<string, unknown>[]) {
    delete participant.actionAffordance;
  }
  const map = expected.map as Record<string, unknown>;
  for (const occurrence of map.occurrences as Record<string, unknown>[]) {
    delete occurrence.privatePlan;
  }
  if (expected.activeSupplyProjection === undefined) expected.activeSupplyProjection = null;
  delete expected.rngStates;
  return expected;
}

function bind(core: MatchCore, compositionContractHash?: string) {
  return core.createMatchReadBinding(descriptor(core, compositionContractHash));
}

test('PA2c ordinary frame is direct world + fixed local profile and shares world memo', () => {
  const core = ordinaryCore();
  const binding = bind(core);
  const localOne = core.createMatchReadFrameReader(binding, 'player-1');
  const localTwo = core.createMatchReadFrameReader(binding, 'player-2');
  const bot = core.createMatchReadSidecarReader(binding, 'player-1', 'bot-mobility');
  const full = core.createMatchReadSidecarReader(binding, 'player-1', 'full-audit');

  const frameOne = localOne.read();
  const frameTwo = localTwo.read();
  const botSidecar = bot.read();
  const fullSidecar = full.read();
  const legacy = core.getLegacyFullSnapshotForAudit();

  assert.equal(frameOne.schemaVersion, 2);
  assert.equal(frameOne.localActionSidecar.profile, ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY);
  assert.equal(frameOne.worldSnapshot.activeSupplyProjection, null);
  assert.strictEqual(frameOne.worldSnapshot, frameTwo.worldSnapshot);
  assert.deepEqual(frameOne.worldSnapshot, expectedWorldFromLegacy(legacy));
  const legacyAffordance = legacy.participants[0]?.actionAffordance as Readonly<{
    readonly channels: Readonly<Record<string, unknown>>;
    readonly primaryActionDefinitionId: string | null;
  }> | undefined;
  assert.deepEqual(frameOne.localActionSidecar.channels.primary, legacyAffordance?.channels.primary);
  assert.deepEqual(frameOne.localActionSidecar.channels.primaryHold, legacyAffordance?.channels.primaryHold);
  assert.deepEqual(botSidecar.channels.jump, legacyAffordance?.channels.jump);
  assert.deepEqual(botSidecar.channels.slam, legacyAffordance?.channels.slam);
  assert.deepEqual(fullSidecar.channels, legacyAffordance?.channels);
  assert.equal(fullSidecar.primaryActionDefinitionId, legacyAffordance?.primaryActionDefinitionId);
  assert.equal(Object.hasOwn(frameOne.worldSnapshot.participants[0] ?? {}, 'actionAffordance'), false);
  assert.equal(Object.hasOwn(frameOne.worldSnapshot.map.occurrences[0] ?? {}, 'privatePlan'), false);
  assertDeepFrozen(frameOne);
  assert.strictEqual(frameOne, localOne.read());

  assert.equal(Reflect.set(frameOne.worldSnapshot, 'tick', 99), false);
  assert.equal(frameOne.worldSnapshot.tick, legacy.tick);
  core.step(core.config.participantIds.map((participantId) => (
    createNeutralInputFrame(core.tick, participantId)
  )));
  const next = localOne.read();
  assert.notStrictEqual(next, frameOne);
  assert.notStrictEqual(next.worldSnapshot, frameOne.worldSnapshot);
  assert.equal(next.worldSnapshot.tick, core.tick);
  core.destroy();
});

test('PA2c survival frame requires and publishes the formal projection without changing legacy authority', () => {
  const core = createArenaV2SurvivalSupplyMatchCore({
    seed: 2302,
    config: { preparingTicks: 0, suddenDeathStartTick: 1_800, hardLimitTicks: 2_500 },
    supply: SURVIVAL_SUPPLY,
  });
  const binding = bind(core, SURVIVAL_CONTRACT_HASH);
  const reader = core.createMatchReadFrameReader(binding, 'player-1');
  const frame = reader.read();
  assert.ok(frame.worldSnapshot.activeSupplyProjection);
  assert.equal(frame.worldSnapshot.activeSupplyProjection?.snapshotTick, core.tick);
  assert.deepEqual(frame.worldSnapshot, expectedWorldFromLegacy(core.getLegacyFullSnapshotForAudit()));
  assertDeepFrozen(frame.worldSnapshot.activeSupplyProjection);
  core.destroy();
});

test('PA2c sidecar profiles do not build world, while a fixed profile reentrant callback fails closed and recovers', () => {
  let core: MatchCore | null = null;
  let listEquipmentSnapshotsCalls = 0;
  let genericAffordanceCalls = 0;
  const profileCalls = new Map<string, number>();
  let reenter:
    | 'snapshot'
    | 'step'
    | 'destroy'
    | 'other'
    | 'trusted-step'
    | 'trusted-batch'
    | 'trusted-public-reader'
    | 'match-binding'
    | 'match-reader'
    | 'match-frame-reader'
    | 'checkpoint'
    | 'state-hash'
    | 'replay-metadata'
    | 'uncaught'
    | null = null;
  let otherReader: { read(): { readonly profile: string } } | null = null;
  let localReader: MatchReadFrameReader | null = null;
  let activeBinding: MatchReadBinding | null = null;
  let trustedBatch: unknown = null;
  let captureReentry = false;
  const nestedErrors: Array<{ readonly operation: string; readonly message: string }> = [];
  const normalizedBatch = (): readonly ReturnType<typeof normalizeInputFrame>[] => Object.freeze(
    core?.config.participantIds.map((participantId) => normalizeInputFrame(
      createNeutralInputFrame(core?.tick ?? 0, participantId),
      {
        expectedTick: core?.tick ?? 0,
        participantIds: core?.config.participantIds ?? [],
      },
    )) ?? [],
  );
  const engineFactory = (context: Parameters<typeof createArenaV1RuleEngine>[0]) => {
    const engine = createArenaV1RuleEngine(context);
    return new Proxy(engine, {
      get(target, property, receiver) {
        const value = Reflect.get(target, property, receiver);
        if (property === 'listEquipmentSnapshots' && typeof value === 'function') {
          return (...args: unknown[]) => {
            listEquipmentSnapshotsCalls += 1;
            return value.apply(target, args);
          };
        }
        if (property === 'getActionAffordance' && typeof value === 'function') {
          return (...args: unknown[]) => {
            genericAffordanceCalls += 1;
            return value.apply(target, args);
          };
        }
        if (property === 'getActionAffordanceProfile' && typeof value === 'function') {
          return (...args: unknown[]) => {
            const profile = args[1];
            if (typeof profile === 'string') {
              profileCalls.set(profile, (profileCalls.get(profile) ?? 0) + 1);
            }
            const nested = () => {
              if (reenter === 'snapshot') core?.getLegacyFullSnapshotForAudit();
              if (reenter === 'step') core?.step([]);
              if (reenter === 'destroy') core?.destroy();
              if (reenter === 'other') otherReader?.read();
              if (reenter === 'trusted-step') {
                if (trustedBatch === null) throw new Error('test trusted batch missing');
                core?.stepTrustedInputFrameBatch(trustedBatch);
              }
              if (reenter === 'trusted-batch') {
                core?.createTrustedInputFrameBatch(normalizedBatch());
              }
              if (reenter === 'match-binding') {
                if (core === null) throw new Error('test core missing');
                core.createMatchReadBinding(descriptor(core));
              }
              if (reenter === 'match-reader') {
                if (core === null || activeBinding === null) throw new Error('test binding missing');
                core.createMatchReadReader(activeBinding, 'player-2', 'full-audit');
              }
              if (reenter === 'match-frame-reader') {
                if (core === null || activeBinding === null) throw new Error('test binding missing');
                core.createMatchReadFrameReader(activeBinding, 'player-1');
              }
              if (reenter === 'checkpoint') core?.getInternalCheckpointIdentity();
              if (reenter === 'state-hash') core?.getStateHash();
              if (reenter === 'replay-metadata') core?.getReplayMetadata();
              if (reenter === 'uncaught') core?.step([]);
            };
            if (captureReentry) {
              try {
                nested();
              } catch (error) {
                nestedErrors.push({
                  operation: reenter ?? 'none',
                  message: error instanceof Error ? error.message : String(error),
                });
              }
            } else {
              nested();
            }
            return value.apply(target, args);
          };
        }
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
  const config = {
    preparingTicks: 0,
    suddenDeathStartTick: 60,
    hardLimitTicks: 120,
  };
  core = new MatchCoreClass({
    seed: 2303,
    config,
    characterRegistry: createArenaV1CharacterRegistry(),
    ruleEngineFactory: engineFactory,
    mapSystemFactory: (context) => createArenaV1MapSystem(context),
  });
  const binding = bind(core);
  activeBinding = binding;
  localReader = core.createMatchReadFrameReader(binding, 'player-2');
  const sidecar = core.createMatchReadSidecarReader(binding, 'player-1', 'bot-mobility');
  otherReader = core.createMatchReadSidecarReader(binding, 'player-1', 'full-audit');
  const listBeforeInitialLocal = listEquipmentSnapshotsCalls;
  const firstLocal = localReader.read();
  assert.equal(listEquipmentSnapshotsCalls, listBeforeInitialLocal + 1);
  const listBeforeInitialSidecar = listEquipmentSnapshotsCalls;
  const first = sidecar.read();
  assert.equal(listEquipmentSnapshotsCalls, listBeforeInitialSidecar);
  const listBeforeInitialFull = listEquipmentSnapshotsCalls;
  const firstFull = otherReader.read();
  assert.equal(listEquipmentSnapshotsCalls, listBeforeInitialFull);
  assert.equal(first.profile, ARENA_MATCH_READ_PROFILE.BOT_MOBILITY);
  assert.equal(firstFull.profile, ARENA_MATCH_READ_PROFILE.FULL_AUDIT);
  assert.equal(listEquipmentSnapshotsCalls, 1);
  assert.equal(genericAffordanceCalls, 0);
  assert.deepEqual(
    [...profileCalls.entries()].sort(),
    [
      [ARENA_MATCH_READ_PROFILE.BOT_MOBILITY, 1],
      [ARENA_MATCH_READ_PROFILE.FULL_AUDIT, 1],
      [ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY, 1],
    ].sort(),
  );
  assert.strictEqual(firstLocal, localReader.read());
  const listBeforeSidecarMemo = listEquipmentSnapshotsCalls;
  assert.strictEqual(first, sidecar.read());
  assert.equal(listEquipmentSnapshotsCalls, listBeforeSidecarMemo);
  const listBeforeFullMemo = listEquipmentSnapshotsCalls;
  assert.strictEqual(firstFull, otherReader.read());
  assert.equal(listEquipmentSnapshotsCalls, listBeforeFullMemo);
  assert.deepEqual(
    [...profileCalls.entries()].sort(),
    [
      [ARENA_MATCH_READ_PROFILE.BOT_MOBILITY, 1],
      [ARENA_MATCH_READ_PROFILE.FULL_AUDIT, 1],
      [ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY, 1],
    ].sort(),
  );

  core.step(core.config.participantIds.map((participantId) => (
    createNeutralInputFrame(core?.tick ?? 0, participantId)
  )));
  const operations = [
    'snapshot', 'step', 'destroy', 'other', 'trusted-batch',
    'match-binding', 'match-reader', 'match-frame-reader',
    'checkpoint', 'state-hash', 'replay-metadata', 'trusted-step',
  ] as const;
  const profileCountsBeforeReentry = new Map(profileCalls);
  captureReentry = true;
  for (const [index, operation] of operations.entries()) {
    if (index > 0) {
      core.step(core.config.participantIds.map((participantId) => (
        createNeutralInputFrame(core?.tick ?? 0, participantId)
      )));
    }
    if (operation === 'trusted-step') {
      trustedBatch = core.createTrustedInputFrameBatch(normalizedBatch());
    }
    reenter = operation;
    const errorsBefore = nestedErrors.length;
    const listBeforeCapturedSidecar: number = listEquipmentSnapshotsCalls;
    assert.doesNotThrow(() => sidecar.read());
    assert.equal(listEquipmentSnapshotsCalls, listBeforeCapturedSidecar);
    assert.equal(nestedErrors.length, errorsBefore + 1);
    assert.equal(nestedErrors.at(-1)?.operation, operation);
    assert.match(nestedErrors.at(-1)?.message ?? '', /MatchRead model 构造期间/);
  }
  captureReentry = false;
  assert.equal(nestedErrors.length, operations.length);
  assert.equal(core.tick > 1, true);
  assert.doesNotThrow(() => core.stepTrustedInputFrameBatch(trustedBatch));
  trustedBatch = null;

  const profileCountsAfterCapturedReentry = new Map(profileCalls);
  assert.equal(
    profileCountsAfterCapturedReentry.get(ARENA_MATCH_READ_PROFILE.BOT_MOBILITY)!
      - profileCountsBeforeReentry.get(ARENA_MATCH_READ_PROFILE.BOT_MOBILITY)!,
    operations.length,
  );
  assert.equal(
    profileCountsAfterCapturedReentry.get(ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY)!,
    profileCountsBeforeReentry.get(ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY)!,
  );
  assert.equal(
    profileCountsAfterCapturedReentry.get(ARENA_MATCH_READ_PROFILE.FULL_AUDIT)!,
    profileCountsBeforeReentry.get(ARENA_MATCH_READ_PROFILE.FULL_AUDIT)!,
  );
  assert.equal(genericAffordanceCalls, 0);

  const listBeforeUncaught = listEquipmentSnapshotsCalls;
  reenter = 'uncaught';
  assert.throws(() => localReader?.read(), /MatchRead model 构造期间/);
  assert.equal(listEquipmentSnapshotsCalls, listBeforeUncaught + 1);
  assert.equal(firstLocal?.worldSnapshot.tick, 0);
  reenter = null;
  const listBeforeRecoverySidecar = listEquipmentSnapshotsCalls;
  assert.doesNotThrow(() => sidecar.read());
  assert.equal(listEquipmentSnapshotsCalls, listBeforeRecoverySidecar);
  const recoveredLocal = localReader?.read();
  assert.ok(recoveredLocal);
  assert.notStrictEqual(recoveredLocal, firstLocal);
  assert.notStrictEqual(recoveredLocal.worldSnapshot, firstLocal?.worldSnapshot);
  assert.equal(listEquipmentSnapshotsCalls, listBeforeUncaught + 2);
  assert.equal(genericAffordanceCalls, 0);
  assert.equal(
    profileCalls.get(ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY)!
      - profileCountsAfterCapturedReentry.get(ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY)!,
    2,
  );
  assert.equal(
    profileCalls.get(ARENA_MATCH_READ_PROFILE.FULL_AUDIT),
    profileCountsAfterCapturedReentry.get(ARENA_MATCH_READ_PROFILE.FULL_AUDIT),
  );
  core.destroy();
});

test('PA2c caught reader reentry does not consume free reader slots', () => {
  let core: MatchCore | null = null;
  let reenter: 'match-reader' | 'match-frame-reader' | null = null;
  let captureReentry = true;
  const errors: string[] = [];
  const engineFactory = (context: Parameters<typeof createArenaV1RuleEngine>[0]) => {
    const engine = createArenaV1RuleEngine(context);
    return new Proxy(engine, {
      get(target, property, receiver) {
        const value = Reflect.get(target, property, receiver);
        if (property !== 'getActionAffordanceProfile' || typeof value !== 'function') {
          return typeof value === 'function' ? value.bind(target) : value;
        }
        return (...args: unknown[]) => {
          if (reenter !== null) {
            try {
              if (core === null) throw new Error('test core missing');
              const binding = activeBinding;
              if (binding === null) throw new Error('test binding missing');
              if (reenter === 'match-reader') {
                core.createMatchReadReader(binding, 'player-2', 'full-audit');
              } else {
                core.createMatchReadFrameReader(binding, 'player-1');
              }
            } catch (error) {
              if (!captureReentry) throw error;
              errors.push(error instanceof Error ? error.message : String(error));
            }
          }
          return value.apply(target, args);
        };
      },
    });
  };
  let activeBinding: MatchReadBinding | null = null;
  core = new MatchCoreClass({
    seed: 2304,
    config: { preparingTicks: 0, suddenDeathStartTick: 60, hardLimitTicks: 120 },
    characterRegistry: createArenaV1CharacterRegistry(),
    ruleEngineFactory: engineFactory,
    mapSystemFactory: (context) => createArenaV1MapSystem(context),
  });
  activeBinding = bind(core);
  const bot = core.createMatchReadSidecarReader(activeBinding, 'player-1', 'bot-mobility');
  const full = core.createMatchReadSidecarReader(activeBinding, 'player-1', 'full-audit');
  for (const [index, operation] of (['match-reader', 'match-frame-reader'] as const).entries()) {
    reenter = operation;
    const reader = index === 0 ? bot : full;
    assert.doesNotThrow(() => reader.read());
    assert.equal(errors.length, index + 1);
    assert.match(errors[index] ?? '', /MatchRead model 构造期间/);
  }
  reenter = null;
  captureReentry = false;
  const recoveredFull = core.createMatchReadReader(activeBinding, 'player-2', 'full-audit');
  const recoveredFrame = core.createMatchReadFrameReader(activeBinding, 'player-1');
  assert.doesNotThrow(() => recoveredFull.read());
  assert.doesNotThrow(() => recoveredFrame.read());
  core.destroy();
});

test('PA2c frame readers preserve opaque owner binding, ended reads and destroy invalidation', () => {
  const first = ordinaryCore({ hardLimitTicks: 3, suddenDeathStartTick: 1 });
  const second = ordinaryCore({ hardLimitTicks: 3, suddenDeathStartTick: 1 });
  const binding = bind(first);
  const reader = first.createMatchReadFrameReader(binding, 'player-1');
  const botReader = first.createMatchReadSidecarReader(binding, 'player-1', 'bot-mobility');
  assert.throws(
    () => Reflect.apply(reader.read as (...args: unknown[]) => unknown, reader, [1]),
    /不接受参数|参数/,
  );
  assert.throws(
    () => first.createMatchReadFrameReader(binding, 'player-1'),
    /replacement|绑定|reader/i,
  );
  assert.throws(
    () => second.createMatchReadFrameReader(binding, 'player-1'),
    /binding|Core|provenance/i,
  );
  const firstFrame = reader.read();
  assert.strictEqual(firstFrame, reader.read());
  for (let index = 0; index < 3 && first.phase !== 'ended'; index += 1) {
    first.step(first.config.participantIds.map((participantId) => (
      createNeutralInputFrame(first.tick, participantId)
    )));
  }
  assert.equal(first.phase, 'ended');
  assert.doesNotThrow(() => reader.read());
  first.destroy();
  assert.throws(() => reader.read(), /失效|销毁|owner/i);
  assert.throws(() => botReader.read(), /失效|销毁|owner/i);
  assert.doesNotThrow(() => first.destroy());
  second.destroy();
});

test('PA2c full sidecars remain field-identical across preparing/running/sudden-death/ended', () => {
  const core = ordinaryCore({
    preparingTicks: 1,
    suddenDeathStartTick: 10,
    hardLimitTicks: 1_200,
    arena: {
      killY: -3,
      surfaces: [{
        id: 'pa2c-platform',
        center: { x: 0, y: -0.5, z: 0 },
        halfExtents: { x: 1.8, y: 0.5, z: 2 },
      }],
      spawns: [{ x: -0.55, y: 1, z: 0 }, { x: 0.55, y: 1, z: 0 }],
    },
    respawnTicks: 3,
    invulnerableTicks: 3,
    basePush: {
      range: 2,
      windupTicks: 1,
      activeTicks: 2,
      recoveryTicks: 2,
      horizontalImpulse: 16,
      verticalImpulse: 3,
      hitstunTicks: 6,
    },
  });
  const binding = bind(core);
  const readers = core.config.participantIds.map((participantId) => (
    core.createMatchReadSidecarReader(binding, participantId, 'full-audit')
  ));
  const seenPhases = new Set<string>();
  const assertFullParity = () => {
    const legacy = core.getLegacyFullSnapshotForAudit();
    seenPhases.add(legacy.phase);
    for (const [index, reader] of readers.entries()) {
      const affordance = legacy.participants[index]?.actionAffordance as Readonly<{
        readonly channels: Readonly<Record<string, unknown>>;
        readonly primaryActionDefinitionId: string | null;
      }> | undefined;
      const sidecar = reader.read();
      assert.deepEqual(sidecar.channels, affordance?.channels);
      assert.equal(sidecar.primaryActionDefinitionId, affordance?.primaryActionDefinitionId);
      assert.equal(sidecar.tick, legacy.tick);
      assert.equal(sidecar.eventSequence, legacy.eventSequence);
    }
  };
  const step = (overrides: Readonly<Record<string, Readonly<Record<string, boolean>>>> = {}) => (
    core.step(core.config.participantIds.map((participantId) => ({
      ...createNeutralInputFrame(core.tick, participantId),
      ...(overrides[participantId] ?? {}),
    })))
  );
  for (let index = 0; index < 12 && core.phase !== 'sudden-death'; index += 1) {
    assertFullParity();
    step();
  }
  for (let life = 0; life < 3 && (core.phase as string) !== 'ended'; life += 1) {
    let eliminated = false;
    for (let tick = 0; tick < 240 && !eliminated && (core.phase as string) !== 'ended'; tick += 1) {
      assertFullParity();
      const events = step(tick === 0
        ? { 'player-1': { primaryPressed: true, primaryHeld: true } }
        : {});
      eliminated = events.some((event) => event.type === ARENA_MATCH_EVENT.PLAYER_ELIMINATED);
    }
    for (let tick = 0; tick < 12 && (core.phase as string) !== 'ended'; tick += 1) {
      assertFullParity();
      step();
    }
  }
  assertFullParity();
  assert.equal(seenPhases.has('preparing'), true);
  assert.equal(seenPhases.has('running'), true);
  assert.equal(seenPhases.has('sudden-death'), true);
  assert.equal(seenPhases.has('ended'), true);
  assert.equal(core.result?.winnerId, 'player-1');
  core.destroy();
});

test('PA2c composer rejects formal null/undefined projection and phase mismatch before publication', () => {
  const core = ordinaryCore();
  const legacy = core.getLegacyFullSnapshotForAudit();
  const source = {
    ...legacy,
    participants: legacy.participants.map(({ actionAffordance: _actionAffordance, ...participant }) => participant),
    activeSupplyProjection: undefined,
  } as unknown as MatchReadWorldSource;
  const identity = {
    compositionHash: 'deadbeef',
    generation: 1,
    tick: legacy.tick,
    eventSequence: legacy.eventSequence,
    phase: legacy.phase as 'preparing' | 'running' | 'sudden-death' | 'ended',
  };
  assert.throws(
    () => composeWorldSnapshotV2(source, identity, { requireActiveSupplyProjection: true }),
    /缺少|projection/i,
  );
  assert.throws(
    () => composeWorldSnapshotV2(
      { ...source, activeSupplyProjection: null } as unknown as MatchReadWorldSource,
      identity,
      { requireActiveSupplyProjection: true },
    ),
    /缺少|projection/i,
  );
  assert.throws(
    () => composeWorldSnapshotV2(
      { ...source, activeSupplyProjection: null } as unknown as MatchReadWorldSource,
      { ...identity, phase: 'ended' },
    ),
    /phase|identity/i,
  );
  core.destroy();
});

test('PA2c composer rejects cycle/accessor/container data before any candidate can publish', () => {
  const core = ordinaryCore();
  const legacy = core.getLegacyFullSnapshotForAudit();
  const identity = {
    compositionHash: 'deadbeef',
    generation: 1,
    tick: legacy.tick,
    eventSequence: legacy.eventSequence,
    phase: legacy.phase as 'preparing' | 'running' | 'sudden-death' | 'ended',
  };
  const source = {
    ...legacy,
    participants: legacy.participants.map(({ actionAffordance: _actionAffordance, ...participant }) => participant),
    activeSupplyProjection: null,
  } as unknown as MatchReadWorldSource;

  const cyclicParticipant = { ...source.participants[0] } as Record<string, unknown>;
  cyclicParticipant.cycle = cyclicParticipant;
  assert.throws(
    () => composeWorldSnapshotV2(
      { ...source, participants: [cyclicParticipant, source.participants[1]] } as unknown as MatchReadWorldSource,
      identity,
    ),
    /循环|cycle/i,
  );

  let getterReads = 0;
  const accessorParticipant = { ...source.participants[0] } as Record<string, unknown>;
  Object.defineProperty(accessorParticipant, 'accessorProbe', {
    enumerable: true,
    configurable: true,
    get() {
      getterReads += 1;
      return 'must not run';
    },
  });
  assert.throws(
    () => composeWorldSnapshotV2(
      { ...source, participants: [accessorParticipant, source.participants[1]] } as unknown as MatchReadWorldSource,
      identity,
    ),
    /访问器|accessor/i,
  );
  assert.equal(getterReads, 0);

  const containerParticipant = {
    ...source.participants[0],
    opaqueContainer: new Map([['forbidden', true]]),
  } as unknown as Record<string, unknown>;
  assert.throws(
    () => composeWorldSnapshotV2(
      { ...source, participants: [containerParticipant, source.participants[1]] } as unknown as MatchReadWorldSource,
      identity,
    ),
    /plain object|array/i,
  );
  core.destroy();
});

test('PA2c pause/resume without authority identity change keeps the same frame memo', () => {
  const core = ordinaryCore({ hardLimitTicks: 3, suddenDeathStartTick: 1 });
  const binding = bind(core);
  const reader = core.createMatchReadFrameReader(binding, 'player-1');
  const session = new LocalMatchSession({
    core,
    botController: {
      createInput: () => createNeutralInputFrame(core.tick, 'player-2'),
      destroy() {},
    },
    publicMatchInfo: {
      matchSeed: core.matchSeed,
      opponent: {
        id: 'pa2c-opponent',
        displayName: 'PA2c opponent',
        portraitKey: 'pa2c-portrait',
        appearanceKey: 'pa2c-appearance',
      },
    },
  });
  session.start();
  session.setPaused(true);
  const paused = reader.read();
  assert.equal(core.tick, 0);
  session.stepWithLegacySnapshotForAudit(null);
  assert.strictEqual(reader.read(), paused);
  session.setPaused(false);
  assert.strictEqual(reader.read(), paused);
  session.destroy();
  assert.throws(() => reader.read(), /失效|销毁|owner/i);
  core.destroy();
});

test('PA2c read-frame readers preserve events, Replay metadata, state hash and checkpoint parity', () => {
  const control = ordinaryCore({ hardLimitTicks: 5, suddenDeathStartTick: 2 });
  const observed = ordinaryCore({ hardLimitTicks: 5, suddenDeathStartTick: 2 });
  const binding = bind(observed);
  const reader = observed.createMatchReadFrameReader(binding, 'player-1');
  const controlRunner = new HeadlessMatchRunner(control);
  const observedRunner = new HeadlessMatchRunner(observed);
  for (let index = 0; index < 6 && control.phase !== 'ended'; index += 1) {
    const input = control.config.participantIds.map((participantId) => (
      createNeutralInputFrame(control.tick, participantId)
    ));
    const controlEvents = controlRunner.step(input);
    const observedEvents = observedRunner.step(input);
    const frame = reader.read();
    assert.deepEqual(observedEvents, controlEvents);
    assert.equal(observed.getStateHash(), control.getStateHash());
    assert.deepEqual(observed.getInternalCheckpointIdentity(), control.getInternalCheckpointIdentity());
    assert.deepEqual(observed.getReplayMetadata(), control.getReplayMetadata());
    assert.equal(frame.worldSnapshot.tick, observed.tick);
    assert.equal(frame.localActionSidecar.eventSequence, observed.getLegacyFullSnapshotForAudit().eventSequence);
  }
  assert.deepEqual(observedRunner.exportReplay(), controlRunner.exportReplay());
  controlRunner.destroy();
  observedRunner.destroy();
  control.destroy();
  observed.destroy();
});
