import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOT_PROFILE_REGISTRY,
  BotController,
  type BotControllerOptions,
} from '@number-strategy-jump/arena-bot';
import type { QuickMatchCoreFactory } from '@number-strategy-jump/arena-quick-match';
import {
  createDeterministicDataHash,
  createNeutralInputFrame,
  normalizeInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import {
  buildArenaV2SurvivalBotCompositionContract,
  createArenaV2SurvivalSupplyBotSession,
  createArenaV2SurvivalSupplyBotSessionForTest,
  createArenaV2SurvivalBotCompositionContractHash,
} from '../../packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.js';
import {
  LocalMatchSession,
  createMatchReadBotBundleV2 as createPackageBundle,
  type LocalMatchSessionOptions,
} from '@number-strategy-jump/arena-session';
import {
  armBotMatchReadTransaction,
  createMatchReadBotBundleV2 as createSourceBundle,
  resolveBotMatchReadBundle,
} from '../../packages/arena-session/src/bot-match-read-bundle.js';
import {
  createArenaV1MatchCore,
  createArenaV2SurvivalSupplyBotSession as createPublicArenaV2SurvivalSupplyBotSession,
  createArenaV2SurvivalSupplyMatchCore,
  readArenaV2SurvivalSupplyBotCompositionIdentity,
  QuickMatchService,
} from '@number-strategy-jump/arena-v1-composition';

const ARENA = Object.freeze({
  killY: -4,
  surfaces: Object.freeze([Object.freeze({
    id: 'pa3b-outer-platform',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 10, y: 0.5, z: 4 }),
  })]),
  spawns: Object.freeze([
    Object.freeze({ x: -1, y: 1, z: 0 }),
    Object.freeze({ x: 1, y: 1, z: 0 }),
  ]),
});

const SPAWN_SPECS = Object.freeze([
  Object.freeze({
    slotId: 'left',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'pa3b-outer-left',
    position: Object.freeze({ x: -3, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'center',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'pa3b-outer-center',
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'right',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'pa3b-outer-right',
    position: Object.freeze({ x: 3, y: 1, z: 0 }),
  }),
]);

const SUPPLY = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  spawnSpecs: SPAWN_SPECS,
});

const PUBLIC_MATCH_INFO = Object.freeze({
  matchSeed: 3301,
  opponent: Object.freeze({
    id: 'pa3b-survival-bot',
    displayName: 'PA3b Survival Bot',
    portraitKey: 'test-portrait',
    appearanceKey: 'test-appearance',
  }),
});

const PROJECTION_CONTRACT = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  firstSpawnTick: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick,
  spawnIntervalTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnIntervalTicks,
  spawnCount: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnCount,
  lifetimeTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.lifetimeTicks,
  spawnSpecs: SPAWN_SPECS,
  equipmentDefinitionIds: Object.freeze([
    ...new Set(SPAWN_SPECS.map(({ equipmentDefinitionId }) => equipmentDefinitionId)),
  ]),
});

function survivalOptions(
  seed = 3301,
  hardLimitTicks = 2_500,
  suddenDeathStartTick = 2_400,
  participantIds: readonly [string, string] = ['player-1', 'player-2'],
  playerParticipantId = 'player-1',
  botParticipantId = 'player-2',
): Record<string, unknown> {
  return {
    seed,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick,
      hardLimitTicks,
      arena: ARENA,
      participantIds: Object.freeze([...participantIds]),
    },
    supply: SUPPLY,
    bot: {
      participantId: botParticipantId,
      difficultyId: 'normal',
      behaviorSeed: 0x12003456,
      personalitySeed: 0x5600789a,
      profileRegistry: BOT_PROFILE_REGISTRY,
    },
    playerParticipantId,
    publicMatchInfo: Object.freeze({ ...PUBLIC_MATCH_INFO, matchSeed: seed }),
  };
}

function contractHash(): string {
  return createArenaV2SurvivalBotCompositionContractHash({
    spawnSpecs: SPAWN_SPECS,
    profileRegistry: BOT_PROFILE_REGISTRY,
    difficultyId: 'normal',
    playerParticipantId: 'player-1',
    botParticipantId: 'player-2',
  });
}

function descriptor(core: ReturnType<typeof createArenaV2SurvivalSupplyMatchCore>) {
  return Object.freeze({
    schemaVersion: 1,
    compositionId: 'arena-v2-survival-supply.v1',
    participantIds: Object.freeze([...core.config.participantIds]),
    mapDefinitionId: core.config.mapDefinitionId,
    contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
    compositionContractHash: contractHash(),
  });
}

function stepNeutral(core: ReturnType<typeof createArenaV2SurvivalSupplyMatchCore>): void {
  core.step(Object.freeze(core.config.participantIds.map((participantId) => (
    normalizeInputFrame(createNeutralInputFrame(core.tick, participantId), {
      expectedTick: core.tick,
      participantIds: core.config.participantIds,
    })
  ))));
}

function readSourceAt(
  bundle: object,
  core: ReturnType<typeof createArenaV2SurvivalSupplyMatchCore>,
): Record<string, unknown> {
  const transaction = armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2');
  const { reader } = resolveBotMatchReadBundle(bundle, core, 'player-1', 'player-2');
  const source = (reader as { read(): Record<string, unknown> }).read();
  transaction.completeSuccess();
  return source;
}

test('PA3b survival accepts reversed role mapping with canonical config and replay identity', () => {
  const canonical = createArenaV2SurvivalSupplyBotSession(survivalOptions(3320, 4, 2));
  const reversed = createArenaV2SurvivalSupplyBotSession(
    survivalOptions(3320, 4, 2, ['player-2', 'player-1'], 'player-2', 'player-1'),
  );
  try {
    canonical.start();
    reversed.start();
    canonical.runLegacyUntilEndedForAudit(() => null);
    reversed.runLegacyUntilEndedForAudit(() => null);
    assert.deepEqual(
      reversed.getLegacyFullSnapshotForAudit().participants.map(({ id }) => id),
      ['player-1', 'player-2'],
    );
    const canonicalReplay = canonical.exportReplay();
    const reversedReplay = reversed.exportReplay();
    assert.equal(reversedReplay.configHash, canonicalReplay.configHash);
    assert.deepEqual(reversedReplay.config.participantIds, canonicalReplay.config.participantIds);
  } finally {
    canonical.destroy();
    reversed.destroy();
  }

  assert.throws(
    () => createArenaV2SurvivalSupplyBotSession(
      survivalOptions(3321, 4, 2, ['player-1', 'player-3'], 'player-1', 'player-2'),
    ),
    /稳定排序集合/,
  );
});

test('PA7 formal composition identity is provenance-bound, stable and invalidated by destroy', () => {
  const session = createPublicArenaV2SurvivalSupplyBotSession(survivalOptions(3322, 4, 2));
  const quickMatchService = new QuickMatchService();
  const ordinary = quickMatchService.create({
    matchSeed: 3322,
    config: { preparingTicks: 0, suddenDeathStartTick: 2, hardLimitTicks: 4 },
  });
  try {
    const identity = readArenaV2SurvivalSupplyBotCompositionIdentity(session);
    assert.deepEqual(Reflect.ownKeys(identity), [
      'schemaVersion',
      'compositionId',
      'participantIds',
      'mapDefinitionId',
      'contentSelectionHash',
      'compositionContractHash',
    ]);
    assert.deepEqual(identity, {
      schemaVersion: 1,
      compositionId: 'arena-v2-survival-supply.v1',
      participantIds: ['player-1', 'player-2'],
      mapDefinitionId: session.getPresentationReadFrame().worldSnapshot.map.definitionId,
      contentSelectionHash: null,
      compositionContractHash: contractHash(),
    });
    assert.ok(Object.isFrozen(identity));
    assert.ok(Object.isFrozen(identity.participantIds));
    assert.strictEqual(
      readArenaV2SurvivalSupplyBotCompositionIdentity(session),
      identity,
    );
    assert.throws(
      () => readArenaV2SurvivalSupplyBotCompositionIdentity({ ...identity }),
      /provenance/,
    );
    let proxyTrapCalls = 0;
    const proxy = new Proxy(session, {
      getPrototypeOf() {
        proxyTrapCalls += 1;
        return LocalMatchSession.prototype;
      },
    });
    assert.throws(
      () => readArenaV2SurvivalSupplyBotCompositionIdentity(proxy),
      /provenance/,
    );
    assert.equal(proxyTrapCalls, 0, 'unregistered Proxy must fail before prototype traps');
    assert.throws(
      () => readArenaV2SurvivalSupplyBotCompositionIdentity(ordinary.session),
      /provenance/,
    );

    Object.defineProperty(session, 'getPublicMatchInfo', {
      configurable: true,
      value: () => { throw new Error('own shadow must not execute'); },
    });
    assert.strictEqual(
      readArenaV2SurvivalSupplyBotCompositionIdentity(session),
      identity,
    );
    delete (session as unknown as Record<string, unknown>).getPublicMatchInfo;

    const descriptor = Object.getOwnPropertyDescriptor(
      LocalMatchSession.prototype,
      'getPublicMatchInfo',
    );
    assert.ok(descriptor && 'value' in descriptor);
    Object.defineProperty(LocalMatchSession.prototype, 'getPublicMatchInfo', {
      ...descriptor,
      value() { return PUBLIC_MATCH_INFO; },
    });
    try {
      assert.throws(
        () => readArenaV2SurvivalSupplyBotCompositionIdentity(session),
        /原型已漂移/,
      );
    } finally {
      Object.defineProperty(LocalMatchSession.prototype, 'getPublicMatchInfo', descriptor);
    }

    session.start();
    session.runLegacyUntilEndedForAudit(() => null);
    assert.strictEqual(
      readArenaV2SurvivalSupplyBotCompositionIdentity(session),
      identity,
    );
    session.destroy();
    assert.throws(
      () => readArenaV2SurvivalSupplyBotCompositionIdentity(session),
      /已销毁/,
    );
  } finally {
    session.destroy();
    ordinary.session.destroy();
    quickMatchService.destroy();
  }
});

test('PA3b ordinary QuickMatch uses one opaque bundle and keeps the public result narrow', () => {
  const captured: {
    bot: Record<string, unknown> | null;
    session: Record<string, unknown> | null;
  } = { bot: null, session: null };
  const service = new QuickMatchService({
    botControllerFactory: (options: BotControllerOptions) => {
      captured.bot = options as unknown as Record<string, unknown>;
      return new BotController(options);
    },
    sessionFactory: (options: LocalMatchSessionOptions) => {
      captured.session = options as unknown as Record<string, unknown>;
      return new LocalMatchSession(options);
    },
  });
  const match = service.create({ matchSeed: 3302, config: { preparingTicks: 0 } });
  try {
    assert.ok(captured.bot?.trustedCommandSourceHandle);
    assert.strictEqual(
      captured.session?.botMatchReadBundle,
      captured.bot?.trustedCommandSourceHandle,
    );
    assert.equal(Object.hasOwn(captured.bot ?? {}, 'trustedBinding'), false);
    assert.equal(Object.hasOwn(captured.session ?? {}, 'trustedBotBinding'), false);
    assert.equal(Object.hasOwn(match, 'core'), false);
    assert.equal(Object.hasOwn(match, 'bot'), false);
    assert.equal(Object.hasOwn(match, 'bundle'), false);
  } finally {
    match.session.destroy();
    service.destroy();
  }
});

test('PA3b ordinary outer V5 path matches the legacy strict controller to terminal', () => {
  let capturedBot: Record<string, unknown> | null = null;
  let capturedCoreOptions: Readonly<Record<string, unknown>> | null = null;
  let capturedSession: Record<string, unknown> | null = null;
  const service = new QuickMatchService({
    coreFactory: (options: Parameters<QuickMatchCoreFactory>[0]) => {
      capturedCoreOptions = options.config;
      return createArenaV1MatchCore(options);
    },
    botControllerFactory: (options: BotControllerOptions) => {
      capturedBot = options as unknown as Record<string, unknown>;
      return new BotController(options);
    },
    sessionFactory: (options: LocalMatchSessionOptions) => {
      capturedSession = options as unknown as Record<string, unknown>;
      return new LocalMatchSession(options);
    },
  });
  const match = service.create({
    matchSeed: 3310,
    config: { preparingTicks: 0, suddenDeathStartTick: 8, hardLimitTicks: 12 },
  });
  const legacyCore = createArenaV1MatchCore({
    seed: 3310,
    config: capturedCoreOptions ?? {},
  });
  const capturedBotOptions = capturedBot as unknown as Record<string, unknown>;
  const capturedSessionOptions = capturedSession as unknown as Record<string, unknown>;
  const legacyBotOptions = { ...capturedBotOptions };
  delete legacyBotOptions.trustedCommandSourceHandle;
  const legacyBot = new BotController(legacyBotOptions as unknown as BotControllerOptions);
  const legacySession = new LocalMatchSession({
    core: legacyCore,
    botController: legacyBot,
    publicMatchInfo: capturedSessionOptions.publicMatchInfo as never,
  });
  try {
    match.session.start();
    legacySession.start();
    while (match.session.state !== 'ended' || legacySession.state !== 'ended') {
      const actual = match.session.stepWithLegacySnapshotForAudit(null);
      const expected = legacySession.stepWithLegacySnapshotForAudit(null);
      assert.deepEqual(actual.input, expected.input);
      assert.deepEqual(actual.events, expected.events);
      assert.deepEqual(actual.snapshot, expected.snapshot);
    }
    assert.deepEqual(match.session.exportReplay(), legacySession.exportReplay());
  } finally {
    match.session.destroy();
    legacySession.destroy();
    service.destroy();
  }
});

test('PA3b survival passes the exact projection contract identity to Bundle and Bot', () => {
  let botOptions: Record<string, unknown> | null = null;
  let sessionOptions: Record<string, unknown> | null = null;
  let bundleOptions: Record<string, unknown> | null = null;
  let normalizedSupply: Record<string, unknown> | null = null;
  const session = createArenaV2SurvivalSupplyBotSessionForTest(
    survivalOptions(),
    {
      bundleFactory: (options: Record<string, unknown>) => {
        bundleOptions = options;
        return createPackageBundle(options as never);
      },
      coreSupplyObserver: (_core: unknown, supply: Record<string, unknown>) => {
        normalizedSupply = supply;
      },
      botControllerFactory: (options: Record<string, unknown>) => {
        botOptions = options;
        return new BotController(options as unknown as BotControllerOptions);
      },
      sessionFactory: (options: Record<string, unknown>) => {
        sessionOptions = options;
        return new LocalMatchSession(options as never);
      },
    },
  );
  try {
    const capturedBotOptions = botOptions as unknown as Record<string, unknown>;
    const capturedSessionOptions = sessionOptions as unknown as Record<string, unknown>;
    const capturedBundleOptions = bundleOptions as unknown as Record<string, unknown>;
    const capturedNormalizedSupply = normalizedSupply as unknown as Record<string, unknown>;
    const bundle = capturedBotOptions.trustedCommandSourceHandle;
    assert.ok(bundle);
    assert.strictEqual(capturedSessionOptions.botMatchReadBundle, bundle);
    assert.strictEqual(
      capturedBotOptions.supplyProjectionContract,
      capturedBundleOptions.projectionContract,
    );
    assert.strictEqual(
      (capturedBundleOptions.projectionContract as Record<string, unknown>).spawnSpecs,
      capturedNormalizedSupply.spawnSpecs,
    );
    assert.deepEqual(
      (capturedBundleOptions.projectionContract as Record<string, unknown>).equipmentDefinitionIds,
      [...new Set((capturedNormalizedSupply.spawnSpecs as readonly Record<string, unknown>[]).map((spec) => spec.equipmentDefinitionId))]
        .sort(),
    );
    const expectedContract = buildArenaV2SurvivalBotCompositionContract({
      spawnSpecs: SPAWN_SPECS,
      profileRegistry: BOT_PROFILE_REGISTRY,
      difficultyId: 'normal',
      playerParticipantId: 'player-1',
      botParticipantId: 'player-2',
    });
    assert.equal(
      (capturedBundleOptions.descriptor as Record<string, unknown>).compositionContractHash,
      createDeterministicDataHash(expectedContract, 'formal survival Bot composition contract'),
    );
    assert.equal(
      (capturedBundleOptions.descriptor as Record<string, unknown>).compositionContractHash,
      contractHash(),
    );
    assert.deepEqual(
      expectedContract.survivalSupplyDefinition,
      ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
    );
    assert.equal(
      createArenaV2SurvivalBotCompositionContractHash({
        spawnSpecs: Object.freeze([...SPAWN_SPECS].reverse()),
        profileRegistry: BOT_PROFILE_REGISTRY,
        difficultyId: 'normal',
        playerParticipantId: 'player-1',
        botParticipantId: 'player-2',
      }),
      contractHash(),
    );
    const alteredRegistry = {
      list: () => Object.freeze(BOT_PROFILE_REGISTRY.list().map((profile, index) => (
        index === 0 ? Object.freeze({ ...profile, id: `${profile.id}-changed` }) : profile
      ))),
    };
    assert.notEqual(
      createArenaV2SurvivalBotCompositionContractHash({
        spawnSpecs: SPAWN_SPECS,
        profileRegistry: alteredRegistry as never,
        difficultyId: 'normal',
        playerParticipantId: 'player-1',
        botParticipantId: 'player-2',
      }),
      contractHash(),
    );
    const alteredDefinition = Object.freeze({
      ...expectedContract,
      survivalSupplyDefinition: Object.freeze({
        ...(expectedContract.survivalSupplyDefinition as unknown as Record<string, unknown>),
        lifetimeTicks: (expectedContract.survivalSupplyDefinition as unknown as Record<string, unknown>).lifetimeTicks as number + 1,
      }),
    });
    assert.notEqual(
      createDeterministicDataHash(alteredDefinition, 'formal survival Bot composition contract'),
      contractHash(),
    );
    assert.equal(capturedBotOptions.requireActiveSupplyProjection, true);
    assert.match(contractHash(), /^[0-9a-f]{8}$/);
    assert.notEqual(contractHash(), 'deadbeef');
  } finally {
    session.destroy();
  }
});

test('PA3b formal outer V5 path matches the legacy strict controller to terminal', () => {
  let capturedBot: Record<string, unknown> | null = null;
  const options = survivalOptions(3311, 12, 8);
  const session = createArenaV2SurvivalSupplyBotSessionForTest(options, {
    bundleFactory: (bundleOptions: Record<string, unknown>) => (
      createPackageBundle(bundleOptions as never)
    ),
    botControllerFactory: (botOptions: Record<string, unknown>) => {
      capturedBot = botOptions;
      return new BotController(botOptions as unknown as BotControllerOptions);
    },
    sessionFactory: (sessionOptions: Record<string, unknown>) => new LocalMatchSession(sessionOptions as never),
  });
  const legacyBotOptions = {
    ...(capturedBot as unknown as Record<string, unknown>),
  };
  delete legacyBotOptions.trustedCommandSourceHandle;
  const legacyCore = createArenaV2SurvivalSupplyMatchCore({
    seed: options.seed as number,
    config: options.config as never,
    supply: options.supply as never,
  });
  const legacySession = new LocalMatchSession({
    core: legacyCore,
    botController: new BotController(legacyBotOptions as unknown as BotControllerOptions),
    publicMatchInfo: options.publicMatchInfo as never,
  });
  try {
    session.start();
    legacySession.start();
    while (session.state !== 'ended' || legacySession.state !== 'ended') {
      const actual = session.stepWithLegacySnapshotForAudit(null);
      const expected = legacySession.stepWithLegacySnapshotForAudit(null);
      assert.deepEqual(actual.input, expected.input);
      assert.deepEqual(actual.events, expected.events);
      assert.deepEqual(actual.snapshot, expected.snapshot);
    }
    assert.deepEqual(session.exportReplay(), legacySession.exportReplay());
  } finally {
    session.destroy();
    legacySession.destroy();
  }
});

test('PA3b outer Session preserves pause/phase/ended semantics and destroys transferred owners once', () => {
  let capturedSession: Record<string, unknown> | null = null;
  let botDestroyed = 0;
  const phaseOptions = survivalOptions(3316, 5, 3);
  phaseOptions.config = Object.freeze({
    ...(phaseOptions.config as Record<string, unknown>),
    preparingTicks: 1,
  });
  const session = createArenaV2SurvivalSupplyBotSessionForTest(
    phaseOptions,
    {
      bundleFactory: (options: Record<string, unknown>) => createPackageBundle(options as never),
      botControllerFactory: (options: Record<string, unknown>) => {
        const controller = new BotController(options as unknown as BotControllerOptions);
        return {
          createInput: controller.createInput.bind(controller),
          attachTrustedCommandSourceReader: controller.attachTrustedCommandSourceReader.bind(controller),
          createInputFromTrustedCommandSource: controller.createInputFromTrustedCommandSource.bind(controller),
          destroy() { botDestroyed += 1; controller.destroy(); },
        };
      },
      sessionFactory: (options: Record<string, unknown>) => {
        capturedSession = options;
        return new LocalMatchSession(options as never);
      },
    },
  );
  const core = (capturedSession as Record<string, unknown> | null)?.core as {
    getLegacyFullSnapshotForAudit(): Record<string, unknown>;
  };
  try {
    const initialPhase = session.getLegacyFullSnapshotForAudit().phase;
    assert.equal(initialPhase, 'preparing');
    session.start();
    const first = session.stepWithLegacySnapshotForAudit(null);
    assert.equal(first.snapshot.phase, 'running');
    session.setPaused(true);
    const paused = session.stepWithLegacySnapshotForAudit(null);
    const pausedAgain = session.stepWithLegacySnapshotForAudit(null);
    assert.deepEqual(paused.snapshot, pausedAgain.snapshot);
    assert.deepEqual(paused.events, []);
    session.setPaused(false);
    const resumed = session.stepWithLegacySnapshotForAudit(null);
    assert.equal(resumed.snapshot.tick, paused.snapshot.tick + 1);
    const phases = new Set<string>([
      initialPhase,
      first.snapshot.phase,
      resumed.snapshot.phase,
    ]);
    while (session.state !== 'ended') {
      const result = session.stepWithLegacySnapshotForAudit(null);
      phases.add(result.snapshot.phase);
    }
    const terminal = session.getLegacyFullSnapshotForAudit();
    phases.add(terminal.phase);
    assert.equal(session.state, 'ended');
    assert.equal(terminal.phase, 'ended');
    assert.ok(phases.has('running'));
    assert.ok(phases.has('sudden-death'));
    assert.ok(phases.has('ended'));
  } finally {
    session.destroy();
    session.destroy();
  }
  assert.equal(botDestroyed, 1);
  assert.throws(() => core.getLegacyFullSnapshotForAudit(), /已销毁/);
});

test('PA3b outer Session runUntilEnded accepts a legal input provider', () => {
  const session = createArenaV2SurvivalSupplyBotSession(survivalOptions(3318, 4, 2));
  try {
    session.start();
    session.runLegacyUntilEndedForAudit(() => null);
    assert.equal(session.state, 'ended');
  } finally {
    session.destroy();
  }
});

test('PA3b formal source excludes pending expiry equipment at the 599/600/601 boundaries', () => {
  const core = createArenaV2SurvivalSupplyMatchCore({
    seed: 3303,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 2_400,
      hardLimitTicks: 2_500,
      arena: ARENA,
    },
    supply: SUPPLY,
  });
  const bundle = createSourceBundle({
    ownedNewCore: core,
    descriptor: descriptor(core),
    localId: 'player-1',
    botId: 'player-2',
    projectionContract: PROJECTION_CONTRACT,
  });
  try {
    const expected = new Map<number, readonly number[]>([
      [599, []],
      [600, []],
      [601, []],
      [1_199, []],
      [1_200, []],
      [1_201, [599, 599, 599]],
      [1_799, [1, 1, 1]],
      [1_800, []],
      [1_801, []],
      [2_399, []],
      [2_400, []],
      [2_401, [599, 599, 599]],
    ]);
    for (const [tick, remainingTicks] of expected) {
      while (core.tick < tick) stepNeutral(core);
      const source = readSourceAt(bundle, core);
      assert.deepEqual(
        (source.equipment as readonly Record<string, unknown>[]).map((item) => item.remainingTicks),
        remainingTicks,
        `Bot source equipment boundary at tick ${tick}`,
      );
      if (tick === 1_800) {
        const projection = core.getLegacyFullSnapshotForAudit().activeSupplyProjection;
        assert.ok(projection);
        assert.ok(projection.pendingExpiryEquipmentInstanceIds.length > 0);
        assert.equal(
          (source.equipment as readonly Record<string, unknown>[]).some(({ instanceId }) => (
            projection.pendingExpiryEquipmentInstanceIds.includes(instanceId as string)
          )),
          false,
        );
      }
    }
  } finally {
    core.destroy();
  }
});

test('PA3b public survival options reject factories; deep-only seam validates candidate ownership', () => {
  assert.throws(() => createArenaV2SurvivalSupplyBotSession({
    ...survivalOptions(3304),
    botControllerFactory: () => null,
  } as unknown), /不支持字段 botControllerFactory/);

  let invalidBotDestroyed = 0;
  assert.throws(() => createArenaV2SurvivalSupplyBotSessionForTest(
    survivalOptions(3305),
    {
      bundleFactory: (options: Record<string, unknown>) => createPackageBundle(options as never),
      botControllerFactory: () => ({ destroy() { invalidBotDestroyed += 1; } }),
      sessionFactory: () => new LocalMatchSession({} as never),
    },
  ), /必须实现 createInput/);
  assert.equal(invalidBotDestroyed, 1);

  let fakeSessionDestroyed = 0;
  let botDestroyed = 0;
  assert.throws(() => createArenaV2SurvivalSupplyBotSessionForTest(
    survivalOptions(3306),
    {
      bundleFactory: (options: Record<string, unknown>) => createPackageBundle(options as never),
      botControllerFactory: () => ({
        createInput() { return null; },
        attachTrustedCommandSourceReader() { return true; },
        createInputFromTrustedCommandSource() { return null; },
        destroy() { botDestroyed += 1; },
      }),
      sessionFactory: () => ({ destroy() { fakeSessionDestroyed += 1; } }),
    },
  ), /原生 LocalMatchSession/);
  assert.equal(fakeSessionDestroyed, 1);
  assert.equal(botDestroyed, 1);
});

test('PA3b every outer construction failure quarantines the new Core and preserves cleanup order', () => {
  let bundleFailureCore: ReturnType<typeof createArenaV2SurvivalSupplyMatchCore> | null = null;
  assert.throws(() => createArenaV2SurvivalSupplyBotSessionForTest(
    survivalOptions(3312, 12, 8),
    {
      bundleFactory: (options: Record<string, unknown>) => {
        bundleFailureCore = options.ownedNewCore as ReturnType<typeof createArenaV2SurvivalSupplyMatchCore>;
        throw new Error('bundle factory failure');
      },
      botControllerFactory: () => { throw new Error('must not construct Bot'); },
      sessionFactory: () => { throw new Error('must not construct Session'); },
    },
  ), /bundle factory failure/);
  assert.ok(bundleFailureCore);
  assert.throws(() => bundleFailureCore?.getLegacyFullSnapshotForAudit(), /已销毁/);

  let botFailureCore: ReturnType<typeof createArenaV2SurvivalSupplyMatchCore> | null = null;
  assert.throws(() => createArenaV2SurvivalSupplyBotSessionForTest(
    survivalOptions(3313, 12, 8),
    {
      bundleFactory: (options: Record<string, unknown>) => {
        botFailureCore = options.ownedNewCore as ReturnType<typeof createArenaV2SurvivalSupplyMatchCore>;
        return createPackageBundle(options as never);
      },
      botControllerFactory: () => { throw new Error('Bot factory failure'); },
      sessionFactory: () => { throw new Error('must not construct Session'); },
    },
  ), /Bot factory failure/);
  assert.ok(botFailureCore);
  assert.throws(() => botFailureCore?.getLegacyFullSnapshotForAudit(), /已销毁/);

  let botDestroyed = 0;
  let sessionCandidateDestroyed = 0;
  let sessionFailureCore: ReturnType<typeof createArenaV2SurvivalSupplyMatchCore> | null = null;
  assert.throws(() => createArenaV2SurvivalSupplyBotSessionForTest(
    survivalOptions(3314, 12, 8),
    {
      bundleFactory: (options: Record<string, unknown>) => {
        sessionFailureCore = options.ownedNewCore as ReturnType<typeof createArenaV2SurvivalSupplyMatchCore>;
        return createPackageBundle(options as never);
      },
      botControllerFactory: () => ({
        createInput() { return null; },
        attachTrustedCommandSourceReader() { return true; },
        createInputFromTrustedCommandSource() { return null; },
        destroy() { botDestroyed += 1; },
      }),
      sessionFactory: () => {
        return { destroy() { sessionCandidateDestroyed += 1; } };
      },
    },
  ), /原生 LocalMatchSession/);
  assert.equal(botDestroyed, 1);
  assert.equal(sessionCandidateDestroyed, 1);
  assert.ok(sessionFailureCore);
  assert.throws(() => sessionFailureCore?.getLegacyFullSnapshotForAudit(), /已销毁/);
});

test('PA3b outer cleanup aggregates Session and Bot failures before continuing to Core', () => {
  let sessionDestroyed = 0;
  let botDestroyed = 0;
  let coreDestroyed = 0;
  let thrown: unknown;
  try {
    createArenaV2SurvivalSupplyBotSessionForTest(
      survivalOptions(3317, 12, 8),
      {
        bundleFactory: (options: Record<string, unknown>) => createPackageBundle(options as never),
        coreSupplyObserver: (core: object) => {
          Object.defineProperty(core, 'destroy', {
            configurable: true,
            enumerable: false,
            writable: true,
            value() {
              coreDestroyed += 1;
              throw new Error('core cleanup failure');
            },
          });
        },
        botControllerFactory: () => ({
          createInput() { return null; },
          attachTrustedCommandSourceReader() { return true; },
          createInputFromTrustedCommandSource() { return null; },
          destroy() {
            botDestroyed += 1;
            throw new Error('bot cleanup failure');
          },
        }),
        sessionFactory: () => ({
          destroy() {
            sessionDestroyed += 1;
            throw new Error('session cleanup failure');
          },
        }),
      },
    );
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error);
  const aggregate = thrown as Error & {
    readonly originalError?: Error;
    readonly cleanupErrors?: readonly Error[];
  };
  assert.match(aggregate.originalError?.message ?? '', /原生 LocalMatchSession/);
  assert.deepEqual(
    aggregate.cleanupErrors?.map((error) => error.message),
    ['session cleanup failure', 'bot cleanup failure', 'core cleanup failure'],
  );
  assert.equal(sessionDestroyed, 1);
  assert.equal(botDestroyed, 1);
  assert.equal(coreDestroyed, 1);
});

test('PA3b native Session ownership transfer prevents double destroy after a post-construction surface failure', () => {
  let botDestroyed = 0;
  let coreDestroyed = 0;
  assert.throws(() => createArenaV2SurvivalSupplyBotSessionForTest(
    survivalOptions(3315, 12, 8),
    {
      bundleFactory: (options: Record<string, unknown>) => createPackageBundle(options as never),
      botControllerFactory: () => ({
        createInput() { return null; },
        attachTrustedCommandSourceReader() { return true; },
        createInputFromTrustedCommandSource() { return null; },
        destroy() { botDestroyed += 1; },
      }),
      sessionFactory: (options: Record<string, unknown>) => {
        const session = new LocalMatchSession(options as never);
        const core = options.core as object & { destroy(): void };
        const destroy = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(core), 'destroy')?.value;
        if (typeof destroy !== 'function') throw new Error('native Core destroy missing');
        Object.defineProperty(core, 'destroy', {
          configurable: true,
          enumerable: false,
          writable: true,
          value: function destroyCounted(this: object): void {
            coreDestroyed += 1;
            Reflect.apply(destroy, this, []);
          },
        });
        Object.defineProperty(session, 'start', {
          configurable: true,
          enumerable: false,
          writable: true,
          value() {},
        });
        return session;
      },
    },
  ), /own shadow start/);
  assert.equal(botDestroyed, 1);
  assert.equal(coreDestroyed, 1);
});

test('PA3b Bundle helper remains deep-only and survival V1 adapter is not replaced', async () => {
  const compositionIndex = await import('@number-strategy-jump/arena-v1-composition');
  assert.equal(Object.hasOwn(compositionIndex, 'createArenaV2SurvivalSupplyBotSessionForTest'), false);
  assert.equal(Object.hasOwn(compositionIndex, 'buildArenaV2SurvivalBotCompositionContract'), false);
  assert.equal(Object.hasOwn(compositionIndex, 'createArenaV2SurvivalBotCompositionContractHash'), false);
  const expected = createDeterministicDataHash(PROJECTION_CONTRACT, 'PA3b formal projection contract');
  assert.match(expected, /^[0-9a-f]{8}$/);
});
