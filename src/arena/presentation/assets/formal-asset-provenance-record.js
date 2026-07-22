import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceBoundedString,
  assertEvidenceRelativePath,
  assertEvidenceSha256,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
import { createFormalAssetIntakePolicy } from './formal-asset-intake-policy.js';
import { assertPresentationAssetRegistry } from '@number-strategy-jump/arena-presentation-contracts';

export const FORMAL_ASSET_PROVENANCE_RECORD_SCHEMA_VERSION = 1;

const RECORD_KEYS = new Set([
  'schemaVersion',
  'recordId',
  'assetId',
  'assetDefinitionHash',
  'sourceKind',
  'sourceLocator',
  'sourceRevision',
  'contentArtifact',
  'dependencyArtifacts',
  'license',
  'proofArtifact',
  'acquiredAt',
  'approvedAt',
  'approvedBy',
]);
const ARTIFACT_KEYS = new Set(['path', 'sha256', 'byteLength']);
const MAXIMUM_DEPENDENCY_ARTIFACTS = 64;
const LICENSE_KEYS = new Set([
  'id',
  'name',
  'rightsHolder',
  'textArtifact',
  'commercialUseAllowed',
  'modificationAllowed',
  'redistributionInBuildAllowed',
  'attributionRequired',
  'attributionText',
]);
function boundedString(value, maximumLength, name) {
  return assertEvidenceBoundedString(value, maximumLength, name, {
    rejectControlCharacters: true,
  });
}

function cloneArtifact(value, name) {
  assertKnownKeys(value, ARTIFACT_KEYS, name);
  return Object.freeze({
    path: assertEvidenceRelativePath(value.path, `${name}.path`),
    sha256: assertEvidenceSha256(value.sha256, `${name}.sha256`),
    byteLength: assertIntegerAtLeast(value.byteLength, 1, `${name}.byteLength`),
  });
}

function boolean(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function cloneDependencyArtifacts(values, contentArtifact) {
  const name = 'FormalAssetProvenanceRecord.dependencyArtifacts';
  if (values === undefined) return Object.freeze([]);
  if (!Array.isArray(values)) throw new TypeError(`${name} 必须是数组。`);
  if (values.length > MAXIMUM_DEPENDENCY_ARTIFACTS) {
    throw new RangeError(`${name} 不能超过 ${MAXIMUM_DEPENDENCY_ARTIFACTS} 项。`);
  }
  const paths = new Set([contentArtifact.path]);
  return Object.freeze(values.map((value, index) => {
    const artifact = cloneArtifact(value, `${name}[${index}]`);
    if (paths.has(artifact.path)) throw new RangeError(`${name} 包含重复路径 ${artifact.path}。`);
    paths.add(artifact.path);
    return artifact;
  }).sort((left, right) => (
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  )));
}

function cloneLicense(value, policy) {
  const name = 'FormalAssetProvenanceRecord.license';
  assertKnownKeys(value, LICENSE_KEYS, name);
  const result = {
    id: boundedString(value.id, 128, `${name}.id`),
    name: boundedString(value.name, 256, `${name}.name`),
    rightsHolder: boundedString(value.rightsHolder, 256, `${name}.rightsHolder`),
    textArtifact: cloneArtifact(value.textArtifact, `${name}.textArtifact`),
    commercialUseAllowed: boolean(value.commercialUseAllowed, `${name}.commercialUseAllowed`),
    modificationAllowed: boolean(value.modificationAllowed, `${name}.modificationAllowed`),
    redistributionInBuildAllowed: boolean(
      value.redistributionInBuildAllowed,
      `${name}.redistributionInBuildAllowed`,
    ),
    attributionRequired: boolean(value.attributionRequired, `${name}.attributionRequired`),
    attributionText: value.attributionText === null
      ? null
      : boundedString(value.attributionText, 2_000, `${name}.attributionText`),
  };
  if (result.attributionRequired && result.attributionText === null) {
    throw new RangeError(`${name}.attributionText 在需要署名时不能为空。`);
  }
  if (!result.attributionRequired && result.attributionText !== null) {
    throw new RangeError(`${name}.attributionText 在无需署名时必须为 null。`);
  }
  for (const [policyKey, licenseKey] of [
    ['commercialUse', 'commercialUseAllowed'],
    ['modification', 'modificationAllowed'],
    ['redistributionInBuild', 'redistributionInBuildAllowed'],
  ]) {
    if (policy.requiredRights[policyKey] && !result[licenseKey]) {
      throw new RangeError(`${name}.${licenseKey} 不满足 Policy。`);
    }
  }
  return Object.freeze(result);
}

export function createFormalAssetProvenanceRecord({
  assetRegistry: assetRegistryValue,
  policy: policyValue,
}, value) {
  const assetRegistry = assertPresentationAssetRegistry(assetRegistryValue);
  const policy = createFormalAssetIntakePolicy(policyValue);
  const source = cloneFrozenData(value, 'FormalAssetProvenanceRecord');
  assertKnownKeys(source, RECORD_KEYS, 'FormalAssetProvenanceRecord');
  if (source.schemaVersion !== FORMAL_ASSET_PROVENANCE_RECORD_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 FormalAssetProvenanceRecord schema ${String(source.schemaVersion)}。`,
    );
  }
  const assetId = boundedString(source.assetId, 256, 'FormalAssetProvenanceRecord.assetId');
  const asset = assetRegistry.require(assetId);
  if (source.assetDefinitionHash !== asset.getContentHash()) {
    throw new RangeError('FormalAssetProvenanceRecord.assetDefinitionHash 与资产定义不一致。');
  }
  const sourceKind = boundedString(
    source.sourceKind,
    64,
    'FormalAssetProvenanceRecord.sourceKind',
  );
  if (!policy.allowedSourceKinds.includes(sourceKind)) {
    throw new RangeError(`FormalAssetProvenanceRecord.sourceKind 不受 Policy 允许：${sourceKind}。`);
  }
  const acquiredAt = assertEvidenceUtcInstant(
    source.acquiredAt,
    'FormalAssetProvenanceRecord.acquiredAt',
  );
  const approvedAt = assertEvidenceUtcInstant(
    source.approvedAt,
    'FormalAssetProvenanceRecord.approvedAt',
  );
  if (approvedAt < acquiredAt) {
    throw new RangeError('FormalAssetProvenanceRecord.approvedAt 不能早于 acquiredAt。');
  }
  const contentArtifact = cloneArtifact(
    source.contentArtifact,
    'FormalAssetProvenanceRecord.contentArtifact',
  );
  return Object.freeze({
    schemaVersion: FORMAL_ASSET_PROVENANCE_RECORD_SCHEMA_VERSION,
    recordId: boundedString(source.recordId, 128, 'FormalAssetProvenanceRecord.recordId'),
    assetId,
    assetDefinitionHash: asset.getContentHash(),
    sourceKind,
    sourceLocator: boundedString(
      source.sourceLocator,
      1_024,
      'FormalAssetProvenanceRecord.sourceLocator',
    ),
    sourceRevision: boundedString(
      source.sourceRevision,
      256,
      'FormalAssetProvenanceRecord.sourceRevision',
    ),
    contentArtifact,
    dependencyArtifacts: cloneDependencyArtifacts(source.dependencyArtifacts, contentArtifact),
    license: cloneLicense(source.license, policy),
    proofArtifact: cloneArtifact(
      source.proofArtifact,
      'FormalAssetProvenanceRecord.proofArtifact',
    ),
    acquiredAt,
    approvedAt,
    approvedBy: boundedString(source.approvedBy, 128, 'FormalAssetProvenanceRecord.approvedBy'),
  });
}
