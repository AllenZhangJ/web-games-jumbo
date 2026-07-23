import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { STAGE4_ACTION_ID } from '@number-strategy-jump/arena-v1-content';
import { STAGE6_MOVEMENT_ACTION_ID } from '@number-strategy-jump/arena-v1-content';
import {
  ARENA_V1_MOVEMENT_STRESS_DEFAULT_TUNING,
  createArenaV1MovementStressStrategy,
} from '../experiment/arena-v1-movement-stress-strategy.js';
import {
  ARENA_V1_SCRIPTED_PRESSURE_DEFAULT_PARAMETERS,
  createArenaV1ScriptedPressureInputStrategy,
} from '../experiment/arena-v1-scripted-pressure-strategy.js';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { combineCleanupFailure, normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import { QuickMatchService } from '@number-strategy-jump/arena-v1-composition';
import { HeadlessMatchRunner } from '@number-strategy-jump/arena-match';
import { ARENA_GOLDEN_REPLAY_CATEGORY } from '@number-strategy-jump/arena-regression';
import { ArenaGoldenReplayScenarioRegistry } from './golden-replay-scenario-registry.js';

export const ARENA_V1_GOLDEN_REPLAY_MANIFEST_ID = 'arena.stage9.golden-replays.v5';

const SCENARIO_VERSION = 1;

function cleanupResources(resources, originalError = null) {
  const cleanupErrors = [];
  for (const resource of resources) {
    if (!resource || typeof resource.destroy !== 'function') continue;
    try {
      resource.destroy();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (originalError === null && cleanupErrors.length === 0) return;
  throw combineCleanupFailure(
    originalError === null
      ? new Error('黄金回放场景清理失败。')
      : normalizeThrownError(originalError, '黄金回放场景失败'),
    cleanupErrors,
    '黄金回放场景失败且清理未完整完成。',
  );
}

function recordHeadless({ seed, config, checkpointInterval, createFrames, destroyInput = null }) {
  let core = null;
  let runner = null;
  let replay = null;
  let failure = null;
  try {
    core = createArenaV1MatchCore({ seed, config });
    runner = new HeadlessMatchRunner(core, { checkpointInterval });
    replay = runner.runUntilEnded(createFrames);
  } catch (error) {
    failure = error;
  }
  cleanupResources([destroyInput, runner, core], failure);
  return replay;
}

function requireEvent(replay, type, predicate = () => true) {
  if (!replay.events.some((event) => event.type === type && predicate(event))) {
    throw new Error(`黄金回放 ${replay.matchSeed} 未覆盖事件 ${type}。`);
  }
}

function assertBaseReplay(replay) {
  if (!replay || typeof replay !== 'object') throw new TypeError('黄金回放必须是对象。');
  if (replay.inputFrames.length === 0 || replay.checkpoints.length < 2) {
    throw new Error('黄金回放缺少完整输入或 checkpoint。');
  }
  requireEvent(replay, 'MatchStarted');
  requireEvent(replay, 'MatchEnded');
}

function createEquipmentReplay() {
  const seed = 0x9a110000;
  const config = {
    preparingTicks: 0,
    livesPerParticipant: 9,
    suddenDeathStartTick: 800,
    hardLimitTicks: 900,
  };
  const probe = createArenaV1MatchCore({ seed, config });
  let strategy;
  try {
    strategy = createArenaV1ScriptedPressureInputStrategy({
      matchSeed: probe.matchSeed,
      participantIds: probe.config.participantIds,
      basePushRange: probe.config.basePush.range,
      parameters: ARENA_V1_SCRIPTED_PRESSURE_DEFAULT_PARAMETERS,
    });
  } finally {
    probe.destroy();
  }
  return recordHeadless({
    seed,
    config,
    checkpointInterval: 60,
    createFrames: strategy.createFrames,
  });
}

function assertEquipmentReplay(replay) {
  assertBaseReplay(replay);
  requireEvent(replay, 'EquipmentPickedUp');
  requireEvent(replay, 'HitResolved');
  requireEvent(replay, 'ActionStarted', ({ action }) => (
    action === STAGE4_ACTION_ID.HAMMER_SMASH
    || action === STAGE4_ACTION_ID.CHAIN_PULL
    || action === STAGE4_ACTION_ID.SHIELD_CHARGE
  ));
}

function createMapReplay() {
  return recordHeadless({
    seed: 0x5a6e0000,
    config: {
      preparingTicks: 0,
      livesPerParticipant: 99,
      suddenDeathStartTick: 1_100,
      hardLimitTicks: 1_200,
    },
    checkpointInterval: 120,
    createFrames: (snapshot) => snapshot.participants.map(({ id }) => (
      createNeutralInputFrame(snapshot.tick, id)
    )),
  });
}

function assertMapReplay(replay) {
  assertBaseReplay(replay);
  for (const type of ['MapEventWarned', 'MapEventStarted', 'MapEventEnded']) {
    requireEvent(replay, type, ({ mapEventId }) => mapEventId === 'wind-east');
  }
}

function createMovementReplay() {
  const seed = 0x6d560000;
  const config = {
    preparingTicks: 0,
    livesPerParticipant: 99,
    suddenDeathStartTick: 800,
    hardLimitTicks: 900,
    equipment: { initialSpawns: [] },
  };
  const probe = createArenaV1MatchCore({ seed, config });
  let strategy;
  try {
    strategy = createArenaV1MovementStressStrategy({
      matchSeed: probe.matchSeed,
      participantIds: probe.config.participantIds,
      tuning: ARENA_V1_MOVEMENT_STRESS_DEFAULT_TUNING,
    });
  } finally {
    probe.destroy();
  }
  return recordHeadless({
    seed,
    config,
    checkpointInterval: 90,
    createFrames: strategy.createFrames,
    destroyInput: strategy,
  });
}

function assertMovementReplay(replay) {
  assertBaseReplay(replay);
  for (const action of [
    STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
    STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
    STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN,
    STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_RELEASE,
    STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH,
  ]) requireEvent(replay, 'ActionStarted', (event) => event.action === action);
  requireEvent(replay, 'DownSmashLanded');
}

function createLifecycleReplay() {
  let session = null;
  let replay = null;
  let failure = null;
  try {
    ({ session } = new QuickMatchService().create({
      matchSeed: 0x51fe0001,
      config: {
        preparingTicks: 0,
        livesPerParticipant: 99,
        suddenDeathStartTick: 400,
        hardLimitTicks: 480,
        equipment: { initialSpawns: [] },
      },
    }));
    const initialTick = session.getSnapshot().tick;
    session.setPaused(true);
    session.start();
    const pausedBeforeStart = session.step();
    if (pausedBeforeStart.snapshot.tick !== initialTick || pausedBeforeStart.input !== null) {
      throw new Error('黄金生命周期场景在 start 前 pause 后错误推进。');
    }
    session.setPaused(false);
    for (let index = 0; index < 12; index += 1) {
      const snapshot = session.getSnapshot();
      session.step(createNeutralInputFrame(snapshot.tick, 'player-1'));
    }
    const beforeSecondPause = session.getSnapshot().tick;
    session.setPaused(true);
    const pausedDuringMatch = session.step();
    if (pausedDuringMatch.snapshot.tick !== beforeSecondPause || pausedDuringMatch.input !== null) {
      throw new Error('黄金生命周期场景在对局 pause 后错误推进。');
    }
    session.setPaused(false);
    replay = session.runUntilEnded((snapshot) => (
      createNeutralInputFrame(snapshot.tick, 'player-1')
    ));
  } catch (error) {
    failure = error;
  }
  cleanupResources([session], failure);
  return replay;
}

function assertLifecycleReplay(replay) {
  assertBaseReplay(replay);
  if (replay.result.endedAtTick !== 479) {
    throw new Error(`黄金生命周期回放结束 tick 漂移：${replay.result.endedAtTick}。`);
  }
  if (replay.inputFrames.length !== (replay.result.endedAtTick + 1) * 2) {
    throw new Error('黄金生命周期回放记录了 pause 期间的伪输入。');
  }
}

export function createArenaV1GoldenReplayScenarioRegistry() {
  return new ArenaGoldenReplayScenarioRegistry([
    {
      id: 'equipment.scripted-pressure',
      version: SCENARIO_VERSION,
      category: ARENA_GOLDEN_REPLAY_CATEGORY.EQUIPMENT,
      file: 'equipment-scripted-pressure.json',
      createReplay: createEquipmentReplay,
      assertReplay: assertEquipmentReplay,
    },
    {
      id: 'lifecycle.quick-match-pause-resume',
      version: SCENARIO_VERSION,
      category: ARENA_GOLDEN_REPLAY_CATEGORY.LIFECYCLE,
      file: 'lifecycle-quick-match-pause-resume.json',
      createReplay: createLifecycleReplay,
      assertReplay: assertLifecycleReplay,
    },
    {
      id: 'map.first-wind-cycle',
      version: SCENARIO_VERSION,
      category: ARENA_GOLDEN_REPLAY_CATEGORY.MAP,
      file: 'map-first-wind-cycle.json',
      createReplay: createMapReplay,
      assertReplay: assertMapReplay,
    },
    {
      id: 'movement.semantic-actions',
      version: SCENARIO_VERSION,
      category: ARENA_GOLDEN_REPLAY_CATEGORY.MOVEMENT,
      file: 'movement-semantic-actions.json',
      createReplay: createMovementReplay,
      assertReplay: assertMovementReplay,
    },
  ]);
}
