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

export const INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION = 1;

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
  'device',
  'eligibility',
  'automated',
]);

function phase(value) {
  if (!Object.values(INPUT_PILOT_TRIAL_PHASE).includes(value)) {
    throw new RangeError(`InputPilotTrialCheckpoint.phase 不受支持：${String(value)}。`);
  }
  return value;
}

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
  return Object.freeze({
    schemaVersion: INPUT_PILOT_TRIAL_CHECKPOINT_SCHEMA_VERSION,
    trialId: assertNonEmptyString(source.trialId, 'InputPilotTrialCheckpoint.trialId'),
    assignment: validateInputPilotAssignment(definition, source.assignment),
    phase: trialPhase,
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
  });
}
