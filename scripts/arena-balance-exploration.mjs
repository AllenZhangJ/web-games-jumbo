import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createArenaBalanceExplorationBundle,
  readArenaBalanceExplorationBundle,
} from '../src/arena/experiment/arena-balance-exploration-bundle.js';
import {
  ARENA_STAGE9_BALANCE_EXPLORATION_CANDIDATES,
  ARENA_STAGE9_BALANCE_EXPLORATION_ID,
  createArenaStage9BalanceExplorationDefinitions,
  createArenaStage9BalanceExplorationRegistries,
} from '../src/arena/experiment/arena-balance-exploration-composition.js';
import {
  ARENA_BALANCE_EXPLORATION_SELECTION_POLICY,
} from '../src/arena/experiment/arena-balance-exploration-selection.js';
import { createArenaExperimentReportBundle } from '@number-strategy-jump/arena-experiment';
import {
  assertArenaGitSourceIdentityStable,
  readArenaGitSourceIdentity,
} from './arena-git-source-identity.mjs';
import { runArenaNodeExperiment } from './arena-node-experiment-runner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage() {
  return [
    'Usage:',
    '  npm run arena:experiment:balance:explore -- --describe',
    '  npm run arena:experiment:balance:explore -- --output=<new-json-file>',
    '  npm run arena:experiment:balance:explore -- --verify=<json-file>',
  ].join('\n');
}

function parseArgs(values) {
  const result = { describe: false, output: null, verify: null, help: false };
  const seen = new Set();
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
    if (seen.has(match[1])) throw new Error(`--${match[1]} 不能重复。`);
    seen.add(match[1]);
    result[match[1]] = match[2];
  }
  const modes = Number(result.describe) + Number(result.output !== null) + Number(result.verify !== null);
  if (!result.help && modes !== 1) {
    throw new Error(`必须且只能选择 --describe、--output 或 --verify。\n${usage()}`);
  }
  return result;
}

function resolveJsonPath(value, name) {
  const file = path.resolve(root, value);
  if (path.extname(file) !== '.json') throw new RangeError(`${name} 必须是 .json 文件。`);
  return file;
}

async function writeExclusive(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
}

function summary(bundle, file = null) {
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

async function verify(fileValue) {
  const file = resolveJsonPath(fileValue, '--verify');
  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`无法读取 Balance exploration ${file}：${error.message}`);
  }
  console.log(JSON.stringify(summary(readArenaBalanceExplorationBundle(parsed), file), null, 2));
}

async function main() {
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
  const reportBundles = [];
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
  const output = resolveJsonPath(options.output, '--output');
  await writeExclusive(output, bundle);
  console.log(JSON.stringify(summary(bundle, output), null, 2));
  if (bundle.selection.selectedCandidateId === null) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
