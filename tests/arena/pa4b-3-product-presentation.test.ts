import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMatchContentPublicView,
  createMatchContentSelection,
  normalizeInputFrame,
  createNeutralInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  createProductMatchResult,
  createProductPublicMatchInfo,
} from '@number-strategy-jump/arena-product-contracts';
import {
  ProductMatchCoordinator,
  ProductMatchRuntime,
} from '@number-strategy-jump/arena-product-match';
import { ProductSessionController } from '@number-strategy-jump/arena-product-session';
import {
  ProductSessionStateMachine,
} from '@number-strategy-jump/arena-product-state';
import { BOT_PROFILE_REGISTRY } from '@number-strategy-jump/arena-bot';
import { ARENA_V1_MATCH_CONTENT_CATALOG } from '@number-strategy-jump/arena-product-v1-content';
import {
  ArenaV1QuickMatchService,
  createArenaV1ProductSession,
  createArenaV2SurvivalSupplyBotSession,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import {
  ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
  projectArenaPresentationFrameV2,
} from '@number-strategy-jump/arena-v1-presentation-content';
import {
  ProductMatchPresentationRuntime,
  PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE,
  type ProductMatchPresentationProjectorOptions,
} from '@number-strategy-jump/arena-product-presentation';

const CONTENT = createMatchContentPublicView({
  schemaVersion: 1,
  contentDefinitionId: 'pa4b-3-runtime-content',
  contentVersion: 1,
  characterDefinitionIds: ['parkour-apprentice', 'wind-up-cube'],
  equipmentDefinitionIds: [],
  mapDefinitionIds: ['arena-v1'],
  selectedMapDefinitionId: 'arena-v1',
  participantCharacters: [
    { participantId: 'player-1', definitionId: 'parkour-apprentice' },
    { participantId: 'player-2', definitionId: 'wind-up-cube' },
  ],
});

const AUTHORITY_CONTENT = createMatchContentSelection({
  schemaVersion: 1,
  contentDefinitionId: 'pa4b-3-authority-content',
  contentVersion: 1,
  characterDefinitionIds: ARENA_V1_MATCH_CONTENT_CATALOG.toJSON().characterIds,
  equipmentDefinitionIds: ARENA_V1_MATCH_CONTENT_CATALOG.toJSON().equipmentIds,
  mapDefinitionIds: ARENA_V1_MATCH_CONTENT_CATALOG.toJSON().mapIds,
  selectedMapDefinitionId: ARENA_V1_MATCH_CONTENT_CATALOG.toJSON().mapIds[0],
  participantCharacters: [
    { participantId: 'player-1', definitionId: ARENA_V1_MATCH_CONTENT_CATALOG.toJSON().characterIds[0] },
    { participantId: 'player-2', definitionId: ARENA_V1_MATCH_CONTENT_CATALOG.toJSON().characterIds[0] },
  ],
});

const PUBLIC_INFO = createProductPublicMatchInfo({
  matchSeed: 7703,
  opponent: {
    id: 'player-2',
    displayName: 'V2 opponent',
    portraitKey: 'portrait-v2',
    appearanceKey: 'appearance-v2',
  },
  content: CONTENT,
});

const FORMAL_CONTENT = createMatchContentSelection({
  schemaVersion: 1,
  contentDefinitionId: 'pa4b-3-formal-content',
  contentVersion: 1,
  characterDefinitionIds: ARENA_V1_MATCH_CONTENT_CATALOG.toJSON().characterIds,
  equipmentDefinitionIds: ARENA_V1_MATCH_CONTENT_CATALOG.toJSON().equipmentIds,
  mapDefinitionIds: ARENA_V1_MATCH_CONTENT_CATALOG.toJSON().mapIds,
  selectedMapDefinitionId: ARENA_V1_MATCH_CONTENT_CATALOG.toJSON().mapIds[0],
  participantCharacters: [
    { participantId: 'player-1', definitionId: ARENA_V1_MATCH_CONTENT_CATALOG.toJSON().characterIds[0] },
    { participantId: 'player-2', definitionId: ARENA_V1_MATCH_CONTENT_CATALOG.toJSON().characterIds[0] },
  ],
});

const FORMAL_SUPPLY = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  spawnSpecs: Object.freeze([
    Object.freeze({
      slotId: 'left',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
      spawnId: 'pa4b-3-left',
      position: Object.freeze({ x: -8, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'center',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
      spawnId: 'pa4b-3-center',
      position: Object.freeze({ x: 0, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'right',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
      spawnId: 'pa4b-3-right',
      position: Object.freeze({ x: 8, y: 1, z: 0 }),
    }),
  ]),
});

interface FixtureFrame {
  readonly schemaVersion: 2;
  readonly worldSnapshot: Readonly<Record<string, unknown>>;
  readonly localActionSidecar: Readonly<Record<string, unknown>>;
}

interface FixtureAuthorityResult {
  readonly winnerId: string | null;
  readonly reason: string;
  readonly isDraw: boolean;
  readonly endedAtTick: number;
}

function minimalFrame(tick: number, participantId = 'player-1'): FixtureFrame {
  const outcome = Object.freeze({
    kind: 'none',
    actionDefinitionId: null,
    lane: null,
    source: null,
    reason: 'no-input',
  });
  const localActionSidecar = Object.freeze({
    schemaVersion: 2,
    tick,
    eventSequence: tick,
    participantId,
    profile: 'local-context-primary',
    primaryActionDefinitionId: null,
    channels: Object.freeze({ primary: outcome, primaryHold: outcome }),
  });
  return Object.freeze({
    schemaVersion: 2,
    worldSnapshot: Object.freeze({ tick, eventSequence: tick, result: null }),
    localActionSidecar,
  });
}

function productSnapshot(state: 'in-match' | 'results' = 'in-match') {
  return Object.freeze({
    state: Object.freeze({ state }),
    match: Object.freeze({ publicMatchInfo: PUBLIC_INFO }),
  });
}

function validResult(
  matchSeed: number,
  authority: FixtureAuthorityResult = {
    winnerId: null,
    reason: 'timeout-draw',
    isDraw: true,
    endedAtTick: 1,
  },
) {
  return createProductMatchResult({
    matchSeed,
    opponent: PUBLIC_INFO.opponent,
    content: PUBLIC_INFO.content,
    replay: {
      replaySchemaVersion: 5,
      schemaVersion: 4,
      physicsBackendVersion: 'physics-v1',
      configHash: '12345678',
      ruleContentHash: 'abcdef01',
      finalHash: '11111111',
      matchSeed,
      config: { contentSelection: PUBLIC_INFO.content },
      result: authority,
    },
  });
}

function terminalFrame(
  tick: number,
  authority: FixtureAuthorityResult,
): FixtureFrame {
  const base = minimalFrame(tick);
  return Object.freeze({
    ...base,
    worldSnapshot: Object.freeze({
      ...base.worldSnapshot,
      phase: 'ended',
      result: Object.freeze({ ...authority }),
    }),
  });
}

function projector({ worldSnapshot, localActionSidecar, events }: ProductMatchPresentationProjectorOptions) {
  return Object.freeze({
    tick: (worldSnapshot as { tick: number }).tick,
    eventSequence: (localActionSidecar as { eventSequence: number }).eventSequence,
    eventCount: events.length,
  });
}

function hostileThrown(counter: { value: number }): unknown {
  const value = Object.create(null) as Record<PropertyKey, unknown>;
  Object.defineProperty(value, Symbol.toPrimitive, {
    value: () => {
      counter.value += 1;
      throw new Error('hostile coercion');
    },
    enumerable: false,
  });
  return value;
}

function createStepController(
  stepResult: () => unknown,
  calls: { value: number },
  postProcess: ((value: unknown) => unknown) | undefined = undefined,
) {
  let frame = minimalFrame(0);
  return {
    beginMatchWithReadFrame() {
      return Object.freeze({ readFrame: frame, productSnapshot: productSnapshot() });
    },
    getActiveMatchReadFrame() {
      return frame;
    },
    stepMatchWithReadFrame(input: unknown) {
      calls.value += 1;
      const result = stepResult();
      frame = minimalFrame(1);
      const output = Object.freeze({
        matchStep: Object.freeze({
          events: Object.freeze([]),
          readFrame: frame,
          input,
          result,
        }),
        productSnapshot: productSnapshot(result === null ? 'in-match' : 'results'),
      });
      return postProcess?.(output) ?? output;
    },
  };
}

function normalizedNeutralInput(tick: number, participantId = 'player-1') {
  return normalizeInputFrame(createNeutralInputFrame(tick, participantId));
}

const PRESENTATION_PROFILE = Object.freeze({
  revision: 0,
  selection: Object.freeze({ characterId: 'parkour-apprentice' }),
});

function createControllerForRealCoordinator(coordinator: ProductMatchCoordinator) {
  return new ProductSessionController({
    stateMachine: new ProductSessionStateMachine(),
    profileService: {
      open: () => PRESENTATION_PROFILE,
      renewLease: () => true,
      selectCharacter: () => PRESENTATION_PROFILE,
      destroy: () => undefined,
    },
    matchCoordinator: coordinator,
    rewardCommitter: {
      commit: () => Object.freeze({
        grant: Object.freeze({
          unlocks: Object.freeze({
            characterIds: Object.freeze([]),
            appearanceIds: Object.freeze([]),
            equipmentIds: Object.freeze([]),
            mapIds: Object.freeze([]),
          }),
        }),
        committed: true,
        duplicate: false,
        profile: PRESENTATION_PROFILE,
      }),
    },
  });
}

function createOrdinaryPresentationController(completions: unknown[]) {
  const service = new ArenaV1QuickMatchService({
    seedSource: { nextSeed: () => 7731 },
    contentPoolProvider: {
      resolve: ({ matchSeed }: { readonly matchSeed: number }) => ({
        matchSeed,
        selection: AUTHORITY_CONTENT,
      }),
    },
  });
  const match = service.create({
    matchSeed: 7731,
    config: { preparingTicks: 1, suddenDeathStartTick: 4, hardLimitTicks: 8 },
  });
  const runtime = new ProductMatchRuntime({
    ...match,
  }, {
    completionSink: (completion) => { completions.push(completion); },
  });
  const coordinator = new ProductMatchCoordinator({ matchFactory: { create: () => runtime } });
  return {
    controller: createControllerForRealCoordinator(coordinator),
    session: match.session,
    service,
  };
}

function createFormalPresentationController(completions: unknown[]) {
  const seed = 7732;
  const session = createArenaV2SurvivalSupplyBotSession({
    seed,
    config: {
      preparingTicks: 1,
      suddenDeathStartTick: 4,
      hardLimitTicks: 8,
      contentSelection: FORMAL_CONTENT,
    },
    supply: FORMAL_SUPPLY,
    bot: {
      participantId: 'player-2',
      difficultyId: 'normal',
      behaviorSeed: 0x12003456,
      personalitySeed: 0x5600789a,
      profileRegistry: BOT_PROFILE_REGISTRY,
    },
    publicMatchInfo: {
      matchSeed: seed,
      opponent: {
        id: 'player-2',
        displayName: 'formal presentation opponent',
        portraitKey: 'formal-presentation-portrait',
        appearanceKey: 'formal-presentation-appearance',
      },
    },
  });
  const runtime = new ProductMatchRuntime(
    {
      matchSeed: seed,
      opponent: {
        id: 'player-2',
        displayName: 'formal presentation opponent',
        portraitKey: 'formal-presentation-portrait',
        appearanceKey: 'formal-presentation-appearance',
      },
      content: FORMAL_CONTENT,
      session,
    },
    { completionSink: (completion) => { completions.push(completion); } },
  );
  const coordinator = new ProductMatchCoordinator({
    matchFactory: { create: () => runtime },
  });
  return { controller: createControllerForRealCoordinator(coordinator), session };
}

async function runRealPresentationTerminal(
  label: string,
  controller: ReturnType<typeof createArenaV1ProductSession> | ProductSessionController,
  completions: unknown[],
  cleanup: () => void,
  replaySource: () => unknown,
): Promise<void> {
  const phases = new Set<string>();
  const projectedEvents: unknown[][] = [];
  const presentation = new ProductMatchPresentationRuntime({
    controller,
    inputSource: { sample: (tick) => normalizedNeutralInput(tick) },
    frameProjector: ({ worldSnapshot, events }) => {
      phases.add((worldSnapshot as { phase: string }).phase);
      projectedEvents.push([...events]);
      return Object.freeze({
        tick: (worldSnapshot as { tick: number }).tick,
        phase: (worldSnapshot as { phase: string }).phase,
        eventCount: events.length,
      });
    },
  });
  try {
    await controller.boot();
    controller.openCharacterSelect();
    await controller.requestMatch();
    const initial = presentation.start() as { tick: number; phase: string };
    assert.equal(initial.tick, 0, `${label}: V2 presentation starts at authority tick 0`);
    assert.ok(phases.has(initial.phase), `${label}: initial phase projected`);
    let steps = 0;
    while (presentation.state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING) {
      presentation.step();
      steps += 1;
      assert.ok(steps <= 32, `${label}: short terminal fixture must finish`);
    }
    assert.equal(presentation.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RESULT);
    assert.ok(phases.has('preparing'), `${label}: preparing observed`);
    assert.ok(phases.has('running'), `${label}: running observed`);
    assert.ok(phases.has('sudden-death'), `${label}: sudden-death observed`);
    assert.ok(phases.has('ended'), `${label}: ended observed`);
    assert.equal(projectedEvents.length, steps + 1, `${label}: one post projection per authority step`);
    assert.equal(completions.length, 1, `${label}: completion emitted once`);
    const completion = completions[0] as {
      readonly result: unknown;
      readonly replay: Readonly<Record<string, unknown>>;
    };
    const replay = replaySource() as Readonly<Record<string, unknown>>;
    assert.deepEqual(completion.replay, replay, `${label}: completion replay parity`);
    assert.deepEqual(
      completion.replay.checkpoints,
      replay.checkpoints,
      `${label}: completion checkpoints parity`,
    );
    assert.equal(completion.replay.finalHash, replay.finalHash, `${label}: final hash parity`);
    const result = presentation.getLastMatchResult();
    assert.ok(result);
    assert.deepEqual(result, completion.result, `${label}: presentation result authority parity`);
    assert.equal(
      (result as { authorityIdentity: { finalHash: string } }).authorityIdentity.finalHash,
      replay.finalHash,
      `${label}: result authorityHash/finalHash parity`,
    );
    const snapshot = controller.getSnapshot() as { match: { result: unknown } };
    assert.deepEqual(snapshot.match.result, result, `${label}: controller result parity`);
  } finally {
    presentation.destroy();
    controller.destroy();
    cleanup();
  }
}

test('PA4b-3 Runtime samples only the current V2 local sidecar and advances once', () => {
  let frame = minimalFrame(0);
  let beginCalls = 0;
  let currentCalls = 0;
  let stepCalls = 0;
  const samples: Array<{ tick: number; eventSequence: number; sidecar: unknown }> = [];
  const controller = {
    beginMatchWithReadFrame() {
      beginCalls += 1;
      return Object.freeze({ readFrame: frame, productSnapshot: productSnapshot() });
    },
    getActiveMatchReadFrame() {
      currentCalls += 1;
      return frame;
    },
    stepMatchWithReadFrame(input: unknown) {
      stepCalls += 1;
      frame = minimalFrame(1);
      return Object.freeze({
        matchStep: Object.freeze({
          events: Object.freeze([]),
          readFrame: frame,
          input,
          result: null,
        }),
        productSnapshot: productSnapshot(),
      });
    },
  };
  const runtime = new ProductMatchPresentationRuntime({
    controller,
    inputSource: {
      sample(tick, options) {
        samples.push({ tick, eventSequence: options.eventSequence, sidecar: options.localActionSidecar });
        return normalizeInputFrame(createNeutralInputFrame(tick, 'player-1'));
      },
    },
    frameProjector: projector,
  });

  assert.deepEqual(runtime.start(), { tick: 0, eventSequence: 0, eventCount: 0 });
  assert.deepEqual(runtime.step(), { tick: 1, eventSequence: 1, eventCount: 0 });
  assert.equal(beginCalls, 1);
  assert.equal(currentCalls, 1);
  assert.equal(stepCalls, 1);
  assert.equal(samples.length, 1);
  assert.equal(samples[0]?.tick, 0);
  assert.equal(samples[0]?.eventSequence, 0);
  assert.equal((samples[0]?.sidecar as { tick: number }).tick, 0);
  assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING);
  runtime.destroy();
});

test('PA4b-3 Runtime rejects mixed or foreign V2 identities before sampling', () => {
  const runtime = new ProductMatchPresentationRuntime({
    controller: {
      beginMatchWithReadFrame: () => Object.freeze({
        readFrame: minimalFrame(0, 'player-2'),
        productSnapshot: productSnapshot(),
      }),
      getActiveMatchReadFrame: () => null,
      stepMatchWithReadFrame: () => { throw new Error('must not step'); },
    },
    inputSource: { sample: () => { throw new Error('must not sample'); } },
    frameProjector: projector,
  });
  assert.throws(() => runtime.start(), /表现启动失败/);
  assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
  runtime.destroy();
});

test('PA4b-3 malformed or foreign pre-frame is terminal before input sampling', () => {
  const calls = { authority: 0, sample: 0 };
  const validFrame = minimalFrame(0);
  const foreignFrame = minimalFrame(0, 'player-2');
  const runtime = new ProductMatchPresentationRuntime({
    controller: {
      beginMatchWithReadFrame: () => Object.freeze({
        readFrame: validFrame,
        productSnapshot: productSnapshot(),
      }),
      getActiveMatchReadFrame: () => foreignFrame,
      stepMatchWithReadFrame: () => {
        calls.authority += 1;
        throw new Error('must not enter authority');
      },
    },
    inputSource: {
      sample: () => {
        calls.sample += 1;
        return normalizedNeutralInput(0);
      },
    },
    frameProjector: projector,
  });
  runtime.start();
  assert.throws(() => runtime.step(), /Product match 表现 step 失败/);
  assert.equal(calls.sample, 0);
  assert.equal(calls.authority, 0);
  assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
  assert.throws(() => runtime.step(), /失败关闭/);
  runtime.destroy();

  let getterCalls = 0;
  const hostileWorld = Object.freeze(Object.defineProperty(
    { ...validFrame.worldSnapshot },
    'tick',
    {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw hostileThrown({ value: 0 });
      },
    },
  ));
  const hostileFrame = Object.freeze({ ...validFrame, worldSnapshot: hostileWorld });
  const hostileCalls = { sample: 0, authority: 0 };
  const hostileRuntime = new ProductMatchPresentationRuntime({
    controller: {
      beginMatchWithReadFrame: () => Object.freeze({
        readFrame: validFrame,
        productSnapshot: productSnapshot(),
      }),
      getActiveMatchReadFrame: () => hostileFrame,
      stepMatchWithReadFrame: () => {
        hostileCalls.authority += 1;
        throw new Error('must not enter authority');
      },
    },
    inputSource: {
      sample: () => {
        hostileCalls.sample += 1;
        return normalizedNeutralInput(0);
      },
    },
    frameProjector: projector,
  });
  hostileRuntime.start();
  assert.throws(() => hostileRuntime.step(), /Product match 表现 step 失败/);
  assert.equal(getterCalls, 1);
  assert.equal(hostileCalls.sample, 0);
  assert.equal(hostileCalls.authority, 0);
  assert.equal(hostileRuntime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
  hostileRuntime.destroy();
});

test('PA4b-3 projector keeps synthetic participant ordering without authority claims', async () => {
  const values = new Map<string, unknown>();
  const controller = createArenaV1ProductSession({
    storage: {
      storageRead: (key: string) => values.has(key)
        ? { ok: true, found: true, value: structuredClone(values.get(key)) }
        : { ok: true, found: false, value: undefined },
      storageWrite: (key: string, value: unknown) => {
        values.set(key, structuredClone(value));
        return true;
      },
      storageDelete: (key: string) => {
        values.delete(key);
        return true;
      },
    },
    ownerId: 'pa4b-3-projector',
    wallNow: () => 1_000,
    seedSource: { nextSeed: () => 7703 },
    keyPrefix: 'test.pa4b-3-projector',
    matchConfig: { preparingTicks: 0, suddenDeathStartTick: 3, hardLimitTicks: 6 },
  });
  await controller.boot();
  await controller.openCharacterSelect();
  await controller.requestMatch();
  const begun = controller.beginMatchWithReadFrame();
  const frame = begun.readFrame;
  assert.ok(frame);
  const publicMatchInfo = (controller.getSnapshot() as { match: { publicMatchInfo: unknown } }).match.publicMatchInfo;
  assert.ok(publicMatchInfo);
  const participants = frame.worldSnapshot.participants;
  const firstParticipant = participants[0];
  const secondParticipant = participants[1];
  assert.ok(firstParticipant);
  assert.ok(secondParticipant);
  const synthetic = Object.freeze({
    ...frame,
    worldSnapshot: Object.freeze({
      ...frame.worldSnapshot,
      participants: Object.freeze([
        ...participants,
        Object.freeze({ ...firstParticipant, id: 'player-3' }),
        Object.freeze({ ...secondParticipant, id: 'player-4' }),
      ]),
    }) as typeof frame.worldSnapshot,
  });
  const projected = projectArenaPresentationFrameV2({
    worldSnapshot: synthetic.worldSnapshot,
    localActionSidecar: synthetic.localActionSidecar,
    publicMatchInfo: publicMatchInfo as never,
    content: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
  });
  const world = projected.world as { participants: readonly { id: string }[] };
  assert.deepEqual(world.participants.map(({ id }) => id), ['player-1', 'player-2', 'player-3', 'player-4']);
  controller.destroy();
});

test('PA4b-3 formal production composition exposes the same current V2 frame contract', () => {
  const seed = 7713;
  const session = createArenaV2SurvivalSupplyBotSession({
    seed,
    config: {
      preparingTicks: 1,
      suddenDeathStartTick: 8,
      hardLimitTicks: 12,
      contentSelection: FORMAL_CONTENT,
    },
    supply: FORMAL_SUPPLY,
    bot: {
      participantId: 'player-2',
      difficultyId: 'normal',
      behaviorSeed: 0x12003456,
      personalitySeed: 0x5600789a,
      profileRegistry: BOT_PROFILE_REGISTRY,
    },
    publicMatchInfo: {
      matchSeed: seed,
      opponent: {
        id: 'player-2',
        displayName: 'formal opponent',
        portraitKey: 'formal-portrait',
        appearanceKey: 'formal-appearance',
      },
    },
  });
  session.start();
  const frame = session.getPresentationReadFrame();
  assert.equal(frame.schemaVersion, 2);
  assert.equal(frame.localActionSidecar.profile, 'local-context-primary');
  assert.ok(frame.worldSnapshot.activeSupplyProjection !== null);
  session.destroy();
});

test('PA4b-3 hostile post-step projector fails closed without coercing the thrown value', () => {
  const coercions = { value: 0 };
  const calls = { value: 0 };
  let projections = 0;
  const runtime = new ProductMatchPresentationRuntime({
    controller: createStepController(() => null, calls),
    inputSource: { sample: (tick) => normalizedNeutralInput(tick) },
    frameProjector: (options) => {
      projections += 1;
      if (projections === 1) return projector(options);
      throw hostileThrown(coercions);
    },
  });

  runtime.start();
  assert.throws(() => runtime.step());
  assert.equal(calls.value, 1);
  assert.equal(coercions.value, 0);
  assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
  assert.throws(() => runtime.step(), /失败关闭/);
  runtime.destroy();
});

test('PA4b-3 hostile event window and post-frame/result validation fail closed without coercion', () => {
  for (const mode of ['event-window', 'post-frame', 'result'] as const) {
    const coercions = { value: 0 };
    const calls = { value: 0 };
    const hostile = hostileThrown(coercions);
    let consumeCalls = 0;
    const postProcess = mode === 'post-frame' ? (value: unknown) => {
      const outcome = value as {
        matchStep: { readFrame: unknown };
        productSnapshot: unknown;
      };
      return Object.freeze({
        ...outcome,
        matchStep: Object.freeze({
          ...outcome.matchStep,
          readFrame: new Proxy(outcome.matchStep.readFrame as object, {
            getPrototypeOf() {
              throw hostile;
            },
          }),
        }),
      });
    } : undefined;
    const controller = createStepController(() => {
      if (mode === 'post-frame') return null;
      if (mode === 'result') {
        return new Proxy(Object.freeze({}), {
          getPrototypeOf() {
            throw hostile;
          },
        });
      }
      return null;
    }, calls, postProcess);
    const runtime = new ProductMatchPresentationRuntime({
      controller,
      inputSource: { sample: (tick) => normalizedNeutralInput(tick) },
      eventWindowFactory: () => ({
        consume(events: readonly unknown[]) {
          consumeCalls += 1;
          if (mode === 'event-window' && consumeCalls === 2) throw hostile;
          return events;
        },
        destroy() {},
      }),
      frameProjector: projector,
    });
    runtime.start();
    assert.throws(() => runtime.step());
    assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
    assert.equal(coercions.value, 0);
    assert.throws(() => runtime.step(), /失败关闭/);
    runtime.destroy();
  }
});

test('PA4b-3 rejects post-step cross-identity input and foreign result before projection', () => {
  const cases = [
    {
      name: 'wrong post tick',
      result: () => null,
      postProcess: (value: unknown) => {
        const outcome = value as { matchStep: { readFrame: unknown }; productSnapshot: unknown };
        return Object.freeze({
          ...outcome,
          matchStep: Object.freeze({ ...outcome.matchStep, readFrame: minimalFrame(2) }),
        });
      },
    },
    {
      name: 'wrong post participant',
      result: () => null,
      postProcess: (value: unknown) => {
        const outcome = value as { matchStep: { readFrame: unknown }; productSnapshot: unknown };
        return Object.freeze({
          ...outcome,
          matchStep: Object.freeze({ ...outcome.matchStep, readFrame: minimalFrame(1, 'player-2') }),
        });
      },
    },
    {
      name: 'trusted different semantic input',
      result: () => null,
      postProcess: (value: unknown) => {
        const outcome = value as { matchStep: { input: unknown }; productSnapshot: unknown };
        const differentInput = normalizeInputFrame({
          ...createNeutralInputFrame(0, 'player-1'),
          primaryPressed: true,
        });
        return Object.freeze({
          ...outcome,
          matchStep: Object.freeze({ ...outcome.matchStep, input: differentInput }),
        });
      },
    },
    {
      name: 'foreign valid result seed',
      result: () => validResult(7704),
      postProcess: undefined,
    },
  ] as const;

  for (const testCase of cases) {
    const calls = { value: 0 };
    const projectorCalls = { value: 0 };
    const controller = createStepController(testCase.result, calls, testCase.postProcess);
    const runtime = new ProductMatchPresentationRuntime({
      controller,
      inputSource: { sample: (tick) => normalizedNeutralInput(tick) },
      frameProjector: (options) => {
        projectorCalls.value += 1;
        return projector(options);
      },
    });
    runtime.start();
    assert.throws(() => runtime.step(), testCase.name);
    assert.equal(calls.value, 1);
    assert.equal(projectorCalls.value, 1);
    assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
    assert.throws(() => runtime.step(), /失败关闭/);
    runtime.destroy();
  }
});

test('PA4b-3 binds terminal Product result to post-world winner/reason/draw/tick identity', () => {
  const validAuthority = Object.freeze({
    winnerId: 'player-1',
    reason: 'last-participant-standing',
    isDraw: false,
    endedAtTick: 1,
  });
  const matrix = [
    {
      name: 'world winner mismatch',
      world: { ...validAuthority, winnerId: 'player-2' },
      product: validAuthority,
    },
    {
      name: 'reason mismatch',
      world: validAuthority,
      product: { ...validAuthority, reason: 'another-valid-reason' },
    },
    {
      name: 'draw mismatch',
      world: validAuthority,
      product: { ...validAuthority, winnerId: null, isDraw: true },
    },
    {
      name: 'endedAtTick mismatch',
      world: validAuthority,
      product: { ...validAuthority, endedAtTick: 2 },
    },
    {
      name: 'unknown world winner',
      world: { ...validAuthority, winnerId: 'foreign-player' },
      product: { ...validAuthority, winnerId: 'foreign-player' },
    },
  ] as const;

  for (const testCase of matrix) {
    const calls = { value: 0 };
    let frame = minimalFrame(0);
    const controller = {
      beginMatchWithReadFrame() {
        return Object.freeze({ readFrame: frame, productSnapshot: productSnapshot() });
      },
      getActiveMatchReadFrame() {
        return frame;
      },
      stepMatchWithReadFrame(input: unknown) {
        calls.value += 1;
        frame = terminalFrame(1, testCase.world);
        return Object.freeze({
          matchStep: Object.freeze({
            events: Object.freeze([]),
            readFrame: frame,
            input,
            result: validResult(7703, testCase.product),
          }),
          productSnapshot: productSnapshot('results'),
        });
      },
    };
    let projectorCalls = 0;
    const runtime = new ProductMatchPresentationRuntime({
      controller,
      inputSource: { sample: (tick) => normalizedNeutralInput(tick) },
      frameProjector: (options) => {
        projectorCalls += 1;
        return projector(options);
      },
    });
    runtime.start();
    let thrown: unknown = null;
    try {
      runtime.step();
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown, `${testCase.name}: terminal identity mismatch must throw`);
    assert.match(String((thrown as Error).message), /identity|winner|result/);
    assert.equal(calls.value, 1, `${testCase.name}: authority is entered once`);
    assert.equal(projectorCalls, 1, `${testCase.name}: terminal mismatch precedes projector`);
    assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
    assert.throws(() => runtime.step(), /失败关闭/);
    runtime.destroy();
  }

  const wrongOpponentRuntime = new ProductMatchPresentationRuntime({
    controller: {
      beginMatchWithReadFrame: () => Object.freeze({
        readFrame: minimalFrame(0),
        productSnapshot: productSnapshot(),
      }),
      getActiveMatchReadFrame: () => minimalFrame(0),
      stepMatchWithReadFrame: () => { throw new Error('must not enter authority'); },
    },
    inputSource: { sample: () => { throw new Error('must not sample'); } },
    opponentParticipantId: 'player-3',
    frameProjector: projector,
  });
  assert.throws(() => wrongOpponentRuntime.start(), /opponent|启动失败/);
  assert.equal(wrongOpponentRuntime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
  wrongOpponentRuntime.destroy();
});

test('PA4b-3 validates normalized input identity before entering ProductSession', () => {
  for (const input of [
    normalizedNeutralInput(1),
    normalizedNeutralInput(0, 'player-2'),
    createNeutralInputFrame(0, 'player-1'),
  ]) {
    const calls = { value: 0 };
    const runtime = new ProductMatchPresentationRuntime({
      controller: createStepController(() => null, calls),
      inputSource: { sample: () => input },
      frameProjector: projector,
    });
    runtime.start();
    assert.throws(() => runtime.step());
    assert.equal(calls.value, 0);
    assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
    runtime.destroy();
  }
});

test('PA4b-3 pre-return input-source failure is retryable, while malformed returned input is terminal', () => {
  let attempts = 0;
  const calls = { value: 0 };
  const runtime = new ProductMatchPresentationRuntime({
    controller: createStepController(() => null, calls),
    inputSource: {
      sample: (tick) => {
        attempts += 1;
        if (attempts === 1) throw new Error('recoverable sample failure');
        return normalizedNeutralInput(tick);
      },
    },
    frameProjector: projector,
  });
  runtime.start();
  assert.throws(() => runtime.step(), /输入采样失败/);
  assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING);
  assert.equal(calls.value, 0);
  runtime.step();
  assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING);
  assert.equal(calls.value, 1);
  runtime.destroy();
});

test('PA4b-3 returned thenable is terminal, unlike a pre-return sample throw', () => {
  const calls = { value: 0 };
  const runtime = new ProductMatchPresentationRuntime({
    controller: createStepController(() => null, calls),
    inputSource: {
      sample: () => ({ then: () => undefined }),
    },
    frameProjector: projector,
  });
  runtime.start();
  assert.throws(() => runtime.step(), /Product match 表现 step 失败/);
  assert.equal(calls.value, 0);
  assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
  assert.throws(() => runtime.step(), /失败关闭/);
  runtime.destroy();
});

test('PA4b-3 constructor rollback and destroy cleanup preserve terminal state with hostile errors', () => {
  const constructorCoercions = { value: 0 };
  let constructorDestroyCalls = 0;
  assert.throws(() => new ProductMatchPresentationRuntime({
    controller: {
      beginMatchWithReadFrame: () => null,
      getActiveMatchReadFrame: () => null,
      stepMatchWithReadFrame: () => null,
    },
    inputSource: { sample: () => normalizedNeutralInput(0) },
    eventWindowFactory: (() => ({
      destroy() {
        constructorDestroyCalls += 1;
        throw hostileThrown(constructorCoercions);
      },
    })) as never,
    frameProjector: projector,
  }));
  assert.equal(constructorDestroyCalls, 1);
  assert.equal(constructorCoercions.value, 0);

  const destroyCoercions = { value: 0 };
  let destroyCalls = 0;
  const runtime = new ProductMatchPresentationRuntime({
    controller: createStepController(() => null, { value: 0 }),
    inputSource: { sample: (tick) => normalizedNeutralInput(tick) },
    eventWindowFactory: () => ({
      consume: (events: readonly unknown[]) => events,
      destroy() {
        destroyCalls += 1;
        if (destroyCalls === 1) throw hostileThrown(destroyCoercions);
      },
    }),
    frameProjector: projector,
  });
  assert.throws(() => runtime.destroy());
  assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
  assert.equal(destroyCoercions.value, 0);
  assert.doesNotThrow(() => runtime.destroy());
  assert.equal(destroyCalls, 2);
  assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED);
});

test('PA4b-3 real ordinary and formal Product→Presentation paths reach terminal with authority evidence', async () => {
  const ordinaryCompletions: unknown[] = [];
  const ordinary = createOrdinaryPresentationController(ordinaryCompletions);
  await runRealPresentationTerminal(
    'ordinary real Product→Presentation',
    ordinary.controller,
    ordinaryCompletions,
    () => ordinary.service.destroy(),
    () => (ordinaryCompletions[0] as { replay: unknown }).replay,
  );

  const formalCompletions: unknown[] = [];
  const formal = createFormalPresentationController(formalCompletions);
  await runRealPresentationTerminal(
    'formal real Product→Presentation',
    formal.controller,
    formalCompletions,
    () => undefined,
    () => formal.session.exportReplay(),
  );
});
