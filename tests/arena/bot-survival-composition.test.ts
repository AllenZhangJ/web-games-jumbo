import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOT_PROFILE_REGISTRY,
  BotController,
  BotProfileRegistry,
  cloneBotSourceSnapshot,
  createBotArenaView,
  createBotObservation,
  createBotProfileDefinition,
  selectHighestUtility,
  getArenaBotEvaluators,
} from '@number-strategy-jump/arena-bot';
import {
  ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS,
  createDeterministicDataHash,
  createNeutralInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_EVENT,
  assertMatchCoreTrustedPublicSnapshotReader,
  type ArenaAuthorityEvent,
  type MatchCore,
} from '@number-strategy-jump/arena-match';
import {
  createArenaV2SurvivalSupplyBotSession,
  createArenaV2SurvivalSupplyMatchCore,
} from '@number-strategy-jump/arena-v1-composition';
import { createTrustedBotSourceSnapshot } from '../../packages/arena-bot/src/bot-observation.js';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';

const SURVIVAL_ARENA = Object.freeze({
  killY: -4,
  surfaces: Object.freeze([Object.freeze({
    id: 'survival-bot-platform',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 4, y: 0.5, z: 4 }),
  })]),
  spawns: Object.freeze([
    Object.freeze({ x: -1, y: 1, z: 0 }),
    Object.freeze({ x: 1, y: 1, z: 0 }),
  ]),
});

const EMPTY_SLOT_SURVIVAL_ARENA = Object.freeze({
  killY: -4,
  surfaces: Object.freeze([Object.freeze({
    id: 'survival-bot-platform-wide',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 10, y: 0.5, z: 4 }),
  })]),
  spawns: Object.freeze([
    Object.freeze({ x: 0, y: 1, z: 0 }),
    Object.freeze({ x: 8, y: 1, z: 0 }),
  ]),
});

const SUPPLY = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  spawnSpecs: Object.freeze([
    Object.freeze({
      slotId: 'left',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
      spawnId: 'survival-bot-left',
      position: Object.freeze({ x: -3, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'center',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
      spawnId: 'survival-bot-center',
      position: Object.freeze({ x: 0, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'right',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
      spawnId: 'survival-bot-right',
      position: Object.freeze({ x: 3, y: 1, z: 0 }),
    }),
  ]),
});

const BOT_PROFILE = createBotProfileDefinition({
  ...BOT_PROFILE_REGISTRY.require('easy'),
  id: 'survival-rush',
  actionCommitChance: 0,
});
const SURVIVAL_BOT_REGISTRY = new BotProfileRegistry([BOT_PROFILE]);
const SUPPLY_PROJECTION_CONTRACT = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  firstSpawnTick: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick,
  spawnIntervalTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnIntervalTicks,
  spawnCount: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnCount,
  lifetimeTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.lifetimeTicks,
  spawnSpecs: SUPPLY.spawnSpecs,
  equipmentDefinitionIds: Object.freeze([...new Set(SUPPLY.spawnSpecs.map(({ equipmentDefinitionId }) => (
    equipmentDefinitionId
  )))]),
});

function createTrustedBinding(core: MatchCore): object {
  return Object.freeze({
    contractHash: createDeterministicDataHash(
      SUPPLY_PROJECTION_CONTRACT,
      'formal survival Bot trusted contract',
    ),
    authorityContentHash: core.getReplayMetadata().ruleContentHash,
  });
}

function createSurvivalCore(
  seed = 1201,
  hardLimitTicks = 1_850,
  arena: unknown = SURVIVAL_ARENA,
): MatchCore {
  return createArenaV2SurvivalSupplyMatchCore({
    seed,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: hardLimitTicks - 100,
      hardLimitTicks,
      arena,
    },
    supply: SUPPLY,
  });
}

function neutralFrames(core: MatchCore): readonly unknown[] {
  return core.config.participantIds.map((participantId) => (
    createNeutralInputFrame(core.tick, participantId)
  ));
}

function publicMatchInfo(seed: number) {
  return {
    matchSeed: seed,
    opponent: {
      id: 'survival-bot',
      displayName: 'Survival Bot',
      portraitKey: 'test-portrait',
      appearanceKey: 'test-appearance',
    },
  } as const;
}

function createBotSession(seed: number, hardLimitTicks = 1_250) {
  return createArenaV2SurvivalSupplyBotSession({
    seed,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: hardLimitTicks - 100,
      hardLimitTicks,
      arena: SURVIVAL_ARENA,
    },
    supply: SUPPLY,
    bot: {
      participantId: 'player-2',
      difficultyId: 'survival-rush',
      behaviorSeed: 0x10203040,
      personalitySeed: 0x50607080,
      profileRegistry: SURVIVAL_BOT_REGISTRY,
    },
    publicMatchInfo: publicMatchInfo(seed),
  });
}

function stepTo(core: MatchCore, targetTick: number): readonly ArenaAuthorityEvent[] {
  let result: readonly ArenaAuthorityEvent[] = [];
  while (core.tick <= targetTick) {
    result = core.step(neutralFrames(core));
  }
  return result;
}

test('survival public snapshots publish a bound active-supply projection without zero-tick items', () => {
  const core = createSurvivalCore();
  try {
    stepTo(core, 1_200);
    const afterSpawn = core.getSnapshot();
    const world = afterSpawn.equipment.filter(({ locationState }) => (
      locationState === 'spawned' || locationState === 'dropped'
    ));
    assert.equal(afterSpawn.tick, 1_201);
    assert.equal(world.length, 3);
    const projection = afterSpawn.activeSupplyProjection;
    assert.ok(projection);
    assert.equal(projection.snapshotTick, afterSpawn.tick);
    assert.equal(projection.snapshotEventSequence, afterSpawn.eventSequence);
    assert.deepEqual(projection.supplies.map(({ remainingTicks }) => remainingTicks), [599, 599, 599]);
    assert.deepEqual(
      projection.supplies.map(({ equipmentInstanceId, equipmentDefinitionId }) => ({
        equipmentInstanceId,
        equipmentDefinitionId,
      })),
      world.map(({ instanceId, definitionId }) => ({
        equipmentInstanceId: instanceId,
        equipmentDefinitionId: definitionId,
      })),
    );

    const delayed = cloneBotSourceSnapshot(afterSpawn);
    assert.deepEqual(delayed.equipment.map(({ remainingTicks }) => remainingTicks), [599, 599, 599]);
    core.step(neutralFrames(core));
    const command = cloneBotSourceSnapshot(core.getSnapshot());
    const observation = createBotObservation({
      // Exercise the public normalized BotSourceSnapshot contract after
      // structuredClone removes WeakSet provenance.
      commandSnapshot: structuredClone(command),
      delayedSnapshot: structuredClone(delayed),
      selfId: 'player-2',
      arena: createBotArenaView(core.config.arena, core.getCharacterDefinition('player-2').collision.radius),
    });
    assert.equal(observation.commandTick, 1_202);
    assert.equal(observation.observedTick, 1_201);
    assert.deepEqual(observation.equipment.map(({ remainingTicks }) => remainingTicks), [599, 599, 599]);

    stepTo(core, 1_798);
    const lastInteractiveTick = core.getSnapshot();
    assert.equal(lastInteractiveTick.tick, 1_799);
    assert.deepEqual(
      lastInteractiveTick.activeSupplyProjection?.supplies.map(({ remainingTicks }) => remainingTicks),
      [1, 1, 1],
    );
    stepTo(core, 1_799);
    const atExpiryTick = core.getSnapshot();
    assert.equal(atExpiryTick.tick, 1_800);
    assert.deepEqual(atExpiryTick.activeSupplyProjection?.supplies, []);
    assert.equal(atExpiryTick.equipment.length, 0);
    const expiryEvents = core.step(neutralFrames(core));
    assert.equal(
      expiryEvents.filter(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED).length,
      3,
    );
    assert.equal(core.getSnapshot().equipment.length, 0);
    assert.deepEqual(core.getSnapshot().activeSupplyProjection?.supplies, []);
  } finally {
    core.destroy();
  }
});

test('normalized BotSourceSnapshot rejects lifecycle fields without projection and pending/world overlap', () => {
  const core = createSurvivalCore(1206, 1_850);
  try {
    stepTo(core, 1_200);
    const source = cloneBotSourceSnapshot(core.getSnapshot());
    const withoutProjection = structuredClone(source) as unknown as Record<string, unknown>;
    delete withoutProjection.activeSupplyProjection;
    assert.throws(() => createBotObservation({
      commandSnapshot: withoutProjection,
      delayedSnapshot: withoutProjection,
      selfId: 'player-2',
      arena: createBotArenaView(
        core.config.arena,
        core.getCharacterDefinition('player-2').collision.radius,
      ),
    }), /remainingTicks 缺少 projection/);

    const pendingOverlap = structuredClone(source) as unknown as {
      activeSupplyProjection: Record<string, unknown>;
      equipment: Array<Record<string, unknown>>;
    };
    const pendingId = pendingOverlap.equipment[0]?.instanceId;
    if (typeof pendingId !== 'string') throw new Error('测试快照缺少供给 equipment。');
    pendingOverlap.activeSupplyProjection.resyncReadiness = 'not-ready-pre-expiry';
    pendingOverlap.activeSupplyProjection.pendingAuthorityTick = source.tick;
    pendingOverlap.activeSupplyProjection.pendingExpiryEquipmentInstanceIds = [pendingId];
    pendingOverlap.activeSupplyProjection.supplies = [];
    assert.throws(() => createBotObservation({
      commandSnapshot: pendingOverlap,
      delayedSnapshot: pendingOverlap,
      selfId: 'player-2',
      arena: createBotArenaView(
        core.config.arena,
        core.getCharacterDefinition('player-2').collision.radius,
      ),
    }), /pending expiry identity 不能出现在 BotVisibleEquipment/);
  } finally {
    core.destroy();
  }
});

test('Bot ignores a world supply omitted at its current-tick expiry boundary', () => {
  const core = createSurvivalCore(1202, 1_850);
  try {
    stepTo(core, 1_799);
    const source = cloneBotSourceSnapshot(core.getSnapshot());
    const observation = createBotObservation({
      commandSnapshot: source,
      delayedSnapshot: source,
      selfId: 'player-2',
      arena: createBotArenaView(core.config.arena, core.getCharacterDefinition('player-2').collision.radius),
    });
    assert.deepEqual(source.activeSupplyProjection?.supplies, []);
    assert.deepEqual(observation.equipment, []);
    const decision = selectHighestUtility(getArenaBotEvaluators(), {
      observation,
      profile: BOT_PROFILE,
      personality: {
        id: 'survivor',
        aggression: 0,
        patience: 1,
        riskTolerance: 0.5,
      },
    });
    assert.notEqual(decision.goalId, 'acquire-equipment');
  } finally {
    core.destroy();
  }
});

test('empty-slot pickup removes the supply from the same public projection immediately', () => {
  const core = createSurvivalCore(1207, 1_850, EMPTY_SLOT_SURVIVAL_ARENA);
  try {
    const events = stepTo(core, 1_200);
    assert.equal(
      events.filter(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP).length,
      1,
    );
    const snapshot = core.getSnapshot();
    const held = snapshot.participants[0]?.equipment;
    assert.ok(held);
    assert.equal(snapshot.activeSupplyProjection?.supplies.length, 2);
    assert.equal(
      snapshot.activeSupplyProjection?.supplies.some(({ equipmentInstanceId }) => (
        equipmentInstanceId === held.instanceId
      )),
      false,
    );
    assert.equal(
      snapshot.equipment.some(({ instanceId, locationState }) => (
        instanceId === held.instanceId && locationState === 'held'
      )),
      true,
    );
  } finally {
    core.destroy();
  }
});

test('formal survival composition injects a validated Profile Registry and only drives a Bot InputFrame', () => {
  const session = createBotSession(1203);
  try {
    session.start();
    const first = session.step(null);
    assert.equal(first.input?.participantId, 'player-1');
    assert.equal(first.snapshot.participants.length, 2);
    session.setPaused(true);
    const paused = session.step(null);
    assert.equal(paused.events.length, 0);
    assert.equal(paused.snapshot.tick, first.snapshot.tick);
    session.setPaused(false);
    const resumed = session.step(null);
    assert.equal(resumed.input?.participantId, 'player-1');
    assert.equal(resumed.snapshot.tick, first.snapshot.tick + 1);
  } finally {
    session.destroy();
    session.destroy();
  }

  assert.throws(() => createArenaV2SurvivalSupplyBotSession({
    seed: 1204,
    config: { preparingTicks: 0, arena: SURVIVAL_ARENA },
    supply: SUPPLY,
    bot: {
      participantId: 'player-2',
      difficultyId: 'missing-profile',
      behaviorSeed: 1,
      personalitySeed: 2,
      profileRegistry: SURVIVAL_BOT_REGISTRY,
    },
    publicMatchInfo: publicMatchInfo(1204),
  }), /未知 Bot Profile/);
});

test('trusted binding errors fail before Bot history/RNG or Core state changes', () => {
  const core = createSurvivalCore(1216, 1_850);
  const otherCore = createSurvivalCore(1217, 1_850);
  const validBinding = createTrustedBinding(core);
  const beforeHash = core.getStateHash();
  const botOptions = (trustedBinding: object) => ({
    participantId: 'player-2',
    difficultyId: 'survival-rush',
    behaviorSeed: 0x10203040,
    personalitySeed: 0x50607080,
    profileRegistry: SURVIVAL_BOT_REGISTRY,
    requireActiveSupplyProjection: true,
    supplyProjectionContract: SUPPLY_PROJECTION_CONTRACT,
    trustedBinding,
    arena: core.config.arena,
    characterRadius: core.getCharacterDefinition('player-2').collision.radius,
  });
  try {
    assert.throws(
      () => new BotController(botOptions(Object.freeze({
        ...validBinding,
        contractHash: 'deadbeef',
      }))),
      /trusted Bot binding 与 supplyProjectionContract 不一致/,
    );
    assert.equal(core.getStateHash(), beforeHash);
    assert.throws(
      () => core.createTrustedPublicSnapshotReader(Object.freeze({
        ...validBinding,
        authorityContentHash: 'deadbeef',
      })),
      /权威 content hash/,
    );
    assert.equal(core.getStateHash(), beforeHash);

    core.createTrustedPublicSnapshotReader(validBinding);
    assert.throws(
      () => otherCore.createTrustedPublicSnapshotReader(validBinding),
      /已绑定其他 MatchCore/,
    );
    assert.equal(core.getStateHash(), beforeHash);
    assert.equal(otherCore.tick, 0);
  } finally {
    core.destroy();
    otherCore.destroy();
  }
});

test('trusted same-Core Bot path matches strict external observations and rejects cross-Core readers', () => {
  const trustedCore = createSurvivalCore(1210, 1_850);
  const strictCore = createSurvivalCore(1210, 1_850);
  const trustedBinding = createTrustedBinding(trustedCore);
  const createController = (core: MatchCore, trusted = false) => new BotController({
    participantId: 'player-2',
    difficultyId: 'survival-rush',
    behaviorSeed: 0x10203040,
    personalitySeed: 0x50607080,
    profileRegistry: SURVIVAL_BOT_REGISTRY,
    requireActiveSupplyProjection: true,
    supplyProjectionContract: SUPPLY_PROJECTION_CONTRACT,
    ...(trusted ? { trustedBinding } : {}),
    arena: core.config.arena,
    characterRadius: core.getCharacterDefinition('player-2').collision.radius,
  });
  const trustedController = createController(trustedCore, true);
  const strictController = createController(strictCore);
  const otherCore = createSurvivalCore(1211, 1_850);
  const trustedReader = trustedCore.createTrustedPublicSnapshotReader(trustedBinding);
  assert.throws(
    () => assertMatchCoreTrustedPublicSnapshotReader(
      otherCore.createTrustedPublicSnapshotReader(trustedBinding),
      trustedCore,
      trustedBinding,
    ),
    /不一致|已绑定其他 MatchCore/,
  );
  trustedController.attachTrustedSnapshotReader(
    trustedReader,
    trustedBinding,
  );
  assert.throws(
    () => trustedController.attachTrustedSnapshotReader(
      trustedCore.createTrustedPublicSnapshotReader(trustedBinding),
      trustedBinding,
    ),
    /不可替换/,
  );
  try {
    const trustedEvents: ArenaAuthorityEvent[] = [];
    const strictEvents: ArenaAuthorityEvent[] = [];
    while (trustedCore.tick <= 1_801) {
      const trustedFrame = trustedController.createInputFromTrustedSnapshot();
      const strictFrame = strictController.createInput(strictCore.getSnapshot());
      assert.deepEqual(trustedFrame, strictFrame);
      trustedEvents.push(...trustedCore.step([
        createNeutralInputFrame(trustedCore.tick, 'player-1'),
        trustedFrame,
      ]));
      strictEvents.push(...strictCore.step([
        createNeutralInputFrame(strictCore.tick, 'player-1'),
        strictFrame,
      ]));
      assert.equal(trustedCore.getStateHash(), strictCore.getStateHash());
      if (trustedCore.tick === 1_201 || trustedCore.tick === 1_799) {
        assert.deepEqual(
          trustedCore.getSnapshot().activeSupplyProjection?.supplies.map((item) => item.remainingTicks),
          trustedCore.getSnapshot().activeSupplyProjection?.supplies.map(() => (
          trustedCore.tick === 1_799 ? 1 : 599
          )),
        );
      }
    }
    assert.deepEqual(trustedEvents, strictEvents);
    assert.ok(trustedEvents.some(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP));
    assert.deepEqual(trustedController.getDebugSnapshot(), strictController.getDebugSnapshot());
    assert.equal(trustedCore.getSnapshot().tick, 1_802);
    assert.equal(strictCore.getSnapshot().tick, 1_802);
  } finally {
    trustedController.destroy();
    strictController.destroy();
    trustedCore.destroy();
    strictCore.destroy();
    otherCore.destroy();
  }
});

test('trusted survival Bot path preserves the three-item 599/600/601 projection boundary', () => {
  const idleProfile = createBotProfileDefinition({
    ...BOT_PROFILE_REGISTRY.require('easy'),
    id: 'survival-idle-trusted',
    maximumInputMagnitude: 0,
    actionCommitChance: 0,
    shortPauseChance: 0,
  });
  const idleRegistry = new BotProfileRegistry([idleProfile]);
  const idleArena = {
    ...SURVIVAL_ARENA,
    surfaces: Object.freeze([Object.freeze({
      ...SURVIVAL_ARENA.surfaces[0]!,
      halfExtents: Object.freeze({ x: 20, y: 0.5, z: 4 }),
    })]),
    spawns: Object.freeze([
      Object.freeze({ x: -8, y: 1, z: 0 }),
      Object.freeze({ x: 8, y: 1, z: 0 }),
    ]),
  };
  const trustedCore = createSurvivalCore(1212, 1_850, idleArena);
  const strictCore = createSurvivalCore(1212, 1_850, idleArena);
  const trustedBinding = createTrustedBinding(trustedCore);
  const createController = (core: MatchCore, trusted: boolean) => new BotController({
    participantId: 'player-2',
    difficultyId: idleProfile.id,
    behaviorSeed: 0x10203040,
    personalitySeed: 0x50607080,
    profileRegistry: idleRegistry,
    requireActiveSupplyProjection: true,
    supplyProjectionContract: SUPPLY_PROJECTION_CONTRACT,
    ...(trusted ? { trustedBinding } : {}),
    arena: core.config.arena,
    characterRadius: core.getCharacterDefinition('player-2').collision.radius,
  });
  const trustedController = createController(trustedCore, true);
  const strictController = createController(strictCore, false);
  trustedController.attachTrustedSnapshotReader(
    trustedCore.createTrustedPublicSnapshotReader(trustedBinding),
    trustedBinding,
  );
  try {
    while (trustedCore.tick <= 1_801) {
      const trustedFrame = trustedController.createInputFromTrustedSnapshot();
      const strictFrame = strictController.createInput(strictCore.getSnapshot());
      assert.deepEqual(trustedFrame, strictFrame);
      trustedCore.step([
        createNeutralInputFrame(trustedCore.tick, 'player-1'),
        trustedFrame,
      ]);
      strictCore.step([
        createNeutralInputFrame(strictCore.tick, 'player-1'),
        strictFrame,
      ]);
      assert.equal(trustedCore.getStateHash(), strictCore.getStateHash());
      if (trustedCore.tick === 1_201) {
        assert.deepEqual(
          trustedCore.getSnapshot().activeSupplyProjection?.supplies.map(({ remainingTicks }) => remainingTicks),
          [599, 599, 599],
        );
      }
      if (trustedCore.tick === 1_799) {
        assert.deepEqual(
          trustedCore.getSnapshot().activeSupplyProjection?.supplies.map(({ remainingTicks }) => remainingTicks),
          [1, 1, 1],
        );
      }
      if (trustedCore.tick === 1_800) {
        const projection = trustedCore.getSnapshot().activeSupplyProjection;
        assert.ok(projection);
        assert.deepEqual(projection.supplies, []);
        assert.equal(
          projection.resyncReadiness,
          ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.NOT_READY_PRE_EXPIRY,
        );
        assert.equal(projection.pendingAuthorityTick, 1_800);
        assert.equal(projection.pendingExpiryEquipmentInstanceIds.length, 3);
      }
      if (trustedCore.tick === 1_801) {
        const projection = trustedCore.getSnapshot().activeSupplyProjection;
        assert.ok(projection);
        assert.equal(projection.resyncReadiness, ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY);
        assert.equal(projection.pendingAuthorityTick, null);
        assert.deepEqual(projection.pendingExpiryEquipmentInstanceIds, []);
      }
    }
  } finally {
    trustedController.destroy();
    strictController.destroy();
    trustedCore.destroy();
    strictCore.destroy();
  }
});

test('trusted source preserves the strict visible-equipment order for reversed world input', () => {
  const core = createSurvivalCore(1213, 1_850);
  try {
    while (core.tick <= 1_200) core.step(neutralFrames(core));
    const snapshot = core.getSnapshot();
    const trusted = createTrustedBotSourceSnapshot(snapshot, {
      lifecycleContract: SUPPLY_PROJECTION_CONTRACT,
      requireActiveSupplyProjection: true,
    });
    const reversed = {
      ...trusted,
      equipment: [...trusted.equipment].reverse(),
    };
    const arena = createBotArenaView(
      core.config.arena,
      core.getCharacterDefinition('player-2').collision.radius,
    );
    const trustedObservation = createBotObservation({
      commandSnapshot: trusted,
      delayedSnapshot: trusted,
      selfId: 'player-2',
      arena,
    });
    const strictObservation = createBotObservation({
      commandSnapshot: reversed,
      delayedSnapshot: reversed,
      selfId: 'player-2',
      arena,
    });
    assert.deepEqual(strictObservation, trustedObservation);
    assert.deepEqual(
      strictObservation.equipment.map(({ instanceId }) => instanceId),
      [...strictObservation.equipment]
        .sort((left, right) => left.instanceId.localeCompare(right.instanceId))
        .map(({ instanceId }) => instanceId),
    );
  } finally {
    core.destroy();
  }
});

test('formal survival composition rejects an unknown supply Definition before Core construction', () => {
  assert.throws(() => createArenaV2SurvivalSupplyBotSession({
    seed: 1204,
    config: { preparingTicks: 0, arena: SURVIVAL_ARENA },
    supply: {
      ...SUPPLY,
      supplyDefinitionId: 'arena-v2.survival-supply.v2',
    },
    bot: {
      participantId: 'player-2',
      difficultyId: 'survival-rush',
      behaviorSeed: 1,
      personalitySeed: 2,
      profileRegistry: SURVIVAL_BOT_REGISTRY,
    },
    publicMatchInfo: publicMatchInfo(1204),
  }), /正式 survival supply Definition/);
});

test('formal survival Bot fails closed when the public supply projection is missing', () => {
  const core = createSurvivalCore(1204, 1_250);
  const controller = new BotController({
    participantId: 'player-2',
    difficultyId: 'survival-rush',
    behaviorSeed: 0x10203040,
    personalitySeed: 0x50607080,
    profileRegistry: SURVIVAL_BOT_REGISTRY,
    requireActiveSupplyProjection: true,
    supplyProjectionContract: SUPPLY_PROJECTION_CONTRACT,
    arena: core.config.arena,
    characterRadius: core.getCharacterDefinition('player-2').collision.radius,
  });
  try {
    const snapshot = core.getSnapshot();
    const withoutProjection = { ...snapshot } as Record<string, unknown>;
    delete withoutProjection.activeSupplyProjection;
    assert.throws(() => controller.createInput(withoutProjection), /缺少完整 activeSupplyProjection/);
    assert.equal(controller.getDebugSnapshot().lastCommandTick, -1);
  } finally {
    controller.destroy();
    core.destroy();
  }
});

test('formal survival Bot rejects namespace replacement before history/RNG commit and retries same tick', () => {
  const core = createSurvivalCore(1208, 1_850);
  const controller = new BotController({
    participantId: 'player-2',
    difficultyId: 'survival-rush',
    behaviorSeed: 0x10203040,
    personalitySeed: 0x50607080,
    profileRegistry: SURVIVAL_BOT_REGISTRY,
    requireActiveSupplyProjection: true,
    supplyProjectionContract: SUPPLY_PROJECTION_CONTRACT,
    arena: core.config.arena,
    characterRadius: core.getCharacterDefinition('player-2').collision.radius,
  });
  try {
    stepTo(core, 1_200);
    const snapshot = core.getSnapshot();
    const before = controller.getDebugSnapshot();
    const corrupted = {
      ...snapshot,
      equipment: snapshot.equipment.map((equipment, index) => index === 0
        ? {
          ...equipment,
          instanceId: 'ordinary-equipment',
          definitionId: 'ordinary',
          spawnId: 'ordinary-spawn',
        }
        : equipment),
      activeSupplyProjection: {
        ...snapshot.activeSupplyProjection!,
        supplies: [],
      },
    };
    assert.throws(() => controller.createInput(corrupted), /未映射到正式 supply identity/);
    assert.deepEqual(controller.getDebugSnapshot(), before);
    const retry = controller.createInput(snapshot);
    assert.equal(retry.tick, snapshot.tick);
    assert.equal(controller.getDebugSnapshot().lastCommandTick, snapshot.tick);
  } finally {
    controller.destroy();
    core.destroy();
  }
});

test('survival Bot composition is deterministic across repeated multi-seed runs', () => {
  function run(seed: number) {
    const session = createBotSession(seed);
    try {
      return session.runUntilEnded((snapshot) => (
        createNeutralInputFrame(snapshot.tick, 'player-1')
      ));
    } finally {
      session.destroy();
    }
  }

  const first = run(1205);
  const second = run(1205);
  const third = run(1206);
  assert.deepEqual(second, first);
  assert.notEqual(third.finalHash, first.finalHash);
  assert.ok(first.events.some(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED));
  assert.equal(first.inputFrames.length, 2_500);
});

test('formal survival Bot preserves same-tick result under participant input order permutation', () => {
  function run(reverse: boolean) {
    const core = createSurvivalCore(1210, 1_850);
    const controller = new BotController({
      participantId: 'player-2',
      difficultyId: 'survival-rush',
      behaviorSeed: 0x10203040,
      personalitySeed: 0x50607080,
      profileRegistry: SURVIVAL_BOT_REGISTRY,
      requireActiveSupplyProjection: true,
      supplyProjectionContract: SUPPLY_PROJECTION_CONTRACT,
      arena: core.config.arena,
      characterRadius: core.getCharacterDefinition('player-2').collision.radius,
    });
    const events: ArenaAuthorityEvent[] = [];
    const snapshotHashes: string[] = [];
    try {
      while (core.phase !== 'ended') {
        const snapshot = core.getSnapshot();
        const botFrame = controller.createInput(snapshot);
        const playerFrame = createNeutralInputFrame(snapshot.tick, 'player-1');
        const frames = reverse
          ? [botFrame, playerFrame]
          : [playerFrame, botFrame];
        events.push(...core.step(frames));
        const after = core.getSnapshot();
        snapshotHashes.push(createDeterministicDataHash({
          tick: after.tick,
          eventSequence: after.eventSequence,
          participants: after.participants,
          equipment: after.equipment,
          activeSupplyProjection: after.activeSupplyProjection,
        }, 'formal survival Bot input order snapshot'));
      }
      return {
        events,
        snapshotHashes,
        finalHash: core.getStateHash(),
        result: core.result,
      };
    } finally {
      controller.destroy();
      core.destroy();
    }
  }

  assert.deepEqual(run(true), run(false));
});

test('formal survival Bot rejects future projection before history/RNG commit and retries same tick', () => {
  const core = createSurvivalCore(1211, 1_850);
  const controller = new BotController({
    participantId: 'player-2',
    difficultyId: 'survival-rush',
    behaviorSeed: 0x10203040,
    personalitySeed: 0x50607080,
    profileRegistry: SURVIVAL_BOT_REGISTRY,
    requireActiveSupplyProjection: true,
    supplyProjectionContract: SUPPLY_PROJECTION_CONTRACT,
    arena: core.config.arena,
    characterRadius: core.getCharacterDefinition('player-2').collision.radius,
  });
  try {
    stepTo(core, 1_200);
    const snapshot = core.getSnapshot();
    const before = controller.getDebugSnapshot();
    const futureProjection = {
      ...snapshot,
      activeSupplyProjection: {
        ...snapshot.activeSupplyProjection!,
        schemaVersion: 3,
      },
    };
    assert.throws(
      () => controller.createInput(futureProjection),
      /schema|版本|projection/,
    );
    assert.deepEqual(controller.getDebugSnapshot(), before);
    const retry = controller.createInput(snapshot);
    assert.equal(retry.tick, snapshot.tick);
    assert.equal(controller.getDebugSnapshot().lastCommandTick, snapshot.tick);
  } finally {
    controller.destroy();
    core.destroy();
  }
});
