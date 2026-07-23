import {
  createSortedMetricCountRecord,
  metricRatioOrNull,
} from '@number-strategy-jump/arena-experiment';
import { assertNonEmptyString } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_BOT_CAPABILITY_DEFAULT_GATE_POLICY,
  createArenaBotCapabilityGatePolicyDefinition,
} from '@number-strategy-jump/arena-experiment';

export {
  ARENA_BOT_CAPABILITY_DEFAULT_GATE_POLICY,
  createArenaBotCapabilityGatePolicyDefinition,
} from '@number-strategy-jump/arena-experiment';

export const ARENA_BOT_CAPABILITY_PARTICIPANT_ID = 'player-2';
export const ARENA_BOT_CAPABILITY_WEIGHTS = Object.freeze({
  eliminations: 4,
  scoreRate: 4,
  lifePressure: 2,
});
export const ARENA_BOT_CAPABILITY_REQUIRED_MOVEMENT_ACTIONS = Object.freeze([
  'movement.explicit-ground-jump',
  'movement.explicit-air-jump',
  'movement.explicit-crouch-begin',
  'movement.explicit-crouch-release',
  'movement.down-smash',
]);
export const ARENA_BOT_CAPABILITY_MAP_EVENT_TYPES = Object.freeze([
  'MapEventWarned',
  'MapEventStarted',
  'MapEventEnded',
  'MapSurfaceCollapsed',
  'MapEquipmentWaveReleased',
]);

export interface ArenaBotDifficultyMetricState {
  readonly difficultyId: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  ticks: number;
  actions: number;
  equipmentActions: number;
  equipmentPickups: number;
  hits: number;
  eliminations: number;
  botDeaths: number;
  botUncreditedDeaths: number;
  playerDeaths: number;
  readonly movementInputs: {
    jumpPressed: number;
    crouchHoldStarted: number;
    slamPressed: number;
    walkTicks: number;
    runTicks: number;
  };
  readonly movementActions: Map<string, number>;
  downSmashLandings: number;
  readonly mapEvents: Map<string, number>;
  replayChecks: number;
  readonly hashes: Set<string>;
  previousJumpHeld: boolean;
}

export function createArenaBotDifficultyMetricState(
  difficultyIdValue: unknown,
): ArenaBotDifficultyMetricState {
  const difficultyId = assertNonEmptyString(difficultyIdValue, 'Bot difficulty metric difficultyId');
  return {
    difficultyId,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    ticks: 0,
    actions: 0,
    equipmentActions: 0,
    equipmentPickups: 0,
    hits: 0,
    eliminations: 0,
    botDeaths: 0,
    botUncreditedDeaths: 0,
    playerDeaths: 0,
    movementInputs: {
      jumpPressed: 0,
      crouchHoldStarted: 0,
      slamPressed: 0,
      walkTicks: 0,
      runTicks: 0,
    },
    movementActions: new Map(),
    downSmashLandings: 0,
    mapEvents: new Map(),
    replayChecks: 0,
    hashes: new Set(),
    previousJumpHeld: false,
  };
}

export function finishArenaBotDifficultyMetricState(stats: ArenaBotDifficultyMetricState) {
  const score = stats.wins + stats.draws * 0.5;
  const averageEliminations = metricRatioOrNull(stats.eliminations, stats.matches);
  const averageBotDeaths = metricRatioOrNull(stats.botDeaths, stats.matches);
  const averagePlayerDeaths = metricRatioOrNull(stats.playerDeaths, stats.matches);
  const movementActions = createSortedMetricCountRecord(stats.movementActions);
  const mobilityInputAttempts = stats.movementInputs.jumpPressed
    + stats.movementInputs.crouchHoldStarted
    + stats.movementInputs.slamPressed;
  const mobilityActionStarts = [
    'movement.explicit-ground-jump',
    'movement.explicit-air-jump',
    'movement.explicit-crouch-begin',
    'movement.down-smash',
  ].reduce((total, actionId) => total + (movementActions[actionId] ?? 0), 0);
  const scoreRate = metricRatioOrNull(score, stats.matches);
  const lifePressure = averagePlayerDeaths === null || averageBotDeaths === null
    ? null
    : averagePlayerDeaths - averageBotDeaths;
  return Object.freeze({
    difficultyId: stats.difficultyId,
    matches: stats.matches,
    wins: stats.wins,
    draws: stats.draws,
    losses: stats.losses,
    scoreRate,
    averageTicks: metricRatioOrNull(stats.ticks, stats.matches),
    averageActions: metricRatioOrNull(stats.actions, stats.matches),
    averageEquipmentActions: metricRatioOrNull(stats.equipmentActions, stats.matches),
    averageEquipmentPickups: metricRatioOrNull(stats.equipmentPickups, stats.matches),
    averageHits: metricRatioOrNull(stats.hits, stats.matches),
    averageEliminations,
    averageBotDeaths,
    averageBotUncreditedDeaths: metricRatioOrNull(
      stats.botUncreditedDeaths,
      stats.matches,
    ),
    averagePlayerDeaths,
    lifePressure,
    movementInputs: Object.freeze({ ...stats.movementInputs }),
    movementActions,
    downSmashLandings: stats.downSmashLandings,
    mapEvents: createSortedMetricCountRecord(stats.mapEvents),
    mobilityInputAttempts,
    mobilityActionStarts,
    mobilityInputFailureRate: mobilityInputAttempts > 0
      ? Math.max(0, mobilityInputAttempts - mobilityActionStarts) / mobilityInputAttempts
      : 0,
    hitRatePerThousandTicks: metricRatioOrNull(stats.hits * 1_000, stats.ticks),
    eliminationRatePerThousandTicks: metricRatioOrNull(
      stats.eliminations * 1_000,
      stats.ticks,
    ),
    capabilityIndex: averageEliminations === null || scoreRate === null || lifePressure === null
      ? null
      : averageEliminations * ARENA_BOT_CAPABILITY_WEIGHTS.eliminations
        + scoreRate * ARENA_BOT_CAPABILITY_WEIGHTS.scoreRate
        + lifePressure * ARENA_BOT_CAPABILITY_WEIGHTS.lifePressure,
    capabilityWeights: ARENA_BOT_CAPABILITY_WEIGHTS,
    replayChecks: stats.replayChecks,
    uniqueFinalHashes: stats.hashes.size,
  });
}

export interface ArenaBotCapabilityGateOptions {
  readonly difficulties: readonly ReturnType<typeof finishArenaBotDifficultyMetricState>[];
  readonly completedCases: number;
  readonly replaySeedCount: number;
  readonly gatePolicy?: unknown;
}

export function createArenaBotCapabilityGatePolicy({
  difficulties,
  completedCases,
  replaySeedCount,
  gatePolicy: gatePolicyValue = ARENA_BOT_CAPABILITY_DEFAULT_GATE_POLICY,
}: ArenaBotCapabilityGateOptions) {
  const gatePolicy = createArenaBotCapabilityGatePolicyDefinition(gatePolicyValue);
  const checks: Array<{ id: string; passed: boolean }> = [
    {
      id: 'sample.completed-paired-cases',
      passed: completedCases >= gatePolicy.minimumCompletedPairedCases,
    },
    {
      id: 'replay.samples-verified',
      passed: difficulties.every(({ replayChecks }) => replayChecks === replaySeedCount),
    },
  ];
  for (const result of difficulties) {
    checks.push({
      id: `difficulty.${result.difficultyId}.final-hashes-unique`,
      passed: result.matches > 0 && result.uniqueFinalHashes === result.matches,
    });
    for (const actionId of ARENA_BOT_CAPABILITY_REQUIRED_MOVEMENT_ACTIONS) {
      checks.push({
        id: `difficulty.${result.difficultyId}.actions.${actionId}.covered`,
        passed: (result.movementActions[actionId] ?? 0) > 0,
      });
    }
    checks.push(
      {
        id: `difficulty.${result.difficultyId}.down-smash-landing.covered`,
        passed: result.downSmashLandings > 0,
      },
      {
        id: `difficulty.${result.difficultyId}.walk.covered`,
        passed: result.movementInputs.walkTicks > 0,
      },
      {
        id: `difficulty.${result.difficultyId}.run.covered`,
        passed: result.movementInputs.runTicks > 0,
      },
      {
        id: `difficulty.${result.difficultyId}.map-warning.covered`,
        passed: (result.mapEvents.MapEventWarned ?? 0) > 0,
      },
      {
        id: `difficulty.${result.difficultyId}.map-start.covered`,
        passed: (result.mapEvents.MapEventStarted ?? 0) > 0,
      },
      {
        id: `difficulty.${result.difficultyId}.uncredited-deaths.bounded`,
        passed: result.averageBotUncreditedDeaths !== null
          && result.averageBotUncreditedDeaths
            <= gatePolicy.maximumAverageUncreditedDeaths,
      },
    );
  }
  const scoreRateTolerance = completedCases > 0
    ? gatePolicy.scoreRateToleranceScale / Math.sqrt(completedCases)
    : null;
  for (let index = 1; index < difficulties.length; index += 1) {
    const previous = difficulties[index - 1];
    const current = difficulties[index];
    if (!previous || !current) throw new Error('Bot capability difficulty 顺序不完整。');
    checks.push(
      {
        id: `ordering.${previous.difficultyId}-${current.difficultyId}.capability`,
        passed: current.capabilityIndex !== null
          && previous.capabilityIndex !== null
          && current.capabilityIndex + 1e-12
            >= previous.capabilityIndex + gatePolicy.minimumCapabilityIndexDelta,
      },
      {
        id: `ordering.${previous.difficultyId}-${current.difficultyId}.life-pressure`,
        passed: current.lifePressure !== null
          && previous.lifePressure !== null
          && current.lifePressure + 1e-12
            >= previous.lifePressure + gatePolicy.minimumLifePressureDelta,
      },
      {
        id: `ordering.${previous.difficultyId}-${current.difficultyId}.score-rate`,
        passed: scoreRateTolerance !== null
          && current.scoreRate !== null
          && previous.scoreRate !== null
          && current.scoreRate + scoreRateTolerance >= previous.scoreRate,
      },
    );
  }
  return Object.freeze({
    checks: Object.freeze(checks),
    scoreRateTolerance,
    gatePolicy,
  });
}
