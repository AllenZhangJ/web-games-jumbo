import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaInputPilotV1Definition } from '../../../src/arena/presentation/pilot/arena-input-pilot-v1.js';
import {
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_STATUS,
} from '../../../src/arena/presentation/pilot/input-pilot-record.js';
import {
  INPUT_PILOT_RUNTIME_STATE,
} from '../../../src/arena/presentation/pilot/input-pilot-trial-runtime-port.js';
import {
  INPUT_PILOT_TRIAL_CONTROLLER_STATE,
  InputPilotTrialController,
} from '../../../src/arena/presentation/pilot/input-pilot-trial-controller.js';
import { InputPilotWorkspaceRepository } from '../../../src/arena/presentation/pilot/input-pilot-workspace-repository.js';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function storageHarness() {
  const values = new Map();
  const writeFailures = new Set();
  return {
    values,
    writeFailures,
    port: {
      storageRead(key) {
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key, value) {
        if (writeFailures.has(key)) return false;
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key) {
        values.delete(key);
        return true;
      },
    },
  };
}

function automated() {
  return Object.freeze({
    trialDurationMs: 2_000,
    firstEffectiveMovementMs: 300,
    firstCorrectContextActionMs: 900,
    groundJump: INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED,
    airJump: INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED,
    downSmash: INPUT_PILOT_ACTION_OUTCOME.FAILED,
  });
}

function observer() {
  return Object.freeze({
    intentMismatchCount: 0,
    accidentalInputCount: 0,
    repeatedInputCount: 0,
    abandonedInputCount: 0,
    correctionCount: 1,
    oneHandCompleted: true,
    objectiveCompleted: true,
  });
}

function selfReport() {
  return Object.freeze({
    groundAction: INPUT_PILOT_COMPREHENSION.CORRECT,
    airAction: INPUT_PILOT_COMPREHENSION.NOT_ANSWERED,
    equipmentAction: INPUT_PILOT_COMPREHENSION.PARTIAL,
  });
}

function eligibility() {
  return Object.freeze({
    priorArenaExperience: false,
    priorOtherVariantExposure: false,
  });
}

function createRepository(definition, harness, ownerId) {
  return new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId,
    wallNow: () => 10_000,
  });
}

function runtimeFactoryHarness({ startError = null, finalizeError = null, deferred = null } = {}) {
  const instances = [];
  const factory = (signals) => {
    let state = INPUT_PILOT_RUNTIME_STATE.CREATED;
    let timedOut = false;
    let destroyed = false;
    let destroyCount = 0;
    const runtime = {
      signals,
      start() {
        state = INPUT_PILOT_RUNTIME_STATE.STARTING;
        if (startError) throw startError;
        if (deferred) {
          return deferred.promise.then(() => {
            if (!destroyed) state = INPUT_PILOT_RUNTIME_STATE.RUNNING;
          });
        }
        state = INPUT_PILOT_RUNTIME_STATE.RUNNING;
        return undefined;
      },
      setPaused() {},
      getStatus() {
        return { state, timedOut };
      },
      finalizeMetrics() {
        if (finalizeError) throw finalizeError;
        return automated();
      },
      destroy() {
        destroyCount += 1;
        destroyed = true;
        state = INPUT_PILOT_RUNTIME_STATE.DESTROYED;
      },
      finish(reviewDraft = null) {
        state = INPUT_PILOT_RUNTIME_STATE.RESULT;
        return signals.onProgress(reviewDraft);
      },
      timeout(reviewDraft = null) {
        timedOut = true;
        return signals.onProgress(reviewDraft);
      },
      fail(error = new Error('runtime failed')) {
        state = INPUT_PILOT_RUNTIME_STATE.FAILED;
        return signals.onFailure(error);
      },
      get destroyCount() { return destroyCount; },
      get destroyed() { return destroyed; },
    };
    instances.push(runtime);
    return runtime;
  };
  return { factory, instances };
}

function deferredPromise() {
  let resolve;
  let reject;
  const promise = new Promise((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return { promise, resolve, reject };
}

function createController({ definition, harness, ownerId, runtimeFactory }) {
  return new InputPilotTrialController({
    definition,
    repository: createRepository(definition, harness, ownerId),
    runtimeFactory,
  });
}

test('trial controller atomically enrolls, runs, reviews and commits one terminal record', async () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const runtimes = runtimeFactoryHarness();
  const controller = createController({
    definition,
    harness,
    ownerId: 'full-flow',
    runtimeFactory: runtimes.factory,
  });

  assert.equal(controller.open().state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.IDLE);
  const enrolled = controller.enroll({
    participantId: 'pilot-0001',
    device: definition.environment,
    eligibility: eligibility(),
  });
  assert.equal(enrolled.assignment.enrollmentIndex, 0);
  assert.equal(controller.getSnapshot().workspace.revision, 1);
  await controller.startTrial();
  assert.equal(controller.state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING);
  assert.equal(runtimes.instances[0].signals.matchSeed, enrolled.assignment.matchSeed);
  assert.equal(runtimes.instances[0].signals.mapperId, enrolled.assignment.mapperId);
  assert.equal(controller.getSnapshot().workspace.revision, 2);

  assert.equal(runtimes.instances[0].finish(), true);
  assert.equal(controller.state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING);
  assert.equal(runtimes.instances[0].destroyCount, 1);
  assert.equal(controller.getSnapshot().workspace.revision, 3);

  const form = { observer: observer(), selfReport: selfReport() };
  const record = controller.submitReview(form);
  assert.equal(record.trialStatus, INPUT_PILOT_TRIAL_STATUS.COMPLETED);
  assert.equal(record.terminationReason, INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED);
  assert.equal(controller.getSnapshot().workspace.revision, 4);
  assert.equal(controller.submitReview(form), record);
  assert.throws(() => controller.submitReview({
    observer: { ...observer(), correctionCount: 2 },
    selfReport: selfReport(),
  }), /重复提交内容不一致/);

  const aggregate = controller.exportAggregateBundle();
  assert.doesNotMatch(JSON.stringify(aggregate), /pilot-0001/);
  const audit = controller.exportAuditBundle();
  assert.equal(audit.records[0].assignment.participantId, 'pilot-0001');
  assert.equal(audit.recordCount, 1);

  const next = controller.enroll({
    participantId: 'pilot-0002',
    device: definition.environment,
    eligibility: eligibility(),
  });
  assert.equal(next.assignment.enrollmentIndex, 1);
  controller.destroy();
});

test('running recovery creates an auditable invalidation without fabricated evidence', async () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const firstRuntimes = runtimeFactoryHarness();
  const first = createController({
    definition,
    harness,
    ownerId: 'recovery-a',
    runtimeFactory: firstRuntimes.factory,
  });
  first.open();
  first.enroll({
    participantId: 'pilot-recovery',
    device: definition.environment,
    eligibility: eligibility(),
  });
  await first.startTrial();
  first.destroy();

  const second = createController({
    definition,
    harness,
    ownerId: 'recovery-b',
    runtimeFactory: runtimeFactoryHarness().factory,
  });
  const recovered = second.open();
  assert.equal(recovered.state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL);
  assert.equal(recovered.lastRecord.trialStatus, INPUT_PILOT_TRIAL_STATUS.INVALIDATED);
  assert.equal(
    recovered.lastRecord.terminationReason,
    INPUT_PILOT_TERMINATION_REASON.RUNNING_RECOVERED,
  );
  assert.equal(recovered.lastRecord.automated, null);
  assert.equal(recovered.lastRecord.observer, null);
  assert.equal(recovered.lastRecord.selfReport, null);
  assert.equal(recovered.workspace.activeTrial, null);
  second.destroy();
});

test('reviewing checkpoint survives reload and can be submitted once', async () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const runtimes = runtimeFactoryHarness();
  const first = createController({
    definition,
    harness,
    ownerId: 'review-a',
    runtimeFactory: runtimes.factory,
  });
  first.open();
  first.enroll({
    participantId: 'pilot-review',
    device: definition.environment,
    eligibility: eligibility(),
  });
  await first.startTrial();
  const preservedDraft = {
    observer: { ...observer(), correctionCount: 3 },
    selfReport: selfReport(),
    invalidate: false,
  };
  runtimes.instances[0].timeout(preservedDraft);
  assert.equal(first.state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING);
  first.saveReviewDraft({
    ...preservedDraft,
    observer: { ...preservedDraft.observer, repeatedInputCount: 2 },
  });
  first.destroy();

  const second = createController({
    definition,
    harness,
    ownerId: 'review-b',
    runtimeFactory: runtimeFactoryHarness().factory,
  });
  assert.equal(second.open().state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING);
  assert.equal(
    second.getSnapshot().workspace.activeTrial.reviewDraft.observer.correctionCount,
    3,
  );
  assert.equal(
    second.getSnapshot().workspace.activeTrial.reviewDraft.observer.repeatedInputCount,
    2,
  );
  const record = second.submitReview();
  assert.equal(record.trialStatus, INPUT_PILOT_TRIAL_STATUS.ABANDONED);
  assert.equal(
    record.terminationReason,
    INPUT_PILOT_TERMINATION_REASON.MAXIMUM_DURATION_REACHED,
  );
  assert.equal(record.observer.repeatedInputCount, 2);
  second.destroy();
});

test('runtime startup failure becomes a single invalidated terminal record', async () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const runtimes = runtimeFactoryHarness({
    startError: new Error('asset load failed'),
    finalizeError: new Error('no committed step'),
  });
  const controller = createController({
    definition,
    harness,
    ownerId: 'start-failure',
    runtimeFactory: runtimes.factory,
  });
  controller.open();
  controller.enroll({
    participantId: 'pilot-start-failure',
    device: definition.environment,
    eligibility: eligibility(),
  });
  await assert.rejects(controller.startTrial(), /asset load failed/);
  assert.equal(controller.state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL);
  assert.equal(controller.getSnapshot().workspace.records.length, 1);
  assert.equal(
    controller.getSnapshot().lastRecord.terminationReason,
    INPUT_PILOT_TERMINATION_REASON.RUNTIME_FAILED,
  );
  assert.equal(controller.getSnapshot().lastRecord.automated, null);
  assert.equal(runtimes.instances[0].destroyCount, 1);
  controller.destroy();
});

test('failed review CAS closes the runtime and leaves a recoverable running checkpoint', async () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const runtimes = runtimeFactoryHarness();
  const controller = createController({
    definition,
    harness,
    ownerId: 'cas-failure-a',
    runtimeFactory: runtimes.factory,
  });
  controller.open();
  controller.enroll({
    participantId: 'pilot-cas-failure',
    device: definition.environment,
    eligibility: eligibility(),
  });
  await controller.startTrial();
  const keys = createRepository(definition, harness, 'key-reader').getStorageKeys();
  harness.writeFailures.add(keys.slotA);
  assert.equal(runtimes.instances[0].finish(), false);
  assert.equal(controller.state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED);
  assert.equal(runtimes.instances[0].destroyed, true);

  harness.writeFailures.clear();
  const recovered = createController({
    definition,
    harness,
    ownerId: 'cas-failure-b',
    runtimeFactory: runtimeFactoryHarness().factory,
  });
  assert.equal(recovered.open().state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL);
  assert.equal(
    recovered.getSnapshot().lastRecord.terminationReason,
    INPUT_PILOT_TERMINATION_REASON.RUNNING_RECOVERED,
  );
  recovered.destroy();
});

test('destroy during async startup prevents late completion from reviving the controller', async () => {
  const definition = createArenaInputPilotV1Definition();
  const harness = storageHarness();
  const pending = deferredPromise();
  const runtimes = runtimeFactoryHarness({ deferred: pending });
  const controller = createController({
    definition,
    harness,
    ownerId: 'async-destroy',
    runtimeFactory: runtimes.factory,
  });
  controller.open();
  controller.enroll({
    participantId: 'pilot-async-destroy',
    device: definition.environment,
    eligibility: eligibility(),
  });
  const starting = controller.startTrial();
  await Promise.resolve();
  controller.destroy();
  pending.resolve();
  await assert.rejects(starting, /启动已取消/);
  assert.equal(controller.state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED);
  assert.equal(runtimes.instances[0].destroyCount, 1);
});
