import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createArenaStage9MatchCoreExperimentDefinition,
} from '@number-strategy-jump/arena-v1-experiment';
import { createArenaV1MatchCoreInvariantWorkloadEntry } from '@number-strategy-jump/arena-v1-experiment';
import { assertSimulationCase } from '@number-strategy-jump/arena-experiment';
import {
  assertArenaGitSourceIdentityStable,
  readArenaGitSourceIdentity,
} from './arena-git-source-identity.js';
import {
  assertArenaStressCpuBudget,
  createArenaStressTiming,
} from './arena-stress-timing.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OPTION_NAMES = new Set([
  'matches',
  'replay-samples',
  'average-tick-budget-ms',
  'heap-growth-budget-bytes',
]);

type MatchCoreExperimentDefinition = ReturnType<typeof createArenaStage9MatchCoreExperimentDefinition>;

function assertKnownOptions(values: readonly string[]): void {
  for (const argument of values) {
    const match = argument.match(/^--([^=]+)=.+$/);
    const optionName = match?.[1];
    if (!optionName || !OPTION_NAMES.has(optionName)) {
      throw new Error(`未知 Arena MatchCore 压测参数 ${argument}。`);
    }
  }
}

function readPositiveIntegerOption(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const options = process.argv.filter((argument) => argument.startsWith(prefix));
  if (options.length === 0) return fallback;
  if (options.length > 1) throw new Error(`${prefix}<value> 不能重复。`);
  const option = options[0];
  if (!option) throw new Error(`${prefix}<value> 缺失。`);
  const value = Number(option.slice(prefix.length));
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${prefix}<value> 必须是正安全整数。`);
  }
  return value;
}

function readPositiveNumberOption(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const options = process.argv.filter((argument) => argument.startsWith(prefix));
  if (options.length === 0) return fallback;
  if (options.length > 1) throw new Error(`${prefix}<value> 不能重复。`);
  const option = options[0];
  if (!option) throw new Error(`${prefix}<value> 缺失。`);
  const value = Number(option.slice(prefix.length));
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${prefix}<value> 必须是正有限数。`);
  }
  return value;
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

function safeTick(value: unknown, name: string): number {
  const tick = record(value, name).tick;
  if (typeof tick !== 'number' || !Number.isSafeInteger(tick) || tick < 0) {
    throw new RangeError(`${name}.tick 必须是非负安全整数。`);
  }
  return tick;
}

function assertMetadata(
  value: unknown,
  definition: MatchCoreExperimentDefinition,
  seed: number,
): void {
  const metadata = record(value, `seed ${seed} metadata`);
  if (metadata.matchSeed !== seed) throw new Error(`seed ${seed} metadata.matchSeed 失配。`);
  const expected = definition.candidate.authority;
  for (const field of [
    'matchSchemaVersion',
    'physicsBackendVersion',
    'configHash',
    'ruleContentHash',
  ] as const) {
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
const results = new Map<string, number>();
const eventCounts = new Map<string, number>();
const finalHashes = new Set<string>();
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
    let snapshotTick = safeTick(simulationCase.getSnapshot(), `seed ${seed} initial snapshot`);
    let matchEvents = 0;
    let steps = 0;
    while (!simulationCase.isComplete()) {
      if (steps >= definition.limits.maximumTicksPerCase) {
        throw new Error(`seed ${seed} 没有在权威时限内结束。`);
      }
      const step = record(simulationCase.step(), `seed ${seed} step`);
      const nextTick = safeTick(step.snapshot, `seed ${seed} step snapshot`);
      if (nextTick !== snapshotTick + 1) {
        throw new Error(`seed ${seed} 没有精确推进一个 tick。`);
      }
      snapshotTick = nextTick;
      steps += 1;
      if (!Array.isArray(step.events)) throw new TypeError(`seed ${seed} step.events 必须是数组。`);
      matchEvents += step.events.length;
      for (const eventValue of step.events) {
        const event = record(eventValue, `seed ${seed} event`);
        if (typeof event.type !== 'string') throw new TypeError(`seed ${seed} event.type 无效。`);
        increment(eventCounts, event.type);
      }
    }
    const exported = record(simulationCase.exportResult(), `seed ${seed} result`);
    const exportedResult = record(exported.result, `seed ${seed} result.result`);
    if (typeof exported.finalHash !== 'string' || !/^[0-9a-f]{8}$/.test(exported.finalHash)) {
      throw new TypeError(`seed ${seed} finalHash 无效。`);
    }
    if (typeof exportedResult.reason !== 'string') throw new TypeError(`seed ${seed} reason 无效。`);
    if (exportedResult.replayVerified === true) verifiedReplays += 1;
    finalHashes.add(exported.finalHash);
    increment(results, exportedResult.reason);
    totalTicks += snapshotTick;
    longestMatchTicks = Math.max(longestMatchTicks, snapshotTick);
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
