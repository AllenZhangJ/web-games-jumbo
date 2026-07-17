import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import { createRng, deriveSeed } from '../../../shared/deterministic-rng.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import { createInputPilotDefinition } from './input-pilot-definition.js';

export const INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION = 2;

const ASSIGNMENT_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'assignmentId',
  'assignmentSeed',
  'matchSeed',
  'participantId',
  'enrollmentIndex',
  'variantId',
  'mapperId',
]);

function shuffledVariants(definition, assignmentSeed, blockIndex) {
  const variants = [...definition.variants];
  const rng = createRng(deriveSeed(
    assignmentSeed,
    `${definition.id}:assignment-block:${blockIndex}`,
  ));
  for (let index = variants.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    const temporary = variants[index];
    variants[index] = variants[swapIndex];
    variants[swapIndex] = temporary;
  }
  return variants;
}

export function createInputPilotAssignment({
  definition: definitionValue,
  participantId: participantIdValue,
  enrollmentIndex: enrollmentIndexValue,
}) {
  const definition = createInputPilotDefinition(definitionValue);
  const assignmentSeed = definition.assignmentSeed;
  const participantId = assertNonEmptyString(
    participantIdValue,
    'InputPilotAssignment.participantId',
  );
  const enrollmentIndex = assertIntegerAtLeast(
    enrollmentIndexValue,
    0,
    'InputPilotAssignment.enrollmentIndex',
  );
  const blockIndex = Math.floor(enrollmentIndex / definition.variants.length);
  const positionInBlock = enrollmentIndex % definition.variants.length;
  const variant = shuffledVariants(definition, assignmentSeed, blockIndex)[positionInBlock];
  const matchSeed = deriveSeed(
    assignmentSeed,
    `${definition.id}:match-seed-block:${blockIndex}`,
  );
  const definitionHash = definition.getContentHash();
  const assignmentHash = createDeterministicDataHash({
    definitionHash,
    assignmentSeed,
    matchSeed,
    participantId,
    enrollmentIndex,
  }, 'InputPilotAssignment identity');
  return Object.freeze({
    schemaVersion: INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash,
    assignmentId: `pilot-assignment-${assignmentHash}`,
    assignmentSeed,
    matchSeed,
    participantId,
    enrollmentIndex,
    variantId: variant.id,
    mapperId: variant.mapperId,
  });
}

export function validateInputPilotAssignment(definitionValue, value) {
  const definition = createInputPilotDefinition(definitionValue);
  const source = cloneFrozenData(value, 'InputPilotAssignment');
  assertKnownKeys(source, ASSIGNMENT_KEYS, 'InputPilotAssignment');
  if (source.schemaVersion !== INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 InputPilotAssignment schema ${String(source.schemaVersion)}。`,
    );
  }
  const expected = createInputPilotAssignment({
    definition,
    participantId: source.participantId,
    enrollmentIndex: source.enrollmentIndex,
  });
  for (const key of ASSIGNMENT_KEYS) {
    if (source[key] !== expected[key]) {
      throw new RangeError(`InputPilotAssignment.${key} 无法由分组合同复现。`);
    }
  }
  return expected;
}
