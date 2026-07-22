import { assertNonEmptyString } from '@number-strategy-jump/arena-contracts';
import { validateInputPilotAssignment } from '@number-strategy-jump/arena-input-pilot';
import { createInputPilotDefinition } from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_RECORD_SCHEMA_VERSION,
  INPUT_PILOT_TRIAL_STATUS,
  createInputPilotRecord,
} from '@number-strategy-jump/arena-input-pilot';
import {
  INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
  INPUT_PILOT_TRIAL_PHASE,
  createInputPilotTrialCheckpoint,
} from './input-pilot-trial-checkpoint.js';
import { createInputPilotReviewDraft } from '@number-strategy-jump/arena-input-pilot';

function trialIdFor(assignment) {
  return `pilot-trial-${assignment.assignmentId.replace(/^pilot-assignment-/, '')}`;
}

export function createEnrolledInputPilotTrial(definitionValue, {
  assignment: assignmentValue,
  device,
  eligibility,
  trialId: trialIdValue,
}) {
  const definition = createInputPilotDefinition(definitionValue);
  const assignment = validateInputPilotAssignment(definition, assignmentValue);
  return createInputPilotTrialCheckpoint(definition, {
    schemaVersion: INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
    trialId: trialIdValue === undefined
      ? trialIdFor(assignment)
      : assertNonEmptyString(trialIdValue, 'InputPilotTrial.trialId'),
    assignment,
    phase: INPUT_PILOT_TRIAL_PHASE.ENROLLED,
    terminationReason: null,
    device,
    eligibility,
    automated: null,
    reviewDraft: null,
  });
}

export function startInputPilotTrial(definitionValue, checkpointValue) {
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

export function reviewInputPilotTrial(definitionValue, checkpointValue, {
  automated,
  terminationReason,
  reviewDraft = null,
}) {
  const definition = createInputPilotDefinition(definitionValue);
  const checkpoint = createInputPilotTrialCheckpoint(definition, checkpointValue);
  if (checkpoint.phase !== INPUT_PILOT_TRIAL_PHASE.RUNNING) {
    throw new RangeError('只有 running pilot trial 可以进入 reviewing。');
  }
  return createInputPilotTrialCheckpoint(definition, {
    ...checkpoint,
    phase: INPUT_PILOT_TRIAL_PHASE.REVIEWING,
    terminationReason,
    automated,
    reviewDraft: createInputPilotReviewDraft(reviewDraft),
  });
}

export function updateInputPilotReviewDraft(definitionValue, checkpointValue, reviewDraftValue) {
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

function statusForReviewReason(reason) {
  if (reason === INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED) {
    return INPUT_PILOT_TRIAL_STATUS.COMPLETED;
  }
  if (
    reason === INPUT_PILOT_TERMINATION_REASON.MAXIMUM_DURATION_REACHED
    || reason === INPUT_PILOT_TERMINATION_REASON.PARTICIPANT_ABANDONED
  ) return INPUT_PILOT_TRIAL_STATUS.ABANDONED;
  throw new RangeError(`reviewing terminationReason ${String(reason)} 不能形成正常终态。`);
}

export function submitInputPilotTrialReview(definitionValue, checkpointValue, {
  observer,
  selfReport,
  invalidate,
} = {}) {
  const definition = createInputPilotDefinition(definitionValue);
  const checkpoint = createInputPilotTrialCheckpoint(definition, checkpointValue);
  if (checkpoint.phase !== INPUT_PILOT_TRIAL_PHASE.REVIEWING) {
    throw new RangeError('只有 reviewing pilot trial 可以提交表单。');
  }
  const draft = createInputPilotReviewDraft(
    observer === undefined && selfReport === undefined && invalidate === undefined
      ? checkpoint.reviewDraft
      : { observer, selfReport, invalidate: Boolean(invalidate) },
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

export function invalidateInputPilotTrial(definitionValue, checkpointValue, {
  terminationReason,
  automated = null,
}) {
  const definition = createInputPilotDefinition(definitionValue);
  const checkpoint = createInputPilotTrialCheckpoint(definition, checkpointValue);
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
    automated,
    observer: null,
    selfReport: null,
  });
}
