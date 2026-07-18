import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import {
  createArenaStage9MovementExperimentDefinition,
  createArenaStage9MovementExperimentRegistries,
} from '../src/arena/experiment/arena-movement-experiment-composition.js';
import { ARENA_EXPERIMENT_OUTCOME } from '../src/arena/experiment/experiment-report.js';
import { ARENA_MOVEMENT_STRESS_COLLECTOR_ID } from '../src/arena/experiment/arena-movement-stress-collector.js';
import { readArenaGitSourceIdentity } from './arena-git-source-identity.mjs';
import { runArenaNodeExperiment } from './arena-node-experiment-runner.mjs';
import { parseArenaStressIntegerOptions } from './arena-stress-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const options = parseArenaStressIntegerOptions(process.argv.slice(2), {
    matches: { fallback: 100, maximum: 100_000 },
    'replay-samples': { fallback: 3, minimum: 0, maximum: 1_000 },
    'long-matches': { fallback: null, minimum: 1, maximum: 100_000 },
  });
  if (options['replay-samples'] > options.matches) {
    throw new RangeError('replay-samples 不能超过 matches。');
  }
  if (options['long-matches'] !== null && options['long-matches'] > options.matches) {
    throw new RangeError('long-matches 不能超过 matches。');
  }
  const source = await readArenaGitSourceIdentity(root);
  const definition = createArenaStage9MovementExperimentDefinition({
    ...source,
    caseCount: options.matches,
    replaySampleCount: options['replay-samples'],
  });
  const startedAt = performance.now();
  const report = await runArenaNodeExperiment({
    root,
    source,
    definition,
    registries: createArenaStage9MovementExperimentRegistries(),
  });
  const metric = report.metrics.find(({ id }) => id === ARENA_MOVEMENT_STRESS_COLLECTOR_ID).data;
  console.log(JSON.stringify({
    generatedAt: report.generatedAt,
    source,
    definitionHash: report.definitionHash,
    resultHash: report.resultHash,
    outcome: report.outcome,
    freezeEligible: report.freezeEligible,
    matches: options.matches,
    longMatches: options.matches,
    legacyRequestedLongMatches: options['long-matches'],
    totalTicks: metric.denominators.totalTicks,
    verifiedReplays: metric.raw.verifiedReplays,
    uniqueFinalHashes: metric.raw.uniqueFinalHashes,
    downSmashLandings: metric.raw.downSmashLandings,
    elapsedMs: performance.now() - startedAt,
    inputs: metric.raw.inputCounts,
    actions: metric.raw.actionCounts,
    events: metric.raw.eventCounts,
    gate: metric.gate,
  }, null, 2));
  if (report.outcome !== ARENA_EXPERIMENT_OUTCOME.PASSED) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
