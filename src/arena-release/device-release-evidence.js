import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS,
  createArenaDeviceAcceptanceBundle,
  createArenaDeviceAcceptanceReport,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaStage6DeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaStage8ProductDeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaStage9PerformanceDeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-stage9-evidence-content';
import {
  createArenaPerformanceEvidenceReport,
} from '@number-strategy-jump/arena-stage9-evidence-content';
import {
  createArenaStage9PerformanceV1Policy,
} from '@number-strategy-jump/arena-stage9-evidence-content';
import { ARENA_RELEASE_EVIDENCE_STATUS } from '@number-strategy-jump/arena-release-contracts';

function releaseStatus(status) {
  if (status === ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY) {
    return ARENA_RELEASE_EVIDENCE_STATUS.READY;
  }
  if (status === ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.FAILED) {
    return ARENA_RELEASE_EVIDENCE_STATUS.FAILED;
  }
  if (status === ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.INCOMPLETE) {
    return ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE;
  }
  throw new RangeError(`不支持的 Device acceptance status ${String(status)}。`);
}

function createDeviceResult({ producerId, definition, bundleValue }) {
  const bundle = createArenaDeviceAcceptanceBundle(definition, bundleValue);
  const report = createArenaDeviceAcceptanceReport(definition, bundle);
  const summary = cloneFrozenData({
    producerId,
    commit: bundle.commit,
    buildId: bundle.buildId,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    sourceDataHash: report.sourceDataHash,
    reportStatus: report.status,
    recordCount: report.recordCount,
    missingTargetIds: report.missingTargetIds,
    failingTargetIds: report.failingTargetIds,
  }, `Release producer ${producerId} summary`);
  return cloneFrozenData({
    commit: bundle.commit,
    buildId: bundle.buildId,
    status: releaseStatus(report.status),
    resultHash: createDeterministicDataHash(summary, `Release producer ${producerId}`),
  }, `Release producer ${producerId} result`);
}

export function createArenaStage6DeviceReleaseResult({ bundle }) {
  return createDeviceResult({
    producerId: 'arena:device:evidence',
    definition: createArenaStage6DeviceAcceptanceV1Definition(),
    bundleValue: bundle,
  });
}

export function createArenaStage8ProductDeviceReleaseResult({ bundle }) {
  return createDeviceResult({
    producerId: 'arena:product:device:evidence',
    definition: createArenaStage8ProductDeviceAcceptanceV1Definition(),
    bundleValue: bundle,
  });
}

export function createArenaPerformanceDeviceReleaseResult({ bundle: bundleValue, performanceRecords }) {
  const producerId = 'arena:performance:evidence';
  const definition = createArenaStage9PerformanceDeviceAcceptanceV1Definition();
  const bundle = createArenaDeviceAcceptanceBundle(definition, bundleValue);
  const policy = createArenaStage9PerformanceV1Policy();
  const report = createArenaPerformanceEvidenceReport({
    deviceDefinition: definition,
    deviceBundle: bundle,
    performancePolicy: policy,
    performanceRecords,
  });
  const summary = cloneFrozenData({
    producerId,
    commit: bundle.commit,
    buildId: bundle.buildId,
    deviceDefinitionId: definition.id,
    deviceDefinitionHash: definition.getContentHash(),
    performancePolicyId: policy.id,
    performancePolicyHash: policy.getContentHash(),
    sourceDataHash: report.sourceDataHash,
    reportResultHash: report.resultHash,
    reportStatus: report.status,
    missingTargetIds: report.missingTargetIds,
    failedTargetIds: report.failedTargetIds,
  }, `Release producer ${producerId} summary`);
  return cloneFrozenData({
    commit: bundle.commit,
    buildId: bundle.buildId,
    status: releaseStatus(report.status),
    resultHash: createDeterministicDataHash(summary, `Release producer ${producerId}`),
  }, `Release producer ${producerId} result`);
}
