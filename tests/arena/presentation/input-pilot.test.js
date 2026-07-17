import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_INPUT_PILOT_VARIANT_ID,
  createArenaInputPilotV1Definition,
} from '../../../src/arena/presentation/pilot/arena-input-pilot-v1.js';
import {
  INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION,
  createInputPilotAssignment,
  validateInputPilotAssignment,
} from '../../../src/arena/presentation/pilot/input-pilot-assignment.js';
import {
  INPUT_PILOT_DEFINITION_SCHEMA_VERSION,
  createInputPilotDefinition,
} from '../../../src/arena/presentation/pilot/input-pilot-definition.js';
import { InputPilotRegistry } from '../../../src/arena/presentation/pilot/input-pilot-registry.js';
import {
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_EXCLUSION_REASON,
  INPUT_PILOT_RECORD_SCHEMA_VERSION,
  INPUT_PILOT_TRIAL_STATUS,
  createInputPilotRecord,
  getInputPilotRecordExclusionReasons,
} from '../../../src/arena/presentation/pilot/input-pilot-record.js';
import {
  INPUT_PILOT_ASSESSMENT_STATUS,
  createInputPilotReport,
} from '../../../src/arena/presentation/pilot/input-pilot-report.js';

function assignment(definition, enrollmentIndex, participantId = `pilot-${enrollmentIndex}`) {
  return createInputPilotAssignment({
    definition,
    participantId,
    enrollmentIndex,
  });
}

function record(definition, enrollmentIndex, {
  participantId = `pilot-${enrollmentIndex}`,
  success = true,
  trialStatus = INPUT_PILOT_TRIAL_STATUS.COMPLETED,
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
} = {}) {
  return {
    schemaVersion: INPUT_PILOT_RECORD_SCHEMA_VERSION,
    trialId: `trial-${enrollmentIndex}`,
    assignment: assignment(definition, enrollmentIndex, participantId),
    trialStatus,
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

function recordsByVariant(definition, profiles) {
  const ordinals = new Map(definition.variants.map(({ id }) => [id, 0]));
  return Array.from({ length: 10 }, (_, enrollmentIndex) => {
    const selected = assignment(definition, enrollmentIndex);
    const ordinal = ordinals.get(selected.variantId);
    ordinals.set(selected.variantId, ordinal + 1);
    return record(
      definition,
      enrollmentIndex,
      profiles[selected.variantId](ordinal),
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
  assert.equal(definition.getContentHash(), createArenaInputPilotV1Definition().getContentHash());
  assert.throws(() => { definition.variants[0].id = 'changed'; }, /read only|只读|Cannot assign/i);

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
    variants: [definition.variants[0]],
  }), /恰好包含两个/);
  assert.throws(() => createInputPilotDefinition({
    ...definition.toJSON(),
    variants: [definition.variants[0], {
      id: 'duplicate-mapper',
      mapperId: definition.variants[0].mapperId,
    }],
  }), /重复使用 mapper/);
  assert.throws(() => createInputPilotDefinition({
    ...definition.toJSON(),
    surprise: true,
  }), /不支持字段 surprise/);
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
  }
  assert.deepEqual(assignment(definition, 7), assignments[7]);
  assert.equal(
    assignment(definition, 7, 'different-pseudonym').variantId,
    assignments[7].variantId,
  );
  assert.notEqual(
    assignment(definition, 7, 'different-pseudonym').assignmentId,
    assignments[7].assignmentId,
  );
  assert.deepEqual(
    Array.from({ length: 20 }, (_, index) => assignment(definition, index)),
    assignments,
  );

  const tampered = { ...assignments[0], mapperId: assignments[1].mapperId };
  assert.throws(() => validateInputPilotAssignment(definition, tampered), /无法由分组合同复现/);
  assert.throws(() => validateInputPilotAssignment(definition, {
    ...assignments[0],
    assignmentSeed: 0x66060002,
  }), /无法由分组合同复现/);
  assert.equal(assignments[0].schemaVersion, INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION);
});

test('InputPilotRecord separates automated, observer and self-report evidence', () => {
  const definition = createArenaInputPilotV1Definition();
  const value = record(definition, 0);
  const normalized = createInputPilotRecord(definition, value);
  assert.equal(normalized.automated.firstEffectiveMovementMs, 1_500);
  assert.equal(normalized.observer.intentMismatchCount, 0);
  assert.equal(normalized.selfReport.groundAction, INPUT_PILOT_COMPREHENSION.CORRECT);
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
});

test('pilot report recommends only an evidence-aligned candidate and hides participant ids', () => {
  const definition = createArenaInputPilotV1Definition();
  const values = recordsByVariant(definition, {
    [ARENA_INPUT_PILOT_VARIANT_ID.GESTURE_MOBILITY]: () => ({
      success: true,
      intentMismatchCount: 0,
      accidentalInputCount: 0,
    }),
    [ARENA_INPUT_PILOT_VARIANT_ID.CONTEXT_PRIMARY]: (ordinal) => ({
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
  assert.equal(gesture.onboardingSuccessRate, 1);
  assert.equal(context.onboardingSuccessRate, 0.8);
  assert.equal(gesture.actions.airJump.attempted, 5);
  assert.equal(gesture.actions.airJump.successRate, 1);
  assert.doesNotMatch(JSON.stringify(report), /pilot-[0-9]+/);
  assert.deepEqual(createInputPilotReport(definition, [...values].reverse()), report);
  assert.throws(() => { report.assessment.status = 'winner'; }, /read only|只读|Cannot assign/i);
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
  assert.equal(abandonedVariant.eligibleSampleSize, 5);
  assert.equal(abandonedVariant.excludedRecords, 0);
  assert.equal(abandonedVariant.onboardingSuccessRate, 0.8);
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
    [ARENA_INPUT_PILOT_VARIANT_ID.GESTURE_MOBILITY]: (ordinal) => ({
      success: ordinal < 4,
    }),
    [ARENA_INPUT_PILOT_VARIANT_ID.CONTEXT_PRIMARY]: (ordinal) => ({
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
    [ARENA_INPUT_PILOT_VARIANT_ID.CONTEXT_PRIMARY]: (ordinal) => ({
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

  const duplicate = [...noClearWinner, { ...noClearWinner[0], trialId: 'different-trial' }];
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
    trialId: noClearWinner[0].trialId,
  }];
  assert.throws(() => createInputPilotReport(definition, duplicateTrial), /重复 pilot trial/);
});
