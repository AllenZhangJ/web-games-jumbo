import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { assertEvidenceGitCommit } from '@number-strategy-jump/arena-evidence-contracts';
import {
  readArenaRegressionEvidenceReport,
} from '../arena/regression/arena-regression-evidence.js';
import { ARENA_RELEASE_EVIDENCE_STATUS } from '@number-strategy-jump/arena-release-contracts';

export function createArenaRegressionReleaseResult({ commit, report: reportValue }) {
  assertEvidenceGitCommit(commit, 'Regression release result.commit');
  const report = readArenaRegressionEvidenceReport(reportValue);
  if (report.sourceCommit !== commit || report.sourceDirty) {
    throw new Error('Regression release evidence 与 clean candidate commit 不一致。');
  }
  const summary = cloneFrozenData({
    producerId: 'arena:regression:evidence',
    commit,
    definitionId: report.definitionId,
    definitionHash: report.definitionHash,
    componentIds: report.components.map(({ id }) => id),
    reportResultHash: report.resultHash,
    reportStatus: report.status,
  }, 'Regression release summary');
  return cloneFrozenData({
    commit,
    buildId: null,
    status: ARENA_RELEASE_EVIDENCE_STATUS.READY,
    resultHash: createDeterministicDataHash(
      summary,
      'Release producer arena:regression:evidence',
    ),
  }, 'Regression release result');
}
