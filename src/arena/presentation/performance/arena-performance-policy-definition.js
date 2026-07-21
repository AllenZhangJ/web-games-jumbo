import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_DEVICE_ACCEPTANCE_PLATFORM,
} from '../acceptance/arena-device-acceptance-definition.js';

export const ARENA_PERFORMANCE_POLICY_SCHEMA_VERSION = 1;

export const ARENA_PERFORMANCE_DEVICE_CLASS = Object.freeze({
  LOW: 'low',
  MAINSTREAM: 'mainstream',
});

export const ARENA_PERFORMANCE_GATE_OPERATOR = Object.freeze({
  EQUAL: 'equal',
  LESS_THAN_OR_EQUAL: 'less-than-or-equal',
  GREATER_THAN_OR_EQUAL: 'greater-than-or-equal',
});

const POLICY_KEYS = new Set(['schemaVersion', 'id', 'stage', 'contentVersion', 'targets']);
const TARGET_KEYS = new Set([
  'id',
  'platform',
  'deviceClass',
  'requiredOsNames',
  'qualityDefinitionId',
  'qualityDefinitionHash',
  'gates',
]);
const GATE_KEYS = new Set([
  'id',
  'collectorId',
  'operator',
  'threshold',
  'required',
  'parameters',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/;
const MAXIMUM_TARGETS = 32;
const MAXIMUM_GATES = 128;

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function hashValue(value, name) {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 8 位小写十六进制 content hash。`);
  }
  return value;
}

function cloneGates(values, name) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError(`${name} 不能为空。`);
  }
  if (values.length > MAXIMUM_GATES) {
    throw new RangeError(`${name} 不能超过 ${MAXIMUM_GATES} 项。`);
  }
  const ids = new Set();
  return Object.freeze(values.map((value, index) => {
    const gateName = `${name}[${index}]`;
    assertKnownKeys(value, GATE_KEYS, gateName);
    const id = assertNonEmptyString(value.id, `${gateName}.id`);
    if (ids.has(id)) throw new RangeError(`${name} 包含重复 gate ${id}。`);
    ids.add(id);
    if (!Number.isFinite(value.threshold)) {
      throw new RangeError(`${gateName}.threshold 必须是有限数。`);
    }
    if (typeof value.required !== 'boolean') {
      throw new TypeError(`${gateName}.required 必须是布尔值。`);
    }
    return Object.freeze({
      id,
      collectorId: assertNonEmptyString(value.collectorId, `${gateName}.collectorId`),
      operator: enumValue(
        value.operator,
        ARENA_PERFORMANCE_GATE_OPERATOR,
        `${gateName}.operator`,
      ),
      threshold: value.threshold,
      required: value.required,
      parameters: cloneFrozenData(value.parameters ?? {}, `${gateName}.parameters`),
    });
  }).sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)));
}

function cloneTargets(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('ArenaPerformancePolicy.targets 不能为空。');
  }
  if (values.length > MAXIMUM_TARGETS) {
    throw new RangeError(`ArenaPerformancePolicy.targets 不能超过 ${MAXIMUM_TARGETS} 项。`);
  }
  const ids = new Set();
  const valuesByPlatformAndClass = new Set();
  return Object.freeze(values.map((value, index) => {
    const name = `ArenaPerformancePolicy.targets[${index}]`;
    assertKnownKeys(value, TARGET_KEYS, name);
    const id = assertNonEmptyString(value.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复的性能 target ${id}。`);
    ids.add(id);
    const platform = enumValue(
      value.platform,
      ARENA_DEVICE_ACCEPTANCE_PLATFORM,
      `${name}.platform`,
    );
    const deviceClass = enumValue(
      value.deviceClass,
      ARENA_PERFORMANCE_DEVICE_CLASS,
      `${name}.deviceClass`,
    );
    const tuple = `${platform}:${deviceClass}`;
    if (valuesByPlatformAndClass.has(tuple)) {
      throw new RangeError(`性能 Policy 重复定义 ${tuple}。`);
    }
    valuesByPlatformAndClass.add(tuple);
    const requiredOsNames = cloneFrozenStringSet(value.requiredOsNames, `${name}.requiredOsNames`);
    if (requiredOsNames.length === 0) throw new RangeError(`${name}.requiredOsNames 不能为空。`);
    return Object.freeze({
      id,
      platform,
      deviceClass,
      requiredOsNames,
      qualityDefinitionId: assertNonEmptyString(
        value.qualityDefinitionId,
        `${name}.qualityDefinitionId`,
      ),
      qualityDefinitionHash: hashValue(
        value.qualityDefinitionHash,
        `${name}.qualityDefinitionHash`,
      ),
      gates: cloneGates(value.gates, `${name}.gates`),
    });
  }).sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)));
}

export class ArenaPerformancePolicyDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'ArenaPerformancePolicy');
    assertKnownKeys(source, POLICY_KEYS, 'ArenaPerformancePolicy');
    if (source.schemaVersion !== ARENA_PERFORMANCE_POLICY_SCHEMA_VERSION) {
      throw new RangeError(`不支持 ArenaPerformancePolicy schema ${String(source.schemaVersion)}。`);
    }
    Object.defineProperties(this, {
      schemaVersion: { value: ARENA_PERFORMANCE_POLICY_SCHEMA_VERSION, enumerable: true },
      id: {
        value: assertNonEmptyString(source.id, 'ArenaPerformancePolicy.id'),
        enumerable: true,
      },
      stage: {
        value: assertNonEmptyString(source.stage, 'ArenaPerformancePolicy.stage'),
        enumerable: true,
      },
      contentVersion: {
        value: assertIntegerAtLeast(
          source.contentVersion,
          1,
          'ArenaPerformancePolicy.contentVersion',
        ),
        enumerable: true,
      },
      targets: { value: cloneTargets(source.targets), enumerable: true },
    });
    Object.freeze(this);
  }

  getTarget(id) {
    return this.targets.find((target) => target.id === id) ?? null;
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      stage: this.stage,
      contentVersion: this.contentVersion,
      targets: this.targets,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(this.toJSON(), `ArenaPerformancePolicy ${this.id}`);
  }
}

export function createArenaPerformancePolicyDefinition(value) {
  return value instanceof ArenaPerformancePolicyDefinition
    ? value
    : new ArenaPerformancePolicyDefinition(value);
}
