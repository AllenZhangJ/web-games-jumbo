import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { createRng, deriveSeed } from '@number-strategy-jump/arena-contracts';
import { createMatchAssignment } from '@number-strategy-jump/arena-matchmaking';
import type { BotDifficultyId } from '@number-strategy-jump/arena-bot';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  createHumanMatchStudyDefinition,
  type HumanMatchStudyDefinition,
} from './human-match-study-definition.js';

export const HUMAN_MATCH_STUDY_ASSIGNMENT_SCHEMA_VERSION = 1;

export interface HumanMatchStudyAssignment {
  readonly schemaVersion: number;
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly assignmentId: string;
  readonly participantId: string;
  readonly enrollmentIndex: number;
  readonly armId: string;
  readonly difficultyId: BotDifficultyId;
  readonly matchSeeds: readonly number[];
}

const ASSIGNMENT_KEYS = new Set<keyof HumanMatchStudyAssignment>([
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
const CREATE_ASSIGNMENT_KEYS = new Set([
  'definition',
  'participantId',
  'enrollmentIndex',
]);
const MAXIMUM_SEED_SEARCH_ATTEMPTS = 1_024;

function boundedString(value: unknown, maximumLength: number, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (result.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 字符。`);
  }
  return result;
}

function shuffledArms(
  definition: HumanMatchStudyDefinition,
  blockIndex: number,
) {
  const arms = [...definition.arms];
  const rng = createRng(deriveSeed(
    definition.assignmentSeed,
    `${definition.id}:human-study-assignment-block:${blockIndex}`,
  ));
  for (let index = arms.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    const current = arms[index];
    const replacement = arms[swapIndex];
    if (!current || !replacement) throw new Error('Human Match Study arm 洗牌越界。');
    arms[index] = replacement;
    arms[swapIndex] = current;
  }
  return arms;
}

function findNaturalDifficultySeed(
  definition: HumanMatchStudyDefinition,
  enrollmentIndex: number,
  matchIndex: number,
  difficultyId: BotDifficultyId,
): number {
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

export function createHumanMatchStudyAssignment(
  optionsValue: unknown,
): HumanMatchStudyAssignment {
  const options = assertPlainRecord(optionsValue, 'HumanMatchStudyAssignment options');
  assertKnownKeys(options, CREATE_ASSIGNMENT_KEYS, 'HumanMatchStudyAssignment options');
  const definitionValue = options.definition;
  const participantIdValue = options.participantId;
  const enrollmentIndexValue = options.enrollmentIndex;
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
  if (!arm) throw new Error('Human Match Study 未能选择预注册 arm。');
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

export function validateHumanMatchStudyAssignment(
  definitionValue: unknown,
  value: unknown,
): HumanMatchStudyAssignment {
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

export function createHumanMatchStudyParticipantView(
  definitionValue: unknown,
  assignmentValue: unknown,
) {
  const assignment = validateHumanMatchStudyAssignment(definitionValue, assignmentValue);
  return Object.freeze({
    definitionId: assignment.definitionId,
    definitionHash: assignment.definitionHash,
    assignmentId: assignment.assignmentId,
    participantId: assignment.participantId,
    enrollmentIndex: assignment.enrollmentIndex,
  });
}
