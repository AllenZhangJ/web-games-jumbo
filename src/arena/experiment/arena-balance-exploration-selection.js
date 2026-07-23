import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_BALANCE_CANDIDATE_COLLECTOR_ID } from './arena-balance-candidate-collector.js';
import { ARENA_BOT_CAPABILITY_COLLECTOR_ID } from '@number-strategy-jump/arena-v1-experiment';
import { readArenaExperimentReportBundle } from '@number-strategy-jump/arena-experiment';
import { readArenaMetricGate } from '@number-strategy-jump/arena-experiment';

export const ARENA_BALANCE_EXPLORATION_SELECTION_SCHEMA_VERSION = 1;

export const ARENA_BALANCE_EXPLORATION_SELECTION_POLICY = Object.freeze({
  schemaVersion: ARENA_BALANCE_EXPLORATION_SELECTION_SCHEMA_VERSION,
  method: 'minimum-normalized-policy-violation',
  eligibility: Object.freeze([
    'clean-source',
    'all-cases-completed',
    'bot-gate-passed',
    'sample-gates-passed',
    'no-untracked-equipment-events',
  ]),
  penaltyComponents: Object.freeze([
    'duration.target-share-shortfall',
    'duration.median-outside-target',
    'duration.ultra-short-excess',
    'duration.timeout-excess',
    'elimination.credited-share-shortfall',
    'elimination.equipment-share-outside-range',
    'elimination.environment-share-shortfall',
    'equipment.failed-gate-count',
  ]),
  tieBreak: Object.freeze([
    'lower-penalty',
    'higher-target-duration-share',
    'lower-median-distance-to-target-midpoint',
    'candidate-id-ascending',
  ]),
});

const OPTIONS_KEYS = new Set(['expectedCandidates']);
const EXPECTED_CANDIDATE_KEYS = new Set([
  'candidateId',
  'experimentId',
  'livesPerParticipant',
]);

function cloneExpectedCandidates(values) {
  const source = cloneFrozenData(values, 'Balance exploration expectedCandidates');
  if (!Array.isArray(source) || source.length === 0) {
    throw new RangeError('Balance exploration expectedCandidates 必须是非空数组。');
  }
  const candidateIds = new Set();
  const experimentIds = new Set();
  const lives = new Set();
  const result = source.map((value, index) => {
    const name = `Balance exploration expectedCandidates[${index}]`;
    assertKnownKeys(value, EXPECTED_CANDIDATE_KEYS, name);
    const candidateId = assertNonEmptyString(value.candidateId, `${name}.candidateId`);
    const experimentId = assertNonEmptyString(value.experimentId, `${name}.experimentId`);
    const livesPerParticipant = assertIntegerAtLeast(
      value.livesPerParticipant,
      1,
      `${name}.livesPerParticipant`,
    );
    if (candidateIds.has(candidateId)) throw new RangeError(`重复候选 ${candidateId}。`);
    if (experimentIds.has(experimentId)) throw new RangeError(`重复实验 ${experimentId}。`);
    if (lives.has(livesPerParticipant)) {
      throw new RangeError(`重复 livesPerParticipant ${livesPerParticipant}。`);
    }
    candidateIds.add(candidateId);
    experimentIds.add(experimentId);
    lives.add(livesPerParticipant);
    return Object.freeze({ candidateId, experimentId, livesPerParticipant });
  }).sort((left, right) => (
    left.candidateId < right.candidateId ? -1 : left.candidateId > right.candidateId ? 1 : 0
  ));
  return Object.freeze(result);
}

function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value;
}

function ratio(value, name) {
  const result = finite(value, name);
  if (result < 0 || result > 1) throw new RangeError(`${name} 必须位于 [0, 1]。`);
  return result;
}

function optionalFinite(value, name) {
  return value === null ? null : finite(value, name);
}

function optionalRatio(value, name) {
  return value === null ? null : ratio(value, name);
}

function metricData(report, collectorId) {
  const metric = report.metrics.find(({ id }) => id === collectorId);
  if (!metric) throw new Error(`Balance exploration report 缺少 ${collectorId}。`);
  return metric.data;
}

function checkMap(gate) {
  return new Map(gate.checks.map(({ id, passed }) => [id, passed]));
}

function normalizedShortfall(value, minimum) {
  if (value >= minimum) return 0;
  return (minimum - value) / Math.max(minimum, 1e-12);
}

function normalizedExcess(value, maximum) {
  if (value <= maximum) return 0;
  return (value - maximum) / Math.max(1 - maximum, 1e-12);
}

function normalizedRangeDistance(value, minimum, maximum) {
  if (value < minimum) return normalizedShortfall(value, minimum);
  if (value > maximum) return normalizedExcess(value, maximum);
  return 0;
}

function medianDistanceToRange(medianTicks, minimum, maximum) {
  if (medianTicks < minimum) return (minimum - medianTicks) / minimum;
  if (medianTicks > maximum) return (medianTicks - maximum) / maximum;
  return 0;
}

function createRanking(bundle) {
  const report = bundle.report;
  const balance = metricData(report, ARENA_BALANCE_CANDIDATE_COLLECTOR_ID);
  const bot = metricData(report, ARENA_BOT_CAPABILITY_COLLECTOR_ID);
  const balanceGate = readArenaMetricGate(balance);
  const botGate = readArenaMetricGate(bot);
  if (balanceGate === null || botGate === null) {
    throw new Error('Balance exploration collectors 必须输出 Metric Gate。');
  }
  const policy = balance.policy;
  const overall = balance.derived?.overall;
  if (!overall || typeof overall !== 'object') {
    throw new TypeError('Balance exploration 缺少 derived.overall。');
  }
  const checks = checkMap(balanceGate);
  const requiredSampleChecks = balanceGate.checks.filter(({ id }) => (
    id === 'sample.completed-paired-cases'
    || id.endsWith('.sample-complete')
  ));
  const eligibility = Object.freeze({
    cleanSource: bundle.definition.candidate.sourceDirty === false,
    allCasesCompleted: report.failedCaseCount === 0
      && report.remainingCaseCount === 0
      && report.completedCaseCount === report.plannedCaseCount,
    botGatePassed: botGate.passed,
    sampleGatesPassed: requiredSampleChecks.length === 4
      && requiredSampleChecks.every(({ passed }) => passed),
    noUntrackedEquipmentEvents: checks.get('equipment.no-untracked-events') === true,
  });
  const eligible = Object.values(eligibility).every(Boolean);
  const targetDurationShare = optionalRatio(
    overall.targetDurationShare,
    'Balance exploration targetDurationShare',
  );
  const ultraShortShare = optionalRatio(
    overall.ultraShortShare,
    'Balance exploration ultraShortShare',
  );
  const timeoutShare = optionalRatio(
    overall.timeoutShare,
    'Balance exploration timeoutShare',
  );
  const creditedEliminationShare = optionalRatio(
    overall.creditedEliminationShare,
    'Balance exploration creditedEliminationShare',
  );
  const equipmentAttributedEliminationShare = optionalRatio(
    overall.equipmentAttributedEliminationShare,
    'Balance exploration equipmentAttributedEliminationShare',
  );
  const environmentShare = optionalRatio(
    overall.uncreditedEnvironmentEliminationShare,
    'Balance exploration uncreditedEnvironmentEliminationShare',
  );
  const medianTicks = optionalFinite(
    overall.medianTicks,
    'Balance exploration medianTicks',
  );
  const metricsAvailable = [
    targetDurationShare,
    ultraShortShare,
    timeoutShare,
    creditedEliminationShare,
    equipmentAttributedEliminationShare,
    environmentShare,
    medianTicks,
  ].every((value) => value !== null);
  if (eligible && !metricsAvailable) {
    throw new Error('符合选择资格的 Balance exploration report 不得缺少派生指标。');
  }
  const equipmentFailedGateCount = balanceGate.checks.filter(({ id, passed }) => (
    id.startsWith('equipment.')
    && id !== 'equipment.no-untracked-events'
    && !passed
  )).length;
  const penalties = Object.freeze({
    'duration.target-share-shortfall': targetDurationShare === null
      ? 1
      : normalizedShortfall(targetDurationShare, policy.duration.minimumTargetShare),
    'duration.median-outside-target': medianTicks === null
      ? 1
      : medianDistanceToRange(
        medianTicks,
        policy.duration.targetMinimumTicks,
        policy.duration.targetMaximumTicks,
      ),
    'duration.ultra-short-excess': ultraShortShare === null
      ? 1
      : normalizedExcess(ultraShortShare, policy.duration.maximumUltraShortShare),
    'duration.timeout-excess': timeoutShare === null
      ? 1
      : normalizedExcess(timeoutShare, policy.duration.maximumTimeoutShare),
    'elimination.credited-share-shortfall': creditedEliminationShare === null
      ? 1
      : normalizedShortfall(
        creditedEliminationShare,
        policy.elimination.minimumCreditedShare,
      ),
    'elimination.equipment-share-outside-range':
      equipmentAttributedEliminationShare === null
        ? 1
        : normalizedRangeDistance(
          equipmentAttributedEliminationShare,
          policy.elimination.minimumEquipmentAttributedShare,
          policy.elimination.maximumEquipmentAttributedShare,
        ),
    'elimination.environment-share-shortfall': environmentShare === null
      ? 1
      : normalizedShortfall(environmentShare, policy.elimination.minimumEnvironmentShare),
    'equipment.failed-gate-count': equipmentFailedGateCount,
  });
  const penalty = Object.values(penalties).reduce((sum, value) => sum + value, 0);
  const midpoint = (
    policy.duration.targetMinimumTicks + policy.duration.targetMaximumTicks
  ) / 2;
  return cloneFrozenData({
    candidateId: bundle.definition.candidate.id,
    experimentDefinitionId: bundle.definition.id,
    definitionHash: report.definitionHash,
    resultHash: report.resultHash,
    reportBundleHash: bundle.bundleHash,
    livesPerParticipant: bundle.definition.candidate.matchConfig.livesPerParticipant,
    eligible,
    eligibility,
    metricsAvailable,
    penalty,
    penalties,
    targetDurationShare,
    medianTicks,
    medianDistanceToTargetMidpoint: medianTicks === null
      ? null
      : Math.abs(medianTicks - midpoint),
    failedBalanceCheckIds: balanceGate.checks
      .filter(({ passed }) => !passed)
      .map(({ id }) => id),
  }, `Balance exploration ranking ${bundle.definition.candidate.id}`);
}

function compareRankings(left, right) {
  if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
  if (left.penalty !== right.penalty) return left.penalty - right.penalty;
  if (left.targetDurationShare === null || right.targetDurationShare === null) {
    if (left.targetDurationShare !== right.targetDurationShare) {
      return left.targetDurationShare === null ? 1 : -1;
    }
  } else if (left.targetDurationShare !== right.targetDurationShare) {
    return right.targetDurationShare - left.targetDurationShare;
  }
  if (
    left.medianDistanceToTargetMidpoint === null
    || right.medianDistanceToTargetMidpoint === null
  ) {
    if (left.medianDistanceToTargetMidpoint !== right.medianDistanceToTargetMidpoint) {
      return left.medianDistanceToTargetMidpoint === null ? 1 : -1;
    }
  } else if (left.medianDistanceToTargetMidpoint !== right.medianDistanceToTargetMidpoint) {
    return left.medianDistanceToTargetMidpoint - right.medianDistanceToTargetMidpoint;
  }
  return left.candidateId < right.candidateId ? -1 : left.candidateId > right.candidateId ? 1 : 0;
}

export function createArenaBalanceExplorationSelection(reportBundlesValue, optionsValue) {
  const options = cloneFrozenData(optionsValue, 'Balance exploration selection options');
  assertKnownKeys(options, OPTIONS_KEYS, 'Balance exploration selection options');
  const expectedCandidates = cloneExpectedCandidates(options.expectedCandidates);
  const source = cloneFrozenData(reportBundlesValue, 'Balance exploration report bundles');
  if (!Array.isArray(source) || source.length !== expectedCandidates.length) {
    throw new RangeError('Balance exploration report bundles 必须恰好覆盖候选矩阵。');
  }
  const bundles = source.map(readArenaExperimentReportBundle);
  const expectedByCandidateId = new Map(expectedCandidates.map((value) => [
    value.candidateId,
    value,
  ]));
  const actualCandidateIds = bundles
    .map(({ definition }) => definition.candidate.id)
    .sort();
  if (actualCandidateIds.some((id, index) => id !== expectedCandidates[index].candidateId)) {
    throw new Error('Balance exploration report bundles 未恰好覆盖预注册候选矩阵。');
  }
  for (const bundle of bundles) {
    const candidate = expectedByCandidateId.get(bundle.definition.candidate.id);
    if (!candidate) throw new Error('Balance exploration report bundles 包含未预注册候选。');
    if (bundle.definition.id !== candidate.experimentId) {
      throw new Error(`Balance exploration ${candidate.candidateId} experiment ID 漂移。`);
    }
    if (
      bundle.definition.candidate.matchConfig.livesPerParticipant
      !== candidate.livesPerParticipant
    ) throw new Error(`Balance exploration ${candidate.candidateId} lives 配置漂移。`);
  }
  const sourceCommit = bundles[0].definition.candidate.sourceCommit;
  const policyHashes = new Set();
  const seedSetHashes = new Set();
  const workloadHashes = new Set();
  const collectorHashes = new Set();
  const comparableConfigHashes = new Set();
  const authorityContentHashes = new Set();
  for (const bundle of bundles) {
    if (bundle.suite !== 'balance-candidate') {
      throw new Error('Balance exploration 子报告 suite 必须是 balance-candidate。');
    }
    if (bundle.definition.candidate.sourceCommit !== sourceCommit) {
      throw new Error('Balance exploration 子报告必须来自同一 source commit。');
    }
    const balance = metricData(bundle.report, ARENA_BALANCE_CANDIDATE_COLLECTOR_ID);
    policyHashes.add(createDeterministicDataHash(balance.policy, 'Balance exploration policy'));
    seedSetHashes.add(createDeterministicDataHash(
      bundle.definition.seedSet,
      'Balance exploration seed set',
    ));
    workloadHashes.add(createDeterministicDataHash(
      bundle.definition.workload,
      'Balance exploration workload',
    ));
    collectorHashes.add(createDeterministicDataHash(
      bundle.definition.collectors,
      'Balance exploration collectors',
    ));
    const { livesPerParticipant: ignoredLives, ...comparableConfig } =
      bundle.definition.candidate.matchConfig;
    comparableConfigHashes.add(createDeterministicDataHash(
      comparableConfig,
      'Balance exploration comparable config',
    ));
    authorityContentHashes.add(createDeterministicDataHash({
      matchSchemaVersion: bundle.definition.candidate.authority.matchSchemaVersion,
      physicsBackendVersion: bundle.definition.candidate.authority.physicsBackendVersion,
      ruleContentHash: bundle.definition.candidate.authority.ruleContentHash,
    }, 'Balance exploration authority content'));
  }
  if (policyHashes.size !== 1) {
    throw new Error('Balance exploration 候选必须使用同一 Policy。');
  }
  for (const [values, name] of [
    [seedSetHashes, 'seed set'],
    [workloadHashes, 'workload'],
    [collectorHashes, 'collector 参数'],
    [comparableConfigHashes, '除 lives 外的 Match config'],
    [authorityContentHashes, 'Authority 内容'],
  ]) {
    if (values.size !== 1) throw new Error(`Balance exploration 候选 ${name} 必须完全相同。`);
  }
  const rankings = bundles.map(createRanking).sort(compareRankings);
  const selected = rankings.find(({ eligible }) => eligible) ?? null;
  return cloneFrozenData({
    schemaVersion: ARENA_BALANCE_EXPLORATION_SELECTION_SCHEMA_VERSION,
    policy: ARENA_BALANCE_EXPLORATION_SELECTION_POLICY,
    sourceCommit,
    policyHash: [...policyHashes][0],
    selectedCandidateId: selected?.candidateId ?? null,
    rankings,
  }, 'ArenaBalanceExplorationSelection');
}
