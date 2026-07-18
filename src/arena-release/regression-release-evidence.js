import { createDeterministicDataHash } from '../shared/deterministic-data-hash.js';
import { cloneFrozenData } from '../arena/rules/definition-utils.js';
import { assertEvidenceGitCommit } from '../arena/evidence/evidence-value-contract.js';
import {
  readArenaRegressionEvidenceReport,
} from '../arena/regression/arena-regression-evidence.js';
import { ARENA_RELEASE_EVIDENCE_STATUS } from './release-evidence-statement.js';

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
