import path from 'node:path';
import {
  ARENA_STAGE9_RC_HANDOFF_GATE_ID,
} from '../../src/arena-release/arena-stage9-rc-handoff-v1.js';
import {
  createArenaBuildBudgetReleaseResult,
  createArenaBuildIntegrityReleaseResult,
} from '../../src/arena-release/build-release-evidence.js';
import {
  verifyArenaReleaseEvidenceProducerResult,
} from '../../src/arena-release/release-evidence-verification.js';
import {
  ARENA_BUILD_MANIFEST_FILENAME,
  createArenaBuildManifest,
} from '../../src/arena/presentation/acceptance/arena-build-manifest.js';
import {
  verifyArenaBuildManifestDirectory,
} from './arena-build-manifest-files.mjs';
import { readVerifiedTextFile } from './evidence-file-verifier.mjs';

const MAXIMUM_BUILD_MANIFEST_BYTES = 5 * 1024 * 1024;

const SUPPORTED_BUILD_GATES = new Set([
  ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_INTEGRITY,
  ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_BUDGET,
]);

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
    const verified = verifiedMaterialsByPath.get(material.path);
    if (!verified) throw new Error(`Release material ${material.path} 尚未完成完整性验证。`);
    const directory = path.dirname(verified.resolvedPath);
    if (directories.has(directory)) {
      throw new RangeError(`Release gate ${statement.gateId} 重复引用构建目录 ${directory}。`);
    }
    directories.add(directory);
    let manifest = cache.get(directory);
    if (!manifest) {
      const verifiedManifest = await readVerifiedTextFile(verified.resolvedPath, {
        label: `release build manifest ${material.path}`,
        maximumBytes: MAXIMUM_BUILD_MANIFEST_BYTES,
      });
      if (
        verifiedManifest.byteLength !== verified.byteLength
        || verifiedManifest.sha256 !== verified.sha256
      ) throw new Error(`Release material ${material.path} 在 producer 复验前发生变化。`);
      const materialManifest = createArenaBuildManifest(JSON.parse(verifiedManifest.text));
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

export async function verifyArenaStage9ReleaseProducerEvidence({
  definition,
  bundle,
  verifiedMaterialsByPath,
}) {
  assertSharedBuildMaterials(bundle);
  const verifiedEvidence = [];
  const buildManifestCache = new Map();
  for (const statement of bundle.evidence) {
    if (!SUPPORTED_BUILD_GATES.has(statement.gateId)) continue;
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
    const result = statement.gateId === ARENA_STAGE9_RC_HANDOFF_GATE_ID.BUILD_INTEGRITY
      ? createArenaBuildIntegrityReleaseResult(manifests)
      : createArenaBuildBudgetReleaseResult(manifests);
    verifiedEvidence.push(verifyArenaReleaseEvidenceProducerResult({
      definition,
      bundle,
      statement,
      result,
    }));
  }
  return Object.freeze(verifiedEvidence);
}
