import { describe, expect, it } from 'vitest';
import {
  PRODUCT_MATCH_COORDINATOR_STATE,
} from '@number-strategy-jump/arena-product-match';
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

function matchCoordinatorHarness(options: Readonly<{
  onDestroy?: (() => void) | undefined;
}> = {}): Record<string, unknown> {
  let state: string = PRODUCT_MATCH_COORDINATOR_STATE.IDLE;
  let result: Readonly<Record<string, unknown>> | null = null;
  const snapshot = () => Object.freeze({
    schemaVersion: 1,
    state,
    hasRuntime: state !== PRODUCT_MATCH_COORDINATOR_STATE.IDLE
      && state !== PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED,
    preparing: state === PRODUCT_MATCH_COORDINATOR_STATE.PREPARING,
    paused: state === PRODUCT_MATCH_COORDINATOR_STATE.PAUSED,
    cleanupIncomplete: false,
    publicMatchInfo: null,
    result,
  });
  return {
    prepare() {
      state = PRODUCT_MATCH_COORDINATOR_STATE.READY;
      return Promise.resolve(snapshot());
    },
    start() {
      state = PRODUCT_MATCH_COORDINATOR_STATE.RUNNING;
      return snapshot();
    },
    setPaused(paused: boolean) {
      if (state === PRODUCT_MATCH_COORDINATOR_STATE.RUNNING) {
        state = paused
          ? PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
          : PRODUCT_MATCH_COORDINATOR_STATE.RUNNING;
      }
      return snapshot();
    },
    step() {
      result = Object.freeze({ authorityHash: '12345678' });
      state = PRODUCT_MATCH_COORDINATOR_STATE.RESULT;
      return Object.freeze({ events: Object.freeze([]), snapshot: Object.freeze({ tick: 1 }), result });
    },
    getMatchSnapshot() { return Object.freeze({ tick: 1 }); },
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
}> = {}): ProductSessionController {
  return new ProductSessionController({
    stateMachine: values.stateMachine ?? new ProductSessionStateMachine(),
    profileService: values.profileService ?? profileServiceHarness(),
    matchCoordinator: values.matchCoordinator ?? matchCoordinatorHarness(),
    rewardCommitter: values.rewardCommitter ?? rewardCommitterHarness(),
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

  it('rejects callback reentry while preserving the outer transition', async () => {
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
    const booted = await controller.boot();
    expect(String(reentry)).toMatch(/不可重入/);
    expect(booted.state.state).toBe(PRODUCT_SESSION_STATE.READY);
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
    controller.beginMatch();
    controller.stepMatch();
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
