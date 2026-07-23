import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
  createArenaDeviceAcceptanceDefinition,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaDeviceAcceptanceBundle,
  createArenaDeviceAcceptanceReport,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID,
} from '@number-strategy-jump/arena-stage9-evidence-content';
import {
  ARENA_BUILD_DEFAULT_ENTRY,
  createArenaBuildManifest,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  createArenaPerformanceEvidenceReport,
} from '@number-strategy-jump/arena-stage9-evidence-content';
import {
  createArenaStage9PerformanceV1Policy,
} from '@number-strategy-jump/arena-stage9-evidence-content';
import {
  readVerifiedEvidenceArtifact,
  resolveEvidenceRoot,
} from './evidence-file-verifier.ts';

const MAXIMUM_BUILD_MANIFEST_BYTES = 5 * 1024 * 1024;
const MAXIMUM_PERFORMANCE_TRACE_BYTES = 64 * 1024 * 1024;

async function verifyArtifacts(definition, bundle, rootValue) {
  const root = await resolveEvidenceRoot(rootValue);
  const artifacts = [];
  const artifactIdentities = [];
  const performanceRecords = [];
  const buildManifestsByPlatform = new Map();
  const verifiedPaths = new Map();
  const verifiedFiles = new Map();
  const verifiedHashes = new Map();
  for (const record of bundle.records) {
    for (const artifact of record.artifacts) {
      const checked = await readVerifiedEvidenceArtifact({
        root,
        relativePath: artifact.path,
        expectedByteLength: artifact.byteLength,
        expectedSha256: artifact.sha256,
        maximumBytes: artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.PERFORMANCE_TRACE
          ? MAXIMUM_PERFORMANCE_TRACE_BYTES
          : artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
            ? MAXIMUM_BUILD_MANIFEST_BYTES
            : null,
        includeText: artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.PERFORMANCE_TRACE
          || artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST,
      });
      const {
        byteLength,
        fileIdentity,
        resolvedPath,
        sha256,
        text,
      } = checked;
      const previousPath = verifiedPaths.get(resolvedPath);
      const isBuildManifest = artifact.kind
        === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST;
      const sharedBuildManifestPath = previousPath?.kind
        === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
        && isBuildManifest;
      if (previousPath && !sharedBuildManifestPath) {
        throw new Error(`artifact ${artifact.path} 与 ${previousPath.path} 指向同一路径。`);
      }
      let buildManifest = null;
      let performanceRecord = null;
      if (isBuildManifest) buildManifest = createArenaBuildManifest(JSON.parse(text));
      if (artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.PERFORMANCE_TRACE) {
        performanceRecord = JSON.parse(text);
      }
      const previousFile = verifiedFiles.get(fileIdentity);
      const sharedBuildManifestFile = previousFile?.kind
        === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
        && isBuildManifest;
      if (previousFile && !sharedBuildManifestFile) {
        throw new Error(`artifact ${artifact.path} 与 ${previousFile.path} 指向同一文件。`);
      }
      const previousHash = verifiedHashes.get(sha256);
      const sharedBuildManifestHash = previousHash?.kind
        === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
        && isBuildManifest;
      if (previousHash && !sharedBuildManifestHash) {
        throw new Error(`artifact ${artifact.path} 与 ${previousHash.path} 内容重复。`);
      }
      if (buildManifest !== null) {
        if (buildManifest.sourceDirty) throw new Error('设备验收不能使用非干净源码构建。');
        if (buildManifest.commit !== bundle.commit) {
          throw new Error(`构建 Manifest ${artifact.path} commit 与 Bundle 不一致。`);
        }
        if (buildManifest.buildId !== bundle.buildId) {
          throw new Error(`构建 Manifest ${artifact.path} buildId 与 Bundle 不一致。`);
        }
        if (buildManifest.target !== definition.getTarget(record.targetId).platform) {
          throw new Error(`构建 Manifest ${artifact.path} 平台与 target 不一致。`);
        }
        if (buildManifest.defaultEntry !== ARENA_BUILD_DEFAULT_ENTRY.PRODUCT) {
          throw new Error(`构建 Manifest ${artifact.path} 默认入口不是 product。`);
        }
        const previousBuildManifest = buildManifestsByPlatform.get(buildManifest.target);
        if (previousBuildManifest && previousBuildManifest.sha256 !== sha256) {
          throw new Error(`平台 ${buildManifest.target} 的同一 buildId 必须复用唯一构建 Manifest。`);
        }
        buildManifestsByPlatform.set(buildManifest.target, Object.freeze({
          platform: buildManifest.target,
          sha256,
          contentHash: buildManifest.getContentHash(),
        }));
      }
      verifiedPaths.set(resolvedPath, { path: artifact.path, kind: artifact.kind });
      verifiedFiles.set(fileIdentity, { path: artifact.path, kind: artifact.kind });
      verifiedHashes.set(sha256, { path: artifact.path, kind: artifact.kind });
      artifacts.push(Object.freeze({
        runId: record.runId,
        artifactId: artifact.id,
        path: artifact.path,
        byteLength,
        sha256,
      }));
      artifactIdentities.push(Object.freeze({
        kind: artifact.kind,
        path: artifact.path,
        sha256,
      }));
      if (performanceRecord !== null) {
        performanceRecords.push(Object.freeze({
          runId: record.runId,
          artifactId: artifact.id,
          source: performanceRecord,
        }));
      }
    }
  }
  return Object.freeze({
    artifacts: Object.freeze(artifacts),
    artifactIdentities: Object.freeze(artifactIdentities),
    buildManifests: Object.freeze([...buildManifestsByPlatform.values()].sort((left, right) => (
      left.platform < right.platform ? -1 : left.platform > right.platform ? 1 : 0
    ))),
    performanceRecords: Object.freeze(performanceRecords),
  });
}

export async function verifyArenaDeviceEvidence({
  definition: definitionValue,
  bundleValue,
  artifactsRoot,
}) {
  const definition = createArenaDeviceAcceptanceDefinition(definitionValue);
  const bundle = createArenaDeviceAcceptanceBundle(definition, bundleValue);
  const verified = await verifyArtifacts(definition, bundle, artifactsRoot);
  const report = createArenaDeviceAcceptanceReport(definition, bundle);
  let performanceReport = null;
  if (definition.id === ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID) {
    performanceReport = createArenaPerformanceEvidenceReport({
      deviceDefinition: definition,
      deviceBundle: bundle,
      performancePolicy: createArenaStage9PerformanceV1Policy(),
      performanceRecords: verified.performanceRecords.map(({ source }) => source),
    });
  } else if (verified.performanceRecords.length > 0) {
    throw new Error(`Definition ${definition.id} 不接受 Performance Trace。`);
  }
  return Object.freeze({
    definition,
    bundle,
    artifacts: verified.artifacts,
    artifactIdentities: verified.artifactIdentities,
    buildManifests: verified.buildManifests,
    performanceRecords: verified.performanceRecords,
    report,
    performanceReport,
  });
}
