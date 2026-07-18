import {
  lstat,
  mkdir,
  realpath,
  unlink,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createArenaStage9RegressionEvidenceV1Definition,
  createArenaStage9RegressionEvidenceV1DefinitionHash,
} from '../src/arena/regression/arena-regression-evidence.js';
import { writeArenaEvidenceFileExclusive } from './lib/arena-atomic-evidence-file.mjs';
import {
  assertArenaGitSourceIdentityStable,
  readArenaGitSourceIdentity,
} from './arena-git-source-identity.mjs';
import {
  describeArenaRegressionEvidenceProcesses,
  produceArenaRegressionEvidenceReport,
} from './lib/arena-regression-evidence-producer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(values) {
  if (values.length === 1 && values[0] === '--describe') return Object.freeze({ describe: true });
  if (values.length === 2 && values[0] === '--output') {
    return Object.freeze({ describe: false, output: path.resolve(values[1]) });
  }
  throw new Error('用法：node scripts/arena-regression-evidence.mjs --describe | --output <repo 外的 .json>');
}

function assertExternalJsonOutput(output, repositoryRoot = root) {
  if (path.extname(output).toLowerCase() !== '.json') {
    throw new RangeError('Regression evidence output 必须是 .json 文件。');
  }
  const relative = path.relative(repositoryRoot, output);
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..')) {
    throw new RangeError('Regression evidence output 必须位于仓库之外。');
  }
}

async function assertOutputAbsent(output) {
  try {
    await lstat(output);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  throw new Error(`Regression evidence output 已存在：${output}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.describe) {
    console.log(JSON.stringify({
      definition: createArenaStage9RegressionEvidenceV1Definition(),
      definitionHash: createArenaStage9RegressionEvidenceV1DefinitionHash(),
      processes: describeArenaRegressionEvidenceProcesses(),
    }, null, 2));
    return;
  }
  assertExternalJsonOutput(options.output);
  const initialIdentity = await readArenaGitSourceIdentity(root);
  if (initialIdentity.sourceDirty) {
    throw new Error('Regression evidence 只能在 clean candidate checkout 上生成。');
  }
  await mkdir(path.dirname(options.output), { recursive: true });
  const canonicalRoot = await realpath(root);
  const canonicalOutput = path.join(
    await realpath(path.dirname(options.output)),
    path.basename(options.output),
  );
  assertExternalJsonOutput(canonicalOutput, canonicalRoot);
  await assertOutputAbsent(canonicalOutput);
  const report = await produceArenaRegressionEvidenceReport({
    root,
    sourceIdentity: initialIdentity,
    generatedAt: new Date().toISOString(),
    runtime: {
      name: 'node',
      version: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
  });
  const afterProcesses = await readArenaGitSourceIdentity(root);
  assertArenaGitSourceIdentityStable(initialIdentity, afterProcesses);
  const bytes = `${JSON.stringify(report, null, 2)}\n`;
  await writeArenaEvidenceFileExclusive(canonicalOutput, bytes, {
    beforePublish: async () => {
      const beforePublish = await readArenaGitSourceIdentity(root);
      assertArenaGitSourceIdentityStable(initialIdentity, beforePublish);
    },
  });
  try {
    const afterPublish = await readArenaGitSourceIdentity(root);
    assertArenaGitSourceIdentityStable(initialIdentity, afterPublish);
  } catch (error) {
    await unlink(canonicalOutput).catch(() => {});
    throw error;
  }
  console.log(JSON.stringify({
    output: canonicalOutput,
    definitionId: report.definitionId,
    definitionHash: report.definitionHash,
    sourceCommit: report.sourceCommit,
    componentIds: report.components.map(({ id }) => id),
    resultHash: report.resultHash,
    status: report.status,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
