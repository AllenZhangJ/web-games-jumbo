import test from 'node:test';
import assert from 'node:assert/strict';
import { BotController } from '@number-strategy-jump/arena-bot';
import {
  createNeutralInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV1MatchCore,
} from '@number-strategy-jump/arena-v1-composition';
import {
  createMatchReadBotBundleV2,
  LocalMatchSession,
} from '@number-strategy-jump/arena-session';
import type {
  BotInputController,
  LocalMatchSessionOptions,
} from '../../packages/arena-session/src/local-match-session.js';
import {
  resolveBotMatchReadBundle,
} from '../../packages/arena-session/src/bot-match-read-bundle.js';

function descriptor(core: ReturnType<typeof createArenaV1MatchCore>): Record<string, unknown> {
  return {
    schemaVersion: 1,
    compositionId: 'arena-quick-match.v2',
    participantIds: [...core.config.participantIds],
    mapDefinitionId: core.config.mapDefinitionId,
    contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
    compositionContractHash: null,
  };
}

function publicMatchInfo(seed: number) {
  return {
    matchSeed: seed,
    opponent: {
      id: 'test-opponent',
      displayName: '测试对手',
      portraitKey: 'portrait-test',
      appearanceKey: 'appearance-test',
    },
  };
}

function neutral(core: ReturnType<typeof createArenaV1MatchCore>): ArenaInputFrame {
  return createNeutralInputFrame(core.tick, 'player-1');
}

function createCoreBundleOnly(seed: number) {
  const core = createArenaV1MatchCore({
    seed,
    config: { preparingTicks: 0, suddenDeathStartTick: 10, hardLimitTicks: 20 },
  });
  const bundle = createMatchReadBotBundleV2({
    ownedNewCore: core,
    descriptor: descriptor(core),
    localId: 'player-1',
    botId: 'player-2',
  });
  return { core, bundle };
}

function createRealController(
  core: ReturnType<typeof createArenaV1MatchCore>,
  seed: number,
  handle?: object,
): BotController {
  return new BotController({
    participantId: 'player-2',
    difficultyId: 'normal',
    behaviorSeed: seed + 1,
    personalitySeed: seed + 2,
    ...(handle === undefined ? {} : { trustedCommandSourceHandle: handle }),
    arena: core.config.arena,
    characterRadius: core.getCharacterDefinition('player-2').collision.radius,
  });
}

function createRealBundle(seed: number) {
  const { core, bundle } = createCoreBundleOnly(seed);
  const controller = createRealController(core, seed, bundle);
  return { core, bundle, controller };
}

function controllerDebug(controller: BotController): ReturnType<BotController['getDebugSnapshot']> {
  return controller.getDebugSnapshot();
}

function sessionOptions(
  core: ReturnType<typeof createArenaV1MatchCore>,
  controller: BotInputController,
  bundle: NonNullable<LocalMatchSessionOptions['botMatchReadBundle']>,
  extra: Record<string, unknown> = {},
): LocalMatchSessionOptions {
  return {
    core,
    botController: controller,
    playerParticipantId: 'player-1',
    botParticipantId: 'player-2',
    botMatchReadBundle: bundle,
    publicMatchInfo: publicMatchInfo(0),
    ...extra,
  };
}

test('PA3b V5 Session uses the command-source path without a legacy pre-step snapshot', () => {
  const { core, bundle, controller } = createRealBundle(9201);
  const nativeGetSnapshot = core.getLegacyFullSnapshotForAudit.bind(core);
  let getSnapshotCalls = 0;
  Object.defineProperty(core, 'getLegacyFullSnapshotForAudit', {
    configurable: true,
    value: () => {
      getSnapshotCalls += 1;
      return nativeGetSnapshot();
    },
  });
  let botDestroyCalls = 0;
  let coreDestroyCalls = 0;
  const nativeBotDestroy = controller.destroy.bind(controller);
  const nativeCoreDestroy = core.destroy.bind(core);
  Object.defineProperty(controller, 'destroy', {
    configurable: true,
    value: () => {
      botDestroyCalls += 1;
      nativeBotDestroy();
    },
  });
  Object.defineProperty(core, 'destroy', {
    configurable: true,
    value: () => {
      coreDestroyCalls += 1;
      nativeCoreDestroy();
    },
  });
  const session = new LocalMatchSession(sessionOptions(core, controller, bundle));
  try {
    session.start();
    const snapshotCallsBeforeStep = getSnapshotCalls;
    const first = session.stepWithPresentationReadFrame(neutral(core));
    assert.equal(getSnapshotCalls, snapshotCallsBeforeStep);
    assert.equal(first.readFrame.worldSnapshot.tick, 1);
    assert.equal(controller.getDebugSnapshot().lastCommandTick, 0);
    const second = session.stepWithPresentationReadFrame(neutral(core));
    assert.equal(getSnapshotCalls, snapshotCallsBeforeStep);
    assert.equal(second.readFrame.worldSnapshot.tick, 2);
    assert.equal(controller.getDebugSnapshot().lastCommandTick, 1);
  } finally {
    session.destroy();
  }
  assert.equal(botDestroyCalls, 1);
  assert.equal(coreDestroyCalls, 1);
  session.destroy();
  assert.equal(botDestroyCalls, 1);
  assert.equal(coreDestroyCalls, 1);
  assert.throws(() => controller.getDebugSnapshot(), /已销毁/);
  assert.throws(
    () => resolveBotMatchReadBundle(bundle, core, 'player-1', 'player-2'),
    /provenance/,
  );
  assert.throws(() => core.getLegacyFullSnapshotForAudit(), /已销毁/);
});

test('PA5a distinguishes legacy Bot pre-step snapshot from legacy post-step snapshot', () => {
  const core = createArenaV1MatchCore({
    seed: 9203,
    config: { preparingTicks: 0, suddenDeathStartTick: 10, hardLimitTicks: 20 },
  });
  const controller = createRealController(core, 9203);
  const nativeGetSnapshot = core.getLegacyFullSnapshotForAudit.bind(core);
  let getSnapshotCalls = 0;
  Object.defineProperty(core, 'getLegacyFullSnapshotForAudit', {
    configurable: true,
    value: () => {
      getSnapshotCalls += 1;
      return nativeGetSnapshot();
    },
  });
  const session = new LocalMatchSession({
    core,
    botController: controller,
    playerParticipantId: 'player-1',
    botParticipantId: 'player-2',
    publicMatchInfo: publicMatchInfo(9203),
  });
  try {
    session.start();
    const beforeStep = getSnapshotCalls;
    const result = session.stepWithLegacySnapshotForAudit(neutral(core));
    assert.equal(result.snapshot.tick, 1);
    assert.equal(
      getSnapshotCalls,
      beforeStep + 2,
      'legacy step 应分别读取 Bot pre-step snapshot 与返回的 post-step snapshot。',
    );
    const afterLegacyStep = getSnapshotCalls;
    assert.equal(session.getLegacyFullSnapshotForAudit().tick, 1);
    assert.equal(
      getSnapshotCalls,
      afterLegacyStep + 1,
      '显式审计读取应与 legacy step 的 post-step 返回读取保持可区分。',
    );
  } finally {
    session.destroy();
  }
});

test('PA3b Session rejects legacy trusted binding together with the V5 bundle', () => {
  const { core, bundle } = createCoreBundleOnly(9202);
  const controller = {
    createInput: () => createNeutralInputFrame(0, 'player-2'),
    destroy() {},
  } satisfies BotInputController;
  try {
    assert.throws(() => new LocalMatchSession(sessionOptions(
      core,
      controller,
      bundle,
      { trustedBotBinding: Object.freeze({ legacy: true }) },
    )), /未知.*trustedBotBinding|options/);
    assert.equal(core.getLegacyFullSnapshotForAudit().tick, 0);
    assert.doesNotThrow(() => controller.createInput());
  } finally {
    controller.destroy();
    core.destroy();
  }
});

test('PA3b Session constructor needs the paired command-source handshake and does not own failures', () => {
  for (const [index, controllerFactory] of [
    () => ({
      createInput: () => createNeutralInputFrame(0, 'player-2'),
      destroy() {},
    }),
    () => ({
      createInput: () => createNeutralInputFrame(0, 'player-2'),
      attachTrustedCommandSourceReader: () => true,
      destroy() {},
    }),
    () => ({
      createInput: () => createNeutralInputFrame(0, 'player-2'),
      createInputFromTrustedCommandSource: () => createNeutralInputFrame(0, 'player-2'),
      destroy() {},
    }),
  ].entries()) {
    const { core, bundle } = createCoreBundleOnly(9210 + index);
    let destroyCalls = 0;
    let coreDestroyCalls = 0;
    const nativeCoreDestroy = core.destroy.bind(core);
    Object.defineProperty(core, 'destroy', {
      configurable: true,
      value: () => {
        coreDestroyCalls += 1;
        nativeCoreDestroy();
      },
    });
    const controller = {
      ...controllerFactory(),
      destroy() { destroyCalls += 1; },
    };
    try {
      assert.throws(
        () => new LocalMatchSession(sessionOptions(core, controller, bundle)),
        /成对 command source reader handshake/,
      );
      assert.equal(destroyCalls, 0);
      assert.equal(coreDestroyCalls, 0);
      assert.equal(core.getLegacyFullSnapshotForAudit().tick, 0);
    } finally {
      assert.doesNotThrow(() => controller.destroy());
      core.destroy();
      assert.equal(coreDestroyCalls, 1);
    }
  }
});

test('PA3b Session resolves bundle provenance once and rejects foreign, swapped, and cloned bundles', () => {
  const first = createRealBundle(9220);
  const second = createCoreBundleOnly(9221);
  const cases: Array<() => LocalMatchSessionOptions> = [
    () => sessionOptions(second.core, first.controller, first.bundle),
    () => sessionOptions(first.core, first.controller, { ...first.bundle }),
    () => sessionOptions(
      first.core,
      first.controller,
      first.bundle,
      { playerParticipantId: 'player-2', botParticipantId: 'player-1' },
    ),
  ];
  try {
    for (const candidate of cases) {
      assert.throws(() => new LocalMatchSession(candidate()), /provenance/);
    }
    assert.doesNotThrow(() => first.controller.getDebugSnapshot());
    assert.equal(first.core.getLegacyFullSnapshotForAudit().tick, 0);
  } finally {
    first.controller.destroy();
    first.core.destroy();
    second.core.destroy();
  }
});

test('PA3b paused Session does not arm or read the Bot source until resumed', () => {
  const { core, bundle, controller } = createRealBundle(9230);
  const session = new LocalMatchSession(sessionOptions(core, controller, bundle));
  try {
    session.setPaused(true);
    session.start();
    assert.equal(session.stepWithLegacySnapshotForAudit(neutral(core)).input, null);
    assert.equal(core.tick, 0);
    assert.equal(controller.getDebugSnapshot().lastCommandTick, -1);
    session.setPaused(false);
    session.stepWithLegacySnapshotForAudit(neutral(core));
    assert.equal(core.tick, 1);
    assert.equal(controller.getDebugSnapshot().lastCommandTick, 0);
  } finally {
    session.destroy();
  }
});

test('PA3b real source-reader failure is retryable without cleaning the Session', () => {
  const { core, bundle, controller } = createRealBundle(9235);
  let nestedFailure: unknown = null;
  let destroyCalls = 0;
  const nativeBotDestroy = controller.destroy.bind(controller);
  Object.defineProperty(controller, 'destroy', {
    configurable: true,
    value: () => {
      destroyCalls += 1;
      nativeBotDestroy();
    },
  });
  const session = new LocalMatchSession(sessionOptions(core, controller, bundle));
  try {
    session.start();
    const beforeDebug = controllerDebug(controller);
    const beforeHash = core.getStateHash();
    assert.throws(() => core.step(new Proxy([], {
      ownKeys() {
        try {
          session.stepWithLegacySnapshotForAudit(neutral(core));
        } catch (error) {
          nestedFailure = error;
        }
        throw new Error('abort outer validation');
      },
    }) as unknown as readonly unknown[]), /outer validation/);
    assert.ok(nestedFailure instanceof Error);
    assert.match((nestedFailure as Error).message, /MatchCore|构造|snapshot|validation|读取|重入/i);
    assert.equal(session.state, 'running');
    assert.equal(core.tick, 0);
    assert.equal(core.getStateHash(), beforeHash);
    assert.deepEqual(controllerDebug(controller), beforeDebug);
    assert.equal(destroyCalls, 0);

    const retried = session.stepWithLegacySnapshotForAudit(neutral(core));
    assert.equal(retried.snapshot.tick, 1);
    assert.equal(session.state, 'running');
    assert.equal(destroyCalls, 0);

    const clean = createRealBundle(9235);
    const cleanSession = new LocalMatchSession({
      core: clean.core,
      botController: clean.controller,
      playerParticipantId: 'player-1',
      botParticipantId: 'player-2',
      botMatchReadBundle: clean.bundle,
      publicMatchInfo: publicMatchInfo(0),
    });
    try {
      cleanSession.start();
      const cleanStep = cleanSession.stepWithLegacySnapshotForAudit(neutral(clean.core));
      assert.deepEqual(retried.events, cleanStep.events);
      assert.equal(core.getStateHash(), clean.core.getStateHash());
      assert.deepEqual(controllerDebug(controller), controllerDebug(clean.controller));
    } finally {
      cleanSession.destroy();
    }
  } finally {
    session.destroy();
  }
});

test('PA3b real V5 Session matches the legacy strict Session with identical Bot state', () => {
  const seed = 9236;
  const v5 = createRealBundle(seed);
  const legacyCore = createArenaV1MatchCore({
    seed,
    config: { preparingTicks: 0, suddenDeathStartTick: 10, hardLimitTicks: 20 },
  });
  const legacyController = createRealController(legacyCore, seed);
  const v5Session = new LocalMatchSession(sessionOptions(v5.core, v5.controller, v5.bundle));
  const legacySession = new LocalMatchSession({
    core: legacyCore,
    botController: legacyController,
    playerParticipantId: 'player-1',
    botParticipantId: 'player-2',
    publicMatchInfo: publicMatchInfo(0),
  });
  try {
    v5Session.start();
    legacySession.start();
    while (v5Session.state !== 'ended' && legacySession.state !== 'ended') {
      const v5Result = v5Session.stepWithLegacySnapshotForAudit(neutral(v5.core));
      const legacyResult = legacySession.stepWithLegacySnapshotForAudit(neutral(legacyCore));
      assert.deepEqual(v5Result.input, legacyResult.input);
      assert.deepEqual(v5Result.events, legacyResult.events);
      assert.equal(v5.core.getStateHash(), legacyCore.getStateHash());
      assert.deepEqual(controllerDebug(v5.controller), controllerDebug(legacyController));
    }
    assert.equal(v5Session.state, legacySession.state);
    assert.equal(v5.core.tick, legacyCore.tick);
    assert.deepEqual(v5.core.getLegacyFullSnapshotForAudit().result, legacyCore.getLegacyFullSnapshotForAudit().result);
    assert.deepEqual(v5Session.exportReplay(), legacySession.exportReplay());
  } finally {
    v5Session.destroy();
    legacySession.destroy();
  }
});

test('PA3b Session attach false/throw fails without destroying caller-owned resources', () => {
  for (const [index, attach] of [
    () => false,
    () => { throw new Error('attach rejected'); },
  ].entries()) {
    const { core, bundle } = createCoreBundleOnly(9237 + index);
    let destroyCalls = 0;
    const controller = {
      createInput: () => createNeutralInputFrame(core.tick, 'player-2'),
      attachTrustedCommandSourceReader: attach,
      createInputFromTrustedCommandSource: () => createNeutralInputFrame(core.tick, 'player-2'),
      destroy() { destroyCalls += 1; },
    } satisfies BotInputController;
    try {
      assert.throws(
        () => new LocalMatchSession(sessionOptions(core, controller, bundle)),
        /未被接受|attach rejected/,
      );
      assert.equal(destroyCalls, 0);
      assert.equal(core.getLegacyFullSnapshotForAudit().tick, 0);
    } finally {
      core.destroy();
    }
  }
});

function runFatalControllerCase(
  mode: 'throw-after-read' | 'wrong-participant' | 'wrong-tick' | 'no-read' | 'double-read' | 'swallow-reader' | 'batch-failure',
  seed: number,
): void {
  const { core, bundle } = createCoreBundleOnly(seed);
  let attachedReader: { read(): unknown } | null = null;
  let destroyCalls = 0;
  let coreDestroyCalls = 0;
  const nativeCoreDestroy = core.destroy.bind(core);
  Object.defineProperty(core, 'destroy', {
    configurable: true,
    value: () => {
      coreDestroyCalls += 1;
      nativeCoreDestroy();
    },
  });
  const controller = {
    createInput: () => createNeutralInputFrame(core.tick, 'player-2'),
    attachTrustedCommandSourceReader(reader: unknown, handle: unknown): boolean {
      assert.strictEqual(handle, bundle);
      attachedReader = reader as { read(): unknown };
      return true;
    },
    createInputFromTrustedCommandSource(): ArenaInputFrame {
      if (mode === 'no-read') return createNeutralInputFrame(core.tick, 'player-2');
      assert.ok(attachedReader);
      const sourceReader = attachedReader as { read(): unknown };
      if (mode === 'swallow-reader') {
        try {
          core.step(new Proxy([], {
            ownKeys() {
              try {
                sourceReader.read();
              } catch {
                // The Bot deliberately swallows the reader failure.
              }
              throw new Error('abort swallowed source failure');
            },
          }) as unknown as readonly unknown[]);
        } catch {
          // Return a syntactically valid frame to prove completeSuccess rejects it.
        }
        return createNeutralInputFrame(core.tick, 'player-2');
      }
      sourceReader.read();
      if (mode === 'double-read') sourceReader.read();
      if (mode === 'throw-after-read') throw new Error('Bot policy failed after source read');
      if (mode === 'wrong-tick') return createNeutralInputFrame(core.tick + 1, 'player-2');
      return createNeutralInputFrame(
        core.tick,
        mode === 'wrong-participant' ? 'player-1' : 'player-2',
      );
    },
    destroy() { destroyCalls += 1; },
  } satisfies BotInputController;
  if (mode === 'batch-failure') {
    Object.defineProperty(core, 'createTrustedInputFrameBatch', {
      configurable: true,
      value: () => { throw new Error('authority batch rejected'); },
    });
  }
  const session = new LocalMatchSession(sessionOptions(core, controller, bundle));
    session.start();
    try {
      assert.throws(() => session.stepWithLegacySnapshotForAudit(neutral(core)));
      assert.equal(session.state, 'destroyed');
      assert.equal(destroyCalls, 1);
      assert.equal(coreDestroyCalls, 1);
      assert.throws(() => resolveBotMatchReadBundle(bundle, core, 'player-1', 'player-2'), /provenance/);
      assert.throws(() => core.getLegacyFullSnapshotForAudit(), /已销毁/);
      session.destroy();
      assert.equal(destroyCalls, 1);
      assert.equal(coreDestroyCalls, 1);
    } finally {
      session.destroy();
    }
}

test('PA3b source-success Bot/normalizer/transaction violations are fatal and invalidate the bundle', () => {
  runFatalControllerCase('throw-after-read', 9240);
  runFatalControllerCase('wrong-participant', 9241);
  runFatalControllerCase('wrong-tick', 9242);
  runFatalControllerCase('no-read', 9242);
  runFatalControllerCase('double-read', 9243);
  runFatalControllerCase('swallow-reader', 9244);
  runFatalControllerCase('batch-failure', 9245);
});

test('PA3b ended Session does not request another Bot source', () => {
  const core = createArenaV1MatchCore({
    seed: 9250,
    config: { preparingTicks: 0, suddenDeathStartTick: 1, hardLimitTicks: 2 },
  });
  const bundle = createMatchReadBotBundleV2({
    ownedNewCore: core,
    descriptor: descriptor(core),
    localId: 'player-1',
    botId: 'player-2',
  });
  let inputCalls = 0;
  let reader: { read(): unknown } | null = null;
  const controller = {
    createInput: () => createNeutralInputFrame(core.tick, 'player-2'),
    attachTrustedCommandSourceReader(sourceReader: unknown, handle: unknown): boolean {
      assert.strictEqual(handle, bundle);
      reader = sourceReader as { read(): unknown };
      return true;
    },
    createInputFromTrustedCommandSource(): ArenaInputFrame {
      inputCalls += 1;
      assert.ok(reader);
      (reader as { read(): unknown }).read();
      return createNeutralInputFrame(core.tick, 'player-2');
    },
    destroy() {},
  } satisfies BotInputController;
  const session = new LocalMatchSession(sessionOptions(core, controller, bundle));
  try {
    session.start();
    while (session.state !== 'ended') session.stepWithLegacySnapshotForAudit(neutral(core));
    const callsAtEnd = inputCalls;
    assert.throws(() => session.stepWithLegacySnapshotForAudit(neutral(core)), /无法在 ended/);
    assert.equal(inputCalls, callsAtEnd);
  } finally {
    session.destroy();
  }
});
