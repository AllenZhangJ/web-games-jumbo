import process from 'node:process';
import { performance } from 'node:perf_hooks';
import {
  ARENA_MATCH_EVENT,
  ARENA_MATCH_PHASE,
  type ArenaAuthorityEvent,
  type MatchCore,
} from '@number-strategy-jump/arena-match';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { createArenaV2SurvivalSupplyMatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';

const MATCH_COUNT = 120;
const HARD_LIMIT_TICKS = 2_500;
const CPU_BUDGET_MS_PER_TICK = 0.25;
const HEAP_GROWTH_BUDGET_BYTES = 32 * 1024 * 1024;
const MAX_RUNTIME_COUNT = 3;
const MAX_ACTIVE_LIFECYCLE_COUNT = 5;
const MAX_EVENTS_PER_TICK = 10;

const ARENA = Object.freeze({
  killY: -4,
  surfaces: Object.freeze([Object.freeze({
    id: 'survival-stress-platform',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 4, y: 0.5, z: 4 }),
  })]),
  spawns: Object.freeze([
    Object.freeze({ x: -0.4, y: 1, z: 0 }),
    Object.freeze({ x: 0.4, y: 1, z: 0 }),
  ]),
});

function supply(contested: boolean) {
  return {
    supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
    spawnSpecs: [
      {
        slotId: 'left',
        equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
        spawnId: 'survival-stress-left',
        position: contested ? { x: 0, y: 1, z: 0 } : { x: -0.4, y: 1, z: 0 },
      },
      {
        slotId: 'right',
        equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
        spawnId: 'survival-stress-right',
        position: { x: 2.8, y: 1, z: 0 },
      },
      {
        slotId: 'spare',
        equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
        spawnId: 'survival-stress-spare',
        position: { x: -2.8, y: 1, z: 0 },
      },
    ],
  };
}

function createCore(matchIndex: number): MatchCore {
  return createArenaV2SurvivalSupplyMatchCore({
    seed: 0x62000000 + matchIndex,
    config: {
      arena: ARENA,
      preparingTicks: 0,
      livesPerParticipant: 99,
      suddenDeathStartTick: 2_400,
      hardLimitTicks: HARD_LIMIT_TICKS,
    },
    supply: supply(matchIndex % 2 === 0),
  });
}

function frames(core: MatchCore, matchIndex: number) {
  const values = core.config.participantIds.map((participantId, participantIndex) => ({
    ...createNeutralInputFrame(core.tick, participantId),
    moveZ: matchIndex % 3 === 2
      ? (core.tick % 120 < 60 ? 0.15 : -0.15) * (participantIndex === 0 ? 1 : -1)
      : 0,
    primaryPressed: core.tick % 1_200 === 0,
  }));
  return matchIndex % 3 === 1 ? values.reverse() : values;
}

function assertFinite(value: unknown, path = 'snapshot'): void {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new RangeError(`${path} 包含非有限数。`);
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertFinite(child, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) assertFinite(child, `${path}.${key}`);
}

function payload(event: ArenaAuthorityEvent): Readonly<Record<string, unknown>> | null {
  const value = event.payload;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function percentile(values: readonly number[], ratio: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[Math.max(0, index)] ?? 0;
}

if (typeof global.gc === 'function') global.gc();
const initialHeap = process.memoryUsage().heapUsed;
const wallStart = performance.now();
const perMatchCpuMsPerTick: number[] = [];
let totalTicks = 0;
let totalEvents = 0;
let invariantFailures = 0;
let nonFiniteFailures = 0;
let maximumRuntimeCount = 0;
let maximumActiveLifecycleCount = 0;
let maximumEventsPerTick = 0;
const finalHashes = new Set<string>();

for (let matchIndex = 0; matchIndex < MATCH_COUNT; matchIndex += 1) {
  const core = createCore(matchIndex);
  const activeSupplyIds = new Set<string>();
  const supplyIdByInstanceId = new Map<string, string>();
  const cpuStart = process.cpuUsage();
  let matchTicks = 0;
  try {
    while (core.phase !== ARENA_MATCH_PHASE.ENDED) {
      const events = core.step(frames(core, matchIndex));
      matchTicks += 1;
      totalTicks += 1;
      totalEvents += events.length;
      maximumEventsPerTick = Math.max(maximumEventsPerTick, events.length);
      for (const event of events) {
        const data = payload(event);
        if (event.type === ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED && data?.supplyId) {
          const supplyId = String(data.supplyId);
          const instanceId = String(data.equipmentInstanceId);
          activeSupplyIds.add(supplyId);
          supplyIdByInstanceId.set(instanceId, supplyId);
        } else if (event.type === ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED && data) {
          const instanceId = String(data.expiredEquipmentInstanceId);
          const supplyId = supplyIdByInstanceId.get(instanceId);
          if (supplyId) activeSupplyIds.delete(supplyId);
          supplyIdByInstanceId.delete(instanceId);
        } else if (event.type === ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED && data) {
          const instanceId = String(data.recycledEquipmentInstanceId);
          const supplyId = supplyIdByInstanceId.get(instanceId);
          if (supplyId) activeSupplyIds.delete(supplyId);
          supplyIdByInstanceId.delete(instanceId);
        }
      }
      maximumActiveLifecycleCount = Math.max(
        maximumActiveLifecycleCount,
        activeSupplyIds.size,
      );
      const snapshot = core.getSnapshot();
      maximumRuntimeCount = Math.max(maximumRuntimeCount, snapshot.equipment.length);
      try {
        assertFinite(snapshot);
        if (snapshot.tick !== matchTicks) invariantFailures += 1;
        if (
          (snapshot.tick === 1_200 || snapshot.tick === 1_801 || snapshot.tick === 2_401)
          && !/^[0-9a-f]{8}$/.test(core.getStateHash())
        ) invariantFailures += 1;
      } catch (error) {
        if (error instanceof RangeError && /non-finite|非有限/.test(error.message)) {
          nonFiniteFailures += 1;
        } else invariantFailures += 1;
      }
    }
    const finalHash = core.getStateHash();
    finalHashes.add(finalHash);
    if (
      core.result === null
      || core.tick !== HARD_LIMIT_TICKS
      || !/^[0-9a-f]{8}$/.test(finalHash)
    ) invariantFailures += 1;
  } finally {
    const cpu = process.cpuUsage(cpuStart);
    perMatchCpuMsPerTick.push((cpu.user + cpu.system) / 1_000 / Math.max(1, matchTicks));
    core.destroy();
  }
}

if (typeof global.gc === 'function') global.gc();
const heapGrowthBytes = process.memoryUsage().heapUsed - initialHeap;
const cpuP50MsPerTick = percentile(perMatchCpuMsPerTick, 0.5);
const cpuP95MsPerTick = percentile(perMatchCpuMsPerTick, 0.95);
const cpuP99MsPerTick = percentile(perMatchCpuMsPerTick, 0.99);
const cpuWorstMsPerTick = Math.max(...perMatchCpuMsPerTick);
const report = Object.freeze({
  status: invariantFailures === 0
    && nonFiniteFailures === 0
    && maximumRuntimeCount <= MAX_RUNTIME_COUNT
    && maximumActiveLifecycleCount <= MAX_ACTIVE_LIFECYCLE_COUNT
    && maximumEventsPerTick <= MAX_EVENTS_PER_TICK
    && finalHashes.size === MATCH_COUNT
    && heapGrowthBytes <= HEAP_GROWTH_BUDGET_BYTES
    && cpuP95MsPerTick <= CPU_BUDGET_MS_PER_TICK
    ? 'passed'
    : 'failed',
  matchCount: MATCH_COUNT,
  totalTicks,
  totalEvents,
  inputPermutationModes: 3,
  contestedMatchCount: MATCH_COUNT / 2,
  uniqueFinalHashes: finalHashes.size,
  invariantFailures,
  nonFiniteFailures,
  maximumRuntimeCount,
  runtimeLimit: MAX_RUNTIME_COUNT,
  maximumActiveLifecycleCount,
  activeLifecycleLimit: MAX_ACTIVE_LIFECYCLE_COUNT,
  maximumEventsPerTick,
  eventWindowLimit: MAX_EVENTS_PER_TICK,
  heapGrowthBytes,
  heapGrowthBudgetBytes: HEAP_GROWTH_BUDGET_BYTES,
  cpuBudgetMsPerTick: CPU_BUDGET_MS_PER_TICK,
  cpuP50MsPerTick,
  cpuP95MsPerTick,
  cpuP99MsPerTick,
  cpuWorstMsPerTick,
  wallDurationMs: performance.now() - wallStart,
});

console.log(JSON.stringify(report, null, 2));
if (report.status !== 'passed') process.exitCode = 1;
