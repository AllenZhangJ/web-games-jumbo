import { describe, expect, it } from 'vitest';
import {
  ACTION_RESOLUTION_KIND,
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_READ_PROFILE,
  createArenaMatchEventV6,
  createMatchReadFrameV3Audit,
  createNeutralInputFrame,
  type ArenaInputFrame,
  type DeepReadonly,
  type MatchReadFrameV3,
  type WorldSnapshotV3,
} from '@number-strategy-jump/arena-contracts';
import {
  MODE_LOCAL_MATCH_SESSION_V2_STATE,
  ModeLocalMatchSessionV2,
  type ModeInputControllerBindingV2,
  type ModeMatchRuntimeV2,
} from '../src/mode-local-match-session-v2.js';

const MODE_DEFINITION_ID = 'mode.duel.test.v1';
const PARTICIPANT_IDS = Object.freeze(['p1', 'p2']);
const LOCAL_PARTICIPANT_ID = 'p1';
const NO_SUPPLY = Object.freeze({
  worldSupplyEquipmentInstanceIds: Object.freeze([]),
  expectedWorldSupplyIdentities: Object.freeze([]),
});

interface HarnessOptions {
  readonly start?: () => unknown;
  readonly step?: (inputs: readonly ArenaInputFrame[]) => unknown;
  readonly pause?: () => unknown;
  readonly resume?: () => unknown;
  readonly runtimeDestroy?: () => unknown;
  readonly controllerInput?: (
    participantId: string,
    worldSnapshot: DeepReadonly<WorldSnapshotV3>,
  ) => unknown;
  readonly controllerDestroy?: (participantId: string) => unknown;
}

function failureMessages(action: () => unknown): string {
  let failure: unknown;
  try {
    action();
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeDefined();
  const messages: string[] = [];
  const pending: unknown[] = [failure];
  const visited = new Set<object>();
  while (pending.length > 0) {
    const current = pending.shift();
    if ((typeof current !== 'object' || current === null) && typeof current !== 'function') {
      continue;
    }
    if (visited.has(current as object)) continue;
    visited.add(current as object);
    if (current instanceof Error) messages.push(current.message);
    for (const key of ['cause', 'originalError', 'cleanupErrors'] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) continue;
      if (Array.isArray(descriptor.value)) pending.push(...descriptor.value);
      else pending.push(descriptor.value);
    }
  }
  return messages.join('\n');
}

function participant(id: string) {
  return {
    id,
    characterDefinitionId: `fighter.${id}.test`,
    status: 'active',
    lives: 3,
    eliminations: 0,
    deaths: 0,
    hitstunTicks: 0,
    invulnerableTicks: 0,
    respawnTicks: 0,
    lastHitBy: null,
    lastHitTick: -1,
    action: {
      definitionId: 'arena.action.primary',
      phase: 'active',
      ticksRemaining: 1,
    },
    actionRule: { range: 2 },
    movement: {
      schemaVersion: 2,
      participantId: id,
      characterDefinitionId: `fighter.${id}.test`,
      mode: 'standard',
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
    position: { x: 0, y: 1, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    facing: { x: 1, z: 0 },
    grounded: true,
    supportSurfaceId: 'main',
  };
}

function result(endedAtTick = 1) {
  return {
    kind: 'duel',
    winnerParticipantIds: ['p1'],
    isDraw: false,
    reason: 'last-participant-standing',
    endedAtTick,
  } as const;
}

function localSidecar(tick: number, eventSequence: number) {
  return {
    schemaVersion: 3,
    tick,
    eventSequence,
    participantId: LOCAL_PARTICIPANT_ID,
    profile: ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
    primaryActionDefinitionId: 'arena.action.primary',
    channels: {
      primary: {
        kind: ACTION_RESOLUTION_KIND.SELECTED,
        actionDefinitionId: 'arena.action.primary',
        lane: 'primary',
        source: 'player-input',
        reason: 'selected',
      },
      primaryHold: {
        kind: ACTION_RESOLUTION_KIND.NONE,
        actionDefinitionId: null,
        lane: null,
        source: null,
        reason: 'not-requested',
      },
    },
  };
}

function frame(options: {
  readonly tick: number;
  readonly eventSequence: number;
  readonly modeResult?: ReturnType<typeof result> | null;
}): DeepReadonly<MatchReadFrameV3> {
  const modeResult = options.modeResult ?? null;
  const phase = modeResult === null ? 'running' : 'ended';
  return createMatchReadFrameV3Audit({
    schemaVersion: 3,
    worldSnapshot: {
      authoritySchemaVersion: 6,
      physicsBackendVersion: 'lightweight-v3.test',
      configHash: 'deadbeef',
      ruleContentHash: 'c0ffee00',
      matchSeed: 7,
      tick: options.tick,
      activeTick: options.tick,
      phase,
      remainingTicks: Math.max(0, 100 - options.tick),
      eventSequence: options.eventSequence,
      modeDefinitionId: MODE_DEFINITION_ID,
      participants: PARTICIPANT_IDS.map(participant),
      equipment: [],
      activeSupplyProjection: null,
      modeProjection: {
        schemaVersion: 1,
        modeDefinitionId: MODE_DEFINITION_ID,
        revision: options.tick,
        preparationRemainingTicks: null,
        state: { kind: 'duel', suddenDeath: false },
      },
      map: {
        schemaVersion: 1,
        definitionId: 'main-map.test',
        nextActiveTick: options.tick + 1,
        revision: options.tick,
        surfaces: [{ id: 'main', enabled: true, revision: 0 }],
        occurrences: [],
      },
      result: modeResult,
    },
    localActionSidecar: localSidecar(options.tick, options.eventSequence),
  }, NO_SUPPLY);
}

function matchStarted(sequence = 0) {
  return createArenaMatchEventV6({
    id: `event-start-${sequence}`,
    sequence,
    tick: 0,
    type: ARENA_MATCH_EVENT_V6.MATCH_STARTED,
    modeDefinitionId: MODE_DEFINITION_ID,
    participantIds: PARTICIPANT_IDS,
  });
}

function matchEnded() {
  return createArenaMatchEventV6({
    id: 'event-end-1',
    sequence: 1,
    tick: 1,
    type: ARENA_MATCH_EVENT_V6.MATCH_ENDED,
    modeDefinitionId: MODE_DEFINITION_ID,
    modeResult: result(),
  });
}

function startOutcome(eventSequence = 0) {
  return Object.freeze({
    readFrame: frame({ tick: 0, eventSequence }),
    readFrameAudit: NO_SUPPLY,
  });
}

function stepOutcome(options: {
  readonly tick: number;
  readonly eventSequence: number;
  readonly events: readonly unknown[];
  readonly modeResult?: ReturnType<typeof result> | null;
}) {
  return Object.freeze({
    events: Object.freeze([...options.events]),
    readFrame: frame({
      tick: options.tick,
      eventSequence: options.eventSequence,
      modeResult: options.modeResult ?? null,
    }),
    readFrameAudit: NO_SUPPLY,
  });
}

function defaultStepOutcomes(): unknown[] {
  return [
    stepOutcome({ tick: 1, eventSequence: 1, events: [matchStarted()] }),
    stepOutcome({
      tick: 2,
      eventSequence: 2,
      events: [matchEnded()],
      modeResult: result(),
    }),
  ];
}

function createHarness(options: HarnessOptions = {}) {
  const cleanupOrder: string[] = [];
  const stepInputs: (readonly ArenaInputFrame[])[] = [];
  const controllerInputCalls: string[] = [];
  const calls = { start: 0, step: 0, pause: 0, resume: 0, runtimeDestroy: 0 };
  const outcomes = defaultStepOutcomes();
  const runtime: ModeMatchRuntimeV2 = {
    start() {
      calls.start += 1;
      return options.start ? options.start() : startOutcome();
    },
    step(inputs) {
      calls.step += 1;
      stepInputs.push(inputs);
      if (options.step) return options.step(inputs);
      return outcomes.shift();
    },
    pause() {
      calls.pause += 1;
      return options.pause?.();
    },
    resume() {
      calls.resume += 1;
      return options.resume?.();
    },
    destroy() {
      calls.runtimeDestroy += 1;
      cleanupOrder.push('runtime');
      return options.runtimeDestroy?.();
    },
  };
  const controllers = ['p2'].map<ModeInputControllerBindingV2>(
    (participantId) => ({
      participantId,
      controller: {
        createInput(worldSnapshot) {
          controllerInputCalls.push(participantId);
          return options.controllerInput
            ? options.controllerInput(participantId, worldSnapshot)
            : createNeutralInputFrame(worldSnapshot.tick, participantId);
        },
        destroy() {
          cleanupOrder.push(participantId);
          return options.controllerDestroy?.(participantId);
        },
      },
    }),
  );
  const session = new ModeLocalMatchSessionV2({
    runtime,
    modeDefinitionId: MODE_DEFINITION_ID,
    participantIds: PARTICIPANT_IDS,
    localParticipantId: LOCAL_PARTICIPANT_ID,
    controllers,
  });
  return {
    calls,
    cleanupOrder,
    controllerInputCalls,
    session,
    stepInputs,
  };
}

describe('ModeLocalMatchSessionV2 production-unreachable candidate', () => {
  it('closes start eventSequence=0 and consecutive V6 events through terminal step', () => {
    const value = createHarness();
    const started = value.session.start();
    expect(started.readFrame.worldSnapshot).toMatchObject({ tick: 0, eventSequence: 0 });
    expect(value.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.RUNNING);

    const first = value.session.step(createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID));
    expect(first.events.map(({ sequence }) => sequence)).toEqual([0]);
    expect(first.readFrame.worldSnapshot).toMatchObject({ tick: 1, eventSequence: 1 });
    expect(first.inputs.map(({ participantId }) => participantId)).toEqual(PARTICIPANT_IDS);

    const terminal = value.session.step(createNeutralInputFrame(1, LOCAL_PARTICIPANT_ID));
    expect(terminal.events.map(({ sequence }) => sequence)).toEqual([1]);
    expect(terminal.readFrame.worldSnapshot).toMatchObject({ tick: 2, eventSequence: 2 });
    expect(terminal.result).toEqual(result());
    expect(value.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.ENDED);
    expect(value.stepInputs).toHaveLength(2);
    expect(() => value.session.step(createNeutralInputFrame(2, LOCAL_PARTICIPANT_ID)))
      .toThrow(/状态ended/);
  });

  it('fails closed on an event sequence gap and cleans controllers in reverse order', () => {
    const value = createHarness({
      step: () => stepOutcome({
        tick: 1,
        eventSequence: 2,
        events: [matchStarted(1)],
      }),
    });
    value.session.start();
    expect(failureMessages(() => value.session.step(
      createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID),
    ))).toMatch(/连续延续/);
    expect(value.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.FAILED);
    expect(value.cleanupOrder).toEqual(['p2', 'runtime']);
  });

  it('rejects an event batch that leads its frame waterline', () => {
    const value = createHarness({
      step: () => stepOutcome({
        tick: 1,
        eventSequence: 0,
        events: [matchStarted()],
      }),
    });
    value.session.start();
    expect(failureMessages(() => value.session.step(
      createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID),
    ))).toMatch(/领先readFrame/);
    expect(value.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.FAILED);
  });

  it('requires terminal readFrame and MatchEnded to close in the same batch', () => {
    const eventWithoutResult = createHarness({
      step: () => stepOutcome({
        tick: 1,
        eventSequence: 1,
        events: [{ ...matchEnded(), sequence: 0, tick: 0, modeResult: result(0) }],
      }),
    });
    eventWithoutResult.session.start();
    expect(failureMessages(() => eventWithoutResult.session.step(
      createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID),
    ))).toMatch(/不能领先readFrame终局结果/);

    const resultWithoutEvent = createHarness({
      step: () => stepOutcome({
        tick: 1,
        eventSequence: 1,
        events: [matchStarted()],
        modeResult: result(0),
      }),
    });
    resultWithoutEvent.session.start();
    expect(failureMessages(() => resultWithoutEvent.session.step(
      createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID),
    ))).toMatch(/唯一末尾MatchEnded/);
  });

  it('rejects native Promise and hostile runtime thenable results synchronously', () => {
    const asyncStart = createHarness({ start: () => Promise.resolve(startOutcome()) });
    expect(failureMessages(() => asyncStart.session.start())).toMatch(/同步完成/);
    expect(asyncStart.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.FAILED);
    expect(asyncStart.cleanupOrder).toEqual(['p2', 'runtime']);

    let thenCalls = 0;
    const thenableStep = createHarness({
      step: () => ({ then() { thenCalls += 1; } }),
    });
    thenableStep.session.start();
    expect(failureMessages(() => thenableStep.session.step(
      createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID),
    ))).toMatch(/同步完成/);
    expect(thenCalls).toBe(0);
    expect(thenableStep.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.FAILED);

    const dataThenStart = createHarness({ start: () => ({ then: null }) });
    expect(failureMessages(() => dataThenStart.session.start()))
      .toMatch(/then字段.*同步完成/);
    expect(dataThenStart.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.FAILED);
  });

  it('rejects hostile then/constructor descriptors without executing caller code', () => {
    let thenCalls = 0;
    let thenGetterCalls = 0;
    let constructorGetterCalls = 0;
    const hostileThen = createHarness({
      start: () => ({ then() { thenCalls += 1; } }),
    });
    expect(failureMessages(() => hostileThen.session.start())).toMatch(/同步完成/);
    expect(thenCalls).toBe(0);

    const hostileThenGetter = createHarness({
      start: () => Object.defineProperty({}, 'then', {
        get() {
          thenGetterCalls += 1;
          throw new Error('must not execute');
        },
      }),
    });
    expect(failureMessages(() => hostileThenGetter.session.start())).toMatch(/访问器thenable/);
    expect(thenGetterCalls).toBe(0);

    const nativeWithHostileConstructor = Promise.resolve(startOutcome());
    Object.defineProperty(nativeWithHostileConstructor, 'constructor', {
      get() {
        constructorGetterCalls += 1;
        throw new Error('must not execute');
      },
    });
    const hostileConstructor = createHarness({
      start: () => nativeWithHostileConstructor,
    });
    expect(failureMessages(() => hostileConstructor.session.start()))
      .toMatch(/访问器constructor/);
    expect(constructorGetterCalls).toBe(0);
  });

  it('rejects Promise subclasses and separates cyclic from overdeep prototypes', () => {
    class SessionPromise<T> extends Promise<T> {}
    const subclass = createHarness({
      start: () => new SessionPromise((resolve) => resolve(startOutcome())),
    });
    expect(failureMessages(() => subclass.session.start())).toMatch(/同步完成/);

    let cyclicPrototype: object;
    cyclicPrototype = new Proxy(Object.create(null) as object, {
      getPrototypeOf() { return cyclicPrototype; },
    });
    expect(failureMessages(() => new ModeLocalMatchSessionV2({
      runtime: cyclicPrototype as ModeMatchRuntimeV2,
      modeDefinitionId: MODE_DEFINITION_ID,
      participantIds: PARTICIPANT_IDS,
      localParticipantId: LOCAL_PARTICIPANT_ID,
      controllers: [],
    }))).toMatch(/原型链不能循环/);

    let overdeepPrototype = Object.create(null) as object;
    for (let depth = 0; depth < 33; depth += 1) {
      overdeepPrototype = Object.create(overdeepPrototype) as object;
    }
    expect(failureMessages(() => new ModeLocalMatchSessionV2({
      runtime: overdeepPrototype as ModeMatchRuntimeV2,
      modeDefinitionId: MODE_DEFINITION_ID,
      participantIds: PARTICIPANT_IDS,
      localParticipantId: LOCAL_PARTICIPANT_ID,
      controllers: [],
    }))).toMatch(/原型链超过32层/);

    let cyclicResult: object;
    cyclicResult = new Proxy(Object.create(null) as object, {
      getPrototypeOf() { return cyclicResult; },
    });
    const cyclicResultSession = createHarness({ start: () => cyclicResult });
    expect(failureMessages(() => cyclicResultSession.session.start()))
      .toMatch(/返回值原型链不能循环/);

    let overdeepResult = Object.create(null) as object;
    for (let depth = 0; depth < 33; depth += 1) {
      overdeepResult = Object.create(overdeepResult) as object;
    }
    const overdeepResultSession = createHarness({ start: () => overdeepResult });
    expect(failureMessages(() => overdeepResultSession.session.start()))
      .toMatch(/返回值原型链超过32层/);
  });

  it('rejects native Promise then/species descriptor drift without executing drifted code', () => {
    const thenDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
    expect(thenDescriptor).toBeDefined();
    let thenCalls = 0;
    Object.defineProperty(Promise.prototype, 'then', {
      ...thenDescriptor,
      value() {
        thenCalls += 1;
        throw new Error('must not execute');
      },
    });
    try {
      const driftedThen = createHarness();
      expect(failureMessages(() => driftedThen.session.start()))
        .toMatch(/Promise\.prototype\.then描述符漂移/);
      expect(thenCalls).toBe(0);
    } finally {
      Object.defineProperty(Promise.prototype, 'then', thenDescriptor!);
    }

    const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    expect(speciesDescriptor).toBeDefined();
    let speciesGetterCalls = 0;
    const nativePromise = Promise.resolve(startOutcome());
    Object.defineProperty(Promise, Symbol.species, {
      ...speciesDescriptor,
      get() {
        speciesGetterCalls += 1;
        return Promise;
      },
    });
    try {
      const driftedSpecies = createHarness({ start: () => nativePromise });
      expect(failureMessages(() => driftedSpecies.session.start()))
        .toMatch(/Promise\[Symbol\.species\]描述符漂移/);
      expect(speciesGetterCalls).toBe(0);
    } finally {
      Object.defineProperty(Promise, Symbol.species, speciesDescriptor!);
    }
  });

  it('rejects controller Promise/thenable inputs without executing a hostile then method', () => {
    const asyncController = createHarness({
      controllerInput: (participantId, world) => participantId === 'p2'
        ? Promise.resolve(createNeutralInputFrame(world.tick, participantId))
        : createNeutralInputFrame(world.tick, participantId),
    });
    asyncController.session.start();
    expect(failureMessages(() => asyncController.session.step(
      createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID),
    ))).toMatch(/同步完成/);
    expect(asyncController.calls.step).toBe(0);

    let thenCalls = 0;
    const hostileController = createHarness({
      controllerInput: (participantId, world) => participantId === 'p2'
        ? { then() { thenCalls += 1; } }
        : createNeutralInputFrame(world.tick, participantId),
    });
    hostileController.session.start();
    expect(failureMessages(() => hostileController.session.step(
      createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID),
    ))).toMatch(/同步完成/);
    expect(thenCalls).toBe(0);
    expect(hostileController.calls.step).toBe(0);
  });

  it('applies the same zero-call thenable boundary to pause/resume and owned cleanup', () => {
    const counters = Array.from({ length: 4 }, () => ({ calls: 0 }));
    const hostile = (counter: { calls: number }) => ({
      then() { counter.calls += 1; },
    });

    const pauseSession = createHarness({ pause: () => hostile(counters[0]!) });
    pauseSession.session.start();
    expect(failureMessages(() => pauseSession.session.pause())).toMatch(/同步完成/);

    const resumeSession = createHarness({ resume: () => hostile(counters[1]!) });
    resumeSession.session.start();
    resumeSession.session.pause();
    expect(failureMessages(() => resumeSession.session.resume())).toMatch(/同步完成/);

    const runtimeDestroySession = createHarness({
      runtimeDestroy: () => hostile(counters[2]!),
    });
    expect(failureMessages(() => runtimeDestroySession.session.destroy()))
      .toMatch(/清理不完整|同步完成/);

    const controllerDestroySession = createHarness({
      controllerDestroy: (participantId) => participantId === 'p2'
        ? hostile(counters[3]!)
        : undefined,
    });
    expect(failureMessages(() => controllerDestroySession.session.destroy()))
      .toMatch(/清理不完整|同步完成/);

    expect(counters.map(({ calls }) => calls)).toEqual([0, 0, 0, 0]);
  });

  it('keeps local input pre-validation retryable without consuming controllers or cleanup', () => {
    const value = createHarness();
    value.session.start();
    expect(() => value.session.step(createNeutralInputFrame(1, LOCAL_PARTICIPANT_ID)))
      .toThrow(/tick/);
    expect(value.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.RUNNING);
    expect(value.controllerInputCalls).toEqual([]);
    expect(value.calls.step).toBe(0);
    expect(value.cleanupOrder).toEqual([]);

    const retried = value.session.step(createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID));
    expect(retried.readFrame.worldSnapshot.tick).toBe(1);
    expect(value.calls.step).toBe(1);
  });

  it('turns a runtime step error terminal and prevents further authority use', () => {
    const runtimeError = new Error('runtime-step-failed');
    const value = createHarness({ step: () => { throw runtimeError; } });
    value.session.start();
    let failure: unknown;
    try {
      value.session.step(createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID));
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ cause: runtimeError });
    expect(value.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.FAILED);
    expect(value.session.readFrame).toBeNull();
    expect(value.cleanupOrder).toEqual(['p2', 'runtime']);
    expect(() => value.session.step(createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID)))
      .toThrow(/状态failed/);
    expect(value.calls.step).toBe(1);
  });

  it('never coerces hostile runtime errors and still attempts every owned cleanup', () => {
    let coercions = 0;
    const hostile = Object.defineProperty(Object.create(null), Symbol.toPrimitive, {
      value() {
        coercions += 1;
        throw new Error('must-not-coerce');
      },
    });
    const value = createHarness({ step: () => { throw hostile; } });
    value.session.start();
    expect(() => value.session.step(createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID)))
      .toThrow(/运行失败/);
    expect(coercions).toBe(0);
    expect(value.cleanupOrder).toEqual(['p2', 'runtime']);
    expect(value.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.FAILED);
  });

  it('fails closed when a runtime callback swallows lifecycle reentry', () => {
    let session: ModeLocalMatchSessionV2;
    const value = createHarness({
      start: () => {
        try {
          session.start();
        } catch {
          // A hostile port cannot turn rejected reentry into outer success.
        }
        return startOutcome();
      },
    });
    session = value.session;
    expect(failureMessages(() => session.start())).toMatch(/重入/);
    expect(session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.FAILED);
    expect(value.cleanupOrder).toEqual(['p2', 'runtime']);
  });

  it('supports pause/resume and makes destroy idempotent with reverse cleanup', () => {
    const value = createHarness();
    value.session.start();
    value.session.pause();
    expect(value.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.PAUSED);
    expect(value.calls.pause).toBe(1);
    value.session.resume();
    expect(value.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.RUNNING);
    expect(value.calls.resume).toBe(1);

    value.session.destroy();
    value.session.destroy();
    expect(value.session.state).toBe(MODE_LOCAL_MATCH_SESSION_V2_STATE.DESTROYED);
    expect(value.cleanupOrder).toEqual(['p2', 'runtime']);
    expect(value.calls.runtimeDestroy).toBe(1);
  });

  it('rolls back fully captured construction ports in reverse order', () => {
    const cleanupOrder: string[] = [];
    const runtime: ModeMatchRuntimeV2 = {
      start() {},
      step() {},
      pause() {},
      resume() {},
      destroy() { cleanupOrder.push('runtime'); },
    };
    const controllers: ModeInputControllerBindingV2[] = ['p2', 'foreign'].map(
      (participantId) => ({
        participantId,
        controller: {
          createInput() { return null; },
          destroy() { cleanupOrder.push(participantId); },
        },
      }),
    );
    expect(failureMessages(() => new ModeLocalMatchSessionV2({
      runtime,
      modeDefinitionId: MODE_DEFINITION_ID,
      participantIds: PARTICIPANT_IDS,
      localParticipantId: LOCAL_PARTICIPANT_ID,
      controllers,
    }))).toMatch(/覆盖全部非local participant/);
    expect(cleanupOrder).toEqual(['foreign', 'p2', 'runtime']);
  });
});
