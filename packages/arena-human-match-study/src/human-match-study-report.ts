import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  createHumanMatchStudyDefinition,
  type HumanMatchStudyArm,
  type HumanMatchStudyDefinition,
} from './human-match-study-definition.js';
import {
  HUMAN_MATCH_STUDY_EXCLUSION_REASON,
  HUMAN_MATCH_STUDY_OPPONENT_GUESS,
  HUMAN_MATCH_STUDY_STATUS,
  createHumanMatchStudyRecord,
  getHumanMatchStudyProtocolExclusionReasons,
  type HumanMatchStudyExclusionReason,
  type HumanMatchStudyRecord,
  type HumanMatchStudySelfReport,
} from './human-match-study-record.js';

export const HUMAN_MATCH_STUDY_REPORT_SCHEMA_VERSION = 1;

export const HUMAN_MATCH_STUDY_REPORT_STATUS = Object.freeze({
  INCOMPLETE: 'incomplete',
  FAILED: 'failed',
  READY: 'ready',
} as const);

const MAXIMUM_RECORDS = 10_000;
const WILSON_95_Z = 1.959963984540054;

export type HumanMatchStudyReportStatus = typeof HUMAN_MATCH_STUDY_REPORT_STATUS[
  keyof typeof HUMAN_MATCH_STUDY_REPORT_STATUS
];

export interface HumanMatchStudyWilsonInterval {
  readonly confidence: 0.95;
  readonly lower: number;
  readonly upper: number;
  readonly width: number;
}

export interface HumanMatchStudyArmSummary {
  readonly armId: string;
  readonly difficultyId: HumanMatchStudyArm['difficultyId'];
  readonly botStrengthRank: number;
  readonly assignedParticipants: number;
  readonly protocolEligibleParticipants: number;
  readonly invalidatedParticipants: number;
  readonly invalidationRate: number | null;
  readonly analysisEligibleParticipants: number;
  readonly completedParticipants: number;
  readonly completionRate: number | null;
  readonly sessionWins: number;
  readonly sessionWinRate: number | null;
  readonly sessionWinWilsonInterval: HumanMatchStudyWilsonInterval | null;
  readonly completedMatches: number;
  readonly targetDurationMatches: number;
  readonly targetDurationShare: number | null;
  readonly botGuesses: number;
  readonly botGuessRate: number | null;
  readonly fairnessRatingAverage: number | null;
  readonly naturalnessRatingAverage: number | null;
  readonly rematches: number;
  readonly rematchRate: number | null;
}

export interface HumanMatchStudyReportGate {
  readonly id: string;
  readonly available: boolean;
  readonly value: number | null;
  readonly threshold: unknown;
  readonly passed: boolean;
}

export interface HumanMatchStudyAggregateSummary {
  readonly completedParticipants: number;
  readonly sessionWins: number;
  readonly sessionWinRate: number | null;
  readonly sessionWinWilsonInterval: HumanMatchStudyWilsonInterval | null;
  readonly completedMatches: number;
  readonly targetDurationMatches: number;
  readonly targetDurationShare: number | null;
  readonly botGuesses: number;
  readonly botGuessRate: number | null;
  readonly fairnessRatingAverage: number | null;
  readonly naturalnessRatingAverage: number | null;
  readonly rematches: number;
  readonly rematchRate: number | null;
  readonly protocolEligibleParticipants: number;
  readonly invalidatedParticipants: number;
  readonly invalidationRate: number | null;
}

interface ReportSummary {
  readonly gates: readonly HumanMatchStudyReportGate[];
  readonly aggregate: HumanMatchStudyAggregateSummary;
}

export interface HumanMatchStudyReport {
  readonly schemaVersion: 1;
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly commit: string | null;
  readonly buildId: string | null;
  readonly totalRecords: number;
  readonly sourceDataHash: string;
  readonly status: HumanMatchStudyReportStatus;
  readonly incompleteGateIds: readonly string[];
  readonly failedGateIds: readonly string[];
  readonly excludedByReason: Readonly<Record<HumanMatchStudyExclusionReason, number>>;
  readonly arms: readonly HumanMatchStudyArmSummary[];
  readonly aggregate: HumanMatchStudyAggregateSummary;
  readonly gates: readonly HumanMatchStudyReportGate[];
  readonly resultHash: string;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const value of values) {
    sum += value;
    if (!Number.isSafeInteger(sum)) throw new RangeError('Human Match Study 评分求和溢出。');
  }
  return sum / values.length;
}

function wilsonInterval(successes: number, total: number): HumanMatchStudyWilsonInterval | null {
  if (total === 0) return null;
  const proportion = successes / total;
  const zSquared = WILSON_95_Z ** 2;
  const denominator = 1 + zSquared / total;
  const center = (proportion + zSquared / (2 * total)) / denominator;
  const margin = (
    WILSON_95_Z
    * Math.sqrt(
      proportion * (1 - proportion) / total
      + zSquared / (4 * total ** 2),
    )
    / denominator
  );
  const lower = Math.max(0, center - margin);
  const upper = Math.min(1, center + margin);
  return Object.freeze({ confidence: 0.95, lower, upper, width: upper - lower });
}

function sessionWon(record: HumanMatchStudyRecord): boolean {
  let wins = 0;
  let losses = 0;
  for (const match of record.matches) {
    const winnerId = match.result.authorityResult.winnerId;
    if (winnerId === 'player-1') wins += 1;
    else if (winnerId === 'player-2') losses += 1;
  }
  return wins > losses;
}

function requireSelfReport(record: HumanMatchStudyRecord): HumanMatchStudySelfReport {
  if (record.selfReport === null) {
    throw new Error('completed Human Match Study record 缺少 selfReport。');
  }
  return record.selfReport;
}

function createArmSummary(
  definition: HumanMatchStudyDefinition,
  arm: HumanMatchStudyArm,
  records: readonly HumanMatchStudyRecord[],
): HumanMatchStudyArmSummary {
  const assigned = records.filter(({ assignment }) => assignment.armId === arm.id);
  const protocolEligible = assigned.filter((record) => (
    getHumanMatchStudyProtocolExclusionReasons(definition, record).length === 0
  ));
  const invalidated = protocolEligible.filter(({ status }) => (
    status === HUMAN_MATCH_STUDY_STATUS.INVALIDATED
  ));
  const analysisEligible = protocolEligible.filter(({ status }) => (
    status !== HUMAN_MATCH_STUDY_STATUS.INVALIDATED
  ));
  const completed = analysisEligible.filter(({ status }) => (
    status === HUMAN_MATCH_STUDY_STATUS.COMPLETED
  ));
  const sessionWins = completed.filter(sessionWon).length;
  const completedMatches = completed.flatMap(({ matches }) => matches);
  const targetDurationMatches = completedMatches.filter(({ result }) => (
    result.authorityResult.endedAtTick >= definition.thresholds.targetMinimumTicks
    && result.authorityResult.endedAtTick <= definition.thresholds.targetMaximumTicks
  )).length;
  const selfReports = completed.map(requireSelfReport);
  const botGuesses = selfReports.filter(({ opponentTypeGuess }) => (
    opponentTypeGuess === HUMAN_MATCH_STUDY_OPPONENT_GUESS.BOT
  )).length;
  const rematches = selfReports.filter(({ wouldRematch }) => wouldRematch).length;
  return Object.freeze({
    armId: arm.id,
    difficultyId: arm.difficultyId,
    botStrengthRank: arm.botStrengthRank,
    assignedParticipants: assigned.length,
    protocolEligibleParticipants: protocolEligible.length,
    invalidatedParticipants: invalidated.length,
    invalidationRate: ratio(invalidated.length, protocolEligible.length),
    analysisEligibleParticipants: analysisEligible.length,
    completedParticipants: completed.length,
    completionRate: ratio(completed.length, analysisEligible.length),
    sessionWins,
    sessionWinRate: ratio(sessionWins, completed.length),
    sessionWinWilsonInterval: wilsonInterval(sessionWins, completed.length),
    completedMatches: completedMatches.length,
    targetDurationMatches,
    targetDurationShare: ratio(targetDurationMatches, completedMatches.length),
    botGuesses,
    botGuessRate: ratio(botGuesses, selfReports.length),
    fairnessRatingAverage: average(selfReports.map(({ fairnessRating }) => fairnessRating)),
    naturalnessRatingAverage: average(
      selfReports.map(({ naturalnessRating }) => naturalnessRating),
    ),
    rematches,
    rematchRate: ratio(rematches, selfReports.length),
  });
}

function gate(
  id: string,
  value: number | null,
  threshold: unknown,
  passed: boolean,
  available = true,
): HumanMatchStudyReportGate {
  return Object.freeze({ id, available, value, threshold, passed });
}

function numericOrNull(value: number | null): number | null {
  return value === null ? null : value;
}

function createGates(
  definition: HumanMatchStudyDefinition,
  arms: readonly HumanMatchStudyArmSummary[],
  completedRecords: readonly HumanMatchStudyRecord[],
  protocolEligibleRecords: readonly HumanMatchStudyRecord[],
): ReportSummary {
  const thresholds = definition.thresholds;
  const gates = [];
  for (const arm of arms) {
    const definitionArm = definition.getArm(arm.armId);
    if (!definitionArm) throw new Error(`Human Match Study 缺少 arm ${arm.armId}。`);
    gates.push(gate(
      `sample.${arm.armId}`,
      arm.completedParticipants,
      thresholds.minimumEligibleParticipantsPerArm,
      arm.completedParticipants >= thresholds.minimumEligibleParticipantsPerArm,
    ));
    gates.push(gate(
      `completion.${arm.armId}`,
      numericOrNull(arm.completionRate),
      thresholds.minimumCompletionRate,
      arm.completionRate !== null && arm.completionRate >= thresholds.minimumCompletionRate,
      arm.completionRate !== null,
    ));
    gates.push(gate(
      `win-rate.${arm.armId}`,
      numericOrNull(arm.sessionWinRate),
      Object.freeze({
        minimum: definitionArm.minimumSessionWinRate,
        maximum: definitionArm.maximumSessionWinRate,
      }),
      arm.sessionWinRate !== null
        && arm.sessionWinRate >= definitionArm.minimumSessionWinRate
        && arm.sessionWinRate <= definitionArm.maximumSessionWinRate,
      arm.sessionWinRate !== null,
    ));
    gates.push(gate(
      `duration.target-share.${arm.armId}`,
      numericOrNull(arm.targetDurationShare),
      thresholds.minimumTargetDurationShare,
      arm.targetDurationShare !== null
        && arm.targetDurationShare >= thresholds.minimumTargetDurationShare,
      arm.targetDurationShare !== null,
    ));
    gates.push(gate(
      `perception.bot-guess-rate.${arm.armId}`,
      numericOrNull(arm.botGuessRate),
      thresholds.maximumBotGuessRate,
      arm.botGuessRate !== null && arm.botGuessRate <= thresholds.maximumBotGuessRate,
      arm.botGuessRate !== null,
    ));
    gates.push(gate(
      `perception.fairness-average.${arm.armId}`,
      numericOrNull(arm.fairnessRatingAverage),
      thresholds.minimumFairnessRatingAverage,
      arm.fairnessRatingAverage !== null
        && arm.fairnessRatingAverage >= thresholds.minimumFairnessRatingAverage,
      arm.fairnessRatingAverage !== null,
    ));
    gates.push(gate(
      `perception.naturalness-average.${arm.armId}`,
      numericOrNull(arm.naturalnessRatingAverage),
      thresholds.minimumNaturalnessRatingAverage,
      arm.naturalnessRatingAverage !== null
        && arm.naturalnessRatingAverage >= thresholds.minimumNaturalnessRatingAverage,
      arm.naturalnessRatingAverage !== null,
    ));
    gates.push(gate(
      `retention.rematch-rate.${arm.armId}`,
      numericOrNull(arm.rematchRate),
      thresholds.minimumRematchRate,
      arm.rematchRate !== null && arm.rematchRate >= thresholds.minimumRematchRate,
      arm.rematchRate !== null,
    ));
  }

  const invalidatedParticipants = protocolEligibleRecords.filter(({ status }) => (
    status === HUMAN_MATCH_STUDY_STATUS.INVALIDATED
  )).length;
  const invalidationRate = ratio(invalidatedParticipants, protocolEligibleRecords.length);
  gates.push(gate(
    'integrity.invalidation-rate',
    invalidationRate,
    thresholds.maximumInvalidationRate,
    invalidationRate !== null && invalidationRate <= thresholds.maximumInvalidationRate,
    invalidationRate !== null,
  ));

  const aggregateSessionWins = completedRecords.filter(sessionWon).length;
  const aggregateSessionWinRate = ratio(aggregateSessionWins, completedRecords.length);
  const aggregateWilson = wilsonInterval(aggregateSessionWins, completedRecords.length);
  gates.push(gate(
    'win-rate.aggregate',
    aggregateSessionWinRate,
    Object.freeze({
      minimum: thresholds.minimumAggregateSessionWinRate,
      maximum: thresholds.maximumAggregateSessionWinRate,
    }),
    aggregateSessionWinRate !== null
      && aggregateSessionWinRate >= thresholds.minimumAggregateSessionWinRate
      && aggregateSessionWinRate <= thresholds.maximumAggregateSessionWinRate,
    aggregateSessionWinRate !== null,
  ));
  gates.push(gate(
    'win-rate.aggregate-wilson-width',
    aggregateWilson?.width ?? null,
    thresholds.maximumAggregateWilsonIntervalWidth,
    aggregateWilson !== null
      && aggregateWilson.width <= thresholds.maximumAggregateWilsonIntervalWidth,
    aggregateWilson !== null,
  ));

  const weakestBot = [...arms].sort((left, right) => (
    left.botStrengthRank - right.botStrengthRank
  ))[0];
  const strongestBot = [...arms].sort((left, right) => (
    right.botStrengthRank - left.botStrengthRank
  ))[0];
  if (!weakestBot || !strongestBot) {
    throw new Error('Human Match Study report 至少需要一个 arm。');
  }
  const extremeDelta = weakestBot.sessionWinRate === null || strongestBot.sessionWinRate === null
    ? null
    : weakestBot.sessionWinRate - strongestBot.sessionWinRate;
  gates.push(gate(
    'win-rate.extreme-difficulty-delta',
    extremeDelta,
    thresholds.minimumExtremeSessionWinRateDelta,
    extremeDelta !== null && extremeDelta >= thresholds.minimumExtremeSessionWinRateDelta,
    extremeDelta !== null,
  ));
  const rankedArms = [...arms].sort((left, right) => (
    left.botStrengthRank - right.botStrengthRank
  ));
  for (let index = 1; index < rankedArms.length; index += 1) {
    const weaker = rankedArms[index - 1];
    const stronger = rankedArms[index];
    if (!weaker || !stronger) throw new Error('Human Match Study arm 排序结果不完整。');
    const inversion = weaker.sessionWinRate === null || stronger.sessionWinRate === null
      ? null
      : stronger.sessionWinRate - weaker.sessionWinRate;
    gates.push(gate(
      `win-rate.adjacent-inversion.${weaker.armId}.${stronger.armId}`,
      inversion,
      thresholds.maximumAdjacentSessionWinRateInversion,
      inversion !== null
        && inversion <= thresholds.maximumAdjacentSessionWinRateInversion,
      inversion !== null,
    ));
  }

  const completedMatches = completedRecords.flatMap(({ matches }) => matches);
  const targetDurationMatches = completedMatches.filter(({ result }) => (
    result.authorityResult.endedAtTick >= thresholds.targetMinimumTicks
    && result.authorityResult.endedAtTick <= thresholds.targetMaximumTicks
  )).length;
  const targetDurationShare = ratio(targetDurationMatches, completedMatches.length);
  gates.push(gate(
    'duration.target-share',
    targetDurationShare,
    thresholds.minimumTargetDurationShare,
    targetDurationShare !== null
      && targetDurationShare >= thresholds.minimumTargetDurationShare,
    targetDurationShare !== null,
  ));

  const selfReports = completedRecords.map(requireSelfReport);
  const botGuesses = selfReports.filter(({ opponentTypeGuess }) => (
    opponentTypeGuess === HUMAN_MATCH_STUDY_OPPONENT_GUESS.BOT
  )).length;
  const botGuessRate = ratio(botGuesses, selfReports.length);
  const fairnessAverage = average(selfReports.map(({ fairnessRating }) => fairnessRating));
  const naturalnessAverage = average(selfReports.map(({ naturalnessRating }) => naturalnessRating));
  const rematches = selfReports.filter(({ wouldRematch }) => wouldRematch).length;
  const rematchRate = ratio(rematches, selfReports.length);
  gates.push(gate(
    'perception.bot-guess-rate',
    botGuessRate,
    thresholds.maximumBotGuessRate,
    botGuessRate !== null && botGuessRate <= thresholds.maximumBotGuessRate,
    botGuessRate !== null,
  ));
  gates.push(gate(
    'perception.fairness-average',
    fairnessAverage,
    thresholds.minimumFairnessRatingAverage,
    fairnessAverage !== null && fairnessAverage >= thresholds.minimumFairnessRatingAverage,
    fairnessAverage !== null,
  ));
  gates.push(gate(
    'perception.naturalness-average',
    naturalnessAverage,
    thresholds.minimumNaturalnessRatingAverage,
    naturalnessAverage !== null
      && naturalnessAverage >= thresholds.minimumNaturalnessRatingAverage,
    naturalnessAverage !== null,
  ));
  gates.push(gate(
    'retention.rematch-rate',
    rematchRate,
    thresholds.minimumRematchRate,
    rematchRate !== null && rematchRate >= thresholds.minimumRematchRate,
    rematchRate !== null,
  ));

  return Object.freeze({
    gates: Object.freeze(gates),
    aggregate: Object.freeze({
      completedParticipants: completedRecords.length,
      sessionWins: aggregateSessionWins,
      sessionWinRate: aggregateSessionWinRate,
      sessionWinWilsonInterval: aggregateWilson,
      completedMatches: completedMatches.length,
      targetDurationMatches,
      targetDurationShare,
      botGuesses,
      botGuessRate,
      fairnessRatingAverage: fairnessAverage,
      naturalnessRatingAverage: naturalnessAverage,
      rematches,
      rematchRate,
      protocolEligibleParticipants: protocolEligibleRecords.length,
      invalidatedParticipants,
      invalidationRate,
    }),
  });
}

function compareRecords(left: HumanMatchStudyRecord, right: HumanMatchStudyRecord): number {
  if (left.assignment.enrollmentIndex !== right.assignment.enrollmentIndex) {
    return left.assignment.enrollmentIndex - right.assignment.enrollmentIndex;
  }
  return left.recordId < right.recordId ? -1 : left.recordId > right.recordId ? 1 : 0;
}

function addUnique<T>(set: Set<T>, value: T, label: string): void {
  if (set.has(value)) throw new RangeError(`Human Match Study 重复 ${label} ${String(value)}。`);
  set.add(value);
}

export function createHumanMatchStudyReport(
  definitionValue: unknown,
  recordValues: unknown,
): HumanMatchStudyReport {
  const definition = createHumanMatchStudyDefinition(definitionValue);
  if (!Array.isArray(recordValues)) {
    throw new TypeError('HumanMatchStudyReport records 必须是数组。');
  }
  if (recordValues.length > MAXIMUM_RECORDS) {
    throw new RangeError(`HumanMatchStudyReport records 不能超过 ${MAXIMUM_RECORDS} 条。`);
  }
  const recordSources = cloneFrozenData(recordValues, 'HumanMatchStudyReport source records');
  if (!Array.isArray(recordSources)) {
    throw new TypeError('HumanMatchStudyReport records 克隆结果必须是数组。');
  }
  const records = recordSources.map((value) => createHumanMatchStudyRecord(definition, value));
  const identities = {
    recordIds: new Set<string>(),
    participantIds: new Set<string>(),
    assignmentIds: new Set<string>(),
    enrollmentIndexes: new Set<number>(),
    matchSeeds: new Set<number>(),
    artifactIds: new Set<string>(),
    artifactPaths: new Set<string>(),
  };
  let commit: string | null = null;
  let buildId: string | null = null;
  for (const record of records) {
    addUnique(identities.recordIds, record.recordId, 'recordId');
    addUnique(identities.participantIds, record.assignment.participantId, 'participantId');
    addUnique(identities.assignmentIds, record.assignment.assignmentId, 'assignmentId');
    addUnique(
      identities.enrollmentIndexes,
      record.assignment.enrollmentIndex,
      'enrollmentIndex',
    );
    commit ??= record.commit;
    buildId ??= record.buildId;
    if (record.commit !== commit || record.buildId !== buildId) {
      throw new RangeError('Human Match Study records 必须来自同一 commit/build。');
    }
    for (const match of record.matches) {
      addUnique(identities.matchSeeds, match.result.matchSeed, 'matchSeed');
      addUnique(identities.artifactIds, match.replayArtifact.id, 'replay artifact id');
      addUnique(identities.artifactPaths, match.replayArtifact.path, 'replay artifact path');
    }
  }
  const enrollmentIndexes = [...identities.enrollmentIndexes].sort((left, right) => left - right);
  enrollmentIndexes.forEach((value, index) => {
    if (value !== index) {
      throw new RangeError(
        `Human Match Study enrollmentIndex 必须从 0 连续；缺少 ${index}。`,
      );
    }
  });
  const sortedRecords = [...records].sort(compareRecords);
  const protocolEligible = sortedRecords.filter((record) => (
    getHumanMatchStudyProtocolExclusionReasons(definition, record).length === 0
  ));
  const completed = protocolEligible.filter(({ status }) => (
    status === HUMAN_MATCH_STUDY_STATUS.COMPLETED
  ));
  const arms = definition.arms.map((arm) => createArmSummary(definition, arm, sortedRecords));
  const summary = createGates(definition, arms, completed, protocolEligible);
  const sampleGateIds = new Set(definition.arms.map(({ id }) => `sample.${id}`));
  const incompleteGateIds = summary.gates
    .filter(({ id, passed }) => sampleGateIds.has(id) && !passed)
    .map(({ id }) => id);
  const failedGateIds = summary.gates
    .filter(({ id, available, passed }) => !sampleGateIds.has(id) && available && !passed)
    .map(({ id }) => id);
  const status = incompleteGateIds.length > 0
    ? HUMAN_MATCH_STUDY_REPORT_STATUS.INCOMPLETE
    : failedGateIds.length > 0
      ? HUMAN_MATCH_STUDY_REPORT_STATUS.FAILED
      : HUMAN_MATCH_STUDY_REPORT_STATUS.READY;
  const excludedByReason = Object.fromEntries(
    Object.values(HUMAN_MATCH_STUDY_EXCLUSION_REASON).map((reason) => [reason, 0]),
  ) as Record<HumanMatchStudyExclusionReason, number>;
  for (const record of sortedRecords) {
    const reasons = getHumanMatchStudyProtocolExclusionReasons(definition, record);
    if (record.status === HUMAN_MATCH_STUDY_STATUS.INVALIDATED) {
      excludedByReason[HUMAN_MATCH_STUDY_EXCLUSION_REASON.INVALIDATED] += 1;
    }
    for (const reason of reasons) excludedByReason[reason] += 1;
  }
  const result = cloneFrozenData({
    schemaVersion: HUMAN_MATCH_STUDY_REPORT_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit,
    buildId,
    totalRecords: records.length,
    sourceDataHash: createDeterministicDataHash(sortedRecords, 'HumanMatchStudy source records'),
    status,
    incompleteGateIds,
    failedGateIds,
    excludedByReason,
    arms,
    aggregate: summary.aggregate,
    gates: summary.gates,
  }, 'HumanMatchStudyReport');
  return cloneFrozenData({
    ...result,
    resultHash: createDeterministicDataHash(result, 'HumanMatchStudyReport result'),
  }, 'HumanMatchStudyReport with hash') as HumanMatchStudyReport;
}
