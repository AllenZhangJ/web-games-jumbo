import { createDeterministicDataHash } from '../shared/deterministic-data-hash.js';
import { cloneFrozenData } from '../arena/rules/definition-utils.js';
import {
  readArenaRegressionEvidenceReport,
} from '../arena/regression/arena-regression-evidence.js';
import { ARENA_RELEASE_EVIDENCE_STATUS } from './release-evidence-statement.js';

const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/;

export function createArenaRegressionReleaseResult({ commit, report: reportValue }) {
  if (typeof commit !== 'string' || !GIT_COMMIT_PATTERN.test(commit)) {
    throw new TypeError('Regression release result.commit 必须是 40 位小写 Git commit。');
  }
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
