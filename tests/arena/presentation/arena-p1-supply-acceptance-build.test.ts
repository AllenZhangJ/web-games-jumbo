import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createArenaP1SupplyAcceptanceBuildAttestationV1,
  type ArenaP1SupplyAcceptanceBuildAttestationV1,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createPlatformContract,
  type ArenaPlatformContract,
} from '@number-strategy-jump/arena-platform-contracts';
import {
  createArenaP1SupplyAcceptancePlatformHostResourcePort,
  startArenaP1SupplyAcceptanceWithPlatform,
  type ArenaP1SupplyAcceptanceHostResourceBundle,
} from '../../../src/entry/arena-p1-supply-acceptance-host.js';
import {
  createDouyinP1SupplyAcceptanceHostResourcePort,
} from '../../../src/entry/douyin-p1-supply-acceptance.js';
import {
  createWeChatP1SupplyAcceptanceHostResourcePort,
} from '../../../src/entry/wechat-p1-supply-acceptance.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUTPUT_ROOT = path.join(ROOT, 'dist', 'arena-p1-supply-acceptance');
const BUILD_IDENTITY_FILENAME = 'arena-p1-supply-build-identity.json';
const FORMAL_INDEX_PATH = 'web/arena-p1-supply-formal-build-index-v1.json';
const A1_MANIFEST_SOURCE_PATH =
  'docs/quality/art/supply/arena-a1.0-supply-presentation-contract-v2.json';
const PP3B_PRODUCTION_FILES = Object.freeze([
  'src/entry/arena-p1-supply-acceptance-host.ts',
  'src/entry/web-p1-supply-acceptance.ts',
  'src/entry/wechat-p1-supply-acceptance.ts',
  'src/entry/douyin-p1-supply-acceptance.ts',
  'src/arena-p1-supply-acceptance.css',
  'scripts/arena-p1-supply-acceptance-index.html',
  'scripts/build-arena-p1-supply-acceptance.ts',
] as const);
const TARGETS = Object.freeze(['web', 'wechat', 'douyin'] as const);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

type Target = typeof TARGETS[number];
type CanvasMethodName = 'clearRect' | 'fillRect' | 'fillText' | 'beginPath' | 'arc' | 'fill' | 'stroke';

interface HarnessOptions {
  readonly methods?: Partial<Record<CanvasMethodName, (...args: unknown[]) => unknown>>;
  readonly synchronousFrame?: boolean;
  readonly requestFrameFailureAt?: number;
  readonly cancelFrameFailureCount?: number;
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function hostCommit(originKind: 'spatial' | 'accessible-non-spatial' = 'spatial') {
  return Object.freeze({
    schemaVersion: 1,
    view: Object.freeze({
      schemaVersion: 1,
      streamId: 'pp3b-host-test-stream',
      status: 'ready',
      snapshotTick: 1,
      snapshotEventSequence: 1,
      nextExpectedEventSequence: 2,
      resyncedFromSnapshot: false,
      markers: Object.freeze([]),
      cues: Object.freeze([Object.freeze({
        schemaVersion: 1,
        id: 'pp3b-cue',
        kind: 'picked-up',
        sourceEventIds: Object.freeze(['pp3b-event']),
        tick: 1,
        sequenceStart: 1,
        sequenceEnd: 1,
        supplyId: 'pp3b-supply',
        equipmentInstanceId: 'pp3b-equipment',
        participantId: 'player-1',
        previousEquipmentInstanceId: null,
        nextEquipmentInstanceId: null,
      })]),
    }),
    terminalCuePlacements: Object.freeze([Object.freeze({
      schemaVersion: 1,
      cueId: 'pp3b-cue',
      supplyId: 'pp3b-supply',
      equipmentInstanceId: 'pp3b-equipment',
      originKind,
      position: originKind === 'spatial' ? Object.freeze({ x: 1, y: 1, z: 0 }) : null,
    })]),
  });
}

function platformHarness(id: Target, options: HarnessOptions = {}) {
  const calls: Record<CanvasMethodName, number> = {
    clearRect: 0,
    fillRect: 0,
    fillText: 0,
    beginPath: 0,
    arc: 0,
    fill: 0,
    stroke: 0,
  };
  const context: Record<string, unknown> = {};
  for (const name of Object.keys(calls) as CanvasMethodName[]) {
    context[name] = (...args: unknown[]) => {
      calls[name] += 1;
      return options.methods?.[name]?.(...args);
    };
  }
  const canvas = {
    width: 390,
    height: 844,
    getContext(kind: unknown) {
      assert.equal(kind, '2d');
      return context;
    },
  };
  let nextFrame = 1;
  let requestFrameCount = 0;
  const frames = new Map<number, () => void>();
  let cancelCount = 0;
  let remainingCancelFailures = options.cancelFrameFailureCount ?? 0;
  let listenerCleanupCount = 0;
  const listeners = {
    resize: new Set<() => void>(),
    show: new Set<() => void>(),
    hide: new Set<() => void>(),
  };
  const register = (set: Set<() => void>, callback: () => void) => {
    set.add(callback);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      listenerCleanupCount += 1;
      set.delete(callback);
    };
  };
  const platform = createPlatformContract({
    id,
    createCanvas: () => canvas,
    getViewport: () => ({ width: 390, height: 844, pixelRatio: 1, safeArea: null }),
    requestFrame(callback) {
      requestFrameCount += 1;
      if (requestFrameCount === options.requestFrameFailureAt) {
        throw new Error('controlled requestFrame failure');
      }
      const token = nextFrame;
      nextFrame += 1;
      frames.set(token, () => {
        frames.delete(token);
        callback(0);
      });
      if (options.synchronousFrame) frames.get(token)?.();
      return token;
    },
    cancelFrame(token) {
      cancelCount += 1;
      if (remainingCancelFailures > 0) {
        remainingCancelFailures -= 1;
        throw new Error('controlled cancelFrame failure');
      }
      return frames.delete(token);
    },
    onResize: (callback) => register(listeners.resize, callback),
    onShow: (callback) => register(listeners.show, callback),
    onHide: (callback) => register(listeners.hide, callback),
  });
  return {
    platform,
    context,
    calls,
    frames,
    listeners,
    get cancelCount() { return cancelCount; },
    get requestFrameCount() { return requestFrameCount; },
    get listenerCleanupCount() { return listenerCleanupCount; },
  };
}

function resourceFactory(
  target: Target,
  platform: ArenaPlatformContract,
): ArenaP1SupplyAcceptanceHostResourceBundle {
  if (target === 'wechat') return createWeChatP1SupplyAcceptanceHostResourcePort(platform);
  if (target === 'douyin') return createDouyinP1SupplyAcceptanceHostResourcePort(platform);
  return createArenaP1SupplyAcceptancePlatformHostResourcePort(platform, Object.freeze({
    platformId: 'web',
  }));
}

async function source(relativePath: string): Promise<string> {
  return readFile(path.join(ROOT, relativePath), 'utf8');
}

async function directorySignature(relativePath: string): Promise<unknown> {
  const absolute = path.join(ROOT, relativePath);
  try {
    const metadata = await stat(absolute, { bigint: true });
    return Object.freeze({
      exists: true,
      dev: metadata.dev.toString(),
      ino: metadata.ino.toString(),
      size: metadata.size.toString(),
      mtimeNs: metadata.mtimeNs.toString(),
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return Object.freeze({ exists: false });
    throw error;
  }
}

function repositoryDirty(): boolean {
  return execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '-z'], {
    cwd: ROOT,
    encoding: 'buffer',
  }).length > 0;
}

function canonicalAttestationHash(
  value: ArenaP1SupplyAcceptanceBuildAttestationV1,
): string {
  return sha256(JSON.stringify({
    schemaVersion: value.schemaVersion,
    purpose: value.purpose,
    commit: value.commit,
    sourceDirty: value.sourceDirty,
    repositoryFingerprint: value.repositoryFingerprint,
    buildId: value.buildId,
    platform: value.platform,
    adapterModuleHash: value.adapterModuleHash,
    harnessModuleHash: value.harnessModuleHash,
    productionReachabilityAuditHash: value.productionReachabilityAuditHash,
    assetManifestHash: value.assetManifestHash,
    artifactManifestHash: value.artifactManifestHash,
  }));
}

async function createCleanBuildFixture(): Promise<Readonly<{
  root: string;
  cleanup(): Promise<void>;
}>> {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'arena-pp3b-formal-clean-'));
  const fixtureRoot = path.join(temporaryRoot, 'repository');
  await mkdir(fixtureRoot, { recursive: true });
  for (const relativePath of ['src', 'packages', 'scripts']) {
    await cp(path.join(ROOT, relativePath), path.join(fixtureRoot, relativePath), {
      recursive: true,
    });
  }
  for (const relativePath of [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'tsconfig.base.json',
    'tsconfig.app.json',
  ]) {
    await cp(path.join(ROOT, relativePath), path.join(fixtureRoot, relativePath));
  }
  await mkdir(path.dirname(path.join(fixtureRoot, A1_MANIFEST_SOURCE_PATH)), { recursive: true });
  await cp(
    path.join(ROOT, A1_MANIFEST_SOURCE_PATH),
    path.join(fixtureRoot, A1_MANIFEST_SOURCE_PATH),
  );
  await writeFile(path.join(fixtureRoot, '.gitignore'), '/node_modules/\n/dist/\n', 'utf8');

  const fixtureNodeModules = path.join(fixtureRoot, 'node_modules');
  await mkdir(fixtureNodeModules, { recursive: true });
  for (const entry of await readdir(path.join(ROOT, 'node_modules'))) {
    if (entry === '@number-strategy-jump') continue;
    await symlink(
      path.join(ROOT, 'node_modules', entry),
      path.join(fixtureNodeModules, entry),
    );
  }
  const fixtureScope = path.join(fixtureNodeModules, '@number-strategy-jump');
  await mkdir(fixtureScope, { recursive: true });
  for (const packageDirectory of await readdir(path.join(fixtureRoot, 'packages'))) {
    const packageJsonPath = path.join(fixtureRoot, 'packages', packageDirectory, 'package.json');
    let packageValue: { name?: unknown };
    try {
      packageValue = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { name?: unknown };
    } catch {
      continue;
    }
    if (typeof packageValue.name !== 'string'
      || !packageValue.name.startsWith('@number-strategy-jump/')) continue;
    await symlink(
      path.join(fixtureRoot, 'packages', packageDirectory),
      path.join(fixtureScope, packageValue.name.slice('@number-strategy-jump/'.length)),
    );
  }

  execFileSync('git', ['init', '--quiet'], { cwd: fixtureRoot });
  execFileSync('git', ['add', '--all'], { cwd: fixtureRoot });
  execFileSync('git', [
    '-c',
    'user.name=PP3b Test',
    '-c',
    'user.email=pp3b-test@example.invalid',
    'commit',
    '--quiet',
    '-m',
    'test-only clean formal fixture',
  ], { cwd: fixtureRoot });
  assert.equal(execFileSync('git', ['status', '--porcelain=v1'], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  }), '');
  return Object.freeze({
    root: fixtureRoot,
    cleanup: () => rm(temporaryRoot, { recursive: true, force: true }),
  });
}

test('PP3b keeps the shared owner platform-neutral and all three entries dependency-thin', async () => {
  const sources = new Map(await Promise.all(PP3B_PRODUCTION_FILES.map(async (relativePath) => (
    [relativePath, await source(relativePath)] as const
  ))));
  assert.equal(sources.size, 7);
  const neutral = sources.get('src/entry/arena-p1-supply-acceptance-host.ts')!;
  assert.doesNotMatch(neutral, /\b(?:document|window|navigator|wx|tt|THREE|Three|LocalMatchSession|MatchCore|ArenaSupplyPresentationAdapter)\b/);
  assert.doesNotMatch(neutral, /arena-platform-runtime\/(?:web|wechat|douyin)/);
  assert.match(neutral, /\.\/arena-p1-supply-acceptance-runtime\.js/);

  const entrySources = Object.fromEntries(TARGETS.map((target) => [
    target,
    sources.get(`src/entry/${target}-p1-supply-acceptance.ts`),
  ])) as Record<Target, string>;
  for (const [target, entrySource] of Object.entries(entrySources) as Array<[Target, string]>) {
    assert.match(entrySource, /\.\/arena-p1-supply-acceptance-host\.js/);
    assert.doesNotMatch(entrySource, /arena-session|arena-match|arena-presentation-runtime|LocalMatchSession|MatchCore|ArenaSupplyPresentationAdapter/);
    for (const other of TARGETS.filter((candidate) => candidate !== target)) {
      assert.doesNotMatch(entrySource, new RegExp(`${other}-p1-supply-acceptance`));
    }
  }
  assert.doesNotMatch(entrySources.wechat, /\b(?:document|window|navigator|tt)\b|platform-runtime\/(?:web|douyin)/);
  assert.doesNotMatch(entrySources.douyin, /\b(?:document|window|navigator|wx)\b|platform-runtime\/(?:web|wechat)/);
  assert.doesNotMatch(entrySources.web, /\b(?:wx|tt)\b|platform-runtime\/(?:wechat|douyin)/);

  const html = sources.get('scripts/arena-p1-supply-acceptance-index.html')!;
  const css = sources.get('src/arena-p1-supply-acceptance.css')!;
  const buildSource = sources.get('scripts/build-arena-p1-supply-acceptance.ts')!;
  assert.doesNotMatch(
    [entrySources.web, entrySources.wechat, entrySources.douyin].join('\n'),
    /arena-v1-application-launch|ARENA_BUILD_DEFAULT_ENTRY|arena-build-manifest|scripts\/build\.ts/,
  );
  assert.match(buildSource, /assertProductionReachabilityIsolation/);
  assert.match(buildSource, /write:\s*false/);
  assert.match(buildSource, /metafile:\s*true/);
  assert.match(buildSource, /preserveSymlinks:\s*true/);
  assert.doesNotMatch(buildSource, /lastIndexOf\([^)]*node_modules|路径中含 node_modules|node_modules\/\$\{/);
  assert.match(html, /<canvas id="game"/);
  assert.match(html, /aria-live="assertive"/);
  assert.doesNotMatch(html, /<(?:button|dialog|select)\b/i);
  assert.match(css, /overflow:\s*hidden/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test('PP3b publication treats candidate rename as the commit point and never restores a partially removed backup', async () => {
  const buildSource = await source('scripts/build-arena-p1-supply-acceptance.ts');
  const publishStart = buildSource.indexOf('async function publishCandidate(');
  const commitRename = buildSource.indexOf(
    'await rename(candidateRoot, OUTPUT_ROOT);',
    publishStart,
  );
  const committedCleanupCall = buildSource.indexOf(
    'return cleanupCommittedBackup(backupRoot);',
    commitRename,
  );
  assert.ok(publishStart >= 0);
  assert.ok(commitRename > publishStart);
  assert.ok(committedCleanupCall > commitRename);

  const cleanupStart = buildSource.indexOf('async function cleanupCommittedBackup(');
  const cleanupEnd = buildSource.indexOf('\n}\n\nasync function publishCandidate(', cleanupStart);
  assert.ok(cleanupStart >= 0);
  assert.ok(cleanupEnd > cleanupStart);
  const committedCleanup = buildSource.slice(cleanupStart, cleanupEnd);
  assert.match(committedCleanup, /await rm\(backupRoot, \{ recursive: true, force: true \}\)/);
  assert.match(committedCleanup, /staleBackupPath: backupRoot/);
  assert.doesNotMatch(committedCleanup, /\brename\s*\(/);
  assert.doesNotMatch(committedCleanup, /\bthrow\b/);
  assert.match(buildSource, /warning=stale-backup; staleBackupPath=/);
});

test('PP3b host owners release every resource exactly once across all platforms', () => {
  for (const target of TARGETS) {
    const harness = platformHarness(target);
    const bundle = resourceFactory(target, harness.platform);
    (harness.platform as unknown as { requestFrame: unknown }).requestFrame = () => {
      throw new Error('replaced platform requestFrame must not execute');
    };
    (harness.platform as unknown as { cancelFrame: unknown }).cancelFrame = () => {
      throw new Error('replaced platform cancelFrame must not execute');
    };
    bundle.hostResourcePort.commit(hostCommit());
    const frameToken = bundle.hostResourcePort.startFrameLoop(() => undefined);
    assert.deepEqual({
      frameLoopCount: bundle.getResourceSnapshot().frameLoopCount,
      listenerCount: bundle.getResourceSnapshot().listenerCount,
      particleCount: bundle.getResourceSnapshot().particleCount,
      gpuOwned: bundle.getResourceSnapshot().gpuOwned,
      domOwned: bundle.getResourceSnapshot().domOwned,
    }, {
      frameLoopCount: 1,
      listenerCount: 3,
      particleCount: 1,
      gpuOwned: true,
      domOwned: true,
    });
    bundle.hostResourcePort.cancelFrameLoop(frameToken);
    bundle.hostResourcePort.cancelFrameLoop(frameToken);
    bundle.destroyAll();
    bundle.destroyAll();
    assert.deepEqual(bundle.getResourceSnapshot(), {
      schemaVersion: 1,
      platformId: target,
      frameLoopCount: 0,
      asyncCallbackCount: 0,
      listenerCount: 0,
      particleCount: 0,
      voiceCount: 0,
      gpuOwned: false,
      domOwned: false,
      reentryCount: 0,
    });
    assert.equal(harness.cancelCount, 1);
    assert.equal(harness.listenerCleanupCount, 3);
    assert.equal(harness.frames.size, 0);
  }
});

test('PP3b entry handle and accessible fallback preserve PP3a placement and closed lifecycle', () => {
  const harness = platformHarness('web');
  const announcements: string[] = [];
  const fallbackHost = createArenaP1SupplyAcceptancePlatformHostResourcePort(
    harness.platform,
    Object.freeze({
      platformId: 'web',
      announce(message: string) { announcements.push(message); },
    }),
  );
  fallbackHost.hostResourcePort.commit(hostCommit('accessible-non-spatial'));
  assert.deepEqual(announcements, ['供给状态已更新。']);
  assert.equal(fallbackHost.getResourceSnapshot().particleCount, 0);
  fallbackHost.destroyAll();

  const runtimeHarness = platformHarness('web');
  const handle = startArenaP1SupplyAcceptanceWithPlatform(
    runtimeHarness.platform,
    Object.freeze({ platformId: 'web' }),
  );
  assert.equal(handle.getRuntimeDebugSnapshot().state, 'active');
  assert.equal(handle.getHostResourceSnapshot().frameLoopCount, 1);
  handle.destroy();
  handle.destroy();
  assert.equal(handle.getRuntimeDebugSnapshot().state, 'destroyed');
  assert.deepEqual(handle.getHostResourceSnapshot(), {
    schemaVersion: 1,
    platformId: 'web',
    frameLoopCount: 0,
    asyncCallbackCount: 0,
    listenerCount: 0,
    particleCount: 0,
    voiceCount: 0,
    gpuOwned: false,
    domOwned: false,
    reentryCount: 0,
  });
  assert.equal(runtimeHarness.cancelCount, 1);
  assert.equal(runtimeHarness.listenerCleanupCount, 3);
});

test('PP3b cleanup continues across categories and retains only retryable ownership', () => {
  const harness = platformHarness('web');
  let resizeCleanupAttempts = 0;
  const platform = createPlatformContract({
    ...harness.platform,
    onResize() {
      return () => {
        resizeCleanupAttempts += 1;
        if (resizeCleanupAttempts === 1) throw new Error('controlled listener cleanup failure');
      };
    },
  });
  const bundle = resourceFactory('web', platform);
  assert.throws(() => bundle.destroyAll(), /host cleanup 失败/);
  assert.deepEqual({
    listeners: bundle.getResourceSnapshot().listenerCount,
    gpu: bundle.getResourceSnapshot().gpuOwned,
    dom: bundle.getResourceSnapshot().domOwned,
  }, {
    listeners: 1,
    gpu: false,
    dom: false,
  });
  bundle.destroyAll();
  assert.equal(bundle.getResourceSnapshot().listenerCount, 0);
  assert.equal(resizeCleanupAttempts, 2);
});

test('PP3b host fails closed on drawing errors, thenables, swallowed reentry and sync frames', () => {
  for (const failure of ['error', 'thenable'] as const) {
    let failing = true;
    const harness = platformHarness('web', {
      methods: {
        fillText() {
          if (!failing) return undefined;
          if (failure === 'error') throw new Error('controlled canvas failure');
          return Promise.resolve('forbidden async canvas result');
        },
      },
    });
    const bundle = resourceFactory('web', harness.platform);
    assert.throws(
      () => bundle.hostResourcePort.commit(hostCommit()),
      failure === 'error' ? /controlled canvas failure/ : /必须同步完成/,
    );
    failing = false;
    bundle.destroyAll();
    assert.equal(bundle.getResourceSnapshot().gpuOwned, false);
    assert.equal(bundle.getResourceSnapshot().listenerCount, 0);
  }

  let reentrantBundle: ArenaP1SupplyAcceptanceHostResourceBundle | null = null;
  let reentryAttempted = false;
  const reentrant = platformHarness('web', {
    methods: {
      fillText() {
        if (reentryAttempted) return;
        reentryAttempted = true;
        try { reentrantBundle?.hostResourcePort.destroyParticles(); } catch { /* swallowed */ }
      },
    },
  });
  reentrantBundle = resourceFactory('web', reentrant.platform);
  assert.throws(() => reentrantBundle?.hostResourcePort.commit(hostCommit()), /重入后失败/);
  assert.equal(reentrantBundle.getResourceSnapshot().reentryCount, 1);
  reentrantBundle.destroyAll();

  const synchronous = platformHarness('web', { synchronousFrame: true });
  const synchronousBundle = resourceFactory('web', synchronous.platform);
  assert.throws(
    () => synchronousBundle.hostResourcePort.startFrameLoop(() => undefined),
    /不得同步调用 callback/,
  );
  assert.equal(synchronousBundle.getResourceSnapshot().frameLoopCount, 0);
  synchronousBundle.destroyAll();
});

test('PP3b descriptor capture rejects inherited thenables and never executes hostile getters or coercion', async () => {
  const inheritedThenable = Object.create(Object.freeze({ then() {} })) as object;
  const thenableHarness = platformHarness('web', {
    methods: { fillText: () => inheritedThenable },
  });
  const thenableBundle = resourceFactory('web', thenableHarness.platform);
  assert.throws(
    () => thenableBundle.hostResourcePort.commit(hostCommit()),
    /thenable|同步完成/,
  );
  thenableBundle.destroyAll();

  for (const hostileKey of ['id', 'createCanvas'] as const) {
    const base = platformHarness('web').platform as unknown as Record<string, unknown>;
    const hostile = Object.create(null) as Record<string, unknown>;
    for (const key of [
      'id',
      'createCanvas',
      'getViewport',
      'requestFrame',
      'cancelFrame',
      'onResize',
      'onShow',
      'onHide',
    ]) {
      Object.defineProperty(hostile, key, {
        configurable: true,
        enumerable: true,
        value: base[key],
      });
    }
    let getterCalls = 0;
    const original = hostile[hostileKey];
    Object.defineProperty(hostile, hostileKey, {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        return original;
      },
    });
    assert.throws(() => createArenaP1SupplyAcceptancePlatformHostResourcePort(
      hostile as unknown as ArenaPlatformContract,
      Object.freeze({ platformId: 'web' }),
    ), /数据字段/);
    assert.equal(getterCalls, 0);
  }

  let canvasGetterCalls = 0;
  const canvasGetterHarness = platformHarness('web');
  const canvasGetterPlatform = createPlatformContract({
    ...canvasGetterHarness.platform,
    createCanvas: () => Object.defineProperty({}, 'getContext', {
      enumerable: true,
      get() {
        canvasGetterCalls += 1;
        return () => canvasGetterHarness.context;
      },
    }),
  });
  assert.throws(() => resourceFactory('web', canvasGetterPlatform), /构造失败/);
  assert.equal(canvasGetterCalls, 0);

  let contextGetterCalls = 0;
  const contextGetterHarness = platformHarness('web');
  Object.defineProperty(contextGetterHarness.context, 'fillText', {
    configurable: true,
    enumerable: true,
    get() {
      contextGetterCalls += 1;
      return () => undefined;
    },
  });
  assert.throws(() => resourceFactory('web', contextGetterHarness.platform), /构造失败/);
  assert.equal(contextGetterCalls, 0);

  let valueOfCalls = 0;
  const coercionHarness = platformHarness('web');
  const coercionPlatform = createPlatformContract({
    ...coercionHarness.platform,
    getViewport: () => ({
      width: { valueOf() { valueOfCalls += 1; return 390; } } as unknown as number,
      height: 844,
      pixelRatio: 1,
      safeArea: null,
    }),
  });
  const coercionBundle = resourceFactory('web', coercionPlatform);
  coercionBundle.hostResourcePort.commit(hostCommit());
  assert.equal(valueOfCalls, 0);
  coercionBundle.destroyAll();

  const identityHarness = platformHarness('web');
  const identityBundle = resourceFactory('web', identityHarness.platform);
  identityHarness.context.fillText = () => { throw new Error('replacement method executed'); };
  assert.doesNotThrow(() => identityBundle.hostResourcePort.commit(hostCommit()));
  assert.ok(identityHarness.calls.fillText >= 1);
  identityBundle.destroyAll();

  const neutralSource = await source('src/entry/arena-p1-supply-acceptance-host.ts');
  assert.doesNotMatch(neutralSource, /\b(?:setTimeout|clearTimeout|setInterval|clearInterval)\b/);
});

test('PP3b frame ownership survives failed synchronous rollback', () => {
  const synchronous = platformHarness('web', {
    synchronousFrame: true,
    cancelFrameFailureCount: 1,
  });
  const synchronousBundle = resourceFactory('web', synchronous.platform);
  let rollbackFailure: unknown = null;
  try {
    synchronousBundle.hostResourcePort.startFrameLoop(() => undefined);
  } catch (error) {
    rollbackFailure = error;
  }
  assert.notEqual(rollbackFailure, null);
  const cleanupCauses = (rollbackFailure as { cleanupCauses?: readonly unknown[] }).cleanupCauses;
  assert.ok(Array.isArray(cleanupCauses));
  assert.equal(cleanupCauses.length, 1);
  assert.equal((cleanupCauses[0] as Error).message, 'controlled cancelFrame failure');
  assert.equal(synchronousBundle.getResourceSnapshot().frameLoopCount, 1);
  synchronousBundle.destroyAll();
  assert.equal(synchronousBundle.getResourceSnapshot().frameLoopCount, 0);
  assert.equal(synchronous.cancelCount, 2);
});

test('PP3b frame ownership closes on later scheduling failure', () => {
  const laterFailure = platformHarness('web', { requestFrameFailureAt: 2 });
  const laterBundle = resourceFactory('web', laterFailure.platform);
  let shutdownCount = 0;
  laterBundle.setShutdown(() => {
    shutdownCount += 1;
    laterBundle.destroyAll();
  });
  laterBundle.hostResourcePort.startFrameLoop(() => undefined);
  const firstFrame = [...laterFailure.frames.values()][0];
  assert.ok(firstFrame);
  assert.throws(() => firstFrame(), /frame loop 失败并关闭/);
  assert.equal(shutdownCount, 1);
  assert.equal(laterBundle.getResourceSnapshot().frameLoopCount, 0);
  assert.equal(laterFailure.frames.size, 0);
});

test('PP3b constructor rollback and snapshot guard retain exact ownership', () => {
  const contextFailureHarness = platformHarness('web');
  let clearSurfaceCount = 0;
  const contextFailurePlatform = createPlatformContract({
    ...contextFailureHarness.platform,
    createCanvas: () => ({
      width: 390,
      height: 844,
      getContext: () => null,
    }),
  });
  assert.throws(() => createArenaP1SupplyAcceptancePlatformHostResourcePort(
    contextFailurePlatform,
    Object.freeze({
      platformId: 'web',
      clearDom() { clearSurfaceCount += 1; },
    }),
  ), /构造失败/);
  assert.equal(clearSurfaceCount, 1);

  let guardedBundle: ArenaP1SupplyAcceptanceHostResourceBundle | null = null;
  let snapshotAttempted = false;
  const guardedHarness = platformHarness('web', {
    methods: {
      fillText() {
        if (snapshotAttempted) return;
        snapshotAttempted = true;
        try { guardedBundle?.getResourceSnapshot(); } catch { /* deliberately swallowed */ }
      },
    },
  });
  guardedBundle = resourceFactory('web', guardedHarness.platform);
  assert.throws(
    () => guardedBundle?.hostResourcePort.commit(hostCommit()),
    /重入后失败/,
  );
  assert.equal(guardedBundle.getResourceSnapshot().reentryCount, 1);
  guardedBundle.destroyAll();

  const supported = platformHarness('web').platform as unknown as Record<string, unknown>;
  const unsupported = Object.create(null) as Record<string, unknown>;
  for (const key of [
    'id',
    'createCanvas',
    'getViewport',
    'requestFrame',
    'cancelFrame',
    'onResize',
    'onShow',
    'onHide',
  ]) {
    Object.defineProperty(unsupported, key, {
      enumerable: true,
      value: key === 'id' ? 'browser' : supported[key],
    });
  }
  assert.throws(() => createArenaP1SupplyAcceptancePlatformHostResourcePort(
    unsupported as unknown as ArenaPlatformContract,
    { platformId: 'web' },
  ), /platform id|identity/);
});

test('PP3b treats hostile thrown values as opaque while retaining cleanup ownership', () => {
  function hostileThrowable() {
    let trapCalls = 0;
    const value = new Proxy(Object.create(null) as object, {
      get() { trapCalls += 1; throw new Error('hostile get trap'); },
      getPrototypeOf() { trapCalls += 1; throw new Error('hostile prototype trap'); },
      ownKeys() { trapCalls += 1; throw new Error('hostile ownKeys trap'); },
    });
    return { value, get trapCalls() { return trapCalls; } };
  }

  const platformFailure = hostileThrowable();
  const platformHarnessValue = platformHarness('web');
  const throwingPlatform = createPlatformContract({
    ...platformHarnessValue.platform,
    getViewport: () => { throw platformFailure.value; },
  });
  const platformBundle = resourceFactory('web', throwingPlatform);
  let observedPlatformFailure: unknown = null;
  try { platformBundle.hostResourcePort.commit(hostCommit()); } catch (error) {
    observedPlatformFailure = error;
  }
  assert.equal(observedPlatformFailure, platformFailure.value);
  assert.equal(platformFailure.trapCalls, 0);
  platformBundle.destroyAll();

  const cleanupFailure = hostileThrowable();
  let cleanupAttempts = 0;
  const cleanupHarness = platformHarness('web');
  const cleanupPlatform = createPlatformContract({
    ...cleanupHarness.platform,
    onResize() {
      return () => {
        cleanupAttempts += 1;
        if (cleanupAttempts === 1) throw cleanupFailure.value;
      };
    },
  });
  const cleanupBundle = resourceFactory('web', cleanupPlatform);
  let observedCleanupFailure: unknown = null;
  try { cleanupBundle.destroyAll(); } catch (error) { observedCleanupFailure = error; }
  assert.notEqual(observedCleanupFailure, null);
  assert.equal(cleanupFailure.trapCalls, 0);
  assert.equal(cleanupBundle.getResourceSnapshot().listenerCount, 1);
  cleanupBundle.destroyAll();
  assert.equal(cleanupBundle.getResourceSnapshot().listenerCount, 0);
  assert.equal(cleanupAttempts, 2);

  const primaryFailure = hostileThrowable();
  const nestedCleanupFailure = hostileThrowable();
  const constructorHarness = platformHarness('web');
  const constructorPlatform = createPlatformContract({
    ...constructorHarness.platform,
    onResize: () => () => { throw nestedCleanupFailure.value; },
    onShow: () => { throw primaryFailure.value; },
  });
  let constructorFailure: unknown = null;
  try {
    resourceFactory('web', constructorPlatform);
  } catch (error) {
    constructorFailure = error;
  }
  assert.notEqual(constructorFailure, null);
  assert.equal(
    (constructorFailure as { originalCause?: unknown }).originalCause,
    primaryFailure.value,
  );
  assert.equal(primaryFailure.trapCalls, 0);
  assert.equal(nestedCleanupFailure.trapCalls, 0);
});

test('PP3b startup retries an unreturned frame owner through async cleanup', () => {
  const harness = platformHarness('web', {
    synchronousFrame: true,
    cancelFrameFailureCount: 1,
  });
  assert.throws(
    () => startArenaP1SupplyAcceptanceWithPlatform(
      harness.platform,
      Object.freeze({ platformId: 'web' }),
    ),
    /同步|synchronous|启动失败/,
  );
  assert.equal(harness.cancelCount, 2);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.listeners.resize.size, 0);
  assert.equal(harness.listeners.show.size, 0);
  assert.equal(harness.listeners.hide.size, 0);
  assert.equal(harness.listenerCleanupCount, 3);
});

test('PP3b runtime startup failure closes host ownership without publishing a frame loop', () => {
  let failing = true;
  const harness = platformHarness('web', {
    methods: {
      fillRect() {
        if (failing) throw new Error('controlled initial host commit failure');
      },
    },
  });
  assert.throws(() => startArenaP1SupplyAcceptanceWithPlatform(
    harness.platform,
    Object.freeze({ platformId: 'web' }),
  ), /acceptance 启动失败/);
  failing = false;
  assert.equal(harness.listenerCleanupCount, 3);
  assert.equal(harness.cancelCount, 0);
  assert.equal(harness.frames.size, 0);
});

test('PP3b isolated build binds real dirty identity and cannot publish default or release artifacts', async () => {
  const protectedBefore = await Promise.all([
    directorySignature('dist/web'),
    directorySignature('dist/wechat'),
    directorySignature('dist/douyin'),
  ]);
  const dirtyBefore = repositoryDirty();
  const development = spawnSync(process.execPath, [
    '--import',
    'tsx',
    'scripts/build-arena-p1-supply-acceptance.ts',
    '--mode=development-isolated',
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      ARENA_BUILD_COMMIT: '0'.repeat(40),
      ARENA_BUILD_ID: 'forged-clean-build',
      ARENA_P1_SUPPLY_SOURCE_DIRTY: 'false',
    },
  });
  assert.equal(development.status, 0, development.stderr);
  assert.match(development.stdout, /mode=development-isolated/);
  assert.match(development.stdout, new RegExp(`sourceDirty=${String(dirtyBefore)}`));
  assert.equal(development.stdout.trim().split('\n').length, 1);
  assert.equal(development.stderr, '');

  const expectedFiles: Record<Target, readonly string[]> = {
    web: [
      BUILD_IDENTITY_FILENAME,
      'app.js',
      'arena-p1-supply-acceptance.css',
      'index.html',
    ],
    wechat: [BUILD_IDENTITY_FILENAME, 'game.js', 'game.json', 'project.config.json'],
    douyin: [BUILD_IDENTITY_FILENAME, 'game.js', 'game.json', 'project.config.json'],
  };
  const identityHashes: string[] = [];
  for (const target of TARGETS) {
    assert.deepEqual(
      (await readdir(path.join(OUTPUT_ROOT, target))).sort(),
      [...expectedFiles[target]].sort(),
    );
    const identityText = await readFile(
      path.join(OUTPUT_ROOT, target, BUILD_IDENTITY_FILENAME),
      'utf8',
    );
    identityHashes.push(sha256(identityText));
    const identity = JSON.parse(identityText) as Record<string, unknown>;
    assert.deepEqual({
      artifactId: identity.artifactId,
      buildMode: identity.buildMode,
      developmentIsolated: identity.developmentIsolated,
      cleanSourceAttested: identity.cleanSourceAttested,
      formalGate: identity.formalGate,
    }, {
      artifactId: 'arena.p1.supply.acceptance.isolated-build.v1',
      buildMode: 'development-isolated',
      developmentIsolated: true,
      cleanSourceAttested: false,
      formalGate: false,
    });
    const sourceIdentity = identity.sourceIdentity as Record<string, unknown>;
    assert.equal(sourceIdentity.sourceDirty, dirtyBefore);
    assert.match(sourceIdentity.headCommit as string, /^[0-9a-f]{40}$/);
    assert.match(sourceIdentity.repositoryFingerprint as string, SHA256_PATTERN);
    const targetIdentity = identity.target as Record<string, unknown>;
    assert.equal(targetIdentity.target, target);
    assert.match(targetIdentity.bundleSha256 as string, SHA256_PATTERN);
    const bundledInputs = targetIdentity.bundledInputs as Array<Record<string, unknown>>;
    assert.ok(bundledInputs.length > 0);
    assert.ok(bundledInputs.every((input) => (
      typeof input.path === 'string' && SHA256_PATTERN.test(input.sha256 as string)
    )));
    const directImports = targetIdentity.entryDirectImportPaths as string[];
    assert.ok(directImports.includes('src/entry/arena-p1-supply-acceptance-host.ts'));
    assert.equal(directImports.some((value) => /arena-session|arena-match|arena-presentation-runtime/.test(value)), false);
    const neutralImports = targetIdentity.neutralHostDirectImportPaths as string[];
    assert.ok(neutralImports.includes('src/entry/arena-p1-supply-acceptance-runtime.ts'));
    const bundleName = target === 'web' ? 'app.js' : 'game.js';
    const bundle = await readFile(path.join(OUTPUT_ROOT, target, bundleName), 'utf8');
    if (target === 'web') {
      assert.equal(
        /globalThis\.(?:wx|tt)\b|createWeChatPlatform|createDouyinPlatform|onTouchStart|createInnerAudioContext/.test(bundle),
        false,
        'Web bundle must not contain mini-game host APIs.',
      );
    } else {
      assert.equal(
        /\b(?:document|window|navigator)\b|createWebPlatform|#arena-p1/.test(bundle),
        false,
        `${target} bundle must not contain Web host APIs.`,
      );
    }
  }
  assert.equal(await stat(path.join(OUTPUT_ROOT, 'arena-build-manifest.json')).then(
    () => true,
    () => false,
  ), false);
  assert.deepEqual(await Promise.all([
    directorySignature('dist/web'),
    directorySignature('dist/wechat'),
    directorySignature('dist/douyin'),
  ]), protectedBefore);

  const formal = spawnSync(process.execPath, [
    '--import',
    'tsx',
    'scripts/build-arena-p1-supply-acceptance.ts',
    '--mode=formal-clean-evidence',
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (dirtyBefore) {
    assert.notEqual(formal.status, 0);
    assert.match(formal.stderr, /拒绝 dirty source/);
    const afterFailureHashes = await Promise.all(TARGETS.map(async (target) => sha256(await readFile(
      path.join(OUTPUT_ROOT, target, BUILD_IDENTITY_FILENAME),
      'utf8',
    ))));
    assert.deepEqual(afterFailureHashes, identityHashes);
  } else {
    assert.equal(formal.status, 0, formal.stderr);
    for (const target of TARGETS) {
      const identity = JSON.parse(await readFile(
        path.join(OUTPUT_ROOT, target, BUILD_IDENTITY_FILENAME),
        'utf8',
      )) as Record<string, unknown>;
      assert.equal(identity.cleanSourceAttested, true);
      assert.equal(identity.formalGate, false);
    }
  }
});

test('PP3b formal clean build emits PP2-compatible build artifacts without claiming device READY', async () => {
  const fixture = await createCleanBuildFixture();
  try {
    const formal = spawnSync(process.execPath, [
      '--import',
      'tsx',
      'scripts/build-arena-p1-supply-acceptance.ts',
      '--mode=formal-clean-evidence',
    ], {
      cwd: fixture.root,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        ARENA_BUILD_COMMIT: '0'.repeat(40),
        ARENA_BUILD_ID: 'forged-formal-build',
        ARENA_P1_SUPPLY_SOURCE_DIRTY: 'false',
      },
    });
    assert.equal(formal.status, 0, formal.stderr);
    assert.equal(formal.stderr, '');
    assert.equal(formal.stdout.trim().split('\n').length, 1);
    assert.match(formal.stdout, /mode=formal-clean-evidence; sourceDirty=false/);

    const outputRoot = path.join(fixture.root, 'dist', 'arena-p1-supply-acceptance');
    const index = JSON.parse(await readFile(
      path.join(outputRoot, FORMAL_INDEX_PATH),
      'utf8',
    )) as Record<string, unknown>;
    assert.deepEqual({
      schemaVersion: index.schemaVersion,
      purpose: index.purpose,
      formalGate: index.formalGate,
      deviceEvidenceStatus: index.deviceEvidenceStatus,
      sourceDirty: index.sourceDirty,
    }, {
      schemaVersion: 1,
      purpose: 'p1-supply-acceptance-formal-build-index',
      formalGate: false,
      deviceEvidenceStatus: 'not-run',
      sourceDirty: false,
    });
    assert.deepEqual((await readdir(outputRoot)).sort(), [...TARGETS].sort());
    assert.equal(await stat(path.join(outputRoot, 'shared')).then(
      () => true,
      () => false,
    ), false);
    const expected = index.expectedIdentity as Record<string, unknown>;
    assert.match(expected.commit as string, /^[0-9a-f]{40}$/);
    assert.notEqual(expected.commit, '0'.repeat(40));
    assert.match(expected.repositoryFingerprint as string, SHA256_PATTERN);
    assert.equal(typeof expected.buildId, 'string');
    assert.notEqual(expected.buildId, 'forged-formal-build');

    const platformArtifacts = index.platformArtifacts as Record<
      Target,
      Record<string, string>
    >;
    const attestations: ArenaP1SupplyAcceptanceBuildAttestationV1[] = [];
    const rolePathHashes = new Map<string, string>();
    const sharedRolePaths = new Map<string, Set<string>>();
    for (const target of TARGETS) {
      const descriptor = platformArtifacts[target];
      assert.ok(descriptor);
      const attestationPath = descriptor.attestationPath;
      const artifactManifestPath = descriptor.artifactManifestPath;
      if (typeof attestationPath !== 'string' || typeof artifactManifestPath !== 'string') {
        throw new TypeError(`P1 supply ${target} formal artifact paths 无效。`);
      }
      const rawAttestation = JSON.parse(await readFile(
        path.join(outputRoot, attestationPath),
        'utf8',
      )) as unknown;
      const attestation = createArenaP1SupplyAcceptanceBuildAttestationV1(rawAttestation);
      attestations.push(attestation);
      assert.equal(attestation.platform, target);
      assert.equal(attestation.sourceDirty, false);
      assert.equal(attestation.commit, expected.commit);
      assert.equal(attestation.repositoryFingerprint, expected.repositoryFingerprint);
      assert.equal(attestation.buildId, expected.buildId);
      assert.equal(attestation.attestationHash, canonicalAttestationHash(attestation));
      assert.equal(
        attestation.attestationHash,
        (expected.platformAttestationHashes as Record<Target, string>)[target],
      );

      const manifestBytes = await readFile(path.join(outputRoot, artifactManifestPath));
      assert.equal(sha256(manifestBytes), attestation.artifactManifestHash);
      const manifest = JSON.parse(manifestBytes.toString('utf8')) as Record<string, unknown>;
      assert.deepEqual(Object.keys(manifest).sort(), [
        'artifacts',
        'platform',
        'purpose',
        'schemaVersion',
      ]);
      assert.equal(manifest.schemaVersion, 1);
      assert.equal(manifest.purpose, 'p1-supply-acceptance-artifact-manifest');
      assert.equal(manifest.platform, target);
      const entries = manifest.artifacts as Array<Record<string, unknown>>;
      assert.deepEqual(entries.map(({ role }) => role), [
        'adapter-module',
        'asset-manifest',
        'harness-module',
        'production-reachability-audit',
      ]);
      const expectedRoleHashes: Record<string, string> = {
        'adapter-module': attestation.adapterModuleHash,
        'asset-manifest': attestation.assetManifestHash,
        'harness-module': attestation.harnessModuleHash,
        'production-reachability-audit': attestation.productionReachabilityAuditHash,
      };
      for (const entry of entries) {
        assert.deepEqual(Object.keys(entry).sort(), ['byteLength', 'path', 'role', 'sha256']);
        const relativePath = entry.path as string;
        const bytes = await readFile(path.join(outputRoot, relativePath));
        assert.equal(bytes.byteLength, entry.byteLength);
        assert.equal(sha256(bytes), entry.sha256);
        assert.equal(entry.sha256, expectedRoleHashes[entry.role as string]);
        const previous = rolePathHashes.get(relativePath);
        if (previous !== undefined) assert.equal(previous, entry.sha256);
        rolePathHashes.set(relativePath, entry.sha256 as string);
        const paths = sharedRolePaths.get(entry.role as string) ?? new Set<string>();
        paths.add(relativePath);
        sharedRolePaths.set(entry.role as string, paths);
      }

      const identity = JSON.parse(await readFile(
        path.join(outputRoot, target, BUILD_IDENTITY_FILENAME),
        'utf8',
      )) as Record<string, unknown>;
      assert.equal(identity.formalGate, false);
      assert.equal(identity.cleanSourceAttested, true);
      assert.equal(identity.buildId, expected.buildId);
      const sourceIdentity = identity.sourceIdentity as Record<string, unknown>;
      assert.equal(sourceIdentity.sourceDirty, false);
      const sourceFiles = sourceIdentity.sourceFiles as Array<Record<string, unknown>>;
      const a1Source = sourceFiles.find(({ path: sourcePath }) => (
        sourcePath === A1_MANIFEST_SOURCE_PATH
      ));
      assert.ok(a1Source);
      assert.match(a1Source.sha256 as string, SHA256_PATTERN);
      const targetIdentity = identity.target as Record<string, unknown>;
      const bundledInputs = targetIdentity.bundledInputs as Array<Record<string, unknown>>;
      assert.ok(bundledInputs.length > 0);
      const adapterInput = bundledInputs.find(({ path: inputPath }) => (
        inputPath === 'packages/arena-presentation-runtime/dist/arena-supply-presentation-adapter.js'
      ));
      assert.ok(adapterInput);
      assert.equal(adapterInput.sha256, expected.adapterModuleHash);
    }

    assert.equal(new Set(attestations.map(({ commit }) => commit)).size, 1);
    assert.equal(new Set(attestations.map(({ repositoryFingerprint }) => repositoryFingerprint)).size, 1);
    assert.equal(new Set(attestations.map(({ buildId }) => buildId)).size, 1);
    assert.equal(new Set(attestations.map(({ adapterModuleHash }) => adapterModuleHash)).size, 1);
    assert.equal(new Set(attestations.map(({ assetManifestHash }) => assetManifestHash)).size, 1);
    assert.equal(new Set(attestations.map(({ harnessModuleHash }) => harnessModuleHash)).size, 3);
    assert.equal(new Set(attestations.map(({ attestationHash }) => attestationHash)).size, 3);
    assert.equal(sharedRolePaths.get('adapter-module')?.size, 1);
    assert.equal(sharedRolePaths.get('asset-manifest')?.size, 1);
    assert.equal(sharedRolePaths.get('production-reachability-audit')?.size, 1);
    assert.equal(sharedRolePaths.get('harness-module')?.size, 3);
    const assetManifestPath = [...(sharedRolePaths.get('asset-manifest') ?? [])][0];
    assert.ok(assetManifestPath);
    assert.match(assetManifestPath, /^web\/shared\//);
    const formalA1Bytes = await readFile(path.join(outputRoot, assetManifestPath));
    const sourceA1Bytes = await readFile(path.join(fixture.root, A1_MANIFEST_SOURCE_PATH));
    assert.equal(sha256(formalA1Bytes), sha256(sourceA1Bytes));
    assert.equal(sha256(formalA1Bytes), expected.assetManifestHash);
    assert.equal(
      attestations.every(({ assetManifestHash }) => (
        assetManifestHash === sha256(sourceA1Bytes)
      )),
      true,
    );
    for (const role of ['adapter-module', 'production-reachability-audit'] as const) {
      const artifactPath = [...(sharedRolePaths.get(role) ?? [])][0];
      assert.ok(artifactPath);
      assert.match(artifactPath, /^web\/shared\//);
    }
    const hashToPath = new Map<string, string>();
    for (const [artifactPath, artifactHash] of rolePathHashes) {
      const previous = hashToPath.get(artifactHash);
      if (previous !== undefined) assert.equal(previous, artifactPath);
      hashToPath.set(artifactHash, artifactPath);
    }

    const reachabilityPath = [...(sharedRolePaths.get(
      'production-reachability-audit',
    ) ?? [])][0];
    assert.ok(reachabilityPath);
    const reachability = JSON.parse(await readFile(
      path.join(outputRoot, reachabilityPath),
      'utf8',
    )) as Record<string, unknown>;
    assert.deepEqual(Object.keys(reachability).sort(), [
      'auditedProductionEntries',
      'auditedReleaseArtifacts',
      'buildId',
      'commit',
      'defaultProductReachable',
      'purpose',
      'releaseArtifactReachable',
      'repositoryFingerprint',
      'schemaVersion',
    ]);
    assert.equal(reachability.defaultProductReachable, false);
    assert.equal(reachability.releaseArtifactReachable, false);
    assert.equal(reachability.commit, expected.commit);
    assert.equal(reachability.repositoryFingerprint, expected.repositoryFingerprint);
    assert.equal(reachability.buildId, expected.buildId);

    const allJson = await Promise.all([
      readFile(path.join(outputRoot, FORMAL_INDEX_PATH), 'utf8'),
      ...TARGETS.map((target) => readFile(
        path.join(outputRoot, target, BUILD_IDENTITY_FILENAME),
        'utf8',
      )),
    ]);
    assert.doesNotMatch(allJson.join('\n'), /"formalGate"\s*:\s*true|"deviceEvidenceStatus"\s*:\s*"ready"/i);
  } finally {
    await fixture.cleanup();
  }
});
