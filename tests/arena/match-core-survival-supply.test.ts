import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_MATCH_EVENT,
  ARENA_REPLAY_SCHEMA_VERSION,
  HeadlessMatchRunner,
  createReplayMatch,
  type ArenaAuthorityEvent,
  type MatchCore,
} from '@number-strategy-jump/arena-match';
import {
  createArenaV1MatchCore,
  createArenaV2SurvivalSupplyMatchCore,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';

const SURVIVAL_ARENA = Object.freeze({
  killY: -4,
  surfaces: Object.freeze([Object.freeze({
    id: 'survival-platform',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 4, y: 0.5, z: 4 }),
  })]),
  spawns: Object.freeze([
    Object.freeze({ x: -1, y: 1, z: 0 }),
    Object.freeze({ x: 1, y: 1, z: 0 }),
  ]),
});

const SUPPLY = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  spawnSpecs: Object.freeze([
    Object.freeze({
      slotId: 'left',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
      spawnId: 'survival-left',
      position: Object.freeze({ x: -1, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'right',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
      spawnId: 'survival-right',
      position: Object.freeze({ x: 1, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'spare',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
      spawnId: 'survival-spare',
      position: Object.freeze({ x: 3, y: 1, z: 0 }),
    }),
  ]),
});

function createSurvivalCore(seed = 901, hardLimitTicks = 2_700): MatchCore {
  return createArenaV2SurvivalSupplyMatchCore({
    seed,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: hardLimitTicks - 100,
      hardLimitTicks,
      arena: SURVIVAL_ARENA,
    },
    supply: SUPPLY,
  });
}

function neutralFrames(core: MatchCore, primaryParticipantId: string | null = null) {
  return core.config.participantIds.map((participantId) => ({
    ...createNeutralInputFrame(core.tick, participantId),
    primaryPressed: participantId === primaryParticipantId,
  }));
}

function stepTo(core: MatchCore, targetTick: number, primaryParticipantId: string | null = null) {
  let targetEvents: readonly ArenaAuthorityEvent[] = [];
  while (core.tick <= targetTick) {
    const events = core.step(neutralFrames(
      core,
      core.tick === targetTick ? primaryParticipantId : null,
    ));
    if (core.tick === targetTick + 1) targetEvents = events;
  }
  return targetEvents;
}

function eventTypes(events: readonly ArenaAuthorityEvent[]): string[] {
  return events.map(({ type }) => type);
}

test('explicit survival composition owns spawn-expire-pickup-action order in production MatchCore', () => {
  const core = createSurvivalCore();
  const wave = stepTo(core, 1_200, 'player-1');
  assert.deepEqual(eventTypes(wave).slice(0, 5), [
    ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED,
    ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED,
    ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED,
    ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP,
    ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP,
  ]);
  const spawnPayload = Reflect.get(wave[0] ?? {}, 'payload');
  assert.equal(Reflect.get(spawnPayload, 'schemaVersion'), 1);
  assert.equal(Reflect.get(spawnPayload, 'tick'), 1_200);
  const actionIndex = eventTypes(wave).indexOf(ARENA_MATCH_EVENT.ACTION_STARTED);
  assert.ok(actionIndex > eventTypes(wave).lastIndexOf(ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP));
  assert.equal(core.getSnapshot().participants[0]?.equipment?.definitionId, STAGE4_EQUIPMENT_ID.HAMMER);

  const expiry = stepTo(core, 1_800);
  assert.deepEqual(eventTypes(expiry), [ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED]);
  assert.equal(Reflect.get(Reflect.get(expiry[0] ?? {}, 'payload'), 'tick'), 1_800);
  assert.equal(core.getSnapshot().participants.filter(({ equipment }) => equipment !== null).length, 2);

  const replacement = stepTo(core, 2_400);
  const types = eventTypes(replacement);
  assert.deepEqual(types.slice(0, 3), Array(3).fill(ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED));
  assert.equal(types.filter((type) => type === ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED).length, 2);
  assert.equal(types.filter((type) => type === ARENA_MATCH_EVENT.EQUIPMENT_REPLACED).length, 2);
  for (const participant of core.getSnapshot().participants) assert.ok(participant.equipment);
  core.destroy();
});

test('two-player contest is invariant to input order and supply state changes only survival hash', () => {
  const contestArena = {
    ...SURVIVAL_ARENA,
    spawns: [{ x: -0.4, y: 1, z: 0 }, { x: 0.4, y: 1, z: 0 }],
  };
  const contestSupply = {
    ...SUPPLY,
    spawnSpecs: SUPPLY.spawnSpecs.map((spec, index) => ({
      ...spec,
      position: index === 0
        ? { x: 0, y: 1, z: 0 }
        : { x: index === 1 ? 3 : -3, y: 1, z: 0 },
    })),
  };
  const createContest = () => createArenaV2SurvivalSupplyMatchCore({
    seed: 902,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 1_400,
      hardLimitTicks: 1_500,
      arena: contestArena,
    },
    supply: contestSupply,
  });
  const first = createContest();
  const second = createContest();
  let contestedEvents: readonly ArenaAuthorityEvent[] = [];
  while (first.tick <= 1_200) {
    const frames = neutralFrames(first);
    const left = first.step(frames);
    const right = second.step([...frames].reverse());
    assert.deepEqual(right, left);
    assert.equal(second.getStateHash(), first.getStateHash());
    if (first.tick === 1_201) contestedEvents = left;
  }
  assert.equal(
    eventTypes(contestedEvents).filter((type) => type === ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP).length,
    1,
  );
  const ordinary = createArenaV1MatchCore({
    seed: 902,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 1_400,
      hardLimitTicks: 1_500,
      arena: contestArena,
      equipment: { initialSpawns: [] },
    },
  });
  assert.notEqual(first.ruleContentHash, ordinary.ruleContentHash);
  first.destroy();
  second.destroy();
  ordinary.destroy();
});

test('Replay V5 reconstructs survival supply from initial composition and inputs', () => {
  const core = createSurvivalCore(903, 1_850);
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 60 });
  const replay = runner.runUntilEnded((snapshot) => snapshot.participants.map(({ id }) => (
    createNeutralInputFrame(snapshot.tick, id)
  )));
  assert.equal(replay.replaySchemaVersion, ARENA_REPLAY_SCHEMA_VERSION);
  assert.ok(replay.events.some(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED));
  assert.ok(replay.events.some(({ type }) => type === ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED));
  const replaySurvival = createReplayMatch(({ seed, config }) => (
    createArenaV2SurvivalSupplyMatchCore({ seed, config, supply: SUPPLY })
  ));
  const result = replaySurvival(replay);
  assert.equal(result.finalHash, replay.finalHash);
  assert.deepEqual(result.events, replay.events);
  core.destroy();
});

test('survival composition rejects parallel initial authority and invalid map positions', () => {
  assert.throws(() => createArenaV2SurvivalSupplyMatchCore({
    config: {
      arena: SURVIVAL_ARENA,
      equipment: { initialSpawns: [{ id: 'legacy', definitionId: STAGE4_EQUIPMENT_ID.HAMMER }] },
    },
    supply: SUPPLY,
  }), /禁止并行 initialSpawns authority/);
  assert.throws(() => createArenaV2SurvivalSupplyMatchCore({
    config: { arena: SURVIVAL_ARENA },
    supply: {
      ...SUPPLY,
      spawnSpecs: SUPPLY.spawnSpecs.map((spec, index) => index === 0
        ? { ...spec, position: { x: 99, y: 1, z: 0 } }
        : spec),
    },
  }), /不在合法地图表面/);
  assert.throws(() => createArenaV2SurvivalSupplyMatchCore({
    config: {
      arena: SURVIVAL_ARENA,
      preparingTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick + 1,
    },
    supply: SUPPLY,
  }), /preparingTicks 不能晚于首波供给/);
});
