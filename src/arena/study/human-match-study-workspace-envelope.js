import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { HUMAN_MATCH_STUDY_ASSIGNMENT_SCHEMA_VERSION } from './human-match-study-assignment.js';
import { createHumanMatchStudyDefinition } from './human-match-study-definition.js';
import {
  HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION,
  HUMAN_MATCH_STUDY_RECEIPT_SCHEMA_VERSION,
  HUMAN_MATCH_STUDY_WORKSPACE_SCHEMA_VERSION,
  createHumanMatchStudyWorkspace,
} from './human-match-study-workspace.js';

export const HUMAN_MATCH_STUDY_WORKSPACE_ENVELOPE_SCHEMA_VERSION = 1;

const ENVELOPE_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'generation',
  'payloadHash',
  'payload',
]);

function assertNotFuture(value, current, name) {
  if (Number.isSafeInteger(value) && value > current) {
    throw new RangeError(`${name} 来自未来 schema。`);
  }
}

export function createHumanMatchStudyWorkspaceEnvelope(definitionValue, workspaceValue) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const workspace = createHumanMatchStudyWorkspace(definition, workspaceValue);
  return cloneFrozenData({
    schemaVersion: HUMAN_MATCH_STUDY_WORKSPACE_ENVELOPE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    generation: workspace.revision,
    payloadHash: createDeterministicDataHash(workspace, 'HumanMatchStudyWorkspace payload'),
    payload: workspace,
  }, 'HumanMatchStudyWorkspace envelope');
}

export function validateHumanMatchStudyWorkspaceEnvelope(definitionValue, value) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const source = cloneFrozenData(value, 'HumanMatchStudyWorkspace envelope');
  assertKnownKeys(source, ENVELOPE_KEYS, 'HumanMatchStudyWorkspace envelope');
  if (source.schemaVersion !== HUMAN_MATCH_STUDY_WORKSPACE_ENVELOPE_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 HumanMatchStudyWorkspace envelope schema ${String(source.schemaVersion)}。`,
    );
  }
  if (
    source.definitionId !== definition.id
    || source.definitionHash !== definition.getContentHash()
  ) throw new RangeError('HumanMatchStudyWorkspace envelope 与当前 Definition 不一致。');
  const generation = assertIntegerAtLeast(
    source.generation,
    0,
    'HumanMatchStudyWorkspace envelope.generation',
  );
  const workspace = createHumanMatchStudyWorkspace(definition, source.payload);
  if (workspace.revision !== generation) {
    throw new RangeError('HumanMatchStudyWorkspace envelope generation/revision 不一致。');
  }
  const payloadHash = createDeterministicDataHash(
    workspace,
    'HumanMatchStudyWorkspace payload',
  );
  if (source.payloadHash !== payloadHash) {
    throw new RangeError('HumanMatchStudyWorkspace envelope payload hash 不一致。');
  }
  return Object.freeze({
    envelope: createHumanMatchStudyWorkspaceEnvelope(definition, workspace),
    workspace,
  });
}

/**
 * Malformed current/older data may be recovered from the other slot, but an
 * older collector must never silently discard a nested schema it cannot read.
 */
export function assertHumanMatchStudyWorkspaceEnvelopeHasNoFutureSchema(value) {
  let source;
  try {
    source = cloneFrozenData(value, 'HumanMatchStudyWorkspace version probe');
  } catch {
    return true;
  }
  assertNotFuture(
    source?.schemaVersion,
    HUMAN_MATCH_STUDY_WORKSPACE_ENVELOPE_SCHEMA_VERSION,
    'HumanMatchStudyWorkspace envelope',
  );
  const workspace = source?.payload;
  assertNotFuture(
    workspace?.schemaVersion,
    HUMAN_MATCH_STUDY_WORKSPACE_SCHEMA_VERSION,
    'HumanMatchStudyWorkspace',
  );
  if (workspace?.activeTrial && typeof workspace.activeTrial === 'object') {
    assertNotFuture(
      workspace.activeTrial.schemaVersion,
      HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION,
      'HumanMatchStudyWorkspace.activeTrial',
    );
    assertNotFuture(
      workspace.activeTrial.assignment?.schemaVersion,
      HUMAN_MATCH_STUDY_ASSIGNMENT_SCHEMA_VERSION,
      'HumanMatchStudyWorkspace.activeTrial.assignment',
    );
  }
  if (Array.isArray(workspace?.receipts)) {
    workspace.receipts.forEach((receipt, index) => {
      assertNotFuture(
        receipt?.schemaVersion,
        HUMAN_MATCH_STUDY_RECEIPT_SCHEMA_VERSION,
        `HumanMatchStudyWorkspace.receipts[${index}]`,
      );
      assertNotFuture(
        receipt?.assignment?.schemaVersion,
        HUMAN_MATCH_STUDY_ASSIGNMENT_SCHEMA_VERSION,
        `HumanMatchStudyWorkspace.receipts[${index}].assignment`,
      );
    });
  }
  return true;
}
