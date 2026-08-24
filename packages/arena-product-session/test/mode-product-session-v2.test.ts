import { describe, expect, it } from 'vitest';
import {
  MODE_PRODUCT_SESSION_V2_STATE,
  ModeProductSessionV2,
} from '../src/index.js';

const PREPARED_REWARD_GRANT = Object.freeze({
  schemaVersion: 1 as const,
  grantId: 'grant-1',
  rewardDefinitionId: 'reward-1',
  resultAuthorityHash: 'deadbeef',
  experienceDelta: 10,
  unlocks: Object.freeze({
    characterIds: Object.freeze([]),
    appearanceIds: Object.freeze([]),
    equipmentIds: Object.freeze([]),
    mapIds: Object.freeze([]),
  }),
});

function cause(value: unknown): unknown {
  return value && typeof value === 'object'
    ? Object.getOwnPropertyDescriptor(value, 'cause')?.value
    : undefined;
}

function matchSession(start: () => unknown, destroy: () => unknown = () => undefined) {
  return {
    start,
    step() { return {}; },
    pause() {},
    resume() {},
    destroy,
  };
}

function assembler(destroy: () => unknown = () => undefined) {
  return {
    appendEvents() {},
    finalize() { return {}; },
    destroy,
  };
}

function productSession(
  match: unknown,
  resultAssembler: unknown = assembler(),
): ModeProductSessionV2 {
  return new ModeProductSessionV2({
    modeDefinitionId: 'mode.duel.test.v1',
    matchSession: match as never,
    resultAssembler: resultAssembler as never,
    rewardCommitter: {
      prepare() { return PREPARED_REWARD_GRANT; },
      commit() { return {}; },
    } as never,
  });
}

function prototypeChain(depth: number): object {
  let value: object = Object.create(null);
  for (let index = 0; index < depth; index += 1) value = Object.create(value);
  return value;
}

function productStartOutcome() {
  return Object.freeze({
    readFrame: Object.freeze({ tick: 0 }),
    readFrameAudit: Object.freeze({ activeSupplyProjection: null }),
    supplyCadence: null,
    localJumpAvailability: Object.freeze({ state: 'ready' }),
  });
}

function fixture(rewardCommit: () => unknown = () => ({
  grant: {
    schemaVersion: 1,
    grantId: 'grant-1',
    rewardDefinitionId: 'reward-1',
    resultAuthorityHash: 'deadbeef',
    experienceDelta: 10,
    unlocks: { characterIds: [], appearanceIds: [], equipmentIds: [], mapIds: [] },
  },
  committed: true,
  duplicate: false,
  profile: { profileId: 'profile-1' },
})) {
  const modeResult = {
    kind: 'duel', winnerParticipantIds: ['p1'], isDraw: false,
    reason: 'last-participant-standing', endedAtTick: 10,
  };
  const productResult = {
    modeDefinitionId: 'mode.duel.test.v1',
    modeResult,
    authorityHash: 'deadbeef',
  };
  let matchDestroyed = 0;
  let assemblerDestroyed = 0;
  return {
    get matchDestroyed() { return matchDestroyed; },
    get assemblerDestroyed() { return assemblerDestroyed; },
    session: new ModeProductSessionV2({
      modeDefinitionId: 'mode.duel.test.v1',
      matchSession: {
        start() { return productStartOutcome(); },
        step() {
          return Object.freeze({
            events: Object.freeze([{ id: 'event-1' }]),
            supplyFacts: Object.freeze([]),
            supplyCadence: null,
            readFrame: Object.freeze({ tick: 10 }),
            readFrameAudit: Object.freeze({ activeSupplyProjection: null }),
            inputs: Object.freeze([]),
            weaponFeedbackDirectionFactsV2: Object.freeze([]),
            localJumpAvailability: Object.freeze({ state: 'blocked' }),
            result: Object.freeze(modeResult),
          });
        },
        pause() {},
        resume() {},
        destroy() { matchDestroyed += 1; },
      },
      resultAssembler: {
        appendEvents() {},
        finalize() { return Object.freeze(productResult); },
        destroy() { assemblerDestroyed += 1; },
      } as never,
      rewardCommitter: {
        prepare() { return PREPARED_REWARD_GRANT; },
        commit: rewardCommit,
      } as never,
    }),
  };
}

describe('P2.5 mode Product Session V2 candidate', () => {
  it('holds terminal matches in reward-pending until one explicit settlement', () => {
    const value = fixture();
    value.session.start();
    const step = value.session.step({});
    expect(step.snapshot.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.REWARD_PENDING);
    expect(value.session.settleReward().committed).toBe(true);
    expect(value.session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.SETTLED);
    value.session.destroy();
    value.session.destroy();
    expect(value.matchDestroyed).toBe(1);
    expect(value.assemblerDestroyed).toBe(1);
  });

  it('keeps an explicitly recoverable reward write in reward-pending', () => {
    const value = fixture(() => {
      throw Object.assign(new Error('retry'), { recoverable: true });
    });
    value.session.start();
    value.session.step({});
    expect(() => value.session.settleReward()).toThrow(/retry/);
    expect(value.session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.REWARD_PENDING);
  });

  it('treats a hostile recoverable-marker trap as terminal instead of escaping cleanup', () => {
    let descriptorCalls = 0;
    const hostile = new Proxy(Object.create(null), {
      getOwnPropertyDescriptor() {
        descriptorCalls += 1;
        throw new Error('hostile-descriptor');
      },
    });
    const value = fixture(() => { throw hostile; });
    value.session.start();
    value.session.step({});
    expect(() => value.session.settleReward()).toThrow(/失败关闭/);
    expect(descriptorCalls).toBe(1);
    expect(value.session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
    expect(value.matchDestroyed).toBe(1);
    expect(value.assemblerDestroyed).toBe(1);
  });

  it('fails closed and cleans owned resources after an ambiguous reward error', () => {
    const ambiguous = new Error('write outcome unknown');
    const value = fixture(() => { throw ambiguous; });
    value.session.start();
    value.session.step({});
    let failure: unknown;
    try {
      value.session.settleReward();
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ cause: ambiguous });
    expect(value.session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
    expect(value.matchDestroyed).toBe(1);
    expect(value.assemblerDestroyed).toBe(1);
  });

  it('rejects an asynchronous match port before publishing running state', () => {
    let matchDestroyed = 0;
    let assemblerDestroyed = 0;
    const session = new ModeProductSessionV2({
      modeDefinitionId: 'mode.duel.test.v1',
      matchSession: {
        start: (() => Promise.resolve({ readFrame: {} })) as never,
        step() { return {}; },
        pause() {},
        resume() {},
        destroy() { matchDestroyed += 1; },
      },
      resultAssembler: {
        appendEvents() {},
        finalize() { return {}; },
        destroy() { assemblerDestroyed += 1; },
      } as never,
      rewardCommitter: {
        prepare() { return PREPARED_REWARD_GRANT; },
        commit() { return {}; },
      } as never,
    });
    expect(() => session.start()).toThrow(/同步完成/);
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
    expect(matchDestroyed).toBe(1);
    expect(assemblerDestroyed).toBe(1);
  });

  it('retains failed cleanup ownership and retries without coercing hostile errors', () => {
    let matchDestroyCalls = 0;
    let assemblerDestroyCalls = 0;
    let coercions = 0;
    const hostile = Object.defineProperty(Object.create(null), Symbol.toPrimitive, {
      value() {
        coercions += 1;
        throw new Error('must-not-coerce');
      },
    });
    const session = new ModeProductSessionV2({
      modeDefinitionId: 'mode.duel.test.v1',
      matchSession: {
        start() { throw hostile; },
        step() { return {}; },
        pause() {},
        resume() {},
        destroy() {
          matchDestroyCalls += 1;
          if (matchDestroyCalls === 1) throw hostile;
        },
      },
      resultAssembler: {
        appendEvents() {},
        finalize() { return {}; },
        destroy() {
          assemblerDestroyCalls += 1;
          if (assemblerDestroyCalls === 1) throw hostile;
        },
      } as never,
      rewardCommitter: {
        prepare() { return PREPARED_REWARD_GRANT; },
        commit() { return {}; },
      } as never,
    });
    expect(() => session.start()).toThrow(/清理不完整/);
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
    expect(coercions).toBe(0);
    expect([assemblerDestroyCalls, matchDestroyCalls]).toEqual([1, 1]);

    session.destroy();
    session.destroy();
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.DESTROYED);
    expect([assemblerDestroyCalls, matchDestroyCalls]).toEqual([2, 2]);
    expect(coercions).toBe(0);
  });

  it('fails closed when the match port catches and swallows lifecycle reentry', () => {
    let session: ModeProductSessionV2;
    let matchDestroyed = 0;
    let assemblerDestroyed = 0;
    session = new ModeProductSessionV2({
      modeDefinitionId: 'mode.duel.test.v1',
      matchSession: {
        start() {
          try {
            session.start();
          } catch {
            // The outer transaction must still observe this attempt.
          }
          return { readFrame: {} };
        },
        step() { return {}; },
        pause() {},
        resume() {},
        destroy() { matchDestroyed += 1; },
      },
      resultAssembler: {
        appendEvents() {},
        finalize() { return {}; },
        destroy() { assemblerDestroyed += 1; },
      } as never,
      rewardCommitter: {
        prepare() { return PREPARED_REWARD_GRANT; },
        commit() { return {}; },
      } as never,
    });
    expect(() => session.start()).toThrow(/重入/);
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
    expect([assemblerDestroyed, matchDestroyed]).toEqual([1, 1]);
  });

  it('retains the reentered cleanup owner and stops before later owners', () => {
    let session: ModeProductSessionV2;
    let assemblerDestroyed = 0;
    let matchDestroyed = 0;
    session = productSession(
      matchSession(
        () => ({ readFrame: {} }),
        () => { matchDestroyed += 1; },
      ),
      assembler(() => {
        assemblerDestroyed += 1;
        if (assemblerDestroyed === 1) {
          try {
            session.getSnapshot();
          } catch {
            // The cleanup callback deliberately swallows the public reentry.
          }
        }
      }),
    );

    expect(() => session.destroy()).toThrow(/重入|清理不完整/);
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
    expect([assemblerDestroyed, matchDestroyed]).toEqual([1, 0]);
    session.destroy();
    session.destroy();
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.DESTROYED);
    expect([assemblerDestroyed, matchDestroyed]).toEqual([2, 1]);
  });

  it('never executes hostile then or constructor accessors returned by a sync port', () => {
    for (const key of ['then', 'constructor'] as const) {
      let accessorCalls = 0;
      let matchDestroyed = 0;
      let assemblerDestroyed = 0;
      const returned = Object.create(null) as Record<string, unknown>;
      Object.defineProperty(returned, key, {
        get() {
          accessorCalls += 1;
          throw new Error('must-not-run');
        },
      });
      const session = productSession(
        matchSession(
          () => returned,
          () => { matchDestroyed += 1; },
        ),
        assembler(() => { assemblerDestroyed += 1; }),
      );

      expect(() => session.start()).toThrow(/访问器/);
      expect(accessorCalls).toBe(0);
      expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
      expect([assemblerDestroyed, matchDestroyed]).toEqual([1, 1]);
    }
  });

  it('rejects Promise subclasses without calling their inherited then method', () => {
    let speciesCalls = 0;
    class DerivedPromise<T> extends Promise<T> {
      static get [Symbol.species](): PromiseConstructor {
        speciesCalls += 1;
        return Promise;
      }
    }
    const session = productSession(matchSession(
      () => new DerivedPromise((resolve) => resolve({ readFrame: {} })),
    ));

    expect(() => session.start()).toThrow(/同步完成/);
    expect(speciesCalls).toBe(0);
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
  });

  it('contains a rejected native Promise before failing closed', () => {
    const session = productSession(matchSession(
      () => Promise.reject(new Error('late-rejection')),
    ));
    let thrown: unknown;
    try {
      session.start();
    } catch (error) {
      thrown = error;
    }

    expect(cause(thrown)).toBeInstanceOf(TypeError);
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
  });

  it('distinguishes cyclic and over-deep returned prototype chains', () => {
    let cyclic: object;
    cyclic = new Proxy(Object.create(null), {
      getPrototypeOf() { return cyclic; },
    });
    const cycleSession = productSession(matchSession(() => cyclic));
    expect(() => cycleSession.start()).toThrow(/循环/);

    const deepSession = productSession(matchSession(() => prototypeChain(33)));
    expect(() => deepSession.start()).toThrow(/超过32层/);
  });

  it('leaves caller-owned children untouched when captured ports are invalid', () => {
    let getterCalls = 0;
    let destroyCalls = 0;
    const accessorPort = matchSession(() => ({}), () => { destroyCalls += 1; });
    Object.defineProperty(accessorPort, 'step', {
      get() {
        getterCalls += 1;
        throw new Error('must-not-run');
      },
    });
    expect(() => productSession(accessorPort)).toThrow(/数据方法/);
    expect(getterCalls).toBe(0);
    expect(destroyCalls).toBe(0);

    const cyclicTarget = {
      destroy() { destroyCalls += 1; },
    };
    let cyclicPort: object;
    cyclicPort = new Proxy(cyclicTarget, {
      getPrototypeOf() { return cyclicPort; },
    });
    expect(() => productSession(cyclicPort)).toThrow(/循环/);
    expect(destroyCalls).toBe(0);
  });

  it('transfers neither assembler nor match when match port capture fails', () => {
    const cleanupOrder: string[] = [];
    let getterCalls = 0;
    const invalidMatch = matchSession(
      () => ({}),
      () => { cleanupOrder.push('match'); },
    );
    Object.defineProperty(invalidMatch, 'step', {
      get() {
        getterCalls += 1;
        throw new Error('must-not-run');
      },
    });
    const resultAssembler = assembler(() => { cleanupOrder.push('assembler'); });

    expect(() => productSession(
      invalidMatch,
      resultAssembler,
    )).toThrow(/数据方法/);
    expect(getterCalls).toBe(0);
    expect(cleanupOrder).toEqual([]);
    resultAssembler.destroy();
    invalidMatch.destroy();
    expect(cleanupOrder).toEqual(['assembler', 'match']);
  });

  it('fails before invoking step consumers when a required result field is an accessor', () => {
    let resultGetterCalls = 0;
    let appendCalls = 0;
    const step = {
      events: Object.freeze([]),
      supplyFacts: Object.freeze([]),
      supplyCadence: null,
      readFrame: Object.freeze({}),
      readFrameAudit: Object.freeze({ activeSupplyProjection: null }),
      inputs: Object.freeze([]),
      weaponFeedbackDirectionFactsV2: Object.freeze([]),
    } as Record<string, unknown>;
    Object.defineProperty(step, 'result', {
      enumerable: true,
      get() {
        resultGetterCalls += 1;
        return null;
      },
    });
    const session = productSession({
      ...matchSession(productStartOutcome),
      step() { return step; },
    }, {
      ...assembler(),
      appendEvents() { appendCalls += 1; },
    });
    session.start();

    expect(() => session.step({})).toThrow(/数据字段/);
    expect(resultGetterCalls).toBe(0);
    expect(appendCalls).toBe(0);
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
  });

  it('requires explicit supply facts before invoking Product Result consumers', () => {
    let appendCalls = 0;
    const session = productSession({
      ...matchSession(productStartOutcome),
      step() {
        return Object.freeze({
          events: Object.freeze([]),
          readFrame: Object.freeze({}),
          inputs: Object.freeze([]),
          result: null,
        });
      },
    }, {
      ...assembler(),
      appendEvents() { appendCalls += 1; },
    });
    session.start();

    expect(() => session.step({})).toThrow(/supplyFacts|失败关闭/u);
    expect(appendCalls).toBe(0);
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
  });

  it('requires explicit authority audit before invoking Product Result consumers', () => {
    let appendCalls = 0;
    const session = productSession({
      ...matchSession(productStartOutcome),
      step() {
        return Object.freeze({
          events: Object.freeze([]),
          supplyFacts: Object.freeze([]),
          supplyCadence: null,
          readFrame: Object.freeze({}),
          inputs: Object.freeze([]),
          result: null,
        });
      },
    }, {
      ...assembler(),
      appendEvents() { appendCalls += 1; },
    });
    session.start();

    expect(() => session.step({})).toThrow(/readFrameAudit|失败关闭/u);
    expect(appendCalls).toBe(0);
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
  });

  it('rejects an authority audit accessor before invoking Product Result consumers', () => {
    let auditGetterCalls = 0;
    let appendCalls = 0;
    const step = {
      events: Object.freeze([]),
      supplyFacts: Object.freeze([]),
      supplyCadence: null,
      readFrame: Object.freeze({}),
      inputs: Object.freeze([]),
      result: null,
    } as Record<string, unknown>;
    Object.defineProperty(step, 'readFrameAudit', {
      enumerable: true,
      get() {
        auditGetterCalls += 1;
        return { activeSupplyProjection: null };
      },
    });
    const session = productSession({
      ...matchSession(productStartOutcome),
      step() { return step; },
    }, {
      ...assembler(),
      appendEvents() { appendCalls += 1; },
    });
    session.start();

    expect(() => session.step({})).toThrow(/readFrameAudit|数据字段|失败关闭/u);
    expect(auditGetterCalls).toBe(0);
    expect(appendCalls).toBe(0);
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
  });

  it('requires explicit weapon direction facts before invoking Product Result consumers', () => {
    let appendCalls = 0;
    const session = productSession({
      ...matchSession(productStartOutcome),
      step() {
        return Object.freeze({
          events: Object.freeze([]),
          supplyFacts: Object.freeze([]),
          supplyCadence: null,
          readFrame: Object.freeze({}),
          readFrameAudit: Object.freeze({ activeSupplyProjection: null }),
          inputs: Object.freeze([]),
          result: null,
        });
      },
    }, {
      ...assembler(),
      appendEvents() { appendCalls += 1; },
    });
    session.start();

    expect(() => session.step({})).toThrow(/weaponFeedbackDirectionFactsV2|失败关闭/u);
    expect(appendCalls).toBe(0);
    expect(session.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
  });

  it('requires explicit local jump availability before start or step consumers commit', () => {
    let appendCalls = 0;
    const missingStart = productSession(matchSession(() => Object.freeze({
      readFrame: Object.freeze({}),
      readFrameAudit: Object.freeze({ activeSupplyProjection: null }),
      supplyCadence: null,
    })));
    expect(() => missingStart.start()).toThrow(/localJumpAvailability|失败关闭/u);
    expect(missingStart.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);

    const missingStep = productSession({
      ...matchSession(productStartOutcome),
      step() {
        return Object.freeze({
          events: Object.freeze([]),
          supplyFacts: Object.freeze([]),
          supplyCadence: null,
          readFrame: Object.freeze({}),
          readFrameAudit: Object.freeze({ activeSupplyProjection: null }),
          inputs: Object.freeze([]),
          weaponFeedbackDirectionFactsV2: Object.freeze([]),
          result: null,
        });
      },
    }, {
      ...assembler(),
      appendEvents() { appendCalls += 1; },
    });
    missingStep.start();
    expect(() => missingStep.step({})).toThrow(/localJumpAvailability|失败关闭/u);
    expect(appendCalls).toBe(0);
    expect(missingStep.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
  });

  it('fails closed under native Promise then/species descriptor drift', () => {
    const thenDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
    const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    if (thenDescriptor === undefined || speciesDescriptor === undefined) {
      throw new Error('native Promise descriptors unavailable');
    }

    const thenSession = productSession(matchSession(() => ({ readFrame: {} })));
    let thenFailure: unknown;
    try {
      Object.defineProperty(Promise.prototype, 'then', {
        ...thenDescriptor,
        value: function driftedThen() { return undefined; },
      });
      thenSession.start();
    } catch (error) {
      thenFailure = error;
    } finally {
      Object.defineProperty(Promise.prototype, 'then', thenDescriptor);
    }
    expect(thenFailure).toBeDefined();
    expect(thenSession.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
    thenSession.destroy();

    const speciesSession = productSession(matchSession(
      () => Promise.resolve({ readFrame: {} }),
    ));
    let speciesFailure: unknown;
    try {
      Object.defineProperty(Promise, Symbol.species, {
        ...speciesDescriptor,
        get() { return class DriftedPromise extends Promise {}; },
      });
      speciesSession.start();
    } catch (error) {
      speciesFailure = error;
    } finally {
      Object.defineProperty(Promise, Symbol.species, speciesDescriptor);
    }
    expect(speciesFailure).toBeDefined();
    expect(speciesSession.state).toBe(MODE_PRODUCT_SESSION_V2_STATE.FAILED);
  });
});
