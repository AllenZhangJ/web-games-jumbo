import { assertArenaMatchCoreSnapshotInvariants } from './arena-matchcore-invariants.js';

export function assertArenaMapTimelineSnapshotInvariants(snapshot, config) {
  assertArenaMatchCoreSnapshotInvariants(snapshot, config);
  for (const occurrence of snapshot.map.occurrences) {
    if (Object.prototype.hasOwnProperty.call(occurrence, 'privatePlan')) {
      throw new Error(`tick ${snapshot.tick} 地图公开快照泄漏 privatePlan。`);
    }
  }
  return snapshot;
}

export function assertArenaMapTimelineFinalState(snapshot, {
  expectedEnabledSurfaceIds,
  expectedOccurrenceCount,
}) {
  const enabledSurfaceIds = snapshot.map.surfaces
    .filter(({ enabled }) => enabled)
    .map(({ id }) => id)
    .sort();
  if (
    enabledSurfaceIds.length !== expectedEnabledSurfaceIds.length
    || enabledSurfaceIds.some((id, index) => id !== expectedEnabledSurfaceIds[index])
  ) {
    throw new Error(
      `地图最终 surface ${enabledSurfaceIds.join(',') || '(none)'}`
      + ` 与预期 ${expectedEnabledSurfaceIds.join(',')} 不一致。`,
    );
  }
  if (snapshot.map.occurrences.length !== expectedOccurrenceCount) {
    throw new Error(
      `地图最终 occurrence ${snapshot.map.occurrences.length}`
      + ` 与预期 ${expectedOccurrenceCount} 不一致。`,
    );
  }
  return Object.freeze({
    enabledSurfaceIds: Object.freeze(enabledSurfaceIds),
    occurrenceCount: snapshot.map.occurrences.length,
  });
}
