import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import {
  createArenaStage9BotExperimentDefinition,
  createArenaStage9BotExperimentRegistries,
} from '../src/arena/experiment/arena-bot-experiment-composition.js';
import { ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_ID } from '../src/arena/experiment/arena-bot-assignment-distribution-collector.js';
import { ARENA_BOT_CAPABILITY_COLLECTOR_ID } from '../src/arena/experiment/arena-bot-capability-collector.js';
import { ARENA_EXPERIMENT_OUTCOME } from '../src/arena/experiment/experiment-report.js';
import { readArenaGitSourceIdentity } from './arena-git-source-identity.mjs';
import { runArenaNodeExperiment } from './arena-node-experiment-runner.mjs';
import { parseArenaStressIntegerOptions } from './arena-stress-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const options = parseArenaStressIntegerOptions(process.argv.slice(2), {
    matches: { fallback: 300, maximum: 100_000 },
    'replay-samples': { fallback: 3, minimum: 0, maximum: 1_000 },
  });
  if (options['replay-samples'] > options.matches) {
    throw new RangeError('replay-samples 不能超过 matches。');
  }
  const source = await readArenaGitSourceIdentity(root);
  const definition = createArenaStage9BotExperimentDefinition({
    ...source,
    caseCount: options.matches,
    replaySampleCount: options['replay-samples'],
  });
  const startedAt = performance.now();
  const report = await runArenaNodeExperiment({
    root,
    source,
    definition,
    registries: createArenaStage9BotExperimentRegistries(),
  });
  const distribution = report.metrics.find(
    ({ id }) => id === ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_ID,
  ).data;
  const capability = report.metrics.find(
    ({ id }) => id === ARENA_BOT_CAPABILITY_COLLECTOR_ID,
  ).data;
  console.log(JSON.stringify({
    generatedAt: report.generatedAt,
    source,
    definitionHash: report.definitionHash,
    resultHash: report.resultHash,
    outcome: report.outcome,
    freezeEligible: report.freezeEligible,
    matchesPerDifficulty: options.matches,
    totalMatches: options.matches * 3,
    durationMs: performance.now() - startedAt,
    distribution: {
      sampleCount: distribution.denominators.assignmentSamples,
      counts: distribution.raw.counts,
      shares: distribution.derived.shares,
    },
    difficulties: capability.derived.difficulties,
    gates: {
      distribution: distribution.gate,
      capability: capability.gate,
    },
  }, null, 2));
  if (report.outcome !== ARENA_EXPERIMENT_OUTCOME.PASSED) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
