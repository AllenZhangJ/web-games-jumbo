import { performance } from 'node:perf_hooks';
import { BOT_DIFFICULTY_IDS } from '../src/arena/ai/bot-difficulty.js';
import { createArenaV1MatchConfig } from '../src/arena/arena-v1-match-core.js';
import { createArenaV1CharacterRegistry } from '../src/arena/content/arena-v1-characters.js';
import { createNeutralInputFrame, normalizeInputFrame } from '../src/arena/input-frame.js';
import { QuickMatchService } from '../src/arena/matchmaking/quick-match-service.js';
import { createMatchAssignment } from '../src/arena/matchmaking/match-assignment.js';
import { replayMatch } from '../src/arena/replay.js';
import { BotController } from '../src/arena/ai/bot-controller.js';

const CHARACTER_REGISTRY = createArenaV1CharacterRegistry();
// Arena rewards displacement eliminations, not hit farming. A stronger bot can
// finish a life in fewer resolved hits, so the gate combines match outcomes
// only; hit rate remains a reported diagnostic and cannot inflate capability.
const CAPABILITY_WEIGHTS = Object.freeze({
  eliminations: 4,
  scoreRate: 4,
  lifePressure: 2,
});

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

function finiteInput(frame) {
  return Number.isFinite(frame.moveX)
    && Number.isFinite(frame.moveZ)
    && Math.hypot(frame.moveX, frame.moveZ) <= 1 + 1e-12;
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function createStats(id) {
  return {
    difficultyId: id,
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
  };
}

function finishStats(stats) {
  const score = stats.wins + stats.draws * 0.5;
  const hitRatePerThousandTicks = stats.hits / stats.ticks * 1_000;
  const eliminationRatePerThousandTicks = stats.eliminations / stats.ticks * 1_000;
  const averageHits = stats.hits / stats.matches;
  const averageEliminations = stats.eliminations / stats.matches;
  const averageBotDeaths = stats.botDeaths / stats.matches;
  const averagePlayerDeaths = stats.playerDeaths / stats.matches;
  const movementActions = Object.fromEntries([...stats.movementActions.entries()].sort());
  const mapEvents = Object.fromEntries([...stats.mapEvents.entries()].sort());
  const mobilityInputAttempts = stats.movementInputs.jumpPressed
    + stats.movementInputs.crouchHoldStarted
    + stats.movementInputs.slamPressed;
  const mobilityActionStarts = [
    'movement.explicit-ground-jump',
    'movement.explicit-air-jump',
    'movement.explicit-crouch-begin',
    'movement.down-smash',
  ].reduce((total, actionId) => total + (movementActions[actionId] ?? 0), 0);
  return {
    difficultyId: stats.difficultyId,
    matches: stats.matches,
    wins: stats.wins,
    draws: stats.draws,
    losses: stats.losses,
    scoreRate: score / stats.matches,
    averageTicks: stats.ticks / stats.matches,
    averageActions: stats.actions / stats.matches,
    averageEquipmentActions: stats.equipmentActions / stats.matches,
    averageEquipmentPickups: stats.equipmentPickups / stats.matches,
    averageHits,
    averageEliminations,
    averageBotDeaths,
    averageBotUncreditedDeaths: stats.botUncreditedDeaths / stats.matches,
    averagePlayerDeaths,
    lifePressure: averagePlayerDeaths - averageBotDeaths,
    movementInputs: { ...stats.movementInputs },
    movementActions,
    downSmashLandings: stats.downSmashLandings,
    mapEvents,
    mobilityInputAttempts,
    mobilityActionStarts,
    mobilityInputFailureRate: mobilityInputAttempts > 0
      ? Math.max(0, mobilityInputAttempts - mobilityActionStarts) / mobilityInputAttempts
      : 0,
    hitRatePerThousandTicks,
    eliminationRatePerThousandTicks,
    // Match duration is now partly a survival outcome. A per-tick denominator
    // would penalize a stronger bot for keeping the match alive, so the S6.3
    // gate uses per-match combat output and reports efficiency separately.
    capabilityIndex:
      averageEliminations * CAPABILITY_WEIGHTS.eliminations
      + score / stats.matches * CAPABILITY_WEIGHTS.scoreRate
      + (averagePlayerDeaths - averageBotDeaths) * CAPABILITY_WEIGHTS.lifePressure,
    capabilityWeights: CAPABILITY_WEIGHTS,
    replayChecks: stats.replayChecks,
    uniqueFinalHashes: stats.hashes.size,
  };
}

function verifyDifficultyDistribution(sampleCount = 10_000) {
  const counts = Object.fromEntries(BOT_DIFFICULTY_IDS.map((id) => [id, 0]));
  for (let seed = 0; seed < sampleCount; seed += 1) {
    counts[createMatchAssignment({ matchSeed: seed }).selectedDifficultyId] += 1;
  }
  const shares = Object.fromEntries(BOT_DIFFICULTY_IDS.map((id) => [
    id,
    counts[id] / sampleCount,
  ]));
  for (const id of BOT_DIFFICULTY_IDS) {
    if (shares[id] < 0.313 || shares[id] > 0.353) {
      throw new Error(`${id} 难度分布 ${shares[id]} 超出 33.3% ± 2%。`);
    }
  }
  return { sampleCount, counts, shares };
}

function createHumanBaseline(config) {
  const playerCharacterId = config.participantCharacters.find(
    ({ participantId }) => participantId === 'player-1',
  )?.definitionId;
  const characterRadius = CHARACTER_REGISTRY.require(playerCharacterId).collision.radius;
  const history = [];
  let nextDecisionTick = 0;
  let moveX = 0;
  let moveZ = 0;
  return (snapshot) => {
    history.push(snapshot);
    if (history.length > 11) history.shift();
    const self = snapshot.participants.find((participant) => participant.id === 'player-1');
    if (self.status !== 'active') return createNeutralInputFrame(snapshot.tick, 'player-1');
    let primaryPressed = false;
    if (snapshot.tick >= nextDecisionTick) {
      nextDecisionTick = snapshot.tick + 8;
      const delayed = history[0];
      const opponent = delayed.participants.find((participant) => participant.id === 'player-2');
      const surface = config.arena.surfaces.find((value) => value.id === self.supportSurfaceId)
        ?? config.arena.surfaces[0];
      const clearance = Math.min(
        surface.halfExtents.x - Math.abs(self.position.x - surface.center.x),
        surface.halfExtents.z - Math.abs(self.position.z - surface.center.z),
      ) - characterRadius;
      const target = clearance < 1.25 ? surface.center : opponent.position;
      const dx = target.x - self.position.x;
      const dz = target.z - self.position.z;
      const distance = Math.hypot(dx, dz);
      moveX = distance > 1e-6 ? dx / distance * 0.92 : 0;
      moveZ = distance > 1e-6 ? dz / distance * 0.92 : 0;
      if (
        self.action.phase === 'idle'
        && self.hitstunTicks === 0
        && opponent.status === 'active'
        && opponent.invulnerableTicks === 0
      ) {
        const opponentDistance = Math.hypot(
          opponent.position.x - self.position.x,
          opponent.position.z - self.position.z,
        );
        const directionX = opponentDistance > 1e-6
          ? (opponent.position.x - self.position.x) / opponentDistance
          : self.facing.x;
        const directionZ = opponentDistance > 1e-6
          ? (opponent.position.z - self.position.z) / opponentDistance
          : self.facing.z;
        const facingDot = directionX * self.facing.x + directionZ * self.facing.z;
        primaryPressed = opponentDistance <= config.basePush.range * 0.92
          && facingDot >= config.basePush.minimumFacingDot;
      }
    }
    return normalizeInputFrame({
      tick: snapshot.tick,
      participantId: 'player-1',
      moveX,
      moveZ,
      primaryPressed,
      primaryHeld: primaryPressed,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: false,
    }, {
      expectedTick: snapshot.tick,
      participantIds: ['player-1'],
    });
  };
}

function runBenchmarkMatch(seed, difficultyId, replaySample) {
  const configOverrides = { preparingTicks: 0 };
  const config = createArenaV1MatchConfig(configOverrides);
  const botCharacterId = config.participantCharacters.find(
    ({ participantId }) => participantId === 'player-2',
  )?.definitionId;
  const botRunInputThreshold = CHARACTER_REGISTRY.require(
    botCharacterId,
  ).movement.runInputThreshold;
  const metrics = {
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
  };
  let previousJumpHeld = false;
  const match = new QuickMatchService({
    allowDifficultyOverride: true,
    botControllerFactory(options) {
      const controller = new BotController(options);
      return {
        createInput(snapshot) {
          const frame = controller.createInput(snapshot);
          const magnitude = Math.hypot(frame.moveX, frame.moveZ);
          if (frame.jumpPressed) metrics.movementInputs.jumpPressed += 1;
          if (frame.slamPressed) metrics.movementInputs.slamPressed += 1;
          if (frame.jumpHeld && !previousJumpHeld) {
            metrics.movementInputs.crouchHoldStarted += 1;
          }
          previousJumpHeld = frame.jumpHeld;
          if (magnitude > 1e-7) {
            if (magnitude < botRunInputThreshold) metrics.movementInputs.walkTicks += 1;
            else metrics.movementInputs.runTicks += 1;
          }
          return frame;
        },
        destroy() {
          controller.destroy();
        },
      };
    },
  }).create({
    matchSeed: seed,
    difficultyOverride: difficultyId,
    config: configOverrides,
  });
  const benchmarkPlayer = createHumanBaseline(config);
  try {
    match.session.start();
    while (match.session.state !== 'ended') {
      const playerFrame = benchmarkPlayer(match.session.getSnapshot());
      if (!finiteInput(playerFrame)) throw new Error(`seed ${seed} 产生非法基准输入。`);
      const { events } = match.session.step(playerFrame);
      for (const event of events) {
        if (event.type === 'ActionStarted' && event.participantId === 'player-2') {
          metrics.actions += 1;
          if (event.action.startsWith('movement.')) {
            increment(metrics.movementActions, event.action);
          } else if (event.action !== 'base-push') metrics.equipmentActions += 1;
        } else if (
          event.type === 'EquipmentPickedUp'
          && event.participantId === 'player-2'
        ) {
          metrics.equipmentPickups += 1;
        } else if (event.type === 'HitResolved' && event.attackerId === 'player-2') {
          metrics.hits += 1;
        } else if (
          event.type === 'PlayerEliminated'
          && event.creditedAttackerId === 'player-2'
        ) metrics.eliminations += 1;
        if (event.type === 'DownSmashLanded' && event.participantId === 'player-2') {
          metrics.downSmashLandings += 1;
        }
        if (
          event.type === 'MapEventWarned'
          || event.type === 'MapEventStarted'
          || event.type === 'MapEventEnded'
          || event.type === 'MapSurfaceCollapsed'
          || event.type === 'MapEquipmentWaveReleased'
        ) increment(metrics.mapEvents, event.type);
        if (event.type === 'PlayerEliminated' && event.participantId === 'player-2') {
          metrics.botDeaths += 1;
          if (event.creditedAttackerId === null) metrics.botUncreditedDeaths += 1;
        } else if (
          event.type === 'PlayerEliminated'
          && event.participantId === 'player-1'
        ) metrics.playerDeaths += 1;
      }
    }
    const replay = match.session.exportReplay();
    if (replaySample) {
      const replayed = replayMatch(replay);
      if (replayed.finalHash !== replay.finalHash) throw new Error(`seed ${seed} 回放分叉。`);
    }
    return {
      ticks: replay.result.endedAtTick + 1,
      result: replay.result,
      finalHash: replay.finalHash,
      replayChecked: replaySample,
      ...metrics,
    };
  } finally {
    match.session.destroy();
  }
}

const matchesPerDifficulty = readPositiveInteger('matches', 300);
const distribution = verifyDifficultyDistribution();
const startedAt = performance.now();
const results = [];

for (const difficultyId of BOT_DIFFICULTY_IDS) {
  const stats = createStats(difficultyId);
  const progressInterval = Math.max(1, Math.floor(matchesPerDifficulty / 10));
  for (let index = 0; index < matchesPerDifficulty; index += 1) {
    const seed = (index * 2_654_435_761 + 0x6d2b79f5) >>> 0;
    const result = runBenchmarkMatch(seed, difficultyId, index < 3);
    stats.matches += 1;
    stats.ticks += result.ticks;
    stats.actions += result.actions;
    stats.equipmentActions += result.equipmentActions;
    stats.equipmentPickups += result.equipmentPickups;
    stats.hits += result.hits;
    stats.eliminations += result.eliminations;
    stats.botDeaths += result.botDeaths;
    stats.botUncreditedDeaths += result.botUncreditedDeaths;
    stats.playerDeaths += result.playerDeaths;
    for (const [key, value] of Object.entries(result.movementInputs)) {
      stats.movementInputs[key] += value;
    }
    for (const [actionId, count] of result.movementActions) {
      stats.movementActions.set(
        actionId,
        (stats.movementActions.get(actionId) ?? 0) + count,
      );
    }
    stats.downSmashLandings += result.downSmashLandings;
    for (const [eventType, count] of result.mapEvents) {
      stats.mapEvents.set(eventType, (stats.mapEvents.get(eventType) ?? 0) + count);
    }
    stats.replayChecks += result.replayChecked ? 1 : 0;
    stats.hashes.add(result.finalHash);
    if (result.result.isDraw) stats.draws += 1;
    else if (result.result.winnerId === 'player-2') stats.wins += 1;
    else stats.losses += 1;
    if ((index + 1) % progressInterval === 0 || index + 1 === matchesPerDifficulty) {
      process.stderr.write(
        `[arena:bot:stress] ${difficultyId} ${index + 1}/${matchesPerDifficulty}\n`,
      );
    }
  }
  results.push(finishStats(stats));
}

const report = {
  generatedAt: new Date().toISOString(),
  matchesPerDifficulty,
  totalMatches: matchesPerDifficulty * BOT_DIFFICULTY_IDS.length,
  durationMs: performance.now() - startedAt,
  distribution,
  difficulties: results,
};
console.log(JSON.stringify(report, null, 2));

for (let index = 1; index < results.length; index += 1) {
  if (results[index].capabilityIndex + 1e-12 < results[index - 1].capabilityIndex) {
    throw new Error(
      `难度能力指数未保持顺序：${results[index - 1].difficultyId} `
      + `${results[index - 1].capabilityIndex} > ${results[index].difficultyId} `
      + `${results[index].capabilityIndex}`,
    );
  }
  if (results[index].lifePressure + 1e-12 < results[index - 1].lifePressure) {
    throw new Error(
      `难度净生命压力未保持顺序：${results[index - 1].difficultyId} `
      + `${results[index - 1].lifePressure} > ${results[index].difficultyId} `
      + `${results[index].lifePressure}`,
    );
  }
  // S6.3 validates relative ability, not release win-rate balance. Permit
  // one worst-case binomial standard error so small deterministic samples do
  // not force tuning to a single benchmark's third-life discontinuities. The
  // allowance shrinks with sample size; Stage 9 will freeze confidence bands.
  const scoreRateTolerance = 0.5 / Math.sqrt(matchesPerDifficulty);
  if (results[index].scoreRate + scoreRateTolerance < results[index - 1].scoreRate) {
    throw new Error(
      `难度得分率回退超过统计容差：${results[index - 1].difficultyId} `
      + `${results[index - 1].scoreRate} > ${results[index].difficultyId} `
      + `${results[index].scoreRate}（容差 ${scoreRateTolerance}）`,
    );
  }
}

const REQUIRED_MOVEMENT_ACTIONS = Object.freeze([
  'movement.explicit-ground-jump',
  'movement.explicit-air-jump',
  'movement.explicit-crouch-begin',
  'movement.explicit-crouch-release',
  'movement.down-smash',
]);
for (const result of results) {
  for (const actionId of REQUIRED_MOVEMENT_ACTIONS) {
    if ((result.movementActions[actionId] ?? 0) < 1) {
      throw new Error(`${result.difficultyId} 未覆盖 Bot movement action ${actionId}。`);
    }
  }
  if (
    result.downSmashLandings < 1
    || result.movementInputs.walkTicks < 1
    || result.movementInputs.runTicks < 1
    || (result.mapEvents.MapEventWarned ?? 0) < 1
    || (result.mapEvents.MapEventStarted ?? 0) < 1
  ) throw new Error(`${result.difficultyId} Bot movement 成功/走跑覆盖不足。`);
  if (result.averageBotUncreditedDeaths > 0.5) {
    throw new Error(
      `${result.difficultyId} 平均地图无归属死亡 ${result.averageBotUncreditedDeaths} 过高。`,
    );
  }
}
