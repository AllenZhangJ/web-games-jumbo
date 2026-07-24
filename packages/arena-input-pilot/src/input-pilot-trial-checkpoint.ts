import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  createInputPilotAutomatedMetrics,
  createInputPilotDevice,
  createInputPilotEligibility,
  type InputPilotAutomatedMetrics,
  type InputPilotEligibility,
} from './input-pilot-record-fields.js';
import {
  createInputPilotDefinition,
  type InputPilotDefinition,
  type InputPilotEnvironment,
} from './input-pilot-definition.js';
import {
  validateInputPilotAssignment,
  type InputPilotAssignment,
} from './input-pilot-assignment.js';
import {
  createInputPilotReviewDraft,
  type InputPilotReviewDraft,
} from './input-pilot-review-draft.js';
import { INPUT_PILOT_TERMINATION_REASON } from './input-pilot-vocabulary.js';

export const INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION = 3;

export const INPUT_PILOT_TRIAL_PHASE = Object.freeze({
  ENROLLED: 'enrolled',
  RUNNING: 'running',
  REVIEWING: 'reviewing',
} as const);

export type InputPilotTrialPhase = typeof INPUT_PILOT_TRIAL_PHASE[
  keyof typeof INPUT_PILOT_TRIAL_PHASE
];
export type InputPilotTerminationReason = typeof INPUT_PILOT_TERMINATION_REASON[
  keyof typeof INPUT_PILOT_TERMINATION_REASON
];

export interface InputPilotTrialCheckpoint {
  readonly schemaVersion: typeof INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION;
  readonly trialId: string;
  readonly assignment: InputPilotAssignment;
  readonly phase: InputPilotTrialPhase;
  readonly terminationReason: InputPilotTerminationReason | null;
  readonly device: InputPilotEnvironment;
  readonly eligibility: InputPilotEligibility;
  readonly automated: InputPilotAutomatedMetrics | null;
  readonly reviewDraft: InputPilotReviewDraft | null;
}

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
const TRIAL_PHASE_VALUES = new Set<string>(Object.values(INPUT_PILOT_TRIAL_PHASE));
const REVIEWING_TERMINATION_REASONS = new Set<unknown>([
  INPUT_PILOT_TERMINATION_REASON.MATCH_ENDED,
  INPUT_PILOT_TERMINATION_REASON.MAXIMUM_DURATION_REACHED,
  INPUT_PILOT_TERMINATION_REASON.PARTICIPANT_ABANDONED,
]);

function trialPhase(value: unknown): InputPilotTrialPhase {
  if (typeof value !== 'string' || !TRIAL_PHASE_VALUES.has(value)) {
    throw new RangeError(`InputPilotTrialCheckpoint.phase 不受支持：${String(value)}。`);
  }
  return value as InputPilotTrialPhase;
}

export function createInputPilotTrialCheckpoint(
  definitionValue: unknown,
  value: unknown,
): InputPilotTrialCheckpoint {
  const definition: InputPilotDefinition = createInputPilotDefinition(definitionValue);
  const source = cloneFrozenData(value, 'InputPilotTrialCheckpoint');
  assertKnownKeys(source, CHECKPOINT_KEYS, 'InputPilotTrialCheckpoint');
  if (source.schemaVersion !== INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 InputPilotTrialCheckpoint schema ${String(source.schemaVersion)}。`,
    );
  }
  const phase = trialPhase(source.phase);
  if ((phase === INPUT_PILOT_TRIAL_PHASE.REVIEWING) !== (source.automated !== null)) {
    throw new RangeError('只有 reviewing checkpoint 必须且只能包含 automated 指标。');
  }
  if (phase === INPUT_PILOT_TRIAL_PHASE.REVIEWING) {
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
    phase,
    terminationReason: source.terminationReason as InputPilotTerminationReason | null,
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
    reviewDraft: phase === INPUT_PILOT_TRIAL_PHASE.REVIEWING
      ? createInputPilotReviewDraft(source.reviewDraft)
      : null,
  });
}
