import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import { HUMAN_MATCH_STUDY_ASSIGNMENT_SCHEMA_VERSION } from './human-match-study-assignment.js';
import { createHumanMatchStudyDefinition } from './human-match-study-definition.js';
import {
  HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION,
  HUMAN_MATCH_STUDY_RECEIPT_SCHEMA_VERSION,
  HUMAN_MATCH_STUDY_WORKSPACE_SCHEMA_VERSION,
  createHumanMatchStudyWorkspace,
  type HumanMatchStudyWorkspace,
} from './human-match-study-workspace.js';

export const HUMAN_MATCH_STUDY_WORKSPACE_ENVELOPE_SCHEMA_VERSION = 1;

export interface HumanMatchStudyWorkspaceEnvelope {
  readonly schemaVersion: 1;
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly generation: number;
  readonly payloadHash: string;
  readonly payload: HumanMatchStudyWorkspace;
}

export interface ValidatedHumanMatchStudyWorkspaceEnvelope {
  readonly envelope: HumanMatchStudyWorkspaceEnvelope;
  readonly workspace: HumanMatchStudyWorkspace;
}

const ENVELOPE_KEYS = new Set([
  'schemaVersion', 'definitionId', 'definitionHash', 'generation', 'payloadHash', 'payload',
]);

function assertNotFuture(value: unknown, current: number, name: string): void {
  if (Number.isSafeInteger(value) && (value as number) > current) {
    throw new RangeError(`${name} 来自未来 schema。`);
  }
}

function recordOrNull(value: unknown): PlainRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as PlainRecord
    : null;
}

export function createHumanMatchStudyWorkspaceEnvelope(
  definitionValue: unknown,
  workspaceValue: unknown,
): HumanMatchStudyWorkspaceEnvelope {
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

export function validateHumanMatchStudyWorkspaceEnvelope(
  definitionValue: unknown,
  value: unknown,
): ValidatedHumanMatchStudyWorkspaceEnvelope {
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
  const payloadHash = createDeterministicDataHash(workspace, 'HumanMatchStudyWorkspace payload');
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
export function assertHumanMatchStudyWorkspaceEnvelopeHasNoFutureSchema(value: unknown): true {
  let cloned: unknown;
  try {
    cloned = cloneFrozenData(value, 'HumanMatchStudyWorkspace version probe');
  } catch {
    return true;
  }
  const source = recordOrNull(cloned);
  assertNotFuture(
    source?.schemaVersion,
    HUMAN_MATCH_STUDY_WORKSPACE_ENVELOPE_SCHEMA_VERSION,
    'HumanMatchStudyWorkspace envelope',
  );
  const workspace = recordOrNull(source?.payload);
  assertNotFuture(
    workspace?.schemaVersion,
    HUMAN_MATCH_STUDY_WORKSPACE_SCHEMA_VERSION,
    'HumanMatchStudyWorkspace',
  );
  const activeTrial = recordOrNull(workspace?.activeTrial);
  if (activeTrial !== null) {
    assertNotFuture(
      activeTrial.schemaVersion,
      HUMAN_MATCH_STUDY_CHECKPOINT_SCHEMA_VERSION,
      'HumanMatchStudyWorkspace.activeTrial',
    );
    const assignment = recordOrNull(activeTrial.assignment);
    assertNotFuture(
      assignment?.schemaVersion,
      HUMAN_MATCH_STUDY_ASSIGNMENT_SCHEMA_VERSION,
      'HumanMatchStudyWorkspace.activeTrial.assignment',
    );
  }
  const receipts = workspace?.receipts;
  if (Array.isArray(receipts)) {
    receipts.forEach((receiptValue, index) => {
      const receipt = recordOrNull(receiptValue);
      assertNotFuture(
        receipt?.schemaVersion,
        HUMAN_MATCH_STUDY_RECEIPT_SCHEMA_VERSION,
        `HumanMatchStudyWorkspace.receipts[${index}]`,
      );
      const assignment = recordOrNull(receipt?.assignment);
      assertNotFuture(
        assignment?.schemaVersion,
        HUMAN_MATCH_STUDY_ASSIGNMENT_SCHEMA_VERSION,
        `HumanMatchStudyWorkspace.receipts[${index}].assignment`,
      );
    });
  }
  return true;
}
