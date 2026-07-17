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
  createArenaStage6DeviceAcceptanceV1Definition,
} from '../src/arena/presentation/acceptance/arena-stage6-device-acceptance-v1.js';

const MAXIMUM_BUNDLE_BYTES = 5 * 1024 * 1024;

function usage() {
  return [
    'Usage:',
    '  npm run arena:device:evidence -- --describe',
    '  npm run arena:device:evidence -- --bundle <device-evidence.json> [--artifacts-root <dir>]',
    '',
    'Exit codes: 0=ready, 2=incomplete/failed, 1=invalid evidence or I/O failure.',
  ].join('\n');
}

function parseArgs(values) {
  const result = { bundle: null, artifactsRoot: null, describe: false, help: false };
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
    const match = argument.match(/^--(bundle|artifacts-root)(?:=(.*))?$/);
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    const key = match[1];
    if (seen.has(key)) throw new Error(`参数 --${key} 不能重复。`);
    seen.add(key);
    const inlineValue = match[2];
    const value = inlineValue === undefined ? values[++index] : inlineValue;
    if (!value || value.startsWith('--')) throw new Error(`参数 --${key} 缺少值。`);
    if (key === 'bundle') result.bundle = value;
    else result.artifactsRoot = value;
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

async function verifyArtifacts(bundle, rootValue) {
  const root = await realpath(rootValue);
  const verified = [];
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
      if (previousPath) {
        throw new Error(`artifact ${artifact.path} 与 ${previousPath} 指向同一路径。`);
      }
      const fileHandle = await open(resolved, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      let metadata;
      let sha256;
      try {
        metadata = await fileHandle.stat({ bigint: true });
        if (!metadata.isFile()) throw new Error(`artifact ${artifact.path} 不是普通文件。`);
        if (metadata.size !== BigInt(artifact.byteLength)) {
          throw new Error(
            `artifact ${artifact.path} 大小不一致：${metadata.size} != ${artifact.byteLength}。`,
          );
        }
        sha256 = await hashOpenFile(fileHandle);
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
      if (previousFile) {
        throw new Error(`artifact ${artifact.path} 与 ${previousFile} 指向同一文件。`);
      }
      const previousHash = verifiedHashes.get(sha256);
      if (previousHash) {
        throw new Error(`artifact ${artifact.path} 与 ${previousHash} 内容重复。`);
      }
      if (sha256 !== artifact.sha256) {
        throw new Error(`artifact ${artifact.path} SHA-256 不一致。`);
      }
      verifiedPaths.set(resolved, artifact.path);
      verifiedFiles.set(fileIdentity, artifact.path);
      verifiedHashes.set(sha256, artifact.path);
      verified.push(Object.freeze({
        runId: record.runId,
        artifactId: artifact.id,
        path: artifact.path,
        byteLength: Number(metadata.size),
        sha256,
      }));
    }
  }
  return Object.freeze(verified);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const definition = createArenaStage6DeviceAcceptanceV1Definition();
  if (options.describe) {
    console.log(JSON.stringify({
      definition: definition.toJSON(),
      definitionHash: definition.getContentHash(),
    }, null, 2));
    return;
  }
  const bundlePath = path.resolve(options.bundle);
  const artifactRoot = path.resolve(options.artifactsRoot ?? path.dirname(bundlePath));
  const source = JSON.parse(await readBundleSource(bundlePath));
  const bundle = createArenaDeviceAcceptanceBundle(definition, source);
  const artifacts = await verifyArtifacts(bundle, artifactRoot);
  const report = createArenaDeviceAcceptanceReport(definition, bundle);
  console.log(JSON.stringify({
    verifiedArtifactCount: artifacts.length,
    artifacts,
    report,
  }, null, 2));
  if (report.status !== ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
