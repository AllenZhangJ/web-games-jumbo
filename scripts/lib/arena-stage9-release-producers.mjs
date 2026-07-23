import path from 'node:path';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_STAGE9_RC_HANDOFF_GATE_ID,
} from '../../src/arena-release/arena-stage9-rc-handoff-v1.js';
import {
  createArenaBalanceValidationReleaseResult,
} from '../../src/arena-release/balance-validation-release-evidence.js';
import {
  createArenaBuildBudgetReleaseResult,
  createArenaBuildIntegrityReleaseResult,
} from '@number-strategy-jump/arena-release';
import {
  createArenaDefectReleaseResult,
} from '@number-strategy-jump/arena-release';
import {
  createArenaPerformanceDeviceReleaseResult,
  createArenaStage6DeviceReleaseResult,
  createArenaStage8ProductDeviceReleaseResult,
} from '@number-strategy-jump/arena-release';
import {
  createArenaGoldenReplayReleaseResult,
} from '../../src/arena-release/golden-replay-release-evidence.js';
import {
  createArenaHumanFairnessReleaseResult,
} from '@number-strategy-jump/arena-release';
import {
  createArenaRegressionReleaseResult,
} from '../../src/arena-release/regression-release-evidence.js';
import {
  verifyArenaReleaseEvidenceProducerResult,
} from '@number-strategy-jump/arena-release';
import {
  ARENA_BUILD_MANIFEST_FILENAME,
  createArenaBuildManifest,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
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
  createArenaV1GoldenReplayScenarioRegistry,
} from '../../src/arena/regression/arena-v1-golden-replay-scenarios.js';
import {
  createArenaGoldenReplayManifest,
} from '@number-strategy-jump/arena-regression';
import {
  verifyArenaGoldenReplayCorpus,
} from '@number-strategy-jump/arena-regression';
import {
  verifyArenaBuildManifestDirectory,
} from './arena-build-manifest-files.mjs';
import {
  verifyArenaDeviceEvidence,
} from './arena-device-evidence-verifier.mjs';
import {
  verifyArenaHumanFairnessEvidence,
} from './arena-human-fairness-evidence-verifier.mjs';
import {
  verifyArenaInputPilotEvidence,
} from './arena-input-pilot-evidence-verifier.mjs';
import { readVerifiedTextFile } from './evidence-file-verifier.mjs';

const MAXIMUM_BUILD_MANIFEST_BYTES = 5 * 1024 * 1024;
const MAXIMUM_GOLDEN_REPLAY_BYTES = 32 * 1024 * 1024;
const MAXIMUM_BALANCE_REPORT_BYTES = 64 * 1024 * 1024;
const MAXIMUM_REGRESSION_REPORT_BYTES = 1024 * 1024;
const MAXIMUM_DEVICE_BUNDLE_BYTES = 5 * 1024 * 1024;
const MAXIMUM_HUMAN_BUNDLE_BYTES = 5 * 1024 * 1024;
const MAXIMUM_HUMAN_INGEST_MANIFEST_BYTES = 5 * 1024 * 1024;
const MAXIMUM_DEFECT_LEDGER_BYTES = 5 * 1024 * 1024;
const MAXIMUM_INPUT_PILOT_BUNDLE_BYTES = 32 * 1024 * 1024;

export const ARENA_STAGE9_SUPPORTED_RELEASE_PRODUCER_IDS = Object.freeze([
  'arena:build:budget',
  'arena:build:verify',
  'arena:defects:verify',
  'arena:device:evidence',
  'arena:experiment:report:verify',
  'arena:human-fairness:evidence',
  'arena:input-pilot:evidence',
  'arena:performance:evidence',
  'arena:product:device:evidence',
  'arena:regression:evidence',
  'arena:replay:verify',
]);

const SUPPORTED_BUILD_GATES = new Set([
  ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_INTEGRITY,
  ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_BUDGET,
]);
const SUPPORTED_SOURCE_GATES = new Set([
  ARENA_STAGE9_RC_HANDOFF_GATE_ID.GOLDEN_REPLAY,
  ARENA_STAGE9_RC_HANDOFF_GATE_ID.REGRESSION,
  ARENA_STAGE9_RC_HANDOFF_GATE_ID.BALANCE_VALIDATION,
  ARENA_STAGE9_RC_HANDOFF_GATE_ID.DEFECTS,
]);
const SUPPORTED_EXTERNAL_BUILD_GATES = new Set([
  ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE6_DEVICE,
  ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE8_PRODUCT_DEVICE,
  ARENA_STAGE9_RC_HANDOFF_GATE_ID.PERFORMANCE_DEVICE,
  ARENA_STAGE9_RC_HANDOFF_GATE_ID.HUMAN_FAIRNESS,
]);

async function readVerifiedJsonMaterial(
  material,
  verifiedMaterialsByPath,
  label,
  maximumBytes,
) {
  const verified = verifiedMaterialsByPath.get(material.path);
  if (!verified) throw new Error(`Release material ${material.path} 尚未完成完整性验证。`);
  const current = await readVerifiedTextFile(verified.resolvedPath, { label, maximumBytes });
  if (current.byteLength !== verified.byteLength || current.sha256 !== verified.sha256) {
    throw new Error(`Release material ${material.path} 在 producer 复验前发生变化。`);
  }
  let value;
  try {
    value = JSON.parse(current.text);
  } catch (error) {
    throw new Error(`${label} 不是有效 JSON：${error.message}`);
  }
  return Object.freeze({ value, verified });
}

function materialSignature(statement) {
  return statement.materials.map(({ path: materialPath, sha256, byteLength }) => (
    `${materialPath}\u0000${sha256}\u0000${byteLength}`
  )).join('\u0001');
}

function assertSharedBuildMaterials(bundle) {
  const statements = bundle.evidence.filter(({ gateId }) => SUPPORTED_BUILD_GATES.has(gateId));
  if (statements.length < 2) return;
  const expected = materialSignature(statements[0]);
  if (statements.some((statement) => materialSignature(statement) !== expected)) {
    throw new Error('build-integrity 与 build-budget 必须复用同一组三端 Manifest。');
  }
}

async function readBuildManifests(statement, verifiedMaterialsByPath, cache) {
  if (statement.materials.length !== 3) {
    throw new RangeError(`Release gate ${statement.gateId} 必须引用三个构建 Manifest。`);
  }
  const directories = new Set();
  const manifests = [];
  for (const material of statement.materials) {
    if (path.posix.basename(material.path) !== ARENA_BUILD_MANIFEST_FILENAME) {
      throw new RangeError(`Release gate ${statement.gateId} 只能引用构建 Manifest。`);
    }
    const { value, verified } = await readVerifiedJsonMaterial(
      material,
      verifiedMaterialsByPath,
      `release build manifest ${material.path}`,
      MAXIMUM_BUILD_MANIFEST_BYTES,
    );
    const directory = path.dirname(verified.resolvedPath);
    if (directories.has(directory)) {
      throw new RangeError(`Release gate ${statement.gateId} 重复引用构建目录 ${directory}。`);
    }
    directories.add(directory);
    let manifest = cache.get(directory);
    if (!manifest) {
      const materialManifest = createArenaBuildManifest(value);
      manifest = await verifyArenaBuildManifestDirectory(directory);
      if (manifest.getContentHash() !== materialManifest.getContentHash()) {
        throw new Error(`Release material ${material.path} 在 producer 复验期间发生变化。`);
      }
      cache.set(directory, manifest);
    }
    manifests.push(manifest);
  }
  return Object.freeze(manifests);
}

async function verifyGoldenReplay(statement, verifiedMaterialsByPath, commit) {
  const manifests = statement.materials.filter(({ path: materialPath }) => (
    path.posix.basename(materialPath) === 'manifest.json'
  ));
  if (manifests.length !== 1) {
    throw new RangeError('Golden replay release evidence 必须且只能包含一个 manifest.json。');
  }
  const manifestMaterial = manifests[0];
  const manifestRead = await readVerifiedJsonMaterial(
    manifestMaterial,
    verifiedMaterialsByPath,
    `golden replay manifest ${manifestMaterial.path}`,
    MAXIMUM_GOLDEN_REPLAY_BYTES,
  );
  const manifest = createArenaGoldenReplayManifest(manifestRead.value);
  if (statement.materials.length !== manifest.entries.length + 1) {
    throw new RangeError('Golden replay release materials 未精确覆盖 Manifest。');
  }
  const materialDirectory = path.posix.dirname(manifestMaterial.path);
  const resolvedDirectory = path.dirname(manifestRead.verified.resolvedPath);
  const byPath = new Map(statement.materials.map((material) => [material.path, material]));
  const fixtures = [];
  for (const entry of manifest.entries) {
    const expectedPath = materialDirectory === '.'
      ? entry.file
      : path.posix.join(materialDirectory, entry.file);
    const material = byPath.get(expectedPath);
    if (!material) throw new RangeError(`Golden replay release materials 缺少 ${expectedPath}。`);
    const fixtureRead = await readVerifiedJsonMaterial(
      material,
      verifiedMaterialsByPath,
      `golden replay fixture ${material.path}`,
      MAXIMUM_GOLDEN_REPLAY_BYTES,
    );
    if (path.dirname(fixtureRead.verified.resolvedPath) !== resolvedDirectory) {
      throw new RangeError('Golden replay release materials 必须位于同一实际目录。');
    }
    fixtures.push(Object.freeze({ file: entry.file, replay: fixtureRead.value }));
  }
  const verification = verifyArenaGoldenReplayCorpus({
    manifest,
    fixtures,
    scenarioRegistry: createArenaV1GoldenReplayScenarioRegistry(),
    coreFactory: createArenaV1MatchCore,
  });
  return createArenaGoldenReplayReleaseResult({ commit, verification });
}

async function verifyBalanceValidation(statement, verifiedMaterialsByPath, bundle) {
  if (statement.materials.length !== 1) {
    throw new RangeError('Balance validation release evidence 必须只引用一个 Report Bundle。');
  }
  const material = statement.materials[0];
  const reportRead = await readVerifiedJsonMaterial(
    material,
    verifiedMaterialsByPath,
    `balance validation report ${material.path}`,
    MAXIMUM_BALANCE_REPORT_BYTES,
  );
  return createArenaBalanceValidationReleaseResult({
    commit: bundle.commit,
    sourceDirty: bundle.sourceDirty,
    reportBundle: reportRead.value,
  });
}

async function verifyRegression(statement, verifiedMaterialsByPath, commit) {
  if (statement.materials.length !== 1) {
    throw new RangeError('Regression release evidence 必须只引用一个原子 Report。');
  }
  const material = statement.materials[0];
  const reportRead = await readVerifiedJsonMaterial(
    material,
    verifiedMaterialsByPath,
    `regression evidence report ${material.path}`,
    MAXIMUM_REGRESSION_REPORT_BYTES,
  );
  return createArenaRegressionReleaseResult({ commit, report: reportRead.value });
}

async function verifyDefects(statement, verifiedMaterialsByPath, bundle) {
  const material = requireSingleNamedMaterial(
    statement,
    'defect-ledger.json',
    'Defect release evidence',
  );
  const ledgerRead = await readVerifiedJsonMaterial(
    material,
    verifiedMaterialsByPath,
    `defect ledger ${material.path}`,
    MAXIMUM_DEFECT_LEDGER_BYTES,
  );
  return createArenaDefectReleaseResult({
    commit: bundle.commit,
    sourceDirty: bundle.sourceDirty,
    ledger: ledgerRead.value,
  });
}

function requireSingleNamedMaterial(statement, fileName, label) {
  if (
    statement.materials.length !== 1
    || path.posix.basename(statement.materials[0].path) !== fileName
  ) throw new RangeError(`${label} 必须只引用一个 ${fileName}。`);
  return statement.materials[0];
}

function assertCanonicalBuildManifest(buildManifest, canonicalBuildHashes, label) {
  const expected = canonicalBuildHashes?.get(buildManifest.platform);
  if (expected && expected !== buildManifest.sha256) {
    throw new Error(`${label} 的 ${buildManifest.platform} Manifest 与最终构建门不一致。`);
  }
}

function registerDeviceArtifacts(statement, verification, artifactHashes) {
  for (const artifact of verification.artifactIdentities) {
    if (artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST) continue;
    const previous = artifactHashes.get(artifact.sha256);
    if (previous && previous.gateId !== statement.gateId) {
      throw new Error(
        `Release gate ${statement.gateId} artifact ${artifact.path} 与 ${previous.gateId} 的 ${previous.path} 复用了相同内容。`,
      );
    }
    artifactHashes.set(artifact.sha256, Object.freeze({
      gateId: statement.gateId,
      path: artifact.path,
    }));
  }
}

async function verifyDeviceEvidence(
  statement,
  verifiedMaterialsByPath,
  canonicalBuildHashes,
  artifactHashes,
) {
  const material = requireSingleNamedMaterial(
    statement,
    'device-evidence.json',
    `Release gate ${statement.gateId}`,
  );
  const bundleRead = await readVerifiedJsonMaterial(
    material,
    verifiedMaterialsByPath,
    `device evidence bundle ${material.path}`,
    MAXIMUM_DEVICE_BUNDLE_BYTES,
  );
  let definition;
  let resultFactory;
  if (statement.gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE6_DEVICE) {
    definition = createArenaStage6DeviceAcceptanceV1Definition();
    resultFactory = createArenaStage6DeviceReleaseResult;
  } else if (statement.gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE8_PRODUCT_DEVICE) {
    definition = createArenaStage8ProductDeviceAcceptanceV1Definition();
    resultFactory = createArenaStage8ProductDeviceReleaseResult;
  } else {
    definition = createArenaStage9PerformanceDeviceAcceptanceV1Definition();
    resultFactory = createArenaPerformanceDeviceReleaseResult;
  }
  const verification = await verifyArenaDeviceEvidence({
    definition,
    bundleValue: bundleRead.value,
    artifactsRoot: path.dirname(bundleRead.verified.resolvedPath),
  });
  for (const buildManifest of verification.buildManifests) {
    assertCanonicalBuildManifest(
      buildManifest,
      canonicalBuildHashes,
      `Release gate ${statement.gateId}`,
    );
  }
  registerDeviceArtifacts(statement, verification, artifactHashes);
  return statement.gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.PERFORMANCE_DEVICE
    ? resultFactory({
      bundle: verification.bundle,
      performanceRecords: verification.performanceRecords.map(({ source }) => source),
    })
    : resultFactory({ bundle: verification.bundle });
}

function requireNamedMaterial(statement, fileName, label) {
  const matches = statement.materials.filter(({ path: materialPath }) => (
    path.posix.basename(materialPath) === fileName
  ));
  if (matches.length !== 1) throw new RangeError(`${label} 必须且只能引用一个 ${fileName}。`);
  return matches[0];
}

async function verifyHumanFairnessEvidence(
  statement,
  verifiedMaterialsByPath,
  canonicalBuildHashes,
) {
  if (statement.materials.length !== 3) {
    throw new RangeError('Human fairness release evidence 必须引用 Bundle、采集 Manifest 与 Web Build Manifest。');
  }
  const bundleMaterial = requireNamedMaterial(
    statement,
    'human-fairness-evidence.json',
    'Human fairness release evidence',
  );
  const ingestMaterial = requireNamedMaterial(
    statement,
    'capture-package-manifest.json',
    'Human fairness release evidence',
  );
  const buildMaterial = requireNamedMaterial(
    statement,
    ARENA_BUILD_MANIFEST_FILENAME,
    'Human fairness release evidence',
  );
  const [bundleRead, ingestRead, buildRead] = await Promise.all([
    readVerifiedJsonMaterial(
      bundleMaterial,
      verifiedMaterialsByPath,
      `human fairness bundle ${bundleMaterial.path}`,
      MAXIMUM_HUMAN_BUNDLE_BYTES,
    ),
    readVerifiedJsonMaterial(
      ingestMaterial,
      verifiedMaterialsByPath,
      `human fairness ingest manifest ${ingestMaterial.path}`,
      MAXIMUM_HUMAN_INGEST_MANIFEST_BYTES,
    ),
    readVerifiedJsonMaterial(
      buildMaterial,
      verifiedMaterialsByPath,
      `human fairness build manifest ${buildMaterial.path}`,
      MAXIMUM_BUILD_MANIFEST_BYTES,
    ),
  ]);
  const artifactsRoot = path.dirname(bundleRead.verified.resolvedPath);
  if (path.dirname(ingestRead.verified.resolvedPath) !== artifactsRoot) {
    throw new RangeError('Human fairness Bundle 与 capture-package-manifest.json 必须位于同一实际目录。');
  }
  const verification = await verifyArenaHumanFairnessEvidence({
    bundleValue: bundleRead.value,
    artifactsRoot,
    buildRoot: path.dirname(buildRead.verified.resolvedPath),
  });
  if (verification.workspaceAudit.ingestManifestSha256 !== ingestRead.verified.sha256) {
    throw new Error('Human fairness 采集 Manifest 在 producer 复验期间发生变化。');
  }
  const declaredBuildManifest = createArenaBuildManifest(buildRead.value);
  if (verification.buildManifest.getContentHash() !== declaredBuildManifest.getContentHash()) {
    throw new Error('Human fairness Build Manifest 在 producer 复验期间发生变化。');
  }
  assertCanonicalBuildManifest(
    { platform: declaredBuildManifest.target, sha256: buildRead.verified.sha256 },
    canonicalBuildHashes,
    'Human fairness release evidence',
  );
  return createArenaHumanFairnessReleaseResult({ bundle: verification.bundle });
}

async function verifyInputPilotEvidence(
  statement,
  bundle,
  verifiedMaterialsByPath,
  canonicalBuildHashes,
) {
  if (statement.materials.length !== 2) {
    throw new RangeError('Input Pilot release evidence 必须引用 Evidence Bundle 与 Web Build Manifest。');
  }
  const evidenceMaterial = requireNamedMaterial(
    statement,
    'input-pilot-evidence.json',
    'Input Pilot release evidence',
  );
  const buildMaterial = requireNamedMaterial(
    statement,
    ARENA_BUILD_MANIFEST_FILENAME,
    'Input Pilot release evidence',
  );
  const stage6Statement = bundle.evidence.find(({ gateId }) => (
    gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.STAGE6_DEVICE
  ));
  if (!stage6Statement) {
    throw new Error('Input Pilot release evidence 缺少同候选 Stage 6 Device Gate。');
  }
  const deviceMaterial = requireSingleNamedMaterial(
    stage6Statement,
    'device-evidence.json',
    'Stage 6 Device release evidence',
  );
  const [evidenceRead, buildRead, deviceRead] = await Promise.all([
    readVerifiedJsonMaterial(
      evidenceMaterial,
      verifiedMaterialsByPath,
      `input pilot evidence bundle ${evidenceMaterial.path}`,
      MAXIMUM_INPUT_PILOT_BUNDLE_BYTES,
    ),
    readVerifiedJsonMaterial(
      buildMaterial,
      verifiedMaterialsByPath,
      `input pilot build manifest ${buildMaterial.path}`,
      MAXIMUM_BUILD_MANIFEST_BYTES,
    ),
    readVerifiedJsonMaterial(
      deviceMaterial,
      verifiedMaterialsByPath,
      `input pilot Stage 6 device evidence ${deviceMaterial.path}`,
      MAXIMUM_DEVICE_BUNDLE_BYTES,
    ),
  ]);
  const verification = await verifyArenaInputPilotEvidence({
    evidenceBundleValue: evidenceRead.value,
    buildRoot: path.dirname(buildRead.verified.resolvedPath),
    deviceEvidenceBundleValue: deviceRead.value,
    deviceArtifactsRoot: path.dirname(deviceRead.verified.resolvedPath),
  });
  const declaredBuildManifest = createArenaBuildManifest(buildRead.value);
  if (verification.buildManifest.getContentHash() !== declaredBuildManifest.getContentHash()) {
    throw new Error('Input Pilot Build Manifest 在 producer 复验期间发生变化。');
  }
  assertCanonicalBuildManifest(
    { platform: declaredBuildManifest.target, sha256: buildRead.verified.sha256 },
    canonicalBuildHashes,
    'Input Pilot release evidence',
  );
  return verification.result;
}

async function readCanonicalBuildHashes(bundle, verifiedMaterialsByPath, cache) {
  const statement = bundle.evidence.find(({ gateId }) => (
    gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_INTEGRITY
  )) ?? bundle.evidence.find(({ gateId }) => (
    gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_BUDGET
  ));
  if (!statement) return null;
  const manifests = await readBuildManifests(statement, verifiedMaterialsByPath, cache);
  return new Map(manifests.map((manifest, index) => [
    manifest.target,
    statement.materials[index].sha256,
  ]));
}

async function assertCanonicalBuildStable(bundle, verifiedMaterialsByPath, expected) {
  if (expected === null) return;
  const current = await readCanonicalBuildHashes(bundle, verifiedMaterialsByPath, new Map());
  if (
    current === null
    || current.size !== expected.size
    || [...expected].some(([platform, sha256]) => current.get(platform) !== sha256)
  ) throw new Error('最终构建材料在 release producer 复验期间发生变化。');
}

function assertSourceIdentity(bundle, sourceIdentity) {
  if (!sourceIdentity || typeof sourceIdentity !== 'object') {
    throw new TypeError('Source release producer 需要当前 Git source identity。');
  }
  if (
    sourceIdentity.sourceCommit !== bundle.commit
    || sourceIdentity.sourceDirty !== bundle.sourceDirty
  ) throw new Error('Source release producer 的 Git identity 与候选不一致。');
  if (sourceIdentity.sourceDirty) {
    throw new Error('Source release producer 只能在 clean candidate checkout 上运行。');
  }
}

export function arenaStage9ReleaseRequiresSourceIdentity(bundle) {
  return bundle.evidence.some(({ gateId }) => SUPPORTED_SOURCE_GATES.has(gateId));
}

export async function verifyArenaStage9ReleaseProducerEvidence({
  definition,
  bundle,
  verifiedMaterialsByPath,
  sourceIdentity = null,
}) {
  assertSharedBuildMaterials(bundle);
  if (arenaStage9ReleaseRequiresSourceIdentity(bundle)) assertSourceIdentity(bundle, sourceIdentity);
  const verifiedEvidence = [];
  const buildManifestCache = new Map();
  const canonicalBuildHashes = await readCanonicalBuildHashes(
    bundle,
    verifiedMaterialsByPath,
    buildManifestCache,
  );
  const deviceArtifactHashes = new Map();
  for (const statement of bundle.evidence) {
    let result;
    if (SUPPORTED_BUILD_GATES.has(statement.gateId)) {
      const manifests = await readBuildManifests(
        statement,
        verifiedMaterialsByPath,
        buildManifestCache,
      );
      if (
        manifests.some(({ commit }) => commit !== bundle.commit)
        || manifests.some(({ buildId }) => buildId !== bundle.buildId)
        || manifests.some(({ sourceDirty }) => sourceDirty !== bundle.sourceDirty)
      ) throw new Error(`Release gate ${statement.gateId} 的 Manifest 与候选身份不一致。`);
      result = statement.gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_INTEGRITY
        ? createArenaBuildIntegrityReleaseResult(manifests)
        : createArenaBuildBudgetReleaseResult(manifests);
    } else if (statement.gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.GOLDEN_REPLAY) {
      result = await verifyGoldenReplay(statement, verifiedMaterialsByPath, bundle.commit);
    } else if (statement.gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.BALANCE_VALIDATION) {
      result = await verifyBalanceValidation(statement, verifiedMaterialsByPath, bundle);
    } else if (statement.gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.REGRESSION) {
      result = await verifyRegression(statement, verifiedMaterialsByPath, bundle.commit);
    } else if (statement.gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.DEFECTS) {
      result = await verifyDefects(statement, verifiedMaterialsByPath, bundle);
    } else if (statement.gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.INPUT_PILOT) {
      result = await verifyInputPilotEvidence(
        statement,
        bundle,
        verifiedMaterialsByPath,
        canonicalBuildHashes,
      );
    } else if (SUPPORTED_EXTERNAL_BUILD_GATES.has(statement.gateId)) {
      result = statement.gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.HUMAN_FAIRNESS
        ? await verifyHumanFairnessEvidence(
          statement,
          verifiedMaterialsByPath,
          canonicalBuildHashes,
        )
        : await verifyDeviceEvidence(
          statement,
          verifiedMaterialsByPath,
          canonicalBuildHashes,
          deviceArtifactHashes,
        );
    } else continue;
    verifiedEvidence.push(verifyArenaReleaseEvidenceProducerResult({
      definition,
      bundle,
      statement,
      result,
    }));
  }
  await assertCanonicalBuildStable(bundle, verifiedMaterialsByPath, canonicalBuildHashes);
  return Object.freeze(verifiedEvidence);
}
