import { assertKnownKeys, assertNonEmptyString, cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { validateInputPilotAssignment, type InputPilotAssignment } from './input-pilot-assignment.js';
import { createInputPilotDefinition, type InputPilotDefinition } from './input-pilot-definition.js';
import {
  createInputPilotAutomatedMetrics,
  createInputPilotDevice,
  createInputPilotEligibility,
  createInputPilotObserverReport,
  createInputPilotSelfReport,
  type InputPilotAutomatedMetrics,
  type InputPilotEligibility,
  type InputPilotObserverReport,
  type InputPilotSelfReport,
} from './input-pilot-record-fields.js';
import {
  INPUT_PILOT_EXCLUSION_REASON,
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_STATUS,
} from './input-pilot-vocabulary.js';

export * from './input-pilot-record-fields.js';
export { INPUT_PILOT_EXCLUSION_REASON, INPUT_PILOT_TERMINATION_REASON, INPUT_PILOT_TRIAL_STATUS } from './input-pilot-vocabulary.js';
export const INPUT_PILOT_RECORD_SCHEMA_VERSION = 2;

type TrialStatus = typeof INPUT_PILOT_TRIAL_STATUS[keyof typeof INPUT_PILOT_TRIAL_STATUS];
type TerminationReason = typeof INPUT_PILOT_TERMINATION_REASON[
  keyof typeof INPUT_PILOT_TERMINATION_REASON
];
type ExclusionReason = typeof INPUT_PILOT_EXCLUSION_REASON[keyof typeof INPUT_PILOT_EXCLUSION_REASON];

export interface InputPilotRecord {
  readonly schemaVersion: number;
  readonly trialId: string;
  readonly assignment: InputPilotAssignment;
  readonly trialStatus: TrialStatus;
  readonly terminationReason: TerminationReason;
  readonly device: InputPilotDefinition['environment'];
  readonly eligibility: InputPilotEligibility;
  readonly automated: InputPilotAutomatedMetrics | null;
  readonly observer: InputPilotObserverReport | null;
  readonly selfReport: InputPilotSelfReport | null;
}

const TERMINATION_REASONS_BY_STATUS: Readonly<Record<TrialStatus, ReadonlySet<TerminationReason>>> = Object.freeze({
  [INPUT_PILOT_TRIAL_STATUS.COMPLETED]: new Set([INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED]),
  [INPUT_PILOT_TRIAL_STATUS.ABANDONED]: new Set([
    INPUT_PILOT_TERMINATION_REASON.MAXIMUM_DURATION_REACHED,
    INPUT_PILOT_TERMINATION_REASON.PARTICIPANT_ABANDONED,
  ]),
  [INPUT_PILOT_TRIAL_STATUS.INVALIDATED]: new Set([
    INPUT_PILOT_TERMINATION_REASON.RUNNING_RECOVERED,
    INPUT_PILOT_TERMINATION_REASON.RUNTIME_FAILED,
    INPUT_PILOT_TERMINATION_REASON.PROTOCOL_DEVIATION,
  ]),
});
const RECORD_KEYS = new Set([
  'schemaVersion', 'trialId', 'assignment', 'trialStatus', 'terminationReason',
  'device', 'eligibility', 'automated', 'observer', 'selfReport',
]);

function enumValue<T extends string>(value: unknown, values: Readonly<Record<string, T>>, name: string): T {
  if (typeof value !== 'string' || !new Set<string>(Object.values(values)).has(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value as T;
}
function nullableEvidence<T>(value: unknown, create: (item: unknown, name: string) => T, name: string): T | null {
  return value === null ? null : create(value, name);
}

export function createInputPilotRecord(definitionValue: unknown, value: unknown): InputPilotRecord {
  const definition = createInputPilotDefinition(definitionValue);
  const source = cloneFrozenData(value, 'InputPilotRecord');
  assertKnownKeys(source, RECORD_KEYS, 'InputPilotRecord');
  if (source.schemaVersion !== INPUT_PILOT_RECORD_SCHEMA_VERSION) {
    throw new RangeError(`不支持 InputPilotRecord schema ${String(source.schemaVersion)}。`);
  }
  const trialStatus = enumValue(source.trialStatus, INPUT_PILOT_TRIAL_STATUS, 'InputPilotRecord.trialStatus');
  const terminationReason = enumValue(source.terminationReason, INPUT_PILOT_TERMINATION_REASON, 'InputPilotRecord.terminationReason');
  if (!TERMINATION_REASONS_BY_STATUS[trialStatus].has(terminationReason)) {
    throw new RangeError(`InputPilotRecord.terminationReason ${terminationReason} 与 ${trialStatus} 不一致。`);
  }
  const automated = nullableEvidence(
    source.automated,
    (item, name) => createInputPilotAutomatedMetrics(item, definition.thresholds.maximumTrialDurationMs, name),
    'InputPilotRecord.automated',
  );
  const observer = nullableEvidence(source.observer, createInputPilotObserverReport, 'InputPilotRecord.observer');
  const selfReport = nullableEvidence(source.selfReport, createInputPilotSelfReport, 'InputPilotRecord.selfReport');
  if (trialStatus !== INPUT_PILOT_TRIAL_STATUS.INVALIDATED && (!automated || !observer || !selfReport)) {
    throw new RangeError('completed/abandoned InputPilotRecord 必须包含完整三类证据。');
  }
  if ((observer === null) !== (selfReport === null)) {
    throw new RangeError('InputPilotRecord 的观察与自评证据必须同时存在或同时缺失。');
  }
  return Object.freeze({
    schemaVersion: INPUT_PILOT_RECORD_SCHEMA_VERSION,
    trialId: assertNonEmptyString(source.trialId, 'InputPilotRecord.trialId'),
    assignment: validateInputPilotAssignment(definition, source.assignment),
    trialStatus,
    terminationReason,
    device: createInputPilotDevice(source.device),
    eligibility: createInputPilotEligibility(source.eligibility),
    automated,
    observer,
    selfReport,
  });
}

export function getInputPilotRecordExclusionReasons(
  definitionValue: unknown,
  recordValue: unknown,
): readonly ExclusionReason[] {
  const definition = createInputPilotDefinition(definitionValue);
  const record = createInputPilotRecord(definition, recordValue);
  const reasons: ExclusionReason[] = [];
  if (record.trialStatus === INPUT_PILOT_TRIAL_STATUS.INVALIDATED) reasons.push(INPUT_PILOT_EXCLUSION_REASON.INVALIDATED);
  if (record.eligibility.priorArenaExperience) reasons.push(INPUT_PILOT_EXCLUSION_REASON.PRIOR_ARENA_EXPERIENCE);
  if (record.eligibility.priorOtherVariantExposure) reasons.push(INPUT_PILOT_EXCLUSION_REASON.PRIOR_OTHER_VARIANT_EXPOSURE);
  const environmentChecks = [
    ['platform', INPUT_PILOT_EXCLUSION_REASON.PLATFORM_MISMATCH],
    ['formFactor', INPUT_PILOT_EXCLUSION_REASON.FORM_FACTOR_MISMATCH],
    ['orientation', INPUT_PILOT_EXCLUSION_REASON.ORIENTATION_MISMATCH],
    ['inputMode', INPUT_PILOT_EXCLUSION_REASON.INPUT_MODE_MISMATCH],
  ] as const;
  for (const [field, reason] of environmentChecks) {
    if (record.device[field] !== definition.environment[field]) reasons.push(reason);
  }
  return Object.freeze(reasons);
}
