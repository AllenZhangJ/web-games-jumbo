import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
  createRng,
  deriveSeed,
} from '@number-strategy-jump/arena-contracts';
import {
  createInputPilotDefinition,
  type InputPilotDefinition,
} from './input-pilot-definition.js';

export const INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION = 2;

export interface InputPilotAssignment {
  readonly schemaVersion: number;
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly assignmentId: string;
  readonly assignmentSeed: number;
  readonly matchSeed: number;
  readonly participantId: string;
  readonly enrollmentIndex: number;
  readonly variantId: string;
  readonly mapperId: string;
}

const ASSIGNMENT_OPTION_KEYS = new Set(['definition', 'participantId', 'enrollmentIndex']);
const ASSIGNMENT_KEYS = new Set<keyof InputPilotAssignment>([
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

function shuffledVariants(
  definition: InputPilotDefinition,
  assignmentSeed: number,
  blockIndex: number,
) {
  const variants = [...definition.variants];
  const rng = createRng(deriveSeed(
    assignmentSeed,
    `${definition.id}:assignment-block:${blockIndex}`,
  ));
  for (let index = variants.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    const temporary = variants[index];
    const swapValue = variants[swapIndex];
    if (!temporary || !swapValue) throw new Error('Input Pilot variant block 不完整。');
    variants[index] = swapValue;
    variants[swapIndex] = temporary;
  }
  return variants;
}

export function createInputPilotAssignment(optionsValue: unknown): InputPilotAssignment {
  const options = optionsValue;
  assertKnownKeys(options, ASSIGNMENT_OPTION_KEYS, 'InputPilotAssignment options');
  const definition = createInputPilotDefinition(options.definition);
  const assignmentSeed = definition.assignmentSeed;
  const participantId = assertNonEmptyString(
    options.participantId,
    'InputPilotAssignment.participantId',
  );
  const enrollmentIndex = assertIntegerAtLeast(
    options.enrollmentIndex,
    0,
    'InputPilotAssignment.enrollmentIndex',
  );
  const blockIndex = Math.floor(enrollmentIndex / definition.variants.length);
  const positionInBlock = enrollmentIndex % definition.variants.length;
  const variant = shuffledVariants(definition, assignmentSeed, blockIndex)[positionInBlock];
  if (!variant) throw new Error('Input Pilot assignment 未选中 variant。');
  const matchSeed = deriveSeed(assignmentSeed, `${definition.id}:match-seed-block:${blockIndex}`);
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

export function validateInputPilotAssignment(
  definitionValue: unknown,
  value: unknown,
): InputPilotAssignment {
  const definition = createInputPilotDefinition(definitionValue);
  const source = cloneFrozenData(value, 'InputPilotAssignment');
  assertKnownKeys(source, ASSIGNMENT_KEYS, 'InputPilotAssignment');
  if (source.schemaVersion !== INPUT_PILOT_ASSIGNMENT_SCHEMA_VERSION) {
    throw new RangeError(`不支持 InputPilotAssignment schema ${String(source.schemaVersion)}。`);
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
