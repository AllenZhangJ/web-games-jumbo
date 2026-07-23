import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  rename,
  rm,
  rmdir,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
  createArenaStage9HumanFairnessV1Definition,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_BUNDLE_SCHEMA_VERSION,
  createHumanMatchStudyBundle,
} from '@number-strategy-jump/arena-human-match-study';
import {
  materializeHumanMatchStudyCapturePackage,
  validateHumanMatchStudyCapturePackage,
  type HumanMatchStudyBundle,
  type HumanMatchStudyCapturePackage,
  type HumanMatchStudyDefinition,
  type HumanMatchStudyReplayArtifact,
  type HumanMatchStudyWorkspace,
} from '@number-strategy-jump/arena-human-match-study';
import {
  verifyHumanMatchStudyReplay,
} from '@number-strategy-jump/arena-human-match-study-verification';
import {
  createHumanMatchStudyWorkspace,
} from '@number-strategy-jump/arena-human-match-study';
import {
  readVerifiedTextFile,
  type VerifiedEvidenceFile,
} from './lib/evidence-file-verifier.js';
import {
  verifyArenaBuildManifestDirectory,
} from './lib/arena-build-manifest-files.js';

const MAXIMUM_CAPTURE_PACKAGE_BYTES = 256 * 1024 * 1024;
const MAXIMUM_WORKSPACE_BYTES = 5 * 1024 * 1024;

type HumanFairnessIngestOptions =
  | Readonly<{ help: true }>
  | Readonly<{
    help: false;
    packages: readonly string[];
    workspace: string;
    buildRoot: string;
    output: string;
  }>;
interface CapturePackageInput {
  readonly capturePackage: HumanMatchStudyCapturePackage;
  readonly verified: VerifiedEvidenceFile & Readonly<{ text: string }>;
}
interface WorkspaceAudit {
  readonly workspace: HumanMatchStudyWorkspace;
  readonly verified: VerifiedEvidenceFile & Readonly<{ text: string }>;
}

function usage(): string {
  return [
    'Usage:',
    '  npm run arena:human-fairness:ingest -- --package <capture.json> [--package <capture.json> ...] --workspace <workspace.json> --build-root <clean-web-build> --output <new-directory>',
    '',
    'The output directory must not exist. Inputs are verified, materialized and replayed before one atomic publish.',
  ].join('\n');
}

function parseArgs(values: readonly string[]): HumanFairnessIngestOptions {
  const result: {
    packages: string[];
    workspace: string | null;
    buildRoot: string | null;
    output: string | null;
    help: boolean;
  } = {
    packages: [],
    workspace: null,
    buildRoot: null,
    output: null,
    help: false,
  };
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (argument === '--help' || argument === '-h') {
      result.help = true;
      continue;
    }
    if (!argument) throw new Error('参数不能为空。');
    const match = argument.match(/^--(package|workspace|build-root|output)(?:=(.*))?$/);
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    const key = match[1];
    if (!key) throw new Error(`参数 ${argument} 无效。`);
    const inline = match[2];
    const value = inline === undefined ? values[++index] : inline;
    if (!value || value.startsWith('--')) {
      throw new Error(`参数 --${key} 缺少值。`);
    }
    if (key === 'package') result.packages.push(value);
    else if (key === 'workspace') {
      if (result.workspace !== null) throw new Error('参数 --workspace 不能重复。');
      result.workspace = value;
    }
    else if (key === 'build-root') {
      if (result.buildRoot !== null) throw new Error('参数 --build-root 不能重复。');
      result.buildRoot = value;
    } else {
      if (result.output !== null) throw new Error('参数 --output 不能重复。');
      result.output = value;
    }
  }
  if (result.help) return Object.freeze({ help: true });
  if (result.packages.length === 0) throw new Error(`至少需要一个 --package。\n${usage()}`);
  if (result.workspace === null) throw new Error(`缺少 --workspace。\n${usage()}`);
  if (result.buildRoot === null) throw new Error(`缺少 --build-root。\n${usage()}`);
  if (result.output === null) throw new Error(`缺少 --output。\n${usage()}`);
  return Object.freeze({
    help: false,
    packages: Object.freeze([...result.packages]),
    workspace: result.workspace,
    buildRoot: result.buildRoot,
    output: result.output,
  } as const);
}

function canonicalJsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function artifactFor(
  replayBytes: Buffer,
  enrollmentIndex: number,
  matchIndex: number,
): Readonly<HumanMatchStudyReplayArtifact> {
  const suffix = `${String(enrollmentIndex).padStart(4, '0')}/${String(matchIndex).padStart(2, '0')}`;
  return Object.freeze({
    id: `human-study-replay-${suffix.replace('/', '-')}`,
    path: `replays/enrollment-${suffix.split('/')[0]}/match-${suffix.split('/')[1]}.json`,
    sha256: createHash('sha256').update(replayBytes).digest('hex'),
    byteLength: replayBytes.byteLength,
  });
}

async function readPackages(
  definition: HumanMatchStudyDefinition,
  packagePaths: readonly string[],
): Promise<readonly Readonly<CapturePackageInput>[]> {
  const files = new Set<string>();
  const hashes = new Set<string>();
  const packageIds = new Set<string>();
  const inputs: Readonly<CapturePackageInput>[] = [];
  for (const [index, packagePath] of packagePaths.entries()) {
    const verified = await readVerifiedTextFile(packagePath, {
      label: `Human Match Study capture package ${index}`,
      maximumBytes: MAXIMUM_CAPTURE_PACKAGE_BYTES,
    });
    if (files.has(verified.fileIdentity)) {
      throw new Error(`capture package ${index} 重复使用同一文件。`);
    }
    if (hashes.has(verified.sha256)) {
      throw new Error(`capture package ${index} 重复使用相同内容。`);
    }
    files.add(verified.fileIdentity);
    hashes.add(verified.sha256);
    const capturePackage = validateHumanMatchStudyCapturePackage(
      definition,
      JSON.parse(verified.text),
    );
    if (packageIds.has(capturePackage.packageId)) {
      throw new Error(`重复 capture packageId ${capturePackage.packageId}。`);
    }
    packageIds.add(capturePackage.packageId);
    if (verified.text === null) throw new Error(`capture package ${index} 未读取文本。`);
    inputs.push(Object.freeze({ capturePackage, verified: { ...verified, text: verified.text } }));
  }
  return Object.freeze(inputs.sort((left, right) => (
    left.capturePackage.assignment.enrollmentIndex
    - right.capturePackage.assignment.enrollmentIndex
  )));
}

async function readAndVerifyWorkspace(
  definition: HumanMatchStudyDefinition,
  workspacePath: string,
  inputs: readonly Readonly<CapturePackageInput>[],
): Promise<Readonly<WorkspaceAudit>> {
  const verified = await readVerifiedTextFile(workspacePath, {
    label: 'Human Match Study workspace audit',
    maximumBytes: MAXIMUM_WORKSPACE_BYTES,
  });
  if (verified.text === null) throw new Error('Human Match Study workspace audit 未读取文本。');
  const workspace = createHumanMatchStudyWorkspace(
    definition,
    JSON.parse(verified.text),
  );
  if (workspace.activeTrial !== null) {
    throw new Error('workspace audit 仍有 active trial，不能生成最终证据。');
  }
  if (workspace.receipts.length !== inputs.length) {
    throw new Error('workspace receipt 数量与 capture package 数量不一致。');
  }
  for (const [index, input] of inputs.entries()) {
    const receipt = workspace.receipts[index];
    const capturePackage = input.capturePackage;
    if (!receipt) throw new Error(`workspace 缺少 receipt ${index}。`);
    if (
      receipt.assignment.assignmentId !== capturePackage.assignment.assignmentId
      || receipt.assignment.enrollmentIndex !== capturePackage.assignment.enrollmentIndex
      || receipt.trialId !== capturePackage.recordId
      || receipt.status !== capturePackage.status
      || receipt.terminationReason !== capturePackage.terminationReason
      || receipt.packageReceipt.packageId !== capturePackage.packageId
      || receipt.packageReceipt.sha256 !== input.verified.sha256
      || receipt.packageReceipt.byteLength !== input.verified.byteLength
      || receipt.packageReceipt.fileName !== path.basename(input.verified.resolvedPath)
    ) throw new Error(`workspace receipt ${index} 与 capture package 不一致。`);
  }
  return Object.freeze({ workspace, verified: { ...verified, text: verified.text } });
}

async function materializeIntoTemporaryDirectory(
  definition: HumanMatchStudyDefinition,
  inputs: readonly Readonly<CapturePackageInput>[],
  workspaceAudit: Readonly<WorkspaceAudit>,
  temporaryRoot: string,
): Promise<HumanMatchStudyBundle> {
  const records: ReturnType<typeof materializeHumanMatchStudyCapturePackage>[] = [];
  const packageManifest: Array<Readonly<Record<string, string | number>>> = [];
  await mkdir(path.join(temporaryRoot, 'raw-capture-packages'), { recursive: true });
  for (const { capturePackage, verified } of inputs) {
    const enrollmentIndex = capturePackage.assignment.enrollmentIndex;
    const replayArtifacts: Readonly<HumanMatchStudyReplayArtifact>[] = [];
    const replayBytes: Buffer[] = [];
    for (const match of capturePackage.matches) {
      const bytes = canonicalJsonBytes(match.replay);
      replayBytes.push(bytes);
      replayArtifacts.push(artifactFor(bytes, enrollmentIndex, match.matchIndex));
    }
    const record = materializeHumanMatchStudyCapturePackage(
      definition,
      capturePackage,
      replayArtifacts,
    );
    for (const match of capturePackage.matches) {
      verifyHumanMatchStudyReplay({
        definition,
        record,
        matchIndex: match.matchIndex,
        replay: match.replay,
      });
    }
    for (const [index, artifact] of replayArtifacts.entries()) {
      const outputPath = path.join(temporaryRoot, ...artifact.path.split('/'));
      const bytes = replayBytes[index];
      if (!bytes) throw new Error(`缺少 replay artifact ${artifact.id} 字节。`);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, bytes, { flag: 'wx' });
    }
    const rawFileName = (
      `enrollment-${String(enrollmentIndex).padStart(4, '0')}-${capturePackage.packageId}.json`
    );
    await writeFile(
      path.join(temporaryRoot, 'raw-capture-packages', rawFileName),
      verified.text,
      { flag: 'wx' },
    );
    packageManifest.push(Object.freeze({
      packageId: capturePackage.packageId,
      enrollmentIndex,
      sourceFileName: path.basename(verified.resolvedPath),
      sourceSha256: verified.sha256,
      sourceByteLength: verified.byteLength,
      archivedPath: `raw-capture-packages/${rawFileName}`,
    }));
    records.push(record);
  }
  const firstInput = inputs[0];
  if (!firstInput) throw new Error('Human Match Study ingest 没有 capture package。');
  const first = firstInput.capturePackage;
  const createdAt = inputs.reduce(
    (latest, { capturePackage }) => (
      capturePackage.performedAt > latest ? capturePackage.performedAt : latest
    ),
    first.performedAt,
  );
  const bundle = createHumanMatchStudyBundle(definition, {
    schemaVersion: HUMAN_MATCH_STUDY_BUNDLE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: first.commit,
    buildId: first.buildId,
    createdAt,
    records,
  });
  await writeFile(
    path.join(temporaryRoot, 'human-fairness-evidence.json'),
    canonicalJsonBytes(bundle),
    { flag: 'wx' },
  );
  await writeFile(
    path.join(temporaryRoot, 'capture-package-manifest.json'),
    canonicalJsonBytes({
      schemaVersion: 1,
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      commit: bundle.commit,
      buildId: bundle.buildId,
      workspace: {
        sourceSha256: workspaceAudit.verified.sha256,
        sourceByteLength: workspaceAudit.verified.byteLength,
        revision: workspaceAudit.workspace.revision,
        receiptCount: workspaceAudit.workspace.receipts.length,
        archivedPath: 'workspace-audit.json',
      },
      packages: packageManifest,
    }),
    { flag: 'wx' },
  );
  await writeFile(
    path.join(temporaryRoot, 'workspace-audit.json'),
    workspaceAudit.verified.text,
    { flag: 'wx' },
  );
  return bundle;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const definition = createArenaStage9HumanFairnessV1Definition();
  const buildManifest = await verifyArenaBuildManifestDirectory(
    path.resolve(options.buildRoot),
    { requireCleanSource: true },
  );
  if (
    buildManifest.target !== 'web'
    || buildManifest.getArtifact('study.html') === null
  ) throw new Error('Human Match Study 必须绑定包含 study.html 的 clean Web 构建。');
  const inputs = await readPackages(definition, options.packages);
  for (const { capturePackage } of inputs) {
    if (
      capturePackage.commit !== buildManifest.commit
      || capturePackage.buildId !== buildManifest.buildId
    ) throw new Error(`capture package ${capturePackage.packageId} 与 clean build 不一致。`);
  }
  const workspaceAudit = await readAndVerifyWorkspace(
    definition,
    options.workspace,
    inputs,
  );
  const output = path.resolve(options.output);
  const parent = path.dirname(output);
  await mkdir(parent, { recursive: true });
  const temporaryRoot = await mkdtemp(path.join(parent, '.human-study-ingest-'));
  let published = false;
  let outputCreated = false;
  try {
    const bundle = await materializeIntoTemporaryDirectory(
      definition,
      inputs,
      workspaceAudit,
      temporaryRoot,
    );
    await mkdir(output, { recursive: false });
    outputCreated = true;
    const evidenceRoot = path.join(output, 'evidence');
    await rename(temporaryRoot, evidenceRoot);
    published = true;
    console.log(JSON.stringify({
      output,
      evidenceRoot,
      definitionId: bundle.definitionId,
      definitionHash: bundle.definitionHash,
      commit: bundle.commit,
      buildId: bundle.buildId,
      buildManifestHash: buildManifest.getContentHash(),
      recordCount: bundle.records.length,
      replayCount: bundle.records.reduce((sum, record) => sum + record.matches.length, 0),
    }, null, 2));
  } finally {
    if (!published) await rm(temporaryRoot, { recursive: true, force: true });
    if (!published && outputCreated) {
      try {
        await rmdir(output);
      } catch {
        // Preserve a non-empty output that may have been changed externally.
      }
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
