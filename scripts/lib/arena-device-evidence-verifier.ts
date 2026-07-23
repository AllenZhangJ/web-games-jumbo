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
} from './evidence-file-verifier.js';

const MAXIMUM_BUILD_MANIFEST_BYTES = 5 * 1024 * 1024;
const MAXIMUM_PERFORMANCE_TRACE_BYTES = 64 * 1024 * 1024;

type DeviceDefinition = ReturnType<typeof createArenaDeviceAcceptanceDefinition>;
type DeviceBundle = ReturnType<typeof createArenaDeviceAcceptanceBundle>;

interface VerifiedDeviceArtifact {
  readonly runId: string;
  readonly artifactId: string;
  readonly path: string;
  readonly byteLength: number;
  readonly sha256: string;
}

interface DeviceArtifactIdentity {
  readonly kind: string;
  readonly path: string;
  readonly sha256: string;
}

interface VerifiedBuildManifestIdentity {
  readonly platform: string;
  readonly sha256: string;
  readonly contentHash: string;
}

interface VerifiedPerformanceRecord {
  readonly runId: string;
  readonly artifactId: string;
  readonly source: unknown;
}

interface VerifiedDeviceArtifacts {
  readonly artifacts: readonly VerifiedDeviceArtifact[];
  readonly artifactIdentities: readonly DeviceArtifactIdentity[];
  readonly buildManifests: readonly VerifiedBuildManifestIdentity[];
  readonly performanceRecords: readonly VerifiedPerformanceRecord[];
}

export interface ArenaDeviceEvidenceVerification {
  readonly definition: DeviceDefinition;
  readonly bundle: DeviceBundle;
  readonly artifacts: readonly VerifiedDeviceArtifact[];
  readonly artifactIdentities: readonly DeviceArtifactIdentity[];
  readonly buildManifests: readonly VerifiedBuildManifestIdentity[];
  readonly performanceRecords: readonly VerifiedPerformanceRecord[];
  readonly report: ReturnType<typeof createArenaDeviceAcceptanceReport>;
  readonly performanceReport: ReturnType<typeof createArenaPerformanceEvidenceReport> | null;
}

async function verifyArtifacts(
  definition: DeviceDefinition,
  bundle: DeviceBundle,
  rootValue: string,
): Promise<VerifiedDeviceArtifacts> {
  const root = await resolveEvidenceRoot(rootValue);
  const artifacts: VerifiedDeviceArtifact[] = [];
  const artifactIdentities: DeviceArtifactIdentity[] = [];
  const performanceRecords: VerifiedPerformanceRecord[] = [];
  const buildManifestsByPlatform = new Map<string, VerifiedBuildManifestIdentity>();
  const verifiedPaths = new Map<string, Readonly<{ path: string; kind: string }>>();
  const verifiedFiles = new Map<string, Readonly<{ path: string; kind: string }>>();
  const verifiedHashes = new Map<string, Readonly<{ path: string; kind: string }>>();
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
      let buildManifest: ReturnType<typeof createArenaBuildManifest> | null = null;
      let performanceRecord: unknown = null;
      if ((isBuildManifest || artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.PERFORMANCE_TRACE) && text === null) {
        throw new Error(`artifact ${artifact.path} 缺少文本内容。`);
      }
      if (isBuildManifest) buildManifest = createArenaBuildManifest(JSON.parse(text as string));
      if (artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.PERFORMANCE_TRACE) {
        performanceRecord = JSON.parse(text as string) as unknown;
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
        const target = definition.getTarget(record.targetId);
        if (!target) throw new Error(`Definition 缺少 target ${record.targetId}。`);
        if (buildManifest.target !== target.platform) {
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
}: Readonly<{
  definition: unknown;
  bundleValue: unknown;
  artifactsRoot: string;
}>): Promise<ArenaDeviceEvidenceVerification> {
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
