import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_PERFORMANCE_GATE_OPERATOR,
  createArenaPerformancePolicyDefinition,
} from './arena-performance-policy-definition.js';
import type {
  ArenaPerformanceDeviceClass,
  ArenaPerformanceGateOperator,
} from './arena-performance-policy-definition.js';
import {
  createArenaPerformanceRecord,
  getArenaPerformanceRecordHash,
} from './arena-performance-record.js';
import {
  ARENA_DEFAULT_PERFORMANCE_METRIC_REGISTRY,
  ArenaPerformanceMetricCollectorRegistry,
} from './arena-performance-metric-registry.js';
import type {
  ArenaPerformanceMetric,
} from './arena-performance-metric-registry.js';
import type { ArenaDeviceAcceptancePlatform } from '@number-strategy-jump/arena-device-acceptance';

export const ARENA_PERFORMANCE_REPORT_SCHEMA_VERSION = 1;
const REPORT_OPTION_KEYS = new Set(['metricRegistry']);
const METRIC_KEYS = new Set([
  'available',
  'value',
  'unit',
  'numerator',
  'denominator',
  'reason',
]);

export interface ArenaPerformanceGateReport {
  readonly id: string;
  readonly collectorId: string;
  readonly operator: ArenaPerformanceGateOperator;
  readonly threshold: number;
  readonly required: boolean;
  readonly passed: boolean;
  readonly metric: ArenaPerformanceMetric;
}

export interface ArenaPerformanceReport {
  readonly schemaVersion: typeof ARENA_PERFORMANCE_REPORT_SCHEMA_VERSION;
  readonly policyId: string;
  readonly policyHash: string;
  readonly recordId: string;
  readonly recordHash: string;
  readonly commit: string;
  readonly buildId: string;
  readonly targetId: string;
  readonly platform: ArenaDeviceAcceptancePlatform;
  readonly deviceClass: ArenaPerformanceDeviceClass;
  readonly qualityDefinitionId: string;
  readonly qualityDefinitionHash: string;
  readonly status: 'passed' | 'failed';
  readonly failedGateIds: readonly string[];
  readonly gates: readonly ArenaPerformanceGateReport[];
  readonly resultHash: string;
}

function evaluate(
  value: number,
  operator: ArenaPerformanceGateOperator,
  threshold: number,
): boolean {
  if (operator === ARENA_PERFORMANCE_GATE_OPERATOR.EQUAL) return value === threshold;
  if (operator === ARENA_PERFORMANCE_GATE_OPERATOR.LESS_THAN_OR_EQUAL) {
    return value <= threshold;
  }
  if (operator === ARENA_PERFORMANCE_GATE_OPERATOR.GREATER_THAN_OR_EQUAL) {
    return value >= threshold;
  }
  throw new RangeError(`未知性能 Gate operator ${String(operator)}。`);
}

function finiteMetricNumber(value: unknown, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} 必须是有限数。`);
  return value as number;
}

function nullableMetricNumber(value: unknown, name: string): number | null {
  return value === null ? null : finiteMetricNumber(value, name);
}

function normalizeMetric(value: unknown, collectorId: string): ArenaPerformanceMetric {
  const name = `性能 collector ${collectorId} result`;
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, METRIC_KEYS, name);
  if (source.available === true) {
    if (source.reason !== null) throw new TypeError(`${name}.reason 必须是 null。`);
    return Object.freeze({
      available: true,
      value: finiteMetricNumber(source.value, `${name}.value`),
      unit: assertNonEmptyString(source.unit, `${name}.unit`),
      numerator: nullableMetricNumber(source.numerator, `${name}.numerator`),
      denominator: nullableMetricNumber(source.denominator, `${name}.denominator`),
      reason: null,
    });
  }
  if (source.available !== false) throw new TypeError(`${name}.available 必须是布尔值。`);
  for (const field of ['value', 'unit', 'numerator', 'denominator'] as const) {
    if (source[field] !== null) throw new TypeError(`${name}.${field} 必须是 null。`);
  }
  return Object.freeze({
    available: false,
    value: null,
    unit: null,
    numerator: null,
    denominator: null,
    reason: assertNonEmptyString(source.reason, `${name}.reason`),
  });
}

function resolveMetricRegistry(options: unknown): ArenaPerformanceMetricCollectorRegistry {
  if (options === undefined) return ARENA_DEFAULT_PERFORMANCE_METRIC_REGISTRY;
  assertKnownKeys(options, REPORT_OPTION_KEYS, 'ArenaPerformanceReport options');
  if (!(options.metricRegistry instanceof ArenaPerformanceMetricCollectorRegistry)) {
    throw new TypeError('ArenaPerformanceReport.metricRegistry 必须是性能 Metric Registry。');
  }
  return options.metricRegistry;
}

export function createArenaPerformanceReport(
  policyValue: unknown,
  recordValue: unknown,
  options: unknown = undefined,
): ArenaPerformanceReport {
  const metricRegistry = resolveMetricRegistry(options);
  const policy = createArenaPerformancePolicyDefinition(policyValue);
  const record = createArenaPerformanceRecord(policy, recordValue);
  const target = policy.getTarget(record.targetId);
  if (target === null) throw new RangeError(`未知 performance target ${record.targetId}。`);
  const gates: readonly ArenaPerformanceGateReport[] = Object.freeze(target.gates.map((gate) => {
    const metric = normalizeMetric(
      metricRegistry.require(gate.collectorId).collect(record, gate.parameters),
      gate.collectorId,
    );
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
  }));
  const failedGateIds = gates.filter(({ passed }) => !passed).map(({ id }) => id);
  const result: Omit<ArenaPerformanceReport, 'resultHash'> = cloneFrozenData({
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
