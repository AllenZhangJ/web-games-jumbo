import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import { assertEvidenceGitCommit } from '@number-strategy-jump/arena-evidence-contracts';
import { readArenaRegressionEvidenceReport } from '@number-strategy-jump/arena-regression';
import { ARENA_RELEASE_EVIDENCE_STATUS } from '@number-strategy-jump/arena-release-contracts';

export function createArenaRegressionReleaseResult(options: unknown) {
  assertKnownKeys(options, new Set(['commit', 'report']), 'Regression release result options');
  const commit = assertEvidenceGitCommit(options.commit, 'Regression release result.commit');
  const report = readArenaRegressionEvidenceReport(options.report);
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
    resultHash: createDeterministicDataHash(summary, 'Release producer arena:regression:evidence'),
  }, 'Regression release result');
}
