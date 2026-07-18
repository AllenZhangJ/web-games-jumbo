import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import { cloneFrozenData } from '../../rules/definition-utils.js';
import {
  ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT,
} from '../acceptance/arena-device-acceptance-record.js';
import {
  createArenaDeviceAcceptanceDefinition,
} from '../acceptance/arena-device-acceptance-definition.js';
import {
  ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS,
  createArenaDeviceAcceptanceBundle,
  createArenaDeviceAcceptanceReport,
} from '../acceptance/arena-device-acceptance-bundle.js';
import {
  ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID,
} from '../acceptance/arena-stage9-performance-device-acceptance-v1.js';
import { createArenaPerformancePolicyDefinition } from './arena-performance-policy-definition.js';
import { createArenaPerformanceRecord } from './arena-performance-record.js';
import { createArenaPerformanceReport } from './arena-performance-report.js';

export const ARENA_PERFORMANCE_EVIDENCE_REPORT_SCHEMA_VERSION = 1;

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function createArenaPerformanceEvidenceReport({
  deviceDefinition,
  deviceBundle: deviceBundleValue,
  performancePolicy: performancePolicyValue,
  performanceRecords: performanceRecordValues,
}) {
  const definition = createArenaDeviceAcceptanceDefinition(deviceDefinition);
  const policy = createArenaPerformancePolicyDefinition(performancePolicyValue);
  const bundle = createArenaDeviceAcceptanceBundle(definition, deviceBundleValue);
  const deviceReport = createArenaDeviceAcceptanceReport(definition, bundle);
  if (!Array.isArray(performanceRecordValues)) {
    throw new TypeError('Arena performanceRecords 必须是数组。');
  }
  if (performanceRecordValues.length !== bundle.records.length) {
    throw new RangeError('每个 Device Record 必须且只能绑定一份 Performance Record。');
  }
  const byRunId = new Map();
  const performanceReports = performanceRecordValues.map((value) => {
    const record = createArenaPerformanceRecord(policy, value);
    if (byRunId.has(record.runId)) {
      throw new RangeError(`重复 Performance Record runId ${record.runId}。`);
    }
    byRunId.set(record.runId, record);
    const deviceRecord = bundle.records.find(({ runId }) => runId === record.runId);
    if (!deviceRecord) {
      throw new RangeError(`Performance Record ${record.runId} 没有对应 Device Record。`);
    }
    for (const [field, left, right] of [
      ['commit', record.commit, deviceRecord.commit],
      ['buildId', record.buildId, deviceRecord.buildId],
      ['targetId', record.targetId, deviceRecord.targetId],
      ['performedAt', record.performedAt, deviceRecord.performedAt],
    ]) {
      if (left !== right) {
        throw new RangeError(`Performance Record ${record.runId}.${field} 与 Device Record 不一致。`);
      }
    }
    const policyTarget = policy.getTarget(record.targetId);
    const deviceTarget = definition.getTarget(record.targetId);
    if (!deviceTarget || deviceTarget.platform !== policyTarget.platform) {
      throw new RangeError(`target ${record.targetId} 的 Device/Performance 平台不一致。`);
    }
    if (!policyTarget.requiredOsNames.includes(deviceRecord.device.osName)) {
      throw new RangeError(`Performance target ${record.targetId} 不接受 ${deviceRecord.device.osName}。`);
    }
    const report = createArenaPerformanceReport(policy, record);
    const check = deviceRecord.checks.find(({ id }) => (
      id === ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID.PERFORMANCE_BUDGET
    ));
    if (!check) throw new RangeError(`Device Record ${record.runId} 缺少 performance-budget。`);
    const expectedCheckResult = report.status === 'passed'
      ? ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT.PASSED
      : ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT.FAILED;
    if (check.result !== expectedCheckResult) {
      throw new RangeError(
        `Device Record ${record.runId} 的 performance-budget 与机器报告冲突。`,
      );
    }
    return Object.freeze({
      runId: record.runId,
      recordId: record.recordId,
      report,
    });
  }).sort((left, right) => compareText(left.runId, right.runId));
  for (const record of bundle.records) {
    if (!byRunId.has(record.runId)) {
      throw new RangeError(`Device Record ${record.runId} 缺少 Performance Record。`);
    }
  }
  const targets = policy.targets.map((target) => {
    const deviceTarget = deviceReport.targets.find(({ targetId }) => targetId === target.id);
    if (!deviceTarget) throw new RangeError(`Device Report 缺少 performance target ${target.id}。`);
    const reports = performanceReports.filter(({ report }) => report.targetId === target.id);
    const passingRuns = reports.filter(({ report }) => report.status === 'passed').length;
    const failingRuns = reports.length - passingRuns;
    const status = deviceTarget.status === ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.FAILED
      || failingRuns > 0
      ? ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.FAILED
      : deviceTarget.status === ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY
        && passingRuns >= deviceTarget.minimumPassingRuns
        ? ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY
        : ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.INCOMPLETE;
    return Object.freeze({
      targetId: target.id,
      platform: target.platform,
      deviceClass: target.deviceClass,
      minimumPassingRuns: deviceTarget.minimumPassingRuns,
      passingRuns,
      failingRuns,
      status,
    });
  });
  const failedTargetIds = targets
    .filter(({ status }) => status === ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.FAILED)
    .map(({ targetId }) => targetId);
  const missingTargetIds = targets
    .filter(({ status }) => status === ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.INCOMPLETE)
    .map(({ targetId }) => targetId);
  const status = failedTargetIds.length > 0
    ? ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.FAILED
    : missingTargetIds.length > 0
      ? ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.INCOMPLETE
      : ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY;
  const result = cloneFrozenData({
    schemaVersion: ARENA_PERFORMANCE_EVIDENCE_REPORT_SCHEMA_VERSION,
    deviceDefinitionId: definition.id,
    deviceDefinitionHash: definition.getContentHash(),
    performancePolicyId: policy.id,
    performancePolicyHash: policy.getContentHash(),
    commit: bundle.commit,
    buildId: bundle.buildId,
    status,
    missingTargetIds,
    failedTargetIds,
    targets,
    performanceReports,
    deviceReport,
  }, 'ArenaPerformanceEvidenceReport');
  const canonicalPerformanceRecords = [...byRunId.values()].sort((left, right) => (
    compareText(left.runId, right.runId)
  ));
  return cloneFrozenData({
    ...result,
    sourceDataHash: createDeterministicDataHash({
      deviceBundle: bundle,
      performanceRecords: canonicalPerformanceRecords,
    }, 'ArenaPerformanceEvidence source'),
    resultHash: createDeterministicDataHash(result, 'ArenaPerformanceEvidence result'),
  }, 'ArenaPerformanceEvidenceReport with hashes');
}
