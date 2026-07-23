import {
  combineCleanupFailure,
  createNeutralInputFrame,
  normalizeThrownError,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V1_MOVEMENT_STRESS_DEFAULT_TUNING,
  ARENA_V1_SCRIPTED_PRESSURE_DEFAULT_PARAMETERS,
  createArenaV1MovementStressStrategy,
  createArenaV1ScriptedPressureInputStrategy,
} from '@number-strategy-jump/arena-experiment';
import {
  HeadlessMatchRunner,
  type ArenaAuthorityEvent,
  type ArenaReplay,
  type HeadlessInputProvider,
} from '@number-strategy-jump/arena-match';
import {
  QuickMatchService,
  createArenaV1MatchCore,
} from '@number-strategy-jump/arena-v1-composition';
import {
  STAGE4_ACTION_ID,
  STAGE6_MOVEMENT_ACTION_ID,
} from '@number-strategy-jump/arena-v1-content';
import { ARENA_GOLDEN_REPLAY_CATEGORY } from './golden-replay-manifest.js';
import { ArenaGoldenReplayScenarioRegistry } from './golden-replay-scenario-registry.js';

export const ARENA_V1_GOLDEN_REPLAY_MANIFEST_ID = 'arena.stage9.golden-replays.v5';
const SCENARIO_VERSION = 1;
interface Destroyable { destroy(): void }

function cleanupResources(resources: readonly (Destroyable | null)[], originalError: unknown = null): void {
  const cleanupErrors: Error[] = [];
  for (const resource of resources) {
    if (!resource) continue;
    try {
      resource.destroy();
    } catch (error) {
      cleanupErrors.push(normalizeThrownError(error, '黄金回放场景清理失败'));
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
function recordHeadless(options: {
  seed: number;
  config: unknown;
  checkpointInterval: number;
  createFrames: HeadlessInputProvider;
  destroyInput?: Destroyable | null;
}): ArenaReplay {
  let core: ReturnType<typeof createArenaV1MatchCore> | null = null;
  let runner: HeadlessMatchRunner | null = null;
  let replay: ArenaReplay | null = null;
  let failure: unknown = null;
  try {
    core = createArenaV1MatchCore({ seed: options.seed, config: options.config });
    runner = new HeadlessMatchRunner(core, { checkpointInterval: options.checkpointInterval });
    replay = runner.runUntilEnded(options.createFrames);
  } catch (error) {
    failure = error;
  }
  cleanupResources([options.destroyInput ?? null, runner, core], failure);
  if (!replay) throw new Error('黄金回放场景未生成 Replay。');
  return replay;
}
function requireEvent(
  replay: ArenaReplay,
  type: string,
  predicate: (event: ArenaAuthorityEvent) => boolean = () => true,
): void {
  if (!replay.events.some((event) => event.type === type && predicate(event))) {
    throw new Error(`黄金回放 ${replay.matchSeed} 未覆盖事件 ${type}。`);
  }
}
function assertBaseReplay(value: unknown): asserts value is ArenaReplay {
  if (!value || typeof value !== 'object') throw new TypeError('黄金回放必须是对象。');
  const replay = value as ArenaReplay;
  if (!Array.isArray(replay.inputFrames) || !Array.isArray(replay.checkpoints)
    || replay.inputFrames.length === 0 || replay.checkpoints.length < 2) {
    throw new Error('黄金回放缺少完整输入或 checkpoint。');
  }
  requireEvent(replay, 'MatchStarted');
  requireEvent(replay, 'MatchEnded');
}

function createEquipmentReplay(): ArenaReplay {
  const seed = 0x9a110000;
  const config = { preparingTicks: 0, livesPerParticipant: 9, suddenDeathStartTick: 800, hardLimitTicks: 900 };
  const probe = createArenaV1MatchCore({ seed, config });
  let strategy: ReturnType<typeof createArenaV1ScriptedPressureInputStrategy>;
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
  return recordHeadless({ seed, config, checkpointInterval: 60, createFrames: strategy.createFrames });
}
function assertEquipmentReplay(replay: unknown): void {
  assertBaseReplay(replay);
  requireEvent(replay, 'EquipmentPickedUp');
  requireEvent(replay, 'HitResolved');
  requireEvent(replay, 'ActionStarted', ({ action }) => (
    action === STAGE4_ACTION_ID.HAMMER_SMASH
    || action === STAGE4_ACTION_ID.CHAIN_PULL
    || action === STAGE4_ACTION_ID.SHIELD_CHARGE
  ));
}
function createMapReplay(): ArenaReplay {
  return recordHeadless({
    seed: 0x5a6e0000,
    config: { preparingTicks: 0, livesPerParticipant: 99, suddenDeathStartTick: 1_100, hardLimitTicks: 1_200 },
    checkpointInterval: 120,
    createFrames: (snapshot) => snapshot.participants.map(({ id }) => createNeutralInputFrame(snapshot.tick, id)),
  });
}
function assertMapReplay(replay: unknown): void {
  assertBaseReplay(replay);
  for (const type of ['MapEventWarned', 'MapEventStarted', 'MapEventEnded']) {
    requireEvent(replay, type, ({ mapEventId }) => mapEventId === 'wind-east');
  }
}
function createMovementReplay(): ArenaReplay {
  const seed = 0x6d560000;
  const config = {
    preparingTicks: 0, livesPerParticipant: 99, suddenDeathStartTick: 800,
    hardLimitTicks: 900, equipment: { initialSpawns: [] },
  };
  const probe = createArenaV1MatchCore({ seed, config });
  let strategy: ReturnType<typeof createArenaV1MovementStressStrategy>;
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
function assertMovementReplay(replay: unknown): void {
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
function createLifecycleReplay(): ArenaReplay {
  let session: ReturnType<QuickMatchService['create']>['session'] | null = null;
  let replay: ArenaReplay | null = null;
  let failure: unknown = null;
  try {
    ({ session } = new QuickMatchService().create({
      matchSeed: 0x51fe0001,
      config: {
        preparingTicks: 0, livesPerParticipant: 99, suddenDeathStartTick: 400,
        hardLimitTicks: 480, equipment: { initialSpawns: [] },
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
    replay = session.runUntilEnded((snapshot: ArenaMatchSnapshot) => createNeutralInputFrame(snapshot.tick, 'player-1'));
  } catch (error) {
    failure = error;
  }
  cleanupResources([session], failure);
  if (!replay) throw new Error('黄金生命周期场景未生成 Replay。');
  return replay;
}
function assertLifecycleReplay(replay: unknown): void {
  assertBaseReplay(replay);
  if (replay.result.endedAtTick !== 479) {
    throw new Error(`黄金生命周期回放结束 tick 漂移：${replay.result.endedAtTick}。`);
  }
  if (replay.inputFrames.length !== (replay.result.endedAtTick + 1) * 2) {
    throw new Error('黄金生命周期回放记录了 pause 期间的伪输入。');
  }
}

export function createArenaV1GoldenReplayScenarioRegistry(): ArenaGoldenReplayScenarioRegistry {
  return new ArenaGoldenReplayScenarioRegistry([
    {
      id: 'equipment.scripted-pressure', version: SCENARIO_VERSION,
      category: ARENA_GOLDEN_REPLAY_CATEGORY.EQUIPMENT, file: 'equipment-scripted-pressure.json',
      createReplay: createEquipmentReplay, assertReplay: assertEquipmentReplay,
    },
    {
      id: 'lifecycle.quick-match-pause-resume', version: SCENARIO_VERSION,
      category: ARENA_GOLDEN_REPLAY_CATEGORY.LIFECYCLE, file: 'lifecycle-quick-match-pause-resume.json',
      createReplay: createLifecycleReplay, assertReplay: assertLifecycleReplay,
    },
    {
      id: 'map.first-wind-cycle', version: SCENARIO_VERSION,
      category: ARENA_GOLDEN_REPLAY_CATEGORY.MAP, file: 'map-first-wind-cycle.json',
      createReplay: createMapReplay, assertReplay: assertMapReplay,
    },
    {
      id: 'movement.semantic-actions', version: SCENARIO_VERSION,
      category: ARENA_GOLDEN_REPLAY_CATEGORY.MOVEMENT, file: 'movement-semantic-actions.json',
      createReplay: createMovementReplay, assertReplay: assertMovementReplay,
    },
  ]);
}
