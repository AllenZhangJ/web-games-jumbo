import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import {
  assertEvidenceUtcInstant,
} from '../../evidence/evidence-value-contract.js';
import {
  createFormalAssetIntakePolicy,
} from './formal-asset-intake-policy.js';
import {
  createFormalAssetProvenanceRecord,
} from './formal-asset-provenance-record.js';
import { PresentationAssetRegistry } from './presentation-asset-registry.js';

export const FORMAL_ASSET_INTAKE_BUNDLE_SCHEMA_VERSION = 1;

const BUNDLE_KEYS = new Set([
  'schemaVersion',
  'id',
  'contentVersion',
  'policyId',
  'policyHash',
  'createdAt',
  'assets',
  'records',
]);
const MAXIMUM_ASSETS = 1_024;

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function validateAssetPolicy(asset, policy) {
  for (const tag of policy.requiredAssetTags) {
    if (!asset.tags.includes(tag)) {
      throw new RangeError(`正式资产 ${asset.id} 缺少 Policy 要求的 tag ${tag}。`);
    }
  }
  for (const tag of policy.forbiddenAssetTags) {
    if (asset.tags.includes(tag)) {
      throw new RangeError(`正式资产 ${asset.id} 包含 Policy 禁止的 tag ${tag}。`);
    }
  }
  if (policy.forbiddenProviderIds.includes(asset.providerId)) {
    throw new RangeError(`正式资产 ${asset.id} 使用 Policy 禁止的 Provider ${asset.providerId}。`);
  }
}

function assertSharedArtifactStable(records) {
  const paths = new Map();
  const contentPaths = new Set();
  for (const record of records) {
    const contentArtifacts = [record.contentArtifact, ...record.dependencyArtifacts];
    for (const artifact of contentArtifacts) {
      if (contentPaths.has(artifact.path)) {
        throw new RangeError(`多个正式资产不能共享内容路径 ${artifact.path}。`);
      }
      contentPaths.add(artifact.path);
    }
    for (const [category, artifact] of [
      ...contentArtifacts.map((entry) => ['content', entry]),
      ['rights-material', record.license.textArtifact],
      ['rights-material', record.proofArtifact],
    ]) {
      const previous = paths.get(artifact.path);
      if (previous && previous.category !== category) {
        throw new RangeError(`artifact ${artifact.path} 不能同时作为内容和授权文档。`);
      }
      if (
        previous
        && (
          previous.artifact.sha256 !== artifact.sha256
          || previous.artifact.byteLength !== artifact.byteLength
        )
      ) throw new RangeError(`共享 artifact ${artifact.path} 的摘要或大小不一致。`);
      paths.set(artifact.path, { category, artifact });
    }
  }
}

export class FormalAssetIntakeBundle {
  #assetRegistry;

  constructor(policyValue, value) {
    const policy = createFormalAssetIntakePolicy(policyValue);
    const source = cloneFrozenData(value, 'FormalAssetIntakeBundle');
    assertKnownKeys(source, BUNDLE_KEYS, 'FormalAssetIntakeBundle');
    if (source.schemaVersion !== FORMAL_ASSET_INTAKE_BUNDLE_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 FormalAssetIntakeBundle schema ${String(source.schemaVersion)}。`,
      );
    }
    if (source.policyId !== policy.id || source.policyHash !== policy.getContentHash()) {
      throw new RangeError('FormalAssetIntakeBundle Policy 身份不一致。');
    }
    if (!Array.isArray(source.assets) || source.assets.length === 0) {
      throw new RangeError('FormalAssetIntakeBundle.assets 不能为空。');
    }
    if (source.assets.length > MAXIMUM_ASSETS) {
      throw new RangeError(`FormalAssetIntakeBundle.assets 不能超过 ${MAXIMUM_ASSETS} 项。`);
    }
    if (!Array.isArray(source.records) || source.records.length !== source.assets.length) {
      throw new RangeError('FormalAssetIntakeBundle.records 必须与 assets 一一对应。');
    }
    const assetRegistry = new PresentationAssetRegistry(source.assets);
    for (const asset of assetRegistry.list()) validateAssetPolicy(asset, policy);
    const recordIds = new Set();
    const assetIds = new Set();
    const records = source.records.map((recordValue) => {
      const record = createFormalAssetProvenanceRecord({ assetRegistry, policy }, recordValue);
      if (recordIds.has(record.recordId)) {
        throw new RangeError(`重复的 Formal Asset provenance recordId ${record.recordId}。`);
      }
      if (assetIds.has(record.assetId)) {
        throw new RangeError(`正式资产 ${record.assetId} 存在多份 provenance record。`);
      }
      recordIds.add(record.recordId);
      assetIds.add(record.assetId);
      return record;
    }).sort((left, right) => compareText(left.assetId, right.assetId));
    const missingAsset = assetRegistry.list().find((asset) => !assetIds.has(asset.id));
    if (missingAsset) {
      throw new RangeError(`正式资产 ${missingAsset.id} 缺少 provenance record。`);
    }
    assertSharedArtifactStable(records);
    const createdAt = assertEvidenceUtcInstant(
      source.createdAt,
      'FormalAssetIntakeBundle.createdAt',
    );
    if (records.some((record) => record.approvedAt > createdAt)) {
      throw new RangeError('FormalAssetIntakeBundle.createdAt 不能早于资产批准时间。');
    }
    Object.defineProperties(this, {
      schemaVersion: {
        value: FORMAL_ASSET_INTAKE_BUNDLE_SCHEMA_VERSION,
        enumerable: true,
      },
      id: {
        value: assertNonEmptyString(source.id, 'FormalAssetIntakeBundle.id'),
        enumerable: true,
      },
      contentVersion: {
        value: assertIntegerAtLeast(
          source.contentVersion,
          1,
          'FormalAssetIntakeBundle.contentVersion',
        ),
        enumerable: true,
      },
      policyId: { value: policy.id, enumerable: true },
      policyHash: { value: policy.getContentHash(), enumerable: true },
      createdAt: { value: createdAt, enumerable: true },
      assets: { value: assetRegistry.list(), enumerable: true },
      records: { value: Object.freeze(records), enumerable: true },
    });
    this.#assetRegistry = assetRegistry;
    Object.freeze(this);
  }

  getAssetRegistry() {
    return this.#assetRegistry;
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      contentVersion: this.contentVersion,
      policyId: this.policyId,
      policyHash: this.policyHash,
      createdAt: this.createdAt,
      assets: this.assets.map((asset) => asset.toJSON()),
      records: this.records,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(this.toJSON(), `FormalAssetIntakeBundle ${this.id}`);
  }
}

export function createFormalAssetIntakeBundle(policyValue, value) {
  if (!(value instanceof FormalAssetIntakeBundle)) {
    return new FormalAssetIntakeBundle(policyValue, value);
  }
  const policy = createFormalAssetIntakePolicy(policyValue);
  if (value.policyId !== policy.id || value.policyHash !== policy.getContentHash()) {
    throw new RangeError('FormalAssetIntakeBundle 与请求的 Policy 身份不一致。');
  }
  return value;
}
