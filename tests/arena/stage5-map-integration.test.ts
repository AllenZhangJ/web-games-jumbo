import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { STAGE5_MAP_ID } from '@number-strategy-jump/arena-v1-content';
import {
  createNeutralInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import { MAP_DOMAIN_EVENT } from '@number-strategy-jump/arena-map';
import { ARENA_MAP_EVENT } from '@number-strategy-jump/arena-map';
import {
  ARENA_MATCH_EVENT,
  HeadlessMatchRunner,
  type MatchCore,
} from '@number-strategy-jump/arena-match';
import { EQUIPMENT_LOCATION_STATE } from '@number-strategy-jump/arena-equipment';
import { replayMatch } from '../../src/arena/replay.js';

function required<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) throw new Error(`测试缺少 ${name}。`);
  return value;
}

function spawnPoints(publicPayload: unknown): Array<Record<string, unknown>> {
  if (typeof publicPayload !== 'object' || publicPayload === null || Array.isArray(publicPayload)) {
    throw new TypeError('地图事件 publicPayload 必须是对象。');
  }
  const points = (publicPayload as Record<string, unknown>).spawnPoints;
  if (!Array.isArray(points)) throw new TypeError('地图事件 spawnPoints 必须是数组。');
  return points.map((point, index) => {
    if (typeof point !== 'object' || point === null || Array.isArray(point)) {
      throw new TypeError(`地图事件 spawnPoints[${index}] 必须是对象。`);
    }
    return point as Record<string, unknown>;
  });
}

function neutralFrames(core: MatchCore): ArenaInputFrame[] {
  return core.config.participantIds.map((participantId) => (
    createNeutralInputFrame(core.tick, participantId)
  ));
}

function runToActiveTick(core: MatchCore, targetActiveTick: number) {
  const events: ReturnType<MatchCore['step']>[number][] = [];
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
  const warning = required(windWarning.find((event) => (
    event.type === ARENA_MAP_EVENT.EVENT_WARNED && event.mapEventId === 'wind-east'
  )), '风事件预告');
  assert.equal(warning.tick, 480);
  assert.equal(warning.startsAtActiveTick, 600);

  const windStart = runToActiveTick(core, 600);
  assert.ok(windStart.some((event) => (
    event.type === ARENA_MAP_EVENT.EVENT_STARTED && event.mapEventId === 'wind-east'
  )));

  const waveWarning = runToActiveTick(core, 1620);
  const waveMarker = required(waveWarning.find((event) => (
    event.type === ARENA_MAP_EVENT.EVENT_WARNED && event.mapEventId === 'artifact-wave'
  )), '装备波次预告');
  assert.equal(spawnPoints(waveMarker.publicPayload).length, 1);
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
  const warning = required(warningEvents.find((event) => (
    event.type === ARENA_MAP_EVENT.EVENT_WARNED && event.occurrenceId === 'artifact-wave:0'
  )), '南侧装备波次预告');
  assert.equal(required(spawnPoints(warning.publicPayload)[0], '装备出生点').surfaceId, 'tile-south');
  runToActiveTick(core, 1_800);
  assert.equal(
    required(core.getSnapshot().equipment.find(({ instanceId }) => (
      instanceId === 'map:artifact-wave:0:0'
    )), '生成的地图装备').locationState,
    EQUIPMENT_LOCATION_STATE.SPAWNED,
  );
  const collapseEvents = runToActiveTick(core, 5_400);
  assert.ok(collapseEvents.some((event) => (
    event.type === ARENA_MATCH_EVENT.EQUIPMENT_DESPAWNED
    && event.equipmentInstanceId === 'map:artifact-wave:0:0'
    && event.reason === 'invalid-map-surface'
  )));
  const removed = required(core.getSnapshot().equipment.find(({ instanceId }) => (
    instanceId === 'map:artifact-wave:0:0'
  )), '已清理的地图装备');
  assert.equal(removed.locationState, EQUIPMENT_LOCATION_STATE.DESPAWNED);
  assert.equal(removed.position, null);
  core.destroy();
});
