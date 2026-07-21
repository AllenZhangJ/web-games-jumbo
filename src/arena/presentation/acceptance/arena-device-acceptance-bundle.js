import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceBoundedString,
  assertEvidenceGitCommit,
  assertEvidenceUtcInstant,
} from '../../evidence/evidence-value-contract.js';
import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
  createArenaDeviceAcceptanceDefinition,
} from './arena-device-acceptance-definition.js';
import {
  createArenaDeviceAcceptanceRecord,
  isArenaDeviceAcceptanceRecordPassing,
} from './arena-device-acceptance-record.js';

export const ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION = 1;
export const ARENA_DEVICE_ACCEPTANCE_REPORT_SCHEMA_VERSION = 1;

export const ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS = Object.freeze({
  READY: 'ready',
  FAILED: 'failed',
  INCOMPLETE: 'incomplete',
});

const BUNDLE_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'commit',
  'buildId',
  'createdAt',
  'records',
]);
const MAXIMUM_RECORDS = 100;

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function boundedString(value, maximumLength, name) {
  return assertEvidenceBoundedString(value, maximumLength, name);
}

export function createArenaDeviceAcceptanceBundle(definitionValue, value) {
  const definition = createArenaDeviceAcceptanceDefinition(definitionValue);
  const source = cloneFrozenData(value, 'ArenaDeviceAcceptanceBundle');
  assertKnownKeys(source, BUNDLE_KEYS, 'ArenaDeviceAcceptanceBundle');
  if (source.schemaVersion !== ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 ArenaDeviceAcceptanceBundle schema ${String(source.schemaVersion)}。`,
    );
  }
  if (source.definitionId !== definition.id) {
    throw new RangeError('ArenaDeviceAcceptanceBundle.definitionId 与当前定义不一致。');
  }
  const definitionHash = definition.getContentHash();
  if (source.definitionHash !== definitionHash) {
    throw new RangeError('ArenaDeviceAcceptanceBundle.definitionHash 与当前定义不一致。');
  }
  const commit = assertEvidenceGitCommit(
    source.commit,
    'ArenaDeviceAcceptanceBundle.commit',
  );
  const buildId = boundedString(source.buildId, 128, 'ArenaDeviceAcceptanceBundle.buildId');
  if (!Array.isArray(source.records)) {
    throw new TypeError('ArenaDeviceAcceptanceBundle.records 必须是数组。');
  }
  if (source.records.length > MAXIMUM_RECORDS) {
    throw new RangeError(`ArenaDeviceAcceptanceBundle.records 不能超过 ${MAXIMUM_RECORDS} 项。`);
  }
  const recordIds = new Set();
  const runIds = new Set();
  const artifactPaths = new Map();
  const buildManifestsByPlatform = new Map();
  const records = source.records.map((value, index) => {
    const record = createArenaDeviceAcceptanceRecord(definition, value);
    if (record.commit !== commit) {
      throw new RangeError(`records[${index}].commit 与 bundle commit 不一致。`);
    }
    if (record.buildId !== buildId) {
      throw new RangeError(`records[${index}].buildId 与 bundle buildId 不一致。`);
    }
    if (recordIds.has(record.recordId)) {
      throw new RangeError(`重复的设备证据 recordId ${record.recordId}。`);
    }
    if (runIds.has(record.runId)) {
      throw new RangeError(`重复的设备证据 runId ${record.runId}。`);
    }
    recordIds.add(record.recordId);
    runIds.add(record.runId);
    const target = definition.getTarget(record.targetId);
    for (const artifact of record.artifacts) {
      const previous = artifactPaths.get(artifact.path);
      const sharedBuildManifest = previous?.kind
        === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
        && artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST;
      if (previous !== undefined && !sharedBuildManifest) {
        throw new RangeError(
          `artifact 路径 ${artifact.path} 被 ${previous.runId} 与 ${record.runId} 重复使用。`,
        );
      }
      artifactPaths.set(artifact.path, { runId: record.runId, kind: artifact.kind });
      if (artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST) {
        const previousManifest = buildManifestsByPlatform.get(target.platform);
        if (
          previousManifest !== undefined
          && (
            previousManifest.sha256 !== artifact.sha256
            || previousManifest.byteLength !== artifact.byteLength
          )
        ) {
          throw new RangeError(
            `平台 ${target.platform} 的 Record 必须引用同一构建 Manifest。`,
          );
        }
        buildManifestsByPlatform.set(target.platform, {
          sha256: artifact.sha256,
          byteLength: artifact.byteLength,
        });
      }
    }
    return record;
  });
  const createdAt = assertEvidenceUtcInstant(
    source.createdAt,
    'ArenaDeviceAcceptanceBundle.createdAt',
  );
  if (records.some((record) => record.performedAt > createdAt)) {
    throw new RangeError('ArenaDeviceAcceptanceBundle.createdAt 不能早于设备运行记录。');
  }
  return Object.freeze({
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash,
    commit,
    buildId,
    createdAt,
    records: Object.freeze(records.sort((left, right) => compareText(left.recordId, right.recordId))),
  });
}

export function createArenaDeviceAcceptanceReport(definitionValue, bundleValue) {
  const definition = createArenaDeviceAcceptanceDefinition(definitionValue);
  const bundle = createArenaDeviceAcceptanceBundle(definition, bundleValue);
  const targets = definition.targets.map((target) => {
    const records = bundle.records.filter(({ targetId }) => targetId === target.id);
    const passingRuns = records.filter(isArenaDeviceAcceptanceRecordPassing).length;
    const failingRuns = records.length - passingRuns;
    let status = ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.INCOMPLETE;
    if (failingRuns > 0) {
      status = ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.FAILED;
    } else if (passingRuns >= target.minimumPassingRuns) {
      status = ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY;
    }
    return Object.freeze({
      targetId: target.id,
      platform: target.platform,
      executionSurface: target.executionSurface,
      minimumPassingRuns: target.minimumPassingRuns,
      passingRuns,
      failingRuns,
      status,
    });
  });
  const missingTargetIds = targets
    .filter(({ status }) => status === ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.INCOMPLETE)
    .map(({ targetId }) => targetId);
  const failingTargetIds = targets
    .filter(({ status }) => status === ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.FAILED)
    .map(({ targetId }) => targetId);
  const status = targets.every(({ status: targetStatus }) => (
    targetStatus === ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY
  ))
    ? ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY
    : failingTargetIds.length > 0
      ? ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.FAILED
      : ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.INCOMPLETE;
  return cloneFrozenData({
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_REPORT_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: bundle.commit,
    buildId: bundle.buildId,
    sourceDataHash: createDeterministicDataHash(bundle, 'ArenaDeviceAcceptanceReport bundle'),
    status,
    recordCount: bundle.records.length,
    passingRunCount: bundle.records.filter(isArenaDeviceAcceptanceRecordPassing).length,
    failingRunCount: bundle.records.filter((record) => (
      !isArenaDeviceAcceptanceRecordPassing(record)
    )).length,
    missingTargetIds,
    failingTargetIds,
    targets,
  }, 'ArenaDeviceAcceptanceReport');
}
