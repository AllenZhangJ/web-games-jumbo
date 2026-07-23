import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_REPLAY_ERROR_CODE,
  ARENA_REPLAY_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-match';
import { replayMatch } from '../replay.js';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { createArenaGoldenReplayManifest } from '@number-strategy-jump/arena-regression';
import { ArenaGoldenReplayScenarioRegistry } from './golden-replay-scenario-registry.js';

export const ARENA_GOLDEN_REPLAY_VERIFICATION_SCHEMA_VERSION = 1;

function countEvents(events) {
  const counts = new Map();
  for (const event of events) counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
  return Object.freeze(Object.fromEntries([...counts.entries()].sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  ))));
}

function assertSameData(actual, expected, name) {
  if (
    createDeterministicDataHash(actual, `${name} actual`)
    !== createDeterministicDataHash(expected, `${name} expected`)
  ) throw new Error(`${name} 与 Manifest 不一致。`);
}

export function createArenaGoldenReplayManifestEntry(scenario, replayValue) {
  const replay = cloneFrozenData(replayValue, `黄金回放场景 ${scenario.id}`);
  if (!replay.result || !Number.isSafeInteger(replay.result.endedAtTick)) {
    throw new TypeError(`黄金回放场景 ${scenario.id} 缺少完整 result。`);
  }
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

function assertEntryMatchesReplay(entry, replay, name) {
  const actual = createArenaGoldenReplayManifestEntry({
    id: entry.id,
    version: entry.scenario.version,
    category: entry.category,
    file: entry.file,
  }, replay);
  assertSameData(actual, entry, name);
}

function cloneFixtureMap(fixturesValue) {
  if (!Array.isArray(fixturesValue)) throw new TypeError('黄金回放 fixtures 必须是数组。');
  const fixtures = new Map();
  fixturesValue.forEach((value, index) => {
    if (!value || typeof value !== 'object') {
      throw new TypeError(`黄金回放 fixtures[${index}] 必须是对象。`);
    }
    if (typeof value.file !== 'string' || value.file.length === 0) {
      throw new TypeError(`黄金回放 fixtures[${index}].file 必须是非空字符串。`);
    }
    if (fixtures.has(value.file)) throw new RangeError(`黄金回放 fixture 重复 ${value.file}。`);
    fixtures.set(value.file, cloneFrozenData(value.replay, `黄金回放 ${value.file}`));
  });
  return fixtures;
}

function assertCurrentScenarioCoverage(manifest, scenarioRegistry) {
  const registered = scenarioRegistry.list();
  if (registered.length !== manifest.entries.length) {
    throw new RangeError(
      `当前黄金回放场景覆盖不完整：Manifest ${manifest.entries.length}，`
      + `Registry ${registered.length}。`,
    );
  }
  for (let index = 0; index < registered.length; index += 1) {
    const scenario = registered[index];
    const entry = manifest.entries[index];
    if (
      scenario.id !== entry.scenario.id
      || scenario.version !== entry.scenario.version
      || scenario.category !== entry.category
      || scenario.file !== entry.file
    ) {
      throw new Error(
        `当前黄金回放场景 ${scenario.id} 未与 Manifest 条目 ${entry.id} 完全对齐。`,
      );
    }
  }
}

function assertUnsupportedBeforeCore(replay, replaySchemaVersion, coreFactory) {
  let factoryCalls = 0;
  let failure = null;
  try {
    replayMatch({ ...replay, replaySchemaVersion }, {
      coreFactory(options) {
        factoryCalls += 1;
        return coreFactory(options);
      },
    });
  } catch (error) {
    failure = error;
  }
  if (!failure || failure.code !== ARENA_REPLAY_ERROR_CODE.UNSUPPORTED_SCHEMA) {
    throw new Error(`Replay schema ${replaySchemaVersion} 未以稳定兼容错误拒绝。`);
  }
  if (factoryCalls !== 0) {
    throw new Error(`Replay schema ${replaySchemaVersion} 在拒绝前错误创建了 Core。`);
  }
}

export function verifyArenaGoldenReplayCorpus({
  manifest: manifestValue,
  fixtures: fixturesValue,
  scenarioRegistry,
  coreFactory,
}) {
  const manifest = createArenaGoldenReplayManifest(manifestValue);
  if (!(scenarioRegistry instanceof ArenaGoldenReplayScenarioRegistry)) {
    throw new TypeError('黄金回放验证需要 ArenaGoldenReplayScenarioRegistry。');
  }
  if (typeof coreFactory !== 'function') throw new TypeError('黄金回放验证需要 coreFactory。');
  const fixtures = cloneFixtureMap(fixturesValue);
  if (fixtures.size !== manifest.entries.length) {
    throw new RangeError('黄金回放 fixture 数量与 Manifest 不一致。');
  }
  const current = manifest.replaySchemaVersion === ARENA_REPLAY_SCHEMA_VERSION;
  if (current) assertCurrentScenarioCoverage(manifest, scenarioRegistry);
  const verified = [];
  for (const entry of manifest.entries) {
    const replay = fixtures.get(entry.file);
    if (!replay) throw new RangeError(`黄金回放缺少 ${entry.file}。`);
    fixtures.delete(entry.file);
    assertEntryMatchesReplay(entry, replay, `黄金回放 ${entry.id}`);
    if (replay.replaySchemaVersion !== manifest.replaySchemaVersion) {
      throw new RangeError(`黄金回放 ${entry.id} schema 与 Manifest 不一致。`);
    }
    if (current) {
      const scenario = scenarioRegistry.require(entry.scenario);
      if (scenario.category !== entry.category || scenario.file !== entry.file) {
        throw new Error(`黄金回放场景 ${entry.id} 的 category/file 漂移。`);
      }
      scenario.assertReplay(replay);
      const replayed = replayMatch(replay, { coreFactory });
      if (replayed.finalHash !== entry.finalHash) {
        throw new Error(`黄金回放 ${entry.id} 重放 final hash 漂移。`);
      }
      const regenerated = scenario.createReplay();
      scenario.assertReplay(regenerated);
      assertEntryMatchesReplay(entry, regenerated, `黄金回放 ${entry.id} 再生成`);
    } else {
      assertUnsupportedBeforeCore(replay, manifest.replaySchemaVersion, coreFactory);
    }
    verified.push(Object.freeze({
      id: entry.id,
      replayHash: entry.replayHash,
      finalHash: entry.finalHash,
    }));
  }
  if (fixtures.size !== 0) throw new RangeError('黄金回放包含 Manifest 未登记的 fixture。');
  if (current) {
    const firstReplay = cloneFixtureMap(fixturesValue).get(manifest.entries[0].file);
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
    rejectedReplaySchemaVersions: current
      ? manifest.rejectedReplaySchemaVersions
      : [manifest.replaySchemaVersion],
    entries: verified,
  }, 'ArenaGoldenReplayVerification');
}
