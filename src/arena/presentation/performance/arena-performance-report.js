import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import { cloneFrozenData } from '../../rules/definition-utils.js';
import {
  ARENA_PERFORMANCE_GATE_OPERATOR,
  createArenaPerformancePolicyDefinition,
} from './arena-performance-policy-definition.js';
import {
  createArenaPerformanceRecord,
  getArenaPerformanceRecordHash,
} from './arena-performance-record.js';
import {
  ARENA_DEFAULT_PERFORMANCE_METRIC_REGISTRY,
} from './arena-performance-metric-registry.js';

export const ARENA_PERFORMANCE_REPORT_SCHEMA_VERSION = 1;

function evaluate(value, operator, threshold) {
  if (operator === ARENA_PERFORMANCE_GATE_OPERATOR.EQUAL) return value === threshold;
  if (operator === ARENA_PERFORMANCE_GATE_OPERATOR.LESS_THAN_OR_EQUAL) {
    return value <= threshold;
  }
  if (operator === ARENA_PERFORMANCE_GATE_OPERATOR.GREATER_THAN_OR_EQUAL) {
    return value >= threshold;
  }
  throw new RangeError(`未知性能 Gate operator ${String(operator)}。`);
}

export function createArenaPerformanceReport(
  policyValue,
  recordValue,
  { metricRegistry = ARENA_DEFAULT_PERFORMANCE_METRIC_REGISTRY } = {},
) {
  const policy = createArenaPerformancePolicyDefinition(policyValue);
  const record = createArenaPerformanceRecord(policy, recordValue);
  const target = policy.getTarget(record.targetId);
  const gates = target.gates.map((gate) => {
    const metric = metricRegistry.require(gate.collectorId).collect(
      record,
      gate.parameters,
    );
    if (!metric || typeof metric.available !== 'boolean') {
      throw new TypeError(`性能 collector ${gate.collectorId} 返回值无效。`);
    }
    const passed = metric.available
      ? evaluate(metric.value, gate.operator, gate.threshold)
      : !gate.required;
    return Object.freeze({
      id: gate.id,
      collectorId: gate.collectorId,
      operator: gate.operator,
      threshold: gate.threshold,
      required: gate.required,
      passed,
      metric,
    });
  });
  const failedGateIds = gates.filter(({ passed }) => !passed).map(({ id }) => id);
  const result = cloneFrozenData({
    schemaVersion: ARENA_PERFORMANCE_REPORT_SCHEMA_VERSION,
    policyId: policy.id,
    policyHash: policy.getContentHash(),
    recordId: record.recordId,
    recordHash: getArenaPerformanceRecordHash(policy, record),
    commit: record.commit,
    buildId: record.buildId,
    targetId: target.id,
    platform: target.platform,
    deviceClass: target.deviceClass,
    qualityDefinitionId: target.qualityDefinitionId,
    qualityDefinitionHash: target.qualityDefinitionHash,
    status: failedGateIds.length === 0 ? 'passed' : 'failed',
    failedGateIds,
    gates,
  }, 'ArenaPerformanceReport');
  return cloneFrozenData({
    ...result,
    resultHash: createDeterministicDataHash(result, 'ArenaPerformanceReport'),
  }, 'ArenaPerformanceReport with hash');
}
