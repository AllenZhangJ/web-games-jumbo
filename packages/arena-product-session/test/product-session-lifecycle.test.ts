import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import {
  ACTION_RESOLUTION_KIND,
  ARENA_MATCH_READ_PROFILE,
  createMatchContentSelection,
  createMatchReadFrameV2Audit,
  createNeutralInputFrame,
  normalizeInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_MATCH_COORDINATOR_STATE,
} from '@number-strategy-jump/arena-product-match';
import {
  createProductMatchResult,
  createProductPublicMatchInfo,
} from '@number-strategy-jump/arena-product-contracts';
import {
  PRODUCT_SESSION_STATE,
  ProductSessionStateMachine,
} from '@number-strategy-jump/arena-product-state';
import { PlayerProfilePersistenceError } from '@number-strategy-jump/arena-profile-service';
import { ProductSessionController } from '../src/index.js';

function profile(revision = 0): Readonly<Record<string, unknown>> {
  return Object.freeze({ revision, selection: Object.freeze({ characterId: 'fighter-a' }) });
}

function deferred<T>(): Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return Object.freeze({ promise, resolve, reject });
}

async function unhandledDuring(operation: () => Promise<void>): Promise<readonly unknown[]> {
  const reasons: unknown[] = [];
  const onUnhandled = (reason: unknown): void => { reasons.push(reason); };
  process.on('unhandledRejection', onUnhandled);
  try {
    await operation();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    return reasons;
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
}

const CONTENT = createMatchContentSelection({
  schemaVersion: 1,
  contentDefinitionId: 'product-session-lifecycle',
  contentVersion: 1,
  characterDefinitionIds: ['fighter-a', 'fighter-b'],
  equipmentDefinitionIds: [],
  mapDefinitionIds: ['arena'],
  selectedMapDefinitionId: 'arena',
  participantCharacters: [
    { participantId: 'player-1', definitionId: 'fighter-a' },
    { participantId: 'player-2', definitionId: 'fighter-b' },
  ],
});
const PUBLIC_INFO = createProductPublicMatchInfo({
  matchSeed: 7,
  opponent: {
    id: 'opponent-1',
    displayName: 'Opponent',
    portraitKey: 'portrait',
    appearanceKey: 'appearance',
  },
  content: CONTENT,
});
const RESULT = createProductMatchResult({
  matchSeed: 7,
  opponent: PUBLIC_INFO.opponent,
  content: CONTENT,
  replay: {
    replaySchemaVersion: 5,
    schemaVersion: 5,
    physicsBackendVersion: 'physics-v1',
    configHash: '12345678',
    ruleContentHash: 'abcdef01',
    finalHash: '11223344',
    matchSeed: 7,
    config: { contentSelection: CONTENT },
    result: { winnerId: null, reason: 'test', isDraw: true, endedAtTick: 1 },
  },
});
const POS = Object.freeze({ x: 0, y: 0, z: 0 });
function frame(tick: number, ended: boolean): Readonly<Record<string, unknown>> {
  const outcome = () => ({ kind: ACTION_RESOLUTION_KIND.NONE, actionDefinitionId: null, lane: null, source: null, reason: 'no-candidate' });
  const participant = (id: string) => ({
    id,
    characterDefinitionId: id === 'player-1' ? 'fighter-a' : 'fighter-b',
    status: 'active',
    lives: 1,
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
      characterDefinitionId: id === 'player-1' ? 'fighter-a' : 'fighter-b',
      mode: 'grounded', coyoteTicksRemaining: 0, jumpBufferTicksRemaining: 0,
      airJumpsUsed: 0, crouchChargeTicks: 0, crouchActionId: null,
      downSmashActionId: null, revision: 0, grounded: true,
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
      configHash: '12345678', ruleContentHash: 'abcdef01', matchSeed: 7,
      tick, activeTick: tick, phase: ended ? 'ended' : 'running',
      remainingTicks: ended ? 0 : 100, eventSequence: tick,
      participants: [participant('player-1'), participant('player-2')],
      equipment: [], activeSupplyProjection: null,
      map: {
        schemaVersion: 1, definitionId: 'arena', nextActiveTick: 0, revision: 0,
        surfaces: [{ id: 'surface-ground', enabled: true, revision: 0 }],
        occurrences: [{ occurrenceId: 'occurrence-0', eventId: 'none', kind: 'none', warningTick: 0, startTick: 0, endTick: null, phase: ended ? 'ended' : 'running', publicPayload: {}, revision: 0 }],
      },
      result: ended ? RESULT.authorityResult : null,
    },
    localActionSidecar: {
      schemaVersion: 2, tick, eventSequence: tick, participantId: 'player-1',
      profile: ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
      primaryActionDefinitionId: null,
      channels: { primary: outcome(), primaryHold: outcome() },
    },
  });
}

function matchCoordinatorHarness(options: Readonly<{
  onDestroy?: (() => void) | undefined;
}> = {}): Record<string, unknown> {
  let state: string = PRODUCT_MATCH_COORDINATOR_STATE.IDLE;
  let result: ReturnType<typeof createProductMatchResult> | null = null;
  const snapshot = () => Object.freeze({
    schemaVersion: 1,
    state,
    hasRuntime: state !== PRODUCT_MATCH_COORDINATOR_STATE.IDLE
      && state !== PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED,
    preparing: state === PRODUCT_MATCH_COORDINATOR_STATE.PREPARING,
    paused: state === PRODUCT_MATCH_COORDINATOR_STATE.PAUSED,
    cleanupIncomplete: false,
    publicMatchInfo: state === PRODUCT_MATCH_COORDINATOR_STATE.IDLE
      || state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED ? null : PUBLIC_INFO,
    result,
  });
  return {
    prepare() {
      state = PRODUCT_MATCH_COORDINATOR_STATE.READY;
      return Promise.resolve(snapshot());
    },
    startWithReadFrame() {
      state = PRODUCT_MATCH_COORDINATOR_STATE.RUNNING;
      return Object.freeze({ readFrame: frame(0, false), snapshot: snapshot() });
    },
    setPaused(paused: boolean) {
      if (state === PRODUCT_MATCH_COORDINATOR_STATE.RUNNING) {
        state = paused
          ? PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
          : PRODUCT_MATCH_COORDINATOR_STATE.RUNNING;
      }
      return snapshot();
    },
    stepWithReadFrame() {
      result = RESULT;
      state = PRODUCT_MATCH_COORDINATOR_STATE.RESULT;
      return Object.freeze({
        events: Object.freeze([]),
        readFrame: frame(1, true),
        input: normalizeInputFrame(createNeutralInputFrame(0, 'player-1')),
        result,
      });
    },
    getMatchReadFrame() { return frame(state === PRODUCT_MATCH_COORDINATOR_STATE.RESULT ? 1 : 0, state === PRODUCT_MATCH_COORDINATOR_STATE.RESULT); },
    getResult() { return result; },
    release() {
      result = null;
      state = PRODUCT_MATCH_COORDINATOR_STATE.IDLE;
      return snapshot();
    },
    resetFailure() {
      state = PRODUCT_MATCH_COORDINATOR_STATE.IDLE;
      return snapshot();
    },
    destroy() {
      state = PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED;
      options.onDestroy?.();
    },
    getSnapshot: snapshot,
  };
}

function profileServiceHarness(openValue: unknown = profile()): Record<string, unknown> {
  let current = profile();
  return {
    open: () => openValue,
    renewLease: () => true,
    selectCharacter: () => {
      current = profile(1);
      return current;
    },
    destroy: () => undefined,
  };
}

function rewardCommitterHarness(): Record<string, unknown> {
  return {
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
      profile: profile(1),
    }),
  };
}

function createController(values: Readonly<{
  stateMachine?: unknown;
  profileService?: unknown;
  matchCoordinator?: unknown;
  rewardCommitter?: unknown;
  diagnosticSink?: (diagnostic: Readonly<{ type: string; error: Error | null }>) => unknown;
}> = {}): ProductSessionController {
  return new ProductSessionController({
    stateMachine: values.stateMachine ?? new ProductSessionStateMachine(),
    profileService: values.profileService ?? profileServiceHarness(),
    matchCoordinator: values.matchCoordinator ?? matchCoordinatorHarness(),
    rewardCommitter: values.rewardCommitter ?? rewardCommitterHarness(),
    ...(values.diagnosticSink === undefined ? {} : { diagnosticSink: values.diagnosticSink }),
  });
}

describe('ProductSessionController strict lifecycle', () => {
  it('rejects option accessors without executing them and snapshots owned methods', async () => {
    let getterCalls = 0;
    const invalid = {
      get stateMachine() {
        getterCalls += 1;
        return new ProductSessionStateMachine();
      },
      profileService: profileServiceHarness(),
      matchCoordinator: matchCoordinatorHarness(),
      rewardCommitter: rewardCommitterHarness(),
    };
    expect(() => new ProductSessionController(invalid)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);

    const service = profileServiceHarness(profile(3));
    const controller = createController({ profileService: service });
    service.open = () => { throw new Error('replaced method must not run'); };
    const booted = await controller.boot();
    expect((booted.profile as unknown as { revision: number }).revision).toBe(3);
    controller.destroy();
  });

  it('fails closed when an owned callback swallows controller reentry', async () => {
    let reentry: Error | null = null;
    const service = profileServiceHarness();
    service.open = () => {
      try {
        controller.getSnapshot();
      } catch (error) {
        reentry = error as Error;
      }
      return profile();
    };
    const controller = createController({ profileService: service });
    expect(() => controller.boot()).toThrow(/重入/);
    expect(String(reentry)).toMatch(/不可重入/);
    expect(controller.state).toBe(PRODUCT_SESSION_STATE.FATAL_ERROR);
    controller.destroy();
  });

  it('retains late profile cleanup ownership until an exact destroy retry succeeds', async () => {
    const loading = deferred<Readonly<Record<string, unknown>>>();
    let destroyCalls = 0;
    const service = profileServiceHarness(loading.promise);
    service.destroy = () => {
      destroyCalls += 1;
      if (destroyCalls === 2) throw new Error('late cleanup failed');
    };
    const controller = createController({ profileService: service });
    const booting = controller.boot();
    controller.destroy();
    loading.resolve(profile());
    const settled = await booting;
    expect(settled.state.state).toBe(PRODUCT_SESSION_STATE.DESTROYED);
    expect(settled.lastError?.code).toBe('cleanup-failed');
    expect(destroyCalls).toBe(2);
    controller.destroy();
    expect(destroyCalls).toBe(3);
    expect(controller.getSnapshot().lastError).toBeNull();
  });

  it('contains ProfileService.open hostile returns and accepts native/foreign Promise profiles', async () => {
    let thenCalls = 0;
    const service = profileServiceHarness({
      then() {
        thenCalls += 1;
        throw new Error('ProfileService hostile then must not run');
      },
    });
    const controller = createController({ profileService: service });
    const unhandled = await unhandledDuring(async () => {
      const recovered = await controller.boot();
      expect(recovered.state.activeState).toBe(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
      expect(recovered.lastError?.code).toBe('profile-load-failed');
    });
    expect(thenCalls).toBe(0);
    expect(unhandled).toEqual([]);
    controller.destroy();

    const nativeService = profileServiceHarness(Promise.resolve(profile(11)));
    const nativeController = createController({ profileService: nativeService });
    await expect(nativeController.boot()).resolves.toMatchObject({
      state: { state: PRODUCT_SESSION_STATE.READY },
      profile: { revision: 11 },
    });
    nativeController.destroy();

    const foreignProfile = runInNewContext('Promise.resolve(value)', { value: profile(12) });
    const foreignController = createController({
      profileService: profileServiceHarness(foreignProfile),
    });
    await expect(foreignController.boot()).resolves.toMatchObject({
      state: { state: PRODUCT_SESSION_STATE.READY },
      profile: { revision: 12 },
    });
    foreignController.destroy();
  });

  it('contains MatchCoordinator.prepare hostile returns before the ProductSession transition', async () => {
    let thenCalls = 0;
    const coordinator = matchCoordinatorHarness();
    coordinator.prepare = () => ({
      then() {
        thenCalls += 1;
        throw new Error('MatchCoordinator hostile then must not run');
      },
    });
    const controller = createController({ matchCoordinator: coordinator });
    await controller.boot();
    controller.openCharacterSelect();
    const unhandled = await unhandledDuring(async () => {
      const recovered = await controller.requestMatch();
      expect(recovered.state.activeState).toBe(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
      expect(recovered.lastError?.code).toBe('match-prepare-failed');
    });
    expect(thenCalls).toBe(0);
    expect(unhandled).toEqual([]);
    controller.destroy();

    const nativeCoordinator = matchCoordinatorHarness();
    nativeCoordinator.prepare = () => Promise.resolve(null);
    const nativeController = createController({ matchCoordinator: nativeCoordinator });
    await nativeController.boot();
    nativeController.openCharacterSelect();
    await expect(nativeController.requestMatch()).resolves.toMatchObject({
      state: { activeState: PRODUCT_SESSION_STATE.PREPARING },
    });
    nativeController.destroy();

    const foreignCoordinator = matchCoordinatorHarness();
    foreignCoordinator.prepare = () => runInNewContext('Promise.resolve(null)');
    const foreignController = createController({ matchCoordinator: foreignCoordinator });
    await foreignController.boot();
    foreignController.openCharacterSelect();
    await expect(foreignController.requestMatch()).resolves.toMatchObject({
      state: { activeState: PRODUCT_SESSION_STATE.PREPARING },
    });
    foreignController.destroy();

    const ordinaryCoordinator = matchCoordinatorHarness();
    ordinaryCoordinator.prepare = () => ({ then: null });
    const ordinaryController = createController({ matchCoordinator: ordinaryCoordinator });
    await ordinaryController.boot();
    ordinaryController.openCharacterSelect();
    await expect(ordinaryController.requestMatch()).resolves.toMatchObject({
      state: { activeState: PRODUCT_SESSION_STATE.PREPARING },
    });
    ordinaryController.destroy();
  });

  it('contains diagnostic Promise returns without executing hostile thenables or changing session state', async () => {
    let hostileThenCalls = 0;
    const hostileController = createController({
      profileService: profileServiceHarness({
        then() {
          throw new Error('profile source should not be assimilated');
        },
      }),
      diagnosticSink: () => ({
        then() {
          hostileThenCalls += 1;
          throw new Error('diagnostic hostile then must not run');
        },
      }),
    });
    const unhandled = await unhandledDuring(async () => {
      const recovered = await hostileController.boot();
      expect(recovered.state.activeState).toBe(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
    });
    expect(hostileThenCalls).toBe(0);
    expect(unhandled).toEqual([]);
    hostileController.destroy();

    const nativeDiagnosticController = createController({
      profileService: profileServiceHarness({
        then() { throw new Error('profile source should not be assimilated'); },
      }),
      diagnosticSink: () => Promise.reject(new Error('native diagnostic rejection')),
    });
    const nativeUnhandled = await unhandledDuring(async () => {
      const recovered = await nativeDiagnosticController.boot();
      expect(recovered.state.activeState).toBe(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
    });
    expect(nativeUnhandled).toEqual([]);
    nativeDiagnosticController.destroy();

    const foreignDiagnosticController = createController({
      profileService: profileServiceHarness({
        then() { throw new Error('profile source should not be assimilated'); },
      }),
      diagnosticSink: () => runInNewContext('Promise.reject("foreign diagnostic rejection")'),
    });
    const foreignUnhandled = await unhandledDuring(async () => {
      const recovered = await foreignDiagnosticController.boot();
      expect(recovered.state.activeState).toBe(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
    });
    expect(foreignUnhandled).toEqual([]);
    foreignDiagnosticController.destroy();
  });

  it('rejects an asynchronous sync port and contains it as a fatal lifecycle failure', async () => {
    const service = profileServiceHarness();
    service.renewLease = () => Promise.reject(new Error('late rejection'));
    const controller = createController({ profileService: service });
    await controller.boot();
    const outcome = controller.renewProfileLease();
    expect(outcome.renewed).toBe(false);
    expect(outcome.productSnapshot.state.state).toBe(PRODUCT_SESSION_STATE.FATAL_ERROR);
    expect(outcome.productSnapshot.lastError?.code).toBe('profile-save-failed');
    await Promise.resolve();
    controller.destroy();
  });

  it('rejects and contains Promise, foreign Promise, and thenable MatchCoordinator results before validation', async () => {
    let thenCalls = 0;
    let shadowGetterCalls = 0;
    const shadowedNativePromise = Promise.reject(new Error('shadowed native rejection'));
    Object.defineProperty(shadowedNativePromise, 'then', {
      configurable: true,
      get() {
        shadowGetterCalls += 1;
        throw new Error('shadow getter must not run');
      },
    });
    const shadowedForeignPromise = runInNewContext('Promise.reject("shadowed foreign rejection")') as object;
    Object.defineProperty(shadowedForeignPromise, 'then', {
      configurable: true,
      value: null,
    });
    const cycleThenable: { then: () => unknown } = { then: () => cycleThenable };
    Object.freeze(cycleThenable);
    const cases: ReadonlyArray<Readonly<{
      label: string;
      value: unknown;
    }>> = [
      { label: 'Promise', value: Promise.reject(new Error('late rejected getResult')) },
      { label: 'foreign Promise', value: runInNewContext('Promise.reject("foreign late rejection")') },
      { label: 'shadowed native Promise', value: shadowedNativePromise },
      { label: 'shadowed foreign Promise', value: shadowedForeignPromise },
      {
        label: 'thenable',
        value: Object.freeze({
          then() {
            thenCalls += 1;
            return Promise.reject(new Error('returned thenable rejection'));
          },
        }),
      },
      { label: 'cycle thenable', value: cycleThenable },
    ];
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => { unhandled.push(reason); };
    process.on('unhandledRejection', onUnhandled);
    try {
      for (const { label, value } of cases) {
        const coordinator = matchCoordinatorHarness();
        coordinator.getResult = () => value;
        const controller = createController({ matchCoordinator: coordinator });
        let replacementCalls = 0;
        coordinator.getResult = () => {
          replacementCalls += 1;
          throw new Error(`${label} replacement must not run`);
        };
        await controller.boot();
        controller.openCharacterSelect();
        await controller.requestMatch();
        controller.beginMatchWithReadFrame();
        const outcome = controller.stepMatchWithReadFrame();
        expect(outcome.matchStep).toBeNull();
        expect(outcome.productSnapshot.state.activeState).toBe(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
        expect(replacementCalls).toBe(0);
        controller.destroy();
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(thenCalls).toBe(0);
      expect(shadowGetterCalls).toBe(0);
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('publishes fatal state before invoking owned cleanup callbacks', async () => {
    const machine = new ProductSessionStateMachine();
    let observedState: string | null = null;
    const coordinator = matchCoordinatorHarness({
      onDestroy: () => {
        observedState = machine.getSnapshot().state;
      },
    });
    const service = profileServiceHarness();
    service.renewLease = () => {
      throw new PlayerProfilePersistenceError('lease lost', { recoverable: false });
    };
    const controller = createController({
      stateMachine: machine,
      profileService: service,
      matchCoordinator: coordinator,
    });
    await controller.boot();
    controller.renewProfileLease();
    expect(observedState).toBe(PRODUCT_SESSION_STATE.FATAL_ERROR);
    controller.destroy();
  });

  it('fails closed before publishing a malformed reward outcome', async () => {
    const controller = createController({
      rewardCommitter: {
        commit: () => ({
          grant: { unlocks: {} },
          committed: true,
          duplicate: true,
          profile: profile(99),
        }),
      },
    });
    await controller.boot();
    controller.openCharacterSelect();
    await controller.requestMatch();
    controller.beginMatchWithReadFrame();
    controller.stepMatchWithReadFrame();
    const failed = controller.commitReward();
    expect(failed.state.state).toBe(PRODUCT_SESSION_STATE.FATAL_ERROR);
    expect(failed.lastError?.code).toBe('reward-processing-failed');
    expect(failed.reward).toBeNull();
    expect((failed.profile as unknown as { revision: number }).revision).toBe(0);
    controller.destroy();
  });

  it('does not invoke owned cleanup before the destroyed state is published', () => {
    const machine = new ProductSessionStateMachine();
    let stateDestroyCalls = 0;
    let matchDestroyCalls = 0;
    const statePort = {
      dispatch: machine.dispatch.bind(machine),
      suspend: machine.suspend.bind(machine),
      resume: machine.resume.bind(machine),
      failRecoverable: machine.failRecoverable.bind(machine),
      retry: machine.retry.bind(machine),
      failFatal: machine.failFatal.bind(machine),
      destroy() {
        stateDestroyCalls += 1;
        if (stateDestroyCalls === 1) throw new Error('state publication failed');
        return machine.destroy();
      },
      getSnapshot: machine.getSnapshot.bind(machine),
    };
    const coordinator = matchCoordinatorHarness({
      onDestroy: () => { matchDestroyCalls += 1; },
    });
    const controller = createController({
      stateMachine: statePort,
      matchCoordinator: coordinator,
    });
    expect(() => controller.destroy()).toThrow(/清理未完整完成/);
    expect(machine.state).toBe(PRODUCT_SESSION_STATE.BOOT);
    expect(matchDestroyCalls).toBe(0);
    controller.destroy();
    expect(machine.state).toBe(PRODUCT_SESSION_STATE.DESTROYED);
    expect(matchDestroyCalls).toBe(1);
  });
});
