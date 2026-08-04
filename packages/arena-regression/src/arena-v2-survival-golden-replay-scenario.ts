import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import {
  HeadlessMatchRunner,
  type ArenaAuthorityEvent,
  type ArenaReplay,
  type ReplayCoreFactoryOptions,
} from '@number-strategy-jump/arena-match';
import {
  createArenaV2SurvivalSupplyMatchCore,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import { ARENA_GOLDEN_REPLAY_CATEGORY } from './golden-replay-manifest.js';
import { ArenaGoldenReplayScenarioRegistry } from './golden-replay-scenario-registry.js';

export const ARENA_V2_SURVIVAL_GOLDEN_REPLAY_MANIFEST_ID =
  'arena.v2.survival.golden-replays.v1';

const SURVIVAL_ARENA = Object.freeze({
  killY: -4,
  surfaces: Object.freeze([Object.freeze({
    id: 'survival-golden-platform',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 4, y: 0.5, z: 4 }),
  })]),
  spawns: Object.freeze([
    Object.freeze({ x: -1, y: 1, z: 0 }),
    Object.freeze({ x: 1, y: 1, z: 0 }),
  ]),
});

const SURVIVAL_SUPPLY = Object.freeze({
  supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
  spawnSpecs: Object.freeze([
    Object.freeze({
      slotId: 'left',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
      spawnId: 'survival-golden-left',
      position: Object.freeze({ x: -1, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'right',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
      spawnId: 'survival-golden-right',
      position: Object.freeze({ x: 1, y: 1, z: 0 }),
    }),
    Object.freeze({
      slotId: 'spare',
      equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
      spawnId: 'survival-golden-spare',
      position: Object.freeze({ x: 3, y: 1, z: 0 }),
    }),
  ]),
});

const SURVIVAL_SEED = 0x5a7a1202;
const SURVIVAL_CONFIG = Object.freeze({
  livesPerParticipant: 99,
  preparingTicks: 0,
  suddenDeathStartTick: 2_400,
  hardLimitTicks: 2_500,
  arena: SURVIVAL_ARENA,
});

function requireEvent(replay: ArenaReplay, type: string): void {
  if (!replay.events.some((event: ArenaAuthorityEvent) => event.type === type)) {
    throw new Error(`Arena V2 生存黄金回放缺少事件 ${type}。`);
  }
}

function createSurvivalReplay(): ArenaReplay {
  const core = createArenaV2SurvivalSupplyMatchCore({
    seed: SURVIVAL_SEED,
    config: SURVIVAL_CONFIG,
    supply: SURVIVAL_SUPPLY,
  });
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 100 });
  try {
    return runner.runLegacyUntilEndedForAudit((snapshot) => snapshot.participants.map(({ id }) => ({
      ...createNeutralInputFrame(snapshot.tick, id),
      primaryPressed: id === 'player-1' && (snapshot.tick === 1_200 || snapshot.tick === 2_400),
    })));
  } finally {
    runner.destroy();
    core.destroy();
  }
}

function assertSurvivalReplay(value: unknown): void {
  if (!value || typeof value !== 'object') throw new TypeError('Arena V2 生存黄金回放必须是对象。');
  const replay = value as ArenaReplay;
  if (replay.matchSeed !== SURVIVAL_SEED || replay.result.endedAtTick !== 2_499) {
    throw new Error('Arena V2 生存黄金回放固定身份或结束边界漂移。');
  }
  if (replay.inputFrames.length !== 5_000 || replay.checkpoints.length !== 26) {
    throw new Error('Arena V2 生存黄金回放输入或 checkpoint 覆盖漂移。');
  }
  for (const type of [
    'MatchStarted',
    'EquipmentSpawned',
    'EquipmentExpired',
    'EquipmentRecycled',
    'EquipmentReplaced',
    'ActionStarted',
    'MatchEnded',
  ]) requireEvent(replay, type);
}

export function createArenaV2SurvivalGoldenReplayCore(
  options: ReplayCoreFactoryOptions,
) {
  return createArenaV2SurvivalSupplyMatchCore({
    seed: options.seed,
    config: options.config,
    supply: SURVIVAL_SUPPLY,
  });
}

export function createArenaV2SurvivalGoldenReplayScenarioRegistry(): ArenaGoldenReplayScenarioRegistry {
  return new ArenaGoldenReplayScenarioRegistry([{
    id: 'regression.survival-supply-lifecycle',
    version: 1,
    category: ARENA_GOLDEN_REPLAY_CATEGORY.REGRESSION,
    file: 'regression-survival-supply-lifecycle.json',
    createReplay: createSurvivalReplay,
    assertReplay: assertSurvivalReplay,
  }]);
}
