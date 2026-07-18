import assert from 'node:assert/strict';
import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  writeArenaEvidenceFileExclusive,
} from '../../../scripts/lib/arena-atomic-evidence-file.mjs';
import { runArenaChildProcess } from '../../../scripts/lib/arena-child-process.mjs';
import {
  describeArenaRegressionEvidenceProcesses,
  produceArenaRegressionEvidenceReport,
} from '../../../scripts/lib/arena-regression-evidence-producer.mjs';

const COMMIT = 'a'.repeat(40);

function successfulProcessResults() {
  return [
    {
      mode: 'batch-fuzz',
      reproductionCase: null,
      matchesPerMapper: 40,
      totalMatches: 80,
      replaySamplesPerMapper: 2,
      verifiedReplays: 4,
      uniqueFinalHashes: 80,
      mappers: {
        'context-primary-b': { matches: 40, uniqueFinalHashes: 40, replayChecks: 2 },
        'gesture-mobility-a': { matches: 40, uniqueFinalHashes: 40, replayChecks: 2 },
      },
      operations: { startAccepted: 10 },
      frameCounts: { primaryPressed: 5 },
    },
    'TAP version 13\n1..88\n# tests 88\n# pass 88\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n',
    {
      matches: 100,
      uniqueMatchSeeds: 100,
      heapGrowthBytes: 1,
      heapGrowthBudgetBytes: 8 * 1024 * 1024,
      remainingFrames: 0,
      remainingLifecycleListeners: 0,
      remainingCanvasListeners: 0,
      inputBound: false,
      diagnostics: 0,
    },
    {
      ok: true,
      matches: 100,
      uniqueMatchSeeds: 100,
      uniqueAuthorityHashes: 100,
      heapGrowthBytes: 1,
      heapGrowthBudgetBytes: 8 * 1024 * 1024,
      remainingFrames: 0,
      remainingLifecycleListeners: 0,
      remainingCanvasListeners: 0,
      inputBound: false,
      diagnostics: 100,
    },
    {
      ok: true,
      matches: 200,
      authorityHashCount: 200,
      contentHashCount: 4,
      lifecycleTransitions: 200,
      rematches: 99,
      maximumTicks: 60,
      restarts: 7,
      experience: 2000,
      latestGrantId: 'grant-200',
    },
  ];
}

function processResult(value, overrides = {}) {
  return {
    exitCode: 0,
    signal: null,
    stdout: typeof value === 'string' ? value : JSON.stringify(value),
    stderr: '',
    ...overrides,
  };
}

test('Regression child runner 无 shell 地捕获 stdout、stderr 与非零退出', async () => {
  const result = await runArenaChildProcess({
    command: process.execPath,
    args: ['-e', 'process.stdout.write("ok"); process.stderr.write("warn"); process.exitCode=7'],
    cwd: process.cwd(),
    timeoutMs: 5_000,
    maximumStdoutBytes: 100,
    maximumStderrBytes: 100,
  });
  assert.equal(result.exitCode, 7);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, 'ok');
  assert.equal(result.stderr, 'warn');
});

test('Regression child runner 在输出超限时 fail closed 并结束子进程', async () => {
  await assert.rejects(
    runArenaChildProcess({
      command: process.execPath,
      args: ['-e', 'process.stdout.write("12345")'],
      cwd: process.cwd(),
      timeoutMs: 5_000,
      maximumStdoutBytes: 4,
      maximumStderrBytes: 100,
    }),
    /stdout 超过 4 bytes/,
  );
});

test('Regression child runner 超时时 fail closed 并不留后台任务', async () => {
  await assert.rejects(
    runArenaChildProcess({
      command: process.execPath,
      args: ['-e', 'setInterval(() => {}, 1000)'],
      cwd: process.cwd(),
      timeoutMs: 50,
      maximumStdoutBytes: 100,
      maximumStderrBytes: 100,
    }),
    /50ms 内未结束/,
  );
});

test('Regression evidence 原子发布不覆盖已有输出且不残留临时文件', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-regression-atomic-'));
  const output = path.join(directory, 'evidence.json');
  try {
    await writeArenaEvidenceFileExclusive(output, '{"version":1}\n');
    await assert.rejects(
      writeArenaEvidenceFileExclusive(output, '{"version":2}\n'),
      /EEXIST/,
    );
    assert.equal(await readFile(output, 'utf8'), '{"version":1}\n');
    const rejectedOutput = path.join(directory, 'rejected.json');
    await assert.rejects(
      writeArenaEvidenceFileExclusive(rejectedOutput, '{}\n', {
        beforePublish: async () => { throw new Error('identity drift'); },
      }),
      /identity drift/,
    );
    await assert.rejects(lstat(rejectedOutput), /ENOENT/);
  } finally {
    const entries = await readdir(directory).catch(() => []);
    assert.deepEqual(entries, ['evidence.json']);
    await rm(directory, { recursive: true, force: true });
  }
});

test('Regression producer 用固定五个无 shell 进程生成单一原子报告', async () => {
  const values = successfulProcessResults();
  const calls = [];
  const report = await produceArenaRegressionEvidenceReport({
    root: process.cwd(),
    sourceIdentity: { sourceCommit: COMMIT, sourceDirty: false },
    generatedAt: '2026-07-18T01:02:03.004Z',
    runtime: { name: 'node', version: 'v22', platform: 'darwin', architecture: 'arm64' },
    runChildProcess: async (options) => {
      calls.push(options);
      return processResult(values[calls.length - 1]);
    },
  });
  assert.equal(report.status, 'passed');
  assert.equal(report.components.length, 5);
  assert.deepEqual(
    calls.map(({ args }) => args),
    describeArenaRegressionEvidenceProcesses().map(({ args }) => args),
  );
  assert.ok(calls.every(({ command, cwd }) => command === process.execPath && cwd === process.cwd()));
  assert.equal(calls[0].args.includes('--matches=40'), true);
  assert.equal(calls[1].args.filter((value) => value.endsWith('.test.js')).length, 6);
  assert.equal(calls[4].args.includes('--matches=200'), true);
});

test('Regression producer 在非零退出、stderr、部分 TAP 和非 JSON 时 fail closed', async () => {
  const failures = [
    [0, processResult('', { exitCode: 1, stderr: 'failed' }), /input-fuzz 失败/],
    [0, processResult(successfulProcessResults()[0], { stderr: 'warning' }), /input-fuzz 产生 stderr/],
    [0, processResult('not-json'), /input-fuzz 未输出唯一有效 JSON/],
    [1, processResult('TAP version 13\n1..1\n# tests 1\n# pass 1\n'), /# fail 汇总/],
    [1, processResult(
      'TAP version 13\n1..87\n# tests 88\n# pass 88\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n',
    ), /计划与 tests 汇总不一致/],
  ];
  for (const [failureIndex, failureResult, pattern] of failures) {
    const values = successfulProcessResults();
    let index = 0;
    await assert.rejects(
      produceArenaRegressionEvidenceReport({
        root: process.cwd(),
        sourceIdentity: { sourceCommit: COMMIT, sourceDirty: false },
        generatedAt: '2026-07-18T01:02:03.004Z',
        runtime: { name: 'node', version: 'v22', platform: 'darwin', architecture: 'arm64' },
        runChildProcess: async () => {
          const current = index;
          index += 1;
          return current === failureIndex ? failureResult : processResult(values[current]);
        },
      }),
      pattern,
    );
  }
});
