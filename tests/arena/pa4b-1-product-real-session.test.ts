import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMatchContentSelection,
} from '@number-strategy-jump/arena-contracts';
import {
  validateProductMatchResult,
} from '@number-strategy-jump/arena-product-contracts';
import {
  BOT_PROFILE_REGISTRY,
} from '@number-strategy-jump/arena-bot';
import {
  ARENA_V1_MATCH_CONTENT_CATALOG,
} from '@number-strategy-jump/arena-product-v1-content';
import {
  ProductMatchCoordinator,
  ProductMatchRuntime,
} from '@number-strategy-jump/arena-product-match';
import {
  ArenaV1QuickMatchService,
  createArenaV2SurvivalSupplyBotSession,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';

const CATALOG = ARENA_V1_MATCH_CONTENT_CATALOG.toJSON();
const CONTENT = createMatchContentSelection({
  schemaVersion: 1,
  contentDefinitionId: 'pa4b-1.real-content',
  contentVersion: 1,
  characterDefinitionIds: CATALOG.characterIds,
  equipmentDefinitionIds: CATALOG.equipmentIds,
  mapDefinitionIds: CATALOG.mapIds,
  selectedMapDefinitionId: CATALOG.mapIds[0],
  participantCharacters: [
    { participantId: 'player-1', definitionId: CATALOG.characterIds[0] },
    { participantId: 'player-2', definitionId: CATALOG.characterIds[0] },
  ],
});

const CUSTOM_ARENA = Object.freeze({
  killY: -4,
  surfaces: Object.freeze([
    Object.freeze({
      id: 'pa4b-1-platform',
      center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
      halfExtents: Object.freeze({ x: 10, y: 0.5, z: 4 }),
    }),
  ]),
  spawns: Object.freeze([
    Object.freeze({ x: -1, y: 1, z: 0 }),
    Object.freeze({ x: 1, y: 1, z: 0 }),
  ]),
});

const SUPPLY_SPECS = Object.freeze([
  Object.freeze({
    slotId: 'left',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'pa4b-1-left',
    position: Object.freeze({ x: -8, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'center',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'pa4b-1-center',
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'right',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'pa4b-1-right',
    position: Object.freeze({ x: 8, y: 1, z: 0 }),
  }),
]);

const SUPPLY = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  spawnSpecs: SUPPLY_SPECS,
});

const OPPONENT = Object.freeze({
  id: 'player-2',
  displayName: 'PA4b-1 Bot',
  portraitKey: 'pa4b-1-portrait',
  appearanceKey: 'pa4b-1-appearance',
});

function ordinaryMatch(seed: number, hardLimitTicks = 12): {
  readonly service: ArenaV1QuickMatchService;
  readonly match: ReturnType<ArenaV1QuickMatchService['create']>;
} {
  const service = new ArenaV1QuickMatchService({
    seedSource: { nextSeed: () => seed },
    contentPoolProvider: {
      resolve: ({ matchSeed }: { readonly matchSeed: number }) => ({ matchSeed, selection: CONTENT }),
    },
  });
  const match = service.create({
    matchSeed: seed,
    config: {
      preparingTicks: 1,
      suddenDeathStartTick: Math.max(2, hardLimitTicks - 4),
      hardLimitTicks,
    },
  });
  return { service, match };
}

function survivalOptions(
  seed: number,
  hardLimitTicks: number,
  includeContentSelection: boolean,
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    preparingTicks: 1,
    suddenDeathStartTick: hardLimitTicks <= 100
      ? Math.max(2, hardLimitTicks - 4)
      : Math.min(2_400, hardLimitTicks - 5),
    hardLimitTicks,
    arena: CUSTOM_ARENA,
  };
  if (includeContentSelection) {
    // The short Product terminal uses the registered map and therefore has a
    // replay contentSelection.  The long boundary run deliberately uses the
    // custom no-occurrence arena, whose replay contentSelection is null.
    delete config.arena;
    config.contentSelection = CONTENT;
  }
  return {
    seed,
    config,
    supply: SUPPLY,
    bot: {
      participantId: 'player-2',
      difficultyId: 'normal',
      behaviorSeed: 0x12003456,
      personalitySeed: 0x5600789a,
      profileRegistry: BOT_PROFILE_REGISTRY,
    },
    publicMatchInfo: Object.freeze({
      matchSeed: seed,
      opponent: OPPONENT,
    }),
  };
}

function survivalSession(
  seed: number,
  hardLimitTicks: number,
  includeContentSelection: boolean,
): ReturnType<typeof createArenaV2SurvivalSupplyBotSession> {
  return createArenaV2SurvivalSupplyBotSession(
    survivalOptions(seed, hardLimitTicks, includeContentSelection),
  );
}

type RealSession = ReturnType<typeof createArenaV2SurvivalSupplyBotSession>;

interface SessionHandle {
  readonly session: RealSession;
  cleanup(): void;
}

interface ProductLocalMatch {
  readonly matchSeed: number;
  readonly opponent: unknown;
  readonly content: unknown;
  readonly session: RealSession;
}

function legacyWorld(snapshot: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const source = { ...snapshot };
  const participants = (source.participants as readonly Readonly<Record<string, unknown>>[]).map(
    (participant) => {
      const { actionAffordance: _actionAffordance, ...withoutAffordance } = participant;
      return withoutAffordance;
    },
  );
  delete source.schemaVersion;
  return Object.freeze({
    authoritySchemaVersion: snapshot.schemaVersion,
    ...source,
    participants: Object.freeze(participants),
    activeSupplyProjection: source.activeSupplyProjection ?? null,
  });
}

function assertReadFrameParity(
  legacySnapshot: Readonly<Record<string, unknown>>,
  v2Frame: Readonly<Record<string, unknown>>,
  label: string,
): void {
  assert.deepEqual(
    v2Frame.worldSnapshot,
    legacyWorld(legacySnapshot),
    `${label}: V2 world must recompose the legacy public world`,
  );
  const legacyParticipants = legacySnapshot.participants as readonly Readonly<Record<string, unknown>>[];
  const localParticipant = legacyParticipants.find(({ id }) => id === 'player-1');
  assert.ok(localParticipant, `${label}: local participant exists`);
  const legacyAffordance = localParticipant.actionAffordance as Readonly<Record<string, unknown>>;
  const sidecar = v2Frame.localActionSidecar as Readonly<Record<string, unknown>>;
  const channels = sidecar.channels as Readonly<Record<string, unknown>>;
  const legacyChannels = legacyAffordance.channels as Readonly<Record<string, unknown>>;
  assert.deepEqual(channels.primary, legacyChannels.primary, `${label}: primary channel parity`);
  assert.deepEqual(channels.primaryHold, legacyChannels.primaryHold, `${label}: primaryHold parity`);
  assert.equal(
    sidecar.primaryActionDefinitionId,
    legacyAffordance.primaryActionDefinitionId,
    `${label}: primary display identity parity`,
  );
}

function assertSupplyBoundary(
  frame: Readonly<Record<string, unknown>>,
  tick: number,
): void {
  const world = frame.worldSnapshot as Readonly<Record<string, unknown>>;
  const projection = world.activeSupplyProjection as Readonly<Record<string, unknown>>;
  assert.ok(projection, `formal projection exists at tick ${tick}`);
  const supplies = projection.supplies as readonly Readonly<Record<string, unknown>>[];
  const pending = projection.pendingExpiryEquipmentInstanceIds as readonly string[];
  if ([599, 600, 601, 1199, 1200, 1800, 1801, 2399, 2400].includes(tick)) {
    assert.equal(supplies.length, 0, `formal supply must be empty at tick ${tick}`);
  }
  if (tick === 1201 || tick === 2401) {
    assert.ok(supplies.length > 0, `formal supply must be visible at tick ${tick}`);
    assert.ok(supplies.every(({ remainingTicks }) => remainingTicks === 599));
  }
  if (tick === 1799) {
    assert.ok(supplies.length > 0, 'formal supply must be visible immediately before expiry');
    assert.ok(supplies.every(({ remainingTicks }) => remainingTicks === 1));
  }
  if (tick === 1800) {
    assert.ok(pending.length > 0, 'formal pending expiry must be visible at the boundary');
    assert.equal(
      supplies.some(({ equipmentInstanceId }) => pending.includes(equipmentInstanceId as string)),
      false,
    );
  }
}

function runSessionPair(
  createSession: () => SessionHandle,
  label: string,
  boundaryTicks: readonly number[] = [],
): void {
  const legacyHandle = createSession();
  const v2Handle = createSession();
  const legacy = legacyHandle.session;
  const v2 = v2Handle.session;
  const phases = new Set<string>();
  try {
    const initialPhase = (legacy.getLegacyFullSnapshotForAudit() as Readonly<Record<string, unknown>>).phase as string;
    phases.add(initialPhase);
    assert.equal(initialPhase, 'preparing', `${label}: initial preparing phase observed`);
    legacy.start();
    v2.start();

    const initialV2Frame = v2.getPresentationReadFrame();
    assertReadFrameParity(legacy.getLegacyFullSnapshotForAudit(), initialV2Frame, `${label} initial`);
    const pausedLegacy = legacy.getLegacyFullSnapshotForAudit();
    const pausedV2 = v2.getPresentationReadFrame();
    v2.setPaused(true);
    const stableA = v2.getPresentationReadFrame();
    const stableB = v2.getPresentationReadFrame();
    assert.strictEqual(stableA, pausedV2, `${label}: pause keeps the same frame identity`);
    assert.strictEqual(stableA, stableB, `${label}: paused frame memo`);
    assert.deepEqual(stableA, pausedV2, `${label}: pause does not mutate frame`);
    legacy.setPaused(true);
    assert.deepEqual(legacy.stepWithLegacySnapshotForAudit(null).events, []);
    assert.deepEqual(legacy.getLegacyFullSnapshotForAudit(), pausedLegacy);
    v2.setPaused(false);
    legacy.setPaused(false);
    const resumedLegacy = legacy.stepWithLegacySnapshotForAudit(null);
    const resumedV2 = v2.stepWithPresentationReadFrame(null);
    assert.deepEqual(resumedLegacy.events, resumedV2.events, `${label}: resume events`);
    assert.deepEqual(resumedLegacy.input, resumedV2.input, `${label}: resume input`);
    assertReadFrameParity(resumedLegacy.snapshot, resumedV2.readFrame, `${label} resume`);
    assert.notStrictEqual(resumedV2.readFrame, pausedV2, `${label}: resumed step advances identity`);
    phases.add(resumedLegacy.snapshot.phase);

    while (legacy.state !== 'ended' || v2.state !== 'ended') {
      assert.equal(legacy.state, v2.state, `${label}: state parity before step`);
      const legacyStep = legacy.stepWithLegacySnapshotForAudit(null);
      const v2Step = v2.stepWithPresentationReadFrame(null);
      assert.deepEqual(v2Step.events, legacyStep.events, `${label}: event payload parity at ${legacyStep.snapshot.tick}`);
      assert.deepEqual(v2Step.input, legacyStep.input, `${label}: InputFrame parity at ${legacyStep.snapshot.tick}`);
      assertReadFrameParity(legacyStep.snapshot, v2Step.readFrame, `${label} tick ${legacyStep.snapshot.tick}`);
      phases.add(legacyStep.snapshot.phase);
      if (boundaryTicks.includes(legacyStep.snapshot.tick)) {
        assertSupplyBoundary(v2Step.readFrame, legacyStep.snapshot.tick);
      }
    }
    assert.equal(legacy.state, 'ended');
    assert.equal(v2.state, 'ended');
    assert.ok(phases.has('running'), `${label}: running phase observed`);
    assert.ok(phases.has('sudden-death'), `${label}: sudden-death phase observed`);
    assert.ok(phases.has('ended'), `${label}: ended phase observed`);
    const legacyReplay = legacy.exportReplay();
    const v2Replay = v2.exportReplay();
    assert.deepEqual(v2Replay, legacyReplay, `${label}: Replay V5 parity`);
    assert.equal(v2Replay.finalHash, legacyReplay.finalHash, `${label}: final state hash parity`);
    assert.deepEqual(v2Replay.checkpoints, legacyReplay.checkpoints, `${label}: checkpoint parity`);
  } finally {
    const cleanupErrors: unknown[] = [];
    for (const handle of [legacyHandle, v2Handle]) {
      try {
        handle.session.destroy();
      } catch (error) {
        cleanupErrors.push(error);
      }
      try {
        handle.cleanup();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    assert.equal(cleanupErrors.length, 0, `${label}: test resource cleanup`);
  }
}

function runProductCoordinator(
  createLocalMatch: () => {
    readonly service: ArenaV1QuickMatchService;
    readonly match: ProductLocalMatch;
  },
  label: string,
): Promise<void> {
  const { service, match } = createLocalMatch();
  const completions: unknown[] = [];
  const runtime = new ProductMatchRuntime(match, {
    completionSink: (completion) => {
      completions.push(completion);
    },
  });
  const coordinator = new ProductMatchCoordinator({
    matchFactory: {
      create: () => runtime,
    },
  });
  return (async () => {
    try {
      await coordinator.prepare();
      const started = coordinator.startWithReadFrame();
      assert.equal(started.readFrame.worldSnapshot.matchSeed, match.matchSeed, `${label}: start seed`);
      const paused = coordinator.setPaused(true);
      const pausedFrame = coordinator.getMatchReadFrame();
      assert.ok(pausedFrame);
      assert.equal(pausedFrame, coordinator.getMatchReadFrame(), `${label}: paused memo`);
      assert.equal(paused.paused, true);
      coordinator.setPaused(false);
      let lastTick = started.readFrame.worldSnapshot.tick;
      while (coordinator.state === 'running') {
        const step = coordinator.stepWithReadFrame(null);
        assert.ok(step.readFrame.worldSnapshot.tick > lastTick, `${label}: one tick per V2 step`);
        lastTick = step.readFrame.worldSnapshot.tick;
      }
      assert.equal(coordinator.state, 'result', `${label}: terminal coordinator state`);
      const result = coordinator.getResult();
      assert.ok(result);
      assert.equal(completions.length, 1, `${label}: completion sink exactly once`);
      const completion = completions[0] as {
        readonly result: typeof result;
        readonly replay: Readonly<Record<string, unknown>>;
      } | undefined;
      assert.ok(completion, `${label}: completion exists`);
      assert.strictEqual(completion.result, result, `${label}: completion result identity`);
      const finalReplay = match.session.exportReplay() as unknown as Readonly<Record<string, unknown>>;
      const completionReplay = completion.replay as Readonly<{
        readonly checkpoints: unknown;
        readonly finalHash: unknown;
      }>;
      assert.deepEqual(completionReplay, finalReplay, `${label}: completion replay parity`);
      assert.deepEqual(
        completionReplay.checkpoints,
        finalReplay.checkpoints,
        `${label}: completion checkpoints parity`,
      );
      assert.equal(
        completionReplay.finalHash,
        finalReplay.finalHash,
        `${label}: completion final hash parity`,
      );
      assert.equal(
        result.authorityIdentity.finalHash,
        finalReplay.finalHash,
        `${label}: result authority final hash parity`,
      );
      assert.deepEqual(
        validateProductMatchResult(result),
        result,
        `${label}: result authority hash/content validation`,
      );
      coordinator.destroy();
      coordinator.destroy();
    } finally {
      try {
        coordinator.destroy();
      } catch {
        // The assertion path above is responsible for the exact-once check.
      }
      service.destroy();
    }
  })();
}

async function runProductRuntimePair(
  createLocalMatch: () => {
    readonly service: ArenaV1QuickMatchService;
    readonly match: ProductLocalMatch;
  },
  label: string,
): Promise<void> {
  const legacyLocal = createLocalMatch();
  const v2Local = createLocalMatch();
  const legacyCompletions: unknown[] = [];
  const v2Completions: unknown[] = [];
  const legacyRuntime = new ProductMatchRuntime(legacyLocal.match, {
    completionSink: (completion) => { legacyCompletions.push(completion); },
  });
  const v2Runtime = new ProductMatchRuntime(v2Local.match, {
    completionSink: (completion) => { v2Completions.push(completion); },
  });
  const legacyCoordinator = new ProductMatchCoordinator({
    matchFactory: { create: () => legacyRuntime },
  });
  const v2Coordinator = new ProductMatchCoordinator({
    matchFactory: { create: () => v2Runtime },
  });
  try {
    await Promise.all([legacyCoordinator.prepare(), v2Coordinator.prepare()]);
    const legacyStarted = legacyCoordinator.startWithReadFrame();
    const v2Started = v2Coordinator.startWithReadFrame();
    assert.ok(legacyStarted.readFrame, `${label}: legacy start frame exists`);
    assert.deepEqual(legacyStarted.readFrame, v2Started.readFrame, `${label} start frame parity`);

    while (legacyCoordinator.state === 'running') {
      assert.equal(v2Coordinator.state, 'running', `${label}: V2 state parity before step`);
      const legacyStep = legacyCoordinator.stepWithReadFrame(null);
      const v2Step = v2Coordinator.stepWithReadFrame(null);
      assert.deepEqual(v2Step.events, legacyStep.events, `${label}: Product event parity`);
      assert.deepEqual(legacyStep.readFrame, v2Step.readFrame, `${label} Product frame parity`);
    }
    assert.equal(legacyCoordinator.state, 'result', `${label}: legacy Product result state`);
    assert.equal(v2Coordinator.state, 'result', `${label}: V2 Product result state`);
    assert.deepEqual(v2Coordinator.getResult(), legacyCoordinator.getResult(), `${label}: Product result parity`);
    assert.deepEqual(
      v2Local.match.session.exportReplay(),
      legacyLocal.match.session.exportReplay(),
      `${label}: Product replay parity`,
    );
    assert.equal(legacyCompletions.length, 1, `${label}: legacy completion exactly once`);
    assert.equal(v2Completions.length, 1, `${label}: V2 completion exactly once`);
    assert.deepEqual(v2Completions[0], legacyCompletions[0], `${label}: completion parity`);
  } finally {
    for (const coordinator of [legacyCoordinator, v2Coordinator]) {
      try {
        coordinator.destroy();
      } catch {
        // The parity assertions own the primary failure; cleanup remains best effort here.
      }
    }
    legacyLocal.service.destroy();
    v2Local.service.destroy();
  }
}

function formalProductMatch(seed: number): {
  readonly service: ArenaV1QuickMatchService;
  readonly match: ProductLocalMatch;
} {
  const service = new ArenaV1QuickMatchService({
    seedSource: { nextSeed: () => seed },
    contentPoolProvider: {
      resolve: ({ matchSeed }: { readonly matchSeed: number }) => ({ matchSeed, selection: CONTENT }),
    },
  });
  const session = survivalSession(seed, 12, true);
  return {
    service,
    match: {
      matchSeed: seed,
      opponent: OPPONENT,
      content: CONTENT,
      session,
    },
  };
}

test('PA4b-1 real ordinary V2 Session matches legacy and reaches a Product terminal', async () => {
  runSessionPair(
    () => {
      const { service, match } = ordinaryMatch(4411);
      return {
        session: match.session,
        cleanup: () => service.destroy(),
      };
    },
    'ordinary',
  );
  await runProductRuntimePair(() => ordinaryMatch(4413), 'ordinary Product legacy/V2');
  await runProductCoordinator(() => ordinaryMatch(4412), 'ordinary Product Coordinator');
});

test('PA4b-1 real formal survival V2 Session matches legacy through supply lifecycle and terminal', () => {
  runSessionPair(
    () => ({
      session: survivalSession(4421, 2_405, false),
      cleanup: () => undefined,
    }),
    'formal survival',
    [599, 600, 601, 1_199, 1_200, 1_201, 1_799, 1_800, 1_801, 2_399, 2_400, 2_401],
  );
});

test('PA4b-1 formal Product Coordinator uses replay-matching content metadata for terminal output', async () => {
  await runProductRuntimePair(() => formalProductMatch(4422), 'formal Product legacy/V2');
  await runProductCoordinator(() => formalProductMatch(4423), 'formal Product Coordinator');
});
