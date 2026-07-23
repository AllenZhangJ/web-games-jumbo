import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_INPUT_PILOT_VARIANT_ID,
  createArenaInputPilotV1Definition,
} from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION,
  createInputPilotAssignment,
  validateInputPilotAssignment,
} from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_DEFINITION_SCHEMA_VERSION,
  createInputPilotDefinition,
} from '@number-strategy-jump/arena-input-pilot';
import { InputPilotRegistry } from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_EXCLUSION_REASON,
  INPUT_PILOT_RECORD_SCHEMA_VERSION,
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_STATUS,
  createInputPilotRecord,
  getInputPilotRecordExclusionReasons,
} from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_ASSESSMENT_STATUS,
  createInputPilotReport,
} from '@number-strategy-jump/arena-input-pilot';

type PilotDefinition = ReturnType<typeof createArenaInputPilotV1Definition>;

interface RecordOptions {
  readonly participantId?: string;
  readonly success?: boolean;
  readonly trialStatus?: string;
  readonly terminationReason?: string;
  readonly platform?: string;
  readonly formFactor?: string;
  readonly orientation?: string;
  readonly inputMode?: string;
  readonly priorArenaExperience?: boolean;
  readonly priorOtherVariantExposure?: boolean;
  readonly intentMismatchCount?: number;
  readonly accidentalInputCount?: number;
  readonly oneHandCompleted?: boolean;
  readonly objectiveCompleted?: boolean;
}

function required<T>(value: T | null | undefined, name: string): T {
  assert.ok(value != null, `${name} 不存在。`);
  return value;
}

function assignment(
  definition: PilotDefinition,
  enrollmentIndex: number,
  participantId = `pilot-${enrollmentIndex}`,
) {
  return createInputPilotAssignment({
    definition,
    participantId,
    enrollmentIndex,
  });
}

function record(definition: PilotDefinition, enrollmentIndex: number, {
  participantId = `pilot-${enrollmentIndex}`,
  success = true,
  trialStatus = INPUT_PILOT_TRIAL_STATUS.COMPLETED,
  terminationReason = trialStatus === INPUT_PILOT_TRIAL_STATUS.COMPLETED
    ? INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED
    : trialStatus === INPUT_PILOT_TRIAL_STATUS.ABANDONED
      ? INPUT_PILOT_TERMINATION_REASON.PARTICIPANT_ABANDONED
      : INPUT_PILOT_TERMINATION_REASON.PROTOCOL_DEVIATION,
  platform = 'web',
  formFactor = 'phone',
  orientation = 'portrait',
  inputMode = 'touch',
  priorArenaExperience = false,
  priorOtherVariantExposure = false,
  intentMismatchCount = success ? 0 : 1,
  accidentalInputCount = success ? 0 : 1,
  oneHandCompleted = true,
  objectiveCompleted = success,
}: RecordOptions = {}) {
  return {
    schemaVersion: INPUT_PILOT_RECORD_SCHEMA_VERSION,
    trialId: `trial-${enrollmentIndex}`,
    assignment: assignment(definition, enrollmentIndex, participantId),
    trialStatus,
    terminationReason,
    device: { platform, formFactor, orientation, inputMode },
    eligibility: { priorArenaExperience, priorOtherVariantExposure },
    automated: {
      trialDurationMs: 20_000,
      firstEffectiveMovementMs: 1_500,
      firstCorrectContextActionMs: success ? 5_000 : 12_000,
      groundJump: INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED,
      airJump: success
        ? INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED
        : INPUT_PILOT_ACTION_OUTCOME.FAILED,
      downSmash: INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED,
    },
    observer: {
      intentMismatchCount,
      accidentalInputCount,
      repeatedInputCount: 0,
      abandonedInputCount: 0,
      correctionCount: success ? 0 : 1,
      oneHandCompleted,
      objectiveCompleted,
    },
    selfReport: {
      groundAction: INPUT_PILOT_COMPREHENSION.CORRECT,
      airAction: success
        ? INPUT_PILOT_COMPREHENSION.CORRECT
        : INPUT_PILOT_COMPREHENSION.PARTIAL,
      equipmentAction: INPUT_PILOT_COMPREHENSION.CORRECT,
    },
  };
}

function recordsByVariant(
  definition: PilotDefinition,
  profiles: Readonly<Record<string, (ordinal: number) => RecordOptions>>,
) {
  const ordinals = new Map(definition.variants.map(({ id }) => [id, 0]));
  return Array.from({ length: 10 }, (_, enrollmentIndex) => {
    const selected = assignment(definition, enrollmentIndex);
    const ordinal = required(ordinals.get(selected.variantId), 'variant ordinal');
    ordinals.set(selected.variantId, ordinal + 1);
    return record(
      definition,
      enrollmentIndex,
      required(profiles[selected.variantId], `profile ${selected.variantId}`)(ordinal),
    );
  });
}

test('InputPilotDefinition and Registry keep the A/B experiment immutable and versioned', () => {
  const definition = createArenaInputPilotV1Definition();
  assert.equal(definition.schemaVersion, INPUT_PILOT_DEFINITION_SCHEMA_VERSION);
  assert.equal(definition.variants.length, 2);
  assert.equal(definition.environment.platform, 'web');
  assert.equal(definition.assignmentSeed, 0x66060001);
  assert.equal(definition.thresholds.minimumEligibleSamplesPerVariant, 5);
  assert.equal(definition.thresholds.successWindowMs, 10_000);
  assert.equal(definition.thresholds.maximumTrialDurationMs, 180_000);
  assert.equal(definition.thresholds.effectiveMovementDistance, 0.05);
  assert.equal(definition.getContentHash(), createArenaInputPilotV1Definition().getContentHash());
  assert.throws(() => {
    Object.assign(required(definition.variants[0], 'first variant'), { id: 'changed' });
  }, /read only|只读|Cannot assign/i);

  const later = createInputPilotDefinition({
    ...definition.toJSON(),
    id: 'arena.input-mapper-pilot.v2',
  });
  const registry = new InputPilotRegistry([later, definition]);
  assert.equal(registry.size, 2);
  assert.deepEqual(registry.list().map(({ id }) => id), [definition.id, later.id]);
  assert.equal(registry.require(definition.id), definition);
  assert.throws(() => new InputPilotRegistry([definition, definition]), /重复 id/);
  assert.throws(() => createInputPilotDefinition({
    ...definition.toJSON(),
    variants: [required(definition.variants[0], 'first variant')],
  }), /恰好包含两个/);
  assert.throws(() => createInputPilotDefinition({
    ...definition.toJSON(),
    variants: [required(definition.variants[0], 'first variant'), {
      id: 'duplicate-mapper',
      mapperId: required(definition.variants[0], 'first variant').mapperId,
    }],
  }), /重复使用 mapper/);
  assert.throws(() => createInputPilotDefinition({
    ...definition.toJSON(),
    surprise: true,
  }), /不支持字段 surprise/);
  assert.throws(() => createInputPilotDefinition({
    ...definition.toJSON(),
    schemaVersion: 1,
  }), /不支持 InputPilotDefinition schema 1/);
  assert.throws(() => createInputPilotDefinition({
    ...definition.toJSON(),
    assignmentSeed: -1,
  }), /uint32/);
  assert.throws(() => createInputPilotDefinition({
    ...definition.toJSON(),
    thresholds: {
      ...definition.thresholds,
      maximumTrialDurationMs: 9_999,
    },
  }), /不能小于 successWindowMs/);
});

test('block assignment is reproducible, append-stable and balanced in every complete pair', () => {
  const definition = createArenaInputPilotV1Definition();
  const assignments = Array.from({ length: 20 }, (_, index) => assignment(definition, index));
  for (let index = 0; index < assignments.length; index += 2) {
    assert.equal(new Set(assignments.slice(index, index + 2).map(({ variantId }) => variantId)).size, 2);
    assert.equal(
      required(assignments[index], 'first block assignment').matchSeed,
      required(assignments[index + 1], 'second block assignment').matchSeed,
    );
    if (index > 0) assert.notEqual(
      required(assignments[index], 'current assignment').matchSeed,
      required(assignments[index - 1], 'previous assignment').matchSeed,
    );
  }
  assert.deepEqual(assignment(definition, 7), assignments[7]);
  assert.equal(
    assignment(definition, 7, 'different-pseudonym').variantId,
    required(assignments[7], 'eighth assignment').variantId,
  );
  assert.notEqual(
    assignment(definition, 7, 'different-pseudonym').assignmentId,
    required(assignments[7], 'eighth assignment').assignmentId,
  );
  assert.deepEqual(
    Array.from({ length: 20 }, (_, index) => assignment(definition, index)),
    assignments,
  );

  const tampered = {
    ...required(assignments[0], 'first assignment'),
    mapperId: required(assignments[1], 'second assignment').mapperId,
  };
  assert.throws(() => validateInputPilotAssignment(definition, tampered), /无法由分组合同复现/);
  assert.throws(() => validateInputPilotAssignment(definition, {
    ...required(assignments[0], 'first assignment'),
    assignmentSeed: 0x66060002,
  }), /无法由分组合同复现/);
  assert.throws(() => validateInputPilotAssignment(definition, {
    ...required(assignments[0], 'first assignment'),
    matchSeed: required(assignments[0], 'first assignment').matchSeed + 1,
  }), /无法由分组合同复现/);
  assert.throws(() => validateInputPilotAssignment(definition, {
    ...required(assignments[0], 'first assignment'),
    schemaVersion: 1,
  }), /不支持 InputPilotAssignment schema 1/);
  assert.equal(
    required(assignments[0], 'first assignment').schemaVersion,
    INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION,
  );
});

test('InputPilotRecord separates automated, observer and self-report evidence', () => {
  const definition = createArenaInputPilotV1Definition();
  const value = record(definition, 0);
  const normalized = createInputPilotRecord(definition, value);
  assert.equal(required(normalized.automated, 'automated evidence').firstEffectiveMovementMs, 1_500);
  assert.equal(required(normalized.observer, 'observer evidence').intentMismatchCount, 0);
  assert.equal(required(normalized.selfReport, 'self report').groundAction, INPUT_PILOT_COMPREHENSION.CORRECT);
  assert.deepEqual(getInputPilotRecordExclusionReasons(definition, normalized), []);

  assert.throws(() => createInputPilotRecord(definition, {
    ...value,
    automated: { ...value.automated, firstEffectiveMovementMs: 20_001 },
  }), /不能超过 trialDurationMs/);
  assert.throws(() => createInputPilotRecord(definition, {
    ...value,
    automated: {
      ...value.automated,
      trialDurationMs: 180_001,
      firstEffectiveMovementMs: null,
      firstCorrectContextActionMs: null,
    },
  }), /不能超过试验最大时长/);
  assert.throws(() => createInputPilotRecord(definition, {
    ...value,
    observer: { ...value.observer, hiddenDifficulty: 'hard' },
  }), /不支持字段 hiddenDifficulty/);
  assert.throws(() => createInputPilotRecord(definition, {
    ...value,
    assignment: { ...value.assignment, variantId: 'tampered' },
  }), /无法由分组合同复现/);

  const excluded = createInputPilotRecord(definition, record(definition, 1, {
    trialStatus: INPUT_PILOT_TRIAL_STATUS.INVALIDATED,
    platform: 'wechat',
    priorArenaExperience: true,
    priorOtherVariantExposure: true,
  }));
  assert.deepEqual(getInputPilotRecordExclusionReasons(definition, excluded), [
    INPUT_PILOT_EXCLUSION_REASON.INVALIDATED,
    INPUT_PILOT_EXCLUSION_REASON.PRIOR_ARENA_EXPERIENCE,
    INPUT_PILOT_EXCLUSION_REASON.PRIOR_OTHER_VARIANT_EXPOSURE,
    INPUT_PILOT_EXCLUSION_REASON.PLATFORM_MISMATCH,
  ]);

  const recovered = createInputPilotRecord(definition, {
    ...record(definition, 2, {
      trialStatus: INPUT_PILOT_TRIAL_STATUS.INVALIDATED,
      terminationReason: INPUT_PILOT_TERMINATION_REASON.RUNNING_RECOVERED,
    }),
    automated: null,
    observer: null,
    selfReport: null,
  });
  assert.equal(recovered.automated, null);
  assert.throws(() => createInputPilotRecord(definition, {
    ...recovered,
    observer: value.observer,
  }), /同时存在或同时缺失/);
  assert.throws(() => createInputPilotRecord(definition, {
    ...value,
    automated: null,
  }), /必须包含完整三类证据/);
  assert.throws(() => createInputPilotRecord(definition, {
    ...value,
    terminationReason: INPUT_PILOT_TERMINATION_REASON.RUNTIME_FAILED,
  }), /与 completed 不一致/);
});

test('pilot report recommends only an evidence-aligned candidate and hides participant ids', () => {
  const definition = createArenaInputPilotV1Definition();
  const values = recordsByVariant(definition, {
    [ARENA_INPUT_PILOT_VARIANT_ID.GESTURE_MOBILITY]: () => ({
      success: true,
      intentMismatchCount: 0,
      accidentalInputCount: 0,
    }),
    [ARENA_INPUT_PILOT_VARIANT_ID.CONTEXT_PRIMARY]: (ordinal: number) => ({
      success: ordinal < 4,
      intentMismatchCount: 1,
      accidentalInputCount: 1,
    }),
  });
  const report = createInputPilotReport(definition, values);
  assert.equal(report.assessment.status, INPUT_PILOT_ASSESSMENT_STATUS.CANDIDATE_WINNER);
  assert.equal(report.assignmentSeed, definition.assignmentSeed);
  assert.equal(
    report.assessment.candidateVariantId,
    ARENA_INPUT_PILOT_VARIANT_ID.GESTURE_MOBILITY,
  );
  const gesture = report.variants.find(({ variantId }) => (
    variantId === ARENA_INPUT_PILOT_VARIANT_ID.GESTURE_MOBILITY
  ));
  const context = report.variants.find(({ variantId }) => (
    variantId === ARENA_INPUT_PILOT_VARIANT_ID.CONTEXT_PRIMARY
  ));
  const gestureSummary = required(gesture, 'gesture summary');
  const contextSummary = required(context, 'context summary');
  assert.equal(gestureSummary.onboardingSuccessRate, 1);
  assert.equal(contextSummary.onboardingSuccessRate, 0.8);
  assert.equal(gestureSummary.actions.airJump.attempted, 5);
  assert.equal(gestureSummary.actions.airJump.successRate, 1);
  assert.doesNotMatch(JSON.stringify(report), /pilot-[0-9]+/);
  assert.deepEqual(createInputPilotReport(definition, [...values].reverse()), report);
  assert.throws(() => {
    Object.assign(report.assessment, { status: 'winner' });
  }, /read only|只读|Cannot assign/i);
});

test('pilot report excludes invalid evidence without erasing genuine abandonment failures', () => {
  const definition = createArenaInputPilotV1Definition();
  const eligible = recordsByVariant(definition, {
    [ARENA_INPUT_PILOT_VARIANT_ID.GESTURE_MOBILITY]: () => ({ success: true }),
    [ARENA_INPUT_PILOT_VARIANT_ID.CONTEXT_PRIMARY]: () => ({ success: true }),
  });
  const excluded = [10, 11].map((enrollmentIndex) => record(definition, enrollmentIndex, {
    success: false,
    trialStatus: INPUT_PILOT_TRIAL_STATUS.INVALIDATED,
    intentMismatchCount: 999,
    accidentalInputCount: 999,
  }));
  const report = createInputPilotReport(definition, [...eligible, ...excluded]);
  for (const summary of report.variants) {
    assert.equal(summary.assignedRecords, 6);
    assert.equal(summary.eligibleSampleSize, 5);
    assert.equal(summary.excludedRecords, 1);
    assert.equal(summary.excludedByReason[INPUT_PILOT_EXCLUSION_REASON.INVALIDATED], 1);
    assert.equal(summary.onboardingSuccessRate, 1);
    assert.equal(summary.observerAverages.intentMismatchCount, 0);
  }

  const abandonedIndex = 0;
  const abandonedVariantId = assignment(definition, abandonedIndex).variantId;
  const withAbandonment = eligible.map((value, enrollmentIndex) => (
    enrollmentIndex === abandonedIndex
      ? record(definition, enrollmentIndex, {
        success: false,
        trialStatus: INPUT_PILOT_TRIAL_STATUS.ABANDONED,
      })
      : value
  ));
  const abandonedReport = createInputPilotReport(definition, withAbandonment);
  const abandonedVariant = abandonedReport.variants.find(({ variantId }) => (
    variantId === abandonedVariantId
  ));
  const abandonedSummary = required(abandonedVariant, 'abandoned variant summary');
  assert.equal(abandonedSummary.eligibleSampleSize, 5);
  assert.equal(abandonedSummary.excludedRecords, 0);
  assert.equal(abandonedSummary.onboardingSuccessRate, 0.8);
});

test('pilot report refuses premature, weak or conflicting winner claims', () => {
  const definition = createArenaInputPilotV1Definition();
  const insufficient = Array.from({ length: 8 }, (_, index) => record(definition, index));
  assert.equal(
    createInputPilotReport(definition, insufficient).assessment.status,
    INPUT_PILOT_ASSESSMENT_STATUS.INSUFFICIENT_DATA,
  );

  const noClearWinner = recordsByVariant(definition, {
    [ARENA_INPUT_PILOT_VARIANT_ID.GESTURE_MOBILITY]: () => ({ success: true }),
    [ARENA_INPUT_PILOT_VARIANT_ID.CONTEXT_PRIMARY]: () => ({ success: true }),
  });
  assert.equal(
    createInputPilotReport(definition, noClearWinner).assessment.status,
    INPUT_PILOT_ASSESSMENT_STATUS.NO_CLEAR_WINNER,
  );

  const belowThreshold = recordsByVariant(definition, {
    [ARENA_INPUT_PILOT_VARIANT_ID.GESTURE_MOBILITY]: (ordinal: number) => ({
      success: ordinal < 4,
    }),
    [ARENA_INPUT_PILOT_VARIANT_ID.CONTEXT_PRIMARY]: (ordinal: number) => ({
      success: ordinal < 3,
    }),
  });
  assert.equal(
    createInputPilotReport(definition, belowThreshold).assessment.status,
    INPUT_PILOT_ASSESSMENT_STATUS.THRESHOLD_NOT_MET,
  );

  const conflicting = recordsByVariant(definition, {
    [ARENA_INPUT_PILOT_VARIANT_ID.GESTURE_MOBILITY]: () => ({
      success: true,
      intentMismatchCount: 2,
      accidentalInputCount: 0,
    }),
    [ARENA_INPUT_PILOT_VARIANT_ID.CONTEXT_PRIMARY]: (ordinal: number) => ({
      success: ordinal < 4,
      intentMismatchCount: 0,
      accidentalInputCount: 0,
    }),
  });
  const conflictingReport = createInputPilotReport(definition, conflicting);
  assert.equal(
    conflictingReport.assessment.status,
    INPUT_PILOT_ASSESSMENT_STATUS.CONFLICTING_SECONDARY_METRICS,
  );
  assert.equal(conflictingReport.assessment.candidateVariantId, null);
  assert.deepEqual(conflictingReport.assessment.reasons, [
    'intent-mismatch-favors-other-variant',
  ]);

  const duplicate = [
    ...noClearWinner,
    { ...required(noClearWinner[0], 'first record'), trialId: 'different-trial' },
  ];
  assert.throws(() => createInputPilotReport(definition, duplicate), /participant .*重复入组/);

  const duplicateEnrollment = [...noClearWinner, {
    ...record(definition, 0, { participantId: 'different-participant' }),
    trialId: 'different-enrollment-trial',
  }];
  assert.throws(
    () => createInputPilotReport(definition, duplicateEnrollment),
    /enrollmentIndex 0 重复/,
  );

  const duplicateTrial = [...noClearWinner, {
    ...record(definition, 10, { participantId: 'different-trial-participant' }),
    trialId: required(noClearWinner[0], 'first record').trialId,
  }];
  assert.throws(() => createInputPilotReport(definition, duplicateTrial), /重复 pilot trial/);
});
