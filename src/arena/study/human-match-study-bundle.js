import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceGitCommit,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
import { createHumanMatchStudyDefinition } from '@number-strategy-jump/arena-human-match-study';
import { createHumanMatchStudyRecord } from '@number-strategy-jump/arena-human-match-study';

export const HUMAN_MATCH_STUDY_BUNDLE_SCHEMA_VERSION = 1;

const BUNDLE_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'commit',
  'buildId',
  'createdAt',
  'records',
]);
const MAXIMUM_RECORDS = 10_000;

function boundedString(value, maximumLength, name) {
  const result = assertNonEmptyString(value, name);
  if (result.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 字符。`);
  }
  return result;
}

function compareRecords(left, right) {
  if (left.assignment.enrollmentIndex !== right.assignment.enrollmentIndex) {
    return left.assignment.enrollmentIndex - right.assignment.enrollmentIndex;
  }
  if (left.recordId < right.recordId) return -1;
  if (left.recordId > right.recordId) return 1;
  return 0;
}

export function createHumanMatchStudyBundle(definitionValue, value) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const source = cloneFrozenData(value, 'HumanMatchStudyBundle');
  assertKnownKeys(source, BUNDLE_KEYS, 'HumanMatchStudyBundle');
  if (source.schemaVersion !== HUMAN_MATCH_STUDY_BUNDLE_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 HumanMatchStudyBundle schema ${String(source.schemaVersion)}。`,
    );
  }
  if (
    source.definitionId !== definition.id
    || source.definitionHash !== definition.getContentHash()
  ) throw new RangeError('HumanMatchStudyBundle 与当前 Definition 身份不一致。');
  const commit = assertEvidenceGitCommit(source.commit, 'HumanMatchStudyBundle.commit');
  const buildId = boundedString(source.buildId, 128, 'HumanMatchStudyBundle.buildId');
  const createdAt = assertEvidenceUtcInstant(
    source.createdAt,
    'HumanMatchStudyBundle.createdAt',
  );
  if (!Array.isArray(source.records)) {
    throw new TypeError('HumanMatchStudyBundle.records 必须是数组。');
  }
  if (source.records.length > MAXIMUM_RECORDS) {
    throw new RangeError(`HumanMatchStudyBundle.records 不能超过 ${MAXIMUM_RECORDS} 条。`);
  }
  const identities = {
    recordIds: new Set(),
    participantIds: new Set(),
    assignmentIds: new Set(),
    enrollmentIndexes: new Set(),
    matchSeeds: new Set(),
    artifactIds: new Set(),
    artifactPaths: new Set(),
  };
  const assertUnique = (setName, value, label) => {
    if (identities[setName].has(value)) {
      throw new RangeError(`HumanMatchStudyBundle 重复 ${label} ${value}。`);
    }
    identities[setName].add(value);
  };
  const records = source.records.map((recordValue, index) => {
    const record = createHumanMatchStudyRecord(definition, recordValue);
    if (record.commit !== commit) {
      throw new RangeError(`HumanMatchStudyBundle.records[${index}].commit 与 Bundle 不一致。`);
    }
    if (record.buildId !== buildId) {
      throw new RangeError(`HumanMatchStudyBundle.records[${index}].buildId 与 Bundle 不一致。`);
    }
    if (record.performedAt > createdAt) {
      throw new RangeError('HumanMatchStudyBundle.createdAt 不能早于 Study 记录。');
    }
    assertUnique('recordIds', record.recordId, 'recordId');
    assertUnique('participantIds', record.assignment.participantId, 'participantId');
    assertUnique('assignmentIds', record.assignment.assignmentId, 'assignmentId');
    assertUnique(
      'enrollmentIndexes',
      record.assignment.enrollmentIndex,
      'enrollmentIndex',
    );
    for (const match of record.matches) {
      assertUnique('matchSeeds', match.result.matchSeed, 'matchSeed');
      assertUnique('artifactIds', match.replayArtifact.id, 'replay artifact id');
      assertUnique('artifactPaths', match.replayArtifact.path, 'replay artifact path');
    }
    return record;
  });
  const enrollmentIndexes = [...identities.enrollmentIndexes].sort((left, right) => left - right);
  enrollmentIndexes.forEach((value, index) => {
    if (value !== index) {
      throw new RangeError(
        `HumanMatchStudyBundle enrollmentIndex 必须从 0 连续；缺少 ${index}。`,
      );
    }
  });
  return Object.freeze({
    schemaVersion: HUMAN_MATCH_STUDY_BUNDLE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit,
    buildId,
    createdAt,
    records: Object.freeze(records.sort(compareRecords)),
  });
}
