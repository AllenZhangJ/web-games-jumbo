import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_BUILD_DEFAULT_ENTRY,
  createArenaBuildManifest,
} from '../arena/presentation/acceptance/arena-build-manifest.js';
import {
  createArenaStage9BuildBudgetV1Policy,
} from '../arena/presentation/performance/arena-build-budget-policy.js';
import {
  createArenaBuildBudgetReport,
} from '../arena/presentation/performance/arena-build-budget-report.js';
import { ARENA_RELEASE_EVIDENCE_STATUS } from './release-evidence-statement.js';

const REQUIRED_PLATFORMS = Object.freeze(['douyin', 'web', 'wechat']);

function normalizeManifests(values) {
  if (!Array.isArray(values) || values.length !== REQUIRED_PLATFORMS.length) {
    throw new RangeError('Release build evidence 必须包含 Web、微信、抖音三个 Manifest。');
  }
  const manifests = values.map((value) => createArenaBuildManifest(value)).sort((left, right) => (
    left.target < right.target ? -1 : left.target > right.target ? 1 : 0
  ));
  if (new Set(manifests.map(({ target }) => target)).size !== manifests.length) {
    throw new RangeError('Release build evidence 不能包含重复平台 Manifest。');
  }
  if (manifests.some((manifest, index) => manifest.target !== REQUIRED_PLATFORMS[index])) {
    throw new RangeError('Release build evidence 必须覆盖 Web、微信和抖音。');
  }
  const [first] = manifests;
  for (const manifest of manifests) {
    if (manifest.commit !== first.commit || manifest.buildId !== first.buildId) {
      throw new RangeError('Release build Manifest 必须绑定同一 commit/build。');
    }
    if (manifest.sourceDirty !== first.sourceDirty) {
      throw new RangeError('Release build Manifest 的 sourceDirty 状态必须一致。');
    }
    if (manifest.defaultEntry !== ARENA_BUILD_DEFAULT_ENTRY.PRODUCT) {
      throw new RangeError(`Release build ${manifest.target} 默认入口必须为 product。`);
    }
  }
  return Object.freeze(manifests);
}

function producerResult(summary, sourceDirty) {
  const resultHash = createDeterministicDataHash(summary, `Release producer ${summary.producerId}`);
  return cloneFrozenData({
    commit: summary.commit,
    buildId: summary.buildId,
    status: sourceDirty
      ? ARENA_RELEASE_EVIDENCE_STATUS.FAILED
      : ARENA_RELEASE_EVIDENCE_STATUS.READY,
    resultHash,
  }, `Release producer result ${summary.producerId}`);
}

export function createArenaBuildIntegrityReleaseResult(manifestValues) {
  const manifests = normalizeManifests(manifestValues);
  const [first] = manifests;
  const summary = cloneFrozenData({
    producerId: 'arena:build:verify',
    commit: first.commit,
    buildId: first.buildId,
    sourceDirty: first.sourceDirty,
    targets: manifests.map((manifest) => ({
      target: manifest.target,
      defaultEntry: manifest.defaultEntry,
      artifactCount: manifest.artifacts.length,
      manifestHash: manifest.getContentHash(),
    })),
  }, 'Arena build integrity release summary');
  return producerResult(summary, first.sourceDirty);
}

export function createArenaBuildBudgetReleaseResult(manifestValues) {
  const manifests = normalizeManifests(manifestValues);
  const policy = createArenaStage9BuildBudgetV1Policy();
  const reports = manifests.map((manifest) => createArenaBuildBudgetReport(policy, manifest));
  const [first] = manifests;
  const allPassed = reports.every(({ status }) => status === 'passed');
  const allFreezeEligible = reports.every(({ freezeEligible }) => freezeEligible);
  const summary = cloneFrozenData({
    producerId: 'arena:build:budget',
    commit: first.commit,
    buildId: first.buildId,
    policyId: policy.id,
    policyHash: policy.getContentHash(),
    status: allPassed ? 'passed' : 'failed',
    freezeEligible: allFreezeEligible,
    reports,
  }, 'Arena build budget release summary');
  const resultHash = createDeterministicDataHash(summary, 'Release producer arena:build:budget');
  return cloneFrozenData({
    commit: first.commit,
    buildId: first.buildId,
    status: allPassed && allFreezeEligible
      ? ARENA_RELEASE_EVIDENCE_STATUS.READY
      : ARENA_RELEASE_EVIDENCE_STATUS.FAILED,
    resultHash,
  }, 'Release producer result arena:build:budget');
}
