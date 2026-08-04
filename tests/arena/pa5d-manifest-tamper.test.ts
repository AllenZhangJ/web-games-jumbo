import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createArenaGoldenReplayManifest,
  createArenaGoldenReplayManifestEntry,
  createArenaV1GoldenReplayScenarioRegistry,
  verifyArenaGoldenReplayCorpus,
} from '@number-strategy-jump/arena-regression';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { generateCandidate } from '../../scripts/arena-golden-replay.js';

const directory = path.resolve('tests/arena/fixtures/replays/v5');

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, 'utf8')) as unknown;
}

async function corpus(): Promise<{ manifest: Record<string, unknown>; fixtures: Array<Record<string, unknown>> }> {
  const manifest = await readJson(path.join(directory, 'manifest.json')) as Record<string, unknown>;
  const entries = manifest.entries as Array<{ file: string }>;
  const fixtures = await Promise.all(entries.map(async ({ file }) => ({
    file,
    replay: await readJson(path.join(directory, file)),
  })));
  return { manifest, fixtures };
}

test('PA5d manifest rejects future schema, sparse, symbol, and accessor input', () => {
  const base = {
    schemaVersion: 1,
    id: 'arena.stage9.golden-replays.v5',
    replaySchemaVersion: 5,
    rejectedReplaySchemaVersions: [4],
    entries: [],
  };
  assert.throws(() => createArenaGoldenReplayManifest({ ...base, schemaVersion: 2 }), /schema/);
  assert.throws(() => createArenaGoldenReplayManifest({
    ...base,
    entries: new Array(1),
  }), /非空数组|空槽/);

  let reads = 0;
  const proxy = new Proxy(base, {
    get() {
      reads += 1;
      throw new Error('manifest getter must not execute');
    },
  });
  assert.throws(() => createArenaGoldenReplayManifest(proxy), /访问器|数据字段|普通对象|非空数组/);
  assert.equal(reads, 0);

  const symbol = { ...base, entries: [] } as Record<PropertyKey, unknown>;
  symbol[Symbol('tamper')] = true;
  assert.throws(() => createArenaGoldenReplayManifest(symbol), /Symbol/);
});

test('PA5d verifier rejects fixture identity/ordering/tamper before a second replay publish', async () => {
  const source = await corpus();
  const duplicate = [...source.fixtures, source.fixtures[0]!];
  assert.throws(() => verifyArenaGoldenReplayCorpus({
    manifest: source.manifest,
    fixtures: duplicate,
    scenarioRegistry: createArenaV1GoldenReplayScenarioRegistry(),
    coreFactory: createArenaV1MatchCore,
  }), /重复/);

  const first = source.fixtures[0]!;
  const tamperedReplay = structuredClone(first.replay) as Record<string, unknown>;
  const result = tamperedReplay.result as Record<string, unknown>;
  result.endedAtTick = (result.endedAtTick as number) + 1;
  const tamperedFixtures = source.fixtures.map((fixture) => (
    fixture === first ? { ...fixture, replay: tamperedReplay } : fixture
  ));
  assert.throws(() => verifyArenaGoldenReplayCorpus({
    manifest: source.manifest,
    fixtures: tamperedFixtures,
    scenarioRegistry: createArenaV1GoldenReplayScenarioRegistry(),
    coreFactory: createArenaV1MatchCore,
  }), /Manifest|回放|分叉|不一致/);

  const extra = { ...first, extra: true };
  assert.throws(() => verifyArenaGoldenReplayCorpus({
    manifest: source.manifest,
    fixtures: [extra, ...source.fixtures.slice(1)],
    scenarioRegistry: createArenaV1GoldenReplayScenarioRegistry(),
    coreFactory: createArenaV1MatchCore,
  }), /不支持字段/);
});

test('PA5d verifier captures options data once and invokes the captured core factory', async () => {
  const source = await corpus();
  let reads = 0;
  let factoryCalls = 0;
  const options = {
    manifest: source.manifest,
    fixtures: source.fixtures,
    scenarioRegistry: createArenaV1GoldenReplayScenarioRegistry(),
    coreFactory(options: unknown) {
      factoryCalls += 1;
      return createArenaV1MatchCore(options);
    },
  };
  const proxy = new Proxy(options, {
    get() {
      reads += 1;
      throw new Error('verifier options getter must not execute');
    },
  });
  const report = verifyArenaGoldenReplayCorpus(proxy);
  assert.equal(reads, 0);
  assert.ok(factoryCalls > 0);
  assert.equal(report.verifiedEntryCount, source.fixtures.length);
});

test('PA5d manifest entry captures only the four scenario data fields', async () => {
  const source = await corpus();
  let reads = 0;
  const scenario = new Proxy({
    id: 'regression.proxy-substitution',
    version: 1,
    category: 'regression',
    file: 'regression-proxy-substitution.json',
  } as const, {
    get() {
      reads += 1;
      throw new Error('scenario runtime getter must not execute');
    },
  });
  const entry = createArenaGoldenReplayManifestEntry(scenario, source.fixtures[0]!.replay);
  assert.equal(reads, 0);
  assert.equal(entry.id, 'regression.proxy-substitution');
  assert.equal(entry.file, 'regression-proxy-substitution.json');
});

test('PA5d candidate publication quarantines stale staging and serializes concurrent generation', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'arena-pa5d-candidate-'));
  const output = path.join(temporaryRoot, 'candidate');
  const staging = path.join(temporaryRoot, `.candidate.pa5d-${process.pid}`);
  try {
    await mkdir(staging);
    await assert.rejects(
      generateCandidate(output),
      (error: unknown) => error instanceof Error && /staging/.test(String(error.cause)),
    );
    await rm(staging, { recursive: true, force: true });

    const results = await Promise.allSettled([
      generateCandidate(output),
      generateCandidate(output),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
    assert.equal((await stat(output)).isDirectory(), true);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('PA5d candidate rejects a destination created while staging is being generated', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'arena-pa5d-race-'));
  const output = path.join(temporaryRoot, 'candidate');
  const staging = path.join(temporaryRoot, `.candidate.pa5d-${process.pid}`);
  let destinationCreated = false;
  const racer = setInterval(() => {
    void stat(staging).then(async () => {
      if (destinationCreated) return;
      destinationCreated = true;
      await mkdir(output);
      await writeFile(path.join(output, 'sentinel'), 'preserve-me');
    }).catch(() => {});
  }, 1);
  try {
    let failure: unknown;
    try {
      await generateCandidate(output);
      assert.fail('目标目录竞态应拒绝候选发布。');
    } catch (error: unknown) {
      failure = error;
    }
    assert.match(String((failure as Error & { cause?: unknown }).cause), /发布前被其他进程创建/);
    assert.equal(destinationCreated, true);
    assert.equal(await readFile(path.join(output, 'sentinel'), 'utf8'), 'preserve-me');
    await assert.rejects(stat(staging), { code: 'ENOENT' });
  } finally {
    clearInterval(racer);
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('PA5d rejects a canonical candidate parent that resolves inside the repository', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'arena-pa5d-symlink-'));
  const repositoryProbe = await mkdtemp(path.join(process.cwd(), '.pa5d-canonical-parent-'));
  const linkedParent = path.join(temporaryRoot, 'linked-parent');
  const output = path.join(linkedParent, 'candidate');
  try {
    await symlink(repositoryProbe, linkedParent, 'dir');
    let failure: unknown;
    try {
      await generateCandidate(output);
      assert.fail('canonical repository parent must be rejected');
    } catch (error: unknown) {
      failure = error;
    }
    assert.match(String((failure as Error & { cause?: unknown }).cause), /canonical parent/);
    await assert.rejects(stat(path.join(repositoryProbe, 'candidate')), { code: 'ENOENT' });
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
    await rm(repositoryProbe, { recursive: true, force: true });
  }
});

test('PA5d performs no write through a symlink before validating a missing canonical parent', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'arena-pa5d-symlink-residue-'));
  const repositoryProbe = await mkdtemp(path.join(process.cwd(), '.pa5d-symlink-residue-target-'));
  const linkedParent = path.join(temporaryRoot, 'outside-looking-parent');
  const nestedParent = path.join(repositoryProbe, 'created-before-canonical-check');
  const output = path.join(linkedParent, 'created-before-canonical-check', 'candidate');
  try {
    await symlink(repositoryProbe, linkedParent, 'dir');
    let failure: unknown;
    try {
      await generateCandidate(output);
      assert.fail('missing canonical parent must be rejected without creating it');
    } catch (error: unknown) {
      failure = error;
    }
    assert.match(String((failure as Error & { cause?: unknown }).cause), /parent 必须预先存在/);
    await assert.rejects(stat(nestedParent), { code: 'ENOENT' });
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
    await rm(repositoryProbe, { recursive: true, force: true });
  }
});
