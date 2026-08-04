import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNeutralInputFrame,
  type ArenaPublicSupplyProjection,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV1MatchCore,
  createArenaV2SurvivalSupplyMatchCore,
} from '@number-strategy-jump/arena-v1-composition';
import { HeadlessMatchRunner } from '@number-strategy-jump/arena-match';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import {
  createMatchReadBotBundleV2,
  armBotMatchReadTransaction,
  invalidateBotMatchReadBundle,
} from '../../packages/arena-session/src/bot-match-read-bundle.js';
import { LocalMatchSession } from '../../packages/arena-session/src/local-match-session.js';
import type {
  BotInputController,
  LocalMatchPresentationStepResultV2,
  LocalMatchSessionOptions,
} from '../../packages/arena-session/src/local-match-session.js';

const SPAWN_SPECS = Object.freeze([
  Object.freeze({
    slotId: 'left',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'pa4a-left',
    position: Object.freeze({ x: -3, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'center',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'pa4a-center',
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'right',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'pa4a-right',
    position: Object.freeze({ x: 3, y: 1, z: 0 }),
  }),
]);

const ARENA = Object.freeze({
  killY: -4,
  surfaces: Object.freeze([
    Object.freeze({
      id: 'pa4a-platform',
      center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
      halfExtents: Object.freeze({ x: 10, y: 0.5, z: 4 }),
    }),
  ]),
  spawns: Object.freeze([
    Object.freeze({ x: -1, y: 1, z: 0 }),
    Object.freeze({ x: 1, y: 1, z: 0 }),
  ]),
});

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

function publicMatchInfo() {
  return {
    matchSeed: 42,
    opponent: {
      id: 'pa4a-opponent',
      displayName: 'PA4a opponent',
      portraitKey: 'portrait',
      appearanceKey: 'appearance',
    },
  };
}

function ordinaryCore(seed: number, hardLimitTicks = 12, preparingTicks = 0) {
  return createArenaV1MatchCore({
    seed,
    config: {
      preparingTicks,
      suddenDeathStartTick: Math.min(8, hardLimitTicks - 1),
      hardLimitTicks,
    },
  });
}

function survivalCore(seed: number) {
  return createArenaV2SurvivalSupplyMatchCore({
    seed,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 2_400,
      hardLimitTicks: 2_505,
      arena: ARENA,
    },
    supply: {
      supplyDefinitionId: SURVIVAL_CONTRACT.supplyDefinitionId,
      spawnSpecs: SPAWN_SPECS,
    },
  });
}

function descriptor(core: ReturnType<typeof ordinaryCore>, formal: boolean): Record<string, unknown> {
  return {
    schemaVersion: 1,
    compositionId: formal ? 'arena-v2-survival-supply.v1' : 'arena-quick-match.v2',
    participantIds: [...core.config.participantIds],
    mapDefinitionId: core.config.mapDefinitionId,
    contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
    compositionContractHash: formal ? '1234abcd' : null,
  };
}

function createBundle(core: ReturnType<typeof ordinaryCore>, formal = false) {
  return createMatchReadBotBundleV2({
    ownedNewCore: core,
    descriptor: descriptor(core, formal),
    localId: 'player-1',
    botId: 'player-2',
    ...(formal ? { projectionContract: SURVIVAL_CONTRACT } : {}),
  });
}

function createCoreBundleOnly(seed: number, formal = false) {
  const core = formal ? survivalCore(seed) : ordinaryCore(seed);
  return { core, bundle: createBundle(core, formal) };
}

function createController(
  onTrustedInput?: (source: Record<string, unknown>) => void,
): BotInputController {
  let reader: { read(): unknown } | null = null;
  return {
    createInput(snapshot) {
      return createNeutralInputFrame(snapshot.tick, 'player-2');
    },
    attachTrustedCommandSourceReader(candidateReader, _handle) {
      reader = candidateReader as { read(): unknown };
      return true;
    },
    createInputFromTrustedCommandSource() {
      if (reader === null) throw new Error('test command source reader missing');
      const source = reader.read() as Record<string, unknown>;
      onTrustedInput?.(source);
      return createNeutralInputFrame(source.commandTick as number, 'player-2');
    },
    destroy() {},
  };
}

function sessionOptions(
  core: ReturnType<typeof ordinaryCore>,
  controller: BotInputController,
  bundle?: NonNullable<LocalMatchSessionOptions['botMatchReadBundle']>,
  extra: Partial<LocalMatchSessionOptions> = {},
): LocalMatchSessionOptions {
  return {
    core,
    botController: controller,
    ...(bundle === undefined ? {} : { botMatchReadBundle: bundle }),
    publicMatchInfo: publicMatchInfo(),
    ...extra,
  };
}

function neutral(core: ReturnType<typeof ordinaryCore>): ArenaInputFrame {
  return createNeutralInputFrame(core.tick, 'player-1');
}

function legacyWorld(snapshot: Record<string, unknown>): Record<string, unknown> {
  const {
    schemaVersion,
    rngStates: _rngStates,
    participants,
    map,
    ...rest
  } = snapshot;
  const mapRecord = map as Record<string, unknown>;
  return {
    authoritySchemaVersion: schemaVersion,
    activeSupplyProjection: null,
    ...rest,
    participants: (participants as Array<Record<string, unknown>>).map((participant) => {
      const { actionAffordance: _actionAffordance, ...worldParticipant } = participant;
      return worldParticipant;
    }),
    map: {
      ...mapRecord,
      occurrences: (mapRecord.occurrences as Array<Record<string, unknown>>).map((occurrence) => {
        const { privatePlan: _privatePlan, ...publicOccurrence } = occurrence;
        return publicOccurrence;
      }),
    },
  };
}

function destroySession(session: LocalMatchSession | null): void {
  if (session === null) return;
  try {
    session.destroy();
  } catch {
    // The assertions call destroy again where cleanup failure is relevant.
  }
}

test('PA4a ordinary V2 frame shares one authority step and preserves legacy world semantics', () => {
  const v2Core = ordinaryCore(9401);
  const legacyCore = ordinaryCore(9401);
  const v2Bundle = createBundle(v2Core);
  const v2Session = new LocalMatchSession(sessionOptions(v2Core, createController(), v2Bundle));
  const legacySession = new LocalMatchSession(sessionOptions(legacyCore, createController()));
  const nativeGetSnapshot = v2Core.getLegacyFullSnapshotForAudit.bind(v2Core);
  let getSnapshotCalls = 0;
  Object.defineProperty(v2Core, 'getLegacyFullSnapshotForAudit', {
    configurable: true,
    value: () => {
      getSnapshotCalls += 1;
      return nativeGetSnapshot();
    },
  });
  try {
    v2Session.start();
    legacySession.start();
    const before = v2Session.getPresentationReadFrame();
    assert.equal(before.worldSnapshot.tick, 0);
    assert.equal(getSnapshotCalls, 0);
    const v2Result = v2Session.stepWithPresentationReadFrame(neutral(v2Core));
    const legacyResult = legacySession.stepWithLegacySnapshotForAudit(neutral(legacyCore));
    assert.equal(v2Core.tick, 1);
    assert.equal(getSnapshotCalls, 0);
    assert.deepEqual(v2Result.events, legacyResult.events);
    assert.deepEqual(v2Result.input, legacyResult.input);
    assert.deepEqual(v2Result.readFrame.worldSnapshot, legacyWorld(legacyResult.snapshot as Record<string, unknown>));
    assert.equal(v2Result.readFrame.localActionSidecar.participantId, 'player-1');
    assert.equal(Object.isFrozen(v2Result.readFrame), true);
  } finally {
    destroySession(v2Session);
    destroySession(legacySession);
    v2Core.destroy();
    legacyCore.destroy();
  }
});

test('PA4a ordinary V2 reaches the same terminal Replay without legacy snapshot construction', () => {
  const v2Core = ordinaryCore(9406, 4);
  const legacyCore = ordinaryCore(9406, 4);
  const bundle = createBundle(v2Core);
  const v2Controller = createController();
  const legacyController = createController();
  const nativeGetSnapshot = v2Core.getLegacyFullSnapshotForAudit.bind(v2Core);
  let getSnapshotCalls = 0;
  Object.defineProperty(v2Core, 'getLegacyFullSnapshotForAudit', {
    configurable: true,
    value: () => {
      getSnapshotCalls += 1;
      return nativeGetSnapshot();
    },
  });
  const v2Session = new LocalMatchSession(sessionOptions(v2Core, v2Controller, bundle));
  const legacySession = new LocalMatchSession(sessionOptions(legacyCore, legacyController));
  try {
    v2Session.start();
    legacySession.start();
    while (v2Session.state !== 'ended' || legacySession.state !== 'ended') {
      const v2Result = v2Session.stepWithPresentationReadFrame(neutral(v2Core));
      const legacyResult = legacySession.stepWithLegacySnapshotForAudit(neutral(legacyCore));
      assert.deepEqual(v2Result.events, legacyResult.events);
      assert.deepEqual(v2Result.input, legacyResult.input);
      assert.deepEqual(v2Result.readFrame.worldSnapshot, legacyWorld(
        legacyResult.snapshot as Record<string, unknown>,
      ));
      assert.equal(v2Core.getStateHash(), legacyCore.getStateHash());
    }
    assert.equal(getSnapshotCalls, 0);
    assert.equal(v2Core.tick, legacyCore.tick);
    assert.deepEqual(v2Session.exportReplay(), legacySession.exportReplay());
  } finally {
    destroySession(v2Session);
    destroySession(legacySession);
    v2Core.destroy();
    legacyCore.destroy();
  }
});

test('PA4a paused/resume uses stable frame memo and post-step changes identity', () => {
  const core = ordinaryCore(9402);
  const bundle = createBundle(core);
  const session = new LocalMatchSession(sessionOptions(core, createController(), bundle));
  try {
    session.start();
    const initial = session.getPresentationReadFrame();
    session.setPaused(true);
    const paused: LocalMatchPresentationStepResultV2 = session.stepWithPresentationReadFrame();
    assert.strictEqual(paused.readFrame, initial);
    assert.deepEqual(paused.events, []);
    assert.equal(paused.input, null);
    session.setPaused(false);
    assert.strictEqual(session.getPresentationReadFrame(), initial);
    const stepped = session.stepWithPresentationReadFrame(neutral(core));
    assert.notStrictEqual(stepped.readFrame, initial);
    assert.equal(stepped.readFrame.worldSnapshot.tick, 1);
  } finally {
    destroySession(session);
    core.destroy();
  }
});

test('PA5c reports the active explicit step method for legacy and presentation reentry', () => {
  const legacyCore = ordinaryCore(94021);
  const legacyErrors: Error[] = [];
  const legacySessionRef: { current: LocalMatchSession | null } = { current: null };
  const legacyController: BotInputController = {
    createInput(snapshot) {
      for (const operation of [
        () => legacySessionRef.current!.stepWithLegacySnapshotForAudit(),
        () => legacySessionRef.current!.setPaused(true),
        () => legacySessionRef.current!.destroy(),
        () => legacySessionRef.current!.getPresentationReadFrame(),
        () => legacySessionRef.current!.readFullAuditForEvidence(),
      ]) {
        try {
          operation();
        } catch (error) {
          legacyErrors.push(error as Error);
        }
      }
      return createNeutralInputFrame(snapshot.tick, 'player-2');
    },
    destroy() {},
  };
  const legacySession = new LocalMatchSession(sessionOptions(legacyCore, legacyController));
  legacySessionRef.current = legacySession;

  const presentationCore = ordinaryCore(94022);
  const presentationErrors: Error[] = [];
  const presentationSessionRef: { current: LocalMatchSession | null } = { current: null };
  const presentationBundle = createBundle(presentationCore);
  const presentationController = createController(() => {
    for (const operation of [
      () => presentationSessionRef.current!.stepWithPresentationReadFrame(),
      () => presentationSessionRef.current!.setPaused(true),
      () => presentationSessionRef.current!.destroy(),
      () => presentationSessionRef.current!.getPresentationReadFrame(),
      () => presentationSessionRef.current!.readFullAuditForEvidence(),
    ]) {
      try {
        operation();
      } catch (error) {
        presentationErrors.push(error as Error);
      }
    }
  });
  const presentationSession = new LocalMatchSession(
    sessionOptions(presentationCore, presentationController, presentationBundle),
  );
  presentationSessionRef.current = presentationSession;

  try {
    legacySession.start();
    legacySession.stepWithLegacySnapshotForAudit(neutral(legacyCore));
    assert.equal(legacyErrors.length, 5);
    assert.match(legacyErrors[0]!.message, /stepWithLegacySnapshotForAudit\(\).*不可重入/);
    assert.match(legacyErrors[1]!.message, /stepWithLegacySnapshotForAudit\(\).*不能切换暂停/);
    assert.match(legacyErrors[2]!.message, /stepWithLegacySnapshotForAudit\(\).*不能销毁/);
    assert.match(legacyErrors[3]!.message, /stepWithLegacySnapshotForAudit\(\).*不能读取 presentation frame/);
    assert.match(legacyErrors[4]!.message, /stepWithLegacySnapshotForAudit\(\).*不能读取 full-audit/);

    presentationSession.start();
    presentationSession.stepWithPresentationReadFrame(neutral(presentationCore));
    assert.equal(presentationErrors.length, 5);
    assert.match(presentationErrors[0]!.message, /stepWithPresentationReadFrame\(\).*不可重入/);
    assert.match(presentationErrors[1]!.message, /stepWithPresentationReadFrame\(\).*不能切换暂停/);
    assert.match(presentationErrors[2]!.message, /stepWithPresentationReadFrame\(\).*不能销毁/);
    assert.match(presentationErrors[3]!.message, /stepWithPresentationReadFrame\(\).*不能读取 presentation frame/);
    assert.match(presentationErrors[4]!.message, /stepWithPresentationReadFrame\(\).*不能读取 full-audit/);
  } finally {
    destroySession(legacySession);
    legacyCore.destroy();
    destroySession(presentationSession);
    presentationCore.destroy();
  }
});

test('PA4a frame adapter observes created, preparing, running, sudden-death, and ended phases', () => {
  const core = ordinaryCore(9407, 4, 1);
  const bundle = createBundle(core);
  const session = new LocalMatchSession(sessionOptions(core, createController(), bundle));
  try {
    assert.equal(session.state, 'created');
    const phases = new Set<string>([session.getPresentationReadFrame().worldSnapshot.phase]);
    session.start();
    assert.equal(session.state, 'running');
    phases.add(session.getPresentationReadFrame().worldSnapshot.phase);
    while (session.state !== 'ended') {
      const result = session.stepWithPresentationReadFrame(neutral(core));
      phases.add(result.readFrame.worldSnapshot.phase);
    }
    assert.deepEqual(
      [...phases].sort(),
      ['ended', 'preparing', 'running', 'sudden-death'],
    );
    const ended = session.getPresentationReadFrame();
    assert.equal(ended.worldSnapshot.phase, 'ended');
    assert.equal(ended.localActionSidecar.tick, ended.worldSnapshot.tick);
  } finally {
    destroySession(session);
    core.destroy();
  }
});

test('PA4a identity checks use captured native getters and never invoke caller shadows', () => {
  const core = ordinaryCore(9408);
  const bundle = createBundle(core);
  const session = new LocalMatchSession(sessionOptions(core, createController(), bundle));
  try {
    session.start();
    for (const key of ['tick', 'phase'] as const) {
      let getterReads = 0;
      Object.defineProperty(core, key, {
        configurable: true,
        get() {
          getterReads += 1;
          assert.throws(() => session.getPresentationReadFrame(), /原型或 own shadow/);
          throw new Error(`unexpected ${key} getter execution`);
        },
      });
      try {
        assert.throws(() => session.getPresentationReadFrame(), /原型或 own shadow/);
        assert.equal(getterReads, 0);
      } finally {
        delete (core as unknown as Record<string, unknown>)[key];
      }
      assert.doesNotThrow(() => session.getPresentationReadFrame());
    }

    const prototype = Object.getPrototypeOf(core) as object;
    const originalPhase = Object.getOwnPropertyDescriptor(prototype, 'phase');
    if (originalPhase === undefined || typeof originalPhase.get !== 'function') {
      throw new Error('MatchCore.prototype.phase native getter missing');
    }
    let prototypeGetterReads = 0;
    Object.defineProperty(prototype, 'phase', {
      configurable: originalPhase.configurable === true,
      enumerable: originalPhase.enumerable === true,
      get() {
        prototypeGetterReads += 1;
        throw new Error('unexpected phase prototype getter execution');
      },
    });
    try {
      assert.throws(() => session.getPresentationReadFrame(), /原型或 own shadow/);
      assert.equal(prototypeGetterReads, 0);
    } finally {
      Object.defineProperty(prototype, 'phase', originalPhase);
    }
    assert.doesNotThrow(() => session.getPresentationReadFrame());
  } finally {
    destroySession(session);
    core.destroy();
  }
});

test('PA4a refuses legacy sessions and rejects active transaction/reentry without fallback snapshot', () => {
  const legacyCore = ordinaryCore(9403);
  const legacy = new LocalMatchSession(sessionOptions(legacyCore, createController()));
  try {
    assert.throws(() => legacy.getPresentationReadFrame(), /需要 botMatchReadBundle/);
    assert.throws(() => legacy.stepWithPresentationReadFrame(), /需要 botMatchReadBundle/);
  } finally {
    destroySession(legacy);
    legacyCore.destroy();
  }

  let session: LocalMatchSession | null = null;
  const core = ordinaryCore(9404);
  const bundle = createBundle(core);
  const controller = createController(() => {
    assert.ok(session);
    assert.throws(() => session!.getPresentationReadFrame(), /stepWithPresentationReadFrame\(\) 期间/);
  });
  session = new LocalMatchSession(sessionOptions(core, controller, bundle));
  try {
    session.start();
    const transaction = armBotMatchReadTransaction(bundle, core, 'player-1', 'player-2');
    assert.throws(() => session.getPresentationReadFrame(), /Bot transaction/);
    assert.deepEqual(transaction.classifyFailure(), { retryable: false, fatal: true });
    assert.throws(() => session.stepWithPresentationReadFrame(neutral(core)), /失效|provenance/);
  } finally {
    destroySession(session);
    core.destroy();
  }
});

test('PA4a presentation frame read rejects synchronous controller reentry and recovers', () => {
  let session: LocalMatchSession | null = null;
  let reentryAttempts = 0;
  const core = ordinaryCore(9411);
  const bundle = createBundle(core);
  const controller = createController(() => {
    reentryAttempts += 1;
    assert.ok(session);
    assert.throws(() => session!.getPresentationReadFrame(), /stepWithPresentationReadFrame\(\) 期间/);
  });
  session = new LocalMatchSession(sessionOptions(core, controller, bundle));
  try {
    session.start();
    const result = session.stepWithPresentationReadFrame(neutral(core));
    assert.equal(result.readFrame.worldSnapshot.tick, 1);
    assert.equal(reentryAttempts, 1);
    assert.equal(session.state, 'running');
    assert.doesNotThrow(() => session.getPresentationReadFrame());
  } finally {
    destroySession(session);
    core.destroy();
  }
});

test('PA4a frame reads reject foreign, cloned, and wrong-participant bundles before any snapshot fallback', () => {
  const first = createCoreBundleOnly(9409);
  const second = createCoreBundleOnly(9410);
  const controller = createController();
  const cases: Array<{
    readonly core: typeof first.core;
    readonly bundle: NonNullable<LocalMatchSessionOptions['botMatchReadBundle']>;
    readonly extra?: Partial<LocalMatchSessionOptions>;
  }> = [
    { core: first.core, bundle: second.bundle },
    { core: first.core, bundle: { ...first.bundle } },
    {
      core: first.core,
      bundle: first.bundle,
      extra: { playerParticipantId: 'player-2', botParticipantId: 'player-1' },
    },
  ];
  try {
    for (const candidate of cases) {
      const candidateController = createController();
      assert.throws(
        () => new LocalMatchSession(sessionOptions(
          candidate.core,
          candidateController,
          candidate.bundle,
          candidate.extra,
        )),
        /provenance/,
      );
      candidateController.destroy();
    }
    assert.doesNotThrow(() => controller.destroy());
    assert.equal(first.core.getLegacyFullSnapshotForAudit().tick, 0);
    assert.equal(second.core.getLegacyFullSnapshotForAudit().tick, 0);
  } finally {
    first.core.destroy();
    second.core.destroy();
  }
});

test('PA4a formal frame retains projection and strict identity across supply boundaries', () => {
  const v2Core = survivalCore(9405);
  const legacyCore = survivalCore(9405);
  const bundle = createBundle(v2Core, true);
  const v2Session = new LocalMatchSession(sessionOptions(v2Core, createController(), bundle));
  const legacySession = new LocalMatchSession(sessionOptions(legacyCore, createController()));
  try {
    v2Session.start();
    legacySession.start();
    const expectedTicks = [
      599, 600, 601,
      1_199, 1_200, 1_201,
      1_799, 1_800, 1_801,
      2_399, 2_400, 2_401,
    ];
    let frame = v2Session.getPresentationReadFrame();
    assert.ok(frame.worldSnapshot.activeSupplyProjection !== null);
    assert.equal(frame.worldSnapshot.tick, 0);
    assert.deepEqual(frame.worldSnapshot, legacyWorld(legacySession.getLegacyFullSnapshotForAudit() as Record<string, unknown>));
    for (const tick of expectedTicks) {
      while (frame.worldSnapshot.tick < tick) {
        const v2Result = v2Session.stepWithPresentationReadFrame(neutral(v2Core));
        const legacyResult = legacySession.stepWithLegacySnapshotForAudit(neutral(legacyCore));
        frame = v2Result.readFrame;
        assert.deepEqual(v2Result.events, legacyResult.events);
        assert.deepEqual(v2Result.input, legacyResult.input);
        assert.equal(v2Core.getStateHash(), legacyCore.getStateHash());
      }
      const legacySnapshot = legacySession.getLegacyFullSnapshotForAudit() as Record<string, unknown>;
      const projection: ArenaPublicSupplyProjection | null = (
        frame.worldSnapshot.activeSupplyProjection as ArenaPublicSupplyProjection | null
      );
      if (projection === null) throw new Error(`formal projection missing at tick ${tick}`);
      const legacyProjection = legacySnapshot.activeSupplyProjection as ArenaPublicSupplyProjection;
      assert.deepEqual(projection, legacyProjection, `projection parity at snapshot tick ${tick}`);
      assert.deepEqual(frame.worldSnapshot, legacyWorld(legacySnapshot));
      const visibleWorldEquipmentIds = frame.worldSnapshot.equipment
        .filter(({ locationState }) => locationState === 'spawned' || locationState === 'dropped')
        .map(({ instanceId }) => instanceId)
        .sort();
      const projectedEquipmentIds = projection.supplies
        .map(({ equipmentInstanceId }) => equipmentInstanceId)
        .sort();
      assert.deepEqual(
        visibleWorldEquipmentIds,
        projectedEquipmentIds,
        `world/projection equipment parity at snapshot tick ${tick}`,
      );
      assert.equal(
        projection.supplies.some(({ remainingTicks, expireTick }) => (
          remainingTicks !== expireTick - tick
        )),
        false,
        `remainingTicks must be derived from the same snapshot tick ${tick}`,
      );
      assert.equal(
        projection.pendingExpiryEquipmentInstanceIds.some((instanceId) => (
          visibleWorldEquipmentIds.includes(instanceId)
        )),
        false,
        `pending expiry equipment must not be visible at snapshot tick ${tick}`,
      );
      if ([599, 600, 601, 1_200, 1_800, 2_400].includes(tick)) {
        assert.equal(projection.supplies.length, 0, `pre-phase snapshot ${tick} must be empty`);
      }
      if ([1_201, 2_401].includes(tick)) {
        assert.ok(projection.supplies.length > 0, `post-spawn snapshot ${tick} must expose active supplies`);
        assert.equal(
          projection.supplies.every(({ remainingTicks }) => remainingTicks === 599),
          true,
          `post-spawn snapshot ${tick} must expose only remainingTicks=599`,
        );
      }
      if ([1_799].includes(tick)) {
        assert.ok(projection.supplies.length > 0, `pre-expiry snapshot ${tick} must expose active supplies`);
        assert.equal(
          projection.supplies.every(({ remainingTicks }) => remainingTicks === 1),
          true,
          `pre-expiry snapshot ${tick} must expose only remainingTicks=1`,
        );
      }
      if ([1_801].includes(tick)) {
        assert.deepEqual(projection.supplies, []);
        assert.deepEqual(projection.pendingExpiryEquipmentInstanceIds, []);
      }
      assert.equal(frame.localActionSidecar.tick, frame.worldSnapshot.tick);
      assert.equal(frame.localActionSidecar.eventSequence, frame.worldSnapshot.eventSequence);
      const legacyParticipant = (legacySnapshot.participants as Array<Record<string, unknown>>)
        .find(({ id }) => id === 'player-1');
      assert.ok(legacyParticipant);
      const legacyAffordance = legacyParticipant.actionAffordance as Record<string, unknown>;
      const legacyChannels = legacyAffordance.channels as Record<string, unknown>;
      assert.deepEqual(frame.localActionSidecar.channels, {
        primary: legacyChannels.primary,
        primaryHold: legacyChannels.primaryHold,
      });
      assert.equal(
        frame.localActionSidecar.primaryActionDefinitionId,
        legacyAffordance.primaryActionDefinitionId,
      );
      if (tick === 1_800) {
        assert.ok(projection.pendingExpiryEquipmentInstanceIds.length > 0);
        assert.equal(
          frame.worldSnapshot.equipment.some(({ instanceId }) => (
            projection.pendingExpiryEquipmentInstanceIds.includes(instanceId)
          )),
          false,
        );
      }
    }
    assert.equal(frame.worldSnapshot.tick, 2_401);
    assert.equal(frame.worldSnapshot.equipment.some((equipment) => equipment.locationState === 'held'), false);
  } finally {
    destroySession(v2Session);
    destroySession(legacySession);
    v2Core.destroy();
    legacyCore.destroy();
  }
});

test('PA4a post-authority frame failure cleans up once and invalidates the bundle', () => {
  const core = ordinaryCore(9412);
  const bundle = createBundle(core);
  const controller = createController();
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
  const runnerPrototype = HeadlessMatchRunner.prototype;
  const runnerDescriptor = Object.getOwnPropertyDescriptor(
    runnerPrototype,
    'stepTrustedInputFrameBatch',
  );
  assert.ok(runnerDescriptor && 'value' in runnerDescriptor);
  const nativeRunnerStep = runnerDescriptor.value as (this: object, batch: unknown) => unknown;
  Object.defineProperty(runnerPrototype, 'stepTrustedInputFrameBatch', {
    ...runnerDescriptor,
    value(this: object, batch: unknown) {
      const events = Reflect.apply(nativeRunnerStep, this, [batch]);
      invalidateBotMatchReadBundle(bundle, core, 'player-1', 'player-2');
      return events;
    },
  });
  try {
    session.start();
    assert.throws(
      () => session.stepWithPresentationReadFrame(neutral(core)),
      /presentation frame|provenance|失效/,
    );
    assert.equal(core.tick, 1, 'authority step 已发生，失败必须按 post-read fatal 处理');
    assert.equal(session.state, 'destroyed');
    assert.equal(botDestroyCalls, 1);
    assert.equal(coreDestroyCalls, 1);
    assert.throws(() => session.getPresentationReadFrame(), /已销毁/);
    session.destroy();
    assert.equal(botDestroyCalls, 1);
    assert.equal(coreDestroyCalls, 1);
  } finally {
    Object.defineProperty(runnerPrototype, 'stepTrustedInputFrameBatch', runnerDescriptor);
    if (session.state !== 'destroyed') destroySession(session);
    if (coreDestroyCalls === 0) core.destroy();
  }
});

test('PA4a destroy cleanup failure is retryable without double-destroying completed owners', () => {
  const core = ordinaryCore(9413);
  const bundle = createBundle(core);
  const controller = createController();
  let botDestroyCalls = 0;
  let coreDestroyCalls = 0;
  let throwOnBotDestroy = true;
  const nativeBotDestroy = controller.destroy.bind(controller);
  const nativeCoreDestroy = core.destroy.bind(core);
  Object.defineProperty(controller, 'destroy', {
    configurable: true,
    value: () => {
      botDestroyCalls += 1;
      if (throwOnBotDestroy) {
        throwOnBotDestroy = false;
        throw new Error('injected Bot cleanup failure');
      }
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
    assert.throws(() => session.destroy(), /清理未完整完成/);
    assert.equal(session.state, 'destroyed');
    assert.equal(botDestroyCalls, 1);
    assert.equal(coreDestroyCalls, 1);
    assert.throws(() => session.getPresentationReadFrame(), /已销毁/);
    assert.doesNotThrow(() => session.destroy());
    assert.equal(botDestroyCalls, 2, '失败的 Bot cleanup 只允许一次明确重试');
    assert.equal(coreDestroyCalls, 1, '已完成的 Core cleanup 不得重复执行');
    assert.doesNotThrow(() => session.destroy());
    assert.equal(botDestroyCalls, 2);
    assert.equal(coreDestroyCalls, 1);
  } finally {
    if (session.state !== 'destroyed') destroySession(session);
    if (coreDestroyCalls === 0) core.destroy();
  }
});

test('PA4a rejects extra step arguments and reads ended frame without creating a second step', () => {
  const core = ordinaryCore(9406, 4);
  const bundle = createBundle(core);
  const session = new LocalMatchSession(sessionOptions(core, createController(), bundle));
  try {
    session.start();
    assert.throws(
      () => Reflect.apply(session.stepWithPresentationReadFrame, session, [null, null]),
      /只接受一个 input/,
    );
    while (session.state !== 'ended') session.stepWithPresentationReadFrame(neutral(core));
    const ended = session.getPresentationReadFrame();
    assert.equal(ended.worldSnapshot.phase, 'ended');
    assert.equal(core.tick, 4);
    assert.throws(() => session.stepWithPresentationReadFrame(neutral(core)), /ended/);
  } finally {
    destroySession(session);
    core.destroy();
  }
});
