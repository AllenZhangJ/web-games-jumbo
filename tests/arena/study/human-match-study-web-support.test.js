import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
} from '../../../src/arena/presentation/acceptance/arena-build-manifest.js';
import {
  createArenaStage9HumanFairnessV1Definition,
} from '../../../src/arena/study/arena-stage9-human-fairness-v1.js';
import {
  createHumanMatchStudyAssignment,
} from '../../../src/arena/study/human-match-study-assignment.js';
import {
  loadHumanMatchStudyBuildIdentity,
} from '../../../src/entry/human-match-study-build-identity.js';
import {
  downloadHumanMatchStudyCapturePackage,
} from '../../../src/entry/human-match-study-json-download.js';
import {
  HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE,
  HumanMatchStudyProductRuntime,
} from '../../../src/entry/human-match-study-product-runtime.js';
import {
  createWebResearchPageOwnerId,
  detectWebResearchEnvironment,
} from '../../../src/entry/web-research-environment.js';

const SHA = 'a'.repeat(64);
const COMMIT = 'b'.repeat(40);

function buildManifest({ sourceDirty = false } = {}) {
  return {
    schemaVersion: ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
    buildId: 'arena-study-build',
    commit: COMMIT,
    sourceDirty,
    target: 'web',
    defaultEntry: 'product',
    artifacts: [
      'greybox.html',
      'index.html',
      'product.html',
      'study.html',
    ].map((path) => ({ path, sha256: SHA, byteLength: 1 })),
  };
}

test('shared Web research environment keeps pilot/study device classification consistent', () => {
  const phone = detectWebResearchEnvironment({
    innerWidth: 390,
    innerHeight: 844,
    screen: { width: 390, height: 844 },
    navigator: { maxTouchPoints: 5, userAgentData: { mobile: true } },
    matchMedia: () => ({ matches: true }),
  });
  assert.deepEqual(phone, {
    platform: 'web',
    formFactor: 'phone',
    orientation: 'portrait',
    inputMode: 'touch',
  });
  assert.equal(createWebResearchPageOwnerId({
    crypto: { randomUUID: () => 'stable-id' },
  }, 'study'), 'study-stable-id');
});

test('study build identity accepts only a clean Web manifest that covers study.html', async () => {
  const clean = await loadHumanMatchStudyBuildIdentity({
    fetch: async () => ({ ok: true, json: async () => buildManifest() }),
  });
  assert.equal(clean.collectable, true);
  assert.equal(clean.manifest.commit, COMMIT);
  const dirty = await loadHumanMatchStudyBuildIdentity({
    fetch: async () => ({
      ok: true,
      json: async () => buildManifest({ sourceDirty: true }),
    }),
  });
  assert.equal(dirty.collectable, false);
  assert.equal(dirty.reason, 'dirty-source-build');
  const missing = buildManifest();
  missing.artifacts.pop();
  const invalid = await loadHumanMatchStudyBuildIdentity({
    fetch: async () => ({ ok: true, json: async () => missing }),
  });
  assert.equal(invalid.collectable, false);
  assert.equal(invalid.reason, 'build-manifest-invalid');
});

test('study capture download hashes the exact UTF-8 bytes before returning a receipt', async () => {
  const actions = [];
  const capturePackage = {
    packageId: 'human-study-package-1234abcd',
    value: '采集',
  };
  class FakeBlob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
    }
  }
  const anchor = {
    hidden: false,
    click() { actions.push(['click', this.download]); },
    remove() { actions.push(['remove', this.download]); },
  };
  const receipt = await downloadHumanMatchStudyCapturePackage({
    crypto: webcrypto,
    TextEncoder,
    Blob: FakeBlob,
    URL: {
      createObjectURL(blob) {
        assert.ok(blob.parts[0] instanceof Uint8Array);
        return 'blob:study';
      },
      revokeObjectURL(value) { actions.push(['revoke', value]); },
    },
    setTimeout(callback) { callback(); },
    document: {
      body: { appendChild() { actions.push(['append', anchor.download]); } },
      createElement: () => anchor,
    },
  }, capturePackage);
  const bytes = Buffer.from(`${JSON.stringify(capturePackage, null, 2)}\n`);
  assert.equal(receipt.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(receipt.byteLength, bytes.byteLength);
  assert.deepEqual(actions, [
    ['append', receipt.fileName],
    ['click', receipt.fileName],
    ['remove', receipt.fileName],
    ['revoke', 'blob:study'],
  ]);
});

test('study Product runtime owns one idempotent launch and fail-closed teardown', async () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const assignment = createHumanMatchStudyAssignment({
    definition,
    participantId: 'participant-runtime',
    enrollmentIndex: 0,
  });
  let startCount = 0;
  let destroyCount = 0;
  let createdPlatform = null;
  let createdOptions = null;
  const runtime = new HumanMatchStudyProductRuntime({
    definition,
    assignment,
    platform: {
      id: 'web',
      createCanvas() {},
      storageRead() {
        throw new Error('Study Product 不应读取持久 Product 存储。');
      },
      storageWrite() {
        throw new Error('Study Product 不应写入持久 Product 存储。');
      },
      storageDelete() {
        throw new Error('Study Product 不应删除持久 Product 存储。');
      },
    },
    root: {
      Date,
      crypto: { randomUUID: () => 'runtime-owner' },
      document: { querySelector: () => ({}) },
      location: { search: '' },
      queueMicrotask,
    },
    trialId: 'trial-runtime',
    onProgress() {},
    onFailure() {},
    gameFactory(platform, options) {
      createdPlatform = platform;
      createdOptions = options;
      return {
        async start() { startCount += 1; },
        getDebugSnapshot() { return { state: 'running' }; },
        destroy() { destroyCount += 1; },
      };
    },
  });
  const first = runtime.start();
  const second = runtime.start();
  assert.equal(first, second);
  await first;
  assert.equal(runtime.state, HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.RUNNING);
  assert.equal(startCount, 1);
  assert.equal(typeof createdOptions.seedSource.nextSeed, 'function');
  assert.equal(typeof createdOptions.matchCompletionSink, 'function');
  assert.equal(createdPlatform.storageWrite('ephemeral', { value: 1 }), true);
  assert.deepEqual(createdPlatform.storageRead('ephemeral'), {
    ok: true,
    found: true,
    value: { value: 1 },
  });
  runtime.stopPresentation();
  assert.equal(destroyCount, 1);
  assert.equal(runtime.state, HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.CAPTURE_READY);
  runtime.destroy();
  runtime.destroy();
  assert.equal(destroyCount, 1);
  assert.equal(runtime.state, HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED);
  assert.throws(() => runtime.exportMatches(), /已销毁/);
});

test('study Product runtime releases a failed candidate and exposes no half-running session', async () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const assignment = createHumanMatchStudyAssignment({
    definition,
    participantId: 'participant-runtime-failure',
    enrollmentIndex: 1,
  });
  let destroyCount = 0;
  const runtime = new HumanMatchStudyProductRuntime({
    definition,
    assignment,
    platform: { id: 'web', createCanvas() {} },
    root: {
      Date,
      crypto: { randomUUID: () => 'runtime-failure-owner' },
      document: { querySelector: () => ({}) },
      location: { search: '' },
    },
    trialId: 'trial-runtime-failure',
    onProgress() {},
    onFailure() {},
    gameFactory() {
      return {
        async start() { throw new Error('start failed'); },
        destroy() { destroyCount += 1; },
      };
    },
  });
  await assert.rejects(runtime.start(), /start failed/);
  assert.equal(runtime.state, HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED);
  assert.equal(destroyCount, 1);
  assert.throws(() => runtime.assertHealthy(), /失败关闭/);
  runtime.destroy();
  assert.equal(destroyCount, 1);
});

test('study Product runtime retains failed cleanup ownership for one exact retry', async () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const assignment = createHumanMatchStudyAssignment({
    definition,
    participantId: 'participant-runtime-cleanup',
    enrollmentIndex: 2,
  });
  let destroyCount = 0;
  const runtime = new HumanMatchStudyProductRuntime({
    definition,
    assignment,
    platform: { id: 'web', createCanvas() {} },
    root: {
      Date,
      crypto: { randomUUID: () => 'runtime-cleanup-owner' },
      document: { querySelector: () => ({}) },
      location: { search: '' },
    },
    trialId: 'trial-runtime-cleanup',
    onProgress() {},
    onFailure() {},
    gameFactory() {
      return {
        async start() {},
        getDebugSnapshot() { return { state: 'running' }; },
        destroy() {
          destroyCount += 1;
          if (destroyCount === 1) throw new Error('cleanup failed once');
        },
      };
    },
  });
  await runtime.start();
  assert.throws(() => runtime.stopPresentation(), /cleanup failed once/);
  assert.equal(runtime.state, HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED);
  runtime.destroy();
  assert.equal(destroyCount, 2);
  assert.equal(runtime.state, HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED);
});

test('study page includes separate operator and participant surfaces without hidden-arm labels', async () => {
  const html = await readFile('study.html', 'utf8');
  assert.match(html, /id="study-operator-shell"/);
  assert.match(html, /id="study-participant-shell"/);
  assert.match(html, /id="arena-product-ui"/);
  assert.doesNotMatch(html, /hidden-difficulty|difficultyId|机器人难度/);
});
