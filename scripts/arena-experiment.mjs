import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  createArenaStage9S91ExperimentDefinition,
  createArenaStage9S91ExperimentRegistries,
} from '../src/arena/experiment/arena-v1-experiment-composition.js';
import {
  ARENA_EXPERIMENT_OUTCOME,
} from '../src/arena/experiment/experiment-report.js';
import { SimulationExperimentRunner } from '../src/arena/experiment/simulation-runner.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);

function usage() {
  return [
    'Usage:',
    '  npm run arena:experiment -- [--cases=<n>] [--first-seed=<uint32>] [--describe] [--allow-dirty]',
    '',
    'Exit codes: 0=passed (or explicitly allowed dirty), 2=failed/dirty, 1=invalid or runtime failure.',
  ].join('\n');
}

function parseInteger(value, minimum, maximum, name) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new RangeError(`${name} 必须是 ${minimum}～${maximum} 的安全整数。`);
  }
  return parsed;
}

function parseArgs(values) {
  const result = {
    cases: 30,
    firstSeed: 0x9a110000,
    describe: false,
    allowDirty: false,
    help: false,
  };
  const seen = new Set();
  for (const argument of values) {
    if (argument === '--help' || argument === '-h') {
      result.help = true;
      continue;
    }
    if (argument === '--describe' || argument === '--allow-dirty') {
      if (seen.has(argument)) throw new Error(`参数 ${argument} 不能重复。`);
      seen.add(argument);
      if (argument === '--describe') result.describe = true;
      else result.allowDirty = true;
      continue;
    }
    const match = argument.match(/^--(cases|first-seed)=(.+)$/);
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    if (seen.has(match[1])) throw new Error(`参数 --${match[1]} 不能重复。`);
    seen.add(match[1]);
    if (match[1] === 'cases') {
      result.cases = parseInteger(match[2], 1, 100_000, 'cases');
    } else {
      result.firstSeed = parseInteger(match[2], 0, 0xffffffff, 'first-seed');
    }
  }
  return result;
}

async function gitText(args) {
  const result = await execFileAsync('git', args, { cwd: root, encoding: 'utf8' });
  return result.stdout.trim();
}

async function readSourceIdentity() {
  const sourceCommit = await gitText(['rev-parse', 'HEAD']);
  const sourceDirty = (await gitText(['status', '--porcelain'])) !== '';
  return Object.freeze({ sourceCommit, sourceDirty });
}

function assertSourceIdentityStable(before, after) {
  if (
    before.sourceCommit !== after.sourceCommit
    || before.sourceDirty !== after.sourceDirty
  ) {
    throw new Error('实验运行期间 Git commit 或工作区 dirty 状态发生变化，拒绝发布报告。');
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const source = await readSourceIdentity();
  const definition = createArenaStage9S91ExperimentDefinition({
    ...source,
    firstSeed: options.firstSeed,
    caseCount: options.cases,
  });
  if (options.describe) {
    console.log(JSON.stringify({
      definition: definition.toJSON(),
      definitionHash: definition.getContentHash(),
    }, null, 2));
    return;
  }
  const registries = createArenaStage9S91ExperimentRegistries();
  const runner = new SimulationExperimentRunner({ definition, ...registries });
  try {
    const report = runner.run({
      generatedAt: new Date().toISOString(),
      environment: {
        runtimeName: 'node',
        runtimeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
      },
    });
    assertSourceIdentityStable(source, await readSourceIdentity());
    console.log(JSON.stringify({ definition: definition.toJSON(), report }, null, 2));
    if (
      report.outcome !== ARENA_EXPERIMENT_OUTCOME.PASSED
      || (!report.freezeEligible && !options.allowDirty)
    ) process.exitCode = 2;
  } finally {
    runner.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
