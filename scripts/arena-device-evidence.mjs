import path from 'node:path';
import {
  ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS,
  createArenaDeviceAcceptanceBundle,
  createArenaDeviceAcceptanceReport,
} from '../src/arena/presentation/acceptance/arena-device-acceptance-bundle.js';
import {
  ARENA_DEFAULT_DEVICE_ACCEPTANCE_DEFINITION_ID,
  createArenaDeviceAcceptanceDefinitionById,
  listArenaDeviceAcceptanceDefinitionIds,
} from '../src/arena/presentation/acceptance/arena-device-acceptance-catalog.js';
import {
  ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
} from '../src/arena/presentation/acceptance/arena-device-acceptance-definition.js';
import {
  ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID,
} from '../src/arena/presentation/acceptance/arena-stage9-performance-device-acceptance-v1.js';
import {
  ARENA_BUILD_DEFAULT_ENTRY,
  createArenaBuildManifest,
} from '../src/arena/presentation/acceptance/arena-build-manifest.js';
import {
  createArenaPerformanceEvidenceReport,
} from '../src/arena/presentation/performance/arena-performance-evidence.js';
import {
  createArenaStage9PerformanceV1Policy,
} from '../src/arena/presentation/performance/arena-stage9-performance-v1.js';
import {
  readVerifiedEvidenceArtifact,
  readVerifiedTextFile,
  resolveEvidenceRoot,
} from './lib/evidence-file-verifier.mjs';

const MAXIMUM_BUNDLE_BYTES = 5 * 1024 * 1024;
const MAXIMUM_BUILD_MANIFEST_BYTES = 5 * 1024 * 1024;
const MAXIMUM_PERFORMANCE_TRACE_BYTES = 64 * 1024 * 1024;

function usage() {
  return [
    'Usage:',
    '  npm run arena:device:evidence -- --describe [--definition <id>]',
    '  npm run arena:device:evidence -- --bundle <device-evidence.json> [--artifacts-root <dir>] [--definition <id>]',
    '',
    `Definitions: ${listArenaDeviceAcceptanceDefinitionIds().join(', ')}`,
    '',
    'Exit codes: 0=ready, 2=incomplete/failed, 1=invalid evidence or I/O failure.',
  ].join('\n');
}

function parseArgs(values) {
  const result = {
    bundle: null,
    artifactsRoot: null,
    definitionId: ARENA_DEFAULT_DEVICE_ACCEPTANCE_DEFINITION_ID,
    describe: false,
    help: false,
  };
  const seen = new Set();
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (argument === '--help' || argument === '-h') {
      result.help = true;
      continue;
    }
    if (argument === '--describe') {
      if (seen.has('describe')) throw new Error('参数 --describe 不能重复。');
      seen.add('describe');
      result.describe = true;
      continue;
    }
    const match = argument.match(/^--(bundle|artifacts-root|definition)(?:=(.*))?$/);
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    const key = match[1];
    if (seen.has(key)) throw new Error(`参数 --${key} 不能重复。`);
    seen.add(key);
    const inlineValue = match[2];
    const value = inlineValue === undefined ? values[++index] : inlineValue;
    if (!value || value.startsWith('--')) throw new Error(`参数 --${key} 缺少值。`);
    if (key === 'bundle') result.bundle = value;
    else if (key === 'artifacts-root') result.artifactsRoot = value;
    else result.definitionId = value;
  }
  if (result.help) return result;
  if (result.describe && (result.bundle || result.artifactsRoot)) {
    throw new Error('--describe 不能与 --bundle 或 --artifacts-root 同时使用。');
  }
  if (!result.describe && !result.bundle) throw new Error(`缺少 --bundle。\n${usage()}`);
  return result;
}

async function readBundleSource(bundlePath) {
  return (await readVerifiedTextFile(bundlePath, {
    label: 'device evidence bundle',
    maximumBytes: MAXIMUM_BUNDLE_BYTES,
  })).text;
}

async function verifyArtifacts(definition, bundle, rootValue) {
  const root = await resolveEvidenceRoot(rootValue);
  const verified = [];
  const performanceRecords = [];
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
        resolvedPath: resolved,
        sha256,
        text,
      } = checked;
      const previousPath = verifiedPaths.get(resolved);
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
      if (artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST) {
        buildManifest = createArenaBuildManifest(JSON.parse(text));
      }
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
      }
      verifiedPaths.set(resolved, { path: artifact.path, kind: artifact.kind });
      verifiedFiles.set(fileIdentity, { path: artifact.path, kind: artifact.kind });
      verifiedHashes.set(sha256, { path: artifact.path, kind: artifact.kind });
      verified.push(Object.freeze({
        runId: record.runId,
        artifactId: artifact.id,
        path: artifact.path,
        byteLength,
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
    artifacts: Object.freeze(verified),
    performanceRecords: Object.freeze(performanceRecords),
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const definition = createArenaDeviceAcceptanceDefinitionById(options.definitionId);
  if (options.describe) {
    const description = {
      definition: definition.toJSON(),
      definitionHash: definition.getContentHash(),
    };
    if (definition.id === ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID) {
      const performancePolicy = createArenaStage9PerformanceV1Policy();
      description.performancePolicy = performancePolicy.toJSON();
      description.performancePolicyHash = performancePolicy.getContentHash();
    }
    console.log(JSON.stringify(description, null, 2));
    return;
  }
  const bundlePath = path.resolve(options.bundle);
  const artifactRoot = path.resolve(options.artifactsRoot ?? path.dirname(bundlePath));
  const source = JSON.parse(await readBundleSource(bundlePath));
  const bundle = createArenaDeviceAcceptanceBundle(definition, source);
  const verified = await verifyArtifacts(definition, bundle, artifactRoot);
  const report = createArenaDeviceAcceptanceReport(definition, bundle);
  let performanceReport = null;
  if (definition.id === ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID) {
    performanceReport = createArenaPerformanceEvidenceReport({
      deviceDefinition: definition,
      deviceBundle: bundle,
      performancePolicy: createArenaStage9PerformanceV1Policy(),
      performanceRecords: verified.performanceRecords.map(({ source: value }) => value),
    });
  } else if (verified.performanceRecords.length > 0) {
    throw new Error(`Definition ${definition.id} 不接受 Performance Trace。`);
  }
  console.log(JSON.stringify({
    verifiedArtifactCount: verified.artifacts.length,
    artifacts: verified.artifacts,
    report,
    ...(performanceReport === null ? {} : { performanceReport }),
  }, null, 2));
  if (
    report.status !== ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY
    || (
      performanceReport !== null
      && performanceReport.status !== ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY
    )
  ) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
