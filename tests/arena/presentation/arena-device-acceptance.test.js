import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
  createArenaDeviceAcceptanceDefinition,
} from '../../../src/arena/presentation/acceptance/arena-device-acceptance-definition.js';
import {
  ARENA_STAGE6_DEVICE_CHECK_ID,
  createArenaStage6DeviceAcceptanceV1Definition,
} from '../../../src/arena/presentation/acceptance/arena-stage6-device-acceptance-v1.js';
import {
  ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION,
  ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS,
  createArenaDeviceAcceptanceBundle,
  createArenaDeviceAcceptanceReport,
} from '../../../src/arena/presentation/acceptance/arena-device-acceptance-bundle.js';
import {
  ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT,
  ARENA_DEVICE_ACCEPTANCE_RECORD_SCHEMA_VERSION,
  createArenaDeviceAcceptanceRecord,
} from '../../../src/arena/presentation/acceptance/arena-device-acceptance-record.js';

const COMMIT = 'a'.repeat(40);
const BUILD_ID = 'stage6-device-build-001';
const PERFORMED_AT = '2026-07-18T12:30:45.000Z';

function fakeArtifact(runId, id, kind) {
  const extension = kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT
    ? 'png'
    : kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO ? 'mp4' : 'txt';
  return {
    id,
    kind,
    path: `${runId}/${id}.${extension}`,
    sha256: '0'.repeat(64),
    byteLength: 1,
  };
}

function recordValue(definition, targetId, {
  runId = `run-${targetId}`,
  result = ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT.PASSED,
  commit = COMMIT,
  buildId = BUILD_ID,
} = {}) {
  const target = definition.getTarget(targetId);
  const artifacts = [
    fakeArtifact(runId, 'log', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG),
    fakeArtifact(runId, 'screen', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT),
    fakeArtifact(runId, 'video', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO),
  ];
  return {
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_RECORD_SCHEMA_VERSION,
    recordId: `record-${runId}`,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit,
    buildId,
    targetId,
    runId,
    performedAt: PERFORMED_AT,
    operatorId: 'operator-001',
    client: {
      name: target.platform === 'web' ? 'Mobile Safari' : `${target.platform} client`,
      version: '1.0.0',
      baseLibraryVersion: target.platform === 'web' ? null : '3.7.10',
    },
    device: {
      manufacturer: target.executionSurface === 'developer-tool' ? 'Apple' : 'TestVendor',
      model: target.executionSurface === 'developer-tool' ? 'MacBook Pro' : 'TestPhone',
      osName: target.executionSurface === 'developer-tool' ? 'macOS' : 'TestOS',
      osVersion: '1.0',
    },
    orientation: 'portrait',
    inputMode: 'touch',
    checks: target.requiredCheckIds.map((id, index) => ({
      id,
      result: index === 0 ? result : ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT.PASSED,
      notes: `${id} 已按脚本观察。`,
      artifactIds: ['log', 'screen', 'video'],
    })),
    artifacts,
  };
}

function bundleValue(definition, records, overrides = {}) {
  return {
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: COMMIT,
    buildId: BUILD_ID,
    createdAt: PERFORMED_AT,
    records,
    ...overrides,
  };
}

test('Stage 6 device acceptance definition fixes five targets without entering authority', () => {
  const definition = createArenaStage6DeviceAcceptanceV1Definition();
  assert.equal(definition.targets.length, 5);
  assert.equal(definition.checks.length, 9);
  assert.equal(definition.getTarget('web-phone').platform, 'web');
  assert.ok(
    definition.getTarget('web-phone').requiredCheckIds.includes(
      ARENA_STAGE6_DEVICE_CHECK_ID.WEBGL_CONTEXT_RECOVERY,
    ),
  );
  assert.ok(
    !definition.getTarget('wechat-developer-tool').requiredCheckIds.includes(
      ARENA_STAGE6_DEVICE_CHECK_ID.WEBGL_CONTEXT_RECOVERY,
    ),
  );
  assert.throws(() => {
    definition.targets[0].minimumPassingRuns = 99;
  }, /read only|Cannot assign/i);
  assert.equal(
    createArenaStage6DeviceAcceptanceV1Definition().getContentHash(),
    definition.getContentHash(),
  );
  assert.throws(() => createArenaDeviceAcceptanceDefinition({
    ...definition.toJSON(),
    checks: [...definition.checks, { id: 'unused-check', title: '未使用检查' }],
  }), /check unused-check 未被任何 target 引用/);
});

test('device record requires exact checks, target artifacts and immutable build identity', () => {
  const definition = createArenaStage6DeviceAcceptanceV1Definition();
  const value = recordValue(definition, 'web-phone');
  const record = createArenaDeviceAcceptanceRecord(definition, value);
  assert.equal(record.checks.length, 9);
  assert.equal(record.artifacts.length, 3);
  assert.throws(() => createArenaDeviceAcceptanceRecord(definition, {
    ...value,
    hiddenDifficulty: 'hard',
  }), /不支持字段 hiddenDifficulty/);
  assert.throws(() => createArenaDeviceAcceptanceRecord(definition, {
    ...value,
    checks: value.checks.slice(1),
  }), /全部 required checks/);
  assert.throws(() => createArenaDeviceAcceptanceRecord(definition, {
    ...value,
    artifacts: value.artifacts.map((artifact, index) => (
      index === 0 ? { ...artifact, path: '../escaped.log' } : artifact
    )),
  }), /不能包含空段、\. 或 \.\./);
  assert.throws(() => createArenaDeviceAcceptanceRecord(definition, {
    ...recordValue(definition, 'wechat-phone'),
    client: {
      ...recordValue(definition, 'wechat-phone').client,
      baseLibraryVersion: null,
    },
  }), /必须包含基础库版本/);
  assert.throws(() => createArenaDeviceAcceptanceRecord(definition, {
    ...value,
    artifacts: value.artifacts.filter(({ kind }) => (
      kind !== ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO
    )),
  }), /缺少 video 证据/);
  assert.throws(() => createArenaDeviceAcceptanceRecord(definition, {
    ...value,
    checks: value.checks.map((check) => ({
      ...check,
      artifactIds: check.artifactIds.filter((id) => id !== 'video'),
    })),
  }), /artifact video 未被任何 check 引用/);
});

test('bundle report distinguishes missing, failed and ready target evidence', () => {
  const definition = createArenaStage6DeviceAcceptanceV1Definition();
  const empty = createArenaDeviceAcceptanceReport(
    definition,
    bundleValue(definition, []),
  );
  assert.equal(empty.status, ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.INCOMPLETE);
  assert.equal(empty.missingTargetIds.length, 5);

  const failedRecord = recordValue(definition, 'web-phone', {
    result: ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT.FAILED,
  });
  const failed = createArenaDeviceAcceptanceReport(
    definition,
    bundleValue(definition, [failedRecord]),
  );
  assert.equal(failed.status, ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.FAILED);
  assert.deepEqual(failed.failingTargetIds, ['web-phone']);

  const mixed = createArenaDeviceAcceptanceReport(
    definition,
    bundleValue(definition, [
      failedRecord,
      recordValue(definition, 'web-phone', { runId: 'run-web-phone-retry' }),
    ]),
  );
  assert.equal(mixed.status, ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.FAILED);
  assert.deepEqual(mixed.failingTargetIds, ['web-phone']);

  const records = definition.targets.map(({ id }) => recordValue(definition, id));
  const ready = createArenaDeviceAcceptanceReport(
    definition,
    bundleValue(definition, records),
  );
  assert.equal(ready.status, ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY);
  assert.equal(ready.passingRunCount, 5);
  assert.deepEqual(ready.missingTargetIds, []);
  assert.deepEqual(ready.failingTargetIds, []);
});

test('bundle rejects mixed builds, duplicate runs and artifact reuse across targets', () => {
  const definition = createArenaStage6DeviceAcceptanceV1Definition();
  const first = recordValue(definition, 'web-phone');
  assert.throws(() => createArenaDeviceAcceptanceBundle(definition, bundleValue(definition, [
    first,
    recordValue(definition, 'wechat-phone', { buildId: 'other-build' }),
  ])), /buildId 与 bundle buildId 不一致/);
  assert.throws(() => createArenaDeviceAcceptanceBundle(definition, bundleValue(definition, [
    first,
    { ...recordValue(definition, 'wechat-phone'), runId: first.runId },
  ])), /重复的设备证据 runId/);
  const second = recordValue(definition, 'wechat-phone');
  second.artifacts[0] = { ...second.artifacts[0], path: first.artifacts[0].path };
  assert.throws(() => createArenaDeviceAcceptanceBundle(definition, bundleValue(definition, [
    first,
    second,
  ])), /重复使用/);
});

async function writeArtifactRecord(root, definition, targetId) {
  const value = recordValue(definition, targetId);
  const artifacts = [];
  for (const artifact of value.artifacts) {
    const content = Buffer.from(`artifact:${value.runId}:${artifact.kind}`, 'utf8');
    const file = path.join(root, artifact.path);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
    artifacts.push({
      ...artifact,
      byteLength: content.length,
      sha256: createHash('sha256').update(content).digest('hex'),
    });
  }
  return { ...value, artifacts };
}

test('device evidence CLI verifies artifact containment, size and SHA-256', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-device-evidence-'));
  const externalRoot = await mkdtemp(path.join(os.tmpdir(), 'arena-device-evidence-external-'));
  try {
    const definition = createArenaStage6DeviceAcceptanceV1Definition();
    const records = [];
    for (const target of definition.targets) {
      records.push(await writeArtifactRecord(root, definition, target.id));
    }
    const bundle = bundleValue(definition, records);
    const bundlePath = path.join(root, 'device-evidence.json');
    await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
    const command = spawnSync(process.execPath, [
      'scripts/arena-device-evidence.mjs',
      '--bundle',
      bundlePath,
      '--artifacts-root',
      root,
    ], { cwd: path.resolve('.'), encoding: 'utf8' });
    assert.equal(command.status, 0, command.stderr);
    const output = JSON.parse(command.stdout);
    assert.equal(output.verifiedArtifactCount, 15);
    assert.equal(output.report.status, ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY);

    const reusedRecords = structuredClone(records);
    const reusedSource = reusedRecords[0].artifacts[0];
    const reusedTarget = reusedRecords[1].artifacts[0];
    const reusedPath = `${reusedRecords[1].runId}/reused-log.txt`;
    await writeFile(path.join(root, reusedPath), await readFile(path.join(root, reusedSource.path)));
    reusedRecords[1].artifacts[0] = {
      ...reusedTarget,
      path: reusedPath,
      sha256: reusedSource.sha256,
      byteLength: reusedSource.byteLength,
    };
    const reusedBundlePath = path.join(root, 'reused-device-evidence.json');
    await writeFile(
      reusedBundlePath,
      `${JSON.stringify(bundleValue(definition, reusedRecords), null, 2)}\n`,
    );
    const reused = spawnSync(process.execPath, [
      'scripts/arena-device-evidence.mjs',
      '--bundle',
      reusedBundlePath,
      '--artifacts-root',
      root,
    ], { cwd: path.resolve('.'), encoding: 'utf8' });
    assert.equal(reused.status, 1);
    assert.match(reused.stderr, /内容重复/);

    const firstArtifact = path.join(root, records[0].artifacts[0].path);
    const original = await readFile(firstArtifact);
    const tampered = Buffer.from(original);
    tampered[0] ^= 1;
    await writeFile(firstArtifact, tampered);
    const rejected = spawnSync(process.execPath, [
      'scripts/arena-device-evidence.mjs',
      `--bundle=${bundlePath}`,
      `--artifacts-root=${root}`,
    ], { cwd: path.resolve('.'), encoding: 'utf8' });
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /SHA-256 不一致/);

    const externalFile = path.join(externalRoot, 'escaped.log');
    await writeFile(externalFile, original);
    await rm(firstArtifact);
    await symlink(externalFile, firstArtifact);
    const escaped = spawnSync(process.execPath, [
      'scripts/arena-device-evidence.mjs',
      '--bundle',
      bundlePath,
      '--artifacts-root',
      root,
    ], { cwd: path.resolve('.'), encoding: 'utf8' });
    assert.equal(escaped.status, 1);
    assert.match(escaped.stderr, /符号链接逃逸/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(externalRoot, { recursive: true, force: true });
  }
});

test('device evidence CLI describes the fixed contract and reports incomplete bundles', async () => {
  const definition = createArenaStage6DeviceAcceptanceV1Definition();
  const described = spawnSync(process.execPath, [
    'scripts/arena-device-evidence.mjs',
    '--describe',
  ], { cwd: path.resolve('.'), encoding: 'utf8' });
  assert.equal(described.status, 0, described.stderr);
  assert.deepEqual(JSON.parse(described.stdout), {
    definition: definition.toJSON(),
    definitionHash: definition.getContentHash(),
  });

  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-device-incomplete-'));
  try {
    const bundlePath = path.join(root, 'device-evidence.json');
    await writeFile(
      bundlePath,
      `${JSON.stringify(bundleValue(definition, []), null, 2)}\n`,
    );
    const incomplete = spawnSync(process.execPath, [
      'scripts/arena-device-evidence.mjs',
      '--bundle',
      bundlePath,
    ], { cwd: path.resolve('.'), encoding: 'utf8' });
    assert.equal(incomplete.status, 2, incomplete.stderr);
    const output = JSON.parse(incomplete.stdout);
    assert.equal(output.verifiedArtifactCount, 0);
    assert.equal(output.report.status, ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.INCOMPLETE);
    assert.deepEqual(output.report.missingTargetIds, definition.targets.map(({ id }) => id));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
