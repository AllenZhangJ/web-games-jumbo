import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V1_GOLDEN_REPLAY_MANIFEST_ID,
  createArenaV1GoldenReplayScenarioRegistry,
} from '../src/arena/regression/arena-v1-golden-replay-scenarios.js';
import {
  ARENA_GOLDEN_REPLAY_MANIFEST_SCHEMA_VERSION,
  createArenaGoldenReplayManifest,
} from '@number-strategy-jump/arena-regression';
import {
  createArenaGoldenReplayManifestEntry,
  verifyArenaGoldenReplayCorpus,
} from '@number-strategy-jump/arena-regression';
import { ARENA_REPLAY_SCHEMA_VERSION } from '@number-strategy-jump/arena-match';
import { combineCleanupFailure, normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpusRoot = path.join(root, 'tests/arena/fixtures/replays');
const currentDirectory = path.join(corpusRoot, `v${ARENA_REPLAY_SCHEMA_VERSION}`);
const promotionLock = path.join(corpusRoot, '.promotion.lock');

function usage() {
  return [
    'Usage:',
    '  npm run arena:replay:verify',
    '  npm run arena:replay:candidate -- --output=<outside-repository-directory>',
    '  npm run arena:replay:promote -- --candidate=<directory> --approve=<token>',
    '',
    `首次写入 token: bootstrap-v${ARENA_REPLAY_SCHEMA_VERSION}`,
    '替换 token: replace-<current-manifest-hash>',
  ].join('\n');
}

function parseArgs(values) {
  const result = { action: 'verify', output: null, candidate: null, approval: null };
  const seen = new Set();
  for (const argument of values) {
    if (argument === '--verify') {
      if (seen.has('action')) throw new Error('黄金回放 action 不能重复。');
      seen.add('action');
      result.action = 'verify';
      continue;
    }
    const match = argument.match(/^--(output|candidate|approve)=(.+)$/);
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    if (seen.has(match[1])) throw new Error(`参数 --${match[1]} 不能重复。`);
    seen.add(match[1]);
    if (match[1] === 'output') {
      if (seen.has('action')) throw new Error('黄金回放 action 不能重复。');
      seen.add('action');
      result.action = 'candidate';
      result.output = match[2];
    } else if (match[1] === 'candidate') {
      if (seen.has('action')) throw new Error('黄金回放 action 不能重复。');
      seen.add('action');
      result.action = 'promote';
      result.candidate = match[2];
    } else result.approval = match[2];
  }
  if (result.action === 'candidate' && result.output === null) {
    throw new Error('candidate action 缺少 --output。');
  }
  if (result.action === 'promote' && (result.candidate === null || result.approval === null)) {
    throw new Error('promote action 需要 --candidate 和 --approve。');
  }
  if (result.action !== 'promote' && result.approval !== null) {
    throw new Error('--approve 只允许用于 promote action。');
  }
  return Object.freeze(result);
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function assertExternalCandidateDirectory(directory) {
  const relative = path.relative(root, directory);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error('候选目录必须位于 repository 之外。');
  }
}

async function readJson(file) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`无法读取黄金回放 JSON ${file}：${error.message}`);
  }
  return parsed;
}

async function verifyDirectory(directory, { enforceDirectoryName = true } = {}) {
  const manifestPath = path.join(directory, 'manifest.json');
  const manifest = createArenaGoldenReplayManifest(await readJson(manifestPath));
  if (enforceDirectoryName && path.basename(directory) !== `v${manifest.replaySchemaVersion}`) {
    throw new Error(`${directory} 与 replay schema ${manifest.replaySchemaVersion} 不一致。`);
  }
  const expectedFiles = new Set(['manifest.json', ...manifest.entries.map(({ file }) => file)]);
  const actualFiles = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => !entry.name.startsWith('.'));
  for (const entry of actualFiles) {
    if (!entry.isFile() || !expectedFiles.has(entry.name)) {
      throw new Error(`黄金回放目录包含未登记内容 ${entry.name}。`);
    }
    expectedFiles.delete(entry.name);
  }
  if (expectedFiles.size > 0) {
    throw new Error(`黄金回放目录缺少 ${[...expectedFiles].join(', ')}。`);
  }
  const fixtures = await Promise.all(manifest.entries.map(async ({ file }) => ({
    file,
    replay: await readJson(path.join(directory, file)),
  })));
  return verifyArenaGoldenReplayCorpus({
    manifest,
    fixtures,
    scenarioRegistry: createArenaV1GoldenReplayScenarioRegistry(),
    coreFactory: createArenaV1MatchCore,
  });
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
}

async function generateCandidate(directoryValue) {
  const directory = path.resolve(root, directoryValue);
  assertExternalCandidateDirectory(directory);
  if (await exists(directory)) throw new Error(`候选目录已存在：${directory}。`);
  await mkdir(directory, { recursive: true });
  const registry = createArenaV1GoldenReplayScenarioRegistry();
  const generated = [];
  try {
    for (const reference of registry.list()) {
      const scenario = registry.require(reference);
      const replay = scenario.createReplay();
      scenario.assertReplay(replay);
      generated.push(Object.freeze({ scenario, replay }));
    }
    const manifest = createArenaGoldenReplayManifest({
      schemaVersion: ARENA_GOLDEN_REPLAY_MANIFEST_SCHEMA_VERSION,
      id: ARENA_V1_GOLDEN_REPLAY_MANIFEST_ID,
      replaySchemaVersion: ARENA_REPLAY_SCHEMA_VERSION,
      rejectedReplaySchemaVersions: [ARENA_REPLAY_SCHEMA_VERSION - 1],
      entries: generated.map(({ scenario, replay }) => (
        createArenaGoldenReplayManifestEntry(scenario, replay)
      )).sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)),
    });
    for (const { scenario, replay } of generated) {
      await writeJson(path.join(directory, scenario.file), replay);
    }
    await writeJson(path.join(directory, 'manifest.json'), manifest);
    const report = await verifyDirectory(directory, { enforceDirectoryName: false });
    return Object.freeze({ directory, report });
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

async function copyDirectory(source, destination) {
  await mkdir(destination, { recursive: false });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    await copyFile(path.join(source, entry.name), path.join(destination, entry.name));
  }
}

async function removeForCleanup(target, options, cleanupErrors) {
  try {
    await rm(target, options);
  } catch (error) {
    cleanupErrors.push(error);
  }
}

async function withPromotionLock(operation) {
  await mkdir(corpusRoot, { recursive: true });
  try {
    await writeFile(promotionLock, `${process.pid}\n`, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error('另一个黄金回放提升正在执行；拒绝并发提升。');
    }
    throw error;
  }
  let result = null;
  let failure = null;
  try {
    result = await operation();
  } catch (error) {
    failure = normalizeThrownError(error, '黄金回放提升失败');
  }
  const cleanupErrors = [];
  await removeForCleanup(promotionLock, { force: true }, cleanupErrors);
  if (cleanupErrors.length > 0) {
    throw combineCleanupFailure(
      failure ?? new Error('黄金回放提升锁清理失败。'),
      cleanupErrors,
      '黄金回放提升结束但锁清理未完成。',
    );
  }
  if (failure) throw failure;
  return result;
}

async function promoteCandidate(candidateValue, approval) {
  const candidate = path.resolve(root, candidateValue);
  assertExternalCandidateDirectory(candidate);
  const candidateReport = await verifyDirectory(candidate, { enforceDirectoryName: false });
  if (
    candidateReport.replaySchemaVersion !== ARENA_REPLAY_SCHEMA_VERSION
    || candidateReport.manifestId !== ARENA_V1_GOLDEN_REPLAY_MANIFEST_ID
  ) throw new Error('只能提升当前 Arena V1 replay schema 的候选语料。');
  const targetExists = await exists(currentDirectory);
  let expectedApproval = `bootstrap-v${ARENA_REPLAY_SCHEMA_VERSION}`;
  if (targetExists) {
    const currentManifest = createArenaGoldenReplayManifest(
      await readJson(path.join(currentDirectory, 'manifest.json')),
    );
    expectedApproval = `replace-${createDeterministicDataHash(
      currentManifest,
      `黄金回放 Manifest ${currentManifest.id}`,
    )}`;
  }
  if (approval !== expectedApproval) {
    throw new Error(`黄金语料提升审批 token 错误；需要 ${expectedApproval}。`);
  }
  await mkdir(corpusRoot, { recursive: true });
  const temporary = path.join(corpusRoot, `.v${ARENA_REPLAY_SCHEMA_VERSION}.next-${process.pid}`);
  const previous = path.join(corpusRoot, `.v${ARENA_REPLAY_SCHEMA_VERSION}.previous-${process.pid}`);
  await rm(temporary, { recursive: true, force: true });
  await rm(previous, { recursive: true, force: true });
  try {
    await copyDirectory(candidate, temporary);
    await verifyDirectory(temporary, { enforceDirectoryName: false });
  } catch (error) {
    const cleanupErrors = [];
    await removeForCleanup(temporary, { recursive: true, force: true }, cleanupErrors);
    throw combineCleanupFailure(
      normalizeThrownError(error, '黄金回放 staging 失败'),
      cleanupErrors,
      '黄金回放 staging 失败且临时目录清理未完成。',
    );
  }
  let movedPrevious = false;
  let movedCurrent = false;
  try {
    if (targetExists) {
      await rename(currentDirectory, previous);
      movedPrevious = true;
    }
    await rename(temporary, currentDirectory);
    movedCurrent = true;
    const report = await verifyDirectory(currentDirectory);
    await rm(previous, { recursive: true, force: true });
    return Object.freeze({ directory: currentDirectory, report });
  } catch (error) {
    const rollbackErrors = [];
    if (movedCurrent && await exists(currentDirectory)) {
      await removeForCleanup(
        currentDirectory,
        { recursive: true, force: true },
        rollbackErrors,
      );
    }
    if (movedPrevious && await exists(previous)) {
      try {
        await rename(previous, currentDirectory);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    await removeForCleanup(temporary, { recursive: true, force: true }, rollbackErrors);
    throw combineCleanupFailure(
      normalizeThrownError(error, '黄金回放提升提交失败'),
      rollbackErrors,
      '黄金回放提升提交失败且回滚未完整完成。',
    );
  }
}

async function verifyAll() {
  if (!(await exists(corpusRoot))) throw new Error('黄金回放目录尚未建立。');
  if (await exists(promotionLock)) throw new Error('黄金回放提升正在执行，暂不验证语料。');
  const directories = (await readdir(corpusRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^v\d+$/.test(entry.name))
    .map((entry) => path.join(corpusRoot, entry.name))
    .sort();
  if (directories.length === 0) throw new Error('黄金回放目录没有版本化语料。');
  const reports = [];
  for (const directory of directories) reports.push(await verifyDirectory(directory));
  return Object.freeze({ corpusRoot, reports: Object.freeze(reports) });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = options.action === 'candidate'
    ? await generateCandidate(options.output)
    : options.action === 'promote'
      ? await withPromotionLock(() => promoteCandidate(options.candidate, options.approval))
      : await verifyAll();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
