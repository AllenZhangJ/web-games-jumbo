import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';

export const ARENA_METRIC_GATE_SCHEMA_VERSION = 1;

const GATE_KEYS = new Set(['schemaVersion', 'passed', 'checks']);
const CHECK_KEYS = new Set(['id', 'passed']);
const MAXIMUM_GATE_CHECKS = 256;

export function createArenaMetricGate(checksValue) {
  const checks = cloneFrozenData(checksValue, 'ArenaMetricGate checks');
  if (!Array.isArray(checks) || checks.length === 0) {
    throw new RangeError('ArenaMetricGate checks 必须是非空数组。');
  }
  if (checks.length > MAXIMUM_GATE_CHECKS) {
    throw new RangeError(`ArenaMetricGate checks 不能超过 ${MAXIMUM_GATE_CHECKS} 项。`);
  }
  const ids = new Set();
  const normalized = checks.map((value, index) => {
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

export function readArenaMetricGate(metricData) {
  if (!Object.prototype.hasOwnProperty.call(metricData, 'gate')) return null;
  const gate = cloneFrozenData(metricData.gate, 'ArenaMetricGate');
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
