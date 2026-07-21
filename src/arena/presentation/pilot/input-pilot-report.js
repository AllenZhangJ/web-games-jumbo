import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { createInputPilotDefinition } from './input-pilot-definition.js';
import {
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_EXCLUSION_REASON,
  createInputPilotRecord,
  getInputPilotRecordExclusionReasons,
} from './input-pilot-record.js';

export const INPUT_PILOT_REPORT_SCHEMA_VERSION = 1;

export const INPUT_PILOT_ASSESSMENT_STATUS = Object.freeze({
  INSUFFICIENT_DATA: 'insufficient-data',
  THRESHOLD_NOT_MET: 'threshold-not-met',
  NO_CLEAR_WINNER: 'no-clear-winner',
  CONFLICTING_SECONDARY_METRICS: 'conflicting-secondary-metrics',
  CANDIDATE_WINNER: 'candidate-winner',
});

const EPSILON = 1e-12;
const OBSERVER_COUNT_KEYS = Object.freeze([
  'intentMismatchCount',
  'accidentalInputCount',
  'repeatedInputCount',
  'abandonedInputCount',
  'correctionCount',
]);
const ACTION_KEYS = Object.freeze(['groundJump', 'airJump', 'downSmash']);
const COMPREHENSION_KEYS = Object.freeze(['groundAction', 'airAction', 'equipmentAction']);

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function average(values) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function actionSummary(records, key) {
  let attempted = 0;
  let succeeded = 0;
  for (const record of records) {
    const outcome = record.automated[key];
    if (outcome === INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED) continue;
    attempted += 1;
    if (outcome === INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED) succeeded += 1;
  }
  return Object.freeze({ attempted, succeeded, successRate: ratio(succeeded, attempted) });
}

function createVariantSummary(definition, variant, records) {
  const eligible = [];
  const excludedByReason = Object.fromEntries(
    Object.values(INPUT_PILOT_EXCLUSION_REASON).map((reason) => [reason, 0]),
  );
  let excludedRecords = 0;
  for (const record of records) {
    const reasons = getInputPilotRecordExclusionReasons(definition, record);
    if (reasons.length === 0) eligible.push(record);
    else {
      excludedRecords += 1;
      for (const reason of reasons) excludedByReason[reason] += 1;
    }
  }

  const successWindowMs = definition.thresholds.successWindowMs;
  const onboardingSuccesses = eligible.filter((record) => (
    record.automated.firstEffectiveMovementMs !== null
    && record.automated.firstEffectiveMovementMs <= successWindowMs
    && record.automated.firstCorrectContextActionMs !== null
    && record.automated.firstCorrectContextActionMs <= successWindowMs
  )).length;
  const observerAverages = Object.fromEntries(OBSERVER_COUNT_KEYS.map((key) => [
    key,
    average(eligible.map((record) => record.observer[key])),
  ]));
  const comprehensionAnswers = eligible.length * COMPREHENSION_KEYS.length;
  const correctComprehensionAnswers = eligible.reduce((sum, record) => (
    sum + COMPREHENSION_KEYS.filter((key) => (
      record.selfReport[key] === INPUT_PILOT_COMPREHENSION.CORRECT
    )).length
  ), 0);
  const oneHandCompleted = eligible.filter((record) => record.observer.oneHandCompleted).length;
  const objectiveCompleted = eligible.filter((record) => record.observer.objectiveCompleted).length;

  return Object.freeze({
    variantId: variant.id,
    mapperId: variant.mapperId,
    assignedRecords: records.length,
    eligibleSampleSize: eligible.length,
    excludedRecords,
    excludedByReason: Object.freeze(excludedByReason),
    onboardingSuccesses,
    onboardingSuccessRate: ratio(onboardingSuccesses, eligible.length),
    medianFirstEffectiveMovementMs: median(eligible
      .map((record) => record.automated.firstEffectiveMovementMs)
      .filter((value) => value !== null)),
    medianFirstCorrectContextActionMs: median(eligible
      .map((record) => record.automated.firstCorrectContextActionMs)
      .filter((value) => value !== null)),
    actions: Object.freeze(Object.fromEntries(ACTION_KEYS.map((key) => [
      key,
      actionSummary(eligible, key),
    ]))),
    observerAverages: Object.freeze(observerAverages),
    oneHandCompleted,
    oneHandCompletionRate: ratio(oneHandCompleted, eligible.length),
    objectiveCompleted,
    objectiveCompletionRate: ratio(objectiveCompleted, eligible.length),
    correctComprehensionAnswers,
    comprehensionAnswers,
    comprehensionCorrectRate: ratio(correctComprehensionAnswers, comprehensionAnswers),
  });
}

function candidateAssessment(definition, variants) {
  const minimum = definition.thresholds.minimumEligibleSamplesPerVariant;
  if (variants.some(({ eligibleSampleSize }) => eligibleSampleSize < minimum)) {
    return {
      status: INPUT_PILOT_ASSESSMENT_STATUS.INSUFFICIENT_DATA,
      candidateVariantId: null,
      candidateMapperId: null,
      reasons: ['minimum-eligible-samples-not-met'],
    };
  }
  if (variants.some(({ onboardingSuccessRate }) => (
    onboardingSuccessRate < definition.thresholds.targetSuccessRate
  ))) {
    return {
      status: INPUT_PILOT_ASSESSMENT_STATUS.THRESHOLD_NOT_MET,
      candidateVariantId: null,
      candidateMapperId: null,
      reasons: ['onboarding-success-target-not-met'],
    };
  }

  const [first, second] = variants;
  const difference = Math.abs(first.onboardingSuccessRate - second.onboardingSuccessRate);
  if (difference + EPSILON < definition.thresholds.winnerMarginRate) {
    return {
      status: INPUT_PILOT_ASSESSMENT_STATUS.NO_CLEAR_WINNER,
      candidateVariantId: null,
      candidateMapperId: null,
      reasons: ['primary-metric-margin-not-met'],
    };
  }

  const winner = first.onboardingSuccessRate > second.onboardingSuccessRate ? first : second;
  const other = winner === first ? second : first;
  const conflictingReasons = [];
  if (
    winner.observerAverages.intentMismatchCount
    > other.observerAverages.intentMismatchCount + EPSILON
  ) conflictingReasons.push('intent-mismatch-favors-other-variant');
  if (
    winner.observerAverages.accidentalInputCount
    > other.observerAverages.accidentalInputCount + EPSILON
  ) conflictingReasons.push('accidental-input-favors-other-variant');
  if (winner.oneHandCompletionRate + EPSILON < other.oneHandCompletionRate) {
    conflictingReasons.push('one-hand-completion-favors-other-variant');
  }
  if (conflictingReasons.length > 0) {
    return {
      status: INPUT_PILOT_ASSESSMENT_STATUS.CONFLICTING_SECONDARY_METRICS,
      candidateVariantId: null,
      candidateMapperId: null,
      reasons: conflictingReasons,
    };
  }
  return {
    status: INPUT_PILOT_ASSESSMENT_STATUS.CANDIDATE_WINNER,
    candidateVariantId: winner.variantId,
    candidateMapperId: winner.mapperId,
    reasons: ['primary-margin-and-secondary-metrics-aligned'],
  };
}

function compareRecords(left, right) {
  if (left.assignment.enrollmentIndex !== right.assignment.enrollmentIndex) {
    return left.assignment.enrollmentIndex - right.assignment.enrollmentIndex;
  }
  if (left.trialId < right.trialId) return -1;
  if (left.trialId > right.trialId) return 1;
  return 0;
}

export function createInputPilotReport(definitionValue, recordValues) {
  const definition = createInputPilotDefinition(definitionValue);
  if (!Array.isArray(recordValues)) throw new TypeError('InputPilotReport records 必须是数组。');
  const records = recordValues.map((record) => createInputPilotRecord(definition, record));
  const trialIds = new Set();
  const assignmentIds = new Set();
  const participantIds = new Set();
  const enrollmentIndexes = new Set();
  for (const record of records) {
    if (trialIds.has(record.trialId)) throw new RangeError(`重复 pilot trial ${record.trialId}。`);
    trialIds.add(record.trialId);
    if (participantIds.has(record.assignment.participantId)) {
      throw new RangeError(`pilot participant ${record.assignment.participantId} 重复入组。`);
    }
    participantIds.add(record.assignment.participantId);
    if (enrollmentIndexes.has(record.assignment.enrollmentIndex)) {
      throw new RangeError(`pilot enrollmentIndex ${record.assignment.enrollmentIndex} 重复。`);
    }
    enrollmentIndexes.add(record.assignment.enrollmentIndex);
    if (assignmentIds.has(record.assignment.assignmentId)) {
      throw new RangeError(`重复 pilot assignment ${record.assignment.assignmentId}。`);
    }
    assignmentIds.add(record.assignment.assignmentId);
  }
  const sortedRecords = [...records].sort(compareRecords);
  const variants = definition.variants.map((variant) => createVariantSummary(
    definition,
    variant,
    sortedRecords.filter((record) => record.assignment.variantId === variant.id),
  ));
  const assessment = candidateAssessment(definition, variants);
  return cloneFrozenData({
    schemaVersion: INPUT_PILOT_REPORT_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    assignmentSeed: definition.assignmentSeed,
    sourceDataHash: createDeterministicDataHash(sortedRecords, 'InputPilotReport source records'),
    totalRecords: records.length,
    variants,
    assessment,
  }, 'InputPilotReport');
}
