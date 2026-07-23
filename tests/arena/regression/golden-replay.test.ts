import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_REPLAY_ERROR_CODE,
  ARENA_REPLAY_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-match';
import { replayMatch } from '../../../src/arena/replay.js';
import {
  createArenaV1GoldenReplayScenarioRegistry,
} from '@number-strategy-jump/arena-regression';
import {
  createArenaGoldenReplayManifest,
} from '@number-strategy-jump/arena-regression';
import {
  ArenaGoldenReplayScenarioRegistry,
} from '@number-strategy-jump/arena-regression';
import {
  verifyArenaGoldenReplayCorpus,
} from '@number-strategy-jump/arena-regression';
import {
  ARENA_INPUT_FUZZ_RUNNER_ID,
  ARENA_INPUT_FUZZ_RUNNER_VERSION,
  createArenaInputFuzzFailureCandidate,
  createArenaInputFuzzRegressionCandidate,
} from '@number-strategy-jump/arena-regression';

const fixtureDirectory = path.resolve(
  `tests/arena/fixtures/replays/v${ARENA_REPLAY_SCHEMA_VERSION}`,
);

interface RawManifestEntry {
  id: string;
  file: string;
  replayHash: string;
}

interface RawManifest extends Record<string, unknown> {
  entries: RawManifestEntry[];
}

interface RawFixture {
  file: string;
  replay: Record<string, unknown>;
}

function required<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) throw new Error(`测试缺少 ${name}。`);
  return value;
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, 'utf8')) as unknown;
}

async function readCorpus(): Promise<{ manifest: RawManifest; fixtures: RawFixture[] }> {
  const manifestValue = record(
    await readJson(path.join(fixtureDirectory, 'manifest.json')),
    'golden replay manifest',
  );
  if (!Array.isArray(manifestValue.entries)) throw new TypeError('manifest.entries 必须是数组。');
  const manifest = manifestValue as RawManifest;
  const fixtures = await Promise.all(manifest.entries.map(async ({ file }) => ({
    file,
    replay: record(await readJson(path.join(fixtureDirectory, file)), `replay ${file}`),
  })));
  return { manifest, fixtures };
}

test('committed Replay V5 corpus strictly replays and regenerates every registered scenario', async () => {
  const corpus = await readCorpus();
  const report = verifyArenaGoldenReplayCorpus({
    ...corpus,
    scenarioRegistry: createArenaV1GoldenReplayScenarioRegistry(),
    coreFactory: createArenaV1MatchCore,
  });
  assert.equal(report.mode, 'current-strict-replay-and-regeneration');
  assert.equal(report.manifestId, 'arena.stage9.golden-replays.v5');
  assert.equal(report.manifestHash, '0dace228');
  assert.equal(report.verifiedEntryCount, 4);
  assert.deepEqual(report.rejectedReplaySchemaVersions, [4]);
  assert.deepEqual(report.entries.map(({ id }) => id), [
    'equipment.scripted-pressure',
    'lifecycle.quick-match-pause-resume',
    'map.first-wind-cycle',
    'movement.semantic-actions',
  ]);
});

test('golden replay manifest rejects traversal, duplicate identities and silent hash updates', async () => {
  const corpus = await readCorpus();
  const traversal = structuredClone(corpus.manifest);
  required(traversal.entries[0], '首个 manifest entry').file = '../equipment.json';
  assert.throws(() => createArenaGoldenReplayManifest(traversal), /安全 JSON 文件名/);

  const duplicate = structuredClone(corpus.manifest);
  required(duplicate.entries[1], '第二个 manifest entry').id = required(
    duplicate.entries[0],
    '首个 manifest entry',
  ).id;
  assert.throws(() => createArenaGoldenReplayManifest(duplicate), /重复 id|严格递增/);

  const tamperedManifest = structuredClone(corpus.manifest);
  required(tamperedManifest.entries[0], '首个 manifest entry').replayHash = '00000000';
  assert.throws(() => verifyArenaGoldenReplayCorpus({
    manifest: tamperedManifest,
    fixtures: corpus.fixtures,
    scenarioRegistry: createArenaV1GoldenReplayScenarioRegistry(),
    coreFactory: createArenaV1MatchCore,
  }), /与 Manifest 不一致/);

  assert.throws(() => verifyArenaGoldenReplayCorpus({
    manifest: corpus.manifest,
    fixtures: [...corpus.fixtures, required(corpus.fixtures[0], '首个 replay fixture')],
    scenarioRegistry: createArenaV1GoldenReplayScenarioRegistry(),
    coreFactory: createArenaV1MatchCore,
  }), /fixture 重复/);
});

test('scenario registry requires unique stable identities and exact versions', () => {
  const entry = {
    id: 'test.scenario',
    version: 1,
    category: 'regression',
    file: 'regression-test.json',
    createReplay() { return {}; },
    assertReplay() {},
  };
  assert.throws(() => new ArenaGoldenReplayScenarioRegistry([entry, entry]), /重复 id/);
  const registry = new ArenaGoldenReplayScenarioRegistry([entry]);
  assert.throws(() => registry.require({ id: entry.id, version: 2 }), /版本 1/);
  assert.throws(() => registry.require({ id: 'unknown', version: 1 }), /未知/);
  assert.throws(() => new ArenaGoldenReplayScenarioRegistry([{
    ...entry,
    id: 'unsafe scenario',
  }]), /id 格式无效/);
  assert.throws(() => new ArenaGoldenReplayScenarioRegistry([{
    ...entry,
    file: 'regression-unsafe name.json',
  }]), /安全的 category JSON 文件名/);
});

test('current replay corpus requires exact bidirectional scenario coverage', async () => {
  const corpus = await readCorpus();
  const baseRegistry = createArenaV1GoldenReplayScenarioRegistry();
  const baseEntries = baseRegistry.list().map((reference) => {
    const source = baseRegistry.require(reference);
    return {
      ...source,
      createReplay: source.createReplay,
      assertReplay: source.assertReplay,
    };
  });
  const registryWithUncommittedScenario = new ArenaGoldenReplayScenarioRegistry([
    ...baseEntries,
    {
      id: 'regression.uncommitted',
      version: 1,
      category: 'regression',
      file: 'regression-uncommitted.json',
      createReplay() { return {}; },
      assertReplay() {},
    },
  ]);
  assert.throws(() => verifyArenaGoldenReplayCorpus({
    ...corpus,
    scenarioRegistry: registryWithUncommittedScenario,
    coreFactory: createArenaV1MatchCore,
  }), /场景覆盖不完整/);
});

test('unsupported replay schema has a stable code and is rejected before Core construction', async () => {
  const { fixtures } = await readCorpus();
  const oldReplay = {
    ...required(fixtures[0], '首个 replay fixture').replay,
    replaySchemaVersion: 4,
  };
  let coreFactoryCalls = 0;
  let failure: unknown;
  try {
    replayMatch(oldReplay, {
      coreFactory() {
        coreFactoryCalls += 1;
        return createArenaV1MatchCore();
      },
    });
  } catch (error) {
    failure = error;
  }
  const failureRecord = record(failure, 'replay failure');
  assert.equal(failureRecord.code, ARENA_REPLAY_ERROR_CODE.UNSUPPORTED_SCHEMA);
  assert.equal(failureRecord.actualSchemaVersion, 4);
  assert.equal(failureRecord.expectedSchemaVersion, 5);
  assert.equal(coreFactoryCalls, 0);
});

test('input fuzz failure candidate is a strict single-seed replay-required reproducer', () => {
  const candidate = createArenaInputFuzzFailureCandidate({
    mapperId: 'gesture-mobility-a',
    matchIndex: 7,
    matchSeed: 123,
    failure: new Error('forced fuzz failure'),
  });
  assert.equal(candidate.runner.id, ARENA_INPUT_FUZZ_RUNNER_ID);
  assert.equal(candidate.runner.version, ARENA_INPUT_FUZZ_RUNNER_VERSION);
  assert.equal(candidate.case.replayRequired, true);
  assert.equal(candidate.case.matchIndex, 7);
  assert.throws(() => createArenaInputFuzzRegressionCandidate({
    ...candidate,
    case: { ...candidate.case, replayRequired: false },
  }), /必须启用严格回放/);
  assert.throws(() => createArenaInputFuzzRegressionCandidate({
    ...candidate,
    id: 'drifted',
  }), /id 必须是/);
});
