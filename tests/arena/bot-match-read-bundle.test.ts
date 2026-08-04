import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV1MatchCore,
  createArenaV2SurvivalSupplyMatchCore,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import { MatchCore as MatchCoreClass, type MatchCore } from '@number-strategy-jump/arena-match';
import {
  createMatchReadBotBundleV2,
  armBotMatchReadTransaction,
  buildBotCommandSourceV5ForBundle,
  invalidateBotMatchReadBundle,
  resolveBotMatchReadBundle,
} from '../../packages/arena-session/src/bot-match-read-bundle.js';

const SPAWN_SPECS = Object.freeze([
  Object.freeze({
    slotId: 'left',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'bundle-left',
    position: Object.freeze({ x: -1, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'right',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'bundle-right',
    position: Object.freeze({ x: 1, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'spare',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'bundle-spare',
    position: Object.freeze({ x: 3, y: 1, z: 0 }),
  }),
]);
const SURVIVAL_CONTRACT = Object.freeze({
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

function ordinaryCore(seed = 8101): MatchCore {
  return createArenaV1MatchCore({
    seed,
    config: { preparingTicks: 0, suddenDeathStartTick: 60, hardLimitTicks: 120 },
  });
}

function descriptor(core: MatchCore, compositionContractHash?: string): Record<string, unknown> {
  return {
    schemaVersion: 1,
    compositionId: compositionContractHash === undefined
      ? 'arena-quick-match.v2'
      : 'arena-v2-survival-supply.v1',
    participantIds: [...core.config.participantIds],
    mapDefinitionId: core.config.mapDefinitionId,
    contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
    compositionContractHash: compositionContractHash ?? null,
  };
}

function survivalCore(seed = 8102): MatchCore {
  return createArenaV2SurvivalSupplyMatchCore({
    seed,
    config: { preparingTicks: 0, suddenDeathStartTick: 1_800, hardLimitTicks: 2_500 },
    supply: {
      supplyDefinitionId: SURVIVAL_CONTRACT.supplyDefinitionId,
      spawnSpecs: SPAWN_SPECS,
    },
  });
}

function isolatedSurvivalCore(seed = 8125): MatchCore {
  const template = ordinaryCore(seed + 10_000);
  const arena = template.config.arena;
  template.destroy();
  return createArenaV2SurvivalSupplyMatchCore({
    seed,
    config: {
      arena,
      preparingTicks: 0,
      suddenDeathStartTick: 1_800,
      hardLimitTicks: 2_500,
    },
    supply: {
      supplyDefinitionId: SURVIVAL_CONTRACT.supplyDefinitionId,
      spawnSpecs: SPAWN_SPECS,
    },
  });
}

function readCoreModels(core: MatchCore, compositionContractHash?: string): {
  readonly frame: Record<string, unknown>;
  readonly mobility: Record<string, unknown>;
} {
  const binding = core.createMatchReadBinding(descriptor(core, compositionContractHash));
  const frameReader = core.createMatchReadFrameReader(binding, 'player-1');
  const mobilityReader = core.createMatchReadSidecarReader(binding, 'player-2', 'bot-mobility');
  return {
    frame: frameReader.read() as Record<string, unknown>,
    mobility: mobilityReader.read() as Record<string, unknown>,
  };
}

test('PA3b bundle returns strict ordinary source, preserves identity, and invalidates extracted reader', () => {
  const core = ordinaryCore();
  try {
    const bundle = createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor: descriptor(core),
      localId: 'player-1',
      botId: 'player-2',
    });
    const first = resolveBotMatchReadBundle(bundle, core, 'player-1', 'player-2');
    assert.throws(() => (first.reader as { read(): Record<string, unknown> }).read(), /必须先 arm/);
    const firstTransaction = armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2');
    const source = (first.reader as { read(): Record<string, unknown> }).read();
    firstTransaction.completeSuccess();
    assert.equal(source.schemaVersion, 5);
    assert.equal(source.commandTick, 0);
    assert.equal(source.commandEventSequence, 0);
    assert.equal(source.botMobility && typeof source.botMobility, 'object');
    assert.equal(Object.isFrozen(source), true);
    assert.equal((source.map as Record<string, unknown>).occurrences !== undefined, true);
    assert.equal(Object.hasOwn(source, 'privatePlan'), false);
    assert.strictEqual(first.reader, resolveBotMatchReadBundle(bundle, core, 'player-1', 'player-2').reader);
    assert.throws(() => createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor: descriptor(core),
      localId: 'player-1',
      botId: 'player-2',
    }), /只能创建一个/);
    const foreignCore = ordinaryCore(8103);
    try {
      assert.throws(
        () => resolveBotMatchReadBundle(bundle, foreignCore, 'player-1', 'player-2'),
        /provenance/,
      );
    } finally {
      foreignCore.destroy();
    }
    assert.throws(() => resolveBotMatchReadBundle(bundle, core, 'player-2', 'player-1'), /provenance/);
    invalidateBotMatchReadBundle(bundle, core, 'player-1', 'player-2');
    assert.throws(() => (first.reader as { read(): unknown }).read(), /失效|释放/);
    assert.throws(() => resolveBotMatchReadBundle(bundle, core, 'player-1', 'player-2'), /provenance/);
    assert.doesNotThrow(() => invalidateBotMatchReadBundle(bundle, core, 'player-1', 'player-2'));
  } finally {
    core.destroy();
  }
});

test('PA3b bundle source transaction classifies reader failure retryable and Bot failure fatal', () => {
  const core = ordinaryCore(8116);
  const foreignCore = ordinaryCore(8117);
  try {
    const bundle = createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor: descriptor(core),
      localId: 'player-1',
      botId: 'player-2',
    });
    const resolved = resolveBotMatchReadBundle(bundle, core, 'player-1', 'player-2');
    const reader = resolved.reader as { read(): Record<string, unknown> };
    assert.throws(
      () => armBotMatchReadTransaction(bundle, foreignCore, 'player-1', 'player-2'),
      /transaction provenance/,
    );
    const sourceFailure = armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2');
    assert.throws(() => core.step(new Proxy([], {
      ownKeys() {
        try {
          reader.read();
        } catch {
          // The read is intentionally attempted during Core validation.
        }
        throw new Error('abort input validation');
      },
    }) as unknown as readonly unknown[]));
    assert.deepEqual(sourceFailure.classifyFailure(), { retryable: true, fatal: false });

    const retry = armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2');
    const second = reader.read();
    assert.equal(second.commandTick, 0);
    retry.completeSuccess();

    core.step([]);
    const botFailure = armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2');
    const botSource = reader.read();
    assert.equal(botSource.commandTick, 1);
    assert.deepEqual(botFailure.classifyFailure(), { retryable: false, fatal: true });
    assert.throws(() => botFailure.completeSuccess(), /transaction 已失效/);
    assert.deepEqual(sourceFailure.classifyFailure(), { retryable: false, fatal: true });

    const duplicateCore = ordinaryCore(8120);
    try {
      const duplicateBundle = createMatchReadBotBundleV2({
        ownedNewCore: duplicateCore,
        descriptor: descriptor(duplicateCore),
        localId: 'player-1',
        botId: 'player-2',
      });
      const duplicateReader = resolveBotMatchReadBundle(
        duplicateBundle,
        duplicateCore,
        'player-1',
        'player-2',
      ).reader as { read(): unknown };
      const duplicate = armBotMatchReadTransaction(duplicateBundle, duplicateCore, 'player-1', 'player-2');
      duplicateReader.read();
      assert.throws(() => duplicateReader.read(), /单次读取/);
      assert.deepEqual(duplicate.classifyFailure(), { retryable: false, fatal: true });
    } finally {
      duplicateCore.destroy();
    }

    const noReadCore = ordinaryCore(8121);
    try {
      const noReadBundle = createMatchReadBotBundleV2({
        ownedNewCore: noReadCore,
        descriptor: descriptor(noReadCore),
        localId: 'player-1',
        botId: 'player-2',
      });
      const noRead = armBotMatchReadTransaction(noReadBundle, noReadCore, 'player-1', 'player-2');
      assert.deepEqual(noRead.classifyFailure(), { retryable: false, fatal: true });
    } finally {
      noReadCore.destroy();
    }

    const invalidatedCore = ordinaryCore(8122);
    try {
      const invalidatedBundle = createMatchReadBotBundleV2({
        ownedNewCore: invalidatedCore,
        descriptor: descriptor(invalidatedCore),
        localId: 'player-1',
        botId: 'player-2',
      });
      const invalidatedReader = resolveBotMatchReadBundle(
        invalidatedBundle,
        invalidatedCore,
        'player-1',
        'player-2',
      ).reader as { read(): unknown };
      const invalidated = armBotMatchReadTransaction(
        invalidatedBundle,
        invalidatedCore,
        'player-1',
        'player-2',
      );
      invalidateBotMatchReadBundle(invalidatedBundle, invalidatedCore, 'player-1', 'player-2');
      assert.deepEqual(invalidated.classifyFailure(), { retryable: false, fatal: true });
      assert.throws(() => invalidatedReader.read(), /失效/);
    } finally {
      invalidatedCore.destroy();
    }
  } finally {
    foreignCore.destroy();
    core.destroy();
  }
});

test('PA3b source-failed classification is consumed by the immediately following call', () => {
  const core = ordinaryCore(8130);
  try {
    const bundle = createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor: descriptor(core),
      localId: 'player-1',
      botId: 'player-2',
    });
    const reader = resolveBotMatchReadBundle(bundle, core, 'player-1', 'player-2').reader as {
      read(): unknown;
    };
    const transaction = armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2');
    assert.throws(() => core.step(new Proxy([], {
      ownKeys() {
        try {
          reader.read();
        } catch {
          // The reader failure is deliberately swallowed by the input trap.
        }
        throw new Error('abort source-failed classification');
      },
    }) as unknown as readonly unknown[]));

    assert.deepEqual(transaction.classifyFailure(), { retryable: true, fatal: false });
    // This is intentionally adjacent: the retryable token is one-shot.
    assert.deepEqual(transaction.classifyFailure(), { retryable: false, fatal: true });
    assert.throws(
      () => resolveBotMatchReadBundle(bundle, core, 'player-1', 'player-2'),
      /provenance/,
    );
    assert.throws(
      () => armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2'),
      /provenance/,
    );
  } finally {
    core.destroy();
  }
});

test('PA3b swallowed reader failure cannot completeSuccess or retry the bundle', () => {
  const core = ordinaryCore(8131);
  try {
    const bundle = createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor: descriptor(core),
      localId: 'player-1',
      botId: 'player-2',
    });
    const reader = resolveBotMatchReadBundle(bundle, core, 'player-1', 'player-2').reader as {
      read(): unknown;
    };
    const transaction = armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2');
    assert.throws(() => core.step(new Proxy([], {
      ownKeys() {
        try {
          reader.read();
        } catch {
          // Simulate Bot swallowing the reader construction failure.
        }
        throw new Error('abort swallowed reader failure');
      },
    }) as unknown as readonly unknown[]));

    assert.throws(
      () => transaction.completeSuccess(),
      /transaction 已失效|completeSuccess/,
    );
    assert.deepEqual(transaction.classifyFailure(), { retryable: false, fatal: true });
    assert.throws(
      () => armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2'),
      /provenance/,
    );
  } finally {
    core.destroy();
  }
});

test('PA3b formal bundle validates the formal projection contract and rejects ordinary/formal mismatch', () => {
  const core = survivalCore();
  try {
    const contractHash = createDeterministicDataHash(SURVIVAL_CONTRACT, 'PA3b bundle formal contract');
    const bundle = createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor: descriptor(core, contractHash),
      localId: 'player-1',
      botId: 'player-2',
      projectionContract: SURVIVAL_CONTRACT,
    });
    const resolved = resolveBotMatchReadBundle(bundle, core, 'player-1', 'player-2');
    const transaction = armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2');
    const value = (resolved.reader as { read(): Record<string, unknown> }).read();
    transaction.completeSuccess();
    assert.equal(value.commandTick, 0);
    assert.equal(Array.isArray(value.equipment), true);
    invalidateBotMatchReadBundle(bundle, core, 'player-1', 'player-2');
  } finally {
    core.destroy();
  }

  const ordinary = ordinaryCore(8104);
  try {
    assert.throws(() => createMatchReadBotBundleV2({
      ownedNewCore: ordinary,
      descriptor: { ...descriptor(ordinary), compositionContractHash: 'deadbeef' },
      localId: 'player-1',
      botId: 'player-2',
    }), /ordinary|compositionContractHash/);
    assert.throws(() => createMatchReadBotBundleV2({
      ownedNewCore: ordinary,
      descriptor: descriptor(ordinary),
      localId: 'player-1',
      botId: 'player-2',
    }), /只能创建一个/);
  } finally {
    ordinary.destroy();
  }
});

test('PA3b descriptor requires explicit ordinary null or formal hash and isolates invalid Core attempts', () => {
  const invalidDescriptors = [
    (core: MatchCore) => {
      const value = { ...descriptor(core) };
      delete value.compositionContractHash;
      return value;
    },
    (core: MatchCore) => ({ ...descriptor(core), compositionContractHash: undefined }),
    (core: MatchCore) => {
      const value = { ...descriptor(core) };
      Object.defineProperty(value, 'compositionContractHash', {
        configurable: true,
        enumerable: true,
        get: () => null,
      });
      return value;
    },
    (core: MatchCore) => ({ ...descriptor(core), unexpected: true }),
  ];
  for (const [index, makeDescriptor] of invalidDescriptors.entries()) {
    const core = ordinaryCore(8120 + index);
    try {
      assert.throws(() => createMatchReadBotBundleV2({
        ownedNewCore: core,
        descriptor: makeDescriptor(core),
        localId: 'player-1',
        botId: 'player-2',
      }));
      assert.throws(() => createMatchReadBotBundleV2({
        ownedNewCore: core,
        descriptor: descriptor(core),
        localId: 'player-1',
        botId: 'player-2',
      }), /只能创建一个/);
    } finally {
      core.destroy();
    }
  }

  const fresh = ordinaryCore(8124);
  try {
    const bundle = createMatchReadBotBundleV2({
      ownedNewCore: fresh,
      descriptor: descriptor(fresh),
      localId: 'player-1',
      botId: 'player-2',
    });
    invalidateBotMatchReadBundle(bundle, fresh, 'player-1', 'player-2');
  } finally {
    fresh.destroy();
  }
});

test('PA3b formal V5 source excludes +600 pending world supplies and exposes the next wave', () => {
  const core = isolatedSurvivalCore();
  const contractHash = createDeterministicDataHash(SURVIVAL_CONTRACT, 'PA3b formal contract');
  try {
    const bundle = createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor: descriptor(core, contractHash),
      localId: 'player-1',
      botId: 'player-2',
      projectionContract: SURVIVAL_CONTRACT,
    });
    const readSource = (): Record<string, unknown> => {
      const resolved = resolveBotMatchReadBundle(bundle, core, 'player-1', 'player-2');
      const transaction = armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2');
      const source = (resolved.reader as { read(): Record<string, unknown> }).read();
      transaction.completeSuccess();
      return source;
    };
    while (core.tick < 1_799) core.step([]);
    const preExpiry = readSource();
    const preExpiryEquipment = preExpiry.equipment as readonly Record<string, unknown>[];
    assert.ok(preExpiryEquipment.length > 0);
    assert.deepEqual(new Set(preExpiryEquipment.map((item) => item.remainingTicks)), new Set([1]));

    core.step([]);
    const expiry = readSource();
    const expiryEquipment = expiry.equipment as readonly Record<string, unknown>[];
    assert.equal(expiryEquipment.length, 0);
    const expirySnapshot = core.getLegacyFullSnapshotForAudit();
    const expiryProjection = expirySnapshot.activeSupplyProjection;
    if (expiryProjection === null || expiryProjection === undefined) throw new Error('missing expiry projection');
    assert.ok(expiryProjection.pendingExpiryEquipmentInstanceIds.length > 0);
    const pendingIds = new Set(expiryProjection.pendingExpiryEquipmentInstanceIds);
    assert.equal(
      expiryEquipment.some((item) => pendingIds.has(item.instanceId as string)),
      false,
    );

    core.step([]);
    const postExpiry = readSource();
    assert.equal((postExpiry.equipment as readonly unknown[]).length, 0);
    const postExpiryProjection = core.getLegacyFullSnapshotForAudit().activeSupplyProjection;
    if (postExpiryProjection === null || postExpiryProjection === undefined) throw new Error('missing post-expiry projection');
    assert.equal(postExpiryProjection.pendingExpiryEquipmentInstanceIds.length, 0);
    assert.equal(postExpiryProjection.resyncReadiness, 'ready');

    while (core.tick < 2_401) core.step([]);
    const nextWave = readSource();
    const nextWaveEquipment = nextWave.equipment as readonly Record<string, unknown>[];
    assert.ok(nextWaveEquipment.length > 0);
    assert.deepEqual(new Set(nextWaveEquipment.map((item) => item.remainingTicks)), new Set([599]));
  } finally {
    core.destroy();
  }
});

test('PA3b factory reentry is sticky even when a descriptor trap catches nested failure', () => {
  const core = ordinaryCore(8105);
  let nestedErrors = 0;
  const target = descriptor(core);
  const descriptorProxy = new Proxy(target, {
    ownKeys() {
      try {
        createMatchReadBotBundleV2({
          ownedNewCore: core,
          descriptor: target,
          localId: 'player-1',
          botId: 'player-2',
        });
      } catch {
        nestedErrors += 1;
      }
      return Reflect.ownKeys(target);
    },
  });
  try {
    assert.throws(() => createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor: descriptorProxy,
      localId: 'player-1',
      botId: 'player-2',
    }), /验证期间禁止重入/);
    assert.equal(nestedErrors, 1);
  } finally {
    core.destroy();
  }

  const retryCore = ordinaryCore(8107);
  try {
    const bundle = createMatchReadBotBundleV2({
      ownedNewCore: retryCore,
      descriptor: descriptor(retryCore),
      localId: 'player-1',
      botId: 'player-2',
    });
    invalidateBotMatchReadBundle(bundle, retryCore, 'player-1', 'player-2');
  } finally {
    retryCore.destroy();
  }
});

test('PA3b factory rejects own Core API shadow and does not publish a bundle', () => {
  const core = ordinaryCore(8106);
  try {
    Object.defineProperty(core, 'createMatchReadBinding', {
      configurable: true,
      enumerable: false,
      value: () => { throw new Error('shadow'); },
    });
    assert.throws(() => createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor: descriptor(core),
      localId: 'player-1',
      botId: 'player-2',
    }), /own shadow/);

    delete (core as unknown as Record<string, unknown>).createMatchReadBinding;
    assert.throws(() => createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor: descriptor(core),
      localId: 'player-1',
      botId: 'player-2',
    }), /只能创建一个/);
  } finally {
    core.destroy();
  }

  const freshCore = ordinaryCore(8109);
  try {
    const bundle = createMatchReadBotBundleV2({
      ownedNewCore: freshCore,
      descriptor: descriptor(freshCore),
      localId: 'player-1',
      botId: 'player-2',
    });
    assert.doesNotThrow(() => invalidateBotMatchReadBundle(
      bundle,
      freshCore,
      'player-1',
      'player-2',
    ));
  } finally {
    freshCore.destroy();
  }
});

test('PA3b package-private source builder rejects sidecar identity mismatch and extra participants', () => {
  const core = ordinaryCore(8108);
  try {
    const models = readCoreModels(core);
    assert.throws(() => buildBotCommandSourceV5ForBundle(
      models.frame,
      Object.freeze({ ...models.mobility, participantId: 'wrong-participant' }),
      { localParticipantId: 'player-1', botParticipantId: 'player-2', projectionContract: null },
    ), /mobility identity/);

    const frame = models.frame;
    const world = frame.worldSnapshot as Record<string, unknown>;
    const participants = world.participants as readonly unknown[];
    const extraParticipant = participants[0];
    assert.throws(() => buildBotCommandSourceV5ForBundle(
      Object.freeze({
        ...frame,
        worldSnapshot: Object.freeze({
          ...world,
          participants: Object.freeze([...participants, extraParticipant]),
        }),
      }),
      models.mobility,
      { localParticipantId: 'player-1', botParticipantId: 'player-2', projectionContract: null },
    ), /两个 participant/);
  } finally {
    core.destroy();
  }
});

test('PA3b package-private source builder rejects formal projection identity drift and missing projection', () => {
  const contractHash = createDeterministicDataHash(SURVIVAL_CONTRACT, 'PA3b formal contract');
  const core = survivalCore(8109);
  try {
    const models = readCoreModels(core, contractHash);
    const frame = models.frame;
    const world = frame.worldSnapshot as Record<string, unknown>;
    const projection = world.activeSupplyProjection as Record<string, unknown>;
    assert.throws(() => buildBotCommandSourceV5ForBundle(
      Object.freeze({
        ...frame,
        worldSnapshot: Object.freeze({
          ...world,
          activeSupplyProjection: Object.freeze({ ...projection, snapshotTick: (projection.snapshotTick as number) + 1 }),
        }),
      }),
      models.mobility,
      { localParticipantId: 'player-1', botParticipantId: 'player-2', projectionContract: SURVIVAL_CONTRACT },
    ), /projection identity/);

    assert.throws(() => buildBotCommandSourceV5ForBundle(
      Object.freeze({
        ...frame,
        worldSnapshot: Object.freeze({ ...world, activeSupplyProjection: null }),
      }),
      models.mobility,
      { localParticipantId: 'player-1', botParticipantId: 'player-2', projectionContract: SURVIVAL_CONTRACT },
    ), /缺少 activeSupplyProjection/);
  } finally {
    core.destroy();
  }
});

test('PA3b factory rejects MatchCore prototype drift without invoking replacements', () => {
  const prototype = MatchCoreClass.prototype as object;
  const methodDescriptor = Object.getOwnPropertyDescriptor(prototype, 'createMatchReadBinding');
  const configDescriptor = Object.getOwnPropertyDescriptor(prototype, 'config');
  if (methodDescriptor === undefined || configDescriptor?.get === undefined) {
    throw new Error('missing captured MatchCore native descriptors');
  }

  const methodCore = ordinaryCore(8111);
  let methodCalls = 0;
  const methodDescriptorValue = descriptor(methodCore);
  try {
    Object.defineProperty(prototype, 'createMatchReadBinding', {
      ...methodDescriptor,
      value: function () {
        methodCalls += 1;
        throw new Error('prototype replacement must not run');
      },
    });
    assert.throws(() => createMatchReadBotBundleV2({
      ownedNewCore: methodCore,
      descriptor: methodDescriptorValue,
      localId: 'player-1',
      botId: 'player-2',
    }), /原型已漂移/);
    assert.equal(methodCalls, 0);
  } finally {
    Object.defineProperty(prototype, 'createMatchReadBinding', methodDescriptor);
    methodCore.destroy();
  }

  const configCore = ordinaryCore(8114);
  let configCalls = 0;
  const configDescriptorValue = descriptor(configCore);
  try {
    Object.defineProperty(prototype, 'config', {
      ...configDescriptor,
      get: function () {
        configCalls += 1;
        throw new Error('prototype config replacement must not run');
      },
    });
    assert.throws(() => createMatchReadBotBundleV2({
      ownedNewCore: configCore,
      descriptor: configDescriptorValue,
      localId: 'player-1',
      botId: 'player-2',
    }), /原型已漂移/);
    assert.equal(configCalls, 0);
  } finally {
    Object.defineProperty(prototype, 'config', configDescriptor);
    configCore.destroy();
  }

  const accessorCore = ordinaryCore(8115);
  const accessorDescriptorValue = descriptor(accessorCore);
  let accessorCalls = 0;
  try {
    Object.defineProperty(prototype, 'createMatchReadBinding', {
      configurable: methodDescriptor.configurable ?? true,
      enumerable: methodDescriptor.enumerable ?? false,
      get: () => {
        accessorCalls += 1;
        throw new Error('prototype accessor replacement must not run');
      },
    });
    assert.throws(() => createMatchReadBotBundleV2({
      ownedNewCore: accessorCore,
      descriptor: accessorDescriptorValue,
      localId: 'player-1',
      botId: 'player-2',
    }), /原型已漂移/);
    assert.equal(accessorCalls, 0);
  } finally {
    Object.defineProperty(prototype, 'createMatchReadBinding', methodDescriptor);
    accessorCore.destroy();
  }

  const hasInstanceDescriptor = Object.getOwnPropertyDescriptor(MatchCoreClass, Symbol.hasInstance);
  const hasInstanceCore = ordinaryCore(8123);
  const hasInstanceDescriptorValue = descriptor(hasInstanceCore);
  let hasInstanceCalls = 0;
  try {
    Object.defineProperty(MatchCoreClass, Symbol.hasInstance, {
      configurable: true,
      value: () => {
        hasInstanceCalls += 1;
        return false;
      },
    });
    const bundle = createMatchReadBotBundleV2({
      ownedNewCore: hasInstanceCore,
      descriptor: hasInstanceDescriptorValue,
      localId: 'player-1',
      botId: 'player-2',
    });
    assert.equal(hasInstanceCalls, 0);
    invalidateBotMatchReadBundle(bundle, hasInstanceCore, 'player-1', 'player-2');
  } finally {
    if (hasInstanceDescriptor === undefined) {
      delete (MatchCoreClass as unknown as Record<PropertyKey, unknown>)[Symbol.hasInstance];
    } else {
      Object.defineProperty(MatchCoreClass, Symbol.hasInstance, hasInstanceDescriptor);
    }
    hasInstanceCore.destroy();
  }
});

test('PA3b options and contract Proxy traps cannot catch factory reentry and later publish', () => {
  const core = ordinaryCore(8112);
  const target = {
    ownedNewCore: core,
    descriptor: descriptor(core),
    localId: 'player-1',
    botId: 'player-2',
  };
  let nestedErrors = 0;
  const optionsProxy = new Proxy(target, {
    ownKeys() {
      try {
        createMatchReadBotBundleV2(target);
      } catch {
        nestedErrors += 1;
      }
      return Reflect.ownKeys(target);
    },
  });
  try {
    assert.throws(() => createMatchReadBotBundleV2(optionsProxy), /验证期间禁止重入/);
    assert.equal(nestedErrors, 1);
  } finally {
    core.destroy();
  }

  const survival = survivalCore(8113);
  const contractTarget = { ...SURVIVAL_CONTRACT };
  const contractProxy = new Proxy(contractTarget, {
    ownKeys() {
      try {
        createMatchReadBotBundleV2({
          ownedNewCore: survival,
          descriptor: descriptor(survival, createDeterministicDataHash(SURVIVAL_CONTRACT, 'PA3b formal contract')),
          localId: 'player-1',
          botId: 'player-2',
          projectionContract: SURVIVAL_CONTRACT,
        });
      } catch {
        nestedErrors += 1;
      }
      return Reflect.ownKeys(contractTarget);
    },
  });
  try {
    assert.throws(() => createMatchReadBotBundleV2({
      ownedNewCore: survival,
      descriptor: descriptor(survival, createDeterministicDataHash(SURVIVAL_CONTRACT, 'PA3b formal contract')),
      localId: 'player-1',
      botId: 'player-2',
      projectionContract: contractProxy,
    }), /验证期间禁止重入/);
    assert.equal(nestedErrors, 2);
  } finally {
    survival.destroy();
  }
});
