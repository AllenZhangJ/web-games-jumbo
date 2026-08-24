import { describe, expect, it } from 'vitest';
import {
  ACTION_RESOLUTION_KIND,
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_READ_PROFILE,
  createArenaMatchEventV6,
  createMatchReadFrameV3Audit,
  createNeutralInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE,
  ModeAuthoritativeLocalMatchSessionV3,
  type ModeAuthoritativeMatchRuntimeV3,
} from '../src/mode-authoritative-local-match-session-v3.js';

const MODE_DEFINITION_ID = 'mode.duel.authoritative-session-v3.test.v1';
const PARTICIPANT_IDS = Object.freeze(['p1', 'p2']);
const LOCAL_PARTICIPANT_ID = 'p1';
const NO_SUPPLY = Object.freeze({
  worldSupplyEquipmentInstanceIds: Object.freeze([]),
  expectedWorldSupplyIdentities: Object.freeze([]),
});

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

function result() {
  return {
    kind: 'duel',
    winnerParticipantIds: ['p1'],
    isDraw: false,
    reason: 'last-participant-standing',
    endedAtTick: 0,
  } as const;
}

function frame(tick: number, eventSequence: number, ended = false) {
  return createMatchReadFrameV3Audit({
    schemaVersion: 3,
    worldSnapshot: {
      authoritySchemaVersion: 6,
      physicsBackendVersion: 'lightweight-v3.test',
      configHash: 'deadbeef',
      ruleContentHash: 'c0ffee00',
      matchSeed: 7,
      tick,
      activeTick: tick,
      phase: ended ? 'ended' : 'running',
      remainingTicks: Math.max(0, 100 - tick),
      eventSequence,
      modeDefinitionId: MODE_DEFINITION_ID,
      participants: PARTICIPANT_IDS.map(participant),
      equipment: [],
      activeSupplyProjection: null,
      modeProjection: {
        schemaVersion: 1,
        modeDefinitionId: MODE_DEFINITION_ID,
        revision: tick,
        preparationRemainingTicks: null,
        state: { kind: 'duel', suddenDeath: false },
      },
      map: {
        schemaVersion: 1,
        definitionId: 'main-map.test',
        nextActiveTick: tick + 1,
        revision: tick,
        surfaces: [{ id: 'main', enabled: true, revision: 0 }],
        occurrences: [],
      },
      result: ended ? result() : null,
    },
    localActionSidecar: {
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
    },
  }, NO_SUPPLY);
}

function startOutcome() {
  return Object.freeze({
    readFrame: frame(0, 0),
    readFrameAudit: NO_SUPPLY,
    supplyCadence: null,
    localJumpAvailability: Object.freeze({
      schemaVersion: 1 as const,
      tick: 0,
      eventSequence: 0,
      participantId: LOCAL_PARTICIPANT_ID,
      canMove: true,
      canGroundJump: true,
      canAirJump: false,
      state: 'ready' as const,
    }),
  });
}

function terminalStepOutcome() {
  const started = createArenaMatchEventV6({
    id: 'event-start-0',
    sequence: 0,
    tick: 0,
    type: ARENA_MATCH_EVENT_V6.MATCH_STARTED,
    modeDefinitionId: MODE_DEFINITION_ID,
    participantIds: PARTICIPANT_IDS,
  });
  const ended = createArenaMatchEventV6({
    id: 'event-end-1',
    sequence: 1,
    tick: 0,
    type: ARENA_MATCH_EVENT_V6.MATCH_ENDED,
    modeDefinitionId: MODE_DEFINITION_ID,
    modeResult: result(),
  });
  return Object.freeze({
    events: Object.freeze([started, ended]),
    supplyFacts: Object.freeze([]),
    supplyCadence: null,
    localJumpAvailability: Object.freeze({
      schemaVersion: 1 as const,
      tick: 1,
      eventSequence: 2,
      participantId: LOCAL_PARTICIPANT_ID,
      canMove: false,
      canGroundJump: false,
      canAirJump: false,
      state: 'blocked' as const,
    }),
    readFrame: frame(1, 2, true),
    readFrameAudit: NO_SUPPLY,
    inputs: Object.freeze(PARTICIPANT_IDS.map((participantId) => (
      createNeutralInputFrame(0, participantId)
    ))),
    weaponFeedbackDirectionFactsV2: Object.freeze([]),
  });
}

interface RuntimeOverrides {
  readonly start?: () => unknown;
  readonly step?: (input: ArenaInputFrame) => unknown;
  readonly pause?: () => unknown;
  readonly resume?: () => unknown;
  readonly getModeDriverContentHash?: () => unknown;
  readonly getTerminalAuthorityIdentity?: () => unknown;
  readonly exportReplayV6?: () => unknown;
  readonly exportTerminalEvidenceV1?: () => unknown;
  readonly exportTerminalEvidenceV2?: () => unknown;
  readonly destroy?: () => unknown;
}

function sessionFor(overrides: RuntimeOverrides = {}) {
  const runtime: ModeAuthoritativeMatchRuntimeV3 = {
    start: overrides.start ?? startOutcome,
    step: overrides.step ?? terminalStepOutcome,
    pause: overrides.pause ?? (() => undefined),
    resume: overrides.resume ?? (() => undefined),
    getModeDriverContentHash:
      overrides.getModeDriverContentHash ?? (() => 'a001a001'),
    getTerminalAuthorityIdentity:
      overrides.getTerminalAuthorityIdentity ?? (() => Object.freeze({ identity: 'terminal' })),
    exportReplayV6: overrides.exportReplayV6 ?? (() => {
      throw new Error('test Replay V6 not configured');
    }),
    exportTerminalEvidenceV1: overrides.exportTerminalEvidenceV1 ?? (() => {
      throw new Error('test Runtime terminal evidence V1 not configured');
    }),
    exportTerminalEvidenceV2: overrides.exportTerminalEvidenceV2 ?? (() => {
      throw new Error('test Runtime terminal evidence V2 not configured');
    }),
    destroy: overrides.destroy ?? (() => undefined),
  };
  return new ModeAuthoritativeLocalMatchSessionV3({
    runtime,
    modeDefinitionId: MODE_DEFINITION_ID,
    participantIds: PARTICIPANT_IDS,
    localParticipantId: LOCAL_PARTICIPANT_ID,
  });
}

function hostileThen(counter: { calls: number }) {
  return { then() { counter.calls += 1; } };
}

describe('ModeAuthoritativeLocalMatchSessionV3 synchronous port boundary', () => {
  it('retains Runtime ownership when destroy swallows public reentry', () => {
    let session: ModeAuthoritativeLocalMatchSessionV3;
    let destroys = 0;
    session = sessionFor({
      destroy: () => {
        destroys += 1;
        if (destroys === 1) {
          try {
            void session.readFrame;
          } catch {
            // The Runtime deliberately swallows the public reentry rejection.
          }
        }
      },
    });

    expect(() => session.destroy()).toThrow(/重入|清理不完整/);
    expect(session.state).toBe(MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.FAILED);
    expect(destroys).toBe(1);
    session.destroy();
    session.destroy();
    expect(session.state).toBe(MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.DESTROYED);
    expect(destroys).toBe(2);
  });

  it('never executes hostile then or accessor descriptors', () => {
    const thenCounter = { calls: 0 };
    const thenSession = sessionFor({ start: () => hostileThen(thenCounter) });
    expect(failureMessages(() => thenSession.start())).toMatch(/同步完成/);
    expect(thenCounter.calls).toBe(0);

    let thenGetterCalls = 0;
    const thenGetterSession = sessionFor({
      start: () => Object.defineProperty({}, 'then', {
        get() {
          thenGetterCalls += 1;
          throw new Error('must not execute');
        },
      }),
    });
    expect(failureMessages(() => thenGetterSession.start())).toMatch(/访问器thenable/);
    expect(thenGetterCalls).toBe(0);

    let constructorGetterCalls = 0;
    const promise = Promise.resolve(startOutcome());
    Object.defineProperty(promise, 'constructor', {
      get() {
        constructorGetterCalls += 1;
        throw new Error('must not execute');
      },
    });
    const constructorGetterSession = sessionFor({ start: () => promise });
    expect(failureMessages(() => constructorGetterSession.start()))
      .toMatch(/访问器constructor/);
    expect(constructorGetterCalls).toBe(0);
  });

  it('applies the same synchronous boundary to every runtime port', () => {
    const counters = Array.from({ length: 6 }, () => ({ calls: 0 }));

    const startSession = sessionFor({ start: () => hostileThen(counters[0]!) });
    expect(failureMessages(() => startSession.start())).toMatch(/同步完成/);

    const stepSession = sessionFor({ step: () => hostileThen(counters[1]!) });
    stepSession.start();
    expect(failureMessages(() => stepSession.step(
      createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID),
    ))).toMatch(/同步完成/);

    const pauseSession = sessionFor({ pause: () => hostileThen(counters[2]!) });
    pauseSession.start();
    expect(failureMessages(() => pauseSession.pause())).toMatch(/同步完成/);

    const resumeSession = sessionFor({ resume: () => hostileThen(counters[3]!) });
    resumeSession.start();
    resumeSession.pause();
    expect(failureMessages(() => resumeSession.resume())).toMatch(/同步完成/);

    const terminalSession = sessionFor({
      getTerminalAuthorityIdentity: () => hostileThen(counters[4]!),
    });
    terminalSession.start();
    terminalSession.step(createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID));
    expect(failureMessages(() => terminalSession.getTerminalAuthorityIdentity()))
      .toMatch(/同步完成/);

    const destroySession = sessionFor({ destroy: () => hostileThen(counters[5]!) });
    expect(failureMessages(() => destroySession.destroy())).toMatch(/清理不完整|同步完成/);
    expect(counters.map(({ calls }) => calls)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('requires every runtime step to carry explicit supply facts before session commit', () => {
    const session = sessionFor({
      step: () => {
        const { supplyFacts: _ignored, ...withoutSupplyFacts } = terminalStepOutcome();
        return withoutSupplyFacts;
      },
    });
    session.start();
    expect(failureMessages(() => session.step(
      createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID),
    ))).toMatch(/supplyFacts|失败关闭/u);
    expect(session.state).toBe(MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.FAILED);
  });

  it('requires every runtime step to carry explicit weapon direction facts', () => {
    const session = sessionFor({
      step: () => {
        const {
          weaponFeedbackDirectionFactsV2: _ignored,
          ...withoutDirectionFacts
        } = terminalStepOutcome();
        return withoutDirectionFacts;
      },
    });
    session.start();
    expect(failureMessages(() => session.step(
      createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID),
    ))).toMatch(/weaponFeedbackDirectionFactsV2|失败关闭/u);
    expect(session.state).toBe(MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.FAILED);
  });

  it('requires explicit local jump availability at start and every step', () => {
    const missingStart = sessionFor({
      start: () => {
        const { localJumpAvailability: _ignored, ...withoutJumpAvailability } = startOutcome();
        return withoutJumpAvailability;
      },
    });
    expect(failureMessages(() => missingStart.start()))
      .toMatch(/localJumpAvailability|失败关闭/u);
    expect(missingStart.state).toBe(MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.FAILED);

    const missingStep = sessionFor({
      step: () => {
        const {
          localJumpAvailability: _ignored,
          ...withoutJumpAvailability
        } = terminalStepOutcome();
        return withoutJumpAvailability;
      },
    });
    missingStep.start();
    expect(failureMessages(() => missingStep.step(
      createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID),
    ))).toMatch(/localJumpAvailability|失败关闭/u);
    expect(missingStep.state).toBe(MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.FAILED);
  });

  it('rejects native Promise, Promise subclasses, prototype cycles and depth overflow', () => {
    const nativeSession = sessionFor({ start: () => Promise.resolve(startOutcome()) });
    expect(failureMessages(() => nativeSession.start())).toMatch(/同步完成/);

    class SessionPromise<T> extends Promise<T> {}
    const subclassSession = sessionFor({
      start: () => new SessionPromise((resolve) => resolve(startOutcome())),
    });
    expect(failureMessages(() => subclassSession.start())).toMatch(/同步完成/);

    let cyclicPrototype: object;
    cyclicPrototype = new Proxy(Object.create(null) as object, {
      getPrototypeOf() { return cyclicPrototype; },
    });
    expect(failureMessages(() => new ModeAuthoritativeLocalMatchSessionV3({
      runtime: cyclicPrototype as ModeAuthoritativeMatchRuntimeV3,
      modeDefinitionId: MODE_DEFINITION_ID,
      participantIds: PARTICIPANT_IDS,
      localParticipantId: LOCAL_PARTICIPANT_ID,
    }))).toMatch(/原型链不能循环/);

    let overdeepPrototype = Object.create(null) as object;
    for (let depth = 0; depth < 33; depth += 1) {
      overdeepPrototype = Object.create(overdeepPrototype) as object;
    }
    expect(failureMessages(() => new ModeAuthoritativeLocalMatchSessionV3({
      runtime: overdeepPrototype as ModeAuthoritativeMatchRuntimeV3,
      modeDefinitionId: MODE_DEFINITION_ID,
      participantIds: PARTICIPANT_IDS,
      localParticipantId: LOCAL_PARTICIPANT_ID,
    }))).toMatch(/原型链超过32层/);

    let cyclicResult: object;
    cyclicResult = new Proxy(Object.create(null) as object, {
      getPrototypeOf() { return cyclicResult; },
    });
    const cyclicResultSession = sessionFor({ start: () => cyclicResult });
    expect(failureMessages(() => cyclicResultSession.start()))
      .toMatch(/返回值原型链不能循环/);

    let overdeepResult = Object.create(null) as object;
    for (let depth = 0; depth < 33; depth += 1) {
      overdeepResult = Object.create(overdeepResult) as object;
    }
    const overdeepResultSession = sessionFor({ start: () => overdeepResult });
    expect(failureMessages(() => overdeepResultSession.start()))
      .toMatch(/返回值原型链超过32层/);
  });

  it('rejects native Promise descriptor drift without executing drifted code', () => {
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
      const session = sessionFor();
      expect(failureMessages(() => session.start()))
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
      const session = sessionFor({ start: () => nativePromise });
      expect(failureMessages(() => session.start()))
        .toMatch(/Promise\[Symbol\.species\]描述符漂移/);
      expect(speciesGetterCalls).toBe(0);
    } finally {
      Object.defineProperty(Promise, Symbol.species, speciesDescriptor!);
    }
  });

  it('keeps valid synchronous lifecycle and terminal identity behavior unchanged', () => {
    const session = sessionFor();
    session.start();
    session.pause();
    session.resume();
    session.step(createNeutralInputFrame(0, LOCAL_PARTICIPANT_ID));
    expect(session.state).toBe(MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.ENDED);
    expect(session.getTerminalAuthorityIdentity()).toEqual({ identity: 'terminal' });
    session.destroy();
    expect(session.state).toBe(MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.DESTROYED);
  });
});
