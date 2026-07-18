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
  ARENA_STAGE8_PRODUCT_DEVICE_ACCEPTANCE_V1_ID,
  ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID,
  createArenaStage8ProductDeviceAcceptanceV1Definition,
} from '../../../src/arena/presentation/acceptance/arena-stage8-product-device-acceptance-v1.js';
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
import {
  ARENA_BUILD_DEFAULT_ENTRY,
  ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
  createArenaBuildManifest,
} from '../../../src/arena/presentation/acceptance/arena-build-manifest.js';

const COMMIT = 'a'.repeat(40);
const BUILD_ID = 'stage6-device-build-001';
const PERFORMED_AT = '2026-07-18T12:30:45.000Z';

function fakeArtifact(runId, id, kind) {
  const extension = kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT
    ? 'png'
    : kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO
      ? 'mp4'
      : kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST ? 'json' : 'txt';
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
  const artifactIdByKind = {
    [ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST]: 'manifest',
    [ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG]: 'log',
    [ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT]: 'screen',
    [ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO]: 'video',
  };
  const artifacts = target.requiredArtifactKinds.map((kind) => (
    fakeArtifact(runId, artifactIdByKind[kind], kind)
  ));
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
      osName: target.requiredOsNames?.[0]
        ?? (target.executionSurface === 'developer-tool' ? 'macOS' : 'TestOS'),
      osVersion: '1.0',
    },
    orientation: 'portrait',
    inputMode: 'touch',
    checks: target.requiredCheckIds.map((id, index) => ({
      id,
      result: index === 0 ? result : ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT.PASSED,
      notes: `${id} 已按脚本观察。`,
      artifactIds: artifacts.map(({ id }) => id),
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

test('Stage 8 product acceptance separates developer-tool faults from iOS/Android runtime evidence', () => {
  const definition = createArenaStage8ProductDeviceAcceptanceV1Definition();
  assert.equal(definition.id, ARENA_STAGE8_PRODUCT_DEVICE_ACCEPTANCE_V1_ID);
  assert.equal(definition.targets.length, 6);
  assert.equal(definition.checks.length, 14);
  const developerTool = definition.getTarget('douyin-developer-tool');
  assert.deepEqual(developerTool.requiredOsNames, ['macOS']);
  assert.ok(developerTool.requiredCheckIds.includes(
    ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.CORRUPT_STORAGE_RECOVERY,
  ));
  assert.ok(!developerTool.requiredCheckIds.includes(
    ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.PERFORMANCE_SAMPLE,
  ));
  const ios = definition.getTarget('wechat-ios-phone');
  assert.deepEqual(ios.requiredOsNames, ['iOS']);
  assert.ok(ios.requiredCheckIds.includes(
    ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.PERFORMANCE_SAMPLE,
  ));
  assert.ok(ios.requiredCheckIds.includes(
    ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.WEBGL_CONTEXT_RECOVERY,
  ));
  assert.ok(!ios.requiredCheckIds.includes(
    ARENA_STAGE8_PRODUCT_DEVICE_CHECK_ID.STORAGE_WRITE_FAILURE_RETRY,
  ));
  assert.ok(ios.requiredArtifactKinds.includes(
    ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST,
  ));
  const value = recordValue(definition, 'wechat-ios-phone');
  assert.throws(() => createArenaDeviceAcceptanceRecord(definition, {
    ...value,
    device: { ...value.device, osName: 'Android' },
  }), /只接受系统：iOS/);
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

test('Stage 8 records may share only the immutable platform build manifest', () => {
  const definition = createArenaStage8ProductDeviceAcceptanceV1Definition();
  const developerTool = recordValue(definition, 'douyin-developer-tool');
  const phone = recordValue(definition, 'douyin-android-phone');
  const developerManifest = developerTool.artifacts.find(({ kind }) => (
    kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
  ));
  const phoneManifestIndex = phone.artifacts.findIndex(({ kind }) => (
    kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
  ));
  phone.artifacts[phoneManifestIndex] = {
    ...phone.artifacts[phoneManifestIndex],
    path: developerManifest.path,
  };
  assert.doesNotThrow(() => createArenaDeviceAcceptanceBundle(
    definition,
    bundleValue(definition, [developerTool, phone]),
  ));
  const differentPhone = recordValue(definition, 'douyin-ios-phone');
  const differentManifestIndex = differentPhone.artifacts.findIndex(({ kind }) => (
    kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
  ));
  differentPhone.artifacts[differentManifestIndex] = {
    ...differentPhone.artifacts[differentManifestIndex],
    sha256: '1'.repeat(64),
  };
  assert.throws(() => createArenaDeviceAcceptanceBundle(
    definition,
    bundleValue(definition, [developerTool, differentPhone]),
  ), /平台 douyin 的 Record 必须引用同一构建 Manifest/);
  const developerLog = developerTool.artifacts.find(({ kind }) => (
    kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG
  ));
  const phoneLogIndex = phone.artifacts.findIndex(({ kind }) => (
    kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG
  ));
  phone.artifacts[phoneLogIndex] = {
    ...phone.artifacts[phoneLogIndex],
    path: developerLog.path,
  };
  assert.throws(() => createArenaDeviceAcceptanceBundle(
    definition,
    bundleValue(definition, [developerTool, phone]),
  ), /重复使用/);
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

function miniBuildManifest(platform) {
  const product = {
    path: 'game-product.js',
    sha256: '1'.repeat(64),
    byteLength: 10,
  };
  return createArenaBuildManifest({
    schemaVersion: ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
    buildId: BUILD_ID,
    commit: COMMIT,
    sourceDirty: false,
    target: platform,
    defaultEntry: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
    artifacts: [
      { path: 'game-greybox.js', sha256: '2'.repeat(64), byteLength: 11 },
      product,
      { ...product, path: 'game.js' },
      { path: 'game.json', sha256: '3'.repeat(64), byteLength: 12 },
      { path: 'project.config.json', sha256: '4'.repeat(64), byteLength: 13 },
    ],
  });
}

async function writeStage8ArtifactRecords(root, definition) {
  const manifests = new Map();
  for (const platform of ['douyin', 'wechat']) {
    const content = Buffer.from(`${JSON.stringify(miniBuildManifest(platform), null, 2)}\n`);
    const artifactPath = `build/${platform}/arena-build-manifest.json`;
    await mkdir(path.dirname(path.join(root, artifactPath)), { recursive: true });
    await writeFile(path.join(root, artifactPath), content);
    manifests.set(platform, {
      path: artifactPath,
      byteLength: content.length,
      sha256: createHash('sha256').update(content).digest('hex'),
    });
  }
  const records = [];
  for (const target of definition.targets) {
    const value = recordValue(definition, target.id);
    const artifacts = [];
    for (const artifact of value.artifacts) {
      if (artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST) {
        artifacts.push({ ...artifact, ...manifests.get(target.platform) });
        continue;
      }
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
    records.push({ ...value, artifacts });
  }
  return records;
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

test('device evidence CLI selects the Stage 8 product contract explicitly', () => {
  const definition = createArenaStage8ProductDeviceAcceptanceV1Definition();
  const described = spawnSync(process.execPath, [
    'scripts/arena-device-evidence.mjs',
    '--definition',
    ARENA_STAGE8_PRODUCT_DEVICE_ACCEPTANCE_V1_ID,
    '--describe',
  ], { cwd: path.resolve('.'), encoding: 'utf8' });
  assert.equal(described.status, 0, described.stderr);
  assert.deepEqual(JSON.parse(described.stdout), {
    definition: definition.toJSON(),
    definitionHash: definition.getContentHash(),
  });
});

test('Stage 8 evidence CLI validates clean shared build manifests for all six targets', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-stage8-device-evidence-'));
  try {
    const definition = createArenaStage8ProductDeviceAcceptanceV1Definition();
    const records = await writeStage8ArtifactRecords(root, definition);
    const bundlePath = path.join(root, 'device-evidence.json');
    await writeFile(
      bundlePath,
      `${JSON.stringify(bundleValue(definition, records), null, 2)}\n`,
    );
    const command = spawnSync(process.execPath, [
      'scripts/arena-device-evidence.mjs',
      '--definition',
      definition.id,
      '--bundle',
      bundlePath,
      '--artifacts-root',
      root,
    ], { cwd: path.resolve('.'), encoding: 'utf8' });
    assert.equal(command.status, 0, command.stderr);
    const output = JSON.parse(command.stdout);
    assert.equal(output.verifiedArtifactCount, 24);
    assert.equal(output.report.status, ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY);
    assert.equal(output.report.passingRunCount, 6);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
