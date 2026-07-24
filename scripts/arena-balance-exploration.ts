import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createArenaBalanceExplorationBundle,
  readArenaBalanceExplorationBundle,
} from '@number-strategy-jump/arena-v1-experiment';
import {
  ARENA_STAGE9_BALANCE_EXPLORATION_CANDIDATES,
  ARENA_STAGE9_BALANCE_EXPLORATION_ID,
  createArenaStage9BalanceExplorationDefinitions,
  createArenaStage9BalanceExplorationRegistries,
} from '@number-strategy-jump/arena-v1-experiment';
import {
  ARENA_BALANCE_EXPLORATION_SELECTION_POLICY,
} from '@number-strategy-jump/arena-v1-experiment';
import { createArenaExperimentReportBundle } from '@number-strategy-jump/arena-experiment';
import {
  assertArenaGitSourceIdentityStable,
  readArenaGitSourceIdentity,
} from './arena-git-source-identity.js';
import { runArenaNodeExperiment } from './arena-node-experiment-runner.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface BalanceExplorationCliOptions {
  describe: boolean;
  output: string | null;
  verify: string | null;
  help: boolean;
}

type BalanceExplorationBundle = ReturnType<typeof readArenaBalanceExplorationBundle>;

function usage(): string {
  return [
    'Usage:',
    '  npm run arena:experiment:balance:explore -- --describe',
    '  npm run arena:experiment:balance:explore -- --output=<new-json-file>',
    '  npm run arena:experiment:balance:explore -- --verify=<json-file>',
  ].join('\n');
}

function parseArgs(values: readonly string[]): BalanceExplorationCliOptions {
  const result: BalanceExplorationCliOptions = {
    describe: false,
    output: null,
    verify: null,
    help: false,
  };
  const seen = new Set<string>();
  for (const argument of values) {
    if (argument === '--help' || argument === '-h') {
      result.help = true;
      continue;
    }
    if (argument === '--describe') {
      if (seen.has('describe')) throw new Error('--describe 不能重复。');
      seen.add('describe');
      result.describe = true;
      continue;
    }
    const match = argument.match(/^--(output|verify)=(.+)$/);
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    const key = match[1];
    const value = match[2];
    if ((key !== 'output' && key !== 'verify') || !value) throw new Error(`参数 ${argument} 无效。`);
    if (seen.has(key)) throw new Error(`--${key} 不能重复。`);
    seen.add(key);
    result[key] = value;
  }
  const modes = Number(result.describe) + Number(result.output !== null) + Number(result.verify !== null);
  if (!result.help && modes !== 1) {
    throw new Error(`必须且只能选择 --describe、--output 或 --verify。\n${usage()}`);
  }
  return result;
}

function resolveJsonPath(value: string, name: string): string {
  const file = path.resolve(root, value);
  if (path.extname(file) !== '.json') throw new RangeError(`${name} 必须是 .json 文件。`);
  return file;
}

async function writeExclusive(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
}

function summary(bundle: BalanceExplorationBundle, file: string | null = null) {
  return Object.freeze({
    id: bundle.id,
    bundleHash: bundle.bundleHash,
    sourceCommit: bundle.selection.sourceCommit,
    selectedCandidateId: bundle.selection.selectedCandidateId,
    rankings: bundle.selection.rankings.map((ranking) => Object.freeze({
      candidateId: ranking.candidateId,
      livesPerParticipant: ranking.livesPerParticipant,
      eligible: ranking.eligible,
      penalty: ranking.penalty,
      targetDurationShare: ranking.targetDurationShare,
      medianTicks: ranking.medianTicks,
      failedBalanceCheckIds: ranking.failedBalanceCheckIds,
    })),
    file,
  });
}

async function verify(fileValue: string): Promise<void> {
  const file = resolveJsonPath(fileValue, '--verify');
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`无法读取 Balance exploration ${file}：${message}`);
  }
  console.log(JSON.stringify(summary(readArenaBalanceExplorationBundle(parsed), file), null, 2));
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.verify !== null) {
    await verify(options.verify);
    return;
  }
  const source = await readArenaGitSourceIdentity(root);
  const definitions = createArenaStage9BalanceExplorationDefinitions(source);
  if (options.describe) {
    console.log(JSON.stringify({
      id: ARENA_STAGE9_BALANCE_EXPLORATION_ID,
      selectionPolicy: ARENA_BALANCE_EXPLORATION_SELECTION_POLICY,
      definitions: definitions.map((definition) => ({
        definition: definition.toJSON(),
        definitionHash: definition.getContentHash(),
      })),
    }, null, 2));
    return;
  }
  if (source.sourceDirty) {
    throw new Error('Balance exploration 只能在干净 source commit 上运行。');
  }
  const reportBundles: ReturnType<typeof createArenaExperimentReportBundle>[] = [];
  for (const definition of definitions) {
    const report = await runArenaNodeExperiment({
      root,
      source,
      definition,
      registries: createArenaStage9BalanceExplorationRegistries(),
    });
    reportBundles.push(createArenaExperimentReportBundle({
      suite: 'balance-candidate',
      definition,
      report,
    }));
  }
  const bundle = createArenaBalanceExplorationBundle({
    id: ARENA_STAGE9_BALANCE_EXPLORATION_ID,
    expectedCandidates: ARENA_STAGE9_BALANCE_EXPLORATION_CANDIDATES,
    reportBundles,
  });
  assertArenaGitSourceIdentityStable(source, await readArenaGitSourceIdentity(root));
  if (options.output === null) throw new Error('缺少 --output。');
  const output = resolveJsonPath(options.output, '--output');
  await writeExclusive(output, bundle);
  console.log(JSON.stringify(summary(bundle, output), null, 2));
  if (bundle.selection.selectedCandidateId === null) process.exitCode = 2;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
