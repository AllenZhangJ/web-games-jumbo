import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import { createInputPilotDefinition } from './input-pilot-definition.js';
import {
  assertInputPilotWorkspaceHasNoFutureSchema,
  createInputPilotWorkspace,
  type InputPilotWorkspace,
} from './input-pilot-workspace.js';

export const INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION = 1;

export interface InputPilotWorkspaceEnvelope {
  readonly schemaVersion: typeof INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION;
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly generation: number;
  readonly payloadHash: string;
  readonly payload: InputPilotWorkspace;
}

export interface ValidatedInputPilotWorkspaceEnvelope {
  readonly envelope: InputPilotWorkspaceEnvelope;
  readonly workspace: InputPilotWorkspace;
}

const ENVELOPE_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'generation',
  'payloadHash',
  'payload',
]);

export function createInputPilotWorkspaceEnvelope(
  definitionValue: unknown,
  workspaceValue: unknown,
): InputPilotWorkspaceEnvelope {
  const definition = createInputPilotDefinition(definitionValue);
  const workspace = createInputPilotWorkspace(definition, workspaceValue);
  return cloneFrozenData({
    schemaVersion: INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    generation: workspace.revision,
    payloadHash: createDeterministicDataHash(workspace, 'InputPilotWorkspace payload'),
    payload: workspace,
  }, 'InputPilotWorkspace envelope') as InputPilotWorkspaceEnvelope;
}

export function validateInputPilotWorkspaceEnvelope(
  definitionValue: unknown,
  value: unknown,
): ValidatedInputPilotWorkspaceEnvelope {
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
export function assertInputPilotWorkspaceEnvelopeHasNoFutureSchema(value: unknown): true {
  let source: Record<string, unknown> | null = null;
  try {
    const cloned = cloneFrozenData(value, 'InputPilotWorkspace envelope version probe');
    if (cloned && typeof cloned === 'object' && !Array.isArray(cloned)) {
      source = cloned as Record<string, unknown>;
    }
  } catch {
    return true;
  }
  if (
    Number.isSafeInteger(source?.schemaVersion)
    && (source?.schemaVersion as number) > INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION
  ) throw new RangeError('InputPilotWorkspace envelope 来自未来 schema。');
  if (source?.schemaVersion === INPUT_PILOT_WORKSPACE_ENVELOPE_SCHEMA_VERSION) {
    assertInputPilotWorkspaceHasNoFutureSchema(source.payload);
  }
  return true;
}
