import { describe, expect, it } from 'vitest';
import {
  MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
  createMatchContentSelection,
} from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_MATCH_COORDINATOR_STATE,
  ProductMatchCoordinator,
  ProductMatchRuntime,
  QuickMatchProductFactory,
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

interface SessionHarness {
  readonly state: string;
  starts: number;
  pauses: number;
  destroys: number;
  onStart: (() => void) | null;
  start(): void;
  setPaused(value: boolean): void;
  step(): Readonly<Record<string, unknown>>;
  getSnapshot(): Readonly<Record<string, unknown>>;
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
    step() {
      return Object.freeze({
        events: Object.freeze([]),
        snapshot: Object.freeze({ tick: 1 }),
        input: null,
      });
    },
    getSnapshot() { return Object.freeze({ tick: 0 }); },
    exportReplay() { throw new Error('unfinished session'); },
    destroy() {
      this.destroys += 1;
      state = 'destroyed';
    },
  };
}

function localMatch(session = sessionHarness()) {
  return {
    matchSeed: 7,
    opponent: OPPONENT,
    content: CONTENT,
    session,
  };
}

function runtimeHarness(options: { destroyFailures?: number } = {}) {
  let destroys = 0;
  let paused = false;
  let onStart: (() => void) | null = null;
  const runtime = {
    get destroys() { return destroys; },
    set onStart(value: (() => void) | null) { onStart = value; },
    start() { onStart?.(); },
    setPaused(value: boolean) { paused = value; },
    step() {
      return Object.freeze({
        events: Object.freeze([]),
        snapshot: Object.freeze({ tick: 1 }),
        result: null,
      });
    },
    getSnapshot() { return Object.freeze({ tick: 0, paused }); },
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
    runtime.start();
    expect(session.starts).toBe(1);
    runtime.destroy();
  });

  it('blocks every Runtime operation reentered from a Session callback', () => {
    const session = sessionHarness();
    const runtime = new ProductMatchRuntime(localMatch(session));
    const errors: Error[] = [];
    session.onStart = () => {
      const operations = [
        () => runtime.start(),
        () => runtime.setPaused(true),
        () => runtime.step(),
        () => runtime.getSnapshot(),
        () => runtime.getPublicInfo(),
        () => runtime.getResult(),
        () => runtime.destroy(),
      ];
      for (const operation of operations) {
        try { operation(); } catch (error) { errors.push(error as Error); }
      }
    };
    runtime.start();
    expect(errors).toHaveLength(7);
    for (const error of errors) expect(error.message).toMatch(/不可重入/);
    runtime.destroy();
  });

  it('snapshots QuickMatchService.create and rejects recursive factory creation', () => {
    const session = sessionHarness();
    const factoryRef: { value?: QuickMatchProductFactory } = {};
    const recursiveErrors: Error[] = [];
    const service = {
      create() {
        try { factoryRef.value?.create(); } catch (error) { recursiveErrors.push(error as Error); }
        return localMatch(session);
      },
    };
    const factory = new QuickMatchProductFactory({ quickMatchService: service });
    factoryRef.value = factory;
    service.create = () => { throw new Error('replacement must not execute'); };
    const runtime = factory.create();
    expect(recursiveErrors[0]?.message).toMatch(/不可重入/);
    runtime.destroy();
    expect(session.destroys).toBe(1);
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
        () => coordinator.start(),
        () => coordinator.setPaused(true),
        () => coordinator.step(),
        () => coordinator.getMatchSnapshot(),
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
    coordinator.start();
    expect(coordinator.state).toBe(PRODUCT_MATCH_COORDINATOR_STATE.RUNNING);
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
    expect(() => runtime.start()).toThrow(/必须同步完成/);
    expect(runtime.state).toBe('failed');
    runtime.destroy();

    const factory = new QuickMatchProductFactory({
      quickMatchService: {
        create: () => Promise.reject(new Error('late quick match failure')),
      },
    });
    expect(() => factory.create()).toThrow(/必须同步完成/);

    const asyncRuntime = runtimeHarness();
    asyncRuntime.start = (() => Promise.reject(new Error('late runtime failure'))) as unknown as () => void;
    const coordinator = new ProductMatchCoordinator({
      matchFactory: { create: () => asyncRuntime },
    });
    await coordinator.prepare();
    expect(() => coordinator.start()).toThrow(/必须同步完成/);
    expect(coordinator.state).toBe(PRODUCT_MATCH_COORDINATOR_STATE.FAILED);
    coordinator.destroy();
    await Promise.resolve();
  });
});
