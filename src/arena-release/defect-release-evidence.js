import { createDeterministicDataHash } from '../shared/deterministic-data-hash.js';
import { cloneFrozenData } from '../arena/rules/definition-utils.js';
import {
  ARENA_DEFECT_REPORT_STATUS,
  createArenaDefectLedger,
  createArenaDefectReport,
} from './defect-ledger.js';
import { ARENA_RELEASE_EVIDENCE_STATUS } from './release-evidence-statement.js';

const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/;

function releaseStatus(status) {
  if (status === ARENA_DEFECT_REPORT_STATUS.READY) return ARENA_RELEASE_EVIDENCE_STATUS.READY;
  if (status === ARENA_DEFECT_REPORT_STATUS.FAILED) return ARENA_RELEASE_EVIDENCE_STATUS.FAILED;
  if (status === ARENA_DEFECT_REPORT_STATUS.INCOMPLETE) {
    return ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE;
  }
  throw new RangeError(`不支持的 Defect report status ${String(status)}。`);
}

export function createArenaDefectReleaseResult({ commit, sourceDirty, ledger: ledgerValue }) {
  if (typeof commit !== 'string' || !GIT_COMMIT_PATTERN.test(commit)) {
    throw new TypeError('Defect release result.commit 必须是 40 位小写 Git commit。');
  }
  if (typeof sourceDirty !== 'boolean') {
    throw new TypeError('Defect release result.sourceDirty 必须是布尔值。');
  }
  const ledger = createArenaDefectLedger(ledgerValue);
  if (ledger.commit !== commit) throw new Error('Defect ledger 与 candidate commit 不一致。');
  const report = createArenaDefectReport(ledger);
  const summary = cloneFrozenData({
    producerId: 'arena:defects:verify',
    commit,
    sourceDirty,
    ledgerHash: report.sourceDataHash,
    reportResultHash: report.resultHash,
    reportStatus: report.status,
    knownIssuesComplete: report.knownIssuesComplete,
    defectCount: report.defectCount,
    residualRiskCount: report.residualRiskCount,
    counts: report.counts,
  }, 'Defect release summary');
  return cloneFrozenData({
    commit,
    buildId: null,
    status: sourceDirty
      ? ARENA_RELEASE_EVIDENCE_STATUS.FAILED
      : releaseStatus(report.status),
    resultHash: createDeterministicDataHash(summary, 'Release producer arena:defects:verify'),
  }, 'Defect release result');
}
