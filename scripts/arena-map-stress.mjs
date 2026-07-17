import { performance } from 'node:perf_hooks';
import { createArenaV1MatchCore } from '../src/arena/arena-v1-match-core.js';
import { ARENA_MATCH_PHASE } from '../src/arena/config.js';
import { createNeutralInputFrame } from '../src/arena/input-frame.js';
import { HeadlessMatchRunner, replayMatch } from '../src/arena/replay.js';

function readPositiveInteger(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return value;
}

function increment(values, key) {
  values.set(key, (values.get(key) ?? 0) + 1);
}

function neutralFrames(core) {
  return core.config.participantIds.map((participantId) => (
    createNeutralInputFrame(core.tick, participantId)
  ));
}

function assertMapState(core) {
  const snapshot = core.getSnapshot();
  const enabled = new Set(snapshot.map.surfaces
    .filter((surface) => surface.enabled)
    .map((surface) => surface.id));
  if (enabled.size === 0) throw new Error(`seed ${core.matchSeed} 地图无可用 surface。`);
  if (snapshot.map.occurrences.some((occurrence) => Object.hasOwn(occurrence, 'privatePlan'))) {
    throw new Error(`seed ${core.matchSeed} 公开快照泄漏 privatePlan。`);
  }
  for (const participant of snapshot.participants) {
    if (
      participant.grounded
      && (!participant.supportSurfaceId || !enabled.has(participant.supportSurfaceId))
    ) throw new Error(`seed ${core.matchSeed} 角色站在已失效 surface。`);
  }
  for (const equipment of snapshot.equipment) {
    if (!equipment.position) continue;
    const supported = core.config.arena.surfaces.some((surface) => (
      enabled.has(surface.id)
      && Math.abs(equipment.position.x - surface.center.x) <= surface.halfExtents.x
      && Math.abs(equipment.position.z - surface.center.z) <= surface.halfExtents.z
    ));
    if (!supported) {
      throw new Error(`seed ${core.matchSeed} 装备 ${equipment.instanceId} 停留在已失效区域。`);
    }
  }
  return snapshot;
}

const matches = readPositiveInteger('matches', 100);
const replaySamples = Math.min(matches, readPositiveInteger('replay-samples', 3));
const eventCounts = new Map();
const hashes = new Set();
let verifiedReplays = 0;
let totalTicks = 0;
const startedAt = performance.now();

for (let index = 0; index < matches; index += 1) {
  const core = createArenaV1MatchCore({
    seed: (0x5a6e0000 + index) >>> 0,
    config: {
      preparingTicks: 0,
      livesPerParticipant: 99,
      suddenDeathStartTick: 7_200,
      hardLimitTicks: 7_201,
    },
  });
  const runner = index < replaySamples
    ? new HeadlessMatchRunner(core, { checkpointInterval: 600 })
    : null;
  try {
    while (core.phase !== ARENA_MATCH_PHASE.ENDED) {
      assertMapState(core);
      const events = runner ? runner.step(neutralFrames(core)) : core.step(neutralFrames(core));
      for (const event of events) increment(eventCounts, event.type);
    }
    const finalSnapshot = assertMapState(core);
    const enabledIds = finalSnapshot.map.surfaces
      .filter(({ enabled }) => enabled)
      .map(({ id }) => id);
    if (enabledIds.length !== 1 || enabledIds[0] !== 'tile-center') {
      throw new Error(`seed ${core.matchSeed} 最终安全 surface 不唯一。`);
    }
    if (finalSnapshot.map.occurrences.length !== 13) {
      throw new Error(`seed ${core.matchSeed} 时间轴 occurrence 不完整。`);
    }
    if (runner) {
      const replay = runner.exportReplay();
      if (replayMatch(replay).finalHash !== replay.finalHash) {
        throw new Error(`seed ${core.matchSeed} 完整地图回放分叉。`);
      }
      verifiedReplays += 1;
    }
    hashes.add(core.getStateHash());
    totalTicks += core.tick;
  } finally {
    runner?.destroy();
    core.destroy();
  }
}

const requiredPerMatch = {
  MapEventWarned: 13,
  MapEventStarted: 13,
  MapEventEnded: 6,
  MapSurfaceCollapsed: 8,
  MapEquipmentWaveReleased: 4,
};
for (const [type, count] of Object.entries(requiredPerMatch)) {
  if (eventCounts.get(type) !== count * matches) {
    throw new Error(`${type} 数量 ${eventCounts.get(type) ?? 0} 不等于 ${count * matches}。`);
  }
}
if (hashes.size !== matches) throw new Error('地图 seed 未产生唯一最终 hash。');

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  matches,
  totalTicks,
  verifiedReplays,
  uniqueFinalHashes: hashes.size,
  elapsedMs: performance.now() - startedAt,
  events: Object.fromEntries([...eventCounts.entries()].sort()),
}, null, 2));
