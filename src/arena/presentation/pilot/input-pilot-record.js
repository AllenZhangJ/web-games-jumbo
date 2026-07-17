import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import {
  INPUT_PILOT_FORM_FACTOR,
  INPUT_PILOT_INPUT_MODE,
  INPUT_PILOT_ORIENTATION,
  INPUT_PILOT_PLATFORM,
  createInputPilotDefinition,
} from './input-pilot-definition.js';
import { validateInputPilotAssignment } from './input-pilot-assignment.js';

export const INPUT_PILOT_RECORD_SCHEMA_VERSION = 1;

export const INPUT_PILOT_TRIAL_STATUS = Object.freeze({
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  INVALIDATED: 'invalidated',
});

export const INPUT_PILOT_ACTION_OUTCOME = Object.freeze({
  NOT_ATTEMPTED: 'not-attempted',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
});

export const INPUT_PILOT_COMPREHENSION = Object.freeze({
  CORRECT: 'correct',
  PARTIAL: 'partial',
  INCORRECT: 'incorrect',
  NOT_ANSWERED: 'not-answered',
});

export const INPUT_PILOT_EXCLUSION_REASON = Object.freeze({
  INVALIDATED: 'invalidated',
  PRIOR_ARENA_EXPERIENCE: 'prior-arena-experience',
  PRIOR_OTHER_VARIANT_EXPOSURE: 'prior-other-variant-exposure',
  PLATFORM_MISMATCH: 'platform-mismatch',
  FORM_FACTOR_MISMATCH: 'form-factor-mismatch',
  ORIENTATION_MISMATCH: 'orientation-mismatch',
  INPUT_MODE_MISMATCH: 'input-mode-mismatch',
});

const RECORD_KEYS = new Set([
  'schemaVersion',
  'trialId',
  'assignment',
  'trialStatus',
  'device',
  'eligibility',
  'automated',
  'observer',
  'selfReport',
]);
const DEVICE_KEYS = new Set(['platform', 'formFactor', 'orientation', 'inputMode']);
const ELIGIBILITY_KEYS = new Set(['priorArenaExperience', 'priorOtherVariantExposure']);
const AUTOMATED_KEYS = new Set([
  'trialDurationMs',
  'firstEffectiveMovementMs',
  'firstCorrectContextActionMs',
  'groundJump',
  'airJump',
  'downSmash',
]);
const OBSERVER_KEYS = new Set([
  'intentMismatchCount',
  'accidentalInputCount',
  'repeatedInputCount',
  'abandonedInputCount',
  'correctionCount',
  'oneHandCompleted',
  'objectiveCompleted',
]);
const SELF_REPORT_KEYS = new Set(['groundAction', 'airAction', 'equipmentAction']);

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function booleanValue(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function nullableDuration(value, maximum, name) {
  if (value === null) return null;
  const duration = assertIntegerAtLeast(value, 0, name);
  if (duration > maximum) throw new RangeError(`${name} 不能超过 trialDurationMs。`);
  return duration;
}

function cloneDevice(value) {
  assertKnownKeys(value, DEVICE_KEYS, 'InputPilotRecord.device');
  return Object.freeze({
    platform: enumValue(value.platform, INPUT_PILOT_PLATFORM, 'InputPilotRecord.device.platform'),
    formFactor: enumValue(
      value.formFactor,
      INPUT_PILOT_FORM_FACTOR,
      'InputPilotRecord.device.formFactor',
    ),
    orientation: enumValue(
      value.orientation,
      INPUT_PILOT_ORIENTATION,
      'InputPilotRecord.device.orientation',
    ),
    inputMode: enumValue(
      value.inputMode,
      INPUT_PILOT_INPUT_MODE,
      'InputPilotRecord.device.inputMode',
    ),
  });
}

function cloneEligibility(value) {
  assertKnownKeys(value, ELIGIBILITY_KEYS, 'InputPilotRecord.eligibility');
  return Object.freeze({
    priorArenaExperience: booleanValue(
      value.priorArenaExperience,
      'InputPilotRecord.eligibility.priorArenaExperience',
    ),
    priorOtherVariantExposure: booleanValue(
      value.priorOtherVariantExposure,
      'InputPilotRecord.eligibility.priorOtherVariantExposure',
    ),
  });
}

function cloneAutomated(value, maximumTrialDurationMs) {
  assertKnownKeys(value, AUTOMATED_KEYS, 'InputPilotRecord.automated');
  const trialDurationMs = assertIntegerAtLeast(
    value.trialDurationMs,
    0,
    'InputPilotRecord.automated.trialDurationMs',
  );
  if (trialDurationMs > maximumTrialDurationMs) {
    throw new RangeError(
      'InputPilotRecord.automated.trialDurationMs 不能超过试验最大时长。',
    );
  }
  return Object.freeze({
    trialDurationMs,
    firstEffectiveMovementMs: nullableDuration(
      value.firstEffectiveMovementMs,
      trialDurationMs,
      'InputPilotRecord.automated.firstEffectiveMovementMs',
    ),
    firstCorrectContextActionMs: nullableDuration(
      value.firstCorrectContextActionMs,
      trialDurationMs,
      'InputPilotRecord.automated.firstCorrectContextActionMs',
    ),
    groundJump: enumValue(
      value.groundJump,
      INPUT_PILOT_ACTION_OUTCOME,
      'InputPilotRecord.automated.groundJump',
    ),
    airJump: enumValue(
      value.airJump,
      INPUT_PILOT_ACTION_OUTCOME,
      'InputPilotRecord.automated.airJump',
    ),
    downSmash: enumValue(
      value.downSmash,
      INPUT_PILOT_ACTION_OUTCOME,
      'InputPilotRecord.automated.downSmash',
    ),
  });
}

function cloneObserver(value) {
  assertKnownKeys(value, OBSERVER_KEYS, 'InputPilotRecord.observer');
  const result = {};
  for (const key of [
    'intentMismatchCount',
    'accidentalInputCount',
    'repeatedInputCount',
    'abandonedInputCount',
    'correctionCount',
  ]) {
    result[key] = assertIntegerAtLeast(value[key], 0, `InputPilotRecord.observer.${key}`);
  }
  result.oneHandCompleted = booleanValue(
    value.oneHandCompleted,
    'InputPilotRecord.observer.oneHandCompleted',
  );
  result.objectiveCompleted = booleanValue(
    value.objectiveCompleted,
    'InputPilotRecord.observer.objectiveCompleted',
  );
  return Object.freeze(result);
}

function cloneSelfReport(value) {
  assertKnownKeys(value, SELF_REPORT_KEYS, 'InputPilotRecord.selfReport');
  const result = {};
  for (const key of SELF_REPORT_KEYS) {
    result[key] = enumValue(
      value[key],
      INPUT_PILOT_COMPREHENSION,
      `InputPilotRecord.selfReport.${key}`,
    );
  }
  return Object.freeze(result);
}

export function createInputPilotRecord(definitionValue, value) {
  const definition = createInputPilotDefinition(definitionValue);
  const source = cloneFrozenData(value, 'InputPilotRecord');
  assertKnownKeys(source, RECORD_KEYS, 'InputPilotRecord');
  if (source.schemaVersion !== INPUT_PILOT_RECORD_SCHEMA_VERSION) {
    throw new RangeError(`不支持 InputPilotRecord schema ${String(source.schemaVersion)}。`);
  }
  return Object.freeze({
    schemaVersion: INPUT_PILOT_RECORD_SCHEMA_VERSION,
    trialId: assertNonEmptyString(source.trialId, 'InputPilotRecord.trialId'),
    assignment: validateInputPilotAssignment(definition, source.assignment),
    trialStatus: enumValue(
      source.trialStatus,
      INPUT_PILOT_TRIAL_STATUS,
      'InputPilotRecord.trialStatus',
    ),
    device: cloneDevice(source.device),
    eligibility: cloneEligibility(source.eligibility),
    automated: cloneAutomated(
      source.automated,
      definition.thresholds.maximumTrialDurationMs,
    ),
    observer: cloneObserver(source.observer),
    selfReport: cloneSelfReport(source.selfReport),
  });
}

export function getInputPilotRecordExclusionReasons(definitionValue, recordValue) {
  const definition = createInputPilotDefinition(definitionValue);
  const record = createInputPilotRecord(definition, recordValue);
  const reasons = [];
  if (record.trialStatus === INPUT_PILOT_TRIAL_STATUS.INVALIDATED) {
    reasons.push(INPUT_PILOT_EXCLUSION_REASON.INVALIDATED);
  }
  if (record.eligibility.priorArenaExperience) {
    reasons.push(INPUT_PILOT_EXCLUSION_REASON.PRIOR_ARENA_EXPERIENCE);
  }
  if (record.eligibility.priorOtherVariantExposure) {
    reasons.push(INPUT_PILOT_EXCLUSION_REASON.PRIOR_OTHER_VARIANT_EXPOSURE);
  }
  for (const [field, reason] of [
    ['platform', INPUT_PILOT_EXCLUSION_REASON.PLATFORM_MISMATCH],
    ['formFactor', INPUT_PILOT_EXCLUSION_REASON.FORM_FACTOR_MISMATCH],
    ['orientation', INPUT_PILOT_EXCLUSION_REASON.ORIENTATION_MISMATCH],
    ['inputMode', INPUT_PILOT_EXCLUSION_REASON.INPUT_MODE_MISMATCH],
  ]) {
    if (record.device[field] !== definition.environment[field]) reasons.push(reason);
  }
  return Object.freeze(reasons);
}
