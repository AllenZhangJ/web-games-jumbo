import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARENA_RELEASE_READINESS_STATUS,
  createArenaReleaseReadinessReport,
} from '@number-strategy-jump/arena-release';
import {
  createArenaReleaseCandidateBundle,
  type ArenaReleaseCandidateBundle,
} from '@number-strategy-jump/arena-release';
import {
  createArenaStage9RcHandoffV1Definition,
} from '@number-strategy-jump/arena-release';
import {
  readVerifiedEvidenceArtifact,
  readVerifiedTextFile,
  resolveEvidenceRoot,
} from './lib/evidence-file-verifier.js';
import {
  ARENA_STAGE9_SUPPORTED_RELEASE_PRODUCER_IDS,
  arenaStage9ReleaseRequiresSourceIdentity,
  verifyArenaStage9ReleaseProducerEvidence,
} from './lib/arena-stage9-release-producers.js';
import {
  assertArenaGitSourceIdentityStable,
  readArenaGitSourceIdentity,
} from './arena-git-source-identity.js';

const MAXIMUM_BUNDLE_BYTES = 5 * 1024 * 1024;
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

type Stage9ReadinessCliOptions =
  | Readonly<{ help: true; describe: false }>
  | Readonly<{ help: false; describe: true }>
  | Readonly<{
    help: false;
    describe: false;
    bundle: string;
    artifactsRoot: string | null;
  }>;
interface VerifiedReleaseMaterial {
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly resolvedPath: string;
  readonly fileIdentity: string;
}
interface VerifiedReleaseMaterials {
  readonly publicMaterials: readonly Readonly<Pick<
    VerifiedReleaseMaterial,
    'path' | 'sha256' | 'byteLength'
  >>[];
  readonly byPath: ReadonlyMap<string, Readonly<VerifiedReleaseMaterial>>;
}

function usage(): string {
  return [
    'Usage:',
    '  npm run arena:stage9:readiness -- --describe',
    '  npm run arena:stage9:readiness -- --bundle <candidate.json> [--artifacts-root <dir>]',
    '',
    '该命令执行交接聚合、材料完整性校验和已支持 producer 的语义复验；其他 Gate 保持未验证。',
    'Exit codes: 0=ready, 2=incomplete/failed, 1=invalid evidence or I/O failure.',
  ].join('\n');
}

function parseArgs(values: readonly string[]): Stage9ReadinessCliOptions {
  const result: {
    describe: boolean;
    bundle: string | null;
    artifactsRoot: string | null;
    help: boolean;
  } = { describe: false, bundle: null, artifactsRoot: null, help: false };
  const seen = new Set<string>();
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
    if (!argument) throw new Error('参数不能为空。');
    const match = argument.match(/^--(bundle|artifacts-root)(?:=(.*))?$/);
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    const key = match[1];
    if (!key) throw new Error(`参数 ${argument} 无效。`);
    if (seen.has(key)) throw new Error(`参数 --${key} 不能重复。`);
    seen.add(key);
    const inlineValue = match[2];
    const value = inlineValue === undefined ? values[++index] : inlineValue;
    if (!value || value.startsWith('--')) throw new Error(`参数 --${key} 缺少值。`);
    if (key === 'bundle') result.bundle = value;
    else result.artifactsRoot = value;
  }
  if (result.help) return Object.freeze({ help: true, describe: false });
  if (result.describe && (result.bundle || result.artifactsRoot)) {
    throw new Error('--describe 不能与 --bundle 或 --artifacts-root 同时使用。');
  }
  if (!result.describe && !result.bundle) throw new Error(`缺少 --bundle。\n${usage()}`);
  if (result.describe) return Object.freeze({ help: false, describe: true });
  return Object.freeze({
    help: false,
    describe: false,
    bundle: result.bundle as string,
    artifactsRoot: result.artifactsRoot,
  });
}

function registerUniqueDeclaration(
  index: Map<string, string>,
  key: string,
  materialPath: string,
  label: string,
): void {
  const previous = index.get(key);
  if (previous && previous !== materialPath) {
    throw new Error(`release material ${materialPath} 与 ${previous} 复用了${label}。`);
  }
  index.set(key, materialPath);
}

async function verifyMaterials(
  bundle: ArenaReleaseCandidateBundle,
  rootValue: string,
): Promise<Readonly<VerifiedReleaseMaterials>> {
  const root = await resolveEvidenceRoot(rootValue);
  const verifiedByPath = new Map<string, Readonly<VerifiedReleaseMaterial>>();
  const declarationByResolvedPath = new Map<string, string>();
  const declarationByFileIdentity = new Map<string, string>();
  const declarationBySha256 = new Map<string, string>();
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
      registerUniqueDeclaration(
        declarationByResolvedPath,
        verified.resolvedPath,
        material.path,
        '同一路径',
      );
      registerUniqueDeclaration(
        declarationByFileIdentity,
        verified.fileIdentity,
        material.path,
        '同一文件',
      );
      registerUniqueDeclaration(
        declarationBySha256,
        verified.sha256,
        material.path,
        '相同内容',
      );
      verifiedByPath.set(material.path, Object.freeze({
        path: material.path,
        sha256: verified.sha256,
        byteLength: verified.byteLength,
        resolvedPath: verified.resolvedPath,
        fileIdentity: verified.fileIdentity,
      }));
    }
  }
  const publicMaterials = [...verifiedByPath.values()].map((material) => Object.freeze({
    path: material.path,
    sha256: material.sha256,
    byteLength: material.byteLength,
  })).sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  return Object.freeze({
    publicMaterials: Object.freeze(publicMaterials),
    byPath: verifiedByPath,
  });
}

async function main(): Promise<void> {
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
      verificationScope: 'aggregation-material-integrity-and-supported-producer-verification',
      producerSemanticVerification: 'partial',
      supportedProducerIds: ARENA_STAGE9_SUPPORTED_RELEASE_PRODUCER_IDS,
    }, null, 2));
    return;
  }
  const bundlePath = path.resolve(options.bundle);
  const verifiedBundle = await readVerifiedTextFile(bundlePath, {
    label: 'Arena Stage 9 release candidate bundle',
    maximumBytes: MAXIMUM_BUNDLE_BYTES,
  });
  if (verifiedBundle.text === null) throw new Error('Arena Stage 9 release candidate bundle 未读取文本。');
  const source: unknown = JSON.parse(verifiedBundle.text);
  const bundle = createArenaReleaseCandidateBundle(definition, source);
  const verifiedMaterials = await verifyMaterials(
    bundle,
    path.resolve(options.artifactsRoot ?? path.dirname(bundlePath)),
  );
  const requiresSourceIdentity = arenaStage9ReleaseRequiresSourceIdentity(bundle);
  const sourceIdentity = requiresSourceIdentity
    ? await readArenaGitSourceIdentity(repositoryRoot)
    : null;
  const producerEvidence = await verifyArenaStage9ReleaseProducerEvidence({
    definition,
    bundle,
    verifiedMaterialsByPath: verifiedMaterials.byPath,
    sourceIdentity,
  });
  if (requiresSourceIdentity) {
    assertArenaGitSourceIdentityStable(
      sourceIdentity,
      await readArenaGitSourceIdentity(repositoryRoot),
    );
  }
  const report = createArenaReleaseReadinessReport(definition, bundle, {
    verifiedEvidence: producerEvidence.map(({ gateId, evidenceHash }) => ({
      gateId,
      evidenceHash,
    })),
  });
  console.log(JSON.stringify({
    verificationScope: 'aggregation-material-integrity-and-supported-producer-verification',
    producerSemanticVerification: 'partial',
    supportedProducerIds: ARENA_STAGE9_SUPPORTED_RELEASE_PRODUCER_IDS,
    verifiedProducerEvidenceCount: producerEvidence.length,
    verifiedProducerEvidence: producerEvidence,
    verifiedMaterialCount: verifiedMaterials.publicMaterials.length,
    verifiedMaterials: verifiedMaterials.publicMaterials,
    report,
  }, null, 2));
  if (report.status !== ARENA_RELEASE_READINESS_STATUS.READY) process.exitCode = 2;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
