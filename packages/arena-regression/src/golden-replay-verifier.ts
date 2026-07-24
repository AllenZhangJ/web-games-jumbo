import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_REPLAY_ERROR_CODE,
  ARENA_REPLAY_SCHEMA_VERSION,
  createReplayMatch,
  type ReplayCoreFactory,
} from '@number-strategy-jump/arena-match';
import {
  createArenaGoldenReplayManifest,
  type ArenaGoldenReplayManifest,
  type ArenaGoldenReplayManifestEntry,
} from './golden-replay-manifest.js';
import {
  ArenaGoldenReplayScenarioRegistry,
  type ArenaGoldenReplayScenarioEntry,
} from './golden-replay-scenario-registry.js';

export const ARENA_GOLDEN_REPLAY_VERIFICATION_SCHEMA_VERSION = 1;
const replayMatch = createReplayMatch(() => {
  throw new Error('黄金回放验证必须显式注入 coreFactory。');
});

interface ReplayResultData {
  readonly endedAtTick: number;
  readonly reason: string;
  readonly winnerId: string | null;
}
interface ReplayData extends Record<string, unknown> {
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly schemaVersion: number;
  readonly physicsBackendVersion: string;
  readonly configHash: string;
  readonly ruleContentHash: string;
  readonly finalHash: string;
  readonly result: ReplayResultData;
  readonly inputFrames: readonly unknown[];
  readonly checkpoints: readonly unknown[];
  readonly events: readonly { readonly type: string }[];
}

function cloneReplay(value: unknown, name: string): ReplayData {
  const replay = assertPlainRecord(cloneFrozenData(value, name), name);
  const result = assertPlainRecord(replay.result, `${name}.result`);
  if (!Number.isSafeInteger(result.endedAtTick)) throw new TypeError(`${name} 缺少完整 result。`);
  if (!Array.isArray(replay.inputFrames) || !Array.isArray(replay.checkpoints) || !Array.isArray(replay.events)) {
    throw new TypeError(`${name} 缺少回放数组。`);
  }
  return replay as unknown as ReplayData;
}
function countEvents(events: readonly { readonly type: string }[]): Readonly<Record<string, number>> {
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
  return Object.freeze(Object.fromEntries([...counts.entries()].sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  ))));
}
function assertSameData(actual: unknown, expected: unknown, name: string): void {
  if (
    createDeterministicDataHash(actual, `${name} actual`)
    !== createDeterministicDataHash(expected, `${name} expected`)
  ) throw new Error(`${name} 与 Manifest 不一致。`);
}

export function createArenaGoldenReplayManifestEntry(
  scenario: Pick<ArenaGoldenReplayScenarioEntry, 'id' | 'version' | 'category' | 'file'>,
  replayValue: unknown,
): Readonly<ArenaGoldenReplayManifestEntry> {
  const replay = cloneReplay(replayValue, `黄金回放场景 ${scenario.id}`);
  return Object.freeze({
    id: scenario.id,
    category: scenario.category,
    file: scenario.file,
    scenario: Object.freeze({ id: scenario.id, version: scenario.version }),
    replayHash: createDeterministicDataHash(replay, `黄金回放 ${scenario.id}`),
    matchSeed: replay.matchSeed,
    matchSchemaVersion: replay.schemaVersion,
    physicsBackendVersion: replay.physicsBackendVersion,
    configHash: replay.configHash,
    ruleContentHash: replay.ruleContentHash,
    finalHash: replay.finalHash,
    endedAtTick: replay.result.endedAtTick,
    resultReason: replay.result.reason,
    winnerId: replay.result.winnerId,
    inputFrameCount: replay.inputFrames.length,
    checkpointCount: replay.checkpoints.length,
    eventCounts: countEvents(replay.events),
  });
}
function assertEntryMatchesReplay(
  entry: Readonly<ArenaGoldenReplayManifestEntry>,
  replay: unknown,
  name: string,
): void {
  const actual = createArenaGoldenReplayManifestEntry({
    id: entry.id,
    version: entry.scenario.version,
    category: entry.category,
    file: entry.file,
  }, replay);
  assertSameData(actual, entry, name);
}
function cloneFixtureMap(fixturesValue: unknown): Map<string, ReplayData> {
  if (!Array.isArray(fixturesValue)) throw new TypeError('黄金回放 fixtures 必须是数组。');
  const fixtures = new Map<string, ReplayData>();
  fixturesValue.forEach((value, index) => {
    const name = `黄金回放 fixtures[${index}]`;
    const fixture = assertPlainRecord(value, name);
    if (typeof fixture.file !== 'string' || fixture.file.length === 0) {
      throw new TypeError(`${name}.file 必须是非空字符串。`);
    }
    if (fixtures.has(fixture.file)) throw new RangeError(`黄金回放 fixture 重复 ${fixture.file}。`);
    fixtures.set(fixture.file, cloneReplay(fixture.replay, `黄金回放 ${fixture.file}`));
  });
  return fixtures;
}
function assertCurrentScenarioCoverage(
  manifest: Readonly<ArenaGoldenReplayManifest>,
  scenarioRegistry: ArenaGoldenReplayScenarioRegistry,
): void {
  const registered = scenarioRegistry.list();
  if (registered.length !== manifest.entries.length) {
    throw new RangeError(`当前黄金回放场景覆盖不完整：Manifest ${manifest.entries.length}，Registry ${registered.length}。`);
  }
  for (let index = 0; index < registered.length; index += 1) {
    const scenario = registered[index];
    const entry = manifest.entries[index];
    if (!scenario || !entry || scenario.id !== entry.scenario.id || scenario.version !== entry.scenario.version
      || scenario.category !== entry.category || scenario.file !== entry.file) {
      throw new Error(`当前黄金回放场景 ${scenario?.id ?? 'missing'} 未与 Manifest 条目 ${entry?.id ?? 'missing'} 完全对齐。`);
    }
  }
}
function assertUnsupportedBeforeCore(
  replay: unknown,
  replaySchemaVersion: number,
  coreFactory: ReplayCoreFactory,
): void {
  let factoryCalls = 0;
  let failure: unknown = null;
  try {
    replayMatch({ ...(replay as Record<string, unknown>), replaySchemaVersion }, {
      coreFactory(options) {
        factoryCalls += 1;
        return coreFactory(options);
      },
    });
  } catch (error) {
    failure = error;
  }
  if (
    !failure || typeof failure !== 'object'
    || !('code' in failure) || failure.code !== ARENA_REPLAY_ERROR_CODE.UNSUPPORTED_SCHEMA
  ) throw new Error(`Replay schema ${replaySchemaVersion} 未以稳定兼容错误拒绝。`);
  if (factoryCalls !== 0) throw new Error(`Replay schema ${replaySchemaVersion} 在拒绝前错误创建了 Core。`);
}

export function verifyArenaGoldenReplayCorpus(options: unknown) {
  assertKnownKeys(
    options,
    new Set(['manifest', 'fixtures', 'scenarioRegistry', 'coreFactory']),
    '黄金回放验证 options',
  );
  const manifest = createArenaGoldenReplayManifest(options.manifest);
  if (!(options.scenarioRegistry instanceof ArenaGoldenReplayScenarioRegistry)) {
    throw new TypeError('黄金回放验证需要 ArenaGoldenReplayScenarioRegistry。');
  }
  if (typeof options.coreFactory !== 'function') throw new TypeError('黄金回放验证需要 coreFactory。');
  const coreFactory = options.coreFactory as ReplayCoreFactory;
  const fixtures = cloneFixtureMap(options.fixtures);
  if (fixtures.size !== manifest.entries.length) {
    throw new RangeError('黄金回放 fixture 数量与 Manifest 不一致。');
  }
  const current = manifest.replaySchemaVersion === ARENA_REPLAY_SCHEMA_VERSION;
  if (current) assertCurrentScenarioCoverage(manifest, options.scenarioRegistry);
  const verified: Readonly<{ id: string; replayHash: string; finalHash: string }>[] = [];
  for (const entry of manifest.entries) {
    const replay = fixtures.get(entry.file);
    if (!replay) throw new RangeError(`黄金回放缺少 ${entry.file}。`);
    fixtures.delete(entry.file);
    assertEntryMatchesReplay(entry, replay, `黄金回放 ${entry.id}`);
    if (replay.replaySchemaVersion !== manifest.replaySchemaVersion) {
      throw new RangeError(`黄金回放 ${entry.id} schema 与 Manifest 不一致。`);
    }
    if (current) {
      const scenario = options.scenarioRegistry.require(entry.scenario);
      if (scenario.category !== entry.category || scenario.file !== entry.file) {
        throw new Error(`黄金回放场景 ${entry.id} 的 category/file 漂移。`);
      }
      scenario.assertReplay(replay);
      const replayed = replayMatch(replay, { coreFactory });
      if (replayed.finalHash !== entry.finalHash) throw new Error(`黄金回放 ${entry.id} 重放 final hash 漂移。`);
      const regenerated = scenario.createReplay();
      scenario.assertReplay(regenerated);
      assertEntryMatchesReplay(entry, regenerated, `黄金回放 ${entry.id} 再生成`);
    } else {
      assertUnsupportedBeforeCore(replay, manifest.replaySchemaVersion, coreFactory);
    }
    verified.push(Object.freeze({ id: entry.id, replayHash: entry.replayHash, finalHash: entry.finalHash }));
  }
  if (fixtures.size !== 0) throw new RangeError('黄金回放包含 Manifest 未登记的 fixture。');
  if (current) {
    const firstEntry = manifest.entries[0];
    if (!firstEntry) throw new Error('黄金回放 Manifest 不能为空。');
    const firstReplay = cloneFixtureMap(options.fixtures).get(firstEntry.file);
    for (const version of manifest.rejectedReplaySchemaVersions) {
      assertUnsupportedBeforeCore(firstReplay, version, coreFactory);
    }
  }
  return cloneFrozenData({
    schemaVersion: ARENA_GOLDEN_REPLAY_VERIFICATION_SCHEMA_VERSION,
    manifestId: manifest.id,
    manifestHash: createDeterministicDataHash(manifest, `黄金回放 Manifest ${manifest.id}`),
    replaySchemaVersion: manifest.replaySchemaVersion,
    mode: current ? 'current-strict-replay-and-regeneration' : 'historical-explicit-rejection',
    verifiedEntryCount: verified.length,
    rejectedReplaySchemaVersions: current ? manifest.rejectedReplaySchemaVersions : [manifest.replaySchemaVersion],
    entries: verified,
  }, 'ArenaGoldenReplayVerification');
}
