import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceGitCommit,
  assertEvidenceRelativePath,
  assertEvidenceSha256,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
import { createMatchAssignment } from '@number-strategy-jump/arena-matchmaking';
import {
  validateProductMatchResult,
  type ProductMatchResult,
} from '@number-strategy-jump/arena-product-contracts';
import {
  createHumanMatchStudyDefinition,
  type HumanMatchStudyDefinition,
} from './human-match-study-definition.js';
import {
  validateHumanMatchStudyAssignment,
  type HumanMatchStudyAssignment,
} from './human-match-study-assignment.js';

export const HUMAN_MATCH_STUDY_RECORD_SCHEMA_VERSION = 1;

export const HUMAN_MATCH_STUDY_STATUS = Object.freeze({
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  INVALIDATED: 'invalidated',
} as const);

export const HUMAN_MATCH_STUDY_TERMINATION_REASON = Object.freeze({
  STUDY_COMPLETED: 'study-completed',
  PARTICIPANT_ABANDONED: 'participant-abandoned',
  RUNTIME_FAILED: 'runtime-failed',
  PROTOCOL_DEVIATION: 'protocol-deviation',
  RUNNING_RECOVERED: 'running-recovered',
} as const);

export const HUMAN_MATCH_STUDY_OPPONENT_GUESS = Object.freeze({
  HUMAN: 'human',
  BOT: 'bot',
  UNSURE: 'unsure',
} as const);

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
} as const);

export type HumanMatchStudyStatus = typeof HUMAN_MATCH_STUDY_STATUS[
  keyof typeof HUMAN_MATCH_STUDY_STATUS
];
export type HumanMatchStudyTerminationReason = typeof HUMAN_MATCH_STUDY_TERMINATION_REASON[
  keyof typeof HUMAN_MATCH_STUDY_TERMINATION_REASON
];
export type HumanMatchStudyOpponentGuess = typeof HUMAN_MATCH_STUDY_OPPONENT_GUESS[
  keyof typeof HUMAN_MATCH_STUDY_OPPONENT_GUESS
];
export type HumanMatchStudyExclusionReason = typeof HUMAN_MATCH_STUDY_EXCLUSION_REASON[
  keyof typeof HUMAN_MATCH_STUDY_EXCLUSION_REASON
];

export interface HumanMatchStudyEligibility {
  readonly consentConfirmed: boolean;
  readonly priorArenaExperience: boolean;
  readonly priorStudyExposure: boolean;
  readonly briefingDeviation: boolean;
  readonly operatorAssistance: boolean;
}

export interface HumanMatchStudyObservedEnvironment {
  readonly platform: string;
  readonly formFactor: string;
  readonly orientation: string;
  readonly inputMode: string;
}

export interface HumanMatchStudyReplayArtifact {
  readonly id: string;
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
}

export interface HumanMatchStudySelfReport {
  readonly opponentTypeGuess: HumanMatchStudyOpponentGuess;
  readonly fairnessRating: number;
  readonly naturalnessRating: number;
  readonly wouldRematch: boolean;
}

export interface HumanMatchStudyMatch {
  readonly matchIndex: number;
  readonly result: ProductMatchResult;
  readonly replayArtifact: HumanMatchStudyReplayArtifact;
}

export interface HumanMatchStudySubmission {
  readonly recordId: string;
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly commit: string;
  readonly buildId: string;
  readonly performedAt: string;
  readonly operatorId: string;
  readonly assignment: HumanMatchStudyAssignment;
  readonly status: HumanMatchStudyStatus;
  readonly terminationReason: HumanMatchStudyTerminationReason;
  readonly environment: HumanMatchStudyObservedEnvironment;
  readonly eligibility: HumanMatchStudyEligibility;
  readonly selfReport: HumanMatchStudySelfReport | null;
}

export interface HumanMatchStudyRecord extends HumanMatchStudySubmission {
  readonly schemaVersion: 1;
  readonly matches: readonly HumanMatchStudyMatch[];
}

const TERMINATION_REASONS_BY_STATUS: Readonly<
  Record<HumanMatchStudyStatus, ReadonlySet<HumanMatchStudyTerminationReason>>
> = Object.freeze({
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
const SUBMISSION_KEYS = new Set([
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

function boundedString(value: unknown, maximumLength: number, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (result.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 字符。`);
  }
  return result;
}

function enumValue<T extends string>(
  value: unknown,
  values: Readonly<Record<string, T>>,
  name: string,
): T {
  const knownValues = Object.values(values) as readonly T[];
  if (typeof value !== 'string' || !knownValues.includes(value as T)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value as T;
}

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function sameOpponent(
  left: ProductMatchResult['opponent'],
  right: ProductMatchResult['opponent'],
): boolean {
  return left.id === right.id
    && left.displayName === right.displayName
    && left.portraitKey === right.portraitKey
    && left.appearanceKey === right.appearanceKey;
}

function cloneEnvironment(value: unknown): HumanMatchStudyObservedEnvironment {
  assertKnownKeys(value, ENVIRONMENT_KEYS, 'HumanMatchStudyRecord.environment');
  return Object.freeze({
    platform: boundedString(
      value.platform,
      64,
      'HumanMatchStudyRecord.environment.platform',
    ),
    formFactor: boundedString(
      value.formFactor,
      64,
      'HumanMatchStudyRecord.environment.formFactor',
    ),
    orientation: boundedString(
      value.orientation,
      64,
      'HumanMatchStudyRecord.environment.orientation',
    ),
    inputMode: boundedString(
      value.inputMode,
      64,
      'HumanMatchStudyRecord.environment.inputMode',
    ),
  });
}

function cloneEligibility(value: unknown): HumanMatchStudyEligibility {
  assertKnownKeys(value, ELIGIBILITY_KEYS, 'HumanMatchStudyRecord.eligibility');
  return Object.freeze({
    consentConfirmed: booleanValue(
      value.consentConfirmed,
      'HumanMatchStudyRecord.eligibility.consentConfirmed',
    ),
    priorArenaExperience: booleanValue(
      value.priorArenaExperience,
      'HumanMatchStudyRecord.eligibility.priorArenaExperience',
    ),
    priorStudyExposure: booleanValue(
      value.priorStudyExposure,
      'HumanMatchStudyRecord.eligibility.priorStudyExposure',
    ),
    briefingDeviation: booleanValue(
      value.briefingDeviation,
      'HumanMatchStudyRecord.eligibility.briefingDeviation',
    ),
    operatorAssistance: booleanValue(
      value.operatorAssistance,
      'HumanMatchStudyRecord.eligibility.operatorAssistance',
    ),
  });
}

function cloneArtifact(value: unknown, name: string): HumanMatchStudyReplayArtifact {
  assertKnownKeys(value, ARTIFACT_KEYS, name);
  return Object.freeze({
    id: boundedString(value.id, 128, `${name}.id`),
    path: assertEvidenceRelativePath(value.path, `${name}.path`),
    sha256: assertEvidenceSha256(value.sha256, `${name}.sha256`),
    byteLength: assertIntegerAtLeast(value.byteLength, 1, `${name}.byteLength`),
  });
}

function cloneMatch(
  definition: HumanMatchStudyDefinition,
  assignment: HumanMatchStudyAssignment,
  value: unknown,
  index: number,
): HumanMatchStudyMatch {
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

function cloneSelfReport(value: unknown): HumanMatchStudySelfReport | null {
  if (value === null) return null;
  assertKnownKeys(value, SELF_REPORT_KEYS, 'HumanMatchStudyRecord.selfReport');
  const rating = (field: 'fairnessRating' | 'naturalnessRating'): number => {
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

/**
 * Validates participant metadata shared by a raw capture package and its
 * materialized evidence record, so capture and ingestion use one contract.
 */
export function createHumanMatchStudySubmission(
  definitionValue: unknown,
  value: unknown,
): HumanMatchStudySubmission {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const source = cloneFrozenData(value, 'HumanMatchStudySubmission');
  assertKnownKeys(source, SUBMISSION_KEYS, 'HumanMatchStudySubmission');
  if (
    source.definitionId !== definition.id
    || source.definitionHash !== definition.getContentHash()
  ) throw new RangeError('HumanMatchStudySubmission 与当前 Definition 身份不一致。');
  const commit = assertEvidenceGitCommit(source.commit, 'HumanMatchStudySubmission.commit');
  const assignment = validateHumanMatchStudyAssignment(definition, source.assignment);
  const status = enumValue(
    source.status,
    HUMAN_MATCH_STUDY_STATUS,
    'HumanMatchStudySubmission.status',
  );
  const terminationReason = enumValue(
    source.terminationReason,
    HUMAN_MATCH_STUDY_TERMINATION_REASON,
    'HumanMatchStudySubmission.terminationReason',
  );
  if (!TERMINATION_REASONS_BY_STATUS[status].has(terminationReason)) {
    throw new RangeError(
      `HumanMatchStudySubmission.terminationReason ${terminationReason} `
      + `与 ${status} 不一致。`,
    );
  }
  const selfReport = cloneSelfReport(source.selfReport);
  if (status === HUMAN_MATCH_STUDY_STATUS.COMPLETED && selfReport === null) {
    throw new RangeError('completed HumanMatchStudySubmission 必须包含终局自评。');
  }
  return Object.freeze({
    recordId: boundedString(source.recordId, 128, 'HumanMatchStudySubmission.recordId'),
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit,
    buildId: boundedString(source.buildId, 128, 'HumanMatchStudySubmission.buildId'),
    performedAt: assertEvidenceUtcInstant(
      source.performedAt,
      'HumanMatchStudySubmission.performedAt',
    ),
    operatorId: boundedString(source.operatorId, 128, 'HumanMatchStudySubmission.operatorId'),
    assignment,
    status,
    terminationReason,
    environment: cloneEnvironment(source.environment),
    eligibility: cloneEligibility(source.eligibility),
    selfReport,
  });
}

export function createHumanMatchStudyRecord(
  definitionValue: unknown,
  value: unknown,
): HumanMatchStudyRecord {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const source = cloneFrozenData(value, 'HumanMatchStudyRecord');
  assertKnownKeys(source, RECORD_KEYS, 'HumanMatchStudyRecord');
  if (source.schemaVersion !== HUMAN_MATCH_STUDY_RECORD_SCHEMA_VERSION) {
    throw new RangeError(`不支持 HumanMatchStudyRecord schema ${String(source.schemaVersion)}。`);
  }
  const submissionValue = Object.fromEntries(
    [...SUBMISSION_KEYS].map((key) => [key, source[key]]),
  );
  const submission = createHumanMatchStudySubmission(definition, submissionValue);
  if (!Array.isArray(source.matches)) {
    throw new TypeError('HumanMatchStudyRecord.matches 必须是数组。');
  }
  if (source.matches.length > definition.matchesPerParticipant) {
    throw new RangeError('HumanMatchStudyRecord.matches 超过 Study 预注册数量。');
  }
  if (
    submission.status === HUMAN_MATCH_STUDY_STATUS.COMPLETED
    && source.matches.length !== definition.matchesPerParticipant
  ) throw new RangeError('completed HumanMatchStudyRecord 必须包含完整预注册对局。');
  const matches = Object.freeze(source.matches.map((match, index) => (
    cloneMatch(definition, submission.assignment, match, index)
  )));
  return Object.freeze({
    schemaVersion: HUMAN_MATCH_STUDY_RECORD_SCHEMA_VERSION,
    ...submission,
    matches,
  });
}

export function getHumanMatchStudyProtocolExclusionReasons(
  definitionValue: unknown,
  recordValue: unknown,
): readonly HumanMatchStudyExclusionReason[] {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const record = createHumanMatchStudyRecord(definition, recordValue);
  const reasons: HumanMatchStudyExclusionReason[] = [];
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
  const environmentChecks: readonly [
    keyof HumanMatchStudyObservedEnvironment,
    HumanMatchStudyExclusionReason,
  ][] = [
    ['platform', HUMAN_MATCH_STUDY_EXCLUSION_REASON.PLATFORM_MISMATCH],
    ['formFactor', HUMAN_MATCH_STUDY_EXCLUSION_REASON.FORM_FACTOR_MISMATCH],
    ['orientation', HUMAN_MATCH_STUDY_EXCLUSION_REASON.ORIENTATION_MISMATCH],
    ['inputMode', HUMAN_MATCH_STUDY_EXCLUSION_REASON.INPUT_MODE_MISMATCH],
  ];
  for (const [field, reason] of environmentChecks) {
    if (record.environment[field] !== definition.environment[field]) reasons.push(reason);
  }
  return Object.freeze(reasons);
}

export function getHumanMatchStudyExclusionReasons(
  definitionValue: unknown,
  recordValue: unknown,
): readonly HumanMatchStudyExclusionReason[] {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  const record = createHumanMatchStudyRecord(definition, recordValue);
  const reasons = [...getHumanMatchStudyProtocolExclusionReasons(definition, record)];
  if (record.status === HUMAN_MATCH_STUDY_STATUS.INVALIDATED) {
    reasons.push(HUMAN_MATCH_STUDY_EXCLUSION_REASON.INVALIDATED);
  }
  return Object.freeze(reasons);
}
