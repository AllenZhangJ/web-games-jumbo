import { describe, expect, it } from 'vitest';
import {
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_RUNTIME_STATE,
  INPUT_PILOT_TRIAL_CONTROLLER_STATE,
  InputPilotTrialController,
  InputPilotWorkspaceRepository,
  createArenaInputPilotV1Definition,
} from '../src/index.js';

interface RuntimeSignals {
  readonly onProgress: (reviewDraft?: unknown) => unknown;
  readonly onFailure: (error: unknown) => unknown;
}

function clone(value: unknown): unknown {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as unknown;
}

function storageHarness() {
  const values = new Map<string, unknown>();
  return {
    storageRead(key: string) {
      return values.has(key)
        ? { ok: true, found: true, value: clone(values.get(key)) }
        : { ok: true, found: false, value: undefined };
    },
    storageWrite(key: string, value: unknown) {
      values.set(key, clone(value));
      return true;
    },
    storageDelete(key: string) {
      values.delete(key);
      return true;
    },
  };
}

function createController(runtimeFactory: (signals: unknown) => unknown) {
  const definition = createArenaInputPilotV1Definition();
  const controller = new InputPilotTrialController({
    definition,
    repository: new InputPilotWorkspaceRepository({
      definition,
      storage: storageHarness(),
      ownerId: 'strict-controller',
      wallNow: () => 10_000,
    }),
    runtimeFactory,
  });
  controller.open();
  controller.enroll({
    participantId: 'strict-controller-participant',
    device: definition.environment,
    eligibility: {
      priorArenaExperience: false,
      priorOtherVariantExposure: false,
    },
  });
  return controller;
}

function automatedMetrics() {
  return Object.freeze({
    trialDurationMs: 1_000,
    firstEffectiveMovementMs: 200,
    firstCorrectContextActionMs: 500,
    groundJump: INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED,
    airJump: INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED,
    downSmash: INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED,
  });
}

function reviewSubmission(invalidate: unknown = false) {
  return {
    observer: {
      intentMismatchCount: 0,
      accidentalInputCount: 0,
      repeatedInputCount: 0,
      abandonedInputCount: 0,
      correctionCount: 0,
      oneHandCompleted: true,
      objectiveCompleted: true,
    },
    selfReport: {
      groundAction: INPUT_PILOT_COMPREHENSION.CORRECT,
      airAction: INPUT_PILOT_COMPREHENSION.NOT_ANSWERED,
      equipmentAction: INPUT_PILOT_COMPREHENSION.PARTIAL,
    },
    invalidate,
  };
}

describe('InputPilotTrialController strict lifecycle', () => {
  it('retains runtime and workspace ownership when destroy fails, then retries in dependency order', async () => {
    let destroyAttempts = 0;
    let failDestroy = true;
    const controller = createController(() => ({
      start() {},
      setPaused() {},
      getStatus: () => ({ state: INPUT_PILOT_RUNTIME_STATE.RUNNING, timedOut: false }),
      finalizeMetrics: automatedMetrics,
      destroy() {
        destroyAttempts += 1;
        if (failDestroy) throw new Error('runtime cleanup failed');
      },
    }));
    await controller.startTrial();

    expect(() => controller.destroy()).toThrow(/清理未完整/);
    expect(controller.state).toBe(INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED);
    expect(controller.getSnapshot().workspace?.activeTrial).not.toBeNull();
    expect(destroyAttempts).toBe(1);

    failDestroy = false;
    controller.destroy();
    expect(destroyAttempts).toBe(2);
    expect(controller.state).toBe(INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED);
  });

  it('fails closed on post-commit runtime cleanup and preserves the reviewing checkpoint', async () => {
    const runtimeControl: {
      signals: RuntimeSignals | null;
      finish: (() => void) | null;
      failDestroy: boolean;
    } = { signals: null, finish: null, failDestroy: true };
    const controller = createController((value) => {
      runtimeControl.signals = value as RuntimeSignals;
      let state: string = INPUT_PILOT_RUNTIME_STATE.CREATED;
      runtimeControl.finish = () => {
        state = INPUT_PILOT_RUNTIME_STATE.RESULT;
      };
      return {
        start() {
          state = INPUT_PILOT_RUNTIME_STATE.RUNNING;
        },
        setPaused() {},
        getStatus: () => ({ state, timedOut: false }),
        finalizeMetrics: automatedMetrics,
        destroy() {
          if (runtimeControl.failDestroy) throw new Error('post-commit cleanup failed');
        },
      };
    });
    await controller.startTrial();
    const { signals, finish } = runtimeControl;
    if (signals === null || finish === null) throw new Error('runtime signals 缺失。');
    finish();

    expect(signals.onProgress()).toBe(false);
    expect(controller.state).toBe(INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED);
    expect(controller.getSnapshot().workspace?.activeTrial?.phase).toBe('reviewing');

    runtimeControl.failDestroy = false;
    controller.destroy();
    expect(controller.state).toBe(INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED);
  });

  it('preserves a pause requested before the asynchronous runtime exists', async () => {
    const startControl: { release: (() => void) | null } = { release: null };
    const pauseCalls: boolean[] = [];
    const controller = createController(() => {
      let state: string = INPUT_PILOT_RUNTIME_STATE.CREATED;
      return {
        start() {
          state = INPUT_PILOT_RUNTIME_STATE.STARTING;
          return new Promise<void>((resolve) => {
            startControl.release = () => {
              state = INPUT_PILOT_RUNTIME_STATE.RUNNING;
              resolve();
            };
          });
        },
        setPaused(value: unknown) {
          if (typeof value !== 'boolean') throw new TypeError('paused');
          pauseCalls.push(value);
        },
        getStatus: () => ({ state, timedOut: false }),
        finalizeMetrics: automatedMetrics,
        destroy() {},
      };
    });

    const starting = controller.startTrial();
    expect(controller.setPaused(true)).toBe(true);
    await Promise.resolve();
    const releaseStart = startControl.release;
    if (releaseStart === null) throw new Error('runtime start 未创建。');
    releaseStart();
    await starting;
    expect(pauseCalls.at(-1)).toBe(true);
    controller.destroy();
  });

  it('normalizes review identity strictly and never folds non-booleans into terminal retries', async () => {
    const runtimeControl: {
      signals: RuntimeSignals | null;
      finish: (() => void) | null;
    } = { signals: null, finish: null };
    const controller = createController((value) => {
      runtimeControl.signals = value as RuntimeSignals;
      let state: string = INPUT_PILOT_RUNTIME_STATE.CREATED;
      runtimeControl.finish = () => {
        state = INPUT_PILOT_RUNTIME_STATE.RESULT;
      };
      return {
        start() {
          state = INPUT_PILOT_RUNTIME_STATE.RUNNING;
        },
        setPaused() {},
        getStatus: () => ({ state, timedOut: false }),
        finalizeMetrics: automatedMetrics,
        destroy() {},
      };
    });
    await controller.startTrial();
    const { signals, finish } = runtimeControl;
    if (signals === null || finish === null) throw new Error('runtime signals 缺失。');
    finish();
    signals.onProgress();
    const accepted = reviewSubmission(false);
    controller.submitReview(accepted);
    expect(() => controller.submitReview(reviewSubmission(0))).toThrow(/必须是布尔值/);
    expect(controller.submitReview(accepted)).toBe(controller.getSnapshot().lastRecord);
    controller.destroy();
  });

  it('rejects constructor option accessors without executing them', () => {
    let reads = 0;
    const options = {};
    Object.defineProperty(options, 'definition', {
      enumerable: true,
      get() {
        reads += 1;
        return createArenaInputPilotV1Definition();
      },
    });
    expect(() => new InputPilotTrialController(options)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });
});
