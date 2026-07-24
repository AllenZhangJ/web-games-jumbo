import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaStage9HumanFairnessV1Definition,
} from '@number-strategy-jump/arena-human-match-study';
import {
  createHumanMatchStudyAssignment,
} from '@number-strategy-jump/arena-human-match-study';
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
  HumanMatchStudyWorkbenchView,
} from '../../../src/entry/human-match-study-workbench-view.js';
import {
  HumanMatchStudyWebApp,
} from '../../../src/entry/human-match-study-web-app.js';
import {
  createWebResearchPageOwnerId,
  detectWebResearchEnvironment,
} from '../../../src/entry/web-research-environment.js';
import type { ArenaPlatformContract } from '@number-strategy-jump/arena-platform-contracts';

const SHA = 'a'.repeat(64);
const COMMIT = 'b'.repeat(40);
type Listener = (event?: unknown) => unknown;

interface StudyNode {
  hidden: boolean;
  disabled: boolean;
  checked: boolean;
  value: string;
  textContent: string;
  dataset: Record<string, string>;
  failRemoveOnce: boolean;
  addEventListener: (name: string, callback: Listener) => void;
  removeEventListener: (name: string, callback: Listener) => void;
  listenerCount: () => number;
}

function required<T>(value: T, name: string): NonNullable<T> {
  assert.ok(value != null, `${name} 不存在。`);
  return value as NonNullable<T>;
}

function record(value: unknown, name: string): Record<string, unknown> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} 必须是对象。`);
  return value as Record<string, unknown>;
}

const STUDY_VIEW_SELECTORS = [
  '#study-operator-shell', '#study-participant-shell', '#study-running-bar',
  '#study-phase', '#study-status', '#study-build', '#study-environment',
  '#study-progress', '#study-record-count', '#study-participant-id', '#study-error',
  '#study-enrollment', '#study-enrolled', '#study-review', '#study-export-pending',
  '#study-operator-id', '#study-consent', '#study-prior-arena', '#study-prior-study',
  '#study-briefing-deviation', '#study-operator-assistance', '#study-export-workspace',
  '#study-enroll', '#study-start', '#study-invalidate-enrolled', '#study-abandon',
  '#study-export', '#study-confirm', '#study-file-lost', '#study-review-questions',
  '#study-fairness', '#study-naturalness', '#study-would-rematch',
  '#study-package-name', '#study-package-hash',
];

function createStudyViewHost() {
  const nodes = new Map<string, StudyNode>();
  for (const selector of STUDY_VIEW_SELECTORS) {
    const listeners = new Map<string, Listener>();
    nodes.set(selector, {
      hidden: false,
      disabled: false,
      checked: false,
      value: selector === '#study-fairness' || selector === '#study-naturalness' ? '3' : '',
      textContent: '',
      dataset: {},
      failRemoveOnce: false,
      addEventListener(name: string, callback: Listener) { listeners.set(name, callback); },
      removeEventListener(name: string, callback: Listener) {
        if (this.failRemoveOnce) {
          this.failRemoveOnce = false;
          throw new Error('remove failed once');
        }
        if (listeners.get(name) === callback) listeners.delete(name);
      },
      listenerCount() { return listeners.size; },
    });
  }
  return {
    root: {
      dataset: {},
      querySelector(selector: string) { return nodes.get(selector) ?? null; },
      querySelectorAll() { return []; },
    },
    nodes,
  };
}

function createStudyAppHost(fetchManifest: (input: unknown) => Promise<unknown>) {
  const { root: mount } = createStudyViewHost();
  const listeners = new Map();
  return {
    Date,
    crypto: { randomUUID: () => 'study-web-app-owner' },
    innerWidth: 390,
    innerHeight: 844,
    screen: { width: 390, height: 844 },
    navigator: { maxTouchPoints: 5, userAgentData: { mobile: true } },
    matchMedia: () => ({ matches: true }),
    document: {
      hidden: false,
      querySelector: (selector: string) => selector === '#human-study-app' ? mount : null,
    },
    fetch: fetchManifest,
    addEventListener(name: string, callback: Listener) { listeners.set(name, callback); },
    removeEventListener(name: string, callback: Listener) {
      if (listeners.get(name) === callback) listeners.delete(name);
    },
    setInterval() { return 1; },
    clearInterval() {},
  };
}

function createStudyAppPlatform() {
  const storage = new Map<string, unknown>();
  return {
    wallNow: () => 1_000,
    onResize: () => () => {},
    storageRead(key: string) {
      return storage.has(key)
        ? { ok: true, found: true, value: storage.get(key) }
        : { ok: true, found: false, value: undefined };
    },
    storageWrite(key: string, value: unknown) { storage.set(key, value); return true; },
    storageDelete(key: string) { storage.delete(key); return true; },
  } as unknown as ArenaPlatformContract;
}

function studyViewActions() {
  return {
    enroll() {},
    start() {},
    invalidateEnrolled() {},
    abandon() {},
    exportPackage() {},
    confirmExport() {},
    fileLost() {},
    exportWorkspace() {},
  };
}

function studyViewModel() {
  return {
    phase: 'idle',
    terminalStatus: null,
    statusText: '等待入组',
    participantId: null,
    completedMatchCount: 0,
    totalMatchCount: 3,
    receiptCount: 0,
    packageReceipt: null,
    environment: {
      platform: 'web',
      formFactor: 'phone',
      orientation: 'portrait',
      inputMode: 'touch',
    },
    buildId: 'arena-study-clean',
    collectable: true,
    canEnroll: true,
    canStart: false,
    error: null,
  };
}

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

test('Human Match Study Web app shares startup and cannot complete after destroy', async () => {
  let resolveFetch!: (value: unknown) => void;
  const root = createStudyAppHost(() => new Promise<unknown>((resolve) => { resolveFetch = resolve; }));
  const app = new HumanMatchStudyWebApp({ platform: createStudyAppPlatform(), root });
  const first = app.start();
  const second = app.start();
  assert.equal(first, second);
  app.destroy();
  resolveFetch({ ok: true, json: async () => buildManifest({ sourceDirty: true }) });
  await assert.rejects(first, /启动期间已销毁/);
  await assert.rejects(app.start(), /已销毁/);
});

test('study capture download hashes the exact UTF-8 bytes before returning a receipt', async () => {
  const actions: [string, string][] = [];
  const capturePackage = {
    packageId: 'human-study-package-1234abcd',
    value: '采集',
  };
  class FakeBlob {
    readonly parts: readonly unknown[];
    readonly options: unknown;

    constructor(parts: readonly unknown[], options: unknown) {
      this.parts = parts;
      this.options = options;
    }
  }
  const anchor = {
    hidden: false,
    download: '',
    href: '',
    click() { actions.push(['click', this.download]); },
    remove() { actions.push(['remove', this.download]); },
  };
  const receipt = await downloadHumanMatchStudyCapturePackage({
    crypto: webcrypto,
    TextEncoder,
    Blob: FakeBlob,
    URL: {
      createObjectURL(blob: FakeBlob) {
        assert.ok(blob.parts[0] instanceof Uint8Array);
        return 'blob:study';
      },
      revokeObjectURL(value: string) { actions.push(['revoke', value]); },
    },
    setTimeout(callback: () => void) { callback(); },
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
  const created: {
    platform: Record<string, unknown> | null;
    options: Record<string, unknown> | null;
  } = { platform: null, options: null };
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
    gameFactory(platform: unknown, options: unknown) {
      created.platform = record(platform, 'Product Runtime 平台');
      created.options = record(options, 'Product Runtime 选项');
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
  const options = required(created.options, '已创建的 Product Runtime 选项');
  const platform = required(created.platform, '已创建的 Product Runtime 平台');
  assert.equal(typeof record(options.seedSource, 'seedSource').nextSeed, 'function');
  assert.equal(typeof options.matchCompletionSink, 'function');
  const storageWrite = platform.storageWrite;
  const storageRead = platform.storageRead;
  if (typeof storageWrite !== 'function') throw new TypeError('storageWrite 必须是函数。');
  if (typeof storageRead !== 'function') throw new TypeError('storageRead 必须是函数。');
  assert.equal(storageWrite('ephemeral', { value: 1 }), true);
  assert.deepEqual(storageRead('ephemeral'), {
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

test('study Product runtime rejects capability accessors, releases invalid candidates and closes start-destroy races', async () => {
  const definition = createArenaStage9HumanFairnessV1Definition();
  const assignment = createHumanMatchStudyAssignment({
    definition,
    participantId: 'participant-runtime-boundary',
    enrollmentIndex: 3,
  });
  let accessorReads = 0;
  const accessorPlatform = { id: 'web' };
  Object.defineProperty(accessorPlatform, 'createCanvas', {
    get() {
      accessorReads += 1;
      return () => {};
    },
  });
  assert.throws(() => new HumanMatchStudyProductRuntime({
    definition,
    assignment,
    platform: accessorPlatform,
    root: { document: { querySelector() { return {}; } } },
    trialId: 'trial-runtime-accessor',
    onProgress() {},
    onFailure() {},
  }), /createCanvas.*数据方法/);
  assert.equal(accessorReads, 0);

  let invalidDestroyCount = 0;
  const invalid = new HumanMatchStudyProductRuntime({
    definition,
    assignment,
    platform: { id: 'web', createCanvas() {} },
    root: { document: { querySelector() { return {}; } } },
    trialId: 'trial-runtime-invalid',
    onProgress() {},
    onFailure() {},
    gameFactory() {
      return {
        destroy() {
          invalidDestroyCount += 1;
          if (invalidDestroyCount === 1) throw new Error('invalid cleanup failed once');
        },
      };
    },
  });
  await assert.rejects(invalid.start(), (error: unknown) => {
    assert.ok(error instanceof AggregateError);
    const firstError = required(error.errors[0], '首个聚合错误');
    const secondError = required(error.errors[1], '第二个聚合错误');
    assert.ok(firstError instanceof Error);
    assert.ok(secondError instanceof Error);
    assert.match(firstError.message, /Product Runtime\.start 缺失/);
    assert.match(secondError.message, /invalid cleanup failed once/);
    return true;
  });
  assert.equal(invalidDestroyCount, 1);
  assert.equal(invalid.state, HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.FAILED);
  invalid.destroy();
  assert.equal(invalidDestroyCount, 2);

  let resolveStart!: () => void;
  let raceDestroyCount = 0;
  const race = new HumanMatchStudyProductRuntime({
    definition,
    assignment,
    platform: { id: 'web', createCanvas() {} },
    root: { document: { querySelector() { return {}; } } },
    trialId: 'trial-runtime-race',
    onProgress() {},
    onFailure() {},
    gameFactory() {
      return {
        start() { return new Promise<void>((resolve) => { resolveStart = resolve; }); },
        destroy() { raceDestroyCount += 1; },
      };
    },
  });
  const pendingStart = race.start();
  await Promise.resolve();
  race.destroy();
  resolveStart();
  await assert.rejects(pendingStart, /启动已取消/);
  assert.equal(raceDestroyCount, 1);
  assert.equal(race.state, HUMAN_MATCH_STUDY_PRODUCT_RUNTIME_STATE.DESTROYED);
});

test('study Workbench rejects accessors and retains failed listener cleanup for exact retry', () => {
  const accessorHost = createStudyViewHost();
  const accessorView = new HumanMatchStudyWorkbenchView({ root: accessorHost.root });
  let actionReads = 0;
  const accessorActions = studyViewActions();
  Object.defineProperty(accessorActions, 'enroll', {
    enumerable: true,
    get() {
      actionReads += 1;
      return () => {};
    },
  });
  assert.throws(() => accessorView.bind(accessorActions), /数据字段/);
  assert.equal(actionReads, 0);
  const accessorModel = studyViewModel();
  let modelReads = 0;
  Object.defineProperty(accessorModel, 'environment', {
    enumerable: true,
    get() {
      modelReads += 1;
      return {};
    },
  });
  assert.throws(() => accessorView.render(accessorModel), /数据字段/);
  assert.equal(modelReads, 0);
  accessorView.destroy();

  const host = createStudyViewHost();
  const view = new HumanMatchStudyWorkbenchView({ root: host.root });
  view.bind(studyViewActions());
  view.render(studyViewModel());
  const phaseNode = required(host.nodes.get('#study-phase'), '阶段节点');
  const enrollNode = required(host.nodes.get('#study-enroll'), '入组节点');
  assert.equal(phaseNode.textContent, 'IDLE');
  assert.equal(enrollNode.disabled, false);
  enrollNode.failRemoveOnce = true;
  assert.throws(() => view.destroy(), /清理未完整完成/);
  assert.throws(() => view.render(studyViewModel()), /正在销毁/);
  assert.equal(enrollNode.listenerCount(), 1);
  view.destroy();
  assert.equal(
    [...host.nodes.values()].reduce((count, node) => count + node.listenerCount(), 0),
    0,
  );
  view.destroy();
});

test('study page includes separate operator and participant surfaces without hidden-arm labels', async () => {
  const html = await readFile('study.html', 'utf8');
  assert.match(html, /id="study-operator-shell"/);
  assert.match(html, /id="study-participant-shell"/);
  assert.match(html, /id="arena-product-ui"/);
  assert.match(html, /src="\/src\/entry\/web-human-match-study\.ts"/);
  assert.doesNotMatch(html, /web-human-match-study\.js/);
  assert.doesNotMatch(html, /hidden-difficulty|difficultyId|机器人难度/);
});
