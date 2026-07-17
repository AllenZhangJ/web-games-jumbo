import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import { validateInputPilotAssignment } from './input-pilot-assignment.js';
import { createInputPilotDefinition } from './input-pilot-definition.js';
import {
  createInputPilotAutomatedMetrics,
  createInputPilotDevice,
  createInputPilotEligibility,
} from './input-pilot-record-fields.js';
import { INPUT_PILOT_TERMINATION_REASON } from './input-pilot-record.js';
import { createInputPilotReviewDraft } from './input-pilot-review-draft.js';

export const INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION = 3;

export const INPUT_PILOT_TRIAL_PHASE = Object.freeze({
  ENROLLED: 'enrolled',
  RUNNING: 'running',
  REVIEWING: 'reviewing',
});

const CHECKPOINT_KEYS = new Set([
  'schemaVersion',
  'trialId',
  'assignment',
  'phase',
  'terminationReason',
  'device',
  'eligibility',
  'automated',
  'reviewDraft',
]);

function phase(value) {
  if (!Object.values(INPUT_PILOT_TRIAL_PHASE).includes(value)) {
    throw new RangeError(`InputPilotTrialCheckpoint.phase 不受支持：${String(value)}。`);
  }
  return value;
}

const REVIEWING_TERMINATION_REASONS = new Set([
  INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED,
  INPUT_PILOT_TERMINATION_REASON.MAXIMUM_DURATION_REACHED,
  INPUT_PILOT_TERMINATION_REASON.PARTICIPANT_ABANDONED,
]);

export function createInputPilotTrialCheckpoint(definitionValue, value) {
  const definition = createInputPilotDefinition(definitionValue);
  const source = cloneFrozenData(value, 'InputPilotTrialCheckpoint');
  assertKnownKeys(source, CHECKPOINT_KEYS, 'InputPilotTrialCheckpoint');
  if (source.schemaVersion !== INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 InputPilotTrialCheckpoint schema ${String(source.schemaVersion)}。`,
    );
  }
  const trialPhase = phase(source.phase);
  if (
    (trialPhase === INPUT_PILOT_TRIAL_PHASE.REVIEWING) !== (source.automated !== null)
  ) {
    throw new RangeError('只有 reviewing checkpoint 必须且只能包含 automated 指标。');
  }
  if (trialPhase === INPUT_PILOT_TRIAL_PHASE.REVIEWING) {
    if (!REVIEWING_TERMINATION_REASONS.has(source.terminationReason)) {
      throw new RangeError('reviewing checkpoint 必须包含可提交表单的终止原因。');
    }
    if (source.reviewDraft === null || source.reviewDraft === undefined) {
      throw new RangeError('reviewing checkpoint 必须包含可恢复的 reviewDraft。');
    }
  } else {
    if (source.terminationReason !== null) {
      throw new RangeError('enrolled/running checkpoint 的 terminationReason 必须为 null。');
    }
    if (source.reviewDraft !== null) {
      throw new RangeError('enrolled/running checkpoint 的 reviewDraft 必须为 null。');
    }
  }
  return Object.freeze({
    schemaVersion: INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
    trialId: assertNonEmptyString(source.trialId, 'InputPilotTrialCheckpoint.trialId'),
    assignment: validateInputPilotAssignment(definition, source.assignment),
    phase: trialPhase,
    terminationReason: source.terminationReason,
    device: createInputPilotDevice(source.device, 'InputPilotTrialCheckpoint.device'),
    eligibility: createInputPilotEligibility(
      source.eligibility,
      'InputPilotTrialCheckpoint.eligibility',
    ),
    automated: source.automated === null
      ? null
      : createInputPilotAutomatedMetrics(
        source.automated,
        definition.thresholds.maximumTrialDurationMs,
        'InputPilotTrialCheckpoint.automated',
      ),
    reviewDraft: trialPhase === INPUT_PILOT_TRIAL_PHASE.REVIEWING
      ? createInputPilotReviewDraft(source.reviewDraft)
      : null,
  });
}
