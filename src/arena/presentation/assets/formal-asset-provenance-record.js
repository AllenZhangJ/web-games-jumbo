import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import { createFormalAssetIntakePolicy } from './formal-asset-intake-policy.js';
import { assertPresentationAssetRegistry } from './presentation-asset-registry.js';

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
  'license',
  'proofArtifact',
  'acquiredAt',
  'approvedAt',
  'approvedBy',
]);
const ARTIFACT_KEYS = new Set(['path', 'sha256', 'byteLength']);
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
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function boundedString(value, maximumLength, name) {
  const text = assertNonEmptyString(value, name);
  if (text.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 个字符。`);
  }
  if (CONTROL_CHARACTER_PATTERN.test(text)) {
    throw new RangeError(`${name} 不能包含控制字符。`);
  }
  return text;
}

function isoInstant(value, name) {
  if (typeof value !== 'string' || !ISO_INSTANT_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是带毫秒的 UTC ISO-8601 时间。`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    throw new RangeError(`${name} 不是有效 UTC 时间。`);
  }
  return value;
}

function relativeArtifactPath(value, name) {
  const artifactPath = boundedString(value, 512, name);
  if (
    artifactPath.includes('\\')
    || artifactPath.startsWith('/')
    || artifactPath.includes('://')
    || /^[A-Za-z]:/.test(artifactPath)
  ) throw new RangeError(`${name} 必须是使用 / 的相对路径。`);
  const segments = artifactPath.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new RangeError(`${name} 不能包含空段、. 或 ..。`);
  }
  return artifactPath;
}

function cloneArtifact(value, name) {
  assertKnownKeys(value, ARTIFACT_KEYS, name);
  if (typeof value.sha256 !== 'string' || !SHA256_PATTERN.test(value.sha256)) {
    throw new TypeError(`${name}.sha256 必须是 64 位小写十六进制 SHA-256。`);
  }
  return Object.freeze({
    path: relativeArtifactPath(value.path, `${name}.path`),
    sha256: value.sha256,
    byteLength: assertIntegerAtLeast(value.byteLength, 1, `${name}.byteLength`),
  });
}

function boolean(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
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
  const acquiredAt = isoInstant(source.acquiredAt, 'FormalAssetProvenanceRecord.acquiredAt');
  const approvedAt = isoInstant(source.approvedAt, 'FormalAssetProvenanceRecord.approvedAt');
  if (approvedAt < acquiredAt) {
    throw new RangeError('FormalAssetProvenanceRecord.approvedAt 不能早于 acquiredAt。');
  }
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
    contentArtifact: cloneArtifact(
      source.contentArtifact,
      'FormalAssetProvenanceRecord.contentArtifact',
    ),
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
