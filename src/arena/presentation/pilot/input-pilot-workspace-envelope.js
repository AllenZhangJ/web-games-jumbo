import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertInputPilotWorkspaceHasNoFutureSchema,
  createInputPilotWorkspace,
} from './input-pilot-workspace.js';
import { createInputPilotDefinition } from '@number-strategy-jump/arena-input-pilot';

export const INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION = 1;

const ENVELOPE_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'generation',
  'payloadHash',
  'payload',
]);

export function createInputPilotWorkspaceEnvelope(definitionValue, workspaceValue) {
  const definition = createInputPilotDefinition(definitionValue);
  const workspace = createInputPilotWorkspace(definition, workspaceValue);
  return cloneFrozenData({
    schemaVersion: INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    generation: workspace.revision,
    payloadHash: createDeterministicDataHash(workspace, 'InputPilotWorkspace payload'),
    payload: workspace,
  }, 'InputPilotWorkspace envelope');
}

export function validateInputPilotWorkspaceEnvelope(definitionValue, value) {
  const definition = createInputPilotDefinition(definitionValue);
  const source = cloneFrozenData(value, 'InputPilotWorkspace envelope');
  assertKnownKeys(source, ENVELOPE_KEYS, 'InputPilotWorkspace envelope');
  if (source.schemaVersion !== INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 InputPilotWorkspace envelope schema ${String(source.schemaVersion)}。`,
    );
  }
  if (
    source.definitionId !== definition.id
    || source.definitionHash !== definition.getContentHash()
  ) throw new RangeError('InputPilotWorkspace envelope 与当前 Definition 不一致。');
  const generation = assertIntegerAtLeast(
    source.generation,
    0,
    'InputPilotWorkspace envelope.generation',
  );
  const workspace = createInputPilotWorkspace(definition, source.payload);
  if (workspace.revision !== generation) {
    throw new RangeError('InputPilotWorkspace envelope generation 与 payload revision 不一致。');
  }
  const expectedHash = createDeterministicDataHash(workspace, 'InputPilotWorkspace payload');
  if (source.payloadHash !== expectedHash) {
    throw new RangeError('InputPilotWorkspace envelope payload hash 不一致。');
  }
  return Object.freeze({
    envelope: createInputPilotWorkspaceEnvelope(definition, workspace),
    workspace,
  });
}

/**
 * Returns normally for current, older or malformed data. It throws only when
 * an envelope or any nested workspace value is from a future schema, allowing
 * the repository to distinguish protected future data from recoverable damage.
 */
export function assertInputPilotWorkspaceEnvelopeHasNoFutureSchema(value) {
  let source;
  try {
    source = cloneFrozenData(value, 'InputPilotWorkspace envelope version probe');
  } catch {
    return true;
  }
  if (
    Number.isSafeInteger(source?.schemaVersion)
    && source.schemaVersion > INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION
  ) throw new RangeError('InputPilotWorkspace envelope 来自未来 schema。');
  if (source?.schemaVersion === INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION) {
    assertInputPilotWorkspaceHasNoFutureSchema(source.payload);
  }
  return true;
}
