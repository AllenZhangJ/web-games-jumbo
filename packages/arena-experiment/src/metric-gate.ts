import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_METRIC_GATE_SCHEMA_VERSION = 1;

const GATE_KEYS: ReadonlySet<string> = new Set(['schemaVersion', 'passed', 'checks']);
const CHECK_KEYS: ReadonlySet<string> = new Set(['id', 'passed']);
const MAXIMUM_GATE_CHECKS = 256;

export interface ArenaMetricGateCheck {
  readonly id: string;
  readonly passed: boolean;
}

export interface ArenaMetricGate {
  readonly schemaVersion: typeof ARENA_METRIC_GATE_SCHEMA_VERSION;
  readonly passed: boolean;
  readonly checks: readonly Readonly<ArenaMetricGateCheck>[];
}

export function createArenaMetricGate(checksValue: unknown): Readonly<ArenaMetricGate> {
  const checks = cloneFrozenData(checksValue, 'ArenaMetricGate checks');
  if (!Array.isArray(checks) || checks.length === 0) {
    throw new RangeError('ArenaMetricGate checks 必须是非空数组。');
  }
  if (checks.length > MAXIMUM_GATE_CHECKS) {
    throw new RangeError(`ArenaMetricGate checks 不能超过 ${MAXIMUM_GATE_CHECKS} 项。`);
  }
  const ids = new Set<string>();
  const normalized = checks.map((value, index): Readonly<ArenaMetricGateCheck> => {
    const name = `ArenaMetricGate checks[${index}]`;
    assertKnownKeys(value, CHECK_KEYS, name);
    const id = assertNonEmptyString(value.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`ArenaMetricGate 包含重复 check ${id}。`);
    ids.add(id);
    if (typeof value.passed !== 'boolean') {
      throw new TypeError(`${name}.passed 必须是布尔值。`);
    }
    return Object.freeze({ id, passed: value.passed });
  });
  return Object.freeze({
    schemaVersion: ARENA_METRIC_GATE_SCHEMA_VERSION,
    passed: normalized.every(({ passed }) => passed),
    checks: Object.freeze(normalized),
  });
}

export function readArenaMetricGate(metricData: unknown): Readonly<ArenaMetricGate> | null {
  if (!Object.prototype.hasOwnProperty.call(metricData, 'gate')) return null;
  const metricRecord = assertPlainRecord(metricData, 'Arena metric data');
  const gateDescriptor = Object.getOwnPropertyDescriptor(metricRecord, 'gate');
  if (
    !gateDescriptor
    || !gateDescriptor.enumerable
    || !Object.prototype.hasOwnProperty.call(gateDescriptor, 'value')
  ) {
    throw new TypeError('Arena metric data.gate 必须是可枚举数据字段。');
  }
  const gate = cloneFrozenData(gateDescriptor.value, 'ArenaMetricGate');
  assertKnownKeys(gate, GATE_KEYS, 'ArenaMetricGate');
  if (gate.schemaVersion !== ARENA_METRIC_GATE_SCHEMA_VERSION) {
    throw new RangeError(`不支持 ArenaMetricGate schema ${String(gate.schemaVersion)}。`);
  }
  const normalized = createArenaMetricGate(gate.checks);
  if (gate.passed !== normalized.passed) {
    throw new Error('ArenaMetricGate.passed 与 checks 计算结果不一致。');
  }
  return normalized;
}
