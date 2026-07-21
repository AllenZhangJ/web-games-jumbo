import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceBoundedString,
  assertEvidenceGitCommit,
  assertEvidenceRelativePath,
  assertEvidenceSha256,
  assertEvidenceUtcInstant,
} from '../../evidence/evidence-value-contract.js';
import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
  ARENA_DEVICE_ACCEPTANCE_PLATFORM,
  createArenaDeviceAcceptanceDefinition,
} from './arena-device-acceptance-definition.js';

export const ARENA_DEVICE_ACCEPTANCE_RECORD_SCHEMA_VERSION = 1;

export const ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT = Object.freeze({
  PASSED: 'passed',
  FAILED: 'failed',
});

const RECORD_KEYS = new Set([
  'schemaVersion',
  'recordId',
  'definitionId',
  'definitionHash',
  'commit',
  'buildId',
  'targetId',
  'runId',
  'performedAt',
  'operatorId',
  'client',
  'device',
  'orientation',
  'inputMode',
  'checks',
  'artifacts',
]);
const CLIENT_KEYS = new Set(['name', 'version', 'baseLibraryVersion']);
const DEVICE_KEYS = new Set(['manufacturer', 'model', 'osName', 'osVersion']);
const CHECK_KEYS = new Set(['id', 'result', 'notes', 'artifactIds']);
const ARTIFACT_KEYS = new Set(['id', 'kind', 'path', 'sha256', 'byteLength']);
const MAXIMUM_ARTIFACTS = 64;

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function exactValue(value, expected, name) {
  if (value !== expected) throw new RangeError(`${name} 必须为 ${expected}。`);
  return value;
}

function boundedString(value, maximumLength, name) {
  return assertEvidenceBoundedString(value, maximumLength, name);
}

function nullableBoundedString(value, maximumLength, name) {
  return value === null ? null : boundedString(value, maximumLength, name);
}

function cloneClient(value, target) {
  const name = 'ArenaDeviceAcceptanceRecord.client';
  assertKnownKeys(value, CLIENT_KEYS, name);
  const baseLibraryVersion = nullableBoundedString(
    value.baseLibraryVersion,
    128,
    `${name}.baseLibraryVersion`,
  );
  if (
    target.platform === ARENA_DEVICE_ACCEPTANCE_PLATFORM.WEB
    && baseLibraryVersion !== null
  ) throw new RangeError('Web 设备记录的 baseLibraryVersion 必须为 null。');
  if (
    target.platform !== ARENA_DEVICE_ACCEPTANCE_PLATFORM.WEB
    && baseLibraryVersion === null
  ) throw new RangeError('小游戏设备记录必须包含基础库版本。');
  return Object.freeze({
    name: boundedString(value.name, 128, `${name}.name`),
    version: boundedString(value.version, 128, `${name}.version`),
    baseLibraryVersion,
  });
}

function cloneDevice(value, target) {
  const name = 'ArenaDeviceAcceptanceRecord.device';
  assertKnownKeys(value, DEVICE_KEYS, name);
  const device = Object.freeze({
    manufacturer: boundedString(value.manufacturer, 128, `${name}.manufacturer`),
    model: boundedString(value.model, 128, `${name}.model`),
    osName: boundedString(value.osName, 128, `${name}.osName`),
    osVersion: boundedString(value.osVersion, 128, `${name}.osVersion`),
  });
  if (target.requiredOsNames && !target.requiredOsNames.includes(device.osName)) {
    throw new RangeError(
      `target ${target.id} 只接受系统：${target.requiredOsNames.join('、')}。`,
    );
  }
  return device;
}

function cloneArtifacts(values, target) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('ArenaDeviceAcceptanceRecord.artifacts 不能为空。');
  }
  if (values.length > MAXIMUM_ARTIFACTS) {
    throw new RangeError(
      `ArenaDeviceAcceptanceRecord.artifacts 不能超过 ${MAXIMUM_ARTIFACTS} 项。`,
    );
  }
  const ids = new Set();
  const paths = new Set();
  const artifacts = values.map((value, index) => {
    const name = `ArenaDeviceAcceptanceRecord.artifacts[${index}]`;
    assertKnownKeys(value, ARTIFACT_KEYS, name);
    const id = boundedString(value.id, 128, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复的设备证据 artifact ${id}。`);
    ids.add(id);
    const artifactPath = assertEvidenceRelativePath(value.path, `${name}.path`);
    if (paths.has(artifactPath)) {
      throw new RangeError(`同一运行不能重复引用 artifact 路径 ${artifactPath}。`);
    }
    paths.add(artifactPath);
    return Object.freeze({
      id,
      kind: enumValue(value.kind, ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND, `${name}.kind`),
      path: artifactPath,
      sha256: assertEvidenceSha256(value.sha256, `${name}.sha256`),
      byteLength: assertIntegerAtLeast(value.byteLength, 1, `${name}.byteLength`),
    });
  });
  const kinds = new Set(artifacts.map(({ kind }) => kind));
  for (const kind of target.requiredArtifactKinds) {
    if (!kinds.has(kind)) {
      throw new RangeError(`target ${target.id} 缺少 ${kind} 证据。`);
    }
  }
  return Object.freeze(artifacts.sort((left, right) => (
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  )));
}

function cloneChecks(values, target, artifacts) {
  if (!Array.isArray(values)) {
    throw new TypeError('ArenaDeviceAcceptanceRecord.checks 必须是数组。');
  }
  const required = new Set(target.requiredCheckIds);
  const artifactIds = new Set(artifacts.map(({ id }) => id));
  const ids = new Set();
  const checks = values.map((value, index) => {
    const name = `ArenaDeviceAcceptanceRecord.checks[${index}]`;
    assertKnownKeys(value, CHECK_KEYS, name);
    const id = boundedString(value.id, 128, `${name}.id`);
    if (!required.has(id)) throw new RangeError(`target ${target.id} 不要求 check ${id}。`);
    if (ids.has(id)) throw new RangeError(`重复的设备验收 check ${id}。`);
    ids.add(id);
    const referencedArtifacts = cloneFrozenStringSet(value.artifactIds, `${name}.artifactIds`);
    if (referencedArtifacts.length === 0) {
      throw new RangeError(`${name}.artifactIds 不能为空。`);
    }
    for (const artifactId of referencedArtifacts) {
      if (!artifactIds.has(artifactId)) {
        throw new RangeError(`${name} 引用未知 artifact ${artifactId}。`);
      }
    }
    return Object.freeze({
      id,
      result: enumValue(value.result, ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT, `${name}.result`),
      notes: boundedString(value.notes, 2_000, `${name}.notes`),
      artifactIds: referencedArtifacts,
    });
  });
  if (ids.size !== required.size || [...required].some((id) => !ids.has(id))) {
    throw new RangeError(`target ${target.id} 必须且只能记录全部 required checks。`);
  }
  return Object.freeze(checks.sort((left, right) => (
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  )));
}

export function createArenaDeviceAcceptanceRecord(definitionValue, value) {
  const definition = createArenaDeviceAcceptanceDefinition(definitionValue);
  const source = cloneFrozenData(value, 'ArenaDeviceAcceptanceRecord');
  assertKnownKeys(source, RECORD_KEYS, 'ArenaDeviceAcceptanceRecord');
  if (source.schemaVersion !== ARENA_DEVICE_ACCEPTANCE_RECORD_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 ArenaDeviceAcceptanceRecord schema ${String(source.schemaVersion)}。`,
    );
  }
  if (source.definitionId !== definition.id) {
    throw new RangeError('ArenaDeviceAcceptanceRecord.definitionId 与当前定义不一致。');
  }
  if (source.definitionHash !== definition.getContentHash()) {
    throw new RangeError('ArenaDeviceAcceptanceRecord.definitionHash 与当前定义不一致。');
  }
  const commit = assertEvidenceGitCommit(
    source.commit,
    'ArenaDeviceAcceptanceRecord.commit',
  );
  const targetId = boundedString(source.targetId, 128, 'ArenaDeviceAcceptanceRecord.targetId');
  const target = definition.getTarget(targetId);
  if (!target) throw new RangeError(`未知设备验收 target ${targetId}。`);
  const artifacts = cloneArtifacts(source.artifacts, target);
  const checks = cloneChecks(source.checks, target, artifacts);
  const referencedArtifactIds = new Set(checks.flatMap(({ artifactIds }) => artifactIds));
  const unreferencedArtifact = artifacts.find(({ id }) => !referencedArtifactIds.has(id));
  if (unreferencedArtifact) {
    throw new RangeError(`artifact ${unreferencedArtifact.id} 未被任何 check 引用。`);
  }
  return Object.freeze({
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_RECORD_SCHEMA_VERSION,
    recordId: boundedString(source.recordId, 128, 'ArenaDeviceAcceptanceRecord.recordId'),
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit,
    buildId: boundedString(source.buildId, 128, 'ArenaDeviceAcceptanceRecord.buildId'),
    targetId,
    runId: boundedString(source.runId, 128, 'ArenaDeviceAcceptanceRecord.runId'),
    performedAt: assertEvidenceUtcInstant(
      source.performedAt,
      'ArenaDeviceAcceptanceRecord.performedAt',
    ),
    operatorId: boundedString(source.operatorId, 128, 'ArenaDeviceAcceptanceRecord.operatorId'),
    client: cloneClient(source.client, target),
    device: cloneDevice(source.device, target),
    orientation: exactValue(
      source.orientation,
      'portrait',
      'ArenaDeviceAcceptanceRecord.orientation',
    ),
    inputMode: exactValue(
      source.inputMode,
      'touch',
      'ArenaDeviceAcceptanceRecord.inputMode',
    ),
    checks,
    artifacts,
  });
}

export function isArenaDeviceAcceptanceRecordPassing(record) {
  return record.checks.every(({ result }) => (
    result === ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT.PASSED
  ));
}
