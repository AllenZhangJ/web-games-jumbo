import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  HUMAN_MATCH_STUDY_REPORT_STATUS,
  createArenaStage9HumanFairnessV1Definition,
  createHumanMatchStudyBundle,
  createHumanMatchStudyReport,
  type HumanMatchStudyReportStatus,
} from '@number-strategy-jump/arena-human-match-study';
import { ARENA_RELEASE_EVIDENCE_STATUS } from '@number-strategy-jump/arena-release-contracts';

const OPTION_KEYS = new Set(['bundle']);

function releaseStatus(status: HumanMatchStudyReportStatus) {
  if (status === HUMAN_MATCH_STUDY_REPORT_STATUS.READY) {
    return ARENA_RELEASE_EVIDENCE_STATUS.READY;
  }
  if (status === HUMAN_MATCH_STUDY_REPORT_STATUS.FAILED) {
    return ARENA_RELEASE_EVIDENCE_STATUS.FAILED;
  }
  return ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE;
}

export function createArenaHumanFairnessReleaseResult(optionsValue: unknown) {
  assertKnownKeys(optionsValue, OPTION_KEYS, 'Human fairness release options');
  const producerId = 'arena:human-fairness:evidence';
  const definition = createArenaStage9HumanFairnessV1Definition();
  const bundle = createHumanMatchStudyBundle(definition, optionsValue.bundle);
  const report = createHumanMatchStudyReport(definition, bundle.records);
  const summary = cloneFrozenData({
    producerId,
    commit: bundle.commit,
    buildId: bundle.buildId,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    recordCount: bundle.records.length,
    sourceDataHash: report.sourceDataHash,
    reportResultHash: report.resultHash,
    reportStatus: report.status,
    incompleteGateIds: report.incompleteGateIds,
    failedGateIds: report.failedGateIds,
  }, `Release producer ${producerId} summary`);
  return cloneFrozenData({
    commit: bundle.commit,
    buildId: bundle.buildId,
    status: releaseStatus(report.status),
    resultHash: createDeterministicDataHash(summary, `Release producer ${producerId}`),
  }, `Release producer ${producerId} result`);
}
