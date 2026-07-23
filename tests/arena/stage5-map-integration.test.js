import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { STAGE5_MAP_ID } from '@number-strategy-jump/arena-v1-content';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { MAP_DOMAIN_EVENT } from '@number-strategy-jump/arena-map';
import { ARENA_MAP_EVENT } from '@number-strategy-jump/arena-map';
import {
  ARENA_MATCH_EVENT,
  HeadlessMatchRunner,
} from '@number-strategy-jump/arena-match';
import { EQUIPMENT_LOCATION_STATE } from '@number-strategy-jump/arena-equipment';
import { replayMatch } from '../../src/arena/replay.ts';

function neutralFrames(core) {
  return core.config.participantIds.map((participantId) => (
    createNeutralInputFrame(core.tick, participantId)
  ));
}

function runToActiveTick(core, targetActiveTick) {
  const events = [];
  while (core.activeTick <= targetActiveTick) events.push(...core.step(neutralFrames(core)));
  return events;
}

test('default Arena V1 map warns, applies wind, releases equipment and collapses in fixed ticks', () => {
  const core = createArenaV1MatchCore({
    seed: 77,
    config: { preparingTicks: 0, livesPerParticipant: 99 },
  });
  assert.equal(core.config.mapDefinitionId, STAGE5_MAP_ID);
  assert.equal(core.getSnapshot().map.definitionId, STAGE5_MAP_ID);

  const windWarning = runToActiveTick(core, 480);
  const warning = windWarning.find((event) => (
    event.type === ARENA_MAP_EVENT.EVENT_WARNED && event.mapEventId === 'wind-east'
  ));
  assert.equal(warning.tick, 480);
  assert.equal(warning.startsAtActiveTick, 600);

  const windStart = runToActiveTick(core, 600);
  assert.ok(windStart.some((event) => (
    event.type === ARENA_MAP_EVENT.EVENT_STARTED && event.mapEventId === 'wind-east'
  )));

  const waveWarning = runToActiveTick(core, 1620);
  const waveMarker = waveWarning.find((event) => (
    event.type === ARENA_MAP_EVENT.EVENT_WARNED && event.mapEventId === 'artifact-wave'
  ));
  assert.equal(waveMarker.publicPayload.spawnPoints.length, 1);
  const equipmentBefore = core.getSnapshot().equipment.length;
  const waveStart = runToActiveTick(core, 1800);
  assert.ok(waveStart.some((event) => event.type === MAP_DOMAIN_EVENT.EQUIPMENT_WAVE_RELEASED));
  assert.ok(waveStart.some((event) => event.type === ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED));
  assert.equal(core.getSnapshot().equipment.length, equipmentBefore + 1);

  const collapse = runToActiveTick(core, 3600);
  assert.ok(collapse.some((event) => event.type === MAP_DOMAIN_EVENT.SURFACE_COLLAPSED));
  const disabled = core.getSnapshot().map.surfaces.filter(({ enabled }) => !enabled);
  assert.equal(disabled.length, 4);
  core.destroy();
});

test('map timeline state participates in replay and state hash', () => {
  const core = createArenaV1MatchCore({
    seed: 2026,
    config: {
      preparingTicks: 0,
      livesPerParticipant: 99,
      suddenDeathStartTick: 1_900,
      hardLimitTicks: 2_000,
    },
  });
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 300 });
  while (core.phase !== 'ended') runner.step(neutralFrames(core));
  const replay = runner.exportReplay();
  assert.equal(replay.replaySchemaVersion, 5);
  assert.equal(replay.config.mapDefinitionId, STAGE5_MAP_ID);
  assert.ok(replay.events.some((event) => event.type === ARENA_MAP_EVENT.EVENT_WARNED));
  assert.equal(replayMatch(replay).finalHash, replay.finalHash);
  runner.destroy();
  core.destroy();
});

test('equipment left on a collapsed surface is removed by authority in the same tick', () => {
  const core = createArenaV1MatchCore({
    seed: 0,
    config: { preparingTicks: 0, livesPerParticipant: 99 },
  });
  const warningEvents = runToActiveTick(core, 1_620);
  const warning = warningEvents.find((event) => (
    event.type === ARENA_MAP_EVENT.EVENT_WARNED && event.occurrenceId === 'artifact-wave:0'
  ));
  assert.equal(warning.publicPayload.spawnPoints[0].surfaceId, 'tile-south');
  runToActiveTick(core, 1_800);
  assert.equal(
    core.getSnapshot().equipment.find(({ instanceId }) => (
      instanceId === 'map:artifact-wave:0:0'
    )).locationState,
    EQUIPMENT_LOCATION_STATE.SPAWNED,
  );
  const collapseEvents = runToActiveTick(core, 5_400);
  assert.ok(collapseEvents.some((event) => (
    event.type === ARENA_MATCH_EVENT.EQUIPMENT_DESPAWNED
    && event.equipmentInstanceId === 'map:artifact-wave:0:0'
    && event.reason === 'invalid-map-surface'
  )));
  const removed = core.getSnapshot().equipment.find(({ instanceId }) => (
    instanceId === 'map:artifact-wave:0:0'
  ));
  assert.equal(removed.locationState, EQUIPMENT_LOCATION_STATE.DESPAWNED);
  assert.equal(removed.position, null);
  core.destroy();
});
