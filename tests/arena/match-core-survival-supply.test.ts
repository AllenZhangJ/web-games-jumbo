import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_MATCH_EVENT,
  ARENA_REPLAY_SCHEMA_VERSION,
  ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION,
  HeadlessMatchRunner,
  createMatchStateHash,
  createReplayMatch,
  restoreMatchCoreFromCheckpoint,
  type ArenaAuthorityEvent,
  type ArenaInternalMatchCheckpoint,
  type InternalCheckpointCoreFactoryOptions,
  type MatchCore,
} from '@number-strategy-jump/arena-match';
import {
  createArenaV1MatchCore,
  createArenaV2SurvivalSupplyMatchCore,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import {
  assertArenaPublicSupplyProjectionResyncReady,
  createNeutralInputFrame,
} from '@number-strategy-jump/arena-contracts';

const SURVIVAL_ARENA = Object.freeze({
  killY: -4,
  surfaces: Object.freeze([Object.freeze({
    id: 'survival-platform',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 4, y: 0.5, z: 4 }),
  })]),
  spawns: Object.freeze([
    Object.freeze({ x: -1, y: 1, z: 0 }),
    Object.freeze({ x: 1, y: 1, z: 0 }),
  ]),
});

const SUPPLY = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  spawnSpecs: Object.freeze([
    Object.freeze({
      slotId: 'left',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
      spawnId: 'survival-left',
      position: Object.freeze({ x: -1, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'right',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
      spawnId: 'survival-right',
      position: Object.freeze({ x: 1, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'spare',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
      spawnId: 'survival-spare',
      position: Object.freeze({ x: 3, y: 1, z: 0 }),
    }),
  ]),
});

function createSurvivalCore(seed = 901, hardLimitTicks = 2_700): MatchCore {
  return createArenaV2SurvivalSupplyMatchCore({
    seed,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: hardLimitTicks - 100,
      hardLimitTicks,
      arena: SURVIVAL_ARENA,
    },
    supply: SUPPLY,
  });
}

function neutralFrames(core: MatchCore, primaryParticipantId: string | null = null) {
  return core.config.participantIds.map((participantId) => ({
    ...createNeutralInputFrame(core.tick, participantId),
    primaryPressed: participantId === primaryParticipantId,
  }));
}

function stepTo(core: MatchCore, targetTick: number, primaryParticipantId: string | null = null) {
  let targetEvents: readonly ArenaAuthorityEvent[] = [];
  while (core.tick <= targetTick) {
    const events = core.step(neutralFrames(
      core,
      core.tick === targetTick ? primaryParticipantId : null,
    ));
    if (core.tick === targetTick + 1) targetEvents = events;
  }
  return targetEvents;
}

function eventTypes(events: readonly ArenaAuthorityEvent[]): string[] {
  return events.map(({ type }) => type);
}

function mutableCheckpoint(
  checkpoint: ArenaInternalMatchCheckpoint,
): Record<string, unknown> {
  return structuredClone(checkpoint) as unknown as Record<string, unknown>;
}

interface CleanupFailure extends Error {
  readonly originalError?: unknown;
  readonly cleanupErrors: readonly Error[];
}

function requireCleanupFailure(error: unknown): CleanupFailure {
  assert.ok(error instanceof Error);
  const cleanupErrors = Reflect.get(error, 'cleanupErrors');
  assert.ok(Array.isArray(cleanupErrors));
  return error as CleanupFailure;
}

function survivalCoreFactory({ seed, config }: { seed: number; config: unknown }): MatchCore {
  return createArenaV2SurvivalSupplyMatchCore({ seed, config, supply: SUPPLY });
}

test('explicit survival composition owns spawn-expire-pickup-action order in production MatchCore', () => {
  const core = createSurvivalCore();
  const wave = stepTo(core, 1_200, 'player-1');
  assert.deepEqual(eventTypes(wave).slice(0, 5), [
    ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED,
    ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED,
    ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED,
    ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP,
    ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP,
  ]);
  const spawnPayload = Reflect.get(wave[0] ?? {}, 'payload');
  assert.equal(Reflect.get(spawnPayload, 'schemaVersion'), 1);
  assert.equal(Reflect.get(spawnPayload, 'tick'), 1_200);
  const actionIndex = eventTypes(wave).indexOf(ARENA_MATCH_EVENT.ACTION_STARTED);
  assert.ok(actionIndex > eventTypes(wave).lastIndexOf(ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP));
  assert.equal(core.getLegacyFullSnapshotForAudit().participants[0]?.equipment?.definitionId, STAGE4_EQUIPMENT_ID.HAMMER);

  const expiry = stepTo(core, 1_800);
  assert.deepEqual(eventTypes(expiry), [ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED]);
  assert.equal(Reflect.get(Reflect.get(expiry[0] ?? {}, 'payload'), 'tick'), 1_800);
  assert.equal(core.getLegacyFullSnapshotForAudit().participants.filter(({ equipment }) => equipment !== null).length, 2);

  const replacement = stepTo(core, 2_400);
  const types = eventTypes(replacement);
  assert.deepEqual(types.slice(0, 3), Array(3).fill(ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED));
  assert.equal(types.filter((type) => type === ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED).length, 2);
  assert.equal(types.filter((type) => type === ARENA_MATCH_EVENT.EQUIPMENT_REPLACED).length, 2);
  for (const participant of core.getLegacyFullSnapshotForAudit().participants) assert.ok(participant.equipment);
  core.destroy();
});

test('two-player contest is invariant to input order and supply state changes only survival hash', () => {
  const contestArena = {
    ...SURVIVAL_ARENA,
    spawns: [{ x: -0.4, y: 1, z: 0 }, { x: 0.4, y: 1, z: 0 }],
  };
  const contestSupply = {
    ...SUPPLY,
    spawnSpecs: SUPPLY.spawnSpecs.map((spec, index) => ({
      ...spec,
      position: index === 0
        ? { x: 0, y: 1, z: 0 }
        : { x: index === 1 ? 3 : -3, y: 1, z: 0 },
    })),
  };
  const createContest = () => createArenaV2SurvivalSupplyMatchCore({
    seed: 902,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 1_400,
      hardLimitTicks: 1_500,
      arena: contestArena,
    },
    supply: contestSupply,
  });
  const first = createContest();
  const second = createContest();
  let contestedEvents: readonly ArenaAuthorityEvent[] = [];
  while (first.tick <= 1_200) {
    const frames = neutralFrames(first);
    const left = first.step(frames);
    const right = second.step([...frames].reverse());
    assert.deepEqual(right, left);
    assert.equal(second.getStateHash(), first.getStateHash());
    if (first.tick === 1_201) contestedEvents = left;
  }
  assert.equal(
    eventTypes(contestedEvents).filter((type) => type === ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP).length,
    1,
  );
  const ordinary = createArenaV1MatchCore({
    seed: 902,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 1_400,
      hardLimitTicks: 1_500,
      arena: contestArena,
      equipment: { initialSpawns: [] },
    },
  });
  assert.notEqual(first.ruleContentHash, ordinary.ruleContentHash);
  first.destroy();
  second.destroy();
  ordinary.destroy();
});

test('Replay V5 reconstructs survival supply from initial composition and inputs', () => {
  const core = createSurvivalCore(903, 1_850);
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 60 });
  const replay = runner.runLegacyUntilEndedForAudit((snapshot) => snapshot.participants.map(({ id }) => (
    createNeutralInputFrame(snapshot.tick, id)
  )));
  assert.equal(replay.replaySchemaVersion, ARENA_REPLAY_SCHEMA_VERSION);
  assert.ok(replay.events.some(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED));
  assert.ok(replay.events.some(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED));
  const replaySurvival = createReplayMatch(({ seed, config }) => (
    createArenaV2SurvivalSupplyMatchCore({ seed, config, supply: SUPPLY })
  ));
  const result = replaySurvival(replay);
  assert.equal(result.finalHash, replay.finalHash);
  assert.deepEqual(result.events, replay.events);
  core.destroy();
});

test('survival composition rejects parallel initial authority and invalid map positions', () => {
  assert.throws(() => createArenaV2SurvivalSupplyMatchCore({
    config: {
      arena: SURVIVAL_ARENA,
      equipment: { initialSpawns: [{ id: 'legacy', definitionId: STAGE4_EQUIPMENT_ID.HAMMER }] },
    },
    supply: SUPPLY,
  }), /禁止并行 initialSpawns authority/);
  assert.throws(() => createArenaV2SurvivalSupplyMatchCore({
    config: { arena: SURVIVAL_ARENA },
    supply: {
      ...SUPPLY,
      spawnSpecs: SUPPLY.spawnSpecs.map((spec, index) => index === 0
        ? { ...spec, position: { x: 99, y: 1, z: 0 } }
        : spec),
    },
  }), /不在合法地图表面/);
  assert.throws(() => createArenaV2SurvivalSupplyMatchCore({
    config: {
      arena: SURVIVAL_ARENA,
      preparingTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick + 1,
    },
    supply: SUPPLY,
  }), /preparingTicks 不能晚于首波供给/);
});

test('internal checkpoint restores every survival authority boundary before publishing Core', () => {
  const source = createSurvivalCore(904, 2_500);
  const runner = new HeadlessMatchRunner(source, { checkpointInterval: 60 });
  const checkpointTicks = new Set([0, 1_199, 1_200, 1_201, 1_202, 1_800, 1_801, 1_802, 2_401]);
  const checkpoints = new Map<number, ArenaInternalMatchCheckpoint>();
  checkpoints.set(0, runner.exportInternalCheckpoint());
  while (source.tick < 2_401) {
    runner.step(neutralFrames(
      source,
      source.tick === 1_200 || source.tick === 2_400 ? 'player-1' : null,
    ));
    if (checkpointTicks.has(source.tick)) {
      checkpoints.set(source.tick, runner.exportInternalCheckpoint());
    }
  }
  for (const tick of checkpointTicks) {
    const checkpoint = checkpoints.get(tick);
    assert.ok(checkpoint, `缺少 tick ${tick} checkpoint`);
    const restored = restoreMatchCoreFromCheckpoint(checkpoint, {
      coreFactory: survivalCoreFactory,
    });
    assert.equal(restored.tick, source.tick === tick ? source.tick : tick);
    assert.equal(restored.getStateHash(), checkpoint.stateHash);
    assert.equal(restored.getInternalCheckpointIdentity().eventSequence, checkpoint.eventSequence);
    restored.destroy();
  }

  const resumed = restoreMatchCoreFromCheckpoint(checkpoints.get(2_401), {
    coreFactory: survivalCoreFactory,
  });
  while (source.phase !== 'ended') {
    const frames = neutralFrames(source);
    const continuousEvents = runner.step(frames);
    const resumedEvents = resumed.step(frames);
    assert.deepEqual(resumedEvents, continuousEvents);
    assert.deepEqual(resumed.getLegacyFullSnapshotForAudit(), source.getLegacyFullSnapshotForAudit());
    assert.equal(resumed.getStateHash(), source.getStateHash());
  }
  const terminal = runner.exportInternalCheckpoint();
  const restoredTerminal = restoreMatchCoreFromCheckpoint(terminal, {
    coreFactory: survivalCoreFactory,
  });
  assert.deepEqual(restoredTerminal.result, source.result);
  assert.equal(restoredTerminal.getStateHash(), source.getStateHash());
  assert.throws(() => restoredTerminal.step(neutralFrames(restoredTerminal)), /已经结束/);
  restoredTerminal.destroy();
  resumed.destroy();
  runner.destroy();
  source.destroy();
});

test('public projection survives +599 checkpoint restore and rejects +600 pre-step resync', () => {
  const noPickupArena = {
    ...SURVIVAL_ARENA,
    spawns: [{ x: -3, y: 1, z: 3 }, { x: 3, y: 1, z: 3 }],
  };
  const source = createArenaV2SurvivalSupplyMatchCore({
    seed: 907,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 2_400,
      hardLimitTicks: 2_500,
      arena: noPickupArena,
    },
    supply: SUPPLY,
  });
  const runner = new HeadlessMatchRunner(source, { checkpointInterval: 60 });
  while (source.tick < 1_799) runner.step(neutralFrames(source));
  const checkpoint599 = runner.exportInternalCheckpoint();
  const restored = restoreMatchCoreFromCheckpoint(checkpoint599, {
    coreFactory: survivalCoreFactory,
  });
  assert.deepEqual(
    restored.getLegacyFullSnapshotForAudit().activeSupplyProjection,
    source.getLegacyFullSnapshotForAudit().activeSupplyProjection,
  );
  assert.deepEqual(
    restored.getLegacyFullSnapshotForAudit().activeSupplyProjection?.supplies.map(({ remainingTicks }) => remainingTicks),
    [1, 1, 1],
  );
  const expectedPendingExpiryIds = SUPPLY.spawnSpecs
    .map(({ slotId }) => (
      `${SUPPLY.supplyDefinitionId}:wave-0:slot-${slotId}:equipment`
    ))
    .sort();
  const preExpiry599 = source.getLegacyFullSnapshotForAudit();
  assert.equal(preExpiry599.tick, 1_799);
  assert.equal(preExpiry599.equipment.length, 3);
  assert.deepEqual(preExpiry599.activeSupplyProjection?.pendingExpiryEquipmentInstanceIds, []);

  const beforeExpiry = runner.step(neutralFrames(source));
  const restoredBeforeExpiry = restored.step(neutralFrames(restored));
  assert.deepEqual(restoredBeforeExpiry, beforeExpiry);
  const preStep = source.getLegacyFullSnapshotForAudit();
  assert.equal(preStep.tick, 1_800);
  assert.equal(preStep.activeSupplyProjection?.resyncReadiness, 'not-ready-pre-expiry');
  assert.equal(preStep.activeSupplyProjection?.pendingAuthorityTick, 1_800);
  assert.deepEqual(preStep.equipment, []);
  assert.deepEqual(
    preStep.activeSupplyProjection?.pendingExpiryEquipmentInstanceIds,
    expectedPendingExpiryIds,
  );
  assert.deepEqual(preStep.activeSupplyProjection?.supplies, []);
  assert.throws(() => assertArenaPublicSupplyProjectionResyncReady(
    preStep.activeSupplyProjection,
    { snapshotTick: preStep.tick, eventSequence: preStep.eventSequence, equipment: preStep.equipment },
  ), /不是 resync-ready/);

  const expiry = runner.step(neutralFrames(source));
  const restoredExpiry = restored.step(neutralFrames(restored));
  assert.deepEqual(restoredExpiry, expiry);
  assert.equal(expiry.filter(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED).length, 3);
  assert.deepEqual(
    restored.getLegacyFullSnapshotForAudit().activeSupplyProjection,
    source.getLegacyFullSnapshotForAudit().activeSupplyProjection,
  );
  assert.equal(restored.getLegacyFullSnapshotForAudit().activeSupplyProjection?.resyncReadiness, 'ready');
  assert.equal(source.getLegacyFullSnapshotForAudit().activeSupplyProjection?.pendingAuthorityTick, null);
  assert.deepEqual(source.getLegacyFullSnapshotForAudit().activeSupplyProjection?.pendingExpiryEquipmentInstanceIds, []);
  assert.equal(source.getLegacyFullSnapshotForAudit().equipment.length, 0);
  assert.equal(restored.getLegacyFullSnapshotForAudit().equipment.length, 0);
  assert.deepEqual(restored.getLegacyFullSnapshotForAudit().activeSupplyProjection?.pendingExpiryEquipmentInstanceIds, []);
  assert.deepEqual(restored.getLegacyFullSnapshotForAudit().activeSupplyProjection?.supplies, []);

  const afterExpiry = runner.step(neutralFrames(source));
  const restoredAfterExpiry = restored.step(neutralFrames(restored));
  assert.deepEqual(restoredAfterExpiry, afterExpiry);
  assert.equal(afterExpiry.filter(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED).length, 0);
  assert.equal(afterExpiry.length, 0);
  assert.equal(source.getLegacyFullSnapshotForAudit().tick, 1_802);
  assert.equal(source.getLegacyFullSnapshotForAudit().equipment.length, 0);
  assert.equal(source.getLegacyFullSnapshotForAudit().activeSupplyProjection?.resyncReadiness, 'ready');
  assert.equal(source.getLegacyFullSnapshotForAudit().activeSupplyProjection?.pendingAuthorityTick, null);
  assert.deepEqual(source.getLegacyFullSnapshotForAudit().activeSupplyProjection?.pendingExpiryEquipmentInstanceIds, []);
  assert.deepEqual(source.getLegacyFullSnapshotForAudit().activeSupplyProjection?.supplies, []);
  restored.destroy();
  runner.destroy();
  source.destroy();
});

test('future-affecting expired-held disposition is versioned and participates in state hash', () => {
  const core = createSurvivalCore(9_901, 2_500);
  const publicSnapshot = core.getLegacyFullSnapshotForAudit();
  const timeline = Object.freeze({
    schemaVersion: 1,
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    nextTick: 1_200,
    activeSupplies: Object.freeze([]),
  });
  const dispositionId = `${ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id}:wave-0:slot-left:equipment`;
  const secondDispositionId = `${ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id}:wave-0:slot-right:equipment`;
  const heldRuntime = Object.freeze({
    schemaVersion: 1,
    instanceId: dispositionId,
    definitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'survival-left',
    locationState: 'held',
    ownerId: 'player-1',
    position: null,
    originPosition: { x: -1, y: 1, z: 0 },
    lastSafePosition: { x: -1, y: 1, z: 0 },
    cooldownRemainingTicks: 0,
    revision: 1,
  });
  const secondHeldRuntime = Object.freeze({
    ...heldRuntime,
    instanceId: secondDispositionId,
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'survival-right',
    ownerId: 'player-2',
    originPosition: { x: 1, y: 1, z: 0 },
    lastSafePosition: { x: 1, y: 1, z: 0 },
  });
  const base = {
    ...publicSnapshot,
    participants: Object.freeze(publicSnapshot.participants.map((participant, index) => (
      index === 0
        ? Object.freeze({
          ...participant,
          equipment: Object.freeze({
            instanceId: dispositionId,
            definitionId: STAGE4_EQUIPMENT_ID.HAMMER,
            cooldownRemainingTicks: 0,
          }),
        })
        : index === 1
          ? Object.freeze({
            ...participant,
            equipment: Object.freeze({
              instanceId: secondDispositionId,
              definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
              cooldownRemainingTicks: 0,
            }),
          })
          : participant
    ))),
    equipment: Object.freeze([heldRuntime, secondHeldRuntime]),
    rngStates: Object.freeze({}),
    equipmentSupplyTimeline: timeline,
  };
  const emptyDisposition = {
    schemaVersion: ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION,
    expiredHeldSupplyEquipmentInstanceIds: Object.freeze([]),
  } as const;
  const expiredDisposition = {
    schemaVersion: ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION,
    expiredHeldSupplyEquipmentInstanceIds: Object.freeze([
      dispositionId,
    ]),
  } as const;
  const emptyHash = createMatchStateHash({
    ...base,
    equipmentSupplyDisposition: emptyDisposition,
  });
  const expiredHash = createMatchStateHash({
    ...base,
    equipmentSupplyDisposition: expiredDisposition,
  });
  assert.notEqual(emptyHash, expiredHash);
  assert.throws(() => createMatchStateHash({
    ...base,
    equipmentSupplyDisposition: {
      schemaVersion: 2,
      expiredHeldSupplyEquipmentInstanceIds: [],
    },
  } as unknown as Parameters<typeof createMatchStateHash>[0]), /disposition/);
  assert.throws(() => createMatchStateHash({
    ...base,
    equipmentSupplyDisposition: {
      schemaVersion: ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION,
      expiredHeldSupplyEquipmentInstanceIds: [secondDispositionId, dispositionId],
    },
  }), /排序|唯一/);
  assert.throws(() => createMatchStateHash({
    ...base,
    equipmentSupplyDisposition: {
      schemaVersion: ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION,
      expiredHeldSupplyEquipmentInstanceIds: [
        `${ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id}:wave-0:slot-ghost:equipment`,
      ],
    },
  }), /held runtime/);
  assert.throws(() => createMatchStateHash({
    ...base,
    equipmentSupplyDisposition: {
      schemaVersion: ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION,
      expiredHeldSupplyEquipmentInstanceIds: [dispositionId, secondDispositionId, 'overflow'],
    },
  } as unknown as Parameters<typeof createMatchStateHash>[0]), /participant 数量/);
  core.destroy();
});

test('internal checkpoint rejects schema, identity, cursor, input, event and map tampering atomically', () => {
  const source = createSurvivalCore(905, 1_850);
  const runner = new HeadlessMatchRunner(source, { checkpointInterval: 60 });
  while (source.tick < 1_201) runner.step(neutralFrames(source));
  const checkpoint = runner.exportInternalCheckpoint();

  let factoryCalls = 0;
  const future = mutableCheckpoint(checkpoint);
  future.checkpointSchemaVersion = 2;
  assert.throws(() => restoreMatchCoreFromCheckpoint(future, {
    coreFactory(options: InternalCheckpointCoreFactoryOptions) {
      factoryCalls += 1;
      return survivalCoreFactory(options);
    },
  }), /checkpoint schema 2/);
  assert.equal(factoryCalls, 0);
  const extended = mutableCheckpoint(checkpoint);
  extended.futureField = true;
  assert.throws(() => restoreMatchCoreFromCheckpoint(extended, {
    coreFactory: survivalCoreFactory,
  }), /不支持字段 futureField/);

  for (const [name, mutate, pattern] of [
    ['unsafe tick', (value: Record<string, unknown>) => { value.tick = Number.MAX_SAFE_INTEGER + 1; }, /安全整数/],
    ['match schema', (value: Record<string, unknown>) => { value.matchSchemaVersion = 999; }, /match schema/],
    ['physics backend', (value: Record<string, unknown>) => { value.physicsBackendVersion = 'future-physics'; }, /physics backend/],
    ['config hash', (value: Record<string, unknown>) => { value.configHash = '00000000'; }, /config hash/],
    ['state hash', (value: Record<string, unknown>) => { value.stateHash = '00000000'; }, /state hash/],
    ['rule hash', (value: Record<string, unknown>) => { value.ruleContentHash = '00000000'; }, /rule content hash/],
    ['seed', (value: Record<string, unknown>) => { value.matchSeed = 906; }, /稳定身份|match seed/],
    ['cursor', (value: Record<string, unknown>) => { value.eventSequence = Number(value.eventSequence) + 1; }, /eventSequence/],
  ] as const) {
    const tampered = mutableCheckpoint(checkpoint);
    mutate(tampered);
    assert.throws(() => restoreMatchCoreFromCheckpoint(tampered, {
      coreFactory: survivalCoreFactory,
    }), pattern, name);
  }

  const participantConflict = mutableCheckpoint(checkpoint);
  const participantConfig = participantConflict.config as Record<string, unknown>;
  participantConfig.participantIds = ['player-1', 'player-3'];
  assert.throws(() => restoreMatchCoreFromCheckpoint(participantConflict, {
    coreFactory: survivalCoreFactory,
  }), /participant|config hash/);

  const badInput = mutableCheckpoint(checkpoint);
  const inputFrames = badInput.inputFrames as Array<Record<string, unknown>>;
  assert.ok(inputFrames[0]);
  inputFrames[0]!.moveX = Number.POSITIVE_INFINITY;
  assert.throws(() => restoreMatchCoreFromCheckpoint(badInput, {
    coreFactory: survivalCoreFactory,
  }), /有限|finite/);

  const badEvent = mutableCheckpoint(checkpoint);
  const events = badEvent.events as Array<Record<string, unknown>>;
  assert.ok(events[0]);
  events[0]!.futurePayload = 'tampered';
  assert.throws(() => restoreMatchCoreFromCheckpoint(badEvent, {
    coreFactory: survivalCoreFactory,
  }), /事件前缀/);

  let rejectedCandidate: MatchCore | null = null;
  assert.throws(() => restoreMatchCoreFromCheckpoint(checkpoint, {
    coreFactory({ seed, config }: InternalCheckpointCoreFactoryOptions) {
      rejectedCandidate = createArenaV2SurvivalSupplyMatchCore({
        seed,
        config,
        supply: {
          ...SUPPLY,
          spawnSpecs: SUPPLY.spawnSpecs.map((spec, index) => index === 0
            ? { ...spec, spawnId: 'conflicting-map-supply-identity' }
            : spec),
        },
      });
      return rejectedCandidate;
    },
  }), /rule content hash/);
  assert.ok(rejectedCandidate);
  assert.throws(() => rejectedCandidate?.getLegacyFullSnapshotForAudit(), /已销毁/);
  runner.destroy();
  source.destroy();
});

test('checkpoint bounds invalid Core cleanup and preserves the factory contract as primary failure', () => {
  const source = createSurvivalCore(909, 1_850);
  const runner = new HeadlessMatchRunner(source, { checkpointInterval: 60 });
  const checkpoint = runner.exportInternalCheckpoint();

  const rejectCandidate = (candidate: unknown): CleanupFailure => {
    let thrown: unknown;
    try {
      restoreMatchCoreFromCheckpoint(checkpoint, { coreFactory: () => candidate });
    } catch (error) {
      thrown = error;
    }
    const failure = requireCleanupFailure(thrown);
    assert.ok(failure.originalError instanceof Error);
    assert.match(failure.originalError.message, /coreFactory 必须返回 MatchCore/);
    assert.equal(failure.cleanupErrors.length, 1);
    return failure;
  };

  const cyclicTarget = Object.create(null) as object;
  let cyclicCandidate: object;
  cyclicCandidate = new Proxy(cyclicTarget, {
    getPrototypeOf() {
      return cyclicCandidate;
    },
  });
  assert.match(
    rejectCandidate(cyclicCandidate).cleanupErrors[0]?.message ?? '',
    /prototype 链不能循环/,
  );

  let tooDeepCandidate = Object.create(null) as object;
  for (let depth = 0; depth < 33; depth += 1) {
    tooDeepCandidate = Object.create(tooDeepCandidate) as object;
  }
  assert.match(
    rejectCandidate(tooDeepCandidate).cleanupErrors[0]?.message ?? '',
    /prototype 链超过 32 层/,
  );

  let destroyGetterCalls = 0;
  const accessorCandidate = Object.defineProperty({}, 'destroy', {
    enumerable: true,
    get() {
      destroyGetterCalls += 1;
      throw new Error('destroy getter must not execute');
    },
  });
  assert.match(
    rejectCandidate(accessorCandidate).cleanupErrors[0]?.message ?? '',
    /destroy必须是数据方法/,
  );
  assert.equal(destroyGetterCalls, 0);

  let destroyCalls = 0;
  let hostileThenCalls = 0;
  assert.match(
    rejectCandidate({
      destroy() {
        destroyCalls += 1;
        return {
          then() {
            hostileThenCalls += 1;
            throw new Error('hostile cleanup then must not execute');
          },
        };
      },
    }).cleanupErrors[0]?.message ?? '',
    /destroy必须同步完成/,
  );
  assert.equal(destroyCalls, 1);
  assert.equal(hostileThenCalls, 0);

  let dataThenDestroyCalls = 0;
  assert.match(
    rejectCandidate({
      destroy() {
        dataThenDestroyCalls += 1;
        return Object.freeze({ then: null });
      },
    }).cleanupErrors[0]?.message ?? '',
    /destroy.*then字段.*同步完成/,
  );
  assert.equal(dataThenDestroyCalls, 1);

  let customConstructorThenCalls = 0;
  assert.match(
    rejectCandidate({
      destroy: () => ({
        constructor: function UnsafePromiseSubclass() {},
        then() {
          customConstructorThenCalls += 1;
        },
      }),
    }).cleanupErrors[0]?.message ?? '',
    /destroy必须同步完成/,
  );
  assert.equal(customConstructorThenCalls, 0);

  assert.match(
    rejectCandidate({ destroy: () => Promise.resolve() }).cleanupErrors[0]?.message ?? '',
    /destroy必须同步完成/,
  );

  let thenGetterCalls = 0;
  const accessorThenResult = Object.defineProperty({}, 'then', {
    enumerable: true,
    get() {
      thenGetterCalls += 1;
      throw new Error('cleanup then getter must not execute');
    },
  });
  assert.match(
    rejectCandidate({ destroy: () => accessorThenResult }).cleanupErrors[0]?.message ?? '',
    /访问器 thenable/,
  );
  assert.equal(thenGetterCalls, 0);

  let constructorGetterCalls = 0;
  const promiseWithHostileConstructor = Promise.resolve();
  Object.defineProperty(promiseWithHostileConstructor, 'constructor', {
    enumerable: true,
    get() {
      constructorGetterCalls += 1;
      throw new Error('Promise constructor getter must not execute');
    },
  });
  assert.match(
    rejectCandidate({ destroy: () => promiseWithHostileConstructor })
      .cleanupErrors[0]?.message ?? '',
    /访问器 constructor/,
  );
  assert.equal(constructorGetterCalls, 0);

  const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
  assert.ok(speciesDescriptor);
  let speciesGetterCalls = 0;
  const resolvedPromise = Promise.resolve();
  Object.defineProperty(Promise, Symbol.species, {
    ...speciesDescriptor,
    get() {
      speciesGetterCalls += 1;
      return Promise;
    },
  });
  try {
    assert.match(
      rejectCandidate({ destroy: () => resolvedPromise }).cleanupErrors[0]?.message ?? '',
      /Promise\[Symbol\.species\] 描述符漂移/,
    );
    assert.equal(speciesGetterCalls, 0);
  } finally {
    Object.defineProperty(Promise, Symbol.species, speciesDescriptor);
  }

  let getPrototypeOfCalls = 0;
  const throwingPrototypeCandidate = new Proxy(Object.create(null) as object, {
    getPrototypeOf() {
      getPrototypeOfCalls += 1;
      throw new Error('hostile getPrototypeOf failure');
    },
  });
  const trapFailure = rejectCandidate(throwingPrototypeCandidate);
  assert.equal(getPrototypeOfCalls, 1);
  assert.match(
    trapFailure.cleanupErrors[0]?.message ?? '',
    /hostile getPrototypeOf failure/,
  );

  runner.destroy();
  source.destroy();
});

test('checkpoint continuation preserves elimination and terminal result boundaries', () => {
  const eliminationArena = {
    ...SURVIVAL_ARENA,
    killY: -3,
    spawns: [{ x: -0.55, y: 1, z: 0 }, { x: 0.55, y: 1, z: 0 }],
  };
  const config = {
    arena: eliminationArena,
    preparingTicks: 0,
    livesPerParticipant: 1,
    suddenDeathStartTick: 1_300,
    hardLimitTicks: 1_400,
    basePush: {
      range: 2,
      windupTicks: 1,
      activeTicks: 2,
      recoveryTicks: 2,
      horizontalImpulse: 16,
      verticalImpulse: 3,
      hitstunTicks: 6,
    },
  };
  const createCore = ({ seed, config: restoredConfig }: InternalCheckpointCoreFactoryOptions) => (
    createArenaV2SurvivalSupplyMatchCore({ seed, config: restoredConfig, supply: SUPPLY })
  );
  const source = createArenaV2SurvivalSupplyMatchCore({ seed: 906, config, supply: SUPPLY });
  const runner = new HeadlessMatchRunner(source, { checkpointInterval: 20 });
  runner.step(neutralFrames(source, 'player-1'));
  const checkpoint = runner.exportInternalCheckpoint();
  const restored = restoreMatchCoreFromCheckpoint(checkpoint, { coreFactory: createCore });
  const continuousEvents: ArenaAuthorityEvent[] = [];
  const restoredEvents: ArenaAuthorityEvent[] = [];
  for (let index = 0; index < 240 && source.phase !== 'ended'; index += 1) {
    const values = neutralFrames(source);
    continuousEvents.push(...runner.step(values));
    restoredEvents.push(...restored.step(values));
    assert.equal(restored.getStateHash(), source.getStateHash());
  }
  assert.equal(source.phase, 'ended');
  assert.ok(continuousEvents.some(({ type }) => type === ARENA_MATCH_EVENT.PLAYER_ELIMINATED));
  assert.deepEqual(restoredEvents, continuousEvents);
  assert.deepEqual(restored.result, source.result);
  restored.destroy();
  runner.destroy();
  source.destroy();
});
