import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { BOT_PROFILE_REGISTRY } from '@number-strategy-jump/arena-bot';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1,
  ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
  ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1,
  type ArenaSupplyPresentationCueV1,
  type ArenaSupplyPresentationMarkerV1,
  type ArenaSupplyPresentationViewV1,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import {
  ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND,
  ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE,
  ARENA_P1_SUPPLY_ACCEPTANCE_TERMINAL_ORIGIN_KIND,
  ArenaP1SupplyAcceptanceRuntime,
  createArenaP1SupplyAcceptanceHostCommitV1,
  type ArenaP1SupplyAcceptanceHostCommitV1,
  type ArenaP1SupplyAcceptanceInputSampleV1,
} from '../../../src/entry/arena-p1-supply-acceptance-runtime.js';

const SPAWN_SPECS = [
  {
    slotId: 'left',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'pp3a-left',
    position: { x: -3, y: 1, z: 0 },
  },
  {
    slotId: 'center',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'pp3a-center',
    position: { x: 0, y: 1, z: 0 },
  },
  {
    slotId: 'right',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'pp3a-right',
    position: { x: 3, y: 1, z: 0 },
  },
];

function formalCompositionOptions(seed = 7301): Record<string, unknown> {
  return {
    seed,
    config: { preparingTicks: 0, suddenDeathStartTick: 10, hardLimitTicks: 20 },
    supply: {
      supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
      spawnSpecs: SPAWN_SPECS.map((spec) => ({
        ...spec,
        position: { ...spec.position },
      })),
    },
    bot: {
      participantId: 'player-2',
      difficultyId: 'normal',
      behaviorSeed: 0x12003456,
      personalitySeed: 0x5600789a,
      profileRegistry: BOT_PROFILE_REGISTRY,
    },
    playerParticipantId: 'player-1',
    publicMatchInfo: {
      matchSeed: seed,
      opponent: {
        id: 'pp3a-formal-bot',
        displayName: 'PP3a Formal Bot',
        portraitKey: 'pp3a-portrait',
        appearanceKey: 'pp3a-appearance',
      },
    },
  };
}

type HostMethod = (...args: unknown[]) => unknown;
interface HostOverrides {
  readonly sampleInput?: HostMethod;
  readonly commit?: HostMethod;
  readonly startFrameLoop?: HostMethod;
  readonly cancelFrameLoop?: HostMethod;
  readonly destroyListeners?: HostMethod;
  readonly destroyParticles?: HostMethod;
  readonly destroyVoices?: HostMethod;
  readonly destroyGpu?: HostMethod;
  readonly destroyDom?: HostMethod;
  readonly destroyAsyncCallbacks?: HostMethod;
}

function hostHarness(overrides: HostOverrides = {}) {
  const commits: ArenaP1SupplyAcceptanceHostCommitV1[] = [];
  const samples: ArenaP1SupplyAcceptanceInputSampleV1[] = [];
  const cleanupCounts = {
    cancelFrameLoop: 0,
    destroyListeners: 0,
    destroyParticles: 0,
    destroyVoices: 0,
    destroyGpu: 0,
    destroyDom: 0,
    destroyAsyncCallbacks: 0,
  };
  const frameToken = Object.freeze({ id: 'pp3a-frame-loop-token' });
  let ownedFrameToken: unknown = frameToken;
  let frameCallback: (() => void) | null = null;
  const invoke = (override: HostMethod | undefined, fallback: HostMethod, args: unknown[]) => (
    (override ?? fallback)(...args)
  );
  const port = {
    sampleInput(value: unknown) {
      const sample = value as ArenaP1SupplyAcceptanceInputSampleV1;
      samples.push(sample);
      return invoke(overrides.sampleInput, () => (
        createNeutralInputFrame(sample.tick, sample.participantId)
      ), [value]);
    },
    commit(value: unknown) {
      return invoke(overrides.commit, () => {
        commits.push(value as ArenaP1SupplyAcceptanceHostCommitV1);
      }, [value]);
    },
    startFrameLoop(value: unknown) {
      frameCallback = value as () => void;
      ownedFrameToken = invoke(overrides.startFrameLoop, () => frameToken, [value]);
      return ownedFrameToken;
    },
    cancelFrameLoop(value: unknown) {
      cleanupCounts.cancelFrameLoop += 1;
      return invoke(overrides.cancelFrameLoop, () => {
        assert.strictEqual(value, ownedFrameToken);
        frameCallback = null;
      }, [value]);
    },
    destroyListeners() {
      cleanupCounts.destroyListeners += 1;
      return invoke(overrides.destroyListeners, () => undefined, []);
    },
    destroyParticles() {
      cleanupCounts.destroyParticles += 1;
      return invoke(overrides.destroyParticles, () => undefined, []);
    },
    destroyVoices() {
      cleanupCounts.destroyVoices += 1;
      return invoke(overrides.destroyVoices, () => undefined, []);
    },
    destroyGpu() {
      cleanupCounts.destroyGpu += 1;
      return invoke(overrides.destroyGpu, () => undefined, []);
    },
    destroyDom() {
      cleanupCounts.destroyDom += 1;
      return invoke(overrides.destroyDom, () => undefined, []);
    },
    destroyAsyncCallbacks() {
      cleanupCounts.destroyAsyncCallbacks += 1;
      return invoke(overrides.destroyAsyncCallbacks, () => undefined, []);
    },
  };
  return {
    port,
    commits,
    samples,
    cleanupCounts,
    runFrame: () => frameCallback?.(),
    hasFrame: () => frameCallback !== null,
  };
}

function runtimeWithHost(
  host: ReturnType<typeof hostHarness>,
  seed = 7301,
): ArenaP1SupplyAcceptanceRuntime {
  return new ArenaP1SupplyAcceptanceRuntime({
    compositionOptions: formalCompositionOptions(seed),
    hostResourcePort: host.port,
  });
}

test('PP3a exposes one formal acceptance owner with a closed lifecycle', () => {
  assert.equal(typeof ArenaP1SupplyAcceptanceRuntime, 'function');
  assert.deepEqual(ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE, {
    CREATED: 'created',
    ACTIVE: 'active',
    ENDED: 'ended',
    FAILED: 'failed',
    DESTROYED: 'destroyed',
  });
});

test('PP3a uses current pre-step sidecar and commits only the atomic post frame', () => {
  const host = hostHarness();
  const runtime = runtimeWithHost(host, 7302);
  const initialDebug = runtime.getDebugSnapshot();
  assert.equal(initialDebug.state, ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.CREATED);
  assert.equal(initialDebug.currentTick, null);

  const initialView = runtime.start();
  assert.equal(initialView.snapshotTick, 0);
  assert.strictEqual(runtime.getLastCommittedView(), initialView);
  assert.equal(host.commits.length, 1);
  assert.equal(host.hasFrame(), true);

  const nextView = runtime.step();
  assert.equal(host.samples.length, 1);
  assert.deepEqual({
    tick: host.samples[0]!.tick,
    eventSequence: host.samples[0]!.eventSequence,
    participantId: host.samples[0]!.participantId,
    sidecarTick: host.samples[0]!.localActionSidecar.tick,
  }, {
    tick: 0,
    eventSequence: 0,
    participantId: 'player-1',
    sidecarTick: 0,
  });
  assert.equal(nextView.snapshotTick, 1);
  assert.equal(host.commits[1]!.view.snapshotTick, 1);
  assert.strictEqual(runtime.getLastCommittedView(), nextView);
  assert.equal(Object.isFrozen(host.commits[1]), true);
  assert.equal(Object.isFrozen(host.commits[1]!.terminalCuePlacements), true);

  host.runFrame();
  assert.equal(host.commits.at(-1)!.view.snapshotTick, 2);
  runtime.destroy();
  assert.equal(host.hasFrame(), false);
  assert.deepEqual(Object.values(host.cleanupCounts), [1, 1, 1, 1, 1, 1, 1]);
  assert.equal(runtime.getDebugSnapshot().state, ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.DESTROYED);
  runtime.destroy();
  assert.deepEqual(Object.values(host.cleanupCounts), [1, 1, 1, 1, 1, 1, 1]);
});

test('PP3a snapshots composition once and derives adapter lifecycle from that same snapshot', () => {
  const options = formalCompositionOptions(7303);
  const supply = options.supply as { spawnSpecs: Array<{ slotId: string }> };
  const host = hostHarness();
  const runtime = new ArenaP1SupplyAcceptanceRuntime({
    compositionOptions: options,
    hostResourcePort: host.port,
  });
  supply.spawnSpecs[0]!.slotId = 'mutated-after-construction';
  const view = runtime.start();
  assert.equal(view.snapshotTick, 0);
  runtime.step();
  assert.equal(runtime.getDebugSnapshot().state, ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.ACTIVE);
  runtime.destroy();
});

function compositionWithPostCaptureFactoryFailure(seed: number): Record<string, unknown> {
  return {
    ...formalCompositionOptions(seed),
    physicsFactory() {
      throw new Error('must not execute a public formal factory callback');
    },
  };
}

test('PP3a constructor owns and rolls back all six host resource classes after host capture', () => {
  const host = hostHarness();
  assert.throws(() => new ArenaP1SupplyAcceptanceRuntime({
    compositionOptions: compositionWithPostCaptureFactoryFailure(7316),
    hostResourcePort: host.port,
  }), /composition\.physicsFactory 只能包含可序列化数据/);
  assert.deepEqual(host.cleanupCounts, {
    cancelFrameLoop: 0,
    destroyListeners: 1,
    destroyParticles: 1,
    destroyVoices: 1,
    destroyGpu: 1,
    destroyDom: 1,
    destroyAsyncCallbacks: 1,
  });
});

test('PP3a constructor rollback continues after cleanup failure and preserves aggregate evidence', () => {
  const host = hostHarness({
    destroyParticles() {
      throw new Error('construction particle cleanup failed');
    },
  });
  let failure: unknown = null;
  try {
    new ArenaP1SupplyAcceptanceRuntime({
      compositionOptions: compositionWithPostCaptureFactoryFailure(7317),
      hostResourcePort: host.port,
    });
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof Error);
  const combined = failure as Error & {
    readonly originalError?: Error;
    readonly cleanupErrors?: readonly Error[];
  };
  assert.ok(combined.originalError instanceof Error);
  assert.match(combined.originalError.message, /composition\.physicsFactory 只能包含可序列化数据/);
  assert.equal(combined.cleanupErrors?.length, 1);
  assert.match(combined.cleanupErrors![0]!.message, /construction particle cleanup failed/);
  assert.deepEqual(host.cleanupCounts, {
    cancelFrameLoop: 0,
    destroyListeners: 1,
    destroyParticles: 1,
    destroyVoices: 1,
    destroyGpu: 1,
    destroyDom: 1,
    destroyAsyncCallbacks: 1,
  });
});

test('PP3a permits only a narrow same-tick retry before authority entry', () => {
  let attempts = 0;
  const host = hostHarness({
    sampleInput(value) {
      attempts += 1;
      if (attempts === 1) throw new Error('input source temporarily unavailable');
      const sample = value as ArenaP1SupplyAcceptanceInputSampleV1;
      return createNeutralInputFrame(sample.tick, sample.participantId);
    },
  });
  const runtime = runtimeWithHost(host, 7304);
  runtime.start();
  assert.throws(() => runtime.step(), /同 tick 窄重试/);
  assert.deepEqual({
    state: runtime.getDebugSnapshot().state,
    tick: runtime.getDebugSnapshot().currentTick,
    retryCount: runtime.getDebugSnapshot().narrowInputRetryCount,
    commits: host.commits.length,
  }, {
    state: ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.ACTIVE,
    tick: 0,
    retryCount: 1,
    commits: 1,
  });
  host.runFrame();
  assert.equal(host.commits.at(-1)!.view.snapshotTick, 1);
  runtime.destroy();
});

test('PP3a stops its frame loop on the committed formal match end and then destroys idempotently', () => {
  const host = hostHarness();
  const runtime = runtimeWithHost(host, 7315);
  runtime.start();
  for (let tick = 0; tick < 25 && host.hasFrame(); tick += 1) host.runFrame();
  const ended = runtime.getDebugSnapshot();
  assert.equal(ended.state, ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.ENDED);
  assert.equal(ended.frameLoopOwned, false);
  assert.equal(host.hasFrame(), false);
  assert.equal(host.cleanupCounts.cancelFrameLoop, 1);
  assert.equal(runtime.getLastCommittedView()!.snapshotTick, ended.currentTick);
  runtime.destroy();
  runtime.destroy();
  assert.equal(host.cleanupCounts.cancelFrameLoop, 1);
});

test('PP3a permanently fails and cleans after adapter commit when host commit fails', () => {
  let commitAttempts = 0;
  const host = hostHarness({
    commit(value) {
      commitAttempts += 1;
      if (commitAttempts === 2) throw new Error('host GPU submit failed');
      host.commits.push(value as ArenaP1SupplyAcceptanceHostCommitV1);
    },
  });
  const runtime = runtimeWithHost(host, 7305);
  runtime.start();
  assert.throws(() => runtime.step(), /host GPU submit failed/);
  assert.equal(host.commits.length, 1, 'failed host commit must not replace the committed host view');
  assert.deepEqual(runtime.getDebugSnapshot(), {
    schemaVersion: 1,
    state: ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.FAILED,
    currentTick: null,
    lastCommittedSnapshotTick: null,
    frameLoopOwned: false,
    narrowInputRetryCount: 0,
    terminalFailureKind: ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.HOST_COMMIT_FAILED,
    pendingCleanup: [],
  });
  assert.throws(() => runtime.step(), /failed 状态/);
  runtime.destroy();
  assert.equal(runtime.getDebugSnapshot().state, ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.DESTROYED);
});

test('PP3a catches swallowed reentry before authority and before frame-loop publication', () => {
  const samplingOwner: { runtime: ArenaP1SupplyAcceptanceRuntime | null } = { runtime: null };
  const sampleHost = hostHarness({
    sampleInput(value) {
      try { samplingOwner.runtime?.getDebugSnapshot(); } catch { /* swallowed hostile reentry */ }
      const sample = value as ArenaP1SupplyAcceptanceInputSampleV1;
      return createNeutralInputFrame(sample.tick, sample.participantId);
    },
  });
  const samplingRuntime = runtimeWithHost(sampleHost, 7306);
  samplingOwner.runtime = samplingRuntime;
  samplingRuntime.start();
  assert.throws(() => samplingRuntime.step(), /重入/);
  assert.equal(
    samplingRuntime.getDebugSnapshot().terminalFailureKind,
    ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL,
  );

  const proxyOwner: { runtime: ArenaP1SupplyAcceptanceRuntime | null } = { runtime: null };
  const proxyHost = hostHarness({
    sampleInput(value) {
      const sample = value as ArenaP1SupplyAcceptanceInputSampleV1;
      const frame = createNeutralInputFrame(sample.tick, sample.participantId);
      return new Proxy(frame, {
        ownKeys(target) {
          try { proxyOwner.runtime?.getDebugSnapshot(); } catch { /* swallowed Proxy reentry */ }
          return Reflect.ownKeys(target);
        },
      });
    },
  });
  const proxyRuntime = runtimeWithHost(proxyHost, 7314);
  proxyOwner.runtime = proxyRuntime;
  proxyRuntime.start();
  assert.throws(() => proxyRuntime.step(), /重入/);
  assert.equal(
    proxyRuntime.getDebugSnapshot().terminalFailureKind,
    ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL,
  );

  const commitOwner: { runtime: ArenaP1SupplyAcceptanceRuntime | null } = { runtime: null };
  let commitAttempts = 0;
  const commitHost = hostHarness({
    commit(value) {
      commitAttempts += 1;
      if (commitAttempts === 1) {
        commitHost.commits.push(value as ArenaP1SupplyAcceptanceHostCommitV1);
        return;
      }
      try { commitOwner.runtime?.getDebugSnapshot(); } catch { /* swallowed commit reentry */ }
      throw new Error('ordinary host error after swallowed reentry');
    },
  });
  const commitRuntime = runtimeWithHost(commitHost, 7322);
  commitOwner.runtime = commitRuntime;
  commitRuntime.start();
  assert.throws(() => commitRuntime.step(), /ordinary host error/);
  assert.equal(commitHost.commits.length, 1);
  assert.equal(
    commitRuntime.getDebugSnapshot().terminalFailureKind,
    ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL,
  );

  const startHost = hostHarness({
    startFrameLoop(callback) {
      (callback as () => void)();
      return Object.freeze({ id: 'reentrant-start-token' });
    },
  });
  const startingRuntime = runtimeWithHost(startHost, 7307);
  assert.throws(() => startingRuntime.start(), /重入/);
  assert.equal(
    startingRuntime.getDebugSnapshot().terminalFailureKind,
    ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL,
  );
  assert.equal(startHost.cleanupCounts.cancelFrameLoop, 1);
});

test('PP3a checks captured Session start/get/step/destroy boundaries before publication or release', () => {
  const script = String.raw`
    import { LocalMatchSession } from '@number-strategy-jump/arena-session';
    import { BOT_PROFILE_REGISTRY } from '@number-strategy-jump/arena-bot';
    import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
    import {
      ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
      STAGE4_EQUIPMENT_ID,
    } from '@number-strategy-jump/arena-v1-content';

    const originalStart = LocalMatchSession.prototype.start;
    const originalGetFrame = LocalMatchSession.prototype.getPresentationReadFrame;
    const originalStep = LocalMatchSession.prototype.stepWithPresentationReadFrame;
    const originalDestroy = LocalMatchSession.prototype.destroy;
    let activeRuntime = null;
    let sessionReentryBoundary = 'none';
    let destroyReentryEnabled = false;
    let destroyBoundaryAttempts = 0;
    const attemptSessionReentry = (boundary) => {
      if (sessionReentryBoundary !== boundary) return;
      try { activeRuntime?.getDebugSnapshot(); } catch {}
    };
    Object.defineProperty(LocalMatchSession.prototype, 'start', {
      configurable: true,
      writable: true,
      value: function (...args) {
        const result = Reflect.apply(originalStart, this, args);
        attemptSessionReentry('start');
        return result;
      },
    });
    Object.defineProperty(LocalMatchSession.prototype, 'getPresentationReadFrame', {
      configurable: true,
      writable: true,
      value: function (...args) {
        const result = Reflect.apply(originalGetFrame, this, args);
        attemptSessionReentry('get-frame');
        return result;
      },
    });
    Object.defineProperty(LocalMatchSession.prototype, 'stepWithPresentationReadFrame', {
      configurable: true,
      writable: true,
      value: function (...args) {
        const result = Reflect.apply(originalStep, this, args);
        attemptSessionReentry('step');
        if (sessionReentryBoundary === 'step') {
          throw new Error('ordinary Session error after swallowed step reentry');
        }
        return result;
      },
    });
    Object.defineProperty(LocalMatchSession.prototype, 'destroy', {
      configurable: true,
      writable: true,
      value: function (...args) {
        const result = Reflect.apply(originalDestroy, this, args);
        if (destroyReentryEnabled) {
          destroyBoundaryAttempts += 1;
          if (destroyBoundaryAttempts === 1) {
            try { activeRuntime?.getDebugSnapshot(); } catch {}
          }
        }
        return result;
      },
    });

    const {
      ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND,
      ArenaP1SupplyAcceptanceRuntime,
    } = await import('./src/entry/arena-p1-supply-acceptance-runtime.ts');
    const specs = [
      ['left', STAGE4_EQUIPMENT_ID.HAMMER, 'pp3a-child-left', -3],
      ['center', STAGE4_EQUIPMENT_ID.CHAIN, 'pp3a-child-center', 0],
      ['right', STAGE4_EQUIPMENT_ID.SHIELD, 'pp3a-child-right', 3],
    ];
    const composition = (seed) => ({
      seed,
      config: { preparingTicks: 0, suddenDeathStartTick: 10, hardLimitTicks: 20 },
      supply: {
        supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
        spawnSpecs: specs.map(([slotId, equipmentDefinitionId, spawnId, x]) => ({
          slotId,
          equipmentDefinitionId,
          spawnId,
          position: { x, y: 1, z: 0 },
        })),
      },
      bot: {
        participantId: 'player-2',
        difficultyId: 'normal',
        behaviorSeed: 0x12003456,
        personalitySeed: 0x5600789a,
        profileRegistry: BOT_PROFILE_REGISTRY,
      },
      playerParticipantId: 'player-1',
      publicMatchInfo: {
        matchSeed: seed,
        opponent: {
          id: 'pp3a-child-bot',
          displayName: 'PP3a child bot',
          portraitKey: 'pp3a-child-portrait',
          appearanceKey: 'pp3a-child-appearance',
        },
      },
    });
    const createHost = () => {
      const commits = [];
      return {
        commits,
        port: {
          sampleInput(sample) {
            return createNeutralInputFrame(sample.tick, sample.participantId);
          },
          commit(value) { commits.push(value); },
          startFrameLoop() { return 'pp3a-child-frame'; },
          cancelFrameLoop() {},
          destroyListeners() {},
          destroyParticles() {},
          destroyVoices() {},
          destroyGpu() {},
          destroyDom() {},
          destroyAsyncCallbacks() {},
        },
      };
    };

    const startHost = createHost();
    const startRuntime = new ArenaP1SupplyAcceptanceRuntime({
      compositionOptions: composition(7318),
      hostResourcePort: startHost.port,
    });
    activeRuntime = startRuntime;
    sessionReentryBoundary = 'start';
    try { startRuntime.start(); } catch {}
    const startDebug = startRuntime.getDebugSnapshot();

    const getHost = createHost();
    const getRuntime = new ArenaP1SupplyAcceptanceRuntime({
      compositionOptions: composition(7319),
      hostResourcePort: getHost.port,
    });
    activeRuntime = getRuntime;
    sessionReentryBoundary = 'get-frame';
    try { getRuntime.start(); } catch {}
    const getDebug = getRuntime.getDebugSnapshot();

    const stepHost = createHost();
    const stepRuntime = new ArenaP1SupplyAcceptanceRuntime({
      compositionOptions: composition(7320),
      hostResourcePort: stepHost.port,
    });
    activeRuntime = stepRuntime;
    sessionReentryBoundary = 'none';
    stepRuntime.start();
    sessionReentryBoundary = 'step';
    try { stepRuntime.step(); } catch {}
    const stepDebug = stepRuntime.getDebugSnapshot();

    sessionReentryBoundary = 'none';
    const destroyHost = createHost();
    const destroyRuntime = new ArenaP1SupplyAcceptanceRuntime({
      compositionOptions: composition(7321),
      hostResourcePort: destroyHost.port,
    });
    activeRuntime = destroyRuntime;
    destroyRuntime.start();
    destroyReentryEnabled = true;
    try { destroyRuntime.destroy(); } catch {}
    const destroyRetry = destroyRuntime.getDebugSnapshot();
    destroyReentryEnabled = false;
    destroyRuntime.destroy();
    const destroyFinal = destroyRuntime.getDebugSnapshot();

    process.stdout.write(JSON.stringify({
      reentrantKind: ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL,
      startKind: startDebug.terminalFailureKind,
      startCommits: startHost.commits.length,
      getKind: getDebug.terminalFailureKind,
      getCommits: getHost.commits.length,
      stepKind: stepDebug.terminalFailureKind,
      stepCommits: stepHost.commits.length,
      stepPendingCleanup: stepDebug.pendingCleanup,
      destroyRetryPendingCleanup: destroyRetry.pendingCleanup,
      destroyFinalState: destroyFinal.state,
      destroyBoundaryAttempts,
    }));
  `;
  const child = spawnSync(process.execPath, [
    '--import',
    'tsx',
    '--input-type=module',
    '--eval',
    script,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), {
    reentrantKind: ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL,
    startKind: ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL,
    startCommits: 0,
    getKind: ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL,
    getCommits: 0,
    stepKind: ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.REENTRANT_CALL,
    stepCommits: 1,
    stepPendingCleanup: [],
    destroyRetryPendingCleanup: ['session'],
    destroyFinalState: ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.DESTROYED,
    destroyBoundaryAttempts: 1,
  });
});

test('PP3a retains only failed host cleanup ownership for exact destroy retry', () => {
  let particleAttempts = 0;
  let voiceAttempts = 0;
  const owner: { runtime: ArenaP1SupplyAcceptanceRuntime | null } = { runtime: null };
  const host = hostHarness({
    destroyParticles() {
      particleAttempts += 1;
      if (particleAttempts === 1) throw new Error('particle disposal failed');
    },
    destroyVoices() {
      voiceAttempts += 1;
      if (voiceAttempts === 1) {
        try { owner.runtime?.destroy(); } catch { /* swallowed cleanup reentry */ }
      }
    },
  });
  const runtime = runtimeWithHost(host, 7308);
  owner.runtime = runtime;
  runtime.start();
  assert.throws(() => runtime.destroy(), /destroy/);
  assert.deepEqual(runtime.getDebugSnapshot().pendingCleanup, ['particle', 'voice']);
  assert.equal(
    runtime.getDebugSnapshot().terminalFailureKind,
    ARENA_P1_SUPPLY_ACCEPTANCE_FAILURE_KIND.CLEANUP_FAILED,
  );
  runtime.destroy();
  assert.equal(particleAttempts, 2);
  assert.equal(voiceAttempts, 2);
  assert.equal(runtime.getDebugSnapshot().state, ARENA_P1_SUPPLY_ACCEPTANCE_RUNTIME_STATE.DESTROYED);
  assert.deepEqual(Object.values(host.cleanupCounts), [1, 1, 2, 2, 1, 1, 1]);
});

function marker(
  supplyId: string,
  equipmentInstanceId: string,
  x: number,
): ArenaSupplyPresentationMarkerV1 {
  return Object.freeze({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    supplyId,
    equipmentInstanceId,
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    position: Object.freeze({ x, y: 2, z: 3 }),
    spawnTick: 1,
    expireTick: 601,
    remainingTicks: 600,
    labelSeconds: 10,
  });
}

function terminalCue(
  id: string,
  supplyId: string,
  equipmentInstanceId: string,
): ArenaSupplyPresentationCueV1 {
  return Object.freeze({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    id,
    kind: ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.PICKED_UP,
    sourceEventIds: Object.freeze([`${id}-event`]),
    tick: 2,
    sequenceStart: 1,
    sequenceEnd: 1,
    supplyId,
    equipmentInstanceId,
    participantId: 'player-1',
    previousEquipmentInstanceId: null,
    nextEquipmentInstanceId: null,
  });
}

function view(
  tick: number,
  markers: readonly ArenaSupplyPresentationMarkerV1[],
  cues: readonly ArenaSupplyPresentationCueV1[],
): ArenaSupplyPresentationViewV1 {
  return Object.freeze({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    streamId: 'pp3a-terminal-origin-test',
    status: ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1.READY,
    snapshotTick: tick,
    snapshotEventSequence: tick,
    nextExpectedEventSequence: tick,
    resyncedFromSnapshot: false,
    markers: Object.freeze([...markers]),
    cues: Object.freeze([...cues]),
  });
}

test('PP3a terminal Cue origin uses only prior committed marker identity or accessible fallback', () => {
  const prior = view(1, [marker('supply-a', 'equipment-a', 4)], []);
  const current = view(2, [
    marker('supply-a', 'equipment-a', 99),
    marker('supply-b', 'equipment-b', 88),
  ], [
    terminalCue('cue-a', 'supply-a', 'equipment-a'),
    terminalCue('cue-b', 'supply-b', 'equipment-b'),
  ]);
  const commit = createArenaP1SupplyAcceptanceHostCommitV1(current, prior);
  assert.deepEqual(commit.terminalCuePlacements, [
    {
      schemaVersion: 1,
      cueId: 'cue-a',
      supplyId: 'supply-a',
      equipmentInstanceId: 'equipment-a',
      originKind: ARENA_P1_SUPPLY_ACCEPTANCE_TERMINAL_ORIGIN_KIND.SPATIAL,
      position: { x: 4, y: 2, z: 3 },
    },
    {
      schemaVersion: 1,
      cueId: 'cue-b',
      supplyId: 'supply-b',
      equipmentInstanceId: 'equipment-b',
      originKind: ARENA_P1_SUPPLY_ACCEPTANCE_TERMINAL_ORIGIN_KIND.ACCESSIBLE_NON_SPATIAL,
      position: null,
    },
  ]);
  assert.equal(Object.isFrozen(commit), true);
  assert.equal(Object.isFrozen(commit.terminalCuePlacements[0]!.position), true);
});

test('PP3a rejects accessors, Symbols and split session/adapter injection without executing getters', () => {
  const host = hostHarness();
  let getterCalls = 0;
  const accessorOptions = Object.defineProperty({}, 'compositionOptions', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return formalCompositionOptions(7309);
    },
  });
  Object.defineProperty(accessorOptions, 'hostResourcePort', {
    enumerable: true,
    value: host.port,
  });
  assert.throws(() => new ArenaP1SupplyAcceptanceRuntime(accessorOptions), /数据字段/);
  assert.equal(getterCalls, 0);
  assert.throws(() => new ArenaP1SupplyAcceptanceRuntime({
    compositionOptions: formalCompositionOptions(7310),
    hostResourcePort: host.port,
    session: {},
  }), /不支持字段 session/);
  assert.throws(() => new ArenaP1SupplyAcceptanceRuntime({
    compositionOptions: formalCompositionOptions(7311),
    hostResourcePort: host.port,
    [Symbol('future')]: true,
  }), /Symbol/);
});

test('PP3a rejects async and hostile thenable input without unhandled rejection or then execution', async () => {
  const unhandled: unknown[] = [];
  const listener = (reason: unknown) => { unhandled.push(reason); };
  process.on('unhandledRejection', listener);
  try {
    const asyncHost = hostHarness({
      sampleInput() {
        return Promise.reject(new Error('late input rejection'));
      },
    });
    const asyncRuntime = runtimeWithHost(asyncHost, 7312);
    asyncRuntime.start();
    assert.throws(() => asyncRuntime.step(), /同 tick 窄重试/);
    asyncRuntime.destroy();

    let thenGetterCalls = 0;
    const hostileHost = hostHarness({
      sampleInput() {
        return Object.defineProperty({}, 'then', {
          get() {
            thenGetterCalls += 1;
            throw new Error('then getter executed');
          },
        });
      },
    });
    const hostileRuntime = runtimeWithHost(hostileHost, 7313);
    hostileRuntime.start();
    assert.throws(() => hostileRuntime.step(), /同 tick 窄重试/);
    assert.equal(thenGetterCalls, 0);
    hostileRuntime.destroy();
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', listener);
  }
});
