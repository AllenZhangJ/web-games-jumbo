import path from 'node:path';
import {
  ARENA_RELEASE_READINESS_STATUS,
  createArenaReleaseReadinessReport,
} from '../src/arena-release/release-readiness-report.js';
import {
  createArenaReleaseCandidateBundle,
} from '../src/arena-release/release-candidate-bundle.js';
import {
  createArenaStage9RcHandoffV1Definition,
} from '../src/arena-release/arena-stage9-rc-handoff-v1.js';
import {
  readVerifiedEvidenceArtifact,
  readVerifiedTextFile,
  resolveEvidenceRoot,
} from './lib/evidence-file-verifier.mjs';

const MAXIMUM_BUNDLE_BYTES = 5 * 1024 * 1024;

function usage() {
  return [
    'Usage:',
    '  npm run arena:stage9:readiness -- --describe',
    '  npm run arena:stage9:readiness -- --bundle <candidate.json> [--artifacts-root <dir>]',
    '',
    '该命令只做交接聚合与材料完整性校验；每个 Gate 的语义结论必须由 Definition 指定的 producer 生成。',
    'Exit codes: 0=ready, 2=incomplete/failed, 1=invalid evidence or I/O failure.',
  ].join('\n');
}

function parseArgs(values) {
  const result = { describe: false, bundle: null, artifactsRoot: null, help: false };
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

async function verifyMaterials(bundle, rootValue) {
  const root = await resolveEvidenceRoot(rootValue);
  const verifiedByPath = new Map();
  const declarationByResolvedPath = new Map();
  const declarationByFileIdentity = new Map();
  const declarationBySha256 = new Map();
  for (const statement of bundle.evidence) {
    for (const material of statement.materials) {
      const previous = verifiedByPath.get(material.path);
      if (previous) continue;
      const verified = await readVerifiedEvidenceArtifact({
        root,
        relativePath: material.path,
        expectedByteLength: material.byteLength,
        expectedSha256: material.sha256,
        maximumBytes: material.byteLength,
        includeText: false,
        label: `release material ${material.path}`,
      });
      for (const [index, key, label] of [
        [declarationByResolvedPath, verified.resolvedPath, '同一路径'],
        [declarationByFileIdentity, verified.fileIdentity, '同一文件'],
        [declarationBySha256, verified.sha256, '相同内容'],
      ]) {
        const previous = index.get(key);
        if (previous && previous !== material.path) {
          throw new Error(`release material ${material.path} 与 ${previous} 复用了${label}。`);
        }
        index.set(key, material.path);
      }
      verifiedByPath.set(material.path, Object.freeze({
        path: material.path,
        sha256: verified.sha256,
        byteLength: verified.byteLength,
      }));
    }
  }
  return Object.freeze([...verifiedByPath.values()].sort((left, right) => (
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  )));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const definition = createArenaStage9RcHandoffV1Definition();
  if (options.describe) {
    console.log(JSON.stringify({
      definition: definition.toJSON(),
      definitionHash: definition.getContentHash(),
      verificationScope: 'aggregation-and-material-integrity-preflight',
      producerSemanticVerification: 'not-yet-enabled',
    }, null, 2));
    return;
  }
  const bundlePath = path.resolve(options.bundle);
  const source = JSON.parse((await readVerifiedTextFile(bundlePath, {
    label: 'Arena Stage 9 release candidate bundle',
    maximumBytes: MAXIMUM_BUNDLE_BYTES,
  })).text);
  const bundle = createArenaReleaseCandidateBundle(definition, source);
  const verifiedMaterials = await verifyMaterials(
    bundle,
    path.resolve(options.artifactsRoot ?? path.dirname(bundlePath)),
  );
  const report = createArenaReleaseReadinessReport(definition, bundle);
  console.log(JSON.stringify({
    verificationScope: 'aggregation-and-material-integrity-preflight',
    producerSemanticVerification: 'not-yet-enabled',
    verifiedMaterialCount: verifiedMaterials.length,
    verifiedMaterials,
    report,
  }, null, 2));
  if (report.status !== ARENA_RELEASE_READINESS_STATUS.READY) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
