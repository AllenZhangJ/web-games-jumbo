import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS,
  createArenaDeviceAcceptanceBundle,
  createArenaDeviceAcceptanceReport,
  createArenaStage6DeviceAcceptanceV1Definition,
  createArenaStage8ProductDeviceAcceptanceV1Definition,
  type ArenaDeviceAcceptanceDefinition,
  type ArenaDeviceAcceptanceReportStatus,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaPerformanceEvidenceReport,
  createArenaStage9PerformanceDeviceAcceptanceV1Definition,
  createArenaStage9PerformanceV1Policy,
} from '@number-strategy-jump/arena-stage9-evidence-content';
import { ARENA_RELEASE_EVIDENCE_STATUS } from '@number-strategy-jump/arena-release-contracts';

const BUNDLE_OPTION_KEYS = new Set(['bundle']);
const PERFORMANCE_OPTION_KEYS = new Set(['bundle', 'performanceRecords']);

function releaseStatus(status: ArenaDeviceAcceptanceReportStatus) {
  if (status === ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY) {
    return ARENA_RELEASE_EVIDENCE_STATUS.READY;
  }
  if (status === ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.FAILED) {
    return ARENA_RELEASE_EVIDENCE_STATUS.FAILED;
  }
  return ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE;
}

function createDeviceResult(
  producerId: string,
  definition: ArenaDeviceAcceptanceDefinition,
  bundleValue: unknown,
) {
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

export function createArenaStage6DeviceReleaseResult(optionsValue: unknown) {
  assertKnownKeys(optionsValue, BUNDLE_OPTION_KEYS, 'Stage 6 device release options');
  return createDeviceResult(
    'arena:device:evidence',
    createArenaStage6DeviceAcceptanceV1Definition(),
    optionsValue.bundle,
  );
}

export function createArenaStage8ProductDeviceReleaseResult(optionsValue: unknown) {
  assertKnownKeys(optionsValue, BUNDLE_OPTION_KEYS, 'Stage 8 device release options');
  return createDeviceResult(
    'arena:product:device:evidence',
    createArenaStage8ProductDeviceAcceptanceV1Definition(),
    optionsValue.bundle,
  );
}

export function createArenaPerformanceDeviceReleaseResult(optionsValue: unknown) {
  assertKnownKeys(optionsValue, PERFORMANCE_OPTION_KEYS, 'Performance device release options');
  const producerId = 'arena:performance:evidence';
  const definition = createArenaStage9PerformanceDeviceAcceptanceV1Definition();
  const bundle = createArenaDeviceAcceptanceBundle(definition, optionsValue.bundle);
  const policy = createArenaStage9PerformanceV1Policy();
  const report = createArenaPerformanceEvidenceReport({
    deviceDefinition: definition,
    deviceBundle: bundle,
    performancePolicy: policy,
    performanceRecords: optionsValue.performanceRecords,
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
