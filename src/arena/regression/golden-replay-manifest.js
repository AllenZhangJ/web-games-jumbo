import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';

export const ARENA_GOLDEN_REPLAY_MANIFEST_SCHEMA_VERSION = 1;
export const ARENA_GOLDEN_REPLAY_MAXIMUM_ENTRIES = 256;
export const ARENA_GOLDEN_REPLAY_CATEGORY = Object.freeze({
  EQUIPMENT: 'equipment',
  MAP: 'map',
  MOVEMENT: 'movement',
  LIFECYCLE: 'lifecycle',
  REGRESSION: 'regression',
});

const MANIFEST_KEYS = new Set([
  'schemaVersion',
  'id',
  'replaySchemaVersion',
  'rejectedReplaySchemaVersions',
  'entries',
]);
const ENTRY_KEYS = new Set([
  'id',
  'category',
  'file',
  'scenario',
  'replayHash',
  'matchSeed',
  'matchSchemaVersion',
  'physicsBackendVersion',
  'configHash',
  'ruleContentHash',
  'finalHash',
  'endedAtTick',
  'resultReason',
  'winnerId',
  'inputFrameCount',
  'checkpointCount',
  'eventCounts',
]);
const SCENARIO_KEYS = new Set(['id', 'version']);
const HASH_PATTERN = /^[0-9a-f]{8}$/;
const ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const FILE_PATTERN = /^(?:equipment|map|movement|lifecycle|regression)-[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;
const CATEGORIES = new Set(Object.values(ARENA_GOLDEN_REPLAY_CATEGORY));

function stableId(value, name) {
  const id = assertNonEmptyString(value, name);
  if (!ID_PATTERN.test(id)) throw new RangeError(`${name} 格式无效。`);
  return id;
}

function hash(value, name) {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 8 位小写十六进制 hash。`);
  }
  return value;
}

function cloneScenario(value, name) {
  assertKnownKeys(value, SCENARIO_KEYS, name);
  return Object.freeze({
    id: stableId(value.id, `${name}.id`),
    version: assertIntegerAtLeast(value.version, 1, `${name}.version`),
  });
}

function cloneEventCounts(value, name) {
  const source = cloneFrozenData(value, name);
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const entries = Object.entries(source).sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  ));
  if (entries.length === 0) throw new RangeError(`${name} 不能为空。`);
  return Object.freeze(Object.fromEntries(entries.map(([type, count]) => [
    assertNonEmptyString(type, `${name} event type`),
    assertIntegerAtLeast(count, 0, `${name}.${type}`),
  ])));
}

function cloneEntry(value, index) {
  const name = `ArenaGoldenReplayManifest.entries[${index}]`;
  assertKnownKeys(value, ENTRY_KEYS, name);
  const category = value.category;
  if (!CATEGORIES.has(category)) {
    throw new RangeError(`${name}.category 不受支持：${String(category)}。`);
  }
  const file = assertNonEmptyString(value.file, `${name}.file`);
  if (!FILE_PATTERN.test(file) || !file.startsWith(`${category}-`)) {
    throw new RangeError(`${name}.file 必须是与 category 一致的安全 JSON 文件名。`);
  }
  const winnerId = value.winnerId === null
    ? null
    : assertNonEmptyString(value.winnerId, `${name}.winnerId`);
  return Object.freeze({
    id: stableId(value.id, `${name}.id`),
    category,
    file,
    scenario: cloneScenario(value.scenario, `${name}.scenario`),
    replayHash: hash(value.replayHash, `${name}.replayHash`),
    matchSeed: assertIntegerAtLeast(value.matchSeed, 0, `${name}.matchSeed`),
    matchSchemaVersion: assertIntegerAtLeast(
      value.matchSchemaVersion,
      1,
      `${name}.matchSchemaVersion`,
    ),
    physicsBackendVersion: assertNonEmptyString(
      value.physicsBackendVersion,
      `${name}.physicsBackendVersion`,
    ),
    configHash: hash(value.configHash, `${name}.configHash`),
    ruleContentHash: hash(value.ruleContentHash, `${name}.ruleContentHash`),
    finalHash: hash(value.finalHash, `${name}.finalHash`),
    endedAtTick: assertIntegerAtLeast(value.endedAtTick, 1, `${name}.endedAtTick`),
    resultReason: assertNonEmptyString(value.resultReason, `${name}.resultReason`),
    winnerId,
    inputFrameCount: assertIntegerAtLeast(
      value.inputFrameCount,
      1,
      `${name}.inputFrameCount`,
    ),
    checkpointCount: assertIntegerAtLeast(
      value.checkpointCount,
      2,
      `${name}.checkpointCount`,
    ),
    eventCounts: cloneEventCounts(value.eventCounts, `${name}.eventCounts`),
  });
}

function cloneRejectedVersions(value, replaySchemaVersion) {
  if (!Array.isArray(value)) {
    throw new TypeError('ArenaGoldenReplayManifest.rejectedReplaySchemaVersions 必须是数组。');
  }
  const result = value.map((version, index) => assertIntegerAtLeast(
    version,
    1,
    `ArenaGoldenReplayManifest.rejectedReplaySchemaVersions[${index}]`,
  ));
  for (let index = 0; index < result.length; index += 1) {
    if (result[index] === replaySchemaVersion) {
      throw new RangeError('rejectedReplaySchemaVersions 不能包含当前语料 replay schema。');
    }
    if (index > 0 && result[index] <= result[index - 1]) {
      throw new RangeError('rejectedReplaySchemaVersions 必须严格递增且不重复。');
    }
  }
  return Object.freeze(result);
}

export function createArenaGoldenReplayManifest(value) {
  const source = cloneFrozenData(value, 'ArenaGoldenReplayManifest');
  assertKnownKeys(source, MANIFEST_KEYS, 'ArenaGoldenReplayManifest');
  if (source.schemaVersion !== ARENA_GOLDEN_REPLAY_MANIFEST_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 ArenaGoldenReplayManifest schema ${String(source.schemaVersion)}。`,
    );
  }
  const replaySchemaVersion = assertIntegerAtLeast(
    source.replaySchemaVersion,
    1,
    'ArenaGoldenReplayManifest.replaySchemaVersion',
  );
  if (!Array.isArray(source.entries) || source.entries.length === 0) {
    throw new RangeError('ArenaGoldenReplayManifest.entries 必须是非空数组。');
  }
  if (source.entries.length > ARENA_GOLDEN_REPLAY_MAXIMUM_ENTRIES) {
    throw new RangeError(
      `ArenaGoldenReplayManifest.entries 不能超过 ${ARENA_GOLDEN_REPLAY_MAXIMUM_ENTRIES} 项。`,
    );
  }
  const entries = source.entries.map(cloneEntry);
  const ids = new Set();
  const files = new Set();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.matchSeed > 0xffffffff) {
      throw new RangeError(`黄金回放 ${entry.id}.matchSeed 必须是 uint32。`);
    }
    if (ids.has(entry.id)) throw new RangeError(`黄金回放包含重复 id ${entry.id}。`);
    if (files.has(entry.file)) throw new RangeError(`黄金回放包含重复 file ${entry.file}。`);
    if (index > 0 && entry.id <= entries[index - 1].id) {
      throw new RangeError('黄金回放 entries 必须按 id 严格递增。');
    }
    ids.add(entry.id);
    files.add(entry.file);
  }
  return Object.freeze({
    schemaVersion: ARENA_GOLDEN_REPLAY_MANIFEST_SCHEMA_VERSION,
    id: stableId(source.id, 'ArenaGoldenReplayManifest.id'),
    replaySchemaVersion,
    rejectedReplaySchemaVersions: cloneRejectedVersions(
      source.rejectedReplaySchemaVersions,
      replaySchemaVersion,
    ),
    entries: Object.freeze(entries),
  });
}
