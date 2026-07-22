import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  createArenaStage9HumanFairnessV1Definition,
} from '@number-strategy-jump/arena-human-match-study';
import {
  createHumanMatchStudyBundle,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_REPORT_STATUS,
  createHumanMatchStudyReport,
} from '@number-strategy-jump/arena-human-match-study';
import { ARENA_RELEASE_EVIDENCE_STATUS } from './release-evidence-statement.js';

function releaseStatus(status) {
  if (status === HUMAN_MATCH_STUDY_REPORT_STATUS.READY) {
    return ARENA_RELEASE_EVIDENCE_STATUS.READY;
  }
  if (status === HUMAN_MATCH_STUDY_REPORT_STATUS.FAILED) {
    return ARENA_RELEASE_EVIDENCE_STATUS.FAILED;
  }
  if (status === HUMAN_MATCH_STUDY_REPORT_STATUS.INCOMPLETE) {
    return ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE;
  }
  throw new RangeError(`不支持的 Human fairness status ${String(status)}。`);
}

export function createArenaHumanFairnessReleaseResult({ bundle: bundleValue }) {
  const producerId = 'arena:human-fairness:evidence';
  const definition = createArenaStage9HumanFairnessV1Definition();
  const bundle = createHumanMatchStudyBundle(definition, bundleValue);
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
