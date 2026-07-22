import { describe, expect, it } from 'vitest';
import {
  ARENA_INPUT_PILOT_VARIANT_ID,
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_EXCLUSION_REASON,
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_CONTROLLER_STATE,
  INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
  INPUT_PILOT_TRIAL_PHASE,
  INPUT_PILOT_TRIAL_STATUS,
  InputPilotAssignedMatchService,
  InputPilotEnrollmentLedger,
  InputPilotWorkspaceCoordinator,
  InputPilotRegistry,
  InputPilotFormModel,
  createArenaInputPilotV1Definition,
  advanceInputPilotWorkspace,
  createEnrolledInputPilotTrial,
  createInputPilotAssignment,
  createInputPilotDefinition,
  createInputPilotRecord,
  createInputPilotReviewDraft,
  createInputPilotTrialCheckpoint,
  createInputPilotWorkspace,
  reviewInputPilotTrial,
  startInputPilotTrial,
  submitInputPilotTrialReview,
  validateInputPilotRuntime,
  validateInputPilotRuntimeStatus,
} from '../src/index.js';

const VOCABULARIES = [
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_EXCLUSION_REASON,
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_CONTROLLER_STATE,
  INPUT_PILOT_TRIAL_STATUS,
] as const;

describe('Input Pilot strict vocabulary', () => {
  it('publishes immutable and unique wire values', () => {
    expect(VOCABULARIES.every((vocabulary) => Object.isFrozen(vocabulary))).toBe(true);
    for (const vocabulary of VOCABULARIES) {
      const values = Object.values(vocabulary);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('keeps lifecycle and evidence terminal values explicit', () => {
    expect(INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED).toBe('destroyed');
    expect(INPUT_PILOT_TERMINATION_REASON.RUNTIME_FAILED).toBe('runtime-failed');
    expect(INPUT_PILOT_TRIAL_STATUS.INVALIDATED).toBe('invalidated');
    expect(INPUT_PILOT_EXCLUSION_REASON.INPUT_MODE_MISMATCH).toBe('input-mode-mismatch');
  });
});

describe('Input Pilot strict record and review form', () => {
  it('restores form drafts atomically and keeps bounded counters', () => {
    const model = new InputPilotFormModel();
    model.adjustCounter('correctionCount', 4);
    const before = model.getSnapshot();
    expect(() => model.restore({
      observer: { ...before.observer, correctionCount: 1000 },
      selfReport: before.selfReport,
    })).toThrow(/0～999/);
    expect(model.getSnapshot()).toEqual(before);
    expect(createInputPilotReviewDraft({
      observer: before.observer,
      selfReport: before.selfReport,
      invalidate: false,
    }).observer.correctionCount).toBe(4);
  });

  it('rejects record and review accessors without executing them', () => {
    let reads = 0;
    const record = {};
    Object.defineProperty(record, 'schemaVersion', {
      enumerable: true,
      get() {
        reads += 1;
        return 2;
      },
    });
    expect(() => createInputPilotRecord(createArenaInputPilotV1Definition(), record)).toThrow(/数据字段/);
    const review = { observer: {}, selfReport: {} };
    Object.defineProperty(review, 'invalidate', {
      enumerable: true,
      get() {
        reads += 1;
        return false;
      },
    });
    expect(() => createInputPilotReviewDraft(review)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });
});

describe('Input Pilot strict definition and assignment', () => {
  it('publishes one immutable V1 definition and deterministic balanced blocks', () => {
    const definition = createArenaInputPilotV1Definition();
    const registry = new InputPilotRegistry([definition]);
    const assignments = [0, 1, 2, 3].map((enrollmentIndex) => createInputPilotAssignment({
      definition,
      participantId: `participant-${enrollmentIndex}`,
      enrollmentIndex,
    }));
    expect(registry.require(definition.id)).toBe(definition);
    expect(registry.list()).toEqual([definition]);
    expect(Object.isFrozen(definition)).toBe(true);
    for (let index = 0; index < assignments.length; index += 2) {
      expect(new Set(assignments.slice(index, index + 2).map(({ variantId }) => variantId))).toEqual(
        new Set(Object.values(ARENA_INPUT_PILOT_VARIANT_ID)),
      );
    }
  });

  it('rejects definition and assignment accessors without executing them', () => {
    let reads = 0;
    const definitionValue = createArenaInputPilotV1Definition().toJSON();
    Object.defineProperty(definitionValue, 'assignmentSeed', {
      enumerable: true,
      get() {
        reads += 1;
        return 1;
      },
    });
    expect(() => createInputPilotDefinition(definitionValue)).toThrow(/数据字段/);

    const assignmentOptions = {
      participantId: 'participant',
      enrollmentIndex: 0,
    };
    Object.defineProperty(assignmentOptions, 'definition', {
      enumerable: true,
      get() {
        reads += 1;
        return createArenaInputPilotV1Definition();
      },
    });
    expect(() => createInputPilotAssignment(assignmentOptions)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });
});

describe('Input Pilot strict runtime ports', () => {
  it('rejects runtime and status accessors without executing them', () => {
    let reads = 0;
    const runtime = {
      setPaused() {},
      getStatus() {},
      finalizeMetrics() {},
      destroy() {},
    };
    Object.defineProperty(runtime, 'start', {
      get() {
        reads += 1;
        return () => {};
      },
    });
    expect(() => validateInputPilotRuntime(runtime)).toThrow(/数据方法/);

    const status = { timedOut: false };
    Object.defineProperty(status, 'state', {
      enumerable: true,
      get() {
        reads += 1;
        return 'running';
      },
    });
    expect(() => validateInputPilotRuntimeStatus(status)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });

  it('distinguishes an absent optional destroy method from an invalid accessor', () => {
    const withoutDestroy = new InputPilotAssignedMatchService({
      matchService: { create: (options: unknown) => options },
      matchSeed: 7,
    });
    expect(withoutDestroy.create({})).toEqual({ matchSeed: 7 });
    expect(() => withoutDestroy.destroy()).not.toThrow();

    let reads = 0;
    const invalidService = { create: () => ({}) };
    Object.defineProperty(invalidService, 'destroy', {
      get() {
        reads += 1;
        return () => {};
      },
    });
    expect(() => new InputPilotAssignedMatchService({
      matchService: invalidService,
      matchSeed: 7,
    })).toThrow(/数据方法/);
    expect(reads).toBe(0);
  });

  it('rejects match option accessors atomically and remains retryable', () => {
    const createdOptions: unknown[] = [];
    const service = new InputPilotAssignedMatchService({
      matchService: { create: (options: unknown) => createdOptions.push(options) },
      matchSeed: 19,
    });
    let reads = 0;
    const invalidOptions = {};
    Object.defineProperty(invalidOptions, 'modeId', {
      enumerable: true,
      get() {
        reads += 1;
        return 'arena-v1';
      },
    });
    expect(() => service.create(invalidOptions)).toThrow(/数据字段/);
    expect(reads).toBe(0);
    expect(service.create({ modeId: 'arena-v1' })).toBe(1);
    expect(createdOptions).toEqual([{ modeId: 'arena-v1', matchSeed: 19 }]);
  });
});

describe('Input Pilot strict enrollment and checkpoint', () => {
  it('rejects ledger option and enrollment accessors without executing them', () => {
    const definition = createArenaInputPilotV1Definition();
    let reads = 0;
    const invalidOptions = { definition, persist: () => true };
    Object.defineProperty(invalidOptions, 'initialState', {
      enumerable: true,
      get() {
        reads += 1;
        return null;
      },
    });
    expect(() => new InputPilotEnrollmentLedger(invalidOptions)).toThrow(/数据字段/);

    const ledger = new InputPilotEnrollmentLedger({ definition, persist: () => true });
    const invalidEnrollment = { enrollmentIndex: 0 };
    Object.defineProperty(invalidEnrollment, 'participantId', {
      enumerable: true,
      get() {
        reads += 1;
        return 'participant';
      },
    });
    expect(() => ledger.enroll(invalidEnrollment)).toThrow(/数据字段/);
    expect(ledger.getSnapshot().revision).toBe(0);
    expect(reads).toBe(0);
    ledger.destroy();
  });

  it('rejects foreign then accessors atomically and permits an exact retry', () => {
    const definition = createArenaInputPilotV1Definition();
    let asyncResult = true;
    let reads = 0;
    const invalidResult = {};
    Object.defineProperty(invalidResult, 'then', {
      get() {
        reads += 1;
        return () => {};
      },
    });
    const ledger = new InputPilotEnrollmentLedger({
      definition,
      persist: () => asyncResult ? invalidResult : true,
    });
    expect(() => ledger.enroll({ participantId: 'participant', enrollmentIndex: 0 }))
      .toThrow(/访问器 thenable/);
    expect(ledger.getSnapshot().revision).toBe(0);
    expect(reads).toBe(0);
    asyncResult = false;
    expect(ledger.enroll({ participantId: 'participant', enrollmentIndex: 0 }).enrollmentIndex)
      .toBe(0);
    ledger.destroy();
  });

  it('rejects checkpoint accessors before reading nested evidence', () => {
    const definition = createArenaInputPilotV1Definition();
    let reads = 0;
    const checkpoint = {
      schemaVersion: INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
      phase: INPUT_PILOT_TRIAL_PHASE.ENROLLED,
    };
    Object.defineProperty(checkpoint, 'trialId', {
      enumerable: true,
      get() {
        reads += 1;
        return 'trial';
      },
    });
    expect(() => createInputPilotTrialCheckpoint(definition, checkpoint)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });
});

describe('Input Pilot strict trial state and workspace', () => {
  it('rejects trial transition option accessors without executing them', () => {
    const definition = createArenaInputPilotV1Definition();
    const assignment = createInputPilotAssignment({
      definition,
      participantId: 'participant',
      enrollmentIndex: 0,
    });
    let reads = 0;
    const options = {
      device: definition.environment,
      eligibility: {
        priorArenaExperience: false,
        priorOtherVariantExposure: false,
      },
    };
    Object.defineProperty(options, 'assignment', {
      enumerable: true,
      get() {
        reads += 1;
        return assignment;
      },
    });
    expect(() => createEnrolledInputPilotTrial(definition, options)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });

  it('does not coerce a non-boolean review invalidation flag', () => {
    const definition = createArenaInputPilotV1Definition();
    const assignment = createInputPilotAssignment({
      definition,
      participantId: 'participant',
      enrollmentIndex: 0,
    });
    const enrolled = createEnrolledInputPilotTrial(definition, {
      assignment,
      device: definition.environment,
      eligibility: {
        priorArenaExperience: false,
        priorOtherVariantExposure: false,
      },
    });
    const reviewing = reviewInputPilotTrial(
      definition,
      startInputPilotTrial(definition, enrolled),
      {
        automated: {
          trialDurationMs: 100,
          firstEffectiveMovementMs: 20,
          firstCorrectContextActionMs: 40,
          groundJump: INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED,
          airJump: INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED,
          downSmash: INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED,
        },
        terminationReason: INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED,
      },
    );
    expect(() => submitInputPilotTrialReview(definition, reviewing, {
      observer: reviewing.reviewDraft?.observer,
      selfReport: reviewing.reviewDraft?.selfReport,
      invalidate: 1,
    })).toThrow(/布尔值/);
    expect(submitInputPilotTrialReview(definition, reviewing).trialStatus).toBe(
      INPUT_PILOT_TRIAL_STATUS.COMPLETED,
    );
  });

  it('rejects workspace update accessors without changing the current value', () => {
    const definition = createArenaInputPilotV1Definition();
    const current = createInputPilotWorkspace(definition);
    let reads = 0;
    const update = {};
    Object.defineProperty(update, 'records', {
      enumerable: true,
      get() {
        reads += 1;
        return [];
      },
    });
    expect(() => advanceInputPilotWorkspace(definition, current, update)).toThrow(/数据字段/);
    expect(current.revision).toBe(0);
    expect(reads).toBe(0);
  });
});

describe('Input Pilot strict workspace coordination', () => {
  it('rejects repository method accessors without executing them', () => {
    const definition = createArenaInputPilotV1Definition();
    let reads = 0;
    const repository = {
      getSnapshot() {},
      compareAndSet() {},
      renewLease() {},
      destroy() {},
    };
    Object.defineProperty(repository, 'open', {
      get() {
        reads += 1;
        return () => createInputPilotWorkspace(definition);
      },
    });
    expect(() => new InputPilotWorkspaceCoordinator({ definition, repository }))
      .toThrow(/数据方法/);
    expect(reads).toBe(0);
  });

  it('rejects CAS result accessors atomically and releases the commit guard for retry', () => {
    const definition = createArenaInputPilotV1Definition();
    let workspace = createInputPilotWorkspace(definition);
    let invalidResult = true;
    let reads = 0;
    const accessorResult = { reason: null, headUpdated: false };
    Object.defineProperty(accessorResult, 'committed', {
      enumerable: true,
      get() {
        reads += 1;
        return true;
      },
    });
    const repository = {
      open: () => workspace,
      getSnapshot: () => workspace,
      compareAndSet(next: unknown) {
        if (invalidResult) return accessorResult;
        workspace = createInputPilotWorkspace(definition, next);
        return { committed: true, reason: null, headUpdated: true };
      },
      renewLease: () => true,
      destroy() {},
    };
    const coordinator = new InputPilotWorkspaceCoordinator({ definition, repository });
    coordinator.open();
    const enrollment = {
      participantId: 'participant',
      device: definition.environment,
      eligibility: {
        priorArenaExperience: false,
        priorOtherVariantExposure: false,
      },
    };
    expect(() => coordinator.enroll(enrollment)).toThrow(/数据字段/);
    expect(workspace.revision).toBe(0);
    expect(reads).toBe(0);
    invalidResult = false;
    expect(coordinator.enroll(enrollment).assignment.participantId).toBe('participant');
    coordinator.destroy();
  });

  it('retains repository ownership when destroy fails and retries the same cleanup', () => {
    const definition = createArenaInputPilotV1Definition();
    const workspace = createInputPilotWorkspace(definition);
    let failDestroy = true;
    let destroys = 0;
    const coordinator = new InputPilotWorkspaceCoordinator({
      definition,
      repository: {
        open: () => workspace,
        getSnapshot: () => workspace,
        compareAndSet: () => ({ committed: false, reason: 'unused', headUpdated: false }),
        renewLease: () => true,
        destroy() {
          destroys += 1;
          if (failDestroy) throw new Error('cleanup failed');
        },
      },
    });
    coordinator.open();
    expect(() => coordinator.destroy()).toThrow(/cleanup failed/);
    expect(coordinator.getSnapshot()).toEqual(workspace);
    failDestroy = false;
    expect(() => coordinator.destroy()).not.toThrow();
    expect(destroys).toBe(2);
    expect(() => coordinator.getSnapshot()).toThrow(/已销毁/);
  });
});
