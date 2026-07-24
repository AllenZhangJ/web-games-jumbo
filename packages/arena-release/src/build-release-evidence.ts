import {
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_BUILD_DEFAULT_ENTRY,
  createArenaBuildManifest,
  type ArenaBuildManifest,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaBuildBudgetReport,
  createArenaStage9BuildBudgetV1Policy,
} from '@number-strategy-jump/arena-performance-evidence';
import { ARENA_RELEASE_EVIDENCE_STATUS } from '@number-strategy-jump/arena-release-contracts';

const REQUIRED_PLATFORMS = Object.freeze(['douyin', 'web', 'wechat'] as const);

function manifestSources(values: unknown[]): readonly unknown[] {
  const expectedKeys = new Set(['length']);
  for (let index = 0; index < values.length; index += 1) expectedKeys.add(String(index));
  const keys = Reflect.ownKeys(values);
  if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError('Release build evidence manifests 数组不能包含额外字段。');
  }
  return Object.freeze(Array.from({ length: values.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Release build evidence manifests[${index}] 必须是数据字段。`);
    }
    return descriptor.value;
  }));
}

function normalizeManifests(values: unknown): readonly ArenaBuildManifest[] {
  if (!Array.isArray(values) || values.length !== REQUIRED_PLATFORMS.length) {
    throw new RangeError('Release build evidence 必须包含 Web、微信、抖音三个 Manifest。');
  }
  const sources = manifestSources(values);
  const manifests = sources.map((value) => createArenaBuildManifest(value)).sort((left, right) => (
    left.target < right.target ? -1 : left.target > right.target ? 1 : 0
  ));
  if (new Set(manifests.map(({ target }) => target)).size !== manifests.length) {
    throw new RangeError('Release build evidence 不能包含重复平台 Manifest。');
  }
  if (manifests.some((manifest, index) => manifest.target !== REQUIRED_PLATFORMS[index])) {
    throw new RangeError('Release build evidence 必须覆盖 Web、微信和抖音。');
  }
  const first = manifests[0];
  if (!first) throw new Error('Release build evidence 缺少首个 Manifest。');
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

function producerResult(
  summary: { readonly producerId: string; readonly commit: string; readonly buildId: string },
  sourceDirty: boolean,
) {
  return cloneFrozenData({
    commit: summary.commit,
    buildId: summary.buildId,
    status: sourceDirty
      ? ARENA_RELEASE_EVIDENCE_STATUS.FAILED
      : ARENA_RELEASE_EVIDENCE_STATUS.READY,
    resultHash: createDeterministicDataHash(summary, `Release producer ${summary.producerId}`),
  }, `Release producer result ${summary.producerId}`);
}

export function createArenaBuildIntegrityReleaseResult(manifestValues: unknown) {
  const manifests = normalizeManifests(manifestValues);
  const first = manifests[0];
  if (!first) throw new Error('Release build evidence 缺少首个 Manifest。');
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

export function createArenaBuildBudgetReleaseResult(manifestValues: unknown) {
  const manifests = normalizeManifests(manifestValues);
  const first = manifests[0];
  if (!first) throw new Error('Release build evidence 缺少首个 Manifest。');
  const policy = createArenaStage9BuildBudgetV1Policy();
  const reports = manifests.map((manifest) => createArenaBuildBudgetReport(policy, manifest));
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
  return cloneFrozenData({
    commit: first.commit,
    buildId: first.buildId,
    status: allPassed && allFreezeEligible
      ? ARENA_RELEASE_EVIDENCE_STATUS.READY
      : ARENA_RELEASE_EVIDENCE_STATUS.FAILED,
    resultHash: createDeterministicDataHash(summary, 'Release producer arena:build:budget'),
  }, 'Release producer result arena:build:budget');
}
