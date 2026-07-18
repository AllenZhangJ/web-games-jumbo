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
  createArenaStage9MapExperimentDefinition,
  createArenaStage9MapExperimentRegistries,
} from '../src/arena/experiment/arena-map-experiment-composition.js';
import {
  createArenaStage9MovementExperimentDefinition,
  createArenaStage9MovementExperimentRegistries,
} from '../src/arena/experiment/arena-movement-experiment-composition.js';
import {
  createArenaStage9BotExperimentDefinition,
  createArenaStage9BotExperimentRegistries,
} from '../src/arena/experiment/arena-bot-experiment-composition.js';
import {
  ARENA_EXPERIMENT_OUTCOME,
} from '../src/arena/experiment/experiment-report.js';
import { readArenaGitSourceIdentity } from './arena-git-source-identity.mjs';
import { runArenaNodeExperiment } from './arena-node-experiment-runner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUITE = Object.freeze({
  SCRIPTED_PRESSURE: 'scripted-pressure',
  MATCHCORE_INVARIANTS: 'matchcore-invariants',
  MAP_TIMELINE: 'map-timeline',
  MOVEMENT_STRESS: 'movement-stress',
  BOT_CAPABILITY: 'bot-capability',
});

function usage() {
  return [
    'Usage:',
    '  npm run arena:experiment -- [--suite=scripted-pressure|matchcore-invariants|map-timeline|movement-stress|bot-capability]',
    '    [--cases=<n>] [--first-seed=<uint32>] [--replay-samples=<n>]',
    '    [--describe] [--summary] [--allow-dirty]',
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
    summary: false,
    allowDirty: false,
    help: false,
  };
  const seen = new Set();
  for (const argument of values) {
    if (argument === '--help' || argument === '-h') {
      result.help = true;
      continue;
    }
    if (argument === '--describe' || argument === '--summary' || argument === '--allow-dirty') {
      if (seen.has(argument)) throw new Error(`参数 ${argument} 不能重复。`);
      seen.add(argument);
      if (argument === '--describe') result.describe = true;
      else if (argument === '--summary') result.summary = true;
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
  if (result.describe && result.summary) {
    throw new RangeError('--describe 与 --summary 不能同时使用。');
  }
  return result;
}

function createReportSummary(suite, report) {
  return Object.freeze({
    suite,
    definitionId: report.definitionId,
    definitionHash: report.definitionHash,
    outcome: report.outcome,
    freezeEligible: report.freezeEligible,
    stoppedEarly: report.stoppedEarly,
    plannedCaseCount: report.plannedCaseCount,
    executedCaseCount: report.executedCaseCount,
    completedCaseCount: report.completedCaseCount,
    failedCaseCount: report.failedCaseCount,
    remainingCaseCount: report.remainingCaseCount,
    failedMetricGateCount: report.failedMetricGateCount,
    failedMetricGates: report.failedMetricGates,
    metrics: report.metrics.map(({ id, version, data }) => Object.freeze({
      id,
      version,
      gate: data.gate ?? null,
    })),
    resultHash: report.resultHash,
  });
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
  if (options.suite === SUITE.MATCHCORE_INVARIANTS) {
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
  if (options.suite === SUITE.MAP_TIMELINE) {
    return Object.freeze({
      definition: createArenaStage9MapExperimentDefinition({
        ...source,
        firstSeed: options.firstSeed ?? 0x5a6e0000,
        caseCount: options.cases ?? 100,
        replaySampleCount: options.replaySamples ?? 3,
      }),
      registries: createArenaStage9MapExperimentRegistries(),
    });
  }
  if (options.firstSeed !== null) {
    throw new RangeError(`${options.suite} suite 使用固定显式 seed 集，不接受 --first-seed。`);
  }
  if (options.suite === SUITE.MOVEMENT_STRESS) {
    return Object.freeze({
      definition: createArenaStage9MovementExperimentDefinition({
        ...source,
        caseCount: options.cases ?? 100,
        replaySampleCount: options.replaySamples ?? 3,
      }),
      registries: createArenaStage9MovementExperimentRegistries(),
    });
  }
  return Object.freeze({
    definition: createArenaStage9BotExperimentDefinition({
      ...source,
      caseCount: options.cases ?? 300,
      replaySampleCount: options.replaySamples ?? 3,
    }),
    registries: createArenaStage9BotExperimentRegistries(),
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
  const report = await runArenaNodeExperiment({
    root,
    source,
    definition,
    registries,
  });
  console.log(JSON.stringify(
    options.summary
      ? createReportSummary(options.suite, report)
      : { suite: options.suite, definition: definition.toJSON(), report },
    null,
    2,
  ));
  if (
    report.outcome !== ARENA_EXPERIMENT_OUTCOME.PASSED
    || (!report.freezeEligible && !options.allowDirty)
  ) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
