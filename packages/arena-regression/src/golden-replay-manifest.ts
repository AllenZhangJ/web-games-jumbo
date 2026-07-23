import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_GOLDEN_REPLAY_MANIFEST_SCHEMA_VERSION = 1;
export const ARENA_GOLDEN_REPLAY_MAXIMUM_ENTRIES = 256;
export const ARENA_GOLDEN_REPLAY_CATEGORY = Object.freeze({
  EQUIPMENT: 'equipment', MAP: 'map', MOVEMENT: 'movement', LIFECYCLE: 'lifecycle', REGRESSION: 'regression',
} as const);
export type ArenaGoldenReplayCategory =
  typeof ARENA_GOLDEN_REPLAY_CATEGORY[keyof typeof ARENA_GOLDEN_REPLAY_CATEGORY];

const MANIFEST_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion', 'id', 'replaySchemaVersion', 'rejectedReplaySchemaVersions', 'entries',
]);
const ENTRY_KEYS: ReadonlySet<string> = new Set([
  'id', 'category', 'file', 'scenario', 'replayHash', 'matchSeed', 'matchSchemaVersion',
  'physicsBackendVersion', 'configHash', 'ruleContentHash', 'finalHash', 'endedAtTick',
  'resultReason', 'winnerId', 'inputFrameCount', 'checkpointCount', 'eventCounts',
]);
const SCENARIO_KEYS: ReadonlySet<string> = new Set(['id', 'version']);
const HASH_PATTERN = /^[0-9a-f]{8}$/;
const ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const FILE_PATTERN = /^(?:equipment|map|movement|lifecycle|regression)-[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;
const CATEGORIES: ReadonlySet<unknown> = new Set(Object.values(ARENA_GOLDEN_REPLAY_CATEGORY));

export interface ArenaGoldenReplayManifestEntry {
  readonly id: string;
  readonly category: ArenaGoldenReplayCategory;
  readonly file: string;
  readonly scenario: { readonly id: string; readonly version: number };
  readonly replayHash: string;
  readonly matchSeed: number;
  readonly matchSchemaVersion: number;
  readonly physicsBackendVersion: string;
  readonly configHash: string;
  readonly ruleContentHash: string;
  readonly finalHash: string;
  readonly endedAtTick: number;
  readonly resultReason: string;
  readonly winnerId: string | null;
  readonly inputFrameCount: number;
  readonly checkpointCount: number;
  readonly eventCounts: Readonly<Record<string, number>>;
}
export interface ArenaGoldenReplayManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly replaySchemaVersion: number;
  readonly rejectedReplaySchemaVersions: readonly number[];
  readonly entries: readonly Readonly<ArenaGoldenReplayManifestEntry>[];
}

function stableId(value: unknown, name: string): string {
  const id = assertNonEmptyString(value, name);
  if (!ID_PATTERN.test(id)) throw new RangeError(`${name} 格式无效。`);
  return id;
}
function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 8 位小写十六进制 hash。`);
  }
  return value;
}
function cloneScenario(value: unknown, name: string) {
  assertKnownKeys(value, SCENARIO_KEYS, name);
  return Object.freeze({
    id: stableId(value.id, `${name}.id`),
    version: assertIntegerAtLeast(value.version, 1, `${name}.version`),
  });
}
function cloneEventCounts(value: unknown, name: string): Readonly<Record<string, number>> {
  const source = assertPlainRecord(cloneFrozenData(value, name), name);
  const entries = Object.entries(source).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  if (entries.length === 0) throw new RangeError(`${name} 不能为空。`);
  return Object.freeze(Object.fromEntries(entries.map(([type, count]) => [
    assertNonEmptyString(type, `${name} event type`),
    assertIntegerAtLeast(count, 0, `${name}.${type}`),
  ])));
}
function cloneEntry(value: unknown, index: number): Readonly<ArenaGoldenReplayManifestEntry> {
  const name = `ArenaGoldenReplayManifest.entries[${index}]`;
  assertKnownKeys(value, ENTRY_KEYS, name);
  if (!CATEGORIES.has(value.category)) {
    throw new RangeError(`${name}.category 不受支持：${String(value.category)}。`);
  }
  const category = value.category as ArenaGoldenReplayCategory;
  const file = assertNonEmptyString(value.file, `${name}.file`);
  if (!FILE_PATTERN.test(file) || !file.startsWith(`${category}-`)) {
    throw new RangeError(`${name}.file 必须是与 category 一致的安全 JSON 文件名。`);
  }
  return Object.freeze({
    id: stableId(value.id, `${name}.id`),
    category,
    file,
    scenario: cloneScenario(value.scenario, `${name}.scenario`),
    replayHash: hash(value.replayHash, `${name}.replayHash`),
    matchSeed: assertIntegerAtLeast(value.matchSeed, 0, `${name}.matchSeed`),
    matchSchemaVersion: assertIntegerAtLeast(value.matchSchemaVersion, 1, `${name}.matchSchemaVersion`),
    physicsBackendVersion: assertNonEmptyString(value.physicsBackendVersion, `${name}.physicsBackendVersion`),
    configHash: hash(value.configHash, `${name}.configHash`),
    ruleContentHash: hash(value.ruleContentHash, `${name}.ruleContentHash`),
    finalHash: hash(value.finalHash, `${name}.finalHash`),
    endedAtTick: assertIntegerAtLeast(value.endedAtTick, 1, `${name}.endedAtTick`),
    resultReason: assertNonEmptyString(value.resultReason, `${name}.resultReason`),
    winnerId: value.winnerId === null ? null : assertNonEmptyString(value.winnerId, `${name}.winnerId`),
    inputFrameCount: assertIntegerAtLeast(value.inputFrameCount, 1, `${name}.inputFrameCount`),
    checkpointCount: assertIntegerAtLeast(value.checkpointCount, 2, `${name}.checkpointCount`),
    eventCounts: cloneEventCounts(value.eventCounts, `${name}.eventCounts`),
  });
}
function cloneRejectedVersions(value: unknown, replaySchemaVersion: number): readonly number[] {
  if (!Array.isArray(value)) {
    throw new TypeError('ArenaGoldenReplayManifest.rejectedReplaySchemaVersions 必须是数组。');
  }
  const result = value.map((version, index) => assertIntegerAtLeast(
    version, 1, `ArenaGoldenReplayManifest.rejectedReplaySchemaVersions[${index}]`,
  ));
  let previous: number | undefined;
  for (const version of result) {
    if (version === replaySchemaVersion) {
      throw new RangeError('rejectedReplaySchemaVersions 不能包含当前语料 replay schema。');
    }
    if (previous !== undefined && version <= previous) {
      throw new RangeError('rejectedReplaySchemaVersions 必须严格递增且不重复。');
    }
    previous = version;
  }
  return Object.freeze(result);
}

export function createArenaGoldenReplayManifest(value: unknown): Readonly<ArenaGoldenReplayManifest> {
  const source = cloneFrozenData(value, 'ArenaGoldenReplayManifest');
  assertKnownKeys(source, MANIFEST_KEYS, 'ArenaGoldenReplayManifest');
  if (source.schemaVersion !== ARENA_GOLDEN_REPLAY_MANIFEST_SCHEMA_VERSION) {
    throw new RangeError(`不支持 ArenaGoldenReplayManifest schema ${String(source.schemaVersion)}。`);
  }
  const replaySchemaVersion = assertIntegerAtLeast(
    source.replaySchemaVersion, 1, 'ArenaGoldenReplayManifest.replaySchemaVersion',
  );
  if (!Array.isArray(source.entries) || source.entries.length === 0) {
    throw new RangeError('ArenaGoldenReplayManifest.entries 必须是非空数组。');
  }
  if (source.entries.length > ARENA_GOLDEN_REPLAY_MAXIMUM_ENTRIES) {
    throw new RangeError(`ArenaGoldenReplayManifest.entries 不能超过 ${ARENA_GOLDEN_REPLAY_MAXIMUM_ENTRIES} 项。`);
  }
  const entries = source.entries.map(cloneEntry);
  const ids = new Set<string>();
  const files = new Set<string>();
  let previousId: string | undefined;
  for (const entry of entries) {
    if (entry.matchSeed > 0xffffffff) throw new RangeError(`黄金回放 ${entry.id}.matchSeed 必须是 uint32。`);
    if (ids.has(entry.id)) throw new RangeError(`黄金回放包含重复 id ${entry.id}。`);
    if (files.has(entry.file)) throw new RangeError(`黄金回放包含重复 file ${entry.file}。`);
    if (previousId !== undefined && entry.id <= previousId) {
      throw new RangeError('黄金回放 entries 必须按 id 严格递增。');
    }
    ids.add(entry.id);
    files.add(entry.file);
    previousId = entry.id;
  }
  return Object.freeze({
    schemaVersion: 1,
    id: stableId(source.id, 'ArenaGoldenReplayManifest.id'),
    replaySchemaVersion,
    rejectedReplaySchemaVersions: cloneRejectedVersions(source.rejectedReplaySchemaVersions, replaySchemaVersion),
    entries: Object.freeze(entries),
  });
}
