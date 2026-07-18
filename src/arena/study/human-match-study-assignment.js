import { createDeterministicDataHash } from '../../shared/deterministic-data-hash.js';
import { createRng, deriveSeed } from '../../shared/deterministic-rng.js';
import { createMatchAssignment } from '../matchmaking/match-assignment.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';
import { createHumanMatchStudyDefinition } from './human-match-study-definition.js';

export const HUMAN_MATCH_STUDY_ASSIGNMENT_SCHEMA_VERSION = 1;

const ASSIGNMENT_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'assignmentId',
  'participantId',
  'enrollmentIndex',
  'armId',
  'difficultyId',
  'matchSeeds',
]);
const MAXIMUM_SEED_SEARCH_ATTEMPTS = 1_024;

function boundedString(value, maximumLength, name) {
  const result = assertNonEmptyString(value, name);
  if (result.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 字符。`);
  }
  return result;
}

function shuffledArms(definition, blockIndex) {
  const arms = [...definition.arms];
  const rng = createRng(deriveSeed(
    definition.assignmentSeed,
    `${definition.id}:human-study-assignment-block:${blockIndex}`,
  ));
  for (let index = arms.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    [arms[index], arms[swapIndex]] = [arms[swapIndex], arms[index]];
  }
  return arms;
}

function findNaturalDifficultySeed(definition, enrollmentIndex, matchIndex, difficultyId) {
  for (let attempt = 0; attempt < MAXIMUM_SEED_SEARCH_ATTEMPTS; attempt += 1) {
    const seed = deriveSeed(
      definition.assignmentSeed,
      `${definition.id}:participant:${enrollmentIndex}:match:${matchIndex}:attempt:${attempt}`,
    );
    if (createMatchAssignment({ matchSeed: seed }).selectedDifficultyId === difficultyId) {
      return seed;
    }
  }
  throw new Error(
    `Human Match Study 无法为 enrollment ${enrollmentIndex} match ${matchIndex} `
    + `找到天然 ${difficultyId} seed。`,
  );
}

export function createHumanMatchStudyAssignment({
  definition: definitionValue,
  participantId: participantIdValue,
  enrollmentIndex: enrollmentIndexValue,
}) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const participantId = boundedString(
    participantIdValue,
    128,
    'HumanMatchStudyAssignment.participantId',
  );
  const enrollmentIndex = assertIntegerAtLeast(
    enrollmentIndexValue,
    0,
    'HumanMatchStudyAssignment.enrollmentIndex',
  );
  const blockIndex = Math.floor(enrollmentIndex / definition.arms.length);
  const positionInBlock = enrollmentIndex % definition.arms.length;
  const arm = shuffledArms(definition, blockIndex)[positionInBlock];
  const matchSeeds = Object.freeze(Array.from(
    { length: definition.matchesPerParticipant },
    (_, matchIndex) => findNaturalDifficultySeed(
      definition,
      enrollmentIndex,
      matchIndex,
      arm.difficultyId,
    ),
  ));
  if (new Set(matchSeeds).size !== matchSeeds.length) {
    throw new Error(`Human Match Study enrollment ${enrollmentIndex} 生成了重复 match seed。`);
  }
  const definitionHash = definition.getContentHash();
  const assignmentHash = createDeterministicDataHash({
    definitionHash,
    participantId,
    enrollmentIndex,
    armId: arm.id,
    difficultyId: arm.difficultyId,
    matchSeeds,
  }, 'HumanMatchStudyAssignment identity');
  return Object.freeze({
    schemaVersion: HUMAN_MATCH_STUDY_ASSIGNMENT_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash,
    assignmentId: `human-study-assignment-${assignmentHash}`,
    participantId,
    enrollmentIndex,
    armId: arm.id,
    difficultyId: arm.difficultyId,
    matchSeeds,
  });
}

export function validateHumanMatchStudyAssignment(definitionValue, value) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const source = cloneFrozenData(value, 'HumanMatchStudyAssignment');
  assertKnownKeys(source, ASSIGNMENT_KEYS, 'HumanMatchStudyAssignment');
  if (source.schemaVersion !== HUMAN_MATCH_STUDY_ASSIGNMENT_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 HumanMatchStudyAssignment schema ${String(source.schemaVersion)}。`,
    );
  }
  const expected = createHumanMatchStudyAssignment({
    definition,
    participantId: source.participantId,
    enrollmentIndex: source.enrollmentIndex,
  });
  for (const key of ASSIGNMENT_KEYS) {
    const actualValue = source[key];
    const expectedValue = expected[key];
    const matches = key === 'matchSeeds'
      ? JSON.stringify(actualValue) === JSON.stringify(expectedValue)
      : actualValue === expectedValue;
    if (!matches) {
      throw new RangeError(`HumanMatchStudyAssignment.${key} 无法由入组合同复现。`);
    }
  }
  return expected;
}

export function createHumanMatchStudyParticipantView(definitionValue, assignmentValue) {
  const assignment = validateHumanMatchStudyAssignment(definitionValue, assignmentValue);
  return Object.freeze({
    definitionId: assignment.definitionId,
    definitionHash: assignment.definitionHash,
    assignmentId: assignment.assignmentId,
    participantId: assignment.participantId,
    enrollmentIndex: assignment.enrollmentIndex,
  });
}
