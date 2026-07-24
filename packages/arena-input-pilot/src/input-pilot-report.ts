import {
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  createInputPilotDefinition,
  type InputPilotDefinition,
  type InputPilotVariant,
} from './input-pilot-definition.js';
import {
  createInputPilotRecord,
  getInputPilotRecordExclusionReasons,
  type InputPilotRecord,
} from './input-pilot-record.js';
import {
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_EXCLUSION_REASON,
} from './input-pilot-vocabulary.js';

export const INPUT_PILOT_REPORT_SCHEMA_VERSION = 1;

export const INPUT_PILOT_ASSESSMENT_STATUS = Object.freeze({
  INSUFFICIENT_DATA: 'insufficient-data',
  THRESHOLD_NOT_MET: 'threshold-not-met',
  NO_CLEAR_WINNER: 'no-clear-winner',
  CONFLICTING_SECONDARY_METRICS: 'conflicting-secondary-metrics',
  CANDIDATE_WINNER: 'candidate-winner',
} as const);

export type InputPilotAssessmentStatus = typeof INPUT_PILOT_ASSESSMENT_STATUS[
  keyof typeof INPUT_PILOT_ASSESSMENT_STATUS
];
type ObserverCountKey = 'intentMismatchCount' | 'accidentalInputCount' | 'repeatedInputCount'
  | 'abandonedInputCount' | 'correctionCount';
type ActionKey = 'groundJump' | 'airJump' | 'downSmash';
type ComprehensionKey = 'groundAction' | 'airAction' | 'equipmentAction';
type CompleteRecord = InputPilotRecord & {
  readonly automated: NonNullable<InputPilotRecord['automated']>;
  readonly observer: NonNullable<InputPilotRecord['observer']>;
  readonly selfReport: NonNullable<InputPilotRecord['selfReport']>;
};

export interface InputPilotActionSummary {
  readonly attempted: number;
  readonly succeeded: number;
  readonly successRate: number | null;
}
export interface InputPilotVariantSummary {
  readonly variantId: string;
  readonly mapperId: string;
  readonly assignedRecords: number;
  readonly eligibleSampleSize: number;
  readonly excludedRecords: number;
  readonly excludedByReason: Readonly<Record<string, number>>;
  readonly onboardingSuccesses: number;
  readonly onboardingSuccessRate: number | null;
  readonly medianFirstEffectiveMovementMs: number | null;
  readonly medianFirstCorrectContextActionMs: number | null;
  readonly actions: Readonly<Record<ActionKey, InputPilotActionSummary>>;
  readonly observerAverages: Readonly<Record<ObserverCountKey, number | null>>;
  readonly oneHandCompleted: number;
  readonly oneHandCompletionRate: number | null;
  readonly objectiveCompleted: number;
  readonly objectiveCompletionRate: number | null;
  readonly correctComprehensionAnswers: number;
  readonly comprehensionAnswers: number;
  readonly comprehensionCorrectRate: number | null;
}
export interface InputPilotAssessment {
  readonly status: InputPilotAssessmentStatus;
  readonly candidateVariantId: string | null;
  readonly candidateMapperId: string | null;
  readonly reasons: readonly string[];
}
export interface InputPilotReport {
  readonly schemaVersion: typeof INPUT_PILOT_REPORT_SCHEMA_VERSION;
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly assignmentSeed: number;
  readonly sourceDataHash: string;
  readonly totalRecords: number;
  readonly variants: readonly InputPilotVariantSummary[];
  readonly assessment: InputPilotAssessment;
}

const EPSILON = 1e-12;
const OBSERVER_COUNT_KEYS: readonly ObserverCountKey[] = Object.freeze([
  'intentMismatchCount',
  'accidentalInputCount',
  'repeatedInputCount',
  'abandonedInputCount',
  'correctionCount',
]);
const ACTION_KEYS: readonly ActionKey[] = Object.freeze(['groundJump', 'airJump', 'downSmash']);
const COMPREHENSION_KEYS: readonly ComprehensionKey[] = Object.freeze([
  'groundAction',
  'airAction',
  'equipmentAction',
]);

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) return null;
  if (sorted.length % 2 !== 0) return upper;
  const lower = sorted[middle - 1];
  if (lower === undefined) return null;
  return (lower + upper) / 2;
}

function actionSummary(records: readonly CompleteRecord[], key: ActionKey): InputPilotActionSummary {
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

function createVariantSummary(
  definition: InputPilotDefinition,
  variant: InputPilotVariant,
  records: readonly InputPilotRecord[],
): InputPilotVariantSummary {
  const eligible: CompleteRecord[] = [];
  const excludedByReason: Record<string, number> = Object.fromEntries(
    Object.values(INPUT_PILOT_EXCLUSION_REASON).map((reason) => [reason, 0]),
  );
  let excludedRecords = 0;
  for (const record of records) {
    const reasons = getInputPilotRecordExclusionReasons(definition, record);
    if (reasons.length === 0) {
      if (!record.automated || !record.observer || !record.selfReport) {
        throw new Error('eligible InputPilotRecord 缺少完整证据。');
      }
      eligible.push(record as CompleteRecord);
    } else {
      excludedRecords += 1;
      for (const reason of reasons) excludedByReason[reason] = (excludedByReason[reason] ?? 0) + 1;
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
  ])) as Record<ObserverCountKey, number | null>;
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
      .filter((value): value is number => value !== null)),
    medianFirstCorrectContextActionMs: median(eligible
      .map((record) => record.automated.firstCorrectContextActionMs)
      .filter((value): value is number => value !== null)),
    actions: Object.freeze(Object.fromEntries(ACTION_KEYS.map((key) => [
      key,
      actionSummary(eligible, key),
    ])) as Record<ActionKey, InputPilotActionSummary>),
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

function requiredMetric(value: number | null, name: string): number {
  if (value === null) throw new Error(`InputPilotReport ${name} 在足量样本下不能为空。`);
  return value;
}

function candidateAssessment(
  definition: InputPilotDefinition,
  variants: readonly InputPilotVariantSummary[],
): InputPilotAssessment {
  const minimum = definition.thresholds.minimumEligibleSamplesPerVariant;
  if (variants.some(({ eligibleSampleSize }) => eligibleSampleSize < minimum)) {
    return Object.freeze({
      status: INPUT_PILOT_ASSESSMENT_STATUS.INSUFFICIENT_DATA,
      candidateVariantId: null,
      candidateMapperId: null,
      reasons: Object.freeze(['minimum-eligible-samples-not-met']),
    });
  }
  const rates = variants.map((variant) => requiredMetric(
    variant.onboardingSuccessRate,
    `${variant.variantId}.onboardingSuccessRate`,
  ));
  if (rates.some((rate) => rate < definition.thresholds.targetSuccessRate)) {
    return Object.freeze({
      status: INPUT_PILOT_ASSESSMENT_STATUS.THRESHOLD_NOT_MET,
      candidateVariantId: null,
      candidateMapperId: null,
      reasons: Object.freeze(['onboarding-success-target-not-met']),
    });
  }
  const first = variants[0];
  const second = variants[1];
  if (!first || !second || variants.length !== 2) {
    throw new Error('InputPilotReport 必须恰好包含两个 variant summary。');
  }
  const firstRate = requiredMetric(first.onboardingSuccessRate, `${first.variantId}.onboardingSuccessRate`);
  const secondRate = requiredMetric(second.onboardingSuccessRate, `${second.variantId}.onboardingSuccessRate`);
  if (Math.abs(firstRate - secondRate) + EPSILON < definition.thresholds.winnerMarginRate) {
    return Object.freeze({
      status: INPUT_PILOT_ASSESSMENT_STATUS.NO_CLEAR_WINNER,
      candidateVariantId: null,
      candidateMapperId: null,
      reasons: Object.freeze(['primary-metric-margin-not-met']),
    });
  }

  const winner = firstRate > secondRate ? first : second;
  const other = winner === first ? second : first;
  const conflictingReasons: string[] = [];
  if (
    requiredMetric(winner.observerAverages.intentMismatchCount, 'winner.intentMismatchCount')
    > requiredMetric(other.observerAverages.intentMismatchCount, 'other.intentMismatchCount') + EPSILON
  ) conflictingReasons.push('intent-mismatch-favors-other-variant');
  if (
    requiredMetric(winner.observerAverages.accidentalInputCount, 'winner.accidentalInputCount')
    > requiredMetric(other.observerAverages.accidentalInputCount, 'other.accidentalInputCount') + EPSILON
  ) conflictingReasons.push('accidental-input-favors-other-variant');
  if (
    requiredMetric(winner.oneHandCompletionRate, 'winner.oneHandCompletionRate') + EPSILON
    < requiredMetric(other.oneHandCompletionRate, 'other.oneHandCompletionRate')
  ) conflictingReasons.push('one-hand-completion-favors-other-variant');
  if (conflictingReasons.length > 0) {
    return Object.freeze({
      status: INPUT_PILOT_ASSESSMENT_STATUS.CONFLICTING_SECONDARY_METRICS,
      candidateVariantId: null,
      candidateMapperId: null,
      reasons: Object.freeze(conflictingReasons),
    });
  }
  return Object.freeze({
    status: INPUT_PILOT_ASSESSMENT_STATUS.CANDIDATE_WINNER,
    candidateVariantId: winner.variantId,
    candidateMapperId: winner.mapperId,
    reasons: Object.freeze(['primary-margin-and-secondary-metrics-aligned']),
  });
}

function compareRecords(left: InputPilotRecord, right: InputPilotRecord): number {
  if (left.assignment.enrollmentIndex !== right.assignment.enrollmentIndex) {
    return left.assignment.enrollmentIndex - right.assignment.enrollmentIndex;
  }
  if (left.trialId < right.trialId) {
    return -1;
  }
  if (left.trialId > right.trialId) {
    return 1;
  }
  return 0;
}

export function createInputPilotReport(
  definitionValue: unknown,
  recordValues: unknown,
): InputPilotReport {
  const definition = createInputPilotDefinition(definitionValue);
  if (!Array.isArray(recordValues)) throw new TypeError('InputPilotReport records 必须是数组。');
  const recordSources = cloneFrozenData(recordValues, 'InputPilotReport source records') as readonly unknown[];
  const records = recordSources.map((record) => createInputPilotRecord(definition, record));
  const trialIds = new Set<string>();
  const assignmentIds = new Set<string>();
  const participantIds = new Set<string>();
  const enrollmentIndexes = new Set<number>();
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
  }, 'InputPilotReport') as InputPilotReport;
}
