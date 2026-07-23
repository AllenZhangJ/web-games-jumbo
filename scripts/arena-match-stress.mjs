import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createArenaStage9MatchCoreExperimentDefinition,
} from '@number-strategy-jump/arena-v1-experiment';
import { createArenaV1MatchCoreInvariantWorkloadEntry } from '@number-strategy-jump/arena-v1-experiment';
import { assertSimulationCase } from '../src/arena/experiment/simulation-workload-registry.js';
import {
  assertArenaGitSourceIdentityStable,
  readArenaGitSourceIdentity,
} from './arena-git-source-identity.ts';
import {
  assertArenaStressCpuBudget,
  createArenaStressTiming,
} from './arena-stress-timing.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OPTION_NAMES = new Set([
  'matches',
  'replay-samples',
  'average-tick-budget-ms',
  'heap-growth-budget-bytes',
]);

function assertKnownOptions(values) {
  for (const argument of values) {
    const match = argument.match(/^--([^=]+)=.+$/);
    if (!match || !OPTION_NAMES.has(match[1])) {
      throw new Error(`未知 Arena MatchCore 压测参数 ${argument}。`);
    }
  }
}

function readPositiveIntegerOption(name, fallback) {
  const prefix = `--${name}=`;
  const options = process.argv.filter((argument) => argument.startsWith(prefix));
  if (options.length === 0) return fallback;
  if (options.length > 1) throw new Error(`${prefix}<value> 不能重复。`);
  const value = Number(options[0].slice(prefix.length));
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${prefix}<value> 必须是正安全整数。`);
  }
  return value;
}

function readPositiveNumberOption(name, fallback) {
  const prefix = `--${name}=`;
  const options = process.argv.filter((argument) => argument.startsWith(prefix));
  if (options.length === 0) return fallback;
  if (options.length > 1) throw new Error(`${prefix}<value> 不能重复。`);
  const value = Number(options[0].slice(prefix.length));
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${prefix}<value> 必须是正有限数。`);
  }
  return value;
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function assertMetadata(metadata, definition, seed) {
  if (metadata.matchSeed !== seed) throw new Error(`seed ${seed} metadata.matchSeed 失配。`);
  const expected = definition.candidate.authority;
  for (const field of [
    'matchSchemaVersion',
    'physicsBackendVersion',
    'configHash',
    'ruleContentHash',
  ]) {
    if (metadata[field] !== expected[field]) {
      throw new Error(`seed ${seed} metadata.${field} 与 Definition 不一致。`);
    }
  }
}

if (typeof globalThis.gc !== 'function') {
  throw new Error('Arena 压测必须通过 node --expose-gc 运行，以验证回收后的内存增量。');
}

assertKnownOptions(process.argv.slice(2));
const matches = readPositiveIntegerOption('matches', 1_000);
const replaySamples = Math.min(matches, readPositiveIntegerOption('replay-samples', 5));
const averageTickBudgetMs = readPositiveNumberOption('average-tick-budget-ms', 0.25);
const heapGrowthBudgetBytes = readPositiveIntegerOption(
  'heap-growth-budget-bytes',
  32 * 1024 * 1024,
);
const source = await readArenaGitSourceIdentity(root);
const definition = createArenaStage9MatchCoreExperimentDefinition({
  ...source,
  caseCount: matches,
  replaySampleCount: replaySamples,
});
const workload = createArenaV1MatchCoreInvariantWorkloadEntry();
workload.validateParameters(definition.workload.parameters);
const results = new Map();
const eventCounts = new Map();
const finalHashes = new Set();
let totalTicks = 0;
let longestMatchTicks = 0;
let totalEvents = 0;
let verifiedReplays = 0;

globalThis.gc();
const startMemory = process.memoryUsage();
const startedAt = performance.now();
const startedCpuUsage = process.cpuUsage();
for (const seed of definition.getSeeds()) {
  const simulationCase = assertSimulationCase(workload.createCase({
    seed,
    candidate: definition.candidate,
    parameters: definition.workload.parameters,
  }), `MatchCore benchmark case ${seed}`);
  try {
    assertMetadata(simulationCase.getMetadata(), definition, seed);
    let snapshot = simulationCase.getSnapshot();
    let matchEvents = 0;
    let steps = 0;
    while (!simulationCase.isComplete()) {
      if (steps >= definition.limits.maximumTicksPerCase) {
        throw new Error(`seed ${seed} 没有在权威时限内结束。`);
      }
      const step = simulationCase.step();
      if (step.snapshot.tick !== snapshot.tick + 1) {
        throw new Error(`seed ${seed} 没有精确推进一个 tick。`);
      }
      snapshot = step.snapshot;
      steps += 1;
      matchEvents += step.events.length;
      for (const event of step.events) increment(eventCounts, event.type);
    }
    const exported = simulationCase.exportResult();
    if (exported.result.replayVerified) verifiedReplays += 1;
    finalHashes.add(exported.finalHash);
    increment(results, exported.result.reason);
    totalTicks += snapshot.tick;
    longestMatchTicks = Math.max(longestMatchTicks, snapshot.tick);
    totalEvents += matchEvents;
  } finally {
    simulationCase.destroy();
  }
}
const elapsedMs = performance.now() - startedAt;
const cpuUsage = process.cpuUsage(startedCpuUsage);
globalThis.gc();
const endMemory = process.memoryUsage();
assertArenaGitSourceIdentityStable(source, await readArenaGitSourceIdentity(root));

const timing = createArenaStressTiming({ elapsedMs, cpuUsage, totalTicks });
const heapGrowthBytes = endMemory.heapUsed - startMemory.heapUsed;
const report = {
  generatedAt: new Date().toISOString(),
  sourceCommit: source.sourceCommit,
  sourceDirty: source.sourceDirty,
  experimentDefinitionId: definition.id,
  experimentDefinitionHash: definition.getContentHash(),
  workloadId: definition.workload.id,
  workloadVersion: definition.workload.version,
  matches,
  completedMatches: [...results.values()].reduce((total, value) => total + value, 0),
  incompleteMatches: 0,
  invariantFailures: 0,
  nonFiniteStates: 0,
  verifiedReplays,
  totalTicks,
  averageTicksPerMatch: totalTicks / matches,
  longestMatchTicks,
  totalEvents,
  averageEventsPerMatch: totalEvents / matches,
  uniqueFinalHashes: finalHashes.size,
  ...timing,
  averageTickBudgetMs,
  startHeapUsedBytes: startMemory.heapUsed,
  endHeapUsedBytes: endMemory.heapUsed,
  heapGrowthBytes,
  heapGrowthBudgetBytes,
  rssAfterGcBytes: endMemory.rss,
  results: Object.fromEntries([...results.entries()].sort()),
  events: Object.fromEntries([...eventCounts.entries()].sort()),
};

console.log(JSON.stringify(report, null, 2));

if (verifiedReplays !== replaySamples) {
  throw new Error(`严格回放只有 ${verifiedReplays}/${replaySamples} 通过。`);
}
if (finalHashes.size !== matches) {
  throw new Error(
    `最终 hash 只有 ${finalHashes.size}/${matches} 个唯一值，seed 隔离可能失效。`,
  );
}
assertArenaStressCpuBudget(timing, averageTickBudgetMs);
if (heapGrowthBytes > heapGrowthBudgetBytes) {
  throw new Error(`回收后堆增长 ${heapGrowthBytes}B 超过 ${heapGrowthBudgetBytes}B 预算。`);
}
