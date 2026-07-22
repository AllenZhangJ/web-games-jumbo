import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  ARENA_BUILD_DEFAULT_ENTRY,
  ARENA_BUILD_MANIFEST_FILENAME,
  ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
  createArenaBuildManifest,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  collectArenaBuildArtifacts,
  verifyArenaBuildManifestDirectory,
  writeArenaBuildManifest,
} from '../../../scripts/lib/arena-build-manifest-files.mjs';
import {
  createArenaStage9BuildBudgetV1Policy,
} from '@number-strategy-jump/arena-performance-evidence';
import {
  createArenaBuildBudgetReport,
} from '@number-strategy-jump/arena-performance-evidence';

const COMMIT = 'b'.repeat(40);

function artifact(pathValue, byteLength, hashCharacter) {
  return { path: pathValue, byteLength, sha256: hashCharacter.repeat(64) };
}

test('ArenaBuildManifest freezes required Web and mini-game artifacts and default entry identity', () => {
  const manifest = createArenaBuildManifest({
    schemaVersion: ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
    buildId: 'build-001',
    commit: COMMIT,
    sourceDirty: false,
    target: 'wechat',
    defaultEntry: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
    artifacts: [
      artifact('game.js', 10, '1'),
      artifact('game.json', 12, '3'),
      artifact('project.config.json', 13, '4'),
    ],
  });
  assert.equal(Object.isFrozen(manifest.artifacts), true);
  assert.equal(manifest.defaultEntry, ARENA_BUILD_DEFAULT_ENTRY.PRODUCT);
  assert.equal(manifest.getArtifact('game.js').sha256, '1'.repeat(64));
  assert.equal(manifest.getContentHash(), manifest.getContentHash());
  assert.throws(() => createArenaBuildManifest({
    ...manifest.toJSON(),
    artifacts: manifest.artifacts.filter(({ path: artifactPath }) => artifactPath !== 'game.json'),
  }), /缺少 game.json/);
});

test('Stage 9 build budget separates package failure from clean evidence eligibility', () => {
  const policy = createArenaStage9BuildBudgetV1Policy();
  const value = {
    schemaVersion: ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
    buildId: 'budget-build',
    commit: COMMIT,
    sourceDirty: true,
    target: 'wechat',
    defaultEntry: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
    artifacts: [
      artifact('game.js', 100, '1'),
      artifact('game.json', 10, '3'),
      artifact('project.config.json', 10, '4'),
    ],
  };
  const development = createArenaBuildBudgetReport(policy, value);
  assert.equal(development.status, 'passed');
  assert.equal(development.freezeEligible, false);
  const clean = createArenaBuildBudgetReport(policy, { ...value, sourceDirty: false });
  assert.equal(clean.freezeEligible, true);
  assert.equal(clean.policyHash, policy.getContentHash());

  const oversized = createArenaBuildBudgetReport(policy, {
    ...value,
    artifacts: [
      ...value.artifacts,
      artifact('oversized.js', 4 * 1024 * 1024, '5'),
    ],
  });
  assert.equal(oversized.status, 'failed');
  assert.ok(oversized.failedGateIds.includes('delivery-bytes'));
  assert.ok(oversized.failedGateIds.includes('javascript-bytes'));
  assert.ok(oversized.failedGateIds.includes('largest-delivery-artifact-bytes'));
});

test('build manifest file helper detects mutation and unexpected output files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-build-manifest-'));
  try {
    await mkdir(path.join(root, 'assets'), { recursive: true });
    const files = {
      'game.js': 'product',
      'game.json': '{}',
      'project.config.json': '{}',
      'assets/texture.txt': 'texture',
      'assets/empty.marker': '',
    };
    for (const [relativePath, content] of Object.entries(files)) {
      await writeFile(path.join(root, ...relativePath.split('/')), content);
    }
    const written = await writeArenaBuildManifest({
      outDir: root,
      buildId: 'build-002',
      commit: COMMIT,
      sourceDirty: false,
      target: 'douyin',
      defaultEntry: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
    });
    assert.equal(written.artifacts.length, Object.keys(files).length);
    assert.equal(written.getArtifact('assets/empty.marker').byteLength, 0);
    assert.equal((await verifyArenaBuildManifestDirectory(root, {
      requireCleanSource: true,
    })).buildId, 'build-002');

    await writeFile(path.join(root, 'game.js'), 'tampered');
    await assert.rejects(
      verifyArenaBuildManifestDirectory(root),
      /与 Manifest 不一致/,
    );
    await writeFile(path.join(root, 'game.js'), 'product');
    await writeFile(path.join(root, 'unexpected.txt'), 'unexpected');
    await assert.rejects(
      verifyArenaBuildManifestDirectory(root),
      /文件数量不一致/,
    );
    assert.ok((await collectArenaBuildArtifacts(root)).some(({ path: artifactPath }) => (
      artifactPath === 'unexpected.txt'
    )));
    assert.ok(written.toJSON());
    assert.equal(ARENA_BUILD_MANIFEST_FILENAME, 'arena-build-manifest.json');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('clean-source verification rejects an otherwise valid dirty build manifest', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-dirty-build-manifest-'));
  try {
    for (const [relativePath, content] of Object.entries({
      'game.js': 'product',
      'game.json': '{}',
      'project.config.json': '{}',
    })) await writeFile(path.join(root, relativePath), content);
    await writeArenaBuildManifest({
      outDir: root,
      buildId: 'build-dirty',
      commit: COMMIT,
      sourceDirty: true,
      target: 'wechat',
      defaultEntry: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
    });
    await assert.rejects(
      verifyArenaBuildManifestDirectory(root, { requireCleanSource: true }),
      /非干净工作区/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
