import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import {
  ACTION_RESOLUTION_KIND,
  ARENA_MATCH_READ_PROFILE,
  MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
  createMatchContentSelection,
  createMatchReadFrameV2Audit,
  createNeutralInputFrame,
  normalizeInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_MATCH_COORDINATOR_STATE,
  ProductMatchCoordinator,
  ProductMatchRuntime,
  QuickMatchProductFactory,
  createProductMatchRuntimePort,
} from '../src/index.js';

const CONTENT = createMatchContentSelection({
  schemaVersion: MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
  contentDefinitionId: 'test.content',
  contentVersion: 1,
  characterDefinitionIds: ['hero', 'opponent'],
  equipmentDefinitionIds: [],
  mapDefinitionIds: ['arena'],
  selectedMapDefinitionId: 'arena',
  participantCharacters: [
    { participantId: 'player-1', definitionId: 'hero' },
    { participantId: 'player-2', definitionId: 'opponent' },
  ],
});

const OPPONENT = Object.freeze({
  id: 'opponent-1',
  displayName: '玩家1001',
  portraitKey: 'portrait-1',
  appearanceKey: 'appearance-1',
});

const POS = Object.freeze({ x: 0, y: 0, z: 0 });
function frame(tick: number): Readonly<Record<string, unknown>> {
  const outcome = () => ({ kind: ACTION_RESOLUTION_KIND.NONE, actionDefinitionId: null, lane: null, source: null, reason: 'no-candidate' });
  const participant = (id: string) => ({
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
    position: POS,
    velocity: POS,
    facing: { x: 1, z: 0 },
    grounded: true,
    supportSurfaceId: 'surface-ground',
  });
  return createMatchReadFrameV2Audit({
    schemaVersion: 2,
    worldSnapshot: {
      authoritySchemaVersion: 1,
      physicsBackendVersion: 'physics-v1',
      configHash: '12345678',
      ruleContentHash: 'abcdef01',
      matchSeed: 7,
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
        occurrences: [{ occurrenceId: 'occurrence-0', eventId: 'none', kind: 'none', warningTick: 0, startTick: 0, endTick: null, phase: 'running', publicPayload: {}, revision: 0 }],
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
      channels: { primary: outcome(), primaryHold: outcome() },
    },
  });
}

interface SessionHarness {
  readonly state: string;
  starts: number;
  pauses: number;
  destroys: number;
  onStart: (() => void) | null;
  start(): void;
  setPaused(value: boolean): void;
  getPresentationReadFrame(): Readonly<Record<string, unknown>>;
  stepWithPresentationReadFrame(): Readonly<Record<string, unknown>>;
  exportReplay(): Readonly<Record<string, unknown>>;
  destroy(): void;
}

function sessionHarness(): SessionHarness {
  let state = 'created';
  return {
    get state() { return state; },
    starts: 0,
    pauses: 0,
    destroys: 0,
    onStart: null,
    start() {
      this.starts += 1;
      this.onStart?.();
      state = 'running';
    },
    setPaused(value: boolean) {
      this.pauses += 1;
      state = value ? 'paused' : 'running';
    },
    stepWithPresentationReadFrame() {
      return Object.freeze({
        events: Object.freeze([]),
        readFrame: frame(1),
        input: normalizeInputFrame(createNeutralInputFrame(0, 'player-1')),
      });
    },
    getPresentationReadFrame() { return frame(0); },
    exportReplay() { throw new Error('unfinished session'); },
    destroy() {
      this.destroys += 1;
      state = 'destroyed';
    },
  };
}

function localMatch(session: unknown = sessionHarness()) {
  return {
    matchSeed: 7,
    opponent: OPPONENT,
    content: CONTENT,
    session,
  };
}

function runtimeHarness(options: { destroyFailures?: number } = {}) {
  let destroys = 0;
  let onStart: (() => void) | null = null;
  const runtime = {
    get destroys() { return destroys; },
    set onStart(value: (() => void) | null) { onStart = value; },
    startWithReadFrame() { onStart?.(); return Object.freeze({ readFrame: frame(0) }); },
    setPaused(value: boolean) { void value; },
    stepWithReadFrame() {
      return Object.freeze({
        events: Object.freeze([]),
        readFrame: frame(1),
        result: null,
      });
    },
    getReadFrame() { return frame(0); },
    getPublicInfo() {
      return Object.freeze({ matchSeed: 7, opponent: OPPONENT, content: CONTENT });
    },
    getResult() { return null; },
    destroy() {
      destroys += 1;
      if (destroys <= (options.destroyFailures ?? 0)) throw new Error('cleanup failed');
    },
  };
  return runtime;
}

async function unhandledDuring(run: () => unknown | Promise<unknown>): Promise<unknown[]> {
  const unhandled: unknown[] = [];
  const listener = (reason: unknown) => { unhandled.push(reason); };
  process.on('unhandledRejection', listener);
  try {
    await run();
    await new Promise<void>((resolve) => setImmediate(resolve));
  } finally {
    process.off('unhandledRejection', listener);
  }
  return unhandled;
}

function nativeShadowedRejection(message: string, accessor: boolean): {
  readonly value: unknown;
  readonly getCalls: () => number;
} {
  const rejected = Promise.reject(new Error(message));
  let getCalls = 0;
  Object.defineProperty(rejected, 'then', accessor
    ? { configurable: true, get() { getCalls += 1; throw new Error('then getter must not execute'); } }
    : { configurable: true, value: null });
  return { value: rejected, getCalls: () => getCalls };
}

function hostileThenable(counter: { calls: number }): unknown {
  return Object.freeze({
    then() {
      counter.calls += 1;
      return Promise.reject(new Error('hostile returned rejection'));
    },
  });
}

function prototypeChain(depth: number): object {
  let value: object = Object.create(null);
  for (let index = 0; index < depth; index += 1) value = Object.create(value);
  return value;
}

describe('Product Match lifecycle boundaries', () => {
  it('rejects option accessors and snapshots LocalMatchSession methods', () => {
    let getterCalls = 0;
    expect(() => new ProductMatchRuntime(localMatch(), {
      get completionSink() {
        getterCalls += 1;
        return null;
      },
    })).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);

    const session = sessionHarness();
    const runtime = new ProductMatchRuntime(localMatch(session));
    session.start = () => { throw new Error('replacement must not execute'); };
    runtime.startWithReadFrame();
    expect(session.starts).toBe(1);
    runtime.destroy();
  });

  it('blocks every Runtime operation reentered from a Session callback', () => {
    const session = sessionHarness();
    const runtime = new ProductMatchRuntime(localMatch(session));
    const errors: Error[] = [];
    session.onStart = () => {
      const operations = [
        () => runtime.startWithReadFrame(),
        () => runtime.setPaused(true),
        () => runtime.stepWithReadFrame(),
        () => runtime.getReadFrame(),
        () => runtime.getPublicInfo(),
        () => runtime.getResult(),
        () => runtime.destroy(),
      ];
      for (const operation of operations) {
        try { operation(); } catch (error) { errors.push(error as Error); }
      }
    };
    expect(() => runtime.startWithReadFrame()).toThrow(/不可重入|发生重入/);
    expect(errors).toHaveLength(7);
    for (const error of errors) expect(error.message).toMatch(/不可重入/);
    expect(runtime.state).toBe('failed');
    runtime.destroy();
  });

  it('snapshots QuickMatchService.create and rejects recursive factory creation', () => {
    const factoryRef: { value?: QuickMatchProductFactory } = {};
    const recursiveErrors: Error[] = [];
    const sessions: ReturnType<typeof sessionHarness>[] = [];
    const service = {
      create() {
        const session = sessionHarness();
        sessions.push(session);
        if (sessions.length === 1) {
          try { factoryRef.value?.create(); } catch (error) { recursiveErrors.push(error as Error); }
        }
        return localMatch(session);
      },
    };
    const factory = new QuickMatchProductFactory({ quickMatchService: service });
    factoryRef.value = factory;
    service.create = () => { throw new Error('replacement must not execute'); };
    expect(() => factory.create()).toThrow(/不可重入|发生重入/);
    expect(sessions[0]?.destroys).toBe(1);
    const runtime = factory.create();
    expect(recursiveErrors[0]?.message).toMatch(/不可重入/);
    runtime.destroy();
    expect(sessions[1]?.destroys).toBe(1);
  });

  it('transfers QuickMatchService ownership through factory and coordinator destroy', () => {
    let serviceDestroys = 0;
    const service = {
      create() { return localMatch(); },
      destroy() { serviceDestroys += 1; },
    };
    const factory = new QuickMatchProductFactory({ quickMatchService: service });
    const coordinator = new ProductMatchCoordinator({ matchFactory: factory });

    coordinator.destroy();
    coordinator.destroy();
    expect(serviceDestroys).toBe(1);
    expect(() => factory.create()).toThrow(/已销毁/);
  });

  it('retains exact QuickMatchService cleanup ownership after a failed coordinator destroy', () => {
    let serviceDestroys = 0;
    const service = {
      create() { return localMatch(); },
      destroy() {
        serviceDestroys += 1;
        if (serviceDestroys === 1) throw new Error('service cleanup failed');
      },
    };
    const factory = new QuickMatchProductFactory({ quickMatchService: service });
    const coordinator = new ProductMatchCoordinator({ matchFactory: factory });

    expect(() => coordinator.destroy()).toThrow(/service cleanup failed/);
    expect(coordinator.getSnapshot()).toMatchObject({
      state: PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED,
      cleanupIncomplete: true,
    });
    coordinator.destroy();
    coordinator.destroy();
    expect(serviceDestroys).toBe(2);
  });

  it('retains QuickMatchService ownership when destroy reentry is swallowed', () => {
    let serviceDestroys = 0;
    let factory!: QuickMatchProductFactory;
    const service = {
      create() { return localMatch(); },
      destroy() {
        serviceDestroys += 1;
        if (serviceDestroys === 1) {
          try { factory.destroy(); } catch {
            // The outer owner must still observe the swallowed reentry.
          }
        }
      },
    };
    factory = new QuickMatchProductFactory({ quickMatchService: service });

    expect(() => factory.destroy()).toThrow(/重入/);
    expect(factory.hasPendingCleanup()).toBe(true);
    factory.destroy();
    factory.destroy();
    expect(serviceDestroys).toBe(2);
  });

  it('blocks Coordinator reentry from Runtime callbacks and keeps snapshotted methods', async () => {
    const runtime = runtimeHarness();
    const coordinator = new ProductMatchCoordinator({
      matchFactory: { create: () => runtime },
    });
    await coordinator.prepare();
    const errors: Error[] = [];
    runtime.onStart = () => {
      const operations = [
        () => coordinator.prepare(),
        () => coordinator.startWithReadFrame(),
        () => coordinator.setPaused(true),
        () => coordinator.stepWithReadFrame(),
        () => coordinator.getMatchReadFrame(),
        () => coordinator.getResult(),
        () => coordinator.release(),
        () => coordinator.resetFailure(),
        () => coordinator.destroy(),
        () => coordinator.getSnapshot(),
      ];
      for (const operation of operations) {
        try { operation(); } catch (error) { errors.push(error as Error); }
      }
    };
    expect(() => coordinator.startWithReadFrame()).toThrow(/不可重入|发生重入/);
    expect(coordinator.state).toBe(PRODUCT_MATCH_COORDINATOR_STATE.FAILED);
    expect(errors).toHaveLength(10);
    for (const error of errors) expect(error.message).toMatch(/不可重入/);
    runtime.destroy = () => { throw new Error('replacement must not execute'); };
    coordinator.destroy();
    expect(runtime.destroys).toBe(1);
  });

  it('retains an invalid late candidate cleanup for exact reset retry', async () => {
    let destroys = 0;
    const candidate = {
      destroy() {
        destroys += 1;
        if (destroys === 1) throw new Error('first cleanup failed');
      },
    };
    const coordinator = new ProductMatchCoordinator({
      matchFactory: { create: () => candidate },
    });
    await expect(coordinator.prepare()).rejects.toThrow(/清理未完整/);
    expect(coordinator.state).toBe(PRODUCT_MATCH_COORDINATOR_STATE.FAILED);
    expect(coordinator.getSnapshot()).toMatchObject({
      hasRuntime: true,
      cleanupIncomplete: true,
    });
    expect(coordinator.resetFailure().state).toBe(PRODUCT_MATCH_COORDINATOR_STATE.IDLE);
    expect(destroys).toBe(2);
    coordinator.destroy();
  });

  it('rejects asynchronous implementations on every synchronous ownership port', async () => {
    const session = sessionHarness();
    session.start = (() => Promise.reject(new Error('late session failure'))) as unknown as () => void;
    const runtime = new ProductMatchRuntime(localMatch(session));
    expect(() => runtime.startWithReadFrame()).toThrow(/必须同步完成/);
    expect(runtime.state).toBe('failed');
    runtime.destroy();

    const factory = new QuickMatchProductFactory({
      quickMatchService: {
        create: () => Promise.reject(new Error('late quick match failure')),
      },
    });
    expect(() => factory.create()).toThrow(/必须同步完成/);

    const asyncRuntime = runtimeHarness();
    asyncRuntime.startWithReadFrame = (() => Promise.reject(new Error('late runtime failure'))) as unknown as () => Readonly<{ readonly readFrame: Readonly<Record<string, unknown>> }>;
    const coordinator = new ProductMatchCoordinator({
      matchFactory: { create: () => asyncRuntime },
    });
    await coordinator.prepare();
    expect(() => coordinator.startWithReadFrame()).toThrow(/必须同步完成/);
    expect(coordinator.state).toBe(PRODUCT_MATCH_COORDINATOR_STATE.FAILED);
    coordinator.destroy();
    await Promise.resolve();
  });

  it('classifies Coordinator factory returns before Promise assimilation', async () => {
    const hostileCalls = { calls: 0 };
    const hostileCoordinator = new ProductMatchCoordinator({
      matchFactory: { create: () => hostileThenable(hostileCalls) },
    });
    const hostileUnhandled = await unhandledDuring(async () => {
      await expect(hostileCoordinator.prepare()).rejects.toThrow(/同步完成/);
    });
    expect(hostileCalls.calls).toBe(0);
    expect(hostileUnhandled).toHaveLength(0);
    expect(hostileCoordinator.getSnapshot()).toMatchObject({
      state: PRODUCT_MATCH_COORDINATOR_STATE.FAILED,
      hasRuntime: false,
      cleanupIncomplete: false,
    });
    hostileCoordinator.destroy();

    const rejectedFactoryMakers = [
      () => ({ value: nativeShadowedRejection('native factory rejection', true).value, getCalls: () => 0 }),
      () => {
        const shadowedForeign = runInNewContext('Promise.reject(new Error("foreign factory rejection"))') as object;
        let foreignGetterCalls = 0;
        Object.defineProperty(shadowedForeign, 'then', {
          configurable: true,
          get() {
            foreignGetterCalls += 1;
            throw new Error('foreign factory then getter must not execute');
          },
        });
        return { value: shadowedForeign, getCalls: () => foreignGetterCalls };
      },
    ];
    for (const makeRejectedFactory of rejectedFactoryMakers) {
      let rejectedFactory!: ReturnType<typeof makeRejectedFactory>;
      let coordinator!: ProductMatchCoordinator;
      const unhandled = await unhandledDuring(async () => {
        rejectedFactory = makeRejectedFactory();
        coordinator = new ProductMatchCoordinator({
          matchFactory: { create: () => rejectedFactory.value },
        });
        await expect(coordinator.prepare()).rejects.toThrow(/native factory rejection|foreign factory rejection/);
      });
      expect(rejectedFactory.getCalls()).toBe(0);
      expect(unhandled).toHaveLength(0);
      expect(coordinator.getSnapshot()).toMatchObject({
        state: PRODUCT_MATCH_COORDINATOR_STATE.FAILED,
        hasRuntime: false,
        cleanupIncomplete: false,
      });
      coordinator.destroy();
    }

    const nativeRuntime = runtimeHarness();
    const nativeCoordinator = new ProductMatchCoordinator({
      matchFactory: { create: () => Promise.resolve(nativeRuntime) },
    });
    await expect(nativeCoordinator.prepare()).resolves.toMatchObject({
      state: PRODUCT_MATCH_COORDINATOR_STATE.READY,
      hasRuntime: true,
    });
    nativeCoordinator.destroy();

    const foreignRuntime = runtimeHarness();
    const foreignPromise = runInNewContext('Promise.resolve(value)', { value: foreignRuntime });
    const foreignCoordinator = new ProductMatchCoordinator({
      matchFactory: { create: () => foreignPromise },
    });
    await expect(foreignCoordinator.prepare()).resolves.toMatchObject({
      state: PRODUCT_MATCH_COORDINATOR_STATE.READY,
      hasRuntime: true,
    });
    foreignCoordinator.destroy();

    const ordinaryCoordinator = new ProductMatchCoordinator({
      matchFactory: { create: () => ({ then: null }) },
    });
    const ordinaryUnhandled = await unhandledDuring(async () => {
      await expect(ordinaryCoordinator.prepare()).rejects.toThrow(/ProductMatchRuntime\.setPaused 不存在/);
    });
    expect(ordinaryUnhandled).toHaveLength(0);
    expect(ordinaryCoordinator.getSnapshot()).toMatchObject({
      state: PRODUCT_MATCH_COORDINATOR_STATE.FAILED,
      hasRuntime: false,
      cleanupIncomplete: false,
    });
    ordinaryCoordinator.destroy();
  });

  it('brand-probes ProductMatch runtime and port returns without executing thenables', async () => {
    const hostileCalls = { calls: 0 };
    const cases = [
      () => ({ value: hostileThenable(hostileCalls), getCalls: () => 0 }),
      () => nativeShadowedRejection('native shadow rejection', true),
      () => {
        const foreign = runInNewContext('Promise.reject(new Error("foreign shadow rejection"))') as object;
        Object.defineProperty(foreign, 'then', { configurable: true, value: null });
        return { value: foreign, getCalls: () => 0 };
      },
    ];

    for (const makeCase of cases) {
      const testCase = makeCase();
      let readValue: unknown = frame(0);
      const session = {
        get state() { return 'running'; },
        start() {},
        setPaused() {},
        getPresentationReadFrame() { return readValue; },
        stepWithPresentationReadFrame() {
          return Object.freeze({
            events: Object.freeze([]),
            readFrame: frame(1),
            input: normalizeInputFrame(createNeutralInputFrame(0, 'player-1')),
          });
        },
        exportReplay() { return Object.freeze({}); },
        destroy() {},
      };
      const runtime = new ProductMatchRuntime(localMatch(session));
      runtime.startWithReadFrame();
      readValue = testCase.value;
      const candidate = {
        setPaused() {},
        getPublicInfo() { return Object.freeze({ matchSeed: 7, opponent: OPPONENT, content: CONTENT }); },
        getResult() { return null; },
        startWithReadFrame() { return Object.freeze({ readFrame: frame(0) }); },
        getReadFrame() { return testCase.value; },
        stepWithReadFrame() { return Object.freeze({ events: Object.freeze([]), readFrame: frame(1), input: null, result: null }); },
        destroy() {},
      };

      const unhandled = await unhandledDuring(() => {
        expect(() => runtime.getReadFrame()).toThrow(/同步完成|访问器/);
        expect(() => createProductMatchRuntimePort(candidate).getReadFrame())
          .toThrow(/同步完成|访问器/);
      });
      expect(unhandled).toHaveLength(0);
      expect(testCase.getCalls()).toBe(0);
      runtime.destroy();
    }
    expect(hostileCalls.calls).toBe(0);

    const ordinaryCandidate = {
      setPaused() {},
      getPublicInfo() { return Object.freeze({ matchSeed: 7, opponent: OPPONENT, content: CONTENT }); },
      getResult() { return null; },
      startWithReadFrame() { return Object.freeze({ readFrame: frame(0) }); },
      getReadFrame() { return { then: null }; },
      stepWithReadFrame() { return Object.freeze({ events: Object.freeze([]), readFrame: frame(1), input: null, result: null }); },
      destroy() {},
    };
    let ordinaryError: unknown;
    try {
      createProductMatchRuntimePort(ordinaryCandidate).getReadFrame();
    } catch (error) {
      ordinaryError = error;
    }
    expect(ordinaryError).toBeInstanceOf(Error);
    expect((ordinaryError as Error).message).toMatch(/then 字段.*必须同步完成/);
  });

  it('rejects Promise subclasses and constructor accessors without external execution', () => {
    let speciesCalls = 0;
    class DerivedPromise<T> extends Promise<T> {
      static override get [Symbol.species](): PromiseConstructor {
        speciesCalls += 1;
        return Promise;
      }
    }
    const subclassCandidate = {
      ...runtimeHarness(),
      getReadFrame() {
        return new DerivedPromise((resolve) => resolve(frame(0)));
      },
    };
    expect(() => createProductMatchRuntimePort(subclassCandidate).getReadFrame())
      .toThrow(/同步完成/);
    expect(speciesCalls).toBe(0);

    let constructorCalls = 0;
    const accessorValue = Object.create(null);
    Object.defineProperty(accessorValue, 'constructor', {
      get() {
        constructorCalls += 1;
        throw new Error('must-not-run');
      },
    });
    const accessorCandidate = {
      ...runtimeHarness(),
      getReadFrame() { return accessorValue; },
    };
    expect(() => createProductMatchRuntimePort(accessorCandidate).getReadFrame())
      .toThrow(/访问器 constructor/);
    expect(constructorCalls).toBe(0);
  });

  it('distinguishes cyclic and over-deep synchronous return prototype chains', () => {
    let cyclic: object;
    cyclic = new Proxy(Object.create(null), {
      getPrototypeOf() { return cyclic; },
    });
    const cyclicCandidate = {
      ...runtimeHarness(),
      getReadFrame() { return cyclic; },
    };
    expect(() => createProductMatchRuntimePort(cyclicCandidate).getReadFrame())
      .toThrow(/循环/);

    const deepCandidate = {
      ...runtimeHarness(),
      getReadFrame() { return prototypeChain(33); },
    };
    expect(() => createProductMatchRuntimePort(deepCandidate).getReadFrame())
      .toThrow(/超过32层/);
  });

  it('fails closed under native Promise then/species descriptor drift', () => {
    const thenDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
    const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    if (thenDescriptor === undefined || speciesDescriptor === undefined) {
      throw new Error('native Promise descriptors unavailable');
    }
    const candidate = runtimeHarness();

    try {
      Object.defineProperty(Promise.prototype, 'then', {
        ...thenDescriptor,
        value: function driftedThen() { return undefined; },
      });
      expect(() => createProductMatchRuntimePort(candidate)).toThrow(/描述符漂移/);
    } finally {
      Object.defineProperty(Promise.prototype, 'then', thenDescriptor);
    }

    try {
      Object.defineProperty(Promise, Symbol.species, {
        ...speciesDescriptor,
        get() { return class DriftedPromise extends Promise<unknown> {}; },
      });
      const promiseCandidate = {
        ...runtimeHarness(),
        getReadFrame() { return Promise.resolve(frame(0)); },
      };
      expect(() => createProductMatchRuntimePort(promiseCandidate).getReadFrame())
        .toThrow(/species.*漂移/);
    } finally {
      Object.defineProperty(Promise, Symbol.species, speciesDescriptor);
    }
  });

  it('retains ProductMatch candidate cleanup across rejected async destroy returns', async () => {
    let destroys = 0;
    let creates = 0;
    const invalidSession = {
      destroy() {
        destroys += 1;
        if (destroys === 1) return nativeShadowedRejection('async local cleanup', true).value;
        return undefined;
      },
    };
    const service = {
      create() {
        creates += 1;
        return creates === 1 ? localMatch(invalidSession) : localMatch();
      },
    };
    const factory = new QuickMatchProductFactory({ quickMatchService: service });
    const unhandled = await unhandledDuring(() => {
      expect(() => factory.create()).toThrow(/清理未完整/);
      expect(creates).toBe(1);
      const runtime = factory.create();
      expect(creates).toBe(2);
      runtime.destroy();
    });
    expect(unhandled).toHaveLength(0);
    expect(destroys).toBe(2);
  });

  it('retains Coordinator raw candidate ownership when cleanup returns a rejected Promise', async () => {
    let destroys = 0;
    const candidate = {
      destroy() {
        destroys += 1;
        return destroys === 1 ? Promise.reject(new Error('async cleanup rejection')) : undefined;
      },
    };
    const coordinator = new ProductMatchCoordinator({
      matchFactory: { create: () => candidate },
    });
    const unhandled = await unhandledDuring(async () => {
      await expect(coordinator.prepare()).rejects.toThrow(/清理未完整/);
      expect(coordinator.getSnapshot()).toMatchObject({
        hasRuntime: true,
        cleanupIncomplete: true,
      });
      coordinator.destroy();
      expect(destroys).toBe(2);
      expect(coordinator.getSnapshot()).toMatchObject({
        state: PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED,
        hasRuntime: false,
        cleanupIncomplete: false,
      });
    });
    expect(unhandled).toHaveLength(0);
  });

  it('surfaces factory pending cleanup in Coordinator state and retries before reset', async () => {
    let creates = 0;
    let destroys = 0;
    let getterCalls = 0;
    const invalidSession = {
      destroy() {
        destroys += 1;
        if (destroys === 1) {
          const rejected = Promise.reject(new Error('factory cleanup rejection'));
          Object.defineProperty(rejected, 'then', {
            configurable: true,
            get() { getterCalls += 1; throw new Error('factory then getter must not execute'); },
          });
          return rejected;
        }
        return destroys <= 2 ? Promise.reject(new Error('factory cleanup rejection')) : undefined;
      },
    };
    const factory = new QuickMatchProductFactory({
      quickMatchService: {
        create() {
          creates += 1;
          return creates === 1 ? localMatch(invalidSession) : localMatch();
        },
      },
    });
    const coordinator = new ProductMatchCoordinator({ matchFactory: factory });
    const unhandled = await unhandledDuring(async () => {
      await expect(coordinator.prepare()).rejects.toThrow(/清理未完整/);
      expect(coordinator.getSnapshot()).toMatchObject({
        state: PRODUCT_MATCH_COORDINATOR_STATE.FAILED,
        hasRuntime: true,
        cleanupIncomplete: true,
      });
      expect(() => coordinator.resetFailure()).toThrow(/失败|清理/);
      expect(coordinator.getSnapshot()).toMatchObject({
        state: PRODUCT_MATCH_COORDINATOR_STATE.FAILED,
        hasRuntime: true,
        cleanupIncomplete: true,
      });
      expect(coordinator.resetFailure().state).toBe(PRODUCT_MATCH_COORDINATOR_STATE.IDLE);
      expect(creates).toBe(1);
      expect(destroys).toBe(3);
      coordinator.destroy();
    });
    expect(unhandled).toHaveLength(0);
    expect(getterCalls).toBe(0);
  });

  it('rejects terminal state async returns before exportReplay is reached', async () => {
    const stateValues = [
      () => nativeShadowedRejection('shadow state rejection', true).value,
      () => runInNewContext('Promise.reject(new Error("foreign state rejection"))'),
      () => ({ then() { throw new Error('state then must not execute'); } }),
    ];
    for (const makeStateValue of stateValues) {
      const stateValue = makeStateValue();
      let ended = false;
      let exportCalls = 0;
      const session = {
        get state() { return ended ? stateValue : 'created'; },
        start() { ended = false; },
        setPaused() {},
        getPresentationReadFrame() { return frame(0); },
        stepWithPresentationReadFrame() {
          ended = true;
          return Object.freeze({
            events: Object.freeze([]),
            readFrame: frame(1),
            input: normalizeInputFrame(createNeutralInputFrame(0, 'player-1')),
          });
        },
        exportReplay() { exportCalls += 1; return Object.freeze({}); },
        destroy() {},
      };
      const runtime = new ProductMatchRuntime(localMatch(session));
      runtime.startWithReadFrame();
      const unhandled = await unhandledDuring(() => {
        expect(() => runtime.stepWithReadFrame(createNeutralInputFrame(0, 'player-1')))
          .toThrow(/同步完成|访问器/);
      });
      expect(unhandled).toHaveLength(0);
      expect(exportCalls).toBe(0);
      expect(runtime.state).toBe('failed');
      runtime.destroy();
    }
  });

  it('rejects terminal exportReplay async returns after the ended state is accepted', async () => {
    const hostileCalls = { calls: 0 };
    const replayValues = [
      () => nativeShadowedRejection('shadow replay rejection', true).value,
      () => runInNewContext('Promise.reject(new Error("foreign replay rejection"))'),
      () => hostileThenable(hostileCalls),
    ];
    for (const makeReplayValue of replayValues) {
      const replayValue = makeReplayValue();
      let ended = false;
      const session = {
        get state() { return ended ? 'ended' : 'created'; },
        start() { ended = false; },
        setPaused() {},
        getPresentationReadFrame() { return frame(0); },
        stepWithPresentationReadFrame() {
          ended = true;
          return Object.freeze({
            events: Object.freeze([]),
            readFrame: frame(1),
            input: normalizeInputFrame(createNeutralInputFrame(0, 'player-1')),
          });
        },
        exportReplay() { return replayValue; },
        destroy() {},
      };
      const runtime = new ProductMatchRuntime(localMatch(session));
      runtime.startWithReadFrame();
      const unhandled = await unhandledDuring(() => {
        expect(() => runtime.stepWithReadFrame(createNeutralInputFrame(0, 'player-1')))
          .toThrow(/同步完成|访问器|completion replay|普通对象/);
      });
      expect(unhandled).toHaveLength(0);
      expect(runtime.state).toBe('failed');
      runtime.destroy();
    }
    expect(hostileCalls.calls).toBe(0);

  });
});
