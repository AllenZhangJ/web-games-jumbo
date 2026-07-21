import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { createMatchAssignment } from '@number-strategy-jump/arena-matchmaking';
import {
  createProductMatchResult,
  validateProductMatchResult,
} from '@number-strategy-jump/arena-product-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { createHumanMatchStudyDefinition } from './human-match-study-definition.js';
import {
  HUMAN_MATCH_STUDY_RECORD_SCHEMA_VERSION,
  HUMAN_MATCH_STUDY_STATUS,
  createHumanMatchStudyRecord,
  createHumanMatchStudySubmission,
} from './human-match-study-record.js';

export const HUMAN_MATCH_STUDY_CAPTURE_PACKAGE_SCHEMA_VERSION = 1;

const PACKAGE_KEYS = new Set([
  'schemaVersion',
  'packageId',
  'recordId',
  'definitionId',
  'definitionHash',
  'commit',
  'buildId',
  'performedAt',
  'operatorId',
  'assignment',
  'status',
  'terminationReason',
  'environment',
  'eligibility',
  'matches',
  'selfReport',
]);
const DRAFT_KEYS = new Set([...PACKAGE_KEYS].filter(
  (key) => key !== 'schemaVersion' && key !== 'packageId',
));
const SUBMISSION_KEYS = [
  'recordId',
  'definitionId',
  'definitionHash',
  'commit',
  'buildId',
  'performedAt',
  'operatorId',
  'assignment',
  'status',
  'terminationReason',
  'environment',
  'eligibility',
  'selfReport',
];
const RAW_MATCH_KEYS = new Set(['matchIndex', 'result', 'replay']);

function sameDeterministicData(left, right, label) {
  return createDeterministicDataHash(left, `${label} left`)
    === createDeterministicDataHash(right, `${label} right`);
}

function cloneRawMatch(definition, submission, value, index) {
  const name = `HumanMatchStudyCapturePackage.matches[${index}]`;
  assertKnownKeys(value, RAW_MATCH_KEYS, name);
  const matchIndex = assertIntegerAtLeast(value.matchIndex, 0, `${name}.matchIndex`);
  if (matchIndex !== index || matchIndex >= definition.matchesPerParticipant) {
    throw new RangeError(`${name}.matchIndex 必须从 0 连续且属于当前 Study。`);
  }
  const result = validateProductMatchResult(value.result);
  const replay = cloneFrozenData(value.replay, `${name}.replay`);
  const expectedSeed = submission.assignment.matchSeeds[matchIndex];
  if (result.matchSeed !== expectedSeed || replay.matchSeed !== expectedSeed) {
    throw new RangeError(`${name} 没有使用预注册 match seed。`);
  }
  if (replay.replaySchemaVersion !== definition.candidate.replaySchemaVersion) {
    throw new RangeError(`${name} 使用了错误 Replay schema。`);
  }
  if (
    !Array.isArray(replay.inputFrames)
    || !Array.isArray(replay.checkpoints)
    || !Array.isArray(replay.events)
  ) throw new TypeError(`${name} 缺少完整 Replay 序列。`);
  const productionAssignment = createMatchAssignment({ matchSeed: expectedSeed });
  if (
    productionAssignment.selectedDifficultyId !== submission.assignment.difficultyId
    || productionAssignment.effectiveDifficultyId !== submission.assignment.difficultyId
  ) throw new RangeError(`${name} 没有使用天然隐藏难度。`);
  const reconstructed = createProductMatchResult({
    matchSeed: expectedSeed,
    opponent: productionAssignment.opponent,
    content: replay.config?.contentSelection,
    replay,
  });
  if (!sameDeterministicData(result, reconstructed, `${name} result`)) {
    throw new RangeError(`${name} 的 Product 结果无法由 Replay 重建。`);
  }
  return Object.freeze({ matchIndex, result, replay });
}

function packageIdentity(submission, matches) {
  return {
    ...submission,
    assignment: {
      assignmentId: submission.assignment.assignmentId,
      participantId: submission.assignment.participantId,
      enrollmentIndex: submission.assignment.enrollmentIndex,
      armId: submission.assignment.armId,
      difficultyId: submission.assignment.difficultyId,
      matchSeeds: submission.assignment.matchSeeds,
    },
    matches: matches.map(({ matchIndex, result, replay }) => ({
      matchIndex,
      matchSeed: result.matchSeed,
      authorityHash: result.authorityHash,
      finalHash: replay.finalHash,
      endedAtTick: result.authorityResult.endedAtTick,
    })),
  };
}

function expectedPackageId(submission, matches) {
  return `human-study-package-${
    createDeterministicDataHash(
      packageIdentity(submission, matches),
      'HumanMatchStudyCapturePackage identity',
    )
  }`;
}

export function validateHumanMatchStudyCapturePackage(definitionValue, value) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const source = cloneFrozenData(value, 'HumanMatchStudyCapturePackage');
  assertKnownKeys(source, PACKAGE_KEYS, 'HumanMatchStudyCapturePackage');
  if (source.schemaVersion !== HUMAN_MATCH_STUDY_CAPTURE_PACKAGE_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 HumanMatchStudyCapturePackage schema ${String(source.schemaVersion)}。`,
    );
  }
  const submission = createHumanMatchStudySubmission(definition, Object.fromEntries(
    SUBMISSION_KEYS.map((key) => [key, source[key]]),
  ));
  if (!Array.isArray(source.matches)) {
    throw new TypeError('HumanMatchStudyCapturePackage.matches 必须是数组。');
  }
  if (source.matches.length > definition.matchesPerParticipant) {
    throw new RangeError('HumanMatchStudyCapturePackage.matches 超过 Study 预注册数量。');
  }
  if (
    submission.status === HUMAN_MATCH_STUDY_STATUS.COMPLETED
    && source.matches.length !== definition.matchesPerParticipant
  ) throw new RangeError('completed CapturePackage 必须包含完整预注册对局。');
  const matches = Object.freeze(source.matches.map((match, index) => (
    cloneRawMatch(definition, submission, match, index)
  )));
  const packageId = expectedPackageId(submission, matches);
  if (source.packageId !== packageId) {
    throw new RangeError('HumanMatchStudyCapturePackage.packageId 与内容不一致。');
  }
  return Object.freeze({
    schemaVersion: HUMAN_MATCH_STUDY_CAPTURE_PACKAGE_SCHEMA_VERSION,
    packageId,
    ...submission,
    matches,
  });
}

export function createHumanMatchStudyCapturePackage(definitionValue, value) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const source = cloneFrozenData(value, 'HumanMatchStudyCapturePackage draft');
  assertKnownKeys(source, DRAFT_KEYS, 'HumanMatchStudyCapturePackage draft');
  const submission = createHumanMatchStudySubmission(definition, Object.fromEntries(
    SUBMISSION_KEYS.map((key) => [key, source[key]]),
  ));
  if (!Array.isArray(source.matches)) {
    throw new TypeError('HumanMatchStudyCapturePackage.matches 必须是数组。');
  }
  const matches = Object.freeze(source.matches.map((match, index) => (
    cloneRawMatch(definition, submission, match, index)
  )));
  return validateHumanMatchStudyCapturePackage(definition, {
    schemaVersion: HUMAN_MATCH_STUDY_CAPTURE_PACKAGE_SCHEMA_VERSION,
    packageId: expectedPackageId(submission, matches),
    ...submission,
    matches,
  });
}

export function materializeHumanMatchStudyCapturePackage(
  definitionValue,
  packageValue,
  replayArtifactsValue,
) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const capturePackage = validateHumanMatchStudyCapturePackage(definition, packageValue);
  if (
    !Array.isArray(replayArtifactsValue)
    || replayArtifactsValue.length !== capturePackage.matches.length
  ) throw new RangeError('CapturePackage replay artifacts 必须与 matches 一一对应。');
  return createHumanMatchStudyRecord(definition, {
    schemaVersion: HUMAN_MATCH_STUDY_RECORD_SCHEMA_VERSION,
    ...Object.fromEntries(SUBMISSION_KEYS.map((key) => [key, capturePackage[key]])),
    matches: capturePackage.matches.map(({ matchIndex, result }, index) => ({
      matchIndex,
      result,
      replayArtifact: replayArtifactsValue[index],
    })),
  });
}
