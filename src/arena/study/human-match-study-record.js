import {
  createMatchAssignment,
} from '../matchmaking/match-assignment.js';
import {
  validateProductMatchResult,
} from '../product/matchmaking/product-match-result.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';
import {
  validateHumanMatchStudyAssignment,
} from './human-match-study-assignment.js';
import {
  createHumanMatchStudyDefinition,
} from './human-match-study-definition.js';

export const HUMAN_MATCH_STUDY_RECORD_SCHEMA_VERSION = 1;

export const HUMAN_MATCH_STUDY_STATUS = Object.freeze({
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  INVALIDATED: 'invalidated',
});

export const HUMAN_MATCH_STUDY_TERMINATION_REASON = Object.freeze({
  STUDY_COMPLETED: 'study-completed',
  PARTICIPANT_ABANDONED: 'participant-abandoned',
  RUNTIME_FAILED: 'runtime-failed',
  PROTOCOL_DEVIATION: 'protocol-deviation',
  RUNNING_RECOVERED: 'running-recovered',
});

export const HUMAN_MATCH_STUDY_OPPONENT_GUESS = Object.freeze({
  HUMAN: 'human',
  BOT: 'bot',
  UNSURE: 'unsure',
});

export const HUMAN_MATCH_STUDY_EXCLUSION_REASON = Object.freeze({
  INVALIDATED: 'invalidated',
  CONSENT_MISSING: 'consent-missing',
  PRIOR_ARENA_EXPERIENCE: 'prior-arena-experience',
  PRIOR_STUDY_EXPOSURE: 'prior-study-exposure',
  BRIEFING_DEVIATION: 'briefing-deviation',
  OPERATOR_ASSISTANCE: 'operator-assistance',
  PLATFORM_MISMATCH: 'platform-mismatch',
  FORM_FACTOR_MISMATCH: 'form-factor-mismatch',
  ORIENTATION_MISMATCH: 'orientation-mismatch',
  INPUT_MODE_MISMATCH: 'input-mode-mismatch',
});

const TERMINATION_REASONS_BY_STATUS = Object.freeze({
  [HUMAN_MATCH_STUDY_STATUS.COMPLETED]: new Set([
    HUMAN_MATCH_STUDY_TERMINATION_REASON.STUDY_COMPLETED,
  ]),
  [HUMAN_MATCH_STUDY_STATUS.ABANDONED]: new Set([
    HUMAN_MATCH_STUDY_TERMINATION_REASON.PARTICIPANT_ABANDONED,
  ]),
  [HUMAN_MATCH_STUDY_STATUS.INVALIDATED]: new Set([
    HUMAN_MATCH_STUDY_TERMINATION_REASON.RUNTIME_FAILED,
    HUMAN_MATCH_STUDY_TERMINATION_REASON.PROTOCOL_DEVIATION,
    HUMAN_MATCH_STUDY_TERMINATION_REASON.RUNNING_RECOVERED,
  ]),
});

const RECORD_KEYS = new Set([
  'schemaVersion',
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
const ENVIRONMENT_KEYS = new Set(['platform', 'formFactor', 'orientation', 'inputMode']);
const ELIGIBILITY_KEYS = new Set([
  'consentConfirmed',
  'priorArenaExperience',
  'priorStudyExposure',
  'briefingDeviation',
  'operatorAssistance',
]);
const MATCH_KEYS = new Set(['matchIndex', 'result', 'replayArtifact']);
const ARTIFACT_KEYS = new Set(['id', 'path', 'sha256', 'byteLength']);
const SELF_REPORT_KEYS = new Set([
  'opponentTypeGuess',
  'fairnessRating',
  'naturalnessRating',
  'wouldRematch',
]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function boundedString(value, maximumLength, name) {
  const result = assertNonEmptyString(value, name);
  if (result.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 字符。`);
  }
  return result;
}

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function booleanValue(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function isoInstant(value, name) {
  if (typeof value !== 'string' || !ISO_INSTANT_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是带毫秒的 UTC ISO-8601 时间。`);
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new RangeError(`${name} 不是有效 UTC 时间。`);
  }
  return value;
}

function sameOpponent(left, right) {
  return ['id', 'displayName', 'portraitKey', 'appearanceKey'].every(
    (field) => left[field] === right[field],
  );
}

function cloneEnvironment(value) {
  assertKnownKeys(value, ENVIRONMENT_KEYS, 'HumanMatchStudyRecord.environment');
  const result = {};
  for (const key of ENVIRONMENT_KEYS) {
    result[key] = boundedString(value[key], 64, `HumanMatchStudyRecord.environment.${key}`);
  }
  return Object.freeze(result);
}

function cloneEligibility(value) {
  assertKnownKeys(value, ELIGIBILITY_KEYS, 'HumanMatchStudyRecord.eligibility');
  return Object.freeze(Object.fromEntries([...ELIGIBILITY_KEYS].map((key) => [
    key,
    booleanValue(value[key], `HumanMatchStudyRecord.eligibility.${key}`),
  ])));
}

function cloneArtifact(value, name) {
  assertKnownKeys(value, ARTIFACT_KEYS, name);
  const path = boundedString(value.path, 512, `${name}.path`);
  if (
    path.startsWith('/')
    || path.includes('\\')
    || path.split('/').some((part) => part === '' || part === '.' || part === '..')
  ) throw new RangeError(`${name}.path 必须是规范的相对 POSIX 路径。`);
  if (typeof value.sha256 !== 'string' || !SHA256_PATTERN.test(value.sha256)) {
    throw new TypeError(`${name}.sha256 必须是 64 位小写十六进制。`);
  }
  return Object.freeze({
    id: boundedString(value.id, 128, `${name}.id`),
    path,
    sha256: value.sha256,
    byteLength: assertIntegerAtLeast(value.byteLength, 1, `${name}.byteLength`),
  });
}

function cloneMatch(definition, assignment, value, index) {
  const name = `HumanMatchStudyRecord.matches[${index}]`;
  assertKnownKeys(value, MATCH_KEYS, name);
  const matchIndex = assertIntegerAtLeast(value.matchIndex, 0, `${name}.matchIndex`);
  if (matchIndex !== index || matchIndex >= definition.matchesPerParticipant) {
    throw new RangeError(`${name}.matchIndex 必须从 0 连续且属于当前 Study。`);
  }
  const result = validateProductMatchResult(value.result);
  if (result.matchSeed !== assignment.matchSeeds[matchIndex]) {
    throw new RangeError(`${name}.result.matchSeed 与预注册 assignment 不一致。`);
  }
  if (
    result.authorityIdentity.replaySchemaVersion
    !== definition.candidate.replaySchemaVersion
  ) throw new RangeError(`${name} 使用了错误 replay schema。`);
  const expectedAssignment = createMatchAssignment({ matchSeed: result.matchSeed });
  if (
    expectedAssignment.selectedDifficultyId !== assignment.difficultyId
    || expectedAssignment.effectiveDifficultyId !== assignment.difficultyId
  ) throw new RangeError(`${name} 的生产隐藏难度与 Study arm 不一致。`);
  if (!sameOpponent(result.opponent, expectedAssignment.opponent)) {
    throw new RangeError(`${name}.result.opponent 与 match seed 不一致。`);
  }
  const winnerId = result.authorityResult.winnerId;
  if (winnerId !== null && winnerId !== 'player-1' && winnerId !== 'player-2') {
    throw new RangeError(`${name} 包含未知 winnerId。`);
  }
  return Object.freeze({
    matchIndex,
    result,
    replayArtifact: cloneArtifact(value.replayArtifact, `${name}.replayArtifact`),
  });
}

function cloneSelfReport(value) {
  if (value === null) return null;
  assertKnownKeys(value, SELF_REPORT_KEYS, 'HumanMatchStudyRecord.selfReport');
  const rating = (field) => {
    const result = assertIntegerAtLeast(
      value[field],
      1,
      `HumanMatchStudyRecord.selfReport.${field}`,
    );
    if (result > 5) {
      throw new RangeError(`HumanMatchStudyRecord.selfReport.${field} 不能超过 5。`);
    }
    return result;
  };
  return Object.freeze({
    opponentTypeGuess: enumValue(
      value.opponentTypeGuess,
      HUMAN_MATCH_STUDY_OPPONENT_GUESS,
      'HumanMatchStudyRecord.selfReport.opponentTypeGuess',
    ),
    fairnessRating: rating('fairnessRating'),
    naturalnessRating: rating('naturalnessRating'),
    wouldRematch: booleanValue(
      value.wouldRematch,
      'HumanMatchStudyRecord.selfReport.wouldRematch',
    ),
  });
}

export function createHumanMatchStudyRecord(definitionValue, value) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const source = cloneFrozenData(value, 'HumanMatchStudyRecord');
  assertKnownKeys(source, RECORD_KEYS, 'HumanMatchStudyRecord');
  if (source.schemaVersion !== HUMAN_MATCH_STUDY_RECORD_SCHEMA_VERSION) {
    throw new RangeError(`不支持 HumanMatchStudyRecord schema ${String(source.schemaVersion)}。`);
  }
  if (
    source.definitionId !== definition.id
    || source.definitionHash !== definition.getContentHash()
  ) throw new RangeError('HumanMatchStudyRecord 与当前 Definition 身份不一致。');
  if (typeof source.commit !== 'string' || !GIT_COMMIT_PATTERN.test(source.commit)) {
    throw new TypeError('HumanMatchStudyRecord.commit 必须是 40 位小写 commit。');
  }
  const assignment = validateHumanMatchStudyAssignment(definition, source.assignment);
  const status = enumValue(
    source.status,
    HUMAN_MATCH_STUDY_STATUS,
    'HumanMatchStudyRecord.status',
  );
  const terminationReason = enumValue(
    source.terminationReason,
    HUMAN_MATCH_STUDY_TERMINATION_REASON,
    'HumanMatchStudyRecord.terminationReason',
  );
  if (!TERMINATION_REASONS_BY_STATUS[status].has(terminationReason)) {
    throw new RangeError(
      `HumanMatchStudyRecord.terminationReason ${terminationReason} 与 ${status} 不一致。`,
    );
  }
  if (!Array.isArray(source.matches)) {
    throw new TypeError('HumanMatchStudyRecord.matches 必须是数组。');
  }
  if (source.matches.length > definition.matchesPerParticipant) {
    throw new RangeError('HumanMatchStudyRecord.matches 超过 Study 预注册数量。');
  }
  if (
    status === HUMAN_MATCH_STUDY_STATUS.COMPLETED
    && source.matches.length !== definition.matchesPerParticipant
  ) throw new RangeError('completed HumanMatchStudyRecord 必须包含完整预注册对局。');
  const matches = Object.freeze(source.matches.map((match, index) => (
    cloneMatch(definition, assignment, match, index)
  )));
  const selfReport = cloneSelfReport(source.selfReport);
  if (status === HUMAN_MATCH_STUDY_STATUS.COMPLETED && selfReport === null) {
    throw new RangeError('completed HumanMatchStudyRecord 必须包含终局自评。');
  }
  return Object.freeze({
    schemaVersion: HUMAN_MATCH_STUDY_RECORD_SCHEMA_VERSION,
    recordId: boundedString(source.recordId, 128, 'HumanMatchStudyRecord.recordId'),
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: source.commit,
    buildId: boundedString(source.buildId, 128, 'HumanMatchStudyRecord.buildId'),
    performedAt: isoInstant(source.performedAt, 'HumanMatchStudyRecord.performedAt'),
    operatorId: boundedString(source.operatorId, 128, 'HumanMatchStudyRecord.operatorId'),
    assignment,
    status,
    terminationReason,
    environment: cloneEnvironment(source.environment),
    eligibility: cloneEligibility(source.eligibility),
    matches,
    selfReport,
  });
}

export function getHumanMatchStudyProtocolExclusionReasons(definitionValue, recordValue) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const record = createHumanMatchStudyRecord(definition, recordValue);
  const reasons = [];
  if (!record.eligibility.consentConfirmed) {
    reasons.push(HUMAN_MATCH_STUDY_EXCLUSION_REASON.CONSENT_MISSING);
  }
  if (record.eligibility.priorArenaExperience) {
    reasons.push(HUMAN_MATCH_STUDY_EXCLUSION_REASON.PRIOR_ARENA_EXPERIENCE);
  }
  if (record.eligibility.priorStudyExposure) {
    reasons.push(HUMAN_MATCH_STUDY_EXCLUSION_REASON.PRIOR_STUDY_EXPOSURE);
  }
  if (record.eligibility.briefingDeviation) {
    reasons.push(HUMAN_MATCH_STUDY_EXCLUSION_REASON.BRIEFING_DEVIATION);
  }
  if (record.eligibility.operatorAssistance) {
    reasons.push(HUMAN_MATCH_STUDY_EXCLUSION_REASON.OPERATOR_ASSISTANCE);
  }
  for (const [field, reason] of [
    ['platform', HUMAN_MATCH_STUDY_EXCLUSION_REASON.PLATFORM_MISMATCH],
    ['formFactor', HUMAN_MATCH_STUDY_EXCLUSION_REASON.FORM_FACTOR_MISMATCH],
    ['orientation', HUMAN_MATCH_STUDY_EXCLUSION_REASON.ORIENTATION_MISMATCH],
    ['inputMode', HUMAN_MATCH_STUDY_EXCLUSION_REASON.INPUT_MODE_MISMATCH],
  ]) {
    if (record.environment[field] !== definition.environment[field]) reasons.push(reason);
  }
  return Object.freeze(reasons);
}

export function getHumanMatchStudyExclusionReasons(definitionValue, recordValue) {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const record = createHumanMatchStudyRecord(definition, recordValue);
  const reasons = [...getHumanMatchStudyProtocolExclusionReasons(definition, record)];
  if (record.status === HUMAN_MATCH_STUDY_STATUS.INVALIDATED) {
    reasons.push(HUMAN_MATCH_STUDY_EXCLUSION_REASON.INVALIDATED);
  }
  return Object.freeze(reasons);
}
