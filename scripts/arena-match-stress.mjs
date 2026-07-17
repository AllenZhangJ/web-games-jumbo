import { performance } from 'node:perf_hooks';
import { ARENA_MATCH_PHASE, ARENA_PARTICIPANT_STATUS } from '../src/arena/config.js';
import { createNeutralInputFrame } from '../src/arena/input-frame.js';
import { createArenaV1MatchCore } from '../src/arena/arena-v1-match-core.js';
import { HeadlessMatchRunner, replayMatch } from '../src/arena/replay.js';

function readPositiveIntegerOption(name, fallback) {
  const prefix = `--${name}=`;
  const option = process.argv.find((argument) => argument.startsWith(prefix));
  if (!option) return fallback;
  const value = Number(option.slice(prefix.length));
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${prefix}<value> 必须是正安全整数。`);
  }
  return value;
}

function readPositiveNumberOption(name, fallback) {
  const prefix = `--${name}=`;
  const option = process.argv.find((argument) => argument.startsWith(prefix));
  if (!option) return fallback;
  const value = Number(option.slice(prefix.length));
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${prefix}<value> 必须是正有限数。`);
  }
  return value;
}

function assertFiniteSnapshot(snapshot, config) {
  const values = [
    snapshot.tick,
    snapshot.activeTick,
    snapshot.remainingTicks,
    snapshot.map.nextActiveTick,
    snapshot.map.revision,
  ];
  const enabledSurfaceIds = new Set(snapshot.map.surfaces
    .filter(({ enabled }) => enabled)
    .map(({ id }) => id));
  if (enabledSurfaceIds.size === 0) {
    throw new Error(`tick ${snapshot.tick} 地图已无可用 surface。`);
  }
  if (
    snapshot.map.nextActiveTick !== snapshot.activeTick
    && !(
      snapshot.phase === ARENA_MATCH_PHASE.ENDED
      && snapshot.map.nextActiveTick === snapshot.activeTick + 1
    )
  ) {
    throw new Error(
      `tick ${snapshot.tick} map.nextActiveTick ${snapshot.map.nextActiveTick}`
      + ` 与 activeTick ${snapshot.activeTick} 失配。`,
    );
  }
  for (const surface of snapshot.map.surfaces) values.push(surface.revision);
  for (const occurrence of snapshot.map.occurrences) {
    values.push(
      occurrence.warningTick,
      occurrence.startTick,
      occurrence.endTick ?? 0,
      occurrence.revision,
    );
  }
  for (const participant of snapshot.participants) {
    values.push(
      participant.lives,
      participant.eliminations,
      participant.deaths,
      participant.hitstunTicks,
      participant.invulnerableTicks,
      participant.respawnTicks,
      participant.position.x,
      participant.position.y,
      participant.position.z,
      participant.velocity.x,
      participant.velocity.y,
      participant.velocity.z,
      participant.facing.x,
      participant.facing.z,
    );
    if (
      participant.grounded
      && (!participant.supportSurfaceId || !enabledSurfaceIds.has(participant.supportSurfaceId))
    ) {
      throw new Error(`tick ${snapshot.tick} ${participant.id} 站在已失效 surface。`);
    }
  }
  for (const equipment of snapshot.equipment) {
    if (equipment.position === null) continue;
    values.push(equipment.position.x, equipment.position.y, equipment.position.z);
    const supported = config.arena.surfaces.some((surface) => (
      enabledSurfaceIds.has(surface.id)
      && Math.abs(equipment.position.x - surface.center.x) <= surface.halfExtents.x
      && Math.abs(equipment.position.z - surface.center.z) <= surface.halfExtents.z
    ));
    if (!supported) {
      throw new Error(`tick ${snapshot.tick} 装备 ${equipment.instanceId} 停留在已失效地图区域。`);
    }
  }
  if (!values.every(Number.isFinite)) throw new Error(`tick ${snapshot.tick} 出现非有限状态。`);
}

function createBotFrames(snapshot, matchIndex) {
  return snapshot.participants.map((participant, index) => {
    const frame = createNeutralInputFrame(snapshot.tick, participant.id);
    if (participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) return frame;
    const opponent = snapshot.participants.find((candidate) => candidate.id !== participant.id);
    if (!opponent || opponent.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) {
      const distanceToCenter = Math.hypot(participant.position.x, participant.position.z);
      if (distanceToCenter <= 0.25) return frame;
      return {
        ...frame,
        moveX: -participant.position.x / distanceToCenter,
        moveZ: -participant.position.z / distanceToCenter,
      };
    }

    const dx = opponent.position.x - participant.position.x;
    const dz = opponent.position.z - participant.position.z;
    const distance = Math.hypot(dx, dz);
    const cadence = index === 0 ? 31 + (matchIndex % 3) : 43 + (matchIndex % 5);
    const attackOffset = index * 13 + matchIndex * 7;
    const strafe = ((Math.floor((snapshot.tick + attackOffset) / 90) % 2) * 2 - 1) * 0.16;
    const directionX = distance > 1e-7 ? dx / distance : participant.facing.x;
    const directionZ = distance > 1e-7 ? dz / distance : participant.facing.z;
    return {
      ...frame,
      moveX: directionX - directionZ * strafe,
      moveZ: directionZ + directionX * strafe,
      primaryPressed: distance <= 1.48 && (snapshot.tick + attackOffset) % cadence === 0,
      primaryHeld: distance <= 1.48,
    };
  });
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

if (typeof globalThis.gc !== 'function') {
  throw new Error('Arena 压测必须通过 node --expose-gc 运行，以验证回收后的内存增量。');
}

const matches = readPositiveIntegerOption('matches', 1_000);
const replaySamples = Math.min(matches, readPositiveIntegerOption('replay-samples', 5));
const averageTickBudgetMs = readPositiveNumberOption('average-tick-budget-ms', 0.25);
const heapGrowthBudgetBytes = readPositiveIntegerOption('heap-growth-budget-bytes', 32 * 1024 * 1024);
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

for (let matchIndex = 0; matchIndex < matches; matchIndex += 1) {
  const core = createArenaV1MatchCore({ seed: (0xa11e0000 + matchIndex) >>> 0 });
  try {
    const runner = matchIndex < replaySamples
      ? new HeadlessMatchRunner(core, { checkpointInterval: 300 })
      : null;
    const maximumTicks = core.config.preparingTicks + core.config.hardLimitTicks + 1;
    let matchEvents = 0;

    while (core.phase !== ARENA_MATCH_PHASE.ENDED && core.tick < maximumTicks) {
      const snapshot = core.getSnapshot();
      assertFiniteSnapshot(snapshot, core.config);
      const frames = createBotFrames(snapshot, matchIndex);
      const events = runner ? runner.step(frames) : core.step(frames);
      matchEvents += events.length;
      for (const event of events) increment(eventCounts, event.type);
    }

    if (core.phase !== ARENA_MATCH_PHASE.ENDED) {
      throw new Error(`第 ${matchIndex} 局没有在权威时限内结束。`);
    }
    const finalSnapshot = core.getSnapshot();
    assertFiniteSnapshot(finalSnapshot, core.config);
    if (!core.result) throw new Error(`第 ${matchIndex} 局结束但没有 result。`);
    if (matchEvents > 2_000) throw new Error(`第 ${matchIndex} 局事件数失控：${matchEvents}。`);

    if (runner) {
      try {
        const replay = runner.exportReplay();
        const replayed = replayMatch(replay);
        if (replayed.finalHash !== replay.finalHash) {
          throw new Error(`第 ${matchIndex} 局回放 hash 不同。`);
        }
        verifiedReplays += 1;
      } finally {
        runner.destroy();
      }
    }

    finalHashes.add(core.getStateHash());
    increment(results, core.result.reason);
    totalTicks += core.tick;
    longestMatchTicks = Math.max(longestMatchTicks, core.tick);
    totalEvents += matchEvents;
  } finally {
    core.destroy();
  }
}

const elapsedMs = performance.now() - startedAt;
globalThis.gc();
const endMemory = process.memoryUsage();
const heapGrowthBytes = endMemory.heapUsed - startMemory.heapUsed;
const averageTickMs = elapsedMs / totalTicks;

const report = {
  generatedAt: new Date().toISOString(),
  matches,
  completedMatches: [...results.values()].reduce((total, value) => total + value, 0),
  incompleteMatches: 0,
  nonFiniteStates: 0,
  verifiedReplays,
  totalTicks,
  averageTicksPerMatch: totalTicks / matches,
  longestMatchTicks,
  totalEvents,
  averageEventsPerMatch: totalEvents / matches,
  uniqueFinalHashes: finalHashes.size,
  elapsedMs,
  averageTickMs,
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

if (averageTickMs > averageTickBudgetMs) {
  throw new Error(`平均 tick ${averageTickMs.toFixed(6)}ms 超过 ${averageTickBudgetMs}ms 预算。`);
}
if (heapGrowthBytes > heapGrowthBudgetBytes) {
  throw new Error(`回收后堆增长 ${heapGrowthBytes}B 超过 ${heapGrowthBudgetBytes}B 预算。`);
}
if (finalHashes.size !== matches) {
  throw new Error(`最终 hash 只有 ${finalHashes.size}/${matches} 个唯一值，seed 隔离可能失效。`);
}
