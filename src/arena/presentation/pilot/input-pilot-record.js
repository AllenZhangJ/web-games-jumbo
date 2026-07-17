import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import { createInputPilotDefinition } from './input-pilot-definition.js';
import { validateInputPilotAssignment } from './input-pilot-assignment.js';
import {
  createInputPilotAutomatedMetrics,
  createInputPilotDevice,
  createInputPilotEligibility,
  createInputPilotObserverReport,
  createInputPilotSelfReport,
} from './input-pilot-record-fields.js';

export {
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
} from './input-pilot-record-fields.js';

export const INPUT_PILOT_RECORD_SCHEMA_VERSION = 1;

export const INPUT_PILOT_TRIAL_STATUS = Object.freeze({
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  INVALIDATED: 'invalidated',
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
function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
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
    device: createInputPilotDevice(source.device),
    eligibility: createInputPilotEligibility(source.eligibility),
    automated: createInputPilotAutomatedMetrics(
      source.automated,
      definition.thresholds.maximumTrialDurationMs,
    ),
    observer: createInputPilotObserverReport(source.observer),
    selfReport: createInputPilotSelfReport(source.selfReport),
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
