import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ARENA_RELEASE_CANDIDATE_BUNDLE_SCHEMA_VERSION,
  createArenaReleaseCandidateBundle,
} from '../../src/arena-release/release-candidate-bundle.js';
import {
  ARENA_RELEASE_EVIDENCE_STATEMENT_SCHEMA_VERSION,
  ARENA_RELEASE_EVIDENCE_STATUS,
} from '@number-strategy-jump/arena-release-contracts';
import {
  ARENA_STAGE9_RC_HANDOFF_GATE_ID,
  createArenaStage9RcHandoffV1Definition,
} from '../../src/arena-release/arena-stage9-rc-handoff-v1.js';
import {
  createArenaBuildIntegrityReleaseResult,
} from '../../src/arena-release/build-release-evidence.js';
import {
  createArenaPerformanceDeviceReleaseResult,
  createArenaStage6DeviceReleaseResult,
  createArenaStage8ProductDeviceReleaseResult,
} from '../../src/arena-release/device-release-evidence.js';
import {
  createArenaHumanFairnessReleaseResult,
} from '../../src/arena-release/human-fairness-release-evidence.js';
import {
  ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT,
  ARENA_DEVICE_ACCEPTANCE_RECORD_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaStage6DeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaStage8ProductDeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaStage9PerformanceDeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-stage9-evidence-content';
import {
  ARENA_BUILD_MANIFEST_FILENAME,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaStage9HumanFairnessV1Definition,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_BUNDLE_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-human-match-study';
import {
  writeArenaBuildManifest,
} from '../../scripts/lib/arena-build-manifest-files.mjs';
import {
  verifyArenaStage9ReleaseProducerEvidence,
} from '../../scripts/lib/arena-stage9-release-producers.mjs';

const COMMIT = 'a'.repeat(40);
const BUILD_ID = 'arena-external-evidence-test';
const CREATED_AT = '2026-07-18T00:00:00.000Z';

function deviceBundle(definition, overrides = {}) {
  return {
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: COMMIT,
    buildId: BUILD_ID,
    createdAt: CREATED_AT,
    records: [],
    ...overrides,
  };
}

function humanBundle(definition, overrides = {}) {
  return {
    schemaVersion: HUMAN_MATCH_STUDY_BUNDLE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: COMMIT,
    buildId: BUILD_ID,
    createdAt: CREATED_AT,
    records: [],
    ...overrides,
  };
}

async function writeMaterial(root, relativePath, value) {
  const bytes = Buffer.isBuffer(value)
    ? value
    : Buffer.from(typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
  const resolvedPath = path.join(root, ...relativePath.split('/'));
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, bytes);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return Object.freeze({
    material: Object.freeze({ path: relativePath, sha256, byteLength: bytes.byteLength }),
    verified: Object.freeze({
      path: relativePath,
      sha256,
      byteLength: bytes.byteLength,
      resolvedPath,
      fileIdentity: `test:${relativePath}`,
    }),
  });
}

function statement(definition, gateId, result, materials) {
  const gate = definition.requireGate(gateId);
  return {
    schemaVersion: ARENA_RELEASE_EVIDENCE_STATEMENT_SCHEMA_VERSION,
    gateId,
    producerId: gate.producerId,
    requirementHash: gate.requirementHash,
    commit: COMMIT,
    buildId: BUILD_ID,
    status: result.status,
    resultHash: result.resultHash,
    materials,
  };
}

function candidate(definition, evidence) {
  return createArenaReleaseCandidateBundle(definition, {
    schemaVersion: ARENA_RELEASE_CANDIDATE_BUNDLE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: COMMIT,
    buildId: BUILD_ID,
    sourceDirty: false,
    evidence,
  });
}

async function createStudyBuild(root) {
  const buildRoot = path.join(root, 'web-build');
  await mkdir(buildRoot, { recursive: true });
  for (const fileName of ['greybox.html', 'index.html', 'product.html', 'study.html']) {
    await writeFile(path.join(buildRoot, fileName), `<p>${fileName}</p>\n`);
  }
  const manifest = await writeArenaBuildManifest({
    outDir: buildRoot,
    buildId: BUILD_ID,
    commit: COMMIT,
    sourceDirty: false,
    target: 'web',
    defaultEntry: 'product',
  });
  return Object.freeze({ buildRoot, manifest });
}

async function createMiniGameBuild(root, target) {
  const buildRoot = path.join(root, `${target}-build`);
  await mkdir(buildRoot, { recursive: true });
  for (const [fileName, content] of [
    ['game-greybox.js', 'greybox'],
    ['game-product.js', 'product'],
    ['game.js', 'product'],
    ['game.json', '{}'],
    ['project.config.json', '{}'],
  ]) await writeFile(path.join(buildRoot, fileName), content);
  const manifest = await writeArenaBuildManifest({
    outDir: buildRoot,
    buildId: BUILD_ID,
    commit: COMMIT,
    sourceDirty: false,
    target,
    defaultEntry: 'product',
  });
  return Object.freeze({ buildRoot, manifest });
}

async function createDeviceRecord({
  root,
  definition,
  targetId,
  runId,
  sharedLogBytes,
  buildManifestBytes = null,
}) {
  const target = definition.getTarget(targetId);
  const artifactIdByKind = {
    [ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST]: 'manifest',
    [ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG]: 'log',
    [ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.SCREENSHOT]: 'screen',
    [ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.VIDEO]: 'video',
  };
  const artifacts = [];
  for (const kind of target.requiredArtifactKinds) {
    const id = artifactIdByKind[kind];
    const bytes = kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.LOG
      ? sharedLogBytes
      : kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
        ? buildManifestBytes
        : Buffer.from(`${runId}:${kind}`);
    const relativePath = `${runId}/${id}.${kind === 'build-manifest' ? 'json' : 'bin'}`;
    await mkdir(path.join(root, runId), { recursive: true });
    await writeFile(path.join(root, ...relativePath.split('/')), bytes);
    artifacts.push({
      id,
      kind,
      path: relativePath,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      byteLength: bytes.byteLength,
    });
  }
  return {
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_RECORD_SCHEMA_VERSION,
    recordId: `record-${runId}`,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: COMMIT,
    buildId: BUILD_ID,
    targetId,
    runId,
    performedAt: CREATED_AT,
    operatorId: 'operator-release-test',
    client: {
      name: target.platform === 'web' ? 'Mobile Safari' : `${target.platform} client`,
      version: '1.0.0',
      baseLibraryVersion: target.platform === 'web' ? null : '3.7.10',
    },
    device: {
      manufacturer: 'TestVendor',
      model: 'TestPhone',
      osName: target.requiredOsNames?.[0]
        ?? (target.executionSurface === 'developer-tool' ? 'macOS' : 'iOS'),
      osVersion: '1.0',
    },
    orientation: 'portrait',
    inputMode: 'touch',
    checks: target.requiredCheckIds.map((id) => ({
      id,
      result: ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT.PASSED,
      notes: `${id} 已观察。`,
      artifactIds: artifacts.map(({ id: artifactId }) => artifactId),
    })),
    artifacts,
  };
}

test('external release adapters recompute incomplete status and reject foreign definitions', () => {
  const stage6 = createArenaStage6DeviceAcceptanceV1Definition();
  const stage8 = createArenaStage8ProductDeviceAcceptanceV1Definition();
  const performance = createArenaStage9PerformanceDeviceAcceptanceV1Definition();
  const human = createArenaStage9HumanFairnessV1Definition();
  for (const result of [
    createArenaStage6DeviceReleaseResult({ bundle: deviceBundle(stage6) }),
    createArenaStage8ProductDeviceReleaseResult({ bundle: deviceBundle(stage8) }),
    createArenaPerformanceDeviceReleaseResult({
      bundle: deviceBundle(performance),
      performanceRecords: [],
    }),
    createArenaHumanFairnessReleaseResult({ bundle: humanBundle(human) }),
  ]) {
    assert.equal(result.commit, COMMIT);
    assert.equal(result.buildId, BUILD_ID);
    assert.equal(result.status, ARENA_RELEASE_EVIDENCE_STATUS.INCOMPLETE);
    assert.match(result.resultHash, /^[0-9a-f]{8}$/);
    assert.ok(Object.isFrozen(result));
  }
  assert.throws(
    () => createArenaStage6DeviceReleaseResult({ bundle: deviceBundle(stage8) }),
    /definitionId 与当前定义不一致/,
  );
  assert.throws(
    () => createArenaPerformanceDeviceReleaseResult({
      bundle: deviceBundle(performance),
      performanceRecords: [{}],
    }),
    /必须且只能绑定一份 Performance Record/,
  );
});

test('Stage 6, Stage 8 and performance release gates reuse device verifier and stay incomplete', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-release-device-evidence-'));
  try {
    const releaseDefinition = createArenaStage9RcHandoffV1Definition();
    const cases = [
      {
        gateId: ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE6_DEVICE,
        definition: createArenaStage6DeviceAcceptanceV1Definition(),
        result: (bundle) => createArenaStage6DeviceReleaseResult({ bundle }),
        directory: 'stage6',
      },
      {
        gateId: ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE8_PRODUCT_DEVICE,
        definition: createArenaStage8ProductDeviceAcceptanceV1Definition(),
        result: (bundle) => createArenaStage8ProductDeviceReleaseResult({ bundle }),
        directory: 'stage8',
      },
      {
        gateId: ARENA_STAGE9_RC_HANDOFF_GATE_ID.PERFORMANCE_DEVICE,
        definition: createArenaStage9PerformanceDeviceAcceptanceV1Definition(),
        result: (bundle) => createArenaPerformanceDeviceReleaseResult({
          bundle,
          performanceRecords: [],
        }),
        directory: 'performance',
      },
    ];
    const evidence = [];
    const verifiedByPath = new Map();
    for (const value of cases) {
      const bundle = deviceBundle(value.definition);
      const written = await writeMaterial(
        root,
        `${value.directory}/device-evidence.json`,
        bundle,
      );
      const result = value.result(bundle);
      evidence.push(statement(releaseDefinition, value.gateId, result, [written.material]));
      verifiedByPath.set(written.material.path, written.verified);
    }
    const bundle = candidate(releaseDefinition, evidence);
    const verified = await verifyArenaStage9ReleaseProducerEvidence({
      definition: releaseDefinition,
      bundle,
      verifiedMaterialsByPath: verifiedByPath,
    });
    assert.deepEqual(verified.map(({ gateId }) => gateId), cases.map(({ gateId }) => gateId));

    const falseReadyEvidence = structuredClone(evidence);
    falseReadyEvidence[0].status = ARENA_RELEASE_EVIDENCE_STATUS.READY;
    const falseReadyBundle = candidate(releaseDefinition, falseReadyEvidence);
    await assert.rejects(
      verifyArenaStage9ReleaseProducerEvidence({
        definition: releaseDefinition,
        bundle: falseReadyBundle,
        verifiedMaterialsByPath: verifiedByPath,
      }),
      /status 与 producer 复算结果不一致/,
    );
    const tamperedPath = verifiedByPath.get('stage8/device-evidence.json').resolvedPath;
    await writeFile(tamperedPath, '{}\n');
    await assert.rejects(
      verifyArenaStage9ReleaseProducerEvidence({
        definition: releaseDefinition,
        bundle,
        verifiedMaterialsByPath: verifiedByPath,
      }),
      /producer 复验前发生变化/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('device release gates reject cross-gate reuse of non-build artifact content', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-release-device-reuse-'));
  try {
    const releaseDefinition = createArenaStage9RcHandoffV1Definition();
    const stage6Definition = createArenaStage6DeviceAcceptanceV1Definition();
    const stage8Definition = createArenaStage8ProductDeviceAcceptanceV1Definition();
    const sharedLogBytes = Buffer.from('the same captured log must not satisfy two gates\n');
    const stage6Root = path.join(root, 'stage6');
    const stage8Root = path.join(root, 'stage8');
    const wechatBuild = await createMiniGameBuild(root, 'wechat');
    const buildManifestBytes = await readFile(
      path.join(wechatBuild.buildRoot, ARENA_BUILD_MANIFEST_FILENAME),
    );
    const stage6Record = await createDeviceRecord({
      root: stage6Root,
      definition: stage6Definition,
      targetId: stage6Definition.targets[0].id,
      runId: 'stage6-run',
      sharedLogBytes,
    });
    const stage8Target = stage8Definition.targets.find(({ platform }) => platform === 'wechat');
    const stage8Record = await createDeviceRecord({
      root: stage8Root,
      definition: stage8Definition,
      targetId: stage8Target.id,
      runId: 'stage8-run',
      sharedLogBytes,
      buildManifestBytes,
    });
    const stage6Bundle = deviceBundle(stage6Definition, { records: [stage6Record] });
    const stage8Bundle = deviceBundle(stage8Definition, { records: [stage8Record] });
    const stage6Written = await writeMaterial(
      root,
      'stage6/device-evidence.json',
      stage6Bundle,
    );
    const stage8Written = await writeMaterial(
      root,
      'stage8/device-evidence.json',
      stage8Bundle,
    );
    const releaseBundle = candidate(releaseDefinition, [
      statement(
        releaseDefinition,
        ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE6_DEVICE,
        createArenaStage6DeviceReleaseResult({ bundle: stage6Bundle }),
        [stage6Written.material],
      ),
      statement(
        releaseDefinition,
        ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE8_PRODUCT_DEVICE,
        createArenaStage8ProductDeviceReleaseResult({ bundle: stage8Bundle }),
        [stage8Written.material],
      ),
    ]);
    await assert.rejects(
      verifyArenaStage9ReleaseProducerEvidence({
        definition: releaseDefinition,
        bundle: releaseBundle,
        verifiedMaterialsByPath: new Map([
          [stage6Written.material.path, stage6Written.verified],
          [stage8Written.material.path, stage8Written.verified],
        ]),
      }),
      /复用了相同内容/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('human fairness release gate verifies three indices and all transitive evidence', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arena-release-human-evidence-'));
  try {
    const definition = createArenaStage9HumanFairnessV1Definition();
    const releaseDefinition = createArenaStage9RcHandoffV1Definition();
    const evidenceRoot = path.join(root, 'study');
    await mkdir(evidenceRoot, { recursive: true });
    const { buildRoot, manifest: webManifest } = await createStudyBuild(root);
    const workspaceBytes = Buffer.from(`${JSON.stringify({
      schemaVersion: 1,
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      revision: 0,
      activeTrial: null,
      receipts: [],
    }, null, 2)}\n`);
    await writeFile(path.join(evidenceRoot, 'workspace-audit.json'), workspaceBytes);
    const ingestManifest = {
      schemaVersion: 1,
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      commit: COMMIT,
      buildId: BUILD_ID,
      workspace: {
        sourceSha256: createHash('sha256').update(workspaceBytes).digest('hex'),
        sourceByteLength: workspaceBytes.byteLength,
        revision: 0,
        receiptCount: 0,
        archivedPath: 'workspace-audit.json',
      },
      packages: [],
    };
    const bundleValue = humanBundle(definition);
    const bundleWritten = await writeMaterial(
      root,
      'study/human-fairness-evidence.json',
      bundleValue,
    );
    const ingestWritten = await writeMaterial(
      root,
      'study/capture-package-manifest.json',
      ingestManifest,
    );
    const manifestBytes = await readFile(path.join(buildRoot, ARENA_BUILD_MANIFEST_FILENAME));
    const buildWritten = await writeMaterial(
      root,
      `web-build/${ARENA_BUILD_MANIFEST_FILENAME}`,
      manifestBytes,
    );
    const result = createArenaHumanFairnessReleaseResult({ bundle: bundleValue });
    const releaseStatement = statement(
      releaseDefinition,
      ARENA_STAGE9_RC_HANDOFF_GATE_ID.HUMAN_FAIRNESS,
      result,
      [bundleWritten.material, ingestWritten.material, buildWritten.material],
    );
    const releaseBundle = candidate(releaseDefinition, [releaseStatement]);
    const verifiedByPath = new Map([
      [bundleWritten.material.path, bundleWritten.verified],
      [ingestWritten.material.path, ingestWritten.verified],
      [buildWritten.material.path, buildWritten.verified],
    ]);
    const verified = await verifyArenaStage9ReleaseProducerEvidence({
      definition: releaseDefinition,
      bundle: releaseBundle,
      verifiedMaterialsByPath: verifiedByPath,
    });
    assert.equal(verified.length, 1);
    assert.equal(verified[0].gateId, ARENA_STAGE9_RC_HANDOFF_GATE_ID.HUMAN_FAIRNESS);

    const wechatBuild = await createMiniGameBuild(root, 'wechat');
    const douyinBuild = await createMiniGameBuild(root, 'douyin');
    const buildMaterials = [
      buildWritten,
      await writeMaterial(
        root,
        `wechat-build/${ARENA_BUILD_MANIFEST_FILENAME}`,
        await readFile(path.join(wechatBuild.buildRoot, ARENA_BUILD_MANIFEST_FILENAME)),
      ),
      await writeMaterial(
        root,
        `douyin-build/${ARENA_BUILD_MANIFEST_FILENAME}`,
        await readFile(path.join(douyinBuild.buildRoot, ARENA_BUILD_MANIFEST_FILENAME)),
      ),
    ];
    const buildResult = createArenaBuildIntegrityReleaseResult([
      webManifest,
      wechatBuild.manifest,
      douyinBuild.manifest,
    ]);
    const buildStatement = statement(
      releaseDefinition,
      ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_INTEGRITY,
      buildResult,
      buildMaterials.map(({ material }) => material),
    );
    for (const written of buildMaterials) {
      verifiedByPath.set(written.material.path, written.verified);
    }
    const buildBoundBundle = candidate(releaseDefinition, [buildStatement, releaseStatement]);
    const buildBound = await verifyArenaStage9ReleaseProducerEvidence({
      definition: releaseDefinition,
      bundle: buildBoundBundle,
      verifiedMaterialsByPath: verifiedByPath,
    });
    assert.equal(buildBound.length, 2);

    const alternateRoot = path.join(root, 'alternate-web-build');
    await mkdir(alternateRoot, { recursive: true });
    for (const fileName of ['greybox.html', 'index.html', 'product.html', 'study.html']) {
      await writeFile(path.join(alternateRoot, fileName), `<p>alternate-${fileName}</p>\n`);
    }
    await writeArenaBuildManifest({
      outDir: alternateRoot,
      buildId: BUILD_ID,
      commit: COMMIT,
      sourceDirty: false,
      target: 'web',
      defaultEntry: 'product',
    });
    const alternateBuild = await writeMaterial(
      root,
      `alternate-web-build/${ARENA_BUILD_MANIFEST_FILENAME}`,
      await readFile(path.join(alternateRoot, ARENA_BUILD_MANIFEST_FILENAME)),
    );
    const mismatchedHumanStatement = structuredClone(releaseStatement);
    mismatchedHumanStatement.materials = mismatchedHumanStatement.materials.map((material) => (
      path.posix.basename(material.path) === ARENA_BUILD_MANIFEST_FILENAME
        ? alternateBuild.material
        : material
    ));
    const mismatchedBuildBundle = candidate(
      releaseDefinition,
      [buildStatement, mismatchedHumanStatement],
    );
    verifiedByPath.set(alternateBuild.material.path, alternateBuild.verified);
    await assert.rejects(
      verifyArenaStage9ReleaseProducerEvidence({
        definition: releaseDefinition,
        bundle: mismatchedBuildBundle,
        verifiedMaterialsByPath: verifiedByPath,
      }),
      /Manifest 与最终构建门不一致/,
    );

    await writeFile(path.join(evidenceRoot, 'workspace-audit.json'), '{}\n');
    await assert.rejects(
      verifyArenaStage9ReleaseProducerEvidence({
        definition: releaseDefinition,
        bundle: releaseBundle,
        verifiedMaterialsByPath: verifiedByPath,
      }),
      /大小不一致|SHA-256 不一致/,
    );
    const missingIndexStatement = structuredClone(releaseStatement);
    missingIndexStatement.materials.pop();
    const missingIndexBundle = candidate(releaseDefinition, [missingIndexStatement]);
    await assert.rejects(
      verifyArenaStage9ReleaseProducerEvidence({
        definition: releaseDefinition,
        bundle: missingIndexBundle,
        verifiedMaterialsByPath: verifiedByPath,
      }),
      /必须引用 Bundle、采集 Manifest 与 Web Build Manifest/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
