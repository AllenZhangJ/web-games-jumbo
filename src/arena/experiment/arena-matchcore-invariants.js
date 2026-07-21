import { ARENA_MATCH_PHASE } from '../config.js';
import { assertIntegerAtLeast } from '@number-strategy-jump/arena-contracts';

export function assertArenaMatchCoreSnapshotInvariants(snapshot, config) {
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
  return snapshot;
}

export function createArenaMatchCoreTickSnapshot(tick) {
  return Object.freeze({ tick: assertIntegerAtLeast(tick, 0, 'MatchCore tick snapshot.tick') });
}
