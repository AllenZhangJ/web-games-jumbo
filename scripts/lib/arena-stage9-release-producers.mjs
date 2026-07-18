import path from 'node:path';
import { createArenaV1MatchCore } from '../../src/arena/arena-v1-match-core.js';
import {
  ARENA_STAGE9_RC_HANDOFF_GATE_ID,
} from '../../src/arena-release/arena-stage9-rc-handoff-v1.js';
import {
  createArenaBalanceValidationReleaseResult,
} from '../../src/arena-release/balance-validation-release-evidence.js';
import {
  createArenaBuildBudgetReleaseResult,
  createArenaBuildIntegrityReleaseResult,
} from '../../src/arena-release/build-release-evidence.js';
import {
  createArenaGoldenReplayReleaseResult,
} from '../../src/arena-release/golden-replay-release-evidence.js';
import {
  createArenaRegressionReleaseResult,
} from '../../src/arena-release/regression-release-evidence.js';
import {
  verifyArenaReleaseEvidenceProducerResult,
} from '../../src/arena-release/release-evidence-verification.js';
import {
  ARENA_BUILD_MANIFEST_FILENAME,
  createArenaBuildManifest,
} from '../../src/arena/presentation/acceptance/arena-build-manifest.js';
import {
  createArenaV1GoldenReplayScenarioRegistry,
} from '../../src/arena/regression/arena-v1-golden-replay-scenarios.js';
import {
  createArenaGoldenReplayManifest,
} from '../../src/arena/regression/golden-replay-manifest.js';
import {
  verifyArenaGoldenReplayCorpus,
} from '../../src/arena/regression/golden-replay-verifier.js';
import {
  verifyArenaBuildManifestDirectory,
} from './arena-build-manifest-files.mjs';
import { readVerifiedTextFile } from './evidence-file-verifier.mjs';

const MAXIMUM_BUILD_MANIFEST_BYTES = 5 * 1024 * 1024;
const MAXIMUM_GOLDEN_REPLAY_BYTES = 32 * 1024 * 1024;
const MAXIMUM_BALANCE_REPORT_BYTES = 64 * 1024 * 1024;
const MAXIMUM_REGRESSION_REPORT_BYTES = 1024 * 1024;

export const ARENA_STAGE9_SUPPORTED_RELEASE_PRODUCER_IDS = Object.freeze([
  'arena:build:budget',
  'arena:build:verify',
  'arena:experiment:report:verify',
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
    } else continue;
    verifiedEvidence.push(verifyArenaReleaseEvidenceProducerResult({
      definition,
      bundle,
      statement,
      result,
    }));
  }
  return Object.freeze(verifiedEvidence);
}
