import {
  assertIntegerAtLeast,
  assertKnownKeys,
} from '../../rules/definition-utils.js';
import {
  INPUT_PILOT_FORM_FACTOR,
  INPUT_PILOT_INPUT_MODE,
  INPUT_PILOT_ORIENTATION,
  INPUT_PILOT_PLATFORM,
} from './input-pilot-definition.js';

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

export function createInputPilotDevice(value, name = 'InputPilotRecord.device') {
  assertKnownKeys(value, DEVICE_KEYS, name);
  return Object.freeze({
    platform: enumValue(value.platform, INPUT_PILOT_PLATFORM, `${name}.platform`),
    formFactor: enumValue(value.formFactor, INPUT_PILOT_FORM_FACTOR, `${name}.formFactor`),
    orientation: enumValue(value.orientation, INPUT_PILOT_ORIENTATION, `${name}.orientation`),
    inputMode: enumValue(value.inputMode, INPUT_PILOT_INPUT_MODE, `${name}.inputMode`),
  });
}

export function createInputPilotEligibility(
  value,
  name = 'InputPilotRecord.eligibility',
) {
  assertKnownKeys(value, ELIGIBILITY_KEYS, name);
  return Object.freeze({
    priorArenaExperience: booleanValue(
      value.priorArenaExperience,
      `${name}.priorArenaExperience`,
    ),
    priorOtherVariantExposure: booleanValue(
      value.priorOtherVariantExposure,
      `${name}.priorOtherVariantExposure`,
    ),
  });
}

export function createInputPilotAutomatedMetrics(
  value,
  maximumTrialDurationMs,
  name = 'InputPilotRecord.automated',
) {
  assertKnownKeys(value, AUTOMATED_KEYS, name);
  const trialDurationMs = assertIntegerAtLeast(value.trialDurationMs, 0, `${name}.trialDurationMs`);
  if (trialDurationMs > maximumTrialDurationMs) {
    throw new RangeError(`${name}.trialDurationMs 不能超过试验最大时长。`);
  }
  return Object.freeze({
    trialDurationMs,
    firstEffectiveMovementMs: nullableDuration(
      value.firstEffectiveMovementMs,
      trialDurationMs,
      `${name}.firstEffectiveMovementMs`,
    ),
    firstCorrectContextActionMs: nullableDuration(
      value.firstCorrectContextActionMs,
      trialDurationMs,
      `${name}.firstCorrectContextActionMs`,
    ),
    groundJump: enumValue(value.groundJump, INPUT_PILOT_ACTION_OUTCOME, `${name}.groundJump`),
    airJump: enumValue(value.airJump, INPUT_PILOT_ACTION_OUTCOME, `${name}.airJump`),
    downSmash: enumValue(value.downSmash, INPUT_PILOT_ACTION_OUTCOME, `${name}.downSmash`),
  });
}

export function createInputPilotObserverReport(value, name = 'InputPilotRecord.observer') {
  assertKnownKeys(value, OBSERVER_KEYS, name);
  const result = {};
  for (const key of [
    'intentMismatchCount',
    'accidentalInputCount',
    'repeatedInputCount',
    'abandonedInputCount',
    'correctionCount',
  ]) result[key] = assertIntegerAtLeast(value[key], 0, `${name}.${key}`);
  result.oneHandCompleted = booleanValue(value.oneHandCompleted, `${name}.oneHandCompleted`);
  result.objectiveCompleted = booleanValue(value.objectiveCompleted, `${name}.objectiveCompleted`);
  return Object.freeze(result);
}

export function createInputPilotSelfReport(value, name = 'InputPilotRecord.selfReport') {
  assertKnownKeys(value, SELF_REPORT_KEYS, name);
  return Object.freeze(Object.fromEntries([...SELF_REPORT_KEYS].map((key) => [
    key,
    enumValue(value[key], INPUT_PILOT_COMPREHENSION, `${name}.${key}`),
  ])));
}
