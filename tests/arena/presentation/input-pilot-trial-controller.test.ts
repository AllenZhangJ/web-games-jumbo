import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaInputPilotV1Definition } from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_STATUS,
} from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_RUNTIME_STATE,
  INPUT_PILOT_TRIAL_CONTROLLER_STATE,
  InputPilotTrialController,
  type InputPilotRuntimeFactory,
  type InputPilotRuntimeState,
} from '@number-strategy-jump/arena-input-pilot';
import { InputPilotWorkspaceRepository } from '@number-strategy-jump/arena-input-pilot';

type PilotDefinition = ReturnType<typeof createArenaInputPilotV1Definition>;

interface StorageHarness {
  readonly values: Map<string, unknown>;
  readonly writeFailures: Set<string>;
  readonly port: {
    storageRead(key: string): unknown;
    storageWrite(key: string, value: unknown): boolean;
    storageDelete(key: string): boolean;
  };
}

interface RuntimeSignals {
  readonly matchSeed: number;
  readonly mapperId: string;
  readonly onProgress: (reviewDraft: unknown) => unknown;
  readonly onFailure: (error: unknown) => unknown;
}

interface DeferredPromise {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: (reason?: unknown) => void;
}

interface RuntimeHarness {
  readonly signals: RuntimeSignals;
  start(): Promise<void> | undefined;
  setPaused(): void;
  getStatus(): Readonly<{ state: InputPilotRuntimeState; timedOut: boolean }>;
  finalizeMetrics(): ReturnType<typeof automated>;
  destroy(): void;
  finish(reviewDraft?: unknown): unknown;
  timeout(reviewDraft?: unknown): unknown;
  fail(error?: Error): unknown;
  readonly destroyCount: number;
  readonly destroyed: boolean;
}

function required<T>(value: T | null | undefined, name: string): T {
  assert.ok(value != null, `${name} 不存在。`);
  return value;
}

function record(value: unknown, name: string): Readonly<Record<string, unknown>> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} 必须是对象。`);
  return value as Readonly<Record<string, unknown>>;
}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function storageHarness(): StorageHarness {
  const values = new Map<string, unknown>();
  const writeFailures = new Set<string>();
  return {
    values,
    writeFailures,
    port: {
      storageRead(key: string) {
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        if (writeFailures.has(key)) return false;
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key: string) {
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

function createRepository(
  definition: PilotDefinition,
  harness: StorageHarness,
  ownerId: string,
) {
  return new InputPilotWorkspaceRepository({
    definition,
    storage: harness.port,
    ownerId,
    wallNow: () => 10_000,
  });
}

function runtimeFactoryHarness({
  startError = null,
  finalizeError = null,
  deferred = null,
}: Readonly<{
  startError?: Error | null;
  finalizeError?: Error | null;
  deferred?: DeferredPromise | null;
}> = {}) {
  const instances: RuntimeHarness[] = [];
  const factory: InputPilotRuntimeFactory = (signalsValue: unknown) => {
    const signals = signalsValue as RuntimeSignals;
    let state: InputPilotRuntimeState = INPUT_PILOT_RUNTIME_STATE.CREATED;
    let timedOut = false;
    let destroyed = false;
    let destroyCount = 0;
    const runtime: RuntimeHarness = {
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
      finish(reviewDraft: unknown = null) {
        state = INPUT_PILOT_RUNTIME_STATE.RESULT;
        return signals.onProgress(reviewDraft);
      },
      timeout(reviewDraft: unknown = null) {
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

function deferredPromise(): DeferredPromise {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return { promise, resolve, reject };
}

function createController({
  definition,
  harness,
  ownerId,
  runtimeFactory,
}: Readonly<{
  definition: PilotDefinition;
  harness: StorageHarness;
  ownerId: string;
  runtimeFactory: InputPilotRuntimeFactory;
}>) {
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
  assert.equal(required(controller.getSnapshot().workspace, 'workspace').revision, 1);
  await controller.startTrial();
  assert.equal(controller.state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.RUNNING);
  const runtime = required(runtimes.instances[0], 'pilot runtime');
  assert.equal(runtime.signals.matchSeed, enrolled.assignment.matchSeed);
  assert.equal(runtime.signals.mapperId, enrolled.assignment.mapperId);
  assert.equal(required(controller.getSnapshot().workspace, 'workspace').revision, 2);

  assert.equal(runtime.finish(), true);
  assert.equal(controller.state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.REVIEWING);
  assert.equal(runtime.destroyCount, 1);
  assert.equal(required(controller.getSnapshot().workspace, 'workspace').revision, 3);

  const form = { observer: observer(), selfReport: selfReport() };
  const submittedRecord = controller.submitReview(form);
  assert.equal(submittedRecord.trialStatus, INPUT_PILOT_TRIAL_STATUS.COMPLETED);
  assert.equal(submittedRecord.terminationReason, INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED);
  assert.equal(required(controller.getSnapshot().workspace, 'workspace').revision, 4);
  assert.equal(controller.submitReview(form), submittedRecord);
  assert.throws(() => controller.submitReview({
    observer: { ...observer(), correctionCount: 2 },
    selfReport: selfReport(),
  }), /重复提交内容不一致/);

  const aggregate = controller.exportAggregateBundle();
  assert.doesNotMatch(JSON.stringify(aggregate), /pilot-0001/);
  const audit = record(controller.exportAuditBundle(), 'audit bundle');
  const auditRecords = audit.records;
  assert.ok(Array.isArray(auditRecords));
  const firstAuditRecord = record(auditRecords[0], 'first audit record');
  assert.equal(
    record(firstAuditRecord.assignment, 'audit assignment').participantId,
    'pilot-0001',
  );
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
  const recoveredRecord = required(recovered.lastRecord, 'recovered record');
  assert.equal(recovered.state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL);
  assert.equal(recoveredRecord.trialStatus, INPUT_PILOT_TRIAL_STATUS.INVALIDATED);
  assert.equal(
    recoveredRecord.terminationReason,
    INPUT_PILOT_TERMINATION_REASON.RUNNING_RECOVERED,
  );
  assert.equal(recoveredRecord.automated, null);
  assert.equal(recoveredRecord.observer, null);
  assert.equal(recoveredRecord.selfReport, null);
  assert.equal(required(recovered.workspace, 'recovered workspace').activeTrial, null);
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
  required(runtimes.instances[0], 'pilot runtime').timeout(preservedDraft);
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
  const reviewWorkspace = required(second.getSnapshot().workspace, 'review workspace');
  const activeTrial = required(reviewWorkspace.activeTrial, 'active trial');
  const reviewDraft = required(activeTrial.reviewDraft, 'review draft');
  const reviewObserver = required(reviewDraft.observer, 'review observer');
  assert.equal(
    reviewObserver.correctionCount,
    3,
  );
  assert.equal(
    reviewObserver.repeatedInputCount,
    2,
  );
  const record = second.submitReview();
  assert.equal(record.trialStatus, INPUT_PILOT_TRIAL_STATUS.ABANDONED);
  assert.equal(
    record.terminationReason,
    INPUT_PILOT_TERMINATION_REASON.MAXIMUM_DURATION_REACHED,
  );
  assert.equal(required(record.observer, 'record observer').repeatedInputCount, 2);
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
  assert.equal(required(controller.getSnapshot().workspace, 'workspace').records.length, 1);
  assert.equal(
    required(controller.getSnapshot().lastRecord, 'last record').terminationReason,
    INPUT_PILOT_TERMINATION_REASON.RUNTIME_FAILED,
  );
  assert.equal(required(controller.getSnapshot().lastRecord, 'last record').automated, null);
  assert.equal(required(runtimes.instances[0], 'pilot runtime').destroyCount, 1);
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
  const runtime = required(runtimes.instances[0], 'pilot runtime');
  assert.equal(runtime.finish(), false);
  assert.equal(controller.state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.FAILED);
  assert.equal(runtime.destroyed, true);

  harness.writeFailures.clear();
  const recovered = createController({
    definition,
    harness,
    ownerId: 'cas-failure-b',
    runtimeFactory: runtimeFactoryHarness().factory,
  });
  assert.equal(recovered.open().state, INPUT_PILOT_TRIAL_CONTROLLER_STATE.TERMINAL);
  assert.equal(
    required(recovered.getSnapshot().lastRecord, 'last record').terminationReason,
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
  assert.equal(required(runtimes.instances[0], 'pilot runtime').destroyCount, 1);
});
