import { describe, expect, it } from 'vitest';
import {
  ACTION_RESOLUTION_KIND,
  ARENA_MATCH_READ_PROFILE,
  createMatchReadFrameV2Audit,
  createNeutralInputFrame,
  createMatchContentSelection,
  normalizeInputFrame,
} from '@number-strategy-jump/arena-contracts';
import { createProductMatchResult } from '@number-strategy-jump/arena-product-contracts';
import {
  PRODUCT_MATCH_COORDINATOR_STATE,
} from '@number-strategy-jump/arena-product-match';
import {
  PRODUCT_SESSION_STATE,
  ProductSessionStateMachine,
} from '@number-strategy-jump/arena-product-state';
import { ProductSessionController } from '../src/index.js';
import { normalizeProductSessionOptions } from '../src/ports.js';

const POS = { x: 0, y: 0, z: 0 };

function participant(id: string): Record<string, unknown> {
  return {
    id,
    characterDefinitionId: 'character-basic',
    status: 'active',
    lives: 2,
    eliminations: 0,
    deaths: 0,
    hitstunTicks: 0,
    invulnerableTicks: 0,
    respawnTicks: 0,
    lastHitBy: null,
    lastHitTick: -1,
    action: { definitionId: null, phase: 'idle', ticksRemaining: 0 },
    actionRule: { schemaVersion: 1, mode: 'fixture' },
    movement: {
      schemaVersion: 1,
      participantId: id,
      characterDefinitionId: 'character-basic',
      mode: 'grounded',
      coyoteTicksRemaining: 0,
      jumpBufferTicksRemaining: 0,
      airJumpsUsed: 0,
      crouchChargeTicks: 0,
      crouchActionId: null,
      downSmashActionId: null,
      revision: 0,
      grounded: true,
    },
    equipment: null,
    position: { ...POS },
    velocity: { ...POS },
    facing: { x: 1, z: 0 },
    grounded: true,
    supportSurfaceId: 'surface-ground',
  };
}

function frame(tick: number, matchSeed = 7): Readonly<Record<string, unknown>> {
  const none = () => ({
    kind: ACTION_RESOLUTION_KIND.NONE,
    actionDefinitionId: null,
    lane: null,
    source: null,
    reason: 'no-candidate',
  });
  return createMatchReadFrameV2Audit({
    schemaVersion: 2,
    worldSnapshot: {
      authoritySchemaVersion: 1,
      physicsBackendVersion: 'physics-v1',
      configHash: '12345678',
      ruleContentHash: 'abcdef01',
      matchSeed,
      tick,
      activeTick: tick,
      phase: 'running',
      remainingTicks: 100,
      eventSequence: tick,
      participants: [participant('player-1'), participant('player-2')],
      equipment: [],
      activeSupplyProjection: null,
      map: {
        schemaVersion: 1,
        definitionId: 'arena-map-training',
        nextActiveTick: 0,
        revision: 0,
        surfaces: [{ id: 'surface-ground', enabled: true, revision: 0 }],
        occurrences: [{
          occurrenceId: 'occurrence-0',
          eventId: 'none',
          kind: 'none',
          warningTick: 0,
          startTick: 0,
          endTick: null,
          phase: 'running',
          publicPayload: {},
          revision: 0,
        }],
      },
      result: null,
    },
    localActionSidecar: {
      schemaVersion: 2,
      tick,
      eventSequence: tick,
      participantId: 'player-1',
      profile: ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
      primaryActionDefinitionId: null,
      channels: { primary: none(), primaryHold: none() },
    },
  });
}

const FRAME = frame(0);

const REMATCH_CONTENT = createMatchContentSelection({
  schemaVersion: 1,
  contentDefinitionId: 'pa4b-1-rematch-content',
  contentVersion: 1,
  characterDefinitionIds: ['character-basic'],
  equipmentDefinitionIds: ['equipment-basic'],
  mapDefinitionIds: ['arena-map-training'],
  selectedMapDefinitionId: 'arena-map-training',
  participantCharacters: [
    { participantId: 'player-1', definitionId: 'character-basic' },
    { participantId: 'player-2', definitionId: 'character-basic' },
  ],
});

function rematchResult(matchSeed: number) {
  return createProductMatchResult({
    matchSeed,
    opponent: {
      id: 'player-2',
      displayName: 'Opponent',
      portraitKey: 'portrait',
      appearanceKey: 'appearance',
    },
    content: REMATCH_CONTENT,
    replay: {
      replaySchemaVersion: 5,
      schemaVersion: 4,
      physicsBackendVersion: 'physics-v1',
      configHash: '12345678',
      ruleContentHash: 'abcdef01',
      finalHash: '11111111',
      matchSeed,
      config: { contentSelection: REMATCH_CONTENT },
      result: {
        winnerId: null,
        reason: 'timeout-draw',
        isDraw: true,
        endedAtTick: 1,
      },
    },
  });
}

function profile(): Readonly<Record<string, unknown>> {
  return Object.freeze({ revision: 0, selection: Object.freeze({ characterId: 'fighter-a' }) });
}

function matchCoordinatorHarness(seedRef: { value: number } = { value: 7 }): Record<string, unknown> {
  let state: string = PRODUCT_MATCH_COORDINATOR_STATE.IDLE;
  let legacyStarts = 0;
  let legacySteps = 0;
  let returnStaleFrame = false;
  let currentResult: unknown = null;
  let currentTick = 0;
  const currentFrame = (tick: number): Readonly<Record<string, unknown>> => (
    seedRef.value === 7 && tick === 0 ? FRAME : frame(tick, seedRef.value)
  );
  const snapshot = () => Object.freeze({
    schemaVersion: 1,
    state,
    hasRuntime: state !== PRODUCT_MATCH_COORDINATOR_STATE.IDLE,
    preparing: false,
    paused: state === PRODUCT_MATCH_COORDINATOR_STATE.PAUSED,
    cleanupIncomplete: false,
    publicMatchInfo: Object.freeze({
      matchSeed: seedRef.value,
      opponent: Object.freeze({}),
      content: Object.freeze({}),
    }),
    result: null,
  });
  const source = {
    get legacyStarts() { return legacyStarts; },
    get legacySteps() { return legacySteps; },
    prepare() { state = PRODUCT_MATCH_COORDINATOR_STATE.READY; return Promise.resolve(snapshot()); },
    start() { legacyStarts += 1; state = PRODUCT_MATCH_COORDINATOR_STATE.RUNNING; return snapshot(); },
    startWithReadFrame() {
      state = PRODUCT_MATCH_COORDINATOR_STATE.RUNNING;
      currentTick = 0;
      return Object.freeze({ readFrame: currentFrame(currentTick), snapshot: snapshot() });
    },
    setPaused(paused: boolean) { state = paused ? PRODUCT_MATCH_COORDINATOR_STATE.PAUSED : PRODUCT_MATCH_COORDINATOR_STATE.RUNNING; return snapshot(); },
    step() { legacySteps += 1; return Object.freeze({ events: Object.freeze([]), snapshot: Object.freeze({}), result: null }); },
    stepWithReadFrame() {
      currentTick = 1;
      const readFrame = returnStaleFrame ? frame(1, 7) : currentFrame(1);
      return Object.freeze({
        events: Object.freeze([]),
        readFrame,
        input: normalizeInputFrame(createNeutralInputFrame(0, 'player-1')),
        result: null,
      });
    },
    getMatchSnapshot() { return Object.freeze({}); },
    getMatchReadFrame() {
      return state === PRODUCT_MATCH_COORDINATOR_STATE.IDLE ? null : currentFrame(currentTick);
    },
    getResult() { return currentResult; },
    release() { state = PRODUCT_MATCH_COORDINATOR_STATE.IDLE; currentTick = 0; return snapshot(); },
    resetFailure() { state = PRODUCT_MATCH_COORDINATOR_STATE.IDLE; return snapshot(); },
    destroy() { state = PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED; },
    getSnapshot: snapshot,
  };
  Object.defineProperties(source, {
    returnStaleFrame: {
      enumerable: false,
      configurable: false,
      get: () => returnStaleFrame,
      set: (value: boolean) => { returnStaleFrame = value; },
    },
    result: {
      enumerable: false,
      configurable: false,
      get: () => currentResult,
      set: (value: unknown) => { currentResult = value; },
    },
  });
  return source;
}

function controller(coordinator: Record<string, unknown>): ProductSessionController {
  const machine = new ProductSessionStateMachine();
  return new ProductSessionController({
    stateMachine: machine,
    profileService: {
      open: () => profile(),
      renewLease: () => true,
      selectCharacter: () => profile(),
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
        profile: profile(),
      }),
    },
  });
}

async function enterMatch(coordinator: Record<string, unknown>): Promise<ProductSessionController> {
  const session = controller(coordinator);
  await session.boot();
  session.openCharacterSelect();
  await session.requestMatch();
  return session;
}

describe('PA4b-1 ProductSession V2 plumbing', () => {
  it('uses V2 begin/current/step without invoking legacy match snapshot or step', async () => {
    const coordinator = matchCoordinatorHarness();
    const session = controller(coordinator);
    await session.boot();
    session.openCharacterSelect();
    await session.requestMatch();
    const begun = session.beginMatchWithReadFrame();
    expect(begun.readFrame).toBe(FRAME);
    expect(begun.productSnapshot.state.activeState).toBe(PRODUCT_SESSION_STATE.IN_MATCH);
    const stepped = session.stepMatchWithReadFrame();
    expect(stepped.matchStep?.readFrame.worldSnapshot.tick).toBe(1);
    expect(stepped.matchStep?.readFrame).not.toBe(FRAME);
    expect(session.getActiveMatchReadFrame()?.worldSnapshot.tick).toBe(1);
    expect(session.getActiveMatchReadFrame()).toStrictEqual(stepped.matchStep?.readFrame);
    expect(coordinator.legacyStarts).toBe(0);
    expect(coordinator.legacySteps).toBe(0);
    session.destroy();
  });

  it('rejects a V2 coordinator without the complete V2 port', async () => {
    const coordinator = matchCoordinatorHarness();
    delete coordinator.stepWithReadFrame;
    expect(() => controller(coordinator)).toThrow(/stepWithReadFrame/);
  });

  it('rejects coordinator accessor methods without invoking getters', () => {
    const coordinator = matchCoordinatorHarness();
    let getterReads = 0;
    Object.defineProperty(coordinator, 'getMatchReadFrame', {
      configurable: true,
      enumerable: true,
      get() {
        getterReads += 1;
        throw new Error('malicious coordinator getter');
      },
    });
    expect(() => controller(coordinator)).toThrow(/数据方法/);
    expect(getterReads).toBe(0);
  });

  it('fails closed for extra/missing V2 frame fields, async returns, and bad running input', async () => {
    const extra = matchCoordinatorHarness();
    const nativeExtraStart = extra.startWithReadFrame as () => Readonly<Record<string, unknown>>;
    extra.startWithReadFrame = () => {
      const started = nativeExtraStart();
      return Object.freeze({
        ...started,
        readFrame: Object.freeze({ ...FRAME, extra: true }),
      });
    };
    const extraSession = await enterMatch(extra);
    const extraResult = extraSession.beginMatchWithReadFrame();
    expect(extraResult.readFrame).toBeNull();
    expect(extraResult.productSnapshot.state.activeState).toBe(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
    extraSession.destroy();

    const asyncCoordinator = matchCoordinatorHarness();
    asyncCoordinator.startWithReadFrame = () => Promise.resolve({
      readFrame: FRAME,
      snapshot: (asyncCoordinator.getSnapshot as () => unknown)(),
    });
    const asyncSession = await enterMatch(asyncCoordinator);
    const asyncResult = asyncSession.beginMatchWithReadFrame();
    expect(asyncResult.readFrame).toBeNull();
    expect(asyncResult.productSnapshot.state.activeState).toBe(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
    asyncSession.destroy();

    const nullInput = matchCoordinatorHarness();
    nullInput.stepWithReadFrame = () => Object.freeze({
      events: Object.freeze([]),
      readFrame: FRAME,
      input: null,
      result: null,
    });
    const nullInputSession = await enterMatch(nullInput);
    const started = nullInputSession.beginMatchWithReadFrame();
    expect(started.readFrame).toBe(FRAME);
    const nullInputResult = nullInputSession.stepMatchWithReadFrame();
    expect(nullInputResult.matchStep).toBeNull();
    expect(nullInputResult.productSnapshot.state.activeState).toBe(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
    nullInputSession.destroy();
  });

  it('rejects step result forgery and active-match seed drift before RESULT', async () => {
    const forged = matchCoordinatorHarness();
    const forgedResult = Object.freeze({
      schemaVersion: 2,
      matchSeed: 7,
      authorityIdentity: Object.freeze({}),
      authorityResult: Object.freeze({}),
      content: Object.freeze({}),
      opponent: Object.freeze({}),
      authorityHash: '12345678',
    });
    forged.stepWithReadFrame = () => Object.freeze({
      events: Object.freeze([]),
      readFrame: frame(1),
      input: normalizeInputFrame(createNeutralInputFrame(0, 'player-1')),
      result: forgedResult,
    });
    forged.getResult = () => forgedResult;
    const forgedSession = await enterMatch(forged);
    forgedSession.beginMatchWithReadFrame();
    const forgedStep = forgedSession.stepMatchWithReadFrame();
    expect(forgedStep.matchStep).toBeNull();
    expect(forgedStep.productSnapshot.state.activeState).toBe(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
    forgedSession.destroy();

    const drifted = matchCoordinatorHarness();
    drifted.stepWithReadFrame = () => Object.freeze({
      events: Object.freeze([]),
      readFrame: Object.freeze({
        ...FRAME,
        worldSnapshot: Object.freeze({ ...FRAME.worldSnapshot as object, matchSeed: 8 }),
      }),
      input: normalizeInputFrame(createNeutralInputFrame(0, 'player-1')),
      result: null,
    });
    const driftedSession = await enterMatch(drifted);
    driftedSession.beginMatchWithReadFrame();
    const driftedStep = driftedSession.stepMatchWithReadFrame();
    expect(driftedStep.matchStep).toBeNull();
    expect(driftedStep.productSnapshot.state.activeState).toBe(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
    driftedSession.destroy();
  });

  it('clears the active seed on release and rejects old frame/result after rematch', () => {
    const seedRef = { value: 7 };
    const coordinator = matchCoordinatorHarness(seedRef);
    const normalized = normalizeProductSessionOptions({
      stateMachine: new ProductSessionStateMachine(),
      profileService: {
        open: () => profile(),
        renewLease: () => true,
        selectCharacter: () => profile(),
        destroy: () => undefined,
      },
      matchCoordinator: coordinator,
      rewardCommitter: { commit: () => rematchResult(seedRef.value) },
      diagnosticSink: null,
    });
    const port = normalized.matchCoordinator;
    const first = port.startWithReadFrame!();
    expect(first.readFrame.worldSnapshot.matchSeed).toBe(7);
    port.release();
    expect(port.getMatchReadFrame!()).toBeNull();

    seedRef.value = 8;
    const second = port.startWithReadFrame!();
    expect(second.readFrame.worldSnapshot.matchSeed).toBe(8);
    coordinator.result = rematchResult(7);
    expect(() => port.getResult()).toThrow(/matchSeed/);
    coordinator.result = rematchResult(8);
    expect(port.getResult()).toBe(coordinator.result);

    coordinator.returnStaleFrame = true;
    expect(() => port.stepWithReadFrame!()).toThrow(/matchSeed/);
    coordinator.returnStaleFrame = false;
    const recovered = port.stepWithReadFrame!();
    expect(recovered.readFrame.worldSnapshot.matchSeed).toBe(8);
  });
});
