import { assertIntegerAtLeast, assertKnownKeys } from '@number-strategy-jump/arena-contracts';
import {
  INPUT_PILOT_FORM_FACTOR,
  INPUT_PILOT_INPUT_MODE,
  INPUT_PILOT_ORIENTATION,
  INPUT_PILOT_PLATFORM,
  type InputPilotEnvironment,
} from './input-pilot-definition.js';
import {
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
} from './input-pilot-vocabulary.js';

export { INPUT_PILOT_ACTION_OUTCOME, INPUT_PILOT_COMPREHENSION } from './input-pilot-vocabulary.js';

export const INPUT_PILOT_OBSERVER_COUNTER_KEYS = Object.freeze([
  'intentMismatchCount', 'accidentalInputCount', 'repeatedInputCount',
  'abandonedInputCount', 'correctionCount',
] as const);
export const INPUT_PILOT_COMPREHENSION_KEYS = Object.freeze([
  'groundAction', 'airAction', 'equipmentAction',
] as const);

export type InputPilotObserverCounterKey = typeof INPUT_PILOT_OBSERVER_COUNTER_KEYS[number];
export type InputPilotComprehensionKey = typeof INPUT_PILOT_COMPREHENSION_KEYS[number];
export type InputPilotActionOutcome = typeof INPUT_PILOT_ACTION_OUTCOME[
  keyof typeof INPUT_PILOT_ACTION_OUTCOME
];
export type InputPilotComprehension = typeof INPUT_PILOT_COMPREHENSION[
  keyof typeof INPUT_PILOT_COMPREHENSION
];

export interface InputPilotEligibility {
  readonly priorArenaExperience: boolean;
  readonly priorOtherVariantExposure: boolean;
}
export interface InputPilotAutomatedMetrics {
  readonly trialDurationMs: number;
  readonly firstEffectiveMovementMs: number | null;
  readonly firstCorrectContextActionMs: number | null;
  readonly groundJump: InputPilotActionOutcome;
  readonly airJump: InputPilotActionOutcome;
  readonly downSmash: InputPilotActionOutcome;
}
export type InputPilotObserverReport = Readonly<Record<InputPilotObserverCounterKey, number>> &
  Readonly<{ oneHandCompleted: boolean; objectiveCompleted: boolean }>;
export type InputPilotSelfReport = Readonly<Record<InputPilotComprehensionKey, InputPilotComprehension>>;

const DEVICE_KEYS = new Set(['platform', 'formFactor', 'orientation', 'inputMode']);
const ELIGIBILITY_KEYS = new Set(['priorArenaExperience', 'priorOtherVariantExposure']);
const AUTOMATED_KEYS = new Set([
  'trialDurationMs', 'firstEffectiveMovementMs', 'firstCorrectContextActionMs',
  'groundJump', 'airJump', 'downSmash',
]);
const OBSERVER_KEYS = new Set([
  ...INPUT_PILOT_OBSERVER_COUNTER_KEYS, 'oneHandCompleted', 'objectiveCompleted',
]);
const SELF_REPORT_KEYS = new Set<string>(INPUT_PILOT_COMPREHENSION_KEYS);

function enumValue<T extends string>(value: unknown, values: Readonly<Record<string, T>>, name: string): T {
  if (typeof value !== 'string' || !new Set<string>(Object.values(values)).has(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value as T;
}
function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}
function nullableDuration(value: unknown, maximum: number, name: string): number | null {
  if (value === null) return null;
  const duration = assertIntegerAtLeast(value, 0, name);
  if (duration > maximum) throw new RangeError(`${name} 不能超过 trialDurationMs。`);
  return duration;
}

export function createInputPilotDevice(value: unknown, name = 'InputPilotRecord.device'): InputPilotEnvironment {
  assertKnownKeys(value, DEVICE_KEYS, name);
  return Object.freeze({
    platform: enumValue(value.platform, INPUT_PILOT_PLATFORM, `${name}.platform`),
    formFactor: enumValue(value.formFactor, INPUT_PILOT_FORM_FACTOR, `${name}.formFactor`),
    orientation: enumValue(value.orientation, INPUT_PILOT_ORIENTATION, `${name}.orientation`),
    inputMode: enumValue(value.inputMode, INPUT_PILOT_INPUT_MODE, `${name}.inputMode`),
  });
}
export function createInputPilotEligibility(value: unknown, name = 'InputPilotRecord.eligibility'): InputPilotEligibility {
  assertKnownKeys(value, ELIGIBILITY_KEYS, name);
  return Object.freeze({
    priorArenaExperience: booleanValue(value.priorArenaExperience, `${name}.priorArenaExperience`),
    priorOtherVariantExposure: booleanValue(value.priorOtherVariantExposure, `${name}.priorOtherVariantExposure`),
  });
}
export function createInputPilotAutomatedMetrics(
  value: unknown,
  maximumTrialDurationMs: number,
  name = 'InputPilotRecord.automated',
): InputPilotAutomatedMetrics {
  assertKnownKeys(value, AUTOMATED_KEYS, name);
  const trialDurationMs = assertIntegerAtLeast(value.trialDurationMs, 0, `${name}.trialDurationMs`);
  if (trialDurationMs > maximumTrialDurationMs) throw new RangeError(`${name}.trialDurationMs 不能超过试验最大时长。`);
  return Object.freeze({
    trialDurationMs,
    firstEffectiveMovementMs: nullableDuration(value.firstEffectiveMovementMs, trialDurationMs, `${name}.firstEffectiveMovementMs`),
    firstCorrectContextActionMs: nullableDuration(value.firstCorrectContextActionMs, trialDurationMs, `${name}.firstCorrectContextActionMs`),
    groundJump: enumValue(value.groundJump, INPUT_PILOT_ACTION_OUTCOME, `${name}.groundJump`),
    airJump: enumValue(value.airJump, INPUT_PILOT_ACTION_OUTCOME, `${name}.airJump`),
    downSmash: enumValue(value.downSmash, INPUT_PILOT_ACTION_OUTCOME, `${name}.downSmash`),
  });
}
export function createInputPilotObserverReport(value: unknown, name = 'InputPilotRecord.observer'): InputPilotObserverReport {
  assertKnownKeys(value, OBSERVER_KEYS, name);
  const counts = Object.fromEntries(INPUT_PILOT_OBSERVER_COUNTER_KEYS.map((key) => [
    key, assertIntegerAtLeast(value[key], 0, `${name}.${key}`),
  ])) as Record<InputPilotObserverCounterKey, number>;
  return Object.freeze({
    ...counts,
    oneHandCompleted: booleanValue(value.oneHandCompleted, `${name}.oneHandCompleted`),
    objectiveCompleted: booleanValue(value.objectiveCompleted, `${name}.objectiveCompleted`),
  });
}
export function createInputPilotSelfReport(value: unknown, name = 'InputPilotRecord.selfReport'): InputPilotSelfReport {
  assertKnownKeys(value, SELF_REPORT_KEYS, name);
  return Object.freeze(Object.fromEntries(INPUT_PILOT_COMPREHENSION_KEYS.map((key) => [
    key, enumValue(value[key], INPUT_PILOT_COMPREHENSION, `${name}.${key}`),
  ])) as Record<InputPilotComprehensionKey, InputPilotComprehension>);
}
