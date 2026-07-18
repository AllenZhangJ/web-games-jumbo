import { createDeterministicDataHash } from '../shared/deterministic-data-hash.js';
import { cloneFrozenData } from '../arena/rules/definition-utils.js';
import { assertEvidenceGitCommit } from '../arena/evidence/evidence-value-contract.js';
import {
  createArenaStage9BalanceValidationExperimentDefinition,
} from '../arena/experiment/arena-balance-validation-composition.js';
import {
  ARENA_EXPERIMENT_OUTCOME,
} from '../arena/experiment/experiment-report.js';
import {
  readArenaExperimentReportBundle,
} from '../arena/experiment/experiment-report-bundle.js';
import { ARENA_RELEASE_EVIDENCE_STATUS } from './release-evidence-statement.js';

const BALANCE_VALIDATION_SUITE = 'balance-validation';

export function createArenaBalanceValidationReleaseResult({
  commit,
  sourceDirty,
  reportBundle: bundleValue,
}) {
  assertEvidenceGitCommit(commit, 'Balance validation release result.commit');
  if (typeof sourceDirty !== 'boolean') {
    throw new TypeError('Balance validation release result.sourceDirty 必须是布尔值。');
  }
  const bundle = readArenaExperimentReportBundle(bundleValue);
  if (bundle.suite !== BALANCE_VALIDATION_SUITE) {
    throw new RangeError('Balance validation release evidence 必须使用 balance-validation suite。');
  }
  const expected = createArenaStage9BalanceValidationExperimentDefinition({
    sourceCommit: commit,
    sourceDirty,
  });
  if (
    bundle.report.definitionId !== expected.id
    || bundle.report.definitionHash !== expected.getContentHash()
  ) throw new Error('Balance validation release evidence 与当前冻结 Definition/commit 不一致。');
  const summary = cloneFrozenData({
    producerId: 'arena:experiment:report:verify',
    commit,
    sourceDirty,
    suite: bundle.suite,
    bundleHash: bundle.bundleHash,
    definitionId: bundle.report.definitionId,
    definitionHash: bundle.report.definitionHash,
    outcome: bundle.report.outcome,
    freezeEligible: bundle.report.freezeEligible,
    resultHash: bundle.report.resultHash,
  }, 'Balance validation release summary');
  return cloneFrozenData({
    commit,
    buildId: null,
    status: bundle.report.outcome === ARENA_EXPERIMENT_OUTCOME.PASSED
      && bundle.report.freezeEligible
      ? ARENA_RELEASE_EVIDENCE_STATUS.READY
      : ARENA_RELEASE_EVIDENCE_STATUS.FAILED,
    resultHash: createDeterministicDataHash(
      summary,
      'Release producer arena:experiment:report:verify',
    ),
  }, 'Balance validation release result');
}
