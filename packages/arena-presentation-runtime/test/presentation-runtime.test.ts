import { describe, expect, it } from 'vitest';
import {
  ARENA_CONTROL_ID,
  ARENA_INPUT_MAPPER_ID,
  ArenaImpactAudio,
  ARENA_V1_PRESENTATION_QUALITY_REGISTRY,
  ARENA_V1_PRESENTATION_QUALITY_ID,
  controlAtPoint,
  copyMapperActionAffordance,
  createExplicitCombatJumpMapper,
  createInputMapper,
  createMappedSemanticInput,
  createArenaControlLayout,
  createPresentationMemorySnapshot,
  FixedTickAccumulator,
  InputSampler,
  PresentationAssetLoadTask,
  PresentationEventWindow,
  type PresentationFrame,
  PresentationFrameLoop,
  PresentationRenderPacer,
  PresentationPerformanceProbe,
  PointerInputAdapter,
  RawControlState,
  SixSectorDirectionResolver,
  normalizedControlDelta,
  mergePresentationMemorySnapshot,
} from '../src/index.js';
import {
  CHARACTER_PRESENTATION_DIRECTION_STRATEGY,
  CHARACTER_PRESENTATION_FRONT_AXIS,
  PresentationAssetRegistry,
  PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
  PRESENTATION_ASSET_KIND,
} from '@number-strategy-jump/arena-presentation-contracts';

describe('Arena Presentation runtime boundaries', () => {
  it('keeps performance probe options and frame inputs data-only without executing accessors', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'maximumFrameSamples', {
      enumerable: true,
      get() { getterCalls += 1; return 1; },
    });
    expect(() => new PresentationPerformanceProbe(options)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);

    const probe = new PresentationPerformanceProbe({ maximumFrameSamples: 1 });
    probe.start(100);
    const frame = Object.defineProperty({
      timestampMs: 101,
      deltaSeconds: 0,
      coreSteps: 0,
      droppedSeconds: 0,
      rendered: false,
      renderDurationMs: null,
    }, 'resources', {
      enumerable: true,
      get() { getterCalls += 1; return null; },
    });
    expect(() => probe.recordFrame(frame)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
    expect(probe.getSnapshot()).toMatchObject({ observedFrameCount: 0, recordedFrameCount: 0 });
    probe.destroy();
  });

  it('validates a whole performance frame before advancing its observational clock', () => {
    const probe = new PresentationPerformanceProbe({
      maximumFrameSamples: 1,
      maximumResourceSamples: 1,
      resourceSampleIntervalFrames: 1,
    });
    probe.start(10);
    expect(() => probe.recordFrame({
      timestampMs: 20,
      deltaSeconds: 0,
      coreSteps: 0,
      droppedSeconds: 0,
      rendered: false,
      renderDurationMs: 1,
      resources: null,
    })).toThrow(/未渲染帧/);
    probe.recordFrame({
      timestampMs: 15,
      deltaSeconds: 0,
      coreSteps: 0,
      droppedSeconds: 0,
      rendered: false,
      renderDurationMs: null,
      resources: null,
    });
    expect(probe.getSnapshot()).toMatchObject({
      durationMs: 5,
      observedFrameCount: 1,
      recordedFrameCount: 1,
    });
    probe.destroy();
  });

  it('normalizes observational memory without inventing unavailable counters', () => {
    expect(createPresentationMemorySnapshot(null)).toBeNull();
    expect(createPresentationMemorySnapshot({
      jsHeapBytes: null,
      processMemoryBytes: null,
    })).toBeNull();
    const memory = createPresentationMemorySnapshot({
      jsHeapBytes: 1024,
      processMemoryBytes: null,
    });
    expect(memory).toEqual({ jsHeapBytes: 1024, processMemoryBytes: null });
    expect(Object.isFrozen(memory)).toBe(true);
    expect(mergePresentationMemorySnapshot({ drawCalls: 7 }, memory)).toEqual({
      drawCalls: 7,
      jsHeapBytes: 1024,
      processMemoryBytes: null,
    });
  });

  it('rejects memory accessors and unknown fields without executing them', () => {
    let getterCalls = 0;
    const accessor = Object.defineProperty({}, 'jsHeapBytes', {
      enumerable: true,
      get() { getterCalls += 1; return 1024; },
    });
    expect(() => createPresentationMemorySnapshot(accessor)).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);
    expect(() => createPresentationMemorySnapshot({ jsHeapBytes: 1, future: 2 }))
      .toThrow(/不支持字段/);
    expect(() => createPresentationMemorySnapshot({ processMemoryBytes: -1 }))
      .toThrow(/大于等于 0/);
    const memory = createPresentationMemorySnapshot({ jsHeapBytes: 1 });
    const resourceAccessor = Object.defineProperty({}, 'drawCalls', {
      enumerable: true,
      get() { getterCalls += 1; return 7; },
    });
    expect(() => mergePresentationMemorySnapshot(resourceAccessor, memory)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });

  it('snapshots optional audio callbacks and rejects option accessors without executing them', () => {
    let reads = 0;
    const accessorOptions = {};
    Object.defineProperty(accessorOptions, 'createAudio', {
      enumerable: true,
      get() { reads += 1; return () => null; },
    });
    expect(() => new ArenaImpactAudio(accessorOptions)).toThrow(/createAudio.*数据字段/);
    expect(reads).toBe(0);

    let originalPlays = 0;
    let replacementPlays = 0;
    const voice = {
      src: '', volume: 0, currentTime: 1,
      play() { originalPlays += 1; return Promise.resolve(); },
      pause() {},
      destroy() {},
    };
    const audio = new ArenaImpactAudio({
      createAudio: () => voice,
      sourceByAction: { test: './assets/test.ogg' },
      voicesPerAction: 1,
    });
    audio.load();
    voice.play = () => { replacementPlays += 1; return Promise.resolve(); };
    expect(audio.play('test')).toBe(true);
    expect([originalPlays, replacementPlays]).toEqual([1, 0]);
    audio.dispose();
  });

  it('retains an incompletely initialized audio voice for cleanup retry', () => {
    let destroyAttempts = 0;
    const voice = {
      src: '',
      set volume(_value: number) { throw new Error('volume rejected'); },
      pause() {},
      destroy() {
        destroyAttempts += 1;
        if (destroyAttempts === 1) throw new Error('transient rejected voice cleanup');
      },
    };
    const audio = new ArenaImpactAudio({
      createAudio: () => voice,
      sourceByAction: { test: './assets/test.ogg' },
      voicesPerAction: 1,
    });
    audio.load();
    expect(audio.getDebugSnapshot()).toMatchObject({ pendingCleanupCount: 1 });
    audio.dispose();
    expect(destroyAttempts).toBe(2);
  });

  it('retries only the incomplete audio cleanup step', () => {
    let pauses = 0;
    let sourceRemovals = 0;
    let destroys = 0;
    const audio = new ArenaImpactAudio({
      createAudio: () => ({
        src: '', volume: 0,
        pause() { pauses += 1; },
        removeAttribute() { sourceRemovals += 1; },
        destroy() {
          destroys += 1;
          if (destroys === 1) throw new Error('transient audio destroy');
        },
      }),
      sourceByAction: { test: './assets/test.ogg' },
      voicesPerAction: 1,
    });
    audio.load();
    expect(() => audio.dispose()).toThrow(/清理未完整完成/);
    expect([pauses, sourceRemovals, destroys]).toEqual([1, 1, 1]);
    audio.dispose();
    audio.dispose();
    expect([pauses, sourceRemovals, destroys]).toEqual([1, 1, 2]);
  });

  it('disables only optional audio when a host callback swallows reentry', () => {
    let attempted = false;
    const voice = {
      src: '', volume: 0,
      pause() {},
      play() {
        if (!attempted) {
          attempted = true;
          try { audio.play('test'); } catch { /* hostile host swallows reentry */ }
        }
        return Promise.resolve();
      },
      destroy() {},
    };
    const audio = new ArenaImpactAudio({
      createAudio: () => voice,
      sourceByAction: { test: './assets/test.ogg' },
      voicesPerAction: 1,
    });
    audio.load();
    expect(audio.play('test')).toBe(false);
    expect(audio.getDebugSnapshot()).toMatchObject({ disabled: true });
    expect(audio.play('test')).toBe(false);
    audio.dispose();
  });

  it('keeps one strict immutable control layout for hit testing and HUD placement', () => {
    let reads = 0;
    const accessor = {};
    Object.defineProperty(accessor, 'moveZoneFraction', {
      enumerable: true,
      get() { reads += 1; return 0.5; },
    });
    expect(() => createArenaControlLayout(accessor)).toThrow(/moveZoneFraction.*访问器/);
    expect(reads).toBe(0);

    const layout = createArenaControlLayout({ moveZoneFraction: 0.6 });
    expect(Object.isFrozen(layout)).toBe(true);
    expect(controlAtPoint(
      { pointerId: 1, x: 336, y: 608 },
      { width: 400, height: 800 },
      layout,
    )).toBe(ARENA_CONTROL_ID.PRIMARY);
    expect(() => normalizedControlDelta(
      { pointerId: 1, x: 0, y: 0 },
      { pointerId: 2, x: 1, y: 1 },
      48,
    )).toThrow(/pointerId.*一致/);
  });

  it('rejects option and event accessors without executing them', () => {
    let optionReads = 0;
    expect(() => new PresentationFrameLoop({
      get requestFrame() { optionReads += 1; return () => 1; },
      cancelFrame: () => {},
      now: () => 0,
      onError: () => {},
    })).toThrow(/requestFrame.*数据字段/);
    expect(optionReads).toBe(0);

    const window = new PresentationEventWindow();
    let eventReads = 0;
    expect(() => window.consume([{
      id: 'event:1',
      type: 'HitResolved',
      tick: 1,
      get sequence() { eventReads += 1; return 1; },
    }])).toThrow(/sequence.*数据字段|访问器/);
    expect(eventReads).toBe(0);
    expect(window.getDebugSnapshot().acceptedCount).toBe(0);
  });

  it('owns a null host frame token and suppresses its late callback after stop', () => {
    let pending: ((timestamp: unknown) => void) | null = null;
    const cancelled: unknown[] = [];
    const frames: unknown[] = [];
    const loop = new PresentationFrameLoop({
      requestFrame: (callback: (timestamp: unknown) => void) => { pending = callback; return null; },
      cancelFrame: (token: unknown) => { cancelled.push(token); },
      now: () => 0,
      onError: () => {},
    });
    loop.start((frame: PresentationFrame) => { frames.push(frame); });
    expect(loop.getDebugSnapshot().hasPendingFrame).toBe(true);
    const late = pending as unknown as ((timestamp: unknown) => void);
    expect(loop.stop()).toBe(true);
    expect(cancelled).toEqual([null]);
    late(16);
    expect(frames).toEqual([]);
    loop.destroy();
  });

  it('contains async callbacks and keeps accumulator overflow failures atomic', async () => {
    let pending: ((timestamp: unknown) => void) | null = null;
    const errors: unknown[] = [];
    const loop = new PresentationFrameLoop({
      requestFrame: (callback: (timestamp: unknown) => void) => { pending = callback; return 1; },
      cancelFrame: () => {},
      now: () => 0,
      onError: (error: unknown) => { errors.push(error); },
    });
    loop.start(async () => { throw new Error('late async failure'); });
    const deliver = pending as unknown as ((timestamp: unknown) => void);
    deliver(16);
    await Promise.resolve();
    expect(loop.getDebugSnapshot().state).toBe('failed');
    expect(errors).toHaveLength(1);

    const accumulator = new FixedTickAccumulator({
      fixedDeltaSeconds: Number.MIN_VALUE,
      maximumSteps: 4,
    });
    const before = accumulator.getDebugSnapshot();
    expect(() => accumulator.push(1)).toThrow(/步数必须保持有限/);
    expect(accumulator.getDebugSnapshot()).toEqual(before);
  });

  it('keeps the production high quality path and exact 30 FPS pacing values', () => {
    const high = ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(
      ARENA_V1_PRESENTATION_QUALITY_ID.HIGH,
    );
    expect(high.maximumPixelRatio).toBe(2);
    expect(high.antialiasEnabled).toBe(true);
    const pacer = new PresentationRenderPacer({
      qualityDefinition: ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(
        ARENA_V1_PRESENTATION_QUALITY_ID.LOW,
      ),
    });
    expect([pacer.shouldRender(1 / 60), pacer.shouldRender(1 / 60)]).toEqual([false, true]);
  });

  it('keeps direction state atomic when reset input validation fails', () => {
    const resolver = new SixSectorDirectionResolver({
      strategy: CHARACTER_PRESENTATION_DIRECTION_STRATEGY.SIX_SECTOR_CAMERA_RELATIVE,
      defaultFrontAxis: CHARACTER_PRESENTATION_FRONT_AXIS.POSITIVE_Z,
      hysteresisDegrees: 6,
    });
    const cameraBasis = { screenRight: { x: 1, z: 0 }, screenUp: { x: 0, z: 1 } };
    expect(resolver.resolve({ facing: { x: 0.6, z: 0.8 }, cameraBasis }).id).toBe('front-right');
    const before = resolver.getDebugSnapshot();
    expect(() => resolver.resolve({
      facing: { x: 0, z: 1 },
      cameraBasis: { ...cameraBasis, get extra() { throw new Error('must not execute'); } },
      reset: true,
    })).toThrow(/extra.*数据字段|不支持字段 extra/);
    expect(resolver.getDebugSnapshot()).toEqual(before);
  });

  it('snapshots the asset loader method and retains synchronous cleanup ownership', async () => {
    const assetId = 'arena.asset.test.v1';
    const registry = new PresentationAssetRegistry([{
      schemaVersion: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
      id: assetId,
      kind: PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
      providerId: 'arena.provider.test.v1',
      sourceKey: 'test.glb',
      contentVersion: 1,
      tags: ['test'],
    }]);
    let originalLoads = 0;
    let replacementLoads = 0;
    let releases = 0;
    const loader = {
      load() {
        originalLoads += 1;
        return { assetId, value: Object.freeze({ scene: true }), release() { releases += 1; } };
      },
    };
    const task = new PresentationAssetLoadTask({ assetRegistry: registry, assetId, loader });
    loader.load = () => {
      replacementLoads += 1;
      throw new Error('replacement must not run');
    };
    await expect(task.load()).resolves.toEqual({ scene: true });
    expect([originalLoads, replacementLoads]).toEqual([1, 0]);
    task.destroy();
    expect(releases).toBe(1);

    let optionReads = 0;
    expect(() => new PresentationAssetLoadTask({
      assetRegistry: registry,
      assetId,
      get loader() { optionReads += 1; return loader; },
    })).toThrow(/loader.*数据字段/);
    expect(optionReads).toBe(0);
  });

  it('keeps explicit attack independent from enemy distance and jump input', () => {
    const mapper = createExplicitCombatJumpMapper();
    const idleGesture = Object.freeze({
      contactHeld: false,
      contactHoldStarted: false,
      tapReleased: false,
      direction: null,
      directionPressed: null,
      directionHeld: null,
      directionReleased: null,
      wasDirectionHeld: false,
    });
    const idleControl = Object.freeze({
      active: false,
      vector: Object.freeze({ x: 0, z: 0 }),
      edges: Object.freeze({ started: false, ended: false, cancelled: false }),
    });
    const attackControl = Object.freeze({
      ...idleControl,
      active: true,
      edges: Object.freeze({ started: true, ended: false, cancelled: false }),
    });
    expect(mapper.map({
      raw: Object.freeze({ move: idleControl, primary: attackControl, jump: idleControl }),
      gestures: Object.freeze({
        move: idleGesture,
        primary: idleGesture,
        jump: idleGesture,
      }),
    })).toMatchObject({
      primaryPressed: true,
      primaryHeld: true,
      jumpPressed: false,
      jumpHeld: false,
    });
  });

  it('rejects mapper and affordance accessors without executing them', () => {
    let reads = 0;
    const mapper = createInputMapper(ARENA_INPUT_MAPPER_ID.GESTURE_MOBILITY, () => ({
      moveX: 0,
      moveZ: 0,
      primaryPressed: false,
      primaryHeld: false,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: false,
    }));
    const context = Object.defineProperty({ gestures: {} }, 'raw', {
      enumerable: true,
      get() { reads += 1; return {}; },
    });
    expect(() => mapper.map(context as never)).toThrow(/raw.*访问器/);
    expect(reads).toBe(0);
    expect(() => mapper.map({ raw: {}, gestures: {}, future: true } as never))
      .toThrow(/不支持字段 future/);

    const options = Object.defineProperty({ participantId: 'player-1' }, 'tick', {
      enumerable: true,
      get() { reads += 1; return 0; },
    });
    expect(() => copyMapperActionAffordance(null, options as never)).toThrow(/tick.*访问器/);
    expect(reads).toBe(0);
  });

  it('keeps mapped semantic values exact, immutable and unit bounded', () => {
    const mapped = createMappedSemanticInput({
      moveX: 0.6,
      moveZ: 0.8,
      primaryPressed: true,
      primaryHeld: false,
      jumpPressed: false,
      jumpHeld: true,
      slamPressed: false,
    });
    expect(Object.isFrozen(mapped)).toBe(true);
    expect(mapped).toMatchObject({ moveX: 0.6, moveZ: 0.8, primaryPressed: true });
    expect(() => createMappedSemanticInput({ ...mapped, moveX: 1, moveZ: 1 }))
      .toThrow(/单位长度/);
    expect(() => createMappedSemanticInput({ ...mapped, extra: true } as never))
      .toThrow(/不支持字段 extra/);
  });

  it('validates RawControlState options before taking pointer ownership', () => {
    let reads = 0;
    const accessorOptions = Object.defineProperty({}, 'viewport', {
      enumerable: true,
      get() { reads += 1; return { width: 400, height: 800 }; },
    });
    expect(() => new RawControlState(accessorOptions)).toThrow(/viewport.*访问器/);
    expect(reads).toBe(0);
    expect(() => new RawControlState({
      viewport: { width: 400, height: 800 },
      future: true,
    })).toThrow(/不支持字段 future/);

    const state = new RawControlState({ viewport: { width: 400, height: 800 } });
    expect(state.resize({ width: 400, height: 800 })).toBe(false);
    expect(state.pointerStart({ pointerId: 1, x: 80, y: 600 })).toBe(true);
    expect(state.getDebugSnapshot().move.active).toBe(true);
    state.destroy();
  });

  it('fails InputSampler closed when a mapper swallows lifecycle reentry', () => {
    const holder: { sampler?: InputSampler } = {};
    const sampler = new InputSampler({
      participantId: 'player-1',
      viewport: { width: 400, height: 800 },
      mapper: Object.freeze({
        id: 'test-reentry-mapper',
        map() {
          try {
            holder.sampler!.pointerStart({ pointerId: 1, x: 80, y: 600 });
          } catch { /* hostile mapper swallows the reentry rejection */ }
          return {
            moveX: 0,
            moveZ: 0,
            primaryPressed: false,
            primaryHeld: false,
            jumpPressed: false,
            jumpHeld: false,
            slamPressed: false,
          };
        },
      }),
    });
    holder.sampler = sampler;
    expect(() => sampler.sample(0)).toThrow(/尝试重入/);
    expect(() => sampler.sample(0)).toThrow(/失败关闭/);
    sampler.destroy();
  });

  it('snapshots InputSampler mapper methods and rejects option accessors', () => {
    let reads = 0;
    const mapperAccessor = Object.defineProperty({ id: 'hostile' }, 'map', {
      enumerable: true,
      get() { reads += 1; return () => null; },
    });
    expect(() => new InputSampler({
      participantId: 'player-1',
      viewport: { width: 400, height: 800 },
      mapper: mapperAccessor,
    })).toThrow(/map.*访问器/);
    expect(reads).toBe(0);

    const optionsAccessor = Object.defineProperty({
      participantId: 'player-1',
      mapper: createExplicitCombatJumpMapper(),
    }, 'viewport', {
      enumerable: true,
      get() { reads += 1; return { width: 400, height: 800 }; },
    });
    expect(() => new InputSampler(optionsAccessor)).toThrow(/viewport.*访问器/);
    expect(reads).toBe(0);
  });

  it('snapshots PointerInputAdapter platform methods and rejects option accessors', () => {
    let originalBinds = 0;
    let replacementBinds = 0;
    const platform = {
      bindInput() { originalBinds += 1; return () => {}; },
      onResize() { return () => {}; },
      onHide() { return () => {}; },
      onShow() { return () => {}; },
    };
    const sampler = new InputSampler({
      participantId: 'player-1',
      viewport: { width: 400, height: 800 },
      mapper: createExplicitCombatJumpMapper(),
    });
    const adapter = new PointerInputAdapter({
      platform,
      sampler,
      viewportProvider: () => ({ width: 400, height: 800 }),
      manageLifecycle: false,
    });
    platform.bindInput = () => { replacementBinds += 1; return () => {}; };
    expect(adapter.start()).toBe(true);
    expect([originalBinds, replacementBinds]).toEqual([1, 0]);
    adapter.destroy();
    sampler.destroy();

    let reads = 0;
    const accessorOptions = Object.defineProperty({ platform, sampler }, 'viewportProvider', {
      enumerable: true,
      get() { reads += 1; return () => ({ width: 400, height: 800 }); },
    });
    expect(() => new PointerInputAdapter(accessorOptions)).toThrow(/viewportProvider.*访问器/);
    expect(reads).toBe(0);
  });

  it('rolls back when a platform swallows PointerInputAdapter start reentry', () => {
    let cleanupCalls = 0;
    const sampler = new InputSampler({
      participantId: 'player-1',
      viewport: { width: 400, height: 800 },
      mapper: createExplicitCombatJumpMapper(),
    });
    const holder: { adapter?: PointerInputAdapter } = {};
    const adapter = new PointerInputAdapter({
      platform: {
        bindInput() {
          try { holder.adapter!.start(); } catch { /* hostile host swallows reentry */ }
          return () => { cleanupCalls += 1; };
        },
        onResize() { return () => {}; },
        onHide() { return () => {}; },
        onShow() { return () => {}; },
      },
      sampler,
      viewportProvider: () => ({ width: 400, height: 800 }),
      manageLifecycle: false,
    });
    holder.adapter = adapter;
    expect(() => adapter.start()).toThrow(/重入/);
    expect(cleanupCalls).toBe(1);
    expect(adapter.getDebugSnapshot()).toMatchObject({ state: 'idle', cleanupCount: 0 });
    adapter.destroy();
    sampler.destroy();
  });

  it('rejects asynchronous PointerInputAdapter ports without executing foreign thenables', () => {
    let thenCalls = 0;
    const sampler = new InputSampler({
      participantId: 'player-1',
      viewport: { width: 400, height: 800 },
      mapper: createExplicitCombatJumpMapper(),
    });
    const adapter = new PointerInputAdapter({
      platform: {
        bindInput() {
          return { then() { thenCalls += 1; } };
        },
        onResize() { return () => {}; },
        onHide() { return () => {}; },
        onShow() { return () => {}; },
      },
      sampler,
      viewportProvider: () => ({ width: 400, height: 800 }),
      manageLifecycle: false,
    });
    expect(() => adapter.start()).toThrow(/必须同步完成/);
    expect(thenCalls).toBe(0);
    expect(adapter.getDebugSnapshot()).toMatchObject({ state: 'idle', cleanupCount: 0 });
    adapter.destroy();
    sampler.destroy();
  });
});
