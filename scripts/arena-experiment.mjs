import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  createArenaStage9S91ExperimentDefinition,
  createArenaStage9S91ExperimentRegistries,
} from '@number-strategy-jump/arena-v1-experiment';
import {
  createArenaStage9MatchCoreExperimentDefinition,
  createArenaStage9MatchCoreExperimentRegistries,
} from '@number-strategy-jump/arena-v1-experiment';
import {
  createArenaStage9MapExperimentDefinition,
  createArenaStage9MapExperimentRegistries,
} from '@number-strategy-jump/arena-v1-experiment';
import {
  createArenaStage9MovementExperimentDefinition,
  createArenaStage9MovementExperimentRegistries,
} from '@number-strategy-jump/arena-v1-experiment';
import {
  createArenaStage9BotExperimentDefinition,
  createArenaStage9BotExperimentRegistries,
} from '../src/arena/experiment/arena-bot-experiment-composition.js';
import {
  createArenaStage9BalanceExperimentDefinition,
  createArenaStage9BalanceExperimentRegistries,
} from '../src/arena/experiment/arena-balance-experiment-composition.js';
import {
  createArenaStage9BalanceValidationExperimentDefinition,
  createArenaStage9BalanceValidationExperimentRegistries,
} from '../src/arena/experiment/arena-balance-validation-composition.js';
import {
  ARENA_EXPERIMENT_OUTCOME,
} from '@number-strategy-jump/arena-experiment';
import {
  createArenaExperimentReportBundle,
} from '@number-strategy-jump/arena-experiment';
import {
  assertArenaGitSourceIdentityStable,
  readArenaGitSourceIdentity,
} from './arena-git-source-identity.mjs';
import { runArenaNodeExperiment } from './arena-node-experiment-runner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUITE = Object.freeze({
  SCRIPTED_PRESSURE: 'scripted-pressure',
  MATCHCORE_INVARIANTS: 'matchcore-invariants',
  MAP_TIMELINE: 'map-timeline',
  MOVEMENT_STRESS: 'movement-stress',
  BOT_CAPABILITY: 'bot-capability',
  BALANCE_CANDIDATE: 'balance-candidate',
  BALANCE_VALIDATION: 'balance-validation',
});

function usage() {
  return [
    'Usage:',
    '  npm run arena:experiment -- [--suite=scripted-pressure|matchcore-invariants|map-timeline|movement-stress|bot-capability|balance-candidate|balance-validation]',
    '    [--cases=<n>] [--first-seed=<uint32>] [--replay-samples=<n>]',
    '    [--describe] [--summary] [--allow-dirty] [--output=<new-json-file>]',
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
    output: null,
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
    const outputMatch = argument.match(/^--output=(.+)$/);
    if (outputMatch) {
      if (seen.has('output')) throw new Error('参数 --output 不能重复。');
      seen.add('output');
      result.output = outputMatch[1];
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
  if (result.describe && result.output !== null) {
    throw new RangeError('--describe 不生成 Report，不能与 --output 同时使用。');
  }
  return result;
}

async function writeReportBundle(outputValue, bundle) {
  const output = path.resolve(root, outputValue);
  if (path.extname(output) !== '.json') throw new RangeError('--output 必须是 .json 文件。');
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(bundle, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  return output;
}

function createReportSummary(suite, report, bundleHash = null) {
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
    bundleHash,
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
  if (options.suite === SUITE.BALANCE_CANDIDATE) {
    if (
      options.cases !== null
      || options.firstSeed !== null
      || options.replaySamples !== null
    ) {
      throw new RangeError('balance-candidate 使用预注册固定样本，不接受采样覆盖参数。');
    }
    return Object.freeze({
      definition: createArenaStage9BalanceExperimentDefinition(source),
      registries: createArenaStage9BalanceExperimentRegistries(),
    });
  }
  if (options.suite === SUITE.BALANCE_VALIDATION) {
    if (
      options.cases !== null
      || options.firstSeed !== null
      || options.replaySamples !== null
    ) {
      throw new RangeError('balance-validation 使用预注册固定样本，不接受采样覆盖参数。');
    }
    if (options.allowDirty) {
      throw new RangeError('balance-validation 不接受 --allow-dirty。');
    }
    return Object.freeze({
      definition: createArenaStage9BalanceValidationExperimentDefinition(source),
      registries: createArenaStage9BalanceValidationExperimentRegistries(),
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
  if (
    options.suite === SUITE.BALANCE_VALIDATION
    && !options.describe
    && source.sourceDirty
  ) {
    throw new Error('balance-validation 只能在干净 source commit 上运行。');
  }
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
  const bundle = createArenaExperimentReportBundle({
    suite: options.suite,
    definition,
    report,
  });
  assertArenaGitSourceIdentityStable(source, await readArenaGitSourceIdentity(root));
  const output = options.output === null
    ? null
    : await writeReportBundle(options.output, bundle);
  console.log(JSON.stringify(
    options.summary
      ? { ...createReportSummary(options.suite, report, bundle.bundleHash), output }
      : { ...bundle, output },
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
