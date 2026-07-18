import { constants } from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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

function isWithinRoot(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..'
    && !path.isAbsolute(relative);
}

async function hashOpenFile(fileHandle) {
  const hash = createHash('sha256');
  for await (const chunk of fileHandle.createReadStream({ autoClose: false })) hash.update(chunk);
  return hash.digest('hex');
}

async function readSmallOpenFile(fileHandle, size, label, maximumBytes) {
  if (size > BigInt(maximumBytes)) {
    throw new Error(`${label} 不能超过 ${maximumBytes} bytes。`);
  }
  const length = Number(size);
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await fileHandle.read(buffer, 0, length, 0);
  if (bytesRead !== length) throw new Error(`${label} 未完整读取。`);
  return buffer.toString('utf8');
}

function sameFileState(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function readBundleSource(bundlePath) {
  const fileHandle = await open(
    bundlePath,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const metadata = await fileHandle.stat({ bigint: true });
    if (!metadata.isFile()) throw new Error('device evidence bundle 不是普通文件。');
    if (metadata.size > BigInt(MAXIMUM_BUNDLE_BYTES)) {
      throw new Error(`device evidence bundle 不能超过 ${MAXIMUM_BUNDLE_BYTES} bytes。`);
    }
    const source = await fileHandle.readFile('utf8');
    const metadataAfterRead = await fileHandle.stat({ bigint: true });
    if (!sameFileState(metadata, metadataAfterRead)) {
      throw new Error('device evidence bundle 在读取期间发生变化。');
    }
    const pathMetadataAfterRead = await stat(bundlePath, { bigint: true });
    if (!sameFileState(metadata, pathMetadataAfterRead)) {
      throw new Error('device evidence bundle 在读取期间被替换。');
    }
    return source;
  } finally {
    await fileHandle.close();
  }
}

async function verifyArtifacts(definition, bundle, rootValue) {
  const root = await realpath(rootValue);
  const verified = [];
  const performanceRecords = [];
  const verifiedPaths = new Map();
  const verifiedFiles = new Map();
  const verifiedHashes = new Map();
  for (const record of bundle.records) {
    for (const artifact of record.artifacts) {
      const resolved = await realpath(path.resolve(root, artifact.path));
      if (!isWithinRoot(root, resolved)) {
        throw new Error(`artifact ${artifact.path} 通过符号链接逃逸证据根目录。`);
      }
      const previousPath = verifiedPaths.get(resolved);
      const isBuildManifest = artifact.kind
        === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST;
      const sharedBuildManifestPath = previousPath?.kind
        === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST
        && isBuildManifest;
      if (previousPath && !sharedBuildManifestPath) {
        throw new Error(`artifact ${artifact.path} 与 ${previousPath.path} 指向同一路径。`);
      }
      const fileHandle = await open(resolved, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      let metadata;
      let sha256;
      let buildManifest = null;
      let performanceRecord = null;
      try {
        metadata = await fileHandle.stat({ bigint: true });
        if (!metadata.isFile()) throw new Error(`artifact ${artifact.path} 不是普通文件。`);
        if (metadata.size !== BigInt(artifact.byteLength)) {
          throw new Error(
            `artifact ${artifact.path} 大小不一致：${metadata.size} != ${artifact.byteLength}。`,
          );
        }
        sha256 = await hashOpenFile(fileHandle);
        if (artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.BUILD_MANIFEST) {
          buildManifest = createArenaBuildManifest(JSON.parse(await readSmallOpenFile(
            fileHandle,
            metadata.size,
            `artifact ${artifact.path}`,
            MAXIMUM_BUILD_MANIFEST_BYTES,
          )));
        }
        if (artifact.kind === ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND.PERFORMANCE_TRACE) {
          performanceRecord = JSON.parse(await readSmallOpenFile(
            fileHandle,
            metadata.size,
            `artifact ${artifact.path}`,
            MAXIMUM_PERFORMANCE_TRACE_BYTES,
          ));
        }
        const metadataAfterHash = await fileHandle.stat({ bigint: true });
        if (!sameFileState(metadata, metadataAfterHash)) {
          throw new Error(`artifact ${artifact.path} 在校验期间发生变化。`);
        }
      } finally {
        await fileHandle.close();
      }
      const resolvedAfterHash = await realpath(path.resolve(root, artifact.path));
      const metadataAfterClose = await stat(resolvedAfterHash, { bigint: true });
      if (resolvedAfterHash !== resolved || !sameFileState(metadata, metadataAfterClose)) {
        throw new Error(`artifact ${artifact.path} 在校验期间被替换。`);
      }
      const fileIdentity = `${metadata.dev}:${metadata.ino}`;
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
      if (sha256 !== artifact.sha256) {
        throw new Error(`artifact ${artifact.path} SHA-256 不一致。`);
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
        byteLength: Number(metadata.size),
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
