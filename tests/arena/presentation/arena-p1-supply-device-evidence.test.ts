import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
  ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION,
  ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT,
  ARENA_DEVICE_ACCEPTANCE_RECORD_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_PURPOSE,
  ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_SCHEMA_VERSION,
  ARENA_P1_SUPPLY_DEVICE_ACCEPTANCE_V1_ID,
  ARENA_P1_SUPPLY_DEVICE_CHECK_ID,
  ARENA_P1_SUPPLY_DEVICE_TARGET_ID,
  createArenaP1SupplyAcceptanceBuildAttestationV1,
  createArenaP1SupplyDeviceAcceptanceV1Definition,
} from '../../../packages/arena-device-acceptance/src/arena-p1-supply-device-acceptance-v1.js';
import {
  verifyArenaP1SupplyDeviceEvidence,
} from '../../../scripts/lib/arena-p1-supply-device-evidence-verifier.js';

const COMMIT = 'a'.repeat(40);
const REPOSITORY_FINGERPRINT = 'b'.repeat(64);
const BUILD_ID = 'arena-p1-supply-acceptance-build-001';
const PERFORMED_AT = '2026-08-03T12:00:00.000Z';
const PLATFORM_IDS = Object.freeze(['web', 'wechat', 'douyin'] as const);
type PlatformId = typeof PLATFORM_IDS[number];

interface StoredArtifact {
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
}

interface CorpusOptions {
  readonly adapterSource?: string;
  readonly sourceDirty?: boolean;
  readonly defaultProductReachable?: boolean;
  readonly releaseArtifactReachable?: boolean;
}

interface Corpus {
  readonly root: string;
  readonly bundleValue: Record<string, unknown>;
  readonly expectedIdentity: Record<string, unknown>;
  readonly attestations: Readonly<Record<PlatformId, Record<string, unknown>>>;
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalAttestationHash(value: Readonly<Record<string, unknown>>): string {
  const payload = {
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
  };
  return sha256(JSON.stringify(payload));
}

async function store(
  root: string,
  relativePath: string,
  content: string,
): Promise<StoredArtifact> {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
  return Object.freeze({
    path: relativePath,
    sha256: sha256(content),
    byteLength: Buffer.byteLength(content),
  });
}

function artifact(
  id: string,
  kind: string,
  stored: StoredArtifact,
): Record<string, unknown> {
  return {
    id,
    kind,
    path: stored.path,
    sha256: stored.sha256,
    byteLength: stored.byteLength,
  };
}

function platformForTarget(targetId: string): PlatformId {
  if (targetId === ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WEB_BROWSER) return 'web';
  if (targetId.startsWith('wechat-')) return 'wechat';
  return 'douyin';
}

function clientForTarget(targetId: string): Record<string, unknown> {
  const platform = platformForTarget(targetId);
  return {
    name: platform === 'web' ? 'P1 acceptance browser' : `${platform} acceptance client`,
    version: '1.0.0',
    baseLibraryVersion: platform === 'web' ? null : '3.7.10',
  };
}

function deviceForTarget(targetId: string): Record<string, unknown> {
  if (targetId.endsWith('developer-tool')) {
    return { manufacturer: 'Apple', model: 'MacBook Pro', osName: 'macOS', osVersion: '15.0' };
  }
  if (targetId.endsWith('ios-phone')) {
    return { manufacturer: 'Apple', model: 'iPhone', osName: 'iOS', osVersion: '19.0' };
  }
  if (targetId.endsWith('android-phone')) {
    return { manufacturer: 'TestVendor', model: 'Android Phone', osName: 'Android', osVersion: '16' };
  }
  return { manufacturer: 'Browser Matrix', model: '390x844 + 1440x900', osName: 'Web', osVersion: '1' };
}

async function createCorpus(options: CorpusOptions = {}): Promise<Corpus> {
  const root = await realpath(await mkdtemp(path.join(
    os.tmpdir(),
    'arena-p1-supply-device-',
  )));
  const adapter = await store(
    root,
    'shared/arena-supply-presentation-adapter.js',
    options.adapterSource ?? 'export const adapterVersion = 1;\n',
  );
  const assets = await store(
    root,
    'shared/arena-supply-assets.json',
    `${JSON.stringify({ schemaVersion: 1, assets: ['marker', 'cue', 'fallback'] })}\n`,
  );
  const reachabilityValue = {
    schemaVersion: 1,
    purpose: 'p1-supply-production-reachability-audit',
    commit: COMMIT,
    repositoryFingerprint: REPOSITORY_FINGERPRINT,
    buildId: BUILD_ID,
    defaultProductReachable: options.defaultProductReachable ?? false,
    releaseArtifactReachable: options.releaseArtifactReachable ?? false,
    auditedProductionEntries: ['src/entry/product.ts'],
    auditedReleaseArtifacts: ['dist/douyin/game.js', 'dist/web/index.js', 'dist/wechat/game.js'],
  };
  const reachability = await store(
    root,
    'shared/production-reachability-audit.json',
    `${JSON.stringify(reachabilityValue)}\n`,
  );
  const harnesses = {} as Record<PlatformId, StoredArtifact>;
  for (const platform of PLATFORM_IDS) {
    harnesses[platform] = await store(
      root,
      `build/${platform}/arena-p1-supply-acceptance.js`,
      `export const platform = ${JSON.stringify(platform)};\n`,
    );
  }

  const artifactManifests = {} as Record<PlatformId, StoredArtifact>;
  for (const platform of PLATFORM_IDS) {
    artifactManifests[platform] = await store(
      root,
      `build/${platform}/arena-p1-supply-artifact-manifest-v1.json`,
      `${JSON.stringify({
        schemaVersion: 1,
        purpose: 'p1-supply-acceptance-artifact-manifest',
        platform,
        artifacts: [
          { role: 'adapter-module', ...adapter },
          { role: 'asset-manifest', ...assets },
          { role: 'harness-module', ...harnesses[platform] },
          { role: 'production-reachability-audit', ...reachability },
        ],
      })}\n`,
    );
  }

  const attestations = {} as Record<PlatformId, Record<string, unknown>>;
  const attestationArtifacts = {} as Record<PlatformId, StoredArtifact>;
  for (const platform of PLATFORM_IDS) {
    const withoutHash = {
      schemaVersion: ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_SCHEMA_VERSION,
      purpose: ARENA_P1_SUPPLY_ACCEPTANCE_BUILD_ATTESTATION_PURPOSE,
      commit: COMMIT,
      sourceDirty: options.sourceDirty ?? false,
      repositoryFingerprint: REPOSITORY_FINGERPRINT,
      buildId: BUILD_ID,
      platform,
      adapterModuleHash: adapter.sha256,
      harnessModuleHash: harnesses[platform].sha256,
      productionReachabilityAuditHash: reachability.sha256,
      assetManifestHash: assets.sha256,
      artifactManifestHash: artifactManifests[platform].sha256,
    };
    const attestation = {
      ...withoutHash,
      attestationHash: canonicalAttestationHash(withoutHash),
    };
    attestations[platform] = attestation;
    attestationArtifacts[platform] = await store(
      root,
      `build/${platform}/arena-p1-supply-build-attestation-v1.json`,
      `${JSON.stringify(attestation)}\n`,
    );
  }

  const targetIds = Object.values(ARENA_P1_SUPPLY_DEVICE_TARGET_ID);
  const ownerTargetByPlatform: Readonly<Record<PlatformId, string>> = {
    web: ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WEB_BROWSER,
    wechat: ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WECHAT_DEVELOPER_TOOL,
    douyin: ARENA_P1_SUPPLY_DEVICE_TARGET_ID.DOUYIN_DEVELOPER_TOOL,
  };
  const records: Record<string, unknown>[] = [];
  for (const targetId of targetIds) {
    const platform = platformForTarget(targetId);
    const runId = `run-${targetId}`;
    const screen = await store(root, `${runId}/screen.png`, `screen:${targetId}`);
    const video = await store(root, `${runId}/video.mp4`, `video:${targetId}`);
    const log = await store(root, `${runId}/acceptance.json`, `${JSON.stringify({
      schemaVersion: 1,
      purpose: 'p1-supply-device-run-evidence',
      commit: COMMIT,
      buildId: BUILD_ID,
      targetId,
      runId,
      checkIds: [...Object.values(ARENA_P1_SUPPLY_DEVICE_CHECK_ID)].sort(),
      resourcePeaks: {
        markerCount: 3,
        pendingReplacementPairCount: 3,
        recentEventHashCount: 64,
        voiceCount: 2,
        particleCount: 6,
        listenerCount: 4,
        gpuHandleCount: 3,
        asyncCallbackCount: 1,
      },
      cleanup: {
        destroyCallCount: 2,
        markerCount: 0,
        pendingReplacementPairCount: 0,
        recentEventHashCount: 0,
        voiceCount: 0,
        particleCount: 0,
        listenerCount: 0,
        gpuHandleCount: 0,
        asyncCallbackCount: 0,
      },
    })}\n`);
    const artifacts: Record<string, unknown>[] = [
      artifact('build-attestation', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST, attestationArtifacts[platform]),
      artifact('screen', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT, screen),
      artifact('video', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO, video),
      artifact('acceptance-log', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG, log),
    ];
    if (targetId === ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WEB_BROWSER) {
      const narrowScreen = await store(root, `${runId}/390x844.png`, 'screen:web:390x844');
      const narrowVideo = await store(root, `${runId}/390x844.mp4`, 'video:web:390x844');
      const wideScreen = await store(root, `${runId}/1440x900.png`, 'screen:web:1440x900');
      const wideVideo = await store(root, `${runId}/1440x900.mp4`, 'video:web:1440x900');
      artifacts.splice(1, 2,
        artifact('web-390x844-screenshot', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT, narrowScreen),
        artifact('web-390x844-video', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO, narrowVideo),
        artifact('web-1440x900-screenshot', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT, wideScreen),
        artifact('web-1440x900-video', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO, wideVideo));
    }
    if (ownerTargetByPlatform[platform] === targetId) {
      artifacts.push(
        artifact('artifact-manifest', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG, artifactManifests[platform]),
        artifact('harness-module', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG, harnesses[platform]),
      );
    }
    if (targetId === ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WEB_BROWSER) {
      artifacts.push(
        artifact('adapter-module', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG, adapter),
        artifact('asset-manifest', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG, assets),
        artifact('production-reachability-audit', ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG, reachability),
      );
    }
    const artifactIds = artifacts.map(({ id }) => id as string);
    records.push({
      schemaVersion: ARENA_DEVICE_ACCEPTANCE_RECORD_SCHEMA_VERSION,
      recordId: `record-${targetId}`,
      definitionId: ARENA_P1_SUPPLY_DEVICE_ACCEPTANCE_V1_ID,
      definitionHash: createArenaP1SupplyDeviceAcceptanceV1Definition().getContentHash(),
      commit: COMMIT,
      buildId: BUILD_ID,
      targetId,
      runId,
      performedAt: PERFORMED_AT,
      operatorId: 'operator-p1-supply',
      client: clientForTarget(targetId),
      device: deviceForTarget(targetId),
      orientation: 'portrait',
      inputMode: 'touch',
      checks: Object.values(ARENA_P1_SUPPLY_DEVICE_CHECK_ID).map((id) => ({
        id,
        result: ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT.PASSED,
        notes: `${id} verified`,
        artifactIds,
      })),
      artifacts,
    });
  }
  const bundleValue = {
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION,
    definitionId: ARENA_P1_SUPPLY_DEVICE_ACCEPTANCE_V1_ID,
    definitionHash: createArenaP1SupplyDeviceAcceptanceV1Definition().getContentHash(),
    commit: COMMIT,
    buildId: BUILD_ID,
    createdAt: PERFORMED_AT,
    records,
  };
  const expectedIdentity = {
    commit: COMMIT,
    repositoryFingerprint: REPOSITORY_FINGERPRINT,
    buildId: BUILD_ID,
    adapterModuleHash: adapter.sha256,
    assetManifestHash: assets.sha256,
    productionReachabilityAuditHash: reachability.sha256,
    platformAttestationHashes: Object.fromEntries(PLATFORM_IDS.map((platform) => [
      platform,
      attestations[platform].attestationHash,
    ])),
  };
  return { root, bundleValue, expectedIdentity, attestations };
}

function records(corpus: Corpus): Record<string, unknown>[] {
  return corpus.bundleValue.records as Record<string, unknown>[];
}

function artifacts(record: Record<string, unknown>): Record<string, unknown>[] {
  return record.artifacts as Record<string, unknown>[];
}

async function rewriteAttestation(
  corpus: Corpus,
  platform: PlatformId,
  value: Record<string, unknown>,
): Promise<void> {
  const targetRecords = records(corpus).filter((record) => (
    platformForTarget(record.targetId as string) === platform
  ));
  const buildArtifacts = targetRecords.map((record) => (
    artifacts(record).find(({ id }) => id === 'build-attestation')
  ));
  const first = buildArtifacts[0];
  assert.ok(first);
  const filePath = path.join(corpus.root, first.path as string);
  const content = `${JSON.stringify(value)}\n`;
  await writeFile(filePath, content, 'utf8');
  for (const current of buildArtifacts) {
    assert.ok(current);
    current.sha256 = sha256(content);
    current.byteLength = Buffer.byteLength(content);
  }
}

async function rewriteArtifactManifest(
  corpus: Corpus,
  platform: PlatformId,
  value: Record<string, unknown>,
): Promise<void> {
  const ownerTargetId = platform === 'web'
    ? ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WEB_BROWSER
    : platform === 'wechat'
      ? ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WECHAT_DEVELOPER_TOOL
      : ARENA_P1_SUPPLY_DEVICE_TARGET_ID.DOUYIN_DEVELOPER_TOOL;
  const owner = records(corpus).find(({ targetId }) => targetId === ownerTargetId);
  assert.ok(owner);
  const manifestArtifact = artifacts(owner).find(({ id }) => id === 'artifact-manifest');
  assert.ok(manifestArtifact);
  const content = `${JSON.stringify(value)}\n`;
  await writeFile(path.join(corpus.root, manifestArtifact.path as string), content, 'utf8');
  manifestArtifact.sha256 = sha256(content);
  manifestArtifact.byteLength = Buffer.byteLength(content);
  const attestation = corpus.attestations[platform];
  const updated: Record<string, unknown> = {
    ...attestation,
    artifactManifestHash: manifestArtifact.sha256,
  };
  updated.attestationHash = canonicalAttestationHash(updated);
  Object.assign(attestation, updated);
  await rewriteAttestation(corpus, platform, updated);
  const platformHashes = corpus.expectedIdentity.platformAttestationHashes as Record<string, string>;
  platformHashes[platform] = updated.attestationHash as string;
}

test('P1 supply device definition freezes exactly eleven checks and seven targets', () => {
  const definition = createArenaP1SupplyDeviceAcceptanceV1Definition();
  assert.equal(definition.id, ARENA_P1_SUPPLY_DEVICE_ACCEPTANCE_V1_ID);
  assert.equal(definition.checks.length, 11);
  assert.equal(definition.targets.length, 7);
  assert.deepEqual(
    definition.checks.map(({ id }) => id),
    [...Object.values(ARENA_P1_SUPPLY_DEVICE_CHECK_ID)].sort(),
  );
  assert.deepEqual(
    definition.targets.map(({ id }) => id),
    [...Object.values(ARENA_P1_SUPPLY_DEVICE_TARGET_ID)].sort(),
  );
  assert.ok(definition.targets.every(({ requiredCheckIds }) => requiredCheckIds.length === 11));
  assert.ok(Object.isFrozen(definition));
});

test('P1 build attestation is exact, frozen, clean and accessor-safe', () => {
  const value = {
    schemaVersion: 1,
    purpose: 'p1-supply-acceptance',
    commit: COMMIT,
    sourceDirty: false,
    repositoryFingerprint: '1'.repeat(64),
    buildId: BUILD_ID,
    platform: 'web',
    adapterModuleHash: '2'.repeat(64),
    harnessModuleHash: '3'.repeat(64),
    productionReachabilityAuditHash: '4'.repeat(64),
    assetManifestHash: '5'.repeat(64),
    artifactManifestHash: '6'.repeat(64),
    attestationHash: '7'.repeat(64),
  };
  assert.deepEqual(createArenaP1SupplyAcceptanceBuildAttestationV1(value), value);
  assert.ok(Object.isFrozen(createArenaP1SupplyAcceptanceBuildAttestationV1(value)));
  for (const patch of [
    { schemaVersion: 2 },
    { purpose: 'arena-product' },
    { sourceDirty: true },
    { commit: 'a' },
    { adapterModuleHash: 'a' },
    { platform: 'ios' },
    { extra: true },
  ]) {
    assert.throws(() => createArenaP1SupplyAcceptanceBuildAttestationV1({
      ...value,
      ...patch,
    }));
  }
  const missing = { ...value } as Record<string, unknown>;
  delete missing.assetManifestHash;
  assert.throws(() => createArenaP1SupplyAcceptanceBuildAttestationV1(missing));
  let getterCalls = 0;
  const accessor = { ...value };
  Object.defineProperty(accessor, 'platform', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 'web';
    },
  });
  assert.throws(() => createArenaP1SupplyAcceptanceBuildAttestationV1(accessor));
  assert.equal(getterCalls, 0);
  let proxyGets = 0;
  const proxy = new Proxy(value, {
    get(target, key, receiver) {
      proxyGets += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  assert.doesNotThrow(() => createArenaP1SupplyAcceptanceBuildAttestationV1(proxy));
  assert.equal(proxyGets, 0);
});

test('P1 verifier accepts one clean, content-addressed seven-target corpus', async (t) => {
  const corpus = await createCorpus();
  t.after(() => rm(corpus.root, { recursive: true, force: true }));
  const result = await verifyArenaP1SupplyDeviceEvidence({
    bundleValue: corpus.bundleValue,
    artifactsRoot: corpus.root,
    expectedIdentity: corpus.expectedIdentity,
  });
  assert.equal(result.report.status, 'ready');
  assert.equal(result.bundle.records.length, 7);
  assert.deepEqual(result.attestations.map(({ platform }) => platform), PLATFORM_IDS);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.attestations));
});

test('P1 verifier rejects missing viewport, target and invalid attestation hash', async (t) => {
  const corpus = await createCorpus();
  t.after(() => rm(corpus.root, { recursive: true, force: true }));
  const web = records(corpus).find(({ targetId }) => (
    targetId === ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WEB_BROWSER
  ));
  assert.ok(web);
  web.artifacts = artifacts(web).filter(({ id }) => id !== 'web-1440x900-video');
  for (const check of web.checks as Record<string, unknown>[]) {
    check.artifactIds = (check.artifactIds as string[]).filter((id) => id !== 'web-1440x900-video');
  }
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: corpus.bundleValue,
    artifactsRoot: corpus.root,
    expectedIdentity: corpus.expectedIdentity,
  }), /1440x900/);

  const missingTarget = await createCorpus();
  t.after(() => rm(missingTarget.root, { recursive: true, force: true }));
  missingTarget.bundleValue.records = records(missingTarget).slice(0, -1);
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: missingTarget.bundleValue,
    artifactsRoot: missingTarget.root,
    expectedIdentity: missingTarget.expectedIdentity,
  }), /七个|7|target/i);

  const invalidHash = await createCorpus();
  t.after(() => rm(invalidHash.root, { recursive: true, force: true }));
  await rewriteAttestation(invalidHash, 'web', {
    ...invalidHash.attestations.web,
    attestationHash: '0'.repeat(64),
  });
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: invalidHash.bundleValue,
    artifactsRoot: invalidHash.root,
    expectedIdentity: {
      ...invalidHash.expectedIdentity,
      platformAttestationHashes: {
        ...(invalidHash.expectedIdentity.platformAttestationHashes as Record<string, string>),
        web: '0'.repeat(64),
      },
    },
  }), /attestationHash|重算/i);
});

test('P1 verifier rejects artifact tamper and coherent corpus substitution', async (t) => {
  const corpus = await createCorpus();
  t.after(() => rm(corpus.root, { recursive: true, force: true }));
  const firstArtifact = artifacts(records(corpus)[0] as Record<string, unknown>)
    .find(({ id }) => id === 'acceptance-log');
  assert.ok(firstArtifact);
  await writeFile(path.join(corpus.root, firstArtifact.path as string), 'tampered', 'utf8');
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: corpus.bundleValue,
    artifactsRoot: corpus.root,
    expectedIdentity: corpus.expectedIdentity,
  }), /大小|SHA-256|变化/);

  const coherent = await createCorpus({ adapterSource: 'export const adapterVersion = 2;\n' });
  t.after(() => rm(coherent.root, { recursive: true, force: true }));
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: coherent.bundleValue,
    artifactsRoot: coherent.root,
    expectedIdentity: corpus.expectedIdentity,
  }), /adapterModuleHash|clean identity|预期/i);
});

test('P1 verifier requires per-check media bindings and zero-resource cleanup logs', async (t) => {
  const weakBinding = await createCorpus();
  t.after(() => rm(weakBinding.root, { recursive: true, force: true }));
  const record = records(weakBinding)[0] as Record<string, unknown>;
  const firstCheck = (record.checks as Record<string, unknown>[])[0] as Record<string, unknown>;
  firstCheck.artifactIds = ['build-attestation'];
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: weakBinding.bundleValue,
    artifactsRoot: weakBinding.root,
    expectedIdentity: weakBinding.expectedIdentity,
  }), /内容寻址日志、截图和录像/);

  const leakedCleanup = await createCorpus();
  t.after(() => rm(leakedCleanup.root, { recursive: true, force: true }));
  const leakedRecord = records(leakedCleanup)[0] as Record<string, unknown>;
  const logArtifact = artifacts(leakedRecord).find(({ id }) => id === 'acceptance-log');
  assert.ok(logArtifact);
  const logPath = path.join(leakedCleanup.root, logArtifact.path as string);
  const log = JSON.parse(await readFile(logPath, 'utf8')) as Record<string, unknown>;
  (log.cleanup as Record<string, unknown>).voiceCount = 1;
  const content = `${JSON.stringify(log)}\n`;
  await writeFile(logPath, content, 'utf8');
  logArtifact.sha256 = sha256(content);
  logArtifact.byteLength = Buffer.byteLength(content);
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: leakedCleanup.bundleValue,
    artifactsRoot: leakedCleanup.root,
    expectedIdentity: leakedCleanup.expectedIdentity,
  }), /资源必须全部归零/);
});

test('P1 verifier rejects traversal and every symlinked artifact path', async (t) => {
  const verifierSource = await readFile(new URL(
    '../../../scripts/lib/arena-p1-supply-device-evidence-verifier.ts',
    import.meta.url,
  ), 'utf8');
  const rootAssertionStart = verifierSource.indexOf(
    'async function assertRootIdentity(identity: RootIdentity): Promise<void> {',
  );
  const rootAssertionEnd = verifierSource.indexOf(
    '\nasync function captureNoSymlinkPath(',
    rootAssertionStart,
  );
  assert.ok(rootAssertionStart >= 0 && rootAssertionEnd > rootAssertionStart);
  const rootAssertion = verifierSource.slice(rootAssertionStart, rootAssertionEnd);
  const beforeLstat = rootAssertion.indexOf('lstatEvidenceRoot(identity.lexicalPath, \'复核前\')');
  const resolvedPath = rootAssertion.indexOf('realpathEvidenceRoot(identity.lexicalPath');
  const afterLstat = rootAssertion.indexOf('lstatEvidenceRoot(identity.lexicalPath, \'复核解析后\')');
  assert.ok(beforeLstat >= 0);
  assert.ok(resolvedPath > beforeLstat);
  assert.ok(afterLstat > resolvedPath);
  assert.match(rootAssertion, /samePathState\(identity\.state, beforeState\)/);
  assert.match(rootAssertion, /samePathState\(identity\.state, afterState\)/);
  assert.match(rootAssertion, /samePathState\(beforeState, afterState\)/);

  const traversal = await createCorpus();
  t.after(() => rm(traversal.root, { recursive: true, force: true }));
  const traversalArtifact = artifacts(records(traversal)[0] as Record<string, unknown>)[0];
  assert.ok(traversalArtifact);
  traversalArtifact.path = '../escape.json';
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: traversal.bundleValue,
    artifactsRoot: traversal.root,
    expectedIdentity: traversal.expectedIdentity,
  }), /相对路径|\.\.|逃逸/);

  const finalLink = await createCorpus();
  t.after(() => rm(finalLink.root, { recursive: true, force: true }));
  const linked = artifacts(records(finalLink)[0] as Record<string, unknown>)
    .find(({ id }) => id === 'acceptance-log');
  assert.ok(linked);
  const linkedPath = path.join(finalLink.root, linked.path as string);
  const linkedBytes = await readFile(linkedPath);
  const targetPath = path.join(finalLink.root, 'shared/symlink-target.log');
  await writeFile(targetPath, linkedBytes);
  await rm(linkedPath);
  await symlink(targetPath, linkedPath);
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: finalLink.bundleValue,
    artifactsRoot: finalLink.root,
    expectedIdentity: finalLink.expectedIdentity,
  }), /符号链接/);

  const parentLink = await createCorpus();
  t.after(() => rm(parentLink.root, { recursive: true, force: true }));
  const parentLinked = artifacts(records(parentLink)[0] as Record<string, unknown>)
    .find(({ id }) => id === 'acceptance-log');
  assert.ok(parentLinked);
  const originalPath = path.join(parentLink.root, parentLinked.path as string);
  const parentTarget = path.join(parentLink.root, 'shared/linked-parent');
  await mkdir(parentTarget);
  await writeFile(path.join(parentTarget, 'acceptance.json'), await readFile(originalPath));
  const linkDirectory = path.dirname(originalPath);
  await rm(linkDirectory, { recursive: true });
  await symlink(parentTarget, linkDirectory);
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: parentLink.bundleValue,
    artifactsRoot: parentLink.root,
    expectedIdentity: parentLink.expectedIdentity,
  }), /符号链接/);

  const linkedRoot = await createCorpus();
  t.after(() => rm(linkedRoot.root, { recursive: true, force: true }));
  const rootLink = `${linkedRoot.root}-link`;
  t.after(() => rm(rootLink, { recursive: true, force: true }));
  await symlink(linkedRoot.root, rootLink);
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: linkedRoot.bundleValue,
    artifactsRoot: rootLink,
    expectedIdentity: linkedRoot.expectedIdentity,
  }), /符号链接/);

  const corpus = await createCorpus();
  const displacedRoot = `${corpus.root}-displaced`;
  const replacementRoot = `${corpus.root}-replacement`;
  t.after(() => rm(corpus.root, { recursive: true, force: true }));
  t.after(() => rm(displacedRoot, { recursive: true, force: true }));
  t.after(() => rm(replacementRoot, { recursive: true, force: true }));
  const largeVideo = records(corpus)
    .flatMap((record) => artifacts(record))
    .find(({ kind }) => kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO);
  assert.ok(largeVideo);
  const largeBytes = Buffer.alloc(64 * 1024 * 1024, 0x61);
  largeVideo.path = '000-root-generation-race.mp4';
  largeVideo.sha256 = sha256(largeBytes);
  largeVideo.byteLength = largeBytes.byteLength;
  await writeFile(path.join(corpus.root, largeVideo.path as string), largeBytes);
  await mkdir(replacementRoot);

  const verification = verifyArenaP1SupplyDeviceEvidence({
    bundleValue: corpus.bundleValue,
    artifactsRoot: corpus.root,
    expectedIdentity: corpus.expectedIdentity,
  });
  const rejected = assert.rejects(
    verification,
    /artifactsRoot.*(?:generation|替换|变化)/,
  );
  await new Promise((resolve) => setTimeout(resolve, 15));
  await rename(corpus.root, displacedRoot);
  await rename(replacementRoot, corpus.root);
  await rejected;
});

test('P1 verifier rejects dirty source, release reachability and Stage8 masquerade', async (t) => {
  const dirty = await createCorpus({ sourceDirty: true });
  t.after(() => rm(dirty.root, { recursive: true, force: true }));
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: dirty.bundleValue,
    artifactsRoot: dirty.root,
    expectedIdentity: dirty.expectedIdentity,
  }), /sourceDirty|干净/);

  const reachable = await createCorpus({ releaseArtifactReachable: true });
  t.after(() => rm(reachable.root, { recursive: true, force: true }));
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: reachable.bundleValue,
    artifactsRoot: reachable.root,
    expectedIdentity: reachable.expectedIdentity,
  }), /release|发布|reachability/i);

  const masquerade = await createCorpus();
  t.after(() => rm(masquerade.root, { recursive: true, force: true }));
  await rewriteAttestation(masquerade, 'web', {
    schemaVersion: 1,
    buildId: BUILD_ID,
    commit: COMMIT,
    sourceDirty: false,
    target: 'web',
    defaultEntry: 'product',
    artifacts: [],
  });
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: masquerade.bundleValue,
    artifactsRoot: masquerade.root,
    expectedIdentity: masquerade.expectedIdentity,
  }), /purpose|字段|attestation/i);
});

test('P1 verifier rejects malformed manifest data without executing getters', async (t) => {
  const corpus = await createCorpus();
  t.after(() => rm(corpus.root, { recursive: true, force: true }));
  let getterCalls = 0;
  const expectedIdentity = { ...corpus.expectedIdentity };
  Object.defineProperty(expectedIdentity, 'buildId', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return BUILD_ID;
    },
  });
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: corpus.bundleValue,
    artifactsRoot: corpus.root,
    expectedIdentity,
  }), /访问器|数据字段/);
  assert.equal(getterCalls, 0);

  let optionGetCalls = 0;
  const proxiedOptions = new Proxy({
    bundleValue: corpus.bundleValue,
    artifactsRoot: corpus.root,
    expectedIdentity: corpus.expectedIdentity,
  }, {
    get(target, key, receiver) {
      optionGetCalls += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  await assert.doesNotReject(() => verifyArenaP1SupplyDeviceEvidence(proxiedOptions));
  assert.equal(optionGetCalls, 0);

  const cyclicIdentity = { ...corpus.expectedIdentity } as Record<string, unknown>;
  cyclicIdentity.cycle = cyclicIdentity;
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: corpus.bundleValue,
    artifactsRoot: corpus.root,
    expectedIdentity: cyclicIdentity,
  }), /循环/);

  const symbolIdentity = { ...corpus.expectedIdentity };
  Object.defineProperty(symbolIdentity, Symbol('unexpected'), {
    enumerable: true,
    value: true,
  });
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: corpus.bundleValue,
    artifactsRoot: corpus.root,
    expectedIdentity: symbolIdentity,
  }), /Symbol/);

  const sparseBundle = structuredClone(corpus.bundleValue);
  sparseBundle.records = new Array(7);
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: sparseBundle,
    artifactsRoot: corpus.root,
    expectedIdentity: corpus.expectedIdentity,
  }), /空槽|数据字段/);

  const symbolManifest = await createCorpus();
  t.after(() => rm(symbolManifest.root, { recursive: true, force: true }));
  const manifestArtifact = artifacts(records(symbolManifest).find(({ targetId }) => (
    targetId === ARENA_P1_SUPPLY_DEVICE_TARGET_ID.WEB_BROWSER
  )) as Record<string, unknown>).find(({ id }) => id === 'artifact-manifest');
  assert.ok(manifestArtifact);
  const manifestPath = path.join(symbolManifest.root, manifestArtifact.path as string);
  const parsed = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
  parsed.extra = true;
  await rewriteArtifactManifest(symbolManifest, 'web', parsed);
  await assert.rejects(() => verifyArenaP1SupplyDeviceEvidence({
    bundleValue: symbolManifest.bundleValue,
    artifactsRoot: symbolManifest.root,
    expectedIdentity: symbolManifest.expectedIdentity,
  }), /未知字段|extra/);
});
