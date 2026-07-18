import { createDeterministicDataHash } from '../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '../rules/definition-utils.js';
import { assertEvidenceGitCommit } from '../evidence/evidence-value-contract.js';

export const ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION = 2;
export const ARENA_EXPERIMENT_DEFINITION_LEGACY_SCHEMA_VERSION = 1;

export const ARENA_EXPERIMENT_SEED_SET_KIND = Object.freeze({
  EXPLICIT: 'explicit',
  RANGE: 'range',
});

const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'description',
  'metricSchemaVersion',
  'candidate',
  'seedSet',
  'workload',
  'collectors',
  'limits',
]);
const CANDIDATE_KEYS = new Set([
  'id',
  'sourceCommit',
  'sourceDirty',
  'matchConfig',
  'authority',
]);
const AUTHORITY_KEYS = new Set([
  'matchSchemaVersion',
  'physicsBackendVersion',
  'configHash',
  'ruleContentHash',
]);
const SEED_SET_KEYS = new Set(['kind', 'values', 'first', 'last']);
const WORKLOAD_KEYS = new Set(['id', 'version', 'parameters']);
const COLLECTOR_KEYS_V1 = new Set(['id', 'version']);
const COLLECTOR_KEYS_V2 = new Set(['id', 'version', 'parameters']);
const LIMIT_KEYS = new Set(['maximumTicksPerCase', 'maximumFailedCases']);
const HASH_PATTERN = /^[0-9a-f]{8}$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const UINT32_MAXIMUM = 0xffffffff;
const MAXIMUM_CASES = 100_000;
const MAXIMUM_COLLECTORS = 64;

function boundedString(value, maximumLength, name) {
  const text = assertNonEmptyString(value, name);
  if (text.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 个字符。`);
  }
  return text;
}

function identifier(value, name) {
  const id = boundedString(value, 128, name);
  if (!ID_PATTERN.test(id)) {
    throw new TypeError(`${name} 只能包含小写字母、数字、点、下划线和连字符。`);
  }
  return id;
}

function uint32(value, name) {
  if (!Number.isSafeInteger(value) || value < 0 || value > UINT32_MAXIMUM) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value;
}

function shortHash(value, name) {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 8 位小写十六进制 hash。`);
  }
  return value;
}

function cloneAuthority(value) {
  const name = 'ArenaExperimentDefinition.candidate.authority';
  assertKnownKeys(value, AUTHORITY_KEYS, name);
  return Object.freeze({
    matchSchemaVersion: assertIntegerAtLeast(
      value.matchSchemaVersion,
      1,
      `${name}.matchSchemaVersion`,
    ),
    physicsBackendVersion: boundedString(
      value.physicsBackendVersion,
      128,
      `${name}.physicsBackendVersion`,
    ),
    configHash: shortHash(value.configHash, `${name}.configHash`),
    ruleContentHash: shortHash(value.ruleContentHash, `${name}.ruleContentHash`),
  });
}

function cloneCandidate(value) {
  const name = 'ArenaExperimentDefinition.candidate';
  assertKnownKeys(value, CANDIDATE_KEYS, name);
  const sourceCommit = assertEvidenceGitCommit(value.sourceCommit, `${name}.sourceCommit`);
  if (typeof value.sourceDirty !== 'boolean') {
    throw new TypeError(`${name}.sourceDirty 必须是布尔值。`);
  }
  const matchConfig = cloneFrozenData(value.matchConfig, `${name}.matchConfig`);
  assertPlainRecord(matchConfig, `${name}.matchConfig`);
  return Object.freeze({
    id: identifier(value.id, `${name}.id`),
    sourceCommit,
    sourceDirty: value.sourceDirty,
    matchConfig,
    authority: cloneAuthority(value.authority),
  });
}

function cloneSeedSet(value) {
  const name = 'ArenaExperimentDefinition.seedSet';
  assertKnownKeys(value, SEED_SET_KEYS, name);
  if (value.kind === ARENA_EXPERIMENT_SEED_SET_KIND.EXPLICIT) {
    if (value.first !== undefined || value.last !== undefined) {
      throw new RangeError(`${name} explicit 不能包含 first/last。`);
    }
    if (!Array.isArray(value.values) || value.values.length === 0) {
      throw new RangeError(`${name}.values 必须是非空数组。`);
    }
    if (value.values.length > MAXIMUM_CASES) {
      throw new RangeError(`${name}.values 不能超过 ${MAXIMUM_CASES} 项。`);
    }
    const values = value.values.map((seed, index) => uint32(seed, `${name}.values[${index}]`));
    for (let index = 1; index < values.length; index += 1) {
      if (values[index] <= values[index - 1]) {
        throw new RangeError(`${name}.values 必须严格递增且不重复。`);
      }
    }
    return Object.freeze({
      kind: ARENA_EXPERIMENT_SEED_SET_KIND.EXPLICIT,
      values: Object.freeze(values),
    });
  }
  if (value.kind === ARENA_EXPERIMENT_SEED_SET_KIND.RANGE) {
    if (value.values !== undefined) throw new RangeError(`${name} range 不能包含 values。`);
    const first = uint32(value.first, `${name}.first`);
    const last = uint32(value.last, `${name}.last`);
    if (last < first) throw new RangeError(`${name}.last 不能小于 first。`);
    if (last - first + 1 > MAXIMUM_CASES) {
      throw new RangeError(`${name} 不能超过 ${MAXIMUM_CASES} 个 seed。`);
    }
    return Object.freeze({
      kind: ARENA_EXPERIMENT_SEED_SET_KIND.RANGE,
      first,
      last,
    });
  }
  throw new RangeError(`${name}.kind 不受支持：${String(value.kind)}。`);
}

function cloneWorkload(value) {
  const name = 'ArenaExperimentDefinition.workload';
  assertKnownKeys(value, WORKLOAD_KEYS, name);
  const parameters = cloneFrozenData(value.parameters, `${name}.parameters`);
  assertPlainRecord(parameters, `${name}.parameters`);
  return Object.freeze({
    id: identifier(value.id, `${name}.id`),
    version: assertIntegerAtLeast(value.version, 1, `${name}.version`),
    parameters,
  });
}

function cloneCollectors(values, schemaVersion) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('ArenaExperimentDefinition.collectors 不能为空。');
  }
  if (values.length > MAXIMUM_COLLECTORS) {
    throw new RangeError(`ArenaExperimentDefinition.collectors 不能超过 ${MAXIMUM_COLLECTORS} 项。`);
  }
  const ids = new Set();
  const collectors = values.map((value, index) => {
    const name = `ArenaExperimentDefinition.collectors[${index}]`;
    assertKnownKeys(
      value,
      schemaVersion === ARENA_EXPERIMENT_DEFINITION_LEGACY_SCHEMA_VERSION
        ? COLLECTOR_KEYS_V1
        : COLLECTOR_KEYS_V2,
      name,
    );
    const id = identifier(value.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复的实验 collector ${id}。`);
    ids.add(id);
    const reference = {
      id,
      version: assertIntegerAtLeast(value.version, 1, `${name}.version`),
    };
    if (schemaVersion !== ARENA_EXPERIMENT_DEFINITION_LEGACY_SCHEMA_VERSION) {
      const parameters = cloneFrozenData(value.parameters ?? {}, `${name}.parameters`);
      assertPlainRecord(parameters, `${name}.parameters`);
      reference.parameters = parameters;
    }
    return Object.freeze(reference);
  });
  return Object.freeze(collectors.sort((left, right) => (
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  )));
}

function cloneLimits(value) {
  const name = 'ArenaExperimentDefinition.limits';
  assertKnownKeys(value, LIMIT_KEYS, name);
  return Object.freeze({
    maximumTicksPerCase: assertIntegerAtLeast(
      value.maximumTicksPerCase,
      1,
      `${name}.maximumTicksPerCase`,
    ),
    maximumFailedCases: assertIntegerAtLeast(
      value.maximumFailedCases,
      0,
      `${name}.maximumFailedCases`,
    ),
  });
}

export class ArenaExperimentDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'ArenaExperimentDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'ArenaExperimentDefinition');
    if (
      source.schemaVersion !== ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION
      && source.schemaVersion !== ARENA_EXPERIMENT_DEFINITION_LEGACY_SCHEMA_VERSION
    ) {
      throw new RangeError(`不支持 ArenaExperimentDefinition schema ${String(source.schemaVersion)}。`);
    }
    Object.defineProperties(this, {
      schemaVersion: {
        value: source.schemaVersion,
        enumerable: true,
      },
      id: { value: identifier(source.id, 'ArenaExperimentDefinition.id'), enumerable: true },
      description: {
        value: boundedString(source.description, 1_000, 'ArenaExperimentDefinition.description'),
        enumerable: true,
      },
      metricSchemaVersion: {
        value: assertIntegerAtLeast(
          source.metricSchemaVersion,
          1,
          'ArenaExperimentDefinition.metricSchemaVersion',
        ),
        enumerable: true,
      },
      candidate: { value: cloneCandidate(source.candidate), enumerable: true },
      seedSet: { value: cloneSeedSet(source.seedSet), enumerable: true },
      workload: { value: cloneWorkload(source.workload), enumerable: true },
      collectors: {
        value: cloneCollectors(source.collectors, source.schemaVersion),
        enumerable: true,
      },
      limits: { value: cloneLimits(source.limits), enumerable: true },
    });
    Object.freeze(this);
  }

  getSeeds() {
    if (this.seedSet.kind === ARENA_EXPERIMENT_SEED_SET_KIND.EXPLICIT) {
      return this.seedSet.values;
    }
    return Object.freeze(Array.from(
      { length: this.seedSet.last - this.seedSet.first + 1 },
      (_, index) => this.seedSet.first + index,
    ));
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      description: this.description,
      metricSchemaVersion: this.metricSchemaVersion,
      candidate: this.candidate,
      seedSet: this.seedSet,
      workload: this.workload,
      collectors: this.collectors,
      limits: this.limits,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(this.toJSON(), `ArenaExperimentDefinition ${this.id}`);
  }
}

export function createArenaExperimentDefinition(value) {
  return value instanceof ArenaExperimentDefinition ? value : new ArenaExperimentDefinition(value);
}
