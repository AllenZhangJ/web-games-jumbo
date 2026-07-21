import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { assertEvidenceGitCommit } from '../arena/evidence/evidence-value-contract.js';
import {
  ARENA_DEFECT_REPORT_STATUS,
  createArenaDefectLedger,
  createArenaDefectReport,
} from './defect-ledger.js';
import { ARENA_RELEASE_EVIDENCE_STATUS } from './release-evidence-statement.js';

function releaseStatus(status) {
  if (status === ARENA_DEFECT_REPORT_STATUS.READY) return ARENA_RELEASE_EVIDENCE_STATUS.READY;
  if (status === ARENA_DEFECT_REPORT_STATUS.FAILED) return ARENA_RELEASE_EVIDENCE_STATUS.FAILED;
  if (status === ARENA_DEFECT_REPORT_STATUS.INCOMPLETE) {
    return ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE;
  }
  throw new RangeError(`不支持的 Defect report status ${String(status)}。`);
}

export function createArenaDefectReleaseResult({ commit, sourceDirty, ledger: ledgerValue }) {
  assertEvidenceGitCommit(commit, 'Defect release result.commit');
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
