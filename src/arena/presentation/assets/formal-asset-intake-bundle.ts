import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  createFormalAssetIntakePolicy,
  type FormalAssetIntakePolicy,
} from './formal-asset-intake-policy.js';
import {
  createFormalAssetProvenanceRecord,
  type FormalAssetArtifactEvidence,
  type FormalAssetProvenanceRecord,
} from './formal-asset-provenance-record.js';
import {
  PresentationAssetRegistry,
  type PresentationAssetDefinition,
  type PresentationAssetDefinitionJson,
} from '@number-strategy-jump/arena-presentation-contracts';

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

export interface FormalAssetIntakeBundleJson {
  readonly schemaVersion: typeof FORMAL_ASSET_INTAKE_BUNDLE_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly policyId: string;
  readonly policyHash: string;
  readonly createdAt: string;
  readonly assets: readonly PresentationAssetDefinitionJson[];
  readonly records: readonly FormalAssetProvenanceRecord[];
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function validateAssetPolicy(
  asset: PresentationAssetDefinition,
  policy: FormalAssetIntakePolicy,
): void {
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

function assertSharedArtifactStable(records: readonly FormalAssetProvenanceRecord[]): void {
  const paths = new Map<string, Readonly<{
    category: 'content' | 'rights-material';
    artifact: FormalAssetArtifactEvidence;
  }>>();
  const contentPaths = new Set<string>();
  for (const record of records) {
    const contentArtifacts = [record.contentArtifact, ...record.dependencyArtifacts];
    for (const artifact of contentArtifacts) {
      if (contentPaths.has(artifact.path)) {
        throw new RangeError(`多个正式资产不能共享内容路径 ${artifact.path}。`);
      }
      contentPaths.add(artifact.path);
    }
    const categorizedArtifacts: readonly Readonly<{
      category: 'content' | 'rights-material';
      artifact: FormalAssetArtifactEvidence;
    }>[] = [
      ...contentArtifacts.map((artifact) => ({ category: 'content' as const, artifact })),
      { category: 'rights-material', artifact: record.license.textArtifact },
      { category: 'rights-material', artifact: record.proofArtifact },
    ];
    for (const { category, artifact } of categorizedArtifacts) {
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
  readonly schemaVersion = FORMAL_ASSET_INTAKE_BUNDLE_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly policyId: string;
  readonly policyHash: string;
  readonly createdAt: string;
  readonly assets: readonly PresentationAssetDefinition[];
  readonly records: readonly FormalAssetProvenanceRecord[];
  readonly #assetRegistry: PresentationAssetRegistry;

  constructor(policyValue: unknown, value: unknown) {
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
    const recordIds = new Set<string>();
    const assetIds = new Set<string>();
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
    this.id = assertNonEmptyString(source.id, 'FormalAssetIntakeBundle.id');
    this.contentVersion = assertIntegerAtLeast(
      source.contentVersion,
      1,
      'FormalAssetIntakeBundle.contentVersion',
    );
    this.policyId = policy.id;
    this.policyHash = policy.getContentHash();
    this.createdAt = createdAt;
    this.assets = assetRegistry.list();
    this.records = Object.freeze(records);
    this.#assetRegistry = assetRegistry;
    Object.freeze(this);
  }

  getAssetRegistry(): PresentationAssetRegistry {
    return this.#assetRegistry;
  }

  toJSON(): FormalAssetIntakeBundleJson {
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

  getContentHash(): string {
    return createDeterministicDataHash(this.toJSON(), `FormalAssetIntakeBundle ${this.id}`);
  }
}

export function createFormalAssetIntakeBundle(
  policyValue: unknown,
  value: unknown,
): FormalAssetIntakeBundle {
  if (!(value instanceof FormalAssetIntakeBundle)) {
    return new FormalAssetIntakeBundle(policyValue, value);
  }
  const policy = createFormalAssetIntakePolicy(policyValue);
  if (value.policyId !== policy.id || value.policyHash !== policy.getContentHash()) {
    throw new RangeError('FormalAssetIntakeBundle 与请求的 Policy 身份不一致。');
  }
  return value;
}
