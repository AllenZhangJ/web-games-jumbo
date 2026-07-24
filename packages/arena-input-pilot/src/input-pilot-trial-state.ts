import {
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  validateInputPilotAssignment,
  type InputPilotAssignment,
} from './input-pilot-assignment.js';
import { createInputPilotDefinition } from './input-pilot-definition.js';
import {
  INPUT_PILOT_RECORD_SCHEMA_VERSION,
  createInputPilotRecord,
  type InputPilotRecord,
} from './input-pilot-record.js';
import { createInputPilotReviewDraft } from './input-pilot-review-draft.js';
import {
  INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
  INPUT_PILOT_TRIAL_PHASE,
  createInputPilotTrialCheckpoint,
  type InputPilotTerminationReason,
  type InputPilotTrialCheckpoint,
} from './input-pilot-trial-checkpoint.js';
import {
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_STATUS,
} from './input-pilot-vocabulary.js';

const ENROLL_KEYS = new Set(['assignment', 'device', 'eligibility', 'trialId']);
const REVIEW_KEYS = new Set(['automated', 'terminationReason', 'reviewDraft']);
const SUBMISSION_KEYS = new Set(['observer', 'selfReport', 'invalidate']);
const INVALIDATION_KEYS = new Set(['terminationReason', 'automated']);

function trialIdFor(assignment: InputPilotAssignment): string {
  return `pilot-trial-${assignment.assignmentId.replace(/^pilot-assignment-/, '')}`;
}

export function createEnrolledInputPilotTrial(
  definitionValue: unknown,
  optionsValue: unknown,
): InputPilotTrialCheckpoint {
  assertKnownKeys(optionsValue, ENROLL_KEYS, 'createEnrolledInputPilotTrial options');
  const definition = createInputPilotDefinition(definitionValue);
  const assignment = validateInputPilotAssignment(definition, optionsValue.assignment);
  return createInputPilotTrialCheckpoint(definition, {
    schemaVersion: INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
    trialId: optionsValue.trialId === undefined
      ? trialIdFor(assignment)
      : assertNonEmptyString(optionsValue.trialId, 'InputPilotTrial.trialId'),
    assignment,
    phase: INPUT_PILOT_TRIAL_PHASE.ENROLLED,
    terminationReason: null,
    device: optionsValue.device,
    eligibility: optionsValue.eligibility,
    automated: null,
    reviewDraft: null,
  });
}

export function startInputPilotTrial(
  definitionValue: unknown,
  checkpointValue: unknown,
): InputPilotTrialCheckpoint {
  const definition = createInputPilotDefinition(definitionValue);
  const checkpoint = createInputPilotTrialCheckpoint(definition, checkpointValue);
  if (checkpoint.phase !== INPUT_PILOT_TRIAL_PHASE.ENROLLED) {
    throw new RangeError('只有 enrolled pilot trial 可以进入 running。');
  }
  return createInputPilotTrialCheckpoint(definition, {
    ...checkpoint,
    phase: INPUT_PILOT_TRIAL_PHASE.RUNNING,
  });
}

export function reviewInputPilotTrial(
  definitionValue: unknown,
  checkpointValue: unknown,
  optionsValue: unknown,
): InputPilotTrialCheckpoint {
  assertKnownKeys(optionsValue, REVIEW_KEYS, 'reviewInputPilotTrial options');
  const definition = createInputPilotDefinition(definitionValue);
  const checkpoint = createInputPilotTrialCheckpoint(definition, checkpointValue);
  if (checkpoint.phase !== INPUT_PILOT_TRIAL_PHASE.RUNNING) {
    throw new RangeError('只有 running pilot trial 可以进入 reviewing。');
  }
  return createInputPilotTrialCheckpoint(definition, {
    ...checkpoint,
    phase: INPUT_PILOT_TRIAL_PHASE.REVIEWING,
    terminationReason: optionsValue.terminationReason,
    automated: optionsValue.automated,
    reviewDraft: createInputPilotReviewDraft(optionsValue.reviewDraft),
  });
}

export function updateInputPilotReviewDraft(
  definitionValue: unknown,
  checkpointValue: unknown,
  reviewDraftValue: unknown,
): InputPilotTrialCheckpoint {
  const definition = createInputPilotDefinition(definitionValue);
  const checkpoint = createInputPilotTrialCheckpoint(definition, checkpointValue);
  if (checkpoint.phase !== INPUT_PILOT_TRIAL_PHASE.REVIEWING) {
    throw new RangeError('只有 reviewing pilot trial 可以更新 reviewDraft。');
  }
  return createInputPilotTrialCheckpoint(definition, {
    ...checkpoint,
    reviewDraft: createInputPilotReviewDraft(reviewDraftValue),
  });
}

function statusForReviewReason(reason: InputPilotTerminationReason | null) {
  if (reason === INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED) {
    return INPUT_PILOT_TRIAL_STATUS.COMPLETED;
  }
  if (
    reason === INPUT_PILOT_TERMINATION_REASON.MAXIMUM_DURATION_REACHED
    || reason === INPUT_PILOT_TERMINATION_REASON.PARTICIPANT_ABANDONED
  ) return INPUT_PILOT_TRIAL_STATUS.ABANDONED;
  throw new RangeError(`reviewing terminationReason ${String(reason)} 不能形成正常终态。`);
}

export function submitInputPilotTrialReview(
  definitionValue: unknown,
  checkpointValue: unknown,
  submissionValue: unknown = {},
): InputPilotRecord {
  assertKnownKeys(submissionValue, SUBMISSION_KEYS, 'submitInputPilotTrialReview submission');
  const definition = createInputPilotDefinition(definitionValue);
  const checkpoint = createInputPilotTrialCheckpoint(definition, checkpointValue);
  if (checkpoint.phase !== INPUT_PILOT_TRIAL_PHASE.REVIEWING) {
    throw new RangeError('只有 reviewing pilot trial 可以提交表单。');
  }
  const draft = createInputPilotReviewDraft(
    submissionValue.observer === undefined
      && submissionValue.selfReport === undefined
      && submissionValue.invalidate === undefined
      ? checkpoint.reviewDraft
      : {
        observer: submissionValue.observer,
        selfReport: submissionValue.selfReport,
        invalidate: submissionValue.invalidate,
      },
  );
  return createInputPilotRecord(definition, {
    schemaVersion: INPUT_PILOT_RECORD_SCHEMA_VERSION,
    trialId: checkpoint.trialId,
    assignment: checkpoint.assignment,
    trialStatus: draft.invalidate
      ? INPUT_PILOT_TRIAL_STATUS.INVALIDATED
      : statusForReviewReason(checkpoint.terminationReason),
    terminationReason: draft.invalidate
      ? INPUT_PILOT_TERMINATION_REASON.PROTOCOL_DEVIATION
      : checkpoint.terminationReason,
    device: checkpoint.device,
    eligibility: checkpoint.eligibility,
    automated: checkpoint.automated,
    observer: draft.observer,
    selfReport: draft.selfReport,
  });
}

export function invalidateInputPilotTrial(
  definitionValue: unknown,
  checkpointValue: unknown,
  optionsValue: unknown,
): InputPilotRecord {
  assertKnownKeys(optionsValue, INVALIDATION_KEYS, 'invalidateInputPilotTrial options');
  const definition = createInputPilotDefinition(definitionValue);
  const checkpoint = createInputPilotTrialCheckpoint(definition, checkpointValue);
  const terminationReason = optionsValue.terminationReason;
  if (
    terminationReason !== INPUT_PILOT_TERMINATION_REASON.RUNNING_RECOVERED
    && terminationReason !== INPUT_PILOT_TERMINATION_REASON.RUNTIME_FAILED
    && terminationReason !== INPUT_PILOT_TERMINATION_REASON.PROTOCOL_DEVIATION
  ) throw new RangeError('pilot invalidation 必须使用作废终止原因。');
  return createInputPilotRecord(definition, {
    schemaVersion: INPUT_PILOT_RECORD_SCHEMA_VERSION,
    trialId: checkpoint.trialId,
    assignment: checkpoint.assignment,
    trialStatus: INPUT_PILOT_TRIAL_STATUS.INVALIDATED,
    terminationReason,
    device: checkpoint.device,
    eligibility: checkpoint.eligibility,
    automated: optionsValue.automated ?? null,
    observer: null,
    selfReport: null,
  });
}
