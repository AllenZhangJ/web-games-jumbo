import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createArenaStage9S91ExperimentDefinition,
  createArenaStage9S91ExperimentRegistries,
} from '../src/arena/experiment/arena-v1-experiment-composition.js';
import {
  createArenaStage9MatchCoreExperimentDefinition,
  createArenaStage9MatchCoreExperimentRegistries,
} from '../src/arena/experiment/arena-matchcore-experiment-composition.js';
import {
  ARENA_EXPERIMENT_OUTCOME,
} from '../src/arena/experiment/experiment-report.js';
import { SimulationExperimentRunner } from '../src/arena/experiment/simulation-runner.js';
import {
  assertArenaGitSourceIdentityStable,
  readArenaGitSourceIdentity,
} from './arena-git-source-identity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUITE = Object.freeze({
  SCRIPTED_PRESSURE: 'scripted-pressure',
  MATCHCORE_INVARIANTS: 'matchcore-invariants',
});

function usage() {
  return [
    'Usage:',
    '  npm run arena:experiment -- [--suite=scripted-pressure|matchcore-invariants]',
    '    [--cases=<n>] [--first-seed=<uint32>] [--replay-samples=<n>]',
    '    [--describe] [--allow-dirty]',
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
    suite: SUITE.SCRIPTED_PRESSURE,
    cases: null,
    firstSeed: null,
    replaySamples: null,
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
    const suiteMatch = argument.match(/^--suite=(.+)$/);
    if (suiteMatch) {
      if (seen.has('suite')) throw new Error('参数 --suite 不能重复。');
      if (!Object.values(SUITE).includes(suiteMatch[1])) {
        throw new RangeError(`不支持实验 suite ${suiteMatch[1]}。`);
      }
      seen.add('suite');
      result.suite = suiteMatch[1];
      continue;
    }
    const match = argument.match(/^--(cases|first-seed|replay-samples)=(.+)$/);
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    if (seen.has(match[1])) throw new Error(`参数 --${match[1]} 不能重复。`);
    seen.add(match[1]);
    if (match[1] === 'cases') {
      result.cases = parseInteger(match[2], 1, 100_000, 'cases');
    } else if (match[1] === 'first-seed') {
      result.firstSeed = parseInteger(match[2], 0, 0xffffffff, 'first-seed');
    } else {
      result.replaySamples = parseInteger(match[2], 0, 1_000, 'replay-samples');
    }
  }
  return result;
}

function createSuite(options, source) {
  if (options.suite === SUITE.SCRIPTED_PRESSURE) {
    if (options.replaySamples !== null) {
      throw new RangeError('scripted-pressure suite 不接受 --replay-samples。');
    }
    return Object.freeze({
      definition: createArenaStage9S91ExperimentDefinition({
        ...source,
        firstSeed: options.firstSeed ?? 0x9a110000,
        caseCount: options.cases ?? 30,
      }),
      registries: createArenaStage9S91ExperimentRegistries(),
    });
  }
  return Object.freeze({
    definition: createArenaStage9MatchCoreExperimentDefinition({
      ...source,
      firstSeed: options.firstSeed ?? 0xa11e0000,
      caseCount: options.cases ?? 1_000,
      replaySampleCount: options.replaySamples ?? 5,
    }),
    registries: createArenaStage9MatchCoreExperimentRegistries(),
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const source = await readArenaGitSourceIdentity(root);
  const { definition, registries } = createSuite(options, source);
  if (options.describe) {
    console.log(JSON.stringify({
      suite: options.suite,
      definition: definition.toJSON(),
      definitionHash: definition.getContentHash(),
    }, null, 2));
    return;
  }
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
    assertArenaGitSourceIdentityStable(source, await readArenaGitSourceIdentity(root));
    console.log(JSON.stringify({ suite: options.suite, definition: definition.toJSON(), report }, null, 2));
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
