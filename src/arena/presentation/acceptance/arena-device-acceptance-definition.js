import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '../../rules/definition-utils.js';

export const ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION = 1;

export const ARENA_DEVICE_ACCEPTANCE_PLATFORM = Object.freeze({
  WEB: 'web',
  WECHAT: 'wechat',
  DOUYIN: 'douyin',
});

export const ARENA_DEVICE_ACCEPTANCE_SURFACE = Object.freeze({
  MOBILE_BROWSER: 'mobile-browser',
  DEVELOPER_TOOL: 'developer-tool',
  PHYSICAL_DEVICE: 'physical-device',
});

export const ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND = Object.freeze({
  BUILD_MANIFEST: 'build-manifest',
  SCREENSHOT: 'screenshot',
  VIDEO: 'video',
  LOG: 'log',
  PERFORMANCE_TRACE: 'performance-trace',
});

const DEFINITION_KEYS = new Set(['schemaVersion', 'id', 'stage', 'checks', 'targets']);
const CHECK_KEYS = new Set(['id', 'title']);
const TARGET_KEYS = new Set([
  'id',
  'platform',
  'executionSurface',
  'minimumPassingRuns',
  'requiredCheckIds',
  'requiredArtifactKinds',
  'requiredOsNames',
]);
const MAXIMUM_CHECKS = 128;
const MAXIMUM_TARGETS = 128;

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function cloneChecks(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('ArenaDeviceAcceptanceDefinition.checks 不能为空。');
  }
  if (values.length > MAXIMUM_CHECKS) {
    throw new RangeError(`ArenaDeviceAcceptanceDefinition.checks 不能超过 ${MAXIMUM_CHECKS} 项。`);
  }
  const ids = new Set();
  const checks = values.map((value, index) => {
    const name = `ArenaDeviceAcceptanceDefinition.checks[${index}]`;
    assertKnownKeys(value, CHECK_KEYS, name);
    const id = assertNonEmptyString(value.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复的设备验收 check ${id}。`);
    ids.add(id);
    return Object.freeze({
      id,
      title: assertNonEmptyString(value.title, `${name}.title`),
    });
  });
  return Object.freeze(checks.sort((left, right) => compareText(left.id, right.id)));
}

function cloneTargets(values, checkIds) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('ArenaDeviceAcceptanceDefinition.targets 不能为空。');
  }
  if (values.length > MAXIMUM_TARGETS) {
    throw new RangeError(`ArenaDeviceAcceptanceDefinition.targets 不能超过 ${MAXIMUM_TARGETS} 项。`);
  }
  const ids = new Set();
  const targets = values.map((value, index) => {
    const name = `ArenaDeviceAcceptanceDefinition.targets[${index}]`;
    assertKnownKeys(value, TARGET_KEYS, name);
    const id = assertNonEmptyString(value.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复的设备验收 target ${id}。`);
    ids.add(id);
    const requiredCheckIds = cloneFrozenStringSet(
      value.requiredCheckIds,
      `${name}.requiredCheckIds`,
    );
    if (requiredCheckIds.length === 0) {
      throw new RangeError(`${name}.requiredCheckIds 不能为空。`);
    }
    for (const checkId of requiredCheckIds) {
      if (!checkIds.has(checkId)) {
        throw new RangeError(`${name} 引用未知 check ${checkId}。`);
      }
    }
    const requiredArtifactKinds = cloneFrozenStringSet(
      value.requiredArtifactKinds,
      `${name}.requiredArtifactKinds`,
    );
    if (requiredArtifactKinds.length === 0) {
      throw new RangeError(`${name}.requiredArtifactKinds 不能为空。`);
    }
    for (const kind of requiredArtifactKinds) {
      enumValue(kind, ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND, `${name}.requiredArtifactKinds`);
    }
    const requiredOsNames = value.requiredOsNames === undefined
      ? null
      : cloneFrozenStringSet(value.requiredOsNames, `${name}.requiredOsNames`);
    if (requiredOsNames !== null && requiredOsNames.length === 0) {
      throw new RangeError(`${name}.requiredOsNames 不能是空数组。`);
    }
    const target = {
      id,
      platform: enumValue(
        value.platform,
        ARENA_DEVICE_ACCEPTANCE_PLATFORM,
        `${name}.platform`,
      ),
      executionSurface: enumValue(
        value.executionSurface,
        ARENA_DEVICE_ACCEPTANCE_SURFACE,
        `${name}.executionSurface`,
      ),
      minimumPassingRuns: assertIntegerAtLeast(
        value.minimumPassingRuns,
        1,
        `${name}.minimumPassingRuns`,
      ),
      requiredCheckIds,
      requiredArtifactKinds,
    };
    if (requiredOsNames !== null) target.requiredOsNames = requiredOsNames;
    return Object.freeze(target);
  });
  return Object.freeze(targets.sort((left, right) => compareText(left.id, right.id)));
}

export class ArenaDeviceAcceptanceDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'ArenaDeviceAcceptanceDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'ArenaDeviceAcceptanceDefinition');
    if (source.schemaVersion !== ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 ArenaDeviceAcceptanceDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    const checks = cloneChecks(source.checks);
    const targets = cloneTargets(source.targets, new Set(checks.map(({ id }) => id)));
    const referencedCheckIds = new Set(targets.flatMap(({ requiredCheckIds }) => requiredCheckIds));
    const unusedCheck = checks.find(({ id }) => !referencedCheckIds.has(id));
    if (unusedCheck) {
      throw new RangeError(`设备验收 check ${unusedCheck.id} 未被任何 target 引用。`);
    }
    Object.defineProperties(this, {
      schemaVersion: {
        value: ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION,
        enumerable: true,
      },
      id: {
        value: assertNonEmptyString(source.id, 'ArenaDeviceAcceptanceDefinition.id'),
        enumerable: true,
      },
      stage: {
        value: assertNonEmptyString(source.stage, 'ArenaDeviceAcceptanceDefinition.stage'),
        enumerable: true,
      },
      checks: { value: checks, enumerable: true },
      targets: { value: targets, enumerable: true },
    });
    Object.freeze(this);
  }

  getCheck(id) {
    return this.checks.find((check) => check.id === id) ?? null;
  }

  getTarget(id) {
    return this.targets.find((target) => target.id === id) ?? null;
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      stage: this.stage,
      checks: this.checks,
      targets: this.targets,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(
      this.toJSON(),
      `ArenaDeviceAcceptanceDefinition ${this.id}`,
    );
  }
}

export function createArenaDeviceAcceptanceDefinition(value) {
  return value instanceof ArenaDeviceAcceptanceDefinition
    ? value
    : new ArenaDeviceAcceptanceDefinition(value);
}
