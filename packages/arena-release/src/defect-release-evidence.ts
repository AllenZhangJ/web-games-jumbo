import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import { assertEvidenceGitCommit } from '@number-strategy-jump/arena-evidence-contracts';
import { ARENA_RELEASE_EVIDENCE_STATUS } from '@number-strategy-jump/arena-release-contracts';
import {
  ARENA_DEFECT_REPORT_STATUS,
  createArenaDefectLedger,
  createArenaDefectReport,
  type ArenaDefectReportStatus,
} from './defect-ledger.js';

const OPTION_KEYS = new Set(['commit', 'sourceDirty', 'ledger']);

function releaseStatus(status: ArenaDefectReportStatus) {
  if (status === ARENA_DEFECT_REPORT_STATUS.READY) return ARENA_RELEASE_EVIDENCE_STATUS.READY;
  if (status === ARENA_DEFECT_REPORT_STATUS.FAILED) return ARENA_RELEASE_EVIDENCE_STATUS.FAILED;
  return ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE;
}

export function createArenaDefectReleaseResult(optionsValue: unknown) {
  assertKnownKeys(optionsValue, OPTION_KEYS, 'Defect release result options');
  const commit = assertEvidenceGitCommit(optionsValue.commit, 'Defect release result.commit');
  if (typeof optionsValue.sourceDirty !== 'boolean') {
    throw new TypeError('Defect release result.sourceDirty 必须是布尔值。');
  }
  const ledger = createArenaDefectLedger(optionsValue.ledger);
  if (ledger.commit !== commit) throw new Error('Defect ledger 与 candidate commit 不一致。');
  const report = createArenaDefectReport(ledger);
  const summary = cloneFrozenData({
    producerId: 'arena:defects:verify',
    commit,
    sourceDirty: optionsValue.sourceDirty,
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
    status: optionsValue.sourceDirty
      ? ARENA_RELEASE_EVIDENCE_STATUS.FAILED
      : releaseStatus(report.status),
    resultHash: createDeterministicDataHash(summary, 'Release producer arena:defects:verify'),
  }, 'Defect release result');
}
